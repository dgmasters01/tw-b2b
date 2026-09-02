// api/cron/db-backup.js
// BL-DB-BACKUP — 매일 1회 Supabase DB 전체를 비공개 GitHub 창고로 백업 (**자동 입구**)
//
// 왜 (2026-07-16 인계서 최우선): Supabase FREE = 자동 백업 없음. LAST BACKUP = No backups.
//   예약 7,316 · 호텔 3,185 = 사업 전부. 헌법 9조 "이중 백업" = Supabase(원본) + GitHub 비공개(사본).
//
// 🔴 2026-09-02 — 이 입구는 더 이상 «자동»이 아니다. 크론에서 뺐다.
//    진짜 백업은 GitHub Actions .github/workflows/db-backup.yml (매일 UTC 18:10 = KST 03:10) 가 한다.
//    이유: 옛 읽기 방식(ORDER BY ctid + OFFSET)이 한 쪽마다 301만 행을 정렬해 6.9시간이 걸렸다.
//    열쇠순으로 고쳐 13분이 됐지만 Vercel Pro 상한(800초)에 너무 붙어 있어 Actions 로 옮겼다.
//    여기는 ?dry_run=1 로 «창고에 닿는지» 확인할 때만 손으로 부른다.
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

// 🔴 2026-09-02 maxDuration 300 → 800 (대표님 «Vercel pro 버전 쓰고 있어»)
//    우리는 Vercel Pro 다. Pro/Enterprise 는 함수를 800초(약 13분)까지 돌릴 수 있다.
//    300 은 Hobby 기본값이다 — 요금제가 이미 풀어준 것을 몰라 하루를 썼다.
//    🔴 node 런타임이라 가능하다. edge 런타임 일꾼은 이 값을 못 올린다(BUSINESS-MAP §5-D-3).
//    이래도 모자라면 GitHub Actions(6시간)로 옮긴다 — 이미 26개 쓰고 있다.
export const config = { maxDuration: 800 };

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

