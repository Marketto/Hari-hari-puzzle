// Unit test Sushi Bar: regole, ricette, nastro, e un "bot cuoco" con tempi di reazione umani
// che deve vincere ogni livello senza perdere clienti (il livello è sempre giocabile).
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/sushi-logic.js');
const S = HH.sushi;

test('ricette: ingredienti validi, al massimo 4, sblocco progressivo', () => {
  S.RECIPES.forEach((r) => {
    assert.ok(r.ing.length >= 2 && r.ing.length <= S.PLATE_MAX, r.id);
    r.ing.forEach((x) => assert.ok(S.INGREDIENTS.includes(x), `${r.id}: ${x}`));
  });
  assert.equal(new Set(S.RECIPES.map((r) => r.ing.slice().sort().join('+'))).size, S.RECIPES.length, 'due ricette uguali');
  let prev = 0;
  for (let L = 1; L <= 15; L++) { const c = S.config(L); assert.ok(c.recipes >= prev && c.recipes <= S.RECIPES.length); prev = c.recipes; }
  assert.equal(S.config(1).recipes, 4);
  // varietà fin dal primo livello: almeno 5 ingredienti diversi, ricette iniziali semplici (2 ingredienti)
  const first = S.RECIPES.slice(0, S.config(1).recipes);
  assert.ok(new Set(first.flatMap((r) => r.ing)).size >= 5);
  assert.ok(first.every((r) => r.ing.length === 2));
});

test('matches: conta gli ingredienti, non l’ordine', () => {
  assert.ok(S.matches(['nori', 'rice'], ['rice', 'nori']));
  assert.ok(!S.matches(['rice', 'rice'], ['rice', 'nori']));
  assert.ok(!S.matches(['rice', 'nori', 'nori'], ['rice', 'nori']));
  assert.ok(S.matches(['cucumber', 'avocado', 'rice', 'nori'], ['nori', 'rice', 'avocado', 'cucumber']));
});

test('nastro: piattini ben distanziati (al massimo 5 per giro, mai sovrapposti)', () => {
  assert.ok(S.BELT_SLOTS <= 5);
  const s = S.newLevel(6, HH.rng(9));
  for (let i = 0; i < 2000; i++) {
    S.step(s, 0.05, HH.rng(i));
    const xs = s.belt.map((it) => it.x).sort((a, b) => a - b);
    for (let k = 1; k < xs.length; k++) assert.ok(xs[k] - xs[k - 1] >= 0.9 / S.BELT_SLOTS - 1e-9, `distanza ${xs[k] - xs[k - 1]}`);
  }
});

test('take / trash / serve', () => {
  const s = S.newLevel(1, HH.rng(1));
  s.seats[0] = { id: 99, animal: 'cat', recipe: S.RECIPES[0], patience: 30, max: 30 };
  s.belt = [{ id: 1, ing: 'rice', x: 0.1 }, { id: 2, ing: 'salmon', x: 0.3 }, { id: 3, ing: 'nori', x: 0.5 }];
  assert.ok(S.take(s, 1) && S.take(s, 2));
  assert.equal(S.serve(s, 0), 'wrong');               // riso+salmone ≠ onigiri
  assert.equal(s.wrong, 1);
  assert.ok(s.seats[0].patience < 30);
  assert.ok(S.trash(s));
  assert.equal(s.plate.length, 0);
  assert.equal(s.trashes, 1);
  s.belt.push({ id: 4, ing: 'rice', x: 0.7 });
  assert.ok(S.take(s, 3) && S.take(s, 4));
  assert.equal(S.serve(s, 0), 'ok');
  assert.equal(s.served, 1);
  assert.equal(s.seats[0], null);
  assert.equal(S.serve(s, 0), 'empty');
  // tagliere pieno
  s.plate = ['rice', 'rice', 'rice', 'rice'];
  s.belt.push({ id: 5, ing: 'egg', x: 0.2 });
  assert.equal(S.take(s, 5), false);
});

test('pazienza finita: il cliente se ne va e costa un cuore; 3 = sconfitta', () => {
  const s = S.newLevel(1, HH.rng(2));
  let lost = 0;
  for (let t = 0; t < 400 && !S.isOver(s); t++) lost += S.step(s, 0.5, HH.rng(t)).filter((e) => e.type === 'lost').length;
  assert.ok(S.isLost(s));
  assert.equal(lost, S.LIVES);
});

/* ---------- Bot cuoco: reazione di 0,7 s per ogni tocco ---------- */
function bot(level, seed) {
  const rnd = HH.rng(seed);
  const s = S.newLevel(level, rnd);
  const dt = 0.1;
  let cooldown = 0, target = -1;
  for (let k = 0; k < 20000 && !S.isOver(s); k++) {
    S.step(s, dt, rnd);
    if ((cooldown -= dt) > 0) continue;
    // cliente più impaziente
    const order = s.seats.map((c, i) => ({ c, i })).filter((o) => o.c).sort((a, b) => a.c.patience - b.c.patience);
    if (!order.length) continue;
    if (target < 0 || !s.seats[target]) target = order[0].i;
    const want = s.seats[target].recipe.ing;
    if (S.matches(s.plate, want)) { S.serve(s, target); target = -1; cooldown = 0.7; continue; }
    const missing = want.slice();
    s.plate.forEach((x) => { const j = missing.indexOf(x); if (j >= 0) missing.splice(j, 1); });
    if (s.plate.some((x) => !want.includes(x))) { S.trash(s); cooldown = 0.7; continue; }
    const it = s.belt.find((b) => missing.includes(b.ing));
    if (it) { S.take(s, it.id); cooldown = 0.7; }
  }
  return s;
}

test('il bot cuoco vince ogni livello 1–15 senza perdere clienti (5 partite per livello)', () => {
  for (let level = 1; level <= 15; level++) {
    for (let seed = 1; seed <= 5; seed++) {
      const s = bot(level, level * 100 + seed);
      assert.ok(S.isWon(s), `livello ${level} seme ${seed}: serviti ${s.served}/${s.goal}, persi ${s.lost}`);
      assert.equal(s.lost, 0, `livello ${level} seme ${seed}: persi ${s.lost}`);
      assert.equal(S.rate(s), 3);
    }
  }
});

test('difficoltà crescente', () => {
  const a = S.config(1), b = S.config(10);
  assert.ok(b.goal > a.goal && b.patience < a.patience && b.speed > a.speed && b.recipes > a.recipes && b.seats >= a.seats);
});

test('fragoline', () => {
  assert.equal(S.rate({ lost: 0, wrong: 0, trashes: 0 }), 3);
  assert.equal(S.rate({ lost: 0, wrong: 1, trashes: 1 }), 2);
  assert.equal(S.rate({ lost: 1, wrong: 0, trashes: 0 }), 2);
  assert.equal(S.rate({ lost: 2, wrong: 0, trashes: 0 }), 1);
  assert.equal(S.rate({ lost: 0, wrong: 2, trashes: 1 }), 1);
});
