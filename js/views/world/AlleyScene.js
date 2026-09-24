// Alley scene sub-views (all canvas-drawn, all passive).
// They read "scene params" that the presenter sets: hype, beat, reverse, mood.
import { CanvasView } from '../../core/View.js';
import { bakeSky, bakeAlley, bakeMoon, bakeCables, makeSigns, cableY, WINDOWS, PUDDLES, W, H } from '../../art/alleyArt.js';
import { smallCat, backHead, AUDIENCE_ACCS } from '../../art/catArt.js';
import { makeCanvas } from '../../art/pixel.js';

/** Shared, presenter-controlled scene parameters. */
export class SceneParams {
  constructor() {
    this.hype = 0;          // 0..4 (can be fractional during transitions)
    this.hypeShown = 0;     // eased
    this.beat = { phase: 0, n: 0, bar: 0 };
    this.reverse = false;
    this.reverseK = 0;      // eased 0..1
    this.mood = 'idle';     // crowd mood
    this.moodUntil = 0;
    this.focus = 0;         // -1 left cat, +1 right, 0 none (audience looks)
    this.flash = 0;
    this.dim = 0;           // 0..1 lights going out (story ending)
  }
}

// ------------------------------------------------------------------ background
export class AlleyBackground extends CanvasView {
  constructor(S) {
    super('AlleyBackground');
    this.S = S;
    this.sky = bakeSky(); this.moon = bakeMoon(20); this.alley = bakeAlley();
    this.winCats = new Map();
  }
  draw(ctx, t) {
    const S = this.S;
    ctx.drawImage(this.sky, 0, 0);
    // moon breathes with the beat
    const mb = 1 - S.beat.phase;
    ctx.globalAlpha = 0.25 + 0.15 * mb * (S.hypeShown / 4);
    ctx.fillStyle = S.reverseK > 0.5 ? '#ff3ea5' : '#ffcf8a';
    ctx.beginPath(); ctx.arc(194 + 24, 4 + 24, 28 + mb * 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(this.moon, 194, 4);
    ctx.drawImage(this.alley, 0, 0);
    // windows light up with hype; some have cats peeking
    for (const w of WINDOWS) {
      if (S.hypeShown + 0.001 < w.tier) continue;
      if (S.dim > 0 && ((w.x * 13 + w.y * 7) % 100) / 100 < S.dim * 1.2) continue;
      const fl = Math.sin(t * 3 + w.x) > 0.97 ? 0.6 : 1;
      ctx.globalAlpha = 0.85 * fl;
      ctx.fillStyle = w.col; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.fillRect(w.x, w.y, w.w, 1); ctx.fillRect(w.x, w.y, 1, w.h);
      ctx.globalAlpha = 1;
      // window frame cross
      ctx.fillStyle = '#0c0920'; ctx.fillRect(w.x + (w.w >> 1), w.y, 1, w.h);
      if (w.cat) {
        const bob = Math.floor(t * 1.3 + w.x) % 6 === 0 ? 1 : 0;
        const look = S.focus || 0;
        const spr = smallCat(w.cat, { pose: 'peek', eyes: S.mood === 'cheer' ? 'happy' : S.mood === 'ooh' ? 'wide' : 'open', mouth: S.mood === 'cheer' ? 'o' : 'w', look }, false, { dim: 0.85 });
        ctx.save(); ctx.beginPath(); ctx.rect(w.x, w.y, w.w, w.h); ctx.clip();
        ctx.drawImage(spr, w.x - 5, w.y + 3 + bob);
        ctx.restore();
      }
    }
  }
}

// ------------------------------------------------------------------ neon
export class NeonSigns extends CanvasView {
  constructor(S) { super('NeonSigns'); this.S = S; this.signs = makeSigns(); this.state = this.signs.map(() => ({ on: true, t: 0 })); }
  isLit(s, i, t) {
    const S = this.S;
    if (S.hypeShown + 0.001 < s.tier) return 0;
    let v = 1;
    const fl = s.flicker + (S.hypeShown < 1 ? 0.02 : 0);
    const st = this.state[i];
    if (t > st.t) { st.on = Math.random() > fl * 8; st.t = t + (st.on ? 0.3 + Math.random() * 1.5 : 0.05 + Math.random() * 0.1); }
    if (!st.on) v = 0.15;
    if (s.pulse) v *= 0.75 + 0.25 * (1 - S.beat.phase);
    return v;
  }
  draw(ctx, t) {
    const S = this.S;
    const power = (0.55 + S.hypeShown * 0.12) * (1 - S.dim * 0.97);
    this.signs.forEach((s, i) => {
      const lit = this.isLit(s, i, t);
      const useAlt = S.reverseK > 0.5 && s.sprAlt;
      const spr = useAlt ? s.sprAlt : s.spr, glow = useAlt ? s.glowAlt : s.glow;
      if (s.backing) { ctx.fillStyle = '#0c0820'; ctx.fillRect(s.x - 1, s.y - 1, spr.width + 2, spr.height + 2); }
      if (lit <= 0 || S.dim > 0.98) { ctx.globalAlpha = 0.25 * (1 - S.dim * 0.6); ctx.drawImage(spr, s.x, s.y); ctx.globalAlpha = 1; return; }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, lit * power);
      ctx.drawImage(glow, s.x - glow.pad, s.y - glow.pad);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (0.35 + lit * 0.65) * (1 - S.dim * 0.8);
      ctx.drawImage(spr, s.x, s.y);
      ctx.globalAlpha = 1;
      s._lit = lit; s._spr = spr;
    });
    // puddle reflections of lit signs + moon
    for (const p of PUDDLES) {
      for (const s of this.signs) {
        if (!s._lit || s._lit < 0.3) continue;
        const x0 = Math.max(s.x, p.x - p.w / 2), x1 = Math.min(s.x + s._spr.width, p.x + p.w / 2);
        if (x1 <= x0) continue;
        ctx.globalAlpha = 0.28 * s._lit;
        ctx.fillStyle = S.reverseK > 0.5 && s.alt ? s.alt : s.color;
        for (let x = Math.floor(x0); x < x1; x += 2) {
          const len = 1 + ((x * 7 + Math.floor(t * 6)) % 3);
          ctx.fillRect(x, p.y + 1 + ((x + Math.floor(t * 4)) % 2), 1, Math.min(p.h - 1, len));
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ audience
const SLOTS = [
  // tier 0 — the regulars
  { x: 97, y: 96, b: 'mike', tier: 0 }, { x: 212, y: 94, b: 'blue', tier: 0 }, { x: 116, y: 116, b: 'kiji', tier: 0 },
  // tier 1
  { x: 187, y: 114, b: 'punk', tier: 1 }, { x: 168, y: 128, b: 'cream', tier: 1 }, { x: 44, y: 58, b: 'gray', tier: 1 },
  // tier 2
  { x: 38, y: 144, b: 'sabi', tier: 2 }, { x: 284, y: 144, b: 'choco', tier: 2 }, { x: 28, y: 92, b: 'tama', tier: 2 }, { x: 100, y: 64, b: 'neo', tier: 2 }, { x: 222, y: 64, b: 'luna', tier: 2 },
  // tier 3
  { x: 16, y: 158, b: 'yuki', tier: 3 }, { x: 306, y: 158, b: 'hachi', tier: 3 }, { x: 136, y: 128, b: 'boss', tier: 3 }, { x: 196, y: 128, b: 'piko', tier: 3 }, { x: 288, y: 20, b: 'yoru', tier: 3 }, { x: 22, y: 14, b: 'kiji', tier: 3 },
  // tier 4 — everyone's here
  { x: 118, y: 128, b: 'cream', tier: 4 }, { x: 152, y: 127, b: 'blue', tier: 4 }, { x: 160, y: 64, b: 'punk', tier: 4 }, { x: 261, y: 70, b: 'gray', tier: 4 },
  { x: 60, y: 92, b: 'mike', tier: 4 }, { x: 300, y: 104, b: 'sabi', tier: 4 }, { x: 58, y: 58, b: 'choco', tier: 4 },
];
const STICK_COLORS = ['#43e8ff', '#ff3ea5', '#ffd23e', '#7dff6a', '#b18cff'];

export class AudienceCats extends CanvasView {
  constructor(S) {
    super('AudienceCats');
    this.S = S;
    this.cats = SLOTS.map((s, i) => ({
      ...s, acc: AUDIENCE_ACCS[(i * 5 + 3) % AUDIENCE_ACCS.length], flip: s.x > 160, phase: Math.random(),
      stick: STICK_COLORS[i % STICK_COLORS.length], shown: false, t0: 0, fan: i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0, jumpy: 0.5 + Math.random() * 0.5,
    }));
    this.cats.sort((a, b) => a.y - b.y);
  }
  back() { return this.cats.filter((c) => c.y < 146); }
  front() { return this.cats.filter((c) => c.y >= 146); }
  poseFor(c, t) {
    const S = this.S;
    const mood = t < S.moodUntil ? S.mood : (S.hypeShown >= 3 ? 'party' : S.mood === 'tense' ? 'tense' : 'idle');
    const beatOn = S.beat.phase < 0.2;
    const look = S.focus ? Math.sign(S.focus - (c.x - 160) / 160) : 0;
    const flipLook = c.flip ? -look : look;
    const lt = t + c.phase * 3;
    switch (mood) {
      case 'cheer': {
        const up = Math.floor(lt * 6) % 2;
        return { p: { pose: up ? 'jump' : 'cheer', eyes: 'happy', mouth: 'o', arms: up }, dy: up ? -Math.round(2 + c.jumpy * 3) : 0 };
      }
      case 'ooh': return { p: { pose: 'sit', eyes: 'wide', mouth: 'o', ears: 'perk', look: flipLook }, dy: lt % 1 < 0.1 ? -1 : 0 };
      case 'sad': return { p: { pose: 'sad', eyes: 'closed', ears: 'flat' } };
      case 'tense': return { p: { pose: 'sit', eyes: 'wide', mouth: 'w', look: flipLook } };
      case 'party': {
        if ((c.phase * 10 | 0) % 2 === 0) return { p: { pose: 'stick', eyes: 'happy', mouth: 'o', arms: S.beat.n % 2 }, dy: beatOn ? -1 : 0, stick: true };
        return { p: { pose: beatOn ? 'cheer' : 'sit', eyes: 'happy', mouth: beatOn ? 'o' : 'w', arms: S.beat.n % 2, tail: beatOn ? 1 : 0 }, dy: beatOn ? -2 : 0 };
      }
      default: {
        const blink = (lt % 4) < 0.12;
        const nod = S.hypeShown >= 1 && beatOn ? 1 : 0;
        const sleepy = S.hypeShown < 1 && (c.phase > 0.8);
        if (sleepy) return { p: { pose: 'sleep', eyes: 'closed' } };
        return { p: { pose: 'sit', eyes: blink ? 'closed' : 'open', mouth: 'w', look: flipLook, tail: (lt % 2) < 1 ? 0 : 1 }, dy: nod };
      }
    }
  }
  drawCat(ctx, c, t) {
    const S = this.S;
    const visible = S.hypeShown + 0.001 >= c.tier;
    if (visible && !c.shown) { c.shown = true; c.t0 = t; }
    if (!visible && c.shown) c.shown = false;
    if (!c.shown) return;
    const k = Math.min(1, (t - c.t0) / 0.45);
    const drop = k < 1 ? -Math.round(50 * (1 - k) * (1 - k)) + (k > 0.8 ? -Math.round(Math.sin((k - 0.8) / 0.2 * Math.PI) * 3) : 0) : 0;
    const { p, dy = 0, stick } = this.poseFor(c, t);
    const spr = smallCat(c.b, p, c.flip, { acc: c.acc, stickColor: stick ? c.stick : undefined, dim: c.y < 80 ? 0.8 : 1 });
    ctx.fillStyle = 'rgba(5,3,15,0.45)';
    ctx.fillRect(c.x - 6, c.y - 1, 12, 2);
    ctx.drawImage(spr, Math.round(c.x - 10), Math.round(c.y - 21 + dy + drop));
    if (stick) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = c.stick;
      const sx = c.flip ? (p.arms === 0 ? c.x + 6 : c.x - 8) : (p.arms === 0 ? c.x - 8 : c.x + 6);
      ctx.fillRect(Math.round(sx) - 1, Math.round(c.y - 21 + dy), 3, 7);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  drawRange(ctx, t, pred) { for (const c of this.cats) if (pred(c)) this.drawCat(ctx, c, t); }
  draw(ctx, t) { this.drawRange(ctx, t, (c) => c.y < 146); }
}

/** Audience cats standing in front of the player cats' line. */
export class AudienceFront extends CanvasView {
  constructor(aud) { super('AudienceFront'); this.aud = aud; }
  draw(ctx, t) { this.aud.drawRange(ctx, t, (c) => c.y >= 146); }
}

// eyes glowing in the dark — the crowd before it shows up
export class EyesInDark extends CanvasView {
  constructor(S) {
    super('EyesInDark'); this.S = S;
    this.eyes = [[130, 121, '#ffe14a'], [236, 124, '#7dff6a'], [66, 124, '#43e8ff'], [174, 108, '#ffe14a'], [12, 132, '#ff8fd0'], [300, 128, '#ffe14a'], [112, 90, '#7dff6a']].map(([x, y, c], i) => ({ x, y, c, ph: i * 1.7 }));
  }
  draw(ctx, t) {
    const a = Math.max(0, 1 - this.S.hypeShown * 0.45);
    if (a <= 0) return;
    for (const e of this.eyes) {
      const blink = ((t + e.ph) % 3.5) < 0.15;
      if (blink) continue;
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 2 + e.ph));
      ctx.fillStyle = e.c;
      ctx.fillRect(e.x, e.y, 1, 1); ctx.fillRect(e.x + 4, e.y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ props & lights
export class StageProps extends CanvasView {
  constructor(S) {
    super('StageProps'); this.S = S;
    this.cables = bakeCables();
    this.fish = makeHoloFish();
    this.drone = { x: 160, y: 44 };
  }
  draw(ctx, t) {
    const S = this.S, hy = S.hypeShown;
    // searchlights (tier 2+)
    if (hy >= 2) {
      ctx.globalCompositeOperation = 'lighter';
      const a = Math.min(1, hy - 1.5) * 0.09;
      for (const [bx, ph, col] of [[40, 0, '67,232,255'], [280, 1.7, '255,62,165']]) {
        const ang = Math.sin(t * 0.7 + ph) * 0.5 - Math.PI / 2;
        const len = 220;
        const ex = bx + Math.cos(ang) * len, ey = 180 + Math.sin(ang) * len;
        const px = -Math.sin(ang) * 18, py = Math.cos(ang) * 18;
        ctx.fillStyle = `rgba(${S.reverseK > 0.5 ? col.split(',').reverse().join(',') : col},${a})`;
        ctx.beginPath(); ctx.moveTo(bx, 180); ctx.lineTo(ex + px, ey + py); ctx.lineTo(ex - px, ey - py); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // holo fish swimming across the sky (tier 3+)
    if (hy >= 3) {
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.05 + i * 0.37) % 1);
        const x = 60 + k * 220, y = 14 + i * 12 + Math.sin(t * 2 + i) * 3;
        ctx.globalAlpha = 0.55 * Math.min(1, hy - 2.5) * (0.7 + 0.3 * Math.sin(t * 13 + i));
        ctx.drawImage(this.fish[S.reverseK > 0.5 ? 1 : 0], Math.round(x), Math.round(y));
      }
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(this.cables, 0, 0);
    // string lights along the cables (tier 1+)
    if (hy >= 1) {
      const cols = ['#ff3ea5', '#ffd23e', '#43e8ff', '#7dff6a'];
      for (const ci of [0, 1]) for (let x = 6; x < 320; x += 11) {
        const y = Math.round(cableY(ci, x)) + 1;
        const idx = (x / 11 | 0) + ci;
        const on = hy >= 3 ? ((S.beat.n + idx) % 2 === 0 ? 1 : 0.4) : 0.8;
        const col = cols[idx % cols.length];
        ctx.fillStyle = col; ctx.globalAlpha = on; ctx.fillRect(x, y, 2, 2);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = on * 0.25; ctx.fillRect(x - 1, y - 1, 4, 4); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }
    // red paper lanterns (tier 2+)
    if (hy >= 2) {
      for (const x of [96, 150, 204, 258]) {
        const y = Math.round(cableY(1, x)) + 2 + Math.round(Math.sin(t * 1.5 + x) * 0.6);
        ctx.fillStyle = '#1a0f2e'; ctx.fillRect(x - 3, y, 7, 10);
        ctx.fillStyle = '#ff4f5e'; ctx.fillRect(x - 2, y + 1, 5, 8);
        ctx.fillStyle = '#ffb36b'; ctx.fillRect(x - 1, y + 2, 1, 6);
        ctx.fillStyle = '#2a1030'; ctx.fillRect(x - 2, y + 4, 5, 1);
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,90,80,0.18)'; ctx.fillRect(x - 5, y - 2, 11, 14); ctx.globalCompositeOperation = 'source-over';
      }
    }
    // drone cam-cat (tier 2+): the stream is live!
    if (hy >= 2) {
      const d = this.drone;
      d.x = 160 + Math.sin(t * 0.6) * 60; d.y = 50 + Math.sin(t * 1.3) * 4;
      const x = Math.round(d.x), y = Math.round(d.y);
      ctx.fillStyle = '#1a0f2e'; ctx.fillRect(x - 7, y - 1, 15, 7);
      ctx.fillStyle = '#5b52a0'; ctx.fillRect(x - 6, y, 13, 5);
      ctx.fillStyle = '#43e8ff'; ctx.fillRect(x - 4, y + 1, 9, 3);
      ctx.fillStyle = '#1a0f2e'; ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1); // ^ ^ face on screen
      const blade = Math.floor(t * 30) % 2;
      ctx.fillStyle = '#b8b3e6'; ctx.fillRect(x - 9 + blade, y - 3, 5, 1); ctx.fillRect(x + 5 - blade, y - 3, 5, 1);
      ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ff3e6c' : '#551020'; ctx.fillRect(x + 5, y + 1, 1, 1); // REC
    }
    // lasers (tier 4)
    if (hy >= 3.5) {
      ctx.globalCompositeOperation = 'lighter';
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.6 + Math.sin(t * 1.2) * 0.3;
        const on = (S.beat.n + i) % 2 === 0;
        if (!on) continue;
        ctx.strokeStyle = i % 2 ? 'rgba(67,232,255,0.22)' : 'rgba(255,62,165,0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(160, 62); ctx.lineTo(160 + Math.sin(a) * 260, 62 + Math.cos(a) * 260); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

function makeHoloFish() {
  const mk = (col) => {
    const cv = makeCanvas(14, 7), c = cv.getContext('2d');
    c.fillStyle = col;
    const rows = ['...####....#.', '.##....##.##.', '#.#.......#..', '#.........##.', '.##....##..#.', '...####......'];
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') c.fillRect(x, y, 1, 1); });
    return cv;
  };
  return [mk('#43e8ff'), mk('#ff3ea5')];
}

// ------------------------------------------------------------------ weather
export class Weather extends CanvasView {
  constructor(S) {
    super('Weather'); this.S = S;
    this.drops = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 110 + Math.random() * 60 }));
    this.splash = [];
    this.last = 0;
  }
  draw(ctx, t) {
    const dt = Math.min(0.05, t - (this.last || t)); this.last = t;
    const intensity = Math.max(0.25, 1 - this.S.hypeShown * 0.18);
    ctx.fillStyle = this.S.reverseK > 0.5 ? 'rgba(255,120,200,0.35)' : 'rgba(150,200,255,0.3)';
    for (let i = 0; i < this.drops.length * intensity; i++) {
      const d = this.drops[i];
      d.y += d.v * dt; d.x -= d.v * dt * 0.18;
      if (d.y > 132 + (i % 48)) { if (Math.random() < 0.5) this.splash.push({ x: d.x, y: d.y, t }); d.y = -4; d.x = Math.random() * (W + 30); }
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);
    }
    ctx.fillStyle = 'rgba(180,220,255,0.4)';
    this.splash = this.splash.filter((s) => t - s.t < 0.15);
    for (const s of this.splash) { ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 1, 1); ctx.fillRect(Math.round(s.x) + 1, Math.round(s.y), 1, 1); }
  }
}

// front-row silhouettes (backs of heads) that multiply and bounce with hype
export class FrontRow extends CanvasView {
  constructor(S) {
    super('FrontRow'); this.S = S;
    const xs = [150, 190, 110, 230, 70, 270, 30, 310, 130, 210, 50, 290, 170];
    this.heads = xs.map((x, i) => ({ x, w: 22 + (i * 7) % 8, seed: i, ph: Math.random() }));
  }
  draw(ctx, t) {
    const S = this.S;
    const n = Math.round(3 + S.hypeShown * 2.5);
    for (let i = 0; i < Math.min(n, this.heads.length); i++) {
      const h = this.heads[i];
      const spr = backHead(h.w, h.seed);
      let dy = 0;
      if (S.hypeShown >= 2 && S.beat.phase < 0.25 && (S.beat.n + i) % 2 === 0) dy = -2;
      if (t < S.moodUntil && S.mood === 'cheer') dy = -Math.round(Math.abs(Math.sin(t * 9 + h.ph * 6)) * 5);
      ctx.drawImage(spr, Math.round(h.x - spr.width / 2), Math.round(H - spr.height + 7 + dy));
    }
  }
}
