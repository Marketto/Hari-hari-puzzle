// Unit test Hari Parade: prato connesso e senza vicoli ciechi, frutto sempre raggiungibile, collisioni, coda di input
// senza inversioni, determinismo, ripresa da salvataggio, e un "bot sfilata" che vince ogni livello 1–20.
// L'oracolo (BFS, simulatore del bot) è scritto qui da zero e non usa le funzioni di ricerca del generatore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/parade-logic.js');
const P = HH.parade;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const K = (x, y) => `${x},${y}`;

/* ---------- oracolo: BFS indipendente ---------- */
function bfs(cols, rows, blocked, from) {
  const dist = new Map([[K(from.x, from.y), 0]]), q = [from];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    for (let d = 0; d < 4; d++) {
      const x = c.x + DX[d], y = c.y + DY[d], k = K(x, y);
      if (x < 0 || y < 0 || x >= cols || y >= rows || blocked.has(k) || dist.has(k)) continue;
      dist.set(k, dist.get(K(c.x, c.y)) + 1); q.push({ x, y });
    }
  }
  return dist;
}
function checkLayout(s) {
  const blocked = new Set(s.obstacles.map((o) => K(o.x, o.y)));
  const free = [];
  for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) if (!blocked.has(K(x, y))) free.push({ x, y });
  const dist = bfs(s.cols, s.rows, blocked, free[0]);
  assert.equal(dist.size, free.length, `prato non connesso (livello ${s.level})`);
  for (const c of free) {
    const n = [0, 1, 2, 3].filter((d) => {
      const x = c.x + DX[d], y = c.y + DY[d];
      return x >= 0 && y >= 0 && x < s.cols && y < s.rows && !blocked.has(K(x, y));
    }).length;
    assert.ok(n >= 2, `vicolo cieco in ${c.x},${c.y} (livello ${s.level})`);
  }
  // la corsia di partenza è libera
  const sy = Math.floor(s.rows / 2);
  for (let x = 0; x < Math.min(8, s.cols); x++) assert.ok(!blocked.has(K(x, sy)), 'corsia del cancello occupata');
}
function checkFruit(s, where) {
  if (!s.fruit) return;
  const f = s.fruit;
  assert.ok(f.x >= 0 && f.y >= 0 && f.x < s.cols && f.y < s.rows, `${where}: frutto fuori`);
  assert.ok(!s.obstacles.some((o) => o.x === f.x && o.y === f.y), `${where}: frutto su un ostacolo`);
  assert.ok(!s.body.some((b) => b.x === f.x && b.y === f.y), `${where}: frutto sulla fila`);
  if (s.item) assert.ok(!(s.item.x === f.x && s.item.y === f.y), `${where}: frutto sopra un oggetto`);
  // raggiungibile dalla testa con la fila come muro (la coda si sposta)
  const blocked = new Set(s.obstacles.map((o) => K(o.x, o.y)));
  s.body.slice(1, -1).forEach((b) => blocked.add(K(b.x, b.y)));
  const dist = bfs(s.cols, s.rows, blocked, s.body[0]);
  assert.ok(dist.has(K(f.x, f.y)), `${where}: frutto irraggiungibile`);
}

