// /api/paypal.js
// PayPal 통합 router (Vercel Hobby 12-function 제한 회피용 단일 파일)
// action 파라미터로 4개 sub-handler 분기:
//   GET  ?action=config        → 프론트에 client_id/env 노출
//   POST ?action=create-order  → Order 생성 (매니저 인증 + 호텔 소유권 + 가격 서버 고정)
//   POST ?action=capture-order → Order capture + payments INSERT + invoice 자동 발행/paid (단계 7)
//   POST ?action=webhook       → PayPal Webhook (서명 검증 + COMPLETED→paid·REFUNDED→void+CN 단계 7)

import {
  createOrder,
  captureOrder,
  getOrder,
  verifyWebhookSignature,
  getPayPalEnv,
  getPublicClientId,
} from './_lib/paypal-client.js';
import { sendOpsEmail } from './_lib/email-sender.js';

const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
const PRODUCT_PRICE_USD = '200.00';
const PRODUCT_DESCRIPTION = 'TravelWinners B2B - 6-Language YouTube Video Production (One-time)';

// =============================================================
// 공통 헬퍼
// =============================================================

// PayPal capture status (UPPERCASE)를 DB 허용 status (lowercase)로 안전하게 매핑
// DB 허용: 'pending','succeeded','failed','refunded','canceled'
function mapPayPalStatusToDb(paypalStatus) {
  const s = String(paypalStatus || '').toUpperCase();
  if (s === 'COMPLETED') return 'succeeded';
  if (s === 'PENDING') return 'pending';
  if (s === 'DECLINED' || s === 'FAILED') return 'failed';
  if (s === 'REFUNDED' || s === 'PARTIALLY_REFUNDED') return 'refunded';
  if (s === 'VOIDED' || s === 'CANCELED' || s === 'REVERSED') return 'canceled';
  return 'pending'; // unknown은 안전하게 pending으로
}

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

// 결제 성공 후 hotels.status를 'paid'로 전환
// 이미 'paid' 이상 상태인 경우(producing/published) 변경 안 함 (역행 방지)
async function transitionHotelToPaid(hotelId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!hotelId) return { ok: false, reason: 'no_hotel_id' };
  // approved 상태인 호텔만 paid로 전환 (다른 상태에서는 변경 안 함)
  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId) + '&status=eq.approved',
    {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        status: 'paid',
        paid_at: new Date().toISOString(),
      }),
    }
  );
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data, updated_count: Array.isArray(data) ? data.length : 0 };
}

// =============================================================
// BL-INVOICE-001 단계 7 — PayPal → Invoice 자동 연동 헬퍼
// =============================================================
// PayPal은 자동 결제 흐름이므로 "발행 즉시 paid" 단일 트랜잭션.
// 한국 매니저는 별도 admin-invoices에서 수동 발행이라 이 헬퍼는 호출 안 함
// (PayPal capture는 해외 매니저 USD 결제에서만 실행되므로 분기 불필요).
//
// 3개 헬퍼:
//   1) issueAndMarkPaidForCapture(paymentId, captureId)
//      → invoice 발행 (없으면) + status='paid' + paid_at=now (PAID 워터마크 자동)
//      → 멱등 처리 (이미 invoice 있으면 status만 paid로 갱신)
//   2) markInvoicePaidByCapture(captureId)
//      → webhook 중복 호출용 (capture_id로 payment_id 역추적)
//   3) voidInvoiceByCapture(captureId, reason)
//      → REFUNDED webhook용 (CN 자동 채번·INSERT + invoice void)
// =============================================================

const INV_BUSINESS_DAYS_DEFAULT = 2;

function addBusinessDaysIso(baseDate, days) {
  const d = new Date(baseDate);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  d.setUTCHours(14, 59, 59, 0); // KST 23:59:59
  return d.toISOString();
}

