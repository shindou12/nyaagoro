import { chromium } from 'playwright-core';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto('http://localhost:8080/');
  await p.waitForTimeout(700); await p.tap('body'); await p.waitForTimeout(3600);
  await p.screenshot({ path: `${out}/m-${name}-title.png` });
  await p.tap('[data-view="Button:local"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/m-${name}-wait.png` });
  await p.tap('[data-view="Button:start"]'); await p.waitForTimeout(5500);
  await p.tap('.pb-nya'); await p.waitForTimeout(300); await p.tap('.pb-goro'); await p.waitForTimeout(300);
  console.log(name, await p.evaluate(() => JSON.stringify(window.__nyagoro.mediator.presenter.seq)));
  await p.screenshot({ path: `${out}/m-${name}-match.png` });
  await ctx.close();
}
await b.close();
