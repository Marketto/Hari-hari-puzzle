/* Lantern Glow — logica "Lights Out" invertita: obiettivo accendere tutte le lanterne.
 * Il livello si genera dallo stato risolto con tocchi casuali distinti: sempre risolvibile.
 * Il minimo ESATTO di tocchi si calcola con l'eliminazione di Gauss su GF(2):
 *   ogni lanterna va invertita un numero dispari di volte se è spenta, pari se è accesa;
 *   le soluzioni sono  x = particolare + combinazione del nucleo (4×4: dimensione 4, 5×5: dimensione 2),
 *   quindi si provano tutte le 2^k combinazioni e si tiene quella con meno tocchi.
 * Esporta HH.lantern = { generate, generateLevel, toggle, isSolved, minPresses }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  function toggle(n, grid, i) {
    const g = grid.slice();
    const r = (i / n) | 0, c = i % n;
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n) g[rr * n + cc] = !g[rr * n + cc];
    });
    return g;
  }

  const isSolved = (grid) => grid.every(Boolean);

  // Minimo esatto di tocchi per accendere tutto: { min, presses } oppure null se impossibile
  function minPresses(n, grid) {
    const N = n * n;
    // matrice aumentata: riga = lanterna, colonna j = il tocco j la inverte
    const rows = [];
    for (let i = 0; i < N; i++) {
      const row = new Uint8Array(N + 1);
      const r = (i / n) | 0, c = i % n;
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n) row[rr * n + cc] = 1;
      });
      row[N] = grid[i] ? 0 : 1;
      rows.push(row);
    }
    const pivotCol = [];
    let rank = 0;
    for (let col = 0; col < N && rank < N; col++) {
      let p = rank;
      while (p < N && !rows[p][col]) p++;
      if (p === N) continue;
      [rows[rank], rows[p]] = [rows[p], rows[rank]];
      for (let i = 0; i < N; i++) {
        if (i !== rank && rows[i][col]) for (let k = col; k <= N; k++) rows[i][k] ^= rows[rank][k];
      }
      pivotCol.push(col);
      rank++;
    }
    for (let i = rank; i < N; i++) if (rows[i][N]) return null; // incoerente
    const isPivot = new Uint8Array(N);
    pivotCol.forEach((c) => { isPivot[c] = 1; });
    const free = [];
    for (let c = 0; c < N; c++) if (!isPivot[c]) free.push(c);
    let best = null;
    for (let mask = 0; mask < 1 << free.length; mask++) {
      const x = new Uint8Array(N);
      free.forEach((c, k) => { x[c] = (mask >> k) & 1; });
      for (let i = rank - 1; i >= 0; i--) {
        const pc = pivotCol[i];
        let v = rows[i][N];
        for (let c = pc + 1; c < N; c++) if (rows[i][c]) v ^= x[c];
        x[pc] = v;
      }
      const w = x.reduce((a, b) => a + b, 0);
      if (!best || w < best.min) best = { min: w, presses: [...x.keys()].filter((i) => x[i]) };
    }
    return best;
  }

  // full=true -> { grid, taps } (taps = tocchi usati per mescolare)
  function generate(n, taps, rnd = Math.random, full = false) {
    let g, picked;
    do {
      g = new Array(n * n).fill(true);
      picked = new Set();
      while (picked.size < Math.min(taps, n * n)) picked.add(Math.floor(rnd() * n * n));
      picked.forEach((i) => { g = toggle(n, g, i); });
    } while (isSolved(g));
    return full ? { grid: g, taps: [...picked] } : g;
  }

  // livello con minimo esatto e mosse concesse (stessa regola di Boba Sort)
  function generateLevel(n, taps, rnd = Math.random) {
    let g, m;
    do { g = generate(n, taps, rnd, true); m = minPresses(n, g.grid); } while (!m || m.min < 2);
    const extra = HH.rules ? HH.rules.extraMoves(m.min) : 2;
    return { grid: g.grid, min: m.min, max: m.min + extra, presses: m.presses };
  }

  HH.lantern = { generate, generateLevel, toggle, isSolved, minPresses };
})(typeof globalThis !== 'undefined' ? globalThis : window);
