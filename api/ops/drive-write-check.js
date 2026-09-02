// api/ops/drive-write-check.js
// 🔴 2026-09-02 백업 설계 확인용 — 서비스 계정이 대표님 드라이브에 «쓸 수» 있는지 실측한다.
//
// 왜 필요한가 (대표님 «내가 해야 되는 경우는 없지?»):
//   서비스 계정은 «자기 저장 공간이 0GB» 다. 자기 이름으로 파일을 만들면 용량 없음 오류가 난다.
//   대표님이 «편집자로 공유한 폴더» 안에 만들어야 대표님 5TB 를 쓴다.
//   지금 공유된 것은 원고용 최상위 폴더 하나 — 그 «안»이면 클로드가 다 할 수 있고,
//   드라이브 «맨 바깥»이면 대표님이 폴더를 하나 만들어 공유해 주셔야 한다.
//   짐작하지 않고 «실제로 만들어 보고» 판정한다.
//
// 하는 일: 최상위 폴더 안에 시험 폴더 → 시험 파일 → 다시 읽기 → 흔적 정리(휴지통)
// 아무것도 남기지 않는다. ?keep=1 이면 폴더를 남긴다(백업 폴더로 그대로 쓰려고).

import { getDriveToken, ensureFolder, uploadText, downloadBase64, listFiles, trashFile } from '../_lib/drive.js';

export const config = { maxDuration: 60 };

function rootId() {
  const raw = process.env.DRIVE_WATCH_FOLDERS || process.env.DRIVE_FOLDERS;
  if (!raw) throw new Error('DRIVE_WATCH_FOLDERS 가 없습니다.');
  const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return o.root || o.ROOT;
}

function authOk(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN || process.env.OPS_TOKEN;
  return !!ops && (req.headers['x-ops-token'] || '') === ops;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  const keep = (req.query || {}).keep === '1';
  const steps = [];
  try {
    const token = await getDriveToken(process.env.GOOGLE_DRIVE_SA_KEY || process.env.DRIVE_SA_KEY);
    steps.push('토큰 발급 OK');

    const root = rootId();
    steps.push('최상위 폴더 ' + root);

    // 1) 백업 폴더 만들기 (있으면 그걸 쓴다)
    const folderId = await ensureFolder(token, 'TW-DB-백업', root);
    steps.push('폴더 «TW-DB-백업» = ' + folderId);

    // 2) 시험 파일 올리기
    const sample = 'agoda_hotel_id,hotel_name\n149230,쓰기시험\n';
    const up = await uploadText(token, '_쓰기시험.csv', sample, folderId, 'text/csv');
    steps.push('업로드 OK id=' + up.id + ' size=' + (up.size || '?'));

    // 3) 🔴 다시 읽어서 «같은 내용인지» 확인 — 올렸다고 믿지 않는다
    const b64 = await downloadBase64(token, up.id);
    const back = Buffer.from(b64, 'base64').toString('utf-8');
    const same = back.trim() === sample.trim();
    steps.push('되읽기 ' + (same ? 'OK (내용 일치)' : '🔴 내용 다름'));

    // 4) 폴더 안 목록
    const files = await listFiles(token, folderId);
    steps.push('폴더 안 파일 ' + files.length + '개');

    // 5) 흔적 정리
    await trashFile(token, up.id);
    steps.push('시험 파일 휴지통으로');

    return res.status(200).json({
      ok: true,
      writable: same,
      folder_id: folderId,
      folder_kept: keep,
      verdict: same
        ? '✅ 클로드가 폴더 만들기·올리기·되읽기를 전부 할 수 있습니다. 대표님이 하실 일 없습니다.'
        : '🔴 올렸는데 내용이 다릅니다. 확인이 필요합니다.',
      steps,
    });
  } catch (e) {
    const msg = String(e && e.message || e);
    const quota = /storage quota|quotaExceeded|0 GB/i.test(msg);
    return res.status(200).json({
      ok: false,
      writable: false,
      error: msg.slice(0, 300),
      verdict: quota
        ? '🔴 서비스 계정에 저장 공간이 없습니다. 대표님이 폴더를 «편집자»로 공유해 주셔야 합니다.'
        : '🔴 쓰기 실패 — 위 error 를 보고 판단합니다.',
      steps,
    });
  }
}
