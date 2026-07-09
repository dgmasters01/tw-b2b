// api/_lib/youtube-keywords.js
// 슬롯 템플릿(300~335자) + 유튜브 실측 어형 = 400~450자.
//
// 왜 실측이 필요한가:
//   슬롯 템플릿은 [도시]·[지역]·[역명]을 끼워 넣는 틀이다.
//   `우메다 대욕장 호텔` `나고야 호텔 조식` `오사카 숙소 난바` 같은 어형은
//   틀에서 나오지 않는다. 사람들이 실제로 그렇게 치기 때문에 존재한다.
//   그건 유튜브 자동완성에 물어봐야 안다. 코드가 지어내면 죽은 키워드가 된다.
//
// 규칙은 여기 없다. _content/youtube/키워드-실측.md 에 있다.
// 그 문서를 고치면 결과가 바뀐다.
//
// 측정값의 출처는 두 곳이다.
//   1) _content/youtube/keywords/[도시].csv   ← 평소. 빠르다.
//   2) 유튜브 라이브 (kwtool.js)               ← 장부에 없을 때만.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suggest, competition, opportunity, pair } from './kwtool.js';

/* ═════════════ 1. 규칙 문서 읽기 ═════════════ */

const RULE_DOC = '키워드-실측.md';
let _kwRuleCache = null;

/** 문서 §3-2 의 일반 토큰 목록 + §4 의 페어 임계값을 읽는다. */
export async function loadKwRules(root) {
  if (_kwRuleCache) return _kwRuleCache;
  const md = await readFile(join(root, RULE_DOC), 'utf8');

  // §3-2 "일반 토큰" 뒤의 첫 코드블록
  const h = /일반 토큰[^\n]*\n/.exec(md);
  if (!h) throw new Error('KWRULES_NO_GENERAL_TOKENS');
  const blk = /```[a-z]*\n([\s\S]*?)```/.exec(md.slice(h.index));
  if (!blk) throw new Error('KWRULES_NO_GENERAL_TOKENS');
  const general = blk[1].split(',').map((s) => s.trim()).filter(Boolean);

  // §4 "1.5배 이상 벌어지면"
  const th = /\*\*([\d.]+)배 이상 벌어지면/.exec(md);

  // §4 붙여쓰기형 최소 경쟁 ("경쟁이 500 미만이면 넣지 않는다")
  const minC = /\*\*경쟁이 (\d+) 미만이면 넣지 않는다\.\*\*/.exec(md);

  // §7 갱신 주기
  const stale = /갱신 주기 \*\*(\d+)일\*\*/.exec(md);

  _kwRuleCache = {
    generalTokens: general,
    pairThreshold: th ? Number(th[1]) : 1.5,
    joinedMinComp: minC ? Number(minC[1]) : 500,
    staleDays: stale ? Number(stale[1]) : 90,
  };
  return _kwRuleCache;
}

export function _resetKwRulesCache() { _kwRuleCache = null; }

/* ═════════════ 2. 실측 장부 읽기 ═════════════ */

/** 따옴표 없는 단순 CSV. 장부는 우리가 쓴다. */
function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const head = lines[0].split(',').map((s) => s.trim());
  return lines.slice(1).map((l) => {
    const cells = l.split(',').map((s) => s.trim());
    const o = {};
    head.forEach((k, i) => { o[k] = cells[i]; });
    return o;
  });
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * _content/youtube/keywords/[도시].csv 를 읽는다.
 * 없으면 빈 장부를 돌려준다 (라이브로 넘어간다).
 * @returns {Map<string,{rank:number|null, comp:number|null, score:number, alive:boolean, day:string}>}
 */
export async function loadMeasured(root, city) {
  const book = new Map();
  let text;
  try {
    text = await readFile(join(root, 'keywords', `${city}.csv`), 'utf8');
  } catch {
    return book;
  }
  for (const r of parseCsv(text)) {
    if (!r['키워드']) continue;
    book.set(r['키워드'], {
      rank: num(r['자동완성순위']),
      comp: num(r['경쟁영상수']),
      score: num(r['기회점수']) ?? 0,
      alive: r['살아있나'] === '○',
      variant: r['자동완성순위'] === '변형',
      day: r['측정일'] || null,
    });
  }
  return book;
}

/* ═════════════ 3. 허용 토큰 ═════════════ */

