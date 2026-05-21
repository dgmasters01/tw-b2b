---
slug: 2026-05-21-bl-mgr-dash-signout-and-ux-audit
title: manager-dashboard Sign out 누락 핫픽스 + 매니저 페이지 기본 UX 전수 점검
date: 2026-05-21
tasks: [BL-MGR-DASH-SIGNOUT, BL-ADMIN-MEMBERS-KPI-FIX, BL-COMMON-HEADER-UNIFY]
commits: [TBD]
decisions: [D-045]
---

## 🎯 한 줄 요약

대표님이 manager-dashboard에서 로그아웃 버튼 없는 것 발견 → "지금 없는 거 다시 파악해야 될 것 같은데" 지시 → 매니저 진입 가능한 8개 페이지 기본 UX(로그아웃/설정/언어전환) 전수 grep 점검 → manager-dashboard.html Sign out 즉시 핫픽스 + 발견된 추가 결함 2개(KPI 뷰 버그 + 공통 헤더 통일)는 BL 신규 등록.

## 📍 무엇을 박았나

### Phase 1: 기본 UX 전수 점검 결과 (grep)

| 페이지 | 로그아웃 | 설정 진입 | 언어 전환 |
|---|---|---|---|
| dashboard.html | ✅ | ❌ | ❌ |
| **manager-dashboard.html** | **❌ ⚠️** | ❌ | ✅ |
| marketing.html | ✅ | ❌ | ❌ |
| settings.html | ✅ | ✅ | ❌ |
| hotel-info.html | ✅ | ❌ | ✅ |
| sales.html | ✅ | ❌ | ❌ |
| booking-analytics.html | ✅ | ❌ | ❌ |
| admin.html | (별도 admin 헤더) | | |

핵심 발견:
- 로그아웃 누락 1건 (manager-dashboard.html) ⚠️
- 설정 진입 누락 6건
- 언어 전환 누락 5건

### Phase 2: admin.html Members KPI 버그 분석

대표님 첨부 스크린샷 → admin.html → Members 탭:
- 화면 TOTAL=2, PAID=0, SIGNUP ONLY=3, HOTEL REGISTERED=2
- 라이브 DB 확인 (Supabase Admin API): auth.users 3명(admin 포함), hotels 2건 모두 status=paid
- v_hotel_manager_full 뷰 결과: payment_status 전부 null, lifecycle_stage 전부 signup_only
- **결론**: 뷰 SQL 정의가 payments 테이블·hotels.status를 제대로 join 못함. 매출 0으로 보여 잘못된 사업 판단 위험.
- 즉시 수정 안 함 — 영향 범위(다른 admin 페이지) 파악 + 뷰 SQL 재정의 필요 → BL-ADMIN-MEMBERS-KPI-FIX (P0) 신규 등록

### Phase 3: manager-dashboard.html Sign out 즉시 핫픽스

```html
<!-- BEFORE -->
<button class="md-menu-btn" aria-label="Menu" onclick="window.location.href='/settings.html'">⋯</button>

<!-- AFTER -->
<button class="md-menu-btn" aria-label="Settings" title="Settings" onclick="window.location.href='/settings.html'">⚙️</button>
<button class="md-menu-btn" id="md-signout-btn" aria-label="Sign out" data-en="Sign out" data-ko="로그아웃" title="Sign out" style="padding:6px 12px;font-size:13px">Sign out</button>
```

```javascript
// init() 내부 userName 박은 직후
const signoutBtn = document.getElementById('md-signout-btn');
if (signoutBtn) {
  signoutBtn.addEventListener('click', function(){
    if (window.TW && typeof window.TW.logout === 'function') {
      window.TW.logout();
    } else {
      sb.auth.signOut().then(function(){ window.location.replace('/login.html'); });
    }
  });
}
```

