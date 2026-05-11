#!/usr/bin/env node
/**
 * TW B2B — 자동 작업 등록 봇 (auto-task-from-health)
 *
 * 작업: BL-BASELINE-AUTO-TASK 단계 2~3
 * 결정: D-024 (2026-05-11)
 * 룰북: _os/playbook/auto-task-registry.md (단일 진실원)
 *
 * 목적:
 *   점검 봇 3종(health-check-admin / page-status-scan / charter-length-bot)이
 *   빨간불·노란불 발견 시, 그 결과를 tasks.json에 자동 BL로 등록.
 *
 * 입력:
 *   - _admin/_health.json (health-bot 결과)
 *   - pages-status.summary.json (scan-bot 결과)
 *
 * 출력:
 *   - tasks.json 갱신 (BL 등록/재개/자동 close)
 *   - stdout: 등록/해소 카운트 (commit message 생성용)
 *
 * 종료 코드:
 *   0 = 정상 (변경 있어도 없어도)
 *   1 = 에러
 *
 * 헌법 부칙 7: 단계 1개 = commit 1개 (이 스크립트는 step 2+3 한 commit)
 * 헌법 부칙 11: tasks.json 변경 시 stats 자동 재계산 (마지막에 수행)
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HEALTH_FILE = path.join(ROOT, '_admin/_health.json');
const PAGES_SUMMARY_FILE = path.join(ROOT, 'pages-status.summary.json');
// BL-AUTO-PAGE-STATUS-ADMIN-HUB (2026-05-11): retired 페이지 식별용 full 파일
//   summary에는 retired 정보가 없어서 안전망 차원에서 full을 함께 읽어 retired 셋 추출.
const PAGES_FULL_FILE = path.join(ROOT, 'pages-status.json');
const TASKS_FILE = path.join(ROOT, 'tasks.json');

const NOW = new Date().toISOString();
const NOW_MS = Date.now();
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// ─── 예외: BL 안 박는 check_name + status (룰북 9번) ─────────────
const SKIP_BL_RULES = [
  { check: 'vercel_sync', status: 'yellow', reason: '5~10분이면 자동 정상화' },
  { check: 'vercel_quota', status: 'yellow', reason: '24h 안에 자연 감소' },
];

// ─── 유틸 ─────────────────────────────────────────────────────────
function loadJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.warn(`⚠️ ${p} 파싱 실패: ${e.message}`); return null; }
}

function saveJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

/**
 * STABLE_KEY 생성 — 같은 종류 사고가 다시 발견될 때 동일 ID로 매칭되게.
 * 룰북 2번 — 숫자(N건) 또는 카테고리로 인코딩.
 */
function buildStableKey(check) {
  const name = check.name;
  if (name === 'admin_baseline') {
    const n = (check.changed_files || []).length;
    return n > 0 ? `${n}FILES` : 'GENERAL';
  }
  if (name === 'tasks_schema') {
    const n = (check.missing_source || []).length;
    return n > 0 ? `${n}MISSING` : 'GENERAL';
  }
  if (name === 'vercel_sync') return 'MISMATCH';
  if (name === 'vercel_quota') return 'NEAR-LIMIT';
  if (name === 'bots') {
    const dead = (check.dead_bots || []).slice().sort();
    if (dead.length === 0) return 'GENERAL';
    return dead.map(b => b.toUpperCase().replace(/[^A-Z0-9]/g, '-')).join('-').slice(0, 30);
  }
  return 'GENERAL';
}

function checkNameToBLPart(name) {
  return name.toUpperCase().replace(/_/g, '-');
}

function buildBLId(checkName, stableKey) {
  return `BL-AUTO-${checkNameToBLPart(checkName)}-${stableKey}`;
}

function isActive(status) {
  return ['pending', 'in_progress', 'paused', 'blocked'].includes(status);
}

function shouldSkipByRule(check) {
  for (const rule of SKIP_BL_RULES) {
    if (check.name === rule.check && check.status === rule.status) return rule.reason;
  }
  return null;
}

