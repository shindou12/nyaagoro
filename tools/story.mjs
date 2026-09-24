// Story mode walkthrough: node tools/story.mjs <outdir>
import { chromium } from 'playwright-core';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => { errs.push(e.message); console.log('[pageerror]', e.message); });
p.on('console', (m) => { if (m.type() === 'error') { errs.push(m.text()); console.log('[err]', m.text()); } });
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
const st = () => p.evaluate(() => { const m = window.__nyagoro.mediator, pr = m.presenter; return { s: m.state, ph: pr.phase, c: pr.composer, r: pr.replayer, seq: pr.seq, cleared: m.storyCleared }; });
await p.goto('http://localhost:8080/');
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(600); await p.keyboard.press('x'); await p.waitForTimeout(3600);
await shot('s0-title');
await p.click('[data-view="Button:story"]'); await p.waitForTimeout(600); await shot('s1-map');
await p.click('.stage-card.next'); await p.waitForTimeout(1500); await shot('s2-pre');
for (let i = 0; i < 20 && (await st()).s === 'dialogue'; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
console.log('after pre:', (await st()).s);
// play stage 1 for real
const chord = async () => { await p.keyboard.down('f'); await p.keyboard.down('j'); await p.waitForTimeout(30); await p.keyboard.up('f'); await p.keyboard.up('j'); };
for (let i = 0; i < 1500; i++) {
  await p.waitForTimeout(100);
  const s = await st();
  if (s.s !== 'match') break;
  if (s.ph === 'compose' && s.c === 0) {
    for (const k of ['f', 'j', 'C', 'f', 'j', 'j', 'f', 'j']) { if ((await st()).ph !== 'compose') break; if (k === 'C') await chord(); else await p.keyboard.press(k); await p.waitForTimeout(170); }
  }
  if (s.ph === 'replay' && s.r === 0) {
    const exp = await p.evaluate(() => { const pr = window.__nyagoro.mediator.presenter; const g = pr.seq.indexOf('goronya'); return pr.seq.map((a, i) => (g >= 0 && i > g ? (a === 'nya' ? 'goro' : a === 'goro' ? 'nya' : a) : a)); });
    for (const a of exp) { if (a === 'goronya') await chord(); else await p.keyboard.press(a === 'nya' ? 'f' : 'j'); await p.waitForTimeout(260); }
    await p.waitForTimeout(500);
  }
}
await p.waitForTimeout(1500);
let s = await st();
console.log('after match:', s.s, 'cleared', s.cleared);
await shot('s3-post');
for (let i = 0; i < 20 && (await st()).s === 'dialogue'; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
await p.waitForTimeout(600);
s = await st(); console.log('after post:', s.s, 'cleared', s.cleared);
await shot('s4-map2');
// jump to the final stage
await p.evaluate(() => localStorage.setItem('nyagoro.story', '9'));
await p.reload(); await p.waitForTimeout(600); await p.keyboard.press('x'); await p.waitForTimeout(3600);
await p.click('[data-view="Button:story"]'); await p.waitForTimeout(500); await shot('s5-map-final');
await p.click('.stage-card.next'); await p.waitForTimeout(1200);
for (let i = 0; i < 4; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
await shot('s6-final-pre');
await p.keyboard.press('Escape'); await p.waitForTimeout(2500);
console.log('final match:', (await st()).s);
// fake a win to walk the ending
await p.evaluate(() => { const m = window.__nyagoro.mediator; m.session.stopMatch(); m.storyResult({ winner: 0 }); });
await p.waitForTimeout(800); await shot('s7-final-win');
for (let i = 0; i < 30; i++) { if (await p.evaluate(() => !document.querySelector('.dlg-card').classList.contains('is-hidden'))) break; await p.keyboard.press('Space'); await p.waitForTimeout(200); await p.keyboard.press('Space'); await p.waitForTimeout(900); if (i === 7) await shot('s8-ending-a'); if (i === 10) await shot('s9-ending-b'); }
await p.waitForTimeout(1500); await shot('s10-card');
s = await st(); console.log('end state', s.s, 'cleared', s.cleared);
if ((await st()).s === 'dialogue') { await p.click('.dlg-card'); await p.waitForTimeout(800); }
console.log('after card', (await st()).s);
await shot('s11-title-cleared');
console.log(errs.length ? 'ERRORS ' + errs.length : 'no errors');
await b.close();
