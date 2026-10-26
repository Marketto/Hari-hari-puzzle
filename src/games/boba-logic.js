/* Boba Sort — logica pura del "water sort".
 * Stato: array di bicchieri, ognuno array di indici gusto (fondo -> cima), capienza CAP.
 * Esporta HH.boba = { CAP, generate, canPour, pour, isSolved, solve }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const CAP = 4;

  const top = (cup) => cup[cup.length - 1];

  function topRun(cup) {
    if (!cup.length) return 0;
    const t = top(cup);
    let k = 0;
    for (let i = cup.length - 1; i >= 0 && cup[i] === t; i--) k++;
    return k;
  }

  function canPour(cups, from, to) {
    if (from === to) return false;
    const a = cups[from], b = cups[to];
    if (!a.length || b.length >= CAP) return false;
    return !b.length || top(b) === top(a);
  }

  // Ritorna nuovo stato e quante unità sono state versate
  function pour(cups, from, to) {
    if (!canPour(cups, from, to)) return null;
    const next = cups.map((c) => c.slice());
    const n = Math.min(topRun(next[from]), CAP - next[to].length);
    for (let i = 0; i < n; i++) next[to].push(next[from].pop());
    return { cups: next, amount: n };
  }

  function isSolved(cups) {
    return cups.every((c) => c.length === 0 || (c.length === CAP && c.every((x) => x === c[0])));
  }

  const key = (cups) => cups.map((c) => c.join('')).sort().join('|');

  // DFS con memo; ritorna lista mosse o null
  function solve(cups, nodeLimit = 40000) {
    const seen = new Set();
    let nodes = 0;
    const path = [];
    function rec(state) {
      if (isSolved(state)) return true;
      if (++nodes > nodeLimit) return false;
      const k = key(state);
      if (seen.has(k)) return false;
      seen.add(k);
      for (let i = 0; i < state.length; i++) {
        const a = state[i];
        if (!a.length) continue;
        const uniform = topRun(a) === a.length;
        for (let j = 0; j < state.length; j++) {
          if (!canPour(state, i, j)) continue;
          if (uniform && !state[j].length) continue; // mossa inutile
          const r = pour(state, i, j);
          path.push([i, j]);
          if (rec(r.cups)) return true;
          path.pop();
        }
      }
      return false;
    }
    return rec(cups) ? path.slice() : null;
  }

  function generate(colors, empties = 2, rnd = Math.random, tries = 60) {
    for (let t = 0; t < tries; t++) {
      const pool = [];
      for (let c = 0; c < colors; c++) for (let k = 0; k < CAP; k++) pool.push(c);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const cups = [];
      for (let c = 0; c < colors; c++) cups.push(pool.slice(c * CAP, c * CAP + CAP));
      for (let e = 0; e < empties; e++) cups.push([]);
      if (isSolved(cups)) continue;
      // evita bicchieri già completi in partenza
      if (cups.some((c) => c.length === CAP && c.every((x) => x === c[0]))) continue;
      if (solve(cups)) return cups;
    }
    return null;
  }

  HH.boba = { CAP, generate, canPour, pour, isSolved, solve, topRun };
})(typeof globalThis !== 'undefined' ? globalThis : window);
