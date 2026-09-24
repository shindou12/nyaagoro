// MatchPresenter — part of the Mediator layer.
// Consumes game *facts* (from MatchLogic, local or over the wire) and decides
// how to show them: which views change, which sounds play, how the crowd
// reacts. Views stay passive; game rules stay in logic/.
import { ACT, beatsFor, composeRejectReason, capacityOf, expectedAt, isReversedIndex, START_LIVES } from '../logic/Rules.js';
import { BREEDS } from '../art/catArt.js';
import { actionIcon, fishIcon, toURL } from '../art/icons.js';
import { HYPE_NAMES } from '../views/hud/Hud.js';
import { CAT_POS } from '../views/GameRoot.js';

const WORD = { nya: 'にゃー！', goro: 'ごろ〜ん', goronya: 'ごろにゃー!!' };
const iconImg = (a, cls = '') => `<img class="px ${cls}" src="${toURL(actionIcon(a))}" alt="">`;
const REJECT_MSG = { goronyaUsed: 'ごろにゃーは 1ターン1回まで！', noRoom: 'ごろにゃーには 残り2マス必要！', tooShort: '2つ以上 入力してからキメてね', full: 'もう いっぱい！' };

export class MatchPresenter {
  constructor(root, audio, sfx, bgm) {
    this.r = root; this.audio = audio; this.sfx = sfx; this.bgm = bgm;
    this.S = root.scene;
    this.timeline = [];
    this.reset();
  }

  reset() {
    this.phase = 'none';
    this.turn = 0;
    this.seq = [];
    this.localSeq = [];
    this.revFrom = -1;
    this.replayIdx = 0;
    this.previewed = new Set();
    this.timer = null;
    this.hype = 0;
    this.lives = [START_LIVES, START_LIVES];
    this.timeline = [];
    this.lastTick = 0;
  }

  /** bind to a session (for names, perspective) */
  bind(session, onResultReady) {
    this.s = session;
    this.onResultReady = onResultReady;
    // your cat is always on the left; in same-device play P1 is left
    this.leftSlot = session.mode === 'guest' ? 1 : 0;
  }

  // ---------------------------------------------------------------- helpers
  now() { return performance.now() / 1000; }
  sideOf(slot) { return slot === this.leftSlot ? -1 : 1; }
  actor(slot) { return this.sideOf(slot) < 0 ? this.r.catL : this.r.catR; }
  plate(slot) { return this.sideOf(slot) < 0 ? this.r.plateL : this.r.plateR; }
  pos(slot) { return this.sideOf(slot) < 0 ? CAT_POS.L : CAT_POS.R; }
  name(slot) { return this.s.players[slot].name || (slot ? 'P2' : 'P1'); }
  breed(slot) { return this.s.players[slot].cat || 'tama'; }
  isMe(slot) { return this.s.isLocal(slot) && this.s.mode !== 'local'; }
  secretFor(composer) { return !this.s.isLocal(composer); }
  at(delay, fn) { this.timeline.push({ at: this.now() + delay, fn }); }
  voiceOf(slot) { const b = BREEDS[this.breed(slot)]; return [b.voice, b.pitch]; }
  pan(slot) { return this.sideOf(slot) * 0.45; }

  /** can this local slot input right now? */
  accepts(slot) {
    if (!this.s || !this.s.isLocal(slot)) return false;
    if (this.phase === 'compose') return slot === this.composer;
    if (this.phase === 'replay') return slot === this.replayer;
    return false;
  }
  activeLocalSlot() {
    if (this.phase === 'compose' && this.s.isLocal(this.composer)) return this.composer;
    if (this.phase === 'replay' && this.s.isLocal(this.replayer)) return this.replayer;
    return null;
  }

