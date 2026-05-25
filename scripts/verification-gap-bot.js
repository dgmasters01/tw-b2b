#!/usr/bin/env node
// scripts/verification-gap-bot.js
// ════════════════════════════════════════════════════════════════════════════
// BL-DECISION-TRACKING 톱니 4 — verification-gap-bot
// ════════════════════════════════════════════════════════════════════════════
//
// 트리거: GitHub Actions (.github/workflows/verification-gap-bot.yml)
//   - push to main
//   - 매일 KST 03:00 (UTC 18:00 전날)
//   - workflow_dispatch (수동)
//
// 동작:
//   1. _decisions/business-agreements.json 로드
//   2. status가 not_implemented / partial 인 각 합의 항목에 대해:
//      - expected_location.files 각각 GitHub raw fetch (또는 로컬 파일 읽기)
//      - code_pattern 정규식으로 grep
//   3. 결과:
//      - 모든 파일에서 hit → status: done
//      - 일부 파일에서 hit → status: partial
//      - 어디서도 hit 안 됨 → status: not_implemented 유지
//   4. status 변화한 항목 + stats 자동 재계산 → business-agreements.json 자동 갱신
//   5. 변경 있으면 commit + 텔레그램 알림
//
// 환경변수: 없음 (로컬 파일만 읽음, 로컬 grep)
// ════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const AGREEMENTS_PATH = path.join(REPO_ROOT, '_decisions/business-agreements.json');

function loadAgreements() {
  return JSON.parse(fs.readFileSync(AGREEMENTS_PATH, 'utf8'));
}

function fileExists(relPath) {
  return fs.existsSync(path.join(REPO_ROOT, relPath));
}

function grepFile(relPath, pattern, minMatches = 1) {
  const fullPath = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return { exists: false, hit: false, matches: 0 };
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const regex = new RegExp(pattern, 'gi');
    const matches = (content.match(regex) || []).length;
    return { exists: true, hit: matches >= minMatches, matches };
  } catch (e) {
    return { exists: false, hit: false, matches: 0, error: e.message };
  }
}

function grepFileAll(relPath, patterns) {
  // patterns: 정규식 배열 — 모두 hit해야 통과 (AND 조건)
  const fullPath = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return { exists: false, hit: false };
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hits = patterns.map(p => {
      const r = new RegExp(p, 'i');
      return r.test(content);
    });
    return { exists: true, hit: hits.every(h => h), hits_detail: hits };
  } catch (e) {
    return { exists: false, hit: false, error: e.message };
  }
}

function verifyAgreement(agreement) {
  const loc = agreement.expected_location;
  if (!loc || !loc.files) {
    return { newStatus: agreement.status, detail: 'expected_location 누락 — skip' };
  }

  // 패턴 모드:
  // - code_pattern (string): 기본 (1회 hit 통과)
  // - code_patterns_all (array): AND 조건 (모든 패턴 hit해야 통과)
  // - min_matches (number): 최소 매칭 횟수 (단일 패턴용)
  const minMatches = loc.min_matches || 1;
  const useAnd = Array.isArray(loc.code_patterns_all);

  const results = loc.files.map(f => {
    if (useAnd) {
      return { file: f, ...grepFileAll(f, loc.code_patterns_all) };
    } else if (loc.code_pattern) {
      return { file: f, ...grepFile(f, loc.code_pattern, minMatches) };
    } else {
      return { file: f, exists: false, hit: false };
    }
  });

  const totalFiles = results.length;
  const existingFiles = results.filter(r => r.exists).length;
  const hitFiles = results.filter(r => r.hit).length;

  let newStatus;
  if (existingFiles === 0) {
    newStatus = 'not_implemented';
  } else if (hitFiles === totalFiles && existingFiles === totalFiles) {
    newStatus = 'done';
  } else if (hitFiles > 0) {
    newStatus = 'partial';
  } else {
    newStatus = 'not_implemented';
  }

  if (agreement.status === 'deferred') {
    newStatus = 'deferred';
  }

  return {
    newStatus,
    detail: `${hitFiles}/${totalFiles} files hit (existing: ${existingFiles}${useAnd ? ', AND mode' : (minMatches > 1 ? `, min ${minMatches}` : '')})`,
    file_results: results.map(r => `${r.file}: ${r.exists ? (r.hit ? '✅' : '❌') : '⚠️파일없음'}`),
  };
}

function recalcStats(agreements) {
  const stats = { total: agreements.length, done: 0, partial: 0, not_implemented: 0, deferred: 0 };
  agreements.forEach(a => {
    if (stats[a.status] !== undefined) stats[a.status] += 1;
  });
  return stats;
}

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  verification-gap-bot — 사업 합의 자동 검증 (부칙 20)');
  console.log('═══════════════════════════════════════════════════════════════');

  const data = loadAgreements();
  const before = JSON.parse(JSON.stringify(data));

  const changes = [];
  data.agreements.forEach(agr => {
    const result = verifyAgreement(agr);
    if (result.newStatus !== agr.status) {
      const old = agr.status;
      agr.status = result.newStatus;
      if (result.newStatus === 'done' && !agr.verified_at) {
        agr.verified_at = new Date().toISOString();
        agr.verified_commit = process.env.GITHUB_SHA || 'local';
      }
      if (result.newStatus !== 'done' && old === 'done') {
        // 후퇴 — 코드 사라짐 (드물지만 발생 가능)
        agr.verified_at = null;
        agr.verified_commit = null;
      }
      changes.push({ id: agr.id, from: old, to: result.newStatus, detail: result.detail });
    }
    console.log(`${agr.id} [${agr.status}] — ${result.detail}`);
  });

  data.stats = recalcStats(data.agreements);
  data.updated_at = new Date().toISOString();

  console.log('');
  console.log('── 변경 사항 ──');
  if (changes.length === 0) {
    console.log('변경 없음.');
  } else {
    changes.forEach(c => console.log(`  ${c.id}: ${c.from} → ${c.to} (${c.detail})`));
  }
  console.log('');
  console.log('── 최종 stats ──');
  console.log(JSON.stringify(data.stats, null, 2));

  fs.writeFileSync(AGREEMENTS_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log('');
  console.log('✅ business-agreements.json 갱신 완료');

  // GitHub Actions에서 후속 step이 사용하도록 환경변수 출력
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changes_count=${changes.length}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `not_implemented=${data.stats.not_implemented}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `partial=${data.stats.partial}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `done=${data.stats.done}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total=${data.stats.total}\n`);
  }
}

main();
