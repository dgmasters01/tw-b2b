// /api/cron/invoice-retention.js
// ════════════════════════════════════════════════════════════════════════════
// BL-INVOICE-001 단계 11 — 인보이스 보관 상태 감시 cron (매일 KST 09:00)
// ════════════════════════════════════════════════════════════════════════════
//
// 트리거: GitHub Actions (.github/workflows/invoice-retention-cron.yml, 매일 UTC 00:00 = KST 09:00)
// 보안:   x-cron-token 헤더 (CRON_SECRET 환경변수)
//
// 정책 2.14: 인보이스/영수증 PDF = 5년 영구 보관
//
// 박는 것:
//   ① 보관 만료 임박(30일 이내) 카운트 — 텔레그램 알림
//   ② 보관 만료 지남(expired) 카운트 — 텔레그램 알림 (대표님 결정 대기)
//   ③ 1년 이내 만료(within_year) 카운트 — 정보성 (월간 보고용)
//
// 자동 삭제 박지 않음:
//   - 정책 2.14 "5년 영구 보관" + 한국 세무 분쟁 대비
//   - expired 상태 발견 시 대표님께 텔레그램 알림 → 별도 BL(BL-INVOICE-ARCHIVE-DELETE)로 갈무리
//
// 응답:
//   200 OK { started_at, finished_at, dry_run, counts, alert_sent, errors }
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

  const url = new URL(req.url || '/', 'http://x');
  const isDryRun = url.searchParams.get('dry_run') === '1';

  const result = {
    started_at: new Date().toISOString(),
    dry_run: isDryRun,
    counts: { expired: 0, imminent: 0, within_year: 0, safe: 0, total: 0 },
    by_doc_type: { invoice: { expired: 0, imminent: 0 }, credit_note: { expired: 0, imminent: 0 } },
    alert_sent: false,
    errors: [],
  };

  try {
    // v_invoice_retention_status 전체 카운트 (state별)
    const rows = await sbSelect(serviceKey,
      'v_invoice_retention_status?select=doc_type,retention_state,doc_number');

    if (Array.isArray(rows)) {
      rows.forEach(r => {
        result.counts.total += 1;
        if (result.counts[r.retention_state] !== undefined) {
          result.counts[r.retention_state] += 1;
        }
        if (result.by_doc_type[r.doc_type] && (r.retention_state === 'expired' || r.retention_state === 'imminent')) {
          result.by_doc_type[r.doc_type][r.retention_state] += 1;
        }
      });
    }

    // 텔레그램 알림 — expired 또는 imminent 있을 때만
    const needAlert = result.counts.expired > 0 || result.counts.imminent > 0;
    if (needAlert && !isDryRun) {
      let msg = '📁 *인보이스 보관 상태 점검* (정책 2.14)\n\n';
      if (result.counts.expired > 0) {
        msg += '🚨 *5년 보관 만료 지남:* ' + result.counts.expired + '건\n';
        msg += '   - 인보이스: ' + result.by_doc_type.invoice.expired + '건\n';
        msg += '   - Credit Note: ' + result.by_doc_type.credit_note.expired + '건\n';
        msg += '   → 대표님 결정 필요: 별도 BL로 갈무리\n\n';
      }
      if (result.counts.imminent > 0) {
        msg += '⏰ *30일 이내 만료 임박:* ' + result.counts.imminent + '건\n';
        msg += '   - 인보이스: ' + result.by_doc_type.invoice.imminent + '건\n';
        msg += '   - Credit Note: ' + result.by_doc_type.credit_note.imminent + '건\n\n';
      }
      msg += '_총 ' + result.counts.total + '건 중 안전(safe): ' + result.counts.safe + '건_';

      const tg = await sendTelegram(msg);
      result.alert_sent = tg.ok;
      if (!tg.ok) {
        result.errors.push({ stage: 'telegram', detail: tg.skipped || tg.error });
      }
    }
  } catch (e) {
    result.errors.push({ stage: 'query', detail: e.message });
  }

  result.finished_at = new Date().toISOString();
  return res.status(200).json(result);
}
