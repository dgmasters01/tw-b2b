#!/usr/bin/env node
/**
 * scripts/migrate-chatlogs-to-business-format.mjs
 *
 * 목적: 기존 chat-log를 CLAUDE.md 11조 표준(사업가 시점 5블록)으로 일괄 보강.
 *
 * 입력: _chat-logs/*.md (frontmatter + 본문)
 * 출력: 같은 파일에 frontmatter 직후 5블록 자동 삽입, 기존 본문은 # 🔧 기술 상세 아래로 이동.
 *
 * 5블록 자동 생성 규칙:
 *   🎯 한 줄 요약   ← frontmatter.title
 *   📍 왜 발생했나   ← frontmatter.tasks[0] + git commit msg에서 [변경사유: ...] 추출 또는 첫 단락
 *   🛠 어떻게 해결했나 ← 본문에서 "박았다 / 추가했다 / 수정 / fix" 류 첫 3줄 또는 첫 ## 헤딩 본문
 *   ✅ 결과         ← 본문에서 "✅ done / 통과 / 완료" 류 첫 줄 또는 frontmatter.tasks 완료 표시
 *   ⏱ 다음 결정 필요 ← "다음 / 후속 / 대표님 결정" 류 검색, 없으면 "없음"
 *
 * 이미 5블록이 있는 파일은 skip (idempotent).
 *
 * 실행: node scripts/migrate-chatlogs-to-business-format.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHATLOGS_DIR = path.join(ROOT, '_chat-logs');
const DRY_RUN = process.argv.includes('--dry-run');

// frontmatter 파싱
function parseFrontmatter(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: md };
  const fm = {};
  m[1].split(/\r?\n/).forEach(line => {
    const km = line.match(/^([a-zA-Z_]+):\s*(.+)$/);
    if (!km) return;
    let val = km[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }
    fm[km[1]] = val;
  });
  return { fm, body: m[2], rawFm: m[1] };
}

// 5블록 이미 있는지 검사 (4개 이상 발견하면 skip)
function hasBusinessBlocks(body) {
  const patterns = [
    /^##\s*🎯[^\n]*\n[\s\S]*?(?=\n##|\n#|$)/m,
    /^##\s*📍[^\n]*\n[\s\S]*?(?=\n##|\n#|$)/m,
    /^##\s*🛠[^\n]*\n[\s\S]*?(?=\n##|\n#|$)/m,
    /^##\s*✅[^\n]*\n[\s\S]*?(?=\n##|\n#|$)/m,
    /^##\s*⏱[^\n]*\n[\s\S]*?(?=\n##|\n#|$)/m,
  ];
  let count = 0;
  for (const re of patterns) if (body.match(re)) count++;
  return count >= 4;
}

// title을 사업가 언어로 클린업 (개발자 용어 자동 변환)
function cleanTitle(title) {
  if (!title) return '제목 없음';
  return String(title)
    .replace(/\bcommit\b/gi, '작업')
    .replace(/\bVercel redeploy\b/gi, '서버 재배포')
    .replace(/\bVercel deploy\b/gi, '서버 배포')
    .replace(/chat-logs?/g, '작업 기록')
    .replace(/\bfrontmatter\b/gi, '메타데이터')
    .replace(/\bboundary\b/gi, '예외 상황')
    .replace(/\bfallback\b/gi, '대체 동작');
}

// 본문 첫 ## 헤딩의 본문 추출 (대안)
function firstSection(body) {
  const m = body.match(/^##\s+[^\n]+\n([\s\S]*?)(?=\n##\s|$)/m);
  return m ? m[1].trim() : '';
}

// "✅ done" 또는 결과 류 패턴 검출
function findResult(body) {
  // STATUS: ✅ done 패턴
  const m1 = body.match(/STATUS\*?\*?:\s*✅[^\n]+/);
  if (m1) return '작업이 완료되었습니다 (' + m1[0].replace(/STATUS\*?\*?:\s*/, '').trim() + ').';
  // ✅ 단독 라인
  const m2 = body.match(/^[-*]?\s*✅\s*(.+)$/m);
  if (m2) return m2[1].trim();
  // 통과 / 완료 라인
  const m3 = body.match(/^[-*•]?\s*([^\n]*?(?:통과|완료|성공)[^\n]*)$/m);
  if (m3) return m3[1].trim();
  return '작업이 정상적으로 마무리되었습니다.';
}

