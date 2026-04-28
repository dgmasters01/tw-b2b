// /api/paypal.js
// PayPal 통합 router (Vercel Hobby 12-function 제한 회피용 단일 파일)
// action 파라미터로 4개 sub-handler 분기:
//   GET  ?action=config        → 프론트에 client_id/env 노출
//   POST ?action=create-order  → Order 생성 (매니저 인증 + 호텔 소유권 + 가격 서버 고정)
//   POST ?action=capture-order → Order capture + payments INSERT
//   POST ?action=webhook       → PayPal Webhook (서명 검증 + 환불/리버설 처리)

import {
  createOrder,
  captureOrder,
  getOrder,
  verifyWebhookSignature,
  getPayPalEnv,
  getPublicClientId,
} from './lib/paypal-client.js';
import { sendOpsEmail } from './lib/email-sender.js';

const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
const PRODUCT_PRICE_USD = '200.00';
const PRODUCT_DESCRIPTION = 'TravelWinners B2B - 6-Language YouTube Video Production (One-time)';

// =============================================================
// 공통 헬퍼
// =============================================================

async function verifyUser(accessToken) {
  if (!accessToken) return null;
  try {
    const resp = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.id ? data : null;
  } catch {
    return null;
  }
}

async function getHotel(hotelId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId) + '&select=id,user_id,hotel_name,status',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!resp.ok) return null;
  const rows = await resp.json();
  return rows[0] || null;
}

async function checkHotelOwnership(hotelId, userId) {
  const hotel = await getHotel(hotelId);
  if (!hotel) return { ok: false, reason: 'not_found' };
  if (hotel.user_id !== userId) return { ok: false, reason: 'not_owner' };
  const blocked = ['paid', 'producing', 'published'];
  if (blocked.includes(hotel.status)) return { ok: false, reason: 'already_paid', currentStatus: hotel.status };
  return { ok: true, hotel };
}

