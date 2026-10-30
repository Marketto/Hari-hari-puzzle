// Test headless della logica dei giochi: `node tools/selftest.mjs`
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'src/core/rng.js'), 'utf8'), { filename: 'rng.js' });
for (const f of ['hedgedoku-logic.js', 'boba-logic.js', 'lantern-logic.js', 'parade-logic.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games', f), 'utf8'), { filename: f });
}
const { hedgedoku, boba, lantern, parade } = globalThis.HH;
let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) fail++; };

for (const n of [5, 6, 7, 8]) {
  let uniq = 0, ms = 0;
  for (let k = 0; k < 10; k++) {
    const t = performance.now();
    const p = hedgedoku.generate(n);
    ms += performance.now() - t;
    if (p.unique) uniq++;
    const board = new Array(n * n).fill(0);
    p.solution.forEach((c, r) => { board[r * n + c] = 2; });
    if (!hedgedoku.check(n, p.regions, board).solved) fail++;
  }
  ok(uniq >= 8, `Hedgedoku ${n}x${n}: ${uniq}/10 unici, media ${(ms / 10).toFixed(0)} ms`);
}

for (const colors of [3, 5, 7, 9]) {
  const t = performance.now();
  const cups = boba.generate(colors);
  const sol = cups && boba.solve(cups);
  let s = cups;
  sol && sol.forEach(([a, b]) => { s = boba.pour(s, a, b).cups; });
  ok(!!sol && boba.isSolved(s), `Boba ${colors} gusti: risolvibile in ${sol?.length} mosse (${(performance.now() - t).toFixed(0)} ms)`);
}

for (const n of [4, 5]) {
  const g = lantern.generate(n, 6);
  ok(!lantern.isSolved(g) && g.length === n * n, `Lantern ${n}x${n} generato`);
}

// Hari Parade: 4 gradini di prato (9×10 · 10×11 · 11×12 con ostacoli), generazione < 10 ms, prato connesso
for (const level of [1, 4, 8, 16]) {
  let ms = 0, good = 0;
  for (let k = 0; k < 20; k++) {
    const t = performance.now();
    const s = parade.newLevel(level, globalThis.HH.rng(level * 100 + k));
    ms += performance.now() - t;
    const blocked = new Set(s.obstacles.map((o) => o.y * 1000 + o.x));
    if (parade.validLayout(s.cols, s.rows, blocked) && s.fruit && parade.reachable(s).has(s.fruit.y * 1000 + s.fruit.x)) good++;
  }
  const c = parade.config(level);
  ok(good === 20 && ms / 20 < 10, `Parade livello ${level} ${c.cols}×${c.rows}, ${c.obstacles} ostacoli, ${c.goal} frutti: ${good}/20 validi, media ${(ms / 20).toFixed(2)} ms`);
}

// Yarn Link: 5×5 → 9×9, soluzione unica dimostrata dal risolutore, media < 10 ms per taglia
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/yarn-logic.js'), 'utf8'), { filename: 'yarn-logic.js' });
  const { yarn } = globalThis.HH;
  for (const level of [1, 3, 6, 10, 15, 20]) {
    let ms = 0, good = 0, colors = 0, nodes = 0;
    const T = 20;
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const p = yarn.generate(level, globalThis.HH.rng(level * 977 + k));
      ms += performance.now() - t;
      colors += p.ends.length; nodes += p.nodes;
      const r = yarn.solve(p.n, p.ends, { limit: 2, nodeLimit: 1e6 });
      if (r.count === 1 && yarn.isSolved(p.n, p.ends, p.solution)) good++;
    }
    const n = yarn.sizeFor(level);
    ok(good === T && ms / T < 10, `Yarn Link livello ${level} ${n}×${n}, ${(colors / T).toFixed(1)} colori: ${good}/${T} unici, media ${(ms / T).toFixed(2)} ms, ${Math.round(nodes / T)} nodi`);
  }
}

