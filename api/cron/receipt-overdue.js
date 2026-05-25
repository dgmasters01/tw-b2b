// /api/cron/receipt-overdue.js
// ════════════════════════════════════════════════════════════════════════════
// BL-INVOICE-002 단계 6/7 — 영수증 발행 누락 알림 cron (한국 인보이스 전용)
// ════════════════════════════════════════════════════════════════════════════
//
// 트리거: GitHub Actions (.github/workflows/receipt-overdue-cron.yml)
//   - 매시 정각 (UTC 0 * * * *)
//   - workflow_dispatch (수동)
//
// 보안: x-cron-token 헤더 (CRON_SECRET)
//
// 정책 (라운드 13~14):
//   한국 인보이스 status='paid' + kr_receipt_issued=false 인 건이
//   paid_at + 24시간 경과 시 텔레그램 ⚠️ 알림 (멱등 — 알림 1회만)
//
// 응답:
//   200 OK { started_at, finished_at, dry_run, candidates, notified, errors }
// ════════════════════════════════════════════════════════════════════════════

import { sendTelegram, escMd } from '../_lib/telegram.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';

async function sbSelect(serviceKey, queryString) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/' + queryString, {
    headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey },
  });
  if (!resp.ok) throw new Error('select failed: ' + (await resp.text()));
  return resp.json();
}

async function sbUpdate(serviceKey, table, id, patch) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!resp.ok) throw new Error('update failed: ' + (await resp.text()));
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers['x-cron-token'] || '';
  if (!cronSecret || provided !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'env_missing', detail: 'SUPABASE_SERVICE_ROLE_KEY' });
  }

  const url = new URL(req.url || '/', 'http://x');
  const isDryRun = url.searchParams.get('dry_run') === '1';

  const result = {
    started_at: new Date().toISOString(),
    dry_run: isDryRun,
    candidates: 0,
    notified: 0,
    errors: [],
  };

  try {
    // paid + INV-KR + kr_receipt_issued=false + paid_at < now - 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const q = 'invoices?track=eq.INV-KR&status=eq.paid&kr_receipt_issued=eq.false'
      + '&paid_at=lt.' + cutoff
      + '&select=id,invoice_number,paid_at,bill_to_name,kr_receipt_type,metadata';
    const rows = await sbSelect(serviceKey, q);

    if (!Array.isArray(rows)) {
      result.errors.push({ stage: 'fetch', detail: 'unexpected response' });
      result.finished_at = new Date().toISOString();
      return res.status(200).json(result);
    }
    result.candidates = rows.length;

    for (const inv of rows) {
      // 멱등 — metadata.telegram_log에 receipt_overdue 이미 박혔으면 skip
      const meta = inv.metadata || {};
      const tgLog = Array.isArray(meta.telegram_log) ? meta.telegram_log : [];
      const alreadyNotified = tgLog.some(e => e.stage === 'receipt_overdue');
      if (alreadyNotified) continue;

      // 영수증 종류 라벨
      const typeLabel = {
        tax_invoice: '전자세금계산서',
        cash_receipt_business: '현금영수증(사업자)',
        cash_receipt_personal: '현금영수증(개인)',
      }[inv.kr_receipt_type] || inv.kr_receipt_type || '미정';

      const msg = '⚠️ *영수증 발행 누락 경고*\n\n'
        + '`' + inv.invoice_number + '`\n'
        + '업체: ' + escMd(inv.bill_to_name || '(미정)') + '\n'
        + '입금 시각: ' + escMd((inv.paid_at || '').slice(0, 16).replace('T', ' ')) + '\n'
        + '영수증 종류: ' + escMd(typeLabel) + '\n\n'
        + '입금 후 24시간 경과했는데 영수증 미발행 상태입니다\\.\n'
        + '홈택스·국세청에서 발행 후 admin에서 "발행 완료" 체크 부탁드립니다\\.';

      if (isDryRun) {
        result.notified += 1;
        continue;
      }

      const tg = await sendTelegram(msg);
      if (tg.ok) {
        // metadata.telegram_log 박음 (멱등 보장)
        tgLog.push({
          stage: 'receipt_overdue',
          at: new Date().toISOString(),
        });
        meta.telegram_log = tgLog;
        try {
          await sbUpdate(serviceKey, 'invoices', inv.id, { metadata: meta });
          result.notified += 1;
        } catch (e) {
          result.errors.push({ stage: 'log_update', invoice_id: inv.id, detail: e.message });
        }
      } else {
        result.errors.push({ stage: 'telegram', invoice_id: inv.id, detail: tg.skipped || tg.error });
      }
    }
  } catch (e) {
    result.errors.push({ stage: 'fatal', detail: e.message });
  }

  result.finished_at = new Date().toISOString();
  return res.status(200).json(result);
}
