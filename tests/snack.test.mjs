// Unit test Hari Snack Rush: un "bot merenda" con tempi di reazione umani vince i livelli 1–15 su più semi;
// determinismo e ripresa da JSON, porte (oracolo delle operazioni scritto qui), animalone, merende rubate e sconfitta,
// via di fuga sempre libera dai soffi, curva di difficoltà monotona, tempi di generazione.
// Il bot e l'oracolo usano solo lo stato pubblico e non chiamano le funzioni del generatore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/snack-logic.js');
const S = HH.snack;
const DT = 1 / 60;

/* ---------- oracolo delle porte ---------- */
function gateOp(power, op, max) {
  const n = Number(op.slice(1));
  let v;
  if (op[0] === 'x') v = power * n;
  else if (op[0] === '+') v = power + n;
  else if (op[0] === '-') v = power - n;
  else if (op[0] === '/') v = Math.ceil(power / n);
  else throw new Error(`porta sconosciuta ${op}`);
  return Math.max(1, Math.min(max, v));
}
const goodOp = (op) => op[0] === 'x' || op[0] === '+';

/* ---------- bot: guarda lo stato ogni `react` secondi, come un bambino attento ---------- */
function decide(s, rnd, noise) {
  let want;
  const g = s.gates.filter((x) => x.z < 9).sort((a, b) => a.z - b.z)[0];
  if (g) {
    const val = (op) => (op ? gateOp(s.power, op, s.pmax) : s.power);
    const l = val(g.l), r = val(g.r);
    want = l > r ? -0.42 : r > l ? 0.42 : s.px < 0 ? -0.42 : 0.42;
  } else {
    const near = s.animals.filter((a) => a.z < 24).sort((a, b) => a.z - b.z)[0];
    if (near) want = near.x + near.vx * 0.3;
    else if (s.boss) want = s.boss.x;
    else want = s.px;
  }
  const lands = s.drops.map((q) => q.land);
  const bad = (x) => lands.some((d) => Math.abs(d - x) < S.DROP_R + 0.12);
  if (lands.length && (bad(want) || bad(s.px))) {
    let best = null;
    for (let x = -0.8; x <= 0.8001; x += 0.05) {
      if (bad(x)) continue;
      const c = Math.abs(x - s.px) + Math.abs(x - want) * 0.3;
      if (!best || c < best.c) best = { x, c };
    }
    if (best) want = best.x;
  }
  want += (rnd() - 0.5) * noise;
  return Math.max(-0.82, Math.min(0.82, want));
}
function play(s, { react = 0.3, noise = 0.06, seed = 1, limit = 400 } = {}) {
  const rnd = HH.rng(seed);
  let t = 0, next = 0, target = 0;
  const events = [];
  for (let f = 0; f < limit * 60 && !S.isOver(s); f++) {
    t += DT;
    if (t >= next) { next = t + react; target = decide(s, rnd, noise); }
    for (const e of S.step(s, DT, { x: target })) events.push(e);
  }
  return events;
}
const fresh = (level, seed) => { const s = S.newLevel(level, HH.rng(seed)); s.ready = 0; return s; };

test('il bot (reazione 0,3 s) vince i livelli 1–11 su 4 semi; dal 12 al 15 al massimo 2 sconfitte su 16', () => {
  let hardLost = 0;
  for (let level = 1; level <= 15; level++) {
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 1000 + k);
      const ev = play(s, { seed: level * 7 + k });
      if (level >= 12 && !S.isWon(s)) { hardLost++; continue; }
      assert.ok(S.isWon(s), `livello ${level} seme ${k}: perso (${s.oops} merende rubate, pancia ${s.bossFed}/${s.bossMax})`);
      if (level <= 11) assert.ok(s.oops <= 1, `livello ${level} seme ${k}: ${s.oops} merende rubate`);
      assert.equal(S.progress(s), 1);
      assert.ok(ev.some((e) => e.type === 'boss') && ev.some((e) => e.type === 'win'));
      // ogni animale arrivato è stato saziato o è tornato a casa: nessuno "sparisce"
      const born = new Set(), gone = new Set();
      for (const e of ev) if (e.type === 'full') gone.add(e.id);
      for (const e of ev) if (e.type === 'nibble') born.add(e.id);
      for (const id of born) assert.ok(gone.has(id), `animale ${id} mai saziato`);
    }
  }
  assert.ok(hardLost <= 2, `livelli 12–15: ${hardLost} sconfitte`);
});

