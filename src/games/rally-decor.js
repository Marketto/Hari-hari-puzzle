/* Hari Rally — decorazioni delle ambientazioni: bosco, città, mare e neve.
 * Parte di rally-ui.js (stesso create()): si carica prima e rally-ui.js la monta con HH.rallyDecor(RX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // RX = contesto condiviso con rally-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.rallyDecor = function (RX) {
    const { P, T, keep, basic, M4, merge, meshOf, sdist, groundH, YAW, pick, snowman, stands } = RX;
    /* ---------- bosco: alberi, funghi (anche giganti), fiori, laghetti, staccionate, casette sugli alberi,
       animaletti che salutano, lanterne di carta la sera ---------- */
    function treesAlong(K, pinePct) {
      const { a, b, r, L2, WL, clearOf, inBridge, HALF, add, at } = K;
      for (let sv = a; sv < b; sv += 2.4) {
        for (const side of [-1, 1]) {
          const br = inBridge(sv, 6);
          // alberi a più file: la chioma (fino a 2,9 × scala) non arriva mai sopra la zona guidabile
          const dl = WL + 3 + Math.pow(r(), 1.5) * 32;
          if (r() < 0.8 - (dl - 10) / 70) {
            const k = 0.75 + r() * 0.6, q = r(), isPine = r() < pinePct;
            const w = P.world(RX.g, sv + (r() - 0.5) * 2.4, side * dl);
            if (clearOf(w.x, w.y, WL + (isPine ? 2.2 : 2.9) * k)) (isPine ? L2.pine : L2.round).push([w.x, w.y, k, q]);
          }
          if (r() < 0.06) {
            const k = 0.8 + r() * 0.7, w = P.world(RX.g, sv, side * (WL + 0.7 * k + 0.4 + r() * 2));
            if (clearOf(w.x, w.y, WL + 0.65 * k)) { const h = groundH(w.x, w.y) + 0.14; mushroom(add, w.x, h, -w.y, k); }
          }
          if (!br && r() < 0.16) { const w = P.world(RX.g, sv, side * (HALF + 1.8 + r() * 2.4)); if (clearOf(w.x, w.y, HALF + 1.5)) L2.flow.push([w.x, w.y, Math.floor(r() * 3)]); }
          if (r() < 0.03) { const k = 0.6 + r() * 0.9, w = P.world(RX.g, sv, side * (WL + 3 + r() * 10)); if (clearOf(w.x, w.y, WL + 2)) L2.rock.push([w.x, w.y, k, r() < 0.5 ? RX.C.rock : RX.C['rock-2']]); }
        }
      }
      void at;
    }
    function mushroom(add, x, h, z, k) {
      add(RX.GEO.cyl, RX.C.stem, M4(x, h + 0.35 * k, z, 0, 0, 0, 0.22 * k, 0.7 * k, 0.22 * k), 0.04);
      add(RX.GEO.sph, RX.C.cap, M4(x, h + 0.75 * k, z, 0, 0, 0, 0.62 * k, 0.4 * k, 0.62 * k), 0.05);
      for (let i = 0; i < 3; i++) { const a2 = i * 2.1 + x; add(RX.GEO.sph, RX.C['cap-dot'], M4(x + Math.cos(a2) * 0.36 * k, h + 0.98 * k, z + Math.sin(a2) * 0.36 * k, 0, 0, 0, 0.1 * k, 0.06 * k, 0.1 * k)); }
    }
    function pond(K, iceOk) {
      const { a, r, add, clearOf } = K;
      if (r() >= 0.26) return;
      const sv = a + 30 + r() * 60, side = r() < 0.5 ? -1 : 1, w = P.world(RX.g, sv, side * (24 + r() * 10));
      if (!clearOf(w.x, w.y, 18)) return;
      const h = groundH(w.x, w.y) + 0.2, rr = 6 + r() * 4;
      add(RX.GEO.cyl, RX.C['water-2'], M4(w.x, h - 0.05, -w.y, 0, r() * 3, 0, rr + 0.8, 0.12, rr * 0.7 + 0.8));
      add(RX.GEO.cyl, RX.C.water, M4(w.x, h + 0.02, -w.y, 0, 0, 0, rr, 0.1, rr * 0.7));
      if (!iceOk) for (let i = 0; i < 3; i++) add(RX.GEO.cyl, RX.C['leaf-1'], M4(w.x + (r() - 0.5) * rr, h + 0.1, -w.y + (r() - 0.5) * rr * 0.6, 0, 0, 0, 0.9, 0.05, 0.9));
    }
    // animaletto su un ceppo che saltella e saluta, rivolto alla strada
    function critterAt(K, sv, side, onStump) {
      const { at, add, L2, WL, r } = K;
      if (P.edgeAt(RX.g, sv).kind !== 'wall') return;
      const p = at(sv, side * (WL + 0.75), 'g');
      let h = p.h;
      if (onStump) { add(RX.GEO.cyl, RX.C.trunk, M4(p.x, h + 0.25, p.z, 0, 0, 0, 0.45, 0.5, 0.45), 0.04); h += 0.5; }
      L2.crit.push([p.x, h, p.z, p.ry - side * Math.PI / 2, 0.9 + r() * 0.3, RX.C['fur-' + (1 + Math.floor(r() * 4))], r() * 6, 0.32]);
    }
    // lanterna di carta su un palo (accesa al tramonto e di notte)
    function lantern(K, sv, side) {
      const { at, add, L2, WL, glowAt, r } = K;
      if (P.edgeAt(RX.g, sv).kind !== 'wall') return;
      const p = at(sv, side * (WL + 0.55), 'g'), q = at(sv, side * (WL + 0.25), 'g');
      add(RX.GEO.cyl, RX.C['wood-2'], M4(p.x, p.h + 1.2, p.z, 0, 0, 0, 0.07, 2.4, 0.07), 0.03);
      add(RX.GEO.sph, RX.C['flag-' + (1 + Math.floor(r() * 4))], M4(q.x, p.h + 2.05, q.z, 0, 0, 0, 0.26, 0.34, 0.26), 0.03);
      L2.bulb.push([q.x, p.h + 2.05, q.z, 0.12]);
      const pool = at(sv, side * (P.HALF - 0.2), 0);
      glowAt(q.x, p.h + 2.05, q.z, 2.8, pool.h, pool.x, pool.z);
    }
    function decorForest(K) {
      const { a, b, r, add, at, L2, WL, clearOf, lit } = K;
      treesAlong(K, RX.cfg.stage === 'autumn' ? 0.35 : 0.42);
      pond(K, false);
      // funghi giganti lontano dalla strada
      for (let i = 0; i < 2; i++) {
        if (r() > 0.45) continue;
        const k = 1.5 + r() * 1.1, side = r() < 0.5 ? -1 : 1, w = P.world(RX.g, a + r() * (b - a), side * (WL + 2.2 * k + 2 + r() * 14));
        if (!clearOf(w.x, w.y, WL + 2.2 * k + 1)) continue;
        const h = groundH(w.x, w.y) + 0.1, x = w.x, z = -w.y;
        add(RX.GEO.cyl, RX.C.stem, M4(x, h + 1.3 * k, z, 0, 0, 0, 0.42 * k, 2.6 * k, 0.42 * k), 0.06);
        add(RX.GEO.sph, RX.C.cap, M4(x, h + 2.8 * k, z, 0, 0, 0, 2.0 * k, 1.1 * k, 2.0 * k), 0.1);
        for (let j = 0; j < 6; j++) { const an = j * 1.05 + x; add(RX.GEO.sph, RX.C['cap-dot'], M4(x + Math.cos(an) * 1.25 * k, h + 3.45 * k, z + Math.sin(an) * 1.25 * k, 0, 0, 0, 0.32 * k, 0.16 * k, 0.32 * k)); }
        // finestrella e porticina nel gambo (casetta-fungo)
        add(RX.GEO.box, RX.C['wood-2'], M4(x + 0.42 * k, h + 0.5 * k, z, 0, 0, 0, 0.1, 1.0 * k, 0.55 * k));
        L2.win.push([x + 0.44 * k, h + 1.7 * k, z, Math.PI / 2, 0.4 * k, 0.4 * k, lit ? RX.C['win-on'] : RX.C.win]);
      }
      // casetta sull'albero
      if (r() < 0.2) {
        const side = r() < 0.5 ? -1 : 1, sv = a + 20 + r() * 80, d = side * (WL + 7 + r() * 10), w = P.world(RX.g, sv, d);
        if (clearOf(w.x, w.y, WL + 6)) {
          const h = groundH(w.x, w.y) + 0.1, x = w.x, z = -w.y, ry = YAW(w.th) - side * Math.PI / 2;
          add(RX.GEO.cyl, RX.C.trunk, M4(x, h + 3.2, z, 0, 0, 0, 0.5, 6.4, 0.5), 0.05);
          for (const [ox, oy, oz, k] of [[0, 8.2, 0, 2.6], [1.6, 7.2, 0.8, 1.7], [-1.5, 7.4, -0.6, 1.8]]) add(RX.GEO.sph, RX.C['leaf-1'], M4(x + ox, h + oy, z + oz, 0, 0, 0, k, k * 0.85, k), 0.12);
          add(RX.GEO.cyl, RX.C['wood-2'], M4(x, h + 3.6, z, 0, 0, 0, 2.0, 0.22, 2.0), 0.05);
          add(RX.GEO.box, RX.C.wood, M4(x, h + 4.6, z, 0, ry, 0, 1.9, 1.8, 1.7), 0.05);
          add(RX.GEO.prism, RX.C.cap, M4(x, h + 5.5 + 0.45, z, 0, ry, 0, 2.3, 0.9, 1.25), 0.05);
          const fx = Math.sin(ry), fz = Math.cos(ry);
          L2.win.push([x + fx * 0.87, h + 4.7, z + fz * 0.87, ry, 0.6, 0.6, lit ? RX.C['win-on'] : RX.C.win]);
          for (const e of [-0.3, 0.3]) add(RX.GEO.box, RX.C['wood-2'], M4(x + fx * 1.6 + Math.cos(ry) * e, h + 1.8, z + fz * 1.6 - Math.sin(ry) * e, 0.25, ry, 0, 0.08, 3.8, 0.08));
          for (let j = 0; j < 6; j++) add(RX.GEO.box, RX.C.wood, M4(x + fx * (1.5 - j * 0.04), h + 0.5 + j * 0.6, z + fz * (1.5 - j * 0.04), 0.25, ry, 0, 0.66, 0.06, 0.08));
        }
      }
      // animaletti che salutano dal bordo
      const nc = r() < 0.55 ? 1 + Math.floor(r() * 2) : 0;
      for (let i = 0; i < nc; i++) critterAt(K, a + 10 + r() * 100, r() < 0.5 ? -1 : 1, true);
      // lanterne di carta (tramonto e notte)
      if (lit) for (let sv = a + 10; sv < b; sv += 30) lantern(K, sv, Math.floor(sv / 30) % 2 ? 1 : -1);
      void at;
    }

    /* ---------- città: palazzi colorati con finestre (accese la sera), negozi con tende e insegne, vie laterali con
       strisce pedonali e semafori decorativi, lampioni, alberi, pubblico ---------- */
    function decorCity(K) {
      const { a, b, r, add, at, L2, WL, clearOf, inBridge, inTunnel, lit, glowAt } = K;
      const BC = ['bld-1', 'bld-2', 'bld-3', 'bld-4', 'bld-5', 'bld-6'];
      const winC = () => (lit ? (r() < 0.72 ? RX.C['win-on'] : RX.C['win-off']) : RX.C.win);
      for (const side of [-1, 1]) {
        let sv = a + r() * 4;
        while (sv < b - 4) {
          const w = 7 + r() * 6, mid = sv + w / 2;
          if (inBridge(mid, w / 2 + 5) || inTunnel(mid, w / 2 + 6) || P.edgeAt(RX.g, mid).kind !== 'wall') { sv += 4; continue; }
          const d0 = WL + 2.2;
          if (r() < 0.12) { sideStreet(K, mid, side); sv += 9; continue; }
          const dep = 6 + r() * 5, hgt = 6 + r() * 9;
          const cs = [[sv, d0], [sv + w, d0], [sv, d0 + dep], [sv + w, d0 + dep], [mid, d0 + dep / 2]].map(([q, d]) => P.world(RX.g, q, side * d));
          if (!cs.every((c) => clearOf(c.x, c.y, WL + 1.6))) { sv += 4; continue; }
          const c0 = at(mid, side * (d0 + dep / 2), 'g'), base0 = Math.min(...cs.map((c) => groundH(c.x, c.y))) - 0.4;
          const yawF = c0.ry - side * Math.PI / 2;   // verso la strada
          const ax = Math.cos(c0.ry), az = -Math.sin(c0.ry), fx = Math.sin(c0.ry), fz = Math.cos(c0.ry);   // x locale (sinistra) e z locale (avanti)
          const top = c0.h + hgt;
          const colB = RX.C[pick(r, BC)];
          add(RX.GEO.box, colB, M4(c0.x, (base0 + top) / 2, c0.z, 0, c0.ry, 0, dep, top - base0, w), 0.06);
          roof(add, r, c0.x, top, c0.z, c0.ry, dep, w);
          // facciata verso la strada: x locale = −side
          const fxo = -side * (dep / 2 + 0.03);
          const fpt = (u, y) => [c0.x + ax * fxo + fx * u, y, c0.z + az * fxo + fz * u];
          const ncol = Math.max(1, Math.floor((w - 1.2) / 2.3));
          const floors = Math.floor(hgt / 3);
          for (let f = 1; f < floors; f++) for (let cI = 0; cI < ncol; cI++) {
            const u = (cI - (ncol - 1) / 2) * 2.3, [x, y, z] = fpt(u, c0.h + 1.6 + f * 3);
            L2.win.push([x, y, z, yawF, 1.1, 1.4, winC()]);
          }
          // negozio al pianterreno: vetrina, porta, tenda a righe e insegna
          const shopC = pick(r, ['awn-1', 'awn-3', 'flag-4', 'flag-3']);
          { const [x, y, z] = fpt(-w * 0.18, c0.h + 1.3); L2.win.push([x, y, z, yawF, w * 0.4, 1.5, lit ? RX.C['win-on'] : RX.C.win]); }
          { const [x, y, z] = fpt(w * 0.25, c0.h + 1.0); add(RX.GEO.box, RX.C['win-off'], M4(x, y, z, 0, c0.ry, 0, 0.08, 2.0, 1.1)); }
          const nA = Math.min(7, Math.max(3, Math.floor(w * 0.5)) | 1);
          for (let j = 0; j < nA; j++) {
            const u = -w * 0.425 + (j + 0.5) * (w * 0.85 / nA), [x, , z] = fpt(u, 0);
            const ox = -side * 0.6;
            add(RX.GEO.box, j % 2 ? RX.C[shopC] : RX.C['awn-2'], M4(x + ax * ox, c0.h + 2.75, z + az * ox, 0, c0.ry, side * 0.35, 1.25, 0.08, w * 0.85 / nA + 0.01));
          }
          { const [x, , z] = fpt(0, 0); add(RX.GEO.box, RX.C.sign, M4(x, c0.h + 3.7, z, 0, c0.ry, 0, 0.16, 0.8, w * 0.5), 0.04);
            const ix = x + ax * (-side * 0.1), iz = z + az * (-side * 0.1);
            add(RX.GEO.sph, RX.C[pick(r, ['gift-1', 'gift-2', 'gift-3', 'carrot', 'acorn'])], M4(ix, c0.h + 3.7, iz, 0, 0, 0, 0.12, 0.32, 0.32)); }
          // seconda fila più alta, dietro
          const d1 = d0 + dep + 2 + r() * 3, dep2 = 7 + r() * 5, h2 = hgt + 6 + r() * 14;
          const c2 = at(mid, side * (d1 + dep2 / 2), 'g'), cc2 = P.world(RX.g, mid, side * (d1 + dep2 / 2));
          if (clearOf(cc2.x, cc2.y, WL + 6)) {
            const top2 = c2.h + h2;
            add(RX.GEO.box, RX.C[pick(r, BC)], M4(c2.x, (base0 + top2) / 2, c2.z, 0, c2.ry, 0, dep2, top2 - base0, w * 0.92), 0.06);
            roof(add, r, c2.x, top2, c2.z, c2.ry, dep2, w * 0.92);
            const fxo2 = -side * (dep2 / 2 + 0.03), ax2 = Math.cos(c2.ry), az2 = -Math.sin(c2.ry), fx2 = Math.sin(c2.ry), fz2 = Math.cos(c2.ry);
            for (let f = Math.ceil((hgt + 1) / 3); f < Math.floor(h2 / 3); f++) for (let cI = 0; cI < ncol; cI++) {
              const u = (cI - (ncol - 1) / 2) * 2.3;
              L2.win.push([c2.x + ax2 * fxo2 + fx2 * u, c2.h + 1.6 + f * 3, c2.z + az2 * fxo2 + fz2 * u, c2.ry - side * Math.PI / 2, 1.1, 1.4, winC()]);
            }
          }
          sv += w + 0.6 + r() * 1.5;
        }
      }
      // lampioni sul marciapiede dietro le transenne, col braccio sopra il marciapiede (a 5 m d'altezza)
      for (let sv = a + 6; sv < b; sv += 26) {
        const side = Math.floor(sv / 26) % 2 ? 1 : -1;
        if (P.edgeAt(RX.g, sv).kind !== 'wall') continue;
        streetLamp(K, sv, side, RX.C.lamp);
      }
      // pubblico che tifa
      if (r() < 0.3) stands(K, a + 20 + r() * 70, r() < 0.5 ? -1 : 1, 14);
      void lit; void glowAt;
    }
    function roof(add, r, x, top, z, ry, dep, w) {
      const t = r();
      if (t < 0.45) {
        add(RX.GEO.box, RX.C.roof, M4(x, top + 0.15, z, 0, ry, 0, dep + 0.3, 0.3, w + 0.3), 0.04);
        if (r() < 0.5) { const ox = (r() - 0.5) * dep * 0.4; add(RX.GEO.cyl, RX.C['roof-2'], M4(x + Math.cos(ry) * ox, top + 1.1, z - Math.sin(ry) * ox, 0, 0, 0, 0.8, 1.6, 0.8), 0.04); add(RX.GEO.cone, RX.C.roof, M4(x + Math.cos(ry) * ox, top + 2.2, z - Math.sin(ry) * ox, 0, 0, 0, 0.95, 0.6, 0.95), 0.03); }
      } else if (t < 0.85) {
        const rh = 1.4 + r() * 1.6;
        add(RX.GEO.prism, r() < 0.5 ? RX.C.roof : RX.C['roof-2'], M4(x, top + rh / 3, z, 0, ry, 0, dep + 0.4, rh / 1.5, (w + 0.4) / 1.73), 0.05);
      } else add(RX.GEO.sph, RX.C['roof-2'], M4(x, top, z, 0, ry, 0, dep * 0.4, dep * 0.35, w * 0.32), 0.05);
    }
    function streetLamp(K, sv, side, colPole) {
      const { at, add, L2, WL, glowAt } = K;
      const p = at(sv, side * (WL + 0.75), 'g'), arm = at(sv, side * (WL - 0.2), 'g');
      add(RX.GEO.cyl, colPole, M4(p.x, p.h + 2.6, p.z, 0, 0, 0, 0.09, 5.2, 0.09), 0.03);
      add(RX.GEO.box, colPole, M4((p.x + arm.x) / 2, p.h + 5.15, (p.z + arm.z) / 2, 0, p.ry, 0, 0.95, 0.08, 0.08), 0.02);
      add(RX.GEO.box, colPole, M4(arm.x, p.h + 5.05, arm.z, 0, p.ry, 0, 0.46, 0.18, 0.3), 0.03);
      L2.bulb.push([arm.x, p.h + 4.92, arm.z, 0.16]);
      const pool = at(sv, side * (P.HALF - 0.4), 0);
      glowAt(arm.x, p.h + 4.9, arm.z, 4.2, pool.h, pool.x, pool.z);
    }
    function sideStreet(K, mid, side) {
      const { at, add, WL, L2 } = K;
      const p = at(mid, side * (WL + 9), 'g');
      add(RX.GEO.box, RX.C.road, M4(p.x, p.h + 0.05, p.z, 0, p.ry, 0, 16, 0.1, 6), 0);
      // strisce pedonali sulla strada principale e semaforo decorativo all'angolo
      for (let i = -3; i <= 3; i++) { const q = at(mid + i * 0.85, 0, 0.078); add(RX.GEO.box, RX.C.paint, M4(q.x, q.h, q.z, 0, q.ry, 0, 2 * P.HALF - 1.2, 0.01, 0.45)); }
      const tl = at(mid - 4, side * (WL + 0.9), 'g');
      add(RX.GEO.cyl, RX.C.lamp, M4(tl.x, tl.h + 1.6, tl.z, 0, 0, 0, 0.08, 3.2, 0.08), 0.02);
      add(RX.GEO.box, RX.C.lamp, M4(tl.x, tl.h + 3.5, tl.z, 0, tl.ry, 0, 0.42, 1.25, 0.36), 0.04);
      const f = -0.2;
      ['tl-red', 'tl-amber', 'tl-green'].forEach((c, i) => add(RX.GEO.sph, RX.C[c], M4(tl.x + Math.sin(tl.ry) * f, tl.h + 3.88 - i * 0.38, tl.z + Math.cos(tl.ry) * f, 0, 0, 0, 0.13, 0.13, 0.06)));
      // un alberello nella piazzetta
      const tw = P.world(RX.g, mid + 5, side * (WL + 4));
      L2.round.push([tw.x, tw.y, 0.6, 0.3]);
    }

    /* ---------- mare: spiaggia con ombrelloni, asciugamani, cabine e castelli di sabbia, palme, scogliere e casette
       bianche dal lato della terra, faro, porticciolo con le barche, lampioni sul lungomare ---------- */
    function decorSea(K) {
      const { a, b, r, add, at, L2, WL, clearOf, inBridge, lit } = K;
      const sea = -1, land = 1;
      for (let sv = a; sv < b; sv += 3) {
        if (inBridge(sv, 8)) continue;
        // ombrelloni e asciugamani sulla spiaggia
        if (r() < 0.32) {
          const d = WL + 3 + r() * 14, w = P.world(RX.g, sv, sea * d);
          if (clearOf(w.x, w.y, WL + 2.2) && sdist(w.x, w.y) < -WL) {
            const h = groundH(w.x, w.y) + 0.1, x = w.x, z = -w.y, uc = RX.C[pick(r, ['umb-1', 'umb-2', 'umb-3'])];
            add(RX.GEO.cyl, RX.C.paint, M4(x, h + 1.15, z, 0, 0, 0, 0.05, 2.3, 0.05));
            add(RX.GEO.cone, uc, M4(x, h + 2.35, z, 0, 0, 0, 1.45, 0.55, 1.45), 0.05);
            add(RX.GEO.sph, RX.C.paint, M4(x, h + 2.66, z, 0, 0, 0, 0.1, 0.1, 0.1));
            add(RX.GEO.box, RX.C[pick(r, ['flag-1', 'flag-2', 'flag-3', 'flag-4'])], M4(x + 1.2, h + 0.03, z + 0.4, 0, r() * 3, 0, 0.9, 0.04, 1.8));
          }
        }
        if (r() < 0.05) {
          // castello di sabbia o pallone
          const w = P.world(RX.g, sv, sea * (WL + 2 + r() * 8));
          if (clearOf(w.x, w.y, WL + 1.5)) {
            const h = groundH(w.x, w.y), x = w.x, z = -w.y;
            if (r() < 0.5) { add(RX.GEO.cyl, RX.C.sand, M4(x, h + 0.25, z, 0, 0, 0, 0.6, 0.5, 0.6), 0.03); for (let i = 0; i < 4; i++) add(RX.GEO.cone, RX.C['sand-2'], M4(x + Math.cos(i * 1.57) * 0.45, h + 0.75, z + Math.sin(i * 1.57) * 0.45, 0, 0, 0, 0.18, 0.5, 0.18), 0.02); }
            else add(RX.GEO.sph, RX.C[pick(r, ['umb-1', 'umb-2', 'umb-3'])], M4(x, h + 0.35, z, 0, 0, 0, 0.35, 0.35, 0.35), 0.03);
          }
        }
        // palme (dalle due parti, le foglie in alto)
        if (r() < 0.12) {
          const side = r() < 0.6 ? sea : land, w = P.world(RX.g, sv, side * (WL + 2.6 + r() * 9));
          if (clearOf(w.x, w.y, WL + 2.4)) palm(add, r, w.x, groundH(w.x, w.y), -w.y);
        }
        // scogliera dal lato della terra
        if (r() < 0.16) {
          const k = 2 + r() * 4, w = P.world(RX.g, sv, land * (WL + k + 4 + r() * 18));
          if (clearOf(w.x, w.y, WL + k + 2)) L2.rock.push([w.x, w.y, k, r() < 0.5 ? RX.C.cliff : RX.C['cliff-2']]);
        }
        // casette bianche sul pendio
        if (r() < 0.05) {
          const d = WL + 10 + r() * 14, w = P.world(RX.g, sv, land * d);
          if (clearOf(w.x, w.y, WL + 8)) {
            const h = groundH(w.x, w.y), x = w.x, z = -w.y, ry = YAW(w.th), hh = 3 + r() * 2;
            add(RX.GEO.box, RX.C.paint, M4(x, h + hh / 2 - 0.5, z, 0, ry, 0, 4, hh + 1, 4.5), 0.05);
            if (r() < 0.5) add(RX.GEO.sph, RX.C['boat-2'], M4(x, h + hh - 0.5, z, 0, 0, 0, 1.6, 1.4, 1.6), 0.05);
            else add(RX.GEO.box, RX.C['boat-2'], M4(x, h + hh - 0.4, z, 0, ry, 0, 4.3, 0.25, 4.8), 0.04);
            L2.win.push([x + Math.cos(ry) * -2.04, h + hh - 1.6, z + Math.sin(ry) * 2.04, ry - Math.PI / 2, 0.9, 1.1, lit ? RX.C['win-on'] : RX.C['boat-2']]);
          }
        }
      }
      // lampioni sul lungomare (lato terra)
      for (let sv = a + 12; sv < b; sv += 30) if (P.edgeAt(RX.g, sv).kind === 'wall') streetLamp(K, sv, land, RX.C.paint);
      // cabine da spiaggia a righe
      if (r() < 0.4) {
        const sv0 = a + 15 + r() * 70;
        for (let i = 0; i < 4; i++) {
          const w = P.world(RX.g, sv0 + i * 3.2, sea * (WL + 16));
          if (!clearOf(w.x, w.y, WL + 13)) continue;
          const h = groundH(w.x, w.y), x = w.x, z = -w.y, ry = YAW(w.th), cc = RX.C[pick(r, ['umb-1', 'umb-2', 'umb-3', 'flag-4'])];
          add(RX.GEO.box, cc, M4(x, h + 1.1, z, 0, ry, 0, 2.2, 2.4, 2.4), 0.05);
          add(RX.GEO.box, RX.C.paint, M4(x + Math.cos(ry) * 1.11, h + 1.1, z - Math.sin(ry) * 1.11, 0, ry, 0, 0.02, 2.4, 0.6));
          add(RX.GEO.prism, RX.C.paint, M4(x, h + 2.3 + 0.35, z, 0, ry + Math.PI / 2, 0, 2.7, 0.7, 1.55), 0.04);
        }
      }
      // faro e porticciolo: uno per tappa
      const sL = Math.round(RX.g.S0 + RX.g.L * 0.45), sH = Math.round(RX.g.S0 + RX.g.L * 0.72);
      if (sL >= a && sL < b) lighthouse(K, sL);
      if (sH >= a && sH < b) harbour(K, sH);
      // gabbiani che tifano sui paletti? no: animaletti in spiaggia
      if (r() < 0.35) critterAt(K, a + 10 + r() * 100, land, true);
    }
    function palm(add, r, x, h, z) {
      let px = x, pz = z, py = h;
      const lean = r() * 6.28, dx = Math.cos(lean) * 0.22, dz = Math.sin(lean) * 0.22;
      for (let i = 0; i < 5; i++) {
        add(RX.GEO.cyl, i % 2 ? RX.C.palm : RX.C.trunk, M4(px, py + 0.55, pz, 0, 0, 0, 0.22 - i * 0.015, 1.15, 0.22 - i * 0.015), 0.03);
        px += dx * (i + 1) * 0.3; pz += dz * (i + 1) * 0.3; py += 1.1;
      }
      for (let i = 0; i < 7; i++) {
        const an = (i / 7) * 6.28 + lean;
        add(RX.GEO.sph, RX.C['palm-leaf'], M4(px + Math.cos(an) * 1.1, py + 0.05, pz + Math.sin(an) * 1.1, 0, -an, 0.35, 1.25, 0.09, 0.32), 0.04);
      }
      for (let i = 0; i < 2; i++) add(RX.GEO.sph, RX.C['acorn-cap'], M4(px + (i - 0.5) * 0.3, py - 0.2, pz + 0.15, 0, 0, 0, 0.17, 0.17, 0.17), 0.02);
    }
    function lighthouse(K, sv) {
      const { add, WL, grp, glowAt, lit, clearOf } = K;
      for (const dd of [26, 34, 20, 42]) {
        const w = P.world(RX.g, sv, -(WL + dd));
        if (!clearOf(w.x, w.y, WL + dd - 6)) continue;
        const h = Math.max(groundH(w.x, w.y), RX.SEA_Y), x = w.x, z = -w.y;
        add(RX.GEO.rock, RX.C.cliff, M4(x, h + 0.4, z, 0, 0.4, 0, 4.2, 2.4, 4.2), 0.08);
        for (let i = 0; i < 6; i++) add(RX.GEO.cyl, i % 2 ? RX.C['light-2'] : RX.C['light-1'], M4(x, h + 2.4 + i * 2.2, z, 0, 0, 0, 1.75 - i * 0.08, 2.2, 1.75 - i * 0.08), i ? 0 : 0.05);
        const top = h + 2.4 + 6 * 2.2 - 1.1;
        add(RX.GEO.cyl, RX.C['light-1'], M4(x, top + 0.15, z, 0, 0, 0, 2.0, 0.3, 2.0), 0.05);
        add(RX.GEO.cyl, RX.C.glass, M4(x, top + 1.0, z, 0, 0, 0, 1.0, 1.4, 1.0), 0.04);
        add(RX.GEO.cone, RX.C['light-2'], M4(x, top + 2.3, z, 0, 0, 0, 1.4, 1.2, 1.4), 0.05);
        add(RX.GEO.sph, RX.C['light-1'], M4(x, top + 3.0, z, 0, 0, 0, 0.25, 0.25, 0.25), 0.03);
        K.L2.bulb.push([x, top + 1.0, z, 0.55]);
        if (lit) {
          glowAt(x, top + 1.0, z, 0);
          // fascio di luce che gira
          const beam = new T.Mesh(keep(new T.ConeGeometry(4, 70, 12, 1, true)), basic({ color: RX.C.glow, transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
          beam.geometry.translate(0, -35, 0); beam.rotation.z = Math.PI / 2;
          const bg = new T.Group(); bg.position.set(x, top + 1.0, z); bg.add(beam); grp.add(bg);
          RX.R3.anim.push({ ch: null, fn(t) { bg.rotation.y = t * 0.8; } });
        }
        return;
      }
    }
    function harbour(K, sv) {
      const { add, WL, grp, r, clearOf } = K;
      const w0 = P.world(RX.g, sv, -(WL + 3));
      if (!clearOf(P.world(RX.g, sv, -(WL + 20)).x, P.world(RX.g, sv, -(WL + 20)).y, WL + 14)) return;
      const yaw = YAW(w0.th) + Math.PI / 2;    // il molo va verso il mare (perpendicolare alla strada)
      const ox = Math.sin(yaw), oz = Math.cos(yaw);   // direzione del molo in three
      const x0 = w0.x, z0 = -w0.y, h = Math.max(RX.SEA_Y + 0.6, groundH(w0.x, w0.y) + 0.2);
      for (let i = 0; i < 8; i++) {
        const x = x0 + ox * (i * 3 + 1.5), z = z0 + oz * (i * 3 + 1.5);
        add(RX.GEO.box, i % 2 ? RX.C.wood : RX.C['wood-2'], M4(x, h, z, 0, yaw, 0, 3, 0.25, 3.02), 0.03);
        for (const e of [-1.4, 1.4]) add(RX.GEO.cyl, RX.C['wood-2'], M4(x + Math.cos(yaw) * e, h - 1, z - Math.sin(yaw) * e, 0, 0, 0, 0.15, 2.2, 0.15));
      }
      // barche che dondolano
      const bp = [];
      for (let i = 0; i < 4; i++) {
        const along = 6 + i * 5.5, e = (i % 2 ? 1 : -1) * 3.6;
        const x = x0 + ox * along + Math.cos(yaw) * e, z = z0 + oz * along - Math.sin(yaw) * e, hy = RX.SEA_Y + 0.35;
        const hc = RX.C[pick(r, ['boat', 'umb-1', 'boat-2', 'umb-3'])];
        bp.push({ geo: RX.GEO.box, c: hc, m: M4(x, hy, z, 0, yaw, 0, 1.6, 0.7, 4), ol: 0.05 });
        bp.push({ geo: RX.GEO.cone, c: hc, m: M4(x + ox * 2.4, hy, z + oz * 2.4, Math.PI / 2, yaw, 0, 0.8, 1.0, 0.36), ol: 0.04 });
        bp.push({ geo: RX.GEO.box, c: RX.C.boat, m: M4(x - ox * 0.6, hy + 0.65, z - oz * 0.6, 0, yaw, 0, 1.1, 0.6, 1.4), ol: 0.04 });
        bp.push({ geo: RX.GEO.cyl, c: RX.C['wood-2'], m: M4(x + ox * 0.6, hy + 2.3, z + oz * 0.6, 0, 0, 0, 0.06, 3.6, 0.06) });
        bp.push({ geo: RX.GEO.cone, c: RX.C.sail, m: M4(x + ox * 1.2, hy + 2.3, z + oz * 1.2, 0, yaw + Math.PI / 2, 0, 1.0, 3.0, 0.08), ol: 0.03 });
      }
      const bg = meshOf(merge(bp), RX.R3.inkMat, RX.R3.vc);
      grp.add(bg);
      RX.R3.anim.push({ ch: RX.ctxC && RX.ctxC.ch, fn(t) { bg.position.y = Math.sin(t * 1.3) * 0.12; bg.rotation.z = Math.sin(t * 0.9) * 0.004; } });
    }

    /* ---------- neve: pini col cappuccio bianco, cumuli ai bordi, chalet con le finestre accese, pupazzi di neve,
       lanterne, laghetto ghiacciato ---------- */
    function decorSnow(K) {
      const { a, b, r, add, L2, WL, clearOf, lit } = K;
      treesAlong(K, 0.75);
      pond(K, true);
      for (let i = 0; i < 2; i++) {
        if (r() > 0.35) continue;
        const side = r() < 0.5 ? -1 : 1, w = P.world(RX.g, a + r() * (b - a), side * (WL + 9 + r() * 12));
        if (!clearOf(w.x, w.y, WL + 7)) continue;
        const h = groundH(w.x, w.y), x = w.x, z = -w.y, ry = YAW(w.th), wd = 5 + r() * 2;
        add(RX.GEO.box, RX.C.chalet, M4(x, h + 1.6, z, 0, ry, 0, 4.6, 3.6, wd), 0.06);
        add(RX.GEO.prism, RX.C['chalet-roof'], M4(x, h + 3.4 + 0.75, z, 0, ry, 0, 5.4, 1.5, (wd + 0.8) / 1.73), 0.06);
        add(RX.GEO.prism, RX.C.snowbank, M4(x, h + 3.55 + 0.75, z, 0, ry, 0, 5.2, 1.4, (wd + 0.6) / 1.73));
        add(RX.GEO.box, RX.C['rock-2'], M4(x + Math.cos(ry) * 1, h + 5, z - Math.sin(ry) * 1, 0, ry, 0, 0.6, 1.6, 0.6), 0.04);
        const fs = -side * 2.32;
        for (const u of [-1.4, 1.4]) L2.win.push([x + Math.cos(ry) * fs + Math.sin(ry) * u, h + 2, z - Math.sin(ry) * fs + Math.cos(ry) * u, ry - side * Math.PI / 2, 0.9, 0.9, lit ? RX.C['win-on'] : RX.C.win]);
      }
      for (let i = 0; i < 2; i++) {
        if (r() > 0.4) continue;
        const k = 0.7 + r() * 0.3, side = r() < 0.5 ? -1 : 1, sv = a + r() * (b - a), w = P.world(RX.g, sv, side * (WL + k + 0.4 + r() * 4));
        if (P.edgeAt(RX.g, sv).kind === 'wall' && clearOf(w.x, w.y, WL + k)) snowman(add, w.x, groundH(w.x, w.y) + 0.1, -w.y, k, YAW(w.th) - side * Math.PI / 2);
      }
      if (lit) for (let sv = a + 15; sv < b; sv += 30) lantern(K, sv, Math.floor(sv / 30) % 2 ? 1 : -1);
      if (r() < 0.3) critterAt(K, a + 10 + r() * 100, r() < 0.5 ? -1 : 1, true);
    }

    return { decorForest, decorCity, decorSea, decorSnow };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
