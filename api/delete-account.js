// /api/delete-account.js
// 매니저 본인 계정 + 모든 관련 데이터 삭제

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  const auth = req.headers.authorization || '';
  const callerToken = auth.replace(/^Bearer\s+/i, '');
  if (!callerToken) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    // 1. 호출자 검증
    const meResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${callerToken}`, 'apikey': serviceKey }
    });
    if (!meResp.ok) return res.status(401).json({ error: 'Invalid token' });
    const me = await meResp.json();
    const userId = me.id;
    const myEmail = me.email;

    // 2. 관리자는 회원 탈퇴 API로 삭제 못 함 (Team 페이지에서 별도 처리)
    const adminCheck = await fetch(
      `${supabaseUrl}/rest/v1/admins?email=eq.${encodeURIComponent(myEmail)}&select=role`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const admins = await adminCheck.json();
    if (admins && admins.length > 0) {
      return res.status(403).json({ 
        error: 'Admin accounts cannot be self-deleted. Contact super admin.' 
      });
    }

    // 3. 사용자 호텔 ID 조회 (cascade 삭제용)
    const hotelsResp = await fetch(
      `${supabaseUrl}/rest/v1/hotels?user_id=eq.${userId}&select=id`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const hotels = await hotelsResp.json();
    const hotelIds = (hotels || []).map(h => h.id);

    // 4. 관련 데이터 삭제 (순서: 자식 → 부모)
    if (hotelIds.length > 0) {
      const idList = hotelIds.map(id => `"${id}"`).join(',');
      
      // hotel_status_history
      await fetch(
        `${supabaseUrl}/rest/v1/hotel_status_history?hotel_id=in.(${idList})`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
      );
      
      // bookings
      await fetch(
        `${supabaseUrl}/rest/v1/bookings?hotel_id=in.(${idList})`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
      );
      
      // videos
      await fetch(
        `${supabaseUrl}/rest/v1/videos?hotel_id=in.(${idList})`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
      );
      
      // admin_notes
      await fetch(
        `${supabaseUrl}/rest/v1/admin_notes?hotel_id=in.(${idList})`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
      );
    }

    // payments
    await fetch(
      `${supabaseUrl}/rest/v1/payments?user_id=eq.${userId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );

    // hotels
    await fetch(
      `${supabaseUrl}/rest/v1/hotels?user_id=eq.${userId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );

    // 5. Auth 사용자 삭제
    const deleteResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
    });

    if (!deleteResp.ok) {
      return res.status(500).json({ 
        error: 'Failed to delete auth user',
        status: deleteResp.status
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Account and all data deleted successfully'
    });

  } catch (err) {
    console.error('delete-account error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}
