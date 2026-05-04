// /api/admin/change-role.js
// role 변경 / 박탈 / 복원 (BL-ADMIN-AUTH-V2)
// owner만 호출 가능 (admin은 staff/readonly 변경만, manager 변경 불가)
//
// body: { target_id, new_role?, action: 'change_role'|'revoke'|'restore' }

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_ROLES = ['owner', 'admin', 'staff', 'readonly', 'manager'];
const VALID_ACTIONS = ['change_role', 'revoke', 'restore'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token' });

  const { target_id, new_role, action } = req.body || {};
  if (!target_id || !action) return res.status(400).json({ error: 'target_id + action required' });
  if (!VALID_ACTIONS.includes(action)) return res.status(400).json({ error: 'Invalid action' });
  if (action === 'change_role' && (!new_role || !VALID_ROLES.includes(new_role))) {
    return res.status(400).json({ error: 'Invalid new_role for change_role action' });
  }

  // 1. 호출자 확인
  const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });
  const { data: { user }, error: userErr } = await sbUser.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: caller } = await sbUser
    .from('admins').select('id, email, role, is_active').eq('id', user.id).maybeSingle();
  if (!caller || !caller.is_active) return res.status(403).json({ error: 'Inactive account' });

  if (!SUPABASE_SR) return res.status(500).json({ error: 'Service role key not configured' });
  const sb = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

  // 2. 대상 사용자 조회
  const { data: target, error: tgtErr } = await sb
    .from('admins').select('*').eq('id', target_id).maybeSingle();
  if (tgtErr || !target) return res.status(404).json({ error: 'Target not found' });

  // 3. 권한 매트릭스
  // - owner: 모든 변경 가능 (단, owner 본인 변경 차단은 DB 트리거가 처리)
  // - admin: staff/readonly만 변경/박탈 가능. owner/admin/manager 변경 차단
  // - 그 외: 모든 변경 차단
  if (caller.role === 'owner') {
    // OK — DB 트리거가 owner 본인 보호
  } else if (caller.role === 'admin') {
    if (target.role === 'owner' || target.role === 'admin' || target.role === 'manager') {
      return res.status(403).json({ error: 'Admins can only change staff/readonly accounts' });
    }
    if (action === 'change_role' && !['staff', 'readonly'].includes(new_role)) {
      return res.status(403).json({ error: 'Admins can only assign staff/readonly' });
    }
  } else {
    return res.status(403).json({ error: 'Insufficient permission' });
  }

  // 4. 실제 변경
  let updateData = {};
  let logAction = '';
  let beforeRole = target.role;
  let beforeActive = target.is_active;
  let afterRole = target.role;
  let afterActive = target.is_active;

  if (action === 'change_role') {
    updateData = { role: new_role };
    afterRole = new_role;
    logAction = 'role_changed';
  } else if (action === 'revoke') {
    updateData = {
      is_active: false,
      revoked_at: new Date().toISOString(),
      revoked_by: caller.id
    };
    afterActive = false;
    logAction = 'revoked';
  } else if (action === 'restore') {
    updateData = {
      is_active: true,
      revoked_at: null,
      revoked_by: null
    };
    afterActive = true;
    logAction = 'restored';
  }

  const { error: updErr } = await sb
    .from('admins').update(updateData).eq('id', target_id);

  if (updErr) {
    // DB 트리거가 owner 보호 차단한 경우
    if (/Owner.*cannot/i.test(updErr.message)) {
      return res.status(403).json({ error: 'Owner account is protected: ' + updErr.message });
    }
    return res.status(500).json({ error: 'Update failed: ' + updErr.message });
  }

  // 5. revoke 시 모든 세션 종료 (auth admin API)
  if (action === 'revoke') {
    try {
      await sb.auth.admin.signOut(target_id);
    } catch (e) {
      console.warn('[change-role] signOut failed:', e.message);
    }
  }

  // 6. role_change_log
  await sb.from('role_change_log').insert({
    target_user_id: target.id,
    target_email: target.email,
    action: logAction,
    before_role: beforeRole,
    after_role: afterRole,
    before_active: beforeActive,
    after_active: afterActive,
    performed_by: caller.id,
    performed_by_email: caller.email
  });

  return res.status(200).json({
    ok: true,
    target_id: target.id,
    target_email: target.email,
    action,
    before: { role: beforeRole, active: beforeActive },
    after: { role: afterRole, active: afterActive }
  });
}
