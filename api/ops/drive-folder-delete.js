// api/ops/drive-folder-delete.js
// 🔴 2026-09-02 일회성 — 클로드가 잘못 만든 폴더를 «소유자인 서비스 계정»으로 지운다.
//
// 왜: 서비스 계정이 만든 폴더는 «서비스 계정이 소유자» 다.
//     소유자가 로봇이면 대표님 5TB 를 못 쓰고(서비스 계정 0GB), 대표님이 권한도 못 준다.
//     → 폴더는 «대표님이» 만들어 로봇에게 편집자를 주는 게 맞다. 이 폴더는 지운다.
import { getDriveToken, trashFile } from '../_lib/drive.js';
export const config = { maxDuration: 30 };
function authOk(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN || process.env.OPS_TOKEN;
  return !!ops && (req.headers['x-ops-token'] || '') === ops;
}
export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const id = (req.query || {}).id;
  if (!id) return res.status(400).json({ ok: false, error: 'id 가 필요합니다.' });
  try {
    const token = await getDriveToken(process.env.GOOGLE_DRIVE_SA_KEY || process.env.DRIVE_SA_KEY);
    await trashFile(token, id);
    return res.status(200).json({ ok: true, trashed: id, note: '휴지통으로 옮겼습니다(영구삭제 아님).' });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e && e.message || e).slice(0, 300) });
  }
}
