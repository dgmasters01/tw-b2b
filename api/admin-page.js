// /api/admin-page.js
// 인증 게이트 — admin-*.html 정적 파일을 admin 전용으로 보호.
//
// 인증 우선순위 (하나라도 통과하면 OK):
//   ① Cookie tw_admin_pass = ADMIN_ACCESS_KEY  (대표님 첫 인증 후 30일 영구 통과)
//   ② Referer host ∈ gohotelwinners.com (admin 안에서 페이지 간 이동)
//   ③ ?key=... = ADMIN_ACCESS_KEY  (북마크/직접 입력 첫 진입 — 자동 쿠키 발급)
//   ④ x-admin-token = ADMIN_VIEW_TOKEN  (Claude/스크립트 자동화)
//
// 미통과 시: HTML 로그인 폼 표시 (JSON 401 대신 — 대표님이 직접 키 입력 가능)
//
// 환경변수:
//   ADMIN_ACCESS_KEY  = 대표님이 Vercel에 등록 (영구 키, 단발 입력으로 쿠키 발급)
//   ADMIN_VIEW_TOKEN  = (선택) Claude/스크립트용
//
// 정식 오픈 전에는 BL-ADMIN-AUTH로 Supabase Auth 교체 (헌법 11조 의무).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ALLOWED_REFERRER_HOSTS = ['gohotelwinners.com', 'www.gohotelwinners.com', 'tw-b2b.vercel.app'];
const COOKIE_NAME = 'tw_admin_pass';
const COOKIE_MAX_AGE_DAYS = 30;

// page slug → 정적 파일명 매핑 (_admin/ 폴더 안)
const PAGE_FILE_MAP = {
  'status':       '_admin/admin-status.html',
  'tasks':        '_admin/admin-tasks.html',
  'business':     '_admin/admin-business.html',
  'service-ops':  '_admin/admin-service-ops.html',
  'gallery':      '_admin/admin-gallery.html',
  'admin':        '_admin/admin.html',
  'hub':          '_admin/admin-hub.html',
};

// page → URL 역매핑 (쿠키 발급 후 깨끗한 URL로 리다이렉트할 때 사용)
const PAGE_URL_MAP = {
  'status':       '/admin-status.html',
  'tasks':        '/admin-tasks.html',
  'business':     '/admin-business.html',
  'service-ops':  '/admin-service-ops.html',
  'gallery':      '/admin-gallery.html',
  'admin':        '/admin.html',
  'hub':          '/admin-hub.html',
};

function isAllowedByReferer(req) {
  const ref = req.headers['referer'] || '';
  if (!ref) return false;
  try {
    const u = new URL(ref);
    return ALLOWED_REFERRER_HOSTS.includes(u.host);
  } catch (_) {
    return false;
  }
}

function isAllowedByToken(req) {
  const expected = process.env.ADMIN_VIEW_TOKEN;
  if (!expected) return false;
  const provided = req.headers['x-admin-token'] || '';
  return provided && provided === expected;
}

function isAllowedByQueryKey(req) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return false;
  const provided = String(req.query.key || '').trim();
  return provided && provided === expected;
}

function isAllowedByCookie(req) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return false;
  const cookieHeader = req.headers['cookie'] || '';
  const parts = cookieHeader.split(';').map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    const k = p.slice(0, idx);
    const v = decodeURIComponent(p.slice(idx + 1));
    if (k === COOKIE_NAME && v === expected) return true;
  }
  return false;
}

function setAuthCookie(res, value) {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  // SameSite=Lax — admin 페이지 간 이동 시 쿠키 전송, 외부에서 GET링크는 전송 안 함
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );
}

