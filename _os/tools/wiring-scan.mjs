#!/usr/bin/env node
/**
 * _os/tools/wiring-scan.mjs — 「무엇이 무엇과 연결돼 있나」를 **코드에서 직접** 뽑는다.
 *
 * 왜 만들었나 (D-076 · 대표님 2026-07-27):
 *   "자동화 로봇 및 전체의 세부 시스템이 어떤 것과 연동되어 작동되고
 *    어떤 페이지를 바꿔야 되는지 정리가 안 되어서 그때그때 다시 확인하는 게 문제임."
 *   손으로 쓴 지도는 코드가 바뀌면 곧 거짓말이 된다.
 *   → **코드가 정답이다.** 코드에서 뽑으면 절대 낡지 않는다.
 *
 * 무엇을 뽑나
 *   ① 화면(HTML) → 부르는 API          : fetch('/api/...')
 *   ② API → 만지는 DB 표               : .from('table') · /rest/v1/table
 *   ③ 크론(vercel.json) → 도는 API
 *   ④ 역인덱스: **표 하나를 바꾸면 어디를 고쳐야 하나**
 *   ⑤ 위험 신호: 1,000줄 잘림 위험 · 고아 API(아무도 안 부름)
 *
 * 쓰는 법
 *   node _os/tools/wiring-scan.mjs            → SYSTEM_WIRING.md 를 새로 쓴다
 *   node _os/tools/wiring-scan.mjs --check    → 파일을 안 고치고 「낡았는지」만 알려준다 (종료코드 1)
 *   node _os/tools/wiring-scan.mjs --json     → 기계용 JSON 을 stdout 으로
 *
 * 규칙
 *   - 이 파일이 만드는 SYSTEM_WIRING.md 는 **손으로 고치지 않는다.** 고치면 다음 실행에 지워진다.
 *   - 사람이 쓰는 설명은 SYSTEM_MAP.md 에. 이 문서는 «사실 관계»만 담는다.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'SYSTEM_WIRING.md');
/* 표 행수 — 위험도 판정에 쓴다. 없으면 판정 없이 「모름」으로 나온다.
   갱신: `_os/tools/table-rows.json` 에 {"표이름": 행수} 로 적는다.
   왜 파일인가: 스캐너는 DB 없이 아무 데서나 돌아야 한다(오프라인·CI). */
let ROWS = {};
try { ROWS = JSON.parse(fs.readFileSync(path.join(ROOT, '_os/tools/table-rows.json'), 'utf8')); } catch { /* 없으면 모름 */ }
function riskLevel(table) {
  const n = ROWS[table];
  if (n == null) return { tag: '⬜ 모름', n: null, order: 1 };
  if (n >= 1000) return { tag: '🔴 이미 넘음', n, order: 0 };
  if (n >= 500) return { tag: '🟡 곧 넘음', n, order: 2 };
  return { tag: '🟢 여유', n, order: 3 };
}

// ── 우리가 쓰는 «화면» 이 무엇인지 (서비스 갈래) ──────────────────────────
// gohotelwinners(B2B 매니저)와 스튜디오(콘텐츠 운영)는 **같은 DB 를 나눠 쓴다.**
// 그래서 한쪽만 고치면 다른 쪽이 깨진다 — 대표님 2026-07-27.
const AREA = [
  [/^studio/, '스튜디오(콘텐츠 운영)'],
  [/^admin/, '관리자'],
  [/^manager|^dashboard|^hotel-info|^booking-analytics/, 'B2B 호텔 매니저'],
  [/^index|^login|^signup|^verify|^forgot|^reset|^settings|^sales|^marketing/, '공개·가입'],
];
function areaOf(name) {
  for (const [re, label] of AREA) if (re.test(name)) return label;
  return '기타';
}

function walk(dir, out = [], skip = /node_modules|\.git|_chat-logs|\.next/) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (skip.test(p)) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out, skip);
    else out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const files = walk(ROOT);
const htmls = files.filter((p) => p.endsWith('.html') && !rel(p).includes('/'));
const apis = files.filter((p) => rel(p).startsWith('api/') && p.endsWith('.js'));

