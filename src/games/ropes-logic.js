/* Hari Knots — logica pura (nessun DOM).
 *
 * Campo: una griglia di punti (cols × rows). Le LASTRE sono rettangoli di punti [x0..x1]×[y0..y1]; la lastra con indice
 * più alto sta sopra. I FORI sono alcuni punti della griglia, forati attraverso tutte le lastre che li coprono.
 * Le CORDE collegano due fori (un foro tiene al massimo un'estremità). La traccia logica di una corda è il SEGMENTO
 * chiuso tra i due fori (il disegno è una curva morbida, ma le regole usano il segmento).
 *
 * Geometria (coordinate intere, esatta):
 *   due corde si INCROCIANO se i loro segmenti chiusi hanno almeno un punto in comune. Le estremità non sono mai in
 *   comune (fori distinti), quindi i casi sono: incrocio vero, una corda che passa esattamente sopra il foro dove è
 *   agganciata l'altra (conta come incrocio: ci passa sopra), tratti collineari sovrapposti (contano come incrocio).
 *   Passare sopra un foro VUOTO non conta nulla.
 * Strati: per ogni coppia che si incrocia si sa chi sta SOPRA (relazione a coppie, può anche essere ciclica:
 *   A sopra B, B sopra C, C sopra A, come nelle corde vere).
 * Attorcigliate: coppie avvolte una sull'altra. È un avvolgimento fisico: NON si scioglie da solo quando i segmenti
 *   smettono di incrociarsi; si scioglie solo ripassando il capo di una delle due sopra l'altra. Nello stato pubblico la
 *   coppia è ordinata [a, b] = "a è avvolta attorno a b" (serve solo al disegno: per le regole è simmetrica).
 *   Una coppia attorcigliata non ha una relazione "sopra".
 *
 * Mossa (modello 2, "la mano che solleva il capo"): il capo E della corda A va dal foro h0 a un foro LIBERO h1
 * viaggiando IN ARIA sopra tutto (percorso = segmento h0→h1); l'altro capo F resta fermo. Per ogni altra corda B:
 *   p  = il percorso h0→h1 interseca B · c1 = il nuovo segmento F→h1 interseca B
 *   prima A sopra B           → dopo A sopra B se c1, altrimenti niente
 *   prima nessuna relazione    → dopo A sopra B se c1 (arriva dall'alto), altrimenti niente
 *   prima B sopra A            → se p: A si AVVOLGE attorno a B (attorcigliate); altrimenti B sopra A se c1, o niente
 *   prima attorcigliate        → se p: il capo ripassa sopra B e si srotola → B sopra A se c1, o niente;
 *                                 altrimenti restano attorcigliate
 *   (simmetrico: vale lo stesso spostando il capo di B attorno ad A.)
 * Poi, a cascata: ogni corda NON coperta da nessun'altra e NON attorcigliata sparisce (libera i suoi fori).
 * Un nodino coperto (una corda che passa sopra il foro del capo) si può comunque sollevare: la corda di sopra conta già
 *   come incrocio, quindi la coerenza è data dalle regole p/c1 (nessun divieto in più).
 * Lastre: una corda agganciata in un foro tiene tutte le lastre che contengono quel punto. Una lastra senza corde
 *   che la tengono e senza lastre presenti SOPRA di sé che la sovrappongono cade (a cascata, dall'alto); i suoi fori
 *   spariscono (un foro esiste finché almeno una lastra presente lo contiene).
 * Obiettivo: far sparire tutte le corde (allora cadono tutte le lastre).
 *
 * Risolutore (A*, minimo esatto): stato = estremità + relazione "sopra" + attorcigliamenti + lastre presenti.
 *   Euristica ammissibile e consistente: le corde MAI spostate mantengono tra loro strati e attorcigliamenti (solo una
 *   mossa di una delle due li cambia); per sparire tutte devono formare un insieme senza coppie attorcigliate e senza
 *   cicli di copertura. h = minimo numero di corde da togliere per ottenere un insieme così (tetto 6).
 *   Una mossa cambia solo le relazioni della corda spostata, quindi h scende al massimo di 1 per mossa.
 * Generatore: fori casuali sulle lastre, corde lunghe che si incrociano, strati casuali, attorcigliamenti; si ripara
 *   finché nessuna corda sparirebbe subito; si accetta se A* trova il minimo nella fascia del livello e se una
 *   giocata "ingenua" (golosa) non lo risolve nel minimo.
 *
 * Esporta HH.ropes = { config, generate, initial, move, legalMoves, freeHoles, solve, crosses, ... }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const MAX_ROPES = 10;
  const RULE = 2;                      // versione delle regole (i salvataggi del modello 1 vengono scartati)

  /* ---------- curva di difficoltà ---------- */
  // c×r = griglia di punti · K corde · P lastre · F fori liberi · T coppie attorcigliate · [lo, hi] mosse minime
  // pick = candidati validi tra cui si sceglie quello con più mosse minime (poi meno prime mosse giuste)
  // loose = probabilità di avvolgere anche coppie che non si incrociano (ansa)
  const TABLE = [
    [1, { cols: 4, rows: 4, K: 3, P: 1, F: 2, T: 1, loose: 0.5, lo: 2, hi: 2, pick: 1 }],
    [3, { cols: 4, rows: 5, K: 4, P: 1, F: 2, T: 1, loose: 0.4, lo: 2, hi: 3, pick: 3 }],
    [6, { cols: 5, rows: 5, K: 5, P: 2, F: 2, T: 2, loose: 0.3, lo: 2, hi: 4, pick: 4 }],
    [10, { cols: 5, rows: 5, K: 6, P: 2, F: 2, T: 2, loose: 0.3, lo: 3, hi: 5, pick: 3 }],
    [15, { cols: 5, rows: 6, K: 7, P: 3, F: 2, T: 3, loose: 0.3, lo: 4, hi: 5, pick: 2 }],
    [20, { cols: 5, rows: 6, K: 8, P: 3, F: 1, T: 3, loose: 0.3, lo: 4, hi: 6, pick: 2 }],
    [1e9, { cols: 5, rows: 6, K: 9, P: 3, F: 1, T: 4, loose: 0.3, lo: 5, hi: 7, pick: 1 }],
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
  // punto (esatto) del segmento tra i fori a e b che coincide con un altro foro? (il generatore li evita)
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

  /* ---------- tabelle del livello (fori → lastre) ---------- */
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

  /* ---------- stato compatto (usato dal risolutore e dalla UI) ----------
   * e[2r], e[2r+1] = fori delle estremità (-1 se la corda è sparita) · ov[r] = maschera delle corde che r copre
   * tw[r] = maschera delle corde attorno a cui r è avvolta (direzione solo per il disegno) · pl = maschera delle lastre presenti · alive = corde presenti */
  function packState(L, st) {
    const K = L.ropes.length;
    const e = new Int8Array(2 * K), ov = new Int32Array(K), tw = new Int32Array(K);
    let alive = 0;
    st.ends.forEach((x, r) => { if (x) { e[2 * r] = x[0]; e[2 * r + 1] = x[1]; alive |= 1 << r; } else { e[2 * r] = e[2 * r + 1] = -1; } });
    st.over.forEach(([i, j]) => { ov[i] |= 1 << j; });
    st.twists.forEach(([i, j]) => { tw[i] |= 1 << j; });
    let pl = 0;
    st.plates.forEach((on, p) => { if (on) pl |= 1 << p; });
    return { e, ov, tw, pl, alive };
  }
  function unpackState(L, S) {
    const K = L.ropes.length, ends = [], over = [], twists = [], plates = [];
    for (let r = 0; r < K; r++) ends.push(S.alive >> r & 1 ? [S.e[2 * r], S.e[2 * r + 1]] : null);
    for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) {
      if (S.ov[i] >> j & 1) over.push([i, j]);
      if (S.tw[i] >> j & 1) twists.push([i, j]);
    }
    for (let p = 0; p < L.plates.length; p++) plates.push(!!(S.pl >> p & 1));
    return { ends, over, twists, plates };
  }
  // maschere simmetriche degli attorcigliamenti (per le regole la direzione non conta)
  function twSym(S, out) {
    const K = S.tw.length;
    for (let i = 0; i < K; i++) out[i] = S.tw[i];
    for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) if (S.tw[i] >> j & 1) out[j] |= 1 << i;
    return out;
  }
  const KBUF = [];
  const keyOf = (S) => {
    const K = S.ov.length;
    KBUF.length = 0;
    KBUF.push(S.pl + 1);
    for (let i = 0; i < S.e.length; i++) KBUF.push(S.e[i] + 2);
    for (let i = 0; i < K; i++) {
      let t = S.tw[i];
      for (let j = 0; j < K; j++) if (S.tw[j] >> i & 1) t |= 1 << j;
      KBUF.push(S.ov[i] + 1, t + 1);
    }
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

  /* cascata: corde scoperte e non attorcigliate spariscono (a turni), poi lastre libere cadono (dall'alto).
   * Modifica S. Ritorna { gone: [[r, turno]…], fell: [[p, turno]…] } */
  function settle(L, S) {
    const p = prep(L), K = p.K;
    const gone = [], fell = [];
    for (let round = 0; ; round++) {
      let covered = 0;
      for (let j = 0; j < K; j++) if (S.alive >> j & 1) covered |= S.ov[j];
      let twisted = 0;
      for (let j = 0; j < K; j++) if (S.tw[j]) twisted |= S.tw[j] | (1 << j);
      let free = 0;
      for (let r = 0; r < K; r++) if ((S.alive >> r & 1) && !(covered >> r & 1) && !(twisted >> r & 1)) free |= 1 << r;
      if (!free) break;
      for (let r = 0; r < K; r++) {
        if (!(free >> r & 1)) continue;
        S.alive &= ~(1 << r); S.ov[r] = 0; S.e[2 * r] = S.e[2 * r + 1] = -1;
        gone.push([r, round]);
      }
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

  /* applica la mossa (corda r, estremità end 0/1, foro h) allo stato compatto S (copiato), regole del modello 2.
   * Ritorna null se illegale, altrimenti
   * { S, pre, gone, fell, lifted:[corde che r ora copre], wrapped:[corde attorno a cui r si è avvolta], unwound:[corde da cui r si è srotolata] } */
  function applyMove(L, S, r, end, h, fast, into) {
    const p = prep(L);
    if (!(S.alive >> r & 1) || (end !== 0 && end !== 1) || !(h >= 0 && h < p.H)) return null;
    if (!(p.pins[h] & S.pl)) return null;
    for (let i = 0; i < S.e.length; i++) if (S.e[i] === h) return null;
    let N;
    if (into) { N = into; N.e.set(S.e); N.ov.set(S.ov); N.tw.set(S.tw); N.pl = S.pl; N.alive = S.alive; }
    else N = { e: S.e.slice(), ov: S.ov.slice(), tw: S.tw.slice(), pl: S.pl, alive: S.alive };
    const h0 = N.e[2 * r + end], F = N.e[2 * r + 1 - end];
    N.e[2 * r + end] = h;
    const bit = 1 << r;
    const lifted = fast ? null : [], wrapped = fast ? null : [], unwound = fast ? null : [];
    for (let j = 0; j < p.K; j++) {
      if (j === r || !(N.alive >> j & 1)) continue;
      const jb = 1 << j, b0 = N.e[2 * j], b1 = N.e[2 * j + 1];
      const path = p.cr(h0, h, b0, b1), c1 = p.cr(F, h, b0, b1);
      const aOver = N.ov[r] & jb, bOver = N.ov[j] & bit, tw = (N.tw[r] & jb) || (N.tw[j] & bit);
      N.ov[r] &= ~jb; N.ov[j] &= ~bit;
      if (tw) {
        if (path) {                                   // il capo ripassa sopra B: si srotola
          N.tw[r] &= ~jb; N.tw[j] &= ~bit; if (!fast) unwound.push(j);
          if (c1) N.ov[j] |= bit;
        }
      } else if (bOver) {
        if (path) { N.tw[r] |= jb; if (!fast) wrapped.push(j); } // passa sopra chi la copriva: ci si avvolge
        else if (c1) N.ov[j] |= bit;
      } else if (c1) {
        N.ov[r] |= jb;
        if (!aOver && !fast) lifted.push(j);
      }
    }
    const pre = fast ? null : { e: N.e.slice(), ov: N.ov.slice(), tw: N.tw.slice(), pl: N.pl, alive: N.alive };
    const fx = settle(L, N);
    return { S: N, pre, gone: fx.gone, fell: fx.fell, lifted, wrapped, unwound };
  }

  /* ---------- euristica: minimo numero di corde da spostare (vedi intestazione) ----------
   * Programmazione dinamica sui sottoinsiemi delle corde presenti: ok[U] = le corde di U, mai spostate, possono sparire
   * tutte (si "sbucciano" una alla volta: ognuna senza corde di U sopra e senza attorcigliamenti dentro U).
   * Le corde che si sbucciano subito non bloccano mai il "nocciolo" rimasto, quindi basta il nocciolo:
   * h = |nocciolo| − |U| massimo con ok[U], U ⊆ nocciolo. Esatta per il rilassamento. */
  const OKBUF = {}, TWBUF = {}, HMEMO = new Map();
  function heuristic(K, S, cin) {
    const A = S.alive;
    if (!A) return 0;
    const tws = TWBUF[K] || (TWBUF[K] = new Int32Array(K));
    twSym(S, tws);
    cin.fill(0);
    for (let j = 0; j < K; j++) if (A >> j & 1) { let m = S.ov[j]; while (m) { const i = 31 - Math.clz32(m & -m); cin[i] |= 1 << j; m &= m - 1; } }
    // blocco[i] = corde che impediscono a i di sparire per prima
    for (let i = 0; i < K; i++) cin[i] |= tws[i];
    // prima si sbucciano le corde libere (non cambia il risultato): resta il "nocciolo" bloccato
    let C = A;
    for (;;) {
      let out = 0, m = C;
      while (m) { const lb = m & -m, i = 31 - Math.clz32(lb); if (!(cin[i] & C)) out |= lb; m ^= lb; }
      if (!out) break;
      C &= ~out;
    }
    if (!C) return 0;
    // memo sul nocciolo (stessi blocchi → stesso risultato)
    let key = String.fromCharCode(C + 1), m0 = C;
    while (m0) { const lb = m0 & -m0, i = 31 - Math.clz32(lb); key += String.fromCharCode((cin[i] & C) + 1); m0 ^= lb; }
    const memo = HMEMO.get(key);
    if (memo !== undefined) return memo;
    if (HMEMO.size > 50000) HMEMO.clear();
    const ok = OKBUF[K] || (OKBUF[K] = new Uint8Array(1 << K));
    let best = 0;
    ok[0] = 1;
    // sottoinsiemi del nocciolo in ordine crescente (ogni U viene dopo i suoi sottoinsiemi)
    for (let U = (0 - C) & C; U; U = (U - C) & C) {
      let v = 0, m = U;
      while (m) {
        const lb = m & -m, i = 31 - Math.clz32(lb);
        if (!(cin[i] & U) && ok[U ^ lb]) { v = 1; break; }
        m ^= lb;
      }
      ok[U] = v;
      if (v) { const c = pop(U); if (c > best) best = c; }
    }
    HMEMO.set(key, pop(C) - best);
    return pop(C) - best;
  }

  /* ---------- A* ----------
   * solve(L, st?, { nodeLimit }) → { min, path:[[r,end,h]…], nodes, aborted, unsolvable } */
  function solve(L, st, opts = {}) {
    const p = prep(L), K = p.K;
    const nodeLimit = opts.nodeLimit || 20000;
    const S0 = packState(L, st || initial(L));
    const cin = new Int32Array(K);
    const best = new Map(), hc = new Map();
    const tmp = { e: new Int8Array(2 * K), ov: new Int32Array(K), tw: new Int32Array(K), pl: 0, alive: 0 };
    const buckets = [];
    // code a due livelli: f crescente e, a parità di f, g più alto prima (si va in profondità verso la soluzione)
    const push = (node, f) => { const b = buckets[f] || (buckets[f] = []); (b[node.g] || (b[node.g] = [])).push(node); };
    const popF = (f) => {
      const b = buckets[f];
      if (!b) return null;
      for (let g = b.length - 1; g >= 0; g--) if (b[g] && b[g].length) return b[g].pop();
      return null;
    };
    const k0 = keyOf(S0);
    best.set(k0, 0);
    push({ S: S0, g: 0, par: null, mv: null, k: k0 }, heuristic(K, S0, cin));
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
      const free = freeMask(L, n.S);
      for (let r = 0; r < K; r++) {
        if (!(n.S.alive >> r & 1)) continue;
        for (let end = 0; end < 2; end++) {
          for (const h of free) {
            applyMove(L, n.S, r, end, h, true, tmp);
            const k = keyOf(tmp), g = n.g + 1;
            const old = best.get(k);
            if (old !== undefined && old <= g) continue;
            best.set(k, g);
            const S2 = { e: tmp.e.slice(), ov: tmp.ov.slice(), tw: tmp.tw.slice(), pl: tmp.pl, alive: tmp.alive };
            let hv = hc.get(k);
            if (hv === undefined) { hv = heuristic(K, S2, cin); hc.set(k, hv); }
            push({ S: S2, g, par: n, mv: [r, end, h], k }, g + hv);
          }
        }
      }
    }
  }

  /* ---------- stati pubblici (JSON) ---------- */
  function initial(L) {
    return {
      ends: L.ropes.map((x) => x.slice()),
      over: L.over.map((x) => x.slice()),
      twists: L.twists.map((x) => x.slice()),
      plates: L.plates.map(() => true),
    };
  }
  // mossa sullo stato pubblico: null se illegale, altrimenti
  // { state, pre (stato subito dopo la mossa, prima delle sparizioni), gone, fell, lifted, wrapped, unwound }
  function move(L, st, r, end, h) {
    const m = applyMove(L, packState(L, st), r, end, h);
    if (!m) return null;
    return { state: unpackState(L, m.S), pre: unpackState(L, m.pre), gone: m.gone, fell: m.fell, lifted: m.lifted, wrapped: m.wrapped, unwound: m.unwound };
  }
  const freeHoles = (L, st) => freeMask(L, packState(L, st));
  function legalMoves(L, st) {
    const free = freeHoles(L, st), out = [];
    st.ends.forEach((x, r) => { if (x) for (let end = 0; end < 2; end++) for (const h of free) out.push([r, end, h]); });
    return out;
  }
  const isSolved = (st) => st.ends.every((x) => !x);
  const ropesLeft = (st) => st.ends.filter(Boolean).length;
  // chi copre r (corde presenti) e con chi è attorcigliata
  function coverers(st, r) { return st.over.filter(([i, j]) => j === r && st.ends[i]).map(([i]) => i); }
  function twinsOf(st, r) { return st.twists.filter(([i, j]) => i === r || j === r).map(([i, j]) => (i === r ? j : i)); }

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
    // ogni lastra riceve almeno 2 fori
    const holes = [];
    const has = (x, y) => holes.some((h) => h[0] === x && h[1] === y);
    plates.forEach((p) => {
      const mine = pts.filter(([x, y]) => inRect(p, x, y) && !has(x, y));
      for (let i = 0; i < 2 && i < mine.length; i++) holes.push(mine[i]);
    });
    for (const q of pts) { if (holes.length >= nH) break; if (!has(q[0], q[1])) holes.push(q); }
    holes.sort((u, v) => u[1] - v[1] || u[0] - v[0]);
    // estremità: 2K fori a caso, accoppiati preferendo corde lunghe e che incrociano già le altre (qualche tentativo)
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

  // strati casuali + attorcigliamenti + riparazione: nessuna corda deve sparire all'inizio.
  // Le coppie attorcigliate (avvolte) si scelgono tra quelle che si incrociano e non hanno strato.
  function dress(c, base, rnd) {
    const { holes, ropes } = base, K = ropes.length;
    const X = [];
    for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) if (crosses(holes, ropes[i][0], ropes[i][1], ropes[j][0], ropes[j][1])) X.push([i, j]);
    const deg = new Array(K).fill(0);
    X.forEach(([i, j]) => { deg[i]++; deg[j]++; });
    if (deg.some((d) => !d)) return null;
    const tw = new Array(K).fill(-1);
    const twists = [];
    // candidati: coppie che si incrociano e (se c.loose) anche coppie separate, avvolte da un'ansa
    const cand = X.slice();
    if (c.loose) for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) if (!X.some(([a, b]) => a === i && b === j) && rnd() < c.loose) cand.push([i, j]);
    shuffle(cand, rnd).forEach(([i, j]) => {
      if (twists.length < c.T && tw[i] < 0 && tw[j] < 0) { tw[i] = j; tw[j] = i; twists.push(rnd() < 0.5 ? [i, j] : [j, i]); }
    });
    if (twists.length < c.T) return null;
    const L = X.filter(([i, j]) => tw[i] !== j);          // coppie con uno strato (le attorcigliate non ne hanno)
    const top = {};                                       // top[i*16+j] (i<j) = chi sta sopra
    L.forEach(([i, j]) => { top[i * 16 + j] = rnd() < 0.5 ? i : j; });
    const isCovered = (r) => L.some(([i, j]) => (i === r || j === r) && top[i * 16 + j] !== r);
    for (let it = 0; it < 6 * K; it++) {
      const bad = [];
      for (let r = 0; r < K; r++) if (tw[r] < 0 && !isCovered(r)) bad.push(r);
      if (!bad.length) {
        const over = L.map(([i, j]) => (top[i * 16 + j] === i ? [i, j] : [j, i]));
        return { over, twists };
      }
      const r = bad[ri(rnd, bad.length)];
      const opts = L.filter(([i, j]) => i === r || j === r);
      if (!opts.length) return null;
      const [i, j] = opts[ri(rnd, opts.length)];
      top[i * 16 + j] = i === r ? j : i;
    }
    return null;
  }

  /* ricerca locale sugli strati: si girano coppie a caso finché l'euristica iniziale (minimo garantito) arriva a "target",
   * accettando solo stati stabili (nessuna corda sparirebbe) e mai peggiori. Modifica L.over. Ritorna h0. */
  function deepen(L, target, rnd, iters = 60) {
    const K = L.ropes.length, cin = new Int32Array(K);
    const h = () => heuristic(K, packState(L, initial(L)), cin);
    let cur = h();
    for (let it = 0; it < iters && cur < target && L.over.length; it++) {
      const q = ri(rnd, L.over.length), [i, j] = L.over[q];
      L.over[q] = [j, i];
      const ok = stableStart(L) ? h() : -1;
      if (ok >= cur) cur = ok; else L.over[q] = [i, j];
    }
    return cur;
  }

  function stableStart(L) {
    const S = packState(L, initial(L));
    const fx = settle(L, S);
    return !fx.gone.length && !fx.fell.length;
  }

  // quota delle prime mosse che abbassano l'euristica (stima rapida di quante mosse iniziali sono "giuste")
  function goodFirst(L, h0) {
    const K = L.ropes.length, cin = new Int32Array(K), S = packState(L, initial(L)), free = freeMask(L, S);
    let good = 0, tot = 0;
    for (let r = 0; r < K; r++) for (let end = 0; end < 2; end++) for (const h of free) {
      tot++;
      if (heuristic(K, applyMove(L, S, r, end, h).S, cin) === h0 - 1) good++;
    }
    return tot ? good / tot : 1;
  }

  /* giocata "ingenua": a ogni passo la mossa che fa sparire più corde (a parità, quella che lascia l'euristica più bassa).
   * Ritorna il numero di mosse con cui risolve, o -1 se non ci riesce entro maxMoves. */
  function naive(L, maxMoves) {
    const K = L.ropes.length, cin = new Int32Array(K);
    let S = packState(L, initial(L));
    for (let m = 1; m <= maxMoves; m++) {
      let best = null, bs = -1e9;
      const free = freeMask(L, S);
      for (let r = 0; r < K; r++) {
        if (!(S.alive >> r & 1)) continue;
        for (let end = 0; end < 2; end++) for (const h of free) {
          const x = applyMove(L, S, r, end, h);
          const sc = 100 * x.gone.length - heuristic(K, x.S, cin);
          if (sc > bs) { bs = sc; best = x; }
        }
      }
      if (!best) return -1;
      S = best.S;
      if (!S.alive) return m;
    }
    return -1;
  }

  /* generate(level | cfg, rnd) → livello JSON:
   * { rule, cols, rows, holes:[[x,y]…], plates:[[x0,y0,x1,y1]…], ropes:[[a,b]…], over:[[i,j]…], twists:[[a,b]…],
   *   min, solution, nodes, opt } */
  function generate(arg, rnd = Math.random) {
    const c = typeof arg === 'number' ? config(arg) : Object.assign(config(1), arg);
    const nodeLimit = c.nodeLimit || 500, pick = c.pick || 1;
    let best = null, found = 0, fallback = null, fbScore = 1e9;
    const t0 = Date.now();
    for (let t = 0; t < 600 && found < pick; t++) {
      const el = Date.now() - t0;
      if ((found && el > 30) || (fallback && el > 150)) break;   // tetti di tempo: basta un candidato valido (o il migliore trovato)
      const base = layout(c, rnd);
      if (!base) continue;
      const d = dress(c, base, rnd);
      if (!d) continue;
      const L = { rule: RULE, cols: c.cols, rows: c.rows, holes: base.holes, plates: base.plates, ropes: base.ropes, over: d.over, twists: d.twists };
      if (!stableStart(L)) continue;
      const h0 = deepen(L, c.lo, rnd);
      // l'euristica è un minimo garantito; le trappole di avvolgimento aggiungono di rado più di 1 mossa
      if (h0 < 1 || h0 > c.hi || (h0 < c.lo - 1 && (found || fallback))) continue;
      const r = solve(L, null, { nodeLimit });
      if (r.aborted || r.unsolvable) continue;
      const inBand = r.min >= c.lo && r.min <= c.hi;
      // scarta i livelli che una giocata ingenua risolve nel minimo (tranne il primissimo)
      const nv = inBand && c.lo > 2 ? naive(L, r.min) : -1;
      const opt = goodFirst(L, h0);
      const out = Object.assign(L, { min: r.min, solution: r.path, nodes: r.nodes, opt: Math.round(opt * 100) / 100 });
      if (inBand && nv < 0) {
        found++;
        // tra i candidati validi: più mosse minime, poi meno prime mosse giuste
        if (!best || out.min > best.min || (out.min === best.min && opt < best.opt)) best = out;
        continue;
      }
      const sc = Math.max(0, c.lo - r.min) + Math.max(0, r.min - c.hi) + (nv > 0 ? 0.5 : 0);
      if (sc < fbScore) { fbScore = sc; fallback = out; }
    }
    return best || fallback || FALLBACK();
  }

  // livello di riserva (verificato nei test): A avvolta attorno a B (senza incrociarla), C sotto A
  function FALLBACK() {
    const L = {
      rule: RULE, cols: 5, rows: 5, holes: [[0, 2], [4, 2], [1, 0], [3, 0], [3, 4], [4, 4], [2, 0], [0, 0], [2, 1], [4, 0]],
      plates: [[0, 0, 4, 4]], ropes: [[0, 1], [3, 2], [6, 4]], over: [], twists: [[1, 0]],
    };
    // C = (2,0)-(3,4) sta sotto B e sotto A (che tocca in (2,0))
    const p = prep(L);
    L.over = [];
    for (let j = 0; j < 2; j++) if (p.cr(6, 4, L.ropes[j][0], L.ropes[j][1])) L.over.push([j, 2]);
    const r = solve(L, null, { nodeLimit: 20000 });
    return Object.assign(L, { min: r.min, solution: r.path, nodes: r.nodes });
  }

  /* ---------- salvataggi ---------- */
  function validLevel(L) {
    if (!L || L.rule !== RULE || !Number.isInteger(L.cols) || !Number.isInteger(L.rows) || L.cols < 2 || L.rows < 2 || L.cols > 8 || L.rows > 9) return false;
    if (!Array.isArray(L.holes) || !Array.isArray(L.plates) || !Array.isArray(L.ropes) || !Array.isArray(L.over) || !Array.isArray(L.twists)) return false;
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
    return L.over.every(pair) && L.twists.every(pair) && Number.isInteger(L.min) && L.min >= 0;
  }
  // stato salvato coerente: estremità in fori distinti e presenti, strati solo tra corde che si incrociano
  function validState(L, st) {
    if (!st || !Array.isArray(st.ends) || st.ends.length !== L.ropes.length || !Array.isArray(st.over) || !Array.isArray(st.twists)) return false;
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
    const okPair = (x) => Array.isArray(x) && x.length === 2 && alive(x[0]) && alive(x[1]) && x[0] !== x[1];
    if (!st.over.every((x) => okPair(x) && cross(x[0], x[1])) || !st.twists.every(okPair)) return false;
    // ogni coppia che si incrocia ha esattamente uno strato oppure è attorcigliata (mai entrambe le cose)
    const same = (x, i, j) => (x[0] === i && x[1] === j) || (x[0] === j && x[1] === i);
    for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) {
      if (!st.ends[i] || !st.ends[j]) continue;
      const o = st.over.filter((x) => same(x, i, j)).length, t = st.twists.filter((x) => same(x, i, j)).length;
      if (t > 1 || o > 1 || (t && o) || (cross(i, j) && !t && !o)) return false;
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
    initial, move, freeHoles, legalMoves, isSolved, ropesLeft, coverers, twinsOf,
    platesFor, layout, dress, deepen, stableStart, goodFirst, naive, generate, FALLBACK, validLevel, validState, rate, progress,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
