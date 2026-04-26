// /api/admin-list-users.js
// 관리자만 호출 가능 — Supabase Auth 사용자 + hotels 정보 조인

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  // 1. 호출자 토큰 검증 → 관리자 권한 확인
  const auth = req.headers.authorization || '';
  const callerToken = auth.replace(/^Bearer\s+/i, '');
  if (!callerToken) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    // 호출자 정보 조회
    const meResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${callerToken}`, 'apikey': serviceKey }
    });
    if (!meResp.ok) return res.status(401).json({ error: 'Invalid token' });
    const me = await meResp.json();
    const myEmail = me.email;

    // 관리자 권한 확인
    const adminCheck = await fetch(
      `${supabaseUrl}/rest/v1/admins?email=eq.${encodeURIComponent(myEmail)}&select=role,is_active`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const admins = await adminCheck.json();
    if (!admins || admins.length === 0 || !admins[0].is_active) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 2. 모든 사용자 목록 조회 (service_role)
    const usersResp = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, {
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
    });
    const usersData = await usersResp.json();
    const users = usersData.users || [];

    // 3. 모든 호텔 조회 (user_id 매핑용)
    const hotelsResp = await fetch(
      `${supabaseUrl}/rest/v1/hotels?select=id,user_id,hotel_name,status,created_at`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const hotels = await hotelsResp.json();
    const hotelsByUser = {};
    (hotels || []).forEach(h => {
      if (h.user_id) {
        if (!hotelsByUser[h.user_id]) hotelsByUser[h.user_id] = [];
        hotelsByUser[h.user_id].push(h);
      }
    });

    // 4. 관리자 목록 조회 (admin 표시용)
    const adminsResp = await fetch(
      `${supabaseUrl}/rest/v1/admins?select=email,role`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const allAdmins = await adminsResp.json();
    const adminEmails = {};
    (allAdmins || []).forEach(a => { adminEmails[a.email.toLowerCase()] = a.role; });

    // 5. 필터링: 관리자 제외한 매니저만
    const members = users
      .filter(u => !adminEmails[u.email.toLowerCase()])
      .map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        is_verified: !!u.email_confirmed_at,
        is_banned: u.banned_until && new Date(u.banned_until) > new Date(),
        hotels: hotelsByUser[u.id] || []
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      success: true,
      members,
      total: members.length
    });

  } catch (err) {
    console.error('admin-list-users error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}
