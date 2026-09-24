// Ending cinematic — the camera pulls back from the alley to the skyline,
// the whole city shrinks into the pupil of the neon cat's eye from the
// opening, the eye slowly closes, and the full moon rises.
// Passive view: it is handed a snapshot, the cast, and a clock (song time).
import { View, h } from '../../core/View.js';
import { bakeCity, bakeMoon } from '../../art/alleyArt.js';
import { portrait } from '../../art/catArt.js';
import { toURL } from '../../art/icons.js';
import { makeCanvas } from '../../art/pixel.js';
import { IntroZoom } from './Transitions.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const expLerp = (a, b, k) => a * Math.pow(b / a, clamp(k));

export class EndingCinematic extends View {
  constructor() {
    super('EndingCinematic', { className: 'ending is-hidden' });
    this.cv = h('canvas', { class: 'ending-cv', width: 320, height: 180 });
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.barTop = h('div', { class: 'lb lb-t' }); this.barBot = h('div', { class: 'lb lb-b' });
    this.credits = h('div', { class: 'end-credits' });
    this.skipBtn = h('button', { type: 'button', class: 'dlg-skip end-skip' }, 'スキップ ≫');
    this.skipBtn.addEventListener('click', () => this.emit('credits:skip', {}));
    this.el.append(this.cv, this.barTop, this.barBot, this.credits, this.skipBtn);
    this.city = bakeCity();
    this.moon = bakeMoon(20);
    this.iris = IntroZoom.prototype.makeIris.call(null, 40);
    this.stars = Array.from({ length: 140 }, () => ({ x: Math.random() * 320, y: Math.random() * 180, p: Math.random() * 6 }));
    this.glyphs = Array.from({ length: 80 }, (_, i) => ({ a: Math.random() * Math.PI * 2, r: 50 + Math.random() * 50, s: (Math.random() - 0.5) * 0.4, c: i % 3 }));
    this.wins = Array.from({ length: 160 }, () => ({ x: Math.random() * 320, y: 60 + Math.random() * 120, p: Math.random() * 10, c: ['#ffd23e', '#43e8ff', '#ff3ea5', '#ffcf6b'][Math.random() * 4 | 0] }));
    this.items = [];
    this.running = false;
  }

  /**
   * @param {{snapshot: HTMLCanvasElement, clock: () => number, bar: number, cast: {cat,name,line}[], staff: [string,string][], name: string}} o
   */
  play(o) {
    this.o = o;
    this.B = o.bar;
    this.alley = this.feather(o.snapshot);
    this.alleySharp = o.snapshot;
    this.buildCredits(o);
    this.running = true;
    this.fired = {};
    this.show();
    this.el.classList.remove('out');
  }
  stop() { this.running = false; this.hide(); this.credits.replaceChildren(); }

