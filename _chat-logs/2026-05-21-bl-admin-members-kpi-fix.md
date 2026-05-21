---
slug: 2026-05-21-bl-admin-members-kpi-fix
title: admin Members KPI 카드 거짓말 수정 (v_hotel_manager_full 뷰 SQL 버그)
date: 2026-05-21
tasks: [BL-ADMIN-MEMBERS-KPI-FIX]
commits: [TBD]
decisions: [D-046]
---

## 🎯 한 줄 요약

admin.html Members 탭 KPI가 PAID=0(실제 2)·SIGNUP ONLY=3(실제 2)으로 거짓 표시. 라이브 DB 직접 확인 결과 원인은 `v_hotel_manager_full` 뷰가 `payments.status='completed'`로 찾는데 실제 값은 `'succeeded'`(PayPal 표준)였음. 추가로 `paid_at`이 NULL인 결제 1건도 누락. 뷰 SQL 두 줄 고치고 라이브 적용 완료. PAID=2/SIGNUP ONLY=2/HOTEL REG=3으로 정상화.

## ✅ 완료한 것 (무엇을 했나)

1. **진단**: 라이브 Supabase Management API로 4개 테이블 직접 조회
   - `payments`: 2건 모두 `status='succeeded'` (뷰는 `'completed'` 찾고 있었음 → 0건 매칭)
   - `payments.paid_at`: 1건 NULL (joylife8760), 1건 정상 (leejifilm)
   - `hotels.status`: 3건 모두 `'paid'`
   - `auth.users`: 매니저 4명 (테스트 계정 2 + 실제 2)

2. **뷰 SQL 3개 수정** (`sql/v_hotel_manager_full.sql`):
   - LATERAL JOIN: `payments.status = 'completed'` → `'succeeded'`
   - `payment_paid_at`: `p.paid_at` → `COALESCE(p.paid_at, p.created_at)` (NULL 폴백)
   - `lifecycle_stage` / `guarantee_status` 판정: `p.paid_at IS NULL` → `p.id IS NULL` (결제 row 존재 여부로 판단)
   - 6개월 보장 D-day 계산도 폴백 적용

3. **Supabase 라이브 적용**: Management API `POST /v1/projects/{ref}/database/query` → `CREATE OR REPLACE VIEW` 성공

4. **라이브 검증 PASS**:

   | 매니저 | 이전 (거짓) | 이후 (진실) |
   |---|---|---|
   | leejifilm@hanmail.net | signup_only, payment_status=null | **paid_pending_hotel, succeeded, D-22** |
   | joylife8760@naver.com | signup_only, payment_status=null | **paid_pending_hotel, succeeded, D-21** (created_at 폴백) |
   | t_signout_... | signup_only | signup_only (테스트 계정 — 정확) |
   | dgmasters01@gmail.com | signup_only | signup_only (어드민, 호텔 없음 — 정확) |

   KPI 미리 계산:
   - TOTAL=4 / **PAID=2** / **SIGNUP ONLY=2** / **HOTEL REG=3** / REBILL=0 / RISK=0

## 🤔 왜 (이렇게 했는가)

**원인 = 약속어 미스매치 1건 + NULL 처리 누락 1건**

- 페이팔 통합 코드가 `payments.status`를 `'succeeded'`로 박는 게 PayPal API 표준
- 뷰는 `'completed'`를 찾도록 박혀있었음 (BL-MANAGER-HUB-VIEW 박을 때 가정만 하고 라이브 데이터로 검증 안 함)
- 결과: 매니저 전원 `payment_status=null` 반환 → KPI 6개 카드 전부 잘못된 숫자

**대표님 선택 (1-A + 2-B)**:
- 1-A: `status='succeeded'`만 결제로 인정 (hotels.status='paid'는 제외 — 테스트 계정도 paid로 박혀 거짓 양성 위험)
- 2-B: paid_at NULL이면 created_at으로 폴백 (운영 진입 전 테스트 결제 호환 + 운영 진입 시 테스트 계정 일괄 삭제 예정)

**`p.paid_at` → `p.id` 판정 기준 변경 이유**:
- 폴백 적용 후에는 `paid_at`이 NULL이어도 `created_at`이 들어가서 사실상 NULL 안 됨
- 그러나 "결제 row 존재 여부" 자체로 판정하는 게 의미상 더 정확 (결제됐냐 = 결제 row 있냐)

## 💼 사업 영향

