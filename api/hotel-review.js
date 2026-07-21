// /api/hotel-review.js
// 스튜디오 호텔 "확인함" 창구 (BL-HOTEL-MASTER).
//
// 무엇을 하나:
//   자동 통합이 "애매하다"고 표시한 호텔(hotels.merge_status='ambiguous')만 내려준다.
//   대표님은 이 극소수만 보고 [맞음·확정] 하면 된다. 3,000개를 검수하지 않는다.
//
// 부르는 법:
//   GET  /api/hotel-review
//     신분증: 쿠키 sb-access-token (studio.html 세션) 또는 x-ops-token
//     권한  : is_editor 이상이면 조회.
//     나오는 것: { ok, is_admin, count, hotels: [...] }
//   POST /api/hotel-review   body { hotel_code, action:'confirm' }
//     권한  : admin(대표님)만. 확정은 되돌리는 결정이라 대표님만 누른다.
//     하는 일: merge_status ambiguous → confirmed (그 호텔이 확인함에서 사라짐)
//
// 왜 이렇게:
//   content-hotels.js 와 같은 원칙 — 세션을 확인하고 service_role 로 읽는다.
//   화면 말은 믿지 않고 권한은 DB(is_editor/is_admin RPC)가 판정한다.

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

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  // ── 확인함 목록 ──
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('hotels')
      .select('hotel_code,hotel_name,city,country,star_rating,booking_count,agoda_hotel_ids')
      .eq('merge_status', 'ambiguous')
      .order('booking_count', { ascending: false });
    if (error) return res.status(500).json({ ok: false, error: String(error.message || error) });
    const hotels = (data || []).map((h) => {
      const ids = Array.isArray(h.agoda_hotel_ids) ? h.agoda_hotel_ids : [];
      const nameLen = String(h.hotel_name || '').replace(/[\s\p{P}]/gu, '').length;
      const reason = nameLen <= 4 ? '이름이 짧아 다른 호텔과 헷갈릴 수 있음' : '자동 묶음이 애매함';
      return {
        hotel_code: h.hotel_code,
        hotel_name: h.hotel_name,
        city: h.city,
        country: h.country,
        star_rating: h.star_rating,
        booking_count: h.booking_count || 0,
        agoda_count: ids.length,
        reason,
      };
    });
    // ── 좌표가 같은 호텔 그룹 (자동 병합 후보 · 대표님 아이디어: GPS로 같은 곳 찾기) ──
    let coord_groups = [];
    try {
      const { data: dup } = await sb.from('v_coord_dup_hotels')
        .select('hotel_code,hotel_name,city,country,star_rating,booking_count,agoda_hotel_ids,latitude,longitude');
      const byCoord = {};
      for (const h of dup || []) {
        const key = h.latitude + ',' + h.longitude;
        (byCoord[key] = byCoord[key] || []).push(h);
      }
      coord_groups = Object.values(byCoord)
        .filter((g) => g.length > 1)
        .map((g) => {
          g.sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0));   // 예약 많은 걸 대표로
          return g.map((h) => ({
            hotel_code: h.hotel_code, hotel_name: h.hotel_name, city: h.city, country: h.country,
            star_rating: h.star_rating, booking_count: h.booking_count || 0,
            agoda_count: Array.isArray(h.agoda_hotel_ids) ? h.agoda_hotel_ids.length : 0,
            latitude: h.latitude, longitude: h.longitude,
          }));
        })
        .sort((a, b) => (b[0].booking_count || 0) - (a[0].booking_count || 0));
    } catch { /* 뷰 없으면 무시 */ }

    // 아래 애매 목록에서 «위 좌표 그룹에 이미 있는 호텔»은 뺀다 (중복으로 헷갈림 방지)
    const cgCodes = new Set();
    for (const g of coord_groups) for (const h of g) cgCodes.add(h.hotel_code);
    const hotelsOnly = hotels.filter((h) => !cgCodes.has(h.hotel_code));

    return res.status(200).json({ ok: true, is_admin: who.isAdmin, count: hotelsOnly.length, hotels: hotelsOnly, coord_groups });
  }

  // ── 확정 처리 (admin 전용) ──
  if (req.method === 'POST') {
    if (!who.isAdmin) return res.status(403).json({ ok: false, error: '확정은 대표님(admin)만 할 수 있습니다.' });
    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { /* noop */ }
    const code = String(body.hotel_code || '').trim();
    const action = String(body.action || '').trim();
    if (!code) return res.status(400).json({ ok: false, error: 'hotel_code 가 필요합니다.' });
    if (action === 'confirm') {
      const { data, error } = await sb
        .from('hotels')
        .update({ merge_status: 'confirmed' })
        .eq('hotel_code', code)
        .eq('merge_status', 'ambiguous')
        .select('hotel_code');
      if (error) return res.status(500).json({ ok: false, error: String(error.message || error) });
      if (!data || !data.length) return res.status(404).json({ ok: false, error: '확인함에서 그 호텔을 못 찾았습니다.' });
      return res.status(200).json({ ok: true, action: 'confirmed', hotel_code: code });
    }
    if (action === 'merge') {
      // 같은 호텔인데 다른 코드로 나뉜 것을 하나로 합친다.
      //   body { hotel_code: 남길 대표코드, merge_from: [흡수될 코드들] }
      const from = Array.isArray(body.merge_from) ? body.merge_from.map((x) => String(x).trim()).filter(Boolean) : [];
      if (!from.length) return res.status(400).json({ ok: false, error: 'merge_from(합칠 코드들)이 필요합니다.' });
      const codes = [code, ...from];
      const { data: hs, error: he } = await sb.from('hotels')
        .select('hotel_code,hotel_name,agoda_hotel_ids').in('hotel_code', codes);
      if (he) return res.status(500).json({ ok: false, error: String(he.message || he) });
      const survivor = (hs || []).find((h) => h.hotel_code === code);
      if (!survivor) return res.status(404).json({ ok: false, error: '대표 호텔을 못 찾았습니다.' });
      // 아고다ID 합집합
      const ids = new Set();
      for (const h of hs || []) for (const x of (h.agoda_hotel_ids || [])) ids.add(String(x));
      // 예약 재계산: 합쳐진 이름들의 실제 예약(중복 제거) = distinct unified_id
      const names = [...new Set((hs || []).map((h) => h.hotel_name).filter(Boolean))];
      let bcount = survivor.booking_count || 0;
      if (names.length) {
        const { data: bk } = await sb.from('bookings_unified').select('unified_id,hotel_name').in('hotel_name', names);
        const s = new Set((bk || []).map((b) => b.unified_id));
        if (s.size) bcount = s.size;
      }
      // 대표에 반영
      const { error: ue } = await sb.from('hotels')
        .update({ agoda_hotel_ids: [...ids], booking_count: bcount, merge_status: 'confirmed' })
        .eq('hotel_code', code);
      if (ue) return res.status(500).json({ ok: false, error: String(ue.message || ue) });
      // 흡수된 것 병합 처리 (숨김·집계 제외)
      await sb.from('hotels').update({ merge_status: 'merged', agoda_hotel_ids: [], booking_count: 0 }).in('hotel_code', from);
      return res.status(200).json({ ok: true, action: 'merged', survivor: code, absorbed: from, agoda_ids: ids.size, booking_count: bcount });
    }
    return res.status(400).json({ ok: false, error: '지원하는 action: confirm, merge' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'GET/POST 만 지원합니다.' });
}
