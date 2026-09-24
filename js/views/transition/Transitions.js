// Transition layer views.
import { View, h } from '../../core/View.js';
import { bakeCity } from '../../art/alleyArt.js';
import { portrait } from '../../art/catArt.js';
import { toURL } from '../../art/icons.js';
import { makeCanvas } from '../../art/pixel.js';

const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const easeIn = (k) => Math.pow(Math.min(1, Math.max(0, k)), 2.4);

// ------------------------------------------------------------------ IntroZoom
// A neon cat's eye floating in cyberspace. On start its slit pupil opens,
// revealing the city inside; we dive through it down into the alley.
export class IntroZoom extends View {
  constructor() {
    super('IntroZoom', { className: 'intro' });
    this.cv = h('canvas', { class: 'intro-cv', width: 320, height: 180 });
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.press = h('div', { class: 'intro-press' }, h('div', { class: 'ip-main' }, 'PRESS ANY KEY'), h('div', { class: 'ip-sub' }, 'タップ / クリックで 路地裏へ'));
    this.el.append(this.cv, this.press);
    this.city = bakeCity();
    this.state = 'off';
    this.glyphs = Array.from({ length: 90 }, (_, i) => ({ a: Math.random() * Math.PI * 2, r: 48 + Math.random() * 60, s: (Math.random() - 0.5) * 0.6, c: i % 3 }));
    this.stars = Array.from({ length: 120 }, () => ({ x: Math.random() * 320 - 160, y: Math.random() * 180 - 90, z: Math.random() }));
    this.iris = this.makeIris(40);
    this.fired = {};
  }
  makeIris(r) {
    const s = r * 2 + 2, cv = makeCanvas(s, s), c = cv.getContext('2d');
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const d = Math.hypot(x + 0.5 - s / 2, y + 0.5 - s / 2) / r;
      if (d > 1) continue;
      const a = Math.atan2(y - s / 2, x - s / 2);
      const streak = (Math.sin(a * 23) + Math.sin(a * 7 + 1)) * 0.5;
      let col = d > 0.92 ? '#1a0f2e' : d > 0.8 ? '#2f8f5a' : streak > 0.4 ? '#c6ff6a' : streak > -0.2 ? '#8ff05a' : '#5ed05a';
      if (d < 0.8 && d > 0.6 && ((x + y) % 3 === 0)) col = '#f4ff9a';
      c.fillStyle = col; c.fillRect(x, y, 1, 1);
    }
    return cv;
  }
  idle(t) { this.state = 'await'; this.t0 = t; this.show(); this.press.classList.remove('is-hidden'); this.el.style.opacity = 1; this.fired = {}; }
  dive(t) { if (this.state !== 'await') return; this.state = 'dive'; this.t0 = t; this.press.classList.add('is-hidden'); }
  skip() { this.state = 'off'; this.hide(); }
  update(t) {
    if (this.state === 'off') return;
    const lt = t - this.t0;
    const ctx = this.ctx;
    ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, 320, 180);
    const cx = 160, cy = 90;
    const dive = this.state === 'dive';
    const zoomK = dive ? easeIn((lt - 0.55) / 1.25) : 0; // circle growth
    const R = 34 + zoomK * 420;
    // starfield warp
    for (const s of this.stars) {
      const sp = dive ? 1 + lt * 6 : 1;
      s.z -= 0.0025 * sp; if (s.z <= 0.02) { s.z = 1; s.x = Math.random() * 320 - 160; s.y = Math.random() * 180 - 90; }
      const x = cx + s.x / s.z * 0.3, y = cy + s.y / s.z * 0.3;
      ctx.fillStyle = s.z < 0.3 ? '#9fe8ff' : '#3b2f7a';
      ctx.fillRect(x | 0, y | 0, 1, dive && lt > 0.5 ? Math.min(6, 1 + lt * 2) | 0 : 1);
    }
    // grid floor (cyberspace)
    ctx.fillStyle = '#1f1450';
    for (let i = 0; i < 12; i++) { const yy = 120 + Math.pow(i / 12, 2) * 60 + ((lt * 12) % 5); ctx.fillRect(0, yy | 0, 320, 1); }
    for (let i = -10; i <= 10; i++) { for (let y = 120; y < 180; y += 2) ctx.fillRect(cx + i * (y - 110) * 0.9 | 0, y, 1, 1); }
    // orbiting glyph ring
    const ringA = Math.max(0, 1 - zoomK * 3);
    if (ringA > 0) {
      for (const g of this.glyphs) {
        g.a += g.s * 0.02 * (dive ? 3 : 1);
        const rr = g.r * (1 + zoomK * 4);
        const x = cx + Math.cos(g.a) * rr, y = cy + Math.sin(g.a) * rr * 0.62;
        ctx.globalAlpha = ringA * 0.8;
        ctx.fillStyle = ['#43e8ff', '#ff3ea5', '#ffd23e'][g.c];
        ctx.fillRect(x | 0, y | 0, g.c === 2 ? 1 : 2, 1);
      }
      // dashed rings
      for (let k = 0; k < 3; k++) {
        const rr = (44 + k * 9) * (1 + zoomK * 5), rot = lt * (k % 2 ? -0.6 : 0.4) + k;
        ctx.fillStyle = k === 1 ? '#ff3ea5' : '#43e8ff';
        const n = 90 + k * 20;
        for (let i = 0; i < n; i++) {
          if (((i + k * 3) % 7) < 2) continue;
          const a = rot + i / n * Math.PI * 2;
          ctx.fillRect(cx + Math.cos(a) * rr | 0, cy + Math.sin(a) * rr | 0, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
    // the eye / portal
    const open = dive ? ease(lt / 0.55) : 0.06 + Math.max(0, Math.sin(lt * 1.3)) * 0.04;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    if (zoomK < 0.2) ctx.drawImage(this.iris, cx - this.iris.width / 2, cy - this.iris.height / 2);
    // pupil = window into the city
    ctx.beginPath();
    const pw = Math.max(2, open * R), ph = R;
    ctx.ellipse(cx, cy, pw, ph, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#120c30'; ctx.fillRect(0, 0, 320, 180);
    const cityZoom = 0.6 + zoomK * 1.6 + (dive ? easeIn((lt - 1.5) / 0.9) * 5 : 0);
    const fx = 160, fy = 132; // alley gap in the city image
    ctx.drawImage(this.city, cx - fx * cityZoom, cy - fy * cityZoom + (1 - zoomK) * 20, 320 * cityZoom, 180 * cityZoom);
    ctx.restore();
    // eye shine
    if (zoomK < 0.1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 18, cy - 20, 4, 4); ctx.fillRect(cx - 12, cy - 22, 2, 2); }
    // flash into the alley
    if (dive && lt > 2.1) {
      const k = Math.min(1, (lt - 2.1) / 0.25);
      ctx.globalAlpha = k; ctx.fillStyle = '#ff9ad5'; ctx.fillRect(0, 0, 320, 180); ctx.globalAlpha = 1;
    }
    if (dive && lt > 2.35 && !this.fired.reveal) { this.fired.reveal = true; this.emit('intro:reveal', {}); }
    if (dive && lt > 2.35) this.el.style.opacity = String(Math.max(0, 1 - (lt - 2.35) / 0.35));
    if (dive && lt > 2.7 && !this.fired.done) { this.fired.done = true; this.state = 'off'; this.hide(); this.emit('intro:done', {}); }
  }
}

// ------------------------------------------------------------------ VS / match start
export class MatchStartTransition extends View {
  constructor() {
    super('MatchStartTransition', { className: 'vs-screen is-hidden' });
    this.l = h('div', { class: 'vs-side vs-l' }); this.r = h('div', { class: 'vs-side vs-r' });
    this.mid = h('div', { class: 'vs-mid' }, 'VS');
    this.foot = h('div', { class: 'vs-foot' });
    this.el.append(this.l, this.r, this.mid, this.foot);
  }
  play({ left, right, firstText }) {
    const side = (el, p, flip) => el.replaceChildren(
      h('img', { class: 'px vs-face', src: toURL(portrait(p.breed, { eyes: 'focus', mouth: 'smug', look: flip ? -1 : 1 }, flip)), alt: '' }),
      h('div', { class: 'vs-name' }, p.name), h('div', { class: 'vs-tag' }, p.tag || ''));
    side(this.l, left, false); side(this.r, right, true);
    this.foot.innerHTML = firstText;
    this.show(); this.el.classList.remove('in', 'out'); void this.el.offsetWidth; this.el.classList.add('in');
    clearTimeout(this.t1); clearTimeout(this.t2);
    this.t1 = setTimeout(() => this.el.classList.add('out'), 2700);
    this.t2 = setTimeout(() => this.hide(), 3300);
  }
  cancel() { clearTimeout(this.t1); clearTimeout(this.t2); this.hide(); }
}

// ------------------------------------------------------------------ result
export class ResultTransition extends View {
  constructor() { super('ResultTransition', { className: 'res-trans is-hidden' }); }
  play(text, sub, won) {
    this.el.innerHTML = `<div class="rt-main">${text}</div><div class="rt-sub">${sub}</div>`;
    this.el.classList.toggle('won', !!won);
    this.show(); this.el.classList.remove('in'); void this.el.offsetWidth; this.el.classList.add('in');
    clearTimeout(this.tm); this.tm = setTimeout(() => this.hide(), 2300);
  }
  cancel() { clearTimeout(this.tm); this.hide(); }
}
