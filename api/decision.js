// /api/decision.js
// BL-DECISION-MODAL-PINGPONG (2026-05-10) — 그림 맞추기 핑퐁 시스템 + BL 생성 + 결정 확정
//
// Vercel Hobby 12-function 제한 회피용 단일 라우터.
// action 파라미터(query string ?action=...)로 sub-handler 분기.
//
// [라우트 — 모두 인증: x-ops-token = CLAUDE_OPS_TOKEN]
//   POST ?action=bl-create        → tasks.json에 새 BL 추가 + commit (입구 1)
//   POST ?action=pingpong-round   → 핑퐁 라운드 1개 저장 (대표님 또는 Claude)
//   GET  ?action=pingpong-load    → 특정 BL의 핑퐁 라운드 전체 조회
//   POST ?action=decision-confirm → 결정 확정 (D-NNN 박음 + tasks status 전환 + chat-log 생성)
//   POST ?action=quick-task       → 대표님 한 줄 → 자동 BL 생성 (입구 4)
//
// 데이터 위치:
//   tasks.json (단일 진실원) — 헌법 부칙 11 (자동 stats 재계산)
//   _decisions/pingpong/{BL-ID}.json — 핑퐁 라운드 영구 저장
//   DECISIONS.md — 결정 D-NNN 박힘
//   _chat-logs/{date}-{slug}.md — chat-log 자동 생성

const GITHUB_REPO = 'dgmasters01/tw-b2b';
const GITHUB_API = 'https://api.github.com';

// ============================================================
// 인증 — dual: ops-token (Claude/봇) OR admin JWT (어드민 화면)
// ============================================================
async function checkAuth(req) {
  // 1) ops-token 우선 시도 (Claude/봇 호출)
  const expected = process.env.CLAUDE_OPS_TOKEN;
  const opsProvided = req.headers['x-ops-token'] || '';
  if (expected && opsProvided === expected) {
    return { ok: true, by: 'ops-token' };
  }

  // 2) admin JWT 시도 (어드민 페이지 호출)
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { ok: false, status: 401, error: 'No auth (need x-ops-token or Bearer JWT)' };

  // Supabase JWT 검증 — admin 테이블 조회
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return { ok: false, status: 500, error: 'Supabase env not configured' };
    }
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });
    const { data: { user }, error: uErr } = await sb.auth.getUser(token);
    if (uErr || !user) return { ok: false, status: 401, error: 'Invalid JWT' };

    const { data: caller } = await sb.from('admins')
      .select('id, email, role, is_active').eq('id', user.id).maybeSingle();
    if (!caller || !caller.is_active) {
      return { ok: false, status: 403, error: 'Inactive admin account' };
    }
    // Owner/Admin/Staff 모두 허용 (decision 도구는 사업 운영 도구)
    const allowed = ['owner', 'admin', 'staff'];
    if (!allowed.includes(caller.role)) {
      return { ok: false, status: 403, error: `Insufficient role: ${caller.role}` };
    }
    return { ok: true, by: 'admin-jwt', caller };
  } catch (e) {
    return { ok: false, status: 500, error: 'auth error: ' + e.message };
  }
}

// ============================================================
// GitHub 헬퍼 (PAT 사용)
// ============================================================
async function ghFetch(path, opts = {}) {
  const token = process.env.GITHUB_PAT;
  if (!token) throw new Error('GITHUB_PAT not configured');
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  return res;
}

