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

  // ── ② 선정
  //   🔴 2026-08-16 추가 — hotelIds 를 직접 주면 «그 호텔만» 묻는다
  //      왜: 상위 N곳으로 묻다 보니, 날짜마다 아고다가 주는 목록이 달라
  //          이미 글에 실린 호텔이 어떤 주말에는 빠졌다 (실측: 오사카 3곳이 4개 중 0~3개만 참)
  //          글에 실린 호텔은 순위와 무관하게 «반드시» 채워야 한다
  let ids = [];
  if (Array.isArray(body.hotelIds) && body.hotelIds.length) {
    ids = body.hotelIds.map(Number).filter(Boolean).slice(0, 60);
  } else {
    const hi = star >= 5 ? 99 : star + 1;
    const q = `${SB}/rest/v1/hotel_master?select=agoda_hotel_id,hotel_name_ko,hotel_name,star_rating,review_score,review_count`
      + `&city_id=eq.${cityId}&star_rating=gte.${star}&star_rating=lt.${hi}`
      + `&review_score=gte.8&review_count=gte.400`
      + `&order=review_score.desc,review_count.desc&limit=${topN}`;
    const mr = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const picks = await mr.json();
    if (!Array.isArray(picks) || !picks.length)
      return res.status(200).json({ ok: false, why: 'no_candidates', hint: `${cityId} ${star}성 자격 통과 호텔이 없습니다` });
    ids = picks.map(p => Number(p.agoda_hotel_id));
  }
  if (!ids.length) return res.status(400).json({ ok: false, error: '물어볼 호텔이 없습니다' });

  // ── ②-b 🔴 예산 확인 (COLLECT §3 · 2026-08-16 신설)
  //    설계는 «월 1,000번 안쪽»인데 감시가 없었다. 부르기 전에 계량기를 본다
  const ym = new Date().toISOString().slice(0, 7);
  const BUDGET = 1000;
  let used = 0;
  try {
    const ur = await fetch(`${SB}/rest/v1/api_usage?provider=eq.agoda_lite&ym=eq.${ym}&select=used,free_limit`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const uj = await ur.json();
    used = Number(uj?.[0]?.used ?? 0);
  } catch { /* 계량기를 못 읽으면 아래에서 멈춘다 */ }
  const willCall = weekends.length;
  if (used + willCall > BUDGET) {
    return res.status(200).json({ ok: false, stopped: true,
      why: 'budget', used, budget: BUDGET, willCall,
      hint: `이번 달 아고다 호출이 ${used}/${BUDGET} 입니다. ${willCall}번을 더 부르면 넘칩니다. 멈췄습니다` });
  }

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
        collected_at: new Date().toISOString(),   // 🔴 08-18: 갱신 때 도장이 안 바뀌어 검사(C11)가 낡았다고 판정했다
      });
    }
  }
  // 🔴 부른 것을 남긴다 (2026-08-16 신설 — collect_log 가 2026-08-10 이후 비어 있었다)
  try {
    await fetch(`${SB}/rest/v1/collect_log`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(perDate.map((p) => ({
        kind: Array.isArray(body.hotelIds) && body.hotelIds.length ? 'pool_byids' : 'pool',
        city_key: `id|${cityId}`, star_band: String(star), checkin: p.date,
        http_status: p.error ?? 200, got_count: p.got ?? 0, saved_count: 0,
        ms: Date.now() - t0, error: p.error ? String(p.error).slice(0, 200) : null,
      }))),
    });
    await fetch(`${SB}/rest/v1/api_usage?provider=eq.agoda_lite&ym=eq.${ym}`, {
      method: 'PATCH',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ used: used + weekends.length }),
    });
  } catch { /* 기록 실패가 수집을 막지는 않는다 */ }

  const ms = Date.now() - t0;
  const stat = {
    예산: `${used + weekends.length}/${BUDGET}`,
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
