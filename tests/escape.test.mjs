// Unit test Hari Escape. Oracolo indipendente: un "bot esploratore" che usa SOLO ciò che il giocatore vede (oggetti
// delle stanze raggiunte e illuminate, indizi appesi o sui biglietti dell'inventario, parametri visibili degli enigmi)
// e risolutori scritti qui (mai `secret`, `order`, `gives` o `at` del generatore): decodifica gli indizi con le regole
// del gioco, prova gli oggetti sui contenitori, combina gli oggetti, risolve i sotto-puzzle con BFS/DFS propri.
// Poi: grafo aciclico, determinismo, ripresa da JSON, aiuti, varietà, curva di difficoltà, velocità, solo token CSS.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/games/escape-logic.js');
const E = HH.escape;
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const SEEDS = [1, 7, 42, 99, 1234, 31337];
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

/* ---------- risolutori indipendenti dei sotto-puzzle ---------- */
// scorrimento: IDA* con distanza di Manhattan (soluzione ottima, memoria minima)
function bfsSlide(w, h, t0) {
  const N = w * h, t = t0.slice();
  const md = () => { let s = 0; t.forEach((v, i) => { if (v !== N - 1) s += Math.abs((v % w) - (i % w)) + Math.abs(((v / w) | 0) - ((i / w) | 0)); }); return s; };
  const path = [];
  const dfs = (g, bound, b, prev) => {
    const hh = md();
    if (hh === 0) return true;
    if (g + hh > bound) return false;
    for (let d = 0; d < 4; d++) {
      const x = (b % w) + DX[d], y = ((b / w) | 0) + DY[d];
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = y * w + x;
      if (p === prev) continue;
      t[b] = t[p]; t[p] = N - 1; path.push(p);
      if (dfs(g + 1, bound, p, b)) return true;
      path.pop(); t[p] = t[b]; t[b] = N - 1;
    }
    return false;
  };
  for (let bound = md(); bound <= 60; bound++) if (dfs(0, bound, t.indexOf(N - 1), -1)) return path.slice();
  return null;
}
function lightsSolve(w, h, b) {
  const N = w * h;
  for (let sub = 0; sub < 1 << N; sub++) {
    const v = b.slice();
    for (let i = 0; i < N; i++) if (sub & (1 << i)) {
      const x = i % w, y = (i / w) | 0;
      v[i] ^= 1;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < w && ny < h) v[ny * w + nx] ^= 1; }
    }
    if (v.every(Boolean)) return [...Array(N).keys()].filter((i) => sub & (1 << i));
  }
  return null;
}
const BASE = { I: [0, 2], L: [0, 1], T: [0, 1, 2] };     // aperture a rotazione 0 (0 N, 1 E, 2 S, 3 O)
const opens = (kind, r) => BASE[kind].map((d) => (d + r) % 4);
// tubi: cammino dall'ingresso a sinistra all'uscita a destra, scegliendo la rotazione di ogni casella toccata
function pipesSolve(pz) {
  const { w, h, src, dst, kinds } = pz, rot = {};
  const go = (x, y, inDir, seen) => {
    const c = y * w + x;
    for (let r = 0; r < 4; r++) {
      const o = opens(kinds[c], r);
      if (!o.includes(inDir)) continue;
      rot[c] = r;
      for (const out of o) {
        if (out === inDir) continue;
        if (x === w - 1 && y === dst && out === 1) return true;
        const nx = x + DX[out], ny = y + DY[out];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(ny * w + nx)) continue;
        seen.add(ny * w + nx);
        if (go(nx, ny, (out + 2) % 4, seen)) return true;
        seen.delete(ny * w + nx);
      }
      delete rot[c];
    }
    return false;
  };
  return go(0, src, 3, new Set([src * w])) ? rot : null;
}
function mazeBfs(n, open, from, to) {
  const prev = new Map([[from, null]]), q = [from];
  while (q.length) {
    const c = q.shift();
    if (c === to) break;
    for (let d = 0; d < 4; d++) {
      if (!(open[c] & (1 << d))) continue;
      const m = (((c / n) | 0) + DY[d]) * n + (c % n) + DX[d];
      if (!prev.has(m)) { prev.set(m, [c, d]); q.push(m); }
    }
  }
  if (!prev.has(to)) return null;
  const out = [];
  for (let c = to; prev.get(c); c = prev.get(c)[0]) out.unshift(prev.get(c)[1]);
  return out;
}
// specchi: '/' gira E→N, N→E, O→S, S→O; '\' gira E→S, S→E, O→N, N→O
function mirrorHit(pz, o) {
  let x = 0, y = pz.src, d = 1;
  for (let k = 0; k < 200; k++) {
    if (x < 0 || y < 0 || x >= pz.n || y >= pz.n) return false;
    const c = y * pz.n + x;
    if (c === pz.target) return true;
    const i = pz.mirrors.indexOf(c);
    if (i >= 0) d = o[i] === 0 ? [1, 0, 3, 2][d] : [3, 2, 1, 0][d];
    x += DX[d]; y += DY[d];
  }
  return false;
}
function mirrorSolve(pz) {
  const m = pz.mirrors.length;
  for (let sub = 0; sub < 1 << m; sub++) { const o = [...Array(m).keys()].map((i) => (sub >> i) & 1); if (mirrorHit(pz, o)) return o; }
  return null;
}
function subset(ws, avail, target) {
  for (let m = 1; m < 1 << ws.length; m++) {
    let s = 0, okm = true;
    ws.forEach((w, i) => { if (m & (1 << i)) { if (!avail[i]) okm = false; s += w; } });
    if (okm && s === target) return ws.map((_, i) => (m >> i) & 1);
  }
  return null;
}

