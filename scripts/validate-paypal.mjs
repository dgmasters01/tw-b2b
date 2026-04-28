#!/usr/bin/env node
// scripts/validate-paypal.mjs
// Phase 3 C단계 PayPal 통합 사전 검증
// - 신규/수정 파일들의 JS 문법, 핵심 함수/엔드포인트 export, dashboard.html 통합 상태 확인
// - 실패 시 exit code 1

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
  } catch (e) {
    ng(label + ' — exception: ' + e.message);
  }
}

function readFile(rel){
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) throw new Error('File not found: ' + rel);
  return readFileSync(p, 'utf8');
}

function jsSyntaxCheck(rel){
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) throw new Error('File not found: ' + rel);
  // node --check : 모듈 모드로 문법 검증 (ESM)
  execSync('node --check ' + JSON.stringify(p), { stdio: 'pipe' });
  return true;
}

console.log('\n=== Phase 3 C단계: PayPal 통합 검증 ===\n');

// ----------------------------------------------------------------
// 1. 파일 존재 + JS 문법
// ----------------------------------------------------------------
console.log('[1] 파일 존재 + JS 문법');
const jsFiles = [
  'api/lib/paypal-client.js',
  'api/paypal/config.js',
  'api/paypal/create-order.js',
  'api/paypal/capture-order.js',
  'api/paypal/webhook.js',
];
for (const f of jsFiles){
  check(f + ' — 존재', () => existsSync(resolve(ROOT, f)));
  check(f + ' — 문법 OK', () => jsSyntaxCheck(f));
}
check('sql/phase3-c-paypal.sql 존재', () => existsSync(resolve(ROOT, 'sql/phase3-c-paypal.sql')));

// ----------------------------------------------------------------
// 2. paypal-client.js 핵심 export
// ----------------------------------------------------------------
console.log('\n[2] api/lib/paypal-client.js export');
{
  const src = readFile('api/lib/paypal-client.js');
  check('export getPayPalEnv', () => /export\s+function\s+getPayPalEnv/.test(src));
  check('export getAccessToken', () => /export\s+(async\s+)?function\s+getAccessToken/.test(src));
  check('export createOrder', () => /export\s+(async\s+)?function\s+createOrder/.test(src));
  check('export captureOrder', () => /export\s+(async\s+)?function\s+captureOrder/.test(src));
  check('export getOrder', () => /export\s+(async\s+)?function\s+getOrder/.test(src));
  check('export verifyWebhookSignature', () => /export\s+(async\s+)?function\s+verifyWebhookSignature/.test(src));
  check('sandbox/live base URL 둘 다 존재', () =>
    /api-m\.paypal\.com/.test(src) && /api-m\.sandbox\.paypal\.com/.test(src));
  check('PAYPAL_LIVE_CLIENT_ID/SECRET 참조', () =>
    /PAYPAL_LIVE_CLIENT_ID/.test(src) && /PAYPAL_LIVE_SECRET/.test(src));
  check('PAYPAL_SANDBOX_CLIENT_ID/SECRET 참조', () =>
    /PAYPAL_SANDBOX_CLIENT_ID/.test(src) && /PAYPAL_SANDBOX_SECRET/.test(src));
}

