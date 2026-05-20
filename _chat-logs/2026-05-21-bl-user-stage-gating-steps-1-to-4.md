---
slug: 2026-05-21-bl-user-stage-gating-steps-1-to-4
title: BL-USER-STAGE-GATING 단계 1~4 — 결제 단계별 강력 차단 게이트 박음
date: 2026-05-21
tasks: [BL-USER-STAGE-GATING]
commits: [TBD-after-push]
decisions: [D-044]
---

## 🎯 한 줄 요약

dashboard.html에 결제 단계 게이트 박음. 호텔 0건은 hotel-info.html, 미결제는 sales.html로 즉시 redirect(`window.location.replace`). dashboard 화면 0.1초도 노출 금지 — "결제 = 입장권" 사업 본질 강제. sales.html에도 호텔 0건 가드 추가. 단계 5(라이브 검증)는 push 후 별도.

## 📍 무엇을 박았나 (단계별)

### 단계 1: 라이브 흐름 분석 + 결함 진단

**무엇을 봤나** (dashboard.html / sales.html / hotel-info.html 라이브 fetch):

| 페이지 | 호텔 0건 | pending(미결제) | paid 이후 |
|---|---|---|---|
| dashboard.html | renderNoHotel() 카드 ✅ | **dashboard 안에서 결제 화면 노출** ⚠️ | 정상 |
| sales.html | 빈 hotel로 노출 ⚠️ | sales 노출 ✅ | marketing.html로 redirect ✅ |
| hotel-info.html | 신규 등록 ✅ | (체크 없음 — 무관) | (체크 없음 — 무관) |

**결함**: 결제 안 한 사람이 `gohotelwinners.com/dashboard.html` 직접 URL 입력 시 결제 단계 표시 + PayPal 버튼이 dashboard 안에 노출 → 시스템 미리보기 후 이탈 위험.

### 단계 2 + 3 + 4: dashboard.html + sales.html 게이트 박음 (한 commit)

**왜 한 commit**: 단계 2/3/4가 한 로직(게이트 함수)으로 묶임. 분리하면 임시 상태(미결제는 차단되는데 호텔 0건은 안 됨) 발생.

#### dashboard.html — `stageGateRedirect()` 함수 신설

```javascript
// admin 분기 통과 직후 호출
function stageGateRedirect(){
  T.db.getMyHotels({ noCache: true }).then(function(r){
    if (r.error){
      window.location.replace('hotel-info.html'); return;
    }
    var hotels = r.data || [];
    if (hotels.length === 0){
      window.location.replace('hotel-info.html'); return;   // ①
    }
    var status = (hotels[0].status || 'pending');
    var PAID_GROUP = ['paid', 'producing', 'published'];
    if (PAID_GROUP.indexOf(status) === -1){
      window.location.replace('sales.html'); return;        // ②
    }
    myHotel = hotels[0];
    renderDashboard();                                      // ③
  });
}
```

**핵심 선택**:
- `window.location.replace()` 사용 — 히스토리 오염 차단 → 뒤로가기로 dashboard 재진입 불가
- 결제 완료 그룹 = `['paid', 'producing', 'published']` — 헌법 부칙 7 작업 시 producing/published도 정상 매니저 화면 보임
- 결제 전 그룹 = `pending / review / approved / rejected` (4종 모두 sales.html로)
- `T.db.getMyHotels({ noCache: true })` — 캐시 무시. 결제 직후 마지막 status 반영 보장

#### dashboard.html — `loadDashboard()`에도 게이트 재검사

visibility 이벤트 / cache invalidate / storage 이벤트로 재호출 시에도 status가 paid 그룹 이탈했으면(예: 환불 → pending) 즉시 redirect. `renderNoHotel()` 호출 코드 제거.

#### sales.html — 호텔 0건 가드 추가 (단계 ① 보호)

```javascript
if (!hotel) {
  window.location.replace('hotel-info.html');
  return;
}
```

기존엔 호텔 0건이어도 sales.html이 빈 hotel로 노출됐는데, "호텔 없이 결제" 불가하므로 hotel-info.html로 강제 이동.

## 🧠 결정 (D-044)

**dashboard.html은 결제 완료자만 진입 가능 — 미결제자는 시스템 미리보기 불가**

