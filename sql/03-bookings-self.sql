-- =============================================================================
-- TW B2B - Phase 1 Step 2-1: bookings_self (자체 영업 예약 테이블)
-- =============================================================================
-- 목적: 자체 영업으로 받은 예약 (B2B 직접 계약, 패키지 판매, 자체 결제)
-- 특징: 수동 입력 폼으로 등록, 관리자가 직접 관리
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings_self (
  id              BIGSERIAL PRIMARY KEY,

  -- 식별
  booking_code    TEXT UNIQUE NOT NULL,          -- 자체 발급 예약번호 (예: TW-2026-0001)

  -- 채널 (자체 영업도 어느 채널 통해 들어왔는지 추적)
  channel_code    TEXT REFERENCES channels(code) ON UPDATE CASCADE,

  -- 호텔 정보 (hotels 테이블 연결 또는 수동 입력)
  hotel_id        BIGINT REFERENCES hotels(id) ON DELETE SET NULL,
  hotel_name      TEXT NOT NULL,                 -- hotels 미연결 시 수동 기재
  hotel_country   TEXT,
  hotel_city      TEXT,
  hotel_star      INTEGER CHECK (hotel_star BETWEEN 1 AND 5),

  -- 고객 정보
  guest_name      TEXT NOT NULL,
  guest_email     TEXT,
  guest_phone     TEXT,
  guest_country   TEXT,                          -- 고객 국적
  num_adults      INTEGER DEFAULT 2,
  num_children    INTEGER DEFAULT 0,

  -- 일정
  checkin_date    DATE NOT NULL,
  checkout_date   DATE NOT NULL,
  nights          INTEGER GENERATED ALWAYS AS (checkout_date - checkin_date) STORED,

  -- 객실
  room_type       TEXT,
  num_rooms       INTEGER DEFAULT 1,

  -- 금액 (USD 기준)
  total_amount_usd NUMERIC(10,2) NOT NULL,
  commission_usd   NUMERIC(10,2),                -- 자체 영업 마진/수수료
  currency_original TEXT DEFAULT 'USD',
  total_amount_original NUMERIC(12,2),           -- 원래 통화로 받은 경우

  -- 결제
  payment_method  TEXT,                          -- paypal, bank_transfer, cash 등
  payment_status  TEXT DEFAULT 'pending'         -- pending, paid, refunded, cancelled
                  CHECK (payment_status IN ('pending','paid','refunded','cancelled')),
  paid_at         TIMESTAMPTZ,

  -- 예약 상태
  booking_status  TEXT DEFAULT 'confirmed'
                  CHECK (booking_status IN ('inquiry','confirmed','completed','cancelled','no_show')),

  -- 비고
  notes           TEXT,                          -- 관리자 메모
  source_url      TEXT,                          -- 인입 경로 (영상/포스트 URL)

  -- 메타
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- 검증
  CONSTRAINT chk_dates CHECK (checkout_date > checkin_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_bself_channel    ON bookings_self(channel_code);
CREATE INDEX IF NOT EXISTS idx_bself_checkin    ON bookings_self(checkin_date);
CREATE INDEX IF NOT EXISTS idx_bself_created    ON bookings_self(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bself_status     ON bookings_self(booking_status);
CREATE INDEX IF NOT EXISTS idx_bself_pay_status ON bookings_self(payment_status);
CREATE INDEX IF NOT EXISTS idx_bself_hotel      ON bookings_self(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bself_country    ON bookings_self(hotel_country);

-- updated_at 트리거
DROP TRIGGER IF EXISTS trg_bself_updated_at ON bookings_self;
CREATE TRIGGER trg_bself_updated_at
  BEFORE UPDATE ON bookings_self
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS 정책 (관리자 전용)
-- =============================================================================
ALTER TABLE bookings_self ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bself_admin_only" ON bookings_self;

-- 관리자만 모든 작업 가능 (자체 영업은 본사 운영)
CREATE POLICY "bself_admin_only" ON bookings_self
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
