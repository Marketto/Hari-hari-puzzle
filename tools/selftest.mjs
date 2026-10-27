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

// Hari Snack Rush: 4 gradini (tier 0 → 4), copione < 10 ms, sempre una porta buona, fame per ondata proporzionata al potere
{
  vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games/snack-logic.js'), 'utf8'), { filename: 'snack-logic.js' });
  const { snack } = globalThis.HH;
  for (const level of [1, 4, 8, 12, 16]) {
    let ms = 0, good = 0, animals = 0;
    const T = 20, c = snack.config(level);
    for (let k = 0; k < T; k++) {
      const t = performance.now();
      const s = snack.newLevel(level, globalThis.HH.rng(level * 211 + k));
      ms += performance.now() - t;
      const gates = s.script.filter((e) => e.k === 'g');
      animals += s.script.filter((e) => e.k === 'a').length;
      if (gates.length === c.gates && gates.every((g) => [g.l, g.r].some((op) => op && (op[0] === 'x' || op[0] === '+')))) good++;
    }
    ok(good === T && ms / T < 10, `Snack Rush livello ${level} (gradino ${c.tier}): ${c.waves} ondate, ${(animals / T).toFixed(0)} animali, ${c.gates} porte, animalone ${c.boss.kind} da ${c.bossNeed} bocconi: ${good}/${T} ok, media ${(ms / T).toFixed(2)} ms`);
  }
}

// Hari Home (simulazione senza livelli): 4 fasi della vita, un giorno di gioco simulato < 10 ms, bisogni sempre in 0..1
{
  for (const f of ['life-data.js', 'life-logic.js']) vm.runInThisContext(fs.readFileSync(path.join(root, 'src/games', f), 'utf8'), { filename: f });
  const life = globalThis.HH.life, LD = globalThis.HH.lifeData;
  const stages = {
    'monolocale decadente': () => life.create(1),
    'casa ristrutturata': () => { const st = life.create(2); st.money = 9000; st.home.dmg = []; for (const id of ['bed2', 'sofa1', 'plant2', 'lamp1']) for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (!life.canPlace(st, id, x, y, 0) && life.buy(st, id, x, y, 0).ok) { y = 9; break; } return st; },
    'casa grande': () => { const st = life.create(3); st.money = 99999; life.expand(st); life.expand(st); life.expand(st); life.chooseBiz(st, 'bakery'); st.biz.level = 4; st.biz.helpers = 3; return st; },
    'nonno in pensione': () => { const st = life.create(4); st.born = st.t - LD.DAY * LD.YEAR_DAYS * 50; life.retire(st); return st; },
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

const L = vm.runInThisContext(fs.readFileSync(path.join(root, 'src/i18n/locales.js'), 'utf8'));
ok(Object.keys(globalThis.HH.LOCALES).length >= 43, `Lingue: ${Object.keys(globalThis.HH.LOCALES).length}`);
process.exit(fail ? 1 : 0);
