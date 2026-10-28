// Unit test Hari Airlines: ogni fase di ogni volo è risolvibile (oracoli scritti qui, indipendenti dal generatore):
// conteggio dell'imbarco ricostruito dagli ingressi/uscite, bagagli che entrano nelle cappelliere (risolutore a
// backtracking), cinture/cucina/servizio/rifiuti finiti in tempo da un bot con reazioni umane; determinismo,
// ripresa da JSON, difficoltà monotona, bot che vince i livelli 1–12 con 3 fragoline, tempi di generazione.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/flight-logic.js');
const F = HH.flight;
const LEVELS = Array.from({ length: 14 }, (_, i) => i + 1);
const SEEDS = [1, 7, 42, 99, 1234, 31337, 2024, 555];

/* ---------- oracoli ---------- */
// imbarco: si ricostruisce chi è a bordo dagli eventi visibili (entra / esce)
function countAboard(steps) {
  const on = new Set();
  for (const st of steps) for (const id of st.ids) { if (st.k === 'in') { assert.ok(!on.has(id), 'entra due volte senza uscire'); on.add(id); } else { assert.ok(on.has(id), 'esce chi non c\'è'); on.delete(id); } }
  return on.size;
}
// bagagli: risolutore a backtracking sulle capienze libere (non usa la soluzione del generatore)
function packBags(freeCaps, sizes) {
  const order = sizes.map((sz, i) => [sz, i]).sort((a, b) => b[0] - a[0]);
  const fr = freeCaps.slice(), out = new Array(sizes.length);
  const go = (k) => {
    if (k === order.length) return true;
    const [sz, i] = order[k], tried = new Set();
    for (let b = 0; b < fr.length; b++) {
      if (fr[b] < sz || tried.has(fr[b])) continue;
      tried.add(fr[b]);
      fr[b] -= sz; out[i] = b;
      if (go(k + 1)) return true;
      fr[b] += sz;
    }
    return false;
  };
  return go(0) ? out : null;
}
const SACK_OF = { cup: 'plastic', bottle: 'plastic', napkin: 'paper', paper: 'paper', peel: 'food', core: 'food' };

/* ---------- bot con reazioni umane ----------
 * react = secondi tra un tocco e l'altro; il bot "vede" solo ciò che è disegnato (cinture, fumetti, lancette). */
function bot(s, react = 0.55, dt = 0.05) {
  const stats = { timeouts: 0, impatient: 0, burnt: 0 };
  let guard = 0;
  while (!F.isWon(s)) {
    assert.ok(guard++ < 400000, `bot bloccato in ${F.phase(s)}`);
    const ph = s.ph, P = s.plan[ph.id];
    if (ph.done) { F.advance(s); continue; }
    if (!ph.go) F.start(s);
    if (ph.id === 'board') {
      while (!s.ph.asking) F.step(s, dt);
      const n = countAboard(P.steps);
      const want = P.ask === 'missing' ? P.booked - n : n;
      assert.equal(F.answer(s, want), 'ok');
      continue;
    }
    if (ph.id === 'bags') {
      const caps = P.bins.map((_, b) => F.free(s, b));
      const sol = packBags(caps, P.bags.map((b) => b.size));
      assert.ok(sol, `bagagli impossibili L${s.level} seed ${s.seed}`);
      sol.forEach((bin, i) => assert.equal(F.move(s, i, bin), 'ok'));
      continue;
    }
    // fasi a tempo: un'azione ogni `react` secondi
    let cool = react;
    const ev = [];
    while (!s.ph.done) {
      ev.push(...F.step(s, dt));
      if (s.ph.done) break;
      cool -= dt;
      if (cool > 0) continue;
      const q = s.ph;
      let acted = false;
      if (q.id === 'belts') {
        const pid = q.belt.findIndex((b) => b === 0);
        if (pid >= 0) { F.nag(s, pid); acted = true; }
      } else if (q.id === 'galley') {
        const G = s.plan.galley;
        const slot = q.heat.findIndex((h, i) => h >= G.ready[i] + 0.25);
        if (slot >= 0) { assert.equal(F.oven(s, slot), 'hot'); acted = true; }
        else if (q.heat.some((h) => h < 0) && F.mealsLeft(s) > 0) { F.oven(s, q.heat.findIndex((h) => h < 0)); acted = true; }
        else if (!q.cap) { assert.notEqual(F.addIng(s, G.recipe[q.tray.length]), 'wrong'); acted = true; }
      } else if (q.id === 'serve') {
        const a = q.act.slice().sort((x, y) => x.pat - y.pat)[0];
        if (a) { assert.notEqual(F.give(s, a.pid, a.items[0]), 'wrong'); acted = true; }
      } else if (q.id === 'trash') {
        const T = s.plan.trash, i = q.got.findIndex((g) => !g);
        const sack = T.sacks.length === 1 ? 'all' : SACK_OF[T.items[i].kind];
        assert.equal(F.collect(s, i, sack), 'ok'); acted = true;
      }
      if (acted) cool = react;
    }
    ev.forEach((e) => { if (e.type === 'timeout') stats.timeouts++; if (e.type === 'impatient') stats.impatient++; if (e.type === 'burnt') stats.burnt++; });
  }
  return stats;
}

