// Scarica (una volta sola) i dati OpenStreetMap grezzi delle mappe reali di Hari Taxi, a tasselli piccoli,
// dall'API ufficiale (https://api.openstreetmap.org/api/0.6/map), nel rispetto della usage policy:
// richieste in sequenza con una pausa, User-Agent descrittivo, tasselli già scaricati mai richiesti di nuovo.
// Solo per lo sviluppo: il gioco non scarica mai nulla (i dati derivati sono in src/games/drive-map-*.js).
//   node tools/osm-taxi-fetch.mjs --cache DIR [ostia|desenzano ...]
// Se l'API risponde 400 (troppi nodi) il tassello viene diviso in 4.
import fs from 'node:fs';
import path from 'node:path';
import { MAPS } from './osm-taxi-maps.mjs';

const args = process.argv.slice(2);
const ci = args.indexOf('--cache');
const CACHE = ci >= 0 ? args[ci + 1] : '.osm-cache';
const ids = args.filter((a, i) => !a.startsWith('--') && i !== ci + 1);
const UA = 'HariHariPuzzle-mapbuilder/1.0 (one-off offline build; https://github.com/marketto/Hari-hari-puzzle)';
const STEP = 0.01;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

export function tiles(bbox, step = STEP) {
  const out = [];
  const [x0, y0, x1, y1] = bbox;
  for (let y = y0; y < y1 - 1e-9; y += step) for (let x = x0; x < x1 - 1e-9; x += step) out.push([+x.toFixed(4), +y.toFixed(4), +Math.min(x1, x + step).toFixed(4), +Math.min(y1, y + step).toFixed(4)]);
  return out;
}
export const tileFile = (cache, id, b) => path.join(cache, id, `${b.join('_')}.osm`);

async function get(id, b) {
  const file = tileFile(CACHE, id, b);
  if (fs.existsSync(file) && fs.statSync(file).size > 100) return 'cached';
  // tassello già diviso in passato: si scaricano i 4 pezzi
  const split = file + '.split';
  if (fs.existsSync(split)) { for (const q of quarters(b)) await get(id, q); return 'split'; }
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${b.join(',')}`;
  requests++;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(1100);
  if (res.status === 400 || res.status === 509) {
    fs.writeFileSync(split, String(res.status));
    for (const q of quarters(b)) await get(id, q);
    return 'split';
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return `${(text.length / 1024).toFixed(0)} KB`;
}
const quarters = ([x0, y0, x1, y1]) => { const mx = +((x0 + x1) / 2).toFixed(5), my = +((y0 + y1) / 2).toFixed(5); return [[x0, y0, mx, my], [mx, y0, x1, my], [x0, my, mx, y1], [mx, my, x1, y1]]; };

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const id of ids.length ? ids : Object.keys(MAPS)) {
    fs.mkdirSync(path.join(CACHE, id), { recursive: true });
    const list = tiles(MAPS[id].bbox);
    for (const [i, b] of list.entries()) console.log(id, `${i + 1}/${list.length}`, b.join(','), await get(id, b));
  }
  console.log('richieste fatte:', requests);
}
