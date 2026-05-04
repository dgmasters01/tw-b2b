-- ════════════════════════════════════════════════════════════════
-- BL-ADMIN-AUTH-V2 — 5단계 권한 시스템 + 초대 + 활동 이력
-- ════════════════════════════════════════════════════════════════
-- 결정 (D-015):
--   ① admins 테이블 확장 (단일 진실, users 신설 안 함 — 기존 is_admin() 호환)
--   ② 5단계 role: owner / admin / staff / readonly / manager
--   ③ Owner: dgmasters01@gmail.com 자동 박힘 (DB 트리거 + 삼중 보호)
--   ④ admin/staff/readonly: 초대 전용 (자체 가입 차단)
--   ⑤ manager: 자유 가입 (signup.html에서 auto role='manager')
--   ⑥ 즉시 박탈 (revoke), 30일 세션, 무제한 이력
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. admins 테이블 확장 (기존 super_admin → owner 마이그레이션)
-- ────────────────────────────────────────────────────────────────

-- 기존 CHECK 제약 먼저 모두 제거 (UPDATE 막고 있을 수 있음)
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_role_check;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'public.admins'::regclass AND contype = 'c' AND conname LIKE '%role%'
  LOOP
    EXECUTE 'ALTER TABLE public.admins DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- super_admin 데이터를 owner로 변환
UPDATE public.admins SET role = 'owner' WHERE role = 'super_admin';

-- role 컬럼 기본값 변경
ALTER TABLE public.admins ALTER COLUMN role SET DEFAULT 'manager';

-- 5단계 CHECK 새로 박기
ALTER TABLE public.admins
  ADD CONSTRAINT admins_role_check 
  CHECK (role IN ('owner', 'admin', 'staff', 'readonly', 'manager'));

