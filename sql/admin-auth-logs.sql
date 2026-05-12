-- ════════════════════════════════════════════════════════════════
-- BL-ADMIN-AUTH (D-026) — admin 접속 로그 + 실행 로그
-- ════════════════════════════════════════════════════════════════
-- 결정 D-026 (2026-05-11):
--   ① 접속 로그 (access_logs)  : 누가 언제 admin 들어왔나
--   ② 실행 로그 (action_logs)  : 누가 언제 무슨 버튼 눌렀나 — 호텔 승인·삭제·수정 등
--   ③ admin-status 하단 "최근 활동" 박스에 시간순 표시
--
-- 권한 매핑 (D-016 5단계 ↔ D-026 2단계):
--   CEO  = owner (대표님 — 전체 권한)
--   Staff = admin/staff (초대된 스탭 — 제한 권한)
--   readonly/manager는 별도 (외부 매니저 자유 가입)
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. access_logs — admin 페이지 접속 로그
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.access_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  role TEXT,                       -- 접속 시점의 role (snapshot)
  path TEXT NOT NULL,              -- 접속한 경로 (예: /_admin/admin.html)
  user_agent TEXT,                 -- 브라우저 정보
  ip_address TEXT,                 -- IP (Vercel header에서)
  referer TEXT,                    -- 직전 페이지
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_time ON public.access_logs(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_path ON public.access_logs(path, accessed_at DESC);

COMMENT ON TABLE public.access_logs IS 'admin 페이지 접속 로그 (D-026 ①접속 로그). 매 진입마다 1줄.';

-- ────────────────────────────────────────────────────────────────
-- 2. action_logs — admin 실행 로그 (중요 액션만)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.action_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  role TEXT,                       -- 실행 시점의 role (snapshot)
  action_type TEXT NOT NULL,       -- 'hotel_approve' / 'hotel_reject' / 'hotel_delete' / 'role_change' / 'task_decision' / ...
  target_type TEXT,                -- 'hotel' / 'admin' / 'task' / ...
  target_id TEXT,                  -- 대상 ID (호텔 UUID, BL-ID, 등)
  target_label TEXT,               -- 사람이 읽을 수 있는 라벨 (호텔명, BL 제목 등)
  details JSONB,                   -- 추가 메타 (변경 전후, 사유 등)
  result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'fail', 'partial')),
  error_message TEXT,
  ip_address TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_user ON public.action_logs(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_time ON public.action_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_type ON public.action_logs(action_type, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_target ON public.action_logs(target_type, target_id);

COMMENT ON TABLE public.action_logs IS 'admin 실행 로그 (D-026 ②실행 로그). 중요 액션만 박힘 — 호텔 승인/삭제/수정, role 변경, 결정 확정 등.';

-- ────────────────────────────────────────────────────────────────
-- 3. RLS — owner/admin/staff만 읽기, anon/manager 차단
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- 기존 정책 cleanup
DROP POLICY IF EXISTS "access_logs_read_admin" ON public.access_logs;
DROP POLICY IF EXISTS "access_logs_insert_authenticated" ON public.access_logs;
DROP POLICY IF EXISTS "action_logs_read_admin" ON public.action_logs;
DROP POLICY IF EXISTS "action_logs_insert_authenticated" ON public.action_logs;

-- access_logs: owner/admin/staff만 SELECT, authenticated 모두 INSERT
CREATE POLICY "access_logs_read_admin" ON public.access_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.id = auth.uid()
        AND a.is_active = true
        AND a.role IN ('owner', 'admin', 'staff')
    )
  );

CREATE POLICY "access_logs_insert_authenticated" ON public.access_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- action_logs: 동일 패턴
CREATE POLICY "action_logs_read_admin" ON public.action_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.id = auth.uid()
        AND a.is_active = true
        AND a.role IN ('owner', 'admin', 'staff')
    )
  );

CREATE POLICY "action_logs_insert_authenticated" ON public.action_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────────
-- 4. View: recent_admin_activity — admin-status 최근 활동 박스용
-- ────────────────────────────────────────────────────────────────
-- access + action 통합 + 시간순 정렬 + 사람이 읽을 수 있는 한 줄 메시지

CREATE OR REPLACE VIEW public.recent_admin_activity AS
  SELECT 
    'access' AS event_type,
    accessed_at AS event_at,
    email,
    role,
    CONCAT('👁️ ', COALESCE(email, '익명'), ' (', COALESCE(role, '?'), ') — ', path) AS message,
    NULL::text AS action_type,
    NULL::text AS target_label,
    NULL::text AS result
  FROM public.access_logs
  WHERE accessed_at > now() - interval '7 days'
  UNION ALL
  SELECT 
    'action' AS event_type,
    performed_at AS event_at,
    email,
    role,
    CONCAT(
      CASE result WHEN 'success' THEN '✅' WHEN 'fail' THEN '❌' ELSE '⚠️' END,
      ' ',
      COALESCE(email, '익명'), ' (', COALESCE(role, '?'), ') — ',
      action_type,
      CASE WHEN target_label IS NOT NULL THEN ' [' || target_label || ']' ELSE '' END
    ) AS message,
    action_type,
    target_label,
    result
  FROM public.action_logs
  WHERE performed_at > now() - interval '7 days'
  ORDER BY event_at DESC
  LIMIT 100;

COMMENT ON VIEW public.recent_admin_activity IS 'admin-status 하단 최근 활동 박스용 통합 뷰 (D-026 ③). 7일 이내, 최대 100건.';

-- 뷰는 underlying 테이블의 RLS를 상속

-- ════════════════════════════════════════════════════════════════
-- 적용 완료
-- ════════════════════════════════════════════════════════════════
