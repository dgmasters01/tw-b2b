// /api/admin.js
// Admin 통합 router (Vercel Hobby 12-function 제한 회피용 단일 파일)
// action 파라미터(query string ?action=...)로 sub-handler 분기:
//
// [기존 운영 핸들러 — requireAdmin 인증 필수]
//   POST ?action=booking-upload   → TW Booking Analytics 엑셀 업로드
//   GET/POST ?action=list-users   → Supabase Auth 사용자 + hotels 정보 조인
//   POST ?action=send-invite      → Agoda 등록 안내 메일 발송 + 상태 업데이트
//   POST ?action=update-match     → 호텔의 Agoda 매칭 상태 직접 수정
//
// [BL-ADMIN-AUTH-V2 권한 핸들러 — 자체 인증 (Bearer JWT)]
//   GET  ?action=auth-users-list      → admins/invitations/role_change_log 통합 조회
//   POST ?action=auth-invite          → 직원 초대 메일 발송 (Resend)
//   GET  ?action=auth-accept-invite   → 초대 토큰 검증
//   POST ?action=auth-accept-invite   → 가입 처리
//   POST ?action=auth-change-role     → role 변경/박탈/복원
//
// ⚠️ 라우팅은 query string ?action=만 사용 (admin-update-match가 body.action을
//    내부 분기에 사용하므로 body.action fallback은 절대 추가하지 말 것)
//
// auth-* 핸들러는 _lib/admin-auth-handlers.js로 분리 (Vercel 12 함수 한도, D-016).
// 통합 전 운영 4개 파일은 _backup_20260429/ 폴더에 보존됨.

import adminAuthHandler from './_lib/admin-auth-handlers.js';
import { getFxRate } from './_lib/fx.js';
import { refundCapture } from './_lib/paypal-client.js';
import { sendSystemEmail } from './_lib/email-sender.js';

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
  return { ok: true, email: myEmail, role: admins[0].role, userId: me.id || null };
}

