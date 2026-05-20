// BL-USER-STAGE-GATING 단계 5 — 라이브 자동 검증
// 1) 임시 계정 3개 생성 (Admin API)
// 2) hotels row 박음 (status: 없음/pending/paid)
// 3) Playwright 로그인 → dashboard.html 진입 → 어디로 redirect되는지 검증 + 스크린샷
// 4) 정리 (auth.users + hotels 삭제)

const { chromium } = require('playwright');
const fs = require('fs');

const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SITE = 'https://gohotelwinners.com';

if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }
if (!ANON_KEY) { console.error('SUPABASE_ANON_KEY missing'); process.exit(1); }

const ts = Date.now();
const accounts = [
  { label: 'A_zero_hotel',  email: `t_a_${ts}@test.travelwinners.tw`, password: `Test_${ts}_aA1!`, status: null,      expectedRedirect: '/hotel-info.html' },
  { label: 'B_pending',     email: `t_b_${ts}@test.travelwinners.tw`, password: `Test_${ts}_bB2!`, status: 'pending', expectedRedirect: '/sales.html' },
  { label: 'C_paid',        email: `t_c_${ts}@test.travelwinners.tw`, password: `Test_${ts}_cC3!`, status: 'paid',    expectedRedirect: '/dashboard.html' },
];

async function sb(path, method, body) {
  const resp = await fetch(`${SUPABASE_URL}${path}`, {
    method, headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: resp.ok, status: resp.status, data };
}

async function createUser(email, password) {
  const r = await sb('/auth/v1/admin/users', 'POST', { email, password, email_confirm: true });
  if (!r.ok) throw new Error('createUser failed: ' + JSON.stringify(r));
  return r.data;
}
async function createHotel(userId, status) {
  const r = await sb('/rest/v1/hotels', 'POST', {
    user_id: userId,
    name: undefined,
    hotel_name: `TEST_HOTEL_${userId.slice(0,8)}`,
    status: status,
    contact_email: `dummy_${userId.slice(0,6)}@test.local`,
    country: 'KR', city: 'Seoul'
  });
  if (!r.ok) throw new Error('createHotel failed: ' + JSON.stringify(r));
  return r.data;
}
async function deleteUser(userId) {
  return sb(`/auth/v1/admin/users/${userId}`, 'DELETE');
}
async function deleteHotelByUser(userId) {
  return sb(`/rest/v1/hotels?user_id=eq.${userId}`, 'DELETE');
}

async function loginAndCheck(browser, acc) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const navLog = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) navLog.push(f.url()); });

  // 1. login.html 가서 로그인
  await page.goto(`${SITE}/login.html`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', acc.email);
  await page.fill('input[type="password"]', acc.password);
  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")');
  // 로그인 처리 대기 (일반적으로 dashboard.html로 redirect)
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // 2. dashboard.html 직접 입력 → 게이트 작동 검증
  await page.goto(`${SITE}/dashboard.html`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000); // redirect 대기
  const finalUrl = page.url();

  // 3. 스크린샷
  const shotPath = `/tmp/gating_${acc.label}.png`;
  await page.screenshot({ path: shotPath, fullPage: false });

  await ctx.close();
  return { finalUrl, shotPath, navLog };
}

(async () => {
  console.log('=== BL-USER-STAGE-GATING 단계 5 라이브 검증 시작 ===\n');

  // Phase 1: 계정 생성
  console.log('--- Phase 1: 임시 계정 3개 생성 ---');
  for (const a of accounts) {
    try {
      const u = await createUser(a.email, a.password);
      a.userId = u.id;
      console.log(`✅ ${a.label}: ${a.email} (id=${u.id.slice(0,8)})`);
      if (a.status !== null) {
        await createHotel(u.id, a.status);
        console.log(`   └ hotel row 박음: status=${a.status}`);
      } else {
        console.log(`   └ hotel row 없음 (case A)`);
      }
    } catch (e) { console.error(`❌ ${a.label} 생성 실패:`, e.message); process.exit(1); }
  }

  // Phase 2: Playwright 검증
  console.log('\n--- Phase 2: dashboard.html 게이트 동작 검증 ---');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  for (const a of accounts) {
    console.log(`\n▶ ${a.label} (status=${a.status || 'none'})`);
    try {
      const r = await loginAndCheck(browser, a);
      const ok = r.finalUrl.includes(a.expectedRedirect);
      results.push({ ...a, ...r, ok });
      console.log(`   기대 redirect: ${a.expectedRedirect}`);
      console.log(`   실제 최종 URL: ${r.finalUrl}`);
      console.log(`   nav 흐름: ${r.navLog.slice(-5).join(' → ')}`);
      console.log(`   ${ok ? '✅ PASS' : '❌ FAIL'} / 스크린샷: ${r.shotPath}`);
    } catch (e) {
      console.error(`   ❌ Playwright 검증 실패:`, e.message);
      results.push({ ...a, ok: false, error: e.message });
    }
  }
  await browser.close();

  // Phase 3: 정리
  console.log('\n--- Phase 3: 임시 계정·호텔 정리 ---');
  for (const a of accounts) {
    if (!a.userId) continue;
    await deleteHotelByUser(a.userId);
    await deleteUser(a.userId);
    console.log(`🗑️  ${a.label} 삭제 완료`);
  }

  // 결과 요약
  console.log('\n=== 결과 요약 ===');
  const passCount = results.filter(r => r.ok).length;
  console.log(`${passCount}/3 PASS`);
  results.forEach(r => console.log(` ${r.ok ? '✅' : '❌'} ${r.label}: ${r.finalUrl || r.error}`));

  // JSON으로 저장 (보고용)
  fs.writeFileSync('/tmp/gating_results.json', JSON.stringify(results, null, 2));
  process.exit(passCount === 3 ? 0 : 1);
})();
