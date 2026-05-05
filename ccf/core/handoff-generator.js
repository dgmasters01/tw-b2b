// ============================================================
// ccf/core/handoff-generator.js
// ============================================================
//
// 인계서 자동 생성 (CCF 7원칙 2번)
//
// 입력: tasks.json + task_id + 옵션(headCommit, liveUrl 등)
// 출력: Claude용 인계서(마크다운) 또는 직원용 작업 지시서
//
// 흐름:
//   1) admin-status.html에서 작업 카드 클릭
//   2) 본 모듈이 인계서 마크다운 생성
//   3) 클립보드 자동 복사
//   4) 대표님이 채팅에 붙여넣음
//
// 변경 시 주의:
//   템플릿은 ccf/templates/handoff-claude.md / handoff-staff.md를 단일 진실로 함.
//   본 코드는 그 템플릿에 데이터를 채워 넣는 렌더러일 뿐.
// ============================================================

/**
 * Claude용 인계서 생성
 *
 * @param {Object} task — tasks.json의 task 항목
 * @param {Object} ctx — { headCommit, liveUrl, repo, charterPath, claudeMdPath, decisions, recentChatLogs }
 * @returns {string} markdown
 */
export function buildClaudeHandoff(task, ctx = {}) {
  const {
    repo         = 'dgmasters01/tw-b2b',
    headCommit   = 'HEAD',
    liveUrl      = 'https://gohotelwinners.com',
    charterPath  = 'OPERATIONS_CHARTER.md',
    claudeMdPath = 'CLAUDE.md',
    decisions    = [],
    recentChatLogs = [],
  } = ctx;

  const deps  = Array.isArray(task.depends_on) ? task.depends_on : [];
  const reqs  = Array.isArray(task.autonomous?.requires_decisions_first) ? task.autonomous.requires_decisions_first : [];
  const hours = task.autonomous?.estimated_hours ?? '미정';

  return `[새 채팅 인계 — ${new Date().toISOString().slice(0,10)} ${task.id} 시작]

# 1단계: 헌법 확인 (의무)
GitHub repo ${repo}의 다음 두 파일을 view 도구로 읽고 운영 원칙 파악:
- ${charterPath} (12개 조항, 특히 12조 자체 검증 의무)
- ${claudeMdPath} (특히 11조 chat-log 작성 표준)

라이브: ${liveUrl}

# 2단계: 토큰 충전 (헌법 11조 — 개발 단계)
GitHub PAT / Vercel API / Supabase Management 토큰은 메모리(헌법 11조 충전 상태)에 보존되어 있음.
프로젝트 구체값은 메모리 인용으로 처리.

# 3단계: 직전 작업 컨텍스트
- 마지막 작업 번호: ${headCommit}
${recentChatLogs.length ? recentChatLogs.slice(0,3).map(c => `- ${c.slug}: ${c.title}`).join('\n') : '- (직전 chat-log 없음)'}

# 4단계: 이번 작업 — ${task.id}
**TASK ID:** ${task.id}
**제목:** ${task.title}
**카테고리:** ${task.category} · **우선순위:** ${task.priority} · **사이즈:** ${task.size || '미정'}
**예상 시간:** 약 ${hours}시간

## 🎯 본질
${task.progress ? task.progress.split('\n')[0].slice(0, 200) : '(진행 메모 없음 — task.title 참조)'}

## 📐 의존성 / 선행 결정
${deps.length ? `**선행 작업:** ${deps.join(', ')}` : '**선행 작업:** 없음'}
${reqs.length ? `**선행 결정:** ${reqs.join(', ')}` : '**선행 결정:** 없음'}

${decisions.length ? `## 📚 관련 결정\n${decisions.slice(0,3).map(d => `- ${d.id}: ${d.title}`).join('\n')}` : ''}

## 🛠 작업 정의
${task.title}

(상세는 BACKLOG.md / DECISIONS.md / 기존 chat-log 검색)

## 🚨 작업 시작 첫 응답 가이드
1. 헌법 + CLAUDE.md 11조 fetch
2. 분량 큰 작업이면 헌법 12조 + CLAUDE.md 6조에 따라 자체 끊기 ("Phase A 끝나고 이어서 갈까요?")
3. 단일 응답 토큰 한계 자체 판단 → 안전 지점에서 끊고 대표님께 "이어서?" 확인
4. 위치/구조 질문 절대 금지 (헌법 1조) — Claude가 100% 자율 판단
5. 큰 단위 작업 직전 chat-log 5블록 표준대로 작성 (CLAUDE.md 11조)

## 📌 대표님 호칭/규칙
- 호칭: "대표님"
- 응답 언어: 한국어
- 표현 금지: "박다 / 박았다 / 박힘" — "추가했다 / 만들었다 / 적용했다 / 들어있다" 사용

## 🎯 대표님 검증 요청 — 작업 끝난 후
"어디에 가서 무엇을 클릭하면 무엇이 보이는지" + 라이브 스크린샷 첨부 형태로 보고

# 5단계: 자체 검증 의무 (헌법 12조)
인계 전 7항목 통과:
1. JS 문법 (node --check)
2. JSON 검증 (python3 -m json.tool)
3. Vercel deploy READY
4. 라이브 페이지 fetch (200/401)
5. 데이터 정확성 (수치로 증명)
6. 시각 변경 자체 검증 (코드 흐름 trace)
7. boundary 케이스 (0건/첫번째/마지막/모바일/반복)

# 6단계: 작업 시작
위 1단계(헌법+CLAUDE.md fetch)부터 시작.
대표님 추가 지시 없이 자율 진행 (헌법 1조).
`;
}

/**
 * 직원용 작업 지시서 생성 (간단 버전)
 *
 * @param {Object} task
 * @returns {string} markdown
 */
export function buildStaffHandoff(task) {
  const due = task.autonomous?.estimated_hours ? `약 ${task.autonomous.estimated_hours}시간 예상` : '예상 시간 미정';

  return `[직원 작업 지시서 — ${task.id}]

## 작업: ${task.title}

**카테고리:** ${task.category}
**우선순위:** ${task.priority}
**예상 소요:** ${due}

## 무엇을
${task.progress ? task.progress.slice(0, 500) : task.title}

## 시작 전 확인
- [ ] 작업 시작 시각 기록 (admin-status에서 카드 클릭으로 자동)
- [ ] 막히는 부분 발견 시 대표님께 즉시 알림

## 완료 시
- [ ] ops 알림 endpoint 호출 (자동으로 status=done 갱신됨)
- [ ] CHANGELOG.md에 [변경사유] 태그와 함께 기록

## 도움이 필요하면
대표님 또는 Claude(서비서/서팀장) 호출.
`;
}

/**
 * 자동 라우팅 — 어떤 인계서를 만들지 task.started_by 또는 claude_can_auto에 따라 결정
 *
 * @param {Object} task
 * @param {Object} ctx
 * @returns {{type:'claude'|'staff', body:string}}
 */
export function generateHandoff(task, ctx = {}) {
  const isClaudeWork = task.claude_can_auto === true && task.autonomous?.can_run_alone === true;
  if (isClaudeWork) return { type: 'claude', body: buildClaudeHandoff(task, ctx) };
  return { type: 'staff', body: buildStaffHandoff(task) };
}

// 브라우저 전역 등록
if (typeof window !== 'undefined') {
  window.CCF = window.CCF || {};
  window.CCF.handoffGenerator = { buildClaudeHandoff, buildStaffHandoff, generateHandoff };
}

export default { buildClaudeHandoff, buildStaffHandoff, generateHandoff };
