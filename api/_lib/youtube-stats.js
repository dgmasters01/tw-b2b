// api/_lib/youtube-stats.js
// ─────────────────────────────────────────────────────────────
// 유튜브 영상 조회수·좋아요·댓글 수를 가져온다.
//   API: videos.list?part=statistics  (Data API v3)
//   비용: 1 unit / 호출 · id 는 콤마로 최대 50개까지 한 번에 (묶어도 1 unit)
//         → search.list(100 units)의 1/100 · 하루 10,000 무료 안에서 사실상 공짜
//   열쇠: YOUTUBE_API_KEY 또는 GOOGLE_PLACES_API_KEY (= TW B2B Places Key · 프로젝트 1hogi)
//         2026-07-16 whoami 실측: GOOGLE_PLACES_API_KEY 에 YouTube Data API v3 활성됨
//   지갑: Places(하루 150·유료) 와 YouTube(하루 10,000·무료)는 서로 안 뺏는다.
//   넘으면 403 quotaExceeded — 막힐 뿐 청구 없음.
// ─────────────────────────────────────────────────────────────

const API = 'https://www.googleapis.com/youtube/v3/videos';

export function ytKey() {
  return process.env.YOUTUBE_API_KEY || process.env.GOOGLE_PLACES_API_KEY || null;
}

// youtube_url / youtube.com/watch?v= / youtu.be/ / shorts / embed 에서 11자 영상 ID 추출
export function videoIdOf(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s; // 이미 ID
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ids: 영상 ID 배열. 반환: { <id>: {view_count, like_count, comment_count} }
// key 없거나 quota 막히면 { _error: '...' } 를 같이 담아 돌려준다 (호출부가 판단).
export async function fetchYtStats(ids) {
  const key = ytKey();
  const out = {};
  const clean = [...new Set((ids || []).map(videoIdOf).filter(Boolean))];
  if (!key) { out._error = 'no_key'; return out; }
  if (!clean.length) return out;

  let used = 0;
  for (let i = 0; i < clean.length; i += 50) {
    const batch = clean.slice(i, i + 50);
    const u = `${API}?part=statistics&id=${batch.join(',')}&key=${key}`;
    let j;
    try {
      const r = await fetch(u);
      j = await r.json();
    } catch (e) {
      out._error = 'fetch_failed:' + (e && e.message || e);
      return out;
    }
    used++;
    if (j && j.error) {
      out._error = (j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || 'api_error';
      out._message = (j.error.message || '').slice(0, 200);
      return out;
    }
    for (const it of (j.items || [])) {
      const st = it.statistics || {};
      out[it.id] = {
        view_count: st.viewCount != null ? parseInt(st.viewCount, 10) : null,
        like_count: st.likeCount != null ? parseInt(st.likeCount, 10) : null,
        comment_count: st.commentCount != null ? parseInt(st.commentCount, 10) : null,
      };
      // 비공개/삭제 영상은 items 에서 빠진다 → out 에 없음 = 호출부가 "못 찾음"으로 처리
    }
  }
  out._units = used; // 쓴 quota (호출 수 = unit 수)
  return out;
}
