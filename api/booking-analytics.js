// /api/booking-analytics.js
// 예약 분석 자료를 「세어서」 준다. booking-analytics.html 이 이걸 부른다.
//
// 왜 만들었나 (2026-08-01 전체 점검):
//   booking-analytics.html 안에 `const D={...}` 로 **990KB 가 코드에 박혀** 있었다.
//   DB 를 보지 않으니 새 예약이 들어와도 화면은 모른다. 갱신 표기도 없어서
//   보는 사람이 오늘 숫자로 믿었다 — 실측 차이 예약 3,774 vs 3,850 · 매출 $854,258 vs $877,679.
//   숫자는 「적는 것」이 아니라 「세는 것」이다(D-065 54-0V 와 같은 원칙).
//
// ── 부르는 법 ────────────────────────────────────────────────
//   GET /api/booking-analytics            → 전체 (화면이 쓰는 모양 그대로)
//   GET /api/booking-analytics?light=1    → 무거운 원본(bk·hf·mc·dl) 빼고
//
// 인증: 쿠키 세션(is_admin 이상) 또는 x-ops-token.
//       ⚠ 수수료(commission)가 들어 있다. 관리자만 본다.
//
// 캐시: 10분. 예약은 하루 단위로 들어오므로 매번 다시 셀 이유가 없다.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const CACHE = globalThis.__baCache || (globalThis.__baCache = { at: 0, data: null });
const CACHE_MS = 10 * 60 * 1000;

function accessToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const raw = req.headers['cookie'] || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === 'sb-access-token') return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

async function authOK(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN;
  if (ops && (req.headers['x-ops-token'] || '') === ops) return true;
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return false;
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: H, body: '{}' });
    return r.ok && (await r.json()) === true;
  } catch { return false; }
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** 예약 원본을 한 번만 읽고, 여기서 전부 센다. (DB 왕복을 늘리지 않는다) */
async function loadRows(sb) {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('bookings_agoda')
      .select('booking_id, channel_code, hotel_name, hotel_country, hotel_city, hotel_star, customer_country, checkin_date, checkout_date, booked_at, booking_amount_usd, commission_usd, booking_status, is_cancelled, device_type')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
    if (out.length > 60000) break;   // 안전장치
  }
  return out;
}

