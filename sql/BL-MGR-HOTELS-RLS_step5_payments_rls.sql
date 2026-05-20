-- =============================================================================
-- BL-MGR-HOTELS-RLS Step 5: payments RLS SELECT 정책 신설 + channels 검증
-- 실행일: 2026-05-20
-- 사유: 라이브 진단 결과
--   - payments: INSERT/ALL(service_role)만 있고 SELECT 정책 부재
--     → security_invoker 적용 시 매니저가 본인 결제도 못 봄
--   - channels: authenticated 전체 SELECT 허용 — 공통 마스터 데이터라 의도된 설계
-- =============================================================================

-- payments: 매니저는 본인 결제 또는 본인 호텔의 결제만 SELECT
CREATE POLICY payments_select_own ON payments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid())
  );

-- payments: 관리자는 전체 SELECT
CREATE POLICY payments_select_admin ON payments
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- channels: 기존 정책 (channels_select_authenticated) 유지
-- 채널 마스터 데이터는 호텔별 격리 불필요 (공통 데이터)
-- 정책 변경 없음

-- 라이브 검증 (2026-05-20):
-- SELECT policyname FROM pg_policies WHERE tablename = 'payments';
-- → payments_insert_own / payments_select_admin / payments_select_own / payments_service_role_all (4개) ✅
