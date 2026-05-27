# 📖 TW B2B 시스템 매뉴얼 (service-map)

> **자동 생성 — 직접 편집 금지** (`.github/workflows/system-manual-rebuild.yml`이 push마다 재생성)
> **생성 시각:** 2026-05-27T01:21:25.155Z
> **포맷 (헌법 12대 원칙 6번 — AI 가독성):** 사람용 표/설명 + AI용 YAML 블록

---

## 🎯 이 매뉴얼이 뭐냐면

새 채팅 클로드가 **30초 안에** TW B2B 시스템 전체 구조를 파악할 수 있도록 박은 단일 진실 지도.

5개 데이터 소스(`pages-meta.mjs` / `.github/workflows/` / `_os/manifest.json` / `OPERATIONS_CHARTER.md` / `_os/boot.md`)에서 자동 추출되어 **항상 라이브 상태**.

---

## 🗺️ 섹션 1 — 전체 지도 (페이지)


### 🌐 공개 (로그인 불필요) (6개)

| 페이지 | 역할 | 상태 |
|---|---|---|
| `/index.html` | 메인 랜딩 | ✅ live |
| `/signup.html` | 회원가입 | ✅ live |
| `/login.html` | 로그인 | ✅ live |
| `/forgot-password.html` | 비밀번호 찾기 | ✅ live |
| `/reset-password.html` | 비밀번호 재설정 | ✅ live |
| `/verify-email.html` | 이메일 인증 | ✅ live |

### ⚙️ 관리자 (9개)

| 페이지 | 역할 | 상태 |
|---|---|---|
| `/admin.html` | 관리자 콘솔 | ✅ live |
| `/booking-analytics.html` | 예약 분석 | ✅ live |
| `/admin-gallery.html` | 페이지 갤러리 | ✅ live |
| `/admin-business.html` | 비즈니스 문서 뷰어 (Business Docs) | ✅ live |
| `/admin-hub.html` | 중앙 관리 진입점 (폐기) | 🗑️ retired |
| `/admin-tasks.html` | 작업 관리 (Task Management) | ✅ live |
| `/admin-service-ops.html` | 운영 매뉴얼 (Service Operations) | ✅ live |
| `/admin-status.html` | 시스템 완성도 (System Status) | ✅ live |
| `/_admin/admin-settings.html` | 인보이스 설정 (Invoice Settings) | 🟡 partial |


```yaml
section: map
pages_total: 21
groups:
  public:
    - { path: "/index.html", status: "live", name: "메인 랜딩" }
    - { path: "/signup.html", status: "live", name: "회원가입" }
    - { path: "/login.html", status: "live", name: "로그인" }
    - { path: "/forgot-password.html", status: "live", name: "비밀번호 찾기" }
    - { path: "/reset-password.html", status: "live", name: "비밀번호 재설정" }
    - { path: "/verify-email.html", status: "live", name: "이메일 인증" }
  admin:
    - { path: "/admin.html", status: "live", name: "관리자 콘솔" }
    - { path: "/booking-analytics.html", status: "live", name: "예약 분석" }
    - { path: "/admin-gallery.html", status: "live", name: "페이지 갤러리" }
    - { path: "/admin-business.html", status: "live", name: "비즈니스 문서 뷰어 (Business Docs)" }
    - { path: "/admin-hub.html", status: "retired", name: "중앙 관리 진입점 (폐기)" }
    - { path: "/admin-tasks.html", status: "live", name: "작업 관리 (Task Management)" }
    - { path: "/admin-service-ops.html", status: "live", name: "운영 매뉴얼 (Service Operations)" }
    - { path: "/admin-status.html", status: "live", name: "시스템 완성도 (System Status)" }
    - { path: "/_admin/admin-settings.html", status: "partial", name: "인보이스 설정 (Invoice Settings)" }
```


---

## 🤖 섹션 2 — 봇 카탈로그


총 **22개** 봇이 자동 실행 중.

