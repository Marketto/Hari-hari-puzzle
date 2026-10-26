// Unit test Boba Sort: ogni livello è risolvibile e le regole di versamento sono rispettate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/boba-logic.js');
const B = HH.boba;

test('livelli 3-9 gusti risolvibili, 4 strati per gusto, nessun bicchiere già completo', () => {
  for (let colors = 3; colors <= 9; colors++) {
    for (let seed = 1; seed <= 8; seed++) {
      const cups = B.generate(colors, 2, HH.rng(seed * 31 + colors));
      assert.ok(cups, `colors=${colors} seed=${seed}`);
      const count = {};
      cups.flat().forEach((f) => { count[f] = (count[f] || 0) + 1; });
      assert.equal(Object.keys(count).length, colors);
      assert.ok(Object.values(count).every((v) => v === B.CAP));
      assert.ok(!cups.some((c) => c.length === B.CAP && c.every((x) => x === c[0])));
      let s = cups;
      for (const [a, b] of B.solve(cups)) s = B.pour(s, a, b).cups;
      assert.ok(B.isSolved(s));
    }
  }
});

test('versare: solo su vuoto o stesso gusto, mai oltre la capienza', () => {
  const cups = [[0, 1, 1], [2, 1], [0, 2, 2, 2], []];
  assert.equal(B.canPour(cups, 0, 1), true);
  assert.equal(B.canPour(cups, 0, 2), false);   // pieno
  assert.equal(B.canPour(cups, 2, 0), false);   // gusto diverso
  assert.equal(B.canPour(cups, 3, 0), false);   // sorgente vuota
  const r = B.pour(cups, 0, 1);
  assert.equal(r.amount, 2);                    // 2 strati uguali, 2 posti liberi
  assert.deepEqual(r.cups[1], [2, 1, 1, 1]);
  assert.deepEqual(B.pour(cups, 0, 3).cups[3], [1, 1]);
  assert.deepEqual(cups[0], [0, 1, 1], 'stato originale immutato');
});
