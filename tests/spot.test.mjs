import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/spot-logic.js');
const S = HH.spot;
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const SEEDS = 12;
const each = (fn) => { for (const L of LEVELS) for (let k = 0; k < SEEDS; k++) fn(S.generate(L, HH.rng(L * 7919 + k * 31 + 1)), L, k); };

/* ---------- oracolo indipendente ----------
 * Confronta le due liste di oggetti per id e ricava da sé le differenze (non usa l'elenco del generatore):
 *   solo in A → remove · solo in B → add · stessi campi tranne… c/c2/c3 → color, s → size, f → flip, x/y → move,
 *   r → tilt, v → detail. Ogni oggetto cambiato deve cambiare in un solo modo. */
function oracle(pz) {
  const A = new Map(pz.a.map((o) => [o.id, o])), B = new Map(pz.b.map((o) => [o.id, o]));
  const out = [];
  for (const [id, o] of A) {
    const q = B.get(id);
    if (!q) { out.push({ id, kind: 'remove', objs: [o] }); continue; }
    const k = [];
    if (o.t !== q.t) k.push('type');
    if (['c', 'c2', 'c3'].some((f) => o[f] !== q[f])) k.push('color');
    if (o.s !== q.s) k.push('size');
    if (o.f !== q.f) k.push('flip');
    if (o.x !== q.x || o.y !== q.y) k.push('move');
    if (o.r !== q.r) k.push('tilt');
    if (JSON.stringify(o.v) !== JSON.stringify(q.v)) k.push('detail');
    if (k.length) out.push({ id, kind: k.length === 1 ? k[0] : k.join('+'), objs: [o, q] });
  }
  for (const [id, q] of B) if (!A.has(id)) out.push({ id, kind: 'add', objs: [q] });
  return out;
}
// riquadro dell'oggetto calcolato qui dalle misure dei tipi (appoggio in basso al centro)
const box = (o) => { const t = S.TYPES[o.t]; return [o.x - t.w * o.s / 2, o.y - t.h * o.s, o.x + t.w * o.s / 2, o.y]; };
const distToBox = (x, y, b) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3]));
const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
// copertura del riquadro da parte degli oggetti disegnati dopo (strato, poi y, poi id)
function coverage(objs, o) {
  const later = (q) => S.TYPES[q.t].L > S.TYPES[o.t].L || (S.TYPES[q.t].L === S.TYPES[o.t].L && (q.y > o.y || (q.y === o.y && q.id > o.id)));
  const b = box(o), a = (b[2] - b[0]) * (b[3] - b[1]);
  return objs.filter((q) => q !== o && later(q)).reduce((s, q) => s + inter(b, box(q)), 0) / a;
}

