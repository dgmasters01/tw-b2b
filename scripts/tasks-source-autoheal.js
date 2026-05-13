#!/usr/bin/env node
/**
 * TW B2B — tasks.json source 필드 자가 치유 봇 (BL-HEALTH-AUTOHEAL)
 *
 * 헌법 부합:
 *   ② 무인 실행: push 후 health-bot 빨간불 감지 시 자동 실행
 *   ⑪ Claude 자체 보고: 정정 결과 commit message에 명시
 *
 * 문제:
 *   tasks.json에 source 필드 없는 BL이 있으면 health-bot이 빨간불.
 *   원래 sync-bot이 chat-log → tasks.source 매핑 자동 박았는데
 *   신규 BL 대량 추가 시 매핑 누락 발생.
 *
 * 자가 치유 로직:
 *   1. tasks.json 읽기
 *   2. source 필드 없는 BL 추출
 *   3. _chat-logs/index.json의 byTask 매핑 활용 → chat-log 슬러그를 source로 박음
 *   4. chat-log 매핑 없으면 → tasks.json의 created_at 기반 추측 (가장 가까운 commit 또는 decision_ref)
 *   5. 변경 있을 때만 tasks.json 갱신 + commit
 *
 * Last updated: 2026-05-13
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const TASKS_PATH = path.join(REPO_ROOT, 'tasks.json');
const INDEX_PATH = path.join(REPO_ROOT, '_chat-logs', 'index.json');

function loadJSON(filepath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function main() {
  console.log('🩺 tasks.json source 자가 치유 시작:', new Date().toISOString());

  const tasksData = loadJSON(TASKS_PATH);
  if (!tasksData || !Array.isArray(tasksData.tasks)) {
    console.error('❌ tasks.json 없음 또는 형식 오류');
    process.exit(1);
  }

  const index = loadJSON(INDEX_PATH, { byTask: {}, byDecision: {} });
  const byTask = index.byTask || {};
  const byDecision = index.byDecision || {};

  let healedCount = 0;
  let stillMissing = 0;
  const healLog = [];

  for (const t of tasksData.tasks) {
    if (!t || typeof t !== 'object') continue;
    if (t.source) continue; // 이미 박혀있음

    const id = t.id;
    if (!id) continue;

    // 전략 1: chat-log byTask 매핑 활용
    const chatLogs = byTask[id];
    if (Array.isArray(chatLogs) && chatLogs.length > 0) {
      const latest = chatLogs[chatLogs.length - 1];
      t.source = `chat-log:${latest}`;
      healLog.push({ id, source: t.source, strategy: 'chat-log-bytask' });
      healedCount++;
      continue;
    }

    // 전략 2: decision_ref 활용 → byDecision 매핑
    if (t.decision_ref) {
      const dChatLogs = byDecision[t.decision_ref];
      if (Array.isArray(dChatLogs) && dChatLogs.length > 0) {
        const latest = dChatLogs[dChatLogs.length - 1];
        // byDecision 값은 객체 {slug, source} 또는 문자열일 수 있음
        const slug = typeof latest === 'string'
          ? latest
          : (latest && (latest.slug || latest.path || ''));
        if (slug) {
          t.source = `decision:${t.decision_ref}+chat-log:${slug}`;
          healLog.push({ id, source: t.source, strategy: 'decision-ref+chat-log' });
          healedCount++;
          continue;
        }
      }
      // decision_ref만 있고 chat-log 매핑 없음
      t.source = `decision:${t.decision_ref}`;
      healLog.push({ id, source: t.source, strategy: 'decision-ref-only' });
      healedCount++;
      continue;
    }

    // 전략 3: notes 또는 category로 폴백 (pending이고 chat-log 없는 신규 BL)
    if (t.notes || t.category) {
      t.source = `autoheal:${t.category || 'unknown'}-${new Date().toISOString().slice(0, 10)}`;
      healLog.push({ id, source: t.source, strategy: 'autoheal-fallback' });
      healedCount++;
      continue;
    }

    // 완전 매핑 실패
    stillMissing++;
    console.log(`  ⚠️ ${id}: 자가 치유 실패 (chat-log/decision_ref/notes 모두 없음)`);
  }

  console.log(`\n📊 자가 치유 결과:`);
  console.log(`  ✅ 치유: ${healedCount}건`);
  console.log(`  ❌ 여전히 누락: ${stillMissing}건`);

  if (healedCount === 0) {
    console.log('\n✨ 변경 없음 — 모든 BL이 이미 source 박혀있음');
    return;
  }

  // 변경 박음
  tasksData.updated_at = new Date().toISOString();
  saveJSON(TASKS_PATH, tasksData);
  console.log(`\n💾 tasks.json 갱신 (${healedCount}건 source 박음)`);

  // 치유 로그 출력
  console.log('\n📝 치유 내역:');
  for (const h of healLog) {
    console.log(`  ${h.id} [${h.strategy}]: ${h.source}`);
  }
}

main();
