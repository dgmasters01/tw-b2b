// api/ops/trends-probe.js
// ─────────────────────────────────────────────────────────────
// Vercel 서버(데이터센터 IP)에서 구글 트렌드가 실제로 잡히는지 확인하는 읽기전용 프로브.
//   저장 안 함. 새벽 조사 봇 전체를 짓기 전에 "Vercel IP 가 구글 트렌드에 막히나?"만 먼저 본다.
//   구글 트렌드는 클라우드 IP 를 심하게 막는다 → 이게 통과해야 새벽 봇이 의미 있다.
// 사용: POST/GET  ?q=오사카 호텔,오사카 숙소   header x-ops-token
// ─────────────────────────────────────────────────────────────
import { measureTrends } from '../_lib/trends.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if ((req.headers['x-ops-token'] || '') !== process.env.CLAUDE_OPS_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const raw = Array.isArray(body.q) ? body.q : String(body.q || req.query.q || '').split(',');
  const kws = raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 10);
  if (!kws.length) return res.status(400).json({ ok: false, error: 'q_required', hint: '?q=키워드,키워드' });

  const t0 = Date.now();
  try {
    const rows = await measureTrends(kws, {
      anchor: body.anchor || kws[0], geo: body.geo || 'KR', hl: body.hl || 'ko',
    });
    return res.status(200).json({
      ok: true, took_ms: Date.now() - t0, anchor: body.anchor || kws[0],
      rows: rows.map((r) => ({ keyword: r.keyword, demand: r.demand, measured: r.measured, calib_ratio: r.calib_ratio, points: r.points, skip_reason: r.skip_reason })),
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e), took_ms: Date.now() - t0 });
  }
}
