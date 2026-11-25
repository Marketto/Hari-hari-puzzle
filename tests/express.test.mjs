// Unit test Hari Express: ogni livello vinto dal bot (tests/_express-bot.mjs: vede la mappa come il giocatore e usa
// le stesse azioni della UI) con più semi; determinismo e ripresa da JSON; percorsi A* (costruzione e mezzi, ponti,
// senso unico); treni e semafori senza scontri né blocchi; economia (pagamento che cala coi giorni di viaggio);
// crescita delle città; Libera; punto d'ingresso delle mappe reali.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
import { expressBot } from './_express-bot.mjs';

const HH = load('src/core/rng.js', 'src/games/express-map.js', 'src/games/express-net.js', 'src/games/express-sim.js', 'src/games/express-logic.js');
const E = HH.express, S = HH.expressSim, N = HH.expressNet;
const json = (x) => JSON.parse(JSON.stringify(x));
const bot = expressBot(HH);

/* ---------- un piccolo mondo a mano: Libera piatta, senza acqua ---------- */
function flat(size = 32) {
  const s = E.newFree({ size, water: 0, seed: 5 });
  const W = E.world(s);
  // pianura vuota per le prove (si toccano solo le tabelle dense: la mappa vera non serve qui)
  W.ht.fill(0); W.water.fill(0); W.tree.fill(0); W.use.fill(0); W.road.fill(0); W.troad.fill(0);
  s.towns = []; s.inds = []; s.money = 1e7; W.covDirty = true;
  return { s, W, at: (x, y) => y * W.w + x };
}
const line = (at, x0, y0, x1, y1) => { const t = []; const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0); for (let x = x0, y = y0; ; x += sx, y += sy) { t.push(at(x, y)); if (x === x1 && y === y1) break; } return t; };

test('ogni livello 1–5 (e le prime sfide 6–8) vinto dal bot con più semi', () => {
  for (let level = 1; level <= 8; level++) {
    const seeds = level <= 5 ? 6 : 2;
    for (let k = 1; k <= seeds; k++) {
      const s = E.levelFromSeed(level, level * 7717 + k * 1013);
      assert.ok(!E.isOver(s) && !E.goalState(s).every((g) => g.done), 'mai già risolto');
      bot.play(s);
      assert.ok(s.won, `livello ${level} seme ${k}: ${JSON.stringify(E.goalState(s))}`);
      assert.ok(s.wonH - s.h0 <= E.config(level).hours);
      assert.ok(E.rate(s) >= 1 && E.rate(s) <= 3);
      assert.equal(E.progress(s), 1);
    }
  }
});

test('senza fare niente il livello si perde alla scadenza (nessun obiettivo gratis)', () => {
  for (let level = 1; level <= 5; level++) {
    const s = E.levelFromSeed(level, 99 + level);
    E.step(s, E.TPH * (E.config(level).hours + 2));
    assert.ok(s.lost && !s.won, `livello ${level}`);
    assert.ok(E.progress(s) < 1);
  }
});

test('stesso seme + stesse azioni = stessa partita; ripresa da JSON identica', () => {
  const a = E.levelFromSeed(4, 4242), b = E.levelFromSeed(4, 4242);
  assert.deepEqual(json(a), json(b));
  bot.play(a, 60); bot.play(b, 60);
  assert.deepEqual(json(a), json(b));
  // salvataggio a metà: si riprende da JSON e si continua uguale
  const c = E.levelFromSeed(5, 777);
  bot.play(c, 120);
  const snap = JSON.stringify(c);
  assert.ok(snap.length < 60000, `salvataggio compatto: ${snap.length} byte`);
  const d = E.restore(snap);
  E.step(c, E.TPH * 90); E.step(d, E.TPH * 90);
  assert.deepEqual(json(c), json(d));
  // la mappa non è nel salvataggio (si rigenera dal seme)
  assert.ok(!('ht' in json(c)) && !('_w' in json(c)));
});

