/* Hari Taxi — disegno a ogni fotogramma (veicoli, pedoni, fermate, freccia, indicatori fuori schermo), minimappa e particelle.
 * Parte di drive-ui.js (stesso create()): si carica prima e drive-ui.js la monta con HH.driveDraw(DX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // DX = contesto condiviso con drive-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.driveDraw = function (DX) {
    const { VEHS, CARCOL, reduce, CH, P, IMG, chunk, osmPrep, edgesIn, drawSea, drawLabels, drawLightsO, paintMiniOsm,
      drawJoy } = DX;
    /* ---------- minimappa (una volta per livello e tema) ---------- */
    function paintMini() {
      const k = 3;
      DX.mini = document.createElement('canvas');
      DX.mini.width = DX.s.W * k; DX.mini.height = DX.s.H * k;
      const b = DX.mini.getContext('2d');
      for (let y = 0; y < DX.s.H; y++) for (let x = 0; x < DX.s.W; x++) {
        const ch = DX.s.map[y * DX.s.W + x];
        b.fillStyle = ch === '.' ? DX.C['mm-road'] : ch === 'p' ? DX.C['mm-park'] : ch === '#' ? DX.C['mm-bld'] : DX.C['mm-park'];
        b.fillRect(x * k, y * k, k, k);
      }
    }

    /* ---------- disegno a ogni fotogramma ---------- */
    const toS = (x, y) => [(x - DX.camX) * DX.TS + DX.W / 2, (y - DX.camY) * DX.TS + DX.H / 2];
    function spr(name, x, y, a, wT, hT, alpha = 1) {
      const im = IMG[name];
      if (!im) return;
      DX.g.save();
      DX.g.globalAlpha = alpha;
      DX.g.translate(x, y);
      if (a) DX.g.rotate(a);
      DX.g.drawImage(im, -wT / 2, -hT / 2, wT, hT);
      DX.g.restore();
    }
    function world() {
      const k = DX.TS * DX.dpr, sx = DX.shake > 0 && !reduce() ? Math.sin(performance.now() / 22) * DX.shake * 6 : 0;
      DX.g.setTransform(k, 0, 0, k, (DX.W / 2 - DX.camX * DX.TS + sx) * DX.dpr, (DX.H / 2 - DX.camY * DX.TS) * DX.dpr);
    }
    function screen() { DX.g.setTransform(DX.dpr, 0, 0, DX.dpr, 0, 0); }

    function draw(now) {
      if (!DX.g || !DX.s) return;
      const t = now / 1000;
      screen();
      DX.g.fillStyle = DX.C.grass; DX.g.fillRect(0, 0, DX.W, DX.H);
      world();
      const vx0 = DX.camX - DX.W / 2 / DX.TS - 1, vy0 = DX.camY - DX.H / 2 / DX.TS - 1, vx1 = DX.camX + DX.W / 2 / DX.TS + 1, vy1 = DX.camY + DX.H / 2 / DX.TS + 1;
      DX.g.imageSmoothingEnabled = true;
      DX.budget = 3;
      for (let cy = Math.floor(vy0 / CH); cy <= Math.floor(vy1 / CH); cy++) for (let cx = Math.floor(vx0 / CH); cx <= Math.floor(vx1 / CH); cx++) {
        if (cx < 0 || cy < 0 || cx * CH > DX.s.W || cy * CH > DX.s.H) continue;
        const ck = chunk(cx, cy);
        if (ck) DX.g.drawImage(ck, cx * CH, cy * CH, CH + 0.02, CH + 0.02);
      }
      const inView = (x, y, m = 1.5) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
      if (DX.g0.osm) { drawSea(t, inView, vx0, vy0, vx1, vy1); drawLightsO(inView); } else drawLights(inView);
      drawZones(t, inView);
      // pedoni e passeggeri in attesa, poi i veicoli (i pedoni che saltano sopra a tutto)
      const peds = DX.s.peds.filter((p) => inView(p.x, p.y)).sort((a, b) => a.y - b.y);
      for (const p of peds) if (p.st !== 3) drawPed(p, t);
      drawWaiting(t);
      if (DX.C.night) beams(inView);
      for (const v of DX.s.npcs) if (inView(v.x, v.y, 2)) drawNpc(v, t);
      drawMe(t);
      for (const p of peds) if (p.st === 3) drawPed(p, t);
      drawGhosts(t);
      drawParts(t);
      if (DX.g0.osm) drawLabels(inView);
      screen();
      if (+DX.C.night) { DX.g.fillStyle = DX.C.dusk; DX.g.fillRect(0, 0, DX.W, DX.H); }
      drawArrow(t);
      drawOffscreen(t);
      drawMini(t);
      drawJoy();
    }

    function drawLights(inView) {
      for (let n = 0; n < DX.g0.nodes.length; n++) {
        const N = DX.g0.nodes[n];
        if (!N.lit || !inView(N.x, N.y, 2)) continue;
        const Lg = P.light(DX.s, n);
        const col = (axis) => (Lg.ph === axis ? (Lg.left < 1.3 ? DX.C.amber : DX.C.go) : DX.C.stop);
        // un semaforo per ogni corsia in arrivo, sull'angolo del marciapiede a destra di chi arriva
        const spots = [[-1.22, 1.22, 0], [1.22, -1.22, 0], [-1.22, -1.22, 1], [1.22, 1.22, 1]];
        for (const [dx, dy, axis] of spots) {
          const x = N.x + dx, y = N.y + dy;
          DX.g.fillStyle = DX.C.pole; rr(x - 0.15, y - 0.1, 0.3, 0.2, 0.08); DX.g.fill();
          DX.g.fillStyle = col(axis); DX.g.beginPath(); DX.g.arc(x, y, 0.075, 0, 7); DX.g.fill();
          if (DX.C.night) { DX.g.globalAlpha = 0.35; DX.g.beginPath(); DX.g.arc(x, y, 0.2, 0, 7); DX.g.fill(); DX.g.globalAlpha = 1; }
        }
      }
    }
    function rr(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      DX.g.beginPath();
      DX.g.moveTo(x + r, y); DX.g.arcTo(x + w, y, x + w, y + h, r); DX.g.arcTo(x + w, y + h, x, y + h, r); DX.g.arcTo(x, y + h, x, y, r); DX.g.arcTo(x, y, x + w, y, r);
      DX.g.closePath();
    }
    // fermate: anello pulsante sulla strada + segnalino sul marciapiede
    function drawZones(t, inView) {
      for (const tg of P.targets(DX.s)) {
        if (!inView(tg.zx, tg.zy, 2)) continue;
        const pulse = reduce() ? 0.5 : (t * 1.2) % 1;
        DX.g.fillStyle = DX.C['zone-2']; DX.g.beginPath(); DX.g.arc(tg.zx, tg.zy, P.ZONE_R * 0.8, 0, 7); DX.g.fill();
        DX.g.strokeStyle = DX.C.zone; DX.g.lineWidth = 0.07; DX.g.setLineDash([0.22, 0.14]); DX.g.lineDashOffset = -t * 0.6;
        DX.g.beginPath(); DX.g.arc(tg.zx, tg.zy, P.ZONE_R * 0.8, 0, 7); DX.g.stroke(); DX.g.setLineDash([]);
        DX.g.globalAlpha = 1 - pulse; DX.g.lineWidth = 0.05; DX.g.beginPath(); DX.g.arc(tg.zx, tg.zy, P.ZONE_R * (0.5 + pulse * 0.5), 0, 7); DX.g.stroke(); DX.g.globalAlpha = 1;
        if (tg.kind === 'drop') pinAt(tg.x, tg.y, t, iconFor(tg));
      }
    }
    function iconFor(tg) {
      const it = DX.s.trip && DX.s.trip.items.find((i) => i.id === tg.item);
      if (DX.s.type === 'parcel') return `box${it ? it.who : 0}`;
      if (DX.s.type === 'food') return 'house';
      return it ? `p${it.who}j` : 'house';
    }
    function pinAt(x, y, t, icon) {
      const bob = reduce() ? 0 : Math.sin(t * 4) * 0.06, r = 0.36, py = y - 0.55 + bob;
      DX.g.fillStyle = DX.C.shadow; DX.g.beginPath(); DX.g.ellipse(x, y + 0.05, 0.2, 0.08, 0, 0, 7); DX.g.fill();
      DX.g.fillStyle = DX.C.pin; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 0.04;
      DX.g.beginPath(); DX.g.moveTo(x, y); DX.g.bezierCurveTo(x - r * 0.4, py + r * 0.6, x - r, py + r * 0.3, x - r, py); DX.g.arc(x, py, r, Math.PI, 0); DX.g.bezierCurveTo(x + r, py + r * 0.3, x + r * 0.4, py + r * 0.6, x, y); DX.g.fill(); DX.g.stroke();
      DX.g.fillStyle = DX.C['pin-2']; DX.g.beginPath(); DX.g.arc(x, py, r * 0.74, 0, 7); DX.g.fill();
      spr(icon, x, py, 0, r * 1.3, r * 1.3);
    }
    function drawPed(p, t) {
      const run = !DX.paused && DX.s.ready <= 0 && !DX.s.wait && !reduce();
      const fr = run && p.st !== 1 ? Math.floor(t * 6 + p.id) % 2 : 0;
      let y = p.y, name = `p${p.k}${fr ? 'b' : 'a'}`;
      const sz = 0.62;
      if (p.st === 0 && p.scared > 0) {
        // mappe reali: sfiorato sul marciapiede, fa un saltello
        const e = Math.max(0, Math.min(1, 1 - p.scared / 1.2));
        y -= Math.sin(e * Math.PI) * 0.4;
        name = `p${p.k}o`;
      } else if (p.st === 3) {
        // salto spaventato con "!" e stelline (mai investito)
        const e = Math.max(0, Math.min(1, 1 - p.scared / 1.2));
        y -= Math.sin(e * Math.PI) * 0.55 + 0.1;
        name = `p${p.k}o`;
      } else if (run) y -= Math.abs(Math.sin(t * 6 + p.id)) * 0.04;
      DX.g.fillStyle = DX.C.shadow; DX.g.beginPath(); DX.g.ellipse(p.x, p.y + 0.12, 0.17, 0.07, 0, 0, 7); DX.g.fill();
      spr(name, p.x, y - sz * 0.3, 0, sz, sz);
      if (p.st === 3) bang(p.x + 0.22, y - sz * 0.75);
    }
    function bang(x, y) {
      const [sx, sy] = toS(x, y);
      screen();
      const fs = Math.max(14, DX.TS * 0.42);
      DX.g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
      DX.g.textAlign = 'center'; DX.g.textBaseline = 'middle'; DX.g.lineJoin = 'round';
      DX.g.lineWidth = fs * 0.26; DX.g.strokeStyle = DX.C['text-line']; DX.g.strokeText('!', sx, sy);
      DX.g.fillStyle = DX.C.star; DX.g.fillText('!', sx, sy);
      world();
    }
    // chi aspetta alla fermata: passeggero col fumetto (taxi), sacchetto fumante (cibo), pacchi (deposito)
    function drawWaiting(t) {
      const tr = DX.s.trip;
      if (!tr || tr.st !== 'go') return;
      const p = DX.g0.spots[tr.p], bob = reduce() ? 0 : Math.abs(Math.sin(t * 3)) * 0.06;
      if (DX.s.type === 'taxi') {
        const it = tr.items[0];
        DX.g.fillStyle = DX.C.shadow; DX.g.beginPath(); DX.g.ellipse(p.x, p.y + 0.14, 0.24, 0.09, 0, 0, 7); DX.g.fill();
        spr(`p${it.who}${Math.floor(t * 2) % 2 ? 'j' : 'a'}`, p.x, p.y - 0.28 - bob, 0, 0.82, 0.82);
        bubble(p.x + 0.45, p.y - 1.05, 'house');
      } else if (DX.s.type === 'food') {
        spr('bag', p.x, p.y - 0.15 - bob, 0, 0.62, 0.62);
        bubble(p.x + 0.42, p.y - 0.95, `d_${P.DISHES[tr.items[0].who]}`);
      } else {
        tr.items.forEach((it, i) => spr(`box${it.who}`, p.x - 0.25 + (i % 2) * 0.42, p.y - 0.1 - Math.floor(i / 2) * 0.32 - (i === tr.items.length - 1 ? bob : 0), 0, 0.46, 0.46));
      }
    }
    function bubble(x, y, icon) {
      DX.g.fillStyle = DX.C['pin-2']; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 0.035;
      rr(x - 0.34, y - 0.3, 0.68, 0.56, 0.2); DX.g.fill(); DX.g.stroke();
      DX.g.beginPath(); DX.g.moveTo(x - 0.2, y + 0.24); DX.g.lineTo(x - 0.34, y + 0.44); DX.g.lineTo(x - 0.04, y + 0.25); DX.g.fill();
      spr(icon, x, y - 0.02, 0, 0.48, 0.48);
    }
    function beams(inView) {
      DX.g.save();
      DX.g.globalCompositeOperation = 'lighter';
      const one = (x, y, a, len, wd) => {
        const gr = DX.g.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        gr.addColorStop(0, DX.C.beam); gr.addColorStop(1, 'rgba(0,0,0,0)');
        DX.g.fillStyle = gr;
        DX.g.beginPath();
        DX.g.moveTo(x - Math.sin(a) * wd * 0.4, y + Math.cos(a) * wd * 0.4);
        DX.g.lineTo(x + Math.cos(a) * len - Math.sin(a) * wd, y + Math.sin(a) * len + Math.cos(a) * wd);
        DX.g.lineTo(x + Math.cos(a) * len + Math.sin(a) * wd, y + Math.sin(a) * len - Math.cos(a) * wd);
        DX.g.lineTo(x + Math.sin(a) * wd * 0.4, y - Math.cos(a) * wd * 0.4);
        DX.g.closePath(); DX.g.fill();
      };
      for (const v of DX.s.npcs) if (inView(v.x, v.y, 3)) { const K = P.NPCS[v.k]; one(v.x + Math.cos(v.a) * K.len * 0.45, v.y + Math.sin(v.a) * K.len * 0.45, v.a, 1.8, 0.55); }
      const V = P.VEH[DX.s.veh], c = DX.s.car;
      one(c.x + Math.cos(c.a) * V.len * 0.45, c.y + Math.sin(c.a) * V.len * 0.45, c.a, 2.4, 0.7);
      DX.g.restore();
    }
    function vehShadow(x, y, a, len, wd) {
      DX.g.save(); DX.g.translate(x + 0.08, y + 0.12); DX.g.rotate(a); DX.g.fillStyle = DX.C.shadow; rr(-len / 2, -wd / 2, len, wd, wd * 0.3); DX.g.fill(); DX.g.restore();
    }
    function drawNpc(v, t) {
      const K = P.NPCS[v.k], spec = VEHS[v.k], wT = spec.w / 100, hT = spec.h / 100;
      const wob = v.bonk > 0 && !reduce() ? Math.sin(t * 40) * 0.08 : 0;
      vehShadow(v.x, v.y, v.a, K.len, K.hw * 2);
      const name = v.k === 'car' ? `car${v.c % CARCOL.length}` : v.k === 'bus' ? `bus${v.c % 2}` : 'bike';
      spr(name, v.x, v.y, v.a + wob, wT, hT);
      if (v.k === 'bike') spr(`p${v.c % P.PEDS.length}a`, v.x, v.y - 0.12, 0, 0.5, 0.5);
      if (v.honk > 3.2) { // "bip bip": due archetti sopra l'auto
        DX.g.strokeStyle = DX.C.text; DX.g.lineWidth = 0.05; DX.g.lineCap = 'round';
        for (let i = 1; i <= 2; i++) { DX.g.globalAlpha = (v.honk - 3.2) / 0.8; DX.g.beginPath(); DX.g.arc(v.x, v.y - 0.25, 0.18 * i + 0.1, -2.4, -0.7); DX.g.stroke(); }
        DX.g.globalAlpha = 1;
      }
    }
    function drawMe(t) {
      // lo scooter è piccolo: lo si disegna un po' più grande (solo grafica), così si vede sotto Hari
      const c = DX.s.car, V = P.VEH[DX.s.veh], spec = VEHS[DX.s.veh], big = DX.s.veh === 'scooter' ? 1.3 : 1, wT = (spec.w / 100) * big, hT = (spec.h / 100) * big;
      const blink = DX.s.inv > 0 && !reduce() ? (Math.floor(t * 10) % 2 ? 0.45 : 1) : 1;
      vehShadow(c.x, c.y, c.a, V.len, V.hw * 2);
      spr('me', c.x, c.y, c.a, wT, hT, blink);
      // carico a bordo: passeggero dietro (taxi), pacchi sul tetto (furgone)
      const tr = DX.s.trip, ride = tr && tr.st === 'ride' ? tr.items.filter((i) => i.st === 1) : [];
      const hx = Math.cos(c.a), hy = Math.sin(c.a);
      if (DX.s.type === 'taxi' && ride.length) spr(`p${ride[0].who}j`, c.x - hx * 0.3, c.y - hy * 0.3 - 0.08, 0, 0.44, 0.44, blink);
      if (DX.s.type === 'parcel') ride.forEach((it, i) => spr(`box${it.who}`, c.x - hx * (0.38 - i * 0.16) + (i % 2 ? 1 : -1) * hy * 0.12, c.y - hy * (0.38 - i * 0.16) - (i % 2 ? 1 : -1) * hx * 0.12, 0, 0.26, 0.26, blink));
      // Hari al volante (testa sempre dritta)
      const seat = DX.s.veh === 'van' ? 0.36 : DX.s.veh === 'scooter' ? 0.12 : 0.1, hs = DX.s.veh === 'scooter' ? 0.54 : 0.7;
      const hop = DX.party ? Math.abs(Math.sin((t - DX.party / 1000) * 8)) * 0.18 : 0;
      const face = DX.party ? 'hariJ' : DX.s.inv > P.INV - 0.9 ? 'hariO' : 'hari';
      spr(face, c.x + hx * seat, c.y + hy * seat - 0.14 - hop, 0, hs, hs, blink);
    }
    // personaggi che salgono/scendono (animazione breve dal marciapiede al veicolo e viceversa)
    function drawGhosts(t) {
      DX.ghosts = DX.ghosts.filter((q) => t - q.t0 < q.dur);
      for (const q of DX.ghosts) {
        const e = (t - q.t0) / q.dur, x = q.x0 + (q.x1 - q.x0) * e, y = q.y0 + (q.y1 - q.y0) * e - Math.sin(e * Math.PI) * q.arc;
        spr(q.name, x, y, 0, q.size, q.size, e > 0.8 ? (1 - e) / 0.2 : 1);
      }
    }
    function drawArrow(t) {
      const tg = mainTarget();
      if (!tg || P.isOver(DX.s)) return;
      const c = DX.s.car, d = Math.hypot(tg.zx - c.x, tg.zy - c.y);
      if (d < 2.2) return;
      if (t - DX.routeAt > 0.25 || !DX.routePt) {
        DX.routeAt = t;
        const rt = P.route(DX.s, c.x, c.y, Math.floor(tg.zy) * DX.s.W + Math.floor(tg.zx), 5);
        DX.routePt = rt.length ? rt[Math.min(3, rt.length - 1)] : { x: tg.zx, y: tg.zy };
      }
      const a = Math.atan2(DX.routePt.y - c.y, DX.routePt.x - c.x), [sx, sy] = toS(c.x, c.y), R = DX.TS * 0.95 + (reduce() ? 0 : Math.sin(t * 6) * DX.TS * 0.05);
      DX.g.save();
      DX.g.translate(sx + Math.cos(a) * R, sy + Math.sin(a) * R); DX.g.rotate(a);
      const z = DX.TS * 0.26;
      DX.g.fillStyle = DX.C.arrow; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 2; DX.g.lineJoin = 'round';
      DX.g.beginPath(); DX.g.moveTo(z, 0); DX.g.lineTo(-z * 0.7, -z * 0.8); DX.g.lineTo(-z * 0.35, 0); DX.g.lineTo(-z * 0.7, z * 0.8); DX.g.closePath(); DX.g.fill(); DX.g.stroke();
      DX.g.restore();
    }
    function mainTarget() {
      const tg = P.targets(DX.s);
      if (!tg.length) return null;
      if (tg.length === 1) return tg[0];
      const f = P.field(DX.s, Math.floor(DX.s.car.y) * DX.s.W + Math.floor(DX.s.car.x));
      const d = (q) => { const v = f[Math.floor(q.zy) * DX.s.W + Math.floor(q.zx)]; return v < 0 ? 999 : v; };
      return tg.slice().sort((a, b) => d(a) - d(b))[0];
    }
    // meta fuori dallo schermo: segnalino sul bordo che punta verso di lei
    function drawOffscreen(t) {
      for (const tg of P.targets(DX.s)) {
        const [sx, sy] = toS(tg.x, tg.y), m = 26;
        if (sx > m && sx < DX.W - m && sy > m && sy < DX.H - m) continue;
        const cx = DX.W / 2, cy = DX.H / 2, dx = sx - cx, dy = sy - cy;
        const k = Math.min((DX.W / 2 - m) / Math.max(1, Math.abs(dx)), (DX.H / 2 - m) / Math.max(1, Math.abs(dy)));
        const x = cx + dx * k, y = cy + dy * k, a = Math.atan2(dy, dx), r = 15 + (reduce() ? 0 : Math.sin(t * 5) * 1.5);
        DX.g.fillStyle = DX.C.pin; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 1.6;
        DX.g.beginPath(); DX.g.moveTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); DX.g.lineTo(x + Math.cos(a + 0.5) * r, y + Math.sin(a + 0.5) * r); DX.g.lineTo(x + Math.cos(a - 0.5) * r, y + Math.sin(a - 0.5) * r); DX.g.closePath(); DX.g.fill(); DX.g.stroke();
        DX.g.beginPath(); DX.g.arc(x, y, r, 0, 7); DX.g.fill(); DX.g.stroke();
        DX.g.fillStyle = DX.C['pin-2']; DX.g.beginPath(); DX.g.arc(x, y, r * 0.78, 0, 7); DX.g.fill();
        const icon = tg.kind === 'pick' ? (DX.s.type === 'taxi' ? `p${DX.s.trip.items[0].who}a` : DX.s.type === 'food' ? 'bag' : 'box0') : iconFor(tg);
        const im = IMG[icon];
        if (im) DX.g.drawImage(im, x - r * 0.72, y - r * 0.72, r * 1.44, r * 1.44);
      }
    }
    function drawMini(t) {
      if (DX.g0.osm) { drawMiniO(t); return; }
      const mw = Math.min(DX.W * 0.3, 112), mh = (mw * DX.s.H) / DX.s.W, x0 = DX.W - mw - 8, y0 = 8;
      DX.mmRect = { x: x0, y: y0, w: mw, h: DX.showMap ? mh : 22 };
      if (!DX.showMap) {
        DX.g.fillStyle = DX.C.mm; DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1.5;
        rr(DX.W - 34, 8, 26, 22, 7); DX.g.fill(); DX.g.stroke();
        DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1.6;
        DX.g.beginPath(); DX.g.moveTo(DX.W - 29, 13); DX.g.lineTo(DX.W - 23, 15); DX.g.lineTo(DX.W - 18, 13); DX.g.lineTo(DX.W - 13, 15); DX.g.lineTo(DX.W - 13, 25); DX.g.lineTo(DX.W - 18, 23); DX.g.lineTo(DX.W - 23, 25); DX.g.lineTo(DX.W - 29, 23); DX.g.closePath(); DX.g.stroke();
        DX.mmRect = { x: DX.W - 34, y: 8, w: 26, h: 22 };
        return;
      }
      if (!DX.mini) paintMini();
      DX.g.save();
      DX.g.fillStyle = DX.C.mm; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); DX.g.fill();
      rr(x0, y0, mw, mh, 6); DX.g.clip();
      DX.g.globalAlpha = 0.95; DX.g.drawImage(DX.mini, x0, y0, mw, mh); DX.g.globalAlpha = 1;
      const k = mw / DX.s.W, at = (x, y) => [x0 + x * k, y0 + y * k];
      // ristoranti e deposito
      for (const id of DX.s.rest) { const [x, y] = at(DX.g0.spots[id].x, DX.g0.spots[id].y); DX.g.fillStyle = DX.C.awning; DX.g.fillRect(x - 2.5, y - 2.5, 5, 5); }
      if (DX.s.depot >= 0) { const [x, y] = at(DX.g0.spots[DX.s.depot].x, DX.g0.spots[DX.s.depot].y); DX.g.fillStyle = DX.C.van; DX.g.fillRect(x - 3, y - 3, 6, 6); }
      // vista della camera
      DX.g.strokeStyle = DX.C['mm-line']; DX.g.globalAlpha = 0.35; DX.g.lineWidth = 1;
      const [vx, vy] = at(DX.camX - DX.W / 2 / DX.TS, DX.camY - DX.H / 2 / DX.TS); DX.g.strokeRect(vx, vy, (DX.W / DX.TS) * k, (DX.H / DX.TS) * k); DX.g.globalAlpha = 1;
      for (const tg of P.targets(DX.s)) {
        const [x, y] = at(tg.x, tg.y), r = 3 + (reduce() ? 0 : (Math.sin(t * 6) + 1) * 1.2);
        DX.g.fillStyle = DX.C.pin; DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1; DX.g.beginPath(); DX.g.arc(x, y, r, 0, 7); DX.g.fill(); DX.g.stroke();
      }
      const [cx, cy] = at(DX.s.car.x, DX.s.car.y);
      DX.g.fillStyle = DX.C[DX.s.veh === 'scooter' ? 'scoot' : DX.s.veh] || DX.C.star; DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1.2;
      DX.g.beginPath(); DX.g.arc(cx, cy, 3.6, 0, 7); DX.g.fill(); DX.g.stroke();
      DX.g.beginPath(); DX.g.moveTo(cx, cy); DX.g.lineTo(cx + Math.cos(DX.s.car.a) * 6, cy + Math.sin(DX.s.car.a) * 6); DX.g.stroke();
      DX.g.restore();
      DX.g.strokeStyle = DX.C['mm-line']; DX.g.globalAlpha = 0.6; DX.g.lineWidth = 1.5; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); DX.g.stroke(); DX.g.globalAlpha = 1;
    }
    function drawMiniO(t) {
      const mw = Math.min(DX.W * 0.3, 118), mh = mw, x0 = DX.W - mw - 8, y0 = 8, VW = 72;
      if (!DX.showMap) { drawMini0(); return; }
      DX.mmRect = { x: x0, y: y0, w: mw, h: mh };
      if (!DX.mini) paintMiniOsm();
      // finestra di VW caselle attorno alla camera, dentro la mappa
      const sx = Math.max(0, Math.min(DX.s.W - VW, DX.camX - VW / 2)), sy = Math.max(0, Math.min(DX.s.H - VW, DX.camY - VW / 2)), k = mw / VW;
      DX.g.save();
      DX.g.fillStyle = DX.C.mm; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); DX.g.fill();
      rr(x0, y0, mw, mh, 6); DX.g.clip();
      DX.g.imageSmoothingEnabled = false;
      DX.g.globalAlpha = 0.95; DX.g.drawImage(DX.mini, sx, sy, VW, VW, x0, y0, mw, mh); DX.g.globalAlpha = 1;
      DX.g.imageSmoothingEnabled = true;
      const at = (x, y) => [x0 + (x - sx) * k, y0 + (y - sy) * k];
      const clampIn = ([x, y], m) => [Math.max(x0 + m, Math.min(x0 + mw - m, x)), Math.max(y0 + m, Math.min(y0 + mh - m, y))];
      for (const id of DX.s.rest) { const [x, y] = clampIn(at(DX.g0.spots[id].x, DX.g0.spots[id].y), 3); DX.g.fillStyle = DX.C.awning; DX.g.fillRect(x - 2.5, y - 2.5, 5, 5); }
      if (DX.s.depot >= 0) { const [x, y] = clampIn(at(DX.g0.spots[DX.s.depot].x, DX.g0.spots[DX.s.depot].y), 3); DX.g.fillStyle = DX.C.van; DX.g.fillRect(x - 3, y - 3, 6, 6); }
      DX.g.strokeStyle = DX.C['mm-line']; DX.g.globalAlpha = 0.35; DX.g.lineWidth = 1;
      const [vx, vy] = at(DX.camX - DX.W / 2 / DX.TS, DX.camY - DX.H / 2 / DX.TS); DX.g.strokeRect(vx, vy, (DX.W / DX.TS) * k, (DX.H / DX.TS) * k); DX.g.globalAlpha = 1;
      for (const tg of P.targets(DX.s)) {
        const [x, y] = clampIn(at(tg.x, tg.y), 4), r = 3 + (reduce() ? 0 : (Math.sin(t * 6) + 1) * 1.2);
        DX.g.fillStyle = DX.C.pin; DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1; DX.g.beginPath(); DX.g.arc(x, y, r, 0, 7); DX.g.fill(); DX.g.stroke();
      }
      const [cx, cy] = at(DX.s.car.x, DX.s.car.y);
      DX.g.fillStyle = DX.C[DX.s.veh === 'scooter' ? 'scoot' : DX.s.veh] || DX.C.star; DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1.2;
      DX.g.beginPath(); DX.g.arc(cx, cy, 3.6, 0, 7); DX.g.fill(); DX.g.stroke();
      DX.g.beginPath(); DX.g.moveTo(cx, cy); DX.g.lineTo(cx + Math.cos(DX.s.car.a) * 6, cy + Math.sin(DX.s.car.a) * 6); DX.g.stroke();
      // attribuzione nell'angolo della minimappa
      DX.g.font = '700 8px "M PLUS Rounded 1c", sans-serif'; DX.g.textAlign = 'right'; DX.g.textBaseline = 'bottom';
      DX.g.fillStyle = DX.C.mm; DX.g.globalAlpha = 0.85; DX.g.fillRect(x0 + mw - DX.g.measureText('© OpenStreetMap').width - 6, y0 + mh - 11, mw, 11); DX.g.globalAlpha = 1;
      DX.g.fillStyle = DX.C['mm-line']; DX.g.fillText('© OpenStreetMap', x0 + mw - 3, y0 + mh - 1.5);
      DX.g.restore();
      DX.g.strokeStyle = DX.C['mm-line']; DX.g.globalAlpha = 0.6; DX.g.lineWidth = 1.5; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); DX.g.stroke(); DX.g.globalAlpha = 1;
    }
    // minimappa nascosta: pulsantino a forma di cartina
    function drawMini0() {
      DX.g.fillStyle = DX.C.mm; DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1.5;
      rr(DX.W - 34, 8, 26, 22, 7); DX.g.fill(); DX.g.stroke();
      DX.g.strokeStyle = DX.C['mm-line']; DX.g.lineWidth = 1.6;
      DX.g.beginPath(); DX.g.moveTo(DX.W - 29, 13); DX.g.lineTo(DX.W - 23, 15); DX.g.lineTo(DX.W - 18, 13); DX.g.lineTo(DX.W - 13, 15); DX.g.lineTo(DX.W - 13, 25); DX.g.lineTo(DX.W - 18, 23); DX.g.lineTo(DX.W - 23, 25); DX.g.lineTo(DX.W - 29, 23); DX.g.closePath(); DX.g.stroke();
      DX.mmRect = { x: DX.W - 34, y: 8, w: 26, h: 22 };
    }
    // cartello della via (o del luogo notevole) vicino a Hari: dati OSM, non tradotti
    function updateStreet(now) {
      if (!DX.streetEl || now - DX.streetAt < 400) return;
      DX.streetAt = now;
      const c = DX.s.car, O = osmPrep();
      let name = '';
      let bl = 4.5;
      for (const p of O.labels) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bl) { bl = d; name = p.name; } }
      if (!name) {
        let bd = 2.6;
        for (const e of edgesIn(c.x - 3, c.y - 3, c.x + 3, c.y + 3)) {
          if (!e.name) continue;
          for (let i = 1; i < e.pts.length; i++) {
            const [ax, ay] = e.pts[i - 1], [bx, by] = e.pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
            const u = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.y - ay) * dy) / L2)), d = Math.hypot(c.x - ax - u * dx, c.y - ay - u * dy);
            if (d < bd) { bd = d; name = e.name; }
          }
        }
      }
      if (name === DX.streetKey) return;
      DX.streetKey = name;
      if (name) DX.streetEl.querySelector('span').textContent = name;
      DX.streetEl.hidden = !name;
    }


    /* ---------- particelle (coordinate del mondo) ---------- */
    function puff(x, y, n = 6, sc = 1) {
      if (reduce()) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; DX.parts.push({ ty: 'puff', x, y, vx: Math.cos(a) * 0.9 * sc, vy: Math.sin(a) * 0.9 * sc - 0.2, r: (0.14 + (i % 3) * 0.06) * sc, t0: t, life: 0.55 }); }
    }
    function stars(x, y, n = 6, col) {
      if (reduce()) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, v = 1.2 + Math.random() * 1.3; DX.parts.push({ ty: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, r: 0.12, t0: t, life: 0.7, col }); }
    }
    function hearts(x, y, n = 3) {
      if (reduce()) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) DX.parts.push({ ty: 'heart', x: x + (i - (n - 1) / 2) * 0.22, y, vx: (i - (n - 1) / 2) * 0.4, vy: -1.4 - i * 0.2, r: 0.14, t0: t + i * 0.06, life: 1 });
    }
    function float(text, x, y, col, size = 20, life = 1.1) { DX.parts.push({ ty: 'text', text, x, y, vx: 0, vy: -0.8, r: size, t0: performance.now() / 1000, life, col }); }
    function cloud(x, y) { DX.parts.push({ ty: 'bonk', x, y, vx: 0, vy: -0.3, r: 0.42, t0: performance.now() / 1000, life: 0.7 }); }
    function heartPath(x, y, r) {
      DX.g.beginPath();
      DX.g.moveTo(x, y + r * 0.9);
      DX.g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
      DX.g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
      DX.g.closePath();
    }
    function starPath(x, y, r) {
      DX.g.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; DX.g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
      DX.g.closePath();
    }
    function drawParts(t) {
      DX.parts = DX.parts.filter((p) => t - p.t0 < p.life);
      for (const p of DX.parts) {
        const e = t - p.t0;
        if (e < 0) continue;
        const k = e / p.life, x = p.x + p.vx * e, y = p.y + p.vy * e + (p.ty === 'star' ? 2 * e * e : 0);
        DX.g.globalAlpha = 1 - k * k;
        if (p.ty === 'puff') { DX.g.fillStyle = DX.C.puff; DX.g.beginPath(); DX.g.arc(x, y, p.r * (0.6 + k * 0.8), 0, 7); DX.g.fill(); }
        else if (p.ty === 'star') { DX.g.fillStyle = p.col || DX.C.star; starPath(x, y, p.r * (1 - k * 0.4)); DX.g.fill(); }
        else if (p.ty === 'heart') { DX.g.fillStyle = DX.C.heart; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 0.025; heartPath(x + Math.sin(e * 9) * 0.06, y, p.r); DX.g.fill(); DX.g.stroke(); }
        else if (p.ty === 'bonk') {
          // nuvoletta "bonk" con stelline
          const r = p.r * (e < 0.12 ? 0.5 + e * 4 : 1);
          DX.g.fillStyle = DX.C.bonk; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 0.04;
          DX.g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; DX.g.moveTo(x + Math.cos(a) * r * 0.75 + r * 0.32, y + Math.sin(a) * r * 0.65); DX.g.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.65, r * 0.32, 0, 7); } DX.g.fill();
          DX.g.beginPath(); DX.g.ellipse(x, y, r * 0.8, r * 0.66, 0, 0, 7); DX.g.fill(); DX.g.stroke();
          DX.g.fillStyle = DX.C.star; starPath(x - r * 0.25, y - r * 0.05, r * 0.24); DX.g.fill(); starPath(x + r * 0.28, y + r * 0.08, r * 0.18); DX.g.fill();
        } else if (p.ty === 'text') {
          const [sx, sy] = toS(x, y);
          screen();
          const sc = e < 0.15 ? 0.5 + (e / 0.15) * 0.7 : e < 0.3 ? 1.2 - ((e - 0.15) / 0.15) * 0.2 : 1, fs = p.r * sc;
          DX.g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
          DX.g.textAlign = 'center'; DX.g.textBaseline = 'middle'; DX.g.lineJoin = 'round';
          DX.g.lineWidth = fs * 0.24; DX.g.strokeStyle = DX.C['text-line']; DX.g.strokeText(p.text, sx, sy);
          DX.g.fillStyle = p.col || DX.C.text; DX.g.fillText(p.text, sx, sy);
          world();
        }
      }
      DX.g.globalAlpha = 1;
    }

    return { toS, world, screen, draw, rr, updateStreet, puff, stars, hearts, float, cloud };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