async function rpcNextInvoiceNumber(serviceKey, track) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/rpc/next_invoice_number', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_track: track }),
  });
  if (!resp.ok) throw new Error('channum_failed:' + (await resp.text()));
  const num = await resp.json();
  if (!num || typeof num !== 'string') throw new Error('channum_invalid_response');
  return num;
}

/**
 * PayPal capture 성공 시 호출 — invoice 발행 + 즉시 paid 마크.
 * 멱등 보장: 이미 invoice가 있으면 status만 paid로 갱신.
 *
 * @param {string} paymentId  - payments.id (UUID)
 * @param {string} captureId  - PayPal capture id (멱등 키 보조용)
 * @returns {object} { ok, invoice_id, invoice_number, action: 'created'|'updated'|'already_paid', already_existed }
 */
async function issueAndMarkPaidForCapture(paymentId, captureId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!paymentId) return { ok: false, reason: 'no_payment_id' };

  // 1) payment fetch
  const payResp = await fetch(
    SUPABASE_URL + '/rest/v1/payments?id=eq.' + encodeURIComponent(paymentId)
      + '&select=id,hotel_id,user_id,amount,currency,status,method,invoice_number',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!payResp.ok) return { ok: false, reason: 'fetch_payment_failed', detail: await payResp.text() };
  const payments = await payResp.json();
  if (!Array.isArray(payments) || payments.length === 0) {
    return { ok: false, reason: 'payment_not_found', payment_id: paymentId };
  }
  const payment = payments[0];

  // 2) 이미 invoice가 있는지 확인 (멱등)
  const dupResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?payment_id=eq.' + encodeURIComponent(paymentId)
      + '&select=id,invoice_number,status,track',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const existing = await dupResp.json();
  if (Array.isArray(existing) && existing.length > 0) {
    const ex = existing[0];
    if (ex.status === 'paid') {
      return { ok: true, invoice_id: ex.id, invoice_number: ex.invoice_number, action: 'already_paid', already_existed: true };
    }
    if (ex.status === 'void') {
      // void된 인보이스에 PayPal 결제가 다시 들어왔다 = 정상이 아님 → ops 알림은 호출자에서
      return { ok: false, reason: 'invoice_voided', invoice_id: ex.id, invoice_number: ex.invoice_number };
    }
    // pending/expired → paid로 갱신
    const nowIso = new Date().toISOString();
    const updResp = await fetch(
      SUPABASE_URL + '/rest/v1/invoices?id=eq.' + encodeURIComponent(ex.id),
      {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          status: 'paid',
          paid_at: nowIso,
          updated_at: nowIso,
        }),
      }
    );
    if (!updResp.ok) return { ok: false, reason: 'invoice_update_failed', detail: await updResp.text() };
    return { ok: true, invoice_id: ex.id, invoice_number: ex.invoice_number, action: 'updated', already_existed: true };
  }

  // 3) invoice 신규 발행 — PayPal은 해외 매니저 전용 → INV-INT / USD / zero_rated / paypal
  // hotel 조회 (bill_to 정보용)
  const hotelResp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(payment.hotel_id)
      + '&select=id,hotel_name,country,contact_name,contact_email,address,user_id',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const hotels = await hotelResp.json();
  if (!Array.isArray(hotels) || hotels.length === 0) {
    return { ok: false, reason: 'hotel_not_found', hotel_id: payment.hotel_id };
  }
  const hotel = hotels[0];

  // PayPal은 해외 매니저 전용이 정석이지만, 안전을 위해 국가 정규화로 분기
  const isKorea = ['kr', 'korea', 'south korea', '한국', '대한민국', 'republic of korea']
    .includes(String(hotel.country || '').trim().toLowerCase());
  if (isKorea) {
    // 한국 매니저에게 PayPal 결제가 들어온 = 정책 위반 (sales 페이지에서 차단되어야 했음)
    return { ok: false, reason: 'paypal_for_kr_blocked', hotel_id: hotel.id, hotel_country: hotel.country };
  }

  const track = 'INV-INT';
  const currency = 'USD';
  const taxMode = 'zero_rated';
  const taxLabel = 'Zero-rated export of services';
  const amountTotal = parseFloat(payment.amount);
  if (!Number.isFinite(amountTotal) || amountTotal <= 0) {
    return { ok: false, reason: 'invalid_amount', amount: payment.amount };
  }

  // 채번
  let invoiceNumber;
  try {
    invoiceNumber = await rpcNextInvoiceNumber(serviceKey, track);
  } catch (e) {
    return { ok: false, reason: 'channum_failed', detail: e.message };
  }

  // 기한 (paid 상태로 즉시 발행이지만 due_at NOT NULL이라 박음)
  const nowIso = new Date().toISOString();
  const dueAt = addBusinessDaysIso(new Date(), INV_BUSINESS_DAYS_DEFAULT);

  const insertPayload = {
    invoice_number: invoiceNumber,
    track,
    document_type: 'invoice',  // status='paid' + paid_stamp=true는 PDF 단에서 처리
    payment_id: paymentId,
    hotel_id: hotel.id,
    user_id: payment.user_id || hotel.user_id,
    bill_to_country: 'NON_KR',
    bill_to_name: hotel.contact_name || hotel.hotel_name || '—',
    bill_to_email: hotel.contact_email || null,
    bill_to_address: hotel.address || null,
    currency,
    amount_subtotal: amountTotal,
    amount_tax: 0,
    amount_total: amountTotal,
    tax_mode: taxMode,
    tax_label: taxLabel,
    status: 'paid',
    payment_method: 'paypal',
    issued_at: nowIso,
    due_at: dueAt,
    paid_at: nowIso,
    issued_by: null,            // 시스템 자동 발행
    issued_by_email: 'system@paypal-webhook',
    metadata: {
      hotel_name: hotel.hotel_name,
      hotel_country_raw: hotel.country,
      auto_issued_by: 'paypal_capture',
      paypal_capture_id: captureId || null,
      api_version: '1.0',
    },
  };

  const insertResp = await fetch(SUPABASE_URL + '/rest/v1/invoices', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(insertPayload),
  });
  if (!insertResp.ok) {
    return { ok: false, reason: 'insert_failed', detail: await insertResp.text() };
  }
  const inserted = await insertResp.json();
  const invoice = Array.isArray(inserted) ? inserted[0] : inserted;

  // payments.invoice_number 동기화 (best effort)
  try {
    await fetch(SUPABASE_URL + '/rest/v1/payments?id=eq.' + encodeURIComponent(paymentId), {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice_number: invoiceNumber,
        paid_at: nowIso,
        updated_at: nowIso,
      }),
    });
  } catch (e) {
    console.warn('[paypal/invoice] payments.invoice_number sync 실패 (invoice는 발행됨):', e.message);
  }

  return { ok: true, invoice_id: invoice.id, invoice_number: invoice.invoice_number, action: 'created', already_existed: false };
}