export default async function handler(req, res) {
  if (!(await authOK(req))) return res.status(401).json({ ok: false, error: '관리자만 볼 수 있습니다.' });

  const light = req.query.light === '1';
  if (CACHE.data && Date.now() - CACHE.at < CACHE_MS) {
    const d = light ? { ...CACHE.data, bk: [], hf: [], mc: [], dl: [] } : CACHE.data;
    return res.status(200).json({ ok: true, cached: true, as_of: new Date(CACHE.at).toISOString(), D: d });
  }

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }

  let rows;
  try { rows = await loadRows(sb); } catch (e) { return res.status(500).json({ ok: false, error: '예약을 읽지 못했습니다: ' + e.message }); }

  // 채널 이름표
  let chName = {};
  try {
    const { data } = await sb.from('channels').select('channel_code, name');
    for (const c of data || []) chName[c.channel_code] = c.name;
  } catch { /* 코드 그대로 쓴다 */ }

  // ⚠ 취소 건은 금액·국가·기기가 비어 있다(아고다 미제공) → 집계에서 뺀다(D-053 과 같은 기준).
  const live = rows.filter((r) => r.is_cancelled !== true);

  const add = (m, k, b, a, c) => {
    if (!m[k]) m[k] = { b: 0, a: 0, c: 0 };
    m[k].b += 1; m[k].a += Number(b || 0); m[k].c += Number(c || 0);
  };
  const byYear = {}, byCh = {}, byCo = {}, byCi = {}, byHotel = {}, byMonth = {},
        byDow = {}, byDom = {}, byDev = {}, byDevY = {}, byDevC = {}, byStar = {},
        byStarCo = {}, byDay = {}, byMonthCo = {};
  const hotels = new Set(), countries = new Set(), cities = new Set();

  for (const r of live) {
    const amt = Number(r.booking_amount_usd || 0), com = Number(r.commission_usd || 0);
    const ci = r.checkin_date ? String(r.checkin_date).slice(0, 10) : null;
    const bd = r.booked_at ? String(r.booked_at).slice(0, 10) : null;   /* \uc608\uc57d\uc77c = booked_at */
    const yr = ci ? Number(ci.slice(0, 4)) : null;
    const ym = ci ? ci.slice(0, 7) : null;
    const co = r.hotel_country || '기타', city = r.hotel_city || '기타';
    const dev = r.device_type || '미상';
    const star = r.hotel_star != null ? Number(r.hotel_star) : 0;

    if (r.hotel_name) hotels.add(r.hotel_name);
    if (r.hotel_country) countries.add(r.hotel_country);
    if (r.hotel_city) cities.add(r.hotel_city);

    if (yr) add(byYear, yr, amt, null, com);
    add(byCh, chName[r.channel_code] || r.channel_code || '미상', amt, null, com);
    add(byCo, co, amt, null, com);
    add(byCi, co + '\u0000' + city, amt, null, com);
    add(byHotel, [co, city, r.hotel_name || '(이름 없음)', star].join('\u0000'), amt, null, com);
    if (ym) add(byMonth, ym, amt, null, com);
    if (ym) add(byMonthCo, ym + '\u0000' + co, amt, null, com);
    if (bd) add(byDay, bd + '\u0000' + co, amt, null, com);
    if (ci) {
      const d = new Date(ci + 'T00:00:00Z');
      add(byDow, DOW[d.getUTCDay()], amt, null, com);
      add(byDom, d.getUTCDate(), amt, null, com);
    }
    add(byDev, dev, amt, null, com);
    if (yr) add(byDevY, yr + '\u0000' + dev, amt, null, com);
    add(byDevC, (chName[r.channel_code] || r.channel_code || '미상') + '\u0000' + dev, amt, null, com);
    add(byStar, star, amt, null, com);
    add(byStarCo, co + '\u0000' + star, amt, null, com);
  }

  const tot = live.reduce((s, r) => s + Number(r.booking_amount_usd || 0), 0);
  const totC = live.reduce((s, r) => s + Number(r.commission_usd || 0), 0);
  const pair = (m) => Object.entries(m);

  const D = {
    sm: {
      tb: live.length, ta: r2(tot), tc: r2(totC), te: r2(totC),
      pc: Object.keys(byMonth).length, aa: live.length ? r2(tot / live.length) : 0,
      th: hotels.size, tco: countries.size, tci: cities.size,
    },
    yl: pair(byYear).map(([y, v]) => ({ yr: Number(y), b: v.b, a: r2(v.a), cc: r2(v.c), p: 0, cf: r2(v.c) }))
      .sort((a, b) => a.yr - b.yr),
    ps: {
      booking: pair(byMonth).map(([ym, v]) => ({ ym, b: v.b, a: r2(v.a), c: r2(v.c) })).sort((a, b) => a.ym < b.ym ? -1 : 1),
    },
    ch: pair(byCh).map(([ch, v]) => ({ ch, b: v.b, a: r2(v.a), c: r2(v.c) })).sort((a, b) => b.b - a.b),
    co: pair(byCo).map(([n, v]) => ({
      n, b: v.b, a: r2(v.a), c: r2(v.c),
      h: new Set(live.filter((r) => (r.hotel_country || '기타') === n).map((r) => r.hotel_name)).size,
      ci: new Set(live.filter((r) => (r.hotel_country || '기타') === n).map((r) => r.hotel_city)).size,
    })).sort((a, b) => b.b - a.b),
    ci: pair(byCi).map(([k, v]) => {
      const [co, n] = k.split('\u0000');
      return { n, co, b: v.b, a: r2(v.a), c: r2(v.c),
        h: new Set(live.filter((r) => (r.hotel_city || '기타') === n).map((r) => r.hotel_name)).size };
    }).sort((a, b) => b.b - a.b),
    hf: pair(byHotel).map(([k, v]) => {
      const [co, ci, h, s] = k.split('\u0000');
      return { co, ci, h, b: v.b, a: r2(v.a), c: r2(v.c), s: Number(s) || 0 };
    }).sort((a, b) => b.b - a.b),
    bk: live.map((r) => ({
      i: r.booking_id, h: r.hotel_name, ci: r.hotel_city, co: r.hotel_country,
      d: r.booked_at ? String(r.booked_at).slice(0, 10) : null,
      cd: r.checkin_date ? String(r.checkin_date).slice(0, 10) : null,
      od: r.checkout_date ? String(r.checkout_date).slice(0, 10) : null,
      a: r2(r.booking_amount_usd), c: r2(r.commission_usd),
      s: r.booking_status, dv: r.device_type || '미상', st: Number(r.hotel_star || 0),
    })),
    dv: pair(byDev).map(([d, v]) => ({ d, b: v.b })).sort((a, b) => b.b - a.b),
    dvy: pair(byDevY).map(([k, v]) => { const [y, d] = k.split('\u0000'); return { y: Number(y), d, b: v.b, a: r2(v.a) }; }),
    dvc: pair(byDevC).map(([k, v]) => { const [c, d] = k.split('\u0000'); return { c, d, b: v.b }; }),
    dow: DOW.map((nm) => ({ nm, b: (byDow[nm] || {}).b || 0, a: r2((byDow[nm] || {}).a || 0) })),
    dom: Array.from({ length: 31 }, (_, i) => ({ d: i + 1, b: (byDom[i + 1] || {}).b || 0 })),
    mc: pair(byMonthCo).map(([k, v]) => { const [ym, co] = k.split('\u0000'); return { ym, co, b: v.b, a: r2(v.a) }; })
      .sort((a, b) => a.ym < b.ym ? -1 : 1),
    dl: pair(byDay).map(([k, v]) => { const [dt, tc] = k.split('\u0000'); return { dt, b: v.b, a: r2(v.a), tc, tb: v.b }; })
      .sort((a, b) => a.dt < b.dt ? -1 : 1),
    ss: pair(byStar).map(([st, v]) => ({ st: Number(st), b: v.b, a: r2(v.a), c: r2(v.c) })).sort((a, b) => a.st - b.st),
    sc: pair(byStarCo).map(([k, v]) => { const [co, s] = k.split('\u0000'); return { co, s: Number(s), b: v.b, a: r2(v.a) }; }),
  };

  CACHE.at = Date.now(); CACHE.data = D;
  const out = light ? { ...D, bk: [], hf: [], mc: [], dl: [] } : D;
  return res.status(200).json({ ok: true, cached: false, as_of: new Date().toISOString(), rows_read: rows.length, D: out });
}
