/* Lantern Glow — logica "Lights Out" invertita: obiettivo accendere tutte le lanterne.
 * Il livello si genera dallo stato risolto con tocchi casuali distinti: sempre risolvibile.
 * Esporta HH.lantern = { generate, toggle, isSolved }.
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

  // full=true -> { grid, taps } (taps = tocchi usati, utile come "par")
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

  HH.lantern = { generate, toggle, isSolved };
})(typeof globalThis !== 'undefined' ? globalThis : window);
