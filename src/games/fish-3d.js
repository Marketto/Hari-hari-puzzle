/* Hari Fishing — 3D di base e scena di superficie: renderer, materiali toon e contorni, geometria statica fusa, acqua, lago, mare, pontile, Hari, canna e lenza.
 * Parte di fish-ui.js (stesso create()): si carica prima e fish-ui.js la monta con HH.fish3d(FX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // FX = contesto condiviso con fish-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.fish3d = function (FX) {
    const { clamp, COLS, NUMS, T, pause } = FX;
    /* ---------- 3D: renderer, materiali ---------- */

    function readTheme() {
      const cs = G.getComputedStyle(FX.wrap);
      const raw = COLS.map((k) => cs.getPropertyValue('--fsh-' + k).trim()).concat(NUMS.map((k) => cs.getPropertyValue('--fsh-' + k).trim()));
      const key = raw.join('|');
      if (key === FX.themeKey) return false;
      FX.themeKey = key; FX.C = {}; FX.N = {};
      COLS.forEach((k, i) => { const c = new T.Color(); try { c.setStyle(raw[i] || '#ff00ff'); } catch (e) { c.set(0xff00ff); } FX.C[k] = c; });
      NUMS.forEach((k, i) => { FX.N[k] = parseFloat(raw[COLS.length + i]) || 0; });
      return true;
    }
    const prMax = () => 1.5;
    function initGL() {
      if (FX.R3) return true;
      if (!T) { FX.glErr = true; return false; }
      let renderer;
      try { renderer = new T.WebGLRenderer({ canvas: FX.cv, antialias: (G.devicePixelRatio || 1) < 2, powerPreference: 'default' }); } catch (e) { FX.glErr = true; return false; }
      FX.pr = Math.min(prMax(), G.devicePixelRatio || 1);
      renderer.setPixelRatio(FX.pr);
      // rampa del cel shading: 4 gradini
      const grad = new T.DataTexture(new Uint8Array([96, 96, 96, 255, 156, 156, 156, 255, 212, 212, 212, 255, 255, 255, 255, 255]), 4, 1, T.RGBAFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
      const camera = new T.PerspectiveCamera(56, 1, 0.1, 900);
      FX.R3 = { renderer, camera, grad, scene: null, disp: [], mats: {}, ols: {} };
      FX.cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); }, false);
      return true;
    }
    const keep = (x) => { FX.R3.disp.push(x); return x; };
    function toon(c) {
      const k = 't' + c.getHexString();
      if (FX.R3.mats[k]) return FX.R3.mats[k];
      const m = (FX.R3.mats[k] = keep(new T.MeshToonMaterial({ color: c, gradientMap: FX.R3.grad })));
      m.userData.bake = true;
      return m;
    }
    function basic(c, extra) { return keep(new T.MeshBasicMaterial(Object.assign({ color: c }, extra || {}))); }
    // contorno a guscio rovesciato: la geometria gonfiata lungo le normali di th metri, solo facce posteriori
    function outline(th) {
      const k = th.toFixed(3);
      if (FX.R3.ols[k]) return FX.R3.ols[k];
      const m = keep(new T.ShaderMaterial({
        uniforms: { uC: { value: FX.C.ink.clone() }, uTh: { value: th } },
        // spessore in metri veri anche su geometrie unitarie scalate: si gonfia nello spazio della camera
        // (anche per le InstancedMesh: i banchi di pesciolini)
        vertexShader: 'uniform float uTh; void main(){ vec4 lp = vec4(position, 1.0); vec3 n = normal;\n#ifdef USE_INSTANCING\nlp = instanceMatrix * lp; n = mat3(instanceMatrix) * n;\n#endif\nvec4 mv = modelViewMatrix * lp; mv.xyz += normalize(normalMatrix * n) * uTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      }));
      m.userData.ol = th;
      FX.R3.ols[k] = m;
      return m;
    }
    /* ---- geometria statica fusa: meno draw call ----
     * bake(radice, tutto): le mesh "toon" sotto la radice (e i loro contorni) diventano UNA mesh con i colori nei vertici
     * + UNA mesh di contorno con lo spessore nei vertici (attributo aTh). I gruppi figli restano separati (si animano) e
     * vengono fusi a loro volta, salvo quelli marcati userData.fixed (fermi rispetto al genitore) o tutto = true (scena
     * statica). Le mesh marcate userData.dyn (scalate o ruotate da sole) restano come sono. Niente BufferGeometryUtils
     * nella copia locale di three: la fusione è scritta qui (posizioni e normali trasformate, indici spostati). */
    function vcToon() {
      return FX.R3.mats.vc || (FX.R3.mats.vc = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: FX.R3.grad })));
    }
    function olBaked() {
      return FX.R3.mats.olb || (FX.R3.mats.olb = keep(new T.ShaderMaterial({
        uniforms: { uC: { value: FX.C.ink.clone() } },
        vertexShader: 'attribute float aTh; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz += normalize(normalMatrix * normal) * aTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      })));
    }
    const BK = {};
    function mergeTo(list, inv, ol) {
      if (!BK.m) { BK.m = new T.Matrix4(); BK.n = new T.Matrix3(); BK.v = new T.Vector3(); }
      let nv = 0, ni = 0;
      for (const m of list) { const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), X = new Float32Array(ol ? nv : nv * 3);
      const I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      // pesci: aSw = (tipo di parte, cerniera) per il nuoto nel vertex shader; aMix = pancia (colore 2 della mesh)
      const swOf = (m) => m.userData.sw || (ol && m.parent && m.parent.userData.sw) || null;
      const A = list.some(swOf) ? new Float32Array(nv * 4) : null;
      let vo = 0, io = 0;
      for (const m of list) {
        const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, cnt = pa.count;
        BK.m.multiplyMatrices(inv, m.matrixWorld); BK.n.getNormalMatrix(BK.m);
        const col = ol ? null : m.material.color, th = ol ? m.material.userData.ol : 0;
        const c2 = !ol && m.userData.c2 && g.attributes.aMix ? m.userData.c2 : null, mx = c2 && g.attributes.aMix;
        const sw = A && swOf(m);
        for (let i = 0; i < cnt; i++) {
          BK.v.fromBufferAttribute(pa, i).applyMatrix4(BK.m); P[(vo + i) * 3] = BK.v.x; P[(vo + i) * 3 + 1] = BK.v.y; P[(vo + i) * 3 + 2] = BK.v.z;
          BK.v.fromBufferAttribute(na, i).applyMatrix3(BK.n).normalize(); Nn[(vo + i) * 3] = BK.v.x; Nn[(vo + i) * 3 + 1] = BK.v.y; Nn[(vo + i) * 3 + 2] = BK.v.z;
          if (ol) X[vo + i] = th;
          else if (c2) { const k = mx.getX(i); X[(vo + i) * 3] = col.r + (c2.r - col.r) * k; X[(vo + i) * 3 + 1] = col.g + (c2.g - col.g) * k; X[(vo + i) * 3 + 2] = col.b + (c2.b - col.b) * k; }
          else { X[(vo + i) * 3] = col.r; X[(vo + i) * 3 + 1] = col.g; X[(vo + i) * 3 + 2] = col.b; }
          if (sw) { A[(vo + i) * 4] = sw[0]; A[(vo + i) * 4 + 1] = sw[1]; A[(vo + i) * 4 + 2] = sw[2]; A[(vo + i) * 4 + 3] = sw[3]; }
        }
        if (g.index) for (let i = 0; i < g.index.count; i++) I[io + i] = g.index.getX(i) + vo;
        else for (let i = 0; i < cnt; i++) I[io + i] = i + vo;
        io += g.index ? g.index.count : cnt; vo += cnt;
      }
      const geo = keep(new T.BufferGeometry());
      geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(Nn, 3));
      geo.setAttribute(ol ? 'aTh' : 'color', new T.BufferAttribute(X, ol ? 1 : 3)); geo.setIndex(new T.BufferAttribute(I, 1));
      if (A) geo.setAttribute('aSw', new T.BufferAttribute(A, 4));
      geo.computeBoundingSphere();
      return new T.Mesh(geo, ol ? olBaked() : vcToon());
    }
    function bake(root, all) {
      root.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(root.matrixWorld).invert();
      const solid = [], lines = [], subs = [];
      const visit = (o) => {
        for (const c of o.children.slice()) {
          if (c.isMesh) {
            const mu = c.material && c.material.userData;
            if (mu && mu.bake && !c.userData.dyn && !c.isInstancedMesh) {
              solid.push(c);
              for (const h of c.children) if (h.isMesh && h.material.userData && h.material.userData.ol != null) lines.push(h);
              visit(c);
            } else if (c.children.length) subs.push(c);
          } else if (!c.isLight && c.children.length) { if (all || c.userData.fixed) visit(c); else subs.push(c); }
        }
      };
      visit(root);
      if (solid.length > 1 || lines.length > 1) {
        root.add(mergeTo(solid, inv, false));
        if (lines.length) root.add(mergeTo(lines, inv, true));
        for (const m of solid) if (m.parent) m.parent.remove(m);
      }
      for (const x of subs) bake(x, false);
      return root;
    }
    // mesh toon (+ contorno) in un genitore: o = { p: [x,y,z], r: [x,y,z], s: [x,y,z] | n, ol: spessore }
    function mesh(geo, color, parent, o2 = {}) {
      const m = new T.Mesh(geo, color && color.isMaterial ? color : toon(color));
      if (o2.p) m.position.set(...o2.p);
      if (o2.r) m.rotation.set(...o2.r);
      if (o2.s != null) { if (typeof o2.s === 'number') m.scale.setScalar(o2.s); else m.scale.set(...o2.s); }
      if (o2.ol) { const h = new T.Mesh(geo, outline(o2.ol)); m.add(h); }
      if (parent) parent.add(m);
      return m;
    }
    const GEO = {};
    function geos() {
      if (GEO.ok) return;
      const g = (k, x) => { GEO[k] = keep(x); };
      g('sph', new T.SphereGeometry(1, 20, 14));
      g('sphLo', new T.SphereGeometry(1, 12, 8));
      g('hemi', new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
      g('cone', new T.ConeGeometry(1, 1, 8));
      g('cone6', new T.ConeGeometry(1, 1, 6));
      g('cyl', new T.CylinderGeometry(1, 1, 1, 14));
      g('cyl8', new T.CylinderGeometry(1, 1, 1, 8));
      g('box', new T.BoxGeometry(1, 1, 1));
      g('disc', new T.CircleGeometry(1, 24).rotateX(-Math.PI / 2));
      g('ring', new T.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2));
      g('drop', new T.SphereGeometry(1, 6, 4));
      GEO.ok = true;
    }

    /* ---------- 3D: la scena ---------- */
    const HARI = { x: -0.35, y: 0.47, z: 0.2 };
    function disposeScene() {
      if (!FX.R3 || !FX.R3.scene) return;
      FX.R3.disp.forEach((x) => { try { x.dispose(); } catch (e) { /* già fatto */ } });
      FX.R3.disp = []; FX.R3.mats = {}; FX.R3.ols = {};
      for (const k in GEO) delete GEO[k];
      FX.R3.scene = null;
    }
    function buildScene() {
      disposeScene();
      geos();
      const night = FX.N.night >= 0.5;
      const scene = new T.Scene();
      FX.R3.scene = scene; FX.R3.night = night;
      scene.fog = new T.Fog(FX.C['sky-2'].clone(), 45, 300);
      scene.background = FX.C['sky-2'].clone();
      scene.add(new T.HemisphereLight(FX.C['sky-1'], FX.C.hill, FX.N.amb || 1.4));
      const sun = new T.DirectionalLight(FX.C.sun, FX.N.sunI || 1.5);
      sun.position.set(-6, 10, 8); scene.add(sun);
      FX.R3.lamp = null;
      // cielo: cupola a sfumatura (colori nei vertici)
      {
        const dome = keep(new T.SphereGeometry(420, 24, 12));
        const pos = dome.attributes.position, col = [];
        for (let i = 0; i < pos.count; i++) { const k = clamp(pos.getY(i) / 260, 0, 1); const c = FX.C['sky-2'].clone().lerp(FX.C['sky-1'], Math.pow(k, 0.7)); col.push(c.r, c.g, c.b); }
        dome.setAttribute('color', new T.Float32BufferAttribute(col, 3));
        scene.add(new T.Mesh(dome, basic(0xffffff, { vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })));
      }
      // sole o luna (di sera con le stelle)
      const orb = mesh(GEO.disc, basic(FX.C.sun, { fog: false }), scene, { p: [70, 85, -330], s: night ? 13 : 18 });
      orb.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      if (night) {
        mesh(GEO.disc, basic(FX.C['sky-2'], { fog: false }), orb, { p: [0.28, 0.01, -0.22], s: 0.8 });
        const n = 160, pts = [], r = HH.rng(11);
        for (let i = 0; i < n; i++) { const a = r() * Math.PI - Math.PI / 2 - Math.PI / 2, e = 0.12 + r() * 1.2; pts.push(Math.cos(a) * Math.cos(e) * 380, Math.sin(e) * 380, Math.sin(a) * Math.cos(e) * 380); }
        const sg = keep(new T.BufferGeometry()); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
        scene.add(new T.Points(sg, keep(new T.PointsMaterial({ color: FX.C.sun, size: 2.2, sizeAttenuation: false, fog: false }))));
        // lanterna sul pontile
        const lamp = new T.PointLight(FX.C.lamp, 2.4, 12, 1.4);
        lamp.position.set(-1.0, 1.9, 0.35); scene.add(lamp); FX.R3.lamp = lamp;
      }
      // nuvole
      FX.R3.clouds = [];
      const rc = HH.rng(5);
      for (let i = 0; i < 6; i++) {
        const gC = new T.Group();
        const n = 3 + Math.floor(rc() * 2);
        for (let j = 0; j < n; j++) mesh(GEO.sphLo, FX.C.cloud, gC, { p: [j * 7 - n * 3.5, (j % 2) * 2, 0], s: [6 + rc() * 3, 4 + rc() * 2, 4], ol: 0.12 });
        gC.position.set(-160 + i * 60 + rc() * 20, 45 + rc() * 30, -230 - rc() * 60);
        scene.add(gC); FX.R3.clouds.push(gC);
      }
      buildWater(scene);
      if (FX.cfg.stage === 'sea') buildSea(scene); else buildLake(scene);
      buildDock(scene);
      buildHari(scene);
      buildTackle(scene);
      FX.R3.fishes = {};
      FX.R3.held = null; FX.R3.jump = null; FX.R3.rel = null;
      FX.R3.drops = []; for (let i = 0; i < 28; i++) { const d = mesh(GEO.drop, FX.C.foam, scene, { s: 0.06 }); d.visible = false; FX.R3.drops.push({ m: d, v: new T.Vector3(), life: 0 }); }
      FX.R3.rings = []; for (let i = 0; i < 6; i++) { const m = mesh(GEO.ring, basic(FX.C.foam, { transparent: true, opacity: 0, depthWrite: false }), scene); m.visible = false; FX.R3.rings.push({ m, life: 0, max: 1 }); }
      if (FX.tagsEl) { FX.tagsEl.innerHTML = ''; }
      FX.buildUW();
    }
    // acqua stilizzata: bande di colore a gradini, strisce di luce, onde e cerchi attorno al galleggiante, nebbia
    function buildWater(scene) {
      const geo = keep(new T.PlaneGeometry(520, 420, 60, 48).rotateX(-Math.PI / 2));
      geo.translate(0, 0, -170);
      const U = {
        uT: { value: 0 }, uA: { value: FX.C.water.clone() }, uB: { value: FX.C['water-2'].clone() }, uD: { value: FX.C['water-3'].clone() }, uF: { value: FX.C.foam.clone() },
        uFog: { value: FX.C['sky-2'].clone() }, uBob: { value: new T.Vector3(0, 0, -8) }, uRip: { value: 0 }, uFish: { value: new T.Vector3(0, 0, -8) }, uWake: { value: 0 },
      };
      const mat = keep(new T.ShaderMaterial({
        uniforms: U,
        vertexShader: `uniform float uT; varying vec3 vW; varying float vD;
          void main(){ vec3 p = position; float w = sin(p.x * .32 + uT * 1.3) * .05 + sin(p.z * .45 - uT * 1.1) * .06; p.y += w * smoothstep(1.5, 6., length(p.xz - vec2(-.35, .2)));
            vec4 wp = modelMatrix * vec4(p, 1.); vW = wp.xyz; vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uT, uRip, uWake; uniform vec3 uA, uB, uD, uF, uFog, uBob, uFish; varying vec3 vW; varying float vD;
          void main(){
            float far = smoothstep(8., 120., vD);
            vec3 c = mix(uA, uD, step(.5, far) * .6 + step(.85, far) * .4);
            float n = sin(vW.x * .38 + uT * .6 + sin(vW.z * .21) * 2.) + sin(vW.z * .52 - uT * .5) * .8 + sin((vW.x - vW.z) * 1.4 + uT * 1.5) * .25;
            float band = step(1.25 + far * .35, n);
            c = mix(c, uB, band * (1. - far * .7));
            float sp = step(1.62, n + sin(vW.x * 2.3 + uT * 2.2) * .35) * (1. - far);
            c = mix(c, uF, sp * .55);
            float d = length(vW.xz - uBob.xz);
            float ring = step(.75, sin(d * 7. - uT * 6.) ) * smoothstep(2.4, .4, d) * uRip;
            c = mix(c, uF, ring * .8);
            float df = length(vW.xz - uFish.xz);
            c = mix(c, uF, step(.8, sin(df * 9. - uT * 9.)) * smoothstep(1.6, .3, df) * uWake * .7);
            float pier = smoothstep(1.9, 1.2, abs(vW.x) ) * smoothstep(-.2, .6, vW.z) * smoothstep(7., 5.5, vW.z);
            c = mix(c, uD, pier * .35);
            float fog = smoothstep(45., 300., vD);
            gl_FragColor = vec4(mix(c, uFog, fog), 1.);
            #include <colorspace_fragment>
          }`,
      }));
      const w = new T.Mesh(geo, mat);
      scene.add(w);
      FX.R3.water = U;
    }
    const wave = (x, z, t) => Math.sin(x * 0.32 + t * 1.3) * 0.05 + Math.sin(z * 0.45 - t * 1.1) * 0.06;
    function tree(scene, x, z, k, pink) {
      const gT = new T.Group();
      mesh(GEO.cyl8, FX.C.trunk, gT, { p: [0, 1.2 * k, 0], s: [0.35 * k, 2.4 * k, 0.35 * k], ol: 0.05 });
      if (pink) { mesh(GEO.sphLo, FX.C['tree-2'], gT, { p: [0, 3.4 * k, 0], s: 1.9 * k, ol: 0.1 }); mesh(GEO.sphLo, FX.C['tree-2'], gT, { p: [1.1 * k, 2.8 * k, 0.3 * k], s: 1.2 * k, ol: 0.08 }); }
      else { mesh(GEO.cone6, FX.C.tree, gT, { p: [0, 3.3 * k, 0], s: [1.7 * k, 3.2 * k, 1.7 * k], ol: 0.1 }); mesh(GEO.cone6, FX.C.tree, gT, { p: [0, 4.6 * k, 0], s: [1.2 * k, 2.4 * k, 1.2 * k], ol: 0.08 }); }
      gT.position.set(x, 0, z); scene.add(gT);
    }
    function buildLake(scene) {
      const r = HH.rng(FX.cfg.level * 31 + 7);
      // colline sulla riva lontana
      for (let i = 0; i < 9; i++) {
        const x = -170 + i * 42 + r() * 16, rr = 26 + r() * 22;
        mesh(GEO.hemi, i % 2 ? FX.C['hill-2'] : FX.C.hill, scene, { p: [x, -2, -150 - r() * 30], s: [rr * 1.4, rr * 0.7, rr], ol: 0.5 });
      }
      // rive laterali con alberi, rocce
      [-1, 1].forEach((sd) => {
        mesh(GEO.box, FX.C.hill, scene, { p: [sd * 46, -0.6, -60], s: [50, 1.6, 150] });
        mesh(GEO.box, FX.C.sand, scene, { p: [sd * 21.5, -0.5, -60], s: [2, 1.2, 150] });
        for (let i = 0; i < 9; i++) tree(scene, sd * (25 + r() * 18), -8 - i * 14 - r() * 6, 0.8 + r() * 0.6, r() < 0.35);
        for (let i = 0; i < 4; i++) mesh(GEO.sphLo, FX.C.rock, scene, { p: [sd * (20 + r() * 3), 0, -12 - i * 24 - r() * 8], s: [1.2 + r(), 0.7 + r() * 0.5, 1 + r()], ol: 0.06 });
      });
      // canne palustri e ninfee vicino al pontile
      [[-4.6, -3], [4.4, -5], [-6.5, -9], [6, -1.5]].forEach(([x, z], i) => {
        for (let j = 0; j < 5; j++) mesh(GEO.cyl8, FX.C.reed, scene, { p: [x + (j - 2) * 0.16, 0.35 + (j % 2) * 0.1, z + (j % 3) * 0.12], s: [0.035, 0.75 + (j % 3) * 0.2, 0.035], r: [0, 0, (j - 2) * 0.08], ol: 0.015 });
        const lp = mesh(GEO.cyl, FX.C.lily, scene, { p: [x + 1.2, 0.03, z - 0.8], s: [0.55, 0.04, 0.55], ol: 0.02 });
        if (i % 2 === 0) mesh(GEO.sphLo, FX.C.flower, lp, { p: [0.2, 3, 0], s: [0.35, 4, 0.35] });
      });
    }
    function buildSea(scene) {
      const r = HH.rng(FX.cfg.level * 17 + 3);
      // isoletta col faro e qualche palma, scogli
      const isl = new T.Group();
      mesh(GEO.hemi, FX.C['hill-2'], isl, { s: [26, 6, 16], ol: 0.4 });
      mesh(GEO.hemi, FX.C.hill, isl, { p: [6, 4, 0], s: [12, 6, 9], ol: 0.3 });
      const tw = new T.Group(); tw.position.set(-10, 4, 0); isl.add(tw);
      for (let i = 0; i < 4; i++) mesh(GEO.cyl, i % 2 ? FX.C['tower-2'] : FX.C.tower, tw, { p: [0, 1.25 + i * 2.5, 0], s: [1.8 - i * 0.18, 2.5, 1.8 - i * 0.18], ol: 0.12 });
      mesh(GEO.cyl, FX.C.lamp, tw, { p: [0, 10.8, 0], s: [1.1, 1.4, 1.1], ol: 0.1 });
      mesh(GEO.cone, FX.C['tower-2'], tw, { p: [0, 12.2, 0], s: [1.5, 1.5, 1.5], ol: 0.1 });
      for (let i = 0; i < 3; i++) {
        const pg = new T.Group(); pg.position.set(4 + i * 5, 6, (i - 1) * 3); isl.add(pg);
        mesh(GEO.cyl8, FX.C.trunk, pg, { p: [0, 2.5, 0], s: [0.4, 5, 0.4], r: [0, 0, 0.12], ol: 0.06 });
        for (let j = 0; j < 5; j++) mesh(GEO.sphLo, FX.C.tree, pg, { p: [Math.cos(j * 1.25) * 1.6 + 0.4, 5 + 0.1, Math.sin(j * 1.25) * 1.6], s: [1.9, 0.35, 0.8], r: [0, -j * 1.25, -0.3], ol: 0.05 });
      }
      isl.position.set(-55, -1, -160); scene.add(isl);
      // boa che dondola
      const buoy = new T.Group();
      mesh(GEO.cyl, FX.C['tower-2'], buoy, { p: [0, 0.4, 0], s: [0.5, 0.8, 0.5], ol: 0.04 });
      mesh(GEO.cyl, FX.C.tower, buoy, { p: [0, 1, 0], s: [0.35, 0.4, 0.35], ol: 0.03 });
      mesh(GEO.cone, FX.C['tower-2'], buoy, { p: [0, 1.45, 0], s: [0.3, 0.5, 0.3], ol: 0.03 });
      buoy.position.set(9, 0, -24); scene.add(buoy); FX.R3.buoy = buoy;
      for (let i = 0; i < 6; i++) mesh(GEO.sphLo, FX.C.rock, scene, { p: [(r() < 0.5 ? -1 : 1) * (5 + r() * 9), -0.1, -2 - r() * 18], s: [0.8 + r(), 0.5 + r() * 0.6, 0.8 + r()], ol: 0.05 });
      // spiaggia a sinistra
      mesh(GEO.box, FX.C.sand, scene, { p: [-40, -0.5, -40], s: [40, 1.1, 120] });
    }
    function buildDock(scene) {
      const gD = new T.Group();
      for (let i = 0; i < 14; i++) mesh(GEO.box, i % 2 ? FX.C['wood-2'] : FX.C.wood, gD, { p: [0, 0.4, 7 - i * 0.5], s: [2.2, 0.1, 0.46], ol: 0.02 });
      [[-1.05, 0.0], [1.05, 0.0], [-1.05, 3.2], [1.05, 3.2], [-1.05, 6.4], [1.05, 6.4]].forEach(([x, z]) => mesh(GEO.cyl8, FX.C.post, gD, { p: [x, -0.2, z], s: [0.13, 1.4, 0.13], ol: 0.025 }));
      mesh(GEO.box, FX.C.post, gD, { p: [-1.05, 0.3, 3.4], s: [0.12, 0.12, 7.2] }); mesh(GEO.box, FX.C.post, gD, { p: [1.05, 0.3, 3.4], s: [0.12, 0.12, 7.2] });
      // secchiello e lanterna
      const bk = new T.Group(); bk.position.set(0.5, 0.45, 0.55); gD.add(bk);
      mesh(GEO.cyl, FX.C.bucket, bk, { p: [0, 0.18, 0], s: [0.2, 0.36, 0.2], ol: 0.02 });
      mesh(GEO.cyl, FX.C.water, bk, { p: [0, 0.34, 0], s: [0.17, 0.02, 0.17] });
      const lp = new T.Group(); lp.position.set(-1.0, 0.45, 0.35); gD.add(lp);
      mesh(GEO.cyl8, FX.C.post, lp, { p: [0, 0.7, 0], s: [0.06, 1.4, 0.06], ol: 0.02 });
      mesh(GEO.box, FX.C.lamp, lp, { p: [0, 1.45, 0], s: [0.22, 0.28, 0.22], ol: 0.025 });
      mesh(GEO.cone, FX.C.band, lp, { p: [0, 1.66, 0], s: [0.2, 0.16, 0.2], ol: 0.02 });
      if (FX.R3.night) lp.children[1].material = basic(FX.C.lamp);
      scene.add(gD);
    }
    function buildHari(scene) {
      const h = new T.Group(); h.position.set(HARI.x, HARI.y, HARI.z); scene.add(h);
      const body = new T.Group(); h.add(body);
      mesh(GEO.sph, FX.C.quill, body, { p: [0, 0.42, 0], s: [0.44, 0.42, 0.42], ol: 0.025 });
      // aculei sulla schiena (verso la camera, +z) e sulla testa, inclinati all'indietro come i veri ricci
      const back = new T.Vector3(0, -0.25, 0.6);
      for (let i = 0; i < 24; i++) {
        const y = -0.15 + (i / 23) * 1.05, r0 = Math.sqrt(Math.max(0, 1 - y * y)), th = ((i * 2.4) % 2.9) - 1.45;
        const nrm = new T.Vector3(Math.sin(th) * r0, y, Math.cos(th) * r0);
        const dir = nrm.clone().add(back).normalize();
        const q = mesh(GEO.cone6, i % 3 ? FX.C.quill : FX.C['quill-2'], body, { s: [0.09, 0.34, 0.09], ol: 0.014 });
        q.position.set(nrm.x * 0.42, 0.42 + nrm.y * 0.38, nrm.z * 0.4);
        q.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      }
      mesh(GEO.sph, FX.C.face, body, { p: [0, 0.4, -0.27], s: [0.3, 0.27, 0.22] });
      mesh(GEO.sph, FX.C.ear, body, { p: [-0.26, 0.74, -0.08], s: 0.09, ol: 0.012 }); mesh(GEO.sph, FX.C.ear, body, { p: [0.26, 0.74, -0.08], s: 0.09, ol: 0.012 });
      // cappellino di paglia
      const hat = new T.Group(); hat.position.set(0, 0.82, -0.02); hat.rotation.x = -0.12; body.add(hat);
      mesh(GEO.cyl, FX.C.hat, hat, { s: [0.5, 0.035, 0.5], ol: 0.015 });
      mesh(GEO.cyl, FX.C.hat, hat, { p: [0, 0.12, 0], s: [0.24, 0.22, 0.24], ol: 0.015 });
      mesh(GEO.cyl, FX.C.band, hat, { p: [0, 0.06, 0], s: [0.25, 0.07, 0.25] });
      // zampette (tengono la canna) e piedini a penzoloni
      mesh(GEO.sph, FX.C.paw, body, { p: [0.22, 0.32, -0.36], s: 0.09, ol: 0.012 });
      mesh(GEO.sph, FX.C.paw, body, { p: [0.05, 0.27, -0.4], s: 0.085, ol: 0.012 });
      mesh(GEO.sph, FX.C.paw, h, { p: [-0.16, -0.04, -0.4], s: [0.1, 0.08, 0.13], ol: 0.012 });
      mesh(GEO.sph, FX.C.paw, h, { p: [0.16, -0.04, -0.4], s: [0.1, 0.08, 0.13], ol: 0.012 });
      FX.R3.hari = h; FX.R3.hariBody = body;
    }
    function buildTackle(scene) {
      // canna a 4 pezzi (si piega con la tensione) e mulinello
      const base = new T.Group(); base.position.set(HARI.x + 0.16, HARI.y + 0.3, HARI.z - 0.38); scene.add(base);
      mesh(GEO.cyl, FX.C.reel, base, { p: [0.07, 0.22, 0.02], r: [0, 0, Math.PI / 2], s: [0.07, 0.06, 0.07], ol: 0.01 });
      const segs = [];
      let parent = base;
      const lens = [0.55, 0.55, 0.5, 0.45];
      lens.forEach((len, i) => {
        const jn = new T.Group(); if (i) jn.position.y = lens[i - 1]; parent.add(jn);
        const r0 = 0.032 - i * 0.006;
        mesh(GEO.cyl8, i % 2 ? FX.C['rod-2'] : FX.C.rod, jn, { p: [0, len / 2, 0], s: [r0, len, r0], ol: 0.008 });
        segs.push(jn); parent = jn;
      });
      const tip = new T.Object3D(); tip.position.y = lens[3]; parent.add(tip);
      FX.R3.rod = { base, segs, tip, elev: 55, bend: 0, yaw: 0 };
      // lenza
      const lg = keep(new T.BufferGeometry()); lg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(26 * 3), 3));
      const line = new T.Line(lg, keep(new T.LineBasicMaterial({ color: FX.R3.night ? FX.C.foam : FX.C.line })));
      line.frustumCulled = false; scene.add(line); FX.R3.line = line;
      // galleggiante
      const bob = new T.Group(); scene.add(bob);
      mesh(GEO.hemi, FX.C['bob-1'], bob, { s: 0.12, ol: 0.012 });
      mesh(GEO.hemi, FX.C['bob-2'], bob, { s: 0.12, r: [Math.PI, 0, 0], ol: 0.012 });
      mesh(GEO.cyl8, FX.C['bob-1'], bob, { p: [0, 0.17, 0], s: [0.018, 0.14, 0.018] });
      FX.R3.bob = bob;
      // ombra del pesce sott'acqua
      const sh = mesh(GEO.disc, basic(FX.C.shadow, { transparent: true, opacity: 0, depthWrite: false }), scene, { s: [0.6, 1, 0.25] });
      sh.renderOrder = 2; FX.R3.shadow = sh;
    }
    // pesce 3D kawaii (corpo, pancia, coda, pinne, occhioni, guance e i dettagli della specie)
    function fish3(sp) {
      if (FX.R3.fishes[sp]) return FX.R3.fishes[sp];
      const gF = FX.buildFish(sp, FX.R3.scene);
      FX.R3.fishes[sp] = gF;
      return gF;
    }

    return { readTheme, prMax, initGL, keep, toon, basic, outline, bake, mesh, GEO, HARI, disposeScene, buildScene,
      wave, fish3 };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
