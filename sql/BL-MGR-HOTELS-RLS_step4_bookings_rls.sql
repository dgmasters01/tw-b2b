-- =============================================================================
-- BL-MGR-HOTELS-RLS Step 4: bookings 계열 테이블 RLS 정책 신설
-- 실행일: 2026-05-20
-- 사유: bookings_unified VIEW가 bookings_self + bookings_agoda UNION
--       두 하부 테이블에 RLS 정책 0개 → security_invoker 적용 후 매니저 차단됨
--       기존 bookings 테이블도 사용 안 하지만 방어적으로 정책 신설
-- =============================================================================

-- bookings_self (직접 등록 예약)
CREATE POLICY bookings_self_select_manager ON bookings_self
  FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid()));

CREATE POLICY bookings_self_select_admin ON bookings_self
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- bookings_agoda (Agoda 채널 예약)
CREATE POLICY bookings_agoda_select_manager ON bookings_agoda
  FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid()));

CREATE POLICY bookings_agoda_select_admin ON bookings_agoda
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- bookings (레거시, 현재 미사용 — 방어용)
CREATE POLICY bookings_select_manager ON bookings
  FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid()));

CREATE POLICY bookings_select_admin ON bookings
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- 라이브 검증 (2026-05-20):
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('bookings','bookings_self','bookings_agoda');
-- → 6개 정책 모두 등록 확인 ✅
