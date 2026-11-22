// Guida della home (src/core/wizard.js): confronto di versioni, novità delle versioni saltate, passi presenti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/i18n/locales.js', 'src/core/wizard.js');
const W = HH.wizard;

// oracolo indipendente: confronto numerico campo per campo
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return Math.sign((x[i] || 0) - (y[i] || 0)); return 0; };

test('vcmp: ordine delle versioni numerico, non alfabetico', () => {
  assert.equal(W.vcmp('0.30.2', '0.30.2'), 0);
  assert.equal(W.vcmp('0.9.0', '0.10.0'), -1);
  assert.equal(W.vcmp('0.31.0', '0.30.9'), 1);
  assert.equal(W.vcmp('1.0', '1.0.0'), 0);
  assert.equal(W.vcmp(null, '0.0.1'), -1);
  const vs = ['0.1.0', '0.10.0', '0.2.5', '1.0.0', '0.30.2', '0.30.10', '0.9.9'];
  for (const a of vs) for (const b of vs) assert.equal(W.vcmp(a, b), cmp(a, b), `${a} vs ${b}`);
});

const NEWS = { '0.30.0': [{ key: 'a' }], '0.31.0': [{ key: 'b', sel: '#x' }, { key: 'c' }, { key: 'd' }, { key: 'e' }], '0.33.0': [{ key: 'f' }] };

test('newsBetween: solo le versioni saltate (from, to], in ordine, al massimo 3 per versione', () => {
  assert.deepEqual(W.newsBetween(NEWS, '0.30.0', '0.31.0').map((n) => n.key), ['b', 'c', 'd']);
  assert.deepEqual(W.newsBetween(NEWS, '0.29.0', '0.40.0').map((n) => n.key), ['a', 'b', 'c', 'd', 'f']);
  assert.deepEqual(W.newsBetween(NEWS, '0.31.0', '0.32.0'), []);
  assert.deepEqual(W.newsBetween(NEWS, '0.33.0', '0.33.0'), []);
  assert.equal(W.newsBetween(NEWS, '0.30.0', '0.31.0')[0].sel, '#x');
});

test('gameNews: i giochi arrivati nelle versioni saltate, con la loro card', () => {
  const cat = [{ id: 'a', name: 'A', since: '0.10.0' }, { id: 'b', name: 'B', since: '0.31.0' }, { id: 'c', name: 'C' }];
  const g = W.gameNews(cat, '0.30.2', '0.31.0');
  assert.deepEqual(g.map((x) => x.game), ['b']);
  assert.match(g[0].sel, /data-game="b"/);
  assert.equal(g[0].name, 'B');
});

test('plan: primo avvio = giro completo, stessa versione = niente, versione vecchia = solo novità', () => {
  assert.equal(W.plan({ stored: null, legacy: null, cur: '0.31.0', news: NEWS }).mode, 'tour');
  assert.equal(W.plan({ stored: { v: '0.31.0' }, cur: '0.31.0', news: NEWS }).mode, null);
  assert.equal(W.plan({ stored: { v: '9.0.0' }, cur: '0.31.0', news: NEWS }).mode, null);
  const p = W.plan({ stored: { v: '0.30.2' }, cur: '0.31.0', news: NEWS, catalog: [{ id: 'z', name: 'Z', since: '0.31.0' }] });
  assert.equal(p.mode, 'news');
  assert.deepEqual(p.items.map((n) => n.key), ['wz_new_game', 'b', 'c', 'd']);
  // nessuna novità per le versioni saltate: niente
  assert.equal(W.plan({ stored: { v: '0.31.0' }, cur: '0.32.0', news: NEWS }).mode, null);
  // chi giocava già prima della guida (seenVersion) vede le novità, non il giro completo
  assert.equal(W.plan({ stored: null, legacy: '0.30.2', cur: '0.31.0', news: NEWS }).mode, 'news');
  assert.equal(W.plan({ stored: null, legacy: '0.31.0', cur: '0.31.0', news: NEWS }).mode, null);
  // tante novità: si tengono le ultime 6
  const many = {}; for (let i = 1; i <= 5; i++) many[`1.${i}.0`] = [{ key: 'k' + i + 'a' }, { key: 'k' + i + 'b' }];
  const pm = W.plan({ stored: { v: '1.0.0' }, cur: '2.0.0', news: many });
  assert.equal(pm.items.length, 6);
  assert.equal(pm.items[5].key, 'k5b');
});

test('tourSteps: 4–6 passi, saltati quelli senza elemento, alternative e buchi in più', () => {
  const all = W.tourSteps(() => true);
  assert.ok(all.length >= 4 && all.length <= 6, `${all.length} passi`);
  assert.equal(all[0].key, 'wz_resume');                               // con una partita in sospeso
  assert.deepEqual(all.find((s) => s.id === 'settings').sels, ['#langBtn', '#audioBtn']);
  assert.equal(all.find((s) => s.id === 'share').key, 'wz_share_install');
  const some = W.tourSteps((s) => !/resume|installBtn|view-bar/.test(s));
  assert.equal(some[0].key, 'wz_cards');
  assert.ok(!some.some((s) => s.id === 'view'));
  assert.equal(some.find((s) => s.id === 'share').key, 'wz_share');
  assert.deepEqual(W.tourSteps(() => false), []);
  // novità senza elemento: il testo resta, senza riquadro
  assert.deepEqual(W.newsSteps(() => false, [{ key: 'x', sel: '#nope' }])[0].sels, []);
});

test('stringhe della guida in tutte le 43 lingue, segnaposti al loro posto', () => {
  const keys = new Set(['wz_title', 'wz_news', 'wz_step', 'wz_open', 'wz_done', 'wz_ok', 'wz_new_game', 'tutSkip', 'lg_back', 'next']);
  for (const s of W.TOUR) for (const k of [s.key, s.keyAlso, ...(s.alt || []).map((a) => a.key)]) if (k) keys.add(k);
  for (const v of Object.keys(W.NEWS)) {
    assert.match(v, /^\d+\.\d+\.\d+$/);
    assert.ok(W.NEWS[v].length >= 1 && W.NEWS[v].length <= 3, `NEWS ${v}: 1–3 novità`);
    for (const n of W.NEWS[v]) keys.add(n.key);
  }
  assert.equal(HH.LANGS.length, 43);
  for (const l of HH.LANGS) {
    const L = HH.LOCALES[l.code];
    for (const k of keys) assert.ok(String(L[k] || '').trim(), `${l.code}.${k}`);
    assert.ok(L.wz_new_game.includes('{name}'), `${l.code}.wz_new_game senza {name}`);
    assert.ok(L.wz_step.includes('{n}') && L.wz_step.includes('{total}'), `${l.code}.wz_step`);
  }
});
