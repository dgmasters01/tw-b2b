-- ════════════════════════════════════════════════════════════════════════════
-- BL-MANAGER-IMPERSONATE — hotels SELECT RLS 정책 보강
-- ════════════════════════════════════════════════════════════════════════════
-- 문제: hotels는 RLS enabled이지만 SELECT 정책이 없음.
--   → 매니저 본인이 dashboard.html에서 자기 호텔 fetch 시 막힘 (이미 못 보고 있을 가능성!)
--   → admin이 임포저네이트 모드에서 매니저 호텔 fetch 시 막힘
-- 해결: 두 정책 박음
--   1) hotels_select_own — 본인 user_id의 호텔만 SELECT
--   2) hotels_select_admin — admin은 모든 호텔 SELECT (임포저네이트 + admin.html 관리)
-- ════════════════════════════════════════════════════════════════════════════

-- 1) 본인 SELECT 정책 (매니저가 자기 호텔 보기 위해 필수)
DROP POLICY IF EXISTS hotels_select_own ON public.hotels;
CREATE POLICY hotels_select_own
  ON public.hotels
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2) admin SELECT 정책 (임포저네이트 + admin 관리 페이지에서 모든 호텔)
DROP POLICY IF EXISTS hotels_select_admin ON public.hotels;
CREATE POLICY hotels_select_admin
  ON public.hotels
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

COMMENT ON POLICY hotels_select_own ON public.hotels IS
  'BL-MANAGER-IMPERSONATE: 매니저 본인은 자기 호텔만 SELECT (dashboard.html)';
COMMENT ON POLICY hotels_select_admin ON public.hotels IS
  'BL-MANAGER-IMPERSONATE: admin은 모든 호텔 SELECT (임포저네이트 + 관리)';

-- 검증
SELECT 'CHECK_HOTELS_RLS' AS test,
       string_agg(polname, ', ' ORDER BY polname) AS policies
  FROM pg_policy WHERE polrelid = 'public.hotels'::regclass AND polcmd = 'r';
