// Cat sprite factory.
// Every cat is drawn from parametric poses (ears / eyes / mouth / paws / tail
// / body shape) into a label grid, then colored by breed pattern.
// => one drawing routine, dozens of breeds, hundreds of expressions.
import { Grid, L, P, renderGrid, hex, mix, shade, hash2, makeCanvas } from './pixel.js';

// ---------------------------------------------------------------- breeds
const B = (o) => ({
  light: '#f4efe6', earIn: '#f59ab8', nose: '#ef6f9c', pattern: 'solid', acc: null,
  accColor: '#ff3ea5', accColor2: '#ffd23e', glow: '#43e8ff', eyes: ['#9dff5a', '#9dff5a'],
  voice: 'cat1a', pitch: 1, ...o,
});

export const BREEDS = {
  tama: B({ name: 'タマ', kind: 'チャトラ', fur: '#ffa24a', dark: '#d6612b', light: '#ffe6c2', pattern: 'tabby', eyes: ['#7dff6a', '#7dff6a'], acc: 'bandana', accColor: '#ff3e6c', accColor2: '#fff2f6', voice: 'cat1a', pitch: 1.0, bio: '元気がとりえの屋台育ち。' }),
  neo: B({ name: 'ネオ', kind: 'サバトラ', fur: '#a4acc4', dark: '#4e5577', light: '#eef1f8', pattern: 'tabby', eyes: ['#43e8ff', '#43e8ff'], acc: 'headphones', accColor: '#2b2f52', accColor2: '#43e8ff', voice: 'cat2a', pitch: 1.0, bio: 'ビートを刻むクール系DJ。' }),
  yoru: B({ name: 'ヨル', kind: 'クロ', fur: '#2e2944', dark: '#1f1b31', light: '#453e63', earIn: '#b9587e', nose: '#b9587e', pattern: 'solid', eyes: ['#ffe14a', '#ffe14a'], acc: 'bell', accColor: '#ff3ea5', accColor2: '#ffd23e', voice: 'cat3a', pitch: 0.95, bio: '夜の路地の主。鈴がチャーム。' }),
  mike: B({ name: 'ミケ', kind: 'ミケ', fur: '#fbf4ea', dark: '#2d2638', light: '#fffaf2', orange: '#ff9a3e', pattern: 'calico', eyes: ['#ffb13e', '#ffb13e'], acc: 'ribbon', accColor: '#ff5fa8', accColor2: '#ffd1e8', voice: 'cat_sweet_voice1', pitch: 1.05, bio: '看板娘。ウインクが必殺技。' }),
  yuki: B({ name: 'ユキ', kind: 'シロ', fur: '#f6f3ff', dark: '#cfc8ea', light: '#ffffff', earIn: '#ffb3cd', pattern: 'solid', eyes: ['#5ab8ff', '#ffd23e'], acc: 'scarf', accColor: '#7a6bff', accColor2: '#c5bcff', voice: 'female_cat1', pitch: 1.08, bio: 'オッドアイのおじょうさま。' }),
  hachi: B({ name: 'ハチ', kind: 'ハチワレ', fur: '#2b2638', dark: '#1d1a28', light: '#fbf8ff', earIn: '#d86a90', pattern: 'tuxedo', eyes: ['#9dff5a', '#9dff5a'], acc: 'shades', accColor: '#1d4a7a', accColor2: '#ff3ea5', voice: 'cat1b', pitch: 0.92, bio: 'サングラスの兄貴分。' }),
  luna: B({ name: 'ルナ', kind: 'シャム', fur: '#f3e3cc', dark: '#5a3f33', light: '#fff4e6', earIn: '#c88c8c', nose: '#5a3f33', pattern: 'siamese', eyes: ['#4fa8ff', '#4fa8ff'], acc: 'goggles', accColor: '#3a2f5c', accColor2: '#43e8ff', voice: 'cat_sweet_voice2', pitch: 1.0, bio: '改造ゴーグルのメカ好き。' }),
  piko: B({ name: 'ピコ', kind: 'サイバー', fur: '#b8b3e6', dark: '#6b64a8', light: '#e6e3ff', earIn: '#43e8ff', nose: '#ff3ea5', pattern: 'robo', eyes: ['#43e8ff', '#ff3ea5'], acc: 'antenna', accColor: '#6b64a8', accColor2: '#ff3ea5', glow: '#43e8ff', voice: 'cat_sweet_voice3', pitch: 1.12, bio: '電脳ネコ。バグるとごろごろ。' }),
  // audience-only breeds
  kiji: B({ name: 'キジ', kind: 'キジ白', fur: '#8d6a4a', dark: '#4a3526', light: '#f7efe4', pattern: 'kijishiro', eyes: ['#c7ff5a', '#c7ff5a'], voice: 'cat1c' }),
  sabi: B({ name: 'サビ', kind: 'サビ', fur: '#2d2430', dark: '#1d1720', light: '#3e3240', orange: '#c9652e', pattern: 'tortie', eyes: ['#ffb13e', '#ffb13e'], voice: 'cat3b' }),
  blue: B({ name: 'アオ', kind: 'ロシアンブルー', fur: '#7486ad', dark: '#56668d', light: '#9aa9ca', pattern: 'solid', eyes: ['#7dff6a', '#7dff6a'], voice: 'cat3c' }),
  punk: B({ name: 'パンク', kind: 'ネオン染め', fur: '#ff8fd0', dark: '#b93d8c', light: '#ffd6ef', pattern: 'tabby', eyes: ['#43e8ff', '#43e8ff'], voice: 'cat2b' }),
  cream: B({ name: 'クリーム', kind: 'クリーム', fur: '#ffdca8', dark: '#e7b173', light: '#fff4df', pattern: 'tabby', eyes: ['#5ab8ff', '#5ab8ff'], voice: 'cat_sweet_voice1' }),
  gray: B({ name: 'ハイ', kind: 'グレー', fur: '#8e8aa3', dark: '#6b6780', light: '#d8d5e6', pattern: 'solid', eyes: ['#ffe14a', '#ffe14a'], voice: 'old_cat1' }),
  boss: B({ name: 'ボス', kind: 'ボス猫', fur: '#6e5a4c', dark: '#3a2c24', light: '#d8c7b4', pattern: 'tabby', eyes: ['#ffe14a', '#ffe14a'], voice: 'old_cat2' }),
  choco: B({ name: 'ショコラ', kind: 'チョコ', fur: '#5a3a2e', dark: '#3a241c', light: '#c79a7e', pattern: 'solid', eyes: ['#ffb13e', '#ffb13e'], voice: 'cat5a' }),
};

