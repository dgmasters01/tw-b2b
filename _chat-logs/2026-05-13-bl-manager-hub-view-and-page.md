---
slug: 2026-05-13-bl-manager-hub-view-and-page
title: BL-MANAGER-HUB — 매니저 통합 VIEW + 좌우 분할 허브 페이지 1차 박음
date: 2026-05-13
tasks: [BL-MANAGER-HUB-VIEW, BL-MANAGER-HUB-PAGE]
commits: []
decisions: []
---

## 🎯 한 줄 요약

가입자 1명을 클릭하면 호텔 정보 + 결제 상태 + 영상 노출 + CS 메모를 한 화면에서 1초 만에 파악할 수 있는 허브 페이지를 라이브에 박았다.

## 📍 왜 발생했나

지금까지 매니저 한 명을 관리하려면 여러 페이지를 옮겨 다녀야 했다. 가입자 목록에서 이메일만 보고, 호텔 정보는 호텔 페이지, 결제는 결제 시스템 따로, 영상은 영상 페이지 따로. 매니저랑 통화하면서 "당신의 예약 어떻게 됐어요?" 한 마디 답하려고 3~4번 클릭해서 페이지를 찾아 다녀야 했다.

대표님이 "한눈에 파악할 수 있는 페이지가 있어야지 다른 것도 연동할 수 있는 거 아니야?" 라고 정확히 짚으셨다. 매니저 한 명 = 모든 정보 한 화면.

## 🛠 어떻게 해결했나

두 단계로 박았다.

먼저 데이터 단일 진실원을 만들었다 — 매니저 1명에 대한 정보가 `auth.users` + `hotels` + `payments` + `bookings` + `videos` + `admin_notes` 여섯 테이블에 흩어져 있었는데, 이걸 `v_hotel_manager_full` VIEW 하나로 합쳤다. 매니저 1명 = SQL 1줄. 6개월 보장 만료일·D-day·캠페인 단계(D-0/7/30/150/170)·예약 활성도까지 VIEW 안에서 자동 계산되도록 박았다.

그 다음 좌우 분할 허브 페이지(`admin-manager-hub.html`)를 신설했다. 좌측은 매니저가 자기 화면에서 보는 정보(호텔 카드 + 평점·평균 객단가·아고다 매칭 + 누적 KPI + 영상 8채널 상태), 우측은 대표님 전용 관리 패널(결제 & 6개월 보장 상태 + D-0/7/30/150/170 자동 캠페인 단계 + 수동 푸시 4버튼 + CS 메모). Aurora 디자인 시스템 그대로 적용, 모바일은 1열로 자동 전환.

`admin.html`의 가입자 탭(members) 테이블 행을 클릭 가능하게 만들고, 행 클릭 또는 우측 "상세 →" 버튼을 누르면 허브 페이지로 점프한다.

## ✅ 결과

- `v_hotel_manager_full` VIEW 라이브 적용 — 매니저 3명 정상 조회 (joylife8760 / leejifilm / dgmasters01)
- `admin-manager-hub.html` 라이브 배포 — Vercel HTTP 302 (보호된 페이지, 로그인 후 접근)
- `_admin/admin.html` members 탭 행 클릭 가능 — 호텔 매니저 이름 옆 "상세 →" 버튼 + 행 전체 클릭
- CS 메모 추가/조회 동작 — `admin_notes` 테이블 insert + 즉시 화면 갱신
- 6개월 보장 D-day 자동 계산 — 결제일 + 180일 - 현재일
- 캠페인 단계 자동 판정 — `lifecycle_stage` 컬럼이 welcome/early_sales/active_monitoring/rebill_window/final_decision_window/guarantee_expired 자동 분류
- 보장 안전도 자동 판정 — `guarantee_status` 컬럼이 safe/moderate/pending/risk_refund/no_payment 자동 분류

## ⏱ 다음 결정 필요

대표님 라이브 화면 확인 후 피드백:
1. `gohotelwinners.com/admin.html` 로그인 → "가입자" 메뉴 → 행 클릭 또는 "상세 →" 버튼
2. 화면 보시고 빠진 정보·잘못된 위치·디자인 어색한 부분 알려주심
3. 푸시 버튼 4개는 클릭 시 "다음 단계에서 박힙니다" 토스트만 뜸 (BL-MANAGER-MANUAL-PUSH에서 실제 메일 발송 박을 예정)

