// Unit test Hari Snack Rush: un bot attento con tempi di reazione umani vince i livelli 1–15 su più semi, un bot pigro
// (porta più comoda, niente rischi) perde spesso dal livello 4; porte presidiate, che si scambiano e regalo; ostacoli
// sempre con un varco; power-up; grandi merende dell'animalone sempre rimandabili col potere atteso; determinismo e
// ripresa da JSON, migrazione dei salvataggi v1, via di fuga dai soffi, curva monotona, tempi di generazione.
// Il bot (tests/_snack-bot.mjs) e l'oracolo delle porte usano solo lo stato pubblico e non chiamano il generatore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/snack-logic.js');
const S = HH.snack;
const DT = 1 / 60;

import { snackBot } from './_snack-bot.mjs';
const BOT = snackBot(HH);
const { goodOp, play } = BOT;
const fresh = (level, seed) => { const s = S.newLevel(level, HH.rng(seed)); s.ready = 0; return s; };

test('il bot attento (reazione 0,3 s) vince i livelli 1–11 su 4 semi; dal 12 al 15 al massimo 3 sconfitte su 16', () => {
  let hardLost = 0;
  for (let level = 1; level <= 15; level++) {
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 1000 + k);
      const ev = play(s, { seed: level * 7 + k });
      if (level >= 12 && !S.isWon(s)) { hardLost++; continue; }
      assert.ok(S.isWon(s), `livello ${level} seme ${k}: perso (${s.oops} cuori, pancia ${s.bossFed}/${s.bossMax})`);
      if (level <= 6) assert.ok(s.oops <= 1, `livello ${level} seme ${k}: ${s.oops} cuori persi`);
      assert.equal(S.progress(s), 1);
      assert.ok(ev.some((e) => e.type === 'boss') && ev.some((e) => e.type === 'win'));
      // ogni animale arrivato è stato saziato o è tornato a casa: nessuno "sparisce"
      const born = new Set(), gone = new Set();
      for (const e of ev) if (e.type === 'full') gone.add(e.id);
      for (const e of ev) if (e.type === 'nibble') born.add(e.id);
      for (const id of born) assert.ok(gone.has(id), `animale ${id} mai saziato`);
    }
  }
  assert.ok(hardLost <= 3, `livelli 12–15: ${hardLost} sconfitte`);
});

test('il pigro (porta più comoda, niente rischi) perde spesso dal livello 4; l’attento no', () => {
  let lazyLost = 0, smartLost = 0, games = 0;
  for (let level = 4; level <= 12; level++) {
    for (let k = 0; k < 3; k++) {
      const a = fresh(level, level * 577 + k), b = fresh(level, level * 577 + k);
      play(a, { seed: level * 3 + k, mode: 'lazy' });
      play(b, { seed: level * 3 + k, mode: 'smart' });
      games++;
      if (!S.isWon(a)) lazyLost++;
      if (!S.isWon(b)) smartLost++;
      // a parità di partita il pigro finisce con meno merende per lancio
      assert.ok(a.best <= b.best, `livello ${level}: il pigro ha più potere`);
    }
  }
  assert.ok(lazyLost / games >= 0.7, `il pigro perde solo ${lazyLost}/${games}`);
  assert.ok(smartLost <= 2, `l’attento perde ${smartLost}/${games}`);
  // e il livello 1 resta un tutorial: lo vince anche il pigro
  for (let k = 0; k < 3; k++) { const s = fresh(1, 40 + k); play(s, { seed: k, mode: 'lazy' }); assert.ok(S.isWon(s), 'livello 1 pigro'); }
});

test('livello 1: facile e breve (< 75 s per il bot) senza porte negative né ostacoli', () => {
  for (let k = 0; k < 6; k++) {
    const s = fresh(1, 50 + k);
    for (const e of s.script) if (e.k === 'g') for (const op of [e.l, e.r]) if (op) assert.ok(goodOp(op), `porta ${op} al livello 1`);
    assert.ok(!s.script.some((e) => e.k === 'o' || e.k === 'p'), 'niente ostacoli né power-up al livello 1');
    play(s, { seed: k });
    assert.ok(S.isWon(s) && s.oops === 0);
    assert.ok(s.t > 40 && s.t < 75, `durata ${s.t.toFixed(1)} s`);
  }
});

