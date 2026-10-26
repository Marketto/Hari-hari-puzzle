/* Yarn Link — logica pura (nessun DOM).
 * Regole (stile "Flow / Numberlink"): sulla griglia n×n ci sono coppie di gomitoli dello stesso colore;
 *   collega ogni coppia con un filo di lana fatto di passi orizzontali/verticali;
 *   i fili non si incrociano né si sovrappongono e alla fine coprono TUTTE le caselle.
 *
 * Generatore (soluzione-prima + riparazione dell'unicità):
 *   1-2. copertura casuale della griglia con k fili "puliti" (un filo non tocca mai sé stesso), lunghezza ≥ 3;
 *        degli estremi restano solo i gomitoli
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

  /* ---------- copertura con fili "puliti" ----------
   * Si parte da 81 (n²) fili di una casella e si uniscono a caso gli estremi vicini, preferendo i fili corti.
   * Un'unione è ammessa solo se il nuovo filo non tocca sé stesso (due sue caselle vicine sono sempre consecutive):
   * i fili che "rientrano" su sé stessi lasciano quasi sempre una seconda soluzione.
   * Se non ci sono più unioni possibili ma restano fili di una casella (o troppi fili), un estremo "ruba"
   * un pezzo del filo vicino (che si spezza in due) e si riprova. Ritorna l'elenco dei fili (array di celle). */
  function grow(n, k, rnd, iters = 6 * n * n) {
    const N = n * n, NB = nbrs(n);
    const id = new Int32Array(N);
    const P = [];
    for (let i = 0; i < N; i++) { id[i] = i; P.push([i]); }
    let count = N;
    const isEnd = (x) => { const p = P[id[x]]; return p[0] === x || p[p.length - 1] === x; };
    // nessuna casella di A tocca il filo bid, tranne la coppia (a, b) che li unisce
    const clean = (A, a, bid, b) => {
      for (const c of A) for (const y of NB[c]) if (id[y] === bid && !(c === a && y === b)) return false;
      return true;
    };
    const join = (aid, a, bid, b) => {
      let A = P[aid], B = P[bid];
      if (A[0] === a && A.length > 1) A = A.slice().reverse();
      if (B[0] !== b) B = B.slice().reverse();
      P[aid] = A.concat(B); P[bid] = null;
      for (const c of B) id[c] = aid;
      count--;
    };
    const ms = [];
    for (let it = 0; it < iters; it++) {
      let singles = false;
      for (const p of P) if (p && p.length === 1) { singles = true; break; }
      if (count <= k && !singles) break;
      ms.length = 0;
      let minL = 1e9;
      for (let aid = 0; aid < N; aid++) {
        const A = P[aid];
        if (!A) continue;
        const ea = A.length === 1 ? 1 : 2;
        for (let t = 0; t < ea; t++) {
          const a = t ? A[A.length - 1] : A[0];
          for (const b of NB[a]) {
            const bid = id[b];
            if (bid <= aid || !isEnd(b)) continue;
            const B = P[bid], L = A.length + B.length;
            if (!(A.length <= B.length ? clean(A, a, bid, b) : clean(B, b, aid, a))) continue;
            ms.push(aid, a, bid, b, L);
            if (L < minL) minL = L;
          }
        }
      }
      if (ms.length) {
        const m = ms.length / 5, sel = [];
        const tight = rnd() < 0.75;
        for (let q = 0; q < m; q++) if (!tight || ms[q * 5 + 4] <= minL + 2) sel.push(q * 5);
        const q = sel[(rnd() * sel.length) | 0];
        join(ms[q], ms[q + 1], ms[q + 2], ms[q + 3]);
        continue;
      }
      // nessuna unione: un estremo (di preferenza un filo di una casella) ruba un pezzo del filo vicino
      const ids = [], sing = [];
      P.forEach((p, i) => { if (p) { ids.push(i); if (p.length === 1) sing.push(i); } });
      const aid = sing.length ? sing[(rnd() * sing.length) | 0] : ids[(rnd() * ids.length) | 0];
      const A = P[aid], a = rnd() < 0.5 ? A[0] : A[A.length - 1];
      const opts = NB[a].filter((y) => id[y] !== aid && !isEnd(y));
      if (!opts.length) continue;
      const y = opts[(rnd() * opts.length) | 0], bid = id[y], B = P[bid], j = B.indexOf(y);
      let keep, rest;
      if (rnd() < 0.5) { keep = B.slice(0, j + 1); rest = B.slice(j + 1); } else { keep = B.slice(j).reverse(); rest = B.slice(0, j); }
      const inKeep = new Set(keep);
      let ok = true;
      for (const c of A) { for (const z of NB[c]) if (inKeep.has(z) && !(c === a && z === y)) { ok = false; break; } if (!ok) break; }
      if (!ok) continue;
      const nid = P.indexOf(null);
      P[bid] = keep; P[nid] = rest;
      for (const c of rest) id[c] = nid;
      count++;
      join(bid, y, aid, a);
    }
    return P.filter(Boolean);
  }

  /* ---------- risolutore: DFS a due teste ----------
   * Ogni colore cresce da entrambi i gomitoli; si ramifica sulla testa con meno mosse possibili.
   * Potature: testa senza mosse; casella vuota con meno di 2 vicini utilizzabili;
   * le due teste di un colore devono toccare la stessa zona vuota (o toccarsi);
   * ogni zona vuota deve essere toccata da entrambe le teste di almeno un colore;
   * casella vuota con esattamente 2 vicini utilizzabili: se uno è una testa, quella testa è obbligata ad entrarci
   * (se sono due teste di colori diversi lo stato è impossibile).
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
    let nodes = 0, aborted = false, left = K, empty = N - 2 * K, forced = -1;
    const solutions = [];
    const isHead = (j) => { const k = col[j]; return k >= 0 && !done[k] && (hd[2 * k] === j || hd[2 * k + 1] === j); };

    // ritorna -1 se lo stato è impossibile, altrimenti l'indice della testa (2k+s) con meno mosse
    const headIdx = (j) => (hd[2 * col[j]] === j ? 2 * col[j] : 2 * col[j] + 1);
    function check() {
      let best = -1, bestM = 99;
      forced = -1;
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
        let u = 0, h1 = -1, h2 = -1;
        for (const j of NB[i]) {
          if (col[j] < 0) u++;
          else if (isHead(j)) { u++; if (h1 < 0) h1 = j; else h2 = j; }
        }
        if (u < 2) return -1;
        if (u === 2 && h1 >= 0 && forced < 0) {
          if (h2 >= 0 && col[h1] !== col[h2]) return -1;
          forced = i; best = headIdx(h1);
        }
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
      const f = forced;
      for (const j of NB[h]) {
        if (f >= 0 && j !== f) continue;
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

  /* generate(level | {n, colors}, rnd) → { n, ends:[[a,b]…], solution:[[celle]…], nodes }
   * nodes = nodi del risolutore per dimostrare l'unicità (misura di difficoltà). */
  function generate(arg, rnd = Math.random) {
    const cfg = typeof arg === 'number' ? { n: sizeFor(arg), colors: colorsFor(arg) } : arg;
    const n = cfg.n;
    const maxColors = Math.min(MAX_COLORS, cfg.maxColors || cfg.colors + 2);
    const nodeLimit = cfg.nodeLimit || 6000;
    for (let t = 0; t < 300; t++) {
      let paths = grow(n, cfg.colors, rnd);
      if (paths.length > maxColors || paths.some((p) => p.length < 3)) continue;
      for (let rep = 0; rep < 2 && paths && paths.length <= maxColors; rep++) {
        const r = solve(n, paths.map((p) => [p[0], p[p.length - 1]]), { limit: 2, nodeLimit });
        if (r.aborted) break;
        if (r.count === 1) return pack(n, paths, r.nodes, rnd);
        paths = splitWhereDiffer(n, paths, r.solutions.find((x) => !samePaths(x, paths)), rnd);
      }
    }
    return pack(n, rowsPuzzle(n), 0, rnd);
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

  /* fragoline: un "ripensamento" è ogni azione che toglie lana già stesa (filo accorciato, cancellato,
   * tagliato da un altro filo, ripartito da capo) e ogni Annulla.
   *   3 con al massimo 1 ripensamento (2 dalle griglie con 8+ colori), 2 fino a un ripensamento per colore, 1 oltre. */
  function rate(rethinks, colors) {
    const r = rethinks || 0;
    return r <= (colors >= 8 ? 2 : 1) ? 3 : r <= colors ? 2 : 1;
  }
  // avanzamento 0..1: 60% caselle coperte (oltre ai gomitoli), 40% coppie collegate; 1 solo a puzzle risolto
  function progress(n, ends, paths) {
    const st = status(n, ends, paths);
    if (st.solved) return 1;
    const free = st.total - 2 * st.colors;
    const f = free > 0 ? (st.filled - 2 * st.colors) / free : 1;
    return Math.max(0, Math.min(0.99, 0.6 * f + 0.4 * (st.connected / st.colors)));
  }

  HH.yarn = {
    rate, progress, rowsPuzzle,
    MAX_COLORS, sizeFor, colorsFor, nbrs, adjacent, grow, solve, generate, samePaths,
    endpointOwner, owner, isComplete, beginStroke, extend, applyStroke, lostCells, status, isSolved, validLevel, validPath,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
