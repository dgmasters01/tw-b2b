-- =============================================================================
-- BL-MGR-HOTELS-RLS Step 2: 매니저 VIEW anon 권한 회수
-- 실행일: 2026-05-20
-- 사유: VIEW가 anon한테 SELECT/INSERT/UPDATE/DELETE 권한 부여됨
--       로그인 안 한 사용자도 매니저 데이터 접근 가능 결함
-- 진단: 라이브 매니저 VIEW = 10개 (sql 파일엔 7개, 추가 3개는 phase4-bookings)
-- =============================================================================

-- 매니저 VIEW 10개 전부에서 anon 권한 회수
REVOKE ALL ON v_manager_hotels                FROM anon;
REVOKE ALL ON v_manager_video_summary         FROM anon;
REVOKE ALL ON v_manager_booking_stats         FROM anon;
REVOKE ALL ON v_manager_payments              FROM anon;
REVOKE ALL ON v_manager_country_distribution  FROM anon;
REVOKE ALL ON v_manager_monthly_trend         FROM anon;
REVOKE ALL ON v_manager_recent_bookings       FROM anon;
REVOKE ALL ON v_manager_bookings              FROM anon;
REVOKE ALL ON v_manager_channel_stats         FROM anon;
REVOKE ALL ON v_manager_hotel_summary         FROM anon;

-- 검증 쿼리 (실행 결과 빈 배열이면 OK)
-- SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
-- WHERE table_name LIKE 'v_manager_%' AND grantee = 'anon';

-- 라이브 검증 완료 (2026-05-20):
-- - anon 권한: 0개 ✅
-- - authenticated SELECT: 10개 모두 유지 ✅ (매니저 로그인 후 조회 보장)