// Mochi Binary (Takuzu): 4×4 → 10×10, soluzione unica (conteggio con tentativi), media < 10 ms per taglia
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/binary-logic.js'), 'utf8'), { filename: 'binary-logic.js' });
  const { binary } = globalThis.HH;
  for (const level of [1, 2, 5, 10, 15, 20]) {
    let ms = 0, good = 0, givens = 0, steps = 0;
    const T = 20;
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const p = binary.generate(level, globalThis.HH.rng(level * 613 + k));
      ms += performance.now() - t;
      givens += p.givens.length; steps += p.steps;
      if (binary.solveCount(p.n, p.clues, 2).count === 1 && binary.logicSolve(p.n, p.clues, p.tier).ok) good++;
    }
    const c = binary.config(level);
    ok(good === T && ms / T < 10, `Mochi Binary livello ${level} ${c.n}×${c.n} tier ${c.tier}: ${(givens / T).toFixed(1)} indizi, ${good}/${T} unici, media ${(ms / T).toFixed(2)} ms, ${Math.round(steps / T)} deduzioni`);
  }
}

// Pixel Mochi: 5×5 → 10×10, disegni risolti per sola logica riga/colonna (quindi unici), media < 10 ms
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/pixel-logic.js'), 'utf8'), { filename: 'pixel-logic.js' });
  const { pixel } = globalThis.HH;
  for (const level of [1, 3, 6, 10, 15, 20]) {
    let ms = 0, good = 0, steps = 0;
    const T = 20;
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const p = pixel.generate(level, globalThis.HH.rng(level * 613 + k));
      ms += performance.now() - t;
      const r = pixel.lineSolve(p.rows, p.cols, p.w, p.h);
      steps += r.steps;
      if (r.solved && r.grid.every((v, i) => v === p.sol[i])) good++;
    }
    const n = pixel.sizeFor(level);
    ok(good === T && ms / T < 10, `Pixel Mochi livello ${level} ${n}×${n}: ${good}/${T} risolti per logica, media ${(ms / T).toFixed(2)} ms, ${(steps / T).toFixed(0)} deduzioni di linea`);
  }
  ok(pixel.PICS.length >= 40, `Pixel Mochi: ${pixel.PICS.length} disegni`);
}

// Hari Knots (regole modello 3, "Mikado con le corde"): 3 → 9 corde, 1 → 3 lastre; minimo esatto con A* (riverificato con un
// nodeLimit alto), la giocata golosa non basta (dal livello 2); generazione media < 50 ms
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/ropes-logic.js'), 'utf8'), { filename: 'ropes-logic.js' });
  const { ropes } = globalThis.HH;
  for (const level of [1, 3, 6, 10, 14, 18, 24]) {
    let ms = 0, good = 0, min = 0, cross = 0, gap = 0, free0 = 0;
    const T = 12, c = ropes.config(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const L = ropes.generate(level, globalThis.HH.rng(level * 389 + k));
      ms += performance.now() - t;
      min += L.min; cross += L.over.length; gap += L.gap; free0 += L.free0;
      const r = ropes.solve(L, null, { nodeLimit: 100000 });
      let st = ropes.initial(L);
      L.solution.forEach(([q, e, h]) => { st = ropes.move(L, st, q, e, h).state; });
      const naiveOk = c.lo >= 3 ? ropes.naive(L, L.min) > 0 : false;
      if (ropes.stableStart(L) && r.min === L.min && ropes.isSolved(st) && L.min >= c.lo && L.min <= c.hi && !naiveOk) good++;
    }
    ok(good >= T - 1 && ms / T < 50, `Hari Knots livello ${level}: ${c.K} corde, ${c.P} lastre, ${(cross / T).toFixed(1)} incroci, ${(free0 / T).toFixed(1)} libere all'inizio, minimo ${(min / T).toFixed(2)} mosse (+${(gap / T).toFixed(2)} oltre l'euristica): ${good}/${T} ok, media ${(ms / T).toFixed(2)} ms`);
  }
}

