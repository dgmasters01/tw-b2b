// /api/lib/email-sender.js
// 이메일 발송 공통 라이브러리
// - sendSystemEmail() : 고객/매니저 대상 (FROM=noreply@gohotelwinners.com)
// - sendOpsEmail()    : 내부 운영 알림 (FROM=ops@gohotelwinners.com → TO=dgmasters01@gmail.com 고정)
//
// 사용처 분리 원칙:
//   System  = 외부 고객/매니저에게 보내는 메일 (가입확인, 비밀번호 재설정, Agoda 안내 등)
//   Ops     = 내부 운영 알림 (Claude 작업 완료, 에러 알림, 일일 리포트 등)

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const FROM_SYSTEM = 'TravelWinners B2B <noreply@gohotelwinners.com>';
const FROM_OPS = 'TW B2B Ops <ops@gohotelwinners.com>';
const OPS_TO_FIXED = 'dgmasters01@gmail.com';

/**
 * 시스템 발송 (고객/매니저 대상)
 * @param {Object} opts
 * @param {string|string[]} opts.to        - 수신자
 * @param {string} opts.subject            - 제목
 * @param {string} [opts.html]             - HTML 본문
 * @param {string} [opts.text]             - 텍스트 본문 (HTML 없을 때)
 * @param {string} [opts.replyTo]          - 회신 주소 (옵션)
 * @param {string} [opts.from]             - 커스텀 from (옵션, 기본 noreply@)
 * @returns {Promise<{ok:boolean, id?:string, error?:string, status?:number}>}
 */
export async function sendSystemEmail(opts) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  if (!opts || !opts.to || !opts.subject) {
    return { ok: false, error: 'to, subject are required' };
  }
  if (!opts.html && !opts.text) {
    return { ok: false, error: 'html or text body is required' };
  }

  const payload = {
    from: opts.from || FROM_SYSTEM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
  };
  if (opts.html) payload.html = opts.html;
  if (opts.text) payload.text = opts.text;
  if (opts.replyTo) payload.reply_to = opts.replyTo;

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, error: data.message || data.error || 'Resend API error', status: resp.status };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

/**
 * 운영 알림 발송 (내부 전용, 수신자 고정 = dgmasters01@gmail.com)
 * @param {Object} opts
 * @param {string} opts.subject  - 제목
 * @param {string} [opts.html]   - HTML 본문
 * @param {string} [opts.text]   - 텍스트 본문
 * @returns {Promise<{ok:boolean, id?:string, error?:string, status?:number}>}
 */
export async function sendOpsEmail(opts) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  if (!opts || !opts.subject) {
    return { ok: false, error: 'subject is required' };
  }
  if (!opts.html && !opts.text) {
    return { ok: false, error: 'html or text body is required' };
  }

  const payload = {
    from: FROM_OPS,
    to: [OPS_TO_FIXED],
    subject: opts.subject,
  };
  if (opts.html) payload.html = opts.html;
  if (opts.text) payload.text = opts.text;

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, error: data.message || data.error || 'Resend API error', status: resp.status };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// 상수도 export (테스트/디버깅용)
export const EMAIL_CONSTANTS = {
  FROM_SYSTEM,
  FROM_OPS,
  OPS_TO_FIXED,
  RESEND_ENDPOINT,
};
