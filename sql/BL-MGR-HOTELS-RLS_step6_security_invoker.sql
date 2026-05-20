-- =============================================================================
-- BL-MGR-HOTELS-RLS Step 6: VIEW security_invoker = true 박기 (핵심 조치)
-- 실행일: 2026-05-20
-- 사유: VIEW가 기본적으로 정의자(super admin) 권한으로 실행 → RLS 우회
--       security_invoker = true 박으면 호출자 권한으로 실행 → RLS 자동 적용
-- 전제: Step 3~5에서 하부 테이블 RLS 정책 신설 완료
-- =============================================================================

-- 결함 실증 (Step 6 박기 전 라이브 검증):
-- 롯데 시애틀 GM(7130d25b...) 권한으로 v_manager_hotels 조회 시
-- → 본인 호텔 + 웨스틴 도쿄까지 2건 출력됨 (다른 호텔 데이터 누출 결함)

-- 결함 있던 7개 VIEW에 security_invoker 박기
ALTER VIEW v_manager_hotels                SET (security_invoker = true);
ALTER VIEW v_manager_video_summary         SET (security_invoker = true);
ALTER VIEW v_manager_booking_stats         SET (security_invoker = true);
ALTER VIEW v_manager_payments              SET (security_invoker = true);
ALTER VIEW v_manager_country_distribution  SET (security_invoker = true);
ALTER VIEW v_manager_monthly_trend         SET (security_invoker = true);
ALTER VIEW v_manager_recent_bookings       SET (security_invoker = true);

-- bookings_unified VIEW (UNION 베이스)도 정석 적용
ALTER VIEW bookings_unified                SET (security_invoker = true);

-- 라이브 검증 결과 (Step 6 박은 직후):
-- 1. 롯데 시애틀 GM → v_manager_hotels → 본인 1건 ✅ (이전 2건에서 격리됨)
-- 2. 웨스틴 도쿄 GM → v_manager_hotels → 본인 1건 ✅
-- 3. anon → v_manager_hotels → 'permission denied' ✅
-- 4. 롯데 GM → v_manager_payments → 1건 (본인 결제) ✅, 다른 VIEW 0건 (데이터 부재, 정상)

-- 향후 sql 파일 동기화 필요:
-- v_manager_dashboard.sql 등 정의 파일에도 security_invoker 명시 추가 (Step 7에서)
