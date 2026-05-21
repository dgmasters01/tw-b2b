const { chromium } = require('playwright');
const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = 'https://gohotelwinners.com';

async function sb(path, method, body) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method, headers: { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY, 'Content-Type':'application/json', 'Prefer':'return=representation' },
    body: body ? JSON.stringify(body) : undefined
  });
  const t = await r.text(); try { return { ok: r.ok, data: JSON.parse(t) }; } catch { return { ok: r.ok, data: t }; }
}

(async () => {
  const ts = Date.now();
  const email = `t_signout_${ts}@test.travelwinners.tw`;
  const password = `Test_${ts}_xX1!`;

  // 1. paid 계정 생성
  const u = (await sb('/auth/v1/admin/users', 'POST', { email, password, email_confirm: true })).data;
  await sb('/rest/v1/hotels', 'POST', {
    user_id: u.id, hotel_name: `TEST_SIGNOUT_${u.id.slice(0,8)}`, status: 'paid',
    contact_email: `d_${u.id.slice(0,6)}@test.local`, country: 'KR', city: 'Seoul'
  });
  console.log(`✅ paid 계정 생성: ${email}`);

  // 2. 로그인 + manager-dashboard 진입
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/login.html`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await page.goto(`${SITE}/manager-dashboard.html`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);

  // 3. Sign out 버튼 존재 확인
  const hasSignout = await page.evaluate(() => !!document.getElementById('md-signout-btn'));
  const signoutText = await page.evaluate(() => {
    const b = document.getElementById('md-signout-btn'); return b ? b.textContent.trim() : null;
  });
  console.log(`Sign out 버튼: ${hasSignout ? '✅ 박혀있음' : '❌ 없음'} (text="${signoutText}")`);

  // 4. 헤더 부분 스크린샷
  await page.screenshot({ path: '/tmp/signout_full.png', clip: { x: 0, y: 0, width: 1400, height: 120 } });

  // 5. Sign out 클릭 → login.html로 이동하는지 검증
  if (hasSignout) {
    await page.click('#md-signout-btn');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const after = page.url();
    console.log(`클릭 후 URL: ${after}`);
    console.log(`로그아웃 작동: ${after.includes('login.html') ? '✅ login.html 이동' : '❌ 이상'}`);
  }

  await browser.close();

  // 6. 정리
  await sb(`/rest/v1/hotels?user_id=eq.${u.id}`, 'DELETE');
  await sb(`/auth/v1/admin/users/${u.id}`, 'DELETE');
  console.log('🗑️  임시 계정 삭제');
})();