export const PLAYER_CATS = ['tama', 'neo', 'yoru', 'mike', 'yuki', 'hachi', 'luna', 'piko'];
export const AUDIENCE_BREEDS = Object.keys(BREEDS);
export const AUDIENCE_ACCS = [null, null, null, 'headphones', 'bell', 'bandana', 'ribbon', 'shades', 'scarf', 'antenna', 'goggles', 'mohawk', 'bowtie', 'cap'];

// ---------------------------------------------------------------- big cat (front view, 44x44)
export const BIG = 44;
const M = (x) => 43 - x; // mirror column

function head(g, P0) {
  const hx = 22 + (P0.hx || 0), hy = 17 + (P0.hy || 0);
  g.anchor = { hx, hy };
  const o = (x) => x + (P0.hx || 0), v = (y) => y + (P0.hy || 0);
  // ears first (head covers their base)
  ears(g, P0.ears || 'up', o, v, P0.earTwitch || 0);
  // head + chubby cheeks
  g.ellipse(hx, hy, 10.4, 7.8, L.FUR, P.HEAD);
  g.ellipse(o(13), v(20.5), 2.6, 2.4, L.FUR, P.HEAD);
  g.ellipse(o(31), v(20.5), 2.6, 2.4, L.FUR, P.HEAD);
  // muzzle
  g.ellipse(hx, v(21.6), 3.6, 2.2, L.LIGHT, P.MUZZLE);
  eyes(g, P0.eyes || 'open', o, v, P0.look || 0, P0.lookY || 0);
  mouth(g, P0.mouth || 'w', o, v);
  if (P0.blush) { g.rect(o(12), v(21), 2, 1, L.BLUSH, P.HEAD); g.rect(o(30), v(21), 2, 1, L.BLUSH, P.HEAD); }
}

function ears(g, st, o, v, twitch) {
  const E = {
    up:   [[11, 14], [12.5, 2.5], [20, 9.5], [14, 11.5], [13.8, 5.5], [18, 9.8]],
    perk: [[12, 13], [13.5, 1], [20, 9], [14.5, 11], [14.5, 4], [18.5, 9.2]],
    side: [[11, 15], [8, 5], [18, 10], [12.5, 13], [10, 7.5], [16.5, 10.5]],
    back: [[11, 16], [4.5, 9], [16, 11], [11, 14], [7.5, 10.5], [14, 11.8]],
    flat: [[12, 16], [3, 13], [17, 11.5], [11, 14.5], [6, 13.2], [14.5, 12.4]],
  }[st] || null;
  const e = E;
  const L0 = e.map(([x, y]) => [o(x), v(y)]);
  let R0 = e.map(([x, y]) => [o(M(x) + 1) - 1, v(y)]);
  // mirror across 22: x -> 44 - x (continuous coords)
  R0 = e.map(([x, y]) => [o(44 - x), v(y)]);
  if (twitch) { R0 = R0.map(([x, y], i) => [x + (i === 1 || i === 4 ? 1.5 : 0), y + (i === 1 || i === 4 ? 1.5 : 0)]); }
  for (const s of [L0, R0]) {
    g.tri(s[0][0], s[0][1], s[1][0], s[1][1], s[2][0], s[2][1], L.FUR, P.EAR);
    g.tri(s[3][0], s[3][1], s[4][0], s[4][1], s[5][0], s[5][1], L.EAR_IN, P.EAR);
  }
}

