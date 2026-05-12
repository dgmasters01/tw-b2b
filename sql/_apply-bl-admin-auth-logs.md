# BL-ADMIN-AUTH (D-026) — 로그 시스템 SQL 적용 가이드

## 적용 방법 (대표님이 1번만 실행)

1. Supabase Dashboard 접속 → SQL Editor → New Query
   - URL: https://supabase.com/dashboard/project/vjsludfjsphwnumuoqaj/sql/new
2. `sql/admin-auth-logs.sql` 파일 전체 복사해서 붙여넣기
3. RUN 클릭 (10초 이내 완료)

## 멱등성 보장

다음 패턴으로 박혀있어 여러 번 실행해도 안전:
- `CREATE TABLE IF NOT EXISTS`
- `DROP POLICY IF EXISTS` 후 `CREATE POLICY`
- `CREATE OR REPLACE VIEW`
- `CREATE INDEX IF NOT EXISTS`

## 적용 후 확인 (Dashboard에서 자동)

- `public.access_logs` 테이블 생성됨
- `public.action_logs` 테이블 생성됨
- `public.recent_admin_activity` 뷰 생성됨
- 두 테이블 모두 RLS 활성화됨 (owner/admin/staff만 SELECT)

## 적용 후 자동 동작

- admin 페이지 진입 시 `access_logs`에 자동 박힘 (Phase 2)
- 호텔 승인/거절/삭제 등 중요 액션 시 `action_logs`에 자동 박힘 (Phase 3)
- admin-status 페이지 하단 "📜 최근 활동" 박스에 시간순 표시 (Phase 4)
