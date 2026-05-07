#!/usr/bin/env node
// ============================================================
// scripts/build-activity-feed.mjs
// ============================================================
//
// D-011 (3-State) + 헌법 4조 (전수 추적) 통합 — 활동 이력 자동 빌드.
//
// 5개 출처에서 자동 수집:
//   1. git log (모든 commit, 시작자/시간/작업)
//   2. tasks.json history[] (작업 상태 변경 이력)
//   3. ECHO_LOG.md [DECISION] 항목
//   4. DECISIONS.md D-NNN 결정
//   5. (향후) Supabase admin_notes — 로그인 사용자 행동
//
// 3-Layer 출력 (D-012):
//   - activity-feed.summary.json (Claude용, 5KB 이내, 최근 10건)
//   - activity-feed.display.json (UI용, 50KB 이내, 최근 50건)
//   - activity-feed.full.json    (분석용, 무제한, 모든 이력)
// ============================================================

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');  // _os/scripts/ → _os/ → repo root (BL-OS-PHASE-2)

const OUT_FULL    = resolve(REPO_ROOT, 'activity-feed.json');
const OUT_DISPLAY = resolve(REPO_ROOT, 'activity-feed.display.json');
const OUT_SUMMARY = resolve(REPO_ROOT, 'activity-feed.summary.json');

function shellQuiet(cmd) {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim();
  } catch { return ''; }
}

// ────────────────────────────────────────────────────────────
// 1. git log — 모든 commit
// ────────────────────────────────────────────────────────────
function fromGitLog(limit = 200) {
  const fmt = '%H||%cI||%an||%s';
  const out = shellQuiet(`git log -${limit} --format="${fmt}"`);
  if (!out) return [];
  const items = [];
  for (const line of out.split('\n')) {
    const [hash, iso, author, subject] = line.split('||');
    if (!hash) continue;
    const lower = (author || '').toLowerCase();
    let role = 'CEO';
    let by = '👤 이지형 (CEO)';
    if (lower.includes('scan-bot')) { role = 'Bot'; by = '🤖 scan-bot'; }
    else if (lower.includes('sync-bot')) { role = 'Bot'; by = '🤖 sync-bot'; }
    else if (lower.includes('claude')) { role = 'Bot'; by = '🤖 Claude (CEO 지시)'; }
    items.push({
      at: iso,
      by, role,
      source: 'git commit',
      action: subject,
      target_type: 'commit',
      target_id: hash.slice(0, 7),
      project: 'TW B2B',
    });
  }
  return items;
}

// ────────────────────────────────────────────────────────────
// 2. tasks.json history[]
// ────────────────────────────────────────────────────────────
function fromTasksHistory() {
  if (!existsSync(resolve(REPO_ROOT, 'tasks.json'))) return [];
  const d = JSON.parse(readFileSync(resolve(REPO_ROOT, 'tasks.json'), 'utf8'));
  const items = [];
  for (const t of d.tasks || []) {
    for (const h of t.history || []) {
      const byRaw = h.by || 'Claude';
      let role = 'Bot', by = `🤖 ${byRaw}`;
      if (/대표님|이지형/i.test(byRaw)) { role = 'CEO'; by = '👤 이지형 (CEO)'; }
      else if (/staff/i.test(byRaw)) { role = 'Staff'; by = `👥 ${byRaw}`; }
      items.push({
        at: h.at,
        by, role,
        source: 'tasks.json history',
        action: h.action || '',
        note: h.note || '',
        target_type: 'task',
        target_id: t.id,
        project: 'TW B2B',
      });
    }
  }
  return items;
}