// =============================================================
// Sub-handler 1: list-users
// =============================================================
async function handleListUsers(req, res, serviceKey, _admin) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 모든 사용자 목록 조회 (service_role)
  // [버그수정 2026-04-30] try/catch + non-2xx 안전 처리 — auth/admin/users 500 에러 방지
  let users = [];
  try {
    const usersResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
    });
    if (usersResp.ok) {
      const usersData = await usersResp.json();
      users = Array.isArray(usersData.users) ? usersData.users : [];
    } else {
      console.error('admin list-users: auth/admin/users failed', usersResp.status, await usersResp.text().catch(() => ''));
    }
  } catch (e) {
    console.error('admin list-users: auth/admin/users exception', e.message);
  }

  // 모든 호텔 조회 (user_id 매핑용)
  // [버그수정 2026-04-30] contact_*, manager_* 컬럼도 함께 가져와서 admin이 매핑/enrich 할 수 있게
  let hotels = [];
  try {
    const hotelsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/hotels?select=id,user_id,hotel_name,status,created_at,contact_name,contact_email,contact_phone,whatsapp,manager_email,manager_name,manager_phone`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    if (hotelsResp.ok) {
      hotels = await hotelsResp.json();
    } else {
      console.error('admin list-users: hotels fetch failed', hotelsResp.status);
    }
  } catch (e) {
    console.error('admin list-users: hotels exception', e.message);
  }
  const hotelsByUser = {};
  (hotels || []).forEach(h => {
    if (h.user_id) {
      if (!hotelsByUser[h.user_id]) hotelsByUser[h.user_id] = [];
      hotelsByUser[h.user_id].push(h);
    }
  });

  // 관리자 목록 (admin 표시용)
  // [버그수정 2026-04-30] try/catch 추가
  let allAdmins = [];
  try {
    const adminsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/admins?select=email,role`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    if (adminsResp.ok) {
      allAdmins = await adminsResp.json();
    } else {
      console.error('admin list-users: admins fetch failed', adminsResp.status);
    }
  } catch (e) {
    console.error('admin list-users: admins exception', e.message);
  }
  const adminEmails = {};
  (allAdmins || []).forEach(a => { if (a && a.email) adminEmails[a.email.toLowerCase()] = a.role; });

  // [BL-MEMBERS-DATA-SOURCE 2026-05-23] 데이터 소스 재정의 — 블랙리스트 → 화이트리스트
  // 기존: admins 테이블에 있는 이메일은 무조건 제외 (호텔 매니저가 admins에 잘못 박히면 사라지는 악순환)
  // 변경: 호텔 매니저 = "hotels 테이블에 등록된 user_id 보유자" 화이트리스트.
  //       admins 여부는 별도 is_team_member 플래그로만 표시 (필터링 X).
  // 추가: 좀비 분류 — 가입 후 7일 경과 + 이메일 미인증 + 호텔 0건 = 자동 청소 대상.
  const ZOMBIE_CUTOFF_DAYS = 7;
  const now = Date.now();
  const zombieCutoffMs = ZOMBIE_CUTOFF_DAYS * 24 * 60 * 60 * 1000;

  // [기능추가 2026-04-30] user_metadata에서 name/phone/full_name 추출 → admin Hotels 패널 enrich 용
  const members = users
    .map(u => {
      const meta = u.user_metadata || {};
      const emailLower = (u.email || '').toLowerCase();
      const isTeamMember = !!adminEmails[emailLower];
      const userHotels = hotelsByUser[u.id] || [];
      const ageMs = u.created_at ? (now - new Date(u.created_at).getTime()) : 0;
      const isVerified = !!u.email_confirmed_at;
      const isZombie = !isTeamMember && !isVerified && userHotels.length === 0 && ageMs > zombieCutoffMs;
      return {
        id: u.id,
        email: u.email,
        name: meta.full_name || meta.name || meta.manager_name || null,
        phone: meta.phone || meta.manager_phone || u.phone || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        is_verified: isVerified,
        is_banned: u.banned_until && new Date(u.banned_until) > new Date(),
        is_team_member: isTeamMember, // 신규 — 팀(admins) 소속 표시용. 필터링 X.
        team_role: isTeamMember ? adminEmails[emailLower] : null,
        is_zombie: isZombie, // 신규 — 7일+ 미인증 + 호텔 0건. 좀비 청소봇 타겟.
        hotels: userHotels
      };
    })
    // 화이트리스트 — 호텔 1건 이상 등록한 진짜 호텔 매니저만 Members 화면에 표시
    // (팀 멤버 admins는 admin.html 'admins' 탭에서 따로 봄)
    .filter(m => !m.is_team_member && m.hotels.length > 0)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 좀비 통계는 별도 — 전체 users 기준으로 카운트 (Members 목록에는 안 들어감)
  const zombieCount = users.filter(u => {
    const emailLower = (u.email || '').toLowerCase();
    if (adminEmails[emailLower]) return false;
    if (u.email_confirmed_at) return false;
    if ((hotelsByUser[u.id] || []).length > 0) return false;
    const ageMs = u.created_at ? (now - new Date(u.created_at).getTime()) : 0;
    return ageMs > zombieCutoffMs;
  }).length;

  return res.status(200).json({
    success: true,
    members,
    total: members.length,
    zombie_count: zombieCount, // BL-MEMBERS-DATA-SOURCE — 좀비 청소봇 모니터링용
    data_source: 'whitelist:hotels' // 데이터 소스 정의 명시 (블랙리스트 방식과 구분)
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
// Sub-handler 5: start-task (BL-RESERVE-BTN-START-TASK)
// =============================================================
// 다음추천 ▶ 예약+알림 버튼이 작업을 실제로 진행 중으로 전환.
// GitHub Contents API로 tasks.json patch — pending → in_progress + started_at.
// 봇이 commit 박을 때까지 기다릴 필요 없이 즉시 5초 폴링이 감지.
//
// body: { taskId: 'BL-XXX' }
// 환경 변수 GITHUB_PAT 필요 (repo 쓰기 권한)
async function handleStartTask(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  const taskId = (body.taskId || '').toString().trim();
  if (!taskId) return res.status(400).json({ error: 'taskId is required' });
  // 안전: 작업 ID 패턴 화이트리스트 (injection 방지)
  if (!/^(BL-[A-Z0-9]+(-[A-Z0-9]+)*|CHG-\d+(-[a-z]+)?|SQ-[A-Z0-9]+|IP-CTRL-\d+)$/.test(taskId)) {
    return res.status(400).json({ error: 'Invalid taskId format' });
  }

  const GH_PAT = process.env.GITHUB_PAT || process.env.GH_PAT;
  if (!GH_PAT) {
    return res.status(500).json({
      error: 'GITHUB_PAT 환경 변수 미설정',
      hint: 'Vercel 환경 변수에 GITHUB_PAT(repo 쓰기 권한) 박아주세요.'
    });
  }

  const REPO = 'dgmasters01/tw-b2b';
  const FILE_PATH = 'tasks.json';
  const BRANCH = 'main';
  const GH_API = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;

  try {
    // 1) 라이브 tasks.json + sha fetch
    const getResp = await fetch(GH_API, {
      headers: {
        'Authorization': `Bearer ${GH_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'tw-b2b-start-task',
      }
    });
    if (!getResp.ok) {
      const t = await getResp.text();
      return res.status(502).json({ error: 'GitHub fetch 실패', detail: t.slice(0, 300) });
    }
    const meta = await getResp.json();
    const content = Buffer.from(meta.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);

    // 2) 해당 task 찾아서 status 전환
    const task = (data.tasks || []).find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: `Task ${taskId} not found in tasks.json` });
    }
    if (task.status === 'in_progress') {
      return res.status(200).json({
        ok: true,
        already_in_progress: true,
        message: `${taskId} 이미 진행 중 상태입니다.`,
        task: { id: task.id, status: task.status, started_at: task.started_at }
      });
    }
    if (task.status === 'done') {
      return res.status(409).json({
        error: `${taskId}은 이미 완료된 작업입니다 (status: done).`,
        hint: '이미 done 처리된 작업은 재시작할 수 없습니다.'
      });
    }
    if (task.status === 'blocked') {
      return res.status(409).json({
        error: `${taskId}은 막힌 상태입니다 (blocked).`,
        hint: '먼저 blocked 사유를 해소해주세요.'
      });
    }

    const now = new Date().toISOString();
    const prevStatus = task.status;
    task.status = 'in_progress';
    if (!task.started_at) task.started_at = now;
    task.updated_at = now;
    if (!Array.isArray(task.history)) task.history = [];
    task.history.push({
      at: now,
      action: 'started',
      by: admin?.email || 'admin',
      note: `다음추천 ▶ 예약+알림 버튼 클릭 → 즉시 in_progress 전환 (이전: ${prevStatus})`
    });

    // 3) stats 재계산
    const counts = { done:0, in_progress:0, paused:0, pending:0, blocked:0, cancelled:0, todo:0 };
    for (const t of data.tasks) {
      const s = t.status || 'pending';
      if (s in counts) counts[s] += 1;
    }
    data.stats = { ...(data.stats || {}), ...counts, total: data.tasks.length, updated_at: now };
    data.updated_at = now;

    // 4) GitHub PUT — patch
    const newContent = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');
    const putResp = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GH_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'tw-b2b-start-task',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `[start-task] ${taskId} 즉시 진행 중 전환 — admin-status 다음추천 버튼\n\n[변경사유] BL-RESERVE-BTN-START-TASK — 다음추천 ▶ 예약+알림 버튼이 약속한 priority_boost + status 전환을 실행.\nClicked by: ${admin?.email || 'admin'}\nPrev status: ${prevStatus} → in_progress`,
        content: newContent,
        sha: meta.sha,
        branch: BRANCH,
      })
    });
    if (!putResp.ok) {
      const t = await putResp.text();
      return res.status(502).json({ error: 'GitHub PUT 실패', detail: t.slice(0, 500) });
    }
    const putData = await putResp.json();
    return res.status(200).json({
      ok: true,
      taskId,
      prev_status: prevStatus,
      new_status: 'in_progress',
      started_at: task.started_at,
      commit_sha: putData.commit?.sha,
      commit_url: putData.commit?.html_url,
      message: `${taskId} 즉시 진행 중으로 전환 완료. 5초 폴링이 감지하면 진행 중 박스가 자동 표시됩니다.`,
    });
  } catch (err) {
    console.error('[handleStartTask] error:', err);
    return res.status(500).json({ error: 'start-task internal error', detail: err.message });
  }
}

// =============================================================
// Sub-handler 6: past-video-revenue (BL-PAST-VIDEO-RECON / D-035)
// =============================================================
// 호텔별 우리 채널 누적 매출 집계 — admin 우리만 보는 영역 전용
// VIEW: v_hotel_past_revenue (sql/07-hotel-past-revenue-view.sql)
// 매칭: agoda_hotel_id + hotel_id(UUID) + name+city+country 폴백
// 3구간: strong(>=$1k) / soft($200~$999) / hide(<$200)
// 쿼리:
//   GET ?action=past-video-revenue                 → 전체 (DESC by revenue)
//   GET ?action=past-video-revenue&tier=strong     → 강력만
//   GET ?action=past-video-revenue&min_revenue=200 → $200+ 만
//   GET ?action=past-video-revenue&search=hilton   → 호텔명 부분일치
async function handlePastVideoRevenue(req, res, serviceKey, _admin) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed (GET only)' });
  }
  try {
    const { tier, min_revenue, search, limit } = req.query || {};

    // PostgREST 쿼리 빌더
    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', 'total_revenue_usd.desc,hotel_created_at.desc');

    if (tier && ['strong', 'soft', 'hide'].includes(tier)) {
      params.set('revenue_tier', 'eq.' + tier);
    }
    if (min_revenue && !isNaN(Number(min_revenue))) {
      params.append('total_revenue_usd', 'gte.' + Number(min_revenue));
    }
    if (search && typeof search === 'string' && search.trim()) {
      // ilike 부분 일치 (호텔명)
      params.append('hotel_name', 'ilike.*' + search.trim() + '*');
    }
    const lim = Number(limit) > 0 && Number(limit) <= 500 ? Number(limit) : 200;
    params.set('limit', String(lim));

    const url = SUPABASE_URL + '/rest/v1/v_hotel_past_revenue?' + params.toString();
    const resp = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Accept': 'application/json',
      },
    });
    if (!resp.ok) {
      const t = await resp.text();
      return res.status(502).json({
        error: 'supabase_view_query_failed',
        status: resp.status,
        detail: t.slice(0, 500),
        hint: 'v_hotel_past_revenue VIEW가 Supabase에 적용되었는지 확인 (sql/07-hotel-past-revenue-view.sql)',
      });
    }
    const rows = await resp.json();

    // 집계 통계 (응답 페이로드에 같이 박음 — UI 카드용)
    const summary = {
      total_hotels: rows.length,
      strong_count: rows.filter(r => r.revenue_tier === 'strong').length,
      soft_count:   rows.filter(r => r.revenue_tier === 'soft').length,
      hide_count:   rows.filter(r => r.revenue_tier === 'hide').length,
      total_revenue_usd: rows.reduce((s, r) => s + Number(r.total_revenue_usd || 0), 0),
      total_bookings: rows.reduce((s, r) => s + Number(r.total_bookings || 0), 0),
      hotels_with_revenue: rows.filter(r => Number(r.total_revenue_usd) > 0).length,
    };

    return res.status(200).json({
      ok: true,
      rows,
      summary,
      filters: { tier: tier || null, min_revenue: min_revenue || null, search: search || null, limit: lim },
      generated_at: new Date().toISOString(),
      meta: {
        source: 'v_hotel_past_revenue',
        decision_ref: 'D-035',
        bl_ref: 'BL-PAST-VIDEO-RECON',
        tier_thresholds: { strong: 1000, soft: 200 },
      },
    });
  } catch (err) {
    console.error('[handlePastVideoRevenue] error:', err);
    return res.status(500).json({ error: 'past_video_revenue_internal', detail: err.message });
  }
}

// =============================================================
// 메인 라우터
// =============================================================
// =============================================================
// Sub-handler 7: manager-push (BL-MANAGER-MANUAL-PUSH)
// 매니저에게 수동 푸시 메일 발송 — 허브 페이지 우측 4개 버튼에서 호출.
// 4종 템플릿: new_video / rebill / report / channel_add
// 발송 후 admin_notes에 자동 기록 (CS 이력 추적).
// =============================================================
async function handleManagerPush(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const body = req.body || {};
  const managerId = body.manager_id;
  const pushType = (body.push_type || '').toString();
  const isDryRun = !!body.dry_run;

  const ALLOWED = ['new_video', 'rebill', 'report', 'channel_add'];
  if (!ALLOWED.includes(pushType)) {
    return res.status(400).json({ error: 'invalid push_type', allowed: ALLOWED });
  }
  if (!managerId) {
    return res.status(400).json({ error: 'manager_id required' });
  }

  // 매니저 + 호텔 통합 정보 (VIEW 사용)
  const viewResp = await fetch(
    SUPABASE_URL + '/rest/v1/v_hotel_manager_full?manager_id=eq.' + encodeURIComponent(managerId),
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const rows = await viewResp.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(404).json({ error: 'Manager not found in v_hotel_manager_full', manager_id: managerId });
  }
  const m = rows[0];

  if (!m.manager_email) {
    return res.status(400).json({ error: 'Manager has no email — cannot send push' });
  }

  // 템플릿 빌드
  const template = buildManagerPushTemplate(pushType, m);
  if (!template) {
    return res.status(500).json({ error: 'template_build_failed', push_type: pushType });
  }

  // dryRun: 발송 안 하고 미리보기만
  if (isDryRun) {
    return res.status(200).json({
      success: true,
      dry_run: true,
      preview: {
        to: m.manager_email,
        from: FROM_EMAIL,
        subject: template.subject,
        html: template.html,
        text: template.text,
      },
      manager: { email: m.manager_email, hotel_name: m.hotel_name },
    });
  }

  // 실제 발송 (Resend)
  const sendResp = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + resendKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [m.manager_email],
      reply_to: REPLY_TO,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }),
  });
  const sendData = await sendResp.json().catch(() => ({}));
  if (!sendResp.ok) {
    return res.status(500).json({
      error: 'resend_failed',
      status: sendResp.status,
      detail: sendData,
    });
  }

  // admin_notes 자동 기록 (CS 이력)
  if (m.hotel_id) {
    try {
      await fetch(SUPABASE_URL + '/rest/v1/admin_notes', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          hotel_id: m.hotel_id,
          author_id: null, // 시스템 메모
          note: `📨 [수동 푸시] ${template.label} 발송 — by ${admin.email} (resend_id: ${sendData.id || '?'})`,
        }),
      });
    } catch (e) {
      // 메모 실패는 메일 발송 성공을 막지 않음
      console.warn('admin_notes log failed:', e.message);
    }
  }

  return res.status(200).json({
    success: true,
    sent_to: m.manager_email,
    resend_id: sendData.id,
    push_type: pushType,
    label: template.label,
  });
}

// =============================================================
// 매니저 푸시 템플릿 빌더 (4종)
// =============================================================
function buildManagerPushTemplate(pushType, m) {
  const hotelName = m.hotel_name || 'your hotel';
  const managerName = m.hotel_contact_name || 'there';
  const channels = m.video_channels_active || 0;
  const views = m.video_total_views || 0;
  const bookings = m.booking_count || 0;
  const revenue = m.booking_revenue || 0;
  const daysLeft = m.guarantee_days_left;

  const templates = {
    new_video: {
      label: '새 영상 알림',
      subject: `🎬 New video published for ${hotelName}!`,
      preheader: `Your hotel just got new exposure on our YouTube channels.`,
      body: `
        <p>Hi ${managerName},</p>
        <p>Great news! We just published a new video featuring <strong>${hotelName}</strong> on our YouTube channels.</p>
        <p>Your hotel is now exposed on <strong>${channels}/8 channels</strong> with <strong>${formatNum(views)} total views</strong> to date.</p>
        <p>Check your dashboard to see the latest stats:</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="https://gohotelwinners.com/dashboard.html" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">View dashboard →</a>
        </p>
      `,
    },
    rebill: {
      label: '재결제 제안',
      subject: `💎 Extend your TravelWinners protection for ${hotelName}`,
      preheader: `Your 6-month booking guarantee is approaching. Renew with priority.`,
      body: `
        <p>Hi ${managerName},</p>
        <p>Your TravelWinners 6-month booking guarantee for <strong>${hotelName}</strong> ${daysLeft != null && daysLeft >= 0 ? `expires in <strong>${daysLeft} days</strong>` : 'has ended'}.</p>
        <p>So far, your hotel has generated <strong>${bookings} bookings</strong> totalling <strong>$${formatNum(revenue)}</strong>.</p>
        <p>To keep your hotel featured on all 8 channels and continue receiving bookings, you can extend your partnership for another 6 months.</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="https://gohotelwinners.com/dashboard.html#rebill" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Extend partnership →</a>
        </p>
        <p style="font-size:13px;color:#888;">Reply to this email if you have questions about renewal terms.</p>
      `,
    },
    report: {
      label: '성과 리포트',
      subject: `📊 Your ${hotelName} performance report`,
      preheader: `Bookings, revenue and channel exposure summary.`,
      body: `
        <p>Hi ${managerName},</p>
        <p>Here's the latest performance summary for <strong>${hotelName}</strong>:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:10px;background:#f7f7f7;border-radius:6px 0 0 6px;width:50%;">Total bookings</td><td style="padding:10px;background:#f7f7f7;border-radius:0 6px 6px 0;text-align:right;font-size:18px;font-weight:600;">${bookings}</td></tr>
          <tr><td colspan="2" style="height:6px;"></td></tr>
          <tr><td style="padding:10px;background:#f7f7f7;border-radius:6px 0 0 6px;">Total revenue</td><td style="padding:10px;background:#f7f7f7;border-radius:0 6px 6px 0;text-align:right;font-size:18px;font-weight:600;">$${formatNum(revenue)}</td></tr>
          <tr><td colspan="2" style="height:6px;"></td></tr>
          <tr><td style="padding:10px;background:#f7f7f7;border-radius:6px 0 0 6px;">Active channels</td><td style="padding:10px;background:#f7f7f7;border-radius:0 6px 6px 0;text-align:right;font-size:18px;font-weight:600;">${channels} / 8</td></tr>
          <tr><td colspan="2" style="height:6px;"></td></tr>
          <tr><td style="padding:10px;background:#f7f7f7;border-radius:6px 0 0 6px;">Total YouTube views</td><td style="padding:10px;background:#f7f7f7;border-radius:0 6px 6px 0;text-align:right;font-size:18px;font-weight:600;">${formatNum(views)}</td></tr>
        </table>
        <p style="text-align:center;margin:30px 0;">
          <a href="https://gohotelwinners.com/dashboard.html" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Full report →</a>
        </p>
      `,
    },
    channel_add: {
      label: '채널 추가 제안',
      subject: `🎁 Expand ${hotelName}'s reach — unlock more channels`,
      preheader: `Get featured on additional language channels for greater exposure.`,
      body: `
        <p>Hi ${managerName},</p>
        <p>Your hotel is currently featured on <strong>${channels}/8</strong> of our channels.</p>
        <p>By unlocking the remaining channels, <strong>${hotelName}</strong> can reach travelers in additional languages including Japanese, Chinese, and Vietnamese — significantly expanding your booking pipeline.</p>
        <p>Past performance shows hotels on all 8 channels generate <strong>3-5x more bookings</strong> on average.</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="https://gohotelwinners.com/dashboard.html#channels" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Add channels →</a>
        </p>
      `,
    },
  };

  const tpl = templates[pushType];
  if (!tpl) return null;

  const html = wrapEmailShell({ preheader: tpl.preheader, body: tpl.body });
  const text = stripHtml(tpl.body) + '\n\nDashboard: https://gohotelwinners.com/dashboard.html';

  return {
    label: tpl.label,
    subject: tpl.subject,
    html,
    text,
  };
}

function formatNum(n) {
  return Number(n || 0).toLocaleString();
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function wrapEmailShell({ preheader, body }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title></title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader || ''}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:30px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
      <tr><td style="background:linear-gradient(135deg,#7C3AED 0%,#EC4899 50%,#06B6D4 100%);padding:24px 30px;color:#fff;">
        <div style="font-size:18px;font-weight:700;">TravelWinners B2B</div>
        <div style="font-size:13px;opacity:.85;margin-top:2px;">Global hotel exposure platform</div>
      </td></tr>
      <tr><td style="padding:30px;color:#222;font-size:14.5px;line-height:1.65;">${body}</td></tr>
      <tr><td style="padding:18px 30px;background:#f7f7f7;color:#888;font-size:12px;text-align:center;">
        TravelWinners · gohotelwinners.com · <a href="mailto:partners@gohotelwinners.com" style="color:#888;">partners@gohotelwinners.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}


// =============================================================
// BL-ADMIN-USER-MANAGEMENT (2026-05-15)
// admin 통합 audit 헬퍼 + 사용자 관리 핸들러 3종
// =============================================================

// 모든 admin 액션에 자동 호출 — action_logs에 기록.
// 실패해도 메인 응답 막지 않음 (best-effort logging).
async function logAdminAction(serviceKey, params) {
  try {
    const body = {
      action: params.action,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      target_email: params.targetEmail || null,
      performed_by: params.performedBy,
      performed_by_email: params.performedByEmail,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      before_state: params.beforeState || null,
      after_state: params.afterState || null,
      metadata: params.metadata || null,
      notes: params.notes || null,
    };
    await fetch(SUPABASE_URL + '/rest/v1/action_logs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn('logAdminAction failed:', e.message);
  }
}

// =============================================================
// Sub-handler: delete-user
// auth.users에서 사용자 삭제 + admins/hotels CASCADE 정리.
// owner 삭제 차단. 본인 삭제 차단. 삭제 전 호텔/예약 데이터 백업 옵션.
// =============================================================
async function handleDeleteUser(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  const targetUserId = body.user_id;
  const reason = (body.reason || '').toString().slice(0, 500);
  if (!targetUserId) {
    return res.status(400).json({ error: 'user_id required' });
  }

  // 본인 삭제 방어
  if (targetUserId === admin.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  // 대상 사용자 정보 조회 (owner 보호 + 감사용 before_state)
  const userResp = await fetch(
    SUPABASE_URL + '/rest/v1/admins?id=eq.' + encodeURIComponent(targetUserId) + '&select=id,email,role,is_active',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const adminRows = await userResp.json();
  const targetAdmin = Array.isArray(adminRows) && adminRows.length > 0 ? adminRows[0] : null;

  // owner 삭제 차단 (헌법: dgmasters01@gmail.com은 절대 삭제 불가)
  if (targetAdmin && targetAdmin.role === 'owner') {
    return res.status(403).json({ error: 'Cannot delete owner account' });
  }

  // 호텔 정보도 함께 조회 (감사용)
  const hotelResp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?user_id=eq.' + encodeURIComponent(targetUserId) + '&select=id,hotel_name,status',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const hotels = await hotelResp.json();

  // auth.users DELETE (Supabase Admin API)
  // service_role + auth admin endpoint 사용
  const deleteResp = await fetch(
    SUPABASE_URL + '/auth/v1/admin/users/' + encodeURIComponent(targetUserId),
    {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
      },
    }
  );

  if (!deleteResp.ok) {
    const errText = await deleteResp.text().catch(() => '');
    await logAdminAction(serviceKey, {
      action: 'delete-user',
      targetType: 'user',
      targetId: targetUserId,
      targetEmail: targetAdmin?.email,
      performedBy: admin.id,
      performedByEmail: admin.email,
      status: 'failed',
      errorMessage: 'auth_delete_failed: ' + errText.slice(0, 200),
      metadata: { reason, http_status: deleteResp.status },
    });
    return res.status(500).json({
      error: 'auth_delete_failed',
      detail: errText.slice(0, 500),
      http_status: deleteResp.status,
    });
  }

  // 성공 — admins/hotels는 ON DELETE CASCADE 또는 trigger로 정리됨
  // 명시적 CASCADE 안 되어 있는 경우 수동 정리
  // admins 정리 (있다면)
  if (targetAdmin) {
    await fetch(
      SUPABASE_URL + '/rest/v1/admins?id=eq.' + encodeURIComponent(targetUserId),
      {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey },
      }
    ).catch(() => {});
  }

  await logAdminAction(serviceKey, {
    action: 'delete-user',
    targetType: 'user',
    targetId: targetUserId,
    targetEmail: targetAdmin?.email,
    performedBy: admin.id,
    performedByEmail: admin.email,
    status: 'success',
    beforeState: { admin: targetAdmin, hotels: hotels?.length ? hotels : null },
    metadata: { reason },
  });

  return res.status(200).json({
    success: true,
    deleted_user_id: targetUserId,
    deleted_email: targetAdmin?.email,
    affected_hotels: hotels?.length || 0,
  });
}

// =============================================================
// Sub-handler: change-role
// admins.role 변경 — owner는 변경 불가, owner 박탈 불가.
// 가능한 role: 'admin' / 'staff' / 'readonly' / 'manager'
// =============================================================
async function handleChangeRole(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  const targetUserId = body.user_id;
  const newRole = (body.new_role || '').toString();
  const newActive = body.is_active;  // boolean — 권한 박탈 (false) 또는 복원 (true)
  const reason = (body.reason || '').toString().slice(0, 500);

  if (!targetUserId) {
    return res.status(400).json({ error: 'user_id required' });
  }

  const ALLOWED_ROLES = ['admin', 'staff', 'readonly', 'manager'];
  if (newRole && !ALLOWED_ROLES.includes(newRole)) {
    return res.status(400).json({ error: 'invalid role', allowed: ALLOWED_ROLES });
  }
  if (!newRole && typeof newActive !== 'boolean') {
    return res.status(400).json({ error: 'either new_role or is_active required' });
  }

  // 대상 admins row 조회
  const userResp = await fetch(
    SUPABASE_URL + '/rest/v1/admins?id=eq.' + encodeURIComponent(targetUserId) + '&select=id,email,role,is_active',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const rows = await userResp.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(404).json({ error: 'Admin row not found for this user' });
  }
  const target = rows[0];

  // owner 변경 차단
  if (target.role === 'owner') {
    return res.status(403).json({ error: 'Cannot change owner role' });
  }

  // 본인 강등 차단
  if (target.id === admin.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  // 업데이트할 필드 박기
  const updates = {};
  if (newRole) updates.role = newRole;
  if (typeof newActive === 'boolean') updates.is_active = newActive;

  const patchResp = await fetch(
    SUPABASE_URL + '/rest/v1/admins?id=eq.' + encodeURIComponent(targetUserId),
    {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updates),
    }
  );
  const updated = await patchResp.json();
  if (!patchResp.ok) {
    await logAdminAction(serviceKey, {
      action: 'change-role',
      targetType: 'user',
      targetId: targetUserId,
      targetEmail: target.email,
      performedBy: admin.id,
      performedByEmail: admin.email,
      status: 'failed',
      errorMessage: 'patch_failed',
      beforeState: target,
      metadata: { reason, updates },
    });
    return res.status(500).json({ error: 'patch_failed', detail: updated });
  }

  const after = Array.isArray(updated) && updated.length > 0 ? updated[0] : null;

  await logAdminAction(serviceKey, {
    action: 'change-role',
    targetType: 'user',
    targetId: targetUserId,
    targetEmail: target.email,
    performedBy: admin.id,
    performedByEmail: admin.email,
    status: 'success',
    beforeState: target,
    afterState: after,
    metadata: { reason, updates },
  });

  return res.status(200).json({
    success: true,
    user_id: targetUserId,
    before: target,
    after: after,
  });
}

// =============================================================
// Sub-handler: re-verify
// 이메일 재인증 요청 — auth.users.email_confirmed_at 초기화 + 인증 메일 재발송.
// 매니저가 인증 메일 못 받았거나 인증 후 이메일 변경 의심 시 사용.
// =============================================================
async function handleReVerify(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  const targetUserId = body.user_id;
  const reason = (body.reason || '').toString().slice(0, 500);
  if (!targetUserId) {
    return res.status(400).json({ error: 'user_id required' });
  }

  // 대상 사용자 이메일 조회
  const userResp = await fetch(
    SUPABASE_URL + '/auth/v1/admin/users/' + encodeURIComponent(targetUserId),
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!userResp.ok) {
    return res.status(404).json({ error: 'User not found', http_status: userResp.status });
  }
  const user = await userResp.json();

  // 인증 메일 재발송 (Supabase Auth Admin API의 invite endpoint 활용)
  // 주의: 기존 사용자에 대해 reset password 링크 또는 magic link 발송이 표준.
  // 여기선 magic link 발송으로 처리 (재인증 효과).
  const linkResp = await fetch(
    SUPABASE_URL + '/auth/v1/admin/generate_link',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: user.email,
      }),
    }
  );
  const linkData = await linkResp.json().catch(() => ({}));

  if (!linkResp.ok) {
    await logAdminAction(serviceKey, {
      action: 're-verify',
      targetType: 'user',
      targetId: targetUserId,
      targetEmail: user.email,
      performedBy: admin.id,
      performedByEmail: admin.email,
      status: 'failed',
      errorMessage: 'magic_link_failed',
      metadata: { reason, http_status: linkResp.status },
    });
    return res.status(500).json({ error: 'magic_link_failed', detail: linkData });
  }

  await logAdminAction(serviceKey, {
    action: 're-verify',
    targetType: 'user',
    targetId: targetUserId,
    targetEmail: user.email,
    performedBy: admin.id,
    performedByEmail: admin.email,
    status: 'success',
    metadata: { reason },
  });

  return res.status(200).json({
    success: true,
    user_id: targetUserId,
    email: user.email,
    message: 'Magic link sent to user email',
  });
}


// =============================================================
// [BL-ADMIN-USER-MANAGEMENT step4] handleUpdateHotelStatus
//   호텔 status 변경 + before/after audit 자동 기록
//   기존: admin.html에서 T.db.setHotelStatus 직접 호출 → action_logs 누락
//   개선: 모든 status 변경이 이 API 거치게 함 → 통합 audit
//   허용 status: pending / review / approved / rejected / paid / producing / published
// =============================================================
const HOTEL_STATUS_WHITELIST = ['pending', 'review', 'approved', 'rejected', 'paid', 'producing', 'published'];

async function handleUpdateHotelStatus(req, res, serviceKey, admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST_required' });
  const { hotel_id, new_status, reason } = req.body || {};
  if (!hotel_id) return res.status(400).json({ error: 'hotel_id_required' });
  if (!new_status) return res.status(400).json({ error: 'new_status_required' });
  if (!HOTEL_STATUS_WHITELIST.includes(new_status)) {
    return res.status(400).json({ error: 'invalid_status', allowed: HOTEL_STATUS_WHITELIST });
  }

  // before state
  const beforeResp = await fetch(SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotel_id) + '&select=id,hotel_name,status,city,country', {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
  });
  if (!beforeResp.ok) {
    return res.status(500).json({ error: 'hotel_fetch_failed' });
  }
  const beforeRows = await beforeResp.json();
  if (!beforeRows.length) return res.status(404).json({ error: 'hotel_not_found' });
  const before = beforeRows[0];

  // 같은 status로 변경 시도 차단 (소음 줄이기)
  if (before.status === new_status) {
    return res.status(200).json({ success: true, unchanged: true, status: new_status });
  }

  // PATCH
  const patchResp = await fetch(SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotel_id), {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ status: new_status, updated_at: new Date().toISOString() })
  });
  if (!patchResp.ok) {
    const errBody = await patchResp.text();
    return res.status(500).json({ error: 'patch_failed', detail: errBody });
  }
  const after = (await patchResp.json())[0];

  // BL-HOTEL-DETAIL-PAGE — status_change 자동 타임라인 기록 (fire-and-forget, 실패해도 응답 영향 없음)
  try {
    await fetch(SUPABASE_URL + '/rest/v1/hotel_communications', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        hotel_id,
        type: 'status_change',
        subject: before.status + ' → ' + after.status,
        content: reason || null,
        created_by_email: admin?.email || null,
        metadata: { from: before.status, to: after.status }
      })
    });
  } catch (_) { /* communication 로깅 실패는 응답에 영향 없음 */ }

  return res.status(200).json({
    success: true,
    hotel_id,
    hotel_name: before.hotel_name,
    before: { status: before.status },
    after: { status: after.status },
    reason: reason || null
  });
  // ※ action_logs 자동 기록은 router의 finally 블록이 처리 (targetType=hotel, targetId=hotel_id)
}

