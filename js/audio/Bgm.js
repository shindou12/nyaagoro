// Layered BGM "Neon Alley Purr".
// Five stacked layers that fade in with crowd hype:
//   L0 pad + soft kick + rain hiss   (cool, minimal)
//   L1 hats + reverse-able pluck arp
//   L2 bass + clap
//   L3 lead melody + open hats
//   L4 four-on-the-floor, 16th hats, stabs, crowd "にゃ!" chant
// The arp flips direction in 逆モード; tension mode closes the filter.
import { mtof } from './AudioEngine.js';

const CHORDS = [
  { root: 45, pad: [57, 60, 64, 67], arp: [69, 72, 76, 79] }, // Am7
  { root: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] }, // Fmaj7
  { root: 48, pad: [55, 60, 64, 71], arp: [67, 72, 76, 79] }, // Cmaj7
  { root: 43, pad: [55, 59, 62, 64], arp: [67, 71, 74, 76] }, // G6
];
const _ = -1;
const LEAD = [
  [76, _, 79, _, 81, _, _, 79, 76, _, 74, _, 72, _, _, _],
  [72, _, 74, _, 76, _, _, 77, 76, _, 72, _, 69, _, _, _],
  [67, _, 72, _, 76, _, 79, _, 81, _, 79, _, 76, _, 74, _],
  [74, _, _, 76, 74, _, 71, _, 67, _, _, _, 74, _, 76, _],
];
const BASS = [[0, 0], [3, 12], [6, 0], [8, 0], [10, 7], [11, 12], [14, 10]];

export class Bgm {
  constructor(engine, sfx) {
    this.a = engine;
    this.sfx = sfx;
    this.playing = false;
    this.bpm = 98;
    this.targetBpm = 98;
    this.hype = 0;
    this.mode = 'calm';
    this.reverse = false;
    this.step = 0;
    this.beats = []; // scheduled beat times for visuals
  }

