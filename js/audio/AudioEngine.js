// Low-level WebAudio plumbing: buses, samples, synth voices.
// Everything above this (Sfx / Bgm) speaks in musical terms.

export const SAMPLE_FILES = [
  'meow_jp1', 'meow_jp2', 'meow_jp3', 'cat1a', 'cat1b', 'cat1c', 'cat2a', 'cat2b', 'cat3a', 'cat3b', 'cat3c', 'cat5a',
  'cat_sweet_voice1', 'cat_sweet_voice2', 'cat_sweet_voice3', 'female_cat1', 'old_cat1', 'old_cat2', 'old_cat3',
];

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.samples = {};
    this.muted = false;
    this.volume = { master: 0.9, bgm: 0.55, sfx: 0.85, voice: 0.9, crowd: 0.6 };
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }
  get ok() { return !!this.ctx && this.ctx.state === 'running'; }

  // Must be called from a user gesture.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.build();
      this.loadSamples();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  build() {
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.volume.master;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master.connect(comp).connect(c.destination);

    // reverb send (generated impulse — alley echo)
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.impulse(1.9, 3.2);
    this.reverbIn = c.createGain(); this.reverbIn.gain.value = 0.35;
    this.reverbIn.connect(this.reverb).connect(this.master);

    // tempo delay send
    this.delay = c.createDelay(1.5); this.delay.delayTime.value = 0.34;
    this.delayFb = c.createGain(); this.delayFb.gain.value = 0.32;
    const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2800;
    this.delayIn = c.createGain(); this.delayIn.gain.value = 0.5;
    this.delayIn.connect(this.delay); this.delay.connect(dlp).connect(this.delayFb).connect(this.delay);
    dlp.connect(this.master);

    // BGM bus with tension filter
    this.bgmFilter = c.createBiquadFilter(); this.bgmFilter.type = 'lowpass'; this.bgmFilter.frequency.value = 18000; this.bgmFilter.Q.value = 0.8;
    this.bgmBus = c.createGain(); this.bgmBus.gain.value = this.volume.bgm;
    this.bgmBus.connect(this.bgmFilter).connect(this.master);
    this.duck = c.createGain(); this.duck.gain.value = 1; // sidechain-ish ducking for big hits
    this.duck.connect(this.bgmBus);

    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.volume.sfx; this.sfxBus.connect(this.master);
    this.voiceBus = c.createGain(); this.voiceBus.gain.value = this.volume.voice; this.voiceBus.connect(this.master);
    this.crowdBus = c.createGain(); this.crowdBus.gain.value = this.volume.crowd; this.crowdBus.connect(this.master);
    this.voiceBus.connect(this.reverbIn);

    this.noiseBuf = this.makeNoise(2);
  }

  impulse(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 200 ? i / 200 : 1);
    }
    return b;
  }
  makeNoise(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  async loadSamples() {
    await Promise.all(SAMPLE_FILES.map(async (name) => {
      try {
        const res = await fetch(`assets/audio/${name}.mp3`);
        const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.samples[name] = this.trim(buf);
      } catch (e) { console.warn('sample failed', name, e); }
    }));
  }

  // cut silence, normalize — the source recordings vary a lot
  trim(buf) {
    const d = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    const th = peak * 0.06;
    let s = 0, e = d.length - 1;
    while (s < d.length && Math.abs(d[s]) < th) s++;
    while (e > s && Math.abs(d[e]) < th) e--;
    s = Math.max(0, s - Math.floor(buf.sampleRate * 0.008));
    e = Math.min(d.length - 1, e + Math.floor(buf.sampleRate * 0.04));
    const len = Math.max(1, e - s);
    const out = this.ctx.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
    const g = peak > 0 ? 0.92 / peak : 1;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch), dst = out.getChannelData(ch);
      for (let i = 0; i < len; i++) dst[i] = src[s + i] * g;
    }
    return out;
  }

  out(bus, pan) {
    const c = this.ctx;
    const dest = { bgm: this.duck, sfx: this.sfxBus, voice: this.voiceBus, crowd: this.crowdBus }[bus] || this.sfxBus;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(dest);
      return p;
    }
    return dest;
  }

  sample(name, { rate = 1, gain = 1, pan = 0, when = 0, bus = 'voice', maxDur = 0.9, send = 0 } = {}) {
    if (!this.ctx) return;
    const buf = this.samples[name];
    if (!buf) return;
    const c = this.ctx, t = Math.max(c.currentTime, when || c.currentTime);
    const src = c.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    const g = c.createGain();
    const dur = Math.min(maxDur, buf.duration / rate);
    g.gain.setValueAtTime(gain, t);
    g.gain.setValueAtTime(gain, t + Math.max(0.01, dur - 0.08));
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(g).connect(this.out(bus, pan));
    if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s).connect(this.reverbIn); }
    src.start(t); src.stop(t + dur + 0.02);
  }

  tone(freq, dur, o = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = Math.max(c.currentTime, o.when || c.currentTime);
    const osc = c.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + (o.slideTime || dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vibrato) {
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = o.vibrato; lg.gain.value = freq * 0.02;
      lfo.connect(lg).connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    const g = c.createGain();
    const a = o.attack ?? 0.004, r = o.release ?? Math.min(0.12, dur * 0.6), peak = o.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (o.sustain !== undefined) g.gain.setValueAtTime(peak * o.sustain, t + a + 0.02);
    g.gain.setValueAtTime(o.sustain !== undefined ? peak * o.sustain : peak, t + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.filter) {
      const f = c.createBiquadFilter(); f.type = o.filterType || 'lowpass'; f.frequency.setValueAtTime(o.filter, t); f.Q.value = o.q || 1;
      if (o.filterTo) f.frequency.exponentialRampToValueAtTime(o.filterTo, t + dur);
      node.connect(f); node = f;
    }
    node.connect(g).connect(this.out(o.bus || 'sfx', o.pan));
    if (o.send) { const s = c.createGain(); s.gain.value = o.send; g.connect(s).connect(this.reverbIn); }
    if (o.echo) { const s = c.createGain(); s.gain.value = o.echo; g.connect(s).connect(this.delayIn); }
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  noise(dur, o = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = Math.max(c.currentTime, o.when || c.currentTime);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.filterType || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1000, t); f.Q.value = o.q ?? 1;
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
    const g = c.createGain();
    const a = o.attack ?? 0.002, peak = o.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out(o.bus || 'sfx', o.pan));
    if (o.send) { const s = c.createGain(); s.gain.value = o.send; g.connect(s).connect(this.reverbIn); }
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  duckBgm(amount = 0.45, time = 0.35) {
    if (!this.ctx) return;
    const g = this.duck.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(amount, t + 0.02); g.linearRampToValueAtTime(1, t + time);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume.master, this.ctx.currentTime, 0.05);
  }
}
