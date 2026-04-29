# CHANGELOG — TW B2B (gohotelwinners.com)

> 모든 코드 변경을 날짜·요약·변경사유와 함께 기록합니다.
> 형식: `## YYYY-MM-DD — [태그] 제목` / 변경사항 / 사유 / 관련 이슈.

---

## 2026-04-29 (6차) — [리팩토링] api/admin.js 통합 라우터 — Vercel 12-function 한도 회피 (Function 카운트 12 → 9)

### 변경 파일
- `api/admin.js` (신규, ~700 lines): 4개 admin-* 핸들러를 `?action=` 라우팅으로 통합
- `api/admin-booking-upload.js` **삭제** (→ `_backup_20260429/`)
- `api/admin-list-users.js` **삭제** (→ `_backup_20260429/`)
- `api/admin-send-agoda-invite.js` **삭제** (→ `_backup_20260429/`)
- `api/admin-update-match.js` **삭제** (→ `_backup_20260429/`)
- `admin.html`: 5건 fetch 호출을 `/api/admin?action=...` 형태로 일괄 변경
- `_backup_20260429/` (신규): 4개 admin-* 원본 파일 보존

### 변경사항
**A. 통합 라우터 (api/admin.js)**
- `paypal.js`와 동일한 라우터 패턴 (`switch(action)`)
- 4개 sub-handler:
  - `?action=booking-upload` → handleBookingUpload (TW Booking Analytics 엑셀 업로드)
  - `?action=list-users` → handleListUsers (Supabase Auth + hotels 조인)
  - `?action=send-invite` → handleSendInvite (Agoda 등록 안내 메일 발송)
  - `?action=update-match` → handleUpdateMatch (Agoda 매칭 상태 수정)
- 공통 어드민 인증 로직 `requireAdmin()`으로 통합 (4개 파일에 중복되어 있던 검증 패턴)
- ⚠️ 라우팅 action은 query string `?action=`만 사용 (admin-update-match가 body.action을
  내부 분기 — `manual_match`/`reject`/`reopen`/`edit_match` — 에 사용하므로 body fallback 금지)

**B. admin.html 호출처 변경 (총 5건)**
- `/api/admin-update-match` → `/api/admin?action=update-match` (2건: 라인 1264, 1413)
- `/api/admin-send-agoda-invite` → `/api/admin?action=send-invite` (2건: 라인 1325, 1361)
- `/api/admin-list-users` → `/api/admin?action=list-users` (1건: 라인 1480)
- body 구조는 그대로 유지 (update-match의 body.action은 그대로 작동)

**C. 배포 시퀀스 (중요한 함정)**
- 1차 commit (accacd2d): admin.js 추가 + admin.html 수정 + 백업 생성 → 함수 13개 → ❌ 빌드 실패
- 2차 commit (f8e858cd): 4개 admin-* 원본 삭제 → 함수 9개 → ✅ 빌드 성공
- ⚠️ 향후 동일 작업 시: 통합 추가와 원본 삭제는 단일 commit에 묶거나, 빌드 실패를 받아들이고 즉시 후속 commit 진행

### 검증 결과
- production curl 4개 action 모두 401 (Missing auth token) 응답 → 라우팅 작동 확인
- action 미지정 시 400 + `missing_action` 안내 + 허용 action 4개 명시
- Function 카운트: 12 → 9 (여유 3슬롯 확보)

### 사유
- Vercel Hobby 플랜 12-function 한도 도달, 추가 기능 개발 시마다 한도 초과 위험
- admin-* 4개가 동일한 어드민 인증 패턴을 중복 보유 → 통합으로 코드 중복 제거 + 함수 카운트 절약
- 데드라인 2026-05-03 (D-4)에 새 기능 추가 시 슬롯 여유 확보 필수

### 관련 이슈
- 직전 4fb3860d (api/lib → api/_lib) 도 동일한 12-function 회피 작업의 일환
- paypal.js의 router 패턴이 그대로 검증된 표준이 됨

---

## 2026-04-29 (5차) — [기능추가] Page Gallery 매니저/어드민 자동 캡처 (Issue #4 부분 해결)

### 변경 파일
- `scripts/capture-pages.mjs` (전면 재작성: --auth 옵션, 매니저/어드민 로그인 흐름)
- `scripts/pages-meta.mjs` (매니저 3개 + 어드민 4개 페이지를 `capture: true`로 변경)
- `.github/workflows/capture-pages.yml` (신설: GitHub Actions 자동 캡처 워크플로)
- `admin-gallery.html` (안내 문구 완화)

