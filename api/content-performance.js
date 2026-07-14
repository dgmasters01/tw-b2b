// /api/content-performance.js
// 스튜디오 "성과표" 메뉴의 데이터 창구 (D-063 · 2026-07-13 최종 UX).
//
// 무엇을 하나:
//   전 채널·영상·호텔 성과를 한 화면에 종합해서, "기간"을 받아 그 기간 기준으로 집계해 내려준다.
//   - 요약(KPI): 예약 · 확정 · 취소 · 확정률 · 취소율 · 예약금액 (+ 수수료 = owner만)
//   - 채널별: 위 지표를 채널마다 (예약 건수 내림차순 + 순위)
//   - 추세: 기간에 맞춰 일별(≤31일) 또는 월별 예약·예약금액
//   - 비교: 이전 같은 길이 기간의 요약 (프리셋일 때)
//   - 영상별: 제목·채널·발행상태·노출 호텔(TOP1/2/3) — 예약 귀속은 추적링크 연동 후
//
// 원칙(D-063 최종 UX · 2026-07-13):
//   · 예약금액(booking_amount_usd = 호텔이 받은 돈 = 호텔 매출)은 에디터 포함 전원 공개 = 우리 돈 아님, 실적 증명.
//   · 수수료(commission_usd = 우리 커미션)만 대표님(owner)만. is_admin 아닐 때 응답에서 아예 뺀다(서버 게이트).
//   · 예약금액·수수료 합계는 취소 제외(취소 예약은 실적 아님).
//   · 확정률 = 실투숙 기준 done/(done+cancelled), 취소율 = cancelled/total (D-062 ⑤ A).
//   · 조회수·클릭은 발행/추적 연동 후 → 화면에서 "—".
//
// 부르는 법:
//   GET /api/content-performance?period=all|today|yesterday|last7|last30|month|last90|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&compare=1
//     신분증: 쿠키 sb-access-token (studio.html 세션) 또는 x-ops-token / 권한: is_editor 이상
//     나오는 것: { ok, is_admin, period, summary, compare?, channels[], trend[], videos[] }

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

const DAY = 86400000;

// 기간 프리셋 → [from, to) ISO (UTC 기준 날짜 경계). all/미지정이면 둘 다 null(전체).
function periodRange(period, fromQ, toQ) {
  const now = new Date();
  const today0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let from = null, to = null;
  switch (period) {
    case 'today':     from = today0; break;
    case 'yesterday': from = new Date(+today0 - DAY); to = today0; break;
    case 'last7':     from = new Date(+today0 - 6 * DAY); break;
    case 'last30':    from = new Date(+today0 - 29 * DAY); break;
    case 'month':     from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); break;
    case 'last90':    from = new Date(+today0 - 89 * DAY); break;
    case 'custom':
      from = fromQ ? new Date(fromQ + 'T00:00:00Z') : null;
      to   = toQ ? new Date(+new Date(toQ + 'T00:00:00Z') + DAY) : null; // to일 끝까지 포함
      break;
    case 'all':
    default: break;
  }
  return { from: from ? from.toISOString() : null, to: to ? to.toISOString() : null };
}

// 같은 길이의 직전 기간 (비교용). from 없으면 비교 불가(null).
function previousRange(fromISO, toISO) {
  if (!fromISO) return null;
  const from = new Date(fromISO);
  const to = toISO ? new Date(toISO) : new Date();
  const len = +to - +from;
  if (len <= 0) return null;
  return { from: new Date(+from - len).toISOString(), to: from.toISOString() };
}

// bookings_agoda 필요 컬럼만 기간 필터로 끌어오기 (range 페이징).
async function fetchBookings(sb, fromISO, toISO) {
  const cols = 'channel_code,booking_amount_usd,commission_usd,is_cancelled,is_completed,booked_at,hotel_id';
  const size = 1000;
  let all = [], page = 0;
  while (page < 25) {
    let q = sb.from('bookings_agoda').select(cols).range(page * size, (page + 1) * size - 1);
    if (fromISO) q = q.gte('booked_at', fromISO);
    if (toISO) q = q.lt('booked_at', toISO);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < size) break;
    page++;
  }
  return all;
}

