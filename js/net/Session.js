// Session: who is in the room, lobby state, and match fact relay.
// Host-authoritative: the room host runs MatchLogic; the guest sends inputs
// and receives facts. CPU & same-device modes are "host with no wire".
import { MatchLogic } from '../logic/MatchLogic.js';
import { CpuBrain } from '../logic/CpuBrain.js';
import { PLAYER_CATS } from '../art/catArt.js';

const PROTO = 1;
const noop = () => {};

export class Session {
  /**
   * @param {'host'|'guest'|'cpu'} mode   (cpu = practice or story; opts.opponent overrides the CPU cat)
   */
  constructor(mode, transport, me, opts = {}) {
    this.opts = opts;
    this.mode = mode;
    this.t = transport;
    this.isHost = mode !== 'guest';
    this.code = null;
    this.players = [
      { name: me.name, cat: me.cat, ready: false, present: true },
      { name: '', cat: null, ready: false, present: false },
    ];
    if (mode === 'guest') this.players = [{ name: '', cat: null, ready: false, present: false }, { name: me.name, cat: me.cat, ready: false, present: true }];
    if (mode === 'cpu') {
      const op = opts.opponent || {};
      this.players[1] = { name: op.name || 'ノラ猫', cat: op.cat || pickOther(me.cat), ready: true, present: true, cpu: true };
    }
    this.localSlots = mode === 'guest' ? [1] : [0];
    this.votes = [false, false];
    this.lastFirst = Math.random() < 0.5 ? 1 : 0;
    this.inMatch = false;
    this.lastSeen = performance.now();
    // callbacks for the Mediator
    this.onLobby = noop; this.onStart = noop; this.onFact = noop; this.onPeerLeft = noop; this.onRematch = noop; this.onToLobby = noop;
    if (this.t) this.wire();
  }

  get net() { return this.mode === 'host' || this.mode === 'guest'; }
  isLocal(slot) { return this.localSlots.includes(slot); }

  wire() {
    this.t.onData = (m) => { this.lastSeen = performance.now(); this.recv(m); };
    this.t.onPeer = (state, reason) => {
      if (state === 'joined') { this.lastSeen = performance.now(); return; } // wait for hello
      if (state === 'left') this.peerGone(reason || 'left');
    };
    this.t.onClose = (why) => this.peerGone(why === 'server' ? 'server' : 'left');
    this.hb = setInterval(() => {
      if (!this.net) return;
      this.send({ t: 'ping', at: Date.now() });
      const other = this.isHost ? this.players[1] : this.players[0];
      if (other.present && performance.now() - this.lastSeen > 7000) this.peerGone('timeout');
    }, 1500);
  }

  send(m) { if (this.t) this.t.send(m); }

  peerGone(reason) {
    const other = this.isHost ? 1 : 0;
    if (!this.players[other].present && reason !== 'server') return;
    this.players[other] = { ...this.players[other], present: false, ready: false };
    this.stopMatch();
    this.onPeerLeft(reason);
    if (this.isHost) this.pushLobby();
  }

  // ---------------------------------------------------------------- lobby
  hello() { if (this.mode === 'guest') this.send({ t: 'hello', v: PROTO, name: this.players[1].name, cat: this.players[1].cat }); }

  recv(m) {
    switch (m.t) {
      case 'ping': this.send({ t: 'pong', at: m.at }); break;
      case 'pong': break;
      case 'hello':
        if (!this.isHost) break;
        this.players[1] = { name: m.name || 'ノラ', cat: m.cat || pickOther(this.players[0].cat), ready: false, present: true };
        this.pushLobby(true);
        break;
      case 'profile':
        if (this.isHost) { Object.assign(this.players[1], { name: m.name, cat: m.cat }); this.pushLobby(); }
        break;
      case 'ready':
        if (this.isHost) { this.players[1].ready = !!m.on; this.pushLobby(); }
        break;
      case 'lobby':
        if (!this.isHost) {
          const mine = this.players[1];
          this.players = m.players.map((p) => ({ ...p }));
          this.players[1] = { ...this.players[1], name: mine.name, cat: this.players[1].cat || mine.cat };
          this.onLobby({ joined: m.joined });
        }
        break;
      case 'start':
        if (!this.isHost) { this.inMatch = true; this.votes = [false, false]; this.onStart({ first: m.first }); }
        break;
      case 'fact':
        if (!this.isHost) this.onFact(m.f);
        break;
      case 'in':
        if (this.isHost && this.logic) this.logic.input(1, m.a, performance.now());
        break;
      case 'rematch':
        if (this.isHost) { this.votes[1] = !!m.on; this.checkRematch(); }
        else { this.votes = m.votes; this.onRematch(this.votes); }
        break;
      case 'toLobby':
        if (!this.isHost) { this.stopMatch(); this.onToLobby(); }
        break;
      case 'bye':
        this.peerGone('left');
        break;
    }
  }

