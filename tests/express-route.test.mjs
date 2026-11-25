// Hari Express: ponti lunghi e gallerie (costruzione, regole, anteprima col trascinamento dritto, mezzi che passano,
// demolizione intera, salvataggio) e modifica del percorso dei mezzi in servizio (aggiungi, togli, riordina, modi
// della fermata, fermate irraggiungibili rifiutate, cambio a metà viaggio). Oracolo indipendente dal generatore:
// mondi piatti costruiti a mano con fiumi e colline in posizioni note, costi contati a mano dalla tabella dei costi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
import { expressBot } from './_express-bot.mjs';

const HH = load('src/core/rng.js', 'src/games/express-map.js', 'src/games/express-net.js', 'src/games/express-sim.js', 'src/games/express-logic.js');
const E = HH.express, S = HH.expressSim, N = HH.expressNet, C = N.COST;
const json = (x) => JSON.parse(JSON.stringify(x));

function flat(size = 32) {
  const s = E.newFree({ size, water: 0, seed: 5 });
  const W = E.world(s);
  W.ht.fill(0); W.water.fill(0); W.tree.fill(0); W.use.fill(0); W.road.fill(0); W.troad.fill(0);
  s.towns = []; s.inds = []; s.money = 1e7; W.covDirty = true;
  return { s, W, at: (x, y) => y * W.w + x };
}
const line = (at, x0, y0, x1, y1) => { const t = []; const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0); for (let x = x0, y = y0; ; x += sx, y += sy) { t.push(at(x, y)); if (x === x1 && y === y1) break; } return t; };
// fiume verticale dalle colonne x0..x1 (tutta l'altezza tranne un guado in fondo, così esiste anche il giro lungo)
const river = (W, at, x0, x1, gap = true) => { for (let y = 0; y < W.h - (gap ? 2 : 0); y++) for (let x = x0; x <= x1; x++) W.water[at(x, y)] = 1; };
// collina (quota h) nel rettangolo
const hill = (W, at, x0, y0, x1, y1, h = 1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) W.ht[at(x, y)] = h; };
// un villaggio finto con qualche casa (accetta passeggeri e posta, ne produce)
function town(s, W, at, id, x, y) {
  const houses = [at(x, y), at(x + 1, y), at(x, y + 1)];
  for (const i of houses) { W.use[i] = 1; W.own[i] = id; }
  s.towns.push({ id, name: 'T' + id, x, y, pop: 400, an: 'cat', houses, gm: 0, pm: 0, lg: 0 });
  W.covDirty = true;
}

/* ---------- ponti ---------- */
test('ponte: il trascinamento dritto sopra il fiume propone il ponte col suo costo (strada e binario)', () => {
  for (const kind of ['road', 'rail']) {
    const { s, W, at } = flat();
    for (let y = 0; y <= 7; y++) for (let x = 10; x <= 13; x++) W.water[at(x, y)] = 1;   // 4 caselle d'acqua, guado da y = 8
    const p = E.preview(s, kind, at(7, 5), at(16, 5));
    assert.ok(p.ok, kind);
    assert.deepEqual(p.tiles, line(at, 7, 5, 16, 5), 'dritto, sopra l\'acqua');
    assert.equal(p.spans.length, 1); assert.equal(p.spans[0].k, 'b'); assert.equal(p.spans[0].tiles.length, 4);
    // costo a mano: 5 collegamenti di terra (compreso l'arrivo) + 4 caselle di ponte × (1 + 0,25 per la casella oltre la terza)
    const expect = 5 * C[kind] + 4 * C.bridge[kind] * 1.25;
    assert.equal(p.cost, Math.round(expect));
    // l'alternativa è il giro dal guado vicino (più caselle, nessun ponte: l'A* da solo sceglierebbe quello)
    assert.ok(p.alt && p.alt.ok && p.alt.spans.length === 0 && p.alt.tiles.length > p.tiles.length);
    const m0 = s.money;
    assert.ok(E.act(s, { k: 'build', kind, tiles: p.tiles, tn: p.tn }).ok);
    assert.equal(m0 - s.money, p.cost, 'anteprima = costo vero');
    for (let x = 10; x <= 13; x++) assert.equal(W[kind][at(x, 5)], 10, 'impalcato dritto est-ovest');
    // ricostruire sopra costa 0
    assert.equal(E.preview(s, kind, at(7, 5), at(16, 5)).cost, 0);
    // il dito che si ferma sull'acqua: il ponte arriva alla riva di là
    const q = E.preview(s, kind, at(7, 3), at(11, 3));
    assert.ok(q.ok && q.tiles[q.tiles.length - 1] === at(14, 3) && q.spans[0].tiles.length === 4);
  }
});

