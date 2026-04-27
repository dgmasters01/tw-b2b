-- =============================================================================
-- TW B2B - Phase 1 Step 7: Public-facing Live Feed VIEWs
-- =============================================================================
-- 목적: index.html(비로그인 공개 페이지)에서 사용할 익명(anon) 안전 VIEW.
--   - 고객 PII(이름/이메일/booking_code 등) 절대 노출 금지
--   - 도시/국가/성급/금액/언어 등 마케팅 안전 컬럼만 공개
--   - 채널은 채널명/언어만 노출 (channel_code도 코드만 → 비식별)
--   - 보안: SECURITY INVOKER (default) 대신 SECURITY DEFINER 로 만들어
--     anon 이 베이스 테이블 RLS 를 우회해 VIEW 만 SELECT 가능하게 함.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) v_public_recent_bookings : 메인 페이지 Activity Stream 용
-- -----------------------------------------------------------------------------
-- 최근 50건 한정. PII 제거. 취소 건 제외. 호텔명은 그대로 노출(이미 마케팅
-- 콘텐츠로 공개되는 정보), 고객명/이메일/booking_code 등은 절대 미포함.
DROP VIEW IF EXISTS v_public_recent_bookings;
CREATE VIEW v_public_recent_bookings
WITH (security_invoker = false) AS  -- SECURITY DEFINER 동작 (Postgres 15+ 호환)
SELECT
  b.unified_id,                       -- 'S-uuid' / 'A-uuid' (예약 식별 불가, 표시용)
  b.source,                           -- 'self' | 'agoda'
  b.channel_code,
  c.name             AS channel_name,
  c.language         AS channel_language,
  b.hotel_name,
  b.hotel_country,
  b.hotel_city,
  b.hotel_star,
  b.nights,
  b.num_rooms,
  b.booking_amount_usd,
  b.booked_at
FROM bookings_unified b
LEFT JOIN channels c ON c.code = b.channel_code
WHERE b.is_cancelled = FALSE
  AND b.booked_at IS NOT NULL
ORDER BY b.booked_at DESC, b.created_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 2) v_public_stats : 메인 페이지 카운터 위젯 용
-- -----------------------------------------------------------------------------
-- 누적 통계만. 절대 개별 식별자 노출 안 함.
DROP VIEW IF EXISTS v_public_stats;
CREATE VIEW v_public_stats
WITH (security_invoker = false) AS
SELECT
  COUNT(*) FILTER (WHERE NOT is_cancelled)                              AS total_bookings,
  COALESCE(SUM(booking_amount_usd) FILTER (WHERE NOT is_cancelled), 0)  AS total_amount_usd,
  COALESCE(SUM(commission_usd)     FILTER (WHERE NOT is_cancelled), 0)  AS total_commission_usd,
  COUNT(DISTINCT hotel_name)       FILTER (WHERE NOT is_cancelled)      AS distinct_hotels,
  COUNT(DISTINCT hotel_city)       FILTER (WHERE NOT is_cancelled
                                                AND hotel_city IS NOT NULL) AS distinct_cities,
  COUNT(DISTINCT hotel_country)    FILTER (WHERE NOT is_cancelled
                                                AND hotel_country IS NOT NULL) AS distinct_countries,
  COUNT(DISTINCT channel_code)     FILTER (WHERE NOT is_cancelled)      AS active_channels,
  MAX(booked_at)                                                        AS latest_booked_at
FROM bookings_unified;

-- -----------------------------------------------------------------------------
-- 3) anon, authenticated 권한 부여
-- -----------------------------------------------------------------------------
-- VIEW 자체에 SELECT 권한 부여 (베이스 테이블은 여전히 RLS 보호).
GRANT SELECT ON v_public_recent_bookings TO anon, authenticated;
GRANT SELECT ON v_public_stats           TO anon, authenticated;

-- VIEW 가 베이스 테이블을 읽을 수 있도록 owner 가 해당 테이블에 SELECT 권한 보유 필요.
-- (postgres = supabase 의 기본 owner 이므로 별도 grant 불필요. 검증 단계에서 확인.)

-- =============================================================================
-- 검증 쿼리 (적용 후 자동 실행)
-- =============================================================================
-- SELECT * FROM v_public_stats;
-- SELECT COUNT(*) FROM v_public_recent_bookings;
