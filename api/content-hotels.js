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
        .select('reservation_no,booked_at,checkin_date,checkout_date,nights,num_rooms,customer_country,booking_amount_usd,commission_usd,booking_status,is_completed,is_cancelled,device_type,channel_code')
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

      // 채널별 예약 집계 (드릴다운 1단계)
      const byCh = {};
      rows.forEach((r) => {
        const c = r.channel_code || '기타';
        if (!byCh[c]) byCh[c] = { code: c, total: 0, done: 0, cancelled: 0 };
        byCh[c].total++;
        if (r.is_completed) byCh[c].done++;
        if (r.is_cancelled) byCh[c].cancelled++;
      });
      const byChannel = Object.keys(byCh).map((k) => byCh[k]).sort((a, b) => b.total - a.total);

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

      const bookings = rows.slice(0, 50).map((r) => {
        var st = r.is_cancelled
          ? ((r.booking_status || '').toLowerCase().indexOf('customer') >= 0 ? '고객취소' : '기타취소')
          : (r.is_completed ? '방문' : '예정');
        return {
          reservation_no: r.reservation_no,
          booked_at: r.booked_at, checkin: r.checkin_date, checkout: r.checkout_date,
          nights: r.nights, rooms: r.num_rooms,
          customer_country: r.customer_country,
          device: r.device_type || null,
          amount: r.is_cancelled ? null : Math.round(Number(r.booking_amount_usd) || 0),
          commission: (who.isAdmin && !r.is_cancelled) ? Math.round(Number(r.commission_usd) || 0) : null,
          status: st,
          cancelled: !!r.is_cancelled,
          channel_code: r.channel_code,
        };
      });

      const { data: pubs } = await sb
        .from('publications')
        .select('published_at,channel_code,title,hid_top1,hid_top2,hid_top3,status,youtube_url,city,star,price_band,hotel_names')
        .or(`hid_top1.eq.${hid},hid_top2.eq.${hid},hid_top3.eq.${hid}`)
        .order('published_at', { ascending: false });
      const exposures = (pubs || []).map((p) => {
        var names = Array.isArray(p.hotel_names) ? p.hotel_names : [];
        // TOP1/2/3 각각 hid + 이름(있으면) 매핑 — hotel_names 순서는 top1,top2,top3 가정
        var tops = [
          { rank: 1, hid: p.hid_top1, name: names[0] || null },
          { rank: 2, hid: p.hid_top2, name: names[1] || null },
          { rank: 3, hid: p.hid_top3, name: names[2] || null },
        ].filter((t) => t.hid);
        return {
          published_at: p.published_at, channel_code: p.channel_code,
          title: p.title || '(제목 없음)',
          rank: p.hid_top1 === hid ? 1 : (p.hid_top2 === hid ? 2 : 3),
          status: p.status || 'draft',
          youtube_url: p.youtube_url || null,
          city: p.city || null, star: p.star || null, price_band: p.price_band || null,
          tops: tops,
        };
      });

      // 유료 계약 (아고다 hid → hotels.agoda_hotel_id → hotels.id → v_manager_payments.hotel_id)
      let contract = { paid: false, payments: [] };
      try {
        const { data: hm } = await sb.from('hotels').select('id').eq('agoda_hotel_id', hid).limit(1);
        const hotelId = hm && hm[0] ? hm[0].id : null;
        if (hotelId) {
          const { data: pays } = await sb.from('v_manager_payments')
            .select('payment_order,payment_status,amount,currency,paid_at,guarantee_end_at,refunded_at,refund_amount')
            .eq('hotel_id', hotelId).order('payment_order', { ascending: true });
          const list = (pays || []).map((p) => {
            const done = ['paid', 'completed', 'succeeded', 'captured'].includes((p.payment_status || '').toLowerCase());
            const ended = !!p.refunded_at || (p.guarantee_end_at && new Date(p.guarantee_end_at) < new Date());
            return {
              order: p.payment_order, active: done && !ended, ended: ended,
              amount: Math.round(Number(p.amount) || 0), currency: p.currency || 'USD',
              paid_at: p.paid_at, guarantee_end_at: p.guarantee_end_at,
              refunded_at: p.refunded_at || null, refund_amount: p.refund_amount || null,
            };
          });
          contract = { paid: list.some((x) => x.active || x.ended), payments: list };
        }
      } catch (e) { /* 계약 없음 → 무료로 표시 */ }

      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      return res.status(200).json({
        ok: true, is_admin: !!who.isAdmin, hid,
        detail: { total, done, cancelled, noshow, amount, commission, confirmRate, leadtime, byChannel, bookings, exposures, contract },
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

    // 나라·도시·성급·유형 붙이기 (뷰엔 없음 → 호텔 마스터 우선, 없으면 예약 데이터에서 보완)
    const hids = (data || []).map((h) => String(h.hid)).filter(Boolean);
    const master = {}; const geo = {};
    if (hids.length) {
      const { data: hm } = await sb
        .from('hotels')
        .select('agoda_hotel_id,country,city,star_rating,property_type')
        .in('agoda_hotel_id', hids);
      (hm || []).forEach((r) => {
        const k = String(r.agoda_hotel_id);
        if (!master[k]) master[k] = { country: r.country || null, city: r.city || null, star: r.star_rating || null, ptype: r.property_type || null };
      });
      const { data: bg } = await sb
        .from('bookings_agoda')
        .select('hotel_id_agoda,hotel_country,hotel_city,hotel_star')
        .in('hotel_id_agoda', hids);
      (bg || []).forEach((r) => {
        const k = String(r.hotel_id_agoda);
        if (!geo[k]) geo[k] = { country: r.hotel_country || null, city: r.hotel_city || null, star: r.hotel_star || null };
      });
    }
    function hotelType(ptype, name) {
      const s = ((ptype || '') + ' ' + (name || '')).toLowerCase();
      return /resort|리조트|빌라|villa|beach|비치/.test(s) ? '리조트' : '호텔';
    }
    // 최근 소개 날짜 = 발행된 노출(publications.published_at)의 hid별 최댓값
    const lastExpo = {};
    if (hids.length) {
      const { data: pubs } = await sb
        .from('publications')
        .select('published_at,hid_top1,hid_top2,hid_top3')
        .not('published_at', 'is', null);
      (pubs || []).forEach((p) => {
        [p.hid_top1, p.hid_top2, p.hid_top3].forEach((hid) => {
          if (!hid) return; const k = String(hid);
          if (!lastExpo[k] || p.published_at > lastExpo[k]) lastExpo[k] = p.published_at;
        });
      });
    }
    const hotels = (data || []).map((h) => {
      const m = master[String(h.hid)] || {}; const g = geo[String(h.hid)] || {};
      const name = h.name_in_script || h.name_in_agoda || '';
      return {
        ...h,
        country: m.country || g.country || null,
        city: m.city || g.city || h.agoda_city || null,
        star: m.star || g.star || null,
        htype: hotelType(m.ptype, name),
        last_exposure: lastExpo[String(h.hid)] || null,
      };
    });

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({ ok: true, is_admin: !!who.isAdmin, hotels });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '호텔 성과를 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
