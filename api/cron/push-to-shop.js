// 스튜디오 → 여행능력자들 샵 자동 연결 (2026-09-07)
//
// 대표님: *«스튜디오에서 발행하면 여행능력자들 유튜브 발행하면»* — 그때마다 손으로 넣지 않게 한다.
//
// 🔴 왜 «매번 최근 몇 편»을 다시 보내나 — 한 번 실패하면 그 영상이 영영 안 들어가는 구조를 피하려는 것이다.
//    2026-09-05 에 영상 12편이 통째로 빠져 있던 사고가 바로 그 구조 때문이었다.
//    같은 편이 반복해서 가지만, 샵 창구가 «이미 있으면» 아고다를 부르지 않고 즉시 끝낸다(호출 0).
// 🔴 TW 채널만 보낸다. 채널 문지기는 샵 창구에도 한 번 더 있다(두 겹).
// 🔴 대표님이 하실 일이 없다 — 열쇠 기본값이 양쪽 코드에 같이 들어 있다.
import { createClient } from '@supabase/supabase-js';

const SHOP = process.env.SHOP_HOOK_URL || 'https://travelwinners-shop.vercel.app/api/hook/publish';
// 🔴 2026-09-12 — 기본값을 없앴다. 이 레포는 «공개»라 코드에 적힌 값은 누구나 본다(SHOP_ROLLBACK §75).
//    환경변수 SHOP_HOOK_TOKEN 이 없으면 보내지 않는다 — 가짜 발행이 들어가는 것보다 안 보내는 편이 낫다.
const HOOK = process.env.SHOP_HOOK_TOKEN;
const RECENT = 10;

export const config = { maxDuration: 300 };

// 인증 — 다른 크론과 같은 규약(자동은 CRON_SECRET, 수동·검증은 x-ops-token)
function allowed(req) {
  const h = req.headers || {};
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  if (cron && (h.authorization || '') === `Bearer ${cron}`) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

export default async function handler(req, res) {
  if (!HOOK) return res.status(500).json({ error: 'SHOP_HOOK_TOKEN 이 없어 샵으로 보내지 않는다 (Vercel 환경변수)' });
  if (!allowed(req)) return res.status(401).json({ error: '열쇠가 맞지 않습니다' });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.' });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const started = Date.now();
  try {
    const { data, error } = await sb
      .from('publications')
      .select('youtube_video_id,title,published_at,country,city,hid_top1,hid_top2,hid_top3,date_range')
      .eq('channel_code', 'TW')
      .eq('status', 'published')
      .not('youtube_video_id', 'is', null)
      .order('published_at', { ascending: false })
      .limit(RECENT);
    if (error) throw new Error(error.message);

    const out = [];
    for (const p of data || []) {
      const hotels = [p.hid_top1, p.hid_top2, p.hid_top3]
        .map((h, i) => ({ hid: Number(h), rank: i + 1 }))
        .filter((h) => h.hid > 0);
      if (!hotels.length) { out.push({ v: p.youtube_video_id, skip: '호텔 번호 없음' }); continue; }
      const body = {
        channel: 'TW',
        youtube_id: p.youtube_video_id,
        title: p.title || null,
        published_on: p.published_at ? String(p.published_at).slice(0, 10) : null,
        country: p.country || null,
        city: p.city || null,
        date_range: p.date_range || null,
        hotels
      };
      try {
        const r = await fetch(SHOP, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-hook-token': HOOK },
          body: JSON.stringify(body)
        });
        const j = await r.json().catch(() => ({}));
        out.push({ v: p.youtube_video_id, status: r.status, result: j.skipped || (j.ok ? '등록' : j.error) });
      } catch (e) {
        out.push({ v: p.youtube_video_id, error: String(e.message).slice(0, 100) });
      }
    }
    const sent = out.filter((o) => o.result === '등록').length;
    res.status(200).json({ ok: true, looked: (data || []).length, newly_added: sent, detail: out, ms: Date.now() - started });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e).slice(0, 300) });
  }
}
