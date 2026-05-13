-- ════════════════════════════════════════════════════════════════════════════
-- BL-SECURITY-SIGNUP-TRIGGER — 회원가입 자동 admin 권한 부여 차단
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-13
-- 헌법: 부칙 9 (가역성, 이중 백업) / 부칙 4 (권한 분리)
-- 목적:
--   ① handle_new_user(_auth_user) ③번 분기 = 모든 가입자 자동 admins 박기 → 제거
--   ② 잘못 박힌 4명 정리:
--      • 완전 삭제 2건: 1hogitravel@gmai.com (오타, 이메일 미인증)
--      • admins에서만 제거 2건: leejifilm, joylife8760 (실제 호텔 매니저 고객, auth+hotels 유지)
--   ③ 검증 쿼리로 결과 확인
--
-- 실행 위치: Supabase Dashboard → SQL Editor → 전체 붙여넣기 → Run
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 0. 사전 백업 — 실행 전 admins 현재 상태 영구 기록 (가역성 부칙 9)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public._admins_backup_20260513_security_patch AS
  SELECT *, now() AS _backed_up_at
  FROM public.admins;

-- 백업 결과 확인 (정보용)
SELECT 'BACKUP_DONE' AS step,
       count(*)::text AS admins_backed_up
  FROM public._admins_backup_20260513_security_patch;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 트리거 함수 재정의 — ③번 분기 (자유가입 → manager 자동) 완전 제거
