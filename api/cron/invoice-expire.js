// /api/cron/invoice-expire.js
// ════════════════════════════════════════════════════════════════════════════
// BL-INVOICE-001 단계 8 — 입금 기한 자동 만료 cron (매시 정각)
// ════════════════════════════════════════════════════════════════════════════
//
// 트리거: GitHub Actions (.github/workflows/invoice-expire-cron.yml, 매시 정각 UTC)
// 보안:   x-cron-token 헤더 (CRON_SECRET 환경변수)
//
// 4가지 처리 (정책 2.8 + 2.13):
//   ① stage_24h   — issued_at + 24h 경과, 아직 pending  → 텔레그램 ⏰ 알림 (멱등)
//   ② stage_6h    — due_at - 6h ≤ now < due_at, pending → 텔레그램 🚨 알림 (멱등)
//   ③ stage_expired — due_at ≤ now, pending             → status='expired' 전환 + ❌ 알림
//   ④ stage_receipt_overdue — paid + paid_at + 24h, kr_receipt_issued=false (KR만) → 텔레그램 📋 알림 (멱등) [정책 2.10]
//
// 멱등 처리: invoices.metadata.telegram_log[] 에 알림 단계 기록. 같은 단계 중복 발송 차단.
// 부분 환불 정책: cron이 처리하는 단계 = "pending → expired"만 (void는 admin/PayPal 환불 webhook 담당).
//
// 응답:
//   200 OK {
//     started_at, finished_at, dry_run,
//     stage_24h_sent, stage_6h_sent, stage_expired_count, stage_receipt_overdue_sent,
//     errors: []
//   }
// ════════════════════════════════════════════════════════════════════════════

import { sendTelegram, escMd } from '../_lib/telegram.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';

// ───────────────────────────────────────────────
// Supabase 헬퍼
// ───────────────────────────────────────────────
async function sbSelect(serviceKey, table, queryString) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + queryString, {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey },
  });
  if (!resp.ok) throw new Error('select ' + table + ' failed: ' + (await resp.text()));
  return resp.json();
}

async function sbPatch(serviceKey, table, queryString, payload) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + queryString, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('patch ' + table + ' failed: ' + (await resp.text()));
  return resp.json();
}

// ───────────────────────────────────────────────
// metadata.telegram_log[] 헬퍼
// ───────────────────────────────────────────────
function hasTelegramStage(metadata, stage) {
  const log = (metadata && metadata.telegram_log) || [];
  return log.some(e => e && e.stage === stage);
}

function appendTelegramStage(metadata, stage, extra) {
  const next = { ...(metadata || {}) };
  const log = Array.isArray(next.telegram_log) ? [...next.telegram_log] : [];
  log.push({ stage, at: new Date().toISOString(), ...(extra || {}) });
  next.telegram_log = log;
  return next;
}

// ───────────────────────────────────────────────
// 금액 포맷
// ───────────────────────────────────────────────
function fmtAmount(amount, currency) {
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) return String(amount);
  if (currency === 'KRW') return '₩' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString() + ' ' + (currency || '');
}

function fmtKstShort(iso) {
  const d = new Date(iso);
  // KST = UTC+9
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const HH = String(kst.getUTCHours()).padStart(2, '0');
  const MM = String(kst.getUTCMinutes()).padStart(2, '0');
  return mm + '/' + dd + ' ' + HH + ':' + MM;
}