function eyeAt(g, x0, y0, st, look, lookY, side) {
  const pup = (x, y) => g.set(x, y, L.PUPIL, P.HEAD);
  const lx = Math.max(-1, Math.min(1, Math.round(look))), ly = Math.max(-1, Math.min(0, Math.round(lookY)));
  switch (st) {
    case 'happy': // ^ ^
      g.pix([[x0, y0 + 2], [x0 + 1, y0 + 1], [x0 + 2, y0 + 1], [x0 + 3, y0 + 2]], L.LINE, P.HEAD); break;
    case 'closed': // content ‿
      g.pix([[x0, y0 + 1], [x0 + 1, y0 + 2], [x0 + 2, y0 + 2], [x0 + 3, y0 + 1]], L.LINE, P.HEAD); break;
    case 'squeeze': // > <
      if (side < 0) g.pix([[x0, y0], [x0 + 1, y0], [x0 + 2, y0 + 1], [x0 + 3, y0 + 2], [x0 + 2, y0 + 3], [x0 + 1, y0 + 4], [x0, y0 + 4]], L.LINE, P.HEAD);
      else g.pix([[x0 + 3, y0], [x0 + 2, y0], [x0 + 1, y0 + 1], [x0, y0 + 2], [x0 + 1, y0 + 3], [x0 + 2, y0 + 4], [x0 + 3, y0 + 4]], L.LINE, P.HEAD);
      break;
    case 'dizzy':
      g.pix([[x0, y0], [x0 + 3, y0], [x0 + 1, y0 + 1], [x0 + 2, y0 + 1], [x0 + 1, y0 + 2], [x0 + 2, y0 + 2], [x0, y0 + 3], [x0 + 3, y0 + 3]], L.LINE, P.HEAD); break;
    case 'sleepy':
      g.rect(x0, y0 + 2, 4, 1, L.LINE, P.HEAD);
      g.rect(x0 + 1, y0 + 3, 2, 1, L.PUPIL, P.HEAD); break;
    case 'wide':
      g.rect(x0, y0 - 1, 4, 5, L.PUPIL, P.HEAD);
      g.set(x0, y0 - 1, L.FUR, P.HEAD); g.set(x0 + 3, y0 - 1, L.FUR, P.HEAD);
      g.set(x0, y0 + 3, L.FUR, P.HEAD); g.set(x0 + 3, y0 + 3, L.FUR, P.HEAD);
      g.rect(x0 + 1 + (lx > 0 ? 1 : 0), y0, 1, 1, L.SHINE, P.HEAD);
      g.set(x0 + 2 - (lx < 0 ? 1 : 0), y0 + 2, L.SHINE, P.HEAD);
      break;
    case 'tiny': // shocked dot eyes
      g.rect(x0 + 1, y0 + 1, 2, 2, L.PUPIL, P.HEAD); break;
    case 'star':
      g.rect(x0, y0, 4, 4, L.GOLD, P.HEAD);
      g.set(x0, y0, L.FUR, P.HEAD); g.set(x0 + 3, y0, L.FUR, P.HEAD); g.set(x0, y0 + 3, L.FUR, P.HEAD); g.set(x0 + 3, y0 + 3, L.FUR, P.HEAD);
      g.set(x0 + 1, y0 + 1, L.WHITE, P.HEAD); g.set(x0 + 2, y0 + 2, L.WHITE, P.HEAD);
      break;
    case 'heart':
      g.pix([[x0, y0], [x0 + 1, y0 + 1], [x0 + 2, y0 + 1], [x0 + 3, y0], [x0, y0 + 1], [x0 + 3, y0 + 1], [x0 + 1, y0 + 2], [x0 + 2, y0 + 2], [x0 + 1, y0], [x0 + 2, y0]], L.TONGUE, P.HEAD);
      g.set(x0 + 1, y0, L.FUR, P.HEAD); g.set(x0 + 2, y0, L.FUR, P.HEAD);
      g.set(x0 + 1, y0 + 3, L.TONGUE, P.HEAD); g.set(x0 + 2, y0 + 3, L.TONGUE, P.HEAD);
      break;
    case 'tear':
    case 'focus':
    case 'open':
    default: {
      // 4x4 rounded eye: colored iris, 2x2 pupil, shine
      g.rect(x0, y0, 4, 4, L.EYE, P.HEAD);
      g.set(x0, y0, L.FUR, P.HEAD); g.set(x0 + 3, y0, L.FUR, P.HEAD);
      g.set(x0, y0 + 3, L.FUR, P.HEAD); g.set(x0 + 3, y0 + 3, L.FUR, P.HEAD);
      g.rect(x0, y0 + 1, 4, 2, L.EYE, P.HEAD);
      const px = x0 + 1 + lx, py = y0 + 1 + ly;
      g.rect(px, py, 2, 2, L.PUPIL, P.HEAD);
      g.set(px, py, L.SHINE, P.HEAD);
      if (st === 'tear') {
        g.set(px + 1, py + 1, L.SHINE, P.HEAD);
        g.set(x0 + (side < 0 ? 0 : 3), y0 + 4, L.TEAR, P.HEAD);
        g.set(x0 + (side < 0 ? 0 : 3), y0 + 5, L.TEAR, P.HEAD);
        g.set(x0 + (side < 0 ? -1 : 4), y0 + 6, L.TEAR, P.HEAD);
      }
      if (st === 'focus') { // determined brows
        if (side < 0) g.pix([[x0, y0 - 2], [x0 + 1, y0 - 2], [x0 + 2, y0 - 1], [x0 + 3, y0 - 1]], L.LINE, P.HEAD);
        else g.pix([[x0 + 3, y0 - 2], [x0 + 2, y0 - 2], [x0 + 1, y0 - 1], [x0, y0 - 1]], L.LINE, P.HEAD);
      }
    }
  }
}

function eyes(g, st, o, v, look, lookY) {
  let stL = st, stR = st;
  if (st === 'wink') { stL = 'open'; stR = 'happy'; }
  eyeAt(g, o(15), v(15), stL, look, lookY, -1);
  eyeAt(g, o(25), v(15), stR, look, lookY, 1);
}

function mouth(g, st, o, v) {
  const N = () => { g.set(o(21), v(20), L.NOSE, P.MUZZLE); g.set(o(22), v(20), L.NOSE, P.MUZZLE); };
  N();
  const Lp = (pts) => g.pix(pts.map(([x, y]) => [o(x), v(y)]), L.LINE, P.MUZZLE);
  switch (st) {
    case 'nya': // big open "にゃー!"
      Lp([[19, 21], [24, 21]]);
      g.rect(o(20), v(21), 4, 1, L.LINE, P.MUZZLE);
      g.rect(o(19), v(22), 6, 3, L.MOUTH, P.MUZZLE);
      g.rect(o(20), v(25), 4, 1, L.MOUTH, P.MUZZLE);
      g.rect(o(20), v(24), 4, 2, L.TONGUE, P.MUZZLE);
      g.set(o(20), v(22), L.WHITE, P.MUZZLE); g.set(o(23), v(22), L.WHITE, P.MUZZLE); // fangs
      Lp([[18, 22], [18, 23], [25, 22], [25, 23], [19, 25], [24, 25], [20, 26], [21, 26], [22, 26], [23, 26]]);
      break;
    case 'o':
      Lp([[21, 21], [22, 21], [20, 22], [23, 22], [20, 23], [23, 23], [21, 24], [22, 24]]);
      g.rect(o(21), v(22), 2, 2, L.MOUTH, P.MUZZLE);
      break;
    case 'grin':
      Lp([[18, 21], [25, 21]]);
      g.rect(o(19), v(22), 6, 1, L.LINE, P.MUZZLE);
      g.rect(o(19), v(21), 6, 1, L.MOUTH, P.MUZZLE);
      g.rect(o(21), v(21), 2, 1, L.LINE, P.MUZZLE);
      g.set(o(20), v(21), L.TONGUE, P.MUZZLE); g.set(o(23), v(21), L.TONGUE, P.MUZZLE);
      break;
    case 'frown':
      Lp([[21, 21], [22, 21], [20, 22], [23, 22], [19, 23], [24, 23]]);
      break;
    case 'wavy':
      Lp([[19, 22], [20, 21], [21, 22], [22, 22], [23, 21], [24, 22]]);
      break;
    case 'flat':
      Lp([[20, 22], [21, 22], [22, 22], [23, 22]]);
      break;
    case 'smug':
      Lp([[21, 21], [22, 22], [23, 22], [24, 21]]);
      break;
    case 'w':
    default:
      Lp([[21, 21], [22, 21], [19, 21], [24, 21], [20, 22], [23, 22]]);
  }
}

