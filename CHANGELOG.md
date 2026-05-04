# TW B2B — CHANGELOG

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 단일 진실 소스: `tasks.json` (v2.0)
> 마지막 갱신: 2026-05-04

---

## 2026-05-04 — [BL-PAGE-DEDUP] admin-hub/tasks/status 정보 중복 제거 — "하나에서 전체 관리" 헌법 지시 충족

### 변경 사유
대표님 핵심 지시: **"하나에서 전체를 관리할 수 있어야 한다"** — admin-status가 통합 관리의 단일 진입점이 되도록 hub/tasks의 중복 정보(P0/통계/진행률) 흡수 제거.

### 변경 파일
- `admin-hub.html` — 285줄 → 196줄 (P0 배너/헌법 빠른 참조/최근 활동 섹션 통째 제거, admin-status CTA 카드 + 4 카테고리 카드 + 푸터 헌법 링크 1줄만 유지)
- `admin-tasks.html` — 1468줄 → 1400줄 (대시보드 탭/패널/`renderDashboard()` 통째 제거, 상단 통합 CTA 바 추가, `?id=` 쿼리 진입 시 `openModal()` 자동 호출 `handleQueryStringId()` 추가)
- `admin-status.html` — 934줄 → 1162줄 (6 메뉴 카드 다음 / 결정 대기 앞에 "📊 임박 작업 · 카테고리별 진행률 · KPI 4종" 통합 섹션 추가, `tasks.json` 직접 fetch + `loadIntegratedTasks()` + `renderIntegratedKPI/Urgent/Progress()` 신규)
- `tasks.json` — `BL-PAGE-DEDUP` task done 추가 (P0/infrastructure/medium), stats 재계산
- `_backup_20260504/` — 3개 페이지 변경 전 백업

### 자가 검증 결과 (Playwright + Node JS 문법 검증)
- admin-hub: CTA 존재 ✅ / 4 카테고리 카드 ✅ / P0 배너 제거 ✅ / 헌법 빠른 참조 제거 ✅ / 최근 활동 제거 ✅ / 푸터 헌법 링크 ✅
- admin-tasks: 대시보드 탭 제거 ✅ / list 탭 active ✅ / 통합 CTA 바 ✅ / `#panel-dashboard` 제거 ✅ / `?id=BL-CATEGORY-REMAP` 진입 → 모달 active ✅
- admin-status: 통합 섹션 ✅ / KPI 4종 정상 로딩 (D+1, 56%, 17, 10) ✅ / 임박 카드 6장 ✅ / 카테고리 진행률 11종 ✅ / 콘솔 에러 0건 ✅

### 헌법 자가 검증 PASS
- 1조 (대표님 결정만): 시스템 자율 실행 ✅
- 6조 (사람용+AI용 이중): 3-Layer summary/display/full 분리 유지 ✅
- 부칙 5 (D-010 단일 진실 매핑): admin-tasks = Category 2 단일 진실 위치 유지, admin-status는 흡수 시각화 ✅
- D-011 (3-State 권한 🤖/👥/👤): 그대로 유지 ✅

---

## 2026-05-02 (25차) — [UX통일/리팩터] 일자별 인라인 호텔 클릭 → 호텔 엔딩 페이지 흐름 통일

### 변경 파일
- `admin.html`
- `hotel-info.html`
- `_backup_20260502/admin.html`

---

## 2026-05-02 (24차) — [UX개선/핫픽스] 예약 패턴 캘린더 토글 + 일자별 인라인 드릴다운

### 변경 파일
- `admin.html`

---

## 2026-05-02 (23차) — [핫픽스] 예약 패턴 탭 드릴다운 에러 수정 (null.id)

### 변경 파일
- `admin.html`

---

## 2026-05-02 (22차) — [핫픽스] Analytics 탭 인터랙션 복구 — IIFE 스코프 브리지

### 변경 파일
- `admin.html`
- `booking-analytics.html`

