// ============================================================
// /js/stats.js — TW B2B Task Statistics (Single Source Module)
// ============================================================
//
// 헌법 부칙 5 / D-010 — 카테고리별 단일 진실 매핑
// ECHO_LOG 2026-05-03 [DECISION] stats.js 단일 통계 모듈 신설
//
// 목적:
//   - tasks.json의 통계를 단일 함수가 단일 답을 반환하도록 통합.
//   - admin-hub.html (Category 0 — 라우팅) 과
//     admin-tasks.html (Category 2 — Task & Status 단일 진실)
//     양쪽이 같은 모듈을 import하여 동기화 깨짐 방지.
//
// 설계 원칙:
//   - 외부 의존성 없음 (브라우저 fetch만 사용)
//   - 캐시 (60초) — 같은 페이지 안의 중복 호출 폭주 방지
//   - 실패 시 throw (호출자가 처리)
//
// 사용:
//   import { computeTasksStats } from '/js/stats.js?v=1';
//   const stats = await computeTasksStats();
//   stats.total / stats.done / stats.in_progress / stats.pending / stats.blocked
//   stats.activeP0Count / stats.activeP1Count / stats.activeP2Count
//   stats.activeP0Ids: string[]   (P0이면서 status !== 'done' 인 ID 배열)
//   stats.byCategory: { [cat]: { total, done, pending, ... } }
//   stats.updatedAt: string      (tasks.json 자체의 updated_at)
//   stats.fetchedAt: number      (Date.now() 시점)
// ============================================================

const TASKS_URL = '/tasks.json';
const CACHE_TTL_MS = 60 * 1000; // 60초

let _cache = null; // { stats, fetchedAt }

/**
 * tasks.json을 fetch하고 통계를 계산해 반환.
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<TasksStats>}
 */
export async function computeTasksStats(opts = {}) {
  const { force = false } = opts;
  const now = Date.now();

  if (!force && _cache && (now - _cache.fetchedAt) < CACHE_TTL_MS) {
    return _cache.stats;
  }

  const res = await fetch(TASKS_URL + '?t=' + now);
  if (!res.ok) {
    throw new Error('[stats.js] tasks.json fetch failed: HTTP ' + res.status);
  }
  const data = await res.json();
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];

  // 상태별 카운트
  const byStatus = { pending: 0, in_progress: 0, done: 0, blocked: 0, _other: 0 };
  // 우선순위별 활성 카운트 (status !== 'done')
  const activeByPriority = { P0: 0, P1: 0, P2: 0, P3: 0, _other: 0 };
  const activeP0Ids = [];
  // 카테고리별 집계
  const byCategory = {};

  for (const t of tasks) {
    const status = t.status || '_other';
    if (byStatus[status] === undefined) byStatus._other++;
    else byStatus[status]++;

    const priority = t.priority || '_other';
    const isActive = status !== 'done';
    if (isActive) {
      if (activeByPriority[priority] === undefined) activeByPriority._other++;
      else activeByPriority[priority]++;
      if (priority === 'P0') activeP0Ids.push(t.id);
    }

    const cat = t.category || 'uncategorized';
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, pending: 0, in_progress: 0, done: 0, blocked: 0 };
    }
    byCategory[cat].total++;
    if (byCategory[cat][status] !== undefined) byCategory[cat][status]++;
  }

  const total = tasks.length;
  const done = byStatus.done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const stats = {
    total,
    pending: byStatus.pending,
    in_progress: byStatus.in_progress,
    done,
    blocked: byStatus.blocked,
    donePercent: pct,

    activeP0Count: activeByPriority.P0,
    activeP1Count: activeByPriority.P1,
    activeP2Count: activeByPriority.P2,
    activeP3Count: activeByPriority.P3,
    activeP0Ids,

    byCategory,
    updatedAt: data.updated_at || null,
    deadline: data.deadline || null,
    fetchedAt: now,
    rawStats: data.stats || null, // tasks.json에 미리 계산된 stats가 있다면 비교용으로 노출
  };

  _cache = { stats, fetchedAt: now };
  return stats;
}

/**
 * 캐시 강제 무효화 (작업 직후 즉시 갱신이 필요할 때).
 */
export function invalidateTasksStatsCache() {
  _cache = null;
}

/**
 * @typedef {Object} TasksStats
 * @property {number} total
 * @property {number} pending
 * @property {number} in_progress
 * @property {number} done
 * @property {number} blocked
 * @property {number} donePercent
 * @property {number} activeP0Count
 * @property {number} activeP1Count
 * @property {number} activeP2Count
 * @property {number} activeP3Count
 * @property {string[]} activeP0Ids
 * @property {Object<string, {total:number,pending:number,in_progress:number,done:number,blocked:number}>} byCategory
 * @property {string|null} updatedAt
 * @property {string|null} deadline
 * @property {number} fetchedAt
 * @property {Object|null} rawStats
 */