function tail(g, P0, base, mode) {
  const t = P0.tail || 0; // phase 0..1
  const s = Math.sin(t * Math.PI * 2), c = Math.cos(t * Math.PI * 2);
  let pts;
  const [bx, by] = base;
  if (mode === 'down') pts = [[bx, by], [bx + 5, by + 1], [bx + 9, by - 0 + s], [bx + 11, by - 1 + s]];
  else if (mode === 'puff') pts = [[bx, by], [bx + 5, by - 3], [bx + 7, by - 9 + s], [bx + 7 + c, by - 14]];
  else pts = [[bx, by], [bx + 6, by - 1], [bx + 9 + s, by - 6], [bx + 8 + 2 * s, by - 11 + c]];
  const thick = mode === 'puff' ? 3 : 2;
  for (let i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], L.FUR, P.TAIL, thick);
  const e = pts[pts.length - 1];
  g.ellipse(e[0], e[1] - 0.5, thick === 3 ? 2 : 1.3, thick === 3 ? 2 : 1.3, L.FUR, P.TAIL);
}

function arm(g, sx, sy, ex, ey) {
  g.line(sx, sy, ex, ey, L.FUR, P.LEG, 3);
  g.ellipse(ex, ey, 1.8, 1.8, L.LIGHT, P.LEG);
}

function sitBody(g, P0) {
  const sq = P0.squash || 0; // + = squat
  const by = 33 + sq * 0.8 + (P0.by || 0);
  const tailMode = P0.tailMode || 'up';
  tail(g, P0, [29, 39 + (P0.by || 0)], tailMode);
  g.ellipse(22, by, 8.6 + sq * 0.6, 8 - sq * 0.4, L.FUR, P.BODY);
  // haunches
  g.ellipse(14.5, 38.5 + (P0.by || 0) * 0.5, 3.4, 2.8, L.FUR, P.BODY);
  g.ellipse(29.5, 38.5 + (P0.by || 0) * 0.5, 3.4, 2.8, L.FUR, P.BODY);
  g.ellipse(22, by + 2, 4.4, 5.2, L.LIGHT, P.BODY, true);
  const paws = P0.paws || 'down';
  const py = 40.2 + Math.min(0, (P0.by || 0));
  const pawL = () => { g.ellipse(18.5, py, 2.3, 1.6, L.LIGHT, P.LEG); g.set(17, py + 1, L.LINE, P.LEG); g.set(19, py + 1, L.LINE, P.LEG); g.set(21, py, L.LINE, P.LEG); g.set(21, py + 1, L.LINE, P.LEG); };
  const pawR = () => { g.ellipse(25.5, py, 2.3, 1.6, L.LIGHT, P.LEG); g.set(24, py + 1, L.LINE, P.LEG); g.set(26, py + 1, L.LINE, P.LEG); g.set(22, py, L.LINE, P.LEG); g.set(22, py + 1, L.LINE, P.LEG); };
  const shoulderY = by - 3;
  if (paws === 'down') { pawL(); pawR(); }
  if (paws === 'upL') { pawR(); arm(g, 16, shoulderY, 11, shoulderY - 6); }
  if (paws === 'upR') { pawL(); arm(g, 28, shoulderY, 33, shoulderY - 6); }
  if (paws === 'upBoth') { arm(g, 16, shoulderY, 9, shoulderY - 9); arm(g, 28, shoulderY, 35, shoulderY - 9); }
  if (paws === 'wave') { pawR(); arm(g, 16, shoulderY, 9, shoulderY - 3); }
  if (paws === 'face') { arm(g, 16, shoulderY + 1, 17, shoulderY - 6); arm(g, 28, shoulderY + 1, 27, shoulderY - 6); }
  if (paws === 'chest') { g.ellipse(19, shoulderY + 1, 2, 1.8, L.LIGHT, P.LEG); g.ellipse(25, shoulderY + 1, 2, 1.8, L.LIGHT, P.LEG); }
}

function standBody(g, P0) {
  // standing on hind legs, arms up: joy / victory
  const lift = P0.lift || 0;
  tail(g, P0, [28, 38 - lift], 'puff');
  g.ellipse(22, 31 - lift, 7.4, 8.4, L.FUR, P.BODY);
  g.ellipse(22, 32 - lift, 4, 5.8, L.LIGHT, P.BODY, true);
  // legs
  g.rect(17, 37 - lift, 4, 5, L.FUR, P.LEG); g.rect(23, 37 - lift, 4, 5, L.FUR, P.LEG);
  g.ellipse(18.5, 41.5 - lift, 2.5, 1.3, L.LIGHT, P.LEG); g.ellipse(25.5, 41.5 - lift, 2.5, 1.3, L.LIGHT, P.LEG);
  const a = P0.arms || 'up';
  if (a === 'up') { arm(g, 16, 27 - lift, 9, 17 - lift); arm(g, 28, 27 - lift, 35, 17 - lift); }
  if (a === 'alt0') { arm(g, 16, 27 - lift, 10, 16 - lift); arm(g, 28, 27 - lift, 34, 26 - lift); }
  if (a === 'alt1') { arm(g, 16, 27 - lift, 10, 26 - lift); arm(g, 28, 27 - lift, 34, 16 - lift); }
  if (a === 'wide') { arm(g, 16, 27 - lift, 7, 24 - lift); arm(g, 28, 27 - lift, 37, 24 - lift); }
}

function loafBody(g, P0) {
  // sad / sleepy loaf: low wide body
  tail(g, P0, [30, 40], 'down');
  g.ellipse(22, 36, 11, 5.6, L.FUR, P.BODY);
  g.ellipse(22, 38, 5, 3, L.LIGHT, P.BODY, true);
  g.ellipse(17.5, 41, 2.4, 1.2, L.LIGHT, P.LEG); g.ellipse(26.5, 41, 2.4, 1.2, L.LIGHT, P.LEG);
}