/* ---------- bot sfilata ---------- */
// simulatore minimo del serpente per i controlli di sicurezza del bot
function simMove(body, grow, d, eat) {
  const h = body[0], nb = [{ x: h.x + DX[d], y: h.y + DY[d] }, ...body];
  let g = grow + (eat ? 1 : 0);
  if (g > 0) g--; else nb.pop();
  return { body: nb, grow: g };
}
function legal(s, body, grow, d, target) {
  const h = body[0], x = h.x + DX[d], y = h.y + DY[d];
  if (x < 0 || y < 0 || x >= s.cols || y >= s.rows) return false;
  if (s.obstacles.some((o) => o.x === x && o.y === y)) return false;
  const eat = target && target.x === x && target.y === y;
  const n = grow > 0 || eat ? body.length : body.length - 1;
  for (let i = 0; i < n; i++) if (body[i].x === x && body[i].y === y) return false;
  return true;
}
// la testa può ancora raggiungere la coda? (se sì, non è in trappola)
function tailSafe(s, body, grow) {
  const blocked = new Set(s.obstacles.map((o) => K(o.x, o.y)));
  body.slice(1, grow > 0 ? body.length : -1).forEach((b) => blocked.add(K(b.x, b.y)));
  const t = body[body.length - 1];
  if (grow > 0) { blocked.delete(K(t.x, t.y)); }
  const dist = bfs(s.cols, s.rows, blocked, body[0]);
  return dist.has(K(t.x, t.y)) || dist.size > body.length + grow + 4;
}
function area(s, body) {
  const blocked = new Set(s.obstacles.map((o) => K(o.x, o.y)));
  body.slice(1).forEach((b) => blocked.add(K(b.x, b.y)));
  return bfs(s.cols, s.rows, blocked, body[0]).size;
}
// percorso più breve (BFS su celle, la fila conta come muro tranne la coda)
function pathTo(s, target) {
  const blocked = new Set(s.obstacles.map((o) => K(o.x, o.y)));
  s.body.slice(0, s.grow > 0 ? s.body.length : -1).forEach((b) => blocked.add(K(b.x, b.y)));
  const h = s.body[0], prev = new Map([[K(h.x, h.y), null]]), q = [h];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c.x === target.x && c.y === target.y) break;
    for (let d = 0; d < 4; d++) {
      const x = c.x + DX[d], y = c.y + DY[d], k = K(x, y);
      if (x < 0 || y < 0 || x >= s.cols || y >= s.rows || blocked.has(k) || prev.has(k)) continue;
      prev.set(k, { c, d }); q.push({ x, y });
    }
  }
  if (!prev.has(K(target.x, target.y))) return null;
  const dirs = [];
  for (let k = K(target.x, target.y); prev.get(k); ) { const p = prev.get(k); dirs.unshift(p.d); k = K(p.c.x, p.c.y); }
  return dirs;
}
function decide(s) {
  const goals = [s.item && s.item.kind === 'star' ? s.item : null, s.fruit].filter(Boolean);
  for (const tgt of goals) {
    const path = pathTo(s, tgt);
    if (!path || !path.length) continue;
    let body = s.body, grow = s.grow, ok = true;
    for (let i = 0; i < path.length; i++) {
      const eat = i === path.length - 1 && tgt === s.fruit;
      if (!legal(s, body, grow, path[i], eat ? tgt : null)) { ok = false; break; }
      ({ body, grow } = simMove(body, grow, path[i], eat));
    }
    if (ok && tailSafe(s, body, grow)) return path[0];
  }
  // nessun percorso sicuro: mossa legale che lascia più spazio e la coda raggiungibile
  let best = s.dir, bestScore = -1;
  for (let d = 0; d < 4; d++) {
    if (d === (s.dir + 2) % 4 || !legal(s, s.body, s.grow, d, s.fruit)) continue;
    const eat = s.fruit && s.body[0].x + DX[d] === s.fruit.x && s.body[0].y + DY[d] === s.fruit.y;
    const m = simMove(s.body, s.grow, d, eat);
    const sc = area(s, m.body) + (tailSafe(s, m.body, m.grow) ? 1000 : 0);
    if (sc > bestScore) { bestScore = sc; best = d; }
  }
  return best;
}
function play(level, seed, check = false) {
  const s = P.newLevel(level, HH.rng(seed));
  if (check) { checkLayout(s); checkFruit(s, `L${level}/${seed} inizio`); }
  for (let k = 0; k < 20000 && !P.isOver(s); k++) {
    const ev = P.step(s, decide(s));
    if (check && ev.some((e) => e.type === 'spawn' || e.type === 'respawn')) checkFruit(s, `L${level}/${seed} passo ${k}`);
    if (check) {
      // la fila non si sovrappone mai e la testa resta sul prato
      const cells = new Set(s.body.map((b) => K(b.x, b.y)));
      assert.equal(cells.size, s.body.length, 'fila sovrapposta');
      assert.ok(s.body.every((b) => b.x >= 0 && b.y >= 0 && b.x < s.cols && b.y < s.rows));
    }
  }
  return s;
}

/* ---------- test ---------- */
test('prato: connesso e senza vicoli ciechi per i livelli 1–20 (60 semi ciascuno)', () => {
  for (let L = 1; L <= 20; L++) {
    const want = P.config(L).obstacles;
    let placed = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = P.newLevel(L, HH.rng(L * 1000 + seed));
      checkLayout(s);
      checkFruit(s, `L${L}/${seed}`);
      placed += s.obstacles.length;
      assert.ok(s.obstacles.every((o) => P.OBSTACLES.includes(o.kind)));
    }
    // quasi sempre tutti gli ostacoli previsti
    assert.ok(placed >= want * 60 * 0.9, `livello ${L}: ostacoli ${placed}/${want * 60}`);
  }
});

test('il bot vince ogni livello 1–20 (10 partite per livello) e il frutto è sempre raggiungibile', () => {
  let clean = 0, total = 0;
  for (let L = 1; L <= 20; L++) {
    for (let seed = 1; seed <= 10; seed++) {
      const s = play(L, L * 77 + seed, true);
      assert.ok(P.isWon(s), `livello ${L} seme ${seed}: ${s.eaten}/${s.goal}, scontri ${s.crashes}`);
      total++; if (!s.crashes) clean++;
      assert.ok(s.body.length + s.grow <= P.START_LEN + s.goal);
    }
  }
  assert.ok(clean / total >= 0.95, `partite pulite ${clean}/${total}`);
});

