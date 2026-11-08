// Testi legali (avviso al primo avvio, condizioni d'uso, informativa privacy, licenze): import e generazione.
//
//   node tools/legal-import.mjs                                  rigenera solo src/i18n/legal/licenses.js
//   node tools/legal-import.mjs <source.json> [tr.json ...]      importa chiavi brevi e testi lunghi
//   node tools/legal-import.mjs --fallback-en <source.json> ...  lingue senza traduzione: chiavi in inglese (provvisorio)
//
// source.json = { keys: { lg_*: { en, it } }, docs: { terms|privacy|licenses: { en: doc, it: doc } } }
// tr.json     = { "<lang>": { keys: {...}, docs: { terms, privacy, licenses } } }   (più lingue in un file)
//            oppure { keys, docs } con la lingua nel nome del file (es. tr-ja.json, ja.json)
// doc         = { title, sections: [{ h, p: [paragrafi] }] } · {app} = nome dell'app · **grassetto**
//
// Uscita:
//   src/i18n/locales.js              chiavi lg_* aggiunte (o aggiornate) in tutte le righe
//   src/i18n/legal/<lang>.js         HH.LEGAL[lang] = { terms, privacy, licenses } (solo le lingue con tutti e tre i testi)
//   src/i18n/legal/licenses.js       HH.LEGAL_COMPONENTS: elenco dei componenti di terze parti + testi integrali (in inglese)
// Ogni documento tradotto deve avere la stessa struttura dell'inglese (sezioni e paragrafi) e i ** in coppia.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
export const APP = 'Hari Hari Puzzle';
export const DOCS = ['terms', 'privacy', 'licenses'];

/* ---------- componenti di terze parti: UNICO elenco (pagina Licenze, docs/legal.md) ----------
 * text = file con il testo integrale (in inglese). notice = avviso di copyright da mostrare sopra il testo.
 * used = giochi che lo usano (id del catalogo), vuoto = tutta l'app. */
