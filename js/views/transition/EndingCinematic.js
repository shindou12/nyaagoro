// Ending cinematic "さいごの満月", timed bar-by-bar to the ending song.
//
//  0- 4  the alley after the master left, title
//  4-22  where everyone lives now — one vignette per cat (iris wipes between)
// 22-24  the vacant lot where the alley used to be
// 24-30  multi-plane pull-back: the lot shrinks into a detailed skyline, logo
// 30-32  the skyline shrinks into the pupil of a cute cat eye; the eye blinks
// 32-35  pull back from the eye: it's Chibi, on the lot, with a tiny apprentice
// 35-38  a faint "にゃー" from far away; Chibi answers; the kitten copies. おしまい
//
// Passive view: it reads a clock (song time) and emits cue events for sounds.
import { View, h } from '../../core/View.js';
import { makeCanvas } from '../../art/pixel.js';
import { bakeMoon } from '../../art/alleyArt.js';
import { BREEDS, bigCat, smallCat, BIG } from '../../art/catArt.js';
import { cuteEyeCloseup } from '../../art/eyeArt.js';
import { makeScenes, bakeSkyline, SW, SH } from './endingScenes.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const W = 640, H = 360;

const VIGNETTES = [
  ['mike', 4, 'ミケ', '神社裏の 小さな喫茶で 看板娘。新しい看板は、毎朝 だれかが 見上げる。'],
  ['tama', 6, 'タマ', '空き地に 木箱の屋台。ふたつめの皿は、新しい ノラの ぶん。'],
  ['neo', 8, 'ネオ', '駅前の屋上で DJ。最後の一曲は いつも、路地のリズム。'],
  ['piko', 10, 'ピコ', 'においの 保存方法を 研究中。とりあえず、花を 一輪 そばに。'],
  ['yuki', 12, 'ユキ', '遠くの街の 窓辺。満月の夜だけ、少し 長く 外を見る。'],
  ['hachi', 14, 'ハチ', '今日も だれかの 次の場所を 探す。地図に もう 空欄は ない。'],
  ['luna', 16, 'ルナ', '新しい街で 看板を 灯した。二代目 NYAGORO CUP、開催中。'],
  ['yoru', 18, 'ヨル', '瓦礫が ビルに 変わっても、夜の主は 屋上に いる。'],
  ['hai', 20, 'ハイじい', '川べりで 昔話。いちばん人気は、下手くそな にゃーの話。'],
  ['lot', 22, '', 'そして、あの路地が あった場所。'],
];

export class EndingCinematic extends View {
  constructor() {
    super('EndingCinematic', { className: 'ending is-hidden' });
    this.cv = h('canvas', { class: 'ending-cv', width: W, height: H });
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.barTop = h('div', { class: 'lb lb-t' }); this.barBot = h('div', { class: 'lb lb-b' });
    this.credits = h('div', { class: 'end-credits' });
    this.skipBtn = h('button', { type: 'button', class: 'dlg-skip end-skip' }, 'スキップ ≫');
    this.skipBtn.addEventListener('click', () => this.emit('credits:skip', {}));
    this.el.append(this.cv, this.barTop, this.barBot, this.credits, this.skipBtn);
    this.buf = makeCanvas(SW, SH); this.bctx = this.buf.getContext('2d');
    this.buf2 = makeCanvas(SW, SH); this.bctx2 = this.buf2.getContext('2d');
    this.frame = makeCanvas(W, H); this.fctx = this.frame.getContext('2d');
    [this.bctx, this.bctx2, this.fctx].forEach((c) => { c.imageSmoothingEnabled = false; });
    this.moon = bakeMoon(20);
    this.running = false;
  }

