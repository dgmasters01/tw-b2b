// /api/email/ops/notify-claude-work.js
// Claude 작업 완료 시 자동 호출되는 운영 알림 endpoint
// 인증: x-ops-token 헤더 = process.env.CLAUDE_OPS_TOKEN
//
// Body:
//   {
//     step: string,          // 작업 단계명 (예: "Phase 3 Step 5", "RLS UPDATE 정책 보강")
//     summary: string,       // 작업 요약
//     checklist: string[],   // 확인 체크리스트
//     vercel_url: string,    // 배포 링크
//     blockers: string,      // 막힐 가능성 (옵션)
//     commit_hash: string,   // 커밋 해시 (옵션)
//   }

import { sendOpsEmail } from '../../_lib/email-sender.js';

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(body) {
  const step = escapeHtml(body.step || '(no step)');
  const summary = escapeHtml(body.summary || '');
  const checklist = Array.isArray(body.checklist) ? body.checklist : [];
  const vercelUrl = body.vercel_url || '';
  const blockers = escapeHtml(body.blockers || '');
  const commit = escapeHtml(body.commit_hash || '');
  const ts = new Date().toISOString();

  const checklistHtml = checklist.length
    ? '<ul>' + checklist.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'
    : '<p style="color:#888;">(체크리스트 없음)</p>';

  const vercelHtml = vercelUrl
    ? '<p><a href="' + escapeHtml(vercelUrl) + '" style="color:#2563eb;">' + escapeHtml(vercelUrl) + '</a></p>'
    : '<p style="color:#888;">(배포 링크 없음)</p>';

  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#222;">
  <h2 style="margin:0 0 8px;color:#0f172a;">✅ Claude 작업 완료</h2>
  <p style="color:#64748b;margin:0 0 16px;font-size:13px;">${escapeHtml(ts)}</p>

  <h3 style="margin:24px 0 8px;font-size:16px;">📌 단계</h3>
  <p style="margin:0;"><strong>${step}</strong>${commit ? ' <span style="color:#94a3b8;font-family:monospace;font-size:12px;">(' + commit + ')</span>' : ''}</p>

  <h3 style="margin:24px 0 8px;font-size:16px;">📝 작업 요약</h3>
  <div style="background:#f8fafc;padding:12px 16px;border-radius:6px;border-left:3px solid #3b82f6;white-space:pre-wrap;">${summary}</div>

  <h3 style="margin:24px 0 8px;font-size:16px;">✅ 확인 체크리스트</h3>
  ${checklistHtml}

  <h3 style="margin:24px 0 8px;font-size:16px;">🚀 Vercel 배포</h3>
  ${vercelHtml}

  ${blockers ? `<h3 style="margin:24px 0 8px;font-size:16px;">⚠️ 막힐 가능성</h3>
  <div style="background:#fef3c7;padding:12px 16px;border-radius:6px;border-left:3px solid #f59e0b;white-space:pre-wrap;">${blockers}</div>` : ''}

  <hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0;">
  <p style="color:#94a3b8;font-size:12px;margin:0;">TW B2B Ops · gohotelwinners.com</p>
</body></html>`;
}

function renderText(body) {
  const step = body.step || '(no step)';
  const summary = body.summary || '';
  const checklist = Array.isArray(body.checklist) ? body.checklist : [];
  const vercelUrl = body.vercel_url || '(없음)';
  const blockers = body.blockers || '';
  const commit = body.commit_hash || '';
  const ts = new Date().toISOString();

  let out = '✅ Claude 작업 완료\n';
  out += ts + '\n\n';
  out += '📌 단계: ' + step + (commit ? ' (' + commit + ')' : '') + '\n\n';
  out += '📝 작업 요약\n' + summary + '\n\n';
  out += '✅ 확인 체크리스트\n';
  if (checklist.length) {
    checklist.forEach(item => { out += '  - ' + item + '\n'; });
  } else {
    out += '  (없음)\n';
  }
  out += '\n🚀 Vercel: ' + vercelUrl + '\n';
  if (blockers) out += '\n⚠️ 막힐 가능성\n' + blockers + '\n';
  out += '\n--\nTW B2B Ops';
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 인증
  const expectedToken = process.env.CLAUDE_OPS_TOKEN;
  if (!expectedToken) {
    return res.status(500).json({ error: 'CLAUDE_OPS_TOKEN not configured on server' });
  }
  const providedToken = req.headers['x-ops-token'] || '';
  if (providedToken !== expectedToken) {
    return res.status(401).json({ error: 'Invalid or missing x-ops-token' });
  }

  // 2. body 검증
  const body = req.body || {};
  if (!body.step || !body.summary) {
    return res.status(400).json({ error: 'step and summary are required' });
  }

  // 3. 메일 발송
  const subject = '[TW B2B] ✅ ' + body.step + ' 완료';
  const result = await sendOpsEmail({
    subject,
    html: renderHtml(body),
    text: renderText(body),
  });

  if (!result.ok) {
    return res.status(502).json({ error: 'Failed to send ops email', detail: result.error });
  }

  // 4. CCF auto-status-updater — task_id 추출 후 응답에 detection 결과 포함
  // (Vercel 서버리스 = 파일시스템 read-only. 실제 tasks.json 쓰기는
  //  CLI/GitHub Actions 측 후속 작업이 처리. 여기선 detection만 반환.)
  let detectedTaskId = null;
  try {
    const blob = `${body.step || ''} ${body.summary || ''}`;
    const m = blob.match(/\b(BL-[A-Z][A-Z0-9-]+|D-\d{3,}|TASK-[A-Z][A-Z0-9-]+)\b/);
    if (body.task_id && /^[A-Z][A-Z0-9-]+$/.test(body.task_id)) detectedTaskId = body.task_id;
    else if (m) detectedTaskId = m[1];
  } catch (e) { /* swallow — detection 실패가 메일 성공을 뒤집지 않음 */ }

  return res.status(200).json({
    ok: true,
    email_id: result.id,
    ccf_detected_task_id: detectedTaskId,
  });
}
