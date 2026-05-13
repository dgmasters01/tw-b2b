// /api/admin-page.js (BL-ADMIN-AUTH-V2 — 재작성)
// 임시 비번 시스템(ADMIN_ACCESS_KEY 쿠키) 폐기됨.
// 이제는 Supabase 세션 토큰만 인증 수단.
//
// 인증 흐름:
//   1) 쿠키 sb-access-token 확인
//   2) 또는 Authorization: Bearer 헤더 (Claude/스크립트 자동화)
//   3) 또는 x-admin-token (서비스 토큰, 운영 모드 후 자동화 전용)
//   → 토큰으로 Supabase auth.getUser() 호출
//   → admins 테이블에서 role 확인
//   → admin/staff/readonly/owner만 통과
//   → manager는 /dashboard.html로 리다이렉트
//   → 그 외 → /admin-login.html

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// page slug → 정적 파일명 매핑 (_admin/ 폴더 안)
const PAGE_FILE_MAP = {
  'status':            '_admin/admin-status.html',
  'tasks':             '_admin/admin-tasks.html',
  'business':          '_admin/admin-business.html',
  'service-ops':       '_admin/admin-service-ops.html',
  'gallery':           '_admin/admin-gallery.html',
  'admin':             '_admin/admin.html',
  'hub':               '_admin/admin-hub.html',
  'permissions':       '_admin/admin-permissions.html',
  // BL-OS-PHASE-5 단계 2 — DOCS 5개
  'business-charter':  '_admin/admin-business-charter.html',
  'decisions':         '_admin/admin-decisions.html',
  'decisions-index':   '_admin/admin-decisions-index.html',
  // BL-RENAME-GOHOTEL (D-031, 2026-05-13) — journey → gohotel
  'gohotel-manager-stages': '_admin/admin-gohotel-manager-stages.html',
  'gohotel-overview':       '_admin/admin-gohotel-overview.html',
  // 구 이름 (호환성 유지 — vercel.json 301 redirect와 별도로 직접 호출 대비)
  'manager-journey':        '_admin/admin-gohotel-manager-stages.html',
  'user-journey':           '_admin/admin-gohotel-overview.html',
};

const PAGE_MIN_ROLE = {
  'status':            'readonly',
  'tasks':             'readonly',
  'business':          'readonly',
  'service-ops':       'readonly',
  'gallery':           'readonly',
  'admin':             'staff',
  'hub':               'readonly',
  'permissions':       'admin',
  // BL-OS-PHASE-5 단계 2 — DOCS 5개 (readonly로 통일)
  'business-charter':  'readonly',
  'decisions':         'readonly',
  'decisions-index':   'readonly',
  // BL-RENAME-GOHOTEL (D-031, 2026-05-13) — 새 이름 + 구 이름 호환성
  'gohotel-manager-stages': 'readonly',
  'gohotel-overview':       'readonly',
  'manager-journey':        'readonly',
  'user-journey':           'readonly',
};

function roleHasAccess(callerRole, requiredRole) {
  const order = { 'owner': 5, 'admin': 4, 'staff': 3, 'readonly': 2, 'manager': 0 };
  return (order[callerRole] || 0) >= (order[requiredRole] || 0);
}

function parseCookies(req) {
  const out = {};
  const header = req.headers['cookie'] || '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    out[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
  }
  return out;
}

function loginRedirectHTML(currentPage, reason) {
  const safePage = (currentPage || 'status').replace(/[^a-z0-9-]/gi, '');
  const reasonText = reason || '인증이 필요합니다';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>관리자 인증 — TravelWinners B2B</title>
<style>
  body { margin: 0; min-height: 100vh; background: #0a0a0f; color: #e5e7eb;
         display: flex; align-items: center; justify-content: center;
         font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
         background-image: radial-gradient(ellipse at top, rgba(167,139,250,0.15), transparent 70%); }
  .card { background: rgba(20,20,30,0.85); border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 40px 32px; width: min(420px, 92vw); text-align: center;
          backdrop-filter: blur(20px); }
  .lock { font-size: 36px; margin-bottom: 12px; }
  h1 { margin: 0 0 8px; font-size: 18px; }
  .sub { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
  .reason { background: rgba(248,113,113,0.1); color: #fca5a5; padding: 10px;
            border-radius: 6px; font-size: 12px; margin-bottom: 16px; }
  a { display: inline-block; margin-top: 8px; padding: 12px 24px;
      background: linear-gradient(135deg, #a78bfa, #6366f1); color: #fff;
      border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; }
</style>
</head>
<body>
<div class="card">
  <div class="lock">🔒</div>
  <h1>관리자 인증 필요</h1>
  <div class="sub">TravelWinners B2B — admin 영역</div>
  <div class="reason">${reasonText}</div>
  <a href="/admin-login.html?next=${safePage}">로그인하기</a>
</div>
<script>
  setTimeout(function(){ window.location.href = '/admin-login.html?next=${safePage}'; }, 3000);
</script>
</body>
</html>`;
}

function managerRedirectHTML() {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>매니저 페이지로 이동</title>
<meta http-equiv="refresh" content="0;url=/dashboard.html">
</head><body><script>window.location.href='/dashboard.html';</script>
<p>매니저 페이지로 이동합니다... <a href="/dashboard.html">클릭하세요</a></p>
</body></html>`;
}

async function verifySupabaseToken(token) {
  if (!token || !SUPABASE_ANON) return null;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !user) return null;

    const { data: adminRow } = await sb
      .from('admins')
      .select('id, email, role, is_active, revoked_at')
      .eq('id', user.id)
      .maybeSingle();

    if (!adminRow || !adminRow.is_active || adminRow.revoked_at) return null;
    return { user_id: adminRow.id, email: adminRow.email, role: adminRow.role };
  } catch (e) {
    console.error('[admin-page] verifySupabaseToken error', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const page = String(req.query.page || 'status').trim();
  const filename = PAGE_FILE_MAP[page];
  if (!filename) {
    return res.status(400).json({ error: 'Invalid page', allowed: Object.keys(PAGE_FILE_MAP) });
  }
  const requiredRole = PAGE_MIN_ROLE[page] || 'readonly';

  // 토큰 추출 (쿠키 → Authorization → x-admin-token)
  const cookies = parseCookies(req);
  let token = cookies['sb-access-token'] || null;

  if (!token) {
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7);
  }
  if (!token) {
    token = req.headers['x-admin-token'] || null;
  }

  if (!token) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(401).send(loginRedirectHTML(page, '로그인이 필요합니다'));
  }

  const session = await verifySupabaseToken(token);
  if (!session) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(401).send(loginRedirectHTML(page, '세션이 만료되었거나 유효하지 않습니다'));
  }

  if (session.role === 'manager') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(managerRedirectHTML());
  }

  if (!roleHasAccess(session.role, requiredRole)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(loginRedirectHTML(page,
      `이 페이지는 ${requiredRole} 이상 권한이 필요합니다 (현재: ${session.role})`));
  }

  try {
    const root = process.cwd();
    const buf = await readFile(join(root, filename), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // ★ BL-CACHE-BUST — admin 페이지 무조건 no-cache (개발 단계 동안 stale UI 차단)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).send(buf);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return res.status(404).json({ error: 'Page not found', page });
    }
    console.error('[admin-page] read error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
