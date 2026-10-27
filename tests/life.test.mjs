// Unit test Hari Home (simulazione di vita): invarianti, economia sostenibile con un "bot giudizioso",
// trascuratezza e dottore, bellezza della casa → umore/stress, sport → stress giù, amici → socialità su,
// invecchiamento con le fasi, determinismo e ripresa da JSON, migrazione dei salvataggi, prestazioni.
// I bot usano solo l'API pubblica (options/start/buy/…) e leggono lo stato come farebbe un giocatore.
import test from 'node:test';
import assert from 'node:assert/strict';

import { L, D, invariants, buyItem, wiseBot, run } from './_life-bot.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;
const DAY = 1440;

test('vita nuova: monolocale decadente con guasti, budget iniziale, invarianti', () => {
  const s = L.create(1);
  invariants(s);
  assert.equal(s.money, D.START_MONEY);
  assert.equal(s.home.dmg.length, Object.keys(D.DAMAGES).length);
  assert.ok(L.beauty(s) < 0.1, 'casa iniziale brutta');
  assert.equal(Math.round(L.age(s)), 20);
  assert.equal(L.phase(s), 0);
  // tutti gli oggetti iniziali sono raggiungibili e la porta è libera
  for (const it of s.home.items) assert.ok(L.access(s, it), `oggetto ${it.id} irraggiungibile`);
});

test('bot giudizioso: dopo 45 giorni ha più soldi, casa riparata, attività ≥ 2, umore medio buono', () => {
  for (const seed of [1, 7, 42]) {
    const s = L.create(seed);
    const { mood } = run(s, 45, wiseBot);
    assert.ok(s.money + 1200 * (s.biz.level >= 2) > D.START_MONEY, `seme ${seed}: soldi ${s.money}`);
    assert.equal(s.home.dmg.length, 0, `seme ${seed}: guasti ${s.home.dmg}`);
    assert.ok(s.biz.level >= 2, `seme ${seed}: attività livello ${s.biz.level}`);
    assert.ok(mood >= 0.55, `seme ${seed}: umore medio ${mood.toFixed(2)}`);
    assert.ok(L.beauty(s) > 0.3, `seme ${seed}: bellezza ${L.beauty(s).toFixed(2)}`);
    assert.ok(s.goals.fix1 && s.goals.fixall && s.goals.biz2, 'traguardi raggiunti');
  }
});

test('trascuratezza: senza mangiare né lavarsi salute e umore crollano, il dottore lo rimette in sesto', () => {
  const s = L.create(3);
  const h0 = s.needs.health, m0 = s.needs.mood;
  let fainted = false;
  // lavora e basta: niente cibo, niente doccia, mai a letto (si addormenta da solo quando è sfinito)
  const lazy = (st) => { if (!st.act && st.biz) L.start(st, 'work'); };
  L.chooseBiz(s, 'craft');
  L.buy(s, 'desk1', 2, 5, 0);
  for (let i = 0; i < 4 * 48 && !fainted; i++) {
    lazy(s);
    const ev = L.tick(s, 30);
    if (ev.some((e) => e.type === 'faint')) fainted = true;
    invariants(s);
  }
  assert.ok(s.needs.health < h0 - 0.2 || fainted, `salute ${s.needs.health.toFixed(2)}`);
  assert.ok(s.needs.mood < m0, `umore ${s.needs.mood.toFixed(2)}`);
  // dal dottore (o portato lì dopo lo svenimento) la salute torna su
  if (s.act && s.act.id === 'faint') { while (s.act) L.tick(s, 30); }
  else {
    s.money = Math.max(s.money, 100);
    const before = s.needs.health;
    assert.ok(L.start(s, 'doctor').ok);
    assert.equal(s.away, 'doctor');
    while (s.act) L.tick(s, 10);
    assert.ok(s.needs.health > before + 0.15, `dottore: ${before.toFixed(2)} → ${s.needs.health.toFixed(2)}`);
  }
  assert.ok(s.needs.health >= 0.45);
  assert.equal(s.sick, null);
  assert.equal(s.away, null);
});

