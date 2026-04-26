-- =============================================================================
-- TW B2B - Row Level Security (RLS) 정책 v2 (실제 스키마 반영)
-- =============================================================================
-- 매니저 본인 데이터만 접근 가능, 관리자(dgmasters01@gmail.com)는 전체 접근
-- 식별 기준: hotels.user_id = auth.uid()  (Supabase Auth UUID)
-- =============================================================================

-- 모든 테이블 RLS 활성화
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- HOTELS 테이블
DROP POLICY IF EXISTS "hotels_select_own_or_admin" ON hotels;
DROP POLICY IF EXISTS "hotels_insert_own" ON hotels;
DROP POLICY IF EXISTS "hotels_update_own_or_admin" ON hotels;
DROP POLICY IF EXISTS "hotels_delete_admin_only" ON hotels;

CREATE POLICY "hotels_select_own_or_admin" ON hotels
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "hotels_insert_own" ON hotels
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "hotels_update_own_or_admin" ON hotels
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "hotels_delete_admin_only" ON hotels
  FOR DELETE USING (is_admin());

-- PAYMENTS 테이블
DROP POLICY IF EXISTS "payments_select_own_or_admin" ON payments;
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
DROP POLICY IF EXISTS "payments_update_admin_only" ON payments;

CREATE POLICY "payments_select_own_or_admin" ON payments
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_update_admin_only" ON payments
  FOR UPDATE USING (is_admin());

-- VIDEOS 테이블 (hotel_id 통해 소유자 확인)
DROP POLICY IF EXISTS "videos_select_own_or_admin" ON videos;
DROP POLICY IF EXISTS "videos_insert_admin_only" ON videos;
DROP POLICY IF EXISTS "videos_update_admin_only" ON videos;

CREATE POLICY "videos_select_own_or_admin" ON videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = videos.hotel_id 
      AND (h.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "videos_insert_admin_only" ON videos
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "videos_update_admin_only" ON videos
  FOR UPDATE USING (is_admin());

-- BOOKINGS 테이블
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_system" ON bookings;

CREATE POLICY "bookings_select_own_or_admin" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = bookings.hotel_id 
      AND (h.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "bookings_insert_system" ON bookings
  FOR INSERT WITH CHECK (is_admin());

-- HOTEL_STATUS_HISTORY 테이블
DROP POLICY IF EXISTS "history_select_own_or_admin" ON hotel_status_history;
DROP POLICY IF EXISTS "history_insert_authenticated" ON hotel_status_history;

CREATE POLICY "history_select_own_or_admin" ON hotel_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels h 
      WHERE h.id = hotel_status_history.hotel_id 
      AND (h.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "history_insert_authenticated" ON hotel_status_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ADMIN_NOTES 테이블 (관리자 전용)
DROP POLICY IF EXISTS "notes_admin_only" ON admin_notes;

CREATE POLICY "notes_admin_only" ON admin_notes
  FOR ALL USING (is_admin());
