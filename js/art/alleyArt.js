// Procedural pixel art for the neon back-alley (320x180 world).
// Static layers are baked once; anything that lights up, flickers or
// reacts to hype is described as data for the world views to animate.
import { makeCanvas, glowOf } from './pixel.js';
import { textMask, tint } from './font.js';

export const W = 320, H = 180;
export const GROUND_Y = 128;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// ------------------------------------------------------------------ sky + far city
export function bakeSky() {
  const cv = makeCanvas(W, H), ctx = cv.getContext('2d');
  const bands = ['#06041a', '#080522', '#0b0729', '#0f0930', '#140b38', '#1a0d40', '#210f48', '#2a1250', '#351556', '#40185b'];
  const bh = 9;
  bands.forEach((c, i) => R(ctx, c, 0, i * bh, W, bh + 1));
  // dithered band edges
  for (let i = 1; i < bands.length; i++) for (let x = 0; x < W; x += 2) R(ctx, bands[i], x + (i % 2), i * bh - 1, 1, 1);
  R(ctx, bands[bands.length - 1], 0, bands.length * bh, W, H);
  const r = rng(7);
  for (let i = 0; i < 70; i++) { const y = r() * 60; R(ctx, r() < 0.2 ? '#9fe8ff' : '#6a5a9e', r() * W | 0, y | 0, 1, 1); }
  // far megacity silhouettes (two depths)
  const far = (col, base, hmin, hmax, wmin, wmax, winCols, seed) => {
    const q = rng(seed);
    for (let x = -5; x < W;) {
      const w = (wmin + q() * (wmax - wmin)) | 0, h = (hmin + q() * (hmax - hmin)) | 0;
      R(ctx, col, x, base - h, w, h + 60);
      if (q() < 0.3) R(ctx, col, x + (w >> 1) - 1, base - h - 6, 2, 6); // antenna
      if (q() < 0.2) R(ctx, '#ff3e6c', x + (w >> 1) - 1, base - h - 7, 1, 1);
      for (let wy = base - h + 3; wy < base; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        if (q() < 0.22) R(ctx, winCols[(q() * winCols.length) | 0], wx, wy, 1, 1);
      }
      x += w + ((q() * 3) | 0);
    }
  };
  far('#170f3a', 92, 18, 46, 8, 20, ['#3b2f7a', '#5a3f8a', '#2f6f8f'], 3);
  far('#100a2a', 104, 10, 34, 10, 26, ['#ffd23e55', '#43e8ff66', '#ff3ea566', '#6b4fa0'], 11);
  return cv;
}

// the "cyber-eye" moon: rings + iris, also the seed of the intro zoom
export function bakeMoon(r = 20) {
  const s = r * 2 + 8, cv = makeCanvas(s, s), ctx = cv.getContext('2d');
  const c = s / 2;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
    if (d < r) {
      const k = d / r;
      let col = k < 0.35 ? '#fff4c9' : k < 0.6 ? '#ffe7a8' : k < 0.85 ? '#ffd07a' : '#f0a860';
      if ((x * 7 + y * 3) % 11 === 0 && k > 0.4) col = '#e39a58';
      R(ctx, col, x, y, 1, 1);
    } else if (Math.abs(d - (r + 2.5)) < 0.6 && (Math.atan2(y - c, x - c) * 8 | 0) % 2 === 0) R(ctx, '#ff7ac8', x, y, 1, 1);
  }
  // cat-slit shadow across the moon (a sleeping cat eye)
  for (let y = -r; y < r; y++) {
    const w = Math.max(0, Math.round((1 - Math.abs(y / r)) * 3.2));
    R(ctx, '#c7824a', Math.round(c) - w, Math.round(c + y), w * 2, 1);
  }
  return cv;
}

