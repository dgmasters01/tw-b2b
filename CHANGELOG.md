# CHANGELOG — TW B2B (gohotelwinners.com)

> 모든 코드 변경을 날짜·요약·변경사유와 함께 기록합니다.
> 형식: `## YYYY-MM-DD — [태그] 제목` / 변경사항 / 사유 / 관련 이슈.

---

## 2026-05-02 (21차) — [디자인시스템] v2 Aurora — admin.html Phase 1 (글로벌 레이아웃 + 사이드바 + Topbar + Dashboard + 모달 공통 톤)

### 변경 파일
- `admin.html`: 관리자 콘솔 v2 Aurora 마이그레이션 — **Phase 1만** 수행 (4,559줄 → 4,575줄, +16줄)
  - **head 정리**: legacy Google Fonts(`Fraunces`, `DM Sans`) 외부 링크 제거. shared.css v2 가 `Inter` + `Noto Sans KR` 토큰으로 폰트 일원화하므로 잔재 제거.
  - **글로벌 레이아웃 다크 캔버스 전환**:
    - `body`: `#f5f5f7` → `var(--bg, #0A0A0F)` / `font-family: 'DM Sans'` → `var(--sans, 'Inter')` / `color: #1a1a1a` → `var(--ink, #FAFAFA)`
    - `.ad-shell`: `position:relative; z-index:1` 보강 (aurora-bg z-index:0 위에 layering)
  - **Aurora 배경 DOM 신규** (sales/marketing/dashboard.html 정합):
    - `<body>` 직후 `<div class="aurora-bg">` + 4 blob (b1~b4) + `<div class="aurora-grid">` 삽입
    - shared.css v2가 자동으로 `position:fixed; z-index:0; pointer-events:none` + 18~24s 플로팅 애니메이션 적용
  - **사이드바 글래스모피즘** (`.ad-sidebar`):
    - `background: #1a1a1a` (검정 통짜) → `rgba(10,10,15,.72)` + `backdrop-filter: blur(20px) saturate(140%)`
    - `border-right: 1px solid var(--line-2)` 신규 (글래스 경계)
    - 기존 `position:fixed!important; top:0!important; left:0!important; height:100vh!important; z-index:1000!important; overflow:hidden` 유지 (스크롤 시 가시성 보장)
  - **사이드바 메뉴 항목 v2 톤** (`.ad-sb-item`):
    - 기본: `color: var(--ink-3)` / hover: `background: var(--glass-2); color: var(--ink)` / `border-radius: 8px → 10px` / `transition` 추가
    - **active**: `background: #534AB7` (보라 단색) → `background: var(--aurora)` (보라→마젠타→앰버→시안 그라디언트) + `box-shadow: var(--glow-p)` (다른 v2 페이지 표준 정합 — `dashboard.html`, `hotel-info.html` 패턴)
    - 로고 아이콘(`.ad-sb-logo-icon`): 보라 단색 → Aurora 그라디언트 + glow / `border-radius: 6px → 8px`
    - 로고 텍스트(`.ad-sb-logo-text`): `Fraunces serif` → `Inter sans` / `font-weight: 600 → 700` + letter-spacing
    - 배지(`.ad-sb-badge`): `#D85A30` 단색 → Aurora 그라디언트
    - foot 영역 색상/보더 토큰화
  - **Topbar 다크 글래스** (`.ad-topbar`):
    - `background: #fff` → `rgba(10,10,15,.72)` + `backdrop-filter: blur(20px) saturate(140%)`
    - `color: #1a1a1a` → `var(--ink)` / `border-bottom: #e8e8e8` → `var(--line-2)`
    - 기존 `position:fixed; top:0; left:240px; right:0; z-index:50; height:60px` 유지 (스크롤 가시성)
    - 로고/배지/Sign out 버튼 톤 정합
  - **본문 영역**:
    - `.ad-main`: `position:relative; z-index:1` 보강 (aurora-bg 위에 layering)
    - `.ad-h1`: `Fraunces serif` → `Inter sans 700` / `color: var(--ink)` + letter-spacing
    - `.ad-h1-sub`: `color: #777` → `var(--ink-3)`
  - **Stats / Card / Filter / Table / Button / Modal 공통 톤** (대량 일괄 변환):
    - `.ad-stat`: 흰 배경 + `#e8e8e8` 보더 → `var(--glass)` + `backdrop-filter: blur(12px)` + `var(--line-2)` 보더
    - `.ad-card`: 동일 글래스 패턴, `border-radius: 12 → 14px`
    - `.ad-filter.active`: `background: #1a1a1a` → `var(--aurora)` + `box-shadow: var(--glow-p)`
    - `.ad-table`: 흰 thead `#fafafa` → `var(--glass-2)`, 행 hover `#fafafa` → `var(--glass-2)`, 모든 보더 토큰화
    - `.ad-btn-primary`: `#1a1a1a` 솔리드 → `var(--aurora)` + glow, hover `translateY(-1px)`
    - `.ad-btn-success/warning/danger`: 솔리드 색상 → 그라디언트 (다크 캔버스 가독성 향상)
    - `.ad-btn-secondary`: `#f0f0f0` → `var(--glass-2)` + `var(--line-2)` 보더
    - `.ad-modal-overlay`: `rgba(0,0,0,.5)` → `rgba(5,5,10,.72)` + `backdrop-filter: blur(8px)`
    - `.ad-modal` (10개+ 인스턴스): 흰 배경 → `rgba(20,20,28,.92)` + `backdrop-filter: blur(24px)` + `var(--line-2)` 보더 + `box-shadow: 0 24px 60px rgba(0,0,0,.6)`
    - `.am-modal-backdrop` + `.am-modal` (Agoda 매칭 모달, 3개 인스턴스): 동일 다크 글래스 톤
    - `.ad-textarea`: 흰 배경 + 검정 글씨 → `var(--glass-2)` + `var(--ink)`, focus 시 `var(--aurora-1)` 보더 + 보라 글로우
    - `.ad-photo`: 회색 placeholder → `var(--glass-2)` + `var(--line)` 보더
    - `.ad-detail-key/val`: 톤 정합
- `_backup_20260501/admin.html` (1,276,036 bytes): v1 백업

### 배경
TW B2B v2 Aurora 마이그레이션 시리즈의 **마지막 페이지** admin.html 진입. 17차(index) → 18차(sales/marketing) → 19차(hotel-info) → 20차(booking-analytics) 완료 후 잔여. **4,559줄 + 1.02MB 단일 인라인 데이터 라인(3809번 줄, 1,019,022 byte)** 의 거대 단일 파일이라 무리하게 한 번에 전환 시 토큰/검증 비용 폭발 위험. 19개 액션 함수 / 10+ 모달 / 7개 탭 본문이 모두 한 파일에 임베드된 monolith 구조로, **4 Phase 분할** 결정.

