/* Hari Express — logica pura (niente DOM), testabile da Node: stato della partita, livelli e obiettivi, azioni del
 * giocatore (le stesse per UI e bot), salvataggio compatto, stelle e progresso.
 * Moduli caricati prima (stesso HH): express-map.js (mappe), express-net.js (reti e A*), express-sim.js (simulazione).
 *
 * Stato `s` (JSON, è lo snapshot): { v: 2, mv, mode: 'level'|'free', level, seed, opts, h, tk, money, m0, net, cut,
 *   towns, inds, stations, veh, nid, del, gd, fin, finY, goals, deadline, par, won, lost, wonH, moves, rs, speed }.
 * Tempo: h = ore intere dal 1° gennaio a mezzanotte (si parte alle 7: h0), tk = passi nell'ora; deadline (assoluta) e
 * par (dall'inizio) in ore.
 * mv = versione della mappa generata dal seme (1 fino alla 0.32, 2 con l'acqua collegata per i lati).
 * I salvataggi v1 (0.32.x: un "giorno" di 24 passi) si aprono con migrate(): quel giorno è la nostra ora, con gli
 * stessi passi, quindi basta rinominare (day → h, wonDay → wonH) e tenere la mappa di allora (mv 1).
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
  const { TPH, HPD, TPD, VT, WAGON, date } = S;
  const AXIS = NET.AXIS;

  /* ---------- livelli ---------- */
  // site(i) = i-esimo sito del modello di mappa (express-map LEVELS); goal: del (merce consegnata, a un'industria o a
  // un villaggio), train (treni in servizio), pop (abitanti di un villaggio)
  // days = giorni di gioco a disposizione (scadenza), par = ore per le 3 fragoline
  const LV = [null,
    { money: 3000, days: 15, par: 96, goals: (m) => [{ k: 'del', c: 'pax', n: 120 }] },
    { money: 4000, days: 15, par: 144, goals: (m) => [{ k: 'del', c: 'milk', n: 200, ind: m.sites[2].ind }] },
    { money: 8000, days: 22, par: 168, goals: (m) => [{ k: 'del', c: 'milk', n: 150, ind: m.sites[2].ind }, { k: 'del', c: 'cheese', n: 100, town: m.sites[3].town }] },
    { money: 17000, days: 22, par: 264, goals: (m) => [{ k: 'del', c: 'grain', n: 400, ind: m.sites[2].ind }, { k: 'train', n: 1 }, { k: 'del', c: 'bread', n: 100, town: m.sites[3].town }] },
    { money: 30000, days: 30, par: 384, goals: (m) => [{ k: 'del', c: 'wood', n: 500, ind: m.sites[2].ind }, { k: 'train', n: 2 }, { k: 'pop', town: m.sites[3].town, n: m.towns[m.sites[3].town].pop + 120 }] },
  ];
  const LAST = LV.length - 1;          // fase 1: livelli 1–5; dal 6 sfide sui modelli 3–5 con obiettivi più grandi
  const FREE_AT = 5;                   // la Libera si sblocca al livello 5 (fase 1)
  function config(level) {
    const base = level <= LAST ? level : 3 + ((level - LAST - 1) % 3);
    const k = level <= LAST ? 1 : 1 + 0.2 * Math.ceil((level - LAST) / 3);
    const L = LV[base];
    return { base, k, money: Math.round(L.money * (level <= LAST ? 1 : 1.15)), days: L.days, hours: L.days * HPD, par: Math.round(L.par * k), map: M.LEVELS[base] };
  }

  /* ---------- mondo (tabelle dense, non salvate) ---------- */
  const cache = new Map();
  function baseMap(s) {
    const mv = s.mv || 1;
    const key = (s.mode === 'free' ? `f:${s.seed}:${s.opts.size}:${s.opts.water}` : `l:${config(s.level).base}:${s.seed}`) + ':' + mv;
    let m = cache.get(key);
    if (!m) {
      m = s.mode === 'free' ? M.generate({ w: s.opts.size, h: s.opts.size, water: s.opts.water, kind: s.opts.water === 0 ? 'land' : 'island', mv }, HH.rng(s.seed))
        : M.scenario(config(s.level).base, s.seed, mv);
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
      st: new Int16Array(n), sax: new Uint8Array(n), sk: new Uint8Array(n), sig: new Uint8Array(n), ow: new Uint8Array(n), resv: new Int32Array(n), tun: new Uint8Array(n),
    };
    for (const k in m.roads) { W.road[+k] = m.roads[k]; W.troad[+k] = 1; }
    for (const t of s.cut) W.tree[t] = 0;
    for (const d of s.inds) for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const i = (d.y + dy) * m.w + d.x + dx; W.use[i] = 2; W.own[i] = d.id; W.tree[i] = 0; }
    for (const tw of s.towns) for (const i of tw.houses) { W.use[i] = 1; W.own[i] = tw.id; W.tree[i] = 0; }
    for (const k in s.net) { const e = s.net[k], i = +k; W.rail[i] = e[0]; W.road[i] = e[1]; W.sig[i] = e[2]; W.ow[i] = e[3]; if (e[4]) W.tun[i] = 1; }
    for (const st of s.stations) if (st) for (const t of st.tiles) { W.st[t] = st.id + 1; W.sax[t] = st.ax; W.sk[t] = st.kind === 'rail' ? 1 : 2; }
    for (const v of s.veh) if (S.isTrain(v)) { for (const e of v.trail) W.resv[e[0]] = v.id; for (const t of v.ahead) W.resv[t] = v.id; }
    Object.defineProperty(s, '_w', { value: W, enumerable: false, configurable: true, writable: true });
    return W;
  }
  function saveTile(s, W, i) {
    const base = W.base.roads[i] || 0;
    // quinto valore solo per le caselle dentro una galleria (i salvataggi di prima ne hanno quattro)
    if (W.tun[i] && (W.rail[i] || W.road[i])) s.net[i] = [W.rail[i], W.road[i], W.sig[i], W.ow[i], 1];
    else if (W.rail[i] || W.road[i] !== base || W.sig[i] || W.ow[i]) { W.tun[i] = 0; s.net[i] = [W.rail[i], W.road[i], W.sig[i], W.ow[i]]; }
    else { W.tun[i] = 0; delete s.net[i]; }
    if (W.base.tree[i] && !W.tree[i] && !W.use[i] && !s.cut.includes(i)) s.cut.push(i);
  }
  const bump = (s, W) => { s.nv = (s.nv || 1) + 1; W.ver = s.nv; W.covDirty = true; };

  /* ---------- nuove partite ---------- */
  function blank(mode, seed) {
    return { v: SNAP_V, mv: M.MV, mode, level: 1, seed, opts: null, h: H0, h0: H0, tk: 0, money: 0, m0: 0, net: {}, cut: [], towns: [], inds: [], stations: [], veh: [], nid: 1,
      del: {}, gd: {}, fin: { inc: 0, run: 0, mnt: 0, bld: 0, veh: 0 }, finY: null, goals: [], deadline: 0, par: 0, won: false, lost: false, wonH: -1, moves: 0, nv: 1, rs: (seed ^ 0x5bd1e995) >>> 0, speed: 1 };
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
    s.money = s.m0 = c.money; s.deadline = s.h0 + c.hours; s.par = c.par;
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
  // salvataggio v1 (0.32.x) → v2: il "giorno" di allora (24 passi) è l'ora di adesso, quindi tempi, scadenze, par,
  // carichi (ora di carico) e passaggi nelle stazioni restano numericamente uguali; la mappa resta quella di allora
  const SNAP_V = 2;
  const H0 = 7;                        // una partita nuova parte alle 7 del mattino del 1° gennaio
  function migrate(s) {
    if (s.v === 1) {
      s.h = s.day | 0; delete s.day;
      s.wonH = s.wonDay == null ? -1 : s.wonDay; delete s.wonDay;
      delete s.tod;
      s.mv = 1; s.h0 = 0;
      s.v = 2;
    }
    return s.v === SNAP_V ? s : null;
  }
  function restore(json) {
    let s = typeof json === 'string' ? JSON.parse(json) : JSON.parse(JSON.stringify(json));
    if (!s || !(s = migrate(s))) return null;
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
    if (s.goals.length && goalState(s).every((g) => g.done)) { s.won = true; s.wonH = s.h; ev.push({ k: 'win' }); }
    else if (s.h >= s.deadline) { s.lost = true; ev.push({ k: 'lose' }); }
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
  // stroke = caselle sotto il dito (facoltativo): il percorso segue il dito; plat = banchina da aggiungere a una
  // stazione accanto (platformOffer), se c'è
  function preview(s, kind, a, b, stroke) {
    const W = world(s);
    const r = NET.propose(W, kind, a, b, stroke);
    for (const p of [r, r.alt]) if (p) { p.afford = p.cost <= s.money; if (p.ok) p.plat = platformOffer(s, kind, p.tiles); }
    return Object.assign(r, { afford: r.cost <= s.money });
  }
  function build(s, a) {
    const W = world(s), kind = a.kind;
    if (kind !== 'rail' && kind !== 'road') return fail('kind');
    const tn = a.tn || [];
    if (!NET.valid(W, kind, a.tiles, tn)) return fail('blocked');
    const c = NET.cost(W, kind, a.tiles, tn);
    if (c > s.money) return fail('money');
    NET.apply(W, kind, a.tiles, tn);
    for (const t of a.tiles) saveTile(s, W, t);
    spend(s, c); bump(s, W);
    return { ok: true, cost: c };
  }
  const nearTown = (s, x, y) => { let b = null, bd = 1e9; for (const t of s.towns) { const d = Math.abs(t.x - x) + Math.abs(t.y - y); if (d < bd) { bd = d; b = t; } } return { t: b, d: bd }; };
  /* ---------- stazioni: unione, binari paralleli, allargamento ----------
   * Una stazione è un insieme di caselle dello stesso tipo e dello stesso asse: in fila (più lunga) o una accanto
   * all'altra (più binari / più corsie). Una casella nuova che tocca per un lato una stazione dello stesso tipo e asse
   * si unisce a lei (stesso nome, stesse merci e valutazioni), pagando il costo normale. Limiti: ST_LEN caselle in
   * lunghezza, ST_PL binari affiancati. platforms(st) = le banchine (file di caselle consecutive lungo l'asse). */
  const ST_LEN = 6, ST_PL = 4;
  const along = (t, ax, w) => (ax === 1 ? t % w : (t / w) | 0), across = (t, ax, w) => (ax === 1 ? (t / w) | 0 : t % w);
  function extent(tiles, ax, w) {
    let a0 = 1e9, a1 = -1, c0 = 1e9, c1 = -1;
    for (const t of tiles) { const a = along(t, ax, w), c = across(t, ax, w); a0 = Math.min(a0, a); a1 = Math.max(a1, a); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    return { len: a1 - a0 + 1, pl: c1 - c0 + 1 };
  }
  function platforms(s, st) {
    const w = world(s).w, rows = new Map();
    for (const t of st.tiles) { const c = across(t, st.ax, w); if (!rows.has(c)) rows.set(c, []); rows.get(c).push(t); }
    const out = [];
    for (const c of [...rows.keys()].sort((p, q) => p - q)) {
      const r = rows.get(c).sort((p, q) => p - q);
      let cur = [r[0]];
      for (let k = 1; k < r.length; k++) { if (along(r[k], st.ax, w) === along(r[k - 1], st.ax, w) + 1) cur.push(r[k]); else { out.push(cur); cur = [r[k]]; } }
      out.push(cur);
    }
    return out;
  }
  // controllo (senza costruire): → { ok, err, tiles, ax, join (stazione a cui si unisce o null), cost }
  function stationCheck(s, a) {
    const W = world(s), kind = a.kind, w = W.w;
    if (kind !== 'rail' && kind !== 'road') return fail('kind');
    const tiles = (a.tiles || [a.tile]).filter((t) => t != null);
    if (!tiles.length || tiles.length > (kind === 'rail' ? ST_LEN : 1)) return fail('size');
    for (const t of tiles) if (!(t >= 0 && t < W.n)) return fail('blocked');
    tiles.sort((p, q) => p - q);
    let ax = a.ax;
    if (tiles.length > 1) {
      ax = tiles[1] - tiles[0] === 1 ? 1 : tiles[1] - tiles[0] === w ? 0 : -1;
      for (let k = 1; k < tiles.length; k++) if (tiles[k] - tiles[k - 1] !== (ax === 1 ? 1 : w)) return fail('line');
    }
    // stazioni dello stesso tipo che toccano le caselle nuove per un lato
    const near = [];
    for (const t of tiles) for (let d = 0; d < 4; d++) {
      const x = (t % w) + NET.DX[d], y = ((t / w) | 0) + NET.DY[d];
      if (x < 0 || y < 0 || x >= w || y >= W.h) continue;
      const o = s.stations[W.st[y * w + x] - 1];
      if (o && o.kind === kind && !near.includes(o)) near.push(o);
    }
    const want = a.join != null ? s.stations[a.join] : null;
    if (a.join != null && (!want || !near.includes(want))) return fail('far');
    if (ax == null) {
      const m = W[kind][tiles[0]];
      ax = m & 5 ? 0 : m & 10 ? 1 : want ? want.ax : near.length ? near[0].ax : 1;
    }
    const h0 = W.ht[tiles[0]], other = kind === 'rail' ? 'road' : 'rail';
    for (const t of tiles) {
      if (W.water[t] || W.use[t] || W.st[t] || W.tun[t]) return fail('blocked');
      if (W.ht[t] !== h0) return fail('slope');
      if (W[kind][t] & ~AXIS[ax]) return fail('axis');
      if (W[other][t] || W.sig[t] || W.ow[t]) return fail('blocked');
    }
    const join = want ? (want.ax === ax ? want : null) : near.find((o) => o.ax === ax) || null;
    if (want && !join) return fail('axis');
    if (join) {
      if (W.ht[join.tiles[0]] !== h0) return fail('slope');
      const e = extent(join.tiles.concat(tiles), ax, w);
      if (e.len > ST_LEN || e.pl > ST_PL) return fail('stmax');
    }
    const c = (kind === 'rail' ? NET.COST.station : NET.COST.stop) * tiles.length + tiles.reduce((x, t) => x + (W.tree[t] === 1 ? NET.COST.tree : 0), 0);
    return { ok: true, err: null, cost: c, tiles, ax, join };
  }
  function station(s, a) {
    const W = world(s), w = W.w;
    const ck = stationCheck(s, a);
    if (!ck.ok) return ck;
    const { tiles, ax, join, cost: c } = ck, kind = a.kind;
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
    // banchina continua: collegamenti lungo l'asse tra caselle vicine della stazione (non tra binari affiancati)
    const step1 = ax === 1 ? 1 : w, inSt = new Set(all);
    if (kind === 'rail' || all.length > 1) for (const t of all) if (inSt.has(t + step1) && along(t + step1, ax, w) === along(t, ax, w) + 1) NET.apply(W, kind, [t, t + step1]);
    for (const t of all) saveTile(s, W, t);
    spend(s, c); bump(s, W);
    return { ok: true, cost: c, id: st.id, join: !!join };
  }
  // anteprima della stazione (strumento Fermate o "Allarga stazione"): stesso controllo dell'azione
  function stationPlan(s, a) {
    const r = stationCheck(s, a);
    return Object.assign(r, { afford: r.ok && r.cost <= s.money, join: r.join ? r.join.id : null });
  }
  // caselle dove si può allargare la stazione id (una alla volta): [{ t, cost }]
  function expandSpots(s, id) {
    const st = s.stations[id], W = world(s), w = W.w, out = [], seen = new Set();
    if (!st) return out;
    for (const t of st.tiles) for (let d = 0; d < 4; d++) {
      const x = (t % w) + NET.DX[d], y = ((t / w) | 0) + NET.DY[d], j = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= W.h || seen.has(j)) continue;
      seen.add(j);
      const r = stationCheck(s, { kind: st.kind, tiles: [j], ax: st.ax, join: id });
      if (r.ok) out.push({ t: j, cost: r.cost });
    }
    return out.sort((p, q) => p.t - q.t);
  }
  // un binario (o una strada) nuovo che passa dritto accanto a una stazione: le caselle dove aggiungere una banchina
  // (binario di stazione) unita a quella stazione → { st, tiles, cost } o null
  function platformOffer(s, kind, tiles) {
    const W = world(s), w = W.w;
    if (!tiles || tiles.length < 2) return null;
    let best = null;
    for (let k = 0; k < tiles.length; k++) {
      const t = tiles[k];
      if (W.st[t]) continue;
      const dp = k > 0 ? NET.dirTo(W, tiles[k - 1], t) : -1, dn = k < tiles.length - 1 ? NET.dirTo(W, t, tiles[k + 1]) : -1;
      const ds = [dp, dn].filter((d) => d >= 0);
      if (!ds.length || ds.some((d) => (d & 1) !== (ds[0] & 1))) continue;
      const ax = ds[0] & 1;
      for (let d = 0; d < 4; d++) {
        const x = (t % w) + NET.DX[d], y = ((t / w) | 0) + NET.DY[d];
        if (x < 0 || y < 0 || x >= w || y >= W.h) continue;
        const o = s.stations[W.st[y * w + x] - 1];
        if (!o || o.kind !== kind || o.ax !== ax) continue;
        if (best && best.st !== o.id) continue;
        if (W.water[t] || W.use[t] || W.tun[t] || W[kind === 'rail' ? 'road' : 'rail'][t] || W.sig[t] || W.ow[t] || (W[kind][t] & ~AXIS[ax]) || W.ht[t] !== W.ht[o.tiles[0]]) continue;
        if (!best) best = { st: o.id, ax, tiles: [] };
        if (!best.tiles.includes(t)) best.tiles.push(t);
      }
    }
    if (!best) return null;
    // dentro i limiti: si tengono le caselle in ordine finché la stazione non supera lunghezza e binari
    const st = s.stations[best.st], keep = [];
    for (const t of best.tiles) { const e = extent(st.tiles.concat(keep, [t]), best.ax, w); if (e.len <= ST_LEN && e.pl <= ST_PL) keep.push(t); }
    if (!keep.length) return null;
    const per = kind === 'rail' ? NET.COST.station : NET.COST.stop;
    return { st: best.st, ax: best.ax, tiles: keep, cost: keep.reduce((c, t) => c + per + (W.tree[t] === 1 ? NET.COST.tree : 0), 0) };
  }
  function demolish(s, a) {
    const W = world(s), t = a.tile;
    if (!(t >= 0 && t < W.n)) return fail('blocked');
    // occupata: prenotata, o con un mezzo sopra; l'ULTIMA casella di una stazione anche con un mezzo fermo lì a caricare
    // (le altre caselle di una stazione grande si tolgono mentre su un altro binario si carica)
    const busy = (x) => W.resv[x] || s.veh.some((v) => { const o = v.orders[v.oi], st = o && s.stations[o.st]; return v.t === x || (v.trail && v.trail.some((e) => e[0] === x)) || (v.mode === 'load' && st && st.tiles.length === 1 && st.tiles.includes(x)); });
    const opp = NET.opp, w = W.w;
    // ponti e gallerie si tolgono interi: toccandoli, o togliendo la casella di riva o d'imbocco a cui sono attaccati
    const spans = [], here = NET.spanAt(W, t);
    if (here) spans.push(here);
    else if (!W.st[t] && !W.sig[t] && !W.ow[t]) {
      const kind = W.rail[t] ? 'rail' : W.road[t] && W.road[t] !== (W.base.roads[t] || 0) ? 'road' : null;
      if (kind) for (let d = 0; d < 4; d++) if (W[kind][t] & (1 << d)) {
        const x = (t % w) + NET.DX[d], y = ((t / w) | 0) + NET.DY[d];
        if (x < 0 || y < 0 || x >= w || y >= W.h) continue;
        const sp = NET.spanAt(W, y * w + x);
        if (sp && sp.kind === kind) spans.push(sp);
      }
    }
    const gone = new Set([t]);
    for (const sp of spans) for (const x of sp.tiles) gone.add(x);
    for (const x of gone) if (busy(x)) return fail('busy');
    const c = NET.COST.demolish * gone.size;
    if (c > s.money) return fail('money');
    for (const sp of spans) {
      for (const x of sp.tiles) { W[sp.kind][x] = 0; W.tun[x] = 0; saveTile(s, W, x); }
      for (const [e, d] of sp.ends) { W[sp.kind][e] &= ~(1 << d); saveTile(s, W, e); }
    }
    if (here) { spend(s, c); bump(s, W); return { ok: true, cost: c, n: gone.size }; }
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
    return { ok: true, cost: c, n: gone.size };
  }
  function signal(s, a) {
    const W = world(s), t = a.tile;
    if (!(t >= 0 && t < W.n) || !NET.straight(W.rail[t]) || W.st[t] || W.road[t] || W.tun[t]) return fail(W.tun[t] ? 'tunnel' : 'blocked');
    if (W.sig[t]) { W.sig[t] = 0; saveTile(s, W, t); bump(s, W); s.moves++; return { ok: true, cost: 0 }; }
    if (NET.COST.signal > s.money) return fail('money');
    W.sig[t] = 1; saveTile(s, W, t); spend(s, NET.COST.signal); bump(s, W);
    return { ok: true, cost: NET.COST.signal };
  }
  // senso unico: nessuno → avanti (sud o est) → indietro (nord o ovest) → nessuno; oppure a.dir esplicita
  function oneway(s, a) {
    const W = world(s), t = a.tile;
    if (!(t >= 0 && t < W.n) || !NET.straight(W.rail[t]) || W.st[t] || W.road[t] || W.tun[t]) return fail(W.tun[t] ? 'tunnel' : 'blocked');
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
    for (const o of orders) { const st = s.stations[o && o.st]; if (!st || (net === 'rail') !== (st.kind === 'rail')) return 'orders'; }
    return null;
  }
  // un ordine: { st, full } (aspetta il pieno), più nl: 1 (solo scarica: non carica) o nu: 1 (solo carica: non scarica).
  // I modi si escludono; i salvataggi di prima hanno solo { st, full } e restano validi così come sono.
  const MODES = ['both', 'full', 'unload', 'load'];
  const orderMode = (o) => (o.full ? 'full' : o.nl ? 'unload' : o.nu ? 'load' : 'both');
  function normOrder(o) {
    const m = o.mode || orderMode(o), r = { st: o.st, full: m === 'full' };
    if (m === 'unload') r.nl = 1; else if (m === 'load') r.nu = 1;
    return r;
  }
  // tratti del giro (da ogni fermata alla successiva, l'ultima torna alla prima): lunghezza in caselle o -1 se quel
  // mezzo non ci arriva. Si parte da ogni uscita della stazione (anche girandosi), come un mezzo che riparte da lì.
  function legs(s, net, orders) {
    const W = world(s), out = [];
    for (let i = 0; i < orders.length; i++) {
      const a = s.stations[orders[i].st], b = s.stations[orders[(i + 1) % orders.length].st];
      if (!a || !b) { out.push(-1); continue; }
      const starts = [];
      for (const t of a.tiles) for (let d = 0; d < 4; d++) {
        if (!(W[net][t] & (1 << d))) continue;
        const nx = (t % W.w) + NET.DX[d], ny = ((t / W.w) | 0) + NET.DY[d];
        starts.push({ t: ny * W.w + nx, a: NET.opp(d), g: 0, k: d });
      }
      const r = a === b ? { len: 0 } : NET.route(W, net, starts, b.id, b.tiles);
      out.push(r ? r.len : -1);
    }
    return out;
  }
  // nuovo percorso di un mezzo già in servizio. Controlli: almeno 2 fermate, della rete giusta, niente fermata ripetuta
  // subito dopo sé stessa, ogni tratto percorribile da quel mezzo (A*), altrimenti { err: 'unreach', leg }.
  // A metà viaggio: se la meta di adesso c'è ancora il mezzo ci va (o continua a caricare); se è stata tolta va alla
  // fermata successiva del vecchio giro che c'è ancora. Il carico resta a bordo e si scarica dove è accettato.
  function setOrders(s, a) {
    const v = s.veh.find((x) => x.id === a.id);
    if (!v) return fail('none');
    const net = VT[v.type].net;
    const e = checkOrders(s, net, a.orders);
    if (e) return fail(e);
    if (a.orders.length > 12) return fail('orders');
    const orders = a.orders.map(normOrder), n = orders.length;
    for (let i = 0; i < n; i++) if (orders[i].st === orders[(i + 1) % n].st) return fail('orders');
    const lg = legs(s, net, orders), bad = lg.findIndex((x) => x < 0);
    if (bad >= 0) return Object.assign(fail('unreach'), { leg: bad });
    const W = world(s), old = v.orders, cur = old[v.oi];
    let ni = -1;
    if (cur) ni = orders[v.oi] && orders[v.oi].st === cur.st ? v.oi : orders.findIndex((o) => o.st === cur.st);
    const keep = ni >= 0;
    for (let k = 1; !keep && ni < 0 && k <= old.length; k++) { const st = old[(v.oi + k) % old.length].st; ni = orders.findIndex((o) => o.st === st); }
    if (ni < 0) ni = 0;
    v.orders = orders; v.oi = ni;
    if (v.mode === 'load' && !keep) { v.oi = (ni + n - 1) % n; S.depart(s, W, v, []); }
    else if (v.mode !== 'load') { v.pv = -1; if (v.mode === 'lost') v.mode = 'go'; }
    s.moves++;
    return { ok: true, cost: 0 };
  }
  function vehCost(a) { const T = VT[a.type]; return T.cost + (T.net === 'rail' ? (a.cars || []).length * WAGON.cost : 0); }
  function buy(s, a) {
    const W = world(s), T = VT[a.type];
    if (!T) return fail('type');
    if (T.fromH && s.h < T.fromH) return fail('locked');
    const e = checkOrders(s, T.net, a.orders);
    if (e) return fail(e);
    if (T.net === 'road' && !T.cargo.includes(a.cargo || T.cargo[0])) return fail('cargo');
    if (T.net === 'rail' && (!a.cars || !a.cars.length || a.cars.length > WAGON.max || a.cars.some((c) => !WAGON.cap[c]))) return fail('cars');
    const c = vehCost(a);
    if (c > s.money) return fail('money');
    const st = s.stations[a.orders[0].st];
    const v = { id: s.nid, type: a.type, n: 1 + s.veh.filter((x) => x.type === a.type).length, orders: a.orders.map(normOrder), oi: 0,
      t: 0, a: 0, b: 0, p: 0.5, pt: [], pe: [], pv: W.ver, trail: [], ahead: [], mode: 'load', wt: 0, ld: {}, profit: 0, last: 0, value: c, born: s.h };
    if (T.net === 'road') v.cargo = a.cargo || T.cargo[0]; else v.cars = a.cars.slice();
    // treni: sulla prima banchina libera (con più binari ogni treno ha la sua)
    const pls = platforms(s, st), free = T.net === 'rail' ? pls.find((pl) => !pl.some((t) => W.resv[t])) : pls[0];
    const tiles = (free || pls[0]).slice();
    const b = st.ax === 1 ? 1 : 2;
    v.b = b; v.a = NET.opp(b);
    if (T.net === 'rail') {
      if (!free) return fail('busy');
      v.t = tiles[tiles.length - 1]; v.p = 0.85;
      v.trail = tiles.slice().reverse().map((t) => [t, v.a, b]);
      for (const t of tiles) W.resv[t] = v.id;
      S.trimTrail(W, v);
    } else { v.t = tiles[0]; v.p = 0.5; }
    s.nid++;
    s.veh.push(v);
    s.money -= c; s.fin.veh += c; s.moves++;
    for (const k in S.caps(v)) { st.last[k] = s.h; if (!st.pick[k]) { st.pick[k] = 1; st.rate[k] = 0.55; } st.spd[k] = Math.max(st.spd[k] || 0, T.spd); }
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
      case 'orders': return setOrders(s, a);
      case 'speed': s.speed = [0, 1, 2, 4].includes(a.v) ? a.v : 1; return { ok: true, cost: 0 };
      default: return fail('action');
    }
  }

  /* ---------- consigli di Hari (tutorial progressivo) ---------- */
  function coach(s) {
    const W = world(s);
    const trains = s.veh.filter(S.isTrain), road = s.veh.filter((v) => !S.isTrain(v));
    if (trains.some((v) => S.blocked(v))) return 'ex_c_stuck';
    if (s.money < 300 && !s.veh.length) return 'ex_c_money';
    if (s.mode === 'free') {
      // con le colline e qualche pezzo di rete già fatto, Hari ricorda ponti e gallerie (finché non ne fai una)
      let mine = 0, tun = 0;
      for (const k in s.net) { const e = s.net[k]; if (e[4]) tun++; else if (e[0] || (e[1] && !W.troad[+k])) mine++; }
      return mine >= 8 && !tun && W.ht.some((h) => h > 0) ? 'ex_c_tunnel' : 'ex_c_free';
    }
    const sts = s.stations.filter(Boolean), rs = sts.filter((x) => x.kind === 'rail'), ro = sts.filter((x) => x.kind === 'road');
    let myRoad = 0, myRail = 0;
    for (const k in s.net) { if (s.net[k][0]) myRail++; if (s.net[k][1] && !W.troad[+k]) myRoad++; }
    const base = config(s.level).base;
    if (base === 1) return !myRoad ? 'ex_c_road' : ro.length < 2 ? 'ex_c_stop' : !road.length ? 'ex_c_bus' : 'ex_c_run';
    if (base === 2) return ro.length < 2 ? 'ex_c_stop2' : !myRoad ? 'ex_c_road' : !road.length ? 'ex_c_truck' : 'ex_c_full';
    if (base === 3) return ro.length < 2 ? 'ex_c_stop2' : !road.length ? 'ex_c_truck' : road.length < 2 ? 'ex_c_chain' : 'ex_c_run';
    if (base === 4) return rs.length < 2 ? (myRail ? 'ex_c_rail2' : 'ex_c_rail') : !trains.length ? 'ex_c_train' : !road.length ? 'ex_c_bread' : 'ex_c_run';
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
    const t = s.wonH - (s.h0 || 0);
    let r = t <= s.par ? 3 : t <= s.par * 1.5 ? 2 : 1;
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

  HH.express = { LV, LAST, FREE_AT, config, world, newLevel, levelFromSeed, newFree, restore, migrate, SNAP_V, H0, step, act, preview, stationPlan, expandSpots, platformOffer, platforms, ST_LEN, ST_PL, goalState, isOver,
    coach, rate, parTime, progress, stationName, vehCost, legs, orderMode, normOrder, MODES, TPH, HPD, TPD, date, VT, WAGON, CARGO: S.CARGO, CARGOS: S.CARGOS, COST: NET.COST,
    isWon: (s) => !!(s && s.won) };
})(typeof globalThis !== 'undefined' ? globalThis : window);