// =============================================================
// [BL-ADMIN-USER-MANAGEMENT step4] handleRefundHotel
//   환불 처리 — status=paid 일 때만 가능
//   1) hotels.status=refunded 변경
//   2) payments 테이블에 refund 행 추가 (amount 음수)
//   3) before/after audit 자동 기록
// =============================================================
async function handleRefundHotel(req, res, serviceKey, admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST_required' });
  const { hotel_id, reason, refund_amount } = req.body || {};
  if (!hotel_id) return res.status(400).json({ error: 'hotel_id_required' });
  if (!reason || reason.length < 5) {
    return res.status(400).json({ error: 'reason_required', hint: 'min 5 chars' });
  }

  // 호텔 + 결제 이력 조회
  const hotelResp = await fetch(SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotel_id) + '&select=id,hotel_name,status', {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
  });
  if (!hotelResp.ok) return res.status(500).json({ error: 'hotel_fetch_failed' });
  const hotels = await hotelResp.json();
  if (!hotels.length) return res.status(404).json({ error: 'hotel_not_found' });
  const hotel = hotels[0];

  // 보호: paid/producing/published 일 때만 환불 가능
  if (!['paid', 'producing', 'published'].includes(hotel.status)) {
    return res.status(400).json({ error: 'cannot_refund', current_status: hotel.status, hint: 'only paid/producing/published can be refunded' });
  }

  // 마지막 completed 결제 조회 (refund_amount 미지정 시 결제 금액 그대로)
  let amount = refund_amount;
  if (amount == null) {
    const payResp = await fetch(SUPABASE_URL + '/rest/v1/payments?hotel_id=eq.' + encodeURIComponent(hotel_id) + '&status=eq.completed&order=created_at.desc&limit=1', {
      headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
    });
    const pays = payResp.ok ? await payResp.json() : [];
    amount = pays.length ? pays[0].amount : 200; // 기본 $200
  }

  // 1) hotels.status = refunded
  const patchResp = await fetch(SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotel_id), {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'refunded', updated_at: new Date().toISOString() })
  });
  if (!patchResp.ok) {
    return res.status(500).json({ error: 'hotel_status_patch_failed' });
  }

  // 2) payments에 refund 행 추가
  const refundResp = await fetch(SUPABASE_URL + '/rest/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      hotel_id,
      amount: -Math.abs(amount),
      currency: 'USD',
      status: 'refunded',
      payment_method: 'admin_refund',
      notes: 'Refund issued by admin: ' + admin.email + ' — ' + reason
    })
  });
  const refundRow = refundResp.ok ? (await refundResp.json())[0] : null;

  return res.status(200).json({
    success: true,
    hotel_id,
    hotel_name: hotel.hotel_name,
    before: { status: hotel.status },
    after: { status: 'refunded' },
    refund: refundRow,
    reason
  });
}


