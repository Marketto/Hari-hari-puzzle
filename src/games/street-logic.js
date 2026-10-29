/* Hari Snack Street — logica pura (nessun DOM), macchina a stati deterministica e serializzabile.
 *
 * Picchiaduro a scorrimento laterale "alla Double Dragon", ma SENZA violenza: si "combatte" sfamando. Hari (riccio) e
 * Kiki (scoiattolina) avanzano per strada su un piano pseudo-3D (x = lungo la strada, y = profondità del marciapiede,
 * z = altezza del salto). Gli avversari sono animali affamati con una pancia da riempire invece della vita: quando sono
 * sazi si siedono felici, fanno un cuoricino e se ne vanno. Se un animale affamato ti tocca o ti mordicchia la merenda
 * perdi energia (pallini); a energia finita il personaggio fa un pisolino e la squadra perde un cuore (3 in tutto).
 *
 * Mosse: porgi (tocco veloce, da vicino) · lancia (a distanza) · salta · speciale (si carica sfamando: torta gigante per
 * Hari, pioggia di frutti per Kiki) · presa: un animale "imbambolato" (3 bocconi di fila) si prende camminandoci contro,
 * poi "porgi" gli dà un cesto intero.
 * Animali: coniglietto (base) · procione (ruba le merende lanciate: va sfamato da vicino) · cinghialotto (si mette in fila
 * e carica) · gazza (vola, prende al volo le merende lanciate, ogni tanto scende in picchiata) · volpi (in coppia, ai due
 * lati) · orsetto (lento, grosso, molto affamato).
 * Ambiente: cassette di frutta da aprire (mela = energia, stella = carica speciale, cesto = il prossimo "porgi" è un cesto
 * intero), carrelli da spingere (sfamano chi travolgono), ceste a terra.
 * Livello: tratti di strada con ondate ("GO →" quando l'ondata è sazia), poi un animalone (boss) con attacchi a schema:
 * angurie che rotolano su TUTTA la profondità (si saltano o se ne ferma una lanciandole merende), onda d'urto del
 * pestone (solo saltando), carica, picchiata, risucchio goloso (si interrompe dandogli da mangiare), chiamata dei piccoli.
 *
 * Tempo: passi fissi da 1/60 s. step(s, dt, inputs) con inputs = [input P1, input P2] (null = nessun cambiamento):
 *   input = { mx: -1..1, my: -1..1 (y+ = verso il fondo), a, b, c, s } con a/b/c/s CONTATORI di pressioni (porgi, lancia,
 *   salta, speciale): una pressione = contatore aumentato. Così un input perso in rete non perde i tocchi (vale l'ultimo).
 * Il generatore casuale vive nello stato (s.rs, mulberry32): lo stato è JSON puro, si salva, si riprende e si sincronizza.
 * I giocatori con cpu: 1 sono guidati da cpuInput() dentro step (deterministico).
 *
 * API: config(level, np) · newLevel(level, rnd, { players, cpu }) · step(s, dt, inputs) → eventi · tick(s, inputs)
 *      cpuInput(s, i) · setCpu(s, i, on) · isWon · isLost · isOver · rate · progress · parTime · CH · AN · BOSSES · THEMES
 * Eventi (type): ready · go{sec} · wave{i} · new{what} · spawn{id,k} · feed{p,id,bite,x,y,big} · toss{p} · hit{id,x,y}
 *   steal{id,x,y} · catch{id,x,y} · full{id,k,x,y} · dizzy{id} · grab{p,id} · basket{p,id,x,y} · nibble{p,by,x,y,hp}
 *   tired{p,left} · back{p} · jump{p} · special{p,kind,x,y} · spReady{p} · crate{id,x,y,drop} · pick{p,k} · cart{id}
 *   cartFeed{id,to} · boss{k} · bossAtk{a} · melonStop{id,x,y} · stomp{x,y} · call{n} · gulp · phase{n} · charge{id}
 *   lose · win
 * Esporta HH.street.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const TICK = 1 / 60;
  const LIVES = 3;
  const READY = 1.4;
  const DEPTH = 3;            // profondità della strada (y da 0, davanti, a DEPTH, in fondo)
  const VIEW = 10;            // larghezza visibile (m): i giocatori restano dentro la telecamera
  const GRAV = 16;            // gravità del salto
  const SEC = 12;             // lunghezza di un tratto di strada
  const DY = 0.36;            // tolleranza in profondità per porgere e per i contatti
  const SP_BITE = 0.055;      // carica speciale per boccone dato
  const INV = 1.1;            // invulnerabilità dopo un morso
  const NAP = 1.8;            // pisolino quando l'energia finisce

  // personaggi: velocità, salto, energia, porgi (bocconi, ricarica), lancio (bocconi, ricarica, velocità, gittata)
  const CH = {
    hari: { vx: 3.1, vy: 1.9, jump: 5.4, hp: 6, feed: 2, feedCd: 0.26, toss: 1, tossCd: 0.42, tossV: 7.5, tossR: 6, reach: 1.0, special: 'cake' },
    kiki: { vx: 3.7, vy: 2.3, jump: 6.2, hp: 5, feed: 1, feedCd: 0.16, toss: 1, tossCd: 0.28, tossV: 9.5, tossR: 8.5, reach: 0.95, special: 'rain' },
  };
  // animali: fame base, velocità, mezza larghezza, altezza, preavviso del morso, pausa tra un morso e l'altro, dal livello
  const AN = {
    bunny: { need: 3, v: 1.6, r: 0.3, h: 0.6, atk: 0.42, cd: 1.7, from: 1 },
    raccoon: { need: 4, v: 1.85, r: 0.32, h: 0.6, atk: 0.38, cd: 1.6, from: 2, steal: 1 },
    boar: { need: 5, v: 1.1, r: 0.38, h: 0.62, atk: 0.6, cd: 2.4, from: 3, charge: 6.2 },
    magpie: { need: 3, v: 2.1, r: 0.28, h: 0.5, atk: 0.3, cd: 2.8, from: 4, fly: 1.5 },
    fox: { need: 4, v: 1.8, r: 0.3, h: 0.6, atk: 0.4, cd: 1.8, from: 5, pair: 1 },
    bear: { need: 9, v: 0.8, r: 0.5, h: 0.95, atk: 0.55, cd: 2.0, from: 6 },
  };
  const KINDS = Object.keys(AN);
  // ambientazioni e animaloni (uno per ambientazione), in ordine di livello
  const THEMES = ['market', 'city', 'port', 'fair', 'train'];
  const BOSSES = {
    bear: { k: 'bear', r: 1.0, cycle: [['melon', 'call'], ['melon', 'stomp', 'call'], ['stomp', 'melon', 'suck']], call: 'bunny' },
    boar: { k: 'boar', r: 1.0, cycle: [['charge', 'melon'], ['charge', 'stomp', 'melon'], ['charge', 'stomp', 'charge', 'melon']], call: 'boar' },
    gull: { k: 'gull', r: 0.95, cycle: [['dive', 'melon'], ['dive', 'melon', 'call'], ['dive', 'stomp', 'melon']], call: 'magpie' },
    raccoon: { k: 'raccoon', r: 1.0, cycle: [['suck', 'melon'], ['melon', 'suck', 'call'], ['suck', 'stomp', 'melon', 'call']], call: 'raccoon' },
    panda: { k: 'panda', r: 1.05, cycle: [['charge', 'melon'], ['stomp', 'charge', 'melon'], ['stomp', 'melon', 'charge', 'suck']], call: 'bear' },
  };
  const BOSS_OF = { market: 'bear', city: 'boar', port: 'gull', fair: 'raccoon', train: 'panda' };
  const MELON_V = 3.6, MELON_R = 0.36, WAVE_V = 4.2;

  /* ---------- rng nello stato ---------- */
  function rand(s) {
    s.rs = (s.rs + 0x6d2b79f5) >>> 0;
    let t = s.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const r3 = (v) => Math.round(v * 1000) / 1000 || 0;

  /* ---------- curva di difficoltà (monotona; np = numero di giocatori) ---------- */
  function config(level, np = 1) {
    const L = Math.max(1, level | 0), two = np >= 2;
    const theme = THEMES[(L - 1) % THEMES.length];
    const kinds = KINDS.filter((k) => AN[k].from <= L);
    const waves = Math.min(5, 2 + Math.ceil(L / 3));                       // 3 · 3 · 3 · 4 · 4 · 4 · 5 …
    const perWave = Math.min(8, 2 + Math.floor(L * 0.5));                   // animali per ondata (1 giocatore)
    return {
      level: L, np, theme, kinds, waves,
      perWave: two ? Math.min(12, Math.round(perWave * 1.5)) : perWave,
      maxAct: Math.min(5, 2 + Math.floor((L + 1) / 4)) + (two ? 2 : 0),    // animali in scena contemporaneamente
      needMul: +((1 + 0.07 * (L - 1)) * (two ? 1.15 : 1)).toFixed(3),      // fame
      speedMul: +Math.min(1.25, 1 + 0.02 * (L - 1)).toFixed(3),
      cdMul: +Math.max(0.75, 1 - 0.02 * (L - 1)).toFixed(3),                // pause tra un morso e l'altro (più brevi)
      // quanti animali possono preparare un morso (o una picchiata, una carica) contro lo stesso giocatore insieme
      maxAtk: L <= 4 ? 1 : L <= 14 ? 2 : 3,
      boss: BOSS_OF[theme],
      bossNeed: Math.round((60 + 9 * (L - 1)) * (two ? 1.6 : 1)),
      bossIv: +Math.max(2.0, 3.4 - 0.12 * (L - 1)).toFixed(2),               // secondi tra un attacco e l'altro
      melons: Math.min(5, 3 + Math.floor(L / 4)),                           // angurie per raffica (coprono tutta la strada)
      melonGap: +Math.max(0.55, 1.1 - 0.05 * (L - 1)).toFixed(2),           // distanza tra le file di angurie
      crates: Math.min(4, 1 + Math.floor(L / 3)), carts: L >= 2 ? Math.min(3, Math.floor(L / 2)) : 0,
      news: [...kinds.filter((k) => AN[k].from === L), ...(L === 1 ? ['crate', 'boss'] : []), ...(L === 2 ? ['cart'] : [])],
    };
  }

  /* ---------- livello ---------- */
  function newLevel(level, rnd = Math.random, opt = {}) {
    const np = opt.players === 2 ? 2 : 1;
    const c = config(level, np);
    const waves = [];
    for (let w = 0; w < c.waves; w++) {
      const list = [];
      // ultima ondata con i più affamati; la prima di ogni livello inizia con un animale noto
      const pool = c.kinds;
      while (list.length < c.perWave) {
        let k = pool[Math.floor(rnd() * pool.length)];
        if (w === 0 && list.length === 0) k = c.level === 1 ? 'bunny' : pool[pool.length - 1];
        if (AN[k].pair) { if (list.length + 2 > c.perWave + 1) k = 'bunny'; else { list.push(k, k); continue; } }
        list.push(k);
      }
      waves.push(list);
    }
    // oggetti lungo la strada: cassette, carrelli, ceste (mai dove si combatte subito)
    const objs = [];
    let oid = 0;
    for (let w = 0; w < c.waves; w++) {
      const x0 = 4 + w * SEC;
      for (let i = 0; i < c.crates; i++) if (rnd() < 0.7) objs.push({ id: ++oid, k: 'crate', x: r3(x0 + 2 + rnd() * 8), y: r3(0.3 + rnd() * 2.4), hp: 2, drop: rnd() < 0.45 ? 'apple' : rnd() < 0.6 ? 'star' : 'basket' });
      for (let i = 0; i < c.carts; i++) if (rnd() < 0.6) objs.push({ id: ++oid, k: 'cart', x: r3(x0 + 1 + rnd() * 6), y: r3(0.4 + rnd() * 2.2), vx: 0, run: 0 });
    }
    const pl = [];
    const chs = ['hari', 'kiki'];
    for (let i = 0; i < np; i++) {
      const C = CH[chs[i]];
      pl.push({ i, ch: chs[i], x: 1.6 - i * 0.6, y: i ? 2.0 : 1.0, z: 0, vz: 0, face: 1, hp: C.hp, st: 'idle', t: 0,
        cd: 0, sp: 0, inv: 0, hold: 0, bk: 0, combo: 0, cid: 0, ct: 0, pc: [0, 0, 0, 0], ic: [0, 0, 0, 0], q: [0, 0, 0, 0], mx: 0, my: 0,
        cpu: i === 1 && opt.cpu ? 1 : 0, ai: { n: [0, 0, 0, 0], t: 0 }, fed: 0 });
    }
    return {
      v: 1, level: c.level, np, theme: c.theme, waves, objs, bossK: c.boss, bossNeed: c.bossNeed,
      t: 0, acc: 0, ready: READY, ticks: 0, seq: oid,
      cam: 0, sec: 0, phase: 'walk', lock: lockAt(0), q: [], spT: 0, waveN: c.waves,
      players: pl, animals: [], shots: [], melons: [], waves2: [], picks: [], fx: [],
      boss: null, bossFed: 0, news: c.news.slice(),
      oops: 0, mistakes: 0, moves: 0, fedN: 0, won: false,
      rs: Math.floor(rnd() * 4294967296) >>> 0,
    };
  }
  const lockAt = (w) => 2 + w * SEC;
  const isBossSec = (s) => s.sec >= s.waveN;

  function setCpu(s, i, on) { const p = s.players[i]; if (p) p.cpu = on ? 1 : 0; }

  function news(s, ev, what) {
    const i = s.news.indexOf(what);
    if (i >= 0) { s.news.splice(i, 1); ev.push({ type: 'new', what }); }
  }

  /* ---------- un passo fisso ---------- */
  function tick(s, inputs) {
    const ev = [];
    if (isOver(s)) return ev;
    const dt = TICK;
    s.ticks++;
    s.t = s.ticks / 60;
    const c = config(s.level, s.np);

    // giocatori
    for (const p of s.players) {
      const inp = p.cpu ? cpuInput(s, p.i) : inputs ? inputs[p.i] : null;
      player(s, p, inp, dt, ev, c);
    }
    // telecamera: avanza (mai indietro) seguendo chi è più avanti, fino al prossimo blocco
    const act = s.players.filter((p) => p.st !== 'nap');
    const lead = act.length ? Math.max(...act.map((p) => p.x)) : s.players[0].x;
    const want = Math.min(s.lock, lead - VIEW * 0.5);
    if (want > s.cam) s.cam = r3(Math.min(s.cam + 4 * dt, want));
    for (const p of s.players) p.x = clamp(p.x, s.cam + 0.35, s.cam + VIEW - 0.35);

    // fasi: cammino → ondata → … → animalone
    if (s.phase === 'walk' && s.cam >= s.lock - 1e-6) {
      if (isBossSec(s)) {
        s.phase = 'boss';
        const B = BOSSES[s.bossK];
        s.boss = { k: s.bossK, x: s.cam + VIEW + 2, y: 1.5, r: B.r, fed: 0, need: s.bossNeed, st: 'enter', t: 0, a: '', ai: 0, ph: 0, nx: 2.2, face: -1, cd: 1.2 };
        ev.push({ type: 'boss', k: s.bossK });
        news(s, ev, 'boss');
      } else {
        s.phase = 'fight';
        s.q = s.waves[s.sec].slice();
        s.spT = 0.3;
        ev.push({ type: 'wave', i: s.sec });
      }
    }
    if (s.phase === 'fight') {
      s.spT -= dt;
      const live = s.animals.filter((a) => a.st !== 'bye' && a.st !== 'happy').length;
      if (s.q.length && s.spT <= 0 && live < c.maxAct) {
        const k = s.q.shift();
        if (AN[k].pair && s.q[0] === k) { s.q.shift(); const pid = ++s.seq; spawn(s, k, ev, c, -1, pid); spawn(s, k, ev, c, 1, pid); }
        else spawn(s, k, ev, c, 0, 0);
        s.spT = 0.9;
      }
      if (!s.q.length && !s.animals.some((a) => a.st !== 'bye' && a.st !== 'happy')) {
        s.sec++;
        s.phase = 'walk';
        // merenda della pausa: un pallino di energia a testa dopo ogni ondata
        for (const p of s.players) if (p.st !== 'nap') p.hp = Math.min(CH[p.ch].hp, p.hp + 1);
        s.lock = lockAt(s.sec);
        ev.push({ type: 'go', sec: s.sec });
      }
    }

    animals(s, dt, ev, c);
    shots(s, dt, ev, c);
    objects(s, dt, ev);
    if (s.boss) { bossTick(s, dt, ev, c); if (s.won) return ev; }
    hazards(s, dt, ev);
    if (isLost(s)) return ev;
    // effetti a tempo (torta, pioggia): solo grafica, scadono
    if (s.fx.length) s.fx = s.fx.filter((f) => (f.t -= dt) > 0);
    s.moves = s.fedN;
    return ev;
  }

  /* ---------- giocatori ---------- */
  function press(p, inp, k) {
    // contatori di pressioni: una pressione per passo; quelle in più restano in coda
    if (!p.ic) p.ic = p.pc.slice();
    if (inp) p.ic[k] = inp['abcs'[k]] | 0;          // senza input nuovo vale l'ultimo ricevuto
    const v = p.ic[k];
    if (v < p.pc[k]) p.pc[k] = v;            // contatore ripartito (nuovo controller)
    if (v > p.pc[k]) { p.pc[k]++; p.q[k] = 0.18; }
  }
  function player(s, p, inp, dt, ev, c) {
    const C = CH[p.ch];
    if (inp) { p.mx = clamp(+inp.mx || 0, -1, 1); p.my = clamp(+inp.my || 0, -1, 1); }
    for (let k = 0; k < 4; k++) { press(p, inp, k); if (p.q[k] > 0) p.q[k] = r3(Math.max(0, p.q[k] - dt)); }
    if (p.inv > 0) p.inv = Math.max(0, p.inv - dt);
    if (p.cd > 0) p.cd = Math.max(0, p.cd - dt);
    if (p.ct > 0) { p.ct -= dt; if (p.ct <= 0) { p.combo = 0; p.cid = 0; } }
    p.t += dt;
    if (p.st === 'nap') {
      p.mx = 0; p.my = 0;
      if (p.t >= NAP) { p.st = 'idle'; p.t = 0; p.hp = C.hp; p.inv = 2; ev.push({ type: 'back', p: p.i }); }
      return;
    }
    if (p.st === 'hurt') { if (p.t >= 0.35) { p.st = 'idle'; p.t = 0; } }
    // presa: si tiene l'animale imbambolato; "porgi" = cesto intero
    if (p.st === 'grab') {
      const a = s.animals.find((x) => x.id === p.hold);
      if (!a || a.st !== 'held') { p.st = 'idle'; p.hold = 0; }
      else {
        a.x = p.x + p.face * (0.42 + AN[a.k].r); a.y = p.y;
        if (p.q[0] > 0) {
          p.q[0] = 0;
          const bite = 8;
          ev.push({ type: 'basket', p: p.i, id: a.id, x: a.x, y: a.y });
          a.st = 'walk'; a.t = 0;
          give(s, a, bite, p, ev, true);
          // briciole del cesto: un po' anche a chi è lì vicino
          for (const o of s.animals) if (o !== a && o.st !== 'bye' && o.st !== 'happy' && Math.abs(o.x - a.x) < 1.4 && Math.abs(o.y - a.y) < 0.8) give(s, o, 2, p, ev, false);
          p.st = 'idle'; p.hold = 0; p.cd = 0.3; p.t = 0;
        } else if (p.t > 1.6) { a.st = 'dizzy'; a.t = 0.9; p.st = 'idle'; p.hold = 0; }
        return;
      }
    }
    // movimento
    const busy = p.st === 'feed' || p.st === 'special';
    const mv = busy ? 0.25 : p.st === 'hurt' ? 0 : 1;
    let vx = p.mx * C.vx * mv, vy = p.my * C.vy * mv;
    // risucchio dell'animalone goloso
    const b = s.boss;
    if (b && b.st === 'suck') {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
      vx += (dx / d) * 2.3; vy += (dy / d) * 1.4;
    }
    p.x += vx * dt; p.y = clamp(p.y + vy * dt, 0, DEPTH);
    if (p.mx > 0.2) p.face = 1; else if (p.mx < -0.2) p.face = -1;
    if (p.st === 'idle' || p.st === 'walk') p.st = Math.abs(p.mx) + Math.abs(p.my) > 0.15 ? 'walk' : 'idle';
    // salto
    if (p.z > 0 || p.vz > 0) {
      p.vz -= GRAV * dt; p.z += p.vz * dt;
      if (p.z <= 0) { p.z = 0; p.vz = 0; }
    } else if (p.q[2] > 0 && p.st !== 'hurt') { p.q[2] = 0; p.vz = C.jump; p.z = 0.001; ev.push({ type: 'jump', p: p.i }); }
    if (p.st === 'feed' && p.t >= 0.16) { p.st = 'idle'; p.t = 0; }
    if (p.st === 'special' && p.t >= 0.5) { p.st = 'idle'; p.t = 0; }
    if (p.st === 'hurt') return;
    // speciale (carica piena)
    if (p.q[3] > 0 && p.sp >= 1) { p.q[3] = 0; special(s, p, ev); return; }
    if (p.q[3] > 0 && p.sp < 1) p.q[3] = 0;
    // presa: camminando contro un animale imbambolato
    if (p.z < 0.2 && Math.abs(p.mx) > 0.3) {
      const a = s.animals.find((x) => x.st === 'dizzy' && (x.x - p.x) * p.face > 0 && Math.abs(x.x - p.x) < AN[x.k].r + 0.55 && Math.abs(x.y - p.y) < DY);
      if (a) { a.st = 'held'; p.st = 'grab'; p.hold = a.id; p.t = 0; ev.push({ type: 'grab', p: p.i, id: a.id }); news(s, ev, 'grab'); return; }
    }
    if (p.cd > 0) return;
    // porgi (da vicino) e lancia (a distanza)
    if (p.q[0] > 0) {
      p.q[0] = 0;
      p.st = 'feed'; p.t = 0; p.cd = C.feedCd;
      feed(s, p, ev, C);
      return;
    }
    if (p.q[1] > 0) {
      p.q[1] = 0;
      p.cd = C.tossCd; p.st = 'feed'; p.t = 0.04;
      s.shots.push({ id: ++s.seq, o: p.i, x: r3(p.x + p.face * 0.35), y: p.y, z: r3(0.75 + p.z), vx: C.tossV * p.face, left: C.tossR, bite: C.toss });
      ev.push({ type: 'toss', p: p.i });
    }
  }

  // bersaglio di "porgi": il più vicino davanti, alla stessa profondità, a portata (anche in volo saltando)
  function frontTarget(s, p, reach) {
    let best = null, bd = 1e9;
    for (const a of s.animals) {
      if (a.st === 'bye' || a.st === 'happy' || a.st === 'held' || a.st === 'steal') continue;
      const A = AN[a.k], dx = (a.x - p.x) * p.face;
      if (dx < -0.15 || dx > reach + A.r || Math.abs(a.y - p.y) > DY + A.r * 0.25) continue;
      if (a.z > p.z + 0.75) continue;                     // la gazza in volo si raggiunge solo saltando
      if (dx < bd) { bd = dx; best = a; }
    }
    return best;
  }
  function feed(s, p, ev, C) {
    const bite = p.bk ? 8 : C.feed;
    let a = frontTarget(s, p, C.reach);
    // niente davanti ma qualcuno subito dietro: ci si gira da soli (più facile sul telefono)
    if (!a) { p.face = -p.face; a = frontTarget(s, p, C.reach); if (!a) p.face = -p.face; }
    if (a) {
      if (p.bk) { p.bk = 0; ev.push({ type: 'basket', p: p.i, id: a.id, x: a.x, y: a.y }); }
      // tre bocconi di fila allo stesso animale: si imbambola (si può prendere e dargli un cesto intero)
      if (a.id === p.cid) p.combo++; else { p.combo = 1; p.cid = a.id; }
      p.ct = 0.75;
      give(s, a, bite, p, ev, true);
      if (p.combo >= 3 && a.left > 0 && a.st !== 'happy') {
        p.combo = 0;
        if (a.st !== 'held') { a.st = 'dizzy'; a.t = 1.5; a.z = 0; ev.push({ type: 'dizzy', id: a.id }); news(s, ev, 'grab'); }
      }
      return;
    }
    // l'animalone
    const b = s.boss;
    if (b && b.st !== 'enter' && b.st !== 'full') {
      const dx = (b.x - p.x) * p.face;
      if (dx > -0.2 && dx < C.reach + b.r && Math.abs(b.y - p.y) < b.r * 0.6 + DY) {
        if (p.bk) { p.bk = 0; ev.push({ type: 'basket', p: p.i, id: 0, x: b.x, y: b.y }); }
        bossFeed(s, bite, p, ev);
        return;
      }
    }
    // cassette e carrelli: porgi = apri
    const o = s.objs.find((x) => x.k === 'crate' && (x.x - p.x) * p.face > -0.1 && (x.x - p.x) * p.face < C.reach + 0.3 && Math.abs(x.y - p.y) < DY + 0.1);
    if (o) hitCrate(s, o, ev);
  }
  function give(s, a, bite, p, ev, big) {
    if (a.left <= 0) return;
    const got = Math.min(a.left, bite);
    a.left -= got;
    a.yum = 0.25;
    if (p) { p.sp = r3(Math.min(1, p.sp + got * SP_BITE)); if (p.sp >= 1 && !p.spOk) { p.spOk = 1; ev.push({ type: 'spReady', p: p.i }); } }
    ev.push({ type: 'feed', p: p ? p.i : -1, id: a.id, bite: got, x: a.x, y: a.y, big: big && bite >= 8 ? 1 : 0 });
    // chi sta caricando o mordendo si ferma a mangiare
    if (a.st === 'wind' || a.st === 'charge' || a.st === 'atk') { a.st = 'walk'; a.t = 0; a.cd = Math.max(a.cd, 0.8); a.vx = 0; }
    if (a.st === 'swoop' || a.st === 'aim' || a.st === 'rise') { a.st = 'rise'; a.t = 0; }
    if (a.left <= 0) {
      a.st = 'happy'; a.t = 0; a.z = 0;
      s.fedN++;
      if (p) p.fed++;
      ev.push({ type: 'full', id: a.id, k: a.k, x: a.x, y: a.y });
    }
  }
  function special(s, p, ev) {
    const C = CH[p.ch];
    p.sp = 0; p.spOk = 0; p.st = 'special'; p.t = 0; p.inv = Math.max(p.inv, 0.7); p.cd = 0.4;
    if (C.special === 'cake') {
      // torta gigante davanti a Hari: sfama tutti quelli nel raggio
      const cx = p.x + p.face * 1.7, cy = p.y;
      ev.push({ type: 'special', p: p.i, kind: 'cake', x: cx, y: cy });
      s.fx.push({ k: 'cake', x: r3(cx), y: r3(cy), t: 1.2 });
      for (const a of s.animals) if (a.st !== 'bye' && a.st !== 'happy' && Math.abs(a.x - cx) < 2.1 && Math.abs(a.y - cy) < 1.3) { if (a.st === 'held') continue; give(s, a, 9, null, ev, true); }
      if (s.boss && Math.abs(s.boss.x - cx) < 2.1 + s.boss.r) bossFeed(s, 14, null, ev);
      for (const m of s.melons) if (Math.abs(m.x - cx) < 2.1) m.stop = 1;
    } else {
      // pioggia di frutti: un po' a tutti quelli in scena
      ev.push({ type: 'special', p: p.i, kind: 'rain', x: s.cam + VIEW / 2, y: 1.5 });
      s.fx.push({ k: 'rain', x: r3(s.cam + VIEW / 2), y: 1.5, t: 1.4 });
      for (const a of s.animals) if (a.st !== 'bye' && a.st !== 'happy' && a.st !== 'held' && a.x > s.cam - 0.5 && a.x < s.cam + VIEW + 0.5) give(s, a, 5, null, ev, true);
      if (s.boss) bossFeed(s, 11, null, ev);
      for (const m of s.melons) m.stop = 1;
    }
  }

  /* ---------- animali ---------- */
  function spawn(s, k, ev, c, side, pair) {
    const A = AN[k];
    const from = side || (rand(s) < 0.72 ? 1 : -1);
    const need = Math.round(A.need * c.needMul);
    const a = { id: ++s.seq, k, x: r3(from > 0 ? s.cam + VIEW + 0.7 : s.cam - 0.7), y: r3(0.3 + rand(s) * (DEPTH - 0.6)), z: A.fly ? A.fly : 0,
      vx: 0, face: -from, st: 'walk', t: 0, cd: 0.6 + rand(s) * 0.8, left: need, max: need, tg: 0, yum: 0 };
    if (pair) { a.pair = pair; a.side = side; }
    s.animals.push(a);
    ev.push({ type: 'spawn', id: a.id, k });
    news(s, ev, k);
  }
  // animali che stanno già preparando qualcosa contro il giocatore i
  const BUSY = { atk: 1, aim: 1, swoop: 1, wind: 1, charge: 1 };
  const attackers = (s, i) => s.animals.reduce((n, a) => n + (BUSY[a.st] && a.tg === i ? 1 : 0), 0);
  function nearestPlayer(s, x, y) {
    let best = null, bd = 1e9;
    for (const p of s.players) { if (p.st === 'nap') continue; const d = Math.abs(p.x - x) + Math.abs(p.y - y) * 1.5; if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function animals(s, dt, ev, c) {
    const sm = c.speedMul;
    for (const a of s.animals) {
      const A = AN[a.k];
      a.t += dt;
      if (a.yum > 0) a.yum = Math.max(0, a.yum - dt);
      if (a.cd > 0) a.cd -= dt;
      if (a.st === 'happy') { if (a.t > 1.0) { a.st = 'bye'; a.t = 0; a.face = a.x < s.cam + VIEW / 2 ? -1 : 1; } continue; }
      if (a.st === 'bye') { a.x += a.face * 2.6 * dt; if (A.fly) a.z = Math.min(2.2, a.z + dt); continue; }
      if (a.st === 'held') continue;
      if (a.st === 'dizzy') { a.t -= 2 * dt; if (a.t <= 0) { a.st = 'walk'; a.t = 0; a.cd = Math.max(a.cd, 0.5); } a.t += dt; continue; }
      // procione con la merenda rubata: scappa ridacchiando e poi torna
      if (a.st === 'steal') {
        a.x += a.face * 2.4 * dt;
        a.x = clamp(a.x, s.cam - 0.4, s.cam + VIEW + 0.4);
        if (a.t > 1.4) { a.st = 'walk'; a.t = 0; }
        continue;
      }
      const p = nearestPlayer(s, a.x, a.y);
      if (!p) { a.x += (a.x < s.cam + VIEW / 2 ? -1 : 1) * 0 * dt; continue; }
      a.tg = p.i;
      // cinghialotto: preavviso poi carica in linea retta
      if (a.st === 'wind') { if (a.t >= A.atk) { a.st = 'charge'; a.t = 0; a.vx = a.face * A.charge * Math.min(1.2, sm); ev.push({ type: 'charge', id: a.id }); } continue; }
      if (a.st === 'charge') {
        a.x += a.vx * dt;
        for (const q of s.players) if (q.st !== 'nap' && q.z < 0.35 && Math.abs(q.x - a.x) < A.r + 0.3 && Math.abs(q.y - a.y) < DY) bite(s, q, a, ev, 0.9 * Math.sign(a.vx));
        if (a.t > 1.3 || a.x < s.cam - 0.3 || a.x > s.cam + VIEW + 0.3) { a.st = 'walk'; a.t = 0; a.vx = 0; a.cd = A.cd * c.cdMul; a.x = clamp(a.x, s.cam - 0.3, s.cam + VIEW + 0.3); }
        continue;
      }
      // gazza: in volo; ogni tanto mira (0,45 s, si vede) e scende in picchiata sul punto mirato, poi risale
      if (A.fly && (a.st === 'aim' || a.st === 'swoop' || a.st === 'rise')) {
        if (a.st === 'aim') { a.face = p.x >= a.x ? 1 : -1; if (a.t >= 0.45) { a.st = 'swoop'; a.t = 0; a.tx = r3(p.x); a.ty = r3(p.y); } }
        else if (a.st === 'swoop') {
          const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(4.2 * dt, d);
          a.x += (dx / d) * sp; a.y += (dy / d) * sp;
          a.z = Math.max(0.25, a.z - 2.8 * dt);
          for (const q of s.players) if (q.st !== 'nap' && a.z <= 0.45 && Math.abs(q.x - a.x) < 0.5 && Math.abs(q.y - a.y) < DY && q.z < 0.6) { bite(s, q, a, ev, 0); a.st = 'rise'; a.t = 0; break; }
          if (a.st === 'swoop' && (d < 0.05 && a.z <= 0.3 || a.t > 1.2)) { a.st = 'rise'; a.t = 0; }
        } else { a.z = Math.min(A.fly, a.z + 1.8 * dt); if (a.z >= A.fly) { a.st = 'walk'; a.t = 0; a.cd = A.cd * c.cdMul; } }
        continue;
      }
      if (a.st === 'atk') {
        if (a.t >= A.atk) {
          const side = Math.abs(p.x - a.x) < A.r + 0.62 && Math.abs(p.y - a.y) < DY && p.z < 0.4;
          if (side) bite(s, p, a, ev, a.k === 'bear' ? 0.6 * a.face : 0);
          a.st = 'walk'; a.t = 0; a.cd = A.cd * c.cdMul * (0.8 + rand(s) * 0.4);
        }
        continue;
      }
      // camminata verso il posto d'attacco (le volpi da due lati opposti)
      let side = a.x < p.x ? -1 : 1;
      if (a.pair) side = a.side;
      const gx = p.x + side * (A.r + (A.fly ? 1.4 + (a.id % 3) * 0.5 : 0.45)), gy = A.fly ? clamp(p.y + (a.id % 2 ? 0.25 : -0.25), 0, DEPTH) : p.y;
      const dx = gx - a.x, dy = gy - a.y;
      const v = A.v * sm;
      if (A.fly) {
        a.x += clamp(dx, -1, 1) * v * dt; a.y += clamp(dy, -1, 1) * v * 0.6 * dt;
        a.face = p.x >= a.x ? 1 : -1;
        if (a.cd <= 0 && Math.abs(p.x - a.x) < 3.2 && attackers(s, p.i) < c.maxAtk && !s.animals.some((o) => o.st === 'aim' || o.st === 'swoop')) { a.st = 'aim'; a.t = 0; }
        continue;
      }
      // cinghialotto in fila con il giocatore: preavviso di carica
      if (A.charge && a.cd <= 0 && Math.abs(p.y - a.y) < 0.25 && Math.abs(p.x - a.x) > 1.6 && Math.abs(p.x - a.x) < 6.5 && attackers(s, p.i) < c.maxAtk) {
        a.st = 'wind'; a.t = 0; a.face = p.x >= a.x ? 1 : -1; continue;
      }
      if (A.charge && Math.abs(p.x - a.x) > 1.4) {
        // si mette in fila (stessa profondità) restando a distanza
        a.y += clamp(p.y - a.y, -1, 1) * v * 0.9 * dt;
        a.x += clamp((p.x + side * 3.2) - a.x, -1, 1) * v * 0.5 * dt;
        a.face = p.x >= a.x ? 1 : -1;
        continue;
      }
      const d = Math.hypot(dx, dy * 1.4);
      if (d > 0.08) { a.x += (dx / d) * Math.min(v, d / dt) * dt; a.y += (dy / d) * Math.min(v * 0.7, d / dt) * dt; }
      a.face = p.x >= a.x ? 1 : -1;
      const close = Math.abs(p.x - a.x) < A.r + 0.6 && Math.abs(p.y - a.y) < DY * 0.8;
      if (close && a.cd <= 0 && p.z < 0.4 && (attackers(s, p.i) < c.maxAtk || a.pair)) {
        // le volpi mordicchiano insieme
        if (a.pair) {
          const mate = s.animals.find((o) => o.pair === a.pair && o !== a && o.st === 'walk');
          if (mate && !(Math.abs(p.x - mate.x) < AN.fox.r + 0.7 && Math.abs(p.y - mate.y) < DY) && a.t < 2.2) continue;
          if (mate && mate.cd <= 0) { mate.st = 'atk'; mate.t = 0; }
        }
        a.st = 'atk'; a.t = 0;
      }
    }
    // separazione: gli animali non si sovrappongono
    const L = s.animals.filter((a) => a.st !== 'bye' && a.st !== 'held' && !AN[a.k].fly);
    for (let i = 0; i < L.length; i++) {
      for (let j = i + 1; j < L.length; j++) {
        const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, R = AN[a.k].r + AN[b.k].r;
        if (Math.abs(dx) < R * 0.9 && Math.abs(dy) < 0.3) {
          const push = (0.3 - Math.abs(dy)) * 0.5 * dt * 6, sy = dy >= 0 ? 1 : -1;
          if (a.st !== 'charge') a.y = clamp(a.y - sy * push, 0, DEPTH);
          if (b.st !== 'charge') b.y = clamp(b.y + sy * push, 0, DEPTH);
        }
      }
    }
    for (const a of s.animals) { a.y = r3(clamp(a.y, 0, DEPTH)); a.x = r3(a.x); a.z = r3(a.z); if (a.t > 1e4) a.t = 0; a.t = r3(a.t); a.cd = r3(a.cd); }
    s.animals = s.animals.filter((a) => !(a.st === 'bye' && (a.x < s.cam - 2 || a.x > s.cam + VIEW + 2)));
  }

  // morso affettuoso: il giocatore perde un pallino di energia (poi un attimo di invulnerabilità)
  function bite(s, p, a, ev, push) {
    if (p.inv > 0 || p.st === 'nap') return;
    p.hp--;
    p.inv = INV;
    p.st = 'hurt'; p.t = 0; p.combo = 0;
    if (p.hold) { const h = s.animals.find((x) => x.id === p.hold); if (h) { h.st = 'walk'; h.t = 0; } p.hold = 0; }
    if (push) p.x += push;
    if (a && AN[a.k] && AN[a.k].steal) p.sp = r3(Math.max(0, p.sp - 0.25));
    ev.push({ type: 'nibble', p: p.i, by: a ? a.k || a.by : '', x: p.x, y: p.y, hp: p.hp });
    if (p.hp <= 0) {
      p.st = 'nap'; p.t = 0; p.z = 0; p.vz = 0; p.mx = 0; p.my = 0;
      s.oops++; s.mistakes = s.oops;
      ev.push({ type: 'tired', p: p.i, left: LIVES - s.oops });
      if (isLost(s)) ev.push({ type: 'lose' });
    }
  }

  /* ---------- merende lanciate ---------- */
  function shots(s, dt, ev, c) {
    const keep = [];
    for (const q of s.shots) {
      const x0 = q.x;
      q.x = r3(q.x + q.vx * dt);
      q.left -= Math.abs(q.vx * dt);
      const lo = Math.min(x0, q.x) - 0.1, hi = Math.max(x0, q.x) + 0.1;
      let done = false;
      const p = s.players[q.o];
      // la gazza le prende al volo da lontano (un po' più larga), il procione le ruba
      for (const a of s.animals) {
        if (a.st === 'bye' || a.st === 'happy' || a.st === 'held' || a.st === 'steal') continue;
        const A = AN[a.k], R = A.fly ? 0.75 : A.r + 0.1;
        if (a.x + R < lo || a.x - R > hi || Math.abs(a.y - q.y) > (A.fly ? 0.65 : DY + A.r * 0.25)) continue;
        if (A.steal && a.st !== 'dizzy') {
          a.st = 'steal'; a.t = 0; a.face = q.vx > 0 ? 1 : -1;
          ev.push({ type: 'steal', id: a.id, x: a.x, y: a.y });
          news(s, ev, 'steal');
        } else {
          if (A.fly) ev.push({ type: 'catch', id: a.id, x: a.x, y: a.y });
          else ev.push({ type: 'hit', id: a.id, x: a.x, y: a.y });
          give(s, a, q.bite, p, ev, false);
        }
        done = true; break;
      }
      if (!done) {
        for (const m of s.melons) {
          if (m.stop || Math.abs(m.y - q.y) > m.w || m.x + MELON_R < lo || m.x - MELON_R > hi) continue;
          m.hp--;
          ev.push({ type: 'hit', id: m.id, x: m.x, y: m.y });
          if (m.hp <= 0) { m.stop = 1; ev.push({ type: 'melonStop', id: m.id, x: m.x, y: m.y }); if (p) p.sp = r3(Math.min(1, p.sp + 0.12)); }
          done = true; break;
        }
      }
      const b = s.boss;
      if (!done && b && b.st !== 'enter' && b.st !== 'full' && Math.abs(b.y - q.y) < b.r * 0.7 + 0.2 && b.x - b.r * 0.7 < hi && b.x + b.r * 0.7 > lo) {
        bossFeed(s, q.bite, p, ev);
        ev.push({ type: 'hit', id: 0, x: b.x, y: b.y });
        done = true;
      }
      if (!done) {
        const o = s.objs.find((x) => x.k === 'crate' && Math.abs(x.y - q.y) < DY && x.x + 0.35 > lo && x.x - 0.35 < hi);
        if (o) { hitCrate(s, o, ev); done = true; }
      }
      if (!done && q.left > 0 && q.x > s.cam - 1 && q.x < s.cam + VIEW + 1) keep.push(q);
    }
    s.shots = keep;
  }

  /* ---------- cassette, carrelli, raccolta ---------- */
  function hitCrate(s, o, ev) {
    o.hp--;
    if (o.hp > 0) { ev.push({ type: 'hit', id: o.id, x: o.x, y: o.y }); return; }
    s.objs = s.objs.filter((x) => x !== o);
    s.picks.push({ id: ++s.seq, k: o.drop, x: o.x, y: o.y, t: 0 });
    ev.push({ type: 'crate', id: o.id, x: o.x, y: o.y, drop: o.drop });
  }
  function objects(s, dt, ev) {
    for (const o of s.objs) {
      if (o.k !== 'cart') continue;
      if (o.run > 0) {
        o.x = r3(o.x + o.vx * dt);
        o.run = r3(o.run - Math.abs(o.vx * dt));
        o.vx *= 0.995;
        for (const a of s.animals) {
          if (a.st === 'bye' || a.st === 'happy' || a.st === 'held' || AN[a.k].fly) continue;
          if ((o.hit || []).includes(a.id)) continue;
          if (Math.abs(a.x - o.x) < AN[a.k].r + 0.45 && Math.abs(a.y - o.y) < 0.45) {
            (o.hit = o.hit || []).push(a.id);
            ev.push({ type: 'cartFeed', id: o.id, to: a.id });
            give(s, a, 4, s.players[o.by] || null, ev, true);
          }
        }
        if (o.run <= 0 || o.x > s.cam + VIEW + 3 || o.x < s.cam - 3) { o.run = 0; o.vx = 0; o.hit = []; }
        continue;
      }
      // spinto da un giocatore che ci cammina contro
      for (const p of s.players) {
        if (p.st === 'nap' || p.z > 0.3 || Math.abs(p.mx) < 0.3) continue;
        const dx = (o.x - p.x) * Math.sign(p.mx);
        if (dx > 0 && dx < 0.75 && Math.abs(o.y - p.y) < 0.4) {
          o.vx = 5 * Math.sign(p.mx); o.run = 6; o.by = p.i; o.hit = [];
          ev.push({ type: 'cart', id: o.id });
          break;
        }
      }
    }
    // oggetti a terra: si raccolgono passandoci sopra
    if (s.picks.length) {
      s.picks = s.picks.filter((k) => {
        k.t = r3(k.t + dt);
        for (const p of s.players) {
          if (p.st === 'nap' || p.z > 0.5 || Math.abs(k.x - p.x) > 0.5 || Math.abs(k.y - p.y) > 0.38) continue;
          if (k.k === 'apple') p.hp = Math.min(CH[p.ch].hp, p.hp + 2);
          else if (k.k === 'star') { p.sp = r3(Math.min(1, p.sp + 0.5)); if (p.sp >= 1 && !p.spOk) { p.spOk = 1; ev.push({ type: 'spReady', p: p.i }); } }
          else if (k.k === 'basket') p.bk = 1;
          ev.push({ type: 'pick', p: p.i, k: k.k });
          return false;
        }
        return k.t < 25 && k.x > s.cam - 1;
      });
    }
  }

  /* ---------- animalone ---------- */
  function bossFeed(s, n, p, ev) {
    const b = s.boss;
    if (!b || b.st === 'full') return;
    b.fed = Math.min(b.need, b.fed + n);
    s.bossFed = b.fed;
    b.yum = 0.3;
    if (p) { p.sp = r3(Math.min(1, p.sp + n * SP_BITE * 0.6)); if (p.sp >= 1 && !p.spOk) { p.spOk = 1; ev.push({ type: 'spReady', p: p.i }); } }
    ev.push({ type: 'feed', p: p ? p.i : -1, id: 0, bite: n, x: b.x, y: b.y, big: 0 });
    // il risucchio goloso si interrompe dandogli da mangiare
    if (b.st === 'suck') { b.st = 'idle'; b.t = 0; b.nx = Math.max(b.nx, 1.2); ev.push({ type: 'gulp' }); }
    if (b.fed >= b.need) {
      b.st = 'full'; b.t = 0;
      s.won = true;
      s.melons = []; s.waves2 = []; s.shots = [];
      for (const a of s.animals) if (a.st !== 'bye') { a.st = 'happy'; a.t = 0; }
      ev.push({ type: 'win' });
    }
  }
  function bossTick(s, dt, ev, c) {
    const b = s.boss;
    if (b.yum > 0) b.yum = Math.max(0, b.yum - dt);
    b.t += dt;
    const home = s.cam + VIEW - 1.7;
    if (b.st === 'enter') { b.x = Math.max(home, b.x - 2.5 * dt); if (b.x <= home) { b.st = 'idle'; b.t = 0; } return; }
    if (b.st === 'full') return;
    const ph = b.fed >= b.need * 0.8 ? 2 : b.fed >= b.need * 0.5 ? 1 : 0;
    if (ph > b.ph) { b.ph = ph; b.ai = 0; ev.push({ type: 'phase', n: ph }); }
    const p = nearestPlayer(s, b.x, b.y) || s.players[0];
    if (b.st === 'idle') {
      // segue il giocatore in profondità, resta sul lato destro
      b.y += clamp(p.y - b.y, -1, 1) * 0.8 * dt;
      b.y = clamp(b.y, 0.6, DEPTH - 0.6);
      b.x += clamp(home - b.x, -1, 1) * 1.2 * dt;
      b.face = -1;                                   // guarda la strada (chi è dietro di lui non viene morso)
      // chi gli sta incollato davanti viene mordicchiato (si sfama meglio da un passo di distanza)
      if (b.cd > 0) b.cd -= dt;
      // (solo davanti alla bocca e dopo un attimo di calma: chi è dietro o di lato viene solo spinto via piano)
      for (const q of s.players) {
        if (q.st === 'nap' || q.z >= 0.4 || Math.abs(q.x - b.x) >= b.r * 0.55 + 0.3 || Math.abs(q.y - b.y) >= b.r * 0.5) continue;
        if ((q.x - b.x) * b.face > 0 && b.t > 0.6 && b.cd <= 0) { bite(s, q, { by: s.bossK }, ev, b.face * 0.8); b.cd = 1.4; }
        else if (q.x >= b.x) q.x += 1.5 * dt;
      }
      b.nx -= dt;
      if (b.nx <= 0 && !s.melons.length && !s.waves2.length) {
        const cyc = BOSSES[b.k].cycle[b.ph];
        b.a = cyc[b.ai % cyc.length]; b.ai++;
        b.st = 'wind'; b.t = 0;
        ev.push({ type: 'bossAtk', a: b.a });
      }
      return;
    }
    if (b.st === 'wind') {
      // preavviso (0,7 s): l'animalone si prepara (per la carica si mette in fila con il giocatore)
      // (la fila si decide nei primi 0,4 s, poi resta ferma: c'è tempo per spostarsi)
      if (b.a === 'charge' && b.t < 0.4) b.y = clamp(b.y + clamp(p.y - b.y, -1, 1) * 2.4 * dt, 0.3, DEPTH - 0.3);
      if (b.t < (b.a === 'charge' ? 0.95 : 0.7)) return;
      b.t = 0;
      const a = b.a;
      if (a === 'melon') {
        // file di angurie che coprono TUTTA la profondità: non si schivano spostandosi, si saltano (o se ne ferma una)
        const n = c.melons, rows = [];
        for (let i = 0; i < n; i++) rows.push(r3(0.25 + (i * (DEPTH - 0.5)) / (n - 1)));
        const lag = rand(s) < 0.5, w = r3((DEPTH - 0.5) / (n - 1) / 2 + 0.1);
        rows.forEach((y, i) => s.melons.push({ id: ++s.seq, x: r3(b.x - b.r * 0.6 - (lag ? (i % 2) * c.melonGap : 0)), y, w, vx: -MELON_V, hp: 2, stop: 0 }));
        b.st = 'idle'; b.nx = c.bossIv;
      } else if (a === 'stomp') {
        // pestone: onda d'urto che si allarga su tutta la strada, si evita solo saltando
        s.waves2.push({ id: ++s.seq, x: b.x, y: b.y, r: 0.4, hit: [] });
        ev.push({ type: 'stomp', x: b.x, y: b.y });
        b.st = 'idle'; b.nx = c.bossIv;
      } else if (a === 'call') {
        const k = BOSSES[b.k].call, n = s.np >= 2 ? 3 : 2;
        for (let i = 0; i < n; i++) spawn(s, AN[k].from <= s.level + 2 ? k : 'bunny', ev, c, i % 2 ? -1 : 1, 0);
        ev.push({ type: 'call', n });
        b.st = 'idle'; b.nx = c.bossIv * 1.2;
      } else if (a === 'charge') {
        // carica lungo la fila del giocatore (si evita cambiando profondità o saltando)
        b.st = 'charge'; b.vx = b.x > p.x ? -6 : 6; b.face = b.vx < 0 ? -1 : 1;
        ev.push({ type: 'charge', id: 0 });
      } else if (a === 'dive') {
        // picchiata: ombra sul giocatore, atterra dopo 1 s
        b.st = 'dive'; b.tx = p.x; b.ty = p.y; b.ox = b.x; b.oy = b.y;
      } else if (a === 'suck') {
        b.st = 'suck';
      }
      return;
    }
    if (b.st === 'charge') {
      b.x += b.vx * dt;
      for (const q of s.players) if (q.st !== 'nap' && q.z < 0.4 && Math.abs(q.x - b.x) < b.r * 0.6 + 0.3 && Math.abs(q.y - b.y) < b.r * 0.45 + 0.1) bite(s, q, { by: s.bossK }, ev, Math.sign(b.vx) * 0.9);
      if (b.x < s.cam + 0.8 || b.x > s.cam + VIEW - 0.8 || b.t > 2.2) { b.x = clamp(b.x, s.cam + 0.8, s.cam + VIEW - 0.8); b.st = 'back'; b.t = 0; }
      return;
    }
    if (b.st === 'back') {
      b.x += clamp(home - b.x, -1, 1) * 3 * dt;
      b.face = home >= b.x ? 1 : -1;
      if (Math.abs(home - b.x) < 0.1) { b.st = 'idle'; b.t = 0; b.nx = c.bossIv; b.face = -1; }
      return;
    }
    if (b.st === 'dive') {
      const k = Math.min(1, b.t / 1.0);
      b.x = b.ox + (b.tx - b.ox) * k; b.y = b.oy + (b.ty - b.oy) * k; b.z = Math.sin(k * Math.PI) * 2.2;
      if (k >= 1) {
        b.z = 0;
        for (const q of s.players) if (q.st !== 'nap' && q.z < 0.4 && Math.abs(q.x - b.x) < b.r * 0.6 + 0.25 && Math.abs(q.y - b.y) < b.r * 0.45 + 0.1) bite(s, q, { by: s.bossK }, ev, 0);
        b.st = 'back'; b.t = 0;
      }
      return;
    }
    if (b.st === 'suck') {
      // risucchio goloso: tira tutti verso la bocca; chi arriva viene mordicchiato. Dura finché non lo si sfama (max 2,6 s)
      for (const q of s.players) if (q.st !== 'nap' && Math.abs(q.x - b.x) < b.r * 0.6 + 0.35 && Math.abs(q.y - b.y) < b.r * 0.5 + 0.1) bite(s, q, { by: s.bossK }, ev, -1.2);
      if (b.t > 2.6) { b.st = 'idle'; b.t = 0; b.nx = c.bossIv; }
    }
  }

  // angurie che rotolano e onde d'urto del pestone
  function hazards(s, dt, ev) {
    if (s.melons.length) {
      s.melons = s.melons.filter((m) => {
        if (m.stop) { m.t = (m.t || 0) + dt; return m.t < 0.6; }
        m.x = r3(m.x + m.vx * dt);
        for (const p of s.players) if (p.st !== 'nap' && p.z < 0.3 && Math.abs(p.x - m.x) < MELON_R + 0.22 && Math.abs(p.y - m.y) < m.w) bite(s, p, { by: 'melon' }, ev, -0.5);
        return m.x > s.cam - 1;
      });
    }
    if (s.waves2.length) {
      s.waves2 = s.waves2.filter((w) => {
        const r0 = w.r;
        w.r = r3(w.r + WAVE_V * dt);
        for (const p of s.players) {
          if (p.st === 'nap' || w.hit.includes(p.i)) continue;
          // distanza "schiacciata" in profondità (l'onda è un'ellisse sul marciapiede): copre tutta la strada
          const d = Math.hypot(p.x - w.x, (p.y - w.y) * 2.2);
          if (d >= r0 - 0.15 && d <= w.r + 0.15 && p.z < 0.2) { w.hit.push(p.i); bite(s, p, { by: 'stomp' }, ev, 0); }
        }
        return w.r < VIEW + 4;
      });
    }
  }

  /* ---------- compagno guidato dalla CPU (deterministico, solo stato pubblico) ---------- */
  function cpuInput(s, i) {
    const p = s.players[i], ai = p.ai, C = CH[p.ch];
    const out = { mx: 0, my: 0, a: ai.n[0], b: ai.n[1], c: ai.n[2], s: ai.n[3] };
    if (p.st === 'nap' || s.ready > 0) return out;
    const tap = (k) => { ai.n[k]++; out['abcs'[k]] = ai.n[k]; };
    // pericoli: angurie in arrivo e onde d'urto → salta
    for (const m of s.melons) if (!m.stop && Math.abs(m.y - p.y) < 0.35 && m.x > p.x && m.x - p.x < 0.95) { tap(2); break; }
    for (const w of s.waves2) { const d = Math.hypot(p.x - w.x, (p.y - w.y) * 2.2); if (d - w.r > 0.15 && d - w.r < 0.55) { tap(2); break; } }
    if (p.sp >= 1 && (s.boss || s.animals.filter((a) => a.st !== 'bye' && a.st !== 'happy').length >= 2)) tap(3);
    let tgt = null, bd = 1e9;
    for (const a of s.animals) {
      if (a.st === 'bye' || a.st === 'happy' || a.st === 'held') continue;
      const d = Math.abs(a.x - p.x) + Math.abs(a.y - p.y) * 2 + (a.tg === i ? 0 : 0.8);
      if (d < bd) { bd = d; tgt = { x: a.x, y: a.y, r: AN[a.k].r, fly: AN[a.k].fly && a.z > 0.8, steal: AN[a.k].steal }; }
    }
    if (!tgt && s.boss && s.boss.st !== 'enter') tgt = { x: s.boss.x, y: s.boss.y, r: s.boss.r * 0.8 + 0.5, boss: 1 };
    if (!tgt) {
      // niente da sfamare: avanti verso il prossimo tratto (o resta vicino al compagno)
      const lead = s.players[1 - i] || p;
      out.mx = s.phase === 'walk' ? (p.x < Math.max(lead.x - 0.5, s.cam + VIEW * 0.6) ? 1 : 0) : 0;
      out.my = clamp((lead.y + (i ? 0.6 : -0.6) - p.y) * 2, -1, 1);
      return out;
    }
    const side = p.x <= tgt.x ? -1 : 1;
    const dist = tgt.fly ? 3.5 : tgt.boss ? 1.0 : 0.6;
    const gx = tgt.x + side * (tgt.r + dist), gy = tgt.y;
    out.mx = clamp((gx - p.x) * 2.5, -1, 1);
    out.my = clamp((gy - p.y) * 3, -1, 1);
    if (Math.abs(gx - p.x) < 0.25) out.mx = 0;
    if (Math.abs(gy - p.y) < 0.1) out.my = 0;
    // si gira verso il bersaglio
    const facing = (tgt.x - p.x) * p.face > 0;
    if (!facing) out.mx = tgt.x > p.x ? 0.5 : -0.5;
    if (p.cd <= 0 && Math.abs(tgt.y - p.y) < 0.3 && facing) {
      if (tgt.fly) tap(1);
      else if (Math.abs(tgt.x - p.x) < tgt.r + C.reach - 0.05) tap(0);
      else if (!tgt.steal && Math.abs(tgt.x - p.x) < 5) tap(1);
    }
    return out;
  }

  /* ---------- tempo reale ---------- */
  function step(s, dt, inputs) {
    const ev = [];
    if (isOver(s) || !(dt > 0)) return ev;
    if (s.ready > 0) {
      s.ready -= dt;
      if (s.ready > 0) return ev;
      dt = -s.ready; s.ready = 0; ev.push({ type: 'ready' });
    }
    s.acc += Math.min(dt, 0.1);
    while (s.acc >= TICK - 1e-9) {
      s.acc -= TICK;
      ev.push(...tick(s, inputs));
      if (isOver(s)) break;
    }
    return ev;
  }

  const isWon = (s) => !!s.won;
  const isLost = (s) => s.oops >= LIVES;
  const isOver = (s) => isWon(s) || isLost(s);
  const rate = (s) => (!s.oops ? 3 : s.oops === 1 ? 2 : 1);
  // 0..0,7 lungo i tratti di strada, 0,7..1 la pancia dell'animalone
  function progress(s) {
    if (s.won) return 1;
    if (s.view) return s.prog || 0;
    if (s.boss) return Math.min(1, 0.7 + 0.3 * (s.boss.fed / s.boss.need));
    const w = s.waves[s.sec] || [], done = s.phase === 'fight' ? (w.length - s.q.length - s.animals.filter((a) => a.st !== 'bye' && a.st !== 'happy').length) / Math.max(1, w.length) : 0;
    return Math.max(0, Math.min(0.7, (0.7 * (s.sec + Math.max(0, done))) / Math.max(1, s.waveN)));
  }
  const parTime = (s) => Math.round(s.waveN * 22 + 30 + s.bossNeed / 4);

  /* ---------- vista compatta: solo ciò che serve a disegnare (snapshot di rete per l'ospite) ---------- */
  const pick = (o, keys) => { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = typeof o[k] === 'number' ? r3(o[k]) : o[k]; return r; };
  const PV = ['i', 'ch', 'x', 'y', 'z', 'face', 'hp', 'st', 't', 'sp', 'inv', 'bk', 'cpu'];
  const AV = ['id', 'k', 'x', 'y', 'z', 'face', 'st', 'left', 'max', 'yum', 'tx', 'ty'];
  const BV = ['k', 'x', 'y', 'z', 'r', 'fed', 'need', 'st', 'a', 't', 'face', 'yum', 'tx', 'ty'];
  function view(s) {
    return {
      v: 1, view: 1, level: s.level, np: s.np, theme: s.theme, t: r3(s.t), ready: r3(s.ready), cam: r3(s.cam), phase: s.phase, sec: s.sec,
      waveN: s.waveN, lock: s.lock, oops: s.oops, mistakes: s.mistakes, moves: s.moves, fedN: s.fedN, won: s.won, bossK: s.bossK,
      bossNeed: s.bossNeed, bossFed: s.bossFed, prog: r3(progress(s)),
      players: s.players.map((p) => pick(p, PV)),
      animals: s.animals.map((a) => pick(a, AV)),
      shots: s.shots.map((q) => pick(q, ['id', 'o', 'x', 'y', 'z', 'vx'])),
      melons: s.melons.map((m) => pick(m, ['id', 'x', 'y', 'w', 'stop'])),
      waves2: s.waves2.map((w) => pick(w, ['id', 'x', 'y', 'r'])),
      picks: s.picks.map((k) => pick(k, ['id', 'k', 'x', 'y'])),
      objs: s.objs.filter((o) => o.x > s.cam - 2 && o.x < s.cam + VIEW + 2).map((o) => pick(o, ['id', 'k', 'x', 'y', 'hp', 'run'])),
      fx: s.fx.map((f) => pick(f, ['k', 'x', 'y', 't'])),
      boss: s.boss ? pick(s.boss, BV) : null,
    };
  }

  HH.street = {
    TICK, LIVES, READY, DEPTH, VIEW, GRAV, SEC, DY, CH, AN, KINDS, THEMES, BOSSES, BOSS_OF, MELON_R, MELON_V, WAVE_V,
    config, newLevel, step, tick, cpuInput, setCpu, isWon, isLost, isOver, rate, progress, parTime, lockAt, view,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
