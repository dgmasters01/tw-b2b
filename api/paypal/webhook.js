// /api/paypal/webhook.js
// PayPal Webhook 수신 endpoint
// - 서명 검증 필수 (PAYPAL_WEBHOOK_ID 환경변수)
// - 처리 이벤트:
//   PAYMENT.CAPTURE.COMPLETED  → payments status='completed' (이미 capture-order.js에서 처리되지만 중복 안전망)
//   PAYMENT.CAPTURE.DENIED     → payments status='denied'
//   PAYMENT.CAPTURE.REFUNDED   → payments status='refunded' + hotels.status 매니저 검토 필요 (자동 다운그레이드 X)
//   PAYMENT.CAPTURE.REVERSED   → payments status='reversed'
//   CHECKOUT.ORDER.APPROVED    → 정보 로깅만
//
// 보안:
// - body는 raw 문자열로 받아 PayPal 서명 검증 후 파싱
// - 검증 실패 시 401 반환

import { verifyWebhookSignature, getPayPalEnv } from '../lib/paypal-client.js';
import { sendOpsEmail } from '../lib/email-sender.js';

const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';

// Vercel: bodyParser 비활성화하여 raw body 받기 (PayPal 서명 검증용)
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function updatePaymentByCaptureId(captureId, patch) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!captureId) return { ok: false, reason: 'no_capture_id' };

  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/payments?paypal_capture_id=eq.' + encodeURIComponent(captureId),
    {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(patch),
    }
  );
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

async function findPaymentByOrderId(orderId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/payments?paypal_order_id=eq.' + encodeURIComponent(orderId) + '&select=*',
    {
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
      },
    }
  );
  if (!resp.ok) return null;
  const rows = await resp.json();
  return rows[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'failed_to_read_body' });
  }

  // 1. 서명 검증
  const verifyOk = await verifyWebhookSignature(req.headers, rawBody).catch(err => {
    console.error('webhook verify error:', err);
    return false;
  });

  // 개발 환경에서 PAYPAL_WEBHOOK_ID 미설정 시 우회 허용 (false 반환)
  // production에서는 반드시 검증 통과 필요
  if (!verifyOk) {
    if (getPayPalEnv() === 'live') {
      return res.status(401).json({ error: 'invalid_signature' });
    }
    console.warn('Webhook 서명 검증 우회 (sandbox 또는 webhook_id 미설정)');
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const eventType = event.event_type || '';
  const resource = event.resource || {};

  try {
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        // capture-order.js에서 이미 처리됨 → 중복 안전망 (status 강제 confirm)
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'completed',
          metadata: { ...(resource), webhook_event: eventType },
        });
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'denied',
          metadata: { ...(resource), webhook_event: eventType },
        });
        sendOpsEmail({
          subject: '[TW B2B] ⚠️ PayPal 결제 거부됨 (DENIED)',
          html: '<h2>PayPal 결제 거부 발생</h2>'
            + '<p>capture_id: <code>' + captureId + '</code></p>'
            + '<p>amount: ' + (resource.amount && resource.amount.value) + ' ' + (resource.amount && resource.amount.currency_code) + '</p>'
            + '<p>매니저에게 재결제 안내 필요</p>',
        }).catch(() => {});
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        // 환불 발생: payments status를 refunded로
        // 주의: hotels.status는 자동으로 다운그레이드하지 않음 (영상 이미 제작/게시 가능성)
        // → 매니저 수동 검토 필요
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'refunded',
          metadata: { ...(resource), webhook_event: eventType, refunded_at: new Date().toISOString() },
        });
        sendOpsEmail({
          subject: '[TW B2B] 🔁 PayPal 환불 발생 (REFUNDED) — 수동 검토 필요',
          html: '<h2>PayPal 환불 처리</h2>'
            + '<p><strong>capture_id:</strong> <code>' + captureId + '</code></p>'
            + '<p><strong>금액:</strong> ' + (resource.amount && resource.amount.value) + ' ' + (resource.amount && resource.amount.currency_code) + '</p>'
            + '<p style="color:#b91c1c"><strong>주의:</strong> hotels.status 자동 변경 안 함. admin.html에서 hotel 상태 수동 검토 후 처리하세요.</p>',
        }).catch(() => {});
        break;
      }

      case 'PAYMENT.CAPTURE.REVERSED': {
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'reversed',
          metadata: { ...(resource), webhook_event: eventType },
        });
        sendOpsEmail({
          subject: '[TW B2B] ⚠️ PayPal 결제 리버설 (REVERSED) — 수동 검토 필요',
          html: '<h2>PayPal 리버설 발생</h2>'
            + '<p>capture_id: <code>' + captureId + '</code></p>'
            + '<p>금액: ' + (resource.amount && resource.amount.value) + ' ' + (resource.amount && resource.amount.currency_code) + '</p>',
        }).catch(() => {});
        break;
      }

      case 'CHECKOUT.ORDER.APPROVED': {
        // 정보성 로그만 (capture-order.js가 capture를 호출함)
        console.log('Order approved by buyer:', resource.id);
        break;
      }

      default:
        // 미처리 이벤트 로그만
        console.log('Unhandled PayPal webhook event:', eventType);
    }

    return res.status(200).json({ ok: true, event_type: eventType });
  } catch (err) {
    console.error('webhook handler error:', err);
    // PayPal은 200 외 응답을 받으면 재시도하므로, DB 일시 오류는 200 반환하지 않고 5xx로 재시도 유도
    return res.status(500).json({ error: 'webhook_processing_failed', detail: err.message });
  }
}