/**
 * webhook 중복 호출용 — capture_id로 payment를 찾고 invoice paid 마크.
 * capture-order에서 이미 호출했으면 멱등 처리.
 */
async function markInvoicePaidByCapture(captureId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!captureId) return { ok: false, reason: 'no_capture_id' };

  const payResp = await fetch(
    SUPABASE_URL + '/rest/v1/payments?paypal_capture_id=eq.' + encodeURIComponent(captureId)
      + '&select=id',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const rows = await payResp.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: 'payment_not_found_by_capture', capture_id: captureId };
  }
  return await issueAndMarkPaidForCapture(rows[0].id, captureId);
}

/**
 * REFUNDED webhook용 — invoice void + Credit Note 자동 발행.
 */
async function voidInvoiceByCapture(captureId, reason) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!captureId) return { ok: false, reason: 'no_capture_id' };

  // 1) payment → invoice 역추적
  const payResp = await fetch(
    SUPABASE_URL + '/rest/v1/payments?paypal_capture_id=eq.' + encodeURIComponent(captureId)
      + '&select=id,user_id,amount,currency',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const payRows = await payResp.json();
  if (!Array.isArray(payRows) || payRows.length === 0) {
    return { ok: false, reason: 'payment_not_found_by_capture', capture_id: captureId };
  }
  const paymentId = payRows[0].id;

  const invResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?payment_id=eq.' + encodeURIComponent(paymentId) + '&select=*',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const invRows = await invResp.json();
  if (!Array.isArray(invRows) || invRows.length === 0) {
    return { ok: false, reason: 'invoice_not_found_for_payment', payment_id: paymentId };
  }
  const invoice = invRows[0];
  if (invoice.status === 'void') {
    return { ok: true, action: 'already_voided', invoice_id: invoice.id, invoice_number: invoice.invoice_number };
  }

  // 2) CN 채번
  const cnTrack = invoice.track === 'INV-KR' ? 'CN-KR' : 'CN-INT';
  let cnNumber;
  try {
    cnNumber = await rpcNextInvoiceNumber(serviceKey, cnTrack);
  } catch (e) {
    return { ok: false, reason: 'cn_channum_failed', detail: e.message };
  }

  // 3) CN INSERT
  const nowIso = new Date().toISOString();
  const cnPayload = {
    cn_number: cnNumber,
    track: cnTrack,
    original_invoice_id: invoice.id,
    original_invoice_number: invoice.invoice_number,
    payment_id: invoice.payment_id,
    user_id: invoice.user_id,
    currency: invoice.currency,
    amount_subtotal: Math.abs(parseFloat(invoice.amount_subtotal || 0)),
    amount_tax: Math.abs(parseFloat(invoice.amount_tax || 0)),
    amount_total: Math.abs(parseFloat(invoice.amount_total || 0)),
    reason: reason || 'PayPal automatic refund (PAYMENT.CAPTURE.REFUNDED)',
    reason_category: 'customer_request',
    issued_at: nowIso,
    issued_by: null,
    issued_by_email: 'system@paypal-webhook',
    metadata: {
      auto_voided_by: 'paypal_refund_webhook',
      paypal_capture_id: captureId,
      api_version: '1.0',
    },
  };
  const cnInsertResp = await fetch(SUPABASE_URL + '/rest/v1/credit_notes', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(cnPayload),
  });
  if (!cnInsertResp.ok) {
    return { ok: false, reason: 'cn_insert_failed', detail: await cnInsertResp.text() };
  }
  const cnInserted = await cnInsertResp.json();
  const creditNote = Array.isArray(cnInserted) ? cnInserted[0] : cnInserted;

  // 4) invoice status='void'
  const updResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoice.id),
    {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'void',
        voided_at: nowIso,
        void_reason: reason || 'PayPal automatic refund',
        updated_at: nowIso,
      }),
    }
  );
  if (!updResp.ok) {
    return {
      ok: false,
      reason: 'invoice_void_update_failed',
      detail: await updResp.text(),
      cn_created: { id: creditNote.id, cn_number: creditNote.cn_number },
    };
  }

  return {
    ok: true,
    action: 'voided',
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    cn_id: creditNote.id,
    cn_number: creditNote.cn_number,
  };
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
      status: mapPayPalStatusToDb(captureStatus),
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
    status: 'succeeded',
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

  // BL-INVOICE-001 단계 7 — payments INSERT 성공 시 invoice 자동 발행 + 즉시 paid 마크
  // (PayPal은 해외 매니저 USD 자동 결제이므로 pending 단계 없이 바로 Receipt 상태)
  let invoiceAuto = { ok: false, reason: 'not_attempted' };
  // payments 행의 id 추출 — insertPayment는 Prefer return=representation으로 row 배열을 돌려줌
  let paymentRowId = null;
  if (insertResult.ok && Array.isArray(insertResult.data) && insertResult.data.length > 0) {
    paymentRowId = insertResult.data[0].id;
  } else if (insertResult.status === 409) {
    // 중복 INSERT (이미 같은 capture_id) → capture_id로 역추적
    try {
      const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/payments?paypal_capture_id=eq.' + encodeURIComponent(captureId) + '&select=id',
        { headers: { 'Authorization': 'Bearer ' + sk, 'apikey': sk } }
      );
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]) paymentRowId = rows[0].id;
    } catch (e) {
      console.warn('[paypal/invoice] capture_id 역추적 실패:', e.message);
    }
  }

  if (paymentRowId) {
    try {
      invoiceAuto = await issueAndMarkPaidForCapture(paymentRowId, captureId);
    } catch (e) {
      invoiceAuto = { ok: false, reason: 'invoice_throw', detail: e.message };
    }
    if (!invoiceAuto.ok) {
      // 결제는 OK인데 invoice만 실패 — 운영자가 admin-invoices에서 수동 발행 가능하므로 차단 아닌 ops 알림
      sendOpsEmail({
        subject: '[TW B2B] ⚠️ PayPal 결제 OK / 인보이스 자동 발행 실패 — 수동 발행 필요',
        html: '<h2>결제 성공 / Invoice 자동 발행 실패</h2>'
          + '<p><strong>payment_id:</strong> <code>' + paymentRowId + '</code></p>'
          + '<p><strong>capture_id:</strong> <code>' + (captureId || '-') + '</code></p>'
          + '<p><strong>hotel_id:</strong> ' + hotelId + '</p>'
          + '<p><strong>사유:</strong> <code>' + (invoiceAuto.reason || 'unknown') + '</code></p>'
          + '<p><strong>detail:</strong> <pre>' + JSON.stringify(invoiceAuto, null, 2) + '</pre></p>'
          + '<p>admin-invoices.html 결제 탭에서 "Issue invoice" 버튼으로 수동 발행 가능합니다.</p>',
        text: 'PayPal 결제 OK / 인보이스 자동 발행 실패: ' + (invoiceAuto.reason || 'unknown'),
      }).catch(() => {});
    }
  }

  // 결제 성공 → hotels.status를 'paid'로 자동 전환
  // (approved 상태인 경우만, 멱등 처리)
  let hotelTransition = { ok: false, updated_count: 0 };
  try {
    hotelTransition = await transitionHotelToPaid(hotelId);
  } catch (e) {
    console.error('hotel status transition failed:', e);
  }
  if (!hotelTransition.ok || hotelTransition.updated_count === 0) {
    // 이미 paid 이상이면 정상 (재호출/already_captured 케이스).
    // 그 외 실패는 ops 알림 (결제는 성공, status 미전환 → 매니저는 marketing.html 못 봄)
    if (!alreadyCaptured) {
      sendOpsEmail({
        subject: '[TW B2B] ⚠️ PayPal 결제 OK / hotels.status 전환 실패 — 수동 확인',
        html: '<h2>결제는 완료, status 전환 실패</h2>'
          + '<p><strong>hotel_id:</strong> ' + hotelId + '</p>'
          + '<p><strong>capture_id:</strong> ' + (captureId || '-') + '</p>'
          + '<p><strong>updated_count:</strong> ' + hotelTransition.updated_count + ' (0이면 호텔이 approved 아니거나 이미 paid 이상)</p>'
          + '<p><strong>raw:</strong> <pre>' + JSON.stringify(hotelTransition.data || {}, null, 2) + '</pre></p>'
          + '<p>매니저가 marketing.html 접근 못 할 수 있음. admin.html에서 호텔 status 수동 확인 필요.</p>',
        text: 'PayPal 결제 OK, hotels.status 전환 실패. hotel_id=' + hotelId,
      }).catch(() => {});
    }
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
        + '<tr><td style="padding:6px 12px"><strong>status 전환</strong></td><td style="padding:6px 12px">' + (hotelTransition.updated_count > 0 ? '✅ approved → paid' : '⚠️ 변경 없음 (수동 확인)') + '</td></tr>'
        + '<tr><td style="padding:6px 12px"><strong>인보이스 자동 발행</strong></td><td style="padding:6px 12px">' + (invoiceAuto.ok ? ('✅ ' + invoiceAuto.invoice_number + ' (' + invoiceAuto.action + ')') : ('⚠️ 실패: ' + (invoiceAuto.reason || 'unknown'))) + '</td></tr>'
        + '</tbody></table>',
      text: 'PayPal 결제 완료: ' + (hotel.hotel_name || hotelId) + ' / $' + amountValue + ' / order=' + orderId + ' / invoice=' + (invoiceAuto.invoice_number || 'failed'),
    }).catch(() => {});
  }

  return res.status(200).json({
    ok: true,
    status: 'succeeded',
    order_id: orderId,
    capture_id: captureId,
    amount: amountValue,
    currency: currencyCode,
    already_captured: alreadyCaptured,
    hotel_status_updated: hotelTransition.updated_count > 0,
    invoice: invoiceAuto.ok ? {
      id: invoiceAuto.invoice_id,
      invoice_number: invoiceAuto.invoice_number,
      action: invoiceAuto.action,
    } : null,
    invoice_error: invoiceAuto.ok ? null : (invoiceAuto.reason || 'unknown'),
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
          status: 'succeeded',
          metadata: { ...resource, webhook_event: eventType },
        });
        // BL-INVOICE-001 단계 7 — invoice 자동 paid 마크 (capture-order에서 이미 했어도 멱등)
        try {
          const inv = await markInvoicePaidByCapture(captureId);
          if (!inv.ok && inv.reason !== 'payment_not_found_by_capture') {
            console.warn('[webhook/COMPLETED] invoice paid mark failed:', inv);
          }
        } catch (e) {
          console.error('[webhook/COMPLETED] invoice paid mark threw:', e);
        }
        break;
      }
      case 'PAYMENT.CAPTURE.DENIED': {
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'failed',
          metadata: { ...resource, webhook_event: eventType, paypal_status: 'DENIED' },
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
        // BL-INVOICE-001 단계 7 — invoice void + CN 자동 발행
        let voidResult = { ok: false, reason: 'not_attempted' };
        try {
          voidResult = await voidInvoiceByCapture(
            captureId,
            'PayPal automatic refund (PAYMENT.CAPTURE.REFUNDED webhook)'
          );
        } catch (e) {
          voidResult = { ok: false, reason: 'void_throw', detail: e.message };
        }
        sendOpsEmail({
          subject: '[TW B2B] 🔁 PayPal 환불 발생 (REFUNDED) — 수동 검토 필요',
          html: '<h2>PayPal 환불 처리</h2>'
            + '<p><strong>capture_id:</strong> <code>' + captureId + '</code></p>'
            + '<p><strong>금액:</strong> ' + (resource.amount && resource.amount.value) + ' ' + (resource.amount && resource.amount.currency_code) + '</p>'
            + '<p><strong>인보이스 자동 void:</strong> ' + (voidResult.ok
                ? ('✅ ' + voidResult.invoice_number + ' → CN ' + voidResult.cn_number)
                : ('⚠️ 실패: ' + (voidResult.reason || 'unknown'))) + '</p>'
            + '<p style="color:#b91c1c"><strong>주의:</strong> hotels.status 자동 변경 안 함. admin.html에서 hotel 상태 수동 검토 후 처리하세요.</p>',
        }).catch(() => {});
        break;
      }
      case 'PAYMENT.CAPTURE.REVERSED': {
        const captureId = resource.id;
        await updatePaymentByCaptureId(captureId, {
          status: 'canceled',
          metadata: { ...resource, webhook_event: eventType, paypal_status: 'REVERSED' },
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
