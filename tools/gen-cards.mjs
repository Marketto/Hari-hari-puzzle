// Genera src/games/cards.js: le illustrazioni delle card dei giochi (stringhe SVG statiche) e i nomi,
// così la home non deve scaricare il codice dei giochi (caricati in lazy load con HH.loadGame).
//   node tools/gen-cards.mjs            scrive il file
//   import { generate } from ...        usato dal test che controlla che il file sia aggiornato
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const CORE = ['src/i18n/locales.js', 'src/core/rng.js', 'src/core/rules.js', 'src/core/core.js', 'src/core/mascot.js', 'src/games/catalog.js'];

export function generate() {
  // ambiente minimo: i file dei giochi si registrano senza DOM; art() è una funzione pura che restituisce SVG
  const stub = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : stub), apply: () => stub, construct: () => stub });
  const ctx = { console, Math, Date, JSON, setTimeout, clearTimeout, performance, document: stub, navigator: { language: 'en' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  ctx.globalThis = ctx.window = ctx.self = ctx;
  vm.createContext(ctx);
  for (const f of CORE) vm.runInContext(read(f), ctx, { filename: f });
  const out = {};
  for (const c of ctx.HH.catalog) {
    for (const f of c.files.filter((x) => x.endsWith('.js'))) vm.runInContext(read(f), ctx, { filename: f });
    const g = ctx.HH.games.find((x) => x.id === c.id);
    if (!g) throw new Error(`${c.id}: il gioco non si registra in HH.games`);
    if (g.name !== c.name) throw new Error(`${c.id}: nome "${g.name}" ≠ catalogo "${c.name}"`);
    out[c.id] = g.art().replace(/\s*\n\s*/g, ' ').trim();
  }
  return `/* GENERATO da tools/gen-cards.mjs (npm run cards): non modificare a mano.
 * Illustrazioni delle card dei giochi, così la home non scarica il codice dei giochi. */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.cardArt = ${JSON.stringify(out, null, 2)};
})(typeof globalThis !== 'undefined' ? globalThis : self);
`;
}

// token di colore dei giochi (:root, tema scuro): servono alle card anche prima di scaricare il gioco
// blocchi CSS di primo livello: [{ sel, body }]
function blocks(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    out.push({ sel: css.slice(i, open).trim(), body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

// CSS caricato all'avvio per le card in home, prima di scaricare i giochi:
//  - token di colore dei giochi (:root e tema scuro)
//  - le regole che usano solo classi presenti nell'illustrazione della card (e le loro @keyframes)
export function tokens(arts) {
  if (!arts) { const c = vm.createContext({}); vm.runInContext(generate(), c); arts = c.HH.cardArt; }
  const c = vm.createContext({});
  vm.runInContext(read('src/games/catalog.js'), c);
  const out = [];
  for (const g of c.HH.catalog) {
    const used = new Set([...(arts[g.id] || '').matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    const keep = [], rules = [], frames = new Map();
    for (const f of g.files.filter((x) => x.endsWith('.css'))) {
      for (const { sel, body } of blocks(read(f))) {
        if (sel.startsWith(':root')) keep.push(`${sel} {${body}}`);
        else if (sel.startsWith('@media') && blocks(body).every((x) => x.sel.startsWith(':root'))) keep.push(`${sel} {${body}}`);
        else if (sel.startsWith('@keyframes')) frames.set(sel.split(/\s+/)[1], `${sel} {${body}}`);
        else if (!sel.startsWith('@')) {
          // ogni selettore della lista deve usare almeno una classe e solo classi dell'illustrazione
          const parts = sel.split(',').map((x) => x.trim());
          const ok = parts.every((p) => { const cl = [...p.matchAll(/\.([\w-]+)/g)].map((m) => m[1]); return cl.length && cl.every((k) => used.has(k)); });
          if (ok) rules.push(`${sel} {${body}}`);
        }
      }
    }
    const anim = new Set(rules.flatMap((r) => [...r.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)].flatMap((m) => m[1].split(/[\s,]+/))));
    const kf = [...frames].filter(([n]) => anim.has(n)).map(([, v]) => v);
    if (keep.length || rules.length) out.push(`/* ${g.id} */\n${[...keep, ...rules, ...kf].join('\n')}`);
  }
  return `/* GENERATO da tools/gen-cards.mjs (npm run cards): non modificare a mano.
 * Token di colore dei giochi (tema chiaro e scuro) e stili delle illustrazioni delle card, caricati all'avvio. */
${out.join('\n')}
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const js = generate();
  fs.writeFileSync(path.join(root, 'src/games/cards.js'), js);
  console.log('src/games/cards.js', (js.length / 1024).toFixed(0) + ' KB');
  const css = tokens();
  fs.writeFileSync(path.join(root, 'src/games/tokens.css'), css);
  console.log('src/games/tokens.css', (css.length / 1024).toFixed(0) + ' KB');
}
