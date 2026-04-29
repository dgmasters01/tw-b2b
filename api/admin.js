// /api/admin.js
// Admin 통합 router (Vercel Hobby 12-function 제한 회피용 단일 파일)
// action 파라미터(query string ?action=...)로 4개 sub-handler 분기:
//   POST ?action=booking-upload   → TW Booking Analytics 엑셀 업로드
//   GET/POST ?action=list-users   → Supabase Auth 사용자 + hotels 정보 조인
//   POST ?action=send-invite      → Agoda 등록 안내 메일 발송 + 상태 업데이트
//   POST ?action=update-match     → 호텔의 Agoda 매칭 상태 직접 수정
//
// ⚠️ 라우팅은 query string ?action=만 사용 (admin-update-match가 body.action을
//    내부 분기에 사용하므로 body.action fallback은 절대 추가하지 말 것)
//
// 통합 전 4개 파일 (admin-booking-upload.js / admin-list-users.js /
// admin-send-agoda-invite.js / admin-update-match.js)은
// _backup_20260429/ 폴더에 보존됨.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM_EMAIL = 'TravelWinners B2B <noreply@gohotelwinners.com>';
const REPLY_TO = 'partners@gohotelwinners.com';

// =============================================================
// 공통: 어드민 인증 (4개 핸들러 모두 동일 패턴이므로 함수화)
// =============================================================
async function requireAdmin(req, serviceKey) {
  const auth = req.headers.authorization || '';
  const callerToken = auth.replace(/^Bearer\s+/i, '');
  if (!callerToken) {
    return { ok: false, status: 401, error: 'Missing auth token' };
  }
  const meResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + callerToken, 'apikey': serviceKey }
  });
  if (!meResp.ok) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }
  const me = await meResp.json();
  const myEmail = (me.email || '').toLowerCase();
  if (!myEmail) {
    return { ok: false, status: 401, error: 'No email in token' };
  }
  const adminCheck = await fetch(
    SUPABASE_URL + '/rest/v1/admins?email=eq.' + encodeURIComponent(myEmail) + '&select=role,is_active',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const admins = await adminCheck.json();
  if (!Array.isArray(admins) || admins.length === 0 || admins[0].is_active === false) {
    return { ok: false, status: 403, error: 'Admin access required' };
  }
  return { ok: true, email: myEmail, role: admins[0].role };
}

// =============================================================
// Sub-handler 1: list-users
// =============================================================
async function handleListUsers(req, res, serviceKey, _admin) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 모든 사용자 목록 조회 (service_role)
  const usersResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
  });
  const usersData = await usersResp.json();
  const users = usersData.users || [];

  // 모든 호텔 조회 (user_id 매핑용)
  const hotelsResp = await fetch(
    `${SUPABASE_URL}/rest/v1/hotels?select=id,user_id,hotel_name,status,created_at`,
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

  // 관리자 목록 (admin 표시용)
  const adminsResp = await fetch(
    `${SUPABASE_URL}/rest/v1/admins?select=email,role`,
    { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
  );
  const allAdmins = await adminsResp.json();
  const adminEmails = {};
  (allAdmins || []).forEach(a => { adminEmails[a.email.toLowerCase()] = a.role; });

  // 관리자 제외한 매니저만
  const members = users
    .filter(u => !adminEmails[(u.email || '').toLowerCase()])
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
}

// =============================================================
// Sub-handler 2: update-match
// (body.action: 'manual_match' | 'reject' | 'reopen' | 'edit_match')
// =============================================================
async function handleUpdateMatch(req, res, serviceKey, _admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  const hotelId = body.hotelId;
  const subAction = body.action; // body.action은 update-match 내부 분기용

  if (!hotelId) return res.status(400).json({ error: 'hotelId is required' });
  if (!subAction) return res.status(400).json({ error: 'action is required' });

  let updatePayload = {};
  let logNote = '';

  if (subAction === 'manual_match' || subAction === 'edit_match') {
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

  } else if (subAction === 'reject') {
    const reason = (body.reason || '').toString().trim().slice(0, 500);
    updatePayload = {
      agoda_match_status: 'rejected',
      updated_at: new Date().toISOString()
    };
    logNote = 'rejected' + (reason ? ': ' + reason : '');

  } else if (subAction === 'reopen') {
    updatePayload = {
      agoda_match_status: 'manual_pending',
      updated_at: new Date().toISOString()
    };
    logNote = 'reopened to manual_pending';

  } else {
    return res.status(400).json({ error: 'Unknown action: ' + subAction });
  }

  const updateResp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId),
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
    action: subAction,
    note: logNote,
    hotel: updated[0]
  });
}

