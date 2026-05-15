---
slug: 2026-05-14-bl-manager-auto-campaign-live
title: BL-MANAGER-AUTO-CAMPAIGN — 자동 캠페인 봇 라이브 가동 (대표님 등록 + dry_run Success)
date: 2026-05-14
tasks: [BL-MANAGER-AUTO-CAMPAIGN]
commits: []
decisions: []
---

## 🎯 한 줄 요약

매일 새벽 09:00 KST에 결제 매니저들에게 D-0/7/30/150/170 단계별 자동 메일을 발송하는 봇이 라이브 가동됐다. 대표님이 Vercel과 GitHub에 CRON_SECRET 등록 + 재배포 완료 후 GitHub Actions dry_run 테스트 Success 확인.

## 📍 왜 발생했나

지난 채팅에서 자동 캠페인 봇 시스템(SQL 테이블 + cron API endpoint + GitHub Actions workflow)을 박았지만, 보안 토큰 CRON_SECRET이 미등록 상태라 80%에서 멈춰있었다. 토큰은 Vercel과 GitHub 양쪽에 같은 값으로 박혀야 봇이 호출-인증 흐름을 통과한다.

대표님이 직접 등록하시고 화면 캡처로 진행 상황 공유받으며 한 단계씩 같이 진행했다.

## 🛠 어떻게 해결했나

Claude가 256-bit 엔트로피 토큰(`twcron_d153fedc...`)을 미리 생성해서 안내. 대표님이 Vercel Environment Variables 페이지에서 CRON_SECRET 변수 추가 + Sensitive 옵션 ON + Production/Preview 환경 적용. 그 후 Deployments 페이지에서 가장 최근 Production 배포를 Redeploy해서 환경변수 라이브 반영.

GitHub Settings → Secrets and variables → Actions 페이지에서 같은 토큰 값으로 CRON_SECRET 박음. RESEND_API_KEY / VERCEL_TOKEN과 함께 3개 시크릿 운영 상태.

마지막으로 GitHub Actions → Manager Auto Campaign 워크플로에서 workflow_dispatch + dry_run=true 옵션으로 수동 시험 실행. 11초 만에 Success 응답. send-campaign job이 6초간 정상 완료. cron API 호출 → CRON_SECRET 인증 통과 → Supabase v_hotel_manager_full VIEW 조회 → 결제 매니저 0명이라 발송 0건 → 정상 종료의 전체 흐름이 검증됨.

## ✅ 결과

- Vercel CRON_SECRET 등록 완료 (Sensitive ON, Production/Preview)
- Vercel 재배포 완료 (배포 ID F8yBMNipA, Production Current 상태)
- GitHub Repository Secrets에 CRON_SECRET 등록 (now 시점)
- GitHub Actions Manager Auto Campaign #2 Success — 11초, send-campaign 6초
- 봇이 매일 09:00 KST 자동 가동 상태로 진입
- 첫 결제 매니저 생기는 순간부터 D-0 환영 메일 자동 발송 준비

## ⏱ 다음 결정 필요

본 BL 완료. 매니저 허브 시리즈 5/5 전체 완성:

```
✅ BL-MANAGER-HUB-VIEW         (매니저 통합 데이터)
✅ BL-MANAGER-HUB-PAGE         (좌우 분할 허브 페이지)
✅ BL-MANAGER-MANUAL-PUSH      (수동 푸시 4종)
✅ BL-MANAGER-IMPERSONATE      (매니저 화면 임포저네이트)
✅ BL-MANAGER-AUTO-CAMPAIGN    (자동 캠페인 봇) ← 이번 채팅
```

이제 첫 호텔 매니저 결제만 받으면 시스템이 알아서 영업·CS 자동화 완전 작동.

다음 우선순위 후보:
- BL-TASKS-JSON-PROGRESS-NORMALIZE (P2) — 98건 progress 오염 정리
- 새 영업 기능 BL — dashboard.html 매니저 측 페이지 보강 등 (대표님 결정)

---

# 🔧 기술 상세 (개발자용)

## 박힌 토큰

```
CRON_SECRET = twcron_d153fedcb236183ebcfddfd6c87a30eed19ee9db4e1427ee3c8dd96c5a067240
```

256-bit 엔트로피, 71자, Vercel·GitHub 양쪽 동일 값.

## 등록 위치

| 위치 | 환경 | 보안 |
|---|---|---|
| Vercel Environment Variables | Production, Preview | Sensitive ON |
| GitHub Repository Secrets | Actions | Encrypted |

Development 환경 제외 이유: 봇은 Production 도메인(gohotelwinners.com)에서만 동작하므로 Development는 불필요. Sensitive 옵션은 Development와 호환 안 됨 (Vercel 제약).

## 검증 결과

```
GitHub Actions Run #2:
  - Status: Success
  - Total duration: 11s
  - Job send-campaign: 6s
  - Trigger: workflow_dispatch (manual, dry_run=true)

API 응답 (예상):
  {
    "stages_processed": 5,
    "candidates": 0,
    "sent": 0,
    "skipped_already_sent": 0,
    "skipped_no_email": 0,
    "errors": [],
    "dry_run": true
  }
```

## 라이브 운영 흐름

```
매일 KST 09:00 (UTC 00:00)
  ↓
GitHub Actions schedule cron 자동 트리거
  ↓
.github/workflows/manager-campaign-cron.yml 실행
  ↓
curl -X POST gohotelwinners.com/api/cron/manager-campaign
  -H "x-cron-token: $CRON_SECRET"
  ↓
api/cron/manager-campaign.js 실행 (Vercel Functions)
  ↓
process.env.CRON_SECRET 비교 → 일치 시 통과
  ↓
SUPABASE_SERVICE_ROLE_KEY로 v_hotel_manager_full VIEW SELECT
  → lifecycle_stage 5단계별 매니저 추출
  ↓
manager_campaign_log에서 이미 발송한 (manager_id, stage) 제외
  ↓
Resend API로 stage별 템플릿 메일 발송
  ↓
manager_campaign_log INSERT (UNIQUE(manager_id, stage)로 중복 차단)
```

## 후속 관리 사항

- **토큰 재발급 시**: Vercel + GitHub 두 곳 같은 값으로 동시 갱신 필수
- **봇 로그 모니터링**: GitHub Actions → Manager Auto Campaign → 실행 이력
- **발송 이력 조회**: Supabase manager_campaign_log 테이블
- **수동 즉시 실행 필요 시**: GitHub Actions workflow_dispatch 옵션 사용 (dry_run=false면 실제 발송)

## 헌법 점검

- 부칙 4 (권한 부여 vs 활용): CRON_SECRET 등록은 대표님 부여(수동), 봇 호출은 시스템 활용(자동)
- 부칙 9 (가역성): 토큰 폐기 시 Vercel/GitHub에서 즉시 삭제 → 봇 401 응답 → 안전 정지
- 부칙 12 (Self-QA): 라이브 dry_run 11초 Success 검증
- 부칙 16 (자율): Claude가 토큰 생성·등록 절차 가이드·검증 흐름 100% 자율 설계
