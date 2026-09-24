// Usage: node tools/shot.mjs <url> <out.png> [waitMs] [w] [h]
import { chromium } from 'playwright-core';
const [url, out, wait = '800', w = '1280', h = '720'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
p.on('response', r => { if (r.status() >= 400) console.log('[404]', r.url()); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(url);
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
await b.close();