/* ---------- lettura degli indizi (regole del gioco, scritte qui) ---------- */
function decodeDigits(pz, clue, all) {
  if (!pz.dials) {
    if (clue.kind !== 'msg') return [];
    return all.filter((t) => t.kind === 'table').map((t) => clue.msg.map((g) => (t.table.find((e) => e.s === g) || { d: -1 }).d)).filter((c) => c.every((d) => d >= 0));
  }
  const byGem = (list, f) => pz.dials.map((g) => { const e = list.find((m) => m.g === g); return e ? f(e) : -1; });
  let code = null;
  if (clue.kind === 'paint') code = byGem(clue.marks, (m) => m.d);
  if (clue.kind === 'books') code = byGem(clue.books, (m) => m.d);
  if (clue.kind === 'clock') code = byGem(clue.clocks, (m) => m.h);
  if (clue.kind === 'count') code = pz.dials.map((g) => clue.dots.filter((d) => d.g === g).length);
  return code && code.every((d) => d >= 0 && d <= 9) ? [code] : [];
}

/* ---------- bot esploratore ---------- */
function bot(s, opts = {}) {
  const L = E.levelOf(s);
  const stats = { tries: 0, steps: 0 };
  const known = () => {
    const out = [];
    for (const o of Object.values(L.o)) if (o.role === 'clue' && o.room <= E.reach(s) && E.lit(s, o.room)) out.push(o.clue);
    for (const id of s.inv) if (L.items[id].kind === 'note') out.push(L.items[id].clue);
    return out;
  };
  const roomObjs = (r) => Object.values(L.o).filter((o) => o.room === r);
  function solvePz(pz) {
    const st = s.ps[pz.id];
    const act = (...a) => { stats.steps++; return E.act(s, pz.id, ...a); };
    const done = () => !!s.solved[pz.id];
    const clues = known();
    switch (pz.type) {
      case 'paint': case 'count': case 'books': case 'clock': case 'cipher': {
        for (const cl of clues) for (const code of decodeDigits(pz, cl, clues)) {
          stats.tries++;
          code.forEach((d, i) => { let g = 0; while (st.v[i] !== d && g++ < 10) act('dial', i, 1); });
          if (done()) return;
        }
        return;
      }
      case 'colors': for (const cl of clues) if (cl.kind === 'balloons' && cl.seq.length === pz.len) { stats.tries++; st.e = st.e.slice(0, 0); cl.seq.forEach((g) => act('press', g)); if (done()) return; } return;
      case 'simon': for (const cl of clues) if (cl.kind === 'sheet' && cl.notes.length === pz.len) { stats.tries++; cl.notes.forEach((b) => act('press', b)); if (done()) return; } return;
      case 'levers': for (const cl of clues) if (cl.kind === 'levers' && cl.pos.length === pz.n) { stats.tries++; cl.pos.forEach((p, i) => { if (st.p[i] !== p) act('toggle', i); }); if (done()) return; } return;
      case 'lights': { const sol = lightsSolve(pz.w, pz.h, st.b); assert.ok(sol, 'lampadine risolvibili'); sol.forEach((i) => act('press', i)); return; }
      case 'slide': { const sol = bfsSlide(pz.w, pz.h, st.t); assert.ok(sol, 'scorrimento risolvibile'); sol.forEach((p) => act('move', p)); return; }
      case 'balance': {
        const avail = pz.weights.map((_, i) => i !== pz.missing || s.used[pz.needs[0]]);
        const sol = subset(pz.weights, avail, pz.target);
        if (!sol) return;                                           // manca ancora il peso da trovare
        sol.forEach((v, i) => { if (st.on[i] !== v) act('toggle', i); });
        return;
      }
      case 'pipes': { const rot = pipesSolve(pz); assert.ok(rot, 'tubi risolvibili'); for (const [c, r] of Object.entries(rot)) { let g = 0; while (st.r[c] !== r && g++ < 4) act('rot', +c); } return; }
      case 'maze': { const p = mazeBfs(pz.n, pz.open, st.p, pz.goal); assert.ok(p, 'labirinto risolvibile'); p.forEach((d) => act('move', d)); return; }
      case 'mirror': { const o = mirrorSolve(pz); assert.ok(o, 'specchi risolvibili'); o.forEach((v, i) => { if (st.o[i] !== v) act('flip', i); }); return; }
      case 'shadow': pz.shadows.forEach((t) => act('pick', t)); return;
      default:
    }
  }
  for (let guard = 0; guard < 400 && !s.won; guard++) {
    const before = JSON.stringify(s.solved) + s.inv.join() + JSON.stringify(s.open) + E.reach(s);
    if (opts.stopAt && Object.keys(s.solved).length >= opts.stopAt) return stats;
    for (let r = 0; r <= E.reach(s) && !s.won; r++) {
      if (s.room !== r) E.go(s, r);
      // stanza buia: prova ogni oggetto sulla stanza
      if (!E.lit(s, r)) { for (const id of s.inv.slice()) if (E.use(s, id, 'room').type === 'used') break; }
      if (!E.lit(s, r)) continue;
      for (const o of roomObjs(r)) {
        if (o.role === 'hide' && !s.open[o.id]) E.search(s, o.id);
        for (const id of Object.keys(L.items)) if (E.itemShown(s, id) && E.itemObj(L, id) === o.id) E.take(s, id);
        if (o.role === 'lock' && !s.solved[o.pid]) {
          for (const id of s.inv.slice()) { if (s.solved[o.pid]) break; if (L.items[id].kind !== 'note') E.use(s, id, o.id); }
          if (!s.solved[o.pid]) solvePz(L.p[o.pid]);
          for (const id of Object.keys(L.items)) if (E.itemShown(s, id) && E.itemObj(L, id) === o.id) E.take(s, id);
        }
      }
    }
    // combinazioni di oggetti
    for (const a of s.inv.slice()) for (const b of s.inv.slice()) if (a < b && s.inv.includes(a) && s.inv.includes(b)) E.combine(s, a, b);
    const after = JSON.stringify(s.solved) + s.inv.join() + JSON.stringify(s.open) + E.reach(s);
    if (before === after) break;
  }
  return stats;
}

