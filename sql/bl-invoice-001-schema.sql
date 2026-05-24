-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-001 단계 2 — 인보이스 시스템 핵심 스키마 4종
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-24
-- 단일 진실원: _os/playbook/invoice-system.md (D-009, D-047, D-048)
--
-- 4 테이블:
--   1. invoice_sequences  — 4트랙 연도별 카운터 (INV-KR/INV-INT/CN-KR/CN-INT)
--   2. fx_snapshots       — 한국수출입은행 환율 1일 1회 캐시
--   3. invoices           — 인보이스/영수증 본체 (PDF 메타 + 금액 + 상태)
--   4. credit_notes       — 환불 시 발행 (별도 번호 트랙)
--
-- 정책 핵심:
--   - 인보이스 번호는 sequence로 채번 → 결번 0%, 동시성 안전
--   - 환율 snapshot은 발행 시점 1회 캐싱, 이후 인보이스는 불변
--   - status: pending → paid (Receipt 전환) / void (취소) / expired (기한 경과)
--   - 부분 환불 없음 → credit_note는 전액 환불 단일
--
-- 실행 위치: Management API 자동 실행 (헌법 11조)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1) invoice_sequences — 4트랙 연도별 카운터
-- ────────────────────────────────────────────────────────────────────────────
-- track:  'INV-KR' | 'INV-INT' | 'CN-KR' | 'CN-INT'
-- year:   2026, 2027, ...
-- last_number: 마지막 채번 번호 (1부터 시작)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  track       TEXT NOT NULL,
  year        INT  NOT NULL,
  last_number INT  NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (track, year),
  CONSTRAINT invoice_seq_track_chk CHECK (track IN ('INV-KR', 'INV-INT', 'CN-KR', 'CN-INT')),
  CONSTRAINT invoice_seq_year_chk  CHECK (year BETWEEN 2024 AND 2100)
);

COMMENT ON TABLE  public.invoice_sequences IS 'BL-INVOICE-001 단계 2 · 인보이스/CN 4트랙 연도별 카운터 (결번 0%)';
COMMENT ON COLUMN public.invoice_sequences.track IS 'INV-KR / INV-INT / CN-KR / CN-INT 4종 고정';

-- 채번 함수 — 동시성 안전 (advisory lock 활용)
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_track TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INT;
  v_next INT;
BEGIN
  -- track 검증
  IF p_track NOT IN ('INV-KR', 'INV-INT', 'CN-KR', 'CN-INT') THEN
    RAISE EXCEPTION 'Invalid track: %', p_track;
  END IF;

  v_year := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Seoul'))::INT;

  -- UPSERT + RETURNING으로 atomic 채번
  INSERT INTO public.invoice_sequences (track, year, last_number, updated_at)
  VALUES (p_track, v_year, 1, now())
  ON CONFLICT (track, year) DO UPDATE
    SET last_number = invoice_sequences.last_number + 1,
        updated_at  = now()
  RETURNING last_number INTO v_next;

  -- 포맷: INV-KR-2026-0001
  RETURN p_track || '-' || v_year::TEXT || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.next_invoice_number IS '4트랙 인보이스 번호 채번. 동시성 안전. KST 기준 연도 자동 리셋.';

-- RLS: SELECT는 owner, INSERT/UPDATE는 함수만 (직접 조작 금지)
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid='public.invoice_sequences'::regclass
  LOOP EXECUTE 'DROP POLICY ' || quote_ident(p.polname) || ' ON public.invoice_sequences'; END LOOP;
END $$;

CREATE POLICY invoice_sequences_select_owner ON public.invoice_sequences
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- ────────────────────────────────────────────────────────────────────────────
-- 2) fx_snapshots — 한국수출입은행 환율 1일 1회 캐시
-- ────────────────────────────────────────────────────────────────────────────
-- 정책: 같은 날 같은 통화쌍 1회만 저장. 인보이스가 발행 시점에 fetch_fx() 호출 → 캐시 hit/miss.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fx_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,                          -- KST 기준 날짜
  base_currency TEXT NOT NULL DEFAULT 'USD',            -- 변환 대상
  quote_currency TEXT NOT NULL DEFAULT 'KRW',           -- 표시 통화
  rate          NUMERIC(15, 4) NOT NULL,                -- 1 USD = X KRW
  source        TEXT NOT NULL DEFAULT 'koreaexim',      -- 'koreaexim' | 'manual_fallback'
  source_url    TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_response  JSONB,                                  -- API 원본 (분쟁 시 증명)
  UNIQUE (snapshot_date, base_currency, quote_currency)
);

