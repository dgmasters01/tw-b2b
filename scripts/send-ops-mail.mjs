// TW B2B — ops 메일 발송 (BL-OPS-MAIL-AUTOBOT)
//
// 동작:
//   1. tasks.json 로드
//   2. status=done이고 mail_sent 마커 없는 task 찾기 (또는 MANUAL_TASK_ID 지정)
//   3. Resend API로 메일 발송
//   4. response.id 받으면 task.history에 mail_sent 마커 박고 tasks.json 갱신
//
// Env:
//   RESEND_API_KEY   — 필수
//   MANUAL_TASK_ID   — 수동 트리거 시 특정 task만 발송
//   FORCE_SEND       — 이미 mail_sent 마커 있어도 다시 발송 (밀린 메일용)

import fs from 'node:fs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MANUAL_TASK_ID = (process.env.MANUAL_TASK_ID || '').trim();
const FORCE_SEND = process.env.FORCE_SEND === 'true';

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY missing');
  process.exit(1);
}

const tasksPath = 'tasks.json';
const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));

// 발송 후보 선정
let candidates = [];
if (MANUAL_TASK_ID) {
  const t = tasks.tasks.find(x => x.id === MANUAL_TASK_ID);
  if (!t) {
    console.error(`Task not found: ${MANUAL_TASK_ID}`);
    process.exit(1);
  }
  candidates = [t];
} else {
  // 자동: status=done이고 history에 mail_sent 없는 것
  candidates = tasks.tasks.filter(t => {
    if (t.status !== 'done') return false;
    if (FORCE_SEND) return true;
    const h = t.history || [];
    return !h.some(e => e.event && e.event.includes('mail_sent'));
  });
}

if (candidates.length === 0) {
  console.log('No tasks to mail');
  process.exit(0);
}

console.log(`Sending mails for ${candidates.length} task(s):`, candidates.map(t => t.id).join(', '));

const buildHtml = (t) => {
  const stepsTotal = t.progress?.steps?.length || 0;
  const stepsDone = t.progress?.steps?.filter(s => s.status === 'done').length || 0;
  const completedAt = t.completed_at || 'N/A';
  const startedAt = t.created_at || 'N/A';
  
  return `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#fafafa;color:#18181b;">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 50%,#06b6d4 100%);padding:4px;border-radius:12px;">
    <div style="background:#fff;padding:32px;border-radius:10px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;">🏁 작업 완료 — ${t.id}</h1>
      <p style="margin:0;color:#71717a;font-size:14px;">${t.title || ''}</p>
      <div style="margin:24px 0;padding:20px;background:#f4f4f5;border-radius:8px;border-left:4px solid #7c3aed;">
        <strong>${stepsDone}/${stepsTotal} 단계 완료</strong><br>
        <span style="color:#52525b;font-size:14px;">시작 ${startedAt} · 완료 ${completedAt}</span>
      </div>
      <h2 style="margin:24px 0 12px 0;font-size:16px;">진행 단계</h2>
      <ol style="padding-left:20px;line-height:1.8;font-size:14px;">
        ${(t.progress?.steps || []).map(s => `<li>${s.label || ''} ${s.status === 'done' ? '✅' : '⏳'}</li>`).join('')}
      </ol>
      ${t.notes ? `<h2 style="margin:24px 0 12px 0;font-size:16px;">메모</h2><p style="font-size:14px;line-height:1.6;">${t.notes.replace(/</g,'&lt;')}</p>` : ''}
      <p style="margin:32px 0 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
        라이브 → <a href="https://gohotelwinners.com/admin-status.html" style="color:#7c3aed;text-decoration:none;">gohotelwinners.com/admin-status.html</a><br>
        TravelWinners B2B Operations OS · ops-mail-bot 자동 발송
      </p>
    </div>
  </div>
</div>`;
};

const sentIds = [];
for (const t of candidates) {
  const subject = `[OPS 완료] ${t.id} — ${t.title || ''}`;
  const html = buildHtml(t);
  
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: '여행능력자들 <noreply@gohotelwinners.com>',
      to: ['dgmasters01@gmail.com'],
      subject,
      html
    })
  });
  const j = await r.json();
  
  if (!r.ok || !j.id) {
    console.error(`Mail FAILED for ${t.id}:`, j);
    continue;
  }
  
  console.log(`Mail sent for ${t.id}: ${j.id}`);
  sentIds.push({ taskId: t.id, mailId: j.id });
  
  // history에 mail_sent 마커 박기
  if (!t.history) t.history = [];
  t.history.push({
    at: new Date().toISOString(),
    event: `mail_sent — Resend id: ${j.id}`,
    by: 'ops-mail-bot'
  });
}

if (sentIds.length > 0) {
  // 최상위 updated_at도 갱신
  tasks.updated_at = new Date().toISOString();
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
  console.log(`tasks.json updated with ${sentIds.length} mail_sent marker(s)`);
}

console.log('Done. Sent:', sentIds.length);
