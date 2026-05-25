// /api/_lib/telegram.js
// ════════════════════════════════════════════════════════════════════════════
// Telegram 알림 헬퍼 (정책 2.13 — 대표님 1차 채널)
// ════════════════════════════════════════════════════════════════════════════
// 사용처:
//   - api/cron/invoice-expire.js (BL-INVOICE-001 단계 8) — 한국 인보이스 4단계 알림
//   - 향후 영수증 누락 / 결제 분쟁 / 시스템 장애 알림 등
//
// 환경변수:
//   TELEGRAM_BOT_TOKEN     — @tw_personal_os_bot 토큰 (BotFather 발급)
//   TELEGRAM_OWNER_CHAT_ID — 대표님 Chat ID (메모리: 8778277875)
//
// 토큰 미박혀있으면 호출은 silent skip (cron 자체는 계속 동작).
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_OWNER_CHAT_ID = '8778277875'; // tw_personal_os_bot 기본 chat (메모리 박힘)

/**
 * 텔레그램 메시지 전송 (Markdown 모드 기본)
 *
 * @param {string} text — 본문 (Markdown 가능)
 * @param {object} opts
 *   @param {string} [opts.chatId]      — 기본: TELEGRAM_OWNER_CHAT_ID 또는 대표님 chat
 *   @param {string} [opts.parseMode]   — 'Markdown' (default) / 'MarkdownV2' / 'HTML' / null
 *   @param {boolean} [opts.silent]     — 알림음 끄기 (기본 false)
 * @returns {Promise<{ok:boolean, skipped?:string, status?:number, detail?:any}>}
 */
export async function sendTelegram(text, opts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, skipped: 'no_token' };
  }
  const chatId = opts.chatId || process.env.TELEGRAM_OWNER_CHAT_ID || DEFAULT_OWNER_CHAT_ID;
  if (!chatId) {
    return { ok: false, skipped: 'no_chat_id' };
  }
  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: opts.parseMode === null ? undefined : (opts.parseMode || 'Markdown'),
    disable_notification: !!opts.silent,
    disable_web_page_preview: true,
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) {
      return { ok: false, status: resp.status, detail: data };
    }
    return { ok: true, status: resp.status, message_id: data.result && data.result.message_id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 텔레그램 Markdown 특수문자 escape (Markdown v1 기준).
 * 본문에 동적으로 박는 invoice_number / 호텔명 등에 사용.
 */
export function escMd(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/([_*`\[\]])/g, '\\$1');
}
