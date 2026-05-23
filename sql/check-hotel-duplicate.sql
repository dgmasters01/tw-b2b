-- [BL-FLOW-1-AGODA-AUTO-APPROVE 2026-05-23]
-- 중복 호텔 차단 RPC 함수
--
-- 목적: 매니저가 호텔 등록할 때, 같은 Agoda hotel_id 또는 google_place_id로
--      이미 다른 매니저가 "paid / approved / campaign_live" 상태로 등록한 호텔이 있으면
--      중복 차단. (대표님 인계서 Step 2 — 다른 매니저가 이미 결제한 호텔 중복 결제 방지)
--
-- RLS 우회 이유: hotels_select_own_or_admin 정책이 user_id = auth.uid() 만 허용해서
--             매니저는 자기 호텔 외 검색 불가. SECURITY DEFINER로 정의자 권한 부여.
--             단, 반환 값은 boolean + 호텔명만 → PII 노출 없음.
--
-- 반환 형식:
--   { duplicate: false }                           = 중복 없음 (정상 등록 진행)
--   { duplicate: true, blocking_status: 'paid', existing_hotel_name: '...' }
--                                                 = 차단 (이미 다른 매니저가 결제한 호텔)

DROP FUNCTION IF EXISTS check_hotel_duplicate(text, text);
DROP FUNCTION IF EXISTS check_hotel_duplicate(bigint, text);

CREATE OR REPLACE FUNCTION check_hotel_duplicate(
  p_agoda_hotel_id bigint DEFAULT NULL,
  p_google_place_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_uid uuid;
BEGIN
  -- 입력 검증: 둘 다 NULL이면 검색 불가능
  IF p_agoda_hotel_id IS NULL AND p_google_place_id IS NULL THEN
    RETURN jsonb_build_object('duplicate', false);
  END IF;

  v_uid := auth.uid();

  -- 차단 대상 status: paid, approved, campaign_live
  -- (pending/review/rejected/manual_pending은 차단 안 함 — 그냥 대기 상태이므로 다른 매니저가 다시 등록 가능)
  SELECT id, hotel_name, status, user_id
    INTO v_row
    FROM hotels
   WHERE status IN ('paid', 'approved', 'campaign_live', 'producing', 'published')
     AND user_id IS DISTINCT FROM v_uid          -- 자기 호텔은 차단 대상 아님
     AND (
       (p_agoda_hotel_id IS NOT NULL AND agoda_hotel_id = p_agoda_hotel_id)
       OR
       (p_google_place_id IS NOT NULL AND google_place_id = p_google_place_id)
     )
   ORDER BY created_at ASC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('duplicate', false);
  END IF;

  RETURN jsonb_build_object(
    'duplicate', true,
    'blocking_status', v_row.status,
    'existing_hotel_name', v_row.hotel_name
  );
END;
$$;

-- 모든 authenticated 사용자에게 실행 권한
REVOKE ALL ON FUNCTION check_hotel_duplicate(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_hotel_duplicate(bigint, text) TO authenticated;

-- 함수 코멘트
COMMENT ON FUNCTION check_hotel_duplicate(bigint, text) IS
  'BL-FLOW-1-AGODA-AUTO-APPROVE: 호텔 등록 전 중복 차단. SECURITY DEFINER로 RLS 우회. paid/approved/campaign_live/producing/published 상태의 다른 매니저 호텔만 차단. 반환: { duplicate, blocking_status?, existing_hotel_name? }';
