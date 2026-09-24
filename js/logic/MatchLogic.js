// Authoritative match logic. Runs only on the room host (or locally for CPU /
// same-device play). It knows nothing about rendering: it consumes player
// actions + a clock and emits *facts* (what happened in the game).
import {
  ACT, START_LIVES, MIN_SEQ, T, GORONYA_BREAKS, GIFT_MAX_SLOTS, slotsForRound, roundForTurn, composeTimeMs,
  capacityOf, composeRejectReason, expectedAt, reverseFrom, hypeFor, beatMs, showcaseBeats,
} from './Rules.js';

export class MatchLogic {
  constructor({ first = 0, lives = START_LIVES, rng = Math.random } = {}) {
    this.first = first;
    this.rng = rng;
    this.lives = [lives, lives];
    this.turnNo = 0;
    this.phase = 'idle';
    this.until = 0;
    this.seq = [];
    this.pads = [];
    this.replayIdx = 0;
    this.gift = [0, 0]; // extra slots waiting for each player's next compose turn
    this.stats = [0, 1].map(() => ({ clears: 0, misses: 0, goronya: 0, goronyaClears: 0, longest: 0, composed: 0, stumped: 0 }));
    this.onFact = () => {};
  }

  emit(fact) { this.onFact(fact); }
  get hype() { return hypeFor(Math.max(1, this.turnNo), this.lives); }

  start(now) {
    this.phase = 'matchIntro';
    this.until = now + T.matchIntro;
    this.emit({ type: 'matchStart', first: this.first, lives: [...this.lives], durMs: T.matchIntro });
  }

  // ---------------------------------------------------------------- turn flow
  beginTurn(now) {
    this.turnNo += 1;
    this.round = roundForTurn(this.turnNo);
    this.composer = (this.first + this.turnNo - 1) % 2;
    this.replayer = 1 - this.composer;
    const base = slotsForRound(this.round);
    const bonus = this.gift[this.composer];
    this.gift[this.composer] = 0;
    this.slots = Math.min(GIFT_MAX_SLOTS, base + bonus);
    this.bonus = this.slots - base;
    this.seq = [];
    this.pads = [];
    this.replayIdx = 0;
    this.phase = 'turnIntro';
    this.until = now + T.turnIntro;
    const hype = this.hype;
    this.emit({
      type: 'turnStart', turn: this.turnNo, round: this.round, composer: this.composer, replayer: this.replayer,
      slots: this.slots, bonus: this.bonus, hype, beatMs: beatMs(hype), lives: [...this.lives], durMs: T.turnIntro,
    });
  }

  openCompose(now) {
    this.phase = 'compose';
    const ms = composeTimeMs(this.slots);
    this.until = now + ms;
    this.emit({ type: 'composeOpen', turn: this.turnNo, capacity: this.slots, durMs: ms });
  }

  lock(now, reason) {
    // too short? the alley cats shout random moves to fill it
    while (this.seq.length < MIN_SEQ) {
      this.pads.push(this.seq.length);
      this.seq.push(this.rng() < 0.5 ? ACT.NYA : ACT.GORO);
    }
    this.phase = 'lockPause';
    this.until = now + T.lockPause;
    this.stats[this.composer].composed += 1;
    let gift = 0;
    if (this.seq.includes(ACT.GORONYA)) {
      this.stats[this.composer].goronya += 1;
      gift = GORONYA_BREAKS;
      this.gift[this.replayer] += gift; // the broken slot becomes the opponent's next turn
    }
    this.emit({ type: 'composeLock', turn: this.turnNo, seq: [...this.seq], pads: [...this.pads], reason, gift, giftTo: this.replayer });
  }

  openShowcase(now) {
    this.phase = 'showcase';
    const bm = beatMs(this.hype);
    const dur = showcaseBeats(this.seq) * bm;
    this.until = now + dur;
    this.emit({ type: 'showcase', turn: this.turnNo, seq: [...this.seq], beatMs: bm, countIn: T.countInBeats, durMs: dur, reverseFrom: reverseFrom(this.seq) });
  }

