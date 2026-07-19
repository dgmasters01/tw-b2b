// api/cron/drive-watch.js
// BL-YT-DRIVE-WATCH — 드라이브 대기 폴더를 읽어 원고를 스튜디오에 등록하고, 정상=완료·문제=확인필요 로 이동.
//
// 확정 규칙 (2026-07-12 대표님):
//   정상        → 올리기 리스트에 등록(source=drive) + 파일을 [완료]로 이동
//   문제         → 파일을 [확인필요]로 이동 + 사유 기록(drive_review)
//   (문제 유형: 파싱 실패·아고다 링크 없음·cid 불일치·이미 등록/발행됨=중복)
//   대기는 처리 후 항상 비워짐. 로봇은 이동만(삭제 안 함).
//
// 실행: GitHub Actions cron 4회/일(06·11·16·21 KST). 헤더 x-cron-token=CRON_SECRET.
//       수동/검증: x-ops-token=CLAUDE_OPS_TOKEN, ?dry_run=1 이면 폴더·대기 목록만 보고 이동/등록 안 함.
//
// env: GOOGLE_DRIVE_SA_KEY(JSON) · DRIVE_WATCH_FOLDERS({"root":"..."}) · OPS_BASE_URL

import { getDriveToken, resolveFolders, listChildren, downloadBase64, moveFile } from '../_lib/drive.js';
import { docxToText } from '../_lib/docx-text.js';

export const config = { maxDuration: 60 };

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
  // Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 로 호출한다.
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

function saKey() {
  const raw = process.env.GOOGLE_DRIVE_SA_KEY || process.env.DRIVE_SA_KEY;
  if (!raw) throw new Error('GOOGLE_DRIVE_SA_KEY 가 없습니다.');
  return raw;
}
function rootId() {
  const raw = process.env.DRIVE_WATCH_FOLDERS || process.env.DRIVE_FOLDERS;
  if (!raw) throw new Error('DRIVE_WATCH_FOLDERS 가 없습니다.');
  try { const o = JSON.parse(raw); return o.root || o.ROOT; } catch { return raw; }
}

// ── Supabase (서비스롤 REST) — 확인필요 목록 기록/정리 ──
const SB_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
function sbKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY; }
async function reviewUpsert(fileId, filename, channelCode, reason, detail) {
  const key = sbKey(); if (!key) return;
  await fetch(SB_URL + '/rest/v1/drive_review?on_conflict=file_id', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, apikey: key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ file_id: fileId, filename, channel_code: channelCode, reason, detail: detail || [], updated_at: new Date().toISOString() }),
  }).catch(() => {});
}
// 확인필요 폴더에서 사라진(=고쳐서 옮긴) 건 목록에서 제거. keepIds=현재 확인필요 폴더의 file_id 배열.
async function reviewReconcile(channelCode, keepIds) {
  const key = sbKey(); if (!key) return;
  const inList = keepIds.length ? '&file_id=not.in.(' + keepIds.map((x) => '"' + x + '"').join(',') + ')' : '';
  await fetch(SB_URL + '/rest/v1/drive_review?channel_code=eq.' + encodeURIComponent(channelCode) + inList, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + key, apikey: key },
  }).catch(() => {});
}

// publications 로 등록 시도 → 판정. 반환 { verdict:'ok'|'review', reason(카테고리), id }
// docx 는 3~4MB 라 통째로 보내면 4.5MB 한도 초과 → 서버에서 글자만 뽑아 text 로 보낸다(수동과 동일).
// 확정본(§2) 확인필요 원인 카테고리: 원고 형식 / 파트너 링크 없음 / cid 불일치 / 중복.
async function register(base, filename, docxBase64) {
  let text;
  try { text = docxToText(docxBase64); }
  catch (e) { return { verdict: 'review', reason: '원고 형식 오류', detail: ['원고 파일을 열지 못했습니다. docx 파일이 맞는지, 손상되지 않았는지 확인해 주세요.'] }; }

  const r = await fetch(base + '/api/publications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ops-token': process.env.CLAUDE_OPS_TOKEN || '' },
    body: JSON.stringify({ filename, text, source: 'drive' }),
  });
  let j = {};
  try { j = await r.json(); } catch { /* noop */ }

  if (r.status === 409) return { verdict: 'review', reason: '중복', detail: ['이미 등록·발행된 원고입니다. 대기 폴더에서 이 파일을 지워 주세요.'] };
  if (!r.ok || !j.ok) {
    const err = String(j.error || '알 수 없는 오류');
    if (/파일명|형식|source_filename|channel/.test(err))
      return { verdict: 'review', reason: '파일명 형식', detail: ['파일명에서 도시·지역·성급·가격대를 읽지 못했습니다.', '파일명 예: "002 오사카 우메다 3성급 10만원미만 호텔.docx"', '자세히: ' + err] };
    return { verdict: 'review', reason: '원고 형식', detail: ['원고 본문을 규격대로 읽지 못했습니다.', '자세히: ' + err] };
  }

  // 등록됐지만 막는 문제(아고다 링크 없음·cid 불일치)면 확인필요 — 메인 리스트엔 안 남긴다.
  // warns = 원고 처리 세부(정상 원고의 "확인 N건"과 같은 내용). 확인필요로 보낼 때도 그대로 담아 세부로 보여준다.
  const warns = (j.warnings || []).map(String);
  const noLink = warns.find((w) => /아고다 링크|hid/.test(w));
  const cidBad = warns.find((w) => /cid/.test(w));
  if (noLink) return { verdict: 'review', reason: '파트너 링크 없음', detail: ['아고다 파트너 링크(hid) 3개가 원고에 없어 발행할 수 없습니다.'].concat(warns), id: j.id };
  if (cidBad) return { verdict: 'review', reason: 'cid 불일치', detail: ['원고의 cid가 폴더 채널과 맞지 않습니다.'].concat(warns), id: j.id };
  return { verdict: 'ok', reason: '정상 등록', detail: warns, id: j.id };
}

