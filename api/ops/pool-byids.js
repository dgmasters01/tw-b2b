// /api/ops/pool-byids.js
// 아고다 Hotel List Search — hotelId 목록으로 평점 조회
// City Search(30곳 제한) 우회: 우리가 가진 agoda_hotel 의 ID를 직접 넣는다
const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  if (req.headers['x-ops-token'] !== process.env.CLAUDE_OPS_TOKEN)
    return res.status(401).json({ ok: false, error: 'unauthorized' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}
  const ids = Array.isArray(body.hotelIds) ? body.hotelIds.map(Number).filter(Boolean) : [];
  const cityKey = String(body.cityKey || 'unknown');
  const dryRun = !!body.dryRun;
  if (!ids.length) return res.status(400).json({ ok: false, error: 'hotelIds 필요' });

  const apiKey = process.env.AGODA_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'AGODA_API_KEY 없음' });

  const base = new Date(Date.now() + 30 * 86400000);
  while (base.getUTCDay() !== 5) base.setUTCDate(base.getUTCDate() + 1);
  const inDate = base.toISOString().slice(0, 10);
  const out = new Date(base.getTime() + 2 * 86400000).toISOString().slice(0, 10);

  const t0 = Date.now();
  const payload = {
    criteria: {
      additional: {
        currency: 'KRW', language: 'ko-kr',
        dailyRate: { minimum: 1, maximum: 10000000 },
        discountOnly: false, maxResult: 30,
        minimumReviewScore: 0, minimumStarRating: 0,
        occupancy: { numberOfAdult: 2, numberOfChildren: 0 }
      },
      checkInDate: inDate, checkOutDate: out,
      hotelId: ids
    }
  };

  let data, status = 0;
  try {
    const r = await fetch(AGODA_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json',
                 'Accept': 'application/json', 'Accept-Encoding': 'gzip,deflate' },
      body: JSON.stringify(payload)
    });
    status = r.status;
    const txt = await r.text();
    if (!r.ok) return res.status(502).json({ ok: false, status, body: txt.slice(0, 400) });
    data = JSON.parse(txt);
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e).slice(0, 200) });
  }
  const ms = Date.now() - t0;
  const results = data.results || [];
  const stat = { 요청ID수: ids.length, 받은수: results.length, 평점있음: results.filter(h => h.reviewScore > 0).length, ms, 조회일: inDate };
  if (dryRun) return res.status(200).json({ ok: true, stat, sample: results.slice(0, 2), raw: results.length ? undefined : JSON.stringify(data).slice(0, 300) });

  const rows = results.map(h => ({
    agoda_hotel_id: h.hotelId, city_key: cityKey,
    name_ko: h.hotelName || null, star: h.starRating ?? null,
    review_score: h.reviewScore ?? null, review_count: h.reviewCount ?? null,
    daily_rate: h.dailyRate ?? null, currency: h.currency || 'KRW',
    lat: h.latitude ?? null, lng: h.longitude ?? null,
    image_url: h.imageURL || null, landing_url: h.landingURL || null,
    checkin: inDate
  }));
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let saved = 0;
  if (rows.length) {
    const r = await fetch(`${SB}/rest/v1/hotel_pool?on_conflict=agoda_hotel_id,checkin`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json',
                 Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });
    if (!r.ok) return res.status(500).json({ ok: false, error: 'save ' + r.status, detail: (await r.text()).slice(0, 300), stat });
    saved = rows.length;
  }
  try {
    await fetch(`${SB}/rest/v1/collect_log`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ kind: 'pool_byids', city_key: cityKey, checkin: inDate,
        http_status: status, got_count: results.length, saved_count: saved, ms })
    });
  } catch {}
  return res.status(200).json({ ok: true, saved, stat });
}