| 봇 | 트리거 | 하는 일 |
|---|---|---|
| `auto-detect-task-status.yml` | push/수동 | commit message 자동 감지 → tasks.json status 자동 갱신 |
| `auto-task-from-health.yml` | push/cron/수동 | 자동 작업 등록 봇 (auto-task-from-health) |
| `build-activity-feed.yml` | push/cron/수동 | activity-feed 자동 갱신 워크플로 (BL-OS-PHASE-1A 단계 5) |
| `capture-pages.yml` | push/cron/수동 | 페이지 자동 캡처 봇 (BL-015 / D-028) |
| `charter-length-bot.yml` | push/수동/PR | Charter Length Bot — 헌법 길이 자동 감시 |
| `chat-log-index.yml` | push/cron/수동 | chat-log 인덱스 자동 갱신 워크플로 |
| `chatlog-format-check.yml` | push/cron/수동 | chat-log 5블록 표준 검증 워크플로 (D-036) |
| `decision-tracking-bot.yml` | push/수동 | ? |
| `health-autoheal-on-push.yml` | push/수동 | Health 자가 치유 워크플로 (BL-HEALTH-AUTOHEAL) |
| `health-check-admin.yml` | push/cron/수동 | Phase 0 Health Check Bot |
| `invoice-expire-cron.yml` | cron/수동 | 인보이스 입금 기한 자동 만료 cron (BL-INVOICE-001 단계 8) |
| `invoice-retention-cron.yml` | cron/수동 | 인보이스 보관 상태 감시 cron (BL-INVOICE-001 단계 11) |
| `manager-campaign-cron.yml` | cron/수동 | 매니저 자동 캠페인 cron (BL-MANAGER-AUTO-CAMPAIGN) |
| `ops-mail-on-task-done.yml` | push/수동 | 작업 완료 시 ops 메일 자동 발송 봇 |
| `page-status-scan.yml` | push/cron/수동 | 페이지 완성도 자동 스캔 워크플로 |
| `receipt-overdue-cron.yml` | cron/수동 | ? |
| `step-self-verify.yml` | push/수동 | step 자가 검증 봇 (Step Self-Verify Bot) |
| `sync.yml` | push/수동 | tasks.json 자동 동기화 워크플로 (Phase 3-A-2) |
| `system-manual-rebuild.yml` | push/수동 | 시스템 매뉴얼 자동 재생성 봇 (BL-SYSTEM-MANUAL-AUTOGEN) |
| `token-expiry-cron.yml` | push/cron/수동 | 토큰 만료 자동 체크 cron (SQ-H, D-017) |
| `verification-gap-bot.yml` | push/cron/수동 | ? |
| `zombie-cleanup-bot.yml` | cron/수동 | 미인증 좀비 가입자 자동 청소봇 |


```yaml
section: bots
bots_total: 22
bots:
  - { file: "auto-detect-task-status.yml", trigger: ["push", "수동"], role: "commit message 자동 감지 → tasks.json status 자동 갱신" }
  - { file: "auto-task-from-health.yml", trigger: ["push", "cron", "수동"], role: "자동 작업 등록 봇 (auto-task-from-health)" }
  - { file: "build-activity-feed.yml", trigger: ["push", "cron", "수동"], role: "activity-feed 자동 갱신 워크플로 (BL-OS-PHASE-1A 단계 5)" }
  - { file: "capture-pages.yml", trigger: ["push", "cron", "수동"], role: "페이지 자동 캡처 봇 (BL-015 / D-028)" }
  - { file: "charter-length-bot.yml", trigger: ["push", "수동", "PR"], role: "Charter Length Bot — 헌법 길이 자동 감시" }
  - { file: "chat-log-index.yml", trigger: ["push", "cron", "수동"], role: "chat-log 인덱스 자동 갱신 워크플로" }
  - { file: "chatlog-format-check.yml", trigger: ["push", "cron", "수동"], role: "chat-log 5블록 표준 검증 워크플로 (D-036)" }
  - { file: "decision-tracking-bot.yml", trigger: ["push", "수동"], role: "?" }
  - { file: "health-autoheal-on-push.yml", trigger: ["push", "수동"], role: "Health 자가 치유 워크플로 (BL-HEALTH-AUTOHEAL)" }
  - { file: "health-check-admin.yml", trigger: ["push", "cron", "수동"], role: "Phase 0 Health Check Bot" }
  - { file: "invoice-expire-cron.yml", trigger: ["cron", "수동"], role: "인보이스 입금 기한 자동 만료 cron (BL-INVOICE-001 단계 8)" }
  - { file: "invoice-retention-cron.yml", trigger: ["cron", "수동"], role: "인보이스 보관 상태 감시 cron (BL-INVOICE-001 단계 11)" }
  - { file: "manager-campaign-cron.yml", trigger: ["cron", "수동"], role: "매니저 자동 캠페인 cron (BL-MANAGER-AUTO-CAMPAIGN)" }
  - { file: "ops-mail-on-task-done.yml", trigger: ["push", "수동"], role: "작업 완료 시 ops 메일 자동 발송 봇" }
  - { file: "page-status-scan.yml", trigger: ["push", "cron", "수동"], role: "페이지 완성도 자동 스캔 워크플로" }
  - { file: "receipt-overdue-cron.yml", trigger: ["cron", "수동"], role: "?" }
  - { file: "step-self-verify.yml", trigger: ["push", "수동"], role: "step 자가 검증 봇 (Step Self-Verify Bot)" }
  - { file: "sync.yml", trigger: ["push", "수동"], role: "tasks.json 자동 동기화 워크플로 (Phase 3-A-2)" }
  - { file: "system-manual-rebuild.yml", trigger: ["push", "수동"], role: "시스템 매뉴얼 자동 재생성 봇 (BL-SYSTEM-MANUAL-AUTOGEN)" }
  - { file: "token-expiry-cron.yml", trigger: ["push", "cron", "수동"], role: "토큰 만료 자동 체크 cron (SQ-H, D-017)" }
  - { file: "verification-gap-bot.yml", trigger: ["push", "cron", "수동"], role: "?" }
  - { file: "zombie-cleanup-bot.yml", trigger: ["cron", "수동"], role: "미인증 좀비 가입자 자동 청소봇" }
```


