/* Boba Sort — logica pura del "water sort".
 * Stato: array di bicchieri, ognuno array di indici gusto (fondo -> cima), capienza CAP.
 * Esporta HH.boba = { CAP, generate, generateLevel, canPour, pour, isSolved, solve, solveOptimal, extraMoves }.
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

  /* Minimo esatto di mosse con A*.
   * Euristica ammissibile: (numero di segmenti di colore) − (numero di gusti).
   * Ogni versata riduce i segmenti al massimo di 1 (unendo uno strato a uno uguale), e a soluzione
   * ogni gusto è un unico segmento: quindi non sovrastima mai le mosse mancanti.
   * Potature sicure: niente versata di un bicchiere già uniforme in uno vuoto; tra i bicchieri vuoti
   * si considera solo il primo (sono equivalenti). Stati deduplicati con chiave canonica (bicchieri ordinati).
   * Ritorna { moves, path }, false se il livello NON è più risolvibile (esplorati tutti gli stati),
   * null se supera nodeLimit (risposta sconosciuta). */
  function segments(cups) {
    let seg = 0;
    const colors = new Set();
    for (const c of cups) for (let i = 0; i < c.length; i++) { colors.add(c[i]); if (i === 0 || c[i] !== c[i - 1]) seg++; }
    return seg - colors.size;
  }
  function solveOptimal(start, nodeLimit = 250000) {
    const heap = [];
    const push = (n) => {
      heap.push(n);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f < n.f || (heap[p].f === n.f && heap[p].g >= n.g)) break; heap[i] = heap[p]; i = p; }
      heap[i] = n;
    };
    const pop = () => {
      const top0 = heap[0], last = heap.pop();
      if (heap.length) {
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          const better = (a, b) => a.f < b.f || (a.f === b.f && a.g > b.g);
          if (l < heap.length && better(heap[l], m === i ? last : heap[m])) m = l;
          if (r < heap.length && better(heap[r], m === i ? last : heap[m])) m = r;
          if (m === i) break;
          heap[i] = heap[m]; i = m;
        }
        heap[i] = last;
      }
      return top0;
    };
    const best = new Map();
    push({ cups: start, g: 0, f: segments(start), parent: null, move: null });
    best.set(key(start), 0);
    let expanded = 0;
    while (heap.length) {
      const node = pop();
      if (best.get(key(node.cups)) < node.g) continue;
      if (isSolved(node.cups)) {
        const path = [];
        for (let n = node; n.parent; n = n.parent) path.unshift(n.move);
        return { moves: node.g, path, expanded };
      }
      if (++expanded > nodeLimit) return null;
      const cs = node.cups;
      let firstEmpty = -1;
      for (let i = 0; i < cs.length; i++) if (!cs[i].length) { firstEmpty = i; break; }
      for (let i = 0; i < cs.length; i++) {
        const a = cs[i];
        if (!a.length) continue;
        const uniform = topRun(a) === a.length;
        for (let j = 0; j < cs.length; j++) {
          if (!cs[j].length && (j !== firstEmpty || uniform)) continue;
          if (!canPour(cs, i, j)) continue;
          const r = pour(cs, i, j);
          const k = key(r.cups), g = node.g + 1;
          if (best.has(k) && best.get(k) <= g) continue;
          best.set(k, g);
          push({ cups: r.cups, g, f: g + segments(r.cups), parent: node, move: [i, j] });
        }
      }
    }
    return false;
  }

  // esiste almeno una versata possibile?
  function hasMove(cups) {
    for (let i = 0; i < cups.length; i++) for (let j = 0; j < cups.length; j++) if (canPour(cups, i, j)) return true;
    return false;
  }

  /* Stato della partita dopo una mossa:
   *   'solved' risolto · 'moves' mosse finite · 'stuck' nessuna versata possibile o vicolo cieco · 'ok' si continua */
  function status(cups, movesLeft, nodeLimit = 60000) {
    if (isSolved(cups)) return 'solved';
    if (movesLeft <= 0) return 'moves';
    if (!hasMove(cups)) return 'stuck';
    return solveOptimal(cups, nodeLimit) === false ? 'stuck' : 'ok';
  }

  // mosse concesse: minimo + 15% (almeno 2, al massimo 6 in più)
  const extraMoves = (min) => (HH.rules ? HH.rules.extraMoves(min) : Math.max(2, Math.min(6, Math.ceil(min * 0.15))));

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

  /* Livello con minimo esatto: { cups, min, max }. Si scartano i livelli il cui minimo
   * non si calcola entro il limite di nodi (restano solo livelli con mosse verificate). */
  function generateLevel(colors, empties = 2, rnd = Math.random, tries = 40) {
    for (let t = 0; t < tries; t++) {
      const cups = generate(colors, empties, rnd, 20);
      if (!cups) continue;
      const opt = solveOptimal(cups);
      if (!opt) continue;  // null (troppo grande) o false
      return { cups, min: opt.moves, max: opt.moves + extraMoves(opt.moves), path: opt.path };
    }
    return null;
  }

  HH.boba = { CAP, generate, generateLevel, canPour, pour, isSolved, solve, solveOptimal, extraMoves, segments, hasMove, status, topRun };
})(typeof globalThis !== 'undefined' ? globalThis : window);