// Hari Snack Rush: 5 gradini (tier 0 → 4), copione < 10 ms, sempre una porta buona, fame per ondata proporzionata al potere,
// ogni fila di ostacoli lascia un varco, le porte presidiate hanno ostacoli solo sulla corsia migliore
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/snack-logic.js'), 'utf8'), { filename: 'snack-logic.js' });
  const { snack } = globalThis.HH;
  for (const level of [1, 4, 8, 12, 16]) {
    let ms = 0, good = 0, animals = 0, obst = 0, guards = 0, pus = 0;
    const T = 20, c = snack.config(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const s = snack.newLevel(level, globalThis.HH.rng(level * 211 + k));
      ms += performance.now() - t;
      const gates = s.script.filter((e) => e.k === 'g');
      animals += s.script.filter((e) => e.k === 'a').length;
      const os = s.script.filter((e) => e.k === 'o');
      obst += os.filter((o) => !o.guard).length; guards += os.filter((o) => o.guard).length;
      pus += s.script.filter((e) => e.k === 'p').length;
      const gap = os.filter((o) => !o.guard).every((o) => {
        const row = os.filter((q) => !q.guard && q.t === o.t);
        for (let x = -snack.X_MAX; x <= snack.X_MAX; x += 0.01) if (row.every((q) => Math.abs(q.x - x) >= snack.OBST[q.kind].r + snack.HARI_R)) return true;
        return false;
      });
      if (gap && gates.length === c.gates && gates.every((g) => [g.l, g.r].some((op) => op && (op[0] === 'x' || op[0] === '+')))) good++;
    }
    ok(good === T && ms / T < 10, `Snack Rush livello ${level} (gradino ${c.tier}): ${c.waves} ondate, ${(animals / T).toFixed(0)} animali, ${c.gates} porte (${(guards / T).toFixed(1)} ostacoli di guardia), ${(obst / T).toFixed(1)} ostacoli, ${(pus / T).toFixed(1)} power-up, animalone ${c.boss.kind} da ${c.bossNeed} bocconi: ${good}/${T} ok, media ${(ms / T).toFixed(2)} ms`);
  }
}

// Hari Taxi: 5 gradini di città (3×3 → 6×6 isolati), generazione < 10 ms, ogni fermata raggiungibile su strada,
// tempo limite della prima corsa ≥ 1,5 × il percorso più corto a velocità massima, simulazione < 0,1 ms a fotogramma (1/60 s)
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/drive-logic.js'), 'utf8'), { filename: 'drive-logic.js' });
  const { drive } = globalThis.HH;
  for (const level of [1, 3, 6, 10, 14]) {
    let ms = 0, good = 0, sim = 0, size = '';
    const T = 20, c = drive.config(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const s = drive.newLevel(level, globalThis.HH.rng(level * 389 + k));
      ms += performance.now() - t;
      size = `${s.W}×${s.H}`;
      const g = drive.geo(s), tile = (x, y) => Math.floor(y) * s.W + Math.floor(x);
      const f = drive.field(s, tile(s.car.x, s.car.y));
      const reach = g.spots.every((p) => f[tile(p.zx, p.zy)] >= 0);
      const p = g.spots[s.trip.p], fp = drive.field(s, tile(p.zx, p.zy)), V = drive.VEH[s.veh];
      const fair = s.trip.items.every((it) => it.lim >= 1.5 * (fp[tile(g.spots[it.d].zx, g.spots[it.d].zy)] / V.vmax));
      if (reach && fair) good++;
      if (k < 3) { s.ready = 0; const t2 = performance.now(); for (let i = 0; i < 600; i++) drive.step(s, 1 / 60, null); sim += performance.now() - t2; }
    }
    ok(good === T && ms / T < 10 && sim / 1800 < 0.1, `Hari Taxi livello ${level} (gradino ${c.tier}, ${c.type}): città ${size}, ${c.cars} veicoli, ${c.peds} pedoni, ${c.jobs} consegne: ${good}/${T} ok, generazione ${(ms / T).toFixed(2)} ms, ${(sim / 1800).toFixed(3)} ms a fotogramma`);
  }
}