CREATE INDEX IF NOT EXISTS fx_snapshots_date_idx ON public.fx_snapshots(snapshot_date DESC);

COMMENT ON TABLE public.fx_snapshots IS 'BL-INVOICE-001 단계 2·3 · 한국수출입은행 환율 일일 캐시. 인보이스 발행 시 hit 우선.';

ALTER TABLE public.fx_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid='public.fx_snapshots'::regclass
  LOOP EXECUTE 'DROP POLICY ' || quote_ident(p.polname) || ' ON public.fx_snapshots'; END LOOP;
END $$;

CREATE POLICY fx_snapshots_select_admin ON public.fx_snapshots
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ────────────────────────────────────────────────────────────────────────────
-- 3) invoices — 인보이스/영수증 본체
-- ────────────────────────────────────────────────────────────────────────────
-- 인보이스 1개 = 결제 1개. 1:1 관계 (payments.id ← invoices.payment_id).
-- 동일 결제에 대해 invoice는 처음 pending → 입금 확인 시 paid (Receipt) 전환.
-- 동일 인보이스 row를 status만 갈아끼움. 별도 receipt 테이블 두지 않음.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 번호 + 종류
  invoice_number      TEXT NOT NULL UNIQUE,             -- 'INV-KR-2026-0001'
  track               TEXT NOT NULL,                    -- 'INV-KR' | 'INV-INT'
  document_type       TEXT NOT NULL DEFAULT 'invoice',  -- 'invoice' | 'receipt' (status로 분기)

  -- 연결 — 결제 1건당 인보이스 1건
  payment_id          UUID UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  hotel_id            UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Bill To (인보이스에 박힐 청구처 정보 — 발행 시점 snapshot)
  bill_to_country     TEXT NOT NULL,                    -- 'KR' | 'NON_KR'
  bill_to_name        TEXT,                             -- 매니저/회사명
  bill_to_email       TEXT,
  bill_to_business_no TEXT,                             -- 한국: 사업자등록번호
  bill_to_address     TEXT,

  -- 금액
  currency            TEXT NOT NULL,                    -- 'KRW' | 'USD'
  amount_subtotal     NUMERIC(15, 2) NOT NULL,          -- 공급가액 (한국: VAT 분리 / 해외: 영세율 0)
  amount_tax          NUMERIC(15, 2) NOT NULL DEFAULT 0,
  amount_total        NUMERIC(15, 2) NOT NULL,          -- 총액 (송금 대상)
  tax_mode            TEXT NOT NULL,                    -- 'vat_10_included' | 'zero_rated'
  tax_label           TEXT,                             -- 'Zero-rated export of services' 등

  -- 환율 snapshot (글로벌 USD 상품을 KRW 인보이스로 발행할 때)
  fx_snapshot_id      UUID REFERENCES public.fx_snapshots(id),
  fx_rate             NUMERIC(15, 4),                   -- 적용된 환율
  fx_base_amount      NUMERIC(15, 2),                   -- 원본 통화 금액 (USD)
  fx_base_currency    TEXT,                             -- 'USD'
  fx_display_note     TEXT,                             -- '₩276,000 (USD 200 × 1,380, 발행일 2026-05-24)'

  -- 한국 영수증 종류 (한국 매니저만 사용)
  kr_receipt_type     TEXT,                             -- 'tax_invoice' | 'cash_receipt_business' | 'cash_receipt_personal'
  kr_receipt_meta     JSONB,                            -- 종류별 필수 필드 저장
  kr_receipt_issued   BOOLEAN NOT NULL DEFAULT false,   -- 홈택스 발행 완료 체크 (Phase 1 수동)
  kr_receipt_issued_at TIMESTAMPTZ,

  -- 상태 + 결제수단
  status              TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'void' | 'expired'
  payment_method      TEXT NOT NULL,                    -- 'bank_transfer_krw' | 'bank_transfer_usd' | 'paypal'

  -- 기한
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at              TIMESTAMPTZ NOT NULL,             -- 발행일 + 2영업일 (KST)
  paid_at             TIMESTAMPTZ,
  voided_at           TIMESTAMPTZ,
  void_reason         TEXT,

  -- PDF 저장
  pdf_storage_path    TEXT,                             -- 'invoices/2026/INV-KR-2026-0001.pdf'
  pdf_generated_at    TIMESTAMPTZ,

  -- 변경 메타
  issued_by           UUID,                             -- 발행자 (보통 owner)
  issued_by_email     TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoices_track_chk          CHECK (track IN ('INV-KR', 'INV-INT')),
  CONSTRAINT invoices_status_chk         CHECK (status IN ('pending', 'paid', 'void', 'expired')),
  CONSTRAINT invoices_doctype_chk        CHECK (document_type IN ('invoice', 'receipt')),
  CONSTRAINT invoices_currency_chk       CHECK (currency IN ('KRW', 'USD')),
  CONSTRAINT invoices_country_chk        CHECK (bill_to_country IN ('KR', 'NON_KR')),
  CONSTRAINT invoices_tax_mode_chk       CHECK (tax_mode IN ('vat_10_included', 'zero_rated')),
  CONSTRAINT invoices_kr_receipt_chk     CHECK (
    kr_receipt_type IS NULL OR
    kr_receipt_type IN ('tax_invoice', 'cash_receipt_business', 'cash_receipt_personal')
  ),
  CONSTRAINT invoices_method_chk         CHECK (payment_method IN ('bank_transfer_krw', 'bank_transfer_usd', 'paypal'))
);

