// /api/content-keywords.js
// 스튜디오 "키워드" 메뉴의 데이터 창구 (D-060 · 6메뉴).
//
// 무엇을 하나:
//   "다음에 뭘 만들지"를 예약 데이터로 뽑아준다.
//   - 도시 추천: 확정예약 많은데 아직 우리 영상이 없는 도시 (도시 TOP3 영상 후보)
//   - 호텔 추천: 확정예약 많은데 아직 어느 영상 TOP1/2/3 에도 안 든 호텔
//   대조 기준 = publications.hid_top1/2/3 (이미 노출한 호텔) vs bookings_agoda(실예약).
//
// 원칙: 스튜디오는 수수료·거래액 안 봄 → 추천 지표는 "확정예약 건수"(commission_usd 안 씀).
//
// 부르는 법:
//   GET /api/content-keywords
//     신분증: 쿠키 sb-access-token 또는 x-ops-token / 권한: is_editor 이상
//     나오는 것: { ok, is_admin, cities[], hotels[] }
//
//   GET /api/content-keywords?view=survey&city=cc:japan|osaka[&target=ko&market=KR&ym=2026-07]
//     🆕 2026-07-17 — 키워드 조사 3층 화면(D-065 ㊼-4)의 재료.
//     나오는 것: { ok, snapshot, counts, rows[](숙박 축), travel[](여행 축), districts[](지역 축), layer3 }
//     🔴 숫자는 전부 여기서 **세어서** 나간다. 화면에 박지 않는다.
//        (인계서 사고: 화면에 '살아있는 42·죽은 8' 이 박혀 있었고 진짜는 58·10 이었다)
//     🔴 구글/유튜브를 부르지 않는다. DB만 읽는다 (⑪ — 화면에서 실시간 호출 = 429로 화면이 죽는다)

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
    } catch { /* 못 물어보면 안 보여준다 */ }
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

/**
 * 키워드 조사 3층 화면 (D-065 ㊼-4).
 *
 * 1층  찾은 검색어 N / 살아있는 것 N / 붙여쓰기 짝 N쌍 / 버린 것 N   ← 전부 keyword 표를 센 값
 * 2층  대표 검색어 상위 30 (검색량 순) · 짝 있는 행은 펼치면 띄어·붙여 두 줄
 * 3층  새로 생긴·사라진 검색어 → 조사가 2회 이상 쌓여야 켜진다
 *
 * 붙여쓰기(kind='joined') 는 2층에 따로 안 세운다 — 띄어쓰기 짝 안으로 접어 넣는다.
 * 단 **짝(띄어쓰기 행)이 표에 없는 붙여쓰기는 제 줄로 세운다.** 접을 데가 없는데 숨기면
 * ㊼-2 가 살려낸 것(=붙여쓰기가 1위인 검색어)을 그대로 다시 놓친다.
 */