/* colori veri dal CSS (tema chiaro e scuro) → distanza CIELAB */
const css = fs.readFileSync(path.join(root, 'src/games/spot.css'), 'utf8');
function palette(block) { const p = {}; for (const m of block.matchAll(/--sd-c-(\w+):\s*(#[0-9a-f]{6})/gi)) p[m[1]] = m[2]; return p; }
const light = palette(css.slice(0, css.indexOf('@media')));
const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"]'));
const dark = Object.assign({}, light, palette(darkBlock.slice(0, darkBlock.indexOf('}'))));
function lab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const dE = (pal, a, b) => { const p = lab(pal[a]), q = lab(pal[b]); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

test('tavolozza: ogni colore usato dai tipi esiste nel CSS e la tabella LAB della logica è fedele', () => {
  const used = new Set(Object.values(S.TYPES).flatMap((t) => [...(t.col || []), ...(t.col2 || []), ...(t.col3 || [])]));
  for (const k of used) { assert.ok(light[k], `--sd-c-${k} manca`); assert.ok(S.LAB[k], `LAB.${k} manca`); }
  for (const k of Object.keys(S.LAB)) {
    const d = lab(light[k]).map((v, i) => Math.abs(v - S.LAB[k][i]));
    assert.ok(Math.max(...d) <= 1.5, `LAB.${k} non corrisponde a ${light[k]}`);
  }
  assert.match(css, /--tint-spot:/);
  assert.equal((css.match(/--tint-spot:/g) || []).length, 3, '--tint-spot in tema chiaro e nei due blocchi scuri');
});

test('ogni livello ha esattamente N differenze, ritrovate identiche dall\'oracolo', () => {
  each((pz, L) => {
    const P = S.paramsFor(L);
    assert.equal(pz.diffs.length, P.n, `L${L}`);
    const o = oracle(pz);
    assert.equal(o.length, P.n, `L${L}: l'oracolo trova ${o.length} differenze (${o.map((x) => x.kind).join(',')})`);
    const fromGen = pz.diffs.map((d) => `${d.id}:${d.kind}`).sort();
    assert.deepEqual(o.map((d) => `${d.id}:${d.kind}`).sort(), fromGen, `L${L}`);
    assert.equal(new Set(pz.diffs.map((d) => d.id)).size, P.n, 'oggetti distinti');
    assert.ok(P.kinds.length && pz.diffs.every((d) => P.kinds.includes(d.kind)), 'tipi ammessi dal livello');
  });
});

test('zone: non sovrapposte, dentro la scena, abbastanza grandi per un dito, sopra l\'oggetto cambiato', () => {
  each((pz, L) => {
    const o = new Map(oracle(pz).map((d) => [d.id, d]));
    pz.diffs.forEach((d, i) => {
      const z = d.zone;
      assert.ok(z.r >= 30, `L${L}: raggio ${z.r}`);
      assert.ok(z.x >= 0 && z.x <= 400 && z.y >= 0 && z.y <= 280, 'centro dentro la scena');
      for (const ob of o.get(d.id).objs) {
        const b = box(ob);
        // spostato: toccare l'oggetto al centro, nella posizione vecchia o nuova, deve contare
        if (d.kind === 'move') assert.ok(Math.hypot((b[0] + b[2]) / 2 - z.x, (b[1] + b[3]) / 2 - z.y) < z.r, `L${L}: move non coperto`);
        else assert.ok(distToBox(z.x, z.y, b) <= z.r * 0.5, `L${L}: zona ${d.kind} lontana dall'oggetto ${ob.t}`);
      }
      pz.diffs.forEach((e, j) => { if (j > i) assert.ok(Math.hypot(z.x - e.zone.x, z.y - e.zone.y) >= z.r + e.zone.r, `L${L}: zone ${i} e ${j} si toccano`); });
    });
  });
});

test('visibilità: area cambiata sopra soglia, colori lontani (CSS chiaro e scuro), oggetti non nascosti', () => {
  each((pz, L) => {
    const P = S.paramsFor(L);
    const o = new Map(oracle(pz).map((d) => [d.id, d]));
    for (const d of pz.diffs) {
      assert.ok(d.area >= 300 && d.area >= P.minArea, `L${L}: area ${d.area}`);
      if (L <= 2) assert.ok(d.area >= 1100, `L${L}: differenza troppo piccola per i primi livelli (${d.area})`);
      const [a, b] = o.get(d.id).objs;
      if (d.kind === 'color') {
        const f = ['c', 'c2', 'c3'].find((k) => a[k] !== b[k]);
        for (const pal of [light, dark]) assert.ok(dE(pal, a[f], b[f]) >= (L <= 3 ? 40 : 22), `L${L}: ${a[f]}→${b[f]} troppo simili`);
      }
      // oggetto intero in gioco: poco coperto da ciò che sta davanti, in A e in B
      if (['remove', 'size', 'flip', 'move', 'tilt'].includes(d.kind)) assert.ok(coverage(pz.a, a) <= 0.3, `L${L}: ${a.t} coperto`);
      if (d.kind === 'add') assert.ok(pz.b.every((q) => q === a || inter(box(a), box(q)) === 0), `L${L}: oggetto aggiunto sopra un altro`);
    }
    // Hari c'è sempre (in tutte e due) e non è mai una differenza
    const hA = pz.a.filter((x) => x.t === 'hari'), hB = pz.b.filter((x) => x.t === 'hari');
    assert.equal(hA.length, 1); assert.deepEqual(hA, hB);
  });
});

test('tocchi: dentro la hitbox contano (una volta), fuori no', () => {
  each((pz, L, k) => {
    if (k > 3) return;
    const s = { v: 1, level: L, seed: 0, n: pz.n, found: [], hints: 0, hinted: [], misses: 0, moves: 0 };
    pz.diffs.forEach((d, i) => {
      for (let a = 0; a < 8; a++) {
        const x = d.zone.x + Math.cos(a) * d.zone.r * 0.9, y = d.zone.y + Math.sin(a) * d.zone.r * 0.9;
        assert.equal(S.hitTest(pz, x, y), i);
      }
    });
    let misses = 0;
    for (let y = 2; y < 280; y += 14) for (let x = 2; x < 400; x += 14) {
      if (pz.diffs.every((d) => Math.hypot(x - d.zone.x, y - d.zone.y) > d.zone.r + 0.5)) {
        assert.equal(S.hitTest(pz, x, y), -1);
        if (misses < 4) { assert.equal(S.tap(s, pz, x, y).hit, -1); misses++; }
      }
    }
    assert.equal(s.misses, misses);
    pz.diffs.forEach((d, i) => {
      const r = S.tap(s, pz, d.zone.x, d.zone.y);
      assert.equal(r.hit, i);
      assert.equal(!!r.solved, i === pz.n - 1);
      assert.ok(S.tap(s, pz, d.zone.x, d.zone.y).again, 'già trovata');
    });
    assert.equal(s.found.length, pz.n);
    assert.equal(S.progress(s), 1);
  });
});

test('determinismo e varietà', () => {
  for (const L of [1, 2, 7, 15]) {
    assert.deepEqual(S.generate(L, HH.rng(99)), S.generate(L, HH.rng(99)));
    const sigs = new Set(Array.from({ length: 10 }, (_, k) => JSON.stringify(S.generate(L, HH.rng(1000 + k)).a)));
    assert.ok(sigs.size >= 9, `L${L}: scene ripetute`);
  }
  // città e foresta si alternano, livello 1 in città, di giorno
  assert.equal(S.generate(1, HH.rng(5)).theme, 'city');
  assert.equal(S.generate(2, HH.rng(5)).theme, 'forest');
  assert.equal(S.generate(1, HH.rng(5)).time, 'day');
});

test('ripresa da JSON: stessa scena, stesse differenze trovate', () => {
  const s = S.newGame(6, 123456);
  const pz = S.puzzleOf(s);
  S.tap(s, pz, pz.diffs[2].zone.x, pz.diffs[2].zone.y);
  S.tap(s, pz, 1, 1);
  S.hint(s, pz);
  const back = S.restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  assert.deepEqual(S.puzzleOf(back), pz);
  assert.equal(S.restore({ v: 9 }), null);
  assert.equal(S.restore(null), null);
  // indici fuori scala ignorati
  assert.deepEqual(S.restore(Object.assign({}, s, { found: [0, 0, 99, -1] })).found, [0]);
});

test('difficoltà monotona (≥ 4 gradini) e livello 1 facilissimo', () => {
  let prev = null;
  const steps = new Set();
  for (let L = 1; L <= 40; L++) {
    const P = S.paramsFor(L);
    steps.add(P.n);
    if (prev) {
      assert.ok(P.n >= prev.n && P.d >= prev.d && P.minArea <= prev.minArea && P.minDE <= prev.minDE && P.sizeK <= prev.sizeK, `L${L}`);
      assert.ok(prev.kinds.every((k) => P.kinds.includes(k)));
    }
    prev = P;
  }
  assert.ok(steps.size >= 4);
  assert.equal(S.paramsFor(1).n, 3);
  assert.ok(S.paramsFor(20).n >= 7 && S.paramsFor(20).n <= 10);
  // la scena si riempie: più oggetti in media ai livelli alti
  const avg = (L) => Array.from({ length: 20 }, (_, k) => S.generate(L, HH.rng(k + 7)).a.length).reduce((a, b) => a + b) / 20;
  assert.ok(avg(19) > avg(1) + 6 && avg(20) > avg(2) + 4);
});

test('fragoline, tempo di riferimento, lente', () => {
  const s = S.newGame(2, 42), pz = S.puzzleOf(s);
  for (let k = 0; k < 9; k++) S.tap(s, pz, -50, -50);
  assert.equal(S.rate(s), 3, 'nei primi livelli i tocchi sbagliati non costano');
  assert.equal(S.parTime(s), 20 + 12 * s.n);
  const t = S.newGame(8, 42), pt = S.puzzleOf(t);
  const par0 = S.parTime(t);
  for (let k = 0; k < 3; k++) S.tap(t, pt, -50, -50);
  assert.equal(S.rate(t), 2);
  assert.equal(S.parTime(t), par0 - 12);
  const max = S.hintsFor(t.n);
  const shown = [];
  for (let k = 0; k < max; k++) shown.push(S.hint(t, pt));
  assert.equal(S.hint(t, pt), -1, 'lente finita');
  assert.equal(new Set(shown).size, max, 'indica differenze diverse');
  assert.equal(S.rate(t), 1);
});

test('generazione veloce', () => {
  for (const L of [1, 5, 10, 20]) {
    const t = performance.now();
    for (let k = 0; k < 30; k++) S.generate(L, HH.rng(k * 13 + L));
    const ms = (performance.now() - t) / 30;
    assert.ok(ms < 10 * SLOW, `L${L}: ${ms.toFixed(1)} ms`);
  }
});
