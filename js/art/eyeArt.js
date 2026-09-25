// A cute cat eye (round pupil, two sparkles) — used by the title intro and
// the ending. Drawn per-pixel so it stays pixel art at any size.
import { makeCanvas, hex, mix } from './pixel.js';

const OUT = hex('#1a0f2e');

/** filled pixel circle (integer rows, no antialiasing) */
export function pixCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = Math.floor(-r); y <= Math.ceil(r); y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - (y + 0.5) * (y + 0.5))));
    if (w > 0) ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

/**
 * Round iris only (for the intro portal). Pupil + sparkles are drawn on top
 * by drawPupil so they can animate.
 */
export function cuteIris(r, color = '#8ff05a') {
  const s = Math.ceil(r * 2 + 4), cv = makeCanvas(s, s), c = cv.getContext('2d');
  const img = c.createImageData(s, s), d = img.data;
  const base = hex(color), dark = mix(base, OUT, 0.55), light = mix(base, [255, 255, 235], 0.45);
  const cx = s / 2, cy = s / 2;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dist = Math.hypot(dx, dy) / r;
    if (dist > 1) continue;
    let col;
    if (dist > 0.9) col = OUT;
    else {
      const v = (dy / r + 1) / 2; // 0 top → 1 bottom
      col = v < 0.45 ? mix(dark, base, v / 0.45) : mix(base, light, (v - 0.45) / 0.55);
      const a = Math.atan2(dy, dx);
      if (dist > 0.5 && Math.sin(a * 14) > 0.75) col = mix(col, light, 0.35); // soft streaks
      if (dist > 0.78) col = mix(col, dark, 0.35);
    }
    const o = (y * s + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

/** round pupil + two highlights (the cute part) */
export function drawPupil(ctx, cx, cy, pr, { shine = 1 } = {}) {
  pixCircle(ctx, cx, cy, pr, '#140c22');
  if (shine <= 0) return;
  ctx.globalAlpha = shine;
  pixCircle(ctx, cx - pr * 0.42, cy - pr * 0.42, Math.max(1.5, pr * 0.34), '#ffffff');
  pixCircle(ctx, cx + pr * 0.38, cy + pr * 0.36, Math.max(1, pr * 0.14), '#ffffff');
  ctx.globalAlpha = 1;
}

/**
 * Close-up of a whole eye with fur around it.
 * @param {{w,h, fur, furDark, iris, open:0..1, hole:number (window radius in px, 0 = none), pupil:number, look:number}} o
 * Returns a canvas; pixels inside the "hole" are transparent so a scene can show through.
 */
export function cuteEyeCloseup(o) {
  const { w, h } = o;
  const cv = makeCanvas(w, h), c = cv.getContext('2d');
  const img = c.createImageData(w, h), d = img.data;
  const fur = hex(o.fur), furD = hex(o.furDark), irisC = hex(o.iris);
  const irisDark = mix(irisC, OUT, 0.5), irisLight = mix(irisC, [255, 255, 235], 0.45);
  const cx = w / 2 + (o.look || 0), cy = h / 2;
  const A = w * 0.3, Bv = h * 0.38;                  // eye opening (superellipse)
  const R = Bv * 1.12;                               // iris radius (big, cute; lids crop it)
  const open = o.open ?? 1;
  const put = (x, y, col, a = 255) => { const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ex = (x + 0.5 - w / 2) / A, ey = (y + 0.5 - cy) / Bv;
    const inside = Math.pow(Math.abs(ex), 2.3) + Math.pow(Math.abs(ey), 2.3) <= 1;
    // lids close towards the middle
    const lidTop = -1 + (1 - open) * 1.02, lidBot = 1 - (1 - open) * 1.02;
    if (!inside || ey < lidTop || ey > lidBot) {
      // fur with soft stripes; lash line along the upper lid
      const stripe = Math.sin((x * 0.35 + y * 0.12)) > 0.86 ? 0.82 : 1;
      let col = mix(fur, furD, (y / h) * 0.35);
      col = [col[0] * stripe, col[1] * stripe, col[2] * stripe];
      const nearLid = inside && (Math.abs(ey - lidTop) < 0.09 || Math.abs(ey - lidBot) < 0.06);
      const edgeV = Math.pow(Math.abs(ex), 2.3) + Math.pow(Math.abs(ey), 2.3);
      const nearEdge = !inside && (edgeV <= (ey < 0 ? 1.32 : 1.1)) || (!inside && ex > 0.9 && ex < 1.25 && ey > -0.55 && ey < -0.2 - (ex - 0.9) * 0.8);
      if (nearLid || nearEdge) col = OUT;
      put(x, y, col);
      continue;
    }
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dist = Math.hypot(dx, dy);
    if (o.hole && dist < o.hole) { put(x, y, [0, 0, 0], 0); continue; }
    if (dist <= R) {
      let col;
      if (dist > R - 1.5) col = OUT;
      else {
        const v = (dy / R + 1) / 2;
        col = v < 0.45 ? mix(irisDark, irisC, v / 0.45) : mix(irisC, irisLight, (v - 0.45) / 0.55);
        if (Math.sin(Math.atan2(dy, dx) * 16) > 0.8 && dist > R * 0.5) col = mix(col, irisLight, 0.3);
      }
      put(x, y, col);
    } else {
      // white of the eye with the lid's shadow on top
      let col = [255, 250, 240];
      if (ey < -0.55) col = [214, 206, 236];
      put(x, y, col);
    }
  }
  c.putImageData(img, 0, 0);
  if (o.pupil) drawPupil(c, cx, cy, o.pupil, { shine: o.shine ?? 1 });
  return cv;
}