  // ---------------------------------------------------------------- action show (shared by preview + facts)
  performAction(slot, action, { loud = 1, big = false } = {}) {
    const a = this.actor(slot), t = this.now(), p = this.pos(slot);
    a.play(action, t);
    const [voice, pitch] = this.voiceOf(slot);
    if (action === ACT.NYA) { this.sfx.nya(voice, pitch, this.pan(slot), loud); this.r.fx.notes(p.x + 10 * -this.sideOf(slot), p.y - 40, '#43e8ff'); }
    if (action === ACT.GORO) { this.sfx.goro(this.pan(slot), loud); this.r.fx.burst(p.x, p.y - 2, 'dust', 6, 'goro'); }
    if (action === ACT.GORONYA) {
      this.sfx.goronya(voice, pitch, this.pan(slot));
      this.r.fx.burst(p.x, p.y - 20, 'sparkle', 22, 'goronya');
      this.r.fx.ring(p.x, p.y - 16, '#ff3ea5', 50, 0.5);
      this.r.screenFx.flash('#ff3ea5', 260);
      if (big) this.r.screenFx.shake(1);
    }
    this.r.bubbles.say(p.x, p.y - 44, WORD[action], action, action === ACT.GORONYA ? 900 : 520, 'cat' + this.sideOf(slot));
  }

  /** Immediate local feedback (before the authoritative fact arrives). */
  preview(slot, action) {
    if (!this.accepts(slot)) return false;
    if (this.phase === 'compose') {
      const why = composeRejectReason(this.localSeq, this.slots, action);
      if (action === 'confirm') return true;
      if (why) return true; // let the fact explain the rejection
      const idx = this.localSeq.length;
      this.localSeq.push(action);
      this.previewed.add(`${this.turn}:c:${idx}`);
      this.performAction(slot, action);
      this.showComposeSlot(idx, action, slot);
      return true;
    }
    if (this.phase === 'replay') {
      if (action === 'confirm') return false;
      const idx = this.localReplayIdx;
      if (idx >= this.seq.length) return false;
      this.localReplayIdx += 1;
      this.previewed.add(`${this.turn}:r:${idx}`);
      this.performAction(slot, action);
      return true;
    }
    return false;
  }

  showComposeSlot(i, action, composer) {
    const tr = this.r.track;
    if (this.secretFor(composer)) tr.setSlot(i, { state: 'secret', pop: true });
    else tr.setSlot(i, { state: 'shown', icon: action, pop: true, flags: isReversedIndex(this.localSeq.length > i ? this.localSeq : this.seq, i) ? ['rev'] : [] });
    tr.setCursor(i + 1);
    if (action === ACT.GORONYA) {
      tr.setReverseFrom(i);
    }
  }

  // ---------------------------------------------------------------- facts
  handle(f) {
    const fn = this['on_' + f.type];
    if (fn) fn.call(this, f);
  }

  on_matchStart(f) {
    const r = this.r;
    this.reset();
    this.lives = [...f.lives];
    const L = this.leftSlot, R = 1 - L;
    [L, R].forEach((slot) => {
      const pl = this.plate(slot);
      pl.setCat(this.breed(slot));
      pl.setName(this.name(slot), this.isMe(slot) ? 'YOU' : this.s.players[slot].cpu ? 'CPU' : 'RIVAL');
      pl.setLives(f.lives[slot], START_LIVES); pl.setRole(null); pl.setActive(false); pl.setDanger(false); pl.setGift(0);
      pl.show();
      const a = this.actor(slot);
      a.setBreed(this.breed(slot)); a.setBase('idle', this.now()); a.crown = false; a.alpha = 1; a.emote = null; a.reverse = false;
    });
    r.track.setup(0); r.track.hide(); r.timer.hide(); r.revChip.set(false); r.pad.setMode('off'); r.pad.setReverse(false);
    r.round.hide(); r.hype.show(); r.hype.set(0);
    r.screenFx.setReverse(false); r.screenFx.setDanger(false); r.screenFx.setTint('');
    this.setHype(0, true);
    this.S.reverse = false;
    r.fx.confettiRate = 0;
    const first = f.first;
    const firstName = this.isMe(first) ? 'キミ' : this.name(first);
    r.vs.play({
      left: { name: this.name(L), breed: this.breed(L), tag: 'YOU' },
      right: { name: this.name(R), breed: this.breed(R), tag: this.s.players[R].cpu ? 'CPU' : 'RIVAL' },
      firstText: `先攻は <b>${firstName}</b> の出題から！`,
    });
    this.sfx.matchStart();
    this.bgm.setMode('calm');
    this.S.mood = 'cheer'; this.S.moodUntil = this.now() + 2.5;
    this.phase = 'intro';
  }

