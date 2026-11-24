/* Hari Express — logica pura (niente DOM), testabile da Node: stato della partita, livelli e obiettivi, azioni del
 * giocatore (le stesse per UI e bot), salvataggio compatto, stelle e progresso.
 * Moduli caricati prima (stesso HH): express-map.js (mappe), express-net.js (reti e A*), express-sim.js (simulazione).
 *
 * Stato `s` (JSON, è lo snapshot): { v, mode: 'level'|'free', level, seed, opts, day, tk, money, m0, net, cut, towns,
 *   inds, stations, veh, nid, del, gd, fin, finY, goals, deadline, par, won, lost, wonDay, moves, rs, speed }.
 * La mappa (terreno, acqua, alberi) NON è nello stato: si rigenera dal seme. `net` = solo le caselle cambiate
 * { idx: [binari, strade, semaforo, senso unico] }, `cut` = alberi tolti. Il mondo con le tabelle dense (W) è una
 * proprietà non enumerabile ricostruita al bisogno (world(s)), quindi JSON.stringify(s) resta piccolo.
 *
 * Azioni: act(s, a) con a.k = 'build' | 'station' | 'demolish' | 'signal' | 'oneway' | 'buy' | 'sell' | 'orders' | 'speed'
 * → { ok, cost, err, id }. Anteprima della costruzione: preview(s, kind, a, b) (lo stesso percorso che poi si costruisce).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const M = HH.expressMap, NET = HH.expressNet, S = HH.expressSim;
  const { TPD, VT, WAGON, date } = S;
  const AXIS = NET.AXIS;

  /* ---------- livelli ---------- */
  // site(i) = i-esimo sito del modello di mappa (express-map LEVELS); goal: del (merce consegnata, a un'industria o a
  // un villaggio), train (treni in servizio), pop (abitanti di un villaggio)
  const LV = [null,
    { money: 3000, days: 365, par: 90, goals: (m) => [{ k: 'del', c: 'pax', n: 120 }] },
    { money: 4000, days: 365, par: 150, goals: (m) => [{ k: 'del', c: 'milk', n: 200, ind: m.sites[2].ind }] },
    { money: 8000, days: 540, par: 170, goals: (m) => [{ k: 'del', c: 'milk', n: 150, ind: m.sites[2].ind }, { k: 'del', c: 'cheese', n: 100, town: m.sites[3].town }] },
    { money: 17000, days: 540, par: 260, goals: (m) => [{ k: 'del', c: 'grain', n: 400, ind: m.sites[2].ind }, { k: 'train', n: 1 }, { k: 'del', c: 'bread', n: 100, town: m.sites[3].town }] },
    { money: 30000, days: 730, par: 380, goals: (m) => [{ k: 'del', c: 'wood', n: 500, ind: m.sites[2].ind }, { k: 'train', n: 2 }, { k: 'pop', town: m.sites[3].town, n: m.towns[m.sites[3].town].pop + 120 }] },
  ];
  const LAST = LV.length - 1;          // fase 1: livelli 1–5; dal 6 sfide sui modelli 3–5 con obiettivi più grandi
  const FREE_AT = 5;                   // la Libera si sblocca al livello 5 (fase 1)
  function config(level) {
    const base = level <= LAST ? level : 3 + ((level - LAST - 1) % 3);
    const k = level <= LAST ? 1 : 1 + 0.2 * Math.ceil((level - LAST) / 3);
    const L = LV[base];
    return { base, k, money: Math.round(L.money * (level <= LAST ? 1 : 1.15)), days: L.days, par: Math.round(L.par * k), map: M.LEVELS[base] };
  }

  /* ---------- mondo (tabelle dense, non salvate) ---------- */
  const cache = new Map();
  function baseMap(s) {
    const key = s.mode === 'free' ? `f:${s.seed}:${s.opts.size}:${s.opts.water}` : `l:${config(s.level).base}:${s.seed}`;
    let m = cache.get(key);
    if (!m) {
      m = s.mode === 'free' ? M.generate({ w: s.opts.size, h: s.opts.size, water: s.opts.water, kind: s.opts.water === 0 ? 'land' : 'island' }, HH.rng(s.seed))
        : M.scenario(config(s.level).base, s.seed);
      cache.set(key, m);
      if (cache.size > 6) cache.delete(cache.keys().next().value);
    }
    return m;
  }
  function world(s) {
    if (s._w) return s._w;
    const m = baseMap(s), n = m.w * m.h;
    const W = {
      w: m.w, h: m.h, n, base: m, ver: s.nv || 1, covDirty: true, cov: null,
      ht: Uint8Array.from(m.ht), water: Uint8Array.from(m.water), tree: Uint8Array.from(m.tree),
      use: new Uint8Array(n), own: new Int16Array(n).fill(-1), rail: new Uint8Array(n), road: new Uint8Array(n), troad: new Uint8Array(n),
      st: new Int16Array(n), sax: new Uint8Array(n), sk: new Uint8Array(n), sig: new Uint8Array(n), ow: new Uint8Array(n), resv: new Int32Array(n),
    };
    for (const k in m.roads) { W.road[+k] = m.roads[k]; W.troad[+k] = 1; }
    for (const t of s.cut) W.tree[t] = 0;
    for (const d of s.inds) for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const i = (d.y + dy) * m.w + d.x + dx; W.use[i] = 2; W.own[i] = d.id; W.tree[i] = 0; }
    for (const tw of s.towns) for (const i of tw.houses) { W.use[i] = 1; W.own[i] = tw.id; W.tree[i] = 0; }
    for (const k in s.net) { const e = s.net[k], i = +k; W.rail[i] = e[0]; W.road[i] = e[1]; W.sig[i] = e[2]; W.ow[i] = e[3]; }
    for (const st of s.stations) if (st) for (const t of st.tiles) { W.st[t] = st.id + 1; W.sax[t] = st.ax; W.sk[t] = st.kind === 'rail' ? 1 : 2; }
    for (const v of s.veh) if (S.isTrain(v)) { for (const e of v.trail) W.resv[e[0]] = v.id; for (const t of v.ahead) W.resv[t] = v.id; }
    Object.defineProperty(s, '_w', { value: W, enumerable: false, configurable: true, writable: true });
    return W;
  }
  function saveTile(s, W, i) {
    const base = W.base.roads[i] || 0;
    if (W.rail[i] || W.road[i] !== base || W.sig[i] || W.ow[i]) s.net[i] = [W.rail[i], W.road[i], W.sig[i], W.ow[i]];
    else delete s.net[i];
    if (W.base.tree[i] && !W.tree[i] && !W.use[i] && !s.cut.includes(i)) s.cut.push(i);
  }
  const bump = (s, W) => { s.nv = (s.nv || 1) + 1; W.ver = s.nv; W.covDirty = true; };

  /* ---------- nuove partite ---------- */
  function blank(mode, seed) {
    return { v: 1, mode, level: 1, seed, opts: null, day: 0, tk: 0, money: 0, m0: 0, net: {}, cut: [], towns: [], inds: [], stations: [], veh: [], nid: 1,
      del: {}, gd: {}, fin: { inc: 0, run: 0, mnt: 0, bld: 0, veh: 0 }, finY: null, goals: [], deadline: 0, par: 0, won: false, lost: false, wonDay: -1, moves: 0, nv: 1, rs: (seed ^ 0x5bd1e995) >>> 0, speed: 1 };
  }
  function fill(s, m) {
    s.towns = m.towns.map((t) => ({ id: t.id, name: t.name, x: t.x, y: t.y, pop: t.pop, an: t.an, houses: t.houses.slice(), gm: 0, pm: 0, lg: 0 }));
    s.inds = m.inds.map((d) => ({ id: d.id, type: d.type, x: d.x, y: d.y, stock: 0, acc: 0, made: 0, got: 0, lm: 0 }));
  }
  function newLevel(level, rnd) {
    const seed = Math.floor((rnd || Math.random)() * 2147483647);
    return levelFromSeed(level, seed);
  }
  function levelFromSeed(level, seed) {
    const s = blank('level', seed), c = config(level);
    s.level = level;
    const m = baseMap(s);
    fill(s, m);
    s.money = s.m0 = c.money; s.deadline = c.days; s.par = c.par;
    s.goals = LV[c.base].goals(m).map((g) => (g.n && g.k !== 'train' && g.k !== 'pop' ? Object.assign(g, { n: Math.round(g.n * c.k) }) : g));
    world(s);
    return s;
  }
  // Libera: mappa scelta dal giocatore (seme, taglia, acqua), senza obiettivi e senza scadenza
  function newFree(o) {
    const size = [32, 48, 64].includes(o && o.size) ? o.size : 32, water = Math.max(0, Math.min(2, (o && o.water) | 0));
    const seed = ((o && o.seed) >>> 0) || 1;
    const s = blank('free', seed);
    s.opts = { size, water };
    fill(s, baseMap(s));
    s.money = s.m0 = 60000;
    world(s);
    return s;
  }
  function restore(json) {
    const s = typeof json === 'string' ? JSON.parse(json) : JSON.parse(JSON.stringify(json));
    if (!s || s.v !== 1) return null;
    world(s);
    return s;
  }

  /* ---------- obiettivi ---------- */
  function goalCur(s, g) {
    if (g.k === 'del') return g.ind != null ? s.gd[g.c + '@i' + g.ind] || 0 : g.town != null ? s.gd[g.c + '@t' + g.town] || 0 : s.del[g.c] || 0;
    if (g.k === 'train') return s.veh.filter(S.isTrain).length;
    if (g.k === 'pop') return s.towns[g.town].pop;
    return 0;
  }
  const goalState = (s) => s.goals.map((g) => { const cur = goalCur(s, g); return Object.assign({}, g, { cur, done: cur >= g.n }); });
  function checkEnd(s, ev) {
    if (s.mode !== 'level' || s.won || s.lost) return;
    if (s.goals.length && goalState(s).every((g) => g.done)) { s.won = true; s.wonDay = s.day; ev.push({ k: 'win' }); }
    else if (s.day >= s.deadline) { s.lost = true; ev.push({ k: 'lose' }); }
  }
  const isOver = (s) => s.won || s.lost;

  /* ---------- simulazione ---------- */
  function step(s, ticks) {
    const W = world(s), ev = [];
    for (let i = 0; i < ticks && !isOver(s); i++) {
      S.tick(s, W, ev);
      if (s.tk === 0) checkEnd(s, ev);
    }
    return ev;
  }

  /* ---------- azioni ---------- */
  const fail = (err) => ({ ok: false, cost: 0, err });
  function spend(s, c) { s.money -= c; s.fin.bld += c; s.moves++; }
  function preview(s, kind, a, b) {
    const W = world(s);
    const r = NET.plan(W, kind, a, b);
    return Object.assign(r, { afford: r.cost <= s.money });
  }
  function build(s, a) {
    const W = world(s), kind = a.kind;
    if (kind !== 'rail' && kind !== 'road') return fail('kind');
    if (!NET.valid(W, kind, a.tiles)) return fail('blocked');
    const c = NET.cost(W, kind, a.tiles);
    if (c > s.money) return fail('money');
    NET.apply(W, kind, a.tiles);
    for (const t of a.tiles) saveTile(s, W, t);
    spend(s, c); bump(s, W);
    return { ok: true, cost: c };
  }
  const nearTown = (s, x, y) => { let b = null, bd = 1e9; for (const t of s.towns) { const d = Math.abs(t.x - x) + Math.abs(t.y - y); if (d < bd) { bd = d; b = t; } } return { t: b, d: bd }; };
  function station(s, a) {
    const W = world(s), kind = a.kind, w = W.w;
    if (kind !== 'rail' && kind !== 'road') return fail('kind');
    const tiles = (a.tiles || [a.tile]).filter((t) => t != null);
    if (!tiles.length || tiles.length > (kind === 'rail' ? 5 : 1)) return fail('size');
    tiles.sort((p, q) => p - q);
    let ax = a.ax;
    if (tiles.length > 1) {
      ax = tiles[1] - tiles[0] === 1 ? 1 : tiles[1] - tiles[0] === w ? 0 : -1;
      for (let k = 1; k < tiles.length; k++) if (tiles[k] - tiles[k - 1] !== (ax === 1 ? 1 : w)) return fail('line');
    }
    if (ax == null) {
      const m = W[kind][tiles[0]];
      ax = m & 5 ? 0 : m & 10 ? 1 : 1;
    }
    const h0 = W.ht[tiles[0]], other = kind === 'rail' ? 'road' : 'rail';
    for (const t of tiles) {
      if (!(t >= 0 && t < W.n) || W.water[t] || W.use[t] || W.st[t]) return fail('blocked');
      if (W.ht[t] !== h0) return fail('slope');
      if (W[kind][t] & ~AXIS[ax]) return fail('axis');
      if (W[other][t] || W.sig[t] || W.ow[t]) return fail('blocked');
    }
    // unione con una stazione dello stesso tipo in fila sullo stesso asse
    const step1 = ax === 1 ? 1 : w;
    let join = null;
    for (const e of [tiles[0] - step1, tiles[tiles.length - 1] + step1]) {
      if (e < 0 || e >= W.n || (ax === 1 && ((e % w) === w - 1 && e === tiles[0] - 1 && false))) continue;
      if (ax === 1 && Math.floor(e / w) !== Math.floor(tiles[0] / w)) continue;
      const id = W.st[e] - 1;
      if (id >= 0 && s.stations[id] && s.stations[id].kind === kind && s.stations[id].ax === ax && s.stations[id].tiles.length + tiles.length <= 6) join = s.stations[id];
    }
    const c = (kind === 'rail' ? NET.COST.station : NET.COST.stop) * tiles.length + tiles.reduce((x, t) => x + (W.tree[t] === 1 ? NET.COST.tree : 0), 0);
    if (c > s.money) return fail('money');
    let st = join;
    if (!st) {
      const x = tiles[0] % w, y = (tiles[0] / w) | 0, nt = nearTown(s, x, y);
      let ind = null, idist = 1e9;
      for (const d of s.inds) { const dd = Math.abs(d.x + 0.5 - x) + Math.abs(d.y + 0.5 - y); if (dd < idist) { idist = dd; ind = d; } }
      const useInd = ind && idist <= 4 && idist < nt.d;
      const nm = { town: nt.t ? nt.t.id : 0, ind: useInd ? ind.type : null };
      nm.n = 1 + s.stations.filter((o) => o && o.name.town === nm.town && o.name.ind === nm.ind).length;
      st = { id: s.stations.length, kind, ax, name: nm, tiles: [], wait: {}, rate: {}, last: {}, pick: {}, fr: {}, spd: {} };
      s.stations.push(st);
    }
    const all = st.tiles.concat(tiles).sort((p, q) => p - q);
    st.tiles = all;
    for (const t of tiles) { W.st[t] = st.id + 1; W.sax[t] = ax; W.sk[t] = kind === 'rail' ? 1 : 2; W.tree[t] = 0; }
    // banchina continua: collegamenti lungo l'asse tra le caselle della stazione
    if (kind === 'rail' || all.length > 1) for (let k = 1; k < all.length; k++) NET.apply(W, kind, [all[k - 1], all[k]]);
    for (const t of all) saveTile(s, W, t);
    spend(s, c); bump(s, W);
    return { ok: true, cost: c, id: st.id };
  }
  function demolish(s, a) {
    const W = world(s), t = a.tile;
    if (!(t >= 0 && t < W.n)) return fail('blocked');
    if (W.resv[t]) return fail('busy');
    if (s.veh.some((v) => v.t === t || (v.mode === 'load' && s.stations[v.orders[v.oi].st] && s.stations[v.orders[v.oi].st].tiles.includes(t)))) return fail('busy');
    const c = NET.COST.demolish;
    if (c > s.money) return fail('money');
    const opp = NET.opp, w = W.w;
    const clear = (kind, keep) => {
      const m = W[kind][t] & ~keep;
      for (let d = 0; d < 4; d++) if (m & (1 << d)) {
        const j = t + NET.DX[d] + NET.DY[d] * w;
        if (W.troad[j] && kind === 'road' && (W.base.roads[j] & (1 << opp(d)))) continue;
        W[kind][j] &= ~(1 << opp(d)); saveTile(s, W, j);
      }
      W[kind][t] &= keep;
    };
    if (W.st[t]) {
      const st = s.stations[W.st[t] - 1];
      st.tiles = st.tiles.filter((x) => x !== t);
      W.st[t] = 0; W.sax[t] = 0; W.sk[t] = 0;
      if (!st.tiles.length) {
        s.stations[st.id] = null;
        for (const v of s.veh) { v.orders = v.orders.filter((o) => o.st !== st.id); if (v.oi >= v.orders.length) v.oi = 0; if (!v.orders.length) v.mode = 'lost'; }
      }
    } else if (W.sig[t]) W.sig[t] = 0;
    else if (W.ow[t]) W.ow[t] = 0;
    else if (W.rail[t]) clear('rail', 0);
    else if (W.road[t] && W.road[t] !== (W.base.roads[t] || 0)) clear('road', W.base.roads[t] || 0);
    else if (W.tree[t] && !W.use[t]) W.tree[t] = 0;
    else return fail(W.troad[t] ? 'town' : 'empty');
    saveTile(s, W, t);
    spend(s, c); bump(s, W);
    return { ok: true, cost: c };
  }
  function signal(s, a) {
    const W = world(s), t = a.tile;
    if (!(t >= 0 && t < W.n) || !NET.straight(W.rail[t]) || W.st[t] || W.road[t]) return fail('blocked');
    if (W.sig[t]) { W.sig[t] = 0; saveTile(s, W, t); bump(s, W); s.moves++; return { ok: true, cost: 0 }; }
    if (NET.COST.signal > s.money) return fail('money');
    W.sig[t] = 1; saveTile(s, W, t); spend(s, NET.COST.signal); bump(s, W);
    return { ok: true, cost: NET.COST.signal };
  }
  // senso unico: nessuno → avanti (sud o est) → indietro (nord o ovest) → nessuno; oppure a.dir esplicita
  function oneway(s, a) {
    const W = world(s), t = a.tile;
    if (!(t >= 0 && t < W.n) || !NET.straight(W.rail[t]) || W.st[t] || W.road[t]) return fail('blocked');
    const fwd = W.rail[t] === 5 ? 2 : 1;
    let nx;
    if (a.dir != null) nx = a.dir < 0 ? 0 : a.dir + 1;
    else nx = W.ow[t] === 0 ? fwd + 1 : W.ow[t] === fwd + 1 ? NET.opp(fwd) + 1 : 0;
    const c = W.ow[t] === 0 && nx ? NET.COST.oneway : 0;
    if (c > s.money) return fail('money');
    W.ow[t] = nx; saveTile(s, W, t); spend(s, c); bump(s, W);
    return { ok: true, cost: c };
  }
  function checkOrders(s, net, orders) {
    if (!Array.isArray(orders) || orders.length < 2) return 'orders';
    for (const o of orders) { const st = s.stations[o.st]; if (!st || (net === 'rail') !== (st.kind === 'rail')) return 'orders'; }
    return null;
  }
  function vehCost(a) { const T = VT[a.type]; return T.cost + (T.net === 'rail' ? (a.cars || []).length * WAGON.cost : 0); }
  function buy(s, a) {
    const W = world(s), T = VT[a.type];
    if (!T) return fail('type');
    if (T.from && date(s.day).y < T.from + 1) return fail('locked');
    const e = checkOrders(s, T.net, a.orders);
    if (e) return fail(e);
    if (T.net === 'road' && !T.cargo.includes(a.cargo || T.cargo[0])) return fail('cargo');
    if (T.net === 'rail' && (!a.cars || !a.cars.length || a.cars.length > WAGON.max || a.cars.some((c) => !WAGON.cap[c]))) return fail('cars');
    const c = vehCost(a);
    if (c > s.money) return fail('money');
    const st = s.stations[a.orders[0].st];
    const v = { id: s.nid, type: a.type, n: 1 + s.veh.filter((x) => x.type === a.type).length, orders: a.orders.map((o) => ({ st: o.st, full: !!o.full })), oi: 0,
      t: 0, a: 0, b: 0, p: 0.5, pt: [], pe: [], pv: W.ver, trail: [], ahead: [], mode: 'load', wt: 0, ld: {}, profit: 0, last: 0, value: c, born: s.day };
    if (T.net === 'road') v.cargo = a.cargo || T.cargo[0]; else v.cars = a.cars.slice();
    const tiles = st.tiles.slice().sort((p, q) => p - q);
    const b = st.ax === 1 ? 1 : 2;
    v.b = b; v.a = NET.opp(b);
    if (T.net === 'rail') {
      if (tiles.some((t) => W.resv[t])) return fail('busy');
      v.t = tiles[tiles.length - 1]; v.p = 0.85;
      v.trail = tiles.slice().reverse().map((t) => [t, v.a, b]);
      for (const t of tiles) W.resv[t] = v.id;
      S.trimTrail(W, v);
    } else { v.t = tiles[0]; v.p = 0.5; }
    s.nid++;
    s.veh.push(v);
    s.money -= c; s.fin.veh += c; s.moves++;
    for (const k in S.caps(v)) { st.last[k] = s.day; if (!st.pick[k]) { st.pick[k] = 1; st.rate[k] = 0.55; } st.spd[k] = Math.max(st.spd[k] || 0, T.spd); }
    return { ok: true, cost: c, id: v.id };
  }
  function act(s, a) {
    if (!a || isOver(s)) return fail('over');
    switch (a.k) {
      case 'build': return build(s, a);
      case 'station': return station(s, a);
      case 'demolish': return demolish(s, a);
      case 'signal': return signal(s, a);
      case 'oneway': return oneway(s, a);
      case 'buy': return buy(s, a);
      case 'sell': { const v = s.veh.find((x) => x.id === a.id); if (!v) return fail('none'); const back = S.sell(s, world(s), a.id); s.moves++; return { ok: true, cost: -back }; }
      case 'orders': {
        const v = s.veh.find((x) => x.id === a.id);
        if (!v) return fail('none');
        const e = checkOrders(s, VT[v.type].net, a.orders);
        if (e) return fail(e);
        v.orders = a.orders.map((o) => ({ st: o.st, full: !!o.full }));
        if (v.oi >= v.orders.length) v.oi = 0;
        v.pv = -1; if (v.mode === 'lost') v.mode = 'go';
        s.moves++;
        return { ok: true, cost: 0 };
      }
      case 'speed': s.speed = [0, 1, 2, 4].includes(a.v) ? a.v : 1; return { ok: true, cost: 0 };
      default: return fail('action');
    }
  }

  /* ---------- consigli di Hari (tutorial progressivo) ---------- */
  function coach(s) {
    const W = world(s);
    const trains = s.veh.filter(S.isTrain), road = s.veh.filter((v) => !S.isTrain(v));
    if (trains.some((v) => v.mode === 'go' && v.wt > TPD * 8)) return 'ex_c_stuck';
    if (s.money < 300 && !s.veh.length) return 'ex_c_money';
    if (s.mode === 'free') return 'ex_c_free';
    const sts = s.stations.filter(Boolean), rs = sts.filter((x) => x.kind === 'rail'), ro = sts.filter((x) => x.kind === 'road');
    let myRoad = 0, myRail = 0;
    for (const k in s.net) { if (s.net[k][0]) myRail++; if (s.net[k][1] && !W.troad[+k]) myRoad++; }
    const base = config(s.level).base;
    if (base === 1) return !myRoad ? 'ex_c_road' : ro.length < 2 ? 'ex_c_stop' : !road.length ? 'ex_c_bus' : 'ex_c_run';
    if (base === 2) return ro.length < 2 ? 'ex_c_stop2' : !myRoad ? 'ex_c_road' : !road.length ? 'ex_c_truck' : 'ex_c_full';
    if (base === 3) return ro.length < 2 ? 'ex_c_stop2' : !road.length ? 'ex_c_truck' : road.length < 2 ? 'ex_c_chain' : 'ex_c_run';
    if (base === 4) return rs.length < 2 ? (myRail ? 'ex_c_rail2' : 'ex_c_rail') : !trains.length ? 'ex_c_train' : !road.length ? 'ex_c_chain' : 'ex_c_run';
    const sig = Object.values(s.net).filter((e) => e[2]).length, ow = Object.values(s.net).filter((e) => e[3]).length;
    if (rs.length < 2) return 'ex_c_loop';
    if (!ow) return 'ex_c_oneway';
    if (sig < 2) return 'ex_c_signal';
    if (trains.length < 2) return 'ex_c_train2';
    return 'ex_c_grow';
  }

  /* ---------- stelle, tempo di riferimento, progresso ---------- */
  function rate(s) {
    if (!s || !s.won) return 1;
    let r = s.wonDay <= s.par ? 3 : s.wonDay <= s.par * 1.5 ? 2 : 1;
    if (s.money < s.m0 * 0.25 && r > 1) r--;
    return r;
  }
  const parTime = (s) => Math.round((s && s.par ? s.par : 300) * 0.6 + 90);
  function progress(s) {
    if (!s) return 0;
    if (s.won) return 1;
    if (s.mode === 'free') return Math.min(0.95, (s.veh.length * 2 + s.stations.filter(Boolean).length) / 40);
    const g = goalState(s);
    return g.length ? Math.min(0.99, g.reduce((a, x) => a + Math.min(1, x.cur / x.n), 0) / g.length) : 0;
  }

  // nome di una stazione (parti: villaggio, industria vicina, numero) → la UI traduce l'industria
  const stationName = (s, st, indLabel) => {
    const t = s.towns[st.name.town];
    return (t ? t.name : '?') + (st.name.ind ? ' ' + (indLabel ? indLabel(st.name.ind) : st.name.ind) : '') + (st.name.n > 1 ? ' ' + st.name.n : '');
  };

  HH.express = { LV, LAST, FREE_AT, config, world, newLevel, levelFromSeed, newFree, restore, step, act, preview, goalState, isOver,
    coach, rate, parTime, progress, stationName, vehCost, TPD, date, VT, WAGON, CARGO: S.CARGO, CARGOS: S.CARGOS, COST: NET.COST,
    isWon: (s) => !!(s && s.won) };
})(typeof globalThis !== 'undefined' ? globalThis : window);
