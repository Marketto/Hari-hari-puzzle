// Unit test Hari Memory: ogni mazzo ha esattamente coppie valide (verificate con un elenco indipendente delle
// coppie a tema e contando i soggetti), determinismo, regole di flip/coppia/errore e della variante "swap",
// bot con memoria perfetta e bot smemorato (oracoli scritti qui, senza usare funzioni di gioco per decidere),
// difficoltà monotona, ripresa da JSON, disegni presenti per tutti i soggetti e colori solo da token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/memory-logic.js', 'src/games/memory-art.js');
const M = HH.memory;
const LEVELS = Array.from({ length: 16 }, (_, i) => i + 1);

/* ---------- oracolo: coppie a tema ammesse (animale → cibo o casa) ---------- */
const PAIRS_OK = {
  squirrel: 'acorn', hari: 'apple', rabbit: 'carrot', bee: 'flower', bear: 'honey', fox: 'grapes', frog: 'lilypad', snail: 'strawberry',
  mouse: 'sunseed', bird: 'nest', owl: 'moon', deer: 'clover', beaver: 'log', raccoon: 'blueberry', badger: 'porcini', caterpillar: 'maple',
  boar: 'chestnut', ladybug: 'oakleaf',
};
const ANIMALS = new Set(Object.keys(PAIRS_OK));

/* ---------- oracolo: bot ----------
 * forget = probabilità che ogni carta ricordata venga dimenticata a ogni mossa (0 = memoria perfetta).
 * Usa solo flip/settle e legge le carte girate come farebbe un giocatore (deck[i] di una carta girata). */
function play(s, rnd, forget = 0) {
  const mem = new Map();                       // posizione → soggetto visto
  const same = (x, y) => (s.mode === 'themed' ? PAIRS_OK[x] === y || PAIRS_OK[y] === x : x === y);
  const hidden = () => s.deck.map((_, i) => i).filter((i) => !s.found[i]);
  const knownPartner = (i) => { for (const [p, v] of mem) if (p !== i && !s.found[p] && same(v, s.deck[i])) return p; return -1; };
  let guard = 0;
  while (!M.isSolved(s)) {
    assert.ok(guard++ < 2000, 'il bot non finisce');
    if (forget) for (const p of [...mem.keys()]) if (rnd() < forget) mem.delete(p);
    let a = -1, b = -1;
    for (const [p, v] of mem) { if (s.found[p]) continue; const q = [...mem].find(([p2, v2]) => p2 !== p && !s.found[p2] && same(v, v2)); if (q) { a = p; b = q[0]; break; } }
    if (a < 0) {
      const unk = hidden().filter((i) => !mem.has(i));
      a = unk.length ? unk[Math.floor(rnd() * unk.length)] : hidden()[0];
      assert.equal(M.flip(s, a).type, 'first');
      mem.set(a, s.deck[a]);
      b = knownPartner(a);
      if (b < 0) { const u2 = hidden().filter((i) => i !== a && !mem.has(i)); b = u2.length ? u2[Math.floor(rnd() * u2.length)] : hidden().find((i) => i !== a); }
    } else assert.equal(M.flip(s, a).type, 'first');
    const r = M.flip(s, b);
    assert.ok(r.type === 'match' || r.type === 'miss');
    assert.equal(r.type === 'match', same(s.deck[a], s.deck[b]), 'coppia riconosciuta solo se i soggetti vanno insieme');
    mem.set(b, s.deck[b]);
    const st = M.settle(s);
    if (st.swap) { const [x, y] = st.swap; const vx = mem.get(x), vy = mem.get(y); mem.delete(x); mem.delete(y); if (vx) mem.set(y, vx); if (vy) mem.set(x, vy); }
  }
  return s.moves;
}

