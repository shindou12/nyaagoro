// HUD components. Passive views: they expose setters and emit UI facts.
import { View, h } from '../../core/View.js';
import { actionIcon, fishIcon, swapIcon, toURL, ACTION_COLORS } from '../../art/icons.js';
import { portrait } from '../../art/catArt.js';
import { pctX, pctY } from '../layers.js';

const img = (cv, cls = '') => h('img', { src: toURL(cv), class: 'px ' + cls, draggable: false, alt: '' });

// ------------------------------------------------------------------ player plates
export class PlayerPlate extends View {
  constructor(side) {
    super('PlayerPlate' + (side < 0 ? 'L' : 'R'), { className: 'plate ' + (side < 0 ? 'plate-l' : 'plate-r') });
    this.side = side;
    this.face = h('div', { class: 'plate-face' });
    this.nameEl = h('div', { class: 'plate-name' });
    this.tagEl = h('div', { class: 'plate-tag' });
    this.fish = h('div', { class: 'plate-fish' });
    this.roleEl = h('div', { class: 'plate-role' });
    this.giftEl = h('div', { class: 'plate-gift is-hidden' });
    this.el.append(this.giftEl, this.face, h('div', { class: 'plate-body' }, h('div', { class: 'plate-top' }, this.tagEl, this.nameEl), this.fish), this.roleEl);
    this.lives = 0;
  }
  setCat(breed, expr = {}) { this.face.replaceChildren(img(portrait(breed, expr, this.side > 0), 'portrait')); this.breed = breed; }
  setExpr(expr) { if (this.breed) this.setCat(this.breed, expr); }
  setName(n, tag) { this.nameEl.textContent = n; this.tagEl.textContent = tag || ''; this.tagEl.classList.toggle('is-hidden', !tag); }
  setLives(n, max) {
    this.lives = n;
    this.fish.replaceChildren(...Array.from({ length: max }, (_, i) => h('span', { class: 'fish ' + (i < n ? 'full' : 'bone') }, img(fishIcon(i < n ? 'full' : 'bone')))));
  }
  loseFish(index) {
    const f = this.fish.children[index];
    if (!f) return;
    f.classList.add('losing');
    setTimeout(() => { f.classList.remove('losing', 'full'); f.classList.add('bone'); f.replaceChildren(img(fishIcon('bone'))); }, 650);
  }
  fishRect(index) { const f = this.fish.children[index]; return f ? f.getBoundingClientRect() : this.el.getBoundingClientRect(); }
  setRole(role) {
    this.roleEl.className = 'plate-role ' + (role ? 'role-' + role : 'is-hidden');
    this.roleEl.textContent = role === 'composer' ? '出題' : role === 'mimic' ? 'まね' : '';
  }
  setActive(on) { this.el.classList.toggle('is-active', !!on); }
  setDanger(on) { this.el.classList.toggle('is-danger', !!on); }
  /** extra slots this cat will get on its next compose turn (ごろにゃーのおかえし) */
  setGift(n) {
    this.giftEl.textContent = n ? `次の出題 +${n}マス` : '';
    this.giftEl.classList.toggle('is-hidden', !n);
    if (n) { this.giftEl.classList.remove('pop'); void this.giftEl.offsetWidth; this.giftEl.classList.add('pop'); }
  }
}

// ------------------------------------------------------------------ round + hype
export class RoundBadge extends View {
  constructor() {
    super('RoundBadge', { className: 'round-badge' });
    this.r = h('div', { class: 'rb-round' }); this.s = h('div', { class: 'rb-slots' });
    this.el.append(this.r, this.s);
  }
  set(round, slots, bonus = 0) {
    this.r.textContent = 'ROUND ' + round;
    this.s.replaceChildren(h('b', {}, String(slots)), 'マス', ...(bonus ? [h('em', { class: 'rb-gift' }, `+${bonus}`)] : []));
    this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop');
  }
}

export const HYPE_NAMES = ['しずか…', 'ざわざわ', 'もりあがり', 'ねっきょう', 'だいねっきょう！！'];
export class HypeMeter extends View {
  constructor() {
    super('HypeMeter', { className: 'hype' });
    this.pips = Array.from({ length: 5 }, (_, i) => h('span', { class: 'pip p' + i }));
    this.label = h('div', { class: 'hype-label' });
    this.el.append(h('div', { class: 'hype-pips' }, ...this.pips), this.label);
    this.level = -1;
  }
  set(level) {
    if (level === this.level) return;
    const up = level > this.level;
    this.level = level;
    this.pips.forEach((p, i) => p.classList.toggle('on', i <= level));
    this.label.textContent = HYPE_NAMES[level];
    this.el.dataset.level = level;
    if (up) { this.el.classList.remove('bump'); void this.el.offsetWidth; this.el.classList.add('bump'); }
  }
}