/** 원고에서 나온 토큰 ∪ 문서가 정한 일반 토큰. 이 밖의 어절이 있으면 버린다. */
function allowedTokens(m, kwRules) {
  const t = new Set(kwRules.generalTokens);
  for (const v of [m.country, m.city, m.station, ...(m.regions || [])]) {
    if (v) t.add(v);
  }
  if (m.star != null) t.add(`${m.star}성급`);
  return t;
}

const tokensOf = (kw) => kw.split(/\s+/).filter(Boolean);
const tokensAllowed = (kw, allow) => tokensOf(kw).every((tk) => allow.has(tk));

/* ═════════════ 4. 측정 (장부 우선, 라이브는 대비책) ═════════════ */

function makeMeter(book, live) {
  const seen = new Map();

  async function seedSuggest(seed) {
    if (seen.has(seed)) return seen.get(seed);
    const lst = live ? await suggest(seed) : [];
    seen.set(seed, lst);
    return lst;
  }

  /** 어형 하나의 순위·경쟁을 얻는다. */
  async function measure(kw) {
    const hit = book.get(kw);
    if (hit) return { ...hit, source: 'csv' };
    if (!live) return null;

    const toks = tokensOf(kw);
    const seeds = toks.length > 1 ? [toks.slice(0, -1).join(' '), kw] : [kw];
    let rank = null;
    for (const s of seeds) {
      const sug = await seedSuggest(s);
      const i = sug.indexOf(kw);
      if (i >= 0) { rank = i + 1; break; }
    }
    const comp = await competition(kw);
    const rec = { rank, comp, score: opportunity(rank, comp), alive: !!rank, source: 'live' };
    book.set(kw, rec);
    return rec;
  }

  return { measure, seedSuggest };
}

/* ═════════════ 5. 호텔명 (문서 §5) ═════════════ */

/**
 * 1) 자동완성에 그 이름이 문자 그대로 있어야 채택.
 * 2) 함께 나온 어형 중 모든 어절이 (호텔명 토큰 ∪ 도시·지역·역명) 안에 있으면 축약형으로 추가.
 * 3) 그 외는 다른 호텔이므로 금지.
 */
async function vetHotels(m, book, live, evidence, warnings) {
  const names = [1, 2, 3].map((r) => m.hotels.find((h) => h.rank === r)?.nameKo).filter(Boolean);
  const place = new Set([m.city, m.station, ...(m.regions || [])].filter(Boolean));
  const kept = [];

  for (const h of names) {
    const rec = book.get(h);
    let alive = rec ? rec.alive : null;
    let sug = null;

    if (alive === null) {
      if (!live) {
        warnings.push(`호텔명 "${h}" 은 실측 장부에 없습니다. 검증 못 했으므로 뺐습니다. (kwtool.py 로 측정 후 CSV 에 넣어주세요)`);
        evidence.push({ 키워드: h, 구분: '호텔명', 채택: false, 사유: '미측정', 자동완성순위: null, 경쟁영상수: null });
        continue;
      }
      sug = await suggest(h);
      alive = sug.includes(h);
    }

    if (!alive) {
      warnings.push(`호텔명 "${h}" 은 유튜브 자동완성에 없습니다 (죽은 키워드). 키워드란에서 뺐습니다. 본문에는 3회 나오므로 손실은 작습니다.`);
      evidence.push({
        키워드: h, 구분: '호텔명', 채택: false, 사유: '자동완성 없음',
        자동완성순위: null, 경쟁영상수: rec?.comp ?? null,
      });
      continue;
    }

    kept.push(h);
    evidence.push({
      키워드: h, 구분: '호텔명', 채택: true, 사유: '자동완성 검증 통과',
      자동완성순위: rec?.rank ?? null, 경쟁영상수: rec?.comp ?? null,
    });

    // 축약형 · 도시 접두형
    const htok = new Set([...tokensOf(h), ...place]);
    const variants = [];
    if (sug) {
      for (const v of sug) if (v !== h && tokensOf(v).every((t) => htok.has(t))) variants.push(v);
    } else {
      for (const [k, v] of book) if (v.variant && tokensOf(k).every((t) => htok.has(t))) variants.push(k);
    }

    // 문서 §5-4: 자동완성이 '[도시] + 호텔명' 을 따로 준다면 그쪽이 더 안전하다.
    const cityPrefixed = variants.find((v) => v === `${m.city} ${h}`);
    if (cityPrefixed) {
      kept[kept.indexOf(h)] = cityPrefixed;
      const ev = evidence.find((e) => e.키워드 === h && e.구분 === '호텔명');
      if (ev) { ev.키워드 = cityPrefixed; ev.사유 = `동명 호텔과 섞여 도시 접두형으로 교체 (원형 경쟁 ${rec?.comp ?? '?'})`; }
      warnings.push(`호텔명 "${h}" 은 같은 이름의 다른 호텔과 섞입니다. 자동완성이 주는 "${cityPrefixed}" 로 바꿔 넣었습니다.`);
    }

    for (const v of variants) {
      if (kept.includes(v)) continue;
      kept.push(v);
      evidence.push({
        키워드: v, 구분: '호텔명 축약형', 채택: true, 사유: `"${h}" 의 부분집합`,
        자동완성순위: null, 경쟁영상수: book.get(v)?.comp ?? null,
      });
    }
  }

  if (!kept.length) warnings.push('호텔명 키워드가 하나도 살아남지 못했습니다. 원고의 호텔명 표기를 확인해 주세요.');
  return kept;
}