// 파일 읽기 (raw + sha)
async function ghRead(path) {
  const res = await ghFetch(`/contents/${encodeURIComponent(path)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`gh read ${path}: ${res.status}`);
  const j = await res.json();
  const content = Buffer.from(j.content, 'base64').toString('utf-8');
  return { content, sha: j.sha };
}

// 파일 쓰기 (생성/갱신)
async function ghWrite(path, content, sha, message) {
  const body = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch: 'main',
  };
  if (sha) body.sha = sha;
  const res = await ghFetch(`/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`gh write ${path}: ${res.status} ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// ============================================================
// tasks.json stats 자동 재계산 (부칙 11)
// ============================================================
function recalcStats(tasks) {
  return {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    autonomous_ready: tasks.filter(t => (t.autonomous || t.claude_can_auto) && (t.status === 'pending' || t.status === 'in_progress')).length,
    todo: 0,
    cancelled: 0,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================
// HANDLER 1: bl-create (입구 1 — Claude가 새 BL 박기 표준)
// ============================================================
async function handleBlCreate(req, res) {
  const body = req.body || {};
  const required = ['id', 'title', 'category', 'priority', 'size', 'why'];
  for (const k of required) {
    if (!body[k]) return res.status(400).json({ error: `${k} is required` });
  }

  // tasks.json fetch
  const file = await ghRead('tasks.json');
  if (!file) return res.status(500).json({ error: 'tasks.json not found' });

  let data;
  try { data = JSON.parse(file.content); } catch (_) {
    return res.status(500).json({ error: 'tasks.json parse failed' });
  }

  // 중복 점검
  if (data.tasks.some(t => t.id === body.id)) {
    return res.status(409).json({ error: `task already exists: ${body.id}` });
  }

  const now = new Date().toISOString();
  const newTask = {
    id: body.id,
    title: body.title,
    category: body.category,
    priority: body.priority,
    size: body.size,
    status: body.status || 'pending',
    autonomous: body.autonomous !== false,
    approval_required: body.approval_required === true,
    estimated_hours: body.estimated_hours || null,
    why: body.why,
    progress: body.progress || { percent: 0, steps: [] },
    pingpong_turn: body.pingpong_turn || (body.approval_required ? 'ceo' : null),
    decision_summary: null,
    created_at: now,
    started_at: body.status === 'in_progress' ? now : null,
  };

  data.tasks.push(newTask);
  data.stats = recalcStats(data.tasks);

  await ghWrite(
    'tasks.json',
    JSON.stringify(data, null, 2),
    file.sha,
    `feat(${body.id}): 새 BL 자동 생성 — ${body.title.slice(0, 60)}`
  );

  return res.status(200).json({ ok: true, task: newTask, stats: data.stats });
}

// ============================================================
// HANDLER 2: pingpong-round (단계 2 — 핑퐁 라운드 저장)
// ============================================================
async function handlePingpongRound(req, res) {
  const { task_id, round_index, side, text } = req.body || {};
  if (!task_id || side === undefined || text === undefined) {
    return res.status(400).json({ error: 'task_id, side(ceo|claude), text required' });
  }
  if (side !== 'ceo' && side !== 'claude') {
    return res.status(400).json({ error: 'side must be ceo or claude' });
  }

  const path = `_decisions/pingpong/${task_id}.json`;
  const file = await ghRead(path);
  let rounds = [];
  let sha = null;
  if (file) {
    sha = file.sha;
    try { rounds = JSON.parse(file.content); } catch (_) { rounds = []; }
  }

  const idx = (round_index === undefined || round_index === null) ? rounds.length : round_index;
  while (rounds.length <= idx) rounds.push({ ceo: '', claude: '', at: null });

  rounds[idx][side] = text;
  rounds[idx].at = new Date().toISOString();

  // 차례 자동 전환: ceo가 적었으면 → Claude 차례, claude가 적었으면 → CEO 차례
  const nextTurn = side === 'ceo' ? 'claude' : 'ceo';

  await ghWrite(
    path,
    JSON.stringify(rounds, null, 2),
    sha,
    `pingpong(${task_id}): round ${idx + 1} ${side}`
  );

  // tasks.json의 pingpong_turn 동기화
  const tj = await ghRead('tasks.json');
  if (tj) {
    const data = JSON.parse(tj.content);
    const task = data.tasks.find(t => t.id === task_id);
    if (task) {
      task.pingpong_turn = nextTurn;
      task.pingpong_rounds = rounds.length;
      data.stats = recalcStats(data.tasks);
      await ghWrite('tasks.json', JSON.stringify(data, null, 2), tj.sha,
        `pingpong(${task_id}): turn → ${nextTurn}`);
    }
  }

  return res.status(200).json({ ok: true, rounds, next_turn: nextTurn });
}

// ============================================================
// HANDLER 3: pingpong-load (라운드 조회)
// ============================================================
async function handlePingpongLoad(req, res) {
  const task_id = req.query.task_id;
  if (!task_id) return res.status(400).json({ error: 'task_id required' });

  const path = `_decisions/pingpong/${task_id}.json`;
  const file = await ghRead(path);
  if (!file) return res.status(200).json({ rounds: [], exists: false });

  try {
    const rounds = JSON.parse(file.content);
    return res.status(200).json({ rounds, exists: true });
  } catch (_) {
    return res.status(500).json({ error: 'parse failed' });
  }
}

// ============================================================
// HANDLER 4: decision-confirm (단계 9·10 — C안 결정 확정)
// ============================================================
async function handleDecisionConfirm(req, res) {
  const { task_id, decision_summary } = req.body || {};
  if (!task_id || !decision_summary) {
    return res.status(400).json({ error: 'task_id and decision_summary required' });
  }

  // 1) 핑퐁 라운드 fetch
  const ppFile = await ghRead(`_decisions/pingpong/${task_id}.json`);
  const rounds = ppFile ? JSON.parse(ppFile.content) : [];

  // 2) tasks.json 갱신 — pending → in_progress + decision_summary
  const tj = await ghRead('tasks.json');
  if (!tj) return res.status(500).json({ error: 'tasks.json not found' });
  const data = JSON.parse(tj.content);
  const task = data.tasks.find(t => t.id === task_id);
  if (!task) return res.status(404).json({ error: `task not found: ${task_id}` });

  task.status = 'in_progress';
  task.decision_summary = decision_summary;
  task.pingpong_turn = 'done';
  task.started_at = task.started_at || new Date().toISOString();
  data.stats = recalcStats(data.tasks);

  // 3) DECISIONS.md에 D-NNN 박음
  const decFile = await ghRead('DECISIONS.md');
  let decContent = decFile ? decFile.content : '# DECISIONS.md\n\n';
  const lastDMatch = decContent.match(/D-(\d{3})/g) || [];
  const nums = lastDMatch.map(s => parseInt(s.slice(2), 10));
  const nextN = nums.length ? Math.max(...nums) + 1 : 1;
  const decId = `D-${String(nextN).padStart(3, '0')}`;
  const today = new Date().toISOString().slice(0, 10);

  const decBlock = `\n### 결정 ${decId}: ${task_id} — ${decision_summary} ⭐ ${today}\n\n` +
    `**확정 시각**: ${new Date().toISOString()}\n\n` +
    `**결정 한 줄**: ${decision_summary}\n\n` +
    (rounds.length ? `**핑퐁 라운드 (${rounds.length}회)**:\n\n` +
      rounds.map((r, i) => `**라운드 ${i + 1}**\n- 대표님: ${r.ceo || '(빈)'}\n- Claude: ${r.claude || '(빈)'}`).join('\n\n')
      : '_핑퐁 라운드 없음 (즉시 확정)_') +
    `\n\n---\n`;

  // 첫 결정 다음에 박음 (헤더 다음)
  const firstHeader = decContent.indexOf('### 결정 D-');
  if (firstHeader > 0) {
    decContent = decContent.slice(0, firstHeader) + decBlock + '\n' + decContent.slice(firstHeader);
  } else {
    decContent += decBlock;
  }

  await ghWrite('DECISIONS.md', decContent, decFile?.sha,
    `feat(${decId}): ${task_id} 결정 확정 — ${decision_summary.slice(0, 50)}`);
  await ghWrite('tasks.json', JSON.stringify(data, null, 2), tj.sha,
    `feat(${task_id}): 결정 확정 ${decId} — pending → in_progress`);

  return res.status(200).json({ ok: true, decision_id: decId, task });
}

// ============================================================
// HANDLER 5: quick-task (입구 4 — 대표님 한 줄 → 자동 BL)
// ============================================================
async function handleQuickTask(req, res) {
  const { text } = req.body || {};
  if (!text || text.trim().length < 5) {
    return res.status(400).json({ error: 'text required (min 5 chars)' });
  }

  const trimmed = text.trim();

  // 자동 ID 생성: BL-QT-{YYMMDD-HHMM}
  const now = new Date();
  const ymd = now.toISOString().slice(2, 16).replace(/[-T:]/g, '');
  const id = `BL-QT-${ymd}`;

  // 카테고리 자동 추측 (간단 키워드 매칭)
  const t = trimmed.toLowerCase();
  let category = 'feature';
  if (/fix|버그|결함|에러|오류/.test(t)) category = 'fix';
  else if (/디자인|색|폰트|레이아웃|배치/.test(t)) category = 'design';
  else if (/문서|docs|readme|매뉴얼/.test(t)) category = 'docs';
  else if (/봇|자동|sync|scan|스크립트/.test(t)) category = 'infra';
  else if (/ux|사용자|경험|버튼|클릭/.test(t)) category = 'ux';

  // priority 추측
  let priority = 'P2';
  if (/긴급|급함|asap|p0/i.test(text)) priority = 'P0';
  else if (/중요|p1/i.test(text)) priority = 'P1';

  // size 추측 (글자 수 기반)
  const size = trimmed.length < 30 ? 'small' : trimmed.length < 100 ? 'medium' : 'L';

  // 호출 chain → bl-create
  const blPayload = {
    id,
    title: trimmed.slice(0, 80),
    category,
    priority,
    size,
    why: `대표님 빠른 입력 (${now.toISOString()}): ${trimmed}`,
    status: 'pending',
    autonomous: true,
    approval_required: true,  // 그림 맞추기 거쳐야 시작
    pingpong_turn: 'ceo',
  };

  // 직접 처리 (재귀 fetch 안 함)
  req.body = blPayload;
  return handleBlCreate(req, res);
}

// ============================================================
// 메인 라우터
// ============================================================
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ops-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 인증 (dual: ops-token OR admin JWT)
  const auth = await checkAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const action = (req.query.action || '').toLowerCase();

  try {
    switch (action) {
      case 'bl-create':
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        return await handleBlCreate(req, res);

      case 'pingpong-round':
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        return await handlePingpongRound(req, res);

      case 'pingpong-load':
        if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
        return await handlePingpongLoad(req, res);

      case 'decision-confirm':
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        return await handleDecisionConfirm(req, res);

      case 'quick-task':
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
        return await handleQuickTask(req, res);

      default:
        return res.status(400).json({
          error: 'unknown action',
          available: ['bl-create', 'pingpong-round', 'pingpong-load', 'decision-confirm', 'quick-task']
        });
    }
  } catch (e) {
    console.error('[/api/decision]', action, e);
    return res.status(500).json({ error: e.message || 'internal error' });
  }
}