async function survey(sb, req, res, who) {
  const cityKey = String(req.query.city || 'cc:japan|osaka');
  const target = String(req.query.target || 'ko');
  const market = String(req.query.market || 'KR');
  // 도시 영문명 (지역 계산용) — 예 cc:japan|osaka → Osaka. 지역 데이터는 이 도시 것만 본다(오사카 하드코딩 제거).
  const citySeg = (cityKey.split('|')[1] || 'osaka').replace(/[^a-z]/gi, '');
  const cityEn = citySeg ? citySeg.charAt(0).toUpperCase() + citySeg.slice(1) : 'Osaka';

  const snapRes = await sb.from('snapshot').select('*')
    .eq('target_code', target).eq('market', market).eq('city_key', cityKey)
    .order('ym', { ascending: false });
  if (snapRes.error) throw snapRes.error;
  const snaps = snapRes.data || [];
  const ym = String(req.query.ym || (snaps[0] && snaps[0].ym) || '');
  const snap = snaps.find((s) => s.ym === ym) || null;

  // ── 캐시: 이 도시·조사버전이 이미 계산돼 있으면 무거운 재계산 없이 그대로 준다 ──
  //   버전 = 조사(snapshot) 상태. 새 측정이 있으면 버전이 바뀌어 자동 재계산. 그 외엔 6시간 캐시.
  const cacheVer = snap ? `${snap.id}|${snap.finished_at || ''}|${snap.trend_calls || 0}|${snap.status}` : `none|${ym}`;
  const nocache = req.query.nocache === '1';
  if (!nocache) {
    try {
      const { data: cached } = await sb.from('survey_cache')
        .select('version, payload, computed_at')
        .eq('city_key', cityKey).eq('target_code', target).eq('market', market).maybeSingle();
      const fresh = cached && cached.version === cacheVer && cached.payload &&
        (Date.now() - new Date(cached.computed_at).getTime() < 6 * 3600 * 1000);
      if (fresh) {
        res.setHeader('Cache-Control', 'private, no-store, max-age=0');
        return res.status(200).json({ ...cached.payload, is_admin: !!who.isAdmin, cached: true });
      }
    } catch { /* 캐시 없으면 계산 */ }
  }

  const kwRes = await sb.from('keyword')
    .select('id, text, kind, alive, alive_source, morph_axis, is_anchor, axis')
    .eq('target_code', target).eq('market', market).eq('city_key', cityKey);
  if (kwRes.error) throw kwRes.error;
  const kws = kwRes.data || [];

  let trends = [];
  if (snap) {
    const tRes = await sb.from('trend')
      .select('keyword_id, measured, demand, competition, opportunity, skip_reason, batch_no, calib_ratio, comp_method, comp_window_days, demand_source, measured_at, series')
      .eq('snapshot_id', snap.id);
    if (tRes.error) throw tRes.error;
    trends = tRes.data || [];
  }
  const tByKw = new Map(trends.map((t) => [t.keyword_id, t]));
  const merge = (k) => ({ ...k, ...(tByKw.get(k.id) || { measured: false, demand: null }) });

  const alive = kws.filter((k) => k.alive);
  const joinedAlive = alive.filter((k) => k.kind === 'joined');
  const spacedByFlat = new Map(alive.filter((k) => k.kind !== 'joined')
    .map((k) => [k.text.replace(/\s+/g, ''), k]));

  // 1층 — 센다. 박지 않는다.
  const counts = {
    found: kws.length,
    alive: alive.length,
    dead: kws.length - alive.length,
    pairs: joinedAlive.length,
    pairs_orphan: joinedAlive.filter((j) => !spacedByFlat.has(j.text)).length,
    measured: trends.filter((t) => t.measured).length,
    below_floor: trends.filter((t) => t.skip_reason === 'below_floor').length,
    stay: alive.filter((k) => k.axis !== 'travel').length,
    travel: alive.filter((k) => k.axis === 'travel').length,
  };

  // 2층 — 대표 검색어 (붙여쓰기는 짝 안으로) · 검색량 순 · 상위 30
  const joinedByFlat = new Map(joinedAlive.map((j) => [j.text, j]));
  const base = alive.filter((k) => k.kind !== 'joined' || !spacedByFlat.has(k.text));
  const build = (k) => {
    const r = merge(k);
    const j = k.kind === 'joined' ? null : joinedByFlat.get(k.text.replace(/\s+/g, ''));
    return {
      ...r,
      orphan_pair: k.kind === 'joined',      // 띄어쓰기 짝이 표에 없는 붙여쓰기
      joined: j ? merge(j) : null,
    };
  };
  const byDemand = (a, b) => (a.demand === null) - (b.demand === null) || (b.demand - a.demand);

  // 🔑 ㊿ 축 분리 (2026-07-17 대표님) — 순위·기회점수 무대는 **숙박 축만**.
  //    여행 축(오사카 여행 등)은 "언제 착수하나"를 정하는 배경이라 순위에 안 섞는다.
  //    버리는 게 아니다 — 아래 travel 로 따로 나가고, 태그란(⑬)에는 그대로 들어간다.
  const rows = base.filter((k) => k.axis !== 'travel').map(build).sort(byDemand);
  const travel = base.filter((k) => k.axis === 'travel').map(build).sort(byDemand);

  // 3층 — 조사가 2회 이상 쌓여야 "새로 생긴 / 사라진" 을 말할 수 있다
  const nextYm = (() => {
    if (!ym) return null;
    const [y, m] = ym.split('-').map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  })();
  const layer3 = snaps.length >= 2
    ? { locked: false, compared_to: snaps[1].ym }
    : { locked: true, reason: '조사가 아직 1번뿐입니다. 두 번째 조사가 있어야 새로 생긴·사라진 검색어를 압니다.', next_ym: nextYm };

  // 🔑 지역 축 (D-065 3-2) — 지역 **대표어 1개**("난바 호텔")로 지역 크기를 잰다.
  //
  // 🔴 지역 목록을 **어디서 가져오나** = D-065 가 이미 정해뒀다. 클로드가 안 읽고 박았다(2026-07-17).
  //    ① *"**지역 목록 미리 만들지 말 것. 재봐서 살아있는 것만 축으로.**"* (계층이 아니라 이름값이 가른다)
  //    ② *"**호텔 지역 판정 = 좌표**. 구글 플레이스로 주소·좌표 채움 → `hotels.district`"*
  //    → 지역 목록은 **우리 호텔 장부(hotels.district)** 에서 온다. 클로드 머릿속이 아니다.
  //    → `덴노지`·`도톤보리` 는 **장부에 호텔이 한 곳도 없다** — 클로드가 지어낸 것이다.
  //    → `요도야바시`(호텔 8곳)는 **장부에 있는데 화면에서 빠져 있었다.**
  // 🔴 `.not('district','is',null)` 로 걸러서 **지역 이름이 없는 호텔이 통째로 화면에서 사라졌다**
  //    (오사카 50곳 · 예약 146건 · 2026-07-17 대표님이 잡음). 그게 바로 **미개척 후보**다.
  //    전부 가져와서, 이름 없는 것은 **좌표로 묶어** 따로 보여준다.
  const dRes = await sb.from('hotels')
    .select('hotel_name, district, booking_count, published_at, latitude, longitude, star_rating, property_type, geo_status, address, operating_status')
    .eq('city', cityEn);
  if (dRes.error) throw dRes.error;
  const hotelsByD = new Map();
  (dRes.data || []).forEach((r) => {
    if (!r.district) return;
    if (!hotelsByD.has(r.district)) hotelsByD.set(r.district, []);
    hotelsByD.get(r.district).push(r);
  });
  const DISTRICTS = [...hotelsByD.keys()];

  // ── 도시 중심 · 반경 — **도시마다 데이터로 잰다** (2026-07-17 대표님: *"나라별 상황을 파악하여
  //    나라·도시 상황에 맞게 판별해서 적용"*). 🔴 한 숫자(예: 20km)를 박으면 그게 또 하드코딩이다.
  //
  //    실측 — 예약 90%가 드는 반경: 후쿠오카 1.3km · 오사카 2.9km · 타이베이 3.8km · 도쿄 5.3km · 방콕 5.9km
  //    → **후쿠오카와 방콕이 4.5배 다르다.** 20km 로 박으면 후쿠오카에서 15배 넓은 그물을 던진다.
  //
  //    중심 = **예약 가중 평균** (손님이 몰린 곳이 중심이지, 호텔이 많은 곳이 중심이 아니다)
  //    바깥 = 예약 90% 반경의 3배 초과 → "먼 곳"(오매칭 의심). 실측: 오사카 20km 초과 = 0곳,
  //           하코네에 있는 'Osaka Fujiya Hotel'(예약 28건)은 이미 manual_check 로 걸러져 있었다.
  const pts = (dRes.data || []).filter((r) => r.latitude && r.longitude && r.district);
  const bw = pts.reduce((s2, r) => s2 + (r.booking_count || 0), 0);
  const cLat = bw ? pts.reduce((s2, r) => s2 + Number(r.latitude) * (r.booking_count || 0), 0) / bw
                  : (pts.length ? pts.reduce((s2, r) => s2 + Number(r.latitude), 0) / pts.length : null);
  const cLng = bw ? pts.reduce((s2, r) => s2 + Number(r.longitude) * (r.booking_count || 0), 0) / bw
                  : (pts.length ? pts.reduce((s2, r) => s2 + Number(r.longitude), 0) / pts.length : null);
  const km = (la, lo) => {
    if (!cLat || !la) return null;
    const R = 6371, d2r = Math.PI / 180;
    return R * Math.acos(Math.min(1,
      Math.cos(cLat * d2r) * Math.cos(la * d2r) * Math.cos((lo - cLng) * d2r) +
      Math.sin(cLat * d2r) * Math.sin(la * d2r)));
  };
  // 이 도시에서 손님이 실제로 자는 반경 = 예약 90%가 드는 거리
  const r90 = (() => {
    const ds = pts.filter((r) => r.booking_count > 0)
      .map((r) => [km(Number(r.latitude), Number(r.longitude)), r.booking_count])
      .sort((a, b) => a[0] - b[0]);
    const tot = ds.reduce((s2, d) => s2 + d[1], 0);
    let cum = 0;
    for (const [d, w] of ds) { cum += w; if (cum >= tot * 0.9) return Math.round(d * 10) / 10; }
    return null;
  })();
  // 중심가/가까움 기준도 이 도시 반경에서 나온다. 박지 않는다.
  const zoneOf = (d) => {
    if (d === null || !r90) return null;
    if (d <= r90 * 0.5) return '중심가';
    if (d <= r90) return '가까움';
    return d <= r90 * 3 ? '외곽' : '먼 곳';
  };
  const anchorDemand = (() => {
    const a = alive.find((k) => k.is_anchor);
    const t = a && tByKw.get(a.id);
    return t && t.demand ? Number(t.demand) : null;
  })();
  // 🔑 **분모** — 아고다 재고(D-065 63 · 2026-07-17 대표님이 파트너센터 「숙소 데이터 파일」을 찾음)
  //    우리 `hotels` 표는 **「예약이 붙은 호텔」만**이라 분모가 없었다.
  //    실측: 아고다 오사카 **12,328곳** · 우리 장부 **255곳** = **2.1%**. 우리는 오사카의 2%만 보고 있었다.
  //    파일에 좌표가 100% 있어 **구글 Places 없이** 지역 반경으로 센다.
  // 🔴 2026-07-17 — Supabase 는 **기본 1,000행**만 준다. 12,328 을 물었는데 1,000 이 와서
  //    분모가 **12배 작게** 나왔다(난바 157 vs 진짜 1,677). 화면이 도시를 작게 말했다(55 의 그 병).
  //    → 1,000씩 끊어서 **다 받는다.** "받은 게 전부"라고 믿지 않는다.
  const inv = [];
  // 지역(district) 데이터가 있는 도시만 분모를 잰다. 없는 도시는 이 무거운 스캔을 통째로 건너뛴다(속도).
  if (DISTRICTS.length) {
    const { data: agc } = await sb.from('agoda_city').select('city_id').eq('city', cityEn).limit(1);
    const invCityId = agc && agc.length ? agc[0].city_id : null;
    if (invCityId != null) {
      for (let from = 0; from < 20000; from += 1000) {
        const p = await sb.from('agoda_inventory')
          .select('latitude, longitude')
          .eq('city_id', invCityId)
          .not('latitude', 'is', null)
          .range(from, from + 999);
        if (p.error) break;
        (p.data || []).forEach((r) => inv.push([Number(r.latitude), Number(r.longitude)]));
        if (!p.data || p.data.length < 1000) break;
      }
    }
  }
  const kmAt = (la1, lo1, la2, lo2) => {
    const R = 6371, d = Math.PI / 180;
    return R * Math.acos(Math.min(1,
      Math.cos(la1 * d) * Math.cos(la2 * d) * Math.cos((lo2 - lo1) * d) + Math.sin(la1 * d) * Math.sin(la2 * d)));
  };
  // 지역 반경 800m 안의 아고다 재고를 센다. **목록을 적지 않는다. 센다**(54-0V)
  const invNear = (la, lo, r = 0.8) => (la === null ? null : inv.filter(([a, b]) => kmAt(la, lo, a, b) <= r).length);

  const districts = DISTRICTS.map((name) => {
    const hs = hotelsByD.get(name) || [];
    const head = alive.find((k) => k.text === `${name} 호텔`);
    const t = head && tByKw.get(head.id);
    const d = t && t.demand !== null && t.demand !== undefined ? Number(t.demand) : null;
    const bookings = hs.reduce((s2, r) => s2 + (r.booking_count || 0), 0);
    const geo = hs.filter((r) => r.latitude);
    const dist = geo.length ? geo.reduce((s2, r) => s2 + km(Number(r.latitude), Number(r.longitude)), 0) / geo.length : null;
    const cLa = geo.length ? geo.reduce((s2, r) => s2 + Number(r.latitude), 0) / geo.length : null;
    const cLo = geo.length ? geo.reduce((s2, r) => s2 + Number(r.longitude), 0) / geo.length : null;
    const total = invNear(cLa, cLo);          // 이 지역에 아고다가 파는 숙소 전체
    return {
      name,
      agoda_total: total,                     // 분모
      share: total ? Math.round(hs.length / total * 1000) / 10 : null,   // 우리가 아는 비율 %
      undiscovered: total === null ? null : Math.max(0, total - hs.length),
      head: head ? head.text : `${name} 호텔`,
      hotels: hs.length,                                   // 우리 장부에 그 지역 호텔이 몇 곳 (좌표 판정)
      published: hs.filter((r) => r.published_at).length,  // 그중 영상으로 소개한 곳
      bookings,                                            // 🔑 손님이 실제로 잔 곳 = 이게 순서 기준
      km: dist === null ? null : Math.round(dist * 10) / 10,
      zone: zoneOf(dist),        // 이 도시 반경(r90) 기준. 도시마다 다르다
      surveyed: !!head,                                    // 대표어가 검색어 표에 있나
      // ⑤ 지역 수요 트렌드 — 이 지역 대표어의 월별 시계열(㊾ trend.series). 🔴 옛 화면은 3개 도시를 코드에 박아뒀다
      series: (t && t.series) || null,
      // 🔑 이 지역 검색어 — **그 지역 이름이 든 검색어만**. (2026-07-17 대표님)
      //   🔴 옛 화면 4-4 는 `svCity()` 가 오사카로 박혀 있어 **난바를 눌러도 오사카 검색어 75개 전부**를 그렸다.
      //      화면 다른 곳은 전부 난바를 말하는데 여기만 도시를 말했다 = 대표님이 어느 게 난바 숫자인지 매번 구분해야 했다.
      //   판정은 **이름 포함**이다. 지역 목록을 따로 적지 않는다(54-0V — 목록은 세는 것).
      keywords: alive.filter((k) => k.text.indexOf(name) >= 0).map((k) => {
        const t2 = tByKw.get(k.id);
        return { text: k.text, axis: k.axis,
          demand: t2 && t2.demand !== null && t2.demand !== undefined ? Number(t2.demand) : null,
          competition: t2 ? t2.competition : null,
          opportunity: t2 && t2.opportunity !== null && t2.opportunity !== undefined ? Number(t2.opportunity) : null,
          measured: !!(t2 && t2.measured), skip_reason: t2 ? t2.skip_reason : null };
      }).sort((a, b) => (b.demand || -1) - (a.demand || -1)),
      demand: d,
      measured: !!(t && t.measured),
      skip_reason: t ? t.skip_reason : null,
      vs_city: (d && anchorDemand) ? Math.round(anchorDemand / d) : null,
    };
    // 🔑 순서 = **예약순**(2026-07-17 대표님). 검색량순이 아니다.
    //    "여행객은 중심가에 묵는데 콘텐츠 만드는 사람은 중심가를 잘 모른다" —
    //    검색량은 **만드는 사람이 아는 이름**이고, 예약은 **손님이 실제로 자는 곳**이다.
    //    실측: 신사이바시 예약 131건인데 검색량 0.39 라 검색량순에선 우메다(50건)보다 아래였다.
  }).sort((a, b) => b.bookings - a.bookings || (b.hotels - a.hotels));

  // ── 미개척 후보 = **지역 이름이 아직 없는 호텔** (2026-07-17 대표님)
  //    지역 판정이 「사람이 그린 원 5개」라 그 밖은 전부 이름이 없다. 버리지 않는다.
  //
  // 🔑 대표님: *"이름이 없는 곳, **구글 주소로 정리해 보면 되는 거 아니야?**"* — 맞다.
  //    클로드는 **호텔 이름**을 보느라 **주소를 안 봤다.** 주소에 구·동네가 이미 다 있다:
  //      "2-chōme-4-19 **Daikoku**, **Naniwa Ward**, Osaka, 556-0014, Japan"
  //    → 구(Ward) = 그 호텔이 실제로 있는 지역. 사람이 안 그린다. 구글이 준다. 전 세계 공통.
  // 지역 이름 사전 — 타겟(언어+시장)마다 다르다 (D-065 60). 없으면 원래 이름 그대로.
  const aliasRes = await sb.from('city_alias')
    .select('city_key, label')
    .eq('target_code', target)
    .like('city_key', `cc:japan|osaka|%`);      // d: 구 · t: 동네 — 둘 다
  // 🔴 사전 열쇠는 `Naniwa Ward`(구글 주소 그대로), 여기 이름은 `Naniwa`(구만 뽑은 것) — 어긋난다.
  //    둘 다로 찾는다. 없으면 **원래 이름 그대로**(지어내지 않는다).
  const alias = new Map((aliasRes.data || [])
    .map((r) => [r.city_key.split('|d:')[1] || r.city_key.split('|t:')[1], r.label])
    .filter((x) => x[0]));
  const say = (n) => alias.get(n) || alias.get(`${n} Ward`) || n;

  const noName = (dRes.data || []).filter((r) => !r.district);
  const wardOf = (a) => (a && (a.match(/([A-Za-z]+) Ward/) || [])[1]) || null;
  const townOf = (a) => (a && (a.match(/(?:ch(?:ō|o)me-[\d-]+ |^[\d-]+ )([A-Za-zōūā-]+),/) || [])[1]) || null;

  // 🔴 주소는 있는데 「구」가 없는 것 = **이 도시가 아닐 수 있다.**
  //    실측: `Osaka Fujiya Hotel`(예약 28건) 주소 = "256-1 Yumoto, **Hakone, Ashigarashimo District,
  //    Kanagawa** 250-0392, Japan" → **하코네다. 오사카가 아니다.** 아고다 이름 오매칭.
  //    → 「이 도시 아님」으로 갈라낸다. 미개척 후보에 섞으면 없는 지역을 개척하러 간다.
  const cityInAddr = (a) => !!(a && /Osaka/i.test(a));
  const byWard = new Map();
  noName.forEach((r) => {
    const w = wardOf(r.address);
    let key;
    if (w) key = w;
    else if (!r.address) key = '(주소 없음)';
    else if (!cityInAddr(r.address)) key = '(이 도시 아님)';
    else key = '(구 없음)';
    if (!byWard.has(key)) byWard.set(key, []);
    byWard.get(key).push(r);
  });
  const unmapped = [...byWard.entries()].map(([ward, hs]) => {
    const wardLabel = ward.charAt(0) === '(' ? ward : say(ward);
    const geo = hs.filter((r) => r.latitude);
    const d = geo.length ? geo.reduce((s2, r) => s2 + km(Number(r.latitude), Number(r.longitude)), 0) / geo.length : null;
    const towns = [...new Set(hs.map((r) => townOf(r.address)).filter(Boolean))];
    const top = [...hs].sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0))[0];
    return {
      ward: wardLabel,                               // 구 — 구글 주소에서 오고, 이름은 타겟 언어(city_alias)
      ward_src: ward,                                // 원본(영어) — 덮어쓰지 않는다
      towns: towns.slice(0, 4).map(say),             // 동네 — 타겟 언어(city_alias)
      towns_src: towns.slice(0, 4),                  // 원본(영어) — 안 덮어쓴다
      hotels: hs.length,
      bookings: hs.reduce((s2, r) => s2 + (r.booking_count || 0), 0),
      published: hs.filter((r) => r.published_at).length,
      km: d === null ? null : Math.round(d * 10) / 10,
      zone: zoneOf(d),
      top_hotel: top ? top.hotel_name : null,
      no_geo: hs.filter((r) => !r.latitude).length,
      wrong_city: ward === '(이 도시 아님)',
      sample_addr: (hs.find((r) => r.address) || {}).address || null,
    };
  }).sort((a, b) => b.bookings - a.bookings);
  // 🔴 2026-07-17 대표님: *"이거는 여기 넣으면 안 되는 거 아니야? 오사카 근교 이런 곳 아니야?"*
  //    맞다. 하코네는 오사카에서 **327km**(서울↔부산과 같다) — **도쿄 근교**(84km)다. 근교가 아니다.
  //    그리고 이건 **개척할 곳이 아니라 고칠 것**이다. 미개척 목록은 "만들 것"이고 오매칭은 "데이터 오류"다.
  //    섞으면 화면이 **없는 지역을 개척하라**고 말한다. → 목록에서 빼고 **경고로 따로** 낸다.
  // 🔴 2026-07-17 대표님: *"(주소 없음) 이 부분은 뭐야?"*
  //    = 구글이 이름으로 **못 찾은 호텔**(geo_status='not_found'). 어디인지 **모른다.**
  //    실측: `Agora Place Osaka Namba`(7건) · `ibis Styles Osaka Namba`(1건) ·
  //          `Close to Shin-Imamiya Stn, 2 ppl, perfect…`(1건 — **호텔 이름이 아니라 광고 문구**)
  //    → **개척할 수 없다. 어디인지 모르니까.** 미개척(만들 것)이 아니라 **고칠 것**이다(57 룰).
  //       목록 하나에 행동 하나. 대표님이 보고 할 수 있는 게 없으면 그 목록에 있으면 안 된다.
  const fixLater = unmapped.filter((c) => c.wrong_city || c.ward === '(주소 없음)');
  const wrongCity = unmapped.filter((c) => c.wrong_city);
  const noAddr = unmapped.filter((c) => c.ward === '(주소 없음)');
  const unmappedClean = unmapped.filter((c) => !c.wrong_city && c.ward !== '(주소 없음)');
  const noGeo = noName.filter((r) => !r.latitude);

  // 🔴 폐업 호텔 — **콘텐츠로 만들면 예약이 0**이다. 만들 것에서 뺀다 (2026-07-17 대표님이 구글에서 찾음)
  //    `ibis Styles Osaka Namba` · `Agora Place Osaka Namba` 둘 다 폐업인데 우리 장부는 `active` 였다.
  const closedHotels = (dRes.data || []).filter((r) => r.operating_status && r.operating_status !== 'active');
  const closed = closedHotels.length ? {
    hotels: closedHotels.length,
    bookings: closedHotels.reduce((s2, r) => s2 + (r.booking_count || 0), 0),
    names: closedHotels.map((r) => `${r.hotel_name}${r.operating_status === 'temp_closed' ? ' (임시휴업)' : ''}`),
  } : null;

  // ── 지역 세부 재료 (D-065 65 · 대표님 2026-07-17) — **뷰가 세어서 준다. 화면은 그리기만.**
  //   ① 성급 분포 — 이 지역에 뭐가 있나 / 우리가 뭘 아나 / 뭐가 팔리나
  //      🚨 실측(난바): 3성이 964곳(58%)인데 예약은 4성에서 62% 난다. **미개척 1,569곳 중 1,373곳이 3성·무성급이다.**
  //      「미개척 1,569곳」만 말하면 대표님이 3성 964곳을 쫓게 된다.
  //   ② 12개월 흐름 — **여행(체크인) 월**. 🔴 검색 피크와 다르다: 난바 검색 11월 · 예약 12월(리드타임 27일)
  //   ③ 예약 패턴 — 리드타임·숙박일수. 🔴 옛 4-1 은 **오사카 도시 값(22일)을 난바 자리**에 쓰고 있었다
  //   ④ 체크아웃 월 — 대표님이 두 번 요청하셨다. 겹쳐 그리면 막대에 포개지지만(달 넘김 45/590),
  //      **보고 판단하시는 건 대표님 몫**이다. 클로드가 답을 안 받고 뺐던 자리(2026-07-17 자진 신고).
  const [starRes, monRes, patRes, outRes, rankRes] = await Promise.all([
    sb.from('v_district_star').select('district, star, agoda_total, ours, bookings').eq('city', cityEn),
    sb.from('v_district_month').select('district, month, star, bookings').eq('city', cityEn),
    sb.from('v_district_pattern').select('*').eq('city', cityEn),
    sb.from('v_district_month_out').select('district, month, bookings').eq('city', cityEn),
    //   ⑤ 호텔 매출 순위 (2026-07-17 대표님) — **수수료는 담지 않는다.**
    //      대표님: *"에디터는 수수료는 못 보는 거 아니야? 호텔 예약액은 알아야 더 고민할 수 있지 않을까?"*
    //      → 예약금액(매출) + 예약건수만. 🔴 뷰(`v_district_hotel_rank`)에 **수수료 칸이 아예 없다.**
    //         안 보내면 샐 수가 없다. 화면에서 가리는 것보다 창구에서 안 담는 게 안전하다.
    //      호텔명 = 아고다 파일의 한국어 이름, **없으면 원래 이름 그대로**(대표님 확정).
    //         🔴 클로드가 번역해서 채우지 않는다 — 그게 지어내기다(61).
    //   🔑 갈래(bucket) — 대표님 2026-07-17: *"취소되어서 매출이 없다고 하더라도 표시는 되어야 됨.
    //      그 호텔을 눌렀을 때 **우리한테 예약했다가 취소했구나**. 이것도 정보니깐."*
    //      revenue(매출 남) / cancelled_only(예약 왔다가 전부 취소) / no_booking(장부에만)
    //      🔴 두 블록은 **다른 물건**이다. 섞지 않는다:
    //         4-4b 매출 순위 = **돈** → `bucket='revenue'` 만
    //         4-14 호텔 목록 = **장부** → 전부, 갈래로 갈라서
    //      실측(난바 108곳): 매출 86 · 취소만 21 · 예약없음 1
    //   🔒 `cooldown` = 183일 안에 소개한 곳(D-065 ㊷ · 6개월 재소개 금지) / 💰 `paid` = $200 계약(쿨다운 아님 — 정반대)
    //      🔴 2026-07-17 실측: 둘 다 **재료가 0**이다. `published_at` 0곳 · `paid_at` 0곳.
    //         → 배지는 **조건부**다. 지금은 안 뜬다. **노출 이력 파일이 들어오면 저절로 뜬다.** 가짜로 채우지 않는다.
    //   🔴 2026-07-17 — **D-062(호텔 메뉴)를 안 읽고 만들어서 두 개를 틀렸다.** 대표님이 잡으심.
    //      ① 열쇠: D-062 = *"노출 이력 = **publications** ↔ hotels(hid), 정확한 published_at"*.
    //         클로드는 `hotels.published_at` 을 썼다. 지금은 둘 다 0이라 결과가 같지만
    //         **노출 이력 파일이 들어오면 클로드 열쇠는 안 켜진다.** → `publications.hid_top1/2/3` 로 고침.
    //      ② **확정률 배지**(D-062 ⑤-3): 안정 ≥85 / 보통 70~84 / 주의 50~69 / 경고 <50.
    //         *"주의 = TOP3 넣을 때 취소 유출 감안"* — 실측: 리치몬드 난바 **53%**(21/40). 절반이 날아간다.
    //      ③ 재사용 상태 이름도 D-062 것: **아직못씀 / 지금가능 / 노출없음**. 클로드가 지어내지 않는다.
    //   🔑 `grade` = **성급 내림**(3.5→3 · 4.5→4). 대표님 2026-07-17:
    //      *"3.5성급이지만 3성급으로 소개함. 소비자 입장에서는 3.5성급이 더 좋지만 3성급이 원래 낫은데
    //        더 좋은 곳을 3성급으로 소개하니깐 사람들이 예약을 함. 3.5성급을 4성급이라고 소개하면 실망하잖아."*
    //      → **기대보다 좋게** 만든다. 반올림하면 기대보다 나빠진다. **3.5성 추천 같은 건 없다.**
    //      화면·창구가 같은 값을 쓰도록 **뷰가 `grade` 를 준다.** 화면에서 floor 하지 않는다.
    sb.from('v_district_hotel').select('district, star, grade, name, name_is_ko, ptype, confirmed, cancelled, confirm_rate, revenue, bucket, reuse, reuse_from, paid').eq('city', cityEn),
  ]);
  // 🔑 「이미 전략에 넘겼나」 (2026-07-17 대표님) — **화면이 기억하지 않는다. 창구가 센다.**
  //    새로고침해도, 다른 사람이 봐도 남아야 한다. 열쇠 = 도시 + 주제(제목).
  //    🔴 큐는 **전략 메뉴가 갖는다**(D-065 0-H). 키워드는 **상태만 보여주고 이동**시킨다 — 큐를 여기 두지 않는다.
  //    D-066 확정: 기획자(planner) = [＋ 전략으로] 누른 사람 자동. 원고 담당은 전략 메뉴에서 지정/맡기.
  const qRes = await sb.from('content_queue')
    .select('id, code, stage, title, star, planner_email, target_month, created_at')
    .eq('city', cityEn).order('created_at', { ascending: false });
  const queued = {};
  (qRes.data || []).forEach((r) => {
    const k = String(r.title || '');
    if (!queued[k]) queued[k] = { code: r.code, stage: r.stage, planner: r.planner_email, target_month: r.target_month, count: 0 };
    queued[k].count += 1;
  });

  const dstat = {};
  const touch = (d) => (dstat[d] = dstat[d] || { stars: [], months: [], months_out: [], pattern: null, hotels: [] });
  (starRes.data || []).forEach((r) => {
    if (!r.agoda_total && !r.ours) return;          // 없는 성급 줄을 만들지 않는다
    touch(r.district).stars.push({ star: Number(r.star), agoda_total: r.agoda_total, ours: r.ours, bookings: r.bookings });
  });
  (monRes.data || []).forEach((r) => touch(r.district).months.push({ month: r.month, star: Number(r.star), bookings: r.bookings }));
  (outRes.data || []).forEach((r) => touch(r.district).months_out.push({ month: r.month, bookings: r.bookings }));
  (rankRes.data || []).forEach((r) => touch(r.district).hotels.push({
    star: Number(r.grade), star_real: Number(r.star), name: r.name, name_is_ko: !!r.name_is_ko, ptype: r.ptype,
    bookings: r.confirmed, cancelled: r.cancelled, confirm_rate: r.confirm_rate,
    revenue: Number(r.revenue), bucket: r.bucket,
    reuse: r.reuse, reuse_from: r.reuse_from, paid: !!r.paid }));
  Object.values(dstat).forEach((v) => v.hotels.sort((a, b) => b.revenue - a.revenue || b.cancelled - a.cancelled));
  (patRes.data || []).forEach((r) => { touch(r.district).pattern = r; });

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const __payload = {
    ok: true, is_admin: !!who.isAdmin, view: 'survey',
    queued,                      // 주제 → {code, stage, planner, target_month, count}
    district_stats: dstat,
    target, market, city_key: cityKey, ym,
    snapshot: snap, months: snaps.map((s) => s.ym),
    counts, rows: rows.slice(0, 30), rows_total: rows.length, travel, districts,
    city_radius: { r90, hotels_with_geo: pts.length },   // 이 도시에서 손님이 자는 반경
    // 도시 대표어 시계열 — 지역 선과 겹쳐 그린다(⑤). 지역 계절 ≠ 도시 계절을 눈으로 본다
    city_series: (() => { const a = alive.find((k) => k.is_anchor) || alive.find((k) => k.text === (snap && snap.anchor_text));
      const t2 = a && tByKw.get(a.id); return (t2 && t2.series) || null; })(),
    city_anchor_text: (snap && snap.anchor_text) || null,
    // 🔑 도시 분모 — 아고다가 이 도시에서 파는 숙소 전체
    // 🔑 도시 재고 한 줄의 재료 — 화면은 `stk()` 한 함수로만 그린다(형태 통일 · 대표님 2026-07-17)
    city_inventory: { agoda_total: inv.length, ours: (dRes.data || []).length,
      share: inv.length ? Math.round((dRes.data || []).length / inv.length * 1000) / 10 : null,
      bookings: (dRes.data || []).reduce((s2, r) => s2 + (r.booking_count || 0), 0),
      published: (dRes.data || []).filter((r) => r.published_at).length },
    unmapped: unmappedClean,                             // 미개척 후보 = **만들 것** (오매칭은 뺐다)
    unmapped_total: {
      hotels: unmappedClean.reduce((s2, c) => s2 + c.hotels, 0),
      bookings: unmappedClean.reduce((s2, c) => s2 + c.bookings, 0),
    },
    closed,                                              // 폐업 = 만들면 안 되는 곳
    // 주소를 못 찾은 곳 = **고칠 것**. 어디인지 모르니 개척할 수 없다
    no_address: noAddr.length ? {
      hotels: noAddr.reduce((s2, c) => s2 + c.hotels, 0),
      bookings: noAddr.reduce((s2, c) => s2 + c.bookings, 0),
      // 🔴 덩어리마다 대표 1개만 담으면 3곳 중 1개만 보인다 — 전부 담는다
      names: noName.filter((r) => !r.address).map((r) => r.hotel_name),
    } : null,
    // 오매칭 = **고칠 것**. 미개척과 섞지 않는다
    wrong_city: wrongCity.length ? {
      hotels: wrongCity.reduce((s2, c) => s2 + c.hotels, 0),
      bookings: wrongCity.reduce((s2, c) => s2 + c.bookings, 0),
      sample_addr: (wrongCity[0] || {}).sample_addr || null,
      top_hotel: (wrongCity[0] || {}).top_hotel || null,
    } : null,
    layer3,
  };
  // 계산 결과를 캐시에 저장(다음 조회는 즉시). is_admin 은 사용자마다 달라 캐시엔 그대로 두고, 반환 시 덮어쓴다.
  try {
    await sb.from('survey_cache').upsert({
      city_key: cityKey, target_code: target, market,
      version: cacheVer, payload: __payload, computed_at: new Date().toISOString(),
    }, { onConflict: 'city_key,target_code,market' });
  } catch { /* 캐시 저장 실패해도 응답은 준다 */ }
  return res.status(200).json(__payload);
}

