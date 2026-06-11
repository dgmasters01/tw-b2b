# 작업 기록: 과거 예약 데이터 시스템 적재 (2026-06-11)

## 무엇을 했나 (대표님 언어)
- 그동안 "예약 데이터가 비어있어서(0건) 메인 숫자가 가짜"였던 문제를 해결.
- 과거 4년치 예약 3,774건이 옛 파일(booking-analytics.html)에 다 살아있는 걸 발견 → 대표님 엑셀 없이 그대로 시스템 예약 테이블(bookings_agoda)에 넣음.

## 결과 (원본과 100% 일치 검증)
- 3,774건 · $854,258 매출 · 2,082개 호텔 · 36개국 130도시 · 2023-03~2026-04
- 국가 TOP: 일본 1,373 · 태국 603 · 베트남 588 · 대만 471
- 상태: 전부 정상 예약(취소 0). 채널은 'legacy(과거 누적)'로 묶어 적재.

## 기술 메모 (Claude용)
- 소스: booking-analytics.html const D.bk (3,774 raw 레코드)
- 매핑: i→booking_id, h→hotel_name, ci/co→city/country, d→booked_at, cd/od→checkin/checkout, a→amount_usd, c→commission, s→status, st→star, dv→device. customer_country는 'South Korea' 일괄(한국 채널 전제).
- channels에 code='legacy'(과거 누적, is_active=false, 분석 비활성) 추가 후 FK 충족.
- upload_batch_id='legacy-migration-20260611'. 300건 배치×13. on conflict do nothing.

## 다음 (PENDING)
- 매달 신규 예약 = admin 엑셀 업로드 경로로 갱신 (월1회). [BUSINESS.md / decisions D-055]
- 메인 숫자·슬라이드를 이 데이터에 자동 연결 (기준시점 표기).
- customer_country가 전부 'South Korea'로 들어간 점: 실제 고객국가 데이터가 원본에 없어 한국 일괄. 추후 필요시 보정.