// Hari Taxi, mappe reali (OpenStreetMap): decodifica + geometria una volta per mappa, poi livelli 1/4/8/12 (4 semi):
// generazione, ogni fermata raggiungibile su strada, tempo limite ≥ 1,5 × percorso a velocità massima, simulazione leggera
{
  for (const id of ['ostia', 'desenzano', 'ortigia']) {
    vm.runInThisContext(fs.readFileSync(path.join(root, `src/games/drive-map-${id}.js`), 'utf8'), { filename: `drive-map-${id}.js` });
    const { drive } = globalThis.HH;
    let t = performance.now();
    drive.newLevel(1, globalThis.HH.rng(1), id);
    const first = performance.now() - t;
    for (const level of [1, 4, 8, 12]) {
      let ms = 0, good = 0, sim = 0;
      const T = 4, c = drive.config(level, id);
      for (let k = 0; k < T; k++) {
        t = performance.now();
        const s = drive.newLevel(level, globalThis.HH.rng(level * 97 + k), id);
        ms += performance.now() - t;
        const g = drive.geo(s), tile = (x, y) => Math.floor(y) * s.W + Math.floor(x);
        const p = g.spots[s.trip.p], fp = drive.field(s, tile(p.zx, p.zy)), V = drive.VEH[s.veh];
        const reach = drive.field(s, tile(s.car.x, s.car.y))[tile(p.zx, p.zy)] >= 0;
        const fair = s.trip.items.every((it) => fp[tile(g.spots[it.d].zx, g.spots[it.d].zy)] >= 0 && it.lim >= 1.5 * (fp[tile(g.spots[it.d].zx, g.spots[it.d].zy)] / V.vmax));
        if (reach && fair) good++;
        if (k < 2) { s.ready = 0; const t2 = performance.now(); for (let i = 0; i < 600; i++) drive.step(s, 1 / 60, null); sim += performance.now() - t2; }
      }
      ok(good === T && ms / T < 40 && sim / 1200 < 0.2, `Hari Taxi ${id} livello ${level} (${c.type}): ${drive.mapData(id).W}×${drive.mapData(id).H} caselle, ${c.cars} veicoli e ${c.peds} pedoni attorno a Hari: ${good}/${T} ok, prima geometria ${first.toFixed(0)} ms, livello ${(ms / T).toFixed(1)} ms, ${(sim / 1200).toFixed(3)} ms a fotogramma`);
    }
  }
}

// Hari Home (simulazione senza livelli): 4 fasi della vita + Hari da solo col libero arbitrio, un giorno di gioco simulato < 10 ms, bisogni sempre in 0..1
{
  for (const f of ['life-data.js', 'life-logic.js']) vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games', f), 'utf8'), { filename: f });
  const life = globalThis.HH.life, LD = globalThis.HH.lifeData;
  const stages = {
    'monolocale decadente': () => life.create(1),
    'casa ristrutturata': () => { const st = life.create(2); st.money = 9000; st.home.dmg = []; for (const id of ['bed2', 'sofa1', 'plant2', 'lamp1']) for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (!life.canPlace(st, id, x, y, 0) && life.buy(st, id, x, y, 0).ok) { y = 9; break; } return st; },
    'casa grande': () => { const st = life.create(3); st.money = 99999; life.expand(st); life.expand(st); life.expand(st); life.chooseBiz(st, 'bakery'); st.biz.level = 4; st.biz.helpers = 3; return st; },
    'nonno in pensione': () => { const st = life.create(4); st.born = st.t - LD.DAY * LD.YEAR_DAYS * 50; life.retire(st); return st; },
    'da solo (libero arbitrio, casa arredata)': () => { const st = life.create(5); st.money = 9000; st.home.dmg = []; for (const id of ['sofa1', 'books', 'mat', 'stove1']) for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (!life.canPlace(st, id, x, y, 0) && life.buy(st, id, x, y, 0).ok) { y = 9; break; } st.fridge = [4, 0, 0]; return st; },
  };
  for (const [name, mk] of Object.entries(stages)) {
    const st = mk(), T = 20;
    const t = performance.now();
    for (let d = 0; d < T; d++) { if (!st.act && st.needs.energy < 0.3) life.start(st, 'sleep'); life.tick(st, LD.DAY); }
    const ms = (performance.now() - t) / T;
    const fine = life.NEEDS.every((k) => st.needs[k] >= 0 && st.needs[k] <= 1) && Number.isInteger(st.money) && st.money >= 0;
    ok(fine && ms < 10, `Hari Home, ${name}: età ${life.age(st).toFixed(1)}, bellezza ${life.beauty(st).toFixed(2)}, ${T} giorni, media ${ms.toFixed(2)} ms/giorno`);
  }
}