// ── view=cities — **나라·도시 목록을 DB 가 준다** (2026-07-17 · D-065 64)
//   🔴 옛 화면은 `CT={'일본':['오사카','도쿄','후쿠오카'],…}` 를 **코드에 박아뒀다.**
//      실측: 우리가 예약을 받은 일본 도시는 **35곳**이다. 화면은 3곳만 보여주고 **감췄다고 말하지도 않았다**(54-0V).
//   🔑 분모 = `v_city_inventory` → `agoda_city_name(target_code)` = **그 언어 파일 기준 개수**.
//      ⚠️ `agoda_city.hotels` 를 쓰면 안 된다 — **EN 기준**이라 오사카가 5,419(진짜 12,328)로 절반이 된다.
async function cities(sb, req, res, who) {
  const target = String(req.query.target || 'ko');
  const market = String(req.query.market || 'KR');
  const curYm = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);

  // 독립 쿼리 5개를 «동시에» 실행 (전엔 하나씩 기다려 합이 3초+ → 이제 가장 느린 것 하나만큼)
  const invP = (async () => {
    const rr = [];
    for (let from = 0; from < 4000; from += 1000) {
      const p = await sb.from('v_city_inventory')
        .select('city_id, city, country, agoda_total, ours, bookings, published, geo_ok, has_detail')
        .eq('target_code', target).order('bookings', { ascending: false }).range(from, from + 999);
      if (p.error) throw new Error(p.error.message);
      (p.data || []).forEach((r) => rr.push(r));
      if (!p.data || p.data.length < 1000) break;   // 「받은 게 전부」라고 믿지 않는다(63)
    }
    return rr;
  })();
  const [rows, aliasesR, snaps2R, hprogR, kwcR] = await Promise.all([
    invP,
    sb.from('city_alias').select('label, city_key').eq('target_code', target).not('city_key', 'like', '%|d:%').not('city_key', 'like', '%|t:%'),
    sb.from('snapshot').select('city_key, status, acknowledged_at, finished_at, ym').eq('target_code', target).eq('market', market),
    sb.from('v_city_hotel_progress').select('city, total, with_district'),
    sb.from('keyword').select('city_key').eq('target_code', target).eq('alive', true),
  ]);
  const aliases = aliasesR.data, snaps2 = snaps2R.data, hprog = hprogR.data, kwc = kwcR.data;

  const keyByLabel = {};
  for (const a of aliases || []) { if (a.label && !keyByLabel[a.label]) keyByLabel[a.label] = a.city_key; }

  const snapByKey = {};      // 이번 달 snapshot만
  const surveyedAt = {};     // city_key → 마지막 조사 완료일(아무 달이나 최신)
  for (const s of snaps2 || []) {
    if (s.ym === curYm) snapByKey[s.city_key] = s;
    if (s.finished_at && (!surveyedAt[s.city_key] || s.finished_at > surveyedAt[s.city_key])) surveyedAt[s.city_key] = s.finished_at;
  }

  const normCity = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '').replace(/city$/, '');
  const hotelByNorm = {};
  for (const h of hprog || []) { hotelByNorm[normCity(h.city)] = { total: h.total || 0, with: h.with_district || 0 }; }
  const hotelOf = (ckey) => hotelByNorm[normCity((ckey || '').split('|')[1] || '')] || null;

  const kwByKey = {};
  for (const k of kwc || []) { kwByKey[k.city_key] = (kwByKey[k.city_key] || 0) + 1; }
  const progress = (ckey) => {
    const hp = hotelOf(ckey);
    return {
      keywords: kwByKey[ckey] || 0,
      hotel_total: hp ? hp.total : null,
      hotel_district: hp ? hp.with : null,
    };
  };
  //   state: none(미조사) · running(예약·봇이 채우는 중) · new_done(새로 완성·확인 대기) · done(완성·확인됨)
  const stateOf = (cityKey) => {
    if (!cityKey) return 'none';
    const s = snapByKey[cityKey];
    if (!s) return 'running';                 // 발굴만 됨(city_alias 있음) · 아직 측정 스냅샷 없음 = 봇 대기
    if (s.status !== 'done') return 'running';
    return s.acknowledged_at ? 'done' : 'new_done';
  };
  let newDoneCount = 0;
  const newDoneList = [];
  const runningList = [];   // 채우는 중(예약·봇 작업)
  const doneList = [];      // 완성·확인됨

  const byCountry = new Map();
  rows.forEach((r) => {
    const c = r.country || '기타';
    if (!byCountry.has(c)) byCountry.set(c, { country: c, bookings: 0, ours: 0, agoda_total: 0, cities: [] });
    const g = byCountry.get(c);
    g.bookings += r.bookings || 0; g.ours += r.ours || 0; g.agoda_total += r.agoda_total || 0;
    const ckey = keyByLabel[r.city] || null;
    const state = stateOf(ckey);
    if (state === 'new_done') { newDoneCount += 1; newDoneList.push({ name: r.city, country: c, city_key: ckey, surveyed_at: surveyedAt[ckey] || null, ...progress(ckey) }); }
    else if (state === 'running') { runningList.push({ name: r.city, country: c, city_key: ckey, surveyed_at: surveyedAt[ckey] || null, ...progress(ckey) }); }
    else if (state === 'done') { doneList.push({ name: r.city, country: c, city_key: ckey, surveyed_at: surveyedAt[ckey] || null, ...progress(ckey) }); }
    g.cities.push({
      city_id: r.city_id, name: r.city,
      city_key: ckey,
      surveyed: !!ckey,                           // 조사 착수(발굴)된 도시
      survey_state: state,                        // none·running·new_done·done
      surveyed_at: surveyedAt[ckey] || null,      // 마지막 조사 완료일(조사일 표시용)
      agoda_total: r.agoda_total,
      ours: r.ours,
      share: r.agoda_total ? Math.round(r.ours / r.agoda_total * 1000) / 10 : null,
      undiscovered: r.agoda_total ? Math.max(0, r.agoda_total - r.ours) : null,
      bookings: r.bookings, published: r.published,
      has_detail: !!r.has_detail,
    });
  });
  const list = [...byCountry.values()].sort((a, b) => b.bookings - a.bookings);
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.status(200).json({
    ok: true, view: 'cities', target,
    new_done: newDoneCount,                         // 새로 완성·확인 대기 도시 수 (배지)
    new_done_list: newDoneList,                      // 그 도시들 [{name, country, city_key}]
    running_list: runningList,                       // 채우는 중(예약·봇 작업)
    done_list: doneList,                             // 완성·확인됨
    survey_counts: { running: runningList.length, new_done: newDoneCount, done: doneList.length },
    countries: list,
    totals: { countries: list.length, cities: rows.length,
      agoda_total: rows.reduce((s2, r) => s2 + (r.agoda_total || 0), 0),
      ours: rows.reduce((s2, r) => s2 + (r.ours || 0), 0),
      detail_cities: rows.filter((r) => r.has_detail).length },
  });
}

