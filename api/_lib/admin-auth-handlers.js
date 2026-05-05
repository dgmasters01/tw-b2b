// /api/admin-actions.js
// BL-ADMIN-AUTH-V2 라우터 통합 (D-016, 2026-05-04)
//
// Vercel Hobby 플랜 12개 함수 한도 회피를 위해 admin/* 4개를 1개로 통합.
// 기존 4개 (api/admin/{accept-invite, change-role, invite, users-list}.js) 폐기.
//
// 라우팅 (?action=...):
//   - users-list   GET    : 사용자 + 초대 + 활동이력 조회 (Owner/Admin/Staff/ReadOnly)
//   - invite       POST   : 초대 메일 발송 (Owner/Admin)
//   - accept-invite GET   : 초대 토큰 검증
//   - accept-invite POST  : 초대 수락 + 가입
//   - change-role  POST   : role 변경/박탈/복원 (Owner all, Admin → staff/readonly만)
//
// 공통 인증 (action=accept-invite 제외):
//   Authorization: Bearer <supabase_jwt>
//   → admins 테이블에서 caller 조회 → role/is_active 검증
//
// vercel.json rewrites가 기존 URL과 호환:
//   /api/admin/invite       → /api/admin-actions?action=invite
//   /api/admin/users-list   → /api/admin-actions?action=users-list
//   /api/admin/change-role  → /api/admin-actions?action=change-role
//   /api/admin/accept-invite → /api/admin-actions?action=accept-invite

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://gohotelwinners.com';

const ALL_ROLES = ['owner', 'admin', 'staff', 'readonly', 'manager'];
const INVITE_ROLES = ['admin', 'staff', 'readonly'];
const CHANGE_ACTIONS = ['change_role', 'revoke', 'restore'];

// ───────────────────────────────────────────────────────────────
// 공통 헬퍼
// ───────────────────────────────────────────────────────────────

function getBearerToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function getServiceClient() {
  if (!SUPABASE_SR) return null;
  return createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });
}

async function requireCaller(req, res, allowedRoles) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'No auth token' });
    return null;
  }
  const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });
  const { data: { user }, error: userErr } = await sbUser.auth.getUser(token);
  if (userErr || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  const { data: caller } = await sbUser
    .from('admins').select('id, email, role, is_active').eq('id', user.id).maybeSingle();
  if (!caller || !caller.is_active) {
    res.status(403).json({ error: 'Inactive account' });
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(caller.role)) {
    res.status(403).json({ error: 'Insufficient permission', required: allowedRoles, got: caller.role });
    return null;
  }
  return { caller, sbUser };
}

function genToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

// ───────────────────────────────────────────────────────────────
// 라우터 메인
// ───────────────────────────────────────────────────────────────

export default async function adminAuthHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const action = String(req.query.action || '').trim();

  try {
    switch (action) {
      case 'users-list':
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await handleUsersList(req, res);

      case 'invite':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        return await handleInvite(req, res);

      case 'accept-invite':
        if (req.method === 'GET') return await handleVerifyInvite(req, res);
        if (req.method === 'POST') return await handleAcceptInvite(req, res);
        return res.status(405).json({ error: 'Method not allowed' });

      case 'change-role':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        return await handleChangeRole(req, res);

      default:
        return res.status(400).json({
          error: 'Invalid or missing action',
          supported: ['users-list', 'invite', 'accept-invite', 'change-role']
        });
    }
  } catch (e) {
    console.error('[admin-actions]', action, 'error:', e);
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
}

// ───────────────────────────────────────────────────────────────
// 1) users-list (GET)
// ───────────────────────────────────────────────────────────────

