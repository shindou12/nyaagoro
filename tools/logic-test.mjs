// Headless rules tests: `npm test`
import assert from 'node:assert/strict';
import { MatchLogic } from '../js/logic/MatchLogic.js';
import { ACT, expectedAt, composeRejectReason, capacityOf, hypeFor, slotsForRound, T } from '../js/logic/Rules.js';

const { NYA, GORO, GORONYA } = ACT;
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok -', name); };

test('reverse mapping after ごろにゃー', () => {
  const seq = [NYA, NYA, GORONYA, NYA, GORO];
  assert.deepEqual(seq.map((_, i) => expectedAt(seq, i)), [NYA, NYA, GORONYA, GORO, NYA]);
});
test('ごろにゃー shortens the turn and is once per turn', () => {
  assert.equal(capacityOf([NYA, GORONYA], 4), 3);
  assert.equal(composeRejectReason([NYA, GORONYA], 4, GORONYA), 'goronyaUsed');
  assert.equal(composeRejectReason([NYA, NYA, NYA], 4, GORONYA), 'noRoom');
  assert.equal(composeRejectReason([NYA, GORONYA, GORO], 4, NYA), 'full');
});
test('slots grow per round, capped', () => {
  assert.deepEqual([1, 2, 3, 6, 20].map(slotsForRound), [4, 5, 6, 9, 9]);
});
test('hype rises with rounds and last-fish tension', () => {
  assert.equal(hypeFor(1, [2, 2]), 0);
  assert.equal(hypeFor(3, [2, 1]), 2);
  assert.equal(hypeFor(1, [1, 1]), 2);
  assert.equal(hypeFor(9, [1, 1]), 4);
});

function run(script) {
  let now = 0;
  const facts = [];
  const m = new MatchLogic({ first: 0, rng: () => 0.1 });
  m.onFact = (f) => facts.push(f);
  m.start(now);
  const step = (ms) => { for (let i = 0; i < ms; i += 50) { now += 50; m.update(now); } };
  script({ m, step, facts, at: () => now, inp: (p, a) => m.input(p, a, now) });
  return facts;
}

test('full match: composer fills, replayer fails twice -> composer wins', () => {
  const facts = run(({ m, step, inp }) => {
    for (let turn = 0; turn < 4; turn++) {
      step(T.matchIntro + T.turnIntro + 100);
      if (m.phase === 'end') break;
      const c = m.composer, r = m.replayer;
      inp(c, NYA); inp(c, GORONYA);
      while (m.phase === 'compose') inp(c, NYA);          // fills the shortened capacity → locks
      assert.equal(m.seq.length, m.slots - 1);
      step(8000);                                          // showcase
      assert.equal(m.phase, 'replay');
      if (r === 1) { inp(r, NYA); inp(r, GORONYA); inp(r, NYA); } // wrong: should be GORO (reversed)
      else while (m.phase === 'replay') inp(r, expectedAt(m.seq, m.replayIdx)); // correct
      step(T.judgeMiss + 100);
    }
  });
  const end = facts.find((f) => f.type === 'matchEnd');
  assert.ok(end, 'match ended');
  assert.equal(end.winner, 0);
  assert.deepEqual(end.lives, [2, 0]);
  const judges = facts.filter((f) => f.type === 'judge');
  assert.equal(judges.filter((j) => !j.ok).length, 2);
  assert.equal(judges.find((j) => !j.ok).expected, GORO);
});

test('timeout pads short sequences and replay timeout is a miss', () => {
  const facts = run(({ m, step }) => {
    step(T.matchIntro + T.turnIntro + 100);
    step(20000); // composer idles → padded; replayer idles → timeout miss
  });
  const lock = facts.find((f) => f.type === 'composeLock');
  assert.equal(lock.reason, 'timeout');
  assert.equal(lock.seq.length, 2);
  assert.deepEqual(lock.pads, [0, 1]);
  assert.ok(facts.find((f) => f.type === 'replayTimeout'));
  assert.equal(facts.find((f) => f.type === 'judge').ok, false);
});

test('early confirm needs 2 inputs, inputs from wrong player ignored', () => {
  const facts = run(({ m, step, inp }) => {
    step(T.matchIntro + T.turnIntro + 100);
    inp(1, NYA);
    assert.equal(m.seq.length, 0);
    inp(0, 'confirm');
    inp(0, GORO); inp(0, GORO); inp(0, 'confirm');
    assert.equal(m.phase, 'lockPause');
  });
  assert.ok(facts.find((f) => f.type === 'composeReject' && f.reason === 'tooShort'));
});

console.log(`\n${n} tests passed`);