test('anche un bot più lento (0,45 s) e impreciso vince i primi livelli', () => {
  let lost = 0;
  for (let level = 1; level <= 6; level++) {
    for (let k = 0; k < 2; k++) {
      const s = fresh(level, 900 + level * 10 + k);
      play(s, { react: 0.45, noise: 0.16, seed: level + k * 50 });
      if (!S.isWon(s)) { assert.ok(level >= 4, `livello ${level}`); lost++; }
    }
  }
  assert.ok(lost <= 1, `perse ${lost}`);
});

test('le porte contano: chi le sceglie a caso perde spesso dal livello 5 in su', () => {
  let lost = 0, games = 0;
  for (let level = 5; level <= 15; level++) {
    for (let k = 0; k < 3; k++) {
      const s = fresh(level, level * 333 + k);
      play(s, { seed: level * 11 + k, mode: 'random' });
      games++; if (!S.isWon(s)) lost++;
    }
  }
  assert.ok(lost / games >= 0.5, `perse solo ${lost}/${games}`);
});

test('porte presidiate: la corsia migliore ha ostacoli poco prima della porta, l’altra è libera, e c’è il tempo per infilarsi', () => {
  let guarded = 0;
  for (let level = 2; level <= 20; level++) {
    const c = S.config(level);
    for (let k = 0; k < 10; k++) {
      const s = S.newLevel(level, HH.rng(level * 71 + k));
      const gates = s.script.filter((e) => e.k === 'g');
      for (const o of s.script.filter((e) => e.k === 'o' && e.guard)) {
        guarded++;
        const g = gates.find((x) => Math.abs(x.t - o.t - c.guardGap) < 0.02);
        assert.ok(g, `livello ${level}: ostacolo di guardia senza porta`);
        const side = o.x < 0 ? 'l' : 'r', other = side === 'l' ? 'r' : 'l';
        // presidia la porta migliore: chi la vuole passa vicino all'ostacolo, l'altra corsia è libera
        assert.ok(!g.sw, 'mai su porte che si scambiano');
        assert.ok(!g[other] || !goodOp(g[other]) || !g[side] || goodOp(g[side]), `livello ${level}: guardia sulla porta peggiore`);
        const R = S.OBST[o.kind].r + S.HARI_R;
        for (let x = 0.05; x <= S.X_MAX; x += 0.01) assert.ok(Math.abs(Math.abs(o.x) - x) < R || s.script.some((e) => e !== o && e.k === 'o' && e.guard && e.t === o.t && Math.abs(Math.abs(e.x) - x) < R), `livello ${level}: corsia della porta non coperta a ${x.toFixed(2)}`);
        assert.ok(Math.abs(o.x) - R > -0.2, 'l’altra corsia resta libera');
        // tempo per infilarsi: almeno 0,6 s tra l'ostacolo e la porta
        assert.ok(c.guardGap >= 0.6);
      }
    }
  }
  assert.ok(guarded > 100, `porte presidiate: ${guarded}`);
});

test('ostacoli: ogni fila lascia un varco, file e porte non arrivano mai insieme; si inciampa solo sulla propria corsia', () => {
  for (let level = 3; level <= 20; level++) {
    const c = S.config(level);
    for (let k = 0; k < 10; k++) {
      const s = S.newLevel(level, HH.rng(level * 97 + k));
      const rows = new Map();
      for (const o of s.script.filter((e) => e.k === 'o' && !e.guard)) {
        const ta = +(o.t + (S.Z_FAR - S.LINE_Z) / (c.speed * S.OBST[o.kind].v)).toFixed(3);
        if (!rows.has(ta)) rows.set(ta, []);
        rows.get(ta).push(o);
      }
      const times = [...rows.keys()].sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 1.4, `livello ${level}: due file troppo vicine`);
      for (const row of rows.values()) {
        let gap = false;
        for (let x = -S.X_MAX; x <= S.X_MAX && !gap; x += 0.01) gap = row.every((o) => Math.abs(o.x - x) >= S.OBST[o.kind].r + S.HARI_R + 0.05);
        assert.ok(gap, `livello ${level}: fila di ostacoli senza varco`);
      }
    }
  }
  // inciampo: −1 cuore solo se Hari è nella corsia dell'ostacolo
  for (const [x, hit] of [[0.5, true], [-0.5, false]]) {
    const s = fresh(5, 3);
    s.script = []; s.px = x; s.tx = x;
    s.obst = [{ id: 1, kind: 'hay', x: 0.45, z: 2 }];
    const ev = [];
    for (let i = 0; i < 60; i++) ev.push(...S.step(s, DT, { x }));
    assert.equal(ev.some((e) => e.type === 'snatch' && e.what === 'bump'), hit);
    assert.equal(ev.some((e) => e.type === 'pass'), !hit);
  }
});

