#!/usr/bin/env node
// _os/scripts/step-self-verify-bot.mjs
//
// 작업: BL-STEP-SELF-VERIFY (거짓 done 사고 재발 방지)
// 근거: 2026-05-10 BL-AUTO-REORDER-PAUSE step 6 거짓 done 사고
//   - step 텍스트: "헌법 부칙 — 새 P0 박을 때 자동 재정렬 규칙"
//   - 실제로 박힌 것: _os/playbook/auto-reorder-pause.md (playbook)
//   - 누락된 것: 헌법 부칙 17 신설 (텍스트와 mismatch) + chat-log 매핑
//
// 헌법 부합:
//   ② 무인 실행: main push 즉시 자동 실행
//   ④ 전수 추적: 위반 시 task.notes에 ⚠️ 워닝 추가 + history 기록
//   ⑤ 무인 검증: dry-run 옵션 지원
//   부칙 14 준수: 새 운영 룰은 헌법 아닌 playbook에 박음 → 디테일은 _os/playbook/step-self-verify.md
//
// 작동 흐름:
//   1. tasks.json 로드
//   2. 최근 commit (since-commit ~ HEAD) 분석 — 어떤 task의 어떤 step이 done 전환되었는지
//   3. done 전환된 step마다 텍스트 스캔 → 키워드 매핑 검증
//   4. 미충족 키워드 발견 시:
//      - status: done → in_progress 자동 롤백
//      - step.status: done → pending 자동 롤백
//      - notes에 ⚠️ 워닝 추가 (사람용 + AI용 양쪽)
//      - history에 verification_failed 이벤트 박음
//   5. 변경 있으면 [step-verify-bot] commit + push
//
// 사용:
//   node _os/scripts/step-self-verify-bot.mjs                          # 직전 1개 commit 검증
//   node _os/scripts/step-self-verify-bot.mjs --since-commit <SHA>      # 범위 검증
//   node _os/scripts/step-self-verify-bot.mjs --dry-run                 # 검증만 (변경 안 함)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const TASKS_JSON = resolve(REPO_ROOT, 'tasks.json');

// ───────────────────────────── 키워드 → 산출물 매핑 표 ─────────────────────────────
// step 텍스트에 키워드 발견 시 해당 산출물의 변경/존재를 검증
const KEYWORD_RULES = [
  {
    name: 'charter',
    keywords: [/헌법\s*부칙\s*\d+\s*(신설|추가|박음)/, /OPERATIONS_CHARTER\.md/, /부칙\s*신설/],
    verify: ({ diffFiles, gitDiff }) => {
      const charterChanged = diffFiles.some(f => f === 'OPERATIONS_CHARTER.md');
      if (!charterChanged) return { ok: false, reason: 'OPERATIONS_CHARTER.md 변경 없음' };
      // 새 부칙 추가 패턴 매치
      const newClause = /\+- \*\*부칙\s+\d+/.test(gitDiff);
      if (!newClause) return { ok: false, reason: 'OPERATIONS_CHARTER.md 변경됐으나 새 부칙 패턴(`+- **부칙 N`) 없음' };
      return { ok: true };
    },
  },
  {
    name: 'playbook',
    keywords: [/playbook/i, /_os\/playbook/],
    verify: ({ diffFiles }) => {
      const pbChanged = diffFiles.some(f => f.startsWith('_os/playbook/') && f.endsWith('.md'));
      if (!pbChanged) return { ok: false, reason: '_os/playbook/*.md 신규/수정 없음' };
      return { ok: true };
    },
  },
  {
    name: 'chat-log',
    keywords: [/chat[-_]?log/i, /_chat-logs/],
    verify: ({ diffFiles, taskId }) => {
      const logChanged = diffFiles.some(f => f.startsWith('_chat-logs/') && f.endsWith('.md'));
      if (!logChanged) return { ok: false, reason: '_chat-logs/*.md 신규 없음' };
      // index.json byTask 매핑은 scan-bot이 5분 후 자동 처리 — 본 봇은 파일 존재만 검증
      // (즉시 검증하면 false positive 발생)
      return { ok: true };
    },
  },
  {
    name: 'commit-step-tag',
    keywords: [/단계.*commit/i, /step.*commit/i, /\[step:done/],
    verify: ({ commitMsg, stepNum }) => {
      const tag = `[step:done:${stepNum}]`;
      if (!commitMsg.includes(tag)) return { ok: false, reason: `commit subject에 ${tag} 태그 없음` };
      return { ok: true };
    },
  },
  {
    name: 'live-verify',
    keywords: [/라이브\s*검증/, /live\s*verify/i, /라이브\s*반영/, /production\s*verify/i],
    verify: () => {
      // 라이브 URL 검증은 봇이 직접 못 함 (CI 환경) → 보고용 워닝만
      return { ok: true, warn: '⚠️ "라이브 검증" 키워드 — 봇이 검증 못 함. 채팅에서 curl 결과 확인 필수.' };
    },
  },
];

// ───────────────────────────── 헬퍼 ─────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    sinceCommit: args.find(a => a.startsWith('--since-commit='))?.split('=')[1]
      || (args.includes('--since-commit') ? args[args.indexOf('--since-commit') + 1] : null),
    dryRun: args.includes('--dry-run'),
  };
}

