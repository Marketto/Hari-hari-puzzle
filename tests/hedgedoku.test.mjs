// Unit test Hedgedoku: ogni livello generato deve rispettare le regole,
// avere UNA sola soluzione (verificata con un solver indipendente a forza bruta)
// ed essere risolvibile con la sola logica.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/hedgedoku-logic.js');
const H = HH.hedgedoku;

/* ---------- Oracolo indipendente (non usa il codice del gioco) ---------- */
function* permutations(n) {
  const p = [...Array(n).keys()];
  const c = new Array(n).fill(0);
  yield p.slice();
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const j = i % 2 ? c[i] : 0;
      [p[j], p[i]] = [p[i], p[j]];
      yield p.slice();
      c[i]++; i = 0;
    } else { c[i] = 0; i++; }
  }
}
// p[r] = colonna del riccio in riga r: righe e colonne già uniche per costruzione
function respectsRules(n, reg, p) {
  const seen = new Set();
  for (let r = 0; r < n; r++) {
    const g = reg[r * n + p[r]];
    if (seen.has(g)) return false;                                // una sola per zona
    seen.add(g);
    if (r > 0 && Math.abs(p[r] - p[r - 1]) <= 1) return false;    // niente adiacenze (anche diagonali)
  }
  return seen.size === n;
}
function bruteSolutions(n, reg) {
  const out = [];
  for (const p of permutations(n)) if (respectsRules(n, reg, p)) out.push(p);
  return out;
}
function connected(n, reg, g) {
  const cells = reg.map((v, i) => (v === g ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), st = [cells[0]];
  while (st.length) {
    const i = st.pop(), r = Math.floor(i / n), c = i % n;
    for (const [rr, cc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      const j = rr * n + cc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n && reg[j] === g && !seen.has(j)) { seen.add(j); st.push(j); }
    }
  }
  return seen.size === cells.length;
}

/* ---------- Livelli generati ---------- */
const SIZES = [5, 6, 7, 8];
const SEEDS = 25;

for (const n of SIZES) {
  test(`livelli ${n}x${n}: struttura, regole, unicità, logica (${SEEDS} semi)`, () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const p = H.generate(n, HH.rng(seed * 7919 + n));
      const { regions: reg, solution: sol } = p;
      const tag = `n=${n} seed=${seed}`;

      // struttura: tutte le celle assegnate, esattamente n zone, ognuna connessa
      assert.equal(reg.length, n * n, tag);
      assert.ok(reg.every((g) => Number.isInteger(g) && g >= 0 && g < n), `${tag}: zona non valida`);
      for (let g = 0; g < n; g++) assert.ok(connected(n, reg, g), `${tag}: zona ${g} vuota o spezzata`);

      // la soluzione dichiarata rispetta tutte le regole
      assert.equal(new Set(sol).size, n, `${tag}: colonne ripetute`);
      assert.ok(respectsRules(n, reg, sol), `${tag}: soluzione che viola le regole`);

      // unicità verificata a forza bruta, indipendente dal generatore
      const all = bruteSolutions(n, reg);
      assert.equal(all.length, 1, `${tag}: ${all.length} soluzioni`);
      assert.deepEqual(all[0], sol, `${tag}: soluzione diversa`);

      // risolvibile senza tentativi
      const L = H.logicSolve(n, reg);
      assert.ok(L.ok, `${tag}: non risolvibile con la logica`);
      assert.deepEqual(L.hogs.map((i) => i % n), sol, `${tag}: la logica trova un'altra soluzione`);
    }
  });
}

test('generazione veloce (media < 60 ms per 8x8)', () => {
  const t = performance.now();
  for (let s = 0; s < 10; s++) H.generate(8, HH.rng(1000 + s));
  assert.ok((performance.now() - t) / 10 < 60);
});

/* ---------- Verifica delle mosse (check) ---------- */
// zone a righe: zona = riga
const n = 5;
const rows = [...Array(n * n)].map((_, i) => Math.floor(i / n));
const board = (cells) => { const b = new Array(n * n).fill(0); cells.forEach(([r, c]) => { b[r * n + c] = 2; }); return b; };

