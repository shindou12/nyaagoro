// "Neon Alley Purr — after the full moon"
// The ending arrangement of the game BGM. Same theme and chords, arranged as
// a full song whose bars line up with the ending cinematic:
//
//  bar  0- 4  intro       music box plays the theme over rain
//  bar  4-12  verse       lo-fi beat, bass, pluck; the theme on the "cat lead"
//  bar 12-14  pre-chorus  Dm7 Em7 | Fmaj7 G — build, snare roll
//  bar 14-22  chorus      new singable melody, full drums, bells double it
//  bar 22-26  breakdown   arp runs backwards (逆モード), filtered pad, heartbeat
//  bar 26-34  final chorus  +2 key change, strings, counter melody, crowd chant
//  bar 34-38  outro       music box alone, strings fade
//  bar 38     final chord
import { mtof } from './AudioEngine.js';

export const SONG_BPM = 90;
export const SONG_BAR = 4 * 60 / SONG_BPM;
export const SONG_BARS = 38;

const _ = -1;
const VERSE = [
  { root: 45, pad: [57, 60, 64, 67], arp: [69, 72, 76, 79] }, // Am7
  { root: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] }, // Fmaj7
  { root: 48, pad: [55, 60, 64, 71], arp: [67, 72, 76, 79] }, // Cmaj7
  { root: 43, pad: [55, 59, 62, 64], arp: [67, 71, 74, 76] }, // G6
];
const CHORUS = [
  { root: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] }, // Fmaj7
  { root: 43, pad: [55, 59, 62, 67], arp: [67, 71, 74, 79] }, // G
  { root: 40, pad: [52, 55, 59, 62], arp: [64, 67, 71, 74] }, // Em7
  { root: 45, pad: [57, 60, 64, 67], arp: [69, 72, 76, 79] }, // Am7
];
const PRE = [
  { root: 38, pad: [50, 53, 57, 60], arp: [62, 65, 69, 72] }, // Dm7
  { root: 40, pad: [52, 55, 59, 62], arp: [64, 67, 71, 74] }, // Em7
  { root: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] }, // Fmaj7
  { root: 43, pad: [55, 60, 62, 67], arp: [67, 72, 74, 79] }, // Gsus4
];
const THEME = [ // the game's lead, 4 bars
  [76, _, 79, _, 81, _, _, 79, 76, _, 74, _, 72, _, _, _],
  [72, _, 74, _, 76, _, _, 77, 76, _, 72, _, 69, _, _, _],
  [67, _, 72, _, 76, _, 79, _, 81, _, 79, _, 76, _, 74, _],
  [74, _, _, 76, 74, _, 71, _, 67, _, _, _, 74, _, 76, _],
];
const THEME_B = [ // answer phrase (verse 2nd half)
  [76, _, 79, _, 81, _, 84, _, 83, _, 81, _, 79, _, _, _],
  [77, _, 76, _, 74, _, _, 72, 74, _, 76, _, 77, _, _, _],
  [79, _, 76, _, 72, _, 76, _, 79, _, 81, _, 79, _, 76, _],
  [74, _, _, _, 71, _, 72, _, 74, _, _, _, _, _, _, _],
];
const CHORUS_MEL = [
  [81, _, _, 79, 77, _, 76, _, 77, _, 79, _, 81, _, _, _],
  [83, _, _, 81, 79, _, 76, _, 74, _, 76, _, 79, _, _, _],
  [79, _, _, 76, 74, _, 71, _, 72, _, 74, _, 76, _, _, _],
  [72, _, 74, _, 76, _, _, 79, 76, _, _, _, _, _, _, _],
  [81, _, _, 79, 77, _, 76, _, 77, _, 79, _, 81, _, 84, _],
  [83, _, _, 81, 79, _, 76, _, 74, _, 76, _, 79, _, 81, _],
  [79, _, _, 76, 74, _, 71, _, 72, _, 74, _, 76, _, 77, _],
  [76, _, _, _, 72, _, _, _, 69, _, _, _, _, _, _, _],
];
const BASS = [[0, 0], [3, 12], [6, 0], [8, 0], [10, 7], [11, 12], [14, 10]];

