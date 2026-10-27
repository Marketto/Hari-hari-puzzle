// Unit test Hari Knots (regole modello 3, "Mikado con le corde"): si sposta solo una corda senza niente sopra, si posa sopra a
// tutte quelle che incrocia, sparisce quando non incrocia più nessuna. Ogni livello generato dev'essere risolvibile e il
// minimo di mosse dichiarato (A*) dev'essere esatto.
// L'ORACOLO è indipendente dalla logica del gioco: un simulatore riscritto da zero a partire dalle regole
// (incroci con formula parametrica razionale, strati in una Map di coppie, lastre in un array)
// e una ricerca in ampiezza esaustiva (BFS) con chiavi JSON, senza euristica.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/core/rules.js', 'src/games/ropes-logic.js');
const R = HH.ropes;

/* ---------- oracolo: geometria ----------
 * Segmenti chiusi P1P2 e Q1Q2: si risolve P1 + t(P2-P1) = Q1 + u(Q2-Q1) con la regola di Cramer;
 * se il determinante è 0 i segmenti sono paralleli: si toccano solo se collineari e con proiezioni sovrapposte. */
function hit(p1, p2, q1, q2) {
  const rx = p2[0] - p1[0], ry = p2[1] - p1[1], sx = q2[0] - q1[0], sy = q2[1] - q1[1];
  const den = rx * sy - ry * sx;
  const qpx = q1[0] - p1[0], qpy = q1[1] - p1[1];
  if (den === 0) {
    if (qpx * ry - qpy * rx !== 0) return false;              // paralleli distinti
    const ax = Math.abs(rx) >= Math.abs(ry) ? 0 : 1;           // proiezione sull'asse dominante
    const a0 = Math.min(p1[ax], p2[ax]), a1 = Math.max(p1[ax], p2[ax]);
    const b0 = Math.min(q1[ax], q2[ax]), b1 = Math.max(q1[ax], q2[ax]);
    return a0 <= b1 && b0 <= a1;
  }
  const tn = qpx * sy - qpy * sx, un = qpx * ry - qpy * rx;   // t = tn/den, u = un/den
  const inside = (n) => (den > 0 ? n >= 0 && n <= den : n <= 0 && n >= den);
  return inside(tn) && inside(un);
}

