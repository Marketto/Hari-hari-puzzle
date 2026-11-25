/* Hari Express — strade, binari, ponti, stazioni, fermate, semafori, frecce del senso unico, anteprima della
 * costruzione e area di raccolta. La rete diventa UNA geometria coi colori nei vertici (ricostruita solo quando cambia,
 * cioè quando cambia la versione della rete s.nv); i semafori sono istanze ricolorate quando cambia una prenotazione.
 * Montato da express-ui.js: HH.expressTracks(X) → funzioni.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.expressTracks = function (X) {
    const T = X.T, S = HH.expressSim;
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], opp = (d) => (d + 2) & 3;
    const MID = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
    const W = () => X.W;

    /* ---------- altezza della strada: come il terreno, ma l'acqua sotto un ponte vale l'impalcato ---------- */
    let deck = null;
    function computeDeck() {
      const w = W();
      deck = new Float32Array(w.n).fill(NaN);
      for (let i = 0; i < w.n; i++) {
        // dentro una galleria: il fondo è alla quota degli imbocchi (il binario non sale sulla collina)
        if (w.tun[i] && (w.rail[i] || w.road[i])) {
          const m = w.rail[i] || w.road[i], d = m & 5 ? 0 : 1;
          let x = i % w.w, y = (i / w.w) | 0, k = 0;
          while (k++ < 12) { x += DX[d]; y += DY[d]; if (x < 0 || y < 0 || x >= w.w || y >= w.h) break; const j = y * w.w + x; if (!w.tun[j]) { deck[i] = w.ht[j] * X.HU; break; } }
          continue;
        }
        if (!w.water[i] || !(w.rail[i] || w.road[i])) continue;
        const m = w.rail[i] || w.road[i], ax = m & 5 ? [0, 2] : [1, 3];
        let hi = 0;
        for (const d of ax) {
          let x = i % w.w, y = (i / w.w) | 0;
          for (let k = 0; k < 5; k++) { x += DX[d]; y += DY[d]; if (x < 0 || y < 0 || x >= w.w || y >= w.h) break; const j = y * w.w + x; if (!w.water[j]) { hi = Math.max(hi, w.ht[j]); break; } }
        }
        deck[i] = hi * X.HU + 0.1;
      }
    }
    const tH = (i) => { const w = W(); if (deck && !isNaN(deck[i])) return deck[i]; return w.water[i] ? -0.2 : w.ht[i] * X.HU; };
    function hVr(vx, vz) {
      const w = W(), ox = vx & 1, oz = vz & 1, x = vx >> 1, z = vz >> 1;
      const th = (tx, tz) => (tx < 0 || tz < 0 || tx >= w.w || tz >= w.h ? -0.2 : tH(tz * w.w + tx));
      if (ox && oz) return th(x, z);
      if (ox) return Math.max((th(x, z - 1) + th(x, z)) / 2, Math.min(th(x, z - 1), th(x, z)) < -0.1 ? Math.max(th(x, z - 1), th(x, z)) - 0.06 : -9);
      if (oz) return Math.max((th(x - 1, z) + th(x, z)) / 2, Math.min(th(x - 1, z), th(x, z)) < -0.1 ? Math.max(th(x - 1, z), th(x, z)) - 0.06 : -9);
      return (th(x - 1, z - 1) + th(x, z - 1) + th(x - 1, z) + th(x, z)) / 4;
    }
    function hR(x, z) {
      const w = W();
      const gx = Math.max(0, Math.min(2 * w.w, x * 2)), gz = Math.max(0, Math.min(2 * w.h, z * 2));
      const ix = Math.min(2 * w.w - 1, Math.floor(gx)), iz = Math.min(2 * w.h - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz;
      const a = hVr(ix, iz), b = hVr(ix + 1, iz), c = hVr(ix, iz + 1), d = hVr(ix + 1, iz + 1);
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    }

    /* ---------- costruttore di geometria (posizioni, normali, colori) ---------- */
    function Geo() { return { P: [], N: [], C: [] }; }
    // il giro dei vertici segue la normale data: con DoubleSide una faccia vista "da dietro" prende la normale rovesciata
    // e la luce toon la fa scura (prima le strade est-ovest erano grigio scuro)
    function tri(g, a, b, c, col, n) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0) { const t = b; b = c; c = t; }
      for (const p of [a, b, c]) { g.P.push(p[0], p[1], p[2]); g.N.push(n[0], n[1], n[2]); g.C.push(col.r, col.g, col.b); }
    }
    const UP = [0, 1, 0];
    // nastro lungo una polilinea [[x, z], …] di larghezza w, sollevato di off sopra la strada
    function ribbon(g, pts, w, off, col, lat = 0) {
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, z0] = pts[k], [x1, z1] = pts[k + 1];
        let dx = x1 - x0, dz = z1 - z0; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const nx = -dz, nz = dx;
        const a0 = [x0 + nx * (lat - w / 2), 0, z0 + nz * (lat - w / 2)], b0 = [x0 + nx * (lat + w / 2), 0, z0 + nz * (lat + w / 2)];
        const a1 = [x1 + nx * (lat - w / 2), 0, z1 + nz * (lat - w / 2)], b1 = [x1 + nx * (lat + w / 2), 0, z1 + nz * (lat + w / 2)];
        for (const p of [a0, b0, a1, b1]) p[1] = hR(p[0], p[2]) + off;
        tri(g, a0, a1, b0, col, UP); tri(g, b0, a1, b1, col, UP);
      }
    }
    function box(g, cx, cy, cz, sx, sy, sz, yaw, col) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const v = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
      const hx = sx / 2, hz = sz / 2;
      const p = [v(-hx, 0, -hz), v(hx, 0, -hz), v(hx, 0, hz), v(-hx, 0, hz), v(-hx, sy, -hz), v(hx, sy, -hz), v(hx, sy, hz), v(-hx, sy, hz)];
      const f = (a, b, c2, d, n) => { tri(g, p[a], p[b], p[c2], col, n); tri(g, p[a], p[c2], p[d], col, n); };
      const rn = (x, z) => [x * c - z * s, 0, x * s + z * c];
      f(4, 7, 6, 5, UP); f(0, 1, 5, 4, rn(0, -1)); f(2, 3, 7, 6, rn(0, 1)); f(1, 2, 6, 5, rn(1, 0)); f(3, 0, 4, 7, rn(-1, 0));
    }
    // punti di un pezzo dentro la casella: dal lato a al lato b (b < 0 = fino al centro)
    const TP = {};
    function piece(t, a, b, n) {
      const w = W(), tx = t % w.w, tz = (t / w.w) | 0, pts = [];
      if (b < 0) { const m = MID[a]; for (let k = 0; k <= 2; k++) { const q = k / 2; pts.push([tx + m[0] + (0.5 - m[0]) * q, tz + m[1] + (0.5 - m[1]) * q]); } return pts; }
      const steps = b === opp(a) ? 2 : n;
      for (let k = 0; k <= steps; k++) { S.tilePos(w.w, t, a, b, k / steps, TP); pts.push([TP.x, TP.y]); }
      return pts;
    }
    function piecesOf(m) {
      const bits = [0, 1, 2, 3].filter((d) => m & (1 << d));
      if (bits.length === 1) return [[bits[0], -1]];
      const out = [];
      for (let i = 0; i < bits.length; i++) for (let j = i + 1; j < bits.length; j++) out.push([bits[i], bits[j]]);
      return out;
    }

    /* ---------- la rete ---------- */
    function buildNet() {
      const w = W(), C = X.C, g = Geo();
      computeDeck();
      const dash = C['road-2'];
      for (let t = 0; t < w.n; t++) {
        const rd = w.road[t], rl = w.rail[t];
        if (!rd && !rl && !w.st[t]) continue;
        const tx = t % w.w, tz = (t / w.w) | 0;
        // dentro la galleria non si vede niente: la collina copre tutto
        if (w.tun[t]) continue;
        // imbocco di una galleria: arco di pietra sul lato verso la collina
        for (const k of [rl, rd]) for (let d = 0; d < 4; d++) {
          if (!(k & (1 << d))) continue;
          const nx = tx + DX[d], nz = tz + DY[d];
          if (nx >= 0 && nz >= 0 && nx < w.w && nz < w.h && w.tun[nz * w.w + nx]) portal(g, tx, tz, d, w.ht[t] * X.HU);
        }
        // ponte: impalcato con il bordo, pilastri tondi a ogni casella, ringhiere coi paletti
        if (w.water[t] && (rd || rl)) {
          const ns = (rd || rl) & 5, ax = ns ? Math.PI / 2 : 0, y = deck[t], cx = tx + 0.5, cz = tz + 0.5;
          box(g, cx, y - 0.1, cz, 1.02, 0.09, 0.66, ax, C.bridge);
          box(g, cx, y - 0.13, cz, 1.02, 0.04, 0.72, ax, C.bridge.clone().multiplyScalar(0.88));
          for (const s of [-1, 1]) {
            const ox = ns ? s * 0.31 : 0, oz = ns ? 0 : s * 0.31;
            box(g, cx + ox, y + 0.07, cz + oz, ns ? 0.04 : 1.02, 0.035, ns ? 1.02 : 0.04, 0, C.bridge);
            for (const f of [-0.5, 0]) box(g, cx + ox + (ns ? 0 : f), y - 0.02, cz + oz + (ns ? f : 0), 0.05, 0.11, 0.05, 0, C.bridge.clone().multiplyScalar(0.92));
          }
          // pilastro: tronco largo sotto l'impalcato, che entra nell'acqua
          box(g, cx, -0.32, cz, ns ? 0.36 : 0.16, y + 0.2, ns ? 0.16 : 0.36, 0, C.bridge.clone().multiplyScalar(0.85));
        }
        if (rd) {
          for (const [a, b] of piecesOf(rd)) {
            const pts = piece(t, a, b, 6);
            ribbon(g, pts, 0.56, 0.025, C.road);
            if (b === opp(a) && !w.st[t] && !rl) {
              // due trattini bianchi in mezzo alla strada dritta
              const [x0, z0] = pts[0], [x1, z1] = pts[pts.length - 1], at = (f) => [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f];
              ribbon(g, [at(0.15), at(0.35)], 0.05, 0.03, dash); ribbon(g, [at(0.65), at(0.85)], 0.05, 0.03, dash);
            }
          }
          if (piecesOf(rd).length > 1) { const y = hR(tx + 0.5, tz + 0.5); box(g, tx + 0.5, y + 0.005, tz + 0.5, 0.56, 0.02, 0.56, 0, C.road); }
        }
        if (rl) {
          for (const [a, b] of piecesOf(rl)) {
            const pts = piece(t, a, b, 7);
            ribbon(g, pts, 0.46, rd ? 0.035 : 0.02, C.ballast);
            // traversine
            for (let k = 0; k < pts.length - 1; k++) {
              const [x0, z0] = pts[k], [x1, z1] = pts[k + 1], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
              if (b === opp(a) || k % 1 === 0) box(g, mx, hR(mx, mz) + 0.025, mz, 0.06, 0.025, 0.4, Math.atan2(z1 - z0, x1 - x0), C.sleeper);
            }
            if (b === opp(a)) {
              const p0 = pts[0], p1 = pts[2], mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
              for (const f of [0.25, 0.75]) { const x = p0[0] + (p1[0] - p0[0]) * f, z = p0[1] + (p1[1] - p0[1]) * f; box(g, x, hR(x, z) + 0.025, z, 0.06, 0.025, 0.4, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), C.sleeper); }
              void mx; void mz;
            }
            ribbon(g, pts, 0.035, 0.06, C.rail, -0.12); ribbon(g, pts, 0.035, 0.06, C.rail, 0.12);
          }
          // fondo cieco: paraurti
          if ((rl & (rl - 1)) === 0 && !w.st[t]) { const d = [0, 1, 2, 3].find((k) => rl & (1 << k)); const x = tx + 0.5, z = tz + 0.5; box(g, x, hR(x, z) + 0.02, z, 0.08, 0.14, 0.42, Math.atan2(DY[d], DX[d]), C.canopy); }
          // senso unico: freccia sulla massicciata
          if (w.ow[t]) {
            const d = w.ow[t] - 1, cx = tx + 0.5, cz = tz + 0.5, y = hR(cx, cz) + 0.075, fx = DX[d], fz = DY[d], sx = -fz, sz = fx;
            tri(g, [cx + fx * 0.3, y, cz + fz * 0.3], [cx - fx * 0.05 + sx * 0.18, y, cz - fz * 0.05 + sz * 0.18], [cx - fx * 0.05 - sx * 0.18, y, cz - fz * 0.05 - sz * 0.18], C.arrow, UP);
            tri(g, [cx - fx * 0.05 + sx * 0.06, y, cz - fz * 0.05 + sz * 0.06], [cx - fx * 0.3 + sx * 0.06, y, cz - fz * 0.3 + sz * 0.06], [cx - fx * 0.3 - sx * 0.06, y, cz - fz * 0.3 - sz * 0.06], C.arrow, UP);
            tri(g, [cx - fx * 0.05 + sx * 0.06, y, cz - fz * 0.05 + sz * 0.06], [cx - fx * 0.3 - sx * 0.06, y, cz - fz * 0.3 - sz * 0.06], [cx - fx * 0.05 - sx * 0.06, y, cz - fz * 0.05 - sz * 0.06], C.arrow, UP);
          }
        }
        // stazioni e fermate
        if (w.st[t]) {
          const st = X.s.stations[w.st[t] - 1];
          const ax = w.sax[t], yaw = ax === 1 ? 0 : Math.PI / 2, cx = tx + 0.5, cz = tz + 0.5, y = hR(cx, cz);
          const side = (k) => [cx + (ax === 1 ? 0 : k), cz + (ax === 1 ? k : 0)];
          if (w.sk[t] === 1) {
            if (!rl) ribbon(g, piece(t, ax === 1 ? 3 : 0, ax === 1 ? 1 : 2, 2), 0.46, 0.02, C.ballast);
            for (const k of [-0.37, 0.37]) { const [x, z] = side(k); box(g, x, y, z, 1.0, 0.12, 0.22, yaw, C.platform); }
            const idx = st.tiles.indexOf(t);
            if (idx % 2 === 0) {
              const [x, z] = side(-0.37);
              for (const f of [-0.35, 0.35]) box(g, x + (ax === 1 ? f : 0), y + 0.12, z + (ax === 1 ? 0 : f), 0.04, 0.3, 0.04, 0, C.metal);
              box(g, x, y + 0.42, z, 0.95, 0.05, 0.34, yaw, C.canopy);
            }
            if (idx === 0) { const [x, z] = side(0.4); box(g, x, y + 0.12, z, 0.04, 0.3, 0.04, 0, C.metal); box(g, x, y + 0.4, z, 0.3, 0.12, 0.05, yaw, C.sign); }
          } else {
            if (!rd) { const pts = piece(t, ax === 1 ? 3 : 0, ax === 1 ? 1 : 2, 2); ribbon(g, pts, 0.56, 0.025, C.road); }
            const [x, z] = side(-0.38);
            box(g, x, y, z, 0.55, 0.05, 0.18, yaw, C.platform);
            box(g, x + (ax === 1 ? 0 : -0.07), y + 0.05, z + (ax === 1 ? -0.07 : 0), ax === 1 ? 0.5 : 0.04, 0.26, ax === 1 ? 0.04 : 0.5, 0, C.glass || C.window);
            box(g, x, y + 0.31, z, 0.6, 0.05, 0.24, yaw, C.stop);
            const [px, pz] = side(0.4);
            box(g, px, y, pz, 0.04, 0.36, 0.04, 0, C.metal); box(g, px, y + 0.36, pz, 0.18, 0.14, 0.04, yaw, C.sign);
          }
        }
      }
      const geo = X.keep(new T.BufferGeometry());
      geo.setAttribute('position', new T.Float32BufferAttribute(g.P, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(g.N, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(g.C, 3));
      geo.computeBoundingSphere();
      const mat = X.R3.mats.vc2 || (X.R3.mats.vc2 = X.keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: X.R3.grad, side: T.DoubleSide })));
      return new T.Mesh(geo, mat);
    }
    /* ---------- imbocco della galleria: arco di pietra con la chiave colorata e il buio dentro ----------
     * t = casella fuori (quota y0), d = lato verso la collina. L'arco sta sul confine tra le due caselle, un po' in fuori;
     * il binario o la strada continuano sotto la collina (che li copre), i mezzi lì dentro non si disegnano. */
    function portal(g, tx, tz, d, y0) {
      const C = X.C, nx = DX[d], nz = DY[d], ux = -nz, uz = nx;          // n = verso la collina, u = di traverso
      const bx = tx + 0.5 + nx * 0.5, bz = tz + 0.5 + nz * 0.5;
      const P = (u, v, o) => [bx + ux * u + nx * o, y0 + v, bz + uz * u + nz * o];
      const r0 = 0.25, r1 = 0.36, sp = 0.15, front = -0.2, back = -0.04, N = 9, stone = C.stone, dark = C.tunnel;
      const nF = [-nx, 0, -nz];
      // il buio: mezzo disco + rettangolo, appena dietro l'arco
      for (let k = 0; k < N; k++) {
        const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N;
        tri(g, P(0, sp, back + 0.03), P(Math.cos(a0) * r0, sp + Math.sin(a0) * r0, back + 0.03), P(Math.cos(a1) * r0, sp + Math.sin(a1) * r0, back + 0.03), dark, nF);
      }
      tri(g, P(-r0, -0.03, back + 0.03), P(r0, -0.03, back + 0.03), P(r0, sp, back + 0.03), dark, nF);
      tri(g, P(-r0, -0.03, back + 0.03), P(r0, sp, back + 0.03), P(-r0, sp, back + 0.03), dark, nF);
      // l'arco: conci (fronte, estradosso, intradosso), il centrale con la chiave colorata
      for (let k = 0; k < N; k++) {
        const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N, col = k === (N >> 1) ? C.sign : (k & 1 ? stone : stone.clone().multiplyScalar(0.93));
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const i0 = P(c0 * r0, sp + s0 * r0, front), i1 = P(c1 * r0, sp + s1 * r0, front), o0 = P(c0 * r1, sp + s0 * r1, front), o1 = P(c1 * r1, sp + s1 * r1, front);
        tri(g, i0, o0, o1, col, nF); tri(g, i0, o1, i1, col, nF);
        const o0b = P(c0 * r1, sp + s0 * r1, back), o1b = P(c1 * r1, sp + s1 * r1, back), i0b = P(c0 * r0, sp + s0 * r0, back), i1b = P(c1 * r0, sp + s1 * r0, back);
        const cm = Math.cos((a0 + a1) / 2), sm = Math.sin((a0 + a1) / 2), nO = [ux * cm, sm, uz * cm], nI = [-ux * cm, -sm, -uz * cm];
        tri(g, o0, o0b, o1b, col, nO); tri(g, o0, o1b, o1, col, nO);
        tri(g, i0, i1, i1b, col, nI); tri(g, i0, i1b, i0b, col, nI);
      }
      // piedritti
      const yaw = d & 1 ? Math.PI / 2 : 0, cx = (u) => bx + ux * u + nx * (front + back) / 2, cz = (u) => bz + uz * u + nz * (front + back) / 2;
      for (const s of [-1, 1]) box(g, cx(s * (r0 + r1) / 2), y0 - 0.06, cz(s * (r0 + r1) / 2), r1 - r0 + 0.02, sp + 0.06, back - front, yaw, stone);
    }

    /* ---------- semafori (istanze ricolorate) ---------- */
    let sigs = [], sigKey = '';
    function buildSignals(group) {
      const w = W();
      sigs = [];
      for (let t = 0; t < w.n; t++) if (w.sig[t]) sigs.push(t);
      if (!sigs.length) return;
      const pole = X.inst(X.GEO.cylLo, X.toon(X.C.metal), sigs.length), head = X.inst(X.GEO.sph, X.icToon(), sigs.length);
      const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), sc = new T.Vector3();
      for (const t of sigs) {
        const tx = t % w.w, tz = (t / w.w) | 0, ns = w.rail[t] === 5;
        const x = tx + 0.5 + (ns ? 0.32 : 0), z = tz + 0.5 + (ns ? 0 : 0.32), y = hR(x, z);
        p.set(x, y, z); sc.set(0.025, 0.36, 0.025); m.compose(p, q, sc); pole.setMatrixAt(pole.count++, m);
        p.set(x, y + 0.42, z); sc.set(0.065, 0.065, 0.065); m.compose(p, q, sc); head.setMatrixAt(head.count, m); head.setColorAt(head.count++, X.C.go);
      }
      pole.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true; head.instanceColor.needsUpdate = true;
      X.R3.sigHead = head; sigKey = '';
      group.add(pole, head, X.withOutline(head, 0.012));
    }
    /* ---------- lampioni delle stazioni e delle fermate: palo (toon) + lanterna che si accende di sera ---------- */
    let lampOn = -1;
    function buildLamps(group) {
      const w = W(), sts = X.s.stations.filter(Boolean);
      lampOn = -1; X.R3.lampHead = null;
      if (!sts.length) return;
      const pole = X.inst(X.GEO.cylLo, X.toon(X.C.metal), sts.length), head = X.inst(X.GEO.sph, X.R3.lampMat || (X.R3.lampMat = X.basic(X.C.lamp)), sts.length);
      const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), sc = new T.Vector3();
      for (const st of sts) {
        const t = st.tiles[0], ax = w.sax[t], tx = t % w.w, tz = (t / w.w) | 0;
        // sul lato del cartello, verso l'inizio della banchina
        const along = st.kind === 'rail' ? -0.36 : -0.3, side = st.kind === 'rail' ? 0.4 : 0.4;
        const x = tx + 0.5 + (ax === 1 ? along : side), z = tz + 0.5 + (ax === 1 ? side : along), y = hR(x, z);
        p.set(x, y, z); sc.set(0.022, 0.5, 0.022); m.compose(p, q, sc); pole.setMatrixAt(pole.count++, m);
        p.set(x, y + 0.53, z); sc.set(0.055, 0.055, 0.055); m.compose(p, q, sc); head.setMatrixAt(head.count++, m);
      }
      pole.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true;
      X.R3.lampHead = head;
      group.add(pole, head, X.withOutline(head, 0.01));
    }
    // lanterna spenta (lampada smorzata dalla luce del giorno) → accesa di notte
    function paintLamps() {
      const k = X.sky, m = X.R3.lampMat;
      if (!k || !m) return;
      const q = Math.round(k.lit * 100) + ':' + Math.round(k.night * 100);
      if (q === lampOn) return;
      lampOn = q;
      m.color.copy(X.C.metal).multiply(k.tint).lerp(X.C.lamp, k.lit);
    }
    // rosso se il tratto dopo il semaforo è prenotato da un treno, verde se libero
    function paintSignals() {
      const h = X.R3.sigHead;
      if (!h || !sigs.length) return;
      const w = W();
      let key = '';
      for (const t of sigs) key += w.resv[t] ? '1' : '0';
      if (key === sigKey) return;
      sigKey = key;
      sigs.forEach((t, i) => h.setColorAt(i, w.resv[t] ? X.C.stopl : X.C.go));
      h.instanceColor.needsUpdate = true;
    }
    function rebuildNet() {
      const key = String(X.s.nv || 1) + ':' + X.s.stations.length;
      if (key === X.R3.netKey) return false;
      X.R3.netKey = key;
      const g = X.R3.net;
      for (const c of g.children.slice()) { g.remove(c); if (c.geometry && !c.isInstancedMesh) c.geometry.dispose(); }
      X.R3.sigHead = null;
      g.add(buildNet());
      buildSignals(g);
      buildLamps(g);
      return true;
    }

    /* ---------- anteprima, selezione, area di raccolta ---------- */
    let fxMesh = null, fxKey = '';
    function overlay(list, key) {
      // list = [{ t, c: 'ok'|'bad'|'sel'|'area', a }] (a = opacità)
      if (key === fxKey) return;
      fxKey = key;
      if (fxMesh) { X.R3.fx.remove(fxMesh); fxMesh.geometry.dispose(); fxMesh = null; }
      if (!list.length) return;
      const w = W(), P = [], Cc = [];
      for (const o of list) {
        const tx = o.t % w.w, tz = (o.t / w.w) | 0, col = X.C[o.c] || X.C.sel, e = o.e == null ? 0.06 : o.e;
        const pts = [[tx + e, tz + e], [tx + 1 - e, tz + e], [tx + 1 - e, tz + 1 - e], [tx + e, tz + 1 - e]].map(([x, z]) => [x, Math.max(hR(x, z), X.hAt(x, z)) + 0.09, z]);
        for (const p of [pts[0], pts[3], pts[1], pts[1], pts[3], pts[2]]) { P.push(...p); Cc.push(col.r, col.g, col.b, o.a == null ? 0.55 : o.a); }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(Cc, 4));
      const mat = X.R3.mats.fx || (X.R3.mats.fx = X.keep(new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: T.DoubleSide })));
      fxMesh = new T.Mesh(geo, mat); fxMesh.renderOrder = 5;
      X.R3.fx.add(fxMesh);
    }
    const resetFx = () => { fxKey = '#'; fxMesh = null; };
    function catchment(st) {
      const w = W(), r = S.CATCH[st.kind], out = [];
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const t of st.tiles) { const x = t % w.w, y = (t / w.w) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let y = Math.max(0, y0 - r); y <= Math.min(w.h - 1, y1 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(w.w - 1, x1 + r); x++) {
        const t = y * w.w + x;
        out.push({ t, c: st.tiles.includes(t) ? 'sel' : 'ok', a: st.tiles.includes(t) ? 0.6 : 0.18, e: 0.02 });
      }
      return out;
    }
    return { hR, buildNet, rebuildNet, paintSignals, paintLamps, overlay, resetFx, catchment, piece };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
