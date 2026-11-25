// Hari Express: anteprima che segue il dito (binari e strade paralleli a una linea esistente restano paralleli, si
// riusa la linea solo dove il dito ci passa sopra) e stazioni che si allargano (unione con la stazione accanto,
// binari paralleli, lunghezza e binari massimi, banchina proposta costruendo accanto, scelta del binario libero,
// demolizione di una casella, area di raccolta, salvataggio). Oracolo indipendente: mondi piatti fatti a mano, caselle e
// costi contati a mano dalla tabella dei costi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/express-map.js', 'src/games/express-net.js', 'src/games/express-sim.js', 'src/games/express-logic.js');
const E = HH.express, S = HH.expressSim, N = HH.expressNet, C = N.COST;

function flat(size = 32) {
  const s = E.newFree({ size, water: 0, seed: 5 });
  const W = E.world(s);
  W.ht.fill(0); W.water.fill(0); W.tree.fill(0); W.use.fill(0); W.road.fill(0); W.troad.fill(0);
  s.towns = []; s.inds = []; s.money = 1e7; W.covDirty = true;
  return { s, W, at: (x, y) => y * W.w + x };
}
const line = (at, x0, y0, x1, y1) => { const t = []; const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0); for (let x = x0, y = y0; ; x += sx, y += sy) { t.push(at(x, y)); if (x === x1 && y === y1) break; } return t; };

/* ---------- anteprima che segue il dito ---------- */
test('trascinamento parallelo a una linea esistente: 2, 3, 6, 10 caselle restano parallele (binari e strade)', () => {
  for (const kind of ['rail', 'road']) for (const L of [2, 3, 6, 10]) {
    const { s, W, at } = flat();
    assert.ok(E.act(s, { k: 'build', kind, tiles: line(at, 2, 5, 25, 5) }).ok);
    const stroke = line(at, 4, 6, 4 + L, 6);
    const p = E.preview(s, kind, stroke[0], stroke[stroke.length - 1], stroke);
    assert.ok(p.ok, `${kind} ${L}`);
    assert.deepEqual(p.tiles, stroke, `${kind} ${L}: le caselle sotto il dito, non la linea accanto`);
    assert.ok(p.tiles.every((t) => !W[kind][t]), 'nessun pezzo della linea vecchia');
    assert.equal(p.cost, L * C[kind], 'costo a mano: L pezzi nuovi');
    // l'A* senza traccia (il bot, o prima di questa versione) dalla 3ª casella scivola sulla linea accanto: è l'alternativa
    if (L >= 3) {
      const free = E.preview(s, kind, stroke[0], stroke[stroke.length - 1]);
      assert.ok(free.tiles.some((t) => W[kind][t]), 'senza traccia riusa la linea vecchia');
      assert.ok(p.alt && p.alt.cost < p.cost && p.alt.tiles.some((t) => W[kind][t]), '"Altra via": riusare la linea accanto');
    }
  }
});

test('traccia del dito: i buchi si riempiono, tornando indietro si accorcia; dito sulla linea = la si riusa', () => {
  const { s, W, at } = flat();
  const st = [];
  for (const t of [at(4, 6), at(7, 6), at(10, 6)]) N.strokeAdd(W.w, st, t);
  assert.deepEqual(st, line(at, 4, 6, 10, 6));
  N.strokeAdd(W.w, st, at(8, 6));
  assert.deepEqual(st, line(at, 4, 6, 8, 6), 'indietro: la traccia si accorcia');
  // dito che sale sulla linea esistente e la segue: la si riusa (costo 0 per quei pezzi)
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 2, 5, 25, 5) });
  const stroke = [...line(at, 4, 6, 8, 6), ...line(at, 8, 5, 14, 5)];
  const p = E.preview(s, 'rail', stroke[0], stroke[stroke.length - 1], stroke);
  assert.ok(p.ok);
  assert.deepEqual(p.tiles, stroke);
  assert.equal(p.cost, 5 * C.rail, '4 pezzi sulla riga nuova + 1 per salire; la linea vecchia gratis');
  // un ostacolo sotto il dito (una casa): l'A* riempie il buco girandoci attorno, poi torna sulla traccia
  const g = flat();
  g.W.use[g.at(8, 6)] = 1;
  const s2 = line(g.at, 4, 6, 12, 6);
  const q = E.preview(g.s, 'rail', s2[0], s2[s2.length - 1], s2);
  assert.ok(q.ok && !q.tiles.includes(g.at(8, 6)));
  assert.ok(q.tiles.filter((t) => s2.includes(t)).length >= 7, 'fuori dalla traccia solo il giro attorno alla casa');
});