/* ---------- oracolo: regole del modello 3 ---------- */
const pk = (i, j) => (i < j ? `${i},${j}` : `${j},${i}`);
// stato: ends · top: coppia → corda di sopra · plates
function oStart(L) {
  const top = new Map();
  L.over.forEach(([i, j]) => top.set(pk(i, j), i));
  return { ends: L.ropes.map((e) => e && e.slice()), top, plates: L.plates.map(() => true) };
}
const oClone = (s) => ({ ends: s.ends.map((e) => e && e.slice()), top: new Map(s.top), plates: s.plates.slice() });
const contains = (p, [x, y]) => p[0] <= x && x <= p[2] && p[1] <= y && y <= p[3];
const overlap = (p, q) => !(p[2] < q[0] || q[2] < p[0] || p[3] < q[1] || q[3] < p[1]);
const segOf = (L, e) => [L.holes[e[0]], L.holes[e[1]]];
const ropeHit = (L, s, i, j) => hit(...segOf(L, s.ends[i]), ...segOf(L, s.ends[j]));
function oFree(L, s) {
  const used = new Set(s.ends.flatMap((e) => e || []));
  return L.holes.map((_, h) => h).filter((h) => !used.has(h) && L.plates.some((p, i) => s.plates[i] && contains(p, L.holes[h])));
}
// corda libera: nessuna corda presente le sta sopra
const oIsFree = (s, r) => !!s.ends[r] && !s.ends.some((e, j) => e && j !== r && s.top.get(pk(r, j)) === j);
function oMove(L, s0, r, end, h) {
  if (!oIsFree(s0, r) || !oFree(L, s0).includes(h)) return null;
  const s = oClone(s0);
  s.ends[r][end] = h;
  for (let j = 0; j < s.ends.length; j++) {
    if (j === r || !s.ends[j]) continue;
    if (ropeHit(L, s, r, j)) s.top.set(pk(r, j), r);     // si posa sopra a tutte quelle che incrocia
    else s.top.delete(pk(r, j));
  }
  // sparisce (ripetendo finché succede qualcosa) chi non incrocia nessuna corda presente — rifatto con la geometria
  for (let changed = true; changed;) {
    changed = false;
    const alive = s.ends.map((e, i) => (e ? i : -1)).filter((i) => i >= 0);
    for (const i of alive) {
      if (alive.some((j) => j !== i && s.ends[j] && ropeHit(L, s, i, j))) continue;
      s.ends[i] = null; changed = true;
      for (const k of [...s.top.keys()]) if (k.split(',').map(Number).includes(i)) s.top.delete(k);
    }
  }
  for (let changed = true; changed;) {
    changed = false;
    for (let p = L.plates.length - 1; p >= 0; p--) {
      if (!s.plates[p]) continue;
      const held = s.ends.some((e) => e && e.some((hh) => contains(L.plates[p], L.holes[hh])));
      const under = L.plates.some((q, i) => i > p && s.plates[i] && overlap(L.plates[p], q));
      if (!held && !under) { s.plates[p] = false; changed = true; }
    }
  }
  return s;
}
const oKey = (s) => JSON.stringify([s.ends, [...s.top.entries()].sort(), s.plates]);
const oSolved = (s) => s.ends.every((e) => !e);
function oBFS(L, s0 = oStart(L), limit = 400000) {
  let frontier = [s0];
  const seen = new Set([oKey(s0)]);
  for (let d = 0; frontier.length; d++) {
    const next = [];
    for (const s of frontier) {
      if (oSolved(s)) return d;
      s.ends.forEach((e, r) => {
        if (!e || !oIsFree(s, r)) return;
        for (const end of [0, 1]) for (const h of oFree(L, s)) {
          const t = oMove(L, s, r, end, h), k = oKey(t);
          if (!seen.has(k)) { seen.add(k); next.push(t); }
        }
      });
      if (seen.size > limit) return null;
    }
    frontier = next;
  }
  return -1;
}
function sameState(st, s) {
  assert.deepEqual(st.ends, s.ends);
  assert.deepEqual(st.plates, s.plates);
  const top = new Map(st.over.map(([i, j]) => [pk(i, j), i]));
  assert.deepEqual([...top.entries()].sort(), [...s.top.entries()].sort());
}

/* ---------- geometria ---------- */
test('incroci: casi a mano (vero incrocio, tocco su un foro, collineari, paralleli, disgiunti)', () => {
  const H = (pts) => pts;
  const T = (a, b, c, d) => R.segHit(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
  assert.equal(T([0, 0], [2, 2], [0, 2], [2, 0]), true);           // X
  assert.equal(T([0, 0], [2, 2], [1, 1], [3, 0]), true);           // passa sopra l'estremità dell'altra (T)
  assert.equal(T([0, 0], [3, 0], [1, 0], [5, 0]), true);           // collineari sovrapposte
  assert.equal(T([0, 0], [1, 0], [2, 0], [3, 0]), false);          // collineari disgiunte
  assert.equal(T([0, 0], [3, 0], [0, 1], [3, 1]), false);          // parallele
  assert.equal(T([0, 0], [1, 3], [2, 0], [3, 3]), false);          // disgiunte
  assert.equal(T([0, 0], [4, 2], [2, 1], [2, 3]), true);           // tocca in un punto interno (2,1)
  void H;
});

test('incroci: la logica concorda con la formula parametrica su 20 000 casi casuali', () => {
  const rnd = HH.rng(42), P = () => [Math.floor(rnd() * 6), Math.floor(rnd() * 6)];
  for (let i = 0; i < 20000; i++) {
    const a = P(), b = P(), c = P(), d = P();
    if ((a[0] === b[0] && a[1] === b[1]) || (c[0] === d[0] && c[1] === d[1])) continue;
    assert.equal(R.segHit(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]), hit(a, b, c, d), JSON.stringify([a, b, c, d]));
  }
});

/* ---------- regole su livelli costruiti a mano ---------- */
// griglia 5×5: B orizzontale (0,2)-(4,2) · A verticale x=1 · C verticale x=3; B sta sopra a entrambe
const HOLES = [[0, 2], [4, 2], [1, 4], [1, 0], [3, 0], [3, 4], [4, 4], [2, 0]];
const lvl = (ropes, over) => ({ rule: R.RULE, cols: 5, rows: 5, holes: HOLES, plates: [[0, 0, 4, 4]], ropes, over, min: 1 });
const L3 = lvl([[0, 1], [2, 3], [4, 5]], [[0, 1], [0, 2]]);