---

## 🔄 섹션 3 — 데이터 흐름


**핵심 데이터 파일 5개와 흐름:**

```
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
```

**3-Layer 파일 분리 원칙 (D-012):**

| 파일 | 크기 한도 | 용도 |
|---|---|---|
| `*.summary.json` | 5KB 이하 | 클로드용 (토큰 절약) |
| `*.display.json` | 50KB 이하 | UI 렌더링용 |
| `*.full.json` | 무제한 | 백업·분석용 |


```yaml
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
```


---

## 🚦 섹션 4 — 자동화 게이트 (헌법 부칙)


**헌법 부칙 20개가 자동 게이트로 작동 중:**

| # | 게이트 | 위반 시 |
|---|---|---|
| 부칙 7 | 단계 단위 commit + step 태그 의무 | CI 실패 또는 "헌법 확인" 정지 |
| 부칙 8 | 자동 동기화 완성도 | CI 실패 또는 "헌법 확인" 정지 |
| 부칙 11 | 자동 stats 재계산 의무 | CI 실패 또는 "헌법 확인" 정지 |
| 부칙 14 | 헌법 길이 200줄 이하 강제 (BL-OS-LIGHTWEIGHT, 2026-05-07 신설) | CI 실패 또는 "헌법 확인" 정지 |
| 부칙 15 | chat-log 박기 의무 (BL-CHATLOG-AUTO-GATE, 2026-05-08 신설) | CI 실패 또는 "헌법 확인" 정지 |
| 부칙 16 | 클로드 행동 강제 게이트 (BL-CLAUDE-DISCIPLINE, 2026-05-10 신설 / D-049 2 | CI 실패 또는 "헌법 확인" 정지 |
| 부칙 18 | 질문·선택지 사업가 언어 강제 + 갤러리 우선 점검 (BL-CLAUDE-PLAIN-LANG, 2026-05- | CI 실패 또는 "헌법 확인" 정지 |
| 부칙 19 | 전체 갱신 원칙 (BL-FULL-REFRESH-UNIFY, 2026-05-23 신설) | CI 실패 또는 "헌법 확인" 정지 |

_전체 20개 부칙은 `OPERATIONS_CHARTER.md` 참조._


```yaml
section: gates
gates:
  - { n: 1, title: "" }
  - { n: 2, title: "" }
  - { n: 3, title: "" }
  - { n: 4, title: "권한 부여 vs 권한 활용" }
  - { n: 5, title: "4 시스템 카테고리" }
  - { n: 6, title: "UX/UI 통일 우선, 콘텐츠 디테일 나중" }
  - { n: 7, title: "단계 단위 commit + step 태그 의무" }
  - { n: 8, title: "자동 동기화 완성도" }
  - { n: 9, title: "OS 본체 ↔ 사업 코드 분리" }
  - { n: 10, title: "위치 의존성 금지" }
  - { n: 11, title: "자동 stats 재계산 의무" }
  - { n: 12, title: "작업 소요 선보고" }
  - { n: 13, title: "채팅 라우팅 자율 판단" }
  - { n: 14, title: "헌법 길이 200줄 이하 강제 (BL-OS-LIGHTWEIGHT, 2026-05-07 신설)" }
  - { n: 15, title: "chat-log 박기 의무 (BL-CHATLOG-AUTO-GATE, 2026-05-08 신설)" }
  - { n: 16, title: "클로드 행동 강제 게이트 (BL-CLAUDE-DISCIPLINE, 2026-05-10 신설 / D-049 2026-05-26 보강)" }
  - { n: 17, title: "신규 BL 컨텍스트 + 신규 페이지 보고 의무 (BL-DECISION-CTX-MASS-FILL, 2026-05-12 신설)" }
  - { n: 18, title: "질문·선택지 사업가 언어 강제 + 갤러리 우선 점검 (BL-CLAUDE-PLAIN-LANG, 2026-05-21 신설)" }
  - { n: 19, title: "전체 갱신 원칙 (BL-FULL-REFRESH-UNIFY, 2026-05-23 신설)" }
  - { n: 20, title: "사업 합의 추적 게이트 (BL-DECISION-TRACKING, 2026-05-25 신설)" }
```


---

## 📋 섹션 5 — 새 클로드 부팅 절차


**새 채팅 클로드는 작업 시작 전 이 순서로 fetch:**

```
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
```

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


```yaml
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
```


---

**이 매뉴얼은 `.github/workflows/system-manual-rebuild.yml` 봇이 push마다 자동 재생성.** 수동 편집 시 다음 push에서 덮어쓰임.
