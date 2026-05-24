// ════════════════════════════════════════════════════════════════════════════
// components/invoice/InvoicePdf.js
// ════════════════════════════════════════════════════════════════════════════
// BL-INVOICE-001 단계 5 — @react-pdf/renderer 기반 인보이스 PDF 컴포넌트
//
// Vercel Serverless 호환을 위해 .jsx 대신 .js (React.createElement 기반).
// 대표님 지시: PDF 라이브러리는 @react-pdf/renderer 확정.
//
// 디자인 결정 (헌법 1조 자율):
//   - 색상: 다크 헤더(#0A1628) + 액센트(#00D4FF, Aurora 그라디언트 톤)
//   - 폰트: 영문 Helvetica(기본), 한글 NotoSansKR(remote URL CDN 등록)
//   - 레이아웃: A4 (595×842 pt), 24pt 여백
//   - 한국용: 상단 발행처 박스 + Bill To + VAT 3줄 분리 표기 + 한국 영수증 종류 라벨
//   - 해외용: "TAX INVOICE" 영문 단일, "Tax: $0.00 (Zero-rated export of services)"
//   - 우상단: 회사 로고 자리 + 발행처 정보
//   - 우하단: 도장·서명 (없으면 텍스트 fallback)
//   - status='paid'면 중앙 "PAID" 빨간 워터마크 (45도 회전)
//
// 입력 (모두 정규 객체, 사전 가공된 상태):
//   invoice         : invoices 테이블 한 행
//   companyInfo     : company_info 테이블 한 행
//   paymentAccounts : payment_accounts 3행 배열 (krw/usd/paypal)
//   stampDataUrl    : data:image/png;base64,... (signed URL → base64로 변환된 값) | null
//   signatureDataUrl: 위와 동일 | null
//   lang            : 'ko' | 'en' (한국용 기본 'ko', 해외용 강제 'en')
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

