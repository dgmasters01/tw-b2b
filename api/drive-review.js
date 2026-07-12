// /api/drive-review.js
// 스튜디오 올리기 "확인필요 목록"의 [지우기] 처리 (D-060 §2).
// 확인필요 폴더의 문제 원고를 드라이브 휴지통으로 보내고(30일 복구 가능) 목록에서 뺀다.
//
// POST /api/drive-review  { action:'trash', file_id }
//   신분증: 쿠키 sb-access-token(is_editor) 또는 x-ops-token / 권한: 에디터 이상

import { getDriveToken, trashFile } from './_lib/drive.js';

export const config = { maxDuration: 20 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

function accessToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const raw = req.headers['cookie'] || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === 'sb-access-token') return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
async function authorized(req) {
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (expected && (req.headers['x-ops-token'] || '') === expected) return true;
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: '{}',
    });
    return r.ok && (await r.json()) === true;
  } catch { return false; }
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (!(await authorized(req))) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'POST 만 지원합니다.' }); }

  let body;
  try { body = await readBody(req); } catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }
  if (body.action !== 'trash') return res.status(400).json({ ok: false, error: 'action=trash 만 지원합니다.' });
  const fileId = body.file_id;
  if (!fileId) return res.status(400).json({ ok: false, error: 'file_id 가 필요합니다.' });

  const saRaw = process.env.GOOGLE_DRIVE_SA_KEY || process.env.DRIVE_SA_KEY;
  if (!saRaw) return res.status(500).json({ ok: false, error: '드라이브가 연결되지 않았습니다.' });

  try {
    const token = await getDriveToken(saRaw);
    await trashFile(token, fileId);
  } catch (e) {
    return res.status(500).json({ ok: false, error: '휴지통 이동 실패: ' + String(e.message || e).slice(0, 120) });
  }

  // 목록(drive_review)에서도 제거
  try {
    const skey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const surl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
    if (skey) {
      await fetch(surl + '/rest/v1/drive_review?file_id=eq.' + encodeURIComponent(fileId), {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + skey, apikey: skey },
      });
    }
  } catch { /* 무해 */ }

  return res.status(200).json({ ok: true, trashed: fileId });
}
