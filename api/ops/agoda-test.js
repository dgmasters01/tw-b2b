// /api/ops/agoda-test.js
// 아고다 Affiliate Lite API 연결 테스트 (staycurate 블로그용)
//
// 목적: AGODA_API_KEY_STAYCURATE / AGODA_SITE_ID_STAYCURATE 로 아고다에 붙는지 확인하고,
//       호텔 사진(imageURL)·평점·가격·예약링크가 실제로 오는지 눈으로 본다.
//
// 인증: x-ops-token (CLAUDE_OPS_TOKEN)
// Body(선택): { cityId?: number, hotelId?: number[], checkIn?: 'YYYY-MM-DD', checkOut?: 'YYYY-MM-DD', maxResult?: number }
//   기본: 오사카(cityId 16901), 30일 뒤 1박, 5건
//
// 주의: 키는 서버 환경변수에서만 읽고 응답에 절대 노출하지 않는다(마스킹만).

const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';

function ymd(d) { return d.toISOString().slice(0, 10); }

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1) ops 토큰 인증
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (!expected) return res.status(500).json({ error: 'CLAUDE_OPS_TOKEN not configured' });
  if ((req.headers['x-ops-token'] || '') !== expected) {
    return res.status(401).json({ error: 'Invalid or missing x-ops-token' });
  }

  // 2) 아고다 자격증명 (staycurate 전용 → 없으면 공용 이름으로 폴백)
  const apiKey = process.env.AGODA_API_KEY_STAYCURATE || process.env.AGODA_API_KEY || '';
  const siteId = process.env.AGODA_SITE_ID_STAYCURATE || process.env.AGODA_SITE_ID || '';

  const envReport = {
    AGODA_API_KEY_STAYCURATE: !!process.env.AGODA_API_KEY_STAYCURATE,
    AGODA_SITE_ID_STAYCURATE: !!process.env.AGODA_SITE_ID_STAYCURATE,
    AGODA_API_KEY: !!process.env.AGODA_API_KEY,
    AGODA_SITE_ID: !!process.env.AGODA_SITE_ID,
    api_key_masked: apiKey ? apiKey.slice(0, 4) + '…' + apiKey.slice(-4) + ` (len=${apiKey.length})` : null,
    site_id_masked: siteId ? siteId.slice(0, 3) + '…' + siteId.slice(-2) + ` (len=${siteId.length})` : null,
  };

  if (!apiKey || !siteId) {
    return res.status(400).json({
      ok: false,
      step: 'env',
      error: 'AGODA 자격증명 없음',
      hint: 'Vercel(tw-b2b) 환경변수에 AGODA_API_KEY_STAYCURATE / AGODA_SITE_ID_STAYCURATE 필요. 저장 후 재배포 필요.',
      env: envReport,
    });
  }

  // 3) 요청 파라미터
  const body = req.body || {};
  const now = new Date();
  const checkIn = body.checkIn || ymd(new Date(now.getTime() + 30 * 864e5));
  const checkOut = body.checkOut || ymd(new Date(now.getTime() + 31 * 864e5));
  const maxResult = Math.min(Math.max(body.maxResult || 5, 1), 30);

  const criteria = {
    checkInDate: checkIn,
    checkOutDate: checkOut,
    additional: {
      currency: body.currency || 'KRW',
      language: body.language || 'ko-kr',
      occupancy: { numberOfAdult: 2, numberOfChildren: 0 },
      maxResult,
      discountOnly: false,
      minimumStarRating: 0,
      minimumReviewScore: 0,
      sortBy: body.sortBy || 'Recommended',
      dailyRate: { minimum: 1, maximum: 10000000 },
    },
  };
  if (Array.isArray(body.hotelId) && body.hotelId.length) {
    criteria.hotelId = body.hotelId;
    delete criteria.additional.maxResult;
    delete criteria.additional.sortBy;
  } else {
    criteria.cityId = body.cityId || 16901; // 기본: 오사카
  }

  // 4) 호출
  const started = Date.now();
  let agodaStatus = 0, raw = '';
  try {
    const r = await fetch(AGODA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip,deflate',
        'Authorization': `${siteId}:${apiKey}`,
      },
      body: JSON.stringify({ criteria }),
    });
    agodaStatus = r.status;
    raw = await r.text();
  } catch (e) {
    return res.status(502).json({ ok: false, step: 'fetch', error: String(e), env: envReport, request: { criteria } });
  }

  let data = null;
  try { data = JSON.parse(raw); } catch { /* keep raw */ }

  if (agodaStatus !== 200 || !data) {
    return res.status(200).json({
      ok: false, step: 'agoda', agoda_status: agodaStatus,
      body_preview: raw.slice(0, 500),
      hint: agodaStatus === 401 ? 'siteId/apiKey 불일치 또는 IP 제한. 아고다 매니저에게 확인 필요.' : undefined,
      env: envReport, request: { criteria }, took_ms: Date.now() - started,
    });
  }

  if (data.error) {
    return res.status(200).json({ ok: false, step: 'agoda-error', agoda_error: data.error, env: envReport, request: { criteria } });
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const sample = results.slice(0, maxResult).map(h => ({
    hotelId: h.hotelId,
    hotelName: h.hotelName,
    starRating: h.starRating,
    reviewScore: h.reviewScore,
    reviewCount: h.reviewCount,
    dailyRate: h.dailyRate,
    crossedOutRate: h.crossedOutRate,
    discountPercentage: h.discountPercentage,
    currency: h.currency,
    includeBreakfast: h.includeBreakfast,
    freeWifi: h.freeWifi,
    imageURL: h.imageURL,
    landingURL: h.landingURL,
  }));

  return res.status(200).json({
    ok: true,
    step: 'done',
    agoda_status: agodaStatus,
    took_ms: Date.now() - started,
    count: results.length,
    has_image: sample.filter(s => !!s.imageURL).length,
    has_landing: sample.filter(s => !!s.landingURL).length,
    request: { criteria },
    sample,
    env: envReport,
  });
}
