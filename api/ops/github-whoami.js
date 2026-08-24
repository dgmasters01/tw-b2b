// /api/ops/github-whoami.js
// 지금 서버가 쓰고 있는 GITHUB_PAT 이 «누구 것이고 · 언제 만료되고 · 어느 창고를 열 수 있는지» 알려준다.
// 토큰 값은 절대 돌려주지 않는다 (앞 7자리 지문만).
//
// 🔴 왜 만들었나 (2026-08-24 대표님)
//   인계서에 «GITHUB_PAT 8/25 만료»라고만 적혀 있어, 대표님이 GitHub 토큰 목록에서
//   어느 것이 발행용인지 찾느라 헤맸다(이름이 비슷한 토큰이 여러 개).
//   사람이 목록을 뒤지는 대신, 서버가 «내가 지금 쓰는 건 이것»이라고 말하게 한다.
//   만료일은 GitHub 이 응답 헤더 github-authentication-token-expiration 로 알려준다.
//
// 사용법: GET|POST /api/ops/github-whoami   (헤더 x-ops-token)
// Returns { ok, token_kind, token_fingerprint, login, expires_at, days_left, repo_access:[...] }

const REPO_OWNER = 'dgmasters01';
const ALLOWED_REPOS = ['tw-b2b', 'staycurate'];
const GITHUB_API = 'https://api.github.com';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed (GET or POST)' });
  }

  const expectedToken = process.env.CLAUDE_OPS_TOKEN;
  if (!expectedToken) return res.status(500).json({ error: 'CLAUDE_OPS_TOKEN not configured on server' });
  if ((req.headers['x-ops-token'] || '') !== expectedToken) {
    return res.status(401).json({ error: 'Invalid or missing x-ops-token' });
  }

  const pat = process.env.GITHUB_PAT;
  if (!pat) return res.status(500).json({ ok: false, error: 'GITHUB_PAT not configured on server' });

  const headers = {
    'Authorization': `Bearer ${pat}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tw-b2b-ops-whoami/1.0',
  };

  // 토큰 종류: 값 전체가 아니라 접두어만 본다 (ghp_=classic, github_pat_=fine-grained)
  const kind = pat.startsWith('github_pat_') ? 'fine-grained'
    : pat.startsWith('ghp_') ? 'classic'
      : pat.startsWith('ghs_') ? 'app-installation' : 'unknown';
  const fingerprint = `${pat.slice(0, 11)}…${pat.slice(-4)}`;   // 앞뒤 몇 글자 — 목록에서 대조용, 재현 불가

  try {
    const me = await fetch(`${GITHUB_API}/user`, { headers });
    // 만료일은 헤더로만 온다. classic 토큰에 만료가 없으면 헤더 자체가 없다.
    const expHeader = me.headers.get('github-authentication-token-expiration') || null;
    const scopes = me.headers.get('x-oauth-scopes');   // classic 토큰일 때만 값이 있다
    const body = await me.json().catch(() => ({}));

    if (!me.ok) {
      return res.status(200).json({
        ok: false, token_kind: kind, token_fingerprint: fingerprint,
        status: me.status,
        error: me.status === 401 ? '토큰이 만료됐거나 취소됐습니다 — 재발급 필요'
          : `GitHub 응답 ${me.status}: ${String(body.message || '').slice(0, 80)}`,
      });
    }

    let expires_at = null, days_left = null;
    if (expHeader) {
      const t = new Date(expHeader.replace(' UTC', 'Z').replace(' ', 'T'));
      if (!isNaN(t)) { expires_at = t.toISOString(); days_left = Math.floor((t - Date.now()) / 86400000); }
    }

    // 화이트리스트 창고를 실제로 열 수 있는지 하나씩 두드려 본다 (권한 확인)
    const repo_access = [];
    for (const r of ALLOWED_REPOS) {
      const rr = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${r}`, { headers });
      const rb = await rr.json().catch(() => ({}));
      repo_access.push({
        repo: r, ok: rr.ok, status: rr.status,
        push: rr.ok ? !!(rb.permissions && rb.permissions.push) : false,
      });
    }

    const canPublish = repo_access.every(x => x.ok && x.push);
    return res.status(200).json({
      ok: true,
      token_kind: kind,
      token_fingerprint: fingerprint,
      login: body.login || null,
      expires_at,
      days_left,
      expiry_note: expHeader ? null : '만료 없음(또는 GitHub 이 만료를 알려주지 않는 종류)',
      scopes: scopes || null,
      repo_access,
      can_publish: canPublish,
      verdict: canPublish
        ? `발행 가능 — 두 창고 모두 쓰기 됨${days_left != null ? ` · 만료까지 ${days_left}일` : ' · 만료 없음'}`
        : '🔴 발행 불가 — 창고 권한 부족. 토큰에 tw-b2b·staycurate 쓰기 권한을 주세요',
    });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e.message).slice(0, 120) });
  }
}
