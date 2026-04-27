-- =============================================================================
-- TW B2B - Helper Functions
-- =============================================================================
-- is_admin(): 현재 로그인 사용자가 admins 테이블에 활성 상태로 등록되어 있는지
-- 모든 RLS 정책에서 공통 사용
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admins a
    JOIN auth.users u ON LOWER(u.email) = LOWER(a.email)
    WHERE u.id = auth.uid()
      AND COALESCE(a.is_active, TRUE) = TRUE
  );
$$;

-- 모든 인증 사용자가 호출 가능
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
