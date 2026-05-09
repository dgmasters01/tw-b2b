#!/usr/bin/env node
/**
 * TW B2B — Phase 0 Health Check Bot
 *
 * 작업: BL-OS-PHASE-0 단계 3/3
 *
 * 목적:
 *   admin-status 맨 위 한 줄에 빨간/초록 표시할 _admin/_health.json 산출.
 *   대표님 절대 걱정: "수정하면서 기존 게 사라지면 안 됨"의 자동 검증 장치.
 *
 * 검진 항목:
 *   1. Admin 화면 baseline 무결성 — _os_snapshots/2026-05-07_phase0-baseline/admin_baseline.sha256
 *      과 현재 _admin/*.html SHA256 비교
 *      ⚠️ 의도된 변경(Phase 1+에서 admin-status 수정)은 baseline 갱신으로 처리.
 *   2. tasks.json schema — source 필드 누락 건수 (인계서 결함 #1)
 *   3. GitHub Actions 핵심 봇 상태 — sync-bot / auto-detect-bot / scan-bot
 *      (이 검진 봇은 GH API 호출 안 함. 봇 상태는 워크플로 step에서 수집해서 주입)
 *
 * 출력:
 *   _admin/_health.json — admin-status 페이지가 5초 폴링으로 읽어가는 단일 진실원
 *
 * 종료 코드:
 *   0 = 모두 초록 / 1 = 1건 이상 빨강
 *   (CI에서 빨강이라도 push는 막지 않음. 화면 표시만 함.)
 *
 * 헌법 부칙 8 (자동 동기화 완성도):
 *   admin-status 5초 폴링이 _health.json을 읽기 때문에 변경 즉시 반영.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const BASELINE_DIR = path.join(ROOT, '_os_snapshots/2026-05-07_phase0-baseline');
const BASELINE_HASH_FILE = path.join(BASELINE_DIR, 'admin_baseline.sha256');
const ADMIN_DIR = path.join(ROOT, '_admin');
const TASKS_FILE = path.join(ROOT, 'tasks.json');
const OUTPUT_FILE = path.join(ADMIN_DIR, '_health.json');

const NOW = new Date().toISOString();

// ─── 1. Admin baseline 무결성 ──────────────────────────────────────
function checkAdminBaseline() {
  const result = { name: 'admin_baseline', status: 'green', detail: '', changed_files: [] };
  if (!fs.existsSync(BASELINE_HASH_FILE)) {
    result.status = 'yellow';
    result.detail = 'baseline SHA256 파일 없음 — Phase 0 단계 2 미완료';
    return result;
  }
  const expected = {};
  for (const line of fs.readFileSync(BASELINE_HASH_FILE, 'utf8').trim().split('\n')) {
    const [hash, filename] = line.trim().split(/\s+/);
    expected[filename] = hash;
  }
  for (const filename of Object.keys(expected)) {
    const fp = path.join(ADMIN_DIR, filename);
    if (!fs.existsSync(fp)) {
      result.changed_files.push({ file: filename, reason: 'missing' });
      continue;
    }
    const cur = crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
    if (cur !== expected[filename]) {
      result.changed_files.push({ file: filename, reason: 'modified', current_sha: cur.slice(0, 12) });
    }
  }
  if (result.changed_files.length === 0) {
    result.detail = `${Object.keys(expected).length}개 파일 모두 baseline과 일치`;
  } else {
    // 의도된 수정과 손상을 구분 못 함 → 정보성 yellow
    result.status = 'yellow';
    result.detail = `${result.changed_files.length}개 파일이 baseline과 다름 (의도 수정인지 확인 필요)`;
  }
  return result;
}

// ─── 2. tasks.json schema (source 필드 누락) ─────────────────────
function checkTasksSchema() {
  const result = { name: 'tasks_schema', status: 'green', detail: '', missing_source: [] };
  if (!fs.existsSync(TASKS_FILE)) {
    result.status = 'red';
    result.detail = 'tasks.json 파일 없음';
    return result;
  }
  const d = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  const missing = d.tasks.filter((t) => !t.source).map((t) => t.id);
  result.missing_source = missing;
  if (missing.length === 0) {
    result.detail = `${d.tasks.length}건 모두 source 박힘`;
  } else {
    // 인계서 결함 #1 — sync-bot 죽음의 원인
    result.status = 'red';
    result.detail = `${d.tasks.length}건 중 ${missing.length}건 source 누락 → sync-bot 죽음 유발 (Phase 1에서 처리)`;
  }
  return result;
}

// ─── 3. 봇 상태 (워크플로 환경변수에서 주입받음) ──────────────────
function checkBots() {
  const result = { name: 'bots', status: 'green', detail: '', dead_bots: [] };
  // 봇 상태는 워크플로 step에서 GH API로 조회 후 환경변수로 주입
  const botStatus = {
    'sync-bot': process.env.SYNC_BOT_STATUS || 'unknown',
    'auto-detect-bot': process.env.AUTO_DETECT_BOT_STATUS || 'unknown',
    'scan-bot': process.env.SCAN_BOT_STATUS || 'unknown',
    'chat-log-bot': process.env.CHAT_LOG_BOT_STATUS || 'unknown',
  };
  for (const [name, status] of Object.entries(botStatus)) {
    if (status === 'failure') {
      result.dead_bots.push(name);
    }
  }
  if (result.dead_bots.length === 0) {
    result.detail = '모든 봇 정상';
  } else {
    result.status = 'red';
    result.detail = `${result.dead_bots.length}개 봇 죽음: ${result.dead_bots.join(', ')}`;
  }
  result.bot_status = botStatus;
  return result;
}

// ─── 4. Vercel sync (BL-VERCEL-DEPLOY-RACE-GUARD 단계 2) ──────────
//   GITHUB_SHA env vs Vercel 최근 production 배포의 githubCommitSha 비교
//   불일치 시 yellow (red 아님 — 차단 X. 자동 복구 step이 빈 commit 재배포로 처리)
//   VERCEL_TOKEN 미등록 시 graceful skip
async function checkVercelSync() {
  const result = { name: 'vercel_sync', status: 'green', detail: '', live_sha: null, vercel_sha: null, project: 'tw-b2b' };
  const TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
  const TEAM_ID = process.env.VERCEL_TEAM_ID;
  const PROJECT = 'tw-b2b';
  if (!TOKEN) {
    result.status = 'yellow';
    result.detail = 'VERCEL_TOKEN env 없음 (Vercel sync 검증 불가)';
    return result;
  }
  if (!TEAM_ID) {
    result.status = 'yellow';
    result.detail = 'VERCEL_TEAM_ID env 없음 (Hobby 플랜은 personal team scope 필수)';
    return result;
  }
  try {
    const url = `https://api.vercel.com/v6/deployments?app=${PROJECT}&target=production&state=READY&limit=1&teamId=${encodeURIComponent(TEAM_ID)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) {
      result.status = 'yellow';
      result.detail = `Vercel API ${r.status} ${r.statusText} — 권한/프로젝트명/team scope 확인 필요`;
      return result;
    }
    const j = await r.json();
    const d = Array.isArray(j.deployments) && j.deployments[0];
    if (!d) {
      result.status = 'yellow';
      result.detail = `Vercel READY 배포 없음 (또는 app=${PROJECT} 미일치)`;
      return result;
    }
    const vercelSha = d.meta && d.meta.githubCommitSha;
    const githubSha = process.env.GITHUB_SHA || null;
    result.vercel_sha = vercelSha ? vercelSha.slice(0, 7) : null;
    result.live_sha = githubSha ? githubSha.slice(0, 7) : null;
    if (!githubSha) {
      result.status = 'green';
      result.detail = `Vercel 최신 ${result.vercel_sha} (GITHUB_SHA env 없음 — 비교 skip)`;
      return result;
    }
    if (vercelSha === githubSha) {
      result.status = 'green';
      result.detail = `Vercel 동기화 정상 (${result.vercel_sha})`;
    } else {
      result.status = 'yellow';
      result.detail = `Vercel 미동기화 — git=${result.live_sha} vs vercel=${result.vercel_sha} (자동 복구 필요)`;
    }
  } catch (e) {
    result.status = 'yellow';
    result.detail = `Vercel API 호출 실패: ${e.message}`;
  }
  return result;
}

// ─── 5. Vercel quota (BL-VERCEL-DEPLOY-RACE-GUARD 단계 4) ─────────
//   Pro 플랜 일일 배포 한도 추적. 한도의 80% 이상 시 yellow.
//   Vercel API에는 직접 quota 노출 없음 — 최근 24h 배포 count로 근사.
async function checkVercelQuota() {
  const result = { name: 'vercel_quota', status: 'green', detail: '', deployments_24h: 0, limit: 3000 };
  const TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
  const TEAM_ID = process.env.VERCEL_TEAM_ID;
  const PROJECT = 'tw-b2b';
  if (!TOKEN || !TEAM_ID) {
    result.status = 'yellow';
    result.detail = 'VERCEL_TOKEN 또는 VERCEL_TEAM_ID env 없음 — quota 조회 skip';
    return result;
  }
  try {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const url = `https://api.vercel.com/v6/deployments?app=${PROJECT}&since=${since}&teamId=${encodeURIComponent(TEAM_ID)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) {
      result.status = 'yellow';
      result.detail = `Vercel API ${r.status} — quota 조회 실패`;
      return result;
    }
    const j = await r.json();
    const count = Array.isArray(j.deployments) ? j.deployments.length : 0;
    result.deployments_24h = count;
    const ratio = count / result.limit;
    if (ratio >= 0.8) {
      result.status = 'yellow';
      result.detail = `24h 배포 ${count}건 (limit ${result.limit}의 ${Math.round(ratio*100)}%) — quota 80% 초과 위험`;
    } else {
      result.detail = `24h 배포 ${count}건 / ${result.limit} (${Math.round(ratio*100)}%)`;
    }
  } catch (e) {
    result.status = 'yellow';
    result.detail = `Vercel quota 조회 실패: ${e.message}`;
  }
  return result;
}


// ─── 메인 ──────────────────────────────────────────────────────────
async function main() {
  const checks = [
    checkAdminBaseline(),
    checkTasksSchema(),
    checkBots(),
    await checkVercelSync(),    // BL-VERCEL-DEPLOY-RACE-GUARD 단계 2
    await checkVercelQuota(),   // BL-VERCEL-DEPLOY-RACE-GUARD 단계 4
  ];
  const overall = checks.some((c) => c.status === 'red')
    ? 'red'
    : checks.some((c) => c.status === 'yellow')
      ? 'yellow'
      : 'green';
  const summary = checks
    .filter((c) => c.status !== 'green' && c.status !== 'unknown')
    .map((c) => `[${c.status}] ${c.name}: ${c.detail}`)
    .join(' / ');
  const output = {
    overall,
    summary: summary || '모든 검진 항목 정상',
    checked_at: NOW,
    checks,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`[health-check] overall=${overall}`);
  console.log(`[health-check] summary=${output.summary}`);
  process.exit(overall === 'red' ? 1 : 0);
}

main();
