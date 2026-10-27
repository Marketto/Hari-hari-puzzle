/* Hari Snack Rush — logica pura (nessun DOM), macchina a stati deterministica e serializzabile.
 *
 * Gioco d'azione "a corridoio" (stile mob control), senza violenza: Hari sta in fondo al sentiero, si muove solo a
 * destra/sinistra e lancia merende in avanti a cadenza fissa (semi di girasole, poi mirtilli, fragole, ciliegie, mele).
 * Dal fondo arrivano orde di animaletti affamati: ognuno ha un numerino = bocconi che gli servono; quando è sazio
 * sorride e torna a casa saltellando. Le porte sul sentiero cambiano quante merende partono per lancio (ventaglio).
 * Dopo l'ultima ondata arriva un animalone golosissimo: si sposta a destra/sinistra e soffia cose innocue e buffe
 * (gusci di noce, bolle, foglie, petali) da schivare. Quando la sua pancia è piena si addormenta felice = livello vinto.
 * Se un animale affamato raggiunge Hari gli ruba la merenda (−1 cuore); idem se Hari si prende una bolla sul naso.
 *
 * Coordinate: x laterale in [-1, 1] (bordi del sentiero), z profondità in metri dal punto di Hari (0) all'orizzonte
 * (Z_FAR). Il tempo avanza a passi fissi di 1/60 s, quindi stesso seme + stessi input = stessa partita.
 * Il generatore casuale vive nello stato (`rs`, mulberry32): lo stato è JSON puro, si salva e si riprende.
 *
 * API (modificano lo stato passato):
 *   config(level)                    parametri del livello (curva di difficoltà)
 *   newLevel(level, rnd)             stato iniziale con il copione delle ondate (rnd usato per copione e seme interno)
 *   step(s, dt, input) → eventi      tempo reale: pausa "Pronti?", attesa del primo input, poi passi fissi da 1/60 s
 *                                    input = { x: bersaglio laterale } (trascinamento) o { dir: -1 | 0 | 1 } (tasti)
 *   tick(s, input) → eventi          un passo fisso
 *   start(s)                         primo input ricevuto: si parte
 *   applyGate(power, op, max)        merende per lancio dopo una porta ('x2' 'x3' '+1' '+2' '+3' '-1' '-2' '/2')
 *   treatOf(power)                   che merenda parte ('seed' 'blueberry' 'strawberry' 'cherry' 'apple')
 *   isWon · isLost · isOver · rate · progress · fanOf(power)
 * Eventi: go · toss{n,treat} · nibble{id,x,z,left} · full{id,kind,x,z,by} · gate{op,side,power,prev} · wave{i}
 *         snatch{what,x,z,left} · lose · boss{kind} · bossNibble{fed,max,x} · blow{n} · land{x,kind} · call{n} · win
 *   full.by: 'snack' (sazio) · 'share' (Hari divide la merenda dopo un furto) · 'pass' · 'nap' (il boss dorme)
 * Esporta HH.snack.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const TICK = 1 / 60;
  const LIVES = 3;
  const READY = 1.6;           // secondi di "Pronti?"
  const Z_FAR = 26;            // orizzonte: qui nascono animali e porte
  const LINE_Z = 0.35;         // un animale che arriva qui ha raggiunto Hari
  const X_MAX = 0.82;          // Hari resta sul sentiero
  const MOVE_V = 3.4;          // velocità laterale di Hari (unità/s): tutto il sentiero in ~0,5 s
  const TOSS_IV = 0.3;         // un lancio ogni 0,3 s
  const TREAT_V = 22;          // velocità delle merende in volo
  const TREAT_R = 0.035;       // mezza larghezza di una merenda
  const POWER_MAX = 10;        // merende per lancio, al massimo
  const CALM = 1.6;            // dopo una merenda rubata: tempo di grazia
  const SHARE_Z = 5;           // dopo un furto Hari divide la merenda con chi è più vicino di così
  const BOSS_Z = 12;           // distanza a cui si ferma l'animalone
  const BOSS_R = 0.4;          // mezza larghezza dell'animalone (bocca larga!)
  const DROP_V = 9;            // velocità di ciò che soffia l'animalone
  const DROP_R = 0.19;         // quanto vicino deve cadere per finire sul naso di Hari
  const DROP_SPREAD = 0.42;    // distanza tra gli oggetti soffiati insieme

  // animali: r = mezza larghezza, need = bocconi base, v = moltiplicatore di velocità, zig = zig-zag laterale (unità/s)
  const ANIMALS = {
    chick: { r: 0.1, need: 1, v: 1, zig: 0, from: 1 },
    bunny: { r: 0.11, need: 1, v: 1.15, zig: 0.32, from: 2 },
    piggy: { r: 0.15, need: 3, v: 0.9, zig: 0, from: 3 },
    bear: { r: 0.2, need: 7, v: 0.78, zig: 0, from: 5 },
    sheep: { r: 0.17, need: 4, v: 0.95, zig: 0.18, from: 7 },
  };
  const KINDS = Object.keys(ANIMALS);
  // animaloni golosi a rotazione e cosa soffiano (tutto innocuo)
  const BOSSES = [
    { kind: 'squirrel', drop: 'shell' },
    { kind: 'polar', drop: 'bubble' },
    { kind: 'owl', drop: 'leaf' },
    { kind: 'kitty', drop: 'petal' },
  ];
  // merende di Hari: più ne lancia, più sono golose (solo aspetto, ognuna vale un boccone)
  const TREATS = ['seed', 'blueberry', 'strawberry', 'cherry', 'apple'];
  const treatOf = (power) => TREATS[Math.min(TREATS.length - 1, Math.floor((power - 1) / 2))];
  const GOOD = ['+1', '+2', '+3', 'x2', 'x3'];
  const BAD = ['-1', '-2', '/2'];

  /* ---------- curva di difficoltà (monotona) ---------- */
  function config(level) {
    const L = Math.max(1, level | 0);
    const tier = L <= 2 ? 0 : L <= 5 ? 1 : L <= 9 ? 2 : L <= 14 ? 3 : 4;
    const waves = Math.min(13, 5 + Math.ceil(L / 2));                // 6 · 6 · 7 · 7 · 8 … 13
    return {
      level: L, tier, waves,
      speed: +Math.min(6.4, 3.4 + 0.2 * (L - 1)).toFixed(2),        // metri/s degli animali (e del sentiero)
      waveGap: +Math.max(4.4, 8.2 - 0.3 * (L - 1)).toFixed(2),        // secondi tra un'ondata e l'altra
      pressure: +Math.min(0.54, 0.36 + 0.025 * (L - 1)).toFixed(3),   // quanto "pesa" un'ondata rispetto al potere garantito: chi sbaglia porta resta indietro
      maxCount: Math.min(22, 6 + L),                                  // animali per ondata, al massimo
      needMul: +(1 + 0.08 * (L - 1)).toFixed(2),                      // fame degli animali grandi
      gates: Math.min(waves - 1, 3 + Math.floor(L / 3)),             // porte (singole o in coppia)
      negatives: L >= 2,                                              // porte "cattive" (−1, −2) in coppia con una buona
      halve: L >= 6,                                                  // anche ÷2
      boss: BOSSES[(L - 1) % BOSSES.length],
      bossNeed: Math.min(560, 200 + 22 * (L - 1)),                   // bocconi per riempire l'animalone
      bossV: +Math.min(1.3, 0.5 + 0.055 * (L - 1)).toFixed(3),       // velocità laterale del boss
      // un soffio alla volta in aria (volo ≈ 1,3 s): c'è sempre una via di fuga
      blowIv: +Math.max(1.8, 2.6 - 0.07 * (L - 1)).toFixed(2),         // secondi tra un lancio e l'altro
      blowN: L < 3 ? 1 : L < 8 ? 2 : 3,                              // oggetti per soffio
      powerMax: Math.min(POWER_MAX, 4 + L),                           // merende per lancio al massimo: 5 al livello 1, 10 dal 6
      call: L >= 4 ? +Math.max(4.5, 8.5 - 0.3 * (L - 4)).toFixed(2) : 0,   // l'animalone chiama amici affamati ogni tot secondi
      kinds: KINDS.filter((k) => ANIMALS[k].from <= L),
    };
  }

  /* ---------- rng nello stato (mulberry32, come HH.rng) ---------- */
  function rand(s) {
    s.rs = (s.rs + 0x6d2b79f5) >>> 0;
    let t = s.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const r2 = (v) => Math.round(v * 100) / 100 || 0;     // niente -0: lo stato resta identico dopo JSON

  /* ---------- porte ---------- */
  function applyGate(power, op, max = POWER_MAX) {
    const n = +op.slice(1);
    const v = op[0] === 'x' ? power * n : op[0] === '+' ? power + n : op[0] === '-' ? power - n : Math.ceil(power / n);
    return clamp(v, 1, max);
  }
  const bestOf = (power, g, max) => Math.max(g.l ? applyGate(power, g.l, max) : power, g.r ? applyGate(power, g.r, max) : power);

  function makeGate(cfg, rnd, idx) {
    const L = cfg.level;
    const good = GOOD.filter((op) => (op === '+3' || op === 'x2' ? L >= 3 : op === 'x3' ? L >= 6 : true));
    const bad = BAD.filter((op) => (op === '/2' ? cfg.halve : op === '-2' ? L >= 4 : cfg.negatives));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    // la prima porta è sempre buona e singola: si impara a passarci in mezzo
    const pairChance = idx === 0 ? 0 : Math.min(0.85, 0.45 + 0.03 * L);
    const a = pick(good);
    let b = null;
    if (rnd() < pairChance) {
      if (bad.length && rnd() < Math.min(0.85, 0.5 + 0.04 * L)) b = pick(bad);
      else { b = pick(good); if (b === a) b = good[(good.indexOf(a) + 1) % good.length]; }
    }
    const left = rnd() < 0.5;
    const g = { l: left ? a : b, r: left ? b : a };
    return g;
  }

  /* ---------- copione del livello: ondate di animali e porte ---------- */
  function formation(cfg, rnd, list) {
    // file di animali: righe da 2–5 (meno se grossi), con disegni diversi; dz = distanza oltre l'orizzonte
    const out = [];
    const shape = Math.floor(rnd() * 4);            // 0 righe · 1 a V · 2 colonna · 3 sparsi
    let i = 0, row = 0;
    while (i < list.length) {
      const rMax = Math.max(...list.slice(i, i + 5).map((k) => ANIMALS[k].r));
      const fit = Math.max(1, Math.floor(1.56 / (2 * rMax + 0.08)));
      let per = shape === 2 ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 4);
      per = Math.min(per, fit, list.length - i);
      const span = per > 1 ? Math.min(1.5, (per - 1) * (2 * rMax + 0.12)) : 0;
      const room = 1.56 - span;
      const x0 = -0.78 + (shape === 3 ? rnd() * room : room / 2 + (rnd() - 0.5) * room * 0.6);
      for (let k = 0; k < per; k++, i++) {
        const x = per > 1 ? x0 + (span * k) / (per - 1) : x0 + (shape === 2 ? 0 : 0);
        const vee = shape === 1 && per > 1 ? Math.abs(k - (per - 1) / 2) * 0.55 : 0;
        const jit = shape === 3 ? rnd() * 0.9 : 0;
        out.push({ kind: list[i], x: r2(clamp(x, -0.8, 0.8)), dz: r2(row * 1.5 + vee + jit) });
      }
      row++;
    }
    return out;
  }

  function buildScript(cfg, rnd) {
    const ev = [];
    let gp = 1;                                       // potere garantito scegliendo sempre la porta migliore
    // le porte stanno a metà tra un'ondata e l'altra, distribuite sull'intero livello
    const gateAt = new Set();
    for (let g = 0; g < cfg.gates; g++) gateAt.add(1 + Math.floor((g * (cfg.waves - 1)) / Math.max(1, cfg.gates)));
    let t = 1.2, gi = 0;
    for (let w = 0; w < cfg.waves; w++) {
      if (gateAt.has(w)) {
        const g = makeGate(cfg, rnd, gi++);
        ev.push({ t: r2(t - cfg.waveGap * 0.5), k: 'g', l: g.l, r: g.r });
        // il potere guadagnato arriva quando la porta raggiunge Hari: conta per l'ondata dopo
        gp = bestOf(gp, g, cfg.powerMax);
      }
      // ondata: fame totale proporzionata al potere garantito
      const budget = Math.max(2, Math.round(cfg.pressure * gp * (cfg.waveGap / TOSS_IV)));
      const list = [];
      let need = 0;
      while (list.length < cfg.maxCount) {
        const pool = cfg.kinds.filter((k) => needOf(cfg, k) <= Math.max(1, budget - need));
        if (!pool.length) break;
        // i grandi compaiono più spesso nei livelli alti
        const k = pool[Math.floor(Math.pow(rnd(), 1 / (1 + cfg.tier * 0.35)) * pool.length)];
        list.push(k); need += needOf(cfg, k);
        if (need >= budget) break;
      }
      // i più affamati in fondo alla formazione
      list.sort((a, b) => needOf(cfg, a) - needOf(cfg, b));
      for (const a of formation(cfg, rnd, list)) ev.push({ t: r2(t), k: 'a', kind: a.kind, x: a.x, dz: a.dz });
      ev.push({ t: r2(t), k: 'w', i: w });
      t += cfg.waveGap;
    }
    ev.sort((a, b) => a.t - b.t);
    return { ev, end: r2(t - cfg.waveGap + Z_FAR / (cfg.speed * 0.78) + 1) };
  }
  const needOf = (cfg, kind) => (ANIMALS[kind].need > 1 ? Math.round(ANIMALS[kind].need * cfg.needMul) : 1);

  function newLevel(level, rnd = Math.random) {
    const cfg = config(level);
    const sc = buildScript(cfg, rnd);
    return {
      v: 1, level: cfg.level, speed: cfg.speed, waves: cfg.waves,
      script: sc.ev, si: 0, end: sc.end, wave: 0,
      t: 0, acc: 0, ready: READY, wait: false, waitMode: false,
      px: 0, tx: null, dir: 0, power: 1, best: 1, pmax: cfg.powerMax, tossT: 0.1,
      animals: [], treats: [], gates: [], drops: [],
      boss: null, bossKind: cfg.boss.kind, drop: cfg.boss.drop, bossMax: cfg.bossNeed, bossFed: 0,
      bossV: cfg.bossV, blowIv: cfg.blowIv, blowN: cfg.blowN, call: cfg.call,
      oops: 0, mistakes: 0, calm: 0, fed: 0, gatesTaken: 0, moves: 0, won: false, seq: 0, ticks: 0,
      rs: Math.floor(rnd() * 4294967296) >>> 0,
    };
  }

  /* ---------- merende a ventaglio ---------- */
  // per ogni merenda del lancio: scostamento iniziale e velocità laterale
  function fanOf(n) {
    const out = [], h = (n - 1) / 2, edge = Math.min(1.0, 0.13 * (n - 1));
    for (let i = 0; i < n; i++) {
      const k = h ? (i - h) / h : 0;
      out.push({ dx: r2((i - h) * 0.06), vx: +(edge * k).toFixed(3) });
    }
    return out;
  }

  function start(s) { if (s.wait) { s.wait = false; return true; } return false; }

  /* ---------- un passo fisso ---------- */
  function tick(s, input) {
    const ev = [];
    if (isOver(s)) return ev;
    const dt = TICK;
    s.ticks++;
    s.t = s.ticks / 60;
    if (s.calm > 0) s.calm = Math.max(0, s.calm - dt);

    // movimento di Hari: verso il dito, oppure con i tasti
    if (input) {
      if (typeof input.x === 'number' && isFinite(input.x)) { s.tx = clamp(input.x, -X_MAX, X_MAX); s.dir = 0; }
      if (input.dir === -1 || input.dir === 1) { s.dir = input.dir; s.tx = null; } else if (input.dir === 0) s.dir = 0;
    }
    if (s.dir) s.px = clamp(s.px + s.dir * MOVE_V * dt, -X_MAX, X_MAX);
    else if (s.tx != null) {
      const d = s.tx - s.px, m = MOVE_V * dt;
      s.px = Math.abs(d) <= m ? s.tx : s.px + Math.sign(d) * m;
    }

    // copione: animali, porte, ondate
    while (s.si < s.script.length && s.script[s.si].t <= s.t) {
      const e = s.script[s.si++];
      if (e.k === 'a') {
        s.animals.push(animal(s, e.kind, e.x, Z_FAR + e.dz));
      } else if (e.k === 'g') s.gates.push({ id: ++s.seq, z: Z_FAR, l: e.l, r: e.r });
      else if (e.k === 'w') { s.wave = e.i + 1; ev.push({ type: 'wave', i: e.i }); }
    }

    // lancio di merende
    s.tossT -= dt;
    if (s.tossT <= 0) {
      s.tossT += TOSS_IV;
      const treat = treatOf(s.power);
      for (const f of fanOf(s.power)) s.treats.push({ x: r2(s.px + f.dx), z: 0.4, vx: f.vx, k: treat });
      ev.push({ type: 'toss', n: s.power, treat });
    }

    // animali che avanzano
    for (const a of s.animals) {
      const A = ANIMALS[a.kind];
      a.z -= s.speed * A.v * dt;
      if (a.vx) {
        a.x += a.vx * dt;
        if (a.x > 0.8 || a.x < -0.8) { a.x = clamp(a.x, -0.8, 0.8); a.vx = -a.vx; }
      }
    }
    // porte
    for (const g of s.gates) g.z -= s.speed * dt;
    // boss
    if (s.boss) bossTick(s, dt, ev);

    // merende in volo: chi le prende al volo le mangia (prima gli animali più vicini, poi l'animalone)
    const keep = [];
    for (const p of s.treats) {
      const z0 = p.z;
      p.z += TREAT_V * dt; p.x += p.vx * dt;
      if (p.z > Z_FAR + 0.5 || Math.abs(p.x) > 1.15) continue;
      let eater = null;
      for (const a of s.animals) {
        if (a.left <= 0 || a.z > Z_FAR + 0.2) continue;
        if (a.z < z0 - 0.45 || a.z > p.z + 0.45) continue;
        if (Math.abs(a.x - p.x) > ANIMALS[a.kind].r + TREAT_R) continue;
        if (!eater || a.z < eater.z) eater = a;
      }
      if (eater) {
        eater.left--;
        if (eater.left <= 0) { s.fed++; ev.push({ type: 'full', id: eater.id, kind: eater.kind, x: eater.x, z: eater.z, by: 'snack' }); }
        else ev.push({ type: 'nibble', id: eater.id, x: eater.x, z: eater.z, left: eater.left });
        continue;
      }
      const b = s.boss;
      if (b && b.fed < b.max && p.z >= b.z - 0.6 && z0 <= b.z + 0.6 && Math.abs(b.x - p.x) <= BOSS_R + TREAT_R) {
        b.fed++; s.bossFed = b.fed;
        ev.push({ type: 'bossNibble', fed: b.fed, max: b.max, x: p.x });
        if (b.fed >= b.max) { winNow(s, ev); return ev; }
        continue;
      }
      keep.push(p);
    }
    s.treats = keep;
    s.animals = s.animals.filter((a) => a.left > 0);

    // porte che arrivano da Hari
    s.gates = s.gates.filter((g) => {
      if (g.z > LINE_Z) return true;
      const side = s.px < 0 ? 'l' : 'r', op = g[side];
      if (op) {
        const prev = s.power;
        s.power = applyGate(s.power, op, s.pmax || POWER_MAX);
        s.best = Math.max(s.best, s.power);
        s.gatesTaken++;
        s.moves = s.gatesTaken;
        ev.push({ type: 'gate', op, side, power: s.power, prev });
      }
      return false;
    });

    // animali affamati che arrivano da Hari: gli rubano la merenda
    const arrived = s.animals.filter((a) => a.z <= LINE_Z);
    if (arrived.length) {
      s.animals = s.animals.filter((a) => a.z > LINE_Z);
      if (s.calm > 0) arrived.forEach((a) => ev.push({ type: 'full', id: a.id, kind: a.kind, x: a.x, z: a.z, by: 'pass' }));
      else {
        const a = arrived[0];
        snatch(s, ev, 'animal', a.x, a.z);
        arrived.forEach((o) => ev.push({ type: 'full', id: o.id, kind: o.kind, x: o.x, z: o.z, by: 'share' }));
      }
      if (isLost(s)) return ev;
    }
    // ciò che soffia l'animalone arriva a terra
    if (s.drops.length) {
      const still = [];
      let boop = false;
      for (const q of s.drops) {
        q.z -= DROP_V * dt;
        q.x += q.vx * dt;
        if (q.z > LINE_Z) { still.push(q); continue; }
        if (Math.abs(q.x - s.px) < DROP_R && s.calm <= 0) { snatch(s, ev, 'boop', q.x, q.z); boop = true; break; }
        ev.push({ type: 'land', x: q.x, kind: s.drop });
      }
      if (isLost(s)) return ev;
      s.drops = boop ? [] : still;
    }

    // dopo l'ultima ondata, sentiero libero: arriva l'animalone goloso
    if (!s.boss && s.si >= s.script.length && !s.animals.length && !s.gates.length) {
      s.boss = { kind: s.bossKind, x: 0, z: Z_FAR + 4, fed: s.bossFed, max: s.bossMax, vx: s.bossV, blowT: 2.2, callT: s.call || 0, enter: true };
      ev.push({ type: 'boss', kind: s.bossKind });
    }
    return ev;
  }

  function bossTick(s, dt, ev) {
    const b = s.boss;
    if (b.enter) {
      b.z = Math.max(BOSS_Z, b.z - 6 * dt);
      if (b.z <= BOSS_Z) b.enter = false;
      return;
    }
    // va a destra e sinistra, ogni tanto cambia idea
    b.x += b.vx * dt;
    if (b.x > 0.62 || b.x < -0.62) { b.x = clamp(b.x, -0.62, 0.62); b.vx = -b.vx; }
    else if (rand(s) < dt * 0.35) b.vx = -b.vx;
    b.blowT -= dt;
    if (b.blowT <= 0) {
      b.blowT += s.blowIv;
      // mira dove sta Hari ora; più oggetti insieme sono affiancati e lasciano sempre una via di fuga ai lati
      const n = s.blowN, aim = clamp(s.px, -0.7, 0.7), flight = (b.z - LINE_Z) / DROP_V;
      for (let i = 0; i < n; i++) {
        const land = clamp(aim + (i - (n - 1) / 2) * DROP_SPREAD, -0.95, 0.95);
        s.drops.push({ id: ++s.seq, x: b.x, z: b.z - 0.3, vx: +((land - b.x) / flight).toFixed(4), z0: b.z - 0.3, x0: b.x, land: r2(land) });
      }
      ev.push({ type: 'blow', n });
    }
    if (s.call) {
      b.callT -= dt;
      if (b.callT <= 0) {
        b.callT += s.call;
        const n = 3, kinds = config(s.level).kinds.filter((k) => ANIMALS[k].need <= 3);
        for (let i = 0; i < n; i++) {
          const kind = kinds[Math.floor(rand(s) * kinds.length)];
          s.animals.push(animal(s, kind, r2(clamp(b.x + (i - 1) * 0.36, -0.8, 0.8)), b.z - 1 - i * 0.4));
        }
        ev.push({ type: 'call', n });
      }
    }
  }

  function animal(s, kind, x, z) {
    const A = ANIMALS[kind], need = A.need > 1 ? Math.round(A.need * config(s.level).needMul) : 1;
    return { id: ++s.seq, kind, x, z, left: need, max: need, vx: A.zig ? (rand(s) < 0.5 ? -A.zig : A.zig) : 0 };
  }

  // merenda rubata (o bolla sul naso): un cuore in meno, e Hari divide la merenda con chi è lì vicino
  function snatch(s, ev, what, x, z) {
    s.oops++;
    s.mistakes = s.oops;
    s.calm = CALM;
    ev.push({ type: 'snatch', what, x, z, left: LIVES - s.oops });
    s.animals = s.animals.filter((a) => {
      if (a.z >= SHARE_Z) return true;
      ev.push({ type: 'full', id: a.id, kind: a.kind, x: a.x, z: a.z, by: 'share' });
      return false;
    });
    s.drops.forEach((q) => ev.push({ type: 'land', x: q.x, kind: s.drop }));
    s.drops = [];
    if (isLost(s)) ev.push({ type: 'lose' });
  }

  // pancia piena: l'animalone si addormenta felice, gli amici rimasti vanno a fare il pisolino con lui
  function winNow(s, ev) {
    s.won = true;
    s.bossFed = s.bossMax;
    s.animals.forEach((a) => ev.push({ type: 'full', id: a.id, kind: a.kind, x: a.x, z: a.z, by: 'nap' }));
    s.animals = []; s.drops = []; s.treats = [];
    ev.push({ type: 'win' });
  }

  /* ---------- tempo reale ---------- */
  function step(s, dt, input) {
    const ev = [];
    if (isOver(s) || !(dt > 0)) return ev;
    if (input && s.wait && (input.dir === -1 || input.dir === 1 || typeof input.x === 'number')) s.wait = false;
    if (s.ready > 0) {
      s.ready -= dt;
      if (s.ready > 0) return ev;
      dt = -s.ready; s.ready = 0; ev.push({ type: 'go' });
    }
    if (s.wait) return ev;            // aspetta il primo trascinamento/freccia (modalità attivata dall'interfaccia)
    s.acc += Math.min(dt, 0.1);
    let first = true;
    while (s.acc >= TICK - 1e-9) {
      s.acc -= TICK;
      ev.push(...tick(s, first ? input : null));
      first = false;
      if (isOver(s)) break;
    }
    return ev;
  }

  const isWon = (s) => !!s.won;
  const isLost = (s) => s.oops >= LIVES;
  const isOver = (s) => isWon(s) || isLost(s);
  // fragoline: 3 senza merende rubate, 2 con una, 1 oltre
  const rate = (s) => (!s.oops ? 3 : s.oops === 1 ? 2 : 1);
  // 0..0,7 lungo il sentiero, 0,7..1 la pancia dell'animalone che si riempie
  function progress(s) {
    if (s.won) return 1;
    const road = Math.min(1, s.t / Math.max(1, s.end));
    const boss = s.boss ? s.bossFed / s.bossMax : 0;
    return Math.max(0, Math.min(1, s.boss ? 0.7 + 0.3 * boss : 0.7 * road));
  }

  HH.snack = {
    TICK, LIVES, READY, Z_FAR, LINE_Z, X_MAX, MOVE_V, TOSS_IV, TREAT_V, POWER_MAX, CALM, BOSS_Z, BOSS_R, DROP_V, DROP_R, DROP_SPREAD,
    ANIMALS, KINDS, BOSSES, GOOD, BAD, TREATS,
    config, newLevel, buildScript, step, tick, start, applyGate, fanOf, needOf, treatOf,
    isWon, isLost, isOver, rate, progress,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