test('porte che si scambiano (mai più vicine di SWAP_STOP) e porte regalo', () => {
  let swaps = 0, gifts = 0;
  for (let level = 1; level <= 20; level++) {
    for (let k = 0; k < 10; k++) {
      const s = S.newLevel(level, HH.rng(level * 13 + k));
      for (const g of s.script.filter((e) => e.k === 'g')) {
        if (g.sw) { swaps++; assert.ok(level >= 6 && g.l && g.r); }
        if (g.gift) { gifts++; assert.ok(level >= 5 && !goodOp(g[g.gift.side]) && S.PUS.includes(g.gift.pu)); }
      }
    }
  }
  assert.ok(swaps > 20 && gifts > 20, `${swaps} scambi, ${gifts} regali`);
  // lo scambio
  const s = fresh(8, 1);
  s.script = []; s.px = 0.5; s.tx = 0.5;
  s.gates = [{ id: 1, z: 14, l: 'x2', r: '-1', sw: 1, swT: 1, gift: { side: 'r', pu: 'shield' } }];
  const ev = [];
  let lastSwapZ = 99;
  for (let i = 0; i < 60 * 5 && s.gates.length; i++) for (const e of S.step(s, DT, { x: 0.5 })) { ev.push(e); if (e.type === 'swap') lastSwapZ = s.gates[0].z; }
  const sw = ev.filter((e) => e.type === 'swap').length;
  assert.ok(sw >= 1 && lastSwapZ >= S.SWAP_STOP - 0.1, `ultimo scambio a ${lastSwapZ}`);
  const ge = ev.find((e) => e.type === 'gate');
  // dopo un numero dispari di scambi a destra c'è ×2, con un numero pari −1 e il regalo
  if (sw % 2) { assert.equal(ge.op, 'x2'); assert.equal(s.shield, 0); } else { assert.equal(ge.op, '-1'); assert.equal(ge.gift, 'shield'); assert.equal(s.shield, 1); }
});

test('power-up: raffica, merenda doppia, calamita, cestino-scudo', () => {
  const pick = (pu) => {
    const s = fresh(9, 2);
    s.script = []; s.px = 0.3; s.tx = 0.3;
    s.pus = [{ id: 1, pu, x: 0.35, z: 1 }];
    const ev = [];
    for (let i = 0; i < 30; i++) ev.push(...S.step(s, DT, { x: 0.3 }));
    assert.ok(ev.some((e) => e.type === 'pu' && e.pu === pu), pu);
    return { s, ev };
  };
  // raffica: il doppio dei lanci
  { const { s } = pick('rapid'); let n = 0; for (let i = 0; i < 120; i++) n += S.step(s, DT, { x: 0.3 }).filter((e) => e.type === 'toss').length; assert.ok(n >= 12, `${n} lanci in 2 s`); }
  // doppia: ogni merenda vale due bocconi
  { const { s } = pick('double'); s.power = 1; s.animals = [{ id: 9, kind: 'piggy', x: 0.3, z: 6, left: 4, max: 4, vx: 0 }];
    const ev = []; for (let i = 0; i < 60; i++) ev.push(...S.step(s, DT, { x: 0.3 }));
    assert.deepEqual(ev.filter((e) => e.type === 'nibble').map((e) => e.left).slice(0, 1), [2]); }
  // calamita: una merenda dritta raggiunge un animale spostato di lato
  { const { s } = pick('magnet'); s.power = 1; s.animals = [{ id: 9, kind: 'chick', x: -0.2, z: 14, left: 1, max: 1, vx: 0 }];
    const ev = []; for (let i = 0; i < 60; i++) ev.push(...S.step(s, DT, { x: 0.3 }));
    assert.ok(ev.some((e) => e.type === 'full' && e.id === 9 && e.by === 'snack'), 'calamita'); }
  // scudo: para un furto senza perdere cuori
  { const { s } = pick('shield'); assert.equal(s.shield, 1);
    s.animals = [{ id: 9, kind: 'chick', x: -0.7, z: 0.6, left: 1, max: 1, vx: 0 }];
    const ev = []; for (let i = 0; i < 30; i++) ev.push(...S.step(s, DT, { x: 0.3 }));
    assert.ok(ev.some((e) => e.type === 'shield')); assert.equal(s.oops, 0); assert.equal(s.shield, 0); }
  // un power-up lontano da Hari si perde
  { const s = fresh(9, 2); s.script = []; s.px = -0.6; s.tx = -0.6; s.pus = [{ id: 1, pu: 'rapid', x: 0.6, z: 1 }];
    const ev = []; for (let i = 0; i < 30; i++) ev.push(...S.step(s, DT, { x: -0.6 }));
    assert.ok(ev.some((e) => e.type === 'puMiss') && !s.fx.rapid); }
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
  for (let i = 1; i < fed.length; i++) assert.ok(fed[i] > fed[i - 1], 'la pancia si riempie e basta');
  if (S.isWon(s)) assert.equal(s.bossFed, s.bossMax);
  // rotazione degli animaloni
  assert.deepEqual([1, 2, 3, 4, 5, 9, 11].map((l) => S.config(l).boss.kind), ['squirrel', 'kitty', 'owl', 'polar', 'squirrel', 'panda', 'hippo']);
  for (let l = 1; l <= 40; l++) { const b = S.config(l).boss; assert.ok(!b.from || l >= b.from, `${b.kind} al livello ${l}`); }
});