**Before (거짓 화면 — 사업 판단 오류 위험)**:
- PAID=0 → "한 명도 결제 안 했네" → 매출 0 오해 → 잘못된 마케팅 결정 위험
- SIGNUP ONLY=3 → 미결제 매니저 캠페인 잘못 발송 위험
- D-day 계산 안 됨 → 6개월 보장 만료 알림 못 보냄

**After (정확)**:
- PAID=2 = 실제 매출 $400 (테스트 결제 포함, 운영 진입 시 정리 예정)
- 6개월 보장 D-day 정상 표시 (leejifilm D-157, joylife8760 D-158)
- `lifecycle_stage='paid_pending_hotel'` 정확 인식 → 매니저 자동 캠페인이 올바른 단계 매니저에게 발송 가능

**연쇄 자동 반영 (4곳, 뷰 1개 수정으로 끝)**:
- `_admin/admin.html` Members 탭 KPI
- `admin-manager-hub.html` 매니저 1명 허브 페이지
- `api/admin.js` (line 775) 매니저 상세 조회
- `api/cron/manager-campaign.js` 자동 캠페인 발송 워크플로

## 🚀 다음 행동

1. **이번 commit 후 어드민 화면 자동 반영** (Vercel 배포 불필요 — 뷰는 이미 라이브)
2. **단계 5 검증 보고**: 대표님이 admin.html → Members 탭 새고침해서 PAID=2 보이는지 1초 확인 권장
3. **(별도 BL) 운영 진입 시 테스트 계정 삭제**:
   - 삭제 대상: `t_signout_1779328608210@test.travelwinners.tw`, `dgmasters01@gmail.com`(어드민이라 제외 가능)
   - 삭제 시 hotels/payments cascade 또는 별도 삭제 SQL 필요
   - 새 BL 등록: `BL-OPS-TESTDATA-CLEANUP` (P2, small) — 운영 진입 직전 1회 실행
4. **(별도 BL) `payment_status` enum 표준화 검토**:
   - 현재 코드 전체에 `'completed'` 가정한 곳이 더 있을 수 있음 (BL-MANAGER-HUB-VIEW 외)
   - grep으로 `'completed'` 사용처 전수 확인 권장
   - 새 BL 등록: `BL-PAYMENTS-STATUS-AUDIT` (P1, medium)

## 🎓 알아두기 (다음 클로드용)

### payments 테이블 status 값 표준

- **`'succeeded'`** = PayPal 결제 성공 (단일 진실원)
- `'completed'`라는 값은 코드 전체에서 **잘못된 가정** — 사용 금지
- 새 코드 박을 때는 항상 `payments.status = 'succeeded'` 사용
- enum 강제 안 박혀있으므로 라이브 데이터로 항상 검증

### `paid_at` vs `created_at` 폴백 패턴

- `paid_at` = PayPal webhook이 실제 결제 완료 시각 박음 (정식 운영)
- `created_at` = payments row INSERT 시각 (백업)
- 테스트 결제·일부 오래된 결제에서 `paid_at` 누락 가능
- 폴백: `COALESCE(p.paid_at, p.created_at)` — 운영 진입 후에도 안전망

### 뷰 수정 후 화면 즉시 반영

- 뷰는 Vercel 배포 영향 받지 않음 (DB 객체)
- Management API로 `CREATE OR REPLACE VIEW` 박는 순간 라이브 적용
- admin.html은 새고침만 하면 새 뷰 결과 보임 (membersLoaded 캐시 무효화는 ↻ Refresh 버튼)

### Supabase Management API 사용법 (재사용)

```bash
curl -X POST "https://api.supabase.com/v1/projects/vjsludfjsphwnumuoqaj/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -H "User-Agent: tw-b2b-claude/1.0" \
  -d '{"query": "..."}'
```

**User-Agent 헤더 필수** (없으면 403). 대표님께 SQL Editor 붙여넣기 요청 금지 (헌법 부칙 4).

## 📝 결정 (D-046)

**v_hotel_manager_full 뷰 결제 판정 기준: `payments.status='succeeded'` + `COALESCE(paid_at, created_at)` 폴백**

근거:
- PayPal 통합 코드가 박는 실제 값이 `'succeeded'` (라이브 확인)
- 테스트 결제도 운영 진입 전까지는 진짜 결제와 동일하게 카운트 (대표님 결정)
- `hotels.status='paid'`는 결제 판정에서 제외 (테스트 호텔도 paid 박혀있어 거짓 양성)

대표님 명시: 운영 진입 시점에 테스트 계정 일괄 삭제. 그 시점까지는 현재 4명(테스트 2 + 실제 2)을 진실로 취급.
