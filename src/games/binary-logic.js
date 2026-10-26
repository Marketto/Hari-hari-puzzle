/* Mochi Binary — logica pura (nessun DOM). Genere: Takuzu / Binairo.
 * Regole: ogni cella contiene un mochi rosa (fragola, 1) o verde (matcha, 2);
 *   mai tre uguali in fila (orizzontale o verticale);
 *   ogni riga e ogni colonna ha tanti rosa quanti verdi;
 *   nessuna riga uguale a un'altra, nessuna colonna uguale a un'altra.
 *
 * Generatore (soluzione-prima + rimozione degli indizi):
 *   1. soluzione casuale: righe scelte tra le "righe valide" (bilanciate, senza tris) con backtracking
 *      che controlla le colonne a ogni passo (conteggio, tris) e alla fine le colonne tutte diverse
 *   2. tutte le celle sono indizi; in ordine casuale si prova a togliere ogni indizio e lo si lascia via
 *      solo se il risolutore a deduzioni del livello (`logicSolve(tier)`) completa ancora la griglia.
 *      Le deduzioni sono tutte valide (implicate dalle regole), quindi se completano la griglia la soluzione è UNICA.
 *   3. per i livelli facili si rimettono `extra` indizi tolti (più aiuti).
 *
 * Tecniche del risolutore:
 *   tier 1  coppie e "panini" (xx_ → y, x_x → y) + conteggio (metà di un colore → il resto è dell'altro)
 *   tier 2  + confronto con tutte le righe valide compatibili (anche escludendo le righe/colonne già complete):
 *           le celle uguali in tutte le candidate sono forzate
 *
 * Cella: 0 vuota, 1 rosa, 2 verde. Indici riga-maggiore (i = r * n + c).
 * Esporta HH.binary = { sizeFor, config, generate, logicSolve, solveCount, check, judge, isSolved, validate, ... }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const PINK = 1, GREEN = 2;

  /* ---------- curva di difficoltà ---------- */
  const sizeFor = (level) => (level <= 2 ? 4 : level <= 6 ? 6 : level <= 12 ? 8 : 10);
  // tier = tecniche richieste; extra = indizi aggiunti oltre il minimo per il risolutore del tier
  function config(level) {
    const lv = Math.max(1, level | 0);
    const n = sizeFor(lv);
    if (n === 4) return { n, tier: 1, extra: lv === 1 ? 2 : 1 };
    if (n === 6) return { n, tier: lv <= 4 ? 1 : 2, extra: [2, 1, 1, 0][lv - 3] };
    if (n === 8) return { n, tier: lv <= 8 ? 1 : 2, extra: [3, 2, 3, 2, 1, 0][lv - 7] };
    if (lv <= 14) return { n, tier: 1, extra: lv === 13 ? 3 : 1 };
    return { n, tier: 2, extra: Math.max(0, 19 - lv) };
  }

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- righe valide (bit c = 1 → verde) ---------- */
  const LINES = {};
  function validLines(n) {
    if (LINES[n]) return LINES[n];
    const out = [], full = (1 << n) - 1;
    for (let m = 0; m <= full; m++) {
      let ones = 0;
      for (let b = m; b; b &= b - 1) ones++;
      if (ones !== n / 2) continue;
      const t = m & (m >> 1) & (m >> 2), z = ~m & full, tz = z & (z >> 1) & (z >> 2);
      if (t || tz) continue;
      out.push(m);
    }
    return (LINES[n] = out);
  }

  // indici delle celle della linea k (0..n-1 righe, n..2n-1 colonne)
  function lineCells(n, k) {
    const out = new Array(n);
    for (let j = 0; j < n; j++) out[j] = k < n ? k * n + j : j * n + (k - n);
    return out;
  }
  const LC = {};
  const allLines = (n) => LC[n] || (LC[n] = [...Array(2 * n)].map((_, k) => lineCells(n, k)));

  /* ---------- soluzione casuale ---------- */
  function randomSolution(n, rnd) {
    const lines = validLines(n), half = n / 2, full = (1 << n) - 1;
    for (let attempt = 0; attempt < 50; attempt++) {
      const rows = [], ones = new Array(n).fill(0), used = new Set();
      let nodes = 0;
      const ok = (function rec(r) {
        if (r === n) {
          const cols = new Set();
          for (let c = 0; c < n; c++) { let m = 0; for (let k = 0; k < n; k++) if (rows[k] >> c & 1) m |= 1 << k; cols.add(m); }
          return cols.size === n;
        }
        if (++nodes > 300) return false;
        for (const m of shuffle(lines.slice(), rnd)) {
          if (used.has(m)) continue;
          if (r >= 2) {
            const a = rows[r - 2], b = rows[r - 1];
            if ((a & b & m) || (~a & ~b & ~m & full)) continue;
          }
          let bad = false;
          for (let c = 0; c < n && !bad; c++) {
            const o = ones[c] + (m >> c & 1);
            if (o > half || r + 1 - o > half) bad = true;
          }
          if (bad) continue;
          for (let c = 0; c < n; c++) ones[c] += m >> c & 1;
          rows.push(m); used.add(m);
          if (rec(r + 1)) return true;
          rows.pop(); used.delete(m);
          for (let c = 0; c < n; c++) ones[c] -= m >> c & 1;
          if (nodes > 300) return false;
        }
        return false;
      })(0);
      if (ok) {
        const sol = new Array(n * n);
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) sol[r * n + c] = rows[r] >> c & 1 ? GREEN : PINK;
        return sol;
      }
    }
    return null;
  }

  /* ---------- risolutore a deduzioni ----------
   * board: array n*n (0/1/2). Ritorna { ok, board, contradiction, steps, tier } (ok = griglia completa e coerente). */
  function logicSolve(n, start, tier = 2) {
    const b = start.slice(), L = allLines(n), half = n / 2, full = (1 << n) - 1;
    const lines = validLines(n);
    let steps = 0, used = 0;
    const set = (i, v) => { b[i] = v; steps++; };

    function tier1() {
      let changed = false;
      for (const cells of L) {
        let p = 0, g = 0;
        for (const i of cells) { if (b[i] === PINK) p++; else if (b[i] === GREEN) g++; }
        if (p > half || g > half) return -1;
        if (p + g === n) continue;
        if (p === half || g === half) {
          const v = p === half ? GREEN : PINK;
          for (const i of cells) if (!b[i]) set(i, v);
          changed = true; continue;
        }
        for (let j = 0; j + 2 < n; j++) {
          const x = b[cells[j]], y = b[cells[j + 1]], z = b[cells[j + 2]];
          if (x && x === y && x === z) return -1;
          let k = -1, v = 0;
          if (x && x === y && !z) { k = j + 2; v = x; }
          else if (y && y === z && !x) { k = j; v = y; }
          else if (x && x === z && !y) { k = j + 1; v = x; }
          if (k >= 0) { set(cells[k], 3 - v); changed = true; }
        }
      }
      return changed ? 1 : 0;
    }

    const km = new Int32Array(2 * n), kv = new Int32Array(2 * n);
    function tier2() {
      let changed = false;
      for (let k = 0; k < 2 * n; k++) {
        const cells = L[k];
        let a = 0, v = 0;
        for (let j = 0; j < n; j++) {
          const x = b[cells[j]];
          if (x) { a |= 1 << j; if (x === GREEN) v |= 1 << j; }
        }
        km[k] = a; kv[k] = v;
      }
      for (let fam = 0; fam < 2; fam++) {
        const k0 = fam * n, done = [];
        for (let x = 0; x < n; x++) if (km[k0 + x] === full) {
          if (done.includes(kv[k0 + x])) return -1;
          done.push(kv[k0 + x]);
        }
        for (let x = 0; x < n; x++) {
          const k = k0 + x, a = km[k], v = kv[k];
          if (a === full) continue;
          let and = full, or = 0, cnt = 0;
          for (let q = 0; q < lines.length; q++) {
            const m = lines[q];
            if ((m & a) !== v || (done.length && done.includes(m))) continue;
            and &= m; or |= m; cnt++;
          }
          if (!cnt) return -1;
          const g1 = and & ~a, p0 = ~or & full & ~a;
          if (g1 || p0) {
            const cells = L[k];
            for (let j = 0; j < n; j++) {
              if (g1 >> j & 1) set(cells[j], GREEN);
              else if (p0 >> j & 1) set(cells[j], PINK);
            }
            changed = true;
            // le maschere delle colonne incrociate sono cambiate: ricalcolo al giro successivo
            if (fam === 0) return 1;
          }
        }
      }
      return changed ? 1 : 0;
    }

    for (let guard = 0; guard < 4 * n * n; guard++) {
      const r1 = tier1();
      if (r1 < 0) return { ok: false, contradiction: true, board: b, steps, tier: used };
      if (r1) { used = Math.max(used, 1); continue; }
      if (tier < 2) break;
      const r2 = tier2();
      if (r2 < 0) return { ok: false, contradiction: true, board: b, steps, tier: used };
      if (r2) { used = 2; continue; }
      break;
    }
    const complete = b.every((v) => v);
    const ok = complete && check(n, b).bad.size === 0;
    return { ok, contradiction: complete && !ok, board: b, steps, tier: used };
  }

  /* ---------- conteggio delle soluzioni (deduzioni + tentativi), fino a limit ---------- */
  function solveCount(n, board, limit = 2) {
    let count = 0, nodes = 0;
    const sols = [];
    (function rec(bd) {
      if (count >= limit || ++nodes > 200000) return;
      const r = logicSolve(n, bd, 2);
      if (r.contradiction) return;
      if (r.ok) { count++; sols.push(r.board); return; }
      const i = r.board.indexOf(0);
      if (i < 0) return;
      for (const v of [PINK, GREEN]) {
        const nb = r.board.slice(); nb[i] = v;
        rec(nb);
      }
    })(board.slice());
    return { count, solutions: sols, nodes };
  }

  /* ---------- generatore ---------- */
  function generate(level, rnd = Math.random) {
    const cfg = config(level);
    const { n, tier } = cfg;
    let sol = null;
    while (!sol) sol = randomSolution(n, rnd);
    const clues = sol.slice();
    const removed = [];
    for (const i of shuffle([...Array(n * n).keys()], rnd)) {
      const v = clues[i];
      clues[i] = 0;
      if (logicSolve(n, clues, tier).ok) removed.push(i);
      else clues[i] = v;
    }
    shuffle(removed, rnd);
    for (let k = 0; k < cfg.extra && k < removed.length - 1; k++) clues[removed[k]] = sol[removed[k]];
    const givens = [];
    clues.forEach((v, i) => { if (v) givens.push(i); });
    const L = logicSolve(n, clues, 2);
    return { n, level, tier, solution: sol, givens, clues, steps: L.steps, techUsed: logicSolve(n, clues, tier).tier };
  }

  /* ---------- verifica delle regole su una griglia parziale ----------
   * Ritorna { bad:Set<cell>, lines: array 2n di 'empty'|'partial'|'full'|'bad', triples, overfull, twins } */
  function check(n, board) {
    const L = allLines(n), half = n / 2;
    const bad = new Set();
    const status = new Array(2 * n).fill('partial');
    const why = { triple: [], overfull: [], twin: [] };
    for (let k = 0; k < 2 * n; k++) {
      const cells = L[k];
      let p = 0, g = 0, lineBad = false;
      for (const i of cells) { if (board[i] === PINK) p++; else if (board[i] === GREEN) g++; }
      for (let j = 0; j + 2 < n; j++) {
        const x = board[cells[j]];
        if (x && x === board[cells[j + 1]] && x === board[cells[j + 2]]) {
          bad.add(cells[j]); bad.add(cells[j + 1]); bad.add(cells[j + 2]);
          lineBad = true; why.triple.push(k);
        }
      }
      if (p > half || g > half) {
        const v = p > half ? PINK : GREEN;
        cells.forEach((i) => { if (board[i] === v) bad.add(i); });
        lineBad = true; why.overfull.push(k);
      }
      status[k] = lineBad ? 'bad' : p + g === 0 ? 'empty' : p + g === n ? 'full' : 'partial';
    }
    // righe/colonne complete identiche
    for (let fam = 0; fam < 2; fam++) {
      const seen = new Map();
      for (let x = 0; x < n; x++) {
        const k = fam * n + x, cells = L[k];
        if (cells.some((i) => !board[i])) continue;
        const key = cells.map((i) => board[i]).join('');
        if (seen.has(key)) {
          const k0 = seen.get(key);
          [k0, k].forEach((kk) => { L[kk].forEach((i) => bad.add(i)); status[kk] = 'bad'; });
          why.twin.push([k0, k]);
        } else seen.set(key, k);
      }
    }
    return { bad, lines: status, ...why };
  }

  const lineComplete = (n, board, k) => allLines(n)[k].every((i) => board[i]);
  const lineRight = (n, board, sol, k) => allLines(n)[k].every((i) => board[i] === sol[i]);

  /* Giudica un'azione (una o più celle cambiate da `before` ad `after`).
   * wrong: linee che l'azione ha COMPLETATO (prima incomplete) e che differiscono dalla soluzione → costa un cuore.
   * right: linee completate che coincidono con la soluzione. */
  function judge(n, sol, before, after, touched) {
    const ks = new Set();
    for (const i of touched) { ks.add((i / n) | 0); ks.add(n + (i % n)); }
    const wrong = [], right = [];
    for (const k of [...ks].sort((a, b) => a - b)) {
      if (!lineComplete(n, after, k) || lineComplete(n, before, k)) continue;
      (lineRight(n, after, sol, k) ? right : wrong).push(k);
    }
    return { wrong, right };
  }

  const isSolved = (sol, board) => board.length === sol.length && board.every((v, i) => v === sol[i]);

  // controllo strutturale di un livello salvato
  function validate(p) {
    if (!p || ![4, 6, 8, 10].includes(p.n)) return false;
    const N = p.n * p.n;
    if (!Array.isArray(p.solution) || p.solution.length !== N || !p.solution.every((v) => v === 1 || v === 2)) return false;
    if (check(p.n, p.solution).bad.size) return false;
    if (!Array.isArray(p.givens) || !p.givens.every((i) => Number.isInteger(i) && i >= 0 && i < N)) return false;
    if (!Array.isArray(p.board) || p.board.length !== N || !p.board.every((v) => v === 0 || v === 1 || v === 2)) return false;
    return p.givens.every((i) => p.board[i] === p.solution[i]);
  }

  HH.binary = {
    PINK, GREEN, sizeFor, config, validLines, lineCells, randomSolution, logicSolve, solveCount,
    generate, check, judge, isSolved, validate, lineComplete, lineRight,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
