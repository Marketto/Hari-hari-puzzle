/* Hari Rally — blocchi di scenario: forme riusate, strada, ponti e gallerie, bordi morbidi, ostacoli, archi, tribune, cartelli.
 * Parte di rally-ui.js (stesso create()): si carica prima e rally-ui.js la monta con HH.rallyScenery(RX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // RX = contesto condiviso con rally-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.rallyScenery = function (RX) {
    const { T, P, keep, toon, basic, M4, base, merge, meshOf, clearPt, groundH, roadH, V3 } = RX;
    /* ---------- forme riusate (istanze) ---------- */

    function kinds() {
      if (RX.TGc && RX.TGc.key === RX.R3.scene.uuid) return RX.TGc;
      const W1 = new T.Color(1, 1, 1);
      const round = merge([
        { geo: RX.GEO.sph, c: W1, m: M4(0, 3.5, 0, 0, 0, 0, 2.3, 2.05, 2.3), ol: 0.12 },
        { geo: RX.GEO.sph, c: W1, m: M4(1.25, 2.85, 0.5, 0, 0, 0, 1.5, 1.35, 1.5), ol: 0.11 },
      ]);
      const pine = merge([
        { geo: RX.GEO.cone, c: W1, m: M4(0, 2.4, 0, 0, 0, 0, 2.1, 3.0, 2.1), ol: 0.1 },
        { geo: RX.GEO.cone, c: W1, m: M4(0, 3.9, 0, 0, 0, 0, 1.65, 2.6, 1.65), ol: 0.1 },
        { geo: RX.GEO.cone, c: W1, m: M4(0, 5.2, 0, 0, 0, 0, 1.1, 2.1, 1.1), ol: 0.09 },
      ]);
      // cespuglio: due bolle una dietro l'altra lungo la strada (asse z), larghezza verso la strada = 0,95
      const bush = merge([
        { geo: RX.GEO.lo, c: W1, m: M4(0, 0.5, 0, 0, 0, 0, 0.95, 0.75, 0.95), ol: 0.08 },
        { geo: RX.GEO.lo, c: W1, m: M4(0, 0.35, 0.75, 0, 0, 0, 0.62, 0.55, 0.62), ol: 0.07 },
      ]);
      const trunk = keep(new T.CylinderGeometry(0.2, 0.32, 2.6, 7)); trunk.translate(0, 1.3, 0);
      const capM = merge([
        { geo: RX.GEO.cone, c: RX.C['snow-cap'], m: M4(0, 4.75, 0, 0, 0, 0, 1.0, 1.15, 1.0) },
        { geo: RX.GEO.cone, c: RX.C['snow-cap'], m: M4(0, 5.75, 0, 0, 0, 0, 0.68, 1.0, 0.68) },
      ]);
      const rockLine = keep(RX.GEO.rock.clone()); rockLine.scale(1.09, 1.12, 1.09);
      // animaletto che tifa (bianco: il colore del pelo arriva dall'istanza; occhi e guance restano scuri/rosa)
      const ink = RX.C.eye, bl = RX.C['bunny-in'];
      const critter = merge([
        { geo: RX.GEO.lo, c: W1, m: M4(0, 0.45, 0, 0, 0, 0, 0.36, 0.42, 0.33), ol: 0.04 },
        { geo: RX.GEO.lo, c: W1, m: M4(0, 0.98, 0.02, 0, 0, 0, 0.33, 0.3, 0.3), ol: 0.04 },
        { geo: RX.GEO.sph0, c: W1, m: M4(-0.15, 1.32, 0, 0, 0, 0.25, 0.08, 0.2, 0.06), ol: 0.03 },
        { geo: RX.GEO.sph0, c: W1, m: M4(0.15, 1.32, 0, 0, 0, -0.25, 0.08, 0.2, 0.06), ol: 0.03 },
        { geo: RX.GEO.sph0, c: W1, m: M4(-0.38, 0.86, 0, 0, 0, 0.55, 0.08, 0.24, 0.08) },
        { geo: RX.GEO.sph0, c: W1, m: M4(0.38, 0.86, 0, 0, 0, -0.55, 0.08, 0.24, 0.08) },
        { geo: RX.GEO.sph0, c: ink, m: M4(-0.11, 1.0, 0.28, 0, 0, 0, 0.05, 0.06, 0.03) },
        { geo: RX.GEO.sph0, c: ink, m: M4(0.11, 1.0, 0.28, 0, 0, 0, 0.05, 0.06, 0.03) },
        { geo: RX.GEO.sph0, c: bl, m: M4(-0.19, 0.92, 0.26, 0, 0, 0, 0.06, 0.035, 0.02) },
        { geo: RX.GEO.sph0, c: bl, m: M4(0.19, 0.92, 0.26, 0, 0, 0, 0.06, 0.035, 0.02) },
        { geo: RX.GEO.sph0, c: W1, m: M4(0, 0.32, -0.33, 0, 0, 0, 0.13, 0.13, 0.13) },
      ]);
      const bulbGeo = RX.GEO.sph2;
      // versioni lontane (LOD): una forma sola, senza contorno
      const far = {
        round: merge([{ geo: RX.GEO.lo, c: W1, m: M4(0.3, 3.3, 0.1, 0, 0, 0, 2.5, 2.2, 2.4) }]).body,
        pine: merge([{ geo: RX.GEO.cone, c: W1, m: M4(0, 3.3, 0, 0, 0, 0, 2.1, 5.2, 2.1) }]).body,
        bush: merge([{ geo: RX.GEO.lo, c: W1, m: M4(0, 0.45, 0.3, 0, 0, 0, 0.95, 0.75, 1.3) }]).body,
      };
      RX.TGc = {
        key: RX.R3.scene.uuid, round, pine, bush, trunk, cap: capM.body, rockLine, critter, bulbGeo, far,
        trunkMat: toon({ color: RX.C.trunk }), tintMat: toon({ vertexColors: true }), flowMat: toon({}),
        shaftMat: basic({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }),
      };
      return RX.TGc;
    }
    const YAW = (th) => Math.atan2(Math.cos(th), -Math.sin(th));   // asse z locale = avanti lungo la strada, x locale = a sinistra
    const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

    // strisce della carreggiata per ambientazione: [d0, d1, colore, quota, colore alterno, periodo in tratti da 2 m]
    function roadStrips(th) {
      const H = P.HALF, WL = RX.g.wall;
      if (th === 'city') return [[-WL, -H - 0.25, 'walk', 0.19, 'walk-2', 1], [-H - 0.25, -H, 'curb', 0.15, 'curb-2', 1], [-H, -H + 0.3, 'road', 0.07],
        [-H + 0.3, -H + 0.45, 'paint', 0.075], [-H + 0.45, -0.08, 'road', 0.07], [-0.08, 0.08, 'paint-2', 0.075, 'road', 1], [0.08, H - 0.45, 'road', 0.07],
        [H - 0.45, H - 0.3, 'paint', 0.075], [H - 0.3, H, 'road', 0.07], [H, H + 0.25, 'curb', 0.15, 'curb-2', 1], [H + 0.25, WL, 'walk', 0.19, 'walk-2', 1]];
      if (th === 'sea') return [[-H - 1.4, -H, 'verge', 0.03], [-H, -H + 0.3, 'road', 0.07], [-H + 0.3, -H + 0.45, 'paint', 0.075], [-H + 0.45, -0.07, 'road', 0.07],
        [-0.07, 0.07, 'paint', 0.075, 'road', 1], [0.07, H - 0.45, 'road', 0.07], [H - 0.45, H - 0.3, 'paint', 0.075], [H - 0.3, H, 'road', 0.07], [H, H + 1.4, 'verge', 0.03]];
      return [[-H - 1.6, -H, 'verge', 0.03], [-H, -2.1, 'dirt', 0.07], [-2.1, -1.2, 'dirt-2', 0.07], [-1.2, 1.2, 'dirt-3', 0.07], [1.2, 2.1, 'dirt-2', 0.07], [2.1, H, 'dirt', 0.07], [H, H + 1.6, 'verge', 0.03]];
    }

    /* blocco di scenario: strada, bordi, oggetti dell'ambientazione, archi, pubblico, luci */
    function buildChunk(ch) {
      if (ch.grp) return;
      const t0 = performance.now();
      const grp = new T.Group();
      const { a, b } = ch, HALF = P.HALF, th = RX.cfg.theme, WL = RX.g.wall, lit = RX.R3.lit, KD = kinds();
      const r = HH.rng(((RX.s.seed * 31) ^ (a * 2654435761)) >>> 0);
      const inBridge = (sv, m = 0) => RX.g.bridges.some((q) => sv > q.s0 - m && sv < q.s1 + m);
      const inTunnel = (sv, m = 0) => RX.g.tunnels.some((q) => sv > q.s0 - m && sv < q.s1 + m);
      // strada a strisce, con i bordi chiusi fino al terreno (nessuna fessura su curve paraboliche e colline)
      const strips = roadStrips(th);
      const pos = [], col = [];
      const push = (p, c) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); };
      // sezione trasversale: centro, normale e quota ai due bordi (in mezzo si interpola: la strada è piana di traverso)
      const XS = new Map();
      const sec = (sv) => {
        let q = XS.get(sv);
        if (q) return q;
        const w = P.world(RX.g, sv, 0), nx = -Math.sin(w.th), ny = Math.cos(w.th), E = 9;
        const hl = roadH(sv, -E, w.x - nx * E, w.y - ny * E), hr = roadH(sv, E, w.x + nx * E, w.y + ny * E);
        q = { x: w.x, y: w.y, nx, ny, hl, hr };
        XS.set(sv, q);
        return q;
      };
      const pt = (sv, d, up) => { const q = sec(sv); return V3(q.x + q.nx * d, q.hl + (q.hr - q.hl) * (d + 9) / 18 + up, q.y + q.ny * d); };
      const quad = (A, B, Cc, D, c) => { push(A, c); push(Cc, c); push(B, c); push(Cc, c); push(D, c); push(B, c); };
      const wood = th === 'forest' || th === 'snow';
      for (let sv = a; sv < b; sv += 2) {
        const s2 = Math.min(b, sv + 2), seg = Math.floor(sv / 2);
        const ed = P.edgeAt(RX.g, sv + 1), br = ed.kind === 'rail', tu = ed.kind === 'tube';
        const lim = br ? P.RAIL + 0.25 : tu ? P.TUBE : 99;
        let dMin = 0, dMax = 0, upMin = 0, upMax = 0;
        for (const [d00, d10, ck, up0, alt, per] of strips) {
          let d0 = Math.max(-lim, d00), d1 = Math.min(lim, d10);
          if (d1 <= d0 + 0.01) continue;
          let ckk = alt && Math.floor(seg / (per || 1)) % 2 ? alt : ck, up = up0;
          if (br && wood) { if (ck === 'verge') continue; ckk = seg % 2 ? 'wood' : 'wood-2'; up = 0.09; }
          else if (br && (ck === 'verge' || ck === 'walk')) { ckk = 'curb'; up = 0.12; d0 = Math.max(d0, -lim); d1 = Math.min(d1, lim); }
          else if (tu && ck === 'road') ckk = 'road-2';
          const c = RX.C[ckk];
          quad(pt(sv, d0, up), pt(sv, d1, up), pt(s2, d0, up), pt(s2, d1, up), c);
          if (d0 < dMin) { dMin = d0; upMin = up; }
          if (d1 > dMax) { dMax = d1; upMax = up; }
        }
        // bordo verticale fino al terreno (non sui ponti)
        if (!br) for (const [d, up] of [[dMin, upMin], [dMax, upMax]]) {
          const A = pt(sv, d, up), B2 = pt(s2, d, up);
          const A2 = new T.Vector3(A.x, Math.min(A.y - 0.05, groundH(A.x, -A.z, d) - 0.35), A.z), B3 = new T.Vector3(B2.x, Math.min(B2.y - 0.05, groundH(B2.x, -B2.z, d) - 0.35), B2.z);
          const c = RX.C[th === 'city' ? 'curb' : th === 'snow' ? 'snowbank' : 'verge'];
          if (d < 0) quad(A, A2, B2, B3, c); else quad(A, B2, A2, B3, c);
        }
      }
      const rg = keep(new T.BufferGeometry());
      rg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      rg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      rg.computeVertexNormals();
      grp.add(new T.Mesh(rg, RX.R3.vc));
      const tRoad = performance.now();
      // oggetti fusi (colori nei vertici) e liste di istanze
      const parts = [], add = (geo, c, m, ol = 0) => parts.push({ geo, c, m, ol });
      const at = (sv, d, up = 0, rot = 0) => { const w = P.world(RX.g, sv, d); const h = up === 'g' ? groundH(w.x, w.y) + 0.14 : roadH(sv, d, w.x, w.y) + up; return { x: w.x, h, z: -w.y, ry: YAW(w.th) + rot, th: w.th, wx: w.x, wy: w.y }; };
      const clearOf = (x, y, d) => clearPt(x, y, d);
      const L2 = { round: [], pine: [], bush: [], rock: [], flow: [], crit: [], win: [], bulb: [] };
      const halos = [], pools = [];
      // alone alla lampadina; pozza di luce (raggio pool) sul terreno a quota ph, nel punto px/pz (di solito sotto)
      const glowAt = (x, h, z, pool = 3.2, ph = 0, px = x, pz = z) => { if (!lit) return; halos.push(x, h, z); if (pool) pools.push(px, pz, pool, ph); };
      RX.ctxC = { ch, grp, a, b, r, add, at, clearOf, L2, glowAt, inBridge, inTunnel, WL, HALF, lit, KD };

      bridgesAndTunnels(RX.ctxC);
      edgeDecor(RX.ctxC);
      if (th === 'forest') RX.decorForest(RX.ctxC);
      else if (th === 'city') RX.decorCity(RX.ctxC);
      else if (th === 'sea') RX.decorSea(RX.ctxC);
      else RX.decorSnow(RX.ctxC);
      obstacles(RX.ctxC);
      props(RX.ctxC);
      arches(RX.ctxC);
      chevrons(RX.ctxC);
      const tDecor = performance.now();

      if (parts.length) { const mm = merge(parts); grp.add(meshOf(mm, RX.R3.inkMat, RX.R3.vc)); }
      const tMerge = performance.now();
      (RX.R3.stat = RX.R3.stat || []).push({ road: +(tRoad - t0).toFixed(1), decor: +(tDecor - tRoad).toFixed(1), merge: +(tMerge - tDecor).toFixed(1), parts: parts.length, verts: parts.reduce((n, q) => n + base(q.geo).n * (q.ol ? 2 : 1), 0), inst: Object.fromEntries(Object.entries(L2).map(([k, v]) => [k, v.length])), t: +(performance.now() - t0).toFixed(1) });
      // istanze
      // farGeo: versione lontana (LOD) che condivide matrici e colori; vicino si vede quella dettagliata col contorno
      ch.near = []; ch.far = [];
      const inst = (geo, mat, list, place, olGeo, tint, farGeo) => {
        if (!list.length) return null;
        const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4();
        list.forEach((it, i) => { place(m4, it); im.setMatrixAt(i, m4); if (tint) im.setColorAt(i, tint(it)); });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        grp.add(im);
        let ol = null;
        if (olGeo) { ol = new T.InstancedMesh(olGeo, RX.R3.inkMat, list.length); ol.instanceMatrix = im.instanceMatrix; ol.boundingSphere = im.boundingSphere; grp.add(ol); }
        if (farGeo) {
          const fm = new T.InstancedMesh(farGeo, mat, list.length);
          fm.instanceMatrix = im.instanceMatrix; fm.instanceColor = im.instanceColor; fm.boundingSphere = im.boundingSphere; fm.visible = false;
          grp.add(fm);
          ch.near.push(im); if (ol) ch.near.push(ol); ch.far.push(fm);
        }
        return im;
      };
      const Q = new T.Quaternion(), UP = new T.Vector3(0, 1, 0), V = new T.Vector3(), S3 = new T.Vector3();
      // [x, y, scala, variante, (yaw)]: alberi con rotazione e altezza un po' diverse
      const placeTree = (m4, [x, y, k, q]) => m4.compose(V.set(x, groundH(x, y) + 0.1, -y), Q.setFromAxisAngle(UP, q * 6.28), S3.set(k, k * (0.9 + q * 0.3), k));
      const leaf = [RX.C['leaf-1'], RX.C['leaf-2'], RX.C['leaf-3']], pin = [RX.C.pine, RX.C['pine-2']];
      const allTrees = L2.round.concat(L2.pine);
      inst(KD.trunk, KD.trunkMat, allTrees, placeTree);
      inst(KD.round.body, KD.tintMat, L2.round, placeTree, KD.round.line, (it) => it[4] || leaf[it[3] < 0.5 ? 0 : it[3] < 0.82 ? 1 : 2], KD.far.round);
      inst(KD.pine.body, KD.tintMat, L2.pine, placeTree, KD.pine.line, (it) => pin[it[3] < 0.6 ? 0 : 1], KD.far.pine);
      if (th === 'snow') inst(KD.cap, KD.tintMat, L2.pine, placeTree);
      // cespugli e cumuli di neve: [x, y, k, yaw, colore, alto]
      inst(KD.bush.body, KD.tintMat, L2.bush, (m4, [x, y, k, yaw, c, hk]) => m4.compose(V.set(x, groundH(x, y) + 0.08, -y), Q.setFromAxisAngle(UP, yaw), S3.set(k, k * (hk || 1), k * 1.3)), KD.bush.line, (it) => it[4], KD.far.bush);
      inst(RX.GEO.sph, KD.flowMat, L2.flow, (m4, [x, y]) => m4.compose(V.set(x, groundH(x, y) + 0.36, -y), Q.identity(), S3.set(0.24, 0.2, 0.24)), null, (it) => [RX.C['flower-1'], RX.C['flower-2'], RX.C['flower-3']][it[2]]);
      // rocce: [x, y, raggio, colore, ostacolo]: gli ostacoli girano solo in orizzontale (ingombro = raggio di collisione)
      inst(RX.GEO.rock, KD.flowMat, L2.rock, (m4, [x, y, k, c, obst, h0]) => m4.compose(V.set(x, (h0 !== undefined ? h0 : groundH(x, y)) + 0.3 * k, -y), obst ? Q.setFromAxisAngle(UP, x) : Q.setFromEuler(new T.Euler(x, y, 0)), S3.set(k, k * 0.8, k)), KD.rockLine, (it) => it[3]);
      inst(KD.bulbGeo, RX.R3.bulbMat, L2.bulb, (m4, [x, h, z, k]) => m4.compose(V.set(x, h, z), Q.identity(), S3.set(k, k, k)));
      inst(RX.GEO.plane, RX.R3.winMat, L2.win, (m4, [x, h, z, yaw, w, hh]) => m4.compose(V.set(x, h, z), Q.setFromAxisAngle(UP, yaw), S3.set(w, hh, 1)), null, (it) => it[6]);
      // animaletti e pubblico: saltellano (matrici aggiornate solo quando il blocco è vicino)
      if (L2.crit.length) {
        const list = L2.crit;
        const im = inst(KD.critter.body, KD.tintMat, list, (m4, [x, h, z, yaw, k]) => m4.compose(V.set(x, h, z), Q.setFromAxisAngle(UP, yaw), S3.set(k, k, k)), KD.critter.line, (it) => it[5]);
        const m4 = new T.Matrix4();
        RX.R3.anim.push({ ch, fn(t) {
          for (let i = 0; i < list.length; i++) {
            const [x, h, z, yaw, k, , ph, amp] = list[i];
            const hop = Math.abs(Math.sin(t * (amp > 0.2 ? 7 : 4) + ph)) * amp;
            m4.compose(V.set(x, h + hop, z), Q.setFromAxisAngle(UP, yaw + Math.sin(t * 3 + ph) * 0.25), S3.set(k, k * (1 + hop * 0.15), k));
            im.setMatrixAt(i, m4);
          }
          im.instanceMatrix.needsUpdate = true;
        } });
      }
      // raggi di sole tra gli alberi (bosco di giorno)
      if (RX.N.shafts > 0 && th === 'forest' && r() < 0.8) {
        const sp = [], sc = [], c = RX.C.shaft;
        for (let i = 0; i < 3; i++) {
          const sv = a + r() * (b - a), side = r() < 0.5 ? -1 : 1, w = P.world(RX.g, sv, side * (WL + 3 + r() * 8)), h = groundH(w.x, w.y);
          const wd = 0.7 + r() * 0.9, ox = 5 + r() * 3;
          const p0 = [w.x - wd, h, -w.y], p1 = [w.x + wd, h, -w.y], p2 = [w.x + wd * 1.8 + ox, h + 15, -w.y - 4], p3 = [w.x - wd * 1.8 + ox, h + 15, -w.y - 4];
          sp.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
          for (const al of [0.32, 0.32, 0, 0.32, 0, 0]) sc.push(c.r, c.g, c.b, al);
        }
        const sg = keep(new T.BufferGeometry());
        sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        sg.setAttribute('color', new T.Float32BufferAttribute(sc, 4));
        grp.add(new T.Mesh(sg, KD.shaftMat));
      }
      // luci della notte: aloni e pozze di luce
      if (halos.length) {
        const hg = keep(new T.BufferGeometry()); hg.setAttribute('position', new T.Float32BufferAttribute(halos, 3));
        const hp = new T.Points(hg, RX.R3.haloMat); grp.add(hp);
      }
      if (pools.length) {
        const pp = [], uv = [];
        for (let i = 0; i < pools.length; i += 4) {
          const x = pools[i], z = pools[i + 1], rr = pools[i + 2], h = pools[i + 3] + 0.12;
          pp.push(x - rr, h, z - rr, x - rr, h, z + rr, x + rr, h, z - rr, x + rr, h, z - rr, x - rr, h, z + rr, x + rr, h, z + rr);
          uv.push(0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1);
        }
        const pg = keep(new T.BufferGeometry());
        pg.setAttribute('position', new T.Float32BufferAttribute(pp, 3));
        pg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
        grp.add(new T.Mesh(pg, RX.R3.poolMat));
      }
      // centro e raggio per la visibilità
      let mx = 0, my = 0;
      for (let i = a; i <= b; i += 4) { mx += RX.g.x[i]; my += RX.g.y[i]; }
      const cnt = Math.floor((b - a) / 4) + 1;
      ch.x = mx / cnt; ch.y = my / cnt;
      ch.rad = 0;
      for (let i = a; i <= b; i += 4) ch.rad = Math.max(ch.rad, Math.hypot(RX.g.x[i] - ch.x, RX.g.y[i] - ch.y));
      ch.rad += 48;
      ch.grp = grp;
      RX.R3.scene.add(grp);
      (RX.R3.buildT = RX.R3.buildT || []).push(+(performance.now() - t0).toFixed(1));   // diagnostica (QA): tempi di costruzione
    }


    /* ponti (ringhiere con la faccia interna a P.RAIL) e gallerie (pareti a P.TUBE) */
    function bridgesAndTunnels(K) {
      const { a, b, add, at, r, grp, glowAt, HALF } = K, th = RX.cfg.theme;
      const woodC = th === 'forest' || th === 'snow';
      for (const q of RX.g.bridges) {
        if (q.s1 < a || q.s0 >= b) continue;
        const postC = woodC ? RX.C['wood-2'] : th === 'city' ? RX.C.walk : RX.C.paint, railC = woodC ? RX.C.wood : th === 'city' ? RX.C['walk-2'] : RX.C.paint;
        for (const side of [-1, 1]) {
          const dd = side * (P.RAIL + 0.11);
          for (let sv = q.s0; sv <= q.s1; sv += 3) { const p = at(sv, dd, 0.5); add(RX.GEO.box, postC, M4(p.x, p.h, p.z, 0, p.ry, 0, 0.22, 1.0, 0.22), 0.05); }
          for (let sv = q.s0; sv < q.s1; sv += 3) {
            const p0 = at(sv + 1.5, dd, 0.95);
            add(RX.GEO.box, railC, M4(p0.x, p0.h, p0.z, 0, p0.ry, 0, 0.16, 0.16, 3.1), 0.05);
            if (!woodC) { const p1 = at(sv + 1.5, dd, 0.55); add(RX.GEO.box, railC, M4(p1.x, p1.h, p1.z, 0, p1.ry, 0, 0.12, 0.12, 3.1), 0.04); }
            // trave sotto il bordo dell'impalcato
            const p2 = at(sv + 1.5, side * (P.RAIL + 0.1), -0.25);
            add(RX.GEO.box, woodC ? RX.C['wood-2'] : RX.C.curb, M4(p2.x, p2.h, p2.z, 0, p2.ry, 0, 0.5, 0.5, 3.05), 0.04);
          }
          if (th !== 'forest' && th !== 'snow') { const pl = at((q.s0 + q.s1) / 2, side * (P.RAIL + 0.3), 1.6), pq = at((q.s0 + q.s1) / 2, side * 2.5, 0); add(RX.GEO.cyl, RX.C.lamp, M4(pl.x, pl.h, pl.z, 0, 0, 0, 0.08, 2.4, 0.08)); K.L2.bulb.push([pl.x, pl.h + 1.3, pl.z, 0.22]); glowAt(pl.x, pl.h + 1.3, pl.z, 3.2, pq.h, pq.x, pq.z); }
        }
        const m = (q.s0 + q.s1) / 2, w = P.world(RX.g, m), base0 = P.height(RX.g, w.x, w.y);
        const water = new T.Mesh(RX.GEO.box, toon({ color: th === 'sea' ? RX.C.sea : RX.C.water }));
        water.position.set(w.x, RX.isSea ? RX.SEA_Y + 0.2 : base0 - 1.35, -w.y); water.rotation.y = YAW(w.th) + Math.PI / 2; water.scale.set(150, 0.1, 6.5);
        grp.add(water);
        if (th === 'city') for (const side of [-1, 1]) {
          // argini del canale
          const pc = P.world(RX.g, m, 0);
          for (const off of [-3.6, 3.6]) {
            const cx = pc.x + Math.cos(w.th) * off, cy = pc.y + Math.sin(w.th) * off;
            add(RX.GEO.box, RX.C['walk-2'], M4(cx - Math.sin(w.th) * side * 30, base0 - 1.0, -(cy + Math.cos(w.th) * side * 30), 0, YAW(w.th) + Math.PI / 2, 0, 46, 1.6, 0.6));
          }
        }
      }
      // guardrail a imbuto (logica: P.sideAt, tipo 'fun'): dal limite dell'ambientazione alla ringhiera o alla parete
      for (const [list, m] of [[RX.g.bridges, 1], [RX.g.tunnels, 0.5]]) for (const q of list) {
        for (const [f0, f1] of [[q.s0 - m - P.FUN, q.s0 - m], [q.s1 + m, q.s1 + m + P.FUN]]) {
          if (f1 < a || f0 >= b) continue;
          for (let sv = Math.max(a, f0); sv < Math.min(b, f1); sv += 2) {
            for (const side of [-1, 1]) {
              const l0 = P.sideAt(RX.g, sv + 0.01, side).lim, l1 = P.sideAt(RX.g, Math.min(f1, sv + 2) - 0.01, side).lim;
              const p0 = P.world(RX.g, sv, side * (l0 + 0.12)), p1 = P.world(RX.g, Math.min(f1, sv + 2), side * (l1 + 0.12));
              const len = Math.hypot(p1.x - p0.x, p1.y - p0.y), mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, hh = groundH(mx, my);
              const yaw = YAW(Math.atan2(p1.y - p0.y, p1.x - p0.x));
              const rc = th === 'city' ? RX.C['barrier-1'] : th === 'sea' ? RX.C.paint : RX.C.wood;
              add(RX.GEO.box, rc, M4(mx, hh + 0.75, -my, 0, yaw, 0, 0.18, 0.22, len + 0.04), 0.04);
              add(RX.GEO.box, th === 'city' ? RX.C['barrier-2'] : rc, M4(mx, hh + 0.4, -my, 0, yaw, 0, 0.14, 0.16, len + 0.04), 0.03);
              add(RX.GEO.box, woodC ? RX.C['wood-2'] : RX.C.lamp, M4(p0.x, hh + 0.45, -p0.y, 0, yaw, 0, 0.16, 0.9, 0.16), 0.03);
            }
          }
        }
      }
      for (const q of RX.g.tunnels) {
        if (q.s1 < a || q.s0 >= b) continue;
        const wallC = th === 'city' ? RX.C.curb : th === 'sea' ? RX.C.cliff : RX.C.rock, wall2 = th === 'city' ? RX.C['bld-2'] : th === 'sea' ? RX.C['cliff-2'] : RX.C['rock-2'];
        const s0 = Math.max(q.s0, a), s1 = Math.min(q.s1, b);
        for (let sv = s0; sv < s1; sv += 2) {
          const ln = Math.min(2, s1 - sv);
          for (const side of [-1, 1]) {
            const p = at(sv + ln / 2, side * (P.TUBE + 0.3), 2.3);
            add(RX.GEO.box, Math.floor(sv / 4) % 2 ? wallC : wall2, M4(p.x, p.h, p.z, 0, p.ry, 0, 0.6, 4.6, ln + 0.02), 0.03);
            const st = at(sv + ln / 2, side * (P.TUBE + 0.005), 0.9);
            add(RX.GEO.box, RX.C['curb-2'], M4(st.x, st.h, st.z, 0, st.ry, 0, 0.03, 0.22, ln + 0.02));
          }
          const c0 = at(sv + ln / 2, 0, 4.85);
          add(RX.GEO.box, th === 'city' ? RX.C.roof : RX.C['rock-2'], M4(c0.x, c0.h, c0.z, 0, c0.ry, 0, 2 * (P.TUBE + 0.6), 0.5, ln + 0.02), 0.03);
          if (Math.floor(sv) % 6 < 2) { K.L2.bulb.push([c0.x, c0.h - 0.33, c0.z, 0.2]); glowAt(c0.x, c0.h - 0.4, c0.z, 0, 0); }
        }
        // portali con le strisce e collinetta sopra
        for (const [sv, inn] of [[q.s0, 1], [q.s1, -1]]) {
          if (sv < a || sv >= b) continue;
          for (let i = -4; i <= 4; i++) {
            const p = at(sv - inn * 0.3, i * ((P.TUBE + 0.6) / 4.5), 5.7);
            add(RX.GEO.box, i % 2 ? RX.C['tl-amber'] : RX.C.ink, M4(p.x, p.h, p.z, 0, p.ry, 0, (P.TUBE + 0.6) / 4.5, 1.2, 0.5), 0.03);
          }
          // la collinetta sta tutta sopra il soffitto (il soffitto finisce a 5,1 m)
          const pm = at(sv + inn * 6, 0, 0);
          add(RX.GEO.sph, th === 'city' ? RX.C.plaza : th === 'snow' ? RX.C.snowbank : RX.C.grass, M4(pm.x, pm.h + 5.15 + 2.0, pm.z, 0, pm.ry, 0, P.TUBE + 3, 2.0, 7), 0.08);
        }
        // tetto erboso (o di roccia) per tutta la lunghezza
        for (let sv = s0; sv < s1; sv += 8) {
          const p = at(sv + 4, 0, 0);
          add(RX.GEO.sph, th === 'city' ? RX.C.plaza : th === 'snow' ? RX.C.snowbank : RX.C.cliff, M4(p.x, p.h + 5.15 + 1.5, p.z, 0, p.ry, 0, P.TUBE + 2.4, 1.5, 6), 0.06);
        }
      }
      void r; void HALF;
    }

    /* bordo morbido dell'ambientazione: la faccia interna di cespugli, transenne, staccionate, cumuli di neve e massi
       è esattamente a g.wall (dove la logica ferma il rettangolo dell'auto) */
    function edgeDecor(K) {
      const { a, b, r, add, at, L2, WL, inBridge, inTunnel, clearOf } = K, th = RX.cfg.theme;
      const fence = { '-1': r() < 0.3 ? [a + r() * 60, 0] : null, '1': r() < 0.3 ? [a + r() * 60, 0] : null };
      for (const side of [-1, 1]) if (fence[side]) fence[side][1] = fence[side][0] + 30 + r() * 40;
      for (let sv = a; sv < b; sv += 2) {
        if (inBridge(sv, 2) || inTunnel(sv, 1)) continue;
        for (const side of [-1, 1]) {
          const ed = P.edgeAt(RX.g, sv);
          if (ed.kind !== 'wall') continue;
          if (P.sideAt(RX.g, sv, side).kind === 'fun' || P.sideAt(RX.g, sv + 2, side).kind === 'fun') continue;
          if (th === 'sea' && side > 0) {
            // lato terra: muretto di pietra continuo (muro vero, come la logica)
            const p = at(sv + 1, side * (WL + 0.3), 'g');
            add(RX.GEO.box, Math.floor(sv / 2) % 2 ? RX.C.cliff : RX.C['cliff-2'], M4(p.x, p.h + 0.35, p.z, 0, p.ry, 0, 0.6, 0.8, 2.04), 0.04);
            continue;
          }
          if (th === 'city') {
            // transenne morbide a cuscino lunghe 4 m, a colori alterni
            if (Math.floor(sv / 2) % 2) continue;
            const p = at(sv + 2, side * (WL + 0.27), 0.62);
            add(RX.GEO.box, Math.floor(sv / 4) % 2 ? RX.C['barrier-1'] : RX.C['barrier-2'], M4(p.x, p.h, p.z, 0, p.ry, 0, 0.54, 0.86, 3.94), 0.04);
            continue;
          }
          if (th === 'sea' && side < 0) {
            // lato spiaggia: paletti di legno con la corda
            if (Math.floor(sv) % 4 === 0) { const p = at(sv, side * (WL + 0.1), 'g'); add(RX.GEO.cyl, RX.C.wood, M4(p.x, p.h + 0.5, p.z, 0, 0, 0, 0.1, 1.0, 0.1), 0.04); }
            const p = at(sv + 1, side * (WL + 0.06), 'g');
            add(RX.GEO.box, RX.C.sand, M4(p.x, p.h + 0.85, p.z, 0, p.ry, 0, 0.06, 0.06, 2.02));
            continue;
          }
          const f = fence[side];
          if (th === 'forest' && f && sv >= f[0] && sv < f[1]) {
            // staccionata di legno
            const p = at(sv + 1, side * (WL + 0.11), 'g');
            if (Math.floor(sv) % 4 === 0) add(RX.GEO.box, RX.C['wood-2'], M4(p.x, p.h + 0.55, p.z, 0, p.ry, 0, 0.22, 1.1, 0.22), 0.04);
            for (const hh of [0.45, 0.85]) add(RX.GEO.box, RX.C.wood, M4(p.x, p.h + hh, p.z, 0, p.ry, 0, 0.12, 0.14, 2.04), 0.03);
            continue;
          }
          if (r() > (th === "forest" ? 0.5 : 0.7)) continue;
          const k = 0.75 + r() * 0.45;
          if (th === 'sea' || (th === 'snow' && r() < 0.15)) {
            // massi della scogliera (lato terra): il raggio orizzontale è k
            const w = P.world(RX.g, sv + 1, side * (WL + k));
            if (clearOf(w.x, w.y, WL + k - 0.01)) L2.rock.push([w.x, w.y, k, r() < 0.5 ? RX.C.cliff : RX.C['cliff-2']]);
            continue;
          }
          // cespuglio (o cumulo di neve): bolla principale larga 0,95 k verso la strada
          const w = P.world(RX.g, sv + r(), side * (WL + 0.95 * k));
          if (clearOf(w.x, w.y, WL + 0.95 * k - 0.01)) L2.bush.push([w.x, w.y, k, YAW(w.th), th === 'snow' ? RX.C.snowbank : RX.C.bush, th === 'snow' ? 0.8 : 1]);
        }
      }
    }

    /* ostacoli della fascia fuori strada (logica: g.props, cerchi di raggio pr.r nel mondo): tronchi, rocce, ceppi,
       cespugli, pini, cumuli e pupazzi di neve disegnati con la stessa misura; le chiome stanno in alto
       (sopra i 2,3 m), così il kart che sbatte sul tronco non le attraversa */
    function props(K) {
      const { a, b, add, L2, r } = K;
      for (const pr of RX.g.props) {
        if (pr.s < a || pr.s >= b) continue;
        const x = pr.x, z = -pr.y, h = groundH(pr.x, pr.y), R = pr.r, yaw = pr.x * 1.7;
        if (pr.k === 'tree') {
          add(RX.GEO.cyl6, RX.C.trunk, M4(x, h + 1.5, z, 0, 0, 0, R, 3.0, R), 0.05);
          const c = [RX.C['leaf-1'], RX.C['leaf-2'], RX.C['leaf-3']][Math.floor(r() * 3)];
          add(RX.GEO.lo, c, M4(x, h + 4.0, z, 0, yaw, 0, 1.35, 1.2, 1.35), 0.1);
          add(RX.GEO.lo, c, M4(x + 0.7, h + 3.5, z + 0.4, 0, 0, 0, 0.8, 0.7, 0.8));
        } else if (pr.k === 'pine') {
          add(RX.GEO.cyl6, RX.C.trunk, M4(x, h + 1.3, z, 0, 0, 0, R, 2.6, R), 0.05);
          add(RX.GEO.cone, RX.C.pine, M4(x, h + 3.4, z, 0, yaw, 0, 1.6, 2.2, 1.6), 0.08);
          add(RX.GEO.cone, RX.C['snow-cap'], M4(x, h + 4.5, z, 0, yaw, 0, 1.0, 1.4, 1.0), 0.07);
        } else if (pr.k === 'stump') {
          add(RX.GEO.cyl6, RX.C.trunk, M4(x, h + 0.3, z, 0, 0, 0, R, 0.6, R), 0.04);
          add(RX.GEO.cyl6, RX.C.wood, M4(x, h + 0.61, z, 0, 0, 0, R * 0.85, 0.03, R * 0.85));
          if (r() < 0.4) add(RX.GEO.sph, RX.C.cap, M4(x + R * 0.4, h + 0.75, z, 0, 0, 0, 0.18, 0.1, 0.18), 0.02);
        } else if (pr.k === 'bush') {
          add(RX.GEO.lo, RX.C.bush, M4(x, h + 0.55 * R, z, 0, yaw, 0, R, 0.78 * R, R), 0.07);
          add(RX.GEO.lo, RX.C.bush, M4(x + 0.3 * R, h + 0.95 * R, z - 0.2 * R, 0, 0, 0, 0.55 * R, 0.45 * R, 0.55 * R), 0.05);
          for (let i = 0; i < 3; i++) { const an = yaw + i * 2.1; add(RX.GEO.sph0, RX.C['flower-' + (1 + i)], M4(x + Math.cos(an) * R * 0.7, h + 0.8 * R, z + Math.sin(an) * R * 0.7, 0, 0, 0, 0.12, 0.1, 0.12)); }
        } else if (pr.k === 'bank') {
          add(RX.GEO.lo, RX.C.snowbank, M4(x, h + 0.25 * R, z, 0, yaw, 0, R, 0.55 * R, R), 0.06);
        } else if (pr.k === 'snowman') {
          snowman(add, x, h + 0.05, z, R, yaw);
        } else L2.rock.push([x, pr.y, R, RX.C[r() < 0.5 ? 'rock' : 'rock-2'], 1]);
      }
    }
    /* ostacoli all'interno delle curve (logica: cerchi di raggio rk.r): stessa misura nella grafica */
    function obstacles(K) {
      const { a, b, add, at, L2 } = K;
      for (const rk of RX.g.rocks) {
        if (rk.s < a || rk.s >= b) continue;
        const w = P.world(RX.g, rk.s, rk.d), p = at(rk.s, rk.d, 'g');
        if (rk.k === 'planter') {
          add(RX.GEO.cyl, RX.C['bld-6'], M4(p.x, p.h + 0.35, p.z, 0, 0, 0, rk.r, 0.7, rk.r), 0.05);
          add(RX.GEO.cyl, RX.C.trunk, M4(p.x, p.h + 0.71, p.z, 0, 0, 0, rk.r * 0.9, 0.04, rk.r * 0.9));
          for (let i = 0; i < 7; i++) { const an = i * 0.9; add(RX.GEO.sph, [RX.C['flower-1'], RX.C['flower-2'], RX.C['flower-3']][i % 3], M4(p.x + Math.cos(an) * rk.r * 0.55 * (i ? 1 : 0), p.h + 0.85, p.z + Math.sin(an) * rk.r * 0.55 * (i ? 1 : 0), 0, 0, 0, 0.2, 0.17, 0.2), 0.02); }
        } else if (rk.k === 'snowman') {
          snowman(add, p.x, p.h, p.z, rk.r, p.ry + Math.PI);
        } else L2.rock.push([w.x, w.y, rk.r, RX.C.rock, 1]);
      }
    }
    function snowman(add, x, h, z, k, yaw) {
      add(RX.GEO.sph, RX.C.snowbank, M4(x, h + k * 0.8, z, 0, 0, 0, k, k * 0.85, k), 0.05);
      add(RX.GEO.sph, RX.C.snowbank, M4(x, h + k * 1.85, z, 0, 0, 0, k * 0.68, k * 0.62, k * 0.68), 0.05);
      add(RX.GEO.sph, RX.C.snowbank, M4(x, h + k * 2.6, z, 0, 0, 0, k * 0.46, k * 0.44, k * 0.46), 0.04);
      const fx = Math.sin(yaw), fz = Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw);
      for (const e of [-1, 1]) add(RX.GEO.sph, RX.C.eye, M4(x + fx * k * 0.4 + sx * e * k * 0.16, h + k * 2.68, z + fz * k * 0.4 + sz * e * k * 0.16, 0, 0, 0, 0.06, 0.07, 0.05));
      add(RX.GEO.cone, RX.C.carrot, M4(x + fx * k * 0.55, h + k * 2.56, z + fz * k * 0.55, Math.PI / 2, yaw, 0, 0.07, 0.36, 0.07), 0.02);
      add(RX.GEO.cyl, RX.C.scarf, M4(x, h + k * 2.2, z, 0, 0, 0, k * 0.5, 0.14, k * 0.5), 0.03);
      add(RX.GEO.cyl, RX.C['check-2'], M4(x, h + k * 3.05, z, 0, 0, 0, k * 0.3, k * 0.36, k * 0.3), 0.03);
      add(RX.GEO.cyl, RX.C['check-2'], M4(x, h + k * 2.88, z, 0, 0, 0, k * 0.46, 0.05, k * 0.46), 0.02);
    }

    /* archi di partenza, arrivo e checkpoint (piedi oltre il bordo), con un po' di pubblico */
    function arches(K) {
      const { a, b, add, at } = K;
      const list = [[P.PREROLL, 0], [P.PREROLL + RX.s.L, 1]].concat(RX.g.checks.map((c) => [c, 2]));
      for (const [sv, kind] of list) {
        if (sv < a || sv >= b) continue;
        const lim = P.edgeAt(RX.g, sv).lim, span = lim + 0.35;
        if (kind < 2) {
          for (const side of [-1, 1]) { const p = at(sv, side * span, 2.4); add(RX.GEO.cyl, RX.C.pole, M4(p.x, p.h, p.z, 0, 0, 0, 0.18, 4.8, 0.18), 0.05); }
          const p = at(sv, 0, 4.7);
          add(RX.GEO.box, RX.C.ink, M4(p.x, p.h, p.z, 0, p.ry, 0, 2 * span + 0.4, 1.0, 0.22));
          const n = 16;
          for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
            const q = at(sv, -span + ((i + 0.5) * (2 * span)) / n, 4.45 + j * 0.45);
            add(RX.GEO.box, (i + j) % 2 ? RX.C['check-2'] : RX.C['check-1'], M4(q.x, q.h, q.z, 0, q.ry, 0, (2 * span) / n, 0.44, 0.3));
          }
          if (kind === 1) for (const side of [-1, 1]) { const f = at(sv, side * span, 5.6); add(RX.GEO.cone, RX.C.flag, M4(f.x, f.h, f.z, 0, f.ry, side * 1.57, 0.4, 1.0, 0.2), 0.04); }
          // semafori decorativi alla partenza
          if (kind === 0) for (const side of [-1, 1]) {
            const tl = at(sv + 3, side * (span + 0.6), 'g');
            add(RX.GEO.cyl, RX.C.lamp, M4(tl.x, tl.h + 1.4, tl.z, 0, 0, 0, 0.08, 2.8, 0.08));
            add(RX.GEO.box, RX.C.lamp, M4(tl.x, tl.h + 3.2, tl.z, 0, tl.ry, 0, 0.5, 1.4, 0.4), 0.04);
            ['tl-red', 'tl-amber', 'tl-green'].forEach((c, i) => add(RX.GEO.sph, RX.C[c], M4(tl.x - Math.sin(tl.ry) * 0.21, tl.h + 3.62 - i * 0.42, tl.z - Math.cos(tl.ry) * 0.21, 0, 0, 0, 0.14, 0.14, 0.06)));
          }
        } else {
          // arco di palloncini
          const n = 17;
          for (let i = 0; i < n; i++) {
            const an = (i / (n - 1)) * Math.PI, q = at(sv, Math.cos(an) * span, 0.4 + Math.sin(an) * 5.4);
            add(RX.GEO.sph, RX.C['flag-' + ((i % 4) + 1)], M4(q.x, q.h, q.z, 0, 0, 0, 0.5, 0.56, 0.5), 0.04);
          }
        }
        // pubblico ai lati
        for (const side of [-1, 1]) stands(K, sv - 8 + (kind === 1 ? 4 : 0), side, 16);
      }
    }
    // tribunetta a gradoni dietro il bordo, con animaletti che tifano e bandierine
    function stands(K, s0, side, len) {
      const { add, at, L2, r, WL } = K;
      const lim = Math.max(WL, P.edgeAt(RX.g, s0).lim);
      for (let sv = s0; sv < s0 + len; sv += 2) {
        const ed = P.edgeAt(RX.g, sv);
        if (ed.kind !== 'wall') continue;
        for (let st = 0; st < 3; st++) {
          const d = side * (lim + 1.6 + st * 1.1), p = at(sv + 1, d, 'g');
          add(RX.GEO.box, st % 2 ? RX.C.stand : RX.C['stand-2'], M4(p.x, p.h + 0.25 + st * 0.45, p.z, 0, p.ry, 0, 1.1, 0.5 + st * 0.9, 2.02), st ? 0 : 0.03);
          if (r() < 0.6) L2.crit.push([p.x, p.h + 0.5 + st * 0.9 + 0.02, p.z, p.ry - side * Math.PI / 2, 0.85 + r() * 0.25, RX.C['fur-' + (1 + Math.floor(r() * 4))], r() * 6, 0.18]);
        }
      }
      // bandierine sopra la tribuna
      for (let sv = s0; sv < s0 + len; sv += 1.6) {
        const p = at(sv, side * (lim + 0.8), 'g');
        add(RX.GEO.cone, RX.C['flag-' + (1 + (Math.floor(sv / 1.6) % 4))], M4(p.x, p.h + 3.2, p.z, Math.PI, p.ry, 0, 0.32, 0.5, 0.06));
      }
      for (const e of [s0, s0 + len]) { const p = at(e, side * (lim + 0.8), 'g'); add(RX.GEO.cyl, RX.C.pole, M4(p.x, p.h + 1.7, p.z, 0, 0, 0, 0.07, 3.4, 0.07)); }
    }
    // cartelli a freccia all'esterno delle curve strette
    function chevrons(K) {
      const { a, b, add, at, WL } = K;
      for (const nt of RX.g.notes) {
        if (nt.kind !== 'curve' || nt.g > 2 || nt.apex < a || nt.apex >= b) continue;
        for (const off of [-12, 0, 12]) {
          const sv = nt.apex + off;
          if (P.edgeAt(RX.g, sv).kind !== 'wall') continue;
          const p = at(sv, -nt.dir * (WL + 0.7), 'g');
          add(RX.GEO.box, RX.C.ink, M4(p.x, p.h + 0.55, p.z, 0, p.ry, 0, 0.12, 1.1, 0.12));
          add(RX.GEO.box, RX.C.chevron, M4(p.x, p.h + 1.25, p.z, 0, p.ry, 0, 1.7, 0.8, 0.12), 0.05);
          for (const dy of [-0.18, 0.18]) add(RX.GEO.box, RX.C['chevron-2'], M4(p.x, p.h + 1.25 + dy, p.z, 0, p.ry, nt.dir * (dy > 0 ? -0.75 : 0.75), 0.13, 0.5, 0.16));
        }
      }
    }

    return { YAW, pick, buildChunk, snowman, stands };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