function rate(a, b) { const t = a + b; return t ? Math.round((a / t) * 1000) / 10 : null; } // %

// 예약 배열 → 전체 요약 (수수료는 withComm일 때만).
function summarize(rows, withComm) {
  let total = 0, done = 0, canc = 0, amount = 0, comm = 0;
  for (const r of rows) {
    total++;
    if (r.is_completed) done++;
    if (r.is_cancelled) { canc++; continue; } // 취소는 금액서 제외
    amount += Number(r.booking_amount_usd) || 0;
    comm += Number(r.commission_usd) || 0;
  }
  const s = {
    bookings: total,
    completed: done,
    cancelled: canc,
    confirm_rate: rate(done, canc),   // 확정률 = done/(done+canc)
    cancel_rate: total ? Math.round((canc / total) * 1000) / 10 : null, // 취소율 = canc/total
    amount_usd: Math.round(amount),   // 예약금액 (취소 제외) — 전원 공개
  };
  if (withComm) s.commission_usd = Math.round(comm);
  return s;
}

// 예약 배열 → 채널별 집계 (예약 건수 내림차순 + 순위).
function byChannel(rows, nameMap, withComm) {
  const m = {};
  for (const r of rows) {
    const code = r.channel_code || '—';
    const c = m[code] || (m[code] = { code, total: 0, done: 0, canc: 0, amount: 0, comm: 0 });
    c.total++;
    if (r.is_completed) c.done++;
    if (r.is_cancelled) { c.canc++; continue; }
    c.amount += Number(r.booking_amount_usd) || 0;
    c.comm += Number(r.commission_usd) || 0;
  }
  const arr = Object.values(m).map(c => {
    const o = {
      code: c.code,
      name: nameMap[c.code] || c.code,
      bookings: c.total,
      completed: c.done,
      cancelled: c.canc,
      confirm_rate: rate(c.done, c.canc),
      cancel_rate: c.total ? Math.round((c.canc / c.total) * 1000) / 10 : null,
      amount_usd: Math.round(c.amount),
    };
    if (withComm) o.commission_usd = Math.round(c.comm);
    return o;
  });
  arr.sort((a, b) => (b.bookings - a.bookings) || (b.amount_usd - a.amount_usd));
  arr.forEach((c, i) => { c.rank = i + 1; });
  return arr;
}

// 나라 영문 → 한글 (성과표·호텔별 표시용)
const COUNTRY_KO = {
  'Australia': '호주', 'Austria': '오스트리아', 'Belgium': '벨기에', 'Cambodia': '캄보디아', 'Canada': '캐나다',
  'China': '중국', 'Comoros': '코모로', 'Croatia': '크로아티아', 'Czech Republic': '체코', 'France': '프랑스',
  'Germany': '독일', 'Guam': '괌', 'Hong Kong SAR, China': '홍콩', 'Hungary': '헝가리', 'Indonesia': '인도네시아',
  'Italy': '이탈리아', 'Japan': '일본', 'Laos': '라오스', 'Macau SAR, China': '마카오', 'Malaysia': '말레이시아',
  'Maldives': '몰디브', 'Mongolia': '몽골', 'Myanmar': '미얀마', 'Netherlands': '네덜란드', 'New Zealand': '뉴질랜드',
  'Northern Mariana Islands': '북마리아나제도', 'Philippines': '필리핀', 'Portugal': '포르투갈', 'Singapore': '싱가포르',
  'South Korea': '한국', 'Spain': '스페인', 'Sri Lanka': '스리랑카', 'Switzerland': '스위스', 'Taiwan': '대만',
  'Thailand': '태국', 'Türkiye': '튀르키예', 'United Kingdom': '영국', 'Vietnam': '베트남',
};

