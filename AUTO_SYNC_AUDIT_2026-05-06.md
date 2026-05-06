# admin-status.html 자동 동기화 누락 전수 점검 리포트

**작성일**: 2026-05-06
**작업**: BL-OS-AUTO-SYNC-CHARTER 단계 3
**대상 파일**: `_admin/admin-status.html` (5,121 lines)

---

## 1. 폴링 시스템 인벤토리

| Polling | 위치 | 간격 | fetch URL | 갱신 함수 |
|---|---|---|---|---|
| `POLL.timer` (메인) | L4616 | `POLL.intervalMs` (5초 추정) | `/tasks.json`, `/activity-feed.display.json`, `/admin-status.html` (build hash) | renderIntegratedKPI/Urgent/Progress, AutoQueue, NextAction, InProgressBox, Avg, SidebarMenus, TopUrgent, CeoWait, renderActivity, checkAutoReload |
| `pollTimer` (Command Center) | L5098 | `POLL_MS` (5초) | `/tasks.json` | renderStaffQueue |

→ 두 폴링 시스템 동시 가동. tasks.json은 5초마다 두 번 fetch (중복 가능성 있으나 본 점검 범위 외).

---

## 2. 1회성 fetch (자동 동기화 누락 후보)

| # | 함수 | 라인 | URL | 트리거 | 자동 갱신? |
|---|---|---|---|---|---|
| F1 | `loadAndRender` | 1885 | `/pages-status.display.json` | 페이지 로드 시 1회 | ❌ |
| F2 | `loadActivity` | 2260 | `/activity-feed.display.json` | 페이지 로드 시 1회 | ⚠️ pollTick이 같은 URL 폴링 → renderActivity 호출 → 사실상 자동 갱신 |
| F3 | `loadIntegratedTasks` | 2487 | `/tasks.json` | 페이지 로드 시 1회 | ⚠️ pollTick이 같은 URL 폴링 → 같은 렌더 함수들 호출 → 자동 갱신 |
| F4 | `openCeoDecisionModal` | 2821 | `/tasks.json` | 사용자 모달 오픈 | N/A (액션 트리거 OK) |
| F5 | `renderInProgressCommits` | 3473 | `/activity-feed.display.json` | 부모 함수 호출 시 | ❌ pollTick에서 호출 안 됨 |
| F6 | `buildHandoffMessage` | 3692,3820,3862 | tasks/chat-logs/GH commits | 사용자 인계서 빌드 | N/A (액션 트리거 OK) |
| F7 | `loadHumanTab` | 4004 | `/chat-logs/index.json` | 챗 로그 탭 진입 시 1회 | ❌ |
| F8 | `loadAITab` | 4280,4286 | ECHO_LOG.md, DECISIONS.md | AI 탭 진입 시 1회 | ❌ |

---

## 3. 본질적 누락 (분리 backlog 필요)

### 🔴 [HIGH] BL-SYNC-PAGES-STATUS — pages-status.display.json 폴링 누락
- **현황**: 페이지 로드 시 1회만 fetch. GitHub Actions가 갱신해도 화면 안 바뀜.
- **영향**: 5개 카테고리 페이지 카드 (admin-status 메인 영역)가 stale 상태.
- **수정**: pollTick에 pages-status.display.json fetch + loadAndRender 재호출 추가.

### 🟡 [MEDIUM] BL-SYNC-INPROGRESS-COMMITS — In-Progress 박스 commit 자동 갱신 누락
- **현황**: pollTick이 activity-feed를 fetch하지만 `renderInProgressCommits`는 호출 안 함.
- **영향**: In-Progress 작업의 최신 commit이 박스에 자동 안 뜸.
- **수정**: pollTick의 activity-feed 변경 감지 블록에 `renderInProgressCommits()` 호출 한 줄 추가.

### 🟢 [LOW] BL-SYNC-CHAT-LOGS-TAB — 챗 로그 / AI 탭 자동 갱신 누락
- **현황**: 탭 진입 시 1회만 fetch. 새 챗 로그 들어와도 자동 표시 안 됨.
- **영향**: 사용자가 탭 다시 클릭하면 갱신됨. 그림 일치 원칙은 위반이나 사용자 액션이 회복 가능.
- **수정**: 탭 활성 상태에서만 폴링 추가 (조건부 폴링), 또는 챗 로그 인덱스 폴링을 pollTick에 추가.

---

## 4. 결론

- **자동 갱신 정상**: tasks.json 기반 영역 (KPI/Urgent/Progress/AutoQueue/NextAction/InProgressBox/Avg/Sidebar/TopUrgent/CeoWait/StaffQueue), activity-feed → renderActivity, 자기 빌드 hash → reload
- **누락 3건 확정**: pages-status.display.json (F1), renderInProgressCommits (F5), chat-logs/AI 탭 (F7,F8)
- **단계 4에서 backlog 3건 등록**: BL-SYNC-PAGES-STATUS / BL-SYNC-INPROGRESS-COMMITS / BL-SYNC-CHAT-LOGS-TAB
