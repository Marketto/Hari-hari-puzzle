// Unit test Mochi Binary (Takuzu): ogni livello generato deve avere UNA sola soluzione,
// verificata da un risolutore a forza bruta indipendente (righe come stringhe, nessuna funzione del gioco),
// e la soluzione dichiarata deve rispettare tutte le regole. Più test su verifica delle mosse, giudizio delle linee,
// vittoria, salvataggio JSON e determinismo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/binary-logic.js');
const B = HH.binary;

/* ---------- Oracolo indipendente ---------- */
// tutte le stringhe di 'a'/'b' lunghe n, bilanciate e senza "aaa"/"bbb"
function oracleRows(n) {
  const out = [];
  (function rec(s) {
    if (s.length === n) { if ([...s].filter((x) => x === 'a').length === n / 2) out.push(s); return; }
    for (const x of 'ab') {
      const t = s + x;
      if (t.endsWith('aaa') || t.endsWith('bbb')) continue;
      rec(t);
    }
  })('');
  return out;
}
const toCh = (v) => (v === 1 ? 'a' : v === 2 ? 'b' : '.');
function obeysRules(n, grid) {               // grid: array di n stringhe
  const cols = [...Array(n)].map((_, c) => grid.map((r) => r[c]).join(''));
  for (const line of [...grid, ...cols]) {
    if (line.includes('aaa') || line.includes('bbb')) return false;
    if ([...line].filter((x) => x === 'a').length !== n / 2) return false;
  }
  return new Set(grid).size === n && new Set(cols).size === n;
}
// conta le soluzioni compatibili con gli indizi (fino a limit), riga per riga
function oracleCount(n, clues, limit = 2) {
  const rows = oracleRows(n);
  const want = [...Array(n)].map((_, r) => clues.slice(r * n, r * n + n).map(toCh).join(''));
  const fits = want.map((w) => rows.filter((s) => [...w].every((x, i) => x === '.' || x === s[i])));
  const grid = [];
  let count = 0;
  const found = [];
  (function rec(r) {
    if (count >= limit) return;
    if (r === n) { if (obeysRules(n, grid)) { count++; found.push(grid.join('')); } return; }
    for (const s of fits[r]) {
      if (grid.includes(s)) continue;
      grid.push(s);
      // potatura sulle colonne parziali: niente tris, non più di n/2 per colore
      let ok = true;
      for (let c = 0; c < n && ok; c++) {
        const col = grid.map((g) => g[c]).join('');
        if (col.endsWith('aaa') || col.endsWith('bbb')) ok = false;
        const a = [...col].filter((x) => x === 'a').length;
        if (a > n / 2 || col.length - a > n / 2) ok = false;
      }
      if (ok) rec(r + 1);
      grid.pop();
    }
  })(0);
  return { count, found };
}

test('oracolo: numero di righe valide noto (4→6, 6→14, 8→34, 10→84)', () => {
  assert.deepEqual([4, 6, 8, 10].map((n) => oracleRows(n).length), [6, 14, 34, 84]);
  assert.deepEqual([4, 6, 8, 10].map((n) => B.validLines(n).length), [6, 14, 34, 84]);
});

/* ---------- Livelli 1–20, molti semi ---------- */
test('livelli 1–20: soluzione valida, indizi coerenti, UNICA per l’oracolo (8 semi per livello)', () => {
  for (let level = 1; level <= 20; level++) {
    for (let seed = 1; seed <= 8; seed++) {
      const p = B.generate(level, HH.rng(level * 7919 + seed));
      const tag = `livello ${level} seme ${seed}`;
      const n = p.n;
      assert.equal(n, B.sizeFor(level), tag);
      const solRows = [...Array(n)].map((_, r) => p.solution.slice(r * n, r * n + n).map(toCh).join(''));
      assert.ok(obeysRules(n, solRows), `${tag}: soluzione che viola le regole`);
      assert.ok(p.givens.length > 0 && p.givens.length < n * n, `${tag}: indizi`);
      p.givens.forEach((i) => assert.equal(p.clues[i], p.solution[i], `${tag}: indizio diverso dalla soluzione`));
      assert.equal(p.clues.filter((v) => v).length, p.givens.length, tag);
      const o = oracleCount(n, p.clues, 2);
      assert.equal(o.count, 1, `${tag}: ${o.count} soluzioni`);
      assert.equal(o.found[0], solRows.join(''), `${tag}: soluzione diversa`);
      // risolvibile senza tentativi con le tecniche del livello
      const L = B.logicSolve(n, p.clues, p.tier);
      assert.ok(L.ok, `${tag}: non risolvibile con tier ${p.tier}`);
      assert.deepEqual(L.board, p.solution, tag);
    }
  }
});

