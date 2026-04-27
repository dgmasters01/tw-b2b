# TW-B2B Phase 3 — Booking Analytics 네이티브 통합 & 호텔 매니저 자동 연동

> **이 문서는 Phase 3 작업의 단계별 인수인계 문서입니다.**
> 새 채팅에서 작업을 이어가려면: `tw-b2b PHASE3.md 읽고 Step [N] 작업해줘`

**작성일**: 2026-04-27
**현재 단계**: Planning 완료 / Step 1 대기
**작업자**: Claude (Anthropic) + 이지형 대표
**선행 문서**: PHASE2.md (Step 1, 2 완료)

---

## 0. PHASE 3 OVERVIEW

### 배경
Phase 2 Step 1·2 완료 후 실사용 중 추가 이슈 발견.

| # | 이슈 | 영향도 |
|---|------|--------|
| 1 | **iframe 임베드 + 스크롤 시 상단 헤더 사라짐** — 스크롤하면 admin 상단 페이지 헤더(page-title/page-sub)가 시야에서 사라지고, iframe 내부 분석 페이지 헤더만 남아 통일성 무너짐 | 🔴 투자자 데모 부적합 |
| 2 | **iframe = 별도 페이지** — 사이드바 메뉴(fixed)는 보이지만 admin의 통합 페이지 헤더와 iframe 내부 헤더가 시각적으로 분리되어 "한 화면" 느낌이 안 남 | 🔴 디자인 통일성 |
| 3 | **iframe 통신 비효율** — admin과 booking-analytics가 같은 supabase-js·shared.js를 각각 로드 (이중 초기화, 데이터 중복 fetch 가능성) | 🟡 성능/유지보수 |
| 4 | **호텔 매니저 가입 → 5개 화면 자동 연동 미검증** — 매니저가 hotel-info.html 작성 시 admin Members/Hotels/Analytics B2B 호텔상세/Analytics 성급차트/매니저 본인 dashboard 5곳에 즉시 반영되어야 하나 일부 화면(특히 Analytics 측)은 페이지 새로고침 또는 캐시 초기화가 필요 | 🔴 핵심 데이터 흐름 |

### 결정 사항
1. **booking-analytics를 admin.html에 네이티브 통합** — iframe 제거, JS/CSS/DOM을 admin 안으로 흡수
2. **Phase 2 Step 3(매칭 정확도) + Step 4(i18n)을 Phase 3에 흡수** — 어차피 통합 후 다시 만져야 하므로 한 번에 처리
3. **호텔 매니저 자동 연동 5개 화면 일관성 보장** — 모든 화면이 동일한 hotels 캐시 또는 단일 fetch 함수를 공유
4. **계획 단계(오늘) = 코드 변경 0줄, push 0회** — PHASE3.md만 작성하여 단계 확정

---

## 1. 통합 가능성 사전 검증 (오늘 분석 완료)

booking-analytics.html(1MB, 326줄) ↔ admin.html(97KB, 1,979줄) 의존성 매핑 결과.

### 1-1. 네이티브 통합 가능 여부: ✅ 매우 안전

| 검증 항목 | 결과 | 메모 |
|-----------|------|------|
| **변수명 충돌** | ⚠️ 10개 (`ci/co/data/dd/filtered/h/q/s/status/wb`) | 모두 `var` 함수 내 지역 — IIFE로 감싸면 0건 |
| **함수명 충돌** | ✅ 0개 | 완전 분리 (booking은 `rOv/rCh/rCo/rCi/rHo/rPa/rSt/rSa` 등 짧은 명명) |
| **글로벌 객체** | ⚠️ `TW`(공유, OK), `DS`(booking 전용) | DS는 IIFE 내부로 캡슐화 가능 |
| **CSS 변수** | ✅ 100% 동일 (`--ac/--bd/--bg/--bl/--cd/--cr/--ht/--sb/--tl/--tx`) | 같은 디자인 토큰 공유 |
| **CSS 클래스** | ✅ 0개 충돌 | booking은 한 글자 명명(`.W .H .G .S .T .C .tb`), admin은 `.ad-*` 접두사 |
| **DOM ID** | ✅ 0개 충돌 | booking ID 17개 모두 admin과 겹치지 않음 |
| **외부 라이브러리** | ✅ Chart.js 4.4.0 + supabase-js + shared.js | admin도 모두 로드 중 (중복 제거 필요) |

