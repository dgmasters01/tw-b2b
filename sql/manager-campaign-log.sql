-- ════════════════════════════════════════════════════════════════════════════
-- BL-MANAGER-AUTO-CAMPAIGN — 캠페인 발송 이력 테이블
-- ════════════════════════════════════════════════════════════════════════════
-- 목적: 매니저 × 캠페인 stage 별 발송 1회 보장 (중복 방지)
-- 사용처: /api/cron/manager-campaign.js — GitHub Actions cron이 매일 1회 호출
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.manager_campaign_log (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id  uuid          NOT NULL,
  hotel_id    uuid,
  stage       text          NOT NULL,    -- welcome / early_sales / active_monitoring / rebill_window / final_decision_window
  sent_at     timestamptz   NOT NULL DEFAULT now(),
  email_to    text          NOT NULL,
  resend_id   text,                       -- Resend 메시지 ID (디버깅)
  template    text,                       -- 발송된 템플릿 키
  status      text          NOT NULL DEFAULT 'sent',  -- sent / failed
  error       text,
  meta        jsonb,
  UNIQUE (manager_id, stage)              -- 매니저 1명당 stage 1회만
);

CREATE INDEX IF NOT EXISTS idx_campaign_log_sent     ON public.manager_campaign_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_log_manager  ON public.manager_campaign_log(manager_id);
CREATE INDEX IF NOT EXISTS idx_campaign_log_stage    ON public.manager_campaign_log(stage);

COMMENT ON TABLE public.manager_campaign_log IS
  'BL-MANAGER-AUTO-CAMPAIGN — 자동 캠페인 발송 이력 + 중복 방지 (UNIQUE manager_id+stage)';

-- 권한
GRANT SELECT, INSERT ON public.manager_campaign_log TO service_role;
