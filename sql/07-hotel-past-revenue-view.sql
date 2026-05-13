-- =============================================================================
-- TW B2B - BL-PAST-VIDEO-RECON: 호텔별 과거 누적 매출 집계 VIEW
-- =============================================================================
-- 결정 근거: D-035 (누적 매출 임계값 3구간 분기), D-038 (Agoda 약관 4중 안전)
-- 목적:
--   1) 우리 채널이 만든 호텔별 누적 매출(USD)을 admin에서 한눈에 본다
--   2) D-035 3구간 라벨(strong/soft/hide) 자동 산출 → 신규 매니저 가입 시 영업 무기
--   3) 우리만 보는 admin 영역 전용 (RLS: service_role + authenticated admin)
--
-- 매칭 키 우선순위 (D-035 정확도 95%+ 기준):
--   1순위: bookings_self.hotel_id = hotels.id (UUID, 100% 정확)
--   2순위: bookings_agoda.hotel_id = hotels.id (UUID, 매칭 완료된 건)
--   3순위: bookings_agoda.hotel_id_agoda = hotels.agoda_hotel_id (TEXT, 자동 매칭)
--   4순위: hotels.google_place_id 동등성 (현재 bookings에 컬럼 없음 — hotels 측 보조키)
--   5순위: hotel_name + hotel_city + hotel_country (폴백, fuzzy 아님 정확 일치)
--
-- D-035 3구간 (누적 매출 USD 기준):
--   - strong: >= $1,000  → 정확한 매출액 + 건수 + 기간 노출
--   - soft  : $200~$999  → 건수만 노출, "관심 채널"
--   - hide  : < $200     → 노출 X (매니저 부정 인식 방지)
--
-- 취소 건 제외(is_cancelled = false)
-- =============================================================================

DROP VIEW IF EXISTS v_hotel_past_revenue;

CREATE VIEW v_hotel_past_revenue AS
WITH
-- ============================================================
-- 1) bookings_unified 중 매칭 가능한 hotels.id 산출
-- ============================================================
-- bookings_self: hotel_id(UUID) 그대로 사용
-- bookings_agoda: hotel_id(UUID) 우선, 없으면 hotel_id_agoda로 hotels 조회
matched_bookings AS (
  -- self: hotel_id가 박혀있는 경우만 (UUID null 인 자체영업은 호텔명 매칭으로 폴백)
  SELECT
    bs.hotel_id              AS resolved_hotel_id,
    bs.hotel_name            AS resolved_hotel_name,
    bs.hotel_country,
    bs.hotel_city,
    'self'::text             AS source,
    'hotel_id_direct'::text  AS match_method,
    bs.total_amount_usd      AS amount_usd,
    bs.commission_usd,
    bs.channel_code,
    bs.created_at::date      AS booked_at
  FROM bookings_self bs
  WHERE COALESCE(bs.payment_status, 'pending') NOT IN ('cancelled', 'refunded')
    AND bs.hotel_id IS NOT NULL

  UNION ALL

  -- self: hotel_id가 NULL인 자체영업은 hotel_name+city+country로 hotels 매칭 시도
  SELECT
    h.id                     AS resolved_hotel_id,
    h.hotel_name             AS resolved_hotel_name,
    bs.hotel_country,
    bs.hotel_city,
    'self'::text             AS source,
    'name_city_country'::text AS match_method,
    bs.total_amount_usd      AS amount_usd,
    bs.commission_usd,
    bs.channel_code,
    bs.created_at::date      AS booked_at
  FROM bookings_self bs
  INNER JOIN hotels h
    ON LOWER(TRIM(h.hotel_name)) = LOWER(TRIM(bs.hotel_name))
   AND COALESCE(LOWER(TRIM(h.address)), '') LIKE '%' || COALESCE(LOWER(TRIM(bs.hotel_city)), '') || '%'
  WHERE COALESCE(bs.payment_status, 'pending') NOT IN ('cancelled', 'refunded')
    AND bs.hotel_id IS NULL
    AND bs.hotel_name IS NOT NULL
    AND bs.hotel_city IS NOT NULL

  UNION ALL

  -- agoda: hotel_id(UUID)가 박혀있는 경우 (이미 매칭 완료)
  SELECT
    ba.hotel_id              AS resolved_hotel_id,
    ba.hotel_name            AS resolved_hotel_name,
    ba.hotel_country,
    ba.hotel_city,
    'agoda'::text            AS source,
    'hotel_id_direct'::text  AS match_method,
    COALESCE(ba.booking_amount_usd, 0)  AS amount_usd,
    ba.commission_usd,
    ba.channel_code,
    ba.booked_at
  FROM bookings_agoda ba
  WHERE COALESCE(ba.is_cancelled, FALSE) = FALSE
    AND ba.hotel_id IS NOT NULL

  UNION ALL

  -- agoda: hotel_id가 NULL이지만 hotel_id_agoda(TEXT)로 hotels.agoda_hotel_id 매칭
  SELECT
    h.id                     AS resolved_hotel_id,
    h.hotel_name             AS resolved_hotel_name,
    ba.hotel_country,
    ba.hotel_city,
    'agoda'::text            AS source,
    'agoda_hotel_id'::text   AS match_method,
    COALESCE(ba.booking_amount_usd, 0)  AS amount_usd,
    ba.commission_usd,
    ba.channel_code,
    ba.booked_at
  FROM bookings_agoda ba
  INNER JOIN hotels h ON h.agoda_hotel_id = ba.hotel_id_agoda
  WHERE COALESCE(ba.is_cancelled, FALSE) = FALSE
    AND ba.hotel_id IS NULL
    AND ba.hotel_id_agoda IS NOT NULL
),