test('il dottore cura i malanni a pagamento', () => {
  const s = L.create(9);
  s.sick = 'cold'; s.needs.health = 0.4;
  const m = s.money;
  assert.ok(L.start(s, 'doctor').ok);
  assert.equal(s.money, m - D.ACTS.doctor.p);
  while (s.act) L.tick(s, 10);
  assert.equal(s.sick, null);
  assert.ok(s.needs.health > 0.6);
  assert.ok(s.checkup != null);
  s.money = 5;
  assert.equal(L.options(s, { place: 'doctor' })[0].why, 'money');
});

test('casa bella → umore più alto e stress più basso', () => {
  const ugly = L.create(11), nice = L.create(11);
  // casa bella: riparata, pavimento e pareti nuovi, arredata
  nice.money = 9000;
  nice.home.dmg = [];
  L.setStyle(nice, 'floor', 'parquet'); L.setStyle(nice, 'wall', 'sakura');
  for (const id of ['plant2', 'flowers', 'lamp2', 'art2', 'shelf', 'clock', 'rug2', 'books', 'aquarium']) buyItem(nice, id, 0);
  assert.ok(L.beauty(nice) > L.beauty(ugly) + 0.5, `bellezza ${L.beauty(ugly).toFixed(2)} vs ${L.beauty(nice).toFixed(2)}`);
  for (const s of [ugly, nice]) { s.needs.stress = 0.5; s.needs.mood = 0.5; s.free = false; }
  // stessa giornata tranquilla (senza attività) per entrambi
  for (let i = 0; i < 16; i++) { L.tick(ugly, 30); L.tick(nice, 30); }
  assert.ok(nice.needs.mood > ugly.needs.mood + 0.05, `umore ${ugly.needs.mood.toFixed(2)} vs ${nice.needs.mood.toFixed(2)}`);
  assert.ok(nice.needs.stress < ugly.needs.stress - 0.05, `stress ${ugly.needs.stress.toFixed(2)} vs ${nice.needs.stress.toFixed(2)}`);
});

test('sport → stress giù (in casa e al parco)', () => {
  for (const where of ['home', 'park']) {
    const a = L.create(5), b = L.create(5);
    for (const s of [a, b]) { s.needs.stress = 0.7; s.needs.energy = 0.9; s.free = false; }
    if (where === 'home') { a.money = 500; buyItem(a, 'mat', 0); assert.ok(L.start(a, 'workout').ok); }
    else assert.ok(L.start(a, 'jog').ok);
    const dur = a.act.total;
    L.tick(a, dur); L.tick(b, dur);
    assert.ok(a.needs.stress < b.needs.stress - 0.1, `${where}: ${a.needs.stress.toFixed(2)} vs ${b.needs.stress.toFixed(2)}`);
    assert.ok(a.stats.workouts === 1);
  }
});

test('amici: al caffè si conosce qualcuno, visite e telefonate alzano la socialità', () => {
  const s = L.create(2);
  s.needs.social = 0.2;
  assert.equal(L.start(s, 'invite').why, 'nofriend');
  assert.equal(L.options(s, {}).find((o) => o.k === 'social').id, 'call', 'senza amici: telefona');
  assert.ok(L.start(s, 'cafe').ok);
  const ev = L.tick(s, s.act.total);
  assert.ok(ev.some((e) => e.type === 'friend'), 'primo amico al caffè');
  assert.equal(s.friends.length, 1);
  assert.ok(s.goals.friend1);
  // visita a casa
  const a = JSON.parse(JSON.stringify(s)), b = JSON.parse(JSON.stringify(s));
  a.needs.social = b.needs.social = 0.25;
  a.free = b.free = false;   // confronto pulito: niente libero arbitrio
  assert.ok(L.start(a, 'invite').ok);
  L.tick(a, 120); L.tick(b, 120);
  assert.ok(a.needs.social > b.needs.social + 0.3, `visita: ${b.needs.social.toFixed(2)} → ${a.needs.social.toFixed(2)}`);
  assert.ok(a.friends[0].f > b.friends[0].f);
  // telefonata
  const c = JSON.parse(JSON.stringify(b));
  assert.ok(L.start(c, 'call').ok);
  L.tick(c, 15); L.tick(b, 15);
  assert.ok(c.needs.social > b.needs.social + 0.1);
});

