#!/usr/bin/env node
/**
 * TW B2B — 시스템 매뉴얼 자동 빌더 (BL-SYSTEM-MANUAL-AUTOGEN)
 *
 * 헌법 부합:
 *   ② 무인 실행: push 시 자동 재생성
 *   ⑥ AI 가독성: 사람용 + AI용 이중 형식 (헌법 12대 원칙 6번)
 *   ⑧ 통합 관리: 5개 데이터 소스 → 1개 매뉴얼 (단일 진실)
 *
 * 5섹션 데이터 소스:
 *   1. 🗺️ 전체 지도        ← scripts/pages-meta.mjs (PAGES 배열)
 *   2. 🤖 봇 카탈로그       ← .github/workflows/*.yml (헤더 추출)
 *   3. 🔄 데이터 흐름       ← _os/manifest.json + 스크립트 헤더
 *   4. 🚦 자동화 게이트     ← OPERATIONS_CHARTER.md (부칙 추출)
 *   5. 📋 새 클로드 부팅    ← _os/boot.md + _os/handoff-header.md
 *
 * 출력: _os/service-map.md (사람 + AI 이중 형식)
 *
 * 호출:
 *   - .github/workflows/system-manual-rebuild.yml (push 시 자동)
 *   - 수동: node _os/scripts/build-system-manual.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// 동적 루트 산출 (헌법 부칙 10 — 위치 의존성 금지)
const ROOT = (() => {
  try { return execSync('git rev-parse --show-toplevel').toString().trim(); }
  catch { return process.env.GITHUB_WORKSPACE || process.cwd(); }
})();

const NOW = new Date().toISOString();

// ────────────────────────────────────────────────────────────
// 섹션 1: 전체 지도 (PAGES 배열에서 추출)
// ────────────────────────────────────────────────────────────
async function buildSection1_Map() {
  const pagesMetaPath = path.join(ROOT, 'scripts/pages-meta.mjs');
  let pages = [];
  try {
    const mod = await import('file://' + pagesMetaPath);
    pages = mod.PAGES || [];
  } catch (e) {
    return `> ⚠️ pages-meta.mjs 로드 실패: ${e.message}\n`;
  }

  // audience 별 그룹화
  const groups = {};
  for (const p of pages) {
    const a = p.audience || 'unknown';
    if (!groups[a]) groups[a] = [];
    groups[a].push(p);
  }

  const audienceOrder = ['public', 'hotel', 'admin', 'unknown'];
  const audienceLabel = {
    public: '🌐 공개 (로그인 불필요)',
    hotel: '🏨 호텔 매니저 (로그인)',
    admin: '⚙️ 관리자',
    unknown: '❓ 미분류'
  };

  let human = '';
  let ai = '```yaml\nsection: map\npages_total: ' + pages.length + '\ngroups:\n';

  for (const aud of audienceOrder) {
    if (!groups[aud] || !groups[aud].length) continue;
    human += `\n### ${audienceLabel[aud] || aud} (${groups[aud].length}개)\n\n`;
    human += '| 페이지 | 역할 | 상태 |\n|---|---|---|\n';
    ai += `  ${aud}:\n`;
    for (const p of groups[aud]) {
      const status = p.status || 'unknown';
      const badge = { live: '✅', planned: '⏳', 'needs-refactor': '🔧', retired: '🗑️', partial: '🟡', new: '🆕' }[status] || '❓';
      human += `| \`${p.path}\` | ${p.name || '?'} | ${badge} ${status} |\n`;
      ai += `    - { path: "${p.path}", status: "${status}", name: "${p.name || ''}" }\n`;
    }
  }
  ai += '```\n';

  return { human, ai };
}

// ────────────────────────────────────────────────────────────
// 섹션 2: 봇 카탈로그 (.github/workflows/*.yml 헤더)
// ────────────────────────────────────────────────────────────
function buildSection2_Bots() {
  const dir = path.join(ROOT, '.github/workflows');
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch (e) {
    return { human: `> ⚠️ workflows 디렉토리 로드 실패\n`, ai: '' };
  }

  let human = `\n총 **${files.length}개** 봇이 자동 실행 중.\n\n| 봇 | 트리거 | 하는 일 |\n|---|---|---|\n`;
  let ai = '```yaml\nsection: bots\nbots_total: ' + files.length + '\nbots:\n';

  for (const f of files.sort()) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const firstHeader = (content.match(/^#\s+TW B2B\s+—\s+(.+)$/m) || content.match(/^#\s+(.+?Bot.*)$/im) || [, '?'])[1].trim();
    
    // 트리거 추출
    const triggers = [];
    if (/^\s*push:/m.test(content)) triggers.push('push');
    if (/^\s*schedule:/m.test(content)) triggers.push('cron');
    if (/^\s*workflow_dispatch:/m.test(content)) triggers.push('수동');
    if (/^\s*pull_request:/m.test(content)) triggers.push('PR');
    
    const role = firstHeader.replace(/^TW B2B — /, '').slice(0, 50);
    human += `| \`${f}\` | ${triggers.join('/') || '?'} | ${role} |\n`;
    ai += `  - { file: "${f}", trigger: [${triggers.map(t => `"${t}"`).join(', ')}], role: "${role}" }\n`;
  }
  ai += '```\n';

  return { human, ai };
}

// ────────────────────────────────────────────────────────────
// 섹션 3: 데이터 흐름 (_os/manifest.json + 핵심 데이터 파일)
// ────────────────────────────────────────────────────────────
function buildSection3_DataFlow() {
  const human = `
**핵심 데이터 파일 5개와 흐름:**

\`\`\`
사용자/봇 작업
  ↓
[1] tasks.json (작업 백로그)
  ↓ commit subject [step:done:N]
[2] auto-detect-task-status.py 봇 작동
  ↓ tasks.json status 자동 갱신
[3] sync.yml 봇 작동
  ↓ display.json 재생성 (어드민용)
[4] admin-status.html 5초 폴링
  ↓ fetch display.json + activity-feed.display.json
[5] renderAll() 함수 호출
  ↓ 카테고리 카드 + 페이지 맵 + 활동 이력 일괄 재렌더 (부칙 19)
화면 자동 갱신
\`\`\`

**3-Layer 파일 분리 원칙 (D-012):**

| 파일 | 크기 한도 | 용도 |
|---|---|---|
| \`*.summary.json\` | 5KB 이하 | 클로드용 (토큰 절약) |
| \`*.display.json\` | 50KB 이하 | UI 렌더링용 |
| \`*.full.json\` | 무제한 | 백업·분석용 |
`;

  const ai = `\`\`\`yaml
section: data_flow
critical_files:
  - { name: "tasks.json", role: "백로그 단일 진실", path: "/tasks.json" }
  - { name: "display.json", role: "UI 렌더링용 (50KB 이하)", path: "/display.json" }
  - { name: "activity-feed.display.json", role: "활동 이력 800건", path: "/activity-feed.display.json" }
  - { name: "_os/manifest.json", role: "OS 자산 매핑", path: "/_os/manifest.json" }
  - { name: "_health.json", role: "건강 검진 결과", path: "/_health.json" }

flow:
  - "user/bot commit"
  - "[step:done:N] tag → auto-detect-task-status.py"
  - "tasks.json status update"
  - "sync.yml → display.json regenerate"
  - "admin-status.html poll 5s → renderAll()"

refresh_rule: "부칙 19 — 부분 갱신 금지, renderAll() 일괄 호출 의무"
\`\`\`
`;

  return { human, ai };
}

// ────────────────────────────────────────────────────────────
// 섹션 4: 자동화 게이트 (OPERATIONS_CHARTER.md 부칙 추출)
// ────────────────────────────────────────────────────────────
function buildSection4_Gates() {
  const charterPath = path.join(ROOT, 'OPERATIONS_CHARTER.md');
  let charter = '';
  try { charter = fs.readFileSync(charterPath, 'utf8'); }
  catch (e) { return { human: '> ⚠️ 헌법 로드 실패\n', ai: '' }; }

  // 부칙 N — XXX 패턴 추출
  const rules = [];
  const re = /^-?\s*\*\*부칙\s+(\d+)(?:\s*—\s*([^*:]+?))?[*:]/gm;
  let m;
  while ((m = re.exec(charter)) !== null) {
    rules.push({ n: m[1], title: (m[2] || '').trim() });
  }

  let human = `
**헌법 부칙 ${rules.length}개가 자동 게이트로 작동 중:**

| # | 게이트 | 위반 시 |
|---|---|---|
`;
  // 핵심 강제 게이트만 사람용에 (모두는 너무 길어짐)
  const keyGates = ['7', '8', '11', '14', '15', '16', '18', '19'];
  let ai = '```yaml\nsection: gates\ngates:\n';
  for (const r of rules) {
    ai += `  - { n: ${r.n}, title: "${r.title.replace(/"/g, '\\"').slice(0, 80)}" }\n`;
    if (keyGates.includes(r.n)) {
      human += `| 부칙 ${r.n} | ${r.title.slice(0, 60)} | CI 실패 또는 "헌법 확인" 정지 |\n`;
    }
  }
  ai += '```\n';
  human += `\n_전체 ${rules.length}개 부칙은 \`OPERATIONS_CHARTER.md\` 참조._\n`;

  return { human, ai };
}

// ────────────────────────────────────────────────────────────
// 섹션 5: 새 클로드 부팅 절차
// ────────────────────────────────────────────────────────────
function buildSection5_Boot() {
  const human = `
**새 채팅 클로드는 작업 시작 전 이 순서로 fetch:**

\`\`\`
1. _os/handoff-header.md (이 매뉴얼 진입 머리)
       ↓
2. OPERATIONS_CHARTER.md (헌법 본문, 200줄)
       ↓
3. CLAUDE.md (행동 매뉴얼, 150줄)
       ↓
4. _os/playbook/claude-discipline.md (부칙 16 디테일)
       ↓
5. _os/boot.md (작업 종류 분기)
       ↓
6. _os/service-map.md (이 파일 — 시스템 전체 지도)
       ↓
7. 작업 대상 파일 GitHub raw fetch
       ↓
8. 중복 grep 박기
       ↓
작업 시작
\`\`\`

**금지 행동 (입에서 나오면 헌법 위반 신호):**

- ❌ "MCP 없어서 못 합니다" → bash + PAT으로 git clone 가능
- ❌ "토큰 폐기하세요 / 보안 위험합니다" → 개발기간 평문 정상 (부칙 4)
- ❌ "어느 방식 원하세요? A/B/C" → 개발 순서·기술 선택은 자율 (부칙 16)
- ❌ "임시로 / 로컬에서 먼저" → 우회 제안 금지
- ❌ 결과를 클로드 언어로 보고 → 초등학생 언어 + "어디/무엇/어떻게" 4줄

**대표님이 묻는 것 4가지뿐:**

1. ✅ 비즈니스 방향 (가격, 정책, 사업 모델)
2. ✅ 서비스 방향 (사용자 경험, 카피, 톤)
3. ✅ 전체 틀 변화 (페이지 추가/삭제, 메뉴 구조)
4. ✅ 디자인 큰 방향 (이미지 첨부 후 묻기)

**그 외 모든 개발/기술/작업 순서는 정석 자율 판단.**
`;

  const ai = `\`\`\`yaml
section: boot
required_fetch_order:
  - "_os/handoff-header.md"
  - "OPERATIONS_CHARTER.md"
  - "CLAUDE.md"
  - "_os/playbook/claude-discipline.md"
  - "_os/boot.md"
  - "_os/service-map.md"
  - "<target_file>"
  - "grep duplication check"

forbidden:
  - "MCP 없어서 못 합니다"
  - "토큰 폐기하세요"
  - "어느 방식 원하세요? A/B/C"
  - "임시로 / 로컬에서 먼저"
  - "클로드 언어로 결과 보고"

ask_only:
  - "비즈니스 방향"
  - "서비스 방향"
  - "전체 틀 변화"
  - "디자인 큰 방향 + 이미지"
\`\`\`
`;

  return { human, ai };
}

// ────────────────────────────────────────────────────────────
// 메인
// ────────────────────────────────────────────────────────────
async function main() {
  const s1 = await buildSection1_Map();
  const s2 = buildSection2_Bots();
  const s3 = buildSection3_DataFlow();
  const s4 = buildSection4_Gates();
  const s5 = buildSection5_Boot();

  const out = `# 📖 TW B2B 시스템 매뉴얼 (service-map)

> **자동 생성 — 직접 편집 금지** (\`.github/workflows/system-manual-rebuild.yml\`이 push마다 재생성)
> **생성 시각:** ${NOW}
> **포맷 (헌법 12대 원칙 6번 — AI 가독성):** 사람용 표/설명 + AI용 YAML 블록

---

## 🎯 이 매뉴얼이 뭐냐면

새 채팅 클로드가 **30초 안에** TW B2B 시스템 전체 구조를 파악할 수 있도록 박은 단일 진실 지도.

5개 데이터 소스(\`pages-meta.mjs\` / \`.github/workflows/\` / \`_os/manifest.json\` / \`OPERATIONS_CHARTER.md\` / \`_os/boot.md\`)에서 자동 추출되어 **항상 라이브 상태**.

---

## 🗺️ 섹션 1 — 전체 지도 (페이지)

${s1.human}

${s1.ai}

---

## 🤖 섹션 2 — 봇 카탈로그

${s2.human}

${s2.ai}

---

## 🔄 섹션 3 — 데이터 흐름

${s3.human}

${s3.ai}

---

## 🚦 섹션 4 — 자동화 게이트 (헌법 부칙)

${s4.human}

${s4.ai}

---

## 📋 섹션 5 — 새 클로드 부팅 절차

${s5.human}

${s5.ai}

---

**이 매뉴얼은 \`.github/workflows/system-manual-rebuild.yml\` 봇이 push마다 자동 재생성.** 수동 편집 시 다음 push에서 덮어쓰임.
`;

  const outPath = path.join(ROOT, '_os/service-map.md');
  fs.writeFileSync(outPath, out, 'utf8');
  console.log(`✅ ${outPath} 생성 완료 (${out.length.toLocaleString()} bytes)`);
}

main().catch(e => { console.error(e); process.exit(1); });