// ── view=targets — **타겟 목록은 채널이 만든다** (D-065 확정 · 2026-07-17 대표님 A안)
//   *"타겟 = 언어 + 시장. 채널은 축이 아니다. 타겟 목록 = `channels.language` 자동 생성(하드코딩 금지)."*
//   🔴 대표님 근거: *"한국어는 한국 사람의 타겟인데 키워드 똑같을 거잖아."*
//      채널로 쪼개면 **같은 조사를 3번**(한국어 채널 3개) 하고 앵커 잣대(⑪)가 깨진다.
//   🔴 A안(대표님 확정): **조사 안 된 타겟도 보인다.** 일본어 채널(ホテルだ)이 예약 462건을 받는데
//      조사가 **0건**이다 — 안 보여주면 **모른다는 사실 자체가 화면에서 사라진다.**
//   🔴 시장(market)은 **채널에 칸이 없다**(D-065 284줄이 이미 지적). 조사가 있는 타겟은 조사에서 읽고,
//      없으면 **`null` — 「시장 미정」이라고 말한다. 지어내지 않는다.**
const LANG_NAME = {           // 코드 → 사람 말. **목록이 아니라 표기 번역**이다(목록은 channels 가 만든다)
  ko: '한국어', ja: '일본어', en: '영어', vi: '베트남어',
  'zh-tw': '중국어 번체', 'zh-cn': '중국어 간체', th: '태국어', id: '인도네시아어',
};
const MARKET_NAME = { KR: '한국', JP: '일본', TW: '대만', VN: '베트남', US: '미국', GLOBAL: '전세계' };

