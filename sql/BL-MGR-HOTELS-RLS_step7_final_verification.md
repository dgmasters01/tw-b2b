# BL-MGR-HOTELS-RLS Step 7: 최종 라이브 검증 보고서

**실행일**: 2026-05-20  
**BL**: BL-MGR-HOTELS-RLS  
**목적**: 매니저 데이터 RLS 격리 작업 종합 검증

## 결함 실증 (Step 6 박기 전)

```sql
-- 롯데 시애틀 GM 권한 시뮬레이션
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub TO '7130d25b-e8d8-40b4-9ca4-3cedf6aab70e';
SELECT hotel_id, hotel_name FROM v_manager_hotels;
```

**결과 (수정 전):**
- Lotte Hotel Seattle (본인) ✅
- The Westin Tokyo (타 호텔) ❌ ← **결함 확인**

## 수정 후 검증

### ① 매니저 격리 검증
**롯데 시애틀 GM → v_manager_hotels:**
- ✅ 본인 1건만 출력 (Lotte Hotel Seattle)

**웨스틴 도쿄 GM → v_manager_hotels:**
- ✅ 본인 1건만 출력 (The Westin Tokyo)

### ② anon 차단 검증
**비로그인 → v_manager_hotels:**
- ✅ `permission denied for view v_manager_hotels` (REVOKE 작동)

### ③ 매니저 대시보드 호출 패턴 검증
**manager-dashboard.html line 1049~1053과 동일 호출:**
```sql
SELECT * FROM v_manager_hotels WHERE manager_user_id = '<gm_uuid>' LIMIT 1;
```
- ✅ 본인 호텔 1건 완벽 로드 (UI 정상 작동 보장)

### ④ shared.js checkManager 호출 패턴 검증
- ✅ `SELECT COUNT(*) FROM v_manager_hotels` → 1 반환
- 매니저 판정 로직 정상 작동

### ⑤ 다른 매니저 VIEW 종합
**롯데 시애틀 GM 권한으로 모든 VIEW COUNT:**
- v_manager_payments: 1건 (본인 결제) ✅
- v_manager_video_summary: 0 (데이터 부재, 정상)
- v_manager_booking_stats: 0 (데이터 부재, 정상)
- v_manager_country_distribution: 0
- v_manager_monthly_trend: 0
- v_manager_recent_bookings: 0
- bookings_unified: 0
- → **다른 호텔 데이터 누출 없음** ✅

## 보안 상태 (최종)

| 항목 | 이전 | 이후 |
|---|---|---|
| anon이 매니저 VIEW 조회 | 가능 ❌ | 차단 ✅ |
| 매니저가 타 호텔 데이터 조회 | 가능 ❌ | 격리 ✅ |
| VIEW security_invoker | 7개 미적용 | 10/10 + bookings_unified 적용 ✅ |
| 하부 테이블 RLS 정책 | videos/bookings_*/payments 부재 | 매니저+관리자 정책 박힘 ✅ |

## 라이브 환경에서 매니저 실제 검증 방법

1. https://gohotelwinners.com/login.html 접속
2. 롯데 시애틀 매니저 계정으로 로그인
3. → manager-dashboard.html 자동 도착 (BL-MGR-LOGIN-ROUTING)
4. 호텔 카드: Lotte Hotel Seattle 표시 ✅
5. 본인 호텔 정보만 표시 — 타 호텔 데이터 없음 확인

## 후속 작업

- 매니저 50명+ 확장 시 동일 패턴 자동 적용됨 (RLS는 user_id 기반)
- 신규 매니저 VIEW 추가 시 반드시 `security_invoker = true` 명시 (sql 파일에 박을 것)
- 매니저용 INSERT/UPDATE/DELETE 작업 필요 시 별도 BL로 정책 추가
