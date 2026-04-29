// /api/admin-send-agoda-invite.js
// 어드민이 매니저에게 Agoda 등록 안내 메일 발송 + agoda_match_status 업데이트
// Phase 3 Step 4-3 / [7/8]

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM_EMAIL = 'TravelWinners B2B <noreply@gohotelwinners.com>';
const REPLY_TO = 'partners@gohotelwinners.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }
  if (!resendKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY not configured',
      hint: 'Add RESEND_API_KEY to Vercel environment variables.'
    });
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
    if (!hotelId) return res.status(400).json({ error: 'hotelId is required' });

    // 3. 호텔 정보 조회
    const hotelResp = await fetch(
      supabaseUrl + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId) +
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

    // 4. 메일 본문 생성 (영문 우선, 한국어는 옵션으로 dryRun 시 미리보기에서 분리)
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
      managerName: managerName,
      positionLabel: positionLabel,
      hotelLabel: hotelLabel,
      locationLabel: locationLabel,
      starRating: hotel.star_rating,
      propertyType: hotel.property_type,
      customMessage: customMessage,
      adminEmail: myEmail
    });
    const text = buildEmailText({
      managerName: managerName,
      hotelLabel: hotelLabel,
      locationLabel: locationLabel,
      customMessage: customMessage,
      adminEmail: myEmail
    });

    // 5. dryRun이면 미리보기만 반환 (실제 발송/DB 업데이트 안 함)
    if (isDryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        preview: {
          to: hotel.contact_email,
          from: FROM_EMAIL,
          replyTo: REPLY_TO,
          subject: subject,
          html: html,
          text: text
        },
        hotel: hotel
      });
    }

    // 6. Resend 발송
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
        subject: subject,
        html: html,
        text: text
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

    // 7. hotels 테이블 상태 업데이트
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

  } catch (err) {
    console.error('admin-send-agoda-invite error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}

// ============================================================
// Email templates
// ============================================================
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
