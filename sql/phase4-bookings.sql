-- =============================================================================
-- TW B2B - Phase 4: Manager Booking Visibility
-- =============================================================================
-- 목적:
--   1) channel_cid_map: Agoda CID → channels.code 자동 변환 마스터
--   2) bookings_agoda 확장: cid 컬럼 추가 (어떤 CID로 유입됐는지 원본 보존)
--   3) RLS 확장: 매니저가 본인 호텔의 completed 예약만 조회 가능
--   4) 매니저용 view (개인정보 마스킹 포함)
--
-- 설계 결정:
--   - 별도 bookings 테이블을 신설하지 않고 기존 bookings_agoda 활용
--     (기존 bookings_self + bookings_agoda + bookings_unified 구조 유지)
--   - 메모리 18 CID 매핑을 channel_cid_map에 시드
--   - 스리랑카어 채널은 명단에서 제외 (메모리 23: 5개 채널 + 1 육성)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) channel_cid_map (CID → 채널 코드)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_cid_map (
  cid           TEXT PRIMARY KEY,                          -- Agoda Affiliate CID
  channel_code  TEXT NOT NULL REFERENCES channels(code) ON UPDATE CASCADE,
  cid_label     TEXT,                                      -- 'old' / 'new' 등 부가 정보
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cid_map_channel ON channel_cid_map(channel_code);
CREATE INDEX IF NOT EXISTS idx_cid_map_active  ON channel_cid_map(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_cid_map_updated_at ON channel_cid_map;
CREATE TRIGGER trg_cid_map_updated_at
  BEFORE UPDATE ON channel_cid_map
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2) channels 데이터 검증 — 메모리 18 매핑은 기존 코드 그대로 사용
--    (HT/JP/KT/VN/ZH/HG, 스리랑카어 제외)
-- -----------------------------------------------------------------------------
-- 기존 channels 테이블에 다음 6개가 이미 시드되어 있어야 함:
--   HT = 호텔이야 한국 (ko)
--   JP = 호텔이야 일본 (ja)
--   KT = Koreahotelguide (en)
--   VN = Korea Hotel 베트남어 (vi)
--   ZH = 世界就是家 (zh-tw)
--   HG = 호텔이곳 (ko, 육성 중)
-- TW/TC 는 legacy 채널로 유지 (display_order만 뒤로)
UPDATE channels SET display_order = 100 WHERE code IN ('TW', 'TC');

-- -----------------------------------------------------------------------------
-- 3) channel_cid_map 시드 — 메모리 18 정확 CID
-- -----------------------------------------------------------------------------
INSERT INTO channel_cid_map (cid, channel_code, cid_label, is_active) VALUES
  ('1922821', 'HT', 'old',  TRUE),  -- 호텔이야 한국 (한국어)
  ('1932026', 'HT', 'new',  TRUE),
  ('1923665', 'JP', 'old',  TRUE),  -- 호텔이야 일본 (일본어)
  ('1932024', 'JP', 'new',  TRUE),
  ('1926314', 'KT', 'old',  TRUE),  -- Koreahotelguide (영어)
  ('1932023', 'KT', 'new',  TRUE),
  ('1922822', 'VN', 'old',  TRUE),  -- Korea Hotel 베트남어
  ('1932022', 'VN', 'new',  TRUE),
  ('1930375', 'ZH', 'old',  TRUE),  -- 世界就是家 (대만/중국어 번체)
  ('1932021', 'ZH', 'new',  TRUE),
  ('1946819', 'HG', 'main', TRUE)   -- 호텔이곳 (육성 중)
ON CONFLICT (cid) DO UPDATE SET
  channel_code = EXCLUDED.channel_code,
  cid_label    = EXCLUDED.cid_label,
  updated_at   = NOW();

-- channel_cid_map RLS
ALTER TABLE channel_cid_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cid_map_select_authenticated" ON channel_cid_map;
DROP POLICY IF EXISTS "cid_map_modify_admin_only" ON channel_cid_map;

CREATE POLICY "cid_map_select_authenticated" ON channel_cid_map
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "cid_map_modify_admin_only" ON channel_cid_map
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- -----------------------------------------------------------------------------
-- 4) bookings_agoda — cid 원본 컬럼 추가
--    (엑셀 원본의 cid 그대로 보존, 매핑 변경 시 재산정 가능하도록)
-- -----------------------------------------------------------------------------
ALTER TABLE bookings_agoda ADD COLUMN IF NOT EXISTS cid TEXT;
CREATE INDEX IF NOT EXISTS idx_bagoda_cid ON bookings_agoda(cid);

-- 헬퍼: cid → channel_code 자동 매핑
CREATE OR REPLACE FUNCTION resolve_channel_from_cid(p_cid TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT channel_code FROM channel_cid_map
  WHERE cid = p_cid AND is_active = TRUE
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION resolve_channel_from_cid(TEXT) TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- 5) bookings_agoda RLS 확장
--    기존: admin only (bagoda_admin_only)
--    추가: 매니저는 본인 호텔(hotels.user_id = auth.uid()) + completed 만 SELECT
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "bagoda_select_manager_completed" ON bookings_agoda;