export const COMPONENTS = [
  { id: 'app', name: APP, author: '© 2026 Marketto', license: 'MIT License', url: 'https://github.com/Marketto/Hari-hari-puzzle', text: 'LICENSE' },
  { id: 'three', name: 'three.js r160', author: '© 2010-2023 three.js authors', license: 'MIT License', url: 'https://threejs.org', text: 'src/vendor/three.LICENSE', used: ['rally', 'fish'] },
  { id: 'font-mochiy', name: 'Mochiy Pop One (font)', author: 'FONTDASU', notice: 'Copyright 2020 The Mochiypop Project Authors (https://github.com/fontdasu/Mochiypop)',
    license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Mochiy+Pop+One', text: 'docs/licenses/OFL-1.1.txt' },
  { id: 'font-mplus', name: 'M PLUS Rounded 1c (font)', author: 'Coji Morishita, M+ Fonts Project', notice: 'Copyright 2016 The Rounded M+ Project Authors.',
    license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/M+PLUS+Rounded+1c', text: 'docs/licenses/OFL-1.1.txt' },
  { id: 'font-baloo', name: 'Baloo Bhaijaan 2 (font)', author: 'Ek Type', notice: 'Copyright 2019 The Baloo 2 Project Authors (https://github.com/EkType/Baloo2)',
    license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Baloo+Bhaijaan+2', text: 'docs/licenses/OFL-1.1.txt' },
  { id: 'osm', name: 'OpenStreetMap (map data)', author: '© OpenStreetMap contributors', notice: 'Map data © OpenStreetMap contributors, available under the Open Database License (ODbL) 1.0: https://www.openstreetmap.org/copyright. The real maps of Hari Taxi (Ostia, Desenzano del Garda, Ortigia) are a derived database distributed under the same license.',
    license: 'Open Database License (ODbL) 1.0', url: 'https://www.openstreetmap.org/copyright', text: 'docs/licenses/ODbL-1.0.txt', used: ['drive'] },
  { id: 'qr', name: 'QR Code', author: 'DENSO WAVE INCORPORATED', notice: 'QR Code is a registered trademark of DENSO WAVE INCORPORATED. The QR encoder and reader of the two-player mode are original code of this app (MIT License).',
    license: 'Trademark notice', url: 'https://www.qrcode.com/en/faq.html', used: ['street', 'rally'] },
];

export function licensesFile() {
  const texts = {};
  const list = COMPONENTS.map((c) => {
    const o = { id: c.id, name: c.name, author: c.author, license: c.license, url: c.url };
    if (c.notice) o.notice = c.notice;
    if (c.used) o.used = c.used;
    if (c.text) { o.text = c.text; texts[c.text] = read(c.text).replace(/\r\n/g, '\n').replace(/^﻿/, '').trimEnd(); }
    return o;
  });
  return `/* GENERATO da tools/legal-import.mjs (elenco COMPONENTS): non modificare a mano.
 * Componenti di terze parti mostrati nella scheda "Licenze", con i testi integrali in inglese (versione ufficiale).
 * Caricato solo aprendo la scheda (HH.legal.load), in SHELL di sw.js per l'offline. */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.LEGAL_COMPONENTS = ${JSON.stringify(list, null, 1)};
  HH.LEGAL_TEXTS = ${JSON.stringify(texts, null, 1)};
})(typeof globalThis !== 'undefined' ? globalThis : window);
`;
}

export function langFile(lang, docs) {
  return `/* GENERATO da tools/legal-import.mjs: non modificare a mano. Testi legali in "${lang}" (condizioni, privacy, licenze). */
(function (G) {
  const HH = (G.HH = G.HH || {});
  (HH.LEGAL = HH.LEGAL || {})[${JSON.stringify(lang)}] = ${JSON.stringify(docs, null, 1)};
})(typeof globalThis !== 'undefined' ? globalThis : window);
`;
}

/* ---------- controlli ---------- */
const sub = (s) => String(s).split('{app}').join(APP);
const bold = (s) => (String(s).match(/\*\*/g) || []).length % 2 === 0;
// errori di un documento rispetto all'inglese ([] = valido)
export function docProblems(doc, en, where) {
  const bad = [];
  if (!doc || typeof doc.title !== 'string' || !doc.title.trim() || !Array.isArray(doc.sections)) return [`${where}: documento mancante o senza titolo/sezioni`];
  if (doc.sections.length !== en.sections.length) bad.push(`${where}: ${doc.sections.length} sezioni, attese ${en.sections.length}`);
  doc.sections.forEach((s, i) => {
    const e = en.sections[i];
    if (!s || typeof s.h !== 'string' || !s.h.trim()) bad.push(`${where} §${i + 1}: titolo vuoto`);
    if (!s || !Array.isArray(s.p) || (e && s.p.length !== e.p.length)) bad.push(`${where} §${i + 1}: ${s && s.p ? s.p.length : 0} paragrafi, attesi ${e ? e.p.length : '?'}`);
    for (const t of [s && s.h, ...((s && s.p) || [])]) {
      if (typeof t !== 'string' || !t.trim()) bad.push(`${where} §${i + 1}: testo vuoto`);
      else if (!bold(t)) bad.push(`${where} §${i + 1}: ** spaiato in "${t.slice(0, 40)}…"`);
    }
  });
  return bad;
}
const clean = (doc) => ({ title: sub(doc.title).trim(), sections: doc.sections.map((s) => ({ h: sub(s.h).trim(), p: s.p.map((x) => sub(x).trim()) })) });

/* ---------- chiavi brevi in locales.js ---------- */
const q = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
function applyKeys(keys, T, fallbackEn) {
  const file = path.join(root, 'src/i18n/locales.js');
  let s = fs.readFileSync(file, 'utf8');
  const c = vm.createContext({}); vm.runInContext(s, c);
  const K = [...c.HH.I18N_KEYS];
  for (const k of keys) if (!K.includes(k)) K.push(k);
  const missing = [];
  s = s.replace(/HH\.I18N_KEYS = \[[^\]]*\];/, `HH.I18N_KEYS = [${K.map(q).join(', ')}];`);
  s = s.split('\n').map((line) => {
    const m = line.match(/^ {4}\['([a-z]{2,3})', /);
    if (!m) return line;
    const code = m[1];
    const row = c.HH._I18N_ROWS.find((r) => r[0] === code).slice();
    for (const k of keys) {
      let v = T[code] && T[code][k];
      if (!v || !String(v).trim()) {
        missing.push(`${code}.${k}`);
        const old = c.HH.I18N_KEYS.indexOf(k);
        v = (old >= 0 && row[3 + old]) || (fallbackEn ? T.en[k] : '');
      }
      row[3 + K.indexOf(k)] = v;
    }
    if (row.slice(3).some((v) => v == null || !String(v).trim()) && !fallbackEn) throw new Error(`chiavi mancanti in ${code} (usa --fallback-en per l'inglese provvisorio)`);
    return '    [' + row.map(q).join(', ') + '],';
  }).join('\n');
  fs.writeFileSync(file, s);
  return missing;
}

/* ---------- main ---------- */
function readTr(p) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j.keys && j.docs) { const lang = path.basename(p, '.json').replace(/^tr-/, ''); return { [lang]: j }; }
  return j;
}

function main(argv) {
  const fallbackEn = argv.includes('--fallback-en');
  const args = argv.filter((a) => !a.startsWith('--'));
  fs.mkdirSync(path.join(root, 'src/i18n/legal'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/i18n/legal/licenses.js'), licensesFile());
  console.log('src/i18n/legal/licenses.js', COMPONENTS.length, 'componenti');
  if (!args.length) return 0;
  const src = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const keys = Object.keys(src.keys);
  const T = { en: {}, it: {} }, D = { en: {}, it: {} };
  for (const k of keys) { T.en[k] = src.keys[k].en; T.it[k] = src.keys[k].it; }
  for (const d of DOCS) { D.en[d] = src.docs[d].en; D.it[d] = src.docs[d].it; }
  for (const p of args.slice(1)) {
    for (const [lang, v] of Object.entries(readTr(p))) {
      if (v.keys) T[lang] = Object.assign(T[lang] || {}, v.keys);
      if (v.docs) D[lang] = Object.assign(D[lang] || {}, v.docs);
    }
  }
  // chiavi brevi: tutte le lingue (con {app}/{date} intatti: si sostituiscono a runtime)
  const ctx = vm.createContext({}); vm.runInContext(read('src/i18n/locales.js'), ctx);
  const langs = ctx.HH.LANGS.map((l) => l.code);
  let errors = 0;
  for (const lang of Object.keys(T)) for (const k of keys) {
    const v = T[lang][k];
    if (v && !bold(v)) { console.log(`✘ ${lang}.${k}: ** spaiato`); errors++; }
    if (v && /\{app\}/.test(src.keys[k].en) && !v.includes('{app}')) { console.log(`✘ ${lang}.${k}: manca {app}`); errors++; }
    if (v && /\{date\}/.test(src.keys[k].en) && !v.includes('{date}')) { console.log(`✘ ${lang}.${k}: manca {date}`); errors++; }
  }
  const missing = applyKeys(keys, T, fallbackEn);
  const noKeys = [...new Set(missing.map((m) => m.split('.')[0]))];
  // testi lunghi: un file per lingua, solo se tutti e tre i documenti sono validi
  const done = [], skipped = [];
  for (const lang of langs) {
    const docs = D[lang];
    if (!docs) { skipped.push(lang); continue; }
    const bad = DOCS.flatMap((d) => docProblems(docs[d], D.en[d], `${lang}.${d}`));
    if (bad.length) { bad.forEach((b) => console.log('✘ ' + b)); errors += bad.length; skipped.push(lang); continue; }
    fs.writeFileSync(path.join(root, `src/i18n/legal/${lang}.js`), langFile(lang, Object.fromEntries(DOCS.map((d) => [d, clean(docs[d])]))));
    done.push(lang);
  }
  console.log(`testi legali: ${done.length}/${langs.length} lingue (${done.join(' ')})`);
  if (skipped.length) console.log(`senza testi (useranno l'inglese): ${skipped.join(' ')}`);
  if (noKeys.length) console.log(`${fallbackEn ? 'chiavi provvisorie in inglese' : 'chiavi già presenti mantenute'} per: ${noKeys.join(' ')}`);
  return errors ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