test('regola 1 — si possono spostare solo le corde senza niente sopra', () => {
  assert.ok(R.validLevel(L3) && R.stableStart(L3));
  const st = R.initial(L3);
  assert.deepEqual(R.freeRopes(L3, st), [0]);
  assert.equal(R.move(L3, st, 1, 0, 6), null, 'A è sotto B: bloccata');
  assert.equal(R.move(L3, st, 2, 1, 6), null, 'C è sotto B: bloccata');
  assert.equal(oMove(L3, oStart(L3), 1, 0, 6), null);
  assert.ok(R.move(L3, st, 0, 1, 6));
});

test('regola 2 — la corda spostata si posa sopra a tutte quelle che incrocia', () => {
  // B = (3,0)-(4,2) non incrocia A; spostata in (0,2) diventa orizzontale e ci passa sopra
  const L = lvl([[4, 1], [2, 3]], []);
  const m = R.move(L, R.initial(L), 0, 0, 0);
  assert.deepEqual(m.covered, [1]);
  assert.deepEqual(m.state.over, [[0, 1]]);
  // B spostata in (4,4): incrocia ancora A e C → resta sopra a tutte e due
  const m2 = R.move(L3, R.initial(L3), 0, 1, 6);
  assert.deepEqual(m2.state.over.map((x) => x.join()).sort(), ['0,1', '0,2']);
  assert.equal(m2.gone.length, 0);
  sameState(m2.state, oMove(L3, oStart(L3), 0, 1, 6));
});

test('regola 3 — sparisce solo una corda senza incroci (niente sopra e niente sotto), anche quelle di sotto', () => {
  // B in (2,0): B = (0,2)-(2,0) incrocia ancora A ma non più C → C resta senza incroci e vola via
  const m = R.move(L3, R.initial(L3), 0, 1, 7);
  assert.deepEqual(m.released, [2]);
  assert.deepEqual(m.gone, [[2, 0]]);
  assert.deepEqual(m.state.over, [[0, 1]]);
  sameState(m.state, oMove(L3, oStart(L3), 0, 1, 7));
  // da qui ogni mossa legale dà lo stesso stato nella logica e nell'oracolo
  const st = m.state;
  for (const [r, end, h] of R.legalMoves(L3, st)) sameState(R.move(L3, st, r, end, h).state, oMove(L3, oStart(Object.assign({}, L3, { ropes: st.ends, over: st.over })), r, end, h));
  // una corda coperta non sparisce: A resta finché B la incrocia
  assert.ok(m.state.ends[1]);
});

test('lastre: cadono quando nessuna corda le tiene, quella sotto aspetta quella sopra', () => {
  const L = {
    rule: R.RULE, cols: 5, rows: 3,
    holes: [[0, 0], [1, 2], [2, 1], [4, 0], [4, 2], [3, 1], [0, 2], [3, 0]],
    plates: [[0, 0, 2, 2], [2, 0, 4, 2]],
    ropes: [[7, 4], [3, 5]], over: [[1, 0]], min: 1,
  };
  const p = R.prep(L);
  assert.equal(p.pins[2], 3, 'il foro in colonna 2 tiene entrambe le lastre');
  assert.equal(p.above[0], 2, 'la lastra 1 sta sopra la 0');
  assert.ok(R.stableStart(L), 'due corde incrociate sulla lastra 1: la 0 non è tenuta ma ha sopra la 1');
  // la corda 1 (libera) va in (2,1): non incrocia più la 0 → spariscono tutte e due; cade la 1 e poi la 0
  const m = R.move(L, R.initial(L), 1, 0, 2);
  assert.ok(R.isSolved(m.state));
  assert.deepEqual(m.fell, [[1, 0], [0, 1]]);
  const o = oMove(L, oStart(L), 1, 0, 2);
  assert.ok(oSolved(o) && o.plates.every((x) => !x));
});

