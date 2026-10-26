// Unit test Hari Knots: ogni livello generato dev'essere risolvibile e il minimo di mosse dichiarato (A*) dev'essere esatto.
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

/* ---------- oracolo: regole ---------- */
const pk = (i, j) => (i < j ? `${i},${j}` : `${j},${i}`);
function oStart(L) {
  const top = new Map(), tw = new Set();
  L.over.forEach(([i, j]) => top.set(pk(i, j), i));
  L.twists.forEach(([i, j]) => tw.add(pk(i, j)));
  return { ends: L.ropes.map((e) => e && e.slice()), top, tw, plates: L.plates.map(() => true) };
}
const oClone = (s) => ({ ends: s.ends.map((e) => e && e.slice()), top: new Map(s.top), tw: new Set(s.tw), plates: s.plates.slice() });
const contains = (p, [x, y]) => p[0] <= x && x <= p[2] && p[1] <= y && y <= p[3];
const overlap = (p, q) => !(p[2] < q[0] || q[2] < p[0] || p[3] < q[1] || q[3] < p[1]);
const ropeHit = (L, s, i, j) => hit(L.holes[s.ends[i][0]], L.holes[s.ends[i][1]], L.holes[s.ends[j][0]], L.holes[s.ends[j][1]]);
function oFree(L, s) {
  const used = new Set(s.ends.flatMap((e) => e || []));
  return L.holes.map((_, h) => h).filter((h) => !used.has(h) && L.plates.some((p, i) => s.plates[i] && contains(p, L.holes[h])));
}
function oMove(L, s0, r, end, h) {
  if (!s0.ends[r] || !oFree(L, s0).includes(h)) return null;
  const s = oClone(s0);
  s.ends[r][end] = h;
  for (let j = 0; j < s.ends.length; j++) {
    if (j === r || !s.ends[j]) continue;
    const k = pk(r, j);
    if (ropeHit(L, s, r, j)) { if (!s.top.has(k)) s.top.set(k, r); }
    else { s.top.delete(k); s.tw.delete(k); }
  }
  // corde: sparisce chi non è coperto né attorcigliato (ripetuto finché succede qualcosa)
  for (let changed = true; changed;) {
    changed = false;
    const alive = s.ends.map((e, i) => (e ? i : -1)).filter((i) => i >= 0);
    const gone = alive.filter((i) => !alive.some((j) => j !== i && s.top.get(pk(i, j)) === j) && !alive.some((j) => s.tw.has(pk(i, j))));
    for (const i of gone) {
      s.ends[i] = null;
      for (const k of [...s.top.keys()]) if (k.split(',').map(Number).includes(i)) s.top.delete(k);
      changed = true;
    }
  }
  // lastre: cade chi non è tenuto da nessuna corda e non ha lastre presenti sopra che la sovrappongono
  for (let changed = true; changed;) {
    changed = false;
    for (let p = L.plates.length - 1; p >= 0; p--) {
      if (!s.plates[p]) continue;
      const held = s.ends.some((e) => e && e.some((h) => contains(L.plates[p], L.holes[h])));
      const under = L.plates.some((q, i) => i > p && s.plates[i] && overlap(L.plates[p], q));
      if (!held && !under) { s.plates[p] = false; changed = true; }
    }
  }
  return s;
}
const oKey = (s) => JSON.stringify([s.ends, [...s.top.entries()].sort(), [...s.tw].sort(), s.plates]);
const oSolved = (s) => s.ends.every((e) => !e);
function oBFS(L, limit = 400000) {
  let frontier = [oStart(L)];
  const seen = new Set([oKey(frontier[0])]);
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
// stato dell'oracolo == stato pubblico della logica
function sameState(st, s) {
  assert.deepEqual(st.ends, s.ends);
  assert.deepEqual(st.plates, s.plates);
  const top = new Map(st.over.map(([i, j]) => [pk(i, j), i]));
  assert.deepEqual([...top.entries()].sort(), [...s.top.entries()].sort());
  assert.deepEqual(st.twists.map(([i, j]) => pk(i, j)).sort(), [...s.tw].sort());
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
// griglia 4×4, una lastra; fori numerati come in L.holes
function handLevel(extra = {}) {
  return Object.assign({
    cols: 4, rows: 4,
    holes: [[0, 0], [3, 0], [0, 1], [3, 3], [0, 3], [1, 3], [3, 1], [2, 2], [2, 0]],
    plates: [[0, 0, 3, 3]],
    ropes: [[2, 1], [0, 3], [4, 6]],                 // 0: (0,1)-(3,0) · 1: (0,0)-(3,3) · 2: (0,3)-(3,1)
    over: [[0, 1], [1, 2]], twists: [[0, 1]], min: 1,
  }, extra);
}

test('regole: coperta, attorcigliata, sparizione a cascata', () => {
  const L = handLevel();
  assert.ok(R.validLevel(L));
  assert.ok(R.stableStart(L), 'all\'inizio non sparisce nulla');
  const st = R.initial(L);
  assert.deepEqual(R.coverers(st, 2), [1]);
  assert.deepEqual(R.twinsOf(st, 0), [1]);
  // 0 si sposta in (2,0): non incrocia più 1 → sciolta, scoperta: sparisce; poi 1 e infine 2 (a cascata)
  const m = R.move(L, st, 0, 0, 8);
  assert.deepEqual(m.untwisted, [1]);
  assert.deepEqual(m.gone, [[0, 0], [1, 0], [2, 1]]);
  assert.ok(R.isSolved(m.state));
  assert.deepEqual(m.fell, [[0, 0]], 'la lastra senza corde cade');
  // 0 = (0,1)-(2,2): tocca 1 nel punto (2,2) (conta come incrocio) → resta attorcigliata;
  // incrocia 2 per la prima volta → ci va sopra; non sparisce nulla
  const m2 = R.move(L, st, 0, 1, 7);
  assert.equal(m2.gone.length, 0);
  assert.deepEqual(m2.state.twists, [[0, 1]]);
  assert.deepEqual(m2.lifted, [2]);
  assert.deepEqual(R.coverers(m2.state, 2).sort(), [0, 1]);
});

test('regole: la corda spostata va sopra quelle che incrocia per la prima volta, resta sotto chi la copriva', () => {
  // 0: (0,0)-(3,0) in alto · 1: (1,0)… no: costruiamo 3 corde con 2 sotto a 1 e 0 libera di muoversi
  const L = {
    cols: 4, rows: 4,
    holes: [[0, 1], [3, 1], [1, 0], [1, 3], [2, 0], [2, 3], [0, 3], [3, 3], [0, 0]],
    plates: [[0, 0, 3, 3]],
    ropes: [[0, 1], [2, 3], [4, 5]],                // 0 orizzontale y=1 · 1 verticale x=1 · 2 verticale x=2
    over: [[1, 0], [0, 2]], twists: [[0, 1]], min: 1,
  };
  assert.ok(R.stableStart(L));
  const st = R.initial(L);
  // l'estremità (3,1) di 0 va in (3,3): 0 = (0,1)-(3,3) incrocia ancora 1 (che resta sopra) e ancora 2 (resta sotto)
  const m = R.move(L, st, 0, 1, 7);
  assert.deepEqual(m.lifted, []);
  assert.deepEqual(m.gone, []);
  const o = new Set(m.state.over.map((x) => x.join()));
  assert.ok(o.has('1,0') && o.has('0,2'));
  // 2 si sposta: estremità (2,0) → (0,0): 2 = (0,0)-(2,3) incrocia 1 per la prima volta (va sopra) e 0 ancora (resta sotto)
  const m2 = R.move(L, m.state, 2, 0, 8);
  assert.deepEqual(m2.lifted, [1]);
  const o2 = new Set(m2.state.over.map((x) => x.join()));
  assert.ok(o2.has('2,1') && o2.has('0,2'));
  assert.deepEqual(m2.gone, []);
});

test('regole: mosse illegali (foro occupato, foro di una lastra caduta, corda sparita)', () => {
  const L = handLevel();
  const st = R.initial(L);
  assert.equal(R.move(L, st, 0, 0, 3), null, 'foro occupato');
  assert.equal(R.move(L, st, 0, 0, 0), null, 'foro occupato (dalla corda 1)');
  assert.equal(R.move(L, st, 0, 0, 99), null, 'foro inesistente');
  const gone = Object.assign(R.initial(L), { ends: [null, [0, 3], [4, 6]], over: [[1, 2]], twists: [] });
  assert.equal(R.move(L, gone, 0, 0, 8), null, 'corda sparita');
  // lastre: due lastre affiancate; senza la lastra di destra i suoi fori non esistono più
  const L2 = {
    cols: 4, rows: 2, holes: [[0, 0], [1, 1], [3, 0], [3, 1], [0, 1], [2, 0]],
    plates: [[0, 0, 1, 1], [2, 0, 3, 1]], ropes: [[0, 1], [4, 2]], over: [[0, 1]], twists: [[0, 1]], min: 1,
  };
  const s2 = Object.assign(R.initial(L2), { ends: [[0, 1], [4, 2]] });
  assert.deepEqual(R.freeHoles(L2, s2).sort(), [3, 5]);
  const s3 = Object.assign(R.initial(L2), { plates: [true, false], ends: [[0, 1], null], over: [], twists: [] });
  assert.deepEqual(R.freeHoles(L2, s3), [4]);
  assert.equal(R.move(L2, s3, 0, 0, 3), null);
});

test('lastre: quella sotto aspetta che cada quella sopra; fori condivisi tengono entrambe', () => {
  // lastra 0 (sotto) colonne 0..2, lastra 1 (sopra) colonne 2..4: la colonna 2 è in comune
  const L = {
    cols: 5, rows: 3,
    holes: [[0, 0], [1, 2], [2, 1], [4, 0], [4, 2], [3, 1], [0, 2], [3, 0]],
    plates: [[0, 0, 2, 2], [2, 0, 4, 2]],
    ropes: [[7, 4], [3, 5]], over: [[0, 1]], twists: [[0, 1]], min: 1,
  };
  const p = R.prep(L);
  assert.equal(p.pins[2], 3, 'il foro in colonna 2 tiene entrambe le lastre');
  assert.equal(p.pins[5], 2);
  assert.equal(p.above[0], 2, 'la lastra 1 sta sopra la 0');
  // due corde attorcigliate solo sulla lastra 1: la lastra 0 non è tenuta ma ha sopra la 1, quindi resta
  assert.ok(R.stableStart(L));
  // una corda sola e scoperta sulla lastra 1: sparisce, cade la 1 e solo dopo (turno successivo) la 0
  const S = R.packState(L, { ends: [[7, 4], null], over: [], twists: [], plates: [true, true] });
  const fx = R.settle(L, S);
  assert.deepEqual(fx.gone, [[0, 0]]);
  assert.deepEqual(fx.fell, [[1, 0], [0, 1]]);
  // la stessa mossa nell'oracolo: sposto 1 fuori dall'incrocio → spariscono entrambe, cadono 1 poi 0
  const m = R.move(L, R.initial(L), 1, 0, 2);    // 1 = (2,1)-(3,1): non incrocia più 0
  assert.ok(R.isSolved(m.state));
  assert.deepEqual(m.fell.map(([q]) => q), [1, 0]);
  const o = oMove(L, oStart(L), 1, 0, 2);
  assert.ok(oSolved(o) && o.plates.every((x) => !x));
});

/* ---------- generatore ---------- */
const SEEDS = (lv) => (lv <= 6 ? 12 : lv <= 12 ? 6 : 4);

test('generatore: livelli 1–24 validi, stabili, risolvibili; la soluzione dichiarata funziona nell\'oracolo', () => {
  for (let lv = 1; lv <= 24; lv++) {
    const c = R.config(lv);
    for (let k = 0; k < SEEDS(lv); k++) {
      const L = R.generate(lv, HH.rng(lv * 7919 + k));
      const tag = `livello ${lv} seme ${k}`;
      assert.ok(R.validLevel(L), tag);
      assert.equal(L.ropes.length, c.K, tag);
      assert.ok(R.stableStart(L), tag + ': nessuna corda sparisce all\'inizio');
      assert.ok(L.min >= 1 && L.solution.length === L.min, tag);
      // ogni corda all'inizio è coperta o attorcigliata (controllo dell'oracolo)
      const s0 = oStart(L);
      s0.ends.forEach((_, i) => {
        const cov = s0.ends.some((__, j) => j !== i && s0.top.get(pk(i, j)) === j);
        const tw = s0.ends.some((__, j) => s0.tw.has(pk(i, j)));
        assert.ok(cov || tw, `${tag}: corda ${i}`);
      });
      // ogni coppia che si incrocia ha uno strato; nessuna relazione tra corde che non si incrociano
      for (let i = 0; i < c.K; i++) for (let j = i + 1; j < c.K; j++) {
        assert.equal(s0.top.has(pk(i, j)), ropeHit(L, s0, i, j), `${tag}: strati ${i},${j}`);
        if (s0.tw.has(pk(i, j))) assert.ok(ropeHit(L, s0, i, j));
      }
      let s = s0;
      for (const [r, end, h] of L.solution) { s = oMove(L, s, r, end, h); assert.ok(s, tag + ': mossa legale'); }
      assert.ok(oSolved(s), tag + ': la soluzione libera tutto');
      assert.ok(s.plates.every((x) => !x), tag + ': tutte le lastre cadute');
    }
  }
});

test('generatore: il minimo (A*) coincide con la BFS esaustiva dell\'oracolo (livelli 1–14)', () => {
  for (let lv = 1; lv <= 14; lv++) {
    for (let k = 0; k < (lv <= 8 ? 4 : 2); k++) {
      const L = R.generate(lv, HH.rng(lv * 104729 + k));
      const d = oBFS(L);
      assert.ok(d !== null, `livello ${lv}: BFS entro il limite`);
      assert.equal(L.min, d, `livello ${lv} seme ${k}: minimo`);
    }
  }
});

test('A*: minimo esatto anche da stati intermedi, e "irrisolvibile" solo se la BFS lo conferma', () => {
  const rnd = HH.rng(99);
  let checked = 0, dead = 0;
  for (let lv = 2; lv <= 9; lv++) {
    const L = R.generate(lv, HH.rng(lv * 31 + 5));
    let st = R.initial(L);
    for (let step = 0; step < 3 && !R.isSolved(st); step++) {
      const mv = R.legalMoves(L, st);
      const [r, end, h] = mv[Math.floor(rnd() * mv.length)];
      st = R.move(L, st, r, end, h).state;
      const a = R.solve(L, st, { nodeLimit: 50000 });
      const L2 = Object.assign({}, L, { ropes: st.ends, over: st.over, twists: st.twists });
      // BFS dell'oracolo partendo dallo stato intermedio (lastre presenti incluse)
      const o = oStart(L2); o.plates = st.plates.slice();
      const bfs = ((s0) => {
        let fr = [s0]; const seen = new Set([oKey(s0)]);
        for (let dd = 0; fr.length; dd++) {
          const nx = [];
          for (const s of fr) {
            if (oSolved(s)) return dd;
            s.ends.forEach((e, rr) => { if (e) for (const en of [0, 1]) for (const hh of oFree(L, s)) { const t = oMove(L, s, rr, en, hh), kk = oKey(t); if (!seen.has(kk)) { seen.add(kk); nx.push(t); } } });
          }
          fr = nx;
        }
        return -1;
      })(o);
      if (bfs < 0) { dead++; assert.ok(a.unsolvable); } else assert.equal(a.min, bfs);
      checked++;
    }
  }
  assert.ok(checked >= 10);
  void dead;
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

test('salvataggio e ripresa: livello e stato sopravvivono al JSON; stati rotti vengono scartati', () => {
  const L = R.generate(9, HH.rng(5));
  const st0 = R.initial(L);
  const [r, end, h] = R.legalMoves(L, st0)[0];
  const st = R.move(L, st0, r, end, h).state;
  const snap = JSON.parse(JSON.stringify({ L, st, moves: 1 }));
  assert.ok(R.validLevel(snap.L));
  assert.ok(R.validState(snap.L, snap.st));
  assert.deepEqual(snap.st, st);
  // il risolutore riparte dallo stato salvato
  const a = R.solve(snap.L, snap.st), b = R.solve(L, st);
  assert.equal(a.min, b.min);
  // stati rotti
  const bad1 = JSON.parse(JSON.stringify(st)); bad1.ends[0] = [0, 0];
  assert.equal(R.validState(L, bad1), false);
  const bad2 = JSON.parse(JSON.stringify(st0)); bad2.over = [];
  assert.equal(R.validState(L, bad2), false, 'incroci senza strato');
  const bad3 = JSON.parse(JSON.stringify(st0)); bad3.plates = [];
  assert.equal(R.validState(L, bad3), false);
  assert.equal(R.validLevel({ cols: 4 }), false);
  assert.equal(R.validLevel(null), false);
});

test('fragoline e avanzamento', () => {
  assert.equal(R.rate(3, 3), 3);
  assert.equal(R.rate(4, 3), 2);
  assert.equal(R.rate(9, 3), 1);
  const L = R.generate(6, HH.rng(1));
  const st = R.initial(L);
  assert.equal(R.progress(L, st), 0);
  let s = st;
  for (const [r, end, h] of L.solution) s = R.move(L, s, r, end, h).state;
  assert.equal(R.progress(L, s), 1);
  assert.ok(R.isSolved(s));
});

test('livello di riserva valido e tempi del generatore (< 10 ms in media al livello più difficile)', () => {
  const F = R.FALLBACK();
  assert.ok(R.validLevel(F) && R.stableStart(F) && F.min === 1 && oBFS(F) === 1);
  let ms = 0;
  const T = 20;
  for (let k = 0; k < T; k++) { const t = performance.now(); R.generate(30, HH.rng(k + 500)); ms += performance.now() - t; }
  assert.ok(ms / T < 10, `media ${(ms / T).toFixed(2)} ms`);
});
