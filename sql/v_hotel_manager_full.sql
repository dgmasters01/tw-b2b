-- ════════════════════════════════════════════════════════════════════════════
-- BL-MANAGER-HUB-VIEW — v_hotel_manager_full
-- ════════════════════════════════════════════════════════════════════════════
-- 목적: 매니저 1명에 대한 모든 정보를 1줄로 — 허브 페이지 단일 진실원
-- 출처: auth.users + hotels + payments + bookings + videos + admin_notes
-- 사용처: _admin/admin-manager-hub.html, members 탭, 다른 페이지의 매니저 필터 칩
--
-- 변경 이력:
--   2026-05-13: 초기 박음 (BL-MANAGER-HUB-VIEW)
--   2026-05-21: BL-ADMIN-MEMBERS-KPI-FIX (D-046)
--               - payments.status 'completed' → 'succeeded' (PayPal 실제 값)
--               - paid_at NULL이면 created_at으로 폴백 (테스트 결제 호환)
--               - lifecycle_stage/guarantee_status 판정 기준 p.paid_at → p.id로 변경
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_hotel_manager_full AS
SELECT
  -- 매니저 식별
  u.id                                                          AS manager_id,
  u.email                                                       AS manager_email,
  u.created_at                                                  AS signup_at,
  u.last_sign_in_at                                             AS last_login_at,
  (u.email_confirmed_at IS NOT NULL)                            AS is_email_verified,

  -- 호텔 (1:1 가정, hotels.user_id로 연결)
  h.id                                                          AS hotel_id,
  h.hotel_name,
  h.hotel_name_local,
  h.star_rating,
  h.review_score                                                AS agoda_review_score,
  h.review_count                                                AS agoda_review_count,
  h.daily_rate                                                  AS hotel_daily_rate,
  h.currency                                                    AS hotel_currency,
  h.city                                                        AS hotel_city,
  h.country                                                     AS hotel_country,
  h.address                                                     AS hotel_address,
  h.image_url                                                   AS hotel_image_url,
  h.landing_url                                                 AS hotel_landing_url,
  h.include_breakfast,
  h.free_wifi,
  h.agoda_match_status,
  h.status                                                      AS hotel_status,
  h.property_type,
  h.contact_name                                                AS hotel_contact_name,
  h.contact_email                                               AS hotel_contact_email,
  h.contact_phone                                               AS hotel_contact_phone,
  h.whatsapp                                                    AS hotel_whatsapp,
  h.manager_position,
  h.created_at                                                  AS hotel_created_at,
  h.approved_at                                                 AS hotel_approved_at,
  h.published_at                                                AS hotel_published_at,

  -- 결제 (최신 1건 기준)
  -- BL-ADMIN-MEMBERS-KPI-FIX (2026-05-21): paid_at NULL이면 created_at으로 폴백 (D-046)
  p.id                                                          AS payment_id,
  p.amount                                                      AS payment_amount,
  p.currency                                                    AS payment_currency,
  p.status                                                      AS payment_status,
  COALESCE(p.paid_at, p.created_at)                             AS payment_paid_at,
  p.refunded_at                                                 AS payment_refunded_at,
  p.method                                                      AS payment_method,
  -- 6개월 보장 만료일 + D-day (paid_at NULL이면 created_at 기준)
  (COALESCE(p.paid_at, p.created_at) + INTERVAL '180 days')     AS guarantee_expires_at,
  CASE WHEN p.id IS NULL THEN NULL
       ELSE EXTRACT(DAY FROM (COALESCE(p.paid_at, p.created_at) + INTERVAL '180 days') - now())::int
  END                                                           AS guarantee_days_left,
  CASE WHEN p.id IS NULL THEN NULL
       ELSE EXTRACT(DAY FROM now() - COALESCE(p.paid_at, p.created_at))::int
  END                                                           AS days_since_payment,

  -- 예약 집계
  COALESCE(bk.booking_count, 0)                                 AS booking_count,
  COALESCE(bk.booking_revenue, 0)                               AS booking_revenue,
  COALESCE(bk.booking_commission, 0)                            AS booking_commission,
  bk.last_booking_at,

  -- 영상 집계
  COALESCE(vd.video_count, 0)                                   AS video_count,
  COALESCE(vd.video_channels, 0)                                AS video_channels_active,
  COALESCE(vd.total_views, 0)                                   AS video_total_views,
  COALESCE(vd.total_clicks, 0)                                  AS video_total_clicks,
  vd.last_video_published_at,

  -- CS 메모
  COALESCE(an.note_count, 0)                                    AS cs_note_count,
  an.last_note_at,

  -- 매니저 단계 (자동 캠페인 계산용)
  -- BL-ADMIN-MEMBERS-KPI-FIX: p.id 기준으로 결제 존재 판정 (paid_at NULL 케이스 대응)
  CASE
    WHEN p.id IS NULL                                             THEN 'signup_only'
    WHEN p.id IS NOT NULL AND h.published_at IS NULL              THEN 'paid_pending_hotel'
    WHEN p.refunded_at IS NOT NULL                                THEN 'refunded'
    WHEN now() > (COALESCE(p.paid_at, p.created_at) + INTERVAL '180 days') THEN 'guarantee_expired'
    WHEN now() > (COALESCE(p.paid_at, p.created_at) + INTERVAL '170 days') THEN 'final_decision_window'
    WHEN now() > (COALESCE(p.paid_at, p.created_at) + INTERVAL '150 days') THEN 'rebill_window'
    WHEN now() > (COALESCE(p.paid_at, p.created_at) + INTERVAL '30 days')  THEN 'active_monitoring'
    WHEN now() > (COALESCE(p.paid_at, p.created_at) + INTERVAL '7 days')   THEN 'early_sales'
    ELSE                                                                'welcome'
  END                                                           AS lifecycle_stage,

  -- 보장 상태 (안전·주의·위험)
  CASE
    WHEN p.id IS NULL                                               THEN 'no_payment'
    WHEN COALESCE(bk.booking_count,0) >= 5                          THEN 'safe'
    WHEN COALESCE(bk.booking_count,0) >= 1                          THEN 'moderate'
    WHEN now() > (COALESCE(p.paid_at, p.created_at) + INTERVAL '120 days') THEN 'risk_refund'
    ELSE                                                                 'pending'
  END                                                           AS guarantee_status