/* ---------- test ---------- */
test('curva di difficoltà: fasi che si sbloccano e parametri monotoni', () => {
  assert.deepEqual(F.config(1).phases, ['board', 'belts', 'serve']);
  assert.deepEqual(F.config(2).phases, ['board', 'bags', 'belts', 'serve']);
  assert.deepEqual(F.config(3).phases, ['board', 'bags', 'belts', 'galley', 'serve']);
  assert.deepEqual(F.config(4).phases, F.PHASES);
  assert.equal(F.config(2).isNew, 'bags'); assert.equal(F.config(3).isNew, 'galley'); assert.equal(F.config(4).isNew, 'trash');
  assert.equal(F.config(1).isNew, null); assert.equal(F.config(5).isNew, null);
  const keys = [(c) => c.rows, (c) => c.pax, (c) => c.belts.unb, (c) => c.belts.stub, (c) => c.belts.rebels, (c) => c.serve.reqs, (c) => c.serve.items,
    (c) => c.galley.len, (c) => c.trash.n, (c) => c.trash.sacks, (c) => c.bags.loose, (c) => -c.bags.slack, (c) => -c.serve.pat, (c) => -c.board.gap, (c) => -c.galley.win, (c) => -c.belts.mult];
  for (let L = 2; L <= 20; L++) for (const k of keys) assert.ok(k(F.config(L)) >= k(F.config(L - 1)), `L${L}: ${k}`);
  // almeno 4 gradini distinti di cabina
  assert.ok(new Set(LEVELS.map((L) => F.config(L).rows)).size >= 4);
  // le tratte ruotano
  assert.deepEqual([1, 2, 3, 4].map((L) => F.config(L).route), F.ROUTES);
});

test('generazione deterministica e stato JSON puro', () => {
  for (const L of [1, 4, 9]) {
    const a = F.newGame(L, 77), b = F.newGame(L, 77);
    assert.deepEqual(a, b);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
    assert.notDeepEqual(F.newGame(L, 78).plan, a.plan);
    assert.ok(F.validate(a));
  }
  assert.ok(!F.validate(null)); assert.ok(!F.validate({ v: 1 }));
});

test('imbarco: conteggio ricostruito dagli ingressi, risposte possibili e unica giusta', () => {
  for (const L of LEVELS) for (const seed of SEEDS) {
    const s = F.newGame(L, seed), P = s.plan.board;
    const n = countAboard(P.steps);
    assert.equal(n + P.late.length, s.pax.length, 'ognuno è a bordo o in ritardo');
    const want = P.ask === 'missing' ? P.booked - n : n;
    assert.equal(P.booked, s.pax.length);
    assert.equal(P.opts.filter((o) => o === want).length, 1);
    assert.equal(new Set(P.opts).size, 4);
    assert.ok(P.opts.every((o) => o >= 0));
    if (F.config(L).board.outs) assert.ok(P.steps.some((st) => st.k === 'out'), `L${L}: nessuno torna indietro`);
    // il passeggero che esce rientra sempre
    for (const st of P.steps.filter((x) => x.k === 'out')) assert.ok(P.steps.some((y, j) => j > P.steps.indexOf(st) && y.k === 'in' && y.ids.includes(st.ids[0])));
  }
});

