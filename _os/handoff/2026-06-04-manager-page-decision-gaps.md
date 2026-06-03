# 인계 — 매니저 페이지 결정 미적용 점검 + 관리자 미러링 (2026-06-04)

## 0. 이 채팅에서 한 것 (완료)
- **결정 2벌저장 동기화(D5)**: D-052·D-053·D-054 → `_os/charter/decisions-index.md`(사본1) + `_business/decisions/2026-06-02-admin-hotel-detail-d053.md`(D-054 섹션). commit `1ff5471`·`fce6b2d`. decisions_sync green 자동 전환.
- **BL-ADMIN-HOTEL-DETAIL Phase 2 완료**: 기간 4구분(전체·마케팅 전·마케팅 기간·마케팅 후) 필터 + 기간별 재집계.
  - API: `api/hotel-bookings.js` — `hotels.published_at`+6개월로 캠페인 기간 산출, 예약별 `period`(booked_date 기준) 부여, 응답에 `campaign{published_at,guarantee_end_at,has_campaign}`. commit `2ba9aeb`.
  - 페이지: `admin-hotel-detail.html` — 기간 알약 4개 + filteredData/computeHeadline/computeChannels, 전체=서버소스 동기화. fetch limit 500. commit `cd6efe3` `[step:done:2]`.
  - Phase 3(마케팅 전 예약 매칭)는 **예약 데이터 0건**이라 막힘 → 과거 아고다 약 3,774건 `bookings_agoda` 적재 후 검증(D-054).

## 1. 대표님 지적 = 매니저 페이지 "결정했는데 미적용" (확인 완료)
결정 추적기(business-agreements.json)가 2026-05-27부터라, **5/16~17 매니저 결정은 추적 안 됨 → 누락 자동 미감지.**

### 라이브 미적용/축소 항목 (tasks.json + manager-dashboard.html 실측)
- **BL-004 매니저 정보 변경 시스템(3단계 차등)** = `blocked` — 결정한 "항목별(호텔명·주소·등급·Agoda링크) 전용 수정신청 폼" 미박.
- **BL-005 호텔 담당자 교체 시스템(Manager Handover)** = `blocked` — 미박.
- **관리자 '변경 신청 큐'(건수뱃지+승인/거절)** = 미박.
- 현재 라이브: `manager-dashboard.html` L404·L1342 `openInfoChangeRequest()` → "호텔 정보 변경 신청 →" 링크가 [새 문의]의 '정보 변경 신청' 카테고리로 보내는 **간단 버전만** 존재(FAQ L817~818). 결정했던 전용폼+관리자큐 아님.
- **고객 분석 6 인사이트** 중 라이브=국가별 분포·월별 추이·예약흐름 퍼널+KPI4만. **평균 박수·평일/주말·인원 구성·객실 타입·리드타임·ADR** = `BL-MGR-DASHBOARD-V1.1`(pending) placeholder로 미룸.
- 참고 partial: AGR-0007/0015/0018, not_implemented: AGR-0019(admin analytics 스티키 메뉴).

## 2. 관리자 호텔상세 ↔ 매니저 분석 미러링 (D-053 "매니저 분석 형태 미러링")
**매니저 고객분석 탭(미러 원본, 라이브)**: KPI4(총예약/확정매출/총박야/노쇼매출) + 국가별 분포 + 월별 추이 + 예약흐름 퍼널 + CSV.
**관리자 현재**: 개요(KPI 다름: 수수료·ROI 추가, 노쇼 없음) / 채널별(수수료 포함, 관리자 강점) / 패턴(요일·기기·국가 — 기기는 매니저에 없는 임의 추가) / 예약상세(수수료·원문 예약번호).
**미러링 시 할 일**: 관리자에 월별 추이·예약흐름 퍼널·CSV 추가 + KPI를 매니저식으로 맞춤(+관리자 전용 수수료·ROI 유지) + 임의 '기기 패턴' 정리.

## 3. 대표님 미결 결정 (다음 채팅에서 먼저 받을 것)
1. **어느 누락 먼저**: ① 정보변경/담당자교체(BL-004·005 + 관리자 변경신청 큐) / ② 고객분석 인사이트 6종 / ③ 관리자 미러링(2번) / ④ 복수.
2. **기간 버튼 방식 통일**: ① 매니저식 회차(1차/2차/전체) vs ② 관리자 D-054 마케팅 전/기간/후/전체. (둘 다 대표님 결정이라 충돌 — Claude 임의 불가)

