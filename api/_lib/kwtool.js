// api/_lib/kwtool.js
// kwtool.py 를 그대로 옮겨온 것이다. 함수 다섯 개 · 이름도 같다.
//   suggest      유튜브 자동완성  → 수요
//   competition  검색결과 HTML    → 경쟁 (estimatedResults)
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
const SEARCH_URL = 'https://www.youtube.com/results';

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

const EST_RE = /"estimatedResults"\s*:\s*"(\d+)"/;

/** 검색결과 HTML 의 estimatedResults. 경쟁 영상 수의 대리 지표. */
export async function competition(q, hl = 'ko', gl = 'kr') {
  const p = new URLSearchParams({ search_query: q, hl, gl });
  let html;
  try {
    html = await get(`${SEARCH_URL}?${p}`);
  } catch {
    return null;
  }
  const m = EST_RE.exec(html);
  return m ? Number(m[1]) : null;
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
