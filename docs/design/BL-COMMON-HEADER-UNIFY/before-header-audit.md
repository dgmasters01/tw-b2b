# BL-COMMON-HEADER-UNIFY — Step 1: 7개 매니저 페이지 헤더 BEFORE 전수 분석

**작성일**: 2026-05-21
**작성자**: claude
**라이브 코드 fetch 시각**: 2026-05-21 (commit `9b9f30c` 기준)
**점검 대상**: 매니저가 로그인 후 진입 가능한 모든 페이지

---

## 1. 핵심 발견 (한 줄)

**5개 페이지에 Sign out + Settings 이미 박혀 있다.** 단지 **클래스명·구조가 페이지별 제각각**이라 일관성 깨진 상태. 진짜 문제는 "누락"이 아니라 "파편화".

기존 chat-log(`2026-05-21-bl-mgr-dash-signout-and-ux-audit.md`)에 "설정 진입 누락 6건"으로 박혀있던 표는 라이브 코드와 불일치. 라이브 grep 결과를 단일 진실로 한다.

---

## 2. 페이지별 헤더 구조 매트릭스 (라이브 코드 기준)

| 페이지 | 헤더 컨테이너 클래스 | 로고/타이틀 | 언어 토글 | Settings 진입 | Sign out | 라인 |
|---|---|---|---|---|---|---|
| **dashboard.html** | (헤더 컨테이너 클래스 명시 없음, top div) | (없음 — 본문 헤더로 시작) | ❌ (T.switchLang는 있으나 토글 버튼 없음) | ✅ `<a class="dh-logout">⚙️ Settings</a>` line 104 | ✅ `<button id="btn-logout" class="dh-logout">` line 105 | 104-105 |
| **marketing.html** | (헤더 컨테이너 클래스 명시 없음) | (없음) | ❌ | ✅ `<a class="mk-btn-out">⚙ Settings</a>` line 261 | ✅ `<button id="btn-logout" class="mk-btn-out">` line 262 | 261-262 |
| **hotel-info.html** | (헤더 컨테이너 명시 없음) | (없음) | ❌ (data-ko 다수 박혀있으나 토글 버튼 별도 안 보임) | ✅ `<a class="hi-btn-out">⚙ Settings</a>` line 254 | ✅ `<button id="btn-logout" class="hi-btn-out">` line 255 | 254-255 |
| **sales.html** | (헤더 컨테이너 명시 없음) | (없음) | ❌ | ✅ `<a class="sl-btn-out">⚙ Settings</a>` line 394 | ✅ `<button id="btn-logout" class="sl-btn-out">` line 395 | 394-395 |
| **booking-analytics.html** | (헤더 컨테이너 명시 없음) | (없음) | ❌ | ✅ `<a class="ba-btn-out">⚙ Settings</a>` line 221 | ✅ `<button id="ba-btn-logout" class="ba-btn-out">` line 222 (id 다름!) | 221-222 |
| **manager-dashboard.html** | ✅ `<header class="md-topbar">` | ✅ "GOHOTELWINNERS / Manager Dashboard" | ✅ `<div class="md-lang">` EN/한 토글 | ✅ `<button class="md-menu-btn">⚙️</button>` (텍스트 없음, 아이콘만) | ✅ `<button id="md-signout-btn" class="md-signout-btn">` (BL-MGR-DASH-SIGNOUT으로 핫픽스) | 299-322 |
| **settings.html** | ✅ `<div class="st-topbar">` | (← Back to Dashboard 링크만) | ❌ | ❌ (현재 페이지) | ❌ (페이지 내 "영구 삭제" 버튼만 있음) | 65-67 |

---

## 3. 파편화 5대 문제

### 3-1. 클래스명 5종 분산 (페이지마다 다름)
- `dh-logout` (dashboard)
- `mk-btn-out` (marketing)
- `hi-btn-out` (hotel-info)
- `sl-btn-out` (sales)
- `ba-btn-out` (booking-analytics)
- `md-signout-btn` + `md-menu-btn` (manager-dashboard)

→ 디자인 토큰 통일됐어도 클래스 5개 따로 박혀 CSS 중복 + 변경 시 5군데 다 수정해야 함.

### 3-2. id 일관성 깨짐
- 5개 페이지: `id="btn-logout"`
- booking-analytics: `id="ba-btn-logout"` ⚠️
- manager-dashboard: `id="md-signout-btn"` ⚠️