async function targets(sb, req, res) {
  const [chRes, kwRes, snRes] = await Promise.all([
    sb.from('channels').select('code, name, language, market, is_active').eq('is_active', true),
    sb.from('keyword').select('target_code'),
    sb.from('snapshot').select('target_code, market, ym'),
  ]);
  if (chRes.error) throw new Error(chRes.error.message);

  const kwCount = {};
  (kwRes.data || []).forEach((r) => { kwCount[r.target_code] = (kwCount[r.target_code] || 0) + 1; });
  const mk = {};
  (snRes.data || []).forEach((r) => { if (!mk[r.target_code]) mk[r.target_code] = r.market; });

  const byLang = new Map();
  (chRes.data || []).forEach((c) => {
    const l = c.language;
    if (!byLang.has(l)) byLang.set(l, { code: l, channels: [], keywords: 0, market: null });
    byLang.get(l).channels.push(c.name);
    if (!byLang.get(l).market && c.market) byLang.get(l).market = c.market;  // 채널이 정한 시장(대표님이 §0/편집에서 지정)
  });
  const list = [...byLang.values()].map((t) => {
    t.keywords = kwCount[t.code] || 0;
    t.market = mk[t.code] || t.market || null;           // 조사 우선, 없으면 채널이 정한 시장
    t.label = (LANG_NAME[t.code] || t.code) + ' · ' + (t.market ? (MARKET_NAME[t.market] || t.market) : '시장 미정');
    t.surveyed = t.keywords > 0;
    return t;
  }).sort((a, b) => (b.surveyed - a.surveyed) || (b.channels.length - a.channels.length));

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.status(200).json({ ok: true, view: 'targets', targets: list });
}

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  // 확인 처리: 새로 완성된 도시를 "확인함"으로(배지에서 뺀다). POST ?action=ack (body city_key 없으면 전체).
  if (req.method === 'POST' && String(req.query.action || '') === 'ack') {
    let sbA; try { sbA = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }
    const target = String(req.query.target || 'ko');
    const market = String(req.query.market || 'KR');
    let body = {};
    try { body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}'); } catch { body = {}; }
    const cityKey = body.city_key ? String(body.city_key) : null;
    let q = sbA.from('snapshot').update({ acknowledged_at: new Date().toISOString() })
      .eq('target_code', target).eq('market', market).eq('status', 'done').is('acknowledged_at', null);
    if (cityKey) q = q.eq('city_key', cityKey);
    const { error } = await q;
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'GET 만 지원합니다.' });
  }

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  if (String(req.query.view || '') === 'targets') {
    try { return await targets(sb, req, res); }
    catch (e) { return res.status(500).json({ ok: false, error: '타겟 목록을 불러오지 못했습니다.', detail: String(e.message || e) }); }
  }

  if (String(req.query.view || '') === 'cities') {
    try {
      return await cities(sb, req, res, who);
    } catch (e) {
      return res.status(500).json({ ok: false, error: '도시 목록을 불러오지 못했습니다.', detail: String(e.message || e) });
    }
  }

  if (String(req.query.view || '') === 'survey') {
    try {
      return await survey(sb, req, res, who);
    } catch (e) {
      return res.status(500).json({ ok: false, error: '키워드 조사를 불러오지 못했습니다.', detail: String(e.message || e) });
    }
  }

  // view 지정 없는 옛 기본 응답(D-060 예약기반 도시/호텔 TOP3 추천)은 폐기 (2026-07-19 대표님).
  //   나라→도시→지역 조사(D-065)로 대체 · 지금은 view=cities/targets/survey 만 지원.
  //   (옛 뷰 v_content_keyword_cities/hotels 는 DB 에 남아 있으나 아무도 안 읽는다.)
  return res.status(400).json({ ok: false, error: 'view 를 지정하세요 (cities · targets · survey). 옛 기본 추천은 폐기되었습니다.' });
}