  start() {
    const a = this.a;
    if (!a.ctx || this.playing) return;
    const c = a.ctx;
    this.layers = [0, 1, 2, 3, 4].map(() => { const g = c.createGain(); g.gain.value = 0; g.connect(a.duck); return g; });
    this.leadGain = c.createGain(); this.leadGain.gain.value = 1; this.leadGain.connect(this.layers[3]);
    this.arpGain = c.createGain(); this.arpGain.gain.value = 1; this.arpGain.connect(this.layers[1]);
    // rain / vinyl bed
    const src = c.createBufferSource(); src.buffer = a.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 0.6;
    this.rain = c.createGain(); this.rain.gain.value = 0.018;
    src.connect(f).connect(this.rain).connect(this.layers[0]); src.start();
    this.playing = true;
    this.nextTime = c.currentTime + 0.1;
    this.step = 0;
    this.applyLevels(true);
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() { clearInterval(this.timer); this.playing = false; if (this.layers) this.layers.forEach((g) => g.gain.setTargetAtTime(0, this.a.now, 0.3)); }

  setHype(h) { this.hype = h; this.targetBpm = [98, 106, 114, 122, 130][h]; this.applyLevels(); }
  setMode(m) { this.mode = m; this.applyLevels(); }
  setReverse(r) { this.reverse = r; }

  levelsFor() {
    const h = this.hype;
    const on = [1, h >= 1 ? 1 : 0.0, h >= 2 ? 1 : 0, h >= 3 ? 1 : 0, h >= 4 ? 1 : 0];
    const base = [0.9, 0.75, 0.85, 0.7, 0.85];
    let lv = on.map((o, i) => o * base[i]);
    if (this.mode === 'title') lv = [0.9, 0.7, 0.5, 0, 0];
    if (this.mode === 'lobby') lv = [0.9, 0.7, 0.7, 0.45, 0];
    if (this.mode === 'result') lv = [0.9, 0.8, 0.9, 0.8, 0.9];
    if (this.mode === 'story') lv = [0.85, 0.55, 0, 0.35, 0];
    if (this.mode === 'ending') lv = [0.75, 0, 0, 0.3, 0];
    return lv;
  }
  applyLevels(now) {
    if (!this.layers) return;
    const t = this.a.now, lv = this.levelsFor();
    this.layers.forEach((g, i) => g.gain.setTargetAtTime(lv[i], t, now ? 0.01 : 0.9));
    const tense = this.mode === 'replay';
    const show = this.mode === 'showcase';
    this.a.bgmFilter.frequency.setTargetAtTime(tense ? 1100 : show ? 2600 : 18000, t, 0.25);
    this.leadGain.gain.setTargetAtTime(tense ? 0.15 : show ? 0.35 : 1, t, 0.3);
    this.arpGain.gain.setTargetAtTime(tense ? 0.55 : 1, t, 0.3);
    this.a.bgmBus.gain.setTargetAtTime(this.a.volume.bgm * (show ? 0.7 : 1), t, 0.2);
  }

  // beat info for visuals: phase 0..1 within current beat, and count
  beatInfo() {
    const now = this.a.now;
    let last = null, next = null;
    for (const b of this.beats) { if (b.t <= now) last = b; else if (!next) next = b; }
    if (!last) return { phase: 0, n: 0, bar: 0, on: this.playing };
    const len = next ? next.t - last.t : 60 / this.bpm;
    return { phase: Math.min(1, (now - last.t) / len), n: last.n, bar: last.bar, on: this.playing };
  }

  schedule() {
    const c = this.a.ctx;
    while (this.nextTime < c.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      const spb = 60 / this.bpm / 4;
      // light swing on off-16ths
      this.nextTime += spb * (this.step % 2 === 0 ? 1.06 : 0.94);
      this.step += 1;
      if (this.step % 16 === 0 && this.bpm !== this.targetBpm) this.bpm = this.targetBpm;
    }
  }

  playStep(stepAbs, t) {
    const s = stepAbs % 16, bar = Math.floor(stepAbs / 16), ch = CHORDS[bar % 4];
    const a = this.a, L = this.layers, beat = 60 / this.bpm;
    const tone = (f, dur, o) => a.tone(f, dur, { ...o, when: t, bus: 'bgm' });
    const out = (layer) => ({ node: L[layer] });
    void out;
    if (s % 4 === 0) {
      this.beats.push({ t, n: stepAbs / 4, bar });
      if (this.beats.length > 8) this.beats.shift();
    }
    // --- L0 : pad on bar start, soft kick 1 & 3
    if (s === 0) this.pad(ch.pad, t, beat * 4, L[0]);
    if (s === 0 || s === 8) this.kick(t, 0.5, L[0]);
    // --- L1 : hats + arp pluck
    if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.07 : 0.035, 0.03, L[1]);
    {
      const idx = s % 8;
      const order = this.reverse ? 7 - idx : idx;
      const n = ch.arp[order % 4] + (order >= 4 ? 12 : 0);
      if (s % 2 === 0 || this.hype >= 3) this.pluck(mtof(n), t, beat * 0.45, this.arpGain, s % 2 ? 0.035 : 0.05);
    }
    // --- L2 : bass + clap
    for (const [bs, off] of BASS) if (bs === s) this.bass(mtof(ch.root + off - 12), t, beat * 0.45, L[2]);
    if (s === 4 || s === 12) this.clap(t, L[2]);
    if (s === 10) this.kick(t, 0.35, L[2]);
    // --- L3 : lead + open hat
    const ln = LEAD[bar % 4][s];
    if (ln > 0) this.lead(mtof(ln + (this.reverse ? -12 : 0)), t, beat * 0.9, this.leadGain);
    if (s % 4 === 2) this.hat(t, 0.05, 0.14, L[3]);
    // --- L4 : 4 on floor, 16th hats, stabs, chant, fills
    if (s % 4 === 0) this.kick(t, 0.7, L[4]);
    this.hat(t, 0.025, 0.02, L[4]);
    if (s === 6 || s === 14) this.stab(ch.pad, t, L[4]);
    if (bar % 4 === 3 && s >= 12) this.snare(t, 0.06 + (s - 12) * 0.02, L[4]);
    if (this.hype >= 4 && (s === 4 || s === 12) && this.mode !== 'replay' && this.sfx) {
      const delay = (t - a.now) * 1000;
      setTimeout(() => this.sfx.chant(1), Math.max(0, delay));
    }
    void tone;
  }

