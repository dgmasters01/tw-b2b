// api/ops/drive-write-check.js
// 🔴 2026-09-02 백업 저장처 확인 — 대표님이 만들어 공유한 폴더에 «실제로 쓸 수 있는지» 실측한다.
//
// 배경 (실측으로 배운 것):
//   서비스 계정은 «자기 저장 공간이 0GB» 다. 서비스 계정이 만든 폴더는 서비스 계정이 소유자가 되고,
//   그러면 파일을 넣을 때 403 "Service Accounts do not have storage quota" 가 난다.
//   🔴 폴더는 «대표님이» 만들어 서비스 계정에 «편집자» 를 줘야 대표님 5TB 를 쓴다. (2026-09-02 실측)
//
// 하는 일: 폴더에 시험 파일 올리기 → 되읽어 내용 비교 → 흔적 정리. 아무것도 남기지 않는다.
import { getDriveToken, uploadText, downloadBase64, listFiles, trashFile } from '../_lib/drive.js';

export const config = { maxDuration: 60 };

function authOk(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN || process.env.OPS_TOKEN;
  return !!ops && (req.headers['x-ops-token'] || '') === ops;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const folderId = (req.query || {}).folder || process.env.BACKUP_DRIVE_FOLDER;
  if (!folderId) return res.status(400).json({ ok: false, error: 'folder 가 필요합니다.' });

  const steps = [];
  try {
    const token = await getDriveToken(process.env.GOOGLE_DRIVE_SA_KEY || process.env.DRIVE_SA_KEY);
    steps.push('토큰 발급 OK');

    const sample = 'agoda_hotel_id,hotel_name\n149230,쓰기시험 한글\n';
    const up = await uploadText(token, '_쓰기시험.csv', sample, folderId, 'text/csv');
    steps.push('업로드 OK id=' + up.id);

    // 🔴 올렸다고 믿지 않는다 — 되읽어서 내용이 같은지 본다
    const back = Buffer.from(await downloadBase64(token, up.id), 'base64').toString('utf-8');
    const same = back.trim() === sample.trim();
    steps.push('되읽기 ' + (same ? 'OK (한글까지 일치)' : '🔴 내용 다름'));

    const files = await listFiles(token, folderId);
    steps.push('폴더 안 파일 ' + files.length + '개');

    await trashFile(token, up.id);
    steps.push('시험 파일 정리 완료');

    return res.status(200).json({
      ok: true, writable: same, folder_id: folderId,
      verdict: same
        ? '✅ 이 폴더에 쓰기·되읽기가 됩니다. 백업 저장처로 확정할 수 있습니다.'
        : '🔴 올렸는데 내용이 다릅니다.',
      steps,
    });
  } catch (e) {
    const msg = String(e && e.message || e);
    return res.status(200).json({
      ok: false, writable: false, folder_id: folderId,
      error: msg.slice(0, 300),
      verdict: /storage quota/i.test(msg)
        ? '🔴 아직 서비스 계정 소유 폴더입니다. 대표님이 만든 폴더인지 확인이 필요합니다.'
        : /404|not found|permission/i.test(msg)
          ? '🔴 폴더를 못 찾거나 권한이 없습니다. «편집자» 공유를 확인해 주세요.'
          : '🔴 쓰기 실패 — 위 error 로 판단합니다.',
      steps,
    });
  }
}
