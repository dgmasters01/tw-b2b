// kw-visible-check.js — 키워드 화면이 **진짜 보이는지** 검사한다.
//
// 왜 도구인가: 2026-07-17 클로드가 "jsdom 으로 눌러봤고 JS 에러 0건" 이라고 네 번 보고했는데
//   대표님 화면은 **하얗게 비어 있었다.**
//   🔴 jsdom 은 **부모의 display:none 을 자식 계산에 반영하지 않는다.**
//      #s1 안에 #s2 가 들어가 있어도 "#s2 는 display:block" 이라고 답한다.
//      → "있다" 와 "보인다" 는 다르다. **조상까지 훑어야 한다.**
//
// 쓰는 법: node _os/tools/kw-visible-check.cjs
//   🔴 확장자가 .cjs 인 이유: **이 레포는 ESM**(package.json type=module).
//      .js 로 두면 require 가 죽는다. 인계서에 적힌 덫인데 이 도구가 만들어지자마자 밟았다.
// 통과 조건: ① 화면 6개가 모두 #kw-app 의 **형제**  ② 메인→일본→오사카→난바 4단계가 모두 진짜 보임
//           ③ JS 에러 0건

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'studio.html');

// 창구가 주는 값의 자리만 채운 가짜 (화면 검사용 — 숫자는 라이브에서 확인한다)
const SURVEY = {
  ok: true, city_key: 'cc:japan|osaka', ym: '2026-07',
  snapshot: { ym: '2026-07', anchor_text: '오사카 호텔', anchor_value: '45.63', window_from: '2024-01-01', window_to: '2026-07-17' },
  counts: { found: 68, alive: 58, dead: 10, pairs: 7, pairs_orphan: 2, measured: 46, below_floor: 12, stay: 56, travel: 2 },
  rows: [{ text: '오사카 호텔', demand: 45.63, competition: 206542, opportunity: 8.59, measured: true, is_anchor: true, joined: null, orphan_pair: false, demand_source: 'gtrends_youtube', comp_window_days: 365, measured_at: '2026-07-16T16:00:00Z', batch_no: 1, calib_ratio: 1 }],
  rows_total: 51, travel: [{ text: '오사카 여행', demand: 330.24, competition: 93703, opportunity: 66.42, measured: true }],
  layer3: { locked: true, reason: '조사가 아직 1번뿐입니다.', next_ym: '2026-08' },
};

const errs = [];
const dom = new JSDOM(fs.readFileSync(FILE, 'utf8'), {
  runScripts: 'dangerously', url: 'https://gohotelwinners.com/studio.html',
  beforeParse(w) {
    w.fetch = (u) => String(u).includes('view=survey')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(SURVEY) })
      : Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, cities: [], hotels: [], channels: [], rows: [], items: [] }) });
    w.addEventListener('error', (e) => errs.push('window: ' + e.message));
    w.console.error = (...a) => errs.push('console: ' + a.join(' '));
  },
});
const w = dom.window, D = w.document;

// 🔴 조상까지 훑는다. 이게 이 도구의 전부다.
function reallyVisible(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (w.getComputedStyle(e).display === 'none') return false;
  }
  return true;
}

let fail = 0;
setTimeout(() => {
  const tab = D.querySelector('[data-view="keyword"]');
  if (!tab) { console.log('🔴 키워드 탭이 없습니다'); process.exit(1); }
  tab.click();
  setTimeout(() => {
    console.log('① 화면 6개가 #kw-app 의 형제인가 (겹치면 메인이 꺼질 때 통째로 꺼진다)');
    ['s1', 's2', 's3', 's4', 's5', 's6'].forEach((id) => {
      const e = D.getElementById(id);
      const p = e ? e.parentElement.id : '없음';
      const ok = p === 'kw-app';
      if (!ok) fail++;
      console.log(`   ${id} 부모 → ${p} ${ok ? '✅' : '🔴 겹침'}`);
    });

    console.log('② 4단계가 진짜 보이는가 (조상까지 훑음)');
    const steps = [['메인', null], ['일본', () => w.go('c', '일본')], ['오사카', () => w.go('d', '오사카')], ['난바', () => w.go('x', '난바')]];
    steps.forEach(([label, fn]) => {
      if (fn) { try { fn(); } catch (e) { errs.push(label + ': ' + e.message); } }
      const on = D.querySelector('#kw-app .sc.on');
      const vis = on ? reallyVisible(on) : false;
      if (!vis) fail++;
      console.log(`   ${label.padEnd(4)} → 화면 ${on ? on.id : '(없음)'} · 보이나 ${vis ? '✅' : '🔴 안 보임'}`);
    });

    setTimeout(() => {
      const kv = D.getElementById('kv1');
      const ok = kv && reallyVisible(kv) && kv.textContent.trim().length > 10;
      if (!ok) fail++;
      console.log(`③ 지역 상세의 조사 3층 ${ok ? '✅ 보임' : '🔴 안 보임'}`);
      console.log(errs.length ? `④ 🔴 JS 에러 ${errs.length}건: ${errs.slice(0, 3).join(' | ')}` : '④ ✅ JS 에러 0건');
      if (errs.length) fail++;
      console.log(fail ? `\n🔴 실패 ${fail}건 — 올리지 마세요.` : '\n✅ 전부 통과');
      process.exit(fail ? 1 : 0);
    }, 300);
  }, 400);
}, 400);
