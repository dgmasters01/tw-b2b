# 호텔 마스터 1단계 — hotels 확장 스키마 적용 (2026-07-13)

> BL-HOTEL-MASTER 착수. 결정문서 2026-07-13-hotel-master-direction.md 순서대로 첫 커밋.

## 결정 확정 (이번 세션)
- 호텔번호 = **뜻 없는 고유 연번 `hotel_code`(예 H-00001)**. 나라/도시/성급/유형은 번호에 넣지 않고 각 칸에서 관리, 화면에서 번호와 함께 표시.
  - 이유: 정보(성급 등)는 바뀌지만 번호는 영구여야 예약·콘텐츠·링크가 안 깨짐. 전세계 규모에서 유일하게 안 무너지는 방식.
- 화면(묶기 확정 UI) 위치는 **나중 단계**에서 결정 (자동 통합이 끝난 뒤 얹음). 지금은 뿌리에 번호 붙이는 것만.
- 매니저 가입 hotels 3행은 **개발 테스트용 임시** → 자동 통합에서 특별취급 안 함, 나중 정리 대상.

## 라이브 적용 내용
기존 hotels 테이블(39칸)에 새 칸 6개 추가 (기존 데이터 무손상, ADD COLUMN IF NOT EXISTS):

| 칸 | 타입 | 기본값 | 뜻 |
|---|---|---|---|
| hotel_code | text (UNIQUE) | null | 우리 고유 호텔번호 H-00001 |
| agoda_hotel_ids | jsonb | [] | 이 호텔에 묶인 아고다ID 목록 (다:1) |
| merge_status | text | null | auto / confirmed / ambiguous |
| operating_status | text | active | active / closed (예약없음 힌트) |
| former_names | jsonb | [] | 옛이름 이력 (리브랜딩 추적) |
| booking_count | integer | 0 | 예약 수 (큰 호텔 우선 확정 정렬) |

유니크 인덱스: idx_hotels_hotel_code ON hotels(hotel_code) WHERE hotel_code IS NOT NULL.

연결 다리: bookings_agoda.hotel_id(uuid) → hotels.id 를 자동 통합이 채움 (현재 0/7,169건).

## 현황 (라이브 실측)
- 예약 bookings_agoda 7,169건 / 아고다ID 3,903 / 이름 3,190 / 이름+도시 3,192.
- hotels 현재 3행(임시). 예약↔마스터 연결 0건.

## 다음 단계 (2단계)
자동 1차 통합 스크립트: 아고다ID + 이름 정규화 + 도시로 컴퓨터가 대부분 자동 묶음 → hotels에 마스터 행 생성 + hotel_code 발급 + agoda_hotel_ids 채움 + bookings_agoda.hotel_id 연결 + booking_count 집계 + merge_status=auto.
그 다음: 큰 호텔(booking_count 상위) 확정 UI → 성과표 호텔별 연결.
