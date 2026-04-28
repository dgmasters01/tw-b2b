// /api/paypal/capture-order.js
// PayPal Order capture (결제 확정) + payments 테이블 INSERT
// - 매니저 인증 필수
// - 서버에서 PayPal에 capture 호출 → 성공 시 payments INSERT (status='completed')
// - 트리거가 hotels.status='paid' 자동 전환 (sql/phase3-c-paypal.sql)
// - 멱등성: paypal_order_id UNIQUE 인덱스 → 중복 INSERT 방지
// - 작업 완료 시 ops 알림 메일 (실패해도 메인 흐름 영향 없음)
//
// Body: { order_id: string, hotel_id: string }
// Headers: Authorization: Bearer <supabase_access_token>

import { captureOrder, getOrder, getPayPalEnv } from '../lib/paypal-client.js';
import { sendOpsEmail } from '../lib/email-sender.js';

const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
const PRODUCT_PRICE_USD = '200.00';

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

/**
 * payments 테이블 INSERT (service_role)
 */
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

/**
 * 호텔 정보 조회 (소유권 확인 + 알림용)
 */
async function getHotel(hotelId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId) + '&select=id,user_id,hotel_name,status',
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. 인증
    const auth = req.headers.authorization || '';
    const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const user = await verifyUser(accessToken);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 2. 입력 검증
    const body = req.body || {};
    const orderId = body.order_id;
    const hotelId = body.hotel_id;
    if (!orderId || !hotelId) {
      return res.status(400).json({ error: 'order_id and hotel_id are required' });
    }

    // 3. 호텔 소유권 검증
    const hotel = await getHotel(hotelId);
    if (!hotel) return res.status(404).json({ error: 'hotel_not_found' });
    if (hotel.user_id !== user.id) return res.status(403).json({ error: 'not_owner' });

    // 4. PayPal에 reference_id 무결성 확인 (order의 reference_id가 hotel_id와 일치하는지)
    let orderInfo;
    try {
      orderInfo = await getOrder(orderId);
    } catch (e) {
      return res.status(400).json({ error: 'order_lookup_failed', detail: e.message });
    }
    const refId = orderInfo.purchase_units && orderInfo.purchase_units[0] && orderInfo.purchase_units[0].reference_id;
    if (refId && refId !== hotelId) {
      return res.status(400).json({ error: 'reference_id_mismatch' });
    }

    // 5. PayPal Capture 호출
    let captureResult;
    let alreadyCaptured = false;
    try {
      captureResult = await captureOrder(orderId);
    } catch (e) {
      // ORDER_ALREADY_CAPTURED 는 멱등 처리 (이미 capture된 경우)
      if (e.paypalErrorCode === 'ORDER_ALREADY_CAPTURED') {
        alreadyCaptured = true;
        captureResult = orderInfo; // 기존 order 정보 사용
      } else {
        console.error('capture failed:', e);
        return res.status(502).json({ error: 'paypal_capture_failed', detail: e.message });
      }
    }

    // 6. capture 정보 추출
    const purchaseUnit = (captureResult.purchase_units && captureResult.purchase_units[0]) || {};
    const capture = (purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures[0]) || {};
    const captureId = capture.id || null;
    const captureStatus = (capture.status || '').toUpperCase(); // 'COMPLETED' 기대
    const amountValue = (capture.amount && capture.amount.value) || PRODUCT_PRICE_USD;
    const currencyCode = (capture.amount && capture.amount.currency_code) || 'USD';
    const payer = captureResult.payer || {};
    const payerEmail = payer.email_address || null;
    const payerId = payer.payer_id || null;

    // 결제 완료 상태가 아니면 (PENDING, FAILED 등) 실패 응답
    if (!alreadyCaptured && captureStatus !== 'COMPLETED') {
      // payments 테이블에는 status를 그대로 기록 (pending/failed)
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
        metadata: { capture: capture, debug_id: captureResult.debug_id || null },
      });
      return res.status(200).json({
        ok: false,
        status: captureStatus.toLowerCase(),
        message: 'Capture not completed',
      });
    }

    // 7. payments 테이블에 INSERT (성공)
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
      metadata: { capture: capture },
    });

    // 멱등 INSERT: paypal_order_id 중복이면 409 가능 → 무시 (이미 처리된 결제)
    if (!insertResult.ok && insertResult.status !== 409) {
      console.error('payment insert failed:', insertResult);
      // 결제는 성공했으나 DB 저장 실패 → ops 알림 + 사용자에게는 일단 성공 반환 (수동 복구 필요)
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

    // 8. 결제 성공 알림 (ops 메일, 실패해도 무시)
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

  } catch (err) {
    console.error('capture-order fatal error:', err);
    return res.status(500).json({ error: 'capture_failed', detail: err.message });
  }
}