// =============================================================
// [BL-REFUND-FLOW step2] 매니저 환불 신청 처리 (refund_requests 기반)
//   흐름: marketing.html 매니저 본인 신청(pending) → 아래 3개 액션으로 대표님이 확인
//   refund-list    : 신청 목록 조회 (status별 카운트 포함)
//   refund-approve : 승인 → PayPal Refund API 호출 → status=refunded + 이력 기록
//   refund-reject  : 거절 → status=rejected + 사유 기록
//   ※ handleRefundHotel(위)는 호텔 행에서 직접 status 마킹용(별개). 이건 신청-승인 흐름.
// =============================================================
async function handleRefundList(req, res, serviceKey, _admin) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const url = SUPABASE_URL + '/rest/v1/refund_requests?select=*,hotels(hotel_name,city,country)&order=created_at.desc';
  const resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    return res.status(500).json({ error: 'refund_list_failed', detail: t.slice(0, 300) });
  }
  const rows = await resp.json();
  const counts = { pending: 0, approved: 0, rejected: 0, refunded: 0, failed: 0 };
  rows.forEach(function (r) { if (counts[r.status] != null) counts[r.status]++; });
  return res.status(200).json({ success: true, requests: rows, counts });
}

async function handleRefundApprove(req, res, serviceKey, admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST_required' });
  const { id, decision_note } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id_required' });

  // 1) 신청 조회 + pending 확인
  const rResp = await fetch(SUPABASE_URL + '/rest/v1/refund_requests?id=eq.' + encodeURIComponent(id) + '&select=*', {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
  });
  if (!rResp.ok) return res.status(500).json({ error: 'refund_fetch_failed' });
  const reqs = await rResp.json();
  if (!reqs.length) return res.status(404).json({ error: 'refund_request_not_found' });
  const rr = reqs[0];
  if (rr.status !== 'pending') {
    return res.status(400).json({ error: 'not_pending', current_status: rr.status, hint: 'only pending can be approved' });
  }

  // 2) PayPal capture_id 확보 (신청에 없으면 payments에서 역추적)
  let captureId = rr.paypal_capture_id;
  let paymentRow = null;
  if (rr.hotel_id) {
    const pResp = await fetch(SUPABASE_URL + '/rest/v1/payments?hotel_id=eq.' + encodeURIComponent(rr.hotel_id) + '&status=eq.succeeded&order=created_at.desc&limit=1', {
      headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
    });
    const pays = pResp.ok ? await pResp.json() : [];
    paymentRow = pays[0] || null;
    if (!captureId && paymentRow) captureId = paymentRow.paypal_capture_id;
  }
  if (!captureId) {
    return res.status(400).json({ error: 'no_capture_id', hint: 'PayPal capture id를 찾을 수 없습니다. Supabase payments에서 paypal_capture_id 확인 후 수동 환불하세요.' });
  }

  const nowIso = new Date().toISOString();

  // 3) PayPal Refund API 호출
  let refundResult = null;
  try {
    refundResult = await refundCapture(captureId, {
      amount: rr.amount != null ? rr.amount : undefined,
      currency: rr.currency || 'USD',
      note: (rr.reason || 'TravelWinners refund').slice(0, 120),
      requestId: 'tw-b2b-refund-rr-' + id,
    });
  } catch (e) {
    await fetch(SUPABASE_URL + '/rest/v1/refund_requests?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'failed',
        decided_by: admin.email,
        decided_at: nowIso,
        decision_note: decision_note || null,
        paypal_raw: e.paypalRaw || { error: String(e.message || e) }
      })
    }).catch(() => {});
    return res.status(502).json({ error: 'paypal_refund_failed', paypal_error: e.paypalErrorCode || null, message: String(e.message || e) });
  }

  // 4) 성공 → refund_requests 갱신
  await fetch(SUPABASE_URL + '/rest/v1/refund_requests?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'refunded',
      paypal_refund_id: refundResult.id || null,
      paypal_capture_id: captureId,
      paypal_raw: refundResult,
      decided_by: admin.email,
      decided_at: nowIso,
      decision_note: decision_note || null
    })
  }).catch(() => {});

  // 5) 부수효과: hotels.status=refunded + payments 음수 행 (회계 일관성)
  if (rr.hotel_id) {
    await fetch(SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(rr.hotel_id), {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'refunded', updated_at: nowIso })
    }).catch(() => {});

    const amt = rr.amount != null ? rr.amount : (paymentRow ? paymentRow.amount : 200);
    await fetch(SUPABASE_URL + '/rest/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotel_id: rr.hotel_id,
        amount: -Math.abs(amt),
        currency: rr.currency || 'USD',
        status: 'refunded',
        payment_method: 'paypal_refund',
        paypal_capture_id: captureId,
        notes: 'PayPal refund (request ' + id + ') approved by ' + admin.email + (decision_note ? ' — ' + decision_note : '')
      })
    }).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    id,
    status: 'refunded',
    paypal_refund_id: refundResult.id || null,
    paypal_status: refundResult.status || null
  });
}

