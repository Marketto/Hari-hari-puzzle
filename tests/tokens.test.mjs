// Token CSS dei giochi: nessun custom property definito a :root da due giochi diversi (né da un gioco e dal nucleo).
// I token di tutti i giochi stanno insieme in src/games/tokens.css (caricato all'avvio) e i css dei giochi si
// aggiungono a pagina man mano che si aprono: con lo stesso nome a :root vince l'ultimo caricato e un gioco prende i
// colori dell'altro (è successo tra Fix-It House e Hari Fishing, entrambi con --fi-*: ora la pesca usa --fsh-*).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const games = path.join(root, 'src/games');

// custom property dichiarati in regole il cui selettore è solo :root (anche :root:not(...) / :root[...]), dentro o
// fuori da @media; i selettori con un discendente (":root .x") non contano
function rootProps(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Set();
  const re = /([^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sels = m[1].split(',').map((x) => x.replace(/@media[^{]*$/, '').trim()).filter(Boolean);
    if (!sels.length || !sels.every((sl) => /^:root(:not\([^)]*\)|\[[^\]]*\])*$/.test(sl))) continue;
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:/g)) out.add(d[1]);
  }
  return out;
}
// gioco a cui appartiene un file css: "fixit-scene-kitchen.css" → fixit, "rally-mp.css" → rally
const owner = (f) => f.replace(/\.css$/, '').split('-')[0];

function check(sources) {
  const by = new Map();
  for (const [who, props] of sources) for (const p of props) { if (!by.has(p)) by.set(p, new Set()); by.get(p).add(who); }
  return [...by].filter(([, w]) => w.size > 1).map(([p, w]) => `${p}: ${[...w].join(' + ')}`);
}

test('css dei giochi: nessun token a :root in comune tra due giochi o col nucleo', () => {
  const src = [['nucleo', rootProps(fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8'))]];
  const per = new Map();
  for (const f of fs.readdirSync(games).filter((x) => x.endsWith('.css') && x !== 'tokens.css')) {
    const o = owner(f);
    if (!per.has(o)) per.set(o, new Set());
    for (const p of rootProps(fs.readFileSync(path.join(games, f), 'utf8'))) per.get(o).add(p);
  }
  src.push(...per);
  const dup = check(src);
  assert.deepEqual(dup, [], `token in comune:\n${dup.join('\n')}`);
});

test('tokens.css (generato): ogni sezione di gioco ha token suoi, che non toccano il nucleo', () => {
  const css = fs.readFileSync(path.join(games, 'tokens.css'), 'utf8');
  const parts = css.split(/^\/\* ([\w-]+) \*\/$/m);
  const src = [['nucleo', rootProps(fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8'))]];
  for (let i = 1; i < parts.length; i += 2) src.push([parts[i], rootProps(parts[i + 1])]);
  assert.ok(src.length > 10, 'sezioni dei giochi trovate');
  assert.ok(src.some(([w, p]) => w === 'fish' && p.has('--fsh-water')) && src.some(([w, p]) => w === 'fixit' && p.has('--fi-water')));
  const dup = check(src);
  assert.deepEqual(dup, [], `token in comune:\n${dup.join('\n')}`);
});

test('il controllo trova davvero i doppioni', () => {
  const a = rootProps(':root { --x-a: 1; } @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --x-b: 2; } } :root .k { --x-c: 3; }');
  assert.deepEqual([...a].sort(), ['--x-a', '--x-b']);
  assert.deepEqual(check([['uno', a], ['due', new Set(['--x-b'])]]), ['--x-b: uno + due']);
});
