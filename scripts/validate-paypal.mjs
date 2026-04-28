#!/usr/bin/env node
// scripts/validate-paypal.mjs
// Phase 3 C단계 PayPal 통합 사전 검증 (단일 router 버전)

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let pass = 0;
let fail = 0;
const failures = [];

function ok(msg){ pass++; console.log('  ✓ ' + msg); }
function ng(msg){ fail++; failures.push(msg); console.log('  ✗ ' + msg); }
function check(label, fn){
  try {
    const r = fn();
    if (r === true || r === undefined) ok(label);
    else if (r === false) ng(label);
    else ng(label + ' — ' + r);
  } catch (e) { ng(label + ' — exception: ' + e.message); }
}
function readFile(rel){
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) throw new Error('File not found: ' + rel);
  return readFileSync(p, 'utf8');
}
function jsSyntaxCheck(rel){
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) throw new Error('File not found: ' + rel);
  execSync('node --check ' + JSON.stringify(p), { stdio: 'pipe' });
  return true;
}
function listFns(dir, acc = []){
  for (const e of readdirSync(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()){
      if (basename(p) === 'lib') continue;
      listFns(p, acc);
    } else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

console.log('\n=== Phase 3 C단계: PayPal 통합 검증 (단일 router) ===\n');

// 1. 파일 존재 + JS 문법
console.log('[1] 파일 존재 + JS 문법');
const jsFiles = ['api/lib/paypal-client.js', 'api/paypal.js'];
for (const f of jsFiles){
  check(f + ' — 존재', () => existsSync(resolve(ROOT, f)));
  check(f + ' — 문법 OK', () => jsSyntaxCheck(f));
}
check('sql/phase3-c-paypal.sql 존재', () => existsSync(resolve(ROOT, 'sql/phase3-c-paypal.sql')));

// 1-1. 함수 카운트 (Vercel Hobby 12 제한)
console.log('\n[1-1] Vercel Hobby 12-function 제한 준수');
{
  const fns = listFns(resolve(ROOT, 'api'));
  check('함수 수 ≤ 12 (현재 ' + fns.length + ')', () => fns.length <= 12);
  check('paypal/ nested 폴더 제거됨', () => !existsSync(resolve(ROOT, 'api/paypal')));
  check('api/paypal.js 존재 (단일 router)', () => existsSync(resolve(ROOT, 'api/paypal.js')));
}

// 2. paypal-client.js export
console.log('\n[2] api/lib/paypal-client.js');
{
  const src = readFile('api/lib/paypal-client.js');
  check('export getPayPalEnv', () => /export\s+function\s+getPayPalEnv/.test(src));
  check('export getAccessToken', () => /export\s+(async\s+)?function\s+getAccessToken/.test(src));
  check('export createOrder', () => /export\s+(async\s+)?function\s+createOrder/.test(src));
  check('export captureOrder', () => /export\s+(async\s+)?function\s+captureOrder/.test(src));
  check('export getOrder', () => /export\s+(async\s+)?function\s+getOrder/.test(src));
  check('export verifyWebhookSignature', () => /export\s+(async\s+)?function\s+verifyWebhookSignature/.test(src));
  check('sandbox/live base URL 둘 다 존재', () => /api-m\.paypal\.com/.test(src) && /api-m\.sandbox\.paypal\.com/.test(src));
}

// 3. paypal.js router
console.log('\n[3] api/paypal.js 단일 router');
{
  const src = readFile('api/paypal.js');
  check('default export handler', () => /export\s+default\s+(async\s+)?function\s+handler/.test(src));
  check('action=config 분기', () => /case\s+['"]config['"]/.test(src));
  check('action=create-order 분기', () => /case\s+['"]create-order['"]/.test(src));
  check('action=capture-order 분기', () => /case\s+['"]capture-order['"]/.test(src));
  check('action=webhook 분기', () => /case\s+['"]webhook['"]/.test(src));
  check('서버에서 가격 결정 ($200)', () => /PRODUCT_PRICE_USD\s*=\s*['"]200/.test(src));
  check('Supabase JWT 검증 (verifyUser)', () => /verifyUser/.test(src) && /\/auth\/v1\/user/.test(src));
  check('호텔 소유권 검증 (checkHotelOwnership)', () => /checkHotelOwnership/.test(src));
  check('이미 paid 상태 거부', () => /already_paid/.test(src));
  check('reference_id 무결성 검증', () => /reference_id_mismatch/.test(src));
  check('ORDER_ALREADY_CAPTURED 멱등 처리', () => /ORDER_ALREADY_CAPTURED/.test(src));
  check('PAYMENT.CAPTURE.COMPLETED 처리', () => /PAYMENT\.CAPTURE\.COMPLETED/.test(src));
  check('PAYMENT.CAPTURE.REFUNDED 처리', () => /PAYMENT\.CAPTURE\.REFUNDED/.test(src));
  check('PAYMENT.CAPTURE.DENIED 처리', () => /PAYMENT\.CAPTURE\.DENIED/.test(src));
  check('PAYMENT.CAPTURE.REVERSED 처리', () => /PAYMENT\.CAPTURE\.REVERSED/.test(src));
  check('live에서 서명 검증 실패 시 401', () => /401[\s\S]{0,200}invalid_signature/.test(src));
  check('환불 시 hotels 자동 다운그레이드 X', () => /자동 변경 안 함|hotels\.status/.test(src));
  check('ops 알림 호출', () => /sendOpsEmail/.test(src));
  check('payments INSERT 호출', () => /\/rest\/v1\/payments/.test(src));
  check('paypal_order_id/capture_id 저장', () => /paypal_order_id/.test(src) && /paypal_capture_id/.test(src));
  check('SUPABASE_SERVICE_ROLE_KEY 사용', () => /SUPABASE_SERVICE_ROLE_KEY/.test(src));
}

// 4. SQL 마이그레이션
console.log('\n[4] sql/phase3-c-paypal.sql');
{
  const src = readFile('sql/phase3-c-paypal.sql');
  check('payments 테이블 ALTER (멱등)', () => /ALTER TABLE\s+public\.payments[\s\S]+ADD COLUMN IF NOT EXISTS/.test(src));
  check('paypal_order_id 컬럼', () => /paypal_order_id/.test(src));
  check('paypal_capture_id 컬럼', () => /paypal_capture_id/.test(src));
  check('environment 컬럼', () => /environment\s+TEXT/.test(src));
  check('metadata JSONB 컬럼', () => /metadata\s+JSONB/.test(src));
  check('paypal_order_id UNIQUE 인덱스', () => /UNIQUE INDEX[\s\S]+paypal_order_id|payments_paypal_order_id_uniq[\s\S]+UNIQUE/i.test(src));
  check('hotels 자동 paid 트리거 함수', () => /sync_hotel_paid_status/.test(src) && /UPDATE\s+public\.hotels/i.test(src));
  check('producing/published 다운그레이드 방지', () => /producing|published/.test(src) && /status\s+IN\s*\(/.test(src));
  check('updated_at 트리거', () => /payments_set_updated_at/.test(src));
  check('service_role 정책', () => /service_role/.test(src));
}

// 5. dashboard.html 통합
console.log('\n[5] dashboard.html PayPal 통합');
{
  const src = readFile('dashboard.html');
  check('paypal-button-container DIV', () => /id=["']paypal-button-container["']/.test(src));
  check('paypal-status-note DIV', () => /id=["']paypal-status-note["']/.test(src));
  check('initPayPalButtons 함수', () => /function\s+initPayPalButtons/.test(src));
  check('loadPayPalSdk 함수', () => /function\s+loadPayPalSdk/.test(src));
  check('renderPayPalButtons 함수', () => /function\s+renderPayPalButtons/.test(src));
  check('?action=config 호출', () => /\/api\/paypal\?action=config/.test(src));
  check('?action=create-order 호출', () => /\/api\/paypal\?action=create-order/.test(src));
  check('?action=capture-order 호출', () => /\/api\/paypal\?action=capture-order/.test(src));
  check('PayPal SDK URL 사용', () => /paypal\.com\/sdk\/js/.test(src));
  check('approved 상태에서만 PayPal 초기화', () => /status\s*===\s*['"]approved['"]\s*\)\s*\{[\s\S]{0,80}initPayPalButtons/.test(src));
  check('placeholder toast 제거됨', () => !/PayPal checkout coming soon/.test(src));
  check('btn-pay 핸들러 제거됨', () => !/getElementById\(['"]btn-pay['"]\)/.test(src));
  check('자동 reload', () => /loadDashboard\(\s*\{\s*noCache:\s*true/.test(src));
  check('이전 nested URL 제거됨', () => !/\/api\/paypal\/config|\/api\/paypal\/create-order|\/api\/paypal\/capture-order/.test(src));
}

// 6. index.html
console.log('\n[6] index.html — Stripe → PayPal');
{
  const src = readFile('index.html');
  check('Stripe 언급 제거', () => !/payment via Stripe/i.test(src) && !/Stripe로 \$200/.test(src));
  check('PayPal 언급 추가', () => /payment via PayPal/i.test(src) && /PayPal로 \$200/.test(src));
}

// 7. vercel.json
console.log('\n[7] vercel.json');
{
  const cfg = JSON.parse(readFile('vercel.json'));
  check('functions 설정 존재', () => !!cfg.functions);
  check('api/*.js 패턴', () => !!cfg.functions['api/*.js']);
  check('api/email/**/*.js 패턴', () => !!cfg.functions['api/email/**/*.js']);
  check('api/paypal/**/*.js 패턴 제거됨', () => !cfg.functions['api/paypal/**/*.js']);
  check('패턴 충돌 없음 (api/**/*.js 단독 없음)', () => !cfg.functions['api/**/*.js']);
}

console.log('\n=== 검증 결과 ===');
console.log('통과: ' + pass + ' / 실패: ' + fail);
if (fail > 0){
  console.log('\n실패 항목:');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
console.log('\n✅ 전체 검증 통과');
process.exit(0);
