// /api/ops/pool-weekends.js
// 월간형의 주인공 = «그 달 주말 4개 가격 비교» (formats/monthly.md)
// 도시·성급·대상월을 받아 → hotel_master 에서 상위 7곳을 뽑고 → 주말 4개 날짜의 가격을 받아 hotel_pool 에 쌓는다.
//
// 🔴 선정은 hotel_master 에서만 한다 (D-B81). hotels(예약 이력) 로 대체하지 않는다.
// 🔴 가격이 안 오는 날짜는 «없음» 으로 둔다. 다른 날 가격으로 메우지 않는다.
const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  if (req.headers['x-ops-token'] !== process.env.CLAUDE_OPS_TOKEN)
    return res.status(401).json({ ok: false, error: 'unauthorized' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}
  const cityId = Number(body.cityId);
  const star = Number(body.star);                       // 3 · 4 · 5
  const year = Number(body.year), month = Number(body.month);
  const topN = Number(body.topN) || 7;
  const dryRun = !!body.dryRun;
  if (!cityId || !star || !year || !month)
    return res.status(400).json({ ok: false, error: 'cityId · star · year · month 필요' });

  const apiKey = process.env.AGODA_API_KEY;
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'AGODA_API_KEY 없음' });

  // ── ① 그 달의 «금요일» 을 모두 찾는다 (금 체크인 · 2박)
  const fridays = [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    if (dt.getUTCDay() === 5) fridays.push(dt.toISOString().slice(0, 10));
  }
  const today = new Date().toISOString().slice(0, 10);
  const weekends = fridays.filter(f => f > today);       // 지난 날짜는 조회하지 않는다

  // ── ② 선정: hotel_master 상위 N곳 (자격 = 평점 8.0↑ · 후기 400건↑ · D-B88)
  const hi = star >= 5 ? 99 : star + 1;
  const q = `${SB}/rest/v1/hotel_master?select=agoda_hotel_id,hotel_name_ko,hotel_name,star_rating,review_score,review_count`
    + `&city_id=eq.${cityId}&star_rating=gte.${star}&star_rating=lt.${hi}`
    + `&review_score=gte.8&review_count=gte.400`
    + `&order=review_score.desc,review_count.desc&limit=${topN}`;
  const mr = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  const picks = await mr.json();
  if (!Array.isArray(picks) || !picks.length)
    return res.status(200).json({ ok: false, why: 'no_candidates', hint: `${cityId} ${star}성 자격 통과 호텔이 없습니다` });
  const ids = picks.map(p => Number(p.agoda_hotel_id));

  // ── ③ 주말마다 한 번씩 아고다에 묻는다
  const t0 = Date.now();
  const rows = [], perDate = [];
  for (const inDate of weekends) {
    const out = new Date(new Date(inDate + 'T00:00:00Z').getTime() + 2 * 86400000).toISOString().slice(0, 10);
    let results = [];
    try {
      const r = await fetch(AGODA_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          criteria: {
            additional: { currency: 'KRW', language: 'ko-kr', discountOnly: false,
                          occupancy: { numberOfAdult: 2, numberOfChildren: 0 } },
            checkInDate: inDate, checkOutDate: out, hotelId: ids,
          },
        }),
      });
      if (r.ok) results = (await r.json()).results || [];
      else perDate.push({ date: inDate, got: 0, error: r.status });
    } catch (e) {
      perDate.push({ date: inDate, got: 0, error: String(e).slice(0, 80) });
      continue;
    }
    perDate.push({ date: inDate, got: results.length, missing: ids.length - results.length });
    for (const h of results) {
      rows.push({
        agoda_hotel_id: h.hotelId, city_key: `id|${cityId}`, city_id: cityId,
        name_ko: h.hotelName || null, star: h.starRating ?? null,
        review_score: h.reviewScore ?? null, review_count: h.reviewCount ?? null,
        daily_rate: h.dailyRate ?? null, currency: h.currency || 'KRW',
        lat: h.latitude ?? null, lng: h.longitude ?? null,
        image_url: h.imageURL || null, landing_url: h.landingURL || null,
        checkin: inDate,
      });
    }
  }
  const ms = Date.now() - t0;
  const stat = {
    도시: cityId, 성급: star, 대상월: `${year}-${String(month).padStart(2, '0')}`,
    주말수: weekends.length, 선정: ids.length,
    받은행: rows.length, 기대행: weekends.length * ids.length, ms, perDate,
  };
  if (dryRun) return res.status(200).json({ ok: true, stat, picks: picks.map(p => p.hotel_name_ko || p.hotel_name), sample: rows.slice(0, 2) });

  let saved = 0;
  if (rows.length) {
    const sr = await fetch(`${SB}/rest/v1/hotel_pool?on_conflict=agoda_hotel_id,checkin`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json',
                 Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!sr.ok) return res.status(502).json({ ok: false, error: (await sr.text()).slice(0, 300), stat });
    saved = rows.length;
  }
  return res.status(200).json({ ok: true, saved, stat });
}