  on_turnStart(f) {
    const r = this.r;
    this.phase = 'turnIntro';
    this.turn = f.turn; this.composer = f.composer; this.replayer = f.replayer; this.slots = f.slots;
    this.seq = []; this.localSeq = []; this.revFrom = -1; this.replayIdx = 0; this.localReplayIdx = 0;
    this.previewed.clear();
    this.timer = null;
    this.beatMs = f.beatMs;
    r.round.show(); r.round.set(f.round, f.slots, f.bonus || 0);
    r.track.show(); r.track.setup(f.slots); r.track.setMode('compose'); r.track.setCursor(-1);
    this.plate(f.composer).setGift(0);
    if (f.bonus) {
      // ごろにゃーのおかえし: the gifted slot(s) land at the end of the track
      for (let i = f.slots - f.bonus; i < f.slots; i++) r.track.markGift(i);
      this.at(0.5, () => { this.sfx.ui('join'); });
    }
    for (let i = 0; i < f.slots; i++) this.sfx.slotDrop(i, f.slots);
    r.timer.hide();
    r.revChip.set(false);
    r.pad.setReverse(false);
    r.screenFx.setReverse(false); r.screenFx.setTint('');
    this.S.reverse = false; this.bgm.setReverse(false);
    this.setHype(f.hype);
    // roles
    const C = f.composer, M = f.replayer;
    this.plate(C).setRole('composer'); this.plate(M).setRole('mimic');
    this.plate(C).setActive(true); this.plate(M).setActive(false);
    this.actor(C).setBase('think', this.now()); this.actor(M).setBase('watch', this.now());
    this.actor(C).emote = null; this.actor(M).emote = null;
    this.spot(C);
    const pc = this.pos(C), pm = this.pos(M);
    r.roleTags.set(this.sideOf(C), this.isMe(C) ? 'キミが出題' : '出題', 'composer', pc.x, pc.y - 48);
    r.roleTags.set(this.sideOf(M), this.isMe(M) ? 'キミがまね' : 'まね', 'mimic', pm.x, pm.y - 48);
    const giftSub = f.bonus ? `<em>ごろにゃーのおかえし +${f.bonus}マス！</em><br>` : '';
    if (this.isMe(C)) r.banner.say('キミの出題！', { sub: `${giftSub}<b>${f.slots}マス</b>まで ヒミツで入力しよう`, style: 'you', ms: f.bonus ? 1500 : 1400 });
    else r.banner.say(`${this.name(C)} の出題…`, { sub: `${giftSub}ダンボールの中で たくらみ中`, style: 'watch', ms: 1400 });
    r.pad.setMode(this.s.isLocal(C) ? 'wait' : 'wait', this.s.isLocal(C) ? 'まもなく入力スタート' : '');
    this.sfx.turnStart();
    this.bgm.setMode('calm');
  }

  on_composeOpen(f) {
    const r = this.r, C = this.composer;
    this.phase = 'compose';
    this.timer = { t0: this.now(), dur: f.durMs / 1000 };
    r.timer.show(); r.timer.set(1, false);
    r.track.setCursor(0);
    if (this.s.isLocal(C)) {
      r.pad.setMode('compose', 'ヒミツで入力中…');
      r.pad.setConfirm(false); r.pad.setComboEnabled(true);
      this.sfx.yourTurn();
      this.actor(C).setBase('think', this.now());
    } else {
      r.pad.setMode('wait', `${this.name(C)} が考え中…`);
      this.actor(C).setBase('box', this.now());
    }
    this.bgm.setMode('compose');
  }

