// Unit test Hari Colors: ogni round ha esattamente una risposta giusta (oracolo: si conta l'inchiostro qui, senza
// funzioni del gioco), nessun distrattore con l'inchiostro del bersaglio, regole delle parole (coerenti, Stroop con
// esca, miste), colori distinguibili e contrasto col campo in entrambi i temi (valori letti da colors.css),
// coppie che si confondono col daltonismo (simulazione Machado 2009) dichiarate ed evitate con pochi colori,
// determinismo, curva monotona, punteggio, stelle, ripresa da JSON, scelta della voce e chiavi i18n.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/colors-logic.js', 'src/i18n/locales.js');
const C = HH.colors;
const LEVELS = Array.from({ length: 24 }, (_, i) => i + 1);
const ALL = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'white', 'grey'];

/* ---------- palette dal CSS (tema chiaro e scuro) ---------- */
const css = fs.readFileSync(path.join(root, 'src/games/colors.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function vars(block) { const o = {}; for (const m of block.matchAll(/(--co-[\w-]+)\s*:\s*([^;]+);/g)) o[m[1]] = m[2].trim(); return o; }
const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const darkStart = css.indexOf(':root[data-theme="dark"]');
const darkBlock = css.slice(darkStart, css.indexOf('}', darkStart));
const mediaStart = css.indexOf('@media (prefers-color-scheme: dark)');
const mediaBlock = css.slice(mediaStart, css.indexOf('}', css.indexOf('{', css.indexOf('{', mediaStart) + 1)));
const THEMES = { light: vars(lightBlock), dark: { ...vars(lightBlock), ...vars(darkBlock) } };
function resolve(th, v) { let x = v; for (let g = 0; g < 5 && /^var\(/.test(x); g++) x = th[x.slice(4, -1).trim()]; return x; }
const hex = (h) => { assert.match(h, /^#[0-9a-f]{6}$/i, `colore ${h}`); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const SIM = {
  none: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
function oklab(h, m) {
  const v = hex(h).map(lin), M = SIM[m];
  const [r, g, b] = M.map((row) => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s];
}
const dE = (a, b, m) => { const x = oklab(a, m), y = oklab(b, m); return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

test('palette: 11 colori di base, token CSS in entrambi i temi, anche nella @media del tema scuro', () => {
  assert.deepEqual([...C.IDS].sort(), [...ALL].sort());
  assert.equal(new Set(C.COLORS.map((c) => c.sym)).size, C.COLORS.length, 'simboli diversi');
  for (const id of ALL) {
    for (const [name, th] of Object.entries(THEMES)) {
      hex(resolve(th, th[`--co-${id}`]));
      hex(resolve(th, th[`--co-${id}-on`]));
    }
  }
  // la @media del tema scuro e :root[data-theme="dark"] dichiarano gli stessi valori
  assert.deepEqual(vars(mediaBlock), vars(darkBlock));
});

test('contrasto: ogni colore si stacca dal campo (direttamente o con il bordo) e i dettagli dal colore, ≥ 3:1', () => {
  for (const [name, th] of Object.entries(THEMES)) {
    const field = resolve(th, th['--co-field']), edge = resolve(th, th['--co-edge']);
    assert.ok(contrast(edge, field) >= 4.5, `${name}: bordo/campo`);
    for (const id of ALL) {
      const ink = resolve(th, th[`--co-${id}`]), on = resolve(th, th[`--co-${id}-on`]);
      const direct = contrast(ink, field), viaEdge = contrast(ink, edge);
      assert.ok(direct >= 3 || viaEdge >= 3, `${name}.${id}: campo ${direct.toFixed(2)}, bordo ${viaEdge.toFixed(2)}`);
      assert.ok(contrast(ink, on) >= 3, `${name}.${id}: occhietti/simboli ${contrast(ink, on).toFixed(2)}`);
    }
    // fumetto neutro leggibile
    assert.ok(contrast(resolve(th, th['--co-bubble-ink']), resolve(th, th['--co-bubble'])) >= 7, `${name}: fumetto`);
  }
});

test('colori ben distinguibili (OKLab ≥ 15) e coppie vicine per il daltonismo tutte dichiarate in CLOSE', () => {
  for (const th of Object.values(THEMES)) {
    const ink = (id) => resolve(th, th[`--co-${id}`]);
    for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) {
      const a = ALL[i], b = ALL[j];
      assert.ok(dE(ink(a), ink(b), 'none') >= 15, `${a}/${b}: ${dE(ink(a), ink(b), 'none').toFixed(1)}`);
      const worst = Math.min(...['protan', 'deutan', 'tritan'].map((m) => dE(ink(a), ink(b), m)));
      if (worst < 12) assert.ok(C.isClose(a, b), `${a}/${b} si confondono col daltonismo (${worst.toFixed(1)}) ma non sono in CLOSE`);
    }
  }
});

/* ---------- oracolo dei round ---------- */
function checkRound(s, r) {
  const c = C.config(s.level);
  const n = c.mode === 'same' ? c.k : c.n;
  assert.equal(r.items.length, n, 'numero di oggetti');
  const inks = new Set(r.items.map((x) => x.ink));
  assert.equal(inks.size, c.k, 'colori diversi nel round');
  // esattamente una risposta giusta, nessun distrattore con l'inchiostro del bersaglio
  assert.equal(r.items.filter((x) => x.ink === r.target).length, 1, 'una sola risposta giusta');
  for (const it of r.items) {
    assert.ok(ALL.includes(it.ink));
    if (it.kind === 'shape') assert.ok(C.SHAPES.includes(it.shape));
    else { assert.equal(it.kind, 'word'); assert.ok(inks.has(it.word), 'parola fra i colori del round'); }
  }
  const sig = r.items.map((x) => x.ink + (x.kind === 'word' ? 'w' + x.word : 's' + x.shape));
  assert.equal(new Set(sig).size, sig.length, 'niente oggetti identici');
  const lure = r.items.some((x) => x.kind === 'word' && x.word === r.target && x.ink !== r.target);
  if (c.mode === 'shape') assert.ok(r.items.every((x) => x.kind === 'shape'));
  if (c.mode === 'same') assert.ok(r.items.every((x) => x.kind === 'word' && x.word === x.ink));
  if (c.mode === 'stroop') { assert.ok(r.items.every((x) => x.kind === 'word' && x.word !== x.ink), 'Stroop: tutte incoerenti'); assert.ok(lure, 'Stroop: esca'); }
  if (c.mode === 'mixed') { assert.ok(lure, 'misto: esca'); assert.ok(r.items.filter((x) => x.kind === 'word').length >= 2); }
  // con pochi colori niente coppie che si confondono col daltonismo
  if (c.k <= 5) { const l = [...inks]; for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) assert.ok(!C.isClose(l[i], l[j]), `${l[i]}/${l[j]} con k=${c.k}`); }
}

test('ogni round di ogni livello: una sola risposta giusta e regole della modalità rispettate', () => {
  for (const level of LEVELS) {
    for (let k = 0; k < 25; k++) {
      const s = C.newGame(level, level * 977 + k);
      let prev = null;
      while (!C.isOver(s)) {
        const r = C.round(s);
        checkRound(s, r);
        if (prev) assert.notEqual(r.target, prev, 'stesso colore due volte di fila');
        prev = r.target;
        // il bot tocca l'inchiostro giusto (trovato qui) dopo un tempo a caso
        const idx = r.items.findIndex((x) => x.ink === r.target);
        const res = C.answer(s, r, idx, 300 + ((k * 131) % 3000));
        assert.equal(res.type, 'right');
      }
      assert.ok(C.isWon(s));
      assert.equal(C.progress(s), 1);
      assert.equal(s.hits, s.rounds);
    }
  }
});

test('modalità Stroop introdotta per gradi: forme, poi parole coerenti, poi incoerenti, poi miste', () => {
  const first = (m) => LEVELS.find((l) => C.config(l).mode === m);
  assert.equal(first('shape'), 1);
  assert.ok(first('shape') < first('same') && first('same') < first('stroop') && first('stroop') < first('mixed'));
  assert.equal(C.config(first('same')).isNew, 'words');
  assert.equal(C.config(first('stroop')).isNew, 'stroop');
  assert.equal(C.config(first('mixed')).isNew, 'mixed');
});

test('curva: i colori salgono da 3 a 11, oggetti fino a 12, il tempo scende (massimo dei gradini monotono)', () => {
  assert.equal(C.config(1).k, 3);
  let mk = 0, ml = Infinity;
  const steps = new Set();
  for (const l of [...LEVELS, 30, 40, 60]) {
    const c = C.config(l);
    assert.ok(c.k >= 3 && c.k <= 11 && c.n >= c.k && c.n <= 12 && c.limit >= 3000 && c.rounds >= 8);
    mk = Math.max(mk, c.k); ml = Math.min(ml, c.limit); steps.add(c.k);
    // dal livello 14 in poi la curva non scende più
    if (l >= 14) { const p = C.config(l - 1); assert.ok(c.k >= p.k && c.limit <= p.limit, `livello ${l}`); }
  }
  assert.equal(C.config(60).k, 11);
  assert.equal(C.config(60).n, 12);
  assert.ok(steps.size >= 4);
  assert.ok(ml <= 3000);
});

test('determinismo: stesso seme e stato → stessi round; la ripetizione (dopo una pausa) cambia il round', () => {
  for (const level of [1, 5, 7, 10, 20]) {
    const a = C.newGame(level, 1234), b = C.newGame(level, 1234);
    assert.deepEqual(C.round(a), C.round(b));
    const r1 = JSON.stringify(C.round(a));
    let changed = false;
    for (let k = 0; k < 6 && !changed; k++) { a.redo++; changed = JSON.stringify(C.round(a)) !== r1; }
    assert.ok(changed, `livello ${level}`);
  }
});

test('mosse: tocco sbagliato = cuore e serie azzerata, il round continua; doppio tocco ignorato; tempo scaduto senza cuori', () => {
  const s = C.newGame(4, 99);
  const r = C.round(s);
  const wrong = r.items.findIndex((x) => x.ink !== r.target), right = r.items.findIndex((x) => x.ink === r.target);
  let res = C.answer(s, r, wrong, 1000);
  assert.equal(res.type, 'wrong'); assert.equal(res.left, 2); assert.equal(res.correct, right); assert.equal(s.i, 0);
  assert.equal(C.answer(s, r, wrong, 1100).type, 'invalid');
  res = C.answer(s, r, right, 1200);
  assert.equal(res.type, 'right'); assert.equal(s.i, 1); assert.equal(s.streak, 1);
  // mezzo punteggio per l'errore nello stesso round
  assert.equal(res.pts, C.points(1200, r.limit, 1, 1).pts);
  const r2 = C.round(s);
  res = C.timeout(s, r2);
  assert.equal(res.type, 'timeout'); assert.equal(s.mistakes, 1); assert.equal(s.streak, 0); assert.equal(s.timeouts, 1); assert.equal(s.i, 2);
  // tre errori: partita persa
  const t = C.newGame(4, 7), q = C.round(t);
  const bad = q.items.map((x, i) => i).filter((i) => q.items[i].ink !== q.target);
  bad.slice(0, 3).forEach((i) => C.answer(t, q, i, 500));
  assert.ok(C.isLost(t));
  assert.equal(C.answer(t, q, q.items.findIndex((x) => x.ink === q.target), 600).type, 'invalid');
});

test('punteggio: più veloce = più punti, serie premiate, errori dimezzano', () => {
  const L = 6000;
  assert.equal(C.points(0, L, 0, 0).pts, 100);
  assert.equal(C.points(C.GRACE, L, 0, 0).pts, 100);
  assert.equal(C.points(L, L, 0, 0).pts, 40);
  assert.ok(C.points(1500, L, 0, 0).pts > C.points(3000, L, 0, 0).pts);
  assert.equal(C.points(1000, L, 4, 0).pts - C.points(1000, L, 0, 0).pts, 20);
  assert.equal(C.points(1000, L, 30, 0).pts - C.points(1000, L, 0, 0).pts, 50);
  assert.ok(C.points(1000, L, 0, 1).pts < C.points(1000, L, 0, 0).pts);
});

test('stelle e tempo di riferimento', () => {
  const play = (level, ms, errEvery = 0, toEvery = 0) => {
    const s = C.newGame(level, 5);
    let n = 0;
    while (!C.isOver(s)) {
      const r = C.round(s); n++;
      if (toEvery && n % toEvery === 0) { C.timeout(s, r); continue; }
      if (errEvery && n % errEvery === 0) C.answer(s, r, r.items.findIndex((x) => x.ink !== r.target), ms);
      if (!C.isOver(s)) C.answer(s, r, r.items.findIndex((x) => x.ink === r.target), ms);
    }
    return s;
  };
  assert.equal(C.rate(play(1, 1200)), 3);
  assert.equal(C.rate(play(1, 6500)), 2, 'lento ma senza errori');
  assert.equal(C.rate(play(1, 1200, 0, 2)), 1, 'troppi tempi scaduti');
  assert.equal(C.rate(play(3, 1200, 6)), 2, 'un errore');
  for (const l of LEVELS) { const p = C.parTime(C.newGame(l, 1)); assert.ok(p >= 15 && p <= 120, `par ${l}: ${p}`); }
});

test('ripresa da JSON e validazione', () => {
  const s = C.newGame(9, 42);
  const r = C.round(s);
  C.answer(s, r, r.items.findIndex((x) => x.ink === r.target), 900);
  const back = JSON.parse(JSON.stringify(s));
  assert.ok(C.validate(back));
  assert.deepEqual(C.round(back), C.round(s));
  assert.ok(!C.validate(null));
  assert.ok(!C.validate({ ...back, v: 2 }));
  assert.ok(!C.validate({ ...back, rounds: 99 }));
  assert.ok(!C.validate({ ...back, last: 'magenta' }));
  assert.ok(!C.validate({ ...back, tapped: 3 }));
});

test('voce: solo voci locali della lingua giusta, regione preferita, niente voci buffe', () => {
  const v = (lang, name, extra = {}) => ({ lang, name, localService: true, default: false, ...extra });
  const list = [
    v('en-US', 'Samantha'), v('it-IT', 'Google italiano', { localService: false }), v('it-IT', 'Alice'), v('it-IT', 'Federica (Enhanced)'),
    v('ja-JP', 'Kyoko'), v('ar-SA', 'Maged'), v('zh-HK', 'Sin-ji'), v('zh-CN', 'Tingting'), v('en-US', 'Bubbles'), v('nb_NO', 'Nora'),
    v('hr-HR', 'Lana'), v('de-DE', 'Online', { localService: false }),
  ];
  assert.equal(C.pickVoice(list, 'it').name, 'Federica (Enhanced)');
  assert.equal(C.pickVoice(list, 'ja').name, 'Kyoko');
  assert.equal(C.pickVoice(list, 'ar').name, 'Maged');
  assert.equal(C.pickVoice(list, 'zh').name, 'Tingting');
  assert.equal(C.pickVoice(list, 'no').name, 'Nora');
  assert.equal(C.pickVoice(list, 'bs').name, 'Lana');
  assert.equal(C.pickVoice(list, 'en').name, 'Samantha');
  assert.equal(C.pickVoice(list, 'de'), null, 'solo voce online: niente voce');
  assert.equal(C.pickVoice(list, 'fr'), null);
  assert.equal(C.pickVoice([], 'it'), null);
  assert.equal(C.pickVoice([v('en-US', 'Bubbles')], 'en'), null);
});

test('chiavi i18n dei colori e del gioco in tutte le lingue; colori solo da token nei file del gioco', () => {
  for (const c of C.COLORS) assert.ok(HH.I18N_KEYS.includes(c.key), c.key);
  for (const k of ['r_colors', 'co_repeat', 'co_symbols', 'co_start', 'co_stroop', 'tu_colors_1', 'tu_colors_6']) assert.ok(HH.I18N_KEYS.includes(k), k);
  for (const l of HH.LANGS) for (const c of C.COLORS) assert.ok(String(HH.LOCALES[l.code][c.key]).trim(), `${l.code}.${c.key}`);
  for (const f of ['colors-ui.js', 'colors-logic.js', 'colors-voice.js']) {
    const src = fs.readFileSync(path.join(root, 'src/games', f), 'utf8');
    assert.ok(!/#[0-9a-f]{3,8}\b(?![\w-])/i.test(src.replace(/&#\d+;|#\$\{/g, '')), `${f}: colore letterale`);
    assert.ok(!/rgba?\(/.test(src), `${f}: rgb letterale`);
  }
  // nel CSS i colori letterali stanno solo nei blocchi dei token
  const rules = css.replace(/:root[^{]*\{[^}]*\}/g, '').replace(/@media \(prefers-color-scheme: dark\) \{\s*\}/g, '');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(rules), 'colore letterale fuori dai token');
});

test('generazione veloce (< 1 ms a round, 3 ms in CI)', () => {
  const t0 = performance.now();
  let n = 0;
  for (let k = 0; k < 400; k++) { const s = C.newGame(1 + (k % 30), k); for (let i = 0; i < 5; i++, n++) { s.i = i; C.round(s); } }
  assert.ok((performance.now() - t0) / n < 1 * SLOW);
});
