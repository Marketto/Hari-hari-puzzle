// Unit test Hari Snack Street: logica deterministica e ripresa da JSON, ogni livello completabile da un bot (1 e 2
// giocatori, anche col compagno CPU), l'animalone si batte, la difficoltà sale, gli attacchi del boss che non si evitano
// camminando, la vista compatta per la rete e la partita a due via HH.mp.loopback (modulo vero se c'è, altrimenti lo stub).
// Il bot (tests/_street-bot.mjs) usa solo lo stato pubblico e regole riscritte lì: non chiama cpuInput() né il generatore.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';
import { streetBot } from './_street-bot.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/street-logic.js');
const S = HH.street;
const BOT = streetBot(HH);
const DT = 1 / 60;
const fresh = (level, seed, o = {}) => S.newLevel(level, HH.rng(seed), o);
const json = (x) => JSON.parse(JSON.stringify(x));
const nibbles = (ev) => ev.filter((e) => e.type === 'nibble').length;

test('stesso seme + stessi input = stessa partita; ripresa da JSON identica', () => {
  const inputs = (t) => [{ mx: Math.sin(t * 0.7) > 0 ? 1 : 0.3, my: Math.cos(t * 1.3), a: Math.floor(t * 3), b: Math.floor(t * 1.2), c: Math.floor(t / 2), s: Math.floor(t / 9) },
    { mx: 0.8, my: Math.sin(t), a: Math.floor(t * 2), b: Math.floor(t), c: 0, s: 0 }];
  for (const np of [1, 2]) {
    const a = fresh(5, 77, { players: np }), b = fresh(5, 77, { players: np });
    assert.deepEqual(a, b);
    let t = 0;
    for (; t < 20; t += DT) { S.step(a, DT, inputs(t)); S.step(b, DT, inputs(t)); }
    assert.deepEqual(json(a), json(b));
    // a metà partita si salva e si riprende: tutto continua uguale
    const c = json(a);
    for (; t < 45; t += DT) { S.step(a, DT, inputs(t)); S.step(c, DT, inputs(t)); }
    assert.deepEqual(json(a), json(c));
    assert.ok(a.t > 40);
  }
});

test('un input perso non perde i tocchi: i contatori recuperano le pressioni', () => {
  const s = fresh(1, 3);
  s.ready = 0;
  S.step(s, DT, [{ mx: 0, my: 0, a: 0, b: 0, c: 0, s: 0 }]);
  // tre pressioni di salto arrivate tutte insieme (pacchetti precedenti persi): si salta (una alla volta, in coda)
  S.step(s, DT, [{ mx: 0, my: 0, a: 0, b: 0, c: 3, s: 0 }]);
  assert.ok(s.players[0].z > 0, 'salto partito');
  assert.equal(s.players[0].pc[2], 1);
  for (let i = 0; i < 5; i++) S.step(s, DT, [null]);
  assert.equal(s.players[0].pc[2], 3, 'le pressioni in coda sono state consumate');
});

test('ogni livello 1–12 è vinto dal bot da solo (dal 11 almeno 3 semi su 4); il livello 1 senza cuori persi', () => {
  for (let level = 1; level <= 12; level++) {
    let won = 0;
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 100 + k);
      const ev = BOT.play(s, { seed: k + 1 });
      if (S.isWon(s)) {
        won++;
        assert.ok(ev.some((e) => e.type === 'boss') && ev.some((e) => e.type === 'win'), `livello ${level}: boss e vittoria`);
        assert.equal(S.progress(s), 1);
        assert.equal(s.sec, s.waveN, 'tutte le ondate');
        if (level === 1) assert.equal(s.oops, 0, 'livello 1 senza cuori persi');
      }
    }
    assert.ok(won >= (level <= 10 ? 4 : 3), `livello ${level}: vinte ${won}/4`);
  }
});

