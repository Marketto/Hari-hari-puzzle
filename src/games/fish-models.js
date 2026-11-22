/* Hari Fishing — pesci 3D: forme per specie (dal profilo condiviso con i disegni SVG), pinne, nuoto ondulato nello shader, spruzzi e cerchi sull'acqua.
 * Parte di fish-ui.js (stesso create()): si carica prima e fish-ui.js la monta con HH.fishModels(FX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // FX = contesto condiviso con fish-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.fishModels = function (FX) {
    const { FB, fProf, symm, TAILS, FCOL, RIDGES, PEC, T, keep, bake, mesh, GEO } = FX;
    /* ---------- pesci 3D: forme per specie e nuoto ----------
     * Corpo generato (non una sfera): profilo d'altezza e di larghezza lungo x, muso pieno (superellisse) e coda che si
     * assottiglia a S fino al peduncolo caudale stretto; sezione ovale, schiena e pancia possono differire. Pinne sottili
     * (spessore a lente: 0 sul bordo, così il contorno a guscio segue la sagoma) attaccate dove servono: caudale dal
     * peduncolo verso l'esterno, dorsale, anale, pettorali dietro l'opercolo, ventrali. Bande, macchie e righe sono
     * "decalcomanie" che seguono la superficie del corpo. Tutto il pesce (corpo, pinne, occhi) è poi fuso da bake() in
     * UNA mesh + UN contorno (2 draw call per pesce, erano 4).
     * Nuoto nel vertex shader (onBeforeCompile su MeshToonMaterial; il contorno usa la stessa funzione): ogni vertice ha
     * aSw = (tipo, cerniera xyz). Onda del corpo lungo x con ritardo di fase dalla testa alla coda e ampiezza che cresce
     * verso la coda (nuoto carangiforme; il tonno ha il corpo quasi fermo e la coda rigida che ruota sul peduncolo),
     * piega a C (curve e fuga), pettorali che remano alternate, dorsale/anale che ondeggiano, code velate in ritardo.
     * Ogni pesce ha i suoi materiali (stesso programma) con gli uniform del suo nuoto: frequenza, fase e ampiezza
     * variano per individuo. Colori solo da --fsh-*. */
    // nuoto per specie: f = colpi di coda al secondo, a = ampiezza in punta (× lunghezza), k = onde nel corpo,
    // ex = esponente dell'inviluppo (alto = corpo fermo e solo la coda), head = quanto oscilla la testa,
    // pec / pf = ampiezza (rad) / frequenza delle pettorali, fin = ondeggio di dorsale e anale, veil = coda velata
    const SWP = {
      minnow: { f: 2.6, a: 0.13, k: 0.95, ex: 2, head: 0.04, pec: 0.5, pf: 3, fin: 0.25, veil: 0 },
      goldfish: { f: 1.5, a: 0.095, k: 0.8, ex: 2.2, head: 0.03, pec: 0.65, pf: 2.4, fin: 0.35, veil: 0.75 },
      catfish: { f: 1.1, a: 0.14, k: 1.25, ex: 1.6, head: 0.05, pec: 0.4, pf: 1.6, fin: 0.3, veil: 0 },
      koi: { f: 1.1, a: 0.11, k: 0.9, ex: 2, head: 0.03, pec: 0.5, pf: 1.8, fin: 0.25, veil: 0.5 },
      clown: { f: 2.4, a: 0.085, k: 0.8, ex: 2.2, head: 0.03, pec: 0.8, pf: 4, fin: 0.3, veil: 0 },
      puffer: { f: 1, a: 0.012, k: 0.5, ex: 3, head: 0.02, pec: 1, pf: 6, fin: 0.5, veil: 0 },
      tuna: { f: 3.4, a: 0.07, k: 0.55, ex: 5, head: 0.01, pec: 0.12, pf: 1, fin: 0.05, veil: 0 },
      golden: { f: 1.4, a: 0.095, k: 0.8, ex: 2.2, head: 0.03, pec: 0.6, pf: 2.2, fin: 0.35, veil: 0.8 },
    };
    const FISH_GLSL = `uniform vec4 uS1; uniform vec4 uS2; uniform vec4 uK; attribute vec4 aSw;
float fwZ(float x){ float s = clamp((uK.x - x) / uK.y, 0.0, 1.0); float e = uK.w + (1.0 - uK.w) * pow(s, uS2.w);
  return uS1.y * e * sin(uS1.x - s * uK.z * 6.2832) + uS1.z * s * s; }
vec3 fishDef(vec3 p){
  float k = aSw.x; vec3 h = aSw.yzw;
  if (k > 0.5 && k < 1.5) { float sd = h.z >= 0.0 ? 1.0 : -1.0; float ph = uS2.x + (sd > 0.0 ? 0.0 : 3.1416);
    float a = uS2.y * sin(ph) * sd, b = uS2.y * 0.7 * cos(ph) * sd; vec3 q = p - h;
    q.xz = vec2(q.x * cos(a) - q.z * sin(a), q.x * sin(a) + q.z * cos(a));
    q.yz = vec2(q.y * cos(b) - q.z * sin(b), q.y * sin(b) + q.z * cos(b)); p = h + q; }
  else if (k > 1.5 && k < 2.5) { p.z += uS2.z * abs(p.y - h.y) * sin(uS1.x * 0.7 + p.x * 14.0); }
  else if (k > 3.5) { float sl = (fwZ(h.x + 0.004) - fwZ(h.x - 0.004)) / 0.008; float a = atan(sl) * 1.3; vec3 q = p - h;
    q.xz = vec2(q.x * cos(a) - q.z * sin(a), q.x * sin(a) + q.z * cos(a)); return h + q + vec3(0.0, 0.0, fwZ(h.x)); }
  p.z += fwZ(p.x);
  if (k > 2.5 && k < 3.5) { float d = max(0.0, h.x - p.x); p.z += uS1.w * d * d * sin(uS1.x - 1.8 - d * 9.0); }
  return p; }
`;
    function fishCompile(sh) {
      Object.assign(sh.uniforms, this.userData.u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FISH_GLSL).replace('#include <begin_vertex>', 'vec3 transformed = fishDef(position);');
    }
    function fishMats(u) {
      const m = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: FX.R3.grad }));
      m.userData.u = u; m.onBeforeCompile = fishCompile;
      const o = keep(new T.ShaderMaterial({
        uniforms: Object.assign({ uC: { value: FX.C.ink.clone() } }, u),
        vertexShader: FISH_GLSL + 'attribute float aTh; void main(){ vec3 p = fishDef(position); vec4 mv = modelViewMatrix * vec4(p, 1.0); mv.xyz += normalize(normalMatrix * normal) * aTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      }));
      return [m, o];
    }
    // griglia (u, v) → punto: indici con le facce verso l'esterno (controllo sul primo triangolo non degenere)
    function gridGeo(nu, nv, fn, wrapV, extra) {
      const pos = [], idx = [], mix = [];
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const r = fn(i / nu, j / nv); pos.push(r[0], r[1], r[2]); if (extra) mix.push(extra(i / nu, j / nv)); }
      const id = (i, j) => i * (nv + 1) + j;
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) idx.push(id(i, j), id(i + 1, j), id(i, j + 1), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1));
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      if (extra) g.setAttribute('aMix', new T.Float32BufferAttribute(mix, 1));
      g.setIndex(idx); orient(g); g.computeVertexNormals();
      return keep(g);
    }
    // le facce devono guardare fuori dall'asse del pesce (asse x): se no si girano
    function orient(g) {
      const p = g.attributes.position, ix = g.index.array, a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
      let acc = 0;
      for (let t = 0; t < ix.length; t += 3) {
        a.fromBufferAttribute(p, ix[t]); b.fromBufferAttribute(p, ix[t + 1]); c.fromBufferAttribute(p, ix[t + 2]);
        const cx = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
        b.sub(a); c.sub(a); b.cross(c);
        acc += b.y * cx + b.z * cz;
      }
      if (acc < 0) for (let t = 0; t < ix.length; t += 3) { const k = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = k; }
    }
    // corpo chiuso: anelli più fitti a muso e coda, punta sul muso, tappo sul peduncolo; aMix = pancia
    function bodyGeo(F, P, belly) {
      const NX = 22, NT = 18, pos = [], mix = [], idx = [];
      const xs = []; for (let i = 0; i < NX; i++) xs.push(-Math.cos(Math.PI * i / NX));
      const q = [];
      for (const x of xs) for (let j = 0; j < NT; j++) {
        const th = (j / NT) * Math.PI * 2;
        P.at(x, th, 0, q); pos.push(q[0], q[1], q[2]);
        const s = Math.sin(th);
        mix.push(belly ? Math.min(1, Math.max(0, (-s - 0.2) / 0.3)) * Math.min(1, Math.max(0, (x + 0.88) / 0.25)) : 0);
      }
      const tip = pos.length / 3; pos.push(F.d[0], 0, 0); mix.push(0);
      const cap = pos.length / 3; pos.push(-F.d[0] - 0.004, 0, 0); mix.push(0);
      for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NT; j++) {
        const a = i * NT + j, b = (i + 1) * NT + j, c = i * NT + (j + 1) % NT, d = (i + 1) * NT + (j + 1) % NT;
        idx.push(a, b, c, b, d, c);
      }
      for (let j = 0; j < NT; j++) { idx.push((NX - 1) * NT + j, tip, (NX - 1) * NT + (j + 1) % NT); idx.push(cap, j, (j + 1) % NT); }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aMix', new T.Float32BufferAttribute(mix, 1));
      g.setIndex(idx); orient(g); g.computeVertexNormals();
      return keep(g);
    }
    // pinna sottile da un contorno 2D (piano xy, spessore lungo z a lente: 0 sul bordo, t al centro)
    function finGeo(pts, t) {
      let area = 0;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area < 0) pts = pts.slice().reverse();
      const n = pts.length;
      let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= n; cy /= n;
      const pos = [], idx = [];
      for (const p of pts) pos.push(p[0], p[1], 0);
      const inner = pts.map((p) => [cx + (p[0] - cx) * 0.62, cy + (p[1] - cy) * 0.62]);
      for (const sd of [1, -1]) for (const p of inner) pos.push(p[0], p[1], sd * t / 2);
      const F0 = n, B0 = 2 * n;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        idx.push(i, j, F0 + j, i, F0 + j, F0 + i);
        idx.push(i, B0 + j, j, i, B0 + i, B0 + j);
      }
      const tri = T.ShapeUtils.triangulateShape(inner.map((p) => new T.Vector2(p[0], p[1])), []);
      for (const f of tri) { idx.push(F0 + f[0], F0 + f[1], F0 + f[2]); idx.push(B0 + f[0], B0 + f[2], B0 + f[1]); }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      return keep(g);
    }
    function buildFish(sp, scene) {
      const F = FB[sp] || FB.minnow, W = SWP[sp] || SWP.minnow, P = fProf(F);
      const [lx, ly, lz] = F.d, c1 = FX.C[sp + '-1'], c2 = FX.C[sp + '-2'], c3 = FX.C[sp + '-3'];
      const gF = new T.Group(), body = new T.Group(); gF.add(body);
      gF.rotation.order = 'YZX';
      const key = 'f_' + sp;
      const G2 = GEO[key] || (GEO[key] = {});
      const geo = (k, mk) => G2[k] || (G2[k] = mk());
      const OL = 0.009, OLF = 0.006;
      // corpo (pancia più chiara nei vertici, tranne il pagliaccio)
      const bm = mesh(geo('body', () => bodyGeo(F, P, sp !== 'clown')), c1, body, { ol: 0.012 });
      bm.userData.c2 = c2;
      const finMesh = (k, pts, t, col, p, r, sw, ol = OLF) => {
        const m = mesh(geo(k, () => finGeo(pts, t)), col, body, { p, r, ol });
        m.userData.sw = sw || [0, p[0], p[1], p[2]];
        return m;
      };
      // decalcomania sul corpo: fn(u, v) → [x, th]
      const decal = (k, nu, nv, fn, off, col) => mesh(geo(k, () => gridGeo(nu, nv, (u, v) => { const [x, th] = fn(u, v); return P.at(x, th, off); })), col, body);
      // ---- coda: dal peduncolo verso l'esterno ----
      const L = F.tl * ly, Hh = F.th * ly, a = F.ped * ly * 0.85, x0 = -lx + 0.012;
      const tailPts = (shape) => symm(TAILS[shape].map(([x, y], i) => [x * L, i === 0 ? a : y * Hh]));
      const tailCol = FX.C[sp + '-' + FCOL[sp][0]];
      if (F.tail === 'veil2') {
        // coda doppia velata: due ventagli aperti a V, un po' cadenti
        // (ruotati attorno a un asse alto: uniti sopra, aperti sotto, come le code doppie vere)
        const yp = Hh * 0.45;
        [-1, 1].forEach((sd) => { const al = sd * 0.4; finMesh('tail' + sd, tailPts('veil'), 0.012, tailCol, [x0, yp * (1 - Math.cos(al)), -yp * Math.sin(al)], [al, 0, 0], [3, x0, 0, 0]); });
      } else if (F.tail === 'lunate') {
        finMesh('tail', tailPts('lunate'), 0.016, c1, [x0, 0, 0], null, [4, x0, 0, 0], OL);
        // carena sul peduncolo
        mesh(GEO.sphLo, c1, body, { p: [-lx * 0.86, 0, 0], s: [lx * 0.12, ly * 0.1, lz * 0.42] }).userData.sw = [0, 0, 0, 0];
      } else {
        const shape = F.tail === 'small' ? 'round' : F.tail;
        if (sp === 'clown') finMesh('tailB', tailPts('round').map(([x, y]) => [x * 1.08, y * 1.08]), 0.007, c3, [x0 - 0.004, 0, 0], null, [3, x0, 0, 0]);
        finMesh('tail', tailPts(shape), sp === 'clown' ? 0.014 : 0.012, tailCol, [x0, 0, 0], null, [F.tail === 'veil' ? 3 : 0, x0, 0, 0]);
      }
      // ---- dorsale e anale: contorno (u lungo la base dal retro 0 al davanti 1, v altezza sopra la superficie) ----
      const ridge = (k, u0, u1, h, pts, col, down, t = 0.011, border) => {
        const X = (u) => (u0 + (u1 - u0) * u), yS = (u) => (down ? P.bot(Math.max(-1, Math.min(1, X(u)))) : P.top(Math.max(-1, Math.min(1, X(u)))));
        const sg = down ? -1 : 1, sink = 0.22;
        const poly = [[X(1) * lx, yS(1) - sg * sink * h]].concat(pts.map(([u, v]) => [X(u) * lx, yS(u) + sg * v * h]), [[X(0) * lx, yS(0) - sg * sink * h]]);
        const hy = yS(0.5);
        if (border) finMesh(k + 'B', poly.map(([x, y]) => [X(0.5) * lx + (x - X(0.5) * lx) * 1.07, hy + (y - hy) * 1.1]), t * 0.5, border, [0, 0, 0], null, [2, X(0.5) * lx, hy, 0]);
        finMesh(k, poly, t, col, [0, 0, 0], null, [2, X(0.5) * lx, hy, 0]);
      };
      const finC = FX.C[sp + '-' + FCOL[sp][1]], col = (k) => (k === 'f' ? finC : FX.C[sp + '-' + k]);
      for (const [k, u0, u1, h, pts, cc, down, t, bd] of RIDGES[sp]) ridge(k, u0, u1, ly * h, pts, col(cc), down, t, bd && col(bd));
      if (sp === 'tuna') {
        // pinnule gialle su schiena e ventre verso la coda
        const fl = [[0.012, -0.006], [-0.02, 0.026], [-0.026, -0.006]].map(([x, y]) => [x * ly * 6, y * ly * 6]);
        for (let i = 0; i < 6; i++) {
          const x = -0.42 - i * 0.085;
          finMesh('fl', fl, 0.008, c3, [x * lx, P.top(x) - 0.004, 0], null, null, 0.004);
          finMesh('fl2', fl.map(([x2, y]) => [x2, -y]), 0.008, c3, [x * lx, P.bot(x) + 0.004, 0], null, null, 0.004);
        }
      }
      // ---- pettorali (dietro l'opercolo, remano) e ventrali ----
      const pecL = ly * F.pl, pecW = ly * F.pw, pecPts = PEC[sp === 'tuna' ? 'sickle' : 'paddle'];
      const pecX = F.ex - 0.3, pecY = -0.3;
      const pecC = FX.C[sp + '-' + FCOL[sp][2]];
      [-1, 1].forEach((sd) => {
        const th = Math.asin(Math.max(-1, Math.min(1, pecY))), q = P.at(pecX, sd > 0 ? th : Math.PI - th, -0.04);
        if (sp === 'clown') finMesh('pecB', pecPts.map(([x, y]) => [x * pecL * 1.1, y * pecW * 1.12]), 0.006, c3, [q[0], q[1], q[2]], [sd * 0.7, sd * 0.5, 0.3], [1, q[0], q[1], q[2]]);
        finMesh('pec', pecPts.map(([x, y]) => [x * pecL, y * pecW]), 0.011, pecC, [q[0], q[1], q[2]], [sd * 0.7, sd * 0.5, 0.3], [1, q[0], q[1], q[2]]);
        if (sp !== 'puffer' && sp !== 'tuna') {
          const vx = sp === 'catfish' ? -0.05 : 0.02, qv = P.at(vx, sd > 0 ? -1.2 : Math.PI + 1.2, -0.05);
          finMesh('ven', [[0.015, 0.012], [-0.45 * pecL, -0.7 * pecW], [-0.85 * pecL, -0.85 * pecW], [-0.7 * pecL, -0.3 * pecW], [-0.03, -0.012]], 0.009, finC, [qv[0], qv[1], qv[2]], [-sd * 0.45, 0, 0], [2, qv[0], qv[1], qv[2]]);
        }
      });
      // ---- occhioni, guance ----
      [-1, 1].forEach((sd) => {
        const ex = F.ex, ey = F.ey * ly, ek = F.ek * 1.18;
        const hy = P.top(ex), zs = P.w(ex) * lz * Math.sqrt(Math.max(0.05, 1 - (ey / hy) * (ey / hy)));
        const X = ex * lx, Z = sd * zs * 0.84;
        mesh(GEO.sphLo, FX.C.hi, body, { p: [X, ey, Z], s: [ly * 0.28 * ek, ly * 0.3 * ek, ly * 0.17 * ek] });
        mesh(GEO.sphLo, FX.C.eye, body, { p: [X + 0.008, ey, Z + sd * ly * 0.1 * ek], s: [ly * 0.19 * ek, ly * 0.23 * ek, ly * 0.1 * ek] });
        mesh(GEO.sphLo, FX.C.hi, body, { p: [X + 0.026, ey + ly * 0.08 * ek, Z + sd * ly * 0.19 * ek], s: ly * 0.06 * ek });
        const qb = P.at(ex - 0.12, sd > 0 ? -0.35 : Math.PI + 0.35, 0.004);
        mesh(GEO.sphLo, FX.C.blush, body, { p: qb, s: [ly * 0.15, ly * 0.08, 0.012] }).rotation.y = sd * 0.5;
      });
      // ---- dettagli della specie ----
      const rod = (root, dir, len, col) => {
        const v = new T.Vector3(...dir).normalize(), m = mesh(GEO.cyl8, col, body, { s: [0.006, len, 0.006] });
        m.position.set(root[0] + v.x * len / 2, root[1] + v.y * len / 2, root[2] + v.z * len / 2);
        m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v);
      };
      if (sp === 'clown') {
        // tre bande bianche bordate di scuro, curve in avanti sui fianchi
        [[0.3, 0.075, 0.07], [-0.12, 0.1, 0.1], [-0.8, 0.055, 0.02]].forEach(([xc, hw, bend], i) => {
          const fn = (w) => (u, v) => { const th = v * Math.PI * 2, c = Math.cos(th); return [xc + (u * 2 - 1) * w + bend * c * c, th]; };
          decal('bandB' + i, 4, 36, fn(hw + 0.035), 0.012, c3);
          decal('band' + i, 4, 36, fn(hw), 0.024, c2);
        });
      }
      if (sp === 'koi') {
        // macchie rosse sulla schiena (contorno un po' irregolare)
        [[0.48, 1.57, 0.12, 0.55], [0.05, 1.9, 0.2, 0.75], [-0.42, 1.25, 0.15, 0.6], [0.22, 0.75, 0.1, 0.45], [-0.2, 2.5, 0.09, 0.35]].forEach(([cx, ct, ax, at], i) => {
          decal('spot' + i, 4, 20, (u, v) => { const an = v * Math.PI * 2, wob = 1 + 0.18 * Math.sin(an * 3 + i); return [cx + u * ax * wob * Math.cos(an), ct + u * at * wob * Math.sin(an)]; }, 0.012, c3);
        });
        [-1, 1].forEach((sd) => rod([lx * 0.93, -ly * 0.22, sd * lz * 0.22], [0.5, -0.8, sd * 0.35], ly * 0.5, FX.C.ink));
      }
      if (sp === 'minnow') [1, -1].forEach((sd) => decal('stripe' + sd, 14, 3, (u, v) => { const x = -0.78 + u * 1.2, w = 0.09 * Math.sin(Math.PI * u) + 0.02; return [x, (sd > 0 ? 0.12 : Math.PI - 0.12) + (v * 2 - 1) * w]; }, 0.01, c3));
      if (sp === 'catfish') [-1, 1].forEach((sd) => {
        rod([lx * 0.9, -ly * 0.12, sd * lz * 0.3], [0.6, -0.3, sd * 0.75], ly * 1.4, FX.C.ink);
        rod([lx * 0.84, -ly * 0.5, sd * lz * 0.14], [0.3, -1, sd * 0.3], ly * 0.7, FX.C.ink);
      });
      if (sp === 'puffer') for (let i = 0; i < 18; i++) {
        const x = 0.82 - (i + 0.5) / 18 * 1.55, th = i * 2.39996, q = P.at(x, th, -0.03), dir = new T.Vector3(q[0] - x * lx * 0.6, q[1], q[2]).normalize();
        const m = mesh(GEO.cone6, c3, body, { s: [0.028, 0.09, 0.028] }); m.position.set(q[0], q[1], q[2]); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      }
      if (sp === 'golden') {
        const cr = new T.Group(); cr.userData.fixed = true; cr.position.set(lx * 0.3, P.top(0.3) + 0.01, 0); body.add(cr);
        for (let i = 0; i < 3; i++) mesh(GEO.cone6, c3, cr, { p: [(i - 1) * 0.05, 0.05, 0], s: [0.025, 0.09, 0.025], ol: 0.006 });
        mesh(GEO.cyl8, c3, cr, { s: [0.08, 0.03, 0.05] });
      }
      gF.visible = false; scene.add(gF);
      const len = 2 * lx + L;
      const u = { uS1: { value: new T.Vector4(0, 0, 0, 0) }, uS2: { value: new T.Vector4(0, 0, 0, W.ex) }, uK: { value: new T.Vector4(lx, len, W.k, W.head) } };
      const r = Math.random();
      gF.userData = { body, len: lx, sw: { u, p: W, len, ph: r * 6.28, pph: r * 3.1, bph: r * 5, e: 0.4, cb: 0, fm: 0.88 + 0.24 * Math.random(), am: 0.85 + 0.3 * Math.random() } };
      bake(gF, false);
      const [mt, mo] = fishMats(u);
      body.children.forEach((m) => { if (m.isMesh && m.geometry.attributes.aSw) { m.material = m.material.isShaderMaterial ? mo : mt; m.frustumCulled = false; } });
      return gF;
    }
    // nuoto di un pesce: v = spinta 0..1 (velocità), hover = fermo davanti all'esca (lo tengono le pettorali),
    // flee = fuga, turn = velocità di virata (rad/s: il corpo si piega verso l'interno, a C nelle virate brusche),
    // thrash = si dimena (lotta, in mano). Nessun oggetto creato: aggiorna gli uniform del pesce.
    function swimUp(g, dt, v, hover, flee, turn, thrash) {
      const S = g.userData.sw; if (!S) return;
      const W = S.p, U = S.u, TAU = Math.PI * 2;
      S.bph = (S.bph + dt * (0.5 + 0.6 * v) * S.fm * TAU) % (TAU * 50);
      const burst = Math.sin(S.bph) > -0.35 ? 1 : 0.2;          // colpi di coda a impulsi, poi planata
      const tgt = v * burst + flee * 1.2 + thrash;
      S.e += (tgt - S.e) * Math.min(1, dt * (tgt > S.e ? 8 : 3));
      const e = Math.min(1.6, S.e);
      const f = W.f * S.fm * (0.4 + 0.7 * Math.min(1, e) + 0.9 * flee + 1.3 * thrash);
      S.ph = (S.ph + dt * f * TAU) % (TAU * 50);
      const amp = W.a * S.len * S.am * (0.15 + 0.85 * Math.min(1, e) + 0.35 * flee + 0.6 * thrash) * (1 - 0.75 * hover);
      const still = Math.max(hover, 1 - Math.min(1, e * 1.4));
      S.pph = (S.pph + dt * W.pf * S.fm * (0.7 + 0.8 * still) * TAU) % (TAU * 50);
      const cb = Math.max(-0.32, Math.min(0.32, -turn * 0.07)) * S.len;
      S.cb += (cb - S.cb) * Math.min(1, dt * 12);
      U.uS1.value.set(S.ph, amp, S.cb, W.veil * (0.45 + 0.55 * Math.min(1, e)));
      U.uS2.value.set(S.pph, W.pec * (0.2 + 0.8 * still) * (1 - 0.6 * flee), W.fin * (0.4 + 0.6 * Math.min(1, e)), W.ex);
    }
    function splash(p, n = 10, k = 1) {
      if (!FX.R3) return;
      for (let i = 0, j = 0; i < FX.R3.drops.length && j < n; i++) {
        const d = FX.R3.drops[i];
        if (d.life > 0) continue;
        j++;
        const a = Math.random() * Math.PI * 2, sp = (0.8 + Math.random() * 1.6) * k;
        d.m.position.set(p.x, 0.05, p.z); d.v.set(Math.cos(a) * sp, (2 + Math.random() * 2.5) * k, Math.sin(a) * sp);
        d.life = 0.6 + Math.random() * 0.4; d.m.visible = true; d.m.scale.setScalar(0.04 + Math.random() * 0.05 * k);
      }
      ring(p, 1.2 * k);
    }
    function ring(p, max = 1) {
      if (!FX.R3) return;
      const r = FX.R3.rings.find((x) => x.life <= 0) || FX.R3.rings[0];
      r.m.position.set(p.x, 0.04, p.z); r.life = 1; r.max = max; r.m.visible = true;
    }

    return { buildFish, swimUp, splash, ring };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
