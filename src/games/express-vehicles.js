/* Hari Express — mezzi 3D: bus, furgoni della posta, camion, locomotive "Castagna" e "Fragola", vagoni con la merce
 * sopra (forma propria per ogni merce). Tutto a istanze: un pugno di draw call per tutti i mezzi, qualunque sia il
 * numero (al massimo 80 su telefono, 200 su PC). Faccine kawaii SUL LATO della cabina (una texture disegnata coi token).
 * Ogni fotogramma si aggiornano solo le matrici (oggetti riusati, niente allocazioni); i colori quando cambia l'elenco.
 * Montato da express-ui.js: HH.expressVehicles(X) → funzioni.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.expressVehicles = function (X) {
    const T = X.T, S = HH.expressSim;
    // parti di ogni carrozza nel suo sistema (x avanti, y su, z di lato); g = geometria, c = colore, s = scala
    const P = (g, c, p, s, r) => ({ g, c, p, s, r: r || [0, 0, 0] });
    const BASE = P('box', 'base', [0, 0.02, 0], [0.42, 0.05, 0.2]);
    const FACE = (x, y, s, z = 0.128) => [P('face', null, [x, y, z], [s, s, 1], [0, 0, 0]), P('face', null, [x, y, -z], [s, s, 1], [0, Math.PI, 0])];
    const PARTS = {
      bus: [BASE, P('cap', 'bus', [0, 0.17, 0], [0.24, 0.24, 0.25]), P('boxC', 'glass', [-0.04, 0.21, 0], [0.3, 0.07, 0.255]), ...FACE(0.15, 0.17, 0.13)],
      mail: [BASE, P('cap', 'mail', [0, 0.16, 0], [0.22, 0.22, 0.24]), P('boxC', 'c-mail', [-0.06, 0.17, 0], [0.18, 0.1, 0.25]), ...FACE(0.14, 0.17, 0.12, 0.124)],
      truck: [BASE, P('cap', 'truck', [0.13, 0.15, 0], [0.1, 0.22, 0.22]), P('box', 'wagon', [-0.08, 0.05, 0], [0.26, 0.05, 0.22]), ...FACE(0.13, 0.17, 0.12, 0.116)],
      castagna: [BASE, P('cap', 'loco', [0.04, 0.16, 0], [0.17, 0.19, 0.2]), P('box', 'loco', [-0.15, 0.05, 0], [0.14, 0.24, 0.22]),
        P('box', 'loco-2', [-0.15, 0.29, 0], [0.17, 0.03, 0.25]), P('cylLo', 'loco-2', [0.15, 0.22, 0], [0.035, 0.12, 0.035]), ...FACE(-0.15, 0.17, 0.12, 0.116)],
      fragola: [BASE, P('cap', 'toy-1', [0, 0.17, 0], [0.24, 0.22, 0.24]), P('boxC', 'glass', [0.12, 0.22, 0], [0.12, 0.07, 0.245]), ...FACE(0.12, 0.15, 0.13)],
      wagon: [BASE, P('box', 'wagon', [0, 0.05, 0], [0.42, 0.05, 0.22])],
      coach: [BASE, P('cap', 'c-pax', [0, 0.16, 0], [0.2, 0.2, 0.22]), P('boxC', 'glass', [0, 0.19, 0], [0.32, 0.07, 0.225])],
      mailcar: [BASE, P('cap', 'c-mail', [0, 0.16, 0], [0.2, 0.2, 0.22]), P('boxC', 'face', [0, 0.17, 0], [0.18, 0.08, 0.225])],
    };
    // merce sopra il cassone (solo se carico)
    const CARGO = {
      milk: [P('cylLo', 'c-milk', [-0.09, 0.1, 0], [0.06, 0.13, 0.06]), P('cylLo', 'c-milk', [0.09, 0.1, 0], [0.06, 0.13, 0.06])],
      cheese: [P('wedge', 'c-cheese', [-0.05, 0.1, 0], [0.13, 0.1, 0.13], [0, 0.3, 0]), P('wedge', 'c-cheese', [0.1, 0.1, 0], [0.12, 0.09, 0.12], [0, 2.4, 0])],
      grain: [P('sphLo', 'c-grain', [0, 0.14, 0], [0.17, 0.07, 0.1])],
      bread: [P('cap', 'c-bread', [-0.08, 0.15, 0], [0.06, 0.07, 0.08]), P('cap', 'c-bread', [0.08, 0.15, 0], [0.06, 0.07, 0.08])],
      wood: [P('cylLo', 'c-wood', [-0.18, 0.13, -0.05], [0.045, 0.36, 0.045], [0, 0, -Math.PI / 2]), P('cylLo', 'c-wood', [-0.18, 0.13, 0.05], [0.045, 0.36, 0.045], [0, 0, -Math.PI / 2]),
        P('cylLo', 'c-wood', [-0.18, 0.2, 0], [0.045, 0.36, 0.045], [0, 0, -Math.PI / 2])],
      toys: [P('boxC', 'toy-1', [-0.1, 0.15, 0], [0.09, 0.09, 0.09]), P('sph', 'toy-2', [0.03, 0.15, 0], [0.05, 0.05, 0.05]), P('boxC', 'toy-3', [0.12, 0.15, 0], [0.08, 0.08, 0.08])],
    };
    const GEOS = ['box', 'boxC', 'cap', 'cylLo', 'sph', 'sphLo', 'wedge', 'face'];
    const OUTL = { cap: 0.014, box: 0.012 };
    const local = new Map();
    function partMatrix(pt) {
      let m = local.get(pt);
      if (!m) {
        m = new T.Matrix4().compose(new T.Vector3(...pt.p), new T.Quaternion().setFromEuler(new T.Euler(pt.r[0], pt.r[1], pt.r[2])), new T.Vector3(...pt.s));
        local.set(pt, m);
      }
      return m;
    }
    // faccina: occhi, guance, sorriso, disegnata una volta su una tela coi colori dei token
    function faceTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), C = X.C, hex = (k) => '#' + C[k].getHexString();
      g.fillStyle = hex('face'); g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = hex('eye'); for (const x of [20, 44]) { g.beginPath(); g.arc(x, 28, 6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#' + C.face.getHexString(); for (const x of [22, 46]) { g.beginPath(); g.arc(x, 25.5, 2.2, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = hex('blush'); for (const x of [12, 52]) { g.beginPath(); g.ellipse(x, 39, 6, 3.5, 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = hex('eye'); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(32, 36, 5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
      return X.keep(t);
    }
    let pools = null, key = '', maxV = 80, list = [], tinted = [], skyN = -1;
    // davanti di ogni testa (x del muso, altezza dei fari, mezza distanza fra i fari)
    const LIGHTS = { bus: [0.245, 0.11, 0.08], mail: [0.225, 0.1, 0.075], truck: [0.235, 0.1, 0.075], castagna: [0.215, 0.12, 0.07], fragola: [0.245, 0.1, 0.08] };
    const LAMP_S = new T.Vector3(0.028, 0.028, 0.028);
    // colori dei materiali senza luce e fari, quando cambia la luce del giorno
    function sky() {
      const k = X.sky;
      if (!k || !pools) return;
      const q = Math.round(k.night * 200);
      if (q === skyN) return;
      skyN = q;
      for (const [m, c] of tinted) m.color.copy(c).multiply(k.tint);
      pools.lamp.visible = k.lit > 0.05;
      pools.lamp.material.color.copy(X.C.lamp).multiplyScalar(0.55 + 0.45 * k.lit);
    }
    const SLOTS = { box: 3, boxC: 3, cap: 2, cylLo: 3, sph: 1, sphLo: 1, wedge: 2, face: 2 };
    function build() {
      maxV = X.maxVehicles();
      const g = X.R3.veh;
      for (const c of g.children.slice()) { g.remove(c); if (c.isInstancedMesh) c.dispose(); }
      const GEO = X.GEO, cars = maxV * 4;
      if (!GEO.face) GEO.face = X.keep(new T.PlaneGeometry(1, 1).rotateY(0).translate(0, 0, 0));
      const faceMat = X.keep(new T.MeshBasicMaterial({ map: faceTexture(), alphaTest: 0.5, transparent: false }));
      tinted = [[faceMat, new T.Color(1, 1, 1)]];
      pools = {};
      for (const k of GEOS) {
        const geo = k === 'face' ? GEO.face : GEO[k];
        const m = X.inst(geo, k === 'face' ? faceMat : X.icToon(), cars * SLOTS[k]);
        g.add(m); pools[k] = m;
        if (OUTL[k]) g.add(X.withOutline(m, OUTL[k]));
      }
      // fumo della locomotiva: palline che salgono e svaniscono (un insieme fisso)
      const puff = X.inst(GEO.sphLo, X.basic(X.C.steam, { transparent: true, opacity: 0.85, depthWrite: false }), maxV * 3);
      g.add(puff); pools.puff = puff;
      tinted.push([puff.material, X.C.steam.clone()]);
      // fari: due palline luminose davanti alla testa di ogni mezzo, solo di sera e di notte (un'unica draw call)
      const lamp = X.inst(GEO.sphLo, X.basic(X.C.lamp), maxV * 2);
      lamp.visible = false;
      g.add(lamp); pools.lamp = lamp;
      key = ''; skyN = -1;
    }
    const M = new T.Matrix4(), CM = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3(1, 1, 1), E = new T.Euler(0, 0, 0, 'YXZ'), TP = {}, TP2 = {};
    // elenco delle carrozze: [{ v, k (0 = testa), kind, cargo }]
    function carsOf(v) {
      if (!S.isTrain(v)) return [{ kind: v.type, cargo: v.type === 'truck' ? v.cargo : null }];
      const out = [{ kind: v.type, cargo: null }];
      for (const c of v.cars) out.push({ kind: c === 'pax' ? 'coach' : c === 'mail' ? 'mailcar' : 'wagon', cargo: c === 'pax' || c === 'mail' ? null : c });
      return out;
    }
    function relist() {
      const s = X.s;
      list = [];
      for (const v of s.veh.slice(0, maxV)) {
        const cs = carsOf(v);
        cs.forEach((c, k) => list.push({ v, k, kind: c.kind, cargo: c.cargo, full: c.cargo && v.ld[c.cargo] && v.ld[c.cargo][0] > 0 }));
      }
      // colori: per ogni geometria, nell'ordine in cui le parti verranno scritte
      const cnt = {};
      for (const k of GEOS) cnt[k] = 0;
      for (const it of list) {
        for (const pt of PARTS[it.kind]) { if (pt.c) pools[pt.g].setColorAt(cnt[pt.g], X.C[pt.c]); cnt[pt.g]++; }
        if (it.full) for (const pt of CARGO[it.cargo]) { pools[pt.g].setColorAt(cnt[pt.g], X.C[pt.c]); cnt[pt.g]++; }
      }
      for (const k of GEOS) { const m = pools[k]; m.count = Math.min(cnt[k], m.instanceMatrix.count); if (m.instanceColor) m.instanceColor.needsUpdate = true; if (m.userData.ol) m.userData.ol.count = m.count; }
    }
    function listKey() {
      let k = '';
      for (const v of X.s.veh) { k += v.id + (v.cars ? v.cars.join('') : v.cargo) + ':'; for (const c in v.ld) k += v.ld[c][0] > 0 ? c[0] : ''; k += ';'; }
      return k;
    }
    // posizione di una carrozza a `back` caselle dietro la testa (+ avanzamento tra un passo e l'altro)
    function place(v, back, lead) {
      const a = S.along(v, Math.max(0, back - lead));
      const q = Math.min(1, a.q + (back - lead < 0 ? lead - back : 0));
      S.tilePos(X.W.w, a.t, a.a, a.b, q, TP);
      return TP;
    }
    function update(frac, time) {
      if (!pools) return;
      const k = listKey();
      if (k !== key) { key = k; relist(); }
      const cnt = {};
      for (const g of GEOS) cnt[g] = 0;
      let puffs = 0;
      sky();
      const night = !!X.sky && X.sky.night >= 0.5, lights = pools.lamp.visible;
      let lamps = 0;
      for (const it of list) {
        const v = it.v, train = S.isTrain(v);
        const lead = v.mode === 'go' && v.pt.length ? (S.VT[v.type].spd / S.TPD) * frac : 0;
        const back = train ? 0.25 + 0.5 * it.k : 0.25;
        const p = place(v, back, lead);
        let x = p.x, z = p.y, h = p.h;
        // su strada si tiene la destra: i mezzi che si incrociano non si sovrappongono
        if (!train) { x += -Math.sin(h) * -0.13; z += Math.cos(h) * -0.13; x -= 0; }
        const y = X.hR(x, z);
        // beccheggio dalle altezze davanti e dietro
        const fx = x + Math.cos(h) * 0.18, fz = z + Math.sin(h) * 0.18, bx = x - Math.cos(h) * 0.18, bz = z - Math.sin(h) * 0.18;
        const pitch = Math.atan2(X.hR(fx, fz) - X.hR(bx, bz), 0.36);
        const bob = v.mode === 'go' ? Math.sin(time * 14 + v.id * 1.7 + it.k) * 0.006 : 0;
        E.set(0, -h, pitch); Q.setFromEuler(E);
        V.set(x, y + 0.01 + bob, z); SC.set(1, 1, 1);
        CM.compose(V, Q, SC);
        const parts = PARTS[it.kind];
        for (const pt of parts) { const pool = pools[pt.g]; if (cnt[pt.g] < pool.instanceMatrix.count) { M.multiplyMatrices(CM, partMatrix(pt)); pool.setMatrixAt(cnt[pt.g], M); } cnt[pt.g]++; }
        if (it.full) for (const pt of CARGO[it.cargo]) { const pool = pools[pt.g]; if (cnt[pt.g] < pool.instanceMatrix.count) { M.multiplyMatrices(CM, partMatrix(pt)); pool.setMatrixAt(cnt[pt.g], M); } cnt[pt.g]++; }
        if (lights && it.k === 0 && LIGHTS[it.kind] && lamps + 2 <= pools.lamp.instanceMatrix.count) {
          const [lx, ly, lz] = LIGHTS[it.kind];
          for (const sz of [-lz, lz]) { V.set(lx, ly, sz).applyMatrix4(CM); M.compose(V, Q, LAMP_S); pools.lamp.setMatrixAt(lamps++, M); }
        }
        // fumo della vaporiera in marcia
        if (it.k === 0 && v.type === 'castagna' && v.mode === 'go' && puffs + 3 <= pools.puff.instanceMatrix.count) {
          for (let j = 0; j < 3; j++) {
            const ph = (time * 0.9 + j / 3 + v.id * 0.37) % 1;
            V.set(0.15, 0.36 + ph * 0.5, 0).applyMatrix4(CM); V.x -= Math.cos(h) * ph * 0.25; V.z -= Math.sin(h) * ph * 0.25;
            SC.setScalar(0.05 + ph * 0.09 * (night ? 0.8 : 1)); M.compose(V, Q, SC);
            pools.puff.setMatrixAt(puffs++, M);
          }
        }
      }
      for (const g of GEOS) pools[g].instanceMatrix.needsUpdate = true;
      pools.puff.count = puffs; pools.puff.instanceMatrix.needsUpdate = true;
      pools.lamp.count = lamps; if (lamps) pools.lamp.instanceMatrix.needsUpdate = true;
    }
    // il mezzo più vicino a un punto (per toccarlo)
    function pick(x, z) {
      let best = null, bd = 0.55;
      for (const v of X.s.veh) {
        const n = S.isTrain(v) ? 1 + v.cars.length : 1;
        for (let k = 0; k < n; k++) {
          S.tilePos(X.W.w, ...(() => { const a = S.along(v, 0.25 + 0.5 * k); return [a.t, a.a, a.b, a.q]; })(), TP2);
          const d = Math.hypot(TP2.x - x, TP2.y - z);
          if (d < bd) { bd = d; best = v; }
        }
      }
      return best;
    }
    function headPos(v) { const a = S.along(v, 0.25); S.tilePos(X.W.w, a.t, a.a, a.b, a.q, TP2); return { x: TP2.x, z: TP2.y }; }
    return { build, update, pick, headPos, PARTS };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
