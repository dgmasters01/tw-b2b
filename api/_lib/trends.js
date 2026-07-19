// api/_lib/trends.js
// ─────────────────────────────────────────────────────────────
// 구글 트렌드(유튜브 property) 수요 측정 — kwtool.py 의 trend/trend_batch 를 JS 로 옮긴 것.
//   왜 옮기나: 새벽 조사 봇은 Vercel 서버(node)에서 돈다. 파이썬(kwtool.py)을 못 돌린다.
//   방식: /trends/api/explore → TIMESERIES 위젯 token+request → /widgetdata/multiline 주간 시계열.
//         pytrends 는 막힘 → 직접 호출. )]}' 쓰레기 잘라냄. 쿠키(NID) 먼저 받아둠.
//   429: 상시로 뜬다(⑪). 15~25초 간격·재시도로 막는다. 서두르면 전부 튕긴다.
//   앵커(⑪): 묶음당 앵커1+신규4. 보정배율 = 1묶음 앵커값 ÷ 이 묶음 앵커값 → 모든 값에 곱함.
//            → 40개도 한 잣대로 이어붙는다. 창이 3일만 달라도 앵커가 움직이니 도장(window·measured_at) 같이 낸다(㊶-6).
//   ⑧: mean<=0 은 "없음"이 아니라 "못 잼"(measured=false·demand=null·skip_reason=below_floor).
// ─────────────────────────────────────────────────────────────

const EXPLORE = 'https://trends.google.com/trends/api/explore';
const MULTILINE = 'https://trends.google.com/trends/api/widgetdata/multiline';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export const TREND_FROM = '2024-01-01';        // ㊶-3 고정 기준선 — 옮기면 옛 값과 못 잇는다
export const TREND_PROPERTY = 'youtube';        // 웹 검색 아님. 유튜브 안에서의 수요
export const DEMAND_SOURCE = 'gtrends_youtube'; // 🏷️ 도장
const BATCH_NEW = 4;                            // 묶음당 신규 4 (+앵커1 = 5 = 트렌드 상한)
const GAP_MS = [15000, 25000];                  // 429 방지 간격

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const trendSleep = () => sleep(rnd(GAP_MS[0], GAP_MS[1]));

