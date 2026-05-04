---
slug: 2026-05-04-real-system-truth-check
title: BL-REAL-SYSTEM 출발 전 진실 점검 — 시스템 거짓말 4건 발견 후 통합 작업 결정
date: 2026-05-04
commits: []
tasks: [BL-CHAT-LOG-SYSTEM, BL-REAL-SYSTEM]
decisions: [D-014]
---

# 🔴 다음 채팅 Claude 필독 — BL-REAL-SYSTEM Phase α 진행 인계

**시간**: 2026-05-04 ~18:30 KST
**Commits**: (이번 채팅에서 4건 push 후 다음 채팅에서 BL-REAL-SYSTEM 작업 시작)
**연관**: BL-CHAT-LOG-SYSTEM Phase 1 완료 → 진실 점검 → BL-REAL-SYSTEM 신규

---

## 📌 다음 채팅 첫 행동 (이 순서 그대로)

1. 이 파일(`_chat-logs/2026-05-04-real-system-truth-check.md`)을 GitHub raw로 fetch — 이미 했음 (이 메시지가 그것)
2. tasks.json fetch → BL-REAL-SYSTEM 항목 확인 (`status: pending`, `priority: P0`)
3. `_chat-logs/2026-05-04-chat-log-system.md` fetch (Phase 1 메타 컨텍스트)
4. `_chat-logs/index.json` fetch (전체 chat-logs 인덱스)
5. **위치/구조 질문 절대 금지** — 메모리 5번 + 24번 강제. 자율 판단 + 즉시 실행
6. Phase α 4가지 묶음을 한 번에 진행 (분할 시 또 거짓 시스템 됨)
7. 큰 단위 작업 commit 직전 chat-log 박기 의무 (D-014)

---

## 🔥 대표님이 잡아낸 시스템 거짓말 4건 (반드시 해결)

### 거짓말 1 — 자율 작업 큐 카드 메시지 부족
**증상**: 카드 클릭하면 1줄 메시지만 클립보드 복사됨
```
BL-AURORA-MIGRATION 즉시 시작 — [Aurora 통일 캠페인] ...
자율 작업 큐에서 선택됨. tasks.json에서 task 상세 확인 ...
```
**문제**: 새 채팅 Claude가 50% 확률로 잘못된 페이지부터 시작, D-005 결정 누락, 시안 단계 건너뜀
**해결**: 카드 클릭 시 풀 컨텍스트 자동 조립
- tasks.json에서 task 본체 + autonomous + last_commit + last_chat_log 추출
- git log -1로 최신 commit 정보
- _chat-logs/index.json byTask[id]로 관련 chat-log 슬러그
- 결정 사전 체크 (autonomous.requires_decisions_first → DECISIONS.md 발췌)
- "첫 응답 가이드" 자동 생성

### 거짓말 2 — 실시간 동기화 안 됨
**증상**: tasks.json 변경해도 admin-status 화면 그대로. 새로고침해야 반영.
**거짓 표시**: 카드 동작 안내문에 "priority_boost 자동 박힘" 명시 — 그 코드 실제로 없음
**해결**: setInterval 기반 폴링 5초
- `loadIntegratedTasks()` + `loadActivity()` 5초 주기 호출
- 단 사용자 인터랙션 중에는 일시 정지 (모달 열림 등)
- 변경 감지 시 toast "🔄 갱신됨 (HH:MM:SS)" 알림
- Phase β로 Supabase Realtime 별건 BL 등록 (BL-ADMIN-AUTH 옆)

### 거짓말 3 — admin-* 누구나 접근 가능
**증상**: `curl https://gohotelwinners.com/admin-status.html` → 200 OK
**위험**: 토큰 / 결제 정보 / 매니저 정보 / 작업 이력 다 공개 상태
**해결**: chat-logs 방식 확장 (단기, 운영 진입 전까지)
- `vercel.json` rewrites 추가: `/admin-:page.html` → `/api/admin-page?page=:page`
- `/api/admin-page.js` 신규 — Referer 검증 + (장기) Supabase Auth 세션 쿠키 검증
- 정식 오픈 전 BL-ADMIN-AUTH로 교체 (권한 등급 정책 결정 필요)
**주의**: redirects도 동시 박아야 우회 차단 (예: `/admin-status` → `/admin-status.html`)

