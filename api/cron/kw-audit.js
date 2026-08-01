// /api/cron/kw-audit.js
// 키워드 자료가 «말이 되는지» 매일 스스로 검사한다. 틀린 게 있으면 고치고, 못 고치면 알린다.
//
// ═══ 왜 만들었나 (2026-08-01 대표님) ═══
//   *"방금과 같은 부분이 생기면 차트의 정확성이 떨어지잖아. 이렇게 되지 않게 판단하고 체크할 수 있는
//     일군이 있어야 되는 거 아니야? 우리가 다른 나라 도시들 지역들도 이런 문제가 생기면 안 되잖아.
//     추후 외국어 타겟도 똑같은 문제가 생기면 안 됨."*
//
//   맞다. 지금까지는 **대표님이 화면을 보다가 발견**했다:
//     · 「가오슝 여행」이 숙박 칸에 (씨앗 축을 물려받아서)
//     · 「하카타 전체 73 / 우리 89」 (분모가 옛 표)
//     · 「난바」인데 빵부스러기가 후쿠오카
//   사람이 눈으로 잡는 건 한계가 있다. **기계가 매일 훑어야 한다.**
//
// ═══ 무엇을 검사하나 ═══
//   ① 축이 말이 되나   — 「여행」이 든 말이 숙박 칸에 있나 (자동으로 고친다)
//   ② 도시가 맞나      — 검색어에 그 도시 이름이 들어있나
//   ③ 분모가 말이 되나  — 「우리 > 전체」인 지역이 있나 (분모가 틀렸다는 뜻)
//   ④ 짝이 맞나        — 붙여쓰기 짝이 한국어 아닌 언어에 붙어 있나
//   ⑤ 빈 껍데기        — 검색어는 있는데 측정이 하나도 없는 도시
//
// ═══ 원칙 ═══
//   · **고칠 수 있는 건 고친다**(축 분류). 애매한 건 «알리기만» 한다 — 지어내지 않는다.
//   · 결과는 `kw_audit_log` 에 남긴다. 화면이 이걸 읽어 「이상 N건」을 보여준다.
//   · 언어가 늘어도 그대로 돈다 — 언어별 단어는 kw-survey-now 의 사전을 그대로 쓴다.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 120 };

/** kw-survey-now.js 의 SEEDS_BY_LANG 과 같은 뜻. 여기선 검사에 필요한 것만. */
const WORDS = {
  ko: {
    stay: ['호텔', '숙소', '리조트', '료칸', '게스트하우스', '펜션', '민박', '숙박', '도미토리', '캡슐', '모텔', '글램핑', '여관', '온천'],
    travel: ['여행', '자유여행', '브이로그', '코스', '여행지', '일정', '관광', '맛집', '패키지', '투어', '놀거리', '먹방', '쇼핑', '교통', '항공권', '당일치기', '준비물', '경비', '날씨', '혼자', '가족여행'],
    spacing: true,
  },
  ja: { stay: ['ホテル', '宿', '旅館', 'リゾート', '民宿'], travel: ['旅行', '観光', 'グルメ', '一人旅', 'プラン'], spacing: false },
  en: { stay: ['hotel', 'hotels', 'accommodation', 'resort', 'hostel', 'guesthouse', 'motel', 'stay'],
        travel: ['travel', 'trip', 'itinerary', 'things to do', 'vlog', 'tour', 'guide', 'food', 'attractions'], spacing: false },
  zh: { stay: ['飯店', '酒店', '住宿', '民宿', '度假村'], travel: ['旅遊', '自由行', '景點', '美食', '行程', '攻略'], spacing: false },
};

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function authOK(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN;
  if (ops && (req.headers['x-ops-token'] || '') === ops) return true;
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers['authorization'] || '') === `Bearer ${secret}`) return true;
  return (req.headers['user-agent'] || '').includes('vercel-cron');
}

const lastHit = (t, words) => { let at = -1; for (const w of words) { const i = t.lastIndexOf(w); if (i > at) at = i; } return at; };

