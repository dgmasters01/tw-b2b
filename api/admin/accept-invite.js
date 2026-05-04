// /api/admin/accept-invite.js
// 초대 토큰 검증 + 가입 처리 (BL-ADMIN-AUTH-V2)
//
// 흐름:
//   1) GET /api/admin/accept-invite?token=XXX&email=YYY
//        → 토큰 유효성 확인, role/inviter 정보 반환
//   2) POST /api/admin/accept-invite
//        body: { token, email, password, display_name }
//        → auth.users 생성 → 트리거가 admins에 박음

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return handleVerify(req, res);
  }
  if (req.method === 'POST') {
    return handleAccept(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleVerify(req, res) {
  const { token, email } = req.query;
  if (!token || !email) {
    return res.status(400).json({ error: 'token + email required' });
  }

  if (!SUPABASE_SR) {
    return res.status(500).json({ error: 'Service role key not configured' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

  const { data: inv, error } = await sb
    .from('admin_invitations')
    .select('id, email, role, expires_at, accepted_at, cancelled_at, display_name, invited_by')
    .eq('token', token)
    .eq('email', email)
    .maybeSingle();

  if (error || !inv) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  if (inv.accepted_at) {
    return res.status(410).json({ error: 'Invitation already accepted', accepted_at: inv.accepted_at });
  }
  if (inv.cancelled_at) {
    return res.status(410).json({ error: 'Invitation cancelled' });
  }
  if (new Date(inv.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Invitation expired', expires_at: inv.expires_at });
  }

  // 초대자 정보
  let inviterEmail = null;
  if (inv.invited_by) {
    const { data: inviter } = await sb
      .from('admins').select('email').eq('id', inv.invited_by).maybeSingle();
    inviterEmail = inviter?.email || null;
  }

  return res.status(200).json({
    ok: true,
    email: inv.email,
    role: inv.role,
    display_name: inv.display_name,
    expires_at: inv.expires_at,
    inviter_email: inviterEmail
  });
}

async function handleAccept(req, res) {
  const { token, email, password, display_name } = req.body || {};
  if (!token || !email || !password) {
    return res.status(400).json({ error: 'token + email + password required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!SUPABASE_SR) {
    return res.status(500).json({ error: 'Service role key not configured' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

  // 1. 초대 유효성 재확인
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

  // 2. auth.users 생성 (트리거가 invitation_token을 보고 role 박음)
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // 초대받은 사람은 자동 인증
    user_metadata: {
      invitation_token: token,
      display_name: display_name || inv.display_name || null
    }
  });

  if (createErr) {
    // 이미 가입된 이메일이면 admins 테이블 매핑만 해주고 invitation 수락 처리
    if (/already.*registered|already.*exists/i.test(createErr.message || '')) {
      return res.status(409).json({
        error: 'Email already registered. Please sign in and contact admin.',
        details: createErr.message
      });
    }
    return res.status(500).json({ error: 'Failed to create user: ' + createErr.message });
  }

  // 트리거가 자동으로 admins INSERT + invitation accepted + log 박음
  return res.status(200).json({
    ok: true,
    user_id: created.user.id,
    email: created.user.email,
    role: inv.role,
    message: 'Account created. Please sign in.'
  });
}