// ------------------------------------------------------------------ the sequence track
export class SequenceTrack extends View {
  constructor() {
    super('SequenceTrack', { className: 'track' });
    this.row = h('div', { class: 'track-row' });
    this.bracket = h('div', { class: 'rev-bracket is-hidden' }, img(swapIcon(), 'swap'), h('span', {}, 'ここから ぎゃく！'));
    this.el.append(this.row, this.bracket);
    this.slots = [];
  }
  setup(n) {
    this.slots = Array.from({ length: n }, (_, i) => {
      const el = h('div', { class: 'slot empty' }, h('div', { class: 'slot-in' }), h('div', { class: 'lane' }, h('i', { class: 'lane-l' }), h('i', { class: 'lane-r' })), h('div', { class: 'slot-sub' }));
      el.style.setProperty('--i', i);
      return { el, state: 'empty' };
    });
    this.row.replaceChildren(...this.slots.map((s) => s.el));
    this.cursor = -1;
    this.setReverseFrom(-1);
    this.el.classList.remove('drop'); void this.el.offsetWidth; this.el.classList.add('drop');
  }
  /**
   * @param {number} i
   * @param {{state:string, icon?:string, sub?:string, flags?:string[]}} o
   * states: empty | secret | shown | hidden | ok | bad | reveal | broken
   */
  setSlot(i, o) {
    const s = this.slots[i];
    if (!s) return;
    s.state = o.state;
    const inner = s.el.querySelector('.slot-in'), sub = s.el.querySelector('.slot-sub');
    s.el.className = 'slot ' + o.state + ' ' + (o.flags || []).join(' ') + (o.icon ? ' a-' + o.icon : '');
    if (this.revFrom >= 0 && i > this.revFrom && o.state !== 'broken') s.el.classList.add('rev');
    if (this.cursor === i) s.el.classList.add('cursor');
    if (s.gift) s.el.classList.add('gift');
    inner.replaceChildren();
    if (o.icon && o.state !== 'hidden' && o.state !== 'secret') inner.append(img(actionIcon(o.icon)));
    if (o.state === 'secret' || o.state === 'hidden') inner.textContent = '?';
    sub.replaceChildren();
    if (o.subIcon) sub.append(img(actionIcon(o.subIcon), 'mini'));
    if (o.sub) sub.append(o.sub);
    if (o.pop) { s.el.classList.remove('pop'); void s.el.offsetWidth; s.el.classList.add('pop'); }
  }
  setCursor(i) { this.cursor = i; this.slots.forEach((s, k) => s.el.classList.toggle('cursor', k === i)); }
  setReverseFrom(idx) {
    this.revFrom = idx;
    this.slots.forEach((s, k) => s.el.classList.toggle('rev', idx >= 0 && k > idx && s.state !== 'broken'));
    this.el.classList.toggle('has-rev', idx >= 0);
    if (idx < 0 || idx >= this.slots.length - 1) { this.bracket.classList.add('is-hidden'); return; }
    this.bracket.classList.remove('is-hidden');
    const n = this.slots.length;
    this.bracket.style.setProperty('--from', idx + 1);
    this.bracket.style.setProperty('--n', n);
  }
  markGift(i) { const s = this.slots[i]; if (!s) return; s.gift = true; s.el.classList.add('gift'); }
  breakSlot(i) {
    const s = this.slots[i];
    if (!s) return;
    this.setSlot(i, { state: 'broken' });
  }
  flash(kind) { this.el.classList.remove('f-ok', 'f-bad'); void this.el.offsetWidth; this.el.classList.add('f-' + kind); }
  setMode(m) { this.el.dataset.mode = m; }
}

