/* Hari Rally — kart a forma di frutto, cofano della visuale pilota, particelle, oggetti dei power-up, gabbiani.
 * Parte di rally-ui.js (stesso create()): si carica prima e rally-ui.js la monta con HH.rallyKarts(RX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // RX = contesto condiviso con rally-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.rallyKarts = function (RX) {
    const { FRUITW, reduce, T, P, whoOf, isHum, keep, toon, basic, M4, merge, meshOf, roadH, kart3 } = RX;
    /* ---------- kart a forma di frutto (ingombro = rettangolo di collisione P.CAR_L × P.CAR_W) ---------- */
    // assi locali: z avanti, x di lato, y in su. Ruote, paraurti, scocca e contorni stanno tutti in |x| ≤ P.CAR_W / 2 e
    // |z| ≤ P.CAR_L / 2 (i contorni compresi). Tre pezzi animati: scocca (rimbalza sulle sospensioni), foglia-spoiler
    // (sventola), pilota (si inclina in curva, festeggia). Lontano: una forma sola senza contorno (LOD).
    const MQ = (x, y, z, dx, dy, dz, sx, sy, sz) => { const d = new T.Vector3(dx, dy, dz).normalize(); return new T.Matrix4().compose(new T.Vector3(x + d.x * sy, y + d.y * sy, z + d.z * sy), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d), new T.Vector3(sx, sy, sz)); };
    const DRV = [0, 0.86, -0.22];      // perno del pilota (sedile)
    const LEAF = [0, 1.0, -0.98];      // perno della foglia-spoiler (dietro, in alto)
    function kartParts(id, who) {
      const body = [], leaf = [], drv = [], lod = [];
      const add = (L) => (geo, c, m, ol = 0) => L.push({ geo, c, m, ol });
      const B = add(body), F = add(leaf), D = add(drv), Lo = add(lod);
      const hw = P.CAR_W / 2, hl = P.CAR_L / 2;
      // telaio comune: pianale, paraurti, ruote tonde coi mozzi, faretti, fanalini, volantino
      B(RX.GEO.box, RX.C.chassis, M4(0, 0.3, 0, 0, 0, 0, hw * 1.5, 0.16, hl * 1.7), 0.03);
      for (const z of [hl - 0.12, -(hl - 0.12)]) B(RX.GEO.box, RX.C.trim, M4(0, 0.36, z, 0, 0, 0, hw * 1.45, 0.2, 0.14), 0.03);
      for (const x of [-(hw - 0.18), hw - 0.18]) for (const z of [-(hl - 0.6), hl - 0.6]) {
        B(RX.GEO.cyl, RX.C.tire, M4(x, 0.32, z, 0, 0, Math.PI / 2, 0.32, 0.26, 0.32), 0.03);
        B(RX.GEO.sph0, RX.C['car-2'], M4(x + Math.sign(x) * 0.11, 0.32, z, 0, 0, 0, 0.04, 0.12, 0.12));
      }
      for (const x of [-0.42, 0.42]) { B(RX.GEO.sph, RX.C.head, M4(x, 0.52, hl - 0.2, 0, 0, 0, 0.13, 0.11, 0.07), 0.02); B(RX.GEO.box, RX.C.tail, M4(x, 0.5, -(hl - 0.2), 0, 0, 0, 0.2, 0.09, 0.04)); }
      B(RX.GEO.cyl, RX.C.wheel, M4(0, 1.02, 0.3, -0.9, 0, 0, 0.2, 0.04, 0.2), 0.02);
      Lo(RX.GEO.box, RX.C.tire, M4(0, 0.3, 0, 0, 0, 0, P.CAR_W - 0.1, 0.5, P.CAR_L - 0.9));
      // seme / poro sulla buccia di un ellissoide (centro c, semiassi a), a quota (u, w) = frazioni di x e z
      const onShell = (cx, cy, cz, ax, ay, az, u, w, col, k) => { const q = 1 - u * u - w * w; if (q < 0.05) return; const y = cy + ay * Math.sqrt(q); B(RX.GEO.sph0, col, M4(cx + ax * u * 1.01, y + 0.01, cz + az * w, 0, 0, 0, k[0], k[1], k[2])); };
      const f = FRUITW[who];
      if (f === 'straw') {
        // fragola: ellissoide largo dietro e punta davanti, semini gialli, corona di foglie come spoiler
        B(RX.GEO.sph2, RX.C.straw, M4(0, 0.72, -0.05, 0, 0, 0, 0.74, 0.44, 1.16), 0.05);
        B(RX.GEO.cone, RX.C.straw, M4(0, 0.66, 1.18, Math.PI / 2, 0, 0, 0.5, 0.42, 0.42), 0.04);
        for (const u of [-0.62, -0.25, 0.25, 0.62]) for (const w of [-0.55, 0.15, 0.62]) onShell(0, 0.72, -0.05, 0.74, 0.44, 1.16, u, w, RX.C.seed, [0.05, 0.03, 0.075]);
        for (const u of [-0.86, 0.86]) for (const w of [-0.3, 0.3]) onShell(0, 0.72, -0.05, 0.74, 0.44, 1.16, u, w, RX.C.seed, [0.03, 0.06, 0.07]);
        // semini anche dietro (si vedono dalla camera)
        for (const [x, y] of [[-0.45, 0.62], [0, 0.55], [0.45, 0.62], [-0.25, 0.85], [0.25, 0.85], [-0.6, 0.8], [0.6, 0.8]]) B(RX.GEO.sph0, RX.C.seed, M4(x, y, -0.05 - 1.16 * Math.sqrt(Math.max(0.05, 1 - (x / 0.74) ** 2 - ((y - 0.72) / 0.44) ** 2)) - 0.01, 0, 0, 0, 0.06, 0.075, 0.03));
        for (let i = 0; i < 5; i++) { const a = -1.15 + i * 0.575; F(RX.GEO.sph, RX.C.kleaf, MQ(0, 0, 0, Math.sin(a), 0.42, -Math.cos(a) * 0.9, 0.12, 0.25, 0.04), 0.03); }
        F(RX.GEO.cyl, RX.C['kleaf-2'], M4(0, 0.14, 0, 0, 0, 0, 0.045, 0.28, 0.045), 0.02);
        Lo(RX.GEO.sph0, RX.C.straw, M4(0, 0.74, 0.05, 0, 0, 0, 0.78, 0.46, 1.4));
      } else if (f === 'peach') {
        // pesca: tonda con la piega e la guancia rosata, una foglia grande e il picciolo
        B(RX.GEO.sph2, RX.C.peach, M4(0, 0.74, 0, 0, 0, 0, 0.76, 0.48, 1.25), 0.05);
        B(RX.GEO.sph2, RX.C['peach-2'], M4(0.24, 0.8, 0.22, 0, 0, 0, 0.54, 0.42, 0.9));
        B(RX.GEO.sph2, RX.C['peach-2'], M4(0, 0.74, 0, 0, 0, 0, 0.035, 0.505, 1.27));
        F(RX.GEO.sph, RX.C.kleaf, MQ(0.05, 0.1, 0, 0.45, 0.75, -0.5, 0.15, 0.32, 0.045), 0.03);
        F(RX.GEO.cyl, RX.C.trunk, M4(0, 0.08, 0, 0, 0, 0, 0.04, 0.2, 0.04), 0.02);
        Lo(RX.GEO.sph0, RX.C.peach, M4(0, 0.74, 0, 0, 0, 0, 0.8, 0.5, 1.3));
      } else if (f === 'mand') {
        // mandarino: schiacciato, coi pori della buccia; due foglioline e il picciolo
        B(RX.GEO.sph2, RX.C.mand, M4(0, 0.7, 0.04, 0, 0, 0, 0.78, 0.42, 1.25), 0.05);
        for (const u of [-0.7, -0.35, 0, 0.35, 0.7]) for (const w of [-0.55, 0.05, 0.6]) onShell(0, 0.7, 0.04, 0.78, 0.42, 1.25, u, w + (u * 7 % 2) * 0.05, RX.C['mand-2'], [0.035, 0.02, 0.035]);
        B(RX.GEO.sph0, RX.C['kleaf-2'], M4(0, 0.7, 1.28, 0, 0, 0, 0.07, 0.07, 0.04));
        for (const sx of [-1, 1]) F(RX.GEO.sph, RX.C.kleaf, MQ(0, 0.12, 0, sx * 0.55, 0.65, -0.5, 0.11, 0.26, 0.04), 0.03);
        F(RX.GEO.cyl, RX.C['kleaf-2'], M4(0, 0.08, 0, 0, 0, 0, 0.045, 0.2, 0.045), 0.02);
        Lo(RX.GEO.sph0, RX.C.mand, M4(0, 0.7, 0.04, 0, 0, 0, 0.82, 0.44, 1.3));
      } else if (f === 'apple') {
        // mela: tonda e un po' schiacciata, il lato lucido e la guancia rossa, picciolo e una foglia come spoiler
        B(RX.GEO.sph2, RX.C.apple, M4(0, 0.74, 0, 0, 0, 0, 0.8, 0.5, 1.22), 0.05);
        B(RX.GEO.sph2, RX.C['apple-2'], M4(-0.34, 0.86, 0.3, 0, 0, 0, 0.36, 0.3, 0.6));
        B(RX.GEO.sph2, RX.C['apple-3'], M4(0.38, 0.72, -0.25, 0, 0, 0, 0.36, 0.3, 0.62));
        B(RX.GEO.sph0, RX.C['kleaf-2'], M4(0, 0.74, 1.23, 0, 0, 0, 0.07, 0.07, 0.04));
        F(RX.GEO.cyl, RX.C.trunk, M4(0, 0.12, 0, 0, 0, 0.25, 0.045, 0.26, 0.045), 0.02);
        F(RX.GEO.sph, RX.C.kleaf, MQ(0.05, 0.2, 0, 0.6, 0.6, -0.5, 0.13, 0.28, 0.045), 0.03);
        Lo(RX.GEO.sph0, RX.C.apple, M4(0, 0.74, 0, 0, 0, 0, 0.84, 0.52, 1.27));
      } else {
        // fetta d'anguria: buccia verde a strisce, polpa rossa coi semini neri sui due lati, ricciolo come spoiler
        B(RX.GEO.half, RX.C['melon-rind'], M4(0, 0.36, 0, 0, 0, 0, 1.5, 0.9, 1.36), 0.05);
        for (const x of [-0.42, 0, 0.42]) B(RX.GEO.half, RX.C['melon-rind-2'], M4(x, 0.36, 0, 0, 0, 0, 0.09, 0.915, 1.375));
        for (const sx of [-1, 1]) {
          B(RX.GEO.half, RX.C['melon-w'], M4(sx * 0.756, 0.36, 0, 0, 0, 0, 0.012, 0.86, 1.3));
          B(RX.GEO.half, RX.C.melon, M4(sx * 0.764, 0.36, 0, 0, 0, 0, 0.012, 0.78, 1.21));
          for (const [r, a] of [[0.45, 0.5], [0.45, 1.3], [0.45, 2.2], [0.62, 0.9], [0.62, 1.7], [0.62, 2.6], [0.3, 1.6]]) B(RX.GEO.sph0, RX.C.mseed, M4(sx * 0.775, 0.36 + Math.sin(a) * r * 0.86, Math.cos(a) * r * 1.2, 0, 0, 0, 0.01, 0.06, 0.035));
        }
        for (let i = 0; i < 3; i++) F(RX.GEO.cyl, RX.C['melon-rind-2'], M4(Math.sin(i * 2.1) * 0.06, 0.07 + i * 0.12, Math.cos(i * 2.1) * 0.06, 0, 0, (i % 2 ? 0.5 : -0.5), 0.03, 0.14, 0.03), 0.015);
        F(RX.GEO.sph, RX.C.kleaf, MQ(0, 0.3, 0, -0.35, 0.8, -0.4, 0.12, 0.22, 0.04), 0.03);
        Lo(RX.GEO.half, RX.C['melon-rind'], M4(0, 0.36, 0, 0, 0, 0, 1.5, 0.9, 1.36));
      }
      // pilota (coordinate rispetto al perno DRV): testa all'altezza giusta per spuntare dalla scocca
      const hy = 0.6, ink = RX.C.eye, eyes = (y, z, sp) => { for (const sx of [-1, 1]) { D(RX.GEO.sph0, ink, M4(sx * sp, y, z, 0, 0, 0, 0.05, 0.065, 0.03)); D(RX.GEO.sph0, RX.C.hi, M4(sx * sp + 0.015, y + 0.025, z + 0.02, 0, 0, 0, 0.018, 0.018, 0.01)); } };
      for (const sx of [-1, 1]) D(RX.GEO.sph, RX.C.paw, M4(sx * 0.2, 0.2, 0.48, 0, 0, 0, 0.09, 0.08, 0.09), 0.02);
      if (who === 'hari') {
        D(RX.GEO.sph0, RX.C.quill, M4(0, 0.2, -0.05, 0, 0, 0, 0.27, 0.25, 0.24), 0.03);
        D(RX.GEO.sph, RX.C.face, M4(0, hy, 0.02, 0, 0, 0, 0.32, 0.29, 0.29), 0.04);
        // nuca a riccio: mezza testa marrone dietro (da dietro si vede questa, con gli aculei)
        D(RX.GEO.sph, RX.C.quill, M4(0, hy + 0.03, -0.07, 0, 0, 0, 0.34, 0.32, 0.29), 0.04);
        // aculei: coni che sporgono dietro e in alto (da dietro si vede la testa a riccio)
        for (const [ax, ay, az] of [[0, 1, -0.2], [-0.45, 0.9, -0.3], [0.45, 0.9, -0.3], [-0.85, 0.45, -0.35], [0.85, 0.45, -0.35], [-0.95, -0.05, -0.4], [0.95, -0.05, -0.4],
          [0, 0.6, -0.8], [-0.45, 0.45, -0.8], [0.45, 0.45, -0.8], [-0.6, 0, -0.85], [0.6, 0, -0.85], [0, 0, -1], [-0.3, -0.4, -0.9], [0.3, -0.4, -0.9]]) {
          const l = Math.hypot(ax, ay, az), ux = ax / l, uy = ay / l, uz = az / l;
          D(RX.GEO.cone, (Math.abs(ax) + ay) % 0.9 < 0.3 ? RX.C.quill : RX.C['quill-2'], MQ(ux * 0.24, hy + 0.03 + uy * 0.22, -0.07 + uz * 0.2, ux, uy, uz, 0.12, 0.14, 0.12), 0.025);
        }
        for (const sx of [-1, 1]) D(RX.GEO.sph, RX.C.ear, M4(sx * 0.26, hy + 0.2, -0.02, 0, 0, 0, 0.08, 0.08, 0.05), 0.02);
        eyes(hy + 0.03, 0.27, 0.11);
        D(RX.GEO.sph0, RX.C.nose, M4(0, hy - 0.05, 0.3, 0, 0, 0, 0.045, 0.035, 0.03));
        for (const sx of [-1, 1]) D(RX.GEO.sph0, RX.C['bunny-in'], M4(sx * 0.19, hy - 0.07, 0.25, 0, 0, 0, 0.06, 0.03, 0.02));
      } else if (who === 'bunny') {
        D(RX.GEO.sph0, RX.C.bunny, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(RX.GEO.sph, RX.C.bunny, M4(0, hy, 0, 0, 0, 0, 0.31, 0.29, 0.29), 0.04);
        for (const sx of [-1, 1]) { D(RX.GEO.sph, RX.C.bunny, M4(sx * 0.12, hy + 0.45, -0.06, 0, 0, sx * -0.15, 0.08, 0.3, 0.06), 0.03); D(RX.GEO.sph, RX.C['bunny-in'], M4(sx * 0.125, hy + 0.45, -0.01, 0, 0, sx * -0.15, 0.04, 0.22, 0.02)); }
        eyes(hy + 0.02, 0.26, 0.11);
        D(RX.GEO.sph0, RX.C['bunny-in'], M4(0, hy - 0.06, 0.29, 0, 0, 0, 0.04, 0.03, 0.02));
      } else if (who === 'fox') {
        D(RX.GEO.sph0, RX.C.fox, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(RX.GEO.sph, RX.C.fox, M4(0, hy, 0, 0, 0, 0, 0.32, 0.29, 0.3), 0.04);
        D(RX.GEO.sph, RX.C['fox-2'], M4(0, hy - 0.08, 0.17, 0, 0, 0, 0.2, 0.13, 0.15));
        for (const sx of [-1, 1]) { D(RX.GEO.cone, RX.C.fox, M4(sx * 0.19, hy + 0.3, -0.02, 0, 0, sx * -0.35, 0.1, 0.22, 0.06), 0.025); D(RX.GEO.cone, RX.C.ink, M4(sx * 0.24, hy + 0.38, -0.02, 0, 0, sx * -0.35, 0.04, 0.08, 0.03)); }
        eyes(hy + 0.04, 0.27, 0.12);
        D(RX.GEO.sph0, RX.C.nose, M4(0, hy - 0.04, 0.33, 0, 0, 0, 0.045, 0.035, 0.03));
      } else if (who === 'kitty') {
        D(RX.GEO.sph0, RX.C.kitty, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(RX.GEO.sph, RX.C.kitty, M4(0, hy, 0, 0, 0, 0, 0.32, 0.29, 0.3), 0.04);
        D(RX.GEO.sph, RX.C['kitty-2'], M4(0, hy - 0.09, 0.19, 0, 0, 0, 0.16, 0.11, 0.12));
        for (const sx of [-1, 1]) { D(RX.GEO.cone, RX.C.kitty, M4(sx * 0.18, hy + 0.3, -0.02, 0, 0, sx * -0.3, 0.11, 0.2, 0.07), 0.025); D(RX.GEO.cone, RX.C['kitty-in'], M4(sx * 0.18, hy + 0.29, 0.03, 0, 0, sx * -0.3, 0.06, 0.12, 0.03)); }
        for (const x of [-0.07, 0, 0.07]) D(RX.GEO.box, RX.C['kitty-3'], M4(x, hy + 0.27, 0.12, 0.5, 0, 0, 0.025, 0.09, 0.02));
        eyes(hy + 0.04, 0.27, 0.11);
        D(RX.GEO.sph0, RX.C['kitty-in'], M4(0, hy - 0.05, 0.31, 0, 0, 0, 0.045, 0.035, 0.03));
        // coda che spunta dietro il sedile
        D(RX.GEO.sph, RX.C.kitty, MQ(0, 0.15, -0.3, 0.2, 0.9, -0.35, 0.07, 0.32, 0.07), 0.02);
      } else {
        D(RX.GEO.sph0, RX.C.panda, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(RX.GEO.sph, RX.C.panda, M4(0, hy, 0, 0, 0, 0, 0.32, 0.3, 0.3), 0.04);
        for (const sx of [-1, 1]) { D(RX.GEO.sph, RX.C['panda-2'], M4(sx * 0.24, hy + 0.24, -0.02, 0, 0, 0, 0.1, 0.1, 0.07), 0.02); D(RX.GEO.sph0, RX.C['panda-2'], M4(sx * 0.12, hy + 0.02, 0.25, 0, 0, sx * 0.4, 0.08, 0.1, 0.03)); D(RX.GEO.sph0, RX.C.hi, M4(sx * 0.12, hy + 0.04, 0.275, 0, 0, 0, 0.03, 0.03, 0.01)); }
        D(RX.GEO.sph0, RX.C.nose, M4(0, hy - 0.06, 0.3, 0, 0, 0, 0.045, 0.035, 0.03));
      }
      Lo(RX.GEO.sph0, RX.C[who === 'hari' ? 'quill-2' : who], M4(0, DRV[1] + hy, DRV[2], 0, 0, 0, 0.32, 0.3, 0.3));
      return { body, leaf, drv, lod };
    }
    function buildKarts() {
      RX.R3.karts = [];
      // molla (salto) e bolla (scudo) per ogni kart
      const coil = [];
      for (let i = 0; i < 6; i++) coil.push({ geo: RX.GEO.cyl, c: RX.C.spring, m: M4(0, -0.1 - i * 0.18, 0, 0, 0, (i % 2 ? 0.25 : -0.25), 0.5, 0.11, 0.5), ol: 0.03 });
      coil.push({ geo: RX.GEO.box, c: RX.C.straw, m: M4(0, -1.2, 0, 0, 0, 0, 1.2, 0.14, 1.2), ol: 0.03 });
      const coilM = merge(coil);
      RX.R3.bubbleMat = basic({ color: RX.C.bubble, transparent: true, opacity: 0.32, depthWrite: false });
      // ombre: un disco schiacciato sotto ogni kart (4 istanze, 1 draw call)
      const shM = basic({ color: RX.C.shadow, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      RX.R3.shadow = new T.InstancedMesh(RX.GEO.disc, shM, 4); RX.R3.shadow.frustumCulled = false;
      RX.R3.scene.add(RX.R3.shadow);
      for (let id = 0; id < 4; id++) {
        const K = kartParts(id, whoOf(id)), grp = new T.Group(), sus = new T.Group();
        const leafG = new T.Group(), drvG = new T.Group();
        leafG.position.set(...LEAF); drvG.position.set(...DRV);
        // la foglia senza contorno (un draw call in meno per kart); i piloti degli avversari fusi con la scocca
        // (rimbalzano con lei), quello di Hari a parte (si inclina in curva e festeggia)
        leafG.add(new T.Mesh(merge(K.leaf.map((q) => Object.assign({}, q, { ol: 0 }))).body, RX.R3.vc));
        const toSeat = new T.Matrix4().makeTranslation(...DRV);
        if (!isHum(id)) K.body.push(...K.drv.map((q) => Object.assign({}, q, { m: toSeat.clone().multiply(q.m) })));
        else drvG.add(meshOf(merge(K.drv), RX.R3.inkMat, RX.R3.vc));
        sus.add(meshOf(merge(K.body), RX.R3.inkMat, RX.R3.vc), leafG, drvG);
        const lod = new T.Mesh(merge(K.lod).body, RX.R3.vc); lod.visible = false;
        const sp = meshOf(coilM, RX.R3.inkMat, RX.R3.vc); sp.visible = false;
        const bb = new T.Mesh(RX.GEO.ball, RX.R3.bubbleMat); bb.scale.set(1.3, 1.3, 2.1); bb.position.y = 1.0; bb.visible = false;
        grp.add(sus, lod, sp, bb);
        grp.userData = { sus, leafG, drvG, lod, spring: sp, bubble: bb, ph: id * 1.7 };
        RX.R3.scene.add(grp);
        RX.R3.karts[id] = grp;
      }
    }
    function buildHood() {
      const ps = [], add = (geo, c, m, ol = 0) => ps.push({ geo, c, m, ol });
      // visuale pilota: il muso della fragola (il bordo davanti a 2,9 m dall'occhio = muso del kart, sopra a quota −0,5;
      // measure() lo alza/abbassa secondo il campo visivo), coi semini e i faretti
      const HC = [0, -0.68, -1.6], HA = [P.CAR_W / 2 + 0.08, 0.3, 1.3];
      add(RX.GEO.sph2, RX.C.straw, M4(HC[0], HC[1], HC[2], 0, 0, 0, HA[0], HA[1], HA[2]), 0.05);
      for (const [x, z] of [[-0.45, -2.15], [0.45, -2.15], [0, -2.35], [-0.25, -2.55], [0.25, -2.55], [-0.7, -2.3], [0.7, -2.3], [0, -2.72], [-0.5, -2.7], [0.5, -2.7]]) {
        const q = 1 - (x / HA[0]) ** 2 - ((z - HC[2]) / HA[2]) ** 2;
        if (q > 0.02) add(RX.GEO.sph0, RX.C.seed, M4(x, HC[1] + HA[1] * Math.sqrt(q) + 0.01, z, 0, 0, 0, 0.06, 0.03, 0.09));
      }
      for (const x of [-0.55, 0.55]) add(RX.GEO.sph, RX.C.head, M4(x, -0.62, -2.72, 0, 0, 0, 0.14, 0.1, 0.08), 0.03);
      const mm = merge(ps);
      const grp = meshOf(mm, RX.R3.inkMat, toon({ vertexColors: true, fog: false }));
      RX.R3.camera.add(grp);
      RX.R3.hood = grp;
    }

    /* particelle: polvere dietro le auto, foglie e stelline dagli urti, petali, bolle, scintille del turbo */
    function buildFx() {
      const n = 220, pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
      const geo = keep(new T.BufferGeometry());
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('color', new T.BufferAttribute(col, 4));
      const cvs = document.createElement('canvas'); cvs.width = cvs.height = 32;
      const c2 = cvs.getContext('2d'), gr = c2.createRadialGradient(16, 16, 2, 16, 16, 15);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.beginPath(); c2.arc(16, 16, 15, 0, 7); c2.fill();
      const tex = keep(new T.CanvasTexture(cvs));
      const mat = keep(new T.PointsMaterial({ size: 0.75, map: tex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
      const pts = new T.Points(geo, mat);
      pts.frustumCulled = false;
      RX.R3.scene.add(pts);
      RX.R3.fx = { pts, n, list: Array.from({ length: n }, () => ({ life: 0 })), next: 0 };
      // fanalini posteriori e fari degli avversari che brillano al buio
      if ((RX.N.night || 0) > 0) {
        const mk = (c, sz) => { const tg = keep(new T.BufferGeometry()); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(24), 3)); const tl = new T.Points(tg, keep(new T.PointsMaterial({ size: sz, map: tex, color: c, transparent: true, depthWrite: false, blending: T.AdditiveBlending }))); tl.frustumCulled = false; RX.R3.scene.add(tl); return tl; };
        RX.R3.tails = mk(RX.C.tail, 0.42); RX.R3.heads = mk(RX.C.head, 0.7);
      } else { RX.R3.tails = null; RX.R3.heads = null; }
    }
    function emit(x, y, z, vx, vy, vz, c, life, a = 0.8) {
      const F = RX.R3.fx, p = F.list[F.next];
      F.next = (F.next + 1) % F.n;
      Object.assign(p, { x, y, z, vx, vy, vz, c, life, t: 0, a });
    }
    const BURST = { leaf: ['leafp', 'leaf-1', 'leaf-2'], spark: ['spark', 'cap-dot'], petal: ['petal', 'petal-2', 'flower-2'], honey: ['honey', 'honey-2'],
      bubble: ['bubble', 'ribbon'], carrot: ['carrot', 'spark', 'carrot-leaf'], gift: ['gift-1', 'gift-2', 'gift-3', 'gift-4'], acorn: ['acorn', 'spark'] };
    function burst(kind, at3, n0) {
      if (reduce() || !RX.R3 || !RX.R3.fx) return;
      if (!at3 && RX.s && RX.chase()) at3 = kart3(0);
      const cam = RX.R3.camera, f = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), rgt = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      const n = n0 || (kind === 'leaf' ? 14 : 10), col = (BURST[kind] || BURST.spark).map((k) => RX.C[k]);
      for (let i = 0; i < n; i++) {
        const side = (Math.random() - 0.5) * 2;
        const p = at3 ? at3.clone().add(new T.Vector3((Math.random() - 0.5) * 1.5, Math.random(), (Math.random() - 0.5) * 1.5)) : cam.position.clone().addScaledVector(f, 3 + Math.random() * 2).addScaledVector(rgt, side * 1.6);
        emit(p.x, p.y - 0.2, p.z, rgt.x * side * 3 + (Math.random() - 0.5), 2 + Math.random() * 2.5, rgt.z * side * 3 + (Math.random() - 0.5), col[i % col.length], 0.9, 1);
      }
    }
    function updateFx(dt) {
      const F = RX.R3.fx, pa = F.pts.geometry.attributes.position, ca = F.pts.geometry.attributes.color;
      for (let i = 0; i < F.n; i++) {
        const p = F.list[i];
        if (p.life > 0 && p.t < p.life) {
          p.t += dt; p.vy -= 3.2 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          const k = 1 - p.t / p.life;
          pa.setXYZ(i, p.x, p.y, p.z); ca.setXYZW(i, p.c.r, p.c.g, p.c.b, p.a * k);
        } else { p.life = 0; pa.setXYZ(i, 0, -999, 0); ca.setXYZW(i, 0, 0, 0, 0); }
      }
      pa.needsUpdate = true; ca.needsUpdate = true;
    }

    /* ---------- oggetti dei power-up: scatole-sorpresa, ghiande, bucce, pozze di miele, nuvolette di fiori ---------- */
    function buildItems() {
      const W1 = new T.Color(1, 1, 1);
      // scatola-regalo: cubo di lato 1 (semidiagonale ≈ P.PU.boxR), nastro e fiocco
      const gb = P.PU.boxR * Math.SQRT2;
      const gift = merge([{ geo: RX.GEO.box, c: W1, m: M4(0, 0, 0, 0, 0, 0, gb, gb, gb), ol: 0.05 }]);
      const ribbon = merge([
        { geo: RX.GEO.box, c: RX.C.ribbon, m: M4(0, 0, 0, 0, 0, 0, gb + 0.02, gb + 0.02, 0.22) },
        { geo: RX.GEO.box, c: RX.C.ribbon, m: M4(0, 0, 0, 0, 0, 0, 0.22, gb + 0.02, gb + 0.02) },
        { geo: RX.GEO.sph, c: RX.C.ribbon, m: M4(-0.18, gb / 2 + 0.12, 0, 0, 0, 0.6, 0.2, 0.12, 0.12), ol: 0.03 },
        { geo: RX.GEO.sph, c: RX.C.ribbon, m: M4(0.18, gb / 2 + 0.12, 0, 0, 0, -0.6, 0.2, 0.12, 0.12), ol: 0.03 },
      ]);
      const nb = RX.g.boxes.length * 4;
      const boxes = new T.InstancedMesh(gift.body, RX.R3.vc, Math.max(1, nb)), bol = new T.InstancedMesh(gift.line, RX.R3.inkMat, Math.max(1, nb));
      const rib = new T.InstancedMesh(ribbon.body, RX.R3.vc, Math.max(1, nb));
      bol.instanceMatrix = boxes.instanceMatrix; rib.instanceMatrix = boxes.instanceMatrix;
      const GC = [RX.C['gift-1'], RX.C['gift-2'], RX.C['gift-3'], RX.C['gift-4']];
      for (let i = 0; i < nb; i++) boxes.setColorAt(i, GC[i % 4]);
      boxes.frustumCulled = bol.frustumCulled = rib.frustumCulled = false;
      RX.R3.scene.add(boxes, rib, bol);
      // ghianda (raggio di raccolta P.PU.acornR)
      const ar = P.PU.acornR;
      const acorn = merge([
        { geo: RX.GEO.sph, c: RX.C.acorn, m: M4(0, -0.05, 0, 0, 0, 0, ar * 0.7, ar * 0.85, ar * 0.7), ol: 0.03 },
        { geo: RX.GEO.sph, c: RX.C['acorn-cap'], m: M4(0, ar * 0.38, 0, 0, 0, 0, ar * 0.78, ar * 0.42, ar * 0.78), ol: 0.03 },
        { geo: RX.GEO.cyl, c: RX.C['acorn-cap'], m: M4(0, ar * 0.85, 0, 0, 0, 0.3, 0.04, 0.16, 0.04) },
      ]);
      const na = RX.g.acorns.length;
      const acorns = new T.InstancedMesh(acorn.body, RX.R3.vc, Math.max(1, na)), aol = new T.InstancedMesh(acorn.line, RX.R3.inkMat, Math.max(1, na));
      aol.instanceMatrix = acorns.instanceMatrix;
      const m4 = new T.Matrix4();
      RX.g.acorns.forEach((ac, i) => { const w = P.world(RX.g, ac.s, ac.d); m4.makeTranslation(w.x, roadH(ac.s, ac.d, w.x, w.y) + 0.65, -w.y); acorns.setMatrixAt(i, m4); });
      acorns.instanceMatrix.needsUpdate = true;
      acorns.computeBoundingSphere(); aol.boundingSphere = acorns.boundingSphere;
      RX.R3.scene.add(acorns, aol);
      // buccia di banana (raggio P.PU.bananaR) e pozza di miele (raggio P.PU.honeyR), nuvoletta di fiori
      const br = P.PU.bananaR;
      const peel = [];
      // buccia aperta a stella: le punte arrivano al raggio di collisione
      for (let i = 0; i < 4; i++) { const an = i * 1.57 + 0.4; peel.push({ geo: RX.GEO.sph, c: RX.C.banana, m: M4(Math.cos(an) * br * 0.5, 0.1, Math.sin(an) * br * 0.5, 0, -an, 0.25, br * 0.55, 0.13, br * 0.3), ol: 0.03 }); }
      peel.push({ geo: RX.GEO.sph, c: RX.C.banana, m: M4(0, 0.25, 0, 0, 0, 0, br * 0.42, br * 0.5, br * 0.42), ol: 0.04 });
      peel.push({ geo: RX.GEO.cyl, c: RX.C['banana-2'], m: M4(0, 0.58, 0, 0, 0, 0.2, 0.07, 0.22, 0.07), ol: 0.02 });
      const peelM = merge(peel);
      const hr = P.PU.honeyR;
      const honeyM = merge([
        { geo: RX.GEO.cyl, c: RX.C.honey, m: M4(0, 0.04, 0, 0, 0, 0, hr, 0.06, hr), ol: 0.03 },
        { geo: RX.GEO.cyl, c: RX.C['honey-2'], m: M4(-hr * 0.3, 0.075, -hr * 0.2, 0, 0, 0, hr * 0.35, 0.02, hr * 0.22) },
        { geo: RX.GEO.sph, c: RX.C.honey, m: M4(hr * 0.4, 0.12, hr * 0.3, 0, 0, 0, 0.24, 0.12, 0.24), ol: 0.02 },
        { geo: RX.GEO.sph, c: RX.C.honey, m: M4(-hr * 0.5, 0.1, hr * 0.45, 0, 0, 0, 0.18, 0.09, 0.18), ol: 0.02 },
      ]);
      const cloudP = [];
      for (let i = 0; i < 7; i++) { const an = i * 0.9; cloudP.push({ geo: RX.GEO.sph, c: i % 2 ? RX.C.petal : RX.C['petal-2'], m: M4(Math.cos(an) * 1.0, Math.sin(i * 2.1) * 0.35, Math.sin(an) * 0.7, 0, 0, 0, 0.85, 0.7, 0.75), ol: 0.05 }); }
      for (let i = 0; i < 6; i++) { const an = i * 1.05 + 0.3; cloudP.push({ geo: RX.GEO.sph, c: RX.C['flower-1'], m: M4(Math.cos(an) * 1.0, 0.68, Math.sin(an) * 0.75, 0, 0, 0, 0.26, 0.16, 0.26), ol: 0.02 }); cloudP.push({ geo: RX.GEO.sph, c: RX.C['gift-3'], m: M4(Math.cos(an) * 1.0, 0.8, Math.sin(an) * 0.75, 0, 0, 0, 0.1, 0.08, 0.1) }); }
      const cloudM = merge(cloudP);
      const mk = (mm, n) => { const im = new T.InstancedMesh(mm.body, RX.R3.vc, n), ol = new T.InstancedMesh(mm.line, RX.R3.inkMat, n); ol.instanceMatrix = im.instanceMatrix; im.frustumCulled = ol.frustumCulled = false; im.count = ol.count = 0; RX.R3.scene.add(im, ol); return { im, ol }; };
      RX.R3.items = { boxes, bol, acorns, aol, ag: '', peel: mk(peelM, P.PU.maxHaz), honey: mk(honeyM, P.PU.maxHaz), cloud: mk(cloudM, 8) };
    }
    function updateItems(now, p) {
      const I = RX.R3.items, m4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S1 = new T.Vector3(1, 1, 1), Z = new T.Vector3(0, 0, 0), UP = new T.Vector3(0, 1, 0);
      // scatole: girano e galleggiano; quelle prese spariscono finché non ricompaiono
      let k = 0;
      RX.g.boxes.forEach((row, ri) => {
        const near = Math.abs(row.s - p.s) < RX.R3.fogFar + 20;
        row.row.forEach((d, j) => {
          const id = ri * 4 + j, taken = RX.s.bx.some((b2) => b2[0] === id && b2[1] > RX.s.t);
          if (!near || taken) m4.compose(V.set(0, -999, 0), Q.identity(), Z);
          else { const w = P.world(RX.g, row.s, d); m4.compose(V.set(w.x, roadH(row.s, d, w.x, w.y) + 0.95 + Math.sin(now * 2.4 + id) * 0.12, -w.y), Q.setFromAxisAngle(UP, now * 1.6 + id), S1); }
          I.boxes.setMatrixAt(k++, m4);
        });
      });
      I.boxes.instanceMatrix.needsUpdate = true;
      // ghiande: si aggiornano solo quando qualcuno ne prende una
      if (I.ag !== RX.s.ag) {
        I.ag = RX.s.ag;
        RX.g.acorns.forEach((ac, i) => { if (P.acornTaken(RX.s, i)) { m4.compose(V.set(0, -999, 0), Q.identity(), Z); I.acorns.setMatrixAt(i, m4); } });
        I.acorns.instanceMatrix.needsUpdate = true;
      }
      // bucce e miele
      let nb = 0, nh = 0;
      for (const h of RX.s.hz) {
        const w = P.world(RX.g, h.s, h.d), y = roadH(h.s, h.d, w.x, w.y) + 0.08;
        m4.compose(V.set(w.x, y, -w.y), Q.setFromAxisAngle(UP, h.n * 1.7), S1);
        if (h.k === 'b') I.peel.im.setMatrixAt(nb++, m4); else I.honey.im.setMatrixAt(nh++, m4);
      }
      I.peel.im.count = I.peel.ol.count = nb; I.honey.im.count = I.honey.ol.count = nh;
      I.peel.im.instanceMatrix.needsUpdate = true; I.honey.im.instanceMatrix.needsUpdate = true;
      // nuvolette di fiori in volo
      let nc = 0;
      for (const cl of RX.s.cl) {
        if (nc >= 8) break;
        const w = P.world(RX.g, cl.s, cl.d), sc = cl.to < 0 ? Math.max(0.2, cl.life === undefined ? 1 : cl.life / 1.5) : 1;
        m4.compose(V.set(w.x, roadH(cl.s, cl.d, w.x, w.y) + 2.2 + Math.sin(now * 5 + nc) * 0.2, -w.y), Q.setFromAxisAngle(UP, now * 2), V.clone().set(sc, sc, sc));
        I.cloud.im.setMatrixAt(nc++, m4);
      }
      // la nuvoletta che riporta in pista (sotto il kart che sale e scende)
      for (const c of RX.s.cars) {
        if (!(c.res > 0) || nc >= 8) continue;
        const Pz = P.pose(RX.g, c), k = 1 - c.res / P.RESCUE, lift = (k < 0.5 ? k : 1 - k) * 2 * 2.4, sc = 0.75 * Math.min(1, Math.min(k, 1 - k) * 8);
        m4.compose(V.set(Pz.x, roadH(c.s, c.d, Pz.x, Pz.y) + lift - 0.1, -Pz.y), Q.setFromAxisAngle(UP, now * 1.5), V.clone().set(sc * 1.4, sc * 0.7, sc * 1.6));
        I.cloud.im.setMatrixAt(nc++, m4);
      }
      I.cloud.im.count = I.cloud.ol.count = nc;
      I.cloud.im.instanceMatrix.needsUpdate = true;
    }
    // gabbiani che girano in cielo (mare, di giorno e al tramonto)
    function buildGulls() {
      RX.R3.gulls = null;
      if (RX.cfg.theme !== 'sea' || (RX.N.night || 0) >= 1) return;
      const W1 = RX.C.gull;
      const gm = merge([
        { geo: RX.GEO.sph, c: W1, m: M4(0, 0, 0, 0, 0, 0, 0.18, 0.16, 0.5), ol: 0.03 },
        { geo: RX.GEO.box, c: W1, m: M4(-0.55, 0.12, 0, 0, 0, 0.35, 1.0, 0.05, 0.3), ol: 0.03 },
        { geo: RX.GEO.box, c: W1, m: M4(0.55, 0.12, 0, 0, 0, -0.35, 1.0, 0.05, 0.3), ol: 0.03 },
        { geo: RX.GEO.cone, c: RX.C['tl-amber'], m: M4(0, 0, 0.55, Math.PI / 2, 0, 0, 0.06, 0.18, 0.06) },
      ]);
      const list = [];
      for (let i = 0; i < 5; i++) { const m = meshOf(gm, RX.R3.inkMat, RX.R3.vc); RX.R3.scene.add(m); list.push(m); }
      RX.R3.gulls = list;
    }

    return { DRV, buildKarts, buildHood, buildFx, emit, burst, updateFx, buildItems, updateItems, buildGulls };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