// =============================================================
// Sub-handler 3: send-invite (Agoda 등록 안내 메일 발송)
// =============================================================
async function handleSendInvite(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY not configured',
      hint: 'Add RESEND_API_KEY to Vercel environment variables.'
    });
  }

  const body = req.body || {};
  const hotelId = body.hotelId;
  if (!hotelId) return res.status(400).json({ error: 'hotelId is required' });

  // 호텔 정보 조회
  const hotelResp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId) +
    '&select=id,hotel_name,hotel_name_local,contact_name,contact_email,manager_position,manager_position_other,city,country,property_type,star_rating',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const hotels = await hotelResp.json();
  if (!hotels || hotels.length === 0) {
    return res.status(404).json({ error: 'Hotel not found: ' + hotelId });
  }
  const hotel = hotels[0];

  if (!hotel.contact_email) {
    return res.status(400).json({ error: 'Hotel has no contact_email — cannot send invite' });
  }

  const isDryRun = !!body.dryRun;
  const customMessage = (body.customMessage || '').toString().slice(0, 2000);

  const managerName = hotel.contact_name || 'there';
  const positionLabel = hotel.manager_position === 'Other'
    ? (hotel.manager_position_other || '')
    : (hotel.manager_position || '');
  const hotelLabel = hotel.hotel_name + (hotel.hotel_name_local ? ' (' + hotel.hotel_name_local + ')' : '');
  const locationLabel = [hotel.city, hotel.country].filter(Boolean).join(', ');
  const subject = 'Next step: List ' + hotel.hotel_name + ' on Agoda to activate your TravelWinners B2B partnership';

  const html = buildEmailHtml({
    managerName, positionLabel, hotelLabel, locationLabel,
    starRating: hotel.star_rating, propertyType: hotel.property_type,
    customMessage, adminEmail: admin.email
  });
  const text = buildEmailText({
    managerName, hotelLabel, locationLabel, customMessage, adminEmail: admin.email
  });

  if (isDryRun) {
    return res.status(200).json({
      success: true,
      dryRun: true,
      preview: {
        to: hotel.contact_email,
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        subject, html, text
      },
      hotel
    });
  }

  // Resend 발송
  const resendResp = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + resendKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [hotel.contact_email],
      reply_to: REPLY_TO,
      subject, html, text
    })
  });

  if (!resendResp.ok) {
    const errBody = await resendResp.text();
    console.error('Resend failed:', resendResp.status, errBody);
    return res.status(502).json({
      error: 'Email delivery failed',
      status: resendResp.status,
      detail: errBody
    });
  }
  const resendData = await resendResp.json();

  // hotels 테이블 상태 업데이트
  const updateResp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId),
    {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        agoda_match_status: 'agoda_registration_pending',
        updated_at: new Date().toISOString()
      })
    }
  );
  let updatedHotel = null;
  if (updateResp.ok) {
    const arr = await updateResp.json();
    updatedHotel = arr && arr[0] ? arr[0] : null;
  } else {
    console.error('DB update after email failed:', await updateResp.text());
  }

  return res.status(200).json({
    success: true,
    emailId: resendData.id || null,
    to: hotel.contact_email,
    hotel: updatedHotel || hotel
  });
}

