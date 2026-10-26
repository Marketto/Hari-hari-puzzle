// Unit test Lantern Glow: tocco corretto e livelli sempre risolvibili.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/lantern-logic.js');
const L = HH.lantern;

test('il tocco inverte la lanterna e le 4 vicine (non le diagonali)', () => {
  const g = L.toggle(3, new Array(9).fill(false), 4);
  assert.deepEqual(g, [false, true, false, true, true, true, false, true, false]);
  const corner = L.toggle(3, new Array(9).fill(false), 0);
  assert.deepEqual(corner.map(Number), [1, 1, 0, 1, 0, 0, 0, 0, 0]);
});

test('livelli mai già risolti e risolvibili ripetendo i tocchi', () => {
  for (const n of [4, 5]) {
    for (let s = 1; s <= 20; s++) {
      const r = L.generate(n, 6, HH.rng(s), true);
      assert.ok(!L.isSolved(r.grid));
      let g = r.grid;
      r.taps.forEach((i) => { g = L.toggle(n, g, i); });
      assert.ok(L.isSolved(g));
    }
  }
});
