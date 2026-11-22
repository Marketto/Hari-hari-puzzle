// Partita salvata già risolta alla riapertura (uscita durante il ritardo tra la soluzione e ctx.win):
// HH.rules.solvedOnResume decide se l'app assegna la vittoria. Gli stati risolti/non risolti sono costruiti qui,
// con controlli scritti nel test (oracolo indipendente dai giochi), e confrontati con la decisione del nucleo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/core/rules.js');
HH.games = HH.games || [];
HH.i18n = HH.i18n || { t: (k) => k, code: 'en' };
const R = HH.rules;
const game = (id, ...files) => { load(...files); return HH.games.find((g) => g.id === id); };

/* ---------- regola generale ---------- */
test('solvedOnResume: mai per endless, stato vuoto o senza controlli', () => {
  assert.equal(R.solvedOnResume(null, { a: 1 }), false);
  assert.equal(R.solvedOnResume({ progress: () => 1 }, null), false);
  assert.equal(R.solvedOnResume({ endless: true, progress: () => 1, solved: () => true }, {}), false);
  assert.equal(R.solvedOnResume({}, {}), false);
});
test('solvedOnResume: solved(s) del gioco vince su progress', () => {
  assert.equal(R.solvedOnResume({ progress: () => 1, solved: () => false }, {}), false);
  assert.equal(R.solvedOnResume({ progress: () => 0.2, solved: () => true }, {}), true);
  assert.equal(R.solvedOnResume({ solved: () => 1 }, {}), false, 'solo true esplicito');
});
test('solvedOnResume: senza solved, progress >= 1 e cuori non finiti', () => {
  assert.equal(R.solvedOnResume({ progress: () => 1 }, {}), true);
  assert.equal(R.solvedOnResume({ progress: () => 0.99 }, {}), false);
  assert.equal(R.solvedOnResume({ progress: () => NaN }, {}), false);
  assert.equal(R.solvedOnResume({ lives: 3, progress: () => 1 }, { mistakes: 3 }), false);
  assert.equal(R.solvedOnResume({ lives: 3, progress: () => 1 }, { mistakes: 2 }), true);
});
test('solvedOnResume: un errore nel controllo vale "no"', () => {
  assert.equal(R.solvedOnResume({ solved: () => { throw new Error('x'); } }, {}), false);
  assert.equal(R.solvedOnResume({ progress: (s) => s.nope.length }, {}), false);
});

/* ---------- giochi veri ---------- */
test('Hari Memory: vinta solo con tutte le coppie trovate', () => {
  const g = game('memory', 'src/games/memory-logic.js', 'src/games/memory-art.js', 'src/games/memory-ui.js');
  const s = HH.memory.newGame(3, 12345);
  assert.equal(R.solvedOnResume(g, s), false);
  const all = Object.assign({}, s, { found: s.found.map(() => true) });
  assert.equal(R.solvedOnResume(g, all), true);
  const one = Object.assign({}, s, { found: s.found.map((_, i) => i > 0) });
  assert.equal(R.solvedOnResume(g, one), false);
  assert.equal(R.solvedOnResume(g, JSON.parse(JSON.stringify(all))), true, 'anche dopo il giro in JSON del salvataggio');
});

// oracolo Hedgedoku: un riccio per riga, colonna e zona, nessuno vicino a un altro (anche in diagonale)
function hogsOk(n, reg, board) {
  const hs = board.map((v, i) => (v === 2 ? i : -1)).filter((i) => i >= 0);
  if (hs.length !== n) return false;
  const rows = new Set(hs.map((i) => (i / n) | 0)), cols = new Set(hs.map((i) => i % n)), zs = new Set(hs.map((i) => reg[i]));
  if (rows.size !== n || cols.size !== n || zs.size !== n) return false;
  return hs.every((a) => hs.every((b) => a === b || Math.max(Math.abs(((a / n) | 0) - ((b / n) | 0)), Math.abs((a % n) - (b % n))) > 1));
}
test('Hedgedoku: progress 1 con ricci sbagliati NON è una vittoria', () => {
  const g = game('hedgedoku', 'src/games/hedgedoku-logic.js', 'src/games/hog-kit.js', 'src/games/hedgedoku-ui.js');
  const n = 6, p = HH.hedgedoku.generate(n, HH.rng(7));
  const s = { n, regions: p.regions, solution: p.solution, given: [], board: new Array(n * n).fill(0), hist: [], moves: 0, mistakes: 0 };
  // n ricci tutti nella prima riga: il contatore è pieno (progress = 1) ma la griglia è sbagliata
  const wrong = Object.assign({}, s, { board: s.board.map((_, i) => (i < n ? 2 : 0)) });
  assert.equal(g.progress(wrong), 1);
  assert.equal(hogsOk(n, s.regions, wrong.board), false);
  assert.equal(R.solvedOnResume(g, wrong), false);
  const right = Object.assign({}, s, { board: s.board.map((_, i) => (p.solution[(i / n) | 0] === i % n ? 2 : 0)) });
  assert.equal(hogsOk(n, s.regions, right.board), true);
  assert.equal(R.solvedOnResume(g, right), true);
});

test('Hari Spot: vinta con tutte le differenze trovate', () => {
  const g = game('spot', 'src/games/spot-art.js', 'src/games/spot-logic.js', 'src/games/spot-ui.js');
  assert.equal(R.solvedOnResume(g, { n: 5, found: [1, 2, 3, 4] }), false);
  assert.equal(R.solvedOnResume(g, { n: 5, found: [1, 2, 3, 4, 5] }), true);
});

test('Hari Escape: vinta solo con la porta aperta (s.won)', () => {
  const g = game('escape', 'src/games/escape-logic.js', 'src/games/escape-art.js', 'src/games/dom-patch.js', 'src/games/escape-ui.js');
  const s = HH.escape.newGame(1, 42, []);
  assert.equal(R.solvedOnResume(g, s), false);
  assert.equal(R.solvedOnResume(g, Object.assign({}, s, { won: true })), true);
});

test('Hari Home (endless): mai una vittoria alla riapertura', () => {
  const g = { id: 'life', endless: true, progress: () => 1 };
  assert.equal(R.solvedOnResume(g, { needs: { mood: 1 } }), false);
});

/* ---------- contratto: controllo preciso e destroy() dichiarati ---------- */
import fs from 'node:fs';
import path from 'node:path';
import { root } from './_load.mjs';
const uis = fs.readdirSync(path.join(root, 'src/games')).filter((f) => f.endsWith('-ui.js'));
test('ogni gioco a livelli dichiara solved(s) (la vittoria alla riapertura non dipende da progress)', () => {
  for (const f of uis) {
    const src = fs.readFileSync(path.join(root, 'src/games', f), 'utf8');
    const reg = src.slice(src.indexOf('HH.games.push('));
    if (/endless:\s*true/.test(reg)) continue;
    assert.match(reg, /\n\s*solved: /, `${f}: manca solved(s)`);
  }
});
test('i giochi con RAF continui, sensori, voce o rete espongono destroy()', () => {
  const need = ['fish', 'colors', 'street', 'rally', 'drive', 'snack', 'parade', 'flight', 'escape', 'life'];
  for (const id of need) {
    const src = fs.readFileSync(path.join(root, 'src/games', `${id}-ui.js`), 'utf8');
    assert.match(src, /\n\s*destroy(: |\(\) \{)/, `${id}: manca destroy()`);
  }
});
