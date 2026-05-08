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
import { execSync } from 'node:child_process';

const DIR = '_chat-logs';

// git log에서 chat-log 파일이 변경된 commit + commit message에 task ID가 박힌 commit 자동 추출
// + 시간 근접성 fallback (BL-STATUS-FINAL-V2)
function buildAutoCommitMap(slugs, taskIdsBySlug, allEntries) {
  const byCommit = {};
  // 1) chat-log 파일 자체가 변경된 commit
  for (const slug of slugs) {
    try {
      const out = execSync(`git log --format="%h" -- _chat-logs/${slug}.md`, { encoding: 'utf8', stdio: ['pipe','pipe','ignore'] });
      const hashes = out.split('\n').map(s => s.trim()).filter(Boolean);
      for (const h of hashes) byCommit[h] = slug;
    } catch (_) {}
  }
  // 2) commit message에 chat-log slug가 박힌 경우
  // 3) commit message에 task ID가 있고, 그 task가 chat-log에 매핑돼 있으면 같은 chat-log로 매핑
  // 4) ★ 시간 근접성 fallback — 매핑 안 된 commit을 같은 날짜 chat-log로 매핑
  let allCommits = [];
  try {
    const recent = execSync('git log --format="%h|%ai|%s" -n 2000', { encoding: 'utf8', stdio: ['pipe','pipe','ignore'] });
    for (const line of recent.split('\n')) {
      const [hash, dateIso, ...rest] = line.split('|');
      if (!hash) continue;
      const msg = rest.join('|');
      allCommits.push({ hash: hash.trim(), date: dateIso, msg });
      // slug 직접 매칭
      for (const slug of slugs) {
        if (msg.includes(slug)) byCommit[hash.trim()] = slug;
      }
      // task ID 매칭 (slug 우선되지 않을 때만)
      if (!byCommit[hash.trim()]) {
        for (const [slug, taskIds] of Object.entries(taskIdsBySlug)) {
          for (const tid of taskIds) {
            if (msg.includes(tid)) {
              byCommit[hash.trim()] = slug;
              break;
            }
          }
          if (byCommit[hash.trim()]) break;
        }
      }
    }
  } catch (_) {}

  // ★ 4) 시간 근접성 fallback — 같은 날짜의 chat-log로 매핑
  if (allEntries && allEntries.length > 0) {
    // 각 chat-log의 date를 epoch로 변환
    const entryByDate = {};
    for (const e of allEntries) {
      if (e.date) {
        if (!entryByDate[e.date]) entryByDate[e.date] = [];
        entryByDate[e.date].push(e.slug);
      }
    }
    for (const c of allCommits) {
      if (byCommit[c.hash]) continue; // 이미 매핑됨
      // commit date에서 YYYY-MM-DD 추출
      const day = (c.date || '').slice(0, 10);
      if (entryByDate[day]) {
        // 같은 날짜의 chat-log 중 첫번째 (정렬 대신 최초 매핑)
        byCommit[c.hash] = entryByDate[day][0] + ' (시간근접)';
      }
    }
  }
  return byCommit;
}

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
  const byDecision = {};  // BL-ACT-INDEX-RESTORE: D-NNN → [{slug, source}] 매핑

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
    // BL-ACT-INDEX-RESTORE: frontmatter decisions에서 D-NNN 매핑
    for (const dec of entry.decisions) {
      const did = String(dec).trim();
      if (!did) continue;
      if (!byDecision[did]) byDecision[did] = [];
      byDecision[did].push({ slug, source: 'frontmatter' });
    }
  }

  // ★ git log 자동 매핑 보강 — frontmatter commits 비어 있어도 매핑됨
  const slugs = all.map(e => e.slug);
  const taskIdsBySlug = Object.fromEntries(all.map(e => [e.slug, e.tasks || []]));
  const autoByCommit = buildAutoCommitMap(slugs, taskIdsBySlug, all);
  // frontmatter commits가 명시된 건 그대로 유지 (우선순위 ↑), 없는 commit만 자동으로 박음
  for (const [hash, slug] of Object.entries(autoByCommit)) {
    if (!byCommit[hash]) byCommit[hash] = slug;
  }
  // 각 entry.commits에도 자동 매핑된 hash 박음 (commit_hash 역추적용)
  // "(시간근접)" suffix는 entry.commits에는 박지 않음 (정확한 매핑만)
  for (const entry of all) {
    const autoCommits = Object.entries(autoByCommit).filter(([_, s]) => s === entry.slug).map(([h]) => h);
    const merged = Array.from(new Set([...(entry.commits || []), ...autoCommits]));
    entry.commits = merged;
  }

  // ★ BL-ACT-INDEX-RESTORE: DECISIONS.md 자동 파싱 — 모든 D-NNN 추출
  // 매핑 우선순위:
  //   1) frontmatter decisions: 명시 (위에서 이미 박음)
  //   2) DECISIONS.md에 존재하지만 어떤 chat-log에도 없는 D-NNN — entry는 박지만 chat-log는 빈 배열 + source='decisions.md'
  //   3) git log commit message에 [D-NNN] 박힌 commit이 매핑된 chat-log 있으면 그쪽으로 fallback
  try {
    const decMd = readFileSync('DECISIONS.md', 'utf8');
    // 결정 D-NNN: 또는 D-NNN: 패턴
    const dRe = /\bD-(\d{3})\b/g;
    const allDIds = new Set();
    let m;
    while ((m = dRe.exec(decMd)) !== null) {
      allDIds.add(`D-${m[1]}`);
    }
    // git log fallback — commit subject에 D-NNN 박힌 commit → 그 commit이 byCommit에 매핑됐으면 그 slug로
    let recentLog = '';
    try {
      recentLog = execSync('git log --format="%h|%s" -n 2000', { encoding: 'utf8', stdio: ['pipe','pipe','ignore'] });
    } catch (_) {}
    const commitToD = {};  // hash → [D-NNN, ...]
    for (const line of recentLog.split('\n')) {
      const [hash, ...rest] = line.split('|');
      if (!hash) continue;
      const subj = rest.join('|');
      let dm;
      const localRe = /\bD-(\d{3})\b/g;
      while ((dm = localRe.exec(subj)) !== null) {
        const did = `D-${dm[1]}`;
        if (!commitToD[hash.trim()]) commitToD[hash.trim()] = [];
        commitToD[hash.trim()].push(did);
        allDIds.add(did);
      }
    }
    // 각 D-NNN에 대해: frontmatter 매핑 없으면 commit fallback → 그래도 없으면 빈 배열 + source='decisions.md'
    for (const did of allDIds) {
      if (byDecision[did] && byDecision[did].length > 0) continue;
      // commit fallback
      const candidateSlugs = new Set();
      for (const [hash, dids] of Object.entries(commitToD)) {
        if (!dids.includes(did)) continue;
        const mappedSlug = byCommit[hash];
        if (mappedSlug) {
          // "(시간근접)" suffix 제거
          const cleanSlug = mappedSlug.replace(/ \(시간근접\)$/, '');
          candidateSlugs.add(cleanSlug);
        }
      }
      if (candidateSlugs.size > 0) {
        byDecision[did] = Array.from(candidateSlugs).map(s => ({ slug: s, source: 'commit-fallback' }));
      } else {
        // chat-log 매핑 없음 — DECISIONS.md 직접 보기 안내용
        byDecision[did] = [{ slug: null, source: 'decisions.md', note: 'chat-log 매핑 없음. DECISIONS.md에서 직접 확인.' }];
      }
    }
  } catch (e) {
    console.warn(`  ⚠️  DECISIONS.md 파싱 실패: ${e.message}`);
  }

  // 날짜 역순 (최신이 위)
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const index = {
    generatedAt: new Date().toISOString(),
    count: all.length,
    byCommit,
    byTask,
    byDecision,  // BL-ACT-INDEX-RESTORE
    all,
  };

  writeFileSync(join(DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`✅ chat-logs/index.json 갱신 — ${all.length}개 항목, commit ${Object.keys(byCommit).length}개, task ${Object.keys(byTask).length}개, decision ${Object.keys(byDecision).length}개`);
}

main();
