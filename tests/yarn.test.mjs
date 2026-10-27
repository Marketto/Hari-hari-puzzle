// Unit test Yarn Link: ogni livello generato deve avere UNA sola soluzione che riempie tutta la griglia,
// verificata con un oracolo indipendente (programmazione dinamica sul profilo, "broken profile"),
// che non usa né il generatore né il risolutore DFS del gioco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/yarn-logic.js');
const Y = HH.yarn;

/* ---------- Oracolo indipendente ----------
 * Scorre le caselle riga per riga; lo stato è il "profilo" dei fili che attraversano il bordo tra la parte già vista
 * e il resto: per ogni colonna il filo che scende dalla casella sopra, più quello che arriva da sinistra.
 * Un filo aperto è "colorato" (parte da un gomitolo, codice 1..K) oppure una coppia di estremi senza gomitolo
 * (stesso codice ≥ 13). Gomitolo = grado 1, casella normale = grado 2, niente cicli, niente colori misti.
 * Conta le soluzioni (saturando a cap). */
function countSolutions(n, ends, cap = 2) {
  const N = n * n, E = new Int8Array(N);
  ends.forEach(([a, b], k) => { E[a] = E[b] = k + 1; });
  const W = n + 1, B = 32;
  const enc = (s) => {
    const map = {}; let nx = 13, key = 0;
    for (let i = 0; i < W; i++) { let v = s[i]; if (v >= 13) { if (!map[v]) map[v] = nx++; v = map[v]; } key = key * B + v; }
    return key;
  };
  const dec = (key, s) => { for (let i = W - 1; i >= 0; i--) { s[i] = key % B; key = Math.floor(key / B); } };
  let cur = new Map([[0, 1]]);
  const s = new Array(W);
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / n), c = i % n, nxt = new Map();
    const add = (st, v) => { const k = enc(st); nxt.set(k, Math.min(cap, (nxt.get(k) || 0) + v)); };
    for (const [key, v] of cur) {
      dec(key, s);
      const u = s[c], l = s[n], kc = E[i];
      const partner = (p) => { for (let j = 0; j < W; j++) if (j !== c && j !== n && s[j] === p) return j; return -1; };
      const t = s.slice(); t[c] = 0; t[n] = 0;
      if (kc) {
        if (u && l) continue;
        const x = u || l;
        if (x) {
          if (x < 13) { if (x === kc) add(t, v); } else { t[partner(x)] = kc; add(t, v); }
        } else {
          if (r < n - 1) { const q = t.slice(); q[c] = kc; add(q, v); }
          if (c < n - 1) { const q = t.slice(); q[n] = kc; add(q, v); }
        }
      } else if (u && l) {
        if (u < 13 && l < 13) { if (u === l) add(t, v); }
        else if (u < 13 || l < 13) { t[partner(u < 13 ? l : u)] = u < 13 ? u : l; add(t, v); }
        else if (u !== l) { t[partner(l)] = u; add(t, v); }
      } else if (u || l) {
        const x = u || l;
        if (r < n - 1) { const q = t.slice(); q[c] = x; add(q, v); }
        if (c < n - 1) { const q = t.slice(); q[n] = x; add(q, v); }
      } else if (r < n - 1 && c < n - 1) { const q = t.slice(); q[c] = 31; q[n] = 31; add(q, v); }
    }
    cur = nxt;
    if (!cur.size) return 0;
  }
  return cur.get(0) || 0;
}

// controllo indipendente di una soluzione: fili semplici, passi ortogonali, estremi giusti, copertura totale
function validSolution(n, ends, paths) {
  if (paths.length !== ends.length) return false;
  const seen = new Set(), endSet = new Set(ends.flat());
  for (let k = 0; k < paths.length; k++) {
    const p = paths[k], [a, b] = ends[k];
    if (p.length < 2) return false;
    if (!((p[0] === a && p.at(-1) === b) || (p[0] === b && p.at(-1) === a))) return false;
    for (let i = 0; i < p.length; i++) {
      if (seen.has(p[i]) || p[i] < 0 || p[i] >= n * n) return false;
      seen.add(p[i]);
      if (i > 0 && i < p.length - 1 && endSet.has(p[i])) return false;
      if (i > 0) {
        const dr = Math.abs(Math.floor(p[i] / n) - Math.floor(p[i - 1] / n)), dc = Math.abs((p[i] % n) - (p[i - 1] % n));
        if (dr + dc !== 1) return false;
      }
    }
  }
  return seen.size === n * n;
}