// ───────────────────────────────────────────────
// 메인 handler
// ───────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // 인증
  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers['x-cron-token'] || '';
  if (!cronSecret || provided !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'env_missing', detail: 'SUPABASE_SERVICE_ROLE_KEY' });
  }

  // dry_run 옵션 — 메시지·전환 안 함, 후보만 카운트
  const url = new URL(req.url || '/', 'http://x');
  const isDryRun = url.searchParams.get('dry_run') === '1';

  const result = {
    started_at: new Date().toISOString(),
    dry_run: isDryRun,
    stage_24h_sent: 0,
    stage_6h_sent: 0,
    stage_expired_count: 0,
    stage_receipt_overdue_sent: 0,
    candidates: { stage_24h: 0, stage_6h: 0, stage_expired: 0, stage_receipt_overdue: 0 },
    errors: [],
    details: [],
  };

  const nowIso = new Date().toISOString();
  const now = new Date(nowIso).getTime();
  const h24 = 24 * 3600 * 1000;
  const h6 = 6 * 3600 * 1000;

  // ──────────────────────────────────────────────────────────────
  // STAGE ③ : 기한 경과 → expired 전환 + ❌ 알림 (먼저 처리 — 24h/6h 알림 대상에서 빠지게)
  // ──────────────────────────────────────────────────────────────
  try {
    const expiredCandidates = await sbSelect(
      serviceKey,
      'invoices',
      'status=eq.pending&due_at=lt.' + encodeURIComponent(nowIso)
        + '&select=id,invoice_number,track,bill_to_name,bill_to_email,currency,amount_total,due_at,metadata'
        + '&limit=100'
    );
    result.candidates.stage_expired = expiredCandidates.length;

    for (const inv of expiredCandidates) {
      const detail = { stage: 'expired', invoice_number: inv.invoice_number };
      try {
        if (!isDryRun) {
          // 1) status='expired' 전환 + telegram_log 박음
          const updMeta = appendTelegramStage(inv.metadata, 'expired', {
            invoice_id: inv.id,
            reason: 'due_at_exceeded',
          });
          await sbPatch(
            serviceKey,
            'invoices',
            'id=eq.' + encodeURIComponent(inv.id),
            {
              status: 'expired',
              voided_at: nowIso,
              void_reason: '입금 기한 경과 자동 만료 (cron)',
              metadata: updMeta,
              updated_at: nowIso,
            }
          );

          // 2) 텔레그램 ❌ 알림
          const isKR = inv.track === 'INV-KR';
          if (isKR) {
            const msg = '❌ *자동 취소됨* `' + escMd(inv.invoice_number) + '`\n'
              + '사유: 입금 기한 초과\n'
              + '청구처: ' + escMd(inv.bill_to_name || '—') + '\n'
              + '금액: ' + fmtAmount(inv.amount_total, inv.currency) + '\n'
              + '기한: ' + fmtKstShort(inv.due_at);
            const tg = await sendTelegram(msg);
            detail.telegram = tg.ok ? 'sent' : (tg.skipped || 'failed');
          }
        }
        result.stage_expired_count += 1;
        result.details.push(detail);
      } catch (e) {
        result.errors.push({ stage: 'expired', invoice_number: inv.invoice_number, detail: e.message });
      }
    }
  } catch (e) {
    result.errors.push({ stage: 'expired_query', detail: e.message });
  }

  // ──────────────────────────────────────────────────────────────
  // STAGE ② : 기한 6h 전 임박 → 🚨 알림 (멱등, KR만)
  // ──────────────────────────────────────────────────────────────
  try {
    const window6hStartIso = new Date(now).toISOString();
    const window6hEndIso = new Date(now + h6).toISOString();
    const candidates6h = await sbSelect(
      serviceKey,
      'invoices',
      'status=eq.pending&track=eq.INV-KR'
        + '&due_at=gt.' + encodeURIComponent(window6hStartIso)
        + '&due_at=lt.' + encodeURIComponent(window6hEndIso)
        + '&select=id,invoice_number,bill_to_name,currency,amount_total,due_at,metadata'
        + '&limit=100'
    );
    result.candidates.stage_6h = candidates6h.length;

    for (const inv of candidates6h) {
      const detail = { stage: '6h', invoice_number: inv.invoice_number };
      if (hasTelegramStage(inv.metadata, 'reminder_6h')) {
        detail.skipped = 'already_sent';
        result.details.push(detail);
        continue;
      }
      try {
        if (!isDryRun) {
          const msg = '🚨 *기한 임박* `' + escMd(inv.invoice_number) + '`\n'
            + fmtAmount(inv.amount_total, inv.currency) + ' 미입금\n'
            + '청구처: ' + escMd(inv.bill_to_name || '—') + '\n'
            + '기한: ' + fmtKstShort(inv.due_at) + ' (6시간 이내)';
          const tg = await sendTelegram(msg);
          detail.telegram = tg.ok ? 'sent' : (tg.skipped || 'failed');

          if (tg.ok || tg.skipped === 'no_token') {
            // no_token 케이스도 멱등 박음 (다음 cron에서 또 호출 안 하게)
            const updMeta = appendTelegramStage(inv.metadata, 'reminder_6h', {
              telegram_result: tg.ok ? 'sent' : tg.skipped,
            });
            await sbPatch(serviceKey, 'invoices', 'id=eq.' + encodeURIComponent(inv.id), {
              metadata: updMeta,
              updated_at: nowIso,
            });
          }
        }
        result.stage_6h_sent += 1;
        result.details.push(detail);
      } catch (e) {
        result.errors.push({ stage: '6h', invoice_number: inv.invoice_number, detail: e.message });
      }
    }
  } catch (e) {
    result.errors.push({ stage: '6h_query', detail: e.message });
  }

  // ──────────────────────────────────────────────────────────────
  // STAGE ① : 발행 +24h 미입금 → ⏰ 알림 (멱등, KR만)
  // ──────────────────────────────────────────────────────────────
  try {
    const issuedBeforeIso = new Date(now - h24).toISOString();
    const candidates24h = await sbSelect(
      serviceKey,
      'invoices',
      'status=eq.pending&track=eq.INV-KR'
        + '&issued_at=lt.' + encodeURIComponent(issuedBeforeIso)
        + '&due_at=gt.' + encodeURIComponent(new Date(now + h6).toISOString()) // 6h 알림 대상이 아닐 때만 (중복 방지)
        + '&select=id,invoice_number,bill_to_name,currency,amount_total,due_at,issued_at,metadata'
        + '&limit=100'
    );
    result.candidates.stage_24h = candidates24h.length;

    for (const inv of candidates24h) {
      const detail = { stage: '24h', invoice_number: inv.invoice_number };
      if (hasTelegramStage(inv.metadata, 'reminder_24h')) {
        detail.skipped = 'already_sent';
        result.details.push(detail);
        continue;
      }
      try {
        if (!isDryRun) {
          const remaining = inv.due_at ? new Date(inv.due_at).getTime() - now : 0;
          const remainingHours = Math.max(0, Math.round(remaining / 3600000));
          const msg = '⏰ *미입금 24시간 경과* `' + escMd(inv.invoice_number) + '`\n'
            + fmtAmount(inv.amount_total, inv.currency) + ' 미입금\n'
            + '청구처: ' + escMd(inv.bill_to_name || '—') + '\n'
            + '기한까지: 약 ' + remainingHours + '시간 (' + fmtKstShort(inv.due_at) + ')';
          const tg = await sendTelegram(msg);
          detail.telegram = tg.ok ? 'sent' : (tg.skipped || 'failed');

          if (tg.ok || tg.skipped === 'no_token') {
            const updMeta = appendTelegramStage(inv.metadata, 'reminder_24h', {
              telegram_result: tg.ok ? 'sent' : tg.skipped,
            });
            await sbPatch(serviceKey, 'invoices', 'id=eq.' + encodeURIComponent(inv.id), {
              metadata: updMeta,
              updated_at: nowIso,
            });
          }
        }
        result.stage_24h_sent += 1;
        result.details.push(detail);
      } catch (e) {
        result.errors.push({ stage: '24h', invoice_number: inv.invoice_number, detail: e.message });
      }
    }
  } catch (e) {
    result.errors.push({ stage: '24h_query', detail: e.message });
  }

  // ──────────────────────────────────────────────────────────────
  // STAGE ④ : 영수증 발행 누락 → 📋 알림 (paid +24h, KR만, kr_receipt_issued=false)
  // 정책 2.10
  // ──────────────────────────────────────────────────────────────
  try {
    const paidBeforeIso = new Date(now - h24).toISOString();
    const receiptCandidates = await sbSelect(
      serviceKey,
      'invoices',
      'status=eq.paid&track=eq.INV-KR&kr_receipt_issued=is.false'
        + '&paid_at=lt.' + encodeURIComponent(paidBeforeIso)
        + '&select=id,invoice_number,bill_to_name,currency,amount_total,paid_at,kr_receipt_type,kr_receipt_meta,metadata'
        + '&limit=100'
    );
    result.candidates.stage_receipt_overdue = receiptCandidates.length;

    for (const inv of receiptCandidates) {
      const detail = { stage: 'receipt_overdue', invoice_number: inv.invoice_number };
      if (hasTelegramStage(inv.metadata, 'receipt_overdue')) {
        detail.skipped = 'already_sent';
        result.details.push(detail);
        continue;
      }
      try {
        if (!isDryRun) {
          const receiptType = inv.kr_receipt_type || 'tax_invoice';
          const typeLabel = ({
            tax_invoice: '세금계산서',
            cash_receipt_business: '현금영수증(사업자)',
            cash_receipt_personal: '현금영수증(개인)',
          })[receiptType] || receiptType;

          const msg = '📋 *영수증 발행 누락* `' + escMd(inv.invoice_number) + '`\n'
            + typeLabel + ' 미발행 (입금 후 24시간 경과)\n'
            + '청구처: ' + escMd(inv.bill_to_name || '—') + '\n'
            + '금액: ' + fmtAmount(inv.amount_total, inv.currency);
          const tg = await sendTelegram(msg);
          detail.telegram = tg.ok ? 'sent' : (tg.skipped || 'failed');

          if (tg.ok || tg.skipped === 'no_token') {
            const updMeta = appendTelegramStage(inv.metadata, 'receipt_overdue', {
              telegram_result: tg.ok ? 'sent' : tg.skipped,
              receipt_type: receiptType,
            });
            await sbPatch(serviceKey, 'invoices', 'id=eq.' + encodeURIComponent(inv.id), {
              metadata: updMeta,
              updated_at: nowIso,
            });
          }
        }
        result.stage_receipt_overdue_sent += 1;
        result.details.push(detail);
      } catch (e) {
        result.errors.push({ stage: 'receipt_overdue', invoice_number: inv.invoice_number, detail: e.message });
      }
    }
  } catch (e) {
    result.errors.push({ stage: 'receipt_overdue_query', detail: e.message });
  }

  result.finished_at = new Date().toISOString();
  return res.status(200).json(result);
}