/* ---------- test ---------- */
test('curva di difficoltà: monotona, ≥ 4 gradini, livello 1 = 1 stanza e 3 enigmi', () => {
  let prev = -1;
  const steps = new Set();
  for (const L of LEVELS.concat([25, 30, 40])) {
    const d = E.diffOf(L), c = E.config(L);
    assert.ok(d >= prev, `diff ${L}: ${d} < ${prev}`);
    prev = d; steps.add(d);
    assert.ok(c.rooms >= 1 && c.rooms <= 3 && c.n >= 3 && c.n <= 10);
  }
  assert.ok(steps.size >= 4);
  assert.deepEqual([E.config(1).rooms, E.config(1).n], [1, 3]);
  assert.ok(E.config(3).rooms === 2 && E.config(6).rooms === 3 && E.config(11).n === 10);
});

test('il bot esploratore (solo informazioni visibili) esce da ogni livello 1–20', () => {
  for (const L of LEVELS) for (const seed of SEEDS) {
    const s = E.newGame(L, seed);
    const lv = E.levelOf(s);
    assert.equal(lv.n, E.config(L).n, `livello ${L}: numero di enigmi`);
    assert.equal(lv.rooms.length, E.config(L).rooms);
    assert.ok(!E.isWon(s) && E.progress(s) === 0);
    bot(s);
    assert.ok(s.won, `livello ${L} seme ${seed}: il bot non esce (${Object.keys(s.solved).length}/${lv.n} risolti)`);
    assert.equal(Object.keys(s.solved).length, lv.n, 'ogni enigma è servito');
    assert.equal(E.progress(s), 1);
    assert.equal(s.hv + s.hp, 0);
    assert.equal(E.rate(s), 3);
  }
});