test('in due (due bot) ogni livello 1–12 si vince; anche con Kiki guidata dalla CPU 1–8', () => {
  for (let level = 1; level <= 12; level++) {
    let won = 0;
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 100 + k, { players: 2 });
      BOT.play(s, { seed: k + 1 });
      if (S.isWon(s)) won++;
    }
    assert.ok(won >= (level <= 10 ? 4 : 3), `2 giocatori, livello ${level}: vinte ${won}/4`);
  }
  for (let level = 1; level <= 8; level++) {
    for (let k = 0; k < 3; k++) {
      const s = fresh(level, level * 100 + k, { players: 2, cpu: true });
      assert.equal(s.players[1].cpu, 1);
      BOT.play(s, { seed: k + 1 });
      assert.ok(S.isWon(s), `con la CPU, livello ${level} seme ${k}`);
      // il compagno CPU sfama davvero
      assert.ok(s.players[1].fed > 0, `la CPU non ha sfamato nessuno (livello ${level})`);
    }
  }
});

test('livelli difficili 13–16: completabili (almeno una vittoria su 6 semi, da soli o in due)', () => {
  for (let level = 13; level <= 16; level++) {
    let won = 0;
    for (let k = 0; k < 6 && !won; k++) {
      for (const np of [1, 2]) {
        const s = fresh(level, level * 100 + k, { players: np });
        BOT.play(s, { seed: k + 1 });
        if (S.isWon(s)) won++;
      }
    }
    assert.ok(won > 0, `livello ${level} mai vinto`);
  }
});

test('l’animalone si batte: ogni tipo, con tutti i suoi attacchi; fasi a 50% e 80% della pancia', () => {
  const seen = new Set();
  for (let level = 1; level <= 10; level++) {
    const s = fresh(level, 900 + level);
    const ev = BOT.play(s, { seed: level });
    assert.ok(S.isWon(s), `livello ${level}`);
    assert.equal(s.boss.st, 'full');
    assert.ok(s.boss.fed >= s.boss.need);
    ev.filter((e) => e.type === 'bossAtk').forEach((e) => seen.add(s.bossK + ':' + e.a));
    const ph = ev.filter((e) => e.type === 'phase').map((e) => e.n);
    assert.deepEqual(ph, [1, 2], `fasi del boss al livello ${level}`);
  }
  for (const k of Object.keys(S.BOSSES)) {
    const all = new Set(S.BOSSES[k].cycle.flat());
    for (const a of ['melon']) assert.ok(all.has(a), `${k} fa rotolare angurie`);
    assert.ok([...seen].some((x) => x.startsWith(k + ':')), `${k} non ha mai attaccato`);
  }
});

