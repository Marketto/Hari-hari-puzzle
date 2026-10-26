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

/* ---------- Minimo esatto (Gauss su GF(2)) ---------- */
load('src/core/rules.js');
// Oracolo indipendente: prova TUTTI i sottoinsiemi di tocchi (4×4 = 65 536)
function bruteMin(n, grid) {
  const N = n * n;
  let best = Infinity;
  for (let mask = 0; mask < 1 << N; mask++) {
    let w = 0;
    const g = grid.slice();
    for (let i = 0; i < N; i++) if ((mask >> i) & 1) {
      w++;
      const r = (i / n) | 0, c = i % n;
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n) g[rr * n + cc] = !g[rr * n + cc];
      });
    }
    if (w < best && g.every(Boolean)) best = w;
  }
  return best;
}

test('minimo esatto 4×4 uguale alla forza bruta su tutti i 65 536 sottoinsiemi', () => {
  for (let s = 1; s <= 6; s++) {
    const g = L.generate(4, 3 + s, HH.rng(s * 31), true).grid;
    assert.equal(L.minPresses(4, g).min, bruteMin(4, g), `seed ${s}`);
  }
});

test('i tocchi minimi accendono davvero tutto (5×5) e non superano quelli di mescolamento', () => {
  for (let s = 1; s <= 25; s++) {
    const r = L.generate(5, 4 + (s % 10), HH.rng(s + 900), true);
    const m = L.minPresses(5, r.grid);
    let g = r.grid;
    m.presses.forEach((i) => { g = L.toggle(5, g, i); });
    assert.ok(L.isSolved(g));
    assert.equal(m.presses.length, m.min);
    assert.ok(m.min <= r.taps.length);
  }
});

test('livello: mosse concesse = minimo + 15% (da +2 a +6)', () => {
  for (let s = 1; s <= 10; s++) {
    const lv = L.generateLevel(s % 2 ? 4 : 5, 8, HH.rng(s * 7));
    assert.ok(lv.min >= 2 && lv.max - lv.min === HH.rules.extraMoves(lv.min));
  }
});

test('regola fragoline condivisa', () => {
  const R = HH.rules;
  assert.deepEqual([10, 11, 12].map((m) => R.rateMoves(m, 10, 12)), [3, 2, 1]);
  assert.deepEqual([4, 5, 6].map((m) => R.rateMoves(m, 4, 6)), [3, 2, 1]);
});
