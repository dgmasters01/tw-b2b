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

  // 관리자 제외한 매니저만
  // [기능추가 2026-04-30] user_metadata에서 name/phone/full_name 추출 → admin Hotels 패널 enrich 용
  const members = users
    .filter(u => !adminEmails[(u.email || '').toLowerCase()])
    .map(u => {
      const meta = u.user_metadata || {};
      return {
        id: u.id,
        email: u.email,
        name: meta.full_name || meta.name || meta.manager_name || null,
        phone: meta.phone || meta.manager_phone || u.phone || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        is_verified: !!u.email_confirmed_at,
        is_banned: u.banned_until && new Date(u.banned_until) > new Date(),
        hotels: hotelsByUser[u.id] || []
      };
    })
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
  const ALLOWED_ACTIONS = ['booking-upload', 'list-users', 'send-invite', 'update-match', 'start-task', 'past-video-revenue', 'manager-push', 'delete-user', 'change-role', 're-verify'];
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
    const NON_LOG_ACTIONS = ['list-users', 'past-video-revenue'];
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
