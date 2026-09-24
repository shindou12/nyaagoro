// Raw Input → Input Interpreter → Game Event
// Views never interpret presses. Keyboard and on-screen pad both feed
// RawInput; the interpreter owns the simultaneous-press (ごろにゃー) window.

export const KEYMAP = {
  KeyF: 'nya', KeyA: 'nya', KeyD: 'nya', ArrowLeft: 'nya',
  KeyJ: 'goro', KeyL: 'goro', KeyK: 'goro', ArrowRight: 'goro',
  Space: 'confirm', Enter: 'confirm', ArrowDown: 'confirm',
};

export class RawInput {
  constructor() {
    this.down = new Set();
    this.onRaw = () => {};   // (key, isDown, source)
    this.enabled = true;
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (e.code === 'Escape') { this.onRaw('escape', true, 'key'); return; }
      if (e.code === 'KeyM') { this.onRaw('mute', true, 'key'); return; }
      const k = KEYMAP[e.code];
      if (!k) { if (!e.repeat) this.onRaw('any', true, 'key'); return; }
      e.preventDefault();
      if (e.repeat || this.down.has(e.code)) return;
      this.down.add(e.code);
      this.onRaw(k, true, 'key');
    });
    window.addEventListener('keyup', (e) => {
      const k = KEYMAP[e.code];
      this.down.delete(e.code);
      if (k) this.onRaw(k, false, 'key');
    });
    window.addEventListener('blur', () => this.down.clear());
  }
  /** from the on-screen pad (via Mediator) */
  pad(key, isDown) { this.onRaw(key, isDown, 'pad'); }
}

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}

/** Turns raw presses into game inputs: nya / goro / goronya / confirm. */
export class InputInterpreter {
  constructor({ chordMs = 80 } = {}) {
    this.chordMs = chordMs;
    this.pending = null;
    this.onGame = () => {};  // (action)
  }
  raw(key, isDown) {
    if (!isDown) return;
    if (key === 'confirm') { this.flush(); this.onGame('confirm'); return; }
    if (key !== 'nya' && key !== 'goro') return;
    const p = this.pending;
    if (p && p.key !== key) {
      clearTimeout(p.timer);
      this.pending = null;
      this.onGame('goronya');
      return;
    }
    if (p) this.flush();
    const timer = setTimeout(() => this.flush(), this.chordMs);
    this.pending = { key, timer };
  }
  flush() {
    const p = this.pending;
    if (!p) return;
    clearTimeout(p.timer);
    this.pending = null;
    this.onGame(p.key);
  }
  reset() { if (this.pending) clearTimeout(this.pending.timer); this.pending = null; }
}