피드백 받은 뒤 다음 채팅에서 BL-MANAGER-IMPERSONATE (매니저 본인 화면 실제 연동) + BL-MANAGER-MANUAL-PUSH (푸시 버튼 메일 발송) 박는다.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 3개

- `sql/v_hotel_manager_full.sql` (신규, 130줄) — VIEW 정의 + 라이브 적용 완료
- `admin-manager-hub.html` (신규, 651줄) — 좌우 분할 페이지, Supabase 직접 쿼리, Aurora 디자인
- `_admin/admin.html` (수정) — `renderMembers()` 함수에 행 클릭 핸들러 + "상세 →" 버튼 추가

## VIEW 핵심 설계 — LEFT JOIN LATERAL 사용 이유

매니저 1명 = 1줄 보장하려면 호텔·결제·예약·영상·메모를 1:1로 매핑해야 한다. `bookings`처럼 매니저당 N건인 테이블은 `LEFT JOIN LATERAL (SELECT count(*), sum(amount) ...)` 패턴으로 집계 후 조인 — 매니저 0건이면 NULL 반환. `payments`는 `ORDER BY paid_at DESC LIMIT 1`로 최신 결제 1건만.

## 캠페인 단계 자동 분류 (VIEW 안에서 처리)

```
days_since_payment 계산
  → NULL                                 → signup_only (가입만 함)
  → 호텔 없음                            → paid_pending_hotel
  → refunded_at NOT NULL                 → refunded
  → > 180일                              → guarantee_expired
  → > 170일                              → final_decision_window
  → > 150일                              → rebill_window  ⭐ 재결제 매출 핵심
  → > 30일                               → active_monitoring
  → > 7일                                → early_sales
  → 그 외 (D-0~6)                         → welcome
```

자동 캠페인 봇(BL-MANAGER-AUTO-CAMPAIGN)이 이 컬럼만 보고 매일 새벽 발송 대상 추출.

## 보안 모델

- 페이지 자체는 Vercel 미들웨어가 `/admin-*` 경로 → 로그인 페이지 리다이렉트
- Supabase 호출은 anon key + JWT 세션 토큰 — RLS가 admins 권한 검증
- admin_notes insert는 `author_id = auth.uid()` 자동 세팅 (현재 페이지는 사용자 입력 받아 owner uid 박음)

## 라이브 검증 결과

```
=== VIEW 라이브 조회 ===
joylife8760@naver.com  → Westin Tokyo  / 미결제 / signup_only / no_payment
leejifilm@hanmail.net  → Lotte Hotel Seattle / 미결제 / signup_only / no_payment
dgmasters01@gmail.com  → 호텔 없음 / 미결제 / signup_only / no_payment

=== 페이지 응답 ===
GET /admin-manager-hub.html
HTTP/2 302 → /login.html?reason=no_session  (보호 정상)
```

## 후속 BL 작업 순서

1. **BL-MANAGER-IMPERSONATE** (좌측 매니저 화면 진짜 임포저네이트 — 매니저가 자기 페이지에서 보는 것 그대로) — 1주
2. **BL-MANAGER-MANUAL-PUSH** (우측 푸시 버튼 4개 실제 메일 발송 + Resend 템플릿) — 1주
3. **BL-MANAGER-AUTO-CAMPAIGN** (D-0/7/30/150/170 cron 봇) — 2주

총 4주 안에 매니저 허브 시리즈 완성 예정. 첫 4시간(이 채팅)에 전체 골격 + VIEW + 페이지 + 진입점 + CS 메모까지 박혔으니, 다음 채팅들에서 각 BL 별도 처리 가능.

## 헌법 점검

- 부칙 7 (단계 1개 = commit 1개): VIEW 박기 → 페이지 박기 → 진입점 박기 → tasks 박기 4개 commit
- 부칙 9 (가역성): VIEW는 `CREATE OR REPLACE`라 즉시 롤백 가능
- 부칙 12 (Self-QA): JS 문법 자체 검증 통과, Supabase 라이브 쿼리 검증 통과, Vercel 배포 응답 검증 통과
- 부칙 17 (사업가 V2 컨텍스트): BL 5개 모두 [지금/왜/결정하면] 3블록 박음
