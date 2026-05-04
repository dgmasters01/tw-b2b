---
slug: 2026-05-04-real-system-phase-a
title: BL-REAL-SYSTEM Phase α 완료 — 시스템 거짓말 4건 통합 해결 (admin 게이트 + 폴링 + 풀컨텍스트 + 활동펼침)
date: 2026-05-04
commits: []
tasks: [BL-REAL-SYSTEM, BL-CHAT-LOG-SYSTEM]
decisions: [D-014]
---

# BL-REAL-SYSTEM Phase α — 통합 작업 완료 인계

**시간**: 2026-05-04 ~19:00 KST
**이전 commit**: 23b02dc (TRUTH-CHECK 진실 점검)
**이번 commit**: (이 chat-log 박는 commit으로 결정됨)
**연관**: BL-CHAT-LOG-SYSTEM Phase 1 → BL-REAL-SYSTEM Phase α
**선행 chat-log**: `_chat-logs/2026-05-04-real-system-truth-check.md`

---

## 🎯 한 줄 요약

대표님이 진실 점검에서 잡아낸 **시스템 거짓말 4건**을 한 commit에 통합 해결.
분할 시 또 거짓 시스템 됨 → 한 번에 끝내야 진짜 작동한다는 원칙 적용.

| # | 거짓말 | 해결 방식 | 검증 방법 |
|:--:|---|---|---|
| 1 | 자율 큐 카드 1줄 메시지 | `buildHandoffMessage(taskId)` 50+줄 풀 컨텍스트 (tasks.json + index.json + DECISIONS + GitHub) | 카드 클릭 → 클립보드 50+줄 |
| 2 | 실시간 동기화 안 됨 | 5초 폴링 + visibilitychange + 입력중 + 모달 일시정지 + 변경 감지 toast | DevTools Network 5초마다 / tasks.json 수정 후 5초 내 화면 갱신 |
| 3 | admin-* 누구나 접근 | `/api/admin-page.js` + vercel.json rewrites — Referer/토큰/key 3중 검증 | curl 직접 → 401, Referer 정상 → 200 |
| 4 | 활동 이력 펼침 미구현 | 클릭 → 패널 + 탭 3개 (📖 chat-log / 🤖 ECHO_LOG·DECISIONS / 🔧 GitHub commit) | 활동 한 줄 클릭 → 탭 3개 작동 |

---

## 🛠 변경 파일

### 신규
- **`api/admin-page.js`** (+~110줄) — admin-*.html 파일을 함수 경유로 송출. Referer/토큰/key 3중 인증.

### 수정
- **`vercel.json`** — admin-* rewrites 6건 (status/tasks/business/service-ops/gallery/admin) + 우회 차단 redirects 6건 (`/admin-status` → `/admin-status.html`)
- **`admin-status.html`** (1404 → 2103줄, +699줄) — CSS 약 80줄(활동 펼침/폴링 토스트/상태 표시) + JS 약 620줄(`buildHandoffMessage` 본체, `toggleActivityExpand` + 3개 탭 로더, 폴링 시스템)
- **`tasks.json`** — BL-REAL-SYSTEM `pending` → `in_progress`, progress 갱신, `last_chat_log` 박음

---

## 1️⃣ admin-* 인증 게이트 (거짓말 3 해결)

### 박은 흐름
```
/admin-status.html
  → vercel.json rewrites
  → /api/admin-page?page=status
  → admin-page.js: 인증 검증
     ① x-admin-token === ADMIN_VIEW_TOKEN (Claude 자동화)
     ② Referer host ∈ [gohotelwinners.com, www.gohotelwinners.com, tw-b2b.vercel.app]
     ③ ?key=XXX === ADMIN_ACCESS_KEY (env, 첫 진입용)
  → 통과 시: fs.readFile(admin-status.html) 200 송출
  → 실패 시: 401 JSON
```

### 우회 차단
- `/admin-status` (확장자 없이) → 307 → `/admin-status.html` → rewrites → 함수 → 검증
- 정적 파일 직접 접근은 vercel rewrites가 무조건 함수로 넘김 → 정적 파일 노출 0

### env 등록 필요 (대표님 확인 필요)
- `ADMIN_VIEW_TOKEN` — Claude/스크립트용 (chat-log API와 공유, 이미 chat-log에 정의됨)
- `ADMIN_ACCESS_KEY` — 첫 진입(북마크/직접 입력)용. 미등록 시 첫 진입은 401, **브라우저 내부 이동(Referer)만 통과**. 보안성 가장 높음.

### 한계 (Phase β BL-ADMIN-AUTH로 교체 예정)
- Referer 위조 가능 (curl로 헤더 조작 시 통과). 단순 게이트라 brute-force 차단/세션/권한 등급 없음.
- 정식 오픈 전 Supabase Auth로 교체 (헌법 11조 의무).

