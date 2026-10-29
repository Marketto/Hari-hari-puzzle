// Hari Taxi: dai dati OpenStreetMap grezzi (in cache, scaricati una volta con tools/osm-taxi-fetch.mjs) ai file dati
// compatti delle mappe reali, src/games/drive-map-<id>.js (caricati in lazy load solo scegliendo quella mappa),
// più l'elenco src/games/drive-maps.js (nomi, misure, anteprima per il selettore, attribuzione).
//   node tools/osm-taxi.mjs --cache DIR [ostia|desenzano ...] [--png DIR]
// Riproducibile: stessi file in cache → stessi file di uscita. Nessuna dipendenza.
//
// Modello del gioco (vedi docs/games/drive.md, "Mappe reali"): griglia di caselle (1 casella = MAPS[id].m metri)
// con le zone colorate rasterizzate (mare/lago, sabbia, parchi, campi, piazze, pontili, parcheggi, binari) e un
// GRAFO STRADALE vettoriale (incroci + tratti come polilinee in caselle, categoria, senso unico, nome) da cui il gioco
// ricava le caselle percorribili, le corsie del traffico e i marciapiedi. Edifici come poligoni semplificati (solo
// grafica), luoghi notevoli (POI) come punti con tipo e nome.
// Semplificazioni: incroci vicini fusi, nodi intermedi tolti, polilinee alla Douglas-Peucker, solo la componente
// stradale connessa principale, edifici minuscoli scartati, coordinate a 1/4 di casella.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { readOSM } from './osm-xml.mjs';
import { MAPS } from './osm-taxi-maps.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const CACHE = opt('--cache') || '.osm-cache';
const PNG = opt('--png');
const ids = args.filter((a, i) => !a.startsWith('--') && !['--cache', '--png'].includes(args[i - 1]));

/* ---------- classi delle zone (raster) — stesse costanti in drive-logic.js ---------- */
export const A = { LAND: 0, PARK: 1, SAND: 2, WATER: 3, PLAZA: 4, PIER: 5, PARKING: 6, FIELD: 7, RAIL: 8 };
// categorie delle strade: 0 grande (trunk/primary) · 1 secondary · 2 tertiary · 3 residenziale · 4 servizio · 5 pedonale
const RCLASS = {
  trunk: 0, trunk_link: 0, primary: 0, primary_link: 0, motorway_link: 0,
  secondary: 1, secondary_link: 1, tertiary: 2, tertiary_link: 2,
  unclassified: 3, residential: 3, road: 3, living_street: 4, service: 4, pedestrian: 5,
};
const POIK = ['food', 'cafe', 'gelato', 'bakery', 'shop', 'depot', 'taxi', 'station', 'beach', 'pier', 'castle', 'harbour', 'sight', 'square', 'park', 'school', 'church', 'hotel'];

/* ---------- utilità ---------- */
const closed = (w) => w.nds.length > 3 && w.nds[0] === w.nds[w.nds.length - 1];
function dp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [i, j] = st.pop();
    const [ax, ay] = pts[i], [bx, by] = pts[j], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    let best = -1, bd = eps;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) / L;
      if (d > bd) { bd = d; best = k; }
    }
    if (best >= 0) { keep[best] = 1; st.push([i, best], [best, j]); }
  }
  return pts.filter((_, k) => keep[k]);
}
// anello chiuso: diviso nel punto più lontano dal primo, Douglas-Peucker sulle due metà (senza il punto di chiusura)
function dpRing(p, eps) {
  let far = 1, fd = -1;
  p.forEach((v, k) => { const d = (v[0] - p[0][0]) ** 2 + (v[1] - p[0][1]) ** 2; if (d > fd) { fd = d; far = k; } });
  return dp(p.slice(0, far + 1), eps).concat(dp(p.slice(far), eps).slice(1, -1));
}
const plen = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
const area2 = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return a / 2; };
// unisce le vie di un multipoligono in anelli chiusi (estremi uguali)
function rings(list) {
  const segs = list.map((s) => s.slice()), out = [];
  while (segs.length) {
    let r = segs.pop();
    let grew = true;
    while (r[0] !== r[r.length - 1] && grew) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], end = r[r.length - 1];
        if (s[0] === end) r = r.concat(s.slice(1));
        else if (s[s.length - 1] === end) r = r.concat(s.slice().reverse().slice(1));
        else if (s[s.length - 1] === r[0]) r = s.concat(r.slice(1));
        else if (s[0] === r[0]) r = s.slice().reverse().concat(r.slice(1));
        else continue;
        segs.splice(i, 1); grew = true; break;
      }
    }
    if (r[0] === r[r.length - 1] && r.length > 3) out.push(r);
  }
  return out;
}

/* ---------- codifica compatta: varint (zigzag) → base64 ---------- */
class Bytes {
  constructor() { this.a = []; }
  u(v) { v = Math.max(0, Math.round(v)); while (v >= 128) { this.a.push((v & 127) | 128); v = Math.floor(v / 128); } this.a.push(v); }
  z(v) { v = Math.round(v); this.u(v < 0 ? -2 * v - 1 : 2 * v); }
  b64() { return Buffer.from(this.a).toString('base64'); }
}

