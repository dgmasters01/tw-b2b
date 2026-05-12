// TW B2B — ops 메일 발송 (BL-OPS-MAIL-AUTOBOT + BL-OPS-MAIL-QUOTA-FIX 2026-05-12)
//
// 동작:
//   1. tasks.json 로드
//   2. status=done이고 mail_sent 마커 없는 task 찾기 (또는 MANUAL_TASK_ID 지정)
//   3. ★ BL-OPS-MAIL-QUOTA-FIX (2026-05-12):
//      a) 묶음 발송 — N건 후보가 있어도 1통으로 묶기 (Resend 일일 100통 한도 보호)
//      b) 빈도 제한 — _ops-mail-state.json의 last_sent_at 비교, 1시간 내 재발송 차단
//      c) 긴급 우회 — task.priority='P0' 또는 task.category='fix' && title에 '한도|폭주|down' → 가드 무시
//   4. Resend API로 메일 1통 발송 (묶음 본문)
//   5. response.id 받으면 모든 묶음 task에 mail_sent 마커 박기 + state.json 갱신
//
// Env:
//   RESEND_API_KEY   — 필수
//   MANUAL_TASK_ID   — 수동 트리거 시 특정 task만 발송 (가드 우회)
//   FORCE_SEND       — 이미 mail_sent 있어도 다시 발송 + 가드 우회 (밀린 메일용)

import fs from 'node:fs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MANUAL_TASK_ID = (process.env.MANUAL_TASK_ID || '').trim();
const FORCE_SEND = process.env.FORCE_SEND === 'true';

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY missing');
  process.exit(1);
}

const tasksPath = 'tasks.json';
const statePath = '_ops-mail-state.json';
const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));

// ★ BL-OPS-MAIL-QUOTA-FIX: 빈도 제한 state 로드
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (_) {
    return { last_sent_at: null, last_batch_count: 0, daily_count: 0, daily_date: '' };
  }
}
function saveState(s) {
  fs.writeFileSync(statePath, JSON.stringify(s, null, 2));
}
const state = loadState();
const NOW = new Date();
const NOW_ISO = NOW.toISOString();
const TODAY = NOW_ISO.slice(0, 10);

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

// ★ BL-OPS-MAIL-QUOTA-FIX: 빈도 제한 검사 (수동/긴급 우회)
const isUrgent = candidates.some(t =>
  t.priority === 'P0' &&
  /한도|폭주|down|outage|critical|장애|긴급/i.test((t.title || '') + (t.notes || ''))
);
const isManualOrForced = !!(MANUAL_TASK_ID || FORCE_SEND);

if (!isManualOrForced && !isUrgent && state.last_sent_at) {
  const lastSent = new Date(state.last_sent_at);
  const minutesSinceLast = (NOW - lastSent) / 60000;
  if (minutesSinceLast < 60) {
    console.log(`[quota-guard] 1시간 내 재발송 차단 (마지막 발송 ${Math.round(minutesSinceLast)}분 전).`);
    console.log(`[quota-guard] 대기 중인 task ${candidates.length}건은 다음 발송 시 묶임.`);
    console.log(`[quota-guard] 우회 방법: workflow_dispatch + force_send=true 또는 task에 'P0' + '긴급/한도/폭주' 키워드`);
    process.exit(0);
  }
}

// ★ 일일 한도 가드 — Resend free tier 일일 100통 → 50통 도달 시 알람
if (state.daily_date === TODAY && state.daily_count >= 80) {
  console.error(`[quota-guard] ⛔ 일일 발송 80통 초과 — 발송 중단. daily_count=${state.daily_count}`);
  process.exit(1);
}

console.log(`[BL-OPS-MAIL-QUOTA-FIX] ${candidates.length}건 묶음 발송 — ${candidates.map(t => t.id).join(', ')}`);

