#!/usr/bin/env node
// scripts/e2e-invoice-verify.js
// ════════════════════════════════════════════════════════════════════════════
// BL-INVOICE-001 단계 12 — E2E 라이브 검증 스크립트
// ════════════════════════════════════════════════════════════════════════════
//
// 클로드가 자동으로 점검 가능한 모든 영역을 한 번에 검증.
// 대표님 수동 영역(실제 결제 시뮬레이션)은 마지막에 안내만 출력.
//
// 사용법:
//   PAT=sbp_xxx CRON_SECRET=xxx node scripts/e2e-invoice-verify.js
//   또는
//   node scripts/e2e-invoice-verify.js
//   (CRON_SECRET 없으면 cron endpoint는 skip)
//
// 검증 항목:
//   1) Supabase 스키마 완성도 (invoices/credit_notes/invoice_sequences/fx_snapshots)
//   2) retention_until 컬럼 + trigger 박힘 (단계 11)
//   3) v_invoice_retention_status view 박힘
//   4) 'invoices' Storage 버킷 존재
//   5) GitHub Actions workflow 2개 (invoice-expire / invoice-retention)
//   6) 라이브 페이지 200 응답 (sales/manager-dashboard/admin-invoices)
//   7) API endpoint 인증 검사 (401 = 정상 차단)
//   8) tasks.json BL-INVOICE-001 100%
// ════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
const PROJECT_REF = 'vjsludfjsphwnumuoqaj';
const LIVE_BASE = 'https://gohotelwinners.com';
const PAT = process.env.PAT || process.env.SUPABASE_MGMT_PAT || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

const results = [];
let passCount = 0;
let failCount = 0;
let skipCount = 0;

function record(name, status, detail) {
  results.push({ name, status, detail });
  if (status === 'PASS') passCount++;
  else if (status === 'FAIL') failCount++;
  else skipCount++;
  const icon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⏭️');
  console.log(`${icon} ${name}: ${detail}`);
}

async function sbMgmt(sql) {
  if (!PAT) return { skipped: true };
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + PAT,
      'Content-Type': 'application/json',
      'User-Agent': 'claude-tw-b2b/1.0',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!resp.ok) throw new Error(`Mgmt API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function checkSchema() {
  console.log('\n── 1) Supabase 스키마 ──');
  try {
    const rows = await sbMgmt(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('invoices','credit_notes','invoice_sequences','fx_snapshots')
      ORDER BY table_name;
    `);
    if (rows.skipped) {
      record('schema_tables', 'SKIP', 'PAT 없음');
      return;
    }
    const names = rows.map(r => r.table_name);
    const expected = ['credit_notes','fx_snapshots','invoice_sequences','invoices'];
    const missing = expected.filter(t => !names.includes(t));
    if (missing.length === 0) {
      record('schema_tables', 'PASS', `4개 모두 박힘 (${names.join(', ')})`);
    } else {
      record('schema_tables', 'FAIL', `누락: ${missing.join(', ')}`);
    }
  } catch (e) {
    record('schema_tables', 'FAIL', e.message);
  }
}

async function checkRetention() {
  console.log('\n── 2) Retention 컬럼·trigger·view ──');
  if (!PAT) {
    record('retention_columns', 'SKIP', 'PAT 없음');
    return;
  }
  try {
    const cols = await sbMgmt(`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'retention_until'
        AND table_name IN ('invoices','credit_notes')
      ORDER BY table_name;
    `);
    if (cols.length === 2) {
      record('retention_columns', 'PASS', 'invoices + credit_notes 둘 다 박힘');
    } else {
      record('retention_columns', 'FAIL', `${cols.length}/2`);
    }

    const trigs = await sbMgmt(`
      SELECT trigger_name FROM information_schema.triggers
      WHERE trigger_name IN ('trg_set_invoice_retention','trg_set_cn_retention');
    `);
    if (trigs.length === 2) {
      record('retention_triggers', 'PASS', '2개 trigger 박힘');
    } else {
      record('retention_triggers', 'FAIL', `${trigs.length}/2`);
    }

    const view = await sbMgmt(`
      SELECT table_name FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = 'v_invoice_retention_status';
    `);
    if (view.length === 1) {
      record('retention_view', 'PASS', 'v_invoice_retention_status 박힘');
    } else {
      record('retention_view', 'FAIL', 'view 없음');
    }
  } catch (e) {
    record('retention_check', 'FAIL', e.message);
  }
}

async function checkStorageBucket() {
  console.log('\n── 3) Storage 버킷 ──');
  if (!PAT) {
    record('storage_bucket', 'SKIP', 'PAT 없음');
    return;
  }
  try {
    const rows = await sbMgmt(`
      SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'invoices';
    `);
    if (rows.length === 1 && rows[0].public === false) {
      record('storage_bucket', 'PASS', `'invoices' private bucket, ${rows[0].file_size_limit} bytes 한도`);
    } else if (rows.length === 0) {
      record('storage_bucket', 'FAIL', '버킷 없음');
    } else {
      record('storage_bucket', 'FAIL', `public=${rows[0].public} (private 이어야 함)`);
    }
  } catch (e) {
    record('storage_bucket', 'FAIL', e.message);
  }
}

async function checkWorkflows() {
  console.log('\n── 4) GitHub Actions workflow ──');
  const expected = ['invoice-expire-cron.yml', 'invoice-retention-cron.yml', 'manager-campaign-cron.yml'];
  expected.forEach(name => {
    const p = path.join(REPO_ROOT, '.github/workflows', name);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const hasCron = /schedule:[\s\S]*cron:/.test(content);
      record(`workflow_${name}`, hasCron ? 'PASS' : 'FAIL', hasCron ? 'schedule 박힘' : 'cron schedule 없음');
    } else {
      record(`workflow_${name}`, 'FAIL', '파일 없음');
    }
  });
}

