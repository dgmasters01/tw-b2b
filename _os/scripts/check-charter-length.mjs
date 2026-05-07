#!/usr/bin/env node
/**
 * Charter Length Bot — 헌법 길이 자동 감시
 *
 * 헌법 부칙 14: OPERATIONS_CHARTER.md는 200줄 이하 강제.
 * 새 운영 룰은 헌법이 아닌 _os/playbook/에 박는다.
 *
 * 사용법:
 *   node _os/scripts/check-charter-length.mjs
 *
 * Exit 0: 통과 (200줄 이하)
 * Exit 1: 실패 (200줄 초과 — CI에서 push 차단)
 *
 * 발견 경위:
 *   2026-05-07 헌법 474줄까지 자라면서 Claude가 끝까지 못 읽고 거짓 보고 사고 발생.
 *   부칙 14 신설 + 이 봇으로 시스템적 강제.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// repo root 동적 산출 (헌법 부칙 10 위치 의존성 금지)
function getRepoRoot() {
  if (process.env.GITHUB_WORKSPACE) return process.env.GITHUB_WORKSPACE;
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch (e) {
    return process.cwd();
  }
}

const REPO_ROOT = getRepoRoot();
const CHARTER_PATH = path.join(REPO_ROOT, 'OPERATIONS_CHARTER.md');
const MAX_LINES = 200;

// 검사 1: 파일 존재
if (!fs.existsSync(CHARTER_PATH)) {
  console.error('❌ OPERATIONS_CHARTER.md 파일 없음:', CHARTER_PATH);
  process.exit(1);
}

// 검사 2: 줄 수
const content = fs.readFileSync(CHARTER_PATH, 'utf8');
const lines = content.split('\n').length;

console.log(`헌법 길이 검사 — OPERATIONS_CHARTER.md`);
console.log(`  현재: ${lines}줄`);
console.log(`  최대: ${MAX_LINES}줄`);
console.log(`  여유: ${MAX_LINES - lines}줄`);

if (lines > MAX_LINES) {
  console.error('');
  console.error(`❌ 헌법 길이 초과 (${lines}/${MAX_LINES}줄)`);
  console.error('');
  console.error('헌법 부칙 14 위반:');
  console.error('  → 헌법 본문은 200줄 이하 강제.');
  console.error('  → 새 운영 룰은 _os/playbook/에 박아야 함.');
  console.error('');
  console.error('해결 방법:');
  console.error('  1. 헌법에서 디테일·예시·형식·판단 기준을 _os/playbook/<영역>.md로 이전');
  console.error('  2. 헌법에는 한 줄 방향성 + 룰북 참조만 남김');
  console.error('  3. 200줄 budget 안에 들어올 때까지 반복');
  console.error('');
  console.error('발견 경위 (재발 방지):');
  console.error('  2026-05-07 헌법 474줄까지 자라면서 Claude가 끝까지 못 읽고 거짓 보고 사고 발생.');
  console.error('  같은 사고를 막기 위해 이 봇이 자동으로 push를 차단함.');
  process.exit(1);
}

// 검사 3: 룰북 참조 무결성 (헌법이 _os/playbook/X.md 참조하면 그 파일이 실제로 있어야 함)
const playbookRefs = content.match(/_os\/playbook\/[\w\-]+\.md/g) || [];
const uniqueRefs = [...new Set(playbookRefs)];
const missingRefs = [];

for (const ref of uniqueRefs) {
  const refPath = path.join(REPO_ROOT, ref);
  if (!fs.existsSync(refPath)) missingRefs.push(ref);
}

if (missingRefs.length > 0) {
  console.error('');
  console.error(`❌ 헌법이 참조하는 룰북 파일 누락:`);
  missingRefs.forEach(r => console.error(`  - ${r}`));
  console.error('');
  console.error('헌법에서 룰북을 참조했으면 그 파일은 실제로 존재해야 함 (헌법 원칙 6 AI 가독성).');
  process.exit(1);
}

console.log(`  룰북 참조: ${uniqueRefs.length}개 (모두 존재 ✅)`);
console.log('');
console.log('✅ 헌법 길이 검사 통과');
process.exit(0);
