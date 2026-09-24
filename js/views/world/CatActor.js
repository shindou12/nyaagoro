// A player cat on stage. Passive: someone tells it which mood (base state)
// to hold and which action clip to perform; it only turns that into pixels.
import { CanvasView } from '../../core/View.js';
import { bigCat, BIG } from '../../art/catArt.js';
import { makeCanvas } from '../../art/pixel.js';

const q8 = (x) => Math.round(((x % 1) + 1) % 1 * 8) / 8 % 1;

// Action clips: list of [untilMs, poseFn(localT) -> {pose, dx, dy}]
const CLIPS = {
  nya: { dur: 480, frames: [
    [70, () => ({ p: { pose: 'sit', eyes: 'closed', mouth: 'w', hy: 1, squash: 1 } })],
    [380, (t) => ({ p: { pose: 'sit', eyes: 'happy', mouth: 'nya', hy: -3, ears: 'perk', paws: 'upR', by: -1 }, dy: t < 150 ? -2 : -1 })],
    [480, () => ({ p: { pose: 'sit', eyes: 'open', mouth: 'o', hy: -1 } })],
  ] },
  goro: { dur: 540, frames: [
    [60, () => ({ p: { pose: 'sit', eyes: 'closed', squash: 2, hy: 2 } })],
    [120, () => ({ p: { pose: 'ball', eyes: 'closed', rot: 0 }, dx: 4, dy: 2 })],
    [180, () => ({ p: { pose: 'ball', eyes: 'closed', rot: 1 }, dx: 9, dy: 0 })],
    [340, (t) => ({ p: { pose: 'belly', eyes: 'happy', mouth: 'w', wiggle: Math.floor(t / 50) % 2 }, dx: 12, dy: 2 })],
    [400, () => ({ p: { pose: 'ball', eyes: 'closed', rot: 3 }, dx: 7, dy: 0 })],
    [540, (t) => ({ p: { pose: 'sit', eyes: 'happy', mouth: 'w' }, dx: Math.round(4 * (1 - (t - 400) / 140)) })],
  ] },
  goronya: { dur: 960, frames: [
    [60, () => ({ p: { pose: 'sit', eyes: 'squeeze', squash: 2, hy: 2 } })],
    [110, () => ({ p: { pose: 'ball', eyes: 'squeeze', rot: 0 }, dx: 3, dy: -2 })],
    [160, () => ({ p: { pose: 'ball', eyes: 'squeeze', rot: 1 }, dx: 6, dy: -7 })],
    [210, () => ({ p: { pose: 'ball', eyes: 'squeeze', rot: 2 }, dx: 9, dy: -9 })],
    [260, () => ({ p: { pose: 'ball', eyes: 'squeeze', rot: 3 }, dx: 11, dy: -5 })],
    [560, (t) => ({ p: { pose: 'belly', eyes: 'happy', mouth: 'nya', wiggle: Math.floor(t / 45) % 2 }, dx: 12, dy: 2 })],
    [840, (t) => ({ p: { pose: 'stand', eyes: 'star', mouth: 'nya', arms: 'up', lift: 1 }, dx: 5, dy: t < 640 ? -4 : -2 })],
    [960, () => ({ p: { pose: 'sit', eyes: 'happy', mouth: 'grin' } })],
  ] },
  hop: { dur: 260, frames: [
    [80, () => ({ p: { pose: 'sit', eyes: 'happy', mouth: 'w', squash: 1 } })],
    [200, () => ({ p: { pose: 'sit', eyes: 'happy', mouth: 'grin', ears: 'perk' }, dy: -4 })],
    [260, () => ({ p: { pose: 'sit', eyes: 'happy', mouth: 'w' } })],
  ] },
  flinch: { dur: 420, frames: [
    [420, (t) => ({ p: { pose: 'sit', eyes: 'wide', mouth: 'o', ears: 'back', paws: 'chest' }, dx: (Math.floor(t / 35) % 2) * 2 - 1 })],
  ] },
  shock: { dur: 700, frames: [
    [120, () => ({ p: { pose: 'sit', eyes: 'tiny', mouth: 'o', ears: 'perk', hy: -2 }, dy: -5 })],
    [700, (t) => ({ p: { pose: 'sit', eyes: 'tiny', mouth: 'wavy', ears: 'back', paws: 'chest' }, dx: (Math.floor(t / 40) % 2) })],
  ] },
};

export class CatActor extends CanvasView {
  constructor(name, { x, y, flip }) {
    super(name);
    this.home = { x, y };
    this.flip = flip;
    this.breed = 'tama';
    this.base = 'idle';
    this.clip = null;
    this.clipT0 = 0;
    this.baseT0 = 0;
    this.beat = { phase: 0, n: 0 };
    this.blinkAt = 2;
    this.boxWiggleT = -9;
    this.spot = 0; // spotlight intensity
    this.offset = { x: 0, y: 0 };
    this.crown = false;
    this.reverse = false;
    this.emote = null; // {kind:'sweat'|'cloud'|'sparkle'|'q', until}
    this.alpha = 1;
  }

