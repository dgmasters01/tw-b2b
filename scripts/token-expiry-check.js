#!/usr/bin/env node
/**
 * TW B2B — 토큰 만료 자동 체크 봇 (SQ-H, D-017)
 *
 * 헌법 부합:
 *   ② 무인 실행: GitHub Actions cron 매일 09:00 KST (UTC 00:00)
 *   ⑪ Claude 자체 보고: 만료 임박 시 ops@gohotelwinners.com → dgmasters01@gmail.com
 *   부칙 17: 자격증명 라이프사이클 — 만료 전 자동 갱신 알림
 *
 * 결정 D-017 (2026-05-08) 보강:
 *   "개발기간(등록 정상) → 서비스기간(일괄 폐기)"
 *   서비스 진입 전까지는 발견된 토큰을 자동 추적 + 만료 임박 알림.
 *
 * 작동 흐름:
 *   1. _data/tokens-registry.json 읽기
 *   2. 각 토큰의 expires_at vs 오늘 비교
 *   3. (expires_at - 오늘) <= warn_days_before 이면 알림 발송
 *   4. ops@gohotelwinners.com → dgmasters01@gmail.com (sendOpsEmail 패턴 동일)
 *   5. 발송 이력은 _data/token-alert-log.json에 박음 (중복 알림 방지 — 1일 1통)
 *
 * Last updated: 2026-05-13
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const REGISTRY_PATH = path.join(REPO_ROOT, '_data', 'tokens-registry.json');
const LOG_PATH = path.join(REPO_ROOT, '_data', 'token-alert-log.json');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM_OPS = 'TW B2B Ops <ops@gohotelwinners.com>';
const OPS_TO = 'dgmasters01@gmail.com';

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function loadJSON(filepath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
}

function saveJSON(filepath, data) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function daysUntil(isoDate) {
  const now = new Date();
  const target = new Date(isoDate);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────
// 메일 발송 (sendOpsEmail 동일 로직)
// ─────────────────────────────────────────────────────────
async function sendOpsEmail({ subject, html }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const resp = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_OPS, to: [OPS_TO], subject, html }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { ok: false, error: data.message || data.error || 'Resend API error', status: resp.status };
  }
  return { ok: true, id: data.id };
}

// ─────────────────────────────────────────────────────────
// 메일 본문
// ─────────────────────────────────────────────────────────
function buildAlertEmail(expiringTokens) {
  const rows = expiringTokens.map(t => {
    const d = daysUntil(t.expires_at);
    const urgencyColor = d <= 3 ? '#dc2626' : d <= 7 ? '#f59e0b' : '#6b7280';
    const urgencyLabel = d <= 0 ? '🚨 만료됨' : d <= 3 ? '🔴 긴급' : '🟡 임박';
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
          <strong>${escapeHtml(t.name)}</strong><br>
          <code style="font-size:11px;color:#6b7280;">${escapeHtml(t.id)}</code>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:${urgencyColor};font-weight:600;">
          ${urgencyLabel}<br>
          <span style="font-size:11px;font-weight:400;">D-${Math.abs(d)}${d < 0 ? ' (지남)' : ''}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
          ${escapeHtml((t.expires_at || '').slice(0, 10))}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
          <a href="${escapeHtml(t.renewal_url)}" style="color:#3b82f6;text-decoration:none;">갱신 페이지 →</a>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:680px;color:#1f2937;">
      <h2 style="color:#dc2626;">🔑 토큰 만료 임박 알림</h2>
      <p>다음 토큰이 곧 만료됩니다. 만료 전에 갱신하지 않으면 해당 시스템이 멈춥니다.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">토큰</th>
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">긴급도</th>
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">만료일</th>
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">조치</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:12px;color:#6b7280;">갱신 후 새 토큰을 Vercel 환경변수에 등록하시면 시스템이 자동 갱신됩니다.</p>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px;">
        TravelWinners B2B · 토큰 만료 자동 알림 봇 (SQ-H, D-017 부칙 17)<br>
        매일 09:00 KST 자동 점검 · ${new Date().toISOString().slice(0, 10)}
      </p>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔑 토큰 만료 체크 시작:', new Date().toISOString());

  const registry = loadJSON(REGISTRY_PATH);
  if (!registry || !Array.isArray(registry.tokens)) {
    console.error('❌ tokens-registry.json 없음 또는 형식 오류:', REGISTRY_PATH);
    process.exit(1);
  }

  const activeTokens = registry.tokens.filter(t => t.active !== false);
  console.log(`📋 활성 토큰: ${activeTokens.length}개`);

  // 만료 임박 토큰 찾기
  const expiring = [];
  for (const t of activeTokens) {
    const d = daysUntil(t.expires_at);
    const warnDays = t.warn_days_before || 7;
    const status = d <= warnDays ? (d <= 0 ? 'EXPIRED' : d <= 3 ? 'URGENT' : 'WARN') : 'OK';
    console.log(`  ${status === 'OK' ? '✅' : status === 'WARN' ? '🟡' : status === 'URGENT' ? '🔴' : '🚨'} ${t.id}: D-${Math.abs(d)} (${(t.expires_at || '').slice(0, 10)}) [${status}]`);
    if (d <= warnDays) expiring.push(t);
  }

  // 중복 알림 방지 — 같은 날 같은 토큰은 1번만
  const today = new Date().toISOString().slice(0, 10);
  const log = loadJSON(LOG_PATH, { sent: [] });
  const alreadySent = new Set(log.sent.filter(e => e.date === today).map(e => e.token_id));

  const toSend = expiring.filter(t => !alreadySent.has(t.id));
  if (expiring.length > 0 && toSend.length === 0) {
    console.log(`\n📭 만료 임박 ${expiring.length}개 있지만 오늘 이미 모두 알림 발송됨 — 스킵`);
    return;
  }
  if (toSend.length === 0) {
    console.log('\n✅ 만료 임박 토큰 없음 — 메일 발송 스킵');
    return;
  }

  // 메일 발송
  console.log(`\n📧 메일 발송 시작: ${toSend.length}개 토큰`);
  const subject = toSend.length === 1
    ? `[TW B2B] 🔑 토큰 만료 임박: ${toSend[0].name} (D-${Math.abs(daysUntil(toSend[0].expires_at))})`
    : `[TW B2B] 🔑 토큰 ${toSend.length}개 만료 임박`;

  const result = await sendOpsEmail({
    subject,
    html: buildAlertEmail(toSend),
  });

  if (!result.ok) {
    console.error('❌ 메일 발송 실패:', result.error);
    process.exit(1);
  }

  console.log(`✅ 메일 발송 완료: resend_id=${result.id}`);

  // 발송 이력 갱신
  for (const t of toSend) {
    log.sent.push({
      date: today,
      token_id: t.id,
      expires_at: t.expires_at,
      days_until: daysUntil(t.expires_at),
      resend_id: result.id,
      sent_at: new Date().toISOString(),
    });
  }
  // 최근 90일치만 보관
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  log.sent = log.sent.filter(e => new Date(e.sent_at) >= cutoff);
  saveJSON(LOG_PATH, log);
  console.log(`📝 발송 이력 박음: _data/token-alert-log.json`);
}

main().catch(e => {
  console.error('❌ 봇 실행 실패:', e);
  process.exit(1);
});
