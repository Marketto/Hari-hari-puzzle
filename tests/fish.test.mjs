// Unit test Hari Fishing: logica deterministica e ripresa da JSON, ogni livello vinto dal bot (tests/_fish-bot.mjs:
// vede solo fase, galleggiante, tensione e finestra verde, come il giocatore), le strategie sbagliate falliscono
// (tirare sempre al massimo rompe la lenza, non tirare mai non porta a riva), curva di difficoltà monotona,
// specie speciale sempre raggiungibile, sensori (inclinazione → mulinello, gesto del lancio) e album.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
import { fishBot } from './_fish-bot.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/fish-logic.js');
const F = HH.fish;
const fresh = (level, seed) => F.newLevel(level, HH.rng(seed));
const json = (x) => JSON.parse(JSON.stringify(x));
const BOT = fishBot(HH);

// gioca con una strategia fissa di mulinello (lancia al massimo e libera ogni pesce)
function playFixed(s, reel, maxT = 400) {
  while (!F.isOver(s) && s.t < maxT) {
    if (s.phase === 'aim') { F.cast(s, 1, 0); continue; }
    if (s.phase === 'caught') { F.release(s); continue; }
    F.tick(s, { reel: s.phase === 'bite' ? 1 : reel });
  }
  return s;
}

test('stesso seme + stessi input = stessa partita; ripresa da JSON identica', () => {
  const inp = (t) => ({ reel: Math.sin(t * 0.9) * 0.8 + 0.2 });
  const run = (s, until) => { while (s.t < until) { if (s.phase === 'aim') F.cast(s, 0.8, 0.2); else if (s.phase === 'caught') F.release(s, true); else F.tick(s, inp(s.t)); } };
  const a = fresh(6, 42), b = fresh(6, 42);
  assert.deepEqual(a, b);
  run(a, 40); run(b, 40);
  assert.deepEqual(json(a), json(b));
  const c = json(a);
  run(a, 90); run(c, 90);
  assert.deepEqual(json(a), json(c));
  assert.ok(a.moves > 0);
});

test('step a passi fissi: dt spezzettati o interi danno lo stesso stato', () => {
  const a = fresh(3, 7), b = fresh(3, 7);
  F.cast(a, 0.5); F.cast(b, 0.5);
  for (let i = 0; i < 300; i++) F.step(a, 1 / 60, { reel: 0 });
  for (let i = 0; i < 100; i++) F.step(b, 3 / 60, { reel: 0 });
  assert.equal(a.phase, b.phase);
  assert.equal(+a.t.toFixed(6), +b.t.toFixed(6));
});

test('ogni livello 1–14 è vinto dal bot (8 semi per livello), senza mai perdere la lenza ai livelli 1–2', () => {
  for (let level = 1; level <= 14; level++) {
    const c = F.config(level);
    for (let k = 0; k < 8; k++) {
      const s = fresh(level, level * 1000 + k);
      const ev = BOT.play(s);
      assert.ok(F.isWon(s), `livello ${level} seme ${k}: non vinto (presi ${s.caught.length}/${c.goal}, t ${s.t.toFixed(0)})`);
      assert.ok(ev.some((e) => e.type === 'win'));
      assert.ok(s.caught.length >= c.goal);
      if (c.target) assert.ok(s.caught.some((f) => f.sp === c.target), `livello ${level}: specie speciale ${c.target}`);
      assert.equal(F.progress(s), 1);
      if (level <= 2) assert.equal(s.lost, 0);
      // ogni pesce preso è una specie del posto (lago o mare) e il peso è nel suo intervallo
      for (const f of s.caught) {
        const sp = F.SP[f.sp];
        assert.ok(c.pool.includes(f.sp), `${f.sp} non è del livello ${level}`);
        assert.ok(f.g >= sp.g[0] - 10 && f.g <= sp.g[1] + 10, `${f.sp} ${f.g} g`);
      }
    }
  }
});

test('anche lanciando a metà forza il bot vince i primi livelli (i pesci rari chiedono lanci lunghi)', () => {
  const half = fishBot(HH, { power: 0.5 });
  for (let level = 1; level <= 4; level++) {
    const s = fresh(level, 99 + level);
    half.play(s);
    const c = F.config(level);
    // 5 + 25 · 0,5 = 17,5 m: la specie speciale dei livelli 3–4 (non comune) si raggiunge
    assert.ok(F.isWon(s), `livello ${level}`);
    if (c.target) assert.ok(F.SP[c.target].minD <= 17.5);
  }
});