function loadTasks() {
  return JSON.parse(readFileSync(TASKS_JSON, 'utf-8'));
}

function saveTasks(data) {
  writeFileSync(TASKS_JSON, JSON.stringify(data, null, 2) + '\n');
}

function getCommitRange(sinceCommit) {
  const range = sinceCommit ? `${sinceCommit}..HEAD` : 'HEAD~1..HEAD';
  try {
    const log = execSync(`git log ${range} --pretty=format:%H%x09%s`, { cwd: REPO_ROOT }).toString().trim();
    if (!log) return [];
    return log.split('\n').map(line => {
      const [sha, ...rest] = line.split('\t');
      return { sha, msg: rest.join('\t') };
    });
  } catch (e) {
    console.error(`⚠️ git log 실패: ${e.message}`);
    return [];
  }
}

function getCommitDiff(sha) {
  try {
    const files = execSync(`git show --name-only --pretty=format: ${sha}`, { cwd: REPO_ROOT })
      .toString().trim().split('\n').filter(Boolean);
    const diff = execSync(`git show ${sha}`, { cwd: REPO_ROOT }).toString();
    return { diffFiles: files, gitDiff: diff };
  } catch (e) {
    return { diffFiles: [], gitDiff: '' };
  }
}

// commit msg에서 task ID + step done 태그 추출
function parseCommitForSteps(msg) {
  const taskIdMatch = msg.match(/\b(BL-[A-Z0-9-]+|CHG-\d+|SQ-[A-Z0-9-]+|IP-[A-Z0-9-]+|UX-[A-Z0-9-]+|PHASE-[A-Z0-9-]+)\b/);
  const taskId = taskIdMatch ? taskIdMatch[1] : null;
  const stepMatches = [...msg.matchAll(/\[step:done:(\d+)\]/g)].map(m => parseInt(m[1], 10));
  return { taskId, stepNums: stepMatches };
}

