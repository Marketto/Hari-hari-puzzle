// Avviso legale, condizioni d'uso, privacy e licenze: testi in tutte le lingue, struttura, accettazione, offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, load } from './_load.mjs';
import { licensesFile, docProblems, DOCS, COMPONENTS } from '../tools/legal-import.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const HH = load('src/i18n/locales.js', 'src/core/core.js', 'src/core/legal.js');
const dir = path.join(root, 'src/i18n/legal');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) load('src/i18n/legal/' + f);
const KEYS = ['lg_title', 'lg_intro', 'lg_safety', 'lg_chk_safety', 'lg_chk_terms', 'lg_chk_privacy', 'lg_accept', 'lg_terms', 'lg_privacy', 'lg_licenses', 'lg_link', 'lg_back', 'lg_accepted', 'lg_official', 'lg_offline'];

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
    for (const w of ['GoatCounter', 'github.com/Marketto/Hari-hari-puzzle']) assert.ok(priv.includes(w), `${l.code}.privacy senza ${w}`);
    // font inclusi nell'app: nessun servizio di Google nei testi (privacy, condizioni, licenze)
    const all3 = JSON.stringify(docs);
    for (const w of ['Google Fonts', 'fonts.googleapis', 'fonts.gstatic']) assert.ok(!all3.includes(w), `${l.code}: ${w} ancora citato nei testi legali`);
    assert.equal(docs.privacy.sections.length, 6, `${l.code}.privacy: 6 sezioni (senza Font)`);
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
  // i font elencati sono quelli inclusi davvero nell'app (assets/fonts/fonts.css): usati dai fogli di stile, in elenco
  // con la SIL OFL e la nota «inclusi nell'app» (nessun rimando a Google Fonts)
  const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  const fonts = fs.readFileSync(path.join(root, 'assets/fonts/fonts.css'), 'utf8');
  const fams = [...new Set([...fonts.matchAll(/font-family:'([^']+)'/g)].map((m) => m[1]))];
  assert.deepEqual(fams.sort(), ['Baloo Bhaijaan 2', 'M PLUS Rounded 1c', 'Mochiy Pop One']);
  for (const f of fams) {
    assert.ok(css.includes(`"${f}"`), f);
    const c = COMPONENTS.find((x) => x.name === `${f} (font)`);
    assert.ok(c, `font ${f} non in elenco`);
    assert.equal(c.license, 'SIL Open Font License 1.1', f);
    assert.match(c.notice, /Included in the app/);
  }
  // three.js: solo i giochi elencati in COMPONENTS (Hari Rally, Hari Fishing, Hari Express) lo caricano
  const cat = load('src/games/catalog.js').catalog;
  assert.deepEqual(cat.filter((g) => g.files.includes('src/vendor/three.min.js')).map((g) => g.id), COMPONENTS.find((c) => c.id === 'three').used);
});

test('accettazione: una volta sola, di nuovo quando aumenta la versione', () => {
  const L = HH.legal;
  mem.clear();
  assert.equal(L.VERSION, 2);
  assert.equal(L.needs(), true);
  const a = L.accept(1700000000000);
  assert.deepEqual(a, { v: 2, at: 1700000000000 });
  assert.equal(L.needs(), false);
  assert.deepEqual(JSON.parse(mem.get('harihari:legal')), a);
  HH.store.set('legal', { v: 1, at: 1700000000000 });   // accettato con il testo v1: l'avviso ricompare
  assert.equal(L.needs(), true);
  assert.equal(L.accepted(), null);
  L.accept(); assert.equal(L.needs(), false);
  L.VERSION = 3;                                 // condizioni nuove: si richiede l'accettazione
  assert.equal(L.needs(), true);
  L.accept(); assert.equal(L.needs(), false);
  L.VERSION = 2;
  HH.store.set('legal', { at: 5 }); assert.equal(L.needs(), true);   // dato rovinato = non accettato
  HH.store.set('legal', 'x'); assert.equal(L.needs(), true);
});

