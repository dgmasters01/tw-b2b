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
  const dom = new JSDOM(fs.readFileSync(p, 'utf8'), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://gohotelwinners.com/' + f,
    beforeParse(w) {
      w.fetch = () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      w.onerror = (m) => errs.push(String(m));
      w.scrollTo = () => {};
      const oe = w.console.error;
      w.console.error = (...a) => { const s = a.map(String).join(' '); if (/is not defined|is not a function|Cannot read/.test(s)) errs.push(s); oe(...a); };
    },
  });
  await new Promise((r) => setTimeout(r, 1500));
  const w = dom.window;
  const clicks = CLICKS[f] || [];
  const failed = [];
  for (const c of clicks) {
    try { c.run(w); } catch (e) { failed.push(`${c.name} → ${e.message}`); }
  }
  const ok = errs.length === 0 && failed.length === 0;
  if (!ok) bad += 1;
  console.log(`${ok ? '✅' : '🔴'} ${f}${clicks.length ? ` (흐름 ${clicks.length - failed.length}/${clicks.length})` : ''}`);
  errs.slice(0, 5).forEach((e) => console.log(`     런타임: ${e.slice(0, 140)}`));
  failed.forEach((e) => console.log(`     흐름: ${e}`));
  dom.window.close();
}
console.log(bad ? `\n🔴 ${bad}개 화면에 문제가 있습니다.` : '\n✅ 전부 정상입니다.');
process.exit(bad ? 1 : 0);
