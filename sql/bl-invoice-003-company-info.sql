-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-003 (1/3) — company_info 마스터 테이블
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-24
-- 단일 진실원: _os/playbook/invoice-system.md (4. BL-INVOICE-003)
-- 결정: D-047 (BL-INVOICE-001 핑퐁 라운드 6·15)
-- 헌법: 부칙 4 (권한 분리) / 부칙 9 (가역성, 이중 백업)
--
-- 목적:
--   인보이스/영수증 PDF에 박힐 회사 정보를 코드 하드코딩 없이 admin에서 수정 가능하게.
--   BL-INVOICE-001(PDF 발행) 선결 의존성.
--
-- 단일 행 정책:
--   id=1 (singleton, CHECK 제약) — 한국법인 "여행능력자들" 단일 발행 주체.
--   베트남 법인은 인보이스 시스템에서 완전 배제 (invoice-system.md 2.1).
--
-- 권한:
--   SELECT: admin/staff/readonly + 본인이 로그인한 매니저 (인보이스 PDF 표시용)
--   UPDATE: owner only (is_owner())
--   INSERT/DELETE: 차단 (singleton 보호)
--
-- 실행 위치: Supabase Dashboard → SQL Editor (또는 Management API)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 0. 사전 백업 (부칙 9 — 가역성)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='company_info') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public._company_info_backup_20260524 AS
             SELECT *, now() AS _backed_up_at FROM public.company_info';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. company_info 테이블 (singleton)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_info (
  id                 INT          PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_entity_en    TEXT         NOT NULL DEFAULT 'TravelWinners Co., Ltd.',
  legal_entity_ko    TEXT         NOT NULL DEFAULT '주식회사 여행능력자들',
  business_number    TEXT         NOT NULL DEFAULT '',           -- 사업자등록번호 (000-00-00000)
  ceo_name_en        TEXT         NOT NULL DEFAULT 'Lee Ji-hyung',
  ceo_name_ko        TEXT         NOT NULL DEFAULT '이지형',
  address_en         TEXT         NOT NULL DEFAULT '',
  address_ko         TEXT         NOT NULL DEFAULT '',
  business_type      TEXT         NOT NULL DEFAULT '서비스',    -- 업태
  business_item      TEXT         NOT NULL DEFAULT '여행, 광고',-- 종목
  contact_email      TEXT         NOT NULL DEFAULT 'partners@gohotelwinners.com',
  contact_phone      TEXT         NOT NULL DEFAULT '',
  stamp_storage_path TEXT,                                       -- Supabase Storage path (e.g. 'stamp.png')
  signature_storage_path TEXT,                                   -- Supabase Storage path (e.g. 'signature.png')
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by         UUID,                                       -- auth.users.id (마지막 수정자)
  updated_by_email   TEXT
);

COMMENT ON TABLE public.company_info IS
  'BL-INVOICE-003: 인보이스 발행 주체(한국법인 여행능력자들) 정보 단일 진실원. singleton (id=1).';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. 초기 데이터 (id=1 단일 행 박기)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.company_info (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. updated_at 자동 갱신 트리거
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.company_info_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_info_touch ON public.company_info;
CREATE TRIGGER trg_company_info_touch
  BEFORE UPDATE ON public.company_info
  FOR EACH ROW
  EXECUTE FUNCTION public.company_info_touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS 정책 — owner 단독 수정, admin/staff/readonly 조회만
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 제거 (재실행 안전)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.company_info'::regclass
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(p.polname) || ' ON public.company_info';
  END LOOP;
END $$;

-- 정책 1: admin (owner/admin/staff) 조회 — 인보이스 PDF 표시용
CREATE POLICY company_info_select_admin
  ON public.company_info
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 정책 2: 로그인한 모든 매니저도 조회 가능 (인보이스 PDF 표시용 — 자기 인보이스 보려면 회사 정보 필요)
-- ※ admins 테이블에 행이 없는 일반 매니저(hotels)도 인보이스 다운로드 시 필요.
CREATE POLICY company_info_select_manager
  ON public.company_info
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.hotels WHERE user_id = auth.uid())
  );

-- 정책 3: owner only UPDATE
CREATE POLICY company_info_update_owner
  ON public.company_info
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

-- INSERT/DELETE는 정책 없음 = service_role만 가능 (singleton 보호)

-- 권한
GRANT SELECT, UPDATE ON public.company_info TO authenticated;
GRANT ALL ON public.company_info TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. 검증
-- ────────────────────────────────────────────────────────────────────────────
SELECT 'CHECK_COMPANY_INFO' AS step,
       count(*) AS rows,
       (SELECT legal_entity_ko FROM public.company_info WHERE id=1) AS default_entity;

SELECT 'CHECK_POLICIES' AS step, polname
  FROM pg_policy
  WHERE polrelid = 'public.company_info'::regclass
  ORDER BY polname;
