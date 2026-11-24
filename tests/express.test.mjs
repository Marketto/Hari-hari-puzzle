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
      assert.ok(s.wonDay <= E.config(level).days);
      assert.ok(E.rate(s) >= 1 && E.rate(s) <= 3);
      assert.equal(E.progress(s), 1);
    }
  }
});

test('senza fare niente il livello si perde alla scadenza (nessun obiettivo gratis)', () => {
  for (let level = 1; level <= 5; level++) {
    const s = E.levelFromSeed(level, 99 + level);
    E.step(s, E.TPD * (E.config(level).days + 2));
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
  E.step(c, E.TPD * 90); E.step(d, E.TPD * 90);
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
  // fiume largo 2 (ponte) e lago largo 5 (niente ponte: giro lungo)
  for (let y = 0; y < W.h; y++) { W.water[at(20, y)] = 1; W.water[at(21, y)] = 1; }
  const r = E.preview(s, 'road', at(18, 3), at(24, 3));
  assert.ok(r.ok && r.tiles.includes(at(20, 3)) && r.tiles.includes(at(21, 3)));
  assert.ok(E.act(s, { k: 'build', kind: 'road', tiles: r.tiles }).ok);
  for (let y = 0; y < W.h; y++) for (let x = 20; x <= 24; x++) W.water[at(x, y)] = 1;
  assert.equal(E.preview(s, 'rail', at(18, 12), at(26, 12)).ok, false);
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
    for (let d = 0; d < 80; d++) { r = E.act(s, { k: 'buy', type: 'castagna', cars: ['wood', 'wood'], orders: [{ st: A }, { st: B }] }); if (r.ok) break; E.step(s, E.TPD); }
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
    assert.equal(noCrash(s, W, E.TPD * 200), null);
    const laps = {};
    for (const v of s.veh) laps[v.id] = 0;
    // ogni treno continua ad arrivare alle stazioni (niente blocchi)
    for (const e of E.step(s, E.TPD * 200)) if (e.k === 'arrive') laps[e.v]++;
    for (const id in laps) assert.ok(laps[id] > 10, `segnali ${sig}, ${n} treni: il treno ${id} è arrivato solo ${laps[id]} volte`);
  }
  // senza semafori l'anello è un tratto solo: i due treni si aspettano a vicenda (fermi, mai scontrati) e Hari lo dice
  const b = loop(false, 2);
  assert.equal(noCrash(b.s, b.W, E.TPD * 120), null);
  assert.equal(E.coach(b.s), 'ex_c_stuck');
  // aggiungendo i semafori ripartono
  for (const t of [9, 15, 18].map((x) => 6 * b.W.w + x).concat([9 * b.W.w + 23, 12 * b.W.w + 18, 12 * b.W.w + 8, 9 * b.W.w + 4])) E.act(b.s, { k: 'signal', tile: t });
  const arr = E.step(b.s, E.TPD * 120).filter((e) => e.k === 'arrive').length;
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
  assert.equal(noCrash(s, W, E.TPD * 120), null);
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
  E.step(s, E.TPD * 80);
  assert.ok(st.rate.milk < r0 - 0.2, `${r0} → ${st.rate.milk}`);
});

test('le città crescono se servite bene, non se dimenticate', () => {
  const a = E.levelFromSeed(5, 555), b = E.levelFromSeed(5, 555);
  const gp = E.goalState(a).find((g) => g.k === 'pop');
  const p0 = a.towns[gp.town].pop, h0 = a.towns[gp.town].houses.length;
  bot.play(a, 200);
  E.step(b, E.TPD * 200);
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
    E.step(s, E.TPD * 40);
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