// ----------------------------------------------------------------
// 3. config.js
// ----------------------------------------------------------------
console.log('\n[3] api/paypal/config.js');
{
  const src = readFile('api/paypal/config.js');
  check('default export handler', () => /export\s+default\s+(async\s+)?function\s+handler/.test(src));
  check('GET 메서드만 허용', () => /req\.method\s*!==\s*['"]GET['"]/.test(src));
  check('clientId 응답 포함', () => /clientId/.test(src));
  check('env 응답 포함', () => /\benv\b/.test(src));
}

// ----------------------------------------------------------------
// 4. create-order.js
// ----------------------------------------------------------------
console.log('\n[4] api/paypal/create-order.js');
{
  const src = readFile('api/paypal/create-order.js');
  check('default export handler', () => /export\s+default\s+(async\s+)?function\s+handler/.test(src));
  check('서버에서 가격 결정 ($200)', () => /PRODUCT_PRICE_USD\s*=\s*['"]200/.test(src));
  check('createOrder import', () => /import\s+\{[^}]*createOrder[^}]*\}\s+from\s+['"]\.\.\/lib\/paypal-client/.test(src));
  check('Supabase JWT 검증 (verifyUser)', () => /verifyUser/.test(src) && /\/auth\/v1\/user/.test(src));
  check('hotel 소유권 검증', () => /checkHotelOwnership|user_id\s*!==/.test(src));
  check('이미 paid 상태 거부', () => /already_paid|paid['"]/.test(src));
  check('SUPABASE_SERVICE_ROLE_KEY 사용', () => /SUPABASE_SERVICE_ROLE_KEY/.test(src));
}

// ----------------------------------------------------------------
// 5. capture-order.js
// ----------------------------------------------------------------
console.log('\n[5] api/paypal/capture-order.js');
{
  const src = readFile('api/paypal/capture-order.js');
  check('default export handler', () => /export\s+default\s+(async\s+)?function\s+handler/.test(src));
  check('captureOrder import', () => /import\s+\{[^}]*captureOrder[^}]*\}\s+from\s+['"]\.\.\/lib\/paypal-client/.test(src));
  check('payments INSERT 호출', () => /\/rest\/v1\/payments/.test(src) && /method:\s*['"]POST['"]/.test(src));
  check('paypal_order_id 저장', () => /paypal_order_id/.test(src));
  check('paypal_capture_id 저장', () => /paypal_capture_id/.test(src));
  check('reference_id 무결성 검증', () => /reference_id_mismatch|reference_id/.test(src));
  check('ORDER_ALREADY_CAPTURED 멱등 처리', () => /ORDER_ALREADY_CAPTURED/.test(src));
  check('ops 알림 호출', () => /sendOpsEmail/.test(src));
  check('hotel 소유권 검증', () => /not_owner/.test(src));
}

// ----------------------------------------------------------------
// 6. webhook.js
// ----------------------------------------------------------------
console.log('\n[6] api/paypal/webhook.js');
{
  const src = readFile('api/paypal/webhook.js');
  check('default export handler', () => /export\s+default\s+(async\s+)?function\s+handler/.test(src));
  check('bodyParser 비활성화 (raw body)', () => /bodyParser:\s*false/.test(src));
  check('verifyWebhookSignature import', () => /verifyWebhookSignature/.test(src));
  check('PAYMENT.CAPTURE.COMPLETED 처리', () => /PAYMENT\.CAPTURE\.COMPLETED/.test(src));
  check('PAYMENT.CAPTURE.REFUNDED 처리', () => /PAYMENT\.CAPTURE\.REFUNDED/.test(src));
  check('PAYMENT.CAPTURE.DENIED 처리', () => /PAYMENT\.CAPTURE\.DENIED/.test(src));
  check('PAYMENT.CAPTURE.REVERSED 처리', () => /PAYMENT\.CAPTURE\.REVERSED/.test(src));
  check('live 환경 서명 미검증 시 401', () => /401[\s\S]{0,200}invalid_signature|invalid_signature[\s\S]{0,200}401/.test(src));
  check('환불 시 hotels 자동 다운그레이드 X', () => /자동.{0,30}변경 안 함|hotels\.status/.test(src));
}

// ----------------------------------------------------------------
// 7. SQL 마이그레이션
// ----------------------------------------------------------------
console.log('\n[7] sql/phase3-c-paypal.sql');
{
  const src = readFile('sql/phase3-c-paypal.sql');
  check('payments 테이블 ALTER (멱등)', () => /ALTER TABLE\s+public\.payments[\s\S]+ADD COLUMN IF NOT EXISTS/.test(src));
  check('paypal_order_id 컬럼 추가', () => /paypal_order_id/.test(src));
  check('paypal_capture_id 컬럼 추가', () => /paypal_capture_id/.test(src));
  check('environment 컬럼 추가', () => /environment\s+TEXT/.test(src));
  check('metadata JSONB 컬럼', () => /metadata\s+JSONB/.test(src));
  check('paypal_order_id UNIQUE 인덱스', () => /payments_paypal_order_id_uniq[\s\S]+UNIQUE/i.test(src) || /UNIQUE INDEX[\s\S]+paypal_order_id/i.test(src));
  check('hotels 자동 paid 트리거 함수', () => /sync_hotel_paid_status/.test(src) && /UPDATE\s+public\.hotels/i.test(src));
  check('producing/published 다운그레이드 방지', () => /producing|published/.test(src) && /status\s+IN\s*\(/.test(src));
  check('updated_at 트리거', () => /payments_set_updated_at/.test(src));
  check('service_role 정책', () => /service_role/.test(src));
}

// ----------------------------------------------------------------
// 8. dashboard.html 통합 상태
// ----------------------------------------------------------------
console.log('\n[8] dashboard.html PayPal 통합');
{
  const src = readFile('dashboard.html');
  check('paypal-button-container DIV 존재', () => /id=["']paypal-button-container["']/.test(src));
  check('paypal-status-note DIV 존재', () => /id=["']paypal-status-note["']/.test(src));
  check('initPayPalButtons 함수 정의', () => /function\s+initPayPalButtons/.test(src));
  check('loadPayPalSdk 함수 정의', () => /function\s+loadPayPalSdk/.test(src));
  check('renderPayPalButtons 함수 정의', () => /function\s+renderPayPalButtons/.test(src));
  check('/api/paypal/config 호출', () => /\/api\/paypal\/config/.test(src));
  check('/api/paypal/create-order 호출', () => /\/api\/paypal\/create-order/.test(src));
  check('/api/paypal/capture-order 호출', () => /\/api\/paypal\/capture-order/.test(src));
  check('PayPal SDK URL 사용', () => /paypal\.com\/sdk\/js/.test(src));
  check('approved 상태에서만 PayPal 초기화', () => /status\s*===\s*['"]approved['"]\s*\)\s*\{[\s\S]{0,80}initPayPalButtons/.test(src));
  check('기존 placeholder toast 제거됨', () => !/PayPal checkout coming soon/.test(src));
  check('기존 btn-pay 클릭 핸들러 제거됨', () => !/getElementById\(['"]btn-pay['"]\)/.test(src));
  check('승인 후 dashboard 자동 reload', () => /loadDashboard\(\s*\{\s*noCache:\s*true/.test(src));
}

// ----------------------------------------------------------------
// 9. index.html
// ----------------------------------------------------------------
console.log('\n[9] index.html — Stripe → PayPal 교정');
{
  const src = readFile('index.html');
  check('Step 2 Stripe 언급 제거', () => !/payment via Stripe/i.test(src) && !/Stripe로 \$200/.test(src));
  check('Step 2 PayPal 언급 추가', () => /payment via PayPal/i.test(src) && /PayPal로 \$200/.test(src));
}

// ----------------------------------------------------------------
// 결과
// ----------------------------------------------------------------
console.log('\n=== 검증 결과 ===');
console.log('통과: ' + pass);
console.log('실패: ' + fail);
if (fail > 0){
  console.log('\n실패 항목:');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
console.log('\n✅ 전체 검증 통과');
process.exit(0);
