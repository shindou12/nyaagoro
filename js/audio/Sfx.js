// Sound effects, designed by feel:
//  にゃー   = bright, voiced, high chime         (cyan)
//  ごろ     = low rolling purr + wooden "ごろん"  (amber)
//  ごろにゃー = both + sparkle + reverse-cymbal     (magenta, special)
import { mtof } from './AudioEngine.js';

const AUDIENCE_VOICES = ['meow_jp1', 'meow_jp2', 'meow_jp3', 'cat1c', 'cat2b', 'cat3b', 'cat3c', 'cat5a', 'old_cat1', 'old_cat3', 'female_cat1', 'cat_sweet_voice3'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);

export class Sfx {
  constructor(engine) { this.a = engine; this.murmur = null; }

  // ---------------------------------------------------------------- UI
  ui(kind = 'tick') {
    const a = this.a;
    if (kind === 'tick') a.tone(1320, 0.05, { type: 'square', gain: 0.05, filter: 3500 });
    if (kind === 'hover') a.tone(1760, 0.03, { type: 'triangle', gain: 0.04 });
    if (kind === 'ok') { a.tone(988, 0.07, { type: 'square', gain: 0.07, filter: 4000 }); a.tone(1480, 0.1, { type: 'square', gain: 0.06, when: a.now + 0.06, filter: 4000 }); }
    if (kind === 'back') { a.tone(880, 0.07, { type: 'square', gain: 0.06, filter: 3000 }); a.tone(587, 0.1, { type: 'square', gain: 0.05, when: a.now + 0.06, filter: 3000 }); }
    if (kind === 'type') a.tone(rnd(1400, 1700), 0.03, { type: 'square', gain: 0.04, filter: 3000 });
    if (kind === 'error') { a.tone(220, 0.12, { type: 'square', gain: 0.08, filter: 1200 }); a.tone(196, 0.16, { type: 'square', gain: 0.08, when: a.now + 0.1, filter: 1200 }); }
    if (kind === 'join') [72, 76, 79, 84].forEach((m, i) => a.tone(mtof(m), 0.12, { type: 'triangle', gain: 0.1, when: a.now + i * 0.07, send: 0.2 }));
    if (kind === 'ready') [79, 84].forEach((m, i) => a.tone(mtof(m), 0.1, { type: 'square', gain: 0.06, when: a.now + i * 0.08, filter: 5000 }));
  }
  bell() { // the master's little bell: チリン
    const a = this.a;
    [0, 0.09].forEach((d, i) => { a.tone(i ? 3520 : 2637, 0.9, { type: 'sine', gain: 0.09, when: a.now + d, send: 0.5, attack: 0.002, release: 0.8 }); a.tone(i ? 5274 : 3951, 0.5, { type: 'sine', gain: 0.03, when: a.now + d, send: 0.4 }); });
  }
  keyDown() { this.a.tone(2400, 0.015, { type: 'square', gain: 0.025, filter: 5000 }); }