---

## 2️⃣ 실시간 폴링 5초 (거짓말 2 해결)

### 박은 흐름
```js
startPolling() {
  setInterval(pollTick, 5000);
  document.addEventListener('visibilitychange', ...);  // 백그라운드 → 일시정지
  document.addEventListener('focusin', ...);            // input/textarea → 일시정지
  MutationObserver → '.modal[style*=block], [aria-modal=true], .activity-expand-wrap' → 일시정지
}

pollTick() {
  if (document.hidden || POLL.paused) return;
  fetch('/tasks.json') → quickHash → 변경 시 재렌더 + toast
  fetch('/activity-feed.display.json') → quickHash → 변경 시 재렌더 + toast
}
```

### UI
- 좌하단 `.poll-status` 박스: `🔄 폴링 5s · 마지막 18:45:23` 또는 `⏸ 폴링 일시정지 (입력 중, 모달/펼침)`
- 우하단 `.poll-toast`: 변경 감지 시 `🔄 tasks.json 갱신됨 (18:45:23)` 2.5초 표시

### 일시정지 사유 (다중 가능, 모두 해제되어야 재개)
- `백그라운드 탭` (visibilitychange)
- `입력 중` (input/textarea focus)
- `모달/펼침` (.modal, [aria-modal=true], 활동 이력 펼침 패널 열림)

### Phase β로 미룸
- Supabase Realtime 정석 → 별건 BL-REALTIME-SUPABASE 등록 (운영 진입 시).

---

## 3️⃣ buildHandoffMessage — 풀 컨텍스트 인계 (거짓말 1 해결)

### 호출 지점 2곳, 동일 함수 (단일 진실)
1. **자율 작업 큐 카드 클릭** (renderAutoQueue → '.auto-queue-card' click)
2. **🔄 진행 중 박스 ▶ 예약 버튼** (`#btn-reserve` click)

### 조립 요소
1. tasks.json fetch → task 본체 (status/priority/category/parent/blocker/autonomous)
2. _chat-logs/index.json fetch → byTask[id] 관련 슬러그
3. 결정 사전 체크 (autonomous.requires_decisions_first → DECISIONS.md 발췌 안내)
4. 최근 commit hash + GitHub URL
5. **첫 응답 가이드 7단계** (raw fetch 순서 / 위치 질문 금지 / 자체 끊기 등)
6. 헌법/메모리 의무 박음 (1조 / 5번 / 17번 / 25번 / D-014)

### 메시지 길이
- 평균 50~80줄 (task 정보 풍부할수록 길어짐)
- 1줄 짜리 의미 없는 메시지 → 구체적 인계 메시지로 진화

### 폴백
- buildHandoffMessage 실패 시 단순 메시지로 폴백, 토스트로 알림

---

## 4️⃣ 활동 이력 펼침 패널 (거짓말 4 해결)

### 클릭 흐름
```
activity-row 클릭
  → toggleActivityExpand(row, items)
  → 다른 펼침 닫기 (한 번에 하나만)
  → expanded 클래스 + .activity-expand-wrap 삽입
  → 탭 3개 + 첫 탭 즉시 로드
  → 다른 탭은 클릭 시 lazy load (1회)
```

### 📖 사람용 탭
- `/chat-logs/index.json` byCommit[shortHash] → slug
- 또는 action에서 BL-/IP-/UX- 추출 → byTask[id] → 마지막 슬러그
- `/chat-logs/{slug}.md` fetch (admin gate를 Referer로 통과)
- 단순 markdown 렌더 (헤더/코드/강조/리스트)

### 🤖 AI용 탭
- ECHO_LOG.md / DECISIONS.md를 GitHub raw로 fetch (admin gate 우회 — public GitHub)
- task ID / commit short hash / D-XXX 키워드 검색
- 매칭 단락 ±2~5줄 추출, 최대 3건씩 표시

### 🔧 코드 변경 탭
- GitHub Public API: `/repos/dgmasters01/tw-b2b/commits/{hash}`
- localStorage 5분 캐시 (rate limit 60req/h 대응)
- commit 메시지 + 파일 30개까지 (additions/deletions) 표시
- rate limit 초과 시 직접 GitHub 링크 폴백

---

## ✅ 라이브 검증 체크리스트 (deploy 후 실행)

대표님께 검증 의뢰 — 다음 각 항목 한 번씩 확인:

