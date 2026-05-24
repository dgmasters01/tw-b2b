-- ════════════════════════════════════════════════════════════════════════════
-- BL-INVOICE-003 단계 6 — owner-only RLS 정책 자가 검증
-- ════════════════════════════════════════════════════════════════════════════
-- 작성: 2026-05-24
-- 목적: 단계 1·4에서 박은 모든 RLS 정책이 의도대로 작동하는지 한 번에 검증.
--
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 결과: 6개 섹션의 검증 표가 출력됨. 모든 EXPECTED 값이 ACTUAL과 일치해야 OK.
--
-- ⚠️ 이 SQL은 service_role(SQL Editor 기본 권한)으로 실행되므로 RLS를 우회하여
--    pg_policy / has_table_privilege 등으로 "정책 자체가 박혀있는지"를 점검한다.
--    실제 staff/manager 토큰으로 fetch 한 결과는 라이브 API 호출로 별도 검증.
-- ════════════════════════════════════════════════════════════════════════════

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 1. company_info — RLS 정책 박혀있는지                                      │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
  '[1/6] company_info RLS' AS section,
  polname,
  polcmd,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS cmd_label
FROM pg_policy
WHERE polrelid = 'public.company_info'::regclass
ORDER BY polname;
-- EXPECTED: 최소 2개 정책 (SELECT admin + UPDATE owner)

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 2. payment_accounts — RLS 정책 박혀있는지                                  │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
  '[2/6] payment_accounts RLS' AS section,
  polname,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'w' THEN 'UPDATE'
    WHEN '*' THEN 'ALL'
  END AS cmd_label
FROM pg_policy
WHERE polrelid = 'public.payment_accounts'::regclass
ORDER BY polname;
-- EXPECTED: 3개 정책 (payment_accounts_select_admin, payment_accounts_select_manager, payment_accounts_update_owner)

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 3. action_logs — invoice-settings 분리 정책                                 │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
  '[3/6] action_logs invoice-settings 분리' AS section,
  polname
FROM pg_policy
WHERE polrelid = 'public.action_logs'::regclass
  AND polname IN ('action_logs_select_admin_non_invoice', 'action_logs_select_invoice_owner')
ORDER BY polname;
-- EXPECTED: 정확히 2개 정책 (위 2개)
-- 안 보이면: sql/bl-invoice-003-audit-helper.sql 재실행

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 4. Storage 'invoice-assets' 버킷                                           │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
  '[4/6] invoice-assets bucket' AS section,
  id, name, public::TEXT, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'invoice-assets';
-- EXPECTED: 1행 (public=false, file_size_limit=2097152, mime 3종)
-- 안 보이면: sql/bl-invoice-003-storage-bucket.sql 실행 필요

SELECT
  '[4b/6] invoice-assets RLS' AS section,
  polname
FROM pg_policy
WHERE polrelid = 'storage.objects'::regclass
  AND polname LIKE 'invoice_assets_%'
ORDER BY polname;
-- EXPECTED: 최소 1개 (invoice_assets_select_admin)

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 5. log_invoice_settings_change RPC 함수                                    │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
  '[5/6] log_invoice_settings_change function' AS section,
  proname,
  pg_get_function_identity_arguments(oid) AS args,
  prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'log_invoice_settings_change';
-- EXPECTED: 1행 (security_definer=true, args 8개)

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 6. is_owner / is_admin 헬퍼 함수 존재 확인                                  │
-- └──────────────────────────────────────────────────────────────────────────┘
SELECT
  '[6/6] role helper functions' AS section,
  proname,
  prosecdef AS security_definer
FROM pg_proc
WHERE proname IN ('is_owner', 'is_admin')
ORDER BY proname;
-- EXPECTED: 2행 (is_admin, is_owner), 둘 다 security_definer=true

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 7. (참고) 가상 시뮬레이션 — staff 토큰에서 UPDATE 차단 검증                  │
-- └──────────────────────────────────────────────────────────────────────────┘
-- 본 쿼리는 service_role에서는 항상 통과하므로, 실제 staff 검증은
-- 라이브 API로 수행해야 한다. 다만 정책 USING/WITH CHECK 절은 출력 가능:

SELECT
  '[7/7] company_info_update_owner CHECK 조건' AS section,
  polname,
  pg_get_expr(polqual, polrelid) AS using_expr,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.company_info'::regclass
  AND polcmd = 'w'  -- UPDATE
ORDER BY polname;
-- EXPECTED: USING + WITH CHECK 모두 is_owner(auth.uid()) 형식

-- ════════════════════════════════════════════════════════════════════════════
-- 검증 결과 해석 가이드
-- ════════════════════════════════════════════════════════════════════════════
-- ✅ 1~6번 섹션이 모두 EXPECTED 통과 → RLS 정책 정상
-- ❌ 어느 섹션이 빈 결과 / EXPECTED 미달:
--    - 섹션 1: sql/bl-invoice-003-company-info.sql 재실행
--    - 섹션 2: sql/bl-invoice-003-payment-accounts.sql 재실행
--    - 섹션 3: sql/bl-invoice-003-audit-helper.sql 재실행
--    - 섹션 4: sql/bl-invoice-003-storage-bucket.sql 재실행 (도장·서명 작동 조건)
--    - 섹션 5: audit-helper.sql 재실행
--    - 섹션 6: 기존 헬퍼 함수가 없음 → admin-auth-v2 SQL 점검 필요
--
-- 추가 라이브 검증 (선택):
--   1) staff 계정으로 로그인 → /_admin/admin-settings.html 진입
--      → "owner 권한만 접근 가능합니다" 안내 표시되어야 함 (UI 가드)
--   2) staff Bearer 토큰으로 curl:
--      curl -H "Authorization: Bearer <STAFF_TOKEN>" \
--           https://gohotelwinners.com/api/admin?action=invoice-update-company-info \
--           -X POST -H "Content-Type: application/json" -d '{"changes":{"ceo_name_ko":"X"}}'
--      → 403 owner_only 반환되어야 함 (API 가드)
--   3) staff 토큰으로 invoice-get-audit-log:
--      → 403 owner_only 반환되어야 함 (이중 가드)
-- ════════════════════════════════════════════════════════════════════════════