let COOKIE = null;
async function ensureCookie(hl) {
  if (COOKIE !== null) return COOKIE;
  try {
    const r = await fetch(`https://trends.google.com/trends/explore?geo=KR&hl=${hl}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': `${hl}-KR,${hl};q=0.9`, 'Referer': 'https://trends.google.com/trends/explore' },
    });
    const sc = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    COOKIE = sc.map((c) => c.split(';')[0]).join('; ') || '';   // 429 여도 NID 는 대개 붙는다
  } catch { COOKIE = ''; }
  return COOKIE;
}

function stripJson(raw) {
  const i = raw.indexOf('{');
  if (i < 0) throw new Error('트렌드 응답이 JSON 이 아님');
  return JSON.parse(raw.slice(i));
}

async function tget(url, hl, tries = 8) {
  const cookie = await ensureCookie(hl);
  let last = null;
  for (let i = 0; i < tries; i++) {
    let r;
    try {
      r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': `${hl}-KR,${hl};q=0.9`, 'Referer': 'https://trends.google.com/trends/explore', 'Cookie': cookie } });
    } catch (e) { last = e; await trendSleep(); continue; }
    if (r.ok) return await r.text();
    last = new Error('HTTP ' + r.status);
    if ([429, 500, 502, 503].includes(r.status)) { await trendSleep(); continue; }
    throw last;
  }
  throw new Error('구글 트렌드 응답 없음 (' + tries + '회 시도): ' + (last && last.message));
}

function todayKst() { return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); }
function timeframe(from, to) { return `${from} ${to || todayKst()}`; }

// 묶음 하나(최대 5개)를 잰다 → { 키워드: {mean, points, series_raw} }. 이 묶음 안에서만 비교 가능.
async function trendBatch(keywords, geo, from, to, hl) {
  if (keywords.length > 5) throw new Error('트렌드는 한 번에 5개까지다');
  const tf = timeframe(from, to);
  const req = { comparisonItem: keywords.map((k) => ({ keyword: k, geo, time: tf })), category: 0, property: TREND_PROPERTY };
  const p = new URLSearchParams({ hl, tz: '-540', req: JSON.stringify(req) });
  const data = stripJson(await tget(`${EXPLORE}?${p.toString()}&tz=-540`, hl));
  const w = (data.widgets || []).find((x) => x.id === 'TIMESERIES');
  if (!w) throw new Error('TIMESERIES 위젯이 없다 — 키워드가 전부 데이터 없음일 수 있다');
  await sleep(rnd(2000, 4000));
  const p2 = new URLSearchParams({ hl, tz: '-540', req: JSON.stringify(w.request), token: w.token });
  const d2 = stripJson(await tget(`${MULTILINE}?${p2.toString()}`, hl));
  const tl = (d2.default || {}).timelineData || [];
  if (!tl.length) throw new Error('시계열이 비었다');
  const out = {};
  keywords.forEach((kw, i) => {
    const vals = [], months = {};
    for (const pt of tl) {
      const v = (pt.value && i < pt.value.length) ? pt.value[i] : 0;
      vals.push(v);
      const ym = new Date(parseInt(pt.time, 10) * 1000).toISOString().slice(0, 7);
      (months[ym] = months[ym] || []).push(v);
    }
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const series_raw = {};
    for (const m in months) series_raw[m] = months[m].reduce((a, b) => a + b, 0) / months[m].length;
    out[kw] = { mean, points: vals.length, series_raw };
  });
  return out;
}

// 키워드 전체를 하나의 잣대(앵커)로 잰다. rows 반환 (trend 표 그대로).
//   onBatch(rows) 콜백 = 묶음마다 저장(이어하기). seedRows = 이미 잰 것(건너뜀).
export async function measureTrends(keywords, opts = {}) {
  const { anchor: anchorIn, geo = 'KR', from = TREND_FROM, to = null, hl = 'ko', onBatch = null, seedRows = null } = opts;
  let kws = [...new Set(keywords)];
  if (!kws.length) return [];
  const anchor = anchorIn || kws[0];
  if (!kws.includes(anchor)) kws.unshift(anchor);
  const rest = kws.filter((k) => k !== anchor);
  const batches = [];
  if (!rest.length) batches.push([anchor]);
  else for (let i = 0; i < rest.length; i += BATCH_NEW) batches.push([anchor, ...rest.slice(i, i + BATCH_NEW)]);
  const winFrom = from, winTo = to || todayKst();
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  const rows = seedRows ? [...seedRows] : [];
  const seen = new Set(rows.map((r) => r.keyword));
  let ref = (rows.find((r) => r.keyword === anchor && r.demand) || {}).demand;
  if (ref === undefined) ref = null;

  for (let bno = 1; bno <= batches.length; bno++) {
    const batch = batches[bno - 1];
    if (batch.every((k) => seen.has(k))) continue;
    if (seen.size) await trendSleep();
    const got = await trendBatch(batch, geo, from, to, hl);
    const a = got[anchor].mean;
    if (ref === null) { ref = a; if (ref <= 0) throw new Error(`앵커 '${anchor}' 가 측정 바닥 아래다 — 이 조사는 잣대가 없다`); }
    const ratio = a > 0 ? Math.round((ref / a) * 10000) / 10000 : null;
    for (const kw of batch) {
      if (seen.has(kw)) continue;
      if (kw === anchor && bno > 1) continue;
      seen.add(kw);
      const g = got[kw];
      const floor = g.mean <= 0;
      const scaled = (floor || ratio === null) ? null : Math.round(g.mean * ratio * 100) / 100;
      const series = floor ? null : Object.fromEntries(Object.entries(g.series_raw).map(([m, v]) => [m, Math.round(v * ratio * 100) / 100]));
      rows.push({
        keyword: kw, measured: !floor && ratio !== null, demand: scaled, series,
        batch_no: bno, calib_ratio: ratio, skip_reason: floor ? 'below_floor' : null,
        demand_source: DEMAND_SOURCE, demand_geo: geo, window_from: winFrom, window_to: winTo, measured_at: now, points: g.points,
      });
    }
    if (onBatch) await onBatch(rows);
  }
  rows.sort((x, y) => (x.demand === null) - (y.demand === null) || (y.demand || 0) - (x.demand || 0));
  return rows;
}