test('livello 1: facile e breve (60–90 s per un giocatore, < 75 s per il bot) senza porte negative', () => {
  for (let k = 0; k < 6; k++) {
    const s = fresh(1, 50 + k);
    for (const e of s.script) if (e.k === 'g') for (const op of [e.l, e.r]) if (op) assert.ok(goodOp(op), `porta ${op} al livello 1`);
    play(s, { seed: k });
    assert.ok(S.isWon(s) && s.oops === 0);
    assert.ok(s.t > 40 && s.t < 75, `durata ${s.t.toFixed(1)} s`);
  }
});

test('anche un bot più lento (0,45 s) e impreciso vince i primi livelli', () => {
  for (let level = 1; level <= 6; level++) {
    const s = fresh(level, 900 + level);
    play(s, { react: 0.45, noise: 0.16, seed: level });
    assert.ok(S.isWon(s), `livello ${level}`);
  }
});

test('le porte contano: chi le sceglie a caso perde spesso dal livello 5 in su', () => {
  let lost = 0, games = 0;
  for (let level = 5; level <= 15; level++) {
    for (let k = 0; k < 3; k++) {
      const s = fresh(level, level * 333 + k);
      const rnd = HH.rng(level * 11 + k);
      const pick = new Map();
      let t = 0, next = 0, target = 0;
      for (let f = 0; f < 400 * 60 && !S.isOver(s); f++) {
        t += DT;
        if (t >= next) {
          next = t + 0.3;
          const g = s.gates.filter((x) => x.z < 9).sort((a, b) => a.z - b.z)[0];
          if (g) { const key = `${g.l}|${g.r}|${g.id ?? g.z0 ?? ''}`; if (!pick.has(g)) pick.set(g, rnd() < 0.5 ? -0.42 : 0.42); target = pick.get(g); }
          else target = decide(s, rnd, 0.06);
        }
        S.step(s, DT, { x: target });
      }
      games++; if (!S.isWon(s)) lost++;
    }
  }
  assert.ok(lost / games >= 0.5, `perse solo ${lost}/${games}`);
});

test('determinismo: stesso seme e stessi input = stessa partita; ripresa da JSON a metà', () => {
  const a = fresh(6, 77), b = fresh(6, 77);
  assert.deepEqual(a, b);
  play(a, { seed: 3, limit: 25 });
  play(b, { seed: 3, limit: 25 });
  assert.deepEqual(a, b);
  const c = JSON.parse(JSON.stringify(a));
  const inputs = Array.from({ length: 900 }, (_, i) => ({ x: Math.sin(i / 40) * 0.7 }));
  const ea = inputs.flatMap((inp) => S.step(a, DT, inp)), ec = inputs.flatMap((inp) => S.step(c, DT, inp));
  assert.deepEqual(a, c);
  assert.deepEqual(ea, ec);
  // passi di durata diversa ma stesso tempo totale: la logica gira a passi fissi
  const d = fresh(3, 5), e = fresh(3, 5);
  for (let i = 0; i < 600; i++) S.step(d, DT, { x: 0.3 });
  for (let i = 0; i < 300; i++) S.step(e, 2 * DT, { x: 0.3 });
  assert.equal(d.ticks, e.ticks);
});

