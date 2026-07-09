// api/_lib/youtube-parse.js
// 원고(docx 에서 뽑은 텍스트) + 원고 파일명 → 구조화된 값
//
// 원고는 두 가지 모양이 있다.
//   A형(숏폼 · 여행능력자들): "## TOP3. 호텔명" · "• 1박 약 95,000원"
//   B형(롱폼 · 호텔이곳/호텔이야): "## 00:08 오늘의 조건 (...)" · "## 탑쓰리 · 호텔명 (영문명)"
//
// 원칙(호텔이야.md §6): 원고에 없는 값은 지어내지 않는다. 없으면 NEEDS 를 넣고 경고한다.

export const NEEDS = '[원고 확인 필요]';

const COUNTRIES = ['일본', '대만', '베트남', '태국', '한국', '스리랑카', '싱가포르', '홍콩', '중국', '필리핀'];
const NOISE = new Set(['가성비', '근처', '중심', '주변', '역중심', '호텔', '숙소', '추천', '편']);

/* ─────────────────────────── 파일명 ─────────────────────────── */

/**
 * 예) "001 9월 3일~9월 5일, 2명, 일본 나고야 나고야역 근처 10만원 이하 3성급 호텔.docx"
 */
export function parseFilename(filename) {
  const warnings = [];
  let s = String(filename).replace(/\.(docx|doc)$/i, '').trim();

  const seq = (/^(\d{2,3})\s+/.exec(s) || [])[1] || null;
  s = s.replace(/^\d{2,3}\s+/, '');

  const d = /(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*[~～\-]\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(s);
  const dateRange = d
    ? { fromMonth: +d[1], fromDay: +d[2], toMonth: +d[3], toDay: +d[4] }
    : null;
  if (!dateRange) warnings.push('파일명에 조사 기간이 없습니다.');

  const paxM = /(\d+)\s*명/.exec(s);
  const pax = paxM ? +paxM[1] : null;
  if (!pax) warnings.push('파일명에 인원이 없습니다.');

  const starM = /([1-5])\s*성급/.exec(s);
  const star = starM ? +starM[1] : null;
  if (!star) warnings.push('파일명에 성급이 없습니다.');

  // 가격대: "10만원 이하" / "10만원대" / "10만원 미만"(→ 이하)
  const pbM = /(\d+\s*만원)\s*(이하|미만|대)/.exec(s);
  let priceBand = null;
  if (pbM) {
    const num = pbM[1].replace(/\s/g, '');
    let suffix = pbM[2];
    if (suffix === '미만') {
      suffix = '이하'; // 세 문서 공통: 자동완성에 '미만'이 없다
      warnings.push(`가격대 '미만' → '이하' 로 바꿨습니다. (자동완성에 '미만' 없음)`);
    }
    priceBand = num + suffix; // 붙여쓰기
  } else {
    warnings.push('파일명에 가격대가 없습니다.');
  }

  const country = COUNTRIES.find((c) => s.includes(c)) || null;
  if (!country) warnings.push('파일명에서 나라를 찾지 못했습니다.');

  // 나라 뒤 ~ 가격대 앞까지가 도시·지역 구간
  let city = null;
  let regions = [];
  if (country) {
    const start = s.indexOf(country) + country.length;
    const end = pbM ? s.indexOf(pbM[0], start) : s.length;
    const seg = s.slice(start, end > start ? end : s.length);
    const tokens = seg
      .split(/\s+/)
      .map((t) => t.replace(/[,·]+$/, '').trim())
      .filter(Boolean)
      .filter((t) => !NOISE.has(t));
    if (tokens.length) {
      city = tokens[0];
      regions = tokens
        .slice(1)
        .flatMap((t) => t.split(/[_,·]/))
        .map((t) => t.trim())
        .filter((t) => t && !NOISE.has(t));
    }
  }
  if (!city) warnings.push('파일명에서 도시를 찾지 못했습니다.');
  if (!regions.length) warnings.push('파일명에서 지역을 찾지 못했습니다.');

  return { seq, dateRange, pax, country, city, regions, star, priceBand, warnings };
}

/** 지역 → 역명. 이미 '역'으로 끝나면 그대로. */
export function stationOf(region) {
  if (!region) return null;
  return /역$/.test(region) ? region : `${region}역`;
}

/* ─────────────────────────── 본문 ─────────────────────────── */

const RANK_WORD = { 탑원: 1, 탑투: 2, 탑쓰리: 3 };

function clean(line) {
  return line.replace(/\\([#!~])/g, '$1').replace(/\s+/g, ' ').trim();
}

function moneyIn(text) {
  const all = [...text.matchAll(/([\d][\d,]{4,})\s*원/g)].map((m) => Number(m[1].replace(/,/g, '')));
  return all.length ? all[all.length - 1] : null;
}

/** B형: "## 탑쓰리 · 이름 (English)" 섹션들 */
function parseLongform(text) {
  const hotels = [];
  // '#' 헤딩이 살아 있든 없든 (docx 스타일이 제각각) 둘 다 잡는다.
  // 실물 원고 서식: "탑쓰리, [KOKO 호텔 하카타 스테이션 (KOKO HOTEL Hakata Station)]"
  const re = /^\s*#{0,4}\s*(탑원|탑투|탑쓰리)\s*[·:,]\s*(.+)$/gm;
  let hits = [...text.matchAll(re)];

  // 서식 변종: "### 탑쓰리" 가 단독 줄이고, 호텔명이 바로 다음 헤딩인 원고도 있다.
  //   ### 탑쓰리
  //   ### KOKO 호텔 하카타 스테이션 (KOKO HOTEL Hakata Station) 하카타에키마에
  if (hits.length < 3) {
    const re2 = /^\s*#{0,4}\s*(탑원|탑투|탑쓰리)\s*$\n+\s*#{0,4}\s*(.+)$/gm;
    const alt = [...text.matchAll(re2)];
    if (alt.length > hits.length) hits = alt;
  }
  // '·' 로 구분된 진짜 섹션 헤딩을 우선한다 (':' 는 문서 맨 앞 요약줄에도 쓰인다)
  const sectional = hits.filter((h) => /[·,]/.test(h[0]));
  const use = sectional.length >= 3 ? sectional : hits;
  const seen = new Set();
  for (let i = 0; i < use.length; i++) {
    const h = use[i];
    const rank = RANK_WORD[h[1]];
    if (seen.has(rank)) continue;
    seen.add(rank);
    const start = h.index + h[0].length;
    const end = i + 1 < use.length ? use[i + 1].index : text.length;
    const body = text.slice(start, end);

    const raw = clean(h[2]).replace(/\s*\|.*$/, '').replace(/^\[\s*/, '').replace(/\s*\]\s*$/, '');
    // "이름 (English) 꼬리" — 괄호 뒤 꼬리(역명 등)는 버린다
    const nm = /^(.*?)\s*\(([^)]+)\)\s*(.*)$/.exec(raw);
    const nameKo = nm ? nm[1].trim() : raw;
    const nameEn = nm ? nm[2].trim() : null;

    const walkM = /도보\s*(\d+)\s*분/.exec(body);
    // 평점: "[평점: 4.1/5 | 가격: 1박 약 82,000원]"
    const ratingM = /평점\s*[:：]\s*([\d.]+)\s*\/\s*5/.exec(body);
    // 주변 스팟: 첫 줄 "하카타역 도보 4분, 캐널시티 하카타 도보 9분, 스미요시 신사 도보 8분!"
    const spotsLineM = /^\s*[^\n]*도보\s*\d+\s*분\s*,[^\n]*$/m.exec(body);
    // 시설·서비스 한 줄: "세련된 카페 겸 라운지, 편리한 짐 보관 서비스를 제공합니다."
    const perksLineM = /^([^\n]+?)를?\s*제공합니다\.?\s*$/m.exec(body);
    // '지하철 공항선' · '공항역' 은 공항 이름이 아니다
    const airportM = /(?!지하철)([가-힣]{2,6})\s?공항(?![선역])(?!\s*[→=])/.exec(
      body.replace(/지하철\s*공항선/g, ' '),
    );
    // "총 소요시간 약 14분" · "총 소요시간은 약 14분 정도입니다"
    const airMinM = /총\s*소요시간\S*\s*약\s*([\d]+(?:\s*[~\-]\s*\d+)?)\s*분/.exec(body);
    const spotsM = /주변\s*스팟[^\n]*\n+([^\n]+)/.exec(body);
    const perksM = /장점\s*3개\)?[\s\S]{0,40}?자막\s*\n+([^\n]+)/.exec(body);

    const spotsFromLine = spotsLineM
      ? clean(spotsLineM[0]).replace(/[!！]\s*$/, '').split(/\s*,\s*/).filter(Boolean)
      : [];
    const perksFromLine = perksLineM
      ? clean(perksLineM[1]).split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean)
      : [];

    hotels.push({
      rank,
      nameKo,
      nameEn,
      price: moneyIn(body),
      walkMin: walkM ? +walkM[1] : null,
      airport: airportM ? airportM[0].replace(/\s/g, '') : null,
      airportMin: airMinM ? airMinM[1].replace(/\s/g, '') : null,
      rating: ratingM ? ratingM[1] : null,
      spots: spotsM ? clean(spotsM[1]).split(/\s*[·|]\s*/).filter(Boolean) : spotsFromLine,
      perks: perksM ? clean(perksM[1]).split(/\s*\|\s*/).filter(Boolean) : perksFromLine,
    });
  }
  return hotels.sort((a, b) => a.rank - b.rank);
}

/** A형: "## TOP3. 이름" */
function parseShortform(text) {
  const hotels = [];
  const re = /^\s*#{0,4}\s*TOP\s*([123])\s*[.·]\s*(.+)$/gim;
  const hits = [...text.matchAll(re)];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const start = h.index + h[0].length;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const body = text.slice(start, end);
    const raw = clean(h[2]);
    const nm = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
    hotels.push({
      rank: +h[1],
      nameKo: nm ? nm[1].trim() : raw,
      nameEn: nm ? nm[2].trim() : null,
      price: moneyIn(body),
      walkMin: null,
      airport: null,
      airportMin: null,
      spots: [],
      perks: [],
    });
  }
  return hotels.sort((a, b) => a.rank - b.rank);
}