test('imbarco: si risponde solo dopo aver visto tutti, errore → riprova, rivedi', () => {
  const s = F.newGame(5, 3), P = s.plan.board;
  assert.equal(F.answer(s, P.ans), 'invalid');           // non ancora partito
  F.start(s);
  let entered = 0;
  while (!s.ph.asking) entered += F.step(s, 0.1).filter((e) => e.type === 'enter').length;
  assert.equal(entered, P.steps.length);
  const bad = P.opts.find((o) => o !== P.ans);
  assert.equal(F.answer(s, bad), 'wrong');
  assert.equal(F.answer(s, bad), 'invalid');
  assert.equal(s.mistakes, 1);
  assert.ok(F.replay(s));
  assert.equal(s.ph.asking, false);
  while (!s.ph.asking) F.step(s, 0.1);
  assert.equal(F.answer(s, P.ans), 'ok');
  assert.ok(s.ph.done && F.advance(s));
  assert.equal(F.phase(s), 'bags');
});

test('bagagli: entrano sempre nelle cappelliere (risolutore indipendente), capienza rispettata, annulla', () => {
  let tight = 0;
  for (const L of LEVELS.filter((l) => l >= 2)) for (const seed of SEEDS) {
    const s = F.generate(L, seed), P = s.plan.bags;
    const caps = P.bins.map((b) => F.BIN_CAP - b.fill.reduce((a, x) => a + x, 0));
    assert.ok(caps.every((c) => c >= 0 && c <= F.BIN_CAP));
    const sizes = P.bags.map((b) => b.size);
    assert.ok(packBags(caps, sizes), `L${L} seed ${seed}`);
    const slack = caps.reduce((a, b) => a + b, 0) - sizes.reduce((a, b) => a + b, 0);
    assert.equal(slack, F.config(L).bags.slack);
    if (slack === 0) tight++;
    // un solo bagaglio per posto e l'uscita di sicurezza bloccata dai livelli 5+
    const where = P.bags.map((b) => JSON.stringify([b.loc.k, b.loc.row, b.loc.seat]));
    assert.equal(new Set(where).size, where.length);
    if (L >= 5) assert.ok(P.bags.some((b) => b.loc.exit));
    P.bags.filter((b) => b.loc.k === 'seat').forEach((b) => assert.ok(!s.pax.some((p) => p.seat === b.loc.seat), 'borsa su un sedile occupato'));
    P.bags.filter((b) => b.loc.k === 'feet').forEach((b) => assert.ok(s.pax.some((p) => p.seat === b.loc.seat)));
  }
  assert.ok(tight > 10, 'ai livelli alti le cappelliere sono piene al centimetro');
  // mosse: piena → 'full'; annulla torna indietro
  const s = F.newGame(7, 5);
  while (F.phase(s) !== 'bags') { s.ph.done = true; F.advance(s); }
  const big = s.plan.bags.bags.findIndex((b) => b.size >= 2);
  const fullBin = s.plan.bags.bins.findIndex((_, b) => F.free(s, b) < s.plan.bags.bags[big].size);
  assert.equal(F.move(s, big, fullBin), 'full');
  const okBin = s.plan.bags.bins.findIndex((_, b) => F.free(s, b) >= s.plan.bags.bags[big].size);
  const before = F.free(s, okBin);
  assert.equal(F.move(s, big, okBin), 'ok');
  assert.equal(F.free(s, okBin), before - s.plan.bags.bags[big].size);
  assert.ok(F.undo(s));
  assert.equal(F.free(s, okBin), before);
});