### 1-2. booking-analytics 핵심 구조 (인벤토리)

**전역 변수 64개 / 함수 45개 / Chart.js 인스턴스 6개 / 탭 8개 / 라우팅 = hash 기반 + DS 객체**

#### 라우팅 시스템 (해시 기반)
```javascript
// CT = Current Tab (overview/channel/country/city/hotel/pattern/stars/sales)
// DS = Drill State (드릴다운 상태 객체, JSON 직렬화 → URL hash)
// HP = Hotel Page (페이지네이션)
// CV = Current View

function loadURL(){
  var h = location.hash.slice(1);
  if(!h){CT='overview'; DS={}; HP=0; return}
  var p = h.split('/');
  CT = p[0] || 'overview';
  try { DS = p[1] ? JSON.parse(decodeURIComponent(p[1])) : {} } catch(e) { DS={} }
}
function syncURL(){
  var h = '#' + CT;
  if(DS && Object.keys(DS).length) h += '/' + encodeURIComponent(JSON.stringify(DS));
  if(location.hash !== h){ try{ history.pushState({CT:CT, DS:DS}, '', h) }catch(e){} }
}
function rr(){  // re-render
  var el = document.getElementById('ct');
  switch(CT){
    case 'overview': el.innerHTML = rOv(); iOC(); break;
    case 'channel':  el.innerHTML = rCh(); iCC(); break;
    case 'country':  el.innerHTML = rCo(); break;
    case 'city':     el.innerHTML = rCi(); break;
    case 'hotel':    el.innerHTML = rHo(); break;
    case 'pattern':  el.innerHTML = rPa(); iPC(); break;
    case 'stars':    el.innerHTML = rSt(); iSC(); break;
    case 'sales':    el.innerHTML = rSa(); break;
  }
}
function dc(){ ch_.forEach(c=>c.destroy()); ch_=[] }  // destroy charts
function sT(id){ CT=id; DS={}; HP=0; iT(); dc(); rr() }  // switch tab
```

⚠️ **충돌 위험 — `location.hash`**: admin도 `setActiveTab(tab)`을 쓰지만 hash를 안 씀.
booking이 `#analytics` 또는 `#analytics/overview/{...}` 형태로 hash를 쓰면 두 시스템이 충돌 없이 공존 가능 (Step 2에서 namespace 처리).

#### Chart.js 인스턴스 생명주기
```
6개 canvas: #c1 #c2 #cp #dm2 #dw #sc
인스턴스 추적: ch_ 배열 (let ch_ = [])
탭 전환 시: dc() → ch_.forEach(c=>c.destroy()) → ch_=[]
새 차트: ch_.push(new Chart(...))
```
→ admin 통합 후에도 그대로 유지 가능. 단, admin의 다른 탭으로 이동 시에도 `dc()` 호출 보장 필요.

#### Drill 상태 (DS) 케이스
```
DS = {} (루트)
DS = { co: 'KR' } (국가)
DS = { ci: 'Seoul' } (도시)
DS = { ht: 'Hotel A' } (호텔)
DS = { b2bCi: {ci, co} } (B2B 도시)
DS = { b2bHt: {h, ci, co} } (B2B 호텔 상세) ← 호텔 정보 영역
DS = { cd_ci: {ci, co} } (채널 드릴다운 도시)
DS = { cd_ht: 'Hotel A' } (채널 드릴다운 호텔)
DS = { h_ht: {h, ci, co} } (호텔 탭 상세)
DS = { patCi, patHt, patCo, patYM } (패턴/캘린더)
```
26개 onclick 핸들러가 모두 `DS = {...}; dc(); rr()` 패턴 → 통합 후에도 그대로 동작.

