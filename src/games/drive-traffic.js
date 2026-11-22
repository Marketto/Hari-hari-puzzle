/* Hari Taxi — traffico, pedoni e urti (città a griglia e mappe reali).
 * Logica pura (niente DOM), parte di drive-logic.js: si carica prima e drive-logic.js la monta con HH.driveTraffic(DK).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // DK = contesto condiviso con drive-logic.js (nomi stabili + getter/setter dello stato che cambia)
  HH.driveTraffic = function (DK) {
    const { TICK, LIVES, INV, PED_V, PED_R, STOP_OFF, NPC_DEC, VEH, NPCS, PEDS, rand, clamp, nz, r1, ASPH,
      chooseTurnO, pedTickO, light, segLen, segPos, chooseTurn, rectOf, perimPos, perimU, crossings, circles, CC, CO,
      walls, isLost } = DK;
    /* ---------- traffico ---------- */
    function bucketize(s, g) {
      for (const i of g.used) g.buckets[i].length = 0;
      g.used.length = 0;
      const put = (o) => {
        const i = clamp(Math.floor(o.y / g.cell), 0, g.bh - 1) * g.bw + clamp(Math.floor(o.x / g.cell), 0, g.bw - 1), b = g.buckets[i];
        if (!b.length) g.used.push(i);
        b.push(o);
      };
      for (const v of s.npcs) put(v);
      for (const p of s.peds) if (p.st >= 2 || (g.osm && p.st === 0)) put(p);
    }
    function npcTick(s, g, v, ev) {
      const dt = TICK, K = NPCS[v.k];
      if (v.bonk > 0) { v.bonk = Math.max(0, v.bonk - dt); v.v = 0; return; }
      if (v.bk > 0) {
        // Hari è fermo contromano davanti: l'auto fa gentilmente un po' di retromarcia (se dietro è libero)
        v.bk = Math.max(0, v.bk - dt);
        const hx = Math.cos(v.a), hy = Math.sin(v.a);
        const bx = clamp(Math.floor(v.x / g.cell), 0, g.bw - 1), by = clamp(Math.floor(v.y / g.cell), 0, g.bh - 1);
        let free = v.s > 0.25;
        for (let yy = Math.max(0, by - 1); yy <= Math.min(g.bh - 1, by + 1) && free; yy++) for (let xx = Math.max(0, bx - 1); xx <= Math.min(g.bw - 1, bx + 1) && free; xx++) {
          for (const o of g.buckets[yy * g.bw + xx]) {
            if (o === v || typeof o.k !== 'string') continue;
            const dx = o.x - v.x, dy = o.y - v.y, f = dx * hx + dy * hy;
            if (f < 0 && f > -(K.len + NPCS[o.k].len) / 2 - 0.4 && Math.abs(-dx * hy + dy * hx) < 0.5) { free = false; break; }
          }
        }
        if (free) v.s = nz(Math.max(0.25, v.s - 0.9 * dt));
        v.v = 0;
        const [x, y, a] = segPos(g, v);
        v.x = nz(x); v.y = nz(y); v.a = nz(a);
        return;
      }
      if (v.ghost > 0) v.ghost = Math.max(0, v.ghost - dt);
      if (v.honk > 0) v.honk = Math.max(0, v.honk - dt);
      let vmax = v.sg === 1 && v.d2 !== v.d ? v.vm * 0.62 : v.vm;
      let blocker = null;
      // semaforo rosso: si ferma alla linea prima delle strisce
      if (v.sg === 0 && g.nodes[v.n1].lit) {
        const rem = v.len - v.s, stopAt = rem - STOP_OFF;
        if (stopAt > -0.05) {
          const L = light(s, v.n1), green = L.ph === (g.osm ? g.grp[v.d] : v.d % 2);
          if (!green && stopAt >= (v.v * v.v) / (2 * NPC_DEC * 1.6) - 0.05) { vmax = Math.min(vmax, Math.sqrt(2 * NPC_DEC * Math.max(0, stopAt - 0.02))); blocker = 'light'; }
        }
      }
      // chi c'è davanti: veicoli nello stesso senso, Hari (sempre), pedoni sulle strisce
      const hx = Math.cos(v.a), hy = Math.sin(v.a), look = 0.6 + K.len + (v.v * v.v) / (2 * NPC_DEC) + 1.2;
      const bx0 = Math.floor((v.x - look) / g.cell), bx1 = Math.floor((v.x + look) / g.cell), by0 = Math.floor((v.y - look) / g.cell), by1 = Math.floor((v.y + look) / g.cell);
      let lim = vmax, bo = null;
      const test = (o, oLen, oHw, isCar, isNpc) => {
        const dx = o.x - v.x, dy = o.y - v.y, fwd = dx * hx + dy * hy;
        if (fwd <= 0 || fwd > look + oLen / 2) return;
        const lat = Math.abs(-dx * hy + dy * hx);
        if (lat > K.hw + oHw + (isCar ? 0.16 : 0.22)) return;
        if (isNpc && Math.cos(o.a - v.a) < 0.3) return;            // incroci e corsie opposte: si passa
        const gap = fwd - K.len / 2 - oLen / 2 - (isNpc ? 0.3 : 0.4);
        const vl = Math.sqrt(2 * NPC_DEC * Math.max(0, gap));
        if (vl < lim) { lim = vl; blocker = isNpc ? 'npc' : o === s.car ? 'hari' : 'ped'; bo = o; }
      };
      for (let by = Math.max(0, by0); by <= Math.min(g.bh - 1, by1); by++) for (let bx = Math.max(0, bx0); bx <= Math.min(g.bw - 1, bx1); bx++) {
        for (const o of g.buckets[by * g.bw + bx]) {
          if (o === v) continue;
          if (o.k != null && typeof o.k === 'string') { if (!v.ghost) test(o, NPCS[o.k].len, NPCS[o.k].hw, true, true); } else if (o.st >= 2) test(o, 0.3, PED_R, false, false);
        }
      }
      const P = VEH[s.veh];
      // mappe reali: chi è bloccato da Hari da un po' lo scansa piano piano sulla destra
      if (g.osm && v.sq > 0) { v.sq = Math.max(0, v.sq - dt); lim = Math.min(lim, 0.9); } else test(s.car, P.len, P.hw, true, false);
      if (lim < vmax) vmax = lim;
      v.why = blocker || '';
      v.v = v.v < vmax ? Math.min(vmax, v.v + 3.2 * dt) : vmax;
      if (v.v < 0.05) {
        v.wait += dt;
        // ingorgo tra auto che si aspettano a vicenda (mai se in fondo alla fila c'è Hari): una passa
        if (blocker === 'npc' && v.wait > 4 && bo.why === 'npc' && bo.wait > 4) { v.ghost = 1.4; v.wait = 0; }
        if (blocker === 'hari' && v.wait > 1.6 && !v.honk) { v.honk = 4; ev.push({ type: 'honk', id: v.id }); }
        if (blocker === 'hari' && v.wait > 2.5 && v.sg === 0 && Math.cos(s.car.a - v.a) < -0.3) { v.bk = 1.3; v.wait = 0; }
        if (g.osm && blocker === 'hari') { v.hw = (v.hw || 0) + dt; if (v.hw > 4.5) { v.sq = 3.5; v.hw = 0; } }
      } else { v.wait = 0; if (v.v > 0.5) v.hw = 0; }
      v.s += v.v * dt;
      // fine segmento: corsia → incrocio (svolta) → corsia
      let guard = 0;
      while (v.s >= v.len && guard++ < 3) {
        v.s -= v.len;
        if (g.osm) {
          if (v.sg === 0) { v.sg = 1; v.d2 = chooseTurnO(s, g, v.n1, v.d); } else { v.n0 = v.n1; v.d = v.d2; v.n1 = g.lend[v.d]; v.sg = 0; }
        } else if (v.sg === 0) { v.sg = 1; v.d2 = chooseTurn(s, g, v.n1, v.d); } else { v.n0 = v.n1; v.d = v.d2; v.n1 = g.nodes[v.n0].nb[v.d]; v.sg = 0; if (v.n1 < 0) { v.d = (v.d + 2) % 4; v.n1 = g.nodes[v.n0].nb[v.d]; } }
        v.len = segLen(g, v);
      }
      const [x, y, a] = segPos(g, v);
      v.x = nz(x); v.y = nz(y); v.a = nz(a); v.s = nz(v.s); v.v = nz(v.v);
      if (g.osm && (v.sq || v.sh)) {
        // spostamento laterale (verso destra) mentre scansa Hari, poi torna in corsia
        const shMax = v.sg === 0 ? clamp(g.edges[v.d >> 1].hw + ASPH - 0.75 - (g.edges[v.d >> 1].one ? -0.5 : 0), 0, 0.45) : 0.25;   // resta sull'asfalto
        const sh0 = v.sh || 0;
        v.sh = nz(v.sq > 0 && sh0 < shMax ? Math.min(shMax, sh0 + 0.8 * dt) : Math.max(0, sh0 - 0.5 * dt));
        v.x = nz(v.x - Math.sin(a) * v.sh); v.y = nz(v.y + Math.cos(a) * v.sh);
      }
    }

    /* ---------- pedoni ---------- */
    function pedTick(s, g, p) {
      const dt = TICK;
      if (p.scared > 0) p.scared = Math.max(0, p.scared - dt);
      if (g.osm && p.st === 0) pedTickO(s, g, p);
      else if (p.st === 0) {
        const b = g.blocks[p.b], r = rectOf(b), w = r.X1 - r.X0, h = r.Y1 - r.Y0;
        const segOf = (u) => { const P = 2 * (w + h); u = ((u % P) + P) % P; return u < w ? 0 : u < w + h ? 1 : u < 2 * w + h ? 2 : 3; };
        const s0 = segOf(p.u);
        const P = 2 * (w + h);
        p.u = ((p.u + p.dir * p.sp * dt) % P + P) % P;
        const s1 = segOf(p.u);
        if (s1 !== s0 && rand(s) < 0.45) {
          const k = p.dir > 0 ? s1 : s0;                      // angolo appena superato
          const opts = crossings(g, b, k);
          if (opts.length) {
            const o = opts[Math.floor(rand(s) * opts.length)];
            const cu = [0, w, w + h, 2 * w + h][k];
            p.u = cu;
            const [x, y] = perimPos(b, cu);
            p.x = x; p.y = y;
            p.st = 1; p.tt = 0;
            p.cr = { n: o.n, ph: o.ph, x0: x, y0: y, x1: o.x1, y1: o.y1, b0: b.id, b1: o.b1, q: 0 };
            return;
          }
        }
        const [x, y] = perimPos(b, p.u);
        p.x = nz(x); p.y = nz(y);
      } else if (p.st === 1) {
        // aspetta il verde (e che Hari non stia arrivando a tutta velocità)
        p.tt += dt;
        const L = light(s, p.cr.n), need = Math.hypot(p.cr.x1 - p.cr.x0, p.cr.y1 - p.cr.y0) / p.sp + 0.6;
        const c = s.car, mx = (p.cr.x0 + p.cr.x1) / 2, my = (p.cr.y0 + p.cr.y1) / 2;
        const busy = Math.hypot(c.x - mx, c.y - my) < 3 && Math.abs(c.v) > 1;
        if (L.ph === p.cr.ph && L.left >= need && !busy) { p.st = 2; p.tt = 0; }
        else if (p.tt > 14) { p.st = 0; p.cr = null; p.dir = -p.dir; }
      } else {
        // attraversa (st 2) o si scansa saltando verso il marciapiede più vicino (st 3)
        const cr = p.cr, L = Math.hypot(cr.x1 - cr.x0, cr.y1 - cr.y0) || 1;
        const sp = p.st === 3 ? 2.6 : p.sp * 1.1;
        cr.q = Math.min(1, cr.q + (sp * dt) / L);
        p.x = nz(cr.x0 + (cr.x1 - cr.x0) * cr.q); p.y = nz(cr.y0 + (cr.y1 - cr.y0) * cr.q);
        if (cr.q >= 1 && g.osm) {
          const b1 = cr.b1;
          p.e = b1.e; p.b = b1.e; p.sd = b1.sd; p.u = b1.u; p.dir = b1.dir; p.st = 0; p.cr = null;
        } else if (cr.q >= 1) {
          const b = g.blocks[cr.b1];
          p.b = cr.b1; p.u = r1(perimU(b, p.x, p.y)); p.st = 0; p.cr = null;
          p.dir = rand(s) < 0.5 ? -1 : 1;
        }
      }
    }
    function shoo(p, c) {
      // salto spaventato verso il marciapiede più vicino (avanti o indietro sulle strisce)
      const cr = p.cr;
      if (cr && cr.q < 0.5) {
        p.cr = { n: cr.n, ph: cr.ph, x0: p.x, y0: p.y, x1: cr.x0, y1: cr.y0, b0: cr.b1, b1: cr.b0, q: 0 };
      } else if (cr) p.cr = { n: cr.n, ph: cr.ph, x0: p.x, y0: p.y, x1: cr.x1, y1: cr.y1, b0: cr.b0, b1: cr.b1, q: 0 };
      p.st = 3; p.scared = 1.2;
      void c;
    }

    /* ---------- urti con traffico e pedoni ---------- */
    function contacts(s, g, ev) {
      const c = s.car, P = VEH[s.veh];
      circles(c.x, c.y, c.a, P.hw, P.len, CC);
      const bx0 = Math.floor((c.x - 2) / g.cell), bx1 = Math.floor((c.x + 2) / g.cell), by0 = Math.floor((c.y - 2) / g.cell), by1 = Math.floor((c.y + 2) / g.cell);
      for (let by = Math.max(0, by0); by <= Math.min(g.bh - 1, by1); by++) for (let bx = Math.max(0, bx0); bx <= Math.min(g.bw - 1, bx1); bx++) {
        for (const o of g.buckets[by * g.bw + bx]) {
          if (typeof o.k === 'string') {
            const K = NPCS[o.k];
            circles(o.x, o.y, o.a, K.hw, K.len, CO);
            let best = 0, nx = 0, ny = 0;
            for (let i = 0; i < CC.length; i += 3) for (let j = 0; j < CO.length; j += 3) {
              const dx = CC[i] - CO[j], dy = CC[i + 1] - CO[j + 1], d = Math.hypot(dx, dy), pen = CC[i + 2] + CO[j + 2] - d;
              if (pen > best) { best = pen; nx = d > 1e-6 ? dx / d : -Math.cos(c.a); ny = d > 1e-6 ? dy / d : -Math.sin(c.a); }
            }
            if (best <= 0) continue;
            c.x += nx * best; c.y += ny * best;
            const hx = Math.cos(c.a) * Math.sign(c.v || 1), hy = Math.sin(c.a) * Math.sign(c.v || 1);
            // incidente solo se è Hari ad andare addosso: velocità verso l'altro veicolo (gli sfioramenti sono "bonk")
            const speed = Math.abs(c.v) * Math.max(0, -(hx * nx + hy * ny));
            if (hx * nx + hy * ny < 0) c.v = -c.v * 0.3;
            if (s.inv <= 0 && speed >= P.crash) {
              o.bonk = 0.9;
              hurt(s, ev, { type: 'crash', what: 'car', id: o.id, kind: o.k, x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 });
            } else if (s.bonkT <= 0) { s.bonkT = 0.6; o.bonk = Math.max(o.bonk, 0.4); ev.push({ type: 'bonk', id: o.id, x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 }); }
            walls(s, ev);
          } else if (o.st === 0 && o.scared <= 0) {
            // mappe reali: un pedone sul marciapiede sfiorato fa solo un saltello (il marciapiede non è una strada)
            let hit = false;
            for (let i = 0; i < CC.length; i += 3) if (Math.hypot(CC[i] - o.x, CC[i + 1] - o.y) < CC[i + 2] + PED_R) hit = true;
            if (!hit) continue;
            o.scared = 1.2; c.v *= 0.5;
            ev.push({ type: 'shoo', id: o.id, x: o.x, y: o.y });
          } else if (o.st >= 2 && o.scared <= 0) {
            let hit = false;
            for (let i = 0; i < CC.length; i += 3) if (Math.hypot(CC[i] - o.x, CC[i + 1] - o.y) < CC[i + 2] + PED_R) hit = true;
            if (!hit) continue;
            const speed = Math.abs(c.v);
            shoo(o, c);
            c.v *= 0.4;
            if (s.inv <= 0 && speed >= PED_V) hurt(s, ev, { type: 'crash', what: 'ped', id: o.id, kind: PEDS[o.k], x: o.x, y: o.y });
            else ev.push({ type: 'shoo', id: o.id, x: o.x, y: o.y });
          }
        }
      }
    }
    function hurt(s, ev, e) {
      s.oops++; s.mistakes = s.oops;
      if (e.type === 'crash') s.crashes++;
      s.inv = INV;
      e.left = LIVES - s.oops;
      ev.push(e);
      if (isLost(s)) ev.push({ type: 'lose' });
    }

    return { bucketize, npcTick, pedTick, contacts, hurt };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
