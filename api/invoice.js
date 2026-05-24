// /api/invoice.js
// ════════════════════════════════════════════════════════════════════════════
// 인보이스 라우터 (BL-INVOICE-001 단계 4~)
// ════════════════════════════════════════════════════════════════════════════
// action 분기 (admin.js와 동일 패턴 — 통합 라우터로 Vercel 함수 절약):
//
//   POST ?action=issue        → 인보이스 발행 (owner only) — 단계 4
//   GET  ?action=pdf&id=xxx   → PDF 다운로드 (owner + 본인) — 단계 5
//   GET  ?action=get&id=xxx   → 인보이스 메타 조회 (owner + 본인) — 단계 5
//   POST ?action=void         → 인보이스 취소 (owner only) — 단계 5 후속
//
// 인증:
//   - owner-only 액션: requireAdmin → admin.role === 'owner'
//   - 매니저 본인 액션: requireAuthed → invoices.user_id === auth.uid()
// ════════════════════════════════════════════════════════════════════════════

import { getFxRate } from './_lib/fx.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';

const ALLOWED_ACTIONS = ['issue', 'pdf', 'get', 'void', 'list'];

// ────────────────────────────────────────────────────────────────────────────
// 인증 헬퍼 (admin.js의 requireAdmin과 동일 로직 — 통합 라우터 분리로 인한 복제)
// ────────────────────────────────────────────────────────────────────────────
async function requireAdmin(req, serviceKey) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const callerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!callerToken) return { ok: false, status: 401, error: 'missing_bearer' };

  const meResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + callerToken, 'apikey': serviceKey }
  });
  if (!meResp.ok) return { ok: false, status: 401, error: 'invalid_token' };
  const me = await meResp.json();
  const myEmail = me.email;
  if (!myEmail) return { ok: false, status: 401, error: 'no_email' };

  const adminResp = await fetch(
    SUPABASE_URL + '/rest/v1/admins?email=eq.' + encodeURIComponent(myEmail) + '&select=role,is_active',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const admins = await adminResp.json();
  if (!Array.isArray(admins) || admins.length === 0) {
    return { ok: false, status: 403, error: 'not_admin' };
  }
  if (!admins[0].is_active) return { ok: false, status: 403, error: 'inactive' };

  return { ok: true, email: myEmail, role: admins[0].role, userId: me.id || null };
}

// ────────────────────────────────────────────────────────────────────────────
// 단계 4 — 인보이스 발행 (issue)
// ────────────────────────────────────────────────────────────────────────────
// 입력: { payment_id: UUID }
// 동작:
//   1. payment 조회 → hotel 조회 → 국가 분기 결정 (KR / NON_KR)
//   2. 이중 발행 방지 — payment_id에 이미 인보이스 있으면 차단
//   3. 채번 (next_invoice_number RPC)
//   4. 환율 hit (한국 매니저에게 USD 상품 발행 시)
//   5. invoices INSERT
//   6. payments.invoice_number 동기화
// ────────────────────────────────────────────────────────────────────────────

const BUSINESS_DAYS_DEFAULT = 2;

/**
 * KST 기준 + N 영업일 (주말 자동 제외)
 */
function addBusinessDays(baseDate, days) {
  const d = new Date(baseDate);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  // 23:59:59 KST 마감으로 설정 (영업일 끝까지 기한)
  d.setUTCHours(14, 59, 59, 0);  // KST 23:59:59 = UTC 14:59:59
  return d;
}

