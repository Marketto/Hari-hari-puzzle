// Avviso legale, condizioni d'uso, privacy e licenze: testi in tutte le lingue, struttura, accettazione, offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, load } from './_load.mjs';
import { licensesFile, docProblems, DOCS, COMPONENTS } from '../tools/legal-import.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const HH = load('src/i18n/locales.js', 'src/core/core.js', 'src/core/legal.js');
const dir = path.join(root, 'src/i18n/legal');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) load('src/i18n/legal/' + f);
const KEYS = ['lg_title', 'lg_intro', 'lg_safety', 'lg_chk_terms', 'lg_chk_privacy', 'lg_accept', 'lg_terms', 'lg_privacy', 'lg_licenses', 'lg_link', 'lg_back', 'lg_accepted', 'lg_official', 'lg_offline'];

test('chiavi brevi in tutte le 43 lingue, con {app} e {date} dove servono', () => {
  assert.equal(HH.LANGS.length, 43);
  for (const l of HH.LANGS) for (const k of KEYS) {
    const v = HH.LOCALES[l.code][k];
    assert.ok(String(v || '').trim(), `${l.code}.${k}`);
    assert.equal((v.match(/\*\*/g) || []).length % 2, 0, `${l.code}.${k}: ** spaiato`);
  }
  for (const l of HH.LANGS) {
    assert.ok(HH.LOCALES[l.code].lg_intro.includes('{app}'), `${l.code}.lg_intro senza {app}`);
    assert.ok(HH.LOCALES[l.code].lg_accepted.includes('{date}'), `${l.code}.lg_accepted senza {date}`);
  }
});

test('testi lunghi: ogni lingua ha i tre documenti con la stessa struttura dell\'inglese', () => {
  const en = HH.LEGAL.en;
  assert.ok(en, 'manca src/i18n/legal/en.js');
  const missing = HH.LANGS.filter((l) => !HH.LEGAL[l.code]).map((l) => l.code);
  assert.deepEqual(missing, [], 'lingue senza testi legali: ' + missing.join(' '));
  for (const l of HH.LANGS) {
    const docs = HH.LEGAL[l.code];
    for (const d of DOCS) {
      assert.deepEqual(docProblems(docs[d], en[d], `${l.code}.${d}`), []);
      const all = [docs[d].title, ...docs[d].sections.flatMap((s) => [s.h, ...s.p])].join('\n');
      assert.ok(!/\{app\}/.test(all), `${l.code}.${d}: {app} non sostituito`);
      assert.ok(!/<\/?[a-z]/i.test(all), `${l.code}.${d}: HTML nel testo`);
    }
    // i nomi che non si traducono restano
    const priv = JSON.stringify(docs.privacy);
    for (const w of ['GoatCounter', 'Google Fonts', 'github.com/Marketto/Hari-hari-puzzle']) assert.ok(priv.includes(w), `${l.code}.privacy senza ${w}`);
    assert.ok(JSON.stringify(docs.terms).includes('OpenStreetMap'), `${l.code}.terms senza OpenStreetMap`);
    // il file dichiara la sua lingua
    assert.match(fs.readFileSync(path.join(dir, l.code + '.js'), 'utf8'), new RegExp(`\\["${l.code}"\\]`));
  }
});

test('licenze: elenco unico generato, testi integrali presenti, componenti noti', () => {
  assert.equal(fs.readFileSync(path.join(dir, 'licenses.js'), 'utf8'), licensesFile(), 'licenses.js non aggiornato: node tools/legal-import.mjs');
  const ids = HH.LEGAL_COMPONENTS.map((c) => c.id);
  for (const id of ['app', 'three', 'font-mochiy', 'font-mplus', 'font-baloo', 'osm']) assert.ok(ids.includes(id), id);
  for (const c of COMPONENTS) {
    assert.ok(c.name && c.author && c.license && /^https:\/\//.test(c.url), c.id);
    if (c.text) assert.ok(HH.LEGAL_TEXTS[c.text].length > 500, `${c.id}: testo integrale`);
  }
  assert.match(HH.LEGAL_TEXTS.LICENSE, /Copyright \(c\) 2026 Marketto/);
  assert.match(HH.LEGAL_TEXTS['docs/licenses/OFL-1.1.txt'], /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(HH.LEGAL_TEXTS['docs/licenses/ODbL-1.0.txt'], /Open Database License/);
  // i font elencati sono quelli caricati davvero da index.html
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const f of ['Baloo+Bhaijaan+2', 'M+PLUS+Rounded+1c', 'Mochiy+Pop+One']) {
    assert.ok(html.includes(f), f);
    assert.ok(COMPONENTS.some((c) => c.url.endsWith(f)), `font ${f} non in elenco`);
  }
  // three.js: solo Hari Rally lo carica
  const cat = load('src/games/catalog.js').catalog;
  assert.deepEqual(cat.filter((g) => g.files.includes('src/vendor/three.min.js')).map((g) => g.id), COMPONENTS.find((c) => c.id === 'three').used);
});

test('accettazione: una volta sola, di nuovo quando aumenta la versione', () => {
  const L = HH.legal;
  mem.clear();
  assert.equal(L.VERSION, 1);
  assert.equal(L.needs(), true);
  const a = L.accept(1700000000000);
  assert.deepEqual(a, { v: 1, at: 1700000000000 });
  assert.equal(L.needs(), false);
  assert.deepEqual(JSON.parse(mem.get('harihari:legal')), a);
  L.VERSION = 2;                                 // condizioni nuove: si richiede l'accettazione
  assert.equal(L.needs(), true);
  L.accept(); assert.equal(L.needs(), false);
  L.VERSION = 1;
  HH.store.set('legal', { at: 5 }); assert.equal(L.needs(), true);   // dato rovinato = non accettato
  HH.store.set('legal', 'x'); assert.equal(L.needs(), true);
});

test('formattazione: escape, {app}, **grassetto**', () => {
  assert.equal(HH.legal.inline('{app} **è** <b>ok</b> & "x"'), 'Hari Hari Puzzle <b>è</b> &lt;b&gt;ok&lt;/b&gt; &amp; &quot;x&quot;');
});

test('offline e lazy load: inglese e licenze nella shell, le altre lingue no; il file unico le contiene tutte', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const f of ['src/core/legal.js', 'src/i18n/legal/en.js', 'src/i18n/legal/licenses.js']) assert.ok(sw.includes(`'${f}'`), f);
  assert.ok(html.includes('src="src/core/legal.js"'));
  assert.ok(!sw.includes("'src/i18n/legal/it.js'") && !html.includes('src/i18n/legal/it.js'), 'le lingue sono lazy');
  assert.match(sw, /src\\\/i18n\\\/legal\\\/\[a-z\]\{2,3\}\\\.js/, 'il service worker mette in cache i testi delle lingue');
  const build = fs.readFileSync(path.join(root, 'tools/build-inline.mjs'), 'utf8');
  assert.match(build, /src\/i18n\/legal/);
});

test('l\'avviso viene prima delle statistiche e blocca i giochi', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  assert.match(app, /HH\.usage\.consent\(\) !== null \|\| HH\.legal\.needs\(\)\) return;/);
  assert.match(app, /if \(legalGate\(\(\) => openGame\(id, push\)\)\) return;/);
  assert.match(app, /if \(!legalGate\(resume\)\) resume\(\);/);
});