/** 챕터: "## 00:08 오늘의 조건 (…)" / "## [00:09](url) TOP3 …" */
function parseChapters(text) {
  const out = [];
  const re = /^\s*#{0,4}\s*\[?(\d{1,2}:\d{2})\]?(?:\([^)]*\))?\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ time: m[1].padStart(5, '0'), label: clean(m[2]) });
  }
  return out;
}

/**
 * 원고 전체 파싱
 * @param {string} filename 원고 파일명
 * @param {string} text     docx 에서 뽑은 텍스트
 */
export function parseManuscript(filename, text) {
  const meta = parseFilename(filename);
  const warnings = [...meta.warnings];

  // 어느 쪽 모양인지는 '실제로 호텔 3개가 나오는가' 로 정한다.
  const asLong = parseLongform(text);
  const asShort = parseShortform(text);
  let format = asLong.length >= 3 ? 'long' : asShort.length >= 3 ? 'short' : asLong.length >= asShort.length ? 'long' : 'short';
  let hotels = format === 'long' ? asLong : asShort;

  if (hotels.length !== 3) warnings.push(`호텔을 3개 찾지 못했습니다 (찾은 개수: ${hotels.length}).`);

  const names = hotels.map((h) => h.nameKo);
  if (new Set(names).size !== names.length) warnings.push('TOP1·TOP2·TOP3 에 같은 호텔이 있습니다.');

  // 가격 오름차순 (호텔이야.md §6-2): 탑원 < 탑투 < 탑쓰리
  const p = Object.fromEntries(hotels.map((h) => [h.rank, h.price]));
  if (p[1] && p[2] && p[3] && !(p[1] < p[2] && p[2] < p[3])) {
    warnings.push(`가격이 오름차순이 아닙니다 (TOP1 ${p[1]} / TOP2 ${p[2]} / TOP3 ${p[3]}).`);
  }

  const chapters = parseChapters(text);
  const airport = hotels.find((h) => h.airport)?.airport || null;
  if (!airport && format === 'long') warnings.push('원고에서 공항 이름을 찾지 못했습니다.');

  // 챕터에 적힌 호텔명과 본문 호텔명이 다르면 오타다 (호텔이야.md §6-5)
  for (const h of hotels) {
    const ch = chapters.find((c) => new RegExp(`TOP\\s*${h.rank}\\b`).test(c.label));
    if (!ch) continue;
    const chName = ch.label.replace(/^TOP\s*\d\s*/, '').trim();
    if (chName && chName !== h.nameKo) {
      warnings.push(`챕터 호텔명과 본문 호텔명이 다릅니다 — 챕터 '${chName}' / 본문 '${h.nameKo}'.`);
    }
  }

  if (hotels.some((h) => !h.price)) warnings.push('가격이 없는 호텔이 있습니다.');

  return {
    ...meta,
    format,
    region: meta.regions[0] || null,
    station: stationOf(meta.regions[0]),
    hotels,
    chapters,
    airport,
    rawText: text,
    warnings,
  };
}

export default parseManuscript;