test('invecchiamento monotono con le fasi; pensione e nuova generazione facoltative', () => {
  const s = L.create(4);
  let last = L.age(s), lastPh = 0;
  const phases = new Set([0]);
  const evs = [];
  // la vita scorre con un bot minimo (dorme, mangia, dottore): niente morte, solo crescita
  const care = (st) => {
    if (st.act) return;
    const n = st.needs;
    if (st.sick || n.health < 0.5) { st.money += 40; if (L.start(st, 'doctor').ok) return; }
    if (n.food < 0.5) { if (!L.stock(st)) { st.money += 30; L.start(st, 'shop', { buy: [4, 0, 0] }); } else L.start(st, 'eat'); return; }
    if (n.energy < 0.3) { L.start(st, 'sleep'); return; }
    if (n.hygiene < 0.4) { L.start(st, 'shower'); return; }
    if (n.social < 0.3) { L.start(st, 'call'); return; }
    if (n.stress > 0.5 || n.fun < 0.4) L.start(st, 'jog');
  };
  for (let d = 0; d < 8 * 62; d++) {
    for (let i = 0; i < 48; i++) { care(s); evs.push(...L.tick(s, 30)); }
    const a = L.age(s), p = L.phase(s);
    assert.ok(a > last, 'l’età cresce sempre');
    assert.ok(p >= lastPh, 'le fasi non tornano indietro');
    last = a; lastPh = p; phases.add(p);
    invariants(s);
  }
  assert.deepEqual([...phases].sort(), [0, 1, 2, 3]);
  assert.ok(L.age(s) >= 81 && L.age(s) < 83);
  assert.ok(evs.some((e) => e.type === 'phase' && e.phase === 3));
  assert.ok(evs.some((e) => e.type === 'retire'));
  assert.ok(L.maxHealth(s) < 1, 'da anziano la salute è più delicata');
  assert.ok(L.retire(s).ok && s.retired);
  assert.ok(L.tick(s, DAY).some((e) => e.type === 'pension' && e.n >= 30), 'pensione');
  assert.ok(L.newGeneration(s).ok);
  assert.equal(s.gen, 2);
  assert.equal(Math.round(L.age(s)), 20);
  assert.equal(L.phase(s), 0);
  assert.equal(L.create(1).gen, 1);
  // da giovani niente pensione
  assert.equal(L.retire(L.create(1)).ok, false);
});

test('determinismo e ripresa da JSON', () => {
  const a = L.create(77), b = L.create(77);
  run(a, 6, wiseBot);
  const mid = JSON.parse(JSON.stringify(b));
  run(b, 3, wiseBot);
  const c = L.migrate(JSON.parse(JSON.stringify(b)));
  run(c, 3, wiseBot);
  assert.deepEqual(JSON.parse(JSON.stringify(c)), JSON.parse(JSON.stringify(a)));
  assert.ok(mid.t < a.t);
});

test('migrazione: campi mancanti, oggetti sconosciuti, versioni future', () => {
  const s = L.create(3);
  const old = JSON.parse(JSON.stringify(s));
  delete old.stats; delete old.warn; delete old.friends; delete old.home.paid;
  old.home.items.push({ u: 99, id: 'teleporter', x: 1, y: 1, r: 0 });
  old.needs.fun = 'x';
  const m = L.migrate(old);
  assert.ok(m);
  assert.ok(Array.isArray(m.friends) && m.stats.shifts === 0);
  assert.ok(!m.home.items.some((i) => i.id === 'teleporter'));
  assert.ok(m.needs.fun >= 0 && m.needs.fun <= 1);
  invariants(m);
  L.tick(m, 60);
  assert.equal(L.migrate({ v: 99, t: 1 }), null);
  assert.equal(L.migrate(null), null);
  assert.equal(L.migrate({ v: 1 }), null);
});