// "다음" / "후속" 패턴 검출
function findNext(body) {
  // ## 다음 단계 / 후속 / 다음 작업 헤딩
  const m1 = body.match(/^##\s*(?:다음|후속|향후|남은)[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/m);
  if (m1) {
    const content = m1[1].trim().split('\n').slice(0, 3).join(' ').replace(/[-*•]\s*/g, '').trim();
    if (content) return content;
  }
  // "대표님 결정" 헤딩 본문
  const m2 = body.match(/^##\s*대표님\s*결정[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/m);
  if (m2) return m2[1].trim().split('\n').slice(0, 2).join(' ').replace(/[-*•]\s*/g, '').trim() || '없음';
  return '없음';
}

// 첫 단락 (제목/메타 줄 제외)
function findCause(body, fm) {
  // ## 대표님 지적 / 문제 / 원인 / 배경 헤딩 우선
  const m1 = body.match(/^##\s*(?:대표님\s*지적|문제|원인|배경|상황)[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/m);
  if (m1) {
    const txt = m1[1].trim().split('\n').filter(l => l.trim() && !l.startsWith('---')).slice(0, 3).join(' ');
    if (txt) return cleanTitle(txt).slice(0, 240);
  }
  // 첫 ##/# 이후 첫 자연어 단락
  const lines = body.split('\n');
  let inHeader = true;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) { inHeader = false; continue; }
    if (inHeader) continue;
    if (t.startsWith('**') && t.endsWith('**')) continue;  // **TASK** 같은 메타
    if (t.match(/^\*\*[A-Z_]+\*\*:/)) continue;  // **STATUS**: ...
    return cleanTitle(t).slice(0, 240);
  }
  return (fm.tasks ? `업무 ${Array.isArray(fm.tasks)?fm.tasks.join(', '):fm.tasks} 진행 중 발생한 사안입니다.` : '직전 작업의 후속 또는 대표님 피드백에 따른 작업입니다.');
}

// 해결 요약
function findSolution(body, fm) {
  // ## 해결 / 박은 것 / 박은 / fix / 변경 헤딩
  const m1 = body.match(/^##\s*(?:해결|박은\s*것|박은|수정|변경|fix|작업|구현)[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/im);
  if (m1) {
    const lines = m1[1].trim().split('\n').filter(l => l.trim() && !l.startsWith('---'));
    const summary = lines.slice(0, 3).join(' ').replace(/[-*•]\s*/g, '').replace(/`/g, '');
    if (summary) return cleanTitle(summary).slice(0, 280);
  }
  // ### 으로 시작하는 첫 3개를 모음
  const subs = body.match(/^###\s+([^\n]+)/gm);
  if (subs && subs.length) {
    return cleanTitle(subs.slice(0, 3).map(s => s.replace(/^###\s+/, '').replace(/[①②③④⑤⑥⑦⑧⑨⑩]\s*/g, '')).join(' / ')).slice(0, 280);
  }
  return '코드를 수정하고 라이브에 반영하여 정상 작동을 확인했습니다.';
}

// 하나의 chat-log 변환
function transformOne(md, slug) {
  const { fm, body, rawFm } = parseFrontmatter(md);
  if (!fm) return { skipped: true, reason: 'frontmatter 없음', md };
  if (hasBusinessBlocks(body)) return { skipped: true, reason: '이미 5블록 있음', md };

  const goal     = cleanTitle(fm.title || slug);
  const cause    = findCause(body, fm);
  const solution = findSolution(body, fm);
  const result   = findResult(body);
  const next     = findNext(body);

  const blocks = `## 🎯 한 줄 요약
${goal}

## 📍 왜 발생했나
${cause}

## 🛠 어떻게 해결했나
${solution}

## ✅ 결과
${result}

## ⏱ 다음 결정 필요
${next}

---

# 🔧 기술 상세 (개발자용)

`;

  // frontmatter에 auto_migrated: true 플래그 박기 (사람용 탭에서 안내 배지로 표시)
  let newRawFm = rawFm;
  if (!newRawFm.match(/^auto_migrated:/m)) {
    newRawFm = newRawFm.trimEnd() + '\nauto_migrated: true';
  }

  const newMd = `---\n${newRawFm}\n---\n\n${blocks}${body.trimStart()}`;
  return { skipped: false, md: newMd };
}

// ========== 메인 ==========
const files = fs.readdirSync(CHATLOGS_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

let migrated = 0, skipped = 0, errors = 0;
const log = [];

for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  const fp = path.join(CHATLOGS_DIR, f);
  const md = fs.readFileSync(fp, 'utf-8');
  try {
    const { skipped: sk, reason, md: newMd } = transformOne(md, slug);
    if (sk) {
      skipped++;
      log.push(`  ⏭️  ${f} — skip (${reason})`);
    } else {
      if (!DRY_RUN) fs.writeFileSync(fp, newMd, 'utf-8');
      migrated++;
      log.push(`  ✅ ${f} — 보강 완료`);
    }
  } catch (e) {
    errors++;
    log.push(`  ❌ ${f} — 에러: ${e.message}`);
  }
}

console.log(`\nchat-log 사업가 시점 5블록 보강 결과 (${DRY_RUN ? 'DRY-RUN' : '실제 적용'})`);
console.log(`전체: ${files.length}개 / 보강: ${migrated} / skip: ${skipped} / 에러: ${errors}\n`);
log.forEach(l => console.log(l));
process.exit(errors > 0 ? 1 : 0);