function section(bar) {
  if (bar < 4) return 'intro';
  if (bar < 12) return 'verse';
  if (bar < 14) return 'pre';
  if (bar < 22) return 'chorus';
  if (bar < 26) return 'break';
  if (bar < 34) return 'final';
  if (bar < 38) return 'outro';
  return 'end';
}
function chordAt(bar, s) {
  const sec = section(bar);
  if (sec === 'pre') return PRE[(bar - 12) * 2 + (s >= 8 ? 1 : 0)];
  if (sec === 'chorus') return CHORUS[(bar - 14) % 4];
  if (sec === 'final') return CHORUS[(bar - 26) % 4];
  return VERSE[bar % 4];
}

export function installEndingSong(Bgm) {
  const P = Bgm.prototype;

  /** play the ending song once. cues: onEnd() after the last chord rings out */
  P.playSong = function ({ onEnd } = {}) {
    if (!this.playing) this.start();
    const c = this.a.ctx, now = c.currentTime;
    this.song = { onEnd, step: 0 };
    this.bpm = this.targetBpm = SONG_BPM;
    this.nextTime = now + 0.2;
    this.songStart = this.nextTime;
    if (!this.pump) { this.pump = c.createGain(); this.pump.connect(this.layers[0]); }
    if (!this.strings) { this.strings = c.createGain(); this.strings.gain.value = 0; this.strings.connect(this.layers[3]); }
    this.layers.forEach((g) => { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(1, now, 0.05); });
    this.leadGain.gain.setTargetAtTime(1, now, 0.05);
    this.arpGain.gain.setTargetAtTime(1, now, 0.05);
    this.a.bgmFilter.frequency.cancelScheduledValues(now);
    this.a.bgmFilter.frequency.setValueAtTime(18000, now);
    this.a.bgmBus.gain.setTargetAtTime(this.a.volume.bgm * 1.3, now, 0.1);
    this.rain.gain.setTargetAtTime(0.035, now, 0.5);
  };
  P.songTime = function () { return this.songStart ? this.a.now - this.songStart : 0; };
  P.stopSong = function () {
    if (!this.song) return;
    this.song = null;
    this.songStart = 0;
    const now = this.a.now;
    this.a.bgmBus.gain.setTargetAtTime(this.a.volume.bgm, now, 0.3);
    this.a.bgmFilter.frequency.cancelScheduledValues(now);
    this.a.bgmFilter.frequency.setTargetAtTime(18000, now, 0.1);
    if (this.strings) this.strings.gain.setTargetAtTime(0, now, 0.3);
    this.applyLevels();
  };

  P.scheduleSong = function () {
    const c = this.a.ctx;
    while (this.song && !this.song.done && this.nextTime < c.currentTime + 0.15) {
      const i = this.song.step;
      this.songStep(i, this.nextTime);
      const bar = Math.floor(i / 16);
      // gentle swing, and a ritardando in the last two outro bars
      const rit = bar >= 36 ? 1 + ((bar - 36) * 16 + (i % 16)) / 32 * 0.22 : 1;
      this.nextTime += (60 / this.bpm / 4) * (i % 2 === 0 ? 1.05 : 0.95) * rit;
      if (this.song) this.song.step = i + 1;
    }
  };

  P.songStep = function (i, t) {
    const S = this.song, bar = Math.floor(i / 16), s = i % 16, sec = section(bar);
    const beat = 60 / this.bpm, L = this.layers, a = this.a;
    const tr = sec === 'final' ? 2 : 0;
    const ch = chordAt(bar, s);
    const T = (m) => mtof(m + tr);
    if (s % 4 === 0) { this.beats.push({ t, n: i / 4, bar }); if (this.beats.length > 8) this.beats.shift(); }

    if (sec === 'end') {
      if (s === 0) {
        // last chord: Fmaj7 → C add9, music box, a soft kick
        this.songPad([53, 57, 60, 64, 67], t, beat * 2, 0.05);
        this.songPad([48, 55, 60, 62, 64, 67], t + beat * 2, 7, 0.06);
        [79, 76, 72].forEach((m, k) => this.musicbox(mtof(m), t + beat * 2 + k * 0.09, 6));
        this.musicbox(mtof(84), t + beat * 2 + 0.4, 6);
        this.softKick(t + beat * 2, 0.35, L[0]);
        this.strings.gain.setTargetAtTime(0, t + beat * 2, 1.5);
        const cb = S.onEnd; setTimeout(() => cb && cb(), Math.max(0, (t - a.now) * 1000 + 9000));
        this.song.done = true;
      }
      return;
    }

    // ---- ambience: vinyl crackle everywhere
    if (Math.random() < 0.35) this.crackle(t + Math.random() * beat / 4);

    // ---- pads (half-bar chords in the pre-chorus)
    const chorusy = sec === 'chorus' || sec === 'final';
    if (s === 0 || (sec === 'pre' && s === 8)) {
      const dur = sec === 'pre' ? beat * 2 : beat * 4;
      this.songPad(ch.pad.map((m) => m + tr), t, dur, sec === 'intro' || sec === 'outro' ? 0.035 : chorusy ? 0.05 : 0.045, sec === 'break' ? 700 : chorusy ? 2600 : 1600);
    }
    // strings swell in chorus / final / outro
    if (s === 0 && (chorusy || sec === 'outro' || sec === 'break')) {
      const lvl = sec === 'final' ? 1 : sec === 'chorus' ? 0.6 : sec === 'outro' ? Math.max(0, 0.7 - (bar - 34) * 0.18) : 0.35;
      this.strings.gain.setTargetAtTime(lvl, t, 0.8);
      this.stringChord(ch.pad.map((m) => m + tr), t, beat * 4);
    }

    // ---- melody
    let mel = -1;
    if (sec === 'intro') mel = THEME[bar % 4][s];
    if (sec === 'verse') mel = (bar < 8 ? THEME : THEME_B)[bar % 4][s];
    if (sec === 'chorus') mel = CHORUS_MEL[bar - 14][s];
    if (sec === 'final') mel = CHORUS_MEL[bar - 26][s];
    if (sec === 'outro') mel = THEME[bar % 4][s];
    if (sec === 'break' && bar < 25) mel = s % 4 === 0 ? CHORUS_MEL[(bar - 22) * 2][s] : -1;
    if (mel > 0) {
      if (sec === 'intro' || sec === 'outro' || sec === 'break') this.musicbox(mtof(mel + 12), t, beat * (sec === 'outro' ? 2.6 : 1.8));
      else this.lead(T(mel), t, beat * 0.95, this.leadGain);
      if (chorusy) this.bell(T(mel + 12), t, beat * 1.4, sec === 'final' ? 0.045 : 0.03);
      if (sec === 'final' && s % 2 === 0) this.counter(T(mel - (mel % 12 === 4 || mel % 12 === 11 ? 3 : 4)), t, beat * 0.9);
    }

    // ---- bass + arp
    if (sec === 'verse' || chorusy || sec === 'pre') {
      for (const [bs, off] of BASS) if (bs === s) this.bass(T(ch.root + off - 12), t, beat * 0.45, L[2]);
      if (s === 0 || s === 8) this.sub(T(ch.root - 12), t, beat * 1.8);
      const idx = s % 8, n = ch.arp[idx % 4] + (idx >= 4 ? 12 : 0);
      if (s % 2 === 0 || chorusy) this.pluck(T(n), t, beat * 0.45, this.arpGain, s % 2 ? 0.025 : 0.04);
    }
    if (sec === 'break') { // backwards arp — 逆モード
      const idx = 7 - (s % 8), n = ch.arp[idx % 4] + (idx >= 4 ? 12 : 0);
      if (s % 2 === 0) this.pluck(mtof(n), t, beat * 0.7, this.arpGain, 0.035);
      if (s === 0 || s === 6) this.softKick(t, 0.28, L[0]); // heartbeat
      a.bgmFilter.frequency.setTargetAtTime(bar === 25 ? 400 + s * 800 : 1400, t, 0.3);
    }
    if (sec === 'final' && bar === 26 && s === 0) a.bgmFilter.frequency.setTargetAtTime(18000, t, 0.05);
    if (sec === 'outro' && s === 0) a.bgmFilter.frequency.setTargetAtTime(Math.max(1600, 9000 - (bar - 34) * 2200), t, 1);

    // ---- drums
    if (sec === 'verse') {
      if (s === 0 || s === 7 || s === 10) this.softKick(t, s === 0 ? 0.6 : 0.4, L[0]);
      if (s === 4 || s === 12) this.snare2(t, 0.1, L[2]);
      if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.05 : 0.025, 0.03, L[1]);
      if (bar >= 8) this.hat(t, 0.012, 0.015, L[1]); // shaker
    }
    if (sec === 'pre') {
      if (s % 4 === 0) this.softKick(t, 0.6, L[0]);
      if (s % 2 === 0) this.hat(t, 0.04, 0.03, L[1]);
      if (bar === 13 && s >= 8) this.snare2(t, 0.04 + (s - 8) * 0.018, L[2]);
      if (bar === 13 && s === 0) this.riser(t, beat * 4);
    }
    if (chorusy) {
      if (s % 4 === 0) { this.softKick(t, 0.75, L[4]); this.pumpAt(t); }
      if (s === 4 || s === 12) { this.snare2(t, 0.12, L[2]); this.clap(t, L[2]); }
      this.hat(t, s % 2 ? 0.015 : 0.028, 0.02, L[4]);
      if (s % 4 === 2) this.hat(t, 0.045, 0.14, L[3]);
      if (s === 6 || s === 14) this.stab(ch.pad.map((m) => m + tr), t, L[4]);
      if ((bar === 14 || bar === 26) && s === 0) this.crash(t);
      if ((bar === 21 || bar === 33) && s >= 12) this.snare2(t, 0.05 + (s - 12) * 0.02, L[4]);
      if (sec === 'final' && (s === 4 || s === 12) && this.sfx) setTimeout(() => this.sfx.chant(1), Math.max(0, (t - a.now) * 1000));
    }
    if (sec === 'break' && bar === 25) {
      if (s === 0) this.riser(t, beat * 4);
      if (s >= 8) this.snare2(t, 0.03 + (s - 8) * 0.015, L[2]);
    }
  };

  // ---------------------------------------------------------------- song instruments
  P.songPad = function (notes, t, dur, amp = 0.045, cutoff = 1600) {
    const c = this.a.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(cutoff * 0.6, t); f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5); f.frequency.linearRampToValueAtTime(cutoff * 0.7, t + dur);
    const g = c.createGain(); this.env(g, t, amp, Math.min(0.8, dur * 0.3), dur + 0.3, dur * 0.35);
    f.connect(g).connect(this.pump || this.layers[0]);
    for (const n of notes) { this.osc('sawtooth', mtof(n), t, dur + 0.3, f, -9); this.osc('sawtooth', mtof(n), t, dur + 0.3, f, 9); this.osc('triangle', mtof(n - 12), t, dur + 0.3, f); }
  };
  P.stringChord = function (notes, t, dur) {
    const c = this.a.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
    const g = c.createGain(); this.env(g, t, 0.022, dur * 0.45, dur + 0.5, dur * 0.4);
    f.connect(g).connect(this.strings);
    const r = c.createGain(); r.gain.value = 0.6; g.connect(r).connect(this.a.reverbIn);
    for (const n of notes) for (const d of [-12, 0, 12]) {
      const o = this.osc('sawtooth', mtof(n + 12), t, dur + 0.5, f, d);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 4.8 + Math.random(); lg.gain.value = 3;
      lfo.connect(lg).connect(o.detune); lfo.start(t); lfo.stop(t + dur + 0.6);
    }
  };
  P.pumpAt = function (t) { // sidechain feel: pads duck on the kick
    if (!this.pump) return;
    const g = this.pump.gain;
    g.setValueAtTime(0.35, t); g.linearRampToValueAtTime(1, t + 60 / this.bpm * 0.85);
  };
  P.softKick = function (t, amp, node) {
    const c = this.a.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g).connect(node); o.start(t); o.stop(t + 0.36);
    const s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const cg = c.createGain(); cg.gain.setValueAtTime(amp * 0.12, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    s.connect(hp).connect(cg).connect(node); s.start(t, Math.random()); s.stop(t + 0.02);
  };
  P.snare2 = function (t, amp, node) {
    const c = this.a.ctx;
    const s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.8;
    const g = c.createGain(); g.gain.setValueAtTime(amp * 1.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(bp).connect(g).connect(node); s.start(t, Math.random()); s.stop(t + 0.18);
    const r = c.createGain(); r.gain.value = 0.3; g.connect(r).connect(this.a.reverbIn);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    og.gain.setValueAtTime(amp * 0.8, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og).connect(node); o.start(t); o.stop(t + 0.1);
  };
  P.crash = function (t) {
    const c = this.a.ctx, s = c.createBufferSource(); s.buffer = this.a.noiseBuf; s.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    const g = c.createGain(); g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    s.connect(hp).connect(g).connect(this.layers[4]); s.start(t); s.stop(t + 2.3);
    const r = c.createGain(); r.gain.value = 0.4; g.connect(r).connect(this.a.reverbIn);
  };
  P.riser = function (t, dur) {
    const c = this.a.ctx, s = c.createBufferSource(); s.buffer = this.a.noiseBuf; s.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + dur);
    s.connect(bp).connect(g).connect(this.layers[3]); s.start(t); s.stop(t + dur + 0.02);
  };
  P.sub = function (f, t, dur) {
    const c = this.a.ctx, g = c.createGain(); this.env(g, t, 0.16, 0.01, dur, 0.2);
    g.connect(this.layers[2]); this.osc('sine', f / 2, t, dur, g);
  };
  P.bell = function (f, t, dur, amp) { // glockenspiel: fundamental + inharmonic partial
    const c = this.a.ctx, g = c.createGain(); this.env(g, t, amp, 0.002, dur, dur * 0.95);
    g.connect(this.layers[3]);
    const r = c.createGain(); r.gain.value = 0.5; g.connect(r).connect(this.a.reverbIn);
    this.osc('sine', f, t, dur, g); this.osc('sine', f * 2.76, t, dur * 0.4, g); this.osc('sine', f * 5.4, t, dur * 0.15, g);
  };
  P.counter = function (f, t, dur) {
    const c = this.a.ctx, g = c.createGain(); this.env(g, t, 0.028, 0.02, dur, dur * 0.5);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 2400;
    fl.connect(g).connect(this.layers[3]); this.osc('triangle', f, t, dur, fl);
  };
  P.musicbox = function (f, t, dur) {
    const c = this.a.ctx;
    const g = c.createGain(); this.env(g, t, 0.075, 0.002, dur, dur * 0.95);
    g.connect(this.layers[3]);
    const s = c.createGain(); s.gain.value = 0.55; g.connect(s).connect(this.a.reverbIn);
    const d = c.createGain(); d.gain.value = 0.2; g.connect(d).connect(this.a.delayIn);
    this.osc('sine', f, t, dur, g, 2); this.osc('sine', f * 3, t, dur * 0.25, g); this.osc('triangle', f * 2, t, dur * 0.12, g, -4);
    // the tine's little "tick"
    const o = c.createOscillator(), og = c.createGain(); o.type = 'square'; o.frequency.value = f * 4;
    og.gain.setValueAtTime(0.008, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    o.connect(og).connect(this.layers[3]); o.start(t); o.stop(t + 0.03);
  };
  P.crackle = function (t) {
    const c = this.a.ctx, s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const g = c.createGain(); g.gain.setValueAtTime(0.02 + Math.random() * 0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006);
    s.connect(hp).connect(g).connect(this.layers[0]); s.start(t, Math.random()); s.stop(t + 0.01);
  };
}