/* ---------- PNG minimo (per controllare a occhio il raster) ---------- */
function png(file, w, h, rgb) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/* ---------- costruzione di una mappa ---------- */
export function build(id, cache = CACHE) {
  const M = MAPS[id];
  const dir = path.join(cache, id);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.osm')).sort().map((f) => path.join(dir, f));
  const o = readOSM(files);
  const [lon0, lat0, lon1, lat1] = M.crop || M.bbox;
  const kx = (111320 * Math.cos(((lat0 + lat1) / 2) * Math.PI / 180)) / M.m, ky = 110574 / M.m;
  const W = Math.ceil((lon1 - lon0) * kx), H = Math.ceil((lat1 - lat0) * ky);
  const P = (n) => [(n.lon - lon0) * kx, (lat1 - n.lat) * ky];
  const pts = (nds) => nds.map((r) => o.nodes.get(r)).filter(Boolean).map(P);
  const inside = ([x, y], m = 0) => x >= m && y >= m && x <= W - m && y <= H - m;
  const log = [];

  /* ----- zone ----- */
  const area = new Uint8Array(W * H);
  // riempimento poligoni (pari-dispari sui centri delle caselle), più anelli insieme
  function fillPolys(polys, cls, only = null) {
    const edges = [];
    let y0 = H, y1 = 0;
    for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) { edges.push([p[j], p[i]]); y0 = Math.min(y0, p[i][1]); y1 = Math.max(y1, p[i][1]); }
    for (let ty = Math.max(0, Math.floor(y0)); ty <= Math.min(H - 1, Math.ceil(y1)); ty++) {
      const cy = ty + 0.5, xs = [];
      for (const [a, b] of edges) if ((a[1] > cy) !== (b[1] > cy)) xs.push(a[0] + ((cy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let tx = Math.max(0, Math.ceil(xs[k] - 0.5)); tx <= Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); tx++) {
          const i = ty * W + tx;
          if (!only || only(area[i])) area[i] = cls;
        }
      }
    }
  }
  function stroke(p, r, fn) {
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
      for (let ty = Math.max(0, Math.floor(Math.min(ay, by) - r)); ty <= Math.min(H - 1, Math.floor(Math.max(ay, by) + r)); ty++) {
        for (let tx = Math.max(0, Math.floor(Math.min(ax, bx) - r)); tx <= Math.min(W - 1, Math.floor(Math.max(ax, bx) + r)); tx++) {
          const cx = tx + 0.5, cy = ty + 0.5, t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / L2));
          if ((cx - ax - t * dx) ** 2 + (cy - ay - t * dy) ** 2 <= r * r) fn(ty * W + tx);
        }
      }
    }
  }
  const classOf = (t) => {
    if (!t) return -1;
    if (t.building || t['building:part']) return -1;
    const n = t.natural, l = t.landuse, le = t.leisure, a = t.amenity;
    if (n === 'water' || l === 'basin' || l === 'reservoir' || t.waterway === 'riverbank' || le === 'swimming_pool' || (le === 'marina' && n === 'water')) return A.WATER;
    if (n === 'beach' || n === 'sand' || le === 'beach_resort') return A.SAND;
    if (t.man_made === 'pier' || t.man_made === 'breakwater' || (t.highway === 'pedestrian' && /pontile/i.test(t.name || ''))) return A.PIER;
    if (t.highway === 'pedestrian' || t.place === 'square' || a === 'marketplace') return A.PLAZA;
    if (a === 'parking') return A.PARKING;
    if (['park', 'garden', 'pitch', 'playground', 'recreation_ground', 'dog_park', 'golf_course', 'nature_reserve', 'common'].includes(le)) return A.PARK;
    if (['grass', 'forest', 'village_green', 'recreation_ground', 'cemetery', 'flowerbed', 'allotments'].includes(l) || ['wood', 'scrub', 'grassland', 'heath', 'wetland', 'tree_row'].includes(n)) return A.PARK;
    if (['farmland', 'meadow', 'orchard', 'vineyard', 'farmyard', 'greenfield', 'plant_nursery', 'greenhouse_horticulture', 'brownfield'].includes(l)) return A.FIELD;
    if (l === 'railway') return A.RAIL;
    return -1;
  };
  const ORDER = [A.FIELD, A.PARK, A.PARKING, A.RAIL, A.PLAZA, A.SAND, A.WATER, A.PIER];
  const byCls = new Map(ORDER.map((c) => [c, []]));
  for (const w of o.ways.values()) {
    if (!closed(w)) continue;
    const c = classOf(w.tags);
    if (c >= 0 && (w.tags.area !== 'no')) byCls.get(c).push([pts(w.nds)]);
  }
  for (const r of o.rels.values()) {
    if (r.tags.type !== 'multipolygon') continue;
    const c = classOf(r.tags);
    if (c < 0) continue;
    const list = r.members.filter((m) => m.type === 'way' && o.ways.has(m.ref)).map((m) => o.ways.get(m.ref).nds);
    const rr = rings(list).map((x) => pts(x));
    if (rr.length) byCls.get(c).push(rr);
  }
  for (const c of ORDER) for (const polys of byCls.get(c)) fillPolys(polys, c);
  // linee vettoriali per la grafica (estremi tondi, niente scalini): moli/pontili (0) e binari (1); poligoni dei pontili
  const vlines = [], vpolys = [];
  for (const polys of byCls.get(A.PIER)) for (const p of polys) if (p.length > 3) vpolys.push(dpRing(p, 0.15));
  // linee con spessore: binari, canali, fiumi, moli
  for (const w of o.ways.values()) {
    const t = w.tags;
    if ((t.man_made === 'pier' || t.man_made === 'breakwater') && !closed(w)) vlines.push({ k: 0, pts: dp(pts(w.nds), 0.15) });
    else if (t.railway === 'rail' && !t.tunnel && t.service !== 'yard' && t.service !== 'siding') vlines.push({ k: 1, pts: dp(pts(w.nds), 0.3) });
  }
  for (const w of o.ways.values()) {
    const t = w.tags;
    if (t.railway === 'rail' && !t.tunnel) stroke(pts(w.nds), 0.7, (i) => { if (area[i] !== A.WATER) area[i] = A.RAIL; });
    else if (t.waterway === 'canal' || t.waterway === 'river' || t.waterway === 'stream') stroke(pts(w.nds), t.waterway === 'stream' ? 0.5 : t.waterway === 'river' ? 4 : 1.2, (i) => { area[i] = A.WATER; });
    else if ((t.man_made === 'pier' || t.man_made === 'breakwater') && !closed(w)) stroke(pts(w.nds), 0.55, (i) => { area[i] = A.PIER; });
  }
  // mare e lago: linea di costa e rive come barriere, poi riempimento dai semi
  const wall = new Uint8Array(W * H);
  const shore = [];
  for (const w of o.ways.values()) if (w.tags.natural === 'coastline') shore.push(w);
  for (const r of o.rels.values()) if (r.tags.natural === 'water' && (r.tags.water === 'lake' || r.tags.water === 'river' || /garda/i.test(r.tags.name || ''))) for (const m of r.members) if (m.type === 'way' && o.ways.has(m.ref)) shore.push(o.ways.get(m.ref));
  for (const w of shore) stroke(pts(w.nds), 0.75, (i) => { wall[i] = 1; });
  const sea = new Uint8Array(W * H), q = [];
  for (const [lon, lat] of M.water) {
    const [x, y] = P({ lon, lat }), i = Math.floor(y) * W + Math.floor(x);
    if (i >= 0 && i < W * H && !wall[i] && !sea[i]) { sea[i] = 1; q.push(i); }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W;
    for (const j of [x + 1 < W ? i + 1 : -1, x > 0 ? i - 1 : -1, i + W < W * H ? i + W : -1, i - W]) if (j >= 0 && !wall[j] && !sea[j]) { sea[j] = 1; q.push(j); }
  }
  let nsea = 0;
  for (let i = 0; i < W * H; i++) if (sea[i] || (wall[i] && ((sea[i - 1] || 0) + (sea[i + 1] || 0) + (sea[i - W] || 0) + (sea[i + W] || 0)) >= 2)) { if (area[i] !== A.PIER) area[i] = A.WATER; nsea++; }
  {
    const [x, y] = P({ lon: M.land[0], lat: M.land[1] });
    if (sea[Math.floor(y) * W + Math.floor(x)] && !process.env.OSM_DEBUG) throw new Error(`${id}: il mare è entrato in città (riempimento oltre la costa)`);
  }
  log.push(`acqua ${(100 * nsea / (W * H)).toFixed(1)}% della mappa`);

  /* ----- strade: grafo ----- */
  const roadWays = [];
  for (const w of o.ways.values()) {
    const t = w.tags, c = RCLASS[t.highway];
    if (c == null || t.area === 'yes' || t.tunnel === 'yes' || t.tunnel === 'building_passage') continue;
    if (t.highway === 'service' && (['driveway', 'parking_aisle', 'drive-through', 'emergency_access'].includes(t.service) || ['private', 'no'].includes(t.access))) continue;
    if (['private', 'no'].includes(t.access) && c < 5 && t.highway !== 'service') continue;
    const one = t.junction === 'roundabout' || t.oneway === 'yes' || t.oneway === '1' || t.oneway === 'true' ? 1 : t.oneway === '-1' ? -1 : 0;
    roadWays.push({ w, c, one, name: t.name || '' });
  }
  const use = new Map();
  for (const { w } of roadWays) w.nds.forEach((n, i) => use.set(n, (use.get(n) || 0) + (i === 0 || i === w.nds.length - 1 ? 2 : 1)));
  const gid = new Map(), gnodes = [];
  const nodeOf = (ref) => { if (!gid.has(ref)) { gid.set(ref, gnodes.length); gnodes.push({ p: P(o.nodes.get(ref)), ref }); } return gid.get(ref); };
  let edges = [];
  const MARGIN = 1.5;
  for (const { w, c, one, name } of roadWays) {
    let cur = [];
    const flush = () => {
      if (cur.length >= 2) {
        const a = nodeOf(cur[0]), b = nodeOf(cur[cur.length - 1]);
        edges.push({ a, b, pts: cur.map((r) => P(o.nodes.get(r))), c, one, name });
      }
      cur = [];
    };
    for (let i = 0; i < w.nds.length; i++) {
      const r = w.nds[i], n = o.nodes.get(r);
      if (!n || !inside(P(n), MARGIN)) { flush(); continue; }
      cur.push(r);
      if (i > 0 && i < w.nds.length - 1 && use.get(r) >= 2 && cur.length >= 2) { flush(); cur.push(r); }
    }
    flush();
  }
  log.push(`vie ${roadWays.length} → tratti ${edges.length}`);
  // anelli chiusi con un solo incrocio: si spezzano a metà
  for (const e of edges.slice()) if (e.a === e.b && e.pts.length >= 3) {
    const k = Math.floor(e.pts.length / 2), mid = gnodes.length;
    gnodes.push({ p: e.pts[k], ref: -mid });
    edges.push({ ...e, a: mid, b: e.b, pts: e.pts.slice(k) });
    Object.assign(e, { b: mid, pts: e.pts.slice(0, k + 1) });
  }
  // incroci vicini fusi (cluster con diametro limitato)
  const par = gnodes.map((_, i) => i), bb = gnodes.map((n) => [n.p[0], n.p[1], n.p[0], n.p[1]]);
  const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const sorted = edges.map((e) => ({ e, L: plen(e.pts) })).sort((x, y) => x.L - y.L);
  for (const { e, L } of sorted) {
    if (L >= 2.6) break;
    const ra = find(e.a), rb = find(e.b);
    if (ra === rb) continue;
    const u = [Math.min(bb[ra][0], bb[rb][0]), Math.min(bb[ra][1], bb[rb][1]), Math.max(bb[ra][2], bb[rb][2]), Math.max(bb[ra][3], bb[rb][3])];
    if (u[2] - u[0] > 4.2 || u[3] - u[1] > 4.2) continue;
    par[rb] = ra; bb[ra] = u;
  }
  const cent = new Map();
  gnodes.forEach((n, i) => { const r = find(i); const c = cent.get(r) || [0, 0, 0]; c[0] += n.p[0]; c[1] += n.p[1]; c[2]++; cent.set(r, c); });
  edges = edges.filter((e) => find(e.a) !== find(e.b) || plen(e.pts) > 6).map((e) => {
    const a = find(e.a), b = find(e.b), ca = cent.get(a), cb = cent.get(b);
    const p = e.pts.slice(); p[0] = [ca[0] / ca[2], ca[1] / ca[2]]; p[p.length - 1] = [cb[0] / cb[2], cb[1] / cb[2]];
    return { ...e, a, b, pts: p };
  });
  // doppioni (stessi estremi, lunghezza simile): resta il più importante
  {
    const seen = new Map();
    edges = edges.filter((e) => {
      const k = e.a < e.b ? `${e.a},${e.b}` : `${e.b},${e.a}`, L = plen(e.pts);
      const prev = seen.get(k);
      if (prev && Math.abs(prev.L - L) < Math.max(1.5, 0.3 * L)) { if (e.c < prev.e.c) prev.e.c = e.c; if (!prev.e.name) prev.e.name = e.name; if (prev.e.one !== e.one) prev.e.one = 0; return false; }
      if (!prev) seen.set(k, { e, L });
      return true;
    });
  }
  const incident = () => { const m = new Map(); edges.forEach((e, i) => { for (const n of [e.a, e.b]) { if (!m.has(n)) m.set(n, []); m.get(n).push(i); } }); return m; };
  // nodi di passaggio (2 tratti) tolti: un tratto solo, con la categoria più importante e il nome del pezzo più lungo
  for (let pass = 0; pass < 4; pass++) {
    const inc = incident(), dead = new Set();
    for (const [n, list] of inc) {
      if (list.length !== 2) continue;
      const [i, j] = list;
      if (dead.has(i) || dead.has(j) || i === j) continue;
      const e = edges[i], f = edges[j];
      if ((e.c === 5) !== (f.c === 5) || e.a === e.b || f.a === f.b) continue;
      const pe = e.b === n ? e.pts : e.pts.slice().reverse(), pf = f.a === n ? f.pts : f.pts.slice().reverse();
      const ea = e.b === n ? e.a : e.b, fb = f.a === n ? f.b : f.a;
      if (ea === fb) continue;
      const oe = e.b === n ? e.one : -e.one, of = f.a === n ? f.one : -f.one;
      const Le = plen(e.pts), Lf = plen(f.pts);
      edges[i] = { a: ea, b: fb, pts: pe.concat(pf.slice(1)), c: Math.min(e.c, f.c), one: oe === of ? oe : 0, name: (Le >= Lf ? e.name : f.name) || e.name || f.name };
      dead.add(j);
      // il tratto j non esiste più: chi lo usava altrove non c'è (n aveva solo questi due)
    }
    if (!dead.size) break;
    edges = edges.filter((_, k) => !dead.has(k));
  }
  // vicoli ciechi cortissimi tolti
  for (let pass = 0; pass < 3; pass++) {
    const inc = incident();
    const before = edges.length;
    edges = edges.filter((e) => !(plen(e.pts) < 3 && ((inc.get(e.a) || []).length === 1 || (inc.get(e.b) || []).length === 1)));
    if (edges.length === before) break;
  }
  // componente connessa principale (strade carrabili); i tratti pedonali restano se toccano la rete
  {
    const inc = incident(), comp = new Map();
    let best = -1, bestSize = 0, cid = 0;
    for (const [n0] of inc) {
      if (comp.has(n0)) continue;
      const st = [n0]; comp.set(n0, cid); let size = 0;
      while (st.length) {
        const n = st.pop();
        for (const i of inc.get(n)) {
          const e = edges[i];
          if (e.c === 5) continue;
          size += plen(e.pts);
          for (const m of [e.a, e.b]) if (!comp.has(m)) { comp.set(m, cid); st.push(m); }
        }
      }
      if (size > bestSize) { bestSize = size; best = cid; }
      cid++;
    }
    const before = edges.length;
    edges = edges.filter((e) => (e.c !== 5 ? comp.get(e.a) === best : comp.get(e.a) === best || comp.get(e.b) === best));
    log.push(`componente principale: ${edges.length}/${before} tratti`);
  }
  // pedonali staccati dalla rete (entrambi gli estremi fuori) già esclusi; nodi rinumerati
  const keepN = new Map(), nodes = [];
  for (const e of edges) for (const k of ['a', 'b']) {
    if (!keepN.has(e[k])) { keepN.set(e[k], nodes.length); const c = cent.get(e[k]) || [gnodes[e[k]].p[0], gnodes[e[k]].p[1], 1]; nodes.push([c[0] / c[2], c[1] / c[2]]); }
    e[k] = keepN.get(e[k]);
  }
  for (const e of edges) { e.pts = dp(e.pts, 0.3); e.pts[0] = nodes[e.a]; e.pts[e.pts.length - 1] = nodes[e.b]; }
  // semafori: nodi OSM highway=traffic_signals → incrocio più vicino (con almeno 3 strade) entro ~30 m
  const deg = new Array(nodes.length).fill(0);
  for (const e of edges) { deg[e.a]++; deg[e.b]++; }
  const lit = new Uint8Array(nodes.length);
  const near = (x, y, r) => { let bi = -1, bd = r * r; nodes.forEach(([nx, ny], i) => { const d = (nx - x) ** 2 + (ny - y) ** 2; if (d < bd && deg[i] >= 3) { bd = d; bi = i; } }); return bi; };
  let nsig = 0;
  for (const n of o.nodes.values()) if (n.tags && n.tags.highway === 'traffic_signals') { const [x, y] = P(n); if (!inside([x, y])) continue; const i = near(x, y, 30 / M.m); if (i >= 0) { lit[i] = 1; nsig++; } }
  // e agli incroci grandi tra strade importanti (come nella città di Hari, dove ogni incrocio a 3–4 ha il semaforo)
  {
    const imp = new Array(nodes.length).fill(0);
    for (const e of edges) if (e.c <= 2) { imp[e.a]++; imp[e.b]++; }
    for (let i = 0; i < nodes.length; i++) if (deg[i] >= 4 && imp[i] >= 3) lit[i] = 1;
  }
  log.push(`incroci ${nodes.length}, tratti ${edges.length}, semafori ${[...lit].filter(Boolean).length} (${nsig} da OSM)`);

  /* ----- edifici ----- */
  const blds = [];
  const addB = (p, t) => {
    if (p.length < 4) return;
    // anello: si divide nel punto più lontano dal primo, poi Douglas-Peucker sulle due metà
    const q = dpRing(p, 0.2);
    if (q.length < 3) return;
    const a = Math.abs(area2(q));
    if (a < 0.5 || !q.every((v) => inside(v, -1))) return;
    const lv = Math.max(1, Math.min(15, Math.round(+t['building:levels'] || (t.building === 'house' || t.building === 'garage' ? 1 : t.building === 'apartments' ? 4 : 2))));
    const kind = t.building === 'church' || t.amenity === 'place_of_worship' ? 1 : ['industrial', 'warehouse', 'hangar'].includes(t.building) ? 2 : 0;
    blds.push({ q, lv, kind });
  };
  for (const w of o.ways.values()) if (w.tags.building && closed(w)) addB(pts(w.nds), w.tags);
  for (const r of o.rels.values()) if (r.tags.type === 'multipolygon' && r.tags.building) {
    const outer = r.members.filter((m) => m.type === 'way' && m.role !== 'inner' && o.ways.has(m.ref)).map((m) => o.ways.get(m.ref).nds);
    for (const ring of rings(outer)) addB(pts(ring), r.tags);
  }
  // ordine stabile per posizione (meglio per la compressione delta)
  const cx = (b) => b.q[0][0], cy = (b) => b.q[0][1];
  blds.sort((x, y) => Math.floor(cy(x) / 16) - Math.floor(cy(y) / 16) || cx(x) - cx(y));

  /* ----- luoghi notevoli ----- */
  const pois = [];
  const centroid = (p) => { let x = 0, y = 0; for (const v of p) { x += v[0]; y += v[1]; } return [x / p.length, y / p.length]; };
  const poiKind = (t) => {
    if (!t) return null;
    const a = t.amenity, sh = t.shop;
    if (a === 'ice_cream' || sh === 'ice_cream' || /gelat/i.test(t.name || '') || t.cuisine === 'ice_cream') return 'gelato';
    if (a === 'restaurant' || a === 'fast_food' || a === 'food_court') return 'food';
    if (a === 'cafe' || a === 'bar' || a === 'pub' || a === 'biergarten') return 'cafe';
    if (sh === 'bakery' || sh === 'pastry' || sh === 'confectionery') return 'bakery';
    if (a === 'post_office' || ['warehouse', 'industrial'].includes(t.building) || t.office === 'courier' || sh === 'wholesale') return 'depot';
    if (a === 'taxi') return 'taxi';
    if (t.railway === 'station' || t.railway === 'halt') return 'station';
    if (t.historic === 'castle') return 'castle';
    if (t.highway === 'pedestrian' && /pontile/i.test(t.name || '')) return 'pier';
    if (/pontile/i.test(t.name || '') && (t.tourism || t.man_made)) return 'pier';
    if ((t.leisure === 'marina' || t.landuse === 'harbour' || t.harbour === 'yes') && t.name) return 'harbour';
    if ((t.natural === 'beach' || t.leisure === 'beach_resort')) return 'beach';
    if (sh && sh !== 'vacant') return 'shop';
    if (t.place === 'square' && t.name) return 'square';
    if (t.leisure === 'park' && t.name) return 'park';
    if (a === 'school' || a === 'kindergarten') return 'school';
    if (a === 'place_of_worship' && t.name) return 'church';
    if ((t.tourism === 'hotel' || t.tourism === 'guest_house') && t.name) return 'hotel';
    if ((t.tourism === 'attraction' || t.tourism === 'museum' || t.tourism === 'viewpoint' || (t.historic && t.historic !== 'memorial')) && t.name) return 'sight';
    return null;
  };
  for (const n of o.nodes.values()) {
    const k = poiKind(n.tags);
    if (!k) continue;
    const p = P(n);
    if (inside(p, 2)) pois.push({ k, p, name: n.tags.name || '' });
  }
  for (const w of o.ways.values()) {
    const k = poiKind(w.tags);
    if (!k) continue;
    const p = pts(w.nds);
    if (!p.length) continue;
    const c = centroid(closed(w) ? p.slice(0, -1) : p);
    // il pontile: il punto dove tocca la terra (vicino al lungomare), non il centro sul mare
    if (k === 'pier' && closed(w)) {
      let best = p[0], bd = 1e9;
      for (const v of p) { const i = Math.floor(v[1]) * W + Math.floor(v[0]); let d = 0; for (let r = 1; r < 12 && area[i] === A.WATER; r++) d = r; if (area[i] !== A.WATER && d < bd) { bd = d; best = v; } }
      // estremo verso terra: il punto del contorno più lontano dal mare
      let far = null, fd = -1;
      for (const v of p) { let dist = 0; for (let r = 1; r <= 14; r++) { const i = Math.floor(v[1] - r) * W + Math.floor(v[0]); if (i < 0 || area[i] === A.WATER) break; dist = r; } if (dist > fd) { fd = dist; far = v; } }
      void best;
      if (inside(far || c, 2)) pois.push({ k, p: far || c, name: w.tags.name || '' });
      continue;
    }
    if (inside(c, 2)) pois.push({ k, p: c, name: w.tags.name || '' });
  }
  // spiagge senza nome troppo vicine tra loro: una ogni 20 caselle circa
  const keepP = [];
  for (const p of pois) {
    if (['beach', 'shop', 'school'].includes(p.k) && keepP.some((q) => q.k === p.k && Math.hypot(q.p[0] - p.p[0], q.p[1] - p.p[1]) < (p.k === 'beach' ? 18 : 3))) continue;
    keepP.push(p);
  }
  pois.length = 0; pois.push(...keepP);
  log.push(`edifici ${blds.length}, luoghi ${pois.length} (${POIK.map((k) => `${k} ${pois.filter((p) => p.k === k).length}`).filter((s) => !s.endsWith(' 0')).join(', ')})`);
  for (const mk of M.marks) if (!pois.some((p) => p.k === mk.k && mk.re.test(p.name))) log.push(`ATTENZIONE: luogo ${mk.k} ${mk.re} non trovato`);

  /* ----- codifica ----- */
  const names = [], nameIx = new Map();
  const nm = (s) => { if (!s) return 0; if (!nameIx.has(s)) { nameIx.set(s, names.length + 1); names.push(s); } return nameIx.get(s); };
  const Q = 4;   // coordinate a 1/4 di casella
  // zone: corse (lunghezza × 16 + classe)
  const za = new Bytes();
  for (let i = 0; i < W * H;) { const c = area[i]; let j = i + 1; while (j < W * H && area[j] === c) j++; za.u((j - i) * 16 + c); i = j; }
  const zn2 = new Bytes();
  let px = 0, py = 0;
  nodes.forEach(([x, y], i) => { const X = Math.round(x * Q), Y = Math.round(y * Q); zn2.z(X - px); zn2.z(Y - py); px = X; py = Y; zn2.u(lit[i]); });
  const ze = new Bytes();
  for (const e of edges) {
    ze.u(e.a); ze.u(e.b);
    ze.u(e.c * 3 + (e.one === 1 ? 1 : e.one === -1 ? 2 : 0));
    ze.u(nm(e.name));
    const inner = e.pts.slice(1, -1);
    ze.u(inner.length);
    let lx = Math.round(e.pts[0][0] * Q), ly = Math.round(e.pts[0][1] * Q);
    for (const [x, y] of inner) { const X = Math.round(x * Q), Y = Math.round(y * Q); ze.z(X - lx); ze.z(Y - ly); lx = X; ly = Y; }
  }
  const zb = new Bytes();
  px = 0; py = 0;
  for (const b of blds) {
    zb.u((b.q.length - 3) * 64 + b.lv * 4 + b.kind);
    // primo punto: delta dal primo punto dell'edificio precedente; gli altri dal punto prima (a 1/2 casella)
    b.q.forEach(([x, y]) => { const X = Math.round(x * 2), Y = Math.round(y * 2); zb.z(X - px); zb.z(Y - py); px = X; py = Y; });
    px = Math.round(b.q[0][0] * 2); py = Math.round(b.q[0][1] * 2);
  }
  // linee e poligoni vettoriali (1/4 di casella, delta dal punto prima)
  const zv = new Bytes();
  {
    let lx = 0, ly = 0;
    const put = (k, p) => { const q = p.filter((v) => inside(v, -20)); if (q.length < 2) return; zv.u(k); zv.u(q.length); for (const [x, y] of q) { const X = Math.round(x * 4), Y = Math.round(y * 4); zv.z(X - lx); zv.z(Y - ly); lx = X; ly = Y; } };
    for (const l of vlines) put(l.k, l.pts);
    for (const p of vpolys) put(2, p);
    // mura dei castelli (historic=castle chiusi)
    for (const w of o.ways.values()) if (w.tags.historic === 'castle' && closed(w)) put(3, dpRing(pts(w.nds), 0.15));
  }
  const zp = new Bytes();
  px = 0; py = 0;
  const sp = pois.slice().sort((a, b) => a.p[1] - b.p[1] || a.p[0] - b.p[0]);
  for (const p of sp) { const X = Math.round(p.p[0] * Q), Y = Math.round(p.p[1] * Q); zp.u(POIK.indexOf(p.k)); zp.z(X - px); zp.z(Y - py); px = X; py = Y; zp.u(nm(p.name)); }
  // anteprima per il selettore: 1 pixel ogni ~8 caselle (classe più frequente; strade sopra)
  const S = Math.max(4, Math.ceil(Math.max(W, H) / 96)), pw = Math.ceil(W / S), ph = Math.ceil(H / S);
  const road = new Uint8Array(W * H);
  for (const e of edges) stroke(e.pts, e.c <= 2 ? 1.4 : 0.9, (i) => { road[i] = 1; });
  const prev = [];
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const cnt = new Array(10).fill(0);
    let r = 0, b = 0;
    for (let yy = y * S; yy < Math.min(H, (y + 1) * S); yy++) for (let xx = x * S; xx < Math.min(W, (x + 1) * S); xx++) { cnt[area[yy * W + xx]]++; r += road[yy * W + xx]; }
    void b;
    let c = 0;
    for (let k = 1; k < 9; k++) if (cnt[k] > cnt[c]) c = k;
    prev.push(r > S * 1.2 && c !== A.WATER ? 9 : c);
  }
  const pv = new Bytes();
  for (let i = 0; i < prev.length;) { const c = prev[i]; let j = i + 1; while (j < prev.length && prev[j] === c) j++; pv.u((j - i) * 16 + c); i = j; }
  const anchors = [];
  for (const k of M.start) {
    const list = pois.filter((p) => p.k === k && (!M.marks.find((m) => m.k === k) || M.marks.find((m) => m.k === k).re.test(p.name)));
    if (list.length) anchors.push(sp.indexOf(list[0]));
  }
  const data = {
    v: 1, id, name: M.name, W, H, m: M.m, bbox: M.crop || M.bbox, date: o.date.slice(0, 10), extracted: M.extracted,
    area: za.b64(), nodes: zn2.b64(), edges: ze.b64(), blds: zb.b64(), vec: zv.b64(), pois: zp.b64(), poiKinds: POIK, names, anchors,
  };
  const preview = { w: pw, h: ph, rle: pv.b64() };
  return { data, preview, log, W, H, area, road, edges, nodes, lit, blds, pois: sp };
}

