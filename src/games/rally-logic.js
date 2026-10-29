/* Hari Rally — logica pura (nessun DOM, nessun THREE), macchina a stati deterministica e serializzabile.
 *
 * Gara di kart-rally: tappa punto-punto generata da seme (rettilinei, curve con raccordi a clotoide, chicane, tornanti,
 * curve paraboliche), Hari contro 3 animaletti (coniglietta, volpe, panda) su kart a forma di frutto. Ambientazioni a
 * rotazione (bosco, città, mare, neve) con giorno, tramonto e notte. Acceleratore e freno/retromarcia manuali
 * (l'acceleratore automatico è un'opzione: input.gas assente = automatico). Obiettivo: arrivare tra i primi 3
 * (fragoline: 1° = 3, 2° = 2, 3° = 1). Niente danni né armi: fuori strada (erba, marciapiede, sabbia, neve alta) si
 * rallenta molto, alberi, rocce, transenne e ringhiere fermano o fanno girare, chi esce troppo viene riportato in pista
 * da una nuvoletta; i contatti sono spintarelle, i power-up sono scherzi buffi che rallentano un attimo.
 *
 * Coordinate: metri. Pista campionata ogni metro: x, y (piano, y "a nord"), th (direzione), k (curvatura, >0 = sinistra).
 * Le auto vivono in coordinate di Frenet: s (metri lungo la pista), d (scostamento laterale, >0 = a sinistra),
 * psi (angolo del muso rispetto alla pista, >0 = punta a sinistra), bet (angolo di deriva: il muso punta bet più in là
 * di dove va l'auto; derapata), v (m/s lungo la direzione di marcia, < 0 in retromarcia), pd (spinta laterale ricevuta).
 * Sterzo in ingresso: steer -1..1 (>0 = destra). La geometria (pista, note, traiettoria ideale, profilo di velocità,
 * dossi, ponti, gallerie, curve paraboliche, ostacoli, scatole e ghiande, bordi per lato) si ricava da seme + livello con
 * geo(s) ed è in cache fuori dallo stato; lo stato è JSON puro (anche il generatore casuale: s.rs, mulberry32).
 * Passi fissi 1/60 s, ciascuno con SUB sotto-passi di movimento e collisioni.
 *
 * Collisioni NEL PIANO DEL MONDO (non in (s, d), dove un metro lungo s vale (1 − k·d) metri veri e i rettangoli in
 * curva si deformano): ogni auto è un rettangolo orientato CAR_L × CAR_W (le stesse misure del kart disegnato) con
 * centro world(s, d) e direzione th + psi, la stessa posa che usa la grafica (pose()). Auto–auto: SAT nel mondo,
 * separazione completa lungo l'asse di minima compenetrazione, risolta in modo iterativo (fino a 10 giri per
 * sotto-passo, rimettendo dentro ai muri chi è stato spinto), impulso con poco rimbalzo e attrito; gli spostamenti e le
 * velocità tornano in (s, d) con la base locale della pista. Muri (transenne, staccionate sul mare, ringhiere, pareti
 * delle gallerie) e ostacoli (alberi, rocce, cumuli, vasi: cerchi nel mondo) come prima, mai teletrasporti (tranne la
 * nuvoletta che riporta in pista, che è un evento esplicito).
 *
 * API:
 *   config(level)              parametri del livello (curva di difficoltà, monotona) e ambientazione
 *   newLevel(level, rnd)       stato iniziale (griglia di partenza, conto alla rovescia)
 *   step(s, dt, input) → ev    tempo reale; input = { steer, gas?, brake, use } oppure null
 *   tick · geo · track · notes · upcoming · world · pose · height · nearest · edgeAt · sideAt · bankAt · ranking · migrate
 *   isWon · isLost · isOver · rate · progress · par · obb · overlap · overlapW
 * Eventi: count{n} · go · call{i} · off{surf} · on · boing{who} · rock{who, k} · bump{who, a, b} · jump{v}
 *   pass{who, up} · check{n, pos} · box{who, it} · use{who, it} · slip{who} · honey{who} · cloud{who, by} · pop{who}
 *   acorn{who, n} · spring{who} · drift{who} · mini{who, lvl} · spin{who} · rescue{who} · back{who} · finish{pos} · win · lose
 * Esporta HH.rally.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const TICK = 1 / 60;
  const READY = 3.2;            // conto alla rovescia 3, 2, 1, via
  const HALF = 4.5;             // metà larghezza della carreggiata
  const SHOULDER = 0.5;         // oltre HALF + SHOULDER si è fuori strada (erba, marciapiede, sabbia, neve)
  // limite dell'ambientazione (dal centro): in città transenne e sul mare staccionata (lato spiaggia) e muretto (lato
  // terra) sono MURI veri e continui; nel bosco e sulla neve oltre questa distanza (cespugli e staccionate decorativi)
  // si è "usciti troppo" e arriva la nuvoletta che riporta in pista. Prima c'è la fascia fuori strada con gli ostacoli.
  const WALLS = { forest: 12, city: 7.2, sea: 8.2, snow: 12 };
  const HARD = { forest: false, city: true, sea: true, snow: false };
  // superfici fuori strada: velocità massima (× vmax), aderenza, frenata oltre il massimo (m/s²)
  const SURF = {
    forest: { k: 'grass', cap: 0.42, grip: 0.68, drag: 13 }, city: { k: 'walk', cap: 0.45, grip: 0.8, drag: 13 },
    sea: { k: 'sand', cap: 0.38, grip: 0.62, drag: 14 }, snow: { k: 'snow', cap: 0.36, grip: 0.58, drag: 14 },
  };
  const WALL = WALLS.forest;
  const RAIL = HALF + 0.45;     // ringhiere dei ponti (superficie interna)
  const TUBE = HALF + 1.4;      // pareti delle gallerie
  const KMAX = 1 / 8.5;         // curvatura massima dello sterzo a fondo corsa
  const GRIP = 8.5;             // accelerazione laterale massima (m/s²) sullo sterrato asciutto
  const ACC = 6.8;              // spinta del motore (m/s² da fermi)
  const BRAKE = 13;             // frenata (m/s²)
  const REV = 5;                // retromarcia: velocità massima (m/s)
  const COAST = 1.3;            // senza gas né freno si rallenta piano (m/s²)
  const OFFCAP = SURF.forest.cap;   // fuori strada (erba): velocità massima = OFFCAP × vmax
  const SUB = 2;                // sotto-passi di movimento e collisioni per passo fisso
  // derapata: oltre ON rad si derapa, sotto OFF si è "usciti"; tenuta T1/T2 s = mini-spinta 1/2 (+v m/s per T s)
  const DRIFT = { on: 0.12, off: 0.06, t1: 0.75, t2: 1.6, v1: 1.8, v2: 3.0, T1: 0.55, T2: 0.95, max: 0.85, spin: 0.6, lock: 1.5 };
  const RESCUE = 1.5;           // nuvoletta: secondi tra l'uscita e il ritorno in pista
  const CALL = 110;             // il navigatore legge la nota quando mancano CALL metri
  const RUNOFF = 90;            // strada dopo il traguardo
  const PREROLL = 30;           // strada prima della linea di partenza (griglia)
  // kart a forma di frutto: rettangolo di collisione = ingombro del kart disegnato (scocca, ruote, paraurti)
  const CAR_L = 3.2, CAR_W = 1.8, HL = CAR_L / 2, HW = CAR_W / 2;
  const E_CAR = 0.25, MU_CAR = 0.3, E_WALL = 0.2;
  const WHO = ['hari', 'bunny', 'fox', 'panda'];
  // a due giocatori: il secondo umano sceglie un personaggio (la Micia sul kart-mela, oppure uno dei tre animaletti, che
  // allora non corre come avversario); gli avversari restano due (4 kart in tutto, come in singolo)
  const CHARS = ['hari', 'bunny', 'fox', 'panda', 'kitty'];
  const KART = { hari: 'straw', bunny: 'peach', fox: 'mand', panda: 'melon', kitty: 'apple' };
  const LATE = 40;              // a due: chi non è arrivato 40 s dopo il primo umano viene classificato a tempo stimato
  // gravità delle note (rally: 6 = quasi piena, 1 = la più stretta): raggio minimo della curva in metri
  const BANDS = [[1, 0, 24], [2, 24, 40], [3, 40, 62], [4, 62, 95], [5, 95, 140], [6, 140, 1e9]];
  // ambientazioni a rotazione: [luogo, stagione/variante, ora]
  const ROT = [
    ['forest', 'spring', 'day'], ['city', 'city', 'day'], ['sea', 'sea', 'day'], ['forest', 'autumn', 'dusk'],
    ['snow', 'snow', 'day'], ['city', 'city', 'night'], ['sea', 'sea', 'dusk'], ['forest', 'spring', 'night'],
    ['city', 'city', 'dusk'], ['sea', 'sea', 'night'], ['snow', 'snow', 'night'], ['forest', 'autumn', 'day'],
  ];
  const THEMES = ['forest', 'city', 'sea', 'snow'];
  const STAGES = ['spring', 'autumn', 'city', 'sea', 'snow'];
  const TIMES = ['day', 'dusk', 'night'];
  // per luogo: aderenza, ponti/gallerie per km, quota di curve paraboliche, chicane, ostacolo all'interno delle curve
  const PLACE = {
    forest: { grip: 1, bridges: 0.4, tunnels: 0, banks: 0.12, chicane: 0.14, obst: 'rock', tight: 0 },
    city: { grip: 1.04, bridges: 0.3, tunnels: 0.55, banks: 0.5, chicane: 0.28, obst: 'planter', tight: 0 },
    sea: { grip: 1.02, bridges: 0.25, tunnels: 0.35, banks: 0.2, chicane: 0.16, obst: 'rock', tight: 0 },
    snow: { grip: 0.88, bridges: 0.3, tunnels: 0.3, banks: 0.35, chicane: 0.1, obst: 'snowman', tight: 0.06 },
  };

  /* ---------- power-up ---------- */
  const ITEMS = ['', 'carrot', 'bubble', 'banana', 'honey', 'cloud', 'magnet', 'spring'];
  const OFFENSIVE = [0, 0, 0, 1, 1, 1, 0, 0];
  // pesi per posizione (1° … 4°): chi è dietro trova power-up migliori (turbo, nuvoletta, molla)
  const IW = [null,
    [3, 24, 30, 22, 0, 21, 0],
    [16, 16, 20, 14, 16, 10, 8],
    [27, 13, 9, 7, 24, 8, 12],
    [34, 10, 3, 3, 28, 6, 16]];
  const PU = {
    boostT: 1.8, boostV: 1.3, shieldT: 9, slipT: 0.9, slowT: 2.4, slowV: 0.72, honeyV: 0.52, magT: 7, magR: 6,
    springT: 0.95, hazT: 22, boxR: 0.75, boxBack: 2.5, acornR: 0.45, acornV: 0.005, acornMax: 10, cloudV: 15,
    bananaR: 0.75, honeyR: 1.6, maxHaz: 10,
  };

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
  const cfgCache = new Map();
  function config(level) {
    const L = Math.max(1, level | 0);
    let c = cfgCache.get(L);
    if (!c) { c = Object.freeze(makeConfig(L)); cfgCache.set(L, c); }
    return c;
  }
  function makeConfig(L) {
    const tier = L <= 2 ? 0 : L <= 4 ? 1 : L <= 7 ? 2 : L <= 10 ? 3 : 4;
    const [theme, stage, time] = ROT[(L - 1) % ROT.length];
    const pl = PLACE[theme];
    const up = Math.min(1, (L - 1) / 14);                     // 0 al livello 1 → 1 dal 15
    return {
      level: L, tier, theme, stage, time, night: time === 'night' ? 1 : time === 'dusk' ? 0.5 : 0,
      len: Math.round(Math.min(4300, 1300 + 270 * (L - 1))),   // metri dalla partenza al traguardo
      minGrade: [3, 2, 1, 1, 1][tier],                          // curva più stretta possibile
      tight: +([0, 0.1, 0.2, 0.28, 0.34][tier] + (tier ? pl.tight : 0)).toFixed(2),   // quota di curve gravità 1–2
      curvy: [0.62, 0.66, 0.7, 0.74, 0.78][tier],               // probabilità che il pezzo dopo un rettilineo sia una curva
      straight: [[40, 125], [36, 120], [30, 110], [25, 100], [20, 90]][tier],
      chicane: +(pl.chicane * (0.6 + 0.2 * tier)).toFixed(3),   // probabilità di una chicane al posto di una curva
      vmax: +(22.5 + 7 * up).toFixed(2),                        // m/s (81 → 106 km/h)
      grip: pl.grip,
      wall: WALLS[theme], hard: HARD[theme], surf: SURF[theme].k,
      // bravura degli avversari (frazione del profilo di velocità in curva) e velocità sui rettilinei: dal livello 3
      // un gradino in più; ai livelli alti vicini al limite dell'aderenza
      ai: [0.7, 0.77, 0.83].map((b, i) => +Math.min([0.91, 0.945, 0.975][i], b + 0.015 * (L - 1) + (L >= 3 ? 0.03 : 0)).toFixed(3)),
      aiTop: +Math.min(1.01, 0.95 + 0.006 * (L - 1) + (L >= 3 ? 0.02 : 0)).toFixed(3),
      // rubber band moderato: chi è indietro rispetto a Hari va fino a rb più forte (chi è davanti non rallenta mai)
      rb: +Math.min(0.06, 0.03 + 0.003 * (L - 1)).toFixed(3),
      aiErr: +Math.max(0.3, 1.3 - 0.08 * (L - 1)).toFixed(3),  // errori degli avversari per km
      aiItem: +Math.min(1, 0.3 + 0.09 * (L - 1)).toFixed(3),    // quanto usano i power-up "dispettosi"
      assist: +Math.max(0, 0.45 - 0.08 * (L - 1)).toFixed(3),  // aiuto allo sterzo (riallinea dolcemente): solo all'inizio
      autoGas: L <= 1,                                          // acceleratore automatico predefinito (opzione)
      // ampiezza delle colline (solo grafica): al mare quasi piatto (il livello dell'acqua è uno solo)
      hills: theme === 'sea' ? 1.6 : +Math.min(9, 2.5 + 0.5 * (L - 1)).toFixed(2),
      crests: +(0.5 + 0.14 * tier).toFixed(2),                  // dossi per km
      bridges: +(pl.bridges + 0.05 * tier).toFixed(2),          // ponti per km
      tunnels: +(pl.tunnels * (tier ? 1 : 0.6)).toFixed(2),     // gallerie per km
      banks: pl.banks,                                          // quota di curve 2–3 paraboliche
      rocks: [0.25, 0.35, 0.45, 0.5, 0.55][tier],               // curve con l'ostacolo all'interno ("non tagliare")
      obst: pl.obst,
      boxes: Math.round(400 - 14 * tier),                       // metri tra due file di scatole-sorpresa
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
  function curveOf(R, dir, ang) {
    let lt = clamp(R * 0.35, 8, 28);
    let arcLen = ang * R - lt;              // l'angolo totale = k × (arco + lt)
    if (arcLen < 4) { lt = Math.max(4, (ang * R) / 2); arcLen = ang * R - lt; }
    return { R, dir, ang, lt, total: Math.round(arcLen + 2 * lt), g: gradeOf(R) };
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
    return curveOf(R, dir, ang);
  }

  function track(seed, level) {
    const c = config(level);
    const L = c.len, N = PREROLL + L + RUNOFF;   // campioni (1 m)
    const x = new Float64Array(N + 1), y = new Float64Array(N + 1), th = new Float64Array(N + 1), k = new Float64Array(N + 1);
    for (let attempt = 0; attempt < 40; attempt++) {
      const r = HH.rng((seed + attempt * 7919) >>> 0);
      x.fill(0); y.fill(0); th.fill(0); k.fill(0);
      const cell = 24, grid = new Map(), key = (X, Y) => Math.floor(X / cell) * 73856093 ^ Math.floor(Y / cell) * 19349663;
      const pieces = [];
      let i = 0, fails = 0, lastDir = r() < 0.5 ? 1 : -1, ok = true;
      const addGrid = (j) => { if (j % 2) return; const kk = key(x[j], y[j]); let b = grid.get(kk); if (!b) grid.set(kk, (b = [])); b.push(j); };
      const clear = (from, to) => {
        // ogni punto nuovo deve stare lontano (≥ 32 m) dai tratti di pista di almeno 160 m prima (controllo ogni 2 m)
        for (let j = from; j <= to; j += j < to - 1 ? 2 : 1) {
          const X = x[j], Y = y[j], cx = Math.floor(X / cell), cy = Math.floor(Y / cell);
          for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
            const bk = grid.get((cx + a) * 73856093 ^ (cy + b) * 19349663);
            if (!bk) continue;
            for (const q of bk) if (j - q > 160 && (X - x[q]) ** 2 + (Y - y[q]) ** 2 < 33 * 33) return false;
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
          if (!wasCurve && i > PREROLL + 120 && r() < c.chicane) {
            // chicane: due curve medie in versi opposti, quasi attaccate
            const R1 = Math.round(32 + r() * 26), a1 = 0.45 + r() * 0.3;
            const i0 = i;
            if (lay(curveOf(R1, dir, a1)) && lay({ total: 4 + Math.round(r() * 6) }) && lay(curveOf(R1 + Math.round((r() - 0.5) * 8), -dir, a1 * (0.9 + r() * 0.2)))) {
              lastDir = -dir; wasCurve = true; fails = 0; continue;
            }
            // non ci sta: si torna indietro e si prova una curva normale
            pieces.length = pieces.findIndex((q) => q.at >= i0) >= 0 ? pieces.findIndex((q) => q.at >= i0) : pieces.length;
            i = i0;
          }
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

  // dossi, ponti, gallerie, ostacoli, curve paraboliche, traiettoria ideale e profilo di velocità, scatole e ghiande, note
  function finishTrack(seed, level, c, g, r) {
    const { k, N, L } = g;
    const S0 = PREROLL, S1 = PREROLL + L;
    g.seed = seed; g.level = level; g.c = c; g.S0 = S0; g.S1 = S1; g.theme = c.theme; g.wall = c.wall;
    // tratti dritti (|k| piccolo per almeno 60 m): candidati per dossi, ponti e gallerie
    const flat = [];
    let a = -1;
    for (let i = S0 + 60; i <= S1 - 40; i++) {
      const f = Math.abs(k[i]) < 1 / 400;
      if (f && a < 0) a = i;
      if ((!f || i === S1 - 40) && a >= 0) { if (i - a >= 60) flat.push([a, i]); a = -1; }
    }
    g.crests = []; g.bridges = []; g.tunnels = []; g.rocks = []; g.banks = [];
    const used = [];
    const free = (s0, s1) => used.every(([u0, u1]) => s1 < u0 - 30 || s0 > u1 + 30);
    const want = (n) => Math.floor(n) + (r() < n % 1 ? 1 : 0);
    const shuffled = () => flat.map((f) => [r(), f]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    let nt = want((c.tunnels * L) / 1000);
    for (const [f0, f1] of shuffled()) {
      if (nt <= 0) break;
      const len = Math.min(70, f1 - f0 - 16);
      if (len < 34) continue;
      const m = Math.round((f0 + f1) / 2), s0 = Math.round(m - len / 2), s1 = Math.round(m + len / 2);
      if (!free(s0, s1)) continue;
      g.tunnels.push({ s0, s1 }); used.push([s0, s1]); nt--;
    }
    let nb = want((c.bridges * L) / 1000);
    for (const [f0, f1] of shuffled()) {
      if (nb <= 0) break;
      const m = Math.round((f0 + f1) / 2), s0 = m - 9, s1 = m + 9;
      if (!free(s0, s1)) continue;
      g.bridges.push({ s0, s1 }); used.push([s0, s1]); nb--;
    }
    let nc = want((c.crests * L) / 1000);
    for (const [f0, f1] of shuffled()) {
      if (nc <= 0) break;
      const m = Math.round(f0 + 20 + (f1 - f0 - 40) * r());
      if (!free(m - 10, m + 10)) continue;
      g.crests.push({ s: m, h: +(1.4 + r() * 1.1).toFixed(2), w: 9 }); used.push([m - 10, m + 10]); nc--;
    }
    g.bridges.sort((p, q) => p.s0 - q.s0); g.crests.sort((p, q) => p.s - q.s); g.tunnels.sort((p, q) => p.s0 - q.s0);
    for (const cr of g.crests) { const i = cr.s; cr.x = +g.x[i].toFixed(2); cr.y = +g.y[i].toFixed(2); }
    // griglia spaziale (un campione ogni 2 m) per la distanza dalla pista
    g.cell = 16; g.grid = new Map();
    for (let i = 0; i <= N; i += 2) { const kk = gk(g, g.x[i], g.y[i]); let b = g.grid.get(kk); if (!b) g.grid.set(kk, (b = [])); b.push(i); }
    // note del navigatore, dedotte dalla curvatura vera della pista
    g.notes = deriveNotes(g);
    const curves = g.notes.filter((n) => n.kind === 'curve');
    // ostacoli all'interno di alcune curve medie (2–4): nota "non tagliare"; curve paraboliche (2–3, più aderenza)
    for (const n of curves) {
      if (n.g >= 2 && n.g <= 3 && n.at > S0 + 40 && r() < c.banks) {
        const ang = +(0.1 + r() * 0.06).toFixed(3);
        g.banks.push({ a: n.at, b: n.end, dir: n.dir, ang }); n.bank = true;
        continue;
      }
      if (n.g < 2 || n.g > 4 || n.at < S0 + 40 || r() > c.rocks) continue;
      g.rocks.push({ s: n.apex, d: n.dir * (HALF + 1.2), r: 1.0, k: c.obst });
      n.nocut = true;
    }
    g.bankA = new Float32Array(N + 1);
    for (const b of g.banks) for (let i = Math.max(0, b.a - 15); i <= Math.min(N, b.b + 15); i++) {
      const w = i < b.a ? (i - (b.a - 15)) / 15 : i > b.b ? (b.b + 15 - i) / 15 : 1;
      g.bankA[i] = b.dir * b.ang * Math.min(1, Math.max(0, w));
    }
    // traiettoria ideale (punti di corda) e profilo di velocità su quella traiettoria
    racingLine(g);
    // checkpoint a un terzo e a due terzi
    g.checks = [S0 + Math.round(L / 3), S0 + Math.round((2 * L) / 3)];
    // scatole-sorpresa: file di 4 lungo la tappa, mai su ponti/gallerie o in curve strette
    g.boxes = [];
    const busy = (sv) => g.bridges.some((b) => sv > b.s0 - 6 && sv < b.s1 + 6) || g.tunnels.some((t) => sv > t.s0 - 4 && sv < t.s1 + 4) ||
      g.crests.some((q) => Math.abs(sv - q.s) < 14);
    for (let sv = S0 + 150; sv < S1 - 90; sv += c.boxes * (0.85 + 0.3 * r())) {
      let q = Math.round(sv);
      while (q < S1 - 60 && (busy(q) || Math.abs(k[q]) > 1 / 70)) q += 3;
      if (q >= S1 - 60) break;
      g.boxes.push({ s: q, row: [-3, -1, 1, 3] });
      sv = q;
    }
    // ghiande bonus: file di 5 ogni ~100 m, a volte sulla traiettoria ideale, a volte di lato (più rischiose)
    g.acorns = [];
    for (let sv = S0 + 80 + r() * 40; sv < S1 - 30; sv += 70 + r() * 70) {
      const s0 = Math.round(sv);
      if (g.boxes.some((b) => Math.abs(b.s - s0) < 25) || busy(s0)) continue;
      const off = r() < 0.5 ? 0 : (r() < 0.5 ? -1 : 1) * (1.2 + r() * 1.6);
      for (let j = 0; j < 5; j++) {
        const q = s0 + j * 3;
        const d = clamp(g.line[q] + off, -HALF + 0.8, HALF - 0.8);
        g.acorns.push({ s: q, d: +d.toFixed(2) });
      }
    }
    // ampiezza e fasi delle colline (solo grafica)
    g.hill = { A: c.hills, p: [r() * 6.28, r() * 6.28, r() * 6.28] };
    edgesAndProps(g, c);
    return g;
  }
  // limite per lato (outL a sinistra, outR a destra) e ostacoli della fascia fuori strada (g.props, cerchi nel mondo).
  // All'interno delle curve strette il limite si accorcia (0,62 × raggio): lì le coordinate di Frenet si stringono.
  const PROPS = {
    forest: [['tree', 0.42, 0.42, 0.34], ['rock', 0.55, 0.95, 0.22], ['stump', 0.45, 0.5, 0.14], ['bush', 0.75, 0.95, 0.3]],
    snow: [['pine', 0.42, 0.42, 0.4], ['bank', 0.9, 1.2, 0.36], ['snowman', 0.7, 0.75, 0.14], ['rock', 0.55, 0.8, 0.1]],
    sea: [],    // al mare la fascia di sabbia arriva fino alla staccionata e al muretto: niente ostacoli in mezzo
    city: [],   // in città il marciapiede finisce contro le transenne
  };
  const SOFT = { bush: 1, bank: 1 };   // si sbatte ma si perde meno velocità
  const PROP_IN = HALF + SHOULDER + 2.8;           // nessun ostacolo prima di qui (gli avversari non arrivano oltre)
  function slideMax(k, N, W, sg) {
    const out = new Float32Array(N + 1), dq = new Int32Array(N + 1);
    let h = 0, t = 0;
    for (let j = 0; j <= N + W; j++) {
      if (j <= N) { const v = sg * k[j]; while (t > h && sg * k[dq[t - 1]] <= v) t--; dq[t++] = j; }
      const i = j - W;
      if (i < 0) continue;
      while (dq[h] < i - W) h++;
      out[i] = Math.max(0, sg * k[dq[h]]);
    }
    return out;
  }
  function edgesAndProps(g, c) {
    const { k, N } = g;
    g.hard = c.hard;
    for (const rk of g.rocks) { const w = world(g, rk.s, rk.d); rk.x = w.x; rk.y = w.y; }
    g.outL = new Float32Array(N + 1); g.outR = new Float32Array(N + 1);
    // massimo della curvatura verso ciascun lato nei ±12 m (finestra scorrevole, O(N))
    const W = 12, mL = slideMax(k, N, W, 1), mR = slideMax(k, N, W, -1);
    for (let i = 0; i <= N; i++) {
      g.outL[i] = Math.min(g.wall, mL[i] > 0 ? 0.62 / mL[i] : g.wall);
      g.outR[i] = Math.min(g.wall, mR[i] > 0 ? 0.62 / mR[i] : g.wall);
    }
    // ostacoli: generatore a parte (la pista e il resto restano identici)
    const r = HH.rng((g.seed ^ 0x51ab7e) >>> 0), kinds = PROPS[c.theme];
    g.props = [];
    g.pb = new Map();
    if (!kinds.length) return;
    const tot = kinds.reduce((a, q) => a + q[3], 0);
    const busy = (sv) => sv < g.S0 + 25 || sv > g.S1 - 8 || g.checks.some((q) => Math.abs(sv - q) < 9) ||
      g.bridges.some((b) => sv > b.s0 - FUN - 4 && sv < b.s1 + FUN + 4) || g.tunnels.some((t) => sv > t.s0 - FUN - 4 && sv < t.s1 + FUN + 4) ||
      g.rocks.some((q) => Math.abs(sv - q.s) < 5);
    for (const sg of [1, -1]) {
      for (let sv = g.S0 + 20 + r() * 10; sv < g.S1 + 40; sv += 7 + r() * 9) {
        if (r() > 0.78 || busy(sv)) continue;
        let u = r() * tot, kd = kinds[0];
        for (const q of kinds) { u -= q[3]; if (u < 0) { kd = q; break; } }
        const rad = +(kd[1] + (kd[2] - kd[1]) * r()).toFixed(2);
        const i0 = Math.round(sv), out = Math.min(...[-3, 0, 3].map((o) => (sg > 0 ? g.outL : g.outR)[clamp(i0 + o, 0, N)]));
        const lo = PROP_IN + rad, hi = out - rad - 0.25;
        if (hi < lo) continue;
        const ps = +sv.toFixed(2), d = +(sg * (lo + (hi - lo) * r())).toFixed(2);
        const w = world(g, ps, d);
        if (nearest(g, w.x, w.y).dist < PROP_IN + rad - 0.3) continue;
        const p = { s: ps, d, r: rad, k: kd[0], x: w.x, y: w.y };
        g.props.push(p);
        const b = Math.floor(sv / 8);
        let L = g.pb.get(b); if (!L) g.pb.set(b, (L = [])); L.push(p);
      }
    }
    g.props.sort((p, q) => p.s - q.s);
  }
  const gk = (g, X, Y) => Math.floor(X / g.cell) * 73856093 ^ Math.floor(Y / g.cell) * 19349663;

  // traiettoria ideale a curvatura minima: la curvatura di chi corre a distanza d dal centro è circa k + d″, quindi si
  // cerca d(s) che rende minima ∑ (k + d″)² restando dentro la carreggiata (|d| ≤ D). Ne escono da sé i punti di corda:
  // fuori prima della curva, dentro sull'apice, fuori in uscita; nelle chicane dritto da un apice all'altro.
  // Nodi ogni 4 m: sistema pentadiagonale (equazioni normali) risolto con una fattorizzazione a banda, vincoli con un
  // insieme attivo (chi esce va sul bordo, chi "vuole" rientrare viene liberato). Poi interpolazione a 1 m. Profilo di
  // velocità sulla curvatura vera della traiettoria (√(aderenza/k), più aderenza sulle paraboliche) e frenate a 8 m/s².
  const LINE_D = HALF - 1.3, LINE_H = 4;
  function solveLine(kap, n, h, fix0, D) {
    const h2 = h * h, mu = 1e-10;
    // A = LᵀL + μI (diagonale, prima e seconda sopradiagonale), b = −Lᵀk
    const A0 = new Float64Array(n), A1 = new Float64Array(n), A2 = new Float64Array(n), B = new Float64Array(n);
    for (let i = 1; i < n - 1; i++) {
      const c0 = 1 / h2, c1 = -2 / h2;
      A0[i - 1] += c0 * c0; A0[i] += c1 * c1; A0[i + 1] += c0 * c0;
      A1[i - 1] += c0 * c1; A1[i] += c1 * c0; A2[i - 1] += c0 * c0;
      B[i - 1] -= c0 * kap[i]; B[i] -= c1 * kap[i]; B[i + 1] -= c0 * kap[i];
    }
    for (let i = 0; i < n; i++) A0[i] += mu;
    const act = new Float64Array(n), isA = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (i < fix0 || i >= n - 2) { isA[i] = 2; act[i] = 0; }
    const d = new Float64Array(n), a0 = new Float64Array(n), a1 = new Float64Array(n), a2 = new Float64Array(n), r = new Float64Array(n);
    for (let it = 0; it < 30; it++) {
      // sistema ridotto: le variabili fisse diventano termini noti
      for (let i = 0; i < n; i++) { a0[i] = A0[i]; a1[i] = A1[i]; a2[i] = A2[i]; r[i] = B[i]; }
      for (let i = 0; i < n; i++) {
        if (!isA[i]) continue;
        const v = act[i];
        if (i >= 1 && !isA[i - 1]) r[i - 1] -= A1[i - 1] * v;
        if (i >= 2 && !isA[i - 2]) r[i - 2] -= A2[i - 2] * v;
        if (i + 1 < n && !isA[i + 1]) r[i + 1] -= A1[i] * v;
        if (i + 2 < n && !isA[i + 2]) r[i + 2] -= A2[i] * v;
        a0[i] = 1; r[i] = v;
        if (i >= 1) a1[i - 1] = 0; if (i >= 2) a2[i - 2] = 0; a1[i] = 0; a2[i] = 0;
      }
      // LDLᵀ a banda 2 (in posto): a0 = D, a1/a2 = moltiplicatori
      for (let i = 0; i < n; i++) {
        if (i >= 1) { const l1 = a1[i - 1]; a0[i] -= l1 * l1 * a0[i - 1]; if (i >= 2) { const l2 = a2[i - 2]; a0[i] -= l2 * l2 * a0[i - 2]; a1[i - 1 + 0] = l1; } }
        // l(i+1,i) = (A(i+1,i) − l(i+1,i−1) l(i,i−1) D(i−1)) / D(i); l(i+2,i) = A(i+2,i) / D(i)
        if (i + 1 < n) { let v = a1[i]; if (i >= 1) v -= a2[i - 1] * a1[i - 1] * a0[i - 1]; a1[i] = v / a0[i]; }
        if (i + 2 < n) a2[i] = a2[i] / a0[i];
      }
      for (let i = 0; i < n; i++) { let v = r[i]; if (i >= 1) v -= a1[i - 1] * d[i - 1]; if (i >= 2) v -= a2[i - 2] * d[i - 2]; d[i] = v; }
      for (let i = 0; i < n; i++) d[i] /= a0[i];
      for (let i = n - 1; i >= 0; i--) { let v = d[i]; if (i + 1 < n) v -= a1[i] * d[i + 1]; if (i + 2 < n) v -= a2[i] * d[i + 2]; d[i] = v; }
      // vincoli: chi esce va sul bordo; chi è sul bordo ma "tira" verso il centro torna libero
      let changed = false;
      for (let i = 0; i < n; i++) if (!isA[i] && Math.abs(d[i]) > D + 1e-6) { isA[i] = 1; act[i] = Math.sign(d[i]) * D; d[i] = act[i]; changed = true; }
      if (!changed) {
        for (let i = 0; i < n; i++) {
          if (isA[i] !== 1) continue;
          let gr = A0[i] * d[i] - B[i];
          if (i >= 1) gr += A1[i - 1] * d[i - 1]; if (i >= 2) gr += A2[i - 2] * d[i - 2];
          if (i + 1 < n) gr += A1[i] * d[i + 1]; if (i + 2 < n) gr += A2[i] * d[i + 2];
          if (gr * Math.sign(act[i]) > 1e-12) { isA[i] = 0; changed = true; }
        }
      }
      if (!changed) break;
    }
    return d;
  }
  function racingLine(g) {
    const { N, S0, th } = g, c = g.c, h = LINE_H, hPrev = h;
    const n = Math.floor(N / h) + 1, kap = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a0 = Math.max(0, Math.round(i * h - h / 2)), a1 = Math.min(N, Math.round(i * h + h / 2));
      kap[i] = a1 > a0 ? (th[a1] - th[a0]) / (a1 - a0) : 0;
    }
    const d = solveLine(kap, n, h, Math.ceil((S0 + 20) / h), LINE_D);
    const line = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const f = i / hPrev, q = Math.min(d.length - 2, Math.floor(f)), u = f - q;
      // interpolazione di Catmull–Rom tra i nodi da 6 m
      const p0 = d[Math.max(0, q - 1)], p1 = d[q], p2 = d[q + 1], p3 = d[Math.min(d.length - 1, q + 2)];
      line[i] = clamp(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u), -LINE_D, LINE_D);
    }
    g.line = line;
    // curvatura della traiettoria (cerchio per tre punti a ±5 m)
    const px = new Float64Array(N + 1), py = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) { const th = g.th[i]; px[i] = g.x[i] - Math.sin(th) * line[i]; py[i] = g.y[i] + Math.cos(th) * line[i]; }
    const kl = new Float64Array(N + 1);
    for (let i = 5; i <= N - 5; i++) {
      const ax = px[i - 5], ay = py[i - 5], bx = px[i], by = py[i], cx = px[i + 5], cy = py[i + 5];
      const A2 = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
      const den = Math.sqrt(((bx - cx) ** 2 + (by - cy) ** 2) * ((ax - cx) ** 2 + (ay - cy) ** 2) * ((ax - bx) ** 2 + (ay - by) ** 2));
      kl[i] = A2 < 1e-9 ? 0 : (2 * A2) / den;
    }
    const prof = new Float64Array(N + 1), vm = c.vmax, Ga = GRIP * c.grip;
    for (let i = 0; i <= N; i++) {
      let km = 0;
      for (let q = Math.max(0, i - 4); q <= Math.min(N, i + 4); q++) km = Math.max(km, kl[q]);
      prof[i] = Math.min(vm, Math.sqrt((Ga * (1 + 1.5 * Math.abs(g.bankA[i]))) / Math.max(km, 1e-6)));
    }
    for (let i = N - 1; i >= 0; i--) prof[i] = Math.min(prof[i], Math.sqrt(prof[i + 1] * prof[i + 1] + 2 * 8));
    g.prof = prof;
  }

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
    for (const t of g.tunnels || []) out.push({ kind: 'tunnel', at: t.s0, end: t.s1 });
    out.sort((p, q) => p.at - q.at);
    out.forEach((n, i) => { n.i = i; n.call = n.at - CALL; });
    return out;
  }

  const cache = new Map();
  let lastG = null;
  function geo(s) {
    if (lastG && lastG.seed === s.seed && lastG.level === s.level) return lastG;
    const kk = `${s.seed}|${s.level}`;
    let g = cache.get(kk);
    if (!g) {
      g = track(s.seed, s.level);
      cache.set(kk, g);
      if (cache.size > 4) cache.delete(cache.keys().next().value);
    }
    lastG = g;
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
  const bankAt = (g, s) => { const f = clamp(s, 0, g.N - 1e-6), i = Math.floor(f); return lerp(g.bankA[i], g.bankA[i + 1], f - i); };
  const inSpan = (list, s, m = 0) => { for (const b of list) if (s > b.s0 - m && s < b.s1 + m) return b; return null; };
  // bordo alla distanza s: ringhiera del ponte, parete della galleria o limite dell'ambientazione (per la grafica)
  function edgeAt(g, s) {
    if (inSpan(g.bridges, s, 1)) return { lim: RAIL, kind: 'rail', hard: true };
    if (inSpan(g.tunnels, s, 0.5)) return { lim: TUBE, kind: 'tube', hard: true };
    return { lim: g.wall, kind: 'wall', hard: !!g.hard };
  }
  // bordo di un lato (sg = +1 sinistra, −1 destra): distanza dal centro, se è un muro vero (altrimenti oltre si esce)
  // e pendenza del muro (dlim/ds). Prima e dopo ponti e gallerie un guardrail a imbuto lungo FUN metri porta dal
  // limite dell'ambientazione alla ringhiera o alla parete (niente muri che spuntano di colpo)
  const FUN = 20;
  const SIDE = { lim: 0, hard: false, slope: 0, kind: '' };
  function spanSide(list, s, inner, m, kind) {
    for (const b of list) {
      const a0 = b.s0 - m, a1 = b.s1 + m;
      if (s < a0 - FUN || s > a1 + FUN) continue;
      if (s >= a0 && s <= a1) { SIDE.lim = inner; SIDE.hard = true; SIDE.slope = 0; SIDE.kind = kind; return; }
      const u = s < a0 ? (a0 - s) / FUN : (s - a1) / FUN, l = inner + (SIDE.lim - inner) * u;
      if (l < SIDE.lim) { SIDE.slope = (s < a0 ? -1 : 1) * (SIDE.lim - inner) / FUN; SIDE.lim = l; SIDE.hard = true; SIDE.kind = 'fun'; }
    }
  }
  function sideAt(g, s, sg) {
    const i = clamp(Math.round(s), 0, g.N);
    SIDE.lim = sg > 0 ? g.outL[i] : g.outR[i]; SIDE.hard = !!g.hard; SIDE.slope = 0; SIDE.kind = 'wall';
    spanSide(g.bridges, s, RAIL, 1, 'rail');
    if (SIDE.kind !== 'rail') spanSide(g.tunnels, s, TUBE, 0.5, 'tube');
    return SIDE;
  }
  // il più vicino dei due bordi (per gli avversari)
  const limAt = (g, s) => Math.min(sideAt(g, s, 1).lim, sideAt(g, s, -1).lim);
  // posa nel mondo di un'auto (la stessa che usa la grafica): centro, direzione del muso, base locale della pista
  function pose(g, car) {
    const N = g.N, f = clamp(car.s, 0, N - 1e-6), i = Math.floor(f), u = f - i;
    const th = lerp(g.th[i], g.th[i + 1], u), tc = Math.cos(th), tn = Math.sin(th);
    const x = lerp(g.x[i], g.x[i + 1], u) - tn * car.d, y = lerp(g.y[i], g.y[i + 1], u) + tc * car.d, h = th + car.psi;
    return { x, y, h, c: Math.cos(h), n: Math.sin(h), tc, tn, k: lerp(g.k[i], g.k[i + 1], u), th };
  }
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
  // dr = derapata tenuta (s), mini = mini-spinta (s), res = nuvoletta in corso (s), gh = "fantasma" appena posato
  // (non urta finché non è libero), stuck = tempo fermo fuori strada
  function carOf(id, s0, d0, skill) {
    return { id, s: s0, d: d0, psi: 0, bet: 0, v: 0, pd: 0, air: 0, airT: 0, off: false, kc: 0, slide: 0, fin: -1,
      skill, lane: d0, err: 0, errK: 0, errD: 0, bump: 0, wall: 0,
      it: 0, hold: 0, ac: 0, boost: 0, sh: 0, slip: 0, slow: 0, mag: 0, spr: 0, ovS: 0, ovT: 0, use: 0,
      dr: 0, mini: 0, res: 0, gh: 0, stuck: 0 };
  }
  // o (facoltativo) = { humans: 2, p2: 'kitty' | 'bunny' | 'fox' | 'panda', seed }: gara a due giocatori. Lo stesso
  // seme (e le stesse opzioni) dà la stessa gara su due telefoni: in rete si manda solo il seme.
  function newLevel(level, rnd = Math.random, o) {
    const seed = o && o.seed != null ? o.seed >>> 0 : Math.floor(rnd() * 2147483647) >>> 0;
    const c = config(level);
    if (o && o.humans === 2) return twoUp(level, seed, c, o);
    const s = {
      v: 3, level: c.level, seed, L: c.len, t: 0, ready: READY, acc: 0, rs: (seed ^ 0x9e3779b9) >>> 0,
      cars: [], rank: [], fin: -1, pos: 4, res: null, won: false, moves: 0, called: 0, cd: 4,
      offT: 0, boingT: 0, bumpT: 0, inp: null, wait: false,
      hz: [], cl: [], bx: [], ag: '', chk: 0, nhz: 0, nres: 0,
    };
    // griglia: due file da due; Hari parte ultimo a destra
    const grid = [[PREROLL - 2, 1.7], [PREROLL - 2, -1.7], [PREROLL - 8, 1.7], [PREROLL - 9, -1.7]];
    const order = [1, 2, 3, 0];
    order.forEach((id, j) => s.cars.push(carOf(id, grid[j][0], grid[j][1], id ? c.ai[id - 1] : 1)));
    s.cars.sort((a, b) => a.id - b.id);
    s.rank = ranking(s).map((x) => x.id);
    geo(s);
    return s;
  }
  // a due: 0 = Hari (fragola), 1 = il secondo giocatore (personaggio a scelta), 2 e 3 = avversari (i due più "morbidi"
  // della curva di difficoltà). I due umani partono dietro, gli avversari davanti.
  function twoUp(level, seed, c, o) {
    const p2 = CHARS.indexOf(o.p2) > 0 ? o.p2 : 'kitty';
    const ais = ['bunny', 'fox', 'panda'].filter((w) => w !== p2).slice(0, 2);
    const s = {
      v: 3, level: c.level, seed, L: c.len, t: 0, ready: READY, acc: 0, rs: (seed ^ 0x9e3779b9) >>> 0,
      cars: [], rank: [], fin: -1, pos: 4, res: null, won: false, moves: 0, called: 0, cd: 4,
      offT: 0, boingT: 0, bumpT: 0, inp: null, wait: false,
      hz: [], cl: [], bx: [], ag: '', chk: 0, nhz: 0, nres: 0,
      hu: [0, 1], who: ['hari', p2, ais[0], ais[1]], ps: [4, 3], end: -1,
    };
    const grid = [[PREROLL - 2, 1.7], [PREROLL - 2, -1.7], [PREROLL - 8, 1.7], [PREROLL - 9, -1.7]];
    [2, 3, 1, 0].forEach((id, j) => {
      const car = carOf(id, grid[j][0], grid[j][1], id >= 2 ? c.ai[id - 2] : 1);
      if (id < 2) { car.hm = 1; car.nc = 0; car.ck = 0; }
      s.cars.push(car);
    });
    s.cars.sort((a, b) => a.id - b.id);
    s.rank = ranking(s).map((x) => x.id);
    s.ps = s.hu.map((id) => s.rank.indexOf(id) + 1);
    s.pos = s.ps[0];
    geo(s);
    return s;
  }
  // il link è caduto: il kart di quel giocatore continua guidato dall'IA (la gara diventa a un giocatore)
  function toAI(s, id) {
    if (!s.hu) return false;
    const j = s.hu.indexOf(id);
    if (j < 0 || s.hu.length < 2) return false;
    s.hu.splice(j, 1);
    if (Array.isArray(s.inp)) s.inp.splice(j, 1);
    if (Array.isArray(s.ps)) s.ps.splice(j, 1);
    const car = s.cars[id], c = config(s.level);
    car.hm = 0; car.skill = c.ai[1]; car.bet = 0; car.dr = 0; car.err = 0; car.ovT = 0; car.use = 0; car.hold = 0;
    car.lane = clamp(car.d, -2, 2);
    // a metà nuvoletta: posato subito (l'IA non la usa), "fantasma" finché non è libero
    if (car.res > 0) { car.res = 0; car.gh = 1; car.v = 0; car.psi = 0; car.d = clamp(car.d, -HALF + 1, HALF - 1); }
    return true;
  }
  // salvataggi vecchi: v1 (prima dei power-up) e v2 (auto più grandi, muri invisibili, acceleratore automatico).
  // Aggiunge i campi nuovi, rimette le auto dentro i bordi nuovi e separa chi si tocca; la gara riprende da lì.
  function migrate(saved) {
    if (!saved || typeof saved !== 'object' || !Array.isArray(saved.cars) || saved.cars.length !== 4) return null;
    const s = JSON.parse(JSON.stringify(saved));
    if (s.v === 3) return s;
    if (s.v !== 1 && s.v !== 2) return null;
    if (typeof s.seed !== 'number' || !(s.level >= 1)) return null;
    if (s.v === 1) Object.assign(s, { hz: [], cl: [], bx: [], ag: '', chk: 0, nhz: 0 });
    s.v = 3;
    s.nres = 0;
    const g = geo(s), c = config(s.level);
    for (const car of s.cars) {
      const base = carOf(car.id, car.s, car.d, car.skill);
      for (const k in base) if (!(k in car)) car[k] = base[k];
      if (car.id) car.skill = c.ai[car.id - 1];
      const lim = Math.min(sideAt(g, car.s, 1).lim, sideAt(g, car.s, -1).lim) - extent(car.psi) - 0.05;
      car.d = clamp(car.d, -lim, lim);
    }
    s.chk = g.checks.filter((q) => s.cars[0].s >= q).length;
    contacts(s, g, [], false);
    return s;
  }
  const me = (s) => s.cars[0];
  // umano? In singolo solo l'auto 0 (Hari); a due (s.hu = id degli umani) chi ha hm = 1
  const hum = (s, car) => (s.hu ? car.hm === 1 : car.id === 0);
  const humans = (s) => s.hu || [0];

  // classifica: chi ha finito (per tempo), poi chi è più avanti
  function ranking(s) {
    return s.cars.slice().sort((a, b) => {
      if (a.fin >= 0 || b.fin >= 0) { if (a.fin < 0) return 1; if (b.fin < 0) return -1; return a.fin - b.fin; }
      return b.s - a.s || a.id - b.id;
    });
  }
  // ordine degli id senza creare oggetti (passo per passo)
  const ORD = [0, 1, 2, 3];
  function order(s) {
    const cs = s.cars;
    ORD[0] = 0; ORD[1] = 1; ORD[2] = 2; ORD[3] = 3;
    for (let i = 1; i < 4; i++) {
      const x = ORD[i];
      let j = i - 1;
      while (j >= 0 && before(cs[x], cs[ORD[j]])) { ORD[j + 1] = ORD[j]; j--; }
      ORD[j + 1] = x;
    }
    return ORD.slice();
  }
  function before(a, b) {
    if (a.fin >= 0 || b.fin >= 0) { if (a.fin < 0) return false; if (b.fin < 0) return true; return a.fin < b.fin || (a.fin === b.fin && a.id < b.id); }
    return a.s > b.s || (a.s === b.s && a.id < b.id);
  }
  const placeOf = (s, id = 0) => { const o = order(s); return o.indexOf(id) + 1; };

  // gas: 0..1, oppure −1 = acceleratore automatico (si accelera sempre tranne quando si frena)
  function cleanInput(inp) {
    if (!inp) return { steer: 0, gas: -1, brake: 0, use: 0 };
    const gas = inp.gas === undefined || inp.gas === null || inp.gas < 0 ? -1 : clamp(+inp.gas || 0, 0, 1);
    return { steer: clamp(+inp.steer || 0, -1, 1), gas, brake: inp.brake ? 1 : 0, use: inp.use ? 1 : 0 };
  }

  /* ---------- geometria delle collisioni ---------- */
  // rettangolo orientato dell'auto nel piano (s, d) (solo per compatibilità: le collisioni vere sono nel mondo)
  const obb = (car) => ({ s: car.s, d: car.d, c: Math.cos(car.psi), n: Math.sin(car.psi), hl: HL, hw: HW });
  // SAT tra due rettangoli dati da centro (x, y) e direzione (c = cos, n = sin): null o { nx, ny, depth } da A verso B
  function sat(ax, ay, ca, sa, bx, by, cb, sb) {
    const dx = bx - ax, dy = by - ay;
    if (dx * dx + dy * dy > 4 * (HL * HL + HW * HW)) return null;
    let best = 1e9, nx = 0, ny = 0;
    for (let q = 0; q < 4; q++) {
      const ux = q === 0 ? ca : q === 1 ? -sa : q === 2 ? cb : -sb, uy = q === 0 ? sa : q === 1 ? ca : q === 2 ? sb : cb;
      const rA = HL * Math.abs(ux * ca + uy * sa) + HW * Math.abs(-ux * sa + uy * ca);
      const rB = HL * Math.abs(ux * cb + uy * sb) + HW * Math.abs(-ux * sb + uy * cb);
      const dist = dx * ux + dy * uy, ov = rA + rB - Math.abs(dist);
      if (ov <= 0) return null;
      if (ov < best) { best = ov; const sg = dist < 0 ? -1 : 1; nx = ux * sg; ny = uy * sg; }
    }
    return { nx, ny, depth: best };
  }
  // in (s, d) come se fosse piano (vecchio modo, sbagliato in curva: tenuto per confronto nei test)
  const overlap = (A, B) => sat(A.s, A.d, Math.cos(A.psi), Math.sin(A.psi), B.s, B.d, Math.cos(B.psi), Math.sin(B.psi));
  // nel mondo, tra due pose (pose(g, car))
  const overlapW = (PA, PB) => sat(PA.x, PA.y, PA.c, PA.n, PB.x, PB.y, PB.c, PB.n);
  // ingombro laterale del rettangolo (metà larghezza vista lungo d)
  const extent = (psi) => HL * Math.abs(Math.sin(psi)) + HW * Math.cos(psi);
  // cerchio contro il rettangolo (centro x, y, direzione c, n): null o { nx, ny, depth } con la normale verso il cerchio
  function circle(x, y, c, n, ox, oy, r) {
    const dx = ox - x, dy = oy - y;
    if (dx * dx + dy * dy > (r + 2) * (r + 2)) return null;
    const lx = dx * c + dy * n, ly = -dx * n + dy * c;
    const qx = clamp(lx, -HL, HL), qy = clamp(ly, -HW, HW);
    const ex = lx - qx, ey = ly - qy, dist = Math.hypot(ex, ey);
    if (dist >= r) return null;
    let ux, uy, depth;
    if (dist > 1e-6) { ux = ex / dist; uy = ey / dist; depth = r - dist; }
    else if (HL - Math.abs(lx) < HW - Math.abs(ly)) { ux = Math.sign(lx) || 1; uy = 0; depth = r + HL - Math.abs(lx); }
    else { ux = 0; uy = Math.sign(ly) || 1; depth = r + HW - Math.abs(ly); }
    return { nx: ux * c - uy * n, ny: ux * n + uy * c, depth };
  }
  // in (s, d) (scatole, ghiande, bucce e pozze: sulla carreggiata, dove la differenza è piccola)
  const hitCircle = (car, cs, cd, r) => circle(car.s, car.d, Math.cos(car.psi), Math.sin(car.psi), cs, cd, r);
  // nel mondo (alberi, rocce, cumuli, vasi)
  const hitCircleW = (P, ox, oy, r) => circle(P.x, P.y, P.c, P.n, ox, oy, r);
  // velocità nel piano (s, d): direzione di marcia psi − bet; la parte di lato va in pd (spinta che si smorza)
  const velOf = (car) => { const a = car.psi - car.bet; return [car.v * Math.cos(a), car.v * Math.sin(a) + car.pd]; };
  function setVel(car, vs, vd, keep) {
    const a = car.psi - car.bet, c = Math.cos(a), n = Math.sin(a);
    const vl = vs * c + vd * n, lat = -vs * n + vd * c;
    // un urto non trasforma la marcia avanti in retromarcia (né il contrario)
    car.v = keep !== undefined ? Math.max(keep, vl) : car.v < -0.01 ? Math.min(0, vl) : Math.max(0, vl);
    car.pd = clamp(lat / Math.max(0.5, c), -4, 4);
  }
  // dal mondo a (s, d) con la base locale della pista (posa P): spostamenti e velocità
  function moveW(car, P, dx, dy) {
    const den = Math.max(0.3, 1 - P.k * car.d);
    car.s += (dx * P.tc + dy * P.tn) / den;
    car.d += -dx * P.tn + dy * P.tc;
  }
  const velW = (car, P) => { const [vs, vd] = velOf(car); return [vs * P.tc - vd * P.tn, vs * P.tn + vd * P.tc]; };
  const setVelW = (car, P, wx, wy, keep) => setVel(car, wx * P.tc + wy * P.tn, -wx * P.tn + wy * P.tc, keep);

  /* ---------- bordi, uscite e ostacoli ---------- */
  // main = sotto-passo principale (sfregamento, eventi, uscite); dopo le spinte tra auto solo la posizione
  function edges(s, g, car, ev, main, h = TICK) {
    if (car.res > 0) return;
    const ex = extent(car.psi);
    for (let sg = 1; sg >= -1; sg -= 2) {
      const sd = sideAt(g, car.s, sg), lim = sd.lim, hard = sd.hard, slope = sd.slope;
      const over = sg * car.d + ex - lim;
      if (over <= 0) continue;
      if (!hard) {
        // niente muro: Hari, uscito troppo, viene riportato in pista dalla nuvoletta (gli avversari restano dentro)
        if (!hum(s, car) || car.fin >= 0) car.d -= sg * over;
        else if (main) rescue(s, g, car, ev);
        continue;
      }
      car.d -= sg * over;
      const vel = velOf(car), vn = sg * vel[1] - slope * vel[0];   // velocità contro il muro (anche quello a imbuto)
      if (vn > 0) {
        // si raddrizza e rimbalza appena; perde velocità in proporzione all'urto (un urto deciso fa girare)
        if (sg * car.psi > 0) car.psi *= -E_WALL;
        car.bet *= 0.5;
        car.pd = -sg * Math.min(2, vn * E_WALL);
        car.v = car.v >= 0 ? Math.max(car.v * 0.4, car.v - 0.9 * vn) : Math.min(0, car.v + 0.9 * vn);
        if (hum(s, car) && vn > 4.5 && car.fin < 0) car.slip = Math.max(car.slip, 0.45);
        if (main && car.wall <= 0 && vn > 0.8) { car.wall = 0.45; const e = edgeAt(g, car.s); ev.push({ type: 'boing', who: car.id, side: sg, kind: e.kind, bridge: e.kind === 'rail' }); }
      }
      if (main && car.v > 5) car.v -= 12 * h;     // strisciando contro il muro si frena forte
    }
    // ostacoli: alberi, rocce, ceppi, cespugli, cumuli, castelli di sabbia (fascia fuori strada) e quelli "non tagliare"
    let P = null;
    const reach = Math.abs(car.d) + HL + HW;   // fin dove può arrivare un angolo del rettangolo
    if (reach > PROP_IN - 0.2) {
      const b0 = Math.floor(car.s / 8);
      for (let b = b0 - 1; b <= b0 + 1; b++) {
        const L = g.pb.get(b);
        if (L) for (const ob of L) { P = P || pose(g, car); const q = obstacle(s, g, car, P, ob, ev, main); if (q) P = q; }
      }
    }
    if (reach > HALF) for (const rk of g.rocks) {
      if (Math.abs(car.s - rk.s) > 6 || Math.abs(car.d - rk.d) > rk.r + HL + HW) continue;
      P = P || pose(g, car);
      const q = obstacle(s, g, car, P, rk, ev, main);
      if (q) P = q;
    }
  }
  function obstacle(s, g, car, P, ob, ev, main) {
    const hit = hitCircleW(P, ob.x, ob.y, ob.r);
    if (!hit) return null;
    moveW(car, P, -hit.nx * hit.depth, -hit.ny * hit.depth);
    const [wx, wy] = velW(car, P), vn = wx * hit.nx + wy * hit.ny;
    if (vn > 0) {
      // alberi, rocce e vasi fermano (e un urto deciso fa girare); cespugli, cumuli e castelli di sabbia meno
      const soft = SOFT[ob.k], e = soft ? 0.12 : 0.3, tx = -hit.ny, ty = hit.nx, vt = wx * tx + wy * ty;
      const jt = clamp(vt, -MU_CAR * (1 + e) * vn, MU_CAR * (1 + e) * vn);
      setVelW(car, P, wx - (1 + e) * vn * hit.nx - jt * tx, wy - (1 + e) * vn * hit.ny - jt * ty);
      car.bet *= 0.5;
      if (!soft && hum(s, car) && vn > 5 && car.fin < 0) car.slip = Math.max(car.slip, 0.5);
      if (main && car.wall <= 0 && vn > 0.8) { car.wall = 0.5; ev.push({ type: 'rock', who: car.id, k: ob.k || 'rock' }); }
    }
    return pose(g, car);
  }
  // la nuvoletta: Hari sparisce in una nuvola di fiori e torna sulla strada un po' più indietro (tempo perso, niente danni)
  function rescue(s, g, car, ev) {
    if (car.res > 0 || car.fin >= 0) return;
    car.res = RESCUE; car.v = 0; car.pd = 0; car.bet = 0; car.dr = 0; car.mini = 0; car.boost = 0; car.stuck = 0; car.air = 0; car.spr = 0;
    s.nres = (s.nres || 0) + 1;
    ev.push({ type: 'rescue', who: car.id, s: +car.s.toFixed(2), d: +car.d.toFixed(2) });
  }
  function rescueStep(s, g, car, ev, h) {
    const was = car.res;
    car.res = Math.max(0, car.res - h);
    if (was > RESCUE / 2 && car.res <= RESCUE / 2) {
      // a metà: posato sulla strada 6 m più indietro, nel posto libero più vicino alla traiettoria ideale
      const sv = Math.max(PREROLL - 8, car.s - 6), i = clamp(Math.round(sv), 0, g.N);
      const cand = [g.line[i], 0, 2.4, -2.4, 3.4, -3.4];
      let best = cand[0], bd = -1;
      for (const d of cand) {
        let free = 1e9;
        for (const o of s.cars) if (o !== car && !ghost(s, o)) free = Math.min(free, Math.hypot((o.s - sv) * 0.6, o.d - d));
        if (free > 4.5) { best = d; bd = free; break; }
        if (free > bd) { bd = free; best = d; }
      }
      car.s = sv; car.d = best; car.psi = 0; car.bet = 0; car.v = 0; car.pd = 0; car.off = false; car.slip = 0;
    }
    if (car.res <= 0) { car.gh = 1; ev.push({ type: 'back', who: car.id }); }
  }

  /* ---------- fisica di Hari ---------- */
  const isOff = (car) => Math.abs(car.d) > HALF + SHOULDER;
  function topSpeed(c, car, g) {
    let top = c.vmax * (1 + PU.acornV * Math.min(PU.acornMax, car.ac));
    if (car.boost > 0) top = c.vmax * PU.boostV;
    else if (car.mini > 0) top = Math.max(top, c.vmax * 1.12);
    if (car.slow > 0) top = Math.min(top, c.vmax * PU.slowV);
    if (car.honey) top = Math.min(top, c.vmax * PU.honeyV);
    if (isOff(car)) top = Math.min(top, c.vmax * SURF[c.theme].cap);
    return top;
  }
  // aderenza limitata: la direzione di marcia gira al massimo di (aderenza / v); il muso può girare un po' di più e
  // allora l'auto derapa (bet cresce); con aderenza in avanzo bet torna a zero. Entrando in curva troppo veloci si va
  // larghi (e si finisce sull'erba): le curve strette vanno prese frenando. Una derapata tenuta dà una mini-spinta.
  function drivePlayer(s, g, c, car, inp, ev, h) {
    if (car.res > 0) { rescueStep(s, g, car, ev, h); return; }
    const done = car.fin >= 0;
    let steer = done ? 0 : inp.steer, brake = inp.brake;
    let gas = inp.gas < 0 ? (brake ? 0 : 1) : inp.gas;
    if (done) { brake = car.v > 6 ? 1 : 0; gas = brake ? 0 : 1; }
    const kt = kAt(g, car.s), off = isOff(car), sf = SURF[c.theme];
    const top = topSpeed(c, car, g);
    // motore, freno e retromarcia (da fermi il freno tirato fa andare indietro)
    if (brake) {
      if (car.v > 0.3) car.v = Math.max(0, car.v - BRAKE * h);
      else car.v = Math.max(-REV, car.v - ACC * 0.6 * h);
    } else if (gas > 0) {
      if (car.v < 0) car.v = Math.min(0, car.v + BRAKE * h);
      else car.v += ACC * gas * (car.boost > 0 ? 3 : car.mini > 0 ? 2.2 : 1) * Math.max(0, 1 - car.v / top) * h;
    } else if (car.v !== 0) {
      const dv = (COAST + 0.0025 * car.v * car.v) * h;
      car.v = Math.abs(car.v) <= dv ? 0 : car.v - Math.sign(car.v) * dv;
    }
    if (car.v > top) car.v = Math.max(top, car.v - (car.honey ? 14 : off ? sf.drag : 9) * h);
    // sterzo (+ aiutino che riallinea alla pista, solo nei primi livelli)
    const slip = car.slip > 0;
    if (slip) steer = 0;
    let kReq = -steer * KMAX;
    const w = slip ? 0 : c.assist * (1 - Math.min(1, Math.abs(steer)) * 0.7);
    if (w > 0 && car.v > 1) kReq += w * (kt + (clamp(-0.1 * car.d, -0.35, 0.35) - car.psi) * 1.4 / Math.max(8, car.v));
    let grip = GRIP * c.grip * (off ? sf.grip : 1) * (1 + 1.5 * Math.abs(bankAt(g, car.s)));
    if (brake && car.v > 3) grip *= 0.82;
    const flying = car.air > 0 && !car.spr, va = Math.abs(car.v);
    // a fondo corsa lo sterzo chiede al massimo DRIFT.lock volte l'aderenza: tenendolo si derapa (mai un testacoda
    // per uno sterzo tenuto); se la curva chiede di più, si va larghi
    const kCap = Math.min(KMAX * 1.15, DRIFT.lock * grip / Math.max(1, va * va));
    kReq = clamp(kReq, -kCap, kCap);
    let wv = 0, r = 0;
    if (!flying) {
      const rd = kReq * car.v, wMax = grip / Math.max(1, va);
      const want = rd + car.bet * 4.5;
      wv = clamp(want, -wMax, wMax);
      r = clamp(rd, -wMax * 1.6, wMax * 1.6);
      // oltre l'aderenza le gomme strisciano: si perde velocità in proporzione a quanto si chiede di troppo
      const ex = (Math.abs(want) - wMax) * va;
      if (ex > 0) car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), Math.min(1.2, 0.08 * ex) * h);
      if (car.air > 0) { wv *= 0.6; r *= 0.6; }
      car.bet = clamp(car.bet + (r - wv) * h, -DRIFT.max, DRIFT.max);
    }
    car.kc = va > 0.5 ? wv / Math.max(1, va) : 0;
    car.slide = Math.abs(car.bet) * va;
    const s0 = car.s;
    // un passo in coordinate di Frenet nella direzione di marcia (+ la spinta laterale che si smorza)
    const a = car.psi - car.bet, den = Math.max(0.3, 1 - kt * car.d), sd = (car.v * Math.cos(a)) / den;
    car.s += sd * h;
    car.d += (car.v * Math.sin(a) + car.pd) * h;
    car.psi += (r - kt * sd) * h;
    car.pd *= Math.exp(-5 * h);
    if (Math.abs(car.pd) < 1e-3) car.pd = 0;
    // derapando si striscia (e si perde un po' di velocità)
    if (car.bet) { const dv = 4.5 * Math.abs(Math.sin(car.bet)) * h; car.v = Math.abs(car.v) <= dv ? 0 : car.v - Math.sign(car.v) * dv; }
    // non si gira mai al contrario: oltre 1,1 rad si raddrizza e rallenta
    if (Math.abs(car.psi) > 1.1) { car.psi = Math.sign(car.psi) * 1.1; car.v = car.v > 0 ? Math.max(0, car.v - 4 * h) : car.v; }
    // troppa deriva: sbandata (un giro buffo, si rallenta e per un attimo non si sterza)
    if (Math.abs(car.bet) > DRIFT.spin && car.v > 8 && !done) {
      car.slip = Math.max(car.slip, 0.8); car.v *= 0.55; car.bet *= 0.3; car.dr = 0;
      ev.push({ type: 'spin', who: car.id });
    }
    // derapata tenuta → mini-spinta all'uscita
    const ab = Math.abs(car.bet);
    if (!off && !flying && car.v > 10 && ab > DRIFT.on && !done) { if (car.dr <= 0) ev.push({ type: 'drift', who: car.id }); car.dr += h; }
    else if (car.dr > 0 && (ab < DRIFT.off || off || car.v < 8 || done)) {
      if (!off && !done && car.dr >= DRIFT.t1 && car.v >= 8) {
        const lvl = car.dr >= DRIFT.t2 ? 2 : 1;
        car.mini = lvl === 2 ? DRIFT.T2 : DRIFT.T1; car.v += lvl === 2 ? DRIFT.v2 : DRIFT.v1;
        ev.push({ type: 'mini', who: car.id, lvl });
      }
      car.dr = 0;
    }
    // dossi: troppo veloci si salta un pochino (niente sterzo in aria)
    if (car.air > 0) { car.air = Math.max(0, car.air - h); if (car.air <= 0) car.spr = 0; }
    for (const cr of g.crests) {
      if (s0 < cr.s && car.s >= cr.s && car.v > 16.5 && car.air <= 0) {
        car.air = car.airT = +Math.min(0.6, 0.15 + (car.v - 16.5) * 0.06).toFixed(3);
        ev.push(s.hu ? { type: 'jump', v: car.v, who: car.id } : { type: 'jump', v: car.v });
      }
    }
    edges(s, g, car, ev, true, h);
    if (car.res > 0) return;
    const nowOff = isOff(car);
    if (nowOff !== car.off) {
      car.off = nowOff;
      const e = nowOff ? { type: 'off', surf: sf.k } : { type: 'on' };
      if (s.hu) e.who = car.id;
      ev.push(e);
    }
    if (nowOff) s.offT += h;
    // fermi fuori strada (incastrati tra gli alberi): dopo un po' arriva la nuvoletta
    if (nowOff && !done && va < 1.5 && (gas > 0 || brake)) car.stuck += h; else car.stuck = Math.max(0, car.stuck - h);
    if (car.stuck > 2.5) rescue(s, g, car, ev);
  }

  /* ---------- avversari ---------- */
  const ghost = (s, car) => (car.fin >= 0 && car.s > PREROLL + s.L + 15) || car.res > 0;
  // a due: l'umano più avanti ancora in gara (riferimento del rubber band)
  function lead(s) {
    let b = null;
    for (const id of s.hu) { const c = s.cars[id]; if (c.fin < 0 && (!b || c.s > b.s)) b = c; }
    return b;
  }
  function driveAI(s, g, c, car, ev, solo, h = TICK) {
    const dt = h, done = car.fin >= 0;
    const i = clamp(Math.round(car.s), 0, g.N);
    // rubber band moderato: chi è indietro rispetto a Hari va un po' più forte; chi è davanti non rallenta mai
    const p = s.hu ? lead(s) : s.cars[0];
    const rb = !solo && !done && p && p.fin < 0 ? 1 + c.rb * clamp((p.s - car.s - 12) / 70, 0, 1) : 1;
    // velocità: profilo sulla traiettoria ideale × bravura, rettilinei quasi a tavoletta
    const look = clamp(Math.round(car.s + 2 + car.v * 0.25), 0, g.N);
    let vt = Math.min(g.prof[i], g.prof[look]) * Math.min(1.02, car.skill * rb);
    vt = Math.min(vt, c.vmax * c.aiTop * rb * (1 + PU.acornV * Math.min(PU.acornMax, car.ac)));
    if (car.boost > 0) vt = Math.max(vt, Math.min(c.vmax * PU.boostV, g.prof[look] * 1.12));
    // errori umani (poco frequenti): curva larga o alzata del piede
    if (car.err > 0) {
      car.err -= dt;
      vt *= car.errK === 1 ? 0.62 : 0.72;
    } else if (!done && car.s > PREROLL + 120 && rngNext(s) < (c.aiErr * car.v * dt) / 1000 * (1.15 - car.skill) * 3) {
      car.errK = rngNext(s) < 0.55 ? 1 : 2; car.err = car.errK === 1 ? 2.4 : 1.8;
      car.errD = Math.sign(kAt(g, car.s + 25)) || (rngNext(s) < 0.5 ? 1 : -1);
    }
    if (done) vt = Math.min(vt, 7);
    // traiettoria: la linea ideale guardando un po' avanti, ognuno con una piccola preferenza di corsia
    const ahead = clamp(Math.round(car.s + 5 + car.v * 0.3), 0, g.N);
    let tgt = g.line[ahead] + car.lane * 0.22;
    if (car.err > 0 && car.errK === 1) tgt = -car.errD * (HALF + 2.2);        // largo, fin sull'erba
    // scansa bucce e pozze di miele viste in tempo (i più bravi le vedono prima)
    if (car.air <= 0) for (const hz of s.hz) {
      const ds = hz.s - car.s, r = hz.k === 'h' ? PU.honeyR : PU.bananaR;
      if (ds > 2 && ds < 12 + 22 * car.skill && Math.abs(hz.d - tgt) < r + HW + 0.4) {
        const sd = hz.d > tgt ? -1 : 1, alt = hz.d + sd * (r + HW + 0.6);
        tgt = Math.abs(alt) < HALF - 0.6 ? alt : hz.d - sd * (r + HW + 0.6);
      }
    }
    // sorpasso: chi è più lento davanti sulla nostra linea si passa di lato (scelta tenuta per un po'); se non c'è
    // spazio si resta in scia senza tamponare
    if (car.ovT > 0) car.ovT -= dt;
    for (const o of s.cars) {
      if (o === car || (solo && hum(s, o)) || ghost(s, o)) continue;
      const ds = o.s - car.s;
      if (ds > 0 && ds < 14 + car.v * 0.45 && Math.abs(o.d - tgt) < CAR_W + 0.6) {
        const closing = car.v - o.v;
        if (closing > -0.5 || ds < 7) {
          let side = car.ovT > 0 ? car.ovS : (tgt >= o.d ? 1 : -1);
          const room = (sd) => Math.abs(o.d + sd * (CAR_W + 0.8)) < HALF - 0.6;
          if (!room(side)) side = -side;
          if (room(side)) { tgt = o.d + side * (CAR_W + 0.8); if (car.ovT <= 0) { car.ovS = side; car.ovT = 1.4; } }
          else if (ds < 9) vt = Math.min(vt, o.v + Math.max(0, ds - CAR_L - 2) * 0.8);
        }
      } else if (Math.abs(ds) < CAR_L + 0.6 && Math.abs(o.d - car.d) < CAR_W + 0.5) {
        // affiancati: ci si allarga un pochino per non strusciarsi
        tgt = o.d + Math.sign(car.d - o.d || car.lane || 1) * (CAR_W + 0.7);
      }
    }
    const room = Math.min(limAt(g, car.s + 6) - HW - 0.45, HALF + 2.2);
    tgt = clamp(tgt, -room, room);
    // velocità massima effettiva (miele, nuvoletta, erba)
    vt = Math.min(vt, topSpeed(c, car, g) * (car.boost > 0 ? 1 : 0.999) * (car.boost > 0 ? 1 : rb));
    if (car.slip > 0) vt = Math.min(vt, car.v);
    // motore e freni (un po' più dolci in frenata)
    if (car.v < vt) car.v += ACC * (car.boost > 0 ? 3 : 1) * Math.max(0, 1 - car.v / (c.vmax * (car.boost > 0 ? PU.boostV : 1.04) * rb)) * dt;
    else car.v = Math.max(vt, car.v - (car.honey ? 14 : 9) * dt);
    const rate = (2.2 + 1.4 * car.skill) * Math.min(1, car.v / 8);
    const lat = car.slip > 0 ? Math.sin(car.slip * 14) * 1.2 * dt : clamp(tgt - car.d, -rate * dt, rate * dt);
    if (car.air > 0) { car.air = Math.max(0, car.air - dt); if (car.air <= 0) car.spr = 0; }
    const kt = kAt(g, car.s);
    const den = Math.max(0.3, 1 - kt * car.d);
    car.s += (car.v * Math.cos(car.psi) / den) * dt;
    car.d += lat + car.pd * dt;
    car.pd *= Math.exp(-5 * dt);
    if (Math.abs(car.pd) < 1e-3) car.pd = 0;
    // il muso segue la direzione in cui si sposta, girando con gradualità (niente scatti nell'ingombro)
    const pw = clamp(Math.atan2(lat / dt, Math.max(1, car.v)), -0.35, 0.35);
    car.psi += clamp(pw - car.psi, -2.5 * dt, 2.5 * dt);
    car.kc = kt;
    edges(s, g, car, ev, true, dt);
    car.off = isOff(car);
  }

  /* ---------- power-up ---------- */
  const acornTaken = (s, j) => { const q = j >> 2; return q < s.ag.length && ((parseInt(s.ag[q], 16) >> (j & 3)) & 1) === 1; };
  function takeAcorn(s, j) {
    const q = j >> 2;
    while (s.ag.length <= q) s.ag += '0';
    const v = parseInt(s.ag[q], 16) | (1 << (j & 3));
    s.ag = s.ag.slice(0, q) + v.toString(16) + s.ag.slice(q + 1);
  }
  function rollItem(s, c, car, place) {
    const w = IW[clamp(place, 1, 4)].slice();
    if (!hum(s, car)) for (let j = 0; j < 7; j++) if (OFFENSIVE[j + 1]) w[j] *= c.aiItem;
    let tot = 0;
    for (const x of w) tot += x;
    let u = rngNext(s) * tot;
    for (let j = 0; j < 7; j++) { u -= w[j]; if (u < 0) return j + 1; }
    return 1;
  }
  // chi è subito davanti in classifica (bersaglio della nuvoletta)
  function aheadOf(s, car) {
    let best = null;
    for (const o of s.cars) if (o !== car && o.fin < 0 && o.s > car.s && (!best || o.s < best.s)) best = o;
    return best;
  }
  function useItem(s, g, c, car, ev) {
    const it = car.it;
    if (!it) return;
    car.it = 0; car.hold = 0;
    ev.push({ type: 'use', who: car.id, it: ITEMS[it] });
    switch (ITEMS[it]) {
      case 'carrot': car.boost = PU.boostT; car.v = Math.min(c.vmax * PU.boostV, car.v + 2.5); break;
      case 'bubble': car.sh = PU.shieldT; break;
      case 'banana': case 'honey': {
        const k = ITEMS[it] === 'banana' ? 'b' : 'h';
        s.hz.push({ k, s: +(car.s - HL - (k === 'h' ? PU.honeyR + 0.6 : 1.2)).toFixed(2), d: +car.d.toFixed(2), t: +(s.t + PU.hazT).toFixed(2), by: car.id, n: s.nhz++ });
        while (s.hz.length > PU.maxHaz) s.hz.shift();
        break;
      }
      case 'cloud': {
        const o = aheadOf(s, car);
        s.cl.push({ s: +(car.s + HL).toFixed(2), d: +car.d.toFixed(2), to: o ? o.id : -1, by: car.id, t: +(s.t + 9).toFixed(2) });
        break;
      }
      case 'magnet': car.mag = PU.magT; break;
      case 'spring': car.air = car.airT = PU.springT; car.spr = 1; car.v = Math.min(c.vmax * 1.08, car.v + 2.5); ev.push({ type: 'spring', who: car.id }); break;
      default: break;
    }
  }
  // un buffo inconveniente: lo scudo-bolla lo assorbe (e scoppia)
  function shielded(car, ev) {
    if (car.sh > 0) { car.sh = 0; ev.push({ type: 'pop', who: car.id }); return true; }
    return false;
  }
  function aiItems(s, g, c, car, ev) {
    if (!car.it || car.fin >= 0) return;
    car.hold += TICK;
    // deciso: un attimo di esitazione (i meno bravi aspettano di più), poi lo usa
    if (car.use > 0) { car.use -= TICK; if (car.use <= 0) { car.use = 0; useItem(s, g, c, car, ev); } return; }
    const name = ITEMS[car.it];
    let go = false;
    const i = clamp(Math.round(car.s), 0, g.N);
    if (name === 'carrot') {
      let ok = true;
      for (let q = i; q < Math.min(g.N, i + 70); q += 7) if (g.prof[q] < c.vmax * 0.92) { ok = false; break; }
      go = ok || car.hold > 9;
    } else if (name === 'bubble') go = car.hold > 0.8;
    else if (name === 'banana' || name === 'honey') {
      go = car.hold > 9 || s.cars.some((o) => o !== car && o.fin < 0 && car.s - o.s > 5 && car.s - o.s < 26 && Math.abs(o.d - car.d) < 2.2);
    } else if (name === 'cloud') { const o = aheadOf(s, car); go = (o && o.s - car.s < 160 && car.hold > 0.7) || car.hold > 10; }
    else if (name === 'magnet') go = car.hold > 1.5;
    else if (name === 'spring') {
      go = car.hold > 10 || s.hz.some((h) => h.s - car.s > 8 && h.s - car.s < 16 && Math.abs(h.d - car.d) < 2);
    }
    if (go) car.use = 0.15 + rngNext(s) * 0.8 * (1.2 - car.skill);
  }
  function items(s, g, c, ev, solo) {
    const cars = s.cars;
    // scatole-sorpresa
    for (const car of cars) {
      if ((solo && hum(s, car)) || car.fin >= 0 || car.res > 0) continue;
      for (let r = 0; r < g.boxes.length; r++) {
        const row = g.boxes[r];
        if (Math.abs(row.s - car.s) > 3) continue;
        for (let j = 0; j < row.row.length; j++) {
          const id = r * 4 + j;
          if (!hitCircle(car, row.s, row.row[j], PU.boxR)) continue;
          if (s.bx.some((b) => b[0] === id && b[1] > s.t)) continue;
          s.bx = s.bx.filter((b) => b[1] > s.t);
          s.bx.push([id, +(s.t + PU.boxBack).toFixed(2)]);
          if (!car.it) {
            car.it = rollItem(s, c, car, placeOf(s, car.id)); car.hold = 0; car.use = 0;
            ev.push({ type: 'box', who: car.id, it: ITEMS[car.it] });
          } else ev.push({ type: 'box', who: car.id, it: '' });
        }
      }
    }
    // ghiande bonus (la calamita le attira da lontano)
    for (const car of cars) {
      if ((solo && hum(s, car)) || car.fin >= 0 || car.res > 0) continue;
      const R2 = car.mag > 0 ? PU.magR : 0;
      for (let j = 0; j < g.acorns.length; j++) {
        const a = g.acorns[j];
        if (a.s < car.s - 4 - R2) continue;
        if (a.s > car.s + 4 + R2) break;
        if (acornTaken(s, j)) continue;
        if (R2 ? Math.hypot(a.s - car.s, a.d - car.d) < R2 : hitCircle(car, a.s, a.d, PU.acornR)) {
          takeAcorn(s, j);
          car.ac = Math.min(99, car.ac + 1);
          ev.push({ type: 'acorn', who: car.id, n: car.ac, j });
        }
      }
    }
    // bucce di banana e pozze di miele
    for (const car of cars) car.honey = 0;
    if (s.hz.length && s.hz.some((h) => h.t <= s.t)) s.hz = s.hz.filter((h) => h.t > s.t);
    for (let q = s.hz.length - 1; q >= 0; q--) {
      const h = s.hz[q];
      for (const car of cars) {
        if ((solo && hum(s, car)) || ghost(s, car) || car.air > 0.15) continue;
        if (Math.abs(h.s - car.s) > 5) continue;
        if (h.k === 'b') {
          if (!hitCircle(car, h.s, h.d, PU.bananaR)) continue;
          s.hz.splice(q, 1);
          if (!shielded(car, ev)) {
            car.slip = PU.slipT; car.v *= 0.72; car.ac = Math.max(0, car.ac - 2); car.dr = 0;
            ev.push({ type: 'slip', who: car.id, by: h.by });
          }
          break;
        } else if (hitCircle(car, h.s, h.d, PU.honeyR)) {
          if (car.sh > 0) { shielded(car, ev); continue; }
          if (!car.honey && !car.inH) ev.push({ type: 'honey', who: car.id, by: h.by });
          car.honey = 1;
        }
      }
    }
    for (const car of cars) car.inH = car.honey;
    // nuvolette di fiori: volano lungo la pista fino a chi era davanti
    for (let q = s.cl.length - 1; q >= 0; q--) {
      const cl = s.cl[q];
      const o = cl.to >= 0 ? cars[cl.to] : null;
      if (!o || o.fin >= 0 || o.res > 0 || s.t > cl.t || (solo && hum(s, o))) {
        // nessun bersaglio: vola avanti ancora un po' e svanisce
        cl.to = -1; cl.s += PU.cloudV * TICK;
        cl.life = (cl.life === undefined ? 1.5 : cl.life) - TICK;
        if (cl.life <= 0) s.cl.splice(q, 1);
        continue;
      }
      cl.s += (o.v + PU.cloudV) * TICK;
      cl.d += clamp(o.d - cl.d, -4 * TICK, 4 * TICK);
      if (cl.s >= o.s - 1) {
        s.cl.splice(q, 1);
        if (!shielded(o, ev)) { o.slow = PU.slowT; ev.push({ type: 'cloud', who: o.id, by: cl.by }); }
      }
    }
    // timer
    for (const car of cars) {
      if (car.boost > 0) car.boost = Math.max(0, car.boost - TICK);
      if (car.sh > 0) car.sh = Math.max(0, car.sh - TICK);
      if (car.slip > 0) car.slip = Math.max(0, car.slip - TICK);
      if (car.slow > 0) car.slow = Math.max(0, car.slow - TICK);
      if (car.mag > 0) car.mag = Math.max(0, car.mag - TICK);
      if (car.mini > 0) car.mini = Math.max(0, car.mini - TICK);
    }
  }

  /* ---------- contatti morbidi tra auto (nel mondo) ---------- */
  // SAT tra i rettangoli veri (pose nel mondo, le stesse della grafica), separazione completa lungo l'asse di minima
  // compenetrazione, impulso; fino a 10 giri finché nessuno si tocca più, rimettendo dentro ai muri chi è stato spinto.
  // Chi è appena stato posato dalla nuvoletta (gh) non urta e non viene urtato finché non è libero.
  const PS = [null, null, null, null], MV = [false, false, false, false];
  function contacts(s, g, ev, solo) {
    const cs = s.cars, n = cs.length;
    // pose calcolate solo per le auto vicine a qualcun altro (la maggior parte del tempo nessuna)
    for (let a = 0; a < n; a++) PS[a] = null;
    const ps = (a) => PS[a] || (PS[a] = pose(g, cs[a]));
    let ghostHit = 0;
    for (let it = 0; it < 10; it++) {
      let any = false;
      MV[0] = MV[1] = MV[2] = MV[3] = false;
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const A = cs[a], B = cs[b];
        if (solo && (hum(s, A) || hum(s, B))) continue;
        if (ghost(s, A) || ghost(s, B)) continue;
        if ((A.spr && A.air > 0.2) || (B.spr && B.air > 0.2)) continue;   // salto a molla: si passa sopra
        if (Math.abs(A.s - B.s) > CAR_L + 4 || Math.abs(A.d - B.d) > CAR_L + 1) continue;
        const o = overlapW(ps(a), ps(b));
        if (!o) continue;
        if (A.gh || B.gh) { ghostHit |= (A.gh ? 1 << a : 0) | (B.gh ? 1 << b : 0); continue; }
        any = true;
        // lo scudo-bolla non si sposta: la spinta va tutta all'altro (e lo scudo scoppia)
        let wA = 0.5, wB = 0.5;
        if (A.sh > 0 && !(B.sh > 0)) { wA = 0; wB = 1; } else if (B.sh > 0 && !(A.sh > 0)) { wA = 1; wB = 0; }
        const dep = o.depth + 2e-3;
        moveW(A, PS[a], -o.nx * dep * wA, -o.ny * dep * wA);
        moveW(B, PS[b], o.nx * dep * wB, o.ny * dep * wB);
        const [ax, ay] = velW(A, PS[a]), [bx, by] = velW(B, PS[b]);
        const vn = (ax - bx) * o.nx + (ay - by) * o.ny;
        if (vn > 0) {
          const J = (1 + E_CAR) * vn, tx = -o.ny, ty = o.nx;
          const vt = (ax - bx) * tx + (ay - by) * ty, Jt = clamp(vt, -MU_CAR * J, MU_CAR * J);
          setVelW(A, PS[a], ax - (J * o.nx + Jt * tx) * wA, ay - (J * o.ny + Jt * ty) * wA);
          setVelW(B, PS[b], bx + (J * o.nx + Jt * tx) * wB, by + (J * o.ny + Jt * ty) * wB);
          A.bet *= 0.7; B.bet *= 0.7;
          if (vn > 0.5) {
            if (wA === 0) shielded(A, ev); else if (wB === 0) shielded(B, ev);
          }
          if (s.hu) {
            // a due: l'evento va a ciascun umano coinvolto (by), con l'altro kart in who
            if (s.bumpT <= 0 && vn > 0.3 && (hum(s, A) || hum(s, B))) {
              s.bumpT = 0.6;
              if (hum(s, A)) ev.push({ type: 'bump', who: B.id, a: A.id, b: B.id, vn, by: A.id });
              if (hum(s, B)) ev.push({ type: 'bump', who: A.id, a: A.id, b: B.id, vn, by: B.id });
            }
          } else if ((!A.id || !B.id) && s.bumpT <= 0 && vn > 0.3) { s.bumpT = 0.6; ev.push({ type: 'bump', who: A.id === 0 ? B.id : A.id, a: A.id, b: B.id, vn }); }
        }
        PS[a] = pose(g, A); PS[b] = pose(g, B);
        MV[a] = MV[b] = true;
      }
      // le spinte possono aver portato qualcuno contro un muro o un ostacolo: lo si rimette dentro (e si ricontrolla)
      for (let a = 0; a < n; a++) if (MV[a]) { edges(s, g, cs[a], ev, false); PS[a] = null; }
      if (!any) break;
    }
    for (let a = 0; a < n; a++) if (cs[a].gh && !(ghostHit & (1 << a))) cs[a].gh = 0;
  }

  /* ---------- passo fisso ---------- */
  // quanti sotto-passi: SUB se due kart sono vicini o qualcuno è fuori dalla carreggiata (muri, ostacoli), altrimenti 1
  function subs(s) {
    const cs = s.cars;
    for (let a = 0; a < cs.length; a++) {
      const A = cs[a];
      if (A.fin >= 0 && A.s > PREROLL + s.L + 15) continue;
      if (Math.abs(A.d) > HALF - 1 || A.res > 0) return SUB;
      for (let b = a + 1; b < cs.length; b++) { const B = cs[b]; if (Math.abs(A.s - B.s) < CAR_L + 10 && Math.abs(A.d - B.d) < CAR_W + 4) return SUB; }
    }
    return 1;
  }
  function tick(s, input) {
    const ev = [];
    const g = geo(s), c = config(s.level), inp = cleanInput(input === undefined ? s.inp : input);
    s.t += TICK;
    if (s.bumpT > 0) s.bumpT -= TICK;
    for (const car of s.cars) if (car.wall > 0) car.wall -= TICK;
    const p = me(s), n = subs(s), h = TICK / n;
    // sotto-passi (quando qualcuno è vicino a un altro kart, a un muro o a un ostacolo): movimento di tutti, poi
    // collisioni risolte nel mondo
    for (let k = 0; k < n; k++) {
      drivePlayer(s, g, c, p, inp, ev, h);
      for (const car of s.cars) if (car.id) driveAI(s, g, c, car, ev, false, h);
      contacts(s, g, ev);
    }
    if (inp.use && p.fin < 0 && !(p.res > 0)) useItem(s, g, c, p, ev);
    if (s.inp) s.inp.use = 0;   // il tasto del power-up vale una volta sola
    for (const car of s.cars) if (car.id) aiItems(s, g, c, car, ev);
    items(s, g, c, ev);
    // traguardo
    const fin = PREROLL + s.L;
    for (const car of s.cars) {
      if (car.fin < 0 && car.s >= fin) {
        const over = (car.s - fin) / Math.max(1, car.v);
        car.fin = +(s.t - over).toFixed(3);
      }
      if (car.s > fin + RUNOFF - 10) { car.s = fin + RUNOFF - 10; car.v = 0; }
    }
    // note del navigatore e checkpoint
    while (s.called < g.notes.length && p.s >= g.notes[s.called].call) { ev.push({ type: 'call', i: s.called }); s.called++; }
    while (s.chk < g.checks.length && p.s >= g.checks[s.chk]) { s.chk++; ev.push({ type: 'check', n: s.chk, pos: placeOf(s) }); }
    // classifica e sorpassi
    let rk = order(s);
    if (rk.every((x, j) => x === s.rank[j])) rk = s.rank;
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
  // a gara finita per Hari (a due: per entrambi): gli avversari ancora in corsa arrivano (simulati senza gli umani) per
  // la classifica finale
  function finishAll(s, g, c) {
    const fin = PREROLL + s.L, hs = humans(s).map((id) => s.cars[id]);
    const keep = hs.map((p) => [p.s, p.v, p.d]);
    for (const p of hs) { p.s = fin + RUNOFF; p.d = 0; }
    const hz = s.hz;
    for (let n = 0; n < 60 * 400 && s.cars.some((x) => x.fin < 0); n++) {
      s.t += TICK;
      const ev = [], ns = subs(s), h = TICK / ns;
      for (const car of s.cars) if (car.wall > 0) car.wall -= TICK;
      for (let k = 0; k < ns; k++) {
        for (const car of s.cars) if (!hum(s, car) && car.fin < 0) driveAI(s, g, c, car, ev, true, h);
        contacts(s, g, ev, true);
      }
      for (const car of s.cars) if (!hum(s, car) && car.fin < 0) aiItems(s, g, c, car, ev);
      items(s, g, c, ev, true);
      for (const car of s.cars) if (!hum(s, car) && car.fin < 0 && car.s >= fin) car.fin = +(s.t - (car.s - fin) / Math.max(1, car.v)).toFixed(3);
    }
    for (const car of s.cars) if (car.fin < 0) car.fin = +(s.t + 999).toFixed(3);
    s.t = s.fin;
    s.hz = hz.filter((h2) => h2.t > s.t); s.cl = [];
    hs.forEach((p, j) => { [p.s, p.v, p.d] = keep[j]; });
  }

  /* ---------- passo fisso a due giocatori ---------- */
  // come tick(), con N umani (s.hu) che guidano con la fisica del giocatore, ognuno col suo input (s.inp[j]);
  // note, checkpoint e sorpassi per ciascuno (by = id dell'umano). La gara finisce quando sono arrivati tutti gli
  // umani (o LATE secondi dopo il primo: chi manca viene classificato col tempo stimato); si vince insieme se uno
  // dei due arriva primo (rimasto da solo, dopo un link caduto: tra i primi 3 come in singolo).
  const NOGAS = { steer: 0, gas: 0, brake: 0, use: 0 };
  function tickMulti(s) {
    const ev = [], H = s.hu;
    const g = geo(s), c = config(s.level);
    const ins = H.map((id, j) => (s.inp && s.inp[j] ? cleanInput(s.inp[j]) : NOGAS));
    s.t += TICK;
    if (s.bumpT > 0) s.bumpT -= TICK;
    for (const car of s.cars) if (car.wall > 0) car.wall -= TICK;
    const n = subs(s), h = TICK / n;
    for (let k = 0; k < n; k++) {
      for (const car of s.cars) {
        const j = H.indexOf(car.id);
        if (j >= 0) drivePlayer(s, g, c, car, ins[j], ev, h); else driveAI(s, g, c, car, ev, false, h);
      }
      contacts(s, g, ev);
    }
    H.forEach((id, j) => {
      const p = s.cars[id];
      if (ins[j].use && p.fin < 0 && !(p.res > 0)) useItem(s, g, c, p, ev);
      if (s.inp && s.inp[j]) s.inp[j].use = 0;
    });
    for (const car of s.cars) if (!hum(s, car)) aiItems(s, g, c, car, ev);
    items(s, g, c, ev);
    const fin = PREROLL + s.L;
    for (const car of s.cars) {
      if (car.fin < 0 && car.s >= fin) {
        const over = (car.s - fin) / Math.max(1, car.v);
        car.fin = +(s.t - over).toFixed(3);
      }
      if (car.s > fin + RUNOFF - 10) { car.s = fin + RUNOFF - 10; car.v = 0; }
    }
    // note del navigatore e checkpoint di ciascun umano
    for (const id of H) {
      const p = s.cars[id];
      p.nc = p.nc || 0; p.ck = p.ck || 0;
      while (p.nc < g.notes.length && p.s >= g.notes[p.nc].call) { ev.push({ type: 'call', i: p.nc, by: id }); p.nc++; }
      while (p.ck < g.checks.length && p.s >= g.checks[p.ck]) { p.ck++; ev.push({ type: 'check', n: p.ck, pos: placeOf(s, id), by: id }); }
    }
    const p0 = s.cars[0];
    if (p0.hm) { s.called = p0.nc; s.chk = p0.ck; }
    // classifica e sorpassi di ciascun umano
    let rk = order(s);
    if (rk.every((x, j) => x === s.rank[j])) rk = s.rank;
    for (const id of H) {
      const was = s.rank.indexOf(id), now = rk.indexOf(id), p = s.cars[id];
      if (now === was || p.fin >= 0) continue;
      if (now < was) { if (id === 0) s.moves += was - now; ev.push({ type: 'pass', up: true, who: s.rank[now], by: id }); }
      else ev.push({ type: 'pass', up: false, who: rk[was], by: id });
    }
    s.rank = rk;
    s.ps = H.map((id) => rk.indexOf(id) + 1);
    s.pos = rk.indexOf(0) + 1;
    // traguardo: tutti gli umani arrivati (o il ritardo massimo dopo il primo)
    if (!s.res) {
      const done = H.filter((id) => s.cars[id].fin >= 0);
      if (done.length && !(s.end >= 0)) s.end = +s.t.toFixed(3);
      if (done.length === H.length || (s.end >= 0 && s.t - s.end > LATE)) {
        for (const id of H) {
          const car = s.cars[id];
          if (car.fin < 0) { car.fin = +(s.t + Math.max(0, fin - car.s) / Math.max(4, 0.6 * c.vmax)).toFixed(3); car.late = 1; }
        }
        s.fin = +s.t.toFixed(3);
        finishAll(s, g, c);
        s.res = ranking(s).map((x) => ({ id: x.id, t: x.fin }));
        s.ps = H.map((id) => s.res.findIndex((r) => r.id === id) + 1);
        s.pos = s.res.findIndex((r) => r.id === 0) + 1;
        s.won = H.length > 1 ? s.ps.some((q) => q === 1) : s.ps[0] <= 3;
        ev.push({ type: 'finish', pos: s.pos, ps: s.ps.slice() });
        ev.push({ type: s.won ? 'win' : 'lose' });
      }
    }
    return ev;
  }
  // predizione locale (ospite in rete): solo la fisica del proprio kart (niente contatti né power-up: arrivano
  // dall'host), un passo fisso per volta
  function predict(s, id, dt, input) {
    const g = geo(s), c = config(s.level), car = s.cars[id], ev = [];
    if (!car || s.ready > 0 || s.fin >= 0 || car.res > 0) return ev;
    const inp = input ? cleanInput(input) : NOGAS;
    for (let t = 0; t < dt - 1e-9; t += TICK) drivePlayer(s, g, c, car, inp, ev, Math.min(TICK, dt - t));
    return ev;
  }

  /* ---------- tempo reale ---------- */
  function step(s, dt, input) {
    const ev = [];
    if (isOver(s) || !(dt > 0)) return ev;
    if (input !== undefined && s.hu) {
      // a due: un input per umano (nell'ordine di s.hu); null = nessun comando (fermi, senza acceleratore automatico)
      const arr = Array.isArray(input) ? input : [input], prev = Array.isArray(s.inp) ? s.inp : [];
      s.inp = s.hu.map((id, j) => {
        if (!arr[j]) return Object.assign({}, NOGAS, { use: prev[j] && prev[j].use ? 1 : 0 });
        const ci = cleanInput(arr[j]);
        if (prev[j] && prev[j].use && !ci.use) ci.use = 1;
        return ci;
      });
    } else if (input !== undefined) {
      const ci = cleanInput(input);
      // il tasto del power-up resta "in coda" finché un passo fisso non lo usa
      if (s.inp && s.inp.use && !ci.use) ci.use = 1;
      s.inp = ci;
    }
    if (s.ready > 0) {
      if (Array.isArray(s.inp)) s.inp.forEach((q) => { q.use = 0; });
      else if (s.inp) s.inp.use = 0;
      s.ready -= dt;
      const n = Math.ceil(s.ready - 0.2);
      if (n < s.cd && n >= 1 && n <= 3) { s.cd = n; ev.push({ type: 'count', n }); }
      if (s.ready > 0) return ev;
      dt = -s.ready; s.ready = 0; s.cd = 0; ev.push({ type: 'go' });
    }
    s.acc += Math.min(dt, 0.1);
    while (s.acc >= TICK - 1e-9) {
      s.acc -= TICK;
      ev.push(...(s.hu ? tickMulti(s) : tick(s)));
      if (isOver(s)) break;
    }
    return ev;
  }

  // prossime note (al massimo n) entro la distanza di chiamata, con i metri che mancano
  function upcoming(s, n = 2, id = 0) {
    const g = geo(s), p = s.cars[id] || me(s), out = [];
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
  // posizione di un umano (a due: s.ps; in singolo s.pos)
  const posOf = (s, id = 0) => { if (!s.hu) return s.pos || 4; const j = s.hu.indexOf(id); return j >= 0 && s.ps ? s.ps[j] || 4 : placeOf(s, id); };
  // fragoline per posizione: 1° = 3, 2° = 2, 3° = 1, 4° = 0 (anche in tempo reale, per l'indicatore). A due: quelle del
  // giocatore di questo telefono (s.me), sullo schermo diviso quelle del migliore dei due
  const rate = (s) => {
    if (!s.hu) return Math.max(0, 4 - (s.pos || 4));
    const pos = s.me != null ? posOf(s, s.me) : Math.min(...s.hu.map((id) => posOf(s, id)), 4);
    return Math.max(0, 4 - pos);
  };
  function progress(s) {
    if (s.won) return 1;
    let p = me(s);
    if (s.hu) p = s.cars[s.me != null ? s.me : 0];
    return clamp((p.s - PREROLL) / s.L, 0, s.fin >= 0 ? 0.99 : 0.98);
  }
  // tempo di riferimento (s): tappa a ~62% della velocità massima
  const par = (s) => Math.round(s.L / (config(s.level).vmax * 0.62));

  HH.rally = {
    TICK, SUB, READY, HALF, SHOULDER, WALL, WALLS, HARD, SURF, RAIL, TUBE, KMAX, GRIP, ACC, BRAKE, REV, OFFCAP, CALL, RUNOFF, PREROLL,
    CAR_L, CAR_W, DRIFT, RESCUE, PROP_IN, SOFT, FUN, WHO, BANDS, STAGES, THEMES, TIMES, ROT, ITEMS, PU, IW,
    CHARS, KART, LATE, toAI, predict, humans, posOf, tickMulti,
    solveLine, config, newLevel, migrate, track, geo, notes, deriveNotes, world, pose, nearest, height, kAt, bankAt, edgeAt, sideAt,
    gradeOf, ranking, placeOf, upcoming, obb, overlap, overlapW, hitCircle, hitCircleW, extent, acornTaken, aheadOf, isOff,
    step, tick, isOver, isWon, isLost, rate, progress, par,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