#### Phase 2에서 추가된 후크 (보존 필요)
```javascript
// rr 함수 wrapping (Phase 2 Step 2)
var _rr_orig = rr;
function rr(){ _rr_orig(); fillHotelInfo(); syncStarRatings(); }

// 페이지 로드 후 200ms
setTimeout(syncStarRatings, 200);

// hotels 캐시
var _hotelsCache = null;
async function loadHotels(){ if(!_hotelsCache) _hotelsCache = await TW.db.getAllHotels(); return _hotelsCache; }
```

### 1-3. admin.html 통합 지점

| 항목 | 현재 위치 | Phase 3 후 |
|------|-----------|-----------|
| Analytics 탭 마운트 | `<div id="tab-analytics">` 안에 `<iframe id="bka-iframe" src="booking-analytics.html">` | `<div id="tab-analytics">` 안에 booking 콘텐츠가 직접 마운트 |
| Chart.js | iframe 안에서 로드 | admin에서 1회 로드 (이미 booking이 같은 버전 4.4.0 사용) |
| supabase-js | iframe 안에서 별도 로드 | admin이 이미 로드 중 → 제거 |
| shared.js | iframe 안에서 별도 로드 | admin이 이미 로드 중 → 제거 |
| 탭 전환 hook | `setActiveTab('analytics')` 시 `window.initAnalytics()` 호출 (현재 빈 함수) | `setActiveTab('analytics')` 시 booking 모듈 init() 1회 + 마운트 시 `iT(); rr()` |

---

## 2. 호텔 매니저 가입 → 5개 화면 자동 연동 체인

### 2-1. 데이터 흐름 (current state)

```
[1] signup.html (signUp → emailRedirectTo: /verify-email)
        │
        ▼ Supabase Auth 메일 인증
[2] verify-email.html (Resend SMTP, gohotelwinners.com)
        │
        ▼ "Get Started" 클릭
[3] hotel-info.html
    └─ T.db.createHotel({...status:'pending', user_id:auth.uid()})
        │  → INSERT INTO hotels (RLS: user_id = auth.uid())
        ▼
[4] hotels 테이블 row 생성 (status='pending')
        │
        ├──── [A] 매니저 본인 dashboard.html (T.db.getMyHotels())
        │
        └──── 관리자/B2B 화면 자동 반영 (관리자 RLS: is_admin())
              │
              ├── [B] admin Members 탭 — /api/admin-list-users (서버 사이드)
              ├── [C] admin Hotels 탭 — T.db.getAllHotels()
              ├── [D] booking-analytics B2B 호텔 상세 (rHtD/fillHotelInfo)
              └── [E] booking-analytics 성급별 차트 (rSt/syncStarRatings)
```

### 2-2. 5개 화면별 매칭 키 & 갱신 시점

| # | 화면 | 매칭 키 | 갱신 트리거 | 현재 상태 |
|---|------|---------|------------|-----------|
| A | dashboard.html (매니저 본인) | `user_id = auth.uid()` (RLS) | 페이지 로드 시 | ✅ Phase 2 이전 완료 |
| B | admin Members 탭 | service-role API로 auth.users + hotels JOIN | "Refresh" 버튼 또는 탭 진입 시 | ✅ admin-list-users.js 구현됨 |
| C | admin Hotels 탭 | `T.db.getAllHotels()` (admin은 RLS 통과) | 탭 진입 시 + Refresh 버튼 | ✅ Phase 1 완료 |
| D | booking-analytics B2B 호텔 상세 (`rHtD`) | `findHotel(name, city, country)` — 1순위 hotel_name 정확, 2순위 city + 부분일치 | `rr()` 후크 → `fillHotelInfo()` | ⚠️ Phase 2 Step 2 완료, 단 매칭률 미검증 |
| E | booking-analytics 성급별 차트 (`rSt`) | 동일 매칭 키 + `star_rating` 라이브 오버라이드 | 페이지 로드 200ms 후 + `rr()` 후크 | ⚠️ Phase 2 Step 2 완료, agoda_hotel_id 미사용 |

### 2-3. 미해결 이슈 (Phase 3 Step 4에서 처리)