  on_composeInput(f) {
    const r = this.r, C = this.composer;
    const key = `${this.turn}:c:${f.index}`;
    this.seq[f.index] = f.action;
    if (this.secretFor(C)) {
      this.actor(C).wiggleBox(this.now());
      this.sfx.secret(this.pan(C));
      const p = this.pos(C);
      this.r.bubbles.say(p.x, p.y - 40, '？', 'small', 380, 'cat' + this.sideOf(C));
      this.showComposeSlot(f.index, f.action, C);
      if (f.action === ACT.GORONYA) { r.track.setReverseFrom(f.index); this.r.fx.burst(p.x, p.y - 20, 'sparkle', 10, 'goronya'); r.bubbles.say(p.x, p.y - 52, 'ガサゴソ!?', 'goronya', 700); }
    } else if (!this.previewed.has(key)) {
      if (this.localSeq.length <= f.index) this.localSeq[f.index] = f.action;
      this.performAction(C, f.action);
      this.showComposeSlot(f.index, f.action, C);
    }
    if (this.seq.length > this.localSeq.length) this.localSeq = this.seq.slice();
    // ごろにゃー breaks a slot: the turn gets shorter
    if (f.capacity < this.slots) {
      for (let i = f.capacity; i < this.slots; i++) if (r.track.slots[i]?.state !== 'broken') { r.track.breakSlot(i); this.sfx.slotBreak(); }
    }
    if (this.s.isLocal(C)) {
      r.pad.setConfirm(this.seq.length >= 2);
      r.pad.setComboEnabled(!composeRejectReason(this.seq, this.slots, ACT.GORONYA));
    }
  }

  on_composeReject(f) {
    if (!this.s.isLocal(f.player)) return;
    this.sfx.reject();
    this.r.toast.say(REJECT_MSG[f.reason] || 'できないよ');
    if (f.action === ACT.GORONYA) this.r.pad.flash('nya', 'bad'), this.r.pad.flash('goro', 'bad');
    this.localSeq = this.seq.slice();
  }

  on_composeLock(f) {
    const r = this.r, C = this.composer;
    this.phase = 'locked';
    this.seq = f.seq.slice();
    this.revFrom = this.seq.indexOf(ACT.GORONYA);
    this.timer = null; r.timer.hide();
    r.pad.setMode('wait', '');
    const cap = capacityOf(this.seq, this.slots);
    for (let i = this.seq.length; i < this.slots; i++) if (r.track.slots[i]?.state !== 'broken') r.track.breakSlot(i);
    for (const i of f.pads) r.track.setSlot(i, { state: this.secretFor(C) ? 'secret' : 'shown', icon: this.seq[i], flags: ['pad-fill'], pop: true });
    if (f.pads.length) r.toast.say('時間ぎれ！ ノラ猫が かってに足した！');
    void cap;
    this.actor(C).setBase('think', this.now());
    if (this.secretFor(C)) { const p = this.pos(C); r.fx.burst(p.x, p.y - 20, 'dust', 10, 'goro'); r.bubbles.say(p.x, p.y - 44, 'できた！', 'small', 500); }
    r.track.setCursor(-1);
    this.sfx.lock();
    if (f.gift) {
      // the slot broken by ごろにゃー is handed to the opponent's next turn
      const from = r.track.slots[this.slots - f.gift]?.el.getBoundingClientRect();
      const to = this.plate(f.giftTo);
      if (from) r.giftFly.fly(from, to.el.getBoundingClientRect(), `+${f.gift}`);
      this.at(0.75, () => { to.setGift(f.gift); this.sfx.ui('ready'); });
      r.toast.say(`こわれた${f.gift}マスは ${this.isMe(f.giftTo) ? 'キミ' : this.name(f.giftTo)} の次の出題へ！`, 2000);
    }
    r.banner.say(f.reason === 'confirm' ? 'キメ！' : f.reason === 'timeout' ? 'タイムアップ！' : 'できあがり！', { style: 'info', ms: 500 });
  }

