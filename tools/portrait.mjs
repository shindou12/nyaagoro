// Portrait-phone walkthrough: node tools/portrait.mjs <outdir>
import { chromium } from 'playwright-core';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:8080/');
await p.waitForTimeout(900); await p.screenshot({ path: `${out}/p0-intro.png` });
await p.tap('body'); await p.waitForTimeout(3700);
await p.screenshot({ path: `${out}/p1-title.png` });
await p.tap('[data-view="Button:cpu"]'); await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/p2-wait.png` });
await p.tap('[data-view="Button:start"]'); await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/p3-vs.png` });
const st = () => p.evaluate(() => { const m = window.__nyagoro.mediator, pr = m.presenter; return { s: m.state, ph: pr.phase, c: pr.composer, r: pr.replayer, seq: pr.seq, slots: pr.slots }; });
let gave = false, shotGift = false, shotRep = false;
for (let i = 0; i < 900; i++) {
  await p.waitForTimeout(100);
  const s = await st();
  if (s.s === 'result') { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/p9-result.png` }); break; }
  if (s.ph === 'compose' && s.c === 0 && !gave) {
    await p.tap('.pb-nya'); await p.waitForTimeout(200);
    await p.keyboard.down('f'); await p.keyboard.down('j'); await p.waitForTimeout(30); await p.keyboard.up('f'); await p.keyboard.up('j');
    await p.waitForTimeout(250); await p.tap('.pb-goro');
    await p.waitForTimeout(350); await p.screenshot({ path: `${out}/p4-gift-fly.png` });
    await p.waitForTimeout(800); await p.screenshot({ path: `${out}/p5-gift-plate.png` });
    gave = true;
  } else if (s.ph === 'compose' && s.c === 0) { for (const k of ['.pb-nya', '.pb-goro', '.pb-nya', '.pb-nya']) { if ((await st()).ph !== 'compose') break; await p.tap(k); await p.waitForTimeout(150); } }
  if (s.ph === 'turnIntro' && s.c === 1 && gave && !shotGift) { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/p6-gift-turn.png` }); shotGift = true; console.log('cpu turn slots', (await st()).slots); }
  if (s.ph === 'replay' && s.r === 0) {
    if (!shotRep) { await p.waitForTimeout(300); await p.screenshot({ path: `${out}/p7-replay.png` }); shotRep = true; }
    await p.tap(s.seq[0] === 'nya' ? '.pb-goro' : '.pb-nya'); await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/p8-miss.png` });
  }
}
await b.close();
