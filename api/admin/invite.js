// /api/admin/invite.js
// 직원 초대 메일 발송 (BL-ADMIN-AUTH-V2)
// admin 이상만 호출 가능. 매니저 초대 불가 (매니저는 자체 가입).
// Resend로 발송. From: noreply@gohotelwinners.com.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://gohotelwinners.com';

const ALLOWED_ROLES = ['admin', 'staff', 'readonly'];

function genToken() {
  // 32자 URL-safe random
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token' });

  const { email, role, display_name, lang } = req.body || {};
  if (!email || !role) return res.status(400).json({ error: 'email + role required' });
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` });
  }

  // 1. 권한 확인 (admin 이상만)
  const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });

  const { data: { user }, error: userErr } = await sbUser.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: caller } = await sbUser
    .from('admins').select('id, email, role, is_active').eq('id', user.id).maybeSingle();

  if (!caller || !caller.is_active || !['owner', 'admin'].includes(caller.role)) {
    return res.status(403).json({ error: 'Only owner or admin can invite' });
  }

  // 2. 동일 email 활성 사용자 또는 미수락 초대 있는지 확인
  if (!SUPABASE_SR) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

  const { data: existing } = await sbAdmin
    .from('admins').select('id, role, is_active').eq('email', email).maybeSingle();

  if (existing && existing.is_active) {
    return res.status(409).json({ error: `User already exists as ${existing.role}` });
  }

  const { data: pendingInv } = await sbAdmin
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

  // 3. 초대 박기
  const inviteToken = genToken();
  const { data: invitation, error: invErr } = await sbAdmin
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

  // 4. role_change_log
  await sbAdmin.from('role_change_log').insert({
    target_user_id: '00000000-0000-0000-0000-000000000000',  // 아직 user_id 없음
    target_email: email,
    action: 'invited',
    after_role: role,
    after_active: false,
    performed_by: caller.id,
    performed_by_email: caller.email,
    metadata: { invitation_id: invitation.id }
  });

  // 5. 메일 발송 (Resend)
  if (!RESEND_KEY) {
    return res.status(200).json({
      ok: true,
      invitation_id: invitation.id,
      warning: 'Invitation created but email NOT sent (RESEND_API_KEY missing)',
      preview_url: `${SITE_URL}/admin-accept-invite.html?token=${inviteToken}&email=${encodeURIComponent(email)}`
    });
  }

  const mail = buildInviteEmail({
    to: email,
    role,
    token: inviteToken,
    inviterEmail: caller.email,
    displayName: display_name,
    lang: lang || 'ko'
  });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mail)
    });
    const result = await r.json();
    if (!r.ok) {
      return res.status(200).json({
        ok: true,
        invitation_id: invitation.id,
        warning: 'Invitation saved but Resend failed: ' + (result.message || r.statusText)
      });
    }
    return res.status(200).json({
      ok: true,
      invitation_id: invitation.id,
      email_id: result.id,
      sent_to: email
    });
  } catch (e) {
    return res.status(200).json({
      ok: true,
      invitation_id: invitation.id,
      warning: 'Invitation saved but Resend error: ' + e.message
    });
  }
}
