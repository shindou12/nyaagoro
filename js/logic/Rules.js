// にゃごろ！ — the rules, as pure data + functions.
// Shared by host logic, CPU, and presenters (for instant local feedback).

export const ACT = Object.freeze({ NYA: 'nya', GORO: 'goro', GORONYA: 'goronya' });
export const ACTIONS = [ACT.NYA, ACT.GORO, ACT.GORONYA];

export const START_LIVES = 2;          // "2回ミスったら負け" → 2 fish
export const BASE_SLOTS = 4;           // round 1 accepts 4 inputs
export const MAX_SLOTS = 9;            // never longer than this (keeps it snappy)
export const MIN_SEQ = 2;              // shortest sequence a composer may lock in
export const GORONYA_BREAKS = 1;       // using ごろにゃー breaks 1 extra slot (受付数 -1)

export const T = Object.freeze({
  matchIntro: 3400,
  turnIntro: 1500,
  lockPause: 450,
  countInBeats: 2,
  tailBeats: 1,
  replayFirst: 5000,   // time for the first input of a replay
  replayStep: 3200,    // time allowed between inputs
  judgeOk: 2100,
  judgeMiss: 3300,
  composeBase: 4500,
  composePerSlot: 1100,
});

// Rounds = one compose each. Slots grow per round so both cats face the same length.
export function slotsForRound(round) { return Math.min(MAX_SLOTS, BASE_SLOTS + (round - 1)); }
export function roundForTurn(turnNo) { return Math.floor((turnNo - 1) / 2) + 1; }
export function composeTimeMs(slots) { return T.composeBase + slots * T.composePerSlot; }

export const invert = (a) => (a === ACT.NYA ? ACT.GORO : a === ACT.GORO ? ACT.NYA : a);

/** index of the ごろにゃー in a sequence (reverse zone starts right after it), or -1 */
export function reverseFrom(seq) { return seq.indexOf(ACT.GORONYA); }

/** What the mimic must press at index i. After ごろにゃー, にゃー⇄ごろ swap. */
export function expectedAt(seq, i) {
  const g = seq.indexOf(ACT.GORONYA);
  return g >= 0 && i > g ? invert(seq[i]) : seq[i];
}
export function isReversedIndex(seq, i) { const g = seq.indexOf(ACT.GORONYA); return g >= 0 && i > g; }

/** capacity after a sequence: ごろにゃー shortens the turn */
export function capacityOf(seq, baseSlots) { return seq.includes(ACT.GORONYA) ? baseSlots - GORONYA_BREAKS : baseSlots; }

/** can the composer add `action` now? returns null if ok, else reason */
export function composeRejectReason(seq, baseSlots, action) {
  const cap = capacityOf(seq, baseSlots);
  if (seq.length >= cap) return 'full';
  if (action === ACT.GORONYA) {
    if (seq.includes(ACT.GORONYA)) return 'goronyaUsed';           // once per turn
    if (cap - seq.length < 1 + GORONYA_BREAKS) return 'noRoom';    // needs room to break a slot
  }
  return null;
}

export const BPM_BY_HYPE = [98, 106, 114, 122, 130];
export function beatMs(hype) { return 60000 / BPM_BY_HYPE[Math.max(0, Math.min(4, hype))]; }

/** Crowd heat 0..4: grows with rounds, spikes when someone is on their last fish. */
export function hypeFor(turnNo, lives) {
  let h = Math.min(3, Math.floor((turnNo - 1) / 2));
  if (lives.some((l) => l <= 1)) h += 1;
  if (lives.every((l) => l <= 1)) h += 1;
  if (turnNo >= 9) h += 1;
  return Math.max(0, Math.min(4, h));
}

/** beats each action occupies during the showcase (ごろにゃー gets a dramatic 2) */
export const beatsFor = (a) => (a === ACT.GORONYA ? 2 : 1);
export function showcaseBeats(seq) { return T.countInBeats + seq.reduce((s, a) => s + beatsFor(a), 0) + T.tailBeats; }