---

## 2026-05-02 (21차) — [디자인시스템] v2 Aurora — admin.html Phase 1 (글로벌 레이아웃 + 사이드바 + Topbar + Dashboard + 모달 공통 톤)

### 변경 파일
- `admin.html`
- `dashboard.html`
- `hotel-info.html`

---

## 2026-05-01 (20차) — [디자인시스템] v2 Aurora — booking-analytics.html 마이그레이션

### 변경 파일
- `booking-analytics.html`
- `_backup_20260501/booking-analytics.html`

**Commit**: `20260501`

---

## 2026-05-01 (19차) — [디자인시스템] v2 Aurora — hotel-info.html 마이그레이션

### 변경 파일
- `hotel-info.html`
- `_backup_20260501/hotel-info.html`

**Commit**: `20260501`

---

## 2026-05-01 (18차) — [디자인시스템] v2 Aurora — sales / marketing 페이지 마이그레이션

### 변경 파일
- `sales.html`
- `marketing.html`
- `_backup_20260501/sales.html`
- `_backup_20260501/marketing.html`

**Commit**: `20260501`

---

## 2026-05-01 (18-hotfix) — [] sales / marketing T.client → T.sb 핫픽스

### 변경 파일
- `sales.html`
- `marketing.html`
- `index.html`

---

## 2026-05-01 (16차) — [디자인시스템] v2 Aurora — 매니저 페이지 2종 마이그레이션 (dashboard / settings)

### 변경 파일
- `dashboard.html`
- `settings.html`
- `shared.js`

---

## 2026-05-01 (15차) — [디자인시스템] v2 Aurora 마이그레이션 — 인증 페이지 4종 일괄 적용 (signup/forgot/reset/verify)

### 변경 파일
- `signup.html`
- `forgot-password.html`
- `reset-password.html`
- `verify-email.html`

---

## 2026-05-01 (14차) — [디자인시스템] shared.css v2 — C3 Aurora Trendy 마이그레이션 시작 (login.html 시범 적용)

### 변경 파일
- `mock/concept-c1.html`
- `mock/concept-c2.html`
- `mock/concept-c3.html`
- `mock/concept-c4.html`
- `mock/README.md`
- `shared.css`
- `login.html`

**Commit**: `20260501`

---

## 2026-04-30 (13차) — [문서] api/_lib 디렉토리 정책 문서화 (Vercel 12-Function 회피 이중 안전망)

### 변경 파일
- `api/_lib/README.md`
- `api/admin.js`

**Commit**: `4fb3860`

---

## 2026-04-30 (12차) — [기능추가] Agoda 업로드 — 서버사이드 booking-upload 모드 + Preview + CID 컬럼명 오버라이드

### 변경 파일
- `admin.html`

---

## 2026-04-30 (11차) — [버그수정] Admin Hotels 매니저 정보 auth.users JOIN 보강 + list-users API 안전성

### 변경 파일
- `api/admin.js`
- `admin.html`

**Commit**: `d301ee9`

---

## 2026-04-30 (10차) — [기능추가] Project Status — 자율성 분류 + 예상 시간 배지

### 변경 파일
- `admin.html`

---

## 2026-04-30 (9차) — [기능추가] Project Status — 클립보드 복사 버튼 (개별 + 전체)

### 변경 파일
- `admin.html`

---

## 2026-04-29 (8차) — [기능추가] admin.html 사이드바에 Project Status 메뉴 신설 (사업 진행도 실시간 대시보드)

### 변경 파일
- `admin.html`

---

## 2026-04-29 (7차) — [P0 버그수정] admin.html Agoda Matching 모달 클릭 안 되던 버그 수정

### 변경 파일
- `admin.html`

**Commit**: `ffa29383`

---

## 2026-04-29 (6차) — [리팩토링] api/admin.js 통합 라우터 — Vercel 12-function 한도 회피 (Function 카운트 12 → 9)

