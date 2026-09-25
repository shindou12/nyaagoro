// Ending vignettes — "where everyone lives now".
// Each scene = a baked background (336x180 art px, slightly wider than the
// view so the camera can pan) + a draw(ctx, lt) that animates cats and props.
import { makeCanvas, glowOf } from '../../art/pixel.js';
import { textMask, tint } from '../../art/font.js';
import { bigCat, smallCat, BIG } from '../../art/catArt.js';
import { pixCircle } from '../../art/eyeArt.js';

export const SW = 336, SH = 180;

// ------------------------------------------------------------------ helpers
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function sky(c, cols, h = SH) {
  const bh = h / cols.length;
  cols.forEach((col, i) => R(c, col, 0, i * bh, SW, bh + 1));
  for (let i = 1; i < cols.length; i++) for (let x = 0; x < SW; x += 2) R(c, cols[i], x + (i % 2), i * bh - 1, 1, 1);
}
function stars(c, n, seed, maxY, col = '#cfc6ff') { const r = rng(seed); for (let i = 0; i < n; i++) R(c, r() < 0.2 ? '#ffffff' : col, r() * SW, r() * maxY, 1, 1); }
function city(c, seed, base, hmin, hmax, body, wins, winP = 0.25) {
  const r = rng(seed);
  for (let x = -4; x < SW;) {
    const w = 8 + (r() * 16 | 0), hh = hmin + (r() * (hmax - hmin) | 0);
    R(c, body, x, base - hh, w, hh + 60);
    if (r() < 0.3) R(c, body, x + (w >> 1), base - hh - 5, 1, 5);
    for (let wy = base - hh + 3; wy < base; wy += 3) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (r() < winP) R(c, wins[(r() * wins.length) | 0], wx, wy, 1, 1);
    x += w + (r() * 2 | 0);
  }
}
function cloud(c, x, y, w, col) { R(c, col, x, y, w, 4); R(c, col, x + w * 0.2, y - 3, w * 0.4, 3); R(c, col, x + w * 0.5, y - 5, w * 0.3, 5); }
function sign(c, text, x, y, color, bg) {
  const m = tint(textMask(text), color);
  if (bg) R(c, bg, x - 3, y - 3, m.width + 6, m.height + 6);
  c.drawImage(m, x, y);
  return m;
}
function glowSign(text, color, scale = 1) {
  let m = tint(textMask(text), color);
  if (scale > 1) { const s = makeCanvas(m.width * scale, m.height * scale), c = s.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(m, 0, 0, s.width, s.height); m = s; }
  return { m, g: glowOf(m, 3) };
}
const cat = (c, breed, pose, x, y, flip = false, opt = {}) => c.drawImage(bigCat(breed, pose, flip, opt), Math.round(x - BIG / 2), Math.round(y - BIG + 2));
const kit = (c, breed, pose, x, y, flip = false, opt = {}) => c.drawImage(smallCat(breed, pose, flip, opt), Math.round(x - 10), Math.round(y - 21));
const shadow = (c, x, y, w = 14) => { c.fillStyle = 'rgba(5,3,15,0.45)'; c.fillRect(Math.round(x - w), Math.round(y), w * 2, 2); };
const q8 = (x) => Math.round(((x % 1) + 1) % 1 * 8) / 8 % 1;
const blink = (lt, ph = 0) => ((lt + ph) % 3.1) < 0.13;

