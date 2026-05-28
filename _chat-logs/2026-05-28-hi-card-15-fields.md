# BL-ANALYTICS-HOTEL-INFO-WIRE — admin hi-card 호텔필드 8→15개 확장

- 날짜: 2026-05-28 (완료 commit: 035cf27, 상태닫기: 이 채팅)
- 한 일: hotel-info.html 매니저 입력값이 admin hi-card에 8필드만 보이던 것 → 운영 핵심 7필드(star_rating, property_type, daily_rate, free_wifi, include_breakfast, image_url, whatsapp) 추가해 15필드로 확장.
- 결과: admin 분석 카드에서 호텔 상세 정보가 더 많이 보임 (단일진실 — DB 실제 컬럼만 사용).
- 검증: 라이브 fetch 통과 (commit 035cf27).
- 비고: DB에 없는 컬럼(객실수/체크인 등)은 추가 안 함 (대표님 '필요없음' 확정). status 누락 복구 commit.