  setBreed(b) { this.breed = b; }
  setBase(state, t) { if (this.base !== state) { this.base = state; this.baseT0 = t ?? this.baseT0; } }
  play(name, t) { if (CLIPS[name]) { this.clip = name; this.clipT0 = t; } }
  wiggleBox(t) { this.boxWiggleT = t; }
  setBeat(b) { this.beat = b; }
  setSpot(v) { this.spot = v; }
  isBusy(t) { return this.clip && (t - this.clipT0) * 1000 < CLIPS[this.clip].dur; }

  facing() { return this.flip ? -1 : 1; }

  basePose(t) {
    const lt = t - this.baseT0;
    const tail = q8(t * 0.55 + (this.flip ? 0.3 : 0));
    const look = this.facing();
    const bob = this.beat.phase < 0.18 ? 1 : 0;
    if (t > this.blinkAt) { if (t > this.blinkAt + 0.12) this.blinkAt = t + 2 + Math.random() * 3; }
    const blink = t > this.blinkAt && t < this.blinkAt + 0.12;
    switch (this.base) {
      case 'think': return { p: { pose: 'sit', eyes: blink ? 'closed' : 'focus', mouth: 'smug', look, tail, paws: 'down' }, dy: bob };
      case 'watch': return { p: { pose: 'sit', eyes: blink ? 'closed' : 'open', mouth: 'w', ears: 'perk', look, tail } };
      case 'ready': return { p: { pose: 'sit', eyes: blink ? 'closed' : 'focus', mouth: 'w', look: 0, tail }, dy: bob };
      case 'nervous': return { p: { pose: 'sit', eyes: 'wide', mouth: 'wavy', ears: 'back', paws: 'chest', look, tail: q8(t * 2) }, dx: Math.floor(t * 24) % 2 };
      case 'happy': {
        const k = Math.abs(Math.sin(lt * 7));
        return { p: { pose: 'stand', eyes: 'happy', mouth: 'grin', arms: Math.floor(lt * 7 / Math.PI) % 2 ? 'alt0' : 'alt1', tail }, dy: -Math.round(k * 4) };
      }
      case 'sad': return { p: { pose: 'loaf', eyes: 'tear', mouth: 'wavy', ears: 'flat', tail: q8(t * 0.2) }, dx: lt < 0.8 ? Math.floor(lt * 20) % 2 : 0 };
      case 'win': {
        const k = Math.abs(Math.sin(lt * 5));
        return { p: { pose: 'stand', eyes: Math.floor(lt * 2) % 2 ? 'star' : 'happy', mouth: 'nya', arms: 'up', tail }, dy: -Math.round(k * 6) };
      }
      case 'lose': return { p: { pose: 'loaf', eyes: 'tear', mouth: 'wavy', ears: 'flat', tail: 0 } };
      case 'cheer': return { p: { pose: 'sit', eyes: 'happy', mouth: 'grin', paws: Math.floor(t * 4) % 2 ? 'upBoth' : 'wave', tail }, dy: bob };
      case 'dizzy': return { p: { pose: 'sit', eyes: 'dizzy', mouth: 'wavy', ears: 'side', tail }, dx: Math.round(Math.sin(t * 6)) };
      case 'sleep': return { p: { pose: 'loaf', eyes: 'closed', mouth: 'w', ears: 'side', tail: q8(t * 0.15) } };
      case 'groove': return { p: { pose: 'sit', eyes: blink ? 'closed' : 'happy', mouth: 'w', hx: this.beat.n % 2 ? 1 : -1, tail }, dy: bob };
      case 'idle':
      default: return { p: { pose: 'sit', eyes: blink ? 'closed' : 'open', mouth: 'w', look, tail }, dy: bob };
    }
  }

  pose(t) {
    if (this.clip) {
      const ms = (t - this.clipT0) * 1000;
      const c = CLIPS[this.clip];
      if (ms < c.dur) {
        const fr = c.frames.find(([until]) => ms < until) || c.frames[c.frames.length - 1];
        const r = fr[1](ms);
        return { ...r, dx: (r.dx || 0) * this.facing() };
      }
      this.clip = null;
    }
    return this.basePose(t);
  }

