-- BL-HOTEL-DETAIL-PAGE — 2026-05-26
-- hotel_communications 테이블 + RLS
-- 호텔별 커뮤니케이션 타임라인 (메모/메일 송수신/status 변경/1:1 문의)
-- Management API 자동 실행됨 — 재실행 안전 (IF NOT EXISTS / DROP POLICY IF EXISTS)

CREATE TABLE IF NOT EXISTS public.hotel_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('memo','email_out','email_in','status_change','inquiry')),
  direction TEXT CHECK (direction IS NULL OR direction IN ('inbound','outbound')),
  subject TEXT,
  content TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_comm_hotel_created
  ON public.hotel_communications(hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hotel_comm_type
  ON public.hotel_communications(type);

ALTER TABLE public.hotel_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hc_admin_all ON public.hotel_communications;
DROP POLICY IF EXISTS hc_manager_select_own ON public.hotel_communications;

-- 관리자: 전부 가능
CREATE POLICY hc_admin_all ON public.hotel_communications
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 매니저: 자신 소유 호텔의 커뮤니케이션만 SELECT
CREATE POLICY hc_manager_select_own ON public.hotel_communications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = hotel_communications.hotel_id
        AND h.user_id = auth.uid()
    )
  );