  on_showcase(f) {
    const r = this.r, C = this.composer, M = this.replayer;
    this.phase = 'showcase';
    this.seq = f.seq.slice();
    this.revFrom = f.reverseFrom;
    const beat = f.beatMs / 1000;
    this.bgm.setMode('showcase');
    r.pad.setMode('wait', this.s.isLocal(M) ? 'よーく見て おぼえて！' : '');
    for (let i = 0; i < this.seq.length; i++) r.track.setSlot(i, { state: 'hidden' });
    r.track.setReverseFrom(-1);
    r.track.setMode('showcase');
    this.actor(C).setBase('ready', this.now()); this.actor(M).setBase('watch', this.now());
    this.spot(C);
    r.banner.say('おてほん！', { sub: this.isMe(M) ? 'しっかり おぼえて！' : this.isMe(C) ? 'キミのネコが ひろう中' : `${this.name(M)}は よく見て！`, style: 'watch', ms: f.countIn * f.beatMs });
    const p = this.pos(C);
    for (let b = 0; b < f.countIn; b++) this.at(b * beat, () => { this.sfx.countIn(f.countIn - 1 - b); if (b === 0) r.bubbles.say(p.x, p.y - 44, 'いくよ〜', 'small', 400); });
    let cur = f.countIn;
    this.seq.forEach((a, i) => {
      this.at(cur * beat, () => {
        const rev = isReversedIndex(this.seq, i);
        this.performAction(C, a, { loud: 1.1, big: true });
        r.track.setSlot(i, { state: 'shown', icon: a, pop: true, flags: rev ? ['rev'] : [] });
        r.track.setCursor(i);
        this.r.fx.burst(p.x, p.y - 30, 'sparkle', 5, a);
        if (a === ACT.GORONYA) {
          r.cutin.play(this.breed(C), this.sideOf(C));
          r.track.setReverseFrom(i);
          this.S.reverse = true; this.bgm.setReverse(true);
          r.screenFx.setTint('rev');
          this.S.mood = 'ooh'; this.S.moodUntil = this.now() + 1.2;
          this.sfx.ooh(1);
        }
      });
      cur += beatsFor(a);
    });
    this.at(cur * beat, () => {
      // memorize! the answers flip face-down
      for (let i = 0; i < this.seq.length; i++) r.track.setSlot(i, { state: 'hidden', pop: true, flags: isReversedIndex(this.seq, i) ? ['rev'] : [] });
      r.track.setCursor(-1);
      this.S.reverse = false; this.bgm.setReverse(false); r.screenFx.setTint('');
      this.sfx.memorize();
      r.banner.say('おぼえた？', { sub: this.revFrom >= 0 ? `<em>ごろにゃーの あとは ぎゃく！</em>` : '', style: this.revFrom >= 0 ? 'rev' : 'mimic', ms: 900 });
    });
  }

