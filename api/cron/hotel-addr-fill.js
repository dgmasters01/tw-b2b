// /api/cron/hotel-addr-fill.js
// 주소 없는 호텔에 «아고다 파일»로 주소를 채운다. 구글은 안 부른다.
//
// ═══ 왜 만들었나 (2026-08-02 대표님) ═══
//   *"여기에 구글 이름으로 못 찾았다고 하는데, 우리가 받은 아고다DB에 위치값들이 있잖아.
//     그걸로 하는 게 아니야? 거기 GPS 값도 있잖아.
//     이거 한 달에 구글 체크할 수 있는 게 한계가 있었어. 다른 방식으로 하기로 한 거 아니야?"*
//
//   맞다. `SYSTEM_MAP §4` 에 이미 적혀 있다 — **「아고다 1차 · 구글 최소」**.
//   그런데 화면은 아직 *"구글이 이름으로 못 찾았습니다"* 라고 말하고 있었다.
//
//   실태(2026-08-02 실측):
//     · 우리 장부 3,252곳 중 좌표는 **3,243곳(99.7%)** 이미 있다 — 아고다 파일로 채운 것
//     · 그런데 **주소가 비어서 「지역(구)」을 못 붙였다** → 도쿄 233곳 중 75곳이 지역 없음
//     · 아고다 파일에는 주소가 **99%** 있다(일본 93,759 / 94,677)
//     · 이름이 안 맞아서 못 찾았을 뿐 — **좌표로 대면 0m 로 정확히 붙는다**
//
// ═══ 방식 ═══
//   ① 주소가 빈 호텔을 고른다 (좌표는 있는 것만)
//   ② 아고다 파일에서 **좌표 50m 안** 호텔을 찾는다 (D-071 좌표 원칙)
//   ③ 그 주소를 가져와 채운다. 아고다 번호도 같이 잇는다
//   🔴 구글은 부르지 않는다. 한 달 호출 한도를 쓰지 않는다.
//
//   못 찾으면 그대로 둔다. 지어내지 않는다(HOTEL_MATCH 원칙 ④).

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 120 };

const PER_RUN = 120;      // 한 번에 채우는 호텔 수 — 몰아치지 않는다
const RADIUS_M = 50;      // 같은 호텔로 보는 거리 (D-071)

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function authOK(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN;
  if (ops && (req.headers['x-ops-token'] || '') === ops) return true;
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers['authorization'] || '') === `Bearer ${secret}`) return true;
  return (req.headers['user-agent'] || '').includes('vercel-cron');
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const dry = req.query.dry_run === '1';
  const limit = Math.min(Math.max(parseInt(req.query.limit || PER_RUN, 10) || PER_RUN, 1), 400);

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }

  // ① 주소 없는 호텔 (좌표는 있어야 한다 — 좌표가 열쇠다)
  const { data: targets, error: e1 } = await sb.from('hotels')
    .select('id, hotel_name, city, latitude, longitude, address, agoda_hotel_id')
    .is('address', null).not('latitude', 'is', null).limit(limit);
  if (e1) return res.status(500).json({ ok: false, error: e1.message });
  if (!targets || !targets.length) {
    return res.status(200).json({ ok: true, idle: true, note: '주소 없는 호텔이 없습니다. 전부 채워졌습니다.' });
  }

  let filled = 0, missed = 0;
  const samples = [];

  for (const h of targets) {
    const la = Number(h.latitude), lo = Number(h.longitude);
    if (!isFinite(la) || !isFinite(lo)) { missed += 1; continue; }
    // 🔴 2026-08-03 — 네모를 ±110m 로 잡고 **앞 20개만** 가져왔다.
    //   다낝처럼 호텔이 빌빌한 곳은 그 안에 36개가 있고, **0m 짜리 정답이 21번째**면 못 찾는다.
    //   실제로 그래서 50곳을 봐도 0건이 나왔다.
    //   → 네모를 **±55m** 로 좀히고(어차피 반경 50m 안만 쓴다) 상한도 올린다.
    const { data: near } = await sb.from('agoda_hotel')
      .select('hotel_id, name_en, name_ko, address, lat, lng, star')
      .gte('lat', la - 0.0005).lte('lat', la + 0.0005)
      .gte('lng', lo - 0.0006).lte('lng', lo + 0.0006)
      .not('address', 'is', null)
      .limit(200);
    if (!near || !near.length) { missed += 1; continue; }

    // 가장 가까운 것 하나
    let best = null;
    for (const a of near) {
      const dLa = (Number(a.lat) - la) * 111000;
      const dLo = (Number(a.lng) - lo) * 111000 * Math.cos(la * Math.PI / 180);
      const m = Math.sqrt(dLa * dLa + dLo * dLo);
      if (m <= RADIUS_M && (!best || m < best.m)) best = { a, m };
    }
    if (!best) { missed += 1; continue; }

    const patch = { address: best.a.address };
    // 아고다 번호가 비어 있으면 같이 잇는다 — 우리 장부에 아고다 번호가 0건이었다
    if (!h.agoda_hotel_id && best.a.hotel_id) patch.agoda_hotel_id = String(best.a.hotel_id);

    if (!dry) {
      const { error } = await sb.from('hotels').update(patch).eq('id', h.id);
      if (error) { missed += 1; continue; }
    }
    filled += 1;
    if (samples.length < 5) samples.push(`${h.hotel_name} → ${best.a.address} (${Math.round(best.m)}m)`);
  }

  return res.status(200).json({
    ok: true, dry_run: dry,
    looked: targets.length, filled, missed,
    note: '아고다 파일의 좌표로 주소를 채웠습니다. 구글은 부르지 않았습니다(호출 0).',
    next: '주소가 채워지면 hotel-district-fill 이 그 주소로 「구」를 붙입니다.',
    samples,
  });
}
