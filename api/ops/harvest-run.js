// /api/ops/harvest-run.js
// 아고다 전체 수집 — harvest_queue 에서 꺼내 hotelId 목록으로 조회 (HARVEST.md)
const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';
const BATCH = 100;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  if (req.headers['x-ops-token'] !== process.env.CLAUDE_OPS_TOKEN)
    return res.status(401).json({ ok: false, error: 'unauthorized' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}
  const rounds = Math.min(parseInt(body.rounds || 1, 10), 20);
  const budget = parseInt(process.env.AGODA_DAILY_BUDGET || '300', 10);

  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.AGODA_API_KEY;
  if (!apiKey || !SB || !KEY) return res.status(500).json({ ok: false, error: 'env 없음' });
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

  // 오늘 호출 수
  const today = new Date().toISOString().slice(0, 10);
  let used = 0;
  try {
    const lr = await fetch(`${SB}/rest/v1/collect_log?select=id&kind=eq.harvest&called_at=gte.${today}`,
      { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
    used = parseInt(((lr.headers.get('content-range') || '').split('/')[1] || '0'), 10);
  } catch {}
  if (used >= budget) return res.status(429).json({ ok: false, error: 'daily_budget_exceeded', used, budget });

  const base = new Date(Date.now() + 30 * 86400000);
  while (base.getUTCDay() !== 5) base.setUTCDate(base.getUTCDate() + 1);
  const inDate = base.toISOString().slice(0, 10);
  const out = new Date(base.getTime() + 2 * 86400000).toISOString().slice(0, 10);

  const summary = { rounds: 0, requested: 0, got: 0, saved: 0, no_data: 0, errors: 0 };
  const t0 = Date.now();

  for (let n = 0; n < rounds; n++) {
    if (used + n >= budget) { summary.stopped = 'budget'; break; }

    // 1) 다음 배치
    const qr = await fetch(`${SB}/rest/v1/harvest_queue?select=agoda_hotel_id,city_key&status=eq.pending&order=priority.asc,agoda_hotel_id.asc&limit=${BATCH}`, { headers: H });
    const batch = await qr.json();
    if (!Array.isArray(batch) || batch.length === 0) { summary.stopped = 'empty'; break; }
    const ids = batch.map(b => b.agoda_hotel_id);
    const cityOf = Object.fromEntries(batch.map(b => [b.agoda_hotel_id, b.city_key]));
    summary.requested += ids.length;

    // 2) 아고다 조회
    const t1 = Date.now();
    let results = [], status = 0;
    try {
      const r = await fetch(AGODA_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json',
                   'Accept': 'application/json', 'Accept-Encoding': 'gzip,deflate' },
        body: JSON.stringify({ criteria: {
          additional: { currency: 'KRW', language: 'ko-kr', discountOnly: false,
                        occupancy: { numberOfAdult: 2, numberOfChildren: 0 } },
          checkInDate: inDate, checkOutDate: out, hotelId: ids } })
      });
      status = r.status;
      if (status === 429) {
        await log(SB, H, { kind: 'harvest', http_status: 429, ms: Date.now() - t1, error: 'rate_limited' });
        summary.stopped = 'rate_limited';
        break;
      }
      const txt = await r.text();
      if (!r.ok) throw new Error(txt.slice(0, 200));
      results = (JSON.parse(txt).results) || [];
    } catch (e) {
      summary.errors++;
      await bump(SB, H, ids, String(e).slice(0, 200));
      await log(SB, H, { kind: 'harvest', http_status: status || 0, ms: Date.now() - t1, error: String(e).slice(0, 200) });
      continue;
    }
    summary.got += results.length;

    // 3) hotel_pool 저장
    if (results.length) {
      const rows = results.map(h => ({
        agoda_hotel_id: h.hotelId, city_key: cityOf[h.hotelId] || null,
        name_ko: h.hotelName || null, star: h.starRating ?? null,
        review_score: h.reviewScore ?? null, review_count: h.reviewCount ?? null,
        daily_rate: h.dailyRate ?? null, currency: h.currency || 'KRW',
        lat: h.latitude ?? null, lng: h.longitude ?? null,
        image_url: h.imageURL || null, landing_url: h.landingURL || null,
        checkin: inDate
      }));
      const sr = await fetch(`${SB}/rest/v1/hotel_pool?on_conflict=agoda_hotel_id,checkin`, {
        method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows)
      });
      if (sr.ok) summary.saved += rows.length;
    }

    // 4) 상태 갱신 — 받은 건 done
    const gotIds = new Set(results.map(h => h.hotelId));
    const doneIds = ids.filter(i => gotIds.has(i));
    const noneIds = ids.filter(i => !gotIds.has(i));
    if (doneIds.length) {
      await fetch(`${SB}/rest/v1/harvest_queue?agoda_hotel_id=in.(${doneIds.join(',')})`, {
        method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'done', done_at: new Date().toISOString(), last_try_at: new Date().toISOString() })
      });
    }
    // 5) 안 온 건 no_data (다시 묻지 않는다)
    if (noneIds.length) {
      summary.no_data += noneIds.length;
      await fetch(`${SB}/rest/v1/harvest_queue?agoda_hotel_id=in.(${noneIds.join(',')})`, {
        method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'no_data', last_try_at: new Date().toISOString() })
      });
    }

    await log(SB, H, { kind: 'harvest', http_status: 200, got_count: results.length,
                       saved_count: results.length, ms: Date.now() - t1, checkin: inDate });
    summary.rounds++;
    await new Promise(r => setTimeout(r, 300));
  }

  summary.총소요ms = Date.now() - t0;
  summary.오늘호출 = used + summary.rounds;
  summary.예산 = budget;
  return res.status(200).json({ ok: true, ...summary });
}

async function log(SB, H, row) {
  try { await fetch(`${SB}/rest/v1/collect_log`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(row) }); } catch {}
}
async function bump(SB, H, ids, err) {
  try {
    await fetch(`${SB}/rest/v1/harvest_queue?agoda_hotel_id=in.(${ids.join(',')})`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ last_try_at: new Date().toISOString(), last_error: err })
    });
  } catch {}
}
