// /api/content-keywords.js
// 스튜디오 "키워드" 메뉴의 데이터 창구 (D-060 · 6메뉴).
//
// 무엇을 하나:
//   "다음에 뭘 만들지"를 예약 데이터로 뽑아준다.
//   - 도시 추천: 확정예약 많은데 아직 우리 영상이 없는 도시 (도시 TOP3 영상 후보)
//   - 호텔 추천: 확정예약 많은데 아직 어느 영상 TOP1/2/3 에도 안 든 호텔
//   대조 기준 = publications.hid_top1/2/3 (이미 노출한 호텔) vs bookings_agoda(실예약).
//
// 원칙: 스튜디오는 수수료·거래액 안 봄 → 추천 지표는 "확정예약 건수"(commission_usd 안 씀).
//
// 부르는 법:
//   GET /api/content-keywords
//     신분증: 쿠키 sb-access-token 또는 x-ops-token / 권한: is_editor 이상
//     나오는 것: { ok, is_admin, cities[], hotels[] }

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
    } catch { /* 못 물어보면 안 보여준다 */ }
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'GET 만 지원합니다.' });
  }

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  try {
    const [cityRes, hotelRes] = await Promise.all([
      sb.from('v_content_keyword_cities')
        .select('country, city, bookings_done, hotels_count, covered_hotels')
        .gt('bookings_done', 0)
        .order('bookings_done', { ascending: false })
        .limit(50),
      sb.from('v_content_keyword_hotels')
        .select('hid, hotel_name, city, country, star, bookings_done, bookings_cancelled')
        .eq('covered', false)
        .gt('bookings_done', 0)
        .order('bookings_done', { ascending: false })
        .limit(30),
    ]);
    for (const r of [cityRes, hotelRes]) if (r.error) throw r.error;

    // 도시: "영상 없음(covered_hotels=0)"을 먼저, 그다음 확정예약 많은 순.
    const cities = (cityRes.data || [])
      .sort((a, b) =>
        ((a.covered_hotels === 0 ? 0 : 1) - (b.covered_hotels === 0 ? 0 : 1)) ||
        (b.bookings_done - a.bookings_done))
      .slice(0, 25);

    const hotels = hotelRes.data || [];

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({ ok: true, is_admin: !!who.isAdmin, cities, hotels });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '키워드 추천을 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
