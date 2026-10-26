import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/pixel-logic.js');
const P = HH.pixel;

/* ---------- oracolo indipendente ----------
 * Conta le soluzioni (fino a `limit`) a forza bruta: per ogni riga elenca tutte le sistemazioni compatibili
 * con il suo indizio, poi scende riga per riga controllando che ogni colonna resti un prefisso valido del suo indizio.
 * Non usa nulla del risolutore di linea del gioco. */
function rowPatterns(clue, w) {
  const out = [];
  (function place(k, start, acc) {
    if (k === clue.length) { out.push(acc.concat(new Array(w - acc.length).fill(0))); return; }
    const rest = clue.slice(k + 1).reduce((a, v) => a + v + 1, 0);
    for (let s = start; s + clue[k] + rest <= w; s++) {
      const next = acc.concat(new Array(s - acc.length).fill(0), new Array(clue[k]).fill(1));
      if (k < clue.length - 1) next.push(0);
      place(k + 1, next.length, next);
    }
  })(0, 0, []);
  return out;
}
function colPrefixOk(col, clue, final) {
  const runs = [];
  let k = 0;
  for (const v of col) { if (v) k++; else if (k) { runs.push(k); k = 0; } }
  const open = k;
  if (final) { if (open) runs.push(open); return runs.length === clue.length && runs.every((v, i) => v === clue[i]); }
  if (runs.length > clue.length) return false;
  for (let i = 0; i < runs.length; i++) if (runs[i] !== clue[i]) return false;
  if (open) return runs.length < clue.length && open <= clue[runs.length];
  return true;
}
function countSolutions(rows, cols, limit = 2) {
  const h = rows.length, w = cols.length;
  const pats = rows.map((c) => rowPatterns(c, w));
  const grid = [];
  let count = 0, first = null;
  (function rec(r) {
    if (count >= limit) return;
    if (r === h) { count++; if (!first) first = grid.flat(); return; }
    for (const p of pats[r]) {
      grid[r] = p;
      let ok = true;
      for (let c = 0; c < w && ok; c++) ok = colPrefixOk(grid.slice(0, r + 1).map((row) => row[c]), cols[c], r === h - 1);
      if (ok) rec(r + 1);
    }
    grid.length = r;
  })(0);
  return { count, first };
}

test('disegni: almeno 40, id unici, rettangolari, tavolozza nota, tutte le taglie', () => {
  assert.ok(P.PICS.length >= 40, `${P.PICS.length} disegni`);
  assert.equal(new Set(P.PICS.map((p) => p[0])).size, P.PICS.length);
  for (const [id, name, art] of P.PICS) {
    assert.ok(name && typeof name === 'string', id);
    assert.ok(P.SIZES.includes(art.length), `${id}: ${art.length} righe`);
    for (const row of art) {
      assert.equal(row.length, art.length, `${id}: griglia quadrata`);
      for (const ch of row) assert.ok(ch === '.' || ch === '@' || P.COLORS.includes(ch), `${id}: colore ${ch}`);
    }
    const pz = P.build(id, false);
    assert.ok(pz.sol.some((v) => v) && pz.sol.some((v) => !v), `${id}: né vuoto né pieno`);
  }
  for (const n of P.SIZES) assert.ok(P.poolFor(n).length >= 8, `almeno 8 disegni ${n}×${n}`);
});

test('ogni disegno (anche specchiato) ha soluzione UNICA per l’oracolo ed è risolvibile per sola logica riga/colonna', () => {
  for (const [id] of P.PICS) {
    for (const mirror of [false, true]) {
      const pz = P.build(id, mirror);
      const o = countSolutions(pz.rows, pz.cols, 2);
      assert.equal(o.count, 1, `${id}${mirror ? ' (specchio)' : ''}: ${o.count} soluzioni`);
      assert.deepEqual(o.first, pz.sol, `${id}: la soluzione è il disegno`);
      const ls = P.lineSolve(pz.rows, pz.cols, pz.w, pz.h);
      assert.ok(ls.solved && !ls.contradiction, `${id}: logica riga/colonna`);
      assert.deepEqual(ls.grid, pz.sol);
    }
  }
});

