-- =============================================================================
-- FIX: 매니저 수수료(commission) 노출 차단 + admin 전용 뷰 분리 + RLS 이중방어
-- 적용일: 2026-06-02 (db-query 창구로 라이브 적용 완료)
-- 근거: D-053 "매니저 화면 수수료 비노출" + BL-ADMIN-HOTEL-DETAIL 권한검증 중 발견
-- 발견: v_manager_bookings/v_manager_channel_stats 에 commission_usd 포함 →
--       매니저가 네트워크 탭으로 우리 제휴수익 확인 가능했음.
-- 조치: 매니저 뷰에서 commission 제거 / admin 전용 뷰 신설(WHERE is_admin)
--       / 매니저 RLS 에 completed·non-cancelled 조건 추가(이중 방어).
-- 멱등: 여러 번 실행해도 동일. security_invoker 유지.
-- =============================================================================

-- ============================================================
-- FIX: 매니저 수수료 노출 차단 + admin 전용 뷰 분리 + RLS 이중방어
-- 멱등(여러 번 실행해도 동일 결과). security_invoker 유지.
-- ============================================================

-- (A) 매니저용 v_manager_bookings — commission_usd 제거
DROP VIEW IF EXISTS v_manager_bookings CASCADE;
CREATE VIEW v_manager_bookings AS
SELECT b.id, b.hotel_id, b.hotel_name, b.hotel_country, b.hotel_city,
  b.checkin_date, b.checkout_date, b.nights, b.num_rooms, b.num_adults, b.num_children,
  b.customer_country, b.room_type, b.booking_amount_usd,
  b.booking_status, b.is_completed, b.is_cancelled, b.device_type, b.booked_at,
  CASE WHEN b.booking_id IS NULL THEN NULL
       WHEN LENGTH(b.booking_id)<=4 THEN '****'
       ELSE REPEAT('*', LENGTH(b.booking_id)-4)||RIGHT(b.booking_id,4) END AS booking_id_masked,
  b.cid, b.channel_code, c.name AS channel_name, c.name_en AS channel_name_en,
  c.language AS channel_language, b.created_at, b.updated_at
FROM bookings_agoda b LEFT JOIN channels c ON c.code=b.channel_code
WHERE b.is_completed=TRUE AND NOT b.is_cancelled;
ALTER VIEW v_manager_bookings SET (security_invoker=true);
GRANT SELECT ON v_manager_bookings TO authenticated;

-- (B) 매니저용 v_manager_channel_stats — commission 제거
DROP VIEW IF EXISTS v_manager_channel_stats CASCADE;
CREATE VIEW v_manager_channel_stats AS
SELECT b.hotel_id, b.channel_code, c.name AS channel_name, c.name_en AS channel_name_en,
  c.language AS channel_language, COUNT(*) AS booking_count,
  SUM(b.nights) AS total_nights, SUM(b.booking_amount_usd) AS gross_amount_usd,
  AVG(b.booking_amount_usd) AS avg_amount_usd
FROM bookings_agoda b LEFT JOIN channels c ON c.code=b.channel_code
WHERE b.is_completed=TRUE AND NOT b.is_cancelled
GROUP BY b.hotel_id, b.channel_code, c.name, c.name_en, c.language;
ALTER VIEW v_manager_channel_stats SET (security_invoker=true);
GRANT SELECT ON v_manager_channel_stats TO authenticated;

-- (C) admin 전용 v_admin_bookings — commission 포함 + WHERE is_admin (매니저는 0행)
DROP VIEW IF EXISTS v_admin_bookings CASCADE;
CREATE VIEW v_admin_bookings AS
SELECT b.id, b.hotel_id, b.hotel_name, b.hotel_country, b.hotel_city,
  b.checkin_date, b.checkout_date, b.nights, b.num_rooms, b.num_adults, b.num_children,
  b.customer_country, b.room_type, b.booking_amount_usd, b.commission_usd,
  b.booking_status, b.is_completed, b.is_cancelled, b.device_type, b.booked_at,
  b.booking_id, b.cid, b.channel_code, c.name AS channel_name, c.name_en AS channel_name_en,
  c.language AS channel_language, b.created_at, b.updated_at
FROM bookings_agoda b LEFT JOIN channels c ON c.code=b.channel_code
WHERE is_admin(auth.uid());
ALTER VIEW v_admin_bookings SET (security_invoker=true);
GRANT SELECT ON v_admin_bookings TO authenticated;

-- (D) admin 전용 v_admin_channel_stats — commission 포함 + WHERE is_admin
DROP VIEW IF EXISTS v_admin_channel_stats CASCADE;
CREATE VIEW v_admin_channel_stats AS
SELECT b.hotel_id, b.channel_code, c.name AS channel_name, c.name_en AS channel_name_en,
  c.language AS channel_language, COUNT(*) AS booking_count,
  SUM(b.nights) AS total_nights, SUM(b.booking_amount_usd) AS gross_amount_usd,
  SUM(b.commission_usd) AS total_commission_usd, AVG(b.booking_amount_usd) AS avg_amount_usd
FROM bookings_agoda b LEFT JOIN channels c ON c.code=b.channel_code
WHERE is_admin(auth.uid()) AND b.is_completed=TRUE AND NOT b.is_cancelled
GROUP BY b.hotel_id, b.channel_code, c.name, c.name_en, c.language;
ALTER VIEW v_admin_channel_stats SET (security_invoker=true);
GRANT SELECT ON v_admin_channel_stats TO authenticated;

-- (E) 매니저 RLS 정책에 완료/미취소 조건 추가 (이중 방어)
DROP POLICY IF EXISTS bookings_agoda_select_manager ON bookings_agoda;
CREATE POLICY bookings_agoda_select_manager ON bookings_agoda
  FOR SELECT TO authenticated
  USING (
    is_completed = TRUE AND NOT is_cancelled
    AND hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid())
  );
