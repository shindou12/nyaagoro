// UI icons (pixel art) — action icons, fish lives, badges.
// Returned as canvases; `iconURL()` gives data URLs for DOM <img>.
import { Grid, L, P, renderGrid, hex, makeCanvas } from './pixel.js';

const cache = new Map();
const C = (h) => hex(h);

export const ACTION_COLORS = {
  nya: { main: '#43e8ff', dark: '#1a7fa8', light: '#e8fdff', name: 'にゃー' },
  goro: { main: '#ffb03e', dark: '#b8611c', light: '#fff2d6', name: 'ごろ' },
  goronya: { main: '#ff3ea5', dark: '#9c1f68', light: '#ffe0f2', name: 'ごろにゃー' },
};

function catFace(g, cx, cy, mouthOpen) {
  g.tri(cx - 6.5, cy - 1, cx - 5.5, cy - 8.5, cx - 1.5, cy - 4, L.FUR, P.EAR);
  g.tri(cx + 6.5, cy - 1, cx + 5.5, cy - 8.5, cx + 1.5, cy - 4, L.FUR, P.EAR);
  g.set(Math.round(cx - 5), Math.round(cy - 5), L.EAR_IN); g.set(Math.round(cx + 4), Math.round(cy - 5), L.EAR_IN);
  g.ellipse(cx, cy, 6.8, 5.2, L.FUR, P.HEAD);
  g.ellipse(cx, cy + 2.2, 3, 1.8, L.LIGHT, P.MUZZLE);
  const ex = [Math.round(cx - 4), Math.round(cx + 2)], ey = Math.round(cy - 1);
  for (const x of ex) g.pix([[x, ey + 1], [x + 1, ey], [x + 2, ey + 1]], L.LINE);
  if (mouthOpen) { g.rect(Math.round(cx - 2), Math.round(cy + 2), 4, 3, L.MOUTH); g.rect(Math.round(cx - 1), Math.round(cy + 4), 2, 1, L.TONGUE); }
  else g.pix([[Math.round(cx - 1), Math.round(cy + 2)], [Math.round(cx), Math.round(cy + 2)]], L.NOSE);
}

function spiralBall(g, cx, cy, r) {
  g.ellipse(cx, cy, r, r, L.FUR, P.BODY);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > r - 0.5) continue;
    let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2;
    const s = (a / (Math.PI * 2)) * 3.6 + 0.8;
    if (Math.abs(((d - s) % 3.6 + 3.6) % 3.6) < 0.75) g.set(x, y, L.ACC1);
  }
}

export function actionIcon(action, size = 16) {
  const key = 'A|' + action + '|' + size;
  if (cache.has(key)) return cache.get(key);
  const g = new Grid(size + 2, size + 2);
  const c = ACTION_COLORS[action];
  const m = size / 2 + 1;
  if (action === 'nya') {
    catFace(g, m, m + 1.5, true);
    g.pix([[size - 1, 3], [size, 2], [size - 1, 6], [size, 6]], L.GLOW); // sound lines
  } else if (action === 'goro') {
    spiralBall(g, m, m + 1, size / 2 - 1);
    g.pix([[1, m - 2], [2, m - 2], [0, m + 1], [1, m + 1], [1, m + 4], [2, m + 4]], L.GLOW); // motion
  } else {
    spiralBall(g, m, m + 2, size / 2 - 1.5);
    g.tri(m - 6, m - 2, m - 5, m - 8, m - 1.5, m - 4.5, L.FUR, P.EAR);
    g.tri(m + 6, m - 2, m + 5, m - 8, m + 1.5, m - 4.5, L.FUR, P.EAR);
    g.pix([[size, 1], [size - 1, 2], [size, 2], [size + 1, 2], [size, 3], [1, size - 1], [0, size], [1, size], [2, size], [1, size + 1]], L.GOLD);
  }
  const map = {
    [L.FUR]: C(c.main), [L.LIGHT]: C(c.light), [L.ACC1]: C(c.dark), [L.LINE]: C('#1a0f2e'), [L.MOUTH]: C('#6a1c3a'),
    [L.TONGUE]: C('#ff7aa8'), [L.EAR_IN]: C('#ff9bc4'), [L.NOSE]: C('#ff5f96'), [L.GLOW]: C(c.light), [L.GOLD]: C('#ffe14a'),
  };
  const cv = renderGrid(g, (l) => map[l] || null, { rim: 0, shadeBottom: 0.82, headSep: false });
  cache.set(key, cv);
  return cv;
}

export function fishIcon(state = 'full') {
  const key = 'F|' + state;
  if (cache.has(key)) return cache.get(key);
  const g = new Grid(17, 11);
  if (state === 'bone') {
    g.line(3, 5, 12, 5, L.LINE);
    for (let x = 5; x <= 11; x += 2) { g.set(x, 3, L.LINE); g.set(x, 4, L.LINE); g.set(x, 6, L.LINE); g.set(x, 7, L.LINE); }
    g.tri(12, 5, 15.5, 1.5, 15.5, 8.5, L.LINE);
    g.ellipse(3, 5, 2.2, 2.2, L.LINE); g.set(3, 4, L.EYE);
  } else {
    g.ellipse(7, 5.5, 6, 3.6, L.FUR, P.BODY);
    g.tri(11.5, 5.5, 16, 1, 16, 10, L.FUR, P.TAIL);
    g.ellipse(7, 7, 4.2, 1.4, L.LIGHT, P.BODY);
    g.set(4, 4, L.EYE); g.set(3, 4, L.SHINE);
    g.pix([[8, 3], [9, 4], [8, 5]], L.ACC1);
    g.pix([[1, 6], [2, 6]], L.LINE);
  }
  const map = {
    [L.FUR]: C('#ff8a5b'), [L.LIGHT]: C('#ffe1c4'), [L.EYE]: C('#1a0f2e'), [L.SHINE]: C('#ffffff'), [L.ACC1]: C('#d9533a'),
    [L.LINE]: state === 'bone' ? C('#6d6394') : C('#1a0f2e'),
  };
  if (state === 'bone') map[L.EYE] = C('#2a2250');
  const cv = renderGrid(g, (l) => map[l] || null, { rim: state === 'bone' ? 0 : 0.25, outline: state === 'bone' ? null : undefined, headSep: false });
  cache.set(key, cv);
  return cv;
}

export function swapIcon() {
  const key = 'swap';
  if (cache.has(key)) return cache.get(key);
  const rows = [
    '..#.......',
    '.##.......',
    '#########.',
    '.##.......',
    '..#....#..',
    '.......##.',
    '.#########',
    '.......##.',
    '.......#..',
  ];
  const cv = makeCanvas(10, 9), ctx = cv.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') { ctx.fillStyle = y < 4 ? '#43e8ff' : '#ffb03e'; ctx.fillRect(x, y, 1, 1); } });
  cache.set(key, cv);
  return cv;
}

export function pawIcon(color = '#ff3ea5') {
  const key = 'paw|' + color;
  if (cache.has(key)) return cache.get(key);
  const rows = ['.#.#.', '#.#.#', '.....', '.###.', '#####', '.###.'];
  const cv = makeCanvas(5, 6), ctx = cv.getContext('2d');
  ctx.fillStyle = color;
  rows.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === '#') ctx.fillRect(x, y, 1, 1); });
  cache.set(key, cv);
  return cv;
}

const urlCache = new Map();
export function toURL(cv) {
  let u = urlCache.get(cv);
  if (!u) { u = cv.toDataURL(); urlCache.set(cv, u); }
  return u;
}
