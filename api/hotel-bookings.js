// /api/hotel-bookings.js
// Phase 4 Step 3: 매니저용 예약 조회 API
//
// 인증: Bearer 토큰 (Supabase Auth)
// 권한: 매니저는 본인 호텔의 completed 예약만 (RLS + view 가 강제)
//       관리자는 모든 예약 조회 가능
//
// GET 파라미터:
//   - hotelId        : 특정 호텔만 (없으면 본인 소유 전체)
//   - from, to       : 체크인 날짜 범위 (YYYY-MM-DD)
//   - limit (default 100, max 500)
//
// 응답:
//   {
//     headline: { booking_count, total_amount_usd, total_nights, total_commission_usd },
//     channel_stats: [ {channel_code, channel_name, language, booking_count, gross_amount_usd, ...} ],
//     bookings: [ {id, booking_id_masked, hotel_name, checkin, checkout, nights, ...} ],
//   }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    return res.status(500).json({ error: 'SUPABASE_ANON_KEY not configured' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

    // 사용자 토큰을 그대로 PostgREST 에 전달 → RLS 가 자동 적용
    // (즉 매니저는 본인 호텔만, completed 만 보임)
    const userHeaders = {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    };

    // 사용자 정보 (응답에 포함)
    const meResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!meResp.ok) return res.status(401).json({ error: 'Invalid session' });
    const me = await meResp.json();

    // 쿼리 파라미터
    const { hotelId, from, to, limit } = req.query || {};
    const lim = Math.min(parseInt(limit, 10) || 100, 500);

    // ---------- 1) bookings 목록 조회 (v_manager_bookings 사용) ----------
    let bookingsUrl = `${supabaseUrl}/rest/v1/v_manager_bookings?select=*&order=checkin_date.desc&limit=${lim}`;
    if (hotelId) bookingsUrl += `&hotel_id=eq.${encodeURIComponent(hotelId)}`;
    if (from)    bookingsUrl += `&checkin_date=gte.${encodeURIComponent(from)}`;
    if (to)      bookingsUrl += `&checkin_date=lte.${encodeURIComponent(to)}`;

    const bookingsResp = await fetch(bookingsUrl, { headers: userHeaders });
    if (!bookingsResp.ok) {
      const errText = await bookingsResp.text();
      return res.status(500).json({ error: 'Failed to fetch bookings', detail: errText.slice(0, 300) });
    }
    const bookings = await bookingsResp.json();

    // ---------- 2) 채널별 집계 (v_manager_channel_stats 사용) ----------
    let statsUrl = `${supabaseUrl}/rest/v1/v_manager_channel_stats?select=*`;
    if (hotelId) statsUrl += `&hotel_id=eq.${encodeURIComponent(hotelId)}`;
    const statsResp = await fetch(statsUrl, { headers: userHeaders });
    const channelStatsRaw = statsResp.ok ? await statsResp.json() : [];

    // hotelId 가 지정되지 않은 경우, 같은 channel_code 끼리 합산
    const channelStats = aggregateByChannel(channelStatsRaw);

    // ---------- 3) 헤드라인 집계 (조회된 booking 기반) ----------
    const headline = bookings.reduce(
      (acc, b) => {
        acc.booking_count += 1;
        acc.total_amount_usd += Number(b.booking_amount_usd) || 0;
        acc.total_nights += Number(b.nights) || 0;
        acc.total_commission_usd += Number(b.commission_usd) || 0;
        return acc;
      },
      { booking_count: 0, total_amount_usd: 0, total_nights: 0, total_commission_usd: 0 }
    );
    // ROI: $200 1회 결제 기준 (메모리 23)
    const SUBSCRIPTION_USD = 200;
    headline.subscription_usd = SUBSCRIPTION_USD;
    headline.roi_multiple = headline.total_amount_usd > 0
      ? +(headline.total_amount_usd / SUBSCRIPTION_USD).toFixed(2)
      : 0;

    return res.status(200).json({
      ok: true,
      user: { id: me.id, email: me.email },
      filters: { hotelId: hotelId || null, from: from || null, to: to || null, limit: lim },
      headline,
      channel_stats: channelStats,
      bookings,
    });
  } catch (err) {
    console.error('hotel-bookings error:', err);
    return res.status(500).json({ error: 'Internal error', detail: String(err.message || err) });
  }
}

function aggregateByChannel(rows) {
  const m = new Map();
  for (const r of rows) {
    const key = r.channel_code || '__unknown__';
    const cur = m.get(key) || {
      channel_code: r.channel_code,
      channel_name: r.channel_name || '기타 채널',
      channel_name_en: r.channel_name_en || null,
      channel_language: r.channel_language || null,
      booking_count: 0,
      total_nights: 0,
      gross_amount_usd: 0,
      total_commission_usd: 0,
    };
    cur.booking_count += Number(r.booking_count) || 0;
    cur.total_nights += Number(r.total_nights) || 0;
    cur.gross_amount_usd += Number(r.gross_amount_usd) || 0;
    cur.total_commission_usd += Number(r.total_commission_usd) || 0;
    m.set(key, cur);
  }
  return Array.from(m.values()).sort((a, b) => b.booking_count - a.booking_count);
}
