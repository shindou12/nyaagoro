// Passive View base.
// - Views own *only* presentation: visibility, position, text, animation params.
// - Views never decide game outcomes. They report "what happened" by emitting
//   events that bubble child → parent (Chain of Responsibility) up to GameRoot,
//   whose sink is the Mediator.
// - A parent may *annotate* an event with its context (e.g. a panel adds the
//   typed room code) or consume it, but never act on game state.

export class View {
  /**
   * @param {string} name   unique-ish name, shows up in event paths & DOM (data-view)
   * @param {{tag?:string, className?:string, el?:HTMLElement|null, html?:string}} opt
   *        el:null creates a DOM-less view (canvas-drawn sub views)
   */
  constructor(name, opt = {}) {
    this.name = name;
    this.parent = null;
    this.children = [];
    this.visible = true;
    if (opt.el === null) this.el = null;
    else {
      this.el = opt.el || document.createElement(opt.tag || 'div');
      if (opt.className) this.el.className = opt.className;
      this.el.dataset.view = name;
      if (opt.html) this.el.innerHTML = opt.html;
    }
  }

  add(child, mount = this.el) {
    child.parent = this;
    this.children.push(child);
    if (child.el && mount && !child.el.parentNode) mount.appendChild(child.el);
    return child;
  }

  find(name) {
    if (this.name === name) return this;
    for (const c of this.children) { const f = c.find(name); if (f) return f; }
    return null;
  }

  /** Report something that happened in this view. */
  emit(type, detail = {}) {
    this.bubble({ type, detail, source: this.name, path: [] });
  }

  bubble(ev) {
    ev.path.push(this.name);
    if (this.handle(ev) === true) return; // consumed
    if (this.parent) this.parent.bubble(ev);
    else if (this.sink) this.sink(ev);
  }

  /** Override to annotate or consume child events. Return true to stop bubbling. */
  handle(_ev) { return false; }

  setVisible(v) {
    this.visible = v;
    if (this.el) this.el.classList.toggle('is-hidden', !v);
    return this;
  }
  show() { return this.setVisible(true); }
  hide() { return this.setVisible(false); }

  /** frame tick for animated views */
  update(t, dt) { for (const c of this.children) if (c.visible !== false) c.update(t, dt); }
}

/** Canvas-drawn view (lives inside a canvas layer). */
export class CanvasView extends View {
  constructor(name) { super(name, { el: null }); }
  draw(_ctx, _t) {}
  drawAll(ctx, t) {
    if (!this.visible) return;
    this.draw(ctx, t);
    for (const c of this.children) if (c.drawAll) c.drawAll(ctx, t);
  }
}

// tiny DOM helper
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('data-')) el.setAttribute(k, v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