async function handleRefundReject(req, res, serviceKey, admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST_required' });
  const { id, decision_note } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id_required' });
  if (!decision_note || decision_note.length < 3) {
    return res.status(400).json({ error: 'decision_note_required', hint: '거절 사유 최소 3자' });
  }

  const rResp = await fetch(SUPABASE_URL + '/rest/v1/refund_requests?id=eq.' + encodeURIComponent(id) + '&select=status,manager_email,amount,currency,hotels(hotel_name)', {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
  });
  const reqs = rResp.ok ? await rResp.json() : [];
  if (!reqs.length) return res.status(404).json({ error: 'refund_request_not_found' });
  const rr = reqs[0];
  if (rr.status !== 'pending') return res.status(400).json({ error: 'not_pending', current_status: rr.status });

  const patchResp = await fetch(SUPABASE_URL + '/rest/v1/refund_requests?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'rejected',
      decided_by: admin.email,
      decided_at: new Date().toISOString(),
      decision_note: decision_note
    })
  });
  if (!patchResp.ok) return res.status(500).json({ error: 'reject_patch_failed' });

  // 매니저 거절 통보 메일 (부수효과 — 실패해도 거절 처리는 성공으로 응답)
  let emailResult = { ok: false, skipped: true };
  if (rr.manager_email) {
    const hotelName = (rr.hotels && rr.hotels.hotel_name) ? rr.hotels.hotel_name : '귀하의 호텔';
    try {
      emailResult = await sendSystemEmail({
        to: rr.manager_email,
        subject: '[TravelWinners] 환불 요청 처리 결과 안내',
        replyTo: 'support@gohotelwinners.com',
        html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">'
          + '<h2 style="color:#0E1410">환불 요청 처리 결과</h2>'
          + '<p>안녕하세요. 요청하신 환불 건이 검토되었으며, 아래와 같이 안내드립니다.</p>'
          + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
          + '<tr><td style="padding:8px;background:#f5f5f5;width:120px">대상 호텔</td><td style="padding:8px">' + escapeHtmlEmail(hotelName) + '</td></tr>'
          + '<tr><td style="padding:8px;background:#f5f5f5">처리 결과</td><td style="padding:8px;color:#c0392b;font-weight:bold">반려(거절)</td></tr>'
          + '<tr><td style="padding:8px;background:#f5f5f5">사유</td><td style="padding:8px">' + escapeHtmlEmail(decision_note) + '</td></tr>'
          + '</table>'
          + '<p>문의 사항이 있으시면 본 메일에 회신해 주시기 바랍니다.</p>'
          + '<p style="color:#888;font-size:13px;margin-top:24px">TravelWinners Inc. · gohotelwinners.com</p>'
          + '</div>'
      });
    } catch (e) {
      emailResult = { ok: false, error: e.message || String(e) };
    }
  }

  return res.status(200).json({ success: true, id, status: 'rejected', email_sent: emailResult.ok });
}

// 메일 본문용 HTML 이스케이프 (간단판)
function escapeHtmlEmail(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// =============================================================
// BL-INVOICE-003 — 인보이스 설정 핸들러 (owner only)
// =============================================================
// company_info는 singleton (id=1). admin/staff도 SELECT는 가능 (인보이스 PDF용),
// 단 UPDATE는 owner만 가능. 변경 이력은 log_invoice_settings_change()로 action_logs에 자동 기록.
// =============================================================

// company_info에서 클라이언트 노출 가능한 필드 화이트리스트
// (updated_by UUID 같은 내부 필드는 제외, _email/updated_at은 표시용으로 포함)
const COMPANY_INFO_PUBLIC_FIELDS = [
  'id',
  'legal_entity_en', 'legal_entity_ko',
  'business_number',
  'ceo_name_en', 'ceo_name_ko',
  'address_en', 'address_ko',
  'business_type', 'business_item',
  'contact_email', 'contact_phone',
  'stamp_storage_path', 'signature_storage_path',
  'updated_at', 'updated_by_email'
];

// UPDATE 허용 필드 화이트리스트 (id/updated_* 등 시스템 필드 제외)
const COMPANY_INFO_UPDATABLE_FIELDS = [
  'legal_entity_en', 'legal_entity_ko',
  'business_number',
  'ceo_name_en', 'ceo_name_ko',
  'address_en', 'address_ko',
  'business_type', 'business_item',
  'contact_email', 'contact_phone'
  // stamp_storage_path / signature_storage_path는 단계 4 도장·서명 업로드 핸들러에서 박음
];

function fmtUpdatedAtLabel(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      year:'numeric', month:'short', day:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
  } catch { return iso; }
}

async function handleInvoiceGetCompanyInfo(req, res, serviceKey, admin) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // 권한: admin 전부 SELECT 허용 (인보이스 PDF에 박힐 정보. RLS도 같은 정책)
  // 단, owner가 아닌 경우 클라이언트(admin-settings.html)는 진입 자체 차단됨.

  const selectFields = COMPANY_INFO_PUBLIC_FIELDS.join(',');
  const url = SUPABASE_URL + '/rest/v1/company_info?id=eq.1&select=' + encodeURIComponent(selectFields);
  const r = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Accept': 'application/json'
    }
  });
  if (!r.ok) {
    const text = await r.text();
    return res.status(500).json({ error: 'fetch_company_info_failed', detail: text });
  }
  const rows = await r.json();
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) {
    return res.status(404).json({
      error: 'company_info_not_found',
      hint: 'sql/bl-invoice-003-company-info.sql 실행 필요 (singleton row id=1)'
    });
  }
  return res.status(200).json({
    success: true,
    company_info: row,
    updated_at_label: fmtUpdatedAtLabel(row.updated_at)
  });
}

async function handleInvoiceUpdateCompanyInfo(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', hint: 'POST only' });
  }
  // ★ owner only — SQL RLS가 1차 차단하지만 API에서 명시적으로 한 번 더 박음
  if (admin.role !== 'owner') {
    return res.status(403).json({
      error: 'owner_only',
      hint: '회사 정보 수정은 owner 권한만 가능합니다.',
      current_role: admin.role
    });
  }

  const body = req.body || {};
  const changes = body.changes || {};
  if (typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).length === 0) {
    return res.status(400).json({ error: 'missing_changes', hint: 'body.changes 객체 (필드:값) 필수' });
  }

  // 화이트리스트 검증
  const unknownFields = Object.keys(changes).filter(k => !COMPANY_INFO_UPDATABLE_FIELDS.includes(k));
  if (unknownFields.length > 0) {
    return res.status(400).json({
      error: 'unknown_fields',
      received: unknownFields,
      allowed: COMPANY_INFO_UPDATABLE_FIELDS
    });
  }

  // 사업자등록번호 형식 검증 (10자리, 하이픈 허용)
  if (changes.business_number !== undefined && changes.business_number !== '') {
    const digits = String(changes.business_number).replace(/-/g, '');
    if (!/^\d{10}$/.test(digits)) {
      return res.status(400).json({
        error: 'invalid_business_number',
        hint: '사업자등록번호는 10자리 숫자여야 합니다.'
      });
    }
  }
  // 이메일 형식 검증
  if (changes.contact_email !== undefined && changes.contact_email !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(changes.contact_email))) {
      return res.status(400).json({ error: 'invalid_email_format' });
    }
  }

  // ───────────────────────────────────────────────
  // 1) BEFORE state — 변경 이력용 (영향받는 필드만)
  // ───────────────────────────────────────────────
  const selectForBefore = ['id', ...Object.keys(changes), 'updated_at', 'updated_by_email'].join(',');
  const beforeResp = await fetch(
    SUPABASE_URL + '/rest/v1/company_info?id=eq.1&select=' + encodeURIComponent(selectForBefore),
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!beforeResp.ok) {
    const text = await beforeResp.text();
    return res.status(500).json({ error: 'fetch_before_failed', detail: text });
  }
  const beforeRows = await beforeResp.json();
  const beforeRow = Array.isArray(beforeRows) && beforeRows.length > 0 ? beforeRows[0] : null;
  if (!beforeRow) {
    return res.status(404).json({ error: 'company_info_not_found' });
  }

  // 실제 변경된 필드만 추림 (값이 같으면 skip)
  const actualChanges = {};
  for (const [k, v] of Object.entries(changes)) {
    const before = beforeRow[k] != null ? String(beforeRow[k]) : '';
    const after = v != null ? String(v) : '';
    if (before !== after) {
      actualChanges[k] = v;
    }
  }
  if (Object.keys(actualChanges).length === 0) {
    return res.status(200).json({
      success: true,
      no_changes: true,
      message: '변경된 내용이 없습니다.',
      company_info: beforeRow
    });
  }

  // ───────────────────────────────────────────────
  // 2) UPDATE company_info
  // ───────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const updatePayload = {
    ...actualChanges,
    updated_at: nowIso,
    updated_by: admin.userId || null,
    updated_by_email: admin.email
  };

  const updateResp = await fetch(
    SUPABASE_URL + '/rest/v1/company_info?id=eq.1',
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
    const text = await updateResp.text();
    return res.status(500).json({ error: 'update_failed', detail: text });
  }
  const updatedRows = await updateResp.json();
  const updatedRow = Array.isArray(updatedRows) && updatedRows.length > 0 ? updatedRows[0] : null;

  // ───────────────────────────────────────────────
  // 3) 변경 이력 기록 — log_invoice_settings_change() RPC
  // ───────────────────────────────────────────────
  // before/after JSONB는 actualChanges 키만 박음 (전체 row 덤프 방지)
  const beforeJson = {};
  const afterJson = {};
  for (const k of Object.keys(actualChanges)) {
    beforeJson[k] = beforeRow[k];
    afterJson[k] = actualChanges[k];
  }

  try {
    const rpcResp = await fetch(
      SUPABASE_URL + '/rest/v1/rpc/log_invoice_settings_change',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_action: 'invoice-settings.company-info.update',
          p_target_id: null,                                  // company_info는 int=1이므로 null
          p_target_label: 'company_info',
          p_performed_by: admin.userId || null,
          p_performed_email: admin.email,
          p_before: beforeJson,
          p_after: afterJson,
          p_metadata: {
            changed_fields: Object.keys(actualChanges),
            field_count: Object.keys(actualChanges).length,
            user_agent: (req.headers['user-agent'] || '').slice(0, 200)
          }
        })
      }
    );
    if (!rpcResp.ok) {
      const text = await rpcResp.text();
      // 이력 기록 실패는 응답에 경고만 박고 UPDATE는 성공으로 반환
      // (이력 부재가 비즈니스 영향을 막진 않음. action_logs.action_logs_select_admin도 fallback 처리)
      console.warn('[invoice-update-company-info] audit log 기록 실패:', text);
    }
  } catch (auditErr) {
    console.warn('[invoice-update-company-info] audit log 예외:', auditErr.message);
  }

  return res.status(200).json({
    success: true,
    company_info: updatedRow,
    updated_at_label: fmtUpdatedAtLabel(updatedRow ? updatedRow.updated_at : nowIso),
    changed_fields: Object.keys(actualChanges),
    changed_count: Object.keys(actualChanges).length
  });
}


// =============================================================
// BL-INVOICE-003 단계 3 — payment_accounts 결제 계좌 핸들러
// =============================================================
// 3행 singleton (id=1 krw / id=2 usd / id=3 paypal)
// SELECT: admin + 매니저(인보이스 PDF용), UPDATE: owner only
// =============================================================

const PAYMENT_ACCOUNTS_PUBLIC_FIELDS = [
  'id', 'type',
  'krw_bank_name', 'krw_account_no', 'krw_account_holder', 'krw_business_no',
  'usd_bank_name', 'usd_bank_address', 'usd_swift_code', 'usd_iban',
  'usd_account_no', 'usd_recipient_name', 'usd_recipient_address',
  'paypal_email', 'paypal_merchant_id',
  'is_active', 'notes',
  'updated_at', 'updated_by_email'
];