test('ponte: al massimo 6 caselle d\'acqua, rive alla stessa altezza, costo che cresce con la lunghezza', () => {
  const { s, W, at } = flat();
  river(W, at, 10, 15, false);                              // 6 caselle: si può
  const p = E.preview(s, 'rail', at(8, 4), at(18, 4));
  assert.ok(p.ok && p.spans[0].tiles.length === 6);
  assert.equal(p.cost, Math.round(4 * C.rail + 6 * C.bridge.rail * 1.75));
  // 7 caselle: troppo lungo, e senza guado non c'è altra strada
  for (let y = 0; y < W.h; y++) W.water[at(16, y)] = 1;
  const q = E.preview(s, 'rail', at(8, 4), at(19, 4));
  assert.equal(q.ok, false); assert.equal(q.why, 'long_b');
  // riva in salita: di là la terra è più alta
  const b = flat();
  river(b.W, b.at, 10, 11, false);
  hill(b.W, b.at, 12, 0, 14, b.W.h - 1);
  const r = E.preview(b.s, 'road', b.at(8, 4), b.at(14, 4));
  assert.equal(r.ok, false); assert.equal(r.why, 'bank');
  // il costo per casella cresce davvero con la lunghezza
  const per = (L) => { const f = flat(); river(f.W, f.at, 10, 9 + L, false); const x = E.preview(f.s, 'road', f.at(8, 4), f.at(12 + L, 4)); return (x.spans[0].cost - C.road) / L; };
  assert.ok(per(2) === per(3) && per(3) < per(4) && per(4) < per(6));
  // un percorso arrivato da fuori con un ponte troppo lungo o storto è rifiutato
  const c = flat();
  river(c.W, c.at, 10, 16, false);
  assert.equal(E.act(c.s, { k: 'build', kind: 'road', tiles: line(c.at, 9, 4, 17, 4) }).ok, false);
});

/* ---------- gallerie ---------- */
test('galleria: dritto contro il fianco della collina, uscita alla stessa quota; regole e lunghezza massima', () => {
  const { s, W, at } = flat();
  hill(W, at, 10, 0, 13, W.h - 1);                          // collina larga 4, tutta l'altezza
  W.tree[at(11, 5)] = 1;                                    // un albero sopra la galleria resta
  const p = E.preview(s, 'rail', at(7, 5), at(16, 5));
  assert.ok(p.ok);
  assert.deepEqual(p.tiles, line(at, 7, 5, 16, 5));
  assert.deepEqual(p.tn, line(at, 10, 5, 13, 5), 'caselle dentro la galleria');
  assert.equal(p.spans[0].k, 't');
  assert.equal(p.cost, 5 * C.rail + 4 * C.tunnel.rail);
  assert.ok(p.alt && p.alt.ok && !p.alt.tn.length, 'in alternativa si sale sulla collina');
  assert.ok(E.act(s, { k: 'build', kind: 'rail', tiles: p.tiles, tn: p.tn }).ok);
  for (const t of p.tn) assert.ok(W.tun[t] && W.rail[t] === 10);
  assert.equal(W.tree[at(11, 5)], 1, 'l\'albero sopra resta');
  // dentro la galleria: niente semafori, stazioni, strade che passano sopra
  assert.equal(E.act(s, { k: 'signal', tile: at(11, 5) }).err, 'tunnel');
  assert.equal(E.act(s, { k: 'station', kind: 'rail', tiles: [at(11, 5)], ax: 1 }).ok, false);
  const cross = E.preview(s, 'road', at(11, 2), at(11, 8));
  assert.ok(!cross.ok || !cross.tiles.includes(at(11, 5)), 'la strada sopra la galleria gira attorno');
  assert.equal(E.act(s, { k: 'build', kind: 'road', tiles: line(at, 11, 3, 11, 7) }).ok, false);
  // il dito dentro la collina: proposta = salire, alternativa = la galleria fino all'altra parte
  const q = E.preview(s, 'road', at(7, 12), at(11, 12));
  assert.ok(q.ok && !q.tn.length && q.alt && q.alt.tn.length === 4 && q.alt.tiles[q.alt.tiles.length - 1] === at(14, 12));
  // galleria troppo lunga (9 caselle) e uscita più in basso (acqua) → il perché
  const b = flat();
  hill(b.W, b.at, 10, 0, 18, b.W.h - 1);
  b.W.ht[b.at(8, 4)] = 0;
  const r = E.preview(b.s, 'rail', b.at(7, 4), b.at(21, 4));
  assert.ok(!r.ok || !r.tn.length); assert.equal(r.why, 'long_t');
  const c = flat();
  hill(c.W, c.at, 10, 0, 12, c.W.h - 1);
  for (let y = 0; y < c.W.h; y++) c.W.water[c.at(13, y)] = 1;
  const h = N.hop(c.W, 'rail', c.at(9, 4), 1);
  assert.equal(h.k, 't'); assert.equal(h.err, 'portal');
  // una galleria "inventata" su terra piatta è rifiutata; salire a piedi sulla collina resta valido
  assert.equal(E.act(c.s, { k: 'build', kind: 'rail', tiles: line(c.at, 3, 4, 6, 4), tn: [c.at(4, 4), c.at(5, 4)] }).ok, false);
  assert.ok(E.act(c.s, { k: 'build', kind: 'rail', tiles: line(c.at, 8, 20, 11, 20) }).ok);
});