→ JavaScript 핸들러 바인딩이 페이지마다 다르게 박혀야 함. 새 페이지 추가 시 매번 새 패턴.

### 3-3. 언어 토글(EN/한) — manager-dashboard만 있음
- manager-dashboard: 시각적 EN/한 버튼 토글 ✅
- 나머지 6개: data-ko 속성은 있으나 사용자가 누를 수 있는 토글 버튼 없음 ❌

→ 매니저가 한국어로 보고 싶어도 manager-dashboard에서만 가능. 다른 페이지 들어가면 영어 강제.

### 3-4. Settings 아이콘 표기 3종
- dashboard: `⚙️ Settings` (이모지 + 텍스트)
- marketing/hotel-info/sales/booking-analytics: `⚙ Settings` (다른 이모지! VS16 차이)
- manager-dashboard: `⚙️` (아이콘만, 텍스트 없음)

### 3-5. settings.html 자체에 헤더 없음
- 매니저가 settings 진입한 뒤 → 다른 메뉴 이동하려면 "← Back to Dashboard" 링크 하나뿐
- 다른 페이지(marketing, sales 등)로 직행 못 함. 매니저 흐름 끊김.

---

## 4. 정석 해법 (Step 3에서 박을 설계)

`shared.js`에 `TW.renderCommonHeader(opts)` 함수 1개. 모든 매니저 페이지가 `<header id="tw-common-header"></header>` 자리만 비워두고, 페이지 init() 안에서 한 줄 호출:

```javascript
TW.renderCommonHeader({
  pageTitle: 'Marketing',
  pageTitleKo: '마케팅',
  activeTab: 'marketing'  // 현재 페이지 강조용
});
```

함수 안에서 박는 것:
1. 로고 + 페이지 타이틀
2. 매니저 페이지 탭(Dashboard/Marketing/Hotel Info/Sales/Analytics)
3. 언어 토글 EN/한
4. 사용자 표시 (Avatar + email)
5. Settings 진입 버튼
6. Sign out 버튼 + 이벤트 바인딩 (`TW.logout` 호출)

→ 페이지마다 5개 다른 클래스 박는 게 아니라 **shared.css에 `.tw-header__signout` 식 BEM 클래스 1세트**만 정의.

---

## 5. Step 4(마이그레이션) 영향 범위

| 페이지 | 기존 헤더 코드 라인 수 | 함수 호출로 줄어들 라인 수 | 절감 |
|---|---|---|---|
| dashboard.html | 약 30라인 (line 100~130) | 1라인 | -29 |
| marketing.html | 약 25라인 (line 255~280) | 1라인 | -24 |
| hotel-info.html | 약 25라인 (line 250~275) | 1라인 | -24 |
| sales.html | 약 25라인 (line 390~415) | 1라인 | -24 |
| booking-analytics.html | 약 20라인 (line 218~240) | 1라인 | -19 |
| manager-dashboard.html | 약 25라인 (line 299~324) | 1라인 | -24 |
| settings.html | (현재 헤더 없음) | 1라인 추가 | +1 |
| **합계** | **약 150라인** | **7라인** | **-143** |

CSS도 5개 페이지 각자 박은 `.dh-logout / .mk-btn-out / .hi-btn-out / .sl-btn-out / .ba-btn-out` 정의 약 30라인 → `shared.css`에 1세트로 통합.

---

## 6. 결정 대기 사항 (Step 3 들어가기 전 대표님 확인)

- 옵션 A — **풀 마이그레이션**: 7개 페이지 다 함수 호출로 교체 + 기존 클래스 5종 shared.css에서 제거
- 옵션 B — **점진 마이그레이션**: 함수 박되, 기존 클래스는 deprecation 마커만 박고 다음 BL에서 제거
- 옵션 C — **최소 마이그레이션**: 함수 박되, 기존 페이지는 안 건드림. 새 페이지부터만 사용

권장: **B** (현재 운영 중 페이지 영향 최소화 + 일관성 점진 확보)

---

## 7. 참조

- 기존 chat-log: `_chat-logs/2026-05-21-bl-mgr-dash-signout-and-ux-audit.md`
- 핫픽스 commit: `24496a6` (manager-dashboard Sign out)
- shared.js 현재 라인 수: 498
- 헌법 부칙 6: UX/UI 통일 우선 = 사업 시작 전 완료 의무