test('grafo delle dipendenze: aciclico, ogni enigma raggiungibile e indispensabile', () => {
  for (const L of LEVELS) for (const seed of SEEDS) {
    const lv = E.levelOf(E.newGame(L, seed));
    // dipendenze ricostruite dai dati: oggetti richiesti (e i loro pezzi), biglietti, porta della stanza, luce
    const deps = {};
    const roomDeps = (r) => { const d = []; if (r > 0) d.push(lv.doors[r - 1]); const dk = Object.values(lv.p).find((p) => p.type === 'dark' && p.room === r); if (dk) d.push(dk.id); return d; };
    const itemDeps = (id) => {
      const it = lv.items[id];
      if (it.from) return it.from.flatMap(itemDeps);
      if (it.at.pid) return [it.at.pid];
      return roomDeps(lv.o[it.at.obj].room);
    };
    for (const p of Object.values(lv.p)) {
      deps[p.id] = [...(p.type === 'dark' ? (p.room > 0 ? [lv.doors[p.room - 1]] : []) : roomDeps(p.room)), ...p.needs.flatMap(itemDeps),
        ...p.clues.flatMap((cl) => (cl.item ? itemDeps(cl.item) : roomDeps(lv.o[cl.obj].room)))].filter((x) => x !== p.id || assert.fail('dipende da sé'));
    }
    const state = {};
    const visit = (id) => { if (state[id] === 2) return; assert.notEqual(state[id], 1, `ciclo su ${id}`); state[id] = 1; deps[id].forEach(visit); state[id] = 2; };
    Object.keys(deps).forEach(visit);
    // ogni enigma porta (direttamente o no) all'uscita
    const usedBy = {};
    Object.entries(deps).forEach(([id, ds]) => ds.forEach((d) => { (usedBy[d] = usedBy[d] || []).push(id); }));
    const needed = new Set();
    const up = (id) => { if (needed.has(id)) return; needed.add(id); Object.entries(deps).forEach(([k, ds]) => { if (ds.includes(id) && false) up(k); }); };
    const down = (id) => { if (needed.has(id)) return; needed.add(id); deps[id].forEach(down); };
    down(lv.exit);
    for (const p of Object.values(lv.p)) assert.ok(needed.has(p.id) || p.type === 'dark', `livello ${L}: enigma ${p.type} non serve all'uscita`);
    void up;
    // le fonti stanno in stanze ≤ di chi le usa
    for (const p of Object.values(lv.p)) for (const id of p.needs) {
      const parts = lv.items[id].from || [id];
      for (const x of parts) { const at = lv.items[x].at, r = at.pid ? lv.p[at.pid].room : lv.o[at.obj].room; assert.ok(r <= p.room); if (p.type === 'dark') assert.ok(r < p.room); }
    }
  }
});