/* ---------- mezzi che passano su ponti e gallerie ---------- */
test('treni e bus attraversano ponti e gallerie (A* dei mezzi) e arrivano', () => {
  // ferrovia: stazione A, galleria nella collina, ponte sul fiume, stazione B
  const { s, W, at } = flat();
  hill(W, at, 9, 0, 11, W.h - 1);
  river(W, at, 16, 18, false);
  const A = E.act(s, { k: 'station', kind: 'rail', tiles: [at(4, 6), at(5, 6)], ax: 1 }).id;
  const B = E.act(s, { k: 'station', kind: 'rail', tiles: [at(24, 6), at(25, 6)], ax: 1 }).id;
  const p = E.preview(s, 'rail', at(5, 6), at(24, 6));
  assert.ok(p.ok && p.tn.length === 3 && p.spans.some((x) => x.k === 'b'));
  assert.ok(E.act(s, { k: 'build', kind: 'rail', tiles: p.tiles, tn: p.tn }).ok);
  assert.ok(E.act(s, { k: 'buy', type: 'castagna', cars: ['pax'], orders: [{ st: A }, { st: B }] }).ok);
  const v = s.veh[0];
  let inT = 0, onB = 0, arrB = 0;
  for (let i = 0; i < E.TPH * 30 && arrB < 2; i++) {
    for (const e of E.step(s, 1)) if (e.k === 'arrive' && e.st === B) arrB++;
    if (W.tun[v.t]) inT++;
    if (W.water[v.t]) onB++;
  }
  assert.ok(arrB >= 1 && inT > 0 && onB > 0, `arrivi ${arrB}, in galleria ${inT}, sul ponte ${onB}`);
  // strada: lo stesso con un bus
  const r = E.preview(s, 'road', at(5, 14), at(24, 14));
  assert.ok(r.ok && r.tn.length === 3);
  assert.ok(E.act(s, { k: 'build', kind: 'road', tiles: r.tiles, tn: r.tn }).ok);
  const a2 = E.act(s, { k: 'station', kind: 'road', tile: at(5, 14) }).id, b2 = E.act(s, { k: 'station', kind: 'road', tile: at(24, 14) }).id;
  assert.ok(E.act(s, { k: 'buy', type: 'bus', orders: [{ st: a2 }, { st: b2 }] }).ok);
  const bus = s.veh[1];
  let arr = 0, bt = 0;
  for (let i = 0; i < E.TPH * 30 && !arr; i++) { for (const e of E.step(s, 1)) if (e.k === 'arrive' && e.v === bus.id && e.st === b2) arr++; if (W.tun[bus.t]) bt++; }
  assert.ok(arr && bt > 0);
});