test('livelli 1–20 × 40 semi: taglia della curva, indizi coerenti, soluzione unica (oracolo), mai già risolto', () => {
  for (let level = 1; level <= 20; level++) {
    for (let seed = 1; seed <= 40; seed++) {
      const pz = P.generate(level, HH.rng(seed * 7919 + level));
      const n = P.sizeFor(level);
      assert.equal(pz.w, n); assert.equal(pz.h, n);
      assert.deepEqual(P.clues(pz.sol, pz.w, pz.h), { rows: pz.rows, cols: pz.cols });
      if (seed <= 6) assert.equal(countSolutions(pz.rows, pz.cols, 2).count, 1, `livello ${level} seme ${seed}`);
      const st = P.newGame(pz);
      assert.ok(!P.isSolved(pz, st.board));
      assert.equal(P.progress(st), 0);
    }
  }
  assert.equal(P.generate(1, HH.rng(5)).id, 'heart', 'il primo livello è il cuore');
});

test('curva di difficoltà: taglia monotona con 4 gradini; 10×10 richiede più deduzioni di 5×5', () => {
  let prev = 0;
  const seen = new Set();
  for (let level = 1; level <= 40; level++) { const n = P.sizeFor(level); assert.ok(n >= prev); prev = n; seen.add(n); }
  assert.deepEqual([...seen], [5, 7, 8, 10]);
  const avg = (n) => { const pool = P.poolFor(n); return pool.reduce((a, p) => { const pz = P.build(p[0]); return a + P.lineSolve(pz.rows, pz.cols, pz.w, pz.h).steps; }, 0) / pool.length; };
  assert.ok(avg(5) < avg(7) && avg(7) < avg(8) && avg(8) < avg(10));
});

test('determinismo e "avoid": stesso seme = stesso disegno; il disegno evitato non si ripete', () => {
  for (const level of [2, 5, 9, 15]) {
    assert.deepEqual(P.generate(level, HH.rng(42)), P.generate(level, HH.rng(42)));
    const a = P.generate(level, HH.rng(3));
    for (let k = 0; k < 20; k++) assert.notEqual(P.generate(level, HH.rng(100 + k), { avoid: a.id }).id, a.id);
  }
  // pool esaurito: comunque un disegno valido
  const all = P.poolFor(5).map((p) => p[0]);
  assert.ok(P.generate(2, HH.rng(1), { avoid: all }).id);
});

test('generazione veloce (media < 10 ms sul 10×10)', () => {
  const t = performance.now();
  for (let k = 0; k < 50; k++) P.generate(20, HH.rng(k));
  const ms = (performance.now() - t) / 50;
  assert.ok(ms < 10, `${ms.toFixed(2)} ms`);
});

test('solveLine: casi base e contraddizioni', () => {
  assert.deepEqual(P.solveLine([3], [-1, -1, -1, -1, -1]), [-1, -1, 1, -1, -1]);
  assert.deepEqual(P.solveLine([5], new Array(5).fill(-1)), [1, 1, 1, 1, 1]);
  assert.deepEqual(P.solveLine([], new Array(4).fill(-1)), [0, 0, 0, 0]);
  assert.deepEqual(P.solveLine([1, 1], [-1, -1, -1]), [1, 0, 1]);
  assert.deepEqual(P.solveLine([2], [-1, 1, -1, -1, -1]), [-1, 1, -1, 0, 0]);
  assert.equal(P.solveLine([3], [-1, 0, -1, -1]), null);
  assert.equal(P.solveLine([1], [1, -1, 1]), null);
  // diagonale 2×2: due soluzioni → la logica di linea non basta
  const r = P.lineSolve([[1], [1]], [[1], [1]], 2, 2);
  assert.ok(!r.solved && !r.contradiction);
  assert.equal(countSolutions([[1], [1]], [[1], [1]], 5).count, 2);
});