// ★ BL-OPS-MAIL-QUOTA-FIX: 묶음 본문 빌더 (N건 → 1통)
function buildBundleHtml(taskList) {
  const count = taskList.length;
  const isBundle = count > 1;
  const headerEmoji = isBundle ? '📦' : '🏁';
  const headerTitle = isBundle ? `${count}건 작업 완료 (묶음)` : `작업 완료 — ${taskList[0].id}`;

  const taskCards = taskList.map(t => {
    const stepsTotal = t.progress?.steps?.length || 0;
    const stepsDone = t.progress?.steps?.filter(s => s.status === 'done').length || 0;
    const completedAt = t.completed_at || 'N/A';
    const priColor = { P0: '#ef4444', P1: '#f97316', P2: '#eab308', P3: '#06b6d4' }[t.priority] || '#71717a';
    return `<div style="margin:16px 0;padding:16px;background:#f4f4f5;border-radius:8px;border-left:4px solid ${priColor};">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <strong style="font-size:15px;">${t.id}</strong>
        <span style="background:${priColor};color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;">${t.priority || '?'}</span>
        <span style="color:#71717a;font-size:12px;">${stepsDone}/${stepsTotal} 단계</span>
      </div>
      <div style="font-size:14px;color:#27272a;margin-bottom:6px;">${(t.title || '').replace(/</g,'&lt;')}</div>
      <div style="font-size:12px;color:#71717a;">완료 ${completedAt}</div>
    </div>`;
  }).join('');

  return `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#fafafa;color:#18181b;">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 50%,#06b6d4 100%);padding:4px;border-radius:12px;">
    <div style="background:#fff;padding:32px;border-radius:10px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;">${headerEmoji} ${headerTitle}</h1>
      <p style="margin:0;color:#71717a;font-size:14px;">${NOW_ISO} · TW B2B Operations OS</p>
      ${isBundle ? `<div style="margin:16px 0;padding:12px;background:#eef2ff;border-radius:6px;border-left:3px solid #6366f1;font-size:13px;color:#3730a3;">📊 BL-OPS-MAIL-QUOTA-FIX 묶음 발송 — Resend 일일 한도 보호. ${count}건이 1통으로 묶임.</div>` : ''}
      ${taskCards}
      <p style="margin:32px 0 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
        라이브 → <a href="https://gohotelwinners.com/admin-status.html" style="color:#7c3aed;text-decoration:none;">gohotelwinners.com/admin-status.html</a><br>
        TravelWinners B2B Operations OS · ops-mail-bot 자동 발송
      </p>
    </div>
  </div>
</div>`;
}

const subject = candidates.length > 1
  ? `[OPS 묶음] ${candidates.length}건 완료 — ${candidates[0].id}${candidates.length > 1 ? ' 외 ' + (candidates.length - 1) + '건' : ''}`
  : `[OPS 완료] ${candidates[0].id} — ${candidates[0].title || ''}`;

const html = buildBundleHtml(candidates);

// 1통 발송
const r = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'TW B2B Ops <ops@gohotelwinners.com>',
    to: ['dgmasters01@gmail.com'],
    subject,
    html
  })
});
const j = await r.json();

if (!r.ok || !j.id) {
  console.error('Mail FAILED:', j);
  process.exit(1);
}

console.log(`Mail sent — Resend id: ${j.id} (${candidates.length}건 묶음)`);

// 모든 묶음 task에 mail_sent 마커 박기
for (const t of candidates) {
  if (!t.history) t.history = [];
  t.history.push({
    at: NOW_ISO,
    event: `mail_sent — Resend id: ${j.id} (bundle ${candidates.length})`,
    by: 'ops-mail-bot'
  });
}

// tasks.json 갱신
tasks.updated_at = NOW_ISO;
fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

// state.json 갱신
const dailyCount = (state.daily_date === TODAY ? state.daily_count : 0) + 1;
saveState({
  last_sent_at: NOW_ISO,
  last_batch_count: candidates.length,
  daily_count: dailyCount,
  daily_date: TODAY,
  last_resend_id: j.id,
  last_subject: subject,
});

console.log(`tasks.json + _ops-mail-state.json 갱신. daily_count=${dailyCount}/100`);
console.log('Done.');
