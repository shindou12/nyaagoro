// Story mode views: the stage map (10 lanterns down the alley) and the
// dialogue box. Passive: they show what they're told and report clicks.
import { View, h } from '../../core/View.js';
import { portrait } from '../../art/catArt.js';
import { toURL } from '../../art/icons.js';
import { Panel } from './Panels.js';

const img = (cv, cls = '') => h('img', { src: toURL(cv), class: 'px ' + cls, draggable: false, alt: '' });

export class StoryMapPanel extends Panel {
  constructor() {
    super('StoryMapPanel', 'story-panel');
    this.head = h('div', { class: 'story-head' },
      h('div', { class: 'story-kicker' }, 'STORY'),
      h('div', { class: 'panel-title' }, 'さいごの満月'),
      h('div', { class: 'story-lead' }, '満月の夜、ネオン路地裏は 取り壊される。帰ってこない 師匠を探して、一夜ずつ まねっこ勝負。'));
    this.progress = h('div', { class: 'story-progress' });
    this.grid = h('div', { class: 'story-grid' });
    this.card.append(this.head, this.progress, this.grid);
    const row = h('div', { class: 'btn-row' }); this.card.append(row);
    this.button('back', 'タイトルへ', 'small', row);
    this.cards = [];
  }
  handle(ev) {
    ev.detail.panel = this.name;
    return false;
  }
  /** stages: [{id, name, cat, title, night}], cleared: number of cleared stages */
  set(stages, cleared) {
    this.progress.innerHTML = `<b>${Math.min(cleared, stages.length)}</b> / ${stages.length} 夜`;
    this.grid.replaceChildren();
    stages.forEach((s) => {
      const open = s.id <= cleared + 1, done = s.id <= cleared, next = s.id === cleared + 1;
      const face = open ? img(portrait(s.cat, done ? { eyes: 'happy', mouth: 'w' } : {}), 'sc-face')
        : img(portrait(s.cat, { eyes: 'closed' }), 'sc-face locked');
      const b = h('button', { type: 'button', class: 'stage-card' + (done ? ' done' : '') + (next ? ' next' : '') + (open ? '' : ' locked') + (s.final ? ' final' : '') },
        h('div', { class: 'sc-no' }, s.final ? 'FINAL' : `STAGE ${s.id}`),
        face,
        h('div', { class: 'sc-name' }, open ? s.name : '？？？'),
        h('div', { class: 'sc-title' }, open ? s.title : s.night),
        done ? h('div', { class: 'sc-star' }, '★') : null);
      b.disabled = !open;
      b.addEventListener('click', () => this.emit('ui:click', { id: 'stage', stage: s.id }));
      b.addEventListener('pointerenter', () => { if (open) this.emit('ui:hover', { id: 'stage' }); });
      this.grid.append(b);
    });
  }
}

export class DialogueView extends View {
  constructor() {
    super('DialogueView', { className: 'dlg is-hidden' });
    this.box = h('div', { class: 'dlg-box' });
    this.faceL = h('div', { class: 'dlg-face l' });
    this.faceR = h('div', { class: 'dlg-face r' });
    this.nameEl = h('div', { class: 'dlg-name' });
    this.textEl = h('div', { class: 'dlg-text' });
    this.more = h('div', { class: 'dlg-more' }, '▼');
    this.choices = h('div', { class: 'dlg-choices' });
    this.skipBtn = h('button', { type: 'button', class: 'dlg-skip' }, 'スキップ ≫');
    this.stageTag = h('div', { class: 'dlg-stage' });
    this.card = h('div', { class: 'dlg-card is-hidden' });
    this.box.append(this.nameEl, this.textEl, this.more);
    this.el.append(this.stageTag, this.faceL, this.faceR, this.box, this.choices, this.skipBtn, this.card);
    this.box.addEventListener('click', () => this.emit('dlg:next', {}));
    this.faceL.addEventListener('click', () => this.emit('dlg:next', {}));
    this.faceR.addEventListener('click', () => this.emit('dlg:next', {}));
    this.card.addEventListener('click', () => this.emit('dlg:next', {}));
    this.skipBtn.addEventListener('click', (e) => { e.stopPropagation(); this.emit('dlg:skip', {}); });
    this.full = ''; this.shown = 0; this.t0 = 0; this.typing = false;
  }
  setStage(text) { this.stageTag.textContent = text || ''; this.stageTag.classList.toggle('is-hidden', !text); }
  /** who: 'me' | 'op' | 'nar' */
  line({ who, name, text, meBreed, opBreed, expr }) {
    this.card.classList.add('is-hidden');
    this.box.classList.remove('is-hidden');
    this.choices.replaceChildren();
    this.el.dataset.who = who;
    this.nameEl.textContent = who === 'nar' ? '' : name;
    this.nameEl.classList.toggle('is-hidden', who === 'nar');
    const set = (el, breed, active, flip, ex) => {
      if (!breed) { el.replaceChildren(); return; }
      el.replaceChildren(img(portrait(breed, ex || {}, flip)));
      el.classList.toggle('active', active);
    };
    set(this.faceL, meBreed, who === 'me', false, who === 'me' ? expr : null);
    set(this.faceR, opBreed, who === 'op', true, who === 'op' ? expr : null);
    this.full = text; this.shown = 0; this.typing = true; this.t0 = performance.now();
    this.textEl.textContent = '';
    this.more.classList.add('is-hidden');
    this.emit('dlg:char', { who });
  }
  isTyping() { return this.typing; }
  finish() { this.shown = this.full.length; this.textEl.textContent = this.full; this.typing = false; this.more.classList.remove('is-hidden'); }
  ask(options) {
    this.more.classList.add('is-hidden');
    this.choices.replaceChildren(...options.map((o) => {
      const b = h('button', { type: 'button', class: 'btn ' + (o.variant || 'small') }, o.label);
      b.addEventListener('click', (e) => { e.stopPropagation(); this.emit('ui:click', { id: o.id }); });
      return b;
    }));
  }
  showCard(title, sub, tap = 'タップで タイトルへ', kind = 'end') {
    this.box.classList.add('is-hidden');
    this.faceL.replaceChildren(); this.faceR.replaceChildren();
    this.choices.replaceChildren();
    this.card.innerHTML = `<div class="dc-title">${title}</div><div class="dc-sub">${sub}</div><div class="dc-tap">${tap}</div>`;
    this.card.className = 'dlg-card k-' + kind;
  }
  update() {
    if (!this.visible || !this.typing) return;
    const n = Math.min(this.full.length, Math.floor((performance.now() - this.t0) / 38));
    if (n !== this.shown) {
      this.shown = n;
      this.textEl.textContent = this.full.slice(0, n);
      if (n % 3 === 0) this.emit('dlg:char', { who: this.el.dataset.who });
    }
    if (n >= this.full.length) this.finish();
  }
}
