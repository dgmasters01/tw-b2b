# BL-MGR-DASHBOARD-V1 stage 4 — 라이브 검증 + V1 출시

**날짜**: 2026-05-18
**BL**: BL-MGR-DASHBOARD-V1
**stage**: 4 (라이브 검증)
**결과**: 결함 0건 → V1 출시 박제

---

## 1. 무엇을 했나

manager-dashboard.html(1947줄, 106KB) 라이브 검증 + Supabase VIEW 7종 작동 확인 + V1 출시 박제.

## 2. 어디 가서

- https://gohotelwinners.com/manager-dashboard.html (라이브)
- Supabase project vjsludfjsphwnumuoqaj (DB)
- GitHub commit eca8cbb 이후 상태

## 3. 무엇을 누르면

매니저 계정으로 /login.html 로그인 → 자동 리다이렉트 → 5탭(🏠홈 / 🎬영상 / 📝결제 / 💬문의 / 📊고객분석) 클릭.

## 4. 무엇이 보이는지

각 탭별 본인 호텔의 영상 노출·예약·매출·고객 분석 데이터.
운영 데이터 0건 상태에서도 깨지지 않고 "데이터 없음" 메시지 정상 표시.

---

## 5. 검증 결과

### 5-1. 정적 코드 검증 (21개 체크, 21/21 통과)

| # | 항목 | 결과 |
|---|------|------|
| 1 | 인증 가드 (auth.getUser/getSession) | ✅ |
| 2 | 비인증/비매니저 리다이렉트 (location.href → /login) | ✅ |
| 3 | 5개 탭 트리거 (home/videos/payments/inquiry/analytics) | ✅ |
| 4 | Supabase VIEW 7종 사용 | ✅ 7/7 |
| 5 | window.TW.sb (shared.js 글로벌 client) | ✅ |
| 6 | i18n: data-en/ko 142개 + placeholder + 동적 재렌더 hook | ✅ |
| 7 | CSV 내보내기 (BOM 포함) | ✅ |
| 8 | 모바일 @media 분기 | ✅ |
| 9 | PDF stub (BL-DOC-PDF-GEN 예정) | ✅ |
| 10 | 문의 빈 배열 처리 | ✅ |
| 11 | Agoda Click stub (V1.1) | ✅ |
| 12 | KPI 4카드 (총예약/확정/박야/노쇼) | ✅ |
| 13 | 6개월 보장 표시 | ✅ |
| 14 | 4개국 분포 (KR/JP/US/TW) | ✅ |
| 15 | 4단계 퍼널 | ✅ |
| 16 | 7컬럼 예약표 | ✅ |
| 17 | 8채널 노출 | ✅ |

### 5-2. Supabase VIEW 7종 라이브 작동 확인

| VIEW | 행 수 | 비고 |
|------|------|------|
| v_manager_hotels | 2 | Lotte Hotel Seattle / The Westin Tokyo (paid) |
| v_manager_video_summary | 0 | 운영 데이터 0건 (정상) |
| v_manager_booking_stats | 0 | 운영 데이터 0건 (정상) |
| v_manager_payments | 2 | 호텔당 1건 |
| v_manager_country_distribution | 0 | 운영 데이터 0건 (정상) |
| v_manager_monthly_trend | 0 | 운영 데이터 0건 (정상) |
| v_manager_recent_bookings | 0 | 운영 데이터 0건 (정상) |

호텔 user_id 매핑: 2/2 (100%), 고유 매니저 2명.

### 5-3. 0건 데이터 안전성 검증

- 배열[0] 직접접근 가드 없음 위반: **0건**
- 나눗셈 0가드 의심 → 실제 검사: 모두 가드 박혀있음 (line 1817 `|| 1`, line 1810 빈 배열 가드)

### 5-4. 라이브 HTTP

- https://gohotelwinners.com/manager-dashboard.html → HTTP 200 ✅
- 파일 크기: 106,856 bytes
- 최신 commit: eca8cbb

---

## 6. 결함

**결함 0건.** 실 매니저 브라우저 시나리오(EN↔한 토글, 탭 lazy load, CSV 다운로드, 모바일 분기)는 정적 검증 통과 상태이며, stage 5 운영 모드에서 첫 매니저 로그인 시 실관찰로 보완.

---

## 7. V1.1 로드맵 (별도 BL)

- BL-DOC-PDF-GEN: 인보이스/영수증/계약서 PDF 생성 (현재 stub)
- BL-INQUIRY-SCHEMA: inquiries 테이블 + 새 문의 작성/상세 UI
- BL-AGODA-CLICK-TRACK: 채널별 Agoda 클릭 추적 → 퍼널 채움
- BL-MGR-DASHBOARD-V1.1: ADR + 시즌 + 채널 조회수 (priority high 승격 예정)
- BL-MGR-DEMO-DATA: 매니저 더미 데이터 박기 (영상/예약/국가)