test('strategie sbagliate: tirare sempre al massimo rompe la lenza dal livello 5, non tirare mai non porta pesci', () => {
  for (const level of [5, 8, 12]) {
    const s = playFixed(fresh(level, 5 + level), 1, 200);
    assert.ok(s.snaps >= 3, `livello ${level}: ${s.snaps} rotture`);
    assert.ok(!F.isWon(s), `livello ${level}: vinto tirando sempre`);
  }
  for (const level of [1, 6]) {
    const s = playFixed(fresh(level, 3), 0, 200);
    assert.equal(s.caught.length, 0, 'senza recuperare il pesce non arriva al pontile');
  }
  for (const level of [4, 10]) {
    const s = playFixed(fresh(level, 8), -1, 200);
    assert.ok(s.slacks >= 1 && s.caught.length === 0, 'mollando sempre il pesce si slama');
  }
  // al livello 1 un bambino che tiene premuto "Tira" vince lo stesso
  const easy = playFixed(fresh(1, 12), 1, 400);
  assert.ok(F.isWon(easy));
});

test('curva di difficoltà: finestra più stretta, misuratori più rapidi, pesci più forti, più pesci (≥ 4 gradini)', () => {
  const cs = [1, 3, 6, 9, 12].map(F.config);
  for (let i = 1; i < cs.length; i++) {
    const a = cs[i - 1], b = cs[i];
    assert.ok(b.tMax - b.tMin < a.tMax - a.tMin, 'finestra');
    assert.ok(b.brkTime < a.brkTime && b.slkTime < a.slkTime && b.biteWin < a.biteWin, 'tempi');
    assert.ok(b.strMul > a.strMul && b.spdMul > a.spdMul, 'pesci');
    assert.ok(b.goal >= a.goal && b.par > a.par, 'obiettivo');
  }
  assert.equal(F.config(1).target, null);
  assert.ok(F.config(3).target && F.config(5).target);
  assert.equal(F.config(9).target, 'golden');
  assert.deepEqual(F.config(30), Object.assign(F.config(30), { level: 30 }));
  assert.ok(F.config(40).tMax - F.config(40).tMin >= 0.4, 'mai troppo stretto');
  // la specie speciale è sempre nel posto del livello e raggiungibile con un lancio pieno
  for (let level = 1; level <= 30; level++) {
    const c = F.config(level);
    assert.ok(c.pool.length >= 3);
    if (c.target) { assert.ok(c.pool.includes(c.target), `livello ${level}`); assert.ok(F.SP[c.target].minD <= F.D_MAX); }
  }
});

test('fasi: abboccata da ferrare in tempo, ferrata troppo presto, recupero dell\'amo senza penalità', () => {
  const s = fresh(2, 21);
  assert.equal(s.phase, 'aim');
  assert.deepEqual(F.cast(s, 0.4, 0), [{ type: 'cast', p: 0.4 }]);
  assert.deepEqual(F.cast(s, 1), [], 'un solo lancio alla volta');
  let ev = [];
  while (s.phase !== 'bite') ev.push(...F.tick(s, { reel: 0 }));
  assert.ok(ev.some((e) => e.type === 'land'));
  // senza tirare l'abboccata scade
  while (s.phase === 'bite') ev.push(...F.tick(s, { reel: 0 }));
  assert.equal(s.phase, 'wait'); assert.equal(s.misses, 1);
  while (s.phase !== 'bite') F.tick(s, { reel: 0 });
  ev = F.tick(s, { reel: 0.8 });
  assert.equal(s.phase, 'fight'); assert.ok(ev.some((e) => e.type === 'hook'));
  // ferrare subito dopo un assaggio spaventa il pesce
  const e2 = fresh(1, 1);
  F.cast(e2, 0.5);
  let early = false;
  for (let i = 0; i < 2000 && !early; i++) {
    const out = F.tick(e2, { reel: 0 });
    if (out.some((x) => x.type === 'nibble')) early = F.tick(e2, { reel: 1 }).some((x) => x.type === 'early');
    if (e2.phase === 'bite') { F.tick(e2, { reel: 1 }); break; }
  }
  // (con nib = 0 il primo pesce abbocca senza assaggi: si prova un altro seme)
  if (!early) {
    for (let seed = 2; seed < 40 && !early; seed++) {
      const x = fresh(3, seed); F.cast(x, 0.5);
      for (let i = 0; i < 2000 && x.phase !== 'bite' && !early; i++) if (F.tick(x, { reel: 0 }).some((q) => q.type === 'nibble')) early = F.tick(x, { reel: 1 }).some((q) => q.type === 'early');
    }
  }
  assert.ok(early, 'ferrata troppo presto');
  // tirando piano durante l'attesa l'amo torna al pontile e si rilancia
  const r = fresh(1, 5);
  F.cast(r, 0);
  while (r.phase === 'fly') F.tick(r, { reel: 0 });
  let back = [];
  for (let i = 0; i < 2000 && (r.phase === 'wait' || r.phase === 'bite'); i++) back.push(...F.tick(r, { reel: 0.3 }));   // 0,3 non basta a ferrare
  assert.ok(r.phase === 'aim' && back.some((e) => e.type === 'reel'));
  assert.equal(r.lost, 0);
});

