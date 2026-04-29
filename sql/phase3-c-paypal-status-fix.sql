-- ============================================================================
-- Phase 3 Step C — Hotfix: 트리거 status 매핑 수정
-- ============================================================================
-- 배경:
--   payments_status_check CHECK 제약: status IN ('pending','succeeded','failed','refunded','canceled')
--   기존 트리거 sync_hotel_paid_status: NEW.status = 'completed' 체크 → 절대 발동 안 함
--   결과: 결제 성공해도 hotels.status가 'paid'로 자동 변경 안 됨
--
-- 수정:
--   트리거 조건을 'completed' → 'succeeded'로 변경하여 DB 제약과 일치시킴
--
-- 적용일: 2026-04-29
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_hotel_paid_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 결제 성공 상태에서만 동작 (DB 제약: pending/succeeded/failed/refunded/canceled)
  IF NEW.status = 'succeeded' AND NEW.hotel_id IS NOT NULL THEN
    UPDATE public.hotels
    SET status = 'paid'
    WHERE id = NEW.hotel_id
      AND status IN ('approved', 'pending', 'review'); -- producing/published 다운그레이드 방지
  END IF;
  RETURN NEW;
END;
$function$;

-- 검증 쿼리 (수동 실행 권장)
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'sync_hotel_paid_status';