async function checkLivePages() {
  console.log('\n── 5) 라이브 페이지 200 응답 ──');
  const pages = [
    'sales.html',
    'manager-dashboard.html',
    '_admin/admin-invoices.html',
  ];
  for (const p of pages) {
    try {
      const resp = await fetch(`${LIVE_BASE}/${p}`, { method: 'HEAD' });
      if (resp.ok) {
        record(`page_${p}`, 'PASS', `HTTP ${resp.status}`);
      } else {
        record(`page_${p}`, 'FAIL', `HTTP ${resp.status}`);
      }
    } catch (e) {
      record(`page_${p}`, 'FAIL', e.message);
    }
  }
}

async function checkApiAuth() {
  console.log('\n── 6) API 인증 차단 (401 = 정상) ──');
  const endpoints = [
    { url: '/api/invoice?action=my-pending', expect: 401 },
    { url: '/api/invoice?action=my-list', expect: 401 },
    { url: '/api/invoice?action=list', expect: 401 },
    { url: '/api/cron/invoice-expire', method: 'POST', expect: 401 },
    { url: '/api/cron/invoice-retention', method: 'POST', expect: 401 },
  ];
  for (const ep of endpoints) {
    try {
      const resp = await fetch(`${LIVE_BASE}${ep.url}`, { method: ep.method || 'GET' });
      if (resp.status === ep.expect) {
        record(`api_${ep.url}`, 'PASS', `HTTP ${resp.status} (인증 차단 정상)`);
      } else {
        record(`api_${ep.url}`, 'FAIL', `HTTP ${resp.status} (expected ${ep.expect})`);
      }
    } catch (e) {
      record(`api_${ep.url}`, 'FAIL', e.message);
    }
  }
}

async function checkCronDryRun() {
  console.log('\n── 7) Cron dry_run (CRON_SECRET 있을 때만) ──');
  if (!CRON_SECRET) {
    record('cron_invoice_expire', 'SKIP', 'CRON_SECRET 환경변수 없음');
    record('cron_invoice_retention', 'SKIP', 'CRON_SECRET 환경변수 없음');
    return;
  }
  const crons = [
    { name: 'invoice_expire', url: '/api/cron/invoice-expire?dry_run=1' },
    { name: 'invoice_retention', url: '/api/cron/invoice-retention?dry_run=1' },
  ];
  for (const c of crons) {
    try {
      const resp = await fetch(`${LIVE_BASE}${c.url}`, {
        method: 'POST',
        headers: { 'x-cron-token': CRON_SECRET, 'Content-Type': 'application/json' },
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data) {
        record(`cron_${c.name}`, 'PASS', `HTTP ${resp.status}, dry_run=${data.dry_run}`);
      } else {
        record(`cron_${c.name}`, 'FAIL', `HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 200)}`);
      }
    } catch (e) {
      record(`cron_${c.name}`, 'FAIL', e.message);
    }
  }
}

async function checkTasksProgress() {
  console.log('\n── 8) tasks.json BL-INVOICE-001 진행률 ──');
  try {
    const p = path.join(REPO_ROOT, 'tasks.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const task = (data.tasks || []).find(t => t.id === 'BL-INVOICE-001');
    if (!task) {
      record('tasks_bl', 'FAIL', 'BL-INVOICE-001 없음');
      return;
    }
    const prog = task.progress || {};
    const pct = prog.percent || 0;
    const done = prog.completed_count || 0;
    const total = prog.total_count || 0;
    if (pct >= 92) {
      record('tasks_bl', 'PASS', `${pct}% (${done}/${total})`);
    } else {
      record('tasks_bl', 'FAIL', `${pct}% — 92% 이상이어야 함`);
    }
  } catch (e) {
    record('tasks_bl', 'FAIL', e.message);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BL-INVOICE-001 단계 12 — E2E 라이브 검증');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`PAT: ${PAT ? '박힘' : '없음 (Supabase 검증 skip)'}`);
  console.log(`CRON_SECRET: ${CRON_SECRET ? '박힘' : '없음 (cron 검증 skip)'}`);

  await checkSchema();
  await checkRetention();
  await checkStorageBucket();
  await checkWorkflows();
  await checkLivePages();
  await checkApiAuth();
  await checkCronDryRun();
  await checkTasksProgress();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  결과: ✅ ${passCount} PASS / ❌ ${failCount} FAIL / ⏭️ ${skipCount} SKIP`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (failCount > 0) {
    console.log('\n❌ 실패 항목:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.name}: ${r.detail}`);
    });
  }

  console.log('\n── 대표님 수동 검증 영역 (클로드 자동화 불가) ──');
  console.log('   1) 매니저 계정 로그인:');
  console.log('      URL: https://gohotelwinners.com/login.html');
  console.log('      해외 매니저: joylife8760@naver.com / Tw-2026-Jl9M');
  console.log('      한국 매니저: leejifilm@hanmail.net / Tw-2026-Lf7K');
  console.log('   2) sales.html 진입 → PayPal sandbox 결제');
  console.log('      (해외 매니저로 진행, KR 매니저는 PayPal 결제 차단되어 있음)');
  console.log('   3) 결제 직후 INV-INT-2026-XXXX 자동 발행 확인:');
  console.log('      admin-invoices.html (대표님 로그인) → 인보이스 목록');
  console.log('   4) manager-dashboard 서류 탭 → 본인 PDF 다운로드 동작 확인');
  console.log('   5) (선택) 한국 매니저로 결제 시도 시 차단 모달 확인');

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(2);
});
