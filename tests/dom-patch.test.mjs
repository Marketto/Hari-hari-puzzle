// Aggiornamento in place del DOM (src/games/dom-patch.js) e zoom di Hari Escape senza sfarfallio.
// Un DOM finto minimo (solo ciò che usa morph) basta: si controlla che i nodi restino gli stessi oggetti quando cambia
// solo un attributo o un testo, e che si sostituiscano solo se cambiano tipo o chiave.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';

const HH = load('src/games/dom-patch.js');
const { morph } = HH.domPatch;

class Node {
  constructor(type, name, value) { this.nodeType = type; this.nodeName = name; this.nodeValue = value ?? null; this.childNodes = []; this.attrs = new Map(); this.parent = null; }
  get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value, namespaceURI: null })); }
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  setAttribute(n, v) { this.attrs.set(n, String(v)); }
  setAttributeNS(ns, n, v) { this.setAttribute(n, v); }
  removeAttribute(n) { this.attrs.delete(n); }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  detach(n) { if (n.parent) { const p = n.parent; p.childNodes.splice(p.childNodes.indexOf(n), 1); n.parent = null; } }
  appendChild(n) { this.detach(n); this.childNodes.push(n); n.parent = this; return n; }
  removeChild(n) { this.detach(n); return n; }
  replaceChild(n, old) { this.detach(n); const i = this.childNodes.indexOf(old); this.childNodes[i] = n; n.parent = this; old.parent = null; return old; }
}
// h('g', { class: 'a' }, h('circle', { r: 3 }), 'testo')
const h = (name, attrs = {}, ...kids) => {
  const n = new Node(1, name.toUpperCase());
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const k of kids) n.appendChild(typeof k === 'string' ? new Node(3, '#text', k) : k);
  return n;
};
const frag = (...kids) => h('#frag', {}, ...kids);
const puzzle = (on, label) => frag(
  h('rect', { class: 'bg', width: 400 }),
  h('g', { class: 'er-btn' + (on ? ' on' : ''), 'data-a': 'tap:0' }, h('circle', { r: 20, fill: on ? 'red' : 'grey' })),
  h('g', { class: 'er-btn', 'data-a': 'tap:1' }, h('circle', { r: 20, fill: 'grey' })),
  h('text', {}, label),
);

test('dom-patch: cambia solo un attributo o un testo → stessi nodi, valori aggiornati', () => {
  const live = puzzle(false, '0');
  const before = [live, ...live.childNodes, ...live.childNodes.flatMap((c) => c.childNodes)];
  morph(live, puzzle(true, '1'));
  const after = [live, ...live.childNodes, ...live.childNodes.flatMap((c) => c.childNodes)];
  assert.equal(after.length, before.length);
  after.forEach((n, i) => assert.equal(n, before[i], `nodo ${i} sostituito`));
  assert.equal(live.childNodes[1].getAttribute('class'), 'er-btn on');
  assert.equal(live.childNodes[1].childNodes[0].getAttribute('fill'), 'red');
  assert.equal(live.childNodes[3].childNodes[0].nodeValue, '1');
});

test('dom-patch: attributi tolti, figli in più o in meno, tipo o chiave diversi', () => {
  const live = frag(h('g', { class: 'x', 'data-o': 'a', hidden: '' }), h('rect'), h('circle'));
  const keep = live.childNodes[0];
  morph(live, frag(h('g', { class: 'y', 'data-o': 'a' }), h('path'), h('circle'), h('circle')));
  assert.equal(live.childNodes[0], keep);
  assert.equal(keep.getAttribute('hidden'), null);
  assert.equal(keep.getAttribute('class'), 'y');
  assert.equal(live.childNodes[1].nodeName, 'PATH');
  assert.equal(live.childNodes.length, 4);
  const g = live.childNodes[0];
  morph(live, frag(h('g', { 'data-o': 'b' })));
  assert.notEqual(live.childNodes[0], g, 'chiave diversa → nodo nuovo');
  assert.equal(live.childNodes.length, 1);
});

test('Hari Escape: lo zoom non ricrea il riquadro a ogni mossa (niente innerHTML sul pannello aperto)', () => {
  const src = fs.readFileSync(path.join(root, 'src/games/escape-ui.js'), 'utf8');
  const body = src.slice(src.indexOf('function renderZoom('), src.indexOf('function clueZoom('));
  // l'unico innerHTML con contenuto è dentro il ramo "riquadro nuovo" (oggetto diverso); il resto passa da patch
  const sets = [...body.matchAll(/zoomEl\.innerHTML\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(sets.every((v) => v === "''" || /data-zoom="\$\{key\}"/.test(v)), 'innerHTML del riquadro fuori dal ramo "nuovo oggetto"');
  assert.match(body, /card\.dataset\.zoom !== key/);
  assert.match(body, /patch\(card\.querySelector\('\.er-zsvg'\), inner\)/);
  // stanza, borsa e barra si aggiornano in place
  for (const n of ['stageSvg', 'invEl', 'barEl']) assert.doesNotMatch(src, new RegExp(`${n}\\.innerHTML\\s*=`), `${n} riscritto con innerHTML`);
  // il file è caricato prima di escape-ui nel catalogo
  const cat = fs.readFileSync(path.join(root, 'src/games/catalog.js'), 'utf8');
  assert.match(cat, /'dom-patch\.js', 'escape-ui\.js'/);
});
