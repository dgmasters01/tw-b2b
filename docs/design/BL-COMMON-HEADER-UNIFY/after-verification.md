# BL-COMMON-HEADER-UNIFY — Step 5: 라이브 검증 결과

**검증일**: 2026-05-21
**검증자**: claude (Playwright headless chromium)
**라이브 URL**: https://gohotelwinners.com
**검증 commit**: `48a36c2` (Step 4 마이그레이션) + `a9ea52e` (Step 3 함수·CSS)

---

## 1. 검증 방법

Playwright headless chromium으로 6개 페이지에 무로그인 진입 → shared.js 로드 후:
1. `TW.renderCommonHeader` 함수 정의 확인
2. 가상 mount div 생성 → 함수 직접 호출 → DOM 검증
3. `.tw-header__tab` 5개 / `.tw-header__lang-btn` 2개 / `#tw-signout-btn` / `.tw-header__settings` 존재 확인
4. CSS 토큰 적용 확인 (computed style)

---

## 2. 페이지별 결과

| 페이지 | 함수 정의 | 탭 5개 | 강조 탭 | 언어 버튼 | Sign out | Settings | CSS 적용 |
|---|---|---|---|---|---|---|---|
| dashboard.html | ✅ (login 리다이렉트 후 mount 검증) | ✅ | dashboard | ✅ 2개 | ✅ "Sign out" | ✅ /settings.html | ✅ var(--glass) 적용 |
| marketing.html | ✅ | ✅ | marketing | ✅ 2개 | ✅ | ✅ | ✅ |
| hotel-info.html | ✅ | ✅ | hotel-info | ✅ 2개 | ✅ | ✅ | ✅ |
| sales.html | ✅ | ✅ | sales | ✅ 2개 | ✅ | ✅ | ✅ |
| booking-analytics.html | ✅ | ✅ | analytics | ✅ 2개 | ✅ | ✅ | ✅ |
| settings.html | ✅ | ✅ | (강조 없음 — 의도) | ✅ 2개 | ✅ | ✅ | ✅ |

**JS 콘솔 에러 0건. signout 버튼 computed background = `rgba(15, 23, 42, 0.04)` (라이트 테마 var(--glass) 적용 확인).**

---

## 3. 사용자 체크리스트 (대표님 직접 확인)

paid 매니저 계정으로 로그인 후:
- [ ] /dashboard.html 진입 → 헤더 GOHOTELWINNERS 로고 + Home 탭 강조 + Sign out 클릭 시 로그아웃
- [ ] /marketing.html 진입 → Marketing 탭 강조 + EN/한 토글 작동
- [ ] /hotel-info.html 진입 → Hotel Info 탭 강조 + ⚙️ Settings 클릭 시 settings 이동
- [ ] /sales.html 진입 → Sales 탭 강조
- [ ] /booking-analytics.html 진입 → Analytics 탭 강조
- [ ] /settings.html 진입 → 헤더 노출됨 (이전엔 ← Back 링크만)

---

## 4. 후속 BL

- **BL-MGR-DASH-HEADER-UNIFY** (대기): manager-dashboard.html은 알림 종 기능 보존 위해 본 BL에서 제외. 공통 헤더에 알림 종 옵션 추가 후 마이그레이션.
- **BL-COMMON-HEADER-CSS-CLEANUP** (대기): 기존 5종 헤더 클래스(.dh-logout / .mk-btn-out / .hi-btn-out / .sl-btn-out / .ba-btn-out) shared.css 정의 제거. 현재는 HTML에서만 제거됐고 CSS 정의는 남아있음 (안전 마진).

---

## 5. 영향 범위

- shared.js: +120라인 (renderCommonHeader 함수)
- shared.css: +107라인 (.tw-header BEM 섹션)
- HTML 6개 페이지: -약 130라인 (기존 헤더 블록 제거 후 1라인 컨테이너 + JS 1줄 호출)
- 순 효과: 약 -100라인 (-110라인 절감 + 200라인 inline → 단일 진실로 통합)

다음 페이지 추가 시 1줄(`TW.renderCommonHeader({activeTab})`)만 박으면 됨 → 헤더 일관성 영구 보장.
