// Unit test del ciclo giorno/notte di Hari Express (src/games/express-sky.js): durata delle fasi, curva continua
// (niente scatti), luce minima di notte, durata del giorno con la velocità (mai più di un giro al minuto), "sempre
// giorno", e la simulazione che non dipende mai dall'ora del giorno salvata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/express-map.js', 'src/games/express-net.js', 'src/games/express-sim.js', 'src/games/express-logic.js', 'src/games/express-sky.js');
const K = HH.expressSky, E = HH.express;

test('fasi: giorno il più lungo (~60%), notte breve (~20%), tramonto e alba in mezzo', () => {
  const n = 20000, cnt = { day: 0, sunset: 0, night: 0, dawn: 0 };
  for (let i = 0; i < n; i++) cnt[K.phase(i / n)]++;
  const f = (k) => cnt[k] / n;
  assert.ok(f('day') > 0.55 && f('day') < 0.62, 'giorno ' + f('day'));
  assert.ok(Math.abs(f('night') - 0.2) < 0.01, 'notte ' + f('night'));
  assert.ok(f('sunset') > 0.08 && f('dawn') > 0.08);
  // l'ordine: giorno → tramonto → notte → alba → giorno
  const seq = [];
  for (let i = 0; i < n; i++) { const p = K.phase(i / n); if (seq[seq.length - 1] !== p) seq.push(p); }
  assert.deepEqual(seq, ['day', 'sunset', 'night', 'dawn']);
});

test('una partita nuova parte di mattina, in piena luce', () => {
  const L = K.light(K.START);
  assert.equal(L.phase, 'day');
  assert.ok(L.day > 0.99 && L.amb > 0.99);
  // e la mattina viene prima del mezzogiorno: il sole sale
  assert.ok(K.light(K.START).dir[1] < K.light(K.NOON).dir[1]);
});

test('curva continua: nessuno scatto fra un fotogramma e l\'altro', () => {
  const keys = ['day', 'night', 'gold', 'rose', 'amb', 'sun'];
  let prev = K.light(0), worst = 0;
  for (let i = 1; i <= 10000; i++) {
    const L = K.light(i / 10000);
    for (const k of keys) worst = Math.max(worst, Math.abs(L[k] - prev[k]));
    for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(L.dir[j] - prev.dir[j]));
    prev = L;
  }
  assert.ok(worst < 0.01, 'salto massimo ' + worst);
});

test('di notte si gioca lo stesso: luce d\'ambiente e del sole mai sotto il minimo, sole sempre sopra l\'orizzonte', () => {
  for (let i = 0; i < 1000; i++) {
    const L = K.light(i / 1000);
    assert.ok(L.amb >= K.MIN_AMB - 1e-9, 'amb ' + L.amb);
    assert.ok(L.sun >= K.MIN_SUN * 0.85 - 1e-9, 'sun ' + L.sun);
    assert.ok(L.dir[1] > 0.4, 'altezza ' + L.dir[1]);
    assert.ok(Math.abs(Math.hypot(...L.dir) - 1) < 1e-9);
    for (const k of ['day', 'night', 'gold', 'rose']) assert.ok(L[k] >= 0 && L[k] <= 1, k);
  }
  const N = K.light(0.8);
  assert.equal(N.phase, 'night');
  assert.ok(N.night > 0.99);
});

test('durata del giorno: 3 minuti a ×1, più corto con la velocità ma mai sotto un minuto; fermo in pausa', () => {
  assert.equal(K.period(1), 180);
  assert.equal(K.period(2), 90);
  assert.equal(K.period(4), 60);
  assert.equal(K.period(16), 60);
  assert.equal(K.period(0), Infinity);
  assert.equal(K.advance(0.3, 5, 0), 0.3);
  assert.ok(Math.abs(K.advance(0.3, 18, 1) - 0.4) < 1e-9);
  assert.ok(Math.abs(K.advance(0.95, 6, 4) - 0.05) < 1e-9, 'gira oltre la mezzanotte');
  // a ×4 per un minuto intero: esattamente un giro
  let t = 0.2;
  for (let i = 0; i < 3600; i++) t = K.advance(t, 1 / 60, 4);
  assert.ok(Math.abs(t - 0.2) < 1e-6);
  assert.equal(K.norm(NaN), K.START);
  assert.equal(K.norm(undefined), K.START);
  assert.ok(Math.abs(K.norm(-0.25) - 0.75) < 1e-12);
});

test('"sempre giorno": luce di mezzogiorno a qualsiasi ora', () => {
  for (const t of [0, 0.62, 0.8, 0.95]) {
    const L = K.light(t, true);
    assert.equal(L.phase, 'day');
    assert.equal(L.night, 0);
    assert.equal(L.gold, 0);
  }
});

test('la simulazione non dipende dall\'ora del giorno salvata (s.tod)', () => {
  const run = (tod) => {
    const s = E.levelFromSeed(1, 4242);
    if (tod != null) s.tod = tod;
    const r = E.restore(JSON.parse(JSON.stringify(s)));
    E.step(r, 400);
    const o = JSON.parse(JSON.stringify(r));
    delete o.tod;
    return JSON.stringify(o);
  };
  const a = run(null), b = run(0.8), c = run(0.123);
  assert.equal(a, b);
  assert.equal(a, c);
  // e l'ora sopravvive al salvataggio
  const s = E.levelFromSeed(2, 77); s.tod = 0.731;
  assert.equal(E.restore(JSON.stringify(s)).tod, 0.731);
});
