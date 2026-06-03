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