// 타입별 업데이트 허용 필드 (잘못된 타입에 잘못된 필드 박지 못하게)
const PAYMENT_TYPE_FIELDS = {
  krw: ['krw_bank_name', 'krw_account_no', 'krw_account_holder', 'krw_business_no', 'is_active', 'notes'],
  usd: ['usd_bank_name', 'usd_bank_address', 'usd_swift_code', 'usd_iban',
        'usd_account_no', 'usd_recipient_name', 'usd_recipient_address', 'is_active', 'notes'],
  paypal: ['paypal_email', 'paypal_merchant_id', 'is_active', 'notes']
};

async function handleInvoiceGetPaymentAccounts(req, res, serviceKey, admin) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const selectFields = PAYMENT_ACCOUNTS_PUBLIC_FIELDS.join(',');
  const url = SUPABASE_URL + '/rest/v1/payment_accounts?select=' + encodeURIComponent(selectFields) + '&order=id.asc';
  const r = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Accept': 'application/json'
    }
  });
  if (!r.ok) {
    const text = await r.text();
    return res.status(500).json({ error: 'fetch_payment_accounts_failed', detail: text });
  }
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(404).json({
      error: 'payment_accounts_not_found',
      hint: 'sql/bl-invoice-003-payment-accounts.sql 실행 필요 (3행 singleton 박혀야 함)'
    });
  }

  // 타입별로 묶어서 반환 (UI 편의)
  const byType = {};
  for (const row of rows) {
    byType[row.type] = {
      ...row,
      updated_at_label: fmtUpdatedAtLabel(row.updated_at)
    };
  }

  return res.status(200).json({
    success: true,
    accounts: rows,
    by_type: byType,
    expected_types: ['krw', 'usd', 'paypal']
  });
}

async function handleInvoiceUpdatePaymentAccounts(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', hint: 'POST only' });
  }
  if (admin.role !== 'owner') {
    return res.status(403).json({
      error: 'owner_only',
      hint: '결제 계좌 수정은 owner 권한만 가능합니다.',
      current_role: admin.role
    });
  }

  const body = req.body || {};
  const type = String(body.type || '').toLowerCase();
  const changes = body.changes || {};

  if (!['krw', 'usd', 'paypal'].includes(type)) {
    return res.status(400).json({
      error: 'invalid_type',
      received: type,
      allowed: ['krw', 'usd', 'paypal']
    });
  }
  if (typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).length === 0) {
    return res.status(400).json({ error: 'missing_changes', hint: 'body.changes 객체 필수' });
  }

  // 화이트리스트 — 해당 type에 허용된 필드만
  const allowed = PAYMENT_TYPE_FIELDS[type];
  const unknownFields = Object.keys(changes).filter(k => !allowed.includes(k));
  if (unknownFields.length > 0) {
    return res.status(400).json({
      error: 'unknown_fields_for_type',
      type,
      received: unknownFields,
      allowed
    });
  }

  // 타입별 검증
  if (type === 'paypal' && changes.paypal_email !== undefined && changes.paypal_email !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(changes.paypal_email))) {
      return res.status(400).json({ error: 'invalid_paypal_email_format' });
    }
  }
  if (type === 'krw' && changes.krw_business_no !== undefined && changes.krw_business_no !== '') {
    const digits = String(changes.krw_business_no).replace(/-/g, '');
    if (!/^\d{10}$/.test(digits)) {
      return res.status(400).json({
        error: 'invalid_krw_business_no',
        hint: '사업자등록번호는 10자리 숫자 (하이픈 허용)'
      });
    }
  }
  if (type === 'usd' && changes.usd_swift_code !== undefined && changes.usd_swift_code !== '') {
    // SWIFT/BIC: 8 또는 11자리 영숫자
    if (!/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(String(changes.usd_swift_code).toUpperCase())) {
      return res.status(400).json({
        error: 'invalid_swift_code',
        hint: 'SWIFT/BIC는 8 또는 11자리 영숫자'
      });
    }
  }

  // BEFORE state
  const selectForBefore = ['id', 'type', ...Object.keys(changes)].join(',');
  const beforeResp = await fetch(
    SUPABASE_URL + '/rest/v1/payment_accounts?type=eq.' + encodeURIComponent(type) + '&select=' + encodeURIComponent(selectForBefore),
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!beforeResp.ok) {
    const text = await beforeResp.text();
    return res.status(500).json({ error: 'fetch_before_failed', detail: text });
  }
  const beforeRows = await beforeResp.json();
  const beforeRow = Array.isArray(beforeRows) && beforeRows.length > 0 ? beforeRows[0] : null;
  if (!beforeRow) {
    return res.status(404).json({ error: 'payment_account_row_not_found', type });
  }

  const actualChanges = {};
  for (const [k, v] of Object.entries(changes)) {
    const before = beforeRow[k] != null ? String(beforeRow[k]) : '';
    const after = v != null ? String(v) : '';
    if (before !== after) {
      actualChanges[k] = v;
    }
  }
  if (Object.keys(actualChanges).length === 0) {
    return res.status(200).json({
      success: true,
      no_changes: true,
      message: '변경된 내용이 없습니다.',
      type,
      account: beforeRow
    });
  }

  // SWIFT 정규화
  if (actualChanges.usd_swift_code) {
    actualChanges.usd_swift_code = String(actualChanges.usd_swift_code).toUpperCase();
  }

  // UPDATE
  const updatePayload = {
    ...actualChanges,
    updated_by: admin.userId || null,
    updated_by_email: admin.email
    // updated_at은 트리거가 자동
  };
  const updateResp = await fetch(
    SUPABASE_URL + '/rest/v1/payment_accounts?type=eq.' + encodeURIComponent(type),
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
    const text = await updateResp.text();
    return res.status(500).json({ error: 'update_failed', detail: text });
  }
  const updatedRows = await updateResp.json();
  const updatedRow = Array.isArray(updatedRows) && updatedRows.length > 0 ? updatedRows[0] : null;

  // Audit log
  const beforeJson = {};
  const afterJson = {};
  for (const k of Object.keys(actualChanges)) {
    beforeJson[k] = beforeRow[k];
    afterJson[k] = actualChanges[k];
  }
  try {
    await fetch(
      SUPABASE_URL + '/rest/v1/rpc/log_invoice_settings_change',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_action: 'invoice-settings.payment-accounts.update',
          p_target_id: null,
          p_target_label: 'payment_accounts:' + type,
          p_performed_by: admin.userId || null,
          p_performed_email: admin.email,
          p_before: beforeJson,
          p_after: afterJson,
          p_metadata: {
            type,
            changed_fields: Object.keys(actualChanges),
            field_count: Object.keys(actualChanges).length,
            user_agent: (req.headers['user-agent'] || '').slice(0, 200)
          }
        })
      }
    );
  } catch (auditErr) {
    console.warn('[invoice-update-payment-accounts] audit log 예외:', auditErr.message);
  }

  return res.status(200).json({
    success: true,
    type,
    account: updatedRow,
    updated_at_label: fmtUpdatedAtLabel(updatedRow ? updatedRow.updated_at : new Date().toISOString()),
    changed_fields: Object.keys(actualChanges),
    changed_count: Object.keys(actualChanges).length
  });
}


// =============================================================
// BL-INVOICE-003 단계 4 — 도장·서명 이미지 업로드 핸들러
// =============================================================
// 버킷: 'invoice-assets' (private, owner upload, admin read)
// asset_kind: 'stamp' | 'signature'
// 클라이언트는 base64 data URL로 전송 (Vercel 함수에서 multipart 받기 복잡 회피)
// 업로드 후 company_info.stamp_storage_path / signature_storage_path 자동 갱신
// =============================================================

const INVOICE_ASSET_BUCKET = 'invoice-assets';
const INVOICE_ASSET_MAX_BYTES = 2 * 1024 * 1024;  // 2MB
const INVOICE_ASSET_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];

