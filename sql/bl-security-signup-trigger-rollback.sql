-- ════════════════════════════════════════════════════════════════════════════
-- BL-SECURITY-SIGNUP-TRIGGER — 비상 롤백 SQL
-- ════════════════════════════════════════════════════════════════════════════
-- 헌법 부칙 9 (가역성) — 보안 패치 결과가 잘못된 경우 즉시 원상복귀
-- 실행 위치: Supabase Dashboard → SQL Editor
--
-- ⚠️ 주의: 이 롤백은 admins 테이블만 복구함. auth.users에서 삭제한
-- 1hogitravel@gmai.com은 복구되지 않음 (그게 정상 — 오타 계정).
-- ════════════════════════════════════════════════════════════════════════════

-- 1. 현재 admins 비우고 백업에서 복원
BEGIN;

TRUNCATE TABLE public.admins;

INSERT INTO public.admins
  SELECT id, email, role, is_active, created_at,
         display_name, invited_by, invited_at, last_login_at, updated_at
  FROM public._admins_backup_20260513_security_patch;
  -- ↑ 컬럼 목록은 실제 admins 스키마와 일치하는 만큼만 SELECT.
  --   스키마가 다르면 SELECT * 로 바꾸고 컬럼 매핑 조정.

-- 2. 트리거 함수도 hotfix 버전으로 되돌리기 (간이 버전)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := 'manager';
BEGIN
  IF NEW.email = 'dgmasters01@gmail.com' THEN
    v_role := 'owner';
  END IF;

  INSERT INTO public.admins (id, email, role, is_active, created_at)
  VALUES (NEW.id, NEW.email, v_role, true, NOW())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = CASE
          WHEN public.admins.role = 'owner' THEN 'owner'
          ELSE EXCLUDED.role
        END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;

-- 3. 복구 검증
SELECT 'ROLLBACK_DONE' AS step,
       count(*)::text AS admins_restored
  FROM public.admins;
