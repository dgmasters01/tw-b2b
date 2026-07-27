#!/usr/bin/env node
/**
 * _os/tools/page-smoke.mjs — 화면을 «실제로 열어보고» 터지는지 확인한다.
 *
 * 왜 만들었나 (D-076 §7 「아직 못 막는 것」 ① · 2026-07-27):
 *   세부지역 클릭이 통째로 먹통이었다. 원인은 `esc is not defined` —
 *   <script> 블록이 달라 함수가 안 보였다. **문법 검사(node --check)는 이걸 못 잡는다.**
 *   대표님이 화면을 눌러보고서야 알았다. 그러면 안 된다.
 *
 * 무엇을 하나
 *   jsdom 으로 HTML 을 진짜 브라우저처럼 실행해서
 *   ① 로드 중 런타임 에러가 나는가
 *   ② 주요 함수가 정의돼 있는가
 *   ③ (선택) 화면 전환을 눌러보고 터지는가
 *
 * 쓰는 법
 *   npm i -D jsdom            (한 번만)
 *   node _os/tools/page-smoke.mjs studio.html
 *   node _os/tools/page-smoke.mjs            → 루트의 html 전부
 *
 * ⚠️ 한계: 로그인·창구 호출은 막아둔다(401 흉내). 화면이 «그려지는지»만 본다.
 */
import fs from 'node:fs';
import path from 'node:path';

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); }
catch { console.log('jsdom 이 없습니다. `npm i -D jsdom` 후 다시 실행하세요.'); process.exit(0); }

const ROOT = process.cwd();
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = args.length ? args
  : fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

/** 화면별로 「눌러볼 것」 — 여기에 추가하면 그 흐름까지 검사한다 */
const CLICKS = {
  'studio.html': [
    { name: '키워드 › 지역 상세', run: (w) => {
      w.SV = { districts: [{ name: 'T', hotels: 1, bookings: 1, agoda_total: 1, zone: '중심가', km: 1, undiscovered: 1, demand: null, surveyed: false, head: 'T 호텔' }],
        district_stats: { T: { stars: [{ star: 3, agoda_total: 2, ours: 1, bookings: 1 }], months: [{ month: 7, star: 3, bookings: 1 }], months_out: [], pattern: { lead_median: 20, n1: 1, n2: 1, n3: 1, n4: 1, n5: 1 }, hotels: [] } },
        city_anchor_text: 'C', unmapped: [], unmapped_total: {} };
      w.go('x', 'T');
      const el = w.document.getElementById('s4');
      if (!el || !el.classList.contains('on') || el.innerHTML.length < 300) throw new Error('지역 상세가 안 그려짐');
    } },
    { name: '키워드 › 나라 목록', run: (w) => { w.go('m'); } },
  ],
};

