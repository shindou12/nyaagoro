// GameRoot — the single root of every visible thing.
//
// GameRoot
// ├─ Stage (16:9, sets --px = one world pixel)
// │  ├─ WorldWrap (camera: zoom/shake)
// │  │  ├─ BackgroundLayer  : AlleyBackground, EyesInDark, NeonSigns
// │  │  └─ WorldLayer       : AudienceCats, StageProps, PlayerCat, OpponentCat, AudienceFront, Weather, FrontRow
// │  ├─ HUDLayer            : PlayerPlates, RoundBadge, HypeMeter, SequenceTrack, TimerBar,
// │  │                        PhaseBanner, ReverseIndicator, RoleTags, InputPad
// │  ├─ OverlayLayer        : FxCanvas, BeatPulse, ScreenFx, SpeechBubbles, SuccessEffect,
// │  │                        MissEffect, CrowdHypeEffect, SpecialActionEffect, Toast
// │  ├─ ModalLayer          : TitleMenu, RoomCreatePanel, RoomJoinPanel, WaitingRoomPanel,
// │  │                        ResultPanel, HowToPanel, DisconnectPanel, StoryMapPanel, DialogueView
// │  └─ TransitionLayer     : IntroZoom, MatchStartTransition, ResultTransition
//
// Views bubble events up to here; GameRoot hands them to its sink (the Mediator).
import { View } from '../core/View.js';
import { CanvasLayer, DomLayer } from './layers.js';
import { SceneParams, AlleyBackground, NeonSigns, AudienceCats, AudienceFront, EyesInDark, StageProps, Weather, FrontRow } from './world/AlleyScene.js';
import { CatActor } from './world/CatActor.js';
import { PlayerPlate, RoundBadge, HypeMeter, SequenceTrack, TimerBar, PhaseBanner, ReverseIndicator, InputPad, RoleTags } from './hud/Hud.js';
import { FxCanvas } from './overlay/FxCanvas.js';
import { SpeechBubbles, SuccessEffect, MissEffect, CrowdHypeEffect, SpecialActionEffect, BeatPulse, ScreenFx, Toast, GiftFly } from './overlay/Overlay.js';
import { TitleMenu, RoomCreatePanel, RoomJoinPanel, WaitingRoomPanel, ResultPanel, HowToPanel, DisconnectPanel } from './modal/Panels.js';
import { IntroZoom, MatchStartTransition, ResultTransition } from './transition/Transitions.js';
import { StoryMapPanel, DialogueView } from './modal/Story.js';

export const CAT_POS = { L: { x: 84, y: 150 }, R: { x: 236, y: 150 } };

