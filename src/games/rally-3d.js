/* Hari Rally — 3D di base: renderer e materiali toon, geometrie fuse, quote di strada e terreno, scena, cielo, terreno che segue la camera, luci notturne.
 * Parte di rally-ui.js (stesso create()): si carica prima e rally-ui.js la monta con HH.rally3d(RX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // RX = contesto condiviso con rally-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.rally3d = function (RX) {
    const { smooth, T, P, split, readTheme, inView, pause } = RX;
    /* ---------- 3D: renderer e materiali ---------- */
    function initGL() {
      if (RX.R3) return true;
      if (!T) { RX.glErr = true; return false; }
      let renderer;
      try {
        renderer = new T.WebGLRenderer({ canvas: RX.cv, antialias: (G.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
      } catch (e) { RX.glErr = true; return false; }
      RX.pr = Math.min(prMax(), G.devicePixelRatio || 1);
      renderer.setPixelRatio(RX.pr);
      const grad = new T.DataTexture(new Uint8Array([128, 128, 128, 255, 196, 196, 196, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
      const camera = new T.PerspectiveCamera(66, 1, 0.1, 900);
      RX.R3 = { renderer, camera, grad, scene: null, disp: [], chunks: [], built: 0 };
      RX.cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); }, false);
      return true;
    }
    // pixel ratio massimo: 1,5 (una vista), 1 sullo schermo diviso (due viste da disegnare)
    const prMax = () => (split() ? 1 : 1.5);
    const keep = (x) => { RX.R3.disp.push(x); return x; };
    const toon = (o2) => keep(new T.MeshToonMaterial(Object.assign({ gradientMap: RX.R3.grad }, o2)));
    const basic = (o2) => keep(new T.MeshBasicMaterial(o2));

    // fonde parti semplici in una geometria con i colori nei vertici (+ guscio per il contorno, ingrandito per asse)
    function M4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
    }
    // geometria base non indicizzata + centro e mezze misure del suo riquadro (in cache sulla geometria)
    function base(geo) {
      if (geo._ry) return geo._ry;
      const gg = geo.index ? keep(geo.toNonIndexed()) : geo;
      gg.computeBoundingBox();
      const bb = gg.boundingBox;
      geo._ry = { pa: gg.attributes.position.array, na: gg.attributes.normal.array, n: gg.attributes.position.count, c: bb.getCenter(new T.Vector3()), hs: bb.getSize(new T.Vector3()).multiplyScalar(0.5) };
      return geo._ry;
    }
    function merge(parts) {
      let n = 0, nl = 0;
      const bs = parts.map((p) => { const b = base(p.geo); n += b.n; if (p.ol) nl += b.n; return b; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), lpos = new Float32Array(nl * 3);
      let k = 0, kl = 0;
      const nm = new T.Matrix3();
      parts.forEach((p, i) => {
        const { pa, na, n: cnt, c, hs } = bs[i], e = p.m.elements;
        nm.getNormalMatrix(p.m);
        const q = nm.elements;
        const sx = p.ol && hs.x > 1e-4 ? (hs.x + p.ol) / hs.x : 1, sy = p.ol && hs.y > 1e-4 ? (hs.y + p.ol) / hs.y : 1, sz = p.ol && hs.z > 1e-4 ? (hs.z + p.ol) / hs.z : 1;
        const cr = p.c.r, cg = p.c.g, cb = p.c.b;
        for (let j = 0; j < cnt; j++) {
          const x = pa[j * 3], y = pa[j * 3 + 1], z = pa[j * 3 + 2];
          if (p.ol) {
            const ox = c.x + (x - c.x) * sx, oy = c.y + (y - c.y) * sy, oz = c.z + (z - c.z) * sz;
            lpos[kl * 3] = e[0] * ox + e[4] * oy + e[8] * oz + e[12];
            lpos[kl * 3 + 1] = e[1] * ox + e[5] * oy + e[9] * oz + e[13];
            lpos[kl * 3 + 2] = e[2] * ox + e[6] * oy + e[10] * oz + e[14];
            kl++;
          }
          pos[k * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
          pos[k * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          pos[k * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          const nx = na[j * 3], ny = na[j * 3 + 1], nz = na[j * 3 + 2];
          let mx = q[0] * nx + q[3] * ny + q[6] * nz, my = q[1] * nx + q[4] * ny + q[7] * nz, mz = q[2] * nx + q[5] * ny + q[8] * nz;
          const l = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
          nor[k * 3] = mx / l; nor[k * 3 + 1] = my / l; nor[k * 3 + 2] = mz / l;
          col[k * 3] = cr; col[k * 3 + 1] = cg; col[k * 3 + 2] = cb;
          k++;
        }
      });
      const body = keep(new T.BufferGeometry());
      body.setAttribute('position', new T.BufferAttribute(pos, 3));
      body.setAttribute('normal', new T.BufferAttribute(nor, 3));
      body.setAttribute('color', new T.BufferAttribute(col, 3));
      let line = null;
      if (nl) { line = keep(new T.BufferGeometry()); line.setAttribute('position', new T.BufferAttribute(lpos, 3)); }
      return { body, line };
    }

    function geos() {
      if (RX.GEO) return RX.GEO;
      const prism = new T.CylinderGeometry(1, 1, 1, 3); prism.rotateZ(Math.PI / 2); prism.rotateX(-Math.PI / 2);   // tetto a capanna: colmo lungo x, punta in su (base a −0,5)
      // mezzo cilindro (fetta d'anguria): asse lungo x, arco in su, base piatta a y = 0
      const half = new T.CylinderGeometry(1, 1, 1, 14, 1, false, 0, Math.PI); half.rotateZ(Math.PI / 2);
      const disc = new T.CircleGeometry(1, 18); disc.rotateX(-Math.PI / 2);   // ombra dei kart
      RX.GEO = {
        box: keep(new T.BoxGeometry(1, 1, 1)), sph: keep(new T.IcosahedronGeometry(1, 1)), sph2: keep(new T.SphereGeometry(1, 10, 8)), lo: keep(new T.SphereGeometry(1, 7, 5)),
        cyl: keep(new T.CylinderGeometry(1, 1, 1, 10)), cyl6: keep(new T.CylinderGeometry(1, 1, 1, 6)), cone: keep(new T.ConeGeometry(1, 1, 8)), rock: keep(new T.DodecahedronGeometry(1, 0)),
        prism: keep(prism), plane: keep(new T.PlaneGeometry(1, 1)), ball: keep(new T.SphereGeometry(1, 16, 12)), sph0: keep(new T.IcosahedronGeometry(1, 0)),
        half: keep(half), disc: keep(disc),
      };
      return RX.GEO;
    }
    function meshOf(m, olMat, mat) {
      const grp = new T.Group();
      if (m.line) { const ol = new T.Mesh(m.line, olMat); grp.add(ol); }
      grp.add(new T.Mesh(m.body, mat));
      return grp;
    }

    /* ---------- altezze e terreno ---------- */

    function creek(x, y) {
      let dip = 0;
      for (const b of RX.BR) {
        const ax = x - b.x, ay = y - b.y, al = ax * b.tx + ay * b.ty;
        if (al > 16 || al < -16) continue;
        const la = Math.abs(-ax * b.ty + ay * b.tx);
        if (la > 90) continue;
        dip = Math.max(dip, 2.4 * Math.exp(-(al * al) / 22) * (la < 70 ? 1 : (90 - la) / 20));
      }
      return dip;
    }
    // nessun punto della pista entro d metri (ricerca solo nelle celle vicine, uscita al primo punto trovato)
    function clearPt(X, Y, d) {
      const cs = RX.g.cell, cx = Math.floor(X / cs), cy = Math.floor(Y / cs), n = Math.ceil(d / cs), d2 = d * d;
      for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) {
        const bk = RX.g.grid.get((cx + a) * 73856093 ^ (cy + b) * 19349663);
        if (!bk) continue;
        for (const q of bk) { const dx = X - RX.g.x[q], dy = Y - RX.g.y[q]; if (dx * dx + dy * dy < d2) return false; }
      }
      return true;
    }
    // distanza con segno dalla pista (> 0 a sinistra di chi guida): al mare l'acqua è sempre a destra
    function sdist(x, y) {
      let nr = P.nearest(RX.g, x, y);
      if (nr.i < 0) {
        // lontano dalla pista (oltre ~40 m): punto più vicino tra quelli ogni 8 m
        let best = 1e18, bi = 0;
        for (let i = 0; i <= RX.g.N; i += 8) { const dd = (x - RX.g.x[i]) ** 2 + (y - RX.g.y[i]) ** 2; if (dd < best) { best = dd; bi = i; } }
        nr = { i: bi, dist: Math.sqrt(best) };
      }
      const th = RX.g.th[nr.i], cx = x - RX.g.x[nr.i], cy = y - RX.g.y[nr.i];
      return (-Math.sin(th) * cx + Math.cos(th) * cy) >= 0 ? nr.dist : -nr.dist;
    }
    // memoria su una griglia fissa del mondo (passo 12 m) per il terreno che segue la camera
    const SD = new Map();
    function sdGrid(x, y) {
      const k = Math.round(x / 12) * 100003 + Math.round(y / 12);
      let v = SD.get(k);
      if (v === undefined) { v = sdist(x, y); SD.set(k, v); }
      return v;
    }
    function shapeH(h, sd) {
      if (!RX.isSea) return h;
      if (sd < 0) return h + (RX.SEA_Y - 2.4 - h) * smooth(13, 30, -sd);
      return h + 7 * smooth(16, 36, sd);
    }
    // vicino alla strada (entro 13 m) la spiaggia e la scogliera non cambiano la quota: niente ricerca della distanza
    const groundH = (x, y, sd) => shapeH(P.height(RX.g, x, y), RX.isSea ? (sd === undefined ? (clearPt(x, y, 13) ? sdist(x, y) : 0) : sd) : 0) - creek(x, y) - 0.14;
    // strada: colline + ponti un po' rialzati + curve paraboliche (l'esterno più alto)
    function roadH(sv, d, x, y) {
      let h = P.height(RX.g, x, y);
      for (const b of RX.g.bridges) if (sv > b.s0 - 5 && sv < b.s1 + 5) h += 0.3 * Math.min(1, Math.min(sv - (b.s0 - 5), b.s1 + 5 - sv) / 4);
      return h - P.bankAt(RX.g, sv) * d;
    }
    // da piano della logica (x, y) a three (x, h, −y)
    const V3 = (x, h, y) => new T.Vector3(x, h, -y);

    /* ---------- scena ---------- */
    function buildWorld() {
      if (RX.VI) { inView(0, buildWorld); return; }
      disposeWorld();
      readTheme();
      geos();
      RX.cfg = P.config(RX.s.level);
      const night = RX.N.night || 0, dark = night >= 1;
      RX.isSea = RX.cfg.theme === 'sea';
      RX.SEA_Y = -(RX.g.hill.A) - 1.1;
      const scene = new T.Scene();
      RX.R3.scene = scene;
      RX.R3.night = night; RX.R3.lit = night >= 0.5;
      const skyTop = dark ? RX.C['nsky-1'] : RX.C['sky-1'], skyLow = dark ? RX.C['nsky-2'] : RX.C['sky-2'];
      const fogFar = (dark ? 150 : night > 0 ? 205 : 235) - RX.cfg.fog * 70;
      scene.fog = new T.Fog(skyLow.clone(), dark ? 12 : 30, fogFar);
      scene.background = skyLow.clone();
      RX.R3.camera.far = 900; RX.R3.camera.updateProjectionMatrix();
      RX.R3.fogFar = fogFar;
      RX.R3.inkMat = basic({ color: RX.C.ink, side: T.BackSide });
      RX.R3.vc = toon({ vertexColors: true });
      RX.R3.anim = [];
      // luci
      const hemi = new T.HemisphereLight(skyTop, RX.C.grass, dark ? RX.N.namb : RX.N.amb);
      const sun = new T.DirectionalLight(dark ? RX.C.nsun : RX.C.sun, dark ? RX.N.nsunI : RX.N.sunI);
      scene.add(hemi, sun, sun.target);
      RX.R3.sun = sun; RX.R3.sunDir = new T.Vector3(0.5, dark ? 0.7 : RX.N.sunH || 0.9, -0.35).normalize();
      buildSky(skyTop, skyLow, dark);
      // fari (notte e tramonto)
      RX.R3.head = null;
      if (night > 0) {
        const sl = new T.SpotLight(RX.C.head, 3.4 * night, 95, 0.62, 0.6, 0);
        sl.position.set(0, -0.3, -0.5);
        sl.target.position.set(0, -2.5, -30);
        RX.R3.camera.add(sl, sl.target);
        RX.R3.head = sl;
      }
      scene.add(RX.R3.camera);
      // schermo diviso: la camera della seconda vista (porta i fari quando si disegna quella vista)
      for (const v of RX.views) if (v.cam && v.cam !== RX.R3.camera) { v.cam.far = 900; v.cam.updateProjectionMatrix(); scene.add(v.cam); }
      // ponti: dati per il ruscello (e i canali in città, le insenature al mare)
      SD.clear();
      RX.BR = RX.g.bridges.map((b) => { const m = (b.s0 + b.s1) / 2, w = P.world(RX.g, m); return { x: w.x, y: w.y, tx: Math.cos(w.th), ty: Math.sin(w.th), m, th: w.th }; });
      buildGlow();
      buildGround();
      if (split()) { const g0 = RX.R3.ground; buildGround(); RX.views[1].ground = RX.R3.ground; RX.R3.ground = g0; }
      if (RX.isSea) {
        // il mare: un piano che segue la camera, sotto il livello della strada
        const sea = new T.Mesh(RX.GEO.plane, toon({ color: RX.C.sea }));
        sea.rotation.x = -Math.PI / 2; sea.scale.set(1100, 1100, 1); sea.position.y = RX.SEA_Y;
        scene.add(sea); RX.R3.sea = sea;
      } else RX.R3.sea = null;
      RX.R3.chunks = [];
      for (let a = 0; a < RX.g.N - 2; a += 120) RX.R3.chunks.push({ a, b: Math.min(RX.g.N, a + 120), grp: null });
      RX.R3.built = 0;
      RX.TGc = null;
      RX.buildKarts();
      RX.buildHood();
      RX.buildFx();
      RX.buildItems();
      RX.buildGulls();
      // primi blocchi subito (la partenza si vede intera)
      for (let i = 0; i < Math.min(3, RX.R3.chunks.length); i++) RX.buildChunk(RX.R3.chunks[i]);
      RX.hdgS = null;
      for (const v of RX.views) v.hdgS = null;
    }
    // cielo: cupola sfumata, sole o luna, nuvole, profilo lontano (colline, città, isole o montagne), stelle di notte
    function buildSky(skyTop, skyLow, dark) {
      const sky = new T.Group();
      const dome = new T.SphereGeometry(520, 24, 12);
      const dc = new Float32Array(dome.attributes.position.count * 3);
      for (let i = 0; i < dome.attributes.position.count; i++) {
        const yy = dome.attributes.position.getY(i) / 520, k2 = Math.max(0, Math.min(1, (yy + 0.05) / 0.6));
        const c = skyLow.clone().lerp(skyTop, k2);
        dc[i * 3] = c.r; dc[i * 3 + 1] = c.g; dc[i * 3 + 2] = c.b;
      }
      dome.setAttribute('color', new T.BufferAttribute(dc, 3)); keep(dome);
      sky.add(new T.Mesh(dome, basic({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })));
      const sunM = new T.Mesh(RX.GEO.sph2, basic({ color: dark ? RX.C.nsun : RX.C.sun, fog: false }));
      sunM.position.copy(RX.R3.sunDir).multiplyScalar(470); sunM.scale.setScalar(dark ? 12 : 16);
      sky.add(sunM);
      const hr = HH.rng((RX.s.seed ^ 0x51ed) >>> 0), th = RX.cfg.theme;
      // profilo lontano: anello frastagliato (colline, palazzi, isole basse, montagne con la neve in cima)
      {
        const n = 96, pos = [], cap = [], hillC = dark ? RX.C.nhill : RX.C.hill;
        let bh = 30;
        const H = [];
        for (let i = 0; i <= n; i++) {
          if (th === 'city') { if (i % 2 === 0) bh = 18 + hr() * 46; H.push(bh); }
          else if (th === 'sea') H.push(Math.max(0, 4 + 22 * Math.sin(i * 0.31 + hr() * 0.3) * Math.sin(i * 0.07)) + hr() * 2);
          else if (th === 'snow') H.push(34 + 80 * Math.abs(((i * 0.37) % 2) - 1) + hr() * 8);
          else H.push(26 + 40 * Math.abs(Math.sin(i * 0.7 + hr() * 0.4)) + hr() * 10);
        }
        H[n] = H[0];
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, r = 470;
          const h0 = H[i], h1 = th === 'city' ? H[i] : H[i + 1];
          const P0b = [Math.cos(a0) * r, -30, Math.sin(a0) * r], P1b = [Math.cos(a1) * r, -30, Math.sin(a1) * r];
          pos.push(...P0b, P0b[0], h0, P0b[2], ...P1b, ...P1b, P0b[0], h0, P0b[2], P1b[0], h1, P1b[2]);
          if (th === 'snow' && (h0 > 80 || h1 > 80)) {
            const r2 = 468, c0 = [Math.cos(a0) * r2, Math.sin(a0) * r2], c1 = [Math.cos(a1) * r2, Math.sin(a1) * r2];
            const b0 = Math.max(60, h0 - 22), b1 = Math.max(60, h1 - 22);
            cap.push(c0[0], Math.min(b0, h0), c0[1], c0[0], h0, c0[1], c1[0], Math.min(b1, h1), c1[1], c1[0], Math.min(b1, h1), c1[1], c0[0], h0, c0[1], c1[0], h1, c1[1]);
          }
        }
        const hg = keep(new T.BufferGeometry()); hg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        sky.add(new T.Mesh(hg, basic({ color: hillC, fog: false, side: T.DoubleSide, depthWrite: false })));
        if (cap.length) {
          const cg = keep(new T.BufferGeometry()); cg.setAttribute('position', new T.Float32BufferAttribute(cap, 3));
          sky.add(new T.Mesh(cg, basic({ color: dark ? RX.C.nhill.clone().lerp(RX.C.snowbank, 0.5) : RX.C.snowbank, fog: false, side: T.DoubleSide, depthWrite: false })));
        }
      }
      if (!dark) {
        const cm = basic({ color: RX.C.cloud, fog: false });
        for (let i = 0; i < 7; i++) {
          const a = hr() * Math.PI * 2, r = 380 + hr() * 50, cy = 95 + hr() * 70, grp = new T.Group();
          for (let j = 0; j < 4; j++) { const b = new T.Mesh(RX.GEO.sph, cm); b.position.set((j - 1.5) * 16 + hr() * 6, hr() * 6, hr() * 8); b.scale.set(16 + hr() * 8, 9 + hr() * 4, 12); grp.add(b); }
          grp.position.set(Math.cos(a) * r, cy, Math.sin(a) * r); grp.lookAt(0, cy, 0);
          sky.add(grp);
        }
      } else {
        const sp = [];
        for (let i = 0; i < 380; i++) { const a = hr() * Math.PI * 2, e = 0.12 + hr() * 1.3, r = 480; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
        const sg = keep(new T.BufferGeometry()); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        sky.add(new T.Points(sg, keep(new T.PointsMaterial({ color: RX.C.nsun, size: 2.2, sizeAttenuation: false, fog: false }))));
      }
      sky.renderOrder = -10;
      sky.traverse((m) => { m.renderOrder = -10; });
      RX.R3.scene.add(sky);
      RX.R3.sky = sky;
    }
    function disposeWorld() {
      if (!RX.R3 || !RX.R3.scene) return;
      RX.R3.disp.forEach((x) => { try { x.dispose(); } catch (e) { /* già liberato */ } });
      RX.R3.disp = [];
      RX.GEO = null; RX.TGc = null;
      if (RX.R3.head) { RX.R3.camera.remove(RX.R3.head, RX.R3.head.target); RX.R3.head = null; }
      if (RX.R3.hood) RX.R3.camera.remove(RX.R3.hood);
      RX.R3.scene = null;
    }

    /* terreno: griglia che segue la camera, alte dalla funzione del terreno (al mare con spiaggia e scogliere) */
    function buildGround() {
      const n = 64, cell = 6, geo = keep(new T.PlaneGeometry(n * cell, n * cell, n, n));
      geo.rotateX(-Math.PI / 2);
      const col = new Float32Array(geo.attributes.position.count * 3);
      geo.setAttribute('color', new T.BufferAttribute(col, 3));
      const m = new T.Mesh(geo, RX.R3.vc);
      m.frustumCulled = false;
      RX.R3.scene.add(m);
      RX.R3.ground = { m, n, cell, cx: 1e9, cy: 1e9, sd: new Float32Array((n / 2 + 1) * (n / 2 + 1)) };
    }
    function updateGround(x, y) {
      const G0 = RX.R3.ground, cx = Math.round(x / G0.cell / 4) * 4, cy = Math.round(y / G0.cell / 4) * 4;
      if (cx === G0.cx && cy === G0.cy) return;
      G0.cx = cx; G0.cy = cy;
      const pa = G0.m.geometry.attributes.position, ca = G0.m.geometry.attributes.color, half = (G0.n * G0.cell) / 2, n1 = G0.n + 1;
      const c1 = RX.C.grass, c2 = RX.C['grass-2'];
      // al mare: distanza con segno su una griglia a passo doppio, interpolata (4 volte meno ricerche)
      if (RX.isSea) {
        const m2 = G0.n / 2 + 1;
        for (let j = 0; j < m2; j++) for (let i = 0; i < m2; i++) {
          const wx = cx * G0.cell - half + i * 2 * G0.cell, wy = cy * G0.cell + half - j * 2 * G0.cell;
          G0.sd[j * m2 + i] = sdGrid(wx, wy);
        }
      }
      const tmp = new T.Color();
      for (let i = 0; i < pa.count; i++) {
        const ix = i % n1, iy = Math.floor(i / n1);
        const wx = cx * G0.cell - half + ix * G0.cell, wy = cy * G0.cell + half - iy * G0.cell;
        let sd = 0;
        if (RX.isSea) {
          const m2 = G0.n / 2 + 1, fx = ix / 2, fy = iy / 2, i0 = Math.min(m2 - 2, Math.floor(fx)), j0 = Math.min(m2 - 2, Math.floor(fy)), u = fx - i0, v = fy - j0;
          const q = G0.sd;
          sd = (q[j0 * m2 + i0] * (1 - u) + q[j0 * m2 + i0 + 1] * u) * (1 - v) + (q[(j0 + 1) * m2 + i0] * (1 - u) + q[(j0 + 1) * m2 + i0 + 1] * u) * v;
        }
        const h = groundH(wx, wy, sd);
        pa.setXYZ(i, wx, h, -wy);
        const hsh = Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453, f = hsh - Math.floor(hsh);
        let c = f < 0.5 ? c1 : c2;
        if (RX.isSea) {
          if ((sd < 0 && -sd > RX.g.wall - 1) || Math.abs(sd) < P.HALF + 2) c = h < RX.SEA_Y + 0.4 ? RX.C['sand-2'] : f < 0.5 ? RX.C.sand : RX.C['sand-2'];
          else if (sd > 18) c = tmp.copy(f < 0.5 ? RX.C.cliff : RX.C['cliff-2']).lerp(c, Math.max(0, 1 - smooth(18, 30, sd)));
        }
        ca.setXYZ(i, c.r, c.g, c.b);
      }
      pa.needsUpdate = true; ca.needsUpdate = true;
      G0.m.geometry.computeVertexNormals();
      G0.m.geometry.computeBoundingSphere();
    }

    /* ---------- luci notturne: aloni (sprite) e pozze di luce sulla strada ---------- */
    function buildGlow() {
      const cvs = document.createElement('canvas'); cvs.width = cvs.height = 64;
      const c2 = cvs.getContext('2d'), gr = c2.createRadialGradient(32, 32, 1, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const tex = keep(new T.CanvasTexture(cvs));
      RX.R3.glowTex = tex;
      RX.R3.haloMat = keep(new T.PointsMaterial({ size: 2.4, map: tex, color: RX.C.glow, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
      RX.R3.poolMat = basic({ map: tex, color: RX.C.glow, transparent: true, opacity: 0.3, depthWrite: false, blending: T.AdditiveBlending });
      RX.R3.bulbMat = basic({ color: RX.R3.lit ? RX.C.bulb : RX.C['sky-2'] });
      RX.R3.winMat = basic({ color: 0xffffff, side: T.DoubleSide });
    }

    return { initGL, prMax, keep, toon, basic, M4, base, merge, meshOf, clearPt, sdist, groundH, roadH, V3,
      buildWorld, disposeWorld, updateGround };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