test('rottura e slamatura: la tensione oltre la finestra o sotto riempie i misuratori, poi si rilancia', () => {
  const s = fresh(10, 77);
  F.cast(s, 1);
  while (s.phase !== 'bite') F.tick(s, { reel: 0 });
  F.tick(s, { reel: 1 });
  const z = F.zones(s);
  let ev = [];
  for (let i = 0; i < 600 && s.phase === 'fight'; i++) ev.push(...F.tick(s, { reel: 1 }));
  assert.ok(ev.some((e) => e.type === 'snap'), 'lenza rotta');
  assert.equal(s.phase, 'aim'); assert.equal(s.lost, 1); assert.equal(s.snaps, 1);
  assert.ok(z.tMax < 0.8);
  const q = fresh(10, 78);
  F.cast(q, 1);
  while (q.phase !== 'bite') F.tick(q, { reel: 0 });
  F.tick(q, { reel: 1 });
  ev = [];
  for (let i = 0; i < 600 && q.phase === 'fight'; i++) ev.push(...F.tick(q, { reel: -1 }));
  assert.ok(ev.some((e) => e.type === 'slack'), 'pesce slamato'); assert.equal(q.slacks, 1);
});

test('progresso, stelle e salvataggio', () => {
  const s = fresh(5, 3);
  assert.equal(F.progress(s), 0);
  const c = F.config(5);
  BOT.play(s);
  assert.equal(F.progress(s), 1);
  assert.ok([1, 2, 3].includes(F.rate(s)));
  assert.equal(F.par(s), c.par);
  // senza la specie speciale il progresso si ferma prima della fine anche con tanti pesci
  const p = fresh(5, 4);
  p.caught = Array.from({ length: c.goal + 2 }, () => ({ sp: 'clown', g: 100 }));
  assert.ok(F.progress(p) < 1);
  // stelle: senza perdite ed entro il tempo 3, poi meno
  assert.equal(F.rate(Object.assign(json(s), { lost: 0, t: 10 })), 3);
  assert.equal(F.rate(Object.assign(json(s), { lost: 2, t: c.par * 1.2 })), 2);
  assert.equal(F.rate(Object.assign(json(s), { lost: 5, t: c.par * 3 })), 1);
  // ripresa: le fasi a metà lancio tornano a 'aim', la lotta resta
  const m = fresh(4, 9);
  F.cast(m, 0.5);
  assert.equal(F.migrate(json(m)).phase, 'aim');
  while (m.phase !== 'bite') F.tick(m, { reel: 0 });
  F.tick(m, { reel: 1 });
  assert.equal(F.migrate(json(m)).phase, 'fight');
  assert.equal(F.migrate({ v: 9 }), null);
  assert.equal(F.migrate(null), null);
});

