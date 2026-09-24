// Plays a CPU match where we deliberately miss, capturing miss + result screens.
import { chromium } from 'playwright-core';
const [out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
p.on('pageerror', e => console.log('[pageerror]', e.message, e.stack?.split('\n')[1]));
await p.goto('http://localhost:8080/');
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
await p.waitForTimeout(800); await p.keyboard.press('x'); await p.waitForTimeout(3500);
await p.click('[data-view="Button:cpu"]'); await p.waitForTimeout(600);
await p.click('[data-view="Button:start"]');
const st = () => p.evaluate(() => { const m = window.__nyagoro.mediator, pr = m.presenter; return { s: m.state, ph: pr.phase, c: pr.composer, r: pr.replayer, seq: pr.seq, ri: pr.localReplayIdx, hype: pr.hype }; });
let missShots = 0, lastPh = '';
for (let i = 0; i < 400; i++) {
  await p.waitForTimeout(100);
  const s = await st();
  if (s.ph !== lastPh) { console.log(i, s.s, s.ph, 'c=' + s.c, JSON.stringify(s.seq), 'hype=' + s.hype); lastPh = s.ph; }
  if (s.s === 'match' && s.ph === 'compose' && s.c === 0 && !s.done) {
    for (const k of ['f', 'j', 'f', 'j', 'f', 'j', 'f', 'j', 'f']) { await p.keyboard.press(k); await p.waitForTimeout(150); const s2 = await st(); if (s2.ph !== 'compose') break; }
  }
  if (s.s === 'match' && s.ph === 'replay' && s.r === 0) {
    // press the wrong thing for index 0
    const want = s.seq[0];
    await p.keyboard.press(want === 'nya' ? 'j' : 'f');
    await p.waitForTimeout(250); await shot(`miss-a-${missShots}`);
    await p.waitForTimeout(700); await shot(`miss-b-${missShots}`);
    await p.waitForTimeout(900); await shot(`miss-c-${missShots}`);
    missShots++;
  }
  if (s.s === 'match' && s.ph === 'end') { await p.waitForTimeout(600); await shot('end-a'); }
  if (s.s === 'result') { await p.waitForTimeout(800); await shot('result'); break; }
}
await b.close();
