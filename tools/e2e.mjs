// Online e2e: two browsers, room create/join over the WS server, a full match,
// rematch, and disconnect handling. Usage: node tools/e2e.mjs [outdir]
import { chromium } from 'playwright-core';
const out = process.argv[2];
const URL = process.env.URL || 'http://localhost:8080/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const mk = async (tag) => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') { errors.push(tag + ' ' + m.text()); console.log(`[${tag}]`, m.text()); } });
  p.on('pageerror', (e) => { errors.push(tag + ' ' + e.message); console.log(`[${tag} pageerror]`, e.message); });
  await p.goto(URL);
  await p.waitForTimeout(600); await p.keyboard.press('x'); await p.waitForTimeout(3300);
  return p;
};
const st = (p) => p.evaluate(() => { const m = window.__nyagoro.mediator, pr = m.presenter; return { s: m.state, ph: pr.phase, c: pr.composer, r: pr.replayer, seq: pr.seq, turn: pr.turn, slot: m.session?.localSlots?.[0], lives: pr.lives }; });
const shot = (p, n) => out && p.screenshot({ path: `${out}/${n}.png` });
const assert = (c, msg) => { if (!c) { console.log('ASSERT FAIL:', msg); process.exitCode = 1; } };

const host = await mk('host');
await host.fill('.name-in', 'ホスト');
await host.click('[data-view="Button:create"]');
await host.waitForTimeout(800);
const code = await host.evaluate(() => window.__nyagoro.mediator.session?.code);
console.log('room code', code);
assert(/^[A-Z0-9]{4}$/.test(code || ''), 'room code');
await shot(host, 'e1-host-wait');

const guest = await mk('guest');
await guest.fill('.name-in', 'ゲスト');
await guest.click('[data-view="Button:join"]');
await guest.fill('.code-in', code.toLowerCase());
await guest.click('[data-view="Button:go"]');
await guest.waitForTimeout(1000);
assert((await st(guest)).s === 'waiting', 'guest in waiting');
await guest.click('.pcard .cat-arrow.r'); await guest.waitForTimeout(200);
await guest.click('[data-view="Button:ready"]');
await host.click('[data-view="Button:ready"]');
await host.waitForTimeout(500);
await shot(host, 'e2-host-both'); await shot(guest, 'e2-guest-both');
const hp = await host.evaluate(() => window.__nyagoro.mediator.session.players.map((p) => [p.name, p.cat, p.ready]));
console.log('host sees players', JSON.stringify(hp));
assert(hp[1][0] === 'ゲスト' && hp[1][2], 'host sees guest ready');
await host.click('[data-view="Button:start"]');

