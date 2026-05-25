// /api/invoice.js
// ════════════════════════════════════════════════════════════════════════════
// 인보이스 라우터 (BL-INVOICE-001 단계 4~10)
// ════════════════════════════════════════════════════════════════════════════
// action 분기 (admin.js와 동일 패턴 — 통합 라우터로 Vercel 함수 절약):
//
//   POST ?action=issue        → 인보이스 발행 (owner only)               — 단계 4
//   GET  ?action=pdf&id=xxx   → PDF 생성/다운로드 (admin + 본인)          — 단계 5
//   GET  ?action=get&id=xxx   → 인보이스 메타 조회 (admin + 본인)         — 단계 5
//   GET  ?action=list&...     → 인보이스 리스트 (admin only, 페이지네이션) — 단계 6
//   POST ?action=void         → 인보이스 취소 + CN 자동 발행 (owner only)  — 단계 6
//   GET  ?action=my-pending   → 매니저 본인 pending 인보이스 조회           — 단계 9
//   GET  ?action=my-list      → 매니저 본인 인보이스 전체 리스트 (status 필터) — 단계 10
//
// 인증:
//   - owner-only 액션 (issue, void): requireAdmin → admin.role === 'owner'
//   - admin-only 액션 (list): owner/admin/staff
//   - 매니저 본인 액션 (pdf, get, my-pending, my-list): requireAuthed → user_id 매칭
// ════════════════════════════════════════════════════════════════════════════

import { getFxRate } from './_lib/fx.js';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import InvoicePdf from '../components/invoice/InvoicePdf.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';