### 거짓말 4 — 활동 이력 펼침 패널 미구현
**증상**: activity-row 클릭해도 아무 일 안 일어남. Phase 2 약속만 했지 코드 없음.
**해결**: 펼침 패널 + 탭 3개
- `.activity-row` 클릭 → `.expanded` 토글
- 탭 3개:
  - 📖 사람용 = `/chat-logs/{slug}.md` fetch (byCommit[hash]로 슬러그 조회)
  - 🤖 AI용 = ECHO_LOG / DECISIONS 텍스트 검색 (commit hash 또는 task ID)
  - 🔧 코드 변경 = git log show 또는 GitHub API `/repos/.../commits/{hash}` (rate limit 주의 — 캐시 권장)

---

## 📂 현재 시스템 진실 (라이브 b720d3a 기준)

### 작동하는 것 ✅
- chat-logs 인증 게이트 (`/chat-logs/...md` 직접 401, Referer 정상 200)
- chat-logs 우회 차단 (`/_chat-logs/...` → 307 → 401)
- chat-logs/index.json (4개 항목, byCommit + byTask 매핑)
- charter-mapping-check 30/30 PASS
- BL-HUB-RETIRE / IP-CTRL-001 / UX-FEEDBACK-1 모두 done
- 백필 4개 chat-logs 풀 디테일

### 작동 안 하는 것 ❌
- 자율 작업 큐 카드 클릭 (1줄만 복사)
- "🔄 진행 중" 박스 클릭 (1줄만 복사)
- 실시간 동기화 (새로고침 필수)
- admin-* 인증 (누구나 200 OK)
- 활동 이력 펼침 패널 (클릭해도 무반응)
- ADMIN_VIEW_TOKEN env (Vercel 미등록 — Referer 검증만 작동)

---

## 🎯 Phase α 작업 흐름 (다음 채팅에서 자율 진행)

### 1단계 — admin-* 인증 게이트 (~30분)
- `/api/admin-page.js` 신규 (Referer 검증 + 토큰 검증, chat-log API와 동일 패턴)
- `vercel.json` rewrites 추가 + 우회 차단 redirects
- 라이브 검증: 직접 접근 401, Referer 정상 200
- **주의**: 이 단계 끝나면 Claude도 admin-* fetch 시 Referer 헤더 추가 필요

### 2단계 — 실시간 폴링 (~20분)
- admin-status.html에 `startPolling()` 함수 추가
- 5초마다 loadIntegratedTasks + loadActivity 호출
- 모달 열림 / 입력 중에는 일시 정지
- toast 알림 ("🔄 갱신됨 HH:MM:SS")

### 3단계 — 자율 큐 카드 풀 컨텍스트 인계 (~1시간)
- `buildHandoffMessage(taskId)` 함수 신규
- tasks.json + index.json + git log 조합으로 풀 컨텍스트 생성
- 자율 큐 카드 클릭 + "🔄 진행 중" 박스 버튼 둘 다 이 함수 사용
- 메시지 형식: 마지막 commit / 마지막 chat-log / 진행 단계 / 결정 사전 체크 / 작업 흐름 / 첫 응답 가이드

### 4단계 — 활동 이력 펼침 패널 (~1.5시간)
- `.activity-row` 클릭 핸들러 추가
- 펼침 영역 HTML + 탭 3개 (📖 사람용 / 🤖 AI용 / 🔧 코드 변경)
- 각 탭 fetch 로직
  - 📖 = `/chat-logs/index.json` → `byCommit[hash]` → `/chat-logs/{slug}.md`
  - 🤖 = ECHO_LOG / DECISIONS 텍스트 검색
  - 🔧 = `https://api.github.com/repos/dgmasters01/tw-b2b/commits/{hash}` (캐시 5분)
- 마크다운 렌더 (간단한 marked 또는 정적 변환)

### 5단계 — 통합 검증 + commit + chat-log + push (~30분)
- 자가 검증 스크립트
- charter-mapping-check
- 라이브 검증 4가지 (admin 인증 / 폴링 / 큐 인계 / 활동 펼침)
- commit 메시지에 [변경사유] 박기
- chat-log 박기 (BL-REAL-SYSTEM 완료 기록)
- ops 메일 페이로드 제공

### 6단계 — Phase β 별건 BL 확정 등록
- BL-ADMIN-AUTH (Supabase Auth, 결정 대기) — 이미 등록됨
- BL-REALTIME-SUPABASE (Supabase Realtime, 운영 진입 시) — 신규 등록 필요

