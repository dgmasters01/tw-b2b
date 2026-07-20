// api/cron/hotel-closed-check.js
// ─────────────────────────────────────────────────────────────
// BL-HOTEL-CLOSED-CHECK (D-069 후속3 · 정석 자동화)
//   아고다는 월 1회 업데이트된다. **예약을 받았는데(hotels) 최신 아고다에서 이름이 사라진 호텔**
//   = 폐업 의심 → 그 소수만 **구글 Places** 로 영업상태 확인. (구글은 여기서만·최소·저비용)
//   폐업 호텔로 콘텐츠를 만들면 예약이 0이다(D-069). 미리 걸러낸다.
// 안전: 예약 많은 순으로 소수(limit)만·30일 내 확인한 건 건너뜀(재확인 낭비 방지).
// 부르는 법:
//   자동: Vercel Cron. Authorization: Bearer <CRON_SECRET>.
//   수동: x-ops-token. ?limit=N (기본 10·상한 30) / ?dry_run=1
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

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

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
async function businessStatus(name, city, apiKey) {
  try {
    const r = await fetch(PLACES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'places.businessStatus,places.displayName' },
      body: JSON.stringify({ textQuery: `${name}, ${city}`, maxResultCount: 1, languageCode: 'en' }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const p = d.places && d.places[0];
    return p ? (p.businessStatus || 'UNKNOWN') : 'NOT_FOUND';
  } catch { return null; }
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const q = req.query || {};
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), 30);   // 구글 호출 제한
  const dry = q.dry_run === '1' || q.dry_run === 'true';

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'GOOGLE_PLACES_API_KEY 없음' });

  // 1) 아직 살아있다고 아는(active) · 아고다 id 있는 예약 호텔
  const { data: hotels, error } = await sb.from('hotels')
    .select('id, hotel_name, city, agoda_hotel_ids, booking_count, closed_checked_at')
    .eq('operating_status', 'active').not('agoda_hotel_ids', 'is', null);
  if (error) return res.status(500).json({ ok: false, error: error.message });

  // 2) 이 호텔들의 아고다 id 중 **최신 아고다에 아직 있는 것** 집합
  const allIds = new Set();
  for (const h of hotels || []) for (const x of (h.agoda_hotel_ids || [])) allIds.add(String(x));
  const idarr = [...allIds];
  const existing = new Set();
  for (let i = 0; i < idarr.length; i += 500) {
    const chunk = idarr.slice(i, i + 500).map((x) => Number(x)).filter((x) => !Number.isNaN(x));
    if (!chunk.length) continue;
    const { data } = await sb.from('agoda_inventory').select('agoda_hotel_id').in('agoda_hotel_id', chunk);
    for (const a of data || []) existing.add(String(a.agoda_hotel_id));
  }

  // 3) 폐업 의심 = 아고다 id 가 **전부 사라진** 호텔 (30일 내 확인한 건 제외 · 예약 많은 순)
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const suspects = (hotels || [])
    .filter((h) => (h.agoda_hotel_ids || []).length
      && (h.agoda_hotel_ids || []).every((x) => !existing.has(String(x)))
      && (!h.closed_checked_at || new Date(h.closed_checked_at).getTime() < cutoff))
    .sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0));

  if (dry) {
    return res.status(200).json({ ok: true, dry_run: true, suspects: suspects.length,
      sample: suspects.slice(0, limit).map((h) => `${h.hotel_name} (${h.city}·예약 ${h.booking_count || 0})`) });
  }

  // 4) 상위 limit 개만 구글 확인
  const now = new Date().toISOString();
  const out = { checked: 0, closed: 0, temp_closed: 0, still_open: 0, not_found: 0, samples: [] };
  for (const h of suspects.slice(0, limit)) {
    const bs = await businessStatus(h.hotel_name, h.city, apiKey);
    out.checked++;
    const patch = { closed_checked_at: now };
    if (bs === 'CLOSED_PERMANENTLY') { patch.operating_status = 'closed'; out.closed++; out.samples.push(`${h.hotel_name} → 폐업`); }
    else if (bs === 'CLOSED_TEMPORARILY') { patch.operating_status = 'temp_closed'; out.temp_closed++; out.samples.push(`${h.hotel_name} → 임시휴업`); }
    else if (bs === 'OPERATIONAL') { out.still_open++; }               // 아고다서 빠졌지만 영업 중 — 상태 유지
    else { out.not_found++; }                                          // 못 찾음 — 다음 기회에
    try { await sb.from('hotels').update(patch).eq('id', h.id); } catch { /* 계속 */ }
    await new Promise((r) => setTimeout(r, 300));                       // 살짝 간격
  }
  return res.status(200).json({ ok: true, suspects: suspects.length, ...out, note: '아고다에서 사라진 예약 호텔만 구글 폐업 확인 (구글 최소).' });
}
