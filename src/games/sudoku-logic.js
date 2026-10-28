/* Hari Sudoku — logica pura (nessun DOM).
 * Regole: griglia 9×9 divisa in 9 riquadri 3×3; ogni riga, colonna e riquadro contiene i numeri 1–9 una volta sola.
 *
 * Generatore (soluzione-prima + scavo con filtro logico, come Hedgedoku: unicità + "risolvibile senza tentativi"):
 *   1. griglia piena casuale (backtracking con MRV e cifre in ordine casuale)
 *   2. scavo a coppie simmetriche (rotazione di 180°): una coppia resta tolta solo se il risolutore "a tecniche"
 *      risolve ancora il puzzle usando al massimo maxTech. Un puzzle risolto da sole deduzioni ha soluzione unica.
 *   3. accettato se la tecnica più difficile richiesta è >= minTech (altrimenti nuovo tentativo, poi il migliore)
 *   4. controllo finale col contatore di soluzioni (backtracking) per sicurezza
 *
 * Tecniche del risolutore umano (stesso contratto di HH.hedgedoku.logicSolve: { ok, tech, steps }):
 *   1 single nascosto (un numero ha un solo posto in riga/colonna/riquadro)   2 single nudo (una casella ha un solo numero)
 *   3 candidati bloccati (pointing / box-line)   4 coppie nude e nascoste   5 triple nude e nascoste
 *   6 X-wing   7 swordfish e XY-wing
 *
 * Stato della partita (JSON): { v, level, variant, tier, puzzle, solution, board, notes, hist, moves, mistakes, hints, tech, clues }
 *   puzzle/solution: stringhe di 81 cifre (0 = vuoto) · board: array 81 (0 vuoto) · notes: array 81 di maschere (bit d-1)
 *   hist: cronologia degli annulla [{ c: [[cella, valore, note], ...] }]
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  /* ---------- geometria ---------- */
  const ROW = [], COL = [], BOX = [];
  for (let i = 0; i < 81; i++) { ROW[i] = (i / 9) | 0; COL[i] = i % 9; BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0); }
  const UNITS = [];                        // 0–8 righe · 9–17 colonne · 18–26 riquadri
  for (let r = 0; r < 9; r++) UNITS.push([...Array(9)].map((_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) UNITS.push([...Array(9)].map((_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const r0 = ((b / 3) | 0) * 3, c0 = (b % 3) * 3, u = [];
    for (let k = 0; k < 9; k++) u.push((r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3));
    UNITS.push(u);
  }
  const unitsOf = (i) => [ROW[i], 9 + COL[i], 18 + BOX[i]];
  const PEERS = [...Array(81)].map((_, i) => {
    const s = new Set();
    unitsOf(i).forEach((u) => UNITS[u].forEach((j) => { if (j !== i) s.add(j); }));
    return [...s];
  });
  const PEER_SET = PEERS.map((p) => new Set(p));
  const unitKind = (u) => (u < 9 ? 'row' : u < 18 ? 'col' : 'box');
  const BIT = (d) => 1 << (d - 1);
  const POP = new Uint8Array(512);
  for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
  const DIGITS = [...Array(512)].map((_, m) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => m & BIT(d)));
  const ALL = 511;

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const toArr = (s) => (Array.isArray(s) ? s.slice() : [...String(s)].map(Number));
  const toStr = (a) => a.join('');

  /* ---------- candidati e backtracking ---------- */
  function candidates(grid) {
    const cand = new Uint16Array(81);
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      let m = ALL;
      for (const j of PEERS[i]) if (grid[j]) m &= ~BIT(grid[j]);
      cand[i] = m;
    }
    return cand;
  }

  // Conta le soluzioni fino a "limit" (MRV su maschere di bit). Con fill=true ritorna anche la prima trovata.
  function countSolutions(grid0, limit = 2, rnd = null) {
    const g = toArr(grid0);
    const rows = new Uint16Array(9), cols = new Uint16Array(9), boxes = new Uint16Array(9);
    for (let i = 0; i < 81; i++) {
      const d = g[i];
      if (!d) continue;
      const b = BIT(d);
      if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & b) return { count: 0, first: null };
      rows[ROW[i]] |= b; cols[COL[i]] |= b; boxes[BOX[i]] |= b;
    }
    let count = 0, first = null;
    (function rec() {
      if (count >= limit) return;
      let best = -1, bestM = 0, bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const m = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
        const n = POP[m];
        if (n < bestN) { best = i; bestM = m; bestN = n; if (n <= 1) break; }
      }
      if (best < 0) { count++; if (!first) first = g.slice(); return; }
      if (!bestN) return;
      const ds = rnd ? shuffle(DIGITS[bestM].slice(), rnd) : DIGITS[bestM];
      for (const d of ds) {
        const b = BIT(d);
        g[best] = d; rows[ROW[best]] |= b; cols[COL[best]] |= b; boxes[BOX[best]] |= b;
        rec();
        g[best] = 0; rows[ROW[best]] &= ~b; cols[COL[best]] &= ~b; boxes[BOX[best]] &= ~b;
        if (count >= limit) return;
      }
    })();
    return { count, first };
  }
  const solveCount = (grid, limit = 2) => countSolutions(grid, limit).count;

  // Griglia piena casuale
  function fullGrid(rnd) {
    return countSolutions(new Array(81).fill(0), 1, rnd).first;
  }

  /* ---------- risolutore "a tecniche" ----------
   * findStep(grid, cand, maxTech) -> il primo passo applicabile, dalla tecnica più facile:
   *   { tech, place: [cella, numero] } oppure { tech, elim: [[cella, numero], ...] }
   *   + units (case coinvolte) e cells (caselle del ragionamento) per il suggerimento. */
  const BOX_FIRST = [...Array(9)].map((_, k) => 18 + k).concat([...Array(18).keys()]);

  // posizioni (bit k = k-esima casella della casa) di ogni cifra in ogni casa: POS[u * 10 + d]
  const POS = new Uint16Array(270);
  function positions(cand) {
    POS.fill(0);
    for (let u = 0; u < 27; u++) {
      const cs = UNITS[u];
      for (let k = 0; k < 9; k++) {
        let m = cand[cs[k]];
        while (m) { const lb = m & -m; POS[u * 10 + 32 - Math.clz32(lb)] |= 1 << k; m ^= lb; }
      }
    }
    return POS;
  }
  const cellsOf = (u, mask) => { const out = []; for (let k = 0; k < 9; k++) if (mask & (1 << k)) out.push(UNITS[u][k]); return out; };

  function findStep(grid, cand, maxTech = 7) {
    // 1 · single nascosto (prima nei riquadri, il più facile da vedere): maschere "una volta" / "più volte"
    for (const u of BOX_FIRST) {
      let have = 0, once = 0, twice = 0;
      for (const i of UNITS[u]) {
        if (grid[i]) { have |= BIT(grid[i]); continue; }
        twice |= once & cand[i]; once |= cand[i];
      }
      if ((once | have) !== ALL) return { tech: 0, bad: true };
      const single = once & ~twice & ~have;
      if (single) {
        const b = single & -single, d = 32 - Math.clz32(b);
        const i = UNITS[u].find((j) => !grid[j] && (cand[j] & b));
        return { tech: 1, place: [i, d], units: [u], cells: [i], digit: d };
      }
    }
    // 2 · single nudo
    if (maxTech < 2) return null;
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      if (!cand[i]) return { tech: 0, bad: true };
      if (POP[cand[i]] === 1) return { tech: 2, place: [i, DIGITS[cand[i]][0]], units: unitsOf(i), cells: [i], digit: DIGITS[cand[i]][0] };
    }
    // 3 · candidati bloccati: pointing (riquadro → linea) e box-line (linea → riquadro)
    if (maxTech < 3) return null;
    const pos = positions(cand);
    for (let d = 1; d <= 9; d++) {
      const b = BIT(d);
      for (let u = 0; u < 27; u++) {
        const pm = pos[u * 10 + d];
        if (POP[pm] < 2) continue;
        let set1 = 0, set2 = 0;                       // riquadro: righe e colonne interne · linea: riquadri toccati
        for (let k = 0; k < 9; k++) if (pm & (1 << k)) { set1 |= 1 << ((k / 3) | 0); set2 |= 1 << (k % 3); }
        const c0 = UNITS[u][31 - Math.clz32(pm & -pm)];
        const targets = u >= 18 ? [POP[set1] === 1 ? ROW[c0] : -1, POP[set2] === 1 ? 9 + COL[c0] : -1] : [POP[set1] === 1 ? 18 + BOX[c0] : -1];
        for (const v of targets) {
          if (v < 0) continue;
          let elim = null;
          for (const i of UNITS[v]) {
            if (!(cand[i] & b)) continue;
            const inside = u >= 18 ? BOX[i] === u - 18 : u < 9 ? ROW[i] === u : COL[i] === u - 9;
            if (!inside) (elim = elim || []).push([i, d]);
          }
          if (elim) return { tech: 3, elim, units: [u, v], cells: cellsOf(u, pm), digit: d };
        }
      }
    }
    // 4–5 · sottoinsiemi nudi e nascosti (coppie, poi triple)
    for (let k = 2; k <= 3; k++) {
      if (maxTech < k + 2) return null;
      const st = subsets(grid, cand, pos, k);
      if (st) return st;
    }
    // 6 · X-wing
    if (maxTech < 6) return null;
    const xw = fish(cand, pos, 2);
    if (xw) return xw;
    // 7 · swordfish e XY-wing
    if (maxTech < 7) return null;
    return fish(cand, pos, 3) || xyWing(cand);
  }

  function combos(arr, k, start = 0, acc = [], out = []) {
    if (acc.length === k) { out.push(acc.slice()); return out; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combos(arr, k, i + 1, acc, out); acc.pop(); }
    return out;
  }

  // k caselle con in tutto k numeri (nudi) o k numeri chiusi in k caselle (nascosti), su maschere di bit
  function subsets(grid, cand, pos, k) {
    const tech = k + 2;
    const cm = new Uint16Array(9), dm = new Uint16Array(10);
    for (let u = 0; u < 27; u++) {
      const cs = UNITS[u];
      let emptyMask = 0, n = 0;
      for (let j = 0; j < 9; j++) { cm[j] = cand[cs[j]]; if (!grid[cs[j]]) { emptyMask |= 1 << j; n++; } }
      if (n <= k) continue;
      // nudi
      const small = [];
      for (let j = 0; j < 9; j++) if ((emptyMask >> j) & 1 && POP[cm[j]] >= 2 && POP[cm[j]] <= k) small.push(j);
      for (let x = 0; x < small.length; x++) for (let y = x + 1; y < small.length; y++) {
        const mxy = cm[small[x]] | cm[small[y]];
        if (POP[mxy] > k) continue;
        for (let z = k === 3 ? y + 1 : small.length; z < (k === 3 ? small.length : small.length + 1); z++) {
          const m = k === 3 ? mxy | cm[small[z]] : mxy;
          if (POP[m] !== k) continue;
          const set = k === 3 ? [small[x], small[y], small[z]] : [small[x], small[y]];
          let elim = null;
          for (let j = 0; j < 9; j++) {
            if (!((emptyMask >> j) & 1) || set.includes(j) || !(cm[j] & m)) continue;
            DIGITS[cm[j] & m].forEach((d) => (elim = elim || []).push([cs[j], d]));
          }
          if (elim) return { tech, elim, units: [u], cells: set.map((j) => cs[j]), digits: DIGITS[m] };
        }
      }
      // nascosti
      const ds = [];
      for (let d = 1; d <= 9; d++) { dm[d] = pos[u * 10 + d]; if (POP[dm[d]] >= 2 && POP[dm[d]] <= k) ds.push(d); }
      for (let x = 0; x < ds.length; x++) for (let y = x + 1; y < ds.length; y++) {
        const pxy = dm[ds[x]] | dm[ds[y]];
        if (POP[pxy] > k) continue;
        for (let z = k === 3 ? y + 1 : ds.length; z < (k === 3 ? ds.length : ds.length + 1); z++) {
          const pm = k === 3 ? pxy | dm[ds[z]] : pxy;
          if (POP[pm] !== k) continue;
          const dd = k === 3 ? [ds[x], ds[y], ds[z]] : [ds[x], ds[y]];
          const keep = dd.reduce((m, d) => m | BIT(d), 0);
          let elim = null;
          for (let j = 0; j < 9; j++) if ((pm >> j) & 1 && (cm[j] & ~keep)) DIGITS[cm[j] & ~keep].forEach((d) => (elim = elim || []).push([cs[j], d]));
          if (elim) return { tech, elim, units: [u], cells: cellsOf(u, pm), digits: dd };
        }
      }
    }
    return null;
  }

  // X-wing (k=2) e swordfish (k=3), per righe e per colonne: in una riga i bit di POS sono le colonne (e viceversa)
  function fish(cand, pos, k) {
    const tech = k === 2 ? 6 : 7;
    for (let d = 1; d <= 9; d++) {
      const b = BIT(d);
      for (let side = 0; side < 2; side++) {
        const lines = [];
        for (let a = 0; a < 9; a++) {
          const m = pos[(side * 9 + a) * 10 + d];
          if (POP[m] >= 2 && POP[m] <= k) lines.push(a);
        }
        if (lines.length < k) continue;
        for (const set of combos(lines, k)) {
          let cross = 0, inSet = 0;
          set.forEach((a) => { cross |= pos[(side * 9 + a) * 10 + d]; inSet |= 1 << a; });
          if (POP[cross] !== k) continue;
          const elim = [];
          for (let x = 0; x < 9; x++) {
            if (!(cross & (1 << x))) continue;
            const v = side ? x : 9 + x;                 // le case incrociate (colonne se il pesce è sulle righe)
            UNITS[v].forEach((i, a) => { if ((cand[i] & b) && !(inSet & (1 << a))) elim.push([i, d]); });
          }
          if (elim.length) {
            const cells = set.flatMap((a) => cellsOf(side * 9 + a, pos[(side * 9 + a) * 10 + d]));
            return { tech, elim, units: set.map((a) => side * 9 + a), cells, digit: d };
          }
        }
      }
    }
    return null;
  }

  function xyWing(cand) {
    const bi = [];
    for (let i = 0; i < 81; i++) if (POP[cand[i]] === 2) bi.push(i);
    for (const p of bi) {
      const [a, b] = DIGITS[cand[p]];
      const wings = bi.filter((j) => j !== p && PEER_SET[p].has(j) && POP[cand[j] & cand[p]] === 1);
      for (const x of wings) for (const y of wings) {
        if (x >= y) continue;
        const cx = cand[x] & ~cand[p], cy = cand[y] & ~cand[p];
        if (cx !== cy || POP[cx] !== 1) continue;
        if ((cand[x] & cand[p]) === (cand[y] & cand[p])) continue;   // devono usare a e b, uno per ala
        const c = DIGITS[cx][0];
        const elim = [];
        PEERS[x].forEach((i) => { if (i !== p && i !== y && PEER_SET[y].has(i) && (cand[i] & cx)) elim.push([i, c]); });
        if (elim.length) return { tech: 7, elim, units: [], cells: [p, x, y], digit: c, digits: [a, b, c] };
      }
    }
    return null;
  }

  function applyStep(grid, cand, st) {
    if (st.place) {
      const [i, d] = st.place, b = BIT(d);
      grid[i] = d; cand[i] = 0;
      for (const j of PEERS[i]) cand[j] &= ~b;
    } else st.elim.forEach(([i, d]) => { cand[i] &= ~BIT(d); });
  }

  // Peso di ogni tecnica nel punteggio di difficoltà (somma sui passi)
  const WEIGHT = [0, 1, 2, 6, 10, 16, 24, 32];

  /* Risolve con sole deduzioni. Ritorna { ok, tech (la più difficile usata), steps, uses: [conteggio per tecnica], score, grid } */
  function logicSolve(grid0, maxTech = 7) {
    const grid = toArr(grid0);
    const cand = candidates(grid);
    const uses = new Array(8).fill(0);
    let tech = 0, steps = 0, score = 0;
    for (let guard = 0; guard < 2000; guard++) {
      const st = findStep(grid, cand, maxTech);
      if (!st) break;
      if (st.bad) return { ok: false, tech, steps, uses, score, contradiction: true, grid };
      applyStep(grid, cand, st);
      tech = Math.max(tech, st.tech); uses[st.tech]++; steps++; score += WEIGHT[st.tech];
    }
    return { ok: grid.every((v) => v), tech, steps, uses, score, grid };
  }

  /* ---------- generatore ---------- */
  function dig(sol, rnd, maxTech, minClues) {
    const p = sol.slice();
    let clues = 81;
    const pairs = shuffle([...Array(41).keys()], rnd);       // 0..40: la cella i e la sua simmetrica 80-i
    for (const i of pairs) {
      const cells = i === 40 ? [40] : [i, 80 - i];
      if (clues - cells.length < minClues) continue;
      cells.forEach((c) => { p[c] = 0; });
      if (logicSolve(p, maxTech).ok) clues -= cells.length;
      else cells.forEach((c) => { p[c] = sol[c]; });
    }
    return p;
  }

  /* opts: { minTech, maxTech, minClues, maxTries }. Ritorna { puzzle, solution, tech, score, steps, clues, uses, tries } */
  function generate(opts = {}, rnd = Math.random) {
    const maxTech = opts.maxTech || 7, minTech = opts.minTech || 0, minClues = opts.minClues || 17;
    const maxTries = opts.maxTries || 40;
    let best = null;
    for (let t = 1; t <= maxTries; t++) {
      const solution = fullGrid(rnd);
      const puzzle = dig(solution, rnd, maxTech, minClues);
      const L = logicSolve(puzzle, maxTech);
      const cand = { puzzle, solution, tech: L.tech, score: L.score, steps: L.steps, uses: L.uses, clues: puzzle.filter(Boolean).length, tries: t };
      if (!best || cand.tech > best.tech || (cand.tech === best.tech && cand.score > best.score)) best = cand;
      if (L.tech >= minTech) break;
    }
    // sicurezza: soluzione unica anche per il contatore a backtracking
    if (countSolutions(best.puzzle, 2).count !== 1) throw new Error('sudoku: puzzle non unico');
    return best;
  }

  /* ---------- livelli ----------
   * 1–30 curati (difficoltà crescente), poi senza fine al livello esperto. */
  const TIERS = [
    { from: 1, name: 'easy', minTech: 1, maxTech: 1, clues: (l) => 46 - (l - 1) * 2 },    // 1–3: solo single nascosti, 46 → 42 indizi
    { from: 4, name: 'easy', minTech: 1, maxTech: 2, clues: (l) => 40 - (l - 4) * 2 },    // 4–6: anche single nudi, 40 → 36
    { from: 7, name: 'medium', minTech: 2, maxTech: 2, clues: (l) => 33 - (l - 7) },      // 7–10: single, puzzle quasi minimi
    { from: 11, name: 'medium', minTech: 3, maxTech: 3, clues: () => 26 },                // 11–15: pointing / box-line
    { from: 16, name: 'hard', minTech: 4, maxTech: 4, clues: () => 24 },                  // 16–20: coppie
    { from: 21, name: 'hard', minTech: 5, maxTech: 5, clues: () => 22 },                  // 21–25: triple
    { from: 26, name: 'expert', minTech: 6, maxTech: 7, clues: () => 22 },                // 26+: X-wing, swordfish, XY-wing
  ];
  const CURATED = 30;
  function tierFor(level) {
    level = Math.max(1, level | 0);
    let k = 0;
    for (let j = 0; j < TIERS.length; j++) if (level >= TIERS[j].from) k = j;
    const T = TIERS[k];
    return { tier: k, name: T.name, minTech: T.minTech, maxTech: T.maxTech, minClues: Math.max(17, T.clues(Math.min(level, CURATED))) };
  }
  // seme del livello: ogni (livello, variante) dà sempre lo stesso puzzle
  const seedFor = (level, variant = 0) => ((level * 7919 + variant * 104729 + 0x5d0c) * 2654435761) >>> 0;
  const rngOf = (seed) => (HH.rng ? HH.rng(seed) : (() => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })());

  /* Semi dei livelli curati, scelti offline: al primo tentativo danno la tecnica della fascia e una difficoltà
   * (tecnica, poi punteggio) che non cala mai da un livello al successivo. Vedi docs/games/sudoku.md. */
  const CURATED_SEEDS = [1039598, 2087115, 3134632, 4047526, 5102962, 6142560, 9914213, 9219550, 10227472, 11948104,
    13066892, 14637063, 15747932, 14245531, 19007059, 19040944, 18758069, 24604500, 24329544, 86028682,
    23819227, 27511690, 23190125, 62906119, 182564418, 30141715, 27768224, 34081876, 32547799, 38774342];

  function levelPuzzle(level, variant = 0) {
    const T = tierFor(level);
    const curated = level <= CURATED && !variant;
    const seed = curated ? CURATED_SEEDS[level - 1] : seedFor(level, variant);
    // varianti ("Nuova partita") e livelli senza fine: fino a 60 tentativi, poi il più difficile trovato (sempre unico)
    const p = generate({ minTech: T.minTech, maxTech: T.maxTech, minClues: T.minClues, maxTries: 60 }, rngOf(seed));
    return Object.assign(p, { level, variant, tier: T.tier, tierName: T.name });
  }

  /* ---------- partita ---------- */
  function newGame(level, variant = 0) {
    const p = levelPuzzle(level, variant);
    return {
      v: 1, level, variant, tier: p.tier, tech: p.tech, clues: p.clues,
      puzzle: toStr(p.puzzle), solution: toStr(p.solution),
      board: p.puzzle.slice(), notes: new Array(81).fill(0), hist: [], moves: 0, mistakes: 0, hints: 0,
    };
  }
  const isGiven = (s, i) => s.puzzle[i] !== '0';
  const sol = (s, i) => +s.solution[i];
  const isRight = (s, i) => s.board[i] !== 0 && s.board[i] === sol(s, i);
  const isWrong = (s, i) => s.board[i] !== 0 && s.board[i] !== sol(s, i);
  const toFill = (s) => [...s.puzzle].filter((c) => c === '0').length;

  // Controllo di un salvataggio (struttura e coerenza con la soluzione)
  function validate(s) {
    if (!s || typeof s !== 'object' || typeof s.puzzle !== 'string' || typeof s.solution !== 'string') return false;
    if (!/^[0-9]{81}$/.test(s.puzzle) || !/^[1-9]{81}$/.test(s.solution)) return false;
    if (!Array.isArray(s.board) || s.board.length !== 81 || !Array.isArray(s.notes) || s.notes.length !== 81) return false;
    for (let i = 0; i < 81; i++) {
      if (s.puzzle[i] !== '0' && (s.puzzle[i] !== s.solution[i] || s.board[i] !== +s.puzzle[i])) return false;
      if (!Number.isInteger(s.board[i]) || s.board[i] < 0 || s.board[i] > 9) return false;
      if (!Number.isInteger(s.notes[i]) || s.notes[i] < 0 || s.notes[i] > ALL) return false;
    }
    for (const u of UNITS) if (new Set(u.map((i) => s.solution[i])).size !== 9) return false;
    return true;
  }
  // Ripresa da JSON: valida e completa i campi mancanti
  function restore(saved) {
    if (!validate(saved)) return null;
    const s = Object.assign({ hist: [], moves: 0, mistakes: 0, hints: 0, variant: 0, level: 1 }, JSON.parse(JSON.stringify(saved)));
    s.hist = Array.isArray(s.hist) ? s.hist.filter((h) => h && Array.isArray(h.c)) : [];
    return s;
  }

  function record(s, cells) {
    s.hist.push({ c: cells.map((i) => [i, s.board[i], s.notes[i]]) });
    if (s.hist.length > 300) s.hist.shift();
  }

  // Case (riga/colonna/riquadro) della cella i completate correttamente, e il numero d completato
  function completions(s, i) {
    const units = unitsOf(i).filter((u) => UNITS[u].every((j) => isRight(s, j)));
    const d = s.board[i];
    const digit = d && remaining(s)[d] === 0 ? d : 0;
    return { units, digit };
  }

  /* Mette il numero d nella cella i. opts.autoNotes: toglie d dalle note di riga, colonna e riquadro.
   * Ritorna { kind: 'given'|'locked'|'same'|'correct'|'wrong', units, digit, solved } */
  function place(s, i, d, opts = {}) {
    if (isGiven(s, i)) return { kind: 'given' };
    if (isRight(s, i)) return { kind: 'locked' };          // un numero giusto resta (la gomma non serve)
    if (s.board[i] === d) return { kind: 'same' };
    const right = d === sol(s, i);
    const touched = [i];
    if (right && opts.autoNotes) PEERS[i].forEach((j) => { if (s.notes[j] & BIT(d)) touched.push(j); });
    record(s, touched);
    s.board[i] = d;
    s.notes[i] = 0;
    s.moves++;
    if (!right) { s.mistakes++; return { kind: 'wrong', units: [], digit: 0, solved: false }; }
    touched.forEach((j) => { if (j !== i) s.notes[j] &= ~BIT(d); });
    const c = completions(s, i);
    return { kind: 'correct', units: c.units, digit: c.digit, solved: isSolved(s) };
  }

  // Nota a matita: accende/spegne d nella cella i (solo caselle vuote)
  function toggleNote(s, i, d) {
    if (s.board[i] !== 0) return false;
    record(s, [i]);
    s.notes[i] ^= BIT(d);
    s.moves++;
    return true;
  }

  // Gomma: toglie un numero sbagliato o tutte le note della casella
  function erase(s, i) {
    if (isGiven(s, i) || isRight(s, i)) return false;
    if (!s.board[i] && !s.notes[i]) return false;
    record(s, [i]);
    if (s.board[i]) s.board[i] = 0; else s.notes[i] = 0;
    s.moves++;
    return true;
  }

  function undo(s) {
    const h = s.hist.pop();
    if (!h) return null;
    h.c.forEach(([i, v, n]) => { s.board[i] = v; s.notes[i] = n; });
    s.moves = Math.max(0, s.moves - 1);
    return h.c[0][0];
  }

  // Note complete: tutti i candidati di ogni casella vuota (dai soli numeri giusti), come mossa unica annullabile
  function fillNotes(s) {
    const g = s.board.map((v, i) => (isRight(s, i) ? v : 0));
    const cand = candidates(g);
    const cells = [];
    for (let i = 0; i < 81; i++) if (!s.board[i] && s.notes[i] !== cand[i]) cells.push(i);
    if (!cells.length) return false;
    record(s, cells);
    cells.forEach((i) => { s.notes[i] = cand[i]; });
    s.moves++;
    return true;
  }

  function restart(s) {
    s.board = toArr(s.puzzle);
    s.notes = new Array(81).fill(0);
    s.hist = []; s.moves = 0; s.mistakes = 0; s.hints = 0;
    return s;
  }

  // Quanti di ogni numero mancano ancora (contano solo quelli giusti)
  function remaining(s) {
    const left = new Array(10).fill(9);
    left[0] = 0;
    for (let i = 0; i < 81; i++) if (isRight(s, i)) left[s.board[i]]--;
    return left;
  }
  const isSolved = (s) => s.board.every((v, i) => v === sol(s, i));
  function progress(s) {
    const n = toFill(s);
    if (!n) return 1;
    let ok = 0;
    for (let i = 0; i < 81; i++) if (!isGiven(s, i) && isRight(s, i)) ok++;
    return Math.max(0, Math.min(1, ok / n));
  }

  /* Suggerimento: la prossima casella che si può dedurre, con la tecnica (la più difficile della catena) e le caselle
   * da evidenziare. Se c'è un numero sbagliato, il suggerimento è toglierlo.
   * Ritorna { kind: 'wrong', cell } | { kind: 'place', cell, digit, tech, units, cells } | null */
  function hint(s, maxTech = 7) {
    for (let i = 0; i < 81; i++) if (isWrong(s, i)) return { kind: 'wrong', cell: i, tech: 0, units: unitsOf(i), cells: [i] };
    const grid = s.board.slice();
    const cand = candidates(grid);
    let hard = null;
    for (let guard = 0; guard < 400; guard++) {
      const st = findStep(grid, cand, maxTech);
      if (!st || st.bad) break;
      if (st.place) {
        const [cell, digit] = st.place;
        const top = hard && hard.tech > st.tech ? hard : st;
        const cells = [...new Set([...(top.cells || []), cell])];
        const units = [...new Set([...(top.units || []), ...st.units])];
        return { kind: 'place', cell, digit, tech: top.tech, units, cells, elim: hard ? hard.elim : [] };
      }
      if (!hard || st.tech > hard.tech) hard = st;
      applyStep(grid, cand, st);
    }
    // nessuna deduzione trovata (non dovrebbe succedere): la prima casella vuota con la sua soluzione
    const i = s.board.findIndex((v) => !v);
    return i < 0 ? null : { kind: 'place', cell: i, digit: sol(s, i), tech: 0, units: unitsOf(i), cells: [i] };
  }
  // Mossa facile (solo single) per l'incoraggiamento di Hari: { cell, digit, unit, kind: 'row'|'col'|'box', index }
  function easyMove(s) {
    if (s.board.some((v, i) => isWrong(s, i))) return null;
    const grid = s.board.slice();
    const st = findStep(grid, candidates(grid), 2);
    if (!st || !st.place) return null;
    const [cell, digit] = st.place;
    const unit = st.tech === 1 ? st.units[0] : 18 + BOX[cell];
    return { cell, digit, unit, kind: unitKind(unit), index: unit % 9, tech: st.tech };
  }

  HH.sudoku = {
    ROW, COL, BOX, UNITS, PEERS, unitsOf, unitKind, BIT, DIGITS, WEIGHT,
    candidates, countSolutions, solveCount, fullGrid, findStep, applyStep, logicSolve, generate, dig,
    TIERS, CURATED, CURATED_SEEDS, tierFor, seedFor, levelPuzzle,
    newGame, validate, restore, place, toggleNote, erase, undo, fillNotes, restart, remaining, isSolved, progress,
    isGiven, isRight, isWrong, toFill, completions, hint, easyMove,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
