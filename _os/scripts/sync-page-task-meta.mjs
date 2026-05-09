#!/usr/bin/env node
// scripts/sync-page-task-meta.mjs
// 각 .html 페이지의 마지막 git commit 시각(ISO)을 추출해서
// scripts/pages-meta.mjs의 PAGE_TASK_META.lastUpdated를 자동 갱신.
//
// 트리거: scan-pages-status.mjs 실행 직전 또는 GitHub Actions에서.
// 사람용 lastTaskId/lastTaskTitle은 손대지 않음 (수동 박힌 의미를 보존).
//
// 사용:
//   node scripts/sync-page-task-meta.mjs

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const META_FILE = 'scripts/pages-meta.mjs';
const meta = readFileSync(META_FILE, 'utf8');

// PAGE_TASK_META 블록 추출
const blockRe = /(export const PAGE_TASK_META = \{[\s\S]*?\n\};)/;
const m = meta.match(blockRe);
if (!m) {
  console.error('PAGE_TASK_META 블록을 찾지 못함');
  process.exit(1);
}
const block = m[1];

// 각 키마다 git log -1 --format=%aI -- {path} 로 ISO datetime 가져오기
const lineRe = /^(\s*"([^"]+)":\s*\{[^}]*?lastUpdated:\s*")([^"]+)("[^}]*\})/gm;
let updated = 0;
const newBlock = block.replace(lineRe, (full, prefix, path, oldDate, suffix) => {
  try {
    const iso = execSync(`git log -1 --format=%aI -- "${path}"`, { encoding: 'utf8' }).trim();
    if (!iso) return full;
    if (iso === oldDate) return full;
    updated++;
    console.log(`  ${path}: ${oldDate} → ${iso}`);
    return prefix + iso + suffix;
  } catch (e) {
    return full;
  }
});

if (updated === 0) {
  console.log('변경 없음');
  process.exit(0);
}

const newMeta = meta.replace(blockRe, newBlock);
writeFileSync(META_FILE, newMeta);
console.log(`\n✅ ${updated}개 항목 갱신 완료 → ${META_FILE}`);