1. **매칭 키 1순위가 hotel_name 정확 일치** — 영문/한글/특수문자 차이로 누락 발생.
   - 메모리 #15 원칙: `agoda_hotel_id` 1순위, `hotel_name+city` 2순위로 변경 필요.
2. **호텔 매니저 신규 등록 시 admin Hotels 탭이 자동 갱신 안 됨** — Refresh 버튼을 눌러야 보임.
   - Supabase Realtime 구독 또는 탭 활성화 시 자동 refetch 필요.
3. **booking-analytics B2B 영업 탭 호텔 클릭 시 fillHotelInfo는 동작하나, 매니저 등록 직후엔 _hotelsCache가 stale** — 캐시 무효화 정책 필요.
4. **dashboard.html에서 매니저가 hotel-info 수정 시 관리자 화면 반영 지연** — 동일 캐시 이슈.

---

## 3. STEP TRACKER

각 Step은 독립적으로 push 가능하도록 분리. 모든 Step은 `JS 문법 + 함수 존재 + 페이지 표시 + 작동 시뮬레이션` 검증 후에만 push.

---

### Step 1: booking-analytics 모듈화 (IIFE + namespace) — ⏸ 대기
**목표**: booking-analytics.html을 그대로 두되, 통합 가능한 형태로 사전 정리.

**작업 내용**:
1. booking-analytics의 모든 JS를 `(function(){ ... })()` IIFE로 감싸기
2. 외부 노출 API: `window.BKA = { init, mount, unmount }`
   - `init(rootEl)`: rootEl(=admin의 `#tab-analytics`)을 받아 DOM 구축, Chart.js 초기화 준비
   - `mount()`: 탭 진입 시 호출 — `iT(); loadURL(); dc(); rr()`
   - `unmount()`: 탭 이탈 시 호출 — `dc()`만 (메모리 해제)
3. hash 라우팅을 `#analytics` prefix로 변경: `#analytics/overview/...` (admin의 다른 탭과 충돌 방지)
4. `_hotelsCache` invalidate 함수 노출: `window.BKA.invalidateCache()`
5. iframe은 그대로 유지 (Step 2에서 제거)

**완료 조건**:
- [ ] booking-analytics.html이 `window.BKA` 객체를 노출
- [ ] 단독 페이지(`booking-analytics.html` 직접 접근)에서도 기존과 동일하게 동작
- [ ] iframe 안에서 admin이 호출하는 `window.initAnalytics()`가 `BKA.mount()`로 자동 위임
- [ ] JS 문법 검증 통과 (node --check)
- [ ] 기존 함수/Chart 인스턴스 6개 모두 보존

**작업 단위**: 1회 push. 회귀 위험 낮음 (iframe 호환 유지).

---

### Step 2: iframe 제거 + 네이티브 마운트 — ⏸ 대기
**목표**: admin.html이 booking 콘텐츠를 직접 보유.

**작업 내용**:
1. booking-analytics.html의 `<style>` 블록을 admin.html `<style>` 끝에 추가 (CSS 변수는 동일하므로 그대로 작동)
2. booking-analytics.html의 `<body>` HTML 구조를 admin.html의 `<div id="tab-analytics">` 내부에 직접 삽입
3. booking-analytics.html의 `<script>`(IIFE 모듈)을 admin.html `</body>` 직전에 삽입
   - Chart.js, supabase-js는 이미 admin이 로드 중 → 중복 제거
4. `<iframe id="bka-iframe">` 제거
5. admin의 `setActiveTab('analytics')`에서:
   - `window.BKA.mount()` 호출 (탭 진입 시)
   - 다른 탭으로 이동 시 `window.BKA.unmount()` 호출
6. admin의 통합 페이지 헤더(`#page-title #page-sub`)는 항상 상단 고정 → booking 콘텐츠는 그 아래로

**완료 조건**:
- [ ] iframe 코드 0개 (`grep iframe admin.html` 결과 없음)
- [ ] Analytics 탭 진입 시 booking-analytics 8탭 모두 동작
- [ ] 스크롤해도 admin 페이지 헤더 + 좌측 사이드바가 항상 보임
- [ ] 다른 탭으로 이동 후 다시 Analytics 진입 시 차트 정상 (메모리 누수 없음)
- [ ] booking-analytics.html은 standalone 페이지로도 여전히 작동 (=Step 1 결과 유지)
- [ ] 콘솔 에러 0건

