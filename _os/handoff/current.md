# 인계서 — 매니저 수수료 노출 차단 완료 · BL-ADMIN-HOTEL-DETAIL 본구현 차례

**작성**: 2026-06-02 (우선 처리 = 발견 이슈 수정 완료)
**다음 채팅 첫 fetch = boot.md 1개 → 이 파일.**

---

## 🚦 다음 채팅 첫 행동
1. `_os/boot.md` 1개 fetch → 2. 이 파일 → 3. 아래 "다음 작업"(BL-ADMIN-HOTEL-DETAIL 본구현) 시작 → 4. tasks.json 라이브 재확인

---

## ✅ 직전 채팅(2026-06-02)에서 완료한 것

### 1) 권한 검증 (미정③) = YES
- admin 토큰으로 임의 호텔 예약 조회 가능. 기존 `/api/hotel-bookings?hotelId=X` 재사용. 별도 API 불필요.
- 근거: API는 토큰을 PostgREST에 그대로 전달 → RLS 판정. `bookings_agoda_select_admin` = `is_admin(auth.uid())` 전체 허용. 뷰 security_invoker=true.

### 2) 발견 이슈 우선 처리 — DB 실상태 확인 후 수정 완료
실제 DB는 `api/ops/db-query` 창구로 직접 조회·수정함 (Claude 자율 실행, x-ops-token).
- **이슈① 매니저 수수료 노출 (실재) → 차단 완료**:
  - `v_manager_bookings`·`v_manager_channel_stats` 에서 `commission_usd` 제거 (DB 적용).
  - admin 전용 `v_admin_bookings`·`v_admin_channel_stats` 신설 (commission 포함 + `WHERE is_admin(auth.uid())` → 매니저는 0행).
  - `marketing.html` line 409 수수료 표시 코드 제거 (commit b4acb8e).
  - SQL 영구기록: `sql/fix-manager-commission-leak.sql` (commit e49a7f9).
- **이슈② 매니저 RLS 약함 (실재) → 강화 완료**: `bookings_agoda_select_manager` 에 `is_completed AND NOT is_cancelled` 추가 (이중 방어).
- **이슈③ is_admin 모호성 → 거짓경보**: 실제 DB엔 `is_admin(uuid)` 1개뿐(DEFAULT 포함). 조치 불필요.

### 검증 통과 (db-query 재조회)
- 매니저 뷰 commission 컬럼: 없음 ✅ / admin 뷰 commission: 있음 ✅ / 매니저 정책 completed 조건: 포함 ✅ / admin 뷰 2종 신설 ✅

---

## ⚠️ 코드↔DB 정합성 잔여 (급하지 않음, 정리 권장)
- `sql/phase4-bookings.sql`(옛 v_manager_bookings 정의, commission 포함)·`00-helpers.sql`(is_admin 인자없는 정의)은 실제 DB와 어긋남. 누가 재실행하면 회귀 위험 → 시간 날 때 실제 상태에 맞춰 정리.

---

## 다음 작업 — BL-ADMIN-HOTEL-DETAIL 본구현 (대표님 승인 완료)
① 매니저 분석 형태 미러링 admin 상세 페이지 (허브 목록 → 호텔 클릭 → 별도 페이지). 탭=개요·채널별·패턴·예약상세.
   - **API 분기 필요**: `api/hotel-bookings.js` 가 admin이면 `v_admin_bookings`/`v_admin_channel_stats`(commission 포함) 사용하도록 수정. admin 판정 = `rpc/is_admin` 호출 또는 me.email admins 조회. (현재 API는 v_manager_* 만 씀 → admin도 commission 못 봄 → 분기 추가 필수)
② 회차(campaign_log) + 기간 4구분(마케팅전/기간/후/전체) → 각 회차 6개월로 예약 자동분류.
③ "마케팅 전 예약" = 과거 데이터 호텔명+도시+국가 매칭 → admin 연결 확정.
④ 담당 매니저 이름·연락처 = signup.html 필드 추가 + 상세 머리 표시.

## ❓ 여전히 미정
1. "마케팅 전 예약" 명칭 확정 (클로드 추천=「마케팅 전 예약」).
2. `admin.html` members 데이터 구조 직접 확인 (6225줄).

## 다음 채팅 금지
- 헌법 풀 fetch / booking-analytics 거대 인라인 통째출력 / 매니저 화면·응답 수수료 노출 / 메모리만 믿고 작업대상 확정

---
**호칭: 대표님. 언어: 한국어. 사업가 언어 강제(부칙18).**
