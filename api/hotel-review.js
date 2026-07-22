// /api/hotel-review.js
// 스튜디오 호텔 "확인함" 창구 (BL-HOTEL-MASTER).
//
// 무엇을 하나:
//   자동 통합이 "애매하다"고 표시한 호텔(hotels.merge_status='ambiguous')만 내려준다.
//   대표님은 이 극소수만 보고 [맞음·확정] 하면 된다. 3,000개를 검수하지 않는다.
//
// 부르는 법:
//   GET  /api/hotel-review
//     신분증: 쿠키 sb-access-token (studio.html 세션) 또는 x-ops-token
//     권한  : is_editor 이상이면 조회.
//     나오는 것: { ok, is_admin, count, hotels: [...] }
//   POST /api/hotel-review   body { hotel_code, action:'confirm' }
//     권한  : admin(대표님)만. 확정은 되돌리는 결정이라 대표님만 누른다.
//     하는 일: merge_status ambiguous → confirmed (그 호텔이 확인함에서 사라짐)
//
// 왜 이렇게:
//   content-hotels.js 와 같은 원칙 — 세션을 확인하고 service_role 로 읽는다.
//   화면 말은 믿지 않고 권한은 DB(is_editor/is_admin RPC)가 판정한다.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

function accessToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const raw = req.headers['cookie'] || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === 'sb-access-token') return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