  draw(ctx, t) {
    const { x, y } = this.home;
    const px = x + this.offset.x, py = y + this.offset.y;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    // spotlight cone
    if (this.spot > 0.01) {
      const g = ctx.createLinearGradient(0, py - 110, 0, py + 4);
      const col = this.reverse ? '255,62,165' : '255,240,200';
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.18 * this.spot})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(px - 6, py - 110); ctx.lineTo(px + 6, py - 110); ctx.lineTo(px + 26, py + 2); ctx.lineTo(px - 26, py + 2); ctx.fill();
      ctx.fillStyle = `rgba(${col},${0.22 * this.spot})`;
      ctx.beginPath(); ctx.ellipse(px, py + 1, 24, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    // shadow
    ctx.fillStyle = 'rgba(5,3,15,0.55)';
    ctx.beginPath(); ctx.ellipse(px, py + 1, 15, 3, 0, 0, Math.PI * 2); ctx.fill();

    if (this.base === 'box' && !this.clip) this.drawBox(ctx, t, px, py);
    else {
      const { p, dx = 0, dy = 0 } = this.pose(t);
      const spr = bigCat(this.breed, p, this.flip, { crown: this.crown });
      ctx.drawImage(spr, Math.round(px - BIG / 2 + dx), Math.round(py - BIG + 2 + dy));
    }
    this.drawEmote(ctx, t, px, py);
    ctx.restore();
  }

  drawBox(ctx, t, px, py) {
    const w = t - this.boxWiggleT;
    const shake = w < 0.25 ? Math.round(Math.sin(w * 60) * 2) : 0;
    const hop = w < 0.25 ? -Math.round(Math.sin(w / 0.25 * Math.PI) * 3) : 0;
    const box = getBox(this.breed, this.flip, Math.floor(t * 1.2) % 5 === 0);
    ctx.drawImage(box, Math.round(px - box.width / 2 + shake), Math.round(py - box.height + 2 + hop));
  }

  drawEmote(ctx, t, px, py) {
    const e = this.emote;
    if (!e || t > e.until) return;
    const top = py - 44;
    if (e.kind === 'sweat') {
      const k = ((t * 1.5) % 1);
      ctx.fillStyle = '#8fe4ff';
      const sx = px + 12 * this.facing(), sy = top + 8 + k * 6;
      ctx.fillRect(sx, sy, 2, 3); ctx.fillRect(sx + 0.5, sy - 1, 1, 1);
    } else if (e.kind === 'cloud') {
      const cx = px + Math.sin(t * 2) * 2, cy = top - 2;
      ctx.fillStyle = '#4a4470';
      ctx.fillRect(cx - 10, cy, 20, 5); ctx.fillRect(cx - 7, cy - 3, 9, 3); ctx.fillRect(cx, cy - 4, 7, 4);
      ctx.fillStyle = '#8fe4ff';
      for (let i = 0; i < 4; i++) { const k = ((t * 2 + i * 0.27) % 1); ctx.fillRect(cx - 8 + i * 5, cy + 6 + k * 16, 1, 2); }
    } else if (e.kind === 'q') {
      ctx.fillStyle = '#ffd23e';
      const b = Math.floor(t * 4) % 2;
      const qx = px + 14 * this.facing(), qy = top - 2 - b;
      [[1, 0], [2, 0], [0, 1], [3, 1], [2, 2], [1, 3], [1, 5]].forEach(([a, c]) => ctx.fillRect(qx + a, qy + c, 1, 1));
    } else if (e.kind === 'dots') {
      ctx.fillStyle = '#fff';
      const n = Math.floor(t * 3) % 4;
      for (let i = 0; i < n; i++) ctx.fillRect(px + 12 * this.facing() + i * 3, top + 2, 2, 2);
    }
  }
}

// Cardboard box with ears poking out: shown to the *other* player while a
// composer secretly builds their sequence.
const boxCache = new Map();
function getBox(breed, flip, blink) {
  const key = breed + flip + blink;
  if (boxCache.has(key)) return boxCache.get(key);
  const cat = bigCat(breed, { pose: 'sit', eyes: blink ? 'closed' : 'open', mouth: 'w', look: flip ? -1 : 1 }, flip);
  const cv = makeCanvas(40, 40), ctx = cv.getContext('2d');
  // cat peeking: draw only the top of the head behind the box
  ctx.drawImage(cat, 2, 0, 40, 20, 0, -1, 40, 20);
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  R('#1a0f2e', 3, 19, 34, 21);
  R('#b5824f', 4, 20, 32, 19);
  R('#c99560', 4, 20, 32, 3);
  R('#8e5f37', 4, 36, 32, 3);
  R('#d7a86f', 1, 18, 9, 3); R('#d7a86f', 30, 18, 9, 3); // flaps
  R('#1a0f2e', 0, 17, 10, 1); R('#1a0f2e', 30, 17, 10, 1);
  R('#8e5f37', 19, 23, 2, 13); // tape
  // "?" stamp
  R('#ff3ea5', 11, 26, 4, 1); R('#ff3ea5', 14, 27, 1, 2); R('#ff3ea5', 12, 29, 2, 1); R('#ff3ea5', 12, 31, 1, 1);
  R('#ff3ea5', 26, 26, 4, 1); R('#ff3ea5', 29, 27, 1, 2); R('#ff3ea5', 27, 29, 2, 1); R('#ff3ea5', 27, 31, 1, 1);
  boxCache.set(key, cv);
  return cv;
}