/* ---------- demolizione ---------- */
test('demolire: ponti e gallerie si tolgono interi (anche dalla riva), mai con un mezzo dentro', () => {
  const { s, W, at } = flat();
  hill(W, at, 10, 0, 13, W.h - 1);
  river(W, at, 20, 22, false);
  const t = E.preview(s, 'rail', at(7, 5), at(16, 5));
  E.act(s, { k: 'build', kind: 'rail', tiles: t.tiles, tn: t.tn });
  const b = E.preview(s, 'road', at(17, 9), at(25, 9));
  E.act(s, { k: 'build', kind: 'road', tiles: b.tiles, tn: b.tn });
  // galleria: un tocco su una casella qualsiasi della collina la toglie tutta
  const m0 = s.money;
  const r = E.act(s, { k: 'demolish', tile: at(12, 5) });
  assert.ok(r.ok); assert.equal(r.n, 4); assert.equal(m0 - s.money, 4 * C.demolish);
  for (let x = 10; x <= 13; x++) assert.ok(!W.tun[at(x, 5)] && !W.rail[at(x, 5)]);
  assert.equal(W.rail[at(9, 5)] & 2, 0, 'l\'imbocco non porta più nella collina');
  assert.equal(W.rail[at(14, 5)] & 8, 0);
  for (let x = 10; x <= 13; x++) assert.ok(!(at(x, 5) in s.net), 'niente resti nel salvataggio');
  // ponte: togliendo la casella di riva va via anche il ponte
  const r2 = E.act(s, { k: 'demolish', tile: at(19, 9) });
  assert.ok(r2.ok && r2.n === 4);
  for (let x = 20; x <= 22; x++) assert.equal(W.road[at(x, 9)], 0);
  assert.equal(W.road[at(23, 9)] & 8, 0);
  // con un treno dentro la galleria non si demolisce
  const g = flat();
  hill(g.W, g.at, 10, 0, 13, g.W.h - 1);
  const A = E.act(g.s, { k: 'station', kind: 'rail', tiles: [g.at(4, 5), g.at(5, 5)], ax: 1 }).id;
  const B = E.act(g.s, { k: 'station', kind: 'rail', tiles: [g.at(20, 5), g.at(21, 5)], ax: 1 }).id;
  const p = E.preview(g.s, 'rail', g.at(5, 5), g.at(20, 5));
  E.act(g.s, { k: 'build', kind: 'rail', tiles: p.tiles, tn: p.tn });
  E.act(g.s, { k: 'buy', type: 'castagna', cars: ['pax'], orders: [{ st: A }, { st: B }] });
  for (let i = 0; i < E.TPH * 20 && !g.W.tun[g.s.veh[0].t]; i++) E.step(g.s, 1);
  assert.ok(g.W.tun[g.s.veh[0].t], 'il treno è nella galleria');
  assert.equal(E.act(g.s, { k: 'demolish', tile: g.at(11, 5) }).err, 'busy');
});

/* ---------- salvataggio ---------- */
test('salvataggio: le gallerie restano dopo la ripresa (quinto valore della casella), i salvataggi di prima si aprono', () => {
  // una mappa vera con colline: la prima galleria valida trovata col salto
  const s = E.newFree({ size: 48, water: 1, seed: 11 });
  s.money = 1e6;
  const W = E.world(s);
  let plan = null;
  for (let i = 0; i < W.n && !plan; i++) for (let d = 0; d < 4 && !plan; d++) {
    const h = N.hop(W, 'road', i, d);
    if (!h || h.k !== 't' || h.err || h.mid.length < 2 || W.use[h.end] || W.use[i] || W.tree[i] || W.road[i] || W.road[h.end] || W.troad[i]) continue;
    plan = { tiles: [i, ...h.mid, h.end], tn: h.mid };
  }
  assert.ok(plan, 'c\'è una galleria possibile');
  assert.ok(E.act(s, { k: 'build', kind: 'road', tiles: plan.tiles, tn: plan.tn }).ok);
  for (const t of plan.tn) assert.equal(s.net[t][4], 1);
  const d = E.restore(JSON.stringify(s));
  const W2 = E.world(d);
  for (const t of plan.tn) assert.ok(W2.tun[t] && W2.road[t]);
  assert.deepEqual(json(d), json(s));
  // un salvataggio v2 di prima (caselle a 4 valori, ordini senza modi) si apre e continua uguale
  const old = E.levelFromSeed(2, 2024);
  expressBot(HH).play(old, 40);
  const snap = json(old);
  for (const v of snap.veh) for (const o of v.orders) { delete o.nl; delete o.nu; }
  for (const k in snap.net) assert.ok(snap.net[k].length === 4, 'niente gallerie: quattro valori come prima');
  const r1 = E.restore(snap), r2 = E.restore(snap);
  E.step(r1, E.TPH * 30); E.step(r2, E.TPH * 30);
  assert.deepEqual(json(r1), json(r2));
  assert.ok(r1.veh.every((v) => v.orders.every((o) => E.orderMode(o) === (o.full ? 'full' : 'both'))));
});