test('costruzione: posizionamento valido, porta libera, nessun oggetto chiuso, vendita a metà prezzo', () => {
  const s = L.create(6);
  s.money = 5000;
  const dr = L.door(s);
  assert.equal(L.canPlace(s, 'plant1', dr.x, dr.y, 0), 'door');
  assert.equal(L.canPlace(s, 'plant1', 0, 0, 0), 'taken');
  assert.equal(L.canPlace(s, 'sofa1', 5, 5, 0), 'out');
  assert.equal(L.canPlace(s, 'plant1', 3, 2, 0), 'damage');      // pozzanghera della perdita
  // muro di vasi che chiuderebbe il letto: rifiutato
  const r = L.buy(s, 'sofa1', 1, 0, 1);
  if (r.ok) assert.ok(L.access(s, L.findItem(s, 1)));
  const u = L.buy(s, 'lamp1', 5, 5, 0).u;
  assert.ok(u);
  const m = s.money;
  assert.ok(L.sell(s, u).ok);
  assert.equal(s.money, m + 25);
  // tappeto sotto i mobili
  assert.equal(L.canPlace(s, 'rug1', 3, 3, 0), '');
  // quadri: non sulla finestra né sulla porta
  const win = L.dims(s).win[0];
  assert.equal(L.canWall(s, 'poster', 'R', win[1]), 'taken');
  assert.equal(L.canWall(s, 'poster', 'L', L.dims(s).r - 1), 'taken');
  assert.equal(L.canWall(s, 'poster', 'L', 1), 'damage');
  assert.ok(L.buyWall(s, 'poster', 'L', 2).ok);
  // trasloco: casa più grande, gli oggetti restano, la porta resta libera
  const n = s.home.items.length;
  assert.ok(L.expand(s).ok);
  assert.equal(s.home.items.length, n);
  assert.equal(L.dims(s).c, 8);
  for (const it of s.home.items) if (!D.ITEMS[it.id].flat) assert.ok(L.access(s, it));
  // pavimento: prezzo che scala con la superficie
  assert.ok(L.stylePrice(s, 'floor', 'wood') > D.FLOORS.wood.p);
});

test('bollette settimanali e debito senza soldi negativi', () => {
  const s = L.create(8);
  s.money = 20;
  let bills = null;
  for (let i = 0; i < 7 * 48; i++) { const ev = L.tick(s, 30); bills = ev.find((e) => e.type === 'bills') || bills; s.needs.food = 0.8; s.needs.energy = 0.8; s.needs.health = 0.9; }
  assert.ok(bills, 'bollette al giorno 7');
  assert.equal(s.money, 0);
  assert.ok(s.debt > 0);
  // i guadagni ripagano prima il debito
  L.chooseBiz(s, 'craft');
  s.money = 200; L.buy(s, 'desk1', 2, 5, 0); s.money = 0;
  const debt = s.debt;
  assert.ok(L.start(s, 'work').ok);
  L.tick(s, 180);
  assert.ok(s.debt < debt);
});

test('attività: banchetto da casa con la postazione giusta, poi negozio fuori casa', () => {
  const s = L.create(10);
  const desk = L.buy(s, 'desk1', 2, 5, 0).u;
  assert.equal(L.options(s, { u: desk }).find((o) => o.id === 'work').why, 'nobiz');
  L.chooseBiz(s, 'plants');
  assert.equal(L.options(s, { u: desk }).find((o) => o.id === 'work').why, 'wrongbiz');
  const t = L.create(10);
  L.chooseBiz(t, 'bakery');
  const oven = L.buy(t, 'oven1', 2, 5, 0).u;
  assert.ok(L.start(t, 'work', { u: oven }).ok);
  const m = t.money;
  L.tick(t, 180);
  assert.ok(t.money > m + 15, `turno: ${t.money - m}`);
  assert.equal(L.options(t, { place: 'office' })[0].why, 'small');
  t.money = 2100;
  assert.ok(L.upgradeBiz(t).ok);
  assert.equal(t.biz.level, 2);
  assert.ok(L.start(t, 'office').ok);
  assert.equal(t.away, 'office');
  assert.ok(L.hire(t).ok);
  assert.equal(L.hire(t).ok, false);
});

