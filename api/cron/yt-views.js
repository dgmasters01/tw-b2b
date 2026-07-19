// api/cron/yt-views.js
// ─────────────────────────────────────────────────────────────
// 발행된 영상의 유튜브 조회수를 하루 1회 캐싱한다.
//   화면(성과 팝업·올리기 발행됨 목록)은 이 캐시값(publications.view_count)만 읽는다.
//   → 페이지 열 때마다 유튜브를 부르지 않는다 = 빠르고, quota 안 샌다.
//
// 실행:
//   자동  = Vercel Cron 하루 1회. Authorization: Bearer <CRON_SECRET>.
//   수동/검증 = x-ops-token=CLAUDE_OPS_TOKEN.
//   ?dry_run=1 → 무엇을 부를지만 보고, DB 안 씀.
//   ?force=1   → 24h 캐싱 무시하고 전부 다시 부름 (검증용).
//
// 비용: videos.list = 1 unit/호출 · id 50개 묶어도 1 unit. 발행 수백 편이어도 몇 호출.
//       하루 10,000 무료(YouTube 지갑, Places 와 별개) 안에서 사실상 공짜.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { fetchYtStats, ytKey } from '../_lib/youtube-stats.js';

export const config = { maxDuration: 60 };

const CACHE_HOURS = 24; // 이 시간 안에 이미 잰 건 다시 안 잰다 (force 면 무시)

function authed(req) {
  const h = req.headers || {};
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const dry = req.query.dry_run === '1' || req.query.dry_run === 'true';
  const force = req.query.force === '1' || req.query.force === 'true';

  if (!ytKey()) return res.status(200).json({ ok: false, error: 'no_key', note: 'YOUTUBE_API_KEY · GOOGLE_PLACES_API_KEY 둘 다 없음' });

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }

  // 발행됐고 영상 ID 가 있는 원고만
  const { data: rows, error } = await sb.from('publications')
    .select('id, code, youtube_video_id, view_count, view_count_at')
    .eq('status', 'published')
    .not('youtube_video_id', 'is', null);
  if (error) return res.status(500).json({ ok: false, error: error.message });

  const now = Date.now();
  const stale = (rows || []).filter(function (r) {
    if (force) return true;
    if (!r.view_count_at) return true;
    return (now - new Date(r.view_count_at).getTime()) >= CACHE_HOURS * 3600 * 1000;
  });

  if (dry) {
    return res.status(200).json({
      ok: true, dry_run: true,
      published_with_video: (rows || []).length,
      to_refresh: stale.length,
      sample: stale.slice(0, 5).map(function (r) { return { code: r.code, vid: r.youtube_video_id, cached: r.view_count, at: r.view_count_at }; }),
    });
  }

  if (!stale.length) {
    return res.status(200).json({ ok: true, checked: (rows || []).length, updated: 0, note: '24h 안에 이미 최신 — 갱신할 것 없음' });
  }

  // ID → publication id 되찾기용
  const idByVid = {};
  stale.forEach(function (r) { (idByVid[r.youtube_video_id] = idByVid[r.youtube_video_id] || []).push(r); });

  const stats = await fetchYtStats(stale.map(function (r) { return r.youtube_video_id; }));
  if (stats._error) {
    return res.status(200).json({ ok: false, error: 'youtube_' + stats._error, message: stats._message || '', to_refresh: stale.length });
  }

  const nowIso = new Date().toISOString();
  let updated = 0, notFound = [];
  const samples = [];
  for (const r of stale) {
    const st = stats[r.youtube_video_id];
    if (!st) { notFound.push(r.code || r.youtube_video_id); continue; } // 비공개·삭제·오타
    const { error: uerr } = await sb.from('publications').update({
      view_count: st.view_count,
      like_count: st.like_count,
      comment_count: st.comment_count,
      view_count_at: nowIso,
    }).eq('id', r.id);
    if (!uerr) { updated++; if (samples.length < 5) samples.push({ code: r.code, view_count: st.view_count }); }
  }

  return res.status(200).json({
    ok: true,
    checked: (rows || []).length,
    to_refresh: stale.length,
    updated: updated,
    not_found: notFound,           // 유튜브에 없던 영상(비공개·삭제·주소 오타) — 사람이 볼 목록
    units_used: stats._units || null,
    sample: samples,
    at: nowIso,
  });
}