test('anteprima = costo vero; il costruttore evita case e acqua larga, fa ponti corti e dritti', () => {
  const { s, W, at } = flat();
  const p = E.preview(s, 'road', at(2, 5), at(12, 5));
  assert.ok(p.ok); assert.equal(p.tiles.length, 11);
  const m0 = s.money;
  assert.ok(E.act(s, { k: 'build', kind: 'road', tiles: p.tiles }).ok);
  assert.equal(m0 - s.money, p.cost);
  // ricostruire sopra costa 0
  assert.equal(E.preview(s, 'road', at(2, 5), at(12, 5)).cost, 0);
  // una casa in mezzo: si gira attorno
  W.use[at(7, 10)] = 1;
  const q = E.preview(s, 'rail', at(2, 10), at(12, 10));
  assert.ok(q.ok && !q.tiles.includes(at(7, 10)) && q.tiles.length === 13);
  // fiume largo 2 (ponte) e lago largo 7 (oltre i 6 del ponte più lungo: niente ponte)
  for (let y = 0; y < W.h; y++) { W.water[at(20, y)] = 1; W.water[at(21, y)] = 1; }
  const r = E.preview(s, 'road', at(18, 3), at(24, 3));
  assert.ok(r.ok && r.tiles.includes(at(20, 3)) && r.tiles.includes(at(21, 3)));
  assert.ok(E.act(s, { k: 'build', kind: 'road', tiles: r.tiles }).ok);
  for (let y = 0; y < W.h; y++) for (let x = 20; x <= 26; x++) W.water[at(x, y)] = 1;
  const far = E.preview(s, 'rail', at(18, 12), at(28, 12));
  assert.equal(far.ok, false); assert.equal(far.why, 'long_b');
  // un percorso storto o non adiacente viene rifiutato
  assert.equal(E.act(s, { k: 'build', kind: 'road', tiles: [at(1, 1), at(3, 1)] }).ok, false);
});

test('A* dei mezzi: percorso più corto, binario a senso unico rispettato', () => {
  const { s, W, at } = flat();
  // due stazioni ferroviarie collegate da due vie: una corta (riga 5) e una lunga (riga 12)
  E.act(s, { k: 'station', kind: 'rail', tiles: [at(4, 5), at(5, 5)], ax: 1 });
  E.act(s, { k: 'station', kind: 'rail', tiles: [at(20, 5), at(21, 5)], ax: 1 });
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 5, 5, 20, 5) });
  E.act(s, { k: 'build', kind: 'rail', tiles: [...line(at, 21, 5, 23, 5), ...line(at, 23, 6, 23, 12), ...line(at, 22, 12, 2, 12), ...line(at, 2, 11, 2, 5), ...line(at, 3, 5, 4, 5)] });
  const v = { id: 99, type: 'castagna', cars: ['wood'], orders: [{ st: 0 }, { st: 1 }], oi: 1, t: at(5, 5), a: 3, b: 1, p: 0.85, trail: [[at(5, 5), 3, 1]], ahead: [] };
  let r = S.plan(s, W, v, true);
  assert.ok(r && r.tiles.includes(at(12, 5)) && !r.tiles.includes(at(12, 12)), 'strada corta');
  assert.equal(r.tiles[r.tiles.length - 1], at(21, 5), 'si ferma in fondo alla banchina');
  // senso unico verso ovest sulla via corta: il treno fa il giro lungo (si gira e passa dalla riga 12)
  assert.ok(E.act(s, { k: 'oneway', tile: at(12, 5), dir: 3 }).ok);
  r = S.plan(s, W, v, true);
  assert.ok(r && r.tiles.includes(at(12, 12)) && !r.tiles.includes(at(12, 5)), 'giro lungo');
  // strade: il bus a un fondo cieco si gira
  E.act(s, { k: 'build', kind: 'road', tiles: line(at, 3, 20, 15, 20) });
  E.act(s, { k: 'station', kind: 'road', tile: at(3, 20) });
  E.act(s, { k: 'station', kind: 'road', tile: at(15, 20) });
  const bus = { id: 98, type: 'bus', cargo: 'pax', orders: [{ st: 2 }, { st: 3 }], oi: 1, t: at(3, 20), a: 3, b: 1, p: 0.5, trail: [], ahead: [] };
  r = S.plan(s, W, bus, true);
  assert.ok(r && r.tiles[r.tiles.length - 1] === at(15, 20) && r.tiles.length === 12);
});

