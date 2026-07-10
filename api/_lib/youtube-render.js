// api/_lib/youtube-render.js
// 파싱된 원고 + 채널 규칙 → 제목 · 본문 · 해시태그 · 키워드 · 파일명
//
// 틀(제목·파일명·해시태그·키워드 슬롯)은 _content/youtube/*.md 에서 읽어온 것을 쓴다.
// 본문 블록 순서만 여기 코드에 있다 (채널마다 구조 자체가 달라서 틀로 못 쓴다).

import { NEEDS } from './youtube-parse.js';

/* ─────────────── 토큰 치환 ─────────────── */

function tokenMap(m, extras = {}) {
  const r = m.regions || [];
  const ex = extras || {};
  const map = {
    '[나라]': m.country,
    '[도시]': m.city,
    '[지역]': m.region,
    '[지역1]': r[0] || null,
    '[지역2]': r[1] || ex.region2 || null,
    '[지역3]': r[2] || ex.region3 || null,
    '[역명]': m.station,
    '[인접역]': ex.nearStation || null,
    '[인접지역1]': r[1] || ex.region2 || null,
    '[인접지역2]': r[2] || ex.region3 || null,
    '[N]': m.star != null ? String(m.star) : null,
    '[N성급]': m.star != null ? `${m.star}성급` : null,
    '[가격대]': m.priceBand,
    '[특징]': ex.feature || null,
    '[공항]': m.airport,
    '[호텔명1]': m.hotels.find((h) => h.rank === 1)?.nameKo || null,
    '[호텔명2]': m.hotels.find((h) => h.rank === 2)?.nameKo || null,
    '[호텔명3]': m.hotels.find((h) => h.rank === 3)?.nameKo || null,
  };
  return map;
}

const TOKEN_RE = /\[[^\]]+\]/g;

/** 치환하고, 못 채운 토큰이 남았는지 알려준다. */
function fill(tpl, map) {
  const missing = [];
  const out = tpl.replace(TOKEN_RE, (t) => {
    if (map[t] == null || map[t] === '') { missing.push(t); return t; }
    return map[t];
  });
  return { text: out, missing };
}

const squeeze = (s) => s.replace(/[ \t]{2,}/g, ' ').replace(/ ,/g, ',').trim();

/** 받침이 있으면 '을', 없으면 '를'. (…객실 관리를 / …환경을) */
function objectParticle(word) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '을';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}

/* ─────────────── 제목 ─────────────── */

function buildTitles(m, rule, map, warnings) {
  const dropStar = m.star != null && m.star < rule.starTitleMin;
  const seen = new Set();
  const titles = [];
  for (const tpl of rule.titleTemplates) {
    let t = tpl;
    if (dropStar) t = t.replace(/\[N성급\]\s*/g, ''); // 3성급 이하는 제목에서 제외
    const { text, missing } = fill(t, map);
    const title = squeeze(text);
    if (missing.length) warnings.push(`제목 틀에서 못 채운 칸: ${missing.join(' ')}`);
    if (!seen.has(title)) { seen.add(title); titles.push(title); }
  }
  const recommended =
    rule.channel === '호텔이야' ? 0 : (!dropStar && titles.length > 1 ? 1 : 0);

  for (const t of titles) {
    if ([...t].length > (rule.channel === '여행능력자들' ? 100 : 60)) {
      warnings.push(`제목이 글자수 한도를 넘었습니다: "${t}"`);
    }
    if (/\|/.test(t)) warnings.push('제목에 파이프(|)가 있습니다. 금지됨.');
    if (/20\d\d/.test(t)) warnings.push('제목에 연도가 있습니다. 금지됨.');
  }
  return { titles, recommended };
}

/* ─────────────── 파일명 ─────────────── */

