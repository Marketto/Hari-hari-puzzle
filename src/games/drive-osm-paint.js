/* Hari Taxi — mappe reali (OpenStreetMap) dipinte in stile kawaii: preparazione, zone, strade, edifici, luoghi, mare, nomi, luci, minimappa.
 * Parte di drive-ui.js (stesso create()): si carica prima e drive-ui.js la monta con HH.driveOsmPaint(DX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // DX = contesto condiviso con drive-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.driveOsmPaint = function (DX) {
    const { reduce, P, hash, rrect, tree } = DX;
    /* ---------- mappe reali (OpenStreetMap) dipinte in stile kawaii ----------
     * Stessa resa della città di Hari: zone a "bolle" morbide dal raster (parchi con alberi tondi, campi a righe,
     * spiaggia con ombrelloni, mare/lago con increspature, pontili di legno), edifici come tetti pastello con ombra,
     * marciapiedi con cordolo e asfalto dal grafo stradale (curve vere), strisce e semafori agli incroci, lampioni,
     * icone dei luoghi. Tutto a blocchi in cache come la città di Hari; a ogni fotogramma solo onde, barchette,
     * cartelli dei luoghi notevoli e il traffico. */

    const LANDMARK = new Set(['pier', 'castle', 'harbour', 'station', 'square', 'sight', 'beach', 'park', 'taxi', 'duomo', 'fountain', 'temple', 'theatre', 'market']);
    const BADGE = new Set(['food', 'cafe', 'gelato', 'bakery', 'shop', 'depot', 'taxi', 'station', 'beach', 'pier', 'castle', 'harbour', 'sight', 'duomo', 'fountain', 'temple', 'theatre', 'market']);
    // luoghi con un disegno a terra attorno all'icona (raggio in caselle): rovine del tempio, cavea del teatro, papiri
    const GROUND = { temple: 3, theatre: 8 };
    const BIG = new Set(['pier', 'castle', 'harbour', 'station', 'duomo', 'fountain', 'temple', 'theatre', 'market']);
    function osmPrep() {
      if (DX.OS && DX.OS.id === DX.s.mapId) return DX.OS;
      const md = P.mapData(DX.s.mapId), blds = P.buildings(md), BC = 8, Wm = md.W, Hm = md.H;
      const bw = Math.ceil(Wm / BC), bh = Math.ceil(Hm / BC);
      const grid = () => Array.from({ length: bw * bh }, () => []);
      const put = (gr, x0, y0, x1, y1, id) => {
        for (let cy = Math.max(0, Math.floor(y0 / BC)); cy <= Math.min(bh - 1, Math.floor(y1 / BC)); cy++) for (let cx = Math.max(0, Math.floor(x0 / BC)); cx <= Math.min(bw - 1, Math.floor(x1 / BC)); cx++) gr[cy * bw + cx].push(id);
      };
      const bgrid = grid(), pgrid = grid();
      for (const b of blds) {
        let a = 0, cx = 0, cy = 0;
        for (let i = 0, j = b.p.length - 1; i < b.p.length; j = i++) { const f = b.p[j][0] * b.p[i][1] - b.p[i][0] * b.p[j][1]; a += f; cx += (b.p[j][0] + b.p[i][0]) * f; cy += (b.p[j][1] + b.p[i][1]) * f; }
        b.area = Math.abs(a / 2); b.cx = a ? cx / (3 * a) : b.p[0][0]; b.cy = a ? cy / (3 * a) : b.p[0][1];
        put(bgrid, b.x0 - 0.5, b.y0 - 0.5, b.x1 + 0.8, b.y1 + 0.8, b.id);
      }
      for (const p of md.pois) if (BADGE.has(p.k)) { const R = GROUND[p.k] || 1; put(pgrid, p.x - R, p.y - R, p.x + R, p.y + R, p.id); }
      // barchette: al largo vicino alla riva e attorno ai porti (ormeggiate)
      const boats = [], A = P.AR, area = md.area;
      const water = (x, y) => x >= 0 && y >= 0 && x < Wm && y < Hm && area[y * Wm + x] === A.WATER;
      const openWater = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!water(x + dx, y + dy)) return false; return true; };
      for (let y = 2; y < Hm - 2; y += 3) for (let x = 2; x < Wm - 2; x += 3) {
        if (!water(x, y) || hash(x, y, 11) > 0.035 || !openWater(x, y, 2)) continue;
        let shore = false;
        for (let r = 3; r <= 30 && !shore; r += 3) if (!water(x + r, y) || !water(x - r, y) || !water(x, y + r) || !water(x, y - r)) shore = true;
        if (shore) boats.push({ x: x + 0.5, y: y + 0.5, a: hash(y, x, 3) * 6.28, k: hash(x, y, 4) < 0.5 ? 0 : 1, ph: hash(x, y, 9) * 6 });
      }
      for (const p of md.pois) if (p.k === 'harbour') {
        let n = 0;
        for (let r = 1; r <= 7 && n < 5; r++) for (let k = 0; k < 8 && n < 5; k++) {
          const x = Math.round(p.x + Math.cos(k * 0.785 + r) * r), y = Math.round(p.y + Math.sin(k * 0.785 + r) * r);
          if (water(x, y) && openWater(x, y, 0) && !boats.some((q) => Math.hypot(q.x - x, q.y - y) < 1.4)) { boats.push({ x: x + 0.5, y: y + 0.5, a: k * 0.785, k: 1 - (n % 2), ph: n, moor: true }); n++; }
        }
      }
      // anatre: attorno a ogni fonte, sulle caselle d'acqua più vicine
      const ducks = [];
      for (const v of P.vectors(md)) if (v.k === 'pond') {
        let cx = 0, cy = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const [x, y] of v.pts) { cx += x; cy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        cx /= v.pts.length; cy /= v.pts.length;
        const r = Math.max(0.2, Math.min(x1 - x0, y1 - y0) / 2 - 0.65);
        for (let k = 0; k < 2; k++) ducks.push({ x: cx, y: cy, r, ph: k * Math.PI });
      }
      DX.OS = { id: DX.s.mapId, md, blds, BC, bw, bh, bgrid, pgrid, boats, ducks, labels: md.pois.filter((p) => LANDMARK.has(p.k) && p.name) };
      return DX.OS;
    }
    function cellIds(gr, O, x0, y0, x1, y1, seen) {
      const out = [];
      for (let cy = Math.max(0, Math.floor(y0 / O.BC)); cy <= Math.min(O.bh - 1, Math.floor(y1 / O.BC)); cy++) for (let cx = Math.max(0, Math.floor(x0 / O.BC)); cx <= Math.min(O.bw - 1, Math.floor(x1 / O.BC)); cx++) {
        for (const id of gr[cy * O.bw + cx]) if (!seen.has(id)) { seen.add(id); out.push(id); }
      }
      return out;
    }
    function edgesIn(x0, y0, x1, y1) {
      const G = DX.g0, seen = new Set(), out = [];
      for (let cy = Math.max(0, Math.floor(y0 / G.EC)); cy <= Math.min(G.eh - 1, Math.floor(y1 / G.EC)); cy++) for (let cx = Math.max(0, Math.floor(x0 / G.EC)); cx <= Math.min(G.ew - 1, Math.floor(x1 / G.EC)); cx++) {
        for (const id of G.egrid[cy * G.ew + cx]) if (!seen.has(id)) { seen.add(id); out.push(G.edges[id]); }
      }
      return out;
    }
    // poligono con gli angoli arrotondati (raggio al massimo r, mai oltre metà lato): tetti e pontili morbidi
    function roundPoly(b, pts, r) {
      const n = pts.length;
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const m0 = mid(pts[n - 1], pts[0]);
      b.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n], pr = pts[(i - 1 + n) % n];
        const rr = Math.min(r, Math.hypot(p[0] - pr[0], p[1] - pr[1]) / 2, Math.hypot(q[0] - p[0], q[1] - p[1]) / 2);
        b.arcTo(p[0], p[1], q[0], q[1], rr);
      }
      b.closePath();
    }
    const polyPath = (b, pts) => { b.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]); };
    // tratto di mezzeria tra t0 e t1 (per la linea tratteggiata)
    function subLine(e, t0, t1) { const out = []; const C0 = DX.g0.center[e.id]; for (let t = t0; t < t1; t += 0.5) out.push(P.along(C0, t)); out.push(P.along(C0, t1)); return out; }
    function paintOsm(b, x0, y0, w, h) {
      const O = osmPrep(), G = DX.g0, md = O.md, A = P.AR, Wm = md.W, Hm = md.H, area = md.area;
      const X0 = Math.max(0, x0 - 2), Y0 = Math.max(0, y0 - 2), X1 = Math.min(Wm, x0 + w + 2), Y1 = Math.min(Hm, y0 + h + 2);
      const at = (x, y) => (x < 0 || y < 0 || x >= Wm || y >= Hm ? -1 : area[y * Wm + x]);
      b.fillStyle = DX.C.grass; b.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
      // zone dal raster, ma con il bordo morbido: campo levigato (finestra 4×4 con pesi 1-3-3-1) e "marching squares"
      // interpolati a metà, così coste, rive e spiagge sono curve e non scalini. Pontili e binari sono vettoriali.
      const WT = [1, 3, 3, 1];
      // (sotto i pontili c'è acqua: il pontile vettoriale ci va sopra)
      const mem = (c, x, y) => { const v = area[Math.min(Hm - 1, Math.max(0, y)) * Wm + Math.min(Wm - 1, Math.max(0, x))]; return v === c || (c === A.WATER && v === A.PIER) ? 1 : 0; };
      const fieldOf = (c) => {
        const fw = X1 - X0 + 1, fh = Y1 - Y0 + 1, f = new Float32Array(fw * fh);
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
          let v = 0;
          for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) v += WT[dx] * WT[dy] * mem(c, X0 + i + dx - 2, Y0 + j + dy - 2);
          f[j * fw + i] = v / 64;
        }
        return { f, fw };
      };
      const ORDER = [[A.FIELD, DX.C.field], [A.PARK, DX.C['grass-2']], [A.PARKING, DX.C.parking], [A.PLAZA, DX.C.walk], [A.SAND, DX.C.sand], [A.WATER, DX.C.sea]];
      const inside = {};
      for (const [c, col] of ORDER) {
        let any = false;
        for (let y = Y0 - 2; y < Y1 + 2 && !any; y++) for (let x = X0 - 2; x < X1 + 2; x++) if (mem(c, x, y)) { any = true; break; }
        if (!any) continue;
        const { f, fw } = fieldOf(c), V = (i, j) => f[(j - Y0) * fw + (i - X0)];
        // soglia: l'acqua (sopra a tutto) al bordo vero; le altre zone un filo più larghe, così sotto l'acqua o tra
        // spiaggia e mare non resta una striscia d'erba
        const TH = c === A.WATER ? 0.5 : 0.32;
        inside[c] = (x, y) => V(x, y) >= 0.5 && V(x + 1, y) >= 0.5 && V(x, y + 1) >= 0.5 && V(x + 1, y + 1) >= 0.5;
        const foam = [];
        b.fillStyle = col; b.beginPath();
        for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
          const cs = [[x, y, V(x, y)], [x + 1, y, V(x + 1, y)], [x + 1, y + 1, V(x + 1, y + 1)], [x, y + 1, V(x, y + 1)]];
          const ins = cs.map((q) => q[2] >= TH);
          if (!ins.some(Boolean)) continue;
          if (ins.every(Boolean)) { b.rect(x - 0.01, y - 0.01, 1.02, 1.02); continue; }
          const poly = [];
          for (let k = 0; k < 4; k++) {
            const A0 = cs[k], B0 = cs[(k + 1) % 4];
            if (ins[k]) poly.push([A0[0], A0[1], 0]);
            if (ins[k] !== ins[(k + 1) % 4]) { const t = (TH - A0[2]) / (B0[2] - A0[2]); poly.push([A0[0] + (B0[0] - A0[0]) * t, A0[1] + (B0[1] - A0[1]) * t, 1]); }
          }
          b.moveTo(poly[0][0], poly[0][1]);
          for (let k = 1; k < poly.length; k++) b.lineTo(poly[k][0], poly[k][1]);
          b.closePath();
          if (c === A.WATER) for (let k = 0; k < poly.length; k++) { const P0 = poly[k], P1 = poly[(k + 1) % poly.length]; if (P0[2] && P1[2]) foam.push(P0, P1); }
        }
        b.fill();
        // schiuma lungo la riva
        if (foam.length) {
          b.strokeStyle = DX.C.foam; b.lineWidth = 0.14; b.lineCap = 'round'; b.beginPath();
          for (let k = 0; k < foam.length; k += 2) { b.moveTo(foam[k][0], foam[k][1]); b.lineTo(foam[k + 1][0], foam[k + 1][1]); }
          b.stroke();
        }
      }
      const deep = (c, x, y) => !!inside[c] && inside[c](x, y);
      // binari e pontili vettoriali (estremi tondi)
      const vec = P.vectors(md).filter((v) => v.pts.some(([px, py]) => px > x0 - 12 && px < x0 + w + 12 && py > y0 - 12 && py < y0 + h + 12));
      b.lineCap = 'round'; b.lineJoin = 'round';
      for (const v of vec) if (v.k === 'rail') {
        b.strokeStyle = DX.C.rail; b.lineWidth = 0.9; b.beginPath(); polyPath(b, v.pts); b.stroke();
        b.strokeStyle = DX.C['rail-2']; b.lineWidth = 0.5; b.setLineDash([0.1, 0.22]); b.beginPath(); polyPath(b, v.pts); b.stroke(); b.setLineDash([]);
        for (const off of [-0.2, 0.2]) { b.strokeStyle = DX.C.pole; b.lineWidth = 0.05; b.beginPath(); polyPath(b, P.offsetLine(v.pts, off)); b.stroke(); }
      }
      for (const v of vec) if (v.k === 'pierArea') {
        b.fillStyle = DX.C.shadow; b.beginPath(); b.save(); b.translate(0.08, 0.12); roundPoly(b, v.pts, 0.25); b.restore(); b.fill();
        b.fillStyle = DX.C.wood; b.beginPath(); roundPoly(b, v.pts, 0.25); b.fill();
        b.save(); b.clip(); b.strokeStyle = DX.C['wood-2']; b.lineWidth = 0.035; b.beginPath();
        let mx0 = 1e9, my0 = 1e9, mx1 = -1e9, my1 = -1e9; for (const [px, py] of v.pts) { mx0 = Math.min(mx0, px); my0 = Math.min(my0, py); mx1 = Math.max(mx1, px); my1 = Math.max(my1, py); }
        const horiz = mx1 - mx0 < my1 - my0;
        if (horiz) for (let q = my0; q < my1; q += 0.28) { b.moveTo(mx0, q); b.lineTo(mx1, q); } else for (let q = mx0; q < mx1; q += 0.28) { b.moveTo(q, my0); b.lineTo(q, my1); }
        b.stroke(); b.restore();
        b.strokeStyle = DX.C['wood-2']; b.lineWidth = 0.06; b.beginPath(); roundPoly(b, v.pts, 0.25); b.stroke();
      }
      for (const v of vec) if (v.k === 'pier') {
        b.strokeStyle = DX.C['wood-2']; b.lineWidth = 1.0; b.beginPath(); polyPath(b, v.pts); b.stroke();
        b.strokeStyle = DX.C.wood; b.lineWidth = 0.86; b.beginPath(); polyPath(b, v.pts); b.stroke();
        b.strokeStyle = DX.C['wood-2']; b.lineWidth = 0.6; b.setLineDash([0.04, 0.24]); b.lineCap = 'butt'; b.beginPath(); polyPath(b, v.pts); b.stroke(); b.setLineDash([]); b.lineCap = 'round';
      }
      // dettagli delle zone (solo ben dentro la zona disegnata)
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
        const c = area[y * Wm + x], hv = hash(x, y, 21);
        if (!deep(c, x, y)) continue;
        if (c === A.WATER) {
          if (hv < 0.08) { b.strokeStyle = DX.C['sea-2']; b.lineWidth = 0.06; b.lineCap = 'round'; b.beginPath(); const cx = x + 0.2 + hash(y, x) * 0.6, cy = y + 0.3 + hash(x, y, 2) * 0.5; b.arc(cx, cy, 0.18, 3.6, 5.8); b.stroke(); }
        } else if (c === A.SAND) {
          if (hv < 0.35) { b.fillStyle = DX.C['sand-2']; b.beginPath(); b.arc(x + hash(y, x, 3), y + hash(x, y, 4), 0.04, 0, 7); b.fill(); }
          if (hv > 0.9 && deep(A.SAND, x, y - 1) && deep(A.SAND, x, y + 1) && !G.road[y * Wm + x]) umbrella(b, x + 0.5, y + 0.5, hash(x, y, 7));
        } else if (c === A.FIELD) {
          b.strokeStyle = DX.C['field-2']; b.lineWidth = 0.08; b.lineCap = 'round';
          b.beginPath(); for (let k = 0; k < 3; k++) { b.moveTo(x + 0.1, y + 0.2 + k * 0.3); b.lineTo(x + 0.9, y + 0.2 + k * 0.3); } b.stroke();
        } else if (c === A.PARKING) {
          b.strokeStyle = DX.C.mark; b.globalAlpha = 0.6; b.lineWidth = 0.05; b.beginPath(); b.moveTo(x + 0.5, y + 0.15); b.lineTo(x + 0.5, y + 0.85); b.stroke(); b.globalAlpha = 1;
        }
      }
      // castelli: cortile e mura merlate (sotto gli edifici del castello, se mappati)
      for (const v of vec) if (v.k === 'castle') {
        b.fillStyle = DX.C.shadow; b.beginPath(); b.save(); b.translate(0.15, 0.2); roundPoly(b, v.pts, 0.3); b.restore(); b.fill();
        b.fillStyle = DX.C.castle; b.beginPath(); roundPoly(b, v.pts, 0.3); b.fill();
        b.strokeStyle = DX.C['castle-2']; b.lineWidth = 0.5; b.setLineDash([0.32, 0.22]); b.lineCap = 'butt'; b.beginPath(); roundPoly(b, v.pts, 0.3); b.stroke(); b.setLineDash([]);
        b.strokeStyle = DX.C.ink; b.lineWidth = 0.05; b.lineCap = 'round'; b.beginPath(); roundPoly(b, v.pts, 0.3); b.stroke();
        b.save(); b.beginPath(); roundPoly(b, v.pts.map(([px, py]) => [px, py]), 0.3); b.clip();
        b.fillStyle = DX.C['grass-2']; b.beginPath(); let cx = 0, cy = 0; for (const [px, py] of v.pts) { cx += px; cy += py; } cx /= v.pts.length; cy /= v.pts.length; b.arc(cx, cy, 0.9, 0, 7); b.fill(); b.restore();
      }
      // disegni a terra dei luoghi speciali (sotto gli edifici): rovine del tempio, cavea del teatro, papiri della fonte
      const grounds = cellIds(O.pgrid, O, x0 - 9, y0 - 9, x0 + w + 9, y0 + h + 9, new Set()).map((i) => md.pois[i]).filter((p) => GROUND[p.k]);
      for (const p of grounds) groundArt(b, p);
      const onGround = (x, y) => grounds.some((p) => Math.hypot(x - p.x, y - p.y) < (p.k === 'theatre' ? 7.2 : 2));
      // edifici: tetti pastello con ombra
      // stile "stone" (Ortigia): pietra chiara (terrazze) e tetti caldi in coppi; altrimenti i tetti pastello di sempre
      const stone = md.raw.style === 'stone';
      const seen = new Set(), pal = stone ? ['stone', 'tile-1', 'stone', 'tile-2', 'tile-3', 'stone', 'tile-1', 'tile-2'] : ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
      const bl = cellIds(O.bgrid, O, x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, seen).map((i) => O.blds[i]);
      b.lineJoin = 'round'; b.lineCap = 'round';
      for (const B of bl) {
        const tall = 0.07 + Math.min(6, B.lv) * 0.035;
        b.fillStyle = DX.C.shadow; b.beginPath(); b.save(); b.translate(tall, tall * 1.2); roundPoly(b, B.p, 0.22); b.restore(); b.fill();
      }
      for (const B of bl) {
        const hv = hash(B.id, 7, 3);
        const pk = B.kind === 1 ? (stone ? 'stone' : 'r7') : B.kind === 2 ? 'ac' : pal[Math.floor(hv * pal.length)], col = DX.C[pk];
        b.fillStyle = col; b.beginPath(); roundPoly(b, B.p, 0.22); b.fill();
        // coppi: file sottili lungo il lato corto (solo sui tetti caldi), dentro il tetto
        if (stone && pk.startsWith('tile') && B.area > 1.2) {
          b.save(); b.clip(); b.strokeStyle = DX.C['roof-shade']; b.lineWidth = 0.07; b.beginPath();
          if (B.x1 - B.x0 > B.y1 - B.y0) for (let q = B.x0 + 0.2; q < B.x1; q += 0.3) { b.moveTo(q, B.y0); b.lineTo(q, B.y1); }
          else for (let q = B.y0 + 0.2; q < B.y1; q += 0.3) { b.moveTo(B.x0, q); b.lineTo(B.x1, q); }
          b.stroke(); b.restore(); b.beginPath(); roundPoly(b, B.p, 0.22);
        }
        // bordo interno chiaro (tetto "imbottito"): il contorno ripassato largo, solo dentro il poligono
        b.save(); b.clip(); b.strokeStyle = DX.C['roof-hi']; b.lineWidth = Math.min(0.32, 0.12 + B.area * 0.01); b.stroke(); b.restore();
        b.strokeStyle = DX.C['roof-edge']; b.lineWidth = 0.05; b.stroke();
        if (stone && pk === 'stone' && B.area > 2) { b.save(); b.clip(); b.strokeStyle = DX.C['stone-2']; b.lineWidth = 0.22; b.stroke(); b.restore(); }
        if (B.area > 2.5) {
          if (B.kind === 2) { b.strokeStyle = DX.C['ac-2']; b.lineWidth = 0.05; b.beginPath(); for (let i = -2; i <= 2; i++) { b.moveTo(B.cx - 0.6, B.cy + i * 0.25); b.lineTo(B.cx + 0.6, B.cy + i * 0.25); } b.stroke(); }
          else if (hv * 7 % 1 < 0.35 && B.area > 4) { b.fillStyle = DX.C.ac; rrect(b, B.cx - 0.2, B.cy - 0.15, 0.4, 0.3, 0.06); b.fill(); b.fillStyle = DX.C['ac-2']; b.beginPath(); b.arc(B.cx, B.cy, 0.09, 0, 7); b.fill(); }
          else if (hv * 7 % 1 < 0.55 && B.area > 4) { for (let i = 0; i < 3; i++) { b.fillStyle = DX.C.solar; b.fillRect(B.cx - 0.5 + i * 0.36, B.cy - 0.18, 0.3, 0.36); b.fillStyle = DX.C['solar-2']; b.fillRect(B.cx - 0.5 + i * 0.36, B.cy - 0.18, 0.3, 0.05); } }
          else if (hv * 7 % 1 < 0.65) { b.fillStyle = DX.C['grass-2']; b.beginPath(); b.arc(B.cx, B.cy, Math.min(0.5, Math.sqrt(B.area) * 0.18), 0, 7); b.fill(); b.fillStyle = DX.C.flower; b.beginPath(); b.arc(B.cx + 0.1, B.cy - 0.06, 0.07, 0, 7); b.fill(); }
        }
        if (B.kind === 1) { b.strokeStyle = DX.C.hi; b.lineWidth = 0.09; b.beginPath(); b.moveTo(B.cx, B.cy - 0.3); b.lineTo(B.cx, B.cy + 0.3); b.moveTo(B.cx - 0.2, B.cy - 0.1); b.lineTo(B.cx + 0.2, B.cy - 0.1); b.stroke(); }
      }
      // alberi tondi nei parchi (non attaccati alle strade)
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
        if (area[y * Wm + x] !== A.PARK || hash(x, y, 31) > 0.42 || (grounds.length && onGround(x + 0.5, y + 0.5))) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const i = (y + dy) * Wm + x + dx; if (G.road[i]) { near = true; break; } }
        if (near) continue;
        tree(b, x + 0.5 + (hash(y, x, 5) - 0.5) * 0.4, y + 0.5 + (hash(x, y, 6) - 0.5) * 0.4, 0.34 + hash(x, y, 3) * 0.16, hash(x, y, 9));
      }
      // strade: cordolo e marciapiede, poi asfalto (vie pedonali lastricate), incroci, mezzeria, strisce
      const es = edgesIn(x0 - 3, y0 - 3, x0 + w + 3, y0 + h + 3);
      b.lineCap = 'round'; b.lineJoin = 'round';
      const strokeAll = (list, width, col) => { b.strokeStyle = col; for (const e of list) { b.lineWidth = width(e); b.beginPath(); polyPath(b, e.pts); b.stroke(); } };
      const fast = es.filter((e) => !e.slow), slow = es.filter((e) => e.slow);
      // ponti sopra l'acqua: ombra sull'acqua, impalcato in pietra più largo della strada, parapetto con colonnine
      const brs = es.filter((e) => e.br);
      if (brs.length) {
        b.lineCap = 'butt';
        const bw = (e) => 2 * (e.hw + P.ASPH + (e.slow ? 0.35 : 0.85));
        // archi: mezzelune d'ombra sull'acqua ai due lati, una ogni ~1,6 caselle
        for (const e of brs) for (let t = 0.8; t < e.len - 0.5; t += 1.6) {
          const [x, y, a] = P.along(DX.g0.center[e.id], t), nx = -Math.sin(a), ny = Math.cos(a);
          for (const sd of [-1, 1]) {
            const r = bw(e) / 2 + 0.05, cx = x + nx * r * sd, cy = y + ny * r * sd;
            b.fillStyle = DX.C['sea-2']; b.beginPath(); b.ellipse(cx, cy, 0.62, 0.34, a, sd > 0 ? 0 : Math.PI, sd > 0 ? Math.PI : 2 * Math.PI); b.fill();
          }
        }
        b.save(); b.translate(0.22, 0.36); strokeAll(brs, bw, DX.C.shadow); b.restore();
        strokeAll(brs, (e) => bw(e) + 0.12, DX.C['bridge-2']);
        strokeAll(brs, (e) => bw(e) - 0.2, DX.C.bridge);
        b.lineCap = 'round';
      }
      strokeAll(fast, (e) => 2 * (e.hw + P.ASPH + 0.62), DX.C.curb);
      strokeAll(fast, (e) => 2 * (e.hw + P.ASPH + 0.55), DX.C.walk);
      strokeAll(slow, (e) => 2 * (e.hw + P.ASPH), DX.C['walk-2']);
      strokeAll(slow, (e) => 2 * (e.hw + P.ASPH) - 0.14, DX.C.walk);
      strokeAll(fast, (e) => 2 * (e.hw + P.ASPH), DX.C.road);
      const nodes = new Set();
      for (const e of es) { nodes.add(e.a); nodes.add(e.b); }
      for (const n of nodes) {
        const N = G.nodes[n];
        if (N.deg < 3) continue;
        b.fillStyle = DX.C['road-2']; b.beginPath(); b.arc(N.x, N.y, N.hw + P.ASPH * 0.6, 0, 7); b.fill();
      }
      b.strokeStyle = DX.C.mark; b.lineWidth = 0.07; b.setLineDash([0.42, 0.38]);
      for (const e of fast) {
        if (e.one || e.hw < 0.85) continue;
        const t0 = G.nodes[e.a].r + 0.3, t1 = e.len - G.nodes[e.b].r - 0.3;
        if (t1 - t0 < 0.8) continue;
        b.beginPath(); polyPath(b, subLine(e, t0, t1)); b.stroke();
      }
      b.setLineDash([]);
      for (const n of nodes) {
        const N = G.nodes[n];
        if (!N.lit || N.deg > 4) continue;
        for (const i of N.inc) {
          const e = G.edges[i];
          if (e.slow || e.len < 2 * N.r + 1) continue;
          const t = e.a === n ? N.r - 0.4 : e.len - N.r + 0.4;
          if (t < 0.3 || t > e.len - 0.3) continue;
          const [x, y, a] = P.along(G.center[e.id], t), half = e.hw + P.ASPH - 0.12;
          b.save(); b.translate(x, y); b.rotate(a);
          b.fillStyle = DX.C.zebra;
          for (let v = -half; v <= half - 0.12; v += 0.27) b.fillRect(-0.3, v, 0.6, 0.15);
          // linea d'arresto per chi arriva (sul suo lato destro)
          const into = e.a === n ? -1 : 1;
          b.fillStyle = DX.C.mark; b.fillRect(into > 0 ? -0.42 : 0.35, into > 0 ? 0 : -half, 0.07, half);
          b.restore();
        }
      }
      // parapetti dei ponti (sopra al marciapiede): muretto di pietra con colonnine e pilastri alle testate
      for (const e of brs) {
        const half = e.hw + P.ASPH + (e.slow ? 0.35 : 0.85) - 0.12;
        for (const sd of [-1, 1]) {
          const line = P.offsetLine(e.pts, sd * half);
          b.lineCap = 'butt';
          b.strokeStyle = DX.C['bridge-2']; b.lineWidth = 0.26; b.beginPath(); polyPath(b, line); b.stroke();
          b.strokeStyle = DX.C.bridge; b.lineWidth = 0.13; b.beginPath(); polyPath(b, line); b.stroke();
          b.lineCap = 'round';
          const L = P.polyOf(line);
          b.fillStyle = DX.C['bridge-2'];
          for (let t = 0.35; t < L.len - 0.3; t += 0.4) { const [x, y] = P.along(L, t); b.beginPath(); b.arc(x, y, 0.045, 0, 7); b.fill(); }
          for (const t of [0.12, L.len - 0.12]) { const [x, y] = P.along(L, t); b.fillStyle = DX.C.bridge; b.strokeStyle = DX.C['bridge-2']; b.lineWidth = 0.07; b.beginPath(); b.arc(x, y, 0.22, 0, 7); b.fill(); b.stroke(); b.fillStyle = DX.C.lamp; b.beginPath(); b.arc(x, y, 0.09, 0, 7); b.fill(); }
        }
      }
      // lampioni lungo i marciapiedi
      for (const e of fast) for (let t = 2; t < e.len - 1; t += 4) {
        const [x, y, a] = P.along(G.center[e.id], t), sd = Math.floor(t / 4) % 2 ? 1 : -1, off = e.hw + P.ASPH + 0.3;
        const lx = x - Math.sin(a) * off * sd, ly = y + Math.cos(a) * off * sd;
        if (lx < x0 - 2 || lx > x0 + w + 2 || ly < y0 - 2 || ly > y0 + h + 2) continue;
        b.fillStyle = DX.C.pole; b.beginPath(); b.arc(lx, ly, 0.06, 0, 7); b.fill();
        b.fillStyle = DX.C.lamp; b.beginPath(); b.arc(lx, ly, 0.1, 0, 7); b.fill();
        if (DX.C.night) { const gr = b.createRadialGradient(lx, ly, 0, lx, ly, 1.5); gr.addColorStop(0, DX.C.glow); gr.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = gr; b.globalCompositeOperation = 'lighter'; b.fillRect(lx - 1.5, ly - 1.5, 3, 3); b.globalCompositeOperation = 'source-over'; }
      }
      // ristoranti e deposito del livello: tendina a righe / portone sul lato verso le case
      for (const id of DX.s.rest) shopSignO(b, G.spots[id], 'food');
      if (DX.s.depot >= 0) shopSignO(b, G.spots[DX.s.depot], 'depot');
      // fonti (sopra a lastricato e vie pedonali che le contornano)
      for (const v of vec) if (v.k === 'pond') pond(b, v.pts);
      // icone dei luoghi
      const ps = cellIds(O.pgrid, O, x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, new Set()).map((i) => md.pois[i]);
      for (const p of ps) poiIcon(b, p.k, p.x, p.y, BIG.has(p.k) ? 0.42 : 0.3);
    }
    function groundArt(b, p) {
      const { x, y } = p;
      b.lineCap = 'round'; b.lineJoin = 'round';
      if (p.k === 'temple') {
        // basamento a gradini e colonne tonde (alcune spezzate): un tempio dorico in rovina
        b.fillStyle = DX.C.shadow; rrect(b, x - 1.5, y - 0.75, 3.2, 1.7, 0.2); b.fill();
        b.fillStyle = DX.C['stone-2']; rrect(b, x - 1.6, y - 0.85, 3.2, 1.7, 0.2); b.fill();
        b.fillStyle = DX.C.stone; rrect(b, x - 1.4, y - 0.68, 2.8, 1.36, 0.16); b.fill();
        for (let i = 0; i < 6; i++) for (const yy of [-0.48, 0.48]) {
          const cx = x - 1.15 + i * 0.46, broken = hash(i, yy > 0 ? 1 : 2, 5) < 0.35;
          b.fillStyle = DX.C.shadow; b.beginPath(); b.arc(cx + 0.05, yy + y + 0.07, 0.15, 0, 7); b.fill();
          b.fillStyle = broken ? DX.C['stone-2'] : DX.C.stone; b.strokeStyle = DX.C['roof-edge']; b.lineWidth = 0.035; b.beginPath(); b.arc(cx, y + yy, broken ? 0.12 : 0.15, 0, 7); b.fill(); b.stroke();
        }
      } else if (p.k === 'theatre') {
        // cavea a semicerchio con le gradinate, aperta verso sud, e l'orchestra di sabbia
        const R = 6.5;
        b.fillStyle = DX.C.shadow; b.beginPath(); b.arc(x + 0.2, y + 0.3, R, Math.PI * 0.95, Math.PI * 2.05); b.closePath(); b.fill();
        b.fillStyle = DX.C.stone; b.beginPath(); b.arc(x, y, R, Math.PI * 0.95, Math.PI * 2.05); b.closePath(); b.fill();
        b.strokeStyle = DX.C['stone-2']; b.lineWidth = 0.09;
        for (let r = 2.1; r < R; r += 0.55) { b.beginPath(); b.arc(x, y, r, Math.PI * 0.97, Math.PI * 2.03); b.stroke(); }
        for (let k = 1; k < 9; k++) { const a = Math.PI + (k * Math.PI) / 9; b.beginPath(); b.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); b.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); b.stroke(); }
        b.fillStyle = DX.C.sand; b.beginPath(); b.arc(x, y, 1.8, 0, 7); b.fill();
        b.strokeStyle = DX.C['roof-edge']; b.lineWidth = 0.05; b.beginPath(); b.arc(x, y, R, Math.PI * 0.95, Math.PI * 2.05); b.closePath(); b.stroke();
      }
    }
    // fonte (contorno vero, vettoriale): bordo di pietra, acqua, ciuffi di papiro lungo il bordo
    function pond(b, pts) {
      b.lineJoin = 'round';
      b.fillStyle = DX.C.shadow; b.beginPath(); b.save(); b.translate(0.1, 0.14); roundPoly(b, pts, 0.5); b.restore(); b.fill();
      b.strokeStyle = DX.C['stone-2']; b.lineWidth = 0.5; b.beginPath(); roundPoly(b, pts, 0.5); b.stroke();
      b.strokeStyle = DX.C.stone; b.lineWidth = 0.3; b.stroke();
      b.fillStyle = DX.C.sea; b.fill();
      b.save(); b.clip();
      b.strokeStyle = DX.C['sea-2']; b.lineWidth = 0.05; b.lineCap = 'round';
      let cx = 0, cy = 0; for (const [px, py] of pts) { cx += px; cy += py; } cx /= pts.length; cy /= pts.length;
      for (const [dx, dy] of [[-0.5, 0.2], [0.4, -0.3], [0.2, 0.5]]) { b.beginPath(); b.arc(cx + dx, cy + dy, 0.16, 3.6, 5.8); b.stroke(); }
      b.restore();
      // papiri: sul bordo, dalla parte più lontana dal centro di ogni lato (un ciuffo ogni ~0,8 caselle, in sequenza fissa)
      let acc = 0;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], L = Math.hypot(bx - ax, by - ay);
        for (let t = 0.3; t < L; t += 0.8) {
          if (hash(i, Math.floor(t * 10), 61) < 0.25) continue;
          const px = ax + ((bx - ax) * t) / L, py = ay + ((by - ay) * t) / L, k = 0.22;
          papyrus(b, px + (cx - px) * k, py + (cy - py) * k, 0.3 + hash(i, Math.floor(t * 10), 62) * 0.12);
        }
        acc += L;
      }
      void acc;
    }
    function papyrus(b, x, y, r) {
      b.strokeStyle = DX.C['papyrus-2']; b.lineWidth = 0.04;
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.42; b.beginPath(); b.moveTo(x, y + r * 0.3); b.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); b.stroke(); }
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.42; b.fillStyle = k % 2 ? DX.C.papyrus : DX.C['papyrus-2']; b.beginPath(); b.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.32, 0, 7); b.fill(); }
    }
    function umbrella(b, x, y, hv) {
      const cols = [DX.C['umb-1'], DX.C['umb-2'], DX.C['umb-3']], r = 0.34;
      b.fillStyle = DX.C.shadow; b.beginPath(); b.ellipse(x + 0.12, y + 0.14, r, r * 0.8, 0, 0, 7); b.fill();
      for (let k = 0; k < 8; k++) { b.fillStyle = k % 2 ? DX.C.hi : cols[Math.floor(hv * 3)]; b.beginPath(); b.moveTo(x, y); b.arc(x, y, r, (k * Math.PI) / 4, ((k + 1) * Math.PI) / 4); b.closePath(); b.fill(); }
      b.strokeStyle = DX.C['roof-edge']; b.lineWidth = 0.03; b.beginPath(); b.arc(x, y, r, 0, 7); b.stroke();
      b.fillStyle = DX.C.ink; b.beginPath(); b.arc(x, y, 0.04, 0, 7); b.fill();
      if (hv > 0.5) { b.fillStyle = cols[(Math.floor(hv * 3) + 1) % 3]; rrect(b, x + 0.28, y - 0.05, 0.22, 0.42, 0.05); b.fill(); }
    }
    // icone dei luoghi: piccolo bollino tondo con il disegno (solo forme, colori dai token)
    function poiIcon(b, k, x, y, r) {
      if (!BADGE.has(k)) return;
      b.save(); b.translate(x, y);
      b.fillStyle = DX.C.shadow; b.beginPath(); b.arc(r * 0.18, r * 0.24, r, 0, 7); b.fill();
      b.fillStyle = DX.C['pin-2']; b.strokeStyle = DX.C.ink; b.lineWidth = 0.04; b.beginPath(); b.arc(0, 0, r, 0, 7); b.fill(); b.stroke();
      const s0 = r / 0.3; b.scale(s0, s0); b.lineWidth = 0.035;
      const ink = () => { b.strokeStyle = DX.C.ink; b.stroke(); };
      if (k === 'food') { b.fillStyle = DX.C.pizza; b.beginPath(); b.moveTo(0, 0.2); b.lineTo(-0.16, -0.14); b.quadraticCurveTo(0, -0.24, 0.16, -0.14); b.closePath(); b.fill(); ink(); b.fillStyle = DX.C['pizza-2']; b.beginPath(); b.arc(-0.03, -0.06, 0.035, 0, 7); b.arc(0.04, 0.04, 0.03, 0, 7); b.fill(); }
      else if (k === 'gelato') { b.fillStyle = DX.C.p1; b.beginPath(); b.moveTo(-0.1, -0.02); b.lineTo(0.1, -0.02); b.lineTo(0, 0.22); b.closePath(); b.fill(); ink(); b.fillStyle = DX.C['cake-2']; b.beginPath(); b.arc(0, -0.08, 0.11, 0, 7); b.fill(); ink(); }
      else if (k === 'cafe') { b.fillStyle = DX.C.ac; rrect(b, -0.13, -0.08, 0.2, 0.22, 0.05); b.fill(); ink(); b.beginPath(); b.arc(0.1, 0.02, 0.06, -1.4, 1.4); ink(); b.strokeStyle = DX.C.steam; b.beginPath(); b.moveTo(-0.05, -0.12); b.quadraticCurveTo(-0.01, -0.18, -0.05, -0.24); b.stroke(); }
      else if (k === 'bakery') { b.fillStyle = DX.C.ramen; b.beginPath(); b.ellipse(0, 0.02, 0.18, 0.1, 0, 0, 7); b.fill(); ink(); b.strokeStyle = DX.C.p1; b.beginPath(); b.moveTo(-0.06, -0.06); b.lineTo(-0.03, 0.1); b.moveTo(0.06, -0.06); b.lineTo(0.03, 0.1); b.stroke(); }
      else if (k === 'shop') { b.fillStyle = DX.C.awning; rrect(b, -0.14, -0.06, 0.28, 0.24, 0.04); b.fill(); ink(); b.beginPath(); b.arc(0, -0.06, 0.08, Math.PI, 0); ink(); }
      else if (k === 'depot') { b.fillStyle = DX.C.p1; b.beginPath(); b.moveTo(-0.16, -0.06); b.lineTo(0, -0.14); b.lineTo(0.16, -0.06); b.lineTo(0.16, 0.12); b.lineTo(0, 0.2); b.lineTo(-0.16, 0.12); b.closePath(); b.fill(); ink(); b.strokeStyle = DX.C.tape; b.lineWidth = 0.05; b.beginPath(); b.moveTo(-0.08, -0.1); b.lineTo(0.08, -0.02); b.stroke(); }
      else if (k === 'taxi') { b.fillStyle = DX.C.taxi; rrect(b, -0.16, -0.1, 0.32, 0.2, 0.05); b.fill(); ink(); b.fillStyle = DX.C.check; for (let i = 0; i < 4; i++) b.fillRect(-0.12 + i * 0.06 + (i % 2) * 0.0, -0.02, 0.03, 0.04); }
      else if (k === 'station') { b.fillStyle = DX.C.bus; rrect(b, -0.14, -0.17, 0.28, 0.3, 0.07); b.fill(); ink(); b.fillStyle = DX.C.glass; b.fillRect(-0.09, -0.12, 0.18, 0.09); b.fillStyle = DX.C.head; b.beginPath(); b.arc(-0.07, 0.07, 0.03, 0, 7); b.arc(0.07, 0.07, 0.03, 0, 7); b.fill(); b.strokeStyle = DX.C.ink; b.beginPath(); b.moveTo(-0.1, 0.2); b.lineTo(-0.06, 0.13); b.moveTo(0.1, 0.2); b.lineTo(0.06, 0.13); b.stroke(); }
      else if (k === 'beach') { b.fillStyle = DX.C['umb-1']; b.beginPath(); b.arc(0, -0.02, 0.18, Math.PI, 0); b.closePath(); b.fill(); ink(); b.strokeStyle = DX.C.ink; b.beginPath(); b.moveTo(0, -0.02); b.lineTo(0, 0.2); b.stroke(); b.fillStyle = DX.C.sand; b.fillRect(-0.18, 0.15, 0.36, 0.06); }
      else if (k === 'pier') { b.fillStyle = DX.C.wood; b.fillRect(-0.06, -0.2, 0.12, 0.4); b.strokeStyle = DX.C['wood-2']; b.beginPath(); for (let i = -1; i <= 1; i++) { b.moveTo(-0.06, i * 0.1); b.lineTo(0.06, i * 0.1); } b.stroke(); b.fillStyle = DX.C.sea; b.fillRect(-0.2, -0.04, 0.12, 0.08); b.fillRect(0.08, -0.04, 0.12, 0.08); }
      else if (k === 'castle') { b.fillStyle = DX.C.castle; b.beginPath(); b.moveTo(-0.16, 0.18); b.lineTo(-0.16, -0.1); b.lineTo(-0.1, -0.1); b.lineTo(-0.1, -0.05); b.lineTo(-0.03, -0.05); b.lineTo(-0.03, -0.1); b.lineTo(0.03, -0.1); b.lineTo(0.03, -0.05); b.lineTo(0.1, -0.05); b.lineTo(0.1, -0.1); b.lineTo(0.16, -0.1); b.lineTo(0.16, 0.18); b.closePath(); b.fill(); ink(); b.fillStyle = DX.C['castle-2']; rrect(b, -0.04, 0.06, 0.08, 0.12, 0.04); b.fill(); b.fillStyle = DX.C.stop; b.beginPath(); b.moveTo(0, -0.1); b.lineTo(0, -0.24); b.lineTo(0.1, -0.2); b.lineTo(0, -0.17); b.fill(); }
      else if (k === 'harbour') { b.fillStyle = DX.C.sail; b.beginPath(); b.moveTo(0, -0.2); b.lineTo(0, 0.04); b.lineTo(0.14, 0.04); b.closePath(); b.fill(); ink(); b.fillStyle = DX.C['boat-2']; b.beginPath(); b.moveTo(-0.16, 0.07); b.lineTo(0.16, 0.07); b.lineTo(0.1, 0.16); b.lineTo(-0.1, 0.16); b.closePath(); b.fill(); ink(); }
      else if (k === 'duomo') {
        // facciata barocca: timpano, colonne, portone e croce
        b.fillStyle = DX.C.stone; b.beginPath(); b.moveTo(-0.17, 0.19); b.lineTo(-0.17, -0.04); b.lineTo(0, -0.17); b.lineTo(0.17, -0.04); b.lineTo(0.17, 0.19); b.closePath(); b.fill(); ink();
        b.strokeStyle = DX.C['stone-2']; b.lineWidth = 0.03; b.beginPath(); for (const cx of [-0.11, -0.04, 0.04, 0.11]) { b.moveTo(cx, -0.01); b.lineTo(cx, 0.17); } b.stroke();
        b.fillStyle = DX.C['tile-1']; rrect(b, -0.035, 0.07, 0.07, 0.12, 0.03); b.fill();
        b.strokeStyle = DX.C.ink; b.lineWidth = 0.035; b.beginPath(); b.moveTo(0, -0.17); b.lineTo(0, -0.27); b.moveTo(-0.04, -0.23); b.lineTo(0.04, -0.23); b.stroke();
      } else if (k === 'fountain') {
        // la fonte: specchio d'acqua, papiri e un'anatra
        b.fillStyle = DX.C.sea; b.beginPath(); b.ellipse(0, 0.08, 0.2, 0.11, 0, 0, 7); b.fill(); ink();
        papyrus(b, -0.09, 0.04, 0.17);
        b.fillStyle = DX.C['duck-b']; b.beginPath(); b.ellipse(0.08, 0.07, 0.07, 0.045, 0, 0, 7); b.arc(0.12, 0.0, 0.035, 0, 7); b.fill(); b.strokeStyle = DX.C.ink; b.lineWidth = 0.02; b.stroke();
        b.fillStyle = DX.C['beak-b']; b.beginPath(); b.moveTo(0.15, -0.005); b.lineTo(0.19, 0.005); b.lineTo(0.15, 0.015); b.fill();
      } else if (k === 'temple') {
        b.fillStyle = DX.C.stone; b.beginPath(); b.moveTo(-0.19, -0.08); b.lineTo(0, -0.2); b.lineTo(0.19, -0.08); b.closePath(); b.fill(); ink();
        b.fillRect(-0.19, 0.14, 0.38, 0.06); b.strokeRect(-0.19, 0.14, 0.38, 0.06);
        for (const cx of [-0.13, -0.045, 0.045, 0.13]) { b.fillStyle = DX.C.stone; b.fillRect(cx - 0.025, -0.07, 0.05, 0.21); b.strokeStyle = DX.C['stone-2']; b.lineWidth = 0.02; b.strokeRect(cx - 0.025, -0.07, 0.05, 0.21); }
      } else if (k === 'theatre') {
        b.fillStyle = DX.C.stone; b.beginPath(); b.arc(0, 0.08, 0.2, Math.PI, 0); b.closePath(); b.fill(); ink();
        b.strokeStyle = DX.C['stone-2']; b.lineWidth = 0.025; for (const r of [0.08, 0.13, 0.17]) { b.beginPath(); b.arc(0, 0.08, r, Math.PI, 0); b.stroke(); }
        b.fillStyle = DX.C.sand; b.beginPath(); b.arc(0, 0.08, 0.05, Math.PI, 0); b.fill();
        b.fillStyle = DX.C['tile-1']; b.fillRect(-0.2, 0.1, 0.4, 0.05);
      } else if (k === 'market') {
        // banco del mercato: tendina a righe e frutta
        for (let i = 0; i < 4; i++) { b.fillStyle = i % 2 ? DX.C['awning-2'] : DX.C.awning; b.fillRect(-0.18 + i * 0.09, -0.16, 0.09, 0.1); }
        b.strokeStyle = DX.C.ink; b.lineWidth = 0.03; b.strokeRect(-0.18, -0.16, 0.36, 0.1);
        b.fillStyle = DX.C.wood; b.fillRect(-0.16, 0.04, 0.32, 0.13); b.strokeRect(-0.16, 0.04, 0.32, 0.13);
        for (const [fx, fc] of [[-0.09, DX.C['tile-1']], [0, DX.C.papyrus], [0.09, DX.C['beak-b']]]) { b.fillStyle = fc; b.beginPath(); b.arc(fx, 0.02, 0.045, 0, 7); b.fill(); }
      } else if (k === 'sight') { b.fillStyle = DX.C.star; b.beginPath(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, q = i % 2 ? 0.08 : 0.18; b.lineTo(Math.cos(a) * q, Math.sin(a) * q); } b.closePath(); b.fill(); ink(); }
      b.restore();
    }
    function shopSignO(b, sp, kind) {
      if (!sp) return;
      let nx = sp.x - sp.zx, ny = sp.y - sp.zy;
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      const cx = sp.x + nx * 0.5, cy = sp.y + ny * 0.5, w = 1.3, d = 0.34;
      b.save(); b.translate(cx, cy); b.rotate(Math.atan2(ny, nx) - Math.PI / 2 + Math.PI);
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
    // a ogni fotogramma: onde, barchette che dondolano, cartelli dei luoghi notevoli
    function drawSea(t, inView, vx0, vy0, vx1, vy1) {
      const O = osmPrep(), md = O.md, A = P.AR, Wm = md.W, rm = reduce();
      DX.g.strokeStyle = DX.C.foam; DX.g.lineWidth = 0.06; DX.g.lineCap = 'round';
      DX.g.beginPath();
      for (let y = Math.max(0, Math.floor(vy0)); y < Math.min(md.H, Math.ceil(vy1)); y++) for (let x = Math.max(0, Math.floor(vx0)); x < Math.min(Wm, Math.ceil(vx1)); x++) {
        if (md.area[y * Wm + x] !== A.WATER) continue;
        const hv = hash(x, y, 41);
        if (hv > 0.07) continue;
        const ph = rm ? 0 : t * 1.3 + hv * 90, dx = Math.sin(ph) * 0.15, cx = x + 0.3 + hash(y, x, 2) * 0.4 + dx, cy = y + 0.5;
        DX.g.moveTo(cx - 0.22, cy); DX.g.quadraticCurveTo(cx - 0.11, cy - 0.12, cx, cy); DX.g.quadraticCurveTo(cx + 0.11, cy - 0.12, cx + 0.22, cy);
      }
      DX.g.stroke();
      for (const q of O.boats) {
        if (!inView(q.x, q.y, 2)) continue;
        const bob = rm ? 0 : Math.sin(t * 1.6 + q.ph) * 0.06, a = q.a + (rm || q.moor ? 0 : Math.sin(t * 0.3 + q.ph) * 0.15);
        DX.g.save(); DX.g.translate(q.x, q.y + bob); DX.g.rotate(a);
        DX.g.fillStyle = DX.C.shadow; DX.g.beginPath(); DX.g.ellipse(0.06, 0.08, 0.5, 0.2, 0, 0, 7); DX.g.fill();
        DX.g.fillStyle = q.k ? DX.C['boat-2'] : DX.C.boat; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 0.035;
        DX.g.beginPath(); DX.g.moveTo(-0.45, -0.16); DX.g.lineTo(0.3, -0.16); DX.g.quadraticCurveTo(0.55, 0, 0.3, 0.16); DX.g.lineTo(-0.45, 0.16); DX.g.closePath(); DX.g.fill(); DX.g.stroke();
        DX.g.fillStyle = DX.C.sail; DX.g.beginPath(); DX.g.moveTo(-0.15, -0.02); DX.g.lineTo(0.2, 0); DX.g.lineTo(-0.15, 0.1); DX.g.closePath(); DX.g.fill(); DX.g.stroke();
        if (!q.moor && !rm) { DX.g.strokeStyle = DX.C.foam; DX.g.beginPath(); DX.g.moveTo(-0.55, -0.1); DX.g.lineTo(-0.85, -0.18); DX.g.moveTo(-0.55, 0.1); DX.g.lineTo(-0.85, 0.18); DX.g.stroke(); }
        DX.g.restore();
      }
      // anatre della Fonte Aretusa: nuotano piano in tondo sulle caselle d'acqua della fonte
      for (const d of O.ducks) {
        if (!inView(d.x, d.y, 2)) continue;
        const a = rm ? d.ph : t * 0.35 + d.ph, x = d.x + Math.cos(a) * d.r, y = d.y + Math.sin(a) * d.r * 0.7, dir = a + Math.PI / 2;
        DX.g.save(); DX.g.translate(x, y); DX.g.scale(Math.cos(dir) < 0 ? -1 : 1, 1);
        DX.g.fillStyle = DX.C.shadow; DX.g.beginPath(); DX.g.ellipse(0.03, 0.06, 0.2, 0.1, 0, 0, 7); DX.g.fill();
        DX.g.fillStyle = DX.C['duck-b']; DX.g.strokeStyle = DX.C.ink; DX.g.lineWidth = 0.03;
        DX.g.beginPath(); DX.g.ellipse(0, 0, 0.19, 0.11, 0, 0, 7); DX.g.fill(); DX.g.stroke();
        DX.g.beginPath(); DX.g.arc(0.13, -0.1, 0.08, 0, 7); DX.g.fill(); DX.g.stroke();
        DX.g.fillStyle = DX.C['beak-b']; DX.g.beginPath(); DX.g.moveTo(0.2, -0.11); DX.g.lineTo(0.29, -0.09); DX.g.lineTo(0.2, -0.07); DX.g.closePath(); DX.g.fill();
        DX.g.fillStyle = DX.C.ink; DX.g.beginPath(); DX.g.arc(0.15, -0.12, 0.018, 0, 7); DX.g.fill();
        DX.g.restore();
      }
    }
    function drawLabels(inView) {
      const O = osmPrep(), c = DX.s.car, list = O.labels.filter((p) => inView(p.x, p.y, 1)).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y)).slice(0, 6)
        .sort((a, b) => (BIG.has(b.k) ? 1 : 0) - (BIG.has(a.k) ? 1 : 0));   // se due cartelli si accavallano vince il monumento
      if (!list.length) return;
      DX.screen();
      const fs = Math.max(10, Math.min(13, DX.TS * 0.3));
      DX.g.font = `800 ${fs}px "M PLUS Rounded 1c", sans-serif`; DX.g.textAlign = 'center'; DX.g.textBaseline = 'middle';
      const used = [];
      for (const p of list) {
        const [px0, sy0] = DX.toS(p.x, p.y), sy = sy0 - DX.TS * 0.62, tw = Math.min(DX.g.measureText(p.name).width, DX.W * 0.5), pw = tw + 14, ph = fs + 8;
        const sx = Math.max(pw / 2 + 4, Math.min(DX.W - pw / 2 - 4, px0));
        // cartelli che si accavallano: resta quello del luogo più vicino a Hari (la lista è già in quest'ordine)
        if (used.some((q) => Math.abs(q[0] - sx) < (q[2] + pw) / 2 && Math.abs(q[1] - sy) < ph)) continue;
        used.push([sx, sy, pw]);
        DX.g.fillStyle = DX.C.street; DX.g.strokeStyle = DX.C['street-ink']; DX.g.lineWidth = 1.2; DX.g.globalAlpha = 0.95;
        DX.rr(sx - pw / 2, sy - ph / 2, pw, ph, ph / 2); DX.g.fill(); DX.g.stroke();
        const tx = Math.max(sx - pw / 2 + 8, Math.min(sx + pw / 2 - 8, px0));
        DX.g.beginPath(); DX.g.moveTo(tx - 4, sy + ph / 2 - 0.5); DX.g.lineTo(tx, sy + ph / 2 + 5); DX.g.lineTo(tx + 4, sy + ph / 2 - 0.5); DX.g.fill();
        DX.g.globalAlpha = 1; DX.g.fillStyle = DX.C['street-ink']; DX.g.fillText(p.name, sx, sy + 0.5, DX.W * 0.5);
      }
      DX.world();
    }
    function drawLightsO(inView) {
      const G = DX.g0;
      for (let n = 0; n < G.nodes.length; n++) {
        const N = G.nodes[n];
        if (!N.lit || !inView(N.x, N.y, 2)) continue;
        const Lg = P.light(DX.s, n);
        for (const i of N.inc) {
          const e = G.edges[i];
          if (e.slow) continue;
          const din = 2 * i + (e.b === n ? 0 : 1), t = e.a === n ? Math.min(e.len, N.r + 0.15) : Math.max(0, e.len - N.r - 0.15);
          const [x, y, a] = P.along(G.center[i], t), dirIn = e.a === n ? a + Math.PI : a, off = e.hw + P.ASPH + 0.25;
          // sull'angolo a destra di chi arriva
          const px = x - Math.sin(dirIn) * off, py = y + Math.cos(dirIn) * off;
          const col = Lg.ph === G.grp[din] ? (Lg.left < 1.3 ? DX.C.amber : DX.C.go) : DX.C.stop;
          DX.g.fillStyle = DX.C.pole; DX.rr(px - 0.15, py - 0.1, 0.3, 0.2, 0.08); DX.g.fill();
          DX.g.fillStyle = col; DX.g.beginPath(); DX.g.arc(px, py, 0.075, 0, 7); DX.g.fill();
          if (DX.C.night) { DX.g.globalAlpha = 0.35; DX.g.beginPath(); DX.g.arc(px, py, 0.2, 0, 7); DX.g.fill(); DX.g.globalAlpha = 1; }
        }
      }
    }
    // minimappa delle mappe reali: immagine a 1 pixel per casella, se ne mostra una finestra attorno a Hari
    function paintMiniOsm() {
      const md = P.mapData(DX.s.mapId), A = P.AR, Wm = md.W, Hm = md.H;
      DX.mini = document.createElement('canvas'); DX.mini.width = Wm; DX.mini.height = Hm;
      const b = DX.mini.getContext('2d');
      DX.mini._g = b;
      const col = { [A.LAND]: DX.C['mm-bld'], [A.PARK]: DX.C['mm-park'], [A.FIELD]: DX.C['mm-park'], [A.SAND]: DX.C['mm-sand'], [A.WATER]: DX.C['mm-water'], [A.PLAZA]: DX.C.walk, [A.PIER]: DX.C.wood, [A.PARKING]: DX.C['mm-bld'], [A.RAIL]: DX.C['mm-bld'] };
      for (let y = 0; y < Hm; y++) {
        let x = 0;
        while (x < Wm) {
          const i = y * Wm + x, c = DX.g0.road[i] ? 'r' : md.area[i];
          let j = x + 1;
          while (j < Wm && (DX.g0.road[y * Wm + j] ? 'r' : md.area[y * Wm + j]) === c) j++;
          b.fillStyle = c === 'r' ? DX.C['mm-road'] : col[c] || DX.C['mm-bld'];
          b.fillRect(x, y, j - x, 1);
          x = j;
        }
      }
    }

    return { osmPrep, edgesIn, paintOsm, drawSea, drawLabels, drawLightsO, paintMiniOsm };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
