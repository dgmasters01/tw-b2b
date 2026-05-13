// /api/cron/manager-campaign.js
// BL-MANAGER-AUTO-CAMPAIGN
//
// 매일 새벽 1회 GitHub Actions cron이 호출한다.
// VIEW v_hotel_manager_full에서 각 lifecycle_stage 도달한 매니저를 추출하여
// 해당 stage 메일을 1회만 발송 (manager_campaign_log UNIQUE 제약으로 중복 방지).
//
// 보안: x-cron-token 헤더 (CRON_SECRET 환경변수)로 인증.
//
// 응답:
//   200 OK { stages_processed: 5, sent: 3, skipped: 2, errors: [] }

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM_EMAIL = 'TravelWinners B2B <noreply@gohotelwinners.com>';
const REPLY_TO = 'partners@gohotelwinners.com';

// stage → 메일 템플릿 키 매핑
const STAGE_TEMPLATES = {
  welcome:               { template: 'welcome',    label: 'D-0 환영' },
  early_sales:           { template: 'early',      label: 'D-7 영업 제안' },
  active_monitoring:     { template: 'report30',   label: 'D-30 성과 리포트' },
  rebill_window:         { template: 'rebill',     label: 'D-150 재결제 유도' },
  final_decision_window: { template: 'final',      label: 'D-170 환불·연장' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 인증: CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers['x-cron-token'] || '';
  if (!cronSecret || provided !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!serviceKey || !resendKey) {
    return res.status(500).json({ error: 'env_missing', detail: 'SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY' });
  }

  // dryRun 옵션 (수동 검증용)
  const url = new URL(req.url || '/', 'http://x');
  const isDryRun = url.searchParams.get('dry_run') === '1';

  const stages = Object.keys(STAGE_TEMPLATES);
  const result = {
    started_at: new Date().toISOString(),
    dry_run: isDryRun,
    stages_processed: 0,
    candidates: 0,
    sent: 0,
    skipped_already_sent: 0,
    skipped_no_email: 0,
    errors: [],
    details: [],
  };

  for (const stage of stages) {
    result.stages_processed++;
    try {
      // VIEW에서 해당 stage 매니저 추출
      const viewResp = await fetch(
        `${SUPABASE_URL}/rest/v1/v_hotel_manager_full?lifecycle_stage=eq.${encodeURIComponent(stage)}&select=manager_id,manager_email,hotel_id,hotel_name,hotel_contact_name,video_channels_active,video_total_views,booking_count,booking_revenue,guarantee_days_left,days_since_payment`,
        { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
      );
      const candidates = await viewResp.json();
      if (!Array.isArray(candidates)) continue;
      result.candidates += candidates.length;

      // 이미 발송된 (manager_id, stage) 제외
      const ids = candidates.map(c => c.manager_id).filter(Boolean);
      let sentSet = new Set();
      if (ids.length > 0) {
        const sentResp = await fetch(
          `${SUPABASE_URL}/rest/v1/manager_campaign_log?manager_id=in.(${ids.map(encodeURIComponent).join(',')})&stage=eq.${encodeURIComponent(stage)}&select=manager_id`,
          { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
        );
        const sentRows = await sentResp.json();
        if (Array.isArray(sentRows)) sentSet = new Set(sentRows.map(r => r.manager_id));
      }

      // 각 매니저별 발송
      for (const m of candidates) {
        if (sentSet.has(m.manager_id)) {
          result.skipped_already_sent++;
          continue;
        }
        if (!m.manager_email) {
          result.skipped_no_email++;
          continue;
        }
        if (isDryRun) {
          result.details.push({ stage, manager_email: m.manager_email, hotel_name: m.hotel_name, action: 'would_send' });
          continue;
        }

        // 템플릿 빌드
        const tpl = buildCampaignTemplate(stage, m);
        if (!tpl) {
          result.errors.push({ stage, manager_email: m.manager_email, error: 'template_missing' });
          continue;
        }

        // Resend 발송
        let resendId = null;
        let sendError = null;
        try {
          const sendResp = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [m.manager_email],
              reply_to: REPLY_TO,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
            }),
          });
          const sendData = await sendResp.json().catch(() => ({}));
          if (!sendResp.ok) {
            sendError = sendData.error || `resend_http_${sendResp.status}`;
          } else {
            resendId = sendData.id;
          }
        } catch (e) { sendError = e.message; }

        // 로그 박기 (성공·실패 모두)
        await fetch(`${SUPABASE_URL}/rest/v1/manager_campaign_log`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            manager_id: m.manager_id,
            hotel_id: m.hotel_id,
            stage,
            email_to: m.manager_email,
            resend_id: resendId,
            template: STAGE_TEMPLATES[stage].template,
            status: sendError ? 'failed' : 'sent',
            error: sendError,
          }),
        }).catch(() => {});

        if (sendError) {
          result.errors.push({ stage, manager_email: m.manager_email, error: sendError });
        } else {
          result.sent++;
          result.details.push({ stage, manager_email: m.manager_email, hotel_name: m.hotel_name, resend_id: resendId });
        }
      }
    } catch (e) {
      result.errors.push({ stage, error: e.message });
    }
  }

  result.finished_at = new Date().toISOString();
  return res.status(200).json(result);
}

