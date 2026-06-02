# 인계서 — BL-ADMIN-HOTEL-DETAIL Phase 1 완료 · Phase 2~4 차례

**작성**: 2026-06-02 (Phase 1 본구현 완료)
**다음 채팅 첫 fetch = boot.md 1개 → 이 파일.**

---

## 🚦 다음 채팅 첫 행동
1. `_os/boot.md` 1개 fetch → 2. 이 파일 → 3. 아래 "다음 작업"(BL-ADMIN-HOTEL-DETAIL Phase 2) → 4. tasks.json 라이브 재확인

---

## ✅ 직전 채팅(2026-06-02)에서 완료 — BL-ADMIN-HOTEL-DETAIL Phase 1

본질 결정 1개 = "관리자 호텔 상세 분석 페이지 본구현(매니저 분석 미러링 + 수수료 노출)".

### 1) API admin 분기 — `api/hotel-bookings.js`
- `rpc/is_admin`(사용자 토큰 컨텍스트) 판정 추가. true → `v_admin_bookings`/`v_admin_channel_stats`(수수료 포함, booking_id 원문). false/실패 → `v_manager_*` 매니저뷰 폴백(수수료 비노출, 안전 기본값).
- 응답에 `is_admin` 플래그 추가. 라이브 토큰없음 = HTTP 401 정상 확인.

### 2) 신규 페이지 — `admin-hotel-detail.html` (repo 루트)
- `tw-admin-auth` 인증 서랍(admin-manager-hub.html 패턴) 공유. `?hotelId=` 진입.
- 탭 4개: **개요**(예약수·GMV·우리 수수료 수익·ROI + 총숙박일·ADR) / **채널별**(채널별 예약·매출·수수료 바) / **패턴**(체크인 요일·기기·고객국가 Top — 현재 데이터로 산출) / **예약상세**(booking_id·투숙·박·국가·채널·금액·수수료·상태 테이블).
- 헤더에 **담당 매니저 정보**(`v_hotel_manager_full`: manager_email·담당자명·연락처/whatsapp·lifecycle_stage) 표시 → ④의 "표시" 부분은 기존 데이터로 선구현됨.
- ko/en 토글. 비admin 세션 감지 시 수수료 미표시 경고 배너.

### 3) 진입로 — `_admin/admin.html` 호텔 목록
- 각 호텔 행에 **'분석'** 버튼 추가 → `/admin-hotel-detail.html?hotelId={id}`.

### 검증 통과
- v_admin_* 뷰 컬럼 확인(commission 포함). is_admin RPC = authenticated EXECUTE 보유, anon 호출 시 false.
- Edge Middleware(`middleware.js`)가 `admin-*` 매칭 → 새 페이지도 자동 게이트(비인증 302 /login.html, admin-manager-hub와 동일). **페이지 게이트 + API is_admin 분기 = 수수료 이중 방어.**

---

## 다음 작업 — BL-ADMIN-HOTEL-DETAIL Phase 2~4

② **회차(campaign_log) + 기간 4구분** — 각 회차 6개월 기준으로 예약을 마케팅전/기간/후/전체로 자동분류. → '개요'·'예약상세' 탭에 기간 필터 추가. (campaign_log 테이블 스키마 먼저 db-query로 실확인)
③ **"마케팅 전 예약" 매칭** — 과거 데이터 호텔명+도시+국가 매칭 → admin 연결. 명칭 = 「마케팅 전 예약」(클로드 추천, 미확정).
④ **담당 매니저 연락처 신규 수집** — `signup.html`에 담당자 이름·연락처 입력 필드 추가(현재 헤더 표시는 기존 hotel_contact_* 활용 중). DB 컬럼 존재(hotel_contact_name/phone/whatsapp) → signup 폼에서 채우도록.

## ❓ 여전히 미정
1. "마케팅 전 예약" 명칭 확정 (클로드 추천=「마케팅 전 예약」).
2. campaign_log 실제 스키마(회차 시작일·호텔 매핑 방식) — db-query로 직접 확인 필요.

## 다음 채팅 금지
- 헌법 풀 fetch / admin.html(6.7천줄) 통째 인라인 출력 / 매니저 화면·응답 수수료 노출 / 메모리만 믿고 작업대상 확정

---
**호칭: 대표님. 언어: 한국어. 사업가 언어 강제(부칙18).**
