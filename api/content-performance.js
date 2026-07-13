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
  const cols = 'channel_code,booking_amount_usd,commission_usd,is_cancelled,is_completed,booked_at';
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

    // 채널 이름 매핑 + 영상(원고) + 노출호텔 + 기간 예약 병렬
    const [chRes, pubRes, expRes, bookings] = await Promise.all([
      sb.from('v_channel_stats').select('channel_code, channel_name, is_active'),
      sb.from('publications')
        .select('id, channel_code, status, published_at, title, youtube_video_id')
        .order('published_at', { ascending: false, nullsFirst: false }),
      sb.from('v_content_hotel_exposure').select('publication_id, rank, name_in_script, hid'),
      fetchBookings(sb, from, to),
    ]);
    for (const r of [chRes, pubRes, expRes]) if (r.error) throw r.error;

    const nameMap = {};
    for (const c of (chRes.data || [])) nameMap[c.channel_code] = c.channel_name;

    const summary = summarize(bookings, withComm);
    const channels = byChannel(bookings, nameMap, withComm);
    const tr = trend(bookings, from, to);

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
      summary,
      compare,
      channels,
      trend: tr,
      videos,
      video_count: videos.length,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '성과표를 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