-- 인덱스 — 자주 쿼리되는 패턴
CREATE INDEX IF NOT EXISTS invoices_status_idx       ON public.invoices(status);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx      ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_hotel_id_idx     ON public.invoices(hotel_id);
CREATE INDEX IF NOT EXISTS invoices_issued_at_idx    ON public.invoices(issued_at DESC);
CREATE INDEX IF NOT EXISTS invoices_due_pending_idx  ON public.invoices(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS invoices_track_issued_idx ON public.invoices(track, issued_at DESC);

COMMENT ON TABLE public.invoices IS 'BL-INVOICE-001 단계 2 · 인보이스/영수증 본체. document_type=invoice/receipt를 status=pending/paid가 결정.';
COMMENT ON COLUMN public.invoices.document_type IS 'pending → invoice 출력 / paid → receipt 출력 (같은 row, status로 분기)';
COMMENT ON COLUMN public.invoices.fx_display_note IS '인보이스 PDF에 박힐 환율 명시 문구 (분쟁 방지)';

-- updated_at 자동 갱신
DROP TRIGGER IF EXISTS invoices_updated_at_trigger ON public.invoices;
CREATE TRIGGER invoices_updated_at_trigger
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid='public.invoices'::regclass
  LOOP EXECUTE 'DROP POLICY ' || quote_ident(p.polname) || ' ON public.invoices'; END LOOP;
END $$;

-- admin (owner/admin/staff)은 전체 SELECT — 한국 직원도 미수금 현황 봐야 함
CREATE POLICY invoices_select_admin ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- manager는 자신의 결제 인보이스만 SELECT (서류 탭에서 자기 PDF 다운로드)
CREATE POLICY invoices_select_own_manager ON public.invoices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE는 owner만 (스리랑카 직원은 발행권 없음 — 정책 2.11)
CREATE POLICY invoices_insert_owner ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY invoices_update_owner ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

-- DELETE는 영구 차단 (void 처리만, 행 삭제 금지)

-- ────────────────────────────────────────────────────────────────────────────
-- 4) credit_notes — 환불 시 발행 (CN-KR / CN-INT)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 번호
  cn_number           TEXT NOT NULL UNIQUE,             -- 'CN-KR-2026-0001'
  track               TEXT NOT NULL,                    -- 'CN-KR' | 'CN-INT'

  -- 연결 — 원본 인보이스 1:1
  original_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  original_invoice_number TEXT NOT NULL,                -- 'INV-KR-2026-0001' (디스플레이용 사본)
  payment_id          UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 금액 (전액 환불 = 원본 인보이스와 동일 금액 음수)
  currency            TEXT NOT NULL,
  amount_subtotal     NUMERIC(15, 2) NOT NULL,
  amount_tax          NUMERIC(15, 2) NOT NULL DEFAULT 0,
  amount_total        NUMERIC(15, 2) NOT NULL,          -- 항상 양수 저장 (PDF에서 '−' 부호 박음)

  -- 사유
  reason              TEXT NOT NULL,
  reason_category     TEXT,                             -- 'duplicate' | 'customer_request' | 'cancellation' | 'other'

  -- 발행
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by           UUID,
  issued_by_email     TEXT,

  -- PDF
  pdf_storage_path    TEXT,
  pdf_generated_at    TIMESTAMPTZ,

  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT credit_notes_track_chk    CHECK (track IN ('CN-KR', 'CN-INT')),
  CONSTRAINT credit_notes_currency_chk CHECK (currency IN ('KRW', 'USD')),
  CONSTRAINT credit_notes_amount_pos   CHECK (amount_total > 0)
);

