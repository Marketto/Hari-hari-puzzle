// Crea la versione "tutto in un file" dell'app:
//   node tools/build-inline.mjs
// -> dist/hari-hari-puzzle.html  (documento completo, apribile con doppio clic, offline tranne i font)
// -> dist/artifact.html          (frammento senza <html>/<head>/<body>, per anteprime Claude Artifact)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let html = read('index.html');

// versione in un file: dentro ci sono tutti i giochi (niente lazy load), prima di app.js
{
  const ctx = vm.createContext({});
  vm.runInContext(read('src/games/catalog.js'), ctx);
  const files = [...new Set(ctx.HH.catalog.flatMap((g) => g.files))];   // i file condivisi (hog-kit.js, hedgedoku.css) una volta sola
  const css = files.filter((f) => f.endsWith('.css')).map((f) => `<link rel="stylesheet" href="${f}">\n`).join('');
  const js = files.filter((f) => f.endsWith('.js')).map((f) => `<script src="${f}"></script>\n`).join('');
  html = html.replace('<script src="src/app.js"></script>', js + '<script src="src/app.js"></script>').replace('</head>', css + '</head>');
}
html = html.replace(/<!--build:remove-->[\s\S]*?<!--\/build:remove-->\n?/g, '');
html = html.replace(/<link rel="stylesheet" href="(src\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}\n</style>`);
html = html.replace(/<script src="(src\/[^"]+)"><\/script>\n?/g, (_, p) => `<script>\n${read(p).replace(/<\/script/gi, '<\\/script')}\n</script>\n`);
html = html.replace('<script>\n', '<script>window.HH = { INLINE: true };</script>\n<script>\n');
// icona inline
const icon = Buffer.from(read('assets/icons/icon.svg')).toString('base64');
html = html.replace('</title>', `</title>\n<link rel="icon" href="data:image/svg+xml;base64,${icon}">`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/hari-hari-puzzle.html'), html);

const fragment = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '')
  .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '')
  .replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
// titolo per primo (il contratto Artifact legge il <title> nei primi 8KB)
fs.writeFileSync(path.join(root, 'dist/artifact.html'), fragment);
const kb = (f) => (fs.statSync(path.join(root, f)).size / 1024).toFixed(0) + ' KB';
console.log('dist/hari-hari-puzzle.html', kb('dist/hari-hari-puzzle.html'));
console.log('dist/artifact.html', kb('dist/artifact.html'));
