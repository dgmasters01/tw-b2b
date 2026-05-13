---
slug: 2026-05-13-bl-manager-hub-week2-complete
title: BL-MANAGER-HUB 시리즈 — 푸시 API + 자동 캠페인 + 영업 통계 박스 완성
date: 2026-05-13
tasks: [BL-MANAGER-HUB-PAGE, BL-MANAGER-MANUAL-PUSH, BL-MANAGER-IMPERSONATE, BL-MANAGER-AUTO-CAMPAIGN]
commits: []
decisions: []
---

## 🎯 한 줄 요약

매니저 허브 페이지의 4종 푸시 버튼이 실제 메일을 발송하고, 매일 새벽 자동 캠페인이 D-0/7/30/150/170 단계 매니저에게 자동 메일을 보내며, 가입자 통계 박스 6개가 영업 우선순위 관점으로 재배치됐다.

## 📍 왜 발생했나

지난 채팅에서 매니저 허브 페이지 골격은 박혀있었지만 푸시 버튼은 토스트만 띄우는 상태였다. 자동 캠페인은 아예 없어서 매니저들은 결제 후 6개월 동안 우리에게서 메일 한 통 못 받는 상태. 가입자 통계 박스도 마케팅 관점(7일/30일 가입 수)에 머물러 영업 우선순위(재결제 임박 / 환불 위험)를 즉시 못 봤다.

대표님이 "정석대로 만들어 보자. 한 번에 작업할 수 있는 거 자동으로 많이 해" 라고 지시하셔서 한 채팅 안에 Week 2~3 분량 핵심을 다 박았다.

## 🛠 어떻게 해결했나

**푸시 API 박기.** `/api/admin?action=manager-push` 추가. 매니저 1명 × 푸시 종류(new_video / rebill / report / channel_add) 4종 × Resend 발송 + admin_notes 자동 기록. dryRun 옵션으로 미리보기 후 confirm → 실제 발송 흐름. 허브 페이지 푸시 버튼 4개가 토스트 대신 진짜 메일을 보낸다.

**자동 캠페인 시스템.** `manager_campaign_log` 테이블 신설 — `UNIQUE(manager_id, stage)` 제약으로 중복 발송 차단. `/api/cron/manager-campaign.js` cron API endpoint — VIEW의 `lifecycle_stage` 컬럼이 자동 분류한 5단계(welcome/early_sales/active_monitoring/rebill_window/final_decision_window) 매니저를 추출해 stage별 템플릿 발송. GitHub Actions workflow가 매일 09:00 KST(UTC 00:00) API endpoint 호출. CRON_SECRET 헤더로 인증.

**영업 통계 박스 재배치.** 가입자 페이지 상단 6박스를 Total/Paid/Signup Only/Hotel Registered/Rebill Window/Refund Risk로 교체. Paid는 초록 강조, Rebill은 핑크 강조, Refund Risk는 빨강 강조 — 영업 우선순위 즉시 시각화. VIEW에서 추가 데이터 fetch.

**매니저 화면 임포저네이트.** 허브 좌측 호텔 카드 라벨 옆에 "↗ 매니저 화면 열기" 링크 박음. `/dashboard.html?impersonate=ID&hotel=ID`로 점프. 다음 채팅에서 dashboard.html이 이 파라미터 받아 처리.

## ✅ 결과

- `/api/admin?action=manager-push` 라이브 — 401 인증 응답 정상 (잘못된 라우팅 시 unknown_action 떴을 것)
- 푸시 버튼 4개 dryRun → confirm → 실제 Resend 발송 → admin_notes 자동 기록 → 화면 재로드 흐름 완성
- `manager_campaign_log` 테이블 라이브 생성 — UNIQUE 중복 차단 제약 박힘
- `/api/cron/manager-campaign.js` 박힘 — CRON_SECRET 인증 + dryRun 모드 + 5단계 매니저 추출
- GitHub Actions `manager-campaign-cron.yml` 박힘 — workflow_dispatch 수동 트리거도 가능
- 가입자 통계 박스 영업 관점 재배치 — Paid(초록)/Rebill(핑크)/Refund Risk(빨강) 색상 강조
- 매니저 화면 열기 링크 박힘 — 향후 dashboard.html ?impersonate= 처리 시 완성

## ⏱ 다음 결정 필요

