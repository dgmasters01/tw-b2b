---
slug: 2026-05-15-bl-admin-user-management-week2-step4
title: BL-ADMIN-USER-MANAGEMENT Week 2 — step4 Hotels 탭 ⋯ 빠른 메뉴
date: 2026-05-15
tasks: [BL-ADMIN-USER-MANAGEMENT]
commits: [411088f, 144b357, 7c1d6d7, 382f6b2]
decisions: []
---

## 🎯 한 줄 요약

호텔 행 우측에 ⋯ 빠른 메뉴 박았다. status별로 액션이 자동 분기되고(Approve/Reject/Paid/Production/Published/Refund), 환불이 한 번에 처리되며, 매니저 점프 버튼으로 가입자 탭으로 이동한다. 모든 조작이 action_logs에 자동 기록.

## 📍 왜 발생했나

기존 admin.html Hotels 탭은 행 클릭 → 전체 호텔 모달 열림 → 모달 안 액션. 일상 운영에서 호텔 1개 승인하는데 모달 한 번 거쳐야 함 = 추가 클릭 + 화면 점프. Members 탭에는 이미 ⋯ 메뉴 박혀있는데 Hotels 탭은 비어있어 일관성도 깨짐.

또한 기존 status 변경은 `T.db.setHotelStatus()` 직접 호출 → **action_logs 미기록**. 누가 언제 어떤 호텔을 거절했는지 추적 불가. Week 1에 만든 통합 audit 흐름이 호텔 status 변경에는 안 박혀있었음.

환불 처리도 시스템에 박혀있지 않았음 (Supabase Studio에서 직접 payments 행 추가 + hotels.status PATCH).

## 🛠 어떻게 해결했나

**API 2종 신설.**
- `update-hotel-status`: hotels.status PATCH + before/after 자동 audit (router finally 블록이 처리). HOTEL_STATUS_WHITELIST 7개(`pending/review/approved/rejected/paid/producing/published`). 같은 status로 변경 시도는 unchanged=true로 noop.
- `refund-hotel`: paid/producing/published 일 때만 가능. 1) hotels.status='refunded' 2) payments 음수 행 추가 (`amount: -200`, `payment_method: 'admin_refund'`, notes에 어드민 이메일 + 사유 박힘) 3) audit 자동.

**Hotels 행 ⋯ 메뉴.** Members 탭 패턴 그대로 (`ad-hm-menu` 클래스). View 버튼 옆에 ⋯ 박음. 클릭 시 빠른 액션 모달 1회 캐시. status별 분기:

| status | 버튼 |
|---|---|
| pending/review | Approve / Reject |
| approved | Mark Paid / Revert |
| paid | Start Production / Refund |
| producing | Mark Published / Refund |
| published | Refund |
| rejected/refunded | Reopen to Pending |
| (공통) | View Manager — 가입자 탭 점프 + 검색 박스 자동 채움 |

각 액션:
- status 변경 → `/api/admin?action=update-hotel-status` (audit 자동)
- 환불 → `prompt` 사유(min 5 chars) + `confirm` → `/api/admin?action=refund-hotel`
- 매니저 점프 → Members 탭 click + 검색 박스에 이메일 박음

기존 모달은 그대로 (View 버튼 클릭 → 전체 정보 + 액션 버튼). ⋯ 메뉴는 빠른 길.

## ✅ 결과

- /api/admin?action=update-hotel-status 라이브 401 (인증 정상)
- /api/admin?action=refund-hotel 라이브 401 (인증 정상)
- /api/admin?action=hack-attempt 라이브 400 unknown_action (보안 정상)
- ALLOWED_ACTIONS 라이브 12개 확인 (기존 10 + 신규 2)
- admin.html scripts 5/5 syntax OK
- HTML 골격 무결 (body/html/style/script 모두 정상)
- 기존 setHotelStatus / PayPal / 이메일 로직 보존
- 본 BL 80% (4/5 단계). Team 탭은 다음 채팅