test('l’oracolo funziona su casi noti', () => {
  // 2×2 con due colori in colonna: unica
  assert.equal(countSolutions(2, [[0, 2], [1, 3]]), 1);
  // 2×2 a un colore: tra angoli vicini c'è un solo giro, tra angoli opposti nessuno
  assert.equal(countSolutions(2, [[0, 1]]), 1);
  assert.equal(countSolutions(2, [[0, 3]]), 0);
  // 3×3 da angolo ad angolo opposto: cammini hamiltoniani 0→8 (sono 2)
  assert.equal(countSolutions(3, [[0, 8]], 10), 2);
  // due colori incrociati: impossibile
  assert.equal(countSolutions(3, [[1, 7], [3, 5]]), 0);
});

/* ---------- Livelli 1–20 ---------- */
for (let level = 1; level <= 20; level++) {
  const seeds = level <= 9 ? 20 : 10;
  test(`livello ${level} (${Y.sizeFor(level)}×${Y.sizeFor(level)}): risolvibile e a soluzione unica (${seeds} semi)`, () => {
    for (let seed = 1; seed <= seeds; seed++) {
      const p = Y.generate(level, HH.rng(seed * 9973 + level));
      const n = p.n, tag = `L${level} seed=${seed}`;
      assert.equal(n, Y.sizeFor(level), tag);
      assert.ok(p.ends.length >= 3 && p.ends.length <= Y.MAX_COLORS, `${tag}: ${p.ends.length} colori`);
      assert.equal(new Set(p.ends.flat()).size, 2 * p.ends.length, `${tag}: gomitoli sovrapposti`);
      assert.ok(validSolution(n, p.ends, p.solution), `${tag}: soluzione dichiarata non valida`);
      assert.equal(countSolutions(n, p.ends), 1, `${tag}: soluzione non unica`);
      assert.ok(Y.isSolved(n, p.ends, p.solution), `${tag}: isSolved rifiuta la soluzione`);
      assert.equal(Y.isSolved(n, p.ends, p.ends.map(() => [])), false, `${tag}: già risolto all'inizio`);
    }
  });
}

test('difficoltà crescente: griglia e lunghezza media dei fili non diminuiscono', () => {
  let prevN = 0;
  for (let level = 1; level <= 25; level++) { assert.ok(Y.sizeFor(level) >= prevN); prevN = Y.sizeFor(level); }
  assert.deepEqual([1, 3, 6, 10, 15].map(Y.sizeFor), [5, 6, 7, 8, 9]);
  const avgLen = (level) => {
    let t = 0;
    for (let s = 0; s < 8; s++) { const p = Y.generate(level, HH.rng(s + 31)); t += (p.n * p.n) / p.ends.length; }
    return t / 8;
  };
  assert.ok(avgLen(1) < avgLen(9) && avgLen(9) < avgLen(20));
});

test('fallback a righe dritte: soluzione unica per ogni taglia', () => {
  for (const n of [5, 6, 7, 8, 9]) {
    const sol = Y.rowsPuzzle(n), ends = sol.map((p) => [p[0], p.at(-1)]);
    assert.ok(validSolution(n, ends, sol));
    assert.equal(countSolutions(n, ends), 1, `righe ${n}`);
  }
});

test('il risolutore del gioco concorda con l’oracolo (anche su puzzle con più soluzioni)', () => {
  const rnd = HH.rng(2024);
  for (let t = 0; t < 30; t++) {
    const n = 4 + (t % 4);
    const paths = Y.grow(n, n - 1, rnd);
    if (paths.some((p) => p.length < 2)) continue;
    const ends = paths.map((p) => [p[0], p.at(-1)]);
    const r = Y.solve(n, ends, { limit: 2, nodeLimit: 1e6 });
    assert.equal(r.aborted, false);
    assert.equal(r.count, countSolutions(n, ends), `n=${n} t=${t}`);
    r.solutions.forEach((s) => assert.ok(validSolution(n, ends, s)));
  }
});

