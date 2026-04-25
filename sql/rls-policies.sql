-- =============================================================================
-- TW B2B - Row Level Security (RLS) 정책
-- =============================================================================
-- 목적: 매니저가 자기 호텔 데이터만 보고/수정할 수 있도록 DB 차원에서 보안 강화
-- 적용 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체 복사 → Run
-- =============================================================================

-- 1. is_admin() 함수 확인 (이미 있어야 함)
-- dgmasters01@gmail.com 이 관리자인지 판별

-- 2. 모든 테이블에 RLS 활성화
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HOTELS 테이블 정책
-- =============================================================================
-- 기존 정책 삭제 (재실행 가능하게)
DROP POLICY IF EXISTS "hotels_select_own_or_admin" ON hotels;
DROP POLICY IF EXISTS "hotels_insert_own" ON hotels;
DROP POLICY IF EXISTS "hotels_update_own_or_admin" ON hotels;
DROP POLICY IF EXISTS "hotels_delete_admin_only" ON hotels;

-- 조회: 본인 호텔 또는 관리자
CREATE POLICY "hotels_select_own_or_admin" ON hotels
  FOR SELECT USING (
    manager_email = auth.email() OR is_admin()
  );

-- 등록: 본인 이메일로만 가능
CREATE POLICY "hotels_insert_own" ON hotels
  FOR INSERT WITH CHECK (
    manager_email = auth.email()
  );

-- 수정: 본인 호텔 또는 관리자
CREATE POLICY "hotels_update_own_or_admin" ON hotels
  FOR UPDATE USING (
    manager_email = auth.email() OR is_admin()
  );

-- 삭제: 관리자만
CREATE POLICY "hotels_delete_admin_only" ON hotels
  FOR DELETE USING (is_admin());

-- =============================================================================
-- PAYMENTS 테이블 정책
-- =============================================================================
DROP POLICY IF EXISTS "payments_select_own_or_admin" ON payments;
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
DROP POLICY IF EXISTS "payments_update_admin_only" ON payments;

CREATE POLICY "payments_select_own_or_admin" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = payments.hotel_id 
      AND (h.manager_email = auth.email() OR is_admin())
    )
  );

CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = payments.hotel_id 
      AND h.manager_email = auth.email()
    )
  );

-- 결제 기록은 수정 불가 (관리자만 - 환불 시)
CREATE POLICY "payments_update_admin_only" ON payments
  FOR UPDATE USING (is_admin());

-- =============================================================================
-- VIDEOS 테이블 정책
-- =============================================================================
DROP POLICY IF EXISTS "videos_select_own_or_admin" ON videos;
DROP POLICY IF EXISTS "videos_insert_admin_only" ON videos;
DROP POLICY IF EXISTS "videos_update_admin_only" ON videos;

CREATE POLICY "videos_select_own_or_admin" ON videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = videos.hotel_id 
      AND (h.manager_email = auth.email() OR is_admin())
    )
  );

-- 영상 등록은 관리자만 (TW가 제작해서 등록)
CREATE POLICY "videos_insert_admin_only" ON videos
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "videos_update_admin_only" ON videos
  FOR UPDATE USING (is_admin());

-- =============================================================================
-- BOOKINGS 테이블 정책 (예약 추적 데이터)
-- =============================================================================
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_system" ON bookings;

CREATE POLICY "bookings_select_own_or_admin" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = bookings.hotel_id 
      AND (h.manager_email = auth.email() OR is_admin())
    )
  );

-- 예약 데이터는 시스템(관리자)이 등록
CREATE POLICY "bookings_insert_system" ON bookings
  FOR INSERT WITH CHECK (is_admin());

-- =============================================================================
-- HOTEL_STATUS_HISTORY 테이블 정책 (감사 로그)
-- =============================================================================
DROP POLICY IF EXISTS "history_select_own_or_admin" ON hotel_status_history;
DROP POLICY IF EXISTS "history_insert_authenticated" ON hotel_status_history;

CREATE POLICY "history_select_own_or_admin" ON hotel_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = hotel_status_history.hotel_id 
      AND (h.manager_email = auth.email() OR is_admin())
    )
  );

-- 트리거가 자동 생성하므로 인증된 사용자 모두 INSERT 가능
CREATE POLICY "history_insert_authenticated" ON hotel_status_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- ADMIN_NOTES 테이블 정책 (관리자 메모)
-- =============================================================================
DROP POLICY IF EXISTS "notes_admin_only" ON admin_notes;

-- 관리자 메모는 관리자만 읽기/쓰기 가능
CREATE POLICY "notes_admin_only" ON admin_notes
  FOR ALL USING (is_admin());

-- =============================================================================
-- 검증 쿼리 (실행 후 확인용)
-- =============================================================================
-- 모든 테이블 RLS 활성화 상태 확인
SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('hotels', 'payments', 'videos', 'bookings', 'hotel_status_history', 'admin_notes')
ORDER BY tablename;

-- 모든 정책 목록 확인
SELECT 
  tablename, 
  policyname, 
  cmd AS operation
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