**검증 시뮬레이션** (push 전 필수):
```
1. node --check (전체 JS)
2. grep -c "iframe" admin.html  → 0
3. admin.html 정적 분석: BKA.mount 호출 확인, dc() 호출 확인
4. booking-analytics.html 정적 분석: standalone 진입점 보존 확인
5. CSS 변수 정의 누락 없음 (--ac --bd --bg --bl --cd --cr --ht --sb --tl --tx)
```

**작업 단위**: 1회 push. **이 Step이 가장 회귀 위험 큼** — 별도 채팅에서 집중 작업 권장.

---

### Step 3: i18n (영문/한국어 토글) — ⏸ 대기
**목표**: 통합된 admin Analytics 영역을 영어 기본 + 한국어 토글로 변경.

**작업 내용**:
1. admin.html은 이미 영어 기본. booking 영역의 한국어 텍스트만 i18n 처리.
2. shared.js의 `T.i18n` 시스템 활용 (이미 dashboard에서 사용 중)
3. 모든 한국어 텍스트를 `data-en="..." data-ko="..."` 속성으로 변환
4. 동적 생성 텍스트(rOv/rCh/rCo 등 함수 내 문자열)는 `T.t('key')` 형태로 변경
5. 기존 admin 우상단의 EN/한국어 토글이 booking 영역에도 적용되도록

**작업량 예상**: 200~300개 문자열

**완료 조건**:
- [ ] 페이지 로드 시 영어 기본
- [ ] EN/한국어 토글 클릭 시 booking 영역 모든 텍스트 즉시 전환
- [ ] 차트 라벨, 표 헤더, 버튼, 메시지 모두 다국어
- [ ] 한국어 폴백 안전 (영어 키 없으면 한국어 표시)
- [ ] 8탭 전환마다 토글 상태 유지

**작업 단위**: 1회 push. 작업량이 많으므로 **이 Step도 별도 채팅 권장**.

---

### Step 4: 매칭 정확도 향상 (agoda_hotel_id 1순위) — ⏸ 대기
**목표**: 호텔 매칭률 95% 이상 + 미매칭 호텔 admin 표시.

**작업 내용**:
1. `findHotel()` 함수 매칭 우선순위 변경:
   - 1순위: `bookings.agoda_hotel_id === hotels.agoda_hotel_id` (있는 경우)
   - 2순위: `normalizeName(hotel_name) + city` 정확 일치
   - 3순위: 부분 일치 (현재 구현)
2. `bookings_agoda` 테이블에 `agoda_hotel_id` 컬럼 존재 확인 (없으면 ALTER TABLE)
3. 호텔명 정규화 함수 강화:
   ```javascript
   function normalizeName(name){
     return name.toLowerCase()
       .replace(/&/g,'and').replace(/\s+/g,'')
       .replace(/[^a-z0-9]/g,'');
   }
   ```
4. admin Hotels 탭 또는 별도 "Unmatched Hotels" 미니 위젯에 미매칭 호텔 리스트 표시 (수동 매칭 가능하도록 향후 확장 여지)
5. 매칭 통계를 booking-analytics 노란 배너에 더 정확히 반영

**완료 조건**:
- [ ] 매칭률 95% 이상 (현재 데이터 기준)
- [ ] 미매칭 호텔 리스트 admin에서 확인 가능
- [ ] agoda_hotel_id 기반 매칭 동작 확인 (적어도 1건)
- [ ] 노란 배너 통계 갱신

**작업 단위**: 1회 push.

---

### Step 5: 호텔 매니저 자동 연동 무결성 검증 + 캐시 정책 — ⏸ 대기
**목표**: 매니저가 hotel-info에 입력 → 5개 화면 모두 새로고침 없이 또는 1초 이내 갱신.

