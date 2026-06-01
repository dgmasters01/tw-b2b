// /api/email/hotel-status-notify.js
// SQ-G (2026-05-13): 호텔 status 변경 시 매니저에게 자동 메일 발송
//
// 대표님 결정 (2026-05-13): A안 자동 — 6개 trigger 다 자동
//   1. registered → "호텔 등록됐어요 — 검토 시작합니다"
//   2. approved   → "호텔 승인됐어요 — 결제 페이지로 가세요"
//   3. rejected   → "호텔 거절됐어요 — 사유 확인 후 재신청"
//   4. paid       → "결제 완료 — 인보이스 첨부합니다"
//   5. producing  → "영상 제작 시작 — 며칠 뒤 노출됩니다"
//   6. published  → "영상 게시됐어요 — 여기서 확인하세요"
//
// 톤: BUSINESS.md L154 (영어 default + 한국 매니저만 한국어, D-032)
//     i18n 일괄 작업 전까지 영어만 (메모리 #20)
//
// 인증: Supabase admin Bearer 토큰 (api/admin.js requireAdmin 패턴 동일)
//   admin.html이 이미 admin role 인증된 상태로 진입하므로 안전
//
// 호출 방식:
//   POST /api/email/hotel-status-notify
//   Headers: Authorization: Bearer ${supabase_access_token}
//   Body: { hotel_id, new_status, manager_email, manager_name, hotel_name, language? }
//
// 헌법 부합:
//   ② 무인 실행: admin.html changeStatus()에서 자동 호출
//   ⑥ 사람용+AI용: 메일 본문은 사람용, 로그는 서버 console
//
// Last updated: 2026-05-13

import { sendSystemEmail } from '../_lib/email-sender.js';
import { resolveLocale } from '../_lib/email-locale.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const VALID_STATUSES = ['registered', 'approved', 'rejected', 'paid', 'producing', 'published'];

