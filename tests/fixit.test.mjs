// Unit test Fix-It House: ogni livello generato è un DAG chiuso (prerequisiti inclusi),
// risolvibile secondo un oracolo indipendente (ricerca esaustiva degli ordini, non usa solve()),
// con attrezzi presenti nella cassetta; apply() distingue ordine sbagliato / attrezzo sbagliato / riparato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/fixit-logic.js');
const F = HH.fixit;

/* ---------- Oracolo indipendente ---------- */
// DFS sui sottoinsiemi già riparati: esiste un ordine in cui ogni guasto arriva dopo i suoi prerequisiti?
function oracleSolvable(problems) {
  const n = problems.length;
  const idx = new Map(problems.map((p, i) => [p.id, i]));
  if (problems.some((p) => p.deps.some((d) => !idx.has(d)))) return false;
  const need = problems.map((p) => p.deps.reduce((m, d) => m | (1 << idx.get(d)), 0));
  const full = (1 << n) - 1, dead = new Set();
  const rec = (mask) => {
    if (mask === full) return true;
    if (dead.has(mask)) return false;
    for (let i = 0; i < n; i++) if (!(mask & (1 << i)) && (need[i] & mask) === need[i] && rec(mask | (1 << i))) return true;
    dead.add(mask);
    return false;
  };
  return rec(0);
}
// ciclo? (visita in profondità con colori)
function hasCycle(problems) {
  const by = new Map(problems.map((p) => [p.id, p]));
  const col = new Map();
  const dfs = (id) => {
    col.set(id, 1);
    for (const d of by.get(id).deps) {
      if (!by.has(d)) continue;
      if (col.get(d) === 1) return true;
      if (!col.get(d) && dfs(d)) return true;
    }
    col.set(id, 2);
    return false;
  };
  return problems.some((p) => !col.get(p.id) && dfs(p.id));
}
// verifica un ordine proposto simulando le regole del gioco senza usare la logica
function orderOk(problems, order) {
  const done = new Set();
  for (const id of order) {
    const p = problems.find((q) => q.id === id);
    if (!p || done.has(id) || p.deps.some((d) => !done.has(d))) return false;
    done.add(id);
  }
  return done.size === problems.length;
}
const edges = (ps) => ps.reduce((s, p) => s + p.deps.length, 0);

/* ---------- Catalogo ---------- */
test('catalogo: DAG, attrezzo unico per guasto, prerequisiti esistenti', () => {
  assert.equal(hasCycle(F.CATALOG), false);
  const ids = new Set(F.CATALOG.map((p) => p.id));
  assert.equal(ids.size, F.CATALOG.length);
  F.CATALOG.forEach((p) => p.deps.forEach((d) => assert.ok(ids.has(d), `${p.id} → ${d}`)));
  assert.equal(new Set(F.TOOLS).size, F.TOOLS.length, 'un attrezzo diverso per ogni guasto');
  assert.ok(F.CATALOG.some((p) => p.deps.length >= 2), 'almeno un guasto con due prerequisiti');
});