FROM auth.users u
LEFT JOIN public.hotels h
  ON h.user_id = u.id
LEFT JOIN LATERAL (
  -- BL-ADMIN-MEMBERS-KPI-FIX (2026-05-21): 실제 payments.status는 'succeeded' (PayPal 표준)
  -- 'completed' = 잘못된 약속어, 'succeeded' = 진실. D-046.
  SELECT * FROM public.payments
   WHERE payments.user_id = u.id AND payments.status = 'succeeded'
   ORDER BY COALESCE(paid_at, created_at) DESC
   LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT
    count(*)              AS booking_count,
    sum(amount)           AS booking_revenue,
    sum(commission)       AS booking_commission,
    max(booking_date)     AS last_booking_at
  FROM public.bookings
   WHERE bookings.hotel_id = h.id
     AND bookings.status IN ('confirmed','completed')
) bk ON true
LEFT JOIN LATERAL (
  SELECT
    count(*)                                       AS video_count,
    count(DISTINCT channel_name)                   AS video_channels,
    sum(view_count)                                AS total_views,
    sum(click_count)                               AS total_clicks,
    max(published_at)                              AS last_video_published_at
  FROM public.videos
   WHERE videos.hotel_id = h.id
     AND videos.status = 'published'
) vd ON true
LEFT JOIN LATERAL (
  SELECT
    count(*)              AS note_count,
    max(created_at)       AS last_note_at
  FROM public.admin_notes
   WHERE admin_notes.hotel_id = h.id
) an ON true
WHERE u.email IS NOT NULL
  AND u.email NOT LIKE '%@gohotelwinners.com'  -- 시스템 계정 제외
;

-- 권한: service_role + authenticated 읽기 가능 (RLS는 underlying 테이블에서 처리)
GRANT SELECT ON public.v_hotel_manager_full TO authenticated, service_role, anon;

COMMENT ON VIEW public.v_hotel_manager_full IS
  'BL-MANAGER-HUB-VIEW — 매니저 1명 = 1줄. 허브 페이지·members 탭·다른 페이지 필터칩의 단일 진실원.';
