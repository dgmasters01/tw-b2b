#!/usr/bin/env node
/**
 * TW B2B 페이지 자동 캡처
 * ────────────────────────────────────────────────────────────────────────────
 * 라이브 사이트(gohotelwinners.com)의 모든 페이지를 자동 캡처하여
 * docs/screenshots/ 폴더에 PNG로 저장합니다.
 *
 * 사용법:
 *   node scripts/capture-pages.mjs                       # public만 캡처 (기존 동작)
 *   node scripts/capture-pages.mjs --auth                # public + 매니저 + 어드민 모두
 *   node scripts/capture-pages.mjs --auth=manager        # 매니저만
 *   node scripts/capture-pages.mjs --auth=admin          # 어드민만
 *   node scripts/capture-pages.mjs --base=URL            # 다른 도메인
 *
 * 환경 변수 (--auth 사용 시 필요):
 *   TW_MANAGER_EMAIL, TW_MANAGER_PASSWORD
 *   TW_ADMIN_EMAIL, TW_ADMIN_PASSWORD
 *
 *   (.env 또는 GitHub Actions Secrets로 주입. 절대 코드에 박아두지 말 것)
 *
 * 산출물:
 *   docs/screenshots/{page-name}.png           - 최신 캡처
 *   docs/screenshots/archive/{page-name}-{YYYYMMDD}.png - 이전 캡처 보관
 *
 * 주의:
 *   - capture: true 인 페이지는 audience에 따라 분기 캡처
 *     · audience=public  → 비로그인 컨텍스트
 *     · audience=manager → 매니저 로그인 컨텍스트
 *     · audience=admin   → 어드민 로그인 컨텍스트
 * ────────────────────────────────────────────────────────────────────────────
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PAGES } from './pages-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SCREENSHOTS_DIR = join(REPO_ROOT, 'docs', 'screenshots');
const ARCHIVE_DIR = join(SCREENSHOTS_DIR, 'archive');

const args = process.argv.slice(2);
const baseArg = args.find(a => a.startsWith('--base='));
const BASE_URL = baseArg ? baseArg.replace('--base=', '') : 'https://gohotelwinners.com';

const authArg = args.find(a => a.startsWith('--auth'));
const authMode = !authArg ? 'public-only'
  : authArg === '--auth' ? 'all'
  : authArg.replace('--auth=', '');

const includePublic = !authArg || authMode === 'all' || authMode === 'public';
const includeManager = !!authArg && (authMode === 'all' || authMode === 'manager');
const includeAdmin = !!authArg && (authMode === 'all' || authMode === 'admin');

mkdirSync(SCREENSHOTS_DIR, { recursive: true });
mkdirSync(ARCHIVE_DIR, { recursive: true });

function pageNameFromPath(p) {
  return p.replace(/^\//, '').replace(/\.html$/, '');
}

function todayYYYYMMDD() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

async function loginAs(browser, email, password, label) {
  if (!email || !password) {
    console.log(`  ⚠️ ${label} 자격증명 없음 (env 변수 누락) — skip`);
    return null;
  }
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE_URL + '/login.html', { waitUntil: 'networkidle', timeout: 20000 });
    await page.fill('#login-email', email);
    await page.fill('#login-pw', password);
    await Promise.all([
      page.waitForURL(u => !u.toString().includes('login.html'), { timeout: 15000 }).catch(() => {}),
      page.click('#btn-login'),
    ]);
    await page.waitForTimeout(2500);
    const currentUrl = page.url();
    if (currentUrl.includes('login.html')) {
      console.log(`  ❌ ${label} 로그인 실패 — URL 여전히 login.html`);
      await page.close();
      await ctx.close();
      return null;
    }
    console.log(`  🔓 ${label} 로그인 성공 (${email}) → ${new URL(currentUrl).pathname}`);
    await page.close();
    return ctx;
  } catch (e) {
    console.log(`  ❌ ${label} 로그인 오류: ${e.message}`);
    await page.close().catch(() => {});
    await ctx.close().catch(() => {});
    return null;
  }
}

async function capturePage(context, meta, today) {
  const name = pageNameFromPath(meta.path);
  const url = BASE_URL + meta.path;
  const outPath = join(SCREENSHOTS_DIR, name + '.png');
  const archivePath = join(ARCHIVE_DIR, `${name}-${today}.png`);

  if (existsSync(outPath) && !existsSync(archivePath)) {
    copyFileSync(outPath, archivePath);
  }

  const page = await context.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    const status = resp ? resp.status() : 0;
    if (status >= 400) throw new Error('HTTP ' + status);

    const finalUrl = page.url();
    if (meta.audience !== 'public' && finalUrl.includes('login.html')) {
      throw new Error('redirected to login.html (session not active)');
    }

    await page.waitForTimeout(1200);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`  ✅ ${meta.path.padEnd(30)} [${meta.audience}] → ${name}.png`);
    return { path: meta.path, name, ok: true, error: null };
  } catch (e) {
    console.log(`  ❌ ${meta.path.padEnd(30)} [${meta.audience}] → ${e.message}`);
    return { path: meta.path, name, ok: false, error: e.message };
  } finally {
    await page.close();
  }
}

console.log(`[capture] base=${BASE_URL}`);
console.log(`[capture] mode=${authMode} (public:${includePublic} manager:${includeManager} admin:${includeAdmin})`);

const targets = PAGES.filter(p => {
  if (!p.capture) return false;
  if (p.audience === 'public' && includePublic) return true;
  if (p.audience === 'manager' && includeManager) return true;
  if (p.audience === 'admin' && includeAdmin) return true;
  return false;
});
console.log(`[capture] ${targets.length}개 페이지 캡처 대상\n`);

// 컨테이너 환경에 사전 설치된 chromium이 있으면 그걸 사용, 없으면 Playwright 기본 경로
import { existsSync as _existsSync } from 'fs';
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOpts = _existsSync(PRESET_CHROMIUM) ? { executablePath: PRESET_CHROMIUM } : {};

const browser = await chromium.launch(launchOpts);

const publicCtx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});

let managerCtx = null;
let adminCtx = null;

if (includeManager) {
  console.log('[capture] 매니저 로그인 시도...');
  managerCtx = await loginAs(
    browser,
    process.env.TW_MANAGER_EMAIL,
    process.env.TW_MANAGER_PASSWORD,
    '매니저'
  );
}

if (includeAdmin) {
  console.log('[capture] 어드민 로그인 시도...');
  adminCtx = await loginAs(
    browser,
    process.env.TW_ADMIN_EMAIL,
    process.env.TW_ADMIN_PASSWORD,
    '어드민'
  );
}

console.log('');

const today = todayYYYYMMDD();
const results = [];

for (const meta of targets) {
  let ctx = null;
  if (meta.audience === 'public') ctx = publicCtx;
  else if (meta.audience === 'manager') ctx = managerCtx;
  else if (meta.audience === 'admin') ctx = adminCtx;

  if (!ctx) {
    console.log(`  ⏭️  ${meta.path.padEnd(30)} [${meta.audience}] → 컨텍스트 없음 (로그인 실패 또는 자격증명 누락)`);
    results.push({ path: meta.path, name: pageNameFromPath(meta.path), ok: false, error: 'no context' });
    continue;
  }

  const r = await capturePage(ctx, meta, today);
  results.push(r);
}

await browser.close();

const okCount = results.filter(r => r.ok).length;
const failCount = results.length - okCount;
console.log('');
console.log(`[capture] 완료: 성공 ${okCount} / 실패 ${failCount}`);

if (failCount > 0 && okCount === 0) process.exit(1);
