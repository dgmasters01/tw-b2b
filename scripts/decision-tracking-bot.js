#!/usr/bin/env node
// scripts/decision-tracking-bot.js
// ════════════════════════════════════════════════════════════════════════════
// BL-DECISION-TRACKING 톱니 2 보완 — decision-tracking-bot
// ════════════════════════════════════════════════════════════════════════════
//
// 트리거: GitHub Actions (.github/workflows/decision-tracking-bot.yml)
//   - chat-log/*.md push to main
//
// 동작:
//   1. 변경된 chat-log 파일들 스캔
//   2. 5블록 형식의 "⑤ 대표님 결정 필요" 섹션 추출
//   3. 명시적 합의 항목 (불릿 시작 키워드: "합의", "확정", "결정", "박을") 자동 추출
//   4. business-agreements.json에 신규 ID로 append (중복 ID 안 박음)
//   5. 클로드가 채팅 마무리 시 이미 박았으면 skip (이중 박힘 방지)
//
// 주의:
//   - 봇은 클로드 수동 박음의 "보완" 역할. 봇 단독으로는 정확도 한계.
//   - 봇은 ID 부여만, expected_location은 클로드가 수동 박아야 함.
//   - 봇이 박은 항목은 metadata.source = "decision-tracking-bot" 으로 표시.
//
// 환경변수: 없음
// ════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const AGREEMENTS_PATH = path.join(REPO_ROOT, '_decisions/business-agreements.json');
const CHATLOG_DIR = path.join(REPO_ROOT, '_chat-logs');

function loadAgreements() {
  return JSON.parse(fs.readFileSync(AGREEMENTS_PATH, 'utf8'));
}

function getNextId(agreements) {
  const year = new Date().getFullYear();
  const yearPrefix = `AGR-${year}-`;
  const existing = agreements
    .map(a => a.id)
    .filter(id => id.startsWith(yearPrefix))
    .map(id => parseInt(id.replace(yearPrefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = (Math.max(0, ...existing) + 1).toString().padStart(4, '0');
  return `${yearPrefix}${next}`;
}

function getChangedChatLogs() {
  // 가장 최근 commit에서 변경된 _chat-logs/*.md 파일
  try {
    const out = execSync(
      'git diff --name-only HEAD~1 HEAD -- _chat-logs/*.md',
      { cwd: REPO_ROOT, encoding: 'utf8' }
    ).trim();
    if (!out) return [];
    return out.split('\n').filter(f => f.endsWith('.md'));
  } catch (e) {
    // 첫 commit 등 — 모든 chat-log 스캔
    if (!fs.existsSync(CHATLOG_DIR)) return [];
    return fs.readdirSync(CHATLOG_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join('_chat-logs', f));
  }
}

function extractAgreementsFromChatLog(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return [];

  const content = fs.readFileSync(fullPath, 'utf8');
  
  // frontmatter에서 메타 추출
  const fmMatch = content.match(/^---\n([\s\S]+?)\n---/);
  let bl = 'UNKNOWN', date = new Date().toISOString().slice(0, 10);
  if (fmMatch) {
    const blMatch = fmMatch[1].match(/^bl:\s*(.+)$/m);
    const dateMatch = fmMatch[1].match(/^date:\s*(.+)$/m);
    if (blMatch) bl = blMatch[1].trim();
    if (dateMatch) date = dateMatch[1].trim();
  }

  // "⑤ 대표님 결정 필요" 또는 "## ④ 다음 행동" 블록 안의 합의 추출
  const blockRegex = /##\s*[④⑤].*?(?=##|$)/gs;
  const blocks = content.match(blockRegex) || [];

  const found = [];
  blocks.forEach(block => {
    // 명시적 합의 키워드 (bullet 시작)
    const lineRegex = /^[\s]*[-*]\s*(.+(?:합의|확정|결정|박을|박힘).+)$/gm;
    const lines = block.match(lineRegex) || [];
    lines.forEach(line => {
      const text = line.replace(/^[\s]*[-*]\s*/, '').trim();
      if (text.length > 20 && text.length < 300) {
        found.push({ bl, date, text });
      }
    });
  });

  return found;
}

function alreadyExists(agreements, text) {
  // 텍스트 첫 50자가 동일하면 중복으로 간주
  const key = text.slice(0, 50).toLowerCase();
  return agreements.some(a => a.agreement.slice(0, 50).toLowerCase() === key);
}

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  decision-tracking-bot — chat-log 합의 자동 추출 (부칙 20)');
  console.log('═══════════════════════════════════════════════════════════════');

  const data = loadAgreements();
  const changedLogs = getChangedChatLogs();
  console.log(`변경된 chat-log: ${changedLogs.length}개`);

  let appended = 0;
  changedLogs.forEach(rel => {
    console.log(`\n→ ${rel}`);
    const candidates = extractAgreementsFromChatLog(rel);
    console.log(`  추출된 후보: ${candidates.length}개`);
    candidates.forEach(c => {
      if (alreadyExists(data.agreements, c.text)) {
        console.log(`  ⏭️ 이미 존재 — skip: ${c.text.slice(0, 60)}...`);
        return;
      }
      const id = getNextId(data.agreements);
      const newAgr = {
        id,
        chat_date: c.date,
        chat_ref: `${c.bl} (자동 추출 from ${rel})`,
        agreement: c.text,
        expected_location: {
          files: [],
          code_pattern: ''
        },
        related_bl: c.bl,
        status: 'not_implemented',
        verified_at: null,
        verified_commit: null,
        discovered_via: 'decision-tracking-bot 자동 추출',
        metadata: { source: 'decision-tracking-bot', needs_review: true }
      };
      data.agreements.push(newAgr);
      appended += 1;
      console.log(`  ✅ ${id}: ${c.text.slice(0, 60)}...`);
    });
  });

  // stats 재계산
  const stats = { total: data.agreements.length, done: 0, partial: 0, not_implemented: 0, deferred: 0 };
  data.agreements.forEach(a => { if (stats[a.status] !== undefined) stats[a.status] += 1; });
  data.stats = stats;
  data.updated_at = new Date().toISOString();

  if (appended === 0) {
    console.log('\n변경 없음.');
  } else {
    fs.writeFileSync(AGREEMENTS_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`\n✅ ${appended}개 추가 박힘. 클로드가 다음 채팅에서 expected_location 채워야 함 (needs_review=true).`);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `appended=${appended}\n`);
  }
}

main();
