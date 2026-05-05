// ============================================================
// ccf/core/queue-engine.js
// ============================================================
//
// 5단계 우선순위 정렬 엔진 (CCF 7원칙 4번)
//
// 입력: tasks.json의 tasks[] 배열
// 출력: 정렬된 작업 큐 (자율 큐 / 직원 가능 큐 / 대표님 결정 큐)
//
// 정렬 규칙 (순서대로 적용):
//   1) blocked 제외
//   2) depends_on 모두 done인 작업만 진입
//   3) category=infrastructure 가중치 (인프라 먼저)
//   4) 의존성 카운트 (이걸 기다리는 다른 작업 수 ↑ 우선)
//   5) P0→P1→P2→P3 then small→medium→large
//
// 사용처:
//   - admin-status.html 화면 최상단 큐 렌더링
//   - SOLO_WORK_QUEUE 자동 생성 (외근 모드)
//   - 새 채팅 인계서 "다음 작업" 자동 결정
//
// 다른 프로젝트로 그대로 복사 가능 — tasks.json 스키마만 맞으면 작동.
// ============================================================

/* eslint-env node, browser */

const PRIORITY_WEIGHT = { P0: 0, P1: 1, P2: 2, P3: 3 };
const SIZE_WEIGHT     = { small: 0, medium: 1, large: 2 };
const CATEGORY_BONUS  = { infrastructure: -10, bug: -5, ux: 0, feature: 0, docs: 5, dev: 0, design: 0, 'design-system': 0, analytics: 5 };

/**
 * 의존성 카운트 맵 — 이 task를 기다리는 다른 task 수
 * @param {Array} tasks
 * @returns {Object<string, number>}
 */
function buildDependencyCount(tasks) {
  const count = {};
  for (const t of tasks) count[t.id] = 0;
  for (const t of tasks) {
    const deps = Array.isArray(t.depends_on) ? t.depends_on : [];
    for (const dep of deps) {
      if (count[dep] != null) count[dep] += 1;
    }
  }
  return count;
}

/**
 * task가 진입 가능한 상태인지 (선행 작업 모두 done)
 * @param {Object} task
 * @param {Array} allTasks
 * @returns {boolean}
 */
function canEnter(task, allTasks) {
  const deps = Array.isArray(task.depends_on) ? task.depends_on : [];
  if (deps.length === 0) return true;
  const byId = {};
  for (const t of allTasks) byId[t.id] = t;
  for (const dep of deps) {
    const depTask = byId[dep];
    if (!depTask) continue; // 모르는 의존성은 무시
    if (depTask.status !== 'done') return false;
  }
  return true;
}

/**
 * 단일 task의 정렬 점수 계산 (낮을수록 우선)
 * @param {Object} task
 * @param {Object<string,number>} depCount
 * @returns {number}
 */
function scoreTask(task, depCount) {
  let score = 0;

  // 3) 카테고리 가중치 (인프라 -10, 버그 -5)
  score += CATEGORY_BONUS[task.category] ?? 0;

  // 4) 의존성 카운트 (이걸 기다리는 작업 수 ↑ 우선) — count 1당 -2
  score += -2 * (depCount[task.id] || 0);

  // 5) P0→P1→P2→P3 (P0가 가장 우선)
  score += (PRIORITY_WEIGHT[task.priority] ?? 99) * 100;

  // 5) size: small→medium→large (작은 것 먼저, 빨리 클리어)
  score += SIZE_WEIGHT[task.size] ?? 1;

  return score;
}

/**
 * 메인 정렬 함수 — 자율 / 직원 / CEO 큐를 분리해 반환
 *
 * @param {Object} tasksJson — tasks.json 전체 객체 (또는 { tasks: [...] })
 * @returns {{
 *   autonomous: Array,        // 🤖 Claude 자율 진행 가능
 *   staff: Array,             // 👥 직원 진행 가능 (대표님 결정 불필요)
 *   ceoDecision: Array,       // 👤 대표님 결정 필요
 *   blocked: Array,           // 🚫 막힌 작업
 *   totalsByStatus: Object
 * }}
 */
function buildQueue(tasksJson) {
  const tasks = Array.isArray(tasksJson) ? tasksJson : (tasksJson?.tasks || []);
  const depCount = buildDependencyCount(tasks);

  const autonomous   = [];
  const staff        = [];
  const ceoDecision  = [];
  const blocked      = [];

  const totalsByStatus = { pending: 0, in_progress: 0, done: 0, blocked: 0 };

  for (const t of tasks) {
    const status = t.status || 'pending';
    totalsByStatus[status] = (totalsByStatus[status] || 0) + 1;

    // 1) blocked 제외 → blocked 큐에 별도 보관
    if (status === 'blocked' || t.blocker) {
      blocked.push(t);
      continue;
    }

    // 완료/진행 중은 큐 정렬 대상 아님
    if (status === 'done' || status === 'in_progress') continue;

    // 2) 선행 작업 모두 done인 것만 진입
    if (!canEnter(t, tasks)) continue;

    // 분류
    const requiresDecisions = Array.isArray(t.autonomous?.requires_decisions_first) && t.autonomous.requires_decisions_first.length > 0;
    const canAutoRun        = t.claude_can_auto === true && t.autonomous?.can_run_alone === true && !requiresDecisions;

    if (canAutoRun) {
      autonomous.push(t);
    } else if (requiresDecisions) {
      ceoDecision.push(t);
    } else {
      // claude_can_auto=false 이지만 결정 대기 명시 없는 작업 = 직원 진행 가능
      staff.push(t);
    }
  }

  // 5단계 정렬 적용
  const sortFn = (a, b) => {
    const sa = scoreTask(a, depCount);
    const sb = scoreTask(b, depCount);
    if (sa !== sb) return sa - sb;
    // tie-breaker: 생성일 오름차순 (오래된 것 먼저)
    const ta = a.created_at || '';
    const tb = b.created_at || '';
    return ta.localeCompare(tb);
  };

  autonomous.sort(sortFn);
  staff.sort(sortFn);
  ceoDecision.sort(sortFn);
  blocked.sort(sortFn);

  return { autonomous, staff, ceoDecision, blocked, totalsByStatus };
}

/**
 * 한 task의 시작자 라벨 (UI 표시용)
 * @param {Object} task
 * @returns {string}
 */
function startedByLabel(task) {
  const v = task.started_by || null;
  if (v === 'CLAUDE') return '🤖 Claude';
  if (v === 'STAFF')  return '👥 직원';
  if (v === 'CEO')    return '👤 대표님';
  return '⏳ 미시작';
}

// ────────────────────────────────────────────────────────────
// ESM exports (브라우저 import 시 자동으로 window.CCF에 등록)
// ────────────────────────────────────────────────────────────
export {
  buildQueue,
  buildDependencyCount,
  canEnter,
  scoreTask,
  startedByLabel,
  PRIORITY_WEIGHT,
  SIZE_WEIGHT,
  CATEGORY_BONUS,
};

export default {
  buildQueue,
  buildDependencyCount,
  canEnter,
  scoreTask,
  startedByLabel,
  PRIORITY_WEIGHT,
  SIZE_WEIGHT,
  CATEGORY_BONUS,
};

// 브라우저에서 <script type="module" src="..."> 로 로드 시 전역 등록
if (typeof window !== 'undefined') {
  window.CCF = window.CCF || {};
  window.CCF.queueEngine = {
    buildQueue,
    buildDependencyCount,
    canEnter,
    scoreTask,
    startedByLabel,
    PRIORITY_WEIGHT,
    SIZE_WEIGHT,
    CATEGORY_BONUS,
  };
}