**작업 내용**:
1. **단일 fetch 헬퍼 정리**: `T.db.getAllHotels()`만 사용. 컴포넌트 별 직접 쿼리 금지.
2. **캐시 invalidation 정책**:
   - `T.db.createHotel()` / `updateHotel()` / `setHotelStatus()` 호출 후 `window.BKA.invalidateCache()` 자동 트리거
   - admin Hotels/Members 탭의 데이터도 동일 무효화
3. **Supabase Realtime 구독 (선택)**: hotels 테이블 INSERT/UPDATE를 admin이 구독하여 즉시 refetch
4. **테스트 시나리오**:
   - 매니저가 hotel-info 작성 → admin 새 탭 열어 Members/Hotels/Analytics 모두 즉시(또는 Realtime으로) 반영 확인
5. **dashboard.html 매니저 사이드 검증**: 매니저가 정보 수정 후 본인 dashboard에서도 즉시 반영

**완료 조건**:
- [ ] 매니저 가입 + hotel-info 등록 후 admin 5개 화면 모두 갱신 (탭 진입 또는 Refresh 클릭으로)
- [ ] 매니저가 dashboard에서 본인 호텔 보임
- [ ] admin이 setHotelStatus 변경 시 매니저 dashboard에도 반영 (다음 로그인 시)
- [ ] _hotelsCache stale 문제 해소 검증 (hotel 등록 직후 booking-analytics 진입해도 매칭됨)

**작업 단위**: 1회 push.

---

### Step 6: 통합 후 회귀 테스트 + 투자자 데모 시나리오 검증 — ⏸ 대기
**목표**: Phase 3 전체 완료 후 종합 검증.

**작업 내용**:
1. **데스크톱 E2E 시나리오**:
   - admin 로그인 → 6개 사이드바 메뉴 모두 클릭 정상
   - Analytics 탭 진입 → 8탭 전환 + 드릴다운 정상
   - 스크롤 시 페이지 헤더 + 사이드바 모두 fixed로 유지
   - 다른 탭 → Analytics 복귀 시 차트 재생성 정상
   - 한국어 토글 → 모든 영역 전환
2. **모바일 시나리오**: 사이드바 자동 접힘, 탭 가로 스크롤 가능
3. **데이터 신선도 시나리오**: 매니저 가입 → admin 5화면 자동 반영
4. **PHASE3.md + STATUS.md 갱신**: Phase 3 완료 표기, 새 채팅용 인수인계 정리

**완료 조건**:
- [ ] 콘솔 에러 0건
- [ ] iframe 0개
- [ ] Analytics 8탭 모두 정상
- [ ] 5개 화면 자동 연동 검증 완료
- [ ] STATUS.md "Phase 3 완료" 표기

**작업 단위**: 1회 push (마지막).

---

## 4. 작업 원칙 (메모리 기반 워크플로 준수)

모든 Step에서 다음을 절대 준수:

```
①코드 작성
  ↓
②자동 검증
  - JS 문법 (node --check)
  - 함수 존재 확인 (grep으로 신규/기존 함수)
  - 페이지 표시 상태 (HTML 구조 정적 분석)
  - 작동 시뮬레이션 (가능한 경우)
  ↓
③검증 통과 후에만 git push
  ↓
④대표님께 보고:
  (a) 작업 요약
  (b) 직접 확인 체크리스트 (URL/단계/예상 결과)
  (c) 막힐 가능성 있는 부분
  (d) Vercel 배포 링크
```

**검증 실패 시 절대 push 금지. 수정 후 재검증.**

---

## 5. 작업 순서 권장

| Step | 우선순위 | 권장 채팅 | 예상 토큰 |
|------|---------|----------|----------|
| Step 1 (모듈화) | 🔴 High | 새 채팅 1 | 중간 |
| Step 2 (iframe 제거) | 🔴 High | 새 채팅 2 (Step 1 완료 후) | **큰 작업** |
| Step 3 (i18n) | 🟡 Medium | 새 채팅 3 | **큰 작업** |
| Step 4 (매칭 정확도) | 🟡 Medium | 새 채팅 4 | 중간 |
| Step 5 (캐시/연동) | 🟡 Medium | 새 채팅 5 | 중간 |
| Step 6 (회귀 검증) | 🟢 마무리 | 새 채팅 6 | 작음 |