test('sotto-puzzle: risolvibili con i risolutori del test e mai già risolti', () => {
  const counts = {};
  for (let L = 2; L <= 20; L++) for (let seed = 0; seed < 25; seed++) {
    const s = E.newGame(L, seed * 7919 + L);
    for (const pz of Object.values(E.levelOf(s).p)) {
      const st = s.ps[pz.id];
      counts[pz.type] = (counts[pz.type] || 0) + 1;
      if (pz.type === 'slide') { assert.ok(st.t.some((v, i) => v !== i)); assert.ok(bfsSlide(pz.w, pz.h, st.t)); }
      if (pz.type === 'lights') { assert.ok(!st.b.every(Boolean)); assert.ok(lightsSolve(pz.w, pz.h, st.b)); }
      if (pz.type === 'pipes') { assert.ok(pipesSolve(pz)); assert.ok(!E.pipeFlow(pz.w, pz.h, pz.src, pz.dst, pz.kinds, st.r).ok); }
      if (pz.type === 'maze') { const p = mazeBfs(pz.n, pz.open, st.p, pz.goal); assert.ok(p && p.length >= pz.n - 1); }
      if (pz.type === 'mirror') { assert.ok(mirrorSolve(pz)); assert.ok(!mirrorHit(pz, st.o)); }
      if (pz.type === 'balance') {
        assert.ok(subset(pz.weights, pz.weights.map(() => true), pz.target));
        if (pz.missing >= 0) assert.equal(subset(pz.weights, pz.weights.map((_, i) => i !== pz.missing), pz.target), null, 'il peso mancante serve davvero');
        assert.ok(pz.target <= 14);
      }
      if (pz.type === 'levers') assert.ok(st.p.some((p, i) => p !== pz.clue.pos[i]));
      if (pz.type === 'shadow') assert.ok(pz.shadows.every((t) => pz.toys.includes(t)));
    }
  }
  for (const t of E.TYPES) assert.ok(counts[t] > 3, `tipo ${t} quasi mai usato (${counts[t] || 0})`);
});

test('indizi: dati leggibili (cifre 0–9, conteggi piccoli), nei primi livelli nella stessa stanza', () => {
  for (const L of LEVELS) for (const seed of SEEDS) {
    const lv = E.levelOf(E.newGame(L, seed));
    for (const o of Object.values(lv.o)) {
      if (o.role !== 'clue') continue;
      const p = lv.p[o.for];
      if (L < 8) assert.equal(o.room, p.room, 'indizio nella stanza della serratura');
      if (o.clue.kind === 'count') { const cnt = {}; o.clue.dots.forEach((d) => { cnt[d.g] = (cnt[d.g] || 0) + 1; }); assert.ok(Object.values(cnt).every((n) => n <= E.config(L).countMax)); assert.equal(new Set(o.clue.dots.map((d) => d.c)).size, o.clue.dots.length); }
      if (o.clue.kind === 'clock') assert.ok(o.clue.clocks.every((c) => c.h >= 1 && c.h <= 9));
    }
    // in una stanza niente due lucchetti della stessa famiglia (rotelle colorate / sequenze)
    for (let r = 0; r < lv.rooms.length; r++) {
      const fam = Object.values(lv.p).filter((p) => p.room === r && E.FAMILY[p.type]).map((p) => E.FAMILY[p.type]);
      assert.equal(new Set(fam).size, fam.length);
    }
    // posti diversi per ogni oggetto della stanza
    for (let r = 0; r < lv.rooms.length; r++) {
      const slots = Object.values(lv.o).filter((o) => o.room === r).map((o) => o.slot);
      assert.equal(new Set(slots).size, slots.length, 'due oggetti nello stesso posto');
    }
  }
});

