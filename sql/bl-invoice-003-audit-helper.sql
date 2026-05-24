-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-003 (3/3) — 변경 이력 기록 헬퍼
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-24
-- 단일 진실원: _os/playbook/invoice-system.md (3.1 storage.audit_log)
--
-- 정책 정정 (자율 판단):
--   기존 invoice-system.md/tasks.json에는 `audit_log` 신규 테이블 신설로 박혀 있으나,
--   `action_logs` 테이블이 이미 존재하며 동일 목적(admin 조작 audit)을 위해 박힌 상태.
--   중복 회피를 위해 action_logs를 그대로 활용한다.
--
--   action_logs.action 값 컨벤션:
--     'invoice-settings.company-info.update'
--     'invoice-settings.payment-accounts.update'
--     'invoice-settings.stamp.upload'
--     'invoice-settings.signature.upload'
--
--   action_logs.target_type = 'invoice-settings'
--   action_logs.target_id   = company_info.id (1) 또는 payment_accounts.id
--   action_logs.before_state / after_state — JSONB 필드 변경 전후 박음
--
-- 이 파일은:
--   ① 매니저용 SELECT 정책 추가 (자기 인보이스 PDF에 사용되는 회사/계좌가
--      "마지막 언제 갱신됐는지" 표시할 수 있도록 — 선택사항, 향후 필요 시)
--   ② 헬퍼 함수: log_invoice_settings_change()
--      → API/트리거에서 호출 시 action_logs 자동 박음
--
-- 실행 위치: Supabase Dashboard → SQL Editor (action-logs-table.sql 실행 후)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 0. 전제 확인 — action_logs 존재 여부
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='action_logs'
  ) THEN
    RAISE EXCEPTION 'action_logs table not found. Run sql/action-logs-table.sql first.';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 헬퍼 함수 — invoice-settings 변경 이력 INSERT
-- ────────────────────────────────────────────────────────────────────────────
-- service_role에서만 호출 (API 핸들러가 호출)
CREATE OR REPLACE FUNCTION public.log_invoice_settings_change(
  p_action          TEXT,         -- 'invoice-settings.company-info.update' 등
  p_target_id       UUID,         -- NULL 가능 (company_info는 int=1이므로 NULL)
  p_target_label    TEXT,         -- 'company_info' / 'payment_accounts:krw' 등
  p_performed_by    UUID,         -- auth.users.id
  p_performed_email TEXT,
  p_before          JSONB,
  p_after           JSONB,
  p_metadata        JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO public.action_logs (
    action, target_type, target_id, target_email,
    performed_by, performed_by_email, performed_at,
    status, before_state, after_state, metadata, notes
  ) VALUES (
    p_action,
    'invoice-settings',
    p_target_id,            -- NULL OK (target_id는 nullable)
    NULL,                   -- target_email 불필요
    p_performed_by,
    p_performed_email,
    now(),
    'success',
    p_before,
    p_after,
    p_metadata || jsonb_build_object('target_label', p_target_label),
    NULL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.log_invoice_settings_change IS
  'BL-INVOICE-003: 인보이스 설정 변경 이력 기록 (action_logs 활용). API에서 호출.';

-- service_role만 호출 가능 (외부 노출 차단)
REVOKE ALL ON FUNCTION public.log_invoice_settings_change FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_invoice_settings_change TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. action_logs SELECT 정책 보강 — invoice-settings 이력은 owner only
-- ────────────────────────────────────────────────────────────────────────────
-- 기존 정책 action_logs_select_admin은 모든 admin이 조회 가능.
-- invoice-settings 이력은 owner만 볼 수 있도록 추가 정책 박기.
-- (헌법 메모리: 스리랑카 직원에게 변경 이력 안 보이게)

-- 단, 정책은 OR 결합이라 기존 정책이 살아있으면 admin/staff도 다 봄.
-- 따라서 기존 정책은 invoice-settings 제외하도록 재정의해야 함.
DROP POLICY IF EXISTS action_logs_select_admin ON public.action_logs;

-- 정책 1 재박기: invoice-settings 외는 admin 전부 조회 가능
CREATE POLICY action_logs_select_admin_non_invoice
  ON public.action_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND target_type != 'invoice-settings'
  );

-- 정책 2 신설: invoice-settings 이력은 owner only
CREATE POLICY action_logs_select_invoice_owner
  ON public.action_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    AND target_type = 'invoice-settings'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 검증
-- ────────────────────────────────────────────────────────────────────────────
SELECT 'CHECK_HELPER_FN' AS step,
       proname,
       pg_get_function_identity_arguments(oid) AS args
  FROM pg_proc
  WHERE proname = 'log_invoice_settings_change';

SELECT 'CHECK_ACTION_LOGS_POLICIES' AS step, polname
  FROM pg_policy
  WHERE polrelid = 'public.action_logs'::regclass
  ORDER BY polname;
