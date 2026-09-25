// Renders keyframes of the ending cinematic at chosen bars (no audio) into a contact sheet.
// Usage: node tools/ending-frames.mjs <outdir> bar1,bar2,...
import { chromium } from 'playwright-core';
const [out, list = '1,5,7,9,11,13,15,17,19,21,23,25,26.5,28,29.5,30.8,31.4,31.9,32.5,33.3,34.5,36.3,37,38.5'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text()); });
await p.goto('http://localhost:8080/');
await p.evaluate(() => localStorage.setItem('nyagoro.cat', 'tama'));
await p.reload(); await p.waitForTimeout(2500);
await p.evaluate(() => {
  const { mediator: m, root: r } = window.__nyagoro;
  r.intro.skip(); m.go('credits');
  const snap = document.createElement('canvas'); snap.width = 320; snap.height = 180;
  const sc = snap.getContext('2d'); sc.drawImage(r.background.el, 0, 0); sc.drawImage(r.world.el, 0, 0);
  window.__T = 0;
  r.credits.play({ alley: snap, meCat: 'tama', name: 'チビ', clock: () => window.__T, bar: 4 * 60 / 90, staff: [['原案', 'テスト'], ['そして', 'あそんでくれた チビ']] });
});
const bars = list.split(',').map(Number);
for (const bar of bars) {
  await p.evaluate((t) => { window.__T = t; }, bar * 4 * 60 / 90);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/k-${String(bar).padStart(5, '0')}.png` });
}
await b.close();