  on_replayOpen(f) {
    const r = this.r, C = this.composer, M = this.replayer;
    this.phase = 'replay';
    this.replayIdx = 0; this.localReplayIdx = 0;
    this.revFrom = f.reverseFrom;
    this.timer = { t0: this.now(), dur: f.firstMs / 1000, step: f.stepMs / 1000 };
    r.timer.show();
    r.track.setMode('replay'); r.track.setCursor(0);
    r.track.setReverseFrom(this.revFrom);
    this.plate(C).setActive(false); this.plate(M).setActive(true);
    this.actor(M).setBase('ready', this.now()); this.actor(C).setBase('watch', this.now());
    this.spot(M);
    if (this.s.isLocal(M)) {
      r.pad.setMode('replay', 'まねして入力！');
      r.pad.setComboEnabled(true);
      r.banner.say('まねして！', { sub: this.revFrom >= 0 ? `${iconImg('goronya', 'mini')} のあとは <em>にゃー⇄ごろ</em> ぎゃく！` : '同じ順番で入力！', style: 'mimic', ms: 1100 });
      this.sfx.yourTurn();
    } else {
      r.pad.setMode('wait', `${this.name(M)} がまね中…`);
      r.banner.say(`${this.name(M)} のまね！`, { sub: 'ドキドキ…', style: 'mimic', ms: 900 });
    }
    r.revChip.set(this.revFrom >= 0, { live: false });
    this.bgm.setMode('replay');
    this.S.mood = 'tense'; this.S.moodUntil = this.now() + 99;
  }

  on_replayInput(f) {
    const r = this.r, M = this.replayer;
    const key = `${this.turn}:r:${f.index}`;
    if (!this.previewed.has(key)) this.performAction(M, f.action);
    this.localReplayIdx = Math.max(this.localReplayIdx, f.index + 1);
    const rev = isReversedIndex(this.seq, f.index);
    if (f.ok) {
      this.replayIdx = f.index + 1;
      r.track.setSlot(f.index, { state: 'ok', icon: f.action, pop: true, flags: rev ? ['rev'] : [], subIcon: rev ? this.seq[f.index] : null, sub: rev ? '⇄' : '' });
      r.track.setCursor(this.replayIdx < this.seq.length ? this.replayIdx : -1);
      this.sfx.okStep(f.index, rev);
      if (this.s.isLocal(M)) r.pad.flash(f.action === ACT.GORONYA ? 'nya' : f.action, 'ok');
      if (this.timer) { this.timer.t0 = this.now(); this.timer.dur = this.timer.step; }
      if (f.action === ACT.GORONYA && this.revFrom === f.index && this.replayIdx < this.seq.length) this.enterReverseLive();
      if (this.hype >= 2 && Math.random() < 0.5) this.sfx.crowdMeow(this.hype);
    } else {
      r.track.setSlot(f.index, { state: 'bad', icon: f.expected, pop: true, subIcon: f.action, sub: '✕' });
      if (this.s.isLocal(M)) r.pad.flash(f.action === ACT.GORONYA ? 'nya' : f.action, 'bad');
    }
  }

  enterReverseLive() {
    const r = this.r, M = this.replayer;
    this.S.reverse = true; this.bgm.setReverse(true);
    r.screenFx.setReverse(true); r.screenFx.setTint('rev'); r.screenFx.flash('#ff3ea5', 200);
    r.revChip.set(true, { live: true });
    if (this.s.isLocal(M)) r.pad.setReverse(true);
    this.sfx.reverseOn();
    r.banner.say('ぎゃくモード！', { sub: `${iconImg('nya', 'mini')}→${iconImg('goro', 'mini')}　${iconImg('goro', 'mini')}→${iconImg('nya', 'mini')}`, style: 'rev', ms: 700 });
  }

  on_replayTimeout(f) {
    this.r.track.setSlot(f.index, { state: 'bad', icon: f.expected, pop: true, sub: 'じかんぎれ' });
  }