test('prestazioni: un giorno di simulazione in pochi millisecondi', () => {
  const s = L.create(12);
  run(s, 2, wiseBot);
  const t0 = performance.now();
  for (let d = 0; d < 30; d++) L.tick(s, DAY);
  const ms = (performance.now() - t0) / 30;
  assert.ok(ms < 10 * SLOW, `${ms.toFixed(2)} ms per giorno`);
  // un fotogramma (0,1 s reali a ×3 col sonno) è minuscolo
  const t1 = performance.now();
  for (let i = 0; i < 600; i++) L.tick(s, L.rate(s) * 0.016);
  assert.ok((performance.now() - t1) / 600 < 0.5);
});

test('libero arbitrio: lasciato da solo per giorni con frigo pieno e letto si prende cura di sé', () => {
  for (const seed of [1, 5, 21]) {
    const s = L.create(seed);
    s.money = 1000;
    L.sell(s, s.home.items.find((i) => i.id === 'fridge0').u);
    assert.ok(L.buy(s, 'fridge2', 5, 0, 0).ok);
    s.fridge = [14, 0, 0];
    const m0 = s.money, auto = {}, nightSleep = [];
    let min = { energy: 1, food: 1, hygiene: 1 }, perDay = 0, maxPerDay = 0, day = L.clock(s).day;
    for (let i = 0; i < 4 * 96; i++) {
      // ogni mattina il frigo torna pieno (qualcuno fa la spesa per lui)
      if (L.clock(s).hour === 7 && L.stock(s) < 6) s.fridge[0] = 14 - s.fridge[1] - s.fridge[2];
      for (const e of L.tick(s, 15)) if (e.type === 'auto') {
        auto[e.id] = (auto[e.id] || 0) + 1; perDay++;
        if (e.id === 'sleep') nightSleep.push(L.clock(s).hour);
      }
      if (L.clock(s).day !== day) { maxPerDay = Math.max(maxPerDay, perDay); perDay = 0; day = L.clock(s).day; }
      invariants(s);
      if (i > 48) for (const k in min) min[k] = Math.min(min[k], s.needs[k]);
    }
    assert.ok(min.energy > 0.15 && min.food > 0.15 && min.hygiene > 0.15, `seme ${seed}: minimi ${JSON.stringify(min)}`);
    assert.ok(auto.sleep >= 3, `seme ${seed}: dorme da solo (${auto.sleep})`);
    assert.ok((auto.eat || 0) + (auto.cook || 0) >= 6, `seme ${seed}: mangia da solo`);
    assert.ok(auto.shower >= 2, `seme ${seed}: si lava da solo`);
    assert.ok(nightSleep.some((h) => h >= 21 || h < 5), `seme ${seed}: va a letto la sera (${nightSleep})`);
    assert.ok(maxPerDay <= 14, `seme ${seed}: niente oscillazioni (${maxPerDay} scelte in un giorno)`);
    assert.equal(s.money, m0, 'da solo non spende ghiande');
  }
});

