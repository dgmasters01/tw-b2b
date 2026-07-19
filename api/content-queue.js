// /api/content-queue.js
// 스튜디오 "전략" 메뉴의 콘텐츠 기획 큐 창구 (D-066 · 6메뉴 마지막).
//
// 무엇을 하나 (D-066 확정본):
//   정한 콘텐츠를 발행까지 끌고 가며 진행을 한눈에 보는 실행 큐.
//   4상태 칸반: 기획대기(planning) → 원고작성(writing) → 발행예정(scheduled) → 발행완료(published).
//   카드 필드: 주제·고유코드(TW-XXXX)·나라·도시·성급·타겟·목표월·우선순위·기획자·원고담당·출처.
//   입구 = 데이터 기반 둘(전략 방향/키워드). "직접 추가"는 폐기(데이터 없이 손으로 X).
//   두 역할: 기획자(planner=[이걸로 만들기] 누른 사람 자동) + 원고 담당(writer=지정/맡기).
//   담당 배정 접속자별: 관리자=지정+맡기 / 에디터=맡기(자기)만.
//   삭제 = 대표님(admin) 전용.
//
// 부르는 법:
//   GET    /api/content-queue                         → { ok, is_admin, me, items[] }
//   POST   /api/content-queue  {source, subject, ...} → 큐에 새 카드(기획대기). source=strategy|keyword|manuscript
//   PATCH  /api/content-queue  {id, stage|writer|...} → 단계이동·담당·우선순위·메모
//   DELETE /api/content-queue  {id}                   → 삭제(대표님 전용)
//   신분증: 쿠키 sb-access-token 또는 x-ops-token / 권한: is_editor 이상

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 20 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const STAGES = ['planning', 'writing', 'scheduled', 'published'];
const SOURCES = ['strategy', 'keyword', 'manuscript'];

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
const intOrNull = (v) => (Number.isFinite(+v) ? Math.trunc(+v) : null);

// 고유 코드 생성 (D-066): {채널코드}-{4자리}. 채널별 연번. 어디서 원고를 쓰든 이 코드로 매칭.
async function nextCode(sb, channelCode) {
  const prefix = (channelCode || 'TW').toUpperCase();
  const { data } = await sb.from('content_queue')
    .select('code').ilike('code', prefix + '-%').order('code', { ascending: false }).limit(1);
  let seq = 0;
  if (data && data[0] && data[0].code) {
    const m = String(data[0].code).match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10);
  }
  return prefix + '-' + String(seq + 1).padStart(4, '0');
}

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
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    let team = [];
    try {
      const { data: adm } = await sb.from('admins')
        .select('email, display_name, role').eq('is_active', true).order('email');
      team = adm || [];
    } catch (e) { /* 팀원 목록이 실패해도 카드는 정상 표시 */ }
    return res.status(200).json({ ok: true, is_admin: !!auth.isAdmin, me: auth.email || null, items: data || [], team: team });
  }

  // ── 새 카드 담기 (기획대기) — 데이터 기반 입구만 (전략/키워드). 직접 추가 폐기 ──
  if (req.method === 'POST') {
    let body;
    try { body = await readBody(req); }
    catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }

    const source = SOURCES.includes(body.source) ? body.source : null;
    if (!source) return res.status(400).json({ ok: false, error: '출처(전략/키워드/원고유입)가 있어야 합니다. 직접 추가는 폐기됐습니다.' });

    const subject = clip(body.subject || body.title, 200);
    if (!subject) return res.status(400).json({ ok: false, error: '주제가 필요합니다.' });

    const channel_code = clip(body.channel_code, 40);
    const code = await nextCode(sb, channel_code);

    const row = {
      stage: 'planning',
      source,
      code,
      title: subject,                                   // 주제
      country: clip(body.country, 120),
      city: clip(body.city, 120),
      star: intOrNull(body.star),
      target: clip(body.target, 40),                    // 타겟(언어+시장)
      target_month: clip(body.target_month, 20),        // 목표 발행월 (YYYY-MM)
      priority: Number.isFinite(+body.priority) ? Math.max(1, Math.min(5, Math.trunc(+body.priority))) : 3,
      channel_code,
      hid: clip(body.hid, 60),
      hotel_name: clip(body.hotel_name, 200),
      bookings_done: Number.isFinite(+body.bookings_done) ? Math.max(0, Math.trunc(+body.bookings_done)) : 0,
      note: clip(body.note, 2000),                      // 넣을 키워드/근거 요약
      planner_email: auth.email || null,                // 기획자 = 만든 사람 자동
      created_by_email: auth.email || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from('content_queue').insert(row).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, item: data });
  }

  // ── 단계 이동 · 담당 · 우선순위 · 메모 ─────────────────────────
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
    if (body.note !== undefined) patch.note = clip(body.note, 2000);
    if (body.priority !== undefined) {
      const p = intOrNull(body.priority);
      if (p != null) patch.priority = Math.max(1, Math.min(5, p));
    }
    if (body.target_month !== undefined) patch.target_month = clip(body.target_month, 20);
    // 원고 담당(writer) 배정 — 접속자별 권한 (D-066):
    //   'me' → 내가 맡기(에디터도 가능) / '' 또는 null → 놓기
    //   특정 이메일 지정 → 관리자(대표님)만 가능
    if (body.writer !== undefined) {
      if (body.writer === 'me') patch.assignee_email = auth.email || null;
      else if (!body.writer) patch.assignee_email = null;
      else {
        if (!auth.isAdmin) return res.status(403).json({ ok: false, error: '다른 사람 담당 지정은 관리자만 할 수 있습니다.' });
        patch.assignee_email = clip(body.writer, 200);
      }
    }

    const { data, error } = await sb.from('content_queue').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data) return res.status(404).json({ ok: false, error: '카드를 찾지 못했습니다.' });
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