// 예약 배열 → 호텔별 집계 (예약 건수 내림차순). 이름·유형·성급은 hotels 마스터에서.
// 소개한 호텔(영상 원고 노출)은 한글명 우선 + '소개함' 표시.
function byHotel(rows, hotelMeta, exposedHids, hidKoName, withComm) {
  const TYPE = { hotel: '호텔', resort: '리조트', apartment: '아파트', villa: '빌라', hostel: '호스텔', ryokan: '료칸', guesthouse: '게스트하우스', other: '기타' };
  const m = {};
  for (const r of rows) {
    const hid = r.hotel_id;
    if (!hid) continue;
    const h = m[hid] || (m[hid] = { hotel_id: hid, total: 0, done: 0, canc: 0, amount: 0, comm: 0 });
    h.total++;
    if (r.is_completed) h.done++;
    if (r.is_cancelled) { h.canc++; continue; }
    h.amount += Number(r.booking_amount_usd) || 0;
    h.comm += Number(r.commission_usd) || 0;
  }
  const arr = Object.values(m).map((h) => {
    const meta = hotelMeta[h.hotel_id] || {};
    const ids = meta.agoda_ids || [];
    let exposed = false, koName = null;
    for (const aid of ids) {
      const k = String(aid);
      if (exposedHids.has(k)) { exposed = true; if (!koName && hidKoName[k]) koName = hidKoName[k]; }
    }
    const o = {
      hotel_id: h.hotel_id,
      name: koName || meta.name || '(이름 없음)',            // 한글명(원고) 우선, 없으면 영문
      name_en: (koName && meta.name && koName !== meta.name) ? meta.name : null,
      type: meta.type ? (TYPE[meta.type] || meta.type) : null,
      star: meta.star || null,
      country: meta.country ? (COUNTRY_KO[meta.country] || meta.country) : null,
      city: meta.city || null,
      exposed: exposed,
      bookings: h.total,
      completed: h.done,
      cancelled: h.canc,
      confirm_rate: rate(h.done, h.canc),
      cancel_rate: h.total ? Math.round((h.canc / h.total) * 1000) / 10 : null,
      amount_usd: Math.round(h.amount),
    };
    if (withComm) o.commission_usd = Math.round(h.comm);
    return o;
  });
  arr.sort((a, b) => (b.bookings - a.bookings) || (b.amount_usd - a.amount_usd));
  arr.forEach((h, i) => { h.rank = i + 1; });
  return arr;
}

