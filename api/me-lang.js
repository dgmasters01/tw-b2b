// /api/me-lang.js
// 계정 기본 언어 창구 — 「이 사람은 어느 말로 화면을 여는가」 한 가지만 다룬다.
//
// 왜 필요한가 (D-i18n · 2026-07-26 대표님 지시 5단계):
//   초대받은 해외 직원이 스튜디오를 열면 «영어»로, 한국 직원이 열면 «한국어»로 떠야 한다.
//   브라우저 말만 보면 기기를 바꿀 때마다 달라진다. 그래서 «계정»에 붙여 둔다.
//
// ── 부르는 법 ────────────────────────────────────────────────
//   GET  /api/me-lang            → { ok, lang: 'ko'|'en'|null, email }
//   POST /api/me-lang { lang }   → { ok, lang }   (본인 것만 바꾼다)
//
// 인증: studio.html 과 같은 쿠키(sb-access-token). is_editor 통과한 사람만.
//       화면이 보내는 이메일은 믿지 않는다 — 신원은 Supabase 에 다시 묻는다.
//
// 저장: admins.lang (없으면 null = 아직 안 정함 → 화면이 브라우저 말로 정한다)

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 15 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const ALLOWED = ['ko', 'en'];

/** 브라우저는 쿠키(sb-access-token)를 들고 온다. middleware.js 와 같은 쿠키다. */
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

async function whoami(req) {
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return null;
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return null;
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: H });
    if (!u.ok) return null;
    const user = await u.json();
    if (!user || !user.email) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  const me = await whoami(req);
  if (!me) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }

  if (req.method === 'GET') {
    const { data, error } = await sb.from('admins').select('lang').eq('email', me.email).maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, lang: (data && data.lang) || null, email: me.email });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await readBody(req); } catch { return res.status(400).json({ ok: false, error: '본문을 읽지 못했습니다.' }); }
    const lang = String(body.lang || '').trim();
    if (!ALLOWED.includes(lang)) return res.status(400).json({ ok: false, error: "lang 은 'ko' 또는 'en' 이어야 합니다." });

    const { error } = await sb.from('admins').update({ lang }).eq('email', me.email);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, lang });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