async function handleInvoiceUploadAsset(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', hint: 'POST only' });
  }
  if (admin.role !== 'owner') {
    return res.status(403).json({
      error: 'owner_only',
      hint: '도장·서명 업로드는 owner 권한만 가능합니다.',
      current_role: admin.role
    });
  }

  const body = req.body || {};
  const assetKind = String(body.asset_kind || '').toLowerCase();   // 'stamp' | 'signature'
  const dataUrl = body.data_url || '';                              // 'data:image/png;base64,...'
  const action = String(body.action_type || 'upload').toLowerCase();// 'upload' | 'delete'

  if (!['stamp', 'signature'].includes(assetKind)) {
    return res.status(400).json({
      error: 'invalid_asset_kind',
      received: assetKind,
      allowed: ['stamp', 'signature']
    });
  }
  if (!['upload', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'invalid_action_type', allowed: ['upload', 'delete'] });
  }

  const pathColumn = assetKind === 'stamp' ? 'stamp_storage_path' : 'signature_storage_path';

  // 현재 company_info의 path 확인 (delete 시 기존 파일 삭제용)
  const ciResp = await fetch(
    SUPABASE_URL + '/rest/v1/company_info?id=eq.1&select=' + pathColumn,
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!ciResp.ok) {
    const text = await ciResp.text();
    return res.status(500).json({ error: 'fetch_company_info_failed', detail: text });
  }
  const ciRows = await ciResp.json();
  const currentPath = (ciRows[0] || {})[pathColumn] || null;

  // ──────────────── DELETE 경로 ────────────────
  if (action === 'delete') {
    if (!currentPath) {
      return res.status(200).json({
        success: true,
        no_op: true,
        message: '삭제할 ' + assetKind + ' 이미지가 없습니다.',
        asset_kind: assetKind
      });
    }
    // Storage object 삭제
    const delResp = await fetch(
      SUPABASE_URL + '/storage/v1/object/' + INVOICE_ASSET_BUCKET + '/' + currentPath,
      {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
      }
    );
    // Storage delete 실패해도 company_info path는 비움 (orphan path 방지)

    const patchResp = await fetch(
      SUPABASE_URL + '/rest/v1/company_info?id=eq.1',
      {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          [pathColumn]: null,
          updated_at: new Date().toISOString(),
          updated_by: admin.userId || null,
          updated_by_email: admin.email
        })
      }
    );
    if (!patchResp.ok) {
      const text = await patchResp.text();
      return res.status(500).json({ error: 'company_info_update_failed', detail: text });
    }

    // Audit log
    try {
      await fetch(
        SUPABASE_URL + '/rest/v1/rpc/log_invoice_settings_change',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + serviceKey,
            'apikey': serviceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            p_action: 'invoice-settings.' + assetKind + '.delete',
            p_target_id: null,
            p_target_label: 'company_info.' + pathColumn,
            p_performed_by: admin.userId || null,
            p_performed_email: admin.email,
            p_before: { [pathColumn]: currentPath },
            p_after: { [pathColumn]: null },
            p_metadata: {
              asset_kind: assetKind,
              storage_delete_ok: delResp.ok,
              user_agent: (req.headers['user-agent'] || '').slice(0, 200)
            }
          })
        }
      );
    } catch (auditErr) {
      console.warn('[invoice-upload-asset DELETE] audit 예외:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      deleted: true,
      asset_kind: assetKind,
      previous_path: currentPath,
      storage_delete_status: delResp.status
    });
  }

  // ──────────────── UPLOAD 경로 ────────────────
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'missing_data_url', hint: 'body.data_url (data:image/png;base64,...) 필수' });
  }
  // data URL parse
  const m = dataUrl.match(/^data:([a-zA-Z0-9+\/]+);base64,(.+)$/);
  if (!m) {
    return res.status(400).json({ error: 'invalid_data_url_format', hint: 'data:image/png;base64,xxx 형식만 허용' });
  }
  const mime = m[1].toLowerCase();
  const b64 = m[2];

  if (!INVOICE_ASSET_ALLOWED_MIME.includes(mime)) {
    return res.status(400).json({
      error: 'unsupported_mime_type',
      received: mime,
      allowed: INVOICE_ASSET_ALLOWED_MIME
    });
  }

  let buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch (e) {
    return res.status(400).json({ error: 'invalid_base64', detail: e.message });
  }
  if (buffer.length === 0) {
    return res.status(400).json({ error: 'empty_file' });
  }
  if (buffer.length > INVOICE_ASSET_MAX_BYTES) {
    return res.status(400).json({
      error: 'file_too_large',
      max_bytes: INVOICE_ASSET_MAX_BYTES,
      received_bytes: buffer.length,
      hint: '2MB 이하 이미지만 허용'
    });
  }

  // 파일명 — assetKind/timestamp.확장자 (캐시 무효화 + 이력 추적용)
  const ext = mime === 'image/png' ? 'png' : (mime === 'image/jpeg' ? 'jpg' : 'webp');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const storagePath = assetKind + '/' + assetKind + '-' + ts + '.' + ext;

  // Supabase Storage upload (POST → /storage/v1/object/{bucket}/{path})
  const uploadResp = await fetch(
    SUPABASE_URL + '/storage/v1/object/' + INVOICE_ASSET_BUCKET + '/' + storagePath,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': mime,
        'x-upsert': 'true',
        'cache-control': 'max-age=3600'
      },
      body: buffer
    }
  );

  if (!uploadResp.ok) {
    const text = await uploadResp.text();
    // 버킷 부재 시 가독성 있는 에러
    if (uploadResp.status === 404 || /bucket/i.test(text)) {
      return res.status(500).json({
        error: 'storage_bucket_missing',
        bucket: INVOICE_ASSET_BUCKET,
        hint: 'sql/bl-invoice-003-storage-bucket.sql 실행으로 버킷 신설 필요',
        detail: text
      });
    }
    return res.status(500).json({ error: 'storage_upload_failed', status: uploadResp.status, detail: text });
  }

  // company_info path 갱신
  const patchResp = await fetch(
    SUPABASE_URL + '/rest/v1/company_info?id=eq.1',
    {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        [pathColumn]: storagePath,
        updated_at: new Date().toISOString(),
        updated_by: admin.userId || null,
        updated_by_email: admin.email
      })
    }
  );
  if (!patchResp.ok) {
    const text = await patchResp.text();
    return res.status(500).json({ error: 'company_info_update_failed', detail: text });
  }

  // 기존 파일이 있으면 삭제 (orphan 방지) — 실패해도 응답에 영향 없음
  if (currentPath && currentPath !== storagePath) {
    try {
      await fetch(
        SUPABASE_URL + '/storage/v1/object/' + INVOICE_ASSET_BUCKET + '/' + currentPath,
        {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
        }
      );
    } catch (_) { /* ignore */ }
  }

  // Audit log
  try {
    await fetch(
      SUPABASE_URL + '/rest/v1/rpc/log_invoice_settings_change',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_action: 'invoice-settings.' + assetKind + '.upload',
          p_target_id: null,
          p_target_label: 'company_info.' + pathColumn,
          p_performed_by: admin.userId || null,
          p_performed_email: admin.email,
          p_before: { [pathColumn]: currentPath },
          p_after: { [pathColumn]: storagePath },
          p_metadata: {
            asset_kind: assetKind,
            mime,
            size_bytes: buffer.length,
            replaced_previous: !!currentPath,
            user_agent: (req.headers['user-agent'] || '').slice(0, 200)
          }
        })
      }
    );
  } catch (auditErr) {
    console.warn('[invoice-upload-asset UPLOAD] audit 예외:', auditErr.message);
  }

  // 서명된 URL 생성 (1시간 만료) — UI 미리보기용
  let signedUrl = null;
  try {
    const signResp = await fetch(
      SUPABASE_URL + '/storage/v1/object/sign/' + INVOICE_ASSET_BUCKET + '/' + storagePath,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresIn: 3600 })
      }
    );
    if (signResp.ok) {
      const signed = await signResp.json();
      // signed.signedURL 형식: "/object/sign/invoice-assets/stamp/xxx.png?token=..."
      signedUrl = SUPABASE_URL + '/storage/v1' + signed.signedURL;
    }
  } catch (_) { /* ignore — preview는 부가 기능 */ }

  return res.status(200).json({
    success: true,
    asset_kind: assetKind,
    storage_path: storagePath,
    bucket: INVOICE_ASSET_BUCKET,
    mime,
    size_bytes: buffer.length,
    signed_url: signedUrl,
    signed_url_expires_in: 3600,
    replaced_previous: !!currentPath
  });
}

// 이미지 서명 URL만 발급 (UI 미리보기용 — 매 페이지 로드 시 갱신)
async function handleInvoiceGetAssetUrl(req, res, serviceKey, admin) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // admin 전부 허용 (UI에 표시는 owner 외에도 일관)
  const url = new URL(req.url || '/', 'http://x');
  const assetKind = String(url.searchParams.get('asset_kind') || '').toLowerCase();
  if (!['stamp', 'signature'].includes(assetKind)) {
    return res.status(400).json({
      error: 'invalid_asset_kind',
      received: assetKind,
      allowed: ['stamp', 'signature']
    });
  }
  const pathColumn = assetKind === 'stamp' ? 'stamp_storage_path' : 'signature_storage_path';
  const ciResp = await fetch(
    SUPABASE_URL + '/rest/v1/company_info?id=eq.1&select=' + pathColumn,
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!ciResp.ok) {
    return res.status(500).json({ error: 'fetch_company_info_failed' });
  }
  const ciRows = await ciResp.json();
  const storagePath = (ciRows[0] || {})[pathColumn] || null;
  if (!storagePath) {
    return res.status(200).json({ success: true, asset_kind: assetKind, has_asset: false });
  }

  const signResp = await fetch(
    SUPABASE_URL + '/storage/v1/object/sign/' + INVOICE_ASSET_BUCKET + '/' + storagePath,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 3600 })
    }
  );
  if (!signResp.ok) {
    const text = await signResp.text();
    return res.status(500).json({ error: 'sign_url_failed', detail: text });
  }
  const signed = await signResp.json();
  return res.status(200).json({
    success: true,
    asset_kind: assetKind,
    has_asset: true,
    storage_path: storagePath,
    signed_url: SUPABASE_URL + '/storage/v1' + signed.signedURL,
    signed_url_expires_in: 3600
  });
}


// =============================================================
// BL-INVOICE-003 단계 5 — invoice-settings 변경 이력 조회
// =============================================================
// action_logs에서 target_type='invoice-settings'만 추림.
// RLS 정책 action_logs_select_invoice_owner가 owner만 조회 가능하게 차단,
// API에서도 한 번 더 owner 검사 (방어적).
// =============================================================
async function handleInvoiceGetAuditLog(req, res, serviceKey, admin) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (admin.role !== 'owner') {
    return res.status(403).json({
      error: 'owner_only',
      hint: '변경 이력은 owner 권한만 조회 가능합니다.',
      current_role: admin.role
    });
  }

  const url = new URL(req.url || '/', 'http://x');
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const limit = Math.min(Math.max(limitParam, 1), 200);   // 1~200 clamp

  // action_logs 컬럼은 sql/action-logs-table.sql 기준
  const selectFields = [
    'id', 'action', 'target_type', 'target_id',
    'performed_by', 'performed_by_email', 'performed_at',
    'status', 'before_state', 'after_state', 'metadata'
  ].join(',');

  const fetchUrl = SUPABASE_URL + '/rest/v1/action_logs'
    + '?target_type=eq.invoice-settings'
    + '&select=' + encodeURIComponent(selectFields)
    + '&order=performed_at.desc'
    + '&limit=' + limit;

  const r = await fetch(fetchUrl, {
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Accept': 'application/json'
    }
  });
  if (!r.ok) {
    const text = await r.text();
    return res.status(500).json({ error: 'fetch_audit_log_failed', detail: text });
  }
  const rows = await r.json();

  // 클라이언트가 바로 쓸 수 있게 간소화
  const items = (Array.isArray(rows) ? rows : []).map(row => {
    const meta = row.metadata || {};
    return {
      id: row.id,
      action: row.action,                                      // 'invoice-settings.company-info.update' 등
      target_label: meta.target_label || null,                 // 'company_info' / 'payment_accounts:krw'
      performed_at: row.performed_at,
      performed_at_label: fmtUpdatedAtLabel(row.performed_at),
      performed_by_email: row.performed_by_email,
      status: row.status,
      changed_fields: meta.changed_fields || [],
      field_count: meta.field_count || (meta.changed_fields ? meta.changed_fields.length : 0),
      before_state: row.before_state,
      after_state: row.after_state,
      // metadata에서 민감하지 않은 부가 정보만
      asset_kind: meta.asset_kind || null,
      size_bytes: meta.size_bytes || null,
      mime: meta.mime || null,
      type: meta.type || null                                  // payment-accounts 의 type (krw/usd/paypal)
    };
  });

  return res.status(200).json({
    success: true,
    items,
    count: items.length,
    limit
  });
}