// un anello con due stazioni, sensi unici e semafori: n treni girano senza scontri e senza blocchi
function loop(signals, trains) {
  const { s, W, at } = flat();
  const A = E.act(s, { k: 'station', kind: 'rail', tiles: [at(6, 6), at(7, 6)], ax: 1 }).id;
  const B = E.act(s, { k: 'station', kind: 'rail', tiles: [at(20, 6), at(21, 6)], ax: 1 }).id;
  // produzione finta: legna sempre pronta in A (industria vicina)
  s.inds.push({ id: 0, type: 'forest', x: 6, y: 3, stock: 0, acc: 0, made: 0, got: 0, lm: 0 });
  s.inds.push({ id: 1, type: 'sawmill', x: 20, y: 3, stock: 0, acc: 0, made: 0, got: 0, lm: 0 });
  W.covDirty = true;
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 7, 6, 20, 6) });
  E.act(s, { k: 'build', kind: 'rail', tiles: [...line(at, 21, 6, 23, 6), ...line(at, 23, 7, 23, 12), ...line(at, 22, 12, 4, 12), ...line(at, 4, 11, 4, 6), ...line(at, 5, 6, 6, 6)] });
  E.act(s, { k: 'oneway', tile: at(12, 6), dir: 1 });
  E.act(s, { k: 'oneway', tile: at(12, 12), dir: 3 });
  if (signals) for (const t of [at(9, 6), at(15, 6), at(18, 6), at(23, 9), at(18, 12), at(12, 12 - 0) + 1, at(8, 12), at(4, 9)]) if (W.rail[t] === 5 || W.rail[t] === 10) E.act(s, { k: 'signal', tile: t });
  const ids = [];
  for (let k = 0; k < trains; k++) {
    let r;
    for (let d = 0; d < 80; d++) { r = E.act(s, { k: 'buy', type: 'castagna', cars: ['wood', 'wood'], orders: [{ st: A }, { st: B }] }); if (r.ok) break; E.step(s, E.TPH); }
    assert.ok(r.ok, 'treno comprato');
    ids.push(r.id);
  }
  return { s, W, ids };
}
// nessuna casella sotto due treni, in ogni passo
function noCrash(s, W, ticks) {
  for (let i = 0; i < ticks; i++) {
    E.step(s, 1);
    const own = new Map();
    for (const v of s.veh) {
      if (!S.isTrain(v)) continue;
      for (let k = 0; k * 0.5 < S.vlen(v); k++) {
        const t = S.along(v, k * 0.5).t;
        if (own.has(t) && own.get(t) !== v.id) return `scontro sulla casella ${t} al passo ${i}`;
        own.set(t, v.id);
      }
    }
  }
  return null;
}
test('treni e semafori: due e tre treni sull\'anello girano senza scontri né blocchi', () => {
  for (const [sig, n] of [[true, 2], [true, 3]]) {
    const { s, W } = loop(sig, n);
    assert.equal(noCrash(s, W, E.TPH * 200), null);
    const laps = {};
    for (const v of s.veh) laps[v.id] = 0;
    // ogni treno continua ad arrivare alle stazioni (niente blocchi)
    for (const e of E.step(s, E.TPH * 200)) if (e.k === 'arrive') laps[e.v]++;
    for (const id in laps) assert.ok(laps[id] > 10, `segnali ${sig}, ${n} treni: il treno ${id} è arrivato solo ${laps[id]} volte`);
  }
  // senza semafori l'anello è un tratto solo: i due treni si aspettano a vicenda (fermi, mai scontrati) e Hari lo dice
  const b = loop(false, 2);
  assert.equal(noCrash(b.s, b.W, E.TPH * 120), null);
  assert.equal(E.coach(b.s), 'ex_c_stuck');
  // aggiungendo i semafori ripartono
  for (const t of [9, 15, 18].map((x) => 6 * b.W.w + x).concat([9 * b.W.w + 23, 12 * b.W.w + 18, 12 * b.W.w + 8, 9 * b.W.w + 4])) E.act(b.s, { k: 'signal', tile: t });
  const arr = E.step(b.s, E.TPH * 120).filter((e) => e.k === 'arrive').length;
  assert.ok(arr > 6, `ripartiti: ${arr} arrivi`);
});

test('treni frontali su binario unico: si fermano senza scontrarsi', () => {
  const { s, W, at } = flat();
  const A = E.act(s, { k: 'station', kind: 'rail', tiles: [at(4, 8), at(5, 8)], ax: 1 }).id;
  const B = E.act(s, { k: 'station', kind: 'rail', tiles: [at(20, 8), at(21, 8)], ax: 1 }).id;
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 5, 8, 20, 8) });
  assert.ok(E.act(s, { k: 'buy', type: 'castagna', cars: ['pax'], orders: [{ st: A }, { st: B }] }).ok);
  assert.ok(E.act(s, { k: 'buy', type: 'castagna', cars: ['pax'], orders: [{ st: B }, { st: A }] }).ok);
  // stazione occupata: un terzo treno lì non si può comprare
  assert.equal(E.act(s, { k: 'buy', type: 'castagna', cars: ['pax'], orders: [{ st: A }, { st: B }] }).err, 'busy');
  assert.equal(noCrash(s, W, E.TPH * 120), null);
});

