/* Hari Fishing — logica pura (nessun DOM), macchina a stati deterministica e serializzabile.
 *
 * Hari pesca dal pontile, su un lago o sul mare. Niente violenza: il pesce si guarda, si fotografa, va nell'album e
 * torna in acqua con un cuoricino. Fasi di un lancio:
 *   aim    pronto a lanciare: cast(s, forza, mira) — la forza (0..1) decide la distanza (5..30 m)
 *   fly    l'amo vola (0,5–1,1 s), poi si posa: 'land'
 *   wait   sott'acqua: l'esca (s.lu, x −1..1 di lato, y 0..1 di profondità) si muove verso il bersaglio dato
 *          dall'input { lx, ly }; i pesci (s.sw) nuotano con comportamenti propri. Movimenti lenti e piccoli scatti
 *          li incuriosiscono (interesse 0..1: '?' → cuore → annusano l'esca → 'nibble' → abboccata); troppo veloci
 *          (velocità dell'esca > vFear della specie) li spaventano ('scare': scappano e per un po' sono diffidenti).
 *          Tirare di colpo mentre un pesce annusa lo spaventa ('early'); tirare piano riavvicina l'amo (sotto i 2 m
 *          si torna a 'aim' senza penalità: 'reel')
 *   bite   finestra (cfg.biteWin s) per ferrare tirando (reel > 0,35): 'hook'; se scade il pesce se ne va ('missed')
 *   fight  tira e molla: la tensione T deve restare nella finestra verde [tMin, tMax]
 *          sopra tMax si riempie il misuratore di rottura (brk): pieno = la lenza si rompe ('snap')
 *          sotto tMin si riempie quello di lenza molle (slk): pieno = il pesce si slama ('slack')
 *          (in entrambi i casi niente vite perse: si rilancia e si conta solo per le stelle)
 *          a 1 m dal pontile il pesce è preso ('catch')
 *   caught il pesce è in mano: release(s) lo rimette in acqua ('release'), e se l'obiettivo è raggiunto 'win'
 *   over   livello vinto
 *
 * Fisica della lenza (passi fissi da 1/60 s, stesso seme + stessi input = stessa partita):
 *   forza del pesce F = str · strMul · (0,35 + 0,75 · scatto) · (0,35 + 0,65 · fiato)
 *   tensione verso Ttar: base = 0,10 + 0,55 F; tirando (r > 0) base + r (0,55 − 0,1 F); mollando (r < 0) base (1 + 0,85 r)
 *   distanza: il pesce si allontana a 0,9 F · spd (di più se si molla), il mulinello recupera 2,6 r (meno se il pesce tira)
 *   il fiato cala con la tensione (più tiri, prima si stanca) e risale piano a lenza molle
 *   gli scatti (bursts) arrivano a caso: durano 0,5–1,4 s e fanno salire la forza
 *
 * Input: { reel, lx, ly }: reel in [-1, 1] > 0 tira (più è alto più tira), < 0 allenta; lx, ly = dove portare l'esca
 * sott'acqua (assenti = resta il bersaglio di prima). Telefono: tiltToReel(pitch − zero);
 * pitchFrom(beta, gamma, angolo dello schermo) = inclinazione del lato alto dello schermo; il lancio col telefono è
 * flick(det, t, pitch, acc): indietro e poi avanti di scatto → forza.
 *
 * API: SPECIES · config(level) · newLevel(level, rnd) · migrate(s) · cast(s, p, aim) · step(s, dt, inp) → eventi
 *      tick(s, inp) → eventi · release(s, photo) → eventi · isWon · isOver · progress · rate · par
 *      tiltToReel(dp) · pitchFrom(b, g, ang) · newFlick() · flick(det, t, pitch, acc) → forza o 0
 *      albumAdd(album, fish, photo) → { album, isNew, record } · fightFrac(s) · zones(s)
 *      mood(s) → espressione di Hari voluta · newMood() · moodStep(m, voluta, dt) → espressione mostrata (isteresi)
 * Esporta HH.fish.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const DT = 1 / 60;
  const D_MIN = 5, D_MAX = 30, LAND = 1;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- specie ----------
   * rar 1 comune · 2 non comune · 3 raro · 4 leggendario; where = lake | sea | both; minD = distanza minima dell'amo (m)
   * str = forza, spd = velocità e frequenza degli scatti, sta = fiato (s di tensione piena per stancarsi), g = grammi */
  // shy = diffidenza 0..1 (interesse più lento, si spaventa prima, resta diffidente più a lungo); dep = profondità preferita
  const SPECIES = [
    { id: 'minnow', rar: 1, where: 'lake', str: 0.45, spd: 0.9, sta: 6, minD: 0, g: [30, 120], shy: 0.1, dep: 0.3 },
    { id: 'goldfish', rar: 1, where: 'lake', str: 0.55, spd: 1.0, sta: 7, minD: 0, g: [80, 300], shy: 0.15, dep: 0.45 },
    { id: 'catfish', rar: 2, where: 'lake', str: 0.8, spd: 0.7, sta: 11, minD: 11, g: [600, 2500], shy: 0.35, dep: 0.8 },
    { id: 'koi', rar: 3, where: 'lake', str: 0.75, spd: 1.1, sta: 11, minD: 16, g: [800, 3000], shy: 0.55, dep: 0.55 },
    { id: 'clown', rar: 1, where: 'sea', str: 0.5, spd: 1.15, sta: 6, minD: 0, g: [60, 250], shy: 0.1, dep: 0.4 },
    { id: 'puffer', rar: 2, where: 'sea', str: 0.65, spd: 0.8, sta: 9, minD: 9, g: [200, 900], shy: 0.3, dep: 0.6 },
    { id: 'tuna', rar: 3, where: 'sea', str: 0.95, spd: 1.3, sta: 14, minD: 17, g: [2000, 9000], shy: 0.6, dep: 0.35 },
    { id: 'golden', rar: 4, where: 'both', str: 0.9, spd: 1.25, sta: 13, minD: 21, g: [500, 1500], from: 6, shy: 0.8, dep: 0.6 },
  ];
  const SP = Object.fromEntries(SPECIES.map((x) => [x.id, x]));
  const RAR_W = [0, 10, 5, 2.2, 0.7];

  /* ---------- curva di difficoltà ----------
   * k sale da 0 (livello 1) a 1 (livello 12): finestra di tensione più stretta, misuratori più rapidi, pesci più forti
   * e veloci, abboccata più breve. Obiettivo: 2 → 5 pesci; dal 3 anche una specie speciale (non comune, poi rara,
   * ogni 3 livelli dal 9 il pesce d'oro). Lago ai livelli 1, 2 e pari; mare ai dispari dal 3. */
  function config(level) {
    const L = Math.max(1, level | 0);
    const k = Math.min(1, (L - 1) / 11);
    const stage = L <= 2 || L % 2 === 0 ? 'lake' : 'sea';
    const pool = SPECIES.filter((x) => (x.where === stage || x.where === 'both') && L >= (x.from || 1)).map((x) => x.id);
    const local = (rar) => SPECIES.find((x) => x.where === stage && x.rar === rar).id;
    const target = L < 3 ? null : L >= 9 && L % 3 === 0 ? 'golden' : L >= 5 ? local(3) : local(2);
    const goal = Math.min(5, 2 + Math.floor((L - 1) / 2));
    return {
      level: L, k, stage, pool, target, goal,
      tMin: +(0.14 + 0.16 * k).toFixed(3), tMax: +(0.9 - 0.16 * k).toFixed(3),
      brkTime: 1.3 - 0.6 * k, slkTime: 2.6 - 1.2 * k,
      biteWin: 1.6 - 0.7 * k,
      strMul: 1 + 0.4 * k, spdMul: 1 + 0.35 * k,
      wait: [1.5 + k, 3.5 + 1.5 * k], nib: L === 1 ? 1 : 2,
      // sott'acqua: velocità dell'esca che spaventa (unità/s), interesse guadagnato al secondo, raggio in cui i pesci
      // la notano, quanti pesci ci sono e quanto lontano dall'esca compaiono
      vFear: +(1.25 - 0.4 * k).toFixed(3), lureG: +(0.95 - 0.45 * k).toFixed(3), sense: +(1 - 0.2 * k).toFixed(3),
      crowd: 3 + (L >= 4 ? 1 : 0) + (L >= 9 ? 1 : 0), spread: +(0.3 + 0.4 * k).toFixed(3),
      par: Math.round(goal * (32 + 22 * k) + (target ? 35 : 0)),
    };
  }

  /* ---------- generatore casuale nello stato (mulberry32) ---------- */
  function rnd(s) {
    let a = (s.seed = (s.seed + 0x6d2b79f5) >>> 0);
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  }
  const range = (s, a, b) => a + (b - a) * rnd(s);

  function newLevel(level, r = Math.random) {
    const c = config(level);
    return {
      v: 2, level: c.level, stage: c.stage, seed: (Math.floor(r() * 4294967296) >>> 0) || 1,
      phase: 'aim', t: 0, pt: 0, acc: 0, moves: 0,
      caught: [], lost: 0, snaps: 0, slacks: 0, misses: 0, since: 0,
      cast: null, d: 0, x: 0, T: 0, brk: 0, slk: 0, wait: 0, nib: 0, nibAt: -9, bite: 0, fish: null, won: false,
      lu: null, sw: null, lr: 0, scares: 0, nid: 0,
    };
  }
  // salvataggio: le fasi "in volo" o sott'acqua tornano a 'aim' (il galleggiante si riavvolge, nessuna penalità).
  // Le partite della v0.28 (v: 1, senza esca né pesci sott'acqua) passano a v: 2.
  function migrate(s) {
    if (!s || (s.v !== 1 && s.v !== 2) || !Array.isArray(s.caught)) return null;
    if (s.v === 1) { s.v = 2; s.lu = null; s.sw = null; s.lr = 0; s.scares = 0; s.nid = 0; }
    if (s.phase === 'fly' || s.phase === 'wait' || s.phase === 'bite') { s.phase = 'aim'; s.pt = 0; s.cast = null; s.d = 0; s.fish = null; s.lu = null; s.sw = null; }
    if (s.phase === 'fight') s.sw = null;
    s.acc = 0;
    return s;
  }
  const cfgOf = (s) => config(s.level);
  const hasTarget = (s) => { const t = cfgOf(s).target; return !t || s.caught.some((f) => f.sp === t); };
  const isWon = (s) => !!s.won;
  const isOver = (s) => !!s.won;

  // lancio: forza 0..1 (distanza 5..30 m), mira -1..1 (a sinistra / a destra)
  function cast(s, p, aim = 0) {
    if (s.phase !== 'aim') return [];
    p = clamp(+p || 0, 0, 1);
    s.phase = 'fly'; s.pt = 0; s.moves++;
    s.cast = { p, x: clamp(+aim || 0, -1, 1), d0: D_MIN + (D_MAX - D_MIN) * p, fly: 0.5 + 0.6 * p };
    s.d = 0; s.x = s.cast.x; s.T = 0; s.brk = 0; s.slk = 0; s.fish = null; s.lu = null; s.sw = null;
    return [{ type: 'cast', p }];
  }

  // specie di un pesce sott'acqua: tra quelle del livello raggiungibili a questa distanza (le non comuni pesano di più
  // più l'amo è lontano)
  function pickSp(s) {
    const c = cfgOf(s);
    const ok = c.pool.filter((id) => SP[id].minD <= s.d);
    const far = s.d / D_MAX;
    const w = ok.map((x) => RAR_W[SP[x].rar] * (SP[x].rar > 1 ? 1 + 2 * far : 1));
    let r = rnd(s) * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r <= 0) return ok[i]; }
    return ok[ok.length - 1];
  }
  // il pesce che ha abboccato: la specie speciale conta le abboccate senza di lei (garanzia dopo 2)
  function makeFish(s, id) {
    const c = cfgOf(s);
    if (c.target && !hasTarget(s)) s.since = id === c.target ? 0 : s.since + 1;
    const sp = SP[id];
    const g = Math.round(lerp(sp.g[0], sp.g[1], Math.pow(rnd(s), 1.5)) / 10) * 10;
    return { sp: id, g, str: sp.str * c.strMul, spd: sp.spd * c.spdMul, sta: 1, staS: sp.sta, run: 0, on: false, runT: range(s, 0.6, 1.4), dir: rnd(s) < 0.5 ? -1 : 1, x: s.x };
  }

  /* ---------- sott'acqua: l'esca e i pesci ----------
   * Coordinate: x −1..1 (di lato; i pesci arrivano da ±1,6, fuori dalla vista), y 0 (superficie) .. 1 (fondo).
   * Un pesce (swimmer) = { sp, x, y, tx, ty, h (verso ±1), int (interesse 0..1), st, t, wary, hungry, ang, nib }
   * st: roam (gira per conto suo) · curious ('?', si avvicina) · circle (cuore, gira attorno all'esca) · sniff (annusa:
   *     'nibble', poi 'bite') · flee (spaventato: scappa) · leave (se ne va) · bite (attaccato all'amo)
   * Garanzia della specie speciale: dopo 2 abboccate senza, al lancio c'è lei e gli altri pesci non hanno fame. */
  const V_MAX = 3, Y_TOP = 0.08, Y_BOT = 0.95;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function spawn(s, sp, hungry, edge) {
    const c = cfgOf(s), S = SP[sp];
    const side = rnd(s) < 0.5 ? -1 : 1;
    const x = edge ? side * 1.6 : side * Math.min(1.45, c.spread + rnd(s) * 0.5 + (sp === c.target ? 0.3 : 0));
    const y = clamp(S.dep + (rnd(s) - 0.5) * 0.4, 0.12, 0.92);
    s.nid = (s.nid || 0) + 1;
    return { id: s.nid, sp, x: +x.toFixed(4), y: +y.toFixed(4), tx: -side * rnd(s), ty: y, h: -side, int: 0, st: 'roam', t: range(s, 1.5, 3), wary: 0, hungry, ang: rnd(s) * 6.28, nib: 0 };
  }
  function dive(s) {
    const c = cfgOf(s);
    s.lu = { x: 0, y: 0.45, tx: 0, ty: 0.45, v: 0 };
    s.sw = [];
    const tg = c.target && !hasTarget(s) && SP[c.target].minD <= s.d;
    const sure = tg && s.since >= 2;
    for (let i = 0; i < c.crowd; i++) {
      const sp = sure && i === 0 ? c.target : pickSp(s);
      s.sw.push(spawn(s, sp, !sure || sp === c.target, false));
    }
    s.wait = range(s, 3, 5);
  }
  function moveTo(w, tx, ty, v) {
    const dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy);
    if (d < 1e-6) return 0;
    const st = Math.min(d, v * DT);
    w.x += (dx / d) * st; w.y += (dy / d) * st;
    if (Math.abs(dx) > 0.004) w.h = dx > 0 ? 1 : -1;
    return d;
  }
  function scare(s, w, i, ev) {
    w.st = 'flee'; w.t = 1.1; w.int = 0; w.wary = 3 + 5 * SP[w.sp].shy; w.h = w.x >= s.lu.x ? 1 : -1;
    s.scares++;
    ev.push({ type: 'scare', i, sp: w.sp });
  }
  // un passo sott'acqua: esca, pesci, abboccata
  function underwater(s, c, r, inp, ev) {
    const lu = s.lu;
    if (inp) {
      if (inp.lx != null && Number.isFinite(+inp.lx)) lu.tx = clamp(+inp.lx, -1, 1);
      if (inp.ly != null && Number.isFinite(+inp.ly)) lu.ty = clamp(+inp.ly, Y_TOP, Y_BOT);
    }
    // l'esca segue il bersaglio (ritardo 0,1 s, massimo V_MAX unità/s); tirare piano la muove un po' (verso il pontile)
    let dx = (lu.tx - lu.x) * Math.min(1, DT / 0.1), dy = (lu.ty - lu.y) * Math.min(1, DT / 0.1);
    const m = Math.hypot(dx, dy), cap = V_MAX * DT;
    if (m > cap) { dx *= cap / m; dy *= cap / m; }
    lu.x += dx; lu.y += dy;
    const sp = Math.hypot(dx, dy) / DT + (r > 0.05 ? r * 0.2 : 0);
    lu.v += (sp - lu.v) * Math.min(1, DT / 0.12);
    // esca viva (lenta o a piccoli scatti) = interessante; ferma = poco; troppo veloce = per niente (e spaventa)
    const live = sm(0.03, 0.22, lu.v) * (1 - sm(0.5 * c.vFear, 0.85 * c.vFear, lu.v));
    const stim = 0.3 + 0.7 * live;
    const yank = r > 0.5 && s.lr <= 0.5;
    let sniffing = -1;
    for (let i = 0; i < s.sw.length; i++) if (s.sw[i].st === 'sniff') sniffing = i;
    let alive = 0;
    for (let i = 0; i < s.sw.length; i++) {
      const w = s.sw[i], S = SP[w.sp];
      const spd = 0.16 * S.spd * (1 + 0.15 * c.k);
      if (w.wary > 0) w.wary = Math.max(0, w.wary - DT);
      if (w.st === 'leave') { moveTo(w, w.h * 1.8, w.y, spd * 2.5); continue; }
      alive++;
      if (w.st === 'flee') {
        // un sobbalzo sul posto ('!'), poi via di corsa
        if (w.t < 0.75) moveTo(w, w.x + w.h, clamp(w.y + (w.y > lu.y ? 0.4 : -0.4), 0.08, 0.95), 1.3);
        w.x = clamp(w.x, -1.7, 1.7);
        w.t -= DT; if (w.t <= 0) { w.st = 'roam'; w.t = 0; }
        continue;
      }
      const ddx = w.x - lu.x, ddy = (w.y - lu.y) * 1.3, dist = Math.hypot(ddx, ddy);
      const vf = c.vFear * (1 - 0.45 * S.shy) * (w.wary > 0 ? 0.8 : 1);
      // troppo veloce, o tirato di colpo mentre annusa: scappa
      if ((lu.v > vf && dist < c.sense * 1.3) || (w.st === 'sniff' && (lu.v > 0.5 * vf || yank))) {
        if (w.st === 'sniff' && yank) ev.push({ type: 'early' });
        scare(s, w, i, ev);
        if (sniffing === i) sniffing = -1;
        continue;
      }
      // interesse
      const prox = clamp(1 - dist / c.sense, 0, 1);
      const aware = prox > 0 ? 0.25 + 0.75 * prox : 0;
      if (aware > 0) w.int += DT * c.lureG * (1 - 0.65 * S.shy) * stim * aware * (w.wary > 0 ? 0.25 : 1) * (w.hungry ? 1 : 0.6);
      else w.int -= DT * 0.05;
      w.int = clamp(w.int, 0, w.hungry ? 1 : 0.7);
      // stato e movimento
      if (w.st === 'roam') {
        w.t -= DT;
        if (moveTo(w, w.tx, w.ty, spd) < 0.05 || w.t <= 0) {
          w.tx = clamp((rnd(s) * 2 - 1) * 1.3, -1.3, 1.3); w.ty = clamp(S.dep + (rnd(s) - 0.5) * 0.45, 0.1, 0.94); w.t = range(s, 2, 4);
        }
        if (w.int >= 0.25) { w.st = 'curious'; ev.push({ type: 'curious', i, sp: w.sp }); }
      } else if (w.st === 'curious') {
        const k = 0.38 / Math.max(0.001, dist);
        moveTo(w, lu.x + ddx * k, lu.y + (ddy / 1.3) * k, spd * 1.4);
        if (w.int < 0.15) w.st = 'roam';
        else if (w.int >= 0.6) { w.st = 'circle'; w.ang = Math.atan2(ddy, ddx); ev.push({ type: 'love', i, sp: w.sp }); }
      } else if (w.st === 'circle') {
        w.ang += DT * 1.5;
        moveTo(w, lu.x + Math.cos(w.ang) * 0.3, lu.y + Math.sin(w.ang) * 0.16, spd * 2);
        if (w.int < 0.45) w.st = 'curious';
        else if (w.int >= 1 && w.hungry && sniffing < 0) { w.st = 'sniff'; w.t = range(s, 0.5, 0.9); w.nib = Math.floor(rnd(s) * (c.nib + 1)); sniffing = i; }
      } else if (w.st === 'sniff') {
        const near = moveTo(w, lu.x - w.h * 0.07, lu.y, spd * 1.6) < 0.06;
        if (Math.abs(lu.x - w.x) > 0.02) w.h = lu.x > w.x ? 1 : -1;
        if (near) w.t -= DT;
        if (w.t <= 0) {
          if (w.nib > 0) { w.nib--; w.t = range(s, 0.6, 1.1); s.nibAt = s.t; ev.push({ type: 'nibble', i, sp: w.sp }); }
          else {
            w.st = 'bite';
            s.phase = 'bite'; s.pt = 0; s.bite = c.biteWin; s.fish = makeFish(s, w.sp);
            ev.push({ type: 'bite', sp: w.sp, i });
            return;
          }
        }
      }
    }
    // pesci che se ne vanno escono dalla vista; ne arrivano di nuovi
    for (let i = s.sw.length - 1; i >= 0; i--) if (s.sw[i].st === 'leave' && Math.abs(s.sw[i].x) > 1.75) s.sw.splice(i, 1);
    if (alive < c.crowd) {
      s.wait -= DT;
      if (s.wait <= 0) { s.sw.push(spawn(s, pickSp(s), true, true)); s.wait = range(s, 3, 5); ev.push({ type: 'arrive' }); }
    }
  }

  const force = (f) => f.str * (0.35 + 0.75 * f.run) * (0.35 + 0.65 * f.sta);
  function target(T0, F, r) {
    const base = 0.1 + 0.55 * F;
    return r >= 0 ? base + r * (0.55 - 0.1 * F) : base * (1 + 0.85 * r);
  }

  // un passo fisso da 1/60 s
  function tick(s, inp) {
    const ev = [];
    if (s.won || s.phase === 'caught') return ev;
    const c = cfgOf(s);
    const r = clamp(inp && +inp.reel || 0, -1, 1);
    s.t += DT; s.pt += DT;
    switch (s.phase) {
      case 'fly':
        if (s.pt >= s.cast.fly) {
          s.phase = 'wait'; s.pt = 0; s.d = s.cast.d0; s.nibAt = -9;
          dive(s);
          ev.push({ type: 'land', d: s.d });
          const tg = c.target && !hasTarget(s);
          if (tg && SP[c.target].minD > s.d) ev.push({ type: 'far', need: SP[c.target].minD });
        }
        break;
      case 'wait':
        if (!s.lu || !s.sw) dive(s);
        if (r > 0.05) {
          s.d -= r * 1.6 * DT;
          if (s.d < 2) { s.phase = 'aim'; s.pt = 0; s.cast = null; s.d = 0; s.lu = null; s.sw = null; ev.push({ type: 'reel' }); break; }
        }
        underwater(s, c, r, inp, ev);
        break;
      case 'bite':
        if (r > 0.35) {
          s.phase = 'fight'; s.pt = 0; s.T = 0.45; s.brk = 0; s.slk = 0; s.sw = null;
          ev.push({ type: 'hook', sp: s.fish.sp });
          break;
        }
        s.bite -= DT;
        if (s.bite <= 0) {
          // il pesce se ne va (gli altri restano); ne arriverà un altro
          s.phase = 'wait'; s.pt = 0; s.fish = null; s.misses++; s.nibAt = -9;
          if (s.sw) for (const w of s.sw) if (w.st === 'bite') { w.st = 'leave'; w.hungry = false; w.h = w.x >= 0 ? 1 : -1; }
          ev.push({ type: 'missed' });
        }
        break;
      case 'fight': {
        const f = s.fish;
        // scatti: a riposo 1,2–3 s (meno se il pesce è veloce e fresco), poi 0,5–1,4 s di fuga
        f.runT -= DT;
        if (f.runT <= 0) {
          f.on = !f.on;
          f.runT = f.on ? range(s, 0.5, 1.4) * (0.6 + 0.4 * f.sta) : range(s, 1.2, 3) / f.spd;
          if (f.on) { f.dir = rnd(s) < 0.5 ? -1 : 1; ev.push({ type: 'run' }); }
        }
        f.run += ((f.on ? 1 : 0) - f.run) * Math.min(1, DT * 6);
        const F = force(f);
        const jig = 0.05 * Math.sin(s.pt * 13 * f.spd) * f.run;
        s.T += (target(s.T, F, r) + jig - s.T) * Math.min(1, DT / 0.12);
        if (s.T < 0) s.T = 0;
        const vIn = Math.max(0, r) * 4.2 * Math.max(0.2, 1 - 0.5 * F);
        const vOut = 0.7 * F * f.spd * (1 + 1.2 * Math.max(0, -r));
        s.d = clamp(s.d + (vOut - vIn) * DT, 0, 40);
        f.sta = clamp(f.sta - DT * (0.02 + 0.9 * s.T * s.T) / f.staS + (s.T < 0.15 ? DT * 0.03 : 0), 0, 1);
        f.x += f.dir * f.run * DT * 0.5;
        if (f.x > 1) { f.x = 1; f.dir = -1; } else if (f.x < -1) { f.x = -1; f.dir = 1; }
        // il pesce si avvicina al centro man mano che arriva al pontile
        s.x = f.x * Math.min(1, s.d / 8);
        // misuratori di rottura e di lenza molle
        if (s.T > c.tMax) s.brk += DT / c.brkTime; else s.brk = Math.max(0, s.brk - DT / (c.brkTime * 1.2));
        if (s.T < c.tMin) s.slk += DT / c.slkTime; else s.slk = Math.max(0, s.slk - (DT * 1.5) / c.slkTime);
        if (s.brk >= 1 || s.slk >= 1) {
          const why = s.brk >= 1 ? 'snap' : 'slack';
          if (why === 'snap') s.snaps++; else s.slacks++;
          s.lost++;
          ev.push({ type: why, sp: f.sp, x: s.x, d: s.d });
          s.phase = 'aim'; s.pt = 0; s.cast = null; s.fish = null; s.d = 0; s.T = 0; s.brk = 0; s.slk = 0; s.lu = null; s.sw = null;
          break;
        }
        if (s.d <= LAND) {
          s.phase = 'caught'; s.pt = 0; s.T = 0; s.brk = 0; s.slk = 0;
          s.fish = { sp: f.sp, g: f.g };
          ev.push({ type: 'catch', sp: f.sp, g: f.g });
        }
        break;
      }
      default: break;
    }
    s.lr = r;
    return ev;
  }

  // tempo reale: accumula dt e fa passi fissi (massimo 0,25 s per chiamata)
  function step(s, dt, inp) {
    s.acc = Math.min(0.25, (s.acc || 0) + Math.max(0, dt));
    const ev = [];
    while (s.acc >= DT) { s.acc -= DT; ev.push(...tick(s, inp)); }
    return ev;
  }

  // il pesce torna in acqua (con un cuoricino): conta per l'obiettivo
  function release(s, photo = false) {
    if (s.phase !== 'caught' || !s.fish) return [];
    const f = s.fish, c = cfgOf(s);
    s.caught.push({ sp: f.sp, g: f.g, photo: !!photo });
    s.fish = null; s.cast = null; s.phase = 'aim'; s.pt = 0; s.d = 0; s.lu = null; s.sw = null;
    const ev = [{ type: 'release', sp: f.sp }];
    if (s.caught.length >= c.goal && hasTarget(s)) { s.won = true; s.phase = 'over'; ev.push({ type: 'win' }); }
    return ev;
  }

  // avanzamento del pesce in lotta: 0 appena ferrato, 1 al pontile
  function fightFrac(s) {
    if (s.phase !== 'fight' || !s.cast) return 0;
    return clamp(1 - (s.d - LAND) / Math.max(1, s.cast.d0 - LAND), 0, 1);
  }
  function progress(s) {
    if (!s) return 0;
    if (s.won) return 1;
    const c = cfgOf(s);
    let done = s.caught.length;
    if (c.target && !hasTarget(s)) done = Math.min(done, c.goal - 1);
    if (s.phase === 'caught') done += 0.9;
    return Math.min(0.99, (done + fightFrac(s) * 0.8) / c.goal);
  }
  const par = (s) => config(s.level).par;
  function rate(s) {
    const p = par(s);
    if (s.lost === 0 && s.t <= p) return 3;
    if (s.lost <= 2 && s.t <= p * 1.6) return 2;
    return 1;
  }
  // zone della tensione per la UI: [tMin, tMax]
  const zones = (s) => { const c = cfgOf(s); return { tMin: c.tMin, tMax: c.tMax }; };

  /* ---------- espressioni di Hari ----------
   * mood(s): l'espressione che la situazione chiede. wait (concentrato) · curious (un pesce si avvicina) · wow (un
   * pesce raro o d'oro è interessato, o abbocca) · surprised (abboccata) · happy (tensione nel verde) · effort (tensione
   * alta o pesce che scatta) · worried (vicino alla rottura o al lasco) · win (preso). sad (lenza rotta, pesce scappato)
   * e win arrivano anche dagli eventi, nella UI, per un tempo fisso. */
  function mood(s) {
    if (!s) return 'wait';
    const c = cfgOf(s);
    switch (s.phase) {
      case 'wait': {
        let m = 'wait';
        for (const w of s.sw || []) {
          if (w.st === 'curious' || w.st === 'circle' || w.st === 'sniff') {
            if (SP[w.sp].rar >= 3) return 'wow';
            m = 'curious';
          }
        }
        return m;
      }
      case 'bite': return s.fish && SP[s.fish.sp].rar >= 3 ? 'wow' : 'surprised';
      case 'fight': {
        const span = c.tMax - c.tMin, mid = (c.tMin + c.tMax) / 2;
        if (s.brk > 0.3 || s.slk > 0.45 || s.T > c.tMax || s.T < c.tMin) return 'worried';
        if (s.T > mid + 0.18 * span || (s.fish && s.fish.run > 0.55)) return 'effort';
        return 'happy';
      }
      case 'caught': case 'over': return 'win';
      default: return 'wait';
    }
  }
  // isteresi: un'espressione resta almeno 0,7 s e la nuova deve essere chiesta per 0,2 s di fila; quelle forti
  // (sorpresa, stupore, tristezza, vittoria) passano dopo 0,25 s
  const STRONG = { surprised: 1, wow: 1, sad: 1, win: 1 };
  const newMood = (m = 'wait') => ({ cur: m, t: 9, cand: '', ct: 0 });
  function moodStep(m, want, dt) {
    m.t += dt;
    if (want === m.cur) { m.cand = ''; m.ct = 0; return m.cur; }
    if (m.cand === want) m.ct += dt; else { m.cand = want; m.ct = 0; }
    if ((STRONG[want] && m.t >= 0.25) || (m.ct >= 0.2 && m.t >= 0.7)) { m.cur = want; m.t = 0; m.cand = ''; m.ct = 0; }
    return m.cur;
  }

  /* ---------- sensori ---------- */
  // inclinazione (gradi) del lato alto dello SCHERMO sopra l'orizzontale: 0 telefono piatto, 90 in piedi davanti a sé,
  // oltre 90 inclinato all'indietro. beta, gamma da deviceorientation; ang = screen.orientation.angle (0, 90, 180, 270)
  function pitchFrom(beta, gamma, ang = 0) {
    const b = (beta * Math.PI) / 180, g = (gamma * Math.PI) / 180, a = (ang * Math.PI) / 180;
    // verticale del mondo ("su") nelle coordinate del telefono (x a destra, y verso l'alto dello schermo, z fuori dallo schermo)
    const ux = -Math.cos(b) * Math.sin(g), uy = Math.sin(b), uz = Math.cos(b) * Math.cos(g);
    // asse "alto dello schermo" ruotato con l'orientamento dello schermo
    const sy = uy * Math.cos(a) + ux * Math.sin(a);
    return (Math.atan2(sy, uz) * 180) / Math.PI;
  }
  // inclinazione rispetto alla posizione neutra (gradi) → recupero: zona morta ±4°, tutto tirato a +30°, tutto mollato a −22°
  function tiltToReel(dp) {
    if (!Number.isFinite(dp)) return 0;
    if (dp > 4) return Math.min(1, (dp - 4) / 26);
    if (dp < -4) return Math.max(-1, (dp + 4) / 18);
    return 0;
  }
  // inclinazione di lato (gradi) dello schermo: positiva col lato destro più in basso; con l'angolo dello schermo come
  // pitchFrom (vale anche col telefono quasi in piedi, dove gamma da solo non basta)
  function rollFrom(beta, gamma, ang = 0) {
    const b = (beta * Math.PI) / 180, g = (gamma * Math.PI) / 180, a = (ang * Math.PI) / 180;
    const ux = -Math.cos(b) * Math.sin(g), uy = Math.sin(b);
    const sx = ux * Math.cos(a) - uy * Math.sin(a);
    return (Math.asin(clamp(-sx, -1, 1)) * 180) / Math.PI;
  }
  // inclinazione laterale rispetto alla posizione neutra (gradi) → velocità dell'esca (unità/s): zona morta ±3°,
  // massimo 1,1 a 25° (più di vFear: inclinare di colpo e tanto spaventa i pesci)
  function tiltToLure(dg) {
    if (!Number.isFinite(dg)) return 0;
    const a = Math.abs(dg);
    if (a <= 3) return 0;
    return Math.sign(dg) * Math.min(1, (a - 3) / 22) * 1.1;
  }
  // gesto del lancio: la punta va indietro (pitch sale) e poi avanti di scatto (pitch scende veloce).
  // det = newFlick(); flick(det, t secondi, pitch gradi, acc m/s² senza gravità o 0) → forza 0..1 quando il lancio parte
  const newFlick = () => ({ t: -1, p: 0, rate: 0, arm: -9, peak: 0, acc: 0, go: -1 });
  function flick(det, t, pitch, acc = 0) {
    if (det.t < 0 || t - det.t > 0.3 || t <= det.t) { det.t = t; det.p = pitch; det.rate = 0; return 0; }
    const raw = (pitch - det.p) / (t - det.t);
    det.rate = det.rate * 0.4 + raw * 0.6;
    det.t = t; det.p = pitch;
    if (det.go < 0) {
      if (det.rate > 70) det.arm = t;                          // indietro (o in su): pronto
      if (det.rate < -150 && t - det.arm < 1.2) { det.go = t; det.peak = det.rate; det.acc = acc; }
      return 0;
    }
    det.peak = Math.min(det.peak, det.rate); det.acc = Math.max(det.acc, acc);
    if (det.rate > -60 || t - det.go > 0.35) {
      const p = clamp((-det.peak - 150) / 650 + det.acc / 40, 0.12, 1);
      det.go = -1; det.arm = -9; det.peak = 0; det.acc = 0;
      return p;
    }
    return 0;
  }

  /* ---------- album ---------- */
  // album = { <specie>: { n, best (g), photo } }; restituisce una copia aggiornata
  function albumAdd(album, fish, photo = false) {
    const a = Object.assign({}, album || {});
    const prev = a[fish.sp];
    const isNew = !prev;
    const e = Object.assign({ n: 0, best: 0, photo: false }, prev || {});
    const record = !isNew && fish.g > e.best;
    e.n++; e.best = Math.max(e.best, fish.g); e.photo = e.photo || !!photo;
    a[fish.sp] = e;
    return { album: a, isNew, record };
  }

  HH.fish = {
    DT, D_MIN, D_MAX, LAND, SPECIES, SP,
    config, newLevel, migrate, cast, step, tick, release, isWon, isOver, progress, rate, par, fightFrac, zones,
    pitchFrom, rollFrom, tiltToReel, tiltToLure, newFlick, flick, albumAdd, mood, newMood, moodStep, V_MAX, Y_TOP, Y_BOT, _target: target, _force: force,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