// ------------------------------------------------------------------ scenes
export function makeScenes(env) {
  const S = {};

  // ① ミケ — 夜明けの神社裏、新しい喫茶の看板娘
  S.mike = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    sky(c, ['#2b1d4a', '#46285e', '#6e3566', '#a24c68', '#d6716a', '#f29d78', '#ffc48e', '#ffe0a8']);
    pixCircle(c, 250, 118, 16, '#fff0c4');
    city(c, 3, 132, 12, 34, '#6a3f66', ['#ffd7a0'], 0.08);
    R(c, '#3d2440', 0, 132, SW, 48);
    for (let x = 0; x < SW; x += 3) R(c, '#4e2f4e', x + (x % 2), 140 + (x * 7) % 9, 2, 1);
    // torii
    const T = '#d9463c', TD = '#8e2a2a';
    R(c, T, 30, 70, 7, 70); R(c, T, 92, 70, 7, 70); R(c, TD, 30, 70, 2, 70); R(c, TD, 92, 70, 2, 70);
    R(c, '#1a0f2e', 18, 60, 94, 5); R(c, T, 22, 65, 86, 5); R(c, T, 26, 80, 78, 4); R(c, '#2a1a24', 60, 70, 10, 10);
    // stone lantern
    R(c, '#8a7f96', 116, 118, 12, 3); R(c, '#9a90a8', 118, 108, 8, 10); R(c, '#ffe19a', 120, 111, 4, 4); R(c, '#8a7f96', 114, 104, 16, 4); R(c, '#8a7f96', 120, 121, 4, 12);
    // the little cafe
    R(c, '#1a0f2e', 178, 78, 144, 58); R(c, '#8a563c', 180, 80, 140, 56); for (let y = 84; y < 136; y += 4) R(c, '#7a4a33', 180, y, 140, 1);
    R(c, '#c24a4a', 176, 72, 150, 8); for (let x = 178; x < 324; x += 8) R(c, '#fff0e0', x, 72, 4, 8);
    R(c, '#2a1a24', 196, 98, 30, 38); R(c, '#ffcf8a', 250, 96, 52, 22); R(c, '#1a0f2e', 275, 96, 2, 22);
    R(c, '#3b2230', 210, 54, 92, 17); R(c, '#f4e2c4', 212, 56, 88, 13);
    sign(c, 'NEKO CAFE', 218, 60, '#8a3a3a');
    // sakura branch
    for (let i = 0; i < 26; i++) { const x = 140 + i * 7 + Math.sin(i) * 6, y = 10 + Math.sin(i * 1.7) * 7 + i * 0.6; pixCircle(c, x, y, 3, i % 3 ? '#ffb3cf' : '#ff94bc'); }
    R(c, '#4a2a3a', 130, 8, 70, 2);
    return b;
  }, (c, lt) => {
    shadow(c, 236, 136);
    const wave = Math.floor(lt * 2.5) % 5 === 0;
    cat(c, 'mike', { pose: 'sit', eyes: blink(lt) ? 'closed' : Math.floor(lt) % 4 === 2 ? 'wink' : 'happy', mouth: 'w', paws: wave ? 'wave' : 'down', tail: q8(lt * 0.7) }, 236, 136);
    petals(c, lt, 18, '#ffc2d8');
  });

  // ② タマ — 昼の空き地、木箱の屋台。皿はふたつ
  S.tama = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    sky(c, ['#4fa6ff', '#62b4ff', '#79c2ff', '#93d0ff', '#b0dcff', '#cfe9ff']);
    cloud(c, 40, 30, 50, '#ffffff'); cloud(c, 210, 20, 64, '#f4fbff'); cloud(c, 150, 50, 36, '#ffffff');
    city(c, 11, 118, 20, 60, '#8fb0d8', ['#cfe4ff'], 0.2);
    R(c, '#7fae5a', 0, 118, SW, 62); for (let x = 0; x < SW; x += 2) R(c, '#6a9a48', x, 118 + ((x * 13) % 17) + 8, 1, 3 + (x % 3));
    // chain-link fence
    for (let y = 88; y < 124; y++) for (let x = 0; x < SW; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) R(c, '#8a93a8', x, y, 1, 1);
    R(c, '#5d667a', 0, 87, SW, 2); for (let x = 10; x < SW; x += 48) R(c, '#5d667a', x, 87, 2, 38);
    // weeds
    for (let i = 0; i < 40; i++) { const x = (i * 37) % SW; R(c, '#4f8a3a', x, 128 + (i % 5), 1, 6); R(c, '#4f8a3a', x + 2, 130 + (i % 3), 1, 4); }
    // crate stall
    R(c, '#1a0f2e', 128, 118, 84, 30); R(c, '#b07a4a', 130, 120, 80, 26); for (let x = 132; x < 208; x += 10) R(c, '#8e5a34', x, 120, 1, 26);
    R(c, '#d24a4a', 138, 92, 64, 12); R(c, '#ffffff', 140, 94, 60, 8); sign(c, 'TAMA-YA', 150, 95, '#c23a3a');
    R(c, '#6a4a30', 136, 92, 2, 28); R(c, '#6a4a30', 202, 92, 2, 28);
    // two plates
    for (const x of [150, 180]) { R(c, '#1a0f2e', x - 1, 116, 18, 4); R(c, '#f4f4ff', x, 116, 16, 3); }
    R(c, '#ff8a5b', 153, 113, 10, 3); R(c, '#d9533a', 162, 112, 3, 5);
    return b;
  }, (c, lt) => {
    shadow(c, 100, 146);
    cat(c, 'tama', lt % 3 < 0.5 ? { pose: 'sit', eyes: 'happy', mouth: 'grin', paws: 'wave', tail: q8(lt) } : { pose: 'sit', eyes: blink(lt) ? 'closed' : 'open', mouth: 'w', look: 1, tail: q8(lt * 0.8) }, 100, 146);
    // a new stray eats from the second plate
    const k = Math.min(1, lt / 1.2), kx = 260 - k * 70;
    kit(c, 'kiji', { pose: 'sit', eyes: k < 1 ? 'open' : Math.floor(lt * 3) % 2 ? 'closed' : 'happy', mouth: 'w' }, kx, 118 + (k < 1 ? -Math.abs(Math.sin(lt * 14)) * 2 : 0), true);
    // sparrow hopping
    const sx = 40 + ((lt * 18) % 40), sy = 150 - Math.abs(Math.sin(lt * 8)) * 4;
    R(c, '#7a5a3a', sx, sy, 4, 3); R(c, '#ffd8a0', sx + 1, sy + 1, 2, 1); R(c, '#1a0f2e', sx + 3, sy, 1, 1);
  });

  // ③ ネオ — 夕暮れの駅前、屋上DJ
  S.neo = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    sky(c, ['#2a1650', '#472064', '#6e2a70', '#a23a6e', '#dc5a64', '#ff8a58', '#ffb46a']);
    city(c, 21, 120, 20, 70, '#3a1f52', ['#ffd25a', '#ff8ac8', '#7ae8ff'], 0.3);
    // station + rail
    R(c, '#241440', 0, 104, SW, 18); R(c, '#1a0f2e', 0, 102, SW, 2);
    R(c, '#1a0f2e', 200, 70, 110, 34); R(c, '#34205a', 202, 72, 106, 32); for (let x = 206; x < 306; x += 8) R(c, '#ffd88a', x, 86, 5, 8);
    sign(c, 'STATION', 226, 75, '#7ae8ff');
    // rooftop (foreground)
    R(c, '#1c1238', 0, 132, SW, 48); R(c, '#2e2058', 0, 130, SW, 3);
    for (let x = 0; x < SW; x += 20) R(c, '#261a4a', x, 133, 1, 47);
    // speakers from the old alley + deck
    for (const x of [48, 180]) { R(c, '#1a0f2e', x, 100, 26, 32); R(c, '#3a2f66', x + 2, 102, 22, 28); pixCircle(c, x + 13, 111, 5, '#1a1238'); pixCircle(c, x + 13, 123, 4, '#1a1238'); }
    R(c, '#1a0f2e', 88, 118, 70, 14); R(c, '#4a3f86', 90, 120, 66, 10); pixCircle(c, 106, 124, 4, '#1a1238'); pixCircle(c, 140, 124, 4, '#1a1238');
    return b;
  }, (c, lt) => {
    // a train glides by (the 汽笛 from the tape)
    const tx = ((lt * 90) % 900) - 400;
    R(c, '#1a0f2e', tx, 104, 180, 12); R(c, '#e8e0ff', tx + 2, 105, 176, 10); for (let x = 6; x < 176; x += 12) R(c, '#ffd87a', tx + x, 107, 8, 4);
    R(c, '#ff6a8a', tx + 2, 113, 176, 1);
    const beat = Math.floor(lt * 3);
    shadow(c, 124, 132);
    cat(c, 'neo', { pose: 'sit', eyes: 'closed', mouth: beat % 4 === 0 ? 'o' : 'w', hx: beat % 2 ? 1 : -1, paws: beat % 4 === 3 ? 'upR' : 'down', tail: q8(lt * 1.5) }, 124, 120 + (lt * 3 % 1 < 0.2 ? 1 : 0));
    notes(c, lt, 124, 70);
  });

  // ④ ピコ — 夜の部屋、においの保存方法を研究中
  S.piko = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    R(c, '#171031', 0, 0, SW, SH); for (let y = 0; y < 130; y += 6) R(c, '#1c1440', 0, y, SW, 3);
    // window with night city
    R(c, '#1a0f2e', 20, 20, 90, 70); R(c, '#0f0a2a', 22, 22, 86, 66);
    stars(c, 12, 5, 40);
    const w = makeCanvas(86, 66), wc = w.getContext('2d'); wc.fillStyle = '#0f0a2a'; wc.fillRect(0, 0, 86, 66);
    for (let i = 0; i < 10; i++) { const bw = 6 + (i * 7) % 8, bh = 20 + (i * 13) % 34; wc.fillStyle = '#231a52'; wc.fillRect(i * 9, 66 - bh, bw, bh); for (let y = 66 - bh + 2; y < 66; y += 3) if ((i + y) % 4) { wc.fillStyle = ['#ffd25a', '#7ae8ff', '#ff8ac8'][(i + y) % 3]; wc.fillRect(i * 9 + 2, y, 1, 1); } }
    c.drawImage(w, 22, 22); R(c, '#1a0f2e', 64, 20, 2, 70); R(c, '#1a0f2e', 20, 54, 90, 2);
    // desk + monitors showing the old alley
    R(c, '#1a0f2e', 120, 118, 210, 6); R(c, '#4a3f7e', 120, 116, 210, 4); R(c, '#2a2250', 130, 124, 6, 56); R(c, '#2a2250', 314, 124, 6, 56);
    const mons = [[140, 64], [196, 56], [252, 64]];
    mons.forEach(([x, y], i) => {
      R(c, '#1a0f2e', x - 2, y - 2, 52, 36); R(c, '#2e2860', x, y, 48, 32);
      if (env.alley) c.drawImage(env.alley, i * 90, 40, 140, 90, x + 2, y + 2, 44, 28);
      for (let yy = y + 2; yy < y + 30; yy += 2) { c.fillStyle = 'rgba(10,6,30,0.35)'; c.fillRect(x + 2, yy, 44, 1); }
      R(c, '#1a0f2e', x + 20, y + 32, 8, 10);
    });
    sign(c, 'SMELL.DAT ?', 204, 44, '#7ae8ff');
    // the flower
    R(c, '#c26a3a', 170, 104, 12, 12); R(c, '#8e4a2a', 170, 104, 12, 2); R(c, '#4f9a48', 175, 92, 2, 12); R(c, '#4f9a48', 177, 96, 4, 2);
    pixCircle(c, 176, 89, 4, '#ff8ac0'); pixCircle(c, 176, 89, 1.6, '#ffe07a');
    return b;
  }, (c, lt) => {
    for (const [x, y] of [[140, 64], [196, 56], [252, 64]]) { c.globalAlpha = 0.12 + 0.08 * Math.sin(lt * 5 + x); c.fillStyle = '#7ae8ff'; c.fillRect(x, y, 48, 32); c.globalAlpha = 1; }
    shadow(c, 214, 116);
    const sniff = lt % 2.4 < 1.3;
    cat(c, 'piko', { pose: 'sit', eyes: sniff ? 'closed' : blink(lt) ? 'closed' : 'open', mouth: sniff ? 'w' : 'o', look: -1, hx: sniff ? -2 : 0, blush: sniff, tail: q8(lt) }, 206, 116);
    if (sniff) { c.fillStyle = '#ffb3dc'; for (let i = 0; i < 3; i++) { const k = (lt * 1.2 + i * 0.33) % 1; c.globalAlpha = 1 - k; c.fillRect(178 + k * 8, 84 - k * 14 - i * 2, 2, 2); } c.globalAlpha = 1; }
  });

  // ⑤ ユキ — 遠くの街の窓辺、雪の満月
  S.yuki = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    R(c, '#3a2638', 0, 0, SW, SH); for (let x = 0; x < SW; x += 12) R(c, '#43303f', x, 0, 6, SH); // warm wallpaper
    R(c, '#1a0f2e', 88, 14, 170, 120); R(c, '#e8d2b0', 90, 16, 166, 116);
    R(c, '#10183a', 96, 22, 154, 104);
    const w = makeCanvas(154, 104), wc = w.getContext('2d');
    const g = ['#0e1436', '#141c48', '#1a2658', '#223268'];
    g.forEach((col, i) => { wc.fillStyle = col; wc.fillRect(0, i * 26, 154, 27); });
    pixCircle(wc, 108, 30, 13, '#fff4d8');
    for (let i = 0; i < 9; i++) { const bx = i * 18, bh = 20 + (i * 11) % 22; wc.fillStyle = '#2a3468'; wc.fillRect(bx, 104 - bh, 16, bh); wc.fillStyle = '#f4f8ff'; wc.fillRect(bx - 1, 104 - bh - 2, 18, 3); wc.fillStyle = '#ffd88a'; if (i % 2) wc.fillRect(bx + 5, 104 - bh + 8, 3, 3); }
    c.drawImage(w, 96, 22);
    R(c, '#e8d2b0', 171, 22, 4, 104); R(c, '#e8d2b0', 96, 72, 154, 3);
    R(c, '#1a0f2e', 70, 132, 206, 8); R(c, '#f0dcc0', 72, 132, 202, 6); // sill
    // cushion + mug
    R(c, '#7a6bff', 120, 124, 70, 10); R(c, '#9d92ff', 122, 124, 66, 3);
    R(c, '#1a0f2e', 222, 116, 14, 16); R(c, '#ff7aa8', 224, 118, 10, 12); R(c, '#1a0f2e', 234, 120, 4, 6);
    R(c, '#241a30', 0, 140, SW, 40);
    return b;
  }, (c, lt) => {
    // snow falling outside
    c.save(); c.beginPath(); c.rect(96, 22, 154, 104); c.clip();
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) { const x = 96 + ((i * 37 + lt * (6 + i % 5) * 3 + Math.sin(lt + i) * 4) % 154), y = 22 + ((i * 29 + lt * (10 + i % 7)) % 104); c.fillRect(Math.round(x), Math.round(y), 1, 1); }
    c.restore();
    for (let i = 0; i < 3; i++) { const k = (lt * 0.8 + i / 3) % 1; c.globalAlpha = 0.6 * (1 - k); c.fillStyle = '#ffffff'; c.fillRect(228 + Math.sin(k * 6 + i) * 2, 112 - k * 14, 1, 2); } c.globalAlpha = 1;
    cat(c, 'yuki', { pose: 'sit', eyes: blink(lt, 1) ? 'closed' : 'open', mouth: 'w', look: 1, lookY: -1, ears: 'perk', tail: q8(lt * 0.4) }, 156, 128);
  });

  // ⑥ ハチ — 倉庫街、空欄のない地図
  S.hachi = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    R(c, '#2a2240', 0, 0, SW, SH); for (let y = 0; y < SH; y += 5) for (let x = (y / 5 % 2) * 6; x < SW; x += 12) R(c, '#302650', x, y, 10, 3);
    R(c, '#ff9a5a', 250, 10, 70, 40); R(c, '#ffc47a', 252, 12, 66, 36); R(c, '#1a0f2e', 284, 10, 2, 40); // dusk window
    // the map
    R(c, '#1a0f2e', 40, 22, 170, 100); R(c, '#f2e2c0', 42, 24, 166, 96);
    for (let i = 0; i < 9; i++) R(c, '#c8b48a', 42, 30 + i * 11, 166, 1);
    for (let i = 0; i < 12; i++) R(c, '#c8b48a', 48 + i * 14, 24, 1, 96);
    R(c, '#7ac8ff', 42, 70, 166, 5); // river
    const pins = [[58, 40], [84, 52], [120, 34], [150, 60], [176, 42], [64, 94], [100, 86], [138, 100], [186, 90], [110, 58], [160, 108], [74, 62]];
    pins.forEach(([x, y], i) => { R(c, ['#ff3ea5', '#43e8ff', '#ffd23e', '#7dff6a'][i % 4], x, y, 3, 3); R(c, '#1a0f2e', x + 1, y + 3, 1, 3); });
    // boxes
    R(c, '#1a0f2e', 226, 112, 50, 36); R(c, '#b5824f', 228, 114, 46, 32); R(c, '#8e5f37', 250, 114, 2, 32);
    R(c, '#1c1638', 0, 148, SW, 32);
    return b;
  }, (c, lt) => {
    const point = lt % 2.2 < 1.4;
    shadow(c, 132, 150);
    cat(c, 'hachi', { pose: 'sit', eyes: 'focus', mouth: point ? 'o' : 'smug', paws: point ? 'upL' : 'down', look: -1, tail: q8(lt) }, 132, 150);
    kit(c, 'cream', { pose: 'sit', eyes: 'open', mouth: 'w', look: -1 }, 190, 150 - (lt % 1.6 < 0.2 ? 2 : 0), true);
    kit(c, 'blue', { pose: lt % 2 < 1 ? 'cheer' : 'sit', eyes: 'happy', mouth: 'o', arms: 0 }, 212, 150, true);
    kit(c, 'choco', { pose: 'sit', eyes: blink(lt) ? 'closed' : 'open', mouth: 'w', look: -1 }, 250, 110, true);
  });

  // ⑦ ルナ — 新しい街で、二代目NYAGORO CUP
  const cup = glowSign('NYAGORO CUP 2', '#ff3ea5', 2);
  S.luna = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    sky(c, ['#0b0826', '#120b33', '#1a0f40', '#22134a']);
    stars(c, 40, 9, 60);
    city(c, 31, 110, 30, 80, '#1a1242', ['#ffd25a', '#7ae8ff', '#ff8ac8'], 0.22);
    R(c, '#2a1f58', 40, 50, 256, 80); for (let y = 52; y < 130; y += 4) for (let x = 40 + (y / 4 % 2) * 4; x < 296; x += 8) R(c, '#33276a', x, y, 7, 3);
    R(c, '#0c0822', 168 - cup.m.width / 2 - 5, 58, cup.m.width + 10, cup.m.height + 10);
    R(c, '#1c1640', 0, 130, SW, 50); for (let x = 0; x < SW; x += 16) R(c, '#241c50', x, 130, 15, 1);
    return b;
  }, (c, lt) => {
    const on = lt > 0.7 ? (lt < 1.1 ? (Math.floor(lt * 20) % 2) : 1) : 0.15;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = on * 0.9; c.drawImage(cup.g, 168 - cup.m.width / 2 - cup.g.pad, 63 - cup.g.pad); c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 0.3 + on * 0.7; c.drawImage(cup.m, 168 - cup.m.width / 2, 63); c.globalAlpha = 1;
    // string lights
    if (lt > 1.1) for (let x = 44; x < 296; x += 10) { c.fillStyle = ['#ff3ea5', '#ffd23e', '#43e8ff', '#7dff6a'][(x / 10 | 0) % 4]; c.globalAlpha = (Math.floor(lt * 3) + x / 10) % 2 ? 1 : 0.5; c.fillRect(x, 48 + Math.sin(x / 40) * 3, 2, 2); }
    c.globalAlpha = 1;
    const cheer = lt > 1.2;
    cat(c, 'luna', { pose: cheer ? 'stand' : 'sit', eyes: cheer ? 'happy' : 'focus', mouth: cheer ? 'grin' : 'w', arms: Math.floor(lt * 4) % 2 ? 'alt0' : 'alt1', tail: q8(lt) }, 168, 150 - (cheer ? Math.abs(Math.sin(lt * 6)) * 3 : 0));
    const crowd = [['mike', 70], ['tama', 100], ['piko', 236], ['neo', 266], ['sabi', 296], ['cream', 40]];
    crowd.forEach(([bb, x], i) => kit(c, bb, cheer ? { pose: (Math.floor(lt * 5) + i) % 2 ? 'jump' : 'cheer', eyes: 'happy', mouth: 'o', arms: i % 2 } : { pose: 'sit', eyes: 'open', look: x < 168 ? 1 : -1 }, x, 164 - (cheer && (Math.floor(lt * 5) + i) % 2 ? 3 : 0), x > 168));
  });

  // ⑧ ヨル — 新しいビルの屋上、夜の主
  S.yoru = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    sky(c, ['#05041a', '#0a0724', '#100a2e', '#170d38', '#1f1044']);
    stars(c, 80, 13, 120);
    pixCircle(c, 250, 56, 30, '#2a1d4a'); pixCircle(c, 250, 56, 26, '#fff0c8'); pixCircle(c, 243, 50, 4, '#f2dca8'); pixCircle(c, 258, 64, 3, '#f2dca8');
    city(c, 41, 170, 20, 70, '#0e0a26', ['#ffd25a', '#7ae8ff', '#ff8ac8'], 0.3);
    // crane
    R(c, '#1a1238', 40, 30, 3, 110); for (let y = 32; y < 140; y += 6) R(c, '#1a1238', 38, y, 7, 1);
    R(c, '#1a1238', 20, 30, 150, 3); R(c, '#1a1238', 150, 33, 1, 40);
    // rooftop
    R(c, '#1a1340', 70, 128, 200, 52); R(c, '#2e2466', 70, 126, 200, 3);
    R(c, '#241c50', 86, 110, 22, 18); R(c, '#241c50', 230, 104, 14, 24);
    return b;
  }, (c, lt) => {
    c.fillStyle = Math.floor(lt * 1.5) % 2 ? '#ff3e6c' : '#4a1020'; c.fillRect(40, 28, 3, 2);
    shadow(c, 170, 126);
    cat(c, 'yoru', { pose: 'sit', eyes: blink(lt, 2) ? 'closed' : 'open', mouth: 'w', look: 1, lookY: -1, tail: q8(lt * 0.3) }, 170, 126);
    windStreaks(c, lt);
  });

  // ⑨ ハイじい — 川べりで昔話
  S.hai = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    sky(c, ['#1a1446', '#2a1a56', '#4a2466', '#7a3468', '#b24e66']);
    stars(c, 20, 21, 40);
    city(c, 51, 96, 10, 36, '#241a4e', ['#ffd25a', '#7ae8ff'], 0.3);
    // bridge
    R(c, '#1a1238', 0, 80, SW, 4); for (let x = 10; x < SW; x += 40) { R(c, '#1a1238', x, 84, 4, 18); R(c, '#ffd88a', x + 20, 78, 2, 2); }
    // river
    R(c, '#1e1c5a', 0, 102, SW, 36);
    R(c, '#3a4a2a', 0, 136, SW, 44); for (let x = 0; x < SW; x += 3) R(c, '#4a5a34', x, 136 + (x * 7) % 6, 1, 3);
    // bench
    R(c, '#1a0f2e', 120, 118, 90, 5); R(c, '#8e5f37', 122, 119, 86, 3); R(c, '#1a0f2e', 126, 123, 4, 16); R(c, '#1a0f2e', 200, 123, 4, 16);
    R(c, '#8e5f37', 122, 108, 86, 3); R(c, '#1a0f2e', 124, 104, 3, 14); R(c, '#1a0f2e', 204, 104, 3, 14);
    return b;
  }, (c, lt) => {
    for (let y = 104; y < 136; y += 3) { const off = Math.sin(lt * 2 + y) * 6; c.fillStyle = y % 2 ? '#ffd88a' : '#7a6ab8'; c.globalAlpha = 0.35; c.fillRect(Math.round(60 + off + (y * 13) % 200), y, 10 + (y % 5), 1); }
    c.globalAlpha = 1;
    cat(c, 'gray', { pose: 'loaf', eyes: lt % 3 < 2 ? 'closed' : 'happy', mouth: lt % 3 < 2 ? 'w' : 'o', ears: 'side', tail: q8(lt * 0.2) }, 166, 122, false, { acc: null });
    if (lt % 3 < 2) zzz(c, lt, 180, 84);
    kit(c, 'cream', { pose: 'sit', eyes: 'open', mouth: 'w', look: 1 }, 120, 160);
    kit(c, 'kiji', { pose: 'sit', eyes: lt % 2.4 < 0.4 ? 'closed' : 'open', mouth: lt % 2.4 < 0.4 ? 'o' : 'w', look: 0 }, 168, 164);
    kit(c, 'punk', { pose: 'sit', eyes: 'happy', mouth: 'w', look: -1 }, 216, 160, true);
    fireflies(c, lt);
  });

  // ⑩ 空き地 — あの路地があった場所 (transparent sky: used as the near layer of the pull-back)
  S.lot = scene(() => lotArt(false), (c, lt) => {
    c.globalAlpha = 0.25 + 0.1 * Math.sin(lt * 2); c.fillStyle = '#ff3ea5'; c.fillRect(214, 112, 58, 10); c.globalAlpha = 1;
  });

  // ⑪ 最後の場面 — 満月の空き地、チビと小さな弟子
  S.final = scene(() => {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    sky(c, ['#07051c', '#0b0826', '#100b30', '#170f3c', '#1f1348', '#281852']);
    stars(c, 90, 77, 110);
    pixCircle(c, 92, 46, 30, '#2a1f52'); pixCircle(c, 92, 46, 26, '#3a2a66'); pixCircle(c, 92, 46, 22, '#fff4d4');
    pixCircle(c, 86, 40, 3.5, '#f2dcae'); pixCircle(c, 100, 52, 2.5, '#f2dcae'); pixCircle(c, 92, 56, 1.5, '#f2dcae');
    city(c, 88, 120, 16, 48, '#140f36', ['#ffd25a', '#7ae8ff', '#ff8ac8'], 0.22);
    // cat-eared tower far away (the new district)
    R(c, '#1a1444', 262, 30, 12, 92); R(c, '#1a1444', 260, 22, 4, 10); R(c, '#1a1444', 272, 22, 4, 10); R(c, '#ff3ea5', 266, 40, 2, 2);
    c.drawImage(lotArt(true), 0, 0);
    return b;
  }, () => {});

  S.env = env;
  return S;

  // ---- scene helpers (hoisted)
  function scene(bake, draw) { let bg = null; return { get bg() { return bg || (bg = bake()); }, draw }; }
  function lotArt(withSky) {
    const b = makeCanvas(SW, SH), c = b.getContext('2d');
    // side walls of what's left
    R(c, '#0c0820', 0, 40, 34, 140); R(c, '#110c2a', 34, 60, 16, 120);
    R(c, '#0c0820', 302, 30, 34, 150); R(c, '#110c2a', 288, 56, 14, 124);
    for (let y = 70; y < 170; y += 12) { R(c, '#1a1438', 8, y, 6, 6); R(c, '#1a1438', 312, y - 6, 6, 6); }
    // back fence
    R(c, '#1c1640', 50, 96, 238, 2);
    for (let y = 98; y < 132; y++) for (let x = 50; x < 288; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) R(c, '#2e2866', x, y, 1, 1);
    for (let x = 52; x < 288; x += 40) R(c, '#241e52', x, 96, 2, 36);
    // ground
    R(c, '#181236', 34, 132, 268, 48); for (let x = 34; x < 302; x += 2) R(c, '#1f1844', x, 132 + ((x * 11) % 19) + 4, 1, 2);
    for (let i = 0; i < 30; i++) { const x = 40 + (i * 29) % 256; R(c, '#24402e', x, 138 + (i % 6) * 5, 1, 5); R(c, '#24402e', x + 2, 140 + (i % 6) * 5, 1, 3); }
    // the old sign leaning against the fence, the crates, two plates
    R(c, '#0c0822', 212, 108, 62, 16); R(c, '#2a1a3a', 214, 110, 58, 12); c.drawImage(tint(textMask('NYAGORO'), '#6a2a5a'), 218, 113);
    R(c, '#1a0f2e', 120, 128, 44, 22); R(c, '#6b4a3a', 122, 130, 40, 18); R(c, '#1a0f2e', 128, 114, 30, 16); R(c, '#7a5642', 130, 116, 26, 12);
    for (const x of [176, 194]) { R(c, '#0c0822', x - 1, 156, 14, 3); R(c, '#cfc8f0', x, 156, 12, 2); }
    if (!withSky) return b;
    return b;
  }
  function petals(c, lt, n, col) { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = ((i * 53 + lt * 12 + Math.sin(lt * 1.5 + i) * 8) % SW + SW) % SW, y = ((i * 31 + lt * (14 + i % 5)) % SH); c.fillRect(Math.round(x), Math.round(y), (i % 3) ? 2 : 1, 1); } }
  function notes(c, lt, x, y) { c.fillStyle = '#7ae8ff'; for (let i = 0; i < 3; i++) { const k = (lt * 0.7 + i / 3) % 1; c.globalAlpha = 1 - k; const nx = x + Math.sin(k * 6 + i) * 10 + (i - 1) * 12, ny = y - k * 30; c.fillRect(nx, ny, 2, 2); c.fillRect(nx + 1, ny - 4, 1, 4); c.fillRect(nx + 2, ny - 4, 2, 1); } c.globalAlpha = 1; }
  function zzz(c, lt, x, y) { c.fillStyle = '#d8d0ff'; for (let i = 0; i < 3; i++) { const k = (lt * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; const zx = x + k * 10 + i * 2, zy = y - k * 18; c.fillRect(zx, zy, 3, 1); c.fillRect(zx + 1, zy + 1, 1, 1); c.fillRect(zx, zy + 2, 3, 1); } c.globalAlpha = 1; }
  function fireflies(c, lt) { for (let i = 0; i < 8; i++) { const x = 40 + ((i * 41 + Math.sin(lt * 0.7 + i) * 20) % 260), y = 110 + Math.sin(lt * 0.9 + i * 2) * 14 + i * 3; c.globalAlpha = 0.5 + 0.5 * Math.sin(lt * 3 + i); c.fillStyle = '#e8ff7a'; c.fillRect(Math.round(x), Math.round(y), 1, 1); } c.globalAlpha = 1; }
  function windStreaks(c, lt) { c.fillStyle = '#6a5ab0'; for (let i = 0; i < 6; i++) { const x = ((lt * 60 + i * 70) % 400) - 40, y = 60 + i * 12; c.globalAlpha = 0.35; c.fillRect(Math.round(x), y, 14, 1); } c.globalAlpha = 1; }
}

