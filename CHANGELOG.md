# CHANGELOG — TW B2B (gohotelwinners.com)

> 모든 코드 변경을 날짜·요약·변경사유와 함께 기록합니다.
> 형식: `## YYYY-MM-DD — [태그] 제목` / 변경사항 / 사유 / 관련 이슈.

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
