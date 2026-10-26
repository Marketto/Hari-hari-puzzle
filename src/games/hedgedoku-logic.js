/* Hedgedoku — logica pura (nessun DOM).
 * Regole: N ricci su griglia N×N divisa in N zone colorate;
 *   esattamente un riccio per riga, per colonna e per zona;
 *   due ricci non si toccano mai, nemmeno in diagonale.
 *
 * Generatore (v2):
 *   1. soluzione casuale valida (permutazione senza ricci adiacenti)
 *   2. zone fatte crescere dalle celle-soluzione (sempre connesse, dimensioni bilanciate)
 *   3. riparazione: finché esiste una seconda soluzione, una sua cella passa a una zona vicina
 *   4. accettato solo se risolvibile con pura logica (logicSolve), senza tentativi
 *
 * Esporta HH.hedgedoku = { generate, logicSolve, findSolutions, solveCount, check, judge, validate,
 *   tapValue, isDoubleTap, lookAt, nearHogs, ... }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Permutazione casuale con |p[r] - p[r+1]| > 1 (ricci mai adiacenti)
  function randomSolution(n, rnd) {
    const p = new Array(n), used = new Array(n).fill(false);
    function rec(r) {
      if (r === n) return true;
      for (const c of shuffle([...Array(n).keys()], rnd)) {
        if (used[c] || (r > 0 && Math.abs(c - p[r - 1]) <= 1)) continue;
        used[c] = true; p[r] = c;
        if (rec(r + 1)) return true;
        used[c] = false;
      }
      return false;
    }
    return rec(0) ? p : null;
  }

  // Zone: ogni cella libera adiacente a una zona viene assegnata, preferendo le zone piccole
  function growRegions(n, sol, rnd) {
    const reg = new Array(n * n).fill(-1);
    const size = new Array(n).fill(1);
    sol.forEach((c, r) => { reg[r * n + c] = r; });
    const balanced = rnd() < 0.6;
    for (let left = n * n - n; left > 0; left--) {
      const opts = [];
      for (let i = 0; i < n * n; i++) {
        if (reg[i] !== -1) continue;
        const r = (i / n) | 0, c = i % n;
        for (const [dr, dc] of D4) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
          const g = reg[rr * n + cc];
          if (g >= 0) opts.push([i, g]);
        }
      }
      let pick = opts[0], best = -1;
      for (const o of opts) {
        const w = (balanced ? 1 / size[o[1]] : 1) * (0.25 + rnd());
        if (w > best) { best = w; pick = o; }
      }
      reg[pick[0]] = pick[1];
      size[pick[1]]++;
    }
    return reg;
  }

  // Trova fino a "limit" soluzioni (array: colonna del riccio per ogni riga)
  function findSolutions(n, reg, limit = 2) {
    const out = [], p = [];
    const colUsed = new Array(n).fill(false), regUsed = new Array(n).fill(false);
    (function rec(r) {
      if (out.length >= limit) return;
      if (r === n) { out.push(p.slice()); return; }
      for (let c = 0; c < n; c++) {
        const g = reg[r * n + c];
        if (colUsed[c] || regUsed[g] || (r > 0 && Math.abs(c - p[r - 1]) <= 1)) continue;
        colUsed[c] = regUsed[g] = true; p[r] = c;
        rec(r + 1);
        colUsed[c] = regUsed[g] = false;
      }
    })(0);
    return out;
  }
  const solveCount = (n, reg, limit = 2) => findSolutions(n, reg, limit).length;

  function regionConnected(n, reg, g, skip = -1) {
    const cells = [];
    for (let i = 0; i < n * n; i++) if (reg[i] === g && i !== skip) cells.push(i);
    if (!cells.length) return false;
    const seen = new Set([cells[0]]), st = [cells[0]];
    while (st.length) {
      const i = st.pop(), r = (i / n) | 0, c = i % n;
      for (const [dr, dc] of D4) {
        const rr = r + dr, cc = c + dc, j = rr * n + cc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || j === skip || seen.has(j) || reg[j] !== g) continue;
        seen.add(j); st.push(j);
      }
    }
    return seen.size === cells.length;
  }

  // Rende unica la soluzione spostando celle delle soluzioni alternative in zone vicine
  function repair(n, reg, sol, rnd, maxIter) {
    const solSet = new Set(sol.map((c, r) => r * n + c));
    for (let it = 0; it < maxIter; it++) {
      const sols = findSolutions(n, reg, 2);
      if (sols.length === 1) return true;
      const alt = sols.find((s) => s.some((c, r) => c !== sol[r]));
      if (!alt) return false;
      const cells = shuffle(alt.map((c, r) => r * n + c).filter((i) => !solSet.has(i)), rnd);
      let moved = false;
      for (const i of cells) {
        const g = reg[i], r = (i / n) | 0, c = i % n;
        const nb = shuffle(D4.map(([dr, dc]) => [r + dr, c + dc]), rnd)
          .filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < n && cc < n)
          .map(([rr, cc]) => reg[rr * n + cc])
          .filter((h) => h !== g);
        if (!nb.length || !regionConnected(n, reg, g, i)) continue;
        reg[i] = nb[0];
        moved = true;
        break;
      }
      if (!moved) return false;
    }
    return findSolutions(n, reg, 2).length === 1;
  }

  /* Risolutore "umano": solo deduzioni, nessun tentativo.
   * Tecniche (livello):
   *   1 unico posto possibile in riga/colonna/zona
   *   2 una casella che, se occupata, svuoterebbe un'altra riga/colonna/zona viene scartata
   *   3-5 confinamento di k=1..3 zone in k righe/colonne (e viceversa)
   * Ritorna { ok, tech, steps }. */
  function logicSolve(n, reg) {
    const N = n * n;
    const cand = new Uint8Array(N).fill(1);
    const hog = new Uint8Array(N);
    const rowOf = (i) => (i / n) | 0, colOf = (i) => i % n;
    const units = [];
    for (let r = 0; r < n; r++) units.push([...Array(n)].map((_, c) => r * n + c));
    for (let c = 0; c < n; c++) units.push([...Array(n)].map((_, r) => r * n + c));
    for (let g = 0; g < n; g++) units.push([]);
    for (let i = 0; i < N; i++) units[2 * n + reg[i]].push(i);
    const unitOf = [(i) => rowOf(i), (i) => n + colOf(i), (i) => 2 * n + reg[i]];

    function blocked(i) {
      const out = new Set();
      const r = rowOf(i), c = colOf(i);
      for (const u of unitOf) units[u(i)].forEach((j) => out.add(j));
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n) out.add(rr * n + cc);
      }
      out.delete(i);
      return out;
    }
    const BL = [...Array(N)].map((_, i) => blocked(i));
    const done = (u) => units[u].some((i) => hog[i]);
    const cands = (u) => units[u].filter((i) => cand[i]);
    let placed = 0, tech = 0, steps = 0;

    function place(i) {
      hog[i] = 1; cand[i] = 0; placed++;
      BL[i].forEach((j) => { cand[j] = 0; });
    }

    // insiemi di gruppi: [famiglia A, famiglia B] per il confinamento
    const fam = { row: [...Array(n).keys()], col: [...Array(n).keys()].map((c) => n + c), reg: [...Array(n).keys()].map((g) => 2 * n + g) };
    const PAIRS = [['reg', 'row', 0], ['reg', 'col', 1], ['row', 'reg', 2], ['col', 'reg', 2], ['row', 'col', 1], ['col', 'row', 0]];

    function combos(arr, k, start = 0, acc = [], out = []) {
      if (acc.length === k) { out.push(acc.slice()); return out; }
      for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combos(arr, k, i + 1, acc, out); acc.pop(); }
      return out;
    }

    for (let guard = 0; guard < 500 && placed < n; guard++) {
      let progress = false;
      // T1: unico posto
      for (let u = 0; u < 3 * n; u++) {
        if (done(u)) continue;
        const cs = cands(u);
        if (!cs.length) return { ok: false, tech, steps, contradiction: true };
        if (cs.length === 1) { place(cs[0]); progress = true; tech = Math.max(tech, 1); steps++; }
      }
      if (progress) continue;
      // T2: casella che svuoterebbe un'altra unità
      for (let i = 0; i < N; i++) {
        if (!cand[i]) continue;
        const bl = BL[i];
        for (let u = 0; u < 3 * n; u++) {
          if (done(u) || units[u].includes(i)) continue;
          const cs = cands(u);
          if (cs.length && cs.every((j) => bl.has(j))) { cand[i] = 0; progress = true; tech = Math.max(tech, 2); steps++; break; }
        }
      }
      if (progress) continue;
      // T3-5: confinamento di k gruppi
      for (let k = 1; k <= 3 && !progress; k++) {
        for (const [A, B, which] of PAIRS) {
          const open = fam[A].filter((u) => !done(u));
          if (open.length <= k) continue;
          for (const set of combos(open, k)) {
            const inSet = new Set();
            const cover = new Set();
            set.forEach((u) => cands(u).forEach((i) => { inSet.add(i); cover.add(unitOf[which](i)); }));
            if (cover.size !== k) continue;
            cover.forEach((v) => cands(v).forEach((i) => {
              if (!inSet.has(i)) { cand[i] = 0; progress = true; }
            }));
            if (progress) { tech = Math.max(tech, 2 + k); steps++; break; }
          }
          if (progress) break;
        }
      }
      if (!progress) break;
    }
    return { ok: placed === n, tech, steps, hogs: [...hog.keys()].filter((i) => hog[i]) };
  }

  function generate(n, rnd = Math.random, opts = {}) {
    const maxTries = opts.maxTries || 200;
    const maxTech = opts.maxTech || 5;
    const minTech = opts.minTech || 0; // difficoltà minima richiesta (livelli alti)
    let fallback = null;
    for (let t = 0; t < maxTries; t++) {
      const sol = randomSolution(n, rnd);
      const reg = growRegions(n, sol, rnd);
      if (!repair(n, reg, sol, rnd, n * n * 2)) continue;
      const L = logicSolve(n, reg);
      const puzzle = { n, regions: reg, solution: sol, unique: true, logical: L.ok, tech: L.tech };
      if (L.ok && L.tech <= maxTech && L.tech >= minTech) return puzzle;
      if (!fallback || (L.ok && !fallback.logical)) fallback = puzzle;
    }
    if (fallback) return fallback;
    return generate(n, rnd, { maxTries: maxTries * 2, maxTech: 5 });
  }

  /* board: array n*n con 0 vuoto, 1 segno ✕, 2 riccio.
   * Ritorna { conflicts:Set<index>, placed, solved } */
  function check(n, reg, board) {
    const hs = [];
    board.forEach((v, i) => { if (v === 2) hs.push(i); });
    const conflicts = new Set();
    for (let a = 0; a < hs.length; a++) {
      for (let b = a + 1; b < hs.length; b++) {
        const i = hs[a], j = hs[b];
        const ri = (i / n) | 0, ci = i % n, rj = (j / n) | 0, cj = j % n;
        const clash = ri === rj || ci === cj || reg[i] === reg[j] ||
          (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1);
        if (clash) { conflicts.add(i); conflicts.add(j); }
      }
    }
    return { conflicts, placed: hs.length, solved: hs.length === n && conflicts.size === 0 };
  }

  /* Giudica un riccio messo nella cella i.
   *   correct: la cella fa parte dell'unica soluzione
   *   blockers: ricci già presenti che violano una regola con i (stessa riga/colonna/zona o adiacenti)
   * Un riccio corretto non ha mai blockers se sulla griglia ci sono solo ricci corretti. */
  function judge(n, reg, sol, board, i) {
    const correct = sol[(i / n) | 0] === i % n;
    const tmp = board.slice();
    tmp[i] = 2;
    const blockers = [...check(n, reg, tmp).conflicts].filter((j) => j !== i);
    return { correct, blockers };
  }

  // Controllo strutturale di un livello (usato da test e dal caricamento dei salvataggi)
  function validate(n, reg) {
    if (!Array.isArray(reg) || reg.length !== n * n) return false;
    for (let g = 0; g < n; g++) if (!regionConnected(n, reg, g)) return false;
    return reg.every((g) => Number.isInteger(g) && g >= 0 && g < n);
  }

  /* ---------- Comandi e reazioni (puri, usati dalla UI e dai test) ---------- */
  // Tap singolo: vuoto ↔ ✕; un riccio viene tolto e la cella resta vuota.
  const tapValue = (v) => (v === 0 ? 1 : 0);

  // Il tocco corrente forma un doppio tap col precedente? Stessa cella, entro "win" ms dal rilascio del primo.
  const DOUBLE_TAP_MS = 300;
  function isDoubleTap(last, i, now, win = DOUBLE_TAP_MS) {
    return !!last && last.i === i && now - last.t >= 0 && now - last.t < win;
  }

  // Direzione dello sguardo da "from" verso "to": vettore unitario (x a destra, y in giù) e inclinazione della testa
  function lookAt(n, from, to) {
    const dr = ((to / n) | 0) - ((from / n) | 0), dc = (to % n) - (from % n);
    const d = Math.hypot(dr, dc);
    if (!d) return { x: 0, y: 0, tilt: 0 };
    const r2 = (v) => Math.round(v * 100) / 100 || 0;
    return { x: r2(dc / d), y: r2(dr / d), tilt: Math.sign(dc) * 8 };
  }

  // Ricci (valore 2) entro distanza di Chebyshev "d" dalla cella i, esclusa i
  function nearHogs(n, board, i, d = 2) {
    const r = (i / n) | 0, c = i % n, out = [];
    board.forEach((v, k) => {
      if (v !== 2 || k === i) return;
      if (Math.max(Math.abs(((k / n) | 0) - r), Math.abs((k % n) - c)) <= d) out.push(k);
    });
    return out;
  }

  HH.hedgedoku = { generate, logicSolve, findSolutions, solveCount, check, judge, validate, randomSolution, growRegions, regionConnected,
    tapValue, isDoubleTap, DOUBLE_TAP_MS, lookAt, nearHogs };
})(typeof globalThis !== 'undefined' ? globalThis : window);
