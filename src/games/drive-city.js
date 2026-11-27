/* Hari Taxi — città procedurale dipinta a blocchi di 8×8 caselle in cache: strade, isolati, tetti, parchi, alberi, insegne.
 * Parte di drive-ui.js (stesso create()): si carica prima e drive-ui.js la monta con HH.driveCity(DX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // DX = contesto condiviso con drive-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.driveCity = function (DX) {
    const { CH, P, chunks } = DX;
    /* ---------- città fissa: blocchi di 8×8 caselle ---------- */
    const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    function chunk(cx, cy) {
      const k = cx + ',' + cy;
      let c = chunks.get(k);
      if (c && !DX.gone(c)) return c;
      if (c) chunks.delete(k);     // memoria grafica persa (app in secondo piano su Android): si ridipinge
      // mappe reali: al massimo pochi blocchi nuovi per fotogramma (niente scatti quando si entra in una zona nuova)
      if (DX.g0.osm && DX.budget <= 0) return null;
      DX.budget--;
      if (chunks.size > (DX.g0.osm ? 28 : 16)) chunks.delete(chunks.keys().next().value);
      c = document.createElement('canvas');
      c.width = c.height = Math.ceil(CH * DX.TS * DX.rs);
      const b = c.getContext('2d');
      c._g = b;
      b.setTransform(DX.TS * DX.rs, 0, 0, DX.TS * DX.rs, -cx * CH * DX.TS * DX.rs, -cy * CH * DX.TS * DX.rs);
      if (DX.g0.osm) DX.paintOsm(b, cx * CH, cy * CH, CH, CH); else paintArea(b, cx * CH, cy * CH, CH, CH);
      chunks.set(k, c);
      return c;
    }
    function rrect(b, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      b.beginPath();
      b.moveTo(x + r, y); b.arcTo(x + w, y, x + w, y + h, r); b.arcTo(x + w, y + h, x, y + h, r); b.arcTo(x, y + h, x, y, r); b.arcTo(x, y, x + w, y, r);
      b.closePath();
    }
    function tree(b, x, y, r, seed) {
      b.fillStyle = DX.C.shadow; b.beginPath(); b.ellipse(x + r * 0.25, y + r * 0.35, r * 1.02, r * 0.9, 0, 0, 7); b.fill();
      b.fillStyle = DX.C['tree-2']; b.beginPath(); b.arc(x, y, r, 0, 7); b.fill();
      b.fillStyle = DX.C.tree;
      for (let i = 0; i < 4; i++) { const a = seed * 6 + i * 1.7; b.beginPath(); b.arc(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35 - r * 0.06, r * 0.62, 0, 7); b.fill(); }
      b.fillStyle = DX.C['tree-hi']; b.beginPath(); b.arc(x - r * 0.3, y - r * 0.34, r * 0.26, 0, 7); b.fill();
    }
    function paintArea(b, x0, y0, w, h) {
      const s0 = DX.s, gg = DX.g0, Wm = s0.W, Hm = s0.H;
      b.fillStyle = DX.C.grass; b.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
      const X0 = Math.max(0, x0 - 2), Y0 = Math.max(0, y0 - 2), X1 = Math.min(Wm, x0 + w + 2), Y1 = Math.min(Hm, y0 + h + 2);
      // strade
      b.fillStyle = DX.C.road;
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (s0.map[y * Wm + x] === '.') b.fillRect(x - 0.01, y - 0.01, 1.02, 1.02);
      // incroci, strisce, linee d'arresto, mezzeria
      for (const N of gg.nodes) {
        if (N.x < x0 - 12 || N.x > x0 + w + 12 || N.y < y0 - 12 || N.y > y0 + h + 12) continue;
        b.fillStyle = DX.C['road-2']; b.fillRect(N.x - 1, N.y - 1, 2, 2);
        for (const d of [0, 1]) {
          const m = N.nb[d];
          if (m < 0) continue;
          const M = gg.nodes[m];
          if (d === 0) {
            const a = N.x + 1, z = M.x - 1, y = N.y;
            b.fillStyle = DX.C.mark;
            for (let x = a + 1.1; x < z - 1.1; x += 0.8) b.fillRect(x, y - 0.04, Math.min(0.42, z - 1.1 - x), 0.08);
            for (const [lit, xs, sgn] of [[N.lit, a, 1], [M.lit, z, -1]]) {
              if (!lit) continue;
              b.fillStyle = DX.C.zebra;
              for (let k = 0; k < 7; k++) b.fillRect(xs + sgn * 0.1 + (sgn < 0 ? -0.6 : 0), y - 0.92 + k * 0.27, 0.6, 0.15);
              b.fillStyle = DX.C.mark;
              if (sgn > 0) b.fillRect(xs + 0.78, y - 0.95, 0.07, 0.9); else b.fillRect(xs - 0.85, y + 0.05, 0.07, 0.9);
            }
          } else {
            const a = N.y + 1, z = M.y - 1, x = N.x;
            b.fillStyle = DX.C.mark;
            for (let y = a + 1.1; y < z - 1.1; y += 0.8) b.fillRect(x - 0.04, y, 0.08, Math.min(0.42, z - 1.1 - y));
            for (const [lit, ys, sgn] of [[N.lit, a, 1], [M.lit, z, -1]]) {
              if (!lit) continue;
              b.fillStyle = DX.C.zebra;
              for (let k = 0; k < 7; k++) b.fillRect(x - 0.92 + k * 0.27, ys + sgn * 0.1 + (sgn < 0 ? -0.6 : 0), 0.15, 0.6);
              b.fillStyle = DX.C.mark;
              if (sgn > 0) b.fillRect(x + 0.05, ys + 0.78, 0.9, 0.07); else b.fillRect(x - 0.95, ys - 0.85, 0.9, 0.07);
            }
          }
        }
      }
      // bordo della città: siepe e alberi
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
        if (s0.map[y * Wm + x] !== '~') continue;
        b.fillStyle = DX.C['grass-2']; b.fillRect(x, y, 1, 1);
        if (hash(x, y) < 0.7) tree(b, x + 0.5 + (hash(y, x) - 0.5) * 0.3, y + 0.5 + (hash(x + 7, y) - 0.5) * 0.3, 0.4 + hash(x, y, 3) * 0.12, hash(x, y, 9));
      }
      // isolati
      for (const bl of gg.blocks) {
        if (bl.x1 < x0 - 1 || bl.x0 > x0 + w + 1 || bl.y1 < y0 - 1 || bl.y0 > y0 + h + 1) continue;
        block(b, bl);
      }
      // ristoranti e deposito
      for (const id of s0.rest) shopSign(b, gg.spots[id], 'food');
      if (s0.depot >= 0) shopSign(b, gg.spots[s0.depot], 'depot');
    }
    function block(b, bl) {
      const { x0, y0, x1, y1 } = bl, w = x1 - x0, h = y1 - y0, S = 0.45;
      // marciapiede con cordolo
      b.fillStyle = DX.C.curb; rrect(b, x0, y0, w, h, 0.32); b.fill();
      b.fillStyle = DX.C.walk; rrect(b, x0 + 0.06, y0 + 0.06, w - 0.12, h - 0.12, 0.28); b.fill();
      b.strokeStyle = DX.C['walk-2']; b.lineWidth = 0.03;
      for (let x = x0 + 1; x < x1; x++) { b.beginPath(); b.moveTo(x, y0 + 0.06); b.lineTo(x, y0 + S); b.moveTo(x, y1 - S); b.lineTo(x, y1 - 0.06); b.stroke(); }
      for (let y = y0 + 1; y < y1; y++) { b.beginPath(); b.moveTo(x0 + 0.06, y); b.lineTo(x0 + S, y); b.moveTo(x1 - S, y); b.lineTo(x1 - 0.06, y); b.stroke(); }
      const ix = x0 + S, iy = y0 + S, iw = w - 2 * S, ih = h - 2 * S;
      const r = HH.rng(((x0 * 73856093) ^ (y0 * 19349663) ^ (x1 * 83492791) ^ DX.s.level) >>> 0);
      if (bl.k === 'park') park(b, ix, iy, iw, ih, r);
      else roofs(b, ix, iy, iw, ih, r);
      // lampioni sul marciapiede
      const lamp = (x, y) => {
        b.fillStyle = DX.C.pole; b.beginPath(); b.arc(x, y, 0.06, 0, 7); b.fill();
        b.fillStyle = DX.C.lamp; b.beginPath(); b.arc(x, y, 0.1, 0, 7); b.fill();
        if (DX.C.night) {
          const gr = b.createRadialGradient(x, y, 0, x, y, 1.5);
          gr.addColorStop(0, DX.C.glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
          b.fillStyle = gr; b.globalCompositeOperation = 'lighter'; b.fillRect(x - 1.5, y - 1.5, 3, 3); b.globalCompositeOperation = 'source-over';
        }
      };
      for (let x = x0 + 1.5; x < x1 - 1; x += 3) { lamp(x, y0 + 0.2); lamp(x, y1 - 0.2); }
      for (let y = y0 + 1.5; y < y1 - 1; y += 3) { lamp(x0 + 0.2, y); lamp(x1 - 0.2, y); }
    }
    function roofs(b, ix, iy, iw, ih, r) {
      // lotti lungo il lato lungo, due file se l'isolato è spesso
      const horiz = iw >= ih, long = horiz ? iw : ih, short = horiz ? ih : iw;
      const rows = short >= 2.8 ? 2 : 1;
      const lots = [];
      let p = 0;
      while (p < long - 0.2) { let len = 1.3 + r() * 1.1; if (long - p - len < 1.1) len = long - p; lots.push([p, len]); p += len; }
      const pal = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
      for (let q = 0; q < rows; q++) for (const [a, len] of lots) {
        const sw = short / rows, x = horiz ? ix + a : ix + q * sw, y = horiz ? iy + q * sw : iy + a, w = horiz ? len : sw, h = horiz ? sw : len;
        const rx = x + 0.05, ry = y + 0.05, rw = w - 0.1, rh = h - 0.1, col = DX.C[pal[Math.floor(r() * pal.length)]], style = r();
        // ombra: gli edifici "alti" proiettano verso sud-est
        const tall = 0.1 + r() * 0.16;
        b.fillStyle = DX.C.shadow; rrect(b, rx + tall, ry + tall * 1.2, rw, rh, 0.12); b.fill();
        b.fillStyle = col; rrect(b, rx, ry, rw, rh, 0.12); b.fill();
        b.strokeStyle = DX.C['roof-edge']; b.lineWidth = 0.05; rrect(b, rx, ry, rw, rh, 0.12); b.stroke();
        if (style < 0.35) {
          // a due falde: metà in ombra e colmo
          b.fillStyle = DX.C['roof-shade'];
          if (rw >= rh) b.fillRect(rx + 0.03, ry + rh / 2, rw - 0.06, rh / 2 - 0.03); else b.fillRect(rx + rw / 2, ry + 0.03, rw / 2 - 0.03, rh - 0.06);
          b.strokeStyle = DX.C['roof-hi']; b.lineWidth = 0.06; b.beginPath();
          if (rw >= rh) { b.moveTo(rx + 0.1, ry + rh / 2); b.lineTo(rx + rw - 0.1, ry + rh / 2); } else { b.moveTo(rx + rw / 2, ry + 0.1); b.lineTo(rx + rw / 2, ry + rh - 0.1); }
          b.stroke();
        } else if (style < 0.6) {
          // tetto piano con condizionatore e sfiato
          b.strokeStyle = DX.C['roof-hi']; b.lineWidth = 0.05; rrect(b, rx + 0.1, ry + 0.1, rw - 0.2, rh - 0.2, 0.08); b.stroke();
          const ax = rx + 0.2 + r() * Math.max(0, rw - 0.75), ay = ry + 0.2 + r() * Math.max(0, rh - 0.65);
          b.fillStyle = DX.C.ac; rrect(b, ax, ay, 0.38, 0.3, 0.05); b.fill();
          b.fillStyle = DX.C['ac-2']; b.beginPath(); b.arc(ax + 0.19, ay + 0.15, 0.09, 0, 7); b.fill();
        } else if (style < 0.78) {
          // pannelli solari
          const n = Math.max(1, Math.floor((rw - 0.2) / 0.36));
          for (let i = 0; i < n; i++) { b.fillStyle = DX.C.solar; b.fillRect(rx + 0.12 + i * 0.36, ry + 0.14, 0.3, Math.max(0.2, rh - 0.28)); b.fillStyle = DX.C['solar-2']; b.fillRect(rx + 0.12 + i * 0.36, ry + 0.14, 0.3, 0.05); }
        } else if (style < 0.9) {
          // serbatoio tondo
          const cx = rx + rw / 2, cy = ry + rh / 2, rr = Math.min(rw, rh) * 0.28;
          b.fillStyle = DX.C.shadow; b.beginPath(); b.arc(cx + 0.06, cy + 0.08, rr, 0, 7); b.fill();
          b.fillStyle = DX.C.ac; b.beginPath(); b.arc(cx, cy, rr, 0, 7); b.fill();
          b.strokeStyle = DX.C['ac-2']; b.lineWidth = 0.05; b.beginPath(); b.arc(cx, cy, rr * 0.6, 0, 7); b.stroke();
        } else {
          // giardino pensile
          b.fillStyle = DX.C['grass-2']; rrect(b, rx + 0.1, ry + 0.1, rw - 0.2, rh - 0.2, 0.1); b.fill();
          for (let i = 0; i < 3; i++) { b.fillStyle = i % 2 ? DX.C.flower : DX.C['flower-2']; b.beginPath(); b.arc(rx + 0.25 + r() * (rw - 0.5), ry + 0.25 + r() * (rh - 0.5), 0.07, 0, 7); b.fill(); }
        }
      }
    }
    function park(b, ix, iy, iw, ih, r) {
      b.fillStyle = DX.C['grass-2']; rrect(b, ix, iy, iw, ih, 0.2); b.fill();
      // vialetti a croce
      b.strokeStyle = DX.C.path; b.lineWidth = 0.32; b.lineCap = 'round';
      b.beginPath(); b.moveTo(ix + 0.2, iy + ih / 2); b.quadraticCurveTo(ix + iw / 2, iy + ih / 2 + (r() - 0.5) * ih * 0.5, ix + iw - 0.2, iy + ih / 2); b.stroke();
      if (iw > 2.4 && ih > 2.4) { b.beginPath(); b.moveTo(ix + iw / 2, iy + 0.2); b.quadraticCurveTo(ix + iw / 2 + (r() - 0.5) * iw * 0.4, iy + ih / 2, ix + iw / 2, iy + ih - 0.2); b.stroke(); }
      // laghetto nei parchi grandi
      if (iw * ih > 14) {
        const px = ix + iw * (0.25 + r() * 0.5), py = iy + ih * (0.25 + r() * 0.5), rx = Math.min(iw, ih) * 0.24;
        b.fillStyle = DX.C['pond-2']; b.beginPath(); b.ellipse(px, py, rx * 1.3 + 0.06, rx + 0.06, 0, 0, 7); b.fill();
        b.fillStyle = DX.C.pond; b.beginPath(); b.ellipse(px, py, rx * 1.3, rx, 0, 0, 7); b.fill();
        b.strokeStyle = DX.C.hi; b.globalAlpha = 0.5; b.lineWidth = 0.05; b.beginPath(); b.ellipse(px - rx * 0.3, py - rx * 0.3, rx * 0.5, rx * 0.25, -0.3, 3.6, 5.2); b.stroke(); b.globalAlpha = 1;
      }
      // fiori e panchine
      for (let i = 0; i < Math.round(iw * ih * 0.6); i++) { b.fillStyle = r() < 0.5 ? DX.C.flower : DX.C['flower-2']; b.beginPath(); b.arc(ix + 0.15 + r() * (iw - 0.3), iy + 0.15 + r() * (ih - 0.3), 0.05, 0, 7); b.fill(); }
      b.fillStyle = DX.C.bench; b.fillRect(ix + iw * 0.3, iy + ih / 2 - 0.36, 0.42, 0.12);
      // alberi su una griglia con un po' di caso
      for (let y = iy + 0.5; y < iy + ih - 0.3; y += 1.05) for (let x = ix + 0.5; x < ix + iw - 0.3; x += 1.05) {
        if (r() < 0.45) continue;
        if (Math.abs(y - (iy + ih / 2)) < 0.4 || (iw > 2.4 && ih > 2.4 && Math.abs(x - (ix + iw / 2)) < 0.4)) continue;
        tree(b, x + (r() - 0.5) * 0.3, y + (r() - 0.5) * 0.3, 0.32 + r() * 0.12, r());
      }
    }
    // insegna sul tetto vicino alla fermata: tendina a righe (ristorante) o portone (deposito)
    function shopSign(b, sp, kind) {
      if (!sp) return;
      const [hx, hy] = P.DIRS[sp.h], nx = -hy, ny = hx;     // nx,ny: verso l'interno dell'isolato
      const cx = sp.x + nx * 0.45, cy = sp.y + ny * 0.45, horiz = sp.h % 2 === 0, w = 1.3, d = 0.34;
      b.save(); b.translate(cx, cy); if (!horiz) b.rotate(Math.PI / 2); if ((horiz && ny < 0) || (!horiz && nx > 0)) b.rotate(Math.PI);
      if (kind === 'food') {
        for (let i = 0; i < 6; i++) { b.fillStyle = i % 2 ? DX.C['awning-2'] : DX.C.awning; b.fillRect(-w / 2 + (i * w) / 6, 0, w / 6 + 0.01, d); }
        b.strokeStyle = DX.C.ink; b.lineWidth = 0.04; b.strokeRect(-w / 2, 0, w, d);
        b.fillStyle = DX.C.awning; for (let i = 0; i < 6; i++) { b.beginPath(); b.arc(-w / 2 + (i + 0.5) * (w / 6), d, w / 12, 0, Math.PI); b.fill(); }
      } else {
        b.fillStyle = DX.C.ac; b.fillRect(-w / 2, 0, w, d + 0.1);
        b.strokeStyle = DX.C['ac-2']; b.lineWidth = 0.05;
        for (let i = 1; i < 4; i++) { b.beginPath(); b.moveTo(-w / 2, (i * (d + 0.1)) / 4); b.lineTo(w / 2, (i * (d + 0.1)) / 4); b.stroke(); }
        b.strokeStyle = DX.C.ink; b.lineWidth = 0.04; b.strokeRect(-w / 2, 0, w, d + 0.1);
      }
      b.restore();
    }

    return { hash, chunk, rrect, tree };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
