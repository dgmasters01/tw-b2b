-- =============================================================================
-- BL-MGR-DASHBOARD-V1 stage 3 — Manager Dashboard 통합 집계 VIEW
-- =============================================================================
-- 목적: manager-dashboard.html에서 매니저별 호텔/영상/예약/매출/노쇼를
--       한 번의 쿼리로 표시할 수 있게 통합 집계 VIEW 제공
--
-- 정책 근거 (decisions-summary.md v2):
--   - 본편/추가 노출 매출 통합 집계 (정정 #10)
--   - 노쇼 = 매출 포함 (호텔이 객실 비워둔 정상 운영)
--   - 취소 = 매출 제외 (체크인 전 정상 환불)
--   - 0건일 때 정직 표시
--
-- 박힘: 2026-05-18 / BL-MGR-DASHBOARD-V1 stage 3
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. v_manager_hotels — 매니저별 호텔 카드 정보
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_manager_hotels AS
SELECT
  h.id                                                      AS hotel_id,
  h.user_id                                                 AS manager_user_id,
  h.hotel_name,
  h.hotel_name_local,
  h.star_rating,
  h.review_score,
  h.review_count,
  h.address,
  h.city,
  h.country,
  h.phone,
  h.image_url,
  h.agoda_url,
  h.contact_name,
  h.contact_email,
  h.contact_phone,
  h.manager_position,
  h.status                                                  AS hotel_status,
  h.paid_at,
  h.published_at,
  h.approved_at,
  h.created_at                                              AS hotel_created_at
FROM hotels h
WHERE h.status NOT IN ('rejected', 'archived');

-- ----------------------------------------------------------------------------
-- 2. v_manager_video_summary — 매니저별 영상 노출 요약
-- ----------------------------------------------------------------------------
-- 매니저 대시보드 탭 1(홈) + 탭 2(영상)에서 사용
-- 8개 채널 × 본편 영상 노출 상태
CREATE OR REPLACE VIEW v_manager_video_summary AS
SELECT
  v.hotel_id,
  COUNT(*)                                                   AS total_videos,
  COUNT(*) FILTER (WHERE v.status = 'published')             AS published_videos,
  COUNT(*) FILTER (WHERE v.status = 'scheduled')             AS scheduled_videos,
  COUNT(DISTINCT v.channel_name) FILTER (
    WHERE v.status = 'published'
  )                                                          AS active_channels,
  COALESCE(SUM(v.view_count), 0)                             AS total_views,
  COALESCE(SUM(v.click_count), 0)                            AS total_clicks,
  MAX(v.published_at)                                        AS last_published_at,
  MIN(v.scheduled_at) FILTER (
    WHERE v.status = 'scheduled' AND v.scheduled_at > NOW()
  )                                                          AS next_scheduled_at
FROM videos v
GROUP BY v.hotel_id;

-- ----------------------------------------------------------------------------
-- 3. v_manager_booking_stats — 매니저별 예약 통계 (본편+추가 통합)
-- ----------------------------------------------------------------------------
-- 매니저 대시보드 탭 5(고객 분석) KPI 4카드 + 탭 3(결제) 예약표
-- 정책: 노쇼=매출포함, 취소=매출제외, 본편/추가 통합
CREATE OR REPLACE VIEW v_manager_booking_stats AS
SELECT
  b.hotel_id,

  -- 총 예약 (취소 제외)
  COUNT(*) FILTER (WHERE NOT b.is_cancelled)                              AS total_bookings,

  -- 확정 매출 (취소 제외, 노쇼 포함)
  COALESCE(SUM(b.booking_amount_usd) FILTER (WHERE NOT b.is_cancelled), 0) AS confirmed_revenue_usd,

  -- 총 박야 (취소 제외)
  COALESCE(SUM(b.nights) FILTER (WHERE NOT b.is_cancelled), 0)            AS total_nights,

  -- 노쇼 매출 (별도 카드 — 0건일 때 정직 표시)
  COUNT(*) FILTER (WHERE b.booking_status = 'no_show')                    AS noshow_count,
  COALESCE(SUM(b.booking_amount_usd) FILTER (WHERE b.booking_status = 'no_show'), 0) AS noshow_revenue_usd,

  -- 취소 (매출 제외)
  COUNT(*) FILTER (WHERE b.is_cancelled)                                  AS cancelled_count,
  COALESCE(SUM(b.booking_amount_usd) FILTER (WHERE b.is_cancelled), 0)    AS cancelled_revenue_usd,

  -- 체크인 완료 / 진행 중
  COUNT(*) FILTER (WHERE b.is_completed)                                  AS completed_count,
  COUNT(*) FILTER (
    WHERE NOT b.is_cancelled AND NOT b.is_completed AND b.booking_status != 'no_show'
  )                                                                       AS in_progress_count
FROM bookings_unified b
GROUP BY b.hotel_id;

-- ----------------------------------------------------------------------------
-- 4. v_manager_payments — 매니저별 결제 카드 (1차/2차 구분)
-- ----------------------------------------------------------------------------
-- 매니저 대시보드 탭 3(결제)에서 사용
-- 결제 카드 시간순 정렬 + 보장 기한 자동 산출 (6개월)
CREATE OR REPLACE VIEW v_manager_payments AS
SELECT
  p.id                                                       AS payment_id,
  p.hotel_id,
  p.user_id                                                  AS manager_user_id,
  p.amount,
  p.currency,
  p.status                                                   AS payment_status,
  p.method,
  p.paid_at,
  p.refunded_at,
  p.refund_amount,
  p.invoice_number,
  p.receipt_url,
  p.paypal_capture_id,
  p.paypal_payer_email,
  ROW_NUMBER() OVER (PARTITION BY p.hotel_id ORDER BY p.paid_at NULLS LAST, p.created_at) AS payment_order,
  -- 보장 기한 = 결제일 + 6개월 (정책)
  (p.paid_at + INTERVAL '6 months')                          AS guarantee_end_at,
  -- 노출 시작일 = 호텔 published_at (다른 호텔 row에서 조인 필요 — Step별 클라이언트 처리)
  p.created_at
FROM payments p
WHERE p.status IN ('paid', 'completed', 'succeeded');

-- ----------------------------------------------------------------------------
-- 5. v_manager_country_distribution — 국가별 예약 분포 (탭 5)
-- ----------------------------------------------------------------------------
-- 정책: 4개국 표시 (한국·일본·미국·대만) — channel-hierarchy v3
-- 대만(TW) 단독 표시 (HK·CN 제외)
-- channel.language → 게스트 국가 매핑 (channel-hierarchy v3)
-- ko → KR, ja → JP, en → US, zh-TW → TW, vi → OTHER
CREATE OR REPLACE VIEW v_manager_country_distribution AS
SELECT
  b.hotel_id,
  COALESCE(
    CASE
      WHEN LOWER(c.language) IN ('ko', 'kor', 'korean') THEN 'KR'
      WHEN LOWER(c.language) IN ('ja', 'jpn', 'japanese') THEN 'JP'
      WHEN LOWER(c.language) IN ('en', 'eng', 'english') THEN 'US'
      WHEN LOWER(c.language) IN ('zh-tw', 'zh_tw', 'zh', 'tw', 'tc') THEN 'TW'
      ELSE 'OTHER'
    END,
    'OTHER'
  )                                                          AS country_code,
  COUNT(*) FILTER (WHERE NOT b.is_cancelled)                  AS booking_count,
  COALESCE(SUM(b.booking_amount_usd) FILTER (WHERE NOT b.is_cancelled), 0) AS revenue_usd
FROM bookings_unified b
LEFT JOIN channels c ON c.code = b.channel_code
GROUP BY b.hotel_id, 2;

-- ----------------------------------------------------------------------------
-- 6. v_manager_monthly_trend — 월별 추이 (탭 5, 최근 6개월)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_manager_monthly_trend AS
SELECT
  b.hotel_id,
  TO_CHAR(DATE_TRUNC('month', b.booked_at), 'YYYY-MM')        AS month_label,
  DATE_TRUNC('month', b.booked_at)                            AS month_start,
  COUNT(*) FILTER (WHERE NOT b.is_cancelled)                  AS bookings,
  COALESCE(SUM(b.booking_amount_usd) FILTER (WHERE NOT b.is_cancelled), 0) AS revenue_usd
FROM bookings_unified b
WHERE b.booked_at >= NOW() - INTERVAL '6 months'
GROUP BY b.hotel_id, 2, 3
ORDER BY month_start;

-- ----------------------------------------------------------------------------
-- 7. v_manager_recent_bookings — 최근 예약 명세 (탭 3 결제 — 7컬럼)
-- ----------------------------------------------------------------------------
-- 정책: 예약번호 / 예약일 / 체크인 / 체크아웃 / 국가 / 금액 / 상태
-- 기기 컬럼 폐기 (정정 #6)
CREATE OR REPLACE VIEW v_manager_recent_bookings AS
SELECT
  b.unified_id                                                AS booking_no,
  b.hotel_id,
  b.booked_at                                                 AS booked_date,
  b.checkin_date,
  b.checkout_date,
  b.nights,
  COALESCE(
    CASE
      WHEN LOWER(c.language) IN ('ko', 'kor', 'korean') THEN 'KR'
      WHEN LOWER(c.language) IN ('ja', 'jpn', 'japanese') THEN 'JP'
      WHEN LOWER(c.language) IN ('en', 'eng', 'english') THEN 'US'
      WHEN LOWER(c.language) IN ('zh-tw', 'zh_tw', 'zh', 'tw', 'tc') THEN 'TW'
      ELSE 'OTHER'
    END,
    'OTHER'
  )                                                           AS guest_country,
  b.booking_amount_usd,
  b.booking_status,
  b.is_cancelled,
  b.is_completed,
  b.created_at
FROM bookings_unified b
LEFT JOIN channels c ON c.code = b.channel_code
ORDER BY b.booked_at DESC;

-- =============================================================================
-- 권한 (RLS는 별도 정책으로 — 매니저는 본인 hotels만 SELECT)
-- =============================================================================
GRANT SELECT ON v_manager_hotels             TO authenticated, anon;
GRANT SELECT ON v_manager_video_summary      TO authenticated, anon;
GRANT SELECT ON v_manager_booking_stats      TO authenticated, anon;
GRANT SELECT ON v_manager_payments           TO authenticated, anon;
GRANT SELECT ON v_manager_country_distribution TO authenticated, anon;
GRANT SELECT ON v_manager_monthly_trend      TO authenticated, anon;
GRANT SELECT ON v_manager_recent_bookings    TO authenticated, anon;

-- =============================================================================
-- 검증 쿼리 (Supabase SQL Editor 붙여넣기 금지 — 자동 실행)
-- =============================================================================
-- SELECT * FROM v_manager_hotels LIMIT 5;
-- SELECT * FROM v_manager_video_summary LIMIT 5;
-- SELECT * FROM v_manager_booking_stats LIMIT 5;
-- SELECT * FROM v_manager_payments LIMIT 5;
-- SELECT * FROM v_manager_country_distribution LIMIT 5;
-- SELECT * FROM v_manager_monthly_trend LIMIT 5;
-- SELECT * FROM v_manager_recent_bookings LIMIT 5;