const BAD_FILENAME = /[-,\s\\/:*?"<>|]/;

function buildFilename(rule, map, warnings) {
  const { text, missing } = fill(rule.filenameTemplate, map);
  if (missing.length) warnings.push(`파일명 틀에서 못 채운 칸: ${missing.join(' ')}`);
  const base = text.trim();
  if (BAD_FILENAME.test(base)) warnings.push(`파일명에 금지 문자가 있습니다: "${base}"`);
  if ([...base].length > 60) warnings.push(`파일명이 60자를 넘었습니다 (${[...base].length}자).`);
  if (Buffer.byteLength(base, 'utf8') > 180) warnings.push('파일명이 180바이트를 넘었습니다.');
  return { base, video: `${base}.mp4`, thumb: `${base}.jpg` };
}

/* ─────────────── 해시태그 ─────────────── */

function buildHashtags(rule, map, warnings) {
  const tags = [];
  for (const raw of rule.hashtagTemplate.split(/\s+/).filter(Boolean)) {
    const { text, missing } = fill(raw, map);
    if (missing.length) {
      warnings.push(`해시태그 ${raw} 를 못 만들어 뺐습니다 (빈 칸: ${missing.join(' ')}).`);
      continue;
    }
    tags.push(text.replace(/\s+/g, ''));
  }
  if (tags.length > 15) warnings.push('해시태그가 15개를 넘어 유튜브에서 전부 무효가 됩니다.');
  return tags;
}

/* ─────────────── 키워드 ─────────────── */

/**
 * 슬롯 템플릿만으로 만든 기반 키워드. (300~335자)
 * 실측 확장은 youtube-keywords.js 가 이 결과를 받아서 한다.
 */
export function buildSlotItems(m, rule, extras = {}, warnings = []) {
  const map = tokenMap(m, extras);
  const hotelNames = [1, 2, 3].map((r) => m.hotels.find((h) => h.rank === r)?.nameKo).filter(Boolean);
  const map2 = { ...map, '[호텔명1]': hotelNames[0], '[호텔명2]': hotelNames[1], '[호텔명3]': hotelNames[2] };

  const items = [];
  const dropped = [];
  for (const raw of rule.keywordSlotTemplate.split(',')) {
    const t = raw.replace(/\n/g, ' ').trim();
    if (!t) continue;
    const { text, missing } = fill(t, map2);
    if (missing.length) { dropped.push(t); continue; }
    const v = squeeze(text);
    if (!items.includes(v)) items.push(v);
  }
  for (const extra of extras.keywords || []) if (!items.includes(extra)) items.push(extra);
  if (dropped.length) warnings.push(`키워드 ${dropped.length}개를 못 만들어 뺐습니다: ${dropped.join(' / ')}`);
  return items;
}

function buildKeywords(m, rule, map, extras, warnings) {
  const items = buildSlotItems(m, rule, extras, warnings);
  const text = items.join(', ');
  const len = [...text].length;
  const [lo, hi] = rule.keywordLen;
  if (len < lo) warnings.push(`키워드가 ${len}자로 권장 하한(${lo}자)보다 짧습니다. 실측 키워드를 extras.keywords 로 보태주세요.`);
  if (len > hi) warnings.push(`키워드가 ${len}자로 권장 상한(${hi}자)을 넘었습니다.`);
  if (len > 500) warnings.push('키워드가 유튜브 태그란 한도(500자)를 넘었습니다.');

  return { keywords: text, keywordItems: items, keywordLength: len };
}

/* ─────────────── 선정 기준 자동 추출 ─────────────── */
// 여행능력자들.md §3 블록2: "3개 호텔이 공통 언급한 항목 상위 3개", 명사형.

const CRITERIA = [
  [/역세권|지하철역|역 바로|도보|한복판|중간/, '역 도보권'],
  [/조용|소음 없|유흥가와 떨어/, '조용한 주변 환경'],
  [/짐 보관|캐리어를 (무료로 )?보관|수하물 락커/, '무료 짐 보관'],
  [/깨끗|청결|깔끔|정갈/, '깨끗한 객실 관리'],
  [/편의점|마트|백화점|쇼핑/, '편의점·쇼핑 접근성'],
  [/조식|아침 ?식사/, '조식 제공'],
  [/공기청정기|제빙기|전자레인지|마사지기|커피 머신/, '객실 편의 기기'],
  [/키오스크|비대면|스마트 체크인/, '비대면 체크인'],
];

function pickCriteria(m, warnings) {
  const sections = m.hotels.map((h) => {
    const i = m.rawText.indexOf(h.nameKo);
    return i < 0 ? '' : m.rawText.slice(i, i + 1200);
  });
  const scored = CRITERIA.map(([re, label], idx) => ({
    label,
    hits: sections.filter((s) => re.test(s)).length,
    idx,
  }))
    .filter((c) => c.hits >= 2)
    .sort((a, b) => b.hits - a.hits || a.idx - b.idx)
    .slice(0, 3)
    .map((c) => c.label);

  if (scored.length < 3) {
    warnings.push('선정 기준 3개를 원고에서 뽑지 못했습니다. 직접 확인해 주세요.');
    while (scored.length < 3) scored.push(NEEDS);
  } else {
    warnings.push('선정 기준 3개는 원고에서 자동 추출했습니다. 한 번 읽어봐 주세요.');
  }
  return scored;
}

/* ─────────────── 공통 조각 ─────────────── */

const md = (d) => (d ? `${d.fromMonth}/${d.fromDay}~${d.toMonth}/${d.toDay}` : NEEDS);
const mdFull = (d) => (d ? `${d.fromMonth}월 ${d.fromDay}일~${d.toMonth}월 ${d.toDay}일` : NEEDS);
const won = (n) => (n ? `${n.toLocaleString('en-US')}원` : NEEDS);
const link = (m, r) => m.links?.[`top${r}`] || NEEDS;
const byRank = (m, r) => m.hotels.find((h) => h.rank === r) || {};

function chapterLines(m, lastLabel, map) {
  const nights = m.dateRange ? Math.max(1, (m.dateRange.toDay - m.dateRange.fromDay) || 1) : 1;
  const cond = `${m.region}·${m.priceBand}·${m.star}성급`;
  if (!m.chapters.length) return null;
  const out = [];
  for (const c of m.chapters) {
    if (/오늘의 조건/.test(c.label)) out.push(`${c.time} 오늘의 조건 (${cond})`);
    else if (/^TOP\s*\d/.test(c.label)) {
      const r = Number(/TOP\s*(\d)/.exec(c.label)[1]);
      out.push(`${c.time} TOP${r} ${byRank(m, r).nameKo || NEEDS}`);
    } else out.push(`${c.time} ${lastLabel}`);
  }
  void nights; void map;
  return out;
}

function nightsPax(m) {
  const n = m.dateRange ? Math.max(1, m.dateRange.toDay - m.dateRange.fromDay) : null;
  return { nights: n, pax: m.pax };
}

/* ─────────────── 본문: 여행능력자들 (숏폼) ─────────────── */

function bodyTW(m, tags, warnings) {
  const c = pickCriteria(m, warnings);
  const np = nightsPax(m);
  const L = [];
  L.push(`${m.city} ${m.region} ${m.priceBand} 가성비 ${m.star}성급 호텔 TOP3 추천합니다.`);
  L.push('');
  L.push(`${c[0]}, ${c[1]}, ${c[2]}${objectParticle(c[2])} 기준으로 ${m.region} ${m.star}성급 호텔을 비교해 선정했어요. (가격은 ${md(m.dateRange)} ${np.pax ?? NEEDS}인 기준)`);
  L.push('');
  L.push('━━━━━━━━━━━━━━━');
  const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }; // 여행능력자들.md §3 블록3
  for (const r of [1, 2, 3]) {
    const h = byRank(m, r);
    L.push(`${MEDAL[r]} TOP${r}. ${h.nameKo || NEEDS}`);
    L.push(`👉 예약: ${link(m, r)}`);
    L.push('');
  }
  L.push('━━━━━━━━━━━━━━━');
  L.push('');
  L.push('※ 호텔 가격은 보시는 시점에 따라 상이할 수 있습니다.');
  L.push('※ 해당 링크로 예약하시면 아고다에서 여행능력자들에게 소정의 수수료를 지급하며, 더 좋은 콘텐츠를 만드는 원동력이 됩니다.');
  L.push('');
  const others = (m.extras?.otherCities || []).slice(0, 2);
  if (others.length < 2) warnings.push('구독 문구의 [타도시] 2개가 없습니다. extras.otherCities 로 넣어주세요.');
  const citiesStr = [m.city, ...(others.length ? others : [NEEDS, NEEDS])].join('·');
  L.push(`🏨 매일 새로운 ${citiesStr} 등 가성비 호텔 추천을 받아보고 싶다면 구독!`);
  L.push('🔗 전체 호텔 예약 링크: www.여행능력자들.shop');
  L.push('');
  const r = m.regions;
  const ex = m.extras || {};
  const r2 = r[1] || ex.region2 || NEEDS;
  const r3 = r[2] || ex.region3 || NEEDS;
  const spots = [r[0], r2, r3, m.station, m.city];
  L.push(`이 영상은 ${spots.join(', ')} 주변 여행을 준비하는 분들을 위한`);
  L.push(`가성비 숙소 가이드입니다. ${m.city} ${m.star}성급 호텔, ${m.station} 근처 숙소,`);
  // 여행능력자들.md §3 블록7: 호텔은 [지역1] 에 있다. [지역2] 도보권이 아니다.
  L.push(`${r[0]} 도보권 가성비 호텔을 한 번에 비교하세요.`);
  L.push('');
  L.push(tags.join(' '));
  return L.join('\n');
}

