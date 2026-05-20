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

**단계 5**: push 후 라이브 검증

1. push → Vercel deploy 완료 대기
2. 테스트 매니저 계정 3개로 라이브 검증:
   - 호텔 0건 계정 → `gohotelwinners.com/dashboard.html` 입력 시 hotel-info.html로 점프 확인
   - pending 호텔 계정 → 동일 → sales.html로 점프 확인
   - paid 호텔 계정 → 동일 → dashboard 정상 노출 확인
3. 모두 통과 시 `[step:done:5]` 박음 → BL-USER-STAGE-GATING 100% 종료

## 📝 commit/push 후 자동 추적

- chat-log slug: `2026-05-21-bl-user-stage-gating-steps-1-to-4`
- index.json byTask 매핑: 이 파일 commit 시 chat-log-indexer-bot가 자동 갱신
- tasks.json `progress.steps` 1~4 done 마킹 + commit 태그 `[step:done:1][step:done:2][step:done:3][step:done:4]` → auto-detect-bot이 자동 갱신