-- 추가 컬럼: 초대/세션 관련
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- ────────────────────────────────────────────────────────────────
-- 2. admin_invitations — 초대 이메일 토큰 시스템
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'readonly')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.admin_invitations(token) 
  WHERE accepted_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_pending ON public.admin_invitations(invited_by, invited_at DESC)
  WHERE accepted_at IS NULL AND cancelled_at IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 3. role_change_log — 무제한 활동 이력
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.role_change_log (
  id BIGSERIAL PRIMARY KEY,
  target_user_id UUID NOT NULL,
  target_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'invited', 'invitation_cancelled', 'invitation_expired',
    'accepted_invitation', 'self_signup',
    'role_changed', 'revoked', 'restored',
    'login', 'logout', 'session_expired'
  )),
  before_role TEXT,
  after_role TEXT,
  before_active BOOLEAN,
  after_active BOOLEAN,
  performed_by UUID,
  performed_by_email TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_role_log_target ON public.role_change_log(target_user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_log_performed ON public.role_change_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_log_action ON public.role_change_log(action, performed_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 4. Owner 자동 승격 트리거 (삼중 보호 #1: DB 레벨)
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
  v_invitation public.admin_invitations%ROWTYPE;
  v_invited_by UUID;
BEGIN
  -- ① dgmasters01@gmail.com → 자동 owner (Owner 삼중 보호 #1)
  IF NEW.email = 'dgmasters01@gmail.com' THEN
    INSERT INTO public.admins (id, email, role, is_active, created_at)
    VALUES (NEW.id, NEW.email, 'owner', true, now())
    ON CONFLICT (id) DO UPDATE SET role = 'owner', is_active = true;

    INSERT INTO public.role_change_log (
      target_user_id, target_email, action, after_role, after_active,
      performed_by_email, notes
    ) VALUES (
      NEW.id, NEW.email, 'self_signup', 'owner', true,
      'system', 'Owner 자동 승격 (DB 트리거)'
    );
    RETURN NEW;
  END IF;

  -- ② 초대 토큰 메타데이터 → 해당 role로 박힘
  IF NEW.raw_user_meta_data ? 'invitation_token' THEN
    SELECT * INTO v_invitation FROM public.admin_invitations
      WHERE token = (NEW.raw_user_meta_data->>'invitation_token')
        AND email = NEW.email
        AND accepted_at IS NULL
        AND cancelled_at IS NULL
        AND expires_at > now()
      LIMIT 1;

    IF FOUND THEN
      v_role := v_invitation.role;
      v_invited_by := v_invitation.invited_by;

      UPDATE public.admin_invitations
        SET accepted_at = now(), accepted_user_id = NEW.id
        WHERE id = v_invitation.id;

      INSERT INTO public.admins (id, email, role, is_active, invited_by, invited_at, display_name, created_at)
      VALUES (NEW.id, NEW.email, v_role, true, v_invited_by, v_invitation.invited_at, v_invitation.display_name, now())
      ON CONFLICT (id) DO UPDATE SET role = v_role, is_active = true, invited_by = v_invited_by;

      INSERT INTO public.role_change_log (
        target_user_id, target_email, action, after_role, after_active,
        performed_by, notes
      ) VALUES (
        NEW.id, NEW.email, 'accepted_invitation', v_role, true,
        v_invited_by, 'Invitation token: ' || v_invitation.id::text
      );
      RETURN NEW;
    END IF;
  END IF;

  -- ③ 그 외 모든 가입 = manager (자유가입)
  INSERT INTO public.admins (id, email, role, is_active, created_at)
  VALUES (NEW.id, NEW.email, 'manager', true, now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.role_change_log (
    target_user_id, target_email, action, after_role, after_active, notes
  ) VALUES (
    NEW.id, NEW.email, 'self_signup', 'manager', true,
    '매니저 자유가입 (signup.html)'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- 5. Owner 보호 트리거 (삼중 보호 #2: 변경/삭제 차단)
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_owner_account()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Owner 계정은 무엇으로도 변경 불가 (이메일/role/is_active)
  IF (TG_OP = 'UPDATE' AND OLD.role = 'owner') THEN
    -- last_login_at, updated_at 등 안전한 필드만 허용
    IF NEW.role != OLD.role THEN
      RAISE EXCEPTION 'Owner role cannot be changed (BL-ADMIN-AUTH-V2 보호 #2)';
    END IF;
    IF NEW.email != OLD.email THEN
      RAISE EXCEPTION 'Owner email cannot be changed';
    END IF;
    IF NEW.is_active = false THEN
      RAISE EXCEPTION 'Owner account cannot be deactivated';
    END IF;
  END IF;

  -- Owner 삭제 차단
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') THEN
    RAISE EXCEPTION 'Owner account cannot be deleted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_owner_update ON public.admins;
CREATE TRIGGER protect_owner_update
  BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_account();

DROP TRIGGER IF EXISTS protect_owner_delete ON public.admins;
CREATE TRIGGER protect_owner_delete
  BEFORE DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_account();

-- ────────────────────────────────────────────────────────────────
-- 6. Helper 함수: 권한 체크
-- ────────────────────────────────────────────────────────────────

-- 기존 is_admin 모든 시그니처 제거 (충돌 방지)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT oid::regprocedure AS sig FROM pg_proc 
    WHERE proname IN ('is_admin', 'is_owner', 'is_manager', 'can_read_admin', 'current_user_role')
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- 기존 is_admin() 보존 (admin/owner 전체)
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = uid AND is_active = true
      AND role IN ('owner', 'admin', 'staff')
  );
$$;

-- Owner 전용
CREATE OR REPLACE FUNCTION public.is_owner(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = uid AND is_active = true AND role = 'owner'
  );
$$;

-- 매니저 (자기 데이터만 접근)
CREATE OR REPLACE FUNCTION public.is_manager(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = uid AND is_active = true AND role = 'manager'
  );
$$;

-- 읽기 권한 (admin 이상 또는 readonly)
CREATE OR REPLACE FUNCTION public.can_read_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = uid AND is_active = true
      AND role IN ('owner', 'admin', 'staff', 'readonly')
  );
$$;

-- 현재 사용자 role 조회
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.admins
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- ────────────────────────────────────────────────────────────────
-- 7. RLS 정책 (Owner 삼중 보호 #3)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

-- admins 정책 정리
DROP POLICY IF EXISTS "admins_select_self_or_admin" ON public.admins;
DROP POLICY IF EXISTS "admins_update_admin_only" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_admin_only" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_owner_only" ON public.admins;

-- 본인 또는 admin 이상이 조회 가능
CREATE POLICY "admins_select_self_or_admin" ON public.admins
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.can_read_admin());

-- admin 이상만 수정 (단, 자기보다 높은 role 수정 불가는 API 레벨에서)
CREATE POLICY "admins_update_admin_only" ON public.admins
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 신규 INSERT는 트리거(SECURITY DEFINER)로만 처리 → 일반 RLS는 차단
CREATE POLICY "admins_insert_admin_only" ON public.admins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- DELETE는 owner만 가능 + protect_owner_delete 트리거가 owner 본인 삭제 차단
CREATE POLICY "admins_delete_owner_only" ON public.admins
  FOR DELETE TO authenticated
  USING (public.is_owner());

-- admin_invitations 정책
DROP POLICY IF EXISTS "invitations_select_admin" ON public.admin_invitations;
DROP POLICY IF EXISTS "invitations_insert_admin" ON public.admin_invitations;
DROP POLICY IF EXISTS "invitations_update_admin" ON public.admin_invitations;

CREATE POLICY "invitations_select_admin" ON public.admin_invitations
  FOR SELECT TO authenticated
  USING (public.can_read_admin());

CREATE POLICY "invitations_insert_admin" ON public.admin_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND invited_by = auth.uid());

CREATE POLICY "invitations_update_admin" ON public.admin_invitations
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- role_change_log 정책 (감사 로그 — 조회만 가능, INSERT는 트리거/API)
DROP POLICY IF EXISTS "role_log_select_admin" ON public.role_change_log;
CREATE POLICY "role_log_select_admin" ON public.role_change_log
  FOR SELECT TO authenticated
  USING (public.can_read_admin() OR target_user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- 8. 누락된 매니저 백필 — auth.users에는 있지만 admins에 없는 사용자
-- ────────────────────────────────────────────────────────────────

INSERT INTO public.admins (id, email, role, is_active, created_at)
SELECT u.id, u.email, 'manager', true, COALESCE(u.created_at, now())
FROM auth.users u
LEFT JOIN public.admins a ON (a.id = u.id OR a.email = u.email)
WHERE a.id IS NULL AND u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 9. updated_at 자동 갱신 (admins 기존 트리거 보존 — 있으면 skip)
-- ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'admins' AND trigger_name = 'set_updated_at_admins'
  ) THEN
    CREATE TRIGGER set_updated_at_admins
      BEFORE UPDATE ON public.admins
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- set_updated_at 함수가 없으면 신규 생성
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER AS $f$
  BEGIN NEW.updated_at = now(); RETURN NEW; END;
  $f$ LANGUAGE plpgsql;
  
  CREATE TRIGGER set_updated_at_admins
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
END $$;

-- ════════════════════════════════════════════════════════════════
-- 검증 쿼리 (실행 후 자동 검증)
-- ════════════════════════════════════════════════════════════════

-- 검증 1: Owner 정확히 1명
SELECT 'CHECK_1_OWNER_COUNT' AS test, count(*)::text AS result
  FROM public.admins WHERE role = 'owner';

-- 검증 2: 5단계 role 모두 정의됨
SELECT 'CHECK_2_ROLES_DEFINED' AS test,
  string_agg(DISTINCT role, ',' ORDER BY role) AS result
  FROM public.admins;

-- 검증 3: 트리거 활성
SELECT 'CHECK_3_TRIGGERS' AS test,
  string_agg(trigger_name, ',') AS result
  FROM information_schema.triggers
  WHERE event_object_table IN ('admins', 'users')
    AND trigger_name LIKE '%owner%' OR trigger_name LIKE '%user_created%';

-- 검증 4: RLS 활성
SELECT 'CHECK_4_RLS' AS test,
  string_agg(tablename, ',') AS result
  FROM pg_tables
  WHERE schemaname = 'public' 
    AND tablename IN ('admins', 'admin_invitations', 'role_change_log')
    AND rowsecurity = true;
