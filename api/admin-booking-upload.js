// /api/admin-booking-upload.js
// Phase 4 Step 2: TW Booking Analytics 엑셀 업로드 처리
//
// 입력:
//   - 클라이언트(admin.html)가 SheetJS로 엑셀 파싱한 결과를 JSON으로 전달
//   - 각 row 는 cid, booking_id, hotel_name, ...등 Agoda 표준 컬럼
//
// 처리:
//   1) cid → channel_code 자동 변환 (channel_cid_map 조회)
//   2) hotel_id 매핑 시도 (hotel_name 부분일치)
//   3) bookings_agoda 에 UPSERT (channel_code+booking_id unique)
//   4) 취소건은 status='cancelled' 로 보존 (UI 숨김은 RLS 로 처리)
//
// 권한: 관리자 전용 (is_admin)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  try {
    // ---------- 1) 호출자 인증 + admin 검증 ----------
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

    const meResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!meResp.ok) return res.status(401).json({ error: 'Invalid session' });
    const me = await meResp.json();
    const myEmail = (me.email || '').toLowerCase();
    if (!myEmail) return res.status(401).json({ error: 'No email in token' });

    const adminResp = await fetch(
      `${supabaseUrl}/rest/v1/admins?email=eq.${encodeURIComponent(myEmail)}&select=role,is_active`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    const adminRows = await adminResp.json();
    if (!Array.isArray(adminRows) || adminRows.length === 0 || adminRows[0].is_active === false) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // ---------- 2) 입력 검증 ----------
    const { rows, sourceFilename } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows[] is required (parsed excel rows)' });
    }
    if (rows.length > 5000) {
      return res.status(400).json({ error: 'Too many rows (max 5000 per upload)' });
    }

    // ---------- 3) channel_cid_map 전체 로드 (메모리 캐시) ----------
    const cidMapResp = await fetch(
      `${supabaseUrl}/rest/v1/channel_cid_map?select=cid,channel_code&is_active=eq.true`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    const cidMapRows = await cidMapResp.json();
    const cidToChannel = {};
    for (const r of cidMapRows) cidToChannel[String(r.cid)] = r.channel_code;

    // ---------- 4) hotels 테이블 (이름 매칭용 미리 로드) ----------
    const hotelsResp = await fetch(
      `${supabaseUrl}/rest/v1/hotels?select=id,hotel_name&status=neq.deleted`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    const hotelsList = await hotelsResp.json();
    const hotelByName = {};
    if (Array.isArray(hotelsList)) {
      for (const h of hotelsList) {
        if (h.hotel_name) hotelByName[h.hotel_name.toLowerCase().trim()] = h.id;
      }
    }

    // ---------- 5) row 정규화 ----------
    const batchId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const upserts = [];
    const skipped = [];

    for (const raw of rows) {
      const norm = normalizeRow(raw);

      // booking_id 필수
      if (!norm.booking_id) {
        skipped.push({ reason: 'missing booking_id', raw });
        continue;
      }

      // cid → channel_code 변환
      const cidStr = norm.cid ? String(norm.cid).trim() : '';
      const channelCode = cidStr ? cidToChannel[cidStr] : null;
      if (!channelCode) {
        skipped.push({ reason: `unknown cid: ${cidStr || '(empty)'}`, booking_id: norm.booking_id });
        continue;
      }

      // hotel_id 매칭 (옵션)
      let hotelId = null;
      if (norm.hotel_name) {
        const key = norm.hotel_name.toLowerCase().trim();
        hotelId = hotelByName[key] || null;
        if (!hotelId) {
          // 부분 일치 시도
          for (const [name, id] of Object.entries(hotelByName)) {
            if (name.includes(key) || key.includes(name)) { hotelId = id; break; }
          }
        }
      }

      // 취소건 식별 (status 또는 booking_status 컬럼 기준)
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

    // ---------- 6) bulk UPSERT (chunked) ----------
    const inserted = [];
    const errors = [];
    const CHUNK = 200;
    for (let i = 0; i < upserts.length; i += CHUNK) {
      const chunk = upserts.slice(i, i + CHUNK);
      const upResp = await fetch(
        `${supabaseUrl}/rest/v1/bookings_agoda?on_conflict=channel_code,booking_id`,
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

    // ---------- 7) 응답 ----------
    return res.status(200).json({
      ok: true,
      batch_id: batchId,
      total_rows: rows.length,
      processed: upserts.length,
      skipped_count: skipped.length,
      inserted_count: inserted.length,
      errors,
      skipped: skipped.slice(0, 50),  // 최대 50건만 응답에 포함
    });
  } catch (err) {
    console.error('admin-booking-upload error:', err);
    return res.status(500).json({ error: 'Internal error', detail: String(err.message || err) });
  }
}

// =============================================================================
// 헬퍼: 컬럼명 정규화
// 가정한 Agoda 엑셀 컬럼명 (대표님 검수 필요):
//   cid, Booking ID, Reservation Number, Hotel Name, Hotel ID, Hotel Country,
//   Hotel City, Hotel Star, Customer Country, Adults, Children, Check-in Date,
//   Check-out Date, Nights, Room Type, Rooms, Booking USD, Commission USD,
//   Currency, Booking Amount (Local), Status, Device Type, Booking Date
// =============================================================================
function normalizeRow(r) {
  // 키를 lowercase + 공백 제거하여 매칭
  const m = {};
  for (const [k, v] of Object.entries(r || {})) {
    const key = String(k).toLowerCase().replace(/[\s_-]/g, '');
    m[key] = v;
  }
  return {
    cid: m.cid ?? m.affiliateid ?? m.affiliateid ?? null,
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
  // Excel serial date support (numeric)
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 86400000;
    const d = new Date(epoch.getTime() + ms);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // YYYY-MM-DD or YYYY/MM/DD or DD/MM/YYYY
  const isoMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2,'0')}-${isoMatch[3].padStart(2,'0')}`;
  }
  const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`;
  }
  // Fallback to Date.parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