// Hari Memory: 4+ taglie (3×4 → 6×6), ogni mazzo con esattamente n coppie di soggetti distinti, generazione < 10 ms
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/memory-logic.js'), 'utf8'), { filename: 'memory-logic.js' });
  const { memory } = globalThis.HH;
  for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    let ms = 0, good = 0;
    const T = 50, t0 = memory.tierFor(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const s = memory.newGame(level, level * 733 + k);
      ms += performance.now() - t;
      const cnt = {};
      s.key.forEach((x) => { cnt[x] = (cnt[x] || 0) + 1; });
      if (s.deck.length === t0.cols * t0.rows && Object.values(cnt).length === t0.pairs && Object.values(cnt).every((c) => c === 2)
        && new Set(s.deck).size === (s.mode === 'themed' ? s.deck.length : t0.pairs)) good++;
    }
    ok(good === T && ms / T < 10, `Hari Memory livello ${level}: ${t0.cols}×${t0.rows}, ${t0.pairs} coppie, ${t0.mode}${t0.swap ? ' + swap' : ''}: ${good}/${T} ok, media ${(ms / T).toFixed(3)} ms`);
  }
}


// Hari Spot (trova le differenze): 3 → 10 differenze, città/foresta alternate; esattamente N differenze con zone
// che non si toccano, ognuna toccabile al centro; media < 10 ms per livello
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/spot-logic.js'), 'utf8'), { filename: 'spot-logic.js' });
  const { spot } = globalThis.HH;
  for (const level of [1, 2, 5, 9, 14, 20]) {
    let ms = 0, good = 0, objs = 0;
    const T = 20, P = spot.paramsFor(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const p = spot.generate(level, globalThis.HH.rng(level * 811 + k));
      ms += performance.now() - t;
      objs += p.a.length;
      const apart = p.diffs.every((d, i) => p.diffs.every((e, j) => j <= i || Math.hypot(d.zone.x - e.zone.x, d.zone.y - e.zone.y) >= d.zone.r + e.zone.r));
      if (p.diffs.length === P.n && apart && p.diffs.every((d, i) => spot.hitTest(p, d.zone.x, d.zone.y) === i)) good++;
    }
    ok(good === T && ms / T < 10, `Hari Spot livello ${level} (${P.theme === 'city' ? 'città' : 'foresta'}): ${P.n} differenze, ${(objs / T).toFixed(1)} oggetti, ${good}/${T} valide, media ${(ms / T).toFixed(2)} ms`);
  }
}

// Hari Airlines: volo diviso in fasi; 4+ gradini (3 → 6 file, fasi che si sbloccano); imbarco con conteggio coerente,
// bagagli che entrano nelle cappelliere (risolutore a backtracking), richieste soddisfacibili; generazione < 10 ms
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/flight-logic.js'), 'utf8'), { filename: 'flight-logic.js' });
  const F = globalThis.HH.flight;
  const pack = (caps, sizes) => {
    const fr = caps.slice(), ord = sizes.map((x, i) => i).sort((a, b) => sizes[b] - sizes[a]);
    const go = (k) => k === ord.length || fr.some((c, b) => { if (c < sizes[ord[k]]) return false; fr[b] -= sizes[ord[k]]; const ok = go(k + 1); fr[b] += sizes[ord[k]]; return ok; });
    return go(0);
  };
  for (const level of [1, 2, 3, 4, 6, 8, 12]) {
    let ms = 0, good = 0;
    const T = 40, c = F.config(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const s = F.newGame(level, level * 977 + k);
      ms += performance.now() - t;
      const B = s.plan.board;
      let n = 0;
      B.steps.forEach((st) => { n += st.k === 'in' ? st.ids.length : -st.ids.length; });
      const want = B.ask === 'missing' ? B.booked - n : n;
      const bagsOk = !s.plan.bags || pack(s.plan.bags.bins.map((b) => F.BIN_CAP - b.fill.reduce((a, x) => a + x, 0)), s.plan.bags.bags.map((b) => b.size));
      const meals = s.plan.serve.reqs.reduce((m, r) => m + r.items.filter((x) => x === 'meal').length, 0);
      if (want === B.ans && B.opts.includes(want) && bagsOk && meals === (s.plan.galley ? s.plan.galley.meals : 0)) good++;
    }
    ok(good === T && ms / T < 10, `Hari Airlines livello ${level}: ${c.rows} file, ${c.pax} passeggeri, fasi ${c.phases.join('·')}: ${good}/${T} ok, media ${(ms / T).toFixed(3)} ms`);
  }
}

