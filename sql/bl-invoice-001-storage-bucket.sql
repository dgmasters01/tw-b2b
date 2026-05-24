-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-001 단계 5 — 'invoices' 버킷 (인보이스 PDF 저장)
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-25
-- 단일 진실원: _os/playbook/invoice-system.md (PDF storage 섹션)
-- 선결 의존: bl-invoice-001-schema.sql (invoices.pdf_storage_path 컬럼)
--
-- 목적:
--   /api/invoice?action=pdf 가 생성한 PDF를 저장하는 단일 버킷.
--   파일 경로: 'YYYY/INV-XX-YYYY-NNNN.pdf'
--   예: '2026/INV-KR-2026-0001.pdf'
--
-- 정책:
--   버킷명:      'invoices'
--   public:      false (private — signed URL 1h 방식)
--   업로드:      service_role only (/api/invoice 핸들러 경유)
--   조회 (SELECT):
--     - service_role (signed URL 발급용)
--     - admin (owner/admin/staff) — 모든 인보이스 PDF 조회 가능
--     - 본인 매니저 — invoices.user_id === auth.uid() 인 PDF만 조회 가능
--   크기 제한:   5 MB (인보이스 PDF는 보통 50~300KB, 안전 마진)
--   허용 MIME:   application/pdf
--
-- ⚠️ invoice-assets 버킷 (도장·서명, BL-INVOICE-003 단계 4)과는 별개 버킷.
--    invoice-assets = 자산 (이미지, admin이 한 번 박는 것)
--    invoices       = 결과물 (PDF, 인보이스 발행할 때마다 생성)
--
-- 실행 위치: Supabase Management API (Claude 자동 실행, 헌법 부칙)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 버킷 신설 (idempotent)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,                            -- private
  5242880,                          -- 5 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. RLS 정책 — storage.objects 에 박음
-- ────────────────────────────────────────────────────────────────────────────
-- 기존 invoices 관련 정책 모두 제거 (재실행 안전)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polname LIKE 'invoices_pdf_%'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(p.polname) || ' ON storage.objects';
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 정책 1: SELECT — admin (owner/admin/staff) 전부 허용
-- ────────────────────────────────────────────────────────────────────────────
-- /api/invoice 가 service_role 키로 signed URL을 발급하므로 RLS 검사 안 거치지만,
-- 추후 클라이언트 직접 다운로드 시나리오를 위해 정책도 명시 박음.
CREATE POLICY invoices_pdf_select_admin
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND public.is_admin(auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 정책 2: SELECT — 매니저 본인의 인보이스 PDF만
-- ────────────────────────────────────────────────────────────────────────────
-- storage.objects.name 은 'YYYY/INV-XX-YYYY-NNNN.pdf' 형식.
-- 파일명에서 .pdf 확장자 제거 → invoice_number 추출 → invoices 테이블에서 user_id 매칭.
CREATE POLICY invoices_pdf_select_own_manager
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.invoice_number = regexp_replace(
        split_part(storage.objects.name, '/', 2),  -- 'INV-XX-YYYY-NNNN.pdf'
        '\.pdf$', ''                                -- 'INV-XX-YYYY-NNNN'
      )
      AND i.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 정책 3, 4: INSERT/UPDATE/DELETE — service_role only (정책 안 박음)
-- ────────────────────────────────────────────────────────────────────────────
-- /api/invoice 가 service_role 키로 우회. authenticated INSERT는 RLS에 막힘 (정상 동작).
-- 별도 정책 박지 않음.

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 검증
-- ────────────────────────────────────────────────────────────────────────────
SELECT 'CHECK_BUCKET' AS step,
       id, name, public, file_size_limit, allowed_mime_types
  FROM storage.buckets
  WHERE id = 'invoices';

SELECT 'CHECK_POLICIES' AS step, polname
  FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass
    AND polname LIKE 'invoices_pdf_%'
  ORDER BY polname;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. 다음 단계 안내
-- ────────────────────────────────────────────────────────────────────────────
-- 1) POST /api/invoice?action=issue  → 인보이스 생성 (단계 4 완료)
-- 2) GET  /api/invoice?action=pdf&id=<uuid>  → PDF 생성 → 이 버킷에 박힘 → signed URL 반환
-- 3) GET  /api/invoice?action=get&id=<uuid>  → 메타 조회 + 기존 signed URL 반환
-- 4) 단계 6+: admin UI에서 인보이스 발행/PDF 미리보기/다운로드 박힘
-- ════════════════════════════════════════════════════════════════════════════