test('varietà: tipi diversi nel livello, livelli consecutivi poco ripetitivi, sempre diversi tra i semi', () => {
  let prev = [], overlap = 0, total = 0;
  for (const L of LEVELS) {
    const s = E.newGame(L, 500 + L, prev);
    const types = E.typesOf(s);
    const lv = E.levelOf(s);
    assert.equal(types.length, lv.n, `livello ${L}: tipi ripetuti ${types}`);
    if (L > 1) { overlap += types.filter((t) => prev.includes(t)).length; total += types.length; }
    prev = types;
    // ogni tipo nuovo compare nel suo livello (quasi sempre)
  }
  assert.ok(overlap / total < 0.45, `troppe ripetizioni tra livelli consecutivi: ${overlap}/${total}`);
  for (const L of [1, 5, 12]) {
    const sig = new Set(SEEDS.map((sd) => JSON.stringify(E.levelOf(E.newGame(L, sd)).p)));
    assert.equal(sig.size, SEEDS.length, 'semi diversi = enigmi diversi');
  }
  for (const t of E.TYPES) {
    const L = E.UNLOCK[t];
    const hits = SEEDS.filter((sd) => E.typesOf(E.newGame(L, sd)).includes(t)).length;
    assert.ok(hits >= SEEDS.length / 2, `il tipo nuovo ${t} si vede poco al livello ${L} (${hits}/${SEEDS.length})`);
  }
});

test('determinismo e ripresa da JSON a metà partita', () => {
  for (const L of [1, 4, 8, 13, 20]) for (const seed of [3, 77]) {
    const a = E.newGame(L, seed, ['paint']), b = E.newGame(L, seed, ['paint']);
    assert.deepEqual(a, b);
    assert.deepEqual(JSON.parse(JSON.stringify(E.levelOf(a))), JSON.parse(JSON.stringify(E.levelOf(b))));
    const half = Math.ceil(E.levelOf(a).n / 2);
    bot(a, { stopAt: half });
    const r = JSON.parse(JSON.stringify(a));
    assert.ok(E.validate(r));
    assert.deepEqual(r, a);
    bot(r);
    assert.ok(r.won);
  }
  assert.equal(E.validate(null), false);
  assert.equal(E.validate({ v: 1 }), false);
  assert.equal(E.validate(Object.assign(E.newGame(2, 1), { room: 9 })), false);
});

test('aiuti: seguendo solo next() e guide() si esce; costano fragoline', () => {
  for (const L of LEVELS) for (const seed of [5, 6]) {
    const s = E.newGame(L, seed), lv = E.levelOf(s);
    for (let k = 0; k < 300 && !s.won; k++) {
      const st = E.next(s);
      assert.ok(st, 'c\'è sempre un prossimo passo');
      if (st.room !== s.room) { assert.equal(E.go(s, st.room).type, 'ok'); continue; }
      if (st.k === 'search') assert.equal(E.search(s, st.obj).type, 'reveal');
      else if (st.k === 'take') assert.equal(E.take(s, st.item).type, 'take');
      else if (st.k === 'combine') assert.equal(E.combine(s, st.a, st.b).type, 'combined');
      else if (st.k === 'use') { const r = E.use(s, st.item, lv.p[st.pid].type === 'dark' ? 'room' : st.obj); assert.equal(r.type, 'used'); }
      else if (st.k === 'solve') {
        const pz = lv.p[st.pid];
        for (let g = 0; g < 200 && !s.solved[pz.id]; g++) {
          const gd = E.guide(s, pz.id), ps = s.ps[pz.id];
          if (gd.code) { const i = gd.code.findIndex((d, j) => ps.v[j] !== d); E.act(s, pz.id, 'dial', i, 1); }
          else if (gd.seq) E.act(s, pz.id, 'press', gd.seq[gd.at]);
          else if (gd.flip) E.act(s, pz.id, pz.type === 'levers' ? 'toggle' : 'flip', gd.flip[0]);
          else if (gd.press) E.act(s, pz.id, 'press', gd.press[0]);
          else if ('move' in gd) E.act(s, pz.id, 'move', gd.move);
          else if (gd.on) { const i = pz.weights.findIndex((_, j) => ps.on[j] !== (gd.on.includes(j) ? 1 : 0)); E.act(s, pz.id, 'toggle', i); }
          else if (gd.fix) E.act(s, pz.id, 'rot', gd.fix[0]);
          else if (gd.path) E.act(s, pz.id, 'move', gd.path[0]);
          else if ('next' in gd) E.act(s, pz.id, 'pick', gd.next);
        }
        assert.ok(s.solved[pz.id], `livello ${L}: la guida non risolve ${pz.type}`);
      }
    }
    assert.ok(s.won, `livello ${L}: gli aiuti non portano all'uscita`);
  }
  // costo: 1° tocco vago, 2° preciso sullo stesso passo; 2 vaghi o 1 preciso = una fragolina
  const s = E.newGame(3, 9);
  assert.equal(E.rate(s), 3);
  assert.equal(E.hint(s).lvl, 1); assert.equal(E.rate(s), 3);
  assert.equal(E.hint(s).lvl, 2); assert.equal(E.rate(s), 2);
  assert.equal(E.hint(s).lvl, 2); assert.equal(s.hp, 1, 'ripetere l\'aiuto preciso non costa di nuovo');
  s.hp = 5; assert.equal(E.rate(s), 1, 'mai meno di una fragolina');
  const t = E.newGame(3, 9);
  t.secs = 2 * E.parTime(t) + 1;
  assert.equal(E.rate(t), 2, 'tempo oltre il doppio del riferimento: una fragolina in meno');
});

