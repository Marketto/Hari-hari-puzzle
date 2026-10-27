// Unit test Hari Knots (regole modello 2: il capo viaggia in aria, chi passa sopra chi la copriva ci si avvolge):
// ogni livello generato dev'essere risolvibile e il minimo di mosse dichiarato (A*) dev'essere esatto.
// L'ORACOLO è indipendente dalla logica del gioco: un simulatore riscritto da zero a partire dalle regole
// (incroci con formula parametrica razionale, strati in una Map di coppie, attorcigliamenti in un Set, lastre in un array)
// e una ricerca in ampiezza esaustiva (BFS) con chiavi JSON, senza euristica.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

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

/* ---------- oracolo: regole (modello 2: il capo viaggia in aria) ---------- */
const pk = (i, j) => (i < j ? `${i},${j}` : `${j},${i}`);
// stato: ends · top: coppia → corda di sopra · wrap: coppia → [chi è avvolta, attorno a chi] · plates
function oStart(L) {
  const top = new Map(), wrap = new Map();
  L.over.forEach(([i, j]) => top.set(pk(i, j), i));
  L.twists.forEach(([i, j]) => wrap.set(pk(i, j), [i, j]));
  return { ends: L.ropes.map((e) => e && e.slice()), top, wrap, plates: L.plates.map(() => true) };
}
const oClone = (s) => ({ ends: s.ends.map((e) => e && e.slice()), top: new Map(s.top), wrap: new Map(s.wrap), plates: s.plates.slice() });
const contains = (p, [x, y]) => p[0] <= x && x <= p[2] && p[1] <= y && y <= p[3];
const overlap = (p, q) => !(p[2] < q[0] || q[2] < p[0] || p[3] < q[1] || q[3] < p[1]);
const segOf = (L, e) => [L.holes[e[0]], L.holes[e[1]]];
const ropeHit = (L, s, i, j) => hit(...segOf(L, s.ends[i]), ...segOf(L, s.ends[j]));
function oFree(L, s) {
  const used = new Set(s.ends.flatMap((e) => e || []));
  return L.holes.map((_, h) => h).filter((h) => !used.has(h) && L.plates.some((p, i) => s.plates[i] && contains(p, L.holes[h])));
}
function oMove(L, s0, r, end, h) {
  if (!s0.ends[r] || !oFree(L, s0).includes(h)) return null;
  const s = oClone(s0);
  const from = L.holes[s.ends[r][end]], fixed = L.holes[s.ends[r][1 - end]], to = L.holes[h];
  s.ends[r][end] = h;
  for (let j = 0; j < s.ends.length; j++) {
    if (j === r || !s.ends[j]) continue;
    const k = pk(r, j), B = segOf(L, s.ends[j]);
    const p = hit(from, to, ...B);        // il capo, in aria, passa sopra B
    const c1 = hit(fixed, to, ...B);      // la corda posata incrocia B
    const wasTop = s.top.get(k), wrapped = s.wrap.has(k);
    s.top.delete(k);
    if (wrapped) {
      if (p) { s.wrap.delete(k); if (c1) s.top.set(k, j); }
    } else if (wasTop === j) {
      if (p) s.wrap.set(k, [r, j]);
      else if (c1) s.top.set(k, j);
    } else if (c1) s.top.set(k, r);
  }
  // corde: sparisce chi non ha corde sopra e non è avvolta (ripetuto finché succede qualcosa)
  for (let changed = true; changed;) {
    changed = false;
    const alive = s.ends.map((e, i) => (e ? i : -1)).filter((i) => i >= 0);
    const gone = alive.filter((i) => !alive.some((j) => j !== i && (s.top.get(pk(i, j)) === j || s.wrap.has(pk(i, j)))));
    for (const i of gone) {
      s.ends[i] = null;
      for (const k of [...s.top.keys()]) if (k.split(',').map(Number).includes(i)) s.top.delete(k);
      changed = true;
    }
  }
  // lastre: cade chi non è tenuta da nessuna corda e non ha lastre presenti sopra che la sovrappongono
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
const oKey = (s) => JSON.stringify([s.ends, [...s.top.entries()].sort(), [...s.wrap.keys()].sort(), s.plates]);
const oSolved = (s) => s.ends.every((e) => !e);
function oBFS(L, s0 = oStart(L), limit = 300000) {
  let frontier = [s0];
  const seen = new Set([oKey(s0)]);
  for (let d = 0; frontier.length; d++) {
    const next = [];
    for (const s of frontier) {
      if (oSolved(s)) return d;
      s.ends.forEach((e, r) => {
        if (!e) return;
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
// stato dell'oracolo == stato pubblico della logica (direzione dell'avvolgimento inclusa)
function sameState(st, s) {
  assert.deepEqual(st.ends, s.ends);
  assert.deepEqual(st.plates, s.plates);
  const top = new Map(st.over.map(([i, j]) => [pk(i, j), i]));
  assert.deepEqual([...top.entries()].sort(), [...s.top.entries()].sort());
  assert.deepEqual(st.twists.map((x) => JSON.stringify(x)).sort(), [...s.wrap.values()].map((x) => JSON.stringify(x)).sort());
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
// griglia 5×5: corda 0 = B orizzontale (0,2)-(4,2); corda 1 = A verticale (1,4)-(1,0) che incrocia B in (1,2)
const HOLES = [[0, 2], [4, 2], [1, 4], [1, 0], [3, 0], [3, 4], [4, 4], [2, 0]];
function two(over, twists = [], ropes = [[0, 1], [2, 3]]) {
  return { rule: R.RULE, cols: 5, rows: 5, holes: HOLES, plates: [[0, 0, 4, 4]], ropes, over, twists, min: 1 };
}
// confronto diretto logica/oracolo sulla relazione subito dopo la mossa (prima delle sparizioni)
function both(L, st, r, end, h) {
  const m = R.move(L, st, r, end, h);
  const o = oMove(L, oStart(Object.assign({}, L, { ropes: st.ends, over: st.over, twists: st.twists })), r, end, h);
  return { m, pre: m.pre, o };
}
const rel = (pre) => ({ over: pre.over.map((x) => x.join()).sort(), twists: pre.twists.map((x) => x.join()).sort() });

test('regola 1 — A sopra B: dopo A sopra B se la corda posata incrocia B, altrimenti niente (anche se il capo passa sopra B)', () => {
  const L = two([[1, 0]]);
  let { pre } = both(L, R.initial(L), 1, 1, 4);              // (1,0)→(3,0): A = (1,4)-(3,0) incrocia ancora B
  assert.deepEqual(rel(pre), { over: ['1,0'], twists: [] });
  ({ pre } = both(L, R.initial(L), 1, 0, 4));                 // (1,4)→(3,0): passa sopra B, A = (3,0)-(1,0) non incrocia
  assert.deepEqual(rel(pre), { over: [], twists: [] });
});

test('regola 2 — nessuna relazione: se la corda posata incrocia B ci arriva sopra', () => {
  const L = two([], [], [[0, 1], [3, 4]]);                    // A = (1,0)-(3,0), lontana da B
  const st = R.initial(L);
  const { pre, m } = both(L, st, 1, 1, 5);                     // (3,0)→(3,4): A = (1,0)-(3,4) incrocia B
  assert.deepEqual(rel(pre), { over: ['1,0'], twists: [] });
  assert.deepEqual(m.lifted, [0]);
});

test('regola 3 — B sopra A: il capo che passa sopra B ci si AVVOLGE; altrimenti B resta sopra (se incrociano)', () => {
  const L = two([[0, 1]]);
  let r = both(L, R.initial(L), 1, 1, 4);                      // (1,0)→(3,0): il capo non passa sopra B
  assert.deepEqual(rel(r.pre), { over: ['0,1'], twists: [] });
  r = both(L, R.initial(L), 1, 0, 4);                          // (1,4)→(3,0): il capo passa sopra B
  assert.deepEqual(rel(r.pre), { over: [], twists: ['1,0'] }, 'A avvolta attorno a B');
  assert.deepEqual(r.m.wrapped, [0]);
  assert.equal(r.m.gone.length, 0, 'avvolte: nessuna delle due sparisce, anche se i segmenti non si incrociano più');
  sameState(r.m.state, r.o);
  // B sopra A ma senza passarci sopra e senza incrociare più: B non copre più A → A sparisce
  const L2 = two([[0, 1]], [], [[0, 1], [2, 3]]);
  const r2 = both(L2, R.initial(L2), 1, 0, 6);                 // (1,4)→(4,4): il capo non attraversa B, A = (4,4)-(1,0) incrocia B
  assert.deepEqual(rel(r2.pre), { over: ['0,1'], twists: [] });
});

test('regola 4 — avvolte: restano avvolte finché un capo non ripassa sopra l\'altra (con A o con B: simmetrico)', () => {
  const L = two([], [[1, 0]], [[0, 1], [4, 3]]);               // A = (3,0)-(1,0) avvolta attorno a B, i segmenti non si incrociano
  assert.ok(R.validLevel(L) && R.stableStart(L));
  const st = R.initial(L);
  // A si sposta senza passare sopra B: resta avvolta
  let r = both(L, st, 1, 0, 7);                                // (3,0)→(2,0)
  assert.deepEqual(rel(r.pre), { over: [], twists: ['1,0'] });
  sameState(r.m.state, r.o);
  // A ripassa sopra B: si srotola; la corda posata incrocia B → B sopra A
  r = both(L, st, 1, 0, 5);                                    // (3,0)→(3,4)
  assert.deepEqual(rel(r.pre), { over: ['0,1'], twists: [] });
  assert.deepEqual(r.m.unwound, [0]);
  sameState(r.m.state, r.o);
  // B si sposta senza passare sopra A: restano avvolte
  r = both(L, st, 0, 1, 6);                                    // B: (4,2)→(4,4)
  assert.deepEqual(rel(r.pre), { over: [], twists: ['1,0'] });
  // B ripassa sopra A (tocca A in (2,0)): si srotola; B posata tocca A → A sopra B
  r = both(L, st, 0, 1, 7);                                    // B: (4,2)→(2,0)
  assert.deepEqual(rel(r.pre), { over: ['1,0'], twists: [] });
  assert.deepEqual(r.m.unwound, [1]);
  sameState(r.m.state, r.o);
  // srotolata e non più incrociata: libera → sparisce (se nessun'altra la copre)
  r = both(L, st, 1, 1, 6);                                    // A: (1,0)→(4,4): passa sopra B, A = (3,0)-(4,4) incrocia B → B sopra A
  assert.deepEqual(rel(r.pre), { over: ['0,1'], twists: [] });
});

test('regole: sparizione a cascata e lastre', () => {
  // A avvolta attorno a B: srotolandola, B (scoperta) vola via al primo turno, A (non più coperta) al secondo; poi cade la lastra
  const L = two([], [[1, 0]], [[0, 1], [4, 3]]);
  const m = R.move(L, R.initial(L), 1, 0, 5);
  assert.deepEqual(m.unwound, [0]);
  assert.deepEqual(m.gone, [[0, 0], [1, 1]]);
  assert.deepEqual(m.fell, [[0, 0]]);
  assert.ok(R.isSolved(m.state));
  // una corda attorcigliata non sparisce mai, anche scoperta
  const m2 = R.move(L, R.initial(L), 1, 0, 7);
  assert.equal(m2.gone.length, 0);
});

test('regole: mosse illegali (foro occupato, foro di una lastra caduta, corda sparita)', () => {
  const L = two([[0, 1]]);
  const st = R.initial(L);
  assert.equal(R.move(L, st, 1, 0, 3), null, 'foro occupato');
  assert.equal(R.move(L, st, 1, 0, 0), null, 'foro occupato (dalla corda 0)');
  assert.equal(R.move(L, st, 1, 0, 99), null, 'foro inesistente');
  const gone = Object.assign(R.initial(L), { ends: [[0, 1], null], over: [], twists: [] });
  assert.equal(R.move(L, gone, 1, 0, 4), null, 'corda sparita');
  const L2 = {
    rule: R.RULE, cols: 4, rows: 2, holes: [[0, 0], [1, 1], [3, 0], [3, 1], [0, 1], [2, 0]],
    plates: [[0, 0, 1, 1], [2, 0, 3, 1]], ropes: [[0, 1], [4, 2]], over: [[0, 1]], twists: [], min: 1,
  };
  const s3 = Object.assign(R.initial(L2), { plates: [true, false], ends: [[0, 1], null], over: [], twists: [] });
  assert.deepEqual(R.freeHoles(L2, s3), [4]);
  assert.equal(R.move(L2, s3, 0, 0, 3), null);
});

test('lastre: quella sotto aspetta che cada quella sopra; fori condivisi tengono entrambe', () => {
  const L = {
    rule: R.RULE, cols: 5, rows: 3,
    holes: [[0, 0], [1, 2], [2, 1], [4, 0], [4, 2], [3, 1], [0, 2], [3, 0]],
    plates: [[0, 0, 2, 2], [2, 0, 4, 2]],
    ropes: [[7, 4], [3, 5]], over: [], twists: [[1, 0]], min: 1,
  };
  const p = R.prep(L);
  assert.equal(p.pins[2], 3, 'il foro in colonna 2 tiene entrambe le lastre');
  assert.equal(p.above[0], 2, 'la lastra 1 sta sopra la 0');
  assert.ok(R.stableStart(L), 'due corde avvolte sulla lastra 1: la 0 non è tenuta ma ha sopra la 1');
  const S = R.packState(L, { ends: [[7, 4], null], over: [], twists: [], plates: [true, true] });
  const fx = R.settle(L, S);
  assert.deepEqual(fx.gone, [[0, 0]]);
  assert.deepEqual(fx.fell, [[1, 0], [0, 1]]);
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
      s0.ends.forEach((_, i) => {
        const held = s0.ends.some((__, j) => j !== i && (s0.top.get(pk(i, j)) === j || s0.wrap.has(pk(i, j))));
        assert.ok(held, `${tag}: corda ${i} coperta o avvolta`);
      });
      for (let i = 0; i < c.K; i++) for (let j = i + 1; j < c.K; j++) {
        if (s0.top.has(pk(i, j))) assert.ok(ropeHit(L, s0, i, j), `${tag}: strato solo se si incrociano`);
        else if (!s0.wrap.has(pk(i, j))) assert.ok(!ropeHit(L, s0, i, j), `${tag}: ogni incrocio ha uno strato`);
      }
      let s = s0;
      for (const [r, end, h] of L.solution) { s = oMove(L, s, r, end, h); assert.ok(s, tag + ': mossa legale'); }
      assert.ok(oSolved(s), tag + ': la soluzione libera tutto');
      assert.ok(s.plates.every((x) => !x), tag + ': tutte le lastre cadute');
    }
  }
});

test('generatore: il minimo (A*) coincide con la BFS esaustiva dell\'oracolo (livelli 1–10)', () => {
  for (let lv = 1; lv <= 10; lv++) {
    for (let k = 0; k < (lv <= 6 ? 3 : 1); k++) {
      const L = R.generate(lv, HH.rng(lv * 104729 + k));
      const d = oBFS(L);
      assert.ok(d !== null, `livello ${lv}: BFS entro il limite`);
      assert.equal(L.min, d, `livello ${lv} seme ${k}: minimo`);
    }
  }
});

test('difficoltà: il minimo cresce col livello e la giocata ingenua non basta (dal livello 4)', () => {
  const avg = (lv) => { let t = 0; for (let k = 0; k < 4; k++) t += R.generate(lv, HH.rng(lv * 55 + k)).min; return t / 4; };
  const a = avg(1), b = avg(8), c = avg(22);
  assert.ok(a <= b && b < c && c >= 5, `${a} ${b} ${c}`);
  for (const lv of [8, 14, 22]) {
    const L = R.generate(lv, HH.rng(lv));
    assert.ok(R.naive(L, L.min) < 0, `livello ${lv}: la giocata golosa non risolve nel minimo`);
    assert.ok(L.min > R.heuristic(L.ropes.length, R.packState(L, R.initial(L)), new Int32Array(L.ropes.length)) || L.min >= 4);
  }
});

test('A*: minimo esatto anche da stati intermedi, e "irrisolvibile" solo se la BFS lo conferma', () => {
  const rnd = HH.rng(99);
  let checked = 0;
  for (let lv = 1; lv <= 7; lv++) {
    const L = R.generate(lv, HH.rng(lv * 31 + 5));
    let st = R.initial(L);
    for (let step = 0; step < 2 && !R.isSolved(st); step++) {
      const mv = R.legalMoves(L, st);
      const [r, end, h] = mv[Math.floor(rnd() * mv.length)];
      st = R.move(L, st, r, end, h).state;
      const a = R.solve(L, st, { nodeLimit: 50000 });
      const o = oStart(Object.assign({}, L, { ropes: st.ends, over: st.over, twists: st.twists }));
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

test('salvataggio e ripresa: livello e stato sopravvivono al JSON; stati rotti o del vecchio modello vengono scartati', () => {
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
  const bad3 = JSON.parse(JSON.stringify(st0)); bad3.plates = [];
  assert.equal(R.validState(L, bad3), false);
  // una coppia non può essere avvolta e avere anche uno strato
  if (st0.over.length) {
    const bad4 = JSON.parse(JSON.stringify(st0)); bad4.twists.push(bad4.over[0].slice());
    assert.equal(R.validState(L, bad4), false);
  }
  const old = JSON.parse(JSON.stringify(L)); delete old.rule;
  assert.equal(R.validLevel(old), false, 'livelli del modello 1');
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
  assert.ok(ms / T < 50, `media ${(ms / T).toFixed(2)} ms`);
});
