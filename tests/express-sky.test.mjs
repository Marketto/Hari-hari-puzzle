// Unit test del ciclo giorno/notte di Hari Express (src/games/express-sky.js): il cielo segue l'orologio del gioco
// (notte sullo schermo = notte dell'orologio), fasi alle ore giuste, curva continua (niente scatti, anche a mezzanotte
// e con la notte smorzata delle velocità alte), luce minima di notte, "sempre giorno", partita nuova di mattina.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/games/express-map.js', 'src/games/express-net.js', 'src/games/express-sim.js', 'src/games/express-logic.js', 'src/games/express-sky.js');
const K = HH.expressSky, E = HH.express;
const at = (hh) => hh / 24;

test('fasi alle ore dell\'orologio: notte 21–4:30, alba, giorno 6:30–18:30 (il più lungo), tramonto', () => {
  assert.equal(K.phase(at(0)), 'night');
  assert.equal(K.phase(at(3)), 'night');
  assert.equal(K.phase(at(23)), 'night');
  assert.equal(K.phase(at(5.5)), 'dawn');
  assert.equal(K.phase(at(7)), 'day');
  assert.equal(K.phase(at(12)), 'day');
  assert.equal(K.phase(at(18)), 'day');
  assert.equal(K.phase(at(19.5)), 'sunset');
  const n = 24000, cnt = { day: 0, sunset: 0, night: 0, dawn: 0 };
  for (let i = 0; i < n; i++) cnt[K.phase(i / n)]++;
  assert.ok(Math.abs(cnt.day / n - 0.5) < 0.01, 'giorno ' + cnt.day / n);
  assert.ok(Math.abs(cnt.night / n - 7.5 / 24) < 0.01, 'notte ' + cnt.night / n);
  const seq = [];
  for (let i = 0; i < n; i++) { const p = K.phase(i / n); if (seq[seq.length - 1] !== p) seq.push(p); }
  assert.deepEqual(seq, ['night', 'dawn', 'day', 'sunset', 'night']);
});

test('il cielo è l\'orologio: hourOf dalle ore e dai passi della simulazione', () => {
  assert.ok(Math.abs(K.hourOf(30, 12, 24) - 6.5 / 24) < 1e-12);
  assert.ok(Math.abs(K.hourOf(23, 23, 24, 1) - 0) < 1e-12, 'mezzanotte');
  const s = E.levelFromSeed(1, 9);
  for (let k = 0; k < 30; k++) {
    E.step(s, 101);
    const t = K.hourOf(s.h, s.tk, E.TPH), d = E.date(s.h);
    assert.ok(Math.abs(t * 24 - (d.hh + s.tk / E.TPH)) < 1e-9);
    // notte sullo schermo quando l'orologio dice notte
    const night = d.hh >= 21 || d.hh < 4;
    if (night) assert.equal(K.light(t).phase, 'night');
    if (d.hh >= 7 && d.hh < 18) assert.ok(K.light(t).day > 0.99);
  }
});

test('una partita nuova parte di mattina (7:00), in piena luce, col sole che sale', () => {
  const s = E.levelFromSeed(2, 3), t = K.hourOf(s.h, s.tk, E.TPH);
  assert.ok(Math.abs(t - K.START) < 1e-12);
  const L = K.light(t);
  assert.equal(L.phase, 'day');
  assert.ok(L.day > 0.99 && L.amb > 0.99);
  assert.ok(L.dir[1] < K.light(K.NOON).dir[1]);
});

test('curva continua (anche a mezzanotte e alle velocità alte): nessuno scatto fra un fotogramma e l\'altro', () => {
  const keys = ['day', 'night', 'dark', 'gold', 'rose', 'amb', 'sun'];
  for (const dp of [1, K.depth(2), K.depth(4)]) {
    let prev = K.light(0, false, dp), worst = 0;
    for (let i = 1; i <= 10000; i++) {
      const L = K.light(i / 10000, false, dp);
      for (const k of keys) worst = Math.max(worst, Math.abs(L[k] - prev[k]));
      for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(L.dir[j] - prev.dir[j]));
      prev = L;
    }
    assert.ok(worst < 0.012, `profondità ${dp}: salto massimo ${worst}`);
  }
});

test('velocità alte: la notte è meno profonda (niente sfarfallio), ma finestre e fari si accendono lo stesso', () => {
  assert.equal(K.depth(1), 1); assert.equal(K.depth(2), 0.7); assert.equal(K.depth(4), 0.4); assert.equal(K.depth(0), 1);
  const n1 = K.light(at(1), false, 1), n4 = K.light(at(1), false, K.depth(4));
  assert.ok(n1.night > 0.99 && n4.night < 0.41, `${n1.night} ${n4.night}`);
  assert.ok(n4.amb > n1.amb);
  assert.ok(n1.dark > 0.99 && n4.dark > 0.99, 'la notte vera accende le luci');
  // escursione di luce in un giorno: a ×4 meno della metà di quella a ×1
  const span = (dp) => { let lo = 9, hi = 0; for (let i = 0; i < 200; i++) { const a = K.light(i / 200, false, dp).amb; lo = Math.min(lo, a); hi = Math.max(hi, a); } return hi - lo; };
  assert.ok(span(K.depth(4)) < span(1) * 0.5);
});

test('di notte si gioca lo stesso: luce d\'ambiente e del sole mai sotto il minimo, sole sempre sopra l\'orizzonte', () => {
  for (let i = 0; i < 1000; i++) {
    const L = K.light(i / 1000);
    assert.ok(L.amb >= K.MIN_AMB - 1e-9, 'amb ' + L.amb);
    assert.ok(L.sun >= K.MIN_SUN * 0.85 - 1e-9, 'sun ' + L.sun);
    assert.ok(L.dir[1] > 0.4, 'altezza ' + L.dir[1]);
    assert.ok(Math.abs(Math.hypot(...L.dir) - 1) < 1e-9);
    for (const k of ['day', 'night', 'gold', 'rose', 'dark']) assert.ok(L[k] >= 0 && L[k] <= 1, k);
  }
  assert.equal(K.norm(NaN), K.START);
  assert.ok(Math.abs(K.norm(-0.25) - 0.75) < 1e-12);
});

test('"sempre giorno": luce di mezzogiorno a qualsiasi ora e velocità', () => {
  for (const t of [0, at(19), at(23), at(5)]) for (const dp of [1, 0.4]) {
    const L = K.light(t, true, dp);
    assert.equal(L.phase, 'day');
    assert.equal(L.night, 0);
    assert.equal(L.gold, 0);
  }
});

test('il salvataggio non porta più l\'ora della scena: il cielo si ricava dall\'orologio', () => {
  const s = E.levelFromSeed(1, 4242);
  E.step(s, 400);
  const o = JSON.parse(JSON.stringify(s));
  assert.ok(!('tod' in o));
  const r = E.restore(JSON.stringify(s));
  assert.equal(K.hourOf(r.h, r.tk, E.TPH), K.hourOf(s.h, s.tk, E.TPH));
});
