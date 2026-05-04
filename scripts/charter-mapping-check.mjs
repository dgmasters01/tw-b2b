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
//   4. admin-hub.html 폐기 검증 (BL-HUB-RETIRE / D-013) — meta refresh + 활성 UI 잔존 안 함
//   4-V. vercel.json — /admin-hub.html + /admin-hub 둘 다 301 리다이렉트 등록됨
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
// Check 4 — admin-hub.html: 폐기 검증 (BL-HUB-RETIRE / D-013, 2026-05-04)
//   파일은 존재해야 하지만 (vercel 리다이렉트 폴백용) 폐기 안내 페이지로 교체되어야 함.
//   - meta refresh 또는 JS replace 둘 중 하나는 필수
//   - 카테고리 카드/통계 카드/사이드바 메뉴 등 활성 UI는 모두 제거되어야 함
// ────────────────────────────────────────────────────────────
const hubHtml = readIfExists('admin-hub.html');
if (hubHtml === null) {
  check('4. admin-hub.html 존재 (폐기 안내 폴백용)', false, '파일 없음 — 리다이렉트 폴백을 위해 안내 페이지로 유지 필요');
} else {
  check('4. admin-hub.html 존재 (폐기 안내 폴백용)', true);
  const isRetiredMeta = /http-equiv=["']refresh["'][^>]*url=\/admin-status\.html/i.test(hubHtml);
  const isRetiredJs   = /window\.location\.replace\(["']\/admin-status\.html["']\)/.test(hubHtml);
  check('4.1 폐기 페이지 — meta refresh OR JS replace 존재', isRetiredMeta || isRetiredJs);
  const hasQuickStats = /id=["']quickStats["']/.test(hubHtml);
  check('4.2 quick-stats 통계 div 미잔존', !hasQuickStats);
  const hasCatFilesActive = (hubHtml.match(/<div\s+class=["']cat-files["']/g) || []).length;
  check('4.3 cat-files 활성 카드 0개 (폐기 페이지는 안내 카드만)', hasCatFilesActive === 0, `현재 ${hasCatFilesActive}개`);
  const hasSidebar = /class=["']ad-sb-/.test(hubHtml);
  check('4.4 admin 사이드바 잔존 안 함', !hasSidebar);
}

// ────────────────────────────────────────────────────────────
// Check 4-V — vercel.json: admin-hub 301 리다이렉트 등록됨 (BL-HUB-RETIRE)
// ────────────────────────────────────────────────────────────
const vercelJsonRaw = readIfExists('vercel.json');
if (vercelJsonRaw === null) {
  check('4-V. vercel.json 존재', false);
} else {
  try {
    const vercel = JSON.parse(vercelJsonRaw);
    check('4-V. vercel.json 유효 JSON', true);
    const redirects = vercel.redirects || [];
    const hasHubHtml = redirects.some(r => r.source === '/admin-hub.html' && r.destination === '/admin-status.html' && r.permanent === true);
    const hasHubBare = redirects.some(r => r.source === '/admin-hub' && r.destination === '/admin-status.html' && r.permanent === true);
    check('4-V.1 /admin-hub.html → /admin-status.html 301', hasHubHtml);
    check('4-V.2 /admin-hub → /admin-status.html 301', hasHubBare);
  } catch (e) {
    check('4-V. vercel.json 유효 JSON', false, e.message);
  }
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
