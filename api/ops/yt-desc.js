// api/ops/yt-desc.js — 유튜브 영상의 제목·설명을 읽어온다 (Data API v3 · videos.list)
// 왜: 스튜디오를 쓰기 전에 올린 옛 영상은 창고에 호텔 자료가 없다.
//     설명란의 아고다 링크를 읽어 채우려면 설명 원문이 필요하다.
// 비용: videos.list = 1회당 1단위, 무료 한도 10,000/일 → 사실상 0원.
// 인증: x-ops-token (CLAUDE_OPS_TOKEN) — 다른 ops 창구와 같은 열쇠
const API = 'https://www.googleapis.com/youtube/v3/videos';

export default async function handler(req, res) {
  const tok = req.headers['x-ops-token'];
  if (!tok || tok !== process.env.CLAUDE_OPS_TOKEN) {
    return res.status(401).json({ error: 'Invalid or missing x-ops-token' });
  }
  const key = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(500).json({ error: 'YOUTUBE_API_KEY 없음' });

  const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 50);
  if (!ids.length) return res.status(400).json({ error: 'ids 가 필요합니다' });

  try {
    const r = await fetch(`${API}?part=snippet&id=${ids.join(',')}&key=${key}`);
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'youtube', detail: j });
    const items = (j.items || []).map(v => ({
      id: v.id,
      title: v.snippet?.title || '',
      published_at: v.snippet?.publishedAt || null,
      channel: v.snippet?.channelTitle || '',
      description: v.snippet?.description || ''
    }));
    res.status(200).json({ ok: true, count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