test('porte: operazioni, massimo per livello, sempre una scelta buona, negative dal livello 2, −2 dal 4, ÷2 dal 6', () => {
  assert.equal(S.applyGate(3, 'x2', 10), 6);
  assert.equal(S.applyGate(4, 'x3', 10), 10);
  assert.equal(S.applyGate(1, '-2', 10), 1);
  assert.equal(S.applyGate(5, '/2', 10), 3);
  assert.equal(S.applyGate(4, '+3', 5), 5);
  for (let level = 1; level <= 20; level++) {
    for (let k = 0; k < 15; k++) {
      const s = S.newLevel(level, HH.rng(level * 31 + k));
      const gates = s.script.filter((e) => e.k === 'g');
      assert.ok(gates.length >= 3, `livello ${level}: ${gates.length} porte`);
      assert.ok(!gates[0].l || !gates[0].r, 'la prima porta è singola');
      for (const g of gates) {
        const ops = [g.l, g.r].filter(Boolean);
        assert.ok(ops.length >= 1 && ops.some(goodOp), `livello ${level}: coppia senza scelta buona ${g.l}/${g.r}`);
        for (const op of ops) {
          if (!goodOp(op)) assert.ok(level >= 2, `porta negativa al livello ${level}`);
          if (op === '-2') assert.ok(level >= 4, `−2 al livello ${level}`);
          if (op[0] === '/') assert.ok(level >= 6, `÷2 al livello ${level}`);
        }
      }
      assert.ok(s.pmax === Math.min(10, 4 + level));
    }
  }
  // passarci dentro: lato sinistro o destro decide l'operazione
  for (const side of [-0.5, 0.5]) {
    const s = fresh(5, 1);
    s.script = []; s.power = 3;
    s.gates = [{ id: 1, z: 1, l: 'x2', r: '-1' }];
    s.px = side; s.tx = side;
    const ev = [];
    for (let i = 0; i < 60; i++) ev.push(...S.step(s, DT, { x: side }));
    const ge = ev.find((e) => e.type === 'gate');
    assert.ok(ge, 'porta attraversata');
    assert.equal(s.power, side < 0 ? 6 : 2);
    assert.equal(ge.side, side < 0 ? 'l' : 'r');
  }
});

test('merende a ventaglio: tante quante il potere, simmetriche, la merenda cambia coi livelli di potere', () => {
  for (let n = 1; n <= 10; n++) {
    const f = S.fanOf(n);
    assert.equal(f.length, n);
    for (let i = 0; i < n; i++) assert.ok(Math.abs(f[i].vx + f[n - 1 - i].vx) < 1e-9);
  }
  assert.deepEqual([1, 2, 3, 5, 7, 9, 10].map(S.treatOf), ['seed', 'seed', 'blueberry', 'strawberry', 'cherry', 'apple', 'apple']);
  const s = fresh(4, 9);
  s.power = 4;
  const ev = [];
  for (let i = 0; i < 30; i++) ev.push(...S.step(s, DT, { x: 0 }));
  const toss = ev.find((e) => e.type === 'toss');
  assert.equal(toss.n, 4);
  assert.equal(toss.treat, 'blueberry');
});

test('animali: ogni boccone riduce la fame, sazio = torna a casa felice', () => {
  const s = fresh(5, 2);
  s.script = [];
  s.animals = [{ id: 99, kind: 'piggy', x: 0, z: 8, left: 3, max: 3, vx: 0 }];
  const ev = [];
  for (let i = 0; i < 180 && s.animals.length; i++) ev.push(...S.step(s, DT, { x: 0 }));
  const nib = ev.filter((e) => e.type === 'nibble' && e.id === 99);
  assert.deepEqual(nib.map((e) => e.left), [2, 1]);
  const full = ev.find((e) => e.type === 'full' && e.id === 99);
  assert.equal(full.by, 'snack');
  assert.equal(s.fed, 1);
});

test('merenda rubata: −1 cuore, tempo di grazia, chi è vicino riceve una merenda; 3 furti = sconfitta', () => {
  const s = fresh(3, 4);
  s.script = [];
  s.px = 0.8; s.tx = 0.8;
  s.animals = [0, 1].map((i) => ({ id: 50 + i, kind: 'chick', x: -0.7, z: 1 + i * 0.2, left: 1, max: 1, vx: 0 }));
  s.animals.push({ id: 60, kind: 'chick', x: -0.6, z: 4, left: 1, max: 1, vx: 0 });
  const ev = [];
  for (let i = 0; i < 60; i++) ev.push(...S.step(s, DT, { x: 0.8 }));
  const sn = ev.filter((e) => e.type === 'snatch');
  assert.equal(sn.length, 1, 'due animali insieme costano un solo cuore');
  assert.equal(sn[0].left, 2);
  assert.equal(s.mistakes, 1);
  assert.ok(ev.some((e) => e.type === 'full' && e.id === 60 && e.by === 'share'));
  assert.equal(S.rate(s), 2);
  // altri due furti dopo la grazia: sconfitta
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 120; i++) S.step(s, DT, { x: 0.8 });
    s.animals.push({ id: 70 + r, kind: 'chick', x: -0.7, z: 0.6, left: 1, max: 1, vx: 0 });
    for (let i = 0; i < 30; i++) S.step(s, DT, { x: 0.8 });
  }
  assert.ok(S.isLost(s) && S.isOver(s) && !S.isWon(s));
  assert.equal(S.rate(s), 1);
  assert.deepEqual(S.step(s, DT, { x: 0 }), [], 'a partita finita non succede più nulla');
});