export class GameRoot extends View {
  constructor(mount) {
    super('GameRoot', { className: 'game-root' });
    mount.append(this.el);
    this.stage = new View('Stage', { className: 'stage' });
    this.add(this.stage);

    // ---- world
    this.scene = new SceneParams();
    this.worldWrap = this.stage.add(new View('WorldWrap', { className: 'world-wrap' }));
    this.background = this.worldWrap.add(new CanvasLayer('BackgroundLayer'));
    this.background.add(new AlleyBackground(this.scene));
    this.background.add(new EyesInDark(this.scene));
    this.neon = this.background.add(new NeonSigns(this.scene));

    this.world = this.worldWrap.add(new CanvasLayer('WorldLayer'));
    this.audience = this.world.add(new AudienceCats(this.scene));
    this.props = this.world.add(new StageProps(this.scene));
    this.catL = this.world.add(new CatActor('PlayerCat', { ...CAT_POS.L, flip: false }));
    this.catR = this.world.add(new CatActor('OpponentCat', { ...CAT_POS.R, flip: true }));
    this.world.add(new AudienceFront(this.audience));
    this.weather = this.world.add(new Weather(this.scene));
    this.frontRow = this.world.add(new FrontRow(this.scene));

    // ---- HUD
    this.hud = this.stage.add(new DomLayer('HUDLayer', 'hud'));
    this.plateL = this.hud.add(new PlayerPlate(-1));
    this.plateR = this.hud.add(new PlayerPlate(1));
    this.round = this.hud.add(new RoundBadge());
    this.hype = this.hud.add(new HypeMeter());
    this.track = this.hud.add(new SequenceTrack());
    this.timer = this.hud.add(new TimerBar());
    this.banner = this.hud.add(new PhaseBanner());
    this.revChip = this.hud.add(new ReverseIndicator());
    this.roleTags = this.hud.add(new RoleTags());
    this.pad = this.hud.add(new InputPad());

    // ---- overlay
    this.overlay = this.stage.add(new DomLayer('OverlayLayer', 'overlay'));
    this.fxLayer = this.overlay.add(new CanvasLayer('FxLayer'));
    this.fx = this.fxLayer.add(new FxCanvas());
    this.beatPulse = this.overlay.add(new BeatPulse());
    this.screenFx = this.overlay.add(new ScreenFx(this.stage.el));
    this.bubbles = this.overlay.add(new SpeechBubbles());
    this.successFx = this.overlay.add(new SuccessEffect());
    this.missFx = this.overlay.add(new MissEffect());
    this.hypeFx = this.overlay.add(new CrowdHypeEffect());
    this.cutin = this.overlay.add(new SpecialActionEffect());
    this.toast = this.overlay.add(new Toast());
    this.giftFly = this.overlay.add(new GiftFly(this.stage.el));

    // ---- modals
    this.modal = this.stage.add(new DomLayer('ModalLayer', 'modal'));
    this.title = this.modal.add(new TitleMenu());
    this.createPanel = this.modal.add(new RoomCreatePanel());
    this.joinPanel = this.modal.add(new RoomJoinPanel());
    this.waitPanel = this.modal.add(new WaitingRoomPanel());
    this.resultPanel = this.modal.add(new ResultPanel());
    this.howto = this.modal.add(new HowToPanel());
    this.discPanel = this.modal.add(new DisconnectPanel());
    this.storyMap = this.modal.add(new StoryMapPanel());
    this.dialogue = this.modal.add(new DialogueView());

    // ---- transitions
    this.transition = this.stage.add(new DomLayer('TransitionLayer', 'transition'));
    this.intro = this.transition.add(new IntroZoom());
    this.vs = this.transition.add(new MatchStartTransition());
    this.resultTrans = this.transition.add(new ResultTransition());

    this.fit();
    window.addEventListener('resize', () => this.fit());
    window.addEventListener('orientationchange', () => setTimeout(() => this.fit(), 200));
  }

  fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const portrait = vh > vw * 1.05;
    this.el.classList.toggle('portrait', portrait);
    let w, hgt;
    if (portrait) {
      // tall 9:16 stage: HUD on top, the alley band in the middle, big thumb pad below
      // use the whole phone height (up to ~9:21), world band zoomed 1.25x (225 world px tall)
      w = Math.min(vw, vh * 9 / 16);
      hgt = Math.min(vh, w * 21 / 9);
      const p = w / 320, hw = hgt / p;
      const wt = Math.round(Math.max(138, Math.min(190, (hw - 225) * 0.32)));
      this.el.style.setProperty('--wt', (wt * p) + 'px');
    } else {
      w = Math.min(vw, vh * 16 / 9);
      // prefer crisp integer-ish pixel scale when there's room
      const scale = w / 320;
      if (scale > 2) w = Math.floor(scale * 2) / 2 * 320;
      hgt = w * 9 / 16;
      this.el.style.setProperty('--wt', '0px');
    }
    const s = this.stage.el.style;
    s.width = w + 'px'; s.height = hgt + 'px';
    this.el.style.setProperty('--px', (w / 320) + 'px');
    this.el.style.setProperty('--p', (w / 320) + 'px');
  }

  /** camera zoom on the world (intro dive landing) */
  zoomWorld(from, ms) {
    const s = this.worldWrap.el.style;
    s.transition = 'none'; s.transform = `scale(${from})`;
    void this.worldWrap.el.offsetWidth;
    s.transition = `transform ${ms}ms cubic-bezier(.2,.9,.25,1.08)`; s.transform = 'scale(1)';
  }

  /** sepia-ish memory tint over the world (story flashbacks) */
  setFlashback(on) { this.el.classList.toggle('flashback', !!on); }

  update(t, dt) { super.update(t, dt); }
}
