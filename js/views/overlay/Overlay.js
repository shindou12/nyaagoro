// DOM overlay effects: bubbles, stamps, cut-ins, flashes, beat pulse.
import { View, h } from '../../core/View.js';
import { portrait } from '../../art/catArt.js';
import { actionIcon, swapIcon, toURL } from '../../art/icons.js';
import { pctX, pctY } from '../layers.js';

const img = (cv, cls = '') => h('img', { src: toURL(cv), class: 'px ' + cls, draggable: false, alt: '' });
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

export class SpeechBubbles extends View {
  constructor() { super('SpeechBubbles', { className: 'bubbles' }); }
  say(x, y, text, kind = 'nya', ms = 700, key = null) {
    if (key) this.el.querySelectorAll(`[data-key="${key}"]`).forEach((o) => o.remove());
    const b = h('div', { class: 'bubble k-' + kind }, text);
    if (key) b.dataset.key = key;
    b.style.left = pctX(x); b.style.top = pctY(y);
    this.el.append(b);
    setTimeout(() => b.classList.add('out'), ms);
    setTimeout(() => b.remove(), ms + 300);
  }
  clear() { this.el.replaceChildren(); }
}

export class SuccessEffect extends View {
  constructor() { super('SuccessEffect', { className: 'stamp stamp-ok is-hidden' }); }
  play(text = 'ばっちり！', sub = '') {
    this.el.innerHTML = `<div class="st-main">${text}</div><div class="st-sub">${sub}</div>`;
    this.show(); restart(this.el, 'in');
    clearTimeout(this.tm); this.tm = setTimeout(() => this.hide(), 1500);
  }
}

export class MissEffect extends View {
  constructor() { super('MissEffect', { className: 'stamp stamp-miss is-hidden' }); }
  play(text = 'ミス…', sub = '') {
    this.el.innerHTML = `<div class="st-main">${text}</div><div class="st-sub">${sub}</div>`;
    this.show(); restart(this.el, 'in');
    clearTimeout(this.tm); this.tm = setTimeout(() => this.hide(), 1900);
  }
}

export class CrowdHypeEffect extends View {
  constructor() { super('CrowdHypeEffect', { className: 'hype-up is-hidden' }); }
  play(level, name) {
    this.el.innerHTML = `<span class="hu-l">HYPE ${'▮'.repeat(level + 1)}</span><span class="hu-n">${name}</span>`;
    this.el.dataset.level = level;
    this.show(); restart(this.el, 'in');
    clearTimeout(this.tm); this.tm = setTimeout(() => this.hide(), 1800);
  }
}

// Fighting-game style super cut-in for ごろにゃー
export class SpecialActionEffect extends View {
  constructor() { super('SpecialActionEffect', { className: 'cutin is-hidden' }); }
  play(breed, side, sub = 'ここから ぎゃくに まねっこ！') {
    this.el.replaceChildren(
      h('div', { class: 'cutin-band' },
        h('div', { class: 'cutin-face' }, img(portrait(breed, { eyes: 'star', mouth: 'nya', ears: 'perk' }, side > 0))),
        h('div', { class: 'cutin-text' },
          h('div', { class: 'cutin-main' }, img(actionIcon('goronya'), 'ci-icon'), 'ごろにゃー!!'),
          h('div', { class: 'cutin-sub' }, img(swapIcon(), 'swap'), sub)),
      ),
    );
    this.el.classList.toggle('from-r', side > 0);
    this.show(); restart(this.el, 'in');
    clearTimeout(this.tm); this.tm = setTimeout(() => this.hide(), 1250);
  }
}

export class BeatPulse extends View {
  constructor() { super('BeatPulse', { className: 'beat-pulse' }); }
  set(phase, strength, reverse) {
    const k = Math.max(0, 1 - phase * 2.2) * strength;
    this.el.style.opacity = k.toFixed(3);
    this.el.classList.toggle('rev', !!reverse);
  }
}

export class ScreenFx extends View {
  constructor(stageEl) {
    super('ScreenFx', { className: 'screen-fx' });
    this.stage = stageEl;
    this.flashEl = h('div', { class: 'flash' });
    this.vig = h('div', { class: 'vignette' });
    this.revFrame = h('div', { class: 'rev-frame' }, h('span', { class: 'rf-t' }, 'REVERSE ⇄ ぎゃく'), h('span', { class: 'rf-b' }, 'REVERSE ⇄ ぎゃく'));
    this.el.append(this.vig, this.revFrame, this.flashEl);
  }
  flash(color = '#fff', ms = 180) {
    this.flashEl.style.background = color;
    this.flashEl.style.transitionDuration = '0ms';
    this.flashEl.style.opacity = '0.75';
    requestAnimationFrame(() => { this.flashEl.style.transitionDuration = ms + 'ms'; this.flashEl.style.opacity = '0'; });
  }
  shake(power = 1) { this.stage.style.setProperty('--shake', power); restart(this.stage, 'shaking'); }
  setReverse(on) { this.revFrame.classList.toggle('on', on); }
  setDanger(on) { this.vig.classList.toggle('danger', on); }
  setTint(mode) { this.el.dataset.tint = mode || ''; }
}

export class Toast extends View {
  constructor() { super('Toast', { className: 'toast is-hidden' }); }
  say(text, ms = 2200) { this.el.textContent = text; this.show(); restart(this.el, 'in'); clearTimeout(this.tm); this.tm = setTimeout(() => this.hide(), ms); }
}

// A broken slot flies over to the opponent's name plate: "this one's yours next turn".
export class GiftFly extends View {
  constructor(stageEl) { super('GiftFly', { className: 'gift-layer' }); this.stage = stageEl; }
  fly(fromRect, toRect, text = '+1') {
    const s = this.stage.getBoundingClientRect();
    const chip = h('div', { class: 'gift-chip' }, text);
    const x0 = fromRect.x + fromRect.width / 2 - s.x, y0 = fromRect.y + fromRect.height / 2 - s.y;
    const x1 = toRect.x + toRect.width / 2 - s.x, y1 = toRect.y + toRect.height / 2 - s.y;
    chip.style.left = x0 + 'px'; chip.style.top = y0 + 'px';
    this.el.append(chip);
    requestAnimationFrame(() => requestAnimationFrame(() => { chip.style.transform = `translate(${x1 - x0}px, ${y1 - y0}px) scale(.8) rotate(360deg)`; chip.classList.add('go'); }));
    setTimeout(() => chip.remove(), 1100);
  }
}
