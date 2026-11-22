/* Hari Taxi — mappe reali (OpenStreetMap): decodifica, geometria vettoriale, traffico e pedoni sul grafo, nuovo livello.
 * Logica pura (niente DOM), parte di drive-logic.js: si carica prima e drive-logic.js la monta con HH.driveOsm(DK).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // DK = contesto condiviso con drive-logic.js (nomi stabili + getter/setter dello stato che cambia)
  HH.driveOsm = function (DK) {
    const { TICK, READY, EDGE, STOP_OFF, NPCS, PEDS, config, rand, clamp, nz, wrap, r1, geo, field, tileOf, quadLen,
      newTrip } = DK;
    /* ---------- mappe reali (dati OpenStreetMap preparati da tools/osm-taxi.mjs) ----------
     * HH.driveMaps[id] = dati compatti (zone a corse, grafo stradale, edifici, luoghi, nomi), file caricato in lazy load.
     * Il gioco resta a caselle per Hari (muri, distanze su strada, freccia, minimappa): le caselle percorribili si
     * ricavano dal grafo (larghezza per categoria). Traffico e pedoni seguono il grafo vettoriale: corsie a destra
     * della mezzeria, svolte come curve di Bézier negli incroci, marciapiedi ai lati, strisce agli incroci col semaforo.
     * Lo stato salva solo l'id della mappa (mapId), mai la mappa: niente salvataggi enormi. */
    const AR = { LAND: 0, PARK: 1, SAND: 2, WATER: 3, PLAZA: 4, PIER: 5, PARKING: 6, FIELD: 7, RAIL: 8 };
    const HWC = [1.25, 1.1, 1.0, 0.9, 0.75, 0.75];   // mezza larghezza (casella) per categoria: grande … servizio, pedonale
    const ASPH = 0.3;                                   // asfalto oltre la mezza larghezza
    const SIDE = 0.4;                                   // i pedoni camminano a questa distanza dal bordo della strada
    const isOsm = (s) => !!s.mapId && s.mapId !== 'hari';
    const MD = new Map();
    function bytes(b64) {
      if (typeof G.atob === 'function') { const t = G.atob(b64), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; }
      return new Uint8Array(G.Buffer.from(b64, 'base64'));
    }
    function reader(b64) {
      const a = bytes(b64);
      let i = 0;
      const u = () => { let v = 0, m = 1, b; do { b = a[i++]; v += (b & 127) * m; m *= 128; } while (b & 128); return v; };
      return { u, z: () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; }, end: () => i >= a.length };
    }
    // decodifica (una volta per mappa): zone, incroci, tratti, luoghi
    function mapData(id) {
      if (MD.has(id)) return MD.get(id);
      const R = HH.driveMaps && HH.driveMaps[id];
      if (!R) return null;
      const W = R.W, H = R.H, area = new Uint8Array(W * H);
      { const r = reader(R.area); let i = 0; while (i < W * H && !r.end()) { const v = r.u(), c = v % 16, n = Math.floor(v / 16); area.fill(c, i, i + n); i += n; } }
      const nodes = [];
      { const r = reader(R.nodes); let x = 0, y = 0; while (!r.end()) { x += r.z(); y += r.z(); nodes.push({ x: x / 4, y: y / 4, lit: !!r.u(), inc: [], deg: 0 }); } }
      const edges = [];
      {
        const r = reader(R.edges);
        while (!r.end()) {
          const a = r.u(), b = r.u(), cc = r.u(), name = r.u(), n = r.u();
          const pts = [[nodes[a].x, nodes[a].y]];
          let x = Math.round(nodes[a].x * 4), y = Math.round(nodes[a].y * 4);
          for (let k = 0; k < n; k++) { x += r.z(); y += r.z(); pts.push([x / 4, y / 4]); }
          pts.push([nodes[b].x, nodes[b].y]);
          const c = Math.floor((cc % 18) / 3), o = cc % 3, br = cc >= 18;   // ≥ 18: ponte sopra l'acqua
          const cum = [0];
          for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
          const e = { id: edges.length, a, b, c, one: o === 1 ? 1 : o === 2 ? -1 : 0, name: name ? R.names[name - 1] : '', pts, cum, len: cum[cum.length - 1], hw: HWC[c], slow: c === 5, br };
          edges.push(e);
          nodes[a].inc.push(e.id); nodes[b].inc.push(e.id);
        }
      }
      for (const N of nodes) N.deg = N.inc.length;
      const pois = [];
      { const r = reader(R.pois); let x = 0, y = 0; while (!r.end()) { const k = R.poiKinds[r.u()]; x += r.z(); y += r.z(); const nm = r.u(); pois.push({ id: pois.length, k, x: x / 4, y: y / 4, name: nm ? R.names[nm - 1] : '', spot: -1 }); } }
      const md = { id, name: R.name, W, H, m: R.m, date: R.date, area, nodes, edges, pois, anchors: R.anchors || [], raw: R };
      MD.set(id, md);
      return md;
    }
    // edifici (solo per la grafica): poligoni a 1/2 casella
    function buildings(md) {
      if (md.blds) return md.blds;
      const r = reader(md.raw.blds), out = [];
      let x = 0, y = 0;
      while (!r.end()) {
        const h = r.u(), n = Math.floor(h / 64) + 3, lv = Math.floor((h % 64) / 4), kind = h % 4;
        const p = [];
        let fx = 0, fy = 0;
        for (let k = 0; k < n; k++) { x += r.z(); y += r.z(); p.push([x / 2, y / 2]); if (!k) { fx = x; fy = y; } }
        x = fx; y = fy;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [px, py] of p) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
        out.push({ id: out.length, p, lv, kind, x0, y0, x1, y1 });
      }
      md.blds = out;
      return out;
    }

    // moli, pontili e binari come linee/poligoni vettoriali (solo per la grafica): { k: 'pier'|'rail'|'pierArea'|'castle'|'pond', pts }
    function vectors(md) {
      if (md.vec) return md.vec;
      const out = [];
      if (md.raw.vec) {
        const r = reader(md.raw.vec);
        let x = 0, y = 0;
        while (!r.end()) {
          const k = r.u(), n = r.u(), p = [];
          for (let i = 0; i < n; i++) { x += r.z(); y += r.z(); p.push([x / 4, y / 4]); }
          out.push({ k: ['pier', 'rail', 'pierArea', 'castle', 'pond'][k] || 'pier', pts: p });
        }
      }
      md.vec = out;
      return out;
    }
    // polilinea spostata di off a destra (normale con giunto a mitra limitato)
    function offsetLine(pts, off) {
      if (!off) return pts.map((p) => [p[0], p[1]]);
      const n = pts.length, out = [];
      for (let i = 0; i < n; i++) {
        let nx = 0, ny = 0;
        for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
          if (a < 0 || b >= n) continue;
          const dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1], L = Math.hypot(dx, dy) || 1;
          nx += -dy / L; ny += dx / L;
        }
        const L = Math.hypot(nx, ny) || 1;
        nx /= L; ny /= L;
        // mitra: 1/cos della mezza svolta, al massimo 1,8
        let k = 1;
        if (i > 0 && i < n - 1) { const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], Ls = Math.hypot(dx, dy) || 1; k = Math.min(1.8, 1 / Math.max(0.55, Math.abs(-dy / Ls * nx + dx / Ls * ny))); }
        out.push([pts[i][0] + nx * off * k, pts[i][1] + ny * off * k]);
      }
      return out;
    }
    // tratto di polilinea tra le distanze t0 e t1 (dall'inizio)
    function cut(pts, t0, t1) {
      const out = [];
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
        const s0 = Math.max(t0, acc), s1 = Math.min(t1, acc + L);
        if (s1 >= s0 && L > 0) {
          const p0 = [ax + ((bx - ax) * (s0 - acc)) / L, ay + ((by - ay) * (s0 - acc)) / L], p1 = [ax + ((bx - ax) * (s1 - acc)) / L, ay + ((by - ay) * (s1 - acc)) / L];
          if (!out.length) out.push(p0);
          out.push(p1);
        }
        acc += L;
      }
      if (out.length < 2) { const p = out[0] || pts[0]; return [p, [p[0] + 1e-3, p[1]]]; }
      return out;
    }
    function polyOf(pts) {
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      return { pts, cum, len: cum[cum.length - 1] };
    }
    // punto e direzione a distanza t lungo una polilinea
    function along(P, t) {
      const { pts, cum } = P;
      t = clamp(t, 0, P.len);
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= t) lo = m; else hi = m; }
      const L = cum[hi] - cum[lo] || 1e-9, f = (t - cum[lo]) / L, [ax, ay] = pts[lo], [bx, by] = pts[hi];
      return [ax + (bx - ax) * f, ay + (by - ay) * f, Math.atan2(by - ay, bx - ax)];
    }

    const OG = new Map();
    function geoOsm(s) {
      const id = s.mapId;
      let g = OG.get(id);
      if (g) return g;
      const md = mapData(id);
      if (!md) throw new Error('drive: mappa non caricata ' + id);
      const { W, H, nodes, edges, area } = md;
      // caselle percorribili: tratti con la loro larghezza, incroci un po' più larghi
      const road = new Uint8Array(W * H);
      const stamp = (pts, r, v) => {
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
          for (let ty = Math.max(0, Math.floor(Math.min(ay, by) - r)); ty <= Math.min(H - 1, Math.floor(Math.max(ay, by) + r)); ty++) {
            for (let tx = Math.max(0, Math.floor(Math.min(ax, bx) - r)); tx <= Math.min(W - 1, Math.floor(Math.max(ax, bx) + r)); tx++) {
              const cx = tx + 0.5, cy = ty + 0.5, t = clamp(((cx - ax) * dx + (cy - ay) * dy) / L2, 0, 1);
              if ((cx - ax - t * dx) ** 2 + (cy - ay - t * dy) ** 2 <= r * r) { const k = ty * W + tx; if (v === 1 || !road[k]) road[k] = v; }
            }
          }
        }
      };
      for (const e of edges) if (e.slow) stamp(e.pts, e.hw + ASPH, 2);
      for (const e of edges) if (!e.slow) stamp(e.pts, e.hw + ASPH, 1);
      // raggio dell'incrocio (le corsie si fermano qui, le svolte stanno dentro)
      for (const N of nodes) {
        let hw = 0;
        for (const i of N.inc) if (!edges[i].slow) hw = Math.max(hw, edges[i].hw);
        N.hw = hw || 0.75;
        N.r = N.deg >= 3 ? N.hw + ASPH + 0.35 : N.deg === 1 ? 0.7 : 0.15;
        if (N.deg >= 3 && hw) stamp([[N.x, N.y], [N.x + 1e-3, N.y]], N.hw + ASPH + 0.25, 1);
      }
      // componente principale delle caselle carrabili (per le distanze su strada): il resto non conta per le fermate
      const pass = new Uint8Array(W * H);
      {
        const seen = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H);
        let best = -1, bestN = 0, comp = 0;
        for (let i0 = 0; i0 < W * H; i0++) {
          if (road[i0] !== 1 || seen[i0] >= 0) continue;
          let h = 0, t = 0;
          q[t++] = i0; seen[i0] = comp;
          while (h < t) {
            const i = q[h++], x = i % W;
            for (const j of [x + 1 < W ? i + 1 : -1, x > 0 ? i - 1 : -1, i + W < W * H ? i + W : -1, i - W]) if (j >= 0 && road[j] === 1 && seen[j] < 0) { seen[j] = comp; q[t++] = j; }
          }
          if (t > bestN) { bestN = t; best = comp; }
          comp++;
        }
        for (let i = 0; i < W * H; i++) if (seen[i] === best) pass[i] = 1;
      }
      const solid = new Uint8Array(W * H), nopass = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) { solid[i] = road[i] ? 0 : 1; nopass[i] = pass[i] ? 0 : 1; }
      // collisioni su una griglia 3 volte più fine, larga quanto l'asfalto disegnato (niente bordi invisibili)
      const CS = 3, CW = W * CS, CH2 = H * CS, csolid = new Uint8Array(CW * CH2).fill(1);
      const fine = (pts, r) => {
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
          for (let ty = Math.max(0, Math.floor((Math.min(ay, by) - r) * CS)); ty <= Math.min(CH2 - 1, Math.floor((Math.max(ay, by) + r) * CS)); ty++) {
            for (let tx = Math.max(0, Math.floor((Math.min(ax, bx) - r) * CS)); tx <= Math.min(CW - 1, Math.floor((Math.max(ax, bx) + r) * CS)); tx++) {
              const cx = (tx + 0.5) / CS, cy = (ty + 0.5) / CS, t = clamp(((cx - ax) * dx + (cy - ay) * dy) / L2, 0, 1);
              if ((cx - ax - t * dx) ** 2 + (cy - ay - t * dy) ** 2 <= r * r) csolid[ty * CW + tx] = 0;
            }
          }
        }
      };
      for (const e of edges) fine(e.pts, e.hw + ASPH);
      for (const N of nodes) if (N.deg >= 3) fine([[N.x, N.y], [N.x + 1e-3, N.y]], N.hw + ASPH * 0.6);
      // corsie (tratto orientato de = 2·e + verso): a destra della mezzeria (al centro nei sensi unici), accorciate agli incroci
      const lanes = [], lend = [], lstart = [], grp = [];
      for (const e of edges) for (let dir = 0; dir < 2; dir++) {
        const pts = dir ? e.pts.slice().reverse() : e.pts, n0 = dir ? e.b : e.a, n1 = dir ? e.a : e.b;
        const P = polyOf(offsetLine(pts, e.one ? 0 : 0.5));
        let r0 = nodes[n0].r, r1 = nodes[n1].r;
        const spare = P.len - r0 - r1;
        if (spare < 0.6) { const k = Math.max(0, P.len - 0.6) / Math.max(1e-6, r0 + r1); r0 *= k; r1 *= k; }
        const L = polyOf(cut(P.pts, r0, P.len - r1));
        L.ok = !e.slow && (e.one === 0 || (e.one === 1) === (dir === 0));
        lanes.push(L); lstart.push(n0); lend.push(n1);
      }
      // gruppi del semaforo: per ogni incrocio, direzione di riferimento = la strada più importante
      const outAng = (n, e) => { const p = e.a === n ? e.pts : e.pts.slice().reverse(); return Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]); };
      nodes.forEach((N, n) => {
        let ref = null, best = 1e9;
        for (const i of N.inc) { const e = edges[i]; const sc = e.c * 1000 - e.len; if (sc < best) { best = sc; ref = outAng(n, e); } }
        N.ref = ref || 0;
      });
      for (let de = 0; de < lanes.length; de++) {
        const e = edges[de >> 1], n = lend[de];
        grp[de] = Math.abs(Math.cos(outAng(n, e) - nodes[n].ref)) >= Math.SQRT1_2 ? 0 : 1;
      }
      // uscite dagli incroci per il traffico
      const out = nodes.map((N, n) => N.inc.flatMap((i) => { const e = edges[i]; const ds = []; if (e.a === n) ds.push(2 * i); if (e.b === n) ds.push(2 * i + 1); return ds; }).filter((de) => lanes[de].ok));
      // indice spaziale dei tratti (celle da 8 caselle)
      const EC = 8, ew = Math.ceil(W / EC), eh = Math.ceil(H / EC), egrid = Array.from({ length: ew * eh }, () => []);
      for (const e of edges) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [x, y] of e.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        e.box = [x0 - 2, y0 - 2, x1 + 2, y1 + 2];
        for (let cy = clamp(Math.floor((y0 - 2) / EC), 0, eh - 1); cy <= clamp(Math.floor((y1 + 2) / EC), 0, eh - 1); cy++) for (let cx = clamp(Math.floor((x0 - 2) / EC), 0, ew - 1); cx <= clamp(Math.floor((x1 + 2) / EC), 0, ew - 1); cx++) egrid[cy * ew + cx].push(e.id);
      }
      // fermate: lungo i tratti carrabili, sui due lati, ogni ~3,5 caselle (non vicino agli incroci)
      const spots = [];
      const areaAt = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < W && ty < H ? area[ty * W + tx] : AR.WATER; };
      const passAt = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < W && ty < H && pass[ty * W + tx] === 1; };
      const C = edges.map((e) => polyOf(e.pts));
      for (const e of edges) {
        if (e.slow) continue;
        const t0 = nodes[e.a].r + 1.1, t1 = e.len - nodes[e.b].r - 1.1;
        for (let t = t0; t <= t1; t += 3.5) {
          const [cx, cy, a] = along(C[e.id], t), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
          for (const sd of [1, -1]) {
            const lo = e.one ? 0.42 : 0.5, zx = cx + nx * sd * lo, zy = cy + ny * sd * lo;
            const off = e.hw + ASPH + SIDE, x = cx + nx * sd * off, y = cy + ny * sd * off;
            if (!passAt(zx, zy)) continue;
            const ar = areaAt(cx + nx * sd * (off + 0.9), cy + ny * sd * (off + 0.9));
            if (ar === AR.WATER || areaAt(x, y) === AR.WATER) continue;
            const k = ar === AR.PARK || ar === AR.FIELD ? 'park' : ar === AR.SAND ? 'beach' : 'bld';
            const ang = sd > 0 ? a : wrap(a + Math.PI);
            const h = Math.round(((ang + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 2)) % 4;
            spots.push({ id: spots.length, b: e.id, x: r1(x * 10) / 10, y: r1(y * 10) / 10, zx: r1(zx * 10) / 10, zy: r1(zy * 10) / 10, h, a: +ang.toFixed(3), k, e: e.id, sd, poi: -1 });
          }
        }
      }
      // luoghi notevoli → fermata più vicina (la più vicina al marciapiede, entro 7 caselle)
      const SC = 8, sw = Math.ceil(W / SC), sh = Math.ceil(H / SC), sgrid = Array.from({ length: sw * sh }, () => []);
      for (const p of spots) sgrid[clamp(Math.floor(p.y / SC), 0, sh - 1) * sw + clamp(Math.floor(p.x / SC), 0, sw - 1)].push(p.id);
      const nearSpot = (x, y, R) => {
        let best = -1, bd = R * R;
        for (let cy = Math.floor((y - R) / SC); cy <= Math.floor((y + R) / SC); cy++) for (let cx = Math.floor((x - R) / SC); cx <= Math.floor((x + R) / SC); cx++) {
          if (cx < 0 || cy < 0 || cx >= sw || cy >= sh) continue;
          for (const id of sgrid[cy * sw + cx]) { const p = spots[id]; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = id; } }
        }
        return best;
      };
      const WIDE = { duomo: 1, fountain: 1, temple: 1, theatre: 1, market: 1 };
      const RANK = { pier: 9, castle: 9, duomo: 9, fountain: 9, temple: 9, theatre: 9, market: 8, harbour: 8, station: 8, beach: 7, taxi: 7, depot: 6, gelato: 5, food: 5, bakery: 5, cafe: 4, sight: 4, square: 4, park: 3, church: 3, hotel: 2, school: 2, shop: 1 };
      for (const P of md.pois.slice().sort((a, b) => (RANK[b.k] || 0) - (RANK[a.k] || 0))) {
        // i monumenti nel cuore pedonale (duomo, fonte, tempio, teatro, mercato di Ortigia) prendono la fermata
        // carrabile più vicina anche un po' più lontano (14 caselle); gli altri luoghi entro 7 come sempre
        const id = nearSpot(P.x, P.y, WIDE[P.k] ? 14 : 7);
        if (id < 0) continue;
        P.spot = id;
        if (spots[id].poi < 0) spots[id].poi = P.id;
      }
      g = {
        osm: true, md, key: 'osm:' + id, W, H, solid, nopass, cs: CS, csolid, road, pass, area, nodes, edges, center: C, lanes, lstart, lend, grp, out, egrid, EC, ew, eh,
        blocks: [], spots, nearSpot, walks: new Map(), turns: new Map(), nodeAt: () => -1, at: () => EDGE, df: new Map(), dfMax: 10,
        cell: 2, bw: Math.ceil(W / 2), bh: Math.ceil(H / 2),
      };
      g.buckets = Array.from({ length: g.bw * g.bh }, () => []);
      g.used = [];
      OG.set(id, g);
      return g;
    }
    // marciapiede di un lato del tratto (sd = +1 a destra andando da a verso b), con il tratto percorribile [ua, ub]
    function walkOf(g, e, sd) {
      const k = 2 * e + (sd > 0 ? 0 : 1);
      let w = g.walks.get(k);
      if (w) return w;
      const E = g.edges[e], A = g.nodes[E.a], B = g.nodes[E.b];
      w = polyOf(offsetLine(E.pts, sd * (E.hw + ASPH + SIDE)));
      w.ua = Math.min(w.len / 2, A.deg >= 3 ? A.r - 0.1 : 0.25);
      w.ub = Math.max(w.len / 2, w.len - (B.deg >= 3 ? B.r - 0.1 : 0.25));
      g.walks.set(k, w);
      return w;
    }
    // svolta da de1 (arriva all'incrocio) a de2 (riparte): Bézier quadratica tra la fine e l'inizio delle due corsie
    function turnOf(g, d1, d2) {
      const key = d1 * 65536 + d2;
      let T = g.turns.get(key);
      if (T) return T;
      const A = g.lanes[d1], B = g.lanes[d2], pa = A.pts, pb = B.pts;
      const p0 = pa[pa.length - 1], q0 = pa[pa.length - 2], p2 = pb[0], q2 = pb[1];
      let tx = p0[0] - q0[0], ty = p0[1] - q0[1], L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      let ux = q2[0] - p2[0], uy = q2[1] - p2[1]; L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
      const mx = (p0[0] + p2[0]) / 2, my = (p0[1] + p2[1]) / 2;
      let c = [mx, my];
      if (d2 === (d1 ^ 1)) c = [mx + tx * 1.1, my + ty * 1.1];
      else {
        const cr = tx * uy - ty * ux, Dx = p2[0] - p0[0], Dy = p2[1] - p0[1];
        if (Math.abs(cr) > 0.2) {
          const u = (Dx * uy - Dy * ux) / cr, v = -(Dx * ty - Dy * tx) / cr;
          if (u > 0.05 && u < 4 && v > 0.05 && v < 4) c = [p0[0] + tx * u, p0[1] + ty * u];
        }
      }
      T = { p0, c, p2, len: Math.max(0.3, quadLen(p0, c, p2)) };
      g.turns.set(key, T);
      return T;
    }
    function chooseTurnO(s, g, n, d) {
      const outs = g.out[n], back = d ^ 1;
      let opts = outs.filter((x) => x !== back);
      if (!opts.length) opts = outs.length ? outs : [back];
      if (opts.length === 1) return opts[0];
      const A = g.lanes[d].pts, a0 = Math.atan2(A[A.length - 1][1] - A[A.length - 2][1], A[A.length - 1][0] - A[A.length - 2][0]);
      const dev = opts.map((x) => { const B = g.lanes[x].pts; return Math.abs(wrap(Math.atan2(B[1][1] - B[0][1], B[1][0] - B[0][0]) - a0)); });
      const m = Math.min(...dev), w = dev.map((v) => (v === m ? 2 : 1)), tot = w.reduce((a, b) => a + b, 0);
      let r = rand(s) * tot;
      for (let k = 0; k < opts.length; k++) { r -= w[k]; if (r < 0) return opts[k]; }
      return opts[opts.length - 1];
    }
    // traffico e pedoni solo attorno a Hari ("bolla"): chi resta troppo lontano rinasce fuori dalla vista, più avanti
    const NPC_R = [16, 30, 34], PED_R2 = [13, 22, 25];
    function spawnNpcO(s, g, kind, rmin, rmax) {
      const K = NPCS[kind], c = s.car;
      for (let tries = 0; tries < 50; tries++) {
        const an = rand(s) * Math.PI * 2, rr = rmin + rand(s) * (rmax - rmin);
        const px = c.x + Math.cos(an) * rr, py = c.y + Math.sin(an) * rr;
        if (px < 0 || py < 0 || px >= g.W || py >= g.H) continue;
        const cell = g.egrid[Math.floor(py / g.EC) * g.ew + Math.floor(px / g.EC)];
        if (!cell.length) continue;
        const e = cell[Math.floor(rand(s) * cell.length)], de = 2 * e + (rand(s) < 0.5 ? 0 : 1);
        const L = g.lanes[de];
        if (!L.ok || L.len < K.len + STOP_OFF + 0.4) continue;
        const v = { id: ++s.seq, k: kind, c: Math.floor(rand(s) * 6), n0: g.lstart[de], d: de, n1: g.lend[de], sg: 0, d2: de, s: 0, len: L.len, x: 0, y: 0, a: 0, v: 0, vm: +(K.vmax * (0.88 + rand(s) * 0.24)).toFixed(2), wait: 0, ghost: 0, bonk: 0, honk: 0, bk: 0, why: '' };
        v.s = r1(K.len / 2 + rand(s) * (L.len - K.len - STOP_OFF));
        const [x, y, a] = along(L, v.s);
        const dc = Math.hypot(x - c.x, y - c.y);
        if (dc < Math.max(5, rmin * 0.75) || dc > rmax + 8) continue;
        if (s.npcs.some((o) => Math.hypot(o.x - x, o.y - y) < (NPCS[o.k].len + K.len) / 2 + 0.6)) continue;
        v.x = nz(x); v.y = nz(y); v.a = nz(a); v.v = v.vm * 0.5;
        return v;
      }
      return null;
    }
    function spawnPedO(s, g, rmin, rmax) {
      const c = s.car;
      for (let tries = 0; tries < 40; tries++) {
        const an = rand(s) * Math.PI * 2, rr = rmin + rand(s) * (rmax - rmin);
        const px = c.x + Math.cos(an) * rr, py = c.y + Math.sin(an) * rr;
        if (px < 0 || py < 0 || px >= g.W || py >= g.H) continue;
        const cell = g.egrid[Math.floor(py / g.EC) * g.ew + Math.floor(px / g.EC)];
        if (!cell.length) continue;
        const e = cell[Math.floor(rand(s) * cell.length)], sd = rand(s) < 0.5 ? 1 : -1, w = walkOf(g, e, sd);
        if (w.ub - w.ua < 0.6) continue;
        const u = w.ua + rand(s) * (w.ub - w.ua), [x, y] = along(w, u);
        const tx = Math.floor(x), ty = Math.floor(y);
        if (tx < 0 || ty < 0 || tx >= g.W || ty >= g.H || g.area[ty * g.W + tx] === AR.WATER) continue;
        if (Math.hypot(x - c.x, y - c.y) < Math.min(4, rmin)) continue;
        return { id: ++s.seq, k: Math.floor(rand(s) * PEDS.length), b: e, e, sd, u: r1(u), dir: rand(s) < 0.5 ? -1 : 1, sp: +(0.7 + rand(s) * 0.3).toFixed(2), st: 0, x: nz(x), y: nz(y), cr: null, cw: null, tt: 0, scared: 0 };
      }
      return null;
    }
    function bubble(s, g) {
      const c = s.car;
      for (let i = 0; i < s.npcs.length; i++) {
        const v = s.npcs[i];
        if (Math.hypot(v.x - c.x, v.y - c.y) < NPC_R[2]) continue;
        const nv = spawnNpcO(s, g, v.k, NPC_R[0], NPC_R[1]);
        if (nv) s.npcs[i] = nv;
      }
      for (let i = 0; i < s.peds.length; i++) {
        const p = s.peds[i];
        if (p.st !== 0 || Math.hypot(p.x - c.x, p.y - c.y) < PED_R2[2]) continue;
        const np = spawnPedO(s, g, PED_R2[0], PED_R2[1]);
        if (np) s.peds[i] = np;
      }
    }
    // pedone sulle mappe reali: cammina sul marciapiede di un tratto; all'incrocio gira l'angolo verso il marciapiede
    // vicino oppure (col semaforo) attraversa il tratto sulle strisce col suo verde
    function pedTickO(s, g, p) {
      const dt = TICK;
      if (p.cw) {
        const L = Math.hypot(p.cw.x1 - p.cw.x0, p.cw.y1 - p.cw.y0) || 1;
        p.cw.q = Math.min(1, p.cw.q + (p.sp * dt) / L);
        p.x = nz(p.cw.x0 + (p.cw.x1 - p.cw.x0) * p.cw.q); p.y = nz(p.cw.y0 + (p.cw.y1 - p.cw.y0) * p.cw.q);
        if (p.cw.q >= 1) p.cw = null;
        return;
      }
      const w = walkOf(g, p.e, p.sd);
      p.u += p.dir * p.sp * dt;
      if (p.u > w.ub || p.u < w.ua) {
        p.u = clamp(p.u, w.ua, w.ub);
        const E = g.edges[p.e], n = p.dir > 0 ? E.b : E.a, N = g.nodes[n];
        const [x0, y0] = along(w, p.u);
        if (N.lit && N.deg >= 3 && N.deg <= 4 && E.len >= 2 * N.r + 1 && rand(s) < 0.5) {   // dove ci sono le strisce
          const w2 = walkOf(g, p.e, -p.sd), u2 = p.dir > 0 ? w2.ub : w2.ua, [x1, y1] = along(w2, u2);
          const din = 2 * p.e + (E.b === n ? 0 : 1);
          p.x = nz(x0); p.y = nz(y0); p.st = 1; p.tt = 0;
          p.cr = { n, ph: 1 - g.grp[din], x0, y0, x1, y1, b0: { e: p.e, sd: p.sd, u: r1(p.u), dir: -p.dir }, b1: { e: p.e, sd: -p.sd, u: r1(u2), dir: -p.dir }, q: 0 };
          return;
        }
        let best = null, bd = 3.6 * 3.6;
        for (const f of N.inc) {
          if (f === p.e && N.deg > 1) continue;
          const F = g.edges[f];
          for (const sd of [1, -1]) {
            if (f === p.e && sd === p.sd) continue;
            const w3 = walkOf(g, f, sd), u3 = F.a === n ? w3.ua : w3.ub, [x, y] = along(w3, u3);
            const tx = Math.floor(x), ty = Math.floor(y);
            if (tx < 0 || ty < 0 || tx >= g.W || ty >= g.H || g.area[ty * g.W + tx] === AR.WATER) continue;
            const d = (x - x0) ** 2 + (y - y0) ** 2;
            if (d < bd) { bd = d; best = { e: f, sd, u: u3, dir: F.a === n ? 1 : -1, x, y }; }
          }
        }
        if (best && N.deg > 1) {
          p.cw = { x0, y0, x1: best.x, y1: best.y, q: 0 };
          p.e = best.e; p.b = best.e; p.sd = best.sd; p.u = r1(best.u); p.dir = best.dir;
          return;
        }
        p.dir = -p.dir;
      }
      const [x, y] = along(w, p.u);
      p.x = nz(x); p.y = nz(y);
    }



    // mappe reali: ogni livello parte da un luogo notevole diverso (pontile, stazione, castello, porto…), le corse
    // restano nei dintorni; ristoranti e deposito sono i più vicini a quel punto
    function newLevelOsm(level, rnd, mapId) {
      const cfg = config(level, mapId);
      const md = mapData(mapId);
      if (!md) throw new Error('drive: mappa non caricata ' + mapId);
      const s = {
        v: 1, mapId, level: cfg.level, type: cfg.type, veh: cfg.veh, N: cfg.jobs, batch: cfg.batch,
        W: md.W, H: md.H, t: 0, ticks: 0, acc: 0, ready: READY, wait: false, waitMode: false, inp: null,
        car: { x: 0, y: 0, a: 0, v: 0, rev: false }, inv: 0, bumpT: 0, bonkT: 0,
        npcs: [], peds: [], trip: null, rest: [], depot: -1, last: -1, home: -1,
        done: 0, oops: 0, mistakes: 0, crashes: 0, late: 0, moves: 0, won: false, seq: 0,
        rs: Math.floor(rnd() * 4294967296) >>> 0,
      };
      const g = geo(s);
      // punto di partenza del livello
      const an = md.anchors.length ? md.pois[md.anchors[(cfg.level - 1) % md.anchors.length]] : null;
      const ax = an ? an.x : md.W / 2, ay = an ? an.y : md.H / 2;
      const home = an && an.spot >= 0 ? g.spots[an.spot] : g.spots[g.nearSpot(ax, ay, 60)] || g.spots[0];
      s.home = home.id;
      const f0 = field(s, tileOf(s, home.zx, home.zy));
      const ok = (p) => f0[tileOf(s, p.zx, p.zy)] >= 0;
      const byDist = (list) => list.map((p) => ({ p, d: f0[tileOf(s, p.zx, p.zy)] })).filter((q) => q.d >= 0).sort((a, b) => a.d - b.d).map((q) => q.p);
      const FOOD = ['food', 'gelato', 'bakery', 'cafe'];
      if (cfg.type === 'food') {
        const want = cfg.tier >= 2 ? 3 : 2;
        const cand = byDist(md.pois.filter((P) => FOOD.includes(P.k) && P.spot >= 0).map((P) => g.spots[P.spot])).filter((p) => f0[tileOf(s, p.zx, p.zy)] <= 70);
        const start = Math.floor(rand(s) * Math.min(3, cand.length));
        for (const p of cand.slice(start).concat(cand.slice(0, start))) {
          if (s.rest.length >= want) break;
          if (s.rest.some((r) => g.spots[r].b === p.b || Math.hypot(g.spots[r].x - p.x, g.spots[r].y - p.y) < 8)) continue;
          s.rest.push(p.id);
        }
        // pochi ristoranti in zona: si usano negozi qualsiasi vicino alla partenza
        for (const p of byDist(g.spots.filter((q) => q.k === 'bld' && Math.hypot(q.x - home.x, q.y - home.y) < 40))) {
          if (s.rest.length >= want) break;
          if (!s.rest.some((r) => g.spots[r].b === p.b || Math.hypot(g.spots[r].x - p.x, g.spots[r].y - p.y) < 10)) s.rest.push(p.id);
        }
      }
      if (cfg.type === 'parcel') {
        const dep = byDist(md.pois.filter((P) => P.k === 'depot' && P.spot >= 0).map((P) => g.spots[P.spot]));
        const near = dep.find((p) => f0[tileOf(s, p.zx, p.zy)] <= 90);
        s.depot = (near || byDist(g.spots.filter((q) => q.k === 'bld' && ok(q) && Math.hypot(q.x - home.x, q.y - home.y) < 20))[0] || home).id;
      }
      const startSpot = cfg.type === 'parcel' ? g.spots[s.depot] : cfg.type === 'food' && s.rest.length ? g.spots[s.rest[0]] : home;
      s.car.a = startSpot.a;
      s.car.x = nz(startSpot.zx - Math.cos(startSpot.a) * 0.6); s.car.y = nz(startSpot.zy - Math.sin(startSpot.a) * 0.6);
      if (cfg.type === 'taxi') s.last = startSpot.id;
      for (let k = 0; k < cfg.cars; k++) {
        const r = rand(s);
        const kind = cfg.buses && r < 0.14 ? 'bus' : cfg.bikes && r > 0.84 ? 'bike' : 'car';
        const v = spawnNpcO(s, g, kind, 5, NPC_R[1]);
        if (v) s.npcs.push(v);
      }
      for (let k = 0; k < cfg.peds; k++) { const p = spawnPedO(s, g, 3, PED_R2[1]); if (p) s.peds.push(p); }
      newTrip(s, []);
      return s;
    }

    return { AR, HWC, ASPH, SIDE, isOsm, mapData, buildings, vectors, offsetLine, polyOf, along, geoOsm, walkOf,
      turnOf, chooseTurnO, bubble, pedTickO, newLevelOsm };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
