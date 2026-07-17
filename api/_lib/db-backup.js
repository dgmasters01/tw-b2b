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

  const files = [];
  // 🔑 건너뛴 표는 **manifest 에 재현법을 남긴다.** 안 적으면 다음 사람이 "왜 없지?" 를 묻는다
  const manifest = { generated_at: new Date().toISOString(), project_ref: PROJECT_REF, tables: {},
    skipped_regenerable: skipped.reduce((m, t) => (m[t.table] = REGENERABLE[t.table], m), {}) };

  files.push({ path: 'schema/tables.sql', content: await dumpSchema() });

  for (const t of tables) {
    const { csv, rows } = await dumpTableCsv(t.table);
    files.push({ path: `data/${t.table}.csv`, content: csv });
    manifest.tables[t.table] = { rows, bytes: csv.length };
  }

  manifest.total_rows = Object.values(manifest.tables).reduce((s, x) => s + x.rows, 0);
  manifest.elapsed_sec = +((Date.now() - started) / 1000).toFixed(1);
  files.push({ path: '_manifest.json', content: JSON.stringify(manifest, null, 2) + '\n' });

  const msg = `백업 ${new Date().toISOString().slice(0, 10)} · 표 ${tables.length}개 · ${manifest.total_rows.toLocaleString()}행`;
  const sha = await commitFiles(repo, branch, files, msg);

  return {
    ok: true, repo, branch, commit: sha.slice(0, 8),
    tables: tables.length, total_rows: manifest.total_rows,
    elapsed_sec: +((Date.now() - started) / 1000).toFixed(1),
    notes,
  };
}
