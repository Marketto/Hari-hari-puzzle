/* Hari Rally — disegno: misure del canvas e della camera, posa dei kart (la stessa della logica), una vista o le due dello schermo diviso.
 * Parte di rally-ui.js (stesso create()): si carica prima e rally-ui.js la monta con HH.rallyView(RX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // RX = contesto condiviso con rally-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.rallyView = function (RX) {
    const { reduce, PITCH, T, P, EYE_BACK, split, eachView, roadH, V3, updateGround, YAW, buildChunk, DRV, emit,
      burst, updateFx, updateItems } = RX;
    /* ---------- disegno ---------- */

    // a due (schermo diviso o ospite in rete) solo la visuale da dietro: il cofano della visuale pilota è la fragola di Hari
    const chase = () => RX.camPref === 'chase' || split() || RX.mpMode === 'guest';
    function measure() {
      if (!RX.stage) return;
      RX.W = RX.stage.clientWidth || 300; RX.H = RX.stage.clientHeight || 400;
      if (!RX.R3) return;
      RX.R3.renderer.setSize(RX.W, RX.H, false);
      if (split()) {
        // orizzontale: una vista accanto all'altra; verticale: una sopra l'altra (giocatore 1 a sinistra / in alto)
        const side = RX.W >= RX.H, w0 = side ? Math.floor(RX.W / 2) : RX.W, h0 = side ? RX.H : Math.floor(RX.H / 2);
        RX.views.forEach((v, i) => {
          v.rect = side ? { x: i ? w0 : 0, y: 0, w: i ? RX.W - w0 : w0, h: RX.H } : { x: 0, y: i ? h0 : 0, w: RX.W, h: i ? RX.H - h0 : h0 };
          const root = RX.stage.querySelector(`.ry-v[data-v="${i}"]`);
          if (root) Object.assign(root.style, { left: v.rect.x + 'px', top: v.rect.y + 'px', width: v.rect.w + 'px', height: v.rect.h + 'px' });
        });
        RX.wrap.classList.toggle('ry-side', side);
        eachView((i) => measureCam(RX.views[i].rect.w, RX.views[i].rect.h));
      } else {
        RX.R3.renderer.setScissorTest(false);
        measureCam(RX.W, RX.H);
      }
      if (!RX.raf) draw(0);
    }
    function measureCam(w, h) {
      RX.R3.camera.aspect = w / h;
      // da dietro un campo visivo un po' più stretto (il kart resta grande), da pilota più largo
      RX.baseFov = chase() ? (w / h < 1 ? 68 : w / h > 1.7 ? 52 : 58) : (w / h < 1 ? 74 : w / h > 1.7 ? 58 : 64);
      RX.R3.camera.fov = RX.baseFov + RX.fovK * 9;
      RX.R3.camera.updateProjectionMatrix();
      // il bordo del cofano (2,9 m davanti) cade al 65% dell'altezza (sopra il cruscotto), qualunque sia il campo visivo
      const a = Math.atan(0.3 * Math.tan((RX.baseFov * Math.PI) / 360)) + PITCH;
      RX.R3.hoodY = -2.9 * Math.tan(a) + 0.5;
    }
    // altezza del saltino (dossi) o del salto a molla (più alto, per vedere la molla)
    const hopOf = (c) => { if (!(c.air > 0 && c.airT > 0)) return 0; const k = 1 - c.air / c.airT; return 4 * c.airT * (c.spr ? 1.6 : 1.1) * k * (1 - k); };
    const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
    // kart: posa = rettangolo di collisione (P.pose, la stessa della logica), quota della strada, sospensioni, pilota
    const M0 = new T.Matrix4(), Q0 = new T.Quaternion(), V0 = new T.Vector3(), S0 = new T.Vector3(), UPV = new T.Vector3(0, 1, 0);
    function placeKart(id, now, dt, rm, show) {
      const c = RX.s.cars[id], m = RX.R3.karts[id], U = m.userData, Pz = P.pose(RX.g, c);
      const h0 = roadH(c.s, c.d, Pz.x, Pz.y), hp = hopOf(c), vm = RX.cfg.vmax, sp = Math.min(1.3, Math.abs(c.v) / vm);
      // nuvoletta: il kart sale in cielo, sparisce un attimo e ricompare posato sulla strada
      let lift = 0;
      if (c.res > 0) { const k = 1 - c.res / P.RESCUE; lift = (k < 0.5 ? k : 1 - k) * 2 * 2.4; }
      m.position.set(Pz.x, h0 + hp + lift, -Pz.y);
      m.rotation.set(0, YAW(Pz.h), 0);
      m.visible = show && !(c.res > 0 && Math.abs(c.res - P.RESCUE / 2) < 0.12);
      const far = id !== RX.ME && Math.abs(c.s - RX.s.cars[RX.ME].s) > (split() ? 24 : 32);
      U.sus.visible = !far; U.lod.visible = far;
      // sospensioni: rimbalzo (più forte fuori strada), inclinazione in curva, beccheggio in frenata e in accelerazione
      const bounce = rm ? 0 : Math.sin(now * 11 + U.ph) * 0.03 * sp + (c.off ? Math.abs(Math.sin(now * 19 + U.ph)) * 0.07 * sp : 0);
      const lean = cl(-c.kc * c.v * c.v * 0.004, -0.07, 0.07) - P.bankAt(RX.g, c.s);
      const pitch = id !== RX.ME ? 0 : (RX.brakeOn && c.v > 2 ? 0.035 : RX.gasOn && c.v < RX.cfg.vmax * 0.6 ? -0.02 : 0);
      const wob = c.slip > 0 && !rm ? Math.sin((1 - c.slip / P.PU.slipT) * Math.PI * 4) * 0.05 : 0;
      U.sus.position.y = bounce;
      U.sus.rotation.set(rm ? 0 : pitch, wob, rm ? 0 : lean);
      // la foglia sventola con la velocità; il pilota si inclina verso l'interno, gira la testa sulla buccia, festeggia
      if (!far && !rm) {
        U.leafG.rotation.set(-0.15 + Math.sin(now * (6 + 8 * sp) + U.ph) * (0.08 + 0.18 * sp), 0, Math.sin(now * 4 + U.ph) * 0.06);
        const party = c.fin >= 0 && RX.s.res && RX.s.res.findIndex((r) => r.id === id) < 3;
        const spin = c.slip > 0 ? (1 - c.slip / P.PU.slipT) * Math.PI * 2 : 0;
        U.drvG.position.y = DRV[1] + (party ? Math.abs(Math.sin(now * 7 + U.ph)) * 0.35 : 0);
        U.drvG.rotation.set(party ? Math.sin(now * 7) * 0.15 : 0, spin + (party ? Math.sin(now * 3.5) * 0.5 : 0), cl(lean * 3, -0.25, 0.25) + (party ? Math.sin(now * 7 + 1) * 0.2 : 0));
      }
      U.spring.visible = !!(c.spr && c.air > 0);
      if (U.spring.visible) U.spring.scale.y = Math.max(0.15, hp * 0.85);
      U.bubble.visible = c.sh > 0;
      // ombra sulla strada (resta giù nei salti)
      const sk = c.res > 0 ? 0.001 : 1 / (1 + (hp + lift) * 0.35);
      M0.compose(V0.set(Pz.x, h0 + 0.05, -Pz.y), Q0.setFromAxisAngle(UPV, YAW(Pz.h)), S0.set(P.CAR_W * 0.56 * sk, 1, P.CAR_L * 0.52 * sk));
      RX.R3.shadow.setMatrixAt(id, show ? M0 : M0.makeScale(0, 0, 0));
      return { Pz, h0, hp, lift };
    }
    // una vista sola, oppure le due dello schermo diviso (ognuna nel suo rettangolo dello stesso canvas)
    function draw(dt) {
      if (!RX.R3 || !RX.R3.scene || !RX.s) return;
      RX.fno++;
      if (!split()) { drawView(dt, 0); return; }
      RX.R3.renderer.setScissorTest(true);
      eachView((i) => drawView(dt, i));
    }
    function drawView(dt, pass) {
      const p = RX.s.cars[RX.ME], cam = RX.R3.camera, now = performance.now() / 1000, rm = reduce(), ch = chase(), two = split();
      const vm = RX.cfg.vmax, sp = Math.min(1.3, Math.abs(p.v) / vm);
      // kart (anche quello di chi guarda, da dietro); posa disegnata = posa della logica
      const KP = [];
      for (let id = 0; id < 4; id++) KP[id] = placeKart(id, now, dt, rm, id !== RX.ME ? Math.abs(RX.s.cars[id].s - p.s) < RX.R3.fogFar + 20 : ch);
      RX.R3.shadow.instanceMatrix.needsUpdate = true;
      const H0 = KP[RX.ME], w = P.world(RX.g, p.s, p.d), h0 = H0.h0, hop = H0.hp;
      // direzione morbida (per la camera e la luce)
      const slipK = p.slip > 0 ? 1 - p.slip / P.PU.slipT : 0, wob = p.slip > 0 && !rm ? Math.sin(slipK * Math.PI * 2) * 0.55 * (1 - slipK * 0.5) : 0;
      const hdg = H0.Pz.h + (ch ? 0 : wob);
      if (RX.hdgS === null || !(dt > 0) || p.res > 0) RX.hdgS = hdg; else RX.hdgS += wrapA(hdg - RX.hdgS) * Math.min(1, dt * (ch ? 5 : 14));
      if (RX.shake > 0) RX.shake = Math.max(0, RX.shake - (dt || 0.016) * 2.5);
      const jig = rm ? 0 : RX.shake * 0.5 + (p.off ? 0.06 * sp : 0);
      let ex, ey, eh;
      if (ch) {
        // terza persona: dietro e sopra il kart, inseguimento con una molla smorzata (critica), si allontana un po' in velocità
        const back = 5.8 + 1.4 * sp, up = 2.55 + 0.35 * sp;
        const tx = H0.Pz.x - Math.cos(RX.hdgS) * back, ty = H0.Pz.y - Math.sin(RX.hdgS) * back, tz = h0 + hop * 0.6 + H0.lift * 0.3 + up;
        if (!RX.CH.ok || !(dt > 0) || Math.hypot(RX.CH.x - tx, RX.CH.y - ty) > 25) { Object.assign(RX.CH, { x: tx, y: ty, z: tz, vx: 0, vy: 0, vz: 0, ok: true }); }
        else {
          const ww = 7.5, d2 = Math.min(dt, 0.05);
          for (const [k, vk, t] of [['x', 'vx', tx], ['y', 'vy', ty], ['z', 'vz', tz]]) { RX.CH[vk] += (ww * ww * (t - RX.CH[k]) - 2 * ww * RX.CH[vk]) * d2; RX.CH[k] += RX.CH[vk] * d2; }
        }
        // mai sotto il terreno (dossi, colline)
        const gh = Math.max(roadH(Math.max(0, p.s - back), 0, RX.CH.x, RX.CH.y), h0) + 1.1;
        if (RX.CH.z < gh) { RX.CH.z = gh; RX.CH.vz = Math.max(0, RX.CH.vz); }
        ex = RX.CH.x; ey = RX.CH.y; eh = RX.CH.z;
        const sh = jig ? (Math.random() - 0.5) * jig : 0;
        cam.position.set(ex + sh * 0.6, eh + (rm ? 0 : sh * 0.5 + (p.off ? Math.sin(now * 23) * 0.05 * sp : 0)), -ey);
        const lk = 6 + 3 * sp;
        cam.lookAt(V3(H0.Pz.x + Math.cos(RX.hdgS) * lk, h0 + hop * 0.5 + H0.lift * 0.6 + 0.9, H0.Pz.y + Math.sin(RX.hdgS) * lk));
        // leggera inclinazione nelle curve (verso l'interno)
        const roll = cl(-p.kc * p.v * p.v * 0.0022, -0.045, 0.045) + P.bankAt(RX.g, p.s) * 0.5;
        RX.camRoll += (roll - RX.camRoll) * Math.min(1, (dt || 0.016) * 4);
        if (!rm) cam.rotateZ(RX.camRoll + (jig ? (Math.random() - 0.5) * jig * 0.05 : 0));
      } else {
        // visuale pilota: occhio un po' dietro il centro, il bordo del cofano è il muso del rettangolo di collisione
        const ah = H0.Pz.h + p.bet * 0.6;
        ex = H0.Pz.x - Math.cos(ah) * EYE_BACK; ey = H0.Pz.y - Math.sin(ah) * EYE_BACK;
        const shk = rm ? 0 : (p.off ? 0.05 : 0.012) * sp + RX.shake * 0.15;
        eh = h0 + 1.15 + hop + H0.lift + (rm ? 0 : Math.sin(now * 19) * shk);
        cam.position.set(ex, eh, -ey);
        const aw = P.world(RX.g, p.s + 12, p.d), hA = roadH(p.s + 12, p.d, aw.x, aw.y);
        cam.lookAt(V3(ex + Math.cos(RX.hdgS) * 12, h0 + 1.15 + (hA - h0) * 0.85 - 12 * Math.tan(PITCH) + hop * 0.5 + H0.lift, ey + Math.sin(RX.hdgS) * 12));
        const roll = Math.max(-0.06, Math.min(0.06, p.kc * p.v * p.v * 0.0032)) + P.bankAt(RX.g, p.s) + (rm ? 0 : wob * 0.12);
        RX.camRoll += (roll - RX.camRoll) * Math.min(1, (dt || 0.016) * 6);
        if (!rm) cam.rotateZ(RX.camRoll + (p.off ? (Math.random() - 0.5) * 0.012 * sp : 0));
      }
      if (RX.R3.hood) { RX.R3.hood.visible = !ch; RX.R3.hood.position.y = (RX.R3.hoodY || 0) + (rm ? 0 : Math.sin(now * 23) * 0.006 * sp); }
      // turbo e mini-spinta: il campo visivo si allarga
      const fk = (p.boost > 0 || p.mini > 0) && !rm ? (p.boost > 0 ? 1 : 0.6) : 0;
      RX.fovK += (fk - RX.fovK) * Math.min(1, (dt || 0.016) * 5);
      if (Math.abs(cam.fov - (RX.baseFov + RX.fovK * 9)) > 0.05) { cam.fov = RX.baseFov + RX.fovK * 9; cam.updateProjectionMatrix(); }
      const eye = cam.position;
      // cielo segue la camera; la luce principale arriva da dietro-sinistra-alto rispetto a chi guida (niente controluce)
      RX.R3.sky.position.copy(eye);
      if (RX.R3.sea) { RX.R3.sea.position.x = eye.x; RX.R3.sea.position.z = eye.z; }
      const fx = Math.cos(RX.hdgS), fz = -Math.sin(RX.hdgS);
      RX.R3.sun.position.set(eye.x - fx * 60 + fz * 35, eye.y + 80, eye.z - fz * 60 - fx * 35);
      RX.R3.sun.target.position.copy(eye);
      updateGround(ex + Math.cos(RX.hdgS) * 90, ey + Math.sin(RX.hdgS) * 90);
      // blocchi di scenario: costruisce il prossimo (uno per fotogramma) e mostra solo quelli vicini
      // (al massimo un blocco per fotogramma, anche con due viste)
      const ahead = p.s + 320;
      if (RX.R3.bf !== RX.fno) for (const chk of RX.R3.chunks) {
        if (!chk.grp && chk.a < ahead && chk.b > p.s - 80) { buildChunk(chk); RX.R3.bf = RX.fno; break; }
      }
      // da dietro la camera è più alta e vede più lontano: nebbia un po' più vicina e dettagli che calano prima
      // (sullo schermo diviso ancora un po': due viste da disegnare)
      const fogF = RX.R3.fogFar * (ch ? 0.88 : 1) * (two ? 0.85 : 1);
      if (RX.R3.scene.fog && Math.abs(RX.R3.scene.fog.far - fogF) > 0.5) RX.R3.scene.fog.far = fogF;
      for (const chk of RX.R3.chunks) {
        if (!chk.grp) continue;
        const dd = Math.hypot(chk.x - w.x, chk.y - w.y);
        chk.grp.visible = dd < fogF + chk.rad;
        // LOD semplice: i blocchi lontani mostrano alberi e cespugli senza dettagli
        const isFar = dd - chk.rad * 0.6 > (ch ? 72 : 85) * (two ? 0.7 : 1);
        if (chk.isFar !== isFar) { chk.isFar = isFar; for (const m of chk.near) m.visible = !isFar; for (const m of chk.far) m.visible = isFar; }
      }
      // animazioni dello scenario (animaletti, pubblico, barche, faro) solo nei blocchi vicini
      if (!rm) for (const an of RX.R3.anim) if (!an.ch || (an.ch.grp && an.ch.grp.visible && Math.hypot(an.ch.x - w.x, an.ch.y - w.y) < 200)) an.fn(now);
      // gabbiani
      if (RX.R3.gulls) RX.R3.gulls.forEach((gl, i) => {
        const an = now * (0.25 + i * 0.04) + i * 1.3, rr = 22 + i * 7, cx = ex + Math.cos(RX.hdgS) * 40, cy = ey + Math.sin(RX.hdgS) * 40;
        gl.position.set(cx + Math.cos(an) * rr, eye.y + 12 + i * 2.5 + Math.sin(now * 2 + i) * 0.6, -(cy + Math.sin(an) * rr));
        gl.rotation.set(0, -an + Math.PI, Math.sin(now * 6 + i) * 0.25);
      });
      // fanalini e faretti che brillano al buio; polvere, scintille, petali dietro i kart
      const tails = RX.R3.tails ? RX.R3.tails.geometry.attributes.position : null, heads = RX.R3.heads ? RX.R3.heads.geometry.attributes.position : null;
      const hl = P.CAR_L / 2;
      for (let id = 0; id < 4; id++) {
        const c = RX.s.cars[id], Pz = KP[id].Pz, ht = KP[id].h0 + KP[id].hp + KP[id].lift, m = RX.R3.karts[id];
        const nx = -Math.sin(Pz.h), ny = Math.cos(Pz.h), cx = Math.cos(Pz.h), cy = Math.sin(Pz.h);
        const vis = m.visible ? 1 : 0;
        if (tails) for (const [k, sd] of [[0, -0.42], [1, 0.42]]) tails.setXYZ(id * 2 + k, Pz.x - cx * (hl - 0.15) + nx * sd, ht + 0.5 - (1 - vis) * 999, -(Pz.y - cy * (hl - 0.15) + ny * sd));
        if (heads) for (const [k, sd] of [[0, -0.42], [1, 0.42]]) heads.setXYZ(id * 2 + k, Pz.x + cx * (hl - 0.1) + nx * sd, ht + 0.52 - (1 - vis) * 999, -(Pz.y + cy * (hl - 0.1) + ny * sd));
        if (!(dt > 0) || rm || !vis || (id !== RX.ME && !U_near(c, p))) continue;
        // schermo diviso: le particelle dei kart vicini al giocatore 1 sono già partite nella prima vista
        if (pass && U_near(c, RX.s.cars[RX.views[0].ME])) continue;
        const bx = Pz.x - cx * (hl + 0.1), by = Pz.y - cy * (hl + 0.1);
        const dust = (c.off ? 22 : 0) + (Math.abs(c.bet) > 0.1 ? 18 : 0) + (c.v > 9 ? 4 : 0);
        if (dust && Math.random() < dt * dust) emit(bx + (Math.random() - 0.5) * 1.4, ht + 0.25, -by, (Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2, c.off ? (RX.cfg.theme === 'snow' ? RX.C.snowbank : RX.cfg.theme === 'sea' ? RX.C.sand : RX.cfg.theme === 'city' ? RX.C.dust : RX.C.dirt) : RX.C.dust, 0.8, c.off ? 0.7 : 0.4);
        // derapata: scintille dalle ruote dietro (gialle, poi arancioni quando la mini-spinta è carica)
        if (c.dr > 0 && Math.random() < dt * 40) { const sd = (Math.random() < 0.5 ? -1 : 1) * 0.72; emit(bx + nx * sd, ht + 0.2, -(by + ny * sd), (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, c.dr >= P.DRIFT.t1 ? RX.C.carrot : RX.C.spark, 0.35, 1); }
        if ((c.boost > 0 || c.mini > 0) && Math.random() < dt * 30) emit(bx, ht + 0.5, -by, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, Math.random() < 0.5 ? RX.C.carrot : RX.C.spark, 0.5, 1);
        if (c.slow > 0 && Math.random() < dt * 20) emit(Pz.x + (Math.random() - 0.5) * 2, ht + 2 + Math.random(), -Pz.y + (Math.random() - 0.5) * 2, 0, -0.5, 0, RX.C.petal, 0.7, 1);
        if (c.res > 0 && Math.random() < dt * 40) emit(Pz.x + (Math.random() - 0.5) * 2.4, ht + 0.2 + Math.random(), -Pz.y + (Math.random() - 0.5) * 2.4, (Math.random() - 0.5), 0.4, (Math.random() - 0.5), Math.random() < 0.5 ? RX.C['petal-2'] : RX.C.petal, 0.9, 1);
      }
      if (tails) tails.needsUpdate = true;
      if (heads) heads.needsUpdate = true;
      // visuale pilota: scintille del turbo e petali davanti al parabrezza
      if (dt > 0 && !rm && !ch && !pass) {
        if (p.boost > 0 && Math.random() < dt * 25) burst('carrot', null, 1);
        if (p.slow > 0 && Math.random() < dt * 14) burst('petal', null, 1);
      }
      updateItems(now, p);
      if (!pass) updateFx(dt || 0);
      if (two) {
        // il suo rettangolo del canvas, il suo terreno, i fari sulla sua camera
        const r = RX.views[RX.VI].rect || { x: 0, y: 0, w: RX.W, h: RX.H };
        RX.R3.renderer.setViewport(r.x, RX.H - r.y - r.h, r.w, r.h);
        RX.R3.renderer.setScissor(r.x, RX.H - r.y - r.h, r.w, r.h);
        for (const v of RX.views) if (v.ground && v.ground !== RX.R3.ground) v.ground.m.visible = false;
        RX.R3.ground.m.visible = true;
        if (RX.R3.head && RX.R3.head.parent !== cam) cam.add(RX.R3.head, RX.R3.head.target);
      }
      RX.R3.renderer.render(RX.R3.scene, cam);
      if (!pass) RX.lastDrawn = KP;
    }
    const U_near = (c, p) => Math.abs(c.s - p.s) < 60;

    return { chase, measure, placeKart, draw };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