/* ---------- modifica del percorso ---------- */
// tre fermate su una strada dritta (A a sinistra, B in mezzo, C a destra) + una fermata D isolata; villaggi vicino ad A e C
function roads() {
  const f = flat();
  const { s, W, at } = f;
  E.act(s, { k: 'build', kind: 'road', tiles: line(at, 3, 10, 27, 10) });
  town(s, W, at, 0, 3, 7);
  town(s, W, at, 1, 26, 7);
  f.A = E.act(s, { k: 'station', kind: 'road', tile: at(4, 10) }).id;
  f.B = E.act(s, { k: 'station', kind: 'road', tile: at(15, 10) }).id;
  f.C = E.act(s, { k: 'station', kind: 'road', tile: at(26, 10) }).id;
  f.D = E.act(s, { k: 'station', kind: 'road', tile: at(15, 25) }).id;
  f.R = E.act(s, { k: 'station', kind: 'rail', tiles: [at(5, 20), at(6, 20)], ax: 1 }).id;
  return f;
}
test('percorso: aggiungi, togli, riordina, modi della fermata; minimo 2, niente doppioni, irraggiungibile rifiutato', () => {
  const { s, A, B, C, D, R } = roads();
  assert.ok(E.act(s, { k: 'buy', type: 'bus', orders: [{ st: A }, { st: B }] }).ok);
  const v = s.veh[0], id = v.id;
  // aggiungi C, poi riordina (C prima di B), modi diversi
  assert.ok(E.act(s, { k: 'orders', id, orders: [{ st: A }, { st: B }, { st: C }] }).ok);
  assert.deepEqual(v.orders.map((o) => o.st), [A, B, C]);
  assert.ok(E.act(s, { k: 'orders', id, orders: [{ st: A, mode: 'full' }, { st: C, mode: 'load' }, { st: B, mode: 'unload' }] }).ok);
  assert.deepEqual(json(v.orders), [{ st: A, full: true }, { st: C, full: false, nu: 1 }, { st: B, full: false, nl: 1 }]);
  assert.deepEqual(v.orders.map(E.orderMode), ['full', 'load', 'unload']);
  // togli B
  assert.ok(E.act(s, { k: 'orders', id, orders: [{ st: A }, { st: C }] }).ok);
  assert.equal(v.orders.length, 2);
  // meno di 2, la stessa fermata di fila (anche passando dall'ultima alla prima), stazione dei treni, irraggiungibile
  const before = json(v.orders);
  assert.equal(E.act(s, { k: 'orders', id, orders: [{ st: A }] }).err, 'orders');
  assert.equal(E.act(s, { k: 'orders', id, orders: [{ st: A }, { st: A }, { st: C }] }).err, 'orders');
  assert.equal(E.act(s, { k: 'orders', id, orders: [{ st: A }, { st: C }, { st: A }] }).err, 'orders');
  assert.equal(E.act(s, { k: 'orders', id, orders: [{ st: A }, { st: R }] }).err, 'orders');
  const u = E.act(s, { k: 'orders', id, orders: [{ st: A }, { st: C }, { st: D }] });
  assert.equal(u.err, 'unreach'); assert.equal(u.leg, 1, 'il tratto C → D');
  assert.deepEqual(json(v.orders), before, 'niente cambiato');
  // tratti: lunghezze vere (A* dei mezzi), -1 dove non si arriva
  const lg = E.legs(s, 'road', [{ st: A }, { st: C }, { st: D }]);
  assert.ok(lg[0] >= 21 && lg[1] === -1);
});