## 4. 다음 채팅 회수 포인트
- 매니저 카드/수정신청 결정: 과거 채팅 `BL-MGR-DASHBOARD-V1 부팅 및 16개 결정사항 확인`(2026-05-17), `매니저 예약 화면 country drill 구현`(2026-05-16) — conversation_search로 회수.
- 매니저 분석 원본: 라이브 `manager-dashboard.html` `tab-analytics`(L890~), `exportAnalytics`(L2189).
- 관리자 대상: `admin-hotel-detail.html`(루트), `api/hotel-bookings.js`.
- 회차/예약 데이터: Phase 3 선행 = `bookings_agoda` 적재(과거 3,774건, D-054).

## 5. 매니저 페이지 탭 구조(라이브, 참고)
홈(tab-home) / 영상(tab-videos) / 결제(tab-payments: 계약요약+예약내역[예약번호 노출, 아고다 대조용]+인보이스) / 문의(tab-inquiry) / 고객분석(tab-analytics). 매니저는 예약번호(booking_no) 그대로 노출, 가리는 건 투숙객 개인정보(이름·이메일·전화)뿐 — D-035/아고다 약관(5/13) 확정.

---

## 6. 기존 확정 매니저 결정 — 회수 완료 (새 채팅 재검색 불필요)
출처: 과거 채팅 `매니저 예약 화면 country drill 구현`(2026-05-16) + `BL-MGR-DASHBOARD-V1 부팅 및 16개 결정사항 확인`(2026-05-17). 둘 다 conversation_search로 회수됨. 아래가 그때 확정한 매니저 설계 전문.

### 6-1. 고객 분석 탭 = 6가지 인사이트 (모두 라이브 컬럼 검증 완료)
| # | 인사이트 | 라이브 컬럼 | 영업 활용 |
|---|---|---|---|
| 1 | 국가별 분포 | customer_country | "다국적 고객" 영업 무기 |
| 2 | 평균 박수 | nights 평균 | 객실 운영 전략 |
| 3 | 평일/주말 비율 | checkin_date 요일 | 가격 정책 |
| 4 | 인원 구성 | num_adults + num_children | 객실 타입 배치 |
| 5 | 객실 타입 | room_type | 인기 객실 강화 |
| 6 | 예약 리드타임 | booked_at → checkin_date | 예측 운영 |

### 6-2. 추가 확정
- 채널별 분석 V1 = 예약 건수 + 예약금액만 (조회수/클릭/전환률은 별도 BL — YouTube API 필요)
- 국가별 예약금액 = customer_country × SUM(booking_amount_usd) V1에 포함
- PDF / 엑셀 다운로드 버튼 (호텔이 본사 보고용)
- 1차 / 2차 / 전체 기간 토글 (= 회차 토글. ⚠️ 관리자 D-054의 마케팅 전/기간/후와 충돌 — 3-2 결정 필요)
- 객실/인원 = 원본 값(room_type, num_adults, num_children) 그대로. "커플/가족" 분류는 V2.

### 6-3. 호텔 카드 변경 정책 = 모델 Y (확정)
- 매니저 본인 정보(전화 등) = settings에서 셀프 수정.
- 호텔 정보(호텔명·주소·등급·Agoda 링크) = 각 항목 옆 [수정 신청] 버튼 → **항목별 전용 폼 모달**.
- 1:1 문의(문의 탭) = 그 외 자유 질문용으로 유지.
- 관리자(대표님) = admin '변경 신청 큐'(빨간 뱃지 건수) → 항목별 현재값/새값/사유 → 승인/거절 2버튼 → 승인 시 자동 DB 반영 + hotel_change_history + 매니저 통보 메일.
- 대표님 마지막 코멘트: "너가 쉽게 관리할 수 있는 형태로" (구현 형태는 Claude 위임).

### 6-4. 라이브 구현 vs 결정 (현 상태)
- 고객 분석: KPI4(총예약/확정매출/총박야/노쇼매출) + 국가별 분포 + 월별 추이 + 예약 흐름 퍼널 + CSV = 구현됨(manager-dashboard.html tab-analytics). 6인사이트 중 평균박수/평일주말/인원/객실타입/리드타임/ADR = `곧 추가(V1.1)` placeholder = **미구현**(BL-MGR-DASHBOARD-V1.1 pending).
- 호텔 카드 모델 Y: 라이브엔 "호텔 정보 변경 신청 →"(openInfoChangeRequest, L404·1342)가 [새 문의] '정보 변경 신청' 카테고리로 보내는 **간단 버전만**. 항목별 전용 폼 + 관리자 변경 신청 큐 = **미구현**(BL-004 blocked).
- 담당자 교체(BL-005) = **미구현**(blocked).

### 6-5. 새 채팅 착수 순서 (대표님 3-1·3-2 결정 후)
이 메모 6장 = 매니저 확정 전문. 재검색 없이 바로 코드 박기 가능. ① 대표님이 3장의 1·2 결정 → ② 해당 결정 회수 불필요(6장에 다 있음) → ③ 관리자 미러링 or 매니저 미구현분 코드 박기 시작.
