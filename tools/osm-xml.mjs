// Lettore minimo dell'XML OSM 0.6 (quello dell'API /map), senza dipendenze: nodi, vie e relazioni con i loro tag.
// Più tasselli si fondono per id (i tasselli adiacenti ripetono le vie che li attraversano).
import fs from 'node:fs';

const ATTR = /(\w+)="([^"]*)"/g;
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
function attrs(s) {
  const o = {};
  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(s))) o[m[1]] = unesc(m[2]);
  return o;
}

export function readOSM(files) {
  const nodes = new Map(), ways = new Map(), rels = new Map();
  let date = '';
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const re = /<(node|way|relation)\b([^>]*?)(\/?)>|<\/(node|way|relation)>|<(tag|nd|member)\b([^>]*?)\/>/g;
    let cur = null, m;
    while ((m = re.exec(text))) {
      if (m[1]) {
        const a = attrs(m[2]), id = +a.id;
        if (a.timestamp && a.timestamp > date) date = a.timestamp;
        if (m[1] === 'node') cur = { id, lon: +a.lon, lat: +a.lat, tags: null };
        else if (m[1] === 'way') cur = { id, nds: [], tags: {} };
        else cur = { id, members: [], tags: {} };
        const store = m[1] === 'node' ? nodes : m[1] === 'way' ? ways : rels;
        if (!store.has(id)) store.set(id, cur); else cur = m[3] ? null : { ...cur, _dup: true };
        if (m[3]) cur = null;
        continue;
      }
      if (m[4]) { cur = null; continue; }
      if (!cur || cur._dup) continue;
      const a = attrs(m[6]);
      if (m[5] === 'tag') { (cur.tags || (cur.tags = {}))[a.k] = a.v; }
      else if (m[5] === 'nd') cur.nds.push(+a.ref);
      else cur.members.push({ type: a.type, ref: +a.ref, role: a.role || '' });
    }
  }
  return { nodes, ways, rels, date };
}
