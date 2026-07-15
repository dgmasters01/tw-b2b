// api/cron/hotel-geo-fill.js
// BL-HOTEL-GEO — 호텔 마스터 좌표·지역 자동 채우기 (**자동 입구**)
//
// 확정 (2026-07-15 대표님 A안):
//   하루 3회 × 45건 = 135건/일. 3,179개 → 약 24일(8월 초) 자동 완료.
//   ⚠️ 왜 50이 아니라 45인가: 구글 콘솔 SearchTextRequest **하루 150** 은 이 봇 전용이 아니다.
//      api/google-places.js(B2B 가입 시 호텔 검색)가 같은 한도를 쓴다.
//      3×50=150 이면 그날 가입 흐름의 호텔 검색이 막힌다. 15건은 가입 몫으로 남긴다.
//
// 실행: Vercel Cron (vercel.json crons) — UTC 08·12·16시 = KST 17·21·01시.
//       ⚠️ 구글 하루 한도는 **태평양 자정**(KST 16시경)에 리셋된다.
//          이 3회는 같은 태평양 하루(PT 01·05·09시) 안에 들어간다. 시간 바꿀 때 이거 깨지 말 것.
// 검증/수동: x-ops-token 또는 x-cron-token 헤더. ?dry_run=1 이면 대상만 보고 안 고침.
//            ?limit=N 으로 배치 조절(상한 50).
//
// 로직은 여기 없다 → `api/_lib/hotel-geo.js` (FIELD_MASK 경고도 거기).

import { runGeoFill, countRemaining, CRON_BATCH, MAX_BATCH } from '../_lib/hotel-geo.js';

export const config = { maxDuration: 60 };

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
  // Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 로 호출한다.
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  const q = req.query || {};
  const dryRun = q.dry_run === '1' || q.dry_run === 'true';
  const limit = Math.min(parseInt(q.limit) || CRON_BATCH, MAX_BATCH);
  const city = q.city || null;

  const started = new Date().toISOString();
  const { status, body } = await runGeoFill({ city, limit, dry_run: dryRun });

  let remaining = null;
  try { remaining = await countRemaining(); } catch (e) { /* 보고용일 뿐 */ }

  return res.status(status).json({
    ...body,
    cron: { started_at: started, batch: limit, remaining_hotels: remaining },
  });
}
