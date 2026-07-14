// /api/hotel-perf-detail.js
// 성과표 호텔별에서 호텔을 클릭했을 때의 세부 (BL-HOTEL-MASTER 파생).
//
// 무엇을 주나 (그 호텔 + 그 기간 한정):
//   - channels: 이 호텔 예약이 어느 채널에서 왔나. 예약 많은 상위 5개 + ratio(막대 비율).
//   - other  : 상위 5개 외 나머지를 "그 외 N개 채널" 한 줄로 합침 (채널 늘어나도 높이 고정).
//   - recent : 최근 예약 몇 건 (날짜·채널·확정/취소·금액).
//   수수료(commission)는 admin(대표님)일 때만 포함. 아니면 필드 자체를 뺀다.
//
// 왜 이렇게:
//   content-performance.js 와 같은 원칙 — 세션 확인 후 service_role 로 읽고,
//   채널명은 v_channel_stats(실시간)에서. 화면은 이걸 막대로 그린다.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

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
  if (expected && (req.headers['x-ops-token'] || '') === expected) {
    return { ok: true, via: 'ops-token', isAdmin: true };
  }
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return { ok: false };
    let isAdmin = false;
    try {
      const a = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: H, body: '{}' });
      isAdmin = a.ok && (await a.json()) === true;
    } catch { /* 못 물어보면 안 준다 */ }
    return { ok: true, via: 'session', isAdmin };
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

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
  const withComm = !!who.isAdmin;

  let sb;
  try { sb = admin(); } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  const hotelId = String((req.query && req.query.hotel_id) || '').trim();
  if (!hotelId) return res.status(400).json({ ok: false, error: 'hotel_id 가 필요합니다.' });
  const from = (req.query && req.query.from) || null;
  const to = (req.query && req.query.to) || null;

  // 이 호텔 + 기간 예약
  let q = sb.from('bookings_agoda')
    .select('channel_code,booking_amount_usd,commission_usd,is_cancelled,is_completed,booked_at')
    .eq('hotel_id', hotelId);
  if (from) q = q.gte('booked_at', from);
  if (to) q = q.lte('booked_at', to + 'T23:59:59');
  const { data: rows, error } = await q.limit(5000);
  if (error) return res.status(500).json({ ok: false, error: String(error.message || error) });

  // 채널명 (실시간)
  const { data: chs } = await sb.from('v_channel_stats').select('channel_code, channel_name');
  const nameMap = {};
  for (const c of (chs || [])) nameMap[c.channel_code] = c.channel_name;

  // 채널별 분해
  const m = {};
  for (const r of (rows || [])) {
    const code = r.channel_code || '—';
    const c = m[code] || (m[code] = { code, bookings: 0, comm: 0 });
    c.bookings++;
    if (!r.is_cancelled) c.comm += Number(r.commission_usd) || 0;
  }
  let chArr = Object.values(m).map((c) => ({ name: nameMap[c.code] || c.code, bookings: c.bookings, commission: Math.round(c.comm) }));
  chArr.sort((a, b) => (b.bookings - a.bookings) || (b.commission - a.commission));
  const maxBk = chArr.length ? Math.max(1, chArr[0].bookings) : 1;
  chArr.forEach((c) => { c.ratio = Math.round((c.bookings / maxBk) * 100); });

  const top = chArr.slice(0, 5);
  const rest = chArr.slice(5);
  let other = null;
  if (rest.length) {
    const ob = rest.reduce((s, c) => s + c.bookings, 0);
    const oc = rest.reduce((s, c) => s + c.commission, 0);
    other = { count: rest.length, bookings: ob, commission: oc, ratio: Math.round((ob / maxBk) * 100) };
  }

  // 최근 예약 (날짜 내림차순 8건)
  const recent = (rows || []).slice()
    .sort((a, b) => String(b.booked_at || '').localeCompare(String(a.booked_at || '')))
    .slice(0, 8)
    .map((r) => {
      const o = {
        date: String(r.booked_at || '').slice(0, 10),
        channel: nameMap[r.channel_code] || r.channel_code || '—',
        status: r.is_cancelled ? '취소' : (r.is_completed ? '확정' : '진행'),
        amount_usd: Math.round(Number(r.booking_amount_usd) || 0),
      };
      if (withComm) o.commission_usd = r.is_cancelled ? 0 : Math.round(Number(r.commission_usd) || 0);
      return o;
    });

  // 수수료 게이트: admin 아니면 채널·그외에서 제거
  if (!withComm) {
    top.forEach((c) => { delete c.commission; });
    if (other) delete other.commission;
  }

  return res.status(200).json({
    ok: true,
    is_admin: who.isAdmin,
    total_bookings: (rows || []).length,
    channels: top,
    other,
    recent,
  });
}
