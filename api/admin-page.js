// /api/admin-page.js
// 인증 게이트 — admin-*.html 정적 파일을 admin 전용으로 보호.
//
// 이유 (BL-REAL-SYSTEM 거짓말 3 해결):
//   admin-* 페이지에는 토큰 / 결제 정보 / 매니저 정보 / 작업 이력이 노출됨.
//   2026-05-04 진실 점검 결과: curl https://gohotelwinners.com/admin-status.html → 200 OK
//   → 누구나 접근 가능했음. 본 게이트로 차단.
//
// 라우팅 (vercel.json rewrites):
//   /admin-status.html       → /api/admin-page?page=status
//   /admin-tasks.html        → /api/admin-page?page=tasks
//   /admin-business.html     → /api/admin-page?page=business
//   /admin-service-ops.html  → /api/admin-page?page=service-ops
//   /admin-gallery.html      → /api/admin-page?page=gallery
//   /admin.html              → /api/admin-page?page=admin
//
// 우회 차단 (vercel.json redirects):
//   /admin-status / /admin-status/ / /admin/ / /admin/index.html → 정식 경로로 리다이렉트
//   (해당 경로도 결국 /api/admin-page를 통과)
//
// 인증:
//   ① x-admin-token 헤더 = process.env.ADMIN_VIEW_TOKEN  (Claude 자동화용, 미등록 시 미사용)
//   ② 또는 Referer가 gohotelwinners.com / tw-b2b.vercel.app인 경우  (브라우저 내부 이동)
//   ③ 또는 첫 진입 (Referer 없음)을 위해서는 ?key=ADMIN_ACCESS_KEY 쿼리 토큰 허용
//      → 미등록 시 첫 진입은 401 (장기 BL-ADMIN-AUTH로 Supabase Auth 도입 예정)
//
// chat-logs 패턴과 일관성을 위해 동일한 검증 함수 패턴 사용.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ALLOWED_REFERRER_HOSTS = ['gohotelwinners.com', 'www.gohotelwinners.com', 'tw-b2b.vercel.app'];

// page slug → 정적 파일명 매핑 (_admin/ 폴더 안)
// 폴더명 _ 접두사 → Vercel 정적 서빙 차단 (chat-logs 패턴 동일)
// 내부 링크는 그대로 /admin-status.html 형식 유지 — vercel rewrites가 흡수
const PAGE_FILE_MAP = {
  'status':       '_admin/admin-status.html',
  'tasks':        '_admin/admin-tasks.html',
  'business':     '_admin/admin-business.html',
  'service-ops':  '_admin/admin-service-ops.html',
  'gallery':      '_admin/admin-gallery.html',
  'admin':        '_admin/admin.html',
  'hub':          '_admin/admin-hub.html', // 폐기 안내 페이지 (혹시 직접 접근 시)
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
  // 첫 진입(북마크, 직접 입력) 허용용 — env에 ADMIN_ACCESS_KEY 등록 필요
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return false;
  const provided = String(req.query.key || '').trim();
  return provided && provided === expected;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 인증 (3가지 중 하나)
  const allowed = isAllowedByToken(req) || isAllowedByReferer(req) || isAllowedByQueryKey(req);
  if (!allowed) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(401).json({
      error: 'Unauthorized — admin view only',
      hint: 'Referer required (gohotelwinners.com) or ?key=... (env: ADMIN_ACCESS_KEY) or x-admin-token header',
    });
  }

  // page 검증
  const page = String(req.query.page || '').trim();
  const filename = PAGE_FILE_MAP[page];
  if (!filename) {
    return res.status(400).json({ error: 'Invalid page', allowed: Object.keys(PAGE_FILE_MAP) });
  }

  // 파일 읽기
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