async function handleUsersList(req, res) {
  const result = await requireCaller(req, res, ['owner', 'admin', 'staff', 'readonly']);
  if (!result) return;
  const { caller } = result;

  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: 'Service role key not configured' });

  const { data: admins, error: aErr } = await sb
    .from('admins')
    .select('id, email, role, display_name, is_active, last_login_at, revoked_at, created_at, invited_by, invited_at')
    .order('created_at', { ascending: false });
  if (aErr) return res.status(500).json({ error: aErr.message });

  const { data: invitations } = await sb
    .from('admin_invitations')
    .select('id, email, role, expires_at, invited_at, invited_by, display_name')
    .is('accepted_at', null)
    .is('cancelled_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('invited_at', { ascending: false });

  const { data: recentLog } = await sb
    .from('role_change_log')
    .select('id, target_user_id, target_email, action, before_role, after_role, before_active, after_active, performed_by_email, performed_at')
    .order('performed_at', { ascending: false })
    .limit(50);

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

// ───────────────────────────────────────────────────────────────
// 2) invite (POST) — 초대 메일 발송
// ───────────────────────────────────────────────────────────────

function buildInviteEmail({ to, role, token, inviterEmail, displayName, lang }) {
  const inviteUrl = `${SITE_URL}/admin-accept-invite.html?token=${token}&email=${encodeURIComponent(to)}`;
  const isKo = lang === 'ko';

  const fromName = isKo
    ? '여행능력자들 <noreply@gohotelwinners.com>'
    : 'TravelWinners <noreply@gohotelwinners.com>';

  const koSubject = `[여행능력자들] ${role} 권한 초대 — ${inviterEmail}님이 보내셨습니다`;
  const enSubject = `[TravelWinners] You're invited as ${role} by ${inviterEmail}`;

  const koHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Pretendard,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#222">
      <h2 style="margin:0 0 16px;color:#6366f1">여행능력자들 관리자 초대</h2>
      <p>안녕하세요${displayName ? ', ' + displayName + '님' : ''}.</p>
      <p><strong>${inviterEmail}</strong>님이 회원님을 <strong>${role}</strong> 권한으로 초대하셨습니다.</p>
      <p style="margin:24px 0">
        <a href="${inviteUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">초대 수락하고 가입하기</a>
      </p>
      <p style="font-size:13px;color:#666">또는 다음 링크를 복사해 브라우저에 붙여넣어 주세요:<br>
        <span style="word-break:break-all">${inviteUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:12px;color:#999">이 링크는 7일 후 만료됩니다. 초대를 받지 않으셨다면 이 메일을 무시하시면 됩니다.</p>
    </div>`;

  const enHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#222">
      <h2 style="margin:0 0 16px;color:#6366f1">TravelWinners Admin Invitation</h2>
      <p>Hello${displayName ? ', ' + displayName : ''}.</p>
      <p><strong>${inviterEmail}</strong> has invited you to join as <strong>${role}</strong>.</p>
      <p style="margin:24px 0">
        <a href="${inviteUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Accept invitation</a>
      </p>
      <p style="font-size:13px;color:#666">Or copy this URL into your browser:<br>
        <span style="word-break:break-all">${inviteUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:12px;color:#999">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore this email.</p>
    </div>`;

  return {
    from: fromName,
    to,
    reply_to: 'info@gohotelwinners.com',
    subject: isKo ? koSubject : enSubject,
    html: isKo ? koHtml : enHtml
  };
}

async function handleInvite(req, res) {
  const result = await requireCaller(req, res, ['owner', 'admin']);
  if (!result) return;
  const { caller } = result;

  const { email, role, display_name, lang } = req.body || {};
  if (!email || !role) return res.status(400).json({ error: 'email + role required' });
  if (!INVITE_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Allowed: ${INVITE_ROLES.join(', ')}` });
  }

  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

  // 동일 이메일 활성 사용자 확인
  const { data: existing } = await sb
    .from('admins').select('id, role, is_active').eq('email', email).maybeSingle();
  if (existing && existing.is_active) {
    return res.status(409).json({ error: `User already exists as ${existing.role}` });
  }

  // 미수락 초대 확인
  const { data: pendingInv } = await sb
    .from('admin_invitations')
    .select('id, expires_at')
    .eq('email', email)
    .is('accepted_at', null)
    .is('cancelled_at', null)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();
  if (pendingInv) {
    return res.status(409).json({ error: 'Pending invitation already exists', invitation_id: pendingInv.id });
  }

  // 초대 박기
  const inviteToken = genToken();
  const { data: invitation, error: invErr } = await sb
    .from('admin_invitations')
    .insert({
      email,
      role,
      token: inviteToken,
      invited_by: caller.id,
      display_name: display_name || null
    })
    .select()
    .single();
  if (invErr) {
    return res.status(500).json({ error: 'Failed to create invitation: ' + invErr.message });
  }

  // 활동 이력
  await sb.from('role_change_log').insert({
    target_user_id: '00000000-0000-0000-0000-000000000000',
    target_email: email,
    action: 'invited',
    after_role: role,
    after_active: false,
    performed_by: caller.id,
    performed_by_email: caller.email,
    metadata: { invitation_id: invitation.id }
  });

  // 메일 발송
  if (!RESEND_KEY) {
    return res.status(200).json({
      ok: true,
      invitation_id: invitation.id,
      warning: 'Invitation created but email NOT sent (RESEND_API_KEY missing)',
      preview_url: `${SITE_URL}/admin-accept-invite.html?token=${inviteToken}&email=${encodeURIComponent(email)}`
    });
  }

  const mail = buildInviteEmail({
    to: email, role, token: inviteToken,
    inviterEmail: caller.email, displayName: display_name, lang: lang || 'ko'
  });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(mail)
    });
    const result = await r.json();
    if (!r.ok) {
      return res.status(200).json({
        ok: true, invitation_id: invitation.id,
        warning: 'Invitation saved but Resend failed: ' + (result.message || r.statusText)
      });
    }
    return res.status(200).json({
      ok: true, invitation_id: invitation.id, email_id: result.id, sent_to: email
    });
  } catch (e) {
    return res.status(200).json({
      ok: true, invitation_id: invitation.id,
      warning: 'Invitation saved but Resend error: ' + e.message
    });
  }
}

// ───────────────────────────────────────────────────────────────
// 3a) accept-invite (GET) — 토큰 검증
// ───────────────────────────────────────────────────────────────

async function handleVerifyInvite(req, res) {
  const { token, email } = req.query;
  if (!token || !email) return res.status(400).json({ error: 'token + email required' });

  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: 'Service role key not configured' });

  const { data: inv, error } = await sb
    .from('admin_invitations')
    .select('id, email, role, expires_at, accepted_at, cancelled_at, display_name, invited_by')
    .eq('token', token)
    .eq('email', email)
    .maybeSingle();
  if (error || !inv) return res.status(404).json({ error: 'Invitation not found' });

  if (inv.accepted_at) {
    return res.status(410).json({ error: 'Invitation already accepted', accepted_at: inv.accepted_at });
  }
  if (inv.cancelled_at) {
    return res.status(410).json({ error: 'Invitation cancelled' });
  }
  if (new Date(inv.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Invitation expired', expires_at: inv.expires_at });
  }

  let inviterEmail = null;
  if (inv.invited_by) {
    const { data: inviter } = await sb
      .from('admins').select('email').eq('id', inv.invited_by).maybeSingle();
    inviterEmail = inviter?.email || null;
  }

  return res.status(200).json({
    ok: true,
    email: inv.email, role: inv.role,
    display_name: inv.display_name,
    expires_at: inv.expires_at,
    inviter_email: inviterEmail
  });
}

// ───────────────────────────────────────────────────────────────
// 3b) accept-invite (POST) — 가입 처리
// ───────────────────────────────────────────────────────────────

async function handleAcceptInvite(req, res) {
  const { token, email, password, display_name } = req.body || {};
  if (!token || !email || !password) {
    return res.status(400).json({ error: 'token + email + password required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: 'Service role key not configured' });

  const { data: inv } = await sb
    .from('admin_invitations')
    .select('id, email, role, expires_at, accepted_at, cancelled_at, display_name')
    .eq('token', token)
    .eq('email', email)
    .maybeSingle();
  if (!inv) return res.status(404).json({ error: 'Invitation not found' });
  if (inv.accepted_at) return res.status(410).json({ error: 'Already accepted' });
  if (inv.cancelled_at) return res.status(410).json({ error: 'Cancelled' });
  if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Expired' });

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      invitation_token: token,
      display_name: display_name || inv.display_name || null
    }
  });

  if (createErr) {
    if (/already.*registered|already.*exists/i.test(createErr.message || '')) {
      return res.status(409).json({
        error: 'Email already registered. Please sign in and contact admin.',
        details: createErr.message
      });
    }
    return res.status(500).json({ error: 'Failed to create user: ' + createErr.message });
  }

  return res.status(200).json({
    ok: true,
    user_id: created.user.id,
    email: created.user.email,
    role: inv.role,
    message: 'Account created. Please sign in.'
  });
}

// ───────────────────────────────────────────────────────────────
// 4) change-role (POST) — role 변경/박탈/복원
// ───────────────────────────────────────────────────────────────

async function handleChangeRole(req, res) {
  const { target_id, new_role, action } = req.body || {};
  if (!target_id || !action) return res.status(400).json({ error: 'target_id + action required' });
  if (!CHANGE_ACTIONS.includes(action)) return res.status(400).json({ error: 'Invalid action' });
  if (action === 'change_role' && (!new_role || !ALL_ROLES.includes(new_role))) {
    return res.status(400).json({ error: 'Invalid new_role for change_role action' });
  }

  // 호출자: owner 또는 admin (admin은 staff/readonly만 변경 가능 — 아래에서 검증)
  const result = await requireCaller(req, res, ['owner', 'admin']);
  if (!result) return;
  const { caller } = result;

  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: 'Service role key not configured' });

  const { data: target, error: tgtErr } = await sb
    .from('admins').select('*').eq('id', target_id).maybeSingle();
  if (tgtErr || !target) return res.status(404).json({ error: 'Target not found' });

  // 권한 매트릭스 (admin은 owner/admin/manager 변경 차단)
  if (caller.role === 'admin') {
    if (target.role === 'owner' || target.role === 'admin' || target.role === 'manager') {
      return res.status(403).json({ error: 'Admins can only change staff/readonly accounts' });
    }
    if (action === 'change_role' && !['staff', 'readonly'].includes(new_role)) {
      return res.status(403).json({ error: 'Admins can only assign staff/readonly' });
    }
  }
  // owner는 모든 변경 가능 (단 owner 본인 변경 차단은 DB 트리거가 처리)

  // 실제 변경
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
    updateData = { is_active: true, revoked_at: null, revoked_by: null };
    afterActive = true;
    logAction = 'restored';
  }

  const { error: updErr } = await sb
    .from('admins').update(updateData).eq('id', target_id);
  if (updErr) {
    if (/Owner.*cannot/i.test(updErr.message)) {
      return res.status(403).json({ error: 'Owner account is protected: ' + updErr.message });
    }
    return res.status(500).json({ error: 'Update failed: ' + updErr.message });
  }

  // revoke 시 모든 세션 종료
  if (action === 'revoke') {
    try { await sb.auth.admin.signOut(target_id); } catch (e) {
      console.warn('[change-role] signOut failed:', e.message);
    }
  }

  // 활동 이력
  await sb.from('role_change_log').insert({
    target_user_id: target.id,
    target_email: target.email,
    action: logAction,
    before_role: beforeRole, after_role: afterRole,
    before_active: beforeActive, after_active: afterActive,
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