/* ─────────────── 본문: 호텔이야 (롱폼) ─────────────── */

function bodyHY(m, tags, warnings) {
  const c = pickCriteria(m, warnings);
  const np = nightsPax(m);
  const L = [];
  L.push(`${m.city} 호텔 중에서도 ${m.region} 가성비 호텔을 찾는 분들을 위해, ${m.priceBand} ${m.star}성급 숙소만 정리했습니다.`);
  L.push(`${m.station} 도보권, ${c[1]}, ${c[2]}${objectParticle(c[2])} 기준으로 검증한 ${m.city} 숙소 TOP3입니다.`);
  L.push('');
  L.push('🏷️ 아래의 최저가 예약 링크입니다.');
  L.push('');
  for (const r of [1, 2, 3]) {
    const h = byRank(m, r);
    L.push(`▶ ${r}위 · ${h.nameKo || NEEDS}${h.nameEn ? ` (${h.nameEn})` : ''}`);
    L.push(`   ${m.station} 도보 ${h.walkMin ?? NEEDS}분 · 1박 약 ${won(h.price)} · 평점 ${h.rating ?? NEEDS} · ${m.airport || NEEDS} 약 ${h.airportMin ?? NEEDS}분`);
    L.push(`   🔗 최저가 확인: ${link(m, r)}`);
    L.push('');
  }
  if (m.hotels.some((h) => !h.rating)) warnings.push('평점이 없는 호텔이 있습니다. 호텔이야 본문에는 평점이 필요합니다.');
  L.push('─────────────────');
  L.push(`※ 조사 기준: ${mdFull(m.dateRange)}(${np.nights ?? NEEDS}박·${np.pax ?? NEEDS}인) 아고다 기준`);
  L.push('');
  const ch = chapterLines(m, '예약 방법');
  if (ch) { L.push('⏱️ 챕터'); L.push(...ch); L.push(''); }
  else warnings.push('원고에 챕터 타임스탬프가 없습니다. 호텔이야는 챕터가 필요합니다.');
  L.push('🏨 호텔 한눈에 보기');
  L.push('');
  for (const r of [1, 2, 3]) {
    const h = byRank(m, r);
    L.push(`▪ ${h.nameKo || NEEDS}`);
    L.push(`  ${h.perks?.length ? h.perks.join(' · ') : NEEDS}`);
    L.push(`  ${h.spots?.length ? h.spots.slice(0, 3).join(' · ') : NEEDS}`);
    L.push('');
  }
  const mins = m.hotels.map((h) => h.airportMin).filter(Boolean);
  L.push(`추천 호텔은 ${m.airport || NEEDS}에서 ${m.station}까지 이동해 약 ${mins.length ? `${mins[0]}~${mins[mins.length - 1]}` : NEEDS}분이면 도착합니다.`);
  L.push('');
  L.push(`🔔 매일 저녁 ${m.city} 호텔 정보를 올립니다. 구독하고 알림 설정 🔔`);
  L.push('');
  L.push('※ 가격은 조사 시점 기준이며, 예약일과 객실 조건에 따라 달라질 수 있습니다.');
  L.push('※ 위 링크를 통해 예약이 이루어지면 아고다로부터 일정 수수료가 호텔이야 채널에 지급되며, 더 나은 호텔 정보를 제작하는 데 사용됩니다.');
  L.push('');
  L.push(tags.join(' '));
  void c;
  return L.join('\n');
}

