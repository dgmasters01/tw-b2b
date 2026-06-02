# 인계서 — (우선) admin-status 연계 표시 + BL-ADMIN-HOTEL-DETAIL Phase 2·3 (D-054 확정)

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

## 다음 작업 (2026-06-02 D-054 확정 후)

### ⭐ 우선 — admin-status 연계 표시  ⟦tasks.json 등록완료: BL-STATUS-DECISION-WORK-LINK (P0)⟧ (대표님 요청: "정책 → 작업 → 완성도가 한 화면에 보이게")
- admin-status.html에 블록 신설: 최근 결정(DECISIONS_INDEX 상위 N개) ↔ 영향 작업(tasks.json) ↔ 완성도(stats)를 한 줄로 연결.
- 목적: 새 채팅에서도 "무엇이 정책이고 / 무슨 순서로 / 어디까지 됐는지"를 대표님이 눈으로 1초 파악(합의 증발 방지의 가시화).
- 부수: tasks.json `order` 필드가 중복·공백 다수 → 핵심 작업만 순서 재부여.

### 그다음 — BL-ADMIN-HOTEL-DETAIL Phase 2·3 (데이터·결정 모두 풀림)
- **선행**: 과거 예약 약 3,774건(booking-analytics.html 정적 스냅샷, 소실 아님)을 `bookings_agoda`로 **적재(복구)**. Phase 3·매니저허브·hotel-detail 전부의 전제 → 이것부터.
- Phase 2 회차: 회차 시작일 = 호텔 `published_at` **자동 산출**(+수동 수정 허용). [D-054]
- Phase 3 마케팅전 매칭: 송출일 기준 전/후 분리 표시. [D-053·D-054]
- 매니저 페이지 통계·예약형태 = **탭 UX**로 BL-MANAGER-PAGES-BOOKING-WIRE 진행. [D-054]


## ❓ 미정 → 2026-06-02 D-054로 해소
- 회차 시작일 산출 → **송출일 자동 확정**(대표님 기술 위임 → Claude 확정).
- 예약 0건 → 소실 아님(정적 스냅샷 보존). **적재(복구) 확정.**
- 남은 위임: admin-status 연계 블록의 구체 UI = Claude 결정.


## 다음 채팅 금지
- 헌법 풀 fetch / admin.html(6.7천줄) 통째 인라인 / 매니저 화면 수수료 노출 / 메모리만 믿고 작업대상 확정 / signup.html에 매니저 연락처 추가(이미 hotel-info.html에 있음 — 중복 금지)

---
**호칭: 대표님. 언어: 한국어. 사업가 언어 강제(부칙18).**
