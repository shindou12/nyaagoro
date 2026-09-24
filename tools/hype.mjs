import { chromium } from 'playwright-core';
const [out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:8080/');
await p.waitForTimeout(700); await p.keyboard.press('x'); await p.waitForTimeout(3500);
await p.click('[data-view="Button:cpu"]'); await p.waitForTimeout(500);
await p.click('[data-view="Button:start"]'); await p.waitForTimeout(5200);
await p.evaluate(() => window.__nyagoro.mediator.presenter.setHype(4));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/hype4.png` });
// wait until our replay with goronya, force reverse-live look
for (let i = 0; i < 700; i++) {
  await p.waitForTimeout(100);
  const s = await p.evaluate(() => { const pr = window.__nyagoro.mediator.presenter; return [pr.phase, pr.replayer, pr.seq.join(',')]; });
  if (s[0] === 'compose' && s[1] === 1) { for (const k of ['f', 'j']) { await p.keyboard.press(k); await p.waitForTimeout(150); } await p.keyboard.down('f'); await p.keyboard.down('j'); await p.waitForTimeout(30); await p.keyboard.up('f'); await p.keyboard.up('j'); await p.waitForTimeout(150); await p.keyboard.press('f'); }
  if (s[0] === 'replay' && s[1] === 0 && s[2].includes('goronya')) {
    const seq = s[2].split(',');
    const g = seq.indexOf('goronya');
    for (let k = 0; k <= g; k++) { const a = seq[k]; if (a === 'goronya') { await p.keyboard.down('f'); await p.keyboard.down('j'); await p.waitForTimeout(30); await p.keyboard.up('f'); await p.keyboard.up('j'); } else await p.keyboard.press(a === 'nya' ? 'f' : 'j'); await p.waitForTimeout(250); }
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/reverse-live.png` });
    break;
  }
  if (s[0] === 'replay' && s[1] === 0) { await p.keyboard.press('f'); }
}
await b.close();