test('cinture: testardi, ribelli, sobbalzo; allo scadere si decolla comunque (niente sconfitta)', () => {
  const s = F.newGame(8, 11);
  while (F.phase(s) !== 'belts') { s.ph.done = true; F.advance(s); }
  const P = s.plan.belts;
  assert.equal(F.nag(s, P.ids[0]), 'invalid');             // prima del via
  F.start(s);
  const stub = P.ids.find((id) => P.need[id] >= 2);
  assert.equal(F.nag(s, stub), 'nag');
  const buckled = s.pax.find((p) => !P.ids.includes(p.id));
  assert.equal(F.nag(s, buckled.id), 'invalid');
  // nessuno tocca: allo scadere tutti allacciati da Hari ma tristi
  const ev = [];
  while (!s.ph.done) ev.push(...F.step(s, 0.1));
  assert.ok(ev.some((e) => e.type === 'timeout'));
  assert.ok(s.ph.belt.every((b) => b === 1));
  assert.ok(F.happy(s) <= s.pax.length - P.ids.length);
  // ribelli e sobbalzo con un bot
  const t = F.newGame(8, 11);
  while (F.phase(t) !== 'belts') { t.ph.done = true; F.advance(t); }
  F.start(t);
  const seen = [];
  while (!t.ph.done) {
    seen.push(...F.step(t, 0.25));
    const pid = t.ph.belt.findIndex((b) => b === 0);
    if (pid >= 0) F.nag(t, pid);
  }
  assert.ok(seen.some((e) => e.type === 'unbuckle' && e.why === 'rebel'));
  assert.ok(seen.some((e) => e.type === 'bump'));
  assert.ok(!seen.some((e) => e.type === 'timeout'));
});

test('cucina: ricetta in ordine, fornetto né freddo né bruciato', () => {
  const s = F.newGame(5, 2);
  while (F.phase(s) !== 'galley') { s.ph.done = true; F.advance(s); }
  F.start(s);
  const G = s.plan.galley;
  assert.ok(G.recipe.every((x) => G.palette.includes(x)));
  assert.equal(new Set(G.palette).size, G.palette.length);
  const wrong = G.palette.find((x) => x !== G.recipe[0]);
  assert.equal(F.addIng(s, wrong), 'wrong');
  assert.equal(F.oven(s, 0), 'load');
  F.step(s, 0.5);
  assert.equal(F.oven(s, 0), 'cold');
  // bruciato: si lascia scaldare troppo
  const ev = [];
  for (let i = 0; i < 200 && !ev.some((e) => e.type === 'burnt'); i++) ev.push(...F.step(s, 0.05));
  assert.ok(ev.some((e) => e.type === 'ding') && ev.some((e) => e.type === 'burnt'));
  assert.equal(s.ph.heat[0], -1);
  // giusto: dentro la zona verde
  F.oven(s, 0);
  while (s.ph.heat[0] < G.ready[0] + 0.2) F.step(s, 0.05);
  assert.equal(F.oven(s, 0), 'hot');
  assert.equal(s.ph.ready, 1);
  // la zona verde è sempre più lunga di una reazione umana con margine
  for (const L of LEVELS) assert.ok(F.config(L).galley.win >= 1.2);
});

test('servizio: richieste soddisfacibili (pasti = vassoi scaldati, oggetti disponibili), errori leggeri', () => {
  for (const L of LEVELS) for (const seed of SEEDS) {
    const s = F.generate(L, seed), P = s.plan.serve;
    const meals = P.reqs.reduce((n, r) => n + r.items.filter((x) => x === 'meal').length, 0);
    assert.equal(meals, s.plan.galley ? s.plan.galley.meals : 0);
    P.reqs.forEach((r) => r.items.forEach((x) => assert.ok(P.pool.includes(x), `${x} non sul carrello`)));
    assert.equal(new Set(P.reqs.map((r) => r.pid)).size, P.reqs.length);
    P.reqs.forEach((r) => assert.ok(s.pax[r.pid]));
  }
  const s = F.newGame(1, 9);
  while (F.phase(s) !== 'serve') { s.ph.done = true; F.advance(s); }
  F.start(s);
  while (!s.ph.act.length) F.step(s, 0.1);
  const a = s.ph.act[0];
  const other = s.plan.serve.pool.find((x) => !a.items.includes(x));
  assert.equal(F.give(s, a.pid, other), 'wrong');
  assert.equal(F.give(s, a.pid, a.items[0]), 'served');
});