// ------------------------------------------------------------------ alley structure
export function bakeAlley() {
  const cv = makeCanvas(W, H), ctx = cv.getContext('2d');
  const r = rng(42);
  // back wall at the end of the alley
  R(ctx, '#1e1744', 70, 64, 180, 66);
  for (let y = 66; y < 128; y += 4) for (let x = 70 + ((y / 4) % 2) * 4; x < 250; x += 8) R(ctx, '#241c52', x, y, 7, 3);
  R(ctx, '#151036', 70, 64, 180, 2);
  // graffiti: a big cat tag + paw prints
  const tag = (x, y, c) => {
    const pts = [[0, 6], [1, 2], [2, 0], [3, 2], [5, 3], [7, 3], [9, 2], [10, 0], [11, 2], [12, 6], [12, 9], [10, 12], [6, 13], [2, 12], [0, 9]];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) R(ctx, c, x + Math.round(x0 + (x1 - x0) * k / n) * 2, y + Math.round(y0 + (y1 - y0) * k / n) * 2, 2, 1);
    }
    R(ctx, c, x + 7, y + 12, 2, 2); R(ctx, c, x + 15, y + 12, 2, 2); R(ctx, c, x + 11, y + 17, 3, 1);
  };
  tag(118, 76, '#6b2a6e'); tag(176, 90, '#1f5a6e');
  for (let i = 0; i < 6; i++) { const x = 90 + i * 25, y = 116 - (i % 2) * 3; R(ctx, '#3a2a60', x, y, 2, 2); R(ctx, '#3a2a60', x - 1, y - 2, 1, 1); R(ctx, '#3a2a60', x + 2, y - 2, 1, 1); R(ctx, '#3a2a60', x + 1, y - 3, 1, 1); }
  // back door with light
  R(ctx, '#0e0a24', 150, 96, 20, 32); R(ctx, '#2c2266', 148, 94, 24, 2); R(ctx, '#2c2266', 148, 94, 2, 34); R(ctx, '#2c2266', 170, 94, 2, 34);
  R(ctx, '#3b2a2a', 152, 98, 16, 30);
  R(ctx, '#ffb86b', 159, 108, 2, 3); // knob glint
  // left building
  const bldg = (x0, x1, top, face, dark, edgeX) => {
    R(ctx, face, x0, top, x1 - x0, GROUND_Y - top + 2);
    for (let y = top + 2; y < GROUND_Y; y += 3) for (let x = x0 + ((y / 3) % 2) * 3; x < x1; x += 6) R(ctx, dark, x, y, 5, 1);
    R(ctx, '#3a2f7a', edgeX, top, 2, GROUND_Y - top + 2);
  };
  bldg(0, 72, 0, '#1b1440', '#171036', 70);
  bldg(248, 320, 0, '#1a1340', '#161036', 248);
  // rooftop edges / cornices
  R(ctx, '#2c2366', 0, 14, 74, 3); R(ctx, '#2c2366', 246, 20, 74, 3);
  // windows (base = dark; lit versions are drawn live by hype)
  for (const w of WINDOWS) { R(ctx, '#0c0920', w.x - 1, w.y - 1, w.w + 2, w.h + 2); R(ctx, '#161236', w.x, w.y, w.w, w.h); R(ctx, '#2a2260', w.x, w.y + w.h, w.w, 1); }
  // fire escape on left building
  for (const y of [58, 92]) {
    R(ctx, '#3d3470', 20, y, 44, 2); for (let x = 20; x < 64; x += 3) R(ctx, '#3d3470', x, y - 7, 1, 7); R(ctx, '#3d3470', 20, y - 8, 44, 1);
  }
  for (let i = 0; i < 12; i++) R(ctx, '#3d3470', 30 + i * 2, 60 + i * 2.6 | 0, 3, 1);
  // AC units + pipes (right)
  const ac = (x, y) => { R(ctx, '#4a4280', x, y, 14, 10); R(ctx, '#2a2458', x + 1, y + 1, 12, 8); for (let k = 0; k < 4; k++) R(ctx, '#5b52a0', x + 2, y + 2 + k * 2, 10, 1); R(ctx, '#1a1438', x + 1, y + 10, 12, 1); };
  ac(254, 70); ac(290, 104); ac(6, 110);
  R(ctx, '#39306e', 312, 0, 3, 128); R(ctx, '#39306e', 262, 40, 50, 2); R(ctx, '#4b4390', 312, 60, 3, 2);
  R(ctx, '#39306e', 74, 30, 2, 98); // drain pipe by left building
  // vending machine
  R(ctx, '#2d2470', 200, 94, 24, 34); R(ctx, '#1a1447', 202, 96, 20, 16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) R(ctx, ['#ff3ea5', '#43e8ff', '#ffd23e', '#7dff6a'][(i + j) % 4], 204 + i * 5, 99 + j * 6, 3, 4);
  R(ctx, '#15103a', 204, 116, 16, 6); R(ctx, '#43e8ff', 216, 114, 3, 1);
  // crates / cardboard (cat houses) on the left
  const crate = (x, y, w, h, c) => { R(ctx, c, x, y, w, h); R(ctx, '#00000033', x, y + h - 2, w, 2); R(ctx, '#ffffff22', x, y, w, 1); R(ctx, '#00000044', x + (w >> 1), y, 1, h); };
  crate(82, 110, 26, 18, '#6b4a3a'); crate(88, 96, 18, 14, '#7a5642'); crate(108, 116, 16, 12, '#5a3d33');
  R(ctx, '#2a1f33', 94, 99, 8, 4); // hole in box
  // trash cans (right)
  const can = (x, y) => { R(ctx, '#46508a', x, y, 14, 16); R(ctx, '#5c67a8', x - 1, y - 2, 16, 3); for (let k = 0; k < 3; k++) R(ctx, '#39417a', x + 3 + k * 4, y + 2, 1, 13); };
  can(228, 112); can(180, 114);
  // ground: wet asphalt with perspective
  const G = ['#141030', '#16123a', '#191441', '#1c1747', '#1f194d'];
  for (let y = GROUND_Y; y < H; y++) R(ctx, G[Math.min(4, ((y - GROUND_Y) / 11) | 0)], 0, y, W, 1);
  for (let i = -8; i <= 8; i++) {
    const x0 = 160 + i * 12, x1 = 160 + i * 40;
    for (let y = GROUND_Y + 1; y < H; y += 2) { const t = (y - GROUND_Y) / (H - GROUND_Y); R(ctx, '#221c52', Math.round(x0 + (x1 - x0) * t), y, 1, 1); }
  }
  for (let i = 0; i < 90; i++) R(ctx, '#2b2462', r() * W | 0, GROUND_Y + r() * 52 | 0, 1 + (r() * 3 | 0), 1);
  R(ctx, '#0d0a22', 0, GROUND_Y, W, 1);
  // arena circle painted on the street (spray paint)
  for (let a = 0; a < Math.PI * 2; a += 0.012) {
    const x = 160 + Math.cos(a) * 118, y = 152 + Math.sin(a) * 18;
    if (Math.sin(a * 9) > -0.6) R(ctx, '#3b2f7e', Math.round(x), Math.round(y), 2, 1);
  }
  // puddles (base, reflections drawn live)
  for (const p of PUDDLES) { for (let y = 0; y < p.h; y++) { const k = 1 - Math.pow((y - p.h / 2) / (p.h / 2), 2); const w = Math.round(p.w * Math.sqrt(Math.max(0, k))); R(ctx, '#0f0c2a', p.x - (w >> 1), p.y + y, w, 1); } }
  // manhole spots where the two cats sit
  for (const x of [84, 236]) { R(ctx, '#2a2360', x - 14, 149, 28, 5); R(ctx, '#332a70', x - 12, 150, 24, 3); for (let k = -10; k <= 10; k += 4) R(ctx, '#211b50', x + k, 150, 2, 3); }
  return cv;
}