test('mazzi: dimensioni, esattamente coppie valide, soggetti distinti', () => {
  for (const level of LEVELS) {
    for (let k = 0; k < 30; k++) {
      const s = M.newGame(level, level * 977 + k);
      const N = s.cols * s.rows;
      assert.equal(s.deck.length, N);
      assert.equal(s.pairs, N / 2);
      assert.ok(s.cols <= 6 && s.rows <= 6);
      const byKey = {};
      s.key.forEach((kk, i) => (byKey[kk] = byKey[kk] || []).push(s.deck[i]));
      assert.equal(Object.keys(byKey).length, N / 2, 'numero di coppie');
      const subjects = new Set();
      for (const pair of Object.values(byKey)) {
        assert.equal(pair.length, 2, 'ogni coppia ha due carte');
        if (s.mode === 'themed') {
          const [x, y] = pair;
          assert.ok(PAIRS_OK[x] === y || PAIRS_OK[y] === x, `coppia a tema non ammessa: ${x} + ${y}`);
        } else {
          assert.equal(pair[0], pair[1], 'coppia di soggetti uguali');
          assert.ok(!PAIRS_OK[pair[0]] || ANIMALS.has(pair[0]));
        }
        pair.forEach((x) => subjects.add(x));
      }
      // soggetti tutti distinti tra le coppie (nessuna carta ha tre compagne possibili)
      assert.equal(subjects.size, s.mode === 'themed' ? N : N / 2);
      // livelli "mixed": al massimo un oggetto per famiglia (si distinguono bene)
      if (s.mode === 'mixed') {
        const fams = [...subjects].map((x) => M.FAM_OF[x]).filter((f) => f !== 'animal');
        assert.equal(new Set(fams).size, fams.length, `livello ${level}: due oggetti della stessa famiglia`);
      }
      // livelli "similar": almeno `sim` famiglie intere di soggetti simili
      if (s.mode === 'similar') {
        const full = M.SIM.filter((f) => M.FAMILIES[f].every((x) => subjects.has(x)));
        assert.ok(full.length >= s.sim, `livello ${level}: famiglie simili ${full.length} < ${s.sim}`);
      }
      assert.ok(!M.isSolved(s) && s.moves === 0 && s.up.length === 0);
    }
  }
});

test('determinismo: stesso livello e seme → stesso mazzo', () => {
  for (const level of LEVELS) {
    assert.deepEqual(M.newGame(level, 1234), M.newGame(level, 1234));
    const a = JSON.stringify(M.newGame(level, 1).deck), b = JSON.stringify(M.newGame(level, 2).deck);
    assert.notEqual(a, b);
  }
  assert.deepEqual(M.generate(5, HH.rng(9)), M.generate(5, HH.rng(9)));
});

test('regole: prima carta, coppia, errore, carte non valide, rimettere giù', () => {
  const s = M.newGame(2, 42);
  const i = 0, j = s.key.findIndex((k, x) => x !== i && k === s.key[i]), w = s.key.findIndex((k) => k !== s.key[i]);
  assert.equal(M.flip(s, i).type, 'first');
  assert.equal(M.flip(s, i).type, 'invalid', 'la stessa carta due volte');
  assert.equal(s.moves, 0);
  const r = M.flip(s, j);
  assert.equal(r.type, 'match');
  assert.equal(s.moves, 1);
  assert.ok(s.found[i] && s.found[j] && s.up.length === 0);
  assert.equal(M.flip(s, j).type, 'invalid', 'carta già trovata');
  // errore: restano girate finché non si rimettono giù; una terza carta non si gira
  const a = s.found.findIndex((f) => !f), b = s.key.findIndex((k, x) => !s.found[x] && x !== a && k !== s.key[a]);
  M.flip(s, a);
  const m = M.flip(s, b);
  assert.equal(m.type, 'miss');
  assert.equal(m.slip, false, 'la compagna non era mai stata vista');
  assert.ok(M.pending(s));
  assert.equal(M.flip(s, w === a || w === b ? s.found.findIndex((f, x) => !f && x !== a && x !== b) : w).type, 'invalid');
  assert.deepEqual(M.settle(s), { swap: null }, 'niente spostamenti fuori dalla variante swap');
  assert.ok(!M.pending(s) && s.up.length === 0);
  assert.equal(s.moves, 2);
  assert.equal(s.misses, 1);
  assert.equal(M.flip(s, -1).type, 'invalid');
  assert.equal(M.flip(s, 999).type, 'invalid');
});

test('errore "da distrazione": solo se la compagna era già stata vista', () => {
  const s = M.newGame(1, 7);
  const a = 0, a2 = s.key.findIndex((k, x) => x !== a && k === s.key[a]);
  const others = s.deck.map((_, x) => x).filter((x) => x !== a && x !== a2);
  M.flip(s, a); M.flip(s, others[0]); M.settle(s);       // vista la carta a
  M.flip(s, a2);
  const r = M.flip(s, others[1]);                           // la compagna di a2 (a) era già nota
  assert.equal(r.type, 'miss');
  assert.equal(r.slip, true);
  assert.equal(s.slips, 1);
});