  on_judge(f) {
    const r = this.r, C = f.composer, M = f.replayer, t = this.now();
    this.phase = 'judge';
    this.timer = null; r.timer.hide();
    r.banner.clear();
    r.pad.setMode('wait', ''); r.pad.setReverse(false);
    r.revChip.set(false); r.screenFx.setReverse(false); r.screenFx.setTint('');
    this.S.reverse = false; this.bgm.setReverse(false);
    this.bgm.setMode('calm');
    const special = f.seq.includes(ACT.GORONYA);
    if (f.ok) {
      r.track.flash('ok');
      r.successFx.play(special ? 'ぎゃくも ばっちり！' : 'ばっちり！', `${this.name(M)} クリア！ ${f.seq.length}コンボ`);
      this.actor(M).setBase('happy', t); this.actor(C).play('shock', t); this.actor(C).setBase('idle', t);
      const p = this.pos(M);
      r.fx.burst(p.x, p.y - 30, 'confetti', 26, 'party'); r.fx.burst(p.x, p.y - 30, 'sparkle', 14, 'ok');
      this.S.mood = 'cheer'; this.S.moodUntil = t + 1.8;
      this.sfx.success(this.hype, special);
      this.at(1.6, () => this.actor(M).setBase('idle', this.now()));
    } else {
      // reveal the answer
      for (let i = 0; i < f.seq.length; i++) {
        const st = r.track.slots[i]?.state;
        if (i > f.missIndex || (st !== 'ok' && st !== 'bad')) r.track.setSlot(i, { state: i === f.missIndex ? 'bad' : 'reveal', icon: expectedAt(f.seq, i), flags: isReversedIndex(f.seq, i) ? ['rev'] : [] });
      }
      if (f.missIndex !== undefined) r.track.setSlot(f.missIndex, { state: 'bad', icon: f.expected, subIcon: f.got || null, sub: f.got ? '✕' : 'じかんぎれ' });
      const wasRev = isReversedIndex(f.seq, f.missIndex);
      r.missFx.play(f.timeout ? 'じかんぎれ…' : 'ミス…', `正解は ${iconImg(f.expected)}${wasRev ? '（ぎゃく！）' : ''}`);
      this.actor(M).play('flinch', t); this.actor(M).setBase('sad', t);
      this.actor(M).emote = { kind: 'cloud', until: t + 2.6 };
      this.actor(C).setBase('happy', t);
      this.at(1.4, () => this.actor(C).setBase('idle', this.now()));
      r.screenFx.shake(1.2); r.screenFx.flash('#ff3e6c', 220);
      this.S.mood = 'ooh'; this.S.moodUntil = t + 1.6;
      this.sfx.miss(this.hype);
      // the fish gets stolen
      const lostIdx = f.lives[M];
      this.at(0.55, () => {
        const pl = this.plate(M);
        const from = this.domToWorld(pl.fishRect(lostIdx));
        pl.loseFish(lostIdx);
        const p = this.pos(M);
        r.fx.fishSteal(from.x, from.y, p.x + this.sideOf(M) * 26, p.y + 6, this.sideOf(M));
        this.sfx.fishLost();
        this.at(1.1, () => this.sfx.munch());
      });
      this.lives = [...f.lives];
      this.at(1.2, () => {
        [0, 1].forEach((s) => this.plate(s).setDanger(f.lives[s] === 1));
        const localDanger = this.s.localSlots.some((s) => f.lives[s] === 1);
        r.screenFx.setDanger(localDanger);
        this.plate(M).setExpr(f.lives[M] <= 1 ? { eyes: 'tear', mouth: 'wavy', ears: 'flat' } : {});
      });
    }
    this.lives = [...f.lives];
    this.at(1.3, () => this.setHype(f.hype));
  }

  on_matchEnd(f) {
    const r = this.r, t = this.now();
    this.phase = 'end';
    const W = f.winner, Lz = 1 - W;
    r.pad.setMode('off'); r.timer.hide(); r.revChip.set(false); r.screenFx.setDanger(false);
    r.roleTags.set(-1, null); r.roleTags.set(1, null);
    this.plate(W).setActive(true); this.plate(Lz).setActive(false);
    this.plate(W).setExpr({ eyes: 'star', mouth: 'grin' });
    this.actor(W).setBase('win', t); this.actor(W).crown = true;
    this.actor(Lz).setBase('lose', t); this.actor(Lz).emote = { kind: 'cloud', until: t + 99 };
    this.spot(W);
    const youWon = this.s.isLocal(W);
    r.resultTrans.play('しょうぶあり！', `${this.name(W)} の勝ち！`, youWon !== false);
    r.screenFx.flash('#ffffff', 400);
    this.S.mood = 'cheer'; this.S.moodUntil = t + 4;
    this.setHype(4, true);
    r.fx.confettiRate = 3;
    this.bgm.setMode('result');
    if (youWon === false) this.sfx.lose(); else this.sfx.win();
    this.result = f;
    this.at(2.4, () => this.onResultReady && this.onResultReady(f));
  }

