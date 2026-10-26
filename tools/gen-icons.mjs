// Genera le icone SVG dell'app dal disegno della mascotte:
//   node tools/gen-icons.mjs   -> assets/icons/*.svg
// Poi rasterizza in PNG (192/512/maskable) con:
//   python3 tools/rasterize-icons.py
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'src/core/mascot.js'), 'utf8'));
const inner = globalThis.HH.mascot.svg({ cls: 'icon' })
  .replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  .replace(/<ellipse class="hari-shadow"[^>]*\/>/, '');
const out = path.join(root, 'assets/icons');
fs.mkdirSync(out, { recursive: true });

const bg = `<defs><linearGradient id="bgx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9e3"/><stop offset="1" stop-color="#c9f2e6"/></linearGradient></defs>`;
// icona standard: riccio su tondo pastello
fs.writeFileSync(path.join(out, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${bg}<rect width="200" height="200" rx="44" fill="url(#bgx)"/><g transform="translate(14 10) scale(.86)">${inner}</g></svg>`);
// maskable: margine di sicurezza 20%
fs.writeFileSync(path.join(out, 'maskable.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${bg}<rect width="200" height="200" fill="url(#bgx)"/><g transform="translate(34 30) scale(.66)">${inner}</g></svg>`);
fs.writeFileSync(path.join(out, 'hari.svg'), globalThis.HH.mascot.svg({ cls: 'hari' }));
console.log('Icone SVG scritte in assets/icons');