/* ═════════════ 6. 조립 (문서 §6) ═════════════ */

const len = (s) => [...s].length;
const joinKw = (items) => items.join(', ');

/**
 * @param {object} a
 * @param {object} a.m         parseManuscript 결과
 * @param {object} a.rule      채널 규칙 (keywordLen 포함)
 * @param {string[]} a.slotItems 슬롯 템플릿으로 만든 기반 키워드 (호텔명 포함)
 * @param {string} a.root      _content/youtube 경로
 * @param {boolean} a.live     라이브 측정 허용 여부
 */
export async function buildMeasuredKeywords({ m, rule, slotItems, root, live = false }) {
  const warnings = [];
  const evidence = [];
  const kwRules = await loadKwRules(root);
  const book = await loadMeasured(root, m.city);
  if (!book.size && !live) {
    warnings.push(`실측 장부 _content/youtube/keywords/${m.city}.csv 가 없습니다. 슬롯 키워드만으로 냈습니다. live:true 로 부르거나 kwtool.py 로 장부를 만들어주세요.`);
  }
  const { measure, seedSuggest } = makeMeter(book, live);
  const allow = allowedTokens(m, kwRules);

  // ── 6-1. 기반: 슬롯. 호텔명은 여기서 뺀다 (§5 에서 따로 검증한다)
  const hotelNames = m.hotels.map((h) => h.nameKo).filter(Boolean);
  const base = slotItems.filter((k) => !hotelNames.includes(k));
  for (const k of base) {
    const rec = book.get(k);
    evidence.push({
      키워드: k, 구분: '슬롯', 채택: true, 사유: '채널 문서 슬롯 템플릿',
      자동완성순위: rec?.rank ?? null, 경쟁영상수: rec?.comp ?? null,
    });
  }

  // ── 6-2. 호텔명 검증
  const hotels = await vetHotels(m, book, live, evidence, warnings);

  const items = [...base];
  const has = (k) => items.includes(k) || hotels.includes(k);
  const [lo, hi] = rule.keywordLen;
  const cur = () => len(joinKw([...items, ...hotels]));

  // ── 6-3. 확장 어형 (기회점수 내림차순)
  //        후보는 장부 전체 + (라이브면) 씨앗별 자동완성
  const places = new Set([m.city, m.station, ...(m.regions || [])].filter(Boolean));
  const hasPlace = (k) => tokensOf(k).some((t) => places.has(t));

  const pool = new Map();
  const consider = (k, rec) => {
    if (!k || has(k) || pool.has(k)) return;
    if (tokensOf(k).length < 2) return;         // '나고야' 한 단어는 안 넣는다
    if (!hasPlace(k)) return;                   // 우리 도시·지역이 없으면 남 좋은 일
    if (!tokensAllowed(k, allow)) return;       // 원고에 없는 값은 안 넣는다
    if (rec && !rec.alive) return;              // 죽은 키워드는 버린다
    pool.set(k, rec);
  };

  for (const [k, rec] of book) if (!rec.variant) consider(k, rec);

  if (live) {
    const seeds = [
      `${m.city} 호텔`, `${m.city} 숙소`, `${m.city} 여행`,
      `${m.city} 호텔 추천`, `${m.city} 숙소 추천`,
      `${m.station} 호텔`, `${m.station} 숙소`,
      ...(m.regions || []).flatMap((r) => [`${r} 호텔`, `${r} 숙소`]),
    ].filter(Boolean);
    for (const s of seeds) {
      for (const k of await seedSuggest(s)) {
        if (has(k) || pool.has(k)) continue;
        if (tokensOf(k).length < 2 || !hasPlace(k) || !tokensAllowed(k, allow)) continue;
        const rec = await measure(k);
        if (rec?.alive) pool.set(k, rec);
      }
    }
  }

  const ranked = [...pool.entries()]
    .map(([k, rec]) => ({ k, rec }))
    .sort((a, b) => (b.rec?.score ?? 0) - (a.rec?.score ?? 0));

  for (const { k, rec } of ranked) {
    if (cur() >= lo) break;
    if (len(joinKw([...items, k, ...hotels])) > hi) continue;   // 넣으면 상한을 넘는다 → 건너뛴다
    items.push(k);
    evidence.push({
      키워드: k, 구분: '실측 확장', 채택: true, 사유: `기회점수 ${rec?.score ?? 0}`,
      자동완성순위: rec?.rank ?? null, 경쟁영상수: rec?.comp ?? null,
    });
  }

  // ── 6-4. 3어절 이상 페어 보강 (문서 §4)
  //        갈리는 것만 붙여쓰기형을 더 넣는다. 자리가 남을 때만.
  const pairNotes = [];
  const pairUnknown = [];
  for (const k of [...items]) {
    if (cur() >= hi - 10) break;
    if (tokensOf(k).length < 3) continue;
    const joined = k.replace(/\s+/g, '');
    if (has(joined)) continue;

    let split = null; let ratio = null;
    const a = book.get(k)?.comp;
    const b = book.get(joined)?.comp;
    if (a && b) { ratio = a / b; split = ratio > kwRules.pairThreshold || ratio < 1 / kwRules.pairThreshold; }
    else if (live) { const p = await pair(k, 'ko', 'kr', kwRules.pairThreshold); split = p.split; ratio = p.ratio; }
    else pairUnknown.push(k);

    if (split === true && (book.get(joined)?.comp ?? 0) < kwRules.joinedMinComp) {
      evidence.push({
        키워드: joined, 구분: '페어(붙여쓰기)', 채택: false,
        사유: `갈렸지만 경쟁 ${book.get(joined)?.comp ?? 0} < ${kwRules.joinedMinComp} — 아무도 안 치는 어형`,
        자동완성순위: null, 경쟁영상수: book.get(joined)?.comp ?? null,
      });
      continue;
    }

    if (split === true && len(joinKw([...items, joined, ...hotels])) <= hi) {
      items.push(joined);
      pairNotes.push(`${k} ↔ ${joined} (${ratio ? `${ratio.toFixed(1)}배` : '갈림'})`);
      evidence.push({
        키워드: joined, 구분: '페어(붙여쓰기)', 채택: true,
        사유: `"${k}" 와 경쟁이 갈림${ratio ? ` ${ratio.toFixed(1)}배` : ''}`,
        자동완성순위: null, 경쟁영상수: book.get(joined)?.comp ?? null,
      });
    }
  }
  if (pairNotes.length) warnings.push(`띄어쓰기/붙여쓰기가 갈려 둘 다 넣었습니다: ${pairNotes.join(' / ')}`);
  if (pairUnknown.length) {
    warnings.push(`3어절 이상 ${pairUnknown.length}개는 붙여쓰기 경쟁을 못 재서 넘겼습니다 (장부에 없음). 어절 수만으로는 갈리는지 알 수 없습니다: ${pairUnknown.slice(0, 5).join(' / ')}${pairUnknown.length > 5 ? ' …' : ''}`);
  }

  // ── 6-5. 마무리
  const all = [...items, ...hotels];
  const text = joinKw(all);
  const total = len(text);
  if (total < lo) warnings.push(`키워드가 ${total}자로 하한(${lo}자)에 못 미칩니다. 실측 후보가 모자랍니다. 지어내지 않고 그대로 냅니다.`);
  if (total > hi) warnings.push(`키워드가 ${total}자로 상한(${hi}자)을 넘었습니다.`);
  if (total > 500) warnings.push('키워드가 유튜브 태그란 한도(500자)를 넘었습니다.');

  const stale = [...book.values()].find((v) => v.day)?.day || null;
  if (stale) {
    const age = (Date.now() - Date.parse(stale)) / 86400000;
    if (age > kwRules.staleDays) warnings.push(`실측 장부가 ${Math.round(age)}일 됐습니다. ${kwRules.staleDays}일마다 갱신하세요.`);
  }

  return { keywords: text, keywordItems: all, keywordLength: total, evidence, warnings, measuredDay: stale };
}

export default buildMeasuredKeywords;