// =============================================================
// BL-INVOICE-001 단계 3 — 환율 조회 (한국수출입은행 + fx_snapshots 캐시)
// =============================================================
// 모든 admin SELECT 가능 (인보이스 발행 시 fx hit).
// owner는 admin-status에서 환율 상태 점검 가능.
// =============================================================
async function handleInvoiceGetFxRate(req, res, serviceKey, admin) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fxResult = await getFxRate(SUPABASE_URL, serviceKey, 'USD');

    return res.status(200).json({
      success: true,
      rate: fxResult.rate,
      base_currency: 'USD',
      quote_currency: 'KRW',
      source: fxResult.source,
      snapshot_date: fxResult.snapshot_date,
      snapshot_id: fxResult.snapshot_id,
      is_fallback: fxResult.is_fallback,
      // 100 USD 기준 표시 문구 (UI 미리보기용)
      sample_display_note: fxResult.display_note_template(100),
      // 디버그 정보
      api_key_present: !!process.env.KOREAEXIM_API_KEY
    });
  } catch (e) {
    return res.status(500).json({
      error: 'fx_fetch_failed',
      message: e.message
    });
  }
}


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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BL-ADMIN-AUTH-V2 권한 핸들러 (auth-*) — 자체 인증, requireAdmin 우회
  // _lib/admin-auth-handlers.js의 default export (adminAuthHandler)가
  // 내부에서 ?action= 검사 + 자체 Bearer JWT 인증을 수행함.
  // 진입 시 query를 그대로 전달하되, 'auth-' prefix 제거하여 핸들러가 인식.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action.startsWith('auth-')) {
    // auth-users-list → users-list, auth-invite → invite, ...
    const subAction = action.slice('auth-'.length);
    // req.query를 mutate하여 sub action 전달 (Vercel API: req.query는 객체)
    req.query = { ...req.query, action: subAction };
    return await adminAuthHandler(req, res);
  }

  // 화이트리스트 검증을 인증보다 먼저 수행 → 디버깅 시 라우팅 문제와 인증 문제를 명확히 분리
  const ALLOWED_ACTIONS = ['booking-upload', 'list-users', 'send-invite', 'update-match', 'start-task', 'past-video-revenue', 'manager-push', 'delete-user', 'change-role', 're-verify', 'update-hotel-status', 'refund-hotel', 'refund-list', 'refund-approve', 'refund-reject', 'hotel-detail', 'hotel-comm-list', 'hotel-comm-add', 'hotel-comm-delete', 'invoice-get-company-info', 'invoice-update-company-info', 'invoice-get-payment-accounts', 'invoice-update-payment-accounts', 'invoice-upload-asset', 'invoice-get-asset-url', 'invoice-get-audit-log', 'invoice-get-fx-rate'];
  if (!action) {
    return res.status(400).json({
      error: 'missing_action',
      allowed: ALLOWED_ACTIONS,
      auth_actions: ['auth-users-list', 'auth-invite', 'auth-accept-invite', 'auth-change-role'],
      hint: 'Use ?action=<name> in query string'
    });
  }
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({
      error: 'unknown_action',
      received: action,
      allowed: ALLOWED_ACTIONS,
      auth_actions: ['auth-users-list', 'auth-invite', 'auth-accept-invite', 'auth-change-role'],
      hint: 'Use ?action=<name> in query string'
    });
  }

  // 공통 어드민 인증 (4개 핸들러 모두 동일하게 요구)
  const adminCheck = await requireAdmin(req, serviceKey);
  if (!adminCheck.ok) {
    return res.status(adminCheck.status).json({ error: adminCheck.error });
  }

  // ★ BL-ADMIN-AUTH (D-026) 2026-05-12: 모든 admin action 자동 action_logs 박기
  const { logAction } = await import('./_lib/admin-log.js').catch(() => ({ logAction: null }));
  const startedAt = Date.now();
  const userMeta = {
    userId: adminCheck.user?.id || adminCheck.userId,
    email: adminCheck.user?.email || adminCheck.email,
    role: adminCheck.role || 'admin',
  };

  let actionResult = null;
  let actionError = null;
  try {
    switch (action) {
      case 'booking-upload':
        actionResult = await handleBookingUpload(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'list-users':
        actionResult = await handleListUsers(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'send-invite':
        actionResult = await handleSendInvite(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'update-match':
        actionResult = await handleUpdateMatch(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'start-task':
        actionResult = await handleStartTask(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'past-video-revenue':
        actionResult = await handlePastVideoRevenue(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'manager-push':
        actionResult = await handleManagerPush(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'delete-user':
        actionResult = await handleDeleteUser(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'change-role':
        actionResult = await handleChangeRole(req, res, serviceKey, adminCheck);
        return actionResult;
      case 're-verify':
        actionResult = await handleReVerify(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'update-hotel-status':
        actionResult = await handleUpdateHotelStatus(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'refund-hotel':
        actionResult = await handleRefundHotel(req, res, serviceKey, adminCheck);
        return actionResult;
      // BL-REFUND-FLOW step2 — 매니저 환불 신청 목록/승인/거절
      case 'refund-list':
        actionResult = await handleRefundList(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'refund-approve':
        actionResult = await handleRefundApprove(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'refund-reject':
        actionResult = await handleRefundReject(req, res, serviceKey, adminCheck);
        return actionResult;
      // BL-HOTEL-DETAIL-PAGE (2026-05-26) — 호텔 상세 + 커뮤니케이션 이력
      case 'hotel-detail':
        actionResult = await handleHotelDetail(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'hotel-comm-list':
        actionResult = await handleHotelCommList(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'hotel-comm-add':
        actionResult = await handleHotelCommAdd(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'hotel-comm-delete':
        actionResult = await handleHotelCommDelete(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-get-company-info':
        actionResult = await handleInvoiceGetCompanyInfo(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-update-company-info':
        actionResult = await handleInvoiceUpdateCompanyInfo(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-get-payment-accounts':
        actionResult = await handleInvoiceGetPaymentAccounts(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-update-payment-accounts':
        actionResult = await handleInvoiceUpdatePaymentAccounts(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-upload-asset':
        actionResult = await handleInvoiceUploadAsset(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-get-asset-url':
        actionResult = await handleInvoiceGetAssetUrl(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-get-audit-log':
        actionResult = await handleInvoiceGetAuditLog(req, res, serviceKey, adminCheck);
        return actionResult;
      case 'invoice-get-fx-rate':
        actionResult = await handleInvoiceGetFxRate(req, res, serviceKey, adminCheck);
        return actionResult;
      default:
        // unreachable: 위에서 화이트리스트로 이미 차단됨
        return res.status(500).json({ error: 'router_inconsistency', received: action });
    }
  } catch (err) {
    console.error('admin router error:', err);
    actionError = err;
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  } finally {
    // ★ logAction은 viewer/list-users 같은 단순 조회는 skip (소음 줄이기)
    const NON_LOG_ACTIONS = ['list-users', 'past-video-revenue', 'hotel-detail', 'hotel-comm-list'];
    if (logAction && !NON_LOG_ACTIONS.includes(action)) {
      try {
        await logAction({
          ...userMeta,
          actionType: `admin_${action}`,
          targetType: req.body?.target_type || req.body?.hotel_id ? 'hotel' : null,
          targetId: req.body?.hotel_id || req.body?.target_id || null,
          targetLabel: req.body?.hotel_name || req.body?.target_label || null,
          details: {
            duration_ms: Date.now() - startedAt,
            body_keys: Object.keys(req.body || {}),
          },
          result: actionError ? 'fail' : 'success',
          errorMessage: actionError?.message || null,
          req,
        });
      } catch (_) { /* logging 실패는 응답에 영향 없음 */ }
    }
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

// =============================================================
// BL-HOTEL-DETAIL-PAGE (2026-05-26) — 호텔 상세 + 커뮤니케이션 이력
// 4개 핸들러:
//   hotel-detail        GET  ?hotel_id=UUID         → 호텔 기본 정보 + 통계
//   hotel-comm-list     GET  ?hotel_id=UUID&limit=N → 커뮤니케이션 타임라인
//   hotel-comm-add      POST {hotel_id,type,...}    → 새 커뮤니케이션 박기 (메모/메일)
//   hotel-comm-delete   POST {comm_id}              → 커뮤니케이션 삭제 (관리자만)
// =============================================================

const COMM_TYPE_WHITELIST = ['memo', 'email_out', 'email_in', 'inquiry'];
// status_change 는 handleUpdateHotelStatus 가 자동으로 박음 — 외부 API로 직접 박는 거 차단

async function handleHotelDetail(req, res, serviceKey, _admin) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET_required' });
  const hotelId = (req.query?.hotel_id || '').trim();
  if (!hotelId) return res.status(400).json({ error: 'hotel_id_required' });

  // 호텔 기본 정보 — 모든 컬럼 (admin용)
  const hotelResp = await fetch(SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId) + '&select=*', {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
  });
  if (!hotelResp.ok) return res.status(500).json({ error: 'hotel_fetch_failed' });
  const hotels = await hotelResp.json();
  if (!hotels.length) return res.status(404).json({ error: 'hotel_not_found' });
  const hotel = hotels[0];

  // 통계 — 커뮤니케이션 카운트 (타입별)
  const statResp = await fetch(SUPABASE_URL + '/rest/v1/hotel_communications?hotel_id=eq.' + encodeURIComponent(hotelId) + '&select=type', {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
  });
  const comms = statResp.ok ? await statResp.json() : [];
  const commCounts = comms.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, { total: comms.length });

  return res.status(200).json({
    success: true,
    hotel,
    comm_counts: commCounts
  });
}

async function handleHotelCommList(req, res, serviceKey, _admin) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET_required' });
  const hotelId = (req.query?.hotel_id || '').trim();
  if (!hotelId) return res.status(400).json({ error: 'hotel_id_required' });
  const rawLimit = parseInt(req.query?.limit || '100', 10);
  const limit = Math.min(Math.max(rawLimit || 100, 1), 500);

  const listResp = await fetch(
    SUPABASE_URL + '/rest/v1/hotel_communications'
      + '?hotel_id=eq.' + encodeURIComponent(hotelId)
      + '&select=*'
      + '&order=created_at.desc'
      + '&limit=' + limit,
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!listResp.ok) {
    const errBody = await listResp.text();
    return res.status(500).json({ error: 'list_failed', detail: errBody });
  }
  const items = await listResp.json();

  return res.status(200).json({
    success: true,
    hotel_id: hotelId,
    count: items.length,
    items
  });
}

async function handleHotelCommAdd(req, res, serviceKey, admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST_required' });
  const { hotel_id, type, subject, content, direction, metadata } = req.body || {};
  if (!hotel_id) return res.status(400).json({ error: 'hotel_id_required' });
  if (!type) return res.status(400).json({ error: 'type_required' });
  if (!COMM_TYPE_WHITELIST.includes(type)) {
    return res.status(400).json({ error: 'invalid_type', allowed: COMM_TYPE_WHITELIST });
  }
  // memo/inquiry 는 content 필수, email 은 subject 또는 content 둘 중 하나 필수
  if ((type === 'memo' || type === 'inquiry') && !content) {
    return res.status(400).json({ error: 'content_required_for_' + type });
  }
  if ((type === 'email_out' || type === 'email_in') && !subject && !content) {
    return res.status(400).json({ error: 'subject_or_content_required_for_email' });
  }
  // email 타입은 direction 자동 세팅
  let dir = direction || null;
  if (type === 'email_out') dir = 'outbound';
  if (type === 'email_in') dir = 'inbound';

  // hotel 존재 확인 (FK 의존 + 명시적 검증 — 404 응답을 위함)
  const hotelChk = await fetch(SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotel_id) + '&select=id', {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
  });
  const hotelRows = hotelChk.ok ? await hotelChk.json() : [];
  if (!hotelRows.length) return res.status(404).json({ error: 'hotel_not_found' });

  const insertResp = await fetch(SUPABASE_URL + '/rest/v1/hotel_communications', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      hotel_id,
      type,
      direction: dir,
      subject: subject || null,
      content: content || null,
      metadata: metadata || {},
      created_by_email: admin?.email || null
    })
  });
  if (!insertResp.ok) {
    const errBody = await insertResp.text();
    return res.status(500).json({ error: 'insert_failed', detail: errBody });
  }
  const inserted = (await insertResp.json())[0];

  return res.status(200).json({ success: true, item: inserted });
}

async function handleHotelCommDelete(req, res, serviceKey, _admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST_required' });
  const { comm_id } = req.body || {};
  if (!comm_id) return res.status(400).json({ error: 'comm_id_required' });

  const delResp = await fetch(SUPABASE_URL + '/rest/v1/hotel_communications?id=eq.' + encodeURIComponent(comm_id), {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Prefer': 'return=representation'
    }
  });
  if (!delResp.ok) {
    const errBody = await delResp.text();
    return res.status(500).json({ error: 'delete_failed', detail: errBody });
  }
  const deleted = await delResp.json();
  if (!deleted.length) return res.status(404).json({ error: 'comm_not_found' });

  return res.status(200).json({ success: true, deleted: deleted[0] });
}