// Hari Rally: 5 gradini di tappa (1,3 → 4,3 km) in 4 ambientazioni, generazione (con traiettoria ideale) < 10 ms, curve mai
// sotto i 14 m di raggio, nessun tratto che si riavvicina a meno di 30 m, ogni curva vera (R < 130 m) coperta da una nota,
// note per ponti e gallerie, scatole-sorpresa presenti, simulazione (4 kart, power-up, sotto-passi, collisioni nel mondo) < 0,1 ms
// a fotogramma
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/rally-logic.js'), 'utf8'), { filename: 'rally-logic.js' });
  const { rally } = globalThis.HH;
  // riscaldamento del JIT (la misura vuole il costo a regime di un fotogramma, con sotto-passi e collisioni nel mondo)
  { const w = rally.newLevel(6, globalThis.HH.rng(7)); w.ready = 0; for (let i = 0; i < 900; i++) rally.step(w, 1 / 60, { steer: 0.05, brake: 0 }); }
  for (const level of [1, 2, 3, 6, 9, 13]) {
    let ms = 0, good = 0, sim = 0, notes = 0, tight = 0, tun = 0, box = 0;
    const T = 12, c = rally.config(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const g = rally.track(level * 977 + k, level);
      ms += performance.now() - t;
      let minR = 1e9, near = 1e9, covered = true;
      for (let i = 1; i < g.N; i++) {
        const R = 1 / Math.max(1e-9, Math.abs(g.k[i]));
        minR = Math.min(minR, R);
        if (R < 130 && i >= rally.PREROLL && i <= rally.PREROLL + c.len && !g.notes.some((n) => n.kind === 'curve' && n.at <= i && n.end >= i)) covered = false;
      }
      for (let i = 0; i <= g.N; i += 8) for (let j = i + 168; j <= g.N; j += 8) near = Math.min(near, Math.hypot(g.x[i] - g.x[j], g.y[i] - g.y[j]));
      const cs = g.notes.filter((n) => n.kind === 'curve');
      notes += cs.length; tight += cs.filter((n) => n.g <= 2).length; tun += g.tunnels.length; box += g.boxes.length;
      const spans = g.notes.filter((n) => n.kind === 'tunnel' || n.kind === 'bridge').length === g.tunnels.length + g.bridges.length;
      if (minR >= 14 && near >= 30 && covered && spans && g.boxes.length > 0) good++;
      if (k < 3) { const s = rally.newLevel(level, globalThis.HH.rng(level * 31 + k)); s.ready = 0; const t2 = performance.now(); for (let i = 0; i < 600; i++) rally.step(s, 1 / 60, { steer: 0.05, brake: 0 }); sim += performance.now() - t2; }
    }
    ok(good === T && ms / T < 10 && sim / 1800 < 0.1, `Hari Rally livello ${level} (gradino ${c.tier}, ${c.theme}/${c.time}): ${c.len} m, ${(notes / T).toFixed(1)} curve di cui ${(tight / T).toFixed(1)} strette, ${(tun / T).toFixed(1)} gallerie, ${(box / T).toFixed(1)} file di scatole, avversari ${c.ai.join('/')}: ${good}/${T} ok, generazione ${(ms / T).toFixed(2)} ms, ${(sim / 1800).toFixed(3)} ms a fotogramma`);
  }
}