// ── ① 화면 → API ────────────────────────────────────────────────────────
const pageApis = {};       // page → Set(api path)
for (const p of htmls) {
  const src = fs.readFileSync(p, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/['"`](\/api\/[a-zA-Z0-9_\-/]+)/g)) set.add(m[1]);
  pageApis[rel(p)] = [...set].sort();
}

// ── ② API → DB 표 (읽기/쓰기 구분) ──────────────────────────────────────
const apiTables = {};      // api → { read:Set, write:Set }
const apiRisk = {};        // api → [위험 신호]
for (const p of apis) {
  const src = fs.readFileSync(p, 'utf8');
  const read = new Set(); const write = new Set(); const risk = [];

  // supabase-js:  .from('t').select / insert / update / upsert / delete
  for (const m of src.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)([\s\S]{0,300}?)(?=\.from\(|;|\n\s*(?:const|let|var|return|if|\}))/g)) {
    const t = m[1]; const tail = m[2];
    if (/\.(insert|upsert|update|delete)\(/.test(tail)) write.add(t); else read.add(t);
    // 1,000줄 잘림 위험: 필터도 없고 limit·range 도 없는 통 읽기
    if (/\.select\(/.test(tail) && !/\.(limit|range|single|maybeSingle)\(/.test(tail) && !/\.(eq|in|gte|lte|like|ilike|contains|cs)\(/.test(tail)) {
      risk.push({ table: t, how: 'limit/range 없이 통째로 읽음' });
    }
  }
  // PostgREST 직접 호출: /rest/v1/table?...
  for (const m of src.matchAll(/\/rest\/v1\/([a-z_0-9]+)([^`'"]*)/g)) {
    const t = m[1]; const q = m[2] || '';
    read.add(t);
    if (/on_conflict|method:\s*['"]POST/.test(src.slice(m.index, m.index + 400))) write.add(t);
    /* 필터가 붙어 있으면 대개 소량이다 — 오탐을 줄인다.
       PostgREST 필터 문법: col=eq.x · =is.null · =in.(..) · =gte. · or=(..) · and=(..) */
    const hasFilter = /=(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd|ov|sl|sr|fts|plfts|phfts|wfts)\./.test(q)
                   || /(^|[?&])(or|and)=\(/.test(q);
    /* 개수만 세는 호출은 줄을 안 받는다 — 위험이 아니다 (Prefer: count=exact + Range: 0-0) */
    const around = src.slice(Math.max(0, m.index - 500), m.index + 500);
    const countOnly = /count=exact/.test(around) && /Range['"\s:]+['"]0-0/.test(around);
    if (!/limit=|offset=/.test(q) && /select=/.test(q) && !hasFilter && !countOnly) {
      risk.push({ table: t, how: 'limit 없이 REST 로 읽음' });
    }
  }
  apiTables[rel(p)] = { read: [...read].sort(), write: [...write].sort() };
  if (risk.length) {
    const seen = new Set(); const uniq = [];
    for (const r of risk) { const k = r.table + '|' + r.how; if (!seen.has(k)) { seen.add(k); uniq.push(r); } }
    apiRisk[rel(p)] = uniq;
  }
}

// ── ③ 크론 ──────────────────────────────────────────────────────────────
let crons = [];
try {
  const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  crons = (vj.crons || []).map((c) => ({ schedule: c.schedule, path: c.path }));
} catch { /* 없으면 빈 목록 */ }
const cronPaths = new Set(crons.map((c) => c.path));

// ── ④ 역인덱스: 표 → 만지는 API → 그 API 를 쓰는 화면 ───────────────────
const apiPages = {};       // api → [page]
for (const [pg, list] of Object.entries(pageApis)) {
  for (const a of list) {
    (apiPages[a] || (apiPages[a] = [])).push(pg);
  }
}
function apiRoute(apiFile) {                    // api/foo/bar.js → /api/foo/bar
  return '/' + apiFile.replace(/\.js$/, '');
}
const tableMap = {};       // table → { readers:[], writers:[], pages:Set, crons:Set }
for (const [af, tt] of Object.entries(apiTables)) {
  const route = apiRoute(af);
  const pgs = apiPages[route] || [];
  const isCron = cronPaths.has(route);
  for (const t of tt.read) {
    const e = tableMap[t] || (tableMap[t] = { readers: [], writers: [], pages: new Set(), crons: new Set() });
    e.readers.push(af); pgs.forEach((x) => e.pages.add(x)); if (isCron) e.crons.add(af);
  }
  for (const t of tt.write) {
    const e = tableMap[t] || (tableMap[t] = { readers: [], writers: [], pages: new Set(), crons: new Set() });
    e.writers.push(af); pgs.forEach((x) => e.pages.add(x)); if (isCron) e.crons.add(af);
  }
}

// ── ⑤ 고아 API (아무 화면도 안 부르고 크론도 아님) ──────────────────────
const orphanApis = Object.keys(apiTables).filter((af) => {
  const route = apiRoute(af);
  if (cronPaths.has(route)) return false;
  if (apiPages[route]) return false;
  if (af.includes('/_lib/')) return false;         // 라이브러리는 직접 안 불린다
  return true;
});

// ── 출력 ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const L = [];
L.push('# 🔌 시스템 배선도 — 무엇이 무엇과 연결돼 있나');
L.push('');
L.push(`> ⚙️ **이 문서는 \`_os/tools/wiring-scan.mjs\` 가 코드에서 자동으로 뽑는다. 손으로 고치지 마라 — 다음 실행에 지워진다.**`);
L.push('> 사람이 쓰는 설명·판단은 `SYSTEM_MAP.md` 에. 이 문서는 **사실 관계**만 담는다.');
L.push(`> 마지막 갱신 ${today} · 화면 ${htmls.length} · 창구 ${apis.length} · 표 ${Object.keys(tableMap).length} · 크론 ${crons.length}`);
L.push('');
L.push('**쓰는 법**: 무엇을 고치기 전에 **여기서 그 이름을 찾는다.** 같이 고쳐야 할 곳이 한눈에 나온다.');
L.push('');
L.push('---');
L.push('');

// 1. 표 → 영향 범위 (제일 중요)
L.push('## 1. 표를 바꾸면 어디를 고쳐야 하나 (역인덱스)');
L.push('');
L.push('> 🔴 **B2B(gohotelwinners)와 스튜디오는 같은 표를 나눠 쓴다. 한쪽만 고치면 다른 쪽이 깨진다.**');
L.push('');
L.push('| 표 | 읽는 창구 | 쓰는 창구 | 영향받는 화면 | 도는 봇 |');
L.push('|---|---|---|---|---|');
for (const t of Object.keys(tableMap).sort()) {
  const e = tableMap[t];
  const pages = [...e.pages].sort();
  const areas = [...new Set(pages.map((p) => areaOf(p)))];
  L.push(`| \`${t}\` | ${e.readers.length ? e.readers.map((x) => `\`${x.replace('api/', '')}\``).join(' ') : '—'} | ${e.writers.length ? e.writers.map((x) => `**\`${x.replace('api/', '')}\`**`).join(' ') : '—'} | ${pages.length ? pages.map((p) => `\`${p}\``).join(' ') + (areas.length > 1 ? ` <br>⚠️ **${areas.join(' + ')} 양쪽**` : '') : '—'} | ${e.crons.size ? [...e.crons].map((x) => `\`${x.replace('api/cron/', '')}\``).join(' ') : '—'} |`);
}
L.push('');
L.push('---');
L.push('');

// 2. 화면 → 창구
L.push('## 2. 화면이 부르는 창구');
L.push('');
const byArea = {};
for (const pg of Object.keys(pageApis).sort()) (byArea[areaOf(pg)] || (byArea[areaOf(pg)] = [])).push(pg);
for (const area of Object.keys(byArea).sort()) {
  L.push(`### ${area}`);
  L.push('');
  L.push('| 화면 | 부르는 창구 |');
  L.push('|---|---|');
  for (const pg of byArea[area]) {
    const list = pageApis[pg];
    L.push(`| \`${pg}\` | ${list.length ? list.map((a) => `\`${a}\``).join(' ') : '— (창구 없음)'} |`);
  }
  L.push('');
}
L.push('---');
L.push('');

// 3. 크론
L.push('## 3. 자동으로 도는 봇 — 무엇을 만지나');
L.push('');
L.push('| 시각(UTC) | 봇 | 읽는 표 | **쓰는 표** |');
L.push('|---|---|---|---|');
for (const c of crons) {
  const af = c.path.replace(/^\//, '') + '.js';
  const tt = apiTables[af] || { read: [], write: [] };
  L.push(`| \`${c.schedule}\` | \`${c.path}\` | ${tt.read.map((x) => `\`${x}\``).join(' ') || '—'} | ${tt.write.map((x) => `**\`${x}\`**`).join(' ') || '—'} |`);
}
L.push('');
L.push('---');
L.push('');

// 4. 위험 신호
L.push('## 4. 🔴 위험 신호 (스캐너가 찾은 것)');
L.push('');
L.push('### 4-1. 1,000줄 잘림 위험');
L.push('');
L.push('> Supabase·PostgREST 는 **아무 말 없이 1,000줄에서 잘라서** 준다. 표가 1,000줄을 넘으면 조용히 틀린 답이 나온다.');
L.push('> 실제 사고: `hotels`(3,185줄)를 그냥 읽어 **성급이 틀리게 표시**됐고, 예약 79건이 호텔에 안 붙었다 (D-074·D-075).');
L.push('');
const flat = [];
for (const af of Object.keys(apiRisk)) for (const r of apiRisk[af]) flat.push({ af, ...r, ...riskLevel(r.table) });
flat.sort((a, b) => a.order - b.order || (b.n || 0) - (a.n || 0) || a.af.localeCompare(b.af));
const urgent = flat.filter((x) => x.order === 0);
if (flat.length) {
  L.push(`**지금 실제로 터지는 것: ${urgent.length}곳** (표가 이미 1,000줄을 넘었다) · 전체 ${flat.length}곳`);
  L.push('');
  L.push('| 위험 | 표 (행수) | 창구 | 어떻게 |');
  L.push('|---|---|---|---|');
  for (const x of flat) L.push(`| ${x.tag} | \`${x.table}\` ${x.n != null ? `(${x.n.toLocaleString()})` : ''} | \`${x.af}\` | ${x.how} |`);
  L.push('');
  L.push('> 🟢 여유라도 **표가 자라면 언젠가 터진다.** 새로 쓰는 코드는 처음부터 `range` 로 끊어 읽는다.');
} else L.push('없음 ✅');
L.push('');
L.push('### 4-2. 아무도 안 부르는 창구');
L.push('');
L.push('> 화면도 안 부르고 크론도 아니다. 다른 창구가 내부에서 부르거나, **죽은 코드**다.');
L.push('');
L.push(orphanApis.length ? orphanApis.map((x) => `- \`${x}\``).join('\n') : '없음 ✅');
L.push('');
L.push('---');
L.push('');
L.push('## 5. 이 문서를 다시 만드는 법');
L.push('');
L.push('```bash');
L.push('node _os/tools/wiring-scan.mjs          # 새로 쓴다');
L.push('node _os/tools/wiring-scan.mjs --check  # 낡았는지만 확인 (고치지 않음)');
L.push('```');
L.push('');
L.push('**언제 돌리나**: 창구를 새로 만들거나 지웠을 때 · 화면이 부르는 창구를 바꿨을 때 · 봇을 추가했을 때.');
L.push('작업 끝에 `--check` 가 「낡음」이라고 하면 그냥 다시 돌려서 같이 커밋한다.');
L.push('');

const md = L.join('\n');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    generated: today, pages: pageApis, apis: apiTables, crons,
    tables: Object.fromEntries(Object.entries(tableMap).map(([k, v]) => [k, { ...v, pages: [...v.pages], crons: [...v.crons] }])),
    risk: apiRisk, orphan_apis: orphanApis,
  }, null, 2));
  process.exit(0);
}

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const strip = (s) => s.replace(/^> 마지막 갱신 .*$/m, '');
  if (strip(cur) === strip(md)) { console.log('✅ SYSTEM_WIRING.md 최신입니다.'); process.exit(0); }
  console.log('⚠️  SYSTEM_WIRING.md 가 낡았습니다. `node _os/tools/wiring-scan.mjs` 를 돌려 갱신하세요.');
  process.exit(1);
}

fs.writeFileSync(OUT, md);
console.log(`✅ SYSTEM_WIRING.md 갱신 — 화면 ${htmls.length} · 창구 ${apis.length} · 표 ${Object.keys(tableMap).length} · 크론 ${crons.length} · 위험 ${Object.keys(apiRisk).length}`);