// Foreground overhead (cables hanging across, drawn above the audience)
export function bakeCables() {
  const cv = makeCanvas(W, H), ctx = cv.getContext('2d');
  const cable = (x0, y0, x1, y1, sag, c) => { for (let x = x0; x <= x1; x++) { const t = (x - x0) / (x1 - x0); const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag; R(ctx, c, x, Math.round(y), 1, 1); } };
  cable(0, 26, 320, 34, 14, '#0c0820'); cable(0, 44, 320, 40, 10, '#0c0820'); cable(60, 8, 320, 16, 18, '#110c2c');
  return cv;
}
export function cableY(i, x) { // matching the lights along cables
  if (i === 0) { const t = x / 320; return 26 + 8 * t + Math.sin(t * Math.PI) * 14; }
  const t = x / 320; return 44 - 4 * t + Math.sin(t * Math.PI) * 10;
}

export const WINDOWS = [
  { x: 8, y: 24, w: 10, h: 12, tier: 0, col: '#ffcf6b', cat: 'yoru' }, { x: 26, y: 24, w: 10, h: 12, tier: 2, col: '#6be8ff' },
  { x: 44, y: 24, w: 10, h: 12, tier: 1, col: '#ff8fd0', cat: 'mike' }, { x: 8, y: 70, w: 10, h: 12, tier: 3, col: '#ffcf6b' },
  { x: 44, y: 70, w: 10, h: 12, tier: 1, col: '#ffcf6b' },
  { x: 258, y: 30, w: 10, h: 12, tier: 0, col: '#6be8ff' }, { x: 278, y: 30, w: 10, h: 12, tier: 2, col: '#ffcf6b', cat: 'neo' },
  { x: 298, y: 30, w: 10, h: 12, tier: 3, col: '#ff8fd0' }, { x: 274, y: 88, w: 10, h: 12, tier: 1, col: '#ffcf6b', cat: 'cream' },
  { x: 296, y: 64, w: 10, h: 12, tier: 4, col: '#7dff6a' },
];
export const PUDDLES = [{ x: 40, y: 164, w: 46, h: 6 }, { x: 160, y: 138, w: 60, h: 5 }, { x: 290, y: 168, w: 40, h: 7 }, { x: 140, y: 172, w: 34, h: 5 }];