-- ============================================================
-- 2) 매칭된 예약을 호텔 단위로 집계
-- ============================================================
hotel_aggregates AS (
  SELECT
    mb.resolved_hotel_id,
    COUNT(*)                                  AS total_bookings,
    COUNT(*) FILTER (WHERE mb.source='self')  AS self_bookings,
    COUNT(*) FILTER (WHERE mb.source='agoda') AS agoda_bookings,
    COALESCE(SUM(mb.amount_usd), 0)           AS total_revenue_usd,
    COALESCE(SUM(mb.amount_usd) FILTER (WHERE mb.source='self'), 0)  AS self_revenue_usd,
    COALESCE(SUM(mb.amount_usd) FILTER (WHERE mb.source='agoda'), 0) AS agoda_revenue_usd,
    COALESCE(SUM(mb.commission_usd), 0)       AS total_commission_usd,
    MIN(mb.booked_at)                         AS first_booking_date,
    MAX(mb.booked_at)                         AS last_booking_date,
    -- 매칭 방법 분포 (디버그/투명성)
    COUNT(DISTINCT mb.match_method)           AS match_method_count,
    STRING_AGG(DISTINCT mb.match_method, ',') AS match_methods,
    -- 채널 분포 (어떤 채널에서 가장 많이 나왔는지)
    STRING_AGG(DISTINCT mb.channel_code, ',') AS channels_active
  FROM matched_bookings mb
  WHERE mb.resolved_hotel_id IS NOT NULL
  GROUP BY mb.resolved_hotel_id
)

-- ============================================================
-- 3) hotels 마스터와 LEFT JOIN — 호텔 정보 + 누적 매출 + 3구간 라벨
-- ============================================================
SELECT
  h.id                                AS hotel_id,
  h.hotel_name,
  h.address,
  h.agoda_hotel_id,
  h.google_place_id,
  h.star_rating,
  h.review_score,
  h.image_url,
  h.status                            AS hotel_status,
  h.email                             AS manager_email,
  h.created_at                        AS hotel_created_at,

  -- 집계
  COALESCE(ha.total_bookings, 0)      AS total_bookings,
  COALESCE(ha.self_bookings, 0)       AS self_bookings,
  COALESCE(ha.agoda_bookings, 0)      AS agoda_bookings,
  COALESCE(ha.total_revenue_usd, 0)   AS total_revenue_usd,
  COALESCE(ha.self_revenue_usd, 0)    AS self_revenue_usd,
  COALESCE(ha.agoda_revenue_usd, 0)   AS agoda_revenue_usd,
  COALESCE(ha.total_commission_usd, 0) AS total_commission_usd,
  ha.first_booking_date,
  ha.last_booking_date,
  ha.match_methods,
  ha.channels_active,

  -- D-035 3구간 라벨
  CASE
    WHEN COALESCE(ha.total_revenue_usd, 0) >= 1000 THEN 'strong'
    WHEN COALESCE(ha.total_revenue_usd, 0) >= 200  THEN 'soft'
    ELSE 'hide'
  END AS revenue_tier,

  -- 사람 친화 라벨 (디버그/UI)
  CASE
    WHEN COALESCE(ha.total_revenue_usd, 0) >= 1000 THEN '강력 ($1,000+)'
    WHEN COALESCE(ha.total_revenue_usd, 0) >= 200  THEN '부드러움 ($200~999)'
    WHEN COALESCE(ha.total_revenue_usd, 0) > 0     THEN '숨김 (<$200)'
    ELSE '예약 없음 ($0)'
  END AS revenue_tier_label_ko

FROM hotels h
LEFT JOIN hotel_aggregates ha ON ha.resolved_hotel_id = h.id
ORDER BY COALESCE(ha.total_revenue_usd, 0) DESC, h.created_at DESC;

-- =============================================================================
-- 권한 설정 — service_role + authenticated 만 SELECT 가능
-- =============================================================================
-- (anon 차단: 우리만 보는 admin 영역)
-- VIEW는 SECURITY INVOKER 기본 → 호출자의 RLS가 hotels/bookings_* 에 적용
-- service_role(API서버)은 모든 행 조회 가능
-- authenticated 사용자가 직접 호출하지 못하도록 REVOKE 권장
-- =============================================================================
REVOKE ALL ON v_hotel_past_revenue FROM PUBLIC;
REVOKE ALL ON v_hotel_past_revenue FROM anon;
GRANT SELECT ON v_hotel_past_revenue TO service_role;
GRANT SELECT ON v_hotel_past_revenue TO authenticated;  -- API에서 admin 검증 후 service_key로 호출

COMMENT ON VIEW v_hotel_past_revenue IS
  'BL-PAST-VIDEO-RECON / D-035: 호텔별 우리 채널 누적 매출 집계. 매칭 키: hotel_id(UUID) → agoda_hotel_id → name+city+country. 3구간 라벨 strong/soft/hide ($1000/$200 임계값). 우리만 보는 admin 전용.';