---

## ⚠️ 막힐 수 있는 지점 미리 경고

### 위험 1: vercel.json rewrites 우선순위
- chat-logs 작업 시 정적 파일이 rewrites보다 우선해서 401 안 떨어짐 → `_chat-logs` 폴더명 변경 + redirects로 해결
- admin-* 인증도 같은 함정 가능 — `_admin-`로 폴더 이동 필요할 수도. 단 admin-*.html은 여러 곳에서 링크 참조 중이라 폴더 이동 어려움 → 다른 방식 필요
- **대안**: admin-*.html 파일을 `private-admin/`로 이동하고 vercel rewrites로 라우팅. 또는 정적 파일 그대로 두고 각 admin 페이지 상단에 클라이언트 사이드 인증 체크 (Referer / Supabase 세션)

### 위험 2: 폴링이 무한 발생 위험
- 모달 열림 / 텍스트 입력 중 폴링 멈춰야 함
- 페이지 백그라운드 시 멈춤 (visibilitychange 이벤트)
- 변경 없으면 화면 갱신 안 함 (last-modified 헤더 또는 hash 비교)

### 위험 3: GitHub API rate limit
- 코드 변경 탭에서 직접 API 호출 시 60req/시 제한
- 해결: localStorage 캐시 5분 또는 Vercel API 경유 (Personal Access Token으로 5000req/시)

### 위험 4: str_replace 누적 깨짐
- admin-status.html 1100줄+ 큰 파일이라 부분 편집 시 컨텍스트 깨짐 위험
- UX-FEEDBACK-1 때 panel-handoff 제거 시 발생한 사건 기억
- 대안: Python heredoc 통째 교체 또는 작은 단위로 나눠 편집

---

## 🚨 헌법/메모리 의무 (다음 채팅도 강제)

- 메모리 5번 (자율판단 강제): 위치/구조/배치 질문 절대 금지
- 메모리 24번 (시스템 디테일 자율): 같은 우려 두 번 표현 = 시스템 설계 실패
- 메모리 17번 (응답 끊김 방지): 분량 판단해서 자체 끊고 "이어서?" 확인
- 메모리 25번 (작업 이력): CHANGELOG + chat-log + commit 메시지 [변경사유] 의무
- D-014 (chat-logs 의무): 큰 단위 commit 직전 chat-log 박기

---

## 📝 다음 채팅 시작 메시지 (대표님 붙여넣기용)

아래 메시지를 새 채팅 첫 입력으로 붙여넣으면 됩니다:

```
BL-REAL-SYSTEM Phase α 시작 — 시스템 거짓말 4건 통합 해결

먼저 GitHub raw에서 다음 4개 파일 fetch (순서 그대로):
1. _chat-logs/2026-05-04-real-system-truth-check.md ← 이게 인계 풀 컨텍스트
2. tasks.json (BL-REAL-SYSTEM 항목)
3. _chat-logs/index.json
4. OPERATIONS_CHARTER.md (헌법 11대 원칙)

repo: https://github.com/dgmasters01/tw-b2b
last commit (이 메시지 작성 시점): b720d3a

작업: 4가지 묶음
① admin-* 인증 게이트
② 실시간 폴링 5초
③ 자율 큐 카드 풀 컨텍스트 인계
④ 활동 이력 펼침 패널 (탭 3개)

분할 금지 (한 번에 끝내야 진짜 작동). 분량 판단해서 자체 끊고 이어가기.
위치/구조 질문 금지 (메모리 5번 + 24번).
헌법 1조: 자율 판단 + 즉시 실행. 대표님은 "방향/작동" 확인만.
```

---

## 🔚 이번 채팅 마지막 commit 직전 메모

이 chat-log를 박는 commit이 BL-CHAT-LOG-SYSTEM Phase 1의 진짜 마지막 작업.
- tasks.json BL-CHAT-LOG-SYSTEM progress 정확화 (Phase 1 완료, Phase 2 흡수)
- BL-REAL-SYSTEM 신규 등록 (P0/large/4h)
- BL-ADMIN-AUTH 신규 등록 (Phase β, 결정 대기)
- 이 chat-log가 다음 채팅의 첫 fetch 대상

다음 채팅이 이 파일만 정확히 읽으면 95% 정확도로 BL-REAL-SYSTEM Phase α 진행 가능.
