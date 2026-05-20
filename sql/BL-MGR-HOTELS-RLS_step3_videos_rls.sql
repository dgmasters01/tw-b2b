-- =============================================================================
-- BL-MGR-HOTELS-RLS Step 3: videos 테이블 RLS 정책 신설
-- 실행일: 2026-05-20
-- 사유: videos 테이블 RLS 활성화돼있으나 정책 0개 → 매니저 직접 조회 시 차단
--       VIEW security_invoker 적용 후 매니저가 본인 영상 조회 가능하려면 필요
-- =============================================================================

-- 매니저: 본인 호텔의 영상만 SELECT
CREATE POLICY videos_select_manager ON videos
  FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid()));

-- 관리자: 전체 SELECT
CREATE POLICY videos_select_admin ON videos
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- INSERT/UPDATE/DELETE 정책 부재 = 매니저는 영상 수정 불가 (관리자/시스템만)
-- → 관리자 작업은 service_role 키로 수행, RLS 우회

-- 검증 (라이브 완료 2026-05-20):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'videos';
-- → videos_select_admin, videos_select_manager ✅