/* ---------- stazioni che si allargano ---------- */
// stazione A (3 caselle, riga 5, est-ovest) su una linea lunga; binario parallelo sulla riga 6
function yard() {
  const f = flat();
  const { s, at } = f;
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 2, 5, 25, 5) });
  f.A = E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 10, 5, 12, 5) }).id;
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 5, 6, 20, 6) });
  return f;
}
test('stazione: una banchina accanto si unisce (stesso nome, stesse merci), costo normale; anteprima "Allarga"', () => {
  const { s, W, at, A } = yard();
  const st = s.stations[A], name = E.stationName(s, st);
  st.wait.pax = 7;
  const pv = E.stationPlan(s, { kind: 'rail', tiles: line(at, 10, 6, 12, 6) });
  assert.ok(pv.ok); assert.equal(pv.join, A); assert.equal(pv.cost, 3 * C.station);
  const m0 = s.money, r = E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 10, 6, 12, 6) });
  assert.ok(r.ok && r.join); assert.equal(r.id, A); assert.equal(m0 - s.money, 3 * C.station);
  assert.equal(s.stations.filter(Boolean).length, 1, 'nessuna stazione nuova');
  assert.equal(E.stationName(s, s.stations[A]), name); assert.equal(s.stations[A].wait.pax, 7);
  assert.equal(E.platforms(s, s.stations[A]).length, 2);
  for (const t of line(at, 10, 6, 12, 6)) assert.equal(W.st[t], A + 1);
  // i due binari restano separati (niente collegamento di traverso dentro la stazione)
  assert.equal(W.rail[at(11, 5)], 10); assert.equal(W.rail[at(11, 6)], 10);
  // più lunga: in fila sullo stesso asse
  assert.equal(E.act(s, { k: 'station', kind: 'rail', tiles: [at(13, 5)] }).id, A);
  // una banchina da sola, su terra libera accanto (il binario si posa dopo)
  assert.equal(E.act(s, { k: 'station', kind: 'rail', tiles: [at(11, 4)], ax: 1 }).id, A);
  assert.equal(E.platforms(s, s.stations[A]).length, 3);
});

test('stazione: al massimo 4 binari e 6 caselle di lunghezza; caselle d\'allargamento con il costo', () => {
  const { s, at, A } = yard();
  for (const x of [13, 14, 15]) assert.ok(E.act(s, { k: 'station', kind: 'rail', tiles: [at(x, 5)] }).ok, 'fino a 6');
  const r = E.act(s, { k: 'station', kind: 'rail', tiles: [at(16, 5)] });
  assert.equal(r.ok, false); assert.equal(r.err, 'stmax');
  assert.equal(E.act(s, { k: 'station', kind: 'rail', tiles: [at(9, 5)] }).err, 'stmax', 'anche dall\'altra parte');
  for (const y of [6, 4, 3]) assert.ok(E.act(s, { k: 'station', kind: 'rail', tiles: [at(10, y)], ax: 1, join: A }).ok, 'binario ' + y);
  assert.equal(E.platforms(s, s.stations[A]).length, 4);
  assert.equal(E.act(s, { k: 'station', kind: 'rail', tiles: [at(10, 7)], ax: 1, join: A }).err, 'stmax', '5 binari: no');
  assert.equal(E.act(s, { k: 'station', kind: 'rail', tiles: [at(10, 9)], ax: 1, join: A }).err, 'far', 'lontana: no');
  // le caselle dove si può ancora allargare: accanto, dentro i limiti, col costo
  const sp = E.expandSpots(s, A);
  assert.ok(sp.length > 0 && sp.every((o) => o.cost === C.station));
  assert.ok(sp.some((o) => o.t === at(11, 6)) && !sp.some((o) => o.t === at(16, 5) || o.t === at(10, 7)));
});