test('check: stessa riga = conflitto', () => {
  assert.equal(H.check(n, rows, board([[0, 0], [0, 3]])).conflicts.size, 2);
});
test('check: stessa colonna = conflitto', () => {
  assert.equal(H.check(n, rows, board([[0, 1], [3, 1]])).conflicts.size, 2);
});
test('check: stessa zona = conflitto', () => {
  const cols = [...Array(n * n)].map((_, i) => i % n); // zona = colonna
  assert.equal(H.check(n, cols, board([[0, 2], [4, 2]])).conflicts.size, 2);
  const blocks = rows.map((g, i) => (i === 7 ? 0 : g)); // cella (1,2) appartiene alla zona 0
  assert.equal(H.check(n, blocks, board([[0, 0], [1, 2]])).conflicts.size, 2);
});
test('check: adiacenza diagonale = conflitto', () => {
  assert.equal(H.check(n, rows, board([[1, 1], [2, 2]])).conflicts.size, 2);
  assert.equal(H.check(n, rows, board([[1, 3], [2, 2]])).conflicts.size, 2);
});
test('check: ricci distanti = nessun conflitto, risolto solo con n ricci', () => {
  const sol = [[0, 0], [1, 2], [2, 4], [3, 1], [4, 3]];
  assert.equal(H.check(n, rows, board(sol.slice(0, 4))).solved, false);
  const r = H.check(n, rows, board(sol));
  assert.equal(r.conflicts.size, 0);
  assert.equal(r.solved, true);
});
test('check: le ✕ non contano come ricci', () => {
  const b = board([[0, 0]]); b[1] = 1; b[5] = 1;
  const r = H.check(n, rows, b);
  assert.equal(r.placed, 1);
  assert.equal(r.conflicts.size, 0);
});
test('validate rifiuta zone spezzate o incomplete', () => {
  const p = H.generate(6, HH.rng(42));
  assert.ok(H.validate(6, p.regions));
  assert.equal(H.validate(6, p.regions.slice(1)), false);
  const broken = p.regions.slice(); broken[0] = 99;
  assert.equal(H.validate(6, broken), false);
});

/* ---------- Giudizio delle mosse e riccio d'aiuto ---------- */
test('judge: solo le celle della soluzione sono corrette; i ricci corretti non hanno mai conflitti', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const nn = 5 + (seed % 4);
    const p = H.generate(nn, HH.rng(seed * 101));
    const b = new Array(nn * nn).fill(0);
    for (let i = 0; i < nn * nn; i++) {
      const j = H.judge(nn, p.regions, p.solution, b, i);
      assert.equal(j.correct, p.solution[Math.floor(i / nn)] === i % nn);
    }
    // piazza i ricci corretti uno alla volta: mai conflitti
    p.solution.forEach((c, r) => {
      const i = r * nn + c;
      const j = H.judge(nn, p.regions, p.solution, b, i);
      assert.ok(j.correct && j.blockers.length === 0, `seed ${seed} riga ${r}`);
      b[i] = 2;
    });
    assert.ok(H.check(nn, p.regions, b).solved);
  }
});

test('judge: un riccio sbagliato vicino/in riga a uno giusto riporta chi lo blocca', () => {
  const p = H.generate(6, HH.rng(77));
  const b = new Array(36).fill(0);
  const good = 0 * 6 + p.solution[0];
  b[good] = 2;
  const sameRow = good === 0 ? 1 : 0;
  const j = H.judge(6, p.regions, p.solution, b, sameRow);
  assert.equal(j.correct, false);
  assert.deepEqual(j.blockers, [good]);
});

test('il riccio d’aiuto appartiene sempre alla soluzione e il livello resta unico', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const p = H.generate(7, HH.rng(seed + 500));
    const r = seed % 7;
    const given = r * 7 + p.solution[r];
    assert.equal(p.solution[Math.floor(given / 7)], given % 7);
    assert.equal(bruteSolutions(7, p.regions).length, 1);
  }
});

/* ---------- Comandi (tap / doppio tap) e reazioni dei ricci ---------- */
test('tapValue: vuoto ↔ ✕, un riccio tolto lascia la cella vuota', () => {
  assert.equal(H.tapValue(0), 1);
  assert.equal(H.tapValue(1), 0);
  assert.equal(H.tapValue(2), 0);
});

test('isDoubleTap: stessa cella entro la finestra, mai su celle diverse o tocchi lenti', () => {
  const last = { i: 7, t: 1000 };
  assert.equal(H.isDoubleTap(last, 7, 1000 + H.DOUBLE_TAP_MS - 1), true);
  assert.equal(H.isDoubleTap(last, 7, 1000 + H.DOUBLE_TAP_MS), false);
  assert.equal(H.isDoubleTap(last, 8, 1100), false);
  assert.equal(H.isDoubleTap(null, 7, 1100), false);
  assert.equal(H.isDoubleTap(last, 7, 900), false);
});

test('lookAt: vettore unitario verso la cella e testa inclinata dal lato giusto', () => {
  assert.deepEqual(H.lookAt(5, 12, 12), { x: 0, y: 0, tilt: 0 });
  assert.deepEqual(H.lookAt(5, 12, 14), { x: 1, y: 0, tilt: 8 });     // a destra
  assert.deepEqual(H.lookAt(5, 12, 2), { x: 0, y: -1, tilt: 0 });     // in alto
  const g = H.lookAt(5, 12, 6);                                      // in alto a sinistra
  assert.equal(g.tilt, -8);
  assert.ok(Math.abs(Math.hypot(g.x, g.y) - 1) < 0.02 && g.x < 0 && g.y < 0);
});

test('nearHogs: solo i ricci entro la distanza indicata, esclusa la cella stessa', () => {
  const b = new Array(25).fill(0);
  b[0] = 2; b[12] = 2; b[24] = 2; b[13] = 1;
  assert.deepEqual(H.nearHogs(5, b, 6, 1), [0, 12]);
  assert.deepEqual(H.nearHogs(5, b, 12, 2), [0, 24]);
  assert.deepEqual(H.nearHogs(5, b, 12, 1), []);
});