test('percorso a metà viaggio: va alla fermata successiva valida, il carico resta e si consegna; solo carica / solo scarica', () => {
  const { s, W, A, B, C } = roads();
  assert.ok(E.act(s, { k: 'buy', type: 'bus', orders: [{ st: A }, { st: B }, { st: C }] }).ok);
  const v = s.veh[0], id = v.id;
  // prima passata: ad A la stazione comincia a raccogliere passeggeri; si aspetta che il bus ne carichi e parta verso B
  for (let i = 0; i < E.TPH * 60 && !(v.mode === 'go' && v.oi === 1 && v.ld.pax && v.ld.pax[0] > 0); i++) E.step(s, 1);
  assert.ok(v.mode === 'go' && v.oi === 1 && v.ld.pax[0] > 0, 'in viaggio verso B con i passeggeri');
  const load0 = v.ld.pax[0];
  // si toglie B, la meta di adesso: il bus va a C (la successiva del vecchio giro), col carico a bordo
  assert.ok(E.act(s, { k: 'orders', id, orders: [{ st: A }, { st: C }] }).ok);
  assert.equal(v.orders[v.oi].st, C);
  assert.equal(v.ld.pax[0], load0, 'il carico resta');
  const del0 = s.del.pax || 0;
  let paidAt = -1;
  for (let i = 0; i < E.TPH * 30 && paidAt < 0; i++) for (const e of E.step(s, 1)) if (e.k === 'pay' && e.v === id) paidAt = e.st;
  assert.equal(paidAt, C, 'consegnato a C');
  assert.ok(s.del.pax >= del0 + load0);
  // solo carica a C: arrivando con i passeggeri non scarica; solo scarica ad A: lì non carica
  const g = roads();
  assert.ok(E.act(g.s, { k: 'buy', type: 'bus', orders: [{ st: g.A }, { st: g.C }] }).ok);
  const w = g.s.veh[0];
  for (let i = 0; i < E.TPH * 60 && !(w.mode === 'go' && w.oi === 1 && w.ld.pax && w.ld.pax[0] > 0); i++) E.step(g.s, 1);
  assert.ok(E.act(g.s, { k: 'orders', id: w.id, orders: [{ st: g.A, mode: 'unload' }, { st: g.C, mode: 'load' }] }).ok);
  const carried = w.ld.pax[0];
  let atC = false;
  for (let i = 0; i < E.TPH * 30 && !atC; i++) for (const e of E.step(g.s, 1)) if (e.k === 'arrive' && e.v === w.id && e.st === g.C) atC = true;
  assert.ok(atC && w.ld.pax && w.ld.pax[0] >= carried, 'a C non scarica');
  // poi torna ad A ("solo scarica"): i passeggeri presi ad A non si scaricano dove sono saliti, e lì non si carica
  const ld0 = JSON.stringify(w.ld);
  let atA = false;
  for (let i = 0; i < E.TPH * 30 && !atA; i++) for (const e of E.step(g.s, 1)) if (e.k === 'arrive' && e.v === w.id && e.st === g.A) atA = true;
  E.step(g.s, E.TPH);
  assert.ok(atA && JSON.stringify(w.ld) === ld0, 'ad A non carica');
  void W;
});

test('percorso: togliendo la fermata dove il mezzo sta caricando riparte verso la successiva; mezzo perso ritrova la strada', () => {
  const { s, A, B, C } = roads();
  assert.ok(E.act(s, { k: 'buy', type: 'bus', orders: [{ st: A, full: true }, { st: B }] }).ok);
  const v = s.veh[0];
  E.step(s, 3);
  assert.equal(v.mode, 'load');
  assert.ok(E.act(s, { k: 'orders', id: v.id, orders: [{ st: B }, { st: C }] }).ok);
  assert.equal(v.mode, 'go'); assert.equal(v.orders[v.oi].st, B);
  let arr = false;
  for (let i = 0; i < E.TPH * 20 && !arr; i++) for (const e of E.step(s, 1)) if (e.k === 'arrive' && e.st === B) arr = true;
  assert.ok(arr);
  // determinismo: stesse modifiche, stessa partita
  const a = roads(), b = roads();
  for (const f of [a, b]) {
    E.act(f.s, { k: 'buy', type: 'bus', orders: [{ st: f.A }, { st: f.C }] });
    E.step(f.s, E.TPH * 3);
    E.act(f.s, { k: 'orders', id: f.s.veh[0].id, orders: [{ st: f.A }, { st: f.B, mode: 'unload' }, { st: f.C }] });
    E.step(f.s, E.TPH * 40);
  }
  assert.deepEqual(json(a.s), json(b.s));
});