핵심 선택:
- `⋯` 한 버튼 → `⚙️` + `Sign out` 두 버튼 분리: 매니저가 명시적으로 로그아웃 액션 선택 가능
- `window.TW.logout` 호출 (shared.js 공용 헬퍼 D-기존 패턴 재사용) + fallback 박음
- `data-en/data-ko` 박아서 언어 전환 시 자동 번역

### Phase 4: BL 3개 신규 등록 (tasks.json)

| BL ID | 상태 | 우선순위 | 비고 |
|---|---|---|---|
| BL-MGR-DASH-SIGNOUT | ✅ done | P0 | 이번 핫픽스 (4단계 완료) |
| BL-ADMIN-MEMBERS-KPI-FIX | ⏳ pending | P0 | v_hotel_manager_full 뷰 SQL 수정 필요 |
| BL-COMMON-HEADER-UNIFY | ⏳ pending | P1 | 8개 페이지 공통 헤더 통일 (large) |

## 🧠 결정 (D-045)

**manager-dashboard.html Sign out 누락 핫픽스 + 전 매니저 페이지 공통 헤더 통일 의무**

3단계 접근:
1. ✅ 즉시 핫픽스: manager-dashboard.html Sign out 박음
2. ⏳ 별도 P0: KPI 뷰 버그 (BL-ADMIN-MEMBERS-KPI-FIX)
3. ⏳ 별도 P1: 공통 헤더 통일 (BL-COMMON-HEADER-UNIFY)

**왜**:
- 기본 UX는 한 페이지라도 빠지면 안 됨 (매니저 신뢰도 직결)
- 페이지별 헤더 개별 박은 결과 일관성 깨짐 → shared.js 공용 함수화 필요
- 영향 범위 큰 작업(공통 헤더 통일)은 디자인 결정 필요 → 별도 BL 박고 새 채팅에서

## ⚠️ 알아두기 (다음 클로드용)

### Members KPI 뷰 버그 진단 내역

- 뷰명: `v_hotel_manager_full`
- 사용 위치: `_admin/admin.html` line 2480 (renderMembersStats)
- 현재 반환값: 모든 row의 payment_status=null, lifecycle_stage='signup_only'
- 실제 데이터: hotels 테이블에 status='paid' 2건 존재
- 원인 추정: 뷰 정의에서 hotels.status 또는 payments 테이블을 SELECT 안 함 / JOIN 잘못됨
- 수정 방법: Supabase Management API `POST /v1/projects/vjsludfjsphwnumuoqaj/database/query`로 CREATE OR REPLACE VIEW
- 영향 범위 확인 의무: 이 뷰가 admin Bookings/Analytics에서도 쓰이는지 grep 필요

### Sign out 패턴 일관성

- dashboard.html: `T.logout` 호출 (`T` 별칭, shared.js 동일 함수)
- manager-dashboard.html: `window.TW.logout` 호출 (이번 박음, 동일 함수 풀 네임)
- shared.js line 122: `window.TW.logout = function() { ... }` — 단일 진실 원
- 다른 페이지 점검 시 `T.logout` vs `window.TW.logout` 표기 통일 여부 별도 확인

## 🚀 다음 행동

1. push → Vercel deploy 1~2분 대기
2. 라이브 검증: manager-dashboard.html 우측 헤더에 ⚙️ + Sign out 버튼 보이는지 + 클릭 시 login.html로 이동하는지
3. 자동 검증 가능 (Playwright + 검증 임시 계정 재활용) — 단, 작은 작업이라 대표님 직접 1초 확인 권장

## 📝 commit/push 후 자동 추적

- chat-log slug: `2026-05-21-bl-mgr-dash-signout-and-ux-audit`
- tasks.json: BL-MGR-DASH-SIGNOUT done + BL-ADMIN-MEMBERS-KPI-FIX/BL-COMMON-HEADER-UNIFY pending 추가
- commit 태그: `[step:done:1][step:done:2][step:done:3][step:done:4]` (4단계 일괄)
