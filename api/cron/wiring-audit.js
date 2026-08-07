// /api/cron/wiring-audit.js
// 「한 곳만 고치고 다른 곳은 안 고쳐서」 생기는 어긋남을 매일 스스로 찾아낸다.
//
// ═══ 왜 만들었나 (2026-08-02 대표님) ═══
//   *"문제는 네가 한 페이지에 무엇을 고치면 이와 연동된 다른 페이지 것도 체크하여
//     문제없이 돌아가게 체크하여 연동된 전체 페이지들 수정해야 되는데,
//     계속 일부분만 수정하여 또 다른 페이지 가면 고친 형태가 아니고 예전 형태로 되어 있고
//     이런 분이 많이 발생. 이 부분을 해결하기 위해 너의 시스템을 짜라."*
//
//   실제로 오늘 하루에만 이런 일이 여러 번 있었다:
//     · 성급 분포 분모를 `v_district_star` 에서만 고쳤는데 지역 요약(`invNear`)은 옛 표 → 「미개척 -53곳」
//     · 스튜디오 키워드만 고치고 확정본 프리뷰는 그대로 → 다음 이식 때 날아갈 뻔
//     · 「봇」 표현을 화면에서 뺐는데 영어 사전에는 남음
//
// ═══ 무엇을 검사하나 ═══
//   ① 같은 뜻인데 «다른 곳에서 세는» 숫자 — 분모가 표마다 다르면 어긋난 것이다
//   ② 화면 두 벌(studio.html ↔ studio-keyword-preview.html)이 갈라졌나
//   ③ 옛 표(`agoda_inventory`)를 아직 분모로 쓰는 코드가 있나
//   ④ 호텔 자료를 쓰는 페이지들이 같은 창구를 보는가
//
// ═══ 원칙 ═══
//   · **고치지 않는다. 알리기만 한다.** 코드를 자동으로 바꾸면 더 큰 사고가 난다.
//   · 결과는 `wiring_audit_log` 에 남기고, 관리자 건강검진에 뜬다.
//
// ═══ 2026-08-07 추가 — 「화면에 값이 박혀 있나」 (대표님이 발견) ═══
//   *"타이베이의 지역메뉴를 누르고 다시 타이베이를 클릭하니 일본 오사카로 뜸.
//     정석적으로 체크해서 이런 것 찾아서 수정하는 로봇 없는 거야? 자꾸 이런 부분이 생겨."*
//   진짜 원인 두 개 — **둘 다 사람 눈으로만 잡히던 것**이라 항목으로 넣는다:
//     ⓐ `svCity()` 가 `'cc:japan|osaka'` 를 **박아** 두고 있었다 → 어느 도시를 봐도 오사카를 불렀다
//     ⓑ 같은 파일 안에서 `var SV` 를 **두 번 선언**했다 → 뒤엣것이 앞엣것 자료를 통째로 덮어썼다
//   → ④ 도시 열쇠 박힘 · ⑤ 전역 이름 두 번 선언 을 매일 자동으로 훑는다.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 120 };

const RAW = 'https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/';

/** 같이 움직여야 하는 짝 — 한쪽만 고치면 어긋난다 */
const PAIRS = [
  { a: 'studio.html', b: 'studio-keyword-preview.html',
    why: '키워드 화면은 두 벌이다. 프리뷰가 원본이고 이식 도구로 studio 에 옮긴다. 한쪽만 고치면 다음 이식 때 날아간다.',
    marks: ['kwAdd', 'svPick', 'fixName', 'kwFixGo', 'SS_SKIP', 'stBrowserLang', 'lastsv'] },
];

/** 이제 분모로 쓰면 안 되는 것 — 도시당 100~200개뿐이라 「우리 > 전체」가 나온다 */
const STALE = [
  { file: 'api/content-keywords.js', bad: "from('agoda_inventory')",
    why: '지역 분모는 agoda_hotel(52만 건)로 센다. agoda_inventory 는 사진·후기용이다.' },
];

/** 값이 박히면 안 되는 화면들 — 도시가 늘어날수록 위험해진다 */
const SCREENS = ['studio.html', 'studio-keyword-preview.html'];

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