// ─── 핵심: 점검 결과 → BL 생성/재개/skip 판단 ────────────────────
function processHealthCheck(tasks, check) {
  if (check.status === 'green') return { action: 'noop' };
  if (check.status === 'unknown') return { action: 'noop' };

  const skipReason = shouldSkipByRule(check);
  if (skipReason) return { action: 'skip_by_rule', blId: `(${check.name}=${check.status})`, reason: skipReason };

  const stableKey = buildStableKey(check);
  const blId = buildBLId(check.name, stableKey);

  const existing = tasks.find(t => t.id === blId);

  if (existing) {
    if (isActive(existing.status)) {
      return { action: 'skip_active', blId };
    }
    if (existing.status === 'done') {
      const updatedMs = Date.parse(existing.updated_at || existing.created_at || NOW);
      if (NOW_MS - updatedMs < TWENTY_FOUR_HOURS) {
        return { action: 'skip_24h_guard', blId };
      }
      // REOPEN
      existing.status = 'pending';
      existing.updated_at = NOW;
      existing.history = existing.history || [];
      existing.history.push({
        at: NOW, by: 'auto-task-bot', action: 'reopened',
        detail: `점검 봇 재발견: ${check.detail}`
      });
      existing.notes = (existing.notes || '') + `\n\n[재개 ${NOW}] ${check.detail}`;
      return { action: 'reopen', blId };
    }
  }

  // CREATE
  const newBL = {
    id: blId,
    title: `[자동] ${check.detail}`,
    category: 'infrastructure',
    priority: check.status === 'red' ? 'P0' : 'P1',
    status: 'pending',
    claude_can_auto: true,
    approval_required: false,
    owner: 'claude',
    size: 'small',
    source: `auto_from_${check.name}`,
    created_at: NOW,
    updated_at: NOW,
    deadline: null,
    order: null,
    blocker: null,
    autonomous: {
      can_run_alone: true,
      estimated_hours: 1,
      requires_decisions_first: []
    },
    decision_ref: 'D-024',
    progress: { percent: 0, steps: [] },
    history: [{
      at: NOW, by: 'auto-task-bot', action: 'created',
      detail: `점검 봇 발견 (${check.name}=${check.status}): ${check.detail}`
    }],
    notes: `점검 봇 자동 등록 (${NOW})\n\ncheck_name: ${check.name}\nstatus: ${check.status}\ndetail: ${check.detail}\n\n진단 hint: 룰북 _os/playbook/auto-task-registry.md 참조. 해소 시 점검 봇이 green으로 박으면 자동 done.`
  };

  tasks.push(newBL);
  return { action: 'create', blId };
}

/**
 * 자동 close — 같은 check_name 의 BL 중 status가 active인 것을,
 * 점검 결과가 green이면 done 처리.
 */
function autoCloseHealthy(tasks, check) {
  if (check.status !== 'green') return [];
  const prefix = `BL-AUTO-${checkNameToBLPart(check.name)}-`;
  const closed = [];
  for (const t of tasks) {
    if (!t.id.startsWith(prefix)) continue;
    if (!isActive(t.status)) continue;
    t.status = 'done';
    t.updated_at = NOW;
    t.progress = t.progress || { percent: 0, steps: [] };
    t.progress.percent = 100;
    t.history = t.history || [];
    t.history.push({
      at: NOW, by: 'auto-task-bot', action: 'auto_resolved',
      detail: `점검 봇 ${check.name}이 green으로 전환됨`
    });
    t.notes = (t.notes || '') + `\n\n[자동 해소 ${NOW}] 점검 봇 green 전환`;
    closed.push(t.id);
  }
  return closed;
}

