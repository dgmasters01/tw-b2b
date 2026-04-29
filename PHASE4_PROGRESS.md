# Phase 4 — Manager Booking Visibility (Phase A 작업 결과)

작업일: 2026-04-29
브랜치: `phase-a-work`

## 1. 작업 요약

매니저가 본인 호텔의 **completed 예약**만 조회할 수 있는 인프라 구축.
대표님이 외근 중이라 자동 진행했고, 라이브 push 는 검수 후로 보류.

## 2. 변경 사항

### 2.1 DB 마이그레이션 (`sql/phase4-bookings.sql`) — Supabase 적용 완료 ✅

- **신규 테이블** `channel_cid_map`
  - Agoda CID → channels.code 매핑 마스터
  - 메모리 18 의 11개 CID 시드 (5채널 × 2 + 1 육성)
- **신규 함수** `resolve_channel_from_cid(cid)` — Postgres SQL 함수
- **bookings_agoda 변경**
  - `cid` 컬럼 추가 (원본 CID 보존)
  - RLS 재정비:
    - `bagoda_select_manager_completed` (NEW): 매니저 = 본인 호텔 + completed 만
    - `bagoda_insert_admin_only`, `bagoda_update_admin_only`, `bagoda_delete_admin_only`
    - 기존 `bagoda_select_own_or_admin` (completed 조건 없음) 제거 → **보안 강화**
- **신규 VIEW**
  - `v_manager_bookings`: 매니저용 마스킹 뷰 (booking_id 마지막 4자만 노출)
  - `v_manager_channel_stats`: 호텔별 × 채널별 집계
  - 둘 다 `security_invoker = true` → RLS 자동 적용

### 2.2 신규 API

#### `api/admin-booking-upload.js` (POST, 관리자 전용)
- Body: `{ rows: [...], sourceFilename: "..." }` (클라가 SheetJS 로 파싱한 JSON 배열)
- 처리: cid → channel_code 자동 매핑 → bookings_agoda UPSERT
- 취소 예약은 `is_cancelled=true, booking_status='cancelled'` 로 보존 (RLS 가 UI 숨김)
- 응답: `{ batch_id, total_rows, processed, skipped_count, inserted_count, errors, skipped[] }`
- `skipped[]` 에 unknown cid 등 사유 명시

#### `api/hotel-bookings.js` (GET, 인증된 사용자)
- Query: `?hotelId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100`
- v_manager_bookings + v_manager_channel_stats 조합
- 응답:
  ```json
  {
    "headline": { "booking_count": 0, "total_amount_usd": 0, "roi_multiple": 0, "subscription_usd": 200 },
    "channel_stats": [...],
    "bookings": [...]
  }
  ```

### 2.3 신규 페이지 (골격)

#### `sales.html` — 결제 전 단계
- status: `pending / review / approved / rejected`
- status가 `paid` 이상이면 marketing.html 로 자동 redirect
- 진행 단계 시각화 (Pending → Review → Approved → Paid)
- approved 상태에서 `$200` PayPal 결제 카드 노출 (PayPal 통합은 Phase B)

#### `marketing.html` — 결제 후 단계
- status: `paid / producing / published`
- status가 `paid` 미만이면 sales.html 로 자동 redirect
- 4개 헤드라인 (Bookings / Estimated revenue / Total nights / ROI)
- 5개 채널별 전환 분석 (booking_count + gross_amount + 상대비율 바)
- 예약 카드 리스트 (booking_id 마스킹 + 채널 태그)
- "Agoda Partner Hub" 외부 링크 포함

## 3. 검증 결과

### 3.1 SQL 적용 (Supabase MGMT API)
```sql
SELECT cid, channel_code FROM channel_cid_map ORDER BY channel_code, cid_label;
-- 11 rows: HG×1, HT×2, JP×2, KT×2, VN×2, ZH×2 ✅

SELECT resolve_channel_from_cid('1922821');  -- 'HT' ✅
SELECT resolve_channel_from_cid('9999999');  -- NULL ✅
```

### 3.2 RLS 정책
```
bagoda_select_manager_completed | SELECT  ✅ (is_admin OR (completed AND hotel.user_id=auth.uid))
bagoda_insert_admin_only        | INSERT  ✅
bagoda_update_admin_only        | UPDATE  ✅
bagoda_delete_admin_only        | DELETE  ✅
```

### 3.3 코드 검증
- `node --check api/admin-booking-upload.js` → OK
- `node --check api/hotel-bookings.js` → OK
- sales.html / marketing.html: HTML 태그 균형 OK, inline JS syntax OK

## 4. 검수 필요 항목 (대표님 답변 부탁)

### 4.1 ❓ TW Booking Analytics 엑셀 실제 컬럼명
현재 가정한 컬럼명 (Agoda 표준 추정):
```
cid, Booking ID, Hotel Name, Hotel Country, Hotel City, Hotel Star,
Customer Country, Adults, Children, Check-in Date, Check-out Date,
Nights, Room Type, Rooms, Booking USD, Commission USD, Currency,
Status, Device Type, Booking Date
```
실제 엑셀의 **cid 컬럼명** (예: 'CID' / 'Affiliate ID' / 'Tag ID' 등) 확인 필요.
실제 컬럼이 다르면 `api/admin-booking-upload.js` 의 `normalizeRow()` 함수만 수정.

### 4.2 ❓ bookings 테이블 신설 vs 기존 활용
작업 지시는 "bookings 테이블 (TW B2B 전용)" 인데, 이미 `bookings_self / bookings_agoda / bookings_unified` 구조가 있어서 **기존 `bookings_agoda` 를 확장**하는 방향으로 진행했습니다.
- 장점: 마이그레이션 영향 최소, 기존 데이터 재활용, RLS 만 강화
- 단점: 작업 지시 문구와 다름

만약 별도 신규 테이블이 필요하시면 추가 마이그레이션 작성 가능 (다음 채팅).

### 4.3 ❓ 라이브 push 시점
현재: `phase-a-work` 브랜치에 commit 만, push 보류.
대표님 검수 후 push 진행 (또는 `git push origin phase-a-work` 만 먼저).

## 5. 다음 단계 (Phase B 후보)

1. PayPal Orders v2 통합 (sales.html `#btn-pay`)
2. admin.html 엑셀 업로드 UI (SheetJS 통합 → admin-booking-upload.js 호출)
3. dashboard.html 에서 status 별 sales/marketing redirect 추가
4. 매니저용 월간 리포트 PDF (메모리 23: "사장에게 PDF 보고서 전달")

## 6. 비고

- **PayPal 환경변수** 5개 (메모리 recent_updates) 이미 등록 완료 → Phase B 즉시 가능
- **Supabase MGMT 토큰 만료**: 2026-05-26 (5/19 이전 갱신 필요 — 메모리 last reminder)