test('attacchi che non si evitano camminando: le angurie coprono tutta la strada, l’onda del pestone pure', () => {
  for (let level = 1; level <= 20; level += 3) {
    const c = S.config(level);
    const s = fresh(level, 5);
    s.ready = 0;
    // raffica di angurie: ogni profondità è coperta da almeno una
    const b = { k: 'bear', x: 9, y: 1.5, r: 1, fed: 0, need: 99, st: 'wind', a: 'melon', t: 0.69, ai: 0, ph: 0, nx: 9, face: -1, cd: 9 };
    s.boss = b; s.cam = 0; s.phase = 'boss';
    S.tick(s, [null]); S.tick(s, [null]);
    assert.equal(s.melons.length, c.melons);
    for (let y = 0; y <= S.DEPTH + 1e-9; y += 0.02) assert.ok(s.melons.some((m) => Math.abs(m.y - y) < m.w), `livello ${level}: y=${y.toFixed(2)} scoperta`);
  }
  // pestone: l'onda si allarga finché ha toccato ogni punto della strada visibile (si evita solo saltando)
  {
    const s = fresh(4, 8);
    s.ready = 0; s.cam = 0; s.phase = 'boss';
    s.boss = { k: 'bear', x: 8.3, y: 1.5, r: 1, fed: 0, need: 99, st: 'wind', a: 'stomp', t: 0.69, ai: 0, ph: 0, nx: 99, face: -1, cd: 9 };

    const spots = [[0.4, 0], [0.4, S.DEPTH], [5, 0.1], [9.6, 2.9], [2, 1.5]];
    for (const [x, y] of spots) {
      const c = JSON.parse(JSON.stringify(s));
      c.players[0].x = x; c.players[0].y = y;
      let hit = false;
      for (let i = 0; i < 60 * 5 && !hit; i++) { const ev = S.tick(c, [{ mx: 0, my: 0, a: 0, b: 0, c: 0, s: 0 }]); c.players[0].x = x; c.players[0].y = y; hit = ev.some((e) => e.type === 'nibble' && e.by === 'stomp'); }
      assert.ok(hit, `il pestone non arriva in (${x}, ${y})`);
    }
  }
  // confronto: lo stesso bot che non salta mai prende molti più morsi da angurie e pestoni
  let jump = 0, nojump = 0;
  for (let k = 0; k < 4; k++) {
    for (const [mode, add] of [['smart', (n) => { jump += n; }], ['nojump', (n) => { nojump += n; }]]) {
      const s = fresh(6, 600 + k);
      const ev = BOT.play(s, { seed: k + 1, mode });
      add(ev.filter((e) => e.type === 'nibble' && (e.by === 'melon' || e.by === 'stomp')).length);
    }
  }
  assert.ok(nojump >= jump * 2 + 4, `senza saltare ${nojump} morsi da angurie/pestoni, saltando ${jump}`);
});

test('la difficoltà sale: curva monotona e più morsi per il bot nei livelli alti; con 2 giocatori più animali', () => {
  let prev = null;
  for (let level = 1; level <= 30; level++) {
    const c = S.config(level), c2 = S.config(level, 2);
    if (prev) {
      for (const k of ['waves', 'perWave', 'maxAct', 'needMul', 'speedMul', 'bossNeed', 'melons', 'maxAtk']) assert.ok(c[k] >= prev[k], `${k} scende al livello ${level}`);
      for (const k of ['cdMul', 'bossIv', 'melonGap']) assert.ok(c[k] <= prev[k], `${k} sale al livello ${level}`);
      assert.ok(c.kinds.length >= prev.kinds.length);
    }
    assert.ok(c2.perWave > c.perWave && c2.maxAct > c.maxAct && c2.bossNeed > c.bossNeed && c2.needMul > c.needMul, `livello ${level}: 2 giocatori`);
    prev = c;
  }
  // almeno 4 gradini ben distinti
  const steps = new Set([1, 4, 8, 12, 16].map((L) => JSON.stringify([S.config(L).waves, S.config(L).perWave, S.config(L).kinds.length])));
  assert.ok(steps.size >= 4);
  const avg = (levels) => {
    let n = 0, g = 0;
    for (const L of levels) for (let k = 0; k < 3; k++) { const s = fresh(L, L * 37 + k); n += nibbles(BOT.play(s, { seed: k + 7 })); g++; }
    return n / g;
  };
  const lo = avg([1, 2, 3]), hi = avg([10, 11, 12]);
  assert.ok(hi > lo * 2, `morsi medi: livelli 1–3 ${lo.toFixed(1)}, livelli 10–12 ${hi.toFixed(1)}`);
});

test('chi non fa niente perde (i cuori della squadra finiscono)', () => {
  const s = fresh(3, 12);
  const idle = { mx: 0, my: 0, a: 0, b: 0, c: 0, s: 0 };
  let t = 0;
  // cammina fino all'ondata e poi resta fermo
  while (!S.isOver(s) && t < 400) { S.step(s, DT, [s.phase === 'walk' ? { ...idle, mx: 1 } : idle]); t += DT; }
  assert.ok(S.isLost(s));
  assert.equal(s.mistakes, S.LIVES);
  assert.equal(S.rate(s), 1);
});