CREATE POLICY "bagoda_select_manager_completed" ON bookings_agoda
  FOR SELECT USING (
    is_admin()  -- 관리자는 전체
    OR (
      is_completed = TRUE
      AND hotel_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM hotels h
        WHERE h.id = bookings_agoda.hotel_id
          AND h.user_id = auth.uid()
      )
    )
  );

-- 기존 bagoda_admin_only는 INSERT/UPDATE/DELETE 만 담당하도록 재정의
-- 그리고 이전에 만들어진 느슨한 정책(completed 조건 없음)도 제거
DROP POLICY IF EXISTS "bagoda_admin_only" ON bookings_agoda;
DROP POLICY IF EXISTS "bagoda_modify_admin_only" ON bookings_agoda;
DROP POLICY IF EXISTS "bagoda_update_admin_only" ON bookings_agoda;
DROP POLICY IF EXISTS "bagoda_delete_admin_only" ON bookings_agoda;
DROP POLICY IF EXISTS "bagoda_select_own_or_admin" ON bookings_agoda;  -- 매니저가 cancelled까지 볼 수 있어 제거

CREATE POLICY "bagoda_insert_admin_only" ON bookings_agoda
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "bagoda_update_admin_only" ON bookings_agoda
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "bagoda_delete_admin_only" ON bookings_agoda
  FOR DELETE USING (is_admin());

-- -----------------------------------------------------------------------------
-- 6) 매니저용 마스킹 VIEW
--    개인정보(고객명/이메일/전화)는 bookings_agoda에 저장되지 않으므로
--    필요한 필드만 노출 + 채널 정보 조인
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_manager_bookings CASCADE;
CREATE OR REPLACE VIEW v_manager_bookings AS
SELECT
  b.id,
  b.hotel_id,
  b.hotel_name,
  b.hotel_country,
  b.hotel_city,
  b.checkin_date,
  b.checkout_date,
  b.nights,
  b.num_rooms,
  b.num_adults,
  b.num_children,
  b.customer_country,
  b.room_type,
  b.booking_amount_usd,
  b.commission_usd,
  b.booking_status,
  b.is_completed,
  b.is_cancelled,
  b.device_type,
  b.booked_at,
  -- 예약번호는 마지막 4자만 노출 (개인정보 보호)
  CASE
    WHEN b.booking_id IS NULL THEN NULL
    WHEN LENGTH(b.booking_id) <= 4 THEN '****'
    ELSE REPEAT('*', LENGTH(b.booking_id) - 4) || RIGHT(b.booking_id, 4)
  END AS booking_id_masked,
  -- 채널 정보
  b.cid,
  b.channel_code,
  c.name      AS channel_name,
  c.name_en   AS channel_name_en,
  c.language  AS channel_language,
  b.created_at,
  b.updated_at
FROM bookings_agoda b
LEFT JOIN channels c ON c.code = b.channel_code
WHERE b.is_completed = TRUE
  AND NOT b.is_cancelled;

-- VIEW는 RLS를 inherit (security_invoker)
ALTER VIEW v_manager_bookings SET (security_invoker = true);

GRANT SELECT ON v_manager_bookings TO authenticated;

-- -----------------------------------------------------------------------------
-- 7) 매니저용 채널별 집계 VIEW
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_manager_channel_stats CASCADE;
CREATE OR REPLACE VIEW v_manager_channel_stats AS
SELECT
  b.hotel_id,
  b.channel_code,
  c.name           AS channel_name,
  c.name_en        AS channel_name_en,
  c.language       AS channel_language,
  COUNT(*)         AS booking_count,
  SUM(b.nights)                          AS total_nights,
  SUM(b.booking_amount_usd)              AS gross_amount_usd,
  SUM(b.commission_usd)                  AS total_commission_usd,
  AVG(b.booking_amount_usd)              AS avg_amount_usd
FROM bookings_agoda b
LEFT JOIN channels c ON c.code = b.channel_code
WHERE b.is_completed = TRUE
  AND NOT b.is_cancelled
GROUP BY b.hotel_id, b.channel_code, c.name, c.name_en, c.language;

ALTER VIEW v_manager_channel_stats SET (security_invoker = true);
GRANT SELECT ON v_manager_channel_stats TO authenticated;

-- =============================================================================
-- 검증 쿼리 (실행 후 수동 체크용)
-- =============================================================================
-- SELECT code, name, language FROM channels WHERE is_active ORDER BY display_order;
-- SELECT cid, channel_code, cid_label FROM channel_cid_map ORDER BY channel_code, cid_label;
-- SELECT resolve_channel_from_cid('1922821');  -- expects 'HT_KR'
-- SELECT resolve_channel_from_cid('9999999');  -- expects NULL
