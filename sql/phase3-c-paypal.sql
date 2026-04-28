-- =============================================================
-- TW B2B Phase 3 C단계: PayPal 결제 통합
-- Date: 2026-04-28
-- Purpose:
--   1. payments 테이블에 PayPal 관련 컬럼 추가 (멱등 ADD COLUMN IF NOT EXISTS)
--   2. payments → hotels.status='paid' 자동 동기화 트리거
--   3. 결제 captured 상태에서만 hotel 자동 paid 전환 (refund/reversal은 매니저 수동 검토)
-- =============================================================

-- =============================================================
-- 1. payments 테이블 PayPal 컬럼 추가 (멱등)
-- =============================================================
-- 기존 컬럼 (코드에서 사용): id, user_id, hotel_id, amount, currency, method, status, created_at
-- 추가 컬럼: paypal_order_id, paypal_capture_id, paypal_payer_email, paypal_payer_id, metadata, updated_at

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payer_email TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT, -- 'sandbox' | 'live'
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS method TEXT, -- 'paypal' | 'stripe' (legacy) | 'manual'
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.payments.method IS '결제 수단: paypal | stripe (legacy) | manual';

-- paypal_order_id 유니크 인덱스 (중복 capture 방지)
CREATE UNIQUE INDEX IF NOT EXISTS payments_paypal_order_id_uniq
  ON public.payments(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- paypal_capture_id 유니크 인덱스 (Webhook 중복 처리 방지)
CREATE UNIQUE INDEX IF NOT EXISTS payments_paypal_capture_id_uniq
  ON public.payments(paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;

-- hotel_id 인덱스 (대시보드 조회 최적화)
CREATE INDEX IF NOT EXISTS payments_hotel_id_idx
  ON public.payments(hotel_id);

-- status 인덱스
CREATE INDEX IF NOT EXISTS payments_status_idx
  ON public.payments(status);

-- =============================================================
-- 2. payments → hotels.status 자동 동기화 트리거
-- =============================================================
-- 결제 status가 'completed' (PayPal capture 성공) 으로 INSERT/UPDATE 되면
-- 해당 hotel_id의 hotels.status를 'paid'로 자동 전환
-- 단, 이미 paid/producing/published 상태면 변경하지 않음 (downgrade 방지)

CREATE OR REPLACE FUNCTION public.sync_hotel_paid_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 결제 완료 상태에서만 동작
  IF NEW.status = 'completed' AND NEW.hotel_id IS NOT NULL THEN
    UPDATE public.hotels
    SET status = 'paid'
    WHERE id = NEW.hotel_id
      AND status IN ('approved', 'pending', 'review'); -- approved 외에서도 안전하게 paid로
    -- producing/published 상태는 건드리지 않음 (downgrade 방지)
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_sync_hotel_status ON public.payments;

CREATE TRIGGER payments_sync_hotel_status
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_hotel_paid_status();

-- =============================================================
-- 3. updated_at 자동 갱신 트리거
-- =============================================================
CREATE OR REPLACE FUNCTION public.payments_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_updated_at_trigger ON public.payments;

CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.payments_set_updated_at();

-- =============================================================
-- 4. RLS 정책 추가 보강: service_role(서버사이드) 전체 접근 허용
-- =============================================================
-- PayPal capture/webhook은 서버사이드(service_role)에서 INSERT/UPDATE 함
-- 기존 payments_insert_own 정책은 user_id = auth.uid() 만 허용 → 서버에서는 service_role 키 사용 시 우회됨
-- 명시적으로 service_role 정책 추가 (방어적 안전망)

DROP POLICY IF EXISTS payments_service_role_all ON public.payments;
CREATE POLICY payments_service_role_all ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================
-- 검증 쿼리 (적용 후 수동 실행)
-- =============================================================
-- 컬럼 추가 확인:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='payments'
-- ORDER BY ordinal_position;
--
-- 인덱스 확인:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE schemaname='public' AND tablename='payments';
--
-- 트리거 확인:
-- SELECT tgname, tgrelid::regclass, tgenabled FROM pg_trigger
-- WHERE tgrelid::regclass::text = 'payments';