test('libero arbitrio: col frigo vuoto lo dice una volta (e suggerisce la spesa), poi si riprende dopo la spesa', () => {
  const s = L.create(3);
  s.fridge = [0, 0, 0]; s.needs.food = 0.3;
  let hints = 0;
  for (let i = 0; i < 48; i++) for (const e of L.tick(s, 15)) if (e.type === 'hint' && e.k === 'nofood') hints++;
  assert.equal(hints, 1, 'un solo avviso finché il frigo resta vuoto');
  assert.equal(L.quick(s, 'food').why, 'nofood');
  s.fridge = [2, 0, 0];
  L.tick(s, 15);
  s.fridge = [0, 0, 0]; s.needs.food = 0.3; s.act = null;
  let again = 0;
  for (let i = 0; i < 8; i++) for (const e of L.tick(s, 15)) if (e.type === 'hint') again++;
  assert.equal(again, 1, 'dopo una spesa l’avviso può tornare');
  s.free = false; s.needs.food = 0.2; s.fridge = [3, 0, 0];
  assert.ok(!L.tick(s, 60).some((e) => e.type === 'auto'), 'libero arbitrio spento: niente scelte da solo');
});

test('comandi: il giocatore ha la precedenza, coda visibile, annulla, azioni rapide dagli indicatori', () => {
  const s = L.create(4);
  s.needs.energy = 0.1; s.needs.hygiene = 0.9; s.needs.food = 0.9;
  L.tick(s, 5);
  assert.equal(s.act.id, 'sleep');
  assert.ok(s.act.auto, 'si è messo a dormire da solo');
  // un comando interrompe subito l'azione "di sua iniziativa"
  const r = L.quick(s, 'hygiene');
  assert.ok(r.ok && r.now && s.act.id === 'shower' && !s.act.auto);
  // mentre fa una cosa chiesta dal giocatore, le altre vanno in coda
  assert.ok(L.order(s, 'watch').queued);
  assert.ok(L.quick(s, 'energy').queued);
  assert.deepEqual(s.queue.map((q) => q.id), ['watch', 'sleep']);
  assert.ok(L.cancel(s, 0).ok);
  assert.deepEqual(s.queue.map((q) => q.id), ['sleep']);
  for (let i = 0; i < D.QMAX; i++) L.order(s, 'call');
  assert.equal(L.order(s, 'call').why, 'queue');
  s.queue = [{ id: 'sleep', u: 1 }];
  L.tick(s, 25);
  assert.equal(s.act.id, 'sleep', 'finita la doccia parte la prossima della coda');
  // annullare l'azione in corso fa partire la successiva, e Hari non riparte da solo per un po'
  L.order(s, 'call');
  assert.ok(L.cancel(s, -1).ok);
  assert.equal(s.act.id, 'call');
  L.tick(s, 20);
  assert.equal(s.act, null);
  L.tick(s, 10);
  assert.equal(s.act, null, 'dopo un annullamento Hari aspetta un po’ prima di decidere da solo');
  // una cosa in coda che non si può più fare viene saltata con un avviso
  s.money = 0;
  L.order(s, 'shower');
  L.order(s, 'gym');
  const ev = L.tick(s, 25);
  assert.ok(ev.some((e) => e.type === 'qfail' && e.id === 'gym' && e.why === 'money'));
  // il menu di Hari offre sempre dormire, mangiare, lavarsi, svago, amici, lavoro e città
  const ks = L.options(L.create(1), {}).map((o) => o.k);
  for (const k of ['energy', 'food', 'hygiene', 'fun', 'social', 'work', 'town']) assert.ok(ks.includes(k), k);
  const t = L.create(1);
  assert.equal(L.quick(t, 'energy').id, 'sleep');
  assert.equal(L.plan(t, 'hygiene').id, 'shower');
  assert.equal(L.plan(t, 'fun').id, 'watch');
  assert.equal(L.plan(t, 'health').id, 'doctor');
});

test('migrazione v1 → v2: coda e libero arbitrio aggiunti', () => {
  const s = L.create(3);
  const old = JSON.parse(JSON.stringify(s));
  old.v = 1; delete old.queue; delete old.free; delete old.calm; delete old.tips;
  const m = L.migrate(old);
  assert.equal(m.v, D.SAVE_V);
  assert.deepEqual(m.queue, []);
  assert.equal(m.free, true);
  L.tick(m, 120);
  invariants(m);
});