// ------------------------------------------------------------------ neon signs
function sign(text, color, x, y, opt = {}) {
  const mask = textMask(text, opt);
  let spr = tint(mask, color);
  if (opt.frame) {
    const f = makeCanvas(mask.width + 6, mask.height + 6), c = f.getContext('2d');
    c.fillStyle = color; c.fillRect(0, 0, f.width, 1); c.fillRect(0, f.height - 1, f.width, 1); c.fillRect(0, 0, 1, f.height); c.fillRect(f.width - 1, 0, 1, f.height);
    c.drawImage(spr, 3, 3); spr = f;
  }
  return { spr, glow: glowOf(spr, 3), x, y, color, alt: opt.alt, tier: opt.tier || 0, flicker: opt.flicker || 0, pulse: opt.pulse || 0, backing: opt.backing };
}

function shapeSprite(rows, color) {
  const h = rows.length, w = rows[0].length, cv = makeCanvas(w, h), ctx = cv.getContext('2d');
  ctx.fillStyle = color;
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') ctx.fillRect(x, y, 1, 1); });
  return cv;
}

export function makeSigns() {
  const fish = shapeSprite([
    '....#####.....#',
    '..##.....##..##',
    '.#..#......###.',
    '#...........#..',
    '.#.........###.',
    '..##.....##..##',
    '....#####.....#',
  ], '#43e8ff');
  const catHead = shapeSprite([
    '#.........#',
    '##.......##',
    '#.#.....#.#',
    '#..#####..#',
    '#.........#',
    '#..#...#..#',
    '#.........#',
    '.#...#...#.',
    '..#.....#..',
    '...#####...',
  ], '#ff3ea5');
  const S = [
    { ...sign('ネコ', '#ff3ea5', 57, 24, { vertical: true, frame: true, alt: '#43e8ff', flicker: 0.02, backing: true }) },
    { ...sign('BAR NYA', '#43e8ff', 6, 46, { frame: true, alt: '#ff3ea5', tier: 1, backing: true }) },
    { ...sign('マタタビ', '#ffd23e', 250, 48, { vertical: true, frame: true, alt: '#ffd23e', tier: 0, flicker: 0.05, backing: true }) },
    { ...sign('24H', '#7dff6a', 204, 88, { tier: 0 }) },
    { ...sign('OPEN', '#ff4f6d', 152, 88, { tier: 1, flicker: 0.01 }) },
    { ...sign('NYAGORO CUP', '#ff3ea5', 115, 70, { frame: true, alt: '#43e8ff', tier: 2, pulse: 1, backing: true }) },
    { spr: fish, glow: glowOf(fish, 3), x: 272, y: 12, color: '#43e8ff', alt: '#ff3ea5', tier: 1, flicker: 0, pulse: 0 },
    { spr: catHead, glow: glowOf(catHead, 3), x: 228, y: 74, color: '#ff3ea5', alt: '#43e8ff', tier: 3, flicker: 0, pulse: 1 },
    { ...sign('ニャ★', '#ffd23e', 20, 84, { tier: 3, pulse: 1 }) },
    { ...sign('>>', '#43e8ff', 285, 118, { tier: 2, pulse: 1 }) },
  ];
  // alternate-colored variants for 逆モード (cyan⇄magenta flip)
  for (const s of S) {
    if (s.alt && s.alt !== s.color) { s.sprAlt = tint(s.spr, s.alt); s.glowAlt = glowOf(s.sprAlt, 3); }
  }
  return S;
}

// Skyline seen from far above, for the intro dive.
export function bakeCity() {
  const cv = makeCanvas(W, H), ctx = cv.getContext('2d');
  ctx.drawImage(bakeSky(), 0, 0);
  const r = rng(99);
  const rowsBase = [120, 140, 165, 190];
  rowsBase.forEach((base, ri) => {
    for (let x = -4; x < W;) {
      const w = 10 + (r() * 18 | 0), h = 30 + (r() * 60 | 0) + ri * 6;
      const shade = ['#130c32', '#170f3b', '#1b1245', '#20164e'][ri];
      if (Math.abs(x + w / 2 - 160) < 12 && ri === 2) { x += 22; continue; } // the gap = our alley
      R(ctx, shade, x, base - h, w, h + 40);
      for (let wy = base - h + 3; wy < base; wy += 3) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (r() < 0.25) R(ctx, ['#ffd23e', '#43e8ff', '#ff3ea5', '#6b4fa0', '#ffcf6b'][r() * 5 | 0], wx, wy, 1, 1);
      if (r() < 0.25) R(ctx, ['#ff3ea5', '#43e8ff', '#ffd23e'][r() * 3 | 0], x + 1, base - h + 5, w - 2, 2);
      x += w + 1;
    }
  });
  // glow of the alley in the gap
  for (let y = 60; y < 180; y++) { const k = (y - 60) / 120; ctx.globalAlpha = 0.08 + k * 0.3; R(ctx, '#ff3ea5', 152 - k * 6, y, 16 + k * 12, 1); }
  ctx.globalAlpha = 1;
  return cv;
}
