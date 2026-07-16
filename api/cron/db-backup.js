// api/cron/db-backup.js
// BL-DB-BACKUP — 매일 1회 Supabase DB 전체를 비공개 GitHub 창고로 백업 (**자동 입구**)
//
// 왜 (2026-07-16 인계서 최우선): Supabase FREE = 자동 백업 없음. LAST BACKUP = No backups.
//   예약 7,316 · 호텔 3,185 = 사업 전부. 헌법 9조 "이중 백업" = Supabase(원본) + GitHub 비공개(사본).
//
// 실행: Vercel Cron (vercel.json crons) — UTC 19:00 = KST 04:00.
//       왜 새벽인가: 좌표 크론(UTC 08·12·16)과 겹치지 않고, 대표님 작업 시간과도 안 겹친다.
//
// 인증: Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 로 부른다.
//       수동/검증은 x-cron-token 또는 x-ops-token.
//
// ?dry_run=1 → 아무것도 안 쓰고 "창고에 닿는지 / private 인지 / 무엇을 담을지"만 보고.
//              ← 인계서 ③(PAT가 새 레포에 접근되는지) 확인이 이거다.
//
// 로직은 여기 없다 → api/_lib/db-backup.js

import { runBackup } from '../_lib/db-backup.js';

export const config = { maxDuration: 300 };

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  const q = req.query || {};
  const dryRun = q.dry_run === '1' || q.dry_run === 'true';

  try {
    const result = await runBackup({ dryRun });
    return res.status(200).json(result);
  } catch (e) {
    // 실패를 조용히 삼키지 않는다. 백업은 "됐다고 착각"하는 게 제일 위험하다.
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