async function handleIssue(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', hint: 'POST only' });
  }
  if (admin.role !== 'owner') {
    return res.status(403).json({
      error: 'owner_only',
      hint: '인보이스 발행은 owner 권한만 가능 (정책 2.11)',
      current_role: admin.role
    });
  }

  const body = req.body || {};
  const paymentId = body.payment_id;
  if (!paymentId || typeof paymentId !== 'string') {
    return res.status(400).json({ error: 'missing_payment_id' });
  }

  // ───────────────────────────────────────────────
  // 1) 결제 + 호텔 정보 fetch
  // ───────────────────────────────────────────────
  const payResp = await fetch(
    SUPABASE_URL + '/rest/v1/payments?id=eq.' + paymentId
    + '&select=id,hotel_id,user_id,amount,currency,status,method,invoice_number,metadata',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!payResp.ok) {
    return res.status(500).json({ error: 'fetch_payment_failed', detail: await payResp.text() });
  }
  const payments = await payResp.json();
  if (!Array.isArray(payments) || payments.length === 0) {
    return res.status(404).json({ error: 'payment_not_found', payment_id: paymentId });
  }
  const payment = payments[0];

  if (!payment.hotel_id) {
    return res.status(400).json({ error: 'payment_missing_hotel', payment_id: paymentId });
  }
  if (!payment.amount || payment.amount <= 0) {
    return res.status(400).json({ error: 'payment_invalid_amount' });
  }

  // ───────────────────────────────────────────────
  // 2) 이중 발행 방지 (정책 2.8)
  // ───────────────────────────────────────────────
  const dupResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?payment_id=eq.' + paymentId
    + '&select=id,invoice_number,status,document_type',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const existing = await dupResp.json();
  if (Array.isArray(existing) && existing.length > 0) {
    const ex = existing[0];
    // void 상태면 재발행 허용, 그 외엔 차단
    if (ex.status !== 'void') {
      return res.status(409).json({
        error: 'invoice_already_exists',
        hint: '이 결제에 이미 인보이스가 발행되었습니다 (정책 2.8 이중 발행 방지)',
        existing_invoice: {
          id: ex.id,
          invoice_number: ex.invoice_number,
          status: ex.status,
          document_type: ex.document_type
        }
      });
    }
  }

  // ───────────────────────────────────────────────
  // 3) hotel 조회 → 국가 분기 결정
  // ───────────────────────────────────────────────
  const hotelResp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + payment.hotel_id
    + '&select=id,hotel_name,country,contact_name,contact_email,address,user_id',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const hotels = await hotelResp.json();
  if (!Array.isArray(hotels) || hotels.length === 0) {
    return res.status(404).json({ error: 'hotel_not_found', hotel_id: payment.hotel_id });
  }
  const hotel = hotels[0];

  // hotels.country가 'Korea', 'South Korea', 'KR', '한국' 등 다양할 수 있음 — 정규화
  const isKorea = ['kr', 'korea', 'south korea', '한국', '대한민국', 'republic of korea']
    .includes(String(hotel.country || '').trim().toLowerCase());
  const billToCountry = isKorea ? 'KR' : 'NON_KR';

  // ───────────────────────────────────────────────
  // 4) 통화·세금·결제수단 분기 (playbook 2.2)
  // ───────────────────────────────────────────────
  const currency = isKorea ? 'KRW' : 'USD';
  const taxMode = isKorea ? 'vat_10_included' : 'zero_rated';
  const taxLabel = isKorea ? null : 'Zero-rated export of services';
  const track = isKorea ? 'INV-KR' : 'INV-INT';

  // 결제수단 — body.payment_method 우선, 없으면 기본값
  let paymentMethod = body.payment_method;
  if (!paymentMethod) {
    if (isKorea) {
      paymentMethod = 'bank_transfer_krw';
    } else {
      // 해외 매니저는 PayPal 기본 (정책 — PayPal이 1차)
      paymentMethod = 'paypal';
    }
  }
  // 검증 — 한국 매니저에게 PayPal 차단 (시스템 단 차단)
  if (isKorea && paymentMethod === 'paypal') {
    return res.status(400).json({
      error: 'paypal_blocked_for_kr',
      hint: '한국 매니저에게 PayPal 인보이스 발행 불가 (정책 2.2 시스템 단 차단)'
    });
  }
  if (!isKorea && paymentMethod === 'bank_transfer_krw') {
    return res.status(400).json({
      error: 'krw_bank_blocked_for_intl',
      hint: '해외 매니저에게 KRW 국내 계좌 박을 수 없음'
    });
  }

  // ───────────────────────────────────────────────
  // 5) 환율 처리 (한국 매니저에게 USD 상품)
  // ───────────────────────────────────────────────
  // payment.currency = 결제 원본 통화 (USD)
  // currency = 인보이스 표기 통화 (KRW)
  // 통화 다르면 환율 적용
  let amountSubtotal, amountTax, amountTotal;
  let fxSnapshotId = null, fxRate = null, fxBaseAmount = null, fxBaseCurrency = null, fxDisplayNote = null;

  if (currency === payment.currency) {
    // 환율 변환 불필요
    amountTotal = parseFloat(payment.amount);
  } else if (currency === 'KRW' && payment.currency === 'USD') {
    // 한국 매니저 + USD 상품 → 환율 hit
    const fx = await getFxRate(SUPABASE_URL, serviceKey, 'USD');
    fxSnapshotId = fx.snapshot_id;
    fxRate = fx.rate;
    fxBaseAmount = parseFloat(payment.amount);
    fxBaseCurrency = 'USD';
    amountTotal = Math.round(fxBaseAmount * fxRate);    // KRW는 원 단위 반올림
    fxDisplayNote = fx.display_note_template(fxBaseAmount);
  } else {
    return res.status(400).json({
      error: 'unsupported_currency_conversion',
      hint: `${payment.currency} → ${currency} 변환 정의 안 됨`,
      payment_currency: payment.currency,
      target_currency: currency
    });
  }

  // 세금 계산
  if (taxMode === 'vat_10_included') {
    // 한국 — 부가세 10% 포함된 총액 → 분리
    amountSubtotal = Math.round(amountTotal / 1.1);
    amountTax = amountTotal - amountSubtotal;
  } else {
    // 해외 — 영세율
    amountSubtotal = amountTotal;
    amountTax = 0;
  }

  // ───────────────────────────────────────────────
  // 6) 한국 영수증 종류 (한국 매니저만)
  // ───────────────────────────────────────────────
  let krReceiptType = null, krReceiptMeta = null;
  if (isKorea) {
    krReceiptType = body.kr_receipt_type || 'tax_invoice';
    if (!['tax_invoice', 'cash_receipt_business', 'cash_receipt_personal'].includes(krReceiptType)) {
      return res.status(400).json({
        error: 'invalid_kr_receipt_type',
        received: krReceiptType,
        allowed: ['tax_invoice', 'cash_receipt_business', 'cash_receipt_personal']
      });
    }
    krReceiptMeta = body.kr_receipt_meta || {};
  }

  // ───────────────────────────────────────────────
  // 7) 채번 (next_invoice_number RPC)
  // ───────────────────────────────────────────────
  const numResp = await fetch(SUPABASE_URL + '/rest/v1/rpc/next_invoice_number', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_track: track })
  });
  if (!numResp.ok) {
    const text = await numResp.text();
    return res.status(500).json({ error: 'channum_failed', detail: text });
  }
  const invoiceNumber = await numResp.json();
  if (!invoiceNumber || typeof invoiceNumber !== 'string') {
    return res.status(500).json({ error: 'channum_invalid_response', got: invoiceNumber });
  }

  // ───────────────────────────────────────────────
  // 8) 기한 계산 (발행일 + 2영업일, KST 23:59:59)
  // ───────────────────────────────────────────────
  const issuedAt = new Date();
  const dueAt = addBusinessDays(issuedAt, BUSINESS_DAYS_DEFAULT);

  // ───────────────────────────────────────────────
  // 9) Bill To 정보 (인보이스 발행 시점 snapshot)
  // ───────────────────────────────────────────────
  const billToName = body.bill_to_name || hotel.contact_name || hotel.hotel_name;
  const billToEmail = body.bill_to_email || hotel.contact_email;
  const billToBusinessNo = body.bill_to_business_no || (krReceiptMeta && krReceiptMeta.business_number) || null;
  const billToAddress = body.bill_to_address || hotel.address || null;

  // ───────────────────────────────────────────────
  // 10) INSERT invoices
  // ───────────────────────────────────────────────
  const insertPayload = {
    invoice_number: invoiceNumber,
    track,
    document_type: 'invoice',
    payment_id: paymentId,
    hotel_id: hotel.id,
    user_id: payment.user_id || hotel.user_id,
    bill_to_country: billToCountry,
    bill_to_name: billToName,
    bill_to_email: billToEmail,
    bill_to_business_no: billToBusinessNo,
    bill_to_address: billToAddress,
    currency,
    amount_subtotal: amountSubtotal,
    amount_tax: amountTax,
    amount_total: amountTotal,
    tax_mode: taxMode,
    tax_label: taxLabel,
    fx_snapshot_id: fxSnapshotId,
    fx_rate: fxRate,
    fx_base_amount: fxBaseAmount,
    fx_base_currency: fxBaseCurrency,
    fx_display_note: fxDisplayNote,
    kr_receipt_type: krReceiptType,
    kr_receipt_meta: krReceiptMeta,
    status: 'pending',
    payment_method: paymentMethod,
    issued_at: issuedAt.toISOString(),
    due_at: dueAt.toISOString(),
    issued_by: admin.userId || null,
    issued_by_email: admin.email,
    metadata: {
      hotel_name: hotel.hotel_name,
      hotel_country_raw: hotel.country,
      payment_method_default_reason: body.payment_method ? 'explicit' : 'system_default',
      api_version: '1.0'
    }
  };

  const insertResp = await fetch(SUPABASE_URL + '/rest/v1/invoices', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(insertPayload)
  });
  if (!insertResp.ok) {
    const text = await insertResp.text();
    return res.status(500).json({ error: 'insert_failed', detail: text });
  }
  const insertedRows = await insertResp.json();
  const invoice = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

  // ───────────────────────────────────────────────
  // 11) payments.invoice_number 동기화
  // ───────────────────────────────────────────────
  try {
    await fetch(SUPABASE_URL + '/rest/v1/payments?id=eq.' + paymentId, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice_number: invoiceNumber,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('[invoice/issue] payments.invoice_number sync 실패 (인보이스 발행은 성공):', e.message);
  }

  return res.status(200).json({
    success: true,
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      track,
      status: 'pending',
      document_type: 'invoice',
      currency,
      amount_subtotal: amountSubtotal,
      amount_tax: amountTax,
      amount_total: amountTotal,
      tax_mode: taxMode,
      issued_at: invoice.issued_at,
      due_at: invoice.due_at,
      bill_to_country: billToCountry,
      bill_to_name: billToName,
      payment_method: paymentMethod,
      fx_display_note: fxDisplayNote
    },
    branch: {
      country: billToCountry,
      currency,
      tax_mode: taxMode,
      track,
      fx_applied: fxSnapshotId !== null
    },
    next_step: 'PDF 생성: GET /api/invoice?action=pdf&id=' + invoice.id + ' (단계 5에서 박힘)'
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 단계 5+ — pdf / get / void / list (placeholder, 다음 단계에서 박힘)
// ────────────────────────────────────────────────────────────────────────────
async function handleNotYetImplemented(action) {
  return { error: 'not_implemented_yet', action, hint: '단계 5+에서 박힘' };
}

// ────────────────────────────────────────────────────────────────────────────
// main router
// ────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = String(req.query.action || '').trim();
  if (!action) {
    return res.status(400).json({
      error: 'missing_action',
      allowed: ALLOWED_ACTIONS,
      hint: 'GET /api/invoice?action=<one_of_allowed>'
    });
  }
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({
      error: 'unknown_action',
      received: action,
      allowed: ALLOWED_ACTIONS
    });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'server_misconfigured', hint: 'SUPABASE_SERVICE_ROLE_KEY missing' });
  }

  // 인증 — 모든 액션에 적용 (단계 5에서 매니저 본인 액션은 별도 검사)
  const adminCheck = await requireAdmin(req, serviceKey);
  if (!adminCheck.ok) {
    return res.status(adminCheck.status || 401).json({ error: adminCheck.error });
  }

  try {
    switch (action) {
      case 'issue':
        return await handleIssue(req, res, serviceKey, adminCheck);
      case 'pdf':
      case 'get':
      case 'void':
      case 'list':
        return res.status(501).json(await handleNotYetImplemented(action));
      default:
        return res.status(400).json({ error: 'unhandled_action', action });
    }
  } catch (e) {
    console.error('[invoice] handler error:', e);
    return res.status(500).json({ error: 'internal_error', message: e.message });
  }
}