// ────────────────────────────────────────────────────────────────────────────
// 한글 폰트 등록 (한국용 인보이스에 필수)
// Google Fonts NotoSansKR — CDN 직접 hit (Vercel cold start 시 1회 fetch)
// ────────────────────────────────────────────────────────────────────────────
let _fontRegistered = false;
function ensureKoreanFont() {
  if (_fontRegistered) return;
  try {
    Font.register({
      family: 'NotoSansKR',
      fonts: [
        {
          src: 'https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.otf',
          fontWeight: 400,
        },
        {
          src: 'https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.otf',
          fontWeight: 700,
        },
      ],
    });
    _fontRegistered = true;
  } catch (e) {
    // 등록 실패 시 Helvetica fallback (영문은 정상, 한글은 ▢로 표시)
    console.warn('[InvoicePdf] Korean font registration failed:', e.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 다국어 라벨
// ────────────────────────────────────────────────────────────────────────────
const L = {
  ko: {
    invoice_title: '세금계산서',
    receipt_title: '영수증',
    cash_receipt_business: '현금영수증 (사업자지출증빙)',
    cash_receipt_personal: '현금영수증 (개인소득공제)',
    invoice_number: '계산서 번호',
    issued_at: '발행일',
    due_at: '지급기한',
    issuer: '공급자',
    bill_to: '공급받는자',
    business_no: '사업자등록번호',
    ceo: '대표자',
    address: '주소',
    business_type: '업태',
    business_item: '종목',
    contact: '연락처',
    description: '품목',
    subtotal: '공급가액',
    tax: '부가세 (10%)',
    total: '합계',
    payment_method: '결제수단',
    payment_info: '입금 정보',
    bank: '은행',
    account_no: '계좌번호',
    account_holder: '예금주',
    fx_note: '환율 적용 안내',
    notes_default: '본 계산서는 전자세금계산서로 발행되며, 별도의 종이 발급은 하지 않습니다.',
    paid: 'PAID',
    page: '페이지',
    item_default: '호텔 마케팅 서비스',
  },
  en: {
    invoice_title: 'TAX INVOICE',
    receipt_title: 'RECEIPT',
    invoice_number: 'Invoice No.',
    issued_at: 'Issue Date',
    due_at: 'Due Date',
    issuer: 'Issuer',
    bill_to: 'Bill To',
    business_no: 'Business Reg. No.',
    ceo: 'CEO',
    address: 'Address',
    contact: 'Contact',
    description: 'Description',
    subtotal: 'Subtotal',
    tax: 'Tax',
    tax_zero_rated_note: 'Zero-rated export of services',
    total: 'Total',
    payment_method: 'Payment Method',
    payment_info: 'Payment Information',
    bank: 'Bank',
    account_no: 'Account No.',
    swift: 'SWIFT',
    recipient: 'Recipient',
    paypal_email: 'PayPal Email',
    notes_default: 'Thank you for your business. Please complete payment by the due date.',
    paid: 'PAID',
    page: 'Page',
    item_default: 'Hotel Marketing Service',
  },
};

// ────────────────────────────────────────────────────────────────────────────
// 통화 포맷
// ────────────────────────────────────────────────────────────────────────────
function fmtMoney(amount, currency) {
  const n = Number(amount) || 0;
  if (currency === 'KRW') {
    return '₩' + Math.round(n).toLocaleString('ko-KR');
  }
  if (currency === 'USD') {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return currency + ' ' + n.toLocaleString();
}

function fmtDate(isoString, lang) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (lang === 'ko') return `${y}-${m}-${day}`;
  return `${y}-${m}-${day}`;
}

// ────────────────────────────────────────────────────────────────────────────
// 스타일
// ────────────────────────────────────────────────────────────────────────────
function makeStyles(lang) {
  const baseFont = lang === 'ko' ? 'NotoSansKR' : 'Helvetica';
  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 48,
      paddingHorizontal: 36,
      fontFamily: baseFont,
      fontSize: 9,
      color: '#0A1628',
      backgroundColor: '#FFFFFF',
      position: 'relative',
    },
    headerBar: {
      backgroundColor: '#0A1628',
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginBottom: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flexDirection: 'column',
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 2,
    },
    headerSubtitle: {
      color: '#00D4FF',
      fontSize: 8,
      marginTop: 3,
      letterSpacing: 1,
    },
    headerRight: {
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    headerCompanyName: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: 700,
    },
    headerCompanyLine: {
      color: '#B8C4D6',
      fontSize: 7,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12,
    },
    metaCol: {
      flex: 1,
      borderLeft: '3 solid #00D4FF',
      paddingLeft: 8,
    },
    metaLabel: {
      fontSize: 7,
      color: '#6B7B95',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 2,
    },
    metaValue: {
      fontSize: 10,
      fontWeight: 700,
      color: '#0A1628',
    },
    sectionRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    partyBox: {
      flex: 1,
      backgroundColor: '#F4F7FB',
      padding: 10,
      borderTop: '2 solid #00D4FF',
    },
    partyLabel: {
      fontSize: 7,
      color: '#6B7B95',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    partyName: {
      fontSize: 11,
      fontWeight: 700,
      marginBottom: 4,
    },
    partyLine: {
      fontSize: 8,
      color: '#3D4E66',
      marginBottom: 2,
      lineHeight: 1.4,
    },
    itemsTable: {
      marginBottom: 16,
      border: '1 solid #D5DDE8',
    },
    itemsHeader: {
      flexDirection: 'row',
      backgroundColor: '#0A1628',
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    itemsHeaderCell: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: 1,
    },
    itemsRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderTop: '1 solid #D5DDE8',
    },
    itemsCellLeft: { flex: 3, fontSize: 9 },
    itemsCellRight: { flex: 1, fontSize: 9, textAlign: 'right' },
    totalsBox: {
      marginLeft: 'auto',
      width: 240,
      marginBottom: 16,
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    totalsLabel: { fontSize: 9, color: '#3D4E66' },
    totalsValue: { fontSize: 9, fontWeight: 700 },
    totalsGrand: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: '#0A1628',
      marginTop: 4,
    },
    totalsGrandLabel: { fontSize: 10, fontWeight: 700, color: '#00D4FF', letterSpacing: 1 },
    totalsGrandValue: { fontSize: 12, fontWeight: 700, color: '#FFFFFF' },
    paymentBox: {
      backgroundColor: '#F4F7FB',
      padding: 10,
      marginBottom: 16,
    },
    paymentTitle: {
      fontSize: 8,
      fontWeight: 700,
      color: '#0A1628',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    paymentLine: {
      fontSize: 8,
      color: '#3D4E66',
      marginBottom: 2,
      lineHeight: 1.4,
    },
    fxNoteBox: {
      backgroundColor: '#FFF7E6',
      borderLeft: '3 solid #FFA940',
      padding: 8,
      marginBottom: 12,
    },
    fxNoteText: {
      fontSize: 8,
      color: '#7A4F00',
      lineHeight: 1.4,
    },
    notesText: {
      fontSize: 7,
      color: '#6B7B95',
      lineHeight: 1.4,
      marginTop: 4,
      marginBottom: 24,
    },
    signatureBox: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginTop: 12,
      gap: 16,
    },
    signatureCol: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    signatureLabel: {
      fontSize: 7,
      color: '#6B7B95',
      marginBottom: 4,
    },
    signatureImage: {
      width: 80,
      height: 40,
      objectFit: 'contain',
    },
    stampImage: {
      width: 60,
      height: 60,
      objectFit: 'contain',
    },
    fallbackSignature: {
      fontSize: 9,
      fontWeight: 700,
      color: '#0A1628',
      paddingHorizontal: 8,
      paddingVertical: 4,
      border: '1 solid #0A1628',
    },
    footer: {
      position: 'absolute',
      bottom: 18,
      left: 36,
      right: 36,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 6,
      color: '#9AA8BC',
      borderTop: '1 solid #E5EAF1',
      paddingTop: 6,
    },
    paidWatermark: {
      position: 'absolute',
      top: 320,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 120,
      fontWeight: 700,
      color: '#FF3B30',
      opacity: 0.15,
      transform: 'rotate(-25deg)',
      letterSpacing: 8,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
function InvoicePdf({ invoice, companyInfo, paymentAccounts, stampDataUrl, signatureDataUrl, lang }) {
  // 한국용은 'ko' 기본, 해외용은 'en' 강제
  const isKorea = invoice.bill_to_country === 'KR';
  const effectiveLang = isKorea ? (lang || 'ko') : 'en';
  const t = L[effectiveLang];

  if (effectiveLang === 'ko') ensureKoreanFont();
  const styles = makeStyles(effectiveLang);

  // 결제 계좌 분기
  const accByType = {};
  for (const a of (paymentAccounts || [])) {
    accByType[a.type] = a;
  }

  // 헤더 타이틀
  let headerTitle = t.invoice_title;
  if (isKorea) {
    if (invoice.kr_receipt_type === 'cash_receipt_business') headerTitle = t.cash_receipt_business;
    else if (invoice.kr_receipt_type === 'cash_receipt_personal') headerTitle = t.cash_receipt_personal;
    else headerTitle = t.invoice_title;
  }

  const headerSubtitle = isKorea
    ? `${invoice.track || 'INV-KR'} / ${invoice.currency}`
    : `${invoice.track || 'INV-INT'} / ${invoice.currency}`;

  const isPaid = invoice.status === 'paid';

  // ───────────────────────────────────────────────
  // 공급자 (issuer) — company_info
  // ───────────────────────────────────────────────
  const issuerName = effectiveLang === 'ko'
    ? (companyInfo.legal_entity_ko || companyInfo.legal_entity_en || 'TravelWinners Inc.')
    : (companyInfo.legal_entity_en || 'TravelWinners Inc.');
  const issuerCeo = effectiveLang === 'ko'
    ? (companyInfo.ceo_name_ko || companyInfo.ceo_name_en || 'lee ji hyeong')
    : (companyInfo.ceo_name_en || 'lee ji hyeong');
  const issuerAddress = effectiveLang === 'ko'
    ? (companyInfo.address_ko || companyInfo.address_en || '')
    : (companyInfo.address_en || companyInfo.address_ko || '');

  // ───────────────────────────────────────────────
  // 결제 정보 박스 (분기)
  // ───────────────────────────────────────────────
  const paymentLines = [];
  if (invoice.payment_method === 'bank_transfer_krw' && accByType.krw) {
    const a = accByType.krw;
    paymentLines.push({ label: t.bank, value: a.krw_bank_name || '-' });
    paymentLines.push({ label: t.account_no, value: a.krw_account_no || '-' });
    paymentLines.push({ label: t.account_holder, value: a.krw_account_holder || '-' });
    if (a.krw_business_no) paymentLines.push({ label: t.business_no, value: a.krw_business_no });
  } else if (invoice.payment_method === 'bank_transfer_usd' && accByType.usd) {
    const a = accByType.usd;
    paymentLines.push({ label: t.bank, value: a.usd_bank_name || '-' });
    paymentLines.push({ label: t.account_no, value: a.usd_account_no || '-' });
    paymentLines.push({ label: t.swift, value: a.usd_swift_code || '-' });
    paymentLines.push({ label: t.recipient, value: a.usd_recipient_name || '-' });
    if (a.usd_iban) paymentLines.push({ label: 'IBAN', value: a.usd_iban });
  } else if (invoice.payment_method === 'paypal' && accByType.paypal) {
    const a = accByType.paypal;
    paymentLines.push({ label: t.paypal_email, value: a.paypal_email || '-' });
  }

  // ───────────────────────────────────────────────
  // 도장·서명 (없으면 텍스트 fallback)
  // ───────────────────────────────────────────────
  const signatureNode = signatureDataUrl
    ? React.createElement(Image, { src: signatureDataUrl, style: styles.signatureImage })
    : React.createElement(Text, { style: styles.fallbackSignature }, `${issuerName} / ${issuerCeo}`);

  const stampNode = stampDataUrl
    ? React.createElement(Image, { src: stampDataUrl, style: styles.stampImage })
    : null;

  // ───────────────────────────────────────────────
  // JSX 트리 (React.createElement)
  // ───────────────────────────────────────────────
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // PAID 워터마크
      isPaid
        ? React.createElement(Text, { style: styles.paidWatermark, fixed: true }, t.paid)
        : null,

      // 헤더
      React.createElement(
        View,
        { style: styles.headerBar },
        React.createElement(
          View,
          { style: styles.headerLeft },
          React.createElement(Text, { style: styles.headerTitle }, headerTitle),
          React.createElement(Text, { style: styles.headerSubtitle }, headerSubtitle)
        ),
        React.createElement(
          View,
          { style: styles.headerRight },
          React.createElement(Text, { style: styles.headerCompanyName }, issuerName),
          companyInfo.business_number
            ? React.createElement(Text, { style: styles.headerCompanyLine }, `${t.business_no}: ${companyInfo.business_number}`)
            : null,
          companyInfo.contact_email
            ? React.createElement(Text, { style: styles.headerCompanyLine }, companyInfo.contact_email)
            : null
        )
      ),

      // 메타 (인보이스 번호 / 발행일 / 지급기한)
      React.createElement(
        View,
        { style: styles.metaRow },
        React.createElement(
          View,
          { style: styles.metaCol },
          React.createElement(Text, { style: styles.metaLabel }, t.invoice_number),
          React.createElement(Text, { style: styles.metaValue }, invoice.invoice_number)
        ),
        React.createElement(
          View,
          { style: styles.metaCol },
          React.createElement(Text, { style: styles.metaLabel }, t.issued_at),
          React.createElement(Text, { style: styles.metaValue }, fmtDate(invoice.issued_at, effectiveLang))
        ),
        React.createElement(
          View,
          { style: styles.metaCol },
          React.createElement(Text, { style: styles.metaLabel }, t.due_at),
          React.createElement(Text, { style: styles.metaValue }, fmtDate(invoice.due_at, effectiveLang))
        )
      ),

      // 공급자 + 공급받는자
      React.createElement(
        View,
        { style: styles.sectionRow },
        // 공급자
        React.createElement(
          View,
          { style: styles.partyBox },
          React.createElement(Text, { style: styles.partyLabel }, t.issuer),
          React.createElement(Text, { style: styles.partyName }, issuerName),
          companyInfo.business_number
            ? React.createElement(Text, { style: styles.partyLine }, `${t.business_no}: ${companyInfo.business_number}`)
            : null,
          React.createElement(Text, { style: styles.partyLine }, `${t.ceo}: ${issuerCeo}`),
          issuerAddress
            ? React.createElement(Text, { style: styles.partyLine }, `${t.address}: ${issuerAddress}`)
            : null,
          effectiveLang === 'ko' && companyInfo.business_type
            ? React.createElement(Text, { style: styles.partyLine }, `${t.business_type}: ${companyInfo.business_type}`)
            : null,
          effectiveLang === 'ko' && companyInfo.business_item
            ? React.createElement(Text, { style: styles.partyLine }, `${t.business_item}: ${companyInfo.business_item}`)
            : null,
          companyInfo.contact_email
            ? React.createElement(Text, { style: styles.partyLine }, `${t.contact}: ${companyInfo.contact_email}`)
            : null
        ),
        // 공급받는자
        React.createElement(
          View,
          { style: styles.partyBox },
          React.createElement(Text, { style: styles.partyLabel }, t.bill_to),
          React.createElement(Text, { style: styles.partyName }, invoice.bill_to_name || '-'),
          invoice.bill_to_business_no
            ? React.createElement(Text, { style: styles.partyLine }, `${t.business_no}: ${invoice.bill_to_business_no}`)
            : null,
          invoice.bill_to_email
            ? React.createElement(Text, { style: styles.partyLine }, `${t.contact}: ${invoice.bill_to_email}`)
            : null,
          invoice.bill_to_address
            ? React.createElement(Text, { style: styles.partyLine }, `${t.address}: ${invoice.bill_to_address}`)
            : null,
          (invoice.metadata && invoice.metadata.hotel_country_raw)
            ? React.createElement(Text, { style: styles.partyLine }, `Country: ${invoice.metadata.hotel_country_raw}`)
            : null
        )
      ),

      // 품목 테이블
      React.createElement(
        View,
        { style: styles.itemsTable },
        React.createElement(
          View,
          { style: styles.itemsHeader },
          React.createElement(Text, { style: [styles.itemsHeaderCell, { flex: 3 }] }, t.description),
          React.createElement(Text, { style: [styles.itemsHeaderCell, { flex: 1, textAlign: 'right' }] },
            effectiveLang === 'ko' ? '금액' : 'Amount')
        ),
        React.createElement(
          View,
          { style: styles.itemsRow },
          React.createElement(
            View,
            { style: styles.itemsCellLeft },
            React.createElement(Text, null,
              (invoice.metadata && invoice.metadata.hotel_name)
                ? `${t.item_default} — ${invoice.metadata.hotel_name}`
                : t.item_default
            )
          ),
          React.createElement(Text, { style: styles.itemsCellRight },
            fmtMoney(invoice.amount_subtotal, invoice.currency))
        )
      ),

      // 합계 박스 (한국: 3줄 분리 / 해외: subtotal + tax_label + total)
      React.createElement(
        View,
        { style: styles.totalsBox },

        React.createElement(
          View,
          { style: styles.totalsRow },
          React.createElement(Text, { style: styles.totalsLabel }, t.subtotal),
          React.createElement(Text, { style: styles.totalsValue },
            fmtMoney(invoice.amount_subtotal, invoice.currency))
        ),

        isKorea
          ? React.createElement(
              View,
              { style: styles.totalsRow },
              React.createElement(Text, { style: styles.totalsLabel }, t.tax),
              React.createElement(Text, { style: styles.totalsValue },
                fmtMoney(invoice.amount_tax, invoice.currency))
            )
          : React.createElement(
              View,
              { style: styles.totalsRow },
              React.createElement(Text, { style: styles.totalsLabel }, t.tax),
              React.createElement(Text, { style: styles.totalsValue },
                `${fmtMoney(0, invoice.currency)} (${t.tax_zero_rated_note})`)
            ),

        React.createElement(
          View,
          { style: styles.totalsGrand },
          React.createElement(Text, { style: styles.totalsGrandLabel }, t.total),
          React.createElement(Text, { style: styles.totalsGrandValue },
            fmtMoney(invoice.amount_total, invoice.currency))
        )
      ),

      // 환율 안내 (있을 때만)
      invoice.fx_display_note
        ? React.createElement(
            View,
            { style: styles.fxNoteBox },
            React.createElement(Text, { style: styles.fxNoteText },
              `${effectiveLang === 'ko' ? t.fx_note + ': ' : 'FX Note: '}${invoice.fx_display_note}`
            )
          )
        : null,

      // 결제 정보
      paymentLines.length > 0
        ? React.createElement(
            View,
            { style: styles.paymentBox },
            React.createElement(Text, { style: styles.paymentTitle },
              `${t.payment_info} (${invoice.payment_method})`),
            ...paymentLines.map((line, idx) =>
              React.createElement(Text, { key: idx, style: styles.paymentLine },
                `${line.label}: ${line.value}`)
            )
          )
        : null,

      // Notes
      React.createElement(Text, { style: styles.notesText }, t.notes_default),

      // 도장·서명 (우하단)
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.signatureCol },
          React.createElement(Text, { style: styles.signatureLabel },
            effectiveLang === 'ko' ? '서명' : 'Signature'),
          signatureNode
        ),
        stampNode
          ? React.createElement(
              View,
              { style: styles.signatureCol },
              React.createElement(Text, { style: styles.signatureLabel },
                effectiveLang === 'ko' ? '직인' : 'Seal'),
              stampNode
            )
          : null
      ),

      // 푸터 (페이지 번호)
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, null, `${issuerName} | ${invoice.invoice_number}`),
        React.createElement(Text, {
          render: ({ pageNumber, totalPages }) => `${t.page} ${pageNumber} / ${totalPages}`
        })
      )
    )
  );
}

export default InvoicePdf;
