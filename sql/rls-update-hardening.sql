-- =============================================================
-- TW B2B RLS UPDATE Policy Hardening
-- Date: 2026-04-28
-- Purpose: Phase 3 Step 5 안전망 - UPDATE/DELETE 정책 명시 + WITH CHECK 보강
-- =============================================================

-- 보안 갭 요약:
-- 1. hotels UPDATE: WITH CHECK 없음 → 매니저가 user_id 변경하여 호텔 소유권 탈취 가능
-- 2. videos  UPDATE: WITH CHECK 없음 → hotel_id 변경 시 정합성 깨짐
-- 3. payments UPDATE: WITH CHECK 없음 → admin이 user_id 변경 가능
-- 4. bookings UPDATE/DELETE: 정책 부재 → 명시 필요
-- 5. hotel_status_history UPDATE/DELETE: 정책 부재 → immutable 명시

-- =============================================================
-- 1. hotels UPDATE 강화: 본인 호텔만, user_id 변경 금지
-- =============================================================
DROP POLICY IF EXISTS hotels_update_own_or_admin ON public.hotels;

CREATE POLICY hotels_update_own_or_admin ON public.hotels
  FOR UPDATE
  USING ((user_id = auth.uid()) OR is_admin())
  WITH CHECK (
    -- admin은 user_id를 자유롭게 설정 가능 (호텔 재할당 시)
    -- 일반 매니저는 본인 호텔만 UPDATE 가능 + user_id 변경 불가
    is_admin() OR (user_id = auth.uid())
  );

-- =============================================================
-- 2. videos UPDATE 강화: admin only + WITH CHECK
-- =============================================================
DROP POLICY IF EXISTS videos_update_admin_only ON public.videos;

CREATE POLICY videos_update_admin_only ON public.videos
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE 정책 추가 (admin only)
DROP POLICY IF EXISTS videos_delete_admin_only ON public.videos;

CREATE POLICY videos_delete_admin_only ON public.videos
  FOR DELETE
  USING (is_admin());

-- =============================================================
-- 3. payments UPDATE 강화: admin only + WITH CHECK
-- =============================================================
DROP POLICY IF EXISTS payments_update_admin_only ON public.payments;

CREATE POLICY payments_update_admin_only ON public.payments
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE 정책 추가 (admin only)
DROP POLICY IF EXISTS payments_delete_admin_only ON public.payments;

CREATE POLICY payments_delete_admin_only ON public.payments
  FOR DELETE
  USING (is_admin());

-- =============================================================
-- 4. bookings UPDATE/DELETE 명시 (admin only)
-- =============================================================
DROP POLICY IF EXISTS bookings_update_admin_only ON public.bookings;

CREATE POLICY bookings_update_admin_only ON public.bookings
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS bookings_delete_admin_only ON public.bookings;

CREATE POLICY bookings_delete_admin_only ON public.bookings
  FOR DELETE
  USING (is_admin());

-- =============================================================
-- 5. hotel_status_history UPDATE/DELETE 차단 (immutable)
--    히스토리는 한 번 기록되면 변경/삭제 불가 (admin도 불가)
-- =============================================================
DROP POLICY IF EXISTS history_update_blocked ON public.hotel_status_history;

CREATE POLICY history_update_blocked ON public.hotel_status_history
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS history_delete_blocked ON public.hotel_status_history;

CREATE POLICY history_delete_blocked ON public.hotel_status_history
  FOR DELETE
  USING (false);

-- =============================================================
-- 검증: 적용 후 모든 테이블의 UPDATE/DELETE 정책 확인
-- =============================================================
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND cmd IN ('UPDATE', 'DELETE')
-- ORDER BY tablename, cmd;