test('Hari dice "treno bloccato" solo se un altro treno tiene il tratto davanti a lungo', () => {
  // un treno solo su una linea con capolinea: aspetta il pieno (a lungo, poco grano) e si gira in fondo → mai "bloccato"
  const { s, W, at } = flat();
  const A = E.act(s, { k: 'station', kind: 'rail', tiles: [at(6, 6), at(7, 6)], ax: 1 }).id;
  const B = E.act(s, { k: 'station', kind: 'rail', tiles: [at(20, 6), at(21, 6)], ax: 1 }).id;
  s.inds.push({ id: 0, type: 'field', x: 6, y: 3, stock: 0, acc: 0, made: 0, got: 0, lm: 0 });
  s.inds.push({ id: 1, type: 'bakery', x: 20, y: 3, stock: 0, acc: 0, made: 0, got: 0, lm: 0 });
  W.covDirty = true;
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 7, 6, 20, 6) });
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 21, 6, 24, 6) });
  assert.ok(E.act(s, { k: 'buy', type: 'castagna', cars: ['grain', 'grain', 'grain', 'grain', 'grain', 'grain'], orders: [{ st: A, full: true }, { st: B }] }).ok);
  let longLoad = 0, turns = 0;
  for (let i = 0; i < E.TPH * 300; i++) {
    for (const e of E.step(s, 1)) if (e.k === 'depart') turns++;
    const v = s.veh[0];
    if (v.mode === 'load' && v.wt > E.TPH * 8) longLoad++;
    assert.notEqual(E.coach(s), 'ex_c_stuck', `ora ${s.h}: ${v.mode} wt=${v.wt}`);
  }
  assert.ok(longLoad > 0, 'il treno ha aspettato il pieno a lungo');
  assert.ok(turns > 4 && s.del.grain > 0, 'ha fatto avanti e indietro consegnando');
  // due treni frontali su binario unico senza semafori: si aspettano e Hari lo dice
  const b = loop(false, 2);
  E.step(b.s, E.TPH * 30);
  assert.equal(E.coach(b.s), 'ex_c_stuck');
  assert.ok(b.s.veh.some((x) => S.blocked(x)));
});

test('economia: il pagamento cala coi giorni di viaggio, costi e manutenzione si pagano', () => {
  for (const c of S.CARGOS) {
    let prev = Infinity;
    for (let d = 0; d <= 200; d += 5) { const p = S.pay(c, 100, 10, d); assert.ok(p <= prev && p > 0); prev = p; }
    assert.ok(S.pay(c, 100, 10, 0) > S.pay(c, 100, 10, 200), c);
    assert.ok(S.pay(c, 100, 20, 0) > S.pay(c, 100, 10, 0), c);
  }
  // lo stesso giro con un mezzo lento rende meno per unità di uno veloce
  assert.ok(S.pay('bread', 20, 12, 30) < S.pay('bread', 20, 12, 5));
  // esercizio e manutenzione mensili
  const s = E.levelFromSeed(4, 31337);
  bot.play(s, 70);
  assert.ok(s.fin.run > 0 && s.fin.mnt > 0 && s.fin.inc > 0 && s.fin.bld > 0 && s.fin.veh > 0);
});

test('stazioni: valutazione che sale passando spesso e scende se la merce aspetta', () => {
  const s = E.levelFromSeed(2, 2024);
  bot.play(s, 60);
  const st = s.stations.find((x) => x && x.pick.milk && x.wait);
  assert.ok(st.rate.milk > 0.55, `servita bene: ${st.rate.milk}`);
  // si vendono i camion: nessuno passa più, la valutazione scende e la merce se ne va
  for (const v of s.veh.slice()) E.act(s, { k: 'sell', id: v.id });
  const r0 = st.rate.milk;
  E.step(s, E.TPH * 80);
  assert.ok(st.rate.milk < r0 - 0.2, `${r0} → ${st.rate.milk}`);
});