### 변경 파일
- `api/admin.js`
- `api/admin-booking-upload.js`
- `api/admin-list-users.js`
- `api/admin-send-agoda-invite.js`
- `api/admin-update-match.js`
- `admin.html`
- `paypal.js`

**Commit**: `20260429`

---

## 2026-04-29 (5차) — [기능추가] Page Gallery 매니저/어드민 자동 캡처 (Issue #4 부분 해결)

### 변경 파일
- `admin-gallery.html`

---

## 2026-04-29 (4차) — [UX개선] Business Docs 사이드바 강화 + Page Gallery iframe 한계 안내

### 변경 파일
- `admin-business.html`
- `admin-gallery.html`
- `BACKLOG.md`

---

## 2026-05-03 (3-A-2) — [헌법8조-통합관리] [Phase 3-A-2] 자동 동기화 엔진 구축 (sync_engine + GitHub Actions)

### 변경 파일
- `scripts/sync_engine.py`
- `.github/workflows/sync.yml`
- `BACKLOG.md`
- `CHANGELOG.md`
- `SOLO_WORK_QUEUE.md`
- `DECISIONS.md`
- `scripts/pages-meta.mjs`
- `.gitignore`

**요약**: tasks.json (단일 진실) → 3개 동기화 대상: ① BACKLOG/CHANGELOG/SOLO_WORK_QUEUE (legacy 통합) ② DECISIONS.md (human owner 작업 자동 섹션) ③ pages-meta.mjs PAGE_TASK_META (admin-gallery 메타). GitHub Actions가 main 브랜치 tasks.json push 감지 시 자동 실행, 봇 commit으로 동기화 결과 자동 push. 검증/롤백 자동화 포함.

---

## 2026-04-29 (3차) — [버그수정] `$` 헬퍼 자체를 null-safe로 영구 보강 (P0 종결)

### 변경 파일
- `admin.html`

**Commit**: `a63b30f`

---

## 2026-05-03 (Charter-v2) — [헌법부칙5-실제반영] [카테고리 리매핑] 헌법 부칙 5 D-010 매핑 표를 코드에 반영 (6단계)

### 변경 파일
- `admin-business.html`
- `admin-tasks.html`
- `admin-hub.html`
- `js/stats.js`
- `OPERATIONS_CHARTER.md`

**Commit**: `60908ae`

**요약**: 6단계 sub-task: ①admin-business에서 BACKLOG 제거 + JOURNEY/DECISIONS_INDEX 추가, ②admin-tasks에 ECHO_LOG/SOLO_WORK_QUEUE 추가, ③admin-hub 통계 제거 4카드 단순화, ④/js/stats.js 단일 모듈 신설, ⑤헌법 부칙 5 매핑 표 자가 검증 스크립트, ⑥commit + push + 라이브 검증.

---

## 2026-05-04 (Charter-v2) — [헌법부칙5-본체] [중앙관리시스템] 4 카테고리 통합 진입점 + Service Ops 신설 (헌법 부칙 5 본체)

### 변경 파일
- `admin-hub.html`
- `admin-service-ops.html`
- `admin.html`
- `OPERATIONS_CHARTER.md`

**Commit**: `d9faa7e+60908ae`

**요약**: 1단계: 골격(이번 채팅). 2단계: 자동 동기화 강화. 3단계: Aurora 디자인 통일. [2026-05-03 09:30 보강] D-010 결정에 따라 BL-CATEGORY-REMAP이 본 작업의 후속 정리를 담당.

---

## 2026-04-29 (2차) — [버그수정] Agoda Matching 모달 핸들러 null-safe 처리 (P0 추가)

### 변경 파일
- `admin.html`

---

## 2026-04-29 (1차) — [버그수정] Admin Hotels 상세 패널 매니저 정보 누락 + 모달 X 버튼 미동작 (P0)

### 변경 파일
- `admin.html`
- `hotel-info.html`

---

