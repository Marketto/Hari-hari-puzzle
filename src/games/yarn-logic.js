/* Yarn Link — logica pura (nessun DOM).
 * Regole (stile "Flow / Numberlink"): sulla griglia n×n ci sono coppie di gomitoli dello stesso colore;
 *   collega ogni coppia con un filo di lana fatto di passi orizzontali/verticali;
 *   i fili non si incrociano né si sovrappongono e alla fine coprono TUTTE le caselle.
 *
 * Generatore (soluzione-prima + riparazione dell'unicità):
 *   1. cammino hamiltoniano casuale (serpentina + mosse "backbite"), che riempie tutta la griglia
 *   2. tagliato in k fili di lunghezza ≥ 3: degli estremi restano solo i gomitoli
 *   3. il risolutore (DFS a due teste con potature) conta le soluzioni fino a 2;
 *      se ne trova un'altra, un filo della soluzione viene spezzato in due dove le due soluzioni differiscono
 *      (i due nuovi gomitoli devono avere grado 1, quindi la soluzione alternativa diventa impossibile)
 *   4. si accetta solo con soluzione UNICA; fallback garantito: righe dritte con più colori.
 *
 * Stato di gioco: paths[k] = celle del filo k in ordine, paths[k][0] è uno dei due gomitoli di k (o [] se vuoto).
 * Esporta HH.yarn = { sizeFor, colorsFor, generate, solve, beginStroke, extend, applyStroke, status, isSolved, ... }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const MAX_COLORS = 12;

  /* ---------- curva di difficoltà ---------- */
  const sizeFor = (level) => (level <= 2 ? 5 : level <= 5 ? 6 : level <= 9 ? 7 : level <= 14 ? 8 : 9);
  // colori iniziali: a parità di griglia, meno colori = fili più lunghi = più difficile
  const COLORS = { 5: [5, 4], 6: [6, 5, 5], 7: [7, 6, 6, 6], 8: [8, 8, 7, 7, 7], 9: [9, 9, 9, 8, 8] };
  const FIRST = { 5: 1, 6: 3, 7: 6, 8: 10, 9: 15 };
  function colorsFor(level) {
    const n = sizeFor(level), row = COLORS[n];
    return row[Math.min(row.length - 1, Math.max(0, level - FIRST[n]))];
  }

  const NBC = {};
  function nbrs(n) {
    if (NBC[n]) return NBC[n];
    const out = [];
    for (let i = 0; i < n * n; i++) {
      const r = (i / n) | 0, c = i % n, a = [];
      if (r > 0) a.push(i - n);
      if (c < n - 1) a.push(i + 1);
      if (r < n - 1) a.push(i + n);
      if (c > 0) a.push(i - 1);
      out.push(a);
    }
    return (NBC[n] = out);
  }
  const adjacent = (n, a, b) => {
    const ra = (a / n) | 0, rb = (b / n) | 0;
    return (ra === rb && Math.abs(a - b) === 1) || (a % n === b % n && Math.abs(ra - rb) === 1);
  };

  /* ---------- cammino hamiltoniano casuale ---------- */
  function hamPath(n, rnd, steps) {
    const N = n * n, NB = nbrs(n);
    const P = [];
    const tr = rnd() < 0.5;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const cc = r % 2 ? n - 1 - c : c;
      P.push(tr ? cc * n + r : r * n + cc);
    }
    const pos = new Int32Array(N);
    P.forEach((v, i) => { pos[v] = i; });
    const rev = (a, b) => {
      for (; a < b; a++, b--) { const t = P[a]; P[a] = P[b]; P[b] = t; pos[P[a]] = a; pos[P[b]] = b; }
    };
    for (let s = 0; s < steps; s++) {
      if (rnd() < 0.5) {
        const nb = NB[P[0]], i = pos[nb[(rnd() * nb.length) | 0]];
        if (i > 1) rev(0, i - 1);
      } else {
        const nb = NB[P[N - 1]], i = pos[nb[(rnd() * nb.length) | 0]];
        if (i < N - 2) rev(i + 1, N - 1);
      }
    }
    return P;
  }

  // taglia il cammino in k pezzi di lunghezza ≥ minLen con lunghezze un po' diverse tra loro
  function cut(P, k, rnd, minLen = 3) {
    const N = P.length;
    const len = new Array(k).fill(minLen);
    const w = len.map(() => 0.35 + rnd());
    const tot = w.reduce((a, b) => a + b, 0);
    for (let left = N - minLen * k; left > 0; left--) {
      let x = rnd() * tot, i = 0;
      while (i < k - 1 && (x -= w[i]) > 0) i++;
      len[i]++;
    }
    const out = [];
    let at = 0;
    for (const L of len) { out.push(P.slice(at, at + L)); at += L; }
    return out;
  }

  /* ---------- risolutore: DFS a due teste ----------
   * Ogni colore cresce da entrambi i gomitoli; si ramifica sulla testa con meno mosse possibili.
   * Potature: testa senza mosse; casella vuota con meno di 2 vicini utilizzabili;
   * le due teste di un colore devono toccare la stessa zona vuota (o toccarsi);
   * ogni zona vuota deve essere toccata da entrambe le teste di almeno un colore.
   * Ritorna { count (≤ limit), solutions (fino a limit, come paths), nodes, aborted }. */
  function solve(n, ends, opts = {}) {
    const limit = opts.limit || 2, nodeLimit = opts.nodeLimit || 200000;
    const N = n * n, K = ends.length, NB = nbrs(n);
    const col = new Int8Array(N).fill(-1);
    const hd = new Int32Array(2 * K);
    const done = new Uint8Array(K);
    const seq = [];
    ends.forEach(([a, b], k) => { col[a] = col[b] = k; hd[2 * k] = a; hd[2 * k + 1] = b; seq.push([[a], [b]]); });
    const comp = new Int32Array(N);
    const stack = new Int32Array(N);
    const served = new Uint8Array(N);
    let nodes = 0, aborted = false, left = K, empty = N - 2 * K;
    const solutions = [];
    const isHead = (j) => { const k = col[j]; return k >= 0 && !done[k] && (hd[2 * k] === j || hd[2 * k + 1] === j); };

    // ritorna -1 se lo stato è impossibile, altrimenti l'indice della testa (2k+s) con meno mosse
    function check() {
      let best = -1, bestM = 99;
      for (let k = 0; k < K; k++) {
        if (done[k]) continue;
        for (let s = 0; s < 2; s++) {
          const h = hd[2 * k + s], o = hd[2 * k + 1 - s];
          let m = 0;
          for (const j of NB[h]) if (col[j] < 0 || j === o) m++;
          if (!m) return -1;
          if (m < bestM) { bestM = m; best = 2 * k + s; }
        }
      }
      // caselle vuote: servono due vicini utilizzabili; intanto etichetta le zone vuote
      comp.fill(-1);
      let nc = 0;
      for (let i = 0; i < N; i++) {
        if (col[i] >= 0) continue;
        let u = 0;
        for (const j of NB[i]) if (col[j] < 0 || isHead(j)) u++;
        if (u < 2) return -1;
        if (comp[i] >= 0) continue;
        let sp = 0;
        stack[sp++] = i; comp[i] = nc;
        while (sp) {
          const x = stack[--sp];
          for (const j of NB[x]) if (col[j] < 0 && comp[j] < 0) { comp[j] = nc; stack[sp++] = j; }
        }
        nc++;
      }
      served.fill(0, 0, nc);
      for (let k = 0; k < K; k++) {
        if (done[k]) continue;
        const a = hd[2 * k], b = hd[2 * k + 1];
        let ok = adjacent(n, a, b);
        for (const x of NB[a]) {
          if (col[x] >= 0) continue;
          const c = comp[x];
          for (const y of NB[b]) if (col[y] < 0 && comp[y] === c) { served[c] = 1; ok = true; break; }
        }
        if (!ok) return -1;
      }
      for (let c = 0; c < nc; c++) if (!served[c]) return -1;
      return best;
    }

    function record() {
      solutions.push(seq.map(([A, B]) => A.concat(B.slice().reverse())));
    }

    function rec() {
      if (aborted || solutions.length >= limit) return;
      if (++nodes > nodeLimit) { aborted = true; return; }
      if (!left) { if (!empty) record(); return; }
      const b = check();
      if (b < 0) return;
      const k = b >> 1, s = b & 1, h = hd[b], o = hd[b ^ 1];
      for (const j of NB[h]) {
        if (j === o) {
          done[k] = 1; left--;
          rec();
          done[k] = 0; left++;
        } else if (col[j] < 0) {
          col[j] = k; hd[b] = j; seq[k][s].push(j); empty--;
          rec();
          col[j] = -1; hd[b] = h; seq[k][s].pop(); empty++;
        }
        if (aborted || solutions.length >= limit) return;
      }
    }
    rec();
    return { count: solutions.length, solutions, nodes, aborted };
  }

  const samePaths = (A, B) => A.length === B.length && A.every((p, k) => p.length === B[k].length && p.every((v, i) => v === B[k][i]));

  // spezza un filo dove la soluzione "alt" differisce dalla nostra (i nuovi gomitoli rendono alt impossibile)
  function splitWhereDiffer(n, paths, alt, rnd) {
    const N = n * n;
    const key = (a, b) => (a < b ? a * N + b : b * N + a);
    const altEdges = new Set();
    alt.forEach((p) => { for (let i = 1; i < p.length; i++) altEdges.add(key(p[i - 1], p[i])); });
    const cand = [], weak = [];
    paths.forEach((p, k) => {
      for (let i = 1; i < p.length; i++) {
        if (altEdges.has(key(p[i - 1], p[i]))) continue;
        const a = i, b = p.length - i; // lunghezze dei due pezzi
        if (a >= 3 && b >= 3) cand.push([k, i]);
        else if (a >= 2 && b >= 2) weak.push([k, i]);
      }
    });
    const pool = cand.length ? cand : weak;
    if (!pool.length) return null;
    const [k, i] = pool[(rnd() * pool.length) | 0];
    const out = paths.slice();
    out.splice(k, 1, paths[k].slice(0, i), paths[k].slice(i));
    return out;
  }

  const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // fallback garantito: una riga dritta per colore (soluzione unica, verificata comunque dal risolutore)
  function rowsPuzzle(n) {
    const paths = [...Array(n)].map((_, r) => [...Array(n)].map((__, c) => r * n + c));
    return paths;
  }

  function pack(n, paths, nodes, rnd) {
    // colori in ordine casuale (così lo stesso colore non è sempre in alto a sinistra)
    const order = shuffle([...paths.keys()], rnd);
    const sol = order.map((k) => (rnd() < 0.5 ? paths[k] : paths[k].slice().reverse()));
    return { n, ends: sol.map((p) => [p[0], p[p.length - 1]]), solution: sol, nodes };
  }

  /* generate(level | {n, colors}, rnd) → { n, ends:[[a,b]…], solution:[[celle]…], nodes } */
  function generate(arg, rnd = Math.random) {
    const cfg = typeof arg === 'number' ? { n: sizeFor(arg), colors: colorsFor(arg) } : arg;
    const n = cfg.n, N = n * n;
    const maxColors = Math.min(MAX_COLORS, cfg.maxColors || cfg.colors + 3);
    for (let t = 0; t < 400; t++) {
      const P = hamPath(n, rnd, N * 3);
      let paths = cut(P, cfg.colors, rnd);
      for (let rep = 0; rep < 6 && paths && paths.length <= maxColors; rep++) {
        const r = solve(n, paths.map((p) => [p[0], p[p.length - 1]]), { limit: 2, nodeLimit: 20000 });
        if (r.aborted) break;
        if (r.count === 1) return pack(n, r.solutions[0], r.nodes, rnd);
        const alt = r.solutions.find((s) => !samePaths(s, paths));
        paths = splitWhereDiffer(n, paths, alt, rnd);
      }
    }
    const rows = rowsPuzzle(n);
    return pack(n, rows, 0, rnd);
  }

  /* ---------- regole del disegno (usate dalla UI, testate in Node) ---------- */
  function endpointOwner(ends, i) {
    for (let k = 0; k < ends.length; k++) if (ends[k][0] === i || ends[k][1] === i) return k;
    return -1;
  }
  // { k, idx } del filo che passa da i, o null
  function owner(paths, i) {
    for (let k = 0; k < paths.length; k++) { const x = paths[k].indexOf(i); if (x >= 0) return { k, idx: x }; }
    return null;
  }
  const isComplete = (p, e) => p.length >= 2 && p[0] !== p[p.length - 1] &&
    ((p[0] === e[0] && p[p.length - 1] === e[1]) || (p[0] === e[1] && p[p.length - 1] === e[0]));

  /* Inizio di un trascinamento sulla casella i:
   *   gomitolo di k   → il filo k riparte da lì (vuoto),
   *   casella di un filo → il filo viene accorciato fino a lì e si continua da quel punto.
   * Ritorna { k, drawn } oppure null (casella vuota). */
  function beginStroke(n, ends, paths, i) {
    const e = endpointOwner(ends, i);
    if (e >= 0) {
return { k: e, drawn: [i] };
    }
    const o = owner(paths, i);
    if (!o) return null;
    return { k: o.k, drawn: paths[o.k].slice(0, o.idx + 1) };
  }

  /* Un passo del trascinamento verso la casella j (adiacente all'ultima). Ritorna il nuovo "drawn" o null se bloccato.
   *   j già nel filo     → si torna indietro fino a j (il filo si riavvolge)
   *   filo già chiuso     → bloccato
   *   gomitolo di un altro colore → bloccato
   *   altrimenti si aggiunge j (se è il gomitolo gemello, il filo è chiuso). */
  function extend(n, ends, k, drawn, j) {
    const last = drawn[drawn.length - 1];
    if (j === last || !adjacent(n, last, j)) return null;
    const at = drawn.indexOf(j);
    if (at >= 0) return drawn.slice(0, at + 1);
    if (isComplete(drawn, ends[k])) return null;
    const e = endpointOwner(ends, j);
    if (e >= 0 && e !== k) return null;
    if (e === k && j === drawn[0]) return null;
    return drawn.concat([j]);
  }

  // applica il filo disegnato: gli altri fili che incrocia vengono tagliati prima del punto d'incrocio
  function applyStroke(before, k, drawn) {
    const used = new Set(drawn);
    return before.map((p, q) => {
      if (q === k) return drawn.length > 1 ? drawn.slice() : [];
      const x = p.findIndex((c) => used.has(c));
      if (x < 0) return p.slice();
      return x <= 1 ? [] : p.slice(0, x);
    });
  }

  // caselle tolte rispetto a prima (un filo accorciato, cancellato o tagliato = ripensamento)
  function lostCells(before, after) {
    let lost = 0;
    before.forEach((p, k) => {
      const q = after[k] || [];
      // conta le celle di prima che non restano nello stesso tratto iniziale
      let same = 0;
      while (same < p.length && same < q.length && p[same] === q[same]) same++;
      if (p.length > 1) lost += p.length - same;
    });
    return lost;
  }

  function status(n, ends, paths) {
    const N = n * n;
    const cover = new Uint8Array(N);
    ends.forEach(([a, b]) => { cover[a] = cover[b] = 1; });
    let connected = 0;
    paths.forEach((p, k) => { p.forEach((c) => { cover[c] = 1; }); if (isComplete(p, ends[k])) connected++; });
    const filled = cover.reduce((a, b) => a + b, 0);
    return { connected, colors: ends.length, filled, total: N, solved: connected === ends.length && filled === N && isSolved(n, ends, paths) };
  }

  // verifica completa e indipendente dallo stato della UI
  function isSolved(n, ends, paths) {
    const N = n * n;
    if (!Array.isArray(paths) || paths.length !== ends.length) return false;
    const seen = new Uint8Array(N);
    let tot = 0;
    for (let k = 0; k < ends.length; k++) {
      const p = paths[k];
      if (!Array.isArray(p) || !isComplete(p, ends[k])) return false;
      for (let i = 0; i < p.length; i++) {
        const c = p[i];
        if (!Number.isInteger(c) || c < 0 || c >= N || seen[c]) return false;
        if (i > 0 && !adjacent(n, p[i - 1], c)) return false;
        if (i > 0 && i < p.length - 1 && endpointOwner(ends, c) >= 0) return false;
        seen[c] = 1; tot++;
      }
    }
    return tot === N;
  }

  // controllo strutturale di un livello (caricamento dei salvataggi)
  function validLevel(p) {
    if (!p || !Number.isInteger(p.n) || p.n < 3 || p.n > 12 || !Array.isArray(p.ends)) return false;
    const N = p.n * p.n, s = new Set();
    for (const e of p.ends) {
      if (!Array.isArray(e) || e.length !== 2) return false;
      for (const c of e) { if (!Number.isInteger(c) || c < 0 || c >= N || s.has(c)) return false; s.add(c); }
    }
    return p.ends.length >= 1 && p.ends.length <= MAX_COLORS;
  }
  // filo salvato coerente con le regole (altrimenti viene scartato)
  function validPath(n, ends, k, p) {
    if (!Array.isArray(p)) return false;
    if (!p.length) return true;
    if (p[0] !== ends[k][0] && p[0] !== ends[k][1]) return false;
    let d = [p[0]];
    for (let i = 1; i < p.length; i++) { d = extend(n, ends, k, d, p[i]); if (!d || d.length !== i + 1) return false; }
    return true;
  }

  HH.yarn = {
    MAX_COLORS, sizeFor, colorsFor, nbrs, adjacent, hamPath, cut, solve, generate, samePaths,
    endpointOwner, owner, isComplete, beginStroke, extend, applyStroke, lostCells, status, isSolved, validLevel, validPath,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
