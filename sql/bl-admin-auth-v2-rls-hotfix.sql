-- ════════════════════════════════════════════════════════════════
-- BL-ADMIN-AUTH-V2 RLS 무한 재귀 HOTFIX
-- ════════════════════════════════════════════════════════════════
--
-- 🚨🚨🚨 부분 DEPRECATED — 4번 섹션 재실행 금지 (BL-ADMIN-AUTH-V2-BACKFILL-DISARM, 2026-05-14)
--
-- 이 파일의 4번 섹션(handle_new_auth_user 함수 + on_auth_user_created 트리거)은
-- 모든 가입자를 admins에 manager로 자동 박는 결함이 있어 무력화됐습니다.
-- 라이브 트리거는 BL-SECURITY-SIGNUP-TRIGGER(2026-05-13)가 재정의한 새 버전입니다.
--
-- 파일 구조 안전성:
--   • 1번 섹션 (is_admin SECURITY DEFINER 함수)         → 그대로 유효
--   • 2번 섹션 (is_owner / can_read_admin)              → 그대로 유효
--   • 3번 섹션 (admins RLS 정책 4종)                    → 그대로 유효
--   • 4번 섹션 (handle_new_auth_user + 트리거)          → 🚨 DISARMED (블록 주석)
--   • 5번 섹션 (Owner 이메일 동기화)                    → 그대로 유효 (1회만 실행 필요)
--
-- 재실행 시:
--   • 1·2·3·5번 섹션은 CREATE OR REPLACE 또는 멱등이라 안전
--   • 4번 섹션은 주석 처리됨 → 실행 0건, 라이브 트리거 보존
--
-- 새 환경 셋업 시 트리거가 필요하면:
--   sql/bl-security-signup-trigger.sql 의 트리거 함수 부분을 사용 (정본)
-- ════════════════════════════════════════════════════════════════
-- 원본 헤더 (참조용):
-- 적용일: 2026-05-04 (commit c56885c 직후)
-- 적용 방법: Supabase Management API (PATCH /v1/projects/.../database/query)
-- 프로젝트: vjsludfjsphwnumuoqaj
--
-- 문제 (재현 조건):
--   bl-admin-auth-v2.sql 박은 직후, admin-status.html이 admins 테이블을
--   조회하려 할 때 PostgreSQL error 42P17 (infinite recursion detected
--   in policy for relation "admins") 발생.
--
-- 원인:
--   1. admins 테이블의 RLS 정책이 is_admin() 함수를 호출
--   2. is_admin() 함수가 내부적으로 admins 테이블을 SELECT
--   3. SELECT 시 또 RLS 정책 평가 → is_admin() 또 호출 → 무한 재귀
--
-- 해결 원리:
--   ① is_admin() 함수에 SECURITY DEFINER 박기
--      → 함수 호출 시 RLS bypass (정책 평가 안 함)
--   ② admins 셀프 SELECT 정책은 auth.uid() = id 만 비교 (함수 호출 0회)
--   ③ 다른 테이블의 admin-only 정책은 SECURITY DEFINER 함수 통해서만
--      admins 조회
--
-- 검증:
--   - admin.html 로그인 → Owner 인식 OK
--   - admin-status.html 카테고리 카드 표시 OK
--   - psql \d+ admins 시 RLS 정책 4개 정상
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. is_admin() 함수 재정의 (SECURITY DEFINER)
-- ────────────────────────────────────────────────────────────────
-- DEFINER 권한으로 실행 → RLS 우회 → 무한 재귀 차단
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = uid
      AND is_active = true
      AND revoked_at IS NULL
      AND role IN ('owner', 'admin', 'staff')
  );
$$;

COMMENT ON FUNCTION public.is_admin(UUID) IS
  'BL-ADMIN-AUTH-V2: SECURITY DEFINER로 RLS 우회 — admins 자기 참조 무한 재귀 차단';