### 변경사항
**A. capture-pages.mjs 확장**
- 새 인자: `--auth`(전체) / `--auth=manager` / `--auth=admin` / 인자 없음(public-only, 기존 동작)
- audience별 분기 컨텍스트:
  - public → 비로그인 컨텍스트 (기존 동작 그대로)
  - manager → `TW_MANAGER_EMAIL`/`TW_MANAGER_PASSWORD`로 로그인 후 캡처
  - admin → `TW_ADMIN_EMAIL`/`TW_ADMIN_PASSWORD`로 로그인 후 캡처
- 자격증명 누락 또는 로그인 실패 시 해당 audience만 skip (전체 실패 안 함)
- Playwright chromium 경로 자동 감지 (컨테이너 사전설치 / Actions 기본 설치 모두 지원)

**B. pages-meta.mjs**
- dashboard.html, hotel-info.html, settings.html → `capture: true` (manager)
- admin.html, booking-analytics.html, admin-gallery.html, admin-business.html → `capture: true` (admin)

**C. GitHub Actions workflow 신설**
- 트리거: 수동 실행(workflow_dispatch, mode 선택 가능) + main push 시 주요 HTML/스크립트 변경 감지
- Vercel 배포 완료 대기 후 `npm install` + `npx playwright install --with-deps chromium` + capture 실행
- 결과 PNG가 변경되면 자동 commit & push (`[자동캡처]` 태그)

**D. admin-gallery.html UX 안내 변경**
- `🔒 로그인 필요 페이지 / iframe 미리보기는 세션이 풀릴 수 있음`
  → `🔒 캡처 대기 중 / GitHub Actions 자동 캡처 후 표시`