CREATE INDEX IF NOT EXISTS credit_notes_original_idx ON public.credit_notes(original_invoice_id);
CREATE INDEX IF NOT EXISTS credit_notes_issued_at_idx ON public.credit_notes(issued_at DESC);

COMMENT ON TABLE public.credit_notes IS 'BL-INVOICE-001 단계 2 · 환불 발행. 전액 환불 단일 (부분 환불 없음 — 정책 2.9).';

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid='public.credit_notes'::regclass
  LOOP EXECUTE 'DROP POLICY ' || quote_ident(p.polname) || ' ON public.credit_notes'; END LOOP;
END $$;

CREATE POLICY credit_notes_select_admin ON public.credit_notes
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY credit_notes_select_own_manager ON public.credit_notes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY credit_notes_insert_owner ON public.credit_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

-- credit_note는 UPDATE/DELETE 영구 차단 (발행 후 불변)

-- ────────────────────────────────────────────────────────────────────────────
-- 5) 보조 함수 — payments.invoice_number 자동 동기화
-- ────────────────────────────────────────────────────────────────────────────
-- 정책: invoices.invoice_number를 채번하면 payments.invoice_number도 함께 박힘.
-- 트리거 대신 API 핸들러에서 직접 UPDATE 처리 (명시성 우선).

-- ────────────────────────────────────────────────────────────────────────────
-- 6) 검증
-- ────────────────────────────────────────────────────────────────────────────

SELECT 'CHECK_TABLES' AS step, tablename
  FROM pg_tables
  WHERE schemaname='public'
    AND tablename IN ('invoice_sequences', 'fx_snapshots', 'invoices', 'credit_notes')
  ORDER BY tablename;

SELECT 'CHECK_FUNC' AS step, proname
  FROM pg_proc
  WHERE proname IN ('next_invoice_number')
  ORDER BY proname;

SELECT 'CHECK_POLICIES' AS step, schemaname || '.' || tablename AS table_name, polname
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_tables t ON t.schemaname = n.nspname AND t.tablename = c.relname
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('invoice_sequences', 'fx_snapshots', 'invoices', 'credit_notes')
  ORDER BY tablename, polname;

-- ────────────────────────────────────────────────────────────────────────────
-- 7) 채번 함수 동작 점검 (실제 채번 1회)
-- ────────────────────────────────────────────────────────────────────────────
SELECT 'TEST_NUMBER_KR' AS step, public.next_invoice_number('INV-KR') AS num;
SELECT 'TEST_NUMBER_INT' AS step, public.next_invoice_number('INV-INT') AS num;
SELECT 'TEST_NUMBER_KR_2' AS step, public.next_invoice_number('INV-KR') AS num;
-- EXPECTED: INV-KR-2026-0001 / INV-INT-2026-0001 / INV-KR-2026-0002
-- ⚠️ 이 채번이 운영 카운터에 박힌다. 테스트 환경이면 다음 SQL로 리셋:
-- UPDATE public.invoice_sequences SET last_number = 0;