/** 설명글(/* ... *\/ 과 // 줄)을 지운 사본 — 줄 번호는 그대로 둔다.
 *  🔴 안 지우면 «설명글에 적어둔 예시»를 진짜 코드로 착각해 매일 헛신고한다 (2026-08-07 시험에서 잡음). */
function codeOnly(t) {
  return String(t)
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^([ \t]*)\/\/.*$/gm, (m, sp) => sp);
}

async function grab(path) {
  try {
    const r = await fetch(RAW + path, { cache: 'no-store' });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const dry = req.query.dry_run === '1';
  const problems = [];

  // ── ① 화면 두 벌이 갈라졌나 ──
  for (const p of PAIRS) {
    const [A, B] = await Promise.all([grab(p.a), grab(p.b)]);
    if (!A || !B) continue;
    const missing = p.marks.filter((m) => (A.includes(m) ? 1 : 0) !== (B.includes(m) ? 1 : 0));
    if (missing.length) {
      problems.push({ kind: 'pair_drift', n: missing.length,
        note: `${p.a} 와 ${p.b} 가 갈라졌습니다. ${p.why}`,
        sample: missing.map((m) => `${m} — ${A.includes(m) ? p.a : p.b} 에만 있음`) });
    }
  }

  // ── ② 옛 분모를 아직 쓰는 코드 ──
  for (const s of STALE) {
    const t = await grab(s.file);
    if (t && t.includes(s.bad)) {
      problems.push({ kind: 'stale_source', n: 1,
        note: `${s.file} 가 아직 ${s.bad} 를 씁니다. ${s.why}`, sample: [s.file] });
    }
  }

  // ── ④ 화면 코드에 «도시 열쇠»가 박혀 있나 (2026-08-07) ──
  //     `cc:japan|osaka` 같은 값이 코드에 박히면, 다른 도시를 눌러도 그 도시 자료가 나온다.
  //     지금 보고 있는 도시(SVKEY/변수)를 따라가야 한다.
  for (const f of SCREENS) {
    const t0 = await grab(f);
    if (!t0) continue;
    const t = codeOnly(t0);
    const hits = [];
    const re = /['"`]cc:[a-z_]+\|[a-z_]+['"`]/gi;
    let m;
    while ((m = re.exec(t))) {
      const line = t.slice(0, m.index).split('\n').length;
      const ctx = t.split('\n')[line - 1] || '';
      if (/^\s*(\/\/|\*|\/\*)/.test(ctx)) continue;                                               // 설명글(주석)은 코드가 아니다
      if (/\|\|\s*$|\|\|\s*['"`]/.test(ctx.slice(0, ctx.indexOf(m[0]) + m[0].length))) continue; // `X || 'cc:...'` = 기본값이라 정상
      if (/^\s*(var|let|const)\s+SVKEY|SVCITY\s*=/.test(ctx)) continue;                            // 첫 화면 기본값은 정상
      hits.push(`${f}:${line} ${m[0]}`);
    }
    if (hits.length) problems.push({ kind: 'hardcoded_city', n: hits.length,
      note: '화면 코드에 도시 열쇠가 박혀 있습니다. 다른 도시를 눌러도 이 도시 자료가 나옵니다.',
      sample: hits.slice(0, 5) });
  }

  // ── ⑤ 한 파일 안에서 같은 전역 이름을 두 번 선언했나 (2026-08-07) ──
  //     `var SV` 를 두 곳에서 선언하면 뒤엣것이 앞엣것을 **말없이 덮어쓴다.**
  //     타이베이 자리에 오사카가 뜬 진짜 범인이 이것이었다.
  for (const f of SCREENS) {
    const t0 = await grab(f);
    if (!t0) continue;
    const t = codeOnly(t0);
    const seen = {};
    // 🔴 «맨 왼쪽에서 시작하는» var 만 전역이다. 함수 안 들여쓴 var 는 그 함수 것이라 안 부딪친다
    //    (안 조이면 ZC·CH 처럼 함수 안 이름까지 매일 헛신고한다 — 2026-08-07 시험에서 잡음)
    const re = /^var[ \t]+([A-Z][A-Z0-9_]{1,12})[ \t]*=/gm;
    let m;
    while ((m = re.exec(t))) {
      const line = t.slice(0, m.index).split('\n').length;
      (seen[m[1]] = seen[m[1]] || []).push(line);
    }
    const dup = Object.entries(seen).filter(([, v]) => v.length > 1);
    if (dup.length) problems.push({ kind: 'global_redeclare', n: dup.length,
      note: `${f} 안에서 같은 전역 이름을 두 번 선언했습니다. 뒤엣것이 앞엣것 자료를 덮어씁니다.`,
      sample: dup.slice(0, 5).map(([k, v]) => `${k} — ${v.join(', ')}줄`) });
  }

  // ── ③ 같은 뜻인데 표마다 다르게 세는 숫자 ──
  let sb = null;
  try { sb = admin(); } catch { /* DB 못 붙으면 코드 검사만 */ }
  if (sb) {
    try {
      // 호텔 장부의 좌표·주소·아고다번호 채움 정도 — 하나라도 크게 비면 화면들이 서로 다른 말을 한다
      // 🔴 2026-08-03 — 여기도 통째로 읽고 있었다(1,000줄 제한).
      //   결손률을 앞 1,000곳으로만 재서 「다 채워졌다」고 거짓말할 수 있었다.
      const h = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from('hotels')
          .select('id, latitude, address, agoda_hotel_id, district').range(from, from + 999);
        if (error || !data || !data.length) break;
        h.push(...data);
        if (data.length < 1000) break;
        if (h.length > 50000) break;
      }
      if (h && h.length) {
        const n = h.length;
        const noLat = h.filter((x) => !x.latitude).length;
        const noAddr = h.filter((x) => !x.address).length;
        const noAg = h.filter((x) => !x.agoda_hotel_id).length;
        const noDist = h.filter((x) => !x.district).length;
        const gaps = [];
        if (noAddr / n > 0.2) gaps.push(`주소 없음 ${noAddr}/${n} — hotel-addr-fill 이 아직 못 따라잡음`);
        if (noAg / n > 0.5) gaps.push(`아고다번호 없음 ${noAg}/${n} — 좌표로 이어야 함`);
        if (noDist / n > 0.3) gaps.push(`지역 없음 ${noDist}/${n} — 주소가 채워져야 붙는다`);
        if (noLat > 20) gaps.push(`좌표 없음 ${noLat}/${n}`);
        if (gaps.length) problems.push({ kind: 'hotel_gap', n: gaps.length,
          note: '호텔 장부가 덜 채워져 화면마다 다른 숫자를 보일 수 있습니다.', sample: gaps });
      }
      // 분모가 뒤집힌 지역 (우리 > 전체)
      // ⚠ v_district_star 는 865줄로 **1,000줄에 가깝다.** 도시가 조금만 늘어도 조용히 잘린다.
      //   터진 뒤에 고치면 그동안 거짓 답을 보여준 것이다. 미리 나눠 읽는다.
      const ds = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from('v_district_star')
          .select('city, district, star, agoda_total, ours').range(from, from + 999);
        if (error || !data || !data.length) break;
        ds.push(...data);
        if (data.length < 1000) break;
        if (ds.length > 60000) break;
      }
      const flip = (ds || []).filter((d) => (d.ours || 0) > (d.agoda_total || 0) && (d.agoda_total || 0) > 0);
      if (flip.length) problems.push({ kind: 'denominator_flip', n: flip.length,
        note: '「우리」가 「전체」보다 많습니다. 분모를 세는 곳이 어긋났습니다.',
        sample: flip.slice(0, 3).map((d) => `${d.city} ${d.district} ${d.star}성 (${d.ours} > ${d.agoda_total})`) });
    } catch { /* 표가 없으면 건너뛴다 */ }
  }

  const summary = { at: new Date().toISOString(), problems };
  if (!dry && sb) {
    try { await sb.from('wiring_audit_log').insert({ problem_count: problems.length, result: summary }); }
    catch { /* 표 없으면 기록만 건너뜀 */ }
  }
  return res.status(200).json({ ok: true, dry_run: dry, problem_count: problems.length, ...summary });
}
