// Modal panels. Buttons only *report* clicks; panels annotate the event with
// their context (typed code, selected cat...) and let it bubble to the Mediator.
import { View, h } from '../../core/View.js';
import { bigCat, BREEDS, PLAYER_CATS } from '../../art/catArt.js';
import { actionIcon, fishIcon, swapIcon, toURL } from '../../art/icons.js';

const img = (cv, cls = '') => h('img', { src: toURL(cv), class: 'px ' + cls, draggable: false, alt: '' });

export class ButtonView extends View {
  constructor(id, label, variant = '') {
    super('Button:' + id, { tag: 'button', className: 'btn ' + variant });
    this.id = id;
    this.el.type = 'button';
    this.el.innerHTML = label;
    this.el.addEventListener('click', () => { if (!this.el.disabled) this.emit('ui:click', { id }); });
    this.el.addEventListener('pointerenter', () => this.emit('ui:hover', { id }));
  }
  setLabel(l) { this.el.innerHTML = l; }
  setEnabled(on) { this.el.disabled = !on; }
}

export class Panel extends View {
  constructor(name, cls = '') { super(name, { className: 'panel is-hidden ' + cls }); this.card = h('div', { class: 'panel-card' }); this.el.append(this.card); }
  button(id, label, variant, mount) { const b = new ButtonView(id, label, variant); this.add(b, mount || this.card); return b; }
  open() { this.show(); this.el.classList.remove('closing'); void this.el.offsetWidth; this.el.classList.add('opening'); }
  close() { if (!this.visible) return; this.el.classList.add('closing'); clearTimeout(this.ct); this.ct = setTimeout(() => this.hide(), 180); }
  handle(ev) { ev.detail.panel = ev.detail.panel || this.name; return false; }
}

// ------------------------------------------------------------------ title
export class TitleMenu extends Panel {
  constructor() {
    super('TitleMenu', 'title-panel');
    this.logo = h('div', { class: 'logo' },
      h('div', { class: 'logo-sub' }, 'NEON ALLEY MIMIC BATTLE'),
      h('div', { class: 'logo-main' }, h('span', { class: 'l1' }, 'にゃ'), h('span', { class: 'l2' }, 'ご'), h('span', { class: 'l3' }, 'ろ'), h('span', { class: 'l4' }, '！')),
      h('div', { class: 'logo-tag' }, '路地裏まねっこバトル'));
    this.card.append(this.logo);
    this.nameIn = h('input', { class: 'name-in', maxLength: 8, placeholder: 'なまえ', spellcheck: false, autocomplete: 'off' });
    this.nameIn.addEventListener('input', () => this.emit('ui:name', { name: this.nameIn.value }));
    this.card.append(h('label', { class: 'name-row' }, h('span', {}, 'きみの なまえ'), this.nameIn));
    const grid = h('div', { class: 'menu-grid' });
    this.card.append(grid);
    this.createBtn = this.button('create', '<b>部屋をつくる</b><small>友だちを招待</small>', 'big pink', grid);
    this.joinBtn = this.button('join', '<b>部屋に入る</b><small>部屋IDで参加</small>', 'big cyan', grid);
    this.button('cpu', '<b>CPUと練習</b><small>師匠ネコと1本勝負</small>', 'mid', grid);
    this.button('local', '<b>1台でふたり</b><small>交代で遊ぶ</small>', 'mid', grid);
    const foot = h('div', { class: 'menu-foot' });
    this.card.append(foot);
    this.button('howto', 'あそびかた', 'small', foot);
    this.muteBtn = this.button('mute', '♪ ON', 'small', foot);
  }
  setName(n) { this.nameIn.value = n; }
  setOnline(on) {
    if (on) return;
    this.createBtn.setLabel('<b>部屋をつくる</b><small>サイト版で遊べます</small>'); this.createBtn.setEnabled(false);
    this.joinBtn.setLabel('<b>部屋に入る</b><small>サイト版で遊べます</small>'); this.joinBtn.setEnabled(false);
  }
  setMuted(m) { this.muteBtn.setLabel(m ? '♪ OFF' : '♪ ON'); }
}