test('determinismo: stesso seme, stesso livello', () => {
  for (const level of [1, 7, 16]) {
    assert.deepEqual(Y.generate(level, HH.rng(5)), Y.generate(level, HH.rng(5)));
  }
  assert.notDeepEqual(Y.generate(12, HH.rng(1)).ends, Y.generate(12, HH.rng(2)).ends);
});

test('generazione veloce (media < 25 ms anche sul 9×9 più difficile)', () => {
  const t = performance.now();
  for (let s = 0; s < 20; s++) Y.generate(20, HH.rng(700 + s));
  assert.ok((performance.now() - t) / 20 < 25 * SLOW);
});

/* ---------- Regole del disegno ---------- */
// 3×3:  0 1 2 / 3 4 5 / 6 7 8 — rosso 0→2 (in alto), blu 3→8
const n = 3, ends = [[0, 2], [3, 8]];

test('beginStroke: dal gomitolo il filo riparte, da un filo si accorcia fino a lì, sul vuoto niente', () => {
  const paths = [[0, 1], [3, 4, 5]];
  assert.deepEqual(Y.beginStroke(n, ends, paths, 0), { k: 0, drawn: [0], keep: null });
  assert.deepEqual(Y.beginStroke(n, ends, paths, 8), { k: 1, drawn: [8], keep: [3, 4, 5] });
  assert.deepEqual(Y.beginStroke(n, ends, paths, 4), { k: 1, drawn: [3, 4], keep: null });
  assert.deepEqual(Y.beginStroke(n, ends, [[0, 1, 2], []], 2), { k: 0, drawn: [2], keep: null }, 'filo chiuso: riparte');
  assert.equal(Y.beginStroke(n, ends, paths, 7), null);
});

test('extend: passi ortogonali, si riavvolge tornando indietro, si ferma sul gomitolo gemello', () => {
  assert.equal(Y.extend(n, ends, 0, [0], 4), null, 'diagonale');
  assert.equal(Y.extend(n, ends, 0, [0], 2), null, 'non adiacente');
  assert.deepEqual(Y.extend(n, ends, 0, [0], 1), [0, 1]);
  assert.deepEqual(Y.extend(n, ends, 0, [0, 1, 4], 1), [0, 1], 'riavvolge');
  assert.deepEqual(Y.extend(n, ends, 0, [0, 1], 2), [0, 1, 2]);
  assert.equal(Y.extend(n, ends, 0, [0, 1, 2], 5), null, 'filo chiuso: non si va oltre');
  assert.equal(Y.extend(n, ends, 0, [0], 3), null, 'gomitolo di un altro colore');
  assert.equal(Y.extend(n, ends, 1, [3, 4, 7], 6) === null, false, 'casella vuota');
  assert.deepEqual(Y.extend(n, ends, 1, [3, 4], 3), [3], 'tornando sul gomitolo di partenza il filo si riavvolge tutto');
});

test('applyStroke: un filo nuovo taglia quelli che incrocia prima del punto d’incrocio', () => {
  const before = [[0, 1, 4, 5], [3, 6]];
  const after = Y.applyStroke(before, 1, [3, 4, 7, 8]);
  assert.deepEqual(after, [[0, 1], [3, 4, 7, 8]]);
  assert.equal(Y.lostCells(before, after), 2 + 1);
  // taglio sul secondo passo: resta solo il gomitolo → filo vuoto
  assert.deepEqual(Y.applyStroke([[0, 1, 4], []], 1, [3, 4, 1])[0], []);
  // estendere un filo non è un ripensamento
  assert.equal(Y.lostCells([[0, 1], []], [[0, 1, 2], []]), 0);
  assert.equal(Y.lostCells([[0, 1, 2], []], [[2], []]) > 0, true);
});

