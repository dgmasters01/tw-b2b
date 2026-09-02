// api/_lib/db-backup.js
// BL-DB-BACKUP — Supabase DB 매일 백업 → **비공개** GitHub 레포
//
// 왜 있나 (2026-07-16 인계서 최우선):
//   Supabase FREE = 자동 백업 대상 아님. LAST BACKUP = No backups.
//   예약 7,316행 · 호텔 3,185행 = 사업 전부가 그물 없이 매달려 있었다.
//   Pro($25/월 = 연 44만원 = 호텔 2곳 계약분)를 사는 대신 비용 0원으로 헌법 9조 이중 백업을 만든다.
//
// 🚨 반드시 **비공개(private)** 레포여야 한다:
//   hotels 에 contact_name·contact_email·contact_phone·address(호텔 사장님 연락처 3,185개)가 들어있다.
//   공개 레포에 넣으면 그대로 전 세계 공개다. BACKUP_REPO 는 private 아니면 봇이 스스로 거부한다(아래 assertPrivate).
//
// 저장 방식 = **같은 경로에 덮어쓰기**(날짜 폴더 아님).
//   git 델타 압축이 바뀐 줄만 저장한다. 실측: 30일 커밋 후에도 1.2MB → 1.2MB(하루 증가 0.00MB).
//   날짜 폴더로 쌓으면 이 이점이 통째로 사라진다. 되돌리기는 git 이력으로 한다.
//
// 환경변수:
//   BACKUP_REPO           : "owner/repo" (예: dgmasters01/tw-b2b-backup)  ← 대표님이 Vercel에 등록
//   BACKUP_PAT            : (선택) 없으면 GITHUB_PAT 재사용
//   GITHUB_PAT            : 기존 창구가 쓰던 PAT
//   SUPABASE_ACCESS_TOKEN : 기존 db-query 가 쓰던 것 그대로

const SUPABASE_MGMT_API = 'https://api.supabase.com';
const GITHUB_API = 'https://api.github.com';
const PROJECT_REF = 'vjsludfjsphwnumuoqaj';

const PAGE = 2000;          // 표 하나를 이 행수씩 끊어 가져온다 (관리 API 응답 폭발 방지)
const MAX_ROWS_PER_TABLE = 200000;

function pat() {
  return process.env.BACKUP_PAT || process.env.GITHUB_PAT || '';
}

function ghHeaders() {
  return {
    'Authorization': `Bearer ${pat()}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tw-b2b-db-backup/1.0',
  };
}

// ---------- Supabase ----------

export async function sbQuery(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN 없음');
  const resp = await fetch(`${SUPABASE_MGMT_API}/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'tw-b2b-claude/1.0', // 필수 — 없으면 Cloudflare 차단
    },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`supabase ${resp.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return []; }
}

// 🔴 2026-07-17 — **백업이 시간 초과로 죽기 직전이었다.** 실측: 표 39개 · 109MB · 300초 넘겨 응답 없음.
//    어제(21,500행)는 86초였다. 어제 아고다 재고 20만 행이 들어오면서 넘겼다.
//    병목 둘: ① 2,000행씩 끊어 읽어서 아고다 표 4개에만 **관리 API 100번 이상** ② 46MB blob 업로드.
//
// 확정 — **재현 가능한 표는 백업하지 않는다.**
//    백업의 목적은 **「잃으면 못 되찾는 것」**을 지키는 것이다(헌법 9조 가역성).
//    아래 표들은 **우리가 만든 게 아니라 아고다 파일의 사본**이고, 받는 법이 레포에 박혀 있다:
//      `python3 _os/tools/agoda-file-load.py --url <파일> --step all`
//    → 잃어도 **2분이면 다시 받는다.** 이것 때문에 hotels·bookings 백업까지 죽으면 그게 진짜 사고다.
//    ⚠️ 여기 표를 더할 땐 **정말 재현되는지** 먼저 확인할 것. 재현법이 없으면 절대 넣지 말 것.
const REGENERABLE = {
  agoda_inventory:      'agoda-file-load.py --step inventory (아고다 숙소 데이터 파일)',
  agoda_inventory_name: 'agoda-file-load.py --step inventory (같은 파일 · 언어별 이름)',
  agoda_city_name:      'agoda-file-load.py --step cities (같은 파일 · 도시 분모)',
  agoda_city:           '아고다 도시 목록 (EN 파일)',
};

export async function listTables() {
  const rows = await sbQuery(`
    SELECT c.relname AS tbl, pg_total_relation_size(c.oid) AS bytes
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);
  return rows.map(r => ({ table: r.tbl, bytes: Number(r.bytes) }));
}