  openReplay(now) {
    this.phase = 'replay';
    this.replayIdx = 0;
    this.until = now + T.replayFirst;
    this.emit({ type: 'replayOpen', turn: this.turnNo, length: this.seq.length, reverseFrom: reverseFrom(this.seq), firstMs: T.replayFirst, stepMs: T.replayStep });
  }

  judge(now, ok, info = {}) {
    this.phase = 'judge';
    const r = this.replayer;
    if (ok) {
      this.stats[r].clears += 1;
      this.stats[r].longest = Math.max(this.stats[r].longest, this.seq.length);
      if (this.seq.includes(ACT.GORONYA)) this.stats[r].goronyaClears += 1;
    } else {
      this.lives[r] = Math.max(0, this.lives[r] - 1);
      this.stats[r].misses += 1;
      this.stats[this.composer].stumped += 1;
    }
    this.until = now + (ok ? T.judgeOk : T.judgeMiss);
    this.emit({
      type: 'judge', turn: this.turnNo, ok, replayer: r, composer: this.composer, lives: [...this.lives],
      seq: [...this.seq], hype: this.hype, durMs: ok ? T.judgeOk : T.judgeMiss, ...info,
    });
  }

  end() {
    this.phase = 'end';
    const winner = this.lives[0] > 0 ? 0 : 1;
    this.emit({ type: 'matchEnd', winner, lives: [...this.lives], stats: this.stats.map((s) => ({ ...s })), turns: this.turnNo });
  }

  // ---------------------------------------------------------------- input
  input(player, action, now) {
    if (this.phase === 'compose' && player === this.composer) {
      if (action === 'confirm') {
        if (this.seq.length >= MIN_SEQ) this.lock(now, 'confirm');
        else this.emit({ type: 'composeReject', turn: this.turnNo, player, action, reason: 'tooShort' });
        return;
      }
      const why = composeRejectReason(this.seq, this.slots, action);
      if (why) { this.emit({ type: 'composeReject', turn: this.turnNo, player, action, reason: why }); return; }
      this.seq.push(action);
      const capacity = capacityOf(this.seq, this.slots);
      this.emit({ type: 'composeInput', turn: this.turnNo, player, action, index: this.seq.length - 1, capacity });
      if (this.seq.length >= capacity) this.lock(now, 'full');
      return;
    }
    if (this.phase === 'replay' && player === this.replayer && action !== 'confirm') {
      const i = this.replayIdx;
      const expected = expectedAt(this.seq, i);
      const ok = action === expected;
      this.emit({ type: 'replayInput', turn: this.turnNo, player, action, index: i, expected, ok });
      if (!ok) { this.judge(now, false, { missIndex: i, expected, got: action }); return; }
      this.replayIdx += 1;
      if (this.replayIdx >= this.seq.length) this.judge(now, true);
      else this.until = now + T.replayStep;
    }
  }

  // ---------------------------------------------------------------- clock
  update(now) {
    if (this.phase === 'idle' || this.phase === 'end' || now < this.until) return;
    switch (this.phase) {
      case 'matchIntro': this.beginTurn(now); break;
      case 'turnIntro': this.openCompose(now); break;
      case 'compose': this.lock(now, 'timeout'); break;
      case 'lockPause': this.openShowcase(now); break;
      case 'showcase': this.openReplay(now); break;
      case 'replay': {
        const i = this.replayIdx;
        const expected = expectedAt(this.seq, i);
        this.emit({ type: 'replayTimeout', turn: this.turnNo, index: i, expected });
        this.judge(now, false, { missIndex: i, expected, got: null, timeout: true });
        break;
      }
      case 'judge':
        if (this.lives.some((l) => l <= 0)) this.end();
        else this.beginTurn(now);
        break;
    }
  }
}
