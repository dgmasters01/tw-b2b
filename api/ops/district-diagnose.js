// api/ops/district-diagnose.js
// ─────────────────────────────────────────────────────────────
// BL-DISTRICT-DIAGNOSE (D-084) — 「지역이 왜 안 채워지나」를 **한 번 불러서** 알아낸다.
//
// 🔴 왜 만들었나 (대표님 2026-08-08):
//   "이 부분 며칠째 똑같은 부분 계속 체크하여 변경하는 것 같아. 이러면 안 되잖아."
//   실제로 district-parse.js 를 7/20 · 8/7 · 8/7 · 8/8 **네 번** 고쳤다.
//   매번 「눈에 띈 증상 1개」만 보고 고쳤고, 전체를 잰 적이 없어서 고칠 때마다 다음 병목이 나왔다.
//   → 이제 손대기 **전에** 이 창구를 부른다. 근거 없이 파서를 고치지 않는다.
//
// 감시자다. **아무것도 고치지 않는다** (읽기 전용 · D-081 「감시자와 수리공 분리」).
//
// 부르는 법: POST/GET  x-ops-token  ·  ?limit=3000
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { districtOf, hasDistrictRule, SUPPORTED_CC } from '../_lib/district-parse.js';

export const config = { maxDuration: 60 };

function authOK(req) {
  const h = req.headers || {};
  const ops = process.env.CLAUDE_OPS_TOKEN, cron = process.env.CRON_SECRET;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  return false;
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: 'supabase env 없음' });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const cap = Math.min(parseInt((req.query || {}).limit, 10) || 4000, 6000);

  // 1) 지역 빈 호텔 전부
  const rows = [];
  for (let off = 0; off < cap; off += 1000) {
    const { data, error } = await sb.from('hotels')
      .select('hotel_code, city, country, address, agoda_hotel_ids, google_place_id, latitude, booking_count')
      .is('district', null).order('hotel_code').range(off, off + 999);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  // 2) 아고다 주소 배치 조회 (봇과 같은 순서: 아고다 주소 우선 → 우리 주소)
  const idSet = new Set();
  for (const h of rows) for (const x of (h.agoda_hotel_ids || [])) idSet.add(String(x));
  const ids = [...idSet];
  const addrById = {};
  for (let i = 0; i < ids.length; i += 400) {
    const { data: ag } = await sb.from('agoda_inventory')
      .select('agoda_hotel_id, address').in('agoda_hotel_id', ids.slice(i, i + 400)).not('address', 'is', null);
    for (const a of ag || []) addrById[String(a.agoda_hotel_id)] = a.address;
  }

  // 3) 분류
  const B = {};
  const bump = (k, h, addr) => {
    B[k] = B[k] || { hotels: 0, bookings: 0, cities: new Set(), examples: [] };
    B[k].hotels += 1; B[k].bookings += (h.booking_count || 0); B[k].cities.add(h.country + '/' + h.city);
    if (B[k].examples.length < 5) B[k].examples.push(`[${h.city}] ${String(addr || '(주소없음)').slice(0, 80)}`);
  };
  for (const h of rows) {
    let agoda = null;
    for (const x of (h.agoda_hotel_ids || [])) { if (addrById[String(x)]) { agoda = addrById[String(x)]; break; } }
    const addr = agoda || h.address || null;
    if (!addr) { bump('A_주소가_아예_없음', h, null); continue; }
    if (!hasDistrictRule(h.city, h.country)) { bump('B_사전없는_나라', h, addr); continue; }
    if (districtOf(addr, h.city)) { bump('C_지금_뽑힘_봇이_아직_안온것', h, addr); continue; }
    // 못 뽑음 — 구글에 물어봤나로 갈린다. 이 갈림이 「다음에 뭘 할지」를 정한다.
    if (h.google_place_id) bump('D2_구글주소_있는데_사전에_이름없음', h, addr);
    else bump('D1_구글에_아직_안물어봄', h, addr);
  }

  const out = {};
  for (const [k, v] of Object.entries(B)) {
    out[k] = { hotels: v.hotels, bookings: v.bookings, cities: v.cities.size, examples: v.examples };
  }
  const g = (k) => (out[k] ? out[k].hotels : 0);
  return res.status(200).json({
    ok: true,
    total_no_district: rows.length,
    supported_countries: SUPPORTED_CC,
    buckets: out,
    다음_할_일: {
      D1: `구글에 주소 다시 묻기 — ${g('D1_구글에_아직_안물어봄')}건 (hotel-geo-fill 대상 확대)`,
      D2: `사전 보강 — ${g('D2_구글주소_있는데_사전에_이름없음')}건 (구글 주소에 동네가 있는데 사전에 없음. 전수로 한 번에)`,
      B: `사전 없는 나라 — ${g('B_사전없는_나라')}건 (사업 판단: 채널 없는 시장은 보류)`,
      A: `구조적 불가 — ${g('A_주소가_아예_없음')}건 (더 이상 손대지 않음)`,
    },
    금지사항: '부분·토큰 일치 재도입 금지 (D-083 §3 — `No.27, Zhongshan Rd` 가 타이중인데 타이베이 중산구로 박힌다).',
    note: '읽기 전용. 아무것도 고치지 않는다. 파서를 고치기 전에 반드시 이걸 먼저 부른다.',
  });
}
