/* Hedgedoku — logica pura (nessun DOM). Regole stile "Queens":
 * un riccio per riga, colonna e regione; due ricci non si toccano mai (neanche in diagonale).
 * Esporta HH.hedgedoku = { generate, solveCount, check }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Permutazione casuale con |p[r]-p[r+1]| > 1 (ricci non adiacenti)
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

  // Fa crescere n regioni a partire dalle celle-soluzione
  function growRegions(n, sol, rnd) {
    const reg = new Array(n * n).fill(-1);
    const frontier = [];
    sol.forEach((c, r) => { reg[r * n + c] = r; frontier.push(r); });
    let left = n * n - n;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let guard = 0;
    while (left > 0 && guard++ < 100000) {
      const id = Math.floor(rnd() * n);
      // celle libere adiacenti alla regione id
      const cand = [];
      for (let i = 0; i < n * n; i++) {
        if (reg[i] !== id) continue;
        const r = (i / n) | 0, c = i % n;
        for (const [dr, dc] of dirs) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
          if (reg[rr * n + cc] === -1) cand.push(rr * n + cc);
        }
      }
      if (!cand.length) continue;
      reg[cand[Math.floor(rnd() * cand.length)]] = id;
      left--;
    }
    return reg;
  }

  // Conta soluzioni fino a "limit"
  function solveCount(n, reg, limit = 2) {
    let count = 0;
    const colUsed = new Array(n).fill(false), regUsed = new Array(n).fill(false);
    function rec(r, prev) {
      if (count >= limit) return;
      if (r === n) { count++; return; }
      for (let c = 0; c < n; c++) {
        const g = reg[r * n + c];
        if (colUsed[c] || regUsed[g] || (r > 0 && Math.abs(c - prev) <= 1)) continue;
        colUsed[c] = regUsed[g] = true;
        rec(r + 1, c);
        colUsed[c] = regUsed[g] = false;
      }
    }
    rec(0, -9);
    return count;
  }

  // Trova fino a "limit" soluzioni (array colonna per riga)
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

  function connectedWithout(n, reg, g, skip) {
    const cells = [];
    for (let i = 0; i < n * n; i++) if (reg[i] === g && i !== skip) cells.push(i);
    if (!cells.length) return false;
    const seen = new Set([cells[0]]), st = [cells[0]];
    while (st.length) {
      const i = st.pop(), r = (i / n) | 0, c = i % n;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc, j = rr * n + cc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || j === skip || seen.has(j) || reg[j] !== g) continue;
        seen.add(j); st.push(j);
      }
    }
    return seen.size === cells.length;
  }

  /* Rende unica la soluzione: trova una soluzione alternativa e sposta
   * una sua cella in una regione vicina, finché ne resta una sola. */
  function repair(n, reg, sol, rnd, maxIter) {
    const solSet = new Set(sol.map((c, r) => r * n + c));
    for (let it = 0; it < maxIter; it++) {
      const sols = findSolutions(n, reg, 2);
      if (sols.length === 1) return true;
      const alt = sols.find((s) => s.some((c, r) => c !== sol[r]));
      const cells = shuffle(alt.map((c, r) => r * n + c).filter((i) => !solSet.has(i)), rnd);
      let moved = false;
      for (const i of cells) {
        const g = reg[i], r = (i / n) | 0, c = i % n;
        const nb = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]], rnd)
          .map(([dr, dc]) => [r + dr, c + dc])
          .filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < n && cc < n)
          .map(([rr, cc]) => reg[rr * n + cc])
          .filter((h) => h !== g);
        if (!nb.length || !connectedWithout(n, reg, g, i)) continue;
        reg[i] = nb[0];
        moved = true;
        break;
      }
      if (!moved) return false;
    }
    return findSolutions(n, reg, 2).length === 1;
  }

  function generate(n, rnd = Math.random, maxTries = 40) {
    let best = null;
    for (let t = 0; t < maxTries; t++) {
      const sol = randomSolution(n, rnd);
      const reg = growRegions(n, sol, rnd);
      best = { n, regions: reg, solution: sol, unique: false };
      if (repair(n, reg, sol, rnd, n * n * 2)) { best.unique = true; return best; }
    }
    return best; // fallback: valido ma non unico (la verifica è per regole)
  }

  /* board: array n*n con 0 vuoto, 1 segno, 2 riccio.
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

  HH.hedgedoku = { generate, solveCount, findSolutions, check, randomSolution };
})(typeof globalThis !== 'undefined' ? globalThis : window);
