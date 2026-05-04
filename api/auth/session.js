// /api/auth/session.js
// 현재 로그인 사용자 정보 + role 반환 (admin 페이지 권한 체크용)
// BL-ADMIN-AUTH-V2

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'No token' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });

  try {
    const { data: { user }, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ authenticated: false, error: userErr?.message || 'Invalid token' });
    }

    // admins 테이블에서 role 조회
    const { data: adminRow, error: adminErr } = await sb
      .from('admins')
      .select('id, email, role, is_active, display_name, last_login_at, revoked_at')
      .eq('id', user.id)
      .maybeSingle();

    if (adminErr) {
      return res.status(500).json({ authenticated: false, error: adminErr.message });
    }

    if (!adminRow) {
      // auth.users에 있지만 admins에 없음 → 트리거 미작동 케이스. 즉시 manager로 박기
      return res.status(403).json({
        authenticated: true,
        registered: false,
        email: user.email,
        error: 'Account not registered in admins table'
      });
    }

    if (!adminRow.is_active || adminRow.revoked_at) {
      return res.status(403).json({
        authenticated: true,
        active: false,
        revoked_at: adminRow.revoked_at,
        error: 'Account revoked'
      });
    }

    // last_login_at 갱신 (best-effort, 실패해도 통과)
    sb.from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', user.id).then(() => {});

    return res.status(200).json({
      authenticated: true,
      registered: true,
      active: true,
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
  } catch (e) {
    console.error('[auth/session] error', e);
    return res.status(500).json({ authenticated: false, error: 'Internal error' });
  }
}