function loginPageHTML(currentPage, errorMsg) {
  const safePage = (currentPage || 'status').replace(/[^a-z0-9-]/gi, '');
  const errBlock = errorMsg ? `<div class="err">${errorMsg}</div>` : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>관리자 인증 — TravelWinners B2B</title>
<style>
  :root {
    --bg: #0a0a0f; --panel: rgba(20,20,30,0.85); --border: rgba(255,255,255,0.1);
    --text: #e5e7eb; --text-muted: #9ca3af; --accent: #a78bfa;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
    color: var(--text);
    background-image: radial-gradient(ellipse at top, rgba(167,139,250,0.15), transparent 70%);
  }
  .card {
    background: var(--panel); border: 0.5px solid var(--border); border-radius: 12px;
    padding: 32px 28px; width: min(420px, 92vw);
    backdrop-filter: blur(20px); box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }
  h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
  .sub { font-size: 12px; color: var(--text-muted); margin-bottom: 20px; }
  .err {
    background: rgba(248,113,113,0.1); color: #fca5a5; border: 0.5px solid rgba(248,113,113,0.3);
    padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px;
    line-height: 1.5;
  }
  label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
  input[type=password], input[type=text] {
    width: 100%; background: rgba(0,0,0,0.3); border: 0.5px solid var(--border);
    color: var(--text); padding: 10px 12px; border-radius: 6px; font-size: 13px;
    font-family: inherit;
  }
  input:focus { outline: 1px solid var(--accent); border-color: var(--accent); }
  button {
    width: 100%; margin-top: 14px; padding: 10px 14px;
    background: linear-gradient(135deg, #a78bfa, #6366f1); color: #fff;
    border: 0; border-radius: 6px; font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: inherit;
  }
  button:hover { opacity: 0.9; }
  .hint { font-size: 10px; color: var(--text-muted); margin-top: 14px; line-height: 1.5; }
  .lock { font-size: 28px; margin-bottom: 8px; }
  code { background: rgba(0,0,0,0.4); padding: 1px 6px; border-radius: 3px; font-size: 11px; }
</style>
</head>
<body>
  <form class="card" method="GET" action="">
    <div class="lock">🔒</div>
    <h1>관리자 인증 필요</h1>
    <div class="sub">TravelWinners B2B — admin 영역</div>
    ${errBlock}
    <label for="key">접근 키</label>
    <input type="password" id="key" name="key" autocomplete="current-password" required autofocus>
    <button type="submit">인증 후 진입</button>
    <div class="hint">
      • 첫 인증 후 30일 동안 자동 통과 (쿠키 발급)<br>
      • 키는 Vercel 환경변수 <code>ADMIN_ACCESS_KEY</code>에 등록되어 있어야 합니다<br>
      • 페이지: <code>${safePage}</code>
    </div>
  </form>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const page = String(req.query.page || 'status').trim();
  const filename = PAGE_FILE_MAP[page];
  if (!filename) {
    return res.status(400).json({ error: 'Invalid page', allowed: Object.keys(PAGE_FILE_MAP) });
  }

  // ?key= 로 들어온 경우: 키 검증 → 맞으면 쿠키 발급 + 깨끗한 URL로 302
  if (req.query.key !== undefined) {
    if (isAllowedByQueryKey(req)) {
      setAuthCookie(res, process.env.ADMIN_ACCESS_KEY);
      const cleanUrl = PAGE_URL_MAP[page] || '/admin-status.html';
      res.setHeader('Location', cleanUrl);
      return res.status(302).end();
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(401).send(loginPageHTML(page, '접근 키가 올바르지 않습니다.'));
    }
  }

  // 쿠키 / 토큰 / Referer 중 하나라도 통과하면 OK
  if (isAllowedByToken(req) || isAllowedByCookie(req) || isAllowedByReferer(req)) {
    try {
      const root = process.cwd();
      const buf = await readFile(join(root, filename), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(buf);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return res.status(404).json({ error: 'Page not found', page });
      }
      console.error('[admin-page] read error', e);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // 미인증 → HTML 로그인 폼
  if (!process.env.ADMIN_ACCESS_KEY) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(503).send(loginPageHTML(page,
      'ADMIN_ACCESS_KEY 환경변수가 등록되지 않았습니다.<br>Vercel 대시보드 → Project Settings → Environment Variables에서 등록 후 Redeploy 필요.<br><strong>등록 전까지는 누구도 admin 진입 불가 — 정식 오픈 전 안전 상태.</strong>'));
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(401).send(loginPageHTML(page, null));
}
