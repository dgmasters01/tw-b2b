// /api/admin-update-match.js
// 어드민이 호텔의 Agoda 매칭 상태를 직접 수정 (수동 매칭 / 거부 / 재오픈)
// Phase 3 Step 4-3 / [7/8]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  // 1. 호출자 토큰 → 관리자 권한 확인
  const auth = req.headers.authorization || '';
  const callerToken = auth.replace(/^Bearer\s+/i, '');
  if (!callerToken) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    const meResp = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: { 'Authorization': 'Bearer ' + callerToken, 'apikey': serviceKey }
    });
    if (!meResp.ok) return res.status(401).json({ error: 'Invalid token' });
    const me = await meResp.json();
    const myEmail = me.email;

    const adminCheck = await fetch(
      supabaseUrl + '/rest/v1/admins?email=eq.' + encodeURIComponent(myEmail) + '&select=role,is_active',
      { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
    );
    const admins = await adminCheck.json();
    if (!admins || admins.length === 0 || !admins[0].is_active) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 2. 입력 검증
    const body = req.body || {};
    const hotelId = body.hotelId;
    const action = body.action; // 'manual_match' | 'reject' | 'reopen' | 'edit_match'

    if (!hotelId) return res.status(400).json({ error: 'hotelId is required' });
    if (!action) return res.status(400).json({ error: 'action is required' });

    let updatePayload = {};
    let logNote = '';

    if (action === 'manual_match' || action === 'edit_match') {
      const agodaHotelId = body.agodaHotelId ? parseInt(body.agodaHotelId, 10) : null;
      const agodaCityId = body.agodaCityId ? parseInt(body.agodaCityId, 10) : null;
      const agodaUrl = body.agodaUrl || null;

      if (!agodaHotelId || isNaN(agodaHotelId) || agodaHotelId <= 0) {
        return res.status(400).json({ error: 'Valid agodaHotelId is required for manual_match' });
      }
      if (!agodaCityId || isNaN(agodaCityId) || agodaCityId <= 0) {
        return res.status(400).json({ error: 'Valid agodaCityId is required for manual_match' });
      }

      updatePayload = {
        agoda_hotel_id: agodaHotelId,
        agoda_city_id: agodaCityId,
        agoda_match_status: 'manual_matched',
        updated_at: new Date().toISOString()
      };
      if (agodaUrl) updatePayload.agoda_url = agodaUrl;
      logNote = 'manual matched';

    } else if (action === 'reject') {
      const reason = (body.reason || '').toString().trim().slice(0, 500);
      updatePayload = {
        agoda_match_status: 'rejected',
        updated_at: new Date().toISOString()
      };
      logNote = 'rejected' + (reason ? ': ' + reason : '');

    } else if (action === 'reopen') {
      updatePayload = {
        agoda_match_status: 'manual_pending',
        updated_at: new Date().toISOString()
      };
      logNote = 'reopened to manual_pending';

    } else {
      return res.status(400).json({ error: 'Unknown action: ' + action });
    }

    // 3. hotels 테이블 업데이트
    const updateResp = await fetch(
      supabaseUrl + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId),
      {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updatePayload)
      }
    );
    if (!updateResp.ok) {
      const errText = await updateResp.text();
      console.error('Update failed:', errText);
      return res.status(500).json({ error: 'Database update failed', detail: errText });
    }
    const updated = await updateResp.json();
    if (!updated || updated.length === 0) {
      return res.status(404).json({ error: 'Hotel not found: ' + hotelId });
    }

    return res.status(200).json({
      success: true,
      action: action,
      note: logNote,
      hotel: updated[0]
    });

  } catch (err) {
    console.error('admin-update-match error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}
