-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-003 단계 4 — 도장·서명 이미지 Storage 버킷
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-24
-- 단일 진실원: _os/playbook/invoice-system.md (stamp_and_signature 섹션)
-- 결정: D-047
--
-- 목적:
--   인보이스 PDF에 박힐 도장 이미지·대표님 서명 이미지의 단일 보관소.
--   company_info.stamp_storage_path / signature_storage_path 가 이 버킷의 path 참조.
--
-- 정책:
--   버킷명:      'invoice-assets'
--   public:      false (서명 URL 방식으로만 노출)
--   업로드:      service_role only (API 핸들러 handleInvoiceUploadAsset 경유)
--   조회:        service_role + authenticated owner/admin/staff (PDF 발행용)
--   크기 제한:   2 MB
--   허용 MIME:   image/png, image/jpeg, image/webp
--
-- 폴더 구조:
--   stamp/stamp-YYYY-MM-DDTHH-mm-ss-SSSZ.{png,jpg,webp}
--   signature/signature-YYYY-MM-DDTHH-mm-ss-SSSZ.{png,jpg,webp}
--
-- 실행 위치: Supabase Dashboard → SQL Editor
--           (Storage UI에서 버킷을 직접 만드는 대신 SQL로 명시 박는 게 정석)
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 버킷 신설 (idempotent)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-assets',
  'invoice-assets',
  false,                                                          -- private
  2097152,                                                        -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. RLS 정책 — storage.objects 테이블에 박음
-- ────────────────────────────────────────────────────────────────────────────
-- 기존 invoice-assets 관련 정책 모두 제거 (재실행 안전)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polname LIKE 'invoice_assets_%'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(p.polname) || ' ON storage.objects';
  END LOOP;
END $$;

-- 정책 1: SELECT (조회) — admin (owner/admin/staff) 전부 허용
-- 인보이스 PDF 발행 시 모든 admin이 도장·서명을 활용해야 함
CREATE POLICY invoice_assets_select_admin
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoice-assets'
    AND public.is_admin(auth.uid())
  );

-- 정책 2: INSERT (업로드) — 명시적으로 차단 (API service_role only)
-- 클라이언트가 직접 업로드 못 함. handleInvoiceUploadAsset이 service_role로 우회.
-- 정책 자체를 안 박으면 authenticated INSERT는 RLS에 막힘 (정상 동작).
-- → 별도 INSERT 정책 박지 않음.

-- 정책 3: DELETE — service_role only (위와 동일 이유, 정책 안 박음)
-- 정책 4: UPDATE — service_role only (위와 동일 이유, 정책 안 박음)

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 검증
-- ────────────────────────────────────────────────────────────────────────────
SELECT 'CHECK_BUCKET' AS step,
       id, name, public, file_size_limit, allowed_mime_types
  FROM storage.buckets
  WHERE id = 'invoice-assets';

SELECT 'CHECK_POLICIES' AS step, polname
  FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass
    AND polname LIKE 'invoice_assets_%'
  ORDER BY polname;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. 다음 단계 안내
-- ────────────────────────────────────────────────────────────────────────────
-- 1) admin-settings.html → 도장·서명 탭에서 owner가 이미지 업로드
-- 2) API: POST /api/admin?action=invoice-upload-asset
--    body: { asset_kind: 'stamp'|'signature', data_url: 'data:image/png;base64,...' }
-- 3) 업로드 성공 시 company_info.stamp_storage_path / signature_storage_path 자동 갱신
-- 4) 인보이스 PDF 발행 시 path → 서명 URL(1h) → PDF 우하단 박힘 (BL-INVOICE-001)
-- ════════════════════════════════════════════════════════════════════════════
