// api/_lib/kwtool.js
// kwtool.py 를 그대로 옮겨온 것이다. 함수 다섯 개 · 이름도 같다.
//   suggest      유튜브 자동완성  → 수요
//   competition  Data API v3 search.list (최근 365일) → 경쟁   ← 2026-08-12 교체
//   harvest      자모를 붙여 대량 수집
//   analyze      수요·경쟁·기회점수
//   pair         띄어쓰기 ↔ 붙여쓰기 대조
//
// 외부 라이브러리를 쓰지 않는다 (package.json 손대지 않는다).
// Node 18+ 의 내장 fetch 만 쓴다.
//
// 규격 근거: _content/youtube/키워드-실측.md
//
// 주의 — 서버리스에서 이걸 직접 부르면 느리다 (요청 1건당 0.6~1.3초).
// 평소에는 _content/youtube/keywords/[도시].csv 장부를 읽는다.
// 장부에 없을 때만 여기로 온다.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SUGGEST_URL = 'https://suggestqueries.google.com/complete/search';
// SEARCH_URL 폐기 (2026-08-12) — 검색결과 HTML 긁기는 더 이상 쓰지 않는다

/** 한글 자모 — 자동완성을 넓게 훑을 때 붙인다. */
export const JAMO = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 유튜브에 예의를 지킨다. 너무 빨리 두드리면 막힌다. */
export const politeSleep = () => sleep(600 + Math.random() * 700);

/** 느긋하게 가져온다. 실패하면 잠깐 쉬고 다시. */
async function get(url, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        signal: ctl.signal,
      });
      clearTimeout(t);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
      if (i === retries - 1) throw lastErr;
      await sleep(1500 * (i + 1));
    }
  }
  return '';
}

/* ─────────────────────── ① 수요 ─────────────────────── */

