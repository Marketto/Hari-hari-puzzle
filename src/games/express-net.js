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
 *   plan(W, kind, a, b)                → { ok, tiles, tn, cost, err } percorso proposto da a a b (A* sui costi;
 *                                      tn = caselle dentro una galleria)
 *   propose(W, kind, a, b, stroke)     la proposta del trascinamento: A* o la linea dritta col ponte o la galleria,
 *                                      con l'altra in .alt, i tratti in .spans e il perché di un salto impossibile in .why
 *   hop(W, kind, i, d)                 il ponte o la galleria che parte da i verso d (regole e lunghezze massime)
 *   cost(W, kind, tiles, tn)           costo vero di quel percorso (solo i pezzi nuovi)
 *   valid(W, kind, tiles, tn)          controllo di un percorso arrivato dalla UI o dal bot
 *   apply(W, kind, tiles, tn)          mette i collegamenti (dopo il controllo di valid)
 *   spanAt(W, t)                       il ponte o la galleria che passa per t (per demolirlo tutto)
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
    road: 25, rail: 60, slope: { road: 20, rail: 40 }, bridge: { road: 160, rail: 260 }, tunnel: { road: 140, rail: 220 }, tree: 10, hill: 5,
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
    if (W.tun && W.tun[i]) return -2;                                     // dentro una galleria: solo col salto (hop)
    // stazioni, segnali, sensi unici e passaggi a livello sono dritti: si attraversano solo lungo il loro asse
    if (W.st[i]) return W.sk[i] === (kind === 'rail' ? 1 : 2) ? W.sax[i] : -2;   // -2 = vietata (stazione dell'altro tipo)
    if (kind === 'rail' && (W.sig[i] || W.ow[i])) return W.rail[i] === 5 ? 0 : 1;
    const o = W[other(kind)][i];
    if (o) { if (!straight(o)) return -2; return o === 5 ? 1 : 0; }      // passaggio a livello: perpendicolare all'altra rete
    return -1;
  }
  const axisOf = (d) => (d & 1);              // 0 N-S, 1 E-W
  function landOk(W, i) { return !W.use[i] && !(W.tun && W.tun[i]); }
  const axOk = (W, kind, i, d) => { const f = fixedAxis(W, kind, i); return f === -1 || (f >= 0 && axisOf(d) === f); };

  /* ---------- ponti e gallerie: salti dritti ----------
   * Ponte: dalla riva, dritto sopra 1..MAX_BRIDGE caselle d'acqua, fino alla riva opposta alla STESSA altezza; costo per
   * casella d'acqua che cresce con la lunghezza (oltre 3 caselle +25% a casella in più).
   * Galleria: da una casella a quota h, dritto dentro la collina (caselle più alte di h, niente acqua), fino alla prima
   * casella di nuovo a quota h, al massimo MAX_TUNNEL caselle dentro; le caselle dentro (W.tun) restano libere sopra
   * (alberi), non hanno semafori né stazioni, e i mezzi lì dentro non si vedono.
   * In entrambi i casi i collegamenti restano maschere casella per casella: gli A* dei mezzi non cambiano. */
  const MAX_BRIDGE = 6, MAX_TUNNEL = 8;
  const bridgeFac = (L) => 1 + 0.25 * Math.max(0, L - 3);
  // salto da i verso d → null (la casella dopo è terra non più alta: niente da saltare) oppure
  // { k: 'b' | 't', mid: [caselle in mezzo], end (casella d'arrivo o -1), built (già fatto), err }
  function hop(W, kind, i, d) {
    const w = W.w;
    let x = i % w, y = (i / w) | 0;
    if (W.water[i] || (W.tun && W.tun[i])) return null;
    const jx = x + DX[d], jy = y + DY[d];
    if (jx < 0 || jy < 0 || jx >= w || jy >= W.h) return null;
    const j = jy * w + jx, k = W.water[j] ? 'b' : W.ht[j] > W.ht[i] ? 't' : null;
    if (!k) return null;
    const max = k === 'b' ? MAX_BRIDGE : MAX_TUNNEL, mid = [], ax = AXIS[axisOf(d)];
    let built = !!(W[kind][i] & (1 << d)), err = null;
    for (;;) {
      x += DX[d]; y += DY[d];
      if (x < 0 || y < 0 || x >= w || y >= W.h) return { k, mid, end: -1, built: false, err: k === 'b' ? 'long_b' : 'portal' };
      const t = y * w + x;
      const inside = k === 'b' ? !!W.water[t] : !W.water[t] && W.ht[t] > W.ht[i];
      if (!inside) {
        if (!err && k === 'b' && W.ht[t] !== W.ht[i]) err = 'bank';
        if (!err && k === 't' && (W.water[t] || W.ht[t] !== W.ht[i])) err = 'portal';
        return { k, mid, end: t, built: built && mid.length > 0, err };
      }
      mid.push(t);
      if (mid.length > max) return { k, mid, end: -1, built: false, err: k === 'b' ? 'long_b' : 'long_t' };
      if (!(W[kind][t] & (1 << opp(d)))) built = false;
      if (k === 't') {
        const mine = W.tun[t] && W[kind][t] === ax;                       // la stessa galleria, già fatta
        if (!mine && (W.tun[t] || W.use[t] || W.st[t] || W.rail[t] || W.road[t])) err = err || 'blocked';
      } else if (W[other(kind)][t] || (W[kind][t] & ~ax)) err = err || 'blocked';   // niente incroci sopra l'acqua
    }
  }
  // costo vero di un salto (per l'A*: già fatto = quasi gratis)
  const hopCost = (kind, h) => (h.built ? 0.1 * h.mid.length : (h.k === 'b' ? COST.bridge[kind] * bridgeFac(h.mid.length) : COST.tunnel[kind]) * h.mid.length + COST[kind]);

  // A* della costruzione: stati (casella, direzione di arrivo 0..3, 4 = partenza); i salti (ponti e gallerie) sono archi.
  // guide = le caselle sotto il dito (traccia del trascinamento, in ordine): se c'è, il percorso segue il dito. Fuori
  // dalla traccia una casella libera costa mezzo pezzo in più e una casella con un pezzo GIÀ FATTO 1,2 pezzi in più: così una
  // linea parallela a una esistente resta parallela (prima l'A* scivolava sulla linea accanto, gratis) e la vecchia linea
  // si riusa solo dove il dito ci passa sopra. Il costo restituito resta quello vero (cost()).
  const OFF_NEW = 0.5, OFF_OLD = 1.2;
  function plan(W, kind, a, b, guide) {
    if (a === b) return { ok: false, tiles: [a], tn: [], cost: 0, err: 'short' };
    const n = W.n, w = W.w;
    for (const e of [a, b]) {
      if (W.water[e]) return { ok: false, tiles: [], tn: [], cost: 0, err: 'water' };
      if (!landOk(W, e)) return { ok: false, tiles: [], tn: [], cost: 0, err: 'blocked' };
      if (fixedAxis(W, kind, e) === -2) return { ok: false, tiles: [], tn: [], cost: 0, err: 'blocked' };
    }
    const g = new Float64Array(n * 5).fill(Infinity), from = new Int32Array(n * 5).fill(-1), via = new Uint8Array(n * 5);
    const bx = b % w, by = (b / w) | 0;
    const hq = heap();
    const S = a * 5 + 4;
    g[S] = 0; hq.push(0, S);
    const base = COST[kind], G = guide && guide.length ? new Set(guide) : null;
    const off = (j) => (!G || G.has(j) ? 0 : base * (W[kind][j] ? OFF_OLD : OFF_NEW));   // fuori traccia; su un pezzo già fatto di più
    let goal = -1;
    const relax = (s, gi, j, d, add, v) => {
      const ns = j * 5 + d, ng = gi + add;
      if (ng < g[ns]) {
        g[ns] = ng; from[ns] = s; via[ns] = v;
        hq.push(ng + (Math.abs((j % w) - bx) + Math.abs(((j / w) | 0) - by)) * 0.1, ns);
      }
    };
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
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= W.h) continue;
        const j = ny * w + nx, turn = din < 4 && d !== din ? base * 0.25 : 0;      // meglio dritto: meno curve
        const h = hop(W, kind, i, d);
        if (h && !h.err && landOk(W, h.end) && axOk(W, kind, h.end, d)) relax(s, gi, h.end, d, hopCost(kind, h) + turn + off(h.end), h.k === 'b' ? 1 : 2);
        if (W.water[j] || !landOk(W, j) || !axOk(W, kind, j, d) || Math.abs(W.ht[j] - W.ht[i]) > 1) continue;
        let add = turn;
        if (W[kind][i] & (1 << d)) add += 0.1 + off(j);
        else {
          add += base + off(j);
          if (W.ht[j] !== W.ht[i]) add += COST.slope[kind];
          if (W.tree[j] === 1) add += COST.tree;
          if (W.ht[j] > 0) add += COST.hill;
        }
        relax(s, gi, j, d, add, 0);
      }
    }
    if (goal < 0) return { ok: false, tiles: [], tn: [], cost: 0, err: 'noroute' };
    // ricostruzione: i salti rimettono le caselle in mezzo (acqua sotto il ponte, collina sopra la galleria)
    const rev = [];
    for (let s = goal; s >= 0; s = from[s]) rev.push(s);
    rev.reverse();
    const tiles = [(rev[0] / 5) | 0], tn = [];
    for (let k = 1; k < rev.length; k++) {
      const p = (rev[k - 1] / 5) | 0, q = (rev[k] / 5) | 0, px = p % w, py = (p / w) | 0, qx = q % w, qy = (q / w) | 0;
      const st = Math.abs(qx - px) + Math.abs(qy - py), sx = Math.sign(qx - px), sy = Math.sign(qy - py);
      for (let m = 1; m < st; m++) { const t = (py + sy * m) * w + px + sx * m; tiles.push(t); if (via[rev[k]] === 2) tn.push(t); }
      tiles.push(q);
    }
    return { ok: true, tiles, tn, cost: cost(W, kind, tiles, tn), err: null };
  }

  /* ---------- trascinamento dritto: ponte o galleria proposti da soli ----------
   * Se il dito va dritto (stessa riga o colonna, al più una casella di scarto alla fine) e sulla linea c'è acqua o una
   * collina da attraversare, si propone la linea dritta col ponte o la galleria. Se il dito finisce sull'acqua il ponte
   * arriva alla riva opposta; se finisce dentro la collina la galleria esce dall'altra parte (ext: per la UI è
   * l'alternativa, la proposta resta salire sulla collina). → null (niente da saltare) o { ok, tiles, tn, ext, err } */
  function straightPlan(W, kind, a, b) {
    const w = W.w, ax = a % w, ay = (a / w) | 0, bx = b % w, by = (b / w) | 0, dx = bx - ax, dy = by - ay;
    let d, n, side = -1;
    if (Math.abs(dx) >= Math.abs(dy)) { if (Math.abs(dy) > 1 || Math.abs(dx) < 2) return null; d = dx > 0 ? 1 : 3; n = Math.abs(dx); if (dy) side = dy > 0 ? 2 : 0; }
    else { if (Math.abs(dx) > 1 || Math.abs(dy) < 2) return null; d = dy > 0 ? 2 : 0; n = Math.abs(dy); if (dx) side = dx > 0 ? 1 : 3; }
    const fail = (err) => ({ ok: false, tiles: [], tn: [], err });
    if (W.water[a] || !landOk(W, a) || fixedAxis(W, kind, a) === -2) return null;
    const step = DX[d] + DY[d] * w, tiles = [a], tn = [];
    let cur = a, m = 0, used = false, ext = false, why = null;
    const normal = (p, q, dd) => !W.water[q] && landOk(W, q) && axOk(W, kind, p, dd) && axOk(W, kind, q, dd) && Math.abs(W.ht[q] - W.ht[p]) <= 1;
    while (m < n) {
      const h = hop(W, kind, cur, d);
      if (h && h.k === 'b') {
        if (h.err) return fail(h.err);
        if (!landOk(W, h.end) || !axOk(W, kind, cur, d) || !axOk(W, kind, h.end, d)) return fail('blocked');
        for (const t of h.mid) tiles.push(t);
        tiles.push(h.end); cur = h.end; m += h.mid.length + 1; used = true;
        if (m > n) ext = true;
        continue;
      }
      if (h && h.k === 't' && !h.err && landOk(W, h.end) && axOk(W, kind, cur, d) && axOk(W, kind, h.end, d)) {
        const into = m + h.mid.length + 1 > n;
        for (const t of h.mid) { tiles.push(t); tn.push(t); }
        tiles.push(h.end); cur = h.end; m += h.mid.length + 1; used = true;
        if (into) ext = true;
        continue;
      }
      if (h && h.k === 't' && h.err) why = why || h.err;
      const q = cur + step;
      if (!normal(cur, q, d)) return fail(why || 'blocked');
      tiles.push(q); cur = q; m++;
    }
    if (!used) return why ? fail(why) : null;
    if (side >= 0 && !ext) {
      const q = cur + DX[side] + DY[side] * w;
      if (!normal(cur, q, side) || fixedAxis(W, kind, cur) >= 0) return fail('blocked');
      tiles.push(q);
    }
    return { ok: true, tiles, tn, ext, err: null };
  }
  const sameTiles = (p, q) => p.length === q.length && p.every((t, i) => t === q[i]);
  // la proposta del trascinamento: A* oppure la linea dritta col ponte o la galleria, più l'altra come alternativa (alt);
  // why = perché il ponte o la galleria dritti non si possono fare (troppo lungo, riva più alta, uscita sbagliata)
  // stroke = caselle sotto il dito (traccia): l'A* la segue; se il giro "libero" (senza traccia) è diverso e costa meno
  // diventa l'alternativa (per esempio riusare la linea accanto).
  function propose(W, kind, a, b, stroke) {
    const sp = straightPlan(W, kind, a, b);
    const guided = stroke && stroke.length > 1;
    const as = plan(W, kind, a, b, guided ? stroke : null);
    const fin = (p) => {
      const sp = spans(W, p.tiles, p.tn);
      // costo di ogni tratto: dalla riva (o dall'imbocco) all'altra, compreso l'arrivo
      for (const x of sp) { const i0 = p.tiles.indexOf(x.tiles[0]); x.cost = cost(W, kind, p.tiles.slice(i0 - 1, i0 + x.tiles.length + 1), p.tn); }
      return Object.assign(p, { cost: cost(W, kind, p.tiles, p.tn), spans: sp });
    };
    if (sp && sp.ok) {
      fin(sp); fin(as);
      if (as.ok && sameTiles(as.tiles, sp.tiles) && as.tn.length === sp.tn.length) return as;
      const tunnelInto = sp.ext && sp.tn.length;
      const main = tunnelInto && as.ok ? as : sp, alt = main === sp ? (as.ok ? as : null) : sp;
      main.alt = alt;
      return main;
    }
    fin(as);
    if (sp && !sp.ok) as.why = sp.err;
    if (guided && as.ok) {
      const free = plan(W, kind, a, b);
      if (free.ok && !sameTiles(free.tiles, as.tiles) && free.cost < as.cost) as.alt = fin(free);
    }
    return as;
  }
  // traccia del dito: le caselle toccate in ordine, coi buchi riempiti a passi di una casella (4 vicini, prima l'asse
  // più lungo, come Bresenham); tornando indietro sul già tracciato la traccia si accorcia.
  function strokeAdd(w, path, t) {
    if (!path.length) { path.push(t); return path; }
    const k = path.indexOf(t);
    if (k >= 0) { path.length = k + 1; return path; }
    let c = path[path.length - 1];
    const tx = t % w, ty = (t / w) | 0;
    for (let g = 0; g < 4 * w && c !== t; g++) {
      const cx = c % w, cy = (c / w) | 0, dx = tx - cx, dy = ty - cy;
      c = Math.abs(dx) >= Math.abs(dy) ? c + Math.sign(dx) : c + Math.sign(dy) * w;
      const j = path.indexOf(c);
      if (j >= 0) path.length = j + 1; else path.push(c);
    }
    return path;
  }
  // tratti di ponte e di galleria in un percorso: [{ k: 'b' | 't', tiles }]
  function spans(W, tiles, tn) {
    const T = new Set(tn || []), out = [];
    let cur = null;
    for (const t of tiles || []) {
      const k = W.water[t] ? 'b' : T.has(t) ? 't' : null;
      if (k && cur && cur.k === k) cur.tiles.push(t);
      else if (k) { cur = { k, tiles: [t] }; out.push(cur); }
      else cur = null;
    }
    return out;
  }
  const dirTo = (W, p, q) => { const d = q - p; return d === -W.w ? 0 : d === 1 ? 1 : d === W.w ? 2 : d === -1 ? 3 : -1; };
  // costo vero: solo i collegamenti nuovi; pendenze, alberi, colline, ponti (che crescono con la lunghezza) e gallerie
  function cost(W, kind, tiles, tn) {
    if (!tiles || tiles.length < 2) return 0;
    const T = new Set(tn || []), run = new Array(tiles.length).fill(0);
    for (let k = 0; k < tiles.length;) {
      if (!W.water[tiles[k]]) { k++; continue; }
      let e = k; while (e < tiles.length && W.water[tiles[e]]) e++;
      for (let m = k; m < e; m++) run[m] = e - k;
      k = e;
    }
    let c = 0;
    for (let k = 1; k < tiles.length; k++) {
      const p = tiles[k - 1], q = tiles[k], d = dirTo(W, p, q);
      if (d < 0 || (W[kind][p] & (1 << d))) continue;
      if (W.water[q]) { c += COST.bridge[kind] * bridgeFac(run[k]); continue; }
      if (T.has(q)) { c += COST.tunnel[kind]; continue; }
      if (W.water[p] || T.has(p)) { c += COST[kind]; continue; }
      c += COST[kind];
      if (W.ht[q] !== W.ht[p]) c += COST.slope[kind];
      if (W.tree[q] === 1) c += COST.tree;
      if (W.ht[q] > 0) c += COST.hill;
    }
    return Math.round(c);
  }
  // controllo di un percorso arbitrario (quello che arriva dalla UI o dal bot): caselle adiacenti e regole di plan;
  // ponti e gallerie si rifanno col salto (hop), quindi valgono le stesse regole dell'anteprima
  function valid(W, kind, tiles, tn) {
    if (!tiles || tiles.length < 2) return false;
    const T = new Set(tn || []);
    let seen = 0;
    for (let k = 0; k < tiles.length; k++) if (!(tiles[k] >= 0 && tiles[k] < W.n)) return false;
    const p0 = tiles[0], pl = tiles[tiles.length - 1];
    for (const e of [p0, pl]) if (W.water[e] || T.has(e) || !landOk(W, e) || fixedAxis(W, kind, e) === -2) return false;
    for (let k = 0; k < tiles.length - 1;) {
      const p = tiles[k], q = tiles[k + 1], d = dirTo(W, p, q);
      if (d < 0) return false;
      if (W.water[q] || T.has(q)) {
        const h = hop(W, kind, p, d);
        if (!h || h.err || h.k !== (W.water[q] ? 'b' : 't')) return false;
        const L = h.mid.length;
        if (tiles[k + L + 1] !== h.end || !landOk(W, h.end) || !axOk(W, kind, p, d) || !axOk(W, kind, h.end, d)) return false;
        for (let m = 0; m < L; m++) { const t = tiles[k + 1 + m]; if (t !== h.mid[m] || T.has(t) !== (h.k === 't')) return false; }
        if (h.k === 't') seen += L;
        k += L + 1;
        continue;
      }
      if (!landOk(W, q) || !axOk(W, kind, p, d) || !axOk(W, kind, q, d) || Math.abs(W.ht[p] - W.ht[q]) > 1) return false;
      k++;
    }
    return seen === T.size;
  }
  function apply(W, kind, tiles, tn) {
    const M = W[kind], T = new Set(tn || []);
    for (const t of T) W.tun[t] = 1;
    for (let k = 1; k < tiles.length; k++) {
      const p = tiles[k - 1], q = tiles[k], d = dirTo(W, p, q);
      M[p] |= 1 << d; M[q] |= 1 << opp(d);
      // gli alberi sopra una galleria restano
      for (const t of [p, q]) if (!T.has(t) && (W.tree[t] === 1 || W.tree[t] === 2)) W.tree[t] = 0;
    }
  }
  // il ponte o la galleria che passa per la casella t (acqua o galleria con un collegamento): caselle e rive
  // → { kind, tiles, ends: [[casella, lato verso il salto]] } o null
  function spanAt(W, t) {
    if (!(t >= 0 && t < W.n) || !(W.water[t] || W.tun[t])) return null;
    const kind = W.rail[t] ? 'rail' : W.road[t] ? 'road' : null;
    if (!kind) return null;
    const m = W[kind][t], ds = m & 5 ? [0, 2] : [1, 3], isT = !!W.tun[t];
    const tiles = [t], ends = [];
    for (const d of ds) {
      let x = t % W.w, y = (t / W.w) | 0, cur = t;
      for (;;) {
        if (!(W[kind][cur] & (1 << d))) break;
        x += DX[d]; y += DY[d];
        if (x < 0 || y < 0 || x >= W.w || y >= W.h) break;
        const j = y * W.w + x;
        if (isT ? W.tun[j] : W.water[j]) { tiles.push(j); cur = j; continue; }
        ends.push([j, opp(d)]);
        break;
      }
    }
    return { kind, tiles, ends, tunnel: isT };
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
        let add = 1 + (d !== opp(a) ? 0.2 : 0) + (d === a ? 2 : 0) + (opt && opt.resv[j] && opt.resv[j] !== opt.id ? 6 : 0);
        // arrivo su una banchina della meta: conta anche il resto della banchina (dove il treno si fermerà), così con
        // più binari si sceglie quello libero e non quello dove un altro treno sta già caricando
        if (opt && W.st[j] === target + 1) for (const x of stopEnd(W, kind, j, opp(d), target).tiles) if (x !== j && opt.resv[x] && opt.resv[x] !== opt.id) add += 6;
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

  HH.expressNet = { COST, MAX_BRIDGE, MAX_TUNNEL, DX, DY, AXIS, opp, straight, bits, plan, straightPlan, propose, strokeAdd, spans, spanAt, hop, cost, valid, apply, route, exitsOf, dirTo, fixedAxis, heap };
})(typeof globalThis !== 'undefined' ? globalThis : window);