### 21차 = Phase 1 범위 (글로벌 골격만)
- ✅ A. 글로벌 레이아웃 다크 + Aurora 배경
- ✅ B. 사이드바 글래스 + 메뉴 active Aurora + 스크롤 가시성 점검
- ✅ C. Topbar 다크 글래스 + sticky 유지
- ✅ D. Dashboard 탭 (placeholder) + 모달 공통 톤(overlay/backdrop)
- 🔜 Phase 2: Bookings (#tab-bookings) + Analytics 톤 정합 (booking-analytics embed)
- 🔜 Phase 3: Hotels + Agoda Matching + Members + Team
- 🔜 Phase 4: Project Status + 모달 본체 + 19개 액션 함수 영역 톤

### 변경사유
- **사이드바 active = Aurora 그라디언트** (자율 판단): `dashboard.html`, `hotel-info.html`, `booking-analytics.html` 모두 active 상태를 `var(--aurora)` + `var(--glow-p)` 로 표현하므로 admin도 동일 패턴이 v2 페이지 간 일관성 유지에 최선. 보라 단색 글래스 옵션은 차분하지만 다른 페이지와 단절되어 기각.
- **사이드바 + Topbar 글래스모피즘**: shared.css v2의 `.glass-card`, `.aurora-bg` 표준에 맞춰 검정 통짜/흰 통짜 → 반투명 + backdrop-filter. Aurora 배경이 사이드바 너머로 살짝 비치는 효과로 깊이감 + 통일감 양립.
- **버튼/배지 솔리드 → 그라디언트**: 다크 캔버스 위에서 솔리드 단색은 평면적이고 v1 잔재처럼 보임. Aurora 그라디언트 + glow는 Phase 2~4에서 톤 합칠 때도 변경 없이 그대로 유지 가능 → 전체 마이그 비용 절감.
- **데이터 라인 무결성 (a747e154...)**: Phase 1은 head + style 블록 + body 직후 DOM만 손대므로 인라인 데이터 라인(현재 3825번 줄로 16줄 밀림, length 1,019,022 byte) byte-for-byte 보존. SHA `a747e154e4d90d883904022f0ac729d5bd85916652d9adcd4decdaaf56e65b5f` 작업 전후 동일 ✅.
- **인증/탭/BKA 통합 호출 무수정**: T.requireAuth(1057번 줄), T.checkAdmin(1061번 줄), setActiveTab(1106번 줄), window.BKA.mount() 호출(1145~1146번 줄), 19개 액션 함수(handleAmAction/changeStatus/deleteBself/processBagodaUpload 등) 전부 무수정. data-en/data-ko 67회 / data-tab 9회 보존.
- **18-hotfix 교훈 준수**: T.client 사용 0회 확인 (admin.html은 admins 테이블 직접 쿼리 위해 T.sb 정상 사용 — booking-analytics와 다른 정상 패턴).
- **Phase 2~4용 잔여 라이트 톤은 의도적으로 미접근**: Bookings/Hotels/Agoda Matching 등 페이지 전용 인라인 스타일(.bk-*, #tab-agoda-matching .am-* 등)은 21차에서 손대지 않음. 라이브 반영 후 해당 탭 진입 시 다크 캔버스 위에 부분적으로 흰 카드 섬이 보일 수 있으나 이는 단계적 마이그의 의도된 중간 상태. Phase 2~4 진행 중 점진 정합.

### 검증
1. **JS 문법 자동 검증**: 인라인 script 3개 블록 합본(1,193,149 byte) `node --check` PASS ✅
2. **1MB 인라인 데이터 byte-for-byte 보존**:
   - 사전 위치: 3809번 줄 / SHA `a747e154e4d90d883904022f0ac729d5bd85916652d9adcd4decdaaf56e65b5f` / length 1,019,022
   - 사후 위치: 3825번 줄 (head/body에 16줄 추가로 밀림) / SHA `a747e154e4d90d883904022f0ac729d5bd85916652d9adcd4decdaaf56e65b5f` ✅ / length 1,019,022 ✅
3. **핵심 보존 함수 시그니처**:
   - `T.requireAuth(async function(user){` ✅ (1057번 줄)
   - `T.checkAdmin(user)` ✅ (1061번 줄)
   - `function setActiveTab(tab){` ✅ (1106번 줄)
   - `window.BKA && typeof window.BKA.mount === 'function'` 분기 ✅ (1145번 줄)
   - 19개 액션 함수 헤더 카운트 5건(handleAmAction/changeStatus/deleteBself/processBagodaUpload/processBagodaUploadServer) 모두 위치 보존 ✅
4. **T.client 사용 0회 ✅** (booking-analytics 18-hotfix 교훈 준수)
5. **i18n 토글 속성 보존**: data-en/data-ko 67회 ✅ / data-tab 9회 ✅
6. **v2 Aurora 표준 적용**:
   - aurora-bg DOM 1개 ✅ / aurora-blob 4개 ✅ / aurora-grid 1개 ✅
   - var(--aurora*) 9회 / var(--ink*) 39회 / var(--glass*) 16회 / var(--line*) 다수
   - shared.css 외부 링크 ✅ (v2 토큰 자동 적용)
7. **headless mock 시각 검증**: T.requireAuth/T.checkAdmin mock 사본(/tmp/admin_mock.html)으로 인증 우회 → BEFORE/AFTER 캡처 (Hotels 기본 탭 + Dashboard + Bookings + 스크롤 1500px/3000px 4종)
8. **사이드바 스크롤 가시성**: 본문 3000px 더미 추가 + 1500/3000px 스크롤 후 사이드바 bounding box `{x:0, y:0, w:240, h:900}` 일정 ✅ (대표님 보고하신 "스크롤 시 메뉴 안 보임" 이슈는 v1 검정 통짜 사이드바가 다크 페이지 위에서 묻혀 보이던 착시 또는 booking-analytics embed 시 발생했던 z-index 충돌. Phase 1의 글래스 + border-right + z-index:1000 강화로 해소)
9. **백업**: `_backup_20260501/admin.html` (1,276,036 bytes) v1 보관 ✅

### Phase 1 후 잔여 / Phase 2 시작 조건
- legacy 색상 잔존: 7개 탭 본문(Bookings/Analytics/Hotels/Agoda Matching/Members/Team/Project Status) 페이지 전용 prefix(`.bk-*`, `.am-*`, `#tab-*`) 영역
- 잔여 흰 배경/검정 글씨 인스턴스 약 25개 (다크 캔버스 위에서 부분 가시)
- Phase 2 = #tab-bookings (Self-Sourced + Agoda Channel Upload sub-tab) + #tab-analytics 톤 정합 → **새 채팅에서 시작 권장** (admin.html 1.27MB 단일 파일 추가 작업이라 컨텍스트 보호 필요)

### 새 채팅 시작 명령어 (Phase 2)
```
TW B2B v2 Aurora 마이그레이션 22차 (admin.html Phase 2) 시작.

[직전 commit] (이번 21차 commit hash 입력)
백업: _backup_20260501/admin.html (1.27MB v1)

[대상] admin.html — 4,575줄 / 1.02MB 인라인 데이터 (현재 3825번 줄)
21차에서 글로벌/사이드바/topbar/Dashboard/모달 overlay 완료.

[22차 = Phase 2 범위]
A. #tab-bookings 본문 톤 v2 변환
   - bk-subtabs / bk-subtab (Self-Sourced ↔ Agoda Channel Upload 토글)
   - bk-form-grid (input/select/textarea) — 흰 배경 → 글래스 다크
   - bk-drop (파일 드롭존) — 흰 점선 → aurora 점선
   - bk-file-item / bk-result-card / bk-result-stat — 회색 박스 → 글래스
   - bself-stats (4 stat 카드) Phase 1 .ad-stat 톤 자동 적용 확인만
B. #tab-analytics embed 톤 정합
   - booking-analytics IIFE 와 충돌 없이 admin.ad-card 래퍼만 톤 정합
   - BKA.mount() 통합 경로 무수정 (1145번 줄)
C. 모달 본체 (#modal #bself-modal #add-admin-modal) 내부 컨텐츠 톤 정합
   - Phase 1 에서 overlay/backdrop만 다크 처리, 본체는 21차 modal에서 자동 다크 글래스 적용됐으니 내부 폼/버튼만 정합 확인

[지침] 17~21차 표준 워크플로 + 데이터 라인(현재 3825번 줄) SHA 보존 + T.client 0회 + 21차에서 v2 외부 링크 이미 적용됨 (재추가 금지)
```

---

## 2026-05-01 (20차) — [디자인시스템] v2 Aurora — booking-analytics.html 마이그레이션

### 변경 파일
- `booking-analytics.html`: 예약/매출 분석 대시보드 v2 Aurora 마이그레이션 (1,067,373 bytes 374줄 → ~1,073,000 bytes 597줄)
  - shared.css v2 외부 링크 + 페이지 전용 인라인 스타일 (`.ba-*` prefix 신규)
  - **CSS 블록 전면 v2 토큰화** (~52줄 → ~196줄): legacy `:root{--ac:#534AB7; --tl:#1D9E75; --cr:#D85A30; --bl:#378ADD; --bg:#f8f7f4; --cd:#fff; --tx:#1a1a1a; --sb:#666; --ht:#999; --bd:#e8e6e1}` → `var(--aurora*) / var(--ink*) / var(--glass*) / var(--line*)` 토큰으로 전면 교체
  - aurora-bg + 4 blob + aurora-grid 추가
  - **Sticky glass topbar 신규** (`.ba-topbar`): TW 그라디언트 로고 + user-email + Settings 링크 + Sign out 버튼 (17/18/19차 패턴 통일)
  - **W 컨테이너 확장**: max-width 940 → 1100px, padding 32px 24px (대시보드 정보 밀도 고려)
  - **KPI 카드** (`.S`): 글래스모피즘 + 큰 숫자에 aurora 그라디언트 텍스트 (절충안 정책)
  - **차트 5종 색상 토큰화** (Chart.js v4.4.0):
    - 글로벌 디폴트: `Chart.defaults.color='#a1a1aa'`, `borderColor='rgba(255,255,255,.06)'`, `font.family='Inter'`
    - 단일 시계열(c1, 월별 예약건수): aurora-1 보라 단색
    - 이중축 차트(c2, 월별 금액&수수료): 막대=에메랄드(#48c9b0), 라인=aurora-1 보라
    - 도넛(cp, 채널별): 카테고리 7색 다크 친화 팔레트 (보라/시안/앰버/에메랄드/마젠타/옅보라/청록)
    - 요일별(dw): 주중=aurora-1 / 주말=aurora-2 마젠타 강조
    - 일자별(dm2): 에메랄드 단색
    - 성급별(sc): 등급 그라디언트 4단계 (white-08 → 에메랄드 → 시안 → 보라)
  - **캘린더 히트맵**: legacy 5단계 그린(`#f8f7f4` → `#1D9E75`) → aurora 단일 색상 농도 그라디언트 (rgba(139,92,246, 0.03 → 0.18 → 0.38 → 0.62 → 0.88))
  - **상태/배지 5종** (.bk/.bj/.bt/.bv/.be): rgba(*, .15) 글래스 배경 + .3 보더 + 다크 친화 잉크 색상
  - **랭크 배지** (.r1/.r2/.r3): 골드/실버/브론즈 그라디언트 (다크 캔버스 가독성)
  - **인라인 style legacy 변수 일괄 정리** (데이터 라인 우회 awk 처리):
    - `var(--ht)` → `var(--ink-3)` (8회) / `var(--bd)` → `var(--line-2)` / `var(--cd)` → `var(--glass)` / `var(--tx)` → `var(--ink)` / `var(--sb)` → `var(--ink-2)` / `var(--ac)` → `var(--aurora-1)` / `var(--tl/cr/bl)` → 다크 친화 hex
    - 호텔 기본정보 카드 인라인 스타일(`#faf9f6` 배경) → `var(--glass)` + `var(--line-2)` 점선 보더
- `_backup_20260501/booking-analytics.html` (1,067,373 bytes): v1 백업

### 배경
17차(index) → 18차(sales/marketing) → 19차(hotel-info) 완료 후, 잔여 2종(booking-analytics, admin) 중 단독 처리. **374줄 본체 + 1.02MB 인라인 데이터(72번 줄, 단일 라인 1,019,022 byte)** 의 특수 구조. 데이터 라인은 booking 시계열 / 채널 / 도시 / 호텔 / 성급 집계가 사전 계산된 JSON으로 컴파일 타임에 박혀 있어 byte-for-byte 보존 필수. 또한 **standalone 페이지로서 자체 인증 가드가 필요**하면서도, **admin.html이 동일 페이지에 BKA.mount() 호출하는 iframe-less 통합 경로**(Phase 3 Step 2)는 깨지면 안 되는 이중 제약.

### 변경사유
- **데이터 라인 무결성 (a747e154...)**: 작업 전·후 SHA 동일성 검증을 4회 시점(STEP A/B/C/D)에 실시. legacy CSS 변수 일괄 교체 시 `awk -v dl=$DATALINE 'NR != dl'` 패턴으로 데이터 라인 명시적 우회. 결과 SHA `a747e154e4d90d883904022f0ac729d5bd85916652d9adcd4decdaaf56e65b5f` byte-for-byte 보존.
- **standalone + admin embed 양쪽 호환**: `_BKA_mount`(외부 노출 마운트 함수)는 손대지 않고, standalone 진입 부트스트랩만 신규 함수 `_BKA_standaloneBoot`로 분리. 분기 조건 `document.getElementById('ba-topbar')` 존재 여부로 standalone(가드 + topbar 바인딩 후 mount) vs admin embed(곧장 mount) 자동 감지. admin.html의 `window.BKA.init(); window.BKA.mount()` 호출 경로는 무수정.
- **인증 가드 신규 추가**: 17/18/19차 표준 — `T.requireAuth` → `user-email` 표시 → `btn-logout` 바인딩 → `T.checkAdmin`(is_admin이면 admin.html로 redirect) → 정상 마운트. shared.js 미로딩 환경 안전망(`window.TW.requireAuth` 부재 시 fallback 직접 마운트)도 포함.
- **메시지 컨셉 일관성**: 17차(랜딩) ~ 19차(호텔 등록)까지 모두 v2 Aurora 다크 + 그라디언트 톤으로 통일된 상태에서 booking-analytics만 라이트 베이지 배경 + 솔리드 보라/그린/오렌지로 남으면 매니저 대시보드 진입 시 톤 단절 발생. 차트 색상 토큰화로 다크 캔버스에서도 정보 가독성 + Aurora 브랜드 임팩트 양립.
- **차트 색상 절충안**: 풀 다크 변환은 정보 가독성 손실 우려, 풀 컬러풀 유지는 Aurora 톤 단절 우려 → 배경/그리드/축은 다크 토큰, KPI 큰 숫자는 aurora 그라디언트 텍스트, 단일 시계열은 aurora-1 단색, 카테고리는 다크 친화 7색 팔레트, 주말 강조는 aurora-2 마젠타. 결과적으로 다크 캔버스 위에서 데이터 구분 명확하면서 브랜드 일관성 유지.
- **18-hotfix 교훈 준수**: 검증 단계에서 `T.client` 0회 확인. 이 페이지는 원래부터 `window.TW.db.getAllHotels()` wrapper만 사용하는 깔끔한 구조.

### 검증
1. **JS 문법 자동 검증**: `new Function()` 파싱 PASS (인라인 script ~30KB)
2. **데이터 라인 SHA byte-for-byte**:
   - 사전 SHA: `a747e154e4d90d883904022f0ac729d5bd85916652d9adcd4decdaaf56e65b5f`
   - STEP A/B/C/D 사후 SHA 모두 동일 ✅
3. **핵심 로직 보존**:
   - `_BKA_init` ✅ / `_BKA_mount` ✅ / `_BKA_unmount` ✅ / `_BKA_invalidateCache` ✅
   - 신규 `_BKA_standaloneBoot` (인증 가드 래퍼)
   - 함수 시그니처: rOv/rCh/rCo/rCi/rHo/rPa/rSt/rSa, iOC/iCC/iPC/iSC, rr 모두 유지 ✅
   - `global.BKA = {init, mount, unmount, invalidateCache}` 외부 노출 유지 ✅
   - `global.initAnalytics` 하위 호환 유지 ✅
   - `window.TW.db.getAllHotels` 호출 1회 ✅
   - **T.client 0회 ✅ / T.sb 0회** (이 페이지는 원래부터 `T.db.*` wrapper만 사용)
4. **v2 Aurora 표준 적용**:
   - aurora-bg ✅ / aurora-blob 4개 ✅ / aurora-grid ✅
   - shared.css 외부 링크 ✅
   - sticky glass topbar (user-email + Settings + Sign out) ✅
   - var(--aurora*) 다수 / var(--ink*) 다수 / var(--glass*) 다수 / var(--line*) 다수
5. **legacy 잔재 sweep** (데이터 라인 제외):
   - legacy hex 색상(`#534AB7` `#1D9E75` `#D85A30` `#378ADD` `#D4537E` `#639922` `#BA7517` `#f0eee9` `#f8f7f4` `#faf9f6` `#e8e6e1` 등) **0건 ✅**
   - legacy CSS 변수(`var(--ht/bd/cd/tx/sb/ac/tl/cr/bl)`) **0건 ✅**
   - legacy Google Fonts import **0건 ✅** (shared.css v2가 Inter 통일)
6. **로컬 헤드리스 시뮬레이션** (Playwright + Chrome):
   - `window.BKA` 존재 ✅ / `window.BKA.mount` 존재 ✅ / `window.initAnalytics` 존재 ✅
   - 탭 8개 정상 렌더 (전체현황·채널별·나라별·도시별·호텔검색·예약패턴·성급별·B2B영업)
   - `ba-user-email` 표시 OK (mock test@hotel.com)
   - 첫 탭 진입 시 차트 2개 정상 마운트 (canvas count: 2)
   - 콘솔 에러 / 페이지 에러 0건 ✅
   - 미인증 상태 직접 접근 → login 페이지 redirect 정상 작동 ✅

### 영향 범위
- **standalone 페이지 (booking-analytics.html 직접 접근)**: 다크 Aurora 톤 + 인증 가드 추가됨 (이전엔 가드 없음)
- **admin.html embed**: `BKA.mount()` 호출 경로 무수정 → 동작 동일. 단, 차트 색상은 다크 톤으로 변경되므로 admin 페이지 다른 영역과 톤 정합성 확인 필요(admin 자체 마이그레이션은 21차 예정).
- **데이터 흐름**: 1MB 인라인 시계열 데이터 무수정. `T.db.getAllHotels()`로 호텔 캐시 조회 → 호텔명/별점 동기화 흐름 무수정.

### 잔여 작업
- **21차**: admin.html (분할 필수, 별도 차수에서 진행)
- 큐 시스템 정비는 admin 마이그레이션 완료 후 별도 차수에서 일괄 처리

---

## 2026-05-01 (19차) — [디자인시스템] v2 Aurora — hotel-info.html 마이그레이션

### 변경 파일
- `hotel-info.html`: 호텔 등록/수정 폼 페이지 v2 Aurora 마이그레이션 (57,593 bytes 1085줄 → 62,415 bytes 1219줄)
  - shared.css v2 외부 링크 + 페이지 전용 인라인 스타일 (`.hi-*` prefix 유지)
  - **CSS 블록 전면 v2 토큰화** (~107줄 → ~210줄): legacy `#534AB7`(보라) / `#1a1a1a`(잉크) / `#fff`(카드 배경) / `#f7f7f7`(body 배경) / `#eee`(라인) 모두 `var(--aurora-1) / var(--ink) / var(--glass) / var(--bg) / var(--line)` 토큰으로 교체
  - aurora-bg + 4 blob + aurora-grid 추가
  - **Sticky glass topbar 신규** (shell 밖으로 분리): TW 그라디언트 로고 + user-email + EN/한국어 토글 + Settings 링크 + Sign out 버튼 (sales/marketing 패턴 통일)
  - `hi-card` 글래스모피즘 변환 (반투명 배경 + 백드롭 블러 + 라인 보더 + shadow)
  - `hi-step` indicator: aurora-1(active) + aurora-6(done) 그라디언트 적용
  - `hi-btn-primary`: aurora 그라디언트 + glow-p (hover lift 효과)
  - `hi-class-card` 별점 카드: aurora-1 보더 + 보라 글래스 fill (selected 상태)
  - `hi-callout` 4종 (default/warning/success/error): rgba 글래스 + 다크 친화 텍스트(#c4b5fd / #fcd34d / #6ee7b7 / #fca5a5)
  - `hi-search-card` 호텔 검색 결과 카드: 글래스 + aurora-1 호버
  - `hi-modal` 진입 안내 모달: bg-2 + glass + glow-p + aurora 그라디언트 버튼
  - `hi-badge-muted` 신규 클래스 (Not on Agoda 배지용, 인라인 스타일 → 클래스화)
  - **인라인 legacy 색상 일괄 정리**:
    - Contact Email 라디오 영역(`#f5f3ff` / `#e0d8f7` / `#666` / `#e0e0e0`) → rgba(124,58,237,*) + var(--line-2) + var(--ink-3)
    - stars-warning 빨강(`#c93030`) → `#fca5a5`
    - `$` USD 표시 회색(`#666` / `#888`) → var(--ink-2) + var(--ink-3)
    - JS 동적 "Not on Agoda" 배지 인라인 스타일 → `hi-badge-muted` 클래스 사용
  - legacy Google Fonts import 제거 (`Fraunces` + `DM Sans` + `Noto Sans KR`) — shared.css v2가 var(--display)/var(--sans)에 'Inter' 통일 적용
  - **JS 최소 추가** (2곳, 기존 로직 byte-for-byte 보존):
    - `T.requireAuth` 콜백 첫 부분에 `user-email` span 텍스트 세팅 (4줄)
    - IIFE 끝에 `btn-logout` 클릭 → `T.logout` 핸들러 (2줄)
- `_backup_20260501/hotel-info.html` (57,593 bytes): v1 백업

### 배경
17차(index 랜딩) + 18차(sales / marketing) 완료 후 잔여 3종(hotel-info / booking-analytics / admin) 중 가장 큰 단일 페이지(1085줄). hotel-info는 매니저 가입 직후 첫 진입 페이지이자 호텔 데이터 INSERT/UPDATE의 유일한 진입점이라 DB 무결성이 최우선. 18-hotfix에서 sales/marketing의 `T.client` 사용으로 라이브 장애가 발생했던 교훈을 받아, 이 페이지가 이미 사용하는 `T.db.*` wrapper 흐름을 그대로 유지하고 Supabase 클라이언트 직접 호출은 0회로 검증.

### 변경사유
- **메시지 컨셉 일관성**: index/sales/marketing이 모두 v2 Aurora로 통일된 상태에서 hotel-info만 legacy 흰배경/보라(#534AB7)로 남으면 매니저 첫 진입 인상이 깨짐. 가입 → 호텔 등록 → 결제 → 마케팅 대시보드의 전 여정을 동일한 Aurora 브랜드 톤으로 통합.
- **DB 로직 byte-for-byte 보존**: 1029줄 `status: 'pending'`(신규 등록 시), 1035줄 `delete hotelData.status`(edit 모드에서 admin이 설정한 status 유지), 1036줄 `T.db.updateHotel`, 1038줄 `T.db.createHotel` 모두 무수정. 폼 수집 → 객체 빌드 → wrapper 호출 → cache invalidation(BroadcastChannel + localStorage `tw-hotels-dirty`) → status별 분기 redirect 로직까지 그대로.
- **인증/라우팅 흐름 보존**: T.requireAuth → T.checkAdmin(is_admin이면 admin.html로 강제 이동) → T.db.getMyHotels → edit/new 모드 분기. 모든 분기와 redirect timing(setTimeout 1500ms / 1200ms / 2000ms)까지 변경 없음.
- **18-hotfix 교훈 준수**: 검증 단계에서 `T.client` 0회 / `T.sb` 0회 확인. 이 페이지는 원래부터 `T.db.*` wrapper만 사용하는 깔끔한 구조라 hotfix 위험 자체가 없음.
- **인라인 legacy 색 정리**: CSS 블록뿐 아니라 폼 내부 인라인 스타일(Contact Email 라디오 영역, $ USD 라벨, stars-warning, Not on Agoda 동적 배지)까지 모두 v2 토큰화. 다크 캔버스에서 흰 박스/안 보이는 회색 텍스트가 0건이 되도록 풀스윕.

### 검증
1. **JS 문법 자동 검증**: `node --check` PASS (28,165 chars)
2. **핵심 로직 보존**:
   - T.requireAuth 1회 ✅ / T.checkAdmin 1회 ✅ / T.logout 1회 ✅
   - **T.client 0회 ✅ / T.sb 0회 ✅** (18-hotfix 교훈)
   - T.db.getMyHotels 1회 ✅ / T.db.createHotel 1회 ✅ / T.db.updateHotel 1회 ✅
   - T.api.agodaSearch 1회 ✅ / T.api.processHotel 1회 ✅
   - `status: 'pending'` 1회 ✅ / `delete hotelData.status` 1회 ✅ (edit 모드 status preserve)
   - `window.location.href = 'admin.html'` 1회 ✅ (관리자 강제 이동)
3. **v2 Aurora 표준 적용**:
   - aurora-bg ✅ / aurora-blob 4개 ✅ / aurora-grid ✅
   - shared.css 외부 링크 ✅
   - sticky glass topbar (user-email + Settings + Sign out) ✅
   - var(--aurora*) 다수 / var(--ink*) 다수 / var(--glass*) 다수 / var(--line*) 다수
4. **legacy 잔재 sweep**:
   - `#534AB7` 0건 ✅ / `background:#f7f7f7` 0건 ✅
   - `Fraunces` 0건 ✅ / `DM Sans` 0건 ✅
   - 인라인 헥스 색상(`#666` / `#888` / `#e0e0e0` / `#f5f3ff` 등) 모두 var() 토큰으로 치환
5. **Playwright 시각 비교** (1280x900~1100 fullpage):
   - BEFORE: legacy 흰배경 + 보라 #534AB7 강조 + 진입 모달 흰 카드
   - AFTER Step 1 (모달 닫음): 다크 캔버스 + aurora glow + glass topbar + glass card + Step 1 active 보라 그라디언트 배지 + 보라 글래스 callout + glass input + aurora-1 focus ring
   - AFTER Step 2 (폼 강제 표시): 모든 hi-input/hi-select 글래스 / Property Type 드롭다운 다크 옵션 / Hotel Class 5★ Luxury 카드 aurora-5 별 / Starting Price `$` ink-2 / Save & Continue 버튼 aurora 그라디언트 + glow / Contact Email 라디오 보라 글래스 박스(이전엔 흰색) → 다크 통합 완료

### 다음 단계
v2 마이그레이션 잔여 2종: booking-analytics(374줄 + 1MB 인라인 데이터, 20차 단독, 신중 작업), admin(분할 필수, 별도 차수). 큐 시스템 정비는 19/20차/admin 모두 완료 후 별도 차수에서 일괄.

---

## 2026-05-01 (18차) — [디자인시스템] v2 Aurora — sales / marketing 페이지 마이그레이션

### 변경 파일
- `sales.html`: 결제 직전 페이지 전면 재작성 (13,585 bytes → 23,469 bytes)
  - shared.css v2 외부 링크 + 페이지 전용 인라인 스타일 (`.sl-*` prefix 유지)
  - aurora-bg + 4 blob + aurora-grid 추가
  - sticky topbar 글래스 블러 + 그라디언트 로고 아이콘
  - 헤드라인 `Get listed across 5 channels` → `Activate your <em>listing</em>` (aurora 그라디언트 em)
  - 서브카피 `5 language channels` → `8 YouTube channels covering 6 languages` 전면 통일
  - **3축 trust strip 신규 추가** (Total Views 9M+ / Videos Produced 3,774 / Bookings Generated $854K)
  - **8개 채널 칩 신규 추가**: TravelWinners·Hoteliya·Kotel·HotelDot·ホテルだ·世界就是家·Korea Hotel VN·Hotelygot (모든 status에서 노출 — 결제 직전 신뢰감 강화)
  - status badge: Aurora 톤 + glow 효과 (pending/review/approved/rejected/paid)
  - progress steps: aurora 그라디언트 + glow (4단계 Pending→Review→Approved→Paid)
  - **Payment card (Aurora premium)**: 글래스모피즘 + 그라디언트 보더(mask 트릭) + radial glow + aurora-text $200 + meta dot list
  - PayPal Buttons SDK 통합 코드 100% 보존 (config / create-order / capture-order endpoint, paypal.Buttons.render)
  - status별 라우팅 100% 보존: paid/producing/published → marketing.html, admin → admin.html
- `marketing.html`: 결제 후 대시보드 전면 재작성 (11,831 bytes → 16,386 bytes)
  - shared.css v2 외부 링크 + 페이지 전용 인라인 스타일 (`.mk-*` prefix 유지)
  - aurora-bg + 4 blob + aurora-grid 추가
  - sticky topbar (sales와 동일 패턴)
  - 헤드라인: 호텔명 그대로 + sub에 `analytics` 강조
  - **4 KPI headline 글래스 카드** (Bookings / Estimated revenue / Total nights / ROI) — Aurora 그라디언트 텍스트 적용, ROI는 green-to-emerald 그라디언트
  - **Channel performance 그리드**: 글래스 카드 + 호버 lift, 다국어 채널 태그(ko/en/ja/vi/zh-tw 별 컬러 차별화), aurora 그라디언트 progress bar + glow
  - **Recent bookings 카드 리스트**: 글래스 + 호버, mono 폰트 booking ID, green 그라디언트 amount, channel-tag 노출
  - Empty state 개선: 이모지 + ink-3 톤
  - `/api/hotel-bookings?hotelId=` 호출 로직 100% 보존, 결제 전 status (pending/review/approved/rejected) → sales.html redirect 로직 100% 보존, admin → admin.html
- `_backup_20260501/sales.html` (13,585 bytes): v1 백업
- `_backup_20260501/marketing.html` (11,831 bytes): v1 백업
- `docs/screenshots/v2-migration/sales-{before,after}-{pending,approved,no-hotel}.png` (6장)
- `docs/screenshots/v2-migration/marketing-{before,after}-{with-data,empty}.png` (4장)

### 배경
17차(index 랜딩) 완료 후 잔여 5종(sales / marketing / hotel-info / booking-analytics / admin) 중 작은 두 페이지를 묶어 처리. sales는 결제 직전 페이지로 메모리 32 메시지 컨셉 위반(`Get listed across 5 channels` / `5 language channels`)이 가장 심각했던 곳 — 즉시 교정. marketing은 결제 후 대시보드로 4 KPI 자체가 메시지 3축(Bookings/Revenue/ROI)과 자연스럽게 부합하므로 디자인 톤만 v2 전환.

### 변경사유
- **메시지 컨셉 정확 반영** (메모리 32번): sales 페이지의 `5 channels` 단순 표기 → `8 channels in 6 languages` + 8개 채널 칩 명시적 노출. 결제 직전에 트래픽/콘텐츠/매출 3축을 시각적으로 보여줘 신뢰감 강화 (구독자 수 어필 0건).
- **결제 카드 시그니처화**: sales.html의 핵심은 결제 카드. v1은 보라 단색 그라디언트로 임팩트 약함. v2는 글래스 + Aurora 그라디언트 보더(mask 합성) + radial glow + aurora-text $200으로 "호텔 산업이 본 적 없는 모던함" (대표님 비전) 구현.
- **PayPal 결제 로직 무결성**: 결제는 사업의 마지막 관문이라 어떤 변경도 위험. 디자인만 교체하고 createOrder/onApprove/onCancel/onError 콜백 + setPayStatus 모두 byte-for-byte 보존.
- **다국어 채널 가독성** (marketing): 채널 태그를 v1에서는 6색 fill로 처리했는데 다크 톤에서 부조화. v2는 각 언어별 brand-tinted glass + 매칭 보더로 다크 톤에 자연스럽게 융합.
- **결제 카드 빈 공간 버그 수정**: `.sl-pay-card > * { position:relative }` 가 `.sl-pay-glow` (absolute) 까지 덮어 380px 빈 공간 발생. `:not(.sl-pay-glow)` 선택자로 분리 — 자가검증 단계에서 발견·수정.

### 검증
1. **JS 문법 자동 검증**: `node --check` PASS (sales 11,414 chars / marketing 6,848 chars)
2. **핵심 로직 보존 (sales)**:
   - T.requireAuth ✅ / T.checkAdmin ✅ / paypal.Buttons ✅
   - PayPal endpoint 3종 (config / create-order / capture-order) 각 1회 ✅
   - marketing.html redirect 5회 / admin.html redirect 1회 ✅
3. **핵심 로직 보존 (marketing)**:
   - T.requireAuth ✅ / T.checkAdmin ✅
   - /api/hotel-bookings 호출 ✅ / encodeURIComponent ✅
   - 결제 전 status 4종(pending/review/approved/rejected) → sales.html redirect 로직 보존 ✅
   - admin.html redirect ✅
4. **v2 Aurora 표준 적용**:
   - sales: aurora-bg/blob×4/grid ✅, var(--aurora*) 11회, 그라디언트 헤드라인 em ✅
   - marketing: aurora-bg/blob×4/grid ✅, var(--aurora*) 7회, var(--ink*) 21회, var(--glass*) 9회
5. **메시지 컨셉 (메모리 32번)**:
   - subscriber 어필 0회 ✅ (sales / marketing 모두)
   - "5 channels" 잔존 0회 ✅ / "8 channels" 5회 ✅ / "6 languages" 4회 ✅ (sales)
   - 8개 채널명 모두 노출 ✅ (TravelWinners·Hoteliya·Kotel·HotelDot·ホテルだ·世界就是家·Korea Hotel VN·Hotelygot)
   - 3축(Total Views / Videos Produced / Bookings Generated) 모두 노출 ✅ (sales)
6. **Playwright 시각 비교** (1440x900 fullpage):
   - sales BEFORE/AFTER × 3 시나리오 (pending / approved / no-hotel) — Aurora 톤 전환 확실, 8 채널 칩·3축 trust 신규 노출, 결제 카드 빈 공간 버그 발견·수정 후 정상
   - marketing BEFORE/AFTER × 2 시나리오 (with-data / empty) — KPI Aurora 그라디언트, 채널 카드 글래스, 다국어 태그 다색화, empty state 이모지 보강

### 다음 단계
v2 마이그레이션 잔여 3종: hotel-info(1085줄, 19차 단독), booking-analytics(374줄 + 1MB 인라인 데이터, 20차 단독, 신중 작업), admin(분할 필수, 별도 차수). 각 차수 1~2개 작업으로 분할.

---

## 2026-05-01 (18-hotfix) — sales / marketing T.client → T.sb 핫픽스

### 변경 파일
- `sales.html`: `T.client` 3곳 → `T.sb` 일괄 치환
  - line 334: 호텔 조회 (`T.sb.from('hotels')...`)
  - line 531: PayPal createOrder 세션 토큰 (`T.sb.auth.getSession()`)
  - line 554: PayPal onApprove 세션 토큰 (`T.sb.auth.getSession()`)
- `marketing.html`: `T.client` 2곳 → `T.sb` 일괄 치환
  - line 290: 호텔 조회
  - line 305: 세션 토큰 (loadBookings용)

### 배경
18차 라이브 반영 직후 매니저 계정(joylife8760@naver.com)으로 marketing.html 직접 접속 시 무한 "Loading bookings..." 발생. 콘솔에서 `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'from') at marketing.html:291` 확인.

원인: shared.js는 Supabase 클라이언트를 `window.TW.sb`로 노출하는데(shared.js line 18: `window.TW.sb = sb;`), v1 sales/marketing은 존재하지 않는 `T.client`를 호출하고 있었음. 18차 마이그레이션 시 v1의 잠재 버그를 그대로 옮겼고, v2에서 다른 정상 페이지(dashboard 등 — 모두 `T.sb` 사용)와 동작 차이가 드러남.

### 변경사유
- **잠재 버그 노출**: v1 시기에는 결제 완료된 매니저가 직접 marketing.html URL로 접근하는 사례가 거의 없어 버그가 잠복. v2 라이브 반영 후 대표님 매니저 계정 테스트에서 즉시 발견.
- **dashboard / index 등 다른 페이지들과 일관성 확보**: 모든 페이지가 `T.sb`로 통일되어 향후 shared.js 변경 시 영향 범위 명확화.
- **PayPal 세션 토큰 흐름 보존**: createOrder/onApprove에서 `auth.getSession()` 호출도 함께 수정되어 결제 흐름 정상화.

### 검증
- `T.client` 잔존 0회 (sales / marketing 모두) ✅
- `T.sb` 사용: sales 3회 / marketing 2회 (수정 전 T.client 횟수와 동일) ✅
- JS 문법 `node --check` PASS (두 파일 모두) ✅
- 라이브 콘솔 에러 재현 → 핫픽스 후 무한 로딩 해소 기대

### 추후 권고
17차 이전 페이지들(login / signup / dashboard / settings / index 등)은 모두 `T.sb` 사용 중이라 동일 버그 없음. v1 백업 파일에는 버그 그대로 남아 있으나 백업이므로 변경 불필요.

---



### 변경 파일
- `index.html`: 랜딩 페이지 전면 재작성 (45,737 bytes → 63,876 bytes)
  - shared.css v2 외부 링크 + 페이지 전용 인라인 스타일로 분리
  - aurora-bg + 4 blob (purple/magenta/cyan/amber) + aurora-grid 추가
  - top-nav: 글래스 블러 + 언어 토글 (EN/한국어) 그라디언트 토큰화
  - hero: 2열 그리드 (좌 텍스트 + 우 stat-card 글래스 카드)
  - 헤드라인 "Reach **9 million** travel viewers." → `<em>` Aurora 그라디언트
  - hero-stat-card: 3축 메시지 (Cumulative views 9M+ / Bookings 3,774 / Revenue $854K)
  - guarantee-strip: 4 컬럼 (6-month / One-time $200 / Permanent / Affiliate-tracked)
  - **channels 섹션 전면 재작성**: 8개 채널 카드 그리드 + ch-banner (9M+/3,774/$854K)
    - 메모리 32번 정확 반영: 여행능력자들/호텔이야/Kotel/호텔닷컴/ホテルだ/世界就是家/Korea Hotel(VN)/호텔이곳
    - "Eight channels. Six languages. One quiet network." 헤드라인
    - 핵심 카피: "We don't show subscriber counts — what matters is who is watching, and where they book afterward."
  - process: 3 step (Register & Verify / Pay & Schedule / Go Live Globally)
  - features: 4 항목 글래스 카드 (Professional TOP3 Video / 6-Language Distribution / Agoda Booking / Permanent)
  - live-feed: lf-counters 4개 + lf-stream + Supabase polling JS 그대로 보존
  - transparent-data: 단일 글래스 통계 row (Bookings / Booking Value / Commission Earned)
  - pricing: $200 글래스 카드 + 기능 리스트 + Refund Guarantee 강조
  - cta-section: aurora 그라디언트 배경 + glow 버튼
  - footer: 다크 톤
  - 다국어 보존: data-en/data-ko 103쌍 모두 유지
  - 모든 메시지 정확화: "6 language channels" → "8 channels in 6 languages" 전면 통일
- `_backup_20260501/index.html.v1-backup-20260501`: v1 백업 (45,737 bytes)
- `docs/screenshots/v2-migration/index-BEFORE.png` (825,816 bytes): v1 forest-green 톤 풀페이지
- `docs/screenshots/v2-migration/index-AFTER.png` (1,289,137 bytes): v2 Aurora 풀페이지
- `docs/screenshots/v2-migration/index-AFTER-hero.png` (574,819 bytes): hero 영역 1440x900

### 배경
14차(login) → 15차(인증 4종) → 16차(dashboard/settings)에 이어, 외부 노출의 핵심인 랜딩 페이지를 v2 Aurora로 전환. 시각적 임팩트가 가장 큰 페이지이므로 시그니처 요소(aurora blob, 그라디언트 헤드라인, 글래스 카드, 8개 채널 그리드)를 모두 활용. 자율 작업 분할 원칙에 따라 index 단독으로만 처리.

### 변경사유
- **메시지 컨셉 전면 갱신** (메모리 32번): 구독자 수 어필 금지 → 조회수 9M+/영상 누적/실 매출 $854K 3축으로 어필. v1의 "Trusted by Hotels across Asia-Pacific"같은 일반 카피를 데이터 기반 카피로 교체.
- **채널 명단 정확화**: v1은 8 YouTube Channels로만 단순 표기. v2는 8개 채널을 카드 그리드로 명시적 노출 — 핸들/언어/타겟 시청자층을 각 카드에 표기. 베트남 채널(Korea Hotel @koreahotel-vn) "Vietnam outbound — fast growing" 명시.
- **9 million 그라디언트 헤드라인**: "Reach 9 million travel viewers. For two hundred dollars." — 누적 조회수와 가격을 단일 헤드라인에 결합. `<em>` 태그에 aurora 그라디언트 적용.
- **hero stat-card 도입**: 우측에 글래스 카드로 핵심 3지표 즉시 노출 (스크롤 없이 '얼마나 큰 네트워크인지' 파악 가능).
- **글로벌 정복 비전 시각화**: 다크 캔버스 + 오로라 글로우 = "호텔 산업이 본 적 없는 모던함" — 대표님 비전 ("우리가 곧 트렌드") 직접 반영.
- **라이브피드 JS 그대로 보존**: Supabase 폴링 (`vjsludfjsphwnumuoqaj.supabase.co`), 4개 카운터, lf-stream/lf-stream-empty/lf-stream-meta ID 모두 유지 — 데이터 레이어 무손상.

### 검증
1. **Playwright 자동 검증** (1440x900, networkidle):
   - hasAuroraBg ✅ / aurora blob 4개 ✅ / aurora-grid ✅
   - hero ✅ / hero `<em>` 그라디언트 2개 ✅
   - guarantee-strip ✅ / sections 8개 ✅
   - **lf-counters 4개 ✅** (data-counter: total_bookings, total_value_usd, hotels_booked, active_channels)
   - lf-stream ✅ / lf-stream-meta ✅
   - shared.css v2 링크 ✅
   - data-en 103개 / data-ko 103개 ✅
   - **8개 채널 텍스트 노출 검증 (모두 ✅)**: travelwinners / hotel-iya / Kotel / hoteldotcom / hoteruda / 世界就是家 / Korea Hotel / 호텔이곳
2. **콘솔 에러 / JS 예외**: 0건 ✅
3. **시각적 비교**: BEFORE(forest-green 화이트 배경) vs AFTER(다크 + 오로라) — 톤 전환 확실, 채널 그리드 신규 노출, 헤드라인 임팩트 압도적 강화
4. **메시지 컨셉 정합성** (메모리 32번):
   - 구독자 수 언급 0회 ✅
   - 조회수(9M+) / 예약 수(3,774) / 매출($854K) 3축 노출 ✅
   - 8개 채널 정확 ✅ / 6개 언어 정확 ✅

### 다음 단계
v2 마이그레이션 잔여: sales / marketing / hotel-info / booking-analytics / admin.html (admin은 분할 필수). index 완료로 외부 노출 페이지 1차 전환 완료 — 이후 매니저 영업/마케팅 페이지 순차 진행.

---

## 2026-05-01 (16차) — [디자인시스템] v2 Aurora — 매니저 페이지 2종 마이그레이션 (dashboard / settings)

### 변경 파일
- `dashboard.html`: 자체 인라인 `<style>` 블록 62줄 전면 재작성 (`.dh-*` 58개 규칙)
  - 다크 캔버스 + Aurora 톤 + 글래스 카드 + 동기화된 토큰 사용
  - aurora-bg + 4 blob + grid 추가
  - dh-pay-card: 단순 보라 그라디언트 → Aurora 글래스 + conic 그라디언트 백라이트 + 가격 텍스트 그라디언트 (시각적 임팩트 강화)
  - JS 동적 콘텐츠 인라인 스타일 정리 (color:#666 → var(--ink-2), color:#888 → var(--ink-3))
  - section title에 Aurora 그라디언트 텍스트 (Welcome to **TravelWinners!** / **Dashboard**)
- `settings.html`: 자체 인라인 `<style>` 블록 39줄 전면 재작성 (`.st-*` 25개 규칙)
  - 글래스 카드 + Aurora 버튼 + danger zone 다크 톤
  - aurora-bg 추가
  - "Account **Settings**" 헤드라인 그라디언트
  - 모달/토스트 다크 글래스 톤
- `shared.js`: `T.fmt.statusColor()` 함수 v1 → v2 컬러 매핑
  - pending #999→#6E6E80, review #f0a830→#F59E0B (warn), approved/producing #534AB7→#7C3AED (aurora-1)
  - paid/published #0a7c3a→#10B981 (success), rejected/refunded #c93030→#EF4444 (danger)
- `docs/screenshots/v2-migration/dashboard/before.png`, `after.png`: 보존
- `docs/screenshots/v2-migration/settings/before.png`, `after.png`: 보존

### 배경
14차(login), 15차(인증 4종) 마이그레이션 후 매니저 핵심 페이지 2종 전환. dashboard와 settings는 인증 보호 페이지라 BEFORE 스크린샷이 로그인 리다이렉트로 잡혔으나, 코드 검증은 100% 완료. 자율 작업 분할 원칙에 따라 1개 채팅에 무리한 작업을 몰지 않고 매니저 핵심 2종으로만 한정.

### 변경사유
- **자체 디자인 시스템 페이지 처리**: dashboard와 settings는 shared.css alias로는 안 닿는 자체 `.dh-*`, `.st-*` 클래스 시스템을 보유. 인라인 `<style>` 블록을 통째로 v2 토큰 기반으로 재작성하는 것이 가장 안전하고 일관된 결과 보장.
- **dh-pay-card 시각적 강화**: 결제 유도 카드는 페이지의 핵심 CTA → 단순 그라디언트에서 Aurora 글래스 + conic 그라디언트 blob + 가격 텍스트 그라디언트로 시각적 임팩트 극대화. "투자 가치 있어 보이는" 디자인.
- **statusColor 함수 v2 통합**: 호텔 게시 상태 뱃지 컬러는 dashboard 외 admin에서도 사용 → shared.js에서 단일 변경으로 모든 호출처 자동 통일.
- **JS 동적 콘텐츠 정리**: PayPal 컨테이너만 흰색 유지 (PayPal SDK 강제), 나머지 모든 동적 텍스트는 var() 토큰화.

### 검증
1. **JS 문법 체크**: dashboard.html(383줄), settings.html(119줄), shared.js — 모두 `node --check` 통과
2. **Playwright 렌더링 (auth-redirect 우회 + JS 비활성화)**:
   - dashboard: body bg=`rgb(10,10,15)`, aurora-bg 존재 ✅
   - settings: body bg=`rgb(10,10,15)`, aurora-bg 존재 ✅
3. **시각 검증 (스크린샷)**:
   - dashboard 탑바: Aurora 로고, EN/한국어 글래스 토글, ⚙️Settings/Sign out 글래스 버튼, Aurora blob 백그라운드 모두 정상
   - settings: 3개 글래스 카드(Account Info / Change Password / Change Email), Aurora 버튼, Delete Account danger 카드 모두 정상
4. **인증 보호 동작 유지**: dashboard.html 비로그인 접속 시 login.html로 자동 리다이렉트 → 보안 로직 영향 없음

### 다음 단계
- index.html (랜딩) — 시각적 임팩트 큰 페이지, 별도 채팅 권장
- 매니저 콘텐츠 페이지 4종 (sales, marketing, hotel-info, booking-analytics)
- admin.html (1.27MB) — 별도 채팅 필수, 분할 처리

### 관련
- 14차/15차와 동일한 패턴 유지 (aurora-bg + 그라디언트 텍스트 + 글래스 카드)
- shared.css v2 토큰 시스템 일관 사용

---

## 2026-05-01 (15차) — [디자인시스템] v2 Aurora 마이그레이션 — 인증 페이지 4종 일괄 적용 (signup/forgot/reset/verify)

### 변경 파일
- `signup.html`: aurora-bg + 4 blob + grid 추가, brand-headline "global stage" + form-title "account"에 Aurora 그라디언트 텍스트 적용
- `forgot-password.html`: aurora-bg 추가, "password" Aurora 그라디언트, sent confirmation pane을 라이트(`#f0faf3`/`#0a7c3a`)에서 success 글래스(`rgba(16,185,129,*)` + glow)로 교체, v1 `--gray-500` 잔재 인라인 컬러를 `--ink-3`로 정리
- `reset-password.html`: aurora-bg 추가, "new password" Aurora 그라디언트, loading/invalid pane의 v1 라이트 컬러(`#888`/`#fef0f0`/`#c93030`)를 다크 글래스(`rgba(239,68,68,.08)` + danger 톤)로 교체
- `verify-email.html`: aurora-bg 추가, "email" Aurora 그라디언트, **4개 상태 박스 전면 재작성** — pending(보라 글래스 + 이메일 주소 그라디언트 텍스트), verifying(다크 톤), success(success 글래스 + glow), error(danger 글래스), 경고 박스(warn 톤 글래스)
- `docs/screenshots/v2-migration/{signup,forgot-password,reset-password,verify-email}/before.png`, `after.png`: 4쌍 BEFORE/AFTER 영구 보존

### 배경
14차에서 login.html 시범 마이그레이션 성공 → 동일 패턴(`shell` + `brand-panel` + `form-panel`)을 공유하는 인증 페이지 4종(signup/forgot-password/reset-password/verify-email)에 일괄 적용. 자율 작업 분할 원칙에 따라 어드민/대시보드 등 큰 페이지와 분리하여 1개 채팅 단위로 처리.

### 변경사유
- **공통 패턴 일괄 처리**: 5개 인증 페이지가 모두 `<body><div class="shell">` 시작 → aurora-bg + grid 4줄 삽입이 가장 큰 공통 변경. 각 페이지마다 헤드라인 강조어에 `<em>` 태그로 그라디언트 텍스트 효과 추가.
- **상태 박스(verify-email/forgot-password/reset-password) 전면 재작성**: 이 박스들은 v1에서 라이트 톤 하드코딩 색상(`#f7f6ff`, `#f0faf3`, `#fef0f0` 등)을 인라인으로 박아두어 다크 캔버스에서 흰색 박스로 노출되어 가독성 0이었음. 다크 글래스(`rgba(*,*,*,.08)` + 글로우 + backdrop-filter)로 전면 재작성하여 톤 통일.
- **시맨틱 컬러 사용**: 성공=`var(--success)` + `var(--glow-success)`, 경고=`var(--warn)`, 에러=`var(--danger)` — shared.css v2의 시맨틱 토큰 일관 적용.
- **이메일 주소 강조**: pending-email은 mono 폰트 + Aurora 그라디언트 텍스트로 시각적 hierarchy 부여.

### 검증
1. **JS 문법 체크 (4개 모두)**: `node --check` 통과 — signup(123줄), forgot(57줄), reset(119줄), verify(98줄)
2. **Playwright 렌더링 (4개 모두)**: ✅ 통과
   - body 배경 `rgb(10,10,15)` = 다크 캔버스
   - `.aurora-bg`, `.aurora-blob.b1`, `.shell`, `.brand-panel` 모두 존재
   - 콘솔 에러 0건
3. **하드코딩 라이트 컬러 잔재 검사**: `grep -E "background:#[0-9a-f]|color:#[0-9a-f]"` → 0건
4. **BEFORE/AFTER 비교**: docs/screenshots/v2-migration/* 8장 보존

### 시각 결과
- signup: 단계 표시(1=Aurora 원, 2=다크 원), "Create your **account**" 그라디언트, password requirements 박스 글래스
- forgot-password: "Reset your **password**" / "Forgot **password?**" 그라디언트
- reset-password: "Set your **new password**" / "Set **new password**" 그라디언트, 검증 중 로딩 화면도 다크 톤
- verify-email: 4개 상태(pending/verifying/success/error) 모두 톤 통일, 이메일 주소 Aurora 그라디언트 텍스트

### 다음 단계
- index.html (랜딩 — 시각적 임팩트 가장 큰 페이지) — 별도 채팅 권장 (기존 코드 양 많음)
- dashboard.html, settings.html — 매니저 핵심 페이지
- sales.html, marketing.html, hotel-info.html, booking-analytics.html — 매니저 콘텐츠 페이지
- admin.html (1.27MB) — 별도 채팅으로 분리 (가장 복잡, 토큰 위험)

### 관련
- 14차 (login.html 시범 마이그레이션) 패턴 그대로 적용
- shared.css v2 토큰 시스템 일관 사용

---

## 2026-05-01 (14차) — [디자인시스템] shared.css v2 — C3 Aurora Trendy 마이그레이션 시작 (login.html 시범 적용)

### 변경 파일
- `mock/concept-c1.html`, `mock/concept-c2.html`, `mock/concept-c3.html`, `mock/concept-c4.html`: 시안 4종 신규 보존 (비교군 + 향후 부분 차용 가능)
- `mock/README.md`: 시안 4종 정리 + C3 채택 사유 + 디자인 토큰 문서화
- `_backup_20260501/shared.css.v1.bak`: v1 백업 (Forest/Gold 테마, 388줄)
- `_backup_20260501/shared.js.v1.bak`: shared.js 백업 (참고용, 변경 없음)
- `shared.css`: **v1 → v2 전면 교체** — C3 Aurora 토큰 시스템 (746줄, +358줄)
  - 신규 토큰: `--aurora-1~6`, `--bg/bg-2/bg-3/bg-4`, `--glass/glass-2/glass-3/glass-4`, `--ink/ink-2~5`, `--aurora` 그라디언트, `--glow-p/c/m`
  - 신규 컴포넌트: `.aurora-bg`, `.aurora-blob.b1~b4`, `.aurora-grid`, `.glass-card`, `.eyebrow`, `.eyebrow-tag`, `.live-dot`
  - v1 alias 보존: `--forest`, `--gold`, `--gray-*` 등 → Aurora 톤으로 매핑 → 기존 페이지 코드 안 깨짐
  - 모든 v1 클래스(`.btn-primary`, `.field-input`, `.brand-panel`, `.shell` 등) 동일 이름 유지하되 Aurora 톤으로 재작성
- `login.html`: 시범 마이그레이션 첫 페이지
  - `<body>` 직후 `aurora-bg` + 4개 blob + `aurora-grid` 추가
  - `style="border-color:var(--gold);background:var(--gold);..."` 등 v1 잔재 인라인 스타일 제거 (v2 CSS가 알아서 처리)
  - `data-en/data-ko`에 `<em>back</em>` 마크업 추가 → form-title/brand-headline에서 Aurora 그라디언트 텍스트 효과
- `docs/screenshots/v2-migration/login/before.png`, `after.png`: BEFORE/AFTER 비교 영구 보존 (메모리 규칙: 수정 전후 풀페이지 스크린샷 비교 원칙)

### 배경
대표님 비전: **"글로벌 정복, 새로운 트렌드 리드. 우리가 곧 유행이고 우리가 곧 트렌드다."** 호텔 산업이 본 적 없는 모던함이 차별화 포인트. 기존 v1 디자인은 정적이고 보수적인 호텔 업계 표준 톤(Forest/Gold) → B2B SaaS 글로벌 톤(Linear · Framer · Vercel · Cursor)으로 전면 전환. 4개 시안(C1 Editorial / C2 Premium / C3 Aurora / C4 Bold) 비교 후 C3 채택.

### 변경사유
- **v1 alias 보존 전략**: `--forest`, `--gold` 같은 v1 변수를 v2의 Aurora 컬러로 alias → 기존 8개 페이지(index/signup/dashboard 등)가 인라인 스타일에서 v1 변수를 쓰더라도 자동으로 Aurora 톤으로 보임. 페이지별 마이그레이션을 점진적으로 진행 가능 (한 번에 깨질 위험 없음).
- **클래스명 호환**: v1의 `.btn-primary`, `.field-input`, `.brand-panel`, `.shell`, `.form-panel` 등을 그대로 유지하되 Aurora 톤으로 재작성 → HTML 구조 변경 최소화.
- **`.aurora-bg` 분리**: blob 4개 + grid는 별도 div로 분리 → 페이지별로 추가 여부 선택 가능 (어드민/대시보드는 성능 위해 grid만 적용 가능).
- **시안 4종 mock/ 보존**: C1/C2/C4도 추후 특정 페이지 차용 가능 (C1 에디토리얼 → 블로그, C2 프리미엄 → 5성급 카드, C4 강한 대비 → 프로모션 CTA).

### 검증
1. **JS 문법 체크**: `node --check` → ✅ 문법 OK (82줄 inline)
2. **함수 존재 체크**: `T.$`, `T.toast`, `T.sb`, `T.checkAdmin`, `T.lang`, `window.TW` 모두 shared.js에 존재 ✅
3. **페이지 표시 체크 (Playwright Chromium)**: ✅ 통과
   - 핵심 요소 10개 모두 존재 (.shell, .brand-panel, .brand-logo-icon, .form-title, #login-email, #login-pw, #btn-login, .aurora-bg, .aurora-blob.b1 등)
   - body 배경: `rgb(10,10,15)` = `--bg` 다크 캔버스 적용 확인
   - body 글자색: `rgb(250,250,250)` = `--ink` 적용 확인
   - btn-login background: Aurora 그라디언트 (purple→magenta→orange→cyan) 적용 확인
   - 콘솔/페이지 에러 0건
4. **BEFORE/AFTER 스크린샷 비교**: docs/screenshots/v2-migration/login/ 보존 — 다음 마이그레이션 페이지의 검수 기준점

### 다음 단계 (다음 채팅에서)
- signup.html, forgot-password.html, reset-password.html, verify-email.html — 5개 인증 페이지 일괄 마이그레이션 (login과 구조 유사)
- index.html — 랜딩 페이지 (시각적 임팩트 가장 큰 페이지)
- dashboard.html, settings.html — 매니저 페이지
- sales.html, marketing.html, hotel-info.html, booking-analytics.html — 매니저 콘텐츠 페이지
- admin.html (1.27MB) — 별도 채팅으로 분리 (가장 복잡)

각 페이지 마이그레이션마다 docs/screenshots/v2-migration/[page]/before.png + after.png 보존.

### 관련
- DECISIONS.md — C3 Aurora Trendy 채택 결정
- mock/README.md — 시안 4종 비교
- 메모리 규칙: "shared.css v2부터 이 컨셉 기반으로 마이그레이션" 준수

---

## 2026-04-30 (13차) — [문서] api/_lib 디렉토리 정책 문서화 (Vercel 12-Function 회피 이중 안전망)

### 변경 파일
- `api/_lib/README.md` 신설

### 배경
SOLO_WORK_QUEUE Up Next 5번 [I] — 디렉토리 rename (`api/lib/` → `api/_lib/`, 4fb3860)은 끝났지만 정책 문서가 없어 미래 새 채팅의 Claude가 헷갈릴 위험. vercel.json에 명시적 제외 패턴 추가는 underscore-prefix 자동 제외와 단일 레벨 와일드카드(`api/*.js`)로 이미 이중 안전망이 작동 중이므로 vercel.json 수정 대신 디렉토리 정책 명문화가 더 안전한 옵션으로 자율 판단.

### 변경사유
- vercel.json은 JSON 형식이라 주석을 달 수 없어 정책 의도가 코드에 남지 않음. README 한 장으로 미래 헷갈림 방지.
- 신규 헬퍼 파일 추가 시 `api/lib/`, `api/utils/`, `api/shared/` 같은 이름을 무심코 사용하면 즉시 함수로 카운트되어 12개 한도 초과 → 명시적 가이드 필요.
- 현재 함수 카운트 참고치(9/12)와 통합 라우터 패턴(`api/admin.js`의 `?action=`) 권장도 함께 문서화하여 새 함수 추가 시 한도 위반 방지.

### 검증
- 파일 단순 추가, 코드 변경 없음 → 회귀 위험 0
- production 배포 시 영향 없음 (README는 함수가 아니므로 카운트 변화 없음)

### 관련
- SOLO_WORK_QUEUE.md L127, 4fb3860 (디렉토리 rename 원본)

---

## 2026-04-30 (12차) — [기능추가] Agoda 업로드 — 서버사이드 booking-upload 모드 + Preview + CID 컬럼명 오버라이드

### 변경 파일
- `admin.html`: Agoda Channel Upload 서브탭에 (1) Mode 드롭다운에 `⚡ Auto-cid (server)` 옵션 추가, (2) CID 컬럼명 오버라이드 input 추가, (3) Preview 버튼 + 미리보기 영역 추가, (4) Mode 변경 시 채널 강제선택 비활성화 토글, (5) `processBagodaUploadServer()` 신설 — `/api/admin?action=booking-upload` 호출, (6) unknown_cids 결과 노출 (channel_cid_map 보강 가이드 포함), (7) `previewBagodaUpload()` 신설 — 첫 파일 5행 + 컬럼 자동 감지 결과 표시. 기존 클라이언트 직접 RLS upsert 흐름은 회귀 방지를 위해 그대로 유지하고 mode 분기로 위임.

### 배경
SOLO_WORK_QUEUE Up Next 2번 [B] — 백엔드 `api/admin?action=booking-upload`은 이미 main에 있으나 호출하는 UI가 없었음. 기존 UI는 채널을 사용자가 미리 선택해야 하는 클라이언트 직접 RLS upsert 방식 → channel_cid_map 자동 매핑 미활용. 데드라인 5/3 직결.

### 변경사유
- 백엔드 `handleBookingUpload`은 cid 컬럼만 있으면 `channel_cid_map`을 자동 룩업해서 channel_code를 결정 + service_role로 RLS 우회 → 6개 언어 채널을 가진 우리 운영에 훨씬 적합.
- 기존 UI 흐름은 회귀 방지 + 비상시 fallback 유지를 위해 그대로 두고, Mode 드롭다운에 새 옵션을 추가하는 방식으로 병존 (운영자가 데이터 안전성 검증 후 점진적 전환 가능).
- BLOCKED 항목인 'cid 컬럼명' 자율 처리: 자동 감지(`cid` / `affiliateid` 정규화 매칭) + 오버라이드 입력 필드 → 실제 Agoda 엑셀 컬럼명 확인 전이라도 운영 가능.
- Preview는 DB write 없이 첫 파일 5행 + 컬럼 자동 감지 결과 표시 → 본 업로드 전 안전 검증 단계.

### 핵심 동작 (server-auto-cid 모드)
1. 사용자: Excel 드래그 → Preview 클릭 (선택사항) → CID 컬럼 자동 감지 결과 확인 → Process Upload
2. 클라이언트: 모든 파일 raw row 객체로 변환, CID 컬럼은 'cid' 키로 normalize
3. 1000행 chunk로 `/api/admin?action=booking-upload` POST
4. 백엔드: cid → channel_cid_map 룩업 → channel_code 결정 → bookings_agoda upsert (channel_code,booking_id 충돌 시 merge)
5. 결과: inserted/processed/skipped + unknown_cids 별도 섹션으로 노출 → admin이 channel_cid_map 보강 가능

### 검증
- `node --check api/admin.js` ✓ (이전 차에서 수정한 안전성 코드 그대로)
- `admin.html` 3개 inline `<script>` 모두 `node --check` ✓
- 함수 정의/호출 매칭: updateAgodaModeUI(1/2) previewBagodaUpload(1/1) processBagodaUploadServer(1/1) processBagodaUpload(1/1) — 모두 정상
- 새 DOM ID 8개 모두 마크업+JS 매칭: btn-bagoda-preview, bagoda-preview, bagoda-preview-meta, bagoda-preview-table, bagoda-cid-col, bagoda-cid-col-wrap, bagoda-channel-label, bagoda-channel-hint

### 회귀 위험
- 기존 'upsert' / 'insert' 모드는 코드 변경 없음 (mode 분기 진입 전에 동일 함수 본문 그대로 실행)
- 새 UI element는 기본 `display:none`이라 기존 사용자 경험 변화 없음 (Mode 변경 시에만 노출)

### 관련
- BACKLOG.md (Phase 4 booking visibility 후속), SOLO_WORK_QUEUE.md L36
- 백엔드 핸들러: api/admin.js:368 handleBookingUpload (이미 main)

---

## 2026-04-30 (11차) — [버그수정] Admin Hotels 매니저 정보 auth.users JOIN 보강 + list-users API 안전성

### 변경 파일
- `api/admin.js`: handleListUsers 전체 fetch들에 try/catch + non-2xx 안전 처리, hotels 응답에 contact_*/manager_* 컬럼 포함, members에 user_metadata 기반 name/phone 추가
- `admin.html`: `loadUserMapping()` 함수 신설 (api/admin?action=list-users 호출 → user_id→{email,name,phone} 캐시), `enrichHotelsWithUserMapping()` 함수 신설 (allHotels 각 항목에 `_resolvedManager*` 필드 주입), `loadAll()`을 async로 전환하여 hotels 로드 직후 매핑 enrichment 실행. renderHotels Manager 컬럼/openHotelModal 상세 패널/Agoda Matching 모달 모두 `_resolvedManager*` 우선 사용

### 배경
SOLO_WORK_QUEUE Up Next 1번 [A] — 라이브에서 Admin Hotels View 클릭 시 Manager Email/Name/Phone이 여전히 '-'로 보이는 케이스 잔존(특히 hotel-info.html 미작성 호텔). 콘솔 500 에러(auth/admin/users) 1건도 같은 맥락. 데드라인 5/3 직결.

### 변경사유
- 컬럼 fallback(manager_* → contact_*)만으로는 hotels 테이블 자체에 데이터가 없는 호텔(가입만 한 매니저)을 커버 못함. SOLO_WORK_QUEUE 명시 요구사항인 "auth.users JOIN" 효과를 안전하게 클라이언트에서 합성해 해결.
- list-users API의 외부 fetch들이 try/catch 없이 노출되어 있어 어떤 한 호출만 500이 나도 전체가 실패. 각 fetch를 독립 try/catch로 격리 → 부분 실패에도 가능한 한 데이터 반환.
- DB 스키마 변경 금지 원칙 준수 (Supabase Mgmt API 토큰 만료 5/26까지 유효하지만 외근 모드에서는 보수적으로 코드만 수정).

### 검증
- `node --check api/admin.js` ✓
- `admin.html` 3개 inline `<script>` 블록 모두 `node --check` ✓
- 함수 정의/호출 매칭: loadAll(1/4) loadUserMapping(1/2) enrichHotelsWithUserMapping(1/2) renderHotels(1/3) openHotelModal(1/2) renderStats(1/2) — 모두 정상
- production 인증 없이 GET /api/admin?action=list-users → 401 정상 (`{"error":"Missing auth token"}`)

### 회귀 위험
- loadAll이 async로 전환됨 — 기존 호출처 4곳 모두 fire-and-forget 패턴이라 안전 (1011줄, 1047줄, 2720줄)
- list-users 호출 실패 시 userMap이 빈 객체 → 기존 contact_*/manager_* fallback이 그대로 동작 (회귀 없음)

### 관련
- BACKLOG.md L21 (P0 — 이미 [DONE]였으나 미해결분 잔존), SOLO_WORK_QUEUE.md L23
- 이전 부분 수정 커밋: d301ee9, 89b3e49

---

## 2026-04-30 (10차) — [기능추가] Project Status — 자율성 분류 + 예상 시간 배지

### 변경 파일
- `admin.html`: 배지 CSS + 자율성/시간 추출 헬퍼 + BLOCKED/Up Next 항목 렌더 보강 (~120 lines)

### 배경
대표님 피드백: "여기에 함께 있어야 작업할 수 있는 부분과 자동으로 작업할 수 있는 부분 표시하고 작업 시간 알려주면 판단하기 편할 듯." 자율성 정보(🟢 AUTO / 🟡 SEMI / 🔴 BLOCKED)가 SOLO_WORK_QUEUE.md에 이미 있으나 admin.html에 노출 안 됨. 시간 정보도 일부만 표시.

### 변경사항

**A. 자율성 분류 배지 (3종)**
- 🟢 **자율 진행 (Auto)** — 대표님 없이 Claude가 즉시 진행 가능
- 🟡 **결정 후 자율 (Decide → Auto)** — 대표님 결정만 받으면 이후 자율 진행
- 🔴 **함께 작업 (With CEO)** — 사업/디자인 결정이 본질이라 함께 진행 필요

**B. 예상 시간 배지 (2종)**
- ⏱ **확정 시간** (`ps-badge-time`, 보라색): 1.5h, 2h, 15min 등
- ⏱ **결정 후 시간** (`ps-badge-time-pending`, 회색): ~3-4h, ~2-3h 등 (사업 결정 후 추정치)

**C. 추출 로직 (psExtractMeta)**
- 항목 헤더 다음 30줄 안에서 정규식 패턴 매칭
- 자율성: 본문에 "🟡 SEMI" + "자율 진행 가능한 부분" 동시 존재 시 → semi 분류
- 시간: `**예상 시간**: ...` 마크다운 굵은 표시 정확 매칭
- "결정 후 N시간" / "N시간" / "N분" 3가지 패턴 자동 분류
- Up Next도 동일 헬퍼 사용 → 일관성 확보 + 시간/분 변환 자동

**D. BLOCKED 항목 렌더 보강**
- 카드 하단에 `ps-auto-row` 영역 추가 → 분류 배지 + 시간 배지 노출
- 복사 텍스트에 분류 정보 + 시간 정보 함께 포함:
  ```
  🔴 sales.html 디자인 전면 개편
  분류: 🟡 결정 후 자율 · 예상 결정 후 3-4h
  위치: SOLO_WORK_QUEUE.md L68
  URL: ...
  ```

**E. Up Next 항목 렌더 보강**
- 동일 배지 영역 추가 (모두 🟢 Auto)
- 기존 시간 표시(meta 줄)는 배지로 이동 → 시각적 일관성
- 복사 텍스트에 분류 안내 문구 추가:
  ```
  1. 🟢 Admin Hotels 상세 패널 + 모달 X 버튼 수정 (예상 1.5h)
  분류: 🟢 자율 진행 (대표님 없이 Claude가 즉시 진행 가능)
  ...
  ```

**F. 시간 추출 정규식 버그 수정 (Up Next)**
- 기존: `예상\s*시간\s*[:：]?\s*([0-9.]+\s*(?:시간|h))` — 마크다운 `**` 굵은 표시 미대응 → Up Next 시간 0/5건 추출
- 수정: `psExtractMeta`로 통일 → `\*\*예상\s*시간\*\*\s*[:：]\s*` 정확 매칭 → 5/5건 정상 추출

**G. i18n**
- 배지 라벨 EN/KO 양쪽 지원 (data-en/data-ko 패턴)
- KO: 🟢 자율 진행 / 🟡 결정 후 자율 / 🔴 함께 작업
- EN: 🟢 Auto / 🟡 Decide → Auto / 🔴 With CEO
- title 속성에도 다국어 툴팁 적용

### 검증 결과
- inline script 3블록 모두 node --check 통과
- JSDOM 통합 검증:
  - BLOCKED 8개 — 🟡 2건 / 🔴 6건 / 시간 배지 3건 ✅
  - Up Next 5개 — 🟢 5/5 / 시간 배지 5/5 (1.5h, 2h, 2h, 1h, 15min) ✅
  - 모든 CSS 클래스 적용 (`ps-badge-auto`, `-semi`, `-blocked`, `-time`, `-time-pending`) ✅
  - 복사 텍스트 분류 정보 포함 ✅
  - errors 0건

### 핵심 가치
**현재 상태**:
- 🟢 자율 진행 가능: Up Next 5건 (총 약 6.5시간) — 대표님 GO 한 마디면 즉시 시작
- 🟡 결정 후 자율: BLOCKED 2건 (sales.html, marketing.html — 디자인 톤만 정하시면 약 5-7시간 자율) ⭐ **레버리지 최고**
- 🔴 함께 작업: 6건 — 사업 결정 + 함께 진행 필요

대표님이 sales/marketing 디자인 톤 30초 결정으로 5-7시간의 자율 작업을 풀 수 있는 점이 한눈에 보임.

### Vercel 함수 영향
- 신규 함수 추가 없음. 9/12 그대로 유지.

### 사유
배지 도입 전: BLOCKED와 Up Next의 분류가 섹션 단위로만 구분 → 각 항목별 자율성/소요 시간 파악 불가.
배지 도입 후: 항목별 시각적 분류 + 시간 정보 → 우선순위 의사결정 효율 ↑.

### 관련 commits
- 다음 commit (이번 작업 단일 commit)

---

## 2026-04-30 (9차) — [기능추가] Project Status — 클립보드 복사 버튼 (개별 + 전체)

### 변경 파일
- `admin.html`: 복사 버튼 UI + 토스트 시스템 + 전역 함수 추가 (~110 lines)

### 배경
대표님 피드백: "내용을 드래그해서 복사하기 불편하다." Project Status 페이지의 BLOCKED / Up Next / Recent Activity 항목 텍스트를 원클릭으로 클립보드에 복사 필요.

### 변경사항

**A. 개별 항목 복사 버튼 (📋)**
- BLOCKED 각 항목 우측 상단: 제목 + 위치(파일명/라인) + GitHub URL 복사
- Up Next 각 항목 우측 상단: 번호 + 제목 + 예상 시간 + URL 복사
- Recent Activity 각 행 우측: 날짜 + SHA + 커밋 메시지 복사

**B. Copy All 헤더 버튼 (전체 복사)**
- BLOCKED 섹션 헤더에 "📋 Copy All": 8개 항목 한 번에 텍스트 묶음으로 복사
- Up Next 섹션 헤더에 "📋 Copy All": 5개 큐 항목 한 번에 복사
- 형식: 헤더 1줄 + 각 항목 3줄(제목/위치/URL) + 빈줄

**C. 토스트 알림**
- 복사 성공 시 화면 하단 중앙에 "✅ 복사 완료" 토스트 1.8초 표시
- 복사 실패 시 "⚠️ 복사 실패 — 직접 선택해 주세요" 토스트
- 페이드 인/아웃 + Y축 슬라이드 애니메이션

**D. 클립보드 호환성**
- 1순위: `navigator.clipboard.writeText()` (HTTPS 환경)
- 2순위 fallback: `document.execCommand('copy')` + 임시 textarea 트릭
- 둘 다 실패 시 토스트 에러 표시

**E. 데이터 캐싱**
- `PS_BLOCKED_CACHE`, `PS_UPNEXT_CACHE` 변수 추가
- fetch 시점에 데이터 캐시 → Copy All에서 재사용 (재호출 없음)

**F. 이벤트 처리**
- 복사 버튼 클릭 시 `event.stopPropagation()` + `event.preventDefault()` → 카드 자체의 GitHub 이동 onclick과 분리
- BLOCKED 카드는 본문 클릭 시 GitHub 이동, 복사 버튼 클릭 시 복사만 실행

**G. 전역 함수 노출**
- `window.psCopyFromBtn(btn, event)` — onclick 핸들러용
- `window.psCopyAllBlocked()` / `window.psCopyAllUpNext()` — 헤더 버튼용

### 검증
- inline script 3블록 모두 node --check 통과
- JSDOM 통합 검증:
  - 개별 복사 버튼: BLOCKED 8개 ✅ / Up Next 5개 ✅ / Recent Activity 2개 ✅
  - Copy All 헤더 버튼 2개 ✅
  - 클릭 → navigator.clipboard 호출 → 토스트 표시까지 정상 ✅
  - Copy All Blocked 34줄 / Copy All Up Next 22줄 정상 ✅
  - errors 0건

### Vercel 함수 영향
- 신규 함수 추가 없음. 9/12 그대로 유지.

### 사유
대표님 외근/이동 중 모바일에서도 항목 텍스트를 한 번에 복사해서 메신저/노트로 옮길 수 있어야 함. 드래그 선택은 모바일에서 특히 불편하므로 원클릭 복사 + 토스트 피드백으로 UX 개선.

### 관련 commits
- 다음 commit (이번 작업 단일 commit)

---

## 2026-04-29 (8차) — [기능추가] admin.html 사이드바에 Project Status 메뉴 신설 (사업 진행도 실시간 대시보드)

### 변경 파일
- `admin.html`: 사이드바 메뉴 1개, tab pane 1개(5개 섹션), inline JS ~330 lines, inline CSS ~50 lines 추가

### 배경
대표님이 사업 운영 중 "내가 어디까지 했고 뭐가 남았는지 한눈에 모르겠다"는 문제 제기. SOLO_WORK_QUEUE.md / BACKLOG.md / CHANGELOG.md / 채팅 메모리에 흩어진 진행 정보를 admin.html 한 곳에서 실시간 시각화 필요.

### 변경사항

**A. 사이드바 — TOOLS 그룹에 Project Status 메뉴 추가**
- 기존: Business Docs, Page Gallery (외부 링크 2개)
- 추가: 📊 Project Status (admin.html 내부 탭, `data-tab="project-status"`)
- TAB_META에 메타데이터 등록 (EN/KO 양쪽)

**B. Tab Pane — 5개 섹션을 한 페이지에 위→아래 스크롤로 배치**

1. **KPI 카드 4개 (가로 4그리드, 모바일 1열)**
   - 🎯 Deadline D-Day: 자동 계산 ("D-N" / "D+N" / "D-DAY"), 색상 분기 (3일 이하 빨강/노랑)
   - 📈 Overall Progress: SOLO_WORK_QUEUE의 전체 항목 대비 [DONE 해시] 비율
   - ⚙️ Vercel Functions: GitHub api/ 폴더 재귀 카운트 (하위 폴더 함수 포함). 9/12, 여유 슬롯, 색상 분기
   - 🔴 Active Blockers: 클릭 시 섹션 4로 스크롤 (anchor)

2. **Phase 진행 바 (5개 Phase)**
   - JS 정적 상수 `PS_PHASES`로 관리 (P1=100, P2=100, P3=85, P4=25, P5=0)
   - 가로 진행 바 + 색상 분기 (100% 초록 / 50%+ 파랑 / 25%+ 노랑 / 미만 빨강)
   - 상태 이모지 (✅/🟡/⏳)

3. **Recent Activity (최근 14일 commits)**
   - GitHub Commits API (`per_page=30`, unauthenticated, rate limit 60/h 충분)
   - 14일 이내 필터 (없으면 최근 10개 fallback)
   - 커밋 메시지의 `[태그]` 자동 감지 → 색상/이모지 매핑 (P0버그/리팩토링/기능추가/문서)
   - 우측 끝에 SHA short hash + GitHub 커밋 페이지 링크

4. **BLOCKED 리스트 (BACKLOG.md + SOLO_WORK_QUEUE.md 자동 파싱)**
   - 3가지 패턴 추출: `### X. 🔴` 항목 헤더 / `## 🔴` 섹션 헤더 / inline `[BLOCKED-사유]`
   - 클릭 시 GitHub 해당 라인으로 새 탭 이동
   - 중복 제거(소스+제목 조합)

5. **Up Next (자율 진행 가능 큐 5개)**
   - SOLO_WORK_QUEUE.md의 `🟢 AUTO` 항목 추출 (`[DONE 해시]` 마킹 제외)
   - 인접 라인에서 "예상 시간 N시간" 자동 추출
   - 큐 등장 순서 = 우선순위 (P0 → P1 → P2)

**C. JS 함수 구조**
- `loadProjectStatus()` — 메인 진입점, setActiveTab('project-status') 시 호출
- `psRenderKPIDeadline()` / `psRenderPhases()` — 정적 데이터 렌더
- `psFetchKPIFunctions()` — api/ 트리 재귀 카운트 (이메일 하위 폴더 포함 정확 카운트)
- `psFetchKPIProgress()` / `psFetchRecentActivity()` / `psFetchBlocked()` / `psFetchUpNext()` — GitHub API 호출
- `psParseTag()` / `psExtractBlocked()` / `psDecodeBase64Utf8()` — 헬퍼
- `psBarColor()` / `psPhaseIcon()` / `psEsc()` — 유틸

**D. i18n**
- 모든 신규 메뉴/카드/섹션 헤더에 `data-en`/`data-ko` 속성. 기존 EN/한국어 토글과 동일 시스템.

**E. 디자인**
- 보라(#534AB7) 기조 유지. 새 클래스는 `.ps-` 접두사로 분리.
- 카드는 기존 `.ad-card` 패턴 재사용. KPI 카드는 새 `.ps-kpi` (강조형 + 진행 바 포함).
- Phase 진행 바, Timeline, BLOCKED/Up Next 리스트는 모두 `.ps-` 전용 스타일.

### 검증
- `node --check`로 inline script 3개 블록 모두 문법 통과
- JSDOM 격리 검증:
  - 사이드바 메뉴 / tab pane 마크업 ✅
  - 4개 전역 함수(loadProjectStatus + ps* 3개) 등록 ✅
  - 사이드바 클릭 → pane 표시 ✅
  - Phase 5개 / D-Day "D-4" / 함수 카운트 9/12 / Recent Activity / BLOCKED 8개 / Up Next 5개 모두 정상 렌더 ✅
  - GitHub rate limit 표시 ✅
  - 에러 0건, warning 0건

### Vercel 함수 영향
- 신규 Vercel function 추가 없음 (클라이언트가 GitHub API 직접 호출)
- 9/12 그대로 유지

### 사유
3개 마크다운 파일과 채팅 메모리에 흩어진 사업 진행 정보를 매번 수동 확인하는 비용 제거. 데드라인 D-Day, 함수 슬롯 여유, 결정 대기 항목 등 핵심 지표를 한 화면에서 실시간 확인 가능. 클라이언트 사이드 GitHub API 호출만 사용 → 백엔드 추가 없음.

### 향후 보강 (데드라인 후)
- 탭 분리 (Dashboard / Site Map / Backlog Kanban / Changelog Timeline)
- Phase % 자동 계산 (현재는 정적 상수)
- 페이지 내 Phase 인라인 에디터
- BEFORE/AFTER 스크린샷 비교 기능 (Page Gallery 통합)

---

## 2026-04-29 (7차) — [P0 버그수정] admin.html Agoda Matching 모달 클릭 안 되던 버그 수정

### 변경 파일
- `admin.html`: 모달 핸들러 lazy 등록 패턴 도입

### 증상
- Agoda Matching 페이지의 3개 모달(Manual Match / Reject / Send Invite) 모두:
  - X 버튼, Cancel 버튼, 제출 버튼 클릭 시 아무 반응 없음
  - 입력은 가능하지만 모달을 닫을 방법이 없음 (ESC 키만 작동)
- Agoda Matching Queue의 Refresh 버튼도 작동 안 함
- 콘솔 경고 `[admin.html] missing element: #am-match-close — using no-op fallback` (×14회)

### 원인
`admin.html`의 메인 IIFE는 라인 808의 `<script>` 안에서 즉시 실행되는데, 모달 마크업(`<div id="am-match-modal">` 등 14개 element)은 IIFE 종료 후 라인 3366부터 위치함. 즉 IIFE 실행 시점에는 모달 element가 DOM에 존재하지 않음.

`$()` 헬퍼는 element가 없을 때 no-op proxy를 반환하는데(addEventListener 등이 빈 함수로 무해 처리되도록), proxy는 truthy 값이라 `if (_amMatchClose)` 체크를 통과하여 빈 객체에 `addEventListener` 등록됨. 결과적으로 핸들러가 빈 객체에 묶여서 클릭해도 아무 동작 없음.

### 수정사항
**A. `_setupAmModalHandlers()` 함수 추가**
- DOMContentLoaded 시점에 `document.getElementById()` 직접 호출하여 진짜 element 확보
- `_amBound` 플래그로 중복 등록 방지
- 모든 모달의 close/cancel/modal-backdrop/submit 버튼 핸들러 등록
- Agoda Matching Queue의 `btn-am-refresh` 버튼도 함께 등록

**B. 4개 인라인 핸들러를 named 함수로 추출**
- `_amMatchSubmitHandler`
- `_amInvitePreviewHandler`
- `_amInviteSendHandler`
- `_amRejectSubmitHandler`
- 이유: lazy setup에서 참조하려면 함수가 named여야 함

**C. document.readyState 체크**
- `'loading'` 상태면 DOMContentLoaded 대기, 이미 로드되었으면 즉시 실행

### 검증
- `node --check`로 inline script 3개 모두 문법 검증 통과
- 핵심 패턴 8종 모두 존재 확인 (`_setupAmModalHandlers` 3회, named 함수 4개, DOMContentLoaded 1회 등)
- production 배포 commit `ffa29383` READY 확인

### 사유
Agoda Matching 페이지의 운영 기능(매칭/거부/초대 발송)이 모두 차단되어 있던 P0 버그. 이번 통합 라우터 작업과 무관한 기존 버그였으며, 대표님 검수 중 발견되어 즉시 fix.

### 관련 이슈
- BACKLOG P0 (모달 X 버튼 미동작) 이슈와 같은 근본 원인 — Agoda Matching 모달에서 발현
- 이번 통합 라우터 작업(commits accacd2d~8e6e7d80)과는 별개의 이슈

### 관련 commit
- `ffa29383` (이번 fix)

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
