// /api/ops/db-query.js
// Claude 자율 Supabase SQL 실행 endpoint — 1인 운영 자동화 인프라
// 인증: x-ops-token 헤더 = process.env.CLAUDE_OPS_TOKEN  (github-commit.js 와 동일)
//
// 목적: 표(table) 생성·뷰·인덱스 등 SQL/DDL을 Claude가 매번 수동 붙여넣기 없이 자동 실행.
//       (github-commit = 파일 저장 창구 / db-query = DB 실행 창구 — 한 쌍)
//
// Body:
//   {
//     query: string,            // 실행할 SQL (DDL/DML). 멱등 SQL 권장(CREATE ... IF NOT EXISTS)
//     project_ref?: string,     // 기본 vjsludfjsphwnumuoqaj
//   }
//
// Returns:
//   { ok: true, rows, row_count }   // DDL 성공 시 rows=[] 가 정상
//
// 보안:
//   - CLAUDE_OPS_TOKEN: Claude → endpoint 호출 인증 (github-commit 과 공유)
//   - SUPABASE_ACCESS_TOKEN: endpoint → Supabase Management API 인증 (Vercel 환경변수, 외부 노출 X)
//     ※ Supabase Dashboard > Account > Access Tokens 에서 발급한 'sbp_...' Personal Access Token
//   - User-Agent 헤더 필수 (없으면 Cloudflare 1010/403 차단)
//   - drop database / drop schema public 등 복구불가 파괴 구문은 하드 차단(가역성 — 헌법 원칙 9)
//
// 한도 가드: 시간당 60회

const DEFAULT_PROJECT_REF = 'vjsludfjsphwnumuoqaj';
const SUPABASE_MGMT_API = 'https://api.supabase.com';

const RATE_STATE = globalThis.__dbQueryRateState || (globalThis.__dbQueryRateState = {
  window_start: 0,
  count: 0,
});
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1시간
const RATE_LIMIT = 60;                 // 시간당 60 query

// 복구 불가 파괴 구문 하드 차단 (정상 DDL인 DROP TABLE/POLICY/TRIGGER/INDEX 등은 허용)
const FORBIDDEN = [
  /drop\s+database/i,
  /drop\s+schema\s+public/i,
  /drop\s+schema\s+auth/i,
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. CLAUDE_OPS_TOKEN 인증
  const expectedToken = process.env.CLAUDE_OPS_TOKEN;
  if (!expectedToken) {
    return res.status(500).json({ error: 'CLAUDE_OPS_TOKEN not configured on server' });
  }
  const providedToken = req.headers['x-ops-token'] || '';
  if (providedToken !== expectedToken) {
    return res.status(401).json({ error: 'Invalid or missing x-ops-token' });
  }

  // 2. SUPABASE_ACCESS_TOKEN 존재 확인
  const sbToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!sbToken) {
    return res.status(500).json({
      error: 'SUPABASE_ACCESS_TOKEN not configured on server',
      hint: 'Vercel 환경변수에 Supabase Personal Access Token(sbp_...) 추가 필요',
    });
  }

  // 3. body 검증
  const body = req.body || {};
  const query = body.query;
  const projectRef = body.project_ref || DEFAULT_PROJECT_REF;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required (string)' });
  }
  for (const re of FORBIDDEN) {
    if (re.test(query)) {
      return res.status(400).json({
        ok: false,
        error: 'forbidden_statement',
        message: '복구 불가 파괴 구문(drop database/schema)은 이 창구로 실행 불가. Supabase Dashboard에서 직접 처리.',
      });
    }
  }

  // 4. Rate limit 가드
  const NOW = Date.now();
  if (NOW - RATE_STATE.window_start > RATE_WINDOW_MS) {
    RATE_STATE.window_start = NOW;
    RATE_STATE.count = 0;
  }
  if (RATE_STATE.count >= RATE_LIMIT) {
    const remainingMin = Math.ceil((RATE_WINDOW_MS - (NOW - RATE_STATE.window_start)) / 60000);
    return res.status(429).json({
      ok: false,
      error: 'rate_limit',
      message: `시간당 ${RATE_LIMIT} query 한도 도달. ${remainingMin}분 후 재시도.`,
    });
  }

  // 5. Supabase Management API 실행
  const url = `${SUPABASE_MGMT_API}/v1/projects/${encodeURIComponent(projectRef)}/database/query`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sbToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'tw-b2b-claude/1.0', // 필수 — 없으면 Cloudflare 차단
      },
      body: JSON.stringify({ query }),
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!resp.ok) {
      return res.status(502).json({
        ok: false,
        error: 'supabase_query_failed',
        status: resp.status,
        detail: typeof data === 'string' ? data.slice(0, 800) : data,
      });
    }

    RATE_STATE.count += 1;

    // DDL 성공 시 data = [] (정상)
    return res.status(200).json({
      ok: true,
      rows: data,
      row_count: Array.isArray(data) ? data.length : null,
      project_ref: projectRef,
      quota: {
        used: RATE_STATE.count,
        limit: RATE_LIMIT,
        window_reset_at: new Date(RATE_STATE.window_start + RATE_WINDOW_MS).toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      detail: String(err?.message || err).slice(0, 500),
    });
  }
}
