-- =============================================================================
-- TW B2B - Phase 1 Step 2-2: bookings_agoda (아고다 채널 예약 테이블)
-- =============================================================================
-- 목적: 아고다 어필리에이트 리포트(엑셀)를 채널별로 업로드한 예약 데이터
-- 특징: 월 1회 엑셀 업로드, 50채널 확장 대비, 중복 방지 unique key
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings_agoda (
  id              BIGSERIAL PRIMARY KEY,

  -- 채널 (필수: 어느 채널의 리포트인지)
  channel_code    TEXT NOT NULL REFERENCES channels(code) ON UPDATE CASCADE,

  -- 아고다 식별
  booking_id      TEXT NOT NULL,                 -- 아고다 Booking ID (채널별 unique)
  reservation_no  TEXT,                          -- Reservation Number (있을 시)

  -- 호텔 정보 (아고다 리포트 원본 그대로)
  hotel_name      TEXT NOT NULL,
  hotel_id_agoda  TEXT,                          -- 아고다 호텔 ID (있을 시)
  hotel_country   TEXT,
  hotel_city      TEXT,
  hotel_star      INTEGER CHECK (hotel_star BETWEEN 1 AND 5),

  -- 호텔 매핑 (자체 hotels 테이블과 연결, 매핑 안 되면 NULL)
  hotel_id        UUID REFERENCES hotels(id) ON DELETE SET NULL,

  -- 고객 (아고다는 통상 익명/일부만 제공)
  customer_country TEXT,                         -- 고객 국적
  num_adults      INTEGER,
  num_children    INTEGER,

  -- 일정
  checkin_date    DATE,
  checkout_date   DATE,
  nights          INTEGER,                       -- 아고다 리포트 값 그대로

  -- 객실
  room_type       TEXT,
  num_rooms       INTEGER DEFAULT 1,

  -- 금액 (아고다 리포트 USD 기준이 일반적)
  booking_amount_usd  NUMERIC(12,2),             -- 예약 총액 (Booking USD)
  commission_usd      NUMERIC(10,2),             -- 우리 수수료 (Commission USD)
  currency_original   TEXT,
  booking_amount_original NUMERIC(12,2),

  -- 예약 상태 (아고다 리포트 status 기준)
  booking_status  TEXT,                          -- confirmed, cancelled, no_show, completed 등
  is_cancelled    BOOLEAN DEFAULT FALSE,         -- 빠른 필터용
  is_completed    BOOLEAN DEFAULT FALSE,         -- 체크아웃 완료 (수수료 확정)

  -- 디바이스/플랫폼
  device_type     TEXT,                          -- web, app (아고다 100$+ 분석용)

  -- 예약일자
  booked_at       DATE,                          -- 예약 발생일

  -- 메타: 업로드 추적
  upload_batch_id TEXT,                          -- 업로드 배치 ID (한 번 업로드한 묶음)
  uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_filename TEXT,                          -- 원본 파일명
  raw_row_data    JSONB,                         -- 엑셀 원본 행 보존 (디버깅/필드 추가 대비)

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 방지: 같은 채널의 같은 booking_id는 1건만
  CONSTRAINT uq_bagoda_channel_booking UNIQUE (channel_code, booking_id)
);

-- 인덱스 (50채널 확장 대비, 분석 쿼리 빈번)
CREATE INDEX IF NOT EXISTS idx_bagoda_channel     ON bookings_agoda(channel_code);
CREATE INDEX IF NOT EXISTS idx_bagoda_booked      ON bookings_agoda(booked_at DESC);
CREATE INDEX IF NOT EXISTS idx_bagoda_checkin     ON bookings_agoda(checkin_date);
CREATE INDEX IF NOT EXISTS idx_bagoda_country     ON bookings_agoda(hotel_country);
CREATE INDEX IF NOT EXISTS idx_bagoda_city        ON bookings_agoda(hotel_city);
CREATE INDEX IF NOT EXISTS idx_bagoda_status      ON bookings_agoda(booking_status);
CREATE INDEX IF NOT EXISTS idx_bagoda_cancelled   ON bookings_agoda(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_bagoda_completed   ON bookings_agoda(is_completed);
CREATE INDEX IF NOT EXISTS idx_bagoda_hotel       ON bookings_agoda(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bagoda_batch       ON bookings_agoda(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_bagoda_device      ON bookings_agoda(device_type);
-- 100$+ 분석용 (아고다 정책 기준선)
CREATE INDEX IF NOT EXISTS idx_bagoda_amount_100  ON bookings_agoda(booking_amount_usd) WHERE booking_amount_usd >= 100;

-- updated_at 트리거
DROP TRIGGER IF EXISTS trg_bagoda_updated_at ON bookings_agoda;
CREATE TRIGGER trg_bagoda_updated_at
  BEFORE UPDATE ON bookings_agoda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS 정책 (관리자 전용)
-- =============================================================================
ALTER TABLE bookings_agoda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bagoda_admin_only" ON bookings_agoda;

CREATE POLICY "bagoda_admin_only" ON bookings_agoda
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