// Hari Sudoku: 4 fasce di difficoltà (single · pointing · coppie/triple · X-wing e oltre), soluzione unica per il
// contatore a backtracking, risolti dal risolutore a tecniche entro la tecnica della fascia, media < 10 ms (livelli curati)
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/sudoku-logic.js'), 'utf8'), { filename: 'sudoku-logic.js' });
  const { sudoku } = globalThis.HH;
  sudoku.levelPuzzle(40, 1);                                   // riscaldamento del JIT
  for (const [from, to] of [[1, 10], [11, 15], [16, 25], [26, 30]]) {
    let ms = 0, good = 0, tech = 0, clues = 0;
    for (let L = from; L <= to; L++) {
      const t = performance.now();
      const p = sudoku.levelPuzzle(L);
      ms += performance.now() - t;
      const T = sudoku.tierFor(L), r = sudoku.logicSolve(p.puzzle, T.maxTech);
      if (r.ok && r.tech >= T.minTech && sudoku.countSolutions(p.puzzle, 2).count === 1) good++;
      tech = Math.max(tech, p.tech); clues += p.clues;
    }
    const n = to - from + 1;
    ok(good === n && ms / n < 10, `Hari Sudoku livelli ${from}–${to}: ${good}/${n} unici e logici, tecnica max ${tech}, ${(clues / n).toFixed(1)} indizi, media ${(ms / n).toFixed(2)} ms`);
  }
}

// Hari Escape: 1 → 3 stanze, 3 → 10 enigmi (≥ 4 gradini); grafo risolvibile (simulazione), tipi tutti diversi nel livello,
// sotto-puzzle mai già risolti; generazione < 10 ms
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/escape-logic.js'), 'utf8'), { filename: 'escape-logic.js' });
  const X = globalThis.HH.escape;
  for (const level of [1, 3, 5, 8, 12, 20]) {
    let ms = 0, good = 0, types = 0;
    const T = 30, c = X.config(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const L = X.generate(level, globalThis.HH.rng(level * 977 + k));
      ms += performance.now() - t;
      const P = Object.values(L.p), ty = new Set(P.map((p) => p.type));
      types += ty.size;
      const fresh = X.newGame(level, level * 977 + k);
      const notSolved = Object.values(X.levelOf(fresh).p).every((p) => !fresh.solved[p.id]);
      if (L.n === c.n && L.rooms.length === c.rooms && ty.size === P.length && X.simulate(L) && notSolved) good++;
    }
    ok(good === T && ms / T < 10, `Hari Escape livello ${level}: ${c.rooms} stanze, ${c.n} enigmi (${(types / T).toFixed(1)} tipi diversi): ${good}/${T} ok, media ${(ms / T).toFixed(2)} ms`);
  }
}

// Hari Snack Street: generazione del livello (< 10 ms), passo di simulazione (< 0,5 ms anche con 2 giocatori),
// curva su 4 gradini (1, 4, 8, 12): più ondate, più animali, animalone più affamato; con 2 giocatori di più
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/street-logic.js'), 'utf8'), { filename: 'street-logic.js' });
  const ST = globalThis.HH.street;
  for (const level of [1, 4, 8, 12]) {
    for (const np of [1, 2]) {
      let gen = 0, sim = 0, ticks = 0;
      const T = 8, c = ST.config(level, np);
      for (let k = 0; k < T; k++) {
        const t = performance.now();
        const s = ST.newLevel(level, globalThis.HH.rng(level * 313 + k), { players: np, cpu: np === 2 });
        gen += performance.now() - t;
        s.players.forEach((p) => { p.cpu = 1; });
        const t2 = performance.now();
        for (let i = 0; i < 1800 && !ST.isOver(s); i++, ticks++) ST.step(s, 1 / 60, [null, null]);
        sim += performance.now() - t2;
      }
      ok(gen / T < 10 && sim / ticks < 0.5, `Hari Snack Street livello ${level}, ${np} giocatori: ${c.waves} ondate × ${c.perWave} animali, animalone ${c.bossNeed} bocconi; generazione ${(gen / T).toFixed(2)} ms, passo ${(sim / ticks * 1000).toFixed(0)} µs`);
    }
  }
}

const L = vm.runInThisContext(fs.readFileSync(path.join(root, 'src/i18n/locales.js'), 'utf8'));
ok(Object.keys(globalThis.HH.LOCALES).length >= 43, `Lingue: ${Object.keys(globalThis.HH.LOCALES).length}`);
process.exit(fail ? 1 : 0);
