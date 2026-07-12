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

export const config = { maxDuration: 60 };

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
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
async function reviewUpsert(fileId, filename, channelCode, reason) {
  const key = sbKey(); if (!key) return;
  await fetch(SB_URL + '/rest/v1/drive_review?on_conflict=file_id', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, apikey: key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ file_id: fileId, filename, channel_code: channelCode, reason, updated_at: new Date().toISOString() }),
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

// publications 로 등록 시도 → 판정. 반환 { verdict:'ok'|'review', reason }
async function register(base, filename, docxBase64) {
  const r = await fetch(base + '/api/publications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ops-token': process.env.CLAUDE_OPS_TOKEN || '' },
    body: JSON.stringify({ filename, docxBase64, source: 'drive' }),
  });
  let j = {};
  try { j = await r.json(); } catch { /* noop */ }

  if (r.status === 409 && j.duplicate) return { verdict: 'review', reason: '이미 등록된 원고' };
  if (r.status === 409) return { verdict: 'review', reason: j.error || '이미 처리됨' };
  if (!r.ok || !j.ok) return { verdict: 'review', reason: (j.error || '등록 실패').slice(0, 120) };

  // 등록은 됐지만 막는 경고(아고다 링크 없음·cid 불일치)면 확인필요로 뺀다.
  const warns = j.warnings || [];
  const blocking = warns.find((w) => /아고다 링크|hid|cid/.test(w));
  if (blocking) return { verdict: 'review', reason: blocking.slice(0, 120), id: j.id };
  return { verdict: 'ok', reason: '정상 등록', id: j.id };
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
      let verdict = 'review', reason = '', b64;
      try { b64 = await downloadBase64(token, file.id); }
      catch (e) { reason = '다운로드 실패'; }
      if (b64) {
        try { const r = await register(base, file.name, b64); verdict = r.verdict; reason = r.reason; }
        catch (e) { verdict = 'review'; reason = String(e.message || e).slice(0, 120); }
      }
      const target = verdict === 'ok' ? f.done : f.review;
      let moved = false;
      if (target) { try { await moveFile(token, file.id, target, f.wait); moved = true; } catch (e) { reason += ' / 이동실패'; } }
      if (verdict === 'ok') chReport.moved_done++; else { chReport.moved_review++; await reviewUpsert(file.id, file.name, code, reason); }
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