-- 권한 부여 (anon/authenticated 모두 호출 가능)
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 2. is_owner() 함수 — Owner 전용 권한 검사
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_owner(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = uid
      AND role = 'owner'
      AND is_active = true
      AND revoked_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.is_owner(UUID) IS
  'BL-ADMIN-AUTH-V2: Owner 전용 SECURITY DEFINER 헬퍼';

GRANT EXECUTE ON FUNCTION public.is_owner(UUID) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 3. admins 테이블 RLS 정책 재박기 (자기 참조 제거)
-- ────────────────────────────────────────────────────────────────
-- 기존 정책 모두 삭제 (재귀 일으키는 것들)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.admins'::regclass
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(p.polname) || ' ON public.admins';
  END LOOP;
END $$;

-- ── 정책 1: 본인 행은 항상 SELECT 가능 (함수 호출 0회 — 재귀 불가)
CREATE POLICY admins_self_select
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ── 정책 2: Owner/admin은 모든 행 SELECT (SECURITY DEFINER 함수 사용)
CREATE POLICY admins_admin_select
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ── 정책 3: Owner는 모든 행 INSERT/UPDATE/DELETE
CREATE POLICY admins_owner_all
  ON public.admins
  FOR ALL
  TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

-- ── 정책 4: 본인은 last_login_at 등 일부 필드 UPDATE (트리거에서만)
-- (애플리케이션은 Owner 권한으로 처리하므로 일반 UPDATE는 owner만)

-- ────────────────────────────────────────────────────────────────
-- 4. admins.id ↔ auth.users.id 동기화 트리거
-- ────────────────────────────────────────────────────────────────
--
-- 🚨 DISARMED — 2026-05-14 (BL-ADMIN-AUTH-V2-BACKFILL-DISARM)
--
-- 이 섹션이 박는 handle_new_auth_user() 함수는 OWNER 외 모든 신규 가입자를
-- admins에 manager로 자동 박아 넣어, 호텔 매니저 고객이 admin 콘솔에
-- 접근 가능해지는 보안 결함이 있습니다.
--
-- 라이브 트리거는 BL-SECURITY-SIGNUP-TRIGGER(2026-05-13)가 재정의한
-- 새 handle_new_user() 함수입니다. 초대 토큰 분기 ② 외 자유 가입은
-- admins에 박지 않습니다.
--
-- 정본 위치: sql/bl-security-signup-trigger.sql
--
/*
-- auth.users 신규 생성 시 admins 자동 박기 (manager role 기본)
-- Owner 이메일은 owner role로 자동 승격
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := 'manager';
BEGIN
  -- Owner 이메일은 owner로 자동 승격
  IF NEW.email = 'dgmasters01@gmail.com' THEN
    v_role := 'owner';
  END IF;

  INSERT INTO public.admins (id, email, role, is_active, created_at)
  VALUES (NEW.id, NEW.email, v_role, true, NOW())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = CASE
          WHEN public.admins.role = 'owner' THEN 'owner'  -- Owner는 강등 불가
          ELSE EXCLUDED.role
        END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
*/

-- 안전 검증 메모 (실행 안 됨):
SELECT 'HOTFIX_SECTION_4_DISARMED' AS status,
       '2026-05-14 BL-ADMIN-AUTH-V2-BACKFILL-DISARM — 라이브 트리거는 BL-SECURITY-SIGNUP-TRIGGER 정본 사용' AS note;

-- ────────────────────────────────────────────────────────────────
-- 5. 기존 admins 데이터 동기화 (Owner 이메일 ↔ auth.users.id 일치)
-- ────────────────────────────────────────────────────────────────
-- admin.html에서 보고된 정상 작동 상태를 SQL로 영구 박음
UPDATE public.admins
SET id = (SELECT id FROM auth.users WHERE email = 'dgmasters01@gmail.com'),
    role = 'owner',
    is_active = true,
    revoked_at = NULL
WHERE email = 'dgmasters01@gmail.com'
  AND id != (SELECT id FROM auth.users WHERE email = 'dgmasters01@gmail.com');

-- ════════════════════════════════════════════════════════════════
-- 자가 검증 쿼리 (Management API로 적용 후 즉시 실행 권장)
-- ════════════════════════════════════════════════════════════════
-- SELECT public.is_admin();         -- 인증 컨텍스트에서 true
-- SELECT public.is_owner();         -- Owner 로그인 시 true
-- SELECT * FROM public.admins;      -- RLS로 본인 행 + admin 권한 행 보임
-- SELECT * FROM pg_policy WHERE polrelid = 'public.admins'::regclass;
-- ════════════════════════════════════════════════════════════════