test('regole: mosse illegali (foro occupato, foro di una lastra caduta, corda sparita)', () => {
  const st = R.initial(L3);
  assert.equal(R.move(L3, st, 0, 0, 3), null, 'foro occupato');
  assert.equal(R.move(L3, st, 0, 0, 99), null, 'foro inesistente');
  const gone = Object.assign(R.initial(L3), { ends: [null, [2, 3], [4, 5]], over: [] });
  assert.equal(R.move(L3, gone, 0, 0, 6), null, 'corda sparita');
  const L2 = {
    rule: R.RULE, cols: 4, rows: 2, holes: [[0, 0], [1, 1], [3, 0], [3, 1], [0, 1], [2, 0]],
    plates: [[0, 0, 1, 1], [2, 0, 3, 1]], ropes: [[0, 1], [4, 2]], over: [[0, 1]], min: 1,
  };
  const s3 = Object.assign(R.initial(L2), { plates: [true, false], ends: [[0, 1], null], over: [] });
  assert.deepEqual(R.freeHoles(L2, s3), [4]);
  assert.equal(R.move(L2, s3, 0, 0, 3), null);
});

/* ---------- generatore ---------- */
const SEEDS = (lv) => (lv <= 6 ? 8 : lv <= 12 ? 4 : 3);

test('generatore: livelli 1–24 validi, stabili, risolvibili; la soluzione dichiarata funziona nell\'oracolo', () => {
  for (let lv = 1; lv <= 24; lv++) {
    const c = R.config(lv);
    for (let k = 0; k < SEEDS(lv); k++) {
      const L = R.generate(lv, HH.rng(lv * 7919 + k));
      const tag = `livello ${lv} seme ${k}`;
      assert.ok(R.validLevel(L), tag);
      assert.ok(R.validState(L, R.initial(L)), tag);
      assert.equal(L.ropes.length, c.K, tag);
      assert.ok(R.stableStart(L), tag + ': nessuna corda sparisce all\'inizio');
      assert.ok(L.min >= 1 && L.solution.length === L.min, tag);
      const s0 = oStart(L);
      s0.ends.forEach((_, i) => assert.ok(s0.ends.some((__, j) => j !== i && ropeHit(L, s0, i, j)), `${tag}: corda ${i} incrocia almeno un'altra`));
      for (let i = 0; i < c.K; i++) for (let j = i + 1; j < c.K; j++) assert.equal(s0.top.has(pk(i, j)), ropeHit(L, s0, i, j), `${tag}: uno strato per incrocio`);
      assert.ok(s0.ends.some((_, r) => oIsFree(s0, r)), tag + ': almeno una corda libera');
      let s = s0;
      for (const [r, end, h] of L.solution) { s = oMove(L, s, r, end, h); assert.ok(s, tag + ': mossa legale'); }
      assert.ok(oSolved(s), tag + ': la soluzione libera tutto');
      assert.ok(s.plates.every((x) => !x), tag + ': tutte le lastre cadute');
    }
  }
});

test('generatore: il minimo (A*) coincide con la BFS esaustiva dell\'oracolo (livelli 1–8)', () => {
  for (let lv = 1; lv <= 8; lv++) {
    for (let k = 0; k < (lv <= 4 ? 3 : 1); k++) {
      const L = R.generate(lv, HH.rng(lv * 104729 + k));
      const d = oBFS(L);
      assert.ok(d !== null, `livello ${lv}: BFS entro il limite`);
      assert.equal(L.min, d, `livello ${lv} seme ${k}: minimo`);
    }
  }
});

test('difficoltà: il minimo cresce col livello e la giocata ingenua non basta (dal livello 2)', () => {
  const avg = (lv) => { let t = 0; for (let k = 0; k < 4; k++) t += R.generate(lv, HH.rng(lv * 55 + k)).min; return t / 4; };
  const a = avg(1), b = avg(8), c = avg(22);
  assert.ok(a < b && b < c && c >= 8, `${a} ${b} ${c}`);
  for (const lv of [3, 8, 14, 22]) {
    const L = R.generate(lv, HH.rng(lv));
    assert.ok(R.naive(L, L.min) < 0, `livello ${lv}: la giocata golosa non risolve nel minimo`);
  }
});

test('A*: minimo esatto anche da stati intermedi', () => {
  const rnd = HH.rng(99);
  let checked = 0;
  for (let lv = 1; lv <= 7; lv++) {
    const L = R.generate(lv, HH.rng(lv * 31 + 5));
    let st = R.initial(L);
    for (let step = 0; step < 2 && !R.isSolved(st); step++) {
      const mv = R.legalMoves(L, st);
      const [r, end, h] = mv[Math.floor(rnd() * mv.length)];
      st = R.move(L, st, r, end, h).state;
      if (R.isSolved(st)) break;
      const a = R.solve(L, st, { nodeLimit: 50000 });
      const o = oStart(Object.assign({}, L, { ropes: st.ends, over: st.over }));
      o.plates = st.plates.slice();
      const bfs = oBFS(L, o);
      if (bfs === null) continue;
      if (bfs < 0) assert.ok(a.unsolvable); else assert.equal(a.min, bfs);
      checked++;
    }
  }
  assert.ok(checked >= 8);
});