/** 유튜브 자동완성 목록. 순위가 곧 수요의 대리 지표다. */
export async function suggest(q, hl = 'ko', gl = 'kr') {
  const p = new URLSearchParams({ client: 'firefox', ds: 'yt', hl, gl, q });
  let raw;
  try {
    raw = await get(`${SUGGEST_URL}?${p}`);
  } catch {
    return [];
  }
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

/* ─────────────────────── ② 경쟁 ─────────────────────── */
//
// 🔴 2026-08-12 교체. 여기가 3주간 막혀 있던 자리다.
//
// 옛 방식(검색결과 HTML 의 estimatedResults 긁기)은 2026-07-16 에 폐기됐다(D-065 ㊺).
//   · 날짜 조건이 없어 10년 전 영상까지 셌다. Data API 값과 2.8배까지 어긋났다.
//   · 문서(_content/youtube/키워드-실측.md §1)는 그때 고쳤는데 **이 코드는 안 고쳤다.**
//   · 그 결과 유튜브 화면 한 장(수백 KB)을 통째로 받다가 봇 차단·시간초과가 났고,
//     새 도시 장부가 하나도 안 만들어졌다 (삿포로 7/31 294자 · 유후인 8/11 268자).
//
// 지금 방식: 서버 창구 /api/ops/yt-probe?mode=count 가 Data API v3 search.list 로 잰다.
//   · publishedAfter = 오늘 − 365일 (㊺: 3년 아님 1년. 계절은 1년에 한 바퀴)
//   · 열쇠(YOUTUBE_API_KEY)는 서버에만 있고 밖으로 안 나온다
//   · 여러 개를 한 번에 물어 왕복을 줄인다 (search.list = 1개당 100 units, 하루 10,000)
//   · 잣대 도장(comp_method·comp_window_days)을 함께 돌려준다 (㊶-6)
//     도장 없이 저장하면 옛 226만 → 새 8만을 "경쟁이 줄었다"고 잘못 읽는다. 준 건 자다.

export const COMP_METHOD = 'api_search_list';
export const COMP_WINDOW_DAYS = 365;

const OPS_BASE = (process.env.KWTOOL_OPS_BASE || 'https://gohotelwinners.com').replace(/\/$/, '');
const OPS_TOKEN = process.env.CLAUDE_OPS_TOKEN || process.env.OPS_TOKEN || '';

/**
 * 여러 키워드의 경쟁을 한 번에. Map<키워드, {count, comp_method, comp_window_days, measured_at, error}>
 * 못 재면 count = null. 지어내지 않는다.
 */
export async function competitionMany(qs, windowDays = COMP_WINDOW_DAYS, region = 'KR', lang = 'ko') {
  const list = Array.from(qs);
  const out = new Map();
  if (!list.length) return out;
  if (!OPS_TOKEN) {
    for (const q of list) out.set(q, { count: null, error: 'ops_token_missing' });
    return out;
  }
  // 한 번에 너무 많이 물으면 서버가 오래 걸린다. 25개씩 끊는다.
  for (let i = 0; i < list.length; i += 25) {
    const batch = list.slice(i, i + 25);
    try {
      const r = await fetch(`${OPS_BASE}/api/ops/yt-probe?mode=count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-ops-token': OPS_TOKEN, 'User-Agent': UA },
        body: JSON.stringify({ q: batch, window_days: windowDays, region, lang }),
      });
      const j = await r.json();
      for (const row of (j.results || [])) {
        out.set(row.q, {
          count: row.competition ?? null,
          comp_method: row.comp_method || COMP_METHOD,
          comp_window_days: row.comp_window_days || windowDays,
          measured_at: row.measured_at || null,
          error: row.error || null,
        });
      }
      for (const q of batch) if (!out.has(q)) out.set(q, { count: null, error: j.error || 'no_result' });
      // 할당량이 끝났으면 더 두드려도 무의미하다 (막힐 뿐 청구되지 않는다)
      if (j.blocked) {
        for (const q of list.slice(i + batch.length)) out.set(q, { count: null, error: 'quotaExceeded' });
        break;
      }
    } catch (e) {
      for (const q of batch) out.set(q, { count: null, error: String(e).slice(0, 80) });
    }
  }
  return out;
}

/** 경쟁 영상 수 (최근 1년 창). 숫자만. 못 재면 null. */
export async function competition(q, hl = 'ko', gl = 'kr') {
  const region = (gl || 'kr').toUpperCase();
  const m = await competitionMany([q], COMP_WINDOW_DAYS, region, hl || 'ko');
  return (m.get(q) || {}).count ?? null;
}

/* ─────────────────────── ③ 수집 ─────────────────────── */

/**
 * 씨앗 키워드에 자모(ㄱㄴㄷ…)를 붙여가며 자동완성을 긁는다.
 * depth=1 이면 씨앗 + 자모 14개. depth=2 면 1차 결과 20개에도 한 번 더.
 */
export async function harvest(seed, depth = 1, hl = 'ko', gl = 'kr') {
  const seen = new Set();
  const found = [];
  const add = (items) => {
    for (const it of items) if (!seen.has(it)) { seen.add(it); found.push(it); }
  };

  add(await suggest(seed, hl, gl));
  await politeSleep();

  for (const j of JAMO) {
    add(await suggest(`${seed} ${j}`, hl, gl));
    await politeSleep();
  }

  if (depth >= 2) {
    for (const kw of found.slice(0, 20)) {
      add(await suggest(kw, hl, gl));
      await politeSleep();
    }
  }
  return found;
}

/* ─────────────────────── ④ 분석 ─────────────────────── */

/**
 * 기회점수 = 수요 ÷ log10(경쟁)
 * 수요는 자동완성 순위를 뒤집어 쓴다 (1위=10점, 10위=1점, 없으면 0점).
 */
export function opportunity(rank, comp) {
  if (!comp || comp <= 0) return 0;
  const demand = rank ? Math.max(0, 11 - rank) : 0;
  return Math.round((demand / Math.log10(Math.max(comp, 10))) * 100) / 100;
}

/** 키워드마다 자동완성 순위 · 경쟁 영상 수 · 기회점수를 계산한다. */
export async function analyze(keywords, hl = 'ko', gl = 'kr') {
  const rows = [];
  for (const kw of keywords) {
    // 씨앗은 '마지막 어절을 뺀 앞부분'이다.
    // (첫 어절만 쓰면 '오사카 호텔 추천'을 '오사카'로 조회해 못 찾는다)
    const toks = kw.split(/\s+/);
    const seeds = toks.length > 1 ? [toks.slice(0, -1).join(' '), kw] : [kw];

    let rank = null;
    for (const seed of seeds) {
      const sug = await suggest(seed, hl, gl);
      await politeSleep();
      const i = sug.indexOf(kw);
      if (i >= 0) { rank = i + 1; break; }
    }
    const comp = await competition(kw, hl, gl);
    await politeSleep();

    rows.push({
      키워드: kw,
      자동완성순위: rank || '없음',
      경쟁영상수: comp ?? '조회실패',
      기회점수: opportunity(rank, comp),
      살아있나: rank ? '○' : '✗ 죽은키워드',
    });
  }
  rows.sort((a, b) => b.기회점수 - a.기회점수);
  return rows;
}

/**
 * 띄어쓰기 ↔ 붙여쓰기 대조.
 * 3어절 이상이면 실제로 경쟁이 갈린다 (키워드-실측.md §4).
 * @returns {{spaced, joined, spacedComp, joinedComp, split:boolean|null, ratio:number|null}}
 */
export async function pair(kw, hl = 'ko', gl = 'kr', threshold = 1.5) {
  const spaced = kw;
  const joined = kw.replace(/\s+/g, '');
  if (spaced === joined) {
    return { spaced, joined, spacedComp: null, joinedComp: null, split: false, ratio: 1 };
  }
  const a = await competition(spaced, hl, gl);
  await politeSleep();
  const b = await competition(joined, hl, gl);
  await politeSleep();

  if (!a || !b) return { spaced, joined, spacedComp: a, joinedComp: b, split: null, ratio: null };
  const ratio = a / b;
  return {
    spaced, joined, spacedComp: a, joinedComp: b,
    ratio: Math.round(ratio * 100) / 100,
    split: ratio > threshold || ratio < 1 / threshold,
  };
}

export default { suggest, competition, harvest, analyze, pair, opportunity, politeSleep, JAMO };