// ────────── 캠페인 5단계 템플릿 ──────────
function buildCampaignTemplate(stage, m) {
  const hotelName = m.hotel_name || 'your hotel';
  const managerName = m.hotel_contact_name || 'there';
  const ch = m.video_channels_active || 0;
  const views = m.video_total_views || 0;
  const bookings = m.booking_count || 0;
  const revenue = m.booking_revenue || 0;
  const daysLeft = m.guarantee_days_left;
  const fmt = n => Number(n || 0).toLocaleString();

  const dashboardUrl = 'https://gohotelwinners.com/dashboard.html';

  const map = {
    welcome: {
      subject: `🎉 Welcome to TravelWinners — ${hotelName}`,
      body: `<p>Hi ${managerName},</p>
<p>Welcome to TravelWinners B2B! Your hotel <strong>${hotelName}</strong> is now officially onboarded.</p>
<p>Within the next 7 days, our team will start publishing your hotel videos across our 8 YouTube channels (KO/EN/JA/ZH-TW/VI).</p>
<p>Your dashboard will show real-time stats — bookings, revenue, channel exposure.</p>
<p style="text-align:center;margin:30px 0;"><a href="${dashboardUrl}" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Open dashboard →</a></p>`,
    },
    early_sales: {
      subject: `🎬 Your videos are going live — ${hotelName}`,
      body: `<p>Hi ${managerName},</p>
<p>Good news — your hotel <strong>${hotelName}</strong> is now featured on <strong>${ch}/8 channels</strong> with growing exposure.</p>
<p>If you'd like to maximize reach, consider adding all 8 channels for full multilingual coverage. Reply to discuss.</p>
<p style="text-align:center;margin:30px 0;"><a href="${dashboardUrl}" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">View progress →</a></p>`,
    },
    report30: {
      subject: `📊 30-day performance — ${hotelName}`,
      body: `<p>Hi ${managerName},</p>
<p>Here's your 30-day report for <strong>${hotelName}</strong>:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;">
<tr><td style="padding:10px;background:#f7f7f7;border-radius:6px 0 0 6px;">Bookings</td><td style="padding:10px;background:#f7f7f7;border-radius:0 6px 6px 0;text-align:right;font-size:18px;font-weight:600;">${bookings}</td></tr>
<tr><td colspan="2" style="height:6px;"></td></tr>
<tr><td style="padding:10px;background:#f7f7f7;border-radius:6px 0 0 6px;">Revenue</td><td style="padding:10px;background:#f7f7f7;border-radius:0 6px 6px 0;text-align:right;font-size:18px;font-weight:600;">$${fmt(revenue)}</td></tr>
<tr><td colspan="2" style="height:6px;"></td></tr>
<tr><td style="padding:10px;background:#f7f7f7;border-radius:6px 0 0 6px;">Channel views</td><td style="padding:10px;background:#f7f7f7;border-radius:0 6px 6px 0;text-align:right;font-size:18px;font-weight:600;">${fmt(views)}</td></tr>
</table>
<p style="text-align:center;margin:30px 0;"><a href="${dashboardUrl}" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Full report →</a></p>`,
    },
    rebill: {
      subject: `💎 Your 6-month protection — ${daysLeft != null ? `${daysLeft} days left` : 'expires soon'}`,
      body: `<p>Hi ${managerName},</p>
<p>Your TravelWinners 6-month booking guarantee for <strong>${hotelName}</strong> ${daysLeft != null ? `expires in <strong>${daysLeft} days</strong>` : 'is approaching expiry'}.</p>
<p>To date: <strong>${bookings} bookings</strong>, <strong>$${fmt(revenue)}</strong> total revenue.</p>
<p>To keep your videos live and continue receiving bookings, extend for another 6 months.</p>
<p style="text-align:center;margin:30px 0;"><a href="${dashboardUrl}#rebill" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Extend partnership →</a></p>`,
    },
    final: {
      subject: `⚡ Final decision needed — ${hotelName}`,
      body: `<p>Hi ${managerName},</p>
<p>Your 6-month protection for <strong>${hotelName}</strong> expires in <strong>10 days</strong>.</p>
<p>Two options:</p>
<ul>
<li><strong>Extend</strong> — keep your hotel featured on all channels for another 6 months.</li>
<li><strong>Refund</strong> — if booking volume hasn't met expectations, we honour the 100% refund guarantee.</li>
</ul>
<p>Please reply with your decision. We're here to help either way.</p>
<p style="text-align:center;margin:30px 0;"><a href="${dashboardUrl}" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Open dashboard →</a></p>`,
    },
  };

  const stageKey = STAGE_TEMPLATES[stage]?.template;
  const tpl = map[stageKey];
  if (!tpl) return null;
  return {
    subject: tpl.subject,
    html: wrapShell({ body: tpl.body }),
    text: stripHtml(tpl.body) + '\n\nDashboard: ' + dashboardUrl,
  };
}

function stripHtml(s) { return String(s||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim(); }

function wrapShell({ body }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title></title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
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
