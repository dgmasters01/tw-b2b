// /api/ops/github-commit.js
// Claude 자율 GitHub commit endpoint — 1인 운영 자동화 인프라
// 인증: x-ops-token 헤더 = process.env.CLAUDE_OPS_TOKEN
//
// 패턴: notify-claude-work.js 와 동일 인증·에러 핸들링 스타일
//
// Body:
//   {
//     path: string,          // 파일 경로 (예: "_os/INDEX.md")
//     content: string,       // 파일 내용 (UTF-8 평문, 함수 내에서 base64 변환)
//     message: string,       // commit message
//     branch?: string,       // 기본 "main"
//   }
//
// Returns:
//   { ok: true, commit_sha, file_url, html_url, action: 'created' | 'updated' }
//
// 보안:
//   - CLAUDE_OPS_TOKEN: Claude → endpoint 호출 인증
//   - GITHUB_PAT: endpoint → GitHub 호출 인증 (Vercel 환경변수, 외부 노출 X)
//   - PAT 권한: dgmasters01/tw-b2b 레포 한정, Contents R/W, 90일 만료
//
// 한도 가드: 시간당 30회 (악용/무한루프 방지)

const REPO_OWNER = 'dgmasters01';
const REPO_NAME = 'tw-b2b';
const GITHUB_API = 'https://api.github.com';

// in-memory rate limiter (인스턴스 lifetime)
const RATE_STATE = globalThis.__githubCommitRateState || (globalThis.__githubCommitRateState = {
  window_start: 0,
  count: 0,
});
const RATE_WINDOW_MS = 60 * 60 * 1000;  // 1시간
const RATE_LIMIT = 30;                   // 시간당 30 commit

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

  // 2. GITHUB_PAT 존재 확인
  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) {
    return res.status(500).json({ error: 'GITHUB_PAT not configured on server' });
  }

  // 3. body 검증
  const body = req.body || {};
  const { path, content, message } = body;
  const branch = body.branch || 'main';

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'path is required (string)' });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required (string)' });
  }
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required (string)' });
  }

  // 경로 안전성 — .. 금지, 절대경로 금지
  if (path.includes('..') || path.startsWith('/')) {
    return res.status(400).json({ error: 'path must be relative and cannot contain ".."' });
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
      message: `시간당 ${RATE_LIMIT} commit 한도 도달. ${remainingMin}분 후 재시도.`,
    });
  }

  const ghHeaders = {
    'Authorization': `Bearer ${githubPat}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tw-b2b-ops-commit/1.0',
  };

  const fileApiUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;

  try {
    // 5. 파일 존재 여부 확인 (update이면 sha 필요)
    let existingSha = null;
    const headResp = await fetch(fileApiUrl, { headers: ghHeaders });

    if (headResp.status === 200) {
      const existingFile = await headResp.json();
      existingSha = existingFile.sha;
    } else if (headResp.status !== 404) {
      const errText = await headResp.text();
      return res.status(502).json({
        ok: false,
        error: 'github_read_failed',
        status: headResp.status,
        detail: errText.slice(0, 500),
      });
    }

    // 6. commit 실행 (PUT — create 또는 update)
    const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');
    const putUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;

    const putPayload = {
      message,
      content: contentBase64,
      branch,
      committer: {
        name: 'Claude (TW OS)',
        email: 'claude-ops@gohotelwinners.com',
      },
    };
    if (existingSha) putPayload.sha = existingSha;

    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload),
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      return res.status(502).json({
        ok: false,
        error: 'github_commit_failed',
        status: putResp.status,
        detail: errText.slice(0, 500),
      });
    }

    const result = await putResp.json();
    RATE_STATE.count += 1;

    return res.status(200).json({
      ok: true,
      action: existingSha ? 'updated' : 'created',
      commit_sha: result.commit?.sha || null,
      file_url: result.content?.html_url || null,
      raw_url: result.content?.download_url || null,
      path,
      branch,
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