// 메인 리스트에 남으면 안 되는 문제 원고의 등록을 취소(삭제). 발행된 건 안 지움.
async function unregister(base, id) {
  if (!id) return;
  try {
    await fetch(base + '/api/publications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-ops-token': process.env.CLAUDE_OPS_TOKEN || '' },
      body: JSON.stringify({ id }),
    });
  } catch { /* 무해 */ }
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  const dryRun = req.query?.dry_run === '1' || req.query?.dry_run === 'true';
  const base = process.env.OPS_BASE_URL || 'https://gohotelwinners.com';

  let token, folders;
  try {
    token = await getDriveToken(saKey());
    folders = await resolveFolders(token, rootId());
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }

  const report = { ok: true, dry_run: dryRun, started_at: new Date().toISOString(), channels: [] };

  for (const code of Object.keys(folders)) {
    const f = folders[code];
    const chReport = { code, channel: f.channelName, wait: !!f.wait, done: !!f.done, review: !!f.review, files: [], moved_done: 0, moved_review: 0 };

    if (!f.wait) { chReport.error = '대기 폴더 없음'; report.channels.push(chReport); continue; }
    if (!f.done || !f.review) chReport.warn = '완료/확인필요 폴더 일부 없음';

    // dry_run 감사: 대기뿐 아니라 완료·확인필요 폴더도 나열(읽기 전용, 이동·삭제 없음)
    if (dryRun) {
      try { chReport.done_files = f.done ? (await listChildren(token, f.done, { onlyFiles: true })).map(function (x) { return x.name; }) : []; }
      catch (e) { chReport.done_files_err = String(e.message || e); }
      try { chReport.review_files = f.review ? (await listChildren(token, f.review, { onlyFiles: true })).map(function (x) { return x.name; }) : []; }
      catch (e) { chReport.review_files_err = String(e.message || e); }
    }

    let files = [];
    try { files = await listChildren(token, f.wait, { onlyFiles: true }); }
    catch (e) { chReport.error = String(e.message || e); report.channels.push(chReport); continue; }

    for (const file of files) {
      const isDocx = /\.docx$/i.test(file.name);
      if (!isDocx) { chReport.files.push({ name: file.name, action: dryRun ? 'skip(비docx)' : 'review', reason: 'docx 아님' }); 
        if (!dryRun && f.review) { try { await moveFile(token, file.id, f.review, f.wait); chReport.moved_review++; } catch (e) {} }
        continue; }

      if (dryRun) { chReport.files.push({ name: file.name, action: 'dry_run(등록/이동 안 함)' }); continue; }

      // 실제 처리: 다운로드 → 등록 → 판정 → 이동
      let verdict = 'review', reason = '', detail = [], b64;
      try { b64 = await downloadBase64(token, file.id); }
      catch (e) { reason = '다운로드 실패'; detail = ['드라이브에서 원고를 내려받지 못했습니다. 잠시 후 다시 시도됩니다.']; }
      if (b64) {
        try { const r = await register(base, file.name, b64); verdict = r.verdict; reason = r.reason; detail = r.detail || []; if (verdict === 'review' && r.id) await unregister(base, r.id); }
        catch (e) { verdict = 'review'; reason = '처리 오류'; detail = [String(e.message || e).slice(0, 200)]; }
      }
      const target = verdict === 'ok' ? f.done : f.review;
      let moved = false;
      if (target) { try { await moveFile(token, file.id, target, f.wait); moved = true; } catch (e) { reason += ' / 이동실패'; } }
      if (verdict === 'ok') chReport.moved_done++; else { chReport.moved_review++; await reviewUpsert(file.id, file.name, code, reason, detail); }
      chReport.files.push({ name: file.name, action: verdict, reason, moved });
    }

    // 확인필요 목록 정리: 폴더에 실제로 남아있는 것만 목록에 유지(고쳐서 뺀 건 자동 제거).
    if (!dryRun && f.review) {
      try {
        const cur = await listChildren(token, f.review, { onlyFiles: true });
        await reviewReconcile(code, cur.map((x) => x.id));
      } catch (e) { /* 정리는 실패해도 무해 */ }
    }
    report.channels.push(chReport);
  }

  report.finished_at = new Date().toISOString();
  return res.status(200).json(report);
}