/** 1280x420 detailed skyline layer for the pull-back (1 art px = 1 screen px at scale 1) */
export function bakeSkyline(seed, W, H, { hmin, hmax, body, rimL, rimR, winP, gapX = -1, gapW = 0, landmark = false }) {
  const cv = makeCanvas(W, H), c = cv.getContext('2d'), r = rng(seed);
  const lights = [];
  const wins = ['#ffd25a', '#ffcf8a', '#7ae8ff', '#ff8ac8', '#ffe8b0'];
  for (let x = -6; x < W;) {
    const w = 18 + (r() * 46 | 0);
    let hh = hmin + (r() * (hmax - hmin) | 0);
    if (gapW && x + w > gapX && x < gapX + gapW) hh = Math.min(hh, hmin * 0.7);
    const top = H - hh;
    R(c, body, x, top, w, hh);
    R(c, rimL, x, top, 1, hh); R(c, rimR, x + w - 1, top, 1, hh);
    // roof details
    const roll = r();
    if (roll < 0.25) { R(c, body, x + w * 0.3, top - 10, 3, 10); lights.push([x + w * 0.3 + 1, top - 11]); }
    else if (roll < 0.45) { R(c, body, x + 4, top - 8, 12, 8); R(c, body, x + 6, top - 10, 8, 2); }
    else if (roll < 0.6) { const bc = wins[(r() * 3) | 0]; R(c, '#0c0822', x + 3, top - 16, w - 6, 13); R(c, bc, x + 5, top - 14, w - 10, 9); c.globalAlpha = 0.4; R(c, body, x + 5, top - 10, w - 10, 1); c.globalAlpha = 1; }
    // windows
    const office = r() < 0.3;
    for (let wy = top + 5; wy < H - 2; wy += 5) {
      const rowLit = office && r() < 0.5;
      for (let wx = x + 3; wx < x + w - 3; wx += 4) if (rowLit || r() < winP) R(c, wins[(r() * wins.length) | 0], wx, wy, 2, 2);
    }
    // vertical neon strip
    if (r() < 0.18 && hh > hmin + 30) { const col = ['#ff3ea5', '#43e8ff', '#ffd23e'][(r() * 3) | 0]; for (let yy = top + 12; yy < top + 60; yy += 6) R(c, col, x + w - 6, yy, 3, 4); }
    x += w + (r() * 3 | 0);
  }
  if (landmark) { // cat-eared tower
    const cx = W / 2, tw = 44, th = H - 20;
    R(c, body, cx - tw / 2, H - th, tw, th); R(c, rimL, cx - tw / 2, H - th, 1, th); R(c, rimR, cx + tw / 2 - 1, H - th, 1, th);
    for (const s of [-1, 1]) for (let i = 0; i < 26; i++) R(c, body, cx + s * (14 - i * 0.4) - 3, H - th - i, 6 - i * 0.2, 1);
    for (let y = H - th + 16; y < H; y += 8) R(c, '#ff8ac8', cx - 12, y, 24, 2);
    lights.push([cx - 14, H - th - 26], [cx + 13, H - th - 26]);
  }
  cv.lights = lights;
  return cv;
}