// prepara l'animalone fermo davanti a Hari, in una certa fase della pancia, senza soffi né amici
function bossAt(level, ph, seed = 1) {
  const s = fresh(level, seed);
  s.script = []; s.si = 0; s.call = 0;
  for (let i = 0; i < 3; i++) S.step(s, DT, { x: 0 });
  const b = s.boss;
  b.enter = false; b.z = S.BOSS_Z; b.x = 0; b.vx = 0;
  b.fed = s.bossFed = Math.ceil(b.max * [0, 0.5, 0.8][ph]); b.ph = ph; b.ai = 0; b.atkT = 0;
  s.power = s.gp;
  return s;
}

test('grandi merende: ogni raffica di ogni animalone si rimanda indietro col potere atteso (bot che reagisce ogni 0,3 s)', () => {
  for (let level = 1; level <= 20; level++) {
    for (let ph = 0; ph < 3; ph++) {
      const s = bossAt(level, ph, level * 5 + ph);
      const n = S.volleyOf(s.bossKind, ph).length;
      let target = 0, next = 0;
      const ev = [];
      for (let i = 0; i < 60 * 8; i++) {
        if (i >= next) {
          next = i + 18;
          const q = s.balls.filter((x) => !x.back).sort((x, y) => x.z - y.z)[0];
          if (q) target = Math.max(-0.82, Math.min(0.82, q.x + q.vx * 0.15));
        }
        ev.push(...S.step(s, DT, { x: target }));
        s.drops = [];                              // qui contano solo le grandi merende
        if (S.isOver(s)) break;
        if (ev.some((e) => e.type === 'ball') && !s.balls.length && !s.boss.q.length) break;   // raffica finita
      }
      const spawned = ev.filter((e) => e.type === 'ball').reduce((t, e) => t + e.n, 0);
      if (!S.isWon(s)) assert.equal(spawned, n, `livello ${level} fase ${ph}: ${spawned}/${n} lanciate`);
      assert.ok(!ev.some((e) => e.type === 'snatch'), `livello ${level} ${s.bossKind} fase ${ph}: "Bup!" con il potere atteso ${s.gp}`);
      // le raffiche "a muro" chiedono di rimandarne almeno una, le altre si rimandano tutte
      assert.ok(s.sent >= 1, `livello ${level} fase ${ph}: nessuna rimandata`);
      assert.ok(ev.some((e) => e.type === 'backFeed' && e.bonus > 0) || S.isWon(s));
    }
  }
});