test('le città crescono se servite bene, non se dimenticate', () => {
  const a = E.levelFromSeed(5, 555), b = E.levelFromSeed(5, 555);
  const gp = E.goalState(a).find((g) => g.k === 'pop');
  const p0 = a.towns[gp.town].pop, h0 = a.towns[gp.town].houses.length;
  bot.play(a, 200);
  E.step(b, E.TPH * 200);
  assert.ok(a.towns[gp.town].pop > p0 + 60 && a.towns[gp.town].houses.length > h0, 'servita: cresce con nuove case');
  assert.equal(b.towns[gp.town].pop, p0, 'non servita: resta com\'è');
  // le case nuove non vanno su strade, binari o acqua
  const W = E.world(a);
  for (const i of a.towns[gp.town].houses) assert.ok(!W.water[i] && !W.rail[i] && !W.road[i] && !W.st[i]);
});

test('azioni: demolire, segnali solo sui binari dritti, mezzi bloccati dalle regole', () => {
  const { s, W, at } = flat();
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 2, 2, 8, 2) });
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 5, 2, 5, 6) });
  assert.equal(E.act(s, { k: 'signal', tile: at(5, 2) }).ok, false, 'scambio: niente semaforo');
  assert.ok(E.act(s, { k: 'signal', tile: at(3, 2) }).ok);
  assert.ok(E.act(s, { k: 'demolish', tile: at(3, 2) }).ok && !W.sig[at(3, 2)] && W.rail[at(3, 2)]);
  assert.ok(E.act(s, { k: 'demolish', tile: at(3, 2) }).ok && !W.rail[at(3, 2)] && !(W.rail[at(2, 2)] & 2));
  assert.equal(E.act(s, { k: 'buy', type: 'castagna', cars: ['wood'], orders: [{ st: 0 }] }).ok, false);
  assert.equal(E.act(s, { k: 'buy', type: 'fragola', cars: ['wood'], orders: [] }).err, 'locked');
  s.money = 10;
  assert.equal(E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 2, 9, 9, 9) }).err, 'money');
});

test('Libera: taglie e acqua scelte, senza obiettivi; mappe reali solo dalla fase 3', () => {
  for (const [size, water] of [[32, 0], [48, 1], [64, 2]]) {
    const s = E.newFree({ size, water, seed: 1234 });
    const W = E.world(s);
    assert.equal(W.w, size);
    assert.ok(s.towns.length >= 3 && s.inds.length >= 6);
    const wet = W.water.reduce((a, x) => a + x, 0) / W.n;
    if (water === 0) assert.ok(wet < 0.25, `poca acqua: ${wet}`);
    assert.equal(s.goals.length, 0);
    E.step(s, E.TPH * 40);
    assert.ok(!s.won && !s.lost);
    assert.ok(E.progress(s) < 1);
  }
  assert.throws(() => HH.expressMap.fromShared({ name: 'ostia' }), /phase 3/);
});

test('consigli di Hari: il tutorial progressivo segue quello che hai fatto', () => {
  const s = E.levelFromSeed(1, 11);
  assert.equal(E.coach(s), 'ex_c_road');
  bot.play(s, 1);
  assert.ok(['ex_c_run', 'ex_c_bus'].includes(E.coach(s)));
  const s5 = E.levelFromSeed(5, 12);
  assert.equal(E.coach(s5), 'ex_c_loop');
});

test('posizioni dentro la casella: dritto, curva e inversione restano nella casella e vanno dal lato giusto', () => {
  const o = {};
  for (const [a, b] of [[3, 1], [0, 2], [3, 0], [2, 1], [1, 1]]) {
    for (let q = 0; q <= 1; q += 0.25) {
      S.tilePos(10, 0, a, b, q, o);
      assert.ok(o.x >= -1e-9 && o.x <= 1 + 1e-9 && o.y >= -1e-9 && o.y <= 1 + 1e-9, `${a}->${b} q ${q}: ${o.x},${o.y}`);
    }
  }
  S.tilePos(10, 0, 3, 1, 0, o); assert.ok(Math.abs(o.x) < 1e-9 && Math.abs(o.y - 0.5) < 1e-9);
  S.tilePos(10, 0, 3, 0, 1, o); assert.ok(Math.abs(o.x - 0.5) < 1e-9 && Math.abs(o.y) < 1e-9);
});

