/* Hari Airlines — logica pura (niente DOM), testabile da Node.
 *
 * Hari è l'assistente di volo. Ogni livello è un volo diviso in FASI (mini-giochi in sequenza):
 *   board   Imbarco: i passeggeri entrano dal portellone (a gruppi, qualcuno nascosto dietro un altro, qualcuno
 *           torna indietro a prendere qualcosa e poi rientra); alla fine si sceglie quanti sono a bordo
 *           (o, dai livelli alti, quanti mancano rispetto alla lista del capitano). Contatore facoltativo.
 *   bags    Bagagli: borse e valigie fuori posto (corridoio, sedili liberi, sotto i piedi, uscita di sicurezza)
 *           vanno nelle cappelliere, che hanno 4 spazi e sono già in parte piene; le valigie occupano 1, 2 o 3 spazi.
 *   belts   Cinture: segnale acceso, si tocca chi ha la cintura slacciata; i testardi vanno convinti con più tocchi,
 *           i "ribelli" la slacciano di nuovo una volta, un sobbalzo buffo ne fa saltare qualcuna. Tempo fino al decollo.
 *   galley  Cucina: pasto del capitano da comporre nell'ordine della ricetta + vassoi da scaldare nel fornetto
 *           (toccare quando la lancetta è nella zona verde: né freddo né bruciato).
 *   serve   Servizio: fumetti con le richieste (bevande, snack, pasto caldo, coperta, cuscino), pazienza che cala.
 *   trash   Rifiuti: si raccolgono bicchieri, carte e bucce col sacco giusto (1 → 2 → 3 sacchi) prima dell'atterraggio.
 * Dopo l'ultima fase: atterraggio = vittoria con riepilogo.
 *
 * Errori leggeri, mai sconfitta: ogni errore conta per le fragoline; i passeggeri trascurati (cintura slacciata al
 * decollo, pazienza finita, rifiuti lasciati) perdono il sorriso. Allo scadere del tempo la fase finisce comunque.
 *
 * Tutto è deciso alla generazione (seme + livello): step(s, dt) è deterministico, lo stato è JSON puro.
 *
 * API su HH.flight:
 *   PHASES, ITEMS, ING, TRASH, SACKS, ROUTES, config(level), generate(level, seed), newGame(level, seed)
 *   phase(s) → id della fase corrente | 'land' · start(s) (via della fase) · step(s, dt) → eventi · advance(s)
 *   board: click(s, d) · answer(s, n) · replay(s)
 *   bags:  move(s, bagId, bin) · undo(s) · free(s, bin)
 *   belts: nag(s, pid)
 *   galley: addIng(s, ing) · oven(s, slot)
 *   serve: give(s, pid, item)
 *   trash: collect(s, tid, sack)
 *   isWon, happy, summary, rate, parTime, progress, validate
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const PHASES = ['board', 'bags', 'belts', 'galley', 'serve', 'trash'];
  const TIMED = { board: true, belts: true, galley: true, serve: true, trash: true };
  const SPECIES = ['cat', 'bunny', 'bear', 'fox', 'panda', 'frog', 'mouse', 'pig', 'chick', 'koala', 'dog', 'raccoon'];
  const ROUTES = ['sea', 'mountain', 'city', 'night'];
  const ITEMS = ['water', 'juice', 'tea', 'cookie', 'meal', 'blanket', 'pillow'];
  const ING = ['bread', 'egg', 'salad', 'tomato', 'cheese', 'rice', 'fish', 'carrot', 'berry'];
  const TRASH = { cup: 'plastic', bottle: 'plastic', napkin: 'paper', paper: 'paper', peel: 'food', core: 'food' };
  const SACKS = ['paper', 'plastic', 'food'];
  const BIN_CAP = 4;

  /* ---------- curva di difficoltà ---------- */
  const at = (arr, L) => arr[Math.min(L, arr.length) - 1];
  function config(level) {
    const L = Math.max(1, level | 0);
    const rows = at([3, 3, 4, 4, 5, 5, 6], L);
    const seats = rows * 4;
    const pax = Math.min(seats - 2, Math.round(seats * (0.55 + 0.04 * Math.min(L, 8))));
    const phases = ['board'];
    if (L >= 2) phases.push('bags');
    phases.push('belts');
    if (L >= 3) phases.push('galley');
    phases.push('serve');
    if (L >= 4) phases.push('trash');
    const isNew = { 2: 'bags', 3: 'galley', 4: 'trash' }[L] || null;
    const k = Math.min(1, (L - 1) / 8);                       // 0 al livello 1 → 1 dal livello 9
    return {
      level: L, rows, seats, pax, phases, isNew, route: ROUTES[(L - 1) % ROUTES.length],
      board: {
        gap: +Math.max(0.8, 1.7 - 0.1 * (L - 1)).toFixed(2),
        gmax: at([1, 2, 2, 3], L), outs: L >= 3 ? Math.min(3, Math.floor((L - 1) / 2)) : 0,
        hide: L >= 4, late: L >= 6 ? 3 : L >= 4 ? 1 : 0, missing: L >= 6 && L % 2 === 0,
      },
      bags: { loose: Math.min(rows * 2 - 1, at([0, 3, 4, 5, 5, 6, 7, 8], L)), sizes: L < 4 ? [1, 1, 2] : L < 6 ? [1, 2, 2, 3] : [1, 2, 3, 3], slack: Math.max(0, 6 - L) },
      belts: {
        unb: Math.min(pax, at([3, 3, 4, 5, 6, 7, 8], L) + Math.floor(Math.max(0, L - 7) / 3)),
        stub: at([1, 1, 2, 2, 3, 3, 4], L), needMax: L >= 5 ? 4 : L >= 3 ? 3 : 2,
        rebels: at([0, 1, 1, 2, 2, 3, 3], L), bump: L >= 8 ? 2 : L >= 5 ? 1 : 0,
        mult: +Math.max(1.35, 2.4 - 0.13 * (L - 1)).toFixed(2),
      },
      galley: { len: at([3, 3, 3, 3, 4, 4, 5, 5, 5, 6], L), slots: L >= 5 ? 3 : 2, win: +Math.max(1.4, 2.8 - 0.2 * (L - 3)).toFixed(2) },
      serve: {
        reqs: at([4, 5, 6, 7, 8, 9, 10, 11, 12], L), active: at([2, 2, 3, 3, 4], L),
        items: at([3, 4, 5, 6, 7], L), meals: L >= 3 ? at([0, 0, 2, 3, 3, 4, 4, 5], L) : 0,
        pat: Math.max(14, 36 - 2.4 * (L - 1)), two: L >= 6 ? at([0, 0, 0, 0, 0, 2, 3, 3, 4], L) : 0,
      },
      trash: { n: at([0, 0, 0, 5, 6, 7, 8, 9, 10], L), sacks: L >= 7 ? 3 : L >= 5 ? 2 : 1, mult: +Math.max(1.6, 2.6 - 0.12 * (L - 4)).toFixed(2) },
      diff: 0,
    };
  }

  /* ---------- generazione ---------- */
  const rng = (seed) => (HH.rng ? HH.rng(seed) : (() => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })());
  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

  function genBoard(c, rnd, paxIds) {
    const late = Math.min(c.board.late && c.board.late > 1 ? 1 + Math.floor(rnd() * c.board.late) : c.board.late, paxIds.length - 3);
    const lateIds = paxIds.slice(paxIds.length - late);
    const queue = paxIds.slice(0, paxIds.length - late);
    const B = queue.length;
    const steps = [];
    const seated = [];
    let outs = c.board.outs;
    let guard = 0;
    while (queue.length && guard++ < 500) {
      const left = queue.length;
      if (outs > 0 && seated.length >= 2 && (rnd() < 0.35 || left <= outs + 1)) {
        const x = seated.splice(Math.floor(rnd() * seated.length), 1)[0];
        steps.push({ k: 'out', ids: [x] });
        // torna più avanti (ha dimenticato qualcosa): mai come ultimo da solo subito dopo
        queue.splice(1 + Math.floor(rnd() * queue.length), 0, x);
        outs--;
        continue;
      }
      const g = Math.min(queue.length, 1 + Math.floor(rnd() * c.board.gmax));
      const ids = queue.splice(0, g);
      steps.push({ k: 'in', ids, hide: g >= 2 && c.board.hide && rnd() < 0.6 });
      seated.push(...ids);
    }
    const missing = c.board.missing && late > 0;
    const ans = missing ? late : B;
    const opts = new Set([ans]);
    const near = shuffle([-2, -1, 1, 2, 3], rnd);
    for (const d of near) { if (opts.size >= 4) break; if (ans + d >= 0) opts.add(ans + d); }
    return { steps, late: lateIds, booked: paxIds.length, ask: missing ? 'missing' : 'count', ans, opts: [...opts].sort((a, b) => a - b), gap: c.board.gap };
  }

  // cappelliere: 2 per fila, 4 spazi; prima si decide dove va ogni borsa (soluzione), poi si riempiono gli spazi
  // restanti con le valigie degli altri passeggeri, lasciando `slack` spazi liberi in più sparsi
  function genBags(c, rnd, pax, empty) {
    const nb = c.rows * 2;
    const n = c.bags.loose;
    const sizes = Array.from({ length: n }, () => pick(c.bags.sizes, rnd)).sort((a, b) => b - a);
    const used = new Array(nb).fill(0);
    const sol = [];
    for (const sz of sizes) {
      const ok = used.map((u, i) => i).filter((i) => used[i] + sz <= BIN_CAP);
      // preferenza per cappelliere già scelte: incastri più stretti
      const pref = ok.filter((i) => used[i] > 0 && rnd() < 0.5);
      const b = pick(pref.length ? pref : ok, rnd);
      used[b] += sz; sol.push(b);
    }
    const free = used.slice();
    let slack = c.bags.slack;
    for (let g = 0; slack > 0 && g < 200; g++) { const b = Math.floor(rnd() * nb); if (free[b] < BIN_CAP) { free[b]++; slack--; } }
    const bins = free.map((f) => {
      const fill = [];
      let rest = BIN_CAP - f;
      while (rest > 0) { const sz = Math.min(rest, rest >= 2 && rnd() < 0.55 ? 2 : 1); fill.push(sz); rest -= sz; }
      return { fill };
    });
    // posti dove le borse sono finite per sbaglio
    const locs = [];
    for (let r = 0; r < c.rows; r++) locs.push({ k: 'aisle', row: r });
    empty.forEach((seat) => locs.push({ k: 'seat', seat }));
    shuffle(pax.map((p) => p.seat), rnd).slice(0, 4).forEach((seat) => locs.push({ k: 'feet', seat }));
    shuffle(locs, rnd);
    const exitRow = c.level >= 5 ? Math.floor(c.rows / 2) : -1;
    if (exitRow >= 0) {
      // una borsa blocca l'uscita di sicurezza
      const i = locs.findIndex((l) => l.k === 'aisle' && l.row === exitRow);
      if (i > 0) { const [l] = locs.splice(i, 1); locs.unshift(l); }
    }
    const bags = sizes.map((size, i) => ({ id: i, size, look: Math.floor(rnd() * 3), loc: Object.assign({}, locs[i], locs[i].k === 'aisle' && locs[i].row === exitRow ? { exit: true } : {}) }));
    shuffle(bags, rnd).forEach((b, i) => { b.id = i; });
    return { bins, bags, exitRow, min: n };
  }

  function genBelts(c, rnd, pax) {
    const B = c.belts;
    const ids = shuffle(pax.map((p) => p.id), rnd).slice(0, B.unb);
    const need = {};
    ids.forEach((id, i) => { need[id] = i < B.stub ? 2 + Math.floor(rnd() * (B.needMax - 1)) : 1; });
    const rebels = ids.slice(B.stub, B.stub + B.rebels);
    const again = {};
    rebels.forEach((id) => { again[id] = +(2.2 + rnd() * 1.4).toFixed(2); });
    const order = shuffle(pax.map((p) => p.id), rnd);                 // chi salta per primo col sobbalzo
    const taps = ids.reduce((n, id) => n + need[id], 0) + rebels.length + B.bump;
    const limit = Math.round(5 + taps * 0.9 * B.mult + rebels.length * 3.5 + (B.bump ? 3 : 0));
    return { ids, need, again, bump: B.bump, order, limit };
  }

  function genGalley(c, rnd, meals) {
    const recipe = shuffle(ING.slice(), rnd).slice(0, c.galley.len);
    const extra = shuffle(ING.filter((x) => !recipe.includes(x)), rnd).slice(0, Math.min(ING.length - recipe.length, 2 + Math.floor((c.level - 3) / 2)));
    const palette = shuffle(recipe.concat(extra), rnd);
    const ready = [3, 4.5, 6].slice(0, c.galley.slots);
    return { recipe, palette, meals, ready, win: c.galley.win };
  }

  function genServe(c, rnd, pax) {
    const S = c.serve;
    const pool = ITEMS.slice(0, S.items).filter((x) => x !== 'meal');
    const who = shuffle(pax.map((p) => p.id), rnd).slice(0, Math.min(S.reqs, pax.length));
    const reqs = who.map((pid) => ({ pid, items: [pick(pool, rnd)] }));
    for (let i = 0; i < S.meals && i < reqs.length; i++) reqs[i].items = ['meal'];
    for (let i = 0; i < S.two; i++) {
      const r = reqs[reqs.length - 1 - i];
      if (!r || r.items.length > 1) continue;
      const other = pool.filter((x) => !r.items.includes(x));
      r.items.push(pick(other, rnd));
    }
    shuffle(reqs, rnd);
    return { reqs, active: S.active, pat: S.pat, pool: ITEMS.slice(0, S.items) };
  }

  function genTrash(c, rnd, pax) {
    const T = c.trash;
    const kinds = Object.keys(TRASH).filter((k) => T.sacks >= 3 || TRASH[k] !== 'food');
    const seats = shuffle(pax.map((p) => p.seat), rnd).slice(0, Math.min(T.n, pax.length));
    const items = seats.map((seat, i) => ({ id: i, seat, kind: kinds[i % kinds.length] }));
    shuffle(items, rnd).forEach((it, i) => { it.id = i; it.seat = seats[i]; });
    const sacks = T.sacks === 1 ? ['all'] : T.sacks === 2 ? ['paper', 'plastic'] : SACKS.slice();
    const limit = Math.round(8 + T.n * 1.5 * T.mult);
    return { items, sacks, limit };
  }

  function generate(level, seed) {
    const c = config(level);
    const rnd = rng((seed >>> 0) ^ 0x5eed);
    const seatIdx = shuffle(Array.from({ length: c.seats }, (_, i) => i), rnd);
    const taken = seatIdx.slice(0, c.pax).sort((a, b) => a - b);
    const empty = seatIdx.slice(c.pax).sort((a, b) => a - b);
    const sp = shuffle(SPECIES.slice(), rnd);
    const pax = taken.map((seat, i) => ({ id: i, seat, sp: sp[i % sp.length], tone: Math.floor(rnd() * 3) }));
    const order = shuffle(pax.map((p) => p.id), rnd);
    const plan = { board: genBoard(c, rnd, order) };
    if (c.phases.includes('bags')) plan.bags = genBags(c, rnd, pax, empty);
    plan.belts = genBelts(c, rnd, pax);
    if (c.phases.includes('galley')) plan.galley = genGalley(c, rnd, c.serve.meals);
    plan.serve = genServe(c, rnd, pax);
    if (c.phases.includes('trash')) plan.trash = genTrash(c, rnd, pax);
    return {
      v: 1, level: c.level, seed: seed >>> 0, rows: c.rows, route: c.route, phases: c.phases, isNew: c.isNew,
      pax, plan, pi: 0, ph: null, mood: pax.map(() => 3), moves: 0, mistakes: 0, time: 0, log: {},
    };
  }
  function newGame(level, seed) { const s = generate(level, seed); enter(s); return s; }

  /* ---------- fasi ---------- */
  const phase = (s) => (s.pi < s.phases.length ? s.phases[s.pi] : 'land');
  function enter(s) {
    const id = phase(s), P = s.plan[id];
    const ph = { id, go: !TIMED[id], done: false, t: 0 };
    if (id === 'board') Object.assign(ph, { asking: false, clicks: 0, wrong: [], replays: 0 });
    if (id === 'bags') Object.assign(ph, { at: P.bags.map(() => -1), hist: [], full: 0 });
    if (id === 'belts') {
      Object.assign(ph, { belt: s.pax.map((p) => (P.ids.includes(p.id) ? 0 : 1)), need: s.pax.map((p) => (P.need[p.id] || 1)),
        again: s.pax.map((p) => (P.again[p.id] ? 1 : 0)), reT: s.pax.map(() => 0), buckled: 0, bumpT: -1, bumped: false, late: [] });
    }
    if (id === 'galley') Object.assign(ph, { tray: [], cap: false, heat: P.ready.map(() => -1), ready: 0, burnt: 0, dinged: P.ready.map(() => false) });
    if (id === 'serve') Object.assign(ph, { next: 0, cd: 0.6, act: [], done_n: 0, meals: s.plan.galley ? s.plan.galley.meals : 0 });
    if (id === 'trash') Object.assign(ph, { got: P.items.map(() => false), left: [] });
    s.ph = ph;
    return ph;
  }
  function start(s) { if (s.ph && !s.ph.go) { s.ph.go = true; return true; } return false; }
  function advance(s) {
    if (!s.ph || !s.ph.done) return false;
    s.log[s.ph.id] = { t: +s.ph.t.toFixed(2) };
    s.pi++;
    if (s.pi < s.phases.length) enter(s); else s.ph = { id: 'land', go: true, done: true, t: 0 };
    return true;
  }
  const isWon = (s) => s.pi >= s.phases.length;
  const timeLeft = (s) => {
    const ph = s.ph;
    if (!ph) return Infinity;
    if (ph.id === 'belts') return Math.max(0, s.plan.belts.limit - ph.t);
    if (ph.id === 'trash') return Math.max(0, s.plan.trash.limit - ph.t);
    return Infinity;
  };
  const sad = (s, pid) => { s.mood[pid] = Math.max(0, s.mood[pid] - 1); };

  /* ---------- tempo ---------- */
  const boardEnd = (P) => 0.6 + P.steps.length * P.gap + 0.8;
  function step(s, dt) {
    const ph = s.ph, ev = [];
    if (!ph || !ph.go || ph.done || !(dt > 0)) return ev;
    const t0 = ph.t;
    ph.t += dt;
    s.time += dt;
    const P = s.plan[ph.id];
    if (ph.id === 'board') {
      if (!ph.asking) {
        P.steps.forEach((st, i) => { const ti = 0.6 + i * P.gap; if (t0 < ti && ph.t >= ti) ev.push({ type: 'enter', i, step: st }); });
        if (ph.t >= boardEnd(P)) { ph.asking = true; ev.push({ type: 'ask' }); }
      }
    } else if (ph.id === 'belts') {
      ph.reT.forEach((r, pid) => {
        if (r > 0) { ph.reT[pid] = r - dt; if (ph.reT[pid] <= 0) { ph.reT[pid] = 0; ph.belt[pid] = 0; ph.need[pid] = 1; ev.push({ type: 'unbuckle', pid, why: 'rebel' }); } }
      });
      if (ph.bumpT > 0) {
        ph.bumpT -= dt;
        if (ph.bumpT <= 0) {
          ph.bumpT = 0; ph.bumped = true;
          const hit = P.order.filter((pid) => ph.belt[pid] === 1).slice(0, P.bump);
          hit.forEach((pid) => { ph.belt[pid] = 0; ph.need[pid] = 1; });
          ev.push({ type: 'bump', pids: hit });
        }
      }
      beltsCheck(s, ev);
      if (!ph.done && ph.t >= P.limit) {
        // decollo comunque: Hari allaccia da sé le cinture rimaste, ma quei passeggeri ci restano male
        ph.late = s.pax.filter((p) => ph.belt[p.id] === 0).map((p) => p.id);
        ph.late.forEach((pid) => { ph.belt[pid] = 1; sad(s, pid); });
        ph.reT = ph.reT.map(() => 0);
        ph.done = true;
        ev.push({ type: 'timeout', pids: ph.late }, { type: 'done' });
      }
    } else if (ph.id === 'galley') {
      ph.heat.forEach((h, i) => {
        if (h < 0) return;
        ph.heat[i] = h + dt;
        if (!ph.dinged[i] && ph.heat[i] >= P.ready[i]) { ph.dinged[i] = true; ev.push({ type: 'ding', slot: i }); }
        if (ph.heat[i] > P.ready[i] + P.win) { ph.heat[i] = -1; ph.dinged[i] = false; ph.burnt++; s.mistakes++; ev.push({ type: 'burnt', slot: i }); }
      });
    } else if (ph.id === 'serve') {
      ph.act.forEach((a) => {
        if (a.pat > 0) { a.pat -= dt; if (a.pat <= 0) { a.pat = 0; sad(s, a.pid); ev.push({ type: 'impatient', pid: a.pid }); } }
      });
      ph.cd -= dt;
      if (ph.cd <= 0 && ph.next < P.reqs.length && ph.act.length < P.active) {
        const r = P.reqs[ph.next++];
        const a = { pid: r.pid, items: r.items.slice(), pat: P.pat, max: P.pat };
        ph.act.push(a);
        ph.cd = ph.act.length < P.active ? 1.4 : 0.9;
        ev.push({ type: 'spawn', pid: r.pid });
      }
    } else if (ph.id === 'trash') {
      if (ph.t >= P.limit) {
        ph.left = P.items.filter((it, i) => !ph.got[i]).map((it) => it.id);
        ph.left.forEach((id) => { const p = s.pax.find((x) => x.seat === P.items[id].seat); if (p) sad(s, p.id); });
        ph.done = true;
        ev.push({ type: 'timeout', ids: ph.left }, { type: 'done' });
      }
    }
    return ev;
  }

  /* ---------- imbarco ---------- */
  function click(s, d) { const ph = s.ph; if (!ph || ph.id !== 'board' || ph.done) return false; ph.clicks = Math.max(0, Math.min(99, ph.clicks + (d < 0 ? -1 : 1))); return true; }
  function answer(s, n) {
    const ph = s.ph, P = s.plan.board;
    if (!ph || ph.id !== 'board' || ph.done || !ph.asking || !P.opts.includes(n) || ph.wrong.includes(n)) return 'invalid';
    s.moves++;
    if (n === P.ans) { ph.done = true; return 'ok'; }
    ph.wrong.push(n); s.mistakes++;
    return 'wrong';
  }
  // rivedi l'imbarco (dopo aver risposto almeno una volta male, o mentre si chiede): conta come un piccolo errore
  function replay(s) {
    const ph = s.ph;
    if (!ph || ph.id !== 'board' || ph.done || !ph.asking) return false;
    ph.asking = false; ph.t = 0; ph.replays++; ph.clicks = 0; s.mistakes++;
    return true;
  }

  /* ---------- bagagli ---------- */
  function free(s, bin) {
    const P = s.plan.bags;
    let f = BIN_CAP - P.bins[bin].fill.reduce((a, b) => a + b, 0);
    if (s.ph && s.ph.id === 'bags') P.bags.forEach((b, i) => { if (s.ph.at[i] === bin) f -= b.size; });
    return f;
  }
  function move(s, bagId, bin) {
    const ph = s.ph, P = s.plan.bags;
    if (!ph || ph.id !== 'bags' || ph.done) return 'invalid';
    const b = P.bags[bagId];
    if (!b || !(bin >= 0 && bin < P.bins.length) || ph.at[bagId] === bin) return 'invalid';
    if (free(s, bin) < b.size) { ph.full++; return 'full'; }
    ph.hist.push([bagId, ph.at[bagId]]);
    ph.at[bagId] = bin;
    s.moves++;
    if (ph.at.every((x) => x >= 0)) ph.done = true;
    return 'ok';
  }
  function undo(s) {
    const ph = s.ph;
    if (!ph || ph.id !== 'bags' || ph.done || !ph.hist.length) return false;
    const [bagId, prev] = ph.hist.pop();
    ph.at[bagId] = prev;
    return true;
  }

  /* ---------- cinture ---------- */
  function nag(s, pid) {
    const ph = s.ph;
    if (!ph || ph.id !== 'belts' || !ph.go || ph.done || ph.belt[pid] !== 0) return 'invalid';
    s.moves++;
    ph.need[pid]--;
    if (ph.need[pid] > 0) return 'nag';
    ph.belt[pid] = 1;
    ph.buckled++;
    if (ph.again[pid] > 0) { ph.again[pid]--; ph.reT[pid] = s.plan.belts.again[pid]; }
    const P = s.plan.belts;
    if (P.bump && !ph.bumped && ph.bumpT < 0 && ph.buckled >= Math.ceil(P.ids.length / 2)) ph.bumpT = 0.9;
    const ev = [];
    beltsCheck(s, ev);
    return 'buckled';
  }
  function beltsCheck(s, ev) {
    const ph = s.ph, P = s.plan.belts;
    if (ph.done) return;
    const all = ph.belt.every((b) => b === 1), pending = ph.reT.some((r) => r > 0) || ph.bumpT > 0 || (P.bump > 0 && !ph.bumped);
    if (all && !pending) { ph.done = true; ev.push({ type: 'done' }); }
  }

  /* ---------- cucina ---------- */
  function addIng(s, ing) {
    const ph = s.ph, P = s.plan.galley;
    if (!ph || ph.id !== 'galley' || !ph.go || ph.done || ph.cap || !P.palette.includes(ing)) return 'invalid';
    s.moves++;
    if (P.recipe[ph.tray.length] !== ing) { s.mistakes++; return 'wrong'; }
    ph.tray.push(ing);
    if (ph.tray.length === P.recipe.length) { ph.cap = true; galleyCheck(s); return 'captain'; }
    return 'ok';
  }
  const mealsLeft = (s) => s.plan.galley.meals - s.ph.ready - s.ph.heat.filter((h) => h >= 0).length;
  function oven(s, slot) {
    const ph = s.ph, P = s.plan.galley;
    if (!ph || ph.id !== 'galley' || !ph.go || ph.done || !(slot >= 0 && slot < P.ready.length)) return 'invalid';
    const h = ph.heat[slot];
    if (h < 0) {
      if (mealsLeft(s) <= 0) return 'invalid';
      ph.heat[slot] = 0; ph.dinged[slot] = false; s.moves++;
      return 'load';
    }
    s.moves++;
    if (h < P.ready[slot]) { s.mistakes++; return 'cold'; }
    ph.heat[slot] = -1; ph.dinged[slot] = false; ph.ready++;
    galleyCheck(s);
    return 'hot';
  }
  function galleyCheck(s) { const ph = s.ph; if (ph.cap && ph.ready >= s.plan.galley.meals) ph.done = true; }

  /* ---------- servizio ---------- */
  function give(s, pid, item) {
    const ph = s.ph;
    if (!ph || ph.id !== 'serve' || !ph.go || ph.done || !ITEMS.includes(item)) return 'invalid';
    const a = ph.act.find((x) => x.pid === pid);
    if (!s.pax[pid]) return 'invalid';
    s.moves++;
    if (!a || !a.items.includes(item) || (item === 'meal' && ph.meals <= 0)) { s.mistakes++; return 'wrong'; }
    a.items.splice(a.items.indexOf(item), 1);
    if (item === 'meal') ph.meals--;
    if (a.items.length) return 'ok';
    ph.act.splice(ph.act.indexOf(a), 1);
    ph.done_n++;
    if (ph.done_n >= s.plan.serve.reqs.length) ph.done = true;
    return 'served';
  }

  /* ---------- rifiuti ---------- */
  const sackFor = (s, kind) => (s.plan.trash.sacks.length === 1 ? 'all' : TRASH[kind]);
  function collect(s, tid, sack) {
    const ph = s.ph, P = s.plan.trash;
    if (!ph || ph.id !== 'trash' || !ph.go || ph.done || !P.items[tid] || ph.got[tid] || !P.sacks.includes(sack)) return 'invalid';
    s.moves++;
    if (sackFor(s, P.items[tid].kind) !== sack) { s.mistakes++; return 'wrong'; }
    ph.got[tid] = true;
    if (ph.got.every(Boolean)) ph.done = true;
    return 'ok';
  }

  /* ---------- punteggio ---------- */
  const happy = (s) => s.mood.filter((m) => m >= 3).length;
  function penalty(s) {
    const extraBags = s.log.bags ? Math.max(0, (s.log.bags.moves || 0) - s.plan.bags.min) : 0;
    return s.mistakes + 2 * (s.pax.length - happy(s)) + extraBags;
  }
  function thresholds(s) { const a = 1 + Math.floor(s.level / 2); return [a, a * 2 + 3]; }
  function rate(s) { const p = penalty(s), [a, b] = thresholds(s); return p <= a ? 3 : p <= b ? 2 : 1; }
  function summary(s) { return { pax: s.pax.length, happy: happy(s), mistakes: s.mistakes, stars: rate(s), time: Math.round(s.time) }; }
  function parTime(s) {
    const P = s.plan;
    let t = 6 + P.board.steps.length * P.board.gap + 4;
    if (P.bags) t += P.bags.bags.length * 4;
    t += P.belts.limit * 0.6;
    if (P.galley) t += P.galley.recipe.length * 2 + P.galley.meals * 6;
    t += P.serve.reqs.length * 5 + 6;
    if (P.trash) t += P.trash.items.length * 2 + 4;
    return Math.round(t);
  }
  function phaseFrac(s) {
    const ph = s.ph, P = ph && s.plan[ph.id];
    if (!ph || ph.done) return 1;
    if (ph.id === 'board') return ph.asking ? 0.8 : Math.min(0.75, ph.t / boardEnd(P) * 0.75);
    if (ph.id === 'bags') return ph.at.filter((x) => x >= 0).length / ph.at.length;
    if (ph.id === 'belts') return ph.belt.filter((b) => b === 1).length / ph.belt.length;
    if (ph.id === 'galley') return (ph.tray.length + ph.ready) / (P.recipe.length + P.meals || 1);
    if (ph.id === 'serve') return ph.done_n / P.reqs.length;
    if (ph.id === 'trash') return ph.got.filter(Boolean).length / ph.got.length;
    return 0;
  }
  function progress(s) {
    if (!s || !s.phases) return 0;
    if (isWon(s)) return 1;
    return Math.max(0, Math.min(0.99, (s.pi + phaseFrac(s) * 0.98) / s.phases.length));
  }
  function validate(o) {
    return !!(o && o.v === 1 && Array.isArray(o.phases) && Array.isArray(o.pax) && o.plan && o.plan.board && o.plan.belts && o.plan.serve
      && Number.isInteger(o.pi) && o.pi >= 0 && o.pi <= o.phases.length && Array.isArray(o.mood) && o.mood.length === o.pax.length
      && (o.pi >= o.phases.length || (o.ph && o.ph.id === o.phases[o.pi])));
  }
  // al salvataggio della fase dei bagagli si ricordano le mosse (servono alle fragoline)
  const _adv = advance;
  function advanceWithLog(s) {
    const id = s.ph && s.ph.id, moves = id === 'bags' ? s.ph.hist.length : 0;
    const ok = _adv(s);
    if (ok && id === 'bags') s.log.bags.moves = moves;
    return ok;
  }

  HH.flight = {
    PHASES, TIMED, SPECIES, ROUTES, ITEMS, ING, TRASH, SACKS, BIN_CAP,
    config, generate, newGame, phase, enter, start, step, advance: advanceWithLog, isWon, timeLeft, boardEnd, mealsLeft, sackFor,
    click, answer, replay, free, move, undo, nag, addIng, oven, give, collect,
    happy, penalty, thresholds, rate, summary, parTime, progress, validate,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