/* ---------- Livelli generati ---------- */
const SEEDS = 30;
for (let level = 1; level <= 20; level++) {
  test(`livello ${level}: struttura, prerequisiti, risolvibilità, attrezzi (${SEEDS} semi)`, () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const tag = `L${level} seed=${seed}`;
      const pz = F.generate(level, HH.rng(seed * 7919 + level));
      const ids = pz.problems.map((p) => p.id);
      assert.equal(pz.problems.length, F.sizeFor(level), `${tag}: taglia`);
      assert.equal(new Set(ids).size, ids.length, `${tag}: guasti ripetuti`);
      // ogni guasto è del catalogo e ha gli stessi prerequisiti; tutti i prerequisiti sono nel livello
      for (const p of pz.problems) {
        const c = F.CATALOG.find((q) => q.id === p.id);
        assert.ok(c, `${tag}: ${p.id} fuori catalogo`);
        assert.equal(p.tool, c.tool, `${tag}: attrezzo di ${p.id}`);
        assert.deepEqual(p.deps, c.deps, `${tag}: prerequisiti di ${p.id}`);
        p.deps.forEach((d) => assert.ok(ids.includes(d), `${tag}: manca ${d} (prerequisito di ${p.id})`));
        assert.ok(pz.tools.includes(p.tool), `${tag}: attrezzo ${p.tool} assente dalla cassetta`);
      }
      assert.equal(new Set(pz.tools).size, pz.tools.length, `${tag}: attrezzi doppi`);
      assert.ok(pz.tools.length > pz.problems.length, `${tag}: servono attrezzi "esca"`);
      assert.equal(hasCycle(pz.problems), false, `${tag}: ciclo`);
      assert.ok(oracleSolvable(pz.problems), `${tag}: irrisolvibile per l'oracolo`);
      // il solver del gioco produce un ordine che l'oracolo accetta
      assert.ok(orderOk(pz.problems, F.solve(pz.problems)), `${tag}: ordine del solver non valido`);
      // livelli 1-2: un'unica catena di 3 guasti collegati
      if (level <= 2) {
        assert.equal(F.stats(pz.problems).groups, 1, `${tag}: più catene`);
        assert.ok(edges(pz.problems) >= 2, `${tag}: catena non collegata`);
      }
      if (level >= 7) assert.ok(pz.problems.some((p) => p.deps.length >= 2), `${tag}: nessun guasto con 2 prerequisiti`);
      assert.ok(F.validate(F.newState(pz)), `${tag}: validate`);
    }
  });
}

test('la difficoltà cresce col livello (taglia, dipendenze, guasti doppi)', () => {
  const avg = (level, f) => {
    let t = 0;
    for (let s = 1; s <= 40; s++) t += f(F.generate(level, HH.rng(s * 31 + level)).problems);
    return t / 40;
  };
  let prev = 0;
  for (let l = 1; l <= 20; l++) { assert.ok(F.sizeFor(l) >= prev, `sizeFor non monotona a ${l}`); prev = F.sizeFor(l); }
  assert.equal(F.sizeFor(1), 3);
  assert.ok(F.sizeFor(20) >= 8 && F.sizeFor(20) <= 10);
  assert.ok(new Set([1, 3, 6, 10, 14].map(F.sizeFor)).size >= 4, 'almeno 4 gradini');
  const e = [1, 5, 10, 15].map((l) => avg(l, edges));
  for (let i = 1; i < e.length; i++) assert.ok(e[i] > e[i - 1], `archi medi non crescenti: ${e}`);
  assert.ok(avg(12, (ps) => F.stats(ps).groups) >= 2, 'livelli alti: più catene in parallelo');
});

test('generazione deterministica e veloce (< 10 ms medi)', () => {
  assert.deepEqual(F.generate(9, HH.rng(5)), F.generate(9, HH.rng(5)));
  const t = performance.now();
  for (let s = 0; s < 200; s++) F.generate(1 + (s % 20), HH.rng(1000 + s));
  assert.ok((performance.now() - t) / 200 < 10);
});

/* ---------- apply ---------- */
const pz = { level: 1, problems: F.CATALOG.map((p) => ({ ...p, deps: p.deps.slice() })), tools: F.TOOLS.slice() };

test("apply: attrezzo giusto ma prerequisiti mancanti → 'order' con i blocchi esatti", () => {
  const s = F.newState(pz);
  let r = F.apply(s, 'lamp', 'bulb');
  assert.equal(r.result, 'order');
  assert.deepEqual(r.blockers.slice().sort(), ['puddle', 'wires']);
  assert.equal(s.mistakes, 1);
  assert.deepEqual(s.fixed, []);
  assert.deepEqual(s.found.map((e) => e.join('>')).sort(), ['puddle>lamp', 'wires>lamp']);
  // ripetere lo stesso errore non duplica le dipendenze scoperte
  F.apply(s, 'lamp', 'bulb');
  assert.equal(s.found.length, 2);
  assert.equal(s.mistakes, 2);
  // con un solo prerequisito riparato resta solo l'altro
  F.apply(s, 'fuse', 'fuse'); F.apply(s, 'wires', 'screwdriver');
  r = F.apply(s, 'lamp', 'bulb');
  assert.deepEqual(r.blockers, ['puddle']);
  // i blocchi sono solo i prerequisiti DIRETTI non riparati
  r = F.apply(s, 'puddle', 'mop');
  assert.deepEqual(r.blockers, ['pipe']);
});