/* ---------- tempo: orologio coerente coi viaggi ---------- */
test('tempo: un giorno = 24 ore, si parte alle 7 del 1° gennaio, scadenze di qualche settimana', () => {
  assert.equal(E.TPH, 24); assert.equal(E.TPD, 24 * 24);
  const s = E.levelFromSeed(1, 5);
  assert.deepEqual(E.date(s.h), { y: 1, m: 0, d: 1, hh: 7 });
  assert.deepEqual(E.date(24 * 59), { y: 1, m: 2, d: 1, hh: 0 }, '1° marzo');
  assert.deepEqual(E.date(24 * 365 + 13), { y: 2, m: 0, d: 1, hh: 13 });
  E.step(s, E.TPD);
  assert.deepEqual(E.date(s.h), { y: 1, m: 0, d: 2, hh: 7 }, 'un giorno dopo, stessa ora');
  for (let level = 1; level <= 8; level++) {
    const c = E.config(level);
    assert.ok(c.days >= 14 && c.days <= 31, `livello ${level}: ${c.days} giorni`);
    assert.ok(c.par >= 3 * 24 && c.par < c.hours, `livello ${level}: par ${c.par} ore`);
  }
  // la Fragola arriva il 1° marzo dell'anno 1 (in Libera, dopo ~28 minuti veri a ×1)
  assert.equal(E.VT.fragola.fromH, 24 * 59);
});

test('tempo: bus e camion tra villaggi vicini in poche ore, treni entro un giorno, carico in meno di un\'ora', () => {
  const trips = { road: [], rail: [] }, stops = [];
  for (const level of [1, 2, 4]) {
    const s = E.levelFromSeed(level, 4000 + level);
    const go = {}, at = {};
    const orig = E.step;
    // conta i passi tra partenza e arrivo, e tra arrivo e ripartenza (solo i mezzi che non aspettano il pieno)
    let tk = 0;
    const spy = (st, n) => { const ev = []; for (let i = 0; i < n && !E.isOver(st); i++) { const e = orig(st, 1); tk++; for (const x of e) {
      const v = st.veh.find((y) => y.id === x.v);
      if (x.k === 'depart') { go[x.v] = tk; if (at[x.v] != null && v && !v.orders.some((o) => o.full)) stops.push(tk - at[x.v]); }
      if (x.k === 'arrive' && go[x.v] != null && v) { trips[S.isTrain(v) ? 'rail' : 'road'].push(tk - go[x.v]); at[x.v] = tk; }
    } ev.push(...e); } return ev; };
    E.step = spy;
    try { bot.play(s); } finally { E.step = orig; }
    assert.ok(s.won);
  }
  const hours = (a) => a.map((t) => t / E.TPH), med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const road = hours(trips.road), rail = hours(trips.rail);
  assert.ok(road.length > 20 && rail.length >= 4, `${road.length} ${rail.length} ${stops.length}`);
  assert.ok(med(road) >= 1 && med(road) <= 8, `strada: ${med(road)} ore`);
  assert.ok(Math.max(...road) <= 14, `strada al più ~mezza giornata: ${Math.max(...road)} ore`);
  assert.ok(Math.max(...rail) <= 24, `treno al più un giorno: ${Math.max(...rail)} ore`);
  assert.ok(stops.length > 5 && Math.max(...stops) / E.TPH <= 1, `fermata: ${Math.max(...stops) / E.TPH} ore`);
});

test('salvataggi v1 (0.32.x): si aprono, con la stessa mappa di allora, e la partita continua', async () => {
  const fs = await import('node:fs');
  const raw = fs.readFileSync(new URL('./fixtures/express-v1.json', import.meta.url), 'utf8');
  const old = JSON.parse(raw);
  assert.equal(old.v, 1); assert.ok('day' in old && 'tod' in old);
  const s = E.restore(raw);
  assert.ok(s, 'si apre');
  assert.equal(s.v, E.SNAP_V); assert.equal(s.mv, 1); assert.equal(s.h0, 0);
  assert.equal(s.h, old.day); assert.equal(s.tk, old.tk);
  assert.ok(!('day' in s) && !('tod' in s) && !('wonDay' in s));
  assert.equal(s.deadline, old.deadline); assert.equal(s.par, old.par);
  // la mappa è quella del salvataggio (acqua uguale a quella generata dalla 0.32: firma calcolata allora)
  const W = E.world(s);
  let sig = 0, wet = 0;
  for (let i = 0; i < W.n; i++) if (W.base.water[i]) { sig = (sig * 31 + i) >>> 0; wet++; }
  assert.equal(wet, 41); assert.equal(sig, 3633147419);
  // e il fiume ora è collegato per i lati: acqua = quella di allora + le caselle d'angolo allagate all'apertura
  assert.ok(Array.isArray(s.wj));
  for (let i = 0; i < W.n; i++) assert.equal(W.water[i], W.base.water[i] || s.wj.includes(i) ? 1 : 0);
  assert.equal(HH.expressMap.diagonalOnly(W), 0);
  for (const k in s.net) assert.ok(!W.water[+k] || W.road[+k] || W.rail[+k]);
  // e si gioca: il camion consegna ancora latte, il salvataggio nuovo si riapre uguale
  const before = s.gd['milk@i1'] || 0;
  E.step(s, E.TPH * 30);
  assert.ok((s.gd['milk@i1'] || 0) > before + 40, `latte: ${before} → ${s.gd['milk@i1']}`);
  const again = E.restore(JSON.stringify(s));
  assert.deepEqual(json(again), json(s));
  assert.equal(E.restore(JSON.stringify(Object.assign({}, old, { v: 99 }))), null, 'versioni sconosciute: partita nuova');
});