const ALLOWED_ACTIONS = ['issue', 'pdf', 'get', 'void', 'list', 'my-pending', 'my-list'];

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
// 매니저 본인 인증 헬퍼 (admin 아님 — 단계 9 my-pending용)
// ────────────────────────────────────────────────────────────────────────────
async function requireAuthed(req, serviceKey) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const callerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!callerToken) return { ok: false, status: 401, error: 'missing_bearer' };

  const meResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + callerToken, 'apikey': serviceKey }
  });
  if (!meResp.ok) return { ok: false, status: 401, error: 'invalid_token' };
  const me = await meResp.json();
  if (!me.id || !me.email) return { ok: false, status: 401, error: 'no_user' };

  return { ok: true, email: me.email, userId: me.id };
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
// 단계 5 — handleGet (인보이스 메타 조회, 라이브 미리보기용)
// ────────────────────────────────────────────────────────────────────────────
// 입력: ?id=<invoice_uuid> 또는 ?invoice_number=<INV-XX-YYYY-NNNN>
// 권한: admin (owner/admin/staff) 전부 + 매니저 본인 (invoices.user_id === auth.uid())
// 반환: invoice 한 행 + 부가 정보 (company_info, payment_accounts 일부, signed PDF URL)
// ────────────────────────────────────────────────────────────────────────────
async function handleGet(req, res, serviceKey, admin) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', hint: 'GET only' });
  }

  const id = String(req.query.id || '').trim();
  const invoiceNumber = String(req.query.invoice_number || '').trim();
  if (!id && !invoiceNumber) {
    return res.status(400).json({ error: 'missing_id_or_invoice_number' });
  }

  // 1) 인보이스 fetch
  const filter = id
    ? 'id=eq.' + encodeURIComponent(id)
    : 'invoice_number=eq.' + encodeURIComponent(invoiceNumber);
  const invResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?' + filter + '&select=*',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!invResp.ok) {
    return res.status(500).json({ error: 'fetch_invoice_failed', detail: await invResp.text() });
  }
  const invoices = await invResp.json();
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(404).json({ error: 'invoice_not_found' });
  }
  const invoice = invoices[0];

  // 2) 권한 분기 — admin 전부 OK / 본인이면 OK
  const isAdmin = ['owner', 'admin', 'staff'].includes(admin.role);
  const isOwnerOfInvoice = invoice.user_id && admin.userId && invoice.user_id === admin.userId;
  if (!isAdmin && !isOwnerOfInvoice) {
    return res.status(403).json({ error: 'forbidden', hint: '본인 인보이스 또는 관리자만 조회 가능' });
  }

  // 3) signed PDF URL (1h) — pdf_storage_path 있을 때만
  let signedPdfUrl = null;
  if (invoice.pdf_storage_path) {
    const sigResp = await fetch(
      SUPABASE_URL + '/storage/v1/object/sign/invoices/' + invoice.pdf_storage_path,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresIn: 3600 })
      }
    );
    if (sigResp.ok) {
      const sig = await sigResp.json();
      if (sig.signedURL) {
        signedPdfUrl = SUPABASE_URL + '/storage/v1' + sig.signedURL;
      }
    }
  }

  return res.status(200).json({
    success: true,
    invoice,
    signed_pdf_url: signedPdfUrl,
    pdf_available: !!signedPdfUrl,
    next_step: signedPdfUrl
      ? 'PDF 다운로드 가능'
      : 'PDF 미발행 상태 — GET /api/invoice?action=pdf&id=' + invoice.id + ' 호출하여 생성'
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 단계 5 — handlePdf (PDF 생성 + Storage 저장 + signed URL 반환)
// ────────────────────────────────────────────────────────────────────────────
// 입력: ?id=<invoice_uuid> [&regenerate=true] [&lang=ko|en]
// 권한: admin 전부 + 매니저 본인
// 동작:
//   1) invoice + company_info + payment_accounts fetch
//   2) 도장·서명 storage path → signed URL → base64 data URL (PDF embed용)
//   3) React PDF stream → Buffer 변환
//   4) Supabase Storage 'invoices' 버킷에 'YYYY/INV-XX-YYYY-NNNN.pdf' 업로드
//   5) invoices.pdf_storage_path 갱신
//   6) signed URL (1h) 반환
//
// regenerate=true 가 아니면 기존 PDF가 있을 때 재생성 안 함 (기존 signed URL만 반환).
// ────────────────────────────────────────────────────────────────────────────
async function handlePdf(req, res, serviceKey, admin) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', hint: 'GET only' });
  }

  const id = String(req.query.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'missing_id', hint: '?id=<invoice_uuid>' });
  }
  const regenerate = String(req.query.regenerate || '').toLowerCase() === 'true';
  const langHint = String(req.query.lang || '').toLowerCase();
  const lang = (langHint === 'ko' || langHint === 'en') ? langHint : null;

  // ───────────────────────────────────────────────
  // 1) invoice fetch + 권한 검사
  // ───────────────────────────────────────────────
  const invResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?id=eq.' + encodeURIComponent(id) + '&select=*',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!invResp.ok) {
    return res.status(500).json({ error: 'fetch_invoice_failed', detail: await invResp.text() });
  }
  const invoices = await invResp.json();
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(404).json({ error: 'invoice_not_found', id });
  }
  const invoice = invoices[0];

  const isAdmin = ['owner', 'admin', 'staff'].includes(admin.role);
  const isOwnerOfInvoice = invoice.user_id && admin.userId && invoice.user_id === admin.userId;
  if (!isAdmin && !isOwnerOfInvoice) {
    return res.status(403).json({ error: 'forbidden' });
  }

  // ───────────────────────────────────────────────
  // 2) 기존 PDF 있으면 (regenerate=false) 그대로 반환
  // ───────────────────────────────────────────────
  if (invoice.pdf_storage_path && !regenerate) {
    const signedUrl = await createSignedUrl(serviceKey, invoice.pdf_storage_path, 3600);
    if (signedUrl) {
      return res.status(200).json({
        success: true,
        cached: true,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        pdf_storage_path: invoice.pdf_storage_path,
        signed_url: signedUrl,
        expires_in: 3600,
        hint: '재생성하려면 &regenerate=true 추가'
      });
    }
    // signed URL 발급 실패 시 → 재생성 fallback (아래로 떨어짐)
  }

  // ───────────────────────────────────────────────
  // 3) company_info + payment_accounts fetch
  // ───────────────────────────────────────────────
  const ciResp = await fetch(
    SUPABASE_URL + '/rest/v1/company_info?id=eq.1&select=*',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!ciResp.ok) {
    return res.status(500).json({ error: 'fetch_company_info_failed', detail: await ciResp.text() });
  }
  const cis = await ciResp.json();
  const companyInfo = (Array.isArray(cis) && cis.length > 0) ? cis[0] : {
    legal_entity_en: 'TravelWinners Inc.',
    legal_entity_ko: '주식회사 여행능력자들',
    ceo_name_en: 'lee ji hyeong',
    ceo_name_ko: '이지형',
    business_number: '',
    address_en: '',
    address_ko: '',
    business_type: '서비스',
    business_item: '여행, 광고',
    contact_email: 'partners@gohotelwinners.com',
  };

  const paResp = await fetch(
    SUPABASE_URL + '/rest/v1/payment_accounts?select=*&is_active=eq.true',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  const paymentAccounts = paResp.ok ? await paResp.json() : [];

  // ───────────────────────────────────────────────
  // 4) 도장·서명 fetch → data URL 변환
  //    invoice-assets 버킷에서 signed URL 발급 → fetch → base64
  // ───────────────────────────────────────────────
  let stampDataUrl = null;
  let signatureDataUrl = null;
  if (companyInfo.stamp_storage_path) {
    stampDataUrl = await fetchAssetAsDataUrl(serviceKey, 'invoice-assets', companyInfo.stamp_storage_path);
  }
  if (companyInfo.signature_storage_path) {
    signatureDataUrl = await fetchAssetAsDataUrl(serviceKey, 'invoice-assets', companyInfo.signature_storage_path);
  }

  // ───────────────────────────────────────────────
  // 5) React PDF stream → Buffer
  // ───────────────────────────────────────────────
  let pdfBuffer;
  try {
    const element = React.createElement(InvoicePdf, {
      invoice,
      companyInfo,
      paymentAccounts,
      stampDataUrl,
      signatureDataUrl,
      lang,
    });
    const stream = await renderToStream(element);
    pdfBuffer = await streamToBuffer(stream);
  } catch (e) {
    console.error('[invoice/pdf] PDF render failed:', e);
    return res.status(500).json({
      error: 'pdf_render_failed',
      message: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    return res.status(500).json({ error: 'pdf_empty' });
  }

  // ───────────────────────────────────────────────
  // 6) Supabase Storage 'invoices' 버킷 업로드
  //    경로: YYYY/INV-XX-YYYY-NNNN.pdf
  // ───────────────────────────────────────────────
  const issuedAt = invoice.issued_at ? new Date(invoice.issued_at) : new Date();
  const year = issuedAt.getUTCFullYear();
  const storagePath = `${year}/${invoice.invoice_number}.pdf`;

  const uploadResp = await fetch(
    SUPABASE_URL + '/storage/v1/object/invoices/' + storagePath,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true'   // 재생성 시 덮어쓰기
      },
      body: pdfBuffer
    }
  );
  if (!uploadResp.ok) {
    const text = await uploadResp.text();
    return res.status(500).json({
      error: 'storage_upload_failed',
      detail: text,
      hint: 'invoices 버킷이 존재하는지 확인 (sql/bl-invoice-001-storage-bucket.sql 실행)'
    });
  }

  // ───────────────────────────────────────────────
  // 7) invoices.pdf_storage_path 갱신
  // ───────────────────────────────────────────────
  try {
    await fetch(SUPABASE_URL + '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoice.id), {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pdf_storage_path: storagePath,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('[invoice/pdf] pdf_storage_path 갱신 실패 (업로드는 성공):', e.message);
  }

  // ───────────────────────────────────────────────
  // 8) signed URL (1h)
  // ───────────────────────────────────────────────
  const signedUrl = await createSignedUrl(serviceKey, storagePath, 3600);

  return res.status(200).json({
    success: true,
    cached: false,
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    pdf_storage_path: storagePath,
    signed_url: signedUrl,
    expires_in: 3600,
    bytes: pdfBuffer.length,
    lang_used: lang || (invoice.bill_to_country === 'KR' ? 'ko' : 'en'),
    branch: {
      country: invoice.bill_to_country,
      currency: invoice.currency,
      tax_mode: invoice.tax_mode,
      status: invoice.status,
      paid_watermark: invoice.status === 'paid'
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 헬퍼 — Storage signed URL 발급
// ────────────────────────────────────────────────────────────────────────────
async function createSignedUrl(serviceKey, storagePath, expiresIn) {
  const resp = await fetch(
    SUPABASE_URL + '/storage/v1/object/sign/invoices/' + storagePath,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn })
    }
  );
  if (!resp.ok) {
    console.warn('[invoice] createSignedUrl failed:', await resp.text());
    return null;
  }
  const data = await resp.json();
  if (!data.signedURL) return null;
  return SUPABASE_URL + '/storage/v1' + data.signedURL;
}

// ────────────────────────────────────────────────────────────────────────────
// 헬퍼 — 도장·서명 자산을 data URL로 fetch
// ────────────────────────────────────────────────────────────────────────────
async function fetchAssetAsDataUrl(serviceKey, bucket, path) {
  try {
    const resp = await fetch(
      SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path,
      { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
    );
    if (!resp.ok) {
      console.warn(`[invoice] fetch asset failed ${bucket}/${path}:`, resp.status);
      return null;
    }
    const arrayBuffer = await resp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    // MIME 추정
    const ext = path.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png'
               : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
               : ext === 'webp' ? 'image/webp'
               : 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.warn('[invoice] fetchAssetAsDataUrl error:', e.message);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 헬퍼 — Node stream → Buffer
// ────────────────────────────────────────────────────────────────────────────
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 단계 6 — handleList (인보이스 리스트 페이지네이션, admin 전용)
// ────────────────────────────────────────────────────────────────────────────
// 입력 (GET):
//   ?status=pending|paid|void|expired|all (default: all)
//   ?track=INV-KR|INV-INT|all              (default: all)
//   ?q=<text>                              (invoice_number / bill_to_name / bill_to_email substring)
//   ?limit=20  (1~100, default 20)
//   ?offset=0
//   ?order=issued_at.desc | issued_at.asc | amount_total.desc | amount_total.asc (default issued_at.desc)
// 권한: admin (owner/admin/staff) — 매니저 본인 리스트는 별도 BL에서 박음
// 반환: { items: [...], total, limit, offset, has_more, next_offset }
// ────────────────────────────────────────────────────────────────────────────
async function handleList(req, res, serviceKey, admin) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', hint: 'GET only' });
  }
  if (!['owner', 'admin', 'staff'].includes(admin.role)) {
    return res.status(403).json({ error: 'admin_only', current_role: admin.role });
  }

  // ─ 파라미터 정규화
  const status = String(req.query.status || 'all').trim().toLowerCase();
  const track = String(req.query.track || 'all').trim();
  const q = String(req.query.q || '').trim();
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  if (limit > 100) limit = 100;
  let offset = parseInt(req.query.offset, 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  const VALID_STATUS = ['pending', 'paid', 'void', 'expired'];
  const VALID_TRACK = ['INV-KR', 'INV-INT'];
  const VALID_ORDER = ['issued_at.desc', 'issued_at.asc', 'amount_total.desc', 'amount_total.asc'];
  const order = VALID_ORDER.includes(req.query.order) ? req.query.order : 'issued_at.desc';

  // ─ Supabase PostgREST query 조립
  const filters = [];
  if (status !== 'all' && VALID_STATUS.includes(status)) {
    filters.push('status=eq.' + encodeURIComponent(status));
  }
  if (track !== 'all' && VALID_TRACK.includes(track)) {
    filters.push('track=eq.' + encodeURIComponent(track));
  }
  if (q) {
    // invoice_number ILIKE  OR  bill_to_name ILIKE  OR  bill_to_email ILIKE
    const esc = q.replace(/[%_]/g, '\\$&');
    filters.push('or=(invoice_number.ilike.*' + encodeURIComponent(esc)
              + '*,bill_to_name.ilike.*' + encodeURIComponent(esc)
              + '*,bill_to_email.ilike.*' + encodeURIComponent(esc) + '*)');
  }

  const selectCols = [
    'id', 'invoice_number', 'track', 'document_type', 'status',
    'payment_id', 'hotel_id', 'user_id',
    'bill_to_country', 'bill_to_name', 'bill_to_email',
    'currency', 'amount_total', 'tax_mode',
    'payment_method', 'issued_at', 'due_at', 'paid_at', 'voided_at',
    'pdf_storage_path', 'issued_by_email'
  ].join(',');
  filters.push('select=' + selectCols);
  filters.push('order=' + order);

  const url = SUPABASE_URL + '/rest/v1/invoices?' + filters.join('&');

  const listResp = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Range-Unit': 'items',
      'Range': offset + '-' + (offset + limit - 1),
      'Prefer': 'count=exact'
    }
  });

  if (!listResp.ok) {
    return res.status(500).json({
      error: 'fetch_list_failed',
      detail: await listResp.text()
    });
  }

  const items = await listResp.json();

  // Content-Range 헤더로 total 추출 (예: "0-19/137")
  let total = null;
  const contentRange = listResp.headers.get('content-range') || '';
  const m = contentRange.match(/\/(\d+|\*)$/);
  if (m && m[1] !== '*') total = parseInt(m[1], 10);

  const hasMore = total !== null
    ? (offset + items.length) < total
    : items.length === limit;

  return res.status(200).json({
    success: true,
    items: Array.isArray(items) ? items : [],
    total,
    limit,
    offset,
    has_more: hasMore,
    next_offset: hasMore ? offset + items.length : null,
    filter: { status, track, q, order }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 단계 6 — handleVoid (인보이스 취소 + Credit Note 자동 발행)
// ────────────────────────────────────────────────────────────────────────────
// 입력 (POST):
//   { invoice_id: UUID, reason: TEXT(required, >=5자), reason_category?: TEXT }
//   reason_category: 'duplicate' | 'customer_request' | 'cancellation' | 'other'  (default 'other')
//
// 권한: owner only (정책 2.11)
//
// 동작 (정책 2.9 — 부분 환불 없음, 전체 취소만):
//   1) invoice fetch & 검증 (이미 void이면 409)
//   2) credit note 채번 (CN-KR / CN-INT)
//   3) credit_notes INSERT (전액 환불, 양수 저장)
//   4) invoices SET status='void', voided_at=now, void_reason=reason
//   5) payments.invoice_number 정리 (선택 — invoice는 남기되 status void 표시는 invoices에)
//   6) (옵션) credit note PDF 생성은 별도 BL — 여기선 메타만 박음
// ────────────────────────────────────────────────────────────────────────────
async function handleVoid(req, res, serviceKey, admin) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', hint: 'POST only' });
  }
  if (admin.role !== 'owner') {
    return res.status(403).json({
      error: 'owner_only',
      hint: '인보이스 취소는 owner 권한만 가능 (정책 2.11)',
      current_role: admin.role
    });
  }

  const body = req.body || {};
  const invoiceId = String(body.invoice_id || '').trim();
  const reason = String(body.reason || '').trim();
  const reasonCategory = ['duplicate', 'customer_request', 'cancellation', 'other']
    .includes(body.reason_category) ? body.reason_category : 'other';

  if (!invoiceId) {
    return res.status(400).json({ error: 'missing_invoice_id' });
  }
  if (!reason || reason.length < 5) {
    return res.status(400).json({
      error: 'reason_too_short',
      hint: '환불 사유는 5자 이상 입력 필수 (정책 2.9)'
    });
  }

  // 1) invoice fetch
  const invResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoiceId) + '&select=*',
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!invResp.ok) {
    return res.status(500).json({ error: 'fetch_invoice_failed', detail: await invResp.text() });
  }
  const invoices = await invResp.json();
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(404).json({ error: 'invoice_not_found', invoice_id: invoiceId });
  }
  const invoice = invoices[0];

  if (invoice.status === 'void') {
    return res.status(409).json({
      error: 'already_voided',
      hint: '이미 취소된 인보이스입니다',
      invoice_number: invoice.invoice_number,
      voided_at: invoice.voided_at
    });
  }

  // 2) credit note 채번
  const cnTrack = invoice.track === 'INV-KR' ? 'CN-KR' : 'CN-INT';
  const numResp = await fetch(SUPABASE_URL + '/rest/v1/rpc/next_invoice_number', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_track: cnTrack })
  });
  if (!numResp.ok) {
    return res.status(500).json({
      error: 'cn_channum_failed',
      detail: await numResp.text()
    });
  }
  const cnNumber = await numResp.json();
  if (!cnNumber || typeof cnNumber !== 'string') {
    return res.status(500).json({ error: 'cn_channum_invalid', got: cnNumber });
  }

  // 3) credit_notes INSERT (전액 환불, 항상 양수)
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
    reason,
    reason_category: reasonCategory,
    issued_at: new Date().toISOString(),
    issued_by: admin.userId || null,
    issued_by_email: admin.email,
    metadata: {
      voided_by_action: 'invoice_void',
      voided_at_iso: new Date().toISOString(),
      api_version: '1.0'
    }
  };

  const cnInsertResp = await fetch(SUPABASE_URL + '/rest/v1/credit_notes', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(cnPayload)
  });
  if (!cnInsertResp.ok) {
    const text = await cnInsertResp.text();
    return res.status(500).json({
      error: 'cn_insert_failed',
      detail: text,
      hint: 'credit_notes 테이블 스키마 확인 (bl-invoice-001-schema.sql)'
    });
  }
  const cnRows = await cnInsertResp.json();
  const creditNote = Array.isArray(cnRows) ? cnRows[0] : cnRows;

  // 4) invoices.status='void' 갱신
  const nowIso = new Date().toISOString();
  const updResp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?id=eq.' + encodeURIComponent(invoiceId),
    {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        status: 'void',
        voided_at: nowIso,
        void_reason: reason,
        updated_at: nowIso
      })
    }
  );
  if (!updResp.ok) {
    // CN은 박혔는데 invoice 상태 안 바뀜 — 운영자가 수동 처리 필요
    return res.status(500).json({
      error: 'invoice_void_update_failed',
      detail: await updResp.text(),
      cn_created: creditNote,
      hint: 'Credit Note는 발행되었으나 invoice status 갱신 실패 — 수동 PATCH 필요'
    });
  }
  const updRows = await updResp.json();
  const voidedInvoice = Array.isArray(updRows) ? updRows[0] : updRows;

  return res.status(200).json({
    success: true,
    invoice: {
      id: voidedInvoice.id,
      invoice_number: voidedInvoice.invoice_number,
      status: voidedInvoice.status,
      voided_at: voidedInvoice.voided_at,
      void_reason: voidedInvoice.void_reason
    },
    credit_note: {
      id: creditNote.id,
      cn_number: creditNote.cn_number,
      track: creditNote.track,
      amount_total: creditNote.amount_total,
      currency: creditNote.currency,
      reason: creditNote.reason,
      reason_category: creditNote.reason_category
    },
    next_step: 'Credit Note PDF 생성은 별도 BL — 메타만 박힘 (admin-invoices에서 확인 가능)'
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 단계 9 — handleMyPending (매니저 본인 pending 인보이스 조회)
// ────────────────────────────────────────────────────────────────────────────
// 입력 (GET):
//   ?hotel_id=UUID  (선택 — 박으면 해당 호텔만, 비우면 user의 전체 pending)
// 권한: 매니저 본인 (requireAuthed)
// 반환:
//   200 OK {
//     has_pending: true|false,
//     count: N,
//     pending: [{ id, invoice_number, track, currency, amount_total, issued_at, due_at, hotel_id, hotel_name }, ...]
//   }
//
// 용도: sales.html 결제 버튼 클릭 시 이중 발행 차단 (정책 2.8 마지막 단락).
// 차단 모달에서 [기존 인보이스 보기] [취소 요청] 버튼 노출.
// ────────────────────────────────────────────────────────────────────────────
async function handleMyPending(req, res, serviceKey, authed) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', hint: 'GET only' });
  }

  const hotelId = String(req.query.hotel_id || '').trim();
  const filters = ['user_id=eq.' + encodeURIComponent(authed.userId)];
  filters.push('status=eq.pending');
  if (hotelId) {
    filters.push('hotel_id=eq.' + encodeURIComponent(hotelId));
  }
  filters.push('select=id,invoice_number,track,currency,amount_total,issued_at,due_at,hotel_id,bill_to_name,payment_method,pdf_storage_path');
  filters.push('order=issued_at.desc');
  filters.push('limit=10');

  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/invoices?' + filters.join('&'),
    { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
  );
  if (!resp.ok) {
    return res.status(500).json({ error: 'fetch_failed', detail: await resp.text() });
  }
  const rows = await resp.json();
  const items = Array.isArray(rows) ? rows : [];

  // hotel_name 한번에 채우기 (1~10개 정도라 N+1 무시 가능)
  if (items.length > 0) {
    const hotelIds = [...new Set(items.map(i => i.hotel_id).filter(Boolean))];
    if (hotelIds.length > 0) {
      const hotelResp = await fetch(
        SUPABASE_URL + '/rest/v1/hotels?id=in.(' + hotelIds.map(encodeURIComponent).join(',') + ')&select=id,hotel_name,country',
        { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
      );
      const hotels = await hotelResp.json();
      const hmap = {};
      (Array.isArray(hotels) ? hotels : []).forEach(h => { hmap[h.id] = h; });
      items.forEach(it => {
        const h = hmap[it.hotel_id];
        if (h) {
          it.hotel_name = h.hotel_name;
          it.hotel_country = h.country;
        }
      });
    }
  }

  return res.status(200).json({
    ok: true,
    has_pending: items.length > 0,
    count: items.length,
    pending: items,
    user_email: authed.email
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 단계 10 — handleMyList (매니저 본인 인보이스 전체 리스트, status 필터)
// ────────────────────────────────────────────────────────────────────────────
// 입력 (GET):
//   ?status=all|pending|paid|void|expired   (default: all)
//   ?hotel_id=UUID                           (선택)
//   ?limit=20 (1~100, default 20)
//   ?offset=0
// 권한: 매니저 본인 (requireAuthed)
// 반환:
//   200 OK { ok, items: [...], total, limit, offset, has_more }
//
// 용도: manager-dashboard '서류' 탭 — 본인 인보이스/영수증/CN 전체 목록 + 1클릭 PDF.
// ────────────────────────────────────────────────────────────────────────────
async function handleMyList(req, res, serviceKey, authed) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', hint: 'GET only' });
  }

  // 파라미터 정규화
  const VALID_STATUS = ['pending', 'paid', 'void', 'expired'];
  const status = String(req.query.status || 'all').trim().toLowerCase();
  const hotelId = String(req.query.hotel_id || '').trim();
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  if (limit > 100) limit = 100;
  let offset = parseInt(req.query.offset, 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  const filters = ['user_id=eq.' + encodeURIComponent(authed.userId)];
  if (status !== 'all' && VALID_STATUS.includes(status)) {
    filters.push('status=eq.' + encodeURIComponent(status));
  }
  if (hotelId) {
    filters.push('hotel_id=eq.' + encodeURIComponent(hotelId));
  }
  filters.push('select=id,invoice_number,track,document_type,status,currency,amount_total,amount_subtotal,amount_tax,tax_mode,payment_method,issued_at,due_at,paid_at,voided_at,hotel_id,bill_to_name,bill_to_country,pdf_storage_path');
  filters.push('order=issued_at.desc');

  const url = SUPABASE_URL + '/rest/v1/invoices?' + filters.join('&');
  const resp = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Range-Unit': 'items',
      'Range': offset + '-' + (offset + limit - 1),
      'Prefer': 'count=exact'
    }
  });
  if (!resp.ok) {
    return res.status(500).json({ error: 'fetch_failed', detail: await resp.text() });
  }
  const items = await resp.json();
  const arr = Array.isArray(items) ? items : [];

  // total 추출
  let total = null;
  const cr = resp.headers.get('content-range') || '';
  const m = cr.match(/\/(\d+|\*)$/);
  if (m && m[1] !== '*') total = parseInt(m[1], 10);

  // hotel_name 한 번에 채우기
  if (arr.length > 0) {
    const hotelIds = [...new Set(arr.map(i => i.hotel_id).filter(Boolean))];
    if (hotelIds.length > 0) {
      const hResp = await fetch(
        SUPABASE_URL + '/rest/v1/hotels?id=in.(' + hotelIds.map(encodeURIComponent).join(',') + ')&select=id,hotel_name,country',
        { headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey } }
      );
      const hotels = await hResp.json();
      const hmap = {};
      (Array.isArray(hotels) ? hotels : []).forEach(h => { hmap[h.id] = h; });
      arr.forEach(it => {
        const h = hmap[it.hotel_id];
        if (h) { it.hotel_name = h.hotel_name; }
      });
    }
  }

  const hasMore = total !== null ? (offset + arr.length) < total : arr.length === limit;
  return res.status(200).json({
    ok: true,
    items: arr,
    total,
    limit,
    offset,
    has_more: hasMore,
    filter: { status, hotel_id: hotelId || null }
  });
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

  // ─ 매니저 본인 액션 (my-pending, my-list)은 admin 인증 우회
  if (action === 'my-pending' || action === 'my-list') {
    const authed = await requireAuthed(req, serviceKey);
    if (!authed.ok) {
      return res.status(authed.status || 401).json({ error: authed.error });
    }
    try {
      if (action === 'my-pending') return await handleMyPending(req, res, serviceKey, authed);
      if (action === 'my-list')    return await handleMyList(req, res, serviceKey, authed);
    } catch (e) {
      console.error('[invoice/' + action + '] handler error:', e);
      return res.status(500).json({ error: 'internal_error', message: e.message });
    }
  }

  // ─ pdf/get은 admin 또는 매니저 본인 (단계 5 정책 정합성 — 단계 10 정정)
  //   admin이면 admin 객체 그대로, 아니면 매니저 본인 객체로 fallback
  //   handlePdf/handleGet 내부에서 invoice.user_id === caller.userId 비교로 본인 검사
  if (action === 'pdf' || action === 'get') {
    let caller = await requireAdmin(req, serviceKey);
    if (!caller.ok) {
      // admin 아니면 매니저 본인 인증 시도
      const authed = await requireAuthed(req, serviceKey);
      if (!authed.ok) {
        return res.status(authed.status || 401).json({ error: authed.error });
      }
      // 매니저는 admin role 없음 — isAdmin=false로 동작
      caller = { ok: true, email: authed.email, userId: authed.userId, role: null };
    }
    try {
      if (action === 'pdf') return await handlePdf(req, res, serviceKey, caller);
      if (action === 'get') return await handleGet(req, res, serviceKey, caller);
    } catch (e) {
      console.error('[invoice/' + action + '] handler error:', e);
      return res.status(500).json({ error: 'internal_error', message: e.message });
    }
  }

  // 인증 — admin 액션 (issue, pdf, get, list, void)
  const adminCheck = await requireAdmin(req, serviceKey);
  if (!adminCheck.ok) {
    return res.status(adminCheck.status || 401).json({ error: adminCheck.error });
  }

  try {
    switch (action) {
      case 'issue':
        return await handleIssue(req, res, serviceKey, adminCheck);
      case 'pdf':
        return await handlePdf(req, res, serviceKey, adminCheck);
      case 'get':
        return await handleGet(req, res, serviceKey, adminCheck);
      case 'list':
        return await handleList(req, res, serviceKey, adminCheck);
      case 'void':
        return await handleVoid(req, res, serviceKey, adminCheck);
      default:
        return res.status(400).json({ error: 'unhandled_action', action });
    }
  } catch (e) {
    console.error('[invoice] handler error:', e);
    return res.status(500).json({ error: 'internal_error', message: e.message });
  }
}
