# WIP: B/C/A 재박기 (base64 사고 복구) — 2026-05-28

## 완료 (이번 채팅)
- ✅ 정책 기록 7건 (D9~D15) 2벌 저장: commit b60a6ec(사람용), 01c150a(Claude용), 2a5c349(tasks.json BL-DECISIONS-AUDIT-BOT)
- ✅ C: admin.html hi-card 6→15필드: commit 035cf27 (라이브 검증 통과)
- ✅ B: booking-analytics.html 탭 메뉴 sticky: commit dc5fb10 (라이브 검증 통과)

## 대기 (다음 채팅)
- ⏳ A: admin.html 대시보드 인박스 7카드
  - 위치: _admin/admin.html 라인 384 `id="tab-dashboard"` 영역 맨 위
  - 7카드 (내부운영 기준, 환불위기 표현 금지):
    1. 이벤트 예약 처리 대기
    2. D-30 누적성과 메일 대상
    3. D-Day 재계약 권유 대상
    4. 처리 대기 문의
    5. info_change_pending (호텔정보 변경 요청)
    6. video_status (영상 제작 상태)
    7. unpublished (미게시)
  - 데이터 출처: TW.db / bookings_unified VIEW / hotels 테이블
  - 주의: 환불 임박 위기 ❌ → "이벤트 예약 처리 대기" ✅ (헌법 TW B2B 외부약속vs내부운영 분리)

## 엄수 룰
- D12: plain text only (base64 절대 금지)
- D13: 매 commit SHA 직지정 라이브 검증 (raw.githubusercontent.com/.../{SHA}/...)
- D14: 끊김 트리거 4종 측정 후 단정
- 자동 창구: POST gohotelwinners.com/api/ops/github-commit, header x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message,branch}

## 검증된 사실 (이번 채팅 발견)
- admin.html 진짜 위치 = _admin/admin.html (6121줄, GitHub). 라이브 gohotelwinners.com/admin.html은 로그인 페이지
- Vercel 라우팅: /_admin/:path.html → 루트로 리다이렉트
- hotels 테이블 실제 컬럼 = hotel_name/hotel_name_local/property_type/star_rating/daily_rate/currency/address/city/country/phone/website/lat/lng/review_score/review_count/image_url/agoda_*/include_breakfast/free_wifi/contact_name/manager_position/contact_email/contact_phone/whatsapp/status
- 객실수·체크인·체크아웃·주차·시설·언어·취소정책 = DB에 없는 컬럼 (C 작업에서 절대 추가 안 함, 대표님 "필요없음" 확정)
- Supabase: https://vjsludfjsphwnumuoqaj.supabase.co / publishable key sb_publishable_IluITb52iuwwHf9xgP99MA__KX-sNM6