**총 6개 채팅 권장** (Step별 1개씩, Step 2·3은 토큰 소모 큼).

---

## 6. TECHNICAL CONTEXT (재참조용)

### Supabase 관련
- Project ref: `vjsludfjsphwnumuoqaj`
- Management API Token: 메모리 보관
- 6 tables: `hotels / payments / videos / bookings / hotel_status_history / admin_notes`
- RLS 정책: `sql/rls-policies.sql` 적용 완료

### 핵심 파일
- **admin.html** (1,979줄, 97KB): 통합 운영 콘솔, Analytics 탭은 현재 iframe
- **booking-analytics.html** (326줄, 1MB — 한 줄에 모든 JS): v9.1, IIFE 미적용
- **dashboard.html** (315줄): 매니저 본인 화면, `T.db.getMyHotels()` 사용
- **hotel-info.html** (538줄): 호텔 등록 폼, `T.db.createHotel()` 사용
- **shared.js** (310줄): `T.db / T.sb / T.i18n / T.lang / T.toast` 등 공유 API

### booking-analytics 인벤토리 (Phase 3 작업 시 참조)
```
전역 변수 (64개):
  D, E, F, P, R, W, A, CB, SM, Ss, TD, CT, DS, HP, CV, VL, PAGE,
  ch_, _hotelsCache, _rr_orig, _rr_phase2, ... (대부분 함수 내 var)

함수 (45개):
  렌더링: rOv, rCh, rCo, rCi, rHo, rPa, rSt, rSa, rHtD, rHU, rSaU, rSaSearch
  차트 init: iOC, iCC, iPC, iSC, iT
  드릴: drillCo, drillCoCi, drillCoHt
  유틸: dc, sT, sV, sYr, vTg, ySl, fY, nNm, nextYM, prevYM
  라우팅: loadURL, syncURL, rr (wrapping 됨)
  Phase 2 추가: loadHotels, findHotel, fillHotelInfo, syncStarRatings

Chart.js 인스턴스 (6개):
  #c1, #c2, #cp, #dm2, #dw, #sc

CSS 변수 (10개, admin과 100% 동일):
  --ac --bd --bg --bl --cd --cr --ht --sb --tl --tx

DOM ID (17개, admin과 0건 충돌):
  ct, tabs, c1, c2, cp, dm2, dw, sc, hs, htbl, b2bs, b2btbl,
  hi-card, hi-status, hi-data, hi-note, st-banner
```

---

## 7. CHANGE LOG (Phase 3)

| 날짜 | Step | 변경사항 | 커밋 |
|------|------|----------|------|
| 2026-04-27 | - | PHASE3.md 신규 작성 (계획 문서, 코드 변경 없음) | (이번 커밋) |

---

## 8. 새 채팅 사용법

### 표준 명령어
```
tw-b2b PHASE3.md 읽고 Step [N] 작업해줘
```

### 새 채팅 시작 시 Claude가 해야 할 것
1. PHASE3.md를 view 도구로 읽기
2. PHASE2.md, STATUS.md도 같이 빠르게 훑기
3. 현재 진행 중 Step 확인
4. 대표님이 지시한 단계 또는 다음 Step 작업
5. 작업 시작 전 워크플로 4단계(작성→검증→push→보고) 명시
6. 완료 후 PHASE3.md의 Change Log + Step Tracker + STATUS.md 갱신
7. 대표님께 (a)요약 (b)체크리스트 (c)막힐 가능성 (d)배포 링크 보고

### 자주 쓰는 명령
```
tw-b2b PHASE3.md 읽고 다음 Step 진행
tw-b2b PHASE3.md 읽고 현재 상태 확인
tw-b2b PHASE3.md 갱신
```

---

**문서 관리 원칙**: 매 Step 완료 시 이 문서를 갱신하고 함께 push.
**Phase 3 시작일**: 2026-04-27
**Phase 3 예상 완료일**: 2026-05-04 ~ 05-10 (Step별 1~2일 가정)
