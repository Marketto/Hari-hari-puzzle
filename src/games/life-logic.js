/* Hari Home — logica pura della simulazione di vita (nessun DOM, deterministica dato il seme).
 *
 * Stato (JSON puro, salvato così com'è): vedi create(). Tempo in minuti di gioco (s.t), soldi interi (ghiande).
 *   HH.life.create(seed)            nuova vita: Hari a 20 anni in un monolocale decadente con 300 ghiande
 *   HH.life.tick(s, min) -> eventi  avanza la simulazione (bisogni, attività, giorni, bollette, malanni, età)
 *   HH.life.rate(s)                 minuti di gioco per secondo reale (velocità ×1/×2/×3, il sonno accelera ×6)
 *   HH.life.options(s, target)      attività possibili su { hari } · { u } oggetto · { dmg } guasto · { place }
 *   HH.life.start(s, id, opt)       inizia un'attività subito -> { ok, why }; stop(s) la interrompe
 *   HH.life.order(s, id, opt)       comando del giocatore: subito se Hari è libero (o fa da sé), altrimenti in coda (s.queue)
 *   HH.life.cancel(s, i)            annulla l'azione in corso (i < 0) o la i-esima in coda
 *   HH.life.quick(s, need)          azione rapida per un bisogno (tocco sugli indicatori): plan() + order()
 *   HH.life.plan(s, need, auto)     la scelta migliore con quello che c'è in casa -> { id, u?, why? }
 *   libero arbitrio (think, in tick): senza comandi e con un bisogno sotto la soglia D.FREE, Hari sceglie da solo
 *   costruzione: canPlace/buy/move/sell, canWall/buyWall/moveWall, setStyle, expand, repair (= start 'repair')
 *   attività: chooseBiz, upgradeBiz, hire, retire, newGeneration
 *   misure: beauty, age, phase, clock, maxHealth, earnPreview, progress, migrate
 * Eventi restituiti da tick/start: { type: 'need'|'done'|'earn'|'bills'|'sick'|'healed'|'faint'|'friend'|'goal'|'day'|'phase'|'retire'
 *   |'auto' (Hari fa da sé: id, k) |'hint' (non può: k = nofood|nowash) |'qfail' (comando in coda non riuscito: id, why) , … }
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const D = HH.lifeData;
  const { ITEMS, HOMES, DAMAGES, FOODS, ACTS, BIZ, FRIENDS, GOALS, DAY } = D;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const NEEDS = ['mood', 'health', 'energy', 'food', 'hygiene', 'fun', 'social', 'stress'];

  /* ---------- casuale deterministico salvato nello stato (mulberry32) ---------- */
  function rnd(s) {
    s.rs = (s.rs + 0x6d2b79f5) >>> 0;
    let t = s.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* ---------- nuova vita ---------- */
  function create(seed = 1) {
    seed = (seed >>> 0) || 1;
    const t = 8 * 60;
    const s = {
      v: D.SAVE_V, seed, rs: seed, t, born: t, gen: 1, speed: 1, moves: 0,
      money: D.START_MONEY, debt: 0,
      needs: { mood: 0.5, health: 0.85, energy: 0.8, food: 0.6, hygiene: 0.55, fun: 0.45, social: 0.4, stress: 0.45 },
      sick: null, sickDays: 0, checkup: null,
      hx: 2, hy: 3, act: null, away: null,
      home: {
        tier: 0, floor: 'worn', wall: 'peel', ver: 1,
        items: [
          { u: 1, id: 'bed0', x: 0, y: 0, r: 0 },
          { u: 2, id: 'fridge0', x: 5, y: 0, r: 0 },
          { u: 3, id: 'tv0', x: 3, y: 0, r: 0 },
          { u: 4, id: 'shower0', x: 0, y: 3, r: 1 },
          { u: 5, id: 'table0', x: 4, y: 3, r: 0 },
        ],
        walls: [],
        dmg: Object.keys(DAMAGES),
        paid: {},
      },
      fridge: [3, 0, 0],
      biz: null,
      friends: [],
      goals: {},
      stats: { workouts: 0, meals: 0, shifts: 0, repairs: 0, visits: 0, cafes: 0, checkups: 0, earned: 0 },
      warn: {}, retired: false, worked: false, nu: 10, phase: 0,
      queue: [], free: true, calm: 0, tips: {},
    };
    return s;
  }

  /* ---------- tempo ed età ---------- */
  const age = (s) => D.START_AGE + (s.t - s.born) / (DAY * D.YEAR_DAYS);
  function phase(s) { const a = age(s); let p = 0; D.PHASES.forEach((x, i) => { if (a >= x) p = i; }); return p; }
  function clock(s) {
    const day = Math.floor(s.t / DAY), m = s.t - day * DAY;
    return { day: day + 1, hour: Math.floor(m / 60), min: Math.floor(m % 60), mod: m, season: Math.floor(day / 2) % 4, year: Math.floor(day / D.YEAR_DAYS) + 1 };
  }
  // luce del giorno 0 (notte) .. 1 (mezzogiorno), con alba 5–8 e tramonto 18–21
  function daylight(s) {
    const h = (s.t % DAY) / 60;
    if (h < 5 || h >= 21) return 0;
    if (h < 8) return (h - 5) / 3;
    if (h >= 18) return (21 - h) / 3;
    return 1;
  }
  const sleeping = (s) => !!s.act && (s.act.id === 'sleep' || s.act.id === 'nap' || s.act.id === 'faint');
  const rate = (s) => D.MIN_PER_SEC * (s.speed || 1) * (sleeping(s) ? D.SLEEP_FAST : 1);

  /* ---------- casa: ingombri, caselle, percorsi ---------- */
  const dims = (s) => HOMES[s.home.tier];
  function foot(it) {
    const I = ITEMS[it.id];
    return it.r ? { w: I.d, d: I.w } : { w: I.w, d: I.d };
  }
  const door = (s) => ({ x: 0, y: dims(s).r - 1 });
  function grid(s, ignoreU) {
    const { c, r } = dims(s), g = new Uint8Array(c * r);
    for (const it of s.home.items) {
      if (it.u === ignoreU || ITEMS[it.id].flat) continue;
      const f = foot(it);
      for (let x = it.x; x < it.x + f.w; x++) for (let y = it.y; y < it.y + f.d; y++) if (x < c && y < r) g[y * c + x] = 1;
    }
    return g;
  }
  // distanze BFS dalle caselle libere (4 direzioni)
  function bfs(s, g, sx, sy) {
    const { c, r } = dims(s), dist = new Int16Array(c * r).fill(-1), par = new Int16Array(c * r).fill(-1), q = [sy * c + sx];
    dist[sy * c + sx] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % c, y = (i / c) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= c || ny >= r) continue;
        const j = ny * c + nx;
        if (g[j] || dist[j] >= 0) continue;
        dist[j] = dist[i] + 1; par[j] = i; q.push(j);
      }
    }
    return { dist, par };
  }
  function from(s) { return s.away ? door(s) : { x: s.hx, y: s.hy }; }
  function path(s, a, b) {
    const { c } = dims(s), g = grid(s);
    g[a.y * c + a.x] = 0;
    const { dist, par } = bfs(s, g, a.x, a.y);
    let i = b.y * c + b.x;
    if (dist[i] < 0) return [a];
    const out = [];
    while (i >= 0) { out.push({ x: i % c, y: (i / c) | 0 }); i = par[i]; }
    return out.reverse();
  }
  // casella libera raggiungibile accanto all'oggetto (prima il lato "davanti")
  function access(s, it, g0) {
    const { c, r } = dims(s), f = foot(it), g = g0 || grid(s), st = from(s);
    g[st.y * c + st.x] = 0;
    const { dist } = bfs(s, g, st.x, st.y);
    const front = [], side = [];
    for (let x = it.x; x < it.x + f.w; x++) { (it.r ? side : front).push([x, it.y + f.d]); side.push([x, it.y - 1]); }
    for (let y = it.y; y < it.y + f.d; y++) { (it.r ? front : side).push([it.x + f.w, y]); side.push([it.x - 1, y]); }
    for (const [x, y] of front.concat(side)) if (x >= 0 && y >= 0 && x < c && y < r && dist[y * c + x] >= 0) return { x, y };
    return null;
  }
  // casella libera raggiungibile più vicina a (tx, ty) — per i guasti
  function near(s, tx, ty) {
    const { c, r } = dims(s), g = grid(s), st = from(s);
    g[st.y * c + st.x] = 0;
    const { dist } = bfs(s, g, st.x, st.y);
    let best = null, bd = 1e9;
    for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) {
      if (dist[y * c + x] < 0) continue;
      const d = Math.abs(x - tx) + Math.abs(y - ty) * 1.01;
      if (d < bd) { bd = d; best = { x, y }; }
    }
    return best;
  }
  function dmgTile(s, id) {
    const a = DAMAGES[id].at, { c, r } = dims(s);
    if (a[0] === 'L') return { x: 0, y: a[1] };
    if (a[0] === 'R') return { x: a[1], y: 0 };
    if (a[0] === 'F') return { x: a[1], y: a[2] };
    if (a[0] === 'W') return { x: dims(s).win[0][1], y: 0 };
    return { x: Math.floor(c / 2), y: Math.floor(r / 2) };
  }
  const findItem = (s, u) => s.home.items.find((i) => i.u === u) || null;
  const has = (s, k) => s.home.items.filter((i) => ITEMS[i.id].k === k);
  function best(s, k) {
    let b = null;
    for (const it of has(s, k)) if (!b || ITEMS[it.id].t > ITEMS[b.id].t) b = it;
    return b;
  }
  const fridgeCap = (s) => has(s, 'fridge').reduce((m, it) => Math.max(m, ITEMS[it.id].cap), 0);
  const stock = (s) => s.fridge[0] + s.fridge[1] + s.fridge[2];
  // tutti gli oggetti restano raggiungibili dalla porta? (dopo un posizionamento ipotetico)
  function allReachable(s, g) {
    const { c } = dims(s), dr = door(s);
    if (g[dr.y * c + dr.x]) return false;
    const { dist } = bfs(s, g, dr.x, dr.y);
    const ok = (x, y) => x >= 0 && y >= 0 && x < c && y < dims(s).r && dist[y * c + x] >= 0;
    for (const it of s.home.items) {
      if (ITEMS[it.id].flat) continue;
      const f = foot(it);
      let any = false;
      for (let x = it.x; x < it.x + f.w && !any; x++) any = ok(x, it.y + f.d) || ok(x, it.y - 1);
      for (let y = it.y; y < it.y + f.d && !any; y++) any = ok(it.x + f.w, y) || ok(it.x - 1, y);
      if (!any) return false;
    }
    // e i guasti sul pavimento restano raggiungibili
    for (const id of s.home.dmg) { const a = DAMAGES[id].at; if (a[0] === 'F' && !ok(a[1], a[2])) return false; }
    return true;
  }

  /* ---------- bellezza della casa 0..1 ---------- */
  const bcache = new WeakMap();
  function beauty(s) {
    const h = s.home, key = `${h.ver}|${h.tier}|${h.floor}|${h.wall}|${h.dmg.length}|${h.items.length}|${h.walls.length}`;
    const c = bcache.get(s);
    if (c && c.key === key) return c.v;
    let raw = D.FLOORS[h.floor].b + D.WALLS[h.wall].b - 1.25 * h.dmg.length;
    const seen = {};
    for (const it of h.items.concat(h.walls)) {
      const I = ITEMS[it.id], n = seen[I.k] = (seen[I.k] || 0) + 1;
      raw += I.b > 0 ? I.b * Math.pow(0.6, n - 1) : I.b;
    }
    const { c: cc, r } = HOMES[h.tier];
    const v = clamp((raw + 3) / (10 + cc * r * 0.6));
    bcache.set(s, { key, v });
    return v;
  }
  const touch = (s) => { s.home.ver = (s.home.ver || 0) + 1; };

  /* ---------- salute ---------- */
  function maxHealth(s) {
    const a = age(s);
    let m = a < 50 ? 1 : 1 - Math.min(0.32, (a - 50) * 0.012);
    if (s.checkup != null && s.t - s.checkup < DAY * 10) m += 0.08;
    return clamp(m, 0.5, 1);
  }
  const lack = (v) => (v >= 0.35 ? 0 : (0.35 - v) / 0.35);

  /* ---------- soldi ---------- */
  function gain(s, n) {
    n = Math.round(n);
    if (n <= 0) return 0;
    const back = Math.min(s.debt, n);
    s.debt -= back;
    s.money += n - back;
    return n;
  }
  function pay(s, n) {
    n = Math.round(n);
    if (s.money >= n) { s.money -= n; return true; }
    return false;
  }

  /* ---------- attività ---------- */
  const gigPay = (s) => Math.round(D.GIG * (0.8 + 0.4 * s.needs.mood));
  function earnPreview(s, mood) {
    const b = s.biz;
    if (!b || !b.level) return 0;
    let q = 1;
    if (b.level === 1) { const st = best(s, BIZ.types[b.type]); q = st ? ITEMS[st.id].q || 1 : 0; }
    const m = mood == null ? s.needs.mood : mood;
    return Math.round(BIZ.base[b.level] * (0.55 + 0.45 * b.skill) * (0.75 + 0.5 * b.rep) * (0.7 + 0.3 * m) * q);
  }
  function chooseBiz(s, type) {
    if (s.biz || !BIZ.types[type]) return { ok: false, why: 'busy' };
    s.biz = { type, level: 1, skill: 0, rep: 0.2, helpers: 0, shifts: 0 };
    return { ok: true };
  }
  function upgradeBiz(s) {
    const b = s.biz;
    if (!b || b.level >= 4) return { ok: false, why: 'max' };
    const p = BIZ.up[b.level + 1];
    if (!pay(s, p)) return { ok: false, why: 'money' };
    b.level++;
    const ev = [];
    goals(s, ev);
    return { ok: true, ev };
  }
  function hire(s) {
    const b = s.biz;
    if (!b || b.helpers >= BIZ.help[b.level]) return { ok: false, why: 'max' };
    b.helpers++;
    return { ok: true };
  }
  function retire(s) {
    if (s.retired || age(s) < D.RETIRE_AGE) return { ok: false, why: 'young' };
    s.retired = true;
    if (s.act && (s.act.id === 'work' || s.act.id === 'office')) s.act = null;
    return { ok: true };
  }
  function newGeneration(s) {
    if (age(s) < D.GEN_AGE) return { ok: false, why: 'young' };
    s.gen++; s.born = s.t; s.retired = false; s.sick = null; s.sickDays = 0; s.checkup = null; s.phase = 0;
    Object.assign(s.needs, { mood: 0.75, health: 1, energy: 0.85, food: 0.7, hygiene: 0.8, fun: 0.6, social: 0.6, stress: 0.2 });
    if (s.biz) s.biz.skill *= 0.5;
    s.act = null; s.away = null;
    return { ok: true };
  }

  // qualità della funzione dell'oggetto e penalità della casa malandata
  function quality(s, it) {
    let q = it ? ITEMS[it.id].q || 1 : 0.5;
    return q;
  }
  function sleepQ(s, it) {
    let q = it ? ITEMS[it.id].q : 0.5;
    if (s.home.dmg.includes('leak')) q *= 0.9;
    if (s.home.dmg.includes('window')) q *= 0.92;
    return q;
  }

  /* opzioni per un bersaglio: [{ id, ok, why, cost }] */
  function options(s, tg) {
    const out = [], add = (id, why = '', cost = 0, extra) => out.push(Object.assign({ id, ok: !why, why, cost }, extra || {}));
    const busy = s.act && s.act.id === 'faint';
    if (tg.u != null) {
      const it = findItem(s, tg.u);
      if (!it) return out;
      const k = ITEMS[it.id].k, acc = s.away ? true : !!access(s, it);
      const blk = busy ? 'busy' : !acc ? 'blocked' : '';
      if (k === 'bed') add('sleep', blk);
      if (k === 'fridge') add('eat', blk || (stock(s) ? '' : 'nofood'));
      if (k === 'stove' || k === 'oven') add('cook', blk || (stock(s) ? '' : 'nofood'));
      if (k === 'shower') add('shower', blk);
      if (k === 'tub') add('bath', blk);
      if (k === 'sofa') add('relax', blk);
      if (k === 'tv') add('watch', blk);
      if (k === 'books') add('read', blk);
      if (k === 'aquarium') add('fish', blk);
      if (k === 'bike' || k === 'mat') add('workout', blk);
      if (k === 'desk' || k === 'oven' || k === 'bench') {
        const b = s.biz;
        const why = blk || (s.retired ? 'retired' : !b ? 'nobiz' : BIZ.types[b.type] !== k ? 'wrongbiz' : b.level > 1 ? 'office' : '');
        if (!(k === 'oven' && b && b.type !== 'bakery')) add('work', why, 0, { earn: earnPreview(s) });
      }
      return out;
    }
    if (tg.dmg) {
      const id = tg.dmg;
      if (!s.home.dmg.includes(id)) return out;
      const cost = s.home.paid[id] ? 0 : DAMAGES[id].p;
      add('repair', busy ? 'busy' : s.money < cost ? 'money' : '', cost);
      return out;
    }
    if (tg.place) {
      const p = tg.place, b = busy ? 'busy' : '';
      if (p === 'market') add('shop', b || (fridgeCap(s) ? '' : 'nofridge'));
      if (p === 'doctor') add('doctor', b || (s.money < ACTS.doctor.p ? 'money' : ''), ACTS.doctor.p);
      if (p === 'park') add('jog', b);
      if (p === 'gym') add('gym', b || (s.money < ACTS.gym.p ? 'money' : ''), ACTS.gym.p);
      if (p === 'cafe') add('cafe', b || (s.money < ACTS.cafe.p ? 'money' : ''), ACTS.cafe.p);
      if (p === 'office') add('office', b || (s.retired ? 'retired' : !s.biz ? 'nobiz' : s.biz.level < 2 ? 'small' : ''), 0, { earn: earnPreview(s) });
      return out;
    }
    // Hari stesso: tutti i comandi, ognuno con la scelta migliore di casa (dormire, mangiare, lavarsi, svago, amici, lavoro, città)
    if (s.act && !busy) add('stop');
    for (const k of ['energy', 'food', 'hygiene', 'fun', 'social']) {
      const p = plan(s, k);
      add(p.id, busy ? 'busy' : p.why || '', p.id === 'jog' || p.id === 'cafe' ? ACTS[p.id].p || 0 : 0, { u: p.u, k });
    }
    const b = s.biz;
    if (b && b.level >= 2) add('office', busy ? 'busy' : s.retired ? 'retired' : '', 0, { earn: earnPreview(s), k: 'work' });
    else {
      const st = b ? best(s, BIZ.types[b.type]) : null;
      add('work', busy ? 'busy' : s.retired ? 'retired' : !b ? 'nobiz' : !st ? 'nostation' : '', 0, { u: st ? st.u : undefined, earn: st ? earnPreview(s) : 0, k: 'work' });
      if (!st) add('gig', busy ? 'busy' : s.retired ? 'retired' : '', 0, { earn: gigPay(s), k: 'work' });
    }
    add('town', busy ? 'busy' : '', 0, { k: 'town' });
    return out;
  }
  // validità delle attività "su Hari" (telefonare, invitare, pisolino)
  function hariWhy(s, id) {
    if (s.act && s.act.id === 'faint') return 'busy';
    if (id === 'invite') return s.away ? 'away' : !s.friends.length ? 'nofriend' : '';
    if (id === 'gig') return s.retired ? 'retired' : '';
    return '';
  }

  function start(s, id, opt = {}) {
    const A = ACTS[id];
    if (!A) return { ok: false, why: 'none' };
    if (s.act && s.act.id === 'faint' && id !== 'faint') return { ok: false, why: 'busy' };
    let tg;
    if (A.at === 'obj') {
      const it = opt.u != null ? findItem(s, opt.u) : A.kinds.map((k) => best(s, k)).find(Boolean);
      if (!it && id === 'work') return { ok: false, why: !s.biz ? 'nobiz' : 'nostation' };   // messaggio chiaro: manca la postazione
      if (!it || !A.kinds.includes(ITEMS[it.id].k)) return { ok: false, why: 'none' };
      tg = { u: it.u };
    } else if (A.at === 'dmg') tg = { dmg: opt.dmg };
    else if (A.at === 'hari') tg = {};
    else tg = { place: A.at };
    if (id !== 'faint' && A.at === 'hari') {
      const w = hariWhy(s, id);
      if (w) return { ok: false, why: w };
    } else if (id !== 'faint') {
      const o = options(s, tg).find((x) => x.id === id);
      if (!o) return { ok: false, why: 'none' };
      if (!o.ok) return { ok: false, why: o.why };
    }
    // la stessa attività sullo stesso bersaglio continua (niente da ripagare né da rifare)
    const cur = s.act;
    if (cur && cur.id === id && (tg.u == null || cur.u === tg.u) && (!tg.dmg || cur.dmg === tg.dmg) && id !== 'shop') return { ok: true, same: true };
    // l'attività precedente si interrompe (la spesa già pagata arriva comunque in frigo)
    if (s.act) stop(s);
    const act = { id, left: A.dur, total: A.dur };
    if (tg.u != null) {
      const it = findItem(s, tg.u);
      act.u = it.u;
      act.q = id === 'sleep' ? sleepQ(s, it) : quality(s, it);
    }
    if (id === 'nap') act.q = sleepQ(s, null);
    if (id === 'repair') {
      const dm = DAMAGES[opt.dmg];
      if (!s.home.paid[opt.dmg]) { if (!pay(s, dm.p)) return { ok: false, why: 'money' }; s.home.paid[opt.dmg] = 1; }
      act.dmg = opt.dmg; act.left = act.total = dm.m;
    }
    if (id === 'shop') {
      const buy = (opt.buy || [0, 0, 0]).map((n) => Math.max(0, n | 0));
      const n = buy[0] + buy[1] + buy[2], cost = buy.reduce((a, k, q) => a + k * FOODS[q].p, 0);
      if (!n) return { ok: false, why: 'none' };
      if (stock(s) + n > fridgeCap(s)) return { ok: false, why: 'full' };
      if (!pay(s, cost)) return { ok: false, why: 'money' };
      act.buy = buy;
    }
    if (A.p && id !== 'faint') { if (!pay(s, A.p)) return { ok: false, why: 'money' }; }
    if (id === 'call' || id === 'invite') {
      if (s.friends.length) {
        let fi = opt.f != null ? opt.f : 0;
        if (fi < 0 || fi >= s.friends.length) fi = 0;
        act.f = fi;
      } else act.f = -1;
      if (id === 'invite' && act.f < 0) return { ok: false, why: 'nofriend' };
    }
    // al caffè si chiacchiera con un amico (se ce ne sono), e a volte se ne conosce uno nuovo a metà
    if (id === 'cafe') act.f = s.friends.length && rnd(s) < 0.65 ? Math.floor(rnd(s) * s.friends.length) : -1;
    if (id === 'eat' || id === 'cook') {
      const q = [2, 1, 0].find((k) => s.fridge[k] > 0);
      if (q == null) return { ok: false, why: 'nofood' };
      act.food = q;
      s.fridge[q]--;
    }
    // dove sta Hari
    if (A.at === 'obj') {
      const it = findItem(s, act.u);
      if (s.away) comeHome(s);
      const a = access(s, it);
      if (!a) return { ok: false, why: 'blocked' };
      s.hx = a.x; s.hy = a.y;
    } else if (A.at === 'dmg') {
      if (s.away) comeHome(s);
      const tt = dmgTile(s, act.dmg), a = near(s, tt.x, tt.y);
      if (a) { s.hx = a.x; s.hy = a.y; }
    } else if (A.at !== 'hari') {
      s.away = A.at;
    }
    s.act = act;
    s.moves++;
    return { ok: true };
  }
  function stop(s) {
    if (!s.act || s.act.id === 'faint') return false;
    // si torna a casa a metà commissione; il cibo comprato arriva comunque in frigo
    if (s.act.buy) addFood(s, s.act.buy);
    s.act = null;
    if (s.away) comeHome(s);
    return true;
  }
  // rientro: Hari entra dalla porta e cammina fino al centro della stanza (la grafica lo fa camminare dalla porta)
  function comeHome(s) {
    s.away = null;
    const d = door(s), g = grid(s);
    const { c, r } = dims(s);
    if (!g[d.y * c + d.x]) { s.hx = d.x; s.hy = d.y; } else { const n = near(s, d.x, d.y); if (n) { s.hx = n.x; s.hy = n.y; } }
    const m = near(s, Math.floor(c / 2), Math.floor(r / 2));
    if (m) { s.hx = m.x; s.hy = m.y; }
  }
  // quando non ha niente da fare Hari gironzola per casa (mai fermo a lungo nello stesso punto)
  function stroll(s) {
    const { c, r } = dims(s);
    const n = near(s, Math.floor(rnd(s) * c), Math.floor(rnd(s) * r));
    if (n && (n.x !== s.hx || n.y !== s.hy)) { s.hx = n.x; s.hy = n.y; return true; }
    return false;
  }
  function addFood(s, buy) { buy.forEach((n, q) => { s.fridge[q] += n; }); }
  function walk(s, x, y) {
    if (s.away || (s.act && s.act.id === 'faint')) return false;
    s.queue = []; s.calm = s.t + D.FREE.CALM;
    const { c, r } = dims(s);
    if (x < 0 || y < 0 || x >= c || y >= r) return false;
    const g = grid(s);
    g[s.hy * c + s.hx] = 0;
    if (g[y * c + x]) return false;
    const { dist } = bfs(s, g, s.hx, s.hy);
    if (dist[y * c + x] < 0) return false;
    if (s.act) stop(s);
    s.hx = x; s.hy = y;
    return true;
  }

  /* fine attività */
  function finish(s, ev) {
    const a = s.act, n = s.needs;
    s.act = null;
    switch (a.id) {
      case 'eat': {
        const F = FOODS[a.food], tb = has(s, 'table').length ? 0.06 : 0;
        n.food += F.n + tb; n.fun += F.j; n.mood += F.j * 0.5;
        break;
      }
      case 'cook': {
        const F = FOODS[a.food];
        n.food += F.n + (a.q || 0) + 0.05; n.fun += F.j + 0.04; n.mood += F.j * 0.6 + 0.03;
        s.stats.meals++;
        break;
      }
      case 'workout': s.stats.workouts++; break;
      case 'gig': {
        const e = gigPay(s);
        gain(s, e);
        s.stats.earned += e;
        s.worked = true;
        break;
      }
      case 'work': case 'office': {
        const b = s.biz;
        const e = earnPreview(s);
        gain(s, e);
        s.stats.earned += e; s.stats.shifts++; b.shifts++;
        b.skill = clamp(b.skill + 0.02 * (1 - b.skill));
        b.rep = clamp(b.rep + (0.01 + 0.025 * (n.mood - 0.45)) * (1 - 0.5 * b.rep));
        s.worked = true;
        ev.push({ type: 'earn', n: e });
        break;
      }
      case 'repair': {
        s.home.dmg = s.home.dmg.filter((d) => d !== a.dmg);
        delete s.home.paid[a.dmg];
        s.stats.repairs++;
        touch(s);
        ev.push({ type: 'fixed', dmg: a.dmg });
        break;
      }
      case 'shop': addFood(s, a.buy); break;
      case 'doctor': {
        const was = s.sick;
        s.sick = null; s.sickDays = 0; s.checkup = s.t; s.stats.checkups++;
        n.health = Math.min(maxHealth(s), n.health + 0.3);
        if (was) ev.push({ type: 'healed', sick: was });
        break;
      }
      case 'faint': {
        s.sick = null; s.sickDays = 0; s.checkup = s.t;
        n.health = Math.max(n.health, 0.5); n.energy = Math.max(n.energy, 0.6); n.food = Math.max(n.food, 0.6); n.stress = Math.min(n.stress, 0.4);
        ev.push({ type: 'healed', sick: 'faint' });
        break;
      }
      case 'gym': case 'jog': s.stats.workouts++; break;
      case 'cafe': {
        s.stats.cafes++;
        if (a.f >= 0 && s.friends[a.f]) s.friends[a.f].f = clamp(s.friends[a.f].f + 0.05);
        break;
      }
      case 'call': if (a.f >= 0 && s.friends[a.f]) s.friends[a.f].f = clamp(s.friends[a.f].f + 0.06); break;
      case 'invite': {
        const fr = s.friends[a.f], bt = beauty(s);
        if (fr) fr.f = clamp(fr.f + 0.15);
        n.mood += 0.05 + 0.1 * bt;
        const q = [0, 1, 2].find((k) => s.fridge[k] > 0);
        if (q != null) { s.fridge[q]--; n.fun += 0.05; n.food += 0.1; }
        s.stats.visits++;
        break;
      }
      default: break;
    }
    if (D.ACTS[a.id].at !== 'obj' && D.ACTS[a.id].at !== 'hari' && D.ACTS[a.id].at !== 'dmg') comeHome(s);
    clampNeeds(s);
    ev.push({ type: 'done', id: a.id });
    goals(s, ev);
  }
  function meet(s, ev, a) {
    const k = FRIENDS[s.friends.length];
    s.friends.push({ k, f: 0.3 });
    if (a) { a.nf = s.friends.length - 1; if (a.f == null || a.f < 0) a.f = a.nf; }
    ev.push({ type: 'friend', k });
  }
  function clampNeeds(s) { for (const k of NEEDS) s.needs[k] = clamp(Number.isFinite(s.needs[k]) ? s.needs[k] : 0.5); }

  /* ---------- un passo di simulazione (m minuti, mai a cavallo della mezzanotte) ---------- */
  function step(s, m, ev) {
    const h = m / 60, n = s.needs, a = s.act, A = a ? ACTS[a.id] : null;
    const asleep = sleeping(s), home = !s.away, bt = beauty(s), ag = age(s);
    const d = { food: -0.05, energy: -0.035, hygiene: -0.035, fun: -0.03, social: -0.02, stress: 0, health: 0 };
    if (s.home.dmg.includes('leak') && home) d.hygiene -= 0.01;
    if (A) {
      let mul = 1;
      if (a.id === 'invite') mul = 0.6 + 0.6 * bt;
      if (a.id === 'call' && a.f < 0) mul = 0.6;
      for (const k in A.r) {
        let v = A.r[k];
        if ((a.id === 'sleep' || a.id === 'nap') && k === 'energy') v = 0.035 + (v - 0.035) * (a.q || 1);
        else if (a.q && v > 0 && k !== 'health' && a.id !== 'sleep' && a.id !== 'nap' && a.id !== 'cook') v *= a.q;
        else if (a.q && v < 0 && k === 'stress' && a.id !== 'sleep' && a.id !== 'nap') v *= a.q;
        d[k] += v * mul;
      }
    }
    // stress: vita di città, bisogni trascurati, casa malandata o bella, lavoro, debiti, malanni
    const low = ['food', 'energy', 'hygiene', 'fun', 'social'].filter((k) => n[k] < 0.2).length;
    const content = (n.food + n.energy + n.hygiene + n.fun + n.social) / 5;
    d.stress += (s.retired ? 0.002 : 0.006) + 0.014 * low - (content > 0.55 ? 0.012 : 0);
    if (home) d.stress += 0.0025 * s.home.dmg.length - 0.03 * bt;
    if (a && (a.id === 'work' || a.id === 'office')) d.stress += 0.06 * (1.3 - n.mood * 0.6);
    if (s.debt > 0) d.stress += 0.01;
    if (s.sick) { d.stress += 0.01; d.energy -= 0.015; }
    if (asleep) d.stress -= 0.005;
    // salute: tende a un obiettivo che dipende da cibo, sonno, igiene, stress, casa e età
    const mh = maxHealth(s);
    let ht = mh - 0.45 * lack(n.food) - 0.4 * lack(n.energy) - 0.15 * lack(n.hygiene) - 0.3 * Math.max(0, n.stress - 0.6) / 0.4;
    if (home && s.home.dmg.includes('mold')) ht -= 0.05;
    if (home && s.home.dmg.includes('leak')) ht -= 0.03;
    if (s.sick) ht = Math.min(ht, 0.55) - 0.1;
    ht = clamp(ht, 0.02, mh);
    const frail = 1 + Math.max(0, ag - 50) * 0.025;
    d.health += n.health > ht ? -Math.min(n.health - ht, 0.022 * frail * h) / h : Math.min(ht - n.health, 0.014 * h) / h;
    const prevH = n.health;
    for (const k of ['food', 'energy', 'hygiene', 'fun', 'social', 'stress', 'health']) n[k] += d[k] * h;
    // lo sport fa bene ma non supera il massimo dell'età
    if (n.health > prevH) n.health = Math.min(n.health, Math.max(prevH, mh));
    clampNeeds(s);
    // umore: insegue un obiettivo (bisogni, bellezza della casa, stress, malanni)
    const avg = 0.2 * n.food + 0.18 * n.energy + 0.1 * n.hygiene + 0.17 * n.fun + 0.15 * n.social + 0.2 * n.health;
    let mt = 0.1 + 0.8 * avg + 0.24 * bt * (home ? 1 : 0.6) - 0.38 * n.stress - (s.sick ? 0.12 : 0) - (s.debt > 0 ? 0.08 : 0) + (s.retired ? 0.05 : 0);
    mt = clamp(mt);
    n.mood += clamp(mt - n.mood, -0.3 * h, 0.3 * h);
    clampNeeds(s);
    s.t += m;
    // fine o progresso dell'attività
    if (a) {
      a.left -= m;
      // a metà del caffè (o della corsa al parco) si può fare amicizia: la scena lo mostra mentre succede
      if ((a.id === 'cafe' || a.id === 'jog') && !a.met && a.left <= a.total * 0.5) {
        a.met = 1;
        if (s.friends.length < FRIENDS.length && (a.id === 'cafe' ? s.friends.length === 0 || rnd(s) < 0.45 : rnd(s) < 0.15)) meet(s, ev, a);
      }
      // riposato: si sveglia, ma di notte (21–6) dorme fino al mattino come tutti
      const hr = (s.t % DAY) / 60;
      const full = (a.id === 'sleep' || a.id === 'nap') && n.energy >= 0.985 && hr >= 6 && hr < 21;
      if (a.left <= 0 || full) finish(s, ev);
    }
    // avvisi sui bisogni critici (una volta, finché non si riprendono)
    for (const k of ['food', 'energy', 'hygiene', 'fun', 'social', 'health']) {
      if (n[k] < 0.18 && !s.warn[k]) { s.warn[k] = 1; ev.push({ type: 'need', k }); }
      else if (n[k] > 0.35 && s.warn[k]) delete s.warn[k];
    }
    if (n.stress > 0.82 && !s.warn.stress) { s.warn.stress = 1; ev.push({ type: 'need', k: 'stress' }); }
    else if (n.stress < 0.6 && s.warn.stress) delete s.warn.stress;
    // svenimento gentile: Hari si sente male e il dottore se ne prende cura (mai niente di peggio)
    if (n.health < 0.06 && !(s.act && s.act.id === 'faint')) {
      s.act = null;
      const fee = Math.min(s.money, ACTS.doctor.p);
      s.money -= fee;
      s.act = { id: 'faint', left: ACTS.faint.dur, total: ACTS.faint.dur };
      s.away = 'doctor'; s.queue = [];
      ev.push({ type: 'faint', fee });
    }
    // sfinito: si addormenta da solo (nel letto se c'è)
    if (!s.act && n.energy < 0.04) {
      const r = has(s, 'bed').length ? start(s, 'sleep') : { ok: false };
      if (!r.ok) { s.act = { id: 'nap', left: ACTS.nap.dur, total: ACTS.nap.dur, q: sleepQ(s, null) }; if (s.away) comeHome(s); }
      ev.push({ type: 'auto', id: 'sleep', k: 'energy' });
    }
    // libero: prima i comandi in coda, poi (se serve) ci pensa Hari da solo
    if (!s.act) { next(s, ev); think(s, ev); }
    // i suggerimenti si ripetono solo dopo che il problema si è risolto (isteresi)
    if (s.warn.nofood && stock(s) > 0) delete s.warn.nofood;
    if (s.warn.nowash && (has(s, 'shower').length || has(s, 'tub').length)) delete s.warn.nowash;
  }

  /* ---------- comandi del giocatore e coda delle azioni ---------- */
  const QKEYS = ['u', 'dmg', 'buy', 'f'];
  function order(s, id, opt = {}) {
    const A = ACTS[id];
    if (!A) return { ok: false, why: 'none' };
    if (s.act && s.act.id === 'faint') return { ok: false, why: 'busy' };
    s.calm = 0;
    const cur = s.act;
    // Hari è libero o sta facendo da sé: il comando del giocatore ha la precedenza
    if (!cur || cur.auto) {
      const r = start(s, id, opt);
      if (r.ok && s.act) delete s.act.auto;
      return r.ok ? Object.assign({ now: true }, r) : r;
    }
    if (cur.id === id && (opt.u == null || cur.u === opt.u) && id !== 'shop') return { ok: true, same: true };
    // controllo subito quello che si può controllare (oggetto, soldi, amici), il resto quando tocca a lei
    const w = A.at === 'hari' ? hariWhy(s, id) : A.at === 'obj' ? objWhy(s, id, opt) : A.at === 'dmg' ? (s.home.dmg.includes(opt.dmg) ? '' : 'none') : placeWhy(s, id);
    if (w) return { ok: false, why: w };
    if (s.queue.length >= D.QMAX) return { ok: false, why: 'queue' };
    const q = { id };
    for (const k of QKEYS) if (opt[k] != null) q[k] = Array.isArray(opt[k]) ? opt[k].slice() : opt[k];
    s.queue.push(q);
    return { ok: true, queued: true };
  }
  function objWhy(s, id, opt) {
    const A = ACTS[id];
    const it = opt.u != null ? findItem(s, opt.u) : A.kinds.map((k) => best(s, k)).find(Boolean);
    if (!it || !A.kinds.includes(ITEMS[it.id].k)) return 'none';
    const o = options(s, { u: it.u }).find((x) => x.id === id);
    return !o ? 'none' : o.why === 'nofood' ? '' : o.why;     // il cibo può arrivare con una spesa già in coda
  }
  function placeWhy(s, id) {
    const o = options(s, { place: ACTS[id].at }).find((x) => x.id === id);
    return !o ? 'none' : o.why === 'money' ? '' : o.why;      // i soldi si controllano quando si parte
  }
  function cancel(s, i) {
    const ev = [];
    if (i == null || i < 0) {
      if (!s.act || s.act.id === 'faint') return { ok: false, ev };
      stop(s);
      s.calm = s.t + D.FREE.CALM;
      next(s, ev);
      return { ok: true, ev };
    }
    if (i >= s.queue.length) return { ok: false, ev };
    s.queue.splice(i, 1);
    return { ok: true, ev };
  }
  function next(s, ev) {
    while (!s.act && s.queue.length) {
      const q = s.queue.shift();
      const r = start(s, q.id, q);
      if (!r.ok) ev.push({ type: 'qfail', id: q.id, why: r.why });
    }
  }

  /* ---------- la scelta migliore per un bisogno, con quello che c'è in casa ---------- */
  const FUN = { tv: 'watch', books: 'read', aquarium: 'fish', sofa: 'relax' };
  const FUNR = { watch: 0.36, read: 0.26, fish: 0.2, relax: 0.06 };
  const usable = (s, it, id) => { const o = options(s, { u: it.u }).find((x) => x.id === id); return !!o && (o.ok || o.why === 'nofood'); };
  function plan(s, k, auto) {
    const n = s.needs;
    const obj = (id, kinds) => { for (const kk of kinds) { const it = best(s, kk); if (it && usable(s, it, id)) return { id, u: it.u }; } return null; };
    switch (k) {
      case 'energy': return obj('sleep', ['bed']) || { id: 'nap' };
      case 'food': {
        if (!fridgeCap(s)) return { id: 'eat', why: 'nofridge' };
        if (!stock(s)) return { id: 'eat', why: 'nofood' };
        const c = n.energy > 0.2 && n.food > 0.08 ? obj('cook', ['stove', 'oven']) : null;
        return c || obj('eat', ['fridge']) || { id: 'eat', why: 'blocked' };
      }
      case 'hygiene': {
        const tub = obj('bath', ['tub']), sh = obj('shower', ['shower']);
        return (tub && (n.stress > 0.45 || !sh) ? tub : sh || tub) || { id: 'shower', why: 'nowash' };
      }
      case 'fun': {
        let bestP = null, bv = -1;
        for (const kk in FUN) for (const it of has(s, kk)) {
          const id = FUN[kk];
          if (!usable(s, it, id)) continue;
          const v = FUNR[id] * (ITEMS[it.id].q || 1) + (auto ? rnd(s) * 0.12 : 0);
          if (v > bv) { bv = v; bestP = { id, u: it.u }; }
        }
        return bestP || (auto ? { id: 'watch', why: 'nofun' } : { id: 'jog' });
      }
      case 'social': return s.friends.length && !s.away && !auto ? { id: 'invite' } : s.friends.length && !s.away && rnd(s) < 0.35 ? { id: 'invite' } : { id: 'call' };
      case 'stress': {
        const w = n.energy > 0.3 ? obj('workout', ['bike', 'mat']) : null;
        return w || obj('bath', ['tub']) || obj('relax', ['sofa']) || obj('read', ['books']) || obj('fish', ['aquarium']) || (auto ? { id: 'relax', why: 'nofun' } : { id: 'jog' });
      }
      case 'health': return { id: 'doctor' };
      default: {   // umore: il bisogno più urgente
        let kk = 'fun', lo = 2;
        for (const x of ['energy', 'food', 'hygiene', 'fun', 'social']) if (n[x] < lo) { lo = n[x]; kk = x; }
        if (1 - n.stress < lo) kk = 'stress';
        return plan(s, kk, auto);
      }
    }
  }
  function quick(s, k) {
    const p = plan(s, k);
    if (p.why) return { ok: false, why: p.why, id: p.id };
    const r = order(s, p.id, p.u != null ? { u: p.u } : {});
    return Object.assign({ id: p.id, u: p.u }, r);
  }

  /* ---------- libero arbitrio: Hari si prende cura di sé quando nessuno gli dice cosa fare ---------- */
  function think(s, ev) {
    if (s.free === false || s.act || s.away || s.queue.length || s.t < (s.calm || 0)) return;
    const n = s.needs, F = D.FREE, hr = (s.t % DAY) / 60, night = hr >= 22 || hr < 5;
    const want = [];
    const need = (k, v, T, boost = 0) => { if (v < T) want.push({ k, u: (T - v) / T + boost }); };
    need('energy', n.energy, night ? F.NIGHT : F.T.energy, night ? 0.6 : 0.15);
    need('food', n.food, F.T.food, 0.1);
    need('hygiene', n.hygiene, F.T.hygiene);
    need('fun', n.fun, F.T.fun);
    need('social', n.social, F.T.social);
    need('stress', 1 - n.stress, F.T.stress);
    if (!want.length) {
      // nessun bisogno: ogni tanto due passi per casa (timer a parte, così i bisogni restano controllati di continuo)
      if (s.t >= (s.stroll || 0)) { s.stroll = s.t + 45; if (rnd(s) < 0.6) stroll(s); }
      return;
    }
    for (const w of want) w.u += rnd(s) * 0.15;               // un pizzico di carattere
    want.sort((a, b) => b.u - a.u);
    for (const w of want) {
      const p = plan(s, w.k, true);
      if (p.why) {
        if ((p.why === 'nofood' || p.why === 'nowash') && !s.warn[p.why]) { s.warn[p.why] = 1; ev.push({ type: 'hint', k: p.why }); }
        continue;
      }
      const r = start(s, p.id, p.u != null ? { u: p.u } : {});
      if (r.ok && s.act) { s.act.auto = 1; ev.push({ type: 'auto', id: p.id, k: w.k }); return; }
    }
    if (s.t >= (s.stroll || 0)) { s.stroll = s.t + 45; stroll(s); }
    s.calm = s.t + F.RETRY;                                    // niente da fare per ora: riprova tra un po'
  }

  /* ---------- a mezzanotte ---------- */
  function daily(s, ev) {
    const day = Math.round(s.t / DAY), b = s.biz, n = s.needs;
    if (b && b.level >= 2 && b.helpers) gain(s, b.helpers * BIZ.base[b.level] * 0.4 * (0.75 + 0.5 * b.rep));
    if (s.retired) { const pn = 30 + 20 * (b ? b.level : 0); gain(s, pn); ev.push({ type: 'pension', n: pn }); }
    // rete di sicurezza gentile: senza soldi e col frigo vuoto arriva un pacco di cibo da casa dei genitori
    if (s.money < 20 && stock(s) === 0 && fridgeCap(s) > 0) { s.fridge[0] += 2; ev.push({ type: 'gift' }); }
    if (b && !s.worked && !s.retired) b.rep = clamp(b.rep - 0.012);
    s.worked = false;
    for (const f of s.friends) f.f = Math.max(0.1, f.f - 0.012);
    // malanni: raffreddore, mal di pancia, acciacchi (più probabili con poca salute, tanto stress, inverno e senza check-up dopo i 50)
    if (s.sick) {
      s.sickDays++;
      if (s.sickDays >= 4 && n.health > 0.45) { ev.push({ type: 'healed', sick: s.sick }); s.sick = null; s.sickDays = 0; }
    } else {
      const ag = age(s), season = Math.floor((day) / 2) % 4;
      let p = 0.02 + 0.25 * Math.max(0, 0.5 - n.health) + 0.15 * Math.max(0, n.stress - 0.6) + (season === 3 ? 0.03 : 0);
      if (s.home.dmg.includes('mold') || s.home.dmg.includes('leak')) p += 0.03;
      if (ag >= 50 && (s.checkup == null || s.t - s.checkup > DAY * 12)) p += 0.05 + (ag - 50) * 0.004;
      if (rnd(s) < p) {
        s.sick = ag >= 55 && rnd(s) < 0.5 ? 'achy' : rnd(s) < 0.6 ? 'cold' : 'tummy';
        s.sickDays = 0;
        ev.push({ type: 'sick', sick: s.sick });
      }
    }
    // bollette ogni 7 giorni: affitto, locale dell'attività, aiutanti, luce e acqua
    if (day > 0 && day % 7 === 0) {
      const bill = HOMES[s.home.tier].rent + (b ? BIZ.rent[b.level] + b.helpers * BIZ.salary : 0) + 10;
      const paid = Math.min(s.money, bill);
      s.money -= paid;
      s.debt += bill - paid;
      ev.push({ type: 'bills', n: bill, short: bill - paid });
    }
    const ph = phase(s);
    if (ph !== s.phase) { s.phase = ph; ev.push({ type: 'phase', phase: ph }); }
    if (age(s) >= D.RETIRE_AGE && !s.retired && !s.warn.retire) { s.warn.retire = 1; ev.push({ type: 'retire' }); }
    ev.push({ type: 'day', day: day + 1 });
    goals(s, ev);
  }

  function tick(s, minutes) {
    const ev = [];
    minutes = Math.max(0, Math.min(DAY * 2, +minutes || 0));
    while (minutes > 1e-9) {
      const toMid = DAY - (s.t % DAY);
      const m = Math.min(5, minutes, toMid);
      step(s, m, ev);
      minutes -= m;
      if (Math.abs((s.t % DAY)) < 1e-6 || Math.abs((s.t % DAY) - DAY) < 1e-6) { s.t = Math.round(s.t); daily(s, ev); }
    }
    s.money = Math.max(0, Math.round(s.money));
    return ev;
  }

  /* ---------- traguardi ---------- */
  function goals(s, ev) {
    const g = s.goals, bt = beauty(s), lv = s.biz ? s.biz.level : 0, st = s.stats;
    const check = {
      fix1: st.repairs >= 1, fixall: s.home.dmg.length === 0, friend1: s.friends.length >= 1, friends3: s.friends.length >= 3,
      biz1: st.shifts >= 1, biz2: lv >= 2, biz4: lv >= 4, cozy: bt >= 0.5, dream: bt >= 0.85,
      move: s.home.tier >= 1, house: s.home.tier >= 3,
    };
    for (const k in check) if (check[k] && !g[k]) { g[k] = Math.floor(s.t / DAY) + 1; gain(s, GOALS[k]); ev.push({ type: 'goal', id: k, n: GOALS[k] }); }
  }

  /* ---------- costruzione ---------- */
  function canPlace(s, id, x, y, r, ignoreU) {
    const I = ITEMS[id];
    if (!I || I.wall) return 'none';
    const { c, r: rows } = dims(s), w = r ? I.d : I.w, d = r ? I.w : I.d;
    if (x < 0 || y < 0 || x + w > c || y + d > rows) return 'out';
    const tiles = [];
    for (let i = x; i < x + w; i++) for (let j = y; j < y + d; j++) tiles.push([i, j]);
    if (I.flat) {
      for (const it of s.home.items) {
        if (it.u === ignoreU || !ITEMS[it.id].flat) continue;
        const f = foot(it);
        if (x < it.x + f.w && it.x < x + w && y < it.y + f.d && it.y < y + d) return 'taken';
      }
      return '';
    }
    const g = grid(s, ignoreU);
    for (const [i, j] of tiles) if (g[j * c + i]) return 'taken';
    const dr = door(s);
    for (const [i, j] of tiles) if (i === dr.x && j === dr.y) return 'door';
    for (const dm of s.home.dmg) { const a = DAMAGES[dm].at; if (a[0] === 'F' && tiles.some(([i, j]) => i === a[1] && j === a[2])) return 'damage'; }
    // il nuovo oggetto deve essere raggiungibile, e non deve chiudere gli altri
    const probe = { u: -1, id, x, y, r };
    s.home.items.push(probe);
    const ok = allReachable(s, grid(s, ignoreU));
    s.home.items.pop();
    return ok ? '' : 'blocks';
  }
  function settleHari(s) {
    if (s.away) return;
    const { c } = dims(s), g = grid(s);
    if (g[s.hy * c + s.hx]) {
      const dr = door(s);
      const { dist } = bfs(s, g, dr.x, dr.y);
      let bestT = null, bd = 1e9;
      for (let i = 0; i < dist.length; i++) if (dist[i] >= 0) { const x = i % c, y = (i / c) | 0, dd = Math.abs(x - s.hx) + Math.abs(y - s.hy); if (dd < bd) { bd = dd; bestT = { x, y }; } }
      if (bestT) { s.hx = bestT.x; s.hy = bestT.y; }
    }
    // l'attività in corso su un oggetto spostato/venduto si interrompe
    if (s.act && s.act.u != null && !findItem(s, s.act.u)) s.act = null;
  }
  function buy(s, id, x, y, r) {
    const I = ITEMS[id];
    if (!I || !I.p) return { ok: false, why: 'none' };
    const why = canPlace(s, id, x, y, r);
    if (why) return { ok: false, why };
    if (!pay(s, I.p)) return { ok: false, why: 'money' };
    const it = { u: s.nu++, id, x, y, r: r ? 1 : 0 };
    s.home.items.push(it);
    touch(s); settleHari(s);
    const ev = []; goals(s, ev);
    return { ok: true, u: it.u, ev };
  }
  function move(s, u, x, y, r) {
    const it = findItem(s, u);
    if (!it) return { ok: false, why: 'none' };
    const why = canPlace(s, it.id, x, y, r, u);
    if (why) return { ok: false, why };
    if (s.act && s.act.u === u) s.act = null;
    it.x = x; it.y = y; it.r = r ? 1 : 0;
    touch(s); settleHari(s);
    return { ok: true };
  }
  const refund = (id) => Math.floor((ITEMS[id].p || 0) * 0.5);
  function sell(s, u) {
    let i = s.home.items.findIndex((x) => x.u === u), list = s.home.items;
    if (i < 0) { i = s.home.walls.findIndex((x) => x.u === u); list = s.home.walls; }
    if (i < 0) return { ok: false, why: 'none' };
    const it = list[i];
    list.splice(i, 1);
    gain(s, refund(it.id));
    touch(s); settleHari(s);
    return { ok: true, n: refund(it.id) };
  }
  // muri: lato 'L' (lungo y, lunghezza r) o 'R' (lungo x, lunghezza c); slot occupati da finestre, porta, guasti e quadri
  function wallBusy(s, side, ignoreU) {
    const { c, r, win } = dims(s), len = side === 'L' ? r : c, busy = new Uint8Array(len);
    for (const [sd, i, w] of win) if (sd === side) for (let k = i; k < i + w; k++) busy[k] = 2;
    if (side === 'L') busy[r - 1] = 3;
    for (const dm of s.home.dmg) { const a = DAMAGES[dm].at; if (a[0] === side) busy[a[1]] = 4; }
    for (const it of s.home.walls) if (it.u !== ignoreU && it.side === side) for (let k = it.i; k < it.i + ITEMS[it.id].w; k++) busy[k] = 1;
    return busy;
  }
  function canWall(s, id, side, i, ignoreU) {
    const I = ITEMS[id];
    if (!I || !I.wall || (side !== 'L' && side !== 'R')) return 'none';
    const busy = wallBusy(s, side, ignoreU);
    if (i < 0 || i + I.w > busy.length) return 'out';
    for (let k = i; k < i + I.w; k++) if (busy[k]) return busy[k] === 4 ? 'damage' : 'taken';
    return '';
  }
  function buyWall(s, id, side, i) {
    const I = ITEMS[id];
    if (!I || !I.p) return { ok: false, why: 'none' };
    const why = canWall(s, id, side, i);
    if (why) return { ok: false, why };
    if (!pay(s, I.p)) return { ok: false, why: 'money' };
    const it = { u: s.nu++, id, side, i };
    s.home.walls.push(it);
    touch(s);
    const ev = []; goals(s, ev);
    return { ok: true, u: it.u, ev };
  }
  function moveWall(s, u, side, i) {
    const it = s.home.walls.find((x) => x.u === u);
    if (!it) return { ok: false, why: 'none' };
    const why = canWall(s, it.id, side, i, u);
    if (why) return { ok: false, why };
    it.side = side; it.i = i;
    touch(s);
    return { ok: true };
  }
  const area = (s) => dims(s).c * dims(s).r;
  const stylePrice = (s, kind, id) => Math.ceil(((kind === 'floor' ? D.FLOORS : D.WALLS)[id].p * area(s)) / 36 / 5) * 5;
  function setStyle(s, kind, id) {
    const T = kind === 'floor' ? D.FLOORS : D.WALLS;
    if (!T[id] || !T[id].p) return { ok: false, why: 'none' };
    if (s.home[kind] === id) return { ok: false, why: 'same' };
    if (!pay(s, stylePrice(s, kind, id))) return { ok: false, why: 'money' };
    s.home[kind] = id;
    // carta da parati nuova = niente più carta scollata
    if (kind === 'wall') s.home.dmg = s.home.dmg.filter((d) => d !== 'peel');
    if (kind === 'floor') s.home.dmg = s.home.dmg.filter((d) => d !== 'floor');
    touch(s);
    const ev = []; goals(s, ev);
    return { ok: true, ev };
  }
  function expand(s) {
    const nt = s.home.tier + 1;
    if (nt >= HOMES.length) return { ok: false, why: 'max' };
    if (!pay(s, HOMES[nt].p)) return { ok: false, why: 'money' };
    s.home.tier = nt;
    // quadri finiti sotto una finestra o sulla porta nuova: spostati in uno slot libero, altrimenti rimborsati
    const keep = s.home.walls.slice();
    s.home.walls = [];
    for (const it of keep) {
      let placed = !canWall(s, it.id, it.side, it.i);
      if (!placed) for (const sd of ['L', 'R']) for (let i = 0; i < 12 && !placed; i++) if (!canWall(s, it.id, sd, i)) { it.side = sd; it.i = i; placed = true; }
      if (placed) s.home.walls.push(it); else gain(s, ITEMS[it.id].p);
    }
    touch(s); settleHari(s);
    const ev = []; goals(s, ev);
    return { ok: true, ev };
  }

  /* ---------- salvataggi ---------- */
  function migrate(saved) {
    if (!saved || typeof saved !== 'object' || typeof saved.v !== 'number') return null;
    let s = JSON.parse(JSON.stringify(saved));
    // MIG[v] porta da v a v+1 (per le versioni future dello stato)
    const MIG = {
      1: (o) => { o.queue = []; o.free = true; o.calm = 0; o.tips = {}; o.v = 2; return o; },   // v2: coda, libero arbitrio
    };
    while (s && s.v < D.SAVE_V) s = MIG[s.v] ? MIG[s.v](s) : null;
    if (!s || s.v !== D.SAVE_V) return null;
    if (!Number.isFinite(s.t) || !s.home || !Array.isArray(s.home.items) || !HOMES[s.home.tier]) return null;
    // campi mancanti (aggiunti dopo) presi da una vita nuova; oggetti sconosciuti rimborsati
    const base = create(s.seed || 1);
    for (const k in base) if (s[k] === undefined) s[k] = base[k];
    for (const k in base.needs) if (!Number.isFinite(s.needs[k])) s.needs[k] = base.needs[k];
    for (const k in base.stats) if (!Number.isFinite(s.stats[k])) s.stats[k] = 0;
    for (const k of ['walls', 'dmg']) if (!Array.isArray(s.home[k])) s.home[k] = [];
    if (!s.home.paid) s.home.paid = {};
    if (!D.FLOORS[s.home.floor]) s.home.floor = 'worn';
    if (!D.WALLS[s.home.wall]) s.home.wall = 'peel';
    s.home.dmg = s.home.dmg.filter((d) => DAMAGES[d]);
    for (const list of [s.home.items, s.home.walls]) for (let i = list.length - 1; i >= 0; i--) if (!ITEMS[list[i].id]) list.splice(i, 1);
    if (!Array.isArray(s.fridge) || s.fridge.length !== 3) s.fridge = [0, 0, 0];
    if (s.act && !ACTS[s.act.id]) s.act = null;
    if (!Array.isArray(s.queue)) s.queue = [];
    s.queue = s.queue.filter((q) => q && ACTS[q.id]).slice(0, D.QMAX);
    if (!s.tips || typeof s.tips !== 'object') s.tips = {};
    s.money = Number.isFinite(s.money) ? Math.max(0, Math.round(s.money)) : 0;
    clampNeeds(s);
    return s;
  }

  const progress = (s) => clamp(0.08 + 0.85 * s.needs.mood, 0, 0.95);

  HH.life = {
    gigPay, create, tick, rate, options, start, stop, walk, order, cancel, quick, plan, path, access, near, dmgTile, door, dims, foot, grid,
    canPlace, buy, move, sell, refund, canWall, buyWall, moveWall, wallBusy, setStyle, stylePrice, expand,
    chooseBiz, upgradeBiz, hire, retire, newGeneration, earnPreview,
    beauty, age, phase, clock, daylight, maxHealth, sleeping, fridgeCap, stock, findItem, best, progress, migrate,
    NEEDS,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