test('status e isSolved: serve ogni coppia collegata E ogni casella piena', () => {
  const sol = [[0, 1, 2], [3, 6, 7, 4, 5, 8]];
  assert.ok(Y.isSolved(n, ends, sol));
  assert.equal(Y.status(n, ends, sol).solved, true);
  const notFull = [[0, 1, 2], [3, 4, 5, 8]];
  const st = Y.status(n, ends, notFull);
  assert.equal(st.connected, 2);
  assert.equal(st.filled, 7);
  assert.equal(st.solved, false);
  assert.equal(Y.isSolved(n, ends, [[0, 1, 2], [3, 6, 7, 8]]), false);
  assert.equal(Y.isSolved(n, ends, [[0, 1, 2], [3, 6, 7, 4, 1, 2]]), false, 'sovrapposizione');
  assert.equal(Y.progress(n, ends, sol), 1);
  assert.ok(Y.progress(n, ends, notFull) < 1 && Y.progress(n, ends, notFull) > Y.progress(n, ends, [[], []]));
});

test('fragoline: 3 con ≤ 1 ripensamento (≤ 2 con 8+ colori), 2 fino a uno per colore, poi 1', () => {
  assert.equal(Y.rate(0, 5), 3);
  assert.equal(Y.rate(1, 5), 3);
  assert.equal(Y.rate(2, 5), 2);
  assert.equal(Y.rate(5, 5), 2);
  assert.equal(Y.rate(6, 5), 1);
  assert.equal(Y.rate(2, 8), 3);
  assert.equal(Y.rate(3, 8), 2);
});

test('dall’altro gomitolo si raggiunge il pezzo già steso: i due pezzi si uniscono', () => {
  const before = [[], [3, 6, 7]];
  const st = Y.beginStroke(n, ends, before, 8);
  let d = st.drawn;
  d = Y.strokeStep(n, ends, 1, d, st.keep, 5);
  d = Y.strokeStep(n, ends, 1, d, st.keep, 4);
  assert.deepEqual(Y.strokePaths(before, 1, d, st.keep)[1], [8, 5, 4], 'non ancora unito: vale il nuovo filo');
  d = Y.strokeStep(n, ends, 1, d, st.keep, 7);
  const out = Y.strokePaths(before, 1, d, st.keep);
  assert.deepEqual(out[1], [3, 6, 7, 4, 5, 8]);
  assert.ok(Y.isComplete(out[1], ends[1]));
  assert.equal(Y.strokeStep(n, ends, 1, d, st.keep, 6), null, 'unito: solo indietro');
  assert.deepEqual(Y.strokeStep(n, ends, 1, d, st.keep, 4), [8, 5, 4]);
  assert.equal(Y.lostCells(before, out), 0, 'unire non è un ripensamento');
});

/* ---------- Salvataggio e ripresa ---------- */
test('salvataggio: il livello e i fili sopravvivono a JSON; dati rovinati vengono rifiutati', () => {
  const p = Y.generate(8, HH.rng(99));
  const paths = p.solution.map((s, k) => (k % 2 ? s.slice(0, Math.max(1, s.length - 2)) : s.slice()));
  const snap = JSON.parse(JSON.stringify({ n: p.n, ends: p.ends, paths, moves: 4, rethinks: 1, hist: [] }));
  assert.ok(Y.validLevel(snap));
  snap.paths.forEach((q, k) => assert.ok(Y.validPath(snap.n, snap.ends, k, q), `filo ${k}`));
  assert.ok(Y.isSolved(snap.n, snap.ends, p.solution));
  assert.equal(Y.validLevel({ n: 7, ends: [[0, 0]] }), false);
  assert.equal(Y.validLevel({ n: 7, ends: [[0, 99]] }), false);
  assert.equal(Y.validPath(p.n, p.ends, 0, [p.ends[0][0], p.ends[0][0] + 2]), false, 'salto');
  assert.equal(Y.validPath(p.n, p.ends, 0, [p.ends[1][0]]), false, 'gomitolo sbagliato');
});