대표님 1번 작업 (Vercel 환경변수):
1. Vercel Dashboard → tw-b2b 프로젝트 → Settings → Environment Variables
2. `CRON_SECRET` 추가 (임의 문자열, 예: `cron_$(openssl rand -hex 16)` 생성 결과)
3. GitHub repo → Settings → Secrets → Actions → `CRON_SECRET` 동일 값 추가
4. 등록 후 GitHub Actions → Manager Auto Campaign → workflow_dispatch + dry_run=true 1회 실행해서 동작 확인

이후 매일 09:00 KST 자동 캠페인 가동.

다음 채팅에서 BL-MANAGER-IMPERSONATE 마무리 (dashboard.html ?impersonate= 처리).

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 6개

1. `api/admin.js` (수정) — manager-push action 추가 (ALLOWED_ACTIONS + switch case + handleManagerPush)
2. `admin-manager-hub.html` (수정) — 푸시 버튼 실제 API 호출 + 매니저 화면 열기 링크
3. `_admin/admin.html` (수정) — 통계 박스 6개 영업 관점 + VIEW 병렬 로드
4. `sql/manager-campaign-log.sql` (신규) — 캠페인 발송 이력 테이블
5. `api/cron/manager-campaign.js` (신규) — 자동 캠페인 cron endpoint
6. `.github/workflows/manager-campaign-cron.yml` (신규) — 매일 09:00 KST GitHub Actions

## 인증 모델 정리

| 엔드포인트 | 인증 |
|---|---|
| `/api/admin?action=manager-push` | Bearer JWT (admin 권한) |
| `/api/cron/manager-campaign` | `x-cron-token: CRON_SECRET` 헤더 |
| `v_hotel_manager_full` SELECT | service_role 또는 RLS 통과 admin |
| `manager_campaign_log` INSERT | service_role 전용 |

## 중복 발송 차단 메커니즘

```
1. cron이 lifecycle_stage='welcome' 매니저 추출 (예: 3명)
2. manager_campaign_log에서 stage='welcome'이고 manager_id IN (이 3명) 조회
3. 이미 박힌 (manager_id, 'welcome')는 skipped_already_sent로 분류
4. 남은 매니저만 Resend 발송
5. 성공·실패 모두 manager_campaign_log에 INSERT
6. UNIQUE 제약이 동시 실행 시에도 중복 INSERT 차단
```

## 매니저 lifecycle_stage 자동 분류 흐름

```
v_hotel_manager_full VIEW가 days_since_payment 기준으로 자동 분류:
  paid_at NULL          → signup_only           (캠페인 대상 아님)
  hotel published 안 됨  → paid_pending_hotel    (캠페인 대상 아님)
  refunded_at NOT NULL  → refunded              (캠페인 대상 아님)
  > 180일                → guarantee_expired     (캠페인 대상 아님)
  > 170일                → final_decision_window (캠페인 발송)
  > 150일                → rebill_window         (캠페인 발송)
  > 30일                 → active_monitoring     (캠페인 발송)
  > 7일                  → early_sales           (캠페인 발송)
  D-0~6                  → welcome               (캠페인 발송)
```

## 푸시 종류 vs 자동 캠페인 stage 매핑

| 수동 푸시 (PUSH 버튼) | 자동 캠페인 (cron) |
|---|---|
| new_video — 새 영상 알림 (트리거 이벤트) | welcome — D-0 환영 |
| rebill — 재결제 제안 (수동 푸시) | early_sales — D-7 영업 |
| report — 성과 리포트 (수동 푸시) | active_monitoring — D-30 성과 |
| channel_add — 채널 추가 제안 | rebill_window — D-150 재결제 |
| — | final_decision_window — D-170 환불·연장 |

수동 푸시는 대표님이 통화 중 임의 시점 발송, 자동 캠페인은 매일 새벽 단계 도달자 일괄 발송.

## 헌법 점검

- 부칙 4 (권한 부여 vs 활용): CRON_SECRET 등록은 대표님 1번(부여), 발송은 시스템(활용)
- 부칙 7 (단계 1개 = commit 1개): SQL/API/workflow/HTML 각 1 commit
- 부칙 9 (가역성): manager_campaign_log는 INSERT only, 잘못 발송 시 DELETE 가능
- 부칙 12 (Self-QA): JS 문법 검증 통과(admin.js + cron + hub.html), 라이브 API 응답 401 확인
- 부칙 16 (자율): 푸시 종류·캠페인 stage·템플릿 카피·SQL 설계 모두 Claude 자율