// ------------------------------------------------------------------ create / connecting
export class RoomCreatePanel extends Panel {
  constructor() {
    super('RoomCreatePanel', 'small-panel');
    this.msg = h('div', { class: 'conn-msg' });
    this.runner = h('div', { class: 'runner' });
    this.card.append(h('div', { class: 'panel-title' }, '部屋をつくる'), this.runner, this.msg);
    this.button('back', 'もどる', 'small');
    this.frames = [0, 1, 2, 3].map((i) => toURL(bigCat('tama', { pose: 'ball', eyes: 'closed', rot: i })));
    this.runImg = h('img', { class: 'px run-cat', alt: '' });
    this.runner.append(this.runImg);
  }
  setStatus(text, error = false) { this.msg.textContent = text; this.msg.classList.toggle('err', error); }
  update(t) { if (this.visible) this.runImg.src = this.frames[Math.floor(t * 8) % 4]; }
}

// ------------------------------------------------------------------ join
export class RoomJoinPanel extends Panel {
  constructor() {
    super('RoomJoinPanel', 'small-panel');
    this.input = h('input', { class: 'code-in', maxLength: 4, placeholder: '----', spellcheck: false, autocomplete: 'off', autocapitalize: 'characters', inputMode: 'text' });
    this.input.addEventListener('input', () => {
      this.input.value = this.input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
      this.emit('ui:type', {});
    });
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.emit('ui:click', { id: 'go' }); });
    this.msg = h('div', { class: 'conn-msg' });
    this.card.append(h('div', { class: 'panel-title' }, '部屋に入る'), h('div', { class: 'hint' }, '友だちに教えてもらった 4文字の部屋ID'), this.input, this.msg);
    const row = h('div', { class: 'btn-row' }); this.card.append(row);
    this.button('back', 'もどる', 'small', row);
    this.goBtn = this.button('go', '入る！', 'cyan', row);
  }
  handle(ev) { ev.detail.panel = this.name; if (ev.type === 'ui:click' && ev.detail.id === 'go') ev.detail.code = this.input.value.trim(); return false; }
  setCode(c) { this.input.value = c || ''; }
  focus() { setTimeout(() => this.input.focus(), 50); }
  setStatus(text, error = false) { this.msg.textContent = text; this.msg.classList.toggle('err', error); }
  setBusy(b) { this.goBtn.setEnabled(!b); this.input.disabled = b; }
}

// ------------------------------------------------------------------ waiting room
class PlayerCard extends View {
  constructor(slot) {
    super('PlayerCard' + slot, { className: 'pcard' });
    this.slot = slot;   // session slot (set by the mediator)
    this.side = slot;   // visual side: 0 left, 1 right
    this.catImg = h('img', { class: 'px pcard-cat', alt: '' });
    this.nameEl = h('div', { class: 'pcard-name' });
    this.kindEl = h('div', { class: 'pcard-kind' });
    this.bioEl = h('div', { class: 'pcard-bio' });
    this.state = h('div', { class: 'pcard-state' });
    this.youEl = h('div', { class: 'pcard-you' });
    this.prev = h('button', { class: 'cat-arrow l', type: 'button' }, '◀');
    this.next = h('button', { class: 'cat-arrow r', type: 'button' }, '▶');
    this.prev.addEventListener('click', () => this.emit('ui:cat', { slot: this.slot, dir: -1 }));
    this.next.addEventListener('click', () => this.emit('ui:cat', { slot: this.slot, dir: 1 }));
    this.stage = h('div', { class: 'pcard-stage' }, this.prev, this.catImg, this.next);
    this.el.append(this.youEl, this.stage, this.nameEl, this.kindEl, this.bioEl, this.state);
    this.breed = null; this.present = false;
  }
  set({ present, name, breed, ready, you, editable, label, host }) {
    if (!BREEDS[breed]) present = false;
    this.present = present;
    this.el.classList.toggle('empty', !present);
    this.el.classList.toggle('ready', !!ready);
    this.el.classList.toggle('editable', !!editable);
    this.youEl.textContent = label || (you ? 'YOU' : '');
    if (!present) {
      this.nameEl.textContent = 'まってるよ…'; this.kindEl.textContent = ''; this.bioEl.textContent = '友だちに部屋IDを送ろう'; this.state.textContent = '';
      this.breed = null; return;
    }
    this.nameEl.textContent = name + (host ? ' ♛' : '');
    if (breed !== this.breed) { this.breed = breed; this.el.classList.remove('swap'); void this.el.offsetWidth; this.el.classList.add('swap'); }
    const b = BREEDS[breed];
    this.kindEl.textContent = `${b.name}（${b.kind}）`;
    this.bioEl.textContent = b.bio || '';
    this.state.textContent = ready ? 'じゅんびOK！' : 'じゅんび中…';
  }
  update(t) {
    if (!this.present || !this.breed) {
      const f = Math.floor(t * 1.5) % 2;
      this.catImg.src = toURL(bigCat('gray', { pose: 'sit', eyes: f ? 'closed' : 'open', mouth: 'w' }, this.side === 1, { dim: 0.25, acc: null, rim: 0 }));
      return;
    }
    const ready = this.el.classList.contains('ready');
    const k = Math.floor(t * 4);
    const blink = (Math.floor(t * 10) % 37) === 0;
    const pose = ready
      ? { pose: 'sit', eyes: 'happy', mouth: k % 4 === 0 ? 'nya' : 'grin', paws: k % 2 ? 'upBoth' : 'wave', tail: (k % 8) / 8 }
      : { pose: 'sit', eyes: blink ? 'closed' : 'open', mouth: 'w', look: this.side === 0 ? 1 : -1, tail: (k % 8) / 8 };
    const u = toURL(bigCat(this.breed, pose, this.side === 1));
    if (this.catImg.src !== u) this.catImg.src = u;
  }
}

