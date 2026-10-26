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

/* ---------- Minimo esatto e mosse concesse ---------- */
// Oracolo indipendente: ricerca in ampiezza pura, nessuna euristica e nessuna potatura.
function bfsMin(start) {
  const k = (cs) => cs.map((c) => c.join(',')).sort().join('|');
  let frontier = [start];
  const seen = new Set([k(start)]);
  for (let d = 0; d < 60; d++) {
    const next = [];
    for (const cs of frontier) {
      if (B.isSolved(cs)) return d;
      for (let i = 0; i < cs.length; i++) for (let j = 0; j < cs.length; j++) {
        const r = B.pour(cs, i, j);
        if (!r) continue;
        const kk = k(r.cups);
        if (!seen.has(kk)) { seen.add(kk); next.push(r.cups); }
      }
    }
    frontier = next;
  }
  return -1;
}

test('A* trova esattamente il minimo di mosse (confronto con ricerca in ampiezza)', () => {
  const cases = [[3, 8], [4, 6], [5, 2]];
  for (const [colors, seeds] of cases) {
    for (let s = 1; s <= seeds; s++) {
      const cups = B.generate(colors, 2, HH.rng(s * 97 + colors));
      const opt = B.solveOptimal(cups);
      assert.ok(opt, `colors=${colors} seed=${s}`);
      assert.equal(opt.moves, bfsMin(cups), `colors=${colors} seed=${s}`);
      // il percorso restituito risolve davvero in quel numero di mosse
      let st = cups;
      opt.path.forEach(([a, b]) => { st = B.pour(st, a, b).cups; });
      assert.ok(B.isSolved(st));
      assert.equal(opt.path.length, opt.moves);
    }
  }
});

test('mosse concesse = minimo + 15%, con almeno 2 e al massimo 6 in più', () => {
  assert.equal(B.extraMoves(5), 2);
  assert.equal(B.extraMoves(13), 2);
  assert.equal(B.extraMoves(14), 3);
  assert.equal(B.extraMoves(27), 5);
  assert.equal(B.extraMoves(40), 6);
  assert.equal(B.extraMoves(200), 6);
  for (let colors = 3; colors <= 9; colors += 2) {
    const L = B.generateLevel(colors, 2, HH.rng(colors * 7));
    assert.ok(L && L.max - L.min >= 2 && L.max - L.min <= 6, `colors=${colors}`);
    let st = L.cups;
    L.path.forEach(([a, b]) => { st = B.pour(st, a, b).cups; });
    assert.ok(B.isSolved(st) && L.path.length === L.min);
  }
});

/* ---------- Sconfitta: mosse finite, bloccato, vicolo cieco ---------- */
test('status: livello dello screenshot (nessuna versata possibile) = bloccato', () => {
  // dal fondo alla cima: 0 blu, 1 verde, 2 giallo, 3 lilla, 4 rosa
  const cups = [[0, 1, 2, 2], [3, 0], [4, 3, 0, 1], [0, 4, 3, 1], [2, 4, 1, 2], [4], [3]];
  assert.equal(B.hasMove(cups), false);
  assert.equal(B.status(cups, 10), 'stuck');
});

test('status: risolto, mosse finite, in corso', () => {
  const done = [[0, 0, 0, 0], [1, 1, 1, 1], [], []];
  assert.equal(B.status(done, 0), 'solved');
  const L = B.generateLevel(4, 2, HH.rng(3));
  assert.equal(B.status(L.cups, 0), 'moves');
  assert.equal(B.status(L.cups, L.max), 'ok');
});

test('status: vicolo cieco con versate ancora possibili = bloccato', () => {
  // si può ancora versare (1 → 1 o 0 → 0) ma nessuna sequenza porta alla soluzione
  const cups = [[1, 2, 2, 2], [0, 0, 1], [0, 1, 0], [1, 2]];
  assert.equal(B.hasMove(cups), true);
  assert.equal(B.solveOptimal(cups), false);
  assert.equal(B.status(cups, 20), 'stuck');
});

/* ---------- Valutazione a fragoline ---------- */
test('fragoline: 3 col minimo, 2 entro il 70% delle mosse in più, 1 oltre', () => {
  load('src/games/boba-ui.js');
  const rate = HH.games.find((g) => g.id === 'boba').rate;
  const st = (par, max, moves) => rate({ par, max, moves });
  // margine 2 (minimo 10 → 12 mosse): 70% di 2 = 1
  assert.equal(st(10, 12, 10), 3);
  assert.equal(st(10, 12, 11), 2);
  assert.equal(st(10, 12, 12), 1);
  // margine 6 (minimo 40 → 46 mosse): 70% di 6 = 4
  assert.equal(st(40, 46, 44), 2);
  assert.equal(st(40, 46, 45), 1);
  // margine 4 (minimo 25 → 29): 70% di 4 = 2
  assert.equal(st(25, 29, 27), 2);
  assert.equal(st(25, 29, 28), 1);
});