test('sensori: inclinazione del lato alto dello schermo e recupero', () => {
  const near = (a, b, e = 0.6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);
  near(F.pitchFrom(0, 0, 0), 0);          // piatto sul tavolo
  near(F.pitchFrom(45, 0, 0), 45);
  near(F.pitchFrom(90, 0, 0), 90);        // in piedi davanti a sé
  near(F.pitchFrom(120, 0, 0), 120);      // oltre la verticale: continua a salire, non si ripiega
  near(F.pitchFrom(40, 10, 0), F.pitchFrom(40, -10, 0));
  // telefono girato in orizzontale (90°): conta il lato lungo che ora è "in alto"
  near(F.pitchFrom(0, -50, 90), 50, 1);
  near(F.pitchFrom(0, 50, 270), 50, 1);
  // mulinello: zona morta, monotono, saturo
  assert.equal(F.tiltToReel(0), 0); assert.equal(F.tiltToReel(3), 0); assert.equal(F.tiltToReel(-3), 0);
  assert.equal(F.tiltToReel(30), 1); assert.equal(F.tiltToReel(80), 1); assert.equal(F.tiltToReel(-22), -1); assert.equal(F.tiltToReel(-90), -1);
  assert.equal(F.tiltToReel(NaN), 0);
  let prev = -2;
  for (let d = -40; d <= 40; d += 0.5) { const r = F.tiltToReel(d); assert.ok(r >= prev); prev = r; }
});

test('gesto del lancio: indietro e poi avanti di scatto; più veloce = più lontano; movimenti lenti non lanciano', () => {
  // campioni a 60 Hz della curva dell'inclinazione
  function swing(back, fwd, dur = 0.25) {
    const det = F.newFlick();
    let t = 0, p = 50, out = 0;
    const push = (v) => { t += 1 / 60; p = v; const r = F.flick(det, t, p, 0); if (r) out = r; };
    for (let i = 0; i < 20; i++) push(50 + (back * i) / 20);              // indietro
    const top = p;
    const n = Math.round(dur * 60);
    for (let i = 1; i <= n; i++) push(top - (fwd * i) / n);              // avanti di scatto
    for (let i = 0; i < 20; i++) push(p);                                // fermo
    return out;
  }
  const soft = swing(40, 50, 0.3), hard = swing(50, 90, 0.12);
  assert.ok(soft > 0 && hard > 0, `${soft} ${hard}`);
  assert.ok(hard > soft);
  assert.ok(hard <= 1 && soft >= 0.12);
  // movimento lento (si sistema il telefono): niente lancio
  const det = F.newFlick();
  let fired = 0;
  for (let i = 0; i < 300; i++) fired += F.flick(det, i / 60, 50 + Math.sin(i / 40) * 20, 0) ? 1 : 0;
  assert.equal(fired, 0);
  // avanti di scatto senza essere andati indietro: niente lancio
  const d2 = F.newFlick();
  let f2 = 0;
  for (let i = 0; i < 30; i++) f2 += F.flick(d2, 2 + i / 60, 60, 0) ? 1 : 0;
  for (let i = 0; i < 15; i++) f2 += F.flick(d2, 2.5 + i / 60, 60 - i * 5, 0) ? 1 : 0;
  assert.equal(f2, 0);
});

test('album: nuove specie, record, foto, copia senza modificare l\'originale', () => {
  const a0 = {};
  const r1 = F.albumAdd(a0, { sp: 'koi', g: 900 });
  assert.ok(r1.isNew && !r1.record);
  assert.deepEqual(a0, {});
  const r2 = F.albumAdd(r1.album, { sp: 'koi', g: 1200 }, true);
  assert.ok(!r2.isNew && r2.record);
  assert.deepEqual(r2.album.koi, { n: 2, best: 1200, photo: true });
  const r3 = F.albumAdd(r2.album, { sp: 'koi', g: 300 });
  assert.ok(!r3.record); assert.equal(r3.album.koi.photo, true);
});

test('prestazioni: generazione < 1 ms, passo < 20 µs', () => {
  let t0 = performance.now();
  for (let i = 0; i < 1000; i++) fresh(1 + (i % 14), i);
  const gen = (performance.now() - t0) / 1000;
  const s = fresh(12, 1);
  t0 = performance.now();
  let n = 0;
  while (!F.isOver(s) && n < 60000) { if (s.phase === 'aim') F.cast(s, 1); else if (s.phase === 'caught') F.release(s); else { F.tick(s, { reel: Math.sin(n / 30) }); n++; } }
  const st = (performance.now() - t0) / Math.max(1, n);
  assert.ok(gen < 1 * SLOW, `generazione ${gen.toFixed(3)} ms`);
  assert.ok(st < 0.02 * SLOW, `passo ${(st * 1000).toFixed(1)} µs`);
});