test("apply: attrezzo sbagliato → 'tool' (nessun cuore), anche se l'ordine è sbagliato", () => {
  const s = F.newState(pz);
  let r = F.apply(s, 'ladder', 'saw');
  assert.equal(r.result, 'tool');
  assert.deepEqual(r.blockers, []);
  r = F.apply(s, 'roof', 'hammer');
  assert.equal(r.result, 'tool');
  assert.equal(s.mistakes, 0);
  assert.equal(s.slips, 2);
  assert.deepEqual(s.fixed, []);
});

test("apply: 'fixed' con attrezzo e ordine giusti; ogni guasto si ripara solo col suo attrezzo", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const p = F.generate(1 + (seed % 15), HH.rng(seed * 13));
    const s = F.newState(p);
    // ordine trovato dall'oracolo (prendi sempre il primo guasto disponibile)
    const left = new Set(p.problems.map((q) => q.id));
    while (left.size) {
      const id = [...left].find((i) => p.problems.find((q) => q.id === i).deps.every((d) => !left.has(d)));
      const prob = p.problems.find((q) => q.id === id);
      assert.ok(F.canFix(s, id));
      p.tools.filter((t) => t !== prob.tool).forEach((t) => assert.equal(F.apply(s, id, t).result, 'tool'));
      assert.equal(F.apply(s, id, prob.tool).result, 'fixed');
      assert.equal(F.apply(s, id, prob.tool).result, 'already');
      left.delete(id);
    }
    assert.ok(F.isSolved(s));
    assert.equal(s.mistakes, 0);
    assert.equal(F.progress(s), 1);
  }
});

test('undo toglie solo l’ultima riparazione e non restituisce cuori', () => {
  const s = F.newState(pz);
  F.apply(s, 'roof', 'tile');                 // errore d'ordine
  F.apply(s, 'ladder', 'hammer');
  F.apply(s, 'roof', 'tile');
  assert.deepEqual(s.fixed, ['ladder', 'roof']);
  assert.equal(F.undo(s), 'roof');
  assert.deepEqual(s.fixed, ['ladder']);
  assert.equal(s.mistakes, 1);
  assert.ok(F.canFix(s, 'roof'));
});

test('rate, progress e validate', () => {
  const s = F.newState(pz);
  assert.equal(F.rate(s), 3);
  s.slips = 1; assert.equal(F.rate(s), 2);
  s.mistakes = 1; assert.equal(F.rate(s), 2);
  s.slips = 2; assert.equal(F.rate(s), 1);
  assert.equal(F.progress(s), 0);
  s.fixed = ['ladder', 'roof'];
  assert.ok(Math.abs(F.progress(s) - 2 / F.CATALOG.length) < 1e-9);
  assert.ok(F.validate(s));
  assert.equal(F.validate({ ...s, fixed: ['roof'] }), false, 'riparato senza prerequisito');
  assert.equal(F.validate({ ...s, problems: s.problems.filter((p) => p.id !== 'ladder') }), false, 'prerequisito mancante');
  assert.equal(F.validate({ ...s, problems: s.problems.map((p) => (p.id === 'roof' ? { ...p, tool: 'saw' } : p)) }), false, 'attrezzo alterato');
  assert.equal(F.validate({ ...s, tools: s.tools.filter((t) => t !== 'tile') }), false, 'attrezzo assente');
  assert.equal(F.validate(null), false);
});