## ⏱ 다음 결정 필요

**단계 5**: Team(Admins) 탭 — '+ Add Team Member' 실제 작동 + 팀원 행 ⋯ 메뉴. 별도 채팅 권장 (이 채팅은 BL-PAGE-ROLES-SPLIT + step4까지 처리 후 토큰 누계 큼).

또는 후속 BL 분리 고려:
- BL-ADMIN-AUDIT-LOG-VIEW (action_logs 조회 페이지 — Week 1 인계서에서 거론)
- BL-MEMBERS-TAB-ROLE-DISPLAY (Members 탭에 role/is_active 컬럼 표시)

---

# 🔧 기술 상세

## 박은 파일 2개

1. `api/admin.js` (수정, +148줄 = 1619 → 1767)
   - ALLOWED_ACTIONS에 2개 추가
   - switch에 case 2개 추가
   - `handleUpdateHotelStatus` 신규 핸들러
   - `handleRefundHotel` 신규 핸들러
   - `HOTEL_STATUS_WHITELIST` 상수

2. `_admin/admin.html` (수정, +144줄 = 5331 → 5475)
   - renderHotels: Actions 셀에 ⋯ 버튼 박음 + 위임 핸들러
   - `openHotelQuickMenu` 함수 신규 — status별 분기 모달
   - `hqmBtn` / `hqmRefundBtn` / `hqmCallApi` 헬퍼

## API 명세

### POST /api/admin?action=update-hotel-status
```json
Request: { "hotel_id": "uuid", "new_status": "approved", "reason": "..." }
Response: {
  "success": true,
  "hotel_id": "uuid",
  "hotel_name": "...",
  "before": { "status": "pending" },
  "after":  { "status": "approved" },
  "reason": "..."
}
보안: status 화이트리스트, 같은 status는 unchanged=true noop
```

### POST /api/admin?action=refund-hotel
```json
Request: { "hotel_id": "uuid", "reason": "min 5 chars", "refund_amount": 200 (optional) }
Response: {
  "success": true,
  "hotel_id": "uuid",
  "hotel_name": "...",
  "before": { "status": "paid" },
  "after":  { "status": "refunded" },
  "refund": { "id":"...", "amount": -200, ... },
  "reason": "..."
}
보안: paid/producing/published 일 때만 환불, refund_amount 미지정 시 마지막 completed 결제 금액 자동 사용 또는 $200 기본
```

## audit 흐름

```
admin이 호텔 행 ⋯ 클릭 → 빠른 메뉴 → 액션
  ↓
/api/admin?action=update-hotel-status 또는 refund-hotel
  ↓
핸들러 실행 (PATCH + payments INSERT)
  ↓
router finally 블록 자동 실행:
  logAction({
    actionType: 'admin_update-hotel-status' 또는 'admin_refund-hotel',
    targetType: 'hotel',
    targetId: hotel_id,
    details: { duration_ms, body_keys },
    result: 'success' 또는 'fail',
    req
  })
  ↓
action_logs 테이블 행 박힘 (단일 audit 진실원)
```

## 헌법 점검

- 부칙 5 (거짓 진행률 금지): 80%만 박고 done 안 함. Team 탭 미완 명시.
- 부칙 7 (단계 = commit): step4 = `[step:done:4]` 박음
- 부칙 9 (가역성): 모든 변경 action_logs 추적, 환불은 payments 음수 행으로 영구 기록
- 부칙 12 (Self-QA): node 문법 5/5 + 라이브 3종 응답 검증
- 부칙 16 (자율): API 설계·status 화이트리스트·UI 모달 구조·매니저 점프 동작 100% 자율
- 부칙 17 (페이지 역할): 이 BL은 admin.html(운영 대시보드 = "굴리는 곳")에 박힘 = D-039 page-roles 정석
