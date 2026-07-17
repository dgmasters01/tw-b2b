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

  const snapRes = await sb.from('snapshot').select('*')
    .eq('target_code', target).eq('market', market).eq('city_key', cityKey)
    .order('ym', { ascending: false });
  if (snapRes.error) throw snapRes.error;
  const snaps = snapRes.data || [];
  const ym = String(req.query.ym || (snaps[0] && snaps[0].ym) || '');
  const snap = snaps.find((s) => s.ym === ym) || null;

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
    .eq('city', 'Osaka');
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
  const districts = DISTRICTS.map((name) => {
    const hs = hotelsByD.get(name) || [];
    const head = alive.find((k) => k.text === `${name} 호텔`);
    const t = head && tByKw.get(head.id);
    const d = t && t.demand !== null && t.demand !== undefined ? Number(t.demand) : null;
    const bookings = hs.reduce((s2, r) => s2 + (r.booking_count || 0), 0);
    const geo = hs.filter((r) => r.latitude);
    const dist = geo.length ? geo.reduce((s2, r) => s2 + km(Number(r.latitude), Number(r.longitude)), 0) / geo.length : null;
    return {
      name,
      head: head ? head.text : `${name} 호텔`,
      hotels: hs.length,                                   // 우리 장부에 그 지역 호텔이 몇 곳 (좌표 판정)
      published: hs.filter((r) => r.published_at).length,  // 그중 영상으로 소개한 곳
      bookings,                                            // 🔑 손님이 실제로 잔 곳 = 이게 순서 기준
      km: dist === null ? null : Math.round(dist * 10) / 10,
      zone: zoneOf(dist),        // 이 도시 반경(r90) 기준. 도시마다 다르다
      surveyed: !!head,                                    // 대표어가 검색어 표에 있나
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
    .like('city_key', `cc:japan|osaka|d:%`);
  // 🔴 사전 열쇠는 `Naniwa Ward`(구글 주소 그대로), 여기 이름은 `Naniwa`(구만 뽑은 것) — 어긋난다.
  //    둘 다로 찾는다. 없으면 **원래 이름 그대로**(지어내지 않는다).
  const alias = new Map((aliasRes.data || []).map((r) => [r.city_key.split('|d:')[1], r.label]));
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
      towns: towns.slice(0, 4),                      // 동네 — 이름 후보
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

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.status(200).json({
    ok: true, is_admin: !!who.isAdmin, view: 'survey',
    target, market, city_key: cityKey, ym,
    snapshot: snap, months: snaps.map((s) => s.ym),
    counts, rows: rows.slice(0, 30), rows_total: rows.length, travel, districts,
    city_radius: { r90, hotels_with_geo: pts.length },   // 이 도시에서 손님이 자는 반경
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
  });
}

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'GET 만 지원합니다.' });
  }

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  if (String(req.query.view || '') === 'survey') {
    try {
      return await survey(sb, req, res, who);
    } catch (e) {
      return res.status(500).json({ ok: false, error: '키워드 조사를 불러오지 못했습니다.', detail: String(e.message || e) });
    }
  }

  try {
    const [cityRes, hotelRes] = await Promise.all([
      sb.from('v_content_keyword_cities')
        .select('country, city, bookings_done, hotels_count, covered_hotels')
        .gt('bookings_done', 0)
        .order('bookings_done', { ascending: false })
        .limit(50),
      sb.from('v_content_keyword_hotels')
        .select('hid, hotel_name, city, country, star, bookings_done, bookings_cancelled')
        .eq('covered', false)
        .gt('bookings_done', 0)
        .order('bookings_done', { ascending: false })
        .limit(30),
    ]);
    for (const r of [cityRes, hotelRes]) if (r.error) throw r.error;

    // 도시: "영상 없음(covered_hotels=0)"을 먼저, 그다음 확정예약 많은 순.
    const cities = (cityRes.data || [])
      .sort((a, b) =>
        ((a.covered_hotels === 0 ? 0 : 1) - (b.covered_hotels === 0 ? 0 : 1)) ||
        (b.bookings_done - a.bookings_done))
      .slice(0, 25);

    const hotels = hotelRes.data || [];

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({ ok: true, is_admin: !!who.isAdmin, cities, hotels });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '키워드 추천을 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