// 예약 배열 → 추세 (기간 길이 ≤ 31일이면 일별, 아니면 월별). 예약금액은 취소 제외.
function trend(rows, fromISO, toISO) {
  const from = fromISO ? new Date(fromISO) : null;
  const to = toISO ? new Date(toISO) : new Date();
  const days = from ? (+to - +from) / DAY : 999;
  const daily = days <= 31;
  const bucket = {};
  for (const r of rows) {
    if (!r.booked_at) continue;
    const d = new Date(r.booked_at);
    if (isNaN(d)) continue;
    const key = daily
      ? d.toISOString().slice(0, 10)
      : d.toISOString().slice(0, 7);
    const b = bucket[key] || (bucket[key] = { key, bookings: 0, amount: 0 });
    b.bookings++;
    if (!r.is_cancelled) b.amount += Number(r.booking_amount_usd) || 0;
  }
  return Object.values(bucket)
    .map(b => ({ key: b.key, bookings: b.bookings, amount_usd: Math.round(b.amount) }))
    .sort((a, b) => a.key < b.key ? -1 : 1);
}

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'GET 만 지원합니다.' });
  }

  const withComm = !!who.isAdmin;
  const period = String((req.query && req.query.period) || 'all');
  const fromQ = req.query && req.query.from ? String(req.query.from) : null;
  const toQ = req.query && req.query.to ? String(req.query.to) : null;
  const wantCompare = String((req.query && req.query.compare) || '') === '1';

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  try {
    const { from, to } = periodRange(period, fromQ, toQ);

    // 채널 이름 매핑 + 영상(원고) + 노출호텔 + 기간 예약 + 데이터 기준일 병렬
    const [chRes, pubRes, expRes, bookings, asofBk, asofUp] = await Promise.all([
      sb.from('v_channel_stats').select('channel_code, channel_name, is_active'),
      sb.from('publications')
        .select('id, channel_code, status, published_at, title, youtube_video_id')
        .order('published_at', { ascending: false, nullsFirst: false }),
      sb.from('v_content_hotel_exposure').select('publication_id, rank, name_in_script, hid'),
      fetchBookings(sb, from, to),
      // 예약 데이터 기준일: 마지막 예약일(=데이터가 커버하는 끝) + 마지막 업로드일
      sb.from('bookings_agoda').select('booked_at').not('booked_at', 'is', null).order('booked_at', { ascending: false }).limit(1),
      sb.from('bookings_agoda').select('created_at').order('created_at', { ascending: false }).limit(1),
    ]);
    for (const r of [chRes, pubRes, expRes]) if (r.error) throw r.error;

    const dataAsof = {
      last_booking: (asofBk && asofBk.data && asofBk.data[0] && asofBk.data[0].booked_at) ? String(asofBk.data[0].booked_at).slice(0, 10) : null,
      last_upload: (asofUp && asofUp.data && asofUp.data[0] && asofUp.data[0].created_at) ? String(asofUp.data[0].created_at).slice(0, 10) : null,
    };

    const nameMap = {};
    for (const c of (chRes.data || [])) nameMap[c.channel_code] = c.channel_name;

    const summary = summarize(bookings, withComm);
    const channels = byChannel(bookings, nameMap, withComm);
    const tr = trend(bookings, from, to);

    // 호텔별: 기간 예약을 hotel_id(우리 마스터)로 묶고 이름·유형·성급·나라 조인
    const hotelIds = [...new Set((bookings || []).map(r => r.hotel_id).filter(Boolean))];
    const hotelMeta = {};
    for (let i = 0; i < hotelIds.length; i += 500) {
      const chunk = hotelIds.slice(i, i + 500);
      const { data: hm } = await sb.from('hotels').select('id,hotel_name,property_type,star_rating,country,city,agoda_hotel_ids').in('id', chunk);
      (hm || []).forEach((r) => { hotelMeta[r.id] = { name: r.hotel_name, type: r.property_type, star: r.star_rating, country: r.country, city: r.city, agoda_ids: Array.isArray(r.agoda_hotel_ids) ? r.agoda_hotel_ids : [] }; });
    }
    // 소개함 판정 + 한글명: 노출(v_content_hotel_exposure)의 hid·원고 이름 재활용
    const exposedHids = new Set();
    const hidKoName = {};
    for (const e of (expRes.data || [])) {
      const k = String(e.hid);
      exposedHids.add(k);
      if (e.name_in_script && !hidKoName[k]) hidKoName[k] = e.name_in_script;
    }
    const hotels = byHotel(bookings, hotelMeta, exposedHids, hidKoName, withComm);

    // 비교 (프리셋·custom 등 from 있을 때만)
    let compare = null;
    if (wantCompare) {
      const prev = previousRange(from, to);
      if (prev) {
        const prevRows = await fetchBookings(sb, prev.from, prev.to);
        compare = summarize(prevRows, withComm);
      }
    }

    // 영상별 (연동 후 예약 귀속 · 지금은 노출 호텔만)
    const expByPub = {};
    for (const e of (expRes.data || [])) {
      (expByPub[e.publication_id] = expByPub[e.publication_id] || []).push({ rank: e.rank, name: e.name_in_script, hid: e.hid });
    }
    const videos = (pubRes.data || []).map(p => ({
      id: p.id, title: p.title, channel_code: p.channel_code, status: p.status,
      published_at: p.published_at, published: !!p.youtube_video_id,
      hotels: (expByPub[p.id] || []).sort((a, b) => (a.rank || 9) - (b.rank || 9)),
    }));

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({
      ok: true,
      is_admin: withComm,
      period: { key: period, from, to },
      data_asof: dataAsof,
      summary,
      compare,
      channels,
      hotels,
      hotel_count: hotels.length,
      trend: tr,
      videos,
      video_count: videos.length,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '성과표를 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