test('binario parallelo accanto a una stazione: l\'anteprima propone il binario di stazione (unito, col costo)', () => {
  const f = flat(), { s, at } = f;
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 2, 5, 25, 5) });
  const A = E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 10, 5, 12, 5) }).id;
  const stroke = line(at, 5, 6, 20, 6);
  const p = E.preview(s, 'rail', stroke[0], stroke[stroke.length - 1], stroke);
  assert.deepEqual(p.tiles, stroke, 'resta parallelo anche accanto alla stazione');
  assert.ok(p.plat); assert.equal(p.plat.st, A);
  assert.deepEqual(p.plat.tiles.slice().sort((a, b) => a - b), line(at, 10, 6, 12, 6));
  assert.equal(p.plat.cost, 3 * C.station);
  // costruisci + binario di stazione (come fa la UI col pulsante acceso)
  assert.ok(E.act(s, { k: 'build', kind: 'rail', tiles: p.tiles }).ok);
  for (const t of p.plat.tiles) assert.ok(E.act(s, { k: 'station', kind: 'rail', tiles: [t], ax: p.plat.ax, join: p.plat.st }).ok);
  assert.equal(E.platforms(s, s.stations[A]).length, 2);
  // lontano dalle stazioni: niente proposta
  const q = E.preview(s, 'rail', at(5, 20), at(15, 20), line(at, 5, 20, 15, 20));
  assert.equal(q.plat, null);
});

test('area di raccolta: cresce con le caselle nuove', () => {
  const { s, W, at, A } = yard();
  const houses = [at(11, 9)];
  W.use[houses[0]] = 1; W.own[houses[0]] = 0;
  s.towns.push({ id: 0, name: 'T', x: 11, y: 9, pop: 300, an: 'cat', houses, gm: 0, pm: 0, lg: 0 });
  W.covDirty = true;
  assert.equal(S.cov(s, W, A).towns[0], undefined, 'la casa è 4 righe sotto: fuori (raggio 3)');
  E.act(s, { k: 'station', kind: 'rail', tiles: [at(11, 6)] });
  assert.equal(S.cov(s, W, A).towns[0], 1, 'col binario nuovo la casa entra');
  assert.ok(S.cov(s, W, A).acc.pax);
});

test('fermate di bus e camion: quelle accanto si uniscono (anche su strade parallele)', () => {
  const { s, at } = flat();
  E.act(s, { k: 'build', kind: 'road', tiles: line(at, 2, 15, 20, 15) });
  E.act(s, { k: 'build', kind: 'road', tiles: line(at, 2, 16, 20, 16) });
  const a = E.act(s, { k: 'station', kind: 'road', tile: at(10, 15) });
  const b = E.act(s, { k: 'station', kind: 'road', tile: at(10, 16) });
  const c = E.act(s, { k: 'station', kind: 'road', tile: at(11, 15) });
  assert.ok(a.ok && b.ok && c.ok);
  assert.equal(b.id, a.id); assert.equal(c.id, a.id);
  assert.equal(s.stations[a.id].tiles.length, 3);
  // due bus caricano insieme nella stessa fermata (mondo gentile: i mezzi su strada non si bloccano)
  const B = E.act(s, { k: 'station', kind: 'road', tile: at(3, 15) }).id;
  for (let k = 0; k < 2; k++) assert.ok(E.act(s, { k: 'buy', type: 'bus', orders: [{ st: a.id, full: true }, { st: B }] }).ok);
  E.step(s, 4);
  assert.ok(s.veh.every((v) => v.mode === 'load'));
});

/* ---------- treni: il binario libero ---------- */
// B (testa, riga 10 x 2..4) — linea — semaforo (8,10) — scambio (12,10) — A con due binari (righe 10 e 11, x 20..22)
function twoPlatforms(second = true) {
  const f = flat(), { s, W, at } = f;
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 2, 10, 22, 10) });
  E.act(s, { k: 'build', kind: 'rail', tiles: [at(12, 10), ...line(at, 12, 11, 22, 11)] });
  const B = E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 2, 10, 4, 10) }).id;
  const A = E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 20, 10, 22, 10) }).id;
  if (second) assert.equal(E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 20, 11, 22, 11) }).id, A);
  assert.ok(E.act(s, { k: 'signal', tile: at(8, 10) }).ok);
  const ids = [];
  for (let k = 0; k < 2; k++) {
    let r;
    for (let d = 0; d < 80; d++) { r = E.act(s, { k: 'buy', type: 'castagna', cars: ['pax'], orders: [{ st: B }, { st: A, full: true }] }); if (r.ok) break; E.step(s, 1); }
    assert.ok(r.ok, 'treno comprato');
    ids.push(r.id);
  }
  return Object.assign(f, { A, B, ids });
}
function noCrash(s, ticks) {
  for (let i = 0; i < ticks; i++) {
    E.step(s, 1);
    const own = new Map();
    for (const v of s.veh) for (let k = 0; k * 0.5 < S.vlen(v); k++) {
      const t = S.along(v, k * 0.5).t;
      if (own.has(t) && own.get(t) !== v.id) return `scontro sulla casella ${t} al passo ${i}`;
      own.set(t, v.id);
    }
  }
  return null;
}
test('treni: con due binari due treni caricano insieme nella stessa stazione; con uno il secondo aspetta', () => {
  const f = twoPlatforms(true), { s, W, A } = f;
  assert.equal(noCrash(s, E.TPH * 30), null);
  const at = s.veh.filter((v) => v.mode === 'load' && W.st[v.t] === A + 1);
  assert.equal(at.length, 2, 'due treni fermi in A: ' + JSON.stringify(s.veh.map((v) => [v.mode, v.t])));
  assert.notEqual((at[0].t / W.w) | 0, (at[1].t / W.w) | 0, 'su binari diversi');
  // la stazione e il percorso valgono per entrambi (stesso ordine, stessa stazione)
  assert.ok(at.every((v) => v.orders[v.oi].st === A));
  // con un binario solo: il secondo aspetta al semaforo, mai scontri
  const g = twoPlatforms(false);
  assert.equal(noCrash(g.s, E.TPH * 30), null);
  assert.equal(g.s.veh.filter((v) => v.mode === 'load' && g.W.st[v.t] === g.A + 1).length, 1);
});

