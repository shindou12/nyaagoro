// Layer containers. Canvas layers draw their CanvasView children in order.
import { View } from '../core/View.js';

export class CanvasLayer extends View {
  constructor(name, { w = 320, h = 180, className = '' } = {}) {
    super(name, { tag: 'canvas', className: 'layer canvas-layer ' + className });
    this.el.width = w; this.el.height = h;
    this.ctx = this.el.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.clearEach = true;
  }
  update(t, dt) {
    for (const c of this.children) if (c.visible) c.update(t, dt);
    if (!this.visible) return;
    const ctx = this.ctx;
    if (this.clearEach) ctx.clearRect(0, 0, this.el.width, this.el.height);
    for (const c of this.children) if (c.drawAll) c.drawAll(ctx, t);
  }
}

export class DomLayer extends View {
  constructor(name, className = '') { super(name, { className: 'layer ' + className }); }
}

/** world (320x180) → stage percentage helpers for DOM views that follow world objects */
export const pctX = (x) => (x / 320 * 100).toFixed(3) + '%';
export const pctY = (y) => (y / 180 * 100).toFixed(3) + '%';