export class WaitingRoomPanel extends Panel {
  constructor() {
    super('WaitingRoomPanel', 'wait-panel');
    this.codeEl = h('div', { class: 'room-code' });
    this.modeEl = h('div', { class: 'room-mode' });
    this.codeBox = h('div', { class: 'code-box' }, h('div', { class: 'code-label' }, '部屋ID'), this.codeEl);
    this.card.append(h('div', { class: 'panel-title' }, 'ひみつの路地裏'), this.codeBox, this.modeEl);
    this.copyBtn = this.button('copy', '招待リンクをコピー', 'small cyan', this.codeBox);
    const cards = h('div', { class: 'pcards' });
    this.card.append(cards);
    this.cards = [new PlayerCard(0), new PlayerCard(1)];
    this.add(this.cards[0], cards);
    cards.append(h('div', { class: 'vs' }, 'VS'));
    this.add(this.cards[1], cards);
    this.info = h('div', { class: 'wait-info' });
    this.card.append(this.info);
    const row = h('div', { class: 'btn-row' }); this.card.append(row);
    this.leaveBtn = this.button('leave', '部屋を出る', 'small', row);
    this.readyBtn = this.button('ready', 'じゅんびOK！', 'cyan', row);
    this.startBtn = this.button('start', 'はじめる！', 'pink', row);
  }
  setRoom(code, modeText) { this.codeEl.textContent = code || ''; this.codeBox.classList.toggle('is-hidden', !code); this.modeEl.textContent = modeText || ''; }
  setCard(i, o) { this.cards[i].set(o); }
  setInfo(t) { this.info.innerHTML = t; }
  setButtons({ ready, readyOn, start, startEnabled }) {
    this.readyBtn.setVisible(!!ready); this.readyBtn.setLabel(readyOn ? 'じゅんび中にもどす' : 'じゅんびOK！');
    this.readyBtn.el.classList.toggle('on', !!readyOn);
    this.startBtn.setVisible(!!start); this.startBtn.setEnabled(!!startEnabled);
  }
  update(t) { if (this.visible) this.cards.forEach((c) => c.update(t)); }
}