test('animalone: arriva a sentiero libero, si riempie con le merende, sazio = vittoria', () => {
  const s = fresh(2, 8);
  s.script = []; s.si = 0;
  let ev = [];
  for (let i = 0; i < 3; i++) ev.push(...S.step(s, DT, { x: 0 }));
  assert.ok(ev.some((e) => e.type === 'boss'));
  assert.equal(s.boss.kind, S.config(2).boss.kind);
  ev = [];
  s.power = 5;
  for (let i = 0; i < 60 * 120 && !S.isOver(s); i++) ev.push(...S.step(s, DT, { x: s.boss.x }));
  // il bot fermo sotto l'animalone prende anche i soffi: qui conta solo che la pancia si riempia
  const fed = ev.filter((e) => e.type === 'bossNibble').map((e) => e.fed);
  assert.ok(fed.length > 10);
  for (let i = 1; i < fed.length; i++) assert.equal(fed[i], fed[i - 1] + 1);
  if (S.isWon(s)) assert.equal(s.bossFed, s.bossMax);
  // rotazione degli animaloni
  assert.deepEqual([1, 2, 3, 4, 5].map((l) => S.config(l).boss.kind), ['squirrel', 'polar', 'owl', 'kitty', 'squirrel']);
});

test('soffi dell’animalone: c’è sempre un punto del sentiero dove non cade nulla', () => {
  for (let level = 1; level <= 30; level++) {
    const c = S.config(level), n = c.blowN;
    assert.ok(c.blowIv > (S.BOSS_Z - S.LINE_Z) / S.DROP_V, 'un soffio alla volta in aria');
    for (let aim = -0.82; aim <= 0.82; aim += 0.01) {
      const a = Math.max(-0.7, Math.min(0.7, aim));
      const lands = Array.from({ length: n }, (_, i) => Math.max(-0.95, Math.min(0.95, a + (i - (n - 1) / 2) * S.DROP_SPREAD)));
      let safe = false;
      for (let x = -S.X_MAX; x <= S.X_MAX && !safe; x += 0.01) safe = lands.every((d) => Math.abs(d - x) >= S.DROP_R + 0.05);
      assert.ok(safe, `livello ${level}, mira ${aim.toFixed(2)}: nessuna via di fuga`);
    }
  }
});

test('curva di difficoltà monotona (almeno 4 gradini) e generazione veloce', () => {
  const tiers = new Set();
  for (let level = 1; level < 30; level++) {
    const a = S.config(level), b = S.config(level + 1);
    tiers.add(a.tier);
    for (const k of ['waves', 'speed', 'pressure', 'maxCount', 'needMul', 'gates', 'bossNeed', 'bossV', 'blowN', 'powerMax', 'tier']) assert.ok(b[k] >= a[k], `${k} cala al livello ${level + 1}`);
    assert.ok(b.waveGap <= a.waveGap && b.blowIv <= a.blowIv);
    assert.ok(b.kinds.length >= a.kinds.length);
  }
  assert.ok(tiers.size >= 4);
  for (const level of [1, 5, 10, 20]) {
    const t0 = performance.now();
    for (let k = 0; k < 20; k++) S.newLevel(level, HH.rng(k));
    assert.ok((performance.now() - t0) / 20 < 10 * SLOW, `newLevel(${level}) lento`);
  }
});

test('primo input: con waitMode il gioco aspetta, poi parte', () => {
  const s = S.newLevel(1, HH.rng(1));
  s.waitMode = true; s.wait = true;
  const ev = [];
  for (let i = 0; i < 200; i++) ev.push(...S.step(s, DT, null));
  assert.ok(ev.some((e) => e.type === 'go'));
  assert.equal(s.ticks, 0, 'fermo finché non arriva un input');
  S.step(s, DT, { dir: 1 });
  S.step(s, DT, null);
  assert.ok(s.ticks > 0 && s.px > 0);
});