test('acqua collegata per i lati nelle mappe nuove (niente fiume a pezzi); le mappe vecchie restano uguali', () => {
  const M = HH.expressMap;
  for (let level = 1; level <= 5; level++) for (let k = 0; k < 6; k++) {
    const m = M.scenario(level, 31 * k + level, M.MV);
    assert.equal(M.diagonalOnly(m), 0, `livello ${level} seme ${k}`);
  }
  for (const size of [32, 48, 64]) for (const water of [1, 2]) for (let k = 0; k < 3; k++) {
    const s = E.newFree({ size, water, seed: 50 + k });
    assert.equal(s.mv, M.MV);
    assert.equal(M.diagonalOnly(E.world(s).base), 0, `Libera ${size} acqua ${water} seme ${k}`);
  }
  // mv 1 (salvataggi vecchi): il generatore di allora, con i suoi fiumi a spigolo
  let old = 0;
  for (let k = 0; k < 10; k++) old += M.diagonalOnly(M.scenario(3, 100 + k, 1));
  assert.ok(old > 0);
  // ciò che è disegnato come acqua è acqua anche per chi costruisce: una casella d'angolo aggiunta non si costruisce
  const s = E.levelFromSeed(3, 4321), W = E.world(s);
  const i = Array.from(W.water).findIndex((x, j) => x && !W.base.roads[j]);
  assert.equal(E.act(s, { k: 'station', kind: 'road', tile: i }).ok, false);
});

/* ---------- salvataggi con la mappa vecchia (mv 1): il fiume si collega per i lati all'apertura ---------- */
// partita mv 1 come la faceva la 0.32.0/0.32.1 (il generatore di allora), con qualche ora giocata dal bot
function oldSave(level, seed, hours) {
  const M = HH.expressMap, mv = M.MV;
  M.MV = 1;
  let s;
  try { s = E.levelFromSeed(level, seed); } finally { M.MV = mv; }
  assert.equal(s.mv, 1);
  if (hours) bot.play(s, s.h + hours);
  const j = json(s); delete j.wj;
  return j;
}
// oracoli indipendenti dal generatore: componenti d'acqua contate per i lati e per lati+spigoli (BFS)
function comps(W, diag) {
  const seen = new Uint8Array(W.n); let n = 0;
  for (let i = 0; i < W.n; i++) {
    if (!W.water[i] || seen[i]) continue;
    n++; seen[i] = 1;
    for (const q = [i]; q.length;) {
      const k = q.pop(), x = k % W.w, y = (k / W.w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || (!diag && dx && dy)) continue;
        const nx = x + dx, ny = y + dy, j = ny * W.w + nx;
        if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h || !W.water[j] || seen[j]) continue;
        seen[j] = 1; q.push(j);
      }
    }
  }
  return n;
}
const occupied = (W, i) => !!(W.use[i] || W.rail[i] || W.road[i] || W.st[i] || W.tun[i]);
function spigoli(W) {
  const out = [];
  for (let y = 0; y < W.h - 1; y++) for (let x = 0; x < W.w - 1; x++) {
    const a = y * W.w + x, b = a + 1, c = a + W.w, d = c + 1, w = W.water;
    if (w[a] && w[d] && !w[b] && !w[c]) out.push([b, c]);
    else if (w[b] && w[c] && !w[a] && !w[d]) out.push([a, d]);
  }
  return out;
}

