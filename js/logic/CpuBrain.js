// The CPU opponent (practice / story). It only sees the same facts a remote
// player would, and answers through the same input channel.
//   slip    : chance to fumble each input when mimicking (grows along the line / in reverse)
//   maxLen  : how many moves it composes at most (short = easy to copy)
//   goronya : chance to throw a ごろにゃー in a turn
import { ACT, expectedAt, isReversedIndex, composeRejectReason, capacityOf } from './Rules.js';

export class CpuBrain {
  constructor(playerId, submit, { slip = 0.05, goronya = 0.55, maxLen = 99 } = {}) {
    this.goronyaRate = goronya;
    this.slip = slip;
    this.maxLen = maxLen;
    this.id = playerId;
    this.submit = submit;
    this.timers = [];
  }
  clear() { this.timers.forEach(clearTimeout); this.timers = []; }
  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); }

  onFact(f) {
    if (f.type === 'composeOpen' && this.composer === this.id) this.compose(f.capacity);
    if (f.type === 'turnStart') { this.composer = f.composer; this.replayer = f.replayer; this.clear(); }
    if (f.type === 'showcase') this.seq = f.seq;
    if (f.type === 'replayOpen' && this.replayer === this.id) this.replay();
    if (f.type === 'judge' || f.type === 'matchEnd') this.clear();
  }

  compose(slots) {
    const seq = [];
    const useGoronya = Math.random() < this.goronyaRate;
    const gAt = 1 + Math.floor(Math.random() * Math.max(1, slots - 2));
    let t = 700 + Math.random() * 600;
    const plan = [];
    while (true) {
      let a = Math.random() < 0.5 ? ACT.NYA : ACT.GORO;
      // cats love repeating the same move... then switching
      if (seq.length && Math.random() < 0.35) a = seq[seq.length - 1];
      if (useGoronya && seq.length === gAt && !composeRejectReason(seq, slots, ACT.GORONYA)) a = ACT.GORONYA;
      if (composeRejectReason(seq, slots, a)) break;
      seq.push(a); plan.push(a);
      if (seq.length >= capacityOf(seq, slots)) break;
      if (seq.length >= Math.max(2, this.maxLen)) { plan.push('confirm'); break; }
    }
    for (const a of plan) { this.later(t, () => this.submit(a)); t += 380 + Math.random() * 520; }
  }

  replay() {
    const seq = this.seq || [];
    let t = 650 + Math.random() * 500;
    for (let i = 0; i < seq.length; i++) {
      let a = expectedAt(seq, i);
      const rev = isReversedIndex(seq, i);
      const pErr = this.slip * (1 + i * 0.15) + (rev ? this.slip * 1.2 : 0);
      if (Math.random() < pErr && a !== ACT.GORONYA) a = a === ACT.NYA ? ACT.GORO : ACT.NYA;
      this.later(t, () => this.submit(a));
      t += 330 + Math.random() * 420 + (rev ? 250 : 0);
    }
  }
}