async function authorized(req) {
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (expected && (req.headers['x-ops-token'] || '') === expected) {
    return { ok: true, via: 'ops-token', isAdmin: true };
  }
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return { ok: false };
    let isAdmin = false;
    try {
      const a = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: H, body: '{}' });
      isAdmin = a.ok && (await a.json()) === true;
    } catch { /* 못 물어보면 안 준다 */ }
    return { ok: true, via: 'session', isAdmin };
  } catch {
    return { ok: false };
  }
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  // ── 확인함 목록 ──
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('hotels')
      .select('hotel_code,hotel_name,city,country,star_rating,booking_count,agoda_hotel_ids')
      .eq('merge_status', 'ambiguous')
      .order('booking_count', { ascending: false });
    if (error) return res.status(500).json({ ok: false, error: String(error.message || error) });
    const hotels = (data || []).map((h) => {
      const ids = Array.isArray(h.agoda_hotel_ids) ? h.agoda_hotel_ids : [];
      const nameLen = String(h.hotel_name || '').replace(/[\s\p{P}]/gu, '').length;
      const reason = nameLen <= 4 ? '이름이 짧아 다른 호텔과 헷갈릴 수 있음' : '자동 묶음이 애매함';
      return {
        hotel_code: h.hotel_code,
        hotel_name: h.hotel_name,
        city: h.city,
        country: h.country,
        star_rating: h.star_rating,
        booking_count: h.booking_count || 0,
        agoda_count: ids.length,
        reason,
      };
    });
    // ── 좌표가 «같거나 아주 가까운» 호텔 그룹 (D-071 §6 근접 판정 · 반경 15m) ──
    //   왜 근접인가: 아고다 등록마다 좌표 소수점이 미세하게 달라 «완전 일치»만 보면
    //   같은 건물인데 못 잡는다. 실측 ZONK Nakasu = 3m, Quest Cebu = 13m, Sanouva = 11m.
    //   왜 15m인가: 실측 분포상 0~5m에 중복이 몰리고 15m를 넘으면 «진짜 옆 건물»이 급증한다.
    const NEAR_M = 15;
    const distM = (a, b) => {
      const dLat = (a.lat - b.lat) * 111320;
      const dLng = (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
      return Math.sqrt(dLat * dLat + dLng * dLng);
    };
    let coord_groups = [];
    const coordOf = {};   // hotel_code → {lat,lng} (아래 이름 그룹에서도 거리 계산에 씀)
    try {
      // 좌표 있는 호텔 전부 읽기 (merged 제외) — 1000행 제한이 있어 나눠 읽는다
      const all = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data: page, error } = await sb.from('hotels')
          .select('hotel_code,hotel_name,city,country,star_rating,property_type,booking_count,agoda_hotel_ids,latitude,longitude')
          .neq('merge_status', 'merged').not('latitude', 'is', null)
          .order('hotel_code').range(from, from + 999);
        if (error || !page || !page.length) break;
        all.push(...page);
        if (page.length < 1000) break;
      }
      const pts = all.map((h) => ({
        hotel_code: h.hotel_code, hotel_name: h.hotel_name, city: h.city, country: h.country,
        star_rating: h.star_rating, property_type: h.property_type, booking_count: h.booking_count || 0,
        agoda_count: Array.isArray(h.agoda_hotel_ids) ? h.agoda_hotel_ids.length : 0,
        agoda_ids: Array.isArray(h.agoda_hotel_ids) ? h.agoda_hotel_ids.map(String) : [],
        latitude: h.latitude, longitude: h.longitude,
        lat: Number(h.latitude), lng: Number(h.longitude),
      })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      for (const p of pts) coordOf[p.hotel_code] = p;

      // 격자(약 110m)로 나눠 이웃 칸만 비교 → 3천 곳도 순식간
      const cell = 0.001, grid = {};
      const gk = (x, y) => x + ':' + y;
      pts.forEach((p, idx) => {
        p._i = idx;
        const k = gk(Math.round(p.lat / cell), Math.round(p.lng / cell));
        (grid[k] = grid[k] || []).push(p);
      });
      // 대표님이 «아니오·다른 곳»이라고 못 박은 쌍은 절대 다시 묶지 않는다
      const notDup = new Set();
      try {
        const { data: nd } = await sb.from('hotel_not_dup').select('code_a,code_b');
        for (const r of nd || []) notDup.add(r.code_a + '|' + r.code_b);
      } catch { /* 테이블 없으면 무시 */ }
      const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

      // 유니온-파인드로 «가까운 것끼리» 한 덩어리로
      const par = pts.map((_, i) => i);
      const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
      const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[b] = a; };
      for (const p of pts) {
        const cx = Math.round(p.lat / cell), cy = Math.round(p.lng / cell);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          for (const q of (grid[gk(cx + dx, cy + dy)] || [])) {
            if (q._i <= p._i) continue;
            if (notDup.has(pairKey(p.hotel_code, q.hotel_code))) continue;
            if (distM(p, q) <= NEAR_M) uni(p._i, q._i);
          }
        }
      }
      const bag = {};
      for (const p of pts) { const r = find(p._i); (bag[r] = bag[r] || []).push(p); }
      coord_groups = Object.values(bag)
        .filter((g) => g.length > 1)
        .map((g) => {
          g.sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0));   // 예약 많은 걸 대표로
          const head = g[0];
          return g.map((h) => ({
            hotel_code: h.hotel_code, hotel_name: h.hotel_name, city: h.city, country: h.country,
            star_rating: h.star_rating, property_type: h.property_type, booking_count: h.booking_count, agoda_count: h.agoda_count,
            agoda_ids: h.agoda_ids,
            latitude: h.latitude, longitude: h.longitude,
            dist_m: Math.round(distM(head, h)),          // 대표에서 몇 m 떨어져 있나
          }));
        })
        .sort((a, b) => (b[0].booking_count || 0) - (a[0].booking_count || 0));
      // ── 아고다 원본으로 «같은 곳/다른 곳» 물증 잡기 (2026-07-22 대표님 통찰) ──
      //   같은 호텔을 아고다에 두 번 올린 것이면 «리뷰 수·객실 수·주소»가 똑같다(리뷰 풀을 공유).
      //   한 건물에 든 서로 다른 호텔이면 «리뷰도 따로, 객실 수도 다르고, 층도 다르다».
      //   실측: Sanouva 다낭 = 객실 83·리뷰 8283 양쪽 동일(같은 곳) /
      //        Roaders Plus 타이베이 = 객실 128 vs 109 · 리뷰 9778 vs 8245 · 24-35F vs 5-12F(다른 곳).
      const inv = {};
      try {
        const need = [...new Set([].concat(...coord_groups.map((g) => [].concat(...g.map((h) => h.agoda_ids || [])))))];
        for (let i = 0; i < need.length; i += 300) {
          const { data: rows } = await sb.from('agoda_inventory')
            .select('agoda_hotel_id,number_of_rooms,review_count,address').in('agoda_hotel_id', need.slice(i, i + 300));
          for (const r of rows || []) inv[String(r.agoda_hotel_id)] = r;
        }
      } catch { /* 재고에 없으면 이름·거리로만 판단 */ }
      const factsOf = (h) => {
        const rooms = new Set(), rc = new Set(), addr = new Set();
        for (const id of (h.agoda_ids || [])) {
          const r = inv[id]; if (!r) continue;
          if (r.number_of_rooms != null) rooms.add(Number(r.number_of_rooms));
          if (r.review_count != null && Number(r.review_count) > 0) rc.add(Number(r.review_count));
          if (r.address) addr.add(String(r.address).toLowerCase().replace(/\s+/g, ' ').trim());
        }
        return { rooms, rc, addr };
      };
      for (const g of coord_groups) {
        const F = g.map(factsOf);
        let same = false, diff = false;
        for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
          const a = F[i], b = F[j];
          const hit = (x, y) => [...x].some((v) => y.has(v));
          if ((a.rc.size && b.rc.size && hit(a.rc, b.rc)) || (a.addr.size && b.addr.size && hit(a.addr, b.addr))) same = true;
          if (a.rc.size && b.rc.size && !hit(a.rc, b.rc)) diff = true;
          if (a.rooms.size && b.rooms.size && !hit(a.rooms, b.rooms)) diff = true;
        }
        const verdict = diff ? 'diff' : (same ? 'same' : null);   // 물증이 없으면 null
        for (let i = 0; i < g.length; i++) {
          g[i].verdict = verdict;
          g[i].rooms = [...F[i].rooms][0] ?? null;
          g[i].review_count = [...F[i].rc][0] ?? null;
        }
      }

      // 이름까지 비슷하면 «거의 확실», 이름이 전혀 다르면 «같은 건물 다른 호텔»일 수 있다 → 화면에 신호를 준다
      const STOPW = new Set(['hotel', 'the', 'and', 'de', 'city', 'resort', 'inn', 'by', 'a', 'of', 'suites', 'spa', 'ryokan', 'house', 'stay', 'apartment', 'residence', 'guest', 'tokyo', 'osaka', 'kyoto']);
      const words = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((x) => x.length > 2 && !STOPW.has(x));
      // «같은 도시에서 여러 호텔이 함께 쓰는 말»(Gion·Namba 같은 동네 이름)은 브랜드가 아니다 → 유사 판정에서 뺀다
      const freq = {};
      for (const p of pts) { const seen = new Set(words(p.hotel_name)); for (const w of seen) { const k = (p.city || '') + '|' + w; freq[k] = (freq[k] || 0) + 1; } }
      const core = (h) => new Set(words(h.hotel_name).filter((w) => (freq[(h.city || '') + '|' + w] || 0) < 4));
      for (const g of coord_groups) {
        const base = core(g[0]);
        let same = base.size > 0;
        for (let k = 1; k < g.length; k++) {
          const c = core(g[k]);
          if (!c.size || ![...c].some((w) => base.has(w))) { same = false; break; }
          // 🔴 양쪽 다 «상대에게 없는 고유한 말»이 있으면 → 같은 브랜드의 «다른 지점»일 확률이 높다
          //    Roaders Plus [Taipei Station] ↔ Roaders Plus [Theme] = 한 건물 두 호텔 (대표님 2026-07-22)
          const aOnly = [...base].some((w) => !c.has(w));
          const bOnly = [...c].some((w) => !base.has(w));
          if (aOnly && bOnly) { same = false; break; }
        }
        // 유형이 다르면(료칸 ↔ 호텔) 같은 곳이라 보기 어렵다
        const types = new Set(g.map((h) => h.property_type).filter(Boolean));
        const typeMixed = types.size > 1;
        const v = g[0].verdict;
        for (const h of g) { h.name_alike = (v === 'same') || (same && !typeMixed && v !== 'diff'); h.type_mixed = typeMixed; }
      }
      const rank = (g) => (g[0].verdict === 'same' ? 0 : g[0].verdict === 'diff' ? 2 : 1);
      coord_groups.sort((a, b) => rank(a) - rank(b) || (b[0].name_alike ? 1 : 0) - (a[0].name_alike ? 1 : 0) || (b[0].booking_count || 0) - (a[0].booking_count || 0));
    } catch { /* 못 읽으면 좌표 그룹만 비운다 */ }

    // 좌표 그룹에 «어느 그룹의» 호텔인지 (같은 그룹이면 위에서 이미 처리됨)
    const cgOf = {};
    coord_groups.forEach((g, gi) => { for (const h of g) cgOf[h.hotel_code] = gi; });

    // 이름이 비슷한 것끼리 묶기 (좌표로 안 잡힌 같은 호텔 후보 — 도시 + 앞 의미단어 2개)
    const stop = new Set(['hotel', 'the', 'and', 'de', 'city', 'resort', 'inn', 'by', 'a', 'of']);
    const nameKey = (name, city) => {
      const w = String(name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((x) => x && !stop.has(x));
      return (city || '') + '|' + (w[0] || '') + '|' + (w[1] || '');
    };
    const byName = {};
    for (const h of hotels) { const k = nameKey(h.hotel_name, h.city); (byName[k] = byName[k] || []).push(h); }
    const name_groups = Object.values(byName)
      .filter((g) => g.length > 1)
      // 이미 «같은 좌표 그룹»으로 위에 뜬 것은 두 번 보여주지 않는다
      .filter((g) => !(cgOf[g[0].hotel_code] !== undefined && g.every((h) => cgOf[h.hotel_code] === cgOf[g[0].hotel_code])))
      .map((g) => {
        g.sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0));
        // 대표에서 몇 m 떨어져 있나 — 멀면 «다른 곳»일 확률이 높다는 신호를 화면에 준다
        const head = coordOf[g[0].hotel_code];
        return g.map((h) => {
          const p = coordOf[h.hotel_code];
          const d = (head && p) ? Math.round(distM(head, p)) : null;
          return Object.assign({}, h, { dist_m: d });
        });
      })
      .sort((a, b) => (b[0].booking_count || 0) - (a[0].booking_count || 0));
    // 낱개 = 좌표 그룹에도 없고 이름 그룹에도 안 뜬 애매 호텔
    const shown = new Set();
    for (const g of name_groups) for (const h of g) shown.add(h.hotel_code);
    const singletons = hotels.filter((h) => cgOf[h.hotel_code] === undefined && !shown.has(h.hotel_code));

    // 배지 숫자 = «대표님이 눌러서 처리할 것» 전부 (좌표그룹 + 이름그룹 + 낱개)
    //   예전엔 낱개만 셌다 → 안에 90그룹이 밀려 있는데 배지엔 1이라 나와서 못 봤다. (2026-07-22)
    const review_total = coord_groups.length + name_groups.length + singletons.length;
    return res.status(200).json({
      ok: true, is_admin: who.isAdmin,
      review_total,
      coord_group_count: coord_groups.length,
      name_group_count: name_groups.length,
      single_count: singletons.length,
      count: singletons.length,          // (구버전 화면 호환)
      hotels: singletons, coord_groups, name_groups,
    });
  }

  // ── 확정 처리 (admin 전용) ──
  if (req.method === 'POST') {
    if (!who.isAdmin) return res.status(403).json({ ok: false, error: '확정은 대표님(admin)만 할 수 있습니다.' });
    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { /* noop */ }
    const code = String(body.hotel_code || '').trim();
    const action = String(body.action || '').trim();
    if (!code && action !== 'not_dup') return res.status(400).json({ ok: false, error: 'hotel_code 가 필요합니다.' });
    if (action === 'confirm') {
      const { data, error } = await sb
        .from('hotels')
        .update({ merge_status: 'confirmed' })
        .eq('hotel_code', code)
        .eq('merge_status', 'ambiguous')
        .select('hotel_code');
      if (error) return res.status(500).json({ ok: false, error: String(error.message || error) });
      if (!data || !data.length) return res.status(404).json({ ok: false, error: '확인함에서 그 호텔을 못 찾았습니다.' });
      return res.status(200).json({ ok: true, action: 'confirmed', hotel_code: code });
    }
    if (action === 'merge') {
      // 같은 호텔인데 다른 코드로 나뉜 것을 하나로 합친다.
      //   body { hotel_code: 남길 대표코드, merge_from: [흡수될 코드들] }
      const from = Array.isArray(body.merge_from) ? body.merge_from.map((x) => String(x).trim()).filter(Boolean) : [];
      if (!from.length) return res.status(400).json({ ok: false, error: 'merge_from(합칠 코드들)이 필요합니다.' });
      const codes = [code, ...from];
      const { data: hs, error: he } = await sb.from('hotels')
        .select('hotel_code,hotel_name,agoda_hotel_ids').in('hotel_code', codes);
      if (he) return res.status(500).json({ ok: false, error: String(he.message || he) });
      const survivor = (hs || []).find((h) => h.hotel_code === code);
      if (!survivor) return res.status(404).json({ ok: false, error: '대표 호텔을 못 찾았습니다.' });
      // 아고다ID 합집합
      const ids = new Set();
      for (const h of hs || []) for (const x of (h.agoda_hotel_ids || [])) ids.add(String(x));
      // 예약 재계산: 합쳐진 이름들의 실제 예약(중복 제거) = distinct unified_id
      const names = [...new Set((hs || []).map((h) => h.hotel_name).filter(Boolean))];
      let bcount = survivor.booking_count || 0;
      if (names.length) {
        const { data: bk } = await sb.from('bookings_unified').select('unified_id,hotel_name').in('hotel_name', names);
        const s = new Set((bk || []).map((b) => b.unified_id));
        if (s.size) bcount = s.size;
      }
      // 대표에 반영
      const { error: ue } = await sb.from('hotels')
        .update({ agoda_hotel_ids: [...ids], booking_count: bcount, merge_status: 'confirmed' })
        .eq('hotel_code', code);
      if (ue) return res.status(500).json({ ok: false, error: String(ue.message || ue) });
      // 흡수된 것 병합 처리 (숨김·집계 제외)
      await sb.from('hotels').update({ merge_status: 'merged', agoda_hotel_ids: [], booking_count: 0 }).in('hotel_code', from);
      return res.status(200).json({ ok: true, action: 'merged', survivor: code, absorbed: from, agoda_ids: ids.size, booking_count: bcount });
    }
    if (action === 'not_dup') {
      // «아니오 · 다른 곳입니다» — 이 묶음은 다시 뜨지 않는다
      const codes = Array.isArray(body.codes) ? body.codes.map((x) => String(x).trim()).filter(Boolean) : [];
      if (codes.length < 2) return res.status(400).json({ ok: false, error: 'codes(2곳 이상)가 필요합니다.' });
      const rows = [];
      for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) {
        const [a, b] = codes[i] < codes[j] ? [codes[i], codes[j]] : [codes[j], codes[i]];
        rows.push({ code_a: a, code_b: b });
      }
      const { error } = await sb.from('hotel_not_dup').upsert(rows, { onConflict: 'code_a,code_b' });
      if (error) return res.status(500).json({ ok: false, error: String(error.message || error) });
      // 애매 표시도 풀어준다 (각자 제대로 된 호텔이라는 뜻)
      await sb.from('hotels').update({ merge_status: 'confirmed' }).in('hotel_code', codes).eq('merge_status', 'ambiguous');
      return res.status(200).json({ ok: true, action: 'not_dup', pairs: rows.length });
    }
    return res.status(400).json({ ok: false, error: '지원하는 action: confirm, merge, not_dup' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'GET/POST 만 지원합니다.' });
}