  // ---------------------------------------------------------------- instruments (routed to a layer node)
  voice(node, t, dur, make) {
    const c = this.a.ctx;
    const g = c.createGain();
    make(g);
    g.connect(node);
    return g;
  }
  osc(type, f, t, dur, gainNode, detune = 0) {
    const c = this.a.ctx, o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    o.connect(gainNode); o.start(t); o.stop(t + dur + 0.1);
    return o;
  }
  env(g, t, peak, a, dur, r) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  pad(notes, t, dur, node) {
    const c = this.a.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700 + this.hype * 350, t); f.Q.value = 2;
    f.frequency.linearRampToValueAtTime(1400 + this.hype * 500, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(700 + this.hype * 350, t + dur);
    const g = c.createGain(); this.env(g, t, 0.05, dur * 0.25, dur, dur * 0.3);
    f.connect(g).connect(node);
    for (const n of notes) { this.osc('sawtooth', mtof(n), t, dur, f, -8); this.osc('triangle', mtof(n), t, dur, f, 6); }
  }
  kick(t, amp, node) {
    const c = this.a.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.14);
    g.gain.setValueAtTime(amp * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(node); o.start(t); o.stop(t + 0.3);
  }
  hat(t, amp, dur, node) {
    const c = this.a.ctx, s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(node); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  clap(t, node) {
    const c = this.a.ctx;
    for (let i = 0; i < 3; i++) {
      const s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.2;
      const g = c.createGain(); const tt = t + i * 0.011;
      g.gain.setValueAtTime(0.16, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + (i === 2 ? 0.16 : 0.02));
      s.connect(f).connect(g).connect(node); s.start(tt, Math.random()); s.stop(tt + 0.2);
    }
  }
  snare(t, amp, node) {
    const c = this.a.ctx, s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200;
    const g = c.createGain(); g.gain.setValueAtTime(amp * 1.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    s.connect(f).connect(g).connect(node); s.start(t, Math.random()); s.stop(t + 0.12);
  }
  bass(f, t, dur, node) {
    const c = this.a.ctx;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(220, t + dur); fl.Q.value = 6;
    const g = c.createGain(); this.env(g, t, 0.22, 0.005, dur, 0.05);
    fl.connect(g).connect(node);
    this.osc('square', f, t, dur, fl); this.osc('sine', f / 2, t, dur, fl);
  }
  pluck(f, t, dur, node, amp) {
    const c = this.a.ctx;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(4000, t); fl.frequency.exponentialRampToValueAtTime(600, t + dur);
    const g = c.createGain(); this.env(g, t, amp, 0.003, dur, dur * 0.8);
    fl.connect(g).connect(node);
    const d = c.createGain(); d.gain.value = 0.35; g.connect(d).connect(this.a.delayIn);
    this.osc('square', f, t, dur, fl);
  }
  lead(f, t, dur, node) {
    const c = this.a.ctx;
    const g = c.createGain(); this.env(g, t, 0.07, 0.01, dur, dur * 0.4);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 3200;
    fl.connect(g).connect(node);
    const s = c.createGain(); s.gain.value = 0.25; g.connect(s).connect(this.a.reverbIn);
    const o1 = this.osc('square', f, t, dur, fl), o2 = this.osc('triangle', f * 2, t, dur, fl, 4);
    // cat-like scoop into the note
    o1.frequency.setValueAtTime(f * 0.94, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * 0.012;
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); lfo.start(t + 0.15); lfo.stop(t + dur + 0.1);
  }
  stab(notes, t, node) {
    const c = this.a.ctx;
    const g = c.createGain(); this.env(g, t, 0.05, 0.004, 0.18, 0.12);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(5000, t); fl.frequency.exponentialRampToValueAtTime(800, t + 0.18);
    fl.connect(g).connect(node);
    for (const n of notes) this.osc('sawtooth', mtof(n + 12), t, 0.18, fl, 10);
  }
}
