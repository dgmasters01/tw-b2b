// /api/auth.js
// BL-ADMIN-AUTH-V2 인증 라우터 (D-016, 2026-05-04)
//
// Vercel Hobby 12개 함수 한도 회피 + 추후 확장 대비.
// 기존 api/auth/session.js 폐기.
//
// 라우팅 (?action=...):
//   - session  GET/POST  : 현재 로그인 사용자 + role 반환
//
// 추후 확장 예정 (한 함수에 case 추가):
//   - oauth-callback   : Google OAuth 콜백 핸들러
//   - verify-email     : 이메일 인증 처리
//   - reset-password   : 비밀번호 재설정
//
// vercel.json rewrites:
//   /api/auth/session → /api/auth?action=session

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const action = String(req.query.action || 'session').trim();

  try {
    switch (action) {
      case 'session':
        if (req.method !== 'GET' && req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await handleSession(req, res);

      default:
        return res.status(400).json({
          error: 'Invalid action',
          supported: ['session']
        });
    }
  } catch (e) {
    console.error('[auth]', action, 'error:', e);
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
}

async function handleSession(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'No token' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });

  const { data: { user }, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !user) {
    return res.status(401).json({ authenticated: false, error: userErr?.message || 'Invalid token' });
  }

  const { data: adminRow, error: adminErr } = await sb
    .from('admins')
    .select('id, email, role, is_active, display_name, last_login_at, revoked_at')
    .eq('id', user.id)
    .maybeSingle();

  if (adminErr) {
    return res.status(500).json({ authenticated: false, error: adminErr.message });
  }

  if (!adminRow) {
    return res.status(403).json({
      authenticated: true, registered: false,
      email: user.email,
      error: 'Account not registered in admins table'
    });
  }

  if (!adminRow.is_active || adminRow.revoked_at) {
    return res.status(403).json({
      authenticated: true, active: false,
      revoked_at: adminRow.revoked_at,
      error: 'Account revoked'
    });
  }

  // last_login_at 갱신 (best-effort)
  sb.from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', user.id).then(() => {});

  return res.status(200).json({
    authenticated: true, registered: true, active: true,
    user: {
      id: adminRow.id,
      email: adminRow.email,
      role: adminRow.role,
      display_name: adminRow.display_name,
      is_owner: adminRow.role === 'owner',
      is_admin: ['owner', 'admin', 'staff'].includes(adminRow.role),
      can_read: ['owner', 'admin', 'staff', 'readonly'].includes(adminRow.role),
      is_manager: adminRow.role === 'manager'
    }
  });
}
