/**
 * Vercel Routing Middleware — admin-* 페이지 SSR 인증 게이트
 * ===========================================================================
 * BL-ADMIN-AUTH-PERF (D-021) — A-2 정석 (단일 게이트)
 *
 * 스택:
 *   Vercel Routing Middleware (framework-agnostic, Edge Runtime 기본).
 *   이 프로젝트는 Vanilla HTML/JS (framework: null) — 프로젝트 일관성 위해 .js 사용.
 *   Web Standard Request / Response 만 사용 (Next.js 의존 없음).
 *
 * 역할:
 *   admin-* 페이지 요청을 Edge Runtime에서 가로채 인증 검증.
 *   비인증 요청은 즉시 /login.html 리디렉트 (HTML 받기 전).
 *   인증 통과 요청만 admin HTML 반환.
 *
 * 정책:
 *   - 검증 로직 단일 진실원: 이 파일 1개. 페이지 안에 인증 코드 없음 (2편에서 제거).
 *   - Vercel Hobby 12 함수 한도 회피: Routing Middleware는 함수 카운트에서 분리됨.
 *   - shared.js의 BL-AUTH-COOKIE-SYNC가 박아둔 sb-access-token 쿠키 활용.
 *
 * 검증 흐름:
 *   1. matcher가 admin-* 만 통과 — admin-login/invite는 path 분기로 통과
 *   2. sb-access-token 쿠키 추출 → 없으면 /login.html?reason=no_session 리디렉트
 *   3. Supabase /auth/v1/user 호출 (paypal.js verifyUser와 동일 패턴)
 *   4. Supabase /rest/v1/rpc/is_admin 호출 (RLS SECURITY DEFINER)
 *   5. is_admin === true → 통과, 아니면 /login.html?reason=not_admin
 *
 * 환경변수 (Vercel Project Settings):
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY (또는 SUPABASE_PUBLISHABLE_KEY)
 *
 * 동작 규약 (Vercel Routing Middleware API):
 *   - Response 반환 → 그 Response를 클라이언트에 그대로 보냄 (인터셉트)
 *   - undefined 반환 → 원본 요청을 정적/동적 라우팅으로 통과
 *
 * 참조:
 *   - https://vercel.com/docs/routing-middleware/api (2026-01-28)
 *   - api/paypal.js verifyUser() — Supabase JWT 검증 패턴 원본
 *   - shared.js L21-48 — BL-AUTH-COOKIE-SYNC (sb-access-token 박는 곳)
 * ===========================================================================
 */

// ──────────────────────────────────────────────────────────────────────────
// 환경변수
// ──────────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  'https://vjsludfjsphwnumuoqaj.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

// ──────────────────────────────────────────────────────────────────────────
// 유틸 — 쿠키 추출 (Web Standard, 라이브러리 의존 없음)
// ──────────────────────────────────────────────────────────────────────────
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.split('=');
    if (!rawName) continue;
    const name = rawName.trim();
    const value = rest.join('=').trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

function getAccessToken(req) {
  const cookies = parseCookies(req.headers.get('cookie'));

  // BL-AUTH-COOKIE-SYNC가 박은 sb-access-token (shared.js L30 참조)
  const direct = cookies['sb-access-token'];
  if (direct) return direct;

  // Fallback: Supabase JS 기본 쿠키 (sb-{ref}-auth-token, JSON 인코딩)
  const ref = SUPABASE_URL.replace('https://', '').split('.')[0];
  const fallback = cookies[`sb-${ref}-auth-token`];
  if (!fallback) return null;
  try {
    const parsed = JSON.parse(fallback);
    return (parsed && parsed.access_token) || null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 유틸 — Supabase JWT 검증 (paypal.js verifyUser와 동일)
// ──────────────────────────────────────────────────────────────────────────
async function verifyUser(accessToken) {
  if (!accessToken || !SUPABASE_ANON_KEY) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.id ? { id: data.id, email: data.email } : null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 유틸 — is_admin RPC 호출 (RLS SECURITY DEFINER, shared.js와 동일 RPC)
// ──────────────────────────────────────────────────────────────────────────
async function checkIsAdmin(accessToken) {
  if (!accessToken || !SUPABASE_ANON_KEY) return false;
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data === true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 유틸 — 리디렉트 응답 빌더
// ──────────────────────────────────────────────────────────────────────────
function redirectToLogin(req, reason) {
  const reqUrl = new URL(req.url);
  const loginUrl = new URL('/login.html', reqUrl.origin);
  loginUrl.searchParams.set('reason', reason);
  loginUrl.searchParams.set('next', reqUrl.pathname + reqUrl.search);
  return new Response(null, {
    status: 302,
    headers: {
      Location: loginUrl.toString(),
      'Cache-Control': 'no-store',
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 메인 — Routing Middleware 진입점 (default export 의무)
// ──────────────────────────────────────────────────────────────────────────
export default async function middleware(req) {
  const { pathname } = new URL(req.url);

  // admin-login / admin-accept-invite 는 인증 전 페이지 — 통과
  if (
    pathname === '/admin-login.html' ||
    pathname === '/admin-accept-invite.html' ||
    pathname === '/admin-login' ||
    pathname === '/admin-accept-invite'
  ) {
    return undefined;
  }

  // Step 1: 쿠키에서 access_token 추출
  const token = getAccessToken(req);
  if (!token) {
    return redirectToLogin(req, 'no_session');
  }

  // Step 2: JWT 유효성 + user.id 확보
  const user = await verifyUser(token);
  if (!user) {
    return redirectToLogin(req, 'invalid_session');
  }

  // Step 3: is_admin RPC
  const isAdmin = await checkIsAdmin(token);
  if (!isAdmin) {
    return redirectToLogin(req, 'not_admin');
  }

  // Step 4: 검증 통과 — undefined 반환 시 Vercel이 원본 admin HTML 서빙
  return undefined;
}

// ──────────────────────────────────────────────────────────────────────────
// Matcher — admin-* 페이지만 가로챔
// ──────────────────────────────────────────────────────────────────────────
// 정책:
//   - admin-login / admin-accept-invite: matcher에 포함하지만 함수 안에서 path 분기로 통과
//   - /_admin/*: 안전망 (vercel.json 리디렉트와 함께 작동)
//   - api/*, 정적 자산은 matcher에서 자동 제외 (admin-*만 명시)
//
// 주의:
//   - matcher 문법은 path-to-regexp (Next.js와 동일).
//   - 실제 패턴 작동은 2편 라이브 배포 + vercel dev로 사전 검증 필요.
// ──────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/admin-:path*.html',
    '/admin.html',
    '/admin-:path*',
    '/admin',
    '/_admin/:path*',
  ],
};
