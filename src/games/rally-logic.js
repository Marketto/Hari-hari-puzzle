/* Hari Rally — logica pura (nessun DOM, nessun THREE), macchina a stati deterministica e serializzabile.
 *
 * Gara di rally in prima persona nel bosco: tappa punto-punto generata da seme (rettilinei e curve con raccordi a
 * clotoide), Hari contro 3 animaletti (coniglietta, volpe, panda) con le loro macchinine. L'acceleratore è
 * AUTOMATICO: il giocatore sterza e frena. Obiettivo: arrivare tra i primi 3 (fragoline: 1° = 3, 2° = 2, 3° = 1).
 * Niente danni né vite: fuori strada si rallenta molto (erba e cespugli), contro il bosco "boing" morbido che rimette
 * in strada, i contatti tra auto sono spintarelle.
 *
 * Coordinate: metri. Pista campionata ogni metro: x, y (piano, y "a nord"), th (direzione), k (curvatura, >0 = sinistra).
 * Le auto vivono in coordinate di Frenet: s (metri lungo la pista), d (scostamento laterale, >0 = a sinistra),
 * psi (angolo rispetto alla pista, >0 = punta a sinistra), v (m/s). Sterzo in ingresso: steer -1..1 (>0 = destra).
 * La geometria (pista, note del navigatore, profilo di velocità, dossi, ponti, rocce) si ricava da seme + livello
 * con geo(s) ed è in cache fuori dallo stato; lo stato è JSON puro (anche il generatore casuale: s.rs, mulberry32).
 * Il tempo avanza a passi fissi di 1/60 s.
 *
 * API:
 *   config(level)              parametri del livello (curva di difficoltà, monotona)
 *   newLevel(level, rnd)       stato iniziale (griglia di partenza, conto alla rovescia)
 *   step(s, dt, input) → ev    tempo reale; input = { steer, brake } oppure null (= niente sterzo, niente freno)
 *   tick(s, input) → ev · geo(s) · track(seed, level) · notes(g) · upcoming(s, n) · world(g, s, d) · height(g, x, y)
 *   nearest(g, x, y) · ranking(s) · isWon · isLost · isOver · rate · progress · par
 * Eventi: count{n} · go · call{i} (nota del navigatore da leggere) · off · on · boing{x} · rock · bump{who} · jump{v}
 *         pass{who, up} · finish{pos} · win · lose
 * Esporta HH.rally.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const TICK = 1 / 60;
  const READY = 3.2;            // conto alla rovescia 3, 2, 1, via
  const HALF = 4.5;             // metà larghezza della strada sterrata
  const SHOULDER = 0.5;         // oltre HALF + SHOULDER si è fuori strada (erba)
  const WALL = 8;               // bosco: bordo morbido oltre il quale si rimbalza
  const RAIL = HALF + 0.3;      // ringhiere dei ponti
  const KMAX = 1 / 8.5;         // curvatura massima dello sterzo a fondo corsa
  const GRIP = 9.5;             // accelerazione laterale massima (m/s²) sullo sterrato asciutto
  const ACC = 6.8;              // spinta del motore (m/s² da fermi)
  const BRAKE = 13;             // frenata (m/s²)
  const OFFCAP = 0.42;          // fuori strada: velocità massima = OFFCAP × vmax
  const CALL = 110;             // il navigatore legge la nota quando mancano CALL metri
  const RUNOFF = 90;            // strada dopo il traguardo
  const PREROLL = 30;           // strada prima della linea di partenza (griglia)
  const CAR_L = 4.0, CAR_W = 1.9;
  const WHO = ['hari', 'bunny', 'fox', 'panda'];
  // gravità delle note (rally: 6 = quasi piena, 1 = la più stretta): raggio minimo della curva in metri
  const BANDS = [[1, 0, 24], [2, 24, 40], [3, 40, 62], [4, 62, 95], [5, 95, 140], [6, 140, 1e9]];
  const STAGES = ['spring', 'autumn', 'snow', 'dusk'];

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  function rngNext(s) {
    let a = (s.rs = (s.rs + 0x6d2b79f5) >>> 0);
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  }
  const gradeOf = (R) => { for (const [g, lo, hi] of BANDS) if (R >= lo && R < hi) return g; return 6; };

  /* ---------- curva di difficoltà ---------- */
  function config(level) {
    const L = Math.max(1, level | 0);
    const tier = L <= 2 ? 0 : L <= 4 ? 1 : L <= 7 ? 2 : L <= 10 ? 3 : 4;
    const stage = STAGES[Math.floor((L - 1) / 2) % 4];
    const up = Math.min(1, (L - 1) / 14);                     // 0 al livello 1 → 1 dal 15
    return {
      level: L, tier, stage,
      len: Math.round(Math.min(4300, 1300 + 270 * (L - 1))),   // metri dalla partenza al traguardo
      minGrade: [3, 2, 1, 1, 1][tier],                          // curva più stretta possibile
      tight: [0, 0.08, 0.16, 0.22, 0.28][tier],                 // quota di curve gravità 1–2
      curvy: [0.62, 0.66, 0.7, 0.74, 0.78][tier],               // probabilità che il pezzo dopo un rettilineo sia una curva
      straight: [[40, 125], [36, 120], [30, 110], [25, 100], [20, 90]][tier],
      vmax: +(22.5 + 7 * up).toFixed(2),                        // m/s (81 → 106 km/h)
      grip: stage === 'snow' ? 0.88 : 1,                        // neve: un po' più scivoloso
      ai: [0.58, 0.66, 0.73].map((b, i) => +Math.min([0.84, 0.91, 0.97][i], b + 0.026 * (L - 1)).toFixed(3)),
      aiErr: +Math.max(0.35, 1.3 - 0.07 * (L - 1)).toFixed(3), // errori degli avversari per km
      assist: +Math.max(0.12, 0.7 - 0.06 * (L - 1)).toFixed(3), // aiuto allo sterzo (riallinea dolcemente)
      hills: +Math.min(7, 2 + 0.45 * (L - 1)).toFixed(2),       // ampiezza delle colline (solo grafica)
      crests: +(0.45 + 0.12 * tier).toFixed(2),                 // dossi per km
      bridges: +(0.35 + 0.05 * tier).toFixed(2),                // ponticelli per km
      rocks: [0.25, 0.35, 0.45, 0.5, 0.55][tier],               // curve con la roccia all'interno ("non tagliare")
      fog: [0, 0, 0.15, 0.3, 0.45][tier],                       // nebbia in più (grafica)
    };
  }

  /* ---------- pista ---------- */
  // pezzi: rettilineo { len } · curva { R, dir, ang, lt } (raccordi lineari di curvatura lunghi lt ai due capi)
  function pieceK(p, u) {
    if (!p.R) return 0;
    const k = p.dir / p.R, arc = p.total - 2 * p.lt;
    if (u < p.lt) return k * (u / p.lt);
    if (u > p.lt + arc) return k * Math.max(0, (p.total - u) / p.lt);
    return k;
  }
  function makeCurve(c, r, dir) {
    let g;
    const t = r();
    if (c.minGrade <= 2 && t < c.tight) g = c.minGrade === 1 && r() < 0.45 ? 1 : 2;
    else g = Math.max(c.minGrade, 3) + Math.floor(r() * (7 - Math.max(c.minGrade, 3)));
    g = Math.max(c.minGrade, Math.min(6, g));
    const [, lo, hi0] = BANDS[g - 1], hi = Math.min(hi0, 230), lo2 = Math.max(lo, 15);
    const R = Math.round(lo2 + (hi - lo2) * (0.12 + 0.76 * r()));
    const A = [[2.1, 3.1], [0.95, 2.1], [0.7, 1.75], [0.55, 1.45], [0.42, 1.15], [0.26, 0.75]][g - 1];
    const ang = A[0] + (A[1] - A[0]) * r();
    let lt = clamp(R * 0.35, 8, 28);
    let arcLen = ang * R - lt;              // l'angolo totale = k × (arco + lt)
    if (arcLen < 4) { lt = Math.max(4, (ang * R) / 2); arcLen = ang * R - lt; }
    return { R, dir, ang, lt, total: Math.round(arcLen + 2 * lt), g };
  }

  function track(seed, level) {
    const c = config(level);
    const L = c.len, N = PREROLL + L + RUNOFF;   // campioni (1 m)
    for (let attempt = 0; attempt < 40; attempt++) {
      const r = HH.rng((seed + attempt * 7919) >>> 0);
      const x = new Float64Array(N + 1), y = new Float64Array(N + 1), th = new Float64Array(N + 1), k = new Float64Array(N + 1);
      const cell = 24, grid = new Map(), key = (X, Y) => Math.floor(X / cell) * 73856093 ^ Math.floor(Y / cell) * 19349663;
      const pieces = [];
      let i = 0, fails = 0, lastDir = r() < 0.5 ? 1 : -1, ok = true;
      const addGrid = (j) => { if (j % 2) return; const kk = key(x[j], y[j]); let b = grid.get(kk); if (!b) grid.set(kk, (b = [])); b.push(j); };
      const clear = (from, to) => {
        // ogni punto nuovo deve stare lontano (≥ 32 m) dai tratti di pista di almeno 160 m prima
        for (let j = from; j <= to; j++) {
          const X = x[j], Y = y[j], cx = Math.floor(X / cell), cy = Math.floor(Y / cell);
          for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
            const bk = grid.get((cx + a) * 73856093 ^ (cy + b) * 19349663);
            if (!bk) continue;
            for (const q of bk) if (j - q > 160 && (X - x[q]) ** 2 + (Y - y[q]) ** 2 < 32 * 32) return false;
          }
        }
        return true;
      };
      const lay = (p) => {
        // stende un pezzo dal campione i; false se si avvicina troppo alla pista già fatta
        const n = Math.min(p.total, N - i);
        for (let u = 0; u < n; u++) {
          const kk = pieceK(p, u + 0.5);
          k[i + u + 1] = pieceK(p, u + 1);
          th[i + u + 1] = th[i + u] + kk;
          const tm = th[i + u] + kk / 2;
          x[i + u + 1] = x[i + u] + Math.cos(tm);
          y[i + u + 1] = y[i + u] + Math.sin(tm);
        }
        if (!clear(i + 1, i + n)) return false;
        for (let j = i + 1; j <= i + n; j++) addGrid(j);
        pieces.push(Object.assign({ at: i }, p));
        i += n;
        return true;
      };
      th[0] = Math.PI / 2; addGrid(0);
      lay({ total: PREROLL + 70 + Math.round(r() * 40) });
      let wasCurve = false;
      while (i < N) {
        if (i > PREROLL + L - 40) { lay({ total: N - i }); break; }
        let p;
        if (wasCurve && r() > c.curvy * 0.55) p = { total: Math.round(c.straight[0] + (c.straight[1] - c.straight[0]) * r()) };
        else if (!wasCurve && r() > c.curvy) p = { total: Math.round(c.straight[0] * 0.6 + (c.straight[1] - c.straight[0]) * 0.5 * r()) };
        else {
          // verso: alterna spesso; se la pista si è girata molto rispetto al nord, tende a tornare indietro
          let dir = r() < 0.7 ? -lastDir : lastDir;
          const head = th[i] - Math.PI / 2;
          if (Math.abs(head) > 1.2 && r() < 0.85) dir = head > 0 ? -1 : 1;
          p = makeCurve(c, r, dir);
          if (wasCurve && p.g <= 2 && r() < 0.6) pieces.length && lay({ total: 20 + Math.round(r() * 20) });
          if (i >= N) break;
        }
        const i0 = i;
        if (lay(p)) { if (p.R) { lastDir = p.dir; wasCurve = true; } else wasCurve = false; fails = 0; continue; }
        i = i0;
        if (p.R) { p = Object.assign({}, p, { dir: -p.dir }); if (lay(p)) { lastDir = p.dir; wasCurve = true; fails = 0; continue; } i = i0; }
        if (++fails > 14) { ok = false; break; }
        // riprova con un pezzo corto e una curva che riporta verso nord
        const head = th[i] - Math.PI / 2;
        const q = makeCurve(Object.assign({}, c, { minGrade: Math.max(c.minGrade, 3), tight: 0 }), r, head > 0 ? -1 : 1);
        if (lay(q)) { lastDir = q.dir; wasCurve = true; } else i = i0;
      }
      if (!ok || i < N) continue;
      return finishTrack(seed, level, c, { x, y, th, k, N, L, pieces }, r);
    }
    throw new Error('rally: pista non generata');
  }

  // dossi, ponti, rocce all'interno delle curve, profilo di velocità degli avversari, griglia spaziale, note
  function finishTrack(seed, level, c, g, r) {
    const { k, N, L } = g;
    const S0 = PREROLL, S1 = PREROLL + L;
    g.seed = seed; g.level = level; g.c = c; g.S0 = S0; g.S1 = S1;
    // tratti dritti (|k| piccolo per almeno 60 m): candidati per dossi e ponti
    const flat = [];
    let a = -1;
    for (let i = S0 + 60; i <= S1 - 40; i++) {
      const f = Math.abs(k[i]) < 1 / 400;
      if (f && a < 0) a = i;
      if ((!f || i === S1 - 40) && a >= 0) { if (i - a >= 60) flat.push([a, i]); a = -1; }
    }
    g.crests = []; g.bridges = []; g.rocks = [];
    const used = [];
    const free = (s0, s1) => used.every(([u0, u1]) => s1 < u0 - 30 || s0 > u1 + 30);
    const want = (n) => Math.floor(n) + (r() < n % 1 ? 1 : 0);
    let nb = want((c.bridges * L) / 1000);
    for (const [f0, f1] of flat.slice().sort(() => r() - 0.5)) {
      if (nb <= 0) break;
      const m = Math.round((f0 + f1) / 2), s0 = m - 9, s1 = m + 9;
      if (!free(s0, s1)) continue;
      g.bridges.push({ s0, s1 }); used.push([s0, s1]); nb--;
    }
    let nc = want((c.crests * L) / 1000);
    for (const [f0, f1] of flat.slice().sort(() => r() - 0.5)) {
      if (nc <= 0) break;
      const m = Math.round(f0 + 20 + (f1 - f0 - 40) * r());
      if (!free(m - 10, m + 10)) continue;
      g.crests.push({ s: m, h: +(1.3 + r() * 0.9).toFixed(2), w: 9 }); used.push([m - 10, m + 10]); nc--;
    }
    g.bridges.sort((p, q) => p.s0 - q.s0); g.crests.sort((p, q) => p.s - q.s);
    for (const cr of g.crests) { const i = cr.s; cr.x = +g.x[i].toFixed(2); cr.y = +g.y[i].toFixed(2); }
    // profilo di velocità di riferimento (avversari): v = √(aderenza × R) col raggio peggiore nei ±6 m, poi frenate
    const prof = new Float64Array(N + 1), vm = c.vmax, Ga = GRIP * c.grip;
    for (let i = 0; i <= N; i++) {
      let km = 0;
      for (let j = Math.max(0, i - 6); j <= Math.min(N, i + 6); j++) km = Math.max(km, Math.abs(k[j]));
      prof[i] = Math.min(vm, Math.sqrt(Ga / Math.max(km, 1e-6)));
    }
    for (let i = N - 1; i >= 0; i--) prof[i] = Math.min(prof[i], Math.sqrt(prof[i + 1] * prof[i + 1] + 2 * 8));
    g.prof = prof;
    // griglia spaziale (un campione ogni 2 m) per la distanza dalla pista
    g.cell = 16; g.grid = new Map();
    for (let i = 0; i <= N; i += 2) { const kk = gk(g, g.x[i], g.y[i]); let b = g.grid.get(kk); if (!b) g.grid.set(kk, (b = [])); b.push(i); }
    // note del navigatore, dedotte dalla curvatura vera della pista
    g.notes = deriveNotes(g);
    // rocce all'interno di alcune curve medie (2–4): nota "non tagliare"
    for (const n of g.notes) {
      if (n.kind !== 'curve' || n.g < 2 || n.g > 4 || n.at < S0 + 40 || r() > c.rocks) continue;
      const apex = n.apex;
      g.rocks.push({ s: apex, d: n.dir * (HALF + 1.1), r: 1.1 });
      n.nocut = true;
    }
    // ampiezza e fasi delle colline (solo grafica)
    g.hill = { A: c.hills, p: [r() * 6.28, r() * 6.28, r() * 6.28] };
    return g;
  }
  const gk = (g, X, Y) => Math.floor(X / g.cell) * 73856093 ^ Math.floor(Y / g.cell) * 19349663;

  function deriveNotes(g) {
    const { k, S0, S1 } = g;
    const ON = 1 / 300;
    const runs = [];
    let a = -1, sg = 0;
    for (let i = S0 - 10; i <= S1 + 20; i++) {
      const v = k[i], si = Math.abs(v) > ON ? Math.sign(v) : 0;
      if (si !== sg) {
        if (sg && a >= 0) runs.push({ a, b: i - 1, dir: sg });
        a = si ? i : -1; sg = si;
      }
    }
    if (sg && a >= 0) runs.push({ a, b: S1 + 20, dir: sg });
    // unisce tratti dello stesso verso separati da pochi metri
    const m = [];
    for (const rn of runs) {
      const p = m[m.length - 1];
      if (p && p.dir === rn.dir && rn.a - p.b <= 8) p.b = rn.b; else m.push(Object.assign({}, rn));
    }
    const out = [];
    for (const rn of m) {
      let km = 0, apex = rn.a, ang = 0;
      for (let i = rn.a; i <= rn.b; i++) { const q = Math.abs(k[i]); ang += k[i]; if (q > km) { km = q; apex = i; } }
      const R = 1 / km, grade = gradeOf(R), A = Math.abs(ang);
      if (grade === 6 && A < 0.17) continue;           // ondulazione appena accennata: niente nota
      out.push({ kind: 'curve', at: rn.a, end: rn.b, dir: rn.dir, g: grade, R: Math.round(R), ang: +(A * 180 / Math.PI).toFixed(0), apex,
        long: A > 1.75 && grade >= 2, hairpin: grade === 1 && A > 2.0 });
    }
    // attenzione: curva stretta dopo un tratto veloce, o subito dopo un dosso; "e subito" se la nota dopo è vicina
    for (let j = 0; j < out.length; j++) {
      const n = out[j], prev = out[j - 1], next = out[j + 1];
      const runUp = n.at - (prev ? prev.end : S0);
      n.caution = n.g <= 2 && (runUp > 110 || (prev && prev.g >= 5 && runUp > 40)) ||
        (n.g <= 3 && g.crests.some((c) => c.s < n.at && n.at - c.s < 60));
      n.into = !!(next && next.at - n.end < 18);
    }
    for (const c of g.crests) out.push({ kind: 'crest', at: c.s - 6, end: c.s + 6, s: c.s });
    for (const b of g.bridges) out.push({ kind: 'bridge', at: b.s0, end: b.s1 });
    out.sort((p, q) => p.at - q.at);
    out.forEach((n, i) => { n.i = i; n.call = n.at - CALL; });
    return out;
  }

  const cache = new Map();
  function geo(s) {
    const kk = `${s.seed}|${s.level}`;
    let g = cache.get(kk);
    if (!g) {
      g = track(s.seed, s.level);
      cache.set(kk, g);
      if (cache.size > 4) cache.delete(cache.keys().next().value);
    }
    return g;
  }
  const notes = (g) => g.notes;

  // punto del mondo per (s, d): x, y, th della pista e normale verso sinistra
  function world(g, s, d = 0) {
    const N = g.N, f = clamp(s, 0, N - 1e-6), i = Math.floor(f), u = f - i;
    const x = lerp(g.x[i], g.x[i + 1], u), y = lerp(g.y[i], g.y[i + 1], u), th = lerp(g.th[i], g.th[i + 1], u);
    const nx = -Math.sin(th), ny = Math.cos(th);
    return { x: x + nx * d, y: y + ny * d, th, k: lerp(g.k[i], g.k[i + 1], u) };
  }
  const kAt = (g, s) => { const f = clamp(s, 0, g.N - 1e-6), i = Math.floor(f); return lerp(g.k[i], g.k[i + 1], f - i); };
  // campione più vicino a un punto del piano (per la grafica: alberi lontani dalla strada)
  function nearest(g, X, Y) {
    const cx = Math.floor(X / g.cell), cy = Math.floor(Y / g.cell);
    let best = 1e18, bi = -1;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const bk = g.grid.get((cx + a) * 73856093 ^ (cy + b) * 19349663);
      if (!bk) continue;
      for (const q of bk) { const dd = (X - g.x[q]) ** 2 + (Y - g.y[q]) ** 2; if (dd < best) { best = dd; bi = q; } }
    }
    return { dist: Math.sqrt(best), i: bi };
  }
  // altezza del terreno (solo grafica): colline dolci + dossi
  function height(g, X, Y) {
    const H = g.hill, p = H.p;
    let h = H.A * (0.55 * Math.sin(X / 97 + p[0]) * Math.sin(Y / 131 + p[1]) + 0.45 * Math.sin((X + Y) / 173 + p[2]));
    for (const c of g.crests) {
      const dd = (X - c.x) ** 2 + (Y - c.y) ** 2;
      if (dd < 900) h += c.h * Math.exp(-dd / (2 * c.w * c.w));
    }
    return h;
  }

  /* ---------- stato ---------- */
  function newLevel(level, rnd = Math.random) {
    const seed = Math.floor(rnd() * 2147483647) >>> 0;
    const c = config(level);
    const s = {
      v: 1, level: c.level, seed, L: c.len, t: 0, ready: READY, acc: 0, rs: (seed ^ 0x9e3779b9) >>> 0,
      cars: [], rank: [], fin: -1, pos: 4, res: null, won: false, moves: 0, called: 0, cd: 4,
      offT: 0, boingT: 0, bumpT: 0, inp: null, wait: false,
    };
    // griglia: due file da due; Hari parte ultimo a destra
    const grid = [[PREROLL - 2, 1.8], [PREROLL - 2, -1.8], [PREROLL - 9, 1.8], [PREROLL - 9, -1.8]];
    const order = [1, 2, 3, 0];
    order.forEach((id, j) => {
      s.cars.push({ id, s: grid[j][0], d: grid[j][1], psi: 0, v: 0, air: 0, airT: 0, off: false, kc: 0, slide: 0, fin: -1,
        skill: id ? c.ai[id - 1] : 1, lane: grid[j][1], err: 0, errK: 0, errD: 0, bump: 0, wall: 0 });
    });
    s.cars.sort((a, b) => a.id - b.id);
    s.rank = ranking(s).map((x) => x.id);
    geo(s);
    return s;
  }
  const me = (s) => s.cars[0];

  // classifica: chi ha finito (per tempo), poi chi è più avanti
  function ranking(s) {
    return s.cars.slice().sort((a, b) => {
      if (a.fin >= 0 || b.fin >= 0) { if (a.fin < 0) return 1; if (b.fin < 0) return -1; return a.fin - b.fin; }
      return b.s - a.s || a.id - b.id;
    });
  }
  const placeOf = (s) => ranking(s).findIndex((c) => c.id === 0) + 1;

  function cleanInput(inp) {
    if (!inp) return { steer: 0, brake: 0 };
    return { steer: clamp(+inp.steer || 0, -1, 1), brake: inp.brake ? 1 : 0 };
  }

  /* ---------- fisica di Hari ---------- */
  function drivePlayer(s, g, c, car, inp, ev) {
    const dt = TICK, vmax = c.vmax;
    const done = car.fin >= 0;
    const steer = done ? 0 : inp.steer, brake = done ? (car.v > 6 ? 1 : 0) : inp.brake;
    const kt = kAt(g, car.s);
    const off = Math.abs(car.d) > HALF + SHOULDER;
    // motore automatico / freno
    if (brake) car.v = Math.max(0, car.v - BRAKE * dt);
    else if (!done || car.v < 6) car.v += ACC * Math.max(0, 1 - car.v / vmax) * dt;
    if (off && car.v > vmax * OFFCAP) car.v = Math.max(vmax * OFFCAP, car.v - 11 * dt);
    // sterzo: curvatura richiesta (+ aiutino che riallinea alla pista quando non si sterza forte)
    let kReq = -steer * KMAX;
    const w = c.assist * (1 - Math.min(1, Math.abs(steer)) * 0.7);
    if (w > 0 && car.v > 1) kReq += w * (kt + (clamp(-0.1 * car.d, -0.35, 0.35) - car.psi) * 1.4 / Math.max(8, car.v));
    kReq = clamp(kReq, -KMAX * 1.15, KMAX * 1.15);
    const grip = GRIP * c.grip * (off ? 0.75 : 1);
    const kLim = grip / Math.max(1, car.v * car.v);
    let kc = car.air > 0 ? 0 : clamp(kReq, -kLim, kLim);
    // sottosterzo: si scivola verso l'esterno e si perde velocità
    car.slide = car.air > 0 ? 0 : Math.max(0, Math.abs(kReq) - kLim) * car.v * car.v;
    if (car.slide > 0) car.v = Math.max(0, car.v - Math.min(6, car.slide * 0.3) * dt);
    car.kc = kc;
    frenet(car, kt, kc, dt);
    // non si gira mai al contrario: oltre 1 rad si raddrizza e rallenta
    if (Math.abs(car.psi) > 1) { car.psi = Math.sign(car.psi) * 1; car.v = Math.max(0, car.v - 4 * dt); }
    // dossi: troppo veloci si salta un pochino (niente sterzo in aria)
    if (car.air > 0) car.air = Math.max(0, car.air - dt);
    for (const cr of g.crests) {
      if (car.s - car.v * dt * Math.cos(car.psi) < cr.s && car.s >= cr.s && car.v > 16.5 && car.air <= 0) {
        car.air = car.airT = +Math.min(0.6, 0.15 + (car.v - 16.5) * 0.06).toFixed(3);
        ev.push({ type: 'jump', v: car.v });
      }
    }
    // bordi morbidi
    const br = g.bridges.find((b) => car.s > b.s0 - 1 && car.s < b.s1 + 1);
    const lim = br ? RAIL : WALL;
    if (car.wall > 0) car.wall -= dt;
    if (Math.abs(car.d) > lim) {
      const sg = Math.sign(car.d);
      car.d = sg * lim;
      if (sg * car.psi > 0) car.psi = -car.psi * 0.35;
      if (car.wall <= 0) { car.v *= br ? 0.85 : 0.72; car.wall = 0.5; ev.push({ type: 'boing', who: 0, side: sg, bridge: !!br }); }
    }
    // rocce all'interno delle curve
    for (const rk of g.rocks) {
      if (Math.abs(car.s - rk.s) > 4) continue;
      const dd = Math.hypot(car.s - rk.s, car.d - rk.d);
      if (dd < rk.r + 1) {
        const sg = Math.sign(car.d - rk.d) || -Math.sign(rk.d);
        car.d = rk.d + sg * (rk.r + 1);
        car.psi *= 0.4;
        if (car.wall <= 0) { car.v *= 0.6; car.wall = 0.6; ev.push({ type: 'rock', who: 0 }); }
      }
    }
    const nowOff = Math.abs(car.d) > HALF + SHOULDER;
    if (nowOff !== car.off) { car.off = nowOff; ev.push({ type: nowOff ? 'off' : 'on' }); }
    if (nowOff) s.offT += dt;
  }
  // un passo in coordinate di Frenet
  function frenet(car, kt, kc, dt) {
    const den = Math.max(0.3, 1 - kt * car.d);
    const sd = (car.v * Math.cos(car.psi)) / den;
    car.s += sd * dt;
    car.d += car.v * Math.sin(car.psi) * dt;
    car.psi += (kc * car.v - kt * sd) * dt;
  }

  /* ---------- avversari ---------- */
  function driveAI(s, g, c, car, ev) {
    const dt = TICK, done = car.fin >= 0;
    const i = clamp(Math.round(car.s), 0, g.N);
    let vt = g.prof[i] * car.skill;
    // errori umani (poco frequenti): curva larga o alzata del piede
    if (car.err > 0) {
      car.err -= dt;
      vt *= car.errK === 1 ? 0.62 : 0.72;
    } else if (!done && car.s > PREROLL + 120 && rngNext(s) < (c.aiErr * car.v * dt) / 1000 * (1.15 - car.skill) * 3) {
      car.errK = rngNext(s) < 0.55 ? 1 : 2; car.err = car.errK === 1 ? 2.4 : 1.8;
      car.errD = Math.sign(kAt(g, car.s + 25)) || (rngNext(s) < 0.5 ? 1 : -1);
    }
    if (done) vt = Math.min(vt, 7);
    // motore e freni come Hari (un po' più dolci in frenata)
    if (car.v < vt) car.v += ACC * Math.max(0, 1 - car.v / (c.vmax * 1.02)) * dt;
    else car.v = Math.max(vt, car.v - 9 * dt);
    if (Math.abs(car.d) > HALF + SHOULDER && car.v > c.vmax * OFFCAP) car.v = Math.max(c.vmax * OFFCAP, car.v - 11 * dt);
    // traiettoria: all'interno delle curve in arrivo, ognuno con la sua corsia preferita
    const ka = kAt(g, car.s + 12);
    let tgt = clamp(ka * 160, -1, 1) * 2.3 + car.lane * 0.35;
    if (car.err > 0 && car.errK === 1) tgt = -car.errD * (HALF + 2.2);        // largo, fin sull'erba
    // sorpasso: se c'è qualcuno più lento davanti nella stessa corsia, si sposta di lato
    for (const o of s.cars) {
      if (o === car) continue;
      const ds = o.s - car.s;
      if (ds > 0 && ds < 14 && Math.abs(o.d - car.d) < 2.4 && o.v < car.v + 0.5) {
        tgt = o.d > 0 ? Math.min(tgt, o.d - 2.6) : Math.max(tgt, o.d + 2.6);
        tgt = clamp(tgt, -HALF + 0.9, HALF - 0.9);
      }
    }
    const lat = clamp(tgt - car.d, -2.4 * dt * Math.min(1, car.v / 8), 2.4 * dt * Math.min(1, car.v / 8));
    const kt = kAt(g, car.s);
    const den = Math.max(0.3, 1 - kt * car.d);
    car.s += (car.v / den) * dt;
    car.d = clamp(car.d + lat, -WALL, WALL);
    car.psi = Math.atan2(lat / dt, Math.max(1, car.v));
    car.kc = kt;
    car.off = Math.abs(car.d) > HALF + SHOULDER;
  }

  /* ---------- contatti morbidi ---------- */
  function contacts(s, ev) {
    const cs = s.cars;
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
      const A = cs[a], B = cs[b], ds = B.s - A.s, dd = B.d - A.d;
      if (Math.abs(ds) >= CAR_L || Math.abs(dd) >= CAR_W) continue;
      // spinta laterale (chi è di lato si allarga), chi tampona rallenta
      const ov = (CAR_W - Math.abs(dd)) / 2, sg = dd ? Math.sign(dd) : b > a ? 1 : -1;
      if (Math.abs(ds) < CAR_L * 0.7) { A.d -= sg * ov * 0.6; B.d += sg * ov * 0.6; }
      const back = ds > 0 ? A : B, front = ds > 0 ? B : A;
      if (back.v > front.v) { const m = (back.v + front.v) / 2; back.v = m - 0.3; front.v = Math.min(m + 0.3, front.v + 1.2); }
      back.s = Math.min(back.s, front.s - CAR_L * 0.98 + (Math.abs(ds) < CAR_L * 0.5 && Math.abs(dd) > CAR_W * 0.5 ? CAR_L : 0));
      if ((A.id === 0 || B.id === 0) && s.bumpT <= 0) { s.bumpT = 0.6; ev.push({ type: 'bump', who: A.id === 0 ? B.id : A.id }); }
    }
  }

  /* ---------- passo fisso ---------- */
  function tick(s, input) {
    const ev = [];
    const g = geo(s), c = config(s.level), inp = cleanInput(input === undefined ? s.inp : input);
    s.t += TICK;
    if (s.bumpT > 0) s.bumpT -= TICK;
    const p = me(s);
    drivePlayer(s, g, c, p, inp, ev);
    for (const car of s.cars) if (car.id) driveAI(s, g, c, car, ev);
    contacts(s, ev);
    // traguardo
    const fin = PREROLL + s.L;
    for (const car of s.cars) {
      if (car.fin < 0 && car.s >= fin) {
        const over = (car.s - fin) / Math.max(1, car.v);
        car.fin = +(s.t - over - PREROLL * 0).toFixed(3);
      }
      if (car.s > fin + RUNOFF - 10) { car.s = fin + RUNOFF - 10; car.v = 0; }
    }
    // note del navigatore
    while (s.called < g.notes.length && p.s >= g.notes[s.called].call) { ev.push({ type: 'call', i: s.called }); s.called++; }
    // classifica e sorpassi
    const rk = ranking(s).map((x) => x.id);
    const was = s.rank.indexOf(0), now = rk.indexOf(0);
    if (now !== was && p.fin < 0) {
      if (now < was) { s.moves += was - now; ev.push({ type: 'pass', up: true, who: s.rank[now] }); }
      else ev.push({ type: 'pass', up: false, who: rk[was] });
    }
    s.rank = rk;
    s.pos = now + 1;
    if (p.fin >= 0 && !s.res) {
      s.fin = p.fin;
      s.pos = 1 + s.cars.filter((x) => x.id && x.fin >= 0 && x.fin <= p.fin).length;
      finishAll(s, g, c);
      s.res = ranking(s).map((x) => ({ id: x.id, t: x.fin }));
      s.won = s.pos <= 3;
      ev.push({ type: 'finish', pos: s.pos });
      ev.push({ type: s.won ? 'win' : 'lose' });
    }
    return ev;
  }
  // a gara finita per Hari: gli avversari ancora in corsa arrivano (simulati senza Hari) per la classifica finale
  function finishAll(s, g, c) {
    const fin = PREROLL + s.L, p = me(s);
    const ps = p.s, pv = p.v;
    p.s = fin + RUNOFF; p.d = 0;
    for (let n = 0; n < 60 * 400 && s.cars.some((x) => x.fin < 0); n++) {
      s.t += TICK;
      for (const car of s.cars) {
        if (!car.id || car.fin >= 0) continue;
        driveAI(s, g, c, car, []);
        if (car.s >= fin) car.fin = +(s.t - (car.s - fin) / Math.max(1, car.v)).toFixed(3);
      }
    }
    for (const car of s.cars) if (car.fin < 0) car.fin = +(s.t + 999).toFixed(3);
    s.t = s.fin;
    p.s = ps; p.v = pv;
  }

  /* ---------- tempo reale ---------- */
  function step(s, dt, input) {
    const ev = [];
    if (isOver(s) || !(dt > 0)) return ev;
    if (input !== undefined) s.inp = cleanInput(input);
    if (s.ready > 0) {
      s.ready -= dt;
      const n = Math.ceil(s.ready - 0.2);
      if (n < s.cd && n >= 1 && n <= 3) { s.cd = n; ev.push({ type: 'count', n }); }
      if (s.ready > 0) return ev;
      dt = -s.ready; s.ready = 0; s.cd = 0; ev.push({ type: 'go' });
    }
    s.acc += Math.min(dt, 0.1);
    while (s.acc >= TICK - 1e-9) {
      s.acc -= TICK;
      ev.push(...tick(s));
      if (isOver(s)) break;
    }
    return ev;
  }

  // prossime note (al massimo n) entro la distanza di chiamata, con i metri che mancano
  function upcoming(s, n = 2) {
    const g = geo(s), p = me(s), out = [];
    for (const nt of g.notes) {
      if (nt.end < p.s) continue;
      if (nt.at - p.s > CALL) break;
      out.push(Object.assign({ dist: Math.max(0, nt.at - p.s) }, nt));
      if (out.length >= n) break;
    }
    return out;
  }

  const isOver = (s) => s.fin >= 0;
  const isWon = (s) => !!s.won;
  const isLost = (s) => isOver(s) && !s.won;
  // fragoline per posizione: 1° = 3, 2° = 2, 3° = 1, 4° = 0 (anche in tempo reale, per l'indicatore)
  const rate = (s) => Math.max(0, 4 - (s.pos || 4));
  function progress(s) {
    if (s.won) return 1;
    const p = me(s);
    return clamp((p.s - PREROLL) / s.L, 0, s.fin >= 0 ? 0.99 : 0.98);
  }
  // tempo di riferimento (s): tappa a ~62% della velocità massima
  const par = (s) => Math.round(s.L / (config(s.level).vmax * 0.62));

  HH.rally = {
    TICK, READY, HALF, SHOULDER, WALL, RAIL, KMAX, GRIP, ACC, BRAKE, OFFCAP, CALL, RUNOFF, PREROLL, CAR_L, CAR_W, WHO, BANDS, STAGES,
    config, newLevel, track, geo, notes, deriveNotes, world, nearest, height, kAt, gradeOf, ranking, placeOf, upcoming,
    step, tick, isOver, isWon, isLost, rate, progress, par,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