// =============================================================
// Sub-handler 4: booking-upload (TW Booking Analytics 엑셀 업로드)
// =============================================================
async function handleBookingUpload(req, res, serviceKey, _admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows, sourceFilename } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows[] is required (parsed excel rows)' });
  }
  if (rows.length > 5000) {
    return res.status(400).json({ error: 'Too many rows (max 5000 per upload)' });
  }

  // channel_cid_map 전체 로드
  const cidMapResp = await fetch(
    `${SUPABASE_URL}/rest/v1/channel_cid_map?select=cid,channel_code&is_active=eq.true`,
    { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
  );
  const cidMapRows = await cidMapResp.json();
  const cidToChannel = {};
  for (const r of cidMapRows) cidToChannel[String(r.cid)] = r.channel_code;

  // hotels 미리 로드
  const hotelsResp = await fetch(
    `${SUPABASE_URL}/rest/v1/hotels?select=id,hotel_name&status=neq.deleted`,
    { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
  );
  const hotelsList = await hotelsResp.json();
  const hotelByName = {};
  if (Array.isArray(hotelsList)) {
    for (const h of hotelsList) {
      if (h.hotel_name) hotelByName[h.hotel_name.toLowerCase().trim()] = h.id;
    }
  }

  // row 정규화
  const batchId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const upserts = [];
  const skipped = [];

  for (const raw of rows) {
    const norm = normalizeRow(raw);
    if (!norm.booking_id) {
      skipped.push({ reason: 'missing booking_id', raw });
      continue;
    }
    const cidStr = norm.cid ? String(norm.cid).trim() : '';
    const channelCode = cidStr ? cidToChannel[cidStr] : null;
    if (!channelCode) {
      skipped.push({ reason: `unknown cid: ${cidStr || '(empty)'}`, booking_id: norm.booking_id });
      continue;
    }
    let hotelId = null;
    if (norm.hotel_name) {
      const key = norm.hotel_name.toLowerCase().trim();
      hotelId = hotelByName[key] || null;
      if (!hotelId) {
        for (const [name, id] of Object.entries(hotelByName)) {
          if (name.includes(key) || key.includes(name)) { hotelId = id; break; }
        }
      }
    }
    const statusLower = (norm.booking_status || '').toLowerCase();
    const isCancelled = statusLower.includes('cancel') || norm.is_cancelled === true;
    const isCompleted = statusLower.includes('complet') || statusLower.includes('checked')
                        || statusLower.includes('stayed') || norm.is_completed === true;

    upserts.push({
      channel_code: channelCode,
      cid: cidStr,
      booking_id: String(norm.booking_id),
      reservation_no: norm.reservation_no || null,
      hotel_name: norm.hotel_name || '(unknown)',
      hotel_id_agoda: norm.hotel_id_agoda || null,
      hotel_country: norm.hotel_country || null,
      hotel_city: norm.hotel_city || null,
      hotel_star: toIntOrNull(norm.hotel_star),
      hotel_id: hotelId,
      customer_country: norm.customer_country || null,
      num_adults: toIntOrNull(norm.num_adults),
      num_children: toIntOrNull(norm.num_children),
      checkin_date: toDateOrNull(norm.checkin_date),
      checkout_date: toDateOrNull(norm.checkout_date),
      nights: toIntOrNull(norm.nights),
      room_type: norm.room_type || null,
      num_rooms: toIntOrNull(norm.num_rooms) || 1,
      booking_amount_usd: toNumOrNull(norm.booking_amount_usd),
      commission_usd: toNumOrNull(norm.commission_usd),
      currency_original: norm.currency_original || null,
      booking_amount_original: toNumOrNull(norm.booking_amount_original),
      booking_status: isCancelled ? 'cancelled' : (norm.booking_status || null),
      is_cancelled: isCancelled,
      is_completed: isCompleted && !isCancelled,
      device_type: norm.device_type || null,
      booked_at: toDateOrNull(norm.booked_at),
      upload_batch_id: batchId,
      source_filename: sourceFilename || null,
      raw_row_data: raw,
    });
  }

  // bulk UPSERT (chunked)
  const inserted = [];
  const errors = [];
  const CHUNK = 200;
  for (let i = 0; i < upserts.length; i += CHUNK) {
    const chunk = upserts.slice(i, i + CHUNK);
    const upResp = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings_agoda?on_conflict=channel_code,booking_id`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(chunk),
      }
    );
    if (!upResp.ok) {
      const errText = await upResp.text();
      errors.push({ chunk_start: i, error: errText.slice(0, 300) });
    } else {
      const insertedRows = await upResp.json();
      if (Array.isArray(insertedRows)) inserted.push(...insertedRows);
    }
  }

  return res.status(200).json({
    ok: true,
    batch_id: batchId,
    total_rows: rows.length,
    processed: upserts.length,
    skipped_count: skipped.length,
    inserted_count: inserted.length,
    errors,
    skipped: skipped.slice(0, 50),
  });
}

// =============================================================
// 메인 라우터
// =============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  // ⚠️ 라우팅용 action은 query string ?action=만 사용.
  // body.action은 update-match 내부 분기 전용이므로 fallback 추가 금지.
  const url = new URL(req.url || '/', 'http://x');
  const action = (url.searchParams.get('action') || '').toLowerCase();

  if (!action) {
    return res.status(400).json({
      error: 'missing_action',
      allowed: ['booking-upload', 'list-users', 'send-invite', 'update-match'],
      hint: 'Use ?action=<name> in query string'
    });
  }

  // 공통 어드민 인증 (4개 핸들러 모두 동일하게 요구)
  const adminCheck = await requireAdmin(req, serviceKey);
  if (!adminCheck.ok) {
    return res.status(adminCheck.status).json({ error: adminCheck.error });
  }

  try {
    switch (action) {
      case 'booking-upload':
        return await handleBookingUpload(req, res, serviceKey, adminCheck);
      case 'list-users':
        return await handleListUsers(req, res, serviceKey, adminCheck);
      case 'send-invite':
        return await handleSendInvite(req, res, serviceKey, adminCheck);
      case 'update-match':
        return await handleUpdateMatch(req, res, serviceKey, adminCheck);
      default:
        return res.status(400).json({
          error: 'unknown_action',
          received: action,
          allowed: ['booking-upload', 'list-users', 'send-invite', 'update-match'],
          hint: 'Use ?action=<name> in query string'
        });
    }
  } catch (err) {
    console.error('admin router error:', err);
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
}

// =============================================================
// Email 템플릿 (send-invite 전용)
// =============================================================
function buildEmailHtml(opts) {
  const safeName = escHtml(opts.managerName || 'there');
  const safePos = opts.positionLabel ? ' (' + escHtml(opts.positionLabel) + ')' : '';
  const safeHotel = escHtml(opts.hotelLabel || '');
  const safeLocation = opts.locationLabel ? escHtml(opts.locationLabel) : '';
  const safeStars = opts.starRating ? (opts.starRating + '★') : '';
  const safeType = opts.propertyType ? escHtml(opts.propertyType) : '';
  const safeAdmin = escHtml(opts.adminEmail || 'partners@gohotelwinners.com');
  const customBlock = opts.customMessage
    ? '<div style="background:#fff8e6;border-left:3px solid #f0a020;padding:12px 16px;margin:18px 0;border-radius:6px;color:#333;font-size:14px;line-height:1.6;white-space:pre-wrap">' + escHtml(opts.customMessage) + '</div>'
    : '';

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55">',
    '<div style="max-width:600px;margin:0 auto;background:#fff">',
    '  <div style="padding:28px 32px 16px;border-bottom:1px solid #eee">',
    '    <div style="font-size:13px;color:#888;letter-spacing:.4px;text-transform:uppercase">TravelWinners B2B</div>',
    '    <h1 style="font-size:22px;font-weight:600;margin:6px 0 0;color:#1a1a1a">Get listed on Agoda — one step from going live</h1>',
    '  </div>',
    '  <div style="padding:24px 32px;font-size:15px">',
    '    <p>Hi ' + safeName + safePos + ',</p>',
    '    <p>Thank you for registering <strong>' + safeHotel + '</strong>' + (safeLocation ? ' in ' + safeLocation : '') + ' with TravelWinners B2B. ' + (safeStars ? 'We confirm your property as ' + safeStars + ' ' + (safeType || 'hotel') + '.' : '') + '</p>',
    '    <p>To activate your B2B partnership and start receiving global bookings through our channels, we need your hotel listed on Agoda. We could not find your property in Agoda inventory — this is the only remaining step.</p>',
    customBlock,
    '    <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;color:#1a1a1a">Why Agoda?</h3>',
    '    <ul style="padding-left:20px;margin:6px 0 18px">',
    '      <li style="margin-bottom:5px">Our entire booking network — Korean, Japanese, Chinese, Vietnamese travelers — flows through Agoda inventory.</li>',
    '      <li style="margin-bottom:5px">Listing on Agoda is free for hotels. You set your own rates and availability.</li>',
    '      <li style="margin-bottom:5px">Once listed, your TravelWinners profile activates within 48 hours — no further action from you.</li>',
    '    </ul>',
    '    <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;color:#1a1a1a">How to get listed</h3>',
    '    <ol style="padding-left:20px;margin:6px 0 18px">',
    '      <li style="margin-bottom:5px">Go to <a href="https://ycs.agoda.com/en-us/kipp/public/Account/Register" style="color:#534AB7">Agoda YCS Sign-up</a></li>',
    '      <li style="margin-bottom:5px">Submit hotel details and verification documents (typically 3–7 business days).</li>',
    '      <li style="margin-bottom:5px">Reply to this email with your Agoda hotel ID once approved, and we will finalize your listing on TravelWinners B2B.</li>',
    '    </ol>',
    '    <div style="text-align:center;margin:28px 0 8px">',
    '      <a href="https://ycs.agoda.com/en-us/kipp/public/Account/Register" style="display:inline-block;padding:14px 28px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Start Agoda Registration</a>',
    '    </div>',
    '    <p style="margin-top:24px;color:#666;font-size:14px">If you have questions or need assistance with the Agoda process, simply reply to this email — our partner team will help directly.</p>',
    '    <p style="margin-top:18px;color:#666;font-size:14px">Best regards,<br>TravelWinners B2B Partner Team<br><a href="mailto:' + safeAdmin + '" style="color:#534AB7">' + safeAdmin + '</a></p>',
    '  </div>',
    '  <div style="padding:14px 32px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">',
    '    TravelWinners B2B — gohotelwinners.com',
    '  </div>',
    '</div></body></html>'
  ].join('\n');
}

function buildEmailText(opts) {
  const lines = [
    'Hi ' + (opts.managerName || 'there') + ',',
    '',
    'Thank you for registering ' + (opts.hotelLabel || '') + (opts.locationLabel ? ' in ' + opts.locationLabel : '') + ' with TravelWinners B2B.',
    '',
    'To activate your B2B partnership and start receiving global bookings, we need your hotel listed on Agoda. We could not find your property in Agoda inventory — this is the only remaining step.',
    ''
  ];
  if (opts.customMessage) {
    lines.push('--- Note from our team ---');
    lines.push(opts.customMessage);
    lines.push('');
  }
  lines.push('Why Agoda:');
  lines.push('  - Our entire booking network flows through Agoda inventory.');
  lines.push('  - Free to list. You set your own rates and availability.');
  lines.push('  - Your TravelWinners profile activates within 48 hours of Agoda approval.');
  lines.push('');
  lines.push('How to get listed:');
  lines.push('  1. Go to https://ycs.agoda.com/en-us/kipp/public/Account/Register');
  lines.push('  2. Submit hotel details and verification (3-7 business days).');
  lines.push('  3. Reply to this email with your Agoda hotel ID once approved.');
  lines.push('');
  lines.push('Questions? Reply to this email and our partner team will help.');
  lines.push('');
  lines.push('Best regards,');
  lines.push('TravelWinners B2B Partner Team');
  lines.push(opts.adminEmail || 'partners@gohotelwinners.com');
  return lines.join('\n');
}

function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// =============================================================
// 헬퍼: 컬럼명 정규화 (booking-upload 전용)
// =============================================================
function normalizeRow(r) {
  const m = {};
  for (const [k, v] of Object.entries(r || {})) {
    const key = String(k).toLowerCase().replace(/[\s_-]/g, '');
    m[key] = v;
  }
  return {
    cid: m.cid ?? m.affiliateid ?? null,
    booking_id: m.bookingid ?? m.bookingno ?? m.bookingnumber ?? null,
    reservation_no: m.reservationnumber ?? m.reservationno ?? null,
    hotel_name: m.hotelname ?? m.propertyname ?? null,
    hotel_id_agoda: m.hotelid ?? m.propertyid ?? null,
    hotel_country: m.hotelcountry ?? m.country ?? null,
    hotel_city: m.hotelcity ?? m.city ?? null,
    hotel_star: m.hotelstar ?? m.starrating ?? m.stars ?? null,
    customer_country: m.customercountry ?? m.guestcountry ?? null,
    num_adults: m.adults ?? m.numadults ?? null,
    num_children: m.children ?? m.numchildren ?? null,
    checkin_date: m.checkindate ?? m.checkin ?? null,
    checkout_date: m.checkoutdate ?? m.checkout ?? null,
    nights: m.nights ?? m.los ?? null,
    room_type: m.roomtype ?? m.room ?? null,
    num_rooms: m.rooms ?? m.numrooms ?? null,
    booking_amount_usd: m.bookingusd ?? m.amountusd ?? m.totalusd ?? null,
    commission_usd: m.commissionusd ?? m.commission ?? null,
    currency_original: m.currency ?? null,
    booking_amount_original: m.bookingamountlocal ?? m.amountlocal ?? null,
    booking_status: m.status ?? m.bookingstatus ?? null,
    device_type: m.devicetype ?? m.device ?? null,
    booked_at: m.bookingdate ?? m.bookedat ?? m.dateofbooking ?? null,
    is_cancelled: m.iscancelled === true || m.cancelled === true,
    is_completed: m.iscompleted === true || m.completed === true,
  };
}

function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function toDateOrNull(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 86400000;
    const d = new Date(epoch.getTime() + ms);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const isoMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2,'0')}-${isoMatch[3].padStart(2,'0')}`;
  }
  const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