async function insertPayment(payload) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  const resp = await fetch(SUPABASE_URL + '/rest/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
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

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// =============================================================
// Sub-handlers
// =============================================================

async function handleConfig(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  const clientId = getPublicClientId();
  const env = getPayPalEnv();
  if (!clientId) return res.status(500).json({ error: 'PayPal client_id not configured', env });
  return res.status(200).json({ env, clientId, currency: 'USD', intent: 'capture' });
}

async function handleCreateOrder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyUser(accessToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const body = req.body || {};
  const hotelId = body.hotel_id;
  if (!hotelId) return res.status(400).json({ error: 'hotel_id is required' });

  const ownership = await checkHotelOwnership(hotelId, user.id);
  if (!ownership.ok) {
    const status = (ownership.reason === 'not_owner' || ownership.reason === 'not_found') ? 403 : 409;
    return res.status(status).json({
      error: 'hotel_check_failed',
      reason: ownership.reason,
      currentStatus: ownership.currentStatus,
    });
  }

  const order = await createOrder({
    amount: PRODUCT_PRICE_USD,
    referenceId: hotelId,
    description: PRODUCT_DESCRIPTION,
  });

  return res.status(200).json({ order_id: order.id, status: order.status, env: getPayPalEnv() });
}

async function handleCaptureOrder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyUser(accessToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const body = req.body || {};
  const orderId = body.order_id;
  const hotelId = body.hotel_id;
  if (!orderId || !hotelId) return res.status(400).json({ error: 'order_id and hotel_id are required' });

  const hotel = await getHotel(hotelId);
  if (!hotel) return res.status(404).json({ error: 'hotel_not_found' });
  if (hotel.user_id !== user.id) return res.status(403).json({ error: 'not_owner' });

  // reference_id 무결성
  let orderInfo;
  try {
    orderInfo = await getOrder(orderId);
  } catch (e) {
    return res.status(400).json({ error: 'order_lookup_failed', detail: e.message });
  }
  const refId = orderInfo.purchase_units && orderInfo.purchase_units[0] && orderInfo.purchase_units[0].reference_id;
  if (refId && refId !== hotelId) return res.status(400).json({ error: 'reference_id_mismatch' });

  // Capture
  let captureResult;
  let alreadyCaptured = false;
  try {
    captureResult = await captureOrder(orderId);
  } catch (e) {
    if (e.paypalErrorCode === 'ORDER_ALREADY_CAPTURED') {
      alreadyCaptured = true;
      captureResult = orderInfo;
    } else {
      console.error('capture failed:', e);
      return res.status(502).json({ error: 'paypal_capture_failed', detail: e.message });
    }
  }

  const purchaseUnit = (captureResult.purchase_units && captureResult.purchase_units[0]) || {};
  const capture = (purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures[0]) || {};
  const captureId = capture.id || null;
  const captureStatus = (capture.status || '').toUpperCase();
  const amountValue = (capture.amount && capture.amount.value) || PRODUCT_PRICE_USD;
  const currencyCode = (capture.amount && capture.amount.currency_code) || 'USD';
  const payer = captureResult.payer || {};
  const payerEmail = payer.email_address || null;
  const payerId = payer.payer_id || null;

  if (!alreadyCaptured && captureStatus !== 'COMPLETED') {
    await insertPayment({
      user_id: user.id,
      hotel_id: hotelId,
      amount: parseFloat(amountValue),
      currency: currencyCode,
      method: 'paypal',
      status: captureStatus.toLowerCase() || 'pending',
      paypal_order_id: orderId,
      paypal_capture_id: captureId,
      paypal_payer_email: payerEmail,
      paypal_payer_id: payerId,
      environment: getPayPalEnv(),
      metadata: { capture, debug_id: captureResult.debug_id || null },
    });
    return res.status(200).json({ ok: false, status: captureStatus.toLowerCase(), message: 'Capture not completed' });
  }

  const insertResult = await insertPayment({
    user_id: user.id,
    hotel_id: hotelId,
    amount: parseFloat(amountValue),
    currency: currencyCode,
    method: 'paypal',
    status: 'completed',
    paypal_order_id: orderId,
    paypal_capture_id: captureId,
    paypal_payer_email: payerEmail,
    paypal_payer_id: payerId,
    environment: getPayPalEnv(),
    metadata: { capture },
  });

  if (!insertResult.ok && insertResult.status !== 409) {
    console.error('payment insert failed:', insertResult);
    sendOpsEmail({
      subject: '[TW B2B] 🚨 PayPal 결제 DB 저장 실패 — 수동 복구 필요',
      html: '<h2>긴급: 결제 성공 / DB 저장 실패</h2>'
        + '<p><strong>order_id:</strong> ' + orderId + '</p>'
        + '<p><strong>capture_id:</strong> ' + (captureId || '-') + '</p>'
        + '<p><strong>hotel_id:</strong> ' + hotelId + '</p>'
        + '<p><strong>user_id:</strong> ' + user.id + '</p>'
        + '<p><strong>amount:</strong> ' + amountValue + ' ' + currencyCode + '</p>'
        + '<p><strong>error:</strong> <pre>' + JSON.stringify(insertResult.data, null, 2) + '</pre></p>',
      text: 'PayPal 결제 성공했으나 payments INSERT 실패. order_id=' + orderId + ' hotel_id=' + hotelId,
    }).catch(() => {});
  }

  if (!alreadyCaptured) {
    sendOpsEmail({
      subject: '[TW B2B] 💰 PayPal 결제 완료 — ' + (hotel.hotel_name || hotelId),
      html: '<h2>새 결제가 들어왔습니다</h2>'
        + '<table style="border-collapse:collapse"><tbody>'
        + '<tr><td style="padding:6px 12px"><strong>호텔</strong></td><td style="padding:6px 12px">' + (hotel.hotel_name || '-') + '</td></tr>'
        + '<tr><td style="padding:6px 12px"><strong>금액</strong></td><td style="padding:6px 12px">$' + amountValue + ' ' + currencyCode + '</td></tr>'
        + '<tr><td style="padding:6px 12px"><strong>매니저</strong></td><td style="padding:6px 12px">' + (payerEmail || user.email || '-') + '</td></tr>'
        + '<tr><td style="padding:6px 12px"><strong>order_id</strong></td><td style="padding:6px 12px"><code>' + orderId + '</code></td></tr>'
        + '<tr><td style="padding:6px 12px"><strong>capture_id</strong></td><td style="padding:6px 12px"><code>' + (captureId || '-') + '</code></td></tr>'
        + '<tr><td style="padding:6px 12px"><strong>환경</strong></td><td style="padding:6px 12px">' + getPayPalEnv() + '</td></tr>'
        + '</tbody></table>',
      text: 'PayPal 결제 완료: ' + (hotel.hotel_name || hotelId) + ' / $' + amountValue + ' / order=' + orderId,
    }).catch(() => {});
  }

  return res.status(200).json({
    ok: true,
    status: 'completed',
    order_id: orderId,
    capture_id: captureId,
    amount: amountValue,
    currency: currencyCode,
    already_captured: alreadyCaptured,
  });
}

async function handleWebhook(req, res, rawBody) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 서명 검증
  const verifyOk = await verifyWebhookSignature(req.headers, rawBody).catch(err => {
    console.error('webhook verify error:', err);
    return false;
  });

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
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'completed',
          metadata: { ...resource, webhook_event: eventType },
        });
        break;
      }
      case 'PAYMENT.CAPTURE.DENIED': {
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'denied',
          metadata: { ...resource, webhook_event: eventType },
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
        // hotels.status 자동 변경 안 함 — 수동 검토 필요
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'refunded',
          metadata: { ...resource, webhook_event: eventType, refunded_at: new Date().toISOString() },
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
          metadata: { ...resource, webhook_event: eventType },
        });
        sendOpsEmail({
          subject: '[TW B2B] ⚠️ PayPal 결제 리버설 (REVERSED) — 수동 검토 필요',
          html: '<h2>PayPal 리버설 발생</h2>'
            + '<p>capture_id: <code>' + captureId + '</code></p>'
            + '<p>금액: ' + (resource.amount && resource.amount.value) + ' ' + (resource.amount && resource.amount.currency_code) + '</p>',
        }).catch(() => {});
        break;
      }
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('Order approved by buyer:', resource.id);
        break;
      default:
        console.log('Unhandled PayPal webhook event:', eventType);
    }
    return res.status(200).json({ ok: true, event_type: eventType });
  } catch (err) {
    console.error('webhook handler error:', err);
    return res.status(500).json({ error: 'webhook_processing_failed', detail: err.message });
  }
}