  // ---------------------------------------------------------------- actions
  nya(voice = 'cat1a', pitch = 1, pan = 0, loud = 1) {
    const a = this.a;
    a.sample(voice, { rate: pitch * rnd(0.97, 1.04), gain: 0.95 * loud, pan, maxDur: 0.75, send: 0.25 });
    a.tone(mtof(88), 0.09, { type: 'triangle', gain: 0.07 * loud, pan, slideTo: mtof(91), slideTime: 0.05, send: 0.2 });
    a.tone(mtof(95), 0.06, { type: 'sine', gain: 0.04 * loud, pan, when: a.now + 0.04 });
  }
  goro(pan = 0, loud = 1) {
    const a = this.a, t = a.now;
    // purr: AM noise rumble
    for (let i = 0; i < 7; i++) a.noise(0.05, { when: t + i * 0.042, filterType: 'lowpass', freq: 380, q: 2, gain: 0.22 * loud * (1 - i / 9), pan: pan + (i - 3) * 0.05 });
    // "ごろん" body roll: low sine drop + wooden knock
    a.tone(180, 0.26, { type: 'sine', gain: 0.32 * loud, slideTo: 70, slideTime: 0.24, pan });
    a.tone(520, 0.05, { type: 'triangle', gain: 0.12 * loud, when: t + 0.2, slideTo: 300, pan, filter: 2000 });
    a.tone(330, 0.07, { type: 'square', gain: 0.05 * loud, when: t, filter: 900, pan });
  }
  goronya(voice = 'cat1a', pitch = 1, pan = 0) {
    const a = this.a, t = a.now;
    a.duckBgm(0.35, 0.8);
    // reverse-cymbal swell into the hit
    a.noise(0.32, { filterType: 'highpass', freq: 3000, freqTo: 9000, attack: 0.3, gain: 0.16, when: t });
    this.goro(pan, 0.8);
    a.sample(voice, { rate: pitch * 1.12, gain: 1, pan, maxDur: 0.9, send: 0.45, when: t + 0.16 });
    a.tone(55, 0.5, { type: 'sine', gain: 0.45, when: t + 0.15, slideTo: 38 });
    [84, 88, 91, 96, 100].forEach((m, i) => a.tone(mtof(m), 0.22, { type: 'triangle', gain: 0.07, when: t + 0.18 + i * 0.045, pan: (i - 2) * 0.3, echo: 0.5, send: 0.3 }));
    a.tone(mtof(72), 0.6, { type: 'sawtooth', gain: 0.06, when: t + 0.16, filter: 5000, filterTo: 400, detune: 7 });
  }
  secret(pan = 0) { // opponent composing inside the box
    const a = this.a;
    a.noise(0.08, { filterType: 'bandpass', freq: rnd(500, 800), q: 3, gain: 0.18, pan });
    a.tone(rnd(300, 360), 0.06, { type: 'triangle', gain: 0.08, pan, when: a.now + 0.03 });
  }
  reject() { this.a.tone(160, 0.12, { type: 'square', gain: 0.09, filter: 900 }); this.a.tone(150, 0.12, { type: 'square', gain: 0.07, filter: 900, when: this.a.now + 0.07 }); }

  // ---------------------------------------------------------------- flow
  slotDrop(i, n) { this.a.tone(mtof(72 + i * 2), 0.06, { type: 'square', gain: 0.05, filter: 3000, when: this.a.now + i * 0.06 }); void n; }
  slotBreak() { const a = this.a; a.noise(0.18, { filterType: 'highpass', freq: 2500, gain: 0.2 }); a.tone(900, 0.12, { type: 'square', gain: 0.06, slideTo: 200, filter: 2500 }); }
  lock() { const a = this.a; a.tone(mtof(79), 0.08, { type: 'square', gain: 0.07, filter: 3000 }); a.tone(mtof(86), 0.16, { type: 'square', gain: 0.07, filter: 3000, when: a.now + 0.07, send: 0.2 }); }
  countIn(n) { this.a.tone(n === 0 ? mtof(84) : mtof(79), 0.07, { type: 'square', gain: 0.06, filter: 3500 }); }
  memorize() { const a = this.a; a.tone(mtof(91), 0.2, { type: 'sine', gain: 0.07, send: 0.4 }); a.tone(mtof(86), 0.3, { type: 'sine', gain: 0.05, when: a.now + 0.1, send: 0.4 }); }
  yourTurn() { const a = this.a; [76, 83, 88].forEach((m, i) => a.tone(mtof(m), 0.12, { type: 'square', gain: 0.06, when: a.now + i * 0.06, filter: 4500, send: 0.15 })); }
  turnStart() { const a = this.a; a.noise(0.3, { filterType: 'bandpass', freq: 600, freqTo: 3000, gain: 0.08, attack: 0.25 }); a.tone(mtof(60), 0.18, { type: 'square', gain: 0.06, when: a.now + 0.25, filter: 2000 }); }
  reverseOn() {
    const a = this.a, t = a.now;
    // record-scratch + flipping arpeggio (descending = "逆")
    a.noise(0.2, { filterType: 'bandpass', freq: 2500, freqTo: 400, q: 4, gain: 0.25 });
    [96, 91, 88, 84, 79].forEach((m, i) => a.tone(mtof(m), 0.1, { type: 'square', gain: 0.05, when: t + 0.05 + i * 0.04, filter: 4000, pan: i % 2 ? 0.4 : -0.4 }));
  }
  okStep(i, reversed) {
    const a = this.a;
    const base = reversed ? [84, 83, 81, 79, 77, 76, 74, 72, 71] : [72, 74, 76, 79, 81, 84, 86, 88, 91];
    a.tone(mtof(base[Math.min(i, base.length - 1)] + 12), 0.07, { type: 'triangle', gain: 0.06, send: 0.15 });
  }
  timerTick(urgent) { this.a.tone(urgent ? 1760 : 1320, 0.03, { type: 'square', gain: urgent ? 0.05 : 0.025, filter: 5000 }); }
  heartbeat() { const a = this.a; a.tone(62, 0.12, { type: 'sine', gain: 0.35, slideTo: 40 }); a.tone(58, 0.12, { type: 'sine', gain: 0.25, slideTo: 40, when: a.now + 0.17 }); }

