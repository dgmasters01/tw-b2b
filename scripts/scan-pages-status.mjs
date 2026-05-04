#!/usr/bin/env node
// ============================================================
// scripts/scan-pages-status.mjs
// ============================================================
//
// 헌법 5조 (무인 검증) + 6조 (사람용+AI용 이중) — 페이지 완성도 자동 측정.
//
// 23개 페이지 각각을 5개 차원으로 평가 → pages-status.json 자동 생성.
// admin-status.html에서 이 JSON을 읽어 시각화.
//
// 측정 5대 차원:
//   1. structure   — 파일 존재 + 최소 크기 (1KB 이상)
//   2. design      — Aurora 디자인 토큰(shared.css v2 / aurora 변수) 적용 여부
//   3. function    — JS 함수 개수 + fetch/이벤트 핸들러 풍부도
//   4. content     — 빈 placeholder/TODO/coming-soon 빈도 (낮을수록 좋음)
//   5. recency     — 최근 commit 갱신일 (오래됐을수록 신뢰도 ↓)
//
// 각 차원 0~100점, 가중치 적용 → 페이지별 종합 점수.
// 사용:
//   node scripts/scan-pages-status.mjs        # pages-status.json 생성
//   node scripts/scan-pages-status.mjs --check # CI용: status 변동만 stdout
// ============================================================

import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { PAGES, PAGE_TASK_META } from './pages-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
// 3-Layer 출력 파일 경로 (D-012 대용량 파일 분리 원칙 / 헌법 ⑥ AI 가독성)
const OUT_FULL    = resolve(REPO_ROOT, 'pages-status.json');           // 분석용 (전체)
const OUT_DISPLAY = resolve(REPO_ROOT, 'pages-status.display.json');   // UI용 (admin-status.html이 fetch)
const OUT_SUMMARY = resolve(REPO_ROOT, 'pages-status.summary.json');   // Claude용 (5KB 이내)

// ────────────────────────────────────────────────────────────
// 차원별 점수 계산
// ────────────────────────────────────────────────────────────

const WEIGHTS = {
  structure: 0.10,
  design:    0.25,
  function:  0.30,
  content:   0.20,
  recency:   0.15,
};

function scoreStructure(filePath) {
  if (!existsSync(filePath)) return { score: 0, hint: '파일 없음', size: 0 };
  const size = statSync(filePath).size;
  if (size < 1024) return { score: 20, hint: '1KB 미만 — 골격뿐', size };
  if (size < 5120) return { score: 50, hint: '5KB 미만 — 기본 골격', size };
  if (size < 20480) return { score: 80, hint: '본격 페이지', size };
  return { score: 100, hint: '대형 페이지', size };
}

function scoreDesign(html) {
  if (!html) return { score: 0, hint: '파일 없음' };
  const hasSharedCss = /shared\.css/.test(html);
  const hasAurora = /aurora|--aurora|c3-trendy|glassmorphism/i.test(html);
  const hasOldInline = /<style>[^<]{200,}/.test(html); // 거대 인라인 스타일은 디자인 부채
  const hasMobileMeta = /viewport.*width=device-width/.test(html);

  let score = 0;
  const hints = [];
  if (hasSharedCss) { score += 40; hints.push('shared.css ✓'); } else { hints.push('shared.css 없음'); }
  if (hasAurora) { score += 30; hints.push('Aurora 토큰 ✓'); } else { hints.push('Aurora 토큰 없음'); }
  if (hasMobileMeta) { score += 20; } else { hints.push('viewport meta 없음'); }
  if (!hasOldInline) { score += 10; } else { hints.push('인라인 스타일 비대'); }
  return { score: Math.min(100, score), hint: hints.join(', ') };
}

