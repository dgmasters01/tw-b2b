// _test/kw-goldenset.mjs
// 골든셋 3건 대조. 실측 장부(CSV)만 쓴다. 라이브 호출 없음.
//   node _test/kw-goldenset.mjs
import { loadRules } from '../api/_lib/youtube-rules.js';
import { buildSlotItems } from '../api/_lib/youtube-render.js';
import { buildMeasuredKeywords } from '../api/_lib/youtube-keywords.js';
import { _resetKwRulesCache } from '../api/_lib/youtube-keywords.js';

const L = (s) => [...s].length;

const CASES = [
  {
    name: '나고야역 · 호텔이곳 (3성급)',
    cid: '1946819',
    golden: 329,
    m: {
      country: '일본', city: '나고야', region: '나고야역', regions: ['나고야역'],
      station: '나고야역', star: 3, priceBand: '10만원이하', airport: '주부공항',
      hotels: [
        { rank: 1, nameKo: '컴포트 호텔 나고야 신칸센구치' },
        { rank: 2, nameKo: '소테츠 프레사 인 나고야' },
        { rank: 3, nameKo: '메이테츠 호텔 나고야 에키마에' },
      ],
    },
  },
  {
    name: '오사카 난바 · 호텔이곳 (4성급)',
    cid: '1946819',
    golden: 327,
    m: {
      country: '일본', city: '오사카', region: '난바', regions: ['난바', '도톤보리', '신사이바시'],
      station: '난바역', star: 4, priceBand: '10만원대', airport: '간사이공항',
      hotels: [
        { rank: 1, nameKo: '호텔 몬테레 그라스미어 오사카' },
        { rank: 2, nameKo: '히요리 호텔 오사카 난바 스테이션' },
        { rank: 3, nameKo: '페어필드 바이 메리어트 오사카 난바' },
      ],
    },
  },
  {
    name: '도쿄 신주쿠 · 여행능력자들 (3성급)',
    cid: '1913282',
    golden: 364,
    m: {
      country: '일본', city: '도쿄', region: '신주쿠', regions: ['신주쿠', '시부야', '니시신주쿠'],
      station: '신주쿠역', star: 3, priceBand: '10만원이하', airport: '나리타공항',
      hotels: [
        { rank: 1, nameKo: '코코 호텔 신주쿠 요츠야' },
        { rank: 2, nameKo: '호텔 마이스테이 니시 신주쿠' },
        { rank: 3, nameKo: '소테츠 프레사 인 히가시 신주쿠' },
      ],
    },
  },
];

const { byCid, root } = await loadRules();
let fail = 0;

for (const c of CASES) {
  _resetKwRulesCache();
  const rule = byCid[c.cid];
  const slotItems = buildSlotItems(c.m, rule, {}, []);
  const slotLen = L(slotItems.join(', '));
  const r = await buildMeasuredKeywords({ m: c.m, rule, slotItems, root, live: false });

  const [lo, hi] = rule.keywordLen;
  const ok = r.keywordLength >= lo && r.keywordLength <= hi;
  if (!ok) fail += 1;

  console.log('━'.repeat(72));
  console.log(`${c.name}   [${rule.channel} · cid=${rule.cid}]`);
  console.log(`  문서 골든셋 : ${c.golden}자`);
  console.log(`  슬롯만      : ${slotLen}자  (${slotItems.length}개)`);
  console.log(`  실측 연동   : ${r.keywordLength}자  (${r.keywordItems.length}개)  규격 ${lo}~${hi}  → ${ok ? '✅ 통과' : '❌ 이탈'}`);
  console.log(`  실측일      : ${r.measuredDay}`);
  console.log('');
  console.log(`  ${r.keywords}`);
  console.log('');
  const added = r.evidence.filter((e) => e.구분 === '실측 확장' || e.구분 === '페어(붙여쓰기)');
  console.log(`  ▸ 실측으로 채운 어형 ${added.length}개`);
  for (const e of added) console.log(`      ${e.키워드.padEnd(24)} 순위 ${String(e.자동완성순위 ?? '-').padStart(3)} · 경쟁 ${String(e.경쟁영상수 ?? '-').padStart(9)} · ${e.사유}`);
  const dropped = r.evidence.filter((e) => !e.채택);
  if (dropped.length) {
    console.log(`  ▸ 버린 것 ${dropped.length}개`);
    for (const e of dropped) console.log(`      ${e.키워드.padEnd(24)} ${e.사유}`);
  }
  if (r.warnings.length) {
    console.log('  ▸ 경고');
    for (const w of r.warnings) console.log(`      · ${w}`);
  }
}
console.log('━'.repeat(72));
console.log(fail ? `❌ ${fail}건 규격 이탈` : '✅ 3건 모두 규격 안');
process.exit(fail ? 1 : 0);
