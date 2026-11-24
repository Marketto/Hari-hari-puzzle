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
    const tH = (i) => (W().water[i] ? (deck && !isNaN(deck[i]) ? deck[i] : -0.2) : W().ht[i] * X.HU);
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
    function tri(g, a, b, c, col, n) {
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
        // ponte: impalcato, pilastri e ringhiere
        if (w.water[t] && (rd || rl)) {
          const ax = (rd || rl) & 5 ? Math.PI / 2 : 0, y = deck[t];
          box(g, tx + 0.5, y - 0.09, tz + 0.5, 1.02, 0.08, 0.62, ax, C.bridge);
          for (const s of [-1, 1]) box(g, tx + 0.5 + (ax ? s * 0.3 : 0), y, tz + 0.5 + (ax ? 0 : s * 0.3), ax ? 0.05 : 1.02, 0.12, ax ? 1.02 : 0.05, 0, C.bridge);
          box(g, tx + 0.5, -0.3, tz + 0.5, 0.14, y + 0.22, 0.14, 0, C.bridge.clone().multiplyScalar(0.85));
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
