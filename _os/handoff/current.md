# 인계서 — BL-ADMIN-HOTEL-DETAIL Phase 1·4 완료 (50%) · Phase 2·3 차례

**작성**: 2026-06-02 (Phase 1 본구현 + Phase 4 기수집 확인 완료)
**다음 채팅 첫 fetch = boot.md 1개 → 이 파일.**

---

## 🚦 다음 채팅 첫 행동
1. `_os/boot.md` 1개 fetch → 2. 이 파일 → 3. 아래 "다음 작업"(우선 Phase 2 = 대표님 결정 필요) → 4. tasks.json 라이브 재확인

---

## ✅ 완료 (BL-ADMIN-HOTEL-DETAIL, 진행률 50%)

### Phase 1 — 관리자 호텔 상세 분석 페이지 본구현
- `api/hotel-bookings.js`: `rpc/is_admin` 판정 → 관리자 `v_admin_bookings`/`v_admin_channel_stats`(수수료 포함), 비admin 매니저뷰 폴백(수수료 비노출). 응답에 `is_admin` 플래그.
- `admin-hotel-detail.html`(루트 신설): `tw-admin-auth` 서랍, `?hotelId=`, 탭4(개요·채널별·패턴·예약상세), 헤더에 담당 매니저(이메일·이름·연락처·단계), ko/en.
- `_admin/admin.html` 호텔목록에 '분석' 버튼 → `/admin-hotel-detail.html?hotelId=`.
- 검증: Edge Middleware `admin-*` 자동 게이트(비인증 302) + API is_admin 분기 = 수수료 이중 방어. API 토큰없음 401 정상.

### Phase 4 — 담당 매니저 이름·연락처 (이미 충족 확인)
- 인계서의 "signup.html 추가"는 부정확. 실제 수집 위치 = **`hotel-info.html`** — `contact_name`·`manager_position`·`contact_phone`/`whatsapp`를 필수값으로 저장 중(updateHotel). 표시는 Phase1 헤더에서 완료. → **추가 작업 없음.**

### 확정 결정
- 「마케팅전」 라벨 확정 (대표님 2026-06-02). ③ 화면 라벨로 사용.

---

## ⛔ 점검에서 드러난 전제 (Phase 2·3의 핵심)
- **예약 데이터 현재 0건**: `bookings_agoda`=0, `v_admin_bookings`=0. → admin-hotel-detail 화면은 지금 모든 호텔 빈 화면(틀 정상, 데이터 없음). 운영 진입 정리로 비운 것으로 추정(대표님 미확정).
- **회차 테이블 부재**: `campaign_log` 없음. 있는 `manager_campaign_log`는 "매니저 메일 발송 로그"(stage/sent_at/resend_id…)라 회차(캠페인 기간)와 무관.

---

## 다음 작업 — Phase 2·3 (둘 다 데이터/결정 대기)

② **회차 + 기간 4구분(마케팅전/기간/후/전체)** — 🔴 새 테이블 신설 필요.
   - **대표님 결정 필요(②의 본질 결정)**: 회차 시작일을 (a) 호텔 `published_at`(송출 시작)으로 자동 산출할지, (b) 회차마다 수동 입력할지.
   - 결정 후: `hotel_campaigns`(가칭) 테이블 = hotel_id·round_no·started_at·ended_at(6개월). 예약을 `booked_at` 기준 4구분 → admin-hotel-detail '개요/예약상세'에 기간 토글.
③ **「마케팅전」 예약 매칭** — 🟡 로직 작성은 가능하나 예약 0건이라 검증 불가 → ②(회차 시작일) 확정 + 예약 데이터 충전 후 진행. 과거 예약을 호텔명+도시+국가로 매칭해 회차 시작일 이전 = 「마케팅전」 분류.

## ❓ 미정
1. 예약 데이터 0건이 의도된 빈 상태인지 (Phase2·3 전제).
2. ② 회차 시작일 방식: 송출일 자동 vs 수동 입력.

## 다음 채팅 금지
- 헌법 풀 fetch / admin.html(6.7천줄) 통째 인라인 / 매니저 화면 수수료 노출 / 메모리만 믿고 작업대상 확정 / signup.html에 매니저 연락처 추가(이미 hotel-info.html에 있음 — 중복 금지)

---
**호칭: 대표님. 언어: 한국어. 사업가 언어 강제(부칙18).**
