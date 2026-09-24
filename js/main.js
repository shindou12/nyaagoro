// Entry point: wire the layers together and run the frame loop.
import { GameRoot } from './views/GameRoot.js';
import { AppMediator } from './mediator/AppMediator.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { Sfx } from './audio/Sfx.js';
import { Bgm } from './audio/Bgm.js';
import { RawInput, InputInterpreter } from './input/Input.js';

async function main() {
  try { await document.fonts.load('16px DotGothic16'); } catch { /* fall back */ }
  const audio = new AudioEngine();
  const sfx = new Sfx(audio);
  const bgm = new Bgm(audio, sfx);
  const root = new GameRoot(document.getElementById('app'));
  const raw = new RawInput();
  const interp = new InputInterpreter();
  const mediator = new AppMediator({ root, audio, sfx, bgm, raw, interp });
  window.__nyagoro = { root, mediator, audio, bgm }; // debug / e2e hook
  mediator.boot();
  if (mediator.muted) audio.setMuted(true);

  // unlock audio on the first touch anywhere
  const unlock = () => { audio.unlock(); if (mediator.muted) audio.setMuted(true); };
  window.addEventListener('pointerdown', (e) => {
    unlock();
    if (mediator.state === 'intro') mediator.onRaw('any', true, 'pointer');
    void e;
  }, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    mediator.update(t, dt);
    root.update(t, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main();
