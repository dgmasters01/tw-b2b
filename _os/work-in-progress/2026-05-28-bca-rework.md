# WIP: B/C/A 재박기 (base64 사고 복구) — 2026-05-28 [전체 완료]

## 완료 (전체)
- ✅ 정책 기록 7건 (D9~D15) 2벌 저장: commit b60a6ec / 01c150a / 2a5c349
- ✅ C: admin.html hi-card 6→15필드: commit 035cf27 (라이브 검증 통과)
- ✅ B: booking-analytics.html 탭 메뉴 sticky: commit dc5fb10 (라이브 검증 통과)
- ✅ A: admin.html 대시보드 인박스 7카드: commit 991c874 (라이브 검증 통과)
      - placeholder(Phase 1 Step 7 TODO) → "오늘 처리할 일" 7카드 인박스 교체
      - 7카드: 이벤트예약대기(bookings_self inquiry) / D-30메일(published+30일) / D-Day재계약(published 150~180일) / 처리대기문의(pending,review) / 호텔정보변경(approved) / 영상제작(producing) / 미게시(paid)
      - setActiveTab lazy-load 연결 + 카드 클릭 시 해당 탭 점프 + Refresh 버튼
      - 환불위기 표현 미사용 (내부운영 기준 준수)

## 대기
- (없음) B/C/A 3건 전부 완료. 이 WIP 종결.

## 검증된 사실 (이전 채팅 누적, 보존)
- admin.html 진짜 위치 = _admin/admin.html (현재 6225줄). 라이브 gohotelwinners.com/admin.html은 로그인 페이지
- hotels.status 라이프사이클: pending/review → approved → paid → producing → published / rejected,refunded,risk_refund
- 7카드는 hotels.status + bookings_self.booking_status에서 파생 (DB에 info_change_pending/video_status 같은 전용 컬럼 없음 — status값으로 매핑)
- 향후 개선 여지: info_change/event_pending은 status 파생이라 근사치. 전용 플래그 컬럼 생기면 정밀화 가능 (별건 BL)