/* ─────────────── 본문: 호텔이곳 (롱폼) ─────────────── */

function bodyHG(m, tags, warnings) {
  const np = nightsPax(m);
  const mins = m.hotels.map((h) => h.airportMin).filter(Boolean);
  const L = [];
  L.push(`${m.city} 호텔 추천을 찾는다면, ${m.region} 호텔 중에서 ${m.priceBand} ${m.star}성급만 골라 정리했습니다.`);
  L.push(`${m.airport || NEEDS}에서 ${mins.length ? `${mins[mins.length - 1]}분` : NEEDS} 이내, ${m.station} 도보권, 무료 짐 보관까지 확인한 ${m.city} 가성비 숙소 추천 TOP3입니다.`);
  L.push('');
  L.push('🔻 최저가 링크는 아래를 참고해주세요.');
  L.push('');
  for (const r of [1, 2, 3]) {
    const h = byRank(m, r);
    L.push(`🏅 TOP${r} · ${h.nameKo || NEEDS}${h.nameEn ? ` (${h.nameEn})` : ''}`);
    L.push(`   ${m.station} 도보 ${h.walkMin ?? NEEDS}분 · ${m.airport || NEEDS} ${h.airportMin ?? NEEDS}분`);
    L.push(`   ${h.perks?.length ? h.perks.join(' · ') : NEEDS}`);
    L.push(`   ➜ 예약 바로가기: ${link(m, r)}`);
    L.push('');
  }
  L.push('═════════════════');
  L.push(`※ 기간 : ${mdFull(m.dateRange)} (${np.nights ?? NEEDS}박·${np.pax ?? NEEDS}인) 기준`);
  L.push('');
  const ch = chapterLines(m, '최저가 확인 방법');
  if (ch) { L.push('🎬 챕터'); L.push(...ch); L.push(''); }
  else warnings.push('원고에 챕터 타임스탬프가 없습니다. 호텔이곳은 챕터가 필요합니다.');
  L.push('🚶 주변 명소');
  L.push('');
  for (const r of [1, 2, 3]) {
    const h = byRank(m, r);
    L.push(`🔸 ${h.nameKo || NEEDS}`);
    const s = h.spots || [];
    L.push(`   ${s.length ? s.slice(0, 3).join(' · ') : NEEDS}`);
    if (s.length > 3) L.push(`   ${s.slice(3, 5).join(' · ')}`);
    L.push('');
  }
  L.push(`추천호텔들은 ${m.airport || NEEDS}에서 열차를 타고 ${m.station}에 내리면`);
  L.push(`${mins.length ? `${Math.min(...mins.map((x) => parseInt(x, 10)))}~${Math.max(...mins.map((x) => parseInt(x, 10)))}` : NEEDS}분 만에 도착합니다. ${m.city} 위치를 고민하시는 분들에게`);
  L.push('이 호텔들을 추천드립니다.');
  L.push('');
  L.push(`호텔이곳은 ${m.city} 호텔 추천부터 ${m.station} 숙소 위치까지, 지도로 확인한 정보만 제공합니다.`);
  L.push('구독하고 호텔 추천을 받아 보세요.');
  L.push('');
  L.push('※ 요금은 예약 날짜에 따라 변동될 수 있습니다.');
  L.push('※ 링크를 통해서 예약이 완료되면 아고다에서 호텔이곳 채널에 일정 수수료를 지급합니다.');
  L.push('');
  L.push(tags.join(' '));
  return L.join('\n');
}

