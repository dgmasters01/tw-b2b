// api/ops/backup-check.js
// 🔴 2026-09-02 — 백업 창고에 «실제로» 무엇이 언제 올라가 있는지 본다.
//    «백업은 됐다고 착각하는 게 제일 위험하다»(db-backup.js 주석) 를 확인하는 창구.
export const config = { maxDuration: 30 };
function authOk(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN || process.env.OPS_TOKEN;
  return !!ops && (req.headers['x-ops-token'] || '') === ops;
}
export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const repo = process.env.BACKUP_REPO;
  const pat = process.env.BACKUP_PAT || process.env.GITHUB_PAT;
  if (!repo) return res.status(200).json({ ok: false, error: 'BACKUP_REPO 가 없습니다.' });
  const H = { Authorization: 'Bearer ' + pat, Accept: 'application/vnd.github+json' };
  try {
    const info = await (await fetch(`https://api.github.com/repos/${repo}`, { headers: H })).json();
    const commits = await (await fetch(`https://api.github.com/repos/${repo}/commits?per_page=5`, { headers: H })).json();
    let files = [];
    try {
      const t = await (await fetch(`https://api.github.com/repos/${repo}/git/trees/${info.default_branch}?recursive=1`, { headers: H })).json();
      files = (t.tree || []).filter(x => x.type === 'blob').map(x => ({ path: x.path, size: x.size }));
    } catch (e) {}
    files.sort((a, b) => (b.size || 0) - (a.size || 0));
    return res.status(200).json({
      ok: true, repo, private: info.private, size_kb: info.size,
      마지막커밋: Array.isArray(commits) && commits[0]
        ? { 시각: commits[0].commit?.author?.date, 메시지: (commits[0].commit?.message || '').slice(0, 80) } : null,
      최근커밋수: Array.isArray(commits) ? commits.length : 0,
      파일수: files.length,
      큰파일: files.slice(0, 8),
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e && e.message || e).slice(0, 250) });
  }
}
