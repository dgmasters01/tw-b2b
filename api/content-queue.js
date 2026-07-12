// /api/content-queue.js
// 스튜디오 "전략" 메뉴의 콘텐츠 기획 큐 창구 (D-060 · 6메뉴 마지막).
//
// 무엇을 하나:
//   "앞으로 만들 것"을 4단계(아이디어 → 기획 → 제작중 → 완료)로 관리한다.
//   키워드 메뉴에서 추천 도시·호텔을 [이거 만들자]로 큐에 담고, 여기서 단계를 옮긴다.
//
// 원칙: 스튜디오는 수수료·거래액 안 봄 → 담는 지표는 "확정예약 건수"(bookings_done)뿐.
//
// 부르는 법:
//   GET    /api/content-queue                         → { ok, is_admin, me, items[] }
//   POST   /api/content-queue  {title, kind, ...}      → 큐에 새 항목(아이디어 단계로)
//   PATCH  /api/content-queue  {id, stage|note|...}    → 단계 이동·메모·담당 수정
//   DELETE /api/content-queue  {id}                    → 삭제(대표님 전용)
//   신분증: 쿠키 sb-access-token 또는 x-ops-token / 권한: is_editor 이상
//   삭제만 is_admin(대표님) 전용 — 설계 §5 "정리(삭제) 권한은 최종 권한자에게만".

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 20 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const STAGES = ['idea', 'plan', 'making', 'done'];
const KINDS = ['city', 'hotel', 'free'];

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
  if (expected && (req.headers['x-ops-token'] || '') === expected) {
    return { ok: true, via: 'ops-token', isAdmin: true, email: null };
  }
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return { ok: false };
    // 누가 담고 맡는지 남기려면 신원을 알아야 한다. 화면이 보내는 이름은 안 믿는다.
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: H });
    if (!u.ok) return { ok: false };
    const user = await u.json();
    let isAdmin = false;
    try {
      const a = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: H, body: '{}' });
      isAdmin = a.ok && (await a.json()) === true;
    } catch { /* 못 물어보면 안 보여준다 */ }
    return { ok: true, via: 'session', isAdmin, email: user.email || null };
  } catch {
    return { ok: false };
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

const clip = (s, n) => (s == null ? null : String(s).trim().slice(0, n) || null);

export default async function handler(req, res) {
  const auth = await authorized(req);
  if (!auth.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  let sb;
  try { sb = admin(); }
  catch (e) { return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) }); }

  // ── 목록 ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await sb.from('content_queue')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, is_admin: !!auth.isAdmin, me: auth.email || null, items: data || [] });
  }

  // ── 새 항목 담기 (아이디어 단계) ───────────────────────────────
  if (req.method === 'POST') {
    let body;
    try { body = await readBody(req); }
    catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }

    const title = clip(body.title, 200);
    if (!title) return res.status(400).json({ ok: false, error: '만들 것(제목)을 넣어주세요.' });
    const kind = KINDS.includes(body.kind) ? body.kind : 'free';

    const row = {
      stage: 'idea',
      kind,
      title,
      city: clip(body.city, 120),
      country: clip(body.country, 120),
      hid: clip(body.hid, 60),
      hotel_name: clip(body.hotel_name, 200),
      channel_code: clip(body.channel_code, 40),
      bookings_done: Number.isFinite(+body.bookings_done) ? Math.max(0, Math.trunc(+body.bookings_done)) : 0,
      note: clip(body.note, 2000),
      created_by_email: auth.email || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from('content_queue').insert(row).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, item: data });
  }

  // ── 단계 이동 · 메모 · 담당 수정 ───────────────────────────────
  if (req.method === 'PATCH') {
    let body;
    try { body = await readBody(req); }
    catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }

    const id = body.id;
    if (!id) return res.status(400).json({ ok: false, error: 'id 가 필요합니다.' });

    const patch = { updated_at: new Date().toISOString() };
    if (body.stage !== undefined) {
      if (!STAGES.includes(body.stage)) return res.status(400).json({ ok: false, error: '단계 값이 올바르지 않습니다.' });
      patch.stage = body.stage;
    }
    if (body.title !== undefined) {
      const t = clip(body.title, 200);
      if (!t) return res.status(400).json({ ok: false, error: '제목은 비울 수 없습니다.' });
      patch.title = t;
    }
    if (body.note !== undefined) patch.note = clip(body.note, 2000);
    if (body.channel_code !== undefined) patch.channel_code = clip(body.channel_code, 40);
    // 담당: 'me' 면 내 이메일로, 빈 문자열/null 이면 담당 해제.
    if (body.assignee_email !== undefined) {
      patch.assignee_email = body.assignee_email === 'me'
        ? (auth.email || null)
        : (clip(body.assignee_email, 200));
    }
    if (body.sort_order !== undefined && Number.isFinite(+body.sort_order)) {
      patch.sort_order = Math.trunc(+body.sort_order);
    }

    const { data, error } = await sb.from('content_queue').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data) return res.status(404).json({ ok: false, error: '항목을 찾지 못했습니다.' });
    return res.status(200).json({ ok: true, item: data });
  }

  // ── 삭제 (대표님 전용) ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!auth.isAdmin) return res.status(403).json({ ok: false, error: '삭제는 대표님만 할 수 있습니다.' });
    let body = {};
    try { body = await readBody(req); } catch { /* 쿼리로도 받는다 */ }
    const id = body.id || req.query?.id;
    if (!id) return res.status(400).json({ ok: false, error: 'id 가 필요합니다.' });
    const { error } = await sb.from('content_queue').delete().eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, deleted: id });
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
