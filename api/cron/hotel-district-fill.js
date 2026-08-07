// api/cron/hotel-district-fill.js
// ─────────────────────────────────────────────────────────────
// BL-HOTEL-DISTRICT-FROM-AGODA (D-069 후속2 · 정석 자동화)
//   지역(district)이 빈 호텔을, **아고다 주소**에서 동네/구를 뽑아 채운다. 구글 안 씀(한도 0).
//   안전: 이미 지역이 있는 호텔은 건드리지 않는다(district IS NULL 만).
//
// 🔴 2026-08-07 추가 — 「한국어로 다시 맞추기」 (대표님이 타이베이 화면에서 발견)
//   빈칸만 채우다 보니, **옛 구글 봇이 영어로 박아 둔 값(`Wanhua` `Zhongzheng` `中山區 Zhongshan`)이
//   영영 안 고쳐졌다.** 화면에서 같은 지역이 두 줄·세 줄로 쪼개져 예약 건수가 갈렸다
//   (중정구 39건 / Zhongzheng 132건 → 진짜는 174건).
//   → 이제 이 봇이 **한 바퀴 돌 때 그 도시의 비한국어 지역명도 같이 한국어로 모은다.**
//     사전에 없는 이름은 건드리지 않는다(엉뚱하게 안 박는 원칙 그대로).
// 부르는 법:
//   자동: Vercel Cron. Authorization: Bearer <CRON_SECRET>.
//   수동: x-ops-token. ?city=Fukuoka / ?limit=N / ?dry_run=1
//   city 없으면 지역 빈 호텔이 있는 도시를 자동으로 하나 골라 채운다.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { districtOf, canonDistrict, hasDistrictRule } from '../_lib/district-parse.js';

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

  // 1) 도시 결정
  // 🔴 2026-08-07 병목 수정 (대표님 «다른 도시들도 전체 체크 해 본 거야?»)
  //    옛 코드는 **하루에 한 도시**만 골라 돌았다(`.limit(1)`). 도시가 40개면 **40일**이 걸리고,
  //    그 도시에 «규칙 없는 주소»가 남아 있으면 매일 같은 도시만 골라 **영원히 다음으로 못 넘어갔다.**
  //    실제로 하노이는 파서가 읽을 수 있는데도 지역이 0개였다 — **봇이 한 번도 안 온 것**이다.
  //    → 이제 한 번에 **여러 도시**를 돈다(예약 많은 순).
  // 🔴 2026-08-08 두 번째 병목 (D-083) — 「규칙 없는 나라」가 하루치 자리를 먹고 있었다.
  //    파서에 사전이 없는 나라(한국·호주·말레이시아·이탈리아…)는 돌려도 **반드시 0건**이다.
  //    그런데 지역이 영영 안 차니 매일 예약순 상위에 다시 뽑혀 8칸 중 한 칸을 영구 점유했다.
  //    → 이제 hasDistrictRule() 로 «할 수 있는 도시»만 고르고, 못 하는 도시는 대기 목록으로 «센다».
  //    ⚠️ 건너뛰는 게 아니라 **보고한다.** 사전을 새로 넣으면 다음 날 자동으로 다시 대상이 된다.
  let cities;
  let noRule = { cities: 0, hotels: 0, bookings: 0, top: [] };
  if (q.city) cities = [q.city];
  else {
    const { data } = await sb.from('hotels')
      .select('city, country, booking_count').is('district', null).not('city', 'is', null);
    const bk = {};
    const nr = {};
    for (const r of data || []) {
      if (!hasDistrictRule(r.city, r.country)) {
        const k = r.country + ' / ' + r.city;
        nr[k] = nr[k] || { hotels: 0, bookings: 0 };
        nr[k].hotels += 1; nr[k].bookings += (r.booking_count || 0);
        continue;
      }
      bk[r.city] = (bk[r.city] || 0) + (r.booking_count || 0);
    }
    const nrList = Object.entries(nr).sort((a, b) => b[1].bookings - a[1].bookings);
    noRule = {
      cities: nrList.length,
      hotels: nrList.reduce((s2, [, v]) => s2 + v.hotels, 0),
      bookings: nrList.reduce((s2, [, v]) => s2 + v.bookings, 0),
      top: nrList.slice(0, 10).map(([k, v]) => ({ city: k, hotels: v.hotels, bookings: v.bookings })),
    };
    cities = Object.keys(bk).sort((a, b) => bk[b] - bk[a]).slice(0, Math.min(parseInt(q.cities, 10) || 8, 20));
    if (!cities.length) {
      return res.status(200).json({
        ok: true, idle: true, all_done: true,
        note: '규칙 있는 나라의 지역은 전부 채워졌다. 남은 것은 «규칙 없는 나라» 뿐 — 사전을 추가해야 더 채워진다.',
        no_rule: noRule,
      });
    }
  }

  const all = [];
  for (const city of cities) {
    try { all.push(await fillOne(sb, city, limit, dry)); }
    catch (e) { all.push({ city, error: String(e.message || e).slice(0, 100) }); }
  }
  return res.status(200).json({
    ok: true, dry_run: dry, cities: cities.length, no_rule: noRule,
    filled_total: all.reduce((s2, r) => s2 + (r.filled || 0), 0),
    recanon_total: all.reduce((s2, r) => s2 + Object.values(r.recanon || {}).reduce((a, b) => a + b, 0), 0),
    results: all,
    note: '아고다 주소로 지역 채움(구글 안 씀) + 비한국어 지역명 한국어 통일. 도시를 여러 개 돈다.',
  });
}