test('curva di difficoltà: taglia monotona con 4 gradini, indizi in calo dentro ogni taglia', () => {
  const sizes = [...Array(30)].map((_, i) => B.sizeFor(i + 1));
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] >= sizes[i - 1]);
  assert.deepEqual([...new Set(sizes)], [4, 6, 8, 10]);
  const avg = (lv) => { let s = 0; for (let k = 0; k < 12; k++) s += B.generate(lv, HH.rng(lv * 31 + k)).givens.length / B.sizeFor(lv) ** 2; return s / 12; };
  assert.ok(avg(3) > avg(6), '6×6: più indizi al livello 3 che al 6');
  assert.ok(avg(7) > avg(12), '8×8: più indizi al livello 7 che al 12');
  assert.ok(avg(13) > avg(20), '10×10: più indizi al livello 13 che al 20');
});

test('generazione veloce (media < 10 ms per il 10×10)', () => {
  for (let s = 0; s < 5; s++) B.generate(25, HH.rng(9000 + s)); // riscaldamento
  const t = performance.now();
  for (let s = 0; s < 20; s++) B.generate(25, HH.rng(1000 + s));
  const ms = (performance.now() - t) / 20;
  assert.ok(ms < 10, `media ${ms.toFixed(2)} ms`);
});

test('determinismo: stesso seme → stesso livello', () => {
  for (const lv of [1, 5, 10, 18]) {
    assert.deepEqual(B.generate(lv, HH.rng(4242)), B.generate(lv, HH.rng(4242)));
  }
  assert.notDeepEqual(B.generate(18, HH.rng(1)).solution, B.generate(18, HH.rng(2)).solution);
});

test('il livello iniziale non è mai già risolto', () => {
  for (let lv = 1; lv <= 20; lv++) {
    const p = B.generate(lv, HH.rng(lv));
    assert.equal(B.isSolved(p.solution, p.clues), false);
  }
});

/* ---------- Verifica delle regole (check) ---------- */
const grid = (rows) => rows.join('').split('').map((x) => (x === 'R' ? 1 : x === 'G' ? 2 : 0));

test('check: tre uguali in fila (riga e colonna)', () => {
  const r = B.check(4, grid(['RRR.', '....', '....', '....']));
  assert.deepEqual([...r.bad].sort((a, b) => a - b), [0, 1, 2]);
  assert.deepEqual(r.triple, [0]);
  const c = B.check(4, grid(['.G..', '.G..', '.G..', '....']));
  assert.deepEqual([...c.bad].sort((a, b) => a - b), [1, 5, 9]);
  assert.equal(c.lines[4 + 1], 'bad');
});

test('check: troppi di un colore in una riga (anche se incompleta)', () => {
  const r = B.check(6, grid(['RGRR.R', '......', '......', '......', '......', '......']));
  assert.deepEqual(r.overfull, [0]);
  assert.deepEqual([...r.bad].sort((a, b) => a - b), [0, 2, 3, 5]);
});