  pushLobby(joined = false) {
    if (!this.isHost) return;
    if (this.net) this.send({ t: 'lobby', players: this.players, joined });
    this.onLobby({ joined });
  }

  setProfile(slot, { name, cat }) {
    const p = this.players[slot];
    if (name !== undefined) p.name = name;
    if (cat !== undefined) p.cat = cat;
    if (this.isHost) this.pushLobby();
    else { this.send({ t: 'profile', name: p.name, cat: p.cat }); this.onLobby({}); }
  }
  setReady(slot, on) {
    this.players[slot].ready = on;
    if (this.isHost) this.pushLobby();
    else { this.send({ t: 'ready', on }); this.onLobby({}); }
  }
  canStart() { return this.isHost && this.players.every((p) => p.present && p.ready); }

  // ---------------------------------------------------------------- match
  startMatch() {
    if (!this.isHost) return;
    this.stopMatch();
    const first = (this.lastFirst + 1) % 2;
    this.lastFirst = first;
    this.votes = [false, false];
    this.inMatch = true;
    const op = this.opts.opponent || {};
    this.logic = new MatchLogic({ first, lives: [2, op.lives ?? 2] });
    this.logic.onFact = (f) => {
      if (this.net) this.send({ t: 'fact', f });
      if (this.bot) this.bot.onFact(f);
      this.onFact(f);
      if (f.type === 'matchEnd') { this.inMatch = false; if (this.mode === 'cpu') setTimeout(() => { this.votes[1] = true; this.onRematch(this.votes); }, 1800 + Math.random() * 1500); }
    };
    if (this.mode === 'cpu') this.bot = new CpuBrain(1, (a) => this.logic && this.logic.input(1, a, performance.now()), { slip: op.slip ?? 0.05, goronya: op.goronya ?? 0.55, maxLen: op.maxLen ?? 99 });
    if (this.net) this.send({ t: 'start', first });
    this.onStart({ first });
    this.logic.start(performance.now());
    this.tick = setInterval(() => this.logic && this.logic.update(performance.now()), 30);
  }
  stopMatch() {
    clearInterval(this.tick); this.tick = null;
    if (this.bot) this.bot.clear();
    this.bot = null; this.logic = null;
    this.inMatch = false;
  }

  /** a local player pressed something that should reach the game */
  submit(slot, action) {
    if (this.isHost) { if (this.logic) this.logic.input(slot, action, performance.now()); }
    else this.send({ t: 'in', a: action });
  }

  voteRematch(slot, on = true) {
    this.votes[slot] = on;
    if (this.isHost) this.checkRematch();
    else { this.send({ t: 'rematch', on }); this.onRematch(this.votes); }
  }
  checkRematch() {
    if (this.net) this.send({ t: 'rematch', votes: this.votes });
    this.onRematch(this.votes);
    if (this.votes[0] && this.votes[1]) setTimeout(() => this.startMatch(), 600);
  }
  backToLobby() {
    this.stopMatch();
    this.players.forEach((p, i) => { if (!p.cpu) p.ready = false; });
    if (this.net && this.isHost) this.send({ t: 'toLobby' });
    this.pushLobby();
  }

  leave() {
    this.stopMatch();
    clearInterval(this.hb);
    if (this.t) { this.send({ t: 'bye' }); setTimeout(() => this.t.leave(), 60); }
    this.onLobby = this.onStart = this.onFact = this.onPeerLeft = this.onRematch = this.onToLobby = noop;
  }
}

export function pickOther(cat) {
  const opts = PLAYER_CATS.filter((c) => c !== cat);
  return opts[Math.floor(Math.random() * opts.length)];
}
