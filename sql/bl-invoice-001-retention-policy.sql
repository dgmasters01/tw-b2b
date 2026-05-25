-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-001 단계 11 — 인보이스 보관 정책 (5년 영구 보관)
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-25
-- 단일 진실원: _os/playbook/invoice-system.md 정책 2.14
-- 선결 의존: bl-invoice-001-schema.sql (invoices 테이블)
-- 선결 의존: bl-invoice-001-storage-bucket.sql ('invoices' 버킷)
--
-- 목적:
--   - 한국 세무 법령(상법·법인세법): 사업 관련 문서 5년 보관 의무
--   - 매니저 환불 보장 6개월 후에도 인보이스 추적 가능 필요
--   - PDF 자동 삭제 사고 방지 (정책 2.14: 5년 영구 보관)
--
-- 박는 것:
--   1) invoices.retention_until TIMESTAMPTZ (issued_at + 5년)
--   2) 자동 박는 trigger (INSERT 시 자동 계산)
--   3) 기존 invoices 백필 (현재 모두 0건이지만 안전망)
--   4) 보관 임박 인보이스 조회 view (운영 감시용)
--
-- 박지 않는 것 (의도적):
--   - 자동 삭제 로직 — 정책 2.14 "5년 영구 보관" + 한국 세무 분쟁 대비
--   - 실제 삭제는 별도 BL(BL-INVOICE-ARCHIVE-DELETE)로 분리, 대표님 명시 승인 후
--
-- 실행 위치: Supabase Management API (Claude 자동 실행, 헌법 부칙)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. invoices.retention_until 컬럼 신설 (idempotent)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

COMMENT ON COLUMN public.invoices.retention_until IS
  '인보이스 PDF 보관 만료 시각 (정책 2.14 — issued_at + 5년). 이 시각 이후 별도 BL로 보관·삭제 결정.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. 자동 박는 함수 (issued_at 기반 +5년)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_set_invoice_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- NULL이면 자동 박음 (수동으로 박은 값은 존중)
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := COALESCE(NEW.issued_at, NOW()) + INTERVAL '5 years';
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. trigger 박음 (BEFORE INSERT, 멱등 박기)
-- ────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_set_invoice_retention ON public.invoices;
CREATE TRIGGER trg_set_invoice_retention
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_invoice_retention();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. credit_notes에도 동일 정책 박음
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.credit_notes
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

COMMENT ON COLUMN public.credit_notes.retention_until IS
  'Credit Note 보관 만료 시각 (정책 2.14 — issued_at + 5년).';

CREATE OR REPLACE FUNCTION public.fn_set_cn_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := COALESCE(NEW.issued_at, NOW()) + INTERVAL '5 years';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_cn_retention ON public.credit_notes;
CREATE TRIGGER trg_set_cn_retention
  BEFORE INSERT ON public.credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_cn_retention();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. 기존 데이터 백필 (NULL인 행만 — 멱등)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.invoices
SET retention_until = issued_at + INTERVAL '5 years'
WHERE retention_until IS NULL;

UPDATE public.credit_notes
SET retention_until = issued_at + INTERVAL '5 years'
WHERE retention_until IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. 운영 감시 view — 보관 만료 임박 (30일 이내)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_invoice_retention_status AS
SELECT
  'invoice' AS doc_type,
  i.id,
  i.invoice_number AS doc_number,
  i.track,
  i.status,
  i.issued_at,
  i.retention_until,
  EXTRACT(DAY FROM (i.retention_until - NOW()))::int AS days_until_expiry,
  CASE
    WHEN i.retention_until < NOW() THEN 'expired'
    WHEN i.retention_until < NOW() + INTERVAL '30 days' THEN 'imminent'
    WHEN i.retention_until < NOW() + INTERVAL '1 year' THEN 'within_year'
    ELSE 'safe'
  END AS retention_state,
  i.pdf_storage_path
FROM public.invoices i
UNION ALL
SELECT
  'credit_note' AS doc_type,
  cn.id,
  cn.cn_number AS doc_number,
  cn.track,
  NULL::text AS status,
  cn.issued_at,
  cn.retention_until,
  EXTRACT(DAY FROM (cn.retention_until - NOW()))::int AS days_until_expiry,
  CASE
    WHEN cn.retention_until < NOW() THEN 'expired'
    WHEN cn.retention_until < NOW() + INTERVAL '30 days' THEN 'imminent'
    WHEN cn.retention_until < NOW() + INTERVAL '1 year' THEN 'within_year'
    ELSE 'safe'
  END AS retention_state,
  NULL::text AS pdf_storage_path
FROM public.credit_notes cn;

COMMENT ON VIEW public.v_invoice_retention_status IS
  '인보이스·CN 보관 상태 통합 뷰. retention_state: safe / within_year / imminent / expired';

-- ────────────────────────────────────────────────────────────────────────────
-- 7. 검증 쿼리
-- ────────────────────────────────────────────────────────────────────────────
SELECT 'CHECK_COLUMNS' AS step,
       table_name,
       column_name,
       data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('invoices', 'credit_notes')
    AND column_name = 'retention_until';

SELECT 'CHECK_TRIGGERS' AS step,
       event_object_table AS table_name,
       trigger_name,
       action_timing,
       event_manipulation
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND trigger_name IN ('trg_set_invoice_retention', 'trg_set_cn_retention');

SELECT 'CHECK_VIEW' AS step,
       table_name
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name = 'v_invoice_retention_status';

SELECT 'CHECK_STATE_DISTRIBUTION' AS step,
       doc_type,
       retention_state,
       COUNT(*) AS count
  FROM public.v_invoice_retention_status
  GROUP BY doc_type, retention_state
  ORDER BY doc_type, retention_state;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. 다음 단계 안내
-- ────────────────────────────────────────────────────────────────────────────
-- 1) api/cron/invoice-retention.js: 매일 KST 09:00 cron — v_invoice_retention_status 조회
--    → expired/imminent 갯수 텔레그램 알림 + 대표님 결정 대기 상태
-- 2) 별도 BL(BL-INVOICE-ARCHIVE-DELETE): 5년 경과 후 S3 백업 → Storage 삭제 흐름
--    → 자동 삭제 박지 않음, 대표님 명시 승인 후 수동 갈무리
-- ════════════════════════════════════════════════════════════════════════════
