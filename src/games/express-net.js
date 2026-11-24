/* Hari Express — reti (logica pura): strade e binari sulla griglia, ponti, passaggi a livello, costi di costruzione,
 * percorso proposto quando si trascina per costruire, percorsi A* dei mezzi.
 *
 * Ogni casella ha una maschera di collegamenti per i binari (W.rail) e una per le strade (W.road): bit 1<<d con
 * d = 0 nord (y−1), 1 est (x+1), 2 sud (y+1), 3 ovest (x−1). I collegamenti sono sempre reciproci. Una casella con
 * 3 o 4 bit è uno scambio (automatico: il mezzo sceglie l'uscita col suo percorso). Le curve sono di 90° dentro la
 * casella (entra da un lato, esce da un lato adiacente).
 *
 * HH.expressNet
 *   COST                               costi di costruzione (ghiande)
 *   plan(W, kind, a, b)                → { ok, tiles, cost, err } percorso proposto da a a b (A* sui costi)
 *   cost(W, kind, tiles)               costo vero di quel percorso (solo i pezzi nuovi)
 *   apply(W, kind, tiles)              mette i collegamenti (dopo il controllo di plan)
 *   route(W, kind, starts, target)     A* dei mezzi: starts = [{ t, a, g, k }] (casella in cui si entra, lato
 *                                      d'ingresso, costo di partenza, etichetta) → { k, tiles, exits } o null
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const opp = (d) => (d + 2) & 3;
  const AXIS = [5, 10];                       // N-S, E-W
  const straight = (m) => m === 5 || m === 10;
  const bits = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

  const COST = {
    road: 25, rail: 60, slope: { road: 20, rail: 40 }, bridge: { road: 160, rail: 260 }, tree: 10, hill: 5,
    stop: 220, station: 360, signal: 80, oneway: 30, demolish: 8,
  };

  /* ---------- coda a priorità (heap binario di indici con chiave) ---------- */
  function heap() {
    const k = [], v = [];
    return {
      get size() { return v.length; },
      push(key, val) {
        k.push(key); v.push(val);
        let i = v.length - 1;
        while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; }
      },
      pop() {
        const top = v[0], lk = k.pop(), lv = v.pop();
        if (v.length) {
          k[0] = lk; v[0] = lv;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < v.length && k[l] < k[m]) m = l;
            if (r < v.length && k[r] < k[m]) m = r;
            if (m === i) break;
            [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m;
          }
        }
        return top;
      },
    };
  }

  /* ---------- costruzione ---------- */
  const other = (kind) => (kind === 'rail' ? 'road' : 'rail');
  // la casella i accetta un pezzo di `kind` lungo la direzione d (entrando o uscendo)? Regole fisse della casella
  function fixedAxis(W, kind, i) {
    // stazioni, segnali, sensi unici e passaggi a livello sono dritti: si attraversano solo lungo il loro asse
    if (W.st[i]) return W.sk[i] === (kind === 'rail' ? 1 : 2) ? W.sax[i] : -2;   // -2 = vietata (stazione dell'altro tipo)
    if (kind === 'rail' && (W.sig[i] || W.ow[i])) return W.rail[i] === 5 ? 0 : 1;
    const o = W[other(kind)][i];
    if (o) { if (!straight(o)) return -2; return o === 5 ? 1 : 0; }      // passaggio a livello: perpendicolare all'altra rete
    return -1;
  }
  const axisOf = (d) => (d & 1);              // 0 N-S, 1 E-W
  function landOk(W, i) { return !W.use[i]; }
  // A* della costruzione: stati (casella, direzione di arrivo 0..3, 4 = partenza)
  function plan(W, kind, a, b) {
    if (a === b) return { ok: false, tiles: [a], cost: 0, err: 'short' };
    const n = W.n, w = W.w;
    for (const e of [a, b]) {
      if (W.water[e]) return { ok: false, tiles: [], cost: 0, err: 'water' };
      if (!landOk(W, e)) return { ok: false, tiles: [], cost: 0, err: 'blocked' };
      if (fixedAxis(W, kind, e) === -2) return { ok: false, tiles: [], cost: 0, err: 'blocked' };
    }
    const g = new Float64Array(n * 5).fill(Infinity), from = new Int32Array(n * 5).fill(-1);
    const bx = b % w, by = (b / w) | 0;
    const hq = heap();
    const S = a * 5 + 4;
    g[S] = 0; hq.push(0, S);
    const base = COST[kind];
    let goal = -1;
    while (hq.size) {
      const s = hq.pop(), i = (s / 5) | 0, din = s % 5;
      if (i === b) { goal = s; break; }
      const gi = g[s];
      const x = i % w, y = (i / w) | 0;
      const fa = fixedAxis(W, kind, i);
      for (let d = 0; d < 4; d++) {
        if (din < 4 && d === opp(din)) continue;
        if (fa >= 0 && axisOf(d) !== fa) continue;
        // caselle a asse fisso (stazioni, segnali, passaggi a livello) si attraversano dritte
        if (fa >= 0 && din < 4 && d !== din) continue;
        let nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= W.h) continue;
        let j = ny * w + nx, add = 0, span = 0;
        if (W.water[j]) {
          // ponte dritto: fino a 3 caselle d'acqua, dalla terra bassa alla terra bassa
          if (W.water[i]) continue;
          while (W.water[j] && span < 4) { span++; nx += DX[d]; ny += DY[d]; if (nx < 0 || ny < 0 || nx >= w || ny >= W.h) { span = 9; break; } j = ny * w + nx; }
          if (span > 3 || W.water[j] || W.ht[j] !== W.ht[i]) continue;
          // un ponte già fatto si riusa gratis
          let built = true;
          for (let k = 1; k <= span; k++) { const q = i + (DX[d] + DY[d] * w) * k; if (!(W[kind][q] & (1 << d))) built = false; }
          add += built ? 0.1 * span : (COST.bridge[kind] + 0) * span;
        }
        if (!landOk(W, j)) continue;
        const fj = fixedAxis(W, kind, j);
        if (fj === -2 || (fj >= 0 && axisOf(d) !== fj)) continue;
        if (Math.abs(W.ht[j] - W.ht[span ? i : i]) > 1) continue;
        const have = !span && (W[kind][i] & (1 << d));
        if (have) add += 0.1;
        else if (!span) {
          add += base;
          if (W.ht[j] !== W.ht[i]) add += COST.slope[kind];
          if (W.tree[j] === 1) add += COST.tree;
          if (W.ht[j] > 0) add += COST.hill;
        } else {
          add += base * 2;
        }
        if (din < 4 && d !== din) add += base * 0.25;      // meglio dritto: meno curve
        const ns = j * 5 + d, ng = gi + add;
        if (ng < g[ns]) {
          g[ns] = ng; from[ns] = s;
          const h = (Math.abs((j % w) - bx) + Math.abs(((j / w) | 0) - by)) * 0.1;
          hq.push(ng + h, ns);
        }
      }
    }
    if (goal < 0) return { ok: false, tiles: [], cost: 0, err: 'noroute' };
    // ricostruzione (i ponti saltano: si rimettono le caselle d'acqua in mezzo)
    const rev = [];
    for (let s = goal; s >= 0; s = from[s]) rev.push((s / 5) | 0);
    rev.reverse();
    const tiles = [rev[0]];
    for (let k = 1; k < rev.length; k++) {
      const p = rev[k - 1], q = rev[k], px = p % w, py = (p / w) | 0, qx = q % w, qy = (q / w) | 0;
      const st = Math.abs(qx - px) + Math.abs(qy - py), sx = Math.sign(qx - px), sy = Math.sign(qy - py);
      for (let m = 1; m < st; m++) tiles.push((py + sy * m) * w + px + sx * m);
      tiles.push(q);
    }
    return { ok: true, tiles, cost: cost(W, kind, tiles), err: null };
  }
  const dirTo = (W, p, q) => { const d = q - p; return d === -W.w ? 0 : d === 1 ? 1 : d === W.w ? 2 : d === -1 ? 3 : -1; };
  // costo vero: solo i collegamenti nuovi; pendenze, alberi, colline e ponti come in plan
  function cost(W, kind, tiles) {
    let c = 0;
    for (let k = 1; k < tiles.length; k++) {
      const p = tiles[k - 1], q = tiles[k], d = dirTo(W, p, q);
      if (d < 0 || (W[kind][p] & (1 << d))) continue;
      if (W.water[q]) { c += COST.bridge[kind]; continue; }
      if (W.water[p]) { c += COST[kind]; continue; }
      c += COST[kind];
      if (W.ht[q] !== W.ht[p]) c += COST.slope[kind];
      if (W.tree[q] === 1) c += COST.tree;
      if (W.ht[q] > 0) c += COST.hill;
    }
    return Math.round(c);
  }
  // controllo di un percorso arbitrario (quello che arriva dalla UI o dal bot): caselle adiacenti e regole di plan
  function valid(W, kind, tiles) {
    if (!tiles || tiles.length < 2) return false;
    let bh = -1, run = 0;
    for (let k = 0; k < tiles.length; k++) {
      const q = tiles[k];
      if (!(q >= 0 && q < W.n) || W.use[q]) return false;
      if (W.water[q] && (k === 0 || k === tiles.length - 1)) return false;
      if (fixedAxis(W, kind, q) === -2) return false;
      if (k === 0) continue;
      const p = tiles[k - 1], d = dirTo(W, p, q);
      if (d < 0) return false;
      run = W.water[q] ? run + 1 : 0;
      if (run > 3) return false;
      if (!W.water[p] && !W.water[q] && Math.abs(W.ht[p] - W.ht[q]) > 1) return false;
      for (const e of [p, q]) { const fa = fixedAxis(W, kind, e); if (fa >= 0 && axisOf(d) !== fa) return false; }
      // ponti: dritti, fino a 3 caselle d'acqua, tra due rive alla stessa altezza
      if (W.water[q] && !W.water[p]) bh = W.ht[p];
      if (W.water[p] && !W.water[q] && W.ht[q] !== bh) return false;
      if (k >= 2 && W.water[p] && dirTo(W, tiles[k - 2], p) !== d) return false;
    }
    return true;
  }
  function apply(W, kind, tiles) {
    const M = W[kind];
    for (let k = 1; k < tiles.length; k++) {
      const p = tiles[k - 1], q = tiles[k], d = dirTo(W, p, q);
      M[p] |= 1 << d; M[q] |= 1 << opp(d);
      if (W.tree[p] === 1 || W.tree[p] === 2) W.tree[p] = 0;
      if (W.tree[q] === 1 || W.tree[q] === 2) W.tree[q] = 0;
    }
  }

  /* ---------- percorsi dei mezzi (A*) ----------
   * Stato = (casella, lato d'ingresso). Uscite: i bit della maschera tranne il lato d'ingresso (niente retromarcia);
   * le strade a fondo cieco permettono l'inversione; i binari a senso unico solo la direzione indicata.
   * Arrivo: una casella della stazione di destinazione; poi si prosegue dritti lungo la banchina fino in fondo. */
  function exitsOf(W, kind, t, a) {
    const m = W[kind][t];
    let ex = m & ~(a >= 0 ? 1 << a : 0);
    if (kind === 'road' && a >= 0 && m === 1 << a) ex = m;                 // fondo cieco: si gira
    if (kind === 'rail' && W.ow[t]) ex &= 1 << (W.ow[t] - 1);
    if (W.st[t]) ex &= AXIS[W.sax[t]];                                     // dentro la stazione si va dritti
    return ex;
  }
  function stopEnd(W, kind, t, a, target) {
    // dalla prima casella della stazione si va avanti finché la banchina continua
    const tiles = [t], exits = [];
    let cur = t, d = a >= 0 ? opp(a) : -1;
    if (d < 0) { const ax = AXIS[W.sax[t]]; d = ax === 5 ? 2 : 1; }
    for (let k = 0; k < 8; k++) {
      const nx = (cur % W.w) + DX[d], ny = ((cur / W.w) | 0) + DY[d];
      const nj = ny * W.w + nx;
      if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h || !(W[kind][cur] & (1 << d)) || W.st[nj] !== target + 1) break;
      exits.push(d); tiles.push(nj); cur = nj;
    }
    exits.push(d);
    return { tiles, exits };
  }
  function route(W, kind, starts, target, tiles0, opt) {
    const n = W.n, w = W.w;
    const tset = tiles0 || [];
    if (!tset.length) return null;
    let gx = 0, gy = 0;
    for (const t of tset) { gx += t % w; gy += (t / w) | 0; }
    gx /= tset.length; gy /= tset.length;
    const g = new Float64Array(n * 4).fill(Infinity), from = new Int32Array(n * 4).fill(-1), lab = new Int16Array(n * 4).fill(-1);
    const hq = heap();
    for (const s of starts) {
      if (s.t < 0 || s.t >= n || !(W[kind][s.t] & (1 << s.a))) continue;
      const id = s.t * 4 + s.a;
      if (s.g < g[id]) { g[id] = s.g; lab[id] = s.k; from[id] = -1; hq.push(s.g, id); }
    }
    let goal = -1, it = 0;
    while (hq.size && it++ < n * 8) {
      const s = hq.pop(), t = s >> 2, a = s & 3;
      if (W.st[t] === target + 1) { goal = s; break; }
      const ex = exitsOf(W, kind, t, a), gi = g[s];
      for (let d = 0; d < 4; d++) {
        if (!(ex & (1 << d))) continue;
        const nx = (t % w) + DX[d], ny = ((t / w) | 0) + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= W.h) continue;
        const j = ny * w + nx;
        if (!(W[kind][j] & (1 << opp(d)))) continue;
        const ns = j * 4 + opp(d);
        const add = 1 + (d !== opp(a) ? 0.2 : 0) + (d === a ? 2 : 0) + (opt && opt.resv[j] && opt.resv[j] !== opt.id ? 6 : 0);
        if (gi + add < g[ns]) {
          g[ns] = gi + add; from[ns] = s; lab[ns] = lab[s];
          hq.push(gi + add + Math.abs(nx - gx) + Math.abs(ny - gy), ns);
        }
      }
    }
    if (goal < 0) return null;
    const chain = [];
    for (let s = goal; s >= 0; s = from[s]) chain.push(s);
    chain.reverse();
    const tiles = [], exits = [];
    for (let k = 0; k < chain.length - 1; k++) {
      const t = chain[k] >> 2, nt = chain[k + 1] >> 2;
      tiles.push(t); exits.push(dirTo(W, t, nt));
    }
    const end = stopEnd(W, kind, goal >> 2, goal & 3, target);
    for (let k = 0; k < end.tiles.length; k++) { tiles.push(end.tiles[k]); exits.push(end.exits[k]); }
    return { k: lab[chain[0]], tiles, exits, len: g[goal] + end.tiles.length - 1 };
  }

  HH.expressNet = { COST, DX, DY, AXIS, opp, straight, bits, plan, cost, valid, apply, route, exitsOf, dirTo, fixedAxis, heap };
})(typeof globalThis !== 'undefined' ? globalThis : window);
