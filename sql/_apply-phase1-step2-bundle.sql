-- =============================================================================
-- TW B2B - Phase 1 Step 2 BUNDLE (Supabase SQL Editor 한 번에 실행용)
-- =============================================================================
-- 사용법: Supabase Dashboard → SQL Editor → New Query → 이 파일 전체 붙여넣기 → RUN
-- 멱등: 여러 번 실행해도 안전.
-- 포함: 00-helpers + 02-channels + 03-bookings-self + 04-bookings-agoda + 05-views
-- =============================================================================


-- ##############################################################
-- ## 00-helpers.sql
-- ##############################################################
-- =============================================================================
-- TW B2B - Helper Functions
-- =============================================================================
-- is_admin(): 현재 로그인 사용자가 admins 테이블에 활성 상태로 등록되어 있는지
-- 모든 RLS 정책에서 공통 사용
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admins a
    JOIN auth.users u ON LOWER(u.email) = LOWER(a.email)
    WHERE u.id = auth.uid()
      AND COALESCE(a.is_active, TRUE) = TRUE
  );
$$;

-- 모든 인증 사용자가 호출 가능
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;

-- ##############################################################
-- ## 02-channels.sql
-- ##############################################################
-- =============================================================================
-- TW B2B - Phase 1 Step 2-3: channels (채널 마스터 테이블)
-- =============================================================================
-- 목적: 50채널 확장 가능한 채널 레지스트리
-- CH 코드 (2자 약어) 기반으로 모든 예약 데이터를 채널 단위로 분류
-- =============================================================================

CREATE TABLE IF NOT EXISTS channels (
  -- 식별
  code        TEXT PRIMARY KEY,                  -- TW, HT, KT, TC, JP, ZH 등 2자 약어
  name        TEXT NOT NULL,                     -- 채널 표시명 (예: 여행능력자들)
  name_en     TEXT,                              -- 영문명 (예: TRAVELWINNERS)

  -- 분류
  language    TEXT NOT NULL,                     -- ko, en, ja, zh-tw, zh-cn, vi 등
  platform    TEXT,                              -- youtube, tiktok, instagram, blog 등 (확장 대비)

  -- 아고다 연동
  has_agoda_api BOOLEAN DEFAULT FALSE,           -- 아고다 API 키 보유 여부
  agoda_site_id TEXT,                            -- 아고다 가입 사이트 ID (있을 시)

  -- 운영 상태
  is_active   BOOLEAN DEFAULT TRUE,              -- 비활성화 시 통계 제외
  display_order INTEGER DEFAULT 999,             -- 대시보드 표시 순서

  -- 메타
  notes       TEXT,                              -- 메모 (운영자 전용)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_channels_lang   ON channels(language);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_channels_updated_at ON channels;
CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 초기 데이터: 현재 운영 중인 6개 채널 시드
-- =============================================================================
INSERT INTO channels (code, name, name_en, language, platform, has_agoda_api, is_active, display_order)
VALUES
  ('TW', '여행능력자들',  'TRAVELWINNERS',         'ko',    'youtube', TRUE,  TRUE, 1),
  ('HT', '호텔이야',      'HOTEL-IYA',             'ko',    'youtube', FALSE, TRUE, 2),
  ('KT', 'Kotel',        'Kotel',                  'en',    'youtube', FALSE, TRUE, 3),
  ('TC', '호텔닷컴',      'Hotel-com (Trip.com)',  'ko',    'youtube', FALSE, TRUE, 4),
  ('JP', 'ホテルだ',      'HOTEL-DA',              'ja',    'youtube', FALSE, TRUE, 5),
  ('ZH', '世界就是家',    'World-is-Home',          'zh-tw', 'youtube', FALSE, TRUE, 6)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- RLS 정책
-- =============================================================================
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channels_select_authenticated" ON channels;
DROP POLICY IF EXISTS "channels_modify_admin_only" ON channels;

-- 모든 인증 사용자가 채널 목록 조회 가능 (드롭다운/통계용)
CREATE POLICY "channels_select_authenticated" ON channels
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE는 관리자 전용
CREATE POLICY "channels_modify_admin_only" ON channels
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ##############################################################
-- ## 03-bookings-self.sql
-- ##############################################################
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
  hotel_id        UUID REFERENCES hotels(id) ON DELETE SET NULL,
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

-- ##############################################################
-- ## 04-bookings-agoda.sql
-- ##############################################################
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

-- ##############################################################
-- ## 05-bookings-unified-view.sql
-- ##############################################################
-- =============================================================================
-- TW B2B - Phase 1 Step 2-4: bookings_unified (통합 분석 VIEW)
-- =============================================================================
-- 목적: bookings_self + bookings_agoda를 하나의 뷰로 합쳐 분석 대시보드에서 사용
-- 동일 컬럼명/타입으로 정규화 (booking_analytics 8탭 이식 대비)
-- =============================================================================

CREATE OR REPLACE VIEW bookings_unified AS
SELECT
  'self'::text                              AS source,
  ('S-' || id::text)::text                  AS unified_id,
  channel_code,
  hotel_id,
  hotel_name,
  hotel_country,
  hotel_city,
  hotel_star,
  checkin_date,
  checkout_date,
  nights,
  num_rooms,
  total_amount_usd                          AS booking_amount_usd,
  commission_usd,
  payment_status                            AS booking_status,
  (booking_status = 'cancelled')            AS is_cancelled,
  (booking_status = 'completed')            AS is_completed,
  NULL::text                                AS device_type,
  created_at::date                          AS booked_at,
  created_at,
  updated_at
FROM bookings_self

UNION ALL

SELECT
  'agoda'::text                             AS source,
  ('A-' || id::text)::text                  AS unified_id,
  channel_code,
  hotel_id,
  hotel_name,
  hotel_country,
  hotel_city,
  hotel_star,
  checkin_date,
  checkout_date,
  nights,
  num_rooms,
  booking_amount_usd,
  commission_usd,
  booking_status,
  is_cancelled,
  is_completed,
  device_type,
  booked_at,
  created_at,
  updated_at
FROM bookings_agoda;

-- =============================================================================
-- 채널별 집계 VIEW (대시보드 카드용)
-- =============================================================================
CREATE OR REPLACE VIEW v_channel_stats AS
SELECT
  c.code                                                AS channel_code,
  c.name                                                AS channel_name,
  c.language,
  c.is_active,
  COUNT(b.unified_id) FILTER (WHERE NOT b.is_cancelled) AS total_bookings,
  COUNT(b.unified_id) FILTER (WHERE b.is_completed)     AS completed_bookings,
  COUNT(b.unified_id) FILTER (WHERE b.is_cancelled)     AS cancelled_bookings,
  COUNT(b.unified_id) FILTER (
    WHERE NOT b.is_cancelled AND b.booking_amount_usd >= 100
  )                                                     AS bookings_100plus,
  COALESCE(SUM(b.booking_amount_usd) FILTER (WHERE NOT b.is_cancelled), 0)  AS gross_amount_usd,
  COALESCE(SUM(b.commission_usd)     FILTER (WHERE NOT b.is_cancelled), 0)  AS gross_commission_usd
FROM channels c
LEFT JOIN bookings_unified b ON b.channel_code = c.code
GROUP BY c.code, c.name, c.language, c.is_active, c.display_order
ORDER BY c.display_order;