test('regole: mosse non valide, oggetti sbagliati, stanze non raggiungibili, niente sconfitta', () => {
  const s = E.newGame(5, 11), lv = E.levelOf(s);
  assert.equal(E.go(s, 1).type, 'invalid', 'porta ancora chiusa');
  const other = Object.values(lv.o).find((o) => o.room === 1);
  assert.equal(E.search(s, other.id).type, 'invalid');
  const lock = Object.values(lv.p).find((p) => p.room === 0 && p.type !== 'dark');
  assert.equal(E.use(s, 'i0', lock.obj).type, 'invalid', 'oggetto non in tasca');
  const moves = s.moves;
  E.act(s, 'nope', 'x');
  assert.equal(s.moves, moves);
  // una sequenza sbagliata si azzera e conta come errore, non fa perdere
  for (let L = 1; L < 8; L++) for (let sd = 0; sd < 20; sd++) {
    const t = E.newGame(L, sd), p = Object.values(E.levelOf(t).p).find((q) => q.type === 'colors' && q.room === 0);
    if (!p) continue;
    const wrong = p.buttons.find((g) => g !== p.clue.seq[0]);
    for (let i = 0; i < p.len; i++) E.act(t, p.id, 'press', wrong);
    assert.equal(t.ps[p.id].e.length, 0);
    assert.ok(t.wrong >= 1 && !t.solved[p.id]);
    return;
  }
});

test(`generazione veloce: < ${10 * SLOW} ms per livello`, () => {
  for (const L of [1, 5, 10, 15, 20]) {
    const t = performance.now();
    for (let k = 0; k < 20; k++) E.generate(L, mul(L * 1000 + k + 17));
    const ms = (performance.now() - t) / 20;
    assert.ok(ms < 10 * SLOW, `livello ${L}: ${ms.toFixed(2)} ms`);
  }
});
function mul(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

test('file del gioco: solo token CSS, niente colori letterali in UI e disegni; tinta in entrambi i temi', () => {
  for (const f of ['src/games/escape-ui.js', 'src/games/escape-art.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(src), `${f}: colore esadecimale`);
    assert.ok(!/rgba?\(/.test(src), `${f}: rgb()`);
  }
  const css = fs.readFileSync(path.join(root, 'src/games/escape.css'), 'utf8');
  assert.equal((css.match(/--tint-escape:/g) || []).length, 3, 'tinta chiara + scura (media query e data-theme)');
  // ogni variabile --er-* usata è definita
  const used = new Set();
  for (const f of ['src/games/escape-ui.js', 'src/games/escape-art.js', 'src/games/escape.css']) for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/var\(--(er-[a-z0-9-]+)(?![a-z0-9$-])/g)) used.add(m[1]);
  for (const v of used) assert.ok(css.includes(`--${v}:`), `--${v} non definita`);
});
