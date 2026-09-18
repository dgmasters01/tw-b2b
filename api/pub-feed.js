// api/pub-feed.js — 여행능력자들 샵(및 앞으로 나라별 샵)이 «가져가는» 발행 목록 (2026-09-18)
//
// 🔴 왜 만드나 — 지금은 스튜디오가 샵으로 «밀어 넣는다»(api/cron/push-to-shop.js).
//    밀어넣기가 조용히 실패하면 샵은 옛 영상만 갖고도 아무도 모른다(2026-09-18 실측: 8일간 새 영상 0편).
//    그래서 샵이 «자기 주기로 가져가는» 길을 연다. 한 번 실패해도 다음 차례에 저절로 복구된다.
// 🔴 읽기 전용이다. 창고를 바꾸지 않는다. 열쇠(x-hook-token)가 맞아야 한다.
// 🔴 채널을 물어보는 대로 준다 — 나라별 샵이 각자 자기 채널만 가져간다.
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const HOOK = process.env.SHOP_HOOK_TOKEN;
  if (!HOOK || String(req.headers['x-hook-token'] || '') !== HOOK) {
    return res.status(401).json({ error: '열쇠가 맞지 않습니다' });
  }
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: '창고 열쇠가 없습니다' });

  const channel = String(req.query.channel || 'TW').toUpperCase().slice(0, 10);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const since = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.since || '')) ? String(req.query.since) : null;

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    let q = sb.from('publications')
      .select('youtube_video_id,title,published_at,country,city,hid_top1,hid_top2,hid_top3,date_range')
      .eq('channel_code', channel)
      .eq('status', 'published')
      .not('youtube_video_id', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (since) q = q.gte('published_at', since);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const items = (data || []).map(p => ({
      channel,
      youtube_id: p.youtube_video_id,
      title: p.title || null,
      published_on: p.published_at ? String(p.published_at).slice(0, 10) : null,
      country: p.country || null,
      city: p.city || null,
      date_range: p.date_range || null,
      hotels: [p.hid_top1, p.hid_top2, p.hid_top3]
        .map((h, i) => ({ hid: Number(h), rank: i + 1 }))
        .filter(h => h.hid > 0)
    }));
    return res.status(200).json({ ok: true, channel, count: items.length, items });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
}