// ─── pages-status critical 페이지 처리 ──────────────────────────
//
// retired 안전망 (BL-AUTO-PAGE-STATUS-ADMIN-HUB, 2026-05-11):
//   summary에는 retired 정보가 없어서, full(pages-status.json)에서 retired
//   페이지의 BL ID 셋을 추출해 받음. 1차로 새 BL 생성 거부, 2차로 이미 등록된
//   active retired BL을 자동 close. scan 스크립트의 summary 필터(1차 안전망)와
//   함께 이중 방어. retired 페이지가 다시 critical에 박혀도 봇 자체가 거부.
function processPageStatus(tasks, pagesSummary, retiredBlIds = new Set()) {
  const results = [];
  if (!pagesSummary || !Array.isArray(pagesSummary.criticalPages)) return results;

  // 안전망 2: 이미 등록된 active retired BL 자동 close
  for (const t of tasks) {
    if (!t.id.startsWith('BL-AUTO-PAGE-STATUS-')) continue;
    if (!isActive(t.status)) continue;
    if (!retiredBlIds.has(t.id)) continue;
    t.status = 'done';
    t.updated_at = NOW;
    if (!t.progress) t.progress = { percent: 100, steps: [] };
    t.progress.percent = 100;
    t.history = t.history || [];
    t.history.push({
      at: NOW, by: 'auto-task-bot', action: 'auto_resolved',
      detail: 'retired 페이지 BL — auto-task-bot retired 안전망으로 close (BL-AUTO-PAGE-STATUS-ADMIN-HUB)'
    });
    t.notes = (t.notes || '') + `\n\n[자동 해소 ${NOW}] retired 페이지 BL — retired 셋과 매칭되어 자동 close`;
    results.push({ action: 'close', blId: t.id });
  }

  for (const page of pagesSummary.criticalPages) {
    const slug = (page.path || '').replace(/^\//, '').replace(/\.html$/, '').toUpperCase().replace(/[^A-Z0-9]/g, '-');
    if (!slug) continue;
    const blId = `BL-AUTO-PAGE-STATUS-${slug}`;
    // 안전망 1: retired 페이지는 새 BL 생성 거부
    if (retiredBlIds.has(blId)) {
      results.push({ action: 'skip_retired', blId });
      continue;
    }
    const detail = `페이지 ${page.path} 완성도 ${page.score}점 (약함: ${page.weakest})`;

    const existing = tasks.find(t => t.id === blId);
    if (existing) {
      if (isActive(existing.status)) { results.push({ action: 'skip_active', blId }); continue; }
      if (existing.status === 'done') {
        const updatedMs = Date.parse(existing.updated_at || NOW);
        if (NOW_MS - updatedMs < TWENTY_FOUR_HOURS) { results.push({ action: 'skip_24h_guard', blId }); continue; }
        existing.status = 'pending';
        existing.updated_at = NOW;
        existing.history.push({ at: NOW, by: 'auto-task-bot', action: 'reopened', detail });
        results.push({ action: 'reopen', blId });
        continue;
      }
    }

    const newBL = {
      id: blId,
      title: `[자동] ${detail}`,
      category: 'infrastructure',
      priority: page.score < 30 ? 'P0' : 'P1',
      status: 'pending',
      claude_can_auto: true,
      approval_required: false,
      owner: 'claude',
      size: 'small',
      source: 'auto_from_page_status',
      created_at: NOW,
      updated_at: NOW,
      deadline: null, order: null, blocker: null,
      autonomous: { can_run_alone: true, estimated_hours: 2, requires_decisions_first: [] },
      decision_ref: 'D-024',
      progress: { percent: 0, steps: [] },
      history: [{ at: NOW, by: 'auto-task-bot', action: 'created', detail }],
      notes: `scan-bot 자동 등록 (${NOW})\n\n페이지: ${page.path}\n점수: ${page.score}\n약점: ${page.weakest}\n\n진단 hint: scan-pages-status.mjs 결과. 약점 차원 보강 필요.`
    };
    tasks.push(newBL);
    results.push({ action: 'create', blId });
  }

  // auto-close: pagesSummary에 더 이상 critical 아닌데 active BL이 있으면 close
  const stillCritical = new Set((pagesSummary.criticalPages || []).map(p => {
    const slug = (p.path || '').replace(/^\//, '').replace(/\.html$/, '').toUpperCase().replace(/[^A-Z0-9]/g, '-');
    return `BL-AUTO-PAGE-STATUS-${slug}`;
  }));
  for (const t of tasks) {
    if (!t.id.startsWith('BL-AUTO-PAGE-STATUS-')) continue;
    if (!isActive(t.status)) continue;
    if (stillCritical.has(t.id)) continue;
    t.status = 'done';
    t.updated_at = NOW;
    t.progress.percent = 100;
    t.history.push({ at: NOW, by: 'auto-task-bot', action: 'auto_resolved', detail: 'critical 목록에서 빠짐' });
    t.notes = (t.notes || '') + `\n\n[자동 해소 ${NOW}] critical 목록에서 빠짐`;
    results.push({ action: 'close', blId: t.id });
  }

  return results;
}

// ─── stats 자동 재계산 (부칙 11) ────────────────────────────────
function recomputeStats(data) {
  const stats = { total: 0, done: 0, in_progress: 0, paused: 0, pending: 0, blocked: 0, autonomous_ready: 0, todo: 0, cancelled: 0 };
  for (const t of data.tasks) {
    stats.total += 1;
    if (stats[t.status] !== undefined) stats[t.status] += 1;
    if (t.claude_can_auto && (t.status === 'pending' || t.status === 'in_progress')) stats.autonomous_ready += 1;
  }
  stats.updated_at = NOW;
  data.stats = stats;
  data.updated_at = NOW;
}

// ─── 메인 ───────────────────────────────────────────────────────
function main() {
  const health = loadJSON(HEALTH_FILE);
  const pagesSummary = loadJSON(PAGES_SUMMARY_FILE);
  const pagesFull = loadJSON(PAGES_FULL_FILE);
  const tasksData = loadJSON(TASKS_FILE);

  // retired 페이지의 BL ID 셋 추출 (BL-AUTO-PAGE-STATUS-ADMIN-HUB)
  //   pages-status.json (full)의 r.retired === true 인 페이지를 BL ID로 변환.
  //   processPageStatus에 넘겨 새 BL 거부 + 기존 active retired BL 자동 close.
  const retiredBlIds = new Set();
  if (pagesFull && Array.isArray(pagesFull.pages)) {
    for (const p of pagesFull.pages) {
      if (!p.retired) continue;
      const slug = (p.path || '').replace(/^\//, '').replace(/\.html$/, '').toUpperCase().replace(/[^A-Z0-9]/g, '-');
      if (slug) retiredBlIds.add(`BL-AUTO-PAGE-STATUS-${slug}`);
    }
  }
  if (retiredBlIds.size > 0) {
    console.log(`ℹ️ retired 페이지 BL 거부 셋: ${[...retiredBlIds].join(', ')}`);
  }

  if (!tasksData || !Array.isArray(tasksData.tasks)) {
    console.error('❌ tasks.json 로드 실패');
    process.exit(1);
  }

  const created = [];
  const reopened = [];
  const closed = [];
  const skipped = [];

  // 1. health-check 결과 처리
  if (health && Array.isArray(health.checks)) {
    for (const check of health.checks) {
      // 발견 → 등록/재개
      const r = processHealthCheck(tasksData.tasks, check);
      if (r.action === 'create') created.push(r.blId);
      else if (r.action === 'reopen') reopened.push(r.blId);
      else if (r.action && r.action.startsWith('skip')) skipped.push({ blId: r.blId, action: r.action, reason: r.reason });

      // 자동 close
      const c = autoCloseHealthy(tasksData.tasks, check);
      closed.push(...c);
    }
  } else {
    console.log('ℹ️ _health.json 없음 — health 처리 skip');
  }

  // 2. pages-status critical 처리 (retired 안전망 포함)
  const pageResults = processPageStatus(tasksData.tasks, pagesSummary, retiredBlIds);
  for (const r of pageResults) {
    if (r.action === 'create') created.push(r.blId);
    else if (r.action === 'reopen') reopened.push(r.blId);
    else if (r.action === 'close') closed.push(r.blId);
    else if (r.action.startsWith('skip')) skipped.push({ blId: r.blId, action: r.action });
  }

  // 3. stats 재계산
  recomputeStats(tasksData);

  // 4. 변경 있으면 save
  const totalChange = created.length + reopened.length + closed.length;
  if (totalChange > 0) {
    saveJSON(TASKS_FILE, tasksData);
  }

  // 5. 보고
  console.log(`=== auto-task-from-health 실행 결과 (${NOW}) ===`);
  console.log(`등록: ${created.length}건`);
  for (const id of created) console.log(`  ✚ ${id}`);
  console.log(`재개: ${reopened.length}건`);
  for (const id of reopened) console.log(`  ↻ ${id}`);
  console.log(`해소: ${closed.length}건`);
  for (const id of closed) console.log(`  ✓ ${id}`);
  console.log(`skip: ${skipped.length}건`);
  for (const s of skipped) console.log(`  ⊝ ${s.blId} (${s.action}${s.reason ? ': ' + s.reason : ''})`);

  // commit message 단편 (workflow에서 사용)
  const summary = `BL ${created.length}건 등록 / ${closed.length}건 해소`;
  console.log(`\nCOMMIT_SUMMARY=${summary}`);
  console.log(`CHANGED=${totalChange > 0 ? '1' : '0'}`);
}

main();
