#!/usr/bin/env node
// scripts/build-chat-log-index.mjs
//
// chat-logs/*.md 파일의 frontmatter를 읽어 인덱스 파일 생성.
//
// 출력: chat-logs/index.json
//   {
//     "generatedAt": "...",
//     "byCommit": { "6083794": "2026-05-04-ux-feedback-1", ... },
//     "byTask":   { "BL-HUB-RETIRE": ["2026-05-04-bl-hub-retire"], ... },
//     "all":      [{ slug, title, date, commits, tasks, decisions }, ...]
//   }
//
// frontmatter 형식 (각 .md 파일 상단):
//   ---
//   slug: 2026-05-04-ux-feedback-1
//   title: UX-FEEDBACK-1 — 대표님 4가지 피드백 자율 시스템화
//   date: 2026-05-04
//   commits: [6083794]
//   tasks: [UX-FEEDBACK-1]
//   decisions: []
//   ---

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'chat-logs';

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  const lines = m[1].split('\n');
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // 배열 [a, b, c]
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, '');
    }
    fm[key] = val;
  }
  return fm;
}

function main() {
  try {
    mkdirSync(DIR, { recursive: true });
  } catch (_) {}

  const files = readdirSync(DIR).filter(f => f.endsWith('.md'));
  const all = [];
  const byCommit = {};
  const byTask = {};

  for (const f of files) {
    const md = readFileSync(join(DIR, f), 'utf8');
    const fm = parseFrontmatter(md);
    if (!fm) {
      console.warn(`  ⚠️  ${f}: frontmatter 없음, 건너뜀`);
      continue;
    }
    const slug = fm.slug || f.replace(/\.md$/, '');
    const entry = {
      slug,
      title: fm.title || slug,
      date: fm.date || '',
      commits: Array.isArray(fm.commits) ? fm.commits : [],
      tasks: Array.isArray(fm.tasks) ? fm.tasks : [],
      decisions: Array.isArray(fm.decisions) ? fm.decisions : [],
    };
    all.push(entry);
    for (const c of entry.commits) {
      byCommit[c] = slug;
    }
    for (const t of entry.tasks) {
      if (!byTask[t]) byTask[t] = [];
      byTask[t].push(slug);
    }
  }

  // 날짜 역순 (최신이 위)
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const index = {
    generatedAt: new Date().toISOString(),
    count: all.length,
    byCommit,
    byTask,
    all,
  };

  writeFileSync(join(DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`✅ chat-logs/index.json 갱신 — ${all.length}개 항목, commit ${Object.keys(byCommit).length}개, task ${Object.keys(byTask).length}개`);
}

main();
