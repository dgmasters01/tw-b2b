// /api/admin/users-list.js
// admin/owner가 권한 화면에서 보는 리스트 조회 (BL-ADMIN-AUTH-V2)
// - admins 테이블 + pending invitations + 최근 활동 이력

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token' });

  const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });
  const { data: { user }, error: userErr } = await sbUser.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: caller } = await sbUser
    .from('admins').select('id, email, role, is_active').eq('id', user.id).maybeSingle();
  if (!caller || !caller.is_active || !['owner', 'admin', 'staff', 'readonly'].includes(caller.role)) {
    return res.status(403).json({ error: 'Insufficient permission' });
  }

  if (!SUPABASE_SR) return res.status(500).json({ error: 'Service role key not configured' });
  const sb = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

  // 1. admins 전체 (최근 활동 순)
  const { data: admins, error: aErr } = await sb
    .from('admins')
    .select('id, email, role, display_name, is_active, last_login_at, revoked_at, created_at, invited_by, invited_at')
    .order('created_at', { ascending: false });

  if (aErr) return res.status(500).json({ error: aErr.message });

  // 2. pending invitations
  const { data: invitations } = await sb
    .from('admin_invitations')
    .select('id, email, role, expires_at, invited_at, invited_by, display_name')
    .is('accepted_at', null)
    .is('cancelled_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('invited_at', { ascending: false });

  // 3. 최근 활동 이력 (50건)
  const { data: recentLog } = await sb
    .from('role_change_log')
    .select('id, target_user_id, target_email, action, before_role, after_role, before_active, after_active, performed_by_email, performed_at')
    .order('performed_at', { ascending: false })
    .limit(50);

  // 4. 통계
  const stats = {
    owner: 0, admin: 0, staff: 0, readonly: 0, manager: 0,
    active_total: 0, revoked_total: 0,
    pending_invitations: invitations?.length || 0
  };
  for (const a of admins || []) {
    if (stats[a.role] !== undefined) stats[a.role]++;
    if (a.is_active) stats.active_total++; else stats.revoked_total++;
  }

  return res.status(200).json({
    ok: true,
    caller: { id: caller.id, email: caller.email, role: caller.role },
    stats,
    admins: admins || [],
    invitations: invitations || [],
    recent_log: recentLog || []
  });
}