test('demolire una casella: la stazione si accorcia (ordini validi), l\'ultima la toglie; mai sotto un treno', () => {
  const f = twoPlatforms(true), { s, W, at, A, B } = f;
  E.step(s, E.TPH * 30);
  const busyT = s.veh.find((v) => W.st[v.t] === A + 1).t;
  assert.equal(E.act(s, { k: 'demolish', tile: busyT }).err, 'busy', 'sotto un treno: no');
  // un'altra stazione senza treni: si accorcia casella per casella
  const C2 = E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 2, 20, 4, 20) }).id;
  E.act(s, { k: 'station', kind: 'rail', tiles: line(at, 2, 21, 4, 21) });
  E.act(s, { k: 'build', kind: 'rail', tiles: line(at, 2, 20, 4, 20) });
  const v = s.veh[0], before = v.orders.slice();
  assert.ok(E.act(s, { k: 'demolish', tile: at(3, 21) }).ok);
  assert.equal(s.stations[C2].tiles.length, 5);
  for (const t of [at(2, 21), at(4, 21), at(2, 20), at(3, 20)]) assert.ok(E.act(s, { k: 'demolish', tile: t }).ok);
  assert.ok(s.stations[C2], 'resta con una casella');
  assert.ok(E.act(s, { k: 'demolish', tile: at(4, 20) }).ok);
  assert.equal(s.stations[C2], null, 'tolta l\'ultima casella la stazione non c\'è più');
  assert.deepEqual(v.orders, before, 'gli ordini verso A e B restano');
  void B;
});

test('salvataggio: stazioni con più binari restano dopo la ripresa; i salvataggi di prima si aprono e si allargano', () => {
  const f = twoPlatforms(true), { s, A } = f;
  E.step(s, E.TPH * 10);
  const r = E.restore(JSON.stringify(s)), W2 = E.world(r);
  assert.equal(E.platforms(r, r.stations[A]).length, 2);
  for (const t of r.stations[A].tiles) assert.equal(W2.st[t], A + 1);
  // stessa partita: avanti uguale
  E.step(s, E.TPH * 20); E.step(r, E.TPH * 20);
  assert.equal(JSON.stringify(r), JSON.stringify(s));
  // un salvataggio di prima (stazione in fila, senza campi nuovi): si apre e si allarga
  const old = flat(), at = old.at;
  E.act(old.s, { k: 'build', kind: 'rail', tiles: line(at, 2, 5, 25, 5) });
  const id = E.act(old.s, { k: 'station', kind: 'rail', tiles: line(at, 10, 5, 12, 5) }).id;
  const snap = JSON.parse(JSON.stringify(old.s));
  assert.deepEqual(Object.keys(snap.stations[id]).sort(), ['ax', 'fr', 'id', 'kind', 'last', 'name', 'pick', 'rate', 'spd', 'tiles', 'wait'], 'formato invariato');
  const o = E.restore(snap);
  E.world(o).ht.fill(0);
  assert.equal(E.act(o, { k: 'station', kind: 'rail', tiles: [at(11, 6)], ax: 1 }).id, id);
});
