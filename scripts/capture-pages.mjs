#!/usr/bin/env node
/**
 * TW B2B 페이지 자동 캡처
 * ────────────────────────────────────────────────────────────────────────────
 * 라이브 사이트(gohotelwinners.com)의 모든 public 페이지를 자동 캡처하여
 * docs/screenshots/ 폴더에 PNG로 저장합니다.
 *
 * 사용법:
 *   node scripts/capture-pages.mjs              # 라이브 사이트 캡처
 *   node scripts/capture-pages.mjs --base=URL   # 다른 도메인 (예: preview)
 *
 * 산출물:
 *   docs/screenshots/{page-name}.png           - 최신 캡처
 *   docs/screenshots/archive/{page-name}-{YYYYMMDD}.png - 이전 캡처 보관
 *
 * 주의:
 *   - capture: true 인 페이지만 캡처 (로그인 필요한 페이지는 제외)
 *   - admin-gallery.html에서 이 이미지를 표시
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

mkdirSync(SCREENSHOTS_DIR, { recursive: true });
mkdirSync(ARCHIVE_DIR, { recursive: true });

function pageNameFromPath(p) {
  // /index.html → index
  // /admin-gallery.html → admin-gallery
  return p.replace(/^\//, '').replace(/\.html$/, '');
}

function todayYYYYMMDD() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

const targets = PAGES.filter(p => p.capture);

console.log(`[capture] base=${BASE_URL}`);
console.log(`[capture] ${targets.length}개 페이지 캡처 시작`);
console.log(`[capture] 출력 디렉터리: ${SCREENSHOTS_DIR}`);
console.log('');

const browser = await chromium.launch({
  // 시스템에 미리 설치된 chromium-1194 사용 (별도 다운로드 불필요)
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});

const today = todayYYYYMMDD();
const results = [];

for (const meta of targets) {
  const name = pageNameFromPath(meta.path);
  const url = BASE_URL + meta.path;
  const outPath = join(SCREENSHOTS_DIR, name + '.png');
  const archivePath = join(ARCHIVE_DIR, `${name}-${today}.png`);

  // 기존 이미지가 있으면 archive에 백업
  if (existsSync(outPath) && !existsSync(archivePath)) {
    copyFileSync(outPath, archivePath);
  }

  const page = await context.newPage();
  let ok = false;
  let error = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    const status = resp ? resp.status() : 0;
    if (status >= 400) throw new Error('HTTP ' + status);
    // 약간의 추가 대기 (애니메이션/폰트 로딩)
    await page.waitForTimeout(800);
    await page.screenshot({ path: outPath, fullPage: true });
    ok = true;
    console.log(`  ✅ ${meta.path.padEnd(28)} → ${name}.png`);
  } catch (e) {
    error = e.message;
    console.log(`  ❌ ${meta.path.padEnd(28)} → ${error}`);
  } finally {
    await page.close();
  }
  results.push({ path: meta.path, name, ok, error });
}

await browser.close();

const okCount = results.filter(r => r.ok).length;
const failCount = results.length - okCount;
console.log('');
console.log(`[capture] 완료: 성공 ${okCount} / 실패 ${failCount}`);

if (failCount > 0) process.exit(1);
