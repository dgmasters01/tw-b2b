# TW B2B — CHANGELOG

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 단일 진실 소스: `tasks.json` (v2.0)
> 마지막 갱신: 2026-05-03

---

## 2026-05-03 (26차) — [헌법변경] Charter v2 통합 — 부칙 5·6 신설 + 통찰 7개 영구 보존

### 변경사유
6시간 집중 대화에서 도출된 사업 모델 핵심 결정들의 영구 보존. 헌법 4조(전수 추적) + 6조(AI 가독성) 강화.

### 변경 파일
- `OPERATIONS_CHARTER.md` — 부칙 5(4 시스템 카테고리) + 부칙 6(UX 우선) 신설, 6조 본체에 이중 형식 의무 보강
- `BUSINESS.md` — 15-A 신설 (통찰 7개)
- `DECISIONS.md` — 2026-05-03 Charter v2 섹션 신규 (D-004 ~ D-009 6개 결정)
- `DECISIONS_INDEX.md` — **신설** (AI용 인덱스, 헌법 6조 본체)
- `JOURNEY.md` — **신설** (매니저 8단계 여정)
- `ECHO_LOG.md` — **신설** (대화 즉시 기록 시스템)
- `tasks.json` — 신규 6개 작업 등록 (BL-AURORA-MIGRATION / BL-MANAGER-DASH-001 / BL-TRACK-001 / BL-INVOICE-001 / BL-JOURNEY-DOC / BL-DECISIONS-INDEX)

### 신규 결정 ID
- D-004: 4 시스템 카테고리
- D-005: UX/UI 통일 우선
- D-006: YouTube 더보기 단축 URL 클릭 카운트 ⭐⭐⭐ 사업 핵심 부품
- D-007: 매니저 대시보드 한 화면 7영역
- D-008: 조회수 보조 지표화
- D-009: 인보이스/영수증 영구 다운로드

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

## 2026-04-29 (2차) — [버그수정] Agoda Matching 모달 핸들러 null-safe 처리 (P0 추가)

### 변경 파일
- `admin.html`

---

## 2026-04-29 (1차) — [버그수정] Admin Hotels 상세 패널 매니저 정보 누락 + 모달 X 버튼 미동작 (P0)

### 변경 파일
- `admin.html`
- `hotel-info.html`

---