// Curled "ball" (for rolling). Drawn upright; caller rotates 90deg steps.
function ballBody(g, P0) {
  g.ellipse(22, 27, 12, 11.5, L.FUR, P.BODY);
  g.ellipse(22, 31, 7, 5.5, L.LIGHT, P.BODY, true);
  // tucked paws & tail wrap
  g.ellipse(17, 35, 2.4, 1.6, L.LIGHT, P.LEG); g.ellipse(27, 35, 2.4, 1.6, L.LIGHT, P.LEG);
  g.line(10, 33, 22, 38, L.FUR, P.TAIL, 2); g.line(22, 38, 32, 35, L.FUR, P.TAIL, 2);
  // small face inside the ball
  const hx = 22, hy = 22;
  g.tri(13, 17, 13.5, 9.5, 19, 14, L.FUR, P.EAR); g.tri(31, 17, 30.5, 9.5, 25, 14, L.FUR, P.EAR);
  g.tri(14.4, 15.4, 14.4, 12, 17.4, 14.2, L.EAR_IN, P.EAR); g.tri(29.6, 15.4, 29.6, 12, 26.6, 14.2, L.EAR_IN, P.EAR);
  g.ellipse(hx, hy, 8.5, 6.5, L.FUR, P.HEAD);
  g.ellipse(hx, hy + 3.5, 3, 1.8, L.LIGHT, P.MUZZLE);
  g.anchor = { hx, hy };
  const e = P0.eyes || 'closed';
  const o = (x) => x, v = (y) => y + 5;
  eyeAt(g, 16, 20, e, 0, 0, -1); eyeAt(g, 24, 20, e, 0, 0, 1);
  g.set(21, 24, L.NOSE, P.MUZZLE); g.set(22, 24, L.NOSE, P.MUZZLE);
  if (P0.mouth === 'nya') { g.rect(20, 25, 4, 2, L.MOUTH, P.MUZZLE); g.rect(21, 26, 2, 1, L.TONGUE, P.MUZZLE); }
  else g.pix([[20, 25], [23, 25], [21, 25], [22, 25]].slice(0, 2), L.LINE, P.MUZZLE);
  void o; void v;
}

// Belly-up (the cutest). Head on the left, paws in the air.
function bellyBody(g, P0) {
  const w = P0.wiggle || 0;
  // body horizontal
  g.line(34, 36, 40, 33 + w, L.FUR, P.TAIL, 2);
  g.ellipse(26, 34, 11, 6.5, L.FUR, P.BODY);
  g.ellipse(26, 32.5, 7, 3.6, L.LIGHT, P.BODY, true);
  // paws up
  arm(g, 21, 30, 19 - w, 23); arm(g, 26, 30, 27 + w, 23);
  arm(g, 31, 31, 32, 24 + w); arm(g, 35, 32, 37 + w, 26);
  // head (upright-ish, tilted) on the left
  const Q = { ...P0, hx: -10, hy: 12 };
  head(g, Q);
}

// ---------------------------------------------------------------- accessories
function accessory(g, acc, P0) {
  if (!acc) return;
  const o = (x) => x + (P0.hx || 0), v = (y) => y + (P0.hy || 0);
  const neckY = 25 + (P0.hy || 0) * 0.5 + (P0.pose === 'loaf' ? 3 : 0);
  switch (acc) {
    case 'headphones':
      for (let x = 13; x <= 30; x++) {
        const t = (x - 21.5) / 9;
        const y = v(9.5 + Math.round(t * t * 4));
        g.set(o(x), y, L.ACC1, P.HEAD);
      }
      g.rect(o(9), v(14), 3, 6, L.ACC1, P.HEAD); g.rect(o(32), v(14), 3, 6, L.ACC1, P.HEAD);
      g.rect(o(10), v(15), 1, 4, L.GLOW, P.HEAD); g.rect(o(33), v(15), 1, 4, L.GLOW, P.HEAD);
      break;
    case 'bell':
      g.rect(o(15), neckY, 14, 1, L.ACC1, P.BODY);
      g.rect(o(21), neckY + 1, 2, 2, L.GOLD, P.BODY);
      g.set(o(21), neckY + 3, L.LINE, P.BODY);
      break;
    case 'bandana':
      g.rect(o(15), neckY, 14, 1, L.ACC1, P.BODY);
      g.tri(o(16), neckY + 0.5, o(28), neckY + 0.5, o(22), neckY + 5, L.ACC1, P.BODY);
      g.set(o(20), neckY + 1, L.ACC2, P.BODY); g.set(o(23), neckY + 2, L.ACC2, P.BODY); g.set(o(22), neckY + 1, L.ACC2, P.BODY);
      break;
    case 'bowtie':
      g.tri(o(18), neckY - 1, o(18), neckY + 3, o(22), neckY + 1, L.ACC1, P.BODY);
      g.tri(o(26), neckY - 1, o(26), neckY + 3, o(22), neckY + 1, L.ACC1, P.BODY);
      g.rect(o(21), neckY, 2, 2, L.ACC2, P.BODY);
      break;
    case 'scarf':
      g.rect(o(14), neckY - 1, 16, 3, L.ACC1, P.BODY);
      g.rect(o(14), neckY, 16, 1, L.ACC2, P.BODY);
      g.rect(o(26), neckY + 1, 3, 6, L.ACC1, P.BODY);
      g.set(o(27), neckY + 3, L.ACC2, P.BODY);
      break;
    case 'ribbon':
      g.tri(o(26), v(9), o(26), v(14), o(29.5), v(11.5), L.ACC1, P.HEAD);
      g.tri(o(33), v(9), o(33), v(14), o(29.5), v(11.5), L.ACC1, P.HEAD);
      g.rect(o(29), v(11), 2, 2, L.ACC2, P.HEAD);
      break;
    case 'shades':
      g.rect(o(14), v(15), 6, 3, L.ACC1, P.HEAD); g.rect(o(24), v(15), 6, 3, L.ACC1, P.HEAD);
      g.rect(o(20), v(15), 4, 1, L.ACC1, P.HEAD);
      g.set(o(15), v(15), L.ACC2, P.HEAD); g.set(o(25), v(15), L.ACC2, P.HEAD);
      g.set(o(16), v(16), L.WHITE, P.HEAD); g.set(o(26), v(16), L.WHITE, P.HEAD);
      break;
    case 'goggles':
      g.rect(o(11), v(11), 22, 2, L.ACC1, P.HEAD);
      g.ellipse(o(16.5), v(11), 2.6, 1.8, L.ACC1, P.HEAD); g.ellipse(o(27.5), v(11), 2.6, 1.8, L.ACC1, P.HEAD);
      g.rect(o(15), v(10), 3, 2, L.GLOW, P.HEAD); g.rect(o(26), v(10), 3, 2, L.GLOW, P.HEAD);
      g.set(o(15), v(10), L.WHITE, P.HEAD); g.set(o(26), v(10), L.WHITE, P.HEAD);
      break;
    case 'antenna':
      g.line(o(22), v(9), o(22), v(3), L.ACC1, P.HEAD);
      g.rect(o(21), v(1), 3, 3, L.GLOW, P.HEAD);
      g.set(o(21), v(1), L.WHITE, P.HEAD);
      g.rect(o(12), v(18), 2, 1, L.GLOW, P.HEAD); g.rect(o(30), v(18), 2, 1, L.GLOW, P.HEAD);
      break;
    case 'mohawk':
      for (let i = 0; i < 4; i++) g.tri(o(18 + i * 2), v(10), o(20 + i * 2), v(10), o(19.5 + i * 2), v(4 - (i % 2)), L.ACC2, P.HEAD);
      break;
    case 'cap':
      g.ellipse(o(22), v(10), 8, 3, L.ACC1, P.HEAD);
      g.rect(o(22), v(10), 12, 2, L.ACC1, P.HEAD);
      g.set(o(22), v(8), L.ACC2, P.HEAD);
      break;
    case 'crown':
      g.rect(o(16), v(6), 12, 3, L.GOLD, P.HEAD);
      g.tri(o(16), v(6.5), o(18), v(6.5), o(16.5), v(1.5), L.GOLD, P.HEAD);
      g.tri(o(20.5), v(6.5), o(23.5), v(6.5), o(22), v(0.5), L.GOLD, P.HEAD);
      g.tri(o(26), v(6.5), o(28), v(6.5), o(27.5), v(1.5), L.GOLD, P.HEAD);
      g.set(o(19), v(7), L.ACC2, P.HEAD); g.set(o(22), v(7), L.TONGUE, P.HEAD); g.set(o(25), v(7), L.GLOW, P.HEAD);
      break;
  }
}

