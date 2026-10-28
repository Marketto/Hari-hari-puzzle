// Unit test Hari Sudoku: ogni livello ha UNA sola soluzione (verificata da un oracolo indipendente a backtracking),
// è risolvibile dal risolutore "a tecniche" entro la tecnica prevista, la difficoltà cresce, i livelli sono
// deterministici e riprendibili da JSON, le note automatiche e il suggerimento sono corretti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/sudoku-logic.js', 'src/games/hog-kit.js');
const S = HH.sudoku;

/* ---------- Oracolo indipendente (non usa il codice del gioco) ---------- */
function canPut(g, i, d) {
  const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
  for (let k = 0; k < 9; k++) {
    if (g[r * 9 + k] === d || g[k * 9 + c] === d) return false;
    if (g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === d) return false;
  }
  return true;
}
// conta le soluzioni fino a "limit" (prima casella vuota, cifre 1..9 in ordine)
function oracleCount(puzzle, limit = 2) {
  const g = puzzle.slice();
  let count = 0;
  (function rec() {
    if (count >= limit) return;
    let i = g.indexOf(0);
    // piccola euristica: la casella con meno possibilità (per non metterci minuti)
    let best = -1, bestN = 10;
    for (let j = 0; j < 81; j++) {
      if (g[j]) continue;
      let n = 0;
      for (let d = 1; d <= 9; d++) if (canPut(g, j, d)) n++;
      if (n < bestN) { bestN = n; best = j; }
    }
    if (best < 0) { count++; return; }
    i = best;
    for (let d = 1; d <= 9 && count < limit; d++) {
      if (!canPut(g, i, d)) continue;
      g[i] = d; rec(); g[i] = 0;
    }
  })();
  return count;
}
function validSolution(sol) {
  for (let k = 0; k < 9; k++) {
    const row = new Set(), col = new Set(), box = new Set();
    for (let j = 0; j < 9; j++) {
      row.add(sol[k * 9 + j]); col.add(sol[j * 9 + k]);
      box.add(sol[(3 * Math.floor(k / 3) + Math.floor(j / 3)) * 9 + 3 * (k % 3) + (j % 3)]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9 || [...row].some((d) => d < 1 || d > 9)) return false;
  }
  return true;
}

const cache = new Map();
const lvl = (L, v = 0) => { const k = L + ':' + v; if (!cache.has(k)) cache.set(k, S.levelPuzzle(L, v)); return cache.get(k); };

/* ---------- Livelli curati 1–30 ---------- */
test('livelli 1–30: soluzione valida, indizi coerenti, soluzione unica per l\'oracolo', () => {
  for (let L = 1; L <= 30; L++) {
    const p = lvl(L);
    assert.ok(validSolution(p.solution), `L${L}: soluzione non valida`);
    p.puzzle.forEach((v, i) => { if (v) assert.equal(v, p.solution[i], `L${L}: indizio ${i} diverso dalla soluzione`); });
    assert.ok(p.puzzle.some((v) => !v), `L${L}: già risolto`);
    assert.equal(oracleCount(p.puzzle), 1, `L${L}: non unico`);
  }
});

test('più semi (varianti e livelli senza fine): soluzione unica per l\'oracolo', () => {
  for (const [L, v] of [[1, 1], [1, 2], [5, 3], [9, 1], [12, 2], [17, 1], [22, 1], [27, 2], [31, 0], [44, 0], [60, 1]]) {
    const p = lvl(L, v);
    assert.ok(validSolution(p.solution), `L${L}v${v}`);
    assert.equal(oracleCount(p.puzzle), 1, `L${L}v${v}: non unico`);
  }
});

test('il risolutore a tecniche risolve ogni livello entro la tecnica massima prevista (e i primi coi soli single)', () => {
  for (let L = 1; L <= 30; L++) {
    const p = lvl(L), T = S.tierFor(L);
    const r = S.logicSolve(p.puzzle, T.maxTech);
    assert.ok(r.ok, `L${L}: non risolto con tecnica ≤ ${T.maxTech}`);
    assert.ok(r.tech <= T.maxTech && r.tech >= T.minTech, `L${L}: tecnica ${r.tech} fuori da ${T.minTech}–${T.maxTech}`);
    assert.deepEqual(r.grid, p.solution, `L${L}: il risolutore arriva a un'altra griglia`);
    if (L <= 10) assert.ok(r.tech <= 2, `L${L}: servono più dei single`);
    if (L <= 3) assert.equal(r.tech, 1, `L${L}: i primi livelli vogliono solo single nascosti`);
  }
});

test('le deduzioni del risolutore sono corrette: mai scartata o messa una cifra diversa dalla soluzione', () => {
  for (const L of [3, 8, 13, 18, 23, 28, 31]) {
    const p = lvl(L);
    const grid = p.puzzle.slice(), cand = S.candidates(grid);
    for (let k = 0; k < 400; k++) {
      const st = S.findStep(grid, cand, 7);
      if (!st) break;
      assert.ok(!st.bad, `L${L}: contraddizione`);
      if (st.place) assert.equal(st.place[1], p.solution[st.place[0]], `L${L}: tecnica ${st.tech} mette un numero sbagliato`);
      else st.elim.forEach(([i, d]) => assert.notEqual(d, p.solution[i], `L${L}: tecnica ${st.tech} scarta la cifra giusta`));
      S.applyStep(grid, cand, st);
    }
    assert.deepEqual(grid, p.solution);
  }
});

test('difficoltà monotona: tecnica non decrescente, a parità di tecnica punteggio non decrescente; obiettivi crescenti', () => {
  let prev = null;
  for (let L = 1; L <= 30; L++) {
    const p = lvl(L);
    if (prev) {
      assert.ok(p.tech >= prev.tech, `L${L}: tecnica ${p.tech} < ${prev.tech}`);
      if (p.tech === prev.tech) assert.ok(p.score >= prev.score, `L${L}: punteggio ${p.score} < ${prev.score}`);
    }
    prev = p;
  }
  for (let L = 1; L < 80; L++) {
    const a = S.tierFor(L), b = S.tierFor(L + 1);
    assert.ok(b.minTech >= a.minTech && b.maxTech >= a.maxTech && b.minClues <= a.minClues, `obiettivi L${L}→${L + 1}`);
  }
  // in media: gli indizi calano e il punteggio cresce da una fascia all'altra
  const band = (a, b) => { const ps = [...Array(b - a + 1)].map((_, k) => lvl(a + k)); return { clues: ps.reduce((s, p) => s + p.clues, 0) / ps.length, score: ps.reduce((s, p) => s + p.score, 0) / ps.length }; };
  const b1 = band(1, 3), b2 = band(7, 10), b3 = band(16, 20), b4 = band(26, 30);
  assert.ok(b1.clues > b2.clues && b2.clues > b3.clues - 1 && b1.score < b2.score && b2.score < b3.score && b3.score <= b4.score + 40, JSON.stringify({ b1, b2, b3, b4 }));
});

/* ---------- Determinismo e ripresa ---------- */
test('determinismo: stesso livello e variante = stesso puzzle; varianti diverse = puzzle diversi', () => {
  for (const [L, v] of [[1, 0], [14, 0], [27, 0], [33, 0], [2, 1]]) {
    const a = S.levelPuzzle(L, v), b = S.levelPuzzle(L, v);
    assert.deepEqual(a.puzzle, b.puzzle, `L${L}v${v}`);
    assert.deepEqual(a.solution, b.solution);
  }
  assert.notDeepEqual(S.levelPuzzle(4, 0).puzzle, S.levelPuzzle(4, 1).puzzle);
  assert.notDeepEqual(S.levelPuzzle(4, 0).puzzle, S.levelPuzzle(5, 0).puzzle);
});

test('ripresa da JSON: note, cronologia degli annulla, errori e aiuti sopravvivono al salvataggio', () => {
  const s = S.newGame(12);
  const empty = [...s.puzzle].map((c, i) => (c === '0' ? i : -1)).filter((i) => i >= 0);
  const [a, b, c] = empty;
  S.toggleNote(s, a, 3); S.toggleNote(s, a, 7);
  S.place(s, b, +s.solution[b], { autoNotes: true });
  const wrong = (+s.solution[c] % 9) + 1;
  S.place(s, c, wrong);
  s.hints = 2;
  const json = JSON.parse(JSON.stringify(s));
  const r = S.restore(json);
  assert.ok(r);
  assert.deepEqual(r, s);
  assert.equal(r.notes[a], S.BIT(3) | S.BIT(7));
  assert.equal(r.mistakes, 1);
  // la cronologia ripresa annulla nell'ordine giusto
  S.undo(r); assert.equal(r.board[c], 0);
  S.undo(r); assert.equal(r.board[b], 0);
  S.undo(r); assert.equal(r.notes[a], S.BIT(3));
  // salvataggi rotti vengono rifiutati
  assert.equal(S.restore({ ...json, puzzle: 'x' }), null);
  assert.equal(S.restore({ ...json, board: json.board.slice(1) }), null);
  const bad = JSON.parse(JSON.stringify(json)); bad.board[s.puzzle.search(/[1-9]/)] = 0;
  assert.equal(S.restore(bad), null, 'indizio cancellato');
  assert.equal(S.restore(null), null);
});

/* ---------- Mosse ---------- */
test('note automatiche: un numero giusto toglie la sua nota da riga, colonna e riquadro (e l\'annulla le rimette)', () => {
  const s = S.newGame(9);
  const i = s.puzzle.indexOf('0');
  const d = +s.solution[i];
  const peers = S.PEERS[i].filter((j) => s.board[j] === 0);
  const far = [...Array(81).keys()].filter((j) => j !== i && !S.PEERS[i].includes(j) && s.board[j] === 0);
  [...peers, ...far].forEach((j) => { s.notes[j] = S.BIT(d) | S.BIT((d % 9) + 1); });
  s.notes[i] = S.BIT(1) | S.BIT(2);
  const before = s.notes.slice();
  const r = S.place(s, i, d, { autoNotes: true });
  assert.equal(r.kind, 'correct');
  assert.equal(s.notes[i], 0, 'note della casella riempita');
  peers.forEach((j) => assert.equal(s.notes[j], S.BIT((d % 9) + 1), `nota ${d} rimasta nella casella ${j}`));
  far.forEach((j) => assert.equal(s.notes[j], before[j], `nota toccata fuori dalle case: ${j}`));
  S.undo(s);
  assert.deepEqual(s.notes, before, 'annulla rimette le note');
  assert.equal(s.board[i], 0);
  // senza "auto" le note restano
  S.place(s, i, d, { autoNotes: false });
  peers.forEach((j) => assert.equal(s.notes[j], before[j]));
});

test('errori, gomma, numeri bloccati, contatori e completamenti', () => {
  const s = S.newGame(2);
  const i = s.puzzle.indexOf('0');
  const right = +s.solution[i], wrong = (right % 9) + 1;
  const left0 = S.remaining(s)[right];
  s.notes[S.PEERS[i].find((j) => !s.board[j])] = S.BIT(wrong);
  const r = S.place(s, i, wrong, { autoNotes: true });
  assert.equal(r.kind, 'wrong');
  assert.equal(s.mistakes, 1);
  assert.ok(S.isWrong(s, i));
  assert.ok(S.PEERS[i].some((j) => s.notes[j] === S.BIT(wrong)), 'un errore non cancella le note');
  assert.ok(S.erase(s, i));
  assert.equal(s.board[i], 0);
  assert.equal(S.place(s, i, right).kind, 'correct');
  assert.equal(S.remaining(s)[right], left0 - 1);
  assert.equal(S.place(s, i, wrong).kind, 'locked', 'un numero giusto non si cambia');
  assert.equal(S.erase(s, i), false);
  const g = s.puzzle.search(/[1-9]/);
  assert.equal(S.place(s, g, 1).kind, 'given');
  // completa tutto tranne l'ultima casella: l'ultima mossa chiude riga, colonna, riquadro, numero e partita
  const empties = [...Array(81).keys()].filter((j) => !s.board[j]);
  const last = empties.pop();
  empties.forEach((j) => S.place(s, j, +s.solution[j]));
  assert.ok(S.progress(s) < 1);
  const fin = S.place(s, last, +s.solution[last]);
  assert.equal(fin.kind, 'correct');
  assert.equal(fin.units.length, 3);
  assert.equal(fin.digit, +s.solution[last]);
  assert.ok(fin.solved && S.isSolved(s));
  assert.equal(S.progress(s), 1);
  assert.ok(S.remaining(s).every((n) => n === 0));
});

test('progresso = caselle giuste / caselle da riempire (gli errori non contano)', () => {
  const s = S.newGame(5);
  assert.equal(S.progress(s), 0);
  const empties = [...Array(81).keys()].filter((j) => !s.board[j]);
  const half = empties.slice(0, Math.floor(empties.length / 2));
  half.forEach((j) => S.place(s, j, +s.solution[j]));
  const j = empties[empties.length - 1];
  S.place(s, j, (+s.solution[j] % 9) + 1);
  assert.equal(S.progress(s), half.length / empties.length);
});

/* ---------- Suggerimento ---------- */
test('suggerimento: sempre la cifra giusta, con la tecnica giusta; prima segnala un numero sbagliato', () => {
  for (const L of [1, 6, 12, 18, 24, 29]) {
    const s = S.newGame(L);
    const rnd = HH.rng(L * 31);
    let maxTech = 0, n = 0;
    while (!S.isSolved(s) && n < 90) {
      const h = S.hint(s);
      assert.ok(h && h.kind === 'place', `L${L}: nessun suggerimento`);
      assert.equal(h.digit, +s.solution[h.cell], `L${L}: suggerimento sbagliato`);
      assert.equal(s.board[h.cell], 0);
      assert.ok(h.cells.includes(h.cell) && h.tech >= 1 && h.tech <= 7);
      maxTech = Math.max(maxTech, h.tech);
      if (L === 1) assert.equal(h.tech, 1, 'livello 1: suggerimenti coi soli single nascosti');
      // ogni tanto il giocatore mette da sé un numero giusto altrove
      if (rnd() < 0.3) { const e = [...Array(81).keys()].filter((j) => !s.board[j]); const j = e[(rnd() * e.length) | 0]; S.place(s, j, +s.solution[j]); }
      else S.place(s, h.cell, h.digit, { autoNotes: true });
      n++;
    }
    assert.ok(S.isSolved(s), `L${L}: i suggerimenti non portano alla fine`);
    assert.ok(maxTech <= S.tierFor(L).maxTech, `L${L}: suggerimento con tecnica ${maxTech}`);
  }
  const s = S.newGame(3);
  const i = s.puzzle.indexOf('0');
  S.place(s, i, (+s.solution[i] % 9) + 1);
  const h = S.hint(s);
  assert.equal(h.kind, 'wrong');
  assert.equal(h.cell, i);
});

test('mossa facile per Hari: indica una casella risolvibile coi single (riga, colonna o riquadro)', () => {
  const s = S.newGame(7);
  const e = S.easyMove(s);
  assert.ok(e && ['row', 'col', 'box'].includes(e.kind) && e.index >= 0 && e.index < 9);
  assert.equal(e.digit, +s.solution[e.cell]);
  assert.ok(S.UNITS[e.unit].includes(e.cell));
});

/* ---------- Tempi ---------- */
test('generazione veloce: livelli curati e varianti', () => {
  S.levelPuzzle(40, 3);                                         // riscaldamento del JIT
  for (const [from, to, limit] of [[1, 10, 10], [11, 20, 10], [21, 30, 15]]) {
    const t = performance.now();
    for (let L = from; L <= to; L++) S.levelPuzzle(L, 0);
    const avg = (performance.now() - t) / (to - from + 1);
    assert.ok(avg < limit * SLOW, `livelli ${from}–${to}: media ${avg.toFixed(1)} ms`);
  }
  // varianti (Nuova partita) e livelli senza fine: più tentativi, ma comunque rapidi
  const t = performance.now();
  for (const [L, v] of [[3, 5], [8, 4], [14, 2], [19, 3], [33, 0], [41, 0]]) S.levelPuzzle(L, v);
  const avg = (performance.now() - t) / 6;
  assert.ok(avg < 250 * SLOW, `varianti: media ${avg.toFixed(0)} ms`);
});

/* ---------- Riccio condiviso con Hedgedoku ---------- */
test('hog-kit: il riccio animato condiviso con Hedgedoku', () => {
  const a = HH.hogKit.svg(), b = HH.hogKit.at(1, 2, 30, 'x');
  assert.match(a, /^<svg class="mini-hari hd-hog"/);
  assert.match(a, /hh-happy/);
  assert.match(b, /<svg class="hd-hog x" x="1" y="2" width="30" height="30"/);
  assert.ok(!b.includes('%ST%'));
});
