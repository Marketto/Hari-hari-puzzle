// Bot autista di Hari Taxi per i test: legge solo lo stato pubblico (mappa, linee delle strade, veicoli, pedoni,
// fermate da drive.targets) e rifà da sé grafo degli incroci, percorsi su corsia (Dijkstra con penalità di svolta),
// velocità in curva, frenate per ostacoli e semafori. Decide ogni ~react secondi (tempi di reazione umani).
export function botKit(HH) {
  const D = HH.drive;
  const DT = 1 / 60;
  const DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const right = (d) => [-DIR[d][1], DIR[d][0]];
  
  /* ---------- oracoli: distanze su strada e grafo degli incroci, ricavati dalla sola mappa ---------- */
  // mappe reali: caselle percorribili rifatte dal grafo pubblico (mezzerie larghe quanto la categoria), indipendenti
  // dal raster del gioco; distanze con una BFS su array (le mappe sono grandi)
  const OSMR = new Map();
  function osmRoad(s) {
    if (OSMR.has(s.mapId)) return OSMR.get(s.mapId);
    const md = D.mapData(s.mapId), W = md.W, H = md.H, r = new Uint8Array(W * H);
    const stamp = (pts, rad) => {
      for (let i = 1; i < pts.length; i++) {
        // centro della casella entro rad dal segmento (distanza punto–segmento)
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1e-9;
        for (let ty = Math.floor(Math.min(ay, by) - rad); ty <= Math.floor(Math.max(ay, by) + rad); ty++) for (let tx = Math.floor(Math.min(ax, bx) - rad); tx <= Math.floor(Math.max(ax, bx) + rad); tx++) {
          if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
          const px = tx + 0.5 - ax, py = ty + 0.5 - ay, u = Math.max(0, Math.min(1, (px * vx + py * vy) / L2));
          if ((px - u * vx) ** 2 + (py - u * vy) ** 2 <= rad * rad) r[ty * W + tx] = 1;
        }
      }
    };
    for (const e of md.edges) if (!e.slow) stamp(e.pts, D.HWC[e.c] + D.ASPH);
    // piazzole degli incroci (3 strade o più): larghe quanto la strada più larga
    for (const N of md.nodes) if (N.inc.length >= 3) stamp([[N.x, N.y], [N.x + 1e-3, N.y]], Math.max(...N.inc.map((i) => D.HWC[md.edges[i].c])) + D.ASPH + 0.25);
    OSMR.set(s.mapId, r);
    return r;
  }
  function roadDist(s, from) {
    if (D.isOsm(s)) {
      const r = osmRoad(s), W = s.W, n = W * s.H, d = new Int32Array(n).fill(-1), q = new Int32Array(n);
      let h = 0, t = 0;
      if (r[from]) { d[from] = 0; q[t++] = from; }
      while (h < t) {
        const i = q[h++], x = i % W;
        for (const j of [x + 1 < W ? i + 1 : -1, x > 0 ? i - 1 : -1, i + W < n ? i + W : -1, i - W]) if (j >= 0 && r[j] && d[j] < 0) { d[j] = d[i] + 1; q[t++] = j; }
      }
      return { get: (i) => (d[i] >= 0 ? d[i] : undefined), has: (i) => d[i] >= 0, get size() { return t; } };
    }
    const W = s.W, H = s.H, d = new Map([[from, 0]]), q = [from];
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = Math.floor(i / W);
      for (const [dx, dy] of DIR) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H || s.map[Y * W + X] !== '.') continue;
        const j = Y * W + X;
        if (!d.has(j)) { d.set(j, d.get(i) + 1); q.push(j); }
      }
    }
    return d;
  }
  const tile = (s, x, y) => Math.floor(y) * s.W + Math.floor(x);
  
  function graph(s) {
    const nx = s.vx.length - 1, ny = s.hy.length - 1, nodes = [];
    const road = (x, y) => x >= 0 && y >= 0 && x < s.W && y < s.H && s.map[y * s.W + x] === '.';
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const x = s.vx[i], y = s.hy[j];
      nodes.push({ x: x + 1, y: y + 1, nb: [
        i < nx && road(x + 2, y) ? j * (nx + 1) + i + 1 : -1,
        j < ny && road(x, y + 2) ? (j + 1) * (nx + 1) + i : -1,
        i > 0 && road(x - 1, y) ? j * (nx + 1) + i - 1 : -1,
        j > 0 && road(x, y - 1) ? (j - 1) * (nx + 1) + i : -1] });
    }
    return nodes;
  }
  // tratto di strada (incroci a, b e direzione a→b) su cui sta un punto
  function edgeOf(nodes, x, y) {
    let best = null;
    for (let a = 0; a < nodes.length; a++) for (let d = 0; d < 2; d++) {
      const b = nodes[a].nb[d];
      if (b < 0) continue;
      const A = nodes[a], B = nodes[b];
      const lat = d === 0 ? Math.abs(y - A.y) : Math.abs(x - A.x), along = d === 0 ? x : y, lo = d === 0 ? A.x : A.y, hi = d === 0 ? B.x : B.y;
      if (lat <= 1.05 && along >= lo && along <= hi && (!best || lat < best.lat)) best = { a, b, d, lat };
    }
    return best;
  }
  
  /* ---------- bot autista ---------- */
  // mappe reali: il bot rifà da sé corsie (a destra della mezzeria, al centro nei sensi unici) e percorsi
  // (Dijkstra sui tratti orientati con penalità di svolta) dalla geometria pubblica della mappa: incroci, mezzerie,
  // sensi unici e gruppi dei semafori
  function osmKit(s) {
    const g = D.geo(s), E = g.edges, N = g.nodes;
    // Hari può fare un senso unico al contrario (come ogni giocatore): costa di più e tiene la destra
    const ok = (de) => !E[de >> 1].slow;
    const wrong = (de) => { const e = E[de >> 1]; return e.one !== 0 && (e.one === 1) !== ((de & 1) === 0); };
    const lane = new Map();
    const laneOf = (de) => {
      if (!lane.has(de)) { const e = E[de >> 1], p = de & 1 ? e.pts.slice().reverse() : e.pts; lane.set(de, D.offsetLine(p, e.one ? (wrong(de) ? 0.75 : 0) : 0.5)); }
      return lane.get(de);
    };
    const startOf = (de) => (de & 1 ? E[de >> 1].b : E[de >> 1].a), endOf = (de) => (de & 1 ? E[de >> 1].a : E[de >> 1].b);
    const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
    // punto più vicino su una mezzeria: tratto, distanza dall'inizio, direzione locale
    function project(x, y, pred = (e) => !e.slow) {
      let best = null;
      for (const e of E) {
        if (!pred(e) || x < e.box[0] - 3 || x > e.box[2] + 3 || y < e.box[1] - 3 || y > e.box[3] + 3) continue;
        let acc = 0;
        for (let i = 1; i < e.pts.length; i++) {
          const [ax, ay] = e.pts[i - 1], [bx, by] = e.pts[i], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
          const t = Math.max(0, Math.min(L, ((x - ax) * dx + (y - ay) * dy) / L)), px = ax + (dx * t) / L, py = ay + (dy * t) / L, d = Math.hypot(x - px, y - py);
          if (!best || d < best.d) best = { e: e.id, t: acc + t, d, a: Math.atan2(dy, dx) };
          acc += L;
        }
      }
      return best;
    }
    function plan(tx, ty) {
      const c = s.car;
      const cur = project(c.x, c.y), tg = project(tx, ty);
      if (!cur || !tg) return { pts: [[tx, ty]], lights: [] };
      const e0 = E[cur.e], fwd = Math.cos(c.a - cur.a) >= 0;
      const de0 = 2 * cur.e + (fwd ? 0 : 1);
      const rem0 = de0 & 1 ? cur.t : e0.len - cur.t;
      const et = E[tg.e];
      const goalCost = (de, n) => (et.a === n ? tg.t : et.len - tg.t);
      // stesso tratto e meta davanti
      if (tg.e === cur.e && ((de0 & 1) === 0 ? tg.t > cur.t + 0.5 : tg.t < cur.t - 0.5)) return build([de0], cur, tg, tx, ty);
      // si può anche partire con un'inversione a U (costa un po')
      const dist = new Map([[de0, rem0], [de0 ^ 1, e0.len - rem0 + 7]]), prev = new Map(), heap = [[rem0, de0], [e0.len - rem0 + 7, de0 ^ 1]];
      let goal = null, gBest = Infinity;
      while (heap.length) {
        heap.sort((p, q) => q[0] - p[0]);
        const [v, de] = heap.pop();
        if (v > (dist.get(de) ?? Infinity) || v > gBest) continue;
        const n = endOf(de), lp = laneOf(de), a0 = ang(lp[lp.length - 2], lp[lp.length - 1]);
        if (et.a === n || et.b === n) {
          const dt = 2 * tg.e + (et.a === n ? 0 : 1);
          if (dt !== (de ^ 1) || N[n].deg === 1) { const cst = v + goalCost(dt, n) + 1.5; if (cst < gBest) { gBest = cst; goal = { de, last: dt }; } }
        }
        for (const i of N[n].inc) for (const d2 of [2 * i, 2 * i + 1]) {
          if (startOf(d2) !== n || !ok(d2)) continue;
          if (d2 === (de ^ 1) && N[n].deg > 1) continue;
          const l2 = laneOf(d2), turn = Math.abs(D.wrap(ang(l2[0], l2[1]) - a0));
          const c2 = v + E[i].len * (wrong(d2) ? 2.5 : 1) + turn * 1.5;
          if (c2 < (dist.get(d2) ?? Infinity)) { dist.set(d2, c2); prev.set(d2, de); heap.push([c2, d2]); }
        }
      }
      if (!goal) return { pts: [[tx, ty]], lights: [] };
      const seq = [goal.last];
      for (let k = goal.de; k != null; k = prev.get(k)) seq.unshift(k);
      return build(seq, cur, tg, tx, ty, seq[0] !== de0);
    }
    function build(seq, cur, tg, tx, ty, uturn = false) {
      const raw = [], lights = [];
      seq.forEach((de, q) => {
        let p = laneOf(de);
        const e = E[de >> 1], rev = de & 1;
        // primo tratto: dalla posizione attuale; ultimo: fino alla meta
        const cutAt = (pts, t0, t1) => { const P = D.polyOf(pts); const out = []; for (let t = t0; t <= t1; t += 0.5) out.push(D.along(P, t)); out.push(D.along(P, t1)); return out.map((v) => [v[0], v[1]]); };
        const L = D.polyOf(p).len, scale = L / (e.len || 1);
        const tCur = (rev ? e.len - cur.t : cur.t) * scale, tTg = (rev ? e.len - tg.t : tg.t) * scale;
        if (q === 0 && seq.length === 1) p = cutAt(p, tCur, tTg);
        else if (q === 0) p = cutAt(p, Math.min(L, tCur + (uturn ? 1.6 : 0.6)), L);
        else if (q === seq.length - 1) p = cutAt(p, 0, tTg);
        else p = cutAt(p, 0, L);
        for (const v of p) raw.push(v);
        const n = endOf(de);
        if (q < seq.length - 1 && N[n].lit) lights.push({ n, de, k: raw.length - 1 });
      });
      raw.push([tx, ty]);
      return { pts: raw, lights };
    }
    return { g, plan };
  }

  function makeBot(s, { react = 0.22, seed = 1, careful = true, dbg = null } = {}) {
    const osm = D.isOsm(s) ? osmKit(s) : null;
    const nodes = osm ? [] : graph(s), rnd = HH.rng(seed), V = D.VEH[s.veh];
    let lights = [], tight = 0, distAt = -9, distF = null, kick = 0, lastWall = -99;
    const free = (x, y) => { const g = D.geo(s), tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < s.W && ty < s.H && !g.solid[ty * s.W + tx]; };
    let path = [], pi = 0, key = '', next = 0, input = null, stuck = 0, back = 0, plannedAt = -9, wall = 0, creep = 0, still = 0, creepO = null, jam = 0;
  
    function plan(tx, ty) {
      const c = s.car, hx = Math.cos(c.a), hy = Math.sin(c.a);
      const te = edgeOf(nodes, tx, ty);
      // incrocio da cui partire: quello davanti sul tratto in cui si trova (o quello in cui si è dentro)
      let start = -1, inBox = false;
      let headDir = Math.abs(hx) > Math.abs(hy) ? (hx > 0 ? 0 : 2) : (hy > 0 ? 1 : 3);
      for (let n = 0; n < nodes.length; n++) {
        const N = nodes[n];
        if (Math.abs(N.x - c.x) <= 1.05 && Math.abs(N.y - c.y) <= 1.05) { start = n; inBox = true; break; }
      }
      if (start < 0) {
        // sul tratto: l'incrocio verso cui punta il muso, lungo l'asse della strada
        const e = edgeOf(nodes, c.x, c.y);
        if (e) { const comp = e.d === 0 ? hx : hy; start = comp >= 0 ? e.b : e.a; headDir = e.d === 0 ? (comp >= 0 ? 0 : 2) : (comp >= 0 ? 1 : 3); }
        else { let b2 = 1e9; nodes.forEach((N, n) => { const d = Math.hypot(N.x - c.x, N.y - c.y); if (d < b2) { b2 = d; start = n; } }); }
      }
      // stesso tratto e meta davanti: dritti alla meta
      const pts = [];
      const lanePt = (d, along, A) => { const [rx, ry] = right(d); return d % 2 === 0 ? [along, A.y + 0.5 * ry] : [A.x + 0.5 * rx, along]; };
      const cur = edgeOf(nodes, c.x, c.y);
      if (!inBox && cur && te && cur.a === te.a && cur.b === te.b) {
        const along = cur.d === 0 ? tx - c.x : ty - c.y, sgn = cur.d === 0 ? Math.sign(hx) : Math.sign(hy);
        if (along * sgn > 0.3) {
          const d = sgn > 0 ? cur.d : cur.d + 2;
          pts.push(lanePt(d, cur.d === 0 ? tx : ty, nodes[cur.a]));
          return pts;
        }
      }
      // Dijkstra su (incrocio, direzione d'arrivo) con penalità di svolta
      const N = nodes.length;
      let dist, prev, goal = -1;
      // prima senza inversioni a U, poi (se proprio serve) anche con
      for (const uOK of [false, true]) {
      dist = new Float64Array(N * 4).fill(Infinity); prev = new Int32Array(N * 4).fill(-1);
      const heap = [];
      const push = (k, v) => { dist[k] = v; heap.push([v, k]); };
      push(start * 4 + headDir, 0);
      let goalCost = Infinity;
      goal = -1;
      while (heap.length) {
        heap.sort((p, q) => q[0] - p[0]);
        const [v, k] = heap.pop();
        if (v > dist[k]) continue;
        const n = Math.floor(k / 4), din = k % 4;
        // se il tratto della meta parte da qui, si arriva
        if (te) for (const d of [te.d, te.d + 2]) {
          if (nodes[n].nb[d] < 0) continue;
          const other = nodes[n].nb[d];
          if (!((n === te.a && other === te.b) || (n === te.b && other === te.a))) continue;
          if (n === start && d === (headDir + 2) % 4 && !uOK) continue;
          const along = Math.abs(d % 2 === 0 ? tx - nodes[n].x : ty - nodes[n].y);
          const cost = v + along + (d === din ? 0 : 1.5);
          if (cost < goalCost) { goalCost = cost; goal = k * 4 + d; }
        }
        for (let d = 0; d < 4; d++) {
          const m = nodes[n].nb[d];
          if (m < 0) continue;
          if (d === (din + 2) % 4 && !(n === start && inBox && uOK)) continue;          // niente inversioni a U
          const len = Math.abs(nodes[m].x - nodes[n].x) + Math.abs(nodes[m].y - nodes[n].y);
          const k2 = m * 4 + d, c2 = v + len + (d === din ? 0 : d === (din + 1) % 4 ? 1 : 2);
          if (c2 < dist[k2]) { prev[k2] = k; push(k2, c2); }
        }
      }
      if (goal >= 0) break;
      }
      if (goal < 0) return pts;
      // ricostruisci: sequenza di (incrocio, direzione d'arrivo), poi l'ultima direzione verso la meta
      const seq = [];
      let k = Math.floor(goal / 4);
      const lastDir = goal % 4;
      while (k >= 0) { seq.unshift(k); k = prev[k]; }
      const turnAt = (n, din, dout) => {
        const A = nodes[n], [r0x, r0y] = right(din), [r1x, r1y] = right(dout), [h0x, h0y] = DIR[din], [h1x, h1y] = DIR[dout];
        pts.push([A.x - h0x * 1.1 + 0.5 * r0x, A.y - h0y * 1.1 + 0.5 * r0y]);
        if (din !== dout) pts.push([A.x + 0.5 * r0x + 0.5 * r1x - (h0x - h1x) * 0.15, A.y + 0.5 * r0y + 0.5 * r1y - (h0y - h1y) * 0.15]);
        pts.push([A.x + h1x * 1.1 + 0.5 * r1x, A.y + h1y * 1.1 + 0.5 * r1y]);
      };
      for (let q = 0; q < seq.length; q++) {
        const n = Math.floor(seq[q] / 4), din = seq[q] % 4;
        const dout = q + 1 < seq.length ? seq[q + 1] % 4 : lastDir;
        if (q === 0 && inBox) { const [r1x, r1y] = right(dout), [h1x, h1y] = DIR[dout]; pts.push([nodes[n].x + h1x * 1.1 + 0.5 * r1x, nodes[n].y + h1y * 1.1 + 0.5 * r1y]); continue; }
        turnAt(n, din, dout);
      }
      const A = nodes[Math.floor(seq[seq.length - 1] / 4)];
      pts.push(lanePt(lastDir, lastDir % 2 === 0 ? tx : ty, A));
      return pts;
    }
  
    function target() {
      const tg = D.targets(s);
      if (!tg.length) return null;
      if (tg.length === 1) return tg[0];
      // più consegne a bordo: la più urgente se è a rischio, altrimenti la più vicina su strada
      if (!distF || s.t - distAt > 1.5) { distF = roadDist(s, tile(s, s.car.x, s.car.y)); distAt = s.t; }
      const f = distF;
      const dd = (t) => f.get(tile(s, t.zx, t.zy)) ?? 999;
      const urgent = tg.filter((t) => t.t < dd(t) / (V.vmax * 0.5) + 4).sort((a, b) => a.t - b.t)[0];
      return urgent || tg.sort((a, b) => dd(a) - dd(b))[0];
    }
  
    function decide() {
      const c = s.car, tg = target();
      if (dbg) dbg.why = '';
      if (!tg) return null;
      const k = `${tg.kind}${tg.spot}`;
      if (k !== key || s.t - plannedAt > 2.5) {
        key = k; pi = 0; plannedAt = s.t;
        if (osm) { const r = osm.plan(tg.zx, tg.zy); path = r.pts; lights = r.lights; if (dbg) dbg.full = path; } else path = plan(tg.zx, tg.zy);
      }
      if (!path.length) return null;
      if (kick > 0) {
        // incastrato in un angolo all'indietro: un attimo avanti dritto, poi si riprova
        kick -= react;
        return { ax: Math.cos(c.a) * 0.4, ay: Math.sin(c.a) * 0.4 };
      }
      if (back > 0) {
        back -= react;
        // retromarcia piano (sotto la soglia d'urto) e solo se dietro è libero
        const free = !s.npcs.some((v) => {
          const ox = v.x - c.x, oy = v.y - c.y, f = ox * Math.cos(c.a) + oy * Math.sin(c.a), lat = Math.abs(-ox * Math.sin(c.a) + oy * Math.cos(c.a));
          return f < 0 && -f < V.len / 2 + D.NPCS[v.k].len / 2 + 0.5 && lat < 0.8;
        });
        if (free) return { ax: -Math.cos(c.a) * 0.3, ay: -Math.sin(c.a) * 0.3 };
        back = 0;
      }
      // avanza sul percorso: punto più vicino, poi un po' più avanti (pure pursuit)
      // dopo una manovra per uscire da un angolo si punta più vicino (si rientra sul percorso senza tagliare l'angolo)
      if (tight > 0) {
        // rientro: verso il punto del percorso più vicino (non più avanti), poi di nuovo l'inseguimento normale
        tight -= react;
        let bk = pi, bd = 1e9;
        for (let q = pi; q < Math.min(path.length, pi + 24); q++) { const d = Math.hypot(path[q][0] - c.x, path[q][1] - c.y); if (d < bd) { bd = d; bk = q; } }
        pi = bk;
        if (bd < 0.5) tight = 0;
      } else while (pi < path.length - 1 && Math.hypot(path[pi][0] - c.x, path[pi][1] - c.y) < (osm ? 1.3 : 0.9)) pi++;
      const [px, py] = path[pi];
      let dx = px - c.x, dy = py - c.y;
      const dGoal = Math.hypot(tg.zx - c.x, tg.zy - c.y);
      // velocità voluta: piano in curva, frenata morbida alla meta
      let vWant = V.vmax;
      let along = Math.hypot(dx, dy);
      for (let q = pi; q < path.length - 1; q++) {
        const a0 = Math.atan2(path[q + 1][1] - path[q][1], path[q + 1][0] - path[q][0]);
        const a1 = q > 0 ? Math.atan2(path[q][1] - path[q - 1][1], path[q][0] - path[q - 1][0]) : c.a;
        const turn = D.wrap(a0 - a1);
        // svolta a destra (stretta) più piano di quella a sinistra
        if (Math.abs(turn) > 0.5) { const vt = turn > 0 ? 1.6 : 2.4; vWant = Math.min(vWant, Math.sqrt(vt * vt + 2 * V.brake * 0.3 * Math.max(0, along - 0.7))); }
        along += Math.hypot(path[q + 1][0] - path[q][0], path[q + 1][1] - path[q][1]);
        if (along > 9) break;
      }
      const endD = pi === path.length - 1 ? dGoal : along;
      vWant = Math.min(vWant, Math.sqrt(2 * V.brake * 0.3 * Math.max(0, endD - 0.4)) + 0.3);
      // ostacoli lungo il percorso (veicoli, anche dove saranno tra poco, e pedoni sulle strisce), con lo spazio
      // percorso nel tempo di reazione
      const hx = Math.cos(c.a), hy = Math.sin(c.a), look = 1.4 + Math.abs(c.v) * react + (c.v * c.v) / (2 * V.brake * 0.6) + V.len;
      const obstacles = [];
      for (const v of s.npcs) {
        if (Math.hypot(v.x - c.x, v.y - c.y) > look + 3) continue;
        const K = D.NPCS[v.k], ux = Math.cos(v.a), uy = Math.sin(v.a);
        // il veicolo come segmento (bus lunghi), ora e tra 0,5 s
        if (v.v < 0.2) {
          // fermo: la sua sagoma vera (cerchi lungo il veicolo), con poco margine
          const off = K.len / 2 - K.hw, n = K.len > 1.4 ? 4 : 2;
          for (let q = 0; q < n; q++) { const f = -off + (2 * off * q) / (n - 1); obstacles.push({ x: v.x + ux * f, y: v.y + uy * f, r: K.hw + 0.08, still: true }); }
        } else for (const t of [0, 0.5]) for (const f of K.len > 1.2 ? [-0.55, 0, 0.55] : [0]) obstacles.push({ x: v.x + ux * (v.v * t + f), y: v.y + uy * (v.v * t + f), r: K.hw + 0.12 + (K.len > 1.2 ? 0.25 : K.len / 2), still: osm && v.v < 0.6 });
      }
      for (const p of s.peds) {
        if (p.st < 2 || Math.hypot(p.x - c.x, p.y - c.y) > look + 2) continue;
        // pedoni sulle strisce: dove sono e dove saranno tra poco
        const L = Math.hypot(p.cr.x1 - p.cr.x0, p.cr.y1 - p.cr.y0) || 1, ux = (p.cr.x1 - p.cr.x0) / L, uy = (p.cr.y1 - p.cr.y0) / L;
        const ts = p.st === 3 ? [0] : [0, 0.4, 0.8];
        for (const t of ts) obstacles.push({ x: p.x + ux * p.sp * 1.1 * t, y: p.y + uy * p.sp * 1.1 * t, r: 0.4 });
      }
      const samples = [];
      {
        let lx = c.x, ly = c.y, acc = 0;
        for (let q = pi; q < path.length && acc < look; q++) {
          const [qx, qy] = path[q], L = Math.hypot(qx - lx, qy - ly);
          for (let u = 0.3; u <= L && acc + u < look; u += 0.3) samples.push([lx + ((qx - lx) * u) / L, ly + ((qy - ly) * u) / L, acc + u]);
          acc += L; lx = qx; ly = qy;
        }
        for (let u = 0.3; u < Math.min(look, 1.5 + Math.abs(c.v) * 0.5); u += 0.3) samples.push([c.x + hx * u, c.y + hy * u, u]);
      }
      let blocked = false, onlyStill = true, blockO = null;
      const vFree = vWant;
      for (const o of obstacles) {
        for (const [sx, sy, ds] of samples) {
          if (Math.hypot(o.x - sx, o.y - sy) > o.r + V.hw) continue;
          if ((o.x - c.x) * (sx - c.x) + (o.y - c.y) * (sy - c.y) <= 0) continue;      // dietro: non conta
          // velocità da cui ci si ferma in tempo contando anche il tempo di reazione
          const gap = ds - V.len / 2 - 0.3, b = V.brake * 0.6;
          const vl = gap <= 0 ? 0 : Math.sqrt((b * react) ** 2 + 2 * b * gap) - b * react;
          if (vl < vWant) { vWant = vl; blocked = true; blockO = o; if (!o.still) onlyStill = false; if (dbg) dbg.why = `obst ${o.x.toFixed(2)},${o.y.toFixed(2)} r${o.r.toFixed(2)} at ${sx.toFixed(2)},${sy.toFixed(2)}`; }
          break;
        }
      }
      // semafori: si ferma col rosso prima della linea (chi è attento)
      if (careful && osm) for (const lq of lights) {
        if (lq.k < pi - 1) continue;
        const Nn = osm.g.nodes[lq.n], fwd = Math.hypot(Nn.x - c.x, Nn.y - c.y);
        if (fwd > 8) break;
        const stop = fwd - Nn.r - 0.85 - V.len / 2, L = D.light(s, lq.n);
        if (stop > -0.2 && L.ph !== osm.g.grp[lq.de] && stop > (c.v * c.v) / (2 * V.brake * 0.8)) { vWant = Math.min(vWant, Math.sqrt(2 * V.brake * 0.4 * Math.max(0, stop))); blocked = true; if (dbg) dbg.why = `light ${lq.n}`; }
        break;
      }
      if (careful && !osm) for (let n = 0; n < nodes.length; n++) {
        const N = nodes[n], ox = N.x - c.x, oy = N.y - c.y, fwd = ox * hx + oy * hy, lat = Math.abs(-ox * hy + oy * hx);
        if (fwd < 1.4 || fwd > 7 || lat > 1.2 || nodes[n].nb.filter((x) => x >= 0).length < 3) continue;
        const axis = Math.abs(hx) > Math.abs(hy) ? 0 : 1, L = D.light(s, n);
        const stop = fwd - 1 - 0.85 - V.len / 2;
        if (L.ph !== axis && stop > (c.v * c.v) / (2 * V.brake * 0.8)) { vWant = Math.min(vWant, Math.sqrt(2 * V.brake * 0.4 * Math.max(0, stop))); blocked = true; if (dbg) dbg.why = `light ${n}`; }
      }
      // stallo con un'auto ferma che aspetta Hari: si passa piano piano (a passo d'uomo un tocco è solo "bonk")
      if (creep > 0) {
        creep -= react; vWant = Math.min(vFree, D.VEH[s.veh].crash * 0.6); blocked = false;
        // scarta di lato rispetto all'auto ferma
        if (creepO) {
          const ox = creepO.x - c.x, oy = creepO.y - c.y, L0 = Math.hypot(dx, dy) || 1;
          const rot = (a) => [(dx * Math.cos(a) - dy * Math.sin(a)) / L0, (dx * Math.sin(a) + dy * Math.cos(a)) / L0];
          const [ax, ay] = rot(0.6), [bx, by] = rot(-0.6);
          [dx, dy] = ax * ox + ay * oy < bx * ox + by * oy ? [ax, ay] : [bx, by];
        }
      } else if (blocked && onlyStill && Math.abs(c.v) < 0.1) { still += react; if (still > 2) { still = 0; creep = 1.5; creepO = blockO; } } else still = 0;
      if (blocked && Math.abs(c.v) < 0.1) { stuck += react; if (stuck > 3.5 + rnd() * 2) { stuck = 0; back = 0.6; plannedAt = -9; } } else stuck = 0;
      // fermo da troppo (non per un semaforo): manovra indietro più lunga e percorso nuovo
      if (Math.abs(c.v) < 0.3 && !(dbg && dbg.light)) { jam += react; if (jam > 9) { jam = 0; back = 1.2; plannedAt = -9; tight = osm ? 2.5 : 0; } } else jam = 0;
      // incastrato contro un marciapiede: un attimo indietro e si ricalcola il percorso
      if (!blocked && vWant > 1 && Math.abs(c.v) < 0.25) {
        wall += react;
        if (wall > 1) {
          wall = 0; plannedAt = -9; tight = osm ? 2.5 : 0;
          const ahead = free(c.x + Math.cos(c.a) * (V.len / 2 + 0.5), c.y + Math.sin(c.a) * (V.len / 2 + 0.5));
          if (osm && s.t - lastWall < 6 && ahead) kick = 0.7; else back = osm ? 0.8 : 0.5;
          lastWall = s.t;
        }
      } else wall = 0;
      const L = Math.hypot(dx, dy) || 1;
      const m = Math.max(0, Math.min(1, vWant / V.vmax));
      if (dbg) { dbg.v = vWant; dbg.path = path.slice(pi, pi + 4); }
      if (m < 0.02) return null;                              // lascia la levetta: frena
      // mappe reali: meta alle spalle → inversione a U in avanti (sterzo pieno, piano), non una lunga retromarcia
      if (osm && tight <= 0) {
        const want = Math.atan2(dy, dx), dh = D.wrap(want - c.a);
        if (Math.abs(dh) > 1.9 && c.v > -0.3 && c.v < 1.6) { const a2 = c.a + Math.sign(dh) * 1.25; return { ax: Math.cos(a2) * 0.35, ay: Math.sin(a2) * 0.35 }; }
      }
      return { ax: (dx / L) * Math.max(m, 0.13), ay: (dy / L) * Math.max(m, 0.13) };
    }
  
    return {
      input(t) { if (t >= next) { next = t + react * (0.85 + rnd() * 0.3); input = decide(); } return input; },
    };
  }
  function play(s, opts = {}) {
    const bot = makeBot(s, opts), limit = opts.limit || 600, ev = [];
    for (let f = 0; f < limit * 60 && !D.isOver(s); f++) for (const e of D.step(s, DT, bot.input(s.t))) ev.push(e);
    return ev;
  }
  const fresh = (level, seed, map) => { const s = D.newLevel(level, HH.rng(seed), map); s.ready = 0; return s; };
  return { roadDist, tile, graph, edgeOf, makeBot, play, fresh, DIR };
}