  // ---------------------------------------------------------------- misc
  setHype(h, silent = false) {
    const up = h > this.hype;
    this.hype = h;
    this.S.hype = h;
    this.r.hype.set(h);
    this.bgm.setHype(h);
    this.r.fx.confettiRate = h >= 4 ? 0.8 : 0;
    if (up && !silent) {
      this.r.hypeFx.play(h, HYPE_NAMES[h]);
      this.sfx.cheer(h);
      this.S.mood = 'cheer'; this.S.moodUntil = this.now() + 1.2;
      this.sfx.neonBuzz();
    }
  }
  spot(slot) { this.spotSide = this.sideOf(slot); }
  domToWorld(rect) {
    const s = this.r.worldWrap.el.getBoundingClientRect(); // the 320x180 world band
    return { x: (rect.x + rect.width / 2 - s.x) / s.width * 320, y: (rect.y + rect.height / 2 - s.y) / s.height * 180 };
  }

  update(t) {
    // timeline
    if (this.timeline.length) {
      const due = this.timeline.filter((e) => e.at <= t);
      if (due.length) { this.timeline = this.timeline.filter((e) => e.at > t); due.forEach((e) => e.fn()); }
    }
    // timer bar
    if (this.timer) {
      const left = this.timer.dur - (t - this.timer.t0);
      const frac = left / this.timer.dur;
      const urgent = left < 1.6;
      this.r.timer.set(frac, urgent);
      const act = this.activeLocalSlot();
      if (urgent && act !== null && left > 0 && t - this.lastTick > 0.4) {
        this.lastTick = t; this.sfx.timerTick(true);
        this.actor(act).emote = { kind: 'sweat', until: t + 0.5 };
        if (this.phase === 'replay') this.actor(act).setBase('nervous', t);
      }
    }
    // spotlights
    for (const a of [this.r.catL, this.r.catR]) {
      const side = a === this.r.catL ? -1 : 1;
      const target = this.phase !== 'none' && this.spotSide === side ? 1 : 0;
      a.spot += (target - a.spot) * 0.1;
      a.reverse = this.S.reverse;
    }
    this.S.focus = this.phase === 'replay' ? this.spotSide : this.phase === 'showcase' || this.phase === 'compose' ? this.spotSide : 0;
    // ambient crowd voices
    if (this.phase !== 'replay' && this.phase !== 'none' && Math.random() < (0.06 + this.hype * 0.08) / 60) this.sfx.crowdMeow(this.hype);
  }

  /** clear per-match visuals when leaving the match screen */
  teardown() {
    const r = this.r;
    this.reset();
    r.track.hide(); r.timer.hide(); r.round.hide(); r.hype.hide(); r.pad.setMode('off'); r.revChip.set(false);
    r.plateL.hide(); r.plateR.hide(); r.roleTags.set(-1, null); r.roleTags.set(1, null);
    r.screenFx.setReverse(false); r.screenFx.setDanger(false); r.screenFx.setTint('');
    r.fx.confettiRate = 0;
    r.catL.crown = r.catR.crown = false; r.catL.emote = r.catR.emote = null;
    this.S.reverse = false;
    this.spotSide = 0;
    r.vs.cancel(); r.resultTrans.cancel();
    r.bubbles.clear(); r.banner.clear();
  }
}

export { fishIcon };
