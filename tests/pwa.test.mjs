// PWA: versione coerente, shell offline completa, aggiornamenti che non toccano i salvataggi.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, load } from './_load.mjs';

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const SHELL = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));

test('VERSION del service worker = versione di package.json = HH.VERSION mostrata in home', () => {
  assert.equal(sw.match(/const VERSION = '([^']+)'/)[1], `hh-v${pkg.version}`);
  const core = fs.readFileSync(path.join(root, 'src/core/core.js'), 'utf8');
  assert.equal(core.match(/HH\.VERSION = '([^']+)'/)[1], pkg.version);
});

test('la shell offline contiene ogni file usato da index.html e i file esistono', () => {
  const used = [...html.matchAll(/(?:src|href)="((?:src|assets)\/[^"]+)"/g)].map((m) => m[1]);
  for (const u of used) assert.ok(SHELL.includes(u), `${u} manca in SHELL`);
  for (const f of SHELL.filter((f) => f !== './')) assert.ok(fs.existsSync(path.join(root, f)), `${f} non esiste`);
});

test('il service worker non tocca i dati di gioco e aspetta il via per aggiornarsi', () => {
  assert.ok(!/localStorage|indexedDB|storage\.clear/.test(sw.replace(/\/\*[\s\S]*?\*\//g, '')));
  assert.match(sw, /type === 'skip'/);
  assert.match(sw, /if \(!self\.registration\.active \|\| !\(await pagesCanUpdate\(\)\)\) await self\.skipWaiting\(\)/);
  assert.match(sw, /cache: 'reload'/);
});

test('salvataggi: versione attuale caricata, vecchie migrate o lasciate intatte', () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const HH = load('src/core/core.js');
  const P = HH.progress, V = P.SAVE_VERSION;
  P.saveGame('boba', { level: 3, elapsed: 12, state: { moves: 4 } });
  assert.equal(P.loadGame('boba').state.moves, 4);
  // salvataggio di una versione vecchia senza migrazione: non caricato ma non cancellato
  HH.store.set('save:sushi', { v: V - 1, ts: 1, level: 2, state: { served: 1 } });
  assert.equal(P.loadGame('sushi'), null);
  assert.ok(HH.store.get('save:sushi'));
  // con la migrazione registrata torna giocabile
  P.MIGRATE[V - 1] = (s) => Object.assign({}, s, { v: s.v + 1 });
  assert.equal(P.loadGame('sushi').state.served, 1);
  delete P.MIGRATE[V - 1];
  // i progressi (livello, punti) non hanno versione e restano sempre
  P.set('boba', { level: 7, total: 900 });
  assert.equal(P.get('boba').level, 7);
});

test('lazy load: catalogo completo, file esistenti, card e token generati aggiornati, giochi non in index.html né nella shell', async () => {
  const { generate, tokens } = await import('../tools/gen-cards.mjs');
  const HH = load('src/games/catalog.js');
  const ids = HH.catalog.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, 'id doppi nel catalogo');
  for (const g of HH.catalog) {
    assert.ok(g.files.length && g.files.some((f) => f.endsWith('-ui.js')), g.id);
    for (const f of g.files) {
      assert.ok(fs.existsSync(path.join(root, f)), `${f} non esiste`);
      assert.ok(!html.includes(f), `${f} caricato all'avvio da index.html`);
      assert.ok(!SHELL.includes(f), `${f} nella shell (deve essere lazy)`);
    }
    // file extra caricati su richiesta (es. mappe reali di Hari Taxi): esistono e sono lazy anche loro
    for (const f of g.extra || []) {
      assert.ok(fs.existsSync(path.join(root, f)), `${f} non esiste`);
      assert.ok(!html.includes(f) && !SHELL.includes(f), `${f} deve essere lazy`);
    }
    // logic prima di ui
    const js = g.files.filter((f) => f.endsWith('.js'));
    assert.ok(js[js.length - 1].endsWith('-ui.js'), `${g.id}: la UI deve essere l'ultimo script`);
  }
  // ogni file di gioco del repo è in un catalogo (niente giochi dimenticati)
  const all = new Set(HH.catalog.flatMap((g) => [...g.files, ...(g.extra || [])]));
  for (const f of fs.readdirSync(path.join(root, 'src/games'))) {
    if (['catalog.js', 'cards.js', 'tokens.css'].includes(f)) continue;
    assert.ok(all.has('src/games/' + f), `src/games/${f} non è in nessun gioco del catalogo`);
  }
  assert.equal(fs.readFileSync(path.join(root, 'src/games/cards.js'), 'utf8'), generate(), 'cards.js non aggiornato: npm run cards');
  assert.equal(fs.readFileSync(path.join(root, 'src/games/tokens.css'), 'utf8'), tokens(), 'tokens.css non aggiornato: npm run cards');
  for (const f of ['src/games/catalog.js', 'src/games/cards.js', 'src/games/tokens.css']) assert.ok(SHELL.includes(f), `${f} manca in SHELL`);
  assert.match(sw, /importScripts\('src\/games\/catalog\.js'\)/);
});
