// Pixel particle effects + little scripted skits, drawn above the world.
import { CanvasView } from '../../core/View.js';
import { fishIcon } from '../../art/icons.js';
import { smallCat } from '../../art/catArt.js';

const COLORS = { nya: ['#43e8ff', '#e8fdff', '#9ff4ff'], goro: ['#ffb03e', '#fff2d6', '#ffd23e'], goronya: ['#ff3ea5', '#ffe0f2', '#ffd23e', '#43e8ff'], ok: ['#7dff6a', '#ffffff', '#ffd23e'], party: ['#ff3ea5', '#43e8ff', '#ffd23e', '#7dff6a', '#b18cff'], miss: ['#ff4f6d', '#6d6394'] };

export class FxCanvas extends CanvasView {
  constructor() {
    super('FxCanvas');
    this.parts = [];
    this.rings = [];
    this.skits = [];
    this.confettiRate = 0;
    this.last = 0;
  }

  burst(x, y, kind = 'sparkle', n = 12, palette = 'nya') {
    const cols = COLORS[palette] || COLORS.party;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 70;
      this.parts.push({
        kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'confetti' ? 60 : 20), g: kind === 'confetti' ? 90 : kind === 'note' ? -10 : 40,
        life: 0.5 + Math.random() * 0.6, t: 0, c: cols[i % cols.length], s: Math.random() < 0.3 ? 2 : 1, rot: Math.random() * 4 | 0,
      });
    }
  }
  ring(x, y, color = '#43e8ff', max = 30, dur = 0.4) { this.rings.push({ x, y, color, max, dur, t: 0 }); }
  notes(x, y, color) { for (let i = 0; i < 3; i++) this.parts.push({ kind: 'note', x: x + (i - 1) * 6, y, vx: (i - 1) * 10, vy: -30 - i * 8, g: 0, life: 0.8, t: -i * 0.08, c: color, s: 1 }); }

  /** A fish hops out of the HUD and a stray cat runs off with it. */
  fishSteal(fromX, fromY, toX, toY, side) {
    this.skits.push({ kind: 'fish', fromX, fromY, toX, toY, side, t: 0, breed: ['sabi', 'gray', 'kiji', 'choco'][Math.random() * 4 | 0] });
  }

  update(t) {
    const dt = Math.min(0.05, t - (this.last || t)); this.last = t;
    for (const p of this.parts) { p.t += dt; if (p.t < 0) continue; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; if (p.kind === 'confetti') p.vx += Math.sin(p.t * 8 + p.rot) * 2; }
    this.parts = this.parts.filter((p) => p.t < p.life && p.y < 190);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.dur);
    for (const s of this.skits) s.t += dt;
    this.skits = this.skits.filter((s) => s.t < 3.2);
    if (this.confettiRate > 0 && Math.random() < this.confettiRate * dt * 10) {
      const cols = COLORS.party;
      this.parts.push({ kind: 'confetti', x: Math.random() * 320, y: -4, vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 20, g: 10, life: 6, t: 0, c: cols[Math.random() * cols.length | 0], s: 1, rot: Math.random() * 4 | 0 });
    }
  }

  draw(ctx, t) {
    for (const r of this.rings) {
      const k = r.t / r.dur, rad = r.max * (1 - Math.pow(1 - k, 3));
      ctx.globalAlpha = 1 - k; ctx.fillStyle = r.color;
      const n = Math.max(12, rad * 2.5 | 0);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ctx.fillRect(Math.round(r.x + Math.cos(a) * rad), Math.round(r.y + Math.sin(a) * rad * 0.5), 1, 1); }
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      if (p.t < 0) continue;
      const k = p.t / p.life;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.fillStyle = p.c;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.kind === 'sparkle') {
        const big = k < 0.4 && p.s > 1;
        ctx.fillRect(x, y, 1, 1);
        if (k < 0.6) { ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
        if (big) { ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y - 2, 1, 1); ctx.fillRect(x, y + 2, 1, 1); }
      } else if (p.kind === 'confetti') {
        const r = (Math.floor(p.t * 10) + p.rot) % 4;
        ctx.fillRect(x, y, r % 2 ? 1 : 2, r % 2 ? 2 : 1);
      } else if (p.kind === 'note') {
        ctx.fillRect(x, y, 2, 2); ctx.fillRect(x + 1, y - 4, 1, 4); ctx.fillRect(x + 2, y - 4, 1, 1);
      } else if (p.kind === 'dust') {
        ctx.fillStyle = '#6d6394'; ctx.fillRect(x, y, 2, 1);
      } else if (p.kind === 'heart') {
        ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y + 1, 3, 1); ctx.fillRect(x + 1, y + 2, 1, 1);
      } else ctx.fillRect(x, y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    for (const s of this.skits) if (s.kind === 'fish') this.drawFishSkit(ctx, s, t);
  }

  drawFishSkit(ctx, s, t) {
    const fish = fishIcon('full');
    const T1 = 0.7; // fish flight
    if (s.t < T1) {
      const k = s.t / T1;
      const x = s.fromX + (s.toX - s.fromX) * k, y = s.fromY + (s.toY - s.fromY) * k - Math.sin(k * Math.PI) * 30;
      ctx.drawImage(fish, Math.round(x - 8), Math.round(y - 5));
      return;
    }
    // stray cat dashes in from the edge, grabs, dashes out
    const edge = s.side < 0 ? -20 : 340;
    const tIn = 0.6, tGrab = 0.35, tOut = 0.9;
    const lt = s.t - T1;
    let cx, carrying = false, flip = s.side > 0;
    if (lt < tIn) { const k = lt / tIn; cx = edge + (s.toX - edge) * k; flip = s.side > 0; }
    else if (lt < tIn + tGrab) { cx = s.toX; carrying = lt > tIn + 0.12; }
    else if (lt < tIn + tGrab + tOut) { const k = (lt - tIn - tGrab) / tOut; cx = s.toX + (edge - s.toX) * k * k; carrying = true; flip = s.side < 0; }
    else return;
    if (!carrying) ctx.drawImage(fish, Math.round(s.toX - 8), Math.round(s.toY - 5 + (Math.floor(t * 12) % 2)));
    const hop = Math.abs(Math.sin(lt * 18)) * 3;
    const spr = smallCat(s.breed, { pose: 'sit', eyes: carrying ? 'happy' : 'wide', mouth: carrying ? 'w' : 'o', ears: 'perk' }, flip, { acc: null });
    ctx.drawImage(spr, Math.round(cx - 10), Math.round(s.toY - 18 - hop));
    if (carrying) ctx.drawImage(fish, Math.round(cx - 8 + (flip ? -6 : 6)), Math.round(s.toY - 12 - hop));
  }
}