// 표 설계도 = CREATE TABLE + 인덱스. 데이터만 있고 설계도가 없으면 복구가 안 된다.
export async function dumpSchema() {
  const cols = await sbQuery(`
    SELECT table_name, ordinal_position, column_name, data_type,
           character_maximum_length AS maxlen, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const idx = await sbQuery(`
    SELECT tablename, indexdef FROM pg_indexes
    WHERE schemaname = 'public' ORDER BY tablename, indexname
  `);

  const byTable = {};
  for (const c of cols) (byTable[c.table_name] ||= []).push(c);

  const out = [
    '-- TW B2B — 표 설계도 (자동 생성 · api/_lib/db-backup.js)',
    `-- 생성: ${new Date().toISOString()}`,
    '-- 이 파일이 있어야 데이터(CSV)를 되돌릴 그릇을 다시 만들 수 있다.',
    '',
  ];
  for (const t of Object.keys(byTable).sort()) {
    out.push(`CREATE TABLE IF NOT EXISTS public.${t} (`);
    const defs = byTable[t].map(c => {
      let type = c.data_type;
      if (c.maxlen) type += `(${c.maxlen})`;
      let line = `  ${c.column_name} ${type}`;
      if (c.column_default) line += ` DEFAULT ${c.column_default}`;
      if (c.is_nullable === 'NO') line += ' NOT NULL';
      return line;
    });
    out.push(defs.join(',\n'));
    out.push(');', '');
    for (const i of idx.filter(x => x.tablename === t)) out.push(i.indexdef + ';');
    out.push('');
  }
  return out.join('\n');
}

// ---------- CSV ----------

function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function dumpTableCsv(table) {
  const lines = [];
  let header = null;
  let offset = 0;
  let total = 0;

  while (offset < MAX_ROWS_PER_TABLE) {
    // ctid 정렬 = 어떤 표든 정렬 가능(PK 이름을 몰라도 됨) + 페이지 간 중복/누락 방지
    const rows = await sbQuery(
      `SELECT * FROM public."${table}" ORDER BY ctid LIMIT ${PAGE} OFFSET ${offset}`
    );
    if (!Array.isArray(rows) || rows.length === 0) break;
    if (!header) {
      header = Object.keys(rows[0]);
      lines.push(header.map(csvCell).join(','));
    }
    for (const r of rows) lines.push(header.map(h => csvCell(r[h])).join(','));
    total += rows.length;
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  if (!header) lines.push('(빈 표)');
  return { csv: lines.join('\n') + '\n', rows: total };
}

// ---------- GitHub (Git Data API = 하루 커밋 1개로 묶는다) ----------

// 공개 레포에 백업을 넣는 사고를 코드가 막는다. 사람 기억에 맡기지 않는다.
async function assertPrivate(repo) {
  const r = await fetch(`${GITHUB_API}/repos/${repo}`, { headers: ghHeaders() });
  if (r.status === 404) throw new Error(`창고 없음 또는 PAT 권한 없음: ${repo} (fine-grained PAT면 이 레포를 권한에 추가해야 함)`);
  if (!r.ok) throw new Error(`repo 조회 실패 ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const info = await r.json();
  if (info.private !== true) {
    throw new Error(`거부: ${repo} 가 public 이다. 호텔 사장님 연락처가 들어있는 백업은 private 에만 넣는다.`);
  }
  return info;
}

async function gh(path, method, body) {
  const r = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`github ${method} ${path} ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}

async function commitFiles(repo, branch, files, message) {
  const ref = await gh(`/repos/${repo}/git/ref/heads/${branch}`, 'GET');
  const baseSha = ref.object.sha;
  const baseCommit = await gh(`/repos/${repo}/git/commits/${baseSha}`, 'GET');

  const tree = [];
  for (const f of files) {
    const blob = await gh(`/repos/${repo}/git/blobs`, 'POST', {
      content: Buffer.from(f.content, 'utf8').toString('base64'),
      encoding: 'base64',
    });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await gh(`/repos/${repo}/git/trees`, 'POST', { base_tree: baseCommit.tree.sha, tree });
  const commit = await gh(`/repos/${repo}/git/commits`, 'POST', {
    message, tree: newTree.sha, parents: [baseSha],
  });
  await gh(`/repos/${repo}/git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: false });
  return commit.sha;
}

