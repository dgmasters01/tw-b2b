# BL-COMMON-HEADER-UNIFY — Step 3·4·5 완료

**날짜**: 2026-05-21
**Claude 채팅**: 새 채팅 전환 후 이어가기
**Commits**: `a9ea52e` (Step 3) + `48a36c2` (Step 4) + 본 chat-log commit (Step 5)
**최종 상태**: status=done, progress=100% (5/5)

---

## 완료내용

**Step 3** — shared.js에 `TW.renderCommonHeader(opts)` 함수 박음 (logout 함수 직후, IIFE 안). shared.css 끝에 `.tw-header` BEM 섹션 추가 (logo/nav/tab/lang/user/settings/signout + 모바일 768px 반응형).

**Step 4** — 6개 매니저 페이지 마이그레이션 (dashboard / marketing / hotel-info / sales / booking-analytics / settings). 기존 헤더 블록 통째로 `<header id="tw-common-header"></header>`로 교체 + 페이지 init JS에 `T.renderCommonHeader({activeTab})` 1줄 호출. 기존 `btn-logout` / `user-email` 참조는 안전 참조(`if (el)`)로 변경. 백업 7개 _backup_20260521.html 박음. .gitignore에 `*_backup_*.html` 패턴 추가.

**Step 5** — Playwright headless chromium으로 6개 페이지 라이브 검증. 함수 정의 / 5탭 / 강조탭 / 언어버튼 2개 / Sign out / Settings 링크 / CSS 토큰 적용 모두 PASS. dashboard.html은 무로그인 시 login으로 리다이렉트되지만 가상 mount로 직접 호출 검증 PASS.

**manager-dashboard.html 제외 결정** — 알림 종(bellBtn) 기능이 본 BL의 공통 헤더에 없어 보존 위해 후속 BL-MGR-DASH-HEADER-UNIFY로 분리.

## 이유

dashboard / marketing / hotel-info / sales / booking-analytics 5종 헤더 클래스가 페이지마다 따로 박혀 일관성 깨짐. id도 `btn-logout`(5개) / `ba-btn-logout`(1개) / `md-signout-btn`(1개) 3분파. 언어 토글 EN/한은 manager-dashboard에만 있었음. Settings 이모지도 ⚙️ / ⚙ / 아이콘만 3종 분산. 새 페이지 추가할 때마다 헤더 새로 박는 중복 작업 + 변경 시 5군데 동기화 부담.

## 사업 영향

매니저가 로그인 후 어느 페이지를 가도 헤더가 동일. Sign out / Settings / 언어 전환이 항상 같은 자리. settings.html에서도 다른 메뉴로 직행 가능 (이전엔 "← Back to Dashboard"만). 매니저 UX 단절 해소 → 결제 후 이탈 가능성 감소. 새 페이지 추가 시 1줄로 헤더 완성 → 향후 페이지 추가·디자인 변경 비용 영구 절감.

## 다음 행동

1. **대표님 paid 계정으로 6개 페이지 진입 후 헤더 노출 확인** (3분):
   - https://gohotelwinners.com/dashboard.html
   - https://gohotelwinners.com/marketing.html
   - https://gohotelwinners.com/hotel-info.html
   - https://gohotelwinners.com/sales.html
   - https://gohotelwinners.com/booking-analytics.html
   - https://gohotelwinners.com/settings.html

2. **후속 BL 2건 자동 등록 완료**:
   - BL-MGR-DASH-HEADER-UNIFY (manager-dashboard 알림 종 보존 마이그레이션, P2)
   - BL-COMMON-HEADER-CSS-CLEANUP (기존 5종 CSS 정의 제거, P3, 1주 안정성 확인 후)

## 결정 요청

없음. 대표님 검수 후 OK이면 다음 BL로 진행. NO이면 어느 페이지 어떤 부분 문제인지 알려주시면 핫픽스.