export class TimerBar extends View {
  constructor() { super('TimerBar', { className: 'timer is-hidden' }); this.fill = h('div', { class: 'timer-fill' }); this.el.append(this.fill); }
  set(frac, urgent) { this.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`; this.el.classList.toggle('urgent', !!urgent); }
}

// ------------------------------------------------------------------ banner (turn / role / result words)
export class PhaseBanner extends View {
  constructor() {
    super('PhaseBanner', { className: 'banner is-hidden' });
    this.main = h('div', { class: 'banner-main' }); this.sub = h('div', { class: 'banner-sub' });
    this.el.append(this.main, this.sub);
  }
  say(text, { sub = '', style = 'info', ms = 1200 } = {}) {
    clearTimeout(this.tm);
    this.main.innerHTML = text; this.sub.innerHTML = sub;
    this.el.className = 'banner b-' + style;
    void this.el.offsetWidth; this.el.classList.add('in');
    if (ms > 0) this.tm = setTimeout(() => this.clear(), ms);
  }
  clear() { this.el.classList.remove('in'); this.el.classList.add('out'); this.tm = setTimeout(() => this.el.classList.add('is-hidden'), 250); }
}

// ------------------------------------------------------------------ reverse state
export class ReverseIndicator extends View {
  constructor() {
    super('ReverseIndicator', { className: 'rev-chip is-hidden' });
    this.el.append(
      h('div', { class: 'rev-title' }, img(swapIcon(), 'swap'), ' ぎゃくモード'),
      h('div', { class: 'rev-rule' },
        img(actionIcon('nya'), 'mini'), h('span', { class: 'arrow' }, '→'), img(actionIcon('goro'), 'mini'),
        h('span', { class: 'sep' }, '／'),
        img(actionIcon('goro'), 'mini'), h('span', { class: 'arrow' }, '→'), img(actionIcon('nya'), 'mini')),
    );
  }
  set(on, { live = false } = {}) { this.setVisible(on); this.el.classList.toggle('live', live); }
}

// ------------------------------------------------------------------ input pad
export class InputPad extends View {
  constructor() {
    super('InputPad', { className: 'pad' });
    const mk = (key, label, keys) => {
      const b = h('button', { class: 'pad-btn pb-' + key, type: 'button' },
        h('span', { class: 'pb-hint' }), h('div', { class: 'lane' }, h('i', { class: 'lane-l' }), h('i', { class: 'lane-r' })), img(actionIcon(key === 'confirm' ? 'nya' : key), 'pb-icon'), h('span', { class: 'pb-label' }, label), h('kbd', {}, keys));
      if (key === 'confirm') { b.querySelector('.pb-icon').remove(); b.prepend(h('span', { class: 'pb-ok' }, '✓')); }
      const down = (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); this.emit('pad:down', { key }); };
      const up = (e) => { e.preventDefault(); this.emit('pad:up', { key }); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      return b;
    };
    this.btn = { nya: mk('nya', 'にゃー', 'F'), goro: mk('goro', 'ごろ', 'J'), confirm: mk('confirm', 'キメ！', 'Space') };
    this.combo = h('div', { class: 'pad-combo' }, img(actionIcon('goronya'), 'mini'), h('span', {}, '同時押しで '), h('b', {}, 'ごろにゃー'));
    this.msg = h('div', { class: 'pad-msg' });
    this.el.append(this.btn.nya, h('div', { class: 'pad-mid' }, this.combo, this.msg, this.btn.confirm), this.btn.goro);
    this.setMode('off');
  }
  setMode(mode, msg = '') {
    this.el.dataset.mode = mode; // off | wait | compose | replay
    this.msg.textContent = msg;
  }
  setPressed(key, on) { this.btn[key]?.classList.toggle('down', on); }
  setConfirm(enabled) { this.btn.confirm.classList.toggle('enabled', enabled); }
  setComboEnabled(on) { this.combo.classList.toggle('disabled', !on); }
  setReverse(on) {
    this.el.classList.toggle('reverse', on);
    this.btn.nya.querySelector('.pb-hint').replaceChildren(...(on ? [img(actionIcon('goro'), 'mini'), 'を見たら'] : []));
    this.btn.goro.querySelector('.pb-hint').replaceChildren(...(on ? [img(actionIcon('nya'), 'mini'), 'を見たら'] : []));
  }
  flash(key, kind) { const b = this.btn[key]; if (!b) return; b.classList.remove('ok', 'bad'); void b.offsetWidth; b.classList.add(kind); }
}

// ------------------------------------------------------------------ tags floating over cats
export class RoleTags extends View {
  constructor() {
    super('RoleTags', { className: 'role-tags' });
    this.tags = [-1, 1].map((side) => { const e = h('div', { class: 'role-tag is-hidden' }); this.el.append(e); return { side, e }; });
  }
  set(side, text, style, x, y) {
    const t = this.tags[side < 0 ? 0 : 1].e;
    if (!text) { t.classList.add('is-hidden'); return; }
    t.className = 'role-tag rt-' + style;
    t.textContent = text;
    t.style.left = pctX(x); t.style.top = pctY(y);
  }
}

export { ACTION_COLORS };
