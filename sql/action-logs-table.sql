-- ════════════════════════════════════════════════════════════════════════════
-- BL-ADMIN-USER-MANAGEMENT — action_logs 통합 audit 테이블
-- ════════════════════════════════════════════════════════════════════════════
-- 목적: admin이 가입자/매니저/팀원에 대해 수행한 모든 조작을 단일 테이블에 기록.
--   기존 role_change_log는 role 변경 전용 — 일반화 필요.
--   action_logs는 delete/role-change/re-verify/invite 등 모든 admin 조작 통합.
--
-- 사용처:
--   - api/admin.js의 모든 admin 액션 핸들러가 INSERT
--   - admin.html에서 감사 이력 조회 (향후 별도 탭)
--
-- 보안:
--   - INSERT는 service_role만 (handler가 직접 박음)
--   - SELECT는 admin만 (RLS 정책)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.action_logs (
  id              bigserial     PRIMARY KEY,
  action          text          NOT NULL,         -- 'delete-user' / 'change-role' / 're-verify' / 'send-invite' / 'manager-push' 등
  target_type     text          NOT NULL,         -- 'user' / 'hotel' / 'invitation' / 'manager'
  target_id       uuid,                            -- 대상 ID (user_id/hotel_id 등)
  target_email    text,                            -- 대상 이메일 (참조 편의)
  performed_by    uuid          NOT NULL,         -- 조작한 admin
  performed_by_email text       NOT NULL,         -- 조작한 admin 이메일
  performed_at    timestamptz   NOT NULL DEFAULT now(),
  status          text          NOT NULL DEFAULT 'success',  -- 'success' / 'failed'
  error_message   text,
  before_state    jsonb,                           -- 조작 전 상태 (감사용)
  after_state     jsonb,                           -- 조작 후 상태
  metadata        jsonb,                           -- 부가 정보 (reason, ip_address 등)
  notes           text
);

CREATE INDEX IF NOT EXISTS idx_action_logs_performed_at ON public.action_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_target       ON public.action_logs(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_logs_action       ON public.action_logs(action);
CREATE INDEX IF NOT EXISTS idx_action_logs_performed_by ON public.action_logs(performed_by);

COMMENT ON TABLE public.action_logs IS
  'BL-ADMIN-USER-MANAGEMENT — admin 조작 통합 audit. delete/role-change/re-verify/invite 등 모든 admin 액션 기록.';

-- RLS
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS action_logs_select_admin ON public.action_logs;
CREATE POLICY action_logs_select_admin
  ON public.action_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- INSERT는 service_role만 (RLS bypass 자동)
-- 일반 사용자/매니저는 SELECT/INSERT 모두 차단

GRANT SELECT ON public.action_logs TO authenticated;
GRANT SELECT, INSERT ON public.action_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.action_logs_id_seq TO service_role;

-- 검증
SELECT 'CHECK_ACTION_LOGS' AS test,
       count(*) AS rows
  FROM public.action_logs;
