-- =============================================================================
-- TW B2B - Phase 1 Step 2-3: channels (채널 마스터 테이블)
-- =============================================================================
-- 목적: 50채널 확장 가능한 채널 레지스트리
-- CH 코드 (2자 약어) 기반으로 모든 예약 데이터를 채널 단위로 분류
-- =============================================================================

CREATE TABLE IF NOT EXISTS channels (
  -- 식별
  code        TEXT PRIMARY KEY,                  -- TW, HT, KT, TC, JP, ZH 등 2자 약어
  name        TEXT NOT NULL,                     -- 채널 표시명 (예: 여행능력자들)
  name_en     TEXT,                              -- 영문명 (예: TRAVELWINNERS)

  -- 분류
  language    TEXT NOT NULL,                     -- ko, en, ja, zh-tw, zh-cn, vi 등
  platform    TEXT,                              -- youtube, tiktok, instagram, blog 등 (확장 대비)

  -- 아고다 연동
  has_agoda_api BOOLEAN DEFAULT FALSE,           -- 아고다 API 키 보유 여부
  agoda_site_id TEXT,                            -- 아고다 가입 사이트 ID (있을 시)

  -- 운영 상태
  is_active   BOOLEAN DEFAULT TRUE,              -- 비활성화 시 통계 제외
  display_order INTEGER DEFAULT 999,             -- 대시보드 표시 순서

  -- 메타
  notes       TEXT,                              -- 메모 (운영자 전용)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_channels_lang   ON channels(language);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_channels_updated_at ON channels;
CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 초기 데이터: 현재 운영 중인 6개 채널 시드
-- =============================================================================
INSERT INTO channels (code, name, name_en, language, platform, has_agoda_api, is_active, display_order)
VALUES
  ('TW', '여행능력자들',  'TRAVELWINNERS',         'ko',    'youtube', TRUE,  TRUE, 1),
  ('HT', '호텔이야',      'HOTEL-IYA',             'ko',    'youtube', FALSE, TRUE, 2),
  ('KT', 'Kotel',        'Kotel',                  'en',    'youtube', FALSE, TRUE, 3),
  ('TC', '호텔닷컴',      'Hotel-com (Trip.com)',  'ko',    'youtube', FALSE, TRUE, 4),
  ('JP', 'ホテルだ',      'HOTEL-DA',              'ja',    'youtube', FALSE, TRUE, 5),
  ('ZH', '世界就是家',    'World-is-Home',          'zh-tw', 'youtube', FALSE, TRUE, 6)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- RLS 정책
-- =============================================================================
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channels_select_authenticated" ON channels;
DROP POLICY IF EXISTS "channels_modify_admin_only" ON channels;

-- 모든 인증 사용자가 채널 목록 조회 가능 (드롭다운/통계용)
CREATE POLICY "channels_select_authenticated" ON channels
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE는 관리자 전용
CREATE POLICY "channels_modify_admin_only" ON channels
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
