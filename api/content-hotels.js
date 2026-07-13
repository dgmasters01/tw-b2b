// /api/content-hotels.js
// 스튜디오 "호텔" 메뉴의 데이터 창구 (D-062 · BL-CONTENT-HOTEL-VIEWS).
//
// 무엇을 하나:
//   v_content_hotel_stats(수수료·거래액 칼럼 없음)를 읽어
//   "우리가 영상에 노출한 호텔"별 노출횟수·최고순위·채널·확정/취소 예약을 내려준다.
//   publications.hid_top1/2/3 → bookings_agoda(hid) 직접 조인 뷰라 hotels 테이블 불필요.
//
// 부르는 법:
//   GET /api/content-hotels
//     신분증: 쿠키 sb-access-token (studio.html 세션) 또는 x-ops-token
//     권한  : is_editor 이상이면 조회. (조회 전용 · 편집 없음)
//     나오는 것: { ok, is_admin, hotels: [ v_content_hotel_stats 행 ] }
//
// 왜 이렇게:
//   뷰는 RLS 로 화면(anon)이 직접 못 읽는다. channels.js 와 같은 원칙 —
//   세션을 확인하고 service_role 로 읽어 내려준다. 화면 말은 믿지 않는다.
//   수수료·거래액은 뷰에 아예 없다(스튜디오는 수수료 안 봄) → 화면에 나올 수 없다.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

/** 브라우저는 쿠키(sb-access-token)를 들고 온다. channels.js·publications.js 와 같은 쿠키. */
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

/** 두 갈래: ① x-ops-token (Claude/스크립트) ② 로그인 세션(is_editor RPC). 판정은 DB 가 한다. */
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

  // ── 호텔 상세 (hid 지정 시) — D-062 ①노출이력 ④예약·방문·취소·노쇼 ⑤리드타임 + 개별예약 ──
  const hid = (req.query && req.query.hid ? String(req.query.hid) : '').trim();
  if (hid) {
    try {
      const { data: bks, error: be } = await sb
        .from('bookings_agoda')
        .select('booked_at,checkin_date,checkout_date,nights,num_adults,num_children,num_rooms,room_type,customer_country,booking_amount_usd,commission_usd,booking_status,is_completed,is_cancelled,channel_code')
        .eq('hotel_id_agoda', hid)
        .order('booked_at', { ascending: false });
      if (be) throw be;
      const rows = bks || [];
      const total = rows.length;
      const done = rows.filter((r) => r.is_completed).length;
      const cancelled = rows.filter((r) => r.is_cancelled).length;
      const noshow = 0; // 아고다 원천에 노쇼 상태 없음 (D-062)
      const amount = Math.round(rows.reduce((s, r) => s + (Number(r.booking_amount_usd) || 0), 0));
      const commission = who.isAdmin ? Math.round(rows.reduce((s, r) => s + (Number(r.commission_usd) || 0), 0)) : null;
      const confirmRate = total ? Math.round((done / total) * 100) : null;

      // 리드타임 3구간 (임박 0~7 / 근접 8~30 / 먼 31+)
      const lt = [{ n: 0, d: 0 }, { n: 0, d: 0 }, { n: 0, d: 0 }];
      rows.forEach((r) => {
        if (!r.checkin_date || !r.booked_at) return;
        const days = Math.floor((new Date(r.checkin_date) - new Date(r.booked_at)) / 86400000);
        if (days < 0) return;
        const b = days <= 7 ? 0 : (days <= 30 ? 1 : 2);
        lt[b].n++;
        if (r.is_completed) lt[b].d++;
      });
      const leadtime = lt.map((x, i) => ({
        label: ['임박(0~7일)', '근접(8~30일)', '먼(31일+)'][i],
        count: x.n, done: x.d, rate: x.n ? Math.round((x.d / x.n) * 100) : null,
      }));

      const bookings = rows.slice(0, 50).map((r) => ({
        booked_at: r.booked_at, checkin: r.checkin_date, checkout: r.checkout_date,
        nights: r.nights, adults: r.num_adults, children: r.num_children, rooms: r.num_rooms,
        room_type: r.room_type, customer_country: r.customer_country,
        amount: Math.round(Number(r.booking_amount_usd) || 0),
        commission: who.isAdmin ? Math.round(Number(r.commission_usd) || 0) : null,
        status: r.is_cancelled ? '취소' : (r.is_completed ? '방문' : '예정'),
        channel_code: r.channel_code,
      }));

      const { data: pubs } = await sb
        .from('publications')
        .select('published_at,channel_code,title,hid_top1,hid_top2,hid_top3')
        .or(`hid_top1.eq.${hid},hid_top2.eq.${hid},hid_top3.eq.${hid}`)
        .order('published_at', { ascending: false });
      const exposures = (pubs || []).map((p) => ({
        published_at: p.published_at, channel_code: p.channel_code,
        title: p.title || '(제목 없음)',
        rank: p.hid_top1 === hid ? 1 : (p.hid_top2 === hid ? 2 : 3),
      }));

      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      return res.status(200).json({
        ok: true, is_admin: !!who.isAdmin, hid,
        detail: { total, done, cancelled, noshow, amount, commission, confirmRate, leadtime, bookings, exposures },
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: '호텔 상세를 불러오지 못했습니다.', detail: String(e.message || e) });
    }
  }

  try {
    // 노출 많은 순 → 확정예약 많은 순. (수수료·거래액 칼럼은 뷰에 없음)
    const { data, error } = await sb
      .from('v_content_hotel_stats')
      .select('*')
      .order('exposure_count', { ascending: false })
      .order('bookings_done', { ascending: false });
    if (error) throw error;
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({ ok: true, is_admin: !!who.isAdmin, hotels: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '호텔 성과를 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
