// api/cron/hotel-district-fill.js
// ─────────────────────────────────────────────────────────────
// BL-HOTEL-DISTRICT-FROM-AGODA (D-069 후속2 · 정석 자동화)
//   지역(district)이 빈 호텔을, **아고다 주소**에서 동네/구를 뽑아 채운다. 구글 안 씀(한도 0).
//   안전: 이미 지역이 있는 호텔은 건드리지 않는다(district IS NULL 만).
// 부르는 법:
//   자동: Vercel Cron. Authorization: Bearer <CRON_SECRET>.
//   수동: x-ops-token. ?city=Fukuoka / ?limit=N / ?dry_run=1
//   city 없으면 지역 빈 호텔이 있는 도시를 자동으로 하나 골라 채운다.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { districtOf } from '../_lib/district-parse.js';

function authOK(req) {
  const h = req.headers || {};
  const cron = process.env.CRON_SECRET, ops = process.env.CLAUDE_OPS_TOKEN;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}
function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const q = req.query || {};
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 300, 1), 500);
  const dry = q.dry_run === '1' || q.dry_run === 'true';

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }

  // 1) 도시 결정 (없으면 지역 빈 호텔이 있는 도시 하나)
  let city = q.city || null;
  if (!city) {
    const { data } = await sb.from('hotels').select('city').is('district', null).not('city', 'is', null).limit(1);
    city = data && data.length ? data[0].city : null;
    if (!city) return res.status(200).json({ ok: true, idle: true, note: '지역 채울 호텔 없음 (전부 채워짐).' });
  }

  // 2) 지역 빈 호텔 (이 도시)
  const { data: hotels, error: hErr } = await sb.from('hotels')
    .select('id, agoda_hotel_ids, address').eq('city', city).is('district', null).limit(limit);
  if (hErr) return res.status(500).json({ ok: false, error: hErr.message });
  if (!hotels || !hotels.length) return res.status(200).json({ ok: true, city, filled: 0, note: '이 도시엔 지역 빈 호텔이 없습니다.' });

  // 3) 아고다 주소 배치 조회 (조인 대신 id 모아서 — 무거운 조인 502 회피)
  const idSet = new Set();
  for (const h of hotels) for (const x of (h.agoda_hotel_ids || [])) idSet.add(String(x));
  const ids = [...idSet];
  const addrById = {};
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400);
    const { data: ag } = await sb.from('agoda_inventory')
      .select('agoda_hotel_id, address').in('agoda_hotel_id', chunk).not('address', 'is', null);
    for (const a of ag || []) addrById[String(a.agoda_hotel_id)] = a.address;
  }

  // 4) 지역 판정 (아고다 주소 우선, 없으면 우리 호텔 주소=구글주소)
  const byDistrict = {};   // district -> [id]
  let none = 0;
  for (const h of hotels) {
    let d = null;
    for (const x of (h.agoda_hotel_ids || [])) { const a = addrById[String(x)]; if (a) { d = districtOf(a); if (d) break; } }
    if (!d && h.address) d = districtOf(h.address);
    if (d) { (byDistrict[d] = byDistrict[d] || []).push(h.id); } else { none += 1; }
  }
  const filled = Object.values(byDistrict).reduce((s, a) => s + a.length, 0);

  if (dry) {
    const preview = Object.fromEntries(Object.entries(byDistrict).map(([k, v]) => [k, v.length]));
    return res.status(200).json({ ok: true, dry_run: true, city, target_hotels: hotels.length, would_fill: filled, no_address: none, districts: preview });
  }

  // 5) 저장 (지역별 배치 UPDATE)
  for (const [d, idList] of Object.entries(byDistrict)) {
    for (let i = 0; i < idList.length; i += 80) {
      const chunk = idList.slice(i, i + 80);
      try { await sb.from('hotels').update({ district: d }).in('id', chunk); } catch { /* 계속 */ }
    }
  }

  // 남은(지역 빈) 호텔 수
  const { count: remaining } = await sb.from('hotels')
    .select('id', { count: 'exact', head: true }).eq('city', city).is('district', null);

  return res.status(200).json({
    ok: true, city, target_hotels: hotels.length, filled, no_address: none,
    districts: Object.fromEntries(Object.entries(byDistrict).map(([k, v]) => [k, v.length])),
    remaining_null: remaining, note: '아고다 주소로 지역 채움 (구글 안 씀).',
  });
}
