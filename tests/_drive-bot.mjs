// Bot autista di Hari Taxi per i test: legge solo lo stato pubblico (mappa, linee delle strade, veicoli, pedoni,
// fermate da drive.targets) e rifà da sé grafo degli incroci, percorsi su corsia (Dijkstra con penalità di svolta),
// velocità in curva, frenate per ostacoli e semafori. Decide ogni ~react secondi (tempi di reazione umani).
export function botKit(HH) {
  const D = HH.drive;
  const DT = 1 / 60;
  const DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const right = (d) => [-DIR[d][1], DIR[d][0]];
  
  /* ---------- oracoli: distanze su strada e grafo degli incroci, ricavati dalla sola mappa ---------- */
  function roadDist(s, from) {
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
  function makeBot(s, { react = 0.22, seed = 1, careful = true, dbg = null } = {}) {
    const nodes = graph(s), rnd = HH.rng(seed), V = D.VEH[s.veh];
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
      const f = roadDist(s, tile(s, s.car.x, s.car.y));
      const dd = (t) => f.get(tile(s, t.zx, t.zy)) ?? 999;
      const urgent = tg.filter((t) => t.t < dd(t) / (V.vmax * 0.5) + 4).sort((a, b) => a.t - b.t)[0];
      return urgent || tg.sort((a, b) => dd(a) - dd(b))[0];
    }
  
    function decide() {
      const c = s.car, tg = target();
      if (dbg) dbg.why = '';
      if (!tg) return null;
      const k = `${tg.kind}${tg.spot}`;
      if (k !== key || s.t - plannedAt > 2.5) { key = k; path = plan(tg.zx, tg.zy); pi = 0; plannedAt = s.t; }
      if (!path.length) return null;
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
      while (pi < path.length - 1 && Math.hypot(path[pi][0] - c.x, path[pi][1] - c.y) < 0.9) pi++;
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
        } else for (const t of [0, 0.5]) for (const f of K.len > 1.2 ? [-0.55, 0, 0.55] : [0]) obstacles.push({ x: v.x + ux * (v.v * t + f), y: v.y + uy * (v.v * t + f), r: K.hw + 0.12 + (K.len > 1.2 ? 0.25 : K.len / 2) });
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
      if (careful) for (let n = 0; n < nodes.length; n++) {
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
      if (Math.abs(c.v) < 0.3 && !(dbg && dbg.light)) { jam += react; if (jam > 9) { jam = 0; back = 1.2; plannedAt = -9; } } else jam = 0;
      // incastrato contro un marciapiede: un attimo indietro e si ricalcola il percorso
      if (!blocked && vWant > 1 && Math.abs(c.v) < 0.25) { wall += react; if (wall > 1) { wall = 0; back = 0.5; plannedAt = -9; } } else wall = 0;
      const L = Math.hypot(dx, dy) || 1;
      const m = Math.max(0, Math.min(1, vWant / V.vmax));
      if (dbg) { dbg.v = vWant; dbg.path = path.slice(pi, pi + 4); }
      if (m < 0.02) return null;                              // lascia la levetta: frena
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
  const fresh = (level, seed) => { const s = D.newLevel(level, HH.rng(seed)); s.ready = 0; return s; };
  return { roadDist, tile, graph, edgeOf, makeBot, play, fresh, DIR };
}
