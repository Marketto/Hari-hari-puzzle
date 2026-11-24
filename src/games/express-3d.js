/* Hari Express — 3D di base (three.js r160, la copia locale di src/vendor/three.min.js): renderer, materiali toon con
 * rampa a 4 bande e contorni a guscio rovesciato (come Hari Fishing e Hari Rally), terreno a tasselli con altezze,
 * acqua animata leggera, alberi sferici e cespugli tondi (istanze), case degli animali con tetti a punta e orecchie
 * (istanze), industrie riconoscibili (geometria fusa con bake()).
 * Montato da express-ui.js con il contesto condiviso X: HH.express3d(X) → funzioni.
 * Coordinate: la casella (x, y) della logica va da x a x+1 lungo X e da y a y+1 lungo Z; altezza = livello × HU.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const HU = 0.32, WATER_Y = -0.07, BED = -0.2;
  HH.express3d = function (X) {
    const T = X.T;
    const COLS = ['ink', 'grass', 'grass-2', 'hill', 'hill-2', 'sand', 'bed', 'water', 'water-2', 'foam', 'sky', 'fog', 'tree', 'tree-2', 'tree-3', 'trunk', 'bush',
      'road', 'road-2', 'ballast', 'rail', 'sleeper', 'bridge', 'platform', 'canopy', 'stop', 'sign', 'arrow',
      ...['bunny', 'cat', 'panda', 'bear', 'duck', 'fox'].flatMap((a) => ['house-' + a, 'roof-' + a]), 'ear', 'door', 'window',
      'barn', 'barn-2', 'silo', 'dairy', 'cheese', 'field', 'field-2', 'bakery', 'bread', 'conifer', 'log', 'saw', 'toy-1', 'toy-2', 'toy-3', 'metal',
      'bus', 'mail', 'truck', 'loco', 'loco-2', 'wagon', 'base', 'face', 'eye', 'blush', 'glass', 'steam',
      'c-pax', 'c-mail', 'c-milk', 'c-cheese', 'c-grain', 'c-bread', 'c-wood', 'c-toys', 'go', 'stopl', 'ok', 'bad', 'sel', 'lamp'];
    const NUMS = ['amb', 'sun', 'night'];

    function readTheme() {
      const cs = G.getComputedStyle(X.wrap);
      const raw = COLS.map((k) => cs.getPropertyValue('--exp-' + k).trim()).concat(NUMS.map((k) => cs.getPropertyValue('--exp-' + k).trim()));
      const key = raw.join('|');
      if (key === X.themeKey) return false;
      X.themeKey = key; X.C = {}; X.N = {};
      COLS.forEach((k, i) => { const c = new T.Color(); try { c.setStyle(raw[i] || '#ff00ff'); } catch (e) { c.set(0xff00ff); } X.C[k] = c; });
      NUMS.forEach((k, i) => { X.N[k] = parseFloat(raw[COLS.length + i]) || 0; });
      return true;
    }
    function initGL() {
      if (X.R3) return true;
      if (!T) return false;
      let renderer;
      try { renderer = new T.WebGLRenderer({ canvas: X.cv, antialias: (G.devicePixelRatio || 1) < 2, powerPreference: 'default' }); } catch (e) { return false; }
      X.pr = Math.min(X.prMax(), G.devicePixelRatio || 1);
      renderer.setPixelRatio(X.pr);
      const grad = new T.DataTexture(new Uint8Array([100, 100, 100, 255, 160, 160, 160, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 4, 1, T.RGBAFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
      X.R3 = { renderer, grad, scene: null, disp: [], mats: {}, ols: {}, ortho: new T.OrthographicCamera(-10, 10, 10, -10, -200, 400), persp: new T.PerspectiveCamera(38, 1, 0.3, 400) };
      X.R3.cam = X.R3.ortho;
      X.cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); X.pause(); }, false);
      return true;
    }
    const keep = (x) => { X.R3.disp.push(x); return x; };
    function toon(c) {
      const k = 't' + c.getHexString();
      if (X.R3.mats[k]) return X.R3.mats[k];
      const m = (X.R3.mats[k] = keep(new T.MeshToonMaterial({ color: c, gradientMap: X.R3.grad })));
      m.userData.bake = true;
      return m;
    }
    const vcToon = () => X.R3.mats.vc || (X.R3.mats.vc = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: X.R3.grad })));
    const icToon = () => X.R3.mats.ic || (X.R3.mats.ic = keep(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: X.R3.grad })));
    function basic(c, extra) { return keep(new T.MeshBasicMaterial(Object.assign({ color: c }, extra || {}))); }
    // contorno: geometria gonfiata lungo le normali nello spazio della camera, facce posteriori (anche per le istanze)
    function outline(th) {
      const k = th.toFixed(3);
      if (X.R3.ols[k]) return X.R3.ols[k];
      const m = keep(new T.ShaderMaterial({
        uniforms: { uC: { value: X.C.ink.clone() }, uTh: { value: th } },
        vertexShader: 'uniform float uTh; void main(){ vec4 lp = vec4(position, 1.0); vec3 n = normal;\n#ifdef USE_INSTANCING\nlp = instanceMatrix * lp; n = mat3(instanceMatrix) * n;\n#endif\nvec4 mv = modelViewMatrix * lp; mv.xyz += normalize(normalMatrix * n) * uTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      }));
      m.userData.ol = th;
      X.R3.ols[k] = m;
      return m;
    }
    function olBaked() {
      return X.R3.mats.olb || (X.R3.mats.olb = keep(new T.ShaderMaterial({
        uniforms: { uC: { value: X.C.ink.clone() } },
        vertexShader: 'attribute float aTh; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz += normalize(normalMatrix * normal) * aTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      })));
    }
    /* ---- geometria statica fusa (come Hari Fishing): mesh toon → UNA mesh coi colori nei vertici + UNA di contorno ---- */
    const BK = {};
    function mergeTo(list, inv, ol) {
      if (!BK.m) { BK.m = new T.Matrix4(); BK.n = new T.Matrix3(); BK.v = new T.Vector3(); }
      let nv = 0, ni = 0;
      for (const m of list) { const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), Xa = new Float32Array(ol ? nv : nv * 3);
      const I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      for (const m of list) {
        const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, cnt = pa.count;
        BK.m.multiplyMatrices(inv, m.matrixWorld); BK.n.getNormalMatrix(BK.m);
        const col = ol ? null : m.material.color, th = ol ? m.material.userData.ol : 0;
        for (let i = 0; i < cnt; i++) {
          BK.v.fromBufferAttribute(pa, i).applyMatrix4(BK.m); P[(vo + i) * 3] = BK.v.x; P[(vo + i) * 3 + 1] = BK.v.y; P[(vo + i) * 3 + 2] = BK.v.z;
          BK.v.fromBufferAttribute(na, i).applyMatrix3(BK.n).normalize(); Nn[(vo + i) * 3] = BK.v.x; Nn[(vo + i) * 3 + 1] = BK.v.y; Nn[(vo + i) * 3 + 2] = BK.v.z;
          if (ol) Xa[vo + i] = th; else { Xa[(vo + i) * 3] = col.r; Xa[(vo + i) * 3 + 1] = col.g; Xa[(vo + i) * 3 + 2] = col.b; }
        }
        if (g.index) for (let i = 0; i < g.index.count; i++) I[io + i] = g.index.getX(i) + vo;
        else for (let i = 0; i < cnt; i++) I[io + i] = i + vo;
        io += g.index ? g.index.count : cnt; vo += cnt;
      }
      const geo = keep(new T.BufferGeometry());
      geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(Nn, 3));
      geo.setAttribute(ol ? 'aTh' : 'color', new T.BufferAttribute(Xa, ol ? 1 : 3)); geo.setIndex(new T.BufferAttribute(I, 1));
      geo.computeBoundingSphere();
      return new T.Mesh(geo, ol ? olBaked() : vcToon());
    }
    function bake(root) {
      root.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(root.matrixWorld).invert();
      const solid = [], lines = [];
      root.traverse((c) => {
        if (!c.isMesh) return;
        if (c.material.userData && c.material.userData.bake) solid.push(c);
        else if (c.material.userData && c.material.userData.ol != null) lines.push(c);
      });
      const out = new T.Group();
      if (solid.length) out.add(mergeTo(solid, inv, false));
      if (lines.length) out.add(mergeTo(lines, inv, true));
      out.position.copy(root.position); out.rotation.copy(root.rotation); out.scale.copy(root.scale);
      return out;
    }
    function mesh(geo, color, parent, o2 = {}) {
      const m = new T.Mesh(geo, color && color.isMaterial ? color : toon(color));
      if (o2.p) m.position.set(...o2.p);
      if (o2.r) m.rotation.set(...o2.r);
      if (o2.s != null) { if (typeof o2.s === 'number') m.scale.setScalar(o2.s); else m.scale.set(...o2.s); }
      if (o2.ol) m.add(new T.Mesh(geo, outline(o2.ol)));
      if (parent) parent.add(m);
      return m;
    }
    const GEO = {};
    function geos() {
      if (GEO.ok) return;
      const g = (k, x) => { GEO[k] = keep(x); };
      g('sph', new T.SphereGeometry(1, 16, 12));
      g('sphLo', new T.SphereGeometry(1, 10, 7));
      g('crown', new T.IcosahedronGeometry(1, 1));
      g('cone4', new T.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0));
      g('cone', new T.ConeGeometry(1, 1, 10).translate(0, 0.5, 0));
      g('cyl', new T.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0));
      g('cylLo', new T.CylinderGeometry(1, 1, 1, 7).translate(0, 0.5, 0));
      g('box', new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
      g('boxC', new T.BoxGeometry(1, 1, 1));
      g('cap', new T.CapsuleGeometry(0.5, 1, 4, 10).rotateZ(Math.PI / 2));
      g('disc', new T.CylinderGeometry(1, 1, 0.12, 16));
      g('plane', new T.PlaneGeometry(1, 1));
      // spicchio di formaggio
      const w = new T.CylinderGeometry(1, 1, 1, 3, 1, false, 0, Math.PI / 3).translate(0, 0.5, 0);
      g('wedge', w);
      GEO.ok = true;
    }

    /* ---------- terreno ---------- */
    const W = () => X.W;
    const tileH = (i) => (W().water[i] ? BED : W().ht[i] * HU);
    // altezza ai vertici della griglia a mezza casella (vx, vz = 0..2w): centro = la casella, lati e angoli = medie
    function hV(vx, vz) {
      const w = W(), ox = vx & 1, oz = vz & 1, x = vx >> 1, z = vz >> 1;
      const th = (tx, tz) => (tx < 0 || tz < 0 || tx >= w.w || tz >= w.h ? BED : tileH(tz * w.w + tx));
      if (ox && oz) return th(x, z);
      if (ox) return (th(x, z - 1) + th(x, z)) / 2;
      if (oz) return (th(x - 1, z) + th(x, z)) / 2;
      return (th(x - 1, z - 1) + th(x, z - 1) + th(x - 1, z) + th(x, z)) / 4;
    }
    // altezza del terreno in un punto qualsiasi (bilineare sulla griglia a mezza casella)
    function hAt(x, z) {
      const gx = Math.max(0, Math.min(2 * W().w, x * 2)), gz = Math.max(0, Math.min(2 * W().h, z * 2));
      const ix = Math.min(2 * W().w - 1, Math.floor(gx)), iz = Math.min(2 * W().h - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz;
      const a = hV(ix, iz), b = hV(ix + 1, iz), c = hV(ix, iz + 1), d = hV(ix + 1, iz + 1);
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    }
    function tileColor(i, out) {
      const w = W(), x = i % w.w, y = (i / w.w) | 0;
      if (w.water[i]) return out.copy(X.C.bed);
      out.copy((x + y) & 1 ? X.C.grass : X.C['grass-2']);
      if (w.ht[i] === 1) out.lerp(X.C.hill, 0.6);
      if (w.ht[i] === 2) out.lerp(X.C['hill-2'], 0.55);
      if (w.ht[i] === 0) {
        for (let d = 0; d < 4; d++) {
          const nx = x + [0, 1, 0, -1][d], ny = y + [-1, 0, 1, 0][d];
          if (nx >= 0 && ny >= 0 && nx < w.w && ny < w.h && w.water[ny * w.w + nx]) { out.lerp(X.C.sand, 0.75); break; }
        }
      }
      return out;
    }
    function buildTerrain(group) {
      const w = W(), CH = 32, col = new T.Color();
      for (let cy = 0; cy < w.h; cy += CH) for (let cx = 0; cx < w.w; cx += CH) {
        const x1 = Math.min(w.w, cx + CH), y1 = Math.min(w.h, cy + CH), n = (x1 - cx) * (y1 - cy);
        const P = new Float32Array(n * 9 * 3), Nn = new Float32Array(n * 9 * 3), Cc = new Float32Array(n * 9 * 3), I = new Uint32Array(n * 24);
        let v = 0, k = 0;
        for (let y = cy; y < y1; y++) for (let x = cx; x < x1; x++) {
          const i = y * w.w + x;
          tileColor(i, col);
          const base = v;
          for (let j = 0; j <= 2; j++) for (let q = 0; q <= 2; q++) {
            const vx = 2 * x + q, vz = 2 * y + j;
            P[v * 3] = vx / 2; P[v * 3 + 1] = hV(vx, vz); P[v * 3 + 2] = vz / 2;
            const dx = hV(Math.min(2 * w.w, vx + 1), vz) - hV(Math.max(0, vx - 1), vz), dz = hV(vx, Math.min(2 * w.h, vz + 1)) - hV(vx, Math.max(0, vz - 1));
            const l = Math.hypot(dx, 1, dz);
            Nn[v * 3] = -dx / l; Nn[v * 3 + 1] = 1 / l; Nn[v * 3 + 2] = -dz / l;
            Cc[v * 3] = col.r; Cc[v * 3 + 1] = col.g; Cc[v * 3 + 2] = col.b;
            v++;
          }
          for (let j = 0; j < 2; j++) for (let q = 0; q < 2; q++) {
            const a = base + j * 3 + q, b = a + 1, c = a + 3, d = a + 4;
            I[k++] = a; I[k++] = c; I[k++] = b; I[k++] = b; I[k++] = c; I[k++] = d;
          }
        }
        const geo = keep(new T.BufferGeometry());
        geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(Nn, 3)); geo.setAttribute('color', new T.BufferAttribute(Cc, 3));
        geo.setIndex(new T.BufferAttribute(I, 1)); geo.computeBoundingSphere();
        group.add(new T.Mesh(geo, vcToon()));
      }
      // bordo della "torta": parete di terra attorno alla mappa
      const pts = [], wall = [];
      const push = (x0, z0, x1, z1) => { const h0 = hAt(x0, z0), h1 = hAt(x1, z1); wall.push([x0, h0, z0, x1, h1, z1]); };
      for (let x = 0; x < 2 * w.w; x++) { push(x / 2, 0, (x + 1) / 2, 0); push((x + 1) / 2, w.h, x / 2, w.h); }
      for (let z = 0; z < 2 * w.h; z++) { push(w.w, z / 2, w.w, (z + 1) / 2); push(0, (z + 1) / 2, 0, z / 2); }
      for (const [x0, h0, z0, x1, h1, z1] of wall) pts.push(x0, h0, z0, x1, h1, z1, x1, -0.9, z1, x0, h0, z0, x1, -0.9, z1, x0, -0.9, z0);
      const wg = keep(new T.BufferGeometry());
      wg.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); wg.computeVertexNormals();
      group.add(new T.Mesh(wg, toon(X.C.bed.clone().lerp(X.C.trunk, 0.35))));
    }
    /* ---------- acqua: una mesh per le caselle d'acqua, onde e luce che scorre nello shader ---------- */
    function buildWater(group) {
      const w = W(), pts = [];
      for (let i = 0; i < w.n; i++) {
        if (!w.water[i]) continue;
        const x = i % w.w, z = (i / w.w) | 0, e = 0.02;
        pts.push(x - e, WATER_Y, z - e, x - e, WATER_Y, z + 1 + e, x + 1 + e, WATER_Y, z - e, x + 1 + e, WATER_Y, z - e, x - e, WATER_Y, z + 1 + e, x + 1 + e, WATER_Y, z + 1 + e);
      }
      if (!pts.length) return;
      const g = keep(new T.BufferGeometry());
      g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      const m = keep(new T.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uA: { value: X.C.water.clone() }, uB: { value: X.C['water-2'].clone() }, uF: { value: X.C.foam.clone() } },
        vertexShader: 'varying vec2 vP; uniform float uT; void main(){ vP = position.xz; vec3 p = position; p.y += sin(p.x * 1.7 + uT * 1.3) * 0.012 + cos(p.z * 1.3 - uT) * 0.012; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
        fragmentShader: 'varying vec2 vP; uniform float uT; uniform vec3 uA; uniform vec3 uB; uniform vec3 uF; void main(){ float b = sin(vP.x * 2.1 + vP.y * 0.7 + uT * 0.9) + sin(vP.y * 2.6 - vP.x * 0.4 - uT * 0.7); vec3 c = mix(uA, uB, step(1.15, b) * 0.6); float s = step(0.985, sin(vP.x * 9.0 + uT * 2.0) * sin(vP.y * 8.0 - uT * 1.6)); c = mix(c, uF, s * 0.7); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}',
      }));
      X.R3.water = m;
      group.add(new T.Mesh(g, m));
    }

    /* ---------- alberi e cespugli (istanze) ---------- */
    const hash = (i, k) => { let x = (i * 374761393 + k * 668265263) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
    const M4 = () => BK.t || (BK.t = new T.Matrix4());
    function inst(geo, mat, n) { const m = new T.InstancedMesh(geo, mat, Math.max(1, n)); m.count = 0; m.frustumCulled = false; return m; }
    function withOutline(m, th) { const o = new T.InstancedMesh(m.geometry, outline(th), m.instanceMatrix.count); o.instanceMatrix = m.instanceMatrix; o.count = m.count; o.frustumCulled = false; m.userData.ol = o; return o; }
    // a blocchi di 16×16 caselle, ognuno con la sua sfera di ingombro: con lo zoom vicino i blocchi fuori vista non si disegnano
    const CHUNK = 16;
    function buildTrees(group) {
      const w = W(), nb = Math.ceil(w.w / CHUNK) * Math.ceil(w.h / CHUNK), cnt = new Array(nb).fill(0);
      const bOf = (x, z) => Math.floor(z / CHUNK) * Math.ceil(w.w / CHUNK) + Math.floor(x / CHUNK);
      for (let i = 0; i < w.n; i++) if (w.tree[i]) cnt[bOf(i % w.w, (i / w.w) | 0)] += w.tree[i] === 1 ? 2 : 1;
      const C = [], Tr = [];
      for (let k = 0; k < nb; k++) { C.push(cnt[k] ? inst(GEO.crown, icToon(), cnt[k]) : null); Tr.push(cnt[k] ? inst(GEO.cylLo, toon(X.C.trunk), cnt[k]) : null); }
      const m = M4(), q = new T.Quaternion(), p = new T.Vector3(), sc = new T.Vector3(), col = new T.Color();
      for (let i = 0; i < w.n; i++) {
        const t = w.tree[i];
        if (!t || w.use[i] || w.rail[i] || w.road[i] || w.st[i]) continue;
        const x = i % w.w, z = (i / w.w) | 0, bk = bOf(x, z), crowns = C[bk], trunks = Tr[bk];
        const many = t === 1 ? (hash(i, 1) < 0.55 ? 2 : 1) : 1;
        for (let k = 0; k < many; k++) {
          const ox = many > 1 ? (k ? 0.68 : 0.32) : 0.5 + (hash(i, 2) - 0.5) * 0.3, oz = many > 1 ? (k ? 0.62 : 0.36) : 0.5 + (hash(i, 3) - 0.5) * 0.3;
          const px = x + ox, pz = z + oz, h0 = hAt(px, pz);
          if (t === 1) {
            const r = 0.2 + hash(i, 4 + k) * 0.08, trunk = 0.16 + r * 0.4;
            p.set(px, h0 + trunk + r * 0.85, pz); sc.set(r, r * 1.02, r); m.compose(p, q, sc);
            crowns.setMatrixAt(crowns.count, m);
            const blossom = hash(i, 9) < 0.12;
            col.copy(blossom ? X.C['tree-3'] : hash(i, 7 + k) < 0.5 ? X.C.tree : X.C['tree-2']);
            crowns.setColorAt(crowns.count++, col);
            p.set(px, h0, pz); sc.set(0.045, trunk + r * 0.3, 0.045); m.compose(p, q, sc);
            trunks.setMatrixAt(trunks.count++, m);
          } else {
            const r = 0.12 + hash(i, 5) * 0.05;
            p.set(px, h0 + r * 0.6, pz); sc.set(r * 1.2, r, r * 1.2); m.compose(p, q, sc);
            crowns.setMatrixAt(crowns.count, m); crowns.setColorAt(crowns.count++, X.C.bush);
          }
        }
      }
      for (let k = 0; k < nb; k++) {
        const crowns = C[k], trunks = Tr[k];
        if (!crowns || !crowns.count) continue;
        if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
        crowns.instanceMatrix.needsUpdate = true; trunks.instanceMatrix.needsUpdate = true;
        const ol = withOutline(crowns, 0.022);
        ol.userData.treeOl = true;
        for (const x of [crowns, trunks, ol]) { if (x.count) { x.computeBoundingSphere(); x.frustumCulled = true; } }
        group.add(crowns, ol);
        if (trunks.count) group.add(trunks);
      }
    }
    /* ---------- case degli animali (istanze): muri, tetto a punta, orecchie, porta, finestre ---------- */
    const EARS = { bunny: 'tall', cat: 'pointy', fox: 'pointy', panda: 'round', bear: 'round', duck: null };
    function buildHouses(group) {
      const s = X.s, w = W();
      let n = 0;
      for (const t of s.towns) n += t.houses.length;
      const body = inst(GEO.box, icToon(), n), roof = inst(GEO.cone4, icToon(), n), door = inst(GEO.boxC, toon(X.C.door), n), win = inst(GEO.boxC, basic(X.C.window), n * 2);
      const pe = inst(GEO.cone, icToon(), n * 2), re = inst(GEO.sphLo, icToon(), n * 2);
      const m = M4(), q = new T.Quaternion(), p = new T.Vector3(), sc = new T.Vector3(), e = new T.Euler(), off = new T.Vector3();
      for (const t of s.towns) for (const i of t.houses) {
        const x = i % w.w, z = (i / w.w) | 0, h0 = w.ht[i] * HU;
        const big = 0.85 + hash(i, 11) * 0.3, rot = Math.floor(hash(i, 12) * 4) * Math.PI / 2;
        const bw = 0.5 * big, bh = 0.34 * big, cx = x + 0.5, cz = z + 0.5;
        e.set(0, rot, 0); q.setFromEuler(e);
        p.set(cx, h0, cz); sc.set(bw, bh, bw); m.compose(p, q, sc); body.setMatrixAt(body.count, m); body.setColorAt(body.count++, X.C['house-' + t.an]);
        p.set(cx, h0 + bh, cz); sc.set(bw * 0.86, bh * 1.05, bw * 0.86); m.compose(p, q, sc); roof.setMatrixAt(roof.count, m); roof.setColorAt(roof.count++, X.C['roof-' + t.an]);
        off.set(0, bh * 0.28, bw * 0.5 + 0.005).applyEuler(e); p.set(cx + off.x, h0 + off.y, cz + off.z); sc.set(bw * 0.28, bh * 0.56, 0.02); m.compose(p, q, sc); door.setMatrixAt(door.count++, m);
        for (const sx of [-1, 1]) {
          off.set(sx * bw * 0.5 + sx * 0.005, bh * 0.55, 0).applyEuler(e); p.set(cx + off.x, h0 + off.y, cz + off.z); sc.set(0.02, bh * 0.3, bw * 0.3); m.compose(p, q, sc); win.setMatrixAt(win.count++, m);
        }
        const ear = EARS[t.an];
        if (ear) for (const sx of [-1, 1]) {
          off.set(sx * bw * 0.2, bh * 1.55, 0).applyEuler(e);
          p.set(cx + off.x, h0 + off.y, cz + off.z);
          if (ear === 'round') { sc.set(0.07, 0.07, 0.05); m.compose(p, q, sc); re.setMatrixAt(re.count, m); re.setColorAt(re.count++, X.C['roof-' + t.an]); }
          else {
            const eq = new T.Quaternion().setFromEuler(new T.Euler(0, rot, sx * -0.35));
            sc.set(0.05, ear === 'tall' ? 0.26 : 0.13, 0.04); m.compose(p, eq, sc); pe.setMatrixAt(pe.count, m); pe.setColorAt(pe.count++, ear === 'tall' ? X.C['house-' + t.an] : X.C['roof-' + t.an]);
          }
        }
      }
      for (const x of [body, roof, pe, re]) { if (x.instanceColor) x.instanceColor.needsUpdate = true; x.instanceMatrix.needsUpdate = true; }
      door.instanceMatrix.needsUpdate = true; win.instanceMatrix.needsUpdate = true;
      group.add(body, roof, door, win, pe, re, withOutline(body, 0.018), withOutline(roof, 0.018), withOutline(pe, 0.012), withOutline(re, 0.012));
    }
    /* ---------- industrie (modelli fusi) ---------- */
    function industry(d) {
      const g = new T.Group(), C = X.C, w = W();
      const h0 = w.ht[d.y * w.w + d.x] * HU, OL = 0.02;
      g.position.set(d.x + 1, h0, d.y + 1);
      const M = (geo, c, p, s, r) => mesh(geo, c, g, { p, s, r, ol: OL });
      // aia o prato chiaro sotto l'industria
      mesh(GEO.box, C.sand.clone().lerp(C.grass, 0.5), g, { p: [0, -0.02, 0], s: [1.86, 0.04, 1.86] });
      if (d.type === 'farm') {
        M(GEO.box, C.barn, [-0.3, 0, -0.1], [0.8, 0.5, 0.7]);
        M(GEO.cone4, C.barn.clone().multiplyScalar(0.85), [-0.3, 0.5, -0.1], [0.62, 0.36, 0.55]);
        M(GEO.box, C['barn-2'], [-0.3, 0.02, 0.26], [0.3, 0.34, 0.02]);
        M(GEO.cyl, C.silo, [0.45, 0, -0.35], [0.2, 0.85, 0.2]); M(GEO.sph, C.silo, [0.45, 0.85, -0.35], [0.2, 0.15, 0.2]);
        for (const [x, z] of [[0.45, 0.4], [0.15, 0.6]]) M(GEO.cylLo, C.field, [x, 0, z], [0.15, 0.18, 0.15]);
        // mucca kawaii: corpo tondo bianco con macchie e testa
        M(GEO.sph, C['barn-2'], [-0.35, 0.18, 0.62], [0.17, 0.12, 0.11]); M(GEO.sph, C['loco-2'], [-0.4, 0.24, 0.66], [0.06, 0.05, 0.05]); M(GEO.sph, C['barn-2'], [-0.17, 0.24, 0.62], [0.08, 0.07, 0.07]);
      } else if (d.type === 'dairy') {
        M(GEO.box, C.dairy, [-0.15, 0, 0], [1.0, 0.45, 0.9]);
        M(GEO.cone4, C.toy2 || C['toy-2'], [-0.15, 0.45, 0], [0.74, 0.25, 0.66]);
        M(GEO.wedge, C.cheese, [-0.15, 0.62, 0], [0.42, 0.18, 0.42], [0, 0.4, 0]);
        M(GEO.cyl, C['c-milk'], [0.55, 0, -0.4], [0.18, 0.55, 0.18]); M(GEO.cyl, C['c-milk'], [0.55, 0, 0.1], [0.18, 0.45, 0.18]);
        M(GEO.cyl, C['toy-2'], [0.55, 0.55, -0.4], [0.19, 0.05, 0.19]);
      } else if (d.type === 'field') {
        for (let r = 0; r < 6; r++) M(GEO.box, r % 2 ? C.field : C['field-2'], [-0.75 + r * 0.3, 0, 0], [0.2, 0.14, 1.6]);
        M(GEO.cylLo, C.trunk, [0.75, 0, 0.75], [0.03, 0.45, 0.03]); M(GEO.sph, C.cheese, [0.75, 0.48, 0.75], [0.09, 0.09, 0.09]);
        M(GEO.cone, C.field, [0.75, 0.52, 0.75], [0.16, 0.12, 0.16]);
      } else if (d.type === 'bakery') {
        M(GEO.box, C.bakery, [0, 0, 0], [1.1, 0.5, 0.9]);
        M(GEO.cone4, C.canopy, [0, 0.5, 0], [0.8, 0.3, 0.66]);
        M(GEO.cap, C.bread, [0, 0.82, 0], [0.55, 0.3, 0.3]);
        M(GEO.box, C['loco-2'], [0.38, 0.5, -0.25], [0.12, 0.42, 0.12]);
        M(GEO.box, C['c-milk'], [0, 0.04, 0.46], [0.5, 0.06, 0.04]);
      } else if (d.type === 'forest') {
        for (const [x, z, s] of [[-0.5, -0.5, 1], [0.3, -0.6, 0.85], [-0.6, 0.35, 0.9], [0.55, 0.2, 1.1], [0, 0, 0.8], [-0.1, 0.65, 0.7]]) {
          M(GEO.cylLo, C.trunk, [x, 0, z], [0.05, 0.15 * s, 0.05]);
          M(GEO.cone, C.conifer, [x, 0.12 * s, z], [0.26 * s, 0.45 * s, 0.26 * s]); M(GEO.cone, C.conifer, [x, 0.38 * s, z], [0.2 * s, 0.38 * s, 0.2 * s]);
        }
        for (let k = 0; k < 3; k++) M(GEO.cyl, C.log, [0.55 - k * 0.1, 0.07 + (k === 2 ? 0.11 : 0), 0.75], [0.07, 0.4, 0.07], [0, 0, Math.PI / 2]);
      } else if (d.type === 'sawmill') {
        M(GEO.box, C.log, [-0.2, 0, -0.1], [1.0, 0.45, 0.8]);
        M(GEO.cone4, C['toy-1'], [-0.2, 0.45, -0.1], [0.74, 0.3, 0.6]);
        M(GEO.disc, C.saw, [0.55, 0.32, -0.2], [0.26, 1, 0.26], [Math.PI / 2, 0, 0]);
        M(GEO.box, C['toy-2'], [0.3, 0, 0.55], [0.22, 0.22, 0.22]); M(GEO.box, C['toy-3'], [0.55, 0, 0.6], [0.18, 0.18, 0.18]);
        M(GEO.sph, C['toy-1'], [0.42, 0.3, 0.58], [0.1, 0.1, 0.1]);
        for (let k = 0; k < 3; k++) M(GEO.cyl, C.log, [-0.5 + k * 0.17, 0.07, 0.65], [0.07, 0.45, 0.07], [Math.PI / 2, 0, 0]);
      }
      return bake(g);
    }
    function buildIndustries(group) { for (const d of X.s.inds) group.add(industry(d)); }

    /* ---------- scena ---------- */
    function disposeScene() {
      if (!X.R3 || !X.R3.scene) return;
      X.R3.disp.forEach((x) => { try { x.dispose(); } catch (e) { /* già fatto */ } });
      X.R3.disp = []; X.R3.mats = {}; X.R3.ols = {};
      for (const k in GEO) delete GEO[k];
      X.R3.scene = null;
    }
    function buildScene() {
      disposeScene();
      geos();
      const scene = new T.Scene();
      X.R3.scene = scene;
      scene.background = X.C.sky.clone();
      scene.add(new T.HemisphereLight(X.C.sky.clone().lerp(new T.Color(1, 1, 1), 0.5), X.C.grass, X.N.amb || 1.4));
      const sun = new T.DirectionalLight(0xffffff, X.N.sun || 1.4);
      sun.position.set(-20, 40, 12); scene.add(sun); scene.add(sun.target);
      const terr = new T.Group(); scene.add(terr);
      buildTerrain(terr); buildWater(terr); buildIndustries(terr);
      X.R3.terr = terr;
      X.R3.dyn = new T.Group(); scene.add(X.R3.dyn);         // alberi e case (ricostruiti quando cambiano)
      X.R3.net = new T.Group(); scene.add(X.R3.net);         // strade, binari, stazioni (express-tracks.js)
      X.R3.veh = new T.Group(); scene.add(X.R3.veh);         // mezzi (express-vehicles.js)
      X.R3.fx = new T.Group(); scene.add(X.R3.fx);           // anteprima, selezione
      X.R3.dynKey = ''; X.R3.netKey = '';
      return scene;
    }
    function rebuildDyn() {
      const s = X.s, w = W();
      let hs = 0;
      for (const t of s.towns) hs += t.houses.length;
      const key = hs + ':' + s.cut.length + ':' + (s.nv || 1);
      if (key === X.R3.dynKey) return false;
      X.R3.dynKey = key;
      const g = X.R3.dyn;
      for (const c of g.children.slice()) { g.remove(c); if (c.isInstancedMesh && c.userData.own !== false) c.dispose(); }
      buildTrees(g); buildHouses(g);
      return true;
    }
    return { COLS, NUMS, HU, WATER_Y, readTheme, initGL, keep, toon, vcToon, icToon, basic, outline, bake, mesh, GEO, geos, hV, hAt, tileH, inst, withOutline, hash,
      buildScene, disposeScene, rebuildDyn };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