// ---------------------------------------------------------------- coloring
function smooth(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}

const colorCache = new Map();
function C(h) { let c = colorCache.get(h); if (!c) { c = hex(h); colorCache.set(h, c); } return c; }

function lum(h) { const c = hex(h); return (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255; }

function makeColorFn(br, seed, dim = 1, glowPupils = false) {
  const fur = C(br.fur), dark = C(br.dark), light = C(br.light);
  const orange = br.orange ? C(br.orange) : dark;
  const eyesC = br.eyes.map(C);
  const common = {
    [L.EAR_IN]: C(br.earIn), [L.NOSE]: C(br.nose), [L.LINE]: C('#241634'), [L.PUPIL]: glowPupils && lum(br.fur) < 0.35 ? eyesC[0] : C('#140c22'),
    [L.SHINE]: C('#ffffff'), [L.WHITE]: C('#fffdf6'), [L.MOUTH]: C('#6a1c3a'), [L.TONGUE]: C('#ff7aa8'),
    [L.BLUSH]: C('#ff8fb8'), [L.TEAR]: C('#8fe4ff'), [L.ACC1]: C(br.accColor), [L.ACC2]: C(br.accColor2),
    [L.GLOW]: C(br.glow), [L.PAD]: C('#ff9bbd'), [L.GOLD]: C('#ffd23e'), [L.DARK]: C('#141026'),
  };
  return (l, part, x, y, g) => {
    let c;
    if (l === L.EYE) c = eyesC[x < g.anchor.hx ? 0 : 1];
    else if (l === L.FUR || l === L.LIGHT) c = coat(br, l, part, x, y, g, fur, dark, light, orange, seed);
    else c = common[l];
    if (!c) return null;
    return dim !== 1 ? shade(c, dim) : c;
  };
}

function coat(br, l, part, x, y, g, fur, dark, light, orange, seed) {
  const { hx, hy } = g.anchor;
  const dx = x - hx, dy = y - hy;
  switch (br.pattern) {
    case 'tabby': {
      if (l === L.LIGHT) return light;
      if (part === P.HEAD) {
        if (dy < -3 && dy > -9 && (dx === -3 || dx === 0 || dx === 2) && !(dx === 0 && dy < -7)) return dark;
        if (Math.abs(dx) > 7 && (dy === 1 || dy === 3)) return dark;
        return fur;
      }
      if (part === P.TAIL) return ((x + y) % 4 === 0) ? dark : fur;
      if (part === P.BODY || part === P.LEG) {
        const k = Math.abs(dx) * 0.55 + y;
        if (Math.abs(dx) > 3 && (Math.floor(k) % 4 === 0)) return dark;
        return fur;
      }
      return fur;
    }
    case 'calico': {
      if (part === P.MUZZLE) return light;
      if (part === P.EAR) return x < hx ? orange : dark;
      if (part === P.HEAD) {
        if (dx < -2 && dy < 1) return orange;
        if (dx > 4 && dy < -2) return dark;
        return fur;
      }
      if (l === L.LIGHT) return light;
      const n = smooth(x / 5, y / 5, seed);
      if (n > 0.66) return orange;
      if (n < 0.26) return dark;
      return fur;
    }
    case 'tuxedo': {
      if (l === L.LIGHT) return light;
      if (part === P.HEAD || part === P.MUZZLE) {
        if (dy > -4 && Math.abs(dx) < (dy + 4) * 0.8) return light;
        return fur;
      }
      if (part === P.LEG) return light;
      return fur;
    }
    case 'siamese': {
      if (part === P.EAR || part === P.TAIL || part === P.LEG) return dark;
      if (part === P.MUZZLE) return mix(dark, fur, 0.25);
      if (part === P.HEAD) {
        const d = Math.hypot(dx * 0.9, (dy - 3) * 1.1);
        if (d < 4.5) return mix(dark, fur, 0.35);
        if (d < 6) return mix(dark, fur, 0.7);
        return fur;
      }
      return l === L.LIGHT ? light : fur;
    }
    case 'kijishiro': {
      if (l === L.LIGHT || part === P.LEG || part === P.MUZZLE) return light;
      if (part === P.HEAD && dy > 1 && Math.abs(dx) < 6) return light;
      if (part === P.HEAD && dy < -3 && (dx === -3 || dx === 0 || dx === 2)) return dark;
      if ((part === P.BODY || part === P.TAIL) && (Math.floor(Math.abs(dx) * 0.5 + y) % 3 === 0)) return dark;
      return fur;
    }
    case 'tortie': {
      if (l === L.LIGHT) return light;
      const n = hash2(x >> 1, y >> 1, seed) + smooth(x / 4, y / 4, seed + 3) * 0.6;
      return n > 1.05 ? orange : n > 0.95 ? mix(orange, fur, 0.5) : fur;
    }
    case 'robo': {
      if (l === L.LIGHT) return light;
      if (part === P.HEAD && dy === -4 && Math.abs(dx) < 6) return dark;
      if (part === P.BODY && (y % 5 === 0)) return dark;
      if (part === P.EAR) return dark;
      return fur;
    }
    default:
      return l === L.LIGHT ? light : fur;
  }
}

// ---------------------------------------------------------------- public API
const cache = new Map();

/**
 * pose: { pose:'sit'|'stand'|'loaf'|'ball'|'belly', ears, eyes, mouth, paws,
 *         arms, tail(0..1), tailMode, hx, hy, by, squash, lift, look, blush, rot, earTwitch, wiggle }
 */
export function bigCat(breedId, pose = {}, flip = false, opt = {}) {
  const br = BREEDS[breedId] || BREEDS.tama;
  const acc = opt.acc === undefined ? br.acc : opt.acc;
  const key = 'B|' + breedId + '|' + acc + '|' + flip + '|' + (opt.dim || 1) + '|' + JSON.stringify(pose) + '|' + (opt.crown ? 1 : 0);
  let cv = cache.get(key);
  if (cv) return cv;
  let g = new Grid(BIG, BIG);
  const kind = pose.pose || 'sit';
  const P0 = { ...pose };
  if (kind === 'sit') { sitBody(g, P0); head(g, P0); }
  else if (kind === 'stand') { standBody(g, P0); head(g, { ...P0, hy: (P0.hy || 0) - (P0.lift || 0) - 2 }); P0.hy = (P0.hy || 0) - (P0.lift || 0) - 2; }
  else if (kind === 'loaf') { loafBody(g, P0); P0.hy = (P0.hy || 0) + 5; head(g, P0); }
  else if (kind === 'ball') ballBody(g, P0);
  else if (kind === 'belly') { bellyBody(g, P0); P0.hx = -10; P0.hy = 12; }
  if (kind !== 'ball') accessory(g, acc, { ...P0, pose: kind });
  if (opt.crown && kind !== 'ball') accessory(g, 'crown', P0);
  if (pose.rot) g = g.rot90(pose.rot);
  if (flip) g = g.flipX();
  cv = renderGrid(g, makeColorFn(br, breedId.length * 7, opt.dim || 1), { rim: opt.rim ?? 0.3 });
  cache.set(key, cv);
  return cv;
}

// ---------------------------------------------------------------- small cat (audience, 20x20)
export const SMALL = 20;
function smallHead(g, Q) {
  const hy = 8 + (Q.hy || 0), hx = 10 + (Q.hx || 0);
  g.anchor = { hx, hy };
  const o = (x) => x + (Q.hx || 0), v = (y) => y + (Q.hy || 0);
  const ear = Q.ears || 'up';
  if (ear === 'flat') { g.tri(o(4), v(8), o(0.5), v(5), o(8), v(5), L.FUR, P.EAR); g.tri(o(16), v(8), o(19.5), v(5), o(12), v(5), L.FUR, P.EAR); }
  else {
    const up = ear === 'perk' ? 1 : 0;
    g.tri(o(3.5), v(8), o(4.5), v(0.5 - up), o(9), v(4), L.FUR, P.EAR); g.tri(o(16.5), v(8), o(15.5), v(0.5 - up), o(11), v(4), L.FUR, P.EAR);
    g.set(o(5), v(3), L.EAR_IN, P.EAR); g.set(o(5), v(4), L.EAR_IN, P.EAR); g.set(o(14), v(3), L.EAR_IN, P.EAR); g.set(o(14), v(4), L.EAR_IN, P.EAR);
  }
  g.ellipse(hx, hy, 6.4, 4.8, L.FUR, P.HEAD);
  g.ellipse(hx, hy + 2.6, 2, 1.1, L.LIGHT, P.MUZZLE);
  const e = Q.eyes || 'open';
  const lx = Q.look || 0;
  const E = (x) => {
    if (e === 'open') { g.rect(o(x) + lx, v(7), 1, 2, L.PUPIL, P.HEAD); }
    else if (e === 'wide') { g.rect(o(x) - 1 + (lx > 0 ? 1 : 0), v(7), 2, 2, L.PUPIL, P.HEAD); g.set(o(x) - 1 + (lx > 0 ? 1 : 0), v(7), L.SHINE, P.HEAD); }
    else if (e === 'happy') { g.pix([[o(x) - 1, v(8)], [o(x), v(7)], [o(x) + 1, v(8)]], L.LINE, P.HEAD); }
    else if (e === 'closed') { g.pix([[o(x) - 1, v(8)], [o(x), v(8)], [o(x) + 1, v(8)]], L.LINE, P.HEAD); }
    else if (e === 'glow') { g.rect(o(x), v(7), 1, 2, L.EYE, P.HEAD); }
    else if (e === 'tear') { g.rect(o(x), v(7), 1, 2, L.PUPIL, P.HEAD); g.set(o(x), v(10), L.TEAR, P.HEAD); }
  };
  E(7); E(12);
  const m = Q.mouth || 'w';
  if (m === 'o' || m === 'nya') { g.rect(o(9), v(10), 2, m === 'nya' ? 2 : 1, L.MOUTH, P.MUZZLE); }
  else { g.set(o(9), v(10), L.NOSE, P.MUZZLE); g.set(o(10), v(10), L.NOSE, P.MUZZLE); }
  if (Q.blush) { g.set(o(5), v(9), L.BLUSH, P.HEAD); g.set(o(14), v(9), L.BLUSH, P.HEAD); }
}
function smallAcc(g, acc, Q) {
  const o = (x) => x + (Q.hx || 0), v = (y) => y + (Q.hy || 0);
  switch (acc) {
    case 'headphones': for (let x = 5; x <= 14; x++) g.set(o(x), v(x < 7 || x > 12 ? 3 : 2), L.ACC1, P.HEAD); g.rect(o(2), v(7), 2, 3, L.ACC1, P.HEAD); g.rect(o(16), v(7), 2, 3, L.ACC1, P.HEAD); g.set(o(2), v(8), L.GLOW, P.HEAD); g.set(o(17), v(8), L.GLOW, P.HEAD); break;
    case 'bell': case 'bandana': case 'scarf': case 'bowtie': g.rect(o(6), v(13), 8, 1, L.ACC1, P.BODY); if (acc === 'bell') g.set(o(9), v(14), L.GOLD, P.BODY); if (acc === 'bandana') g.rect(o(9), v(14), 2, 1, L.ACC1, P.BODY); break;
    case 'ribbon': g.rect(o(13), v(3), 3, 2, L.ACC1, P.HEAD); g.set(o(14), v(3), L.ACC2, P.HEAD); break;
    case 'shades': g.rect(o(5), v(7), 4, 2, L.ACC1, P.HEAD); g.rect(o(11), v(7), 4, 2, L.ACC1, P.HEAD); g.rect(o(9), v(7), 2, 1, L.ACC1, P.HEAD); g.set(o(6), v(7), L.WHITE, P.HEAD); break;
    case 'antenna': g.line(o(10), v(3), o(10), v(0), L.ACC1, P.HEAD); g.set(o(10), v(0), L.GLOW, P.HEAD); g.set(o(9), v(0), L.GLOW, P.HEAD); break;
    case 'goggles': g.rect(o(4), v(4), 12, 1, L.ACC1, P.HEAD); g.rect(o(6), v(4), 2, 1, L.GLOW, P.HEAD); g.rect(o(12), v(4), 2, 1, L.GLOW, P.HEAD); break;
    case 'mohawk': g.rect(o(9), v(1), 2, 3, L.ACC2, P.HEAD); g.set(o(8), v(2), L.ACC2, P.HEAD); g.set(o(11), v(2), L.ACC2, P.HEAD); break;
    case 'cap': g.rect(o(5), v(3), 10, 2, L.ACC1, P.HEAD); g.rect(o(10), v(4), 7, 1, L.ACC1, P.HEAD); break;
    case 'crown': g.rect(o(7), v(1), 6, 2, L.GOLD, P.HEAD); g.set(o(7), v(0), L.GOLD, P.HEAD); g.set(o(9), v(0), L.GOLD, P.HEAD); g.set(o(12), v(0), L.GOLD, P.HEAD); break;
  }
}

/** small pose: { pose:'sit'|'cheer'|'jump'|'stick'|'sad'|'sleep'|'peek', eyes, mouth, ears, arms(0|1), hy, look, stickColor } */
export function smallCat(breedId, pose = {}, flip = false, opt = {}) {
  const br = BREEDS[breedId] || BREEDS.gray;
  const acc = opt.acc === undefined ? null : opt.acc;
  const key = 'S|' + breedId + '|' + acc + '|' + flip + '|' + (opt.dim || 1) + '|' + JSON.stringify(pose);
  let cv = cache.get(key);
  if (cv) return cv;
  let g = new Grid(SMALL, SMALL + 2);
  const k = pose.pose || 'sit';
  const Q = { ...pose };
  if (k !== 'peek') {
    const lift = k === 'jump' ? 1 : 0;
    // tail
    const ts = pose.tail || 0;
    g.line(14, 18 - lift, 17, 16 - lift - ts, L.FUR, P.TAIL, 2);
    g.line(17, 16 - lift - ts, 17 + (ts ? 1 : 0), 12 - lift - ts, L.FUR, P.TAIL, 2);
    if (k === 'sad' || k === 'sleep') { g.ellipse(10, 17.5, 7, 3.4, L.FUR, P.BODY); Q.hy = (Q.hy || 0) + 3; }
    else g.ellipse(10, 15.5 - lift, 5.2, 4.8, L.FUR, P.BODY);
    g.ellipse(10, 17 - lift, 2.5, 2.8, L.LIGHT, P.BODY, true);
    if (k === 'cheer' || k === 'jump' || k === 'stick') {
      const a = pose.arms || 0;
      const up = (sx, ex, high) => { g.line(sx, 14 - lift, ex, high ? 8 - lift : 12 - lift, L.FUR, P.LEG, 2); g.set(ex, high ? 7 - lift : 11 - lift, L.LIGHT, P.LEG); };
      if (k === 'stick') {
        up(6, 3, a === 0); up(14, 17, a === 1);
        const sx = a === 0 ? 3 : 17;
        g.line(sx, 6 - lift, sx + (a === 0 ? -1 : 1), 1 - lift, L.GLOW, P.NONE, 1);
      } else { up(6, 3, k === 'jump' || a === 0); up(14, 17, k === 'jump' || a === 1); }
    } else {
      g.rect(7, 18, 2, 2, L.LIGHT, P.LEG); g.rect(11, 18, 2, 2, L.LIGHT, P.LEG);
    }
    if (k === 'jump') Q.hy = (Q.hy || 0) - 1;
  }
  smallHead(g, Q);
  smallAcc(g, acc, Q);
  if (flip) g = g.flipX();
  const colorFn = makeColorFn({ ...br, glow: opt.stickColor || br.glow }, breedId.length * 3, opt.dim || 1, true);
  cv = renderGrid(g, colorFn, { rim: opt.rim ?? 0.38 });
  cache.set(key, cv);
  return cv;
}

// Head-only portrait for HUD plates (big cat head cropped).
export function portrait(breedId, expr = {}, flip = false) {
  const key = 'PT|' + breedId + '|' + flip + '|' + JSON.stringify(expr);
  let cv = cache.get(key);
  if (cv) return cv;
  const full = bigCat(breedId, { pose: 'sit', ...expr }, flip);
  cv = makeCanvas(30, 26);
  cv.getContext('2d').drawImage(full, 7, 1, 30, 26, 0, 0, 30, 26);
  cache.set(key, cv);
  return cv;
}

// Solid silhouette of a cat head from behind (front-row crowd).
export function backHead(w = 26, seed = 0) {
  const key = 'BH|' + w + '|' + seed;
  let cv = cache.get(key);
  if (cv) return cv;
  const h = Math.round(w * 0.9);
  const g = new Grid(w, h);
  const cx = w / 2;
  g.tri(cx - w * 0.4, h * 0.55, cx - w * 0.33, 0.5, cx - w * 0.05, h * 0.3, L.FUR, P.EAR);
  g.tri(cx + w * 0.4, h * 0.55, cx + w * 0.33, 0.5, cx + w * 0.05, h * 0.3, L.FUR, P.EAR);
  g.ellipse(cx, h * 0.62, w * 0.42, h * 0.4, L.FUR, P.HEAD);
  g.rect(Math.round(cx - w * 0.3), Math.round(h * 0.8), Math.round(w * 0.6), h, L.FUR, P.BODY);
  const dark = hex(['#150f2b', '#1b1233', '#120d24'][seed % 3]);
  cv = renderGrid(g, () => dark, { rim: 0.55, outline: null, shadeBottom: 1, headSep: false });
  cache.set(key, cv);
  return cv;
}