test('variante swap: dopo un errore una delle due carte scambia posto con una vicina coperta', () => {
  let swaps = 0;
  for (let k = 0; k < 40; k++) {
    const s = M.newGame(7, 300 + k);
    assert.ok(s.swap);
    const a = 0, b = s.key.findIndex((kk) => kk !== s.key[0]);
    const before = s.deck.slice(), keys = s.key.slice();
    M.flip(s, a); M.flip(s, b);
    const r = M.settle(s);
    if (!r.swap) continue;
    swaps++;
    const [x, y] = r.swap;
    assert.ok(x === a || x === b, 'si sposta una delle due carte sbagliate');
    const dist = Math.abs((x % s.cols) - (y % s.cols)) + Math.abs(((x / s.cols) | 0) - ((y / s.cols) | 0));
    assert.equal(dist, 1, 'solo verso una carta vicina');
    assert.ok(!s.found[y]);
    assert.equal(s.deck[x], before[y]); assert.equal(s.deck[y], before[x]);
    assert.equal(s.key[x], keys[y]); assert.equal(s.key[y], keys[x]);
    assert.deepEqual([...s.deck].sort(), [...before].sort(), 'il mazzo resta lo stesso');
  }
  assert.ok(swaps >= 30, `spostamenti avvenuti: ${swaps}/40`);
});

test('bot che sa tutto: vince con il minimo teorico (una mossa per coppia) e 3 fragoline', () => {
  for (const level of LEVELS) {
    const s = M.newGame(level, level * 31);
    const done = new Set();
    for (let i = 0; i < s.deck.length; i++) {
      if (done.has(i)) continue;
      const j = s.key.findIndex((k, x) => x !== i && k === s.key[i]);
      M.flip(s, i);
      assert.equal(M.flip(s, j).type, 'match');
      done.add(i); done.add(j);
    }
    assert.ok(M.isSolved(s));
    assert.equal(s.moves, s.pairs);
    assert.equal(M.rate(s), 3);
    assert.equal(M.progress(s), 1);
  }
});

test('bot con memoria perfetta: vince sempre, ~1,6 mosse per coppia, quasi sempre 3 fragoline', () => {
  for (const level of LEVELS) {
    let tot = 0, three = 0;
    const T = 40;
    for (let k = 0; k < T; k++) {
      const s = M.newGame(level, level * 101 + k);
      const moves = play(s, HH.rng(k + 1), 0);
      assert.ok(moves >= s.pairs);
      tot += moves / s.pairs;
      if (M.rate(s) === 3) three++;
    }
    assert.ok(tot / T < 1.8, `livello ${level}: ${(tot / T).toFixed(2)} mosse a coppia`);
    assert.ok(three >= T * 0.9, `livello ${level}: 3 fragoline ${three}/${T}`);
  }
});

test('bot smemorato: finisce sempre (nessun limite) e nei primi livelli prende almeno 2 fragoline', () => {
  for (const level of [1, 2, 3]) {
    let ok2 = 0;
    const T = 60;
    for (let k = 0; k < T; k++) {
      const s = M.newGame(level, level * 53 + k);
      play(s, HH.rng(k + 99), 0.15);
      assert.ok(M.isSolved(s));
      if (M.rate(s) >= 2) ok2++;
    }
    assert.ok(ok2 >= T * 0.85, `livello ${level}: ≥2 fragoline ${ok2}/${T}`);
  }
  // molto smemorato, livello alto: vince comunque (al massimo 1 fragolina, mai sconfitta)
  const s = M.newGame(12, 5);
  play(s, HH.rng(5), 0.6);
  assert.ok(M.isSolved(s) && M.rate(s) >= 1);
});

test('difficoltà monotona con almeno 4 gradini', () => {
  let prev = null;
  const tiers = new Set();
  for (let level = 1; level <= 40; level++) {
    const t = M.tierFor(level);
    tiers.add(t.tier);
    if (prev) {
      assert.ok(t.pairs >= prev.pairs, `coppie al livello ${level}`);
      if (level <= 8) assert.ok(t.diff >= prev.diff, `difficoltà al livello ${level}`);
      else assert.ok(t.diff >= M.tierFor(7).diff, `livello ${level}: più facile del gradino 7`);
    }
    prev = t;
  }
  assert.ok(tiers.size >= 4);
  assert.equal(M.tierFor(1).pairs, 6);
  assert.equal(M.tierFor(1).cols * M.tierFor(1).rows, 12);
  assert.ok(M.tierFor(20).pairs >= 15 && M.tierFor(20).pairs <= 18);
  // le novità sono annunciate una volta sola
  assert.equal(M.tierFor(6).isNew, 'themed');
  assert.equal(M.tierFor(7).isNew, 'swap');
  for (const l of [1, 2, 3, 4, 5, 8, 9, 10]) assert.equal(M.tierFor(l).isNew, null);
});

