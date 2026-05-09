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
    result.detail = '기준 파일 목록이 아직 만들어지지 않았어요 (안전망 초기 설정 필요)';
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
    result.detail = `관리자 페이지 ${Object.keys(expected).length}개 모두 원본 그대로예요`;
  } else {
    // 의도된 수정과 손상을 구분 못 함 → 정보성 yellow
    result.status = 'yellow';
    result.detail = `관리자 페이지 ${result.changed_files.length}개가 원본과 살짝 달라요 (대표님이 일부러 고친 건지 점검 필요)`;
  }
  return result;
}

// ─── 2. tasks.json schema (source 필드 누락) ─────────────────────
function checkTasksSchema() {
  const result = { name: 'tasks_schema', status: 'green', detail: '', missing_source: [] };
  if (!fs.existsSync(TASKS_FILE)) {
    result.status = 'red';
    result.detail = '작업 목록 파일이 안 보여요';
    return result;
  }
  const d = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  const missing = d.tasks.filter((t) => !t.source).map((t) => t.id);
  result.missing_source = missing;
  if (missing.length === 0) {
    result.detail = `작업 ${d.tasks.length}건 모두 출처 박혀있어요 (정상)`;
  } else {
    // 인계서 결함 #1 — sync-bot 죽음의 원인
    result.status = 'red';
    result.detail = `작업 ${d.tasks.length}건 중 ${missing.length}건에 출처가 없어요 (자동 동기화 봇 멈춤 위험)`;
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
    result.detail = '자동 일꾼들(봇) 전부 살아있어요';
  } else {
    result.status = 'red';
    result.detail = `자동 일꾼 ${result.dead_bots.length}명이 멈췄어요: ${result.dead_bots.join(', ')}`;
  }
  result.bot_status = botStatus;
  return result;
}

// ─── 4. Vercel sync (BL-VERCEL-DEPLOY-RACE-GUARD 단계 2) ──────────
//   GITHUB_SHA env vs Vercel 최근 production 배포의 githubCommitSha 비교
//   불일치 시 yellow (red 아님 — 차단 X. 자동 복구 step이 빈 commit 재배포로 처리)
//   VERCEL_TOKEN 미등록 시 graceful skip
//
//   [2026-05-09 정정] 대표님 운영 원칙: 모든 Vercel 프로젝트를 개인 계정
//   (dgmasters01-9797, Hobby) 안에서 각각 독립 운영 — 팀(team) 사용 안함.
//   API 호출 시 teamId 파라미터 절대 사용 금지. 직전 세션이 박은 team scope
//   분기는 잘못된 가정이었으므로 완전 제거.
async function checkVercelSync() {
  const result = { name: 'vercel_sync', status: 'green', detail: '', live_sha: null, vercel_sha: null, project: 'tw-b2b' };
  const TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
  const PROJECT = 'tw-b2b';
  if (!TOKEN) {
    result.status = 'yellow';
    result.detail = 'Vercel 출입카드(토큰)가 없어서 라이브 동기화 점검을 못해요';
    return result;
  }
  try {
    const url = `https://api.vercel.com/v6/deployments?app=${PROJECT}&target=production&state=READY&limit=1`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) {
      const bodyText = await r.text().catch(() => '');
      result.status = 'yellow';
      result.detail = `Vercel 서버가 거절했어요 (응답 ${r.status} ${r.statusText}). 출입카드나 프로젝트 이름 점검 필요. 자세한 응답: ${bodyText.slice(0,100)}`;
      return result;
    }
    const j = await r.json();
    const d = Array.isArray(j.deployments) && j.deployments[0];
    if (!d) {
      result.status = 'yellow';
      result.detail = `Vercel에 라이브 버전이 아직 없어요 (또는 프로젝트 이름 ${PROJECT}가 안 맞아요)`;
      return result;
    }
    const vercelSha = d.meta && d.meta.githubCommitSha;
    const githubSha = process.env.GITHUB_SHA || null;
    result.vercel_sha = vercelSha ? vercelSha.slice(0, 7) : null;
    result.live_sha = githubSha ? githubSha.slice(0, 7) : null;
    if (!githubSha) {
      result.status = 'green';
      result.detail = `Vercel 라이브는 ${result.vercel_sha} 버전이 떠 있어요 (비교용 기준값이 없어서 일치 점검은 건너뜀)`;
      return result;
    }
    if (vercelSha === githubSha) {
      result.status = 'green';
      result.detail = `라이브 사이트가 GitHub와 같은 버전이에요 (${result.vercel_sha})`;
    } else {
      result.status = 'yellow';
      result.detail = `라이브 사이트가 GitHub 새 버전(${result.live_sha})을 아직 못 따라잡았어요 (현재 라이브: ${result.vercel_sha}). 5~10분 후 자동 정상화 예정`;
    }
  } catch (e) {
    result.status = 'yellow';
    result.detail = `Vercel 서버에 말을 못 걸었어요: ${e.message}`;
  }
  return result;
}

// ─── 5. Vercel quota (BL-VERCEL-DEPLOY-RACE-GUARD 단계 4) ─────────
//   Hobby 플랜 일일 배포 한도 추적 (limit=100). 한도의 80% 이상 시 yellow.
//   Vercel API에는 직접 quota 노출 없음 — 최근 24h 배포 count로 근사.
//
//   [2026-05-09 정정] 개인 계정(Hobby) 기준. teamId 파라미터 사용 안함.
//   limit 3000 → 100 (Hobby 플랜 실제 한도).
async function checkVercelQuota() {
  const result = { name: 'vercel_quota', status: 'green', detail: '', deployments_24h: 0, limit: 100 };
  const TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
  const PROJECT = 'tw-b2b';
  if (!TOKEN) {
    result.status = 'yellow';
    result.detail = 'Vercel 출입카드(토큰)가 없어서 배포 한도 점검을 못해요';
    return result;
  }
  try {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const url = `https://api.vercel.com/v6/deployments?app=${PROJECT}&since=${since}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) {
      result.status = 'yellow';
      result.detail = `Vercel 서버가 거절했어요 (응답 ${r.status}). 배포 한도 점검 실패`;
      return result;
    }
    const j = await r.json();
    const count = Array.isArray(j.deployments) ? j.deployments.length : 0;
    result.deployments_24h = count;
    const ratio = count / result.limit;
    if (ratio >= 0.8) {
      result.status = 'yellow';
      result.detail = `최근 24시간 동안 ${count}번 배포 (한도 ${result.limit}번 중 ${Math.round(ratio*100)}% 사용 — 80% 넘어서 주의 필요)`;
    } else {
      result.detail = `최근 24시간 동안 ${count}번 배포 (한도 ${result.limit}번 중 ${Math.round(ratio*100)}% 사용, 여유 있음)`;
    }
  } catch (e) {
    result.status = 'yellow';
    result.detail = `배포 한도 정보 받기 실패: ${e.message}`;
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