/* ─────────────── 나레이션 ─────────────── */

function narration(m, channel) {
  if (channel === '여행능력자들')
    return `${m.region}에서 ${m.priceBand}로 잡는 가성비 ${m.star}성급 호텔 탑쓰리를 추천해 드릴게요!`;
  if (channel === '호텔이야')
    return `${m.city} ${m.region}에서 ${m.priceBand}로 잡는 가성비 ${m.star}성급 호텔 탑쓰리를 소개해 드릴게요!`;
  return `${m.country} ${m.city} 여행, 숙소 어디로 잡을지 고민이죠?\n${m.station} 도보권, ${m.priceBand} 가성비 ${m.star}성급 호텔 탑쓰리를 추천해 드립니다.`;
}

/* ─────────────── 메인 ─────────────── */

const BODY = { 여행능력자들: bodyTW, 호텔이야: bodyHY, 호텔이곳: bodyHG };

/**
 * @param {object} manuscript parseManuscript() 결과 (+ links, extras)
 * @param {object} rule       loadRules() 의 채널 규칙
 * @param {object} [opts]     opts.keywords = youtube-keywords.js 의 실측 결과.
 *                            주면 슬롯 계산 대신 그걸 쓴다. 안 주면 예전대로 슬롯만.
 */
export function render(manuscript, rule, opts = {}) {
  const warnings = [...manuscript.warnings];
  const extras = manuscript.extras || {};
  const m = { ...manuscript, extras };

  // 롱폼/숏폼이 채널과 맞는가
  const wantShort = rule.channel === '여행능력자들';
  if (wantShort && m.format === 'long') warnings.push('숏폼 채널인데 원고가 롱폼 모양입니다.');
  if (!wantShort && m.format === 'short') warnings.push('롱폼 채널인데 원고가 숏폼 모양입니다.');

  // 링크 cid·hid 확인 (원고에는 링크가 없다. 호출할 때 links 로 넣어야 한다)
  if (![1, 2, 3].every((r) => m.links?.[`top${r}`])) {
    warnings.push('아고다 예약 링크가 없습니다. links.top1/top2/top3 로 넣어주세요. (원고에는 링크가 없습니다)');
  }
  for (const r of [1, 2, 3]) {
    const u = m.links?.[`top${r}`];
    if (!u) continue;
    const c = /[?&]cid=(\d+)/.exec(u);
    if (!c) warnings.push(`TOP${r} 링크에 cid 가 없습니다.`);
    else if (c[1] !== rule.cid) warnings.push(`TOP${r} 링크 cid=${c[1]} 가 ${rule.channel}(cid=${rule.cid}) 와 다릅니다.`);
    if (!/[?&]hid=(\d+)/.test(u)) warnings.push(`TOP${r} 링크에 hid 가 없습니다.`);
  }

  const map = tokenMap(m, extras);
  const { titles, recommended } = buildTitles(m, rule, map, warnings);
  const filename = buildFilename(rule, map, warnings);
  const hashtags = buildHashtags(rule, map, warnings);
  const kw = opts.keywords || buildKeywords(m, rule, map, extras, warnings);
  if (opts.keywords?.warnings) warnings.push(...opts.keywords.warnings);
  const description = BODY[rule.channel](m, hashtags, warnings);

  const hid = (r) => (/[?&]hid=(\d+)/.exec(m.links?.[`top${r}`] || '') || [])[1] || null;

  return {
    channel: rule.channel,
    cid: rule.cid,
    format: m.format,
    filename,
    titles,
    title: titles[recommended],
    narration: narration(m, rule.channel),
    description,
    hashtags,
    keywords: kw.keywords,
    keywordLength: kw.keywordLength,
    // 왜 이 어형을 넣고 저 어형을 뺐는지. 실측 근거 (키워드-실측.md §6)
    keywordEvidence: kw.evidence || null,
    keywordMeasuredDay: kw.measuredDay || null,
    // publications 장부에 그대로 넣을 수 있는 한 줄
    publicationRow: {
      channel_code: { 여행능력자들: 'TW', 호텔이야: 'HT', 호텔이곳: 'HG' }[rule.channel],
      cid: rule.cid,
      status: 'draft',
      country: m.country,
      city: m.city,
      region: m.region,
      star: m.star,
      price_band: m.priceBand,
      title: titles[recommended],
      hid_top1: hid(1),
      hid_top2: hid(2),
      hid_top3: hid(3),
      source_filename: m.sourceFilename || null,
      // studio.html 이 복사 버튼으로 내보낼 것들. 만들어놓고 버리지 않는다.
      description,
      keywords: kw.keywords,
      keyword_length: kw.keywordLength,
      hashtags,
      filename_base: filename.base,
      chapters: m.chapters?.length ? m.chapters : null,
      narration: narration(m, rule.channel),
      hotel_names: m.hotels.map((h) => h.nameKo).filter(Boolean),
      date_range: m.dateRange ? md(m.dateRange) : null,
      pax: m.pax ?? null,
    },
    warnings: [...new Set(warnings)],
  };
}

export default render;
