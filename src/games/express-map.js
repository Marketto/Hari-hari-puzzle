/* Hari Express — mappe generate (logica pura, niente DOM): terreno a tasselli con altezze 0..2, acqua (mare attorno
 * all'isola, laghi, fiume), alberi e cespugli, villaggi di animali con le loro strade, industrie.
 * Tutto deterministico dato il seme: la mappa NON si salva, si rigenera dal seme (salvataggio compatto).
 *
 * HH.expressMap
 *   generate(o, rnd)           mappa libera: o = { w, h, water: 0..2, kind: 'island'|'land' }
 *   scenario(level, seed)      mappa di un livello della campagna (siti al posto giusto, verificati raggiungibili)
 *   fromShared(pack, o)        PUNTO D'INGRESSO DELLE MAPPE REALI (fase 3): un pacchetto di src/maps/ (formato comune
 *                              a Hari Taxi e Hari Express, vedi docs/games/express.md) → stessa forma di generate().
 *                              In fase 1 non c'è nessun pacchetto: lancia un errore chiaro.
 *   reach(map, a, b)           a e b collegabili via terra (dislivello ≤ 1, ponti dritti fino a 3 caselle d'acqua)
 *
 * Forma della mappa: { w, h, ht: number[] (0..2), water: 0|1[], tree: 0|1|2[] (albero, cespuglio), roads: { idx: mask },
 *   towns: [{ id, name, x, y, pop, an, houses: idx[] }], inds: [{ id, type, x, y }] } (industrie 2×2 da x,y).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  // tipi di industria: produce (merce primaria o lavorata), accetta, produzione al giorno (24 ore) delle primarie
  const IND = {
    farm: { make: 'milk', prod: 64 },
    dairy: { take: ['milk'], make: 'cheese' },
    field: { make: 'grain', prod: 72 },
    bakery: { take: ['grain'], make: 'bread' },
    forest: { make: 'wood', prod: 64 },
    sawmill: { take: ['wood'], make: 'toys' },
  };
  const ANIMALS = ['bunny', 'cat', 'panda', 'bear', 'duck', 'fox'];
  // nomi dei villaggi: sillabe morbide, uguali in tutte le lingue (nomi propri, non si traducono)
  const SYL = ['mo', 'chi', 'ri', 'ku', 'na', 'pi', 'ya', 'to', 'ma', 'ru', 'ko', 'sa', 'gi', 'ne', 'po', 'mi', 'fu', 'wa', 'yu', 'ta', 'ho', 'ni', 'pu', 'me'];
  function townName(rnd, used) {
    for (let k = 0; k < 40; k++) {
      const n = 2 + (rnd() < 0.45 ? 1 : 0);
      let s = '';
      for (let i = 0; i < n; i++) s += SYL[Math.floor(rnd() * SYL.length)];
      s = s[0].toUpperCase() + s.slice(1);
      if (!used.has(s)) { used.add(s); return s; }
    }
    const s = 'Momo' + used.size; used.add(s); return s;
  }

  /* ---------- rumore a valori (bilineare su griglia grossa) ---------- */
  function noise(w, h, cell, rnd) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = [];
    for (let i = 0; i < gw * gh; i++) g.push(rnd());
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    return out;
  }

  /* ---------- terreno ---------- */
  function terrain(o, rnd) {
    const { w, h } = o, n = w * h, water = o.water == null ? 1 : o.water;
    const ht = new Array(n).fill(0), wat = new Array(n).fill(0), tree = new Array(n).fill(0);
    const hn = noise(w, h, 7, rnd), hn2 = noise(w, h, 3, rnd), wn = noise(w, h, 6, rnd), tn = noise(w, h, 5, rnd);
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, v = hn[i] * 0.75 + hn2[i] * 0.25;
      ht[i] = v > 0.72 ? 2 : v > 0.56 ? 1 : 0;
      // isola: mare lungo il bordo (spessore 1–3 caselle, ondulato)
      if (o.kind === 'island') {
        const e = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (e < 1 + Math.floor(wn[i] * 2.6)) { wat[i] = 1; ht[i] = 0; }
      }
      // laghi nelle zone basse (più acqua → più laghi)
      if (water > 0 && ht[i] === 0 && wn[i] < 0.12 + 0.08 * water && Math.hypot(x - cx, y - cy) > 2) { wat[i] = 1; }
    }
    // fiume: cammino quasi dritto da un bordo all'altro, largo 1 (si attraversa coi ponti)
    if (water > 0) {
      const rivers = water >= 2 ? 2 : 1;
      for (let r = 0; r < rivers; r++) {
        const vert = rnd() < 0.5;
        let p = Math.floor((vert ? w : h) * (0.25 + rnd() * 0.5));
        for (let q = 0; q < (vert ? h : w); q++) {
          const x = vert ? p : q, y = vert ? q : p;
          if (x >= 0 && y >= 0 && x < w && y < h) { const i = y * w + x; wat[i] = 1; ht[i] = 0; }
          if (q % 3 === 2) { const d = rnd(); if (d < 0.3) p--; else if (d > 0.7) p++; p = Math.max(2, Math.min((vert ? w : h) - 3, p)); }
        }
      }
    }
    // mappe nuove (mv ≥ 2): l'acqua è collegata per i lati, mai solo per uno spigolo (il fiume che piega di lato
    // non si spezza in rettangoli staccati). Nessun numero casuale in più: il resto della mappa non cambia.
    // Le mappe dei salvataggi vecchi (mv 1) restano come erano.
    if ((o.mv || 1) >= 2) joinDiagonals(w, h, ht, wat);
    // sponde morbide: niente colline a picco sull'acqua
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (wat[i]) continue;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < w && ny < h && wat[ny * w + nx]) ht[i] = Math.min(ht[i], 1); }
    }
    // niente salti di 2 tra caselle vicine: il 2 accanto allo 0 scende a 1
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      if (ht[i] < 2) continue;
      const x = i % w, y = (i / w) | 0;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < w && ny < h && ht[ny * w + nx] === 0 && !wat[ny * w + nx]) ht[i] = 1; }
    }
    // alberi a gruppi (boschetti) e cespugli sparsi
    for (let i = 0; i < n; i++) {
      if (wat[i]) continue;
      if (tn[i] > 0.66 && rnd() < 0.7) tree[i] = 1;
      else if (rnd() < 0.05) tree[i] = 2;
      else if (rnd() < 0.025) tree[i] = 1;
    }
    return { w, h, ht, water: wat, tree, roads: {}, towns: [], inds: [] };
  }

  // per ogni quadrato 2×2 con l'acqua solo sulla diagonale, una delle altre due caselle diventa acqua (la più bassa,
  // a parità quella in alto); si ripete finché non ce ne sono più (l'acqua cresce soltanto, quindi finisce).
  // free(i) (facoltativo, per i salvataggi vecchi): la casella si può allagare? Se la prima scelta è occupata si prova
  // l'altra; se lo sono tutte e due lo spigolo resta (il disegno ci fa passare un canaletto). Torna le caselle allagate.
  function joinDiagonals(w, h, ht, wat, free) {
    const out = [];
    for (let changed = true; changed;) {
      changed = false;
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const a = y * w + x, b = a + 1, c = a + w, d = c + 1;
        let p = -1, q = -1;
        if (wat[a] && wat[d] && !wat[b] && !wat[c]) { p = b; q = c; }
        else if (wat[b] && wat[c] && !wat[a] && !wat[d]) { p = a; q = d; }
        if (p < 0) continue;
        let k = ht[q] < ht[p] ? q : p;
        if (free && !free(k)) k = k === p ? q : p;
        if (free && !free(k)) continue;
        wat[k] = 1; ht[k] = 0; changed = true; out.push(k);
      }
    }
    return out;
  }
  // l'acqua è collegata per i lati? (test: nessun quadrato 2×2 con l'acqua solo sulla diagonale)
  function diagonalOnly(m) {
    let n = 0;
    for (let y = 0; y < m.h - 1; y++) for (let x = 0; x < m.w - 1; x++) {
      const a = y * m.w + x, b = a + 1, c = a + m.w, d = c + 1, W = m.water;
      if ((W[a] && W[d] && !W[b] && !W[c]) || (W[b] && W[c] && !W[a] && !W[d])) n++;
    }
    return n;
  }

  /* ---------- siti ---------- */
  const inb = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  // spazio per un villaggio: 5×5 di terra con dislivello ≤ 1, lontano dal bordo
  function townOk(m, x, y, used) {
    if (x < 3 || y < 3 || x > m.w - 4 || y > m.h - 4) return false;
    let lo = 9, hi = -1;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const i = (y + dy) * m.w + x + dx;
      if (m.water[i] || used[i]) return false;
      lo = Math.min(lo, m.ht[i]); hi = Math.max(hi, m.ht[i]);
    }
    return hi - lo <= 1;
  }
  // industria 2×2 in piano, con un anello libero attorno
  function indOk(m, x, y, used) {
    if (x < 2 || y < 2 || x > m.w - 4 || y > m.h - 4) return false;
    const h0 = m.ht[y * m.w + x];
    for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) {
      const i = (y + dy) * m.w + x + dx;
      if (m.water[i] || used[i]) return false;
      if (dx >= 0 && dy >= 0 && dx <= 1 && dy <= 1 && m.ht[i] !== h0) return false;
    }
    return true;
  }
  function addTown(m, x, y, pop, rnd, names, used) {
    const id = m.towns.length, w = m.w;
    const t = { id, name: townName(rnd, names), x, y, pop, an: ANIMALS[Math.floor(rnd() * ANIMALS.length)], houses: [] };
    // strade del villaggio: una croce di raggio 2 dal centro
    const arms = [0, 1, 2, 3];
    for (const d of arms) {
      for (let k = 0; k <= 2; k++) {
        const ax = x + DX[d] * k, ay = y + DY[d] * k, i = ay * w + ax;
        const mask = (m.roads[i] || 0) | (k < 2 ? 1 << d : 0) | (k > 0 ? 1 << ((d + 2) & 3) : 0);
        m.roads[i] = mask; m.tree[i] = 0; used[i] = 1;
      }
    }
    m.towns.push(t);
    growHouses(m, t, 3 + Math.floor(pop / 30), rnd, used);
    return t;
  }
  // case attorno al centro, dalla più vicina: le usano anche le città che crescono (deterministico con rnd)
  function houseSpots(m, t, used) {
    const out = [];
    for (let r = 1; r <= 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = t.x + dx, y = t.y + dy;
      if (!inb(m, x, y)) continue;
      const i = y * m.w + x;
      if (m.water[i] || used[i] || m.roads[i]) continue;
      // accanto a una strada o a un'altra casa: il villaggio resta raccolto
      let near = false;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (inb(m, nx, ny) && (m.roads[ny * m.w + nx] || t.houses.includes(ny * m.w + nx))) near = true; }
      if (near) out.push(i);
    }
    return out;
  }
  function growHouses(m, t, target, rnd, used) {
    while (t.houses.length < target) {
      const sp = houseSpots(m, t, used);
      if (!sp.length) return;
      const i = sp[Math.min(sp.length - 1, Math.floor(rnd() * Math.min(sp.length, 4)))];
      t.houses.push(i); used[i] = 1; m.tree[i] = 0;
    }
  }
  function addInd(m, type, x, y, used) {
    const id = m.inds.length;
    m.inds.push({ id, type, x, y });
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const i = (y + dy) * m.w + x + dx; used[i] = 1; m.tree[i] = 0; }
  }
  const tileC = (m, s) => (s.type ? [s.x + 0.5, s.y + 0.5] : [s.x, s.y]);
  const dist = (m, a, b) => { const p = tileC(m, a), q = tileC(m, b); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]); };

  // raggiungibili via terra: BFS con dislivello ≤ 1 e salti d'acqua dritti fino a 3 caselle tra rive alla stessa
  // altezza (i ponti del costruttore)
  function reach(m, a, b) {
    const w = m.w, seen = new Uint8Array(w * m.h), q = [a];
    seen[a] = 1;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi];
      if (i === b) return true;
      const x = i % w, y = (i / w) | 0;
      for (let d = 0; d < 4; d++) {
        let nx = x + DX[d], ny = y + DY[d], k = 0;
        while (inb(m, nx, ny) && m.water[ny * w + nx] && k < 3) { nx += DX[d]; ny += DY[d]; k++; }
        if (!inb(m, nx, ny)) continue;
        const j = ny * w + nx;
        if (m.water[j] || seen[j]) continue;
        if (k === 0 && Math.abs(m.ht[j] - m.ht[i]) > 1) continue;
        if (k > 0 && m.ht[j] !== m.ht[i]) continue;
        seen[j] = 1; q.push(j);
      }
    }
    return false;
  }

  /* ---------- mappa libera ---------- */
  function generate(o, rnd) {
    const m = terrain(o, rnd), used = new Uint8Array(m.w * m.h), names = new Set();
    const area = m.w * m.h;
    const nTowns = Math.max(3, Math.round(area / 260)), nInd = Math.max(6, Math.round(area / 150));
    let tries = 0;
    while (m.towns.length < nTowns && tries++ < 600) {
      const x = 3 + Math.floor(rnd() * (m.w - 6)), y = 3 + Math.floor(rnd() * (m.h - 6));
      if (!townOk(m, x, y, used) || m.towns.some((t) => Math.abs(t.x - x) + Math.abs(t.y - y) < 9)) continue;
      addTown(m, x, y, 120 + Math.floor(rnd() * 260), rnd, names, used);
    }
    const kinds = ['farm', 'dairy', 'field', 'bakery', 'forest', 'sawmill'];
    tries = 0;
    while (m.inds.length < nInd && tries++ < 900) {
      const type = kinds[m.inds.length % kinds.length];
      const x = 2 + Math.floor(rnd() * (m.w - 5)), y = 2 + Math.floor(rnd() * (m.h - 5));
      if (!indOk(m, x, y, used) || m.towns.some((t) => Math.abs(t.x - x) + Math.abs(t.y - y) < 5) || m.inds.some((d) => Math.abs(d.x - x) + Math.abs(d.y - y) < 5)) continue;
      addInd(m, type, x, y, used);
    }
    return m;
  }

  /* ---------- campagna: un modello di mappa per livello ----------
   * sites: siti da piazzare in ordine; near: [indice del sito di prima, distanza min, max] (Manhattan dai centri).
   * Le distanze fanno la difficoltà: tratte più lunghe = più guadagno ma più costi e più tempo. */
  const LEVELS = [
    null,
    { size: 18, water: 1, kind: 'land', sites: [{ k: 'town', pop: 180 }, { k: 'town', pop: 150, near: [0, 8, 11] }] },
    { size: 20, water: 1, kind: 'land', sites: [{ k: 'town', pop: 170 }, { k: 'farm', near: [0, 4, 8] }, { k: 'dairy', near: [1, 7, 10] }] },
    { size: 24, water: 1, kind: 'land', sites: [{ k: 'town', pop: 220 }, { k: 'farm', near: [0, 9, 13] }, { k: 'dairy', near: [1, 6, 9] }, { k: 'town', pop: 140, near: [2, 9, 14] }] },
    { size: 28, water: 1, kind: 'island', sites: [{ k: 'town', pop: 240 }, { k: 'field', near: [0, 9, 14] }, { k: 'bakery', near: [1, 12, 16], open: 1 }, { k: 'town', pop: 160, near: [2, 6, 9] }] },
    { size: 32, water: 1, kind: 'island', sites: [{ k: 'town', pop: 260 }, { k: 'forest', near: [0, 9, 14] }, { k: 'sawmill', near: [1, 12, 16], open: 1 }, { k: 'town', pop: 200, near: [2, 6, 9] }, { k: 'farm', near: [0, 6, 12] }] },
  ];
  function dry(m, a, b, r) {
    const x0 = Math.max(0, Math.min(a.x, b.x) - r), x1 = Math.min(m.w - 1, Math.max(a.x, b.x) + 1 + r);
    const y0 = Math.max(0, Math.min(a.y, b.y) - r), y1 = Math.min(m.h - 1, Math.max(a.y, b.y) + 1 + r);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.water[y * m.w + x]) return false;
    return true;
  }
  // sito → coordinate di riferimento per le distanze e per reach (una casella di terra del sito)
  const anchor = (m, s) => s.y * m.w + s.x;
  // mv = versione della mappa (1: salvataggi fino alla 0.32; 2: acqua collegata per i lati)
  function scenario(level, seed, mv) {
    const L = LEVELS[Math.max(1, Math.min(LEVELS.length - 1, level))];
    for (let attempt = 0; attempt < 60; attempt++) {
      const rnd = HH.rng((seed >>> 0) + attempt * 7919);
      const m = terrain({ w: L.size, h: L.size, water: L.water, kind: L.kind, mv }, rnd);
      const used = new Uint8Array(m.w * m.h), names = new Set(), placed = [];
      let ok = true;
      for (const site of L.sites) {
        let done = null;
        for (let k = 0; k < 400 && !done; k++) {
          const x = 2 + Math.floor(rnd() * (m.w - 4)), y = 2 + Math.floor(rnd() * (m.h - 4));
          const town = site.k === 'town';
          if (town ? !townOk(m, x, y, used) : !indOk(m, x, y, used)) continue;
          const probe = town ? { x, y } : { type: site.k, x, y };
          if (site.near) { const d = dist(m, probe, placed[site.near[0]]); if (d < site.near[1] || d > site.near[2]) continue; }
          if (placed.some((p) => dist(m, probe, p) < 5)) continue;
          // linee ferroviarie: tra i due siti (e 3 caselle attorno) niente acqua, c'è posto per un anello
          if (site.open != null && !dry(m, probe, placed[site.open], 3)) continue;
          if (placed.length && !reach(m, anchor(m, probe), anchor(m, placed[0]))) continue;
          done = town ? addTown(m, x, y, site.pop, rnd, names, used) : (addInd(m, site.k, x, y, used), m.inds[m.inds.length - 1]);
        }
        if (!done) { ok = false; break; }
        placed.push(done);
      }
      if (!ok) continue;
      // contorno: un villaggio e qualche industria lontani, per una mappa viva (non servono all'obiettivo)
      const extra = level >= 3 ? ['town', 'forest', 'field'] : ['field'];
      for (const k of extra) {
        for (let tries = 0; tries < 200; tries++) {
          const x = 2 + Math.floor(rnd() * (m.w - 4)), y = 2 + Math.floor(rnd() * (m.h - 4));
          const town = k === 'town';
          if (town ? !townOk(m, x, y, used) : !indOk(m, x, y, used)) continue;
          const probe = town ? { x, y } : { type: k, x, y };
          if ([...m.towns, ...m.inds].some((p) => dist(m, probe, p) < 7)) continue;
          if (town) addTown(m, x, y, 100 + Math.floor(rnd() * 60), rnd, names, used); else addInd(m, k, x, y, used);
          break;
        }
      }
      m.sites = placed.map((p) => (p.type ? { ind: p.id } : { town: p.id }));
      m.attempt = attempt;
      return m;
    }
    throw new Error('express: no map for level ' + level);
  }

  // mappe reali (fase 3): il modulo condiviso src/maps/ darà un pacchetto { name, bbox, cell, coast, water, roads,
  // rails, places, attribution }; qui si ricaverà la griglia da ~60 m per casella. Ancora non c'è.
  function fromShared(pack) {
    throw new Error('express: real maps arrive in phase 3 (src/maps/' + (pack && pack.name ? pack.name : '?') + ')');
  }

  HH.expressMap = { IND, ANIMALS, DX, DY, generate, scenario, fromShared, reach, diagonalOnly, joinDiagonals, MV: 2, houseSpots, growHouses, LEVELS, noise };
})(typeof globalThis !== 'undefined' ? globalThis : window);