test('mosse casuali: la logica e l\'oracolo producono sempre lo stesso stato', () => {
  const rnd = HH.rng(2024);
  for (let lv = 1; lv <= 22; lv += 3) {
    for (let k = 0; k < 3; k++) {
      const L = R.generate(lv, HH.rng(lv * 13 + k));
      let st = R.initial(L), s = oStart(L);
      for (let step = 0; step < 30 && !R.isSolved(st); step++) {
        const mv = R.legalMoves(L, st);
        assert.deepEqual(R.freeHoles(L, st).sort((a, b) => a - b), oFree(L, s).sort((a, b) => a - b));
        assert.deepEqual(R.freeRopes(L, st), s.ends.map((_, r) => r).filter((r) => oIsFree(s, r)));
        if (!mv.length) break;
        const [r, end, h] = mv[Math.floor(rnd() * mv.length)];
        st = R.move(L, st, r, end, h).state;
        s = oMove(L, s, r, end, h);
        sameState(st, s);
        assert.ok(R.validState(L, st));
      }
    }
  }
});

test('determinismo: stesso seme → stesso livello', () => {
  for (const lv of [1, 5, 12, 21]) {
    const a = R.generate(lv, HH.rng(777)), b = R.generate(lv, HH.rng(777));
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  }
});

test('salvataggio e ripresa: livello e stato sopravvivono al JSON; stati rotti o dei modelli precedenti vengono scartati', () => {
  const L = R.generate(9, HH.rng(5));
  const st0 = R.initial(L);
  const [r, end, h] = R.legalMoves(L, st0)[0];
  const st = R.move(L, st0, r, end, h).state;
  const snap = JSON.parse(JSON.stringify({ L, st, moves: 1 }));
  assert.ok(R.validLevel(snap.L));
  assert.ok(R.validState(snap.L, snap.st));
  assert.deepEqual(snap.st, st);
  assert.equal(R.solve(snap.L, snap.st).min, R.solve(L, st).min);
  const bad1 = JSON.parse(JSON.stringify(st)); bad1.ends[bad1.ends.findIndex(Boolean)] = [0, 0];
  assert.equal(R.validState(L, bad1), false);
  const bad2 = JSON.parse(JSON.stringify(st0)); bad2.over = [];
  assert.equal(R.validState(L, bad2), false, 'incroci senza strato');
  const bad3 = JSON.parse(JSON.stringify(st0)); bad3.plates = [];
  assert.equal(R.validState(L, bad3), false);
  const old = JSON.parse(JSON.stringify(L)); old.rule = 2; old.twists = [];
  assert.equal(R.validLevel(old), false, 'livelli del modello 2');
  assert.equal(R.validLevel({ cols: 4 }), false);
  assert.equal(R.validLevel(null), false);
});

test('fragoline e avanzamento', () => {
  assert.equal(R.rate(5, 5), 3);
  assert.equal(R.rate(6, 5), 2);
  assert.equal(R.rate(9, 5), 1);
  const L = R.generate(6, HH.rng(1));
  const st = R.initial(L);
  assert.equal(R.progress(L, st), 0);
  let s = st;
  for (const [r, end, h] of L.solution) s = R.move(L, s, r, end, h).state;
  assert.equal(R.progress(L, s), 1);
  assert.ok(R.isSolved(s));
});

test('livello di riserva valido e tempi del generatore (< 50 ms in media al livello più difficile)', () => {
  const F = R.FALLBACK();
  assert.ok(R.validLevel(F) && R.stableStart(F) && F.min >= 1 && oBFS(F) === F.min);
  let ms = 0;
  const T = 12;
  for (let k = 0; k < T; k++) { const t = performance.now(); R.generate(30, HH.rng(k + 500)); ms += performance.now() - t; }
  assert.ok(ms / T < 50 * SLOW, `media ${(ms / T).toFixed(2)} ms`);
});