// admin 인증 — api/admin.js requireAdmin과 동일 패턴
async function requireAdmin(req, serviceKey) {
  const auth = req.headers.authorization || '';
  const callerToken = auth.replace(/^Bearer\s+/i, '');
  if (!callerToken) return { ok: false, status: 401, error: 'Missing auth token' };

  const meResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + callerToken, 'apikey': serviceKey },
  });
  if (!meResp.ok) return { ok: false, status: 401, error: 'Invalid token' };

  const me = await meResp.json();
  const myEmail = (me.email || '').toLowerCase();
  if (!myEmail) return { ok: false, status: 401, error: 'No email in token' };

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

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 영어 템플릿 — BUSINESS.md L20 톤 (전문가 + 따뜻한 + 명확)
function buildEmailEN(status, hotel_name, manager_name) {
  const hn = escapeHtml(hotel_name || 'your hotel');
  const mn = escapeHtml(manager_name || 'Manager');

  const COMMON_FOOTER = `
    <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      <div>TravelWinners B2B · gohotelwinners.com</div>
      <div>9M+ views across 8 channels · 6 languages · 6-month booking guarantee</div>
    </div>
  `;

  switch (status) {
    case 'registered':
      return {
        subject: `[TW B2B] Registration received — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">✓ Registration received</h2>
            <p>Hi ${mn},</p>
            <p>We've received your registration for <strong>${hn}</strong>.</p>
            <p>Our team will review your hotel within 1-2 business days and email you the verdict. No action needed from you for now.</p>
            <p>While you wait, you can preview the channels that will feature your hotel: <a href="https://gohotelwinners.com/sales.html">our 8 channels</a> (9M+ combined views, 6 languages).</p>
            <p>Talk soon,<br>The TravelWinners team</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'approved':
      return {
        subject: `[TW B2B] ${hotel_name} approved — next: payment`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">🎉 Your hotel is approved</h2>
            <p>Hi ${mn},</p>
            <p>Great news — <strong>${hn}</strong> has been approved. We're ready to start producing your video content.</p>
            <p><strong>Next step:</strong> Complete the one-time $200 payment to activate your 6-month booking guarantee. You'll get a full refund if zero bookings happen in those 6 months.</p>
            <p style="margin:24px 0;">
              <a href="https://gohotelwinners.com/checkout.html" style="background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">→ Go to payment</a>
            </p>
            <p>Questions? Just reply to this email.</p>
            <p>Best,<br>The TravelWinners team</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'rejected':
      return {
        subject: `[TW B2B] ${hotel_name} — review update`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#dc2626;">Review update</h2>
            <p>Hi ${mn},</p>
            <p>Thank you for registering <strong>${hn}</strong>. After review, we're unable to proceed at this time.</p>
            <p>This usually happens when (a) the hotel isn't listed on our partner OTAs, (b) the location is outside our current focus regions, or (c) we couldn't verify ownership.</p>
            <p>If you'd like more detail on the specific reason, or want to address it and re-register, just reply to this email.</p>
            <p>Best regards,<br>The TravelWinners team</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'paid':
      return {
        subject: `[TW B2B] Payment confirmed — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">✓ Payment received</h2>
            <p>Hi ${mn},</p>
            <p>Payment for <strong>${hn}</strong> has been confirmed. Your 6-month booking guarantee starts now.</p>
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>Our video team begins production within 5-7 business days</li>
              <li>Content goes live across our 8 channels in 6 languages</li>
              <li>You can track performance any time in your dashboard</li>
            </ul>
            <p style="margin:24px 0;">
              <a href="https://gohotelwinners.com/dashboard.html" style="background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">→ View dashboard</a>
            </p>
            <p>Your invoice is available in your dashboard under Settings → Payment history.</p>
            <p>Best,<br>The TravelWinners team</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'producing':
      return {
        subject: `[TW B2B] Video production started — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#3b82f6;">🎬 Production started</h2>
            <p>Hi ${mn},</p>
            <p>We've started producing video content for <strong>${hn}</strong>.</p>
            <p>Expected timeline: <strong>3-5 days</strong> until first video goes live. You'll get another email the moment it publishes.</p>
            <p>In the meantime, you can check our channels to see the production style: <a href="https://gohotelwinners.com/sales.html">our 8 channels</a>.</p>
            <p>Best,<br>The TravelWinners team</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'published':
      return {
        subject: `[TW B2B] Your video is live — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">🎉 Your video is live</h2>
            <p>Hi ${mn},</p>
            <p>Video content for <strong>${hn}</strong> is now published across our channels.</p>
            <p>Bookings typically start appearing within 7-14 days. Track everything in real-time on your dashboard:</p>
            <p style="margin:24px 0;">
              <a href="https://gohotelwinners.com/dashboard.html" style="background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">→ View live performance</a>
            </p>
            <p>Best,<br>The TravelWinners team</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    default:
      return null;
  }
}

// 한국어 템플릿 — buildEmailEN 6종 미러링 (D-032: 한국 매니저 전용)
// 톤: 전문가 + 따뜻함 + 명확함 (사업가 언어, 군더더기 제거)
function buildEmailKO(status, hotel_name, manager_name) {
  const hn = escapeHtml(hotel_name || '귀하의 호텔');
  const mn = escapeHtml(manager_name || '매니저');

  const COMMON_FOOTER = `
    <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      <div>TravelWinners B2B · gohotelwinners.com</div>
      <div>8개 채널 누적 900만+ 조회 · 6개 언어 · 6개월 예약 보장</div>
    </div>
  `;

  switch (status) {
    case 'registered':
      return {
        subject: `[TW B2B] 등록 접수 완료 — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">✓ 등록이 접수되었습니다</h2>
            <p>${mn}님, 안녕하세요.</p>
            <p><strong>${hn}</strong>의 등록 신청을 정상적으로 접수했습니다.</p>
            <p>영업일 기준 1~2일 내로 검토를 마친 뒤 결과를 메일로 보내드립니다. 지금 따로 하실 일은 없습니다.</p>
            <p>기다리시는 동안, 호텔이 노출될 채널을 미리 보실 수 있습니다: <a href="https://gohotelwinners.com/sales.html">8개 채널 보기</a> (누적 900만+ 조회, 6개 언어).</p>
            <p>곧 다시 연락드리겠습니다.<br>TravelWinners 팀 드림</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'approved':
      return {
        subject: `[TW B2B] ${hotel_name} 승인 완료 — 다음 단계: 결제`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">🎉 호텔이 승인되었습니다</h2>
            <p>${mn}님, 안녕하세요.</p>
            <p>좋은 소식입니다 — <strong>${hn}</strong>이(가) 승인되었습니다. 이제 영상 콘텐츠 제작을 시작할 준비가 되었습니다.</p>
            <p><strong>다음 단계:</strong> 1회성 $200 결제를 완료하시면 6개월 예약 보장이 시작됩니다. 6개월간 예약이 0건이면 전액 환불해 드립니다.</p>
            <p style="margin:24px 0;">
              <a href="https://gohotelwinners.com/checkout.html" style="background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">→ 결제하러 가기</a>
            </p>
            <p>궁금하신 점은 이 메일에 회신해 주세요.</p>
            <p>감사합니다.<br>TravelWinners 팀 드림</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'rejected':
      return {
        subject: `[TW B2B] ${hotel_name} — 검토 결과 안내`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#dc2626;">검토 결과 안내</h2>
            <p>${mn}님, 안녕하세요.</p>
            <p><strong>${hn}</strong> 등록 신청해 주셔서 감사합니다. 검토 결과, 현재로서는 진행이 어렵다는 판단입니다.</p>
            <p>주로 (a) 호텔이 제휴 OTA에 등재되어 있지 않거나, (b) 위치가 현재 집중 지역 밖이거나, (c) 소유권 확인이 어려운 경우에 해당합니다.</p>
            <p>구체적인 사유가 궁금하시거나, 보완 후 재신청을 원하시면 이 메일에 회신해 주세요.</p>
            <p>감사합니다.<br>TravelWinners 팀 드림</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'paid':
      return {
        subject: `[TW B2B] 결제가 확인되었습니다 — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">✓ 결제가 확인되었습니다</h2>
            <p>${mn}님, 안녕하세요.</p>
            <p><strong>${hn}</strong>의 결제가 확인되었습니다. 지금부터 6개월 예약 보장이 시작됩니다.</p>
            <p><strong>이후 진행 순서:</strong></p>
            <ul>
              <li>영업일 기준 5~7일 내 영상 제작을 시작합니다</li>
              <li>8개 채널·6개 언어로 콘텐츠가 노출됩니다</li>
              <li>대시보드에서 언제든 성과를 확인하실 수 있습니다</li>
            </ul>
            <p style="margin:24px 0;">
              <a href="https://gohotelwinners.com/dashboard.html" style="background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">→ 대시보드 보기</a>
            </p>
            <p>인보이스는 대시보드의 설정 → 결제 내역에서 확인하실 수 있습니다.</p>
            <p>감사합니다.<br>TravelWinners 팀 드림</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'producing':
      return {
        subject: `[TW B2B] 영상 제작을 시작했습니다 — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#3b82f6;">🎬 제작이 시작되었습니다</h2>
            <p>${mn}님, 안녕하세요.</p>
            <p><strong>${hn}</strong>의 영상 콘텐츠 제작을 시작했습니다.</p>
            <p>예상 일정: 첫 영상 노출까지 <strong>3~5일</strong>입니다. 게시되는 즉시 다시 메일로 알려드립니다.</p>
            <p>그동안 제작 스타일이 궁금하시면 채널을 둘러보세요: <a href="https://gohotelwinners.com/sales.html">8개 채널 보기</a>.</p>
            <p>감사합니다.<br>TravelWinners 팀 드림</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    case 'published':
      return {
        subject: `[TW B2B] 영상이 게시되었습니다 — ${hotel_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;color:#1f2937;">
            <h2 style="color:#16a34a;">🎉 영상이 공개되었습니다</h2>
            <p>${mn}님, 안녕하세요.</p>
            <p><strong>${hn}</strong>의 영상 콘텐츠가 채널 전반에 게시되었습니다.</p>
            <p>예약은 보통 7~14일 내에 발생하기 시작합니다. 대시보드에서 실시간으로 모두 확인하세요:</p>
            <p style="margin:24px 0;">
              <a href="https://gohotelwinners.com/dashboard.html" style="background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">→ 실시간 성과 보기</a>
            </p>
            <p>감사합니다.<br>TravelWinners 팀 드림</p>
            ${COMMON_FOOTER}
          </div>
        `,
      };
    default:
      return null;
  }
}

// 언어 디스패처 — locale에 따라 영어/한국어 템플릿 선택 (영어가 default)
function buildEmail(locale, status, hotel_name, manager_name) {
  if (locale === 'ko') return buildEmailKO(status, hotel_name, manager_name);
  return buildEmailEN(status, hotel_name, manager_name);
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ops-token');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // 인증 — admin role만 호출 가능 (admin.html에서 supabase access_token 전달)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }
  const adminCheck = await requireAdmin(req, serviceKey);
  if (!adminCheck.ok) {
    return res.status(adminCheck.status).json({ ok: false, error: adminCheck.error });
  }

  const body = req.body || {};
  const { hotel_id, new_status, manager_email, manager_name, hotel_name, language } = body;

  // 필수 필드 검증
  if (!hotel_id || !new_status || !manager_email) {
    return res.status(400).json({
      ok: false,
      error: 'hotel_id, new_status, manager_email are required',
    });
  }

  // status 검증
  if (!VALID_STATUSES.includes(new_status)) {
    return res.status(400).json({
      ok: false,
      error: `Invalid status '${new_status}'. Valid: ${VALID_STATUSES.join(', ')}`,
    });
  }

  // 언어 결정 — D-032: 영어 default, 한국 매니저만 한국어 (정책은 _lib/email-locale.js)
  const locale = resolveLocale({ language });
  const template = buildEmail(locale, new_status, hotel_name, manager_name);
  if (!template) {
    return res.status(400).json({
      ok: false,
      error: `No template for status: ${new_status}`,
    });
  }

  // 메일 발송
  const result = await sendSystemEmail({
    to: manager_email,
    subject: template.subject,
    html: template.html,
    replyTo: 'support@gohotelwinners.com',
  });

  if (!result.ok) {
    console.error('[hotel-status-notify] send failed:', result);
    return res.status(500).json({
      ok: false,
      error: result.error,
      status: result.status,
    });
  }

  return res.status(200).json({
    ok: true,
    sent_at: new Date().toISOString(),
    hotel_id,
    new_status,
    to: manager_email,
    resend_id: result.id,
  });
}
