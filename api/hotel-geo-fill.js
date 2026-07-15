// /api/hotel-geo-fill.js
// 호텔 마스터 좌표·지역 채우기 — **수동 입구** (BL-HOTEL-GEO)
// 결정문서: _business/decisions/2026-07-14-keyword-menu-redesign-wip.md · D-065
//
// ⚠️ 로직은 여기 없다. `api/_lib/hotel-geo.js` 하나가 진실이다(헌법 1: 단일 진실).
//    자동 실행(하루 3회)은 `api/cron/hotel-geo-fill.js`.
//    FIELD_MASK 경고·안전장치 설명도 _lib 파일 머리에 있다. 반드시 거기부터 읽을 것.
//
// 사용:
//   POST /api/hotel-geo-fill
//   header: x-ops-token: <CLAUDE_OPS_TOKEN>
//   body:   { city?: "Osaka", limit?: 10, dry_run?: false }

import { runGeoFill } from './_lib/hotel-geo.js';

// ⚠️ 이 수동 입구는 maxDuration 30초(vercel.json functions "api/*.js").
//    실측 2026-07-15: 45건 = 36초 → 30초를 넘긴다. 그래서 수동은 30건까지만 받는다.
//    많이 돌릴 땐 크론 입구(api/cron/hotel-geo-fill.js, maxDuration 60)를 쓸 것.
const MANUAL_MAX = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ops-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 인증 (db-query.js / github-commit.js 와 동일 토큰)
  const OPS_TOKEN = process.env.CLAUDE_OPS_TOKEN;
  if (!OPS_TOKEN || req.headers['x-ops-token'] !== OPS_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { city = null, limit = 10, dry_run = false } = req.body || {};
  const safeLimit = Math.min(parseInt(limit) || 10, MANUAL_MAX);
  const { status, body } = await runGeoFill({ city, limit: safeLimit, dry_run });
  return res.status(status).json(body);
}