test('vista compatta per la rete: JSON piccolo, senza copione, con ciò che serve a disegnare e i numeri dell’app', () => {
  const s = fresh(8, 41, { players: 2 });
  s.players.forEach((p) => { p.cpu = 1; });
  let big = 0;
  for (let i = 0; i < 60 * 120 && !S.isOver(s); i++) {
    S.step(s, DT, [null, null]);
    if (i % 30 === 0) {
      const v = S.view(s), txt = JSON.stringify(v);
      big = Math.max(big, txt.length);
      assert.ok(!('waves' in v) && !('rs' in v), 'niente copione né generatore nella vista');
      assert.ok(Math.abs(S.progress(v) - S.progress(s)) < 0.002);
      assert.equal(v.mistakes, s.mistakes);
      assert.equal(v.players.length, 2);
    }
  }
  assert.ok(big < 6000, `vista troppo grande: ${big} byte`);
});

test('due giocatori via HH.mp.loopback con latenza e perdite: l’ospite vede lo stato dell’host e muove Kiki', async () => {
  const real = path.join(root, 'src/net/mp.js'), stub = path.join(root, 'src/net/mp-stub.js');
  const file = fs.existsSync(real) ? 'src/net/mp.js' : fs.existsSync(stub) ? 'src/net/mp-stub.js' : null;
  if (!file) return;
  const H = load(file);
  const [hl, gl] = H.mp.loopback({ latency: 30, jitter: 15, loss: 0.15 });
  const s = fresh(2, 9, { players: 2 });
  s.players[0].cpu = 1;
  s.ready = 0;
  let gv = null;
  const host = H.mp.session(hl, { tick: 60, sendEvery: 3, step: (dt, inp) => S.step(s, dt, [null, inp[1] || null]), snapshot: () => S.view(s) });
  const guest = H.mp.session(gl, { tick: 60, sendEvery: 3, apply: (snap) => { gv = snap; } });
  host.start(); guest.start();
  const t0 = performance.now(), x0 = s.players[1].x;
  await new Promise((resolve) => {
    const iv = setInterval(() => {
      const now = performance.now();
      guest.setInput({ mx: now - t0 < 1500 ? 1 : 0, my: 0, a: 0, b: 0, c: 0, s: 0 });
      host.frame(now); guest.frame(now);
      if (now - t0 > 2600) { clearInterval(iv); resolve(); }
    }, 16);
  });
  host.stop(); guest.stop();
  hl.close(); gl.close();
  assert.ok(s.players[1].x > x0 + 2, `Kiki si è mossa coi comandi dell’ospite (${x0} → ${s.players[1].x})`);
  assert.ok(gv, 'l’ospite ha ricevuto viste');
  // fermi da 1 s: la vista dell’ospite coincide con quella dell’host (a meno dei tick dell’ultimo invio)
  assert.ok(Math.abs(gv.players[1].x - s.players[1].x) < 0.05, `posizione di Kiki: ospite ${gv.players[1].x}, host ${s.players[1].x}`);
  assert.ok(Math.abs(gv.t - s.t) < 0.3);
});

test('tempi: generazione < 10 ms, passo di simulazione < 0,5 ms', () => {
  let gen = 0, sim = 0, ticks = 0;
  for (let k = 0; k < 20; k++) {
    const t = performance.now();
    const s = fresh(1 + k, k, { players: 2, cpu: true });
    gen += performance.now() - t;
    s.players[0].cpu = 1;
    const t2 = performance.now();
    for (let i = 0; i < 1200; i++, ticks++) S.step(s, DT, [null, null]);
    sim += performance.now() - t2;
  }
  assert.ok(gen / 20 < 10 * SLOW, `generazione ${(gen / 20).toFixed(2)} ms`);
  assert.ok(sim / ticks < 0.5 * SLOW, `passo ${(sim / ticks).toFixed(3)} ms`);
});