  // soft-edged copy of the alley so it melts into the skyline as it shrinks
  feather(src) {
    const cv = makeCanvas(320, 180), c = cv.getContext('2d');
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    const g = c.createRadialGradient(160, 100, 60, 160, 100, 190);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180);
    return cv;
  }

  buildCredits(o) {
    const B = this.B;
    const it = [];
    const add = (from, to, el, cls = '') => { el.classList.add('ec', ...cls.split(' ').filter(Boolean)); this.credits.append(el); it.push({ from, to, el }); };
    add(1.2 * B, 4 * B, h('div', { class: 'ec-title' }, h('div', { class: 'ec-kicker' }, 'にゃごろ！'), h('div', {}, 'さいごの満月')), 'center');
    // cast: where everyone lives now (bars 4.5 .. 12)
    const cast = o.cast;
    const span = (7.4 * B) / cast.length;
    cast.forEach((c, i) => {
      const from = 4.5 * B + i * span;
      add(from + 0.05 * B, from + span * 0.92, h('div', { class: 'ec-cast ' + (i % 2 ? 'r' : 'l') },
        h('img', { class: 'px', src: toURL(portrait(c.cat, c.expr || { eyes: 'happy', mouth: 'w' }, i % 2 === 1)), alt: '' }),
        h('div', { class: 'ec-txt' }, h('b', {}, c.name), h('span', {}, c.line))));
    });
    add(12 * B, 15.6 * B, h('div', { class: 'ec-logo' }, h('span', { class: 'l1' }, 'にゃ'), h('span', { class: 'l2' }, 'ご'), h('span', { class: 'l3' }, 'ろ'), h('span', { class: 'l4' }, '！')), 'center');
    const staffSpan = (4.2 * B) / o.staff.length;
    o.staff.forEach(([role, who], i) => {
      const from = 15.8 * B + i * staffSpan;
      add(from + 0.1 * B, from + staffSpan * 0.85, h('div', { class: 'ec-staff' }, h('div', { class: 'role' }, role), h('div', { class: 'who' }, who)), 'center');
    });
    add(24.6 * B, 27.2 * B, h('div', { class: 'ec-line' }, '満月の夜には、どこかの 空き地で'), 'low');
    add(25.6 * B, 27.2 * B, h('div', { class: 'ec-line' }, 'にゃー、と 鳴いてごらん。'), 'low2');
    add(27.6 * B, 999, h('div', { class: 'ec-fin' }, h('div', {}, 'おしまい'), h('small', {}, 'NYAGORO — THE LAST FULL MOON')), 'center');
    this.items = it;
  }

  update() {
    if (!this.running) return;
    const t = this.o.clock();
    const B = this.B;
    for (const i of this.items) i.el.classList.toggle('on', t >= i.from && t < i.to);
    this.el.classList.toggle('letterbox', t > 0.3 * B && t < 26 * B);
    this.draw(t, B);
  }

  draw(t, B) {
    const ctx = this.ctx;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, 320, 180);
    const P = { x: 160, y: 100 };           // screen focus
    const F = { x: 160, y: 146 };           // the alley's gap in the skyline image
    const Z0 = 5;
    // ---- stars (always, behind)
    for (const s of this.stars) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.p));
      ctx.globalAlpha = tw * (t > 12 * B ? 1 : 0.5);
      ctx.fillStyle = s.p > 5 ? '#9fe8ff' : '#6a5a9e';
      ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
    }
    ctx.globalAlpha = 1;

    if (t < 20 * B) {
      // ---- pull back: alley → skyline → the city shrinks into a circle
      const kPull = smooth((t - 3.5 * B) / (8.5 * B));
      let z = expLerp(Z0, 1, kPull);
      const kShrink = smooth((t - 15.5 * B) / (4.5 * B));
      z *= expLerp(1, 0.2, kShrink);
      const R = expLerp(420, 36, kShrink);
      const cx = P.x, cy = P.y;
      ctx.save();
      if (kShrink > 0) {
        // iris grows around the shrinking window
        const ir = R * 1.25;
        ctx.globalAlpha = smooth((kShrink - 0.35) / 0.4);
        ctx.drawImage(this.iris, cx - ir, cy - ir, ir * 2, ir * 2);
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#120c30'; ctx.fillRect(0, 0, 320, 180);
      }
      const dx = cx - F.x * z, dy = cy - F.y * z;
      const cityA = smooth((kPull - 0.02) / 0.3);
      ctx.globalAlpha = cityA;
      ctx.drawImage(this.city, dx, dy, 320 * z, 180 * z);
      ctx.globalAlpha = 1;
      // living city: windows twinkle, searchlights sweep in the chorus
      if (t > 8 * B) {
        for (const w of this.wins) {
          if (Math.sin(t * 1.3 + w.p) < 0.3 || z > 3) continue;
          ctx.fillStyle = w.c; ctx.globalAlpha = 0.8;
          ctx.fillRect(Math.round(dx + w.x * z), Math.round(dy + w.y * z), Math.max(1, z | 0), Math.max(1, z | 0));
        }
        ctx.globalAlpha = 1;
      }
      if (t > 12 * B && kShrink < 1 && z < 3) {
        ctx.globalCompositeOperation = 'lighter';
        for (const [bx, ph, col] of [[dx + 60 * z, 0, '67,232,255'], [dx + 260 * z, 1.7, '255,62,165'], [dx + 160 * z, 3.1, '255,210,62']]) {
          const ang = Math.sin(t * 0.5 + ph) * 0.45 - Math.PI / 2, len = 260 * Math.min(1, z + 0.2);
          const by = dy + 180 * z;
          const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len, px = -Math.sin(ang) * 16 * z, py = Math.cos(ang) * 16 * z;
          ctx.fillStyle = `rgba(${col},0.08)`;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex + px, ey + py); ctx.lineTo(ex - px, ey - py); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // the alley itself, melting into its gap in the skyline
      const a = z / Z0;
      if (a > 0.05) {
        ctx.globalAlpha = kPull < 0.05 ? 1 : smooth((a - 0.05) / 0.25);
        ctx.drawImage(kPull < 0.05 ? this.alleySharp : this.alley, P.x - 160 * a, P.y - 100 * a, 320 * a, 180 * a);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // opening's glyph rings return as the circle closes
      if (kShrink > 0.5) this.rings(ctx, cx, cy, t, smooth((kShrink - 0.5) / 0.5), 1 + (1 - kShrink) * 3);
      if (kShrink > 0.2 && kShrink < 1) this.highlight(ctx, cx, cy, R, kShrink);
      return;
    }
    if (t < 24.3 * B) {
      // ---- the eye floats in cyberspace; the pupil narrows; the lid closes
      const cx = 160, cy = 100, R = 36;
      this.rings(ctx, cx, cy, t, 1, 1);
      ctx.drawImage(this.iris, cx - 45, cy - 45, 90, 90);
      const kSlit = smooth((t - 21.3 * B) / (1.4 * B));
      const pw = Math.max(2, R * (1 - kSlit));
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy, pw, R, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#120c30'; ctx.fillRect(0, 0, 320, 180);
      ctx.drawImage(this.city, cx - F.x * 0.45, cy - F.y * 0.45, 144, 81);
      ctx.restore();
      if (kSlit < 0.6) this.highlight(ctx, cx, cy, R, 1);
      // eyelids
      const kLid = smooth((t - 22.8 * B) / (1.3 * B));
      if (kLid > 0) {
        const lidH = 50 * kLid;
        ctx.fillStyle = '#0a0618';
        ctx.beginPath(); ctx.ellipse(cx, cy - 50 + lidH, 62, 50, 0, Math.PI, 0); ctx.lineTo(cx + 62, 0); ctx.lineTo(cx - 62, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, cy + 50 - lidH, 62, 50, 0, 0, Math.PI); ctx.lineTo(cx - 62, 180); ctx.lineTo(cx + 62, 180); ctx.fill();
        ctx.fillStyle = '#ff3ea5'; ctx.globalAlpha = 0.6 * kLid;
        ctx.fillRect(cx - 40, cy - 1, 80, 1);
        ctx.globalAlpha = 1;
      }
      return;
    }
    // ---- darkness, then the full moon rises
    const kMoon = smooth((t - 24.6 * B) / (2.4 * B));
    const my = 160 - kMoon * 110;
    ctx.globalAlpha = kMoon * 0.35;
    ctx.fillStyle = '#ffcf8a';
    ctx.beginPath(); ctx.arc(160, my, 34, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = kMoon;
    ctx.drawImage(this.moon, 160 - this.moon.width / 2, my - this.moon.height / 2);
    ctx.globalAlpha = 1;
    // a tiny cat silhouette on a rooftop, looking up
    if (kMoon > 0.5) {
      ctx.globalAlpha = smooth((kMoon - 0.5) / 0.5);
      ctx.fillStyle = '#1c1540'; ctx.fillRect(0, 158, 320, 22); ctx.fillRect(120, 150, 90, 8);
      ctx.fillStyle = '#2e2466'; ctx.fillRect(0, 158, 320, 1); ctx.fillRect(120, 150, 90, 1);
      ctx.fillStyle = '#6a5ab0';
      const x = 190, y = 150; // chibi, looking up at the moon
      ctx.fillRect(x - 5, y - 9, 11, 9); ctx.fillRect(x - 4, y - 15, 9, 7); ctx.fillRect(x - 4, y - 17, 2, 2); ctx.fillRect(x + 3, y - 17, 2, 2); ctx.fillRect(x + 6, y - 4, 5, 2); ctx.fillRect(x + 10, y - 7, 2, 4);
      ctx.globalAlpha = 1;
    }
  }

  rings(ctx, cx, cy, t, alpha, spread) {
    ctx.globalAlpha = alpha * 0.8;
    for (const g of this.glyphs) {
      g.a += g.s * 0.01;
      const rr = g.r * spread;
      ctx.fillStyle = ['#43e8ff', '#ff3ea5', '#ffd23e'][g.c];
      ctx.fillRect(cx + Math.cos(g.a) * rr | 0, cy + Math.sin(g.a) * rr * 0.62 | 0, g.c === 2 ? 1 : 2, 1);
    }
    for (let k = 0; k < 3; k++) {
      const rr = (46 + k * 9) * spread, rot = t * (k % 2 ? -0.5 : 0.35) + k;
      ctx.fillStyle = k === 1 ? '#ff3ea5' : '#43e8ff';
      const n = 90 + k * 20;
      for (let i = 0; i < n; i++) { if (((i + k * 3) % 7) < 2) continue; const a = rot + i / n * Math.PI * 2; ctx.fillRect(cx + Math.cos(a) * rr | 0, cy + Math.sin(a) * rr | 0, 1, 1); }
    }
    ctx.globalAlpha = 1;
  }
  highlight(ctx, cx, cy, R, k) {
    ctx.globalAlpha = 0.85 * k;
    ctx.fillStyle = '#ffffff';
    const s = Math.max(1, R / 9);
    ctx.fillRect(cx - R * 0.5, cy - R * 0.58, s, s); ctx.fillRect(cx - R * 0.34, cy - R * 0.64, s / 2, s / 2);
    ctx.globalAlpha = 1;
  }
}