  /** @param {{alley: HTMLCanvasElement, meCat: string, name: string, clock: () => number, bar: number, staff: [string,string][]}} o */
  play(o) {
    this.o = o; this.B = o.bar;
    if (!this.scenes) {
      this.skyA = bakeSkyline(7, 1400, 420, { hmin: 90, hmax: 380, body: '#1a1240', rimL: '#5a2a78', rimR: '#2a5a88', winP: 0.18, gapX: 600, gapW: 200 });
      this.skyB = bakeSkyline(19, 1700, 380, { hmin: 70, hmax: 300, body: '#120c30', rimL: '#3a1f58', rimR: '#1f3a60', winP: 0.1, landmark: true });
      this.stars = Array.from({ length: 160 }, () => ({ x: Math.random() * W, y: Math.random() * 230, p: Math.random() * 6 }));
      this.rain = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 260 + Math.random() * 120 }));
    }
    this.scenes = makeScenes({ alley: o.alley });
    this.buildCredits();
    this.fired = {};
    this.running = true;
    this.show();
  }
  stop() { this.running = false; this.hide(); this.credits.replaceChildren(); }

  buildCredits() {
    const B = this.B, o = this.o;
    this.credits.replaceChildren();
    const it = [];
    const add = (from, to, el, cls) => { el.classList.add('ec', ...cls.split(' ')); this.credits.append(el); it.push({ from: from * B, to: to * B, el }); };
    add(0.8, 3.5, h('div', { class: 'ec-title' }, h('div', { class: 'ec-kicker' }, 'にゃごろ！'), h('div', {}, 'さいごの満月')), 'center');
    for (const [, bar, name, line] of VIGNETTES) {
      add(bar + 0.3, bar + 1.85, h('div', { class: 'ec-cap' }, name ? h('b', {}, name) : null, h('span', {}, line)), 'cap');
    }
    add(28.2, 30.3, h('div', { class: 'ec-logo' }, h('span', { class: 'l1' }, 'にゃ'), h('span', { class: 'l2' }, 'ご'), h('span', { class: 'l3' }, 'ろ'), h('span', { class: 'l4' }, '！')), 'center');
    const staff = o.staff, span = 5.6 / staff.length;
    staff.forEach(([role, who], i) => add(24.3 + i * span, 24.3 + (i + 0.9) * span, h('div', { class: 'ec-staff' }, h('div', { class: 'role' }, role), h('div', { class: 'who' }, who)), 'staff'));
    add(37.3, 999, h('div', { class: 'ec-fin' }, h('div', {}, 'おしまい'), h('small', {}, 'NYAGORO — THE LAST FULL MOON')), 'fin');
    this.items = it;
    this.fade = h('div', { class: 'ec-black' });
    this.credits.append(this.fade);
  }

  cue(id, at, t) { if (t >= at * this.B && !this.fired[id]) { this.fired[id] = true; this.emit('credits:cue', { id }); } }

  update() {
    if (!this.running) return;
    const t = this.o.clock(), B = this.B, bar = t / B;
    for (const i of this.items) i.el.classList.toggle('on', t >= i.from && t < i.to);
    this.el.classList.toggle('letterbox', bar > 0.4 && bar < 37);
    this.fade.style.opacity = String(clamp((bar - 39.2) / 1.2) + clamp(1 - bar / 0.4));
    this.cue('far', 35.1, t); this.cue('chibi', 36.1, t); this.cue('kitten', 36.8, t);
    const ctx = this.ctx;
    ctx.globalAlpha = 1;
    if (bar < 4) this.drawAlley(ctx, t, bar);
    else if (bar < 24) this.drawVignettes(ctx, t, bar);
    else if (bar < 30.5) { this.drawPullback(ctx, t, bar, smooth((bar - 24) / 5.6)); }
    else if (bar < 32.3) this.drawEye(ctx, t, bar);
    else this.drawFinal(ctx, t, bar);
  }

  // ---------------------------------------------------------------- 0-4: the alley
  drawAlley(ctx, t, bar) {
    ctx.drawImage(this.o.alley, 0, 0, W, H);
    ctx.fillStyle = 'rgba(150,200,255,0.35)';
    for (const d of this.rain) { d.y += d.v / 60; d.x -= d.v / 360; if (d.y > H) { d.y = -8; d.x = Math.random() * (W + 60); } ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 6); }
    ctx.fillStyle = `rgba(5,3,15,${0.25 + 0.2 * smooth(bar / 4)})`; ctx.fillRect(0, 0, W, H);
    if (bar > 3.7) this.irisWipe(ctx, (bar - 3.7) / 0.3, () => this.drawVignette(ctx, 'mike', 0, 0));
  }

  // ---------------------------------------------------------------- 4-24: vignettes
  drawVignettes(ctx, t, bar) {
    let i = VIGNETTES.length - 1;
    while (i > 0 && bar < VIGNETTES[i][1]) i--;
    const [id, from] = VIGNETTES[i];
    const lt = t - from * this.B;
    const dur = 2 * this.B;
    this.drawVignette(ctx, id, lt, lt / dur);
    const next = VIGNETTES[i + 1];
    if (next && bar > next[1] - 0.3) this.irisWipe(ctx, (bar - (next[1] - 0.3)) / 0.3, () => this.drawVignette(ctx, next[0], 0, 0));
  }
  drawVignette(ctx, id, lt, k, target = this.bctx) {
    if (id === 'lot') { this.drawPullback(ctx, this.o.clock(), 22, 0); return; }
    const sc = this.scenes[id], c = target;
    c.clearRect(0, 0, SW, SH);
    c.drawImage(sc.bg, 0, 0);
    sc.draw(c, Math.max(0, lt));
    const pan = Math.round(clamp(k) * (SW - 320));
    ctx.drawImage(target.canvas, -pan * 2, 0, SW * 2, SH * 2);
  }
  irisWipe(ctx, k, drawNext) {
    k = smooth(k);
    if (k <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, k * 400, 0, Math.PI * 2); ctx.clip();
    drawNext();
    ctx.restore();
    ctx.strokeStyle = '#fff6c9'; ctx.lineWidth = 2; ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, k * 400, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- 24-30: pull back to the skyline
  drawPullback(ctx, t, bar, u, target = ctx) {
    const c = target;
    // sky
    const bands = ['#05031a', '#080524', '#0c072c', '#110a36', '#170d40', '#1f1048', '#281452', '#34185c'];
    bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 45, W, 46); });
    for (const s of this.stars) { c.globalAlpha = (0.3 + 0.7 * Math.abs(Math.sin(t * 0.7 + s.p))) * u; c.fillStyle = s.p > 5 ? '#ffffff' : '#9d8fe0'; c.fillRect(s.x | 0, s.y | 0, 1, 1); }
    c.globalAlpha = 1;
    // moon rises into view as the camera pulls back
    const my = -90 + u * 170;
    c.globalAlpha = 0.25; c.fillStyle = '#ffcf8a'; c.beginPath(); c.arc(470, my, 70, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    c.drawImage(this.moon, 470 - this.moon.width, my - this.moon.height, this.moon.width * 2, this.moon.height * 2);
    const layer = (img, z, ay) => {
      const w = img.width * z, hgt = img.height * z;
      c.drawImage(img, Math.round(W / 2 - w / 2), Math.round(ay - hgt), Math.round(w), Math.round(hgt));
      return { x0: W / 2 - w / 2, y0: ay - hgt, z };
    };
    const haze = (y, a) => { const g = c.createLinearGradient(0, y - 60, 0, y); g.addColorStop(0, 'rgba(255,62,165,0)'); g.addColorStop(1, `rgba(255,62,165,${a})`); c.fillStyle = g; c.fillRect(0, y - 60, W, 60); };
    const zB = 1.3 * Math.pow(0.46, u), zA = 1.8 * Math.pow(0.36, u), zN = 2 * Math.pow(0.16, u);
    const b = layer(this.skyB, zB, H + (1 - u) * 60);
    this.blinkLights(c, this.skyB, b, t);
    haze(H - 20, 0.18);
    const a = layer(this.skyA, zA, H + (1 - u) * 30);
    this.blinkLights(c, this.skyA, a, t);
    if (u > 0.6) this.searchlights(c, t, (u - 0.6) / 0.4);
    haze(H, 0.22);
    // near: the vacant lot (transparent sky) shrinking into its place in the city
    const n = this.scenes.lot;
    this.bctx2.clearRect(0, 0, SW, SH); this.bctx2.drawImage(n.bg, 0, 0); n.draw(this.bctx2, t);
    const ny = H - u * 22, nw = SW * zN, nh = SH * zN;
    c.drawImage(this.buf2, Math.round(W / 2 - nw / 2), Math.round(ny - nh), Math.round(nw), Math.round(nh));
    if (u > 0.5) { c.globalAlpha = (u - 0.5) * 1.6; c.fillStyle = '#ffcf8a'; c.fillRect(W / 2 - 2, ny - nh * 0.3, 4, 2); c.globalAlpha = 1; }
  }
  blinkLights(c, img, L, t) {
    for (const [x, y] of img.lights) {
      if (Math.floor(t * 1.2 + x) % 2) continue;
      c.fillStyle = '#ff3e6c';
      c.fillRect(Math.round(L.x0 + x * L.z), Math.round(L.y0 + y * L.z), Math.max(1, Math.round(2 * L.z)), Math.max(1, Math.round(2 * L.z)));
    }
  }
  searchlights(c, t, a) {
    c.globalCompositeOperation = 'lighter';
    for (const [bx, ph, col] of [[140, 0, '67,232,255'], [500, 1.9, '255,62,165'], [330, 3.3, '255,210,62']]) {
      const ang = Math.sin(t * 0.45 + ph) * 0.5 - Math.PI / 2, len = 420;
      const ex = bx + Math.cos(ang) * len, ey = H + Math.sin(ang) * len, px = -Math.sin(ang) * 22, py = Math.cos(ang) * 22;
      c.fillStyle = `rgba(${col},${0.07 * a})`;
      c.beginPath(); c.moveTo(bx, H); c.lineTo(ex + px, ey + py); c.lineTo(ex - px, ey - py); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- 30.5-32.3: into a cute eye
  drawEye(ctx, t, bar) {
    const br = BREEDS[this.o.meCat] || BREEDS.tama;
    const ke = smooth((bar - 30.5) / 1.1);
    // the city keeps living inside the pupil
    this.drawPullback(this.fctx, t, bar, 1, this.fctx);
    ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, W, H);
    const pupilR = 80, hole = pupilR + (1 - ke) * 320;        // screen px
    const s = 1 - ke * 0.55;
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, hole, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(this.frame, W / 2 - W * s / 2, H / 2 - H * s / 2, W * s, H * s);
    // the window slowly becomes a glossy black pupil with the city reflected in it
    ctx.fillStyle = `rgba(12,6,26,${ke * 0.72})`; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // blink near the end
    const kb = (bar - 31.75) / 0.55;
    const open = kb > 0 ? 1 - Math.sin(clamp(kb) * Math.PI / 2) : 1;
    const eye = cuteEyeCloseup({ w: 160, h: 90, fur: br.fur, furDark: br.dark, iris: br.eyes[1], hole: hole / 4, open });
    ctx.globalAlpha = smooth(ke * 1.6);
    ctx.drawImage(eye, 0, 0, W, H);
    ctx.globalAlpha = 1;
    if (ke > 0.6 && open > 0.55) this.sparkles(ctx, (ke - 0.6) / 0.4);
  }
  sparkles(ctx, a) {
    ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
    const px = (x, y, r) => { for (let yy = -r; yy <= r; yy += 4) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)) / 4) * 4; ctx.fillRect(W / 2 + x - w, H / 2 + y + yy, w * 2, 4); } };
    px(-36, -36, 26); px(34, 30, 10);
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- 32.3-: it's Chibi — the last scene
  drawFinal(ctx, t, bar) {
    const c = this.bctx, B = this.B;
    const me = this.o.meCat;
    c.clearRect(0, 0, SW, SH);
    c.drawImage(this.scenes.final.bg, 0, 0);
    // twinkling stars & a faint glow over the old sign
    for (let i = 0; i < 20; i++) { if (Math.sin(t * 2 + i * 7) > 0.6) { c.fillStyle = '#ffffff'; c.fillRect((i * 97) % SW, (i * 53) % 90, 1, 1); } }
    // the far "にゃー"
    const farK = (bar - 35.1) / 1.4;
    if (farK > 0 && farK < 1) { c.globalAlpha = Math.sin(farK * Math.PI); c.fillStyle = '#fff6c9'; c.fillRect(266, 30 - farK * 8, 2, 2); c.fillRect(271, 26 - farK * 8, 1, 1); c.fillRect(262, 24 - farK * 8, 1, 1); c.globalAlpha = 1; }
    const heard = bar > 35.5, called = bar > 36.1 && bar < 36.9, kitCall = bar > 36.8 && bar < 37.6;
    const pose = called
      ? { pose: 'sit', eyes: 'happy', mouth: 'nya', ears: 'perk', hy: -2 }
      : { pose: 'sit', eyes: ((t % 3.3) < 0.13) ? 'closed' : 'open', mouth: 'w', ears: heard ? 'perk' : 'up', look: heard ? 1 : 0, lookY: heard ? -1 : 0, tail: Math.round(((t * 0.4) % 1) * 8) / 8 % 1 };
    c.drawImage(bigCat(me, pose, false), 142 - BIG / 2, 114 - BIG + 2);
    const kitPose = kitCall ? { pose: 'sit', eyes: 'happy', mouth: 'nya', ears: 'perk' } : { pose: 'sit', eyes: bar > 36.2 ? 'wide' : 'open', mouth: 'w', look: -1, ears: bar > 36.2 ? 'perk' : 'up' };
    c.drawImage(smallCat('cream', kitPose, true), 172 - 10, 152 - 21 - (kitCall ? 2 : 0));
    if (called) this.speech(c, 'にゃー！', 150, 60);
    if (kitCall) this.speech(c, 'にゃ', 180, 118, true);
    if (bar > 35.3 && bar < 36.6) this.speech(c, '……にゃー', 238, 24, true, 0.75);
    // camera: pull back from Chibi's eye (big) to the whole scene
    const kz = smooth((bar - 32.3) / 2.4);
    const z = 2 * Math.pow(6, 1 - kz);
    const fx = 150 + (SW / 2 - 8 - 150) * kz, fy = 90 + (SH / 2 - 90) * kz;
    ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.buf, Math.round(W / 2 - fx * z), Math.round(H / 2 - fy * z), Math.round(SW * z), Math.round(SH * z));
    // finish the blink we started in the eye shot
    const ko = clamp((bar - 32.3) / 0.35);
    if (ko < 1) {
      const br = BREEDS[me] || BREEDS.tama, lid = (1 - ko) * H / 2;
      ctx.fillStyle = br.fur; ctx.fillRect(0, 0, W, lid); ctx.fillRect(0, H - lid, W, lid);
      ctx.fillStyle = '#1a0f2e'; ctx.fillRect(0, lid - 4, W, 4); ctx.fillRect(0, H - lid, W, 4);
    }
    void B;
  }
  speech(c, text, x, y, small = false, alpha = 1) {
    c.globalAlpha = alpha;
    c.font = small ? '8px DotGothic16, monospace' : '10px DotGothic16, monospace';
    const w = Math.ceil(c.measureText(text).width) + 6, hh = small ? 11 : 13;
    c.fillStyle = '#1a0f2e'; c.fillRect(Math.round(x - w / 2) - 1, y - 1, w + 2, hh + 2);
    c.fillStyle = small ? '#ffe0f2' : '#fffdf6'; c.fillRect(Math.round(x - w / 2), y, w, hh);
    c.fillRect(Math.round(x) - 1, y + hh, 3, 2);
    c.fillStyle = '#1a0f2e'; c.textBaseline = 'top'; c.fillText(text, Math.round(x - w / 2) + 3, y + 1);
    c.globalAlpha = 1;
  }
}
