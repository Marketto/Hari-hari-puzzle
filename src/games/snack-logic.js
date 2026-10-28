/* Hari Snack Rush — logica pura (nessun DOM), macchina a stati deterministica e serializzabile.
 *
 * Gioco d'azione "a corridoio" (stile mob control), senza violenza: Hari sta in fondo al sentiero, si muove solo a
 * destra/sinistra e lancia merende in avanti a cadenza fissa (semi di girasole, poi mirtilli, fragole, ciliegie, mele).
 * Dal fondo arrivano orde di animaletti affamati: ognuno ha un numerino = bocconi che gli servono; quando è sazio
 * sorride e torna a casa saltellando. Le porte sul sentiero cambiano quante merende partono per lancio (ventaglio):
 * la porta migliore spesso è "presidiata" da pozzanghere o carretti sulla sua corsia (la cattiva ha la strada libera),
 * alcune si scambiano di posto, altre regalano un power-up a chi rinuncia alle merende.
 * Lungo il sentiero: pozzanghere, rotoli di fieno e carretti di frutta da schivare, bolle con power-up da prendere.
 * Dopo l'ultima ondata arriva un animalone golosissimo: si sposta a destra/sinistra, soffia cose innocue (da schivare)
 * e lancia grandi merende (ghiande, gomitoli, muffin, palle di neve-gelato, panini al vapore, cocomeri) che si
 * **rimandano indietro** colpendole con le merende: tornate all'animalone, lo sfamano di un bel po'.
 * Quando la pancia è piena si addormenta felice = livello vinto.
 * Se un animale affamato raggiunge Hari gli ruba la merenda (−1 cuore); idem se Hari inciampa in un ostacolo,
 * si prende una bolla sul naso o una grande merenda ("Bup!"). Il cestino-scudo ne para una.
 *
 * Coordinate: x laterale in [-1, 1] (bordi del sentiero), z profondità in metri dal punto di Hari (0) all'orizzonte
 * (Z_FAR). Il tempo avanza a passi fissi di 1/60 s, quindi stesso seme + stessi input = stessa partita.
 * Il generatore casuale vive nello stato (`rs`, mulberry32): lo stato è JSON puro, si salva e si riprende.
 *
 * API (modificano lo stato passato):
 *   config(level)                    parametri del livello (curva di difficoltà)
 *   newLevel(level, rnd)             stato iniziale con il copione delle ondate (rnd usato per copione e seme interno)
 *   migrate(s)                       porta un salvataggio vecchio (v1) alla struttura attuale (v2)
 *   step(s, dt, input) → eventi      tempo reale: pausa "Pronti?", attesa del primo input, poi passi fissi da 1/60 s
 *                                    input = { x: bersaglio laterale } (trascinamento) o { dir: -1 | 0 | 1 } (tasti)
 *   tick(s, input) → eventi          un passo fisso
 *   start(s)                         primo input ricevuto: si parte
 *   applyGate(power, op, max)        merende per lancio dopo una porta ('x2' 'x3' '+1' '+2' '+3' '-1' '-2' '/2')
 *   treatOf(power)                   che merenda parte ('seed' 'blueberry' 'strawberry' 'cherry' 'apple')
 *   ballHp(s, spec) · volleyOf(kind, phase) · bossOf(level) · covers(balls, x)
 *   isWon · isLost · isOver · rate · progress · fanOf(power)
 * Eventi: go · toss{n,treat} · nibble{id,x,z,left} · full{id,kind,x,z,by} · gate{op,side,power,prev,gift} · wave{i,big}
 *         snatch{what,x,z,left} · shield{what,x,z} · lose · boss{kind} · bossNibble{fed,max,x} · blow{n} · land{x,kind}
 *         call{n} · swap{id} · pu{pu,x} · puMiss{pu,x} · pass{kind,x} · new{what} · phase{n}
 *         ball{n,kind} · hit{id,hp,max,x,z} · sent{id,x,z} · backFeed{id,bonus,fed,max,x} · roll{id,x} · win
 *   snatch.what: 'animal' · 'boop' (soffio) · 'bump' (ostacolo) · 'splash' (pozzanghera) · 'bup' (grande merenda)
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
  const TOSS_IV = 0.3;         // un lancio ogni 0,3 s (0,15 con la raffica)
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
  const HARI_R = 0.12;         // mezza larghezza di Hari per ostacoli e grandi merende
  const PU_R = 0.24;           // quanto vicino deve passare Hari per prendere un power-up
  const SWAP_STOP = 6;         // le porte smettono di scambiarsi più vicine di così (≥ 0,9 s per reagire)
  const BACK_V = 16;           // velocità della grande merenda rimandata all'animalone
  const PU_TIME = { rapid: 5, double: 7, magnet: 7 };   // durata dei power-up a tempo (lo scudo resta finché serve)

  // animali: r = mezza larghezza, need = bocconi base, v = moltiplicatore di velocità, zig = zig-zag laterale (unità/s),
  // hop = salta una volta nell'altra metà del sentiero
  const ANIMALS = {
    chick: { r: 0.1, need: 1, v: 1, zig: 0, from: 1 },
    bunny: { r: 0.11, need: 1, v: 1.15, zig: 0.32, from: 2 },
    piggy: { r: 0.15, need: 3, v: 0.9, zig: 0, from: 3 },
    hamster: { r: 0.1, need: 2, v: 1.45, zig: 0, from: 4 },
    bear: { r: 0.2, need: 7, v: 0.78, zig: 0, from: 5 },
    frog: { r: 0.12, need: 2, v: 0.95, zig: 0, hop: 1, from: 6 },
    sheep: { r: 0.17, need: 4, v: 0.95, zig: 0.18, from: 7 },
  };
  const KINDS = Object.keys(ANIMALS);
  const BIG = ['piggy', 'bear', 'sheep'];
  // ostacoli (niente di pericoloso: ci si inciampa e la merenda cade). v = moltiplicatore della velocità del sentiero
  const OBST = {
    puddle: { r: 0.24, v: 1, from: 2, what: 'splash' },
    hay: { r: 0.16, v: 1.3, from: 3, what: 'bump' },
    cart: { r: 0.34, v: 1, from: 7, what: 'bump' },
  };
  const PUS = ['rapid', 'double', 'magnet', 'shield'];
  // animaloni golosi: cosa soffiano (da schivare), che grande merenda lanciano (da rimandare), in che stagione
  const BOSSES = {
    squirrel: { kind: 'squirrel', drop: 'shell', ball: 'acorn', season: 'autumn' },
    kitty: { kind: 'kitty', drop: 'petal', ball: 'yarn', season: 'spring' },
    owl: { kind: 'owl', drop: 'feather', ball: 'muffin', season: 'summer' },
    polar: { kind: 'polar', drop: 'flake', ball: 'snowball', season: 'winter' },
    panda: { kind: 'panda', drop: 'leaf', ball: 'bun', season: 'spring', from: 9 },
    hippo: { kind: 'hippo', drop: 'bubble', ball: 'melon', season: 'summer', from: 11 },
  };
  const BOSS_ORDER = ['squirrel', 'kitty', 'owl', 'polar', 'squirrel', 'kitty', 'owl', 'polar', 'panda', 'squirrel', 'hippo', 'kitty', 'owl', 'panda', 'polar', 'hippo'];
  const BOSS_CYCLE = ['squirrel', 'kitty', 'owl', 'polar', 'panda', 'hippo'];
  const bossOf = (L) => BOSSES[L <= BOSS_ORDER.length ? BOSS_ORDER[L - 1] : BOSS_CYCLE[(L - 1) % BOSS_CYCLE.length]];
  /* raffiche di grandi merende per animalone e fase (pancia < 50% · ≥ 50% · ≥ 80%).
   * r = mezza larghezza, v = velocità (m/s), k = quanto "pesa" rispetto alla capacità di lancio, aim = mira Hari,
   * x = posizione d'arrivo fissa, bx = rimbalza tra i bordi (velocità laterale), lim = limite del rimbalzo, d = ritardo (s).
   * Le raffiche "a muro" coprono tutto il sentiero: l'unico modo è rimandarne indietro una (quella davanti a Hari). */
  const VOLLEYS = {
    squirrel: [
      [{ r: 0.3, v: 5, aim: 1, k: 1 }],
      [{ r: 0.3, v: 5.2, x: -0.4, k: 0.6 }, { r: 0.3, v: 5.2, x: 0.4, k: 0.6 }],
      [{ r: 0.26, v: 5.4, x: -0.56, k: 0.42 }, { r: 0.26, v: 5.4, x: 0, k: 0.42 }, { r: 0.26, v: 5.4, x: 0.56, k: 0.42 },
        { r: 0.3, v: 5.4, aim: 1, k: 0.5, d: 1.5 }],
    ],
    kitty: [
      [{ r: 0.22, v: 4.6, aim: 1, bx: 0.85, lim: 0.7, k: 0.8 }],
      [{ r: 0.22, v: 4.8, x: -0.3, bx: 0.9, lim: 0.7, k: 0.6 }, { r: 0.22, v: 4.8, x: 0.3, bx: 0.9, lim: 0.7, k: 0.6 }],
      [{ r: 0.9, v: 3.6, x: 0, k: 1.1 }],
    ],
    owl: [
      [{ r: 0.45, v: 4.2, aim: 1, bx: 0.45, lim: 0.42, k: 1 }],
      [{ r: 0.45, v: 4.5, aim: 1, bx: 0.55, lim: 0.42, k: 1 }],
      [{ r: 0.4, v: 4.5, x: -0.42, k: 0.65 }, { r: 0.4, v: 4.5, x: 0.42, k: 0.65 }],
    ],
    polar: [
      [{ r: 0.95, v: 3.4, x: 0, k: 1.05 }],
      [{ r: 0.95, v: 4.1, x: 0, k: 1.05 }],
      [{ r: 0.95, v: 4.1, x: 0, k: 0.75 }, { r: 0.95, v: 4.1, x: 0, k: 0.75, d: 1.7 }],
    ],
    panda: [
      [{ r: 0.9, v: 5.4, x: 0, k: 0.95 }],
      [{ r: 0.9, v: 5.6, x: 0, k: 0.75 }, { r: 0.9, v: 5.6, x: 0, k: 0.75, d: 1.3 }],
      [{ r: 0.9, v: 5.8, x: 0, k: 0.62 }, { r: 0.9, v: 5.8, x: 0, k: 0.62, d: 1.15 }, { r: 0.9, v: 5.8, x: 0, k: 0.62, d: 2.3 }],
    ],
    hippo: [
      [{ r: 0.95, v: 3.2, x: 0, k: 1.15 }],
      [{ r: 0.95, v: 3.6, x: 0, k: 1.15 }],
      [{ r: 0.95, v: 3.8, x: 0, k: 0.9 }, { r: 0.3, v: 5.2, aim: 1, k: 0.5, d: 2.2 }],
    ],
  };
  const volleyOf = (kind, ph) => (VOLLEYS[kind] || VOLLEYS.squirrel)[Math.max(0, Math.min(2, ph | 0))];
  // cosa fa l'animalone a turno, per fase: grande merenda o soffio
  const CYCLES = [['ball', 'lob', 'lob'], ['ball', 'lob'], ['ball', 'lob', 'ball']];
  // novità: livello in cui compaiono la prima volta (con un cartello "Nuovo!")
  const NEWS = { puddle: 2, hay: 3, pu: 4, hamster: 4, gift: 5, swap: 6, frog: 6, cart: 7, big: 8, pu2: 8, panda: 9, hippo: 11 };
  // merende di Hari: più ne lancia, più sono golose (solo aspetto, ognuna vale un boccone)
  const TREATS = ['seed', 'blueberry', 'strawberry', 'cherry', 'apple'];
  const treatOf = (power) => TREATS[Math.min(TREATS.length - 1, Math.floor((power - 1) / 2))];
  const GOOD = ['+1', '+2', '+3', 'x2', 'x3'];
  const BAD = ['-1', '-2', '/2'];
  const isGood = (op) => !!op && (op[0] === 'x' || op[0] === '+');

  /* ---------- curva di difficoltà (monotona) ---------- */
  function config(level) {
    const L = Math.max(1, level | 0);
    const tier = L <= 2 ? 0 : L <= 5 ? 1 : L <= 9 ? 2 : L <= 14 ? 3 : 4;
    const waves = Math.min(13, 5 + Math.ceil(L / 2));                // 6 · 6 · 7 · 7 · 8 … 13
    const boss = bossOf(L);
    const news = Object.keys(NEWS).filter((k) => NEWS[k] === L);
    if (L <= 4 || boss.from === L) news.push('back');               // "lanciagli merende per rimandarla!"
    return {
      level: L, tier, waves,
      speed: +Math.min(6.4, 3.5 + 0.2 * (L - 1)).toFixed(2),        // metri/s degli animali (e del sentiero)
      waveGap: +Math.max(4.4, 8 - 0.3 * (L - 1)).toFixed(2),          // secondi tra un'ondata e l'altra
      // quanto "pesa" un'ondata rispetto al potere garantito: chi sbaglia porta resta indietro
      pressure: +(L === 1 ? 0.36 : Math.min(0.52, 0.45 + 0.012 * (L - 2))).toFixed(3),
      maxCount: Math.min(22, 6 + L),                                  // animali per ondata, al massimo
      needMul: +(1 + 0.08 * (L - 1)).toFixed(2),                      // fame degli animali grandi
      gates: Math.min(waves - 1, 3 + Math.floor(L / 3)),             // porte (singole o in coppia)
      negatives: L >= 2,                                              // porte "cattive" (−1, −2) in coppia con una buona
      halve: L >= 6,                                                  // anche ÷2
      // dilemma: la porta migliore è presidiata da ostacoli sulla sua corsia (la peggiore ha la strada libera)
      guard: L >= 2 ? +Math.min(0.9, 0.6 + 0.05 * (L - 2)).toFixed(2) : 0,
      guardGap: +Math.max(0.6, 0.9 - 0.025 * (L - 2)).toFixed(2),    // secondi tra gli ostacoli e la porta (per infilarsi)
      obst: L >= 3 ? +Math.min(0.85, 0.45 + 0.05 * (L - 3)).toFixed(2) : 0,   // ostacoli dentro le ondate
      obstKinds: Object.keys(OBST).filter((k) => OBST[k].from <= L && (k !== 'puddle' || L >= 3)),
      pus: L >= 8 ? PUS.slice() : L >= 4 ? PUS.slice(0, 2) : [],     // power-up (raffica, doppia; poi calamita, scudo)
      puChance: L >= 4 ? 0.4 : 0,
      gift: L >= 5 ? 0.35 : 0,                                        // porta cattiva con un regalo
      swap: L >= 6 ? +Math.min(0.5, 0.25 + 0.03 * (L - 6)).toFixed(2) : 0,   // porte che si scambiano
      bigWave: L >= 8,                                                // un'ondata di soli mangioni
      shapes: L >= 5 ? 6 : 4,                                         // + muro e zig-zag
      boss,
      bossNeed: Math.min(560, 200 + 22 * (L - 1)),                   // bocconi per riempire l'animalone
      bossV: +Math.min(1.3, 0.5 + 0.055 * (L - 1)).toFixed(3),       // velocità laterale del boss
      // un soffio alla volta in aria (volo ≈ 1,3 s): c'è sempre una via di fuga
      blowIv: +Math.max(1.8, 2.6 - 0.07 * (L - 1)).toFixed(2),         // secondi tra un'azione e l'altra
      blowN: L < 3 ? 1 : L < 8 ? 2 : 3,                              // oggetti per soffio
      // grandi merende: quanta parte della capacità di lancio (col potere garantito) serve per rimandarle
      ballK: +Math.min(0.62, 0.3 + 0.024 * (L - 1)).toFixed(3),
      powerMax: Math.min(POWER_MAX, 4 + L),                           // merende per lancio al massimo: 5 al livello 1, 10 dal 6
      call: L >= 4 || (L >= 3 && boss.kind === 'owl') ? +(Math.max(4.5, 8.5 - 0.3 * (L - 4)) * (boss.kind === 'owl' ? 0.7 : 1)).toFixed(2) : 0,
      kinds: KINDS.filter((k) => ANIMALS[k].from <= L),
      news,
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
  const valOf = (power, op, max) => (op ? applyGate(power, op, max) : power);
  const bestOf = (power, g, max) => Math.max(valOf(power, g.l, max), valOf(power, g.r, max));

  function makeGate(cfg, rnd, idx) {
    const L = cfg.level;
    const good = GOOD.filter((op) => (op === '+3' || op === 'x2' ? L >= 3 : op === 'x3' ? L >= 6 : true));
    const bad = BAD.filter((op) => (op === '/2' ? cfg.halve : op === '-2' ? L >= 4 : cfg.negatives));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    // la prima porta è sempre buona e singola: si impara a passarci in mezzo
    const pairChance = idx === 0 ? 0 : Math.min(0.9, 0.5 + 0.04 * L);
    const a = pick(good);
    let b = null;
    if (rnd() < pairChance) {
      if (bad.length && rnd() < Math.min(0.85, 0.55 + 0.04 * L)) b = pick(bad);
      else { b = pick(good); if (b === a) b = good[(good.indexOf(a) + 1) % good.length]; }
    }
    const left = rnd() < 0.5;
    const g = { l: left ? a : b, r: left ? b : a };
    // porta regalo: la cattiva porta anche un power-up (un'alternativa vera, non una trappola)
    if (b && !isGood(b) && cfg.gift && cfg.pus.length && rnd() < cfg.gift) g.gift = { side: left ? 'r' : 'l', pu: pick(cfg.pus) };
    // porte che si scambiano di posto finché sono lontane
    if (b && idx > 0 && cfg.swap && rnd() < cfg.swap) g.sw = +(1 + rnd() * 0.4).toFixed(2);
    return g;
  }

  /* ---------- copione del livello: ondate di animali, porte, ostacoli, power-up ---------- */
  function formation(cfg, rnd, list, forced) {
    // file di animali: righe da 2–5 (meno se grossi), con disegni diversi; dz = distanza oltre l'orizzonte
    const out = [];
    const shape = forced != null ? forced : Math.floor(rnd() * cfg.shapes);   // 0 righe · 1 a V · 2 colonna · 3 sparsi · 4 muro · 5 zig-zag
    let i = 0, row = 0;
    while (i < list.length) {
      const rMax = Math.max(...list.slice(i, i + 6).map((k) => ANIMALS[k].r));
      const fit = Math.max(1, Math.floor(1.56 / (2 * rMax + 0.08)));
      let per = shape === 2 ? 1 + Math.floor(rnd() * 2) : shape === 4 ? fit : shape === 5 ? 2 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 4);
      per = Math.min(per, fit, list.length - i);
      const span = per > 1 ? Math.min(shape === 5 ? 0.7 : 1.5, (per - 1) * (2 * rMax + 0.12)) : 0;
      const room = 1.56 - span;
      let x0 = -0.78 + (shape === 3 ? rnd() * room : room / 2 + (rnd() - 0.5) * room * 0.6);
      if (shape === 5) x0 = row % 2 ? 0.78 - span : -0.78;           // zig-zag: una riga a sinistra, una a destra
      for (let k = 0; k < per; k++, i++) {
        const x = per > 1 ? x0 + (span * k) / (per - 1) : x0;
        const vee = shape === 1 && per > 1 ? Math.abs(k - (per - 1) / 2) * 0.55 : 0;
        const jit = shape === 3 ? rnd() * 0.9 : 0;
        out.push({ kind: list[i], x: r2(clamp(x, -0.8, 0.8)), dz: r2(row * (shape === 5 ? 1.9 : 1.5) + vee + jit) });
      }
      row++;
    }
    return out;
  }

  // dove passa Hari senza toccare gli ostacoli di una fila: c'è sempre un varco?
  const freeAt = (row, x) => row.every((o) => Math.abs(o.x - x) >= OBST[o.kind].r + HARI_R);
  function hasGap(row) {
    for (let x = -X_MAX; x <= X_MAX + 1e-9; x += 0.02) if (freeAt(row, x) && freeAt(row, x + 0.1)) return true;
    return false;
  }

  function buildScript(cfg, rnd) {
    const ev = [];
    let gp = 1;                                       // potere garantito scegliendo sempre la porta migliore
    const arr = [];                                   // arrivi degli ostacoli (s): due file non arrivano mai insieme
    const arrival = (t0, dz, v) => t0 + (Z_FAR + dz - LINE_Z) / (cfg.speed * v);
    const freeTime = (ta, gap = 1.5) => arr.every((x) => Math.abs(x - ta) >= gap);
    // le porte stanno a metà tra un'ondata e l'altra, distribuite sull'intero livello
    const gateAt = new Set();
    for (let g = 0; g < cfg.gates; g++) gateAt.add(1 + Math.floor((g * (cfg.waves - 1)) / Math.max(1, cfg.gates)));
    const gateTimes = [];
    const bigWave = cfg.bigWave ? 2 + Math.floor(rnd() * Math.max(1, cfg.waves - 3)) : -1;
    let t = 1.2, gi = 0;
    for (let w = 0; w < cfg.waves; w++) {
      if (gateAt.has(w)) {
        const g = makeGate(cfg, rnd, gi++);
        const tg = r2(t - cfg.waveGap * 0.5);
        const e = { t: tg, k: 'g', l: g.l, r: g.r };
        if (g.sw) e.sw = g.sw;
        if (g.gift) e.gift = g.gift;
        ev.push(e);
        gateTimes.push(arrival(tg, 0, 1));
        // la porta migliore è presidiata: ostacoli sulla sua corsia poco prima della porta, l'altra corsia è libera.
        // Si passa schivandoli e infilandosi nella porta subito dopo (guardGap secondi).
        const vl = valOf(gp, g.l, cfg.powerMax), vr = valOf(gp, g.r, cfg.powerMax);
        if (!g.sw && vl !== vr && rnd() < cfg.guard) {
          const sg = vl > vr ? -1 : 1, kind = cfg.level >= 7 && rnd() < 0.5 ? 'cart' : 'puddle';
          const t0 = r2(tg - cfg.guardGap);
          for (const x of kind === 'cart' ? [0.44] : [0.22, 0.62]) ev.push({ t: t0, k: 'o', kind, x: r2(sg * x), dz: 0, guard: 1 });
          arr.push(arrival(t0, 0, 1));
        }
        gp = bestOf(gp, g, cfg.powerMax);
      }
      // ondata: fame totale proporzionata al potere garantito
      const budget = Math.max(2, Math.round(cfg.pressure * gp * (cfg.waveGap / TOSS_IV)));
      const big = w === bigWave;
      const kinds = big ? cfg.kinds.filter((k) => BIG.includes(k)) : cfg.kinds;
      const list = [];
      let need = 0;
      while (list.length < cfg.maxCount) {
        const pool = kinds.filter((k) => needOf(cfg, k) <= Math.max(1, budget - need));
        if (!pool.length) break;
        // i grandi compaiono più spesso nei livelli alti
        const k = pool[Math.floor(Math.pow(rnd(), 1 / (1 + cfg.tier * 0.35)) * pool.length)];
        list.push(k); need += needOf(cfg, k);
        if (need >= budget) break;
      }
      // i più affamati in fondo alla formazione
      list.sort((a, b) => needOf(cfg, a) - needOf(cfg, b));
      for (const a of formation(cfg, rnd, list, big ? 4 : null)) ev.push({ t: r2(t), k: 'a', kind: a.kind, x: a.x, dz: a.dz });
      ev.push(big ? { t: r2(t), k: 'w', i: w, big: 1 } : { t: r2(t), k: 'w', i: w });
      // ostacoli in mezzo all'ondata: una fila (due dal livello 7) che lascia sempre un varco
      if (cfg.obst && w >= 1 && cfg.obstKinds.length && rnd() < cfg.obst) {
        const rows = cfg.level >= 7 && rnd() < 0.45 ? 2 : 1;
        for (let r = 0; r < rows; r++) {
          const kind = cfg.obstKinds[Math.floor(rnd() * cfg.obstKinds.length)], O = OBST[kind];
          const t0 = r2(t + 0.4 + rnd() * cfg.waveGap * 0.4), ta = arrival(t0, 0, O.v);
          if (!freeTime(ta) || gateTimes.some((x) => Math.abs(x - ta) < 1.2)) continue;
          const n = kind === 'cart' ? 1 : 1 + (rnd() < 0.5 ? 1 : 0);
          const row = [];
          for (let k = 0; k < n; k++) row.push({ kind, x: r2((rnd() * 2 - 1) * (0.78 - O.r * 0.5)) });
          if (n > 1 && Math.abs(row[0].x - row[1].x) < O.r * 2 + 0.05) row.pop();
          if (!hasGap(row)) row.pop();
          if (!row.length) continue;
          for (const o of row) ev.push({ t: t0, k: 'o', kind, x: o.x, dz: 0 });
          arr.push(ta);
        }
      }
      // un power-up (bolla) tra un'ondata e l'altra, spesso vicino al bordo
      if (cfg.pus.length && w >= 1 && rnd() < cfg.puChance) {
        const pu = cfg.pus[Math.floor(rnd() * cfg.pus.length)];
        const t0 = r2(t + cfg.waveGap * (0.15 + rnd() * 0.15)), ta = arrival(t0, 0, 1);
        if (gateTimes.every((x) => Math.abs(x - ta) > 1)) {
          let x = r2((rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.35));
          // mai sopra un ostacolo che arriva insieme: si prende senza inciampare
          const near = ev.filter((o) => o.k === 'o' && Math.abs(arrival(o.t, 0, OBST[o.kind].v) - ta) < 0.7);
          if (near.some((o) => Math.abs(o.x - x) < OBST[o.kind].r + HARI_R + 0.05)) x = -x;
          if (!near.some((o) => Math.abs(o.x - x) < OBST[o.kind].r + HARI_R + 0.05)) ev.push({ t: t0, k: 'p', pu, x });
        }
      }
      t += cfg.waveGap;
    }
    ev.sort((a, b) => a.t - b.t);
    return { ev, gp, end: r2(t - cfg.waveGap + Z_FAR / (cfg.speed * 0.78) + 1) };
  }
  const needOf = (cfg, kind) => (ANIMALS[kind].need > 1 ? Math.round(ANIMALS[kind].need * cfg.needMul) : 1);

  function newLevel(level, rnd = Math.random) {
    const cfg = config(level);
    const sc = buildScript(cfg, rnd);
    return {
      v: 2, level: cfg.level, speed: cfg.speed, waves: cfg.waves,
      script: sc.ev, si: 0, end: sc.end, wave: 0,
      t: 0, acc: 0, ready: READY, wait: false, waitMode: false,
      px: 0, tx: null, dir: 0, power: 1, best: 1, pmax: cfg.powerMax, gp: sc.gp, tossT: 0.1,
      animals: [], treats: [], gates: [], drops: [], obst: [], pus: [], balls: [],
      fx: { rapid: 0, double: 0, magnet: 0 }, shield: 0, news: cfg.news.slice(),
      boss: null, bossKind: cfg.boss.kind, drop: cfg.boss.drop, ball: cfg.boss.ball, season: cfg.boss.season,
      bossMax: cfg.bossNeed, bossFed: 0, bossV: cfg.bossV, blowIv: cfg.blowIv, blowN: cfg.blowN, call: cfg.call, ballK: cfg.ballK,
      oops: 0, mistakes: 0, calm: 0, fed: 0, sent: 0, gatesTaken: 0, moves: 0, won: false, seq: 0, ticks: 0,
      rs: Math.floor(rnd() * 4294967296) >>> 0,
    };
  }

  // salvataggi della versione 1 (prima degli ostacoli e delle grandi merende): si riprende da dove si era
  function migrate(s) {
    if (!s || s.v >= 2) return s;
    const cfg = config(s.level);
    const old = { shell: 'squirrel', bubble: 'polar', leaf: 'owl', petal: 'kitty' };
    const kind = BOSSES[s.bossKind] ? s.bossKind : old[s.drop] || cfg.boss.kind, B = BOSSES[kind];
    Object.assign(s, {
      v: 2, obst: s.obst || [], pus: s.pus || [], balls: s.balls || [], fx: s.fx || { rapid: 0, double: 0, magnet: 0 },
      shield: s.shield || 0, news: [], bossKind: kind, drop: B.drop, ball: B.ball, season: B.season,
      gp: s.gp || Math.max(s.best || 1, Math.min(cfg.powerMax, s.pmax || cfg.powerMax)), ballK: cfg.ballK, sent: s.sent || 0,
    });
    if (s.boss) {
      const b = s.boss;
      b.kind = kind;
      if (b.atkT == null) b.atkT = b.blowT != null ? b.blowT : 2;
      if (b.ai == null) b.ai = 0;
      if (b.ph == null) b.ph = 0;
      if (!Array.isArray(b.q)) b.q = [];
      delete b.blowT;
    }
    return s;
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

  // grandi merende: quante merende servono per rimandarne una (rispetto a ciò che lancia chi ha il potere garantito)
  function ballHp(s, sp) {
    const flight = (BOSS_Z - 0.4 - LINE_Z) / sp.v;
    const cap = (s.gp || 1) * Math.max(1, (flight - 0.45) / TOSS_IV);
    return Math.max(2, Math.round(sp.k * (s.ballK || 0.3) * cap));
  }
  // la posizione x è coperta dalle grandi merende indicate (Hari verrebbe preso)?
  const covers = (balls, x) => balls.some((b) => Math.abs(b.x - x) < b.r + HARI_R);

  function start(s) { if (s.wait) { s.wait = false; return true; } return false; }

  function news(s, ev, what) {
    const i = s.news ? s.news.indexOf(what) : -1;
    if (i >= 0) { s.news.splice(i, 1); ev.push({ type: 'new', what }); }
  }

  /* ---------- un passo fisso ---------- */
  function tick(s, input) {
    const ev = [];
    if (isOver(s)) return ev;
    const dt = TICK;
    s.ticks++;
    s.t = s.ticks / 60;
    if (s.calm > 0) s.calm = Math.max(0, s.calm - dt);
    for (const k in s.fx) if (s.fx[k] > 0) { s.fx[k] = Math.max(0, +(s.fx[k] - dt).toFixed(4)); if (!s.fx[k]) ev.push({ type: 'puEnd', pu: k }); }

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

    // copione: animali, porte, ondate, ostacoli, power-up
    while (s.si < s.script.length && s.script[s.si].t <= s.t) {
      const e = s.script[s.si++];
      if (e.k === 'a') {
        s.animals.push(animal(s, e.kind, e.x, Z_FAR + e.dz));
        news(s, ev, e.kind);
      } else if (e.k === 'g') {
        const g = { id: ++s.seq, z: Z_FAR, l: e.l, r: e.r };
        if (e.sw) { g.sw = e.sw; g.swT = e.sw; news(s, ev, 'swap'); }
        if (e.gift) { g.gift = { side: e.gift.side, pu: e.gift.pu }; news(s, ev, 'gift'); }
        s.gates.push(g);
      } else if (e.k === 'w') { s.wave = e.i + 1; ev.push(e.big ? { type: 'wave', i: e.i, big: 1 } : { type: 'wave', i: e.i }); if (e.big) news(s, ev, 'big'); }
      else if (e.k === 'o') {
        s.obst.push(e.guard ? { id: ++s.seq, kind: e.kind, x: e.x, z: Z_FAR + e.dz, guard: 1 } : { id: ++s.seq, kind: e.kind, x: e.x, z: Z_FAR + e.dz });
        news(s, ev, e.kind);
      } else if (e.k === 'p') {
        s.pus.push({ id: ++s.seq, pu: e.pu, x: e.x, z: Z_FAR });
        news(s, ev, e.pu === 'magnet' || e.pu === 'shield' ? 'pu2' : 'pu');
      }
    }

    // lancio di merende (la raffica raddoppia la cadenza, la merenda doppia vale due bocconi)
    s.tossT -= dt;
    if (s.tossT <= 0) {
      s.tossT += s.fx.rapid > 0 ? TOSS_IV / 2 : TOSS_IV;
      const treat = treatOf(s.power), dbl = s.fx.double > 0;
      for (const f of fanOf(s.power)) s.treats.push(dbl ? { x: r2(s.px + f.dx), z: 0.4, vx: f.vx, k: treat, d: 2 } : { x: r2(s.px + f.dx), z: 0.4, vx: f.vx, k: treat });
      ev.push({ type: 'toss', n: s.power, treat });
    }

    // animali che avanzano
    for (const a of s.animals) {
      const A = ANIMALS[a.kind];
      a.z -= s.speed * A.v * dt;
      if (A.hop && a.hop && a.z <= a.hop) {
        // la ranocchia salta nell'altra metà del sentiero
        const to = clamp(a.x > 0 ? -0.2 - rand(s) * 0.5 : 0.2 + rand(s) * 0.5, -0.78, 0.78);
        a.vx = +((to - a.x) / 0.45).toFixed(3); a.jt = 0.45; a.hop = 0;
      }
      if (a.vx) {
        a.x += a.vx * dt;
        if (a.jt != null) { a.jt -= dt; if (a.jt <= 0) { a.vx = 0; delete a.jt; } }
        if (a.x > 0.8 || a.x < -0.8) { a.x = clamp(a.x, -0.8, 0.8); a.vx = -a.vx; }
      }
    }
    // porte (alcune si scambiano finché sono lontane), ostacoli e power-up
    for (const g of s.gates) {
      g.z -= s.speed * dt;
      if (g.sw && g.z > SWAP_STOP) {
        g.swT -= dt;
        if (g.swT <= 0) {
          g.swT += g.sw;
          const l = g.l; g.l = g.r; g.r = l;
          if (g.gift) g.gift.side = g.gift.side === 'l' ? 'r' : 'l';
          ev.push({ type: 'swap', id: g.id });
        }
      }
    }
    for (const o of s.obst) o.z -= s.speed * OBST[o.kind].v * dt;
    for (const p of s.pus) p.z -= s.speed * dt;
    // boss
    if (s.boss) { bossTick(s, dt, ev); if (s.won) return ev; }

    // grandi merende: verso Hari, o di ritorno verso l'animalone
    if (s.balls.length) {
      const keepB = [];
      for (const q of s.balls) {
        if (q.back) {
          const b = s.boss;
          q.z += BACK_V * dt;
          if (b) q.x += clamp((b.x - q.x) * 6, -3, 3) * dt;
          if (!b || q.z >= b.z - 0.3) {
            if (b) {
              const bonus = Math.max(1, Math.round(q.max * 1.5 + s.bossMax * 0.03));
              b.fed = Math.min(b.max, b.fed + bonus); s.bossFed = b.fed;
              ev.push({ type: 'backFeed', id: q.id, bonus, fed: b.fed, max: b.max, x: q.x });
              if (b.fed >= b.max) { winNow(s, ev); return ev; }
            }
            continue;
          }
        } else {
          q.z -= q.v * dt;
          q.x += q.vx * dt;
          if (q.lim != null && Math.abs(q.x) > q.lim) { q.x = clamp(q.x, -q.lim, q.lim); q.vx = -q.vx; }
        }
        keepB.push(q);
      }
      s.balls = keepB;
    }

    // merende in volo: chi le prende al volo le mangia (prima ciò che è più vicino, poi l'animalone)
    const magnet = s.fx.magnet > 0;
    let aims = null;
    if (magnet) {
      aims = s.animals.filter((a) => a.left > 0 && a.z < Z_FAR).map((a) => [a.z, a.x]);
      for (const q of s.balls) if (!q.back) aims.push([q.z, q.x]);
      if (s.boss) aims.push([s.boss.z, s.boss.x]);
      aims.sort((a, b) => a[0] - b[0]);
    }
    const keep = [];
    for (const p of s.treats) {
      const z0 = p.z;
      if (magnet) {
        // calamita: la merenda curva verso il primo affamato davanti a sé
        const tg = aims.find((a) => a[0] > p.z + 0.3);
        if (tg) p.vx = +clamp(p.vx + clamp((tg[1] - p.x) * 9, -6, 6) * dt, -1.6, 1.6).toFixed(3);
      }
      p.z += TREAT_V * dt; p.x += p.vx * dt;
      if (p.z > Z_FAR + 0.5 || Math.abs(p.x) > 1.15) continue;
      const bite = p.d || 1;
      let eater = null;
      for (const a of s.animals) {
        if (a.left <= 0 || a.z > Z_FAR + 0.2) continue;
        if (a.z < z0 - 0.45 || a.z > p.z + 0.45) continue;
        if (Math.abs(a.x - p.x) > ANIMALS[a.kind].r + TREAT_R) continue;
        if (!eater || a.z < eater.z) eater = a;
      }
      let ball = null;
      for (const q of s.balls) {
        if (q.back || q.z < z0 - 0.5 || q.z > p.z + 0.5) continue;
        if (Math.abs(q.x - p.x) > q.r + TREAT_R) continue;
        if (!ball || q.z < ball.z) ball = q;
      }
      if (ball && (!eater || ball.z < eater.z)) {
        ball.hp = Math.max(0, ball.hp - bite);
        if (ball.hp <= 0) { ball.back = 1; s.sent++; ev.push({ type: 'sent', id: ball.id, x: ball.x, z: ball.z }); }
        else ev.push({ type: 'hit', id: ball.id, hp: ball.hp, max: ball.max, x: ball.x, z: ball.z });
        continue;
      }
      if (eater) {
        eater.left = Math.max(0, eater.left - bite);
        if (eater.left <= 0) { s.fed++; ev.push({ type: 'full', id: eater.id, kind: eater.kind, x: eater.x, z: eater.z, by: 'snack' }); }
        else ev.push({ type: 'nibble', id: eater.id, x: eater.x, z: eater.z, left: eater.left });
        continue;
      }
      const b = s.boss;
      if (b && !b.enter && b.fed < b.max && p.z >= b.z - 0.6 && z0 <= b.z + 0.6 && Math.abs(b.x - p.x) <= BOSS_R + TREAT_R) {
        b.fed = Math.min(b.max, b.fed + bite); s.bossFed = b.fed;
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
      const gift = g.gift && g.gift.side === side ? g.gift.pu : null;
      if (op) {
        const prev = s.power;
        s.power = applyGate(s.power, op, s.pmax || POWER_MAX);
        s.best = Math.max(s.best, s.power);
        s.gatesTaken++;
        s.moves = s.gatesTaken;
        ev.push(gift ? { type: 'gate', op, side, power: s.power, prev, gift } : { type: 'gate', op, side, power: s.power, prev });
      }
      if (gift) power(s, ev, gift, s.px);
      return false;
    });
    // power-up: si prendono passandoci sopra
    if (s.pus.length) {
      s.pus = s.pus.filter((p) => {
        if (p.z > LINE_Z) return true;
        if (Math.abs(p.x - s.px) < PU_R) power(s, ev, p.pu, p.x);
        else ev.push({ type: 'puMiss', pu: p.pu, x: p.x });
        return false;
      });
    }

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
    // ostacoli: chi ci finisce sopra inciampa (la merenda cade), gli altri passano e basta
    if (s.obst.length) {
      const still = [];
      let hit = null;
      for (const o of s.obst) {
        if (o.z > LINE_Z) { still.push(o); continue; }
        if (!hit && s.calm <= 0 && Math.abs(o.x - s.px) < OBST[o.kind].r + HARI_R) hit = o;
        else ev.push({ type: 'pass', kind: o.kind, x: o.x });
      }
      s.obst = still;
      if (hit) { snatch(s, ev, OBST[hit.kind].what, hit.x, LINE_Z); if (isLost(s)) return ev; }
    }
    // grandi merende arrivate: "Bup!" se prendono Hari, altrimenti rotolano via
    if (s.balls.length) {
      const still = [];
      let hit = null;
      for (const q of s.balls) {
        if (q.back || q.z > LINE_Z) { still.push(q); continue; }
        if (!hit && s.calm <= 0 && Math.abs(q.x - s.px) < q.r + HARI_R) hit = q;
        else ev.push({ type: 'roll', id: q.id, x: q.x });
      }
      s.balls = still;
      if (hit) { snatch(s, ev, 'bup', hit.x, LINE_Z); if (isLost(s)) return ev; }
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
    if (!s.boss && s.si >= s.script.length && !s.animals.length && !s.gates.length && !s.obst.length && !s.pus.length) {
      s.boss = { kind: s.bossKind, x: 0, z: Z_FAR + 4, fed: s.bossFed, max: s.bossMax, vx: s.bossV, atkT: 2.2, ai: 0, ph: 0, q: [], callT: s.call || 0, enter: true };
      ev.push({ type: 'boss', kind: s.bossKind });
      news(s, ev, s.bossKind);
    }
    return ev;
  }

  function power(s, ev, pu, x) {
    if (pu === 'shield') s.shield = 1;
    else s.fx[pu] = PU_TIME[pu];
    ev.push({ type: 'pu', pu, x });
  }

  function bossTick(s, dt, ev) {
    const b = s.boss;
    if (b.enter) {
      b.z = Math.max(BOSS_Z, b.z - 6 * dt);
      if (b.z <= BOSS_Z) b.enter = false;
      return;
    }
    // più è sazio, più si agita: fasi a 50% e 80% della pancia
    const ph = b.fed >= b.max * 0.8 ? 2 : b.fed >= b.max * 0.5 ? 1 : 0;
    if (ph > b.ph) { b.ph = ph; b.ai = 0; b.vx = Math.sign(b.vx || 1) * s.bossV * (1 + 0.25 * ph); ev.push({ type: 'phase', n: ph }); }
    // va a destra e sinistra, ogni tanto cambia idea
    b.x += b.vx * dt;
    if (b.x > 0.62 || b.x < -0.62) { b.x = clamp(b.x, -0.62, 0.62); b.vx = -b.vx; }
    else if (rand(s) < dt * 0.35) b.vx = -b.vx;
    // grandi merende in coda (raffiche a più colpi)
    if (b.q.length) {
      for (const it of b.q) it.d = +(it.d - dt).toFixed(4);
      const now = b.q.filter((it) => it.d <= 0);
      if (now.length) { b.q = b.q.filter((it) => it.d > 0); now.forEach((it) => spawnBall(s, b, it.sp)); ev.push({ type: 'ball', n: now.length, kind: s.ball }); news(s, ev, 'back'); }
    }
    // un'azione alla volta: si aspetta che le grandi merende siano risolte e che non ci sia nulla in aria
    const busy = s.balls.length > 0 || b.q.length > 0;
    if (!busy) b.atkT -= dt;
    if (b.atkT <= 0 && !busy && !s.drops.length) {
      const cyc = CYCLES[b.ph], act = cyc[b.ai % cyc.length];
      b.ai++;
      if (act === 'lob') {
        b.atkT = s.blowIv;
        // mira dove sta Hari ora; più oggetti insieme sono affiancati e lasciano sempre una via di fuga ai lati
        const n = s.blowN, aim = clamp(s.px, -0.7, 0.7), flight = (b.z - LINE_Z) / DROP_V;
        for (let i = 0; i < n; i++) {
          const land = clamp(aim + (i - (n - 1) / 2) * DROP_SPREAD, -0.95, 0.95);
          s.drops.push({ id: ++s.seq, x: b.x, z: b.z - 0.3, vx: +((land - b.x) / flight).toFixed(4), z0: b.z - 0.3, x0: b.x, land: r2(land) });
        }
        ev.push({ type: 'blow', n });
      } else {
        b.atkT = s.blowIv * 0.6;
        volleyOf(b.kind, b.ph).forEach((sp) => b.q.push({ d: sp.d || 0, sp }));
        // i colpi senza ritardo partono subito
        const now = b.q.filter((it) => it.d <= 0);
        b.q = b.q.filter((it) => it.d > 0);
        now.forEach((it) => spawnBall(s, b, it.sp));
        if (now.length) { ev.push({ type: 'ball', n: now.length, kind: s.ball }); news(s, ev, 'back'); }
        ev.push({ type: 'blow', n: 0 });
      }
    }
    if (s.call && !busy) {
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

  function spawnBall(s, b, sp) {
    const lim = sp.lim != null ? sp.lim : null;
    const z = b.z - 0.4, flight = (z - LINE_Z) / sp.v;
    const tx = sp.aim ? clamp(s.px, -(lim != null ? lim : 0.7), lim != null ? lim : 0.7) : sp.x;
    let vx;
    if (sp.bx) vx = (tx >= b.x ? 1 : -1) * sp.bx;
    else vx = (tx - b.x) / flight;
    const hp = ballHp(s, sp);
    const q = { id: ++s.seq, k: s.ball, x: r2(sp.bx ? clamp(b.x, -lim, lim) : b.x), z: r2(z), r: sp.r, v: sp.v, vx: +vx.toFixed(4), hp, max: hp, back: 0 };
    if (lim != null) q.lim = lim;
    s.balls.push(q);
  }

  function animal(s, kind, x, z) {
    const A = ANIMALS[kind], need = A.need > 1 ? Math.round(A.need * config(s.level).needMul) : 1;
    const a = { id: ++s.seq, kind, x, z, left: need, max: need, vx: A.zig ? (rand(s) < 0.5 ? -A.zig : A.zig) : 0 };
    if (A.hop) a.hop = r2(7 + rand(s) * 7);
    return a;
  }

  // merenda rubata (o inciampo, bolla sul naso, "Bup!"): un cuore in meno, e Hari divide la merenda con chi è lì vicino.
  // Il cestino-scudo para il colpo: niente cuore perso.
  function snatch(s, ev, what, x, z) {
    s.calm = CALM;
    if (s.shield > 0) {
      s.shield = 0;
      ev.push({ type: 'shield', what, x, z });
    } else {
      s.oops++;
      s.mistakes = s.oops;
      ev.push({ type: 'snatch', what, x, z, left: LIVES - s.oops });
    }
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
    if (s.boss) s.boss.fed = s.bossMax;
    s.animals.forEach((a) => ev.push({ type: 'full', id: a.id, kind: a.kind, x: a.x, z: a.z, by: 'nap' }));
    s.animals = []; s.drops = []; s.treats = []; s.balls = [];
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
    HARI_R, PU_R, SWAP_STOP, BACK_V, PU_TIME,
    ANIMALS, KINDS, OBST, PUS, BOSSES, BOSS_ORDER, VOLLEYS, CYCLES, NEWS, GOOD, BAD, TREATS,
    config, newLevel, migrate, buildScript, step, tick, start, applyGate, fanOf, needOf, treatOf, ballHp, volleyOf, bossOf, covers, isGood,
    isWon, isLost, isOver, rate, progress,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