test('grandi merende: i muri coprono tutto il sentiero, le altre si possono anche schivare; una rimandata sfama, una presa fa "Bup!"', () => {
  for (const kind of Object.keys(S.VOLLEYS)) {
    for (let ph = 0; ph < 3; ph++) {
      const v = S.volleyOf(kind, ph).filter((sp) => !sp.d && !sp.aim && !sp.bx);
      if (v.length < 2 && !(v[0] && v[0].r >= 0.85)) continue;
      // muro: nessuna posizione di Hari è libera
      for (let x = -S.X_MAX; x <= S.X_MAX; x += 0.01) assert.ok(S.covers(v, x), `${kind} fase ${ph}: varco a ${x.toFixed(2)}`);
    }
  }
  // presa in pieno: −1 cuore e la merenda grande sparisce
  const s = bossAt(4, 0);
  s.power = 1;
  const ev = [];
  for (let i = 0; i < 60 * 6 && !s.oops; i++) ev.push(...S.step(s, DT, { x: 0 }));
  const sn = ev.find((e) => e.type === 'snatch');
  assert.ok(sn && sn.what === 'bup' && s.oops === 1, 'Bup!');
  // rimandata: la pancia fa un salto
  const r = bossAt(4, 0), before = r.bossFed;
  const ev2 = [];
  for (let i = 0; i < 60 * 6 && !ev2.some((e) => e.type === 'backFeed'); i++) ev2.push(...S.step(r, DT, { x: 0 }));
  const bf = ev2.find((e) => e.type === 'backFeed');
  assert.ok(bf && bf.fed >= before + bf.bonus && bf.bonus >= 10, 'sfamato dalla merenda rimandata');
  assert.ok(ev2.some((e) => e.type === 'hit') && ev2.some((e) => e.type === 'sent'));
});

test('fasi dell’animalone, novità con cartello (una volta sola, al livello giusto) e salvataggi v1', () => {
  const s = bossAt(6, 0);
  s.boss.fed = s.bossFed = Math.ceil(s.bossMax * 0.55);
  const ev = [];
  for (let i = 0; i < 5; i++) ev.push(...S.step(s, DT, { x: 0 }));
  assert.ok(ev.some((e) => e.type === 'phase' && e.n === 1));
  for (let level = 1; level <= 12; level++) {
    const g = fresh(level, level);
    const evs = play(g, { seed: level });
    const seen = evs.filter((e) => e.type === 'new').map((e) => e.what);
    assert.equal(new Set(seen).size, seen.length, `livello ${level}: cartello ripetuto`);
    for (const w of seen) if (S.NEWS[w]) assert.equal(S.NEWS[w], level, `${w} al livello ${level}`);
    if (level <= 4) assert.ok(seen.includes('back'), `livello ${level}: spiegazione della grande merenda`);
  }
  // un salvataggio della versione 1 (senza ostacoli né grandi merende) si riprende e si finisce
  const old = fresh(3, 9);
  play(old, { seed: 1, limit: 30 });
  const v1 = JSON.parse(JSON.stringify(old));
  for (const k of ['obst', 'pus', 'balls', 'fx', 'shield', 'news', 'ball', 'season', 'gp', 'ballK', 'sent']) delete v1[k];
  v1.v = 1; v1.bossKind = 'polar'; v1.drop = 'bubble';
  const m = S.migrate(v1);
  assert.equal(m.v, 2);
  assert.equal(m.bossKind, 'polar');
  assert.ok(Array.isArray(m.obst) && Array.isArray(m.balls) && m.gp >= 1);
  play(m, { seed: 2 });
  assert.ok(S.isOver(m));
  const vb = fresh(2, 3); vb.script = []; for (let i = 0; i < 400; i++) S.step(vb, DT, { x: 0 });
  const vb1 = JSON.parse(JSON.stringify(vb)); vb1.v = 1; vb1.boss.blowT = 1; delete vb1.boss.atkT; delete vb1.boss.q; delete vb1.boss.ph; delete vb1.boss.ai;
  const mb = S.migrate(vb1);
  assert.ok(mb.boss.atkT === 1 && Array.isArray(mb.boss.q) && mb.boss.ph === 0);
  S.step(mb, DT, { x: 0 });
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
    for (const k of ['waves', 'speed', 'pressure', 'maxCount', 'needMul', 'gates', 'bossNeed', 'bossV', 'blowN', 'powerMax', 'tier', 'guard', 'obst', 'puChance', 'gift', 'swap', 'ballK', 'shapes']) assert.ok(b[k] >= a[k], `${k} cala al livello ${level + 1}`);
    assert.ok(b.waveGap <= a.waveGap && b.blowIv <= a.blowIv && b.guardGap <= a.guardGap);
    assert.ok(b.obstKinds.length >= a.obstKinds.length && b.pus.length >= a.pus.length);
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