// =============================================================
// Router (single Vercel Function entry)
// =============================================================

// Vercel Functions: req.body는 JSON일 때 자동 파싱됨.
// webhook은 raw body가 필요하므로 router 진입 시 body가 이미 파싱되었으면 다시 직렬화.
// (Hobby 플랜에서는 bodyParser config가 무시되는 경우가 있어 안전하게 양쪽 처리)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // action 파라미터: query string > body
  const url = new URL(req.url || '/', 'http://x');
  const action = (url.searchParams.get('action') || (req.body && req.body.action) || '').toLowerCase();

  try {
    switch (action) {
      case 'config':
        return await handleConfig(req, res);
      case 'create-order':
        return await handleCreateOrder(req, res);
      case 'capture-order':
        return await handleCaptureOrder(req, res);
      case 'webhook': {
        // webhook 서명 검증을 위해 원본 문자열이 필요. req.body가 이미 객체로 파싱됐으면 재직렬화.
        let rawBody;
        if (typeof req.body === 'string') {
          rawBody = req.body;
        } else if (req.body && typeof req.body === 'object') {
          rawBody = JSON.stringify(req.body);
        } else {
          rawBody = await readRawBody(req);
        }
        return await handleWebhook(req, res, rawBody);
      }
      default:
        return res.status(400).json({
          error: 'unknown_action',
          allowed: ['config', 'create-order', 'capture-order', 'webhook'],
          hint: 'Use ?action=<name> in query string',
        });
    }
  } catch (err) {
    console.error('paypal router error:', err);
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
}
