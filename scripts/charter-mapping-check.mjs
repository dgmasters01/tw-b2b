#!/usr/bin/env node
// ============================================================
// scripts/charter-mapping-check.mjs
// ============================================================
//
// 헌법 부칙 5 / D-010 — 카테고리별 단일 진실 매핑 자가 검증.
//
// 다음을 자동 검증한다:
//   1. admin-business.html 안에 Category 1의 5개 파일이 모두 등장하는가
//      (BUSINESS / DECISIONS / DECISIONS_INDEX / JOURNEY / BUSINESS_FLOW)
//   2. admin-business.html 안에 Category 2 파일이 등장하지 않는가
//      (특히 BACKLOG.md는 chip/링크/DOCS 배열에 없어야 함 — 주석은 허용)
//   3. admin-tasks.html 안에 Category 2의 5개 파일이 모두 칩으로 노출되는가
//      (tasks.json / BACKLOG / CHANGELOG / SOLO_WORK_QUEUE / ECHO_LOG)
//   4. admin-hub.html 안에 통계 카드(quick-stats, cat-stats div)가 없는가
//   5. js/stats.js가 존재하고 computeTasksStats를 export하는가
//   6. tasks.json이 유효 JSON이고 BL-CATEGORY-REMAP이 status=in_progress 또는 done인가
//
// 실패 항목이 하나라도 있으면 exit code 1.
//
// 사용:
//   node scripts/charter-mapping-check.mjs
//
// 헌법 원칙 5 (무인 검증) / 원칙 10 (자기 강제) 의 코드 구현체.
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const CATEGORY_1_FILES = ['BUSINESS.md', 'DECISIONS.md', 'DECISIONS_INDEX.md', 'JOURNEY.md', 'BUSINESS_FLOW.md'];
const CATEGORY_2_FILES = ['tasks.json', 'BACKLOG.md', 'CHANGELOG.md', 'SOLO_WORK_QUEUE.md', 'ECHO_LOG.md'];

const results = []; // { ok, name, detail }
function check(name, ok, detail = '') {
  results.push({ ok, name, detail });
}