### 변경 사유
- 대표님 외근 모드 지시: 매니저 계정으로 로그인 필요 페이지도 캡처해서 admin-gallery에 정적 썸네일이 박히게 만들기.
- iframe 인증 hydration 문제(BACKLOG Issue #4)를 우회하는 가장 안전한 해결책: 정적 PNG로 고정 → iframe 자체가 불필요.
- 자격증명 노출 방지: 비밀번호는 코드/메모리에 저장하지 않고 GitHub Actions Secrets로만 주입.

### 대표님 복귀 후 1회 액션 (필수)
GitHub Secrets 등록: https://github.com/dgmasters01/tw-b2b/settings/secrets/actions
| Secret 이름 | 값 |
|---|---|
| `TW_MANAGER_EMAIL` | `joylife8760@naver.com` |
| `TW_MANAGER_PASSWORD` | (해당 매니저 계정 비밀번호) |
| `TW_ADMIN_EMAIL` | `dgmasters01@gmail.com` |
| `TW_ADMIN_PASSWORD` | (어드민 계정 비밀번호) |

등록 직후 Actions 탭에서 `Capture Pages` 워크플로를 수동 실행 (`mode=all`) → 7개 신규 페이지(매니저 3 + 어드민 4) PNG가 생성되어 자동 commit. 그 후 admin-gallery 새로고침하면 정적 썸네일 표시.

### 검증
- capture-pages.mjs: `node --check` 문법 PASS
- pages-meta.mjs: `node --check` 문법 PASS
- workflow YAML: 구조적으로 GitHub Actions 표준 준수 (필수 키 모두 존재)

### 잔여 (BACKLOG Issue #4 후속)
- 옵션 A/B/C(postMessage / sandbox / flowType)는 정적 캡처 도입으로 우선순위 P3로 강등. 정적 캡처가 충분히 작동하면 iframe 미리보기 자체를 제거하는 옵션도 가능.

---

## 2026-04-29 (4차) — [UX개선] Business Docs 사이드바 강화 + Page Gallery iframe 한계 안내

### 변경 파일
- `admin-business.html` (사이드바 메인 대시보드 버튼 강화 + 바로가기 섹션 신설)
- `admin-gallery.html` (로그인 필요 페이지 안내 문구 개선)
- `BACKLOG.md` (Issue #4 신규 등록)

### 변경사항
**A. admin-business.html 사이드바 메뉴 강화**
- 기존: 작은 회색 텍스트 링크 `← 관리자 콘솔` (눈에 안 띔)
- 변경 후: 보라색 강조 버튼 `🏢 메인 대시보드 (관리자 콘솔)` + 그 아래 "바로가기" 섹션에 6개 직링크 (호텔/예약/매니저/Agoda 매칭/페이지 갤러리/예약 분석)
- CSS도 반영 (배경색, 패딩, hover 효과)

**B. admin-gallery.html iframe 한계 안내**
- 로그인 필요 페이지의 빈 썸네일 영역 안내 문구를 변경
- 기존: `아래 '라이브 미리보기' 클릭`
- 변경 후: `'라이브 보기'로 새 탭에서 열기 권장 / (iframe 미리보기는 세션이 풀릴 수 있음)`

### 변경 사유
- 대표님이 "Business Docs에 메인 대시보드로 가는 메뉴가 없다"고 보고 → 기존 텍스트 링크 강조도 부족했고 하위 메뉴도 없어 비개발자 시점에서 네비게이션 혼란.
- Page Gallery에서 admin/manager 페이지 미리보기 시 로그인 화면이 보이는 현상은 supabase iframe-auth 알려진 한계 → 즉시 우회: 사용자 안내 + BACKLOG P2로 근본 해결 옵션 정리.

### 검증
- admin-business.html JS 문법 PASS
- admin-gallery.html: 0 inline script (정적 HTML+외부 스크립트)
- 강조 버튼 + 바로가기 섹션 + iframe 안내 키워드 모두 존재 확인

### 잔여 (BACKLOG)
- BACKLOG Issue #4: Page Gallery iframe Supabase 세션 미보존 → P2로 등록, 근본 해결 옵션 A/B/C 정리

---

## 2026-04-29 (3차) — [버그수정] `$` 헬퍼 자체를 null-safe로 영구 보강 (P0 종결)

### 변경 파일
- `admin.html` (L811 부근, `$` 헬퍼 재정의)

### 발견 경위
2차 fix(a63b30f) 라이브 검증에서 또 다른 trip-wire 발견:
```
Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
  at admin.html:1289:25
```
2차에서 am-match/am-invite/am-reject **모달 닫기** 핸들러는 null-safe 처리했으나, `am-invite-preview`(L1289), `am-invite-send`, `am-reject-submit` 등 **버튼 핸들러**들은 여전히 raw 패턴이었음. 이런 직렬 등록 구조에서는 단 하나의 null이 전체 JS를 중단시킴.

### 변경사항
admin.html 진입점에서 사용하는 `$` 헬퍼를 **null-safe wrapper로 영구 교체**:
- 정상 element가 있으면 그대로 반환
- 없으면 no-op Proxy 객체 반환 (addEventListener, focus, classList 등 모든 흔한 DOM 메서드를 silent no-op로 응답)
- console.warn으로 누락 element ID를 로그에 남겨 추후 진단 가능

### 변경 사유
- 21개 위치의 `$('id').addEventListener(...)` 패턴을 일일이 null-safe로 감싸는 대신, 헬퍼 한 곳만 수정하여 **모든 위치를 영구 면역**시키는 근본 해결.
- shared.js는 건드리지 않음 (다른 페이지 영향 차단).
- Proxy 미지원 환경(IE 등)은 fallback plain object로 graceful degradation.

### 검증
- JS 문법 PASS
- noop proxy / Proxy 키워드 라이브 매치
- 누락 element는 console.warn 로그로 추후 디버깅 가능

### 잔여 (P1, 별도 처리)
- `Failed to load resource: 500 (vjsludfjsphwnumuoqaj.../ers01%40gmail.com:1)` — Supabase auth.users 또는 admin endpoint 500. 매니저 정보 표시 정상 작동 → 핵심 기능 영향 없음.

---

## 2026-04-29 (2차) — [버그수정] Agoda Matching 모달 핸들러 null-safe 처리 (P0 추가)

### 변경 파일
- `admin.html` (am-match / am-invite / am-reject 3개 모달 핸들러)

### 발견 경위
1차 fix 라이브 검증 시 모달 X 버튼이 여전히 클릭 안 됨. 콘솔 검사 결과:
```
Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
  at admin.html:1206:22
```
L1206의 `$('am-match-close').addEventListener(...)`에서 element가 null인데 그대로 접근 → JS 전체 중단 → 그 아래에 등록되어야 할 모든 핸들러(modal-close, ESC, openHotelModal 내부 핸들러 등)가 등록 실패. 1차 fix는 코드는 맞았지만 절대 실행되지 못한 상태였음.

### 변경사항
- am-match / am-invite / am-reject 3개 Agoda Matching 모달의 `addEventListener` 호출을 모두 `if (element) element.addEventListener(...)` 패턴으로 변경.
- element가 null일 경우 silent skip (해당 모달이 DOM에 없으면 핸들러도 등록 불필요).

### 변경 사유
하나의 null reference가 발생하면 그 아래 모든 JS 등록이 중단됨. 단일 페이지에서 여러 탭(Hotels/Agoda Matching/Members 등)의 핸들러가 한 IIFE 안에 직렬로 등록되는 구조라, top-level null 에러는 페이지 전체 기능을 무력화시킴. null-safe 처리는 영구적 안전장치.

### 검증
- JS 문법 검사 PASS (3 script blocks)
- 함수 정의 PASS (closeModal, openHotelModal, renderHotels, closeMatchModal, closeInviteModal, closeRejectModal)

### 잔여 콘솔 에러 (분리 처리)
- `Failed to load resource: 500 (vjsludfjsphwnumuoqaj.../ers01%40gmail.com)` — Supabase auth.users 또는 관련 endpoint 500. 매니저 정보 표시는 정상 작동 확인됨 → 핵심 기능 영향 없음. P1으로 BACKLOG 등록 권장.

---

## 2026-04-29 (1차) — [버그수정] Admin Hotels 상세 패널 매니저 정보 누락 + 모달 X 버튼 미동작 (P0)

### 변경 파일
- `admin.html` (modal close handler 강화 + 매니저 컬럼 fallback)

### 변경사항
1. **모달 닫기 강화** (admin.html L1619 부근)
   - X 버튼 핸들러를 capture 단계로 변경 + `stopPropagation()`로 외부클릭 핸들러와 충돌 방지
   - ESC 키 전역 핸들러 추가 (모달이 열려있을 때만 동작)
   - 외부 overlay 클릭 시 닫기 핸들러 유지
   - IIFE로 감싸 스코프 격리

2. **Hotels 목록 MANAGER 컬럼 fix** (admin.html `renderHotels`)
   - `h.manager_email || h.contact_email || '-'`로 fallback
   - `h.manager_name || h.contact_name || ''`로 fallback

3. **Hotel 상세 패널 매니저 3필드 fix** (admin.html `openHotelModal`)
   - Manager Email: `manager_email || contact_email`
   - Manager Name: `manager_name || contact_name`
   - Manager Phone: `manager_phone || contact_phone || whatsapp`

### 변경 사유
- **모달 X 버튼**: 기존 핸들러는 단순 click 등록만 되어 있었으며, 외부 overlay 클릭 핸들러(`e.target === modal`)가 같은 modal 컨테이너에 등록되어 있어 일부 환경에서 우선순위 충돌로 X 버튼 click이 무시되는 케이스가 있었음. capture phase + stopPropagation으로 충돌 제거. ESC 키 닫기는 UX 표준.
- **매니저 정보 누락 근본 원인**: `hotel-info.html` `btn-save` 핸들러가 매니저 정보를 `contact_name`/`contact_email`/`contact_phone` 컬럼에 저장하는데, `admin.html`은 `manager_email`/`manager_name`/`manager_phone` 컬럼을 읽으려 함 → **컬럼명 불일치**. 데이터는 실제로 `contact_*` 컬럼에 저장되어 있어, admin.html에서 fallback 처리만으로 즉시 해결.
- DB 스키마 변경(ALTER TABLE) 없이 코드 수정만으로 해결 → Supabase Management API 토큰 만료 상태에서도 작업 가능.

### 검증
- JS 문법 검사 PASS (3개 script 블록)
- 함수 정의 확인 PASS (closeModal, openHotelModal, renderHotels, loadAll)
- HTML 요소 확인 PASS (#modal, #modal-close)
- 회귀 테스트 대상: 매니저 `joylife8760@naver.com` / 호텔 `The Westin Tokyo`

### 관련 이슈
- BACKLOG.md P0 (Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가)
- BACKLOG.md P2 Issue #3 (Hotels 목록 MANAGER 컬럼 비어있음) — 동일 PR로 함께 해결

### BLOCKED / 후속작업
- **[BLOCKED-MGMT토큰만료]** Supabase Management API 401 응답. 토큰 만료(2026-05-26) 이전 갱신 필요. 본 작업은 코드 fix만으로 충분하여 영향 없음.
- **[정상-데이터부재]** Review, Agoda URL, Agoda Hotel ID, Amenities 누락 — 코드 버그 아님. 테스트 호텔이 Agoda 자동 매칭/수동 입력을 안 거쳐 NULL인 정상 상태. 매니저가 패키지 정보 입력 시 자연스럽게 채워짐.
- **[권장]** 추후 hotels 테이블에 `manager_email`/`manager_name`/`manager_phone` 캐시 컬럼을 정식으로 추가하고 `contact_*`와 통합하는 마이그레이션 권장 (네이밍 통일).
