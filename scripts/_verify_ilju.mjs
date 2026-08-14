// 배포 완료 감지 후 ilju 카드 재캡처 (수정 검증용).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH);
const BASE = 'https://ggobuk.vercel.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let live = false;
for (let i = 0; i < 25; i++) {
  try {
    const r = await fetch(`${BASE}/ilju/jeongsa`, { cache: 'no-store' });
    const html = await r.text();
    if (html.includes('bg-white/95')) { live = true; break; } // 새 흰 메달 마커
  } catch {}
  await sleep(12000);
}
console.log('deploy live:', live, `(after ~${live ? 'ok' : 'timeout'})`);

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  colorScheme: 'light',
  locale: 'ko-KR',
});
const p = await ctx.newPage();
await p.goto(`${BASE}/ilju/jeongsa`, { waitUntil: 'networkidle' });
await sleep(3000);
await p.screenshot({ path: 'appstore-shots/all/17-ilju-fixed.png', type: 'png' });
await b.close();
console.log('captured 17-ilju-fixed.png');