// ───────────────────────────── 메인 ─────────────────────────────
function main() {
  const { sinceCommit, dryRun } = parseArgs();
  console.log(`📍 step-self-verify-bot 시작 (range: ${sinceCommit || 'HEAD~1..HEAD'}, dryRun: ${dryRun})`);

  const commits = getCommitRange(sinceCommit);
  if (commits.length === 0) {
    console.log('⚪ 분석할 commit 없음');
    return;
  }

  const data = loadTasks();
  const tasksById = Object.fromEntries(data.tasks.map(t => [t.id, t]));

  const violations = []; // [{taskId, stepNum, stepName, keywordRule, reason}]
  const warnings = [];

  for (const { sha, msg } of commits) {
    // 봇 commit 스킵
    if (/^\[(auto-detect-bot|scan-bot|health-bot|sync-bot|activity-bot|step-verify-bot)\]/.test(msg)) {
      continue;
    }

    const { taskId, stepNums } = parseCommitForSteps(msg);
    if (!taskId || stepNums.length === 0) continue;

    const task = tasksById[taskId];
    if (!task) {
      console.log(`⚠️ ${sha.slice(0, 7)}: task ${taskId} 없음 — 스킵`);
      continue;
    }

    const steps = task.progress?.steps || [];
    const { diffFiles, gitDiff } = getCommitDiff(sha);

    for (const stepNum of stepNums) {
      const step = steps[stepNum - 1];
      if (!step) continue;

      const stepName = step.name || '';
      // 각 키워드 규칙 검증
      for (const rule of KEYWORD_RULES) {
        const hit = rule.keywords.some(kw => kw.test(stepName));
        if (!hit) continue;

        const result = rule.verify({ diffFiles, gitDiff, commitMsg: msg, taskId, stepNum });
        if (!result.ok) {
          violations.push({
            taskId,
            stepNum,
            stepName,
            rule: rule.name,
            reason: result.reason,
            sha: sha.slice(0, 7),
          });
        } else if (result.warn) {
          warnings.push({ taskId, stepNum, warn: result.warn });
        }
      }
    }
  }

  if (violations.length === 0 && warnings.length === 0) {
    console.log('✅ 검증 통과 — 위반 사항 없음');
    return;
  }

  // 위반 처리: status 롤백 + notes 워닝
  const NOW = new Date().toISOString();
  const violatedTaskIds = new Set();

  for (const v of violations) {
    const task = tasksById[v.taskId];
    if (!task) continue;
    violatedTaskIds.add(v.taskId);

    // step 롤백
    const step = task.progress.steps[v.stepNum - 1];
    if (step && step.status === 'done') {
      step.status = 'pending';
      step.done = false;
      step.verification_failed = {
        rule: v.rule,
        reason: v.reason,
        sha: v.sha,
        at: NOW,
      };
    }

    // task status 롤백 (done이었으면 in_progress로)
    if (task.status === 'done') {
      task.status = 'in_progress';
      delete task.completed_at;
    }

    // history 박기
    task.history = task.history || [];
    task.history.push({
      at: NOW,
      event: 'step_verification_failed',
      step_num: v.stepNum,
      step_name: v.stepName,
      rule: v.rule,
      reason: v.reason,
      commit: v.sha,
    });

    // notes 워닝 추가 (있으면 prepend)
    const warningMsg = `⚠️ step ${v.stepNum} 검증 실패 (${v.rule}): ${v.reason}. commit ${v.sha}. step-verify-bot이 자동 롤백 — 누락분 박고 다시 done 처리.`;
    task.notes = task.notes ? `${warningMsg}\n\n${task.notes}` : warningMsg;

    task.updated_at = NOW;

    console.log(`❌ ${v.taskId} step ${v.stepNum} (${v.rule}): ${v.reason}`);
  }

  for (const w of warnings) {
    console.log(`⚠️ ${w.taskId} step ${w.stepNum}: ${w.warn}`);
  }

  if (dryRun) {
    console.log(`\n📋 [DRY-RUN] 위반 ${violations.length}건 / 워닝 ${warnings.length}건 발견 — 변경 적용 안 함`);
    return;
  }

  if (violatedTaskIds.size > 0) {
    data.updated_at = NOW;
    saveTasks(data);
    console.log(`\n💾 tasks.json 갱신 완료 — ${violatedTaskIds.size}개 task 롤백`);
    console.log(`다음 단계: GitHub Actions가 [step-verify-bot] commit + push → ops 알림 발송`);
  }
}

main();