test('salvataggi mv 1: all\'apertura il fiume è collegato per i lati, senza toccare niente di costruito', () => {
  const M = HH.expressMap;
  let total = 0, withBuilt = 0;
  for (let level = 1; level <= 5; level++) for (let k = 0; k < 8; k++) {
    const raw = oldSave(level, 900 + level * 101 + k * 37, k < 2 ? 72 : 0);
    // prima: la mappa di allora, con gli spigoli
    const before = E.world(JSON.parse(JSON.stringify(raw)));
    const s = E.restore(JSON.stringify(raw)), W = E.world(s);
    total += s.wj.length;
    // le caselle allagate erano vuote (niente strade, binari, stazioni, case, industrie) e ora sono acqua bassa senza alberi
    for (const i of s.wj) {
      assert.ok(!before.water[i] && !occupied(before, i), `livello ${level} seme ${k}: casella ${i} occupata`);
      assert.ok(W.water[i] && W.ht[i] === 0 && !W.tree[i]);
    }
    // niente di costruito è cambiato
    for (const f of ['net', 'stations', 'towns', 'inds', 'veh', 'cut', 'money', 'h']) assert.deepEqual(json(s[f]), json(raw[f]), f);
    if (Object.keys(raw.net).length) withBuilt++;
    // resta uno spigolo solo dove tutte e due le caselle sono occupate; senza, l'acqua è collegata per i lati
    const left = spigoli(W);
    for (const [p, q] of left) assert.ok(occupied(W, p) && occupied(W, q));
    if (!left.length) assert.equal(comps(W, false), comps(W, true), `livello ${level} seme ${k}`);
    // chi si raggiungeva via terra (coi ponti) si raggiunge ancora
    const sites = [...s.towns.map((t) => t.y * W.w + t.x), ...s.inds.map((d) => d.y * W.w + d.x)];
    for (const b of sites.slice(1)) if (M.reach(before, sites[0], b)) assert.ok(M.reach(W, sites[0], b), `livello ${level} seme ${k}: sito ${b}`);
    // la scelta resta nel salvataggio: riaprendo è la stessa (anche se nel frattempo ci si è costruito sopra)
    const again = E.restore(JSON.stringify(s));
    assert.deepEqual(again.wj, s.wj);
    assert.deepEqual(Array.from(E.world(again).water), Array.from(W.water));
  }
  assert.ok(total > 20, `caselle allagate: ${total}`);
  assert.ok(withBuilt >= 5, `salvataggi con strade: ${withBuilt}`);
  // partite nuove (mv 2): niente da allagare, niente wj nel salvataggio
  const fresh = E.restore(JSON.stringify(E.levelFromSeed(4, 77)));
  assert.equal(fresh.wj, undefined);
});

test('salvataggi mv 1: spigolo con una casella occupata → l\'altra; con tutte e due → resta (solo disegno)', () => {
  // cerca un salvataggio vecchio con almeno uno spigolo
  let raw = null, sq = null;
  for (let seed = 1; seed < 200 && !sq; seed++) {
    raw = oldSave(4, seed, 0);
    const W0 = E.world(JSON.parse(JSON.stringify(raw)));
    sq = spigoli(W0).find(([p, q]) => !occupied(W0, p) && !occupied(W0, q));
  }
  assert.ok(sq, 'serve uno spigolo libero');
  const [p, q] = sq;
  const first = E.restore(JSON.stringify(raw)).wj, pick = first.includes(p) ? p : q, other = pick === p ? q : p;
  assert.ok(first.includes(pick) && !first.includes(other));
  // una strada sulla casella scelta: si allaga l'altra, la strada resta com'era
  const one = JSON.parse(JSON.stringify(raw));
  one.net[pick] = [0, 10, 0, 0];
  const s1 = E.restore(JSON.stringify(one)), W1 = E.world(s1);
  assert.ok(s1.wj.includes(other) && !s1.wj.includes(pick));
  assert.ok(!W1.water[pick] && W1.road[pick] === 10);
  assert.deepEqual(s1.net[pick], [0, 10, 0, 0]);
  // strade su tutte e due: lo spigolo resta, nessuna delle due diventa acqua
  const two = JSON.parse(JSON.stringify(one));
  two.net[other] = [0, 5, 0, 0];
  const s2 = E.restore(JSON.stringify(two)), W2 = E.world(s2);
  assert.ok(!s2.wj.includes(p) && !s2.wj.includes(q));
  assert.ok(!W2.water[p] && !W2.water[q] && W2.road[p] && W2.road[q]);
  assert.ok(spigoli(W2).some(([a, b]) => (a === p && b === q) || (a === q && b === p)));
  // la casella allagata si attraversa solo col ponte: una fermata lì non si può mettere
  const s3 = E.restore(JSON.stringify(raw));
  s3.money = 1e6;
  assert.equal(E.act(s3, { k: 'station', kind: 'road', tile: pick }).ok, false);
});
