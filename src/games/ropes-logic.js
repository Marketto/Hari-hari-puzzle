/* Hari Knots — logica pura (nessun DOM). Regole del modello 3, "Shanghai/Mikado con le corde".
 *
 * Campo: una griglia di punti (cols × rows). Le LASTRE sono rettangoli di punti [x0..x1]×[y0..y1]; la lastra con indice
 * più alto sta sopra. I FORI sono alcuni punti della griglia, forati attraverso tutte le lastre che li coprono.
 * Le CORDE collegano due fori (un foro tiene al massimo un capo). La traccia logica di una corda è il SEGMENTO chiuso
 * tra i due fori (il disegno è una curva morbida, ma le regole usano il segmento).
 *
 * Geometria (coordinate intere, esatta): due corde si INCROCIANO se i segmenti chiusi hanno almeno un punto in comune.
 *   I capi non sono mai in comune (fori distinti), quindi i casi sono: incrocio vero, una corda che passa esattamente
 *   sopra il foro dove è agganciata l'altra (conta: ci passa sopra), tratti collineari sovrapposti (contano).
 *   Passare sopra un foro VUOTO non conta.
 * Strati: per ogni coppia che si incrocia si sa chi sta SOPRA (sempre esattamente una relazione per coppia).
 *
 * Regole:
 *   1. Si può prendere SOLO una corda LIBERA = nessuna corda le sta sopra. Le altre sono bloccate.
 *   2. Mossa: un capo di una corda libera va in un foro LIBERO (presente e vuoto); l'altro capo resta fermo.
 *      Il capo passa in aria e la corda si posa SOPRA a tutte le corde che incrocia nella nuova posizione
 *      (relazioni con le corde che non incrocia più: sparite).
 *   3. Una corda SPARISCE quando non incrocia nessun'altra corda (niente sopra e niente sotto); a catena.
 *      All'inizio ogni corda incrocia almeno un'altra.
 *   4. Lastre: una corda agganciata in un foro tiene tutte le lastre che contengono quel punto. Una lastra senza corde che la
 *      tengono e senza lastre presenti sopra di sé che la sovrappongono cade (a cascata, dall'alto); i suoi fori spariscono.
 *   Obiettivo: far sparire tutte le corde (cadono tutte le lastre). Esistono vicoli ciechi (nessuna corda libera utile).
 *
 * Risolutore (A*, minimo esatto): stato = capi + relazione "sopra" + lastre presenti.
 *   Euristica ammissibile e consistente: due corde che si incrociano e non vengono MAI spostate non spariscono mai
 *   (nessuna delle due resta senza incroci), quindi per ogni incrocio almeno una delle due va spostata:
 *   h = copertura minima dei vertici del grafo degli incroci (ricerca esatta con ramificazione e memo).
 *   Una mossa cambia solo gli incroci della corda spostata, quindi h scende al massimo di 1 per mossa.
 * Generatore: fori casuali sulle lastre, corde che si incrociano, strati da un ordine casuale (niente cicli),
 *   si accetta se A* trova il minimo nella fascia del livello e una giocata "ingenua" (golosa) non lo risolve nel minimo.
 *
 * Esporta HH.ropes = { config, generate, initial, move, legalMoves, freeRopes, freeHoles, solve, crosses, ... }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const MAX_ROPES = 10;
  const RULE = 3;                      // versione delle regole (i salvataggi dei modelli precedenti vengono scartati)

  /* ---------- curva di difficoltà ---------- */
  // c×r = griglia di punti · K corde · P lastre · F fori liberi · [lo, hi] mosse minime · pick = candidati validi
  // tra cui si sceglie quello con più mosse minime (poi meno corde libere all'inizio)
  const TABLE = [
    [1, { cols: 4, rows: 4, K: 3, P: 1, F: 2, lo: 2, hi: 2, pick: 2 }],
    [3, { cols: 4, rows: 5, K: 4, P: 1, F: 2, lo: 3, hi: 4, pick: 4 }],
    [6, { cols: 5, rows: 5, K: 5, P: 2, F: 2, lo: 3, hi: 5, pick: 5 }],
    [10, { cols: 5, rows: 5, K: 6, P: 2, F: 2, lo: 4, hi: 6, pick: 5 }],
    [15, { cols: 5, rows: 6, K: 7, P: 3, F: 2, lo: 5, hi: 7, pick: 5 }],
    [20, { cols: 5, rows: 6, K: 8, P: 3, F: 1, lo: 6, hi: 9, pick: 5 }],
    [1e9, { cols: 5, rows: 6, K: 9, P: 3, F: 1, lo: 7, hi: 10, pick: 5 }],
  ];
  function config(level) {
    const lv = Math.max(1, level | 0);
    for (const [upTo, c] of TABLE) if (lv <= upTo) return Object.assign({}, c);
    return Object.assign({}, TABLE[TABLE.length - 1][1]);
  }

  /* ---------- geometria esatta ---------- */
  const orient = (ax, ay, bx, by, cx, cy) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  const onSeg = (ax, ay, bx, by, px, py) => Math.min(ax, bx) <= px && px <= Math.max(ax, bx) && Math.min(ay, by) <= py && py <= Math.max(ay, by);
  // i segmenti chiusi AB e CD hanno almeno un punto in comune
  function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
    const o1 = orient(ax, ay, bx, by, cx, cy), o2 = orient(ax, ay, bx, by, dx, dy);
    const o3 = orient(cx, cy, dx, dy, ax, ay), o4 = orient(cx, cy, dx, dy, bx, by);
    if (o1 * o2 < 0 && o3 * o4 < 0) return true;                    // incrocio vero
    return (!o1 && onSeg(ax, ay, bx, by, cx, cy)) || (!o2 && onSeg(ax, ay, bx, by, dx, dy)) ||
      (!o3 && onSeg(cx, cy, dx, dy, ax, ay)) || (!o4 && onSeg(cx, cy, dx, dy, bx, by));   // tocco o tratto collineare
  }
  function crosses(holes, a, b, c, d) {
    const A = holes[a], B = holes[b], C = holes[c], D = holes[d];
    return segHit(A[0], A[1], B[0], B[1], C[0], C[1], D[0], D[1]);
  }
  // il segmento tra i fori a e b passa esattamente sopra un altro foro? (il generatore lo evita)
  function passesHole(holes, a, b) {
    const A = holes[a], B = holes[b];
    for (let h = 0; h < holes.length; h++) {
      if (h === a || h === b) continue;
      const P = holes[h];
      if (!orient(A[0], A[1], B[0], B[1], P[0], P[1]) && onSeg(A[0], A[1], B[0], B[1], P[0], P[1])) return true;
    }
    return false;
  }
  const inRect = (p, x, y) => x >= p[0] && x <= p[2] && y >= p[1] && y <= p[3];
  const rectsOverlap = (p, q) => p[0] <= q[2] && q[0] <= p[2] && p[1] <= q[3] && q[1] <= p[3];
  const pop = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

  /* ---------- tabelle del livello (fori → lastre, incroci) ---------- */
  function prep(L) {
    if (L._p) return L._p;
    const H = L.holes.length, P = L.plates.length;
    const pins = new Int32Array(H);       // lastre che contengono il foro h
    L.holes.forEach(([x, y], h) => { L.plates.forEach((p, i) => { if (inRect(p, x, y)) pins[h] |= 1 << i; }); });
    const above = new Int32Array(P);      // lastre sopra la lastra p che la sovrappongono
    for (let p = 0; p < P; p++) for (let q = p + 1; q < P; q++) if (rectsOverlap(L.plates[p], L.plates[q])) above[p] |= 1 << q;
    const X = new Int32Array(H), Y = new Int32Array(H);
    L.holes.forEach(([x, y], h) => { X[h] = x; Y[h] = y; });
    // tabella pigra degli incroci tra segmenti di fori (0 = da calcolare, 1 = no, 2 = sì)
    const CT = new Uint8Array(H * H * H * H);
    const cr = (a, b, c, d) => {
      const q = ((a * H + b) * H + c) * H + d;
      let v = CT[q];
      if (!v) { v = segHit(X[a], Y[a], X[b], Y[b], X[c], Y[c], X[d], Y[d]) ? 2 : 1; CT[q] = v; }
      return v === 2;
    };
    Object.defineProperty(L, '_p', { value: { H, P, K: L.ropes.length, pins, above, cr }, enumerable: false, configurable: true });
    return L._p;
  }

  /* ---------- stato compatto (risolutore e UI) ----------
   * e[2r], e[2r+1] = fori dei capi (-1 se la corda è sparita) · ov[r] = maschera delle corde che r copre
   * pl = maschera delle lastre presenti · alive = corde presenti */
  function packState(L, st) {
    const K = L.ropes.length;
    const e = new Int8Array(2 * K), ov = new Int32Array(K);
    let alive = 0;
    st.ends.forEach((x, r) => { if (x) { e[2 * r] = x[0]; e[2 * r + 1] = x[1]; alive |= 1 << r; } else { e[2 * r] = e[2 * r + 1] = -1; } });
    st.over.forEach(([i, j]) => { ov[i] |= 1 << j; });
    let pl = 0;
    st.plates.forEach((on, p) => { if (on) pl |= 1 << p; });
    return { e, ov, pl, alive };
  }
  function unpackState(L, S) {
    const K = L.ropes.length, ends = [], over = [], plates = [];
    for (let r = 0; r < K; r++) ends.push(S.alive >> r & 1 ? [S.e[2 * r], S.e[2 * r + 1]] : null);
    for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) if (S.ov[i] >> j & 1) over.push([i, j]);
    for (let p = 0; p < L.plates.length; p++) plates.push(!!(S.pl >> p & 1));
    return { ends, over, plates };
  }
  const KBUF = [];
  const keyOf = (S) => {
    KBUF.length = 0;
    KBUF.push(S.pl + 1);
    for (let i = 0; i < S.e.length; i++) KBUF.push(S.e[i] + 2);
    for (let i = 0; i < S.ov.length; i++) KBUF.push(S.ov[i] + 1);
    return String.fromCharCode.apply(null, KBUF);
  };

  // fori liberi: presenti (contenuti da almeno una lastra presente) e senza corde
  function freeMask(L, S) {
    const p = prep(L);
    const used = new Uint8Array(p.H);
    for (let i = 0; i < S.e.length; i++) if (S.e[i] >= 0) used[S.e[i]] = 1;
    const out = [];
    for (let h = 0; h < p.H; h++) if (!used[h] && (p.pins[h] & S.pl)) out.push(h);
    return out;
  }
  // corde libere (nessuna corda presente sopra)
  function freeRopeMask(S) {
    let covered = 0;
    for (let j = 0; j < S.ov.length; j++) if (S.alive >> j & 1) covered |= S.ov[j];
    return S.alive & ~covered;
  }

  /* corde senza incroci spariscono, poi lastre libere cadono (a cascata, dall'alto).
   * Modifica S. Ritorna { gone: [[r, turno]…], fell: [[p, turno]…] } */
  function settle(L, S) {
    const p = prep(L), K = p.K;
    const gone = [], fell = [];
    // una corda sparisce quando non incrocia più nessuna; togliere una corda senza incroci non toglie incroci a nessuno,
    // quindi basta un turno (tutte quelle sole spariscono insieme)
    const touched = new Int32Array(K);
    for (let i = 0; i < K; i++) {
      if (!(S.alive >> i & 1)) continue;
      const m = S.ov[i] & S.alive;
      if (m) { touched[i] = 1; for (let j = 0; j < K; j++) if (m >> j & 1) touched[j] = 1; }
    }
    for (let r = 0; r < K; r++) {
      if (!(S.alive >> r & 1) || touched[r]) continue;
      S.alive &= ~(1 << r); S.ov[r] = 0; S.e[2 * r] = S.e[2 * r + 1] = -1;
      gone.push([r, 0]);
    }
    let pinned = 0;
    for (let i = 0; i < S.e.length; i++) if (S.e[i] >= 0) pinned |= p.pins[S.e[i]];
    for (let round = 0; ; round++) {
      let drop = 0;
      for (let q = 0; q < p.P; q++) if ((S.pl >> q & 1) && !(pinned >> q & 1) && !(p.above[q] & S.pl)) drop |= 1 << q;
      if (!drop) break;
      S.pl &= ~drop;
      for (let q = p.P - 1; q >= 0; q--) if (drop >> q & 1) fell.push([q, round]);
    }
    return { gone, fell };
  }

  /* applica la mossa (corda r, capo end 0/1, foro h) allo stato compatto S (copiato, o scritto in "into").
   * Ritorna null se illegale (corda coperta o sparita, foro non libero), altrimenti
   * { S, pre (subito dopo la posa, prima delle sparizioni), gone, fell, covered:[corde che ora r copre], released:[corde che non incrocia più] } */
  function applyMove(L, S, r, end, h, fast, into) {
    const p = prep(L);
    if (!(S.alive >> r & 1) || (end !== 0 && end !== 1) || !(h >= 0 && h < p.H)) return null;
    if (!(freeRopeMask(S) >> r & 1)) return null;
    if (!(p.pins[h] & S.pl)) return null;
    for (let i = 0; i < S.e.length; i++) if (S.e[i] === h) return null;
    let N;
    if (into) { N = into; N.e.set(S.e); N.ov.set(S.ov); N.pl = S.pl; N.alive = S.alive; }
    else N = { e: S.e.slice(), ov: S.ov.slice(), pl: S.pl, alive: S.alive };
    N.e[2 * r + end] = h;
    const a = N.e[2 * r], b = N.e[2 * r + 1];
    const covered = fast ? null : [], released = fast ? null : [];
    let ov = 0;
    for (let j = 0; j < p.K; j++) {
      if (j === r || !(N.alive >> j & 1)) continue;
      if (p.cr(a, b, N.e[2 * j], N.e[2 * j + 1])) { ov |= 1 << j; if (!fast) covered.push(j); }
      else if (!fast && (S.ov[r] >> j & 1)) released.push(j);
    }
    N.ov[r] = ov;
    const pre = fast ? null : { e: N.e.slice(), ov: N.ov.slice(), pl: N.pl, alive: N.alive };
    const fx = settle(L, N);
    return { S: N, pre, gone: fx.gone, fell: fx.fell, covered, released };
  }

  /* ---------- euristica ----------
   * Sia M l'insieme delle corde che verranno spostate almeno una volta (da ora in poi).
   *  - per ogni coppia che si incrocia ora, almeno una delle due è in M (due corde mai spostate che si incrociano non
   *    restano mai senza incroci, quindi non spariscono);
   *  - se j è in M, ogni corda i che ora sta sopra j è in M: prima di poter prendere j, i deve smettere di coprirla,
   *    e la relazione tra i e j cambia solo spostando i o j (j non si è ancora mosso; i non può sparire mentre incrocia j).
   * h = |M| minimo con queste due proprietà (copertura dei vertici "chiusa verso l'alto"), ricerca esatta con ramificazione.
   * Ogni corda di M costa almeno una mossa → h è ammissibile (A* con riapertura dei nodi resta ottimo). */
  const HMEMO = new Map();
  function heuristic(K, S) {
    const A = S.alive;
    if (!A) return 0;
    const adj = new Int32Array(K), up = new Int32Array(K);
    for (let i = 0; i < K; i++) if (A >> i & 1) {
      const m = S.ov[i] & A;
      for (let j = 0; j < K; j++) if (m >> j & 1) { adj[i] |= 1 << j; adj[j] |= 1 << i; up[j] |= 1 << i; }
    }
    let key = String.fromCharCode(A + 1);
    for (let i = 0; i < K; i++) key += String.fromCharCode(up[i] + 1, adj[i] + 1);
    const v = HMEMO.get(key);
    if (v !== undefined) return v;
    if (HMEMO.size > 60000) HMEMO.clear();
    // chiusura verso l'alto (tutte le corde sopra, sopra quelle sopra, …)
    const anc = new Int32Array(K);
    for (let i = 0; i < K; i++) {
      if (!(A >> i & 1)) continue;
      let c = 1 << i, fr = c;
      while (fr) { let nx = 0; for (let m = fr; m;) { const lb = m & -m, q = 31 - Math.clz32(lb); m ^= lb; nx |= up[q]; } fr = nx & ~c; c |= nx; }
      anc[i] = c;
    }
    let best = pop(A);
    const rec = (M) => {
      const c = pop(M);
      if (c >= best) return;
      // un incrocio non coperto
      for (let m = A & ~M; m;) {
        const lb = m & -m, i = 31 - Math.clz32(lb); m ^= lb;
        const n = adj[i] & ~M;
        if (!n) continue;
        const j = 31 - Math.clz32(n & -n);
        rec(M | anc[i]);
        rec(M | anc[j]);
        return;
      }
      best = c;
    };
    rec(0);
    HMEMO.set(key, best);
    return best;
  }

  /* ---------- A* ----------
   * solve(L, st?, { nodeLimit }) → { min, path:[[r,end,h]…], nodes, aborted, unsolvable } */
  function solve(L, st, opts = {}) {
    const p = prep(L), K = p.K;
    const nodeLimit = opts.nodeLimit || 20000;
    const S0 = packState(L, st || initial(L));
    const best = new Map();
    const buckets = [];
    const tmp = { e: new Int8Array(2 * K), ov: new Int32Array(K), pl: 0, alive: 0 };
    // code a due livelli: f crescente e, a parità di f, g più alto prima
    const push = (node, f) => { const b = buckets[f] || (buckets[f] = []); (b[node.g] || (b[node.g] = [])).push(node); };
    const popF = (f) => {
      const b = buckets[f];
      if (!b) return null;
      for (let g = b.length - 1; g >= 0; g--) if (b[g] && b[g].length) return b[g].pop();
      return null;
    };
    const k0 = keyOf(S0);
    best.set(k0, 0);
    push({ S: S0, g: 0, par: null, mv: null, k: k0 }, heuristic(K, S0));
    let nodes = 0, f = 0;
    for (;;) {
      let n = null;
      while (f < buckets.length && !(n = popF(f))) f++;
      if (!n) return { min: -1, path: null, nodes, aborted: false, unsolvable: true };
      if (best.get(n.k) < n.g) continue;
      if (!n.S.alive) {
        const path = [];
        for (let x = n; x.mv; x = x.par) path.push(x.mv);
        return { min: n.g, path: path.reverse(), nodes, aborted: false, unsolvable: false };
      }
      if (++nodes > nodeLimit) return { min: -1, path: null, nodes, aborted: true, unsolvable: false };
      const free = freeMask(L, n.S), fr = freeRopeMask(n.S);
      for (let r = 0; r < K; r++) {
        if (!(fr >> r & 1)) continue;
        for (let end = 0; end < 2; end++) {
          for (const h of free) {
            applyMove(L, n.S, r, end, h, true, tmp);
            const k = keyOf(tmp), g = n.g + 1;
            const old = best.get(k);
            if (old !== undefined && old <= g) continue;
            best.set(k, g);
            const S2 = { e: tmp.e.slice(), ov: tmp.ov.slice(), pl: tmp.pl, alive: tmp.alive };
            push({ S: S2, g, par: n, mv: [r, end, h], k }, g + heuristic(K, S2));
          }
        }
      }
    }
  }

  /* ---------- stati pubblici (JSON) ---------- */
  function initial(L) {
    return { ends: L.ropes.map((x) => x.slice()), over: L.over.map((x) => x.slice()), plates: L.plates.map(() => true) };
  }
  // mossa sullo stato pubblico: null se illegale, altrimenti { state, pre, gone, fell, covered, released }
  function move(L, st, r, end, h) {
    const m = applyMove(L, packState(L, st), r, end, h);
    if (!m) return null;
    return { state: unpackState(L, m.S), pre: unpackState(L, m.pre), gone: m.gone, fell: m.fell, covered: m.covered, released: m.released };
  }
  const freeHoles = (L, st) => freeMask(L, packState(L, st));
  function freeRopes(L, st) {
    const m = freeRopeMask(packState(L, st)), out = [];
    for (let r = 0; r < L.ropes.length; r++) if (m >> r & 1) out.push(r);
    return out;
  }
  function legalMoves(L, st) {
    const free = freeHoles(L, st), out = [];
    for (const r of freeRopes(L, st)) for (let end = 0; end < 2; end++) for (const h of free) out.push([r, end, h]);
    return out;
  }
  const isSolved = (st) => st.ends.every((x) => !x);
  const ropesLeft = (st) => st.ends.filter(Boolean).length;
  function coverers(st, r) { return st.over.filter(([i, j]) => j === r && st.ends[i]).map(([i]) => i); }
  const isFree = (st, r) => !!st.ends[r] && !coverers(st, r).length;

  /* ---------- generatore ---------- */
  const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ri = (rnd, n) => Math.floor(rnd() * n);

  // lastre come rettangoli di punti; indice più alto = sopra
  function platesFor(c, rnd) {
    const W = c.cols - 1, Hh = c.rows - 1;
    if (c.P === 1) return [[0, 0, W, Hh]];
    if (c.P === 2) {
      if (rnd() < 0.5) {                                    // affiancate a sinistra/destra, una colonna in comune
        const s = 1 + ri(rnd, W - 1);
        const A = [0, rnd() < 0.5 ? 0 : 1, s, Hh], B = [s, 0, W, rnd() < 0.5 ? Hh : Hh - 1];
        if (A[1] === 1 && B[3] === Hh - 1) A[1] = 0;
        return rnd() < 0.5 ? [A, B] : [B, A];
      }
      const s = 1 + ri(rnd, Hh - 1);                        // una sopra l'altra, una riga in comune
      const A = [0, 0, rnd() < 0.5 ? W : W - 1, s], B = [rnd() < 0.5 ? 0 : 1, s, W, Hh];
      if (A[2] === W - 1 && B[0] === 1) B[0] = 0;
      return rnd() < 0.5 ? [A, B] : [B, A];
    }
    // 3 lastre: due in basso (alto e basso del campo) e una in mezzo che le sovrappone entrambe
    const t = 1 + ri(rnd, Math.max(1, Hh - 3)), b = Math.min(Hh - 1, t + 2);
    const A = [0, 0, W, t], B = [0, b, W, Hh];
    const M = [rnd() < 0.5 ? 0 : 1, t, rnd() < 0.5 ? W : W - 1, b];
    if (M[0] === 1 && M[2] === W - 1) M[2] = W;
    return rnd() < 0.5 ? [A, B, M] : [B, A, M];
  }

  function layout(c, rnd) {
    const plates = platesFor(c, rnd);
    const pts = [];
    for (let y = 0; y < c.rows; y++) for (let x = 0; x < c.cols; x++) if (plates.some((p) => inRect(p, x, y))) pts.push([x, y]);
    const nH = 2 * c.K + c.F;
    if (pts.length < nH) return null;
    shuffle(pts, rnd);
    const holes = [];
    const has = (x, y) => holes.some((h) => h[0] === x && h[1] === y);
    plates.forEach((p) => {                                  // ogni lastra riceve almeno 2 fori
      const mine = pts.filter(([x, y]) => inRect(p, x, y) && !has(x, y));
      for (let i = 0; i < 2 && i < mine.length; i++) holes.push(mine[i]);
    });
    for (const q of pts) { if (holes.length >= nH) break; if (!has(q[0], q[1])) holes.push(q); }
    holes.sort((u, v) => u[1] - v[1] || u[0] - v[0]);
    // capi: 2K fori a caso, accoppiati preferendo corde lunghe e che incrociano già le altre (qualche tentativo)
    for (let att = 0; att < 4; att++) {
      const left = shuffle([...holes.keys()], rnd).slice(0, 2 * c.K);
      const ropes = [];
      while (left.length) {
        const a = left.shift();
        let bestB = -1, bestS = -1e9;
        for (let q = 0; q < left.length; q++) {
          const b = left[q];
          const dx = holes[a][0] - holes[b][0], dy = holes[a][1] - holes[b][1];
          const d2 = dx * dx + dy * dy;
          if (d2 < 4 || passesHole(holes, a, b)) continue;
          let x = 0;
          for (const [u, v] of ropes) if (crosses(holes, a, b, u, v)) x++;
          const sc = 0.55 * Math.sqrt(d2) + 0.7 * x + rnd() * 2.6;
          if (sc > bestS) { bestS = sc; bestB = q; }
        }
        if (bestB < 0) break;
        ropes.push([a, left.splice(bestB, 1)[0]]);
      }
      if (ropes.length === c.K) return { holes, plates, ropes };
    }
    return null;
  }

  // strati da un ordine casuale (quota z): niente cicli; ogni corda deve incrociarne almeno una
  function dress(base, rnd) {
    const { holes, ropes } = base, K = ropes.length;
    const z = shuffle([...Array(K).keys()], rnd);
    const over = [], deg = new Array(K).fill(0);
    for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) {
      if (!crosses(holes, ropes[i][0], ropes[i][1], ropes[j][0], ropes[j][1])) continue;
      over.push(z[i] > z[j] ? [i, j] : [j, i]); deg[i]++; deg[j]++;
    }
    return deg.some((d) => !d) ? null : over;
  }

  function stableStart(L) {
    const S = packState(L, initial(L));
    const fx = settle(L, S);
    return !fx.gone.length && !fx.fell.length;
  }

  /* giocata "ingenua": a ogni passo la mossa che fa sparire più corde (a parità, la prima: corda, capo, foro in ordine).
   * Ritorna il numero di mosse con cui risolve, o -1 se non ci riesce entro maxMoves. */
  function naive(L, maxMoves) {
    let S = packState(L, initial(L));
    const K = L.ropes.length;
    for (let m = 1; m <= maxMoves; m++) {
      let best = null, bs = -1e9;
      const free = freeMask(L, S), fr = freeRopeMask(S);
      for (let r = 0; r < K; r++) {
        if (!(fr >> r & 1)) continue;
        for (let end = 0; end < 2; end++) for (const h of free) {
          const x = applyMove(L, S, r, end, h, true);
          const sc = x.gone.length;
          if (sc > bs) { bs = sc; best = x; }
        }
      }
      if (!best) return -1;
      void K;
      S = best.S;
      if (!S.alive) return m;
    }
    return -1;
  }

  /* generate(level | cfg, rnd) → livello JSON:
   * { rule, cols, rows, holes:[[x,y]…], plates:[[x0,y0,x1,y1]…], ropes:[[a,b]…], over:[[i,j]…], min, solution, nodes, free0, gap } */
  function generate(arg, rnd = Math.random) {
    const c = typeof arg === 'number' ? config(arg) : Object.assign(config(1), arg);
    const nodeLimit = c.nodeLimit || 1500, pick = c.pick || 1;
    let best = null, found = 0, fallback = null, fbScore = 1e9;
    const t0 = Date.now();
    for (let t = 0; t < 800 && found < pick; t++) {
      const el = Date.now() - t0;
      if ((found && el > 30) || (fallback && el > 120)) break;
      const base = layout(c, rnd);
      if (!base) continue;
      const over = dress(base, rnd);
      if (!over) continue;
      const L = { rule: RULE, cols: c.cols, rows: c.rows, holes: base.holes, plates: base.plates, ropes: base.ropes, over };
      if (!stableStart(L)) continue;
      const S = packState(L, initial(L));
      const h0 = heuristic(L.ropes.length, S);
      if (h0 > c.hi || (h0 < c.lo - 2 && fallback)) continue;
      const r = solve(L, null, { nodeLimit });
      if (r.aborted || r.unsolvable) continue;
      const inBand = r.min >= c.lo && r.min <= c.hi;
      const nv = inBand && c.lo >= 3 ? naive(L, r.min) : -1;   // il primo livello può essere facile
      const free0 = pop(freeRopeMask(S));
      const out = Object.assign(L, { min: r.min, solution: r.path, nodes: r.nodes, free0 });
      out.gap = r.min - h0;
      if (inBand && nv < 0) {
        found++;
        // tra i candidati validi: più mosse minime, poi più mosse "nascoste" (oltre l'euristica), poi meno corde libere
        const sc = (x) => x.min * 100 + x.gap * 10 - x.free0;
        if (!best || sc(out) > sc(best)) best = out;
        continue;
      }
      const sc = Math.max(0, c.lo - r.min) + Math.max(0, r.min - c.hi) + (nv > 0 ? 0.5 : 0);
      if (sc < fbScore) { fbScore = sc; fallback = out; }
    }
    return best || fallback || FALLBACK();
  }

  // livello di riserva (verificato nei test): tre corde in pila
  function FALLBACK() {
    const L = {
      rule: RULE, cols: 4, rows: 4, holes: [[0, 0], [3, 0], [0, 3], [3, 3], [1, 0], [1, 3], [0, 1], [2, 2], [3, 1]],
      plates: [[0, 0, 3, 3]], ropes: [[0, 3], [1, 2], [4, 5]], over: [],
    };
    const p = prep(L), z = [2, 1, 0];
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (p.cr(L.ropes[i][0], L.ropes[i][1], L.ropes[j][0], L.ropes[j][1])) L.over.push(z[i] > z[j] ? [i, j] : [j, i]);
    const r = solve(L, null, { nodeLimit: 20000 });
    return Object.assign(L, { min: r.min, solution: r.path, nodes: r.nodes, free0: 1, gap: 0 });
  }

  /* ---------- salvataggi ---------- */
  function validLevel(L) {
    if (!L || L.rule !== RULE || !Number.isInteger(L.cols) || !Number.isInteger(L.rows) || L.cols < 2 || L.rows < 2 || L.cols > 8 || L.rows > 9) return false;
    if (!Array.isArray(L.holes) || !Array.isArray(L.plates) || !Array.isArray(L.ropes) || !Array.isArray(L.over)) return false;
    if (L.ropes.length < 1 || L.ropes.length > MAX_ROPES || L.plates.length < 1 || L.plates.length > 5 || L.holes.length > 40) return false;
    const seen = new Set();
    for (const h of L.holes) {
      if (!Array.isArray(h) || h.length !== 2 || !h.every(Number.isInteger) || h[0] < 0 || h[1] < 0 || h[0] >= L.cols || h[1] >= L.rows) return false;
      if (seen.has(h[0] * 100 + h[1])) return false;
      seen.add(h[0] * 100 + h[1]);
      if (!L.plates.some((p) => inRect(p, h[0], h[1]))) return false;
    }
    if (!L.plates.every((p) => Array.isArray(p) && p.length === 4 && p.every(Number.isInteger) && p[0] <= p[2] && p[1] <= p[3])) return false;
    const H = L.holes.length, K = L.ropes.length;
    const used = new Set();
    for (const e of L.ropes) {
      if (!Array.isArray(e) || e.length !== 2 || !e.every((h) => Number.isInteger(h) && h >= 0 && h < H) || e[0] === e[1]) return false;
      if (used.has(e[0]) || used.has(e[1])) return false;
      used.add(e[0]); used.add(e[1]);
    }
    const pair = (x) => Array.isArray(x) && x.length === 2 && x.every((r) => Number.isInteger(r) && r >= 0 && r < K) && x[0] !== x[1];
    return L.over.every(pair) && Number.isInteger(L.min) && L.min >= 0;
  }
  // stato salvato coerente: capi in fori distinti e presenti, esattamente uno strato per ogni coppia che si incrocia
  function validState(L, st) {
    if (!st || !Array.isArray(st.ends) || st.ends.length !== L.ropes.length || !Array.isArray(st.over)) return false;
    if (!Array.isArray(st.plates) || st.plates.length !== L.plates.length) return false;
    const p = prep(L), used = new Set();
    let pl = 0;
    st.plates.forEach((on, i) => { if (on) pl |= 1 << i; });
    for (const e of st.ends) {
      if (e === null) continue;
      if (!Array.isArray(e) || e.length !== 2) return false;
      for (const h of e) {
        if (!Number.isInteger(h) || h < 0 || h >= p.H || used.has(h) || !(p.pins[h] & pl)) return false;
        used.add(h);
      }
    }
    const K = L.ropes.length, alive = (r) => Number.isInteger(r) && r >= 0 && r < K && st.ends[r];
    const cross = (i, j) => p.cr(st.ends[i][0], st.ends[i][1], st.ends[j][0], st.ends[j][1]);
    if (!st.over.every((x) => Array.isArray(x) && x.length === 2 && alive(x[0]) && alive(x[1]) && x[0] !== x[1])) return false;
    for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) {
      if (!st.ends[i] || !st.ends[j]) continue;
      const o = st.over.filter((x) => (x[0] === i && x[1] === j) || (x[0] === j && x[1] === i)).length;
      if (o !== (cross(i, j) ? 1 : 0)) return false;
    }
    return true;
  }

  /* ---------- punteggio e avanzamento ---------- */
  // fragoline: HH.rules.rateMoves (3 col minimo esatto, 2 entro il 70% delle mosse in più "concesse", 1 oltre)
  function rate(moves, min) {
    if (HH.rules && HH.rules.rateMoves) return HH.rules.rateMoves(moves, min);
    const extra = Math.max(2, Math.min(6, Math.ceil(min * 0.15)));
    const used = moves - min;
    return used <= 0 ? 3 : used <= Math.floor(extra * 0.7) ? 2 : 1;
  }
  // 0..1: corde sparite (85%) + lastre cadute (15%); 1 solo a livello risolto
  function progress(L, st) {
    if (isSolved(st)) return 1;
    const K = L.ropes.length, P = L.plates.length;
    const g = (K - ropesLeft(st)) / K, f = st.plates.filter((x) => !x).length / P;
    return Math.max(0, Math.min(0.99, 0.85 * g + 0.15 * f));
  }

  HH.ropes = {
    MAX_ROPES, RULE, TABLE, config, segHit, crosses, passesHole, inRect, rectsOverlap, prep,
    packState, unpackState, keyOf, settle, applyMove, heuristic, solve,
    initial, move, freeHoles, freeRopes, legalMoves, isSolved, ropesLeft, coverers, isFree,
    platesFor, layout, dress, stableStart, naive, generate, FALLBACK, validLevel, validState, rate, progress,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