// play: each side acts when it's their turn. Guest replays perfectly; host misses on purpose.
const pages = { host, guest };
let ended = false, shots = 0;
for (let i = 0; i < 700 && !ended; i++) {
  await host.waitForTimeout(80);
  for (const [tag, p] of Object.entries(pages)) {
    const s = await st(p);
    if (s.s === 'result') { ended = true; break; }
    if (s.s !== 'match') continue;
    if (s.ph === 'compose' && s.c === s.slot) {
      const keys = s.turn % 2 ? ['f', 'CHORD', 'j', 'f', 'j', 'f', 'f'] : ['j', 'f', 'f', 'j', 'j', 'f'];
      for (const k of keys) {
        if ((await st(p)).ph !== 'compose') break;
        if (k === 'CHORD') { await p.keyboard.down('f'); await p.keyboard.down('j'); await p.waitForTimeout(30); await p.keyboard.up('f'); await p.keyboard.up('j'); }
        else await p.keyboard.press(k);
        await p.waitForTimeout(160);
      }
      if ((await st(p)).ph === 'compose') await p.keyboard.press('Space');
      if (shots < 2) { await shot(host, `e3-compose-host-${shots}`); await shot(guest, `e3-compose-guest-${shots}`); shots++; }
    }
    if (s.ph === 'replay' && s.r === s.slot) {
      const exp = await p.evaluate(() => { const pr = window.__nyagoro.mediator.presenter; const g = pr.seq.indexOf('goronya'); return pr.seq.map((a, i) => (g >= 0 && i > g ? (a === 'nya' ? 'goro' : a === 'goro' ? 'nya' : a) : a)); });
      const bad = tag === 'host';
      for (let i = 0; i < exp.length; i++) {
        let a = exp[i];
        if (bad && i === exp.length - 1) a = a === 'nya' ? 'goro' : 'nya';
        if (a === 'goronya') { await p.keyboard.down('f'); await p.keyboard.down('j'); await p.waitForTimeout(30); await p.keyboard.up('f'); await p.keyboard.up('j'); }
        else await p.keyboard.press(a === 'nya' ? 'f' : 'j');
        await p.waitForTimeout(260);
        if (i === 1 && tag === 'guest') { await shot(guest, `e4-replay-guest-t${s.turn}`); await shot(host, `e4-replay-hostview-t${s.turn}`); }
      }
      await p.waitForTimeout(400);
    }
  }
}
await host.waitForTimeout(1000);
const hs = await st(host), gs = await st(guest);
console.log('final', hs.s, gs.s, JSON.stringify(hs.lives), JSON.stringify(gs.lives));
assert(hs.s === 'result' && gs.s === 'result', 'both at result');
assert(JSON.stringify(hs.lives) === JSON.stringify(gs.lives), 'lives in sync');
assert(hs.lives[0] === 0, 'host lost');
await shot(host, 'e5-host-result'); await shot(guest, 'e5-guest-result');

// rematch
await guest.click('[data-view="Button:rematch"]'); await guest.waitForTimeout(400);
await shot(host, 'e6-host-rematch-offer');
await host.click('[data-view="Button:rematch"]'); await host.waitForTimeout(1500);
const r1 = await st(host), r2 = await st(guest);
console.log('after rematch', r1.s, r1.ph, r2.s, r2.ph);
assert(r1.s === 'match' && r2.s === 'match', 'rematch started');

// disconnect: guest closes the tab mid-match
await host.waitForTimeout(3500);
await guest.close();
await host.waitForTimeout(2500);
const d = await st(host);
console.log('after guest left', d.s);
assert(d.s === 'disconnected', 'host sees disconnect');
await shot(host, 'e7-host-disconnect');
await host.click('[data-view="Button:wait"]'); await host.waitForTimeout(500);
assert((await st(host)).s === 'waiting', 'host back to waiting room');
await shot(host, 'e8-host-waiting-again');

// the room is still joinable with the same code
const guest2 = await mk('guest2');
await guest2.click('[data-view="Button:join"]');
await guest2.fill('.code-in', code);
await guest2.click('[data-view="Button:go"]');
await guest2.waitForTimeout(1000);
assert((await st(guest2)).s === 'waiting', 'rejoin works');
const hp2 = await host.evaluate(() => window.__nyagoro.mediator.session.players[1].present);
assert(hp2, 'host sees rejoin');
// bad code
const guest3 = await mk('guest3');
await guest3.click('[data-view="Button:join"]');
await guest3.fill('.code-in', 'ZZZZ');
await guest3.click('[data-view="Button:go"]');
await guest3.waitForTimeout(800);
const msg = await guest3.textContent('.conn-msg:not(:empty)').catch(() => '');
console.log('bad code msg:', msg);
assert(/見つから/.test(msg), 'not found message');
// full room
await guest3.fill('.code-in', code);
await guest3.click('[data-view="Button:go"]');
await guest3.waitForTimeout(800);
const msg2 = await guest3.evaluate(() => [...document.querySelectorAll('.conn-msg')].map((e) => e.textContent).join('|'));
console.log('full msg:', msg2);
assert(/満員/.test(msg2), 'full message');

console.log(errors.length ? `console errors: ${errors.length}` : 'no console errors');
console.log(process.exitCode ? 'E2E FAILED' : 'E2E PASSED');
await b.close();
