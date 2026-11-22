/* Hari Fishing — sott'acqua: fondale e nebbia, pesci e animaletti del fondale, laboratorio delle pose (QA), disegno della vista sott'acqua e indicatori sui pesci.
 * Parte di fish-ui.js (stesso create()): si carica prima e fish-ui.js la monta con HH.fishUW(FX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // FX = contesto condiviso con fish-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.fishUW = function (FX) {
    const { TAG_Q, HEART, TAG_X, f1, reduce, clamp, lerp, T, P, keep, toon, basic, outline, bake, mesh, GEO,
      buildFish, swimUp } = FX;
    /* ---------- 3D: sott'acqua ----------
     * Una seconda scena, disegnata al posto di quella in superficie mentre l'esca è in acqua (fase 'wait' e 'bite').
     * Strati con parallasse (piante vicine davanti alla camera, fondale, rocce e coralli, sagome lontane nella nebbia),
     * raggi di luce che filtrano, superficie vista da sotto (con le ninfee al lago), bollicine, banchi di pesciolini
     * (InstancedMesh, 2 draw call per banco), abitanti kawaii che non abboccano. Le piante sono UNA InstancedMesh con
     * ShaderMaterial che le fa ondeggiare nel vertex shader; i raggi un'altra; le bollicine Points: niente oggetti
     * creati per fotogramma. Coordinate della logica: x −1..1 → ±UWX m, y 0..1 → UWY0 .. UWY0 − UWY m. */
    const UWX = 1.45, UWY0 = -0.35, UWY = 4.4, BED = -5.05;
    const uwX = (x) => x * UWX, uwY = (y) => UWY0 - y * UWY;
    function fogShader(vert, frag, uni, extra) {
      return keep(new T.ShaderMaterial(Object.assign({
        uniforms: Object.assign({ uT: { value: 0 }, uFog: { value: FX.C['uw-2'].clone() }, uN: { value: 5 }, uF: { value: 26 } }, uni),
        vertexShader: vert, fragmentShader: frag,
      }, extra || {})));
    }
    function buildUW() {
      const night = FX.R3.night, sea = FX.cfg.stage === 'sea';
      const scene = new T.Scene();
      const U = (FX.R3.uw = { scene, mats: [], byId: {}, spare: {}, frame: 0, crit: [], schools: [], tags: [], bub: null });
      scene.background = FX.C['uw-2'].clone();
      scene.fog = new T.Fog(FX.C['uw-2'].clone(), 5, 26);
      scene.add(new T.HemisphereLight(FX.C['uw-top'], FX.C['uw-2'], (FX.N.amb || 1.4) * 1.05));
      const sun = new T.DirectionalLight(FX.C.ray, (FX.N.sunI || 1.5) * 0.9); sun.position.set(-3, 10, 6); scene.add(sun);
      const r = HH.rng(FX.cfg.level * 13 + (sea ? 5 : 9));
      // fondo: sfumatura dall'acqua chiara (in alto) a quella profonda
      {
        const g = keep(new T.PlaneGeometry(140, 34, 1, 8)), pos = g.attributes.position, col = [];
        for (let i = 0; i < pos.count; i++) { const k = clamp((pos.getY(i) + 17) / 34, 0, 1); const c = FX.C['uw-2'].clone().lerp(FX.C['uw-1'], Math.pow(k, 1.4)); col.push(c.r, c.g, c.b); }
        g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
        const bg = new T.Mesh(g, basic(0xffffff, { vertexColors: true, fog: false, depthWrite: false }));
        bg.position.set(0, -6, -34); scene.add(bg);
      }
      // superficie vista da sotto: bande di luce che scorrono
      {
        const g = keep(new T.PlaneGeometry(90, 60, 1, 1).rotateX(Math.PI / 2));
        const m = fogShader(
          'varying vec3 vW; varying float vD; void main(){ vec4 wp = modelMatrix * vec4(position,1.); vW = wp.xyz; vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }',
          `uniform float uT, uN, uF; uniform vec3 uA, uB, uFog; varying vec3 vW; varying float vD;
           void main(){ float n = sin(vW.x * 1.1 + uT * .7 + sin(vW.z * .6 + uT * .3) * 2.) + sin(vW.z * 1.4 - uT * .5) * .7;
             vec3 c = mix(uA, uB, step(1.05, n) * .75);
             gl_FragColor = vec4(mix(c, uFog, smoothstep(3., 34., vD) * .8), 1.);
             #include <colorspace_fragment>
           }`,
          { uA: { value: FX.C['uw-1'].clone().lerp(FX.C['uw-top'], 0.55) }, uB: { value: FX.C['uw-top'].clone() }, uFog: { value: FX.C['uw-1'].clone() } },
          { side: T.DoubleSide, fog: false });
        U.mats.push(m);
        const sf = new T.Mesh(g, m); sf.position.set(0, 0.02, -16); scene.add(sf);
      }
      // raggi di luce (una InstancedMesh, fusione additiva)
      {
        const g = keep(new T.PlaneGeometry(1, 1).translate(0, -0.5, 0));
        const m = fogShader(
          'uniform float uT; varying vec2 vU; varying float vK; void main(){ vU = uv; vec4 w0 = instanceMatrix * vec4(0.,0.,0.,1.); vK = .55 + .45 * sin(uT * .55 + w0.x * 1.9); gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.); }',
          'uniform vec3 uC; uniform float uA; varying vec2 vU; varying float vK; void main(){ float a = pow(vU.y, 1.7) * smoothstep(0., .35, vU.x) * smoothstep(1., .65, vU.x) * vK * uA; gl_FragColor = vec4(uC * a, a);\n#include <colorspace_fragment>\n}',
          { uC: { value: FX.C.ray.clone() }, uA: { value: night ? 0.16 : 0.26 } },
          { transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
        U.mats.push(m);
        const n = 7, im = new T.InstancedMesh(g, m, n), d = new T.Object3D();
        for (let i = 0; i < n; i++) { d.position.set(-7 + i * 2.3 + r() * 0.8, 0.1, -3 - r() * 9); d.rotation.set(0, 0, -0.32 + r() * 0.12); d.scale.set(0.9 + r() * 1.3, 9 + r() * 3, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
        im.frustumCulled = false; scene.add(im);
      }
      // fondale con dune, rocce, coralli (mare) o tronchi e sassi (lago): tutto fermo, fuso in una mesh (+ contorno)
      const stat = new T.Group(); scene.add(stat);
      {
        const g = keep(new T.PlaneGeometry(80, 40, 32, 16).rotateX(-Math.PI / 2)), pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, Math.sin(x * 0.35 + z * 0.2) * 0.25 + Math.sin(x * 0.9 - z * 0.5) * 0.08 + Math.max(0, -z - 6) * 0.06); }
        g.computeVertexNormals();
        const bed = new T.Mesh(g, toon(FX.C.bed)); bed.position.set(0, BED, -12); stat.add(bed);
        for (let i = 0; i < 7; i++) mesh(GEO.hemi, FX.C['bed-2'], stat, { p: [-9 + i * 3 + r() * 2, BED - 0.1, -2 - r() * 10], s: [1.2 + r() * 1.5, 0.35 + r() * 0.3, 0.8 + r()] });
        for (let i = 0; i < 9; i++) {
          const z = i < 4 ? -0.8 - r() * 2 : -5 - r() * 9;
          mesh(GEO.sphLo, FX.C.rock, stat, { p: [(r() - 0.5) * 14, BED + 0.1, z], s: [0.5 + r() * 0.9, 0.4 + r() * 0.6, 0.5 + r() * 0.7], ol: 0.03 });
        }
        if (sea) {
          for (let i = 0; i < 7; i++) {
            const cg = new T.Group(), cc = i % 2 ? FX.C.coral : FX.C['coral-2'];
            const k = 0.6 + r() * 0.6;
            for (let j = 0; j < 4; j++) {
              const a = j * 1.6 + r(), br = new T.Group(); br.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.55); cg.add(br);
              mesh(GEO.cyl8, cc, br, { p: [0, 0.35 * k, 0], s: [0.07 * k, 0.7 * k, 0.07 * k], ol: 0.015 });
              mesh(GEO.sphLo, cc, br, { p: [0, 0.72 * k, 0], s: 0.11 * k, ol: 0.015 });
            }
            cg.position.set((r() - 0.5) * 12, BED + 0.1, i < 3 ? -0.6 - r() * 2 : -3 - r() * 8); stat.add(cg);
          }
          for (let i = 0; i < 3; i++) mesh(GEO.hemi, FX.C.coral, stat, { p: [(r() - 0.5) * 10, BED, -1.5 - r() * 6], s: [0.45, 0.35, 0.4], ol: 0.025 });
        } else {
          for (let i = 0; i < 2; i++) mesh(GEO.cyl8, FX.C.trunk, stat, { p: [(i ? 3.6 : -4.2), BED + 0.2, -3 - i * 3], r: [0, 0.4 - i, Math.PI / 2], s: [0.22, 3.4, 0.22], ol: 0.03 });
          for (let i = 0; i < 12; i++) mesh(GEO.sphLo, i % 2 ? FX.C['bed-2'] : FX.C.rock, stat, { p: [(r() - 0.5) * 12, BED + 0.05, -0.5 - r() * 7], s: [0.14 + r() * 0.12, 0.08, 0.12 + r() * 0.1] });
          // ninfee viste da sotto: foglie a disco sulla superficie e gambi lunghi fino al fondo
          for (let i = 0; i < 6; i++) {
            const x = (r() - 0.5) * 12, z = -1.5 - r() * 9;
            const pad = new T.Mesh(keep(new T.CircleGeometry(1, 20, 0.35, Math.PI * 2 - 0.7).rotateX(Math.PI / 2)), toon(FX.C.lily));
            pad.position.set(x, -0.04, z); pad.scale.setScalar(0.7 + r() * 0.5); pad.rotation.y = r() * 6; stat.add(pad);
            mesh(GEO.cyl8, FX.C.reed, stat, { p: [x + 0.1, (BED - 0.04) / 2, z], s: [0.03, -BED, 0.03], r: [0, 0, 0.05 - r() * 0.1] });
          }
        }
      }
      bake(stat, true);
      // piante che ondeggiano: alghe al mare, erbe e canne al lago (una InstancedMesh, 3 strati di profondità)
      {
        const g = keep(new T.PlaneGeometry(0.26, 1, 1, 8));
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.5; pos.setX(i, pos.getX(i) * (1 - 0.7 * y) * (sea ? 1.4 : 1)); pos.setY(i, y); }
        const m = fogShader(
          `uniform float uT; varying float vH; varying float vD; varying vec3 vC;
           void main(){ vH = uv.y; vec4 w0 = instanceMatrix * vec4(0.,0.,0.,1.); float ph = w0.x * 1.7 + w0.z * .9;
             vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); float k = pow(uv.y, 1.5);
             wp.x += sin(uT * 1.2 + ph + uv.y * 2.2) * .3 * k; wp.z += cos(uT * .9 + ph) * .12 * k;
             #ifdef USE_INSTANCING_COLOR
             vC = instanceColor;
             #else
             vC = vec3(1.);
             #endif
             vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
          `uniform vec3 uFog, uInk; uniform float uN, uF; varying float vH; varying float vD; varying vec3 vC;
           void main(){ vec3 c = vC * (.74 + .26 * step(.5, vH)); gl_FragColor = vec4(mix(c, uFog, smoothstep(uN, uF, vD)), 1.);
             #include <colorspace_fragment>
           }`,
          { uInk: { value: FX.C.ink.clone() } }, { side: T.DoubleSide });
        U.mats.push(m);
        const n = 84, im = new T.InstancedMesh(g, m, n), d = new T.Object3D();
        for (let i = 0; i < n; i++) {
          const layer = i < 14 ? 0 : i < 50 ? 1 : 2;     // 0 davanti alla camera, 1 vicino, 2 lontano
          const z = layer === 0 ? 1.6 + r() * 1.6 : layer === 1 ? -0.6 - r() * 4 : -7 - r() * 12;
          const x = layer === 0 ? (r() < 0.5 ? -1 : 1) * (1.2 + r() * 2.2) : (r() - 0.5) * (layer === 1 ? 13 : 26);
          const h = (sea ? 2.2 : 1.5) + r() * (sea ? 2.6 : 1.8) + (layer === 0 ? 1 : 0);
          d.position.set(x, BED - 0.05, z); d.rotation.set(0, r() * 3, 0); d.scale.set(layer === 0 ? 1.6 : 1, h, 1); d.updateMatrix();
          im.setMatrixAt(i, d.matrix); im.setColorAt(i, r() < 0.5 ? FX.C.weed : FX.C['weed-2']);
        }
        im.frustumCulled = false; scene.add(im);
      }
      // bollicine: Points con un insieme fisso
      {
        const n = 70, g = keep(new T.BufferGeometry());
        const p = new Float32Array(n * 3), sz = new Float32Array(n);
        g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('aS', new T.BufferAttribute(sz, 1));
        const m = keep(new T.ShaderMaterial({
          uniforms: { uScale: { value: 400 }, uC: { value: FX.C.bubble.clone() }, uR: { value: FX.C.foam.clone() } },
          vertexShader: 'attribute float aS; uniform float uScale; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vA = aS; gl_PointSize = aS * uScale / max(.5, -mv.z); gl_Position = projectionMatrix * mv; }',
          fragmentShader: 'uniform vec3 uC, uR; varying float vA; void main(){ if (vA <= 0.) discard; vec2 d = gl_PointCoord - .5; float r = length(d); if (r > .5) discard; float rim = step(.34, r); float hi = step(length(d - vec2(-.16, -.16)), .1); vec3 c = mix(uC, uR, max(rim, hi)); gl_FragColor = vec4(c, .35 + .6 * max(rim, hi));\n#include <colorspace_fragment>\n}',
          transparent: true, depthWrite: false,
        }));
        const pts = new T.Points(g, m); pts.frustumCulled = false; scene.add(pts);
        U.bub = { g, p, sz, n, vy: new Float32Array(n), life: new Float32Array(n), wob: new Float32Array(n), m, next: 0 };
      }
      // banchi di pesciolini (al lago anche i girini): InstancedMesh + contorno che condivide le matrici
      {
        // profilo dal basso in alto (coda → muso: facce verso l'esterno)
        const prof = [[0, -0.48], [0.26, -0.52], [0.07, -0.36], [0.24, -0.22], [0.34, 0.08], [0.22, 0.32], [0, 0.5]].map(([x, y]) => new T.Vector2(x, y));
        const g = keep(new T.LatheGeometry(prof, 7).rotateZ(-Math.PI / 2));
        const mk = (n, c1, c2, k, zc, tad) => {
          const im = new T.InstancedMesh(g, toon(new T.Color(1, 1, 1)), n);
          for (let i = 0; i < n; i++) im.setColorAt(i, i % 3 ? c1 : c2);
          const ol = new T.InstancedMesh(g, outline(0.012), n); ol.instanceMatrix = im.instanceMatrix;
          im.frustumCulled = ol.frustumCulled = false; scene.add(im); scene.add(ol);
          const sc = { im, n, k, z: zc, x: (r() - 0.5) * 6, y: -1.4 - r() * 2.5, ph: r() * 6, sp: 0.35 + r() * 0.2, scat: 0, off: [], tad };
          for (let i = 0; i < n; i++) sc.off.push([(r() - 0.5) * 1.4, (r() - 0.5) * 0.7, (r() - 0.5) * 0.8, r() * 6, 0.8 + r() * 0.5, 0, 0]);   // + frequenza, imbardata, sua velocità
          U.schools.push(sc);
        };
        if (sea) { mk(12, FX.C['tiny-1'], FX.C['tiny-2'], 0.2, -2.2); mk(9, FX.C['tiny-2'], FX.C.coral, 0.17, -5); }
        else { mk(10, FX.C['tiny-1'], FX.C['minnow-3'], 0.18, -2.4); mk(9, FX.C.tadpole, FX.C.tadpole, 0.15, -1.2, true); }
      }
      // esca, amo, lenza e galleggiante visto da sotto
      {
        const lure = new T.Group(); scene.add(lure);
        mesh(keep(new T.TorusGeometry(0.075, 0.014, 6, 14, Math.PI * 1.5)), FX.C.reel, lure, { p: [0, -0.04, 0], r: [0, 0, Math.PI * 0.75], ol: 0.008 });
        const bait = mesh(GEO.sph, FX.C.bait, lure, { p: [0.02, -0.12, 0], s: [0.07, 0.09, 0.07], ol: 0.012 });
        mesh(GEO.sphLo, FX.C.hi, bait, { p: [0.35, 0.3, 0.6], s: 0.25 });
        mesh(GEO.sphLo, FX.C.rock, lure, { p: [0, 0.16, 0], s: 0.04, ol: 0.008 });
        bait.userData.dyn = true; bake(lure, false);
        U.lure = lure; U.bait = bait;
        const fl = new T.Group(); scene.add(fl);
        mesh(GEO.hemi, FX.C['bob-1'], fl, { s: 0.12, ol: 0.012 }); mesh(GEO.hemi, FX.C['bob-2'], fl, { s: 0.12, r: [Math.PI, 0, 0], ol: 0.012 });
        bake(fl, false); U.float = fl;
        const lg = keep(new T.BufferGeometry()); lg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(6), 3));
        const ln = new T.Line(lg, keep(new T.LineBasicMaterial({ color: FX.C.line }))); ln.frustumCulled = false; scene.add(ln); U.line = ln;
      }
      // abitanti che non abboccano (contorno vivo)
      if (sea) { critCrab(U, -1.9, -0.9); critJelly(U, 2.2, -1.6, -3.5); critStar(U, 1.4, -1.2); critOcto(U, -3.4, -3.6); critTurtle(U, -6.5); critSeahorse(U, -2.6, -2.2, -1.6); critClam(U, 2.6, -2.6); }
      else { critFrog(U); critSnail(U, -1.5, -0.9); critSnail(U, 2.8, -3.2); critShrimp(U, 0.9, -1.1); critShrimp(U, -3, -2.6); critTurtle(U, -7); critClam(U, -2.6, -3.4); }
      U.cam = { x: 0, y: -2.5, z: 6.4, lx: 0, ly: -2.7 };
    }
    // un pesce per il pool sott'acqua (riusato per specie)
    // un pesce 3D per ogni pesce della logica (per id); quelli che spariscono tornano tra i pezzi di ricambio della specie
    function uwFish(id, sp) {
      const U = FX.R3.uw;
      const cur = U.byId[id];
      if (cur) return cur;
      const sp2 = U.spare[sp] && U.spare[sp].pop();
      const e = sp2 || { sp, g: buildFish(sp, U.scene), yaw: 0, z: 0, seen: 0 };
      e.yaw = 0; e.fresh = true;
      U.byId[id] = e;
      return e;
    }
    // QA (Playwright): tavola delle 8 specie (4 × 2) su fondo neutro, di lato o in 3/4, ferme o che nuotano
    function drawLab(dt, t) {
      const Q = FX.qa.lab;
      if (!FX.R3.lab || FX.R3.lab.of !== FX.R3.scene) {
        const scene = new T.Scene(); scene.background = FX.C['uw-2'].clone();
        scene.add(new T.HemisphereLight(FX.C['uw-top'], FX.C['uw-2'], (FX.N.amb || 1.4) * 1.05));
        const sun = new T.DirectionalLight(FX.C.sun, 1.3); sun.position.set(-3, 8, 6); scene.add(sun);
        const list = ['minnow', 'goldfish', 'catfish', 'koi', 'clown', 'puffer', 'tuna', 'golden'].map((sp, i) => {
          const g = buildFish(sp, scene); g.visible = true;
          g.position.set(((i % 4) - 1.5) * 1.8, i < 4 ? 0.95 : -0.95, 0);
          return { sp, g, i };
        });
        FX.R3.lab = { of: FX.R3.scene, scene, list, cam: new T.PerspectiveCamera(22, 1, 0.1, 100) };
      }
      const L2 = FX.R3.lab, tt = Q.t != null ? Q.t : t;
      L2.cam.aspect = FX.W / FX.H; L2.cam.updateProjectionMatrix();
      const el = Q.elev || 0, d = 17;
      L2.cam.position.set(0, Math.sin(el) * d, Math.cos(el) * d); L2.cam.lookAt(0, 0, 0);
      for (const f of L2.list) {
        const row = f.i < 4 ? 0.95 : -0.95;
        f.g.visible = !Q.only || Q.only.includes(f.sp);
        const sk = (Q.k || 1.6) / 1.6;
        f.g.position.set(((f.i % 4) - 1.5) * 1.8 * sk, (el > 1 ? 0 : row) * sk, (el > 1 ? -row : 0) * sk);
        f.g.rotation.set(0, Q.yaw || 0, 0);
        f.g.scale.setScalar(Q.k || 1.6);
        labPose(f, tt, dt);
      }
      FX.R3.renderer.render(L2.scene, L2.cam);
    }
    function labPose(f, t, dt) {
      const S = f.g.userData.sw, Q = FX.qa.lab;
      if (Q.t != null) { S.ph = t * S.p.f * 6.2832 + f.i; S.pph = t * S.p.pf * 6.2832; S.e = Q.v != null ? Q.v : 0.8; S.bph = 1.5; S.cb = (Q.turn || 0) * -0.07 * S.len; }
      swimUp(f.g, Q.t != null ? 0 : dt, Q.v != null ? Q.v : 0.8, Q.hover || 0, 0, Q.turn || 0, 0);
    }
    // ---- abitanti (ognuno: un gruppo e una funzione up(t, dt) creata una volta) ----
    const eyes2 = (parent, x, y, z, k = 1, gap = 0.08) => [-1, 1].forEach((sd) => { mesh(GEO.sphLo, FX.C.hi, parent, { p: [x + sd * gap * k, y, z], s: 0.05 * k }); mesh(GEO.sphLo, FX.C.eye, parent, { p: [x + sd * gap * k, y, z + 0.03 * k], s: 0.032 * k }); });
    function addCrit(U, c) { bake(c.g, false); U.crit.push(c); }
    function critCrab(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.12, z); U.scene.add(g);
      mesh(GEO.sph, FX.C.crab, g, { p: [0, 0.06, 0], s: [0.3, 0.17, 0.22], ol: 0.014 });
      [-1, 1].forEach((sd) => { mesh(GEO.cyl8, FX.C.crab, g, { p: [sd * 0.08, 0.24, 0.1], s: [0.015, 0.14, 0.015] }); });
      eyes2(g, 0, 0.33, 0.12, 1, 0.08);
      mesh(GEO.sphLo, FX.C.blush, g, { p: [-0.16, 0.06, 0.19], s: [0.05, 0.03, 0.01] }); mesh(GEO.sphLo, FX.C.blush, g, { p: [0.16, 0.06, 0.19], s: [0.05, 0.03, 0.01] });
      const claws = [-1, 1].map((sd) => { const c = new T.Group(); c.userData.fixed = true; c.position.set(sd * 0.36, 0.08, 0.1); g.add(c); mesh(GEO.sph, FX.C.crab, c, { s: [0.1, 0.08, 0.07], ol: 0.01 }); const top = new T.Group(); top.position.set(sd * 0.06, 0.04, 0); c.add(top); mesh(GEO.sph, FX.C.crab, top, { p: [sd * 0.05, 0.02, 0], s: [0.07, 0.035, 0.05], ol: 0.008 }); return top; });
      // zampe: un gruppo per lato (si muovono insieme, in controfase)
      const legs = [-1, 1].map((sd) => { const lg = new T.Group(); lg.position.set(sd * 0.24, -0.04, 0); g.add(lg); for (let j = 0; j < 3; j++) mesh(GEO.cyl8, FX.C.crab, lg, { p: [sd * (j * 0.04 - 0.04), 0, -0.06 + j * 0.06], s: [0.014, 0.16, 0.014], r: [Math.sin(j * 2) * 0.25, 0, sd * 0.9] }); return lg; });
      addCrit(U, { g, up(t) { g.position.x = x + Math.sin(t * 0.35) * 1.3; const w = Math.cos(t * 0.35) * 6; legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.3 * Math.min(1, Math.abs(w)); }); claws.forEach((c, i) => { c.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(t * 3 + i) * 0.25); }); } });
    }
    function critJelly(U, x, y, z) {
      const g = new T.Group(); g.position.set(x, y, z); U.scene.add(g);
      const mat = keep(new T.MeshToonMaterial({ color: FX.C.jelly, gradientMap: FX.R3.grad, transparent: true, opacity: 0.82 }));
      const bell = mesh(GEO.hemi, mat, g, { s: [0.34, 0.3, 0.34], ol: 0.012 });
      mesh(GEO.disc, mat, g, { r: [Math.PI, 0, 0], s: 0.34 });
      eyes2(g, 0, 0.1, 0.3, 0.9, 0.09);
      mesh(GEO.sphLo, FX.C.blush, g, { p: [-0.17, 0.04, 0.29], s: [0.04, 0.022, 0.01] }); mesh(GEO.sphLo, FX.C.blush, g, { p: [0.17, 0.04, 0.29], s: [0.04, 0.022, 0.01] });
      const ten = [];
      for (let i = 0; i < 5; i++) { const a = i * 1.26, tg = new T.Group(); tg.position.set(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18); g.add(tg); mesh(GEO.cyl8, mat, tg, { p: [0, -0.3, 0], s: [0.018, 0.6, 0.018] }); ten.push(tg); }
      addCrit(U, { g, up(t) { const p = Math.sin(t * 2.2); g.position.y = y + Math.sin(t * 0.5) * 0.45; bell.scale.set(0.34 * (1 + p * 0.07), 0.3 * (1 - p * 0.08), 0.34 * (1 + p * 0.07)); ten.forEach((tg, i) => { tg.rotation.z = Math.sin(t * 1.6 + i) * 0.3; tg.rotation.x = Math.cos(t * 1.3 + i) * 0.2; }); } });
    }
    function critStar(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.14, z); g.rotation.x = -1.1; U.scene.add(g);
      for (let i = 0; i < 5; i++) { const a = new T.Group(); a.userData.fixed = true; a.rotation.z = i * 1.2566; g.add(a); mesh(GEO.cone6, FX.C.starfish, a, { p: [0, 0.14, 0], s: [0.07, 0.24, 0.035], ol: 0.01 }); }
      mesh(GEO.sphLo, FX.C.starfish, g, { s: [0.09, 0.09, 0.04] });
      eyes2(g, 0, 0.02, 0.035, 0.6, 0.05);
      addCrit(U, { g, up(t) { g.rotation.z = Math.sin(t * 0.4) * 0.2; g.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04); } });
    }
    function critOcto(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.35, z); U.scene.add(g);
      const head = mesh(GEO.sph, FX.C.octo, g, { p: [0, 0.28, 0], s: [0.34, 0.38, 0.32], ol: 0.016 }); head.userData.dyn = true;
      eyes2(g, 0, 0.24, 0.29, 1.3, 0.1);
      mesh(GEO.sphLo, FX.C.blush, g, { p: [-0.2, 0.14, 0.27], s: [0.055, 0.03, 0.01] }); mesh(GEO.sphLo, FX.C.blush, g, { p: [0.2, 0.14, 0.27], s: [0.055, 0.03, 0.01] });
      const tents = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * 0.9 + i * 0.36, root = new T.Group(); root.position.set(Math.cos(a) * 0.22, -0.02, Math.sin(-a) * 0.12 + 0.05); g.add(root);
        let par = root; const segs = [];
        for (let j = 0; j < 3; j++) { const sg = new T.Group(); if (j) { sg.userData.fixed = true; sg.position.x = 0.14 * (Math.cos(a) > 0 ? 1 : -1); sg.rotation.z = 0.3 * (Math.cos(a) > 0 ? 1 : -1); } par.add(sg); mesh(GEO.sphLo, FX.C.octo, sg, { s: [0.09 - j * 0.02, 0.06 - j * 0.012, 0.06 - j * 0.012], ol: 0.008 }); segs.push(sg); par = sg; }
        tents.push(segs);
      }
      addCrit(U, { g, up(t) { head.scale.y = 0.38 * (1 + Math.sin(t * 1.8) * 0.05); tents.forEach((segs, i) => { segs[0].rotation.z = Math.sin(t * 2 + i * 0.9) * 0.45; }); } });
    }
    function critTurtle(U, z) {
      const g = new T.Group(); U.scene.add(g);
      const body = new T.Group(); body.userData.fixed = true; g.add(body);
      mesh(GEO.hemi, FX.C.turtle, body, { s: [0.62, 0.36, 0.5], ol: 0.02 });
      mesh(GEO.disc, FX.C['turtle-2'], body, { r: [Math.PI, 0, 0], s: [0.6, 1, 0.48] });
      for (let i = 0; i < 5; i++) { const a = i * 1.26; mesh(GEO.sphLo, FX.C['turtle-2'], body, { p: [Math.cos(a) * 0.28, 0.28, Math.sin(a) * 0.22], s: [0.13, 0.05, 0.11] }); }
      mesh(GEO.sphLo, FX.C['turtle-2'], body, { p: [0, 0.34, 0], s: [0.14, 0.06, 0.12] });
      const head = mesh(GEO.sph, FX.C['turtle-2'], body, { p: [0.68, 0.06, 0], s: [0.2, 0.17, 0.17], ol: 0.012 });
      [-1, 1].forEach((sd) => { mesh(GEO.sphLo, FX.C.eye, head, { p: [0.5, 0.25, sd * 0.6], s: [0.22, 0.28, 0.16] }); mesh(GEO.sphLo, FX.C.hi, head, { p: [0.62, 0.42, sd * 0.68], s: 0.08 }); });
      const fl = [[0.36, 0.38], [0.36, -0.38], [-0.4, 0.34], [-0.4, -0.34]].map(([x, zz]) => { const f = new T.Group(); f.position.set(x, -0.02, zz); body.add(f); mesh(GEO.sph, FX.C['turtle-2'], f, { p: [0, 0, Math.sign(zz) * 0.12], s: [0.14, 0.04, 0.2], ol: 0.008 }); return f; });
      body.rotation.y = -0.35;
      addCrit(U, { g, x: -9, up(t, dt) { this.x += dt * 0.42; if (this.x > 10) this.x = -10; g.position.set(this.x, -2.2 + Math.sin(t * 0.4) * 0.5, z); fl.forEach((f, i) => { f.rotation.x = Math.sin(t * 2.2 + (i % 2) * Math.PI) * 0.5 * (i < 2 ? 1 : 0.6); }); } });
    }
    function critSeahorse(U, x, y, z) {
      const g = new T.Group(); g.position.set(x, y, z); U.scene.add(g);
      [[0, 0.3, 0.13], [0.03, 0.12, 0.12], [0.02, -0.06, 0.1], [-0.02, -0.2, 0.075]].forEach(([px, py, rr]) => mesh(GEO.sph, FX.C.seahorse, g, { p: [px, py, 0], s: rr, ol: 0.01 }));
      const hd = mesh(GEO.sph, FX.C.seahorse, g, { p: [0.02, 0.46, 0], s: [0.12, 0.11, 0.1], ol: 0.01 });
      mesh(GEO.cyl8, FX.C.seahorse, g, { p: [0.17, 0.43, 0], r: [0, 0, Math.PI / 2 - 0.2], s: [0.035, 0.16, 0.035], ol: 0.006 });
      mesh(GEO.sphLo, FX.C.eye, hd, { p: [0.35, 0.15, 0.7], s: [0.28, 0.32, 0.18] }); mesh(GEO.sphLo, FX.C.hi, hd, { p: [0.45, 0.3, 0.85], s: 0.11 });
      mesh(keep(new T.TorusGeometry(0.09, 0.03, 6, 12, Math.PI * 1.4)), FX.C.seahorse, g, { p: [0.04, -0.33, 0], r: [0, 0, 0.6], ol: 0.008 });
      mesh(GEO.sphLo, FX.C.coral, g, { p: [-0.12, 0.16, 0], s: [0.05, 0.1, 0.02] });
      addCrit(U, { g, up(t) { g.position.y = y + Math.sin(t * 1.1) * 0.18; g.rotation.z = Math.sin(t * 0.8) * 0.12; } });
    }
    function critClam(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.1, z); U.scene.add(g);
      mesh(GEO.hemi, FX.C.shell, g, { r: [Math.PI, 0, 0], s: [0.32, 0.13, 0.26], ol: 0.014 });
      mesh(GEO.sph, FX.C.pearl, g, { p: [0, 0.05, 0.02], s: 0.075, ol: 0.008 });
      const lid = new T.Group(); lid.position.set(0, 0, -0.24); g.add(lid);
      mesh(GEO.hemi, FX.C.shell, lid, { p: [0, 0, 0.24], s: [0.32, 0.14, 0.26], ol: 0.014 });
      eyes2(lid, 0, 0.1, 0.48, 0.7, 0.07);
      addCrit(U, { g, up(t) { lid.rotation.x = -Math.max(0, Math.sin(t * 0.45)) * 0.75; } });
    }
    function critFrog(U) {
      const g = new T.Group(); U.scene.add(g);
      const body = new T.Group(); body.userData.fixed = true; body.rotation.y = Math.PI; g.add(body);
      mesh(GEO.sph, FX.C.frog, body, { s: [0.3, 0.2, 0.24], ol: 0.014 });
      mesh(GEO.sph, FX.C['frog-2'], body, { p: [0.04, -0.06, 0.05], s: [0.22, 0.12, 0.2] });
      [-1, 1].forEach((sd) => { mesh(GEO.sph, FX.C.frog, body, { p: [0.16, 0.16, sd * 0.11], s: 0.09, ol: 0.01 }); mesh(GEO.sphLo, FX.C.hi, body, { p: [0.2, 0.19, sd * 0.14], s: 0.06 }); mesh(GEO.sphLo, FX.C.eye, body, { p: [0.23, 0.2, sd * 0.155], s: 0.035 }); });
      mesh(GEO.sphLo, FX.C.blush, body, { p: [0.2, 0.02, 0.17], s: [0.05, 0.025, 0.02] });
      const legs = [-1, 1].map((sd) => { const l = new T.Group(); l.position.set(-0.24, -0.04, sd * 0.14); body.add(l); mesh(GEO.sph, FX.C.frog, l, { p: [-0.12, 0, 0], s: [0.16, 0.05, 0.06], ol: 0.008 }); mesh(GEO.sph, FX.C['frog-2'], l, { p: [-0.28, 0, sd * 0.04], s: [0.08, 0.025, 0.07] }); return l; });
      addCrit(U, { g, x: 8, up(t, dt) { const k = Math.max(0, Math.sin(t * 2.6)); this.x -= dt * (0.15 + k * 0.6); if (this.x < -9) this.x = 9; g.position.set(this.x, -0.75 + Math.sin(t * 0.7) * 0.2, -2.4); legs.forEach((l, i) => { l.rotation.y = (i ? 1 : -1) * (0.2 + k * 0.9); }); } });
    }
    function critSnail(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.08, z); U.scene.add(g);
      mesh(GEO.sph, FX.C['snail-2'], g, { p: [0.05, 0, 0], s: [0.24, 0.07, 0.09], ol: 0.01 });
      mesh(keep(new T.TorusGeometry(0.09, 0.06, 8, 14)), FX.C.snail, g, { p: [-0.04, 0.13, 0], ol: 0.01 });
      mesh(GEO.sphLo, FX.C['snail-2'], g, { p: [-0.04, 0.13, 0.02], s: [0.05, 0.05, 0.06] });
      const st = [-1, 1].map((sd) => { const e = new T.Group(); e.position.set(0.24, 0.04, sd * 0.04); g.add(e); mesh(GEO.cyl8, FX.C['snail-2'], e, { p: [0, 0.07, 0], s: [0.012, 0.14, 0.012] }); mesh(GEO.sphLo, FX.C.eye, e, { p: [0, 0.15, 0], s: 0.025 }); return e; });
      addCrit(U, { g, up(t) { g.position.x = x + Math.sin(t * 0.08) * 0.5; st.forEach((e, i) => { e.rotation.z = -0.3 + Math.sin(t * 1.4 + i) * 0.2; }); } });
    }
    function critShrimp(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.1, z); U.scene.add(g);
      const segs = [];
      for (let i = 0; i < 4; i++) segs.push(mesh(GEO.sph, FX.C.shrimp, g, { p: [0.14 - i * 0.08, 0.02 - i * i * 0.012, 0], s: [0.06 - i * 0.006, 0.055 - i * 0.008, 0.045], ol: 0.007 }));
      mesh(GEO.cone6, FX.C.shrimp, g, { p: [-0.2, -0.07, 0], r: [0, 0, 2.2], s: [0.05, 0.07, 0.02], ol: 0.006 });
      mesh(GEO.sphLo, FX.C.eye, g, { p: [0.17, 0.05, 0.04], s: 0.02 });
      [-1, 1].forEach((sd) => mesh(GEO.cyl8, FX.C.shrimp, g, { p: [0.26, 0.06, sd * 0.02], r: [0, sd * 0.3, -1.1], s: [0.004, 0.22, 0.004] }));
      const ph = x * 3;
      addCrit(U, { g, up(t) { const h = Math.max(0, Math.sin(t * 1.3 + ph)); g.position.y = BED + 0.1 + h * h * 0.45; g.position.x = x + Math.sin(t * 0.25 + ph) * 0.8; g.rotation.y = Math.cos(t * 0.25 + ph) > 0 ? 0 : Math.PI; } });
    }


    const uwTmp = { v: null, w: null };
    // dove sta un punto 3D sullo schermo (px, nel riquadro): scrive in out { x, y, ok }
    function toScreen(x, y, z, out) {
      const v = uwTmp.v || (uwTmp.v = FX.v3());
      v.set(x, y, z).project(FX.R3.camera);
      out.x = (v.x * 0.5 + 0.5) * FX.W; out.y = (-v.y * 0.5 + 0.5) * FX.H; out.ok = v.z < 1 && v.z > -1;
      return out;
    }
    // dal punto dello schermo al piano dell'esca (z = 0) → coordinate della logica { x, y }
    function fromScreen(px, py, out) {
      const v = uwTmp.v || (uwTmp.v = FX.v3()), w = uwTmp.w || (uwTmp.w = FX.v3());
      const cam = FX.R3.camera;
      v.set((px / FX.W) * 2 - 1, -(py / FX.H) * 2 + 1, 0.5).unproject(cam);
      w.copy(v).sub(cam.position);
      if (Math.abs(w.z) < 1e-6) return null;
      const k = -cam.position.z / w.z;
      out.x = clamp((cam.position.x + w.x * k) / UWX, -1, 1);
      out.y = clamp((UWY0 - (cam.position.y + w.y * k)) / UWY, P.Y_TOP, P.Y_BOT);
      return out;
    }
    const tagPt = { x: 0, y: 0, ok: false };
    function drawUW(dt, t) {
      const U = FX.R3.uw, rm = reduce();
      const ph = FX.s.phase, lu = FX.s.lu || { x: 0, y: 0.45 };
      const tt = rm ? 0 : t;
      for (let i = 0; i < U.mats.length; i++) U.mats[i].uniforms.uT.value = tt;
      U.diveK = Math.min(1, (U.diveK || 0) + dt / (rm ? 0.01 : 1.5));
      const ease = 1 - Math.pow(1 - U.diveK, 3);
      const LX = uwX(lu.x), LY = uwY(lu.y);
      // camera: segue un po' l'esca (parallasse), scende dalla superficie al tuffo
      const land = FX.W > FX.H * 1.1;
      const cyT = -2.55 + (LY + 2.55) * 0.18, czT = land ? 5.2 : 6.4;
      const c = U.cam, ck = Math.min(1, dt * 2.2);
      c.x = lerp(c.x, LX * 0.3, ck); c.y = lerp(c.y, cyT, ck);
      const shake = !rm && ph === 'bite' ? Math.sin(t * 38) * 0.03 : 0;
      FX.R3.camera.position.set(c.x + shake, lerp(-0.15, c.y, ease), czT + (1 - ease) * 1.2);
      FX.R3.camera.lookAt(c.x * 1.2, lerp(-0.6, c.y - 0.15, ease), 0);
      FX.R3.camera.updateMatrixWorld();
      // esca, galleggiante (sulla superficie, sopra l'esca) e lenza
      const bite = ph === 'bite';
      U.lure.position.set(LX, LY + (bite ? Math.sin(t * 30) * 0.03 : 0), 0);
      U.lure.rotation.z = Math.sin(t * 2.4) * 0.15 + clamp((lu.tx - lu.x) * 3, -0.6, 0.6);
      U.bait.rotation.z = Math.sin(t * 7) * 0.25;
      const fx = LX * 0.8 + 0.25, fy = bite ? -0.32 + Math.sin(t * 26) * 0.05 : -0.09 + Math.sin(t * 1.7) * 0.02;
      U.float.position.set(fx, fy, 0.1);
      const lp = U.line.geometry.attributes.position;
      lp.setXYZ(0, fx, fy - 0.1, 0.1); lp.setXYZ(1, LX, LY + 0.2, 0); lp.needsUpdate = true;
      // pesci della logica
      const sw = FX.s.sw || [];
      const fr = ++U.frame;
      for (let i = sw.length; i < U.tags.length; i++) tagSet(i, '');
      for (let i = 0; i < sw.length; i++) {
        const w = sw[i];
        const e = uwFish(w.id, w.sp), g = e.g;
        e.seen = fr;
        g.visible = true;
        const near = w.st === 'curious' || w.st === 'circle' || w.st === 'sniff' || w.st === 'bite';
        const zT = near ? 0.05 : ((i % 3) - 1) * 0.6 - 0.3;
        if (e.fresh) { e.z = zT; e.yaw = w.h > 0 ? -0.25 : 0.25 - Math.PI; e.yawV = 0; e.px = w.x; e.py = w.y; e.vx = 0; e.vy = 0; e.roll = 0; e.pitch = 0; e.fresh = false; }
        e.z = lerp(e.z, zT, Math.min(1, dt * 1.5));
        // velocità dalla logica (m/s, smussata)
        if (dt > 0) { const k = Math.min(1, dt * 6); e.vx = lerp(e.vx, (w.x - e.px) * UWX / dt, k); e.vy = lerp(e.vy, -(w.y - e.py) * UWY / dt, k); }
        e.px = w.x; e.py = w.y;
        const flee = w.st === 'flee' ? 1 : 0, hover = w.st === 'sniff' || w.st === 'bite' ? 1 : 0;
        // virata con inerzia (molla critica; nella fuga è uno scatto e il corpo si piega a C); il muso passa verso la camera
        const yawT = w.h > 0 ? -0.25 : 0.25 - Math.PI, kS = flee ? 260 : 26, cS = 2 * Math.sqrt(kS);
        for (let n = Math.min(8, Math.ceil(dt / 0.01)), j = 0; j < n; j++) { const h2 = dt / n; e.yawV += (kS * (yawT - e.yaw) - cS * e.yawV) * h2; e.yaw += e.yawV * h2; }
        const spd = Math.hypot(e.vx, e.vy), v = Math.min(1.2, spd / 0.4);
        // in curva si inclina, salendo o scendendo alza o abbassa il muso
        e.roll = lerp(e.roll, clamp(-e.yawV * 0.1, -0.5, 0.5), Math.min(1, dt * 6));
        e.pitch = lerp(e.pitch, clamp(Math.atan2(e.vy, Math.abs(e.vx) + 0.12) * 0.6, -0.5, 0.5), Math.min(1, dt * 4));
        swimUp(g, rm ? 0 : dt, v, Math.max(hover, spd < 0.06 ? 0.7 : 0), flee, e.yawV, w.st === 'bite' ? 0.5 : 0);
        // colpi di coda a impulsi: un piccolo slancio in avanti, poi plana
        const surge = rm ? 0 : -Math.cos(g.userData.sw.bph) * 0.025 * Math.min(1, v);
        g.position.set(uwX(w.x) + Math.cos(e.yaw) * surge, uwY(w.y) + Math.sin(t * 1.3 + i) * 0.012 * (1 - Math.min(1, v)), e.z - Math.sin(e.yaw) * surge);
        g.scale.setScalar(1.15);
        g.rotation.set(e.roll, e.yaw, e.pitch + (w.st === 'sniff' ? Math.sin(t * 14) * 0.05 : 0));
        // indicatore sopra la testa: '?' curioso, cuore (più grande con l'interesse), '!' spaventato
        const kind = w.st === 'flee' ? 'x' : w.st === 'bite' ? 'xb' : w.st === 'curious' ? 'q' : (w.st === 'circle' || w.st === 'sniff') ? 'h' : '';
        if (kind) { toScreen(g.position.x, g.position.y + 0.42, g.position.z, tagPt); tagSet(i, tagPt.ok ? kind : '', tagPt.x, tagPt.y, w.int); }
        else tagSet(i, '');
        if (!rm && Math.random() < dt * 0.25) FX.bubbles(g.position.x + (w.h > 0 ? 0.4 : -0.4), g.position.y + 0.05, g.position.z, 1, 0.02, 0.6);
      }
      for (const k in U.byId) { const e = U.byId[k]; if (e.seen !== fr) { e.g.visible = false; (U.spare[e.sp] = U.spare[e.sp] || []).push(e); delete U.byId[k]; } }
      // banchi di pesciolini: seguono un capofila, si sparpagliano quando l'esca va troppo veloce
      const dm = FX.R3.dummy || (FX.R3.dummy = new T.Object3D());
      for (let si = 0; si < U.schools.length; si++) {
        const sc = U.schools[si];
        sc.scat = Math.max(0, sc.scat - dt * 0.6);
        const a = tt * 0.16 * sc.sp + sc.ph;
        const hx = Math.sin(a) * 5.2, hy = sc.y + Math.sin(a * 2.3) * 0.5;
        const dir = Math.cos(a) >= 0 ? 1 : -1;
        const sp = 1 + sc.scat * 2.2;
        for (let i = 0; i < sc.n; i++) {
          const of = sc.off[i];
          dm.position.set(hx + of[0] * sp + Math.sin(tt * 2 + of[3]) * 0.08, hy + of[1] * sp + Math.cos(tt * 2.6 + of[3]) * 0.06, sc.z + of[2] * sp);
          // ognuno vira col suo ritardo (molla) e scodinzola col suo ritmo: il banco non si muove all'unisono
          const kY = (14 + of[4] * 10) * (1 + sc.scat * 3), yT = dir > 0 ? -0.15 : 0.15 - Math.PI, h2 = Math.min(dt, 0.05);
          of[6] += (kY * (yT - of[5]) - 2 * Math.sqrt(kY) * of[6]) * h2; of[5] += of[6] * h2;
          const wig = Math.sin(tt * (sc.tad ? 9 : 11) * of[4] * (1 + sc.scat * 1.5) + of[3]) * (sc.tad ? 0.45 : 0.22);
          dm.rotation.set(0, of[5] + wig, Math.sin(tt * 1.7 * of[4] + of[3]) * 0.1);
          dm.scale.set(sc.k * (sc.tad ? 0.8 : 1), sc.k * (sc.tad ? 1 : 0.6), sc.k * 0.45);
          dm.updateMatrix(); sc.im.setMatrixAt(i, dm.matrix);
        }
        sc.im.instanceMatrix.needsUpdate = true;
      }
      // abitanti
      for (let i = 0; i < U.crit.length; i++) U.crit[i].up(tt, rm ? 0 : dt);
      // bollicine: salgono ondeggiando; qualcuna nasce dal fondo
      const B = U.bub;
      if (!rm && Math.random() < dt * 2.2) FX.bubbles((Math.random() - 0.5) * 8, BED + 0.2, -1 - Math.random() * 5, 1, 0.05, 0.8);
      for (let i = 0; i < B.n; i++) {
        if (B.life[i] <= 0) { if (B.sz[i] !== 0) B.sz[i] = 0; continue; }
        B.life[i] -= dt;
        B.p[i * 3 + 1] += B.vy[i] * dt; B.p[i * 3] += Math.sin(t * 3 + B.wob[i]) * dt * 0.12;
        if (B.p[i * 3 + 1] > -0.05 || B.life[i] <= 0) { B.life[i] = 0; B.sz[i] = 0; }
      }
      B.g.attributes.position.needsUpdate = true; B.g.attributes.aS.needsUpdate = true;
      FX.R3.renderer.render(U.scene, FX.R3.camera);
    }
    // indicatori DOM sopra i pesci
    function tagSet(i, kind, x, y, k) {
      if (!FX.tagsEl) return;
      let e = FX.R3.uw.tags[i];
      if (!e) { e = FX.R3.uw.tags[i] = { el: document.createElement('div'), kind: '' }; e.el.className = 'fi-tg'; FX.tagsEl.appendChild(e.el); }
      if (e.kind !== kind) {
        e.kind = kind;
        e.el.className = 'fi-tg' + (kind ? ' on ' + kind[0] : '') + (kind === 'xb' ? ' big' : '');
        e.el.innerHTML = kind === 'q' ? TAG_Q : kind === 'h' ? HEART : kind ? TAG_X : '';
      }
      if (!kind) return;
      e.el.style.transform = `translate(${f1(x)}px, ${f1(y)}px)`;
      if (kind === 'h') { const kk = f1(0.45 + 0.6 * clamp(k, 0, 1)); if (e.k !== kk) { e.k = kk; e.el.style.setProperty('--k', kk); e.el.classList.toggle('full', k >= 0.99); } }
    }
    function clearTags() { if (FX.R3 && FX.R3.uw) FX.R3.uw.tags.forEach((e) => { if (e.kind) { e.kind = ''; e.el.className = 'fi-tg'; e.el.innerHTML = ''; } }); }
    // tuffo: velo di bollicine e cambio di scena a metà

    return { uwX, uwY, buildUW, drawLab, fromScreen, drawUW, clearTags };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