-- ────────────────────────────────────────────────────────────────────────────
-- 원칙:
--   • dgmasters01@gmail.com → owner (Owner 삼중 보호 #1, 유지)
--   • 유효한 invitation_token 보유 → 해당 role로 박힘 (관리자 초대만, 유지)
--   • 그 외 모든 가입 → admins 테이블에 박지 않음 (제거)
--     ↑ 호텔 매니저 등 일반 가입자는 hotels 테이블만 들어가야 함
--
-- 함수 이름 통일: handle_new_user (hotfix의 handle_new_auth_user는 DROP)
-- ────────────────────────────────────────────────────────────────────────────

-- 1-1. 기존 트리거 모두 제거 (어느 버전이 라이브든 모두 끊기)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;

-- 1-2. 새 함수 정의 — ③번 분기 없음
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitation public.admin_invitations%ROWTYPE;
BEGIN
  -- ① dgmasters01@gmail.com → 자동 owner (Owner 삼중 보호 #1)
  IF NEW.email = 'dgmasters01@gmail.com' THEN
    INSERT INTO public.admins (id, email, role, is_active, created_at)
    VALUES (NEW.id, NEW.email, 'owner', true, now())
    ON CONFLICT (id) DO UPDATE SET role = 'owner', is_active = true;

    -- role_change_log 테이블 존재 시에만 기록 (방어적)
    BEGIN
      INSERT INTO public.role_change_log (
        target_user_id, target_email, action, after_role, after_active,
        performed_by_email, notes
      ) VALUES (
        NEW.id, NEW.email, 'self_signup', 'owner', true,
        'system', 'Owner 자동 승격 (DB 트리거)'
      );
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    RETURN NEW;
  END IF;

  -- ② 초대 토큰 메타데이터 → 해당 role로 박힘 (관리자 초대 경로만)
  IF NEW.raw_user_meta_data ? 'invitation_token' THEN
    SELECT * INTO v_invitation FROM public.admin_invitations
      WHERE token = (NEW.raw_user_meta_data->>'invitation_token')
        AND email = NEW.email
        AND accepted_at IS NULL
        AND cancelled_at IS NULL
        AND expires_at > now()
      LIMIT 1;

    IF FOUND THEN
      UPDATE public.admin_invitations
        SET accepted_at = now(), accepted_user_id = NEW.id
        WHERE id = v_invitation.id;

      INSERT INTO public.admins (id, email, role, is_active, invited_by, invited_at, display_name, created_at)
      VALUES (NEW.id, NEW.email, v_invitation.role, true, v_invitation.invited_by,
              v_invitation.invited_at, v_invitation.display_name, now())
      ON CONFLICT (id) DO UPDATE SET role = v_invitation.role, is_active = true,
              invited_by = v_invitation.invited_by;

      BEGIN
        INSERT INTO public.role_change_log (
          target_user_id, target_email, action, after_role, after_active,
          performed_by, notes
        ) VALUES (
          NEW.id, NEW.email, 'accepted_invitation', v_invitation.role, true,
          v_invitation.invited_by, 'Invitation token: ' || v_invitation.id::text
        );
      EXCEPTION WHEN undefined_table THEN NULL;
      END;

      RETURN NEW;
    END IF;
  END IF;

  -- ③ 그 외 모든 가입 = admins에 박지 않는다 (보안 패치 핵심)
  --    호텔 매니저 가입자는 hotels 테이블만 박힘 (애플리케이션 레벨 처리).
  --    admin 콘솔은 admins 테이블 행이 있는 유저만 접근 가능.
  RETURN NEW;
END;
$$;

-- 1-3. 트리거 재박기
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. 잘못 박힌 4명 정리
-- ────────────────────────────────────────────────────────────────────────────

-- 2-1. 정리 대상 사전 확인 (실행 전 어떤 행이 영향받는지 출력)
SELECT 'TO_CLEANUP' AS step, id, email, role, created_at
  FROM public.admins
  WHERE email IN (
    '1hogitravel@gmai.com',     -- 오타 이메일 (이메일 미인증)
    'leejifilm@gmail.com',      -- 호텔 매니저 고객 — admins에서만 제거
    'joylife8760@gmail.com'     -- 호텔 매니저 고객 — admins에서만 제거
  )
  ORDER BY email;

-- 참고: 인계서가 "1hogitravel 2건"이라고 명시 — auth.users에 2건 박혔을 가능성
-- (오타로 두 번 가입 시도). admins/auth/hotels 모두 정리.

-- 2-2. 완전 삭제 2건 — 오타 이메일 (auth.users + admins + hotels 모두)
-- auth.users 삭제 시 ON DELETE CASCADE로 admins/hotels 자동 정리될 가능성 있으나,
-- 명시적으로 모두 삭제하여 안전 확보.

-- hotels 먼저 (FK 안전)
DELETE FROM public.hotels
  WHERE owner_user_id IN (
    SELECT id FROM auth.users WHERE email = '1hogitravel@gmai.com'
  );

-- admins 다음
DELETE FROM public.admins
  WHERE email = '1hogitravel@gmai.com';

-- auth.users 마지막 (CASCADE로 잔여 FK 처리)
DELETE FROM auth.users
  WHERE email = '1hogitravel@gmai.com';

-- 2-3. admins에서만 제거 2건 — 호텔 매니저 고객 (auth+hotels 유지)
DELETE FROM public.admins
  WHERE email IN ('leejifilm@gmail.com', 'joylife8760@gmail.com');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 검증 — 패치 결과 확인
-- ────────────────────────────────────────────────────────────────────────────

-- 검증 1: admins 테이블에 정확히 owner 1명만 남았는가?
SELECT 'CHECK_1_FINAL_ADMINS' AS test,
       count(*)::text AS total,
       string_agg(email || ':' || role, ', ' ORDER BY email) AS detail
  FROM public.admins;

-- 검증 2: 트리거 함수에 ③번 분기 자유가입 INSERT 없는가?
SELECT 'CHECK_2_TRIGGER_CLEAN' AS test,
       CASE
         WHEN prosrc ILIKE '%자유가입%' OR prosrc ILIKE '%self_signup%'
              AND prosrc ILIKE '%manager%'
              AND prosrc NOT ILIKE '%-- ③ 그 외 모든 가입 = admins에 박지 않는다%'
         THEN 'FAIL — ③번 분기 잔존 의심'
         ELSE 'PASS'
       END AS result
  FROM pg_proc
  WHERE proname = 'handle_new_user'
  LIMIT 1;

-- 검증 3: 트리거가 새 함수에 연결되어 있는가?
SELECT 'CHECK_3_TRIGGER_BOUND' AS test,
       string_agg(tgname || ' → ' || p.proname, ', ') AS result
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE t.tgrelid = 'auth.users'::regclass
    AND tgname = 'on_auth_user_created';

-- 검증 4: 정리 대상 4건이 admins에서 사라졌는가?
SELECT 'CHECK_4_CLEANUP_DONE' AS test,
       count(*)::text || '건 남음 (0이어야 PASS)' AS result
  FROM public.admins
  WHERE email IN (
    '1hogitravel@gmai.com',
    'leejifilm@gmail.com',
    'joylife8760@gmail.com'
  );

-- 검증 5: leejifilm / joylife8760은 auth.users + hotels에 살아있는가?
SELECT 'CHECK_5_CUSTOMERS_PRESERVED' AS test,
       string_agg(email, ', ' ORDER BY email) AS result
  FROM auth.users
  WHERE email IN ('leejifilm@gmail.com', 'joylife8760@gmail.com');

-- 검증 6: 1hogitravel 오타는 auth.users에서 완전 제거됐는가?
SELECT 'CHECK_6_TYPO_REMOVED' AS test,
       count(*)::text || '건 남음 (0이어야 PASS)' AS result
  FROM auth.users
  WHERE email = '1hogitravel@gmai.com';

-- ════════════════════════════════════════════════════════════════════════════
-- 끝 — 모든 CHECK가 PASS / 적정 카운트면 성공
-- ════════════════════════════════════════════════════════════════════════════
