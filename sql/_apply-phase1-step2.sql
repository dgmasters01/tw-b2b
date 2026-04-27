-- =============================================================================
-- TW B2B - Phase 1 Step 2: 통합 실행 마스터 SQL
-- =============================================================================
-- 실행 위치: Supabase Dashboard → SQL Editor → 전체 붙여넣기 → RUN
-- 멱등성 보장: 여러 번 실행해도 안전 (CREATE TABLE IF NOT EXISTS, ON CONFLICT 등)
--
-- 실행 순서:
--   1. 00-helpers.sql        (is_admin 함수 정의)
--   2. 02-channels.sql       (channels 마스터 + 6개 채널 시드)
--   3. 03-bookings-self.sql  (자체 영업 예약)
--   4. 04-bookings-agoda.sql (아고다 채널 예약)
--   5. 05-bookings-unified-view.sql (통합 분석 VIEW + 채널 통계 VIEW)
-- =============================================================================
-- 안전: 기존 hotels/bookings/payments 등은 건드리지 않음.
-- =============================================================================

\echo '== Step 1/5: helpers (is_admin function)'
\i 00-helpers.sql

\echo '== Step 2/5: channels table + seed data'
\i 02-channels.sql

\echo '== Step 3/5: bookings_self table'
\i 03-bookings-self.sql

\echo '== Step 4/5: bookings_agoda table'
\i 04-bookings-agoda.sql

\echo '== Step 5/5: bookings_unified + v_channel_stats views'
\i 05-bookings-unified-view.sql

\echo '== Phase 1 Step 2 schema applied successfully.'