// ---------- 진행 기록 (backup_progress) ----------
// 🔴 «어디까지 했나» 를 남겨야 다음 회차가 이어서 할 수 있다.
//    이 표가 없으면 매 회차 처음부터 시작해 영영 안 끝난다(33일 공백의 구조적 원인).

async function sql(q) {
  const r = await fetch('https://www.staycurate.com/api/ops/db-query', {
    method: 'POST',
    headers: { 'x-ops-token': process.env.CLAUDE_OPS_TOKEN || process.env.OPS_TOKEN || '',
               'x-ops-client': 'studio', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error('진행기록 조회 실패: ' + JSON.stringify(d).slice(0, 160));
  return d.rows || [];
}

async function loadDone(day) {
  try {
    const rows = await sql(`select table_name from backup_progress
      where run_date = '${day}' and status = 'ok'`);
    return rows.map((r) => r.table_name);
  } catch (e) { return []; }   // 못 읽으면 처음부터 — 헛돌지언정 멈추지 않는다
}

async function saveDone(day, list, schemaDone) {
  const vals = list.map((x) =>
    `('${day}','${String(x.table).replace(/'/g, "''")}',0,${x.rows},${x.bytes},'ok')`);
  if (schemaDone) vals.push(`('${day}','__schema__',0,0,0,'ok')`);
  if (!vals.length) return;
  try {
    await sql(`insert into backup_progress
      (run_date, table_name, chunk_no, rows_done, bytes, status)
      values ${vals.join(',')}
      on conflict (run_date, table_name, chunk_no) do nothing`);
  } catch (e) { /* 기록 실패가 백업을 막지 않는다 */ }
}

// ---------- 본체 ----------

export async function runBackup({ dryRun = false } = {}) {
  const started = Date.now();
  const repo = process.env.BACKUP_REPO || '';
  const notes = [];

  if (!repo) throw new Error('BACKUP_REPO 환경변수 없음 (예: dgmasters01/tw-b2b-backup)');
  if (!pat()) throw new Error('BACKUP_PAT / GITHUB_PAT 둘 다 없음');

  const info = await assertPrivate(repo);
  const branch = info.default_branch || 'main';
  notes.push(`창고 ${repo} = private ✅ (기본 브랜치 ${branch})`);
  notes.push(process.env.BACKUP_PAT ? 'PAT = BACKUP_PAT' : 'PAT = GITHUB_PAT 재사용');

  const all = await listTables();
  const tables = all.filter((t) => !REGENERABLE[t.table]);
  const skipped = all.filter((t) => REGENERABLE[t.table]);
  if (skipped.length) {
    notes.push(`재현 가능한 표 ${skipped.length}개는 건너뜀 (${(skipped.reduce((s2, t) => s2 + t.bytes, 0) / 1048576).toFixed(0)}MB): `
      + skipped.map((t) => t.table).join(', '));
  }

  if (dryRun) {
    return {
      ok: true, dry_run: true, repo, branch, notes,
      tables: tables.length,
      skipped: skipped.map((t) => ({ table: t.table, mb: +(t.bytes / 1048576).toFixed(1), regenerate: REGENERABLE[t.table] })),
      approx_mb: +(tables.reduce((s, t) => s + t.bytes, 0) / 1048576).toFixed(1),
      would_write: ['schema/tables.sql', ...tables.map(t => `data/${t.table}.csv`), '_manifest.json'],
      elapsed_sec: +((Date.now() - started) / 1000).toFixed(1),
    };
  }

  // 🔴 2026-09-02 «한 회차에 되는 만큼만 하고 이어서 한다» (대표님 지시 · BUSINESS-MAP §5-C)
  //    왜: 표 105개 2.6GB 를 한 번에 모아 커밋하면 300초를 넘겨 죽는다.
  //        실측 — 2026-07-31 이후 33일 동안 «한 번도» 성공하지 못했다.
  //        크론은 매일 돌았지만 끝까지 못 가서, 명부에는 «돎» 으로 보였다.
  //    어떻게: backup_progress 에 «이 날짜에 어느 표까지 끝냈나» 를 적고,
  //        다음 회차가 그 다음 표부터 이어서 한다. 하루 안에 여러 회차로 나눠 끝낸다.
  //    🔴 시각: UTC 18:00~18:50 에 10분 간격 6회. 이 시간대는 두 레포 통틀어 비어 있다(CRON-PLAN §10).
  //        한 회차 최대 300초, 다음 회차까지 10분이라 겹치지 않는다.
  const BUDGET_MS = 240000;   // 300초 제한 중 240초만 쓴다. 커밋에 쓸 여유를 남긴다
  const today = new Date().toISOString().slice(0, 10);

  const doneSet = new Set(await loadDone(today));
  const todo = tables.filter((t) => !doneSet.has(t.table));

  const files = [];
  // 🔑 건너뛴 표는 **manifest 에 재현법을 남긴다.** 안 적으면 다음 사람이 "왜 없지?" 를 묻는다
  const manifest = { generated_at: new Date().toISOString(), project_ref: PROJECT_REF, tables: {},
    skipped_regenerable: skipped.reduce((m, t) => (m[t.table] = REGENERABLE[t.table], m), {}) };

  // 스키마는 첫 회차에만
  if (!doneSet.has('__schema__')) {
    files.push({ path: 'schema/tables.sql', content: await dumpSchema() });
  }

  const didNow = [];
  for (const t of todo) {
    if (Date.now() - started > BUDGET_MS) break;   // 🔴 시간이 다 되면 여기까지. 다음 회차가 이어 한다
    const { csv, rows } = await dumpTableCsv(t.table);
    files.push({ path: `data/${t.table}.csv`, content: csv });
    manifest.tables[t.table] = { rows, bytes: csv.length };
    didNow.push({ table: t.table, rows, bytes: csv.length });
  }

  if (!files.length) {
    // 오늘 몫이 이미 다 끝났다 — 헛돌지 않는다
    return {
      ok: true, repo, branch, notes, done_today: doneSet.size, remaining: 0,
      message: '오늘 백업은 이미 끝났습니다.',
      elapsed_sec: +((Date.now() - started) / 1000).toFixed(1),
    };
  }

  manifest.total_rows = Object.values(manifest.tables).reduce((s, x) => s + x.rows, 0);
  manifest.elapsed_sec = +((Date.now() - started) / 1000).toFixed(1);
  manifest.part_of = { done_before: doneSet.size, this_run: didNow.length, total: tables.length };
  files.push({ path: `_manifest-${today}.json`, content: JSON.stringify(manifest, null, 2) + '\n' });

  const left = todo.length - didNow.length;
  const msg = `백업 ${today} · 이번 회차 표 ${didNow.length}개 · ${manifest.total_rows.toLocaleString()}행`
    + (left > 0 ? ` · 남은 표 ${left}개(다음 회차에)` : ' · 🔴 오늘 몫 완료');
  const sha = await commitFiles(repo, branch, files, msg);

  // 🔴 커밋이 «성공한 뒤에» 기록한다. 먼저 적으면 «했다고 착각» 한다
  await saveDone(today, didNow, files.some((f) => f.path === 'schema/tables.sql'));

  return {
    ok: true, repo, branch, commit: sha.slice(0, 8),
    이번회차_표: didNow.length,
    누적_끝난표: doneSet.size + didNow.length,
    전체_표: tables.length,
    남은_표: left,
    오늘_완료: left === 0,
    total_rows: manifest.total_rows,
    elapsed_sec: +((Date.now() - started) / 1000).toFixed(1),
    notes,
  };
}

