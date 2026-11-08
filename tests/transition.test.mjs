// Transizione fra home e giochi (src/core/transition.js): parte pura.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, load } from './_load.mjs';

const HH = load('src/core/rng.js', 'src/core/transition.js');
const T = HH.transition;

test('almeno 5 varianti, ognuna con forme definite', () => {
  assert.ok(T.VARIANTS.length >= 5);
  for (const v of T.VARIANTS) {
    assert.ok(T.LOOK[v], v);
    for (const sh of T.LOOK[v].shapes) assert.equal(typeof T.SHAPES[sh], 'function', `${v}: ${sh}`);
  }
});

test('la variante scelta non è mai uguale alla precedente e tutte escono', () => {
  const rnd = HH.rng(7);
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = T.pickVariant(prev, rnd);
    assert.ok(T.VARIANTS.includes(v));
    assert.notEqual(v, prev);
    seen.add(v);
    prev = v;
  }
  assert.equal(seen.size, T.VARIANTS.length);
  // anche coi valori estremi del generatore
  for (const p of T.VARIANTS) {
    assert.notEqual(T.pickVariant(p, () => 0), p);
    assert.notEqual(T.pickVariant(p, () => 0.999999), p);
  }
});

test('particelle deterministiche col seme, in numero ragionevole, che coprono lo schermo', () => {
  for (const v of T.VARIANTS) {
    for (const aspect of [402 / 874, 874 / 402, 1]) {
      const a = T.particles(v, 1234, { aspect }), b = T.particles(v, 1234, { aspect });
      assert.deepEqual(a, b, `${v} non deterministico`);
      assert.notDeepEqual(T.particles(v, 99, { aspect }), a, `${v}: il seme non cambia nulla`);
      assert.ok(a.length >= 20 && a.length <= 64, `${v} @${aspect.toFixed(2)}: ${a.length} particelle`);
      // copertura: ogni punto di una griglia fitta dello schermo cade dentro (il cerchio inscritto di) una particella
      const vw = aspect >= 1 ? aspect : 1, vh = aspect >= 1 ? 1 : 1 / aspect;   // vmin per 1 vw / 1 vh (/100)
      for (let gx = 0; gx <= 100; gx += 5) for (let gy = 0; gy <= 100; gy += 5) {
        const hit = a.some((p) => {
          const dx = (gx - p.rest.x) * vw, dy = (gy - p.rest.y) * vh;   // in vmin
          return Math.hypot(dx, dy) <= p.size * 0.75;
        });
        assert.ok(hit, `${v} @${aspect.toFixed(2)}: buco in ${gx},${gy}`);
      }
      for (const p of a) {
        assert.ok(T.LOOK[v].shapes.includes(p.shape));
        assert.ok(p.inDelay >= 0 && p.inDelay + p.inDur <= T.timing(false).cover);
        assert.ok(p.outDelay >= 0 && p.outDelay + p.outDur <= T.timing(false).reveal);
        assert.equal(p.rest.o, 1);
        assert.equal(p.from.o, 0);
        assert.equal(p.to.o, 0);
      }
    }
  }
});

test('RTL: i movimenti orizzontali si specchiano', () => {
  const l = T.particles('petals', 5, { aspect: 0.5 }), r = T.particles('petals', 5, { aspect: 0.5, rtl: true });
  l.forEach((p, i) => {
    assert.equal(r[i].rest.x, p.rest.x);
    assert.ok(Math.abs((r[i].from.x - p.rest.x) + (p.from.x - p.rest.x)) < 1e-9);
  });
});

test('durata: breve (0,9–1,2 s), dissolvenza ancora più breve con movimento ridotto', () => {
  const n = T.timing(false), q = T.timing(true);
  assert.ok(n.total >= 900 && n.total <= 1200, `durata ${n.total}`);
  assert.equal(n.total, n.cover + n.reveal);
  assert.ok(q.total < 450);
});

test('forme SVG: colori solo da variabili di design (definite nei due temi)', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  for (const [v, look] of Object.entries(T.LOOK)) {
    for (const sh of look.shapes) for (const tint of look.tints) {
      const svg = T.shapeSVG(sh, tint || '--accent');
      assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(svg), `${v}/${sh}: colore letterale`);
      for (const m of svg.matchAll(/var\((--[a-z0-9-]+)\)/g)) assert.ok(css.includes(m[1] + ':'), `${m[1]} non definita in styles.css`);
    }
  }
  // ogni token --tr-* del tema chiaro c'è anche nei due blocchi del tema scuro
  const light = new Set([...css.split('@media (prefers-color-scheme: dark)')[0].matchAll(/(--tr-[a-z0-9-]+):/g)].map((m) => m[1]));
  const darkA = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf(':root[data-theme="dark"]'));
  const darkB = css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf('* { box-sizing'));
  assert.ok(light.size >= 10);
  for (const k of light) { assert.ok(darkA.includes(k + ':'), `${k} manca nel tema scuro (media)`); assert.ok(darkB.includes(k + ':'), `${k} manca in data-theme=dark`); }
});

test('nucleo: in index.html, nella shell offline, e usata da app.js per entrare e uscire', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  assert.ok(html.includes('<script src="src/core/transition.js"></script>'));
  assert.ok(sw.includes("'src/core/transition.js'"));
  assert.ok(html.indexOf('src/core/transition.js') < html.indexOf('src/app.js'));
  // lo schermo intero si chiede dentro il tocco, prima della transizione (che è asincrona)
  const open = app.slice(app.indexOf('function openGame('), app.indexOf('function showGame('));
  assert.ok(open.indexOf('autoFull();') > 0 && open.indexOf('autoFull();') < open.indexOf('HH.transition.run('));
  assert.ok(/function goHome\(how\)[\s\S]*?HH\.transition\.run\(/.test(app));
});
