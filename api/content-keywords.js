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
    .select('id, text, kind, alive, alive_source, morph_axis, is_anchor, axis, district')
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

  // 🔑 지역 축 (D-065 3-2 · ㊹ "재봐서 살아있는 것만") — 지역 **대표어 1개**로 지역 크기를 잰다.
  //    "난바 호텔" 이 난바를 대표한다. 그게 살아있으면 지역이 살아있는 것이다.
  //    🔴 옛 화면은 `DIST=[['난바',10.8,…]]` 로 **박아뒀다.** 실측과 거의 같았지만(10.84) **박힌 값은 안 늘어난다.**
  const DISTRICTS = ['난바', '우메다', '신사이바시', '덴노지', '도톤보리'];
  const anchorDemand = (() => {
    const a = alive.find((k) => k.is_anchor);
    const t = a && tByKw.get(a.id);
    return t && t.demand ? Number(t.demand) : null;
  })();
  const districts = DISTRICTS.map((name) => {
    const head = alive.find((k) => k.text === `${name} 호텔`);
    const t = head && tByKw.get(head.id);
    const d = t && t.demand !== null && t.demand !== undefined ? Number(t.demand) : null;
    const hasSeries = t && t.series ? Object.keys(t.series).length : 0;
    return {
      name,
      head: head ? head.text : `${name} 호텔`,
      surveyed: !!head,                       // 대표어가 검색어 표에 있나
      demand: d,
      measured: !!(t && t.measured),
      skip_reason: t ? t.skip_reason : null,
      months: hasSeries,
      vs_city: (d && anchorDemand) ? Math.round(anchorDemand / d) : null,   // 도시 대표어의 1/N
    };
  }).sort((a, b) => (a.demand === null) - (b.demand === null) || (b.demand - a.demand));

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.status(200).json({
    ok: true, is_admin: !!who.isAdmin, view: 'survey',
    target, market, city_key: cityKey, ym,
    snapshot: snap, months: snaps.map((s) => s.ym),
    counts, rows: rows.slice(0, 30), rows_total: rows.length, travel, districts, layer3,
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