// ────────────────────────────────────────────────────────────
// 3. ECHO_LOG.md [DECISION] 항목
// ────────────────────────────────────────────────────────────
function fromEchoLog() {
  const path = resolve(REPO_ROOT, 'ECHO_LOG.md');
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  const items = [];
  // ### 2026-05-04 02:35 UTC [DECISION] 제목 형식 매칭
  const re = /^###\s+(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?(?:\s+UTC)?)\s+\[(DECISION|INSIGHT|NOTE)\]\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const [, dateStr, kind, title] = m;
    let iso = dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) iso = dateStr + 'T00:00:00Z';
    else iso = dateStr.replace(' UTC', 'Z').replace(' ', 'T') + ':00';
    items.push({
      at: iso,
      by: '👤 이지형 (CEO)',
      role: 'CEO',
      source: 'ECHO_LOG.md',
      action: `[${kind}] ${title.trim()}`,
      target_type: 'echo',
      project: 'TW B2B',
    });
  }
  return items;
}

// ────────────────────────────────────────────────────────────
// 4. DECISIONS.md D-NNN 결정
// ────────────────────────────────────────────────────────────
function fromDecisions() {
  const path = resolve(REPO_ROOT, 'DECISIONS.md');
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  const items = [];
  // ### 결정 D-011: 제목 패턴
  const re = /^###\s+결정\s+(D-\d{3,}):\s+(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const [matched, dId, title] = m;
    const idx = m.index;
    const before = text.slice(Math.max(0, idx - 500), idx);
    const dateMatch = before.match(/(\d{4}-\d{2}-\d{2})/g);
    const at = dateMatch ? dateMatch[dateMatch.length - 1] + 'T00:00:00Z' : null;
    if (!at) continue;
    items.push({
      at,
      by: '👤 이지형 (CEO)',
      role: 'CEO',
      source: 'DECISIONS.md',
      action: `${dId}: ${title.replace(/⭐+/g,'').trim()}`,
      target_type: 'decision',
      target_id: dId,
      project: 'TW B2B',
    });
  }
  return items;
}

// ────────────────────────────────────────────────────────────
// 통합 + 정렬 + 중복 제거
// ────────────────────────────────────────────────────────────
function build() {
  const all = [
    ...fromGitLog(200),
    ...fromTasksHistory(),
    ...fromEchoLog(),
    ...fromDecisions(),
  ].filter(i => i.at);

  // 시간 역순
  all.sort((a, b) => new Date(b.at) - new Date(a.at));

  // 중복 제거 (동일 시각 + 동일 action 머리 30자)
  const seen = new Set();
  const dedup = [];
  for (const i of all) {
    const key = `${i.at.slice(0,16)}|${(i.action||'').slice(0,30)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(i);
  }

  return dedup;
}

// ────────────────────────────────────────────────────────────
// 실행
// ────────────────────────────────────────────────────────────
function main() {
  const items = build();
  const startedAt = new Date().toISOString();

  // 카운트
  const byRole = { CEO: 0, Staff: 0, Bot: 0 };
  for (const i of items) byRole[i.role] = (byRole[i.role] || 0) + 1;

  // FULL
  const full = { generatedAt: startedAt, totalCount: items.length, byRole, items };
  writeFileSync(OUT_FULL, JSON.stringify(full, null, 2));

  // DISPLAY (최근 50건)
  const display = { generatedAt: startedAt, totalCount: items.length, byRole, items: items.slice(0, 50) };
  writeFileSync(OUT_DISPLAY, JSON.stringify(display, null, 2));

  // SUMMARY (최근 10건, Claude용)
  const summary = {
    generatedAt: startedAt,
    totalCount: items.length,
    byRole,
    recent10: items.slice(0, 10).map(i => ({ at: i.at.slice(0, 16), by: i.by, action: (i.action || '').slice(0, 80) })),
  };
  writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));

  console.log(`\n✅ 활동 이력 3-Layer 완료:`);
  console.log(`   총 ${items.length}건 (CEO:${byRole.CEO}, Staff:${byRole.Staff}, Bot:${byRole.Bot})`);
  console.log(`   - activity-feed.json         ${(JSON.stringify(full).length/1024).toFixed(1)}KB (분석용)`);
  console.log(`   - activity-feed.display.json ${(JSON.stringify(display).length/1024).toFixed(1)}KB (UI용)`);
  console.log(`   - activity-feed.summary.json ${(JSON.stringify(summary).length/1024).toFixed(1)}KB (Claude용)`);
}

main();
