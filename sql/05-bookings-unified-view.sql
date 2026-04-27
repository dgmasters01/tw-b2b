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