function readIfExists(rel) {
  const p = resolve(REPO_ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

// ────────────────────────────────────────────────────────────
// Check 1 — admin-business.html: Category 1 파일 5개 모두 DOCS 배열에
// ────────────────────────────────────────────────────────────
const business = readIfExists('admin-business.html');
if (business === null) {
  check('1. admin-business.html 존재', false, '파일 없음');
} else {
  check('1. admin-business.html 존재', true);
  for (const f of CATEGORY_1_FILES) {
    const re = new RegExp(`file:\\s*['"]${f.replace(/\./g, '\\.')}['"]`);
    const found = re.test(business);
    check(`1.${CATEGORY_1_FILES.indexOf(f) + 1} DOCS 배열에 ${f}`, found);
  }
}

// ────────────────────────────────────────────────────────────
// Check 2 — admin-business.html: Category 2 파일이 DOCS/링크에 없어야 함 (주석은 OK)
// ────────────────────────────────────────────────────────────
if (business !== null) {
  for (const f of CATEGORY_2_FILES) {
    if (f === 'tasks.json') continue; // tasks.json은 다른 페이지에서 raw 링크로 등장 가능 — 무시
    const re = new RegExp(`file:\\s*['"]${f.replace(/\./g, '\\.')}['"]`);
    const found = re.test(business);
    check(`2. admin-business에 ${f} DOCS 배열 항목 없음`, !found, found ? `${f}이 DOCS 배열에 남아있음 (Category 2여야 함)` : '');
  }
}

// ────────────────────────────────────────────────────────────
// Check 3 — admin-tasks.html: Category 2 5개 파일 칩 노출
// ────────────────────────────────────────────────────────────
const tasksHtml = readIfExists('admin-tasks.html');
if (tasksHtml === null) {
  check('3. admin-tasks.html 존재', false, '파일 없음');
} else {
  check('3. admin-tasks.html 존재', true);
  for (const f of CATEGORY_2_FILES) {
    const re = new RegExp(`truth-file-chip[^>]*>${f.replace(/\./g, '\\.')}<`);
    const found = re.test(tasksHtml);
    check(`3.${CATEGORY_2_FILES.indexOf(f) + 1} truth-file-chip에 ${f}`, found);
  }
  const hasBanner = /truth-files-banner/.test(tasksHtml);
  check('3.X 단일 진실 배너 div 존재', hasBanner);
}

// ────────────────────────────────────────────────────────────
// Check 4 — admin-hub.html: 통계 카드 제거됨
// ────────────────────────────────────────────────────────────
const hubHtml = readIfExists('admin-hub.html');
if (hubHtml === null) {
  check('4. admin-hub.html 존재', false, '파일 없음');
} else {
  check('4. admin-hub.html 존재', true);
  const hasQuickStats = /id="quickStats"/.test(hubHtml);
  check('4.1 quick-stats div 제거', !hasQuickStats);
  const hasCatStats = /<div\s+class="cat-stats"/.test(hubHtml);
  check('4.2 cat-stats div 제거', !hasCatStats);
  const hasCatFiles = (hubHtml.match(/<div\s+class="cat-files"/g) || []).length;
  check('4.3 cat-files 카드 4개 유지', hasCatFiles === 4, `현재 ${hasCatFiles}개`);
  const importsStatsJs = /from\s+['"]\/js\/stats\.js/.test(hubHtml);
  check('4.4 /js/stats.js import', importsStatsJs);
}

// ────────────────────────────────────────────────────────────
// Check 5 — js/stats.js 존재 + computeTasksStats export
// ────────────────────────────────────────────────────────────
const statsJs = readIfExists('js/stats.js');
if (statsJs === null) {
  check('5. js/stats.js 존재', false, '파일 없음');
} else {
  check('5. js/stats.js 존재', true);
  const hasExport = /export\s+(async\s+)?function\s+computeTasksStats/.test(statsJs);
  check('5.1 computeTasksStats export', hasExport);
}

// ────────────────────────────────────────────────────────────
// Check 6 — tasks.json 유효성 + BL-CATEGORY-REMAP 진행
// ────────────────────────────────────────────────────────────
const tasksJsonRaw = readIfExists('tasks.json');
if (tasksJsonRaw === null) {
  check('6. tasks.json 존재', false);
} else {
  try {
    const tasksData = JSON.parse(tasksJsonRaw);
    check('6. tasks.json 유효 JSON', true);
    const remap = (tasksData.tasks || []).find(t => t.id === 'BL-CATEGORY-REMAP');
    check('6.1 BL-CATEGORY-REMAP task 등록됨', !!remap);
    if (remap) {
      const okStatus = ['in_progress', 'done'].includes(remap.status);
      check(`6.2 BL-CATEGORY-REMAP status는 in_progress 또는 done`, okStatus, `현재 status='${remap.status}'`);
    }
  } catch (e) {
    check('6. tasks.json 유효 JSON', false, e.message);
  }
}

// ────────────────────────────────────────────────────────────
// 보고
// ────────────────────────────────────────────────────────────
const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok);
console.log('\n=== 헌법 부칙 5 / D-010 매핑 자가 검증 결과 ===\n');
for (const r of results) {
  const icon = r.ok ? '✅' : '❌';
  console.log(`${icon} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
}
console.log(`\n총 ${results.length}개 검사 / 통과 ${passed} / 실패 ${failed.length}`);

if (failed.length > 0) {
  console.error('\n❌ 헌법 위반 — 매핑이 D-010 표준과 어긋남. push 금지.');
  process.exit(1);
} else {
  console.log('\n✅ 모든 매핑이 D-010 표준에 부합. push 가능.');
  process.exit(0);
}