test('ripresa da JSON: si continua identici', () => {
  for (const level of [2, 6, 7, 10]) {
    const a = M.newGame(level, 77);
    // qualche mossa a caso
    const r = HH.rng(3);
    for (let n = 0; n < 6; n++) {
      const h = a.deck.map((_, i) => i).filter((i) => !a.found[i]);
      M.flip(a, h[Math.floor(r() * h.length)]);
      const h2 = h.filter((i) => !a.up.includes(i) && !a.found[i]);
      if (h2.length) M.flip(a, h2[Math.floor(r() * h2.length)]);
      M.settle(a);
    }
    const b = JSON.parse(JSON.stringify(a));
    assert.ok(M.validate(b));
    assert.deepEqual(b, a);
    const ma = play(a, HH.rng(8)), mb = play(b, HH.rng(8));
    assert.equal(ma, mb);
    assert.deepEqual(a, b);
  }
  // salvataggio con due carte sbagliate ancora girate: valido
  const p = M.newGame(3, 1);
  const x = p.key.findIndex((k) => k !== p.key[0]);
  M.flip(p, 0); M.flip(p, x);
  assert.ok(M.validate(JSON.parse(JSON.stringify(p))));
  // salvataggi rotti
  const g = M.newGame(3, 1);
  assert.ok(!M.validate(null));
  assert.ok(!M.validate(Object.assign({}, g, { v: 2 })));
  assert.ok(!M.validate(Object.assign({}, g, { deck: g.deck.slice(1) })));
  assert.ok(!M.validate(Object.assign({}, g, { key: g.key.map(() => 0) })));
  assert.ok(!M.validate(Object.assign({}, g, { deck: g.deck.map((d, i) => (i ? d : 'dragon')) })));
  assert.ok(!M.validate(Object.assign({}, g, { up: [0, 1, 2] })));
});

test('stelle e progresso', () => {
  const s = M.newGame(1, 9);
  assert.equal(M.progress(s), 0);
  const t = M.thresholds(s);
  assert.ok(t.three >= s.pairs && t.two > t.three);
  s.moves = t.three; assert.equal(M.rate(s), 3);
  s.moves = t.three + 1; assert.equal(M.rate(s), 2);
  s.moves = t.two + 1; assert.equal(M.rate(s), 1);
  assert.ok(M.parTime(s) > 0);
});

test('tutti i soggetti hanno un disegno, solo con token --mm-* definiti nel CSS', () => {
  const A = HH.memoryArt;
  const css = fs.readFileSync(path.join(root, 'src/games/memory.css'), 'utf8');
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  assert.ok(M.SUBJECTS.length >= 30 + 10, `soggetti: ${M.SUBJECTS.length}`);
  assert.equal(new Set(M.SUBJECTS).size, M.SUBJECTS.length);
  const shapes = new Set();
  for (const id of [...M.SUBJECTS, '__back']) {
    const svg = id === '__back' ? A.back() : A.face(id);
    if (id !== '__back') assert.ok(A.IDS.includes(id), `manca il disegno di ${id}`);
    assert.match(svg, /<(path|circle|ellipse|rect)\b/, `${id}: disegno vuoto`);
    assert.doesNotMatch(svg, /(fill|stroke)="#|rgb\(|NaN|undefined/, `${id}: colore letterale o valore rotto`);
    for (const [, tok] of svg.matchAll(/var\(--(mm-[a-z0-9-]+)\)/g)) assert.ok(rootBlock.includes(`--${tok}:`), `${id}: token --${tok} non definito`);
    shapes.add(svg.replace(/mm-s-[a-z]+/, ''));
  }
  assert.equal(shapes.size, M.SUBJECTS.length + 1, 'due soggetti con lo stesso disegno');
  // coppie a tema della logica = oracolo
  assert.equal(M.THEMED.length, Object.keys(PAIRS_OK).length);
  M.THEMED.forEach(([a, f]) => assert.equal(PAIRS_OK[a], f));
  // token della card in entrambi i temi
  assert.equal((css.match(/--tint-memory:/g) || []).length, 3);
});

test('generazione veloce (< 10 ms anche per la griglia 6×6)', () => {
  for (const level of [1, 3, 5, 7, 8, 9, 10]) {
    const T = 200, t0 = performance.now();
    for (let k = 0; k < T; k++) M.newGame(level, k);
    const ms = (performance.now() - t0) / T;
    assert.ok(ms < 10 * SLOW, `livello ${level}: ${ms.toFixed(3)} ms`);
  }
});
