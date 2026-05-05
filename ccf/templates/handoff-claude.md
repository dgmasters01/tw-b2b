[새 채팅 인계 — {{DATE}} {{TASK_ID}} 시작]

# 1단계: 헌법 확인 (의무)
GitHub repo {{REPO}}의 다음 두 파일을 view 도구로 읽고 운영 원칙 파악:
- {{CHARTER_PATH}}
- {{CLAUDE_MD_PATH}}

라이브: {{LIVE_URL}}

# 2단계: 토큰 충전 (헌법 11조 — 개발 단계)
GitHub PAT / Vercel API / Supabase Management 토큰은 메모리에 보존되어 있음.

# 3단계: 직전 작업 컨텍스트
- 마지막 작업 번호: {{HEAD_COMMIT}}
{{RECENT_CHAT_LOGS}}

# 4단계: 이번 작업 — {{TASK_ID}}
**TASK ID:** {{TASK_ID}}
**제목:** {{TASK_TITLE}}
**카테고리:** {{TASK_CATEGORY}} · **우선순위:** {{TASK_PRIORITY}} · **사이즈:** {{TASK_SIZE}}
**예상 시간:** 약 {{ESTIMATED_HOURS}}시간

## 🎯 본질
{{TASK_PROGRESS_HEAD}}

## 📐 의존성 / 선행 결정
**선행 작업:** {{DEPENDS_ON}}
**선행 결정:** {{REQUIRES_DECISIONS}}

{{RELATED_DECISIONS}}

## 🛠 작업 정의
{{TASK_TITLE}}
(상세는 BACKLOG.md / DECISIONS.md / 기존 chat-log 검색)

## 🚨 작업 시작 첫 응답 가이드
1. 헌법 + CLAUDE.md 11조 fetch
2. 분량 큰 작업이면 헌법 12조 + CLAUDE.md 6조에 따라 자체 끊기
3. 단일 응답 토큰 한계 자체 판단 → 안전 지점에서 끊고 대표님께 "이어서?" 확인
4. 위치/구조 질문 절대 금지 (헌법 1조)
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
위 1단계부터 시작. 대표님 추가 지시 없이 자율 진행.