test('check: righe complete uguali e colonne complete uguali', () => {
  const r = B.check(4, grid(['RGRG', 'RGRG', '....', '....']));
  assert.equal(r.twin.length, 1);
  assert.equal(r.bad.size, 8);
  assert.equal(r.lines[0], 'bad');
  const c = B.check(4, grid(['RR..', 'GG..', 'RR..', 'GG..']));
  assert.deepEqual(c.twin, [[4, 5]]);
  // le righe incomplete non contano come uguali
  assert.equal(B.check(4, grid(['RGR.', 'RGR.', '....', '....'])).twin.length, 0);
});

test('check: una soluzione valida non ha violazioni e tutte le linee sono "full"', () => {
  const p = B.generate(9, HH.rng(3));
  const r = B.check(p.n, p.solution);
  assert.equal(r.bad.size, 0);
  assert.ok(r.lines.every((s) => s === 'full'));
  assert.equal(B.check(p.n, p.clues).bad.size, 0, 'gli indizi non violano mai le regole');
});

/* ---------- Giudizio delle linee (cuori) ---------- */
test('judge: un cuore solo quando una mossa COMPLETA una linea sbagliata', () => {
  const p = B.generate(3, HH.rng(77));
  const n = p.n, sol = p.solution;
  // riempio la riga 0 tranne l'ultima cella, in modo corretto
  const before = p.clues.slice();
  for (let c = 0; c < n - 1; c++) before[c] = sol[c];
  const last = n - 1;
  const okAfter = before.slice(); okAfter[last] = sol[last];
  const badAfter = before.slice(); badAfter[last] = 3 - sol[last];
  const j1 = B.judge(n, sol, before, okAfter, [last]);
  assert.ok(j1.right.includes(0) && !j1.wrong.includes(0));
  const j2 = B.judge(n, sol, before, badAfter, [last]);
  assert.ok(j2.wrong.includes(0));
  // cambiare colore in una linea già completa non costa altri cuori
  if (B.lineComplete(n, okAfter, 0)) assert.deepEqual(B.judge(n, sol, badAfter, okAfter, [last]).wrong, []);
  // mosse che non completano nulla: nessun giudizio
  const empty = new Array(n * n).fill(0), one = empty.slice(); one[0] = 1;
  assert.deepEqual(B.judge(n, sol, empty, one, [0]), { wrong: [], right: [] });
});

test('vittoria: solo la griglia identica alla soluzione', () => {
  const p = B.generate(6, HH.rng(5));
  assert.ok(B.isSolved(p.solution, p.solution.slice()));
  const almost = p.solution.slice(); almost[almost.length - 1] = 0;
  assert.equal(B.isSolved(p.solution, almost), false);
});

/* ---------- Salvataggio ---------- */
test('salvataggio: lo stato passa da JSON e resta valido; validate rifiuta stati corrotti', () => {
  const p = B.generate(11, HH.rng(8));
  const s = { n: p.n, solution: p.solution, givens: p.givens, board: p.clues.slice(), hist: [], moves: 0, mistakes: 0 };
  const free = s.board.indexOf(0); s.board[free] = 2; s.moves = 1; s.hist.push({ board: p.clues.slice() });
  const back = JSON.parse(JSON.stringify(s));
  assert.deepEqual(back, s);
  assert.ok(B.validate(back));
  assert.equal(B.validate({ ...back, n: 5 }), false);
  assert.equal(B.validate({ ...back, board: back.board.slice(1) }), false);
  const broken = back.board.slice(); broken[p.givens[0]] = 3 - p.solution[p.givens[0]];
  assert.equal(B.validate({ ...back, board: broken }), false, 'indizio fisso modificato');
  assert.equal(B.validate(null), false);
});

test('solveCount (interno) concorda con l’oracolo anche su griglie ambigue', () => {
  const p = B.generate(4, HH.rng(12));
  const loose = p.clues.slice();
  p.givens.slice(0, 3).forEach((i) => { loose[i] = 0; });
  assert.equal(Math.min(2, B.solveCount(p.n, loose, 2).count), oracleCount(p.n, loose, 2).count);
  assert.equal(B.solveCount(4, new Array(16).fill(0), 2).count, 2);
  assert.equal(oracleCount(4, new Array(16).fill(0), 100).count, 72);
});
