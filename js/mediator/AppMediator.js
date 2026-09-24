// AppMediator — the screen-flow state machine.
//
//  boot → intro → title ─┬─ creating → waiting ─┐
//                        ├─ joining  → waiting ─┤
//                        ├─ (cpu / local) waiting┤
//                        └─ howto               │
//                     waiting → match → result → (rematch → match | title)
//                     any online state → disconnected
//
// All view events arrive here via GameRoot's sink (Chain of Responsibility).
// Raw input arrives from RawInput; game inputs from InputInterpreter.
// Network/session events arrive from Session. The Mediator decides what is
// accepted, what is locked, and which state comes next.
import { MatchPresenter } from './MatchPresenter.js';
import { Session, pickOther } from '../net/Session.js';
import { pickTransport } from '../net/transports.js';
import { PLAYER_CATS, BREEDS } from '../art/catArt.js';

const store = {
  get(k, d) { try { return localStorage.getItem('nyagoro.' + k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('nyagoro.' + k, v); } catch { /* private mode */ } },
};

const ERR = {
  'not-found': 'その部屋IDは見つからないみたい…', full: 'その部屋は もう満員だよ', timeout: 'つながらなかった… もう一度ためしてね',
  connect: 'サーバーにつながらなかった…', notransport: 'オンライン接続が使えない環境みたい', server: 'サーバーとの接続が切れちゃった',
};

export class AppMediator {
  constructor({ root, audio, sfx, bgm, raw, interp }) {
    this.root = root; this.audio = audio; this.sfx = sfx; this.bgm = bgm; this.raw = raw; this.interp = interp;
    this.presenter = new MatchPresenter(root, audio, sfx, bgm);
    this.state = 'boot';
    this.session = null;
    this.me = { name: store.get('name', 'ノラ' + (100 + Math.floor(Math.random() * 900))), cat: store.get('cat', PLAYER_CATS[Math.floor(Math.random() * PLAYER_CATS.length)]) };
    if (!PLAYER_CATS.includes(this.me.cat)) this.me.cat = 'tama';
    this.muted = store.get('muted', '0') === '1';
    this.inviteCode = (new URLSearchParams(location.search).get('room') || '').toUpperCase().slice(0, 4);

    root.sink = (ev) => this.dispatch(ev);
    raw.onRaw = (key, down, src) => this.onRaw(key, down, src);
    interp.onGame = (a) => this.onGameInput(a);
  }

  // ================================================================ lifecycle
  boot() {
    const r = this.root;
    r.title.setName(this.me.name);
    r.title.setMuted(this.muted);
    if (window.NYAGORO_OFFLINE) { r.title.setOnline(false); this.inviteCode = ''; }
    [r.plateL, r.plateR, r.track, r.round, r.hype].forEach((v) => v.hide());
    r.catL.setBreed(this.me.cat); r.catR.setBreed(pickOther(this.me.cat));
    r.catL.alpha = r.catR.alpha = 0;
    r.scene.hype = 0; r.scene.hypeShown = 0;
    this.state = 'intro';
    r.intro.idle(performance.now() / 1000);
  }

  go(state) {
    const r = this.root;
    const prev = this.state;
    this.state = state;
    const panels = { title: r.title, creating: r.createPanel, joining: r.joinPanel, waiting: r.waitPanel, result: r.resultPanel, howto: r.howto, disconnected: r.discPanel };
    for (const [k, p] of Object.entries(panels)) { if (k === state) p.open(); else p.close(); }
    if (state !== 'match' && state !== 'result' && state !== 'disconnected' && this.presenter.phase !== 'none') this.presenter.teardown();
    void prev;
    // stage cats + mood per screen
    const S = r.scene;
    if (state === 'title' || state === 'howto') {
      this.stageCats(this.me.cat, r.catR.breed, 'groove', 'groove');
      S.hype = 1; this.bgm.setHype(1); this.bgm.setMode('title');
      r.hype.hide();
    }
    if (state === 'waiting') { this.bgm.setHype(1); this.bgm.setMode('lobby'); S.hype = 1; this.refreshWaiting(); }
    if (state === 'creating' || state === 'joining') S.hype = 0.5;
    if (state === 'match') { r.hype.show(); }
  }

  stageCats(lb, rb, lState, rState) {
    const r = this.root, t = performance.now() / 1000;
    if (lb) { r.catL.setBreed(lb); r.catL.setBase(lState, t); r.catL.alpha = 1; } else r.catL.alpha = 0;
    if (rb) { r.catR.setBreed(rb); r.catR.setBase(rState, t); r.catR.alpha = 1; } else r.catR.alpha = 0;
  }

  // ================================================================ view events (CoR sink)
  dispatch(ev) {
    const { type, detail } = ev;
    if (type === 'ui:hover') { this.sfx.ui('hover'); return; }
    if (type === 'intro:reveal') return this.onIntroReveal();
    if (type === 'intro:done') { if (this.state === 'intro') this.afterIntro(); return; }
    if (type === 'pad:down' || type === 'pad:up') { this.audio.unlock(); this.raw.pad(detail.key, type === 'pad:down'); return; }
    if (type === 'ui:name') { this.me.name = detail.name.trim() || 'ノラ'; store.set('name', this.me.name); return; }
    if (type === 'ui:type') { this.sfx.ui('type'); return; }
    if (type === 'ui:cat') return this.onCatPick(detail.slot, detail.dir);
    if (type !== 'ui:click') return;
    this.audio.unlock();
    const id = detail.id;
    switch (this.state) {
      case 'title':
        if (id === 'create') { this.sfx.ui('ok'); this.createRoom(); }
        if (id === 'join') { this.sfx.ui('ok'); this.openJoin(''); }
        if (id === 'cpu') { this.sfx.ui('ok'); this.startOffline('cpu'); }
        if (id === 'local') { this.sfx.ui('ok'); this.startOffline('local'); }
        if (id === 'howto') { this.sfx.ui('ok'); this.go('howto'); }
        if (id === 'mute') this.toggleMute();
        break;
      case 'howto':
        if (id === 'close') { this.sfx.ui('back'); this.go('title'); }
        break;
      case 'creating':
        if (id === 'back') { this.sfx.ui('back'); this.leaveSession(); this.go('title'); }
        break;
      case 'joining':
        if (id === 'back') { this.sfx.ui('back'); this.leaveSession(); this.go('title'); }
        if (id === 'go') this.joinRoom(detail.code);
        break;
      case 'waiting':
        if (id === 'leave') { this.sfx.ui('back'); this.leaveSession(); this.go('title'); }
        if (id === 'ready') { const s = this.session, me = s.localSlots[0]; s.setReady(me, !s.players[me].ready); this.sfx.ui('ready'); }
        if (id === 'start' && this.session.canStart()) { this.sfx.ui('ok'); this.session.startMatch(); }
        if (id === 'copy') this.copyInvite();
        break;
      case 'result':
        if (id === 'rematch') { this.sfx.ui('ok'); this.session.voteRematch(this.session.localSlots[0], !this.session.votes[this.session.localSlots[0]]); }
        if (id === 'leave') { this.sfx.ui('back'); this.leaveSession(); this.go('title'); }
        break;
      case 'disconnected':
        if (id === 'wait') { this.sfx.ui('ok'); this.go('waiting'); }
        if (id === 'title') { this.sfx.ui('back'); this.leaveSession(); this.go('title'); }
        break;
    }
  }

  // ================================================================ raw / game input
  onRaw(key, down, src) {
    const r = this.root;
    if (key === 'mute' && down) { this.toggleMute(); return; }
    if (this.state === 'intro') {
      if (down) { this.audio.unlock(); this.sfx.riser(2.2); r.intro.dive(performance.now() / 1000); }
      return;
    }
    if (key === 'escape' && down) {
      if (this.state === 'howto') { this.go('title'); this.sfx.ui('back'); }
      return;
    }
    if (key === 'nya' || key === 'goro' || key === 'confirm') {
      if (this.state === 'match') {
        const slot = this.presenter.activeLocalSlot();
        r.pad.setPressed(key, down && slot !== null);
        if (down && slot !== null) this.sfx.keyDown();
        if (slot !== null) this.interp.raw(key, down);
      } else if (this.state === 'waiting' && down && src === 'key' && key === 'confirm' && this.session?.canStart()) {
        this.session.startMatch();
      }
    }
  }

  onGameInput(action) {
    if (this.state !== 'match') return;
    const slot = this.presenter.activeLocalSlot();
    if (slot === null) return;
    if (action === 'confirm' && this.presenter.phase !== 'compose') return;
    this.presenter.preview(slot, action);
    this.session.submit(slot, action);
  }

  // ================================================================ intro
  onIntroReveal() {
    const r = this.root;
    r.zoomWorld(3.2, 1100);
    this.sfx.impact();
    this.bgm.start();
    this.bgm.setMode('title');
    this.stageCats(this.me.cat, r.catR.breed, 'groove', 'groove');
    r.scene.hype = 1;
    setTimeout(() => this.sfx.neonBuzz(), 300);
    setTimeout(() => { if (this.state === 'intro') this.afterIntro(); }, 450);
  }
  afterIntro() {
    if (this.state !== 'intro') return;
    this.go('title');
    this.sfx.logo();
    if (this.inviteCode) { const c = this.inviteCode; this.inviteCode = ''; this.openJoin(c); setTimeout(() => this.joinRoom(c), 300); }
  }

  toggleMute() {
    this.muted = !this.muted;
    store.set('muted', this.muted ? '1' : '0');
    this.audio.setMuted(this.muted);
    this.root.title.setMuted(this.muted);
    this.root.toast.say(this.muted ? 'サウンド OFF（Mで切替）' : 'サウンド ON');
  }

  // ================================================================ rooms
  async createRoom() {
    const r = this.root;
    this.go('creating');
    r.createPanel.setStatus('ひみつの路地裏を さがしています…');
    const t = await pickTransport();
    if (this.state !== 'creating') { t && t.leave(); return; }
    if (!t) { r.createPanel.setStatus(ERR.notransport, true); this.sfx.ui('error'); return; }
    try {
      const code = await t.create();
      if (this.state !== 'creating') { t.leave(); return; }
      this.attach(new Session('host', t, { ...this.me }));
      this.session.code = code;
      this.transportLabel = t.label;
      this.sfx.ui('join');
      this.go('waiting');
    } catch (e) {
      t.leave();
      r.createPanel.setStatus(ERR[e.message] || ERR.timeout, true); this.sfx.ui('error');
    }
  }

  openJoin(code) {
    const r = this.root;
    this.go('joining');
    r.joinPanel.setCode(code); r.joinPanel.setStatus(''); r.joinPanel.setBusy(false); r.joinPanel.focus();
  }

  async joinRoom(code) {
    const r = this.root;
    code = (code || '').toUpperCase().trim();
    if (code.length !== 4) { r.joinPanel.setStatus('部屋IDは 4文字だよ', true); this.sfx.ui('error'); return; }
    r.joinPanel.setBusy(true);
    r.joinPanel.setStatus('路地裏へ むかっています…');
    this.sfx.ui('ok');
    const t = await pickTransport();
    if (this.state !== 'joining') { t && t.leave(); return; }
    if (!t) { r.joinPanel.setStatus(ERR.notransport, true); r.joinPanel.setBusy(false); return; }
    try {
      await t.join(code);
      if (this.state !== 'joining') { t.leave(); return; }
      this.attach(new Session('guest', t, { ...this.me }));
      this.session.code = code;
      this.transportLabel = t.label;
      this.session.hello();
      this.sfx.ui('join');
      this.go('waiting');
    } catch (e) {
      t.leave();
      r.joinPanel.setStatus(ERR[e.message] || ERR.timeout, true); r.joinPanel.setBusy(false); this.sfx.ui('error');
    }
  }

  startOffline(mode) {
    this.attach(new Session(mode, null, { ...this.me }));
    this.session.players[0].ready = true;
    this.transportLabel = '';
    this.go('waiting');
  }

  attach(session) {
    this.leaveSession();
    this.session = session;
    const s = session;
    this.presenter.bind(s, (f) => this.showResult(f));
    s.onLobby = ({ joined }) => {
      if (joined) { this.sfx.ui('join'); this.root.toast.say(this.session.isHost ? `${s.players[1].name} が来た！` : '部屋に入ったよ！'); this.sfx.nya('cat_sweet_voice2', 1.1, 0.4); }
      if (this.state === 'waiting') this.refreshWaiting();
    };
    s.onStart = () => {
      this.interp.reset();
      this.go('match');
    };
    s.onFact = (f) => {
      if (this.state !== 'match' && f.type !== 'matchStart') return;
      if (f.type === 'matchStart' && this.state !== 'match') this.go('match');
      this.presenter.handle(f);
    };
    s.onRematch = (votes) => this.refreshRematch(votes);
    s.onToLobby = () => this.go('waiting');
    s.onPeerLeft = (reason) => this.peerLeft(reason);
  }

  leaveSession() {
    if (this.session) { this.session.leave(); this.session = null; }
    this.interp.reset();
  }

  peerLeft(reason) {
    const r = this.root, s = this.session;
    if (!s) return;
    if (reason === 'server') {
      r.discPanel.set(ERR.server, false);
      this.go('disconnected');
      return;
    }
    if (s.isHost) {
      if (this.state === 'waiting') { r.toast.say('相手のネコが 部屋を出ていった'); this.refreshWaiting(); return; }
      r.discPanel.set('相手のネコが どこかへ 行っちゃった…<br><small>部屋IDはそのまま。まっていれば また入れるよ</small>', true);
      this.go('disconnected');
    } else {
      r.discPanel.set(reason === 'host-left' ? 'ホストが 部屋をとじちゃった…' : '相手との接続が 切れちゃった…', false);
      this.go('disconnected');
    }
  }

  copyInvite() {
    const s = this.session;
    if (!s || !s.code) return;
    const url = `${location.origin}${location.pathname}?room=${s.code}`;
    const done = () => { this.root.toast.say('招待リンクをコピーしたよ！'); this.sfx.ui('ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => this.root.toast.say(url, 4000));
    else this.root.toast.say(url, 4000);
  }

  onCatPick(slot, dir) {
    const s = this.session;
    if (!s || this.state !== 'waiting' || !s.isLocal(slot)) return;
    const cur = PLAYER_CATS.indexOf(s.players[slot].cat);
    let next = PLAYER_CATS[(cur + dir + PLAYER_CATS.length) % PLAYER_CATS.length];
    const other = s.players[1 - slot];
    if (other.present && other.cat === next && s.mode !== 'guest' && s.mode !== 'host') next = PLAYER_CATS[(PLAYER_CATS.indexOf(next) + dir + PLAYER_CATS.length) % PLAYER_CATS.length];
    s.setProfile(slot, { cat: next });
    if (slot === s.localSlots[0]) { this.me.cat = next; store.set('cat', next); }
    this.sfx.ui('tick');
    const b = next;
    this.sfx.nya(BREEDS[b].voice, BREEDS[b].pitch, slot ? 0.4 : -0.4, 0.7);
    this.refreshWaiting();
  }

  refreshWaiting() {
    const s = this.session, r = this.root, w = r.waitPanel;
    if (!s) return;
    const online = s.net;
    w.setRoom(online ? s.code : '', online ? this.transportLabel : s.mode === 'cpu' ? 'CPU練習モード' : '1台でふたりモード（交代で入力）');
    const leftSlot = s.mode === 'guest' ? 1 : 0;
    [leftSlot, 1 - leftSlot].forEach((slot, i) => {
      const p = s.players[slot];
      w.setCard(i, {
        present: p.present, name: p.name, breed: p.cat, ready: p.ready, you: s.isLocal(slot) && s.mode !== 'local',
        editable: s.isLocal(slot), host: online && slot === 0,
        label: s.mode === 'local' ? (slot === 0 ? 'P1' : 'P2') : s.isLocal(slot) ? 'YOU' : p.cpu ? 'CPU' : '',
      });
      w.cards[i].slot = slot; // cards report session slots
    });
    const me = s.localSlots[0];
    const other = s.players[1 - me];
    if (online) {
      w.setButtons({ ready: true, readyOn: s.players[me].ready, start: s.isHost, startEnabled: s.canStart() });
      if (!other.present) w.setInfo('友だちに <b>部屋ID</b> か 招待リンクを 送ろう！');
      else if (!s.players.every((p) => p.ready)) w.setInfo('ふたりとも <b>じゅんびOK</b> で スタートできるよ');
      else w.setInfo(s.isHost ? '<b>はじめる！</b> を押してね' : 'ホストの スタートを まってるよ…');
    } else {
      w.setButtons({ ready: false, start: true, startEnabled: true });
      w.setInfo(s.mode === 'cpu' ? '◀ ▶ で相棒ネコをえらんで <b>はじめる！</b>' : 'P1：左キー（F / J）… ふたりとも同じボタンを交代で使うよ');
    }
    // stage cats reflect the lobby
    this.stageCats(s.players[leftSlot].present ? s.players[leftSlot].cat : null, s.players[1 - leftSlot].present ? s.players[1 - leftSlot].cat : null,
      s.players[leftSlot].ready ? 'cheer' : 'idle', s.players[1 - leftSlot].ready ? 'cheer' : 'idle');
  }

  // ================================================================ result / rematch
  showResult(f) {
    const s = this.session, r = this.root;
    if (!s || this.state !== 'match') return;
    const hot = s.mode === 'local';
    const leftSlot = s.mode === 'guest' ? 1 : 0;
    const youWon = hot ? null : s.isLocal(f.winner);
    const order = [leftSlot, 1 - leftSlot];
    const st = f.stats;
    r.resultPanel.set({
      youWon,
      title: youWon === null ? `${s.players[f.winner].name} の勝ち！` : youWon ? 'YOU WIN!' : 'YOU LOSE…',
      sub: youWon === null ? '路地裏の新チャンピオン！' : youWon ? '路地裏のチャンピオン！ 魚はキミのもの' : 'くやしい… もう一回いこう！',
      players: order.map((slot) => ({ name: s.players[slot].name, breed: s.players[slot].cat, win: slot === f.winner, lives: f.lives[slot], max: 2 })),
      rows: [
        ['まね成功', st[order[0]].clears, st[order[1]].clears],
        ['最長クリア', st[order[0]].longest ? st[order[0]].longest + 'マス' : '-', st[order[1]].longest ? st[order[1]].longest + 'マス' : '-'],
        ['ごろにゃー出題', st[order[0]].goronya, st[order[1]].goronya],
        ['相手をミスさせた', st[order[0]].stumped, st[order[1]].stumped],
      ],
      local: !s.net,
    });
    r.resultPanel.setLeaveLabel(s.net ? '部屋を出る' : 'タイトルへ');
    this.go('result');
    this.refreshRematch(s.votes);
  }

  refreshRematch(votes) {
    const s = this.session;
    if (!s || this.state !== 'result') return;
    const me = s.localSlots[0], other = 1 - me;
    let text = '';
    if (s.mode === 'local') text = '';
    else if (votes[me] && votes[other]) text = '<b>ふたりとも もう一回！</b> スタート！';
    else if (votes[other]) text = `<b>${s.players[other].name} は もう一回やる気まんまん！</b>`;
    else if (votes[me]) text = `${s.players[other].name} の返事をまってるよ…`;
    else text = s.mode === 'cpu' ? '師匠ネコは まだ やる気みたい' : 'もう一回？';
    this.root.resultPanel.setRematch(text, votes[me] && s.mode !== 'local');
  }

  // ================================================================ frame
  update(t, dt) {
    const r = this.root, S = r.scene;
    // eased scene params
    S.hypeShown += (S.hype - S.hypeShown) * Math.min(1, dt * 1.6);
    if (Math.abs(S.hype - S.hypeShown) < 0.01) S.hypeShown = S.hype;
    S.reverseK += ((S.reverse ? 1 : 0) - S.reverseK) * Math.min(1, dt * 10);
    const bi = this.bgm.playing ? this.bgm.beatInfo() : { phase: (t * 1.6) % 1, n: Math.floor(t * 1.6), bar: 0 };
    S.beat = bi;
    r.catL.setBeat(bi); r.catR.setBeat(bi);
    r.beatPulse.set(bi.phase, this.state === 'match' ? 0.15 + S.hypeShown * 0.12 : 0.08, S.reverse);
    this.presenter.update(t);
  }
}
