// 일회성 — 꼬북점 prod 앱의 모든 주요 화면을 iPhone 6.9"(1320×2868)로 캡처.
// 로그아웃(로그인 화면) + 테스트로그인(익명)→AI동의→정사 사주 시드 후 전 화면 순회.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH);

const BASE = 'https://ggobuk.vercel.app';
const OUT = 'appstore-shots/all';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctxOpts = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light',
  locale: 'ko-KR',
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
};

// ── 1) 로그아웃 상태: 로그인 화면 ──
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await sleep(2500);
    await page.screenshot({ path: `${OUT}/00-login.png`, type: 'png' });
    console.log('✓ 00-login');
  } catch (e) { console.log('✗ login:', e.message); }
  await ctx.close();
}

// ── 2) 로그인 상태: 전 화면 ──
const ctx = await browser.newContext(ctxOpts);
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
const dismiss = async () => {
  try {
    const b = page.getByRole('button', { name: '동의하고 시작' });
    if (await b.count()) { await b.click({ timeout: 7000 }); await sleep(2000); }
  } catch {}
};
const shot = async (name, { wait = 2800 } = {}) => {
  await sleep(wait);
  await dismiss();
  await page.screenshot({ path: `${OUT}/${name}.png`, type: 'png' });
  console.log('✓', name, '->', page.url());
};
const go = async (path, name, opts) => {
  try { await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }); await shot(name, opts); }
  catch (e) { console.log('✗', name, ':', e.message); }
};

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /테스트 로그인/ }).click();
  await page.waitForURL('**/home', { timeout: 90000 });
  await sleep(3000);
  await dismiss();
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
  await dismiss();
  await shot('01-home', { wait: 15000 });

  let iljuHref = null;
  try { iljuHref = await page.locator('a[href^="/ilju/"]').first().getAttribute('href'); } catch {}

  await go('/shell', '02-shell');
  await go('/shell/overview', '03-saju-free', { wait: 3500 });   // 무료 카테고리
  await go('/shell/love', '04-saju-locked', { wait: 7000 });     // 잠긴 카테고리(훅 미끼)
  await go('/chat', '05-chat');
  await go('/mode', '06-mode');
  await go('/people', '07-people');
  await go('/library', '08-library', { wait: 3500 });
  await go('/timeline', '09-timeline', { wait: 4000 });          // 대운
  await go('/calendar', '10-calendar', { wait: 4000 });          // 길일/달력
  await go('/more/pro', '11-store', { wait: 3500 });             // 꼬북상점
  await go('/more/auspicious', '12-auspicious', { wait: 3500 }); // 택일
  await go('/more/memory', '13-memory');                         // 꼬북이의 기억
  await go('/more', '14-more');                                  // 더보기
  await go('/relations', '15-relations', { wait: 3500 });        // 관계/초대
  await go('/more/people', '16-people-manage');                  // 인원 관리
  if (iljuHref) await go(iljuHref, '17-ilju', { wait: 3500 });   // 일주 캐릭터 카드
} catch (e) { console.log('✗ fatal:', e.message); }

await browser.close();
console.log('DONE');
