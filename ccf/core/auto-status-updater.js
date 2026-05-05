// ============================================================
// ccf/core/auto-status-updater.js
// ============================================================
//
// 작업 완료 자동 감지 (CCF 7원칙 3번)
//
// 흐름:
//   Claude가 ops 알림 endpoint(POST /api/email/ops/notify-claude-work) 호출
//   → 본 모듈이 알림 본문에서 task_id를 추출
//   → tasks.json에서 해당 task의 status를 done으로 갱신
//   → completed_at 자동 기록
//   → history[] 항목 추가
//
// 호출 위치 (서버 측):
//   /api/email/ops/notify-claude-work.js 안에서 sendOpsEmail 직후
//   import { applyOpsCompletion } from '../../../ccf/core/auto-status-updater.js';
//
// 호출 위치 (CLI):
//   node ccf/core/auto-status-updater.js BL-COMMAND-CENTER "Phase A 완료"
//
// 안전 장치:
//   - 같은 task_id에 대한 done 갱신은 idempotent (이미 done이면 noop)
//   - history[]에는 매번 추가 (멱등성 깨지 않게 timestamp+action 조합으로 dedup)
// ============================================================

/* eslint-env node */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname  = typeof __filename !== 'undefined' ? dirname(__filename) : dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = resolve(__dirname, '..', '..');
const TASKS_PATH = resolve(REPO_ROOT, 'tasks.json');

/**
 * step / summary 문자열에서 task_id 추출
 * 예: "BL-COMMAND-CENTER Phase A 완료" → "BL-COMMAND-CENTER"
 *      "Phase 3 Step 5"                → null
 *
 * @param {{step?:string, summary?:string, task_id?:string}} body
 * @returns {string|null}
 */
export function extractTaskId(body) {
  if (body?.task_id && /^[A-Z][A-Z0-9-]+$/.test(body.task_id)) return body.task_id;
  const blob = `${body?.step || ''} ${body?.summary || ''}`;
  // BL-FOO 또는 D-NNN 같은 ID 패턴 (영문 대문자로 시작 + 하이픈 포함 + 영숫자)
  const m = blob.match(/\b(BL-[A-Z][A-Z0-9-]+|D-\d{3,}|TASK-[A-Z][A-Z0-9-]+)\b/);
  return m ? m[1] : null;
}

/**
 * tasks.json 로드 (없으면 빈 스키마 반환)
 */
export function loadTasks(path = TASKS_PATH) {
  if (!existsSync(path)) {
    return {
      version: '2.0',
      schema: 'ccf-tasks-v2',
      updated_at: new Date().toISOString(),
      tasks: [],
    };
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * tasks.json 저장
 */
export function saveTasks(json, path = TASKS_PATH) {
  json.updated_at = new Date().toISOString();
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

/**
 * 작업 완료 적용 (메인 엔트리)
 *
 * @param {{step?:string, summary?:string, task_id?:string, by?:string, commit_hash?:string}} body — ops 알림 본문
 * @param {string} [tasksPath]
 * @returns {{updated:boolean, taskId:string|null, prevStatus:string|null, reason?:string}}
 */
export function applyOpsCompletion(body, tasksPath = TASKS_PATH) {
  const taskId = extractTaskId(body);
  if (!taskId) return { updated: false, taskId: null, prevStatus: null, reason: 'no task_id detected' };

  let json;
  try { json = loadTasks(tasksPath); }
  catch (e) { return { updated: false, taskId, prevStatus: null, reason: `load failed: ${e.message}` }; }

  const idx = (json.tasks || []).findIndex(t => t.id === taskId);
  if (idx === -1) return { updated: false, taskId, prevStatus: null, reason: 'task not found in tasks.json' };

  const task = json.tasks[idx];
  const prevStatus = task.status || 'pending';

  // 멱등: 이미 done이면 history만 추가하고 status 유지
  const now = new Date().toISOString();
  if (!Array.isArray(task.history)) task.history = [];

  const histEntry = {
    at: now,
    by: body.by || '🤖 Claude',
    action: `ops 알림 발송 — ${body.step || '(no step)'}: ${body.summary || ''}`.slice(0, 300),
    commit_hash: body.commit_hash || null,
  };

  // dedup: 동일 timestamp+action이 1초 이내에 이미 있으면 추가 생략
  const dup = task.history.some(h =>
    h.action === histEntry.action &&
    Math.abs(new Date(h.at).getTime() - new Date(now).getTime()) < 1000
  );
  if (!dup) task.history.push(histEntry);

  if (prevStatus !== 'done') {
    task.status = 'done';
    task.completed_at = now;
  }

  // stats 자동 재계산
  recalcStats(json);

  saveTasks(json, tasksPath);
  return { updated: true, taskId, prevStatus, newStatus: task.status, completedAt: task.completed_at };
}

/**
 * stats 재계산 — done/pending/in_progress/blocked 카운트 갱신
 */
export function recalcStats(json) {
  const tasks = json.tasks || [];
  const stats = { total: tasks.length, done: 0, in_progress: 0, pending: 0, blocked: 0, autonomous_ready: 0 };
  for (const t of tasks) {
    const s = t.status || 'pending';
    if (stats[s] != null) stats[s] += 1;
    if (s === 'pending' && t.claude_can_auto && t.autonomous?.can_run_alone) {
      const noBlock = !t.blocker;
      const reqDec  = (t.autonomous?.requires_decisions_first || []).length === 0;
      if (noBlock && reqDec) stats.autonomous_ready += 1;
    }
  }
  json.stats = stats;
  return stats;
}

/**
 * 작업 시작 시각 기록 (카드 클릭 시점)
 *
 * @param {string} taskId
 * @param {'CEO'|'STAFF'|'CLAUDE'} startedBy
 * @param {string} [tasksPath]
 */
export function markStarted(taskId, startedBy, tasksPath = TASKS_PATH) {
  const json = loadTasks(tasksPath);
  const task = (json.tasks || []).find(t => t.id === taskId);
  if (!task) return { updated: false, reason: 'task not found' };

  const now = new Date().toISOString();
  if (!task.started_at) task.started_at = now;
  task.started_by = startedBy;
  if (task.status === 'pending') task.status = 'in_progress';

  if (!Array.isArray(task.history)) task.history = [];
  task.history.push({
    at: now,
    by: startedBy,
    action: `작업 시작 (${startedBy})`,
  });

  recalcStats(json);
  saveTasks(json, tasksPath);
  return { updated: true, startedAt: now };
}

// ────────────────────────────────────────────────────────────
// CLI 모드
// ────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , taskId, ...summaryParts] = process.argv;
  if (!taskId) {
    console.error('Usage: node auto-status-updater.js <TASK_ID> [summary...]');
    process.exit(1);
  }
  const summary = summaryParts.join(' ') || '(CLI 호출)';
  const result = applyOpsCompletion({ task_id: taskId, step: 'CLI', summary });
  console.log(JSON.stringify(result, null, 2));
}