test('collisioni: bordo, ostacolo, propria fila; la coda che si sposta non conta', () => {
  // bordo
  let s = P.newLevel(1, HH.rng(3));
  s.ready = 0; s.fruit = null; s.item = null;
  s.body = [{ x: s.cols - 1, y: 2 }, { x: s.cols - 2, y: 2 }, { x: s.cols - 3, y: 2 }];
  let ev = P.step(s);
  assert.equal(ev[0].type, 'crash'); assert.equal(ev[0].what, 'wall'); assert.equal(s.crashes, 1);
  // ripartenza: dal cancello, lunghezza conservata, pausa "Pronti?"
  assert.equal(s.body[0].y, P.startRow(s.rows)); assert.equal(s.dir, 1); assert.ok(s.ready > 0);
  assert.equal(s.body.length + s.grow, 3);
  // ostacolo
  s = P.newLevel(5, HH.rng(4));
  const o = s.obstacles[0];
  s.fruit = null; s.item = null;
  s.body = [{ x: o.x - 1, y: o.y }, { x: o.x - 2, y: o.y }];
  s.dir = 1;
  ev = P.step(s);
  assert.equal(ev[0].what, 'rock');
  // propria fila: anello di 5 che si chiude sul collo
  s = P.newLevel(1, HH.rng(5));
  s.fruit = null; s.item = null;
  s.body = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 3, y: 2 }];
  s.dir = 0; s.queue = [];
  assert.ok(P.turn(s, 'right'));
  ev = P.step(s);
  assert.equal(ev[0].what, 'self');
  // inseguire la propria coda è lecito (la coda si sposta nello stesso passo)
  s = P.newLevel(1, HH.rng(6));
  s.fruit = null; s.item = null;
  s.body = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }];
  s.dir = 0;
  ev = P.step(s, 'right');
  assert.equal(ev[0].type, 'move');
  // ...ma non se sta crescendo
  s.body = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }]; s.dir = 0; s.grow = 1;
  ev = P.step(s, 'right');
  assert.equal(ev[0].what, 'self');
});

test('tre scontri = sconfitta; fragoline 3/2/1', () => {
  const s = P.newLevel(1, HH.rng(7));
  s.fruit = null;
  const types = [];
  for (let i = 0; i < 60 && !P.isOver(s); i++) P.step(s).forEach((e) => types.push(e.type));   // dritto contro il bordo
  assert.ok(P.isLost(s));
  assert.equal(types.filter((t) => t === 'crash').length, P.LIVES);
  assert.equal(types[types.length - 1], 'lose');
  assert.equal(s.mistakes, 3);
  assert.deepEqual([0, 1, 2, 3].map((c) => P.rate({ crashes: c })), [3, 2, 1, 1]);
});

test('coda di input: niente inversione a 180°, niente doppioni, massimo 2', () => {
  const s = P.newLevel(1, HH.rng(8));
  assert.equal(s.dir, 1);
  assert.equal(P.turn(s, 'left'), false, '180° immediato');
  assert.equal(P.turn(s, 'right'), false, 'stessa direzione');
  assert.ok(P.turn(s, 'up'));
  assert.equal(P.turn(s, 'down'), false, '180° rispetto alla svolta in coda');
  assert.ok(P.turn(s, 'left'));          // su poi sinistra: inversione in due passi, lecita
  assert.equal(P.turn(s, 'down'), false, 'coda piena');
  const h = s.body[0];
  P.step(s); assert.deepEqual(s.body[0], { x: h.x, y: h.y - 1 });
  P.step(s); assert.deepEqual(s.body[0], { x: h.x - 1, y: h.y - 1 });
  // a ogni passo, comunque si prema, la testa non entra mai nel collo
  const r = HH.rng(9), t = P.newLevel(2, HH.rng(10));
  for (let k = 0; k < 3000 && !P.isOver(t); k++) {
    for (let j = 0; j < 3; j++) P.turn(t, Math.floor(r() * 4));
    const neck = t.body[1], ev = P.step(t);
    if (ev[0] && ev[0].type === 'move') assert.ok(!(t.body[0].x === neck.x && t.body[0].y === neck.y), 'testa nel collo');
  }
});