// ------------------------------------------------------------------ result
export class ResultPanel extends Panel {
  constructor() {
    super('ResultPanel', 'result-panel');
    this.head = h('div', { class: 'res-head' });
    this.cats = h('div', { class: 'res-cats' });
    this.stats = h('div', { class: 'res-stats' });
    this.rematch = h('div', { class: 'res-rematch' });
    this.card.append(this.head, this.cats, this.stats, this.rematch);
    const row = h('div', { class: 'btn-row' }); this.card.append(row);
    this.leaveBtn = this.button('leave', 'タイトルへ', 'small', row);
    this.againBtn = this.button('rematch', 'もう一回！', 'pink big', row);
    this.imgs = [];
  }
  set({ youWon, title, sub, players, rows, local }) {
    this.el.classList.toggle('won', !!youWon);
    this.el.classList.toggle('lost', youWon === false);
    this.head.innerHTML = `<div class="res-title">${title}</div><div class="res-sub">${sub}</div>`;
    this.players = players;
    this.cats.replaceChildren(...players.map((p, i) => h('div', { class: 'res-cat ' + (p.win ? 'win' : 'lose') },
      h('img', { class: 'px', alt: '' }),
      h('div', { class: 'res-name' }, p.name),
      h('div', { class: 'res-fish' }, ...Array.from({ length: p.max }, (_, k) => img(fishIcon(k < p.lives ? 'full' : 'bone')))))));
    this.imgs = [...this.cats.querySelectorAll('.res-cat > img')];
    this.stats.replaceChildren(h('table', {}, h('tbody', {}, ...rows.map((r) => h('tr', {}, h('td', { class: 'sv' }, String(r[1])), h('th', {}, r[0]), h('td', { class: 'sv' }, String(r[2])))))));
    this.againBtn.setLabel(local ? 'もう一回！' : 'もう一回！');
  }
  setRematch(text, votedSelf) { this.rematch.innerHTML = text; this.againBtn.el.classList.toggle('on', !!votedSelf); this.againBtn.setLabel(votedSelf ? 'まってるよ…' : 'もう一回！'); }
  setLeaveLabel(l) { this.leaveBtn.setLabel(l); }
  update(t) {
    if (!this.visible || !this.players) return;
    this.players.forEach((p, i) => {
      const k = Math.floor(t * 4);
      const pose = p.win
        ? { pose: 'stand', eyes: k % 4 < 2 ? 'star' : 'happy', mouth: 'nya', arms: k % 2 ? 'alt0' : 'alt1' }
        : { pose: 'loaf', eyes: 'tear', mouth: 'wavy', ears: 'flat' };
      const u = toURL(bigCat(p.breed, pose, i === 1, { crown: p.win }));
      if (this.imgs[i] && this.imgs[i].src !== u) this.imgs[i].src = u;
    });
  }
}

// ------------------------------------------------------------------ how to play
export class HowToPanel extends Panel {
  constructor() {
    super('HowToPanel', 'howto-panel');
    const ic = (a) => img(actionIcon(a), 'hi');
    this.card.append(
      h('div', { class: 'panel-title' }, 'あそびかた'),
      h('ol', { class: 'howto' },
        h('li', {}, h('b', {}, '出題'), '：受付マスの数だけ ', ic('nya'), 'にゃー / ', ic('goro'), 'ごろ を入力。相手にはヒミツ！'),
        h('li', {}, h('b', {}, 'おてほん'), '：出題ネコがリズムに乗って ひろうする。しっかり おぼえて！'),
        h('li', {}, h('b', {}, 'まね'), '：同じ順番で入力。まちがえると ', img(fishIcon('full'), 'hi'), ' 魚をとられる。'),
        h('li', { class: 'special' }, ic('goronya'), h('b', {}, 'ごろにゃー'), '（にゃー＋ごろ 同時押し）：受付が1マス減るかわりに、', h('b', {}, 'そのあとの にゃー⇄ごろ は ぎゃくに まね！'), img(swapIcon(), 'hi')),
        h('li', {}, '攻守は1ターンごとに交代。ラウンドごとにマスがふえる。魚が0になったら負け！'),
      ),
      h('div', { class: 'keys' },
        h('span', {}, h('kbd', {}, 'F'), ' / ', h('kbd', {}, '←'), ' にゃー'),
        h('span', {}, h('kbd', {}, 'J'), ' / ', h('kbd', {}, '→'), ' ごろ'),
        h('span', {}, '同時押し ごろにゃー'),
        h('span', {}, h('kbd', {}, 'Space'), ' キメ（早めに確定）')),
    );
    this.button('close', 'わかった！', 'cyan');
  }
}

// ------------------------------------------------------------------ disconnect
export class DisconnectPanel extends Panel {
  constructor() {
    super('DisconnectPanel', 'small-panel disc-panel');
    this.msg = h('div', { class: 'disc-msg' });
    this.catImg = img(bigCat('gray', { pose: 'loaf', eyes: 'closed', mouth: 'w', ears: 'side' }, false, { acc: null }), 'disc-cat');
    this.card.append(h('div', { class: 'panel-title' }, 'あれれ…？'), this.catImg, this.msg);
    const row = h('div', { class: 'btn-row' }); this.card.append(row);
    this.waitBtn = this.button('wait', '部屋でまつ', 'cyan', row);
    this.button('title', 'タイトルへ', 'small', row);
  }
  set(text, canWait) { this.msg.innerHTML = text; this.waitBtn.setVisible(canWait); }
}

export { PLAYER_CATS };