let bad = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.log(`⏭  ${f} — 없음`); continue; }
  const errs = [];
  /* 우리 파일(shared.js 등)은 진짜로 읽어 넣는다. 안 넣으면 「없는 함수」 오탐이 쏟아진다.
     바깥 CDN(supabase 등)은 흉내만 낸다 — 인터넷 없이도 돌아야 한다. */
  let html = fs.readFileSync(p, 'utf8');
  html = html.replace(/<script[^>]*\ssrc="(https?:)?\/\/[^"]*"[^>]*><\/script>/gi, '');   // 바깥 CDN 제거
  html = html.replace(/<script[^>]*\ssrc="\/?([\w./-]+\.js)"[^>]*><\/script>/gi, (m0, rel) => {
    const lp = path.join(ROOT, rel.replace(/^\//, ''));
    if (!fs.existsSync(lp)) return '';
    /* ⚠️ 파일 안에 «</script>» 라는 글자가 있으면(주석 속 사용법 예시 등) 거기서 블록이 잘린다.
       실제 브라우저는 안 겪는 일이므로 도구가 피해 간다. */
    const code = fs.readFileSync(lp, 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script>\n${code}\n</script>`;                                                  // 우리 파일은 실제로 넣는다
  });

  /* jsdom 은 <script type="module"> 을 실행하지 못한다(2026 기준).
     모듈도 «전역 스코프에 window.X 를 붙이는» 방식이면 일반 스크립트로 돌려도 결과가 같다.
     import/export 를 실제로 쓰는 모듈은 건드리지 않는다(그건 원래 격리가 맞다). */
  html = html.replace(/<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi, (m0, code) =>
    (/^\s*(import|export)\s/m.test(code) ? m0 : `<script>${code}</script>`));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://gohotelwinners.com/' + f,
    beforeParse(w) {
      w.fetch = () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      w.onerror = (m) => errs.push(String(m));
      w.scrollTo = () => {};
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      /* 바깥 CDN 흉내 — 로그인 라이브러리가 없어도 화면은 그려져야 한다 */
      /* DB 흉내 — 무엇을 이어 붙여도 «빈 결과»를 주는 사슬.
         이렇게 해야 「로그인 안 됨」이 아니라 「자료가 아직 없음」 상태를 재현한다.
         (그래야 화면이 빈 자료를 어떻게 다루는지 = 진짜 버그가 드러난다) */
      const EMPTY = { data: [], error: null, count: 0 };
      const makeQ = () => { const q = new Proxy(function () { return q; }, {
        get: (_t, k) => {
          if (k === 'then') return (res, rej) => Promise.resolve(EMPTY).then(res, rej);
          if (k === 'catch' || k === 'finally') return () => q;
          return makeQ();
        },
        apply: () => q,
      }); return q; };
      const sbMock = {
        auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                getUser: () => Promise.resolve({ data: { user: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
                signOut: () => Promise.resolve({ error: null }),
                signInWithPassword: () => Promise.resolve({ data: {}, error: null }) },
        from: () => makeQ(), rpc: () => Promise.resolve(EMPTY),
        channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
        storage: { from: () => ({ upload: () => Promise.resolve(EMPTY), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
      };
      w.supabase = { createClient: () => sbMock };
      w.sb = sbMock;                       // 페이지가 전역 sb 를 기대하는 경우
      /* 차트 라이브러리 흉내 — defaults 까지 있어야 「setting 'color'」 오탐이 안 난다 */
      function ChartMock() { return { destroy() {}, update() {}, resize() {}, data: {}, options: {} }; }
      ChartMock.defaults = { color: '', font: {}, plugins: { legend: { labels: {} }, tooltip: {} }, scale: { grid: {} }, scales: {} };
      ChartMock.register = () => {}; ChartMock.registerables = [];
      w.Chart = ChartMock;
      const oe = w.console.error;
      w.console.error = (...a) => { const s = a.map(String).join(' '); if (/is not defined|is not a function|Cannot read/.test(s)) errs.push(s); oe(...a); };
    },
  });
  try { await new Promise((r) => setTimeout(r, 1200)); } catch { /* 계속 */ }
  const w = dom.window;
  /* 진짜 ES 모듈(import 를 쓰는)은 jsdom 이 실행하지 못한다 → «검사 못 함»으로 정직하게 표시.
     실패로 세면 거짓 경보가 되고, 성공으로 세면 못 본 것을 봤다고 거짓말하게 된다. */
  const realModule = /<script\s+type=["']module["'][^>]*>[\s\S]*?^\s*import\s/mi.test(fs.readFileSync(p, 'utf8'));
  if (realModule) { console.log(`⚪ ${f}  — ES 모듈 페이지라 이 도구로는 검사 못 함 (브라우저에서 확인 필요)`); dom.window.close(); continue; }
  const clicks = CLICKS[f] || [];
  const failed = [];
  for (const c of clicks) {
    try { c.run(w); } catch (e) { failed.push(`${c.name} → ${e.message}`); }
  }
  /* 화면에 있는 버튼·탭을 실제로 눌러본다 (최대 40개) — 「눌렀는데 터지는 것」을 잡는다 */
  const clickable = [...w.document.querySelectorAll('[onclick],button,[data-tab],[role="tab"]')].slice(0, 40);
  let clicked = 0;
  const onUnhandled = (e) => { const m = String((e && e.message) || e); if (/is not defined|is not a function|Cannot read|Cannot set/.test(m)) failed.push(`비동기 → ${m}`); };
  process.on('uncaughtException', onUnhandled);
  process.on('unhandledRejection', onUnhandled);
  for (const el of clickable) {
    try { el.click(); clicked += 1; } catch (e) {
      const m = String(e.message || e);
      if (/is not defined|is not a function|Cannot read/.test(m)) failed.push(`버튼「${(el.textContent || el.id || '').trim().slice(0, 20)}」→ ${m}`);
    }
  }
  await new Promise((r) => setTimeout(r, 250));         // 클릭 뒤 비동기 에러를 받아낸다
  process.off('uncaughtException', onUnhandled);
  process.off('unhandledRejection', onUnhandled);
  const ok = errs.length === 0 && failed.length === 0;
  if (!ok) bad += 1;
  console.log(`${ok ? '✅' : '🔴'} ${f}  ${clicks.length ? `흐름 ${clicks.length}/${clicks.length} · ` : ''}버튼 ${clicked}개 눌러봄`);
  errs.slice(0, 5).forEach((e) => console.log(`     런타임: ${e.slice(0, 140)}`));
  failed.forEach((e) => console.log(`     흐름: ${e}`));
  dom.window.close();
}
console.log(bad ? `\n🔴 ${bad}개 화면에 문제가 있습니다.` : '\n✅ 전부 정상입니다.');
process.exit(bad ? 1 : 0);