test('mangiare: +1, la fila cresce di uno; stellina +2 senza crescere; orologio rallenta', () => {
  const s = P.newLevel(3, HH.rng(11));
  s.item = null;
  const sy = P.startRow(s.rows);
  s.fruit = { x: 4, y: sy, kind: 'apple', id: 99 };
  const ev = P.step(s);
  assert.ok(ev.some((e) => e.type === 'eat' && e.kind === 'apple'));
  assert.equal(s.eaten, 1); assert.equal(s.body.length, 4);
  assert.ok(s.fruit && s.fruit.id !== 99);
  P.step(s); assert.equal(s.body.length, 4);
  s.fruit = null;
  const h = s.body[0];
  s.item = { x: h.x + 1, y: h.y, kind: 'star', ttl: 10 };
  P.step(s);
  assert.equal(s.eaten, 1 + P.STAR_BONUS); assert.equal(s.body.length, 4); assert.equal(s.item, null);
  s.item = { x: h.x + 2, y: h.y, kind: 'clock', ttl: 10 };
  const v = P.speedNow(s);
  P.step(s);
  assert.equal(s.slow, P.SLOW_STEPS);
  assert.ok(P.speedNow(s) < v);
  s.fruit = null;
  for (let i = 0; i < P.SLOW_STEPS; i++) { s.body = [{ x: 3, y: sy }, { x: 2, y: sy }]; s.dir = 1; P.step(s); }
  assert.equal(s.slow, 0);
  assert.equal(P.speedNow(s), v);
  // gli oggetti speciali scadono
  s.item = { x: 0, y: 0, kind: 'star', ttl: 1 };
  s.body = [{ x: 3, y: sy }, { x: 2, y: sy }]; s.dir = 1;
  assert.ok(P.step(s).some((e) => e.type === 'expire'));
});

test('tempo reale: "Pronti?" blocca, poi velocità = celle al secondo', () => {
  const s = P.newLevel(1, HH.rng(12));
  s.fruit = null; s.item = null;
  const h0 = s.body[0].x;
  P.advance(s, P.READY * 0.9);
  assert.equal(s.body[0].x, h0, 'si muove durante "Pronti?"');
  const ev = P.advance(s, P.READY * 0.1 + 0.001);
  assert.ok(ev.some((e) => e.type === 'go'));
  let moved = 0;
  for (let i = 0; i < 60; i++) moved += P.advance(s, 1 / 60).filter((e) => e.type === 'move').length;   // 1 secondo
  assert.ok(Math.abs(moved - s.speed) <= 1, `mosse in 1 s: ${moved}, velocità ${s.speed}`);
  assert.ok(P.frac(s) >= 0 && P.frac(s) <= 1);
});

test('determinismo e ripresa da salvataggio (JSON)', () => {
  const a = play(9, 4242), b = play(9, 4242);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  // a metà partita: lo stato serializzato continua in modo identico
  const s = P.newLevel(8, HH.rng(99));
  for (let k = 0; k < 120 && !P.isOver(s); k++) P.step(s, decide(s));
  const copy = JSON.parse(JSON.stringify(s));
  for (let k = 0; k < 200; k++) {
    const d = decide(s);
    P.step(s, d); P.step(copy, d);
  }
  assert.equal(JSON.stringify(s), JSON.stringify(copy));
});

test('difficoltà crescente e generazione veloce', () => {
  let prev = P.config(1);
  for (let L = 2; L <= 25; L++) {
    const c = P.config(L);
    assert.ok(c.goal >= prev.goal && c.speed >= prev.speed && c.obstacles >= prev.obstacles && c.cols >= prev.cols);
    prev = c;
  }
  const a = P.config(1), b = P.config(12);
  assert.ok(b.goal > a.goal && b.speed > a.speed && b.obstacles > 0 && a.obstacles === 0 && b.cols > a.cols);
  // celle libere sufficienti per la fila più lunga
  for (let L = 1; L <= 25; L++) { const c = P.config(L); assert.ok(P.START_LEN + c.goal < (c.cols * c.rows - c.obstacles) * 0.35); }
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) P.newLevel(1 + (i % 20), HH.rng(i));
  const ms = (performance.now() - t0) / 200;
  assert.ok(ms < 10 * SLOW, `newLevel medio ${ms.toFixed(2)} ms`);
});

test('modalità attesa: dopo "Via!" la sfilata resta ferma finché non arriva una direzione valida', () => {
  const s = P.newLevel(1, HH.rng(7));
  s.waitMode = true; s.wait = true;
  const head0 = JSON.stringify(s.body[0]);
  P.advance(s, P.READY + 0.05);
  for (let i = 0; i < 20; i++) P.advance(s, 0.1);
  assert.equal(JSON.stringify(s.body[0]), head0, 'non deve muoversi da sola');
  assert.equal(P.turn(s, (s.dir + 2) % 4), false, 'indietro non fa partire');
  assert.equal(s.wait, true);
  assert.equal(P.turn(s, s.dir), true, 'la direzione attuale fa partire');
  assert.equal(s.wait, false);
  for (let i = 0; i < 10; i++) P.advance(s, 0.1);
  assert.notEqual(JSON.stringify(s.body[0]), head0, 'dopo il via si muove');
});