async function fillOne(sb, city, limit, dry) {

  // 2) 지역 빈 호텔 (이 도시)
  const { data: hotels, error: hErr } = await sb.from('hotels')
    .select('id, agoda_hotel_ids, address').eq('city', city).is('district', null).limit(limit);
  if (hErr) throw new Error(hErr.message);
  if (!hotels || !hotels.length) return { city, filled: 0, recanon: await recanon(sb, city, dry) };

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
    for (const x of (h.agoda_hotel_ids || [])) { const a = addrById[String(x)]; if (a) { d = districtOf(a, city); if (d) break; } }
    if (!d && h.address) d = districtOf(h.address, city);
    if (d) { (byDistrict[d] = byDistrict[d] || []).push(h.id); } else { none += 1; }
  }
  const filled = Object.values(byDistrict).reduce((s, a) => s + a.length, 0);

  if (dry) {
    return { city, dry_run: true, target_hotels: hotels.length, would_fill: filled, no_address: none,
      districts: Object.fromEntries(Object.entries(byDistrict).map(([k, v]) => [k, v.length])) };
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

  // 6) 🔴 같은 도시의 «영어·한자로 남은» 지역명을 한국어 표준으로 모은다 (2026-08-07)
  const renamed = await recanon(sb, city, dry);

  return { city, target_hotels: hotels.length, filled, no_address: none,
    districts: Object.fromEntries(Object.entries(byDistrict).map(([k, v]) => [k, v.length])),
    remaining_null: remaining, recanon: renamed };
}

/** 이 도시의 지역명 중 한국어가 아닌 것을 사전으로 한국어 표준명에 모은다.
 *  사전에 없으면 그대로 둔다 → 감사봇(kw-audit ⑥)이 「섞임」으로 계속 알려준다. */
async function recanon(sb, city, dry) {
  const { data } = await sb.from('hotels')
    .select('id, district').eq('city', city).not('district', 'is', null);
  const plan = {};   // 한국어표준 -> [id]
  for (const r of data || []) {
    if (/[가-힣]/.test(r.district)) continue;          // 이미 한국어
    const ko = canonDistrict(r.district);
    if (!ko || ko === r.district) continue;            // 사전에 없음 → 안 건드림
    (plan[ko] = plan[ko] || []).push(r.id);
  }
  const out = {};
  for (const [ko, ids] of Object.entries(plan)) {
    out[ko] = ids.length;
    if (dry) continue;
    for (let i = 0; i < ids.length; i += 80) {
      try { await sb.from('hotels').update({ district: ko }).in('id', ids.slice(i, i + 80)); } catch { /* 계속 */ }
    }
  }
  return out;
}