test('tre caselle obbligatorie: sicurezza, condizioni, privacy', () => {
  const L = HH.legal;
  assert.deepEqual([...L.CHECKS], ['safety', 'terms', 'privacy']);
  assert.equal(L.ready({}), false);
  assert.equal(L.ready({ terms: true, privacy: true }), false, 'senza la casella di sicurezza resta spento');
  assert.equal(L.ready({ safety: true, terms: true }), false);
  assert.equal(L.ready({ safety: true, privacy: true }), false);
  assert.equal(L.ready({ safety: true, terms: true, privacy: true }), true);
  for (const k of L.CHECKS) for (const l of HH.LANGS) assert.ok(String(HH.LOCALES[l.code]['lg_chk_' + k] || '').trim(), `${l.code}.lg_chk_${k}`);
  // EN e IT dicono davvero "avvertenze di sicurezza" e "sollevo da responsabilità"
  assert.match(HH.LOCALES.en.lg_chk_safety, /safety warnings.*own risk.*releasing the author/);
  assert.match(HH.LOCALES.it.lg_chk_safety, /avvertenze di sicurezza.*mia responsabilità.*sollevando l'autore/);
});

/* ---------- finestra vera (L.gate) con un document minimo ---------- */
// contesto vm separato con document: legal.js disegna la finestra; le caselle si spuntano con eventi change finti
// e il clic su «Accetto» con un evento click finto, come farebbero i gestori del browser.
function gateDom() {
  const store = new Map();
  const listeners = {};
  const stubs = new Map();
  const dlg = {
    className: '', id: '', attrs: {}, _html: '',
    set innerHTML(h) { this._html = h; stubs.clear(); },
    get innerHTML() { return this._html; },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    contains: () => false,
    remove() { body.children = body.children.filter((x) => x !== dlg); },
    // elementi trovati nel markup disegnato: l'attributo disabled iniziale viene da lì
    querySelector(sel) {
      const id = sel.replace(/:not\(\[disabled\]\)$/, '');
      if (!stubs.has(id)) {
        const m = id.startsWith('#') && this._html.match(new RegExp(`<[a-z]+[^>]*id="${id.slice(1)}"[^>]*>`));
        stubs.set(id, { disabled: !!m && /\sdisabled[\s>]/.test(m[0]), hidden: false, focus() { ctx.document.activeElement = this; } });
      }
      const st = stubs.get(id);
      return sel.endsWith(':not([disabled])') && st.disabled ? null : st;
    },
  };
  const body = { children: [], appendChild(c) { this.children.push(c); return c; } };
  const app = { inert: false };
  const ctx = {
    console, Promise, Date, Math, Error, JSON, Intl, setTimeout, clearTimeout,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    history: { state: null, pushState(s) { this.state = s; }, replaceState(s) { this.state = s; } },
    addEventListener() {}, removeEventListener() {},
    document: {
      body, activeElement: null, documentElement: {},
      createElement: () => dlg,
      querySelector: (sel) => (sel === '.app' ? app : null),
      getElementById: () => null,
      addEventListener() {}, removeEventListener() {},
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/i18n/locales.js', 'src/core/core.js', 'src/core/legal.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  ctx.HH.loadFile = () => Promise.reject(new Error('offline'));   // testi lunghi non necessari qui
  const fire = (type, e) => (listeners[type] || []).forEach((f) => f(e));
  return {
    L: ctx.HH.legal, dlg, body, app,
    accept: () => dlg.querySelector('#lgAccept'),
    tick: (chk, checked = true) => fire('change', { target: { closest: (s) => (s === '[data-chk]' ? { dataset: { chk }, checked } : null) } }),
    clickAccept: () => fire('click', { target: { closest: (s) => (s === '#lgAccept' ? {} : null) } }),
  };
}

test('finestra dell\'avviso: caselle disegnate da CHECKS, «Accetto» acceso solo con tutte e tre, poi done()', () => {
  const W = gateDom();
  let done = 0;
  assert.equal(W.L.needs(), true);
  assert.equal(W.L.gate({ done: () => done++ }), true);
  assert.equal(W.L.isOpen(), true);
  assert.deepEqual(W.body.children, [W.dlg]);
  assert.equal(W.app.inert, true, 'il resto dell\'app è inerte');
  // caselle nel markup disegnato: una per CHECKS, con l'id usato dagli e2e
  const boxes = [...W.dlg.innerHTML.matchAll(/<input type="checkbox" id="lgChk-([a-z]+)" data-chk="([a-z]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(boxes, [...W.L.CHECKS].map((k) => [k, k]));
  assert.equal(W.accept().disabled, true, 'spento all\'inizio');
  W.tick('safety'); W.tick('terms');
  assert.equal(W.accept().disabled, true, 'due caselle su tre');
  W.clickAccept();                                 // clic su un pulsante spento: niente
  assert.equal(done, 0);
  assert.equal(W.L.needs(), true);
  W.tick('privacy');
  assert.equal(W.accept().disabled, false, 'tre caselle');
  W.tick('terms', false);
  assert.equal(W.accept().disabled, true, 'tolta una casella si rispegne');
  W.tick('terms');
  // una seconda chiamata non apre un'altra finestra
  assert.equal(W.L.gate({ done: () => done++ }), true);
  assert.equal(W.body.children.length, 1);
  W.clickAccept();
  assert.equal(done, 1);
  assert.equal(W.L.needs(), false);
  assert.equal(W.L.isOpen(), false);
  assert.deepEqual(W.body.children, []);
  assert.equal(W.app.inert, false);
  // accettato: niente più finestra
  assert.equal(W.L.gate({ done: () => done++ }), false);
  assert.equal(done, 1);
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
  const home = fs.readFileSync(path.join(root, 'src/core/home.js'), 'utf8');   // domanda sulle statistiche (askConsent)
  assert.match(home, /HH\.usage\.consent\(\) !== null \|\| HH\.legal\.needs\(\)\) return;/);
  assert.match(app, /if \(legalGate\(\(\) => openGame\(id, push\)\)\) return;/);
  assert.match(app, /if \(!legalGate\(resume\)\) resume\(\);/);
});