test('mosse: riempi giusto, errore = cuore perso e cella rivelata, ✕ giusta/sbagliata, togli ✕', () => {
  const st = P.newGame(P.build('heart'));
  const pz = P.puzzleOf(st);
  // (0,1) è pieno, (0,0) è vuoto
  let m = P.move(st, 1, 'fill');
  assert.ok(m.ok && m.changed); assert.equal(st.board[1], 1); assert.equal(st.mistakes, 0); assert.equal(st.moves, 1);
  m = P.move(st, 0, 'fill');
  assert.ok(!m.ok); assert.equal(st.mistakes, 1); assert.equal(st.board[0], 2, 'cella sbagliata → ✕');
  m = P.move(st, 6, 'cross');
  assert.ok(!m.ok); assert.equal(st.mistakes, 2); assert.equal(st.board[6], 1, '✕ su cella piena → si riempie');
  m = P.move(st, 2, 'cross');
  assert.ok(m.ok); assert.equal(st.board[2], 2);
  m = P.move(st, 2, 'clear');
  assert.ok(m.ok); assert.equal(st.board[2], 0);
  m = P.move(st, 1, 'fill');
  assert.ok(!m.changed, 'cella già piena: nessuna mossa');
  assert.equal(P.rate(st), 1);
  assert.ok(pz.sol[1] === 1 && pz.sol[0] === 0);
});

test('indizi spenti e ✕ automatiche quando una linea è completa', () => {
  const st = P.newGame(P.build('heart'));          // riga 0: .r.r.
  P.move(st, 1, 'fill');
  const m = P.move(st, 3, 'fill');
  assert.ok(m.newly.includes('r0'));
  assert.deepEqual(st.board.slice(0, 5), [2, 1, 2, 1, 2]);
  assert.ok(m.autos.includes(0) && m.autos.includes(2) && m.autos.includes(4));
  assert.ok(P.lineDone(P.puzzleOf(st), st.board, 'r', 0));
  assert.ok(!P.lineDone(P.puzzleOf(st), st.board, 'r', 1));
});

test('vittoria: riempire tutte le celle giuste risolve (le vuote possono restare ignote); progress = 1', () => {
  for (const [id] of P.PICS) {
    const st = P.newGame(P.build(id));
    const pz = P.puzzleOf(st);
    let last;
    pz.sol.forEach((v, i) => { if (v && st.board[i] !== 1) last = P.move(st, i, 'fill'); });
    assert.ok(last.solved, id);
    assert.ok(P.isSolved(pz, st.board));
    assert.equal(P.progress(st), 1);
    assert.equal(st.mistakes, 0);
    assert.equal(P.rate(st), 3);
  }
});

test('annulla: torna indietro di un tocco (✕ automatiche comprese); gli errori restano contati', () => {
  const st = P.newGame(P.build('heart'));
  P.move(st, 1, 'fill');
  P.move(st, 3, 'fill');
  assert.ok(P.undo(st));
  assert.deepEqual(st.board.slice(0, 5), [0, 1, 0, 0, 0]);
  P.move(st, 0, 'fill');
  assert.ok(P.undo(st));
  assert.equal(st.board[0], 0); assert.equal(st.mistakes, 1);
  assert.ok(P.undo(st)); assert.ok(!P.undo(st));
  assert.equal(st.moves, 0);
});

test('salvataggio: JSON → ripresa identica; tavole incoerenti ripulite; partita persa ricomincia', () => {
  const pz = P.generate(14, HH.rng(9));
  const st = P.newGame(pz);
  pz.sol.forEach((v, i) => { if (v && i % 3 === 0) P.move(st, i, 'fill'); });
  P.move(st, pz.sol.indexOf(0), 'fill');
  const back = P.restore(JSON.parse(JSON.stringify(st)));
  assert.deepEqual(back, st);
  assert.deepEqual(P.puzzleOf(back), pz);
  // manomesso: celle sbagliate rimosse
  const bad = JSON.parse(JSON.stringify(st));
  bad.board[pz.sol.indexOf(0)] = 1; bad.board[pz.sol.indexOf(1)] = 2;
  const fixed = P.restore(bad);
  assert.equal(fixed.board[pz.sol.indexOf(0)], 0); assert.equal(fixed.board[pz.sol.indexOf(1)], 0);
  // 3 errori → si riparte da zero
  const lost = P.restore(Object.assign({}, st, { mistakes: 3 }));
  assert.equal(lost.mistakes, 0); assert.ok(lost.board.every((v) => v === 0));
  // salvataggi illeggibili
  assert.equal(P.restore(null), null);
  assert.equal(P.restore({ id: 'nope', board: [] }), null);
  assert.equal(P.restore(Object.assign({}, st, { board: st.board.slice(1) })), null);
  assert.equal(P.restore(Object.assign({}, st, { board: st.board.map(() => 7) })), null);
});