function header(id, M, date) {
  return `/* Hari Taxi — mappa reale "${M.name}" (GENERATO da tools/osm-taxi.mjs: non modificare a mano).
 * Dati derivati da OpenStreetMap, © OpenStreetMap contributors, disponibili con licenza ODbL 1.0
 * (https://opendatacommons.org/licenses/odbl/1-0/) — https://www.openstreetmap.org/copyright
 * Estrazione: API OSM 0.6 il ${M.extracted}, area ${(M.crop || M.bbox).join(', ')} (lon/lat min, max), modifiche OSM fino al ${date}.
 * Vedi docs/osm-attribution.md.
 */
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const list = ids.length ? ids : Object.keys(MAPS);
  const reg = {};
  const regFile = path.join(ROOT, 'src/games/drive-maps.js');
  // elenco esistente (per rigenerare una mappa sola senza perdere le altre)
  try { const old = fs.readFileSync(regFile, 'utf8').match(/HH\.driveMapList = (\[[\s\S]*?\]);/); if (old) for (const m of JSON.parse(old[1])) reg[m.id] = m; } catch (e) { /* primo giro */ }
  for (const id of list) {
    const t = Date.now();
    const r = build(id);
    const M = MAPS[id];
    const js = `${header(id, M, r.data.date)}(function (G) {\n  const HH = (G.HH = G.HH || {});\n  (HH.driveMaps = HH.driveMaps || {})[${JSON.stringify(id)}] = ${JSON.stringify(r.data)};\n})(typeof globalThis !== 'undefined' ? globalThis : window);\n`;
    const out = path.join(ROOT, `src/games/drive-map-${id}.js`);
    fs.writeFileSync(out, js);
    console.log(`${id}: ${r.W}×${r.H} caselle da ${M.m} m · ${(js.length / 1024).toFixed(0)} KB (zone ${(r.data.area.length / 1024).toFixed(0)}, strade ${((r.data.edges.length + r.data.nodes.length) / 1024).toFixed(0)}, edifici ${(r.data.blds.length / 1024).toFixed(0)}, luoghi ${(r.data.pois.length / 1024).toFixed(0)}, nomi ${(JSON.stringify(r.data.names).length / 1024).toFixed(0)}) · ${Date.now() - t} ms`);
    for (const l of r.log) console.log('  ' + l);
    reg[id] = { id, name: M.name, file: `src/games/drive-map-${id}.js`, W: r.W, H: r.H, m: M.m, date: r.data.date, extracted: M.extracted, bbox: M.crop || M.bbox, bytes: js.length, preview: r.preview };
    if (PNG) {
      fs.mkdirSync(PNG, { recursive: true });
      const COL = [[236, 226, 210], [150, 210, 130], [245, 222, 160], [110, 180, 235], [240, 235, 225], [190, 140, 100], [200, 200, 210], [205, 225, 160], [150, 140, 150]];
      const rgb = Buffer.alloc(r.W * r.H * 3);
      for (let i = 0; i < r.W * r.H; i++) { const c = r.road[i] ? [90, 90, 110] : COL[r.area[i]]; rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; }
      for (const b of r.blds) { const [x, y] = b.q[0]; const i = Math.floor(y) * r.W + Math.floor(x); if (i >= 0 && i < r.W * r.H && !r.road[i]) { rgb[i * 3] = 240; rgb[i * 3 + 1] = 150; rgb[i * 3 + 2] = 170; } }
      for (const p of r.pois) { const i = Math.floor(p.p[1]) * r.W + Math.floor(p.p[0]); if (['pier', 'castle', 'harbour', 'station'].includes(p.k)) for (const d of [0, 1, -1, r.W, -r.W]) { rgb[(i + d) * 3] = 255; rgb[(i + d) * 3 + 1] = 0; rgb[(i + d) * 3 + 2] = 0; } }
      png(path.join(PNG, `${id}.png`), r.W, r.H, rgb);
    }
  }
  const ordered = Object.keys(MAPS).filter((k) => reg[k]).map((k) => reg[k]);
  fs.writeFileSync(regFile, `/* Hari Taxi — elenco delle mappe reali (GENERATO da tools/osm-taxi.mjs: non modificare a mano).
 * Ogni mappa ha il suo file dati, caricato in lazy load solo quando la si sceglie (HH.loadFile). Anteprima a bassa
 * risoluzione per il selettore (classi delle zone, 9 = strade). Dati © OpenStreetMap contributors, ODbL 1.0.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.driveMapList = ${JSON.stringify(ordered)};
})(typeof globalThis !== 'undefined' ? globalThis : window);
`);
}
