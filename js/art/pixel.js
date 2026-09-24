// Pixel-art toolkit.
// Sprites are painted as *label grids* (what each pixel is: fur, eye, nose...)
// and only then colorized. That lets one pose drawing produce every coat
// pattern, and gives us automatic outlines + neon rim lighting for free.

export const L = {
  EMPTY: 0, FUR: 1, LIGHT: 2, EAR_IN: 3, EYE: 4, PUPIL: 5, SHINE: 6, NOSE: 7,
  LINE: 8, MOUTH: 9, TONGUE: 10, BLUSH: 11, TEAR: 12, ACC1: 13, ACC2: 14,
  GLOW: 15, PAD: 16, WHITE: 17, GOLD: 18, DARK: 19,
};

// Parts let coat patterns know "where" a pixel is (siamese points etc).
export const P = { NONE: 0, HEAD: 1, BODY: 2, EAR: 3, TAIL: 4, LEG: 5, MUZZLE: 6 };

export class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.lab = new Uint8Array(w * h);
    this.part = new Uint8Array(w * h);
    this.anchor = { hx: w / 2, hy: h / 2 };
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.in(x, y) ? this.lab[y * this.w + x] : 0; }
  getPart(x, y) { return this.in(x, y) ? this.part[y * this.w + x] : 0; }
  set(x, y, l, p = P.NONE) {
    x |= 0; y |= 0;
    if (!this.in(x, y)) return;
    const i = y * this.w + x;
    this.lab[i] = l;
    if (p !== undefined) this.part[i] = p;
  }
  // Only paint where something already is (for markings inside a silhouette).
  over(x, y, l) {
    x |= 0; y |= 0;
    if (!this.in(x, y)) return;
    const i = y * this.w + x;
    if (this.lab[i]) this.lab[i] = l;
  }
  rect(x, y, w, h, l, p) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, l, p);
  }
  ellipse(cx, cy, rx, ry, l, p, onlyOver = false) {
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / (rx + 0.35), dy = (y + 0.5 - cy) / (ry + 0.35);
      if (dx * dx + dy * dy <= 1) onlyOver ? this.over(x, y, l) : this.set(x, y, l, p);
    }
  }
  tri(ax, ay, bx, by, cx, cy, l, p) {
    const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
    const s = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = s(px, py, ax, ay, bx, by), d2 = s(px, py, bx, by, cx, cy), d3 = s(px, py, cx, cy, ax, ay);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) this.set(x, y, l, p);
    }
  }
  line(x0, y0, x1, y1, l, p, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (thick <= 1) this.set(x0, y0, l, p);
      else this.rect(x0 - ((thick - 1) >> 1), y0 - ((thick - 1) >> 1), thick, thick, l, p);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  pix(list, l, p) { for (const [x, y] of list) this.set(x, y, l, p); }
  flipX() {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const s = y * this.w + x, d = y * this.w + (this.w - 1 - x);
      g.lab[d] = this.lab[s]; g.part[d] = this.part[s];
    }
    g.anchor = { hx: this.w - 1 - this.anchor.hx, hy: this.anchor.hy };
    return g;
  }
  // Pixel-perfect 90deg rotations (used for the rolling ball cat).
  rot90(times) {
    times = ((times % 4) + 4) % 4;
    let g = this;
    for (let t = 0; t < times; t++) {
      const n = new Grid(g.h, g.w);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        const s = y * g.w + x, nx = g.h - 1 - y, ny = x, d = ny * n.w + nx;
        n.lab[d] = g.lab[s]; n.part[d] = g.part[s];
      }
      n.anchor = { hx: g.h - 1 - g.anchor.hy, hy: g.anchor.hx };
      g = n;
    }
    return g;
  }
}

// ---------- color helpers ----------
export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
export function rgb(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }
export function shade(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }

export const OUTLINE = hex('#1a0f2e');
export const RIM_L = hex('#ff4fb8'); // magenta neon from the left
export const RIM_R = hex('#43e8ff'); // cyan neon from the right

// Turn a label grid into a canvas.
// colorFn(label, part, x, y, grid) -> [r,g,b] | null
export function renderGrid(grid, colorFn, opts = {}) {
  const { outline = OUTLINE, rim = 0.32, shadeBottom = 0.78, headSep = true } = opts;
  const w = grid.w, h = grid.h;
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const isFill = (x, y) => { const l = grid.get(x, y); return l !== 0 && l !== L.TEAR; };
  const furLike = (l) => l === L.FUR || l === L.LIGHT;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, l = grid.lab[i];
    let c = null;
    if (l) {
      c = colorFn(l, grid.part[i], x, y, grid);
      if (!c) continue;
      if (furLike(l) || l === L.ACC1 || l === L.ACC2) {
        if (!isFill(x, y + 1) && shadeBottom < 1) c = shade(c, shadeBottom);
        if (headSep && grid.part[i] === P.BODY && grid.getPart(x, y - 1) === P.HEAD && grid.get(x, y - 1) !== L.LINE) c = shade(c, 0.7);
        if (rim > 0) {
          if (!isFill(x - 1, y)) c = mix(c, RIM_L, rim);
          else if (!isFill(x + 1, y)) c = mix(c, RIM_R, rim);
        }
      }
    } else if (outline) {
      if (isFill(x - 1, y) || isFill(x + 1, y) || isFill(x, y - 1) || isFill(x, y + 1)) c = outline;
    }
    if (c) {
      const o = i * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c.length > 3 ? c[3] : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && !globalThis.__forceDomCanvas) {
    // Offscreen canvases can't become data URLs synchronously; use DOM canvas
    // (they're cheap at these sizes and work everywhere).
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Parse a string bitmap: rows of chars, map char -> label.
export function stamp(grid, ox, oy, rows, map, part) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const l = map[ch];
      if (l !== undefined) grid.set(ox + x, oy + y, l, part);
    }
  });
}

// Draw a small colored bitmap directly (for icons / props).
export function bitmap(rows, colors, scale = 1) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const cv = makeCanvas(w * scale, h * scale);
  const ctx = cv.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = colors[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  return cv;
}

// Soft neon glow copy of a sprite (pre-baked, cheap to draw with 'lighter').
export function glowOf(src, radius = 3, color = null) {
  const pad = radius * 2;
  const cv = makeCanvas(src.width + pad * 2, src.height + pad * 2);
  const ctx = cv.getContext('2d');
  let base = src;
  if (color) {
    base = makeCanvas(src.width, src.height);
    const b = base.getContext('2d');
    b.drawImage(src, 0, 0);
    b.globalCompositeOperation = 'source-in';
    b.fillStyle = color; b.fillRect(0, 0, src.width, src.height);
  }
  if ('filter' in ctx) {
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(base, pad, pad);
    ctx.drawImage(base, pad, pad);
    ctx.filter = 'none';
  } else {
    ctx.globalAlpha = 0.18;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) ctx.drawImage(base, pad + dx, pad + dy);
    }
  }
  cv.pad = pad;
  return cv;
}

// Deterministic hash noise for patterns.
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