  success(level = 0, special = false) {
    const a = this.a, t = a.now;
    const notes = special ? [72, 76, 79, 84, 88, 91, 96] : [76, 79, 84, 88];
    notes.forEach((m, i) => a.tone(mtof(m), 0.16, { type: 'square', gain: 0.06, when: t + i * 0.06, filter: 5000, echo: 0.3, send: 0.2 }));
    a.tone(mtof(special ? 60 : 64), 0.5, { type: 'triangle', gain: 0.1, when: t + notes.length * 0.06 });
    this.cheer(level + (special ? 1 : 0));
  }
  miss(level = 0) {
    const a = this.a, t = a.now;
    a.duckBgm(0.2, 1.4);
    a.tone(mtof(67), 0.2, { type: 'square', gain: 0.1, filter: 2200, when: t });
    a.tone(mtof(66), 0.2, { type: 'square', gain: 0.1, filter: 2200, when: t + 0.2 });
    a.tone(mtof(65), 0.6, { type: 'square', gain: 0.1, filter: 2200, when: t + 0.4, slideTo: mtof(58), slideTime: 0.6, vibrato: 7 });
    a.noise(0.25, { filterType: 'lowpass', freq: 300, gain: 0.35, when: t });
    this.ooh(level);
  }
  fishLost() {
    const a = this.a, t = a.now;
    a.tone(900, 0.14, { type: 'sine', gain: 0.14, slideTo: 1500, slideTime: 0.1, when: t }); // "ぴょん"
    a.noise(0.2, { filterType: 'bandpass', freq: 1200, q: 2, gain: 0.12, when: t + 0.5 });    // "ぺちっ"
    a.tone(300, 0.08, { type: 'triangle', gain: 0.1, when: t + 0.5, slideTo: 160 });
  }
  munch() { const a = this.a; for (let i = 0; i < 3; i++) a.noise(0.05, { filterType: 'bandpass', freq: 1800, q: 3, gain: 0.1, when: a.now + i * 0.11 }); }
  whoosh(dur = 0.8, up = true) { this.a.noise(dur, { filterType: 'bandpass', freq: up ? 300 : 3000, freqTo: up ? 4000 : 300, q: 1.5, gain: 0.18, attack: dur * 0.7 }); }
  riser(dur = 2) {
    const a = this.a;
    a.noise(dur, { filterType: 'bandpass', freq: 200, freqTo: 6000, q: 2, gain: 0.2, attack: dur * 0.9 });
    a.tone(110, dur, { type: 'sawtooth', gain: 0.05, slideTo: 880, slideTime: dur, filter: 400, filterTo: 5000, attack: dur * 0.8 });
  }
  impact() {
    const a = this.a;
    a.tone(70, 0.6, { type: 'sine', gain: 0.5, slideTo: 35 });
    a.noise(0.4, { filterType: 'lowpass', freq: 2000, freqTo: 200, gain: 0.3, send: 0.4 });
  }
  neonBuzz() { const a = this.a; for (let i = 0; i < 4; i++) a.tone(120, 0.04, { type: 'sawtooth', gain: 0.03, when: a.now + i * rnd(0.03, 0.09), filter: 1500 }); }
  logo() {
    const a = this.a, t = a.now;
    this.impact();
    [72, 79, 84, 88, 91].forEach((m, i) => a.tone(mtof(m), 0.4, { type: 'square', gain: 0.05, when: t + 0.05 + i * 0.05, filter: 5000, echo: 0.5, send: 0.3 }));
    a.sample('meow_jp2', { rate: 1.05, gain: 0.8, when: t + 0.2, send: 0.4 });
  }
  matchStart() {
    const a = this.a, t = a.now;
    a.tone(mtof(60), 0.12, { type: 'square', gain: 0.08, when: t, filter: 3000 });
    a.tone(mtof(60), 0.12, { type: 'square', gain: 0.08, when: t + 0.5, filter: 3000 });
    a.tone(mtof(60), 0.12, { type: 'square', gain: 0.08, when: t + 1.0, filter: 3000 });
    [72, 76, 79, 84].forEach((m) => a.tone(mtof(m), 0.6, { type: 'square', gain: 0.05, when: t + 1.5, filter: 5000, send: 0.3 }));
    a.tone(55, 0.6, { type: 'sine', gain: 0.4, when: t + 1.5, slideTo: 40 });
  }
  win() {
    const a = this.a, t = a.now;
    const mel = [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.6], [84, 0.72], [88, 0.84], [91, 1.1]];
    mel.forEach(([m, d]) => a.tone(mtof(m), 0.28, { type: 'square', gain: 0.07, when: t + d, filter: 5000, send: 0.25, echo: 0.3 }));
    [48, 55, 60, 64].forEach((m) => a.tone(mtof(m), 1.6, { type: 'triangle', gain: 0.07, when: t + 1.1, attack: 0.02 }));
    this.cheer(4);
  }
  lose() {
    const a = this.a, t = a.now;
    [[67, 0], [63, 0.3], [60, 0.6], [55, 0.95]].forEach(([m, d]) => a.tone(mtof(m), 0.4, { type: 'triangle', gain: 0.09, when: t + d, vibrato: 5, send: 0.3 }));
    a.sample('old_cat2', { rate: 0.8, gain: 0.6, when: t + 1.2, send: 0.5 });
  }

  // ---------------------------------------------------------------- crowd
  cheer(level = 1) {
    const a = this.a, t = a.now;
    const n = 2 + level * 2;
    for (let i = 0; i < n; i++) a.sample(pick(AUDIENCE_VOICES), { rate: rnd(1.05, 1.55), gain: rnd(0.25, 0.45), pan: rnd(-0.9, 0.9), when: t + rnd(0, 0.55), bus: 'crowd', maxDur: 0.5 });
    // applause-ish clatter
    for (let i = 0; i < 10 + level * 8; i++) a.noise(0.03, { filterType: 'bandpass', freq: rnd(1500, 4000), q: 2, gain: rnd(0.04, 0.09), when: t + rnd(0, 0.9 + level * 0.15), bus: 'crowd', pan: rnd(-1, 1) });
  }
  ooh(level = 1) {
    const a = this.a, t = a.now;
    for (let i = 0; i < 2 + level; i++) a.sample(pick(AUDIENCE_VOICES), { rate: rnd(0.62, 0.8), gain: rnd(0.25, 0.4), pan: rnd(-0.9, 0.9), when: t + 0.1 + rnd(0, 0.35), bus: 'crowd', maxDur: 0.8 });
    a.noise(0.9, { filterType: 'bandpass', freq: 520, freqTo: 380, q: 3, gain: 0.08 + level * 0.02, attack: 0.25, bus: 'crowd' });
  }
  crowdMeow(level = 1) { // ambient single meow from the audience
    this.a.sample(pick(AUDIENCE_VOICES), { rate: rnd(0.9, 1.5), gain: rnd(0.08, 0.16) * (0.6 + level * 0.2), pan: rnd(-1, 1), bus: 'crowd', maxDur: 0.6 });
  }
  chant(level = 1) { // "にゃ！にゃ！" crowd chant at high hype
    const a = this.a;
    for (let i = 0; i < 2 + level; i++) a.sample(pick(AUDIENCE_VOICES), { rate: rnd(1.2, 1.4), gain: 0.12, pan: rnd(-1, 1), bus: 'crowd', maxDur: 0.25, when: a.now + rnd(0, 0.03) });
  }
}