3단계 사용자 정의:
- ① 가입만 함 (호텔 0건) → hotel-info.html
- ② 호텔 등록·미결제 → sales.html
- ③ 결제 완료 (paid/producing/published) → dashboard.html

**왜**:
- 사업 본질: 결제 = 입장권. 미결제자는 "안에 뭐가 있는지" 봐서는 안 됨 (D-039 마케팅 노출 서비스 본질과 정합)
- 헌법 부칙 6 (UX 통일): 각 단계마다 보이는 화면이 명확히 분리되어야 함
- `replace()` 사용 = 뒤로가기 차단

## ⚠️ 알아두기 (다음 클로드용)

### 부수 영향

1. `renderNoHotel()` 함수는 **dead code**가 됨 (게이트로 도달 불가). 즉시 제거하지 않고 남겨둠 — 안전 마진. 별도 정리 BL에서 청소.
2. 환불 처리 시 `hotels.status`를 `pending`으로 되돌리는 트리거가 있어야 게이트가 정상 작동. 없으면 환불 후에도 dashboard 접근 가능. 별도 검증 필요.
3. 임포저네이트 모드(`?impersonate=`)는 게이트 우회. admin이 매니저 화면 보는 경로 → 의도된 행동.

### 다른 페이지 확장 후보 (별도 BL)

- `marketing.html` / `settings.html` / `booking-analytics.html` 등 결제 완료자 전용 페이지에도 동일 게이트 적용 필요.
- 현재 게이트는 dashboard와 sales 2개에만 박힘. 나머지 페이지는 URL 직접 입력 시 노출됨 (status 검증 없음).

## 🚀 다음 행동

**단계 5**: ✅ **완료** (2026-05-21 자동 검증 통과)

### 검증 방식: Playwright 헤드리스 자동 검증 (B안)

- **임시 계정 3개 자동 생성**: Supabase Admin API로 `t_a_*` / `t_b_*` / `t_c_*` 박음
- **hotels.status 세 상태로 박음**: 0건 / pending / paid
- **Playwright로 각 계정 로그인 → dashboard.html 직접 진입 → redirect 결과 검증**
- **검증 후 임시 계정·호텔 자동 삭제** (auth.users + hotels DELETE)
- 검증 스크립트 영구 보존: `_screenshots/2026-05-21-bl-user-stage-gating/verify_gating.js`

### 결과: 3/3 PASS ✅

| 케이스 | status | dashboard.html 진입 시 | 결과 |
|---|---|---|---|
| A_zero_hotel | (호텔 0건) | → hotel-info.html (호텔 등록 모달) | ✅ PASS |
| B_pending | pending | → sales.html (Activate your listing) | ✅ PASS |
| C_paid | paid | dashboard 정상 노출 (Paid 배지 + 진행 단계바) | ✅ PASS |

### 스크린샷 3장 (`_screenshots/2026-05-21-bl-user-stage-gating/`)

- `gating_A_zero_hotel.png` — hotel-info.html "Before you begin" 모달 정상 노출
- `gating_B_pending.png` — sales.html "Activate your listing" + TEST_HOTEL_72580d48 + Pending 배지
- `gating_C_paid.png` — Dashboard + Paid 배지 + Pay 단계 진행바 + "Payment Received" 메시지

### 부수 발견 (별도 BL 후보)

- sales.html이 라이트 배경으로 보임 (Aurora Trendy 다크 적용 안 됨) — CLAUDE.md 5장에 "남은 페이지: sales / marketing / hotel-info / booking-analytics / admin" 명시됨 → BL-SALES-AURORA-MIGRATION 별도 진행 필요. 게이트 BL과 무관.
- nav 흐름 분석에서 B/C 케이스가 `login.html → manager-dashboard.html → dashboard.html` 거쳐감 — 이중 redirect 발생. 동작상 문제 없으나 최적화 여지 (manager-dashboard.html → dashboard.html 직접 점프 가능). 별도 BL 후보.

## 📝 commit/push 후 자동 추적

- chat-log slug: `2026-05-21-bl-user-stage-gating-steps-1-to-4`
- index.json byTask 매핑: 이 파일 commit 시 chat-log-indexer-bot가 자동 갱신
- tasks.json `progress.steps` 1~5 done 마킹 + commit 태그 `[step:done:5]` → auto-detect-bot이 자동 갱신
- BL-USER-STAGE-GATING **100% 종료**
