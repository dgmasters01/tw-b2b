// /api/content-performance.js
// 스튜디오 "성과표" 메뉴의 데이터 창구 (D-060 · 6메뉴).
//
// 무엇을 하나:
//   전 채널·영상·호텔 성과를 한 화면에 종합해서 내려준다.
//   - 요약: 채널 수 / 영상(원고) 수 / 노출 호텔 수 / 확정예약 합계
//   - 채널별: 영상 수 · 확정/취소/100달러+ 예약 (수수료·거래액 없음)
//   - 영상별: 제목·채널·발행상태·노출 호텔(TOP1/2/3)
//
// 원칙(중요): 스튜디오는 수수료·거래액을 절대 보지 않는다.
//   → v_channel_stats 의 gross_amount_usd / gross_commission_usd 는 여기서 읽지 않는다.
//   조회수·클릭은 아직 발행 영상이 없어(youtube_video_id 0) 값이 없다 → 화면에서 "—".
//
// 부르는 법:
//   GET /api/content-performance
//     신분증: 쿠키 sb-access-token (studio.html 세션) 또는 x-ops-token / 권한: is_editor 이상
//     나오는 것: { ok, is_admin, summary, channels[], videos[] }

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
    // ── 병렬 조회 (모두 수수료·거래액 제외) ──────────────────────
    const [chRes, pubRes, expRes, hotRes] = await Promise.all([
      // 채널별 예약 결과 — 수수료/거래액 칼럼은 select 하지 않는다.
      sb.from('v_channel_stats')
        .select('channel_code, channel_name, is_active, total_bookings, completed_bookings, cancelled_bookings, bookings_100plus'),
      // 영상(원고) 목록
      sb.from('publications')
        .select('id, channel_code, status, published_at, title, youtube_video_id')
        .order('published_at', { ascending: false, nullsFirst: false }),
      // 영상×호텔 노출 (TOP1/2/3)
      sb.from('v_content_hotel_exposure')
        .select('publication_id, rank, name_in_script, hid'),
      // 노출 호텔 요약 (수 세기용)
      sb.from('v_content_hotel_stats')
        .select('hid, bookings_done'),
    ]);
    for (const r of [chRes, pubRes, expRes, hotRes]) if (r.error) throw r.error;

    const channelStats = chRes.data || [];
    const pubs = pubRes.data || [];
    const exposure = expRes.data || [];
    const hotels = hotRes.data || [];

    // 채널별 영상 수
    const vidCountByCh = {};
    for (const p of pubs) vidCountByCh[p.channel_code] = (vidCountByCh[p.channel_code] || 0) + 1;

    // 채널별 성과 (수수료·거래액 없음)
    const channels = channelStats
      .map(c => ({
        code: c.channel_code,
        name: c.channel_name,
        is_active: c.is_active,
        videos: vidCountByCh[c.channel_code] || 0,
        bookings_total: c.total_bookings || 0,
        bookings_done: c.completed_bookings || 0,
        bookings_cancelled: c.cancelled_bookings || 0,
        bookings_100plus: c.bookings_100plus || 0,
      }))
      .sort((a, b) => (b.bookings_done - a.bookings_done) || (b.videos - a.videos));

    // 영상별 성과 — 노출 호텔(TOP1/2/3) 묶기
    const expByPub = {};
    for (const e of exposure) {
      (expByPub[e.publication_id] = expByPub[e.publication_id] || []).push({
        rank: e.rank, name: e.name_in_script, hid: e.hid,
      });
    }
    const videos = pubs.map(p => ({
      id: p.id,
      title: p.title,
      channel_code: p.channel_code,
      status: p.status,
      published_at: p.published_at,
      published: !!p.youtube_video_id,
      hotels: (expByPub[p.id] || []).sort((a, b) => (a.rank || 9) - (b.rank || 9)),
    }));

    const summary = {
      channels: channels.filter(c => c.is_active !== false).length,
      videos: pubs.length,
      hotels: new Set(hotels.map(h => h.hid)).size,
      bookings_done: channels.reduce((n, c) => n + c.bookings_done, 0),
    };

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({ ok: true, is_admin: !!who.isAdmin, summary, channels, videos });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '성과표를 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