test('rifiuti: un sacco, poi carta/plastica, poi anche umido', () => {
  for (const L of [4, 5, 7, 12]) for (const seed of SEEDS) {
    const s = F.generate(L, seed), T = s.plan.trash;
    assert.equal(T.sacks.length, F.config(L).trash.sacks);
    T.items.forEach((it) => { assert.ok(s.pax.some((p) => p.seat === it.seat)); if (T.sacks.length > 1) assert.ok(T.sacks.includes(SACK_OF[it.kind]), `${it.kind} senza sacco`); });
    assert.equal(new Set(T.items.map((it) => it.seat)).size, T.items.length);
  }
  const s = F.newGame(7, 4);
  while (F.phase(s) !== 'trash') { s.ph.done = true; F.advance(s); }
  F.start(s);
  const it = s.plan.trash.items[0], bad = s.plan.trash.sacks.find((k) => k !== SACK_OF[it.kind]);
  assert.equal(F.collect(s, 0, bad), 'wrong');
  assert.equal(F.collect(s, 0, SACK_OF[it.kind]), 'ok');
  assert.equal(F.collect(s, 0, SACK_OF[it.kind]), 'invalid');
});

test('bot con reazioni umane (0,55 s) vince i livelli 1–14 senza timeout né pazienza finita, 3 fragoline', () => {
  for (const L of LEVELS) for (const seed of SEEDS.slice(0, 5)) {
    const s = F.newGame(L, seed);
    const st = bot(s);
    assert.ok(F.isWon(s));
    assert.equal(st.timeouts, 0, `L${L} seed ${seed}: timeout`);
    assert.equal(st.impatient, 0, `L${L} seed ${seed}: pazienza finita`);
    assert.equal(st.burnt, 0, `L${L} seed ${seed}: bruciato`);
    assert.equal(F.happy(s), s.pax.length);
    assert.equal(F.rate(s), 3, `L${L}: fragoline ${F.rate(s)} pen ${F.penalty(s)}`);
    assert.equal(F.progress(s), 1);
  }
});

test('bot lento (0,9 s) vince comunque i livelli 1–10: tempi con margine', () => {
  for (const L of LEVELS.slice(0, 10)) for (const seed of SEEDS.slice(0, 3)) {
    const s = F.newGame(L, seed);
    const st = bot(s, 0.9);
    assert.ok(F.isWon(s));
    assert.equal(st.timeouts, 0, `L${L} seed ${seed}: timeout con reazioni lente`);
    assert.ok(F.rate(s) >= 2, `L${L}: ${F.rate(s)}`);
  }
});

test('errori e passeggeri tristi abbassano le fragoline ma non fanno perdere', () => {
  const s = F.newGame(3, 8);
  // imbarco con due errori, poi tutto lasciato scadere
  F.start(s); while (!s.ph.asking) F.step(s, 0.2);
  const P = s.plan.board;
  P.opts.filter((o) => o !== P.ans).slice(0, 2).forEach((o) => F.answer(s, o));
  F.answer(s, P.ans);
  let guard = 0;
  while (!F.isWon(s) && guard++ < 100000) {
    if (s.ph.done) { F.advance(s); continue; }
    if (!s.ph.go) F.start(s);
    if (s.ph.id === 'bags') { const caps = s.plan.bags.bins.map((_, b) => F.free(s, b)); packBags(caps, s.plan.bags.bags.map((b) => b.size)).forEach((b, i) => F.move(s, i, b)); continue; }
    if (s.ph.id === 'galley') { s.plan.galley.recipe.forEach((x) => F.addIng(s, x)); for (let i = 0; i < s.plan.galley.meals; i++) { F.oven(s, 0); while (s.ph.heat[0] < s.plan.galley.ready[0] + 0.2) F.step(s, 0.1); F.oven(s, 0); } continue; }
    if (s.ph.id === 'serve') { F.step(s, 0.5); s.ph.act.slice().forEach((a) => { if (a.pat <= 0) a.items.slice().forEach((x) => F.give(s, a.pid, x)); }); continue; }
    F.step(s, 0.5);
  }
  assert.ok(F.isWon(s));
  assert.ok(F.happy(s) < s.pax.length);
  assert.ok(F.rate(s) < 3);
  assert.ok(F.rate(s) >= 1);
});