/** 나온 말을 보고 축을 정한다 (kw-survey-now 의 axisOf 와 같은 규칙). */
function axisOf(text, lang, fallback) {
  const W = WORDS[lang]; if (!W) return fallback;
  const t = String(text || '');
  const s = lastHit(t, W.stay), v = lastHit(t, W.travel);
  if (s < 0 && v < 0) return fallback;
  if (s < 0) return 'travel';
  if (v < 0) return 'stay';
  return s > v ? 'stay' : 'travel';
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const dry = req.query.dry_run === '1';

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }

  const problems = [];
  let fixed = 0;

  // ── ① 축이 말이 되나 (고칠 수 있다) ──
  // ⚠ Supabase 는 한 번에 1,000줄만 준다. limit 을 크게 적어도 소용없다.
  //   전부 보려면 **나눠서** 읽어야 한다. 안 그러면 앞 1,000개만 검사하고 「이상 없음」이라 말한다.
  const kws = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('keyword')
      .select('id, text, axis, target_code, city_key, kind')
      .eq('alive', true).range(from, from + 999);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data || !data.length) break;
    kws.push(...data);
    if (data.length < 1000) break;
    if (kws.length > 60000) break;   // 안전장치
  }

  const wrongAxis = [];
  for (const k of kws || []) {
    const want = axisOf(k.text, k.target_code, k.axis);
    if (want !== k.axis) wrongAxis.push({ id: k.id, text: k.text, from: k.axis, to: want });
  }
  if (wrongAxis.length && !dry) {
    for (let i = 0; i < wrongAxis.length; i += 200) {
      const part = wrongAxis.slice(i, i + 200);
      for (const w of part) { await sb.from('keyword').update({ axis: w.to }).eq('id', w.id); }
    }
    fixed += wrongAxis.length;
  }
  if (wrongAxis.length) {
    problems.push({ kind: 'axis', n: wrongAxis.length, fixed: !dry,
      sample: wrongAxis.slice(0, 5).map((w) => `${w.text} (${w.from}→${w.to})`) });
  }

  // ── ② 붙여쓰기 짝이 한국어 아닌 언어에 붙어 있나 (알리기만) ──
  const badPair = (kws || []).filter((k) => k.kind === 'joined' && !(WORDS[k.target_code] || {}).spacing);
  if (badPair.length) {
    problems.push({ kind: 'spacing', n: badPair.length, fixed: false,
      note: '붙여쓰기 짝은 한국어에서만 뜻이 있다. 다른 언어에 붙어 있으면 잘못 캔 것이다.',
      sample: badPair.slice(0, 5).map((k) => `${k.text} (${k.target_code})`) });
  }

  // ── ③ 도시 이름이 안 든 검색어 (알리기만 — 지역명일 수도 있어 함부로 안 지운다) ──
  const { data: alias } = await sb.from('city_alias').select('city_key, label');
  const labelOf = {}; for (const a of alias || []) if (!labelOf[a.city_key]) labelOf[a.city_key] = a.label;
  // 🔴 지역명만 든 검색어(「난바 숙소」)는 **정상**이다 — 오사카의 지역이니까.
  //   그걸 문제로 세면 143건이 쉬지 않고 울려대서 진짜 문제가 묻힌다.
  //   → 그 도시의 **지역 이름**도 같이 본다. 둘 다 없을 때만 알린다.
  const { data: dist } = await sb.from('hotels').select('city, district').not('district', 'is', null);
  const distNames = new Set((dist || []).map((d) => String(d.district || '').replace(/\s+/g, '')));
  const noCity = (kws || []).filter((k) => {
    const l = labelOf[k.city_key]; if (!l) return false;
    const flat = String(k.text).replace(/\s+/g, '');
    if (flat.includes(l.replace(/\s+/g, ''))) return false;
    for (const d of distNames) { if (d && d.length > 1 && flat.includes(d)) return false; }
    return true;
  });
  if (noCity.length) {
    problems.push({ kind: 'city_name', n: noCity.length, fixed: false,
      note: '검색어에 도시 이름이 없다. 지역명만 든 것일 수 있으니 사람이 본다.',
      sample: noCity.slice(0, 5).map((k) => `${k.text} (${labelOf[k.city_key]})`) });
  }

  // ── ④ 분모가 말이 되나 — 우리 > 전체 인 지역 (알리기만) ──
  try {
    const { data: ds } = await sb.from('v_district_star').select('city, district, star, agoda_total, ours');
    const bad = (ds || []).filter((d) => (d.ours || 0) > (d.agoda_total || 0) && (d.agoda_total || 0) > 0);
    const zero = (ds || []).filter((d) => (d.agoda_total || 0) === 0 && (d.ours || 0) > 0);
    if (bad.length) problems.push({ kind: 'denominator', n: bad.length, fixed: false,
      note: '「우리」가 「전체」보다 많다 = 분모가 덜 채워졌다. 그 나라 아고다 호텔을 더 넣어야 한다.',
      sample: bad.slice(0, 5).map((d) => `${d.city} ${d.district} ${d.star}성 (우리 ${d.ours} > 전체 ${d.agoda_total})`) });
    if (zero.length) problems.push({ kind: 'denominator_zero', n: zero.length, fixed: false,
      note: '분모가 0이다. 아고다 호텔 파일에 그 나라가 안 들어갔을 수 있다(예: 한국).',
      sample: [...new Set(zero.map((d) => `${d.city} ${d.district}`))].slice(0, 5) });
  } catch { /* 뷰가 없으면 건너뛴다 */ }

  // ── ⑤ 검색어는 있는데 측정이 없는 도시 (알리기만) ──
  const cityHas = {};
  for (const k of kws || []) cityHas[k.city_key] = true;
  const { data: measured } = await sb.from('trend').select('keyword_id').limit(1);
  if (measured) {
    const { data: snaps } = await sb.from('snapshot').select('city_key, status');
    const doneCity = new Set((snaps || []).filter((s) => s.status === 'done').map((s) => s.city_key));
    const noMeasure = Object.keys(cityHas).filter((c) => !doneCity.has(c));
    if (noMeasure.length) problems.push({ kind: 'no_measure', n: noMeasure.length, fixed: false,
      note: '검색어는 캤는데 아직 한 번도 측정이 안 끝난 도시다. 봇이 차례로 잰다.',
      sample: noMeasure.slice(0, 5) });
  }

  // ── 기록 ──
  const summary = { at: new Date().toISOString(), checked: (kws || []).length, fixed, problems };
  if (!dry) {
    try { await sb.from('kw_audit_log').insert({ result: summary, problem_count: problems.length, fixed_count: fixed }); }
    catch { /* 표가 없으면 기록만 건너뛴다 */ }
  }

  return res.status(200).json({ ok: true, dry_run: dry, ...summary });
}
