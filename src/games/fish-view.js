/* Hari Fishing — disegno della vista di superficie: galleggiante, lancio, camera, lenza, pesce in lotta, bolle.
 * Parte di fish-ui.js (stesso create()): si carica prima e fish-ui.js la monta con HH.fishView(FX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // FX = contesto condiviso con fish-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.fishView = function (FX) {
    const { reduce, clamp, lerp, T, hold, drag, chargeP, HARI, wave, fish3, swimUp, splash, hearts } = FX;
    /* ---------- disegno ---------- */
    const v3 = () => new T.Vector3();
    const tmp = { a: null, b: null, look: null, tip: null, bob: null };
    let cam = { x: 0.1, y: 2.7, z: 5.6, lx: -0.3, ly: 0.2, lz: -10 };

    function bobberPos(t, out) {
      const ph = FX.s.phase;
      if (ph === 'fly' && FX.s.cast) {
        const u = clamp(FX.s.pt / FX.s.cast.fly, 0, 1), L0 = landPos(FX.s.cast.d0, FX.s.cast.x, tmp.l0 || (tmp.l0 = v3()));
        out.copy(tmp.tip).lerp(L0, u);
        out.y = lerp(tmp.tip.y, 0, u) + Math.sin(u * Math.PI) * (1.5 + FX.s.cast.d0 * 0.18);
        return out;
      }
      if ((ph === 'wait' || ph === 'bite' || ph === 'fight') && FX.s.d > 0) {
        const p = landPos(FX.s.d, FX.s.x, tmp.l1 || (tmp.l1 = v3()));
        out.set(p.x, wave(p.x, p.z, t), p.z);
        if (ph === 'wait' && FX.dipT > 0) out.y -= Math.sin((1 - FX.dipT / 0.45) * Math.PI) * 0.1;
        if (ph === 'bite') out.y += -0.13 + Math.sin(t * 30) * 0.03;
        if (ph === 'fight') out.y += -0.06 - FX.s.T * 0.06;
        return out;
      }
      // appeso alla punta della canna
      out.copy(tmp.tip); out.y -= 0.75; out.x += Math.sin(t * 1.6) * 0.03;
      return out;
    }
    const landPos = (d, x, out) => (out || new T.Vector3()).set(HARI.x + x * Math.min(d * 0.3, 7), 0, HARI.z - 0.6 - d);
    function draw(dt, now) {
      if (!FX.R3 || !FX.R3.scene || !FX.s) return;
      const t = now / 1000, rm = reduce();
      FX.R3.water.uT.value = rm ? 0 : t;
      FX.R3.clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.1); if (c.position.x > 200) c.position.x = -200; });
      if (FX.R3.buoy) { FX.R3.buoy.position.y = wave(9, -24, t) * 2; FX.R3.buoy.rotation.z = Math.sin(t * 1.4) * 0.08; }
      if (FX.R3.lamp) FX.R3.lamp.intensity = 2.2 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13) * 0.08;
      FX.dipT = Math.max(0, FX.dipT - dt); FX.biteT = Math.max(0, FX.biteT - dt); FX.castAnim = Math.max(0, FX.castAnim - dt);
      // canna: angolo e curvatura
      const R = FX.R3.rod, ph = FX.s.phase, reel = FX.lastReel;
      let elev = 58, bend = 0.06;
      const charging = drag.id !== null ? drag.p : hold.charge >= 0 ? chargeP() : 0;
      if (ph === 'aim') { elev = 58 + charging * 50; bend = -charging * 0.25; }
      if (ph === 'fly') { const u = clamp(FX.s.pt / 0.25, 0, 1); elev = lerp(100, 28, u) + (u >= 1 ? 6 : 0); bend = 0.15; }
      if (ph === 'wait') elev = 40 + Math.max(0, reel) * 20;
      if (ph === 'bite') { elev = 40; bend = 0.25 + Math.sin(t * 28) * 0.08; }
      if (ph === 'fight') { elev = 38 + reel * 26; bend = 0.15 + FX.s.T * 0.75 + Math.sin(t * 20) * 0.03 * FX.s.T; }
      if (ph === 'caught') { elev = 78; bend = 0.35; }
      if (ph === 'over') { elev = 70; bend = 0.05; }
      const kk = Math.min(1, dt * (ph === 'fly' ? 22 : 8));
      R.elev = lerp(R.elev, elev, kk); R.bend = lerp(R.bend, bend, kk);
      const target = ph === 'wait' || ph === 'bite' || ph === 'fight' ? landPos(Math.max(1, FX.s.d), FX.s.x, tmp.tg || (tmp.tg = v3())) : null;
      const yaw = target ? Math.atan2(-(target.x - R.base.position.x), -(target.z - R.base.position.z)) * 0.8 : (ph === 'aim' ? -(drag.id !== null ? drag.aim : hold.aim) * 0.25 : 0);
      R.yaw = lerp(R.yaw, yaw, kk);
      R.base.rotation.set(-(90 - R.elev) * Math.PI / 180, R.yaw, 0, 'YXZ');
      R.segs.forEach((sg, i) => { if (i) sg.rotation.x = -R.bend * (0.15 + i * 0.25); });
      R.base.updateMatrixWorld(true);
      tmp.tip = tmp.tip || v3(); R.tip.getWorldPosition(tmp.tip);
      // galleggiante e lenza
      tmp.bob = tmp.bob || v3();
      const held = ph === 'caught' && FX.s.fish ? fish3(FX.s.fish.sp) : null;
      bobberPos(t, tmp.bob);
      if (held) {
        // il pesce appeso alla lenza, di fianco verso la camera (si vede l'occhione), un po' più grande
        FX.heldT += dt;
        held.scale.setScalar(1.5);
        held.position.set(tmp.tip.x + 0.35, tmp.tip.y - 0.8, tmp.tip.z + 0.3);
        // appeso per la bocca (muso in su), si dimena a tratti
        const wr = rm ? 0 : Math.max(0, Math.sin(FX.heldT * 2.2));
        held.rotation.set(0, 0.35 + Math.sin(FX.heldT * 1.3) * 0.22, 0.55 + Math.sin(FX.heldT * 9) * 0.06 * wr);
        swimUp(held, rm ? 0 : dt, 0.3, 0.3, 0, Math.sin(FX.heldT * 9) * 7 * wr, 0.6 * wr);
        held.updateMatrixWorld(true);
        tmp.bob.copy(held.localToWorld((tmp.mouth || (tmp.mouth = v3())).set(held.userData.len * 1.02, 0, 0)));   // la lenza arriva alla bocca
      } else FX.heldT = 0;
      FX.R3.bob.visible = !held && ph !== 'over';
      FX.R3.bob.position.copy(tmp.bob);
      FX.R3.bob.rotation.z = ph === 'fight' ? Math.sin(t * 9) * 0.25 : Math.sin(t * 2) * 0.08;
      const pos = FX.R3.line.geometry.attributes.position, n = pos.count;
      const a = tmp.tip, b = tmp.bob, dist = a.distanceTo(b);
      const slackK = ph === 'fight' ? clamp(1 - FX.s.T * 1.4, 0.02, 1) : ph === 'aim' || ph === 'caught' || ph === 'over' ? 0 : ph === 'fly' ? 0.05 : 0.35;
      const sag = dist * 0.16 * slackK;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        pos.setXYZ(i, lerp(a.x, b.x, u), lerp(a.y, b.y, u) - Math.sin(u * Math.PI) * sag, lerp(a.z, b.z, u));
      }
      pos.needsUpdate = true;
      FX.R3.line.visible = ph !== 'over';
      // acqua: cerchi attorno al galleggiante e scia del pesce
      FX.R3.water.uBob.value.copy(tmp.bob);
      const ripT = ph === 'bite' ? 1 : ph === 'fight' ? 0.6 : ph === 'wait' ? 0.25 + (FX.dipT > 0 ? 0.6 : 0) : 0;
      FX.R3.water.uRip.value = lerp(FX.R3.water.uRip.value, tmp.bob.y < 0.2 ? ripT : 0, Math.min(1, dt * 6));
      // ombra del pesce
      const fishOn = (ph === 'fight' || ph === 'bite') && FX.s.d > 0;
      const shm = FX.R3.shadow;
      if (fishOn) {
        const f = FX.s.fish || {}, run = f.run || 0;
        shm.position.set(tmp.bob.x + Math.sin(t * 3) * 0.2, 0.025, tmp.bob.z - 0.55 - run * 0.3);
        shm.rotation.y = R.yaw + Math.sin(t * 4) * 0.3;
        shm.material.opacity = lerp(shm.material.opacity, 0.34, Math.min(1, dt * 4));
        FX.R3.water.uFish.value.copy(shm.position); FX.R3.water.uWake.value = run;
      } else { shm.material.opacity = lerp(shm.material.opacity, 0, Math.min(1, dt * 5)); FX.R3.water.uWake.value = 0; }
      shm.visible = shm.material.opacity > 0.01;
      // Hari: respira, si piega quando tira, salta di gioia
      FX.swayT += dt;
      const hb = FX.R3.hariBody;
      const breathe = rm ? 0 : Math.sin(t * 2.2) * 0.012;
      hb.scale.set(1 - breathe, 1 + breathe, 1);
      hb.rotation.x = ph === 'fight' ? -0.05 + reel * 0.12 : 0;
      hb.rotation.z = ph === 'fight' ? Math.sin(t * 6) * 0.03 * FX.s.T : 0;
      hb.position.y = ph === 'caught' || ph === 'over' ? Math.abs(Math.sin(t * 6)) * 0.08 * (rm ? 0 : 1) : 0;
      // pesce in mano (guardato da vicino), salto durante la lotta, ritorno in acqua
      Object.values(FX.R3.fishes).forEach((fm) => { fm.visible = false; });
      if (held) {
        held.visible = true;
      }
      if (FX.R3.jump && !held) {
        const J = FX.R3.jump; J.t += dt;
        const u = J.t / J.dur;
        if (u >= 1) { splash(J.to, 8, 0.8); FX.R3.jump = null; }
        else {
          const fm = fish3(J.sp); fm.visible = true; fm.scale.setScalar(1);
          fm.position.lerpVectors(J.from, J.to, u); fm.position.y = Math.sin(u * Math.PI) * J.h - 0.1;
          fm.rotation.set(Math.sin(J.t * 7) * 0.3, J.yaw, (0.5 - u) * 2.2);
          swimUp(fm, dt, 1, 0, 0, Math.sin(J.t * 15) * 10, 1);   // fuori dall'acqua si dimena
        }
      }
      if (FX.R3.rel) {
        const Q = FX.R3.rel; Q.t += dt;
        const u = Q.t / 0.9;
        if (u >= 1) { splash(Q.to, 12, 1); hearts(4); FX.R3.rel = null; }
        else {
          const fm = fish3(Q.sp); fm.visible = true; fm.scale.setScalar(1.2);
          fm.position.lerpVectors(Q.from, Q.to, u); fm.position.y = lerp(Q.from.y, 0, u) + Math.sin(u * Math.PI) * 1.2;
          fm.rotation.set(0, -Math.atan2(Q.to.z - Q.from.z, Q.to.x - Q.from.x), 0.5 - u * 1.9);
          swimUp(fm, dt, 1, 0, 0.5, 0, 0);
        }
      }
      // goccioline e cerchi
      FX.R3.drops.forEach((d) => {
        if (d.life <= 0) return;
        d.life -= dt; d.v.y -= 9.8 * dt; d.m.position.addScaledVector(d.v, dt);
        if (d.life <= 0 || d.m.position.y < -0.05) { d.life = 0; d.m.visible = false; }
      });
      FX.R3.rings.forEach((r) => {
        if (r.life <= 0) return;
        r.life -= dt * 1.1;
        const k = 1 - r.life;
        r.m.scale.setScalar(0.2 + k * r.max * 1.4); r.m.material.opacity = Math.max(0, r.life) * 0.8;
        if (r.life <= 0) r.m.visible = false;
      });
      // camera: dietro Hari; segue un po' il galleggiante e si avvicina al pesce preso
      const land = FX.W > FX.H * 1.1;
      let cx = land ? 0.7 : 0.1, cy = land ? 2.1 : 2.7, cz = land ? 3.9 : 5.6, lx = -0.3, ly = land ? 0.6 : 0.2, lz = -11;
      if (target || ph === 'fly') { const tb = ph === 'fly' ? landPos(FX.s.cast.d0, FX.s.cast.x, tmp.l0) : target; lx = lerp(-0.3, tb.x, 0.45); lz = Math.min(-8, tb.z * 0.7); ly = land ? 0.5 : 0.15; }
      if (held) { cx = 1.25; cy = 2.15; cz = land ? 1.9 : 2.3; lx = held.position.x + (land ? 0.55 : 0); ly = held.position.y - (land ? 0.05 : 0.35); lz = held.position.z; }
      const ck = FX.camSnap ? 1 : Math.min(1, dt * (held ? 3 : 1.6));
      FX.camSnap = false;
      cam.x = lerp(cam.x, cx, ck); cam.y = lerp(cam.y, cy, ck); cam.z = lerp(cam.z, cz, ck);
      cam.lx = lerp(cam.lx, lx, ck); cam.ly = lerp(cam.ly, ly, ck); cam.lz = lerp(cam.lz, lz, ck);
      const shake = !rm && ph === 'bite' ? Math.sin(t * 40) * 0.012 : 0;
      FX.R3.camera.position.set(cam.x + shake, cam.y, cam.z);
      FX.R3.camera.lookAt(cam.lx, cam.ly, cam.lz);
      FX.R3.renderer.render(FX.R3.scene, FX.R3.camera);
    }
    // bollicine: n a partire da (x, y, z), sparse di r metri
    function bubbles(x, y, z, n, rr = 0.15, big = 1) {
      const B = FX.R3 && FX.R3.uw && FX.R3.uw.bub;
      if (!B) return;
      for (let j = 0; j < n; j++) {
        const i = B.next; B.next = (B.next + 1) % B.n;
        B.p[i * 3] = x + (Math.random() - 0.5) * rr * 2; B.p[i * 3 + 1] = y + (Math.random() - 0.5) * rr; B.p[i * 3 + 2] = z + (Math.random() - 0.5) * rr;
        B.sz[i] = (0.05 + Math.random() * 0.07) * big; B.vy[i] = 0.6 + Math.random() * 0.8; B.life[i] = 2 + Math.random() * 3; B.wob[i] = Math.random() * 6;
      }
    }

    return { v3, tmp, landPos, draw, bubbles };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