test('ripresa da JSON a metà di ogni fase: stessa partita, stesso esito', () => {
  for (const L of [3, 6, 10]) {
    const a = F.newGame(L, 21);
    // gioca fino a metà del servizio
    let k = 0;
    const b0 = () => {
      const ph = a.ph;
      if (ph.done) return F.advance(a);
      if (!ph.go) return F.start(a);
      if (ph.id === 'board') { if (!ph.asking) F.step(a, 0.1); else F.answer(a, a.plan.board.ans); return; }
      if (ph.id === 'bags') { const caps = a.plan.bags.bins.map((_, b) => F.free(a, b)); return packBags(caps, a.plan.bags.bags.map((x) => x.size)).forEach((b, i) => F.move(a, i, b)); }
      F.step(a, 0.1);
      if (ph.id === 'serve' && ph.act.length && k++ % 10 === 0) F.give(a, ph.act[0].pid, ph.act[0].items[0]);
      if (ph.id === 'belts') { const p = ph.belt.indexOf(0); if (p >= 0 && k++ % 5 === 0) F.nag(a, p); }
      if (ph.id === 'galley') { if (!ph.cap) F.addIng(a, a.plan.galley.recipe[ph.tray.length]); const sl = ph.heat.findIndex((h, i) => h >= a.plan.galley.ready[i] + 0.2); if (sl >= 0) F.oven(a, sl); else if (F.mealsLeft(a) > 0 && ph.heat.indexOf(-1) >= 0) F.oven(a, ph.heat.indexOf(-1)); }
    };
    while (F.phase(a) !== 'serve' || a.ph.done_n < 2) b0();
    const b = JSON.parse(JSON.stringify(a));
    assert.ok(F.validate(b));
    for (let i = 0; i < 60; i++) { assert.deepEqual(F.step(b, 0.1), F.step(a, 0.1)); }
    assert.deepEqual(b, a);
    assert.equal(F.progress(b), F.progress(a));
    assert.ok(F.progress(a) > 0.4 && F.progress(a) < 1);
  }
});

test('progress cresce fase dopo fase', () => {
  const s = F.newGame(6, 3);
  let last = -1;
  const seen = [];
  bot(s);
  const t = F.newGame(6, 3);
  while (!F.isWon(t)) { const p = F.progress(t); assert.ok(p >= last); last = p; seen.push(F.phase(t)); t.ph.done = true; F.advance(t); }
  assert.deepEqual(seen, F.PHASES);
  assert.ok(F.parTime(t) > 30);
});

test(`generazione veloce: < ${10 * SLOW} ms per volo`, () => {
  for (const L of [1, 4, 8, 14]) {
    const T = 40, t0 = performance.now();
    for (let k = 0; k < T; k++) F.newGame(L, k * 97 + L);
    const ms = (performance.now() - t0) / T;
    assert.ok(ms < 10 * SLOW, `L${L}: ${ms.toFixed(2)} ms`);
  }
});

test('file del gioco: solo token CSS, niente colori letterali in UI e disegni', () => {
  for (const f of ['src/games/flight-ui.js', 'src/games/flight-art.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(src), `${f}: colore esadecimale`);
    assert.ok(!/rgba?\(/.test(src), `${f}: rgb()`);
  }
  const css = fs.readFileSync(path.join(root, 'src/games/flight.css'), 'utf8');
  assert.match(css, /--tint-flight/);
  assert.equal((css.match(/--tint-flight:/g) || []).length, 3, 'tinta nei due temi (chiaro + scuro di sistema + scuro forzato)');
});