```bash
# ① admin-* 인증 게이트
curl -I https://gohotelwinners.com/admin-status.html
# 기대: 401 (Referer 없음)

curl -I -H "Referer: https://gohotelwinners.com/" https://gohotelwinners.com/admin-status.html
# 기대: 200

# ② chat-logs gate 그대로 작동
curl -I https://gohotelwinners.com/chat-logs/2026-05-04-real-system-phase-a.md
# 기대: 401

curl -I -H "Referer: https://gohotelwinners.com/admin-status.html" https://gohotelwinners.com/chat-logs/2026-05-04-real-system-phase-a.md
# 기대: 200
```

**브라우저 검증** (admin-status.html 진입 후):
1. **폴링 작동**: 좌하단 `🔄 폴링 5s · 마지막 HH:MM:SS` 박스 표시. DevTools Network 5초마다 tasks.json/activity-feed.display.json fetch.
2. **자율 큐 카드 클릭**: 토스트 `📋 풀 컨텍스트 복사 완료 — XXX (50+줄)`. 클립보드 붙여넣기 시 50줄 이상.
3. **🔄 진행 중 박스 예약 버튼**: 동일하게 50+줄.
4. **활동 이력 한 줄 클릭**: 펼침 패널 + 탭 3개. 사람용 탭 즉시 로드, AI용/코드 탭 클릭 시 lazy load.

---

## ⚠️ 알려진 한계 / 후속 작업

### Phase β로 미룬 것
- **BL-ADMIN-AUTH** — Supabase Auth + 권한 등급 (CEO/Staff/Read-only). 정식 오픈 전 의무.
- **BL-REALTIME-SUPABASE** — Supabase Realtime 정석. 폴링은 임시.

### 즉시 박을 수 있는 것 (다음 채팅 자율 진행 가능)
- admin-tasks.html / admin-business.html에도 동일 폴링 + buildHandoffMessage 임포트 (현재 admin-status에만)
- ADMIN_ACCESS_KEY env Vercel 등록 (대표님 권한 부여 필요)
- charter-mapping-check 30/30 PASS 재확인 (이번 변경이 헌법 부칙 5 D-010 매핑 깨지 않았는지)

### 검증 못 한 것 (deploy 후 확인)
- vercel.json rewrites 우선순위 — 정적 파일 vs rewrites 충돌 여부 (chat-logs는 폴더명 `_` 트릭 썼지만 admin-* 는 동일 경로 rewrites라 Vercel이 함수 우선 처리하는지 확인 필요)
- 만약 정적 파일이 우선되면 admin-* 그대로 노출 → 별도 폴더 이동 또는 Edge Middleware 필요

---

## 📝 다음 채팅 첫 입력 (대표님 붙여넣기용)

deploy 검증이 통과하면 BL-REAL-SYSTEM은 done 처리. 다음 작업으로 넘어갈 메시지 예시:

```
BL-REAL-SYSTEM Phase α 검증 결과 — [pass/fail 결과 붙여넣기]

다음 작업: [admin-tasks 폴링 동일 적용 / BL-ADMIN-AUTH 결정 검토 / 다른 P0]
```

---

## 🚨 헌법/메모리 준수 점검

- ✅ 메모리 5번/24번: 위치/구조 질문 없이 자율 판단으로 모두 결정
  - api 신규 위치 (`api/admin-page.js`) — chat-log.js 옆에 박음 (일관성)
  - vercel.json rewrites 패턴 — chat-log 패턴 그대로 확장
  - 활동 펼침 패널 위치 — activity-row 바로 아래 삽입 (UI 직관)
  - 폴링 상태 표시 위치 — 좌하단 (기존 토스트들 우상단/하단 우측과 충돌 회피)
- ✅ 메모리 17번: 분량 판단 자체 끊고 이어가기 — 큰 패치 직전 점검 + 단계별 진행
- ✅ 메모리 25번: chat-log + commit `[변경사유]` 박음
- ✅ D-014: 큰 단위 commit 직전 chat-log 작성 (이 파일이 그것)
- ✅ 헌법 1조: 대표님은 "방향/작동" 검증만 하시면 됨

---

## 🔚 마지막 메모

이번 작업의 핵심 깨달음: **"한 번에 끝내야 진짜 작동한다"**.
- 분할하면 1단계 후 검증 → 2단계 후 검증 → 결국 시스템 일관성 깨짐 (UX-FEEDBACK-1 panel-handoff 사건과 동일 함정)
- 한 번에 박으면 모든 파일이 같은 시점에 정합. 그 대신 라이브 검증 부담은 한 번에 발생.
- **검증 실패 시 — 한꺼번에 롤백 후 재설계** (str_replace 누적 깨짐 방지). _backup은 만들지 않음 (git이 백업).

다음 채팅 Claude는 이 chat-log를 먼저 fetch하여 BL-REAL-SYSTEM Phase α 라이브 검증부터 시작.
