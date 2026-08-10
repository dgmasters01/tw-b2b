// /api/ops/pool-collect.js
// 아고다 도시별 호텔 평점·가격 수집 → hotel_pool
// staycurate 추천 후보 풀 구축 (POOL.md)
const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  const token = req.headers['x-ops-token'];
  if (token !== process.env.CLAUDE_OPS_TOKEN) return res.status(401).json({ ok: false, error: 'unauthorized' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}

  const cityId = parseInt(body.cityId, 10);
  const cityKey = String(body.cityKey || '');
  const maxResult = Math.min(parseInt(body.maxResult || 500, 10), 1000);
  const minStar = parseFloat(body.minStar || 0);
  const maxStar = parseFloat(body.maxStar || 5);
  const sortBy = String(body.sortBy || 'PriceAsc');
  const dryRun = !!body.dryRun;
  if (!cityId || !cityKey) return res.status(400).json({ ok: false, error: 'cityId, cityKey 필요' });

  const apiKey = process.env.AGODA_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'AGODA_API_KEY 없음' });

  // 조회 기준일: 30일 뒤 금~일 (주말)
  const base = new Date(Date.now() + 30 * 86400000);
  while (base.getUTCDay() !== 5) base.setUTCDate(base.getUTCDate() + 1);
  const inDate = base.toISOString().slice(0, 10);
  const out = new Date(base.getTime() + 2 * 86400000).toISOString().slice(0, 10);

  const SB0 = process.env.SUPABASE_URL, KEY0 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // 하루 호출 예산 확인 (기본 200)
  const budget = parseInt(process.env.AGODA_DAILY_BUDGET || '200', 10);
  try {
    const lr = await fetch(`${SB0}/rest/v1/collect_log?select=id&called_at=gte.${new Date().toISOString().slice(0,10)}`,
      { headers: { apikey: KEY0, Authorization: `Bearer ${KEY0}`, Prefer: 'count=exact', Range: '0-0' } });
    const cr = lr.headers.get('content-range') || '';
    const used = parseInt((cr.split('/')[1] || '0'), 10);
    if (used >= budget) return res.status(429).json({ ok: false, error: 'daily_budget_exceeded', used, budget });
  } catch {}

  const t0 = Date.now();
  const payload = {
    criteria: {
      additional: {
        currency: 'KRW', language: 'ko-kr',
        maxResult, discountOnly: false,
        minimumStarRating: minStar, maximumStarRating: maxStar,
        sortBy,
        occupancy: { numberOfAdult: 2, numberOfChildren: 0 }
      },
      checkInDate: inDate, checkOutDate: out, cityId
    }
  };

  let data;
  try {
    const r = await fetch(AGODA_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json',
                 'Accept': 'application/json', 'Accept-Encoding': 'gzip,deflate' },
      body: JSON.stringify(payload)
    });
    if (r.status === 429) {
      await logCall(SB0, KEY0, { kind: 'pool', city_key: cityKey, star_band: `${minStar}-${maxStar}`,
        checkin: inDate, http_status: 429, ms: Date.now() - t0, error: 'rate_limited' });
      return res.status(429).json({ ok: false, error: 'agoda_rate_limited', retryAfter: r.headers.get('retry-after') || 600 });
    }
    if (!r.ok) {
      const txt = (await r.text()).slice(0, 400);
      await logCall(SB0, KEY0, { kind: 'pool', city_key: cityKey, star_band: `${minStar}-${maxStar}`,
        checkin: inDate, http_status: r.status, ms: Date.now() - t0, error: txt.slice(0, 200) });
      return res.status(502).json({ ok: false, error: 'agoda ' + r.status, body: txt });
    }
    data = await r.json();
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e).slice(0, 200) });
  }
  const ms = Date.now() - t0;
  const results = data.results || [];

  const stat = {
    받은수: results.length,
    평점있음: results.filter(h => h.reviewScore > 0).length,
    후기500이상: results.filter(h => h.reviewCount >= 500).length,
    자격통과: results.filter(h => h.reviewScore >= 8 && h.reviewCount >= 500).length,
    성급4: results.filter(h => h.starRating >= 4 && h.starRating < 5).length,
    요청: { minStar, maxStar, sortBy, maxResult },
    걸린시간ms: ms, 조회일: inDate
  };
  if (dryRun) return res.status(200).json({ ok: true, dryRun: true, stat, sample: results.slice(0, 3) });

  // 저장
  const rows = results.map(h => ({
    agoda_hotel_id: h.hotelId, city_key: cityKey, city_id: cityId,
    name_ko: h.hotelName || null, star: h.starRating ?? null,
    review_score: h.reviewScore ?? null, review_count: h.reviewCount ?? null,
    daily_rate: h.dailyRate ?? null, currency: h.currency || 'KRW',
    lat: h.latitude ?? null, lng: h.longitude ?? null,
    image_url: h.imageURL || null, landing_url: h.landingURL || null,
    checkin: inDate
  }));

  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let saved = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const r = await fetch(`${SB}/rest/v1/hotel_pool?on_conflict=agoda_hotel_id,checkin`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json',
                 Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(chunk)
    });
    if (!r.ok) return res.status(500).json({ ok: false, error: 'save ' + r.status, detail: (await r.text()).slice(0, 300), saved, stat });
    saved += chunk.length;
  }
  await logCall(SB0, KEY0, { kind: 'pool', city_key: cityKey, star_band: `${minStar}-${maxStar}`,
    checkin: inDate, http_status: 200, got_count: results.length, saved_count: saved, ms: Date.now() - t0 });
  return res.status(200).json({ ok: true, saved, stat, 총소요ms: Date.now() - t0 });
}

async function logCall(SB, KEY, row) {
  try {
    await fetch(`${SB}/rest/v1/collect_log`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
  } catch {}
}
