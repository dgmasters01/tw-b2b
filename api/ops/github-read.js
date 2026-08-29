// /api/ops/github-read.js
// Claude 자율 GitHub READ endpoint — github-commit.js 의 짝(읽기 전용)
// 인증: x-ops-token 헤더 = process.env.CLAUDE_OPS_TOKEN
//
// 🔴 왜 만들었나 (2026-08-08)
//   staycurate 레포가 Private 이라 raw.githubusercontent 로 못 읽는다.
//   창구는 "저장"만 있고 "읽기"가 없어서, 클로드가 Private 레포 안을 전혀 못 봤다.
//   → 인계서·문서·소스 확인이 불가능 → 매 채팅 부팅이 반쪽.
//   저장 문(github-commit)과 똑같은 인증·똑같은 화이트리스트로 읽기 문을 하나 더 낸다.
//
// 사용법 (GET 또는 POST 둘 다 됨)
//   GET  /api/ops/github-read?repo=staycurate&path=docs/HANDOVER-budget.md
//   POST /api/ops/github-read   body: { repo, path, branch?, format? }
//
//   path 가 폴더면 → 파일 목록(listing) 반환
//   path 가 파일이면 → 내용 반환 (텍스트는 평문, 바이너리는 base64)
//   path 생략 → 레포 루트 목록
//
// format: 'text'(기본, 텍스트면 평문) | 'base64'(항상 base64)
//
// Returns:
//   파일 → { ok, type:'file', repo, path, size, sha, encoding, content }
//   폴더 → { ok, type:'dir', repo, path, entries:[{name,path,type,size}] }
//
// 한도 가드: 시간당 120회 (읽기는 부작용이 없어 commit 30회보다 넉넉)

const REPO_OWNER = 'dgmasters01';
const REPO_NAME = 'tw-b2b';                       // 기본 레포(하위호환)
const ALLOWED_REPOS = ['tw-b2b', 'staycurate', 'tw-personal-os'];
//   🔴 2026-08-29 tw-personal-os 추가 — 개인OS 는 창고(DB)도 코드도 별개라 클로드가 전혀 못 보고 있었다.
//      대표님 허락(08-29). PAT 권한이 그 레포까지 열려 있어야 실제로 읽힌다 — 안 되면 404/403 이 뜬다.   // commit 창구와 동일 화이트리스트
const GITHUB_API = 'https://api.github.com';

// 평문으로 돌려줘도 되는 텍스트 확장자
const TEXT_EXT = /\.(md|txt|json|js|mjs|cjs|ts|tsx|jsx|html|htm|css|scss|yml|yaml|xml|svg|csv|tsv|sql|sh|env|toml|ini|gitignore|lock)$/i;

const MAX_TEXT_BYTES = 900 * 1024;   // 900KB 초과 텍스트는 잘라서 반환(응답 폭주 방지)

// in-memory rate limiter (인스턴스 lifetime)
const RATE_STATE = globalThis.__githubReadRateState || (globalThis.__githubReadRateState = {
  window_start: 0,
  count: 0,
});
const RATE_WINDOW_MS = 60 * 60 * 1000;  // 1시간
const RATE_LIMIT = 120;                  // 시간당 120 read

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed (GET or POST)' });
  }

  // 1. CLAUDE_OPS_TOKEN 인증 — commit 창구와 완전히 동일
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

  // 3. 파라미터 (GET query · POST body 둘 다 지원)
  const src = req.method === 'GET' ? (req.query || {}) : (req.body || {});
  const targetRepo = src.repo || REPO_NAME;
  const repoDefaulted = !src.repo;
  if (!ALLOWED_REPOS.includes(targetRepo)) {
    return res.status(400).json({ error: `repo not allowed: ${targetRepo}`, allowed: ALLOWED_REPOS });
  }

  const path = typeof src.path === 'string' ? src.path.replace(/^\/+/, '') : '';
  const branch = src.branch || 'main';
  const format = src.format === 'base64' ? 'base64' : 'text';

  if (path.includes('..')) {
    return res.status(400).json({ error: 'path cannot contain ".."' });
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
      message: `시간당 ${RATE_LIMIT} read 한도 도달. ${remainingMin}분 후 재시도.`,
    });
  }

  const ghHeaders = {
    'Authorization': `Bearer ${githubPat}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tw-b2b-ops-read/1.0',
  };

  const encPath = encodeURIComponent(path).replace(/%2F/g, '/');
  const apiUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${targetRepo}/contents/${encPath}?ref=${encodeURIComponent(branch)}`;

  const repoNote = repoDefaulted
    ? `ℹ️ repo 를 안 적어서 기본 창고 '${REPO_NAME}' 를 읽었습니다. 블로그면 repo=staycurate 를 넣으세요.`
    : undefined;

  try {
    const resp = await fetch(apiUrl, { headers: ghHeaders });

    if (resp.status === 404) {
      return res.status(404).json({ ok: false, error: 'not_found', repo: targetRepo, path, branch });
    }
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({
        ok: false,
        error: 'github_read_failed',
        status: resp.status,
        detail: errText.slice(0, 500),
      });
    }

    const data = await resp.json();
    RATE_STATE.count += 1;

    const quota = {
      used: RATE_STATE.count,
      limit: RATE_LIMIT,
      window_reset_at: new Date(RATE_STATE.window_start + RATE_WINDOW_MS).toISOString(),
    };

    // 4-A. 폴더 → 목록
    if (Array.isArray(data)) {
      return res.status(200).json({
        ok: true,
        type: 'dir',
        repo: targetRepo,
        repo_note: repoNote,
        path: path || '(root)',
        branch,
        count: data.length,
        entries: data.map((e) => ({ name: e.name, path: e.path, type: e.type, size: e.size })),
        quota,
      });
    }

    // 4-B. 파일 → 내용
    const rawB64 = (data.content || '').replace(/\n/g, '');
    const isText = format === 'text' && TEXT_EXT.test(data.name || path);

    let content;
    let encoding;
    let truncated = false;

    if (isText) {
      const buf = Buffer.from(rawB64, 'base64');
      if (buf.length > MAX_TEXT_BYTES) {
        content = buf.slice(0, MAX_TEXT_BYTES).toString('utf-8');
        truncated = true;
      } else {
        content = buf.toString('utf-8');
      }
      encoding = 'utf-8';
    } else {
      content = rawB64;
      encoding = 'base64';
    }

    return res.status(200).json({
      ok: true,
      type: 'file',
      repo: targetRepo,
      repo_note: repoNote,
      path: data.path,
      branch,
      size: data.size,
      sha: data.sha,
      encoding,
      truncated,
      content,
      quota,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      detail: String(err?.message || err).slice(0, 500),
    });
  }
}
