-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-003 (2/3) — payment_accounts 결제 계좌 마스터
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-24
-- 단일 진실원: _os/playbook/invoice-system.md (2.5 결제수단·계좌 정보)
-- 결정: D-047
-- 헌법: 부칙 4 (권한 분리)
--
-- 목적:
--   인보이스 발행 시 동적으로 표시할 3종 결제 정보를 코드 하드코딩 없이 관리.
--
-- 구조:
--   3행 singleton — type 별로 1행만 존재 (CHECK 제약 + UNIQUE).
--     id=1, type='krw'    → 한국 매니저 전용 (KRW 국내 계좌)
--     id=2, type='usd'    → 해외 매니저 (USD 외화 계좌, SWIFT/IBAN)
--     id=3, type='paypal' → 해외 매니저 (PayPal 이메일)
--
-- 권한:
--   SELECT: admin + 로그인 매니저 (인보이스 PDF에 박을 계좌 표시용)
--   UPDATE: owner only
--   INSERT/DELETE: 차단 (3행 singleton 보호)
--
-- 실행 위치: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 0. 사전 백업 (부칙 9)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='payment_accounts') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public._payment_accounts_backup_20260524 AS
             SELECT *, now() AS _backed_up_at FROM public.payment_accounts';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. payment_accounts 테이블 (3행 singleton)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id                INT          PRIMARY KEY,
  type              TEXT         NOT NULL UNIQUE CHECK (type IN ('krw','usd','paypal')),

  -- KRW 전용 (한국 국내 계좌)
  krw_bank_name     TEXT,                       -- 은행명 (예: 신한은행)
  krw_account_no    TEXT,                       -- 계좌번호
  krw_account_holder TEXT,                      -- 예금주 (사업자명)
  krw_business_no   TEXT,                       -- 사업자등록번호 (000-00-00000)

  -- USD 전용 (해외 외화 계좌)
  usd_bank_name     TEXT,                       -- Bank name (영문)
  usd_bank_address  TEXT,                       -- Bank address
  usd_swift_code    TEXT,                       -- SWIFT/BIC
  usd_iban          TEXT,                       -- IBAN (선택)
  usd_account_no    TEXT,                       -- Account number
  usd_recipient_name TEXT,                      -- Recipient name (영문)
  usd_recipient_address TEXT,                   -- Recipient address (영문)

  -- PayPal 전용
  paypal_email      TEXT,                       -- PayPal 수취 이메일
  paypal_merchant_id TEXT,                      -- PayPal Merchant ID (참고용)

  -- 공통
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  notes             TEXT,                       -- 내부 메모
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by        UUID,
  updated_by_email  TEXT
);

COMMENT ON TABLE public.payment_accounts IS
  'BL-INVOICE-003: 인보이스 결제 계좌 마스터. 3행 singleton (krw/usd/paypal). 코드 하드코딩 금지.';

CREATE INDEX IF NOT EXISTS idx_payment_accounts_type ON public.payment_accounts(type);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. 초기 3행 박기 (빈 값으로 — admin에서 채움)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.payment_accounts (id, type) VALUES
  (1, 'krw'),
  (2, 'usd'),
  (3, 'paypal')
ON CONFLICT (id) DO NOTHING;

-- PayPal 기본값 — 사업 메모리에 박힌 정보 자동 채움 (대표님 검토 후 admin에서 수정)
UPDATE public.payment_accounts
   SET paypal_email = COALESCE(paypal_email, 'travelwinners@naver.com'),
       paypal_merchant_id = COALESCE(paypal_merchant_id, 'HAY86YMQP9T5C')
 WHERE type = 'paypal'
   AND (paypal_email IS NULL OR paypal_email = '');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. updated_at 자동 갱신 트리거
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.payment_accounts_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_accounts_touch ON public.payment_accounts;
CREATE TRIGGER trg_payment_accounts_touch
  BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.payment_accounts_touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS 정책
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.payment_accounts'::regclass
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(p.polname) || ' ON public.payment_accounts';
  END LOOP;
END $$;

-- 정책 1: admin (owner/admin/staff) 조회
CREATE POLICY payment_accounts_select_admin
  ON public.payment_accounts
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 정책 2: 매니저 조회 — 자기 통화에 맞는 계좌 정보 표시 (인보이스 PDF용)
-- ※ 모든 매니저가 3행 다 조회 가능 (PDF 발행 API가 필요한 type만 골라서 사용)
CREATE POLICY payment_accounts_select_manager
  ON public.payment_accounts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.hotels WHERE user_id = auth.uid())
  );

-- 정책 3: owner only UPDATE
CREATE POLICY payment_accounts_update_owner
  ON public.payment_accounts
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

-- INSERT/DELETE 정책 없음 (singleton 보호)

GRANT SELECT, UPDATE ON public.payment_accounts TO authenticated;
GRANT ALL ON public.payment_accounts TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. 검증
-- ────────────────────────────────────────────────────────────────────────────
SELECT 'CHECK_PAYMENT_ACCOUNTS' AS step,
       count(*) AS rows,
       array_agg(type ORDER BY id) AS types
  FROM public.payment_accounts;

SELECT 'CHECK_PAYPAL_DEFAULT' AS step,
       paypal_email, paypal_merchant_id
  FROM public.payment_accounts WHERE type='paypal';

SELECT 'CHECK_POLICIES' AS step, polname
  FROM pg_policy
  WHERE polrelid = 'public.payment_accounts'::regclass
  ORDER BY polname;