function scoreFunction(html) {
  if (!html) return { score: 0, hint: '파일 없음' };
  const funcs = (html.match(/\bfunction\s+\w+|=>\s*{/g) || []).length;
  const fetches = (html.match(/fetch\s*\(/g) || []).length;
  const handlers = (html.match(/\bon[A-Z]\w+\s*=|addEventListener\s*\(/g) || []).length;
  const tabs = (html.match(/data-tab=|class="tab[" ]/g) || []).length;
  // 정적 안내 페이지(예: admin-service-ops)는 의도적으로 함수가 0 — 'page-type'으로 페널티 면제
  const isStaticByDesign = /운영 진입 후|coming soon|준비 중|placeholder/i.test(html) &&
                          funcs === 0 && fetches === 0;
  if (isStaticByDesign) return { score: 60, hint: '의도된 정적 안내 페이지', funcs, fetches, handlers };

  let score = 0;
  if (funcs >= 1) score += 30;
  if (funcs >= 5) score += 20;
  if (funcs >= 15) score += 10;
  if (fetches >= 1) score += 15;
  if (fetches >= 5) score += 10;
  if (handlers >= 3) score += 10;
  if (tabs >= 2) score += 5;
  return { score: Math.min(100, score), hint: `함수 ${funcs} · fetch ${fetches} · 핸들러 ${handlers} · 탭 ${tabs}`, funcs, fetches, handlers, tabs };
}

function scoreContent(html) {
  if (!html) return { score: 0, hint: '파일 없음' };
  const todos = (html.match(/TODO|FIXME|XXX|준비 중|coming soon|placeholder|아직 구현/gi) || []).length;
  const lorem = (html.match(/lorem ipsum/gi) || []).length;
  const emptyTags = (html.match(/<(div|span|p|section)[^>]*>\s*<\/\1>/g) || []).length;

  let score = 100;
  score -= todos * 8;
  score -= lorem * 20;
  score -= emptyTags * 2;
  score = Math.max(0, score);
  const issues = [];
  if (todos) issues.push(`TODO/준비중 ${todos}건`);
  if (lorem) issues.push(`lorem ipsum ${lorem}건`);
  if (emptyTags > 5) issues.push(`빈 태그 ${emptyTags}건`);
  return { score, hint: issues.length ? issues.join(', ') : '깨끗', todos };
}

function scoreRecency(filePath, relPath) {
  // git log로 최근 commit 날짜 (없으면 mtime fallback)
  let lastDate = null;
  try {
    const out = execSync(`git log -1 --format=%cI -- "${relPath}"`, {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore','pipe','ignore']
    }).trim();
    if (out) lastDate = new Date(out);
  } catch {}
  if (!lastDate && existsSync(filePath)) lastDate = new Date(statSync(filePath).mtime);
  if (!lastDate) return { score: 0, hint: '날짜 없음', lastDate: null };

  const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
  let score;
  if (daysAgo <= 3)   score = 100;
  else if (daysAgo <= 7)  score = 90;
  else if (daysAgo <= 14) score = 70;
  else if (daysAgo <= 30) score = 50;
  else if (daysAgo <= 60) score = 30;
  else score = 10;
  return { score, hint: `${daysAgo}일 전`, lastDate: lastDate.toISOString(), daysAgo };
}

// ────────────────────────────────────────────────────────────
// 페이지 1개 종합 평가
// ────────────────────────────────────────────────────────────
function evaluatePage(page) {
  const relPath = page.path.replace(/^\//, '');
  const filePath = resolve(REPO_ROOT, relPath);
  const html = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

  const dim = {
    structure: scoreStructure(filePath),
    design:    scoreDesign(html),
    function:  scoreFunction(html),
    content:   scoreContent(html),
    recency:   scoreRecency(filePath, relPath),
  };

  // 가중 평균
  let total = 0;
  for (const k of Object.keys(WEIGHTS)) {
    total += dim[k].score * WEIGHTS[k];
  }
  total = Math.round(total);

  // 등급 배지
  let badge;
  if (total >= 90) badge = { label: '🟢 완성', color: '#16a34a' };
  else if (total >= 70) badge = { label: '🔵 본격', color: '#2563eb' };
  else if (total >= 50) badge = { label: '🟡 부분', color: '#ca8a04' };
  else if (total >= 30) badge = { label: '🟠 골격', color: '#ea580c' };
  else badge = { label: '🔴 미작성', color: '#dc2626' };

  // 가장 약한 차원 — "무엇이 덜 됐는지" 한 줄 요약
  const weakest = Object.entries(dim).sort((a,b) => a[1].score - b[1].score)[0];
  const weakestKey = weakest[0];
  const weakestHint = weakest[1].hint;

  return {
    path: page.path,
    name: page.name,
    audience: page.audience,
    declaredStatus: page.status,
    purpose: page.purpose,
    fileExists: existsSync(filePath),
    fileSize: dim.structure.size,
    dimensions: dim,
    totalScore: total,
    badge,
    weakest: { dimension: weakestKey, hint: weakestHint },
    lastTask: PAGE_TASK_META[relPath] || null,
  };
}

// ────────────────────────────────────────────────────────────
// 실행
// ────────────────────────────────────────────────────────────
function main() {
  const startedAt = new Date().toISOString();
  console.log(`\n=== 페이지 완성도 자동 스캔 (${PAGES.length}개) ===\n`);

  const results = [];
  for (const page of PAGES) {
    const r = evaluatePage(page);
    results.push(r);
    const pad = (s, n) => String(s).padEnd(n);
    console.log(
      `  ${r.badge.label}  ${pad(r.totalScore + '점', 6)} ${pad(r.path, 32)} — ${r.weakest.dimension}: ${r.weakest.hint}`
    );
  }

  // 카테고리별 집계 (사이드바 6개 메뉴 매핑)
  const byCategory = {
    'central-hub':       results.filter(r => r.path === '/admin-hub.html'),
    'task-management':   results.filter(r => r.path === '/admin-tasks.html'),
    'business-docs':     results.filter(r => r.path === '/admin-business.html'),
    'page-gallery':      results.filter(r => r.path === '/admin-gallery.html'),
    'service-operations':results.filter(r => r.path === '/admin-service-ops.html'),
    'project-status':    results.filter(r => r.path === '/admin-status.html' || r.path === '/admin.html'),
  };
  const categoryStats = {};
  for (const [k, v] of Object.entries(byCategory)) {
    if (v.length === 0) {
      categoryStats[k] = { score: 0, missing: true, label: '페이지 없음' };
    } else {
      const avg = Math.round(v.reduce((s,r) => s + r.totalScore, 0) / v.length);
      categoryStats[k] = { score: avg, pages: v.map(r => r.path) };
    }
  }

  // 전체 가중 평균
  const totalAvg = Math.round(results.reduce((s,r) => s + r.totalScore, 0) / results.length);
  const counts = {
    '🟢 완성':   results.filter(r => r.totalScore >= 90).length,
    '🔵 본격':   results.filter(r => r.totalScore >= 70 && r.totalScore < 90).length,
    '🟡 부분':   results.filter(r => r.totalScore >= 50 && r.totalScore < 70).length,
    '🟠 골격':   results.filter(r => r.totalScore >= 30 && r.totalScore < 50).length,
    '🔴 미작성': results.filter(r => r.totalScore < 30).length,
  };

  console.log(`\n전체 평균: ${totalAvg}점`);
  for (const [k,v] of Object.entries(counts)) console.log(`  ${k}: ${v}개`);

  const output = {
    generatedAt: startedAt,
    totalAvgScore: totalAvg,
    counts,
    weights: WEIGHTS,
    categoryStats,
    pages: results,
  };

  // ────────────────────────────────────────────────────────────
  // 3-Layer 분리 출력 (D-012 대용량 파일 분리 원칙)
  // ────────────────────────────────────────────────────────────

  // FULL (분석용) — 전체 데이터 그대로
  writeFileSync(OUT_FULL, JSON.stringify(output, null, 2));

  // DISPLAY (UI용) — admin-status.html이 fetch, 사람이 화면에서 보는 형태
  // 시급 TOP은 점수 낮은 순으로 정렬해 미리 박아둠 (UI 계산 부담 줄임)
  const sortedByScore = [...results].sort((a, b) => a.totalScore - b.totalScore);
  const display = {
    generatedAt: startedAt,
    totalAvgScore: totalAvg,
    counts,
    categoryStats,
    // 6개 사이드바 메뉴별 카드 표시용 데이터 (펼침 모달 포함)
    sidebarMenus: [
      { key: 'central-hub',        label: '🎯 Central Hub',        url: '/admin-hub.html',          path: '/admin-hub.html' },
      { key: 'task-management',    label: '📋 Task Management',    url: '/admin-tasks.html',        path: '/admin-tasks.html' },
      { key: 'business-docs',      label: '📚 Business Docs',      url: '/admin-business.html',     path: '/admin-business.html' },
      { key: 'page-gallery',       label: '📸 Page Gallery',       url: '/admin-gallery.html',      path: '/admin-gallery.html' },
      { key: 'service-operations', label: '🛠️ Service Operations', url: '/admin-service-ops.html',  path: '/admin-service-ops.html' },
      { key: 'system-status',      label: '📊 System Status',      url: '/admin-status.html',       path: '/admin-status.html' },
    ].map(m => {
      const r = results.find(x => x.path === m.path);
      return {
        ...m,
        score: r ? r.totalScore : 0,
        badge: r ? r.badge : { label: '🔴 미작성', color: '#dc2626' },
        weakest: r ? r.weakest : null,
        dimensions: r ? r.dimensions : null,
        lastTask: r ? r.lastTask : null,
        fileExists: r ? r.fileExists : false,
      };
    }),
    // 시급 TOP 10 — 점수 낮은 순, 충분한 정보 박음
    topUrgent: sortedByScore.slice(0, 10).map((r, i) => ({
      rank: i + 1,
      path: r.path,
      name: r.name,
      score: r.totalScore,
      badge: r.badge,
      weakest: r.weakest,
      lastTaskId: r.lastTask?.lastTaskId || null,
      lastUpdated: r.lastTask?.lastUpdated || null,
    })),
    // 모든 페이지 — 카드 펼침 시 5차원 점수 + 이력 표시용
    pages: results,
  };
  writeFileSync(OUT_DISPLAY, JSON.stringify(display, null, 2));

  // SUMMARY (Claude용) — 5KB 이내, 끊어진 대화 들어온 새 Claude가 즉시 컨텍스트 복구
  const critical = sortedByScore.filter(r => r.totalScore < 50);
  const partial  = sortedByScore.filter(r => r.totalScore >= 50 && r.totalScore < 70);
  const summary = {
    generatedAt: startedAt,
    totalAvgScore: totalAvg,
    pageCount: results.length,
    counts,
    criticalPages: critical.map(r => ({ path: r.path, score: r.totalScore, weakest: r.weakest.dimension })),
    partialPages:  partial.map(r => ({ path: r.path, score: r.totalScore, weakest: r.weakest.dimension })),
    // 6 메뉴 압축
    sidebarScores: display.sidebarMenus.map(m => ({ key: m.key, score: m.score })),
  };
  writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));

  console.log(`\n✅ 3-Layer 출력 완료:`);
  console.log(`   - pages-status.json         ${(JSON.stringify(output).length/1024).toFixed(1)}KB (분석용)`);
  console.log(`   - pages-status.display.json ${(JSON.stringify(display).length/1024).toFixed(1)}KB (UI용)`);
  console.log(`   - pages-status.summary.json ${(JSON.stringify(summary).length/1024).toFixed(1)}KB (Claude용)`);
}

main();
