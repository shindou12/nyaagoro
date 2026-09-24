// Scripted screenshots: node tools/flow.mjs <outdir> <script>
import { chromium } from 'playwright-core';
const [out, which = 'intro'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const mk = async () => { const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
  p.on('pageerror', e => console.log('[pageerror]', e.message, e.stack?.split('\n')[1])); return p; };
const p = await mk();
await p.goto('http://localhost:8080/');
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
await p.waitForTimeout(1200); await shot('01-intro');
await p.keyboard.press('x'); await p.waitForTimeout(900); await shot('02-dive');
await p.waitForTimeout(1300); await shot('03-land');
await p.waitForTimeout(1500); await shot('04-title');
if (which === 'cpu') {
  await p.click('[data-view="Button:cpu"]'); await p.waitForTimeout(800); await shot('05-wait');
  await p.click('[data-view="Button:start"]'); await p.waitForTimeout(1500); await shot('06-vs');
  await p.waitForTimeout(3000); await shot('07-turn');
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(700);
    const st = await p.evaluate(() => { const m = window.__nyagoro.mediator; return [m.state, m.presenter.phase, m.presenter.composer, m.presenter.replayer, JSON.stringify(m.presenter.seq)]; });
    console.log(i, st.join(' '));
    if (st[0] === 'match' && st[1] === 'compose' && st[2] === 0) { await p.keyboard.press('f'); await p.waitForTimeout(250); await p.keyboard.down('f'); await p.keyboard.down('j'); await p.waitForTimeout(40); await p.keyboard.up('f'); await p.keyboard.up('j'); await p.waitForTimeout(300); await shot('08-compose-' + i); await p.keyboard.press('j'); }
    if (st[0] === 'match' && st[1] === 'showcase') await shot('09-show-' + i);
    if (st[0] === 'match' && st[1] === 'replay' && st[3] === 0) { await shot('10-replay-' + i); await p.keyboard.press('j'); await p.waitForTimeout(300); await shot('11-replay2-' + i); }
    if (st[0] === 'match' && st[1] === 'judge') await shot('12-judge-' + i);
    if (st[0] === 'result') { await shot('13-result'); break; }
  }
}
await b.close();
