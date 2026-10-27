/* Hari Home — disegno isometrico 2.5D su <canvas> (stanza, mobili, Hari, luci del giorno e della notte).
 * Nessun colore scritto qui: tutto arriva dai token CSS --lh-* (life.css) letti con getComputedStyle (HH.lifeDraw.tokens).
 *
 * Proiezione: P(x, y, z) -> schermo; x lungo il muro destro (R, piano y = 0), y lungo il muro sinistro (L, piano x = 0),
 * z verso l'alto. Le facce visibili di una scatola sono: sopra, +y (a sinistra in basso) e +x (a destra in basso).
 * Gli oggetti si disegnano in coordinate locali (u = larghezza, v = profondità verso il davanti): con r = 1 l'oggetto
 * è ruotato e il davanti guarda +x invece di +y, ma il codice di disegno è lo stesso.
 *
 * HH.lifeDraw.view(s, W, H)             misure e origine per far stare la casa nel palco
 * HH.lifeDraw.scene(g, s, V, C, A)      disegna tutto (A = animazioni dalla UI: Hari, amico, fantasma, particelle…)
 * HH.lifeDraw.hit(s, V, px, py, A)      cosa c'è sotto il dito: hari | item | wall | dmg | tile
 * HH.lifeDraw.thumb(id, C, w, h)        miniatura di un oggetto del catalogo (canvas)
 * HH.lifeDraw.sprites                   SVG di Hari (4 età × pose) e degli amici, da "cuocere" in bitmap
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const D = HH.lifeData;
  const { ITEMS, HOMES, DAMAGES } = D;
  const WH = 2.35, TH = 0.22, SLAB = 0.32;

  const TOKENS = ['ink', 'line', 'shade', 'shade-2', 'hi', 'ground', 'slab-1', 'slab-2', 'cap', 'cap-side', 'base', 'grid', 'ok', 'bad', 'sel',
    'fl-worn-1', 'fl-worn-2', 'fl-wood-1', 'fl-wood-2', 'fl-tatami-1', 'fl-tatami-2', 'fl-tiles-1', 'fl-tiles-2', 'fl-parquet-1', 'fl-parquet-2',
    'wl-peel-1', 'wl-peel-2', 'wl-paint-1', 'wl-paint-2', 'wl-stripes-1', 'wl-stripes-2', 'wl-dots-1', 'wl-dots-2', 'wl-sakura-1', 'wl-sakura-2',
    'crack', 'mold', 'mold-2', 'web', 'water', 'water-2', 'hole', 'peel-back', 'tape', 'stain',
    'frame', 'glass', 'curtain', 'curtain-2', 'sky-night', 'sky-dawn', 'sky-day', 'star', 'snow', 'leaf-au', 'petal',
    'night', 'dusk', 'sun-beam', 'dusk-beam', 'moon-beam', 'lamp-glow', 'bulb', 'tv-glow', 'fire',
    'door', 'door-2', 'gold', 'mat',
    'wood-1', 'wood-2', 'wood-3', 'white', 'white-2', 'metal', 'metal-2', 'old', 'old-2', 'pink', 'pink-2', 'mint', 'mint-2',
    'blue', 'blue-2', 'yellow', 'lilac', 'lilac-2', 'leaf', 'leaf-2', 'pot', 'pot-2', 'screen', 'screen-on', 'brick', 'fish', 'drape',
    'flower', 'flower-2', 'paper', 'red'];
  // token -> colori (stringhe) per il canvas
  function tokens(el) {
    const cs = G.getComputedStyle(el), C = {};
    TOKENS.forEach((t) => { C[t] = cs.getPropertyValue('--lh-' + t).trim() || 'transparent'; });
    C.key = TOKENS.map((t) => C[t]).join('|');
    return C;
  }

  /* ---------- vista ---------- */
  function view(s, W, H, pad = 10) {
    const { c, r } = HOMES[s.home.tier];
    const hw = Math.max(6, Math.min((W - pad * 2) / (c + r + TH * 2 + 0.2), (H - pad * 2) / ((c + r) * 0.5 + WH * 1.12 + SLAB * 1.12 + 0.5)));
    const hh = hw / 2, zh = hw * 1.12;
    const ox = W / 2 - ((c - r) * hw) / 2;
    const total = (c + r) * hh + WH * zh + SLAB * zh;
    const oy = (H - total) / 2 + WH * zh + hh * 0.3;
    return { W, H, c, r, hw, hh, zh, ox, oy };
  }
  const P = (V, x, y, z = 0) => [V.ox + (x - y) * V.hw, V.oy + (x + y) * V.hh - z * V.zh];

  /* ---------- primitive ---------- */
  let g, V, C, NOW = 0;
  function poly(pts, fill, stroke, lw) {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || Math.max(0.7, V.hw * 0.045); g.lineJoin = 'round'; g.stroke(); }
  }
  const W3 = (x, y, z) => P(V, x, y, z);
  // scatola in coordinate del mondo, con le due facce laterali ombreggiate e il contorno cel
  function wbox(x, y, z, w, d, h, col, opt = {}) {
    const top = [W3(x, y, z + h), W3(x + w, y, z + h), W3(x + w, y + d, z + h), W3(x, y + d, z + h)];
    const fy = [W3(x, y + d, z), W3(x + w, y + d, z), W3(x + w, y + d, z + h), W3(x, y + d, z + h)];
    const fx = [W3(x + w, y, z), W3(x + w, y + d, z), W3(x + w, y + d, z + h), W3(x + w, y, z + h)];
    const ln = opt.noline ? null : C.line;
    if (opt.alpha != null) g.globalAlpha = opt.alpha;
    poly(fy, opt.side || col); poly(fy, C.shade, ln);
    poly(fx, opt.side || col); poly(fx, C['shade-2'], ln);
    poly(top, opt.top || col, ln);
    if (opt.alpha != null) g.globalAlpha = 1;
  }
  // cornice locale dell'oggetto: (u, v) -> (x, y) del mondo
  function frame(it) {
    const I = ITEMS[it.id];
    return { it, I, r: it.r ? 1 : 0, W: I.w, D: I.d || 1, map: (u, v) => (it.r ? [it.x + v, it.y + u] : [it.x + u, it.y + v]) };
  }
  function lbox(F, u, v, z, du, dv, dz, col, opt) {
    const [x, y] = F.map(u, v);
    if (F.r) wbox(x, y, z, dv, du, dz, col, opt); else wbox(x, y, z, du, dv, dz, col, opt);
  }
  const LP = (F, u, v, z) => { const [x, y] = F.map(u, v); return W3(x, y, z); };
  // rettangolo sul piano frontale v = vv (guarda verso chi gioca)
  function lfront(F, u0, u1, z0, z1, vv, col, opt = {}) {
    const pts = [LP(F, u0, vv, z0), LP(F, u1, vv, z0), LP(F, u1, vv, z1), LP(F, u0, vv, z1)];
    poly(pts, col, opt.noline ? null : C.line);
    if (!opt.noshade) poly(pts, F.r ? C['shade-2'] : C.shade);
  }
  // rettangolo orizzontale (piano z)
  function lflat(F, u, v, z, du, dv, col, line) { poly([LP(F, u, v, z), LP(F, u + du, v, z), LP(F, u + du, v + dv, z), LP(F, u, v + dv, z)], col, line ? C.line : null); }
  function lellipse(F, u, v, z, rad, col, line) {
    const [x, y] = LP(F, u, v, z);
    g.beginPath(); g.ellipse(x, y, rad * V.hw * 1.41, rad * V.hh * 1.41, 0, 0, 7);
    g.fillStyle = col; g.fill();
    if (line) { g.strokeStyle = C.line; g.lineWidth = Math.max(0.7, V.hw * 0.045); g.stroke(); }
  }
  function blob(px, py, rad, col, line = true) {
    g.beginPath(); g.arc(px, py, rad, 0, 7); g.fillStyle = col; g.fill();
    if (line) { g.strokeStyle = C.line; g.lineWidth = Math.max(0.6, V.hw * 0.04); g.stroke(); }
  }
  function seg(a, b, col, w) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }
  // piano di un muro: lato L (x = 0, coordinata a lungo y) o R (y = 0, coordinata a lungo x)
  const WP = (side, a, z, off = 0.02) => (side === 'L' ? W3(off, a, z) : W3(a, off, z));
  function wrect(side, a0, a1, z0, z1, col, line = true, off) {
    poly([WP(side, a0, z0, off), WP(side, a1, z0, off), WP(side, a1, z1, off), WP(side, a0, z1, off)], col, line ? C.line : null);
  }
  // pseudo-casuale fisso per le texture
  const hash = (a, b, k = 0) => { let h = (a * 374761393 + b * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  /* ---------- pavimento ---------- */
  function floorTile(i, j, st) {
    const q = [W3(i, j, 0), W3(i + 1, j, 0), W3(i + 1, j + 1, 0), W3(i, j + 1, 0)];
    const a = C[`fl-${st}-1`], b = C[`fl-${st}-2`], lw = Math.max(0.6, V.hw * 0.035);
    if (st === 'tiles') { poly(q, (i + j) % 2 ? a : b, C.line, lw * 0.8); return; }
    poly(q, a);
    if (st === 'tatami') {
      const k = 0.08;
      poly([W3(i + k, j + k, 0), W3(i + 1 - k, j + k, 0), W3(i + 1 - k, j + 1 - k, 0), W3(i + k, j + 1 - k, 0)], null, b, lw * 1.6);
      for (let t = 1; t < 4; t++) (i + j) % 2 ? seg(W3(i + t / 4, j + k, 0), W3(i + t / 4, j + 1 - k, 0), b, lw * 0.6) : seg(W3(i + k, j + t / 4, 0), W3(i + 1 - k, j + t / 4, 0), b, lw * 0.6);
      return;
    }
    if (st === 'parquet') {
      for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
        const x0 = i + qx / 2, y0 = j + qy / 2, alt = (qx + qy + i + j) % 2;
        for (let t = 1; t < 3; t++) alt ? seg(W3(x0 + t / 6, y0, 0), W3(x0 + t / 6, y0 + 0.5, 0), b, lw) : seg(W3(x0, y0 + t / 6, 0), W3(x0 + 0.5, y0 + t / 6, 0), b, lw);
      }
      poly(q, null, b, lw);
      return;
    }
    // assi di legno (nuove o rovinate): giunture sfalsate
    for (let t = 1; t < 3; t++) seg(W3(i, j + t / 3, 0), W3(i + 1, j + t / 3, 0), b, lw);
    for (let t = 0; t < 3; t++) { const jx = i + ((t + i * 2 + j) % 3) / 3 + 0.15; seg(W3(jx, j + t / 3, 0), W3(jx, j + (t + 1) / 3, 0), b, lw); }
    seg(W3(i, j + 1, 0), W3(i + 1, j + 1, 0), b, lw);
    if (st === 'worn') {
      // graffi e macchie
      if (hash(i, j) < 0.45) { const u = 0.2 + hash(i, j, 1) * 0.5, v = 0.2 + hash(i, j, 2) * 0.5; seg(W3(i + u, j + v, 0), W3(i + u + 0.25, j + v + 0.05, 0), C.stain, lw * 1.2); }
      if (hash(i, j, 3) < 0.25) { const [x, y] = W3(i + 0.5, j + 0.6, 0); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(x, y, V.hw * 0.32, V.hh * 0.28, 0, 0, 7); g.fillStyle = C.stain; g.fill(); g.globalAlpha = 1; }
    }
  }

  /* ---------- muri ---------- */
  function wallPattern(side, len, st) {
    const a = C[`wl-${st}-1`], b = C[`wl-${st}-2`];
    wrect(side, 0, len, 0, WH, a, false, 0);
    if (st === 'stripes') for (let k = 0; k < len * 2; k++) wrect(side, k / 2 + 0.06, k / 2 + 0.2, 0.2, WH, b, false, 0.001);
    if (st === 'dots' || st === 'sakura') {
      for (let k = 0; k < len * 3; k++) for (let zz = 0; zz < 6; zz++) {
        const ax = (k + (zz % 2) * 0.5) / 3 + 0.08, z = 0.45 + zz * 0.33;
        if (ax > len - 0.05 || z > WH - 0.12) continue;
        const [x, y] = WP(side, ax, z, 0.001);
        if (st === 'dots') blob(x, y, V.hw * 0.055, b, false);
        else { for (let p = 0; p < 5; p++) { const an = (p / 5) * Math.PI * 2 + k; blob(x + Math.cos(an) * V.hw * 0.06, y + Math.sin(an) * V.hw * 0.06, V.hw * 0.045, b, false); } blob(x, y, V.hw * 0.03, C.gold, false); }
      }
    }
    if (st === 'peel') {
      // macchie d'umidità e intonaco vecchio
      g.globalAlpha = 0.55;
      for (let k = 0; k < len; k++) if (hash(k, side === 'L' ? 1 : 2) < 0.5) { const [x, y] = WP(side, k + 0.5, 0.6 + hash(k, 3) * 1.2, 0.001); g.beginPath(); g.ellipse(x, y, V.hw * 0.3, V.hw * 0.22, 0, 0, 7); g.fillStyle = b; g.fill(); }
      g.globalAlpha = 1;
    }
    if (st === 'paint') wrect(side, 0, len, WH - 0.16, WH - 0.1, b, false, 0.001);
    // battiscopa
    wrect(side, 0, len, 0, 0.16, C.base, false, 0.002);
  }
  function walls(s) {
    const { c, r } = V;
    wallPattern('L', r, s.home.wall);
    wallPattern('R', c, s.home.wall);
    // muro destro un po' più in ombra (la luce entra dalle finestre)
    poly([W3(0, 0, 0), W3(c, 0, 0), W3(c, 0, WH), W3(0, 0, WH)], C.shade);
    poly([W3(0, 0, 0), W3(0, r, 0), W3(0, r, WH), W3(0, 0, WH)], null, C.line);
    poly([W3(0, 0, 0), W3(c, 0, 0), W3(c, 0, WH), W3(0, 0, WH)], null, C.line);
    // spessore: bordo superiore e testate
    poly([W3(-TH, r, WH), W3(0, r, WH), W3(0, 0, WH), W3(c, 0, WH), W3(c, -TH, WH), W3(-TH, -TH, WH)], C.cap, C.line);
    poly([W3(0, r, 0), W3(-TH, r, 0), W3(-TH, r, WH), W3(0, r, WH)], C['cap-side'], C.line);
    poly([W3(c, 0, 0), W3(c, -TH, 0), W3(c, -TH, WH), W3(c, 0, WH)], C['cap-side'], C.line);
    poly([W3(c, 0, 0), W3(c, -TH, 0), W3(c, -TH, WH), W3(c, 0, WH)], C['shade-2']);
  }
  function slab() {
    const { c, r } = V;
    // ombra a terra e "zoccolo" del pavimento (effetto plastico)
    const [gx, gy] = W3(c / 2, r / 2, -SLAB);
    g.beginPath(); g.ellipse(gx, gy + V.hh * 0.5, (c + r) * V.hw * 0.56, (c + r) * V.hh * 0.6, 0, 0, 7); g.fillStyle = C.ground; g.fill();
    poly([W3(-TH, r, 0), W3(c, r, 0), W3(c, r, -SLAB), W3(-TH, r, -SLAB)], C['slab-1'], C.line);
    poly([W3(c, -TH, 0), W3(c, r, 0), W3(c, r, -SLAB), W3(c, -TH, -SLAB)], C['slab-2'], C.line);
  }
  function doorL(s) {
    const r = V.r;
    wrect('L', r - 0.86, r - 0.14, 0, 1.72, C.door, true, 0.01);
    wrect('L', r - 0.76, r - 0.24, 0.95, 1.6, C['door-2'], true, 0.012);
    wrect('L', r - 0.76, r - 0.24, 0.12, 0.85, C['door-2'], true, 0.012);
    const [kx, ky] = WP('L', r - 0.26, 0.9, 0.03);
    blob(kx, ky, V.hw * 0.06, C.gold);
    // zerbino
    poly([W3(0.05, r - 0.85, 0.005), W3(0.75, r - 0.85, 0.005), W3(0.75, r - 0.15, 0.005), W3(0.05, r - 0.15, 0.005)], C.mat, C.line);
  }

  /* ---------- luce del cielo (finestre) ---------- */
  function skyMix(s) {
    const L = HH.life, dl = L.daylight(s), h = (s.t % 1440) / 60;
    const dusk = Math.max(0, 1 - Math.abs(h - 6.5) / 1.6, 1 - Math.abs(h - 19.5) / 1.6);
    return { dl, dusk, season: L.clock(s).season };
  }
  function windows(s, mix) {
    const { win } = HOMES[s.home.tier];
    win.forEach(([side, i, w], wi) => {
      const a0 = i + 0.14, a1 = i + w - 0.14, z0 = 0.85, z1 = 1.95;
      // cielo: notte, poi giorno e tramonto sovrapposti
      wrect(side, a0, a1, z0, z1, C['sky-night'], false, 0.005);
      g.globalAlpha = mix.dl; wrect(side, a0, a1, z0, z1, C['sky-day'], false, 0.006);
      g.globalAlpha = mix.dusk * 0.85; wrect(side, a0, a1, (z0 + z1) / 2 - 0.1, z1, C['sky-dawn'], false, 0.007);
      g.globalAlpha = 1;
      if (mix.dl < 0.4) for (let k = 0; k < 4; k++) { const [x, y] = WP(side, a0 + (a1 - a0) * hash(k, wi, 5), z0 + 0.2 + 0.8 * hash(k, wi, 6), 0.008); blob(x, y, V.hw * 0.025, C.star, false); }
      // stagione dalla finestra: petali, foglie, fiocchi di neve
      const sc = mix.season;
      if (sc !== 1) for (let k = 0; k < 5; k++) {
        const ph = (NOW * 0.25 + k * 0.21) % 1, ax = a0 + (a1 - a0) * ((hash(k, wi, 7) + ph * 0.2) % 1), z = z1 - (z1 - z0) * ph;
        const [x, y] = WP(side, ax, z, 0.009);
        blob(x, y, V.hw * (sc === 3 ? 0.035 : 0.04), sc === 0 ? C.petal : sc === 2 ? C['leaf-au'] : C.snow, false);
      }
      wrect(side, a0, a1, z0, z1, C.glass, false, 0.01);
      // telaio a croce e davanzale
      const lw = Math.max(1.4, V.hw * 0.09);
      poly([WP(side, a0, z0, 0.012), WP(side, a1, z0, 0.012), WP(side, a1, z1, 0.012), WP(side, a0, z1, 0.012)], null, C.frame, lw);
      seg(WP(side, (a0 + a1) / 2, z0, 0.012), WP(side, (a0 + a1) / 2, z1, 0.012), C.frame, lw * 0.7);
      seg(WP(side, a0, (z0 + z1) / 2 + 0.05, 0.012), WP(side, a1, (z0 + z1) / 2 + 0.05, 0.012), C.frame, lw * 0.7);
      if (side === 'R') wbox(a0 - 0.08, 0, z0 - 0.08, a1 - a0 + 0.16, 0.14, 0.08, C.frame);
      else wbox(0, a0 - 0.08, z0 - 0.08, 0.14, a1 - a0 + 0.16, 0.08, C.frame);
      // tendine
      const cur = (b0, b1) => poly([WP(side, b0, z1 + 0.08, 0.03), WP(side, b1, z1 + 0.08, 0.03), WP(side, b1 - (b1 - b0) * 0.35, z0 + 0.25, 0.03), WP(side, b0, z0 + 0.1, 0.03)], C.curtain, C.line);
      cur(a0 - 0.12, a0 + 0.22); cur(a1 + 0.12, a1 - 0.22);
      // vetro rotto (guasto "window" sulla prima finestra): crepe e nastro adesivo
      if (wi === 0 && s.home.dmg.includes('window')) {
        const m = (a0 + a1) / 2 - 0.25;
        g.lineWidth = Math.max(0.8, V.hw * 0.04);
        [[m, 1.6, m + 0.18, 1.45], [m + 0.18, 1.45, m + 0.1, 1.25], [m + 0.18, 1.45, m + 0.38, 1.5], [m + 0.18, 1.45, m + 0.3, 1.25]].forEach(([u0, z0b, u1, z1b]) => seg(WP(side, u0, z0b, 0.015), WP(side, u1, z1b, 0.015), C.crack, Math.max(0.8, V.hw * 0.04)));
        poly([WP(side, m - 0.05, 1.32, 0.02), WP(side, m + 0.42, 1.6, 0.02), WP(side, m + 0.45, 1.53, 0.02), WP(side, m - 0.02, 1.25, 0.02)], C.tape, C.line);
      }
    });
  }

  /* ---------- guasti ---------- */
  function damages(s) {
    const lw = Math.max(1, V.hw * 0.06);
    for (const id of s.home.dmg) {
      const at = DAMAGES[id].at;
      if (id === 'crack') {
        const a = at[1] + 0.3, pts = [[0, 2.1], [0.14, 1.85], [0.05, 1.6], [0.22, 1.35], [0.12, 1.12], [0.3, 0.9]];
        for (let k = 1; k < pts.length; k++) seg(WP('L', a + pts[k - 1][0], pts[k - 1][1], 0.01), WP('L', a + pts[k][0], pts[k][1], 0.01), C.crack, lw);
        seg(WP('L', a + 0.05, 1.6, 0.01), WP('L', a - 0.12, 1.45, 0.01), C.crack, lw * 0.7);
      } else if (id === 'peel') {
        const a = at[1] + 0.15;
        wrect('R', a, a + 0.6, 1.3, 2.05, C.hole, false, 0.008);
        poly([WP('R', a, 2.05, 0.02), WP('R', a + 0.6, 2.05, 0.02), WP('R', a + 0.45, 1.55, 0.25), WP('R', a + 0.15, 1.35, 0.3)], C['peel-back'], C.line);
      } else if (id === 'mold') {
        const a = at[1] + 0.2;
        [[0.1, 0.35, 0.14], [0.35, 0.3, 0.18], [0.55, 0.45, 0.12], [0.3, 0.6, 0.1], [0.7, 0.25, 0.1]].forEach(([u, z, rr], k) => {
          const [x, y] = WP('L', a + u, z, 0.01);
          blob(x, y, rr * V.hw, k % 2 ? C.mold : C['mold-2'], false);
        });
        // muffina "carina": due puntini d'occhi
        const [ex, ey] = WP('L', a + 0.35, 0.32, 0.02);
        blob(ex - V.hw * 0.06, ey, V.hw * 0.025, C.ink, false); blob(ex + V.hw * 0.06, ey, V.hw * 0.025, C.ink, false);
      } else if (id === 'web') {
        const [cx, cy] = W3(0.02, 0.02, WH - 0.02);
        g.strokeStyle = C.web; g.lineWidth = Math.max(0.6, V.hw * 0.025);
        const R = V.hw * 0.75;
        for (let k = 0; k < 5; k++) { const an = Math.PI * (0.15 + k * 0.17); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * R * 1.1, cy + Math.sin(an) * R); g.stroke(); }
        for (let ring = 1; ring < 4; ring++) { g.beginPath(); for (let k = 0; k < 5; k++) { const an = Math.PI * (0.15 + k * 0.17), rr = (R * ring) / 3.3; const x = cx + Math.cos(an) * rr * 1.1, y = cy + Math.sin(an) * rr; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
        // ragnetto che dondola
        const sw = Math.sin(NOW * 1.6) * V.hw * 0.08;
        seg([cx + V.hw * 0.4, cy + V.hw * 0.2], [cx + V.hw * 0.4 + sw, cy + V.hw * 0.75], C.web, 0.8);
        blob(cx + V.hw * 0.4 + sw, cy + V.hw * 0.8, V.hw * 0.07, C.ink, false);
      } else if (id === 'floor') {
        const [x, y] = [at[1], at[2]];
        poly([W3(x + 0.2, y + 0.25, 0), W3(x + 0.75, y + 0.2, 0), W3(x + 0.8, y + 0.62, 0), W3(x + 0.3, y + 0.75, 0)], C.hole, C.line);
        seg(W3(x + 0.2, y + 0.25, 0.01), W3(x + 0.05, y + 0.45, 0.12), C['fl-worn-2'], Math.max(1.5, V.hw * 0.1));
        seg(W3(x + 0.75, y + 0.2, 0.01), W3(x + 0.95, y + 0.15, 0.1), C['fl-worn-2'], Math.max(1.5, V.hw * 0.1));
      }
    }
  }
  // perdita d'acqua: pozzanghera con cerchi e gocce che cadono dal soffitto (animata)
  function leak(s) {
    if (!s.home.dmg.includes('leak')) return;
    const [, x, y] = DAMAGES.leak.at;
    const [px, py] = W3(x + 0.5, y + 0.5, 0);
    g.beginPath(); g.ellipse(px, py, V.hw * 0.62, V.hh * 0.6, 0, 0, 7); g.fillStyle = C.water; g.fill();
    const ph = (NOW % 1.3) / 1.3;
    g.globalAlpha = 1 - ph; g.beginPath(); g.ellipse(px, py, V.hw * 0.62 * ph, V.hh * 0.6 * ph, 0, 0, 7); g.strokeStyle = C['water-2']; g.lineWidth = 1.2; g.stroke(); g.globalAlpha = 1;
    const dz = WH * (1 - ph);
    const [dx, dy] = W3(x + 0.5, y + 0.5, dz);
    g.beginPath(); g.moveTo(dx, dy - V.hw * 0.12); g.quadraticCurveTo(dx + V.hw * 0.07, dy, dx, dy + V.hw * 0.05); g.quadraticCurveTo(dx - V.hw * 0.07, dy, dx, dy - V.hw * 0.12); g.fillStyle = C['water-2']; g.fill();
  }

  /* ---------- quadri e oggetti a muro ---------- */
  function wallItem(it, s, ghost) {
    const I = ITEMS[it.id], side = it.side, a0 = it.i + 0.12, a1 = it.i + I.w - 0.12;
    if (ghost) g.globalAlpha = 0.7;
    if (I.k === 'clock') {
      const zc = 1.55, R = 0.3, ring = (rr, off) => { const pts = []; for (let k = 0; k < 20; k++) { const an = (k / 20) * Math.PI * 2; pts.push(WP(side, it.i + 0.5 + Math.cos(an) * rr, zc + Math.sin(an) * rr, off)); } return pts; };
      poly(ring(R, 0.03), C.pink, C.line); poly(ring(R * 0.78, 0.035), C.white);
      const h = ((s.t % 1440) / 60) % 12, m = s.t % 60;
      const hand = (an, len, w) => seg(WP(side, it.i + 0.5, zc, 0.04), WP(side, it.i + 0.5 + Math.sin(an) * len, zc + Math.cos(an) * len, 0.04), C.ink, w);
      hand((h / 12) * Math.PI * 2, R * 0.45, Math.max(1.2, V.hw * 0.07)); hand((m / 60) * Math.PI * 2, R * 0.65, Math.max(0.8, V.hw * 0.045));
    } else if (I.k === 'shelf') {
      if (side === 'L') wbox(0, a0, 1.25, 0.28, a1 - a0, 0.07, C['wood-1']); else wbox(a0, 0, 1.25, a1 - a0, 0.28, 0.07, C['wood-1']);
      const base = (u) => (side === 'L' ? W3(0.14, u, 1.32) : W3(u, 0.14, 1.32));
      const [px, py] = base(a0 + 0.2); wbox(side === 'L' ? 0.05 : a0 + 0.12, side === 'L' ? a0 + 0.12 : 0.05, 1.32, 0.16, 0.16, 0.14, C.pot);
      blob(px, py - V.zh * 0.3, V.hw * 0.13, C.leaf); blob(px + V.hw * 0.1, py - V.zh * 0.38, V.hw * 0.1, C['leaf-2']);
      [C.red, C.blue, C.yellow].forEach((col, k) => { if (side === 'L') wbox(0.04, a1 - 0.36 + k * 0.1, 1.32, 0.18, 0.08, 0.3 - k * 0.04, col); else wbox(a1 - 0.36 + k * 0.1, 0.04, 1.32, 0.08, 0.18, 0.3 - k * 0.04, col); });
    } else {
      const z0 = I.k === 'poster' ? 1.0 : 0.95, z1 = I.k === 'poster' ? 1.75 : 1.85;
      wrect(side, a0, a1, z0, z1, I.k === 'poster' ? C.paper : C['wood-2'], true, 0.02);
      const b = I.k === 'poster' ? 0 : 0.07;
      const s0 = a0 + b, s1 = a1 - b, y0 = z0 + b, y1 = z1 - b;
      wrect(side, s0, s1, y0, y1, C['sky-day'], false, 0.025);
      // paesaggio: collina, sole (poster) · montagna e sakura (quadri)
      poly([WP(side, s0, y0, 0.03), WP(side, s1, y0, 0.03), WP(side, s1, y0 + (y1 - y0) * 0.35, 0.03), WP(side, (s0 + s1) / 2, y0 + (y1 - y0) * (I.k === 'poster' ? 0.5 : 0.75), 0.03), WP(side, s0, y0 + (y1 - y0) * 0.3, 0.03)], I.k === 'poster' ? C.leaf : C.lilac);
      const [sx, sy] = WP(side, s1 - (s1 - s0) * 0.28, y1 - (y1 - y0) * 0.25, 0.035);
      blob(sx, sy, V.hw * 0.09 * (I.w), I.k === 'poster' ? C.yellow : C.pink, false);
      if (I.k === 'poster') [[a0, z1], [a1, z1]].forEach(([u, z]) => { const [tx, ty] = WP(side, u, z - 0.04, 0.04); blob(tx, ty, V.hw * 0.05, C.tape, false); });
    }
    g.globalAlpha = 1;
  }

  /* ---------- mobili ---------- */
  const HGT = { bed: 0.6, shower: 2.05, tub: 0.6, fridge: 1.65, stove: 0.95, oven: 1.2, table: 0.8, sofa: 0.85, tv: 1.05, books: 1.85, aquarium: 1.25, desk: 1.2, bench: 1.1, mat: 0.3, bike: 1.1, plant: 1.1, flowers: 0.8, lamp: 1.75, rug: 0.02 };
  function heightOf(id) { const I = ITEMS[id]; return I.k === 'bed' && I.t === 3 ? 2.1 : I.k === 'plant' && I.t === 2 ? 1.45 : HGT[I.k] || 1; }
  const DRAW = {
    bed(F, t, A) {
      const { W, D: Dd } = F, I = F.I;
      if (I.t === 0) {
        lbox(F, 0.06, 0.08, 0, W - 0.12, Dd - 0.14, 0.22, C.old);
        lflat(F, 0.3, 0.9, 0.221, 0.25, 0.3, C.stain);
        lbox(F, 0.16, 0.14, 0.22, W - 0.32, 0.32, 0.1, C['old-2']);
        if (A.sleeper) A.sleeper(LP(F, W / 2, 0.36, 0.34), 0.95);
        lbox(F, 0.06, 0.85, 0.22, W - 0.12, Dd - 1.0, 0.07, C['old-2']);
        lflat(F, 0.5, 1.2, 0.295, 0.28, 0.24, C.blue, true);
        return;
      }
      const frameC = [null, C['wood-2'], C.pink, C.white][I.t], blanket = [null, C.blue, C.pink, C.lilac][I.t];
      lbox(F, 0, 0, 0, W, 0.14, I.t === 3 ? 1.2 : 0.95, frameC);
      lbox(F, 0, 0.14, 0, W, Dd - 0.14, 0.3, frameC);
      lbox(F, 0.05, 0.16, 0.3, W - 0.1, Dd - 0.2, 0.14, C.white);
      const pw = W > 1 ? 0.7 : W - 0.3;
      for (let p = 0; p < (W > 1 ? 2 : 1); p++) lbox(F, 0.15 + p * 0.95, 0.2, 0.44, pw, 0.3, 0.1, C['white-2']);
      if (A.sleeper) A.sleeper(LP(F, W / 2, 0.42, 0.56), W > 1 ? 1.1 : 0.95);
      lbox(F, 0.04, 0.72, 0.44, W - 0.08, Dd - 0.78, 0.06, blanket);
      lflat(F, 0.04, 0.72, 0.5, W - 0.08, 0.12, C['white-2']);
      if (I.t >= 2) { const [hx, hy] = LP(F, W / 2, 1.2 + (Dd - 2) * 0.5, 0.52); blob(hx, hy, V.hw * 0.12, I.t === 3 ? C.yellow : C['pink-2'], false); }
      if (I.t === 3) {
        [[0, Dd - 0.1]].concat([[W - 0.1, Dd - 0.1]]).forEach(([u, v]) => lbox(F, u, v, 0, 0.1, 0.1, 2.05, C.white));
        lbox(F, W - 0.1, 0, 0, 0.1, 0.14, 2.05, C.white);
        lbox(F, 0, 0, 2.0, W, Dd, 0.07, C.white);
        g.globalAlpha = 0.45; lfront(F, 0, 0.35, 1.0, 2.0, Dd, C.drape, { noline: true }); lfront(F, W - 0.35, W, 1.0, 2.0, Dd, C.drape, { noline: true }); g.globalAlpha = 1;
      }
    },
    shower(F, t, A) {
      const old = F.I.t === 0;
      lbox(F, 0.04, 0.04, 0, 0.92, 0.92, 0.1, old ? C.old : C['white-2']);
      lellipse(F, 0.5, 0.5, 0.101, 0.08, C.metal);
      lbox(F, 0.42, 0.04, 0.1, 0.08, 0.08, 1.85, old ? C['old-2'] : C.metal);
      lbox(F, 0.35, 0.04, 1.85, 0.3, 0.3, 0.06, old ? C['old-2'] : C.metal);
      if (A.active) for (let k = 0; k < 6; k++) { const ph = (NOW * 2 + k / 6) % 1; const [x, y] = LP(F, 0.38 + (k % 3) * 0.1, 0.18 + Math.floor(k / 3) * 0.1, 1.8 - ph * 1.6); blob(x, y, V.hw * 0.03, C['water-2'], false); }
      g.globalAlpha = 0.38;
      lfront(F, 0.04, 0.96, 0.1, 1.9, 0.96, C.glass, { noshade: true });
      g.globalAlpha = 1;
      lbox(F, 0.04, 0.94, 1.9, 0.92, 0.04, 0.05, old ? C['old-2'] : C.metal);
    },
    tub(F, t, A) {
      lbox(F, 0.04, 0.06, 0.08, 1.92, 0.9, 0.5, C.white);
      lflat(F, 0.16, 0.18, 0.581, 1.68, 0.66, C.water, true);
      for (let k = 0; k < 7; k++) { const [x, y] = LP(F, 0.3 + k * 0.22, 0.3 + (k % 3) * 0.16, 0.6); blob(x, y, V.hw * (0.07 + (k % 2) * 0.04), C['white-2']); }
      lbox(F, 0.08, 0.08, 0.55, 0.12, 0.12, 0.3, C.metal);
      [[0.15, 0.85], [1.75, 0.85]].forEach(([u, v]) => lbox(F, u, v, 0, 0.1, 0.1, 0.1, C.gold));
    },
    fridge(F, t, A) {
      const I = F.I, h = [1.45, 1.6, 1.75][I.t], col = [C.old, C.mint, C.pink][I.t];
      lbox(F, 0.08, 0.1, 0, 0.84, 0.82, h, col);
      lfront(F, 0.12, 0.88, h * 0.6, h * 0.6 + 0.02, 0.92, C.line, { noline: true });
      lbox(F, 0.75, 0.92, h * 0.3, 0.05, 0.04, 0.22, C.metal);
      lbox(F, 0.75, 0.92, h * 0.7, 0.05, 0.04, 0.16, C.metal);
      if (I.t === 0) { const [x, y] = LP(F, 0.3, 0.92, h * 0.4); blob(x, y, V.hw * 0.07, C.red); const [x2, y2] = LP(F, 0.45, 0.92, h * 0.8); blob(x2, y2, V.hw * 0.06, C.yellow); }
      else { const [x, y] = LP(F, 0.35, 0.92, h * 0.82); blob(x, y, V.hw * 0.07, C.yellow); }
    },
    stove(F, t, A) {
      const W = F.W;
      lbox(F, 0, 0.08, 0, W, 0.9, 0.85, C.white);
      lfront(F, 0.12, 0.88, 0.12, 0.6, 0.98, C.metal);
      lfront(F, 0.2, 0.8, 0.2, 0.5, 0.981, A.active ? C.fire : C.screen, { noline: true });
      [[0.3, 0.32], [0.7, 0.32], [0.3, 0.68], [0.7, 0.68]].forEach(([u, v]) => lellipse(F, u, v + 0.08, 0.851, 0.12, A.active && u < 0.5 ? C.fire : C.metal, true));
      if (W > 1) { lbox(F, 1, 0.08, 0.85, 1, 0.9, 0.03, C['wood-1']); lflat(F, 1.2, 0.3, 0.881, 0.5, 0.35, C['wood-3'], true); const [x, y] = LP(F, 1.75, 0.45, 0.9); blob(x, y, V.hw * 0.1, C.red); }
      if (A.active) steam(F, 0.3, 0.4, 0.95);
    },
    oven(F, t, A) {
      const big = F.I.t === 2, col = big ? C.pink : C.brick;
      lbox(F, 0.04, 0.1, 0, 0.92, 0.86, 0.95, col);
      lbox(F, 0.1, 0.15, 0.95, 0.8, 0.75, 0.12, big ? C['pink-2'] : C.brick);
      lbox(F, 0.62, 0.3, 1.05, 0.18, 0.18, big ? 0.4 : 0.15, C.metal);
      lfront(F, 0.18, 0.82, 0.18, 0.7, 0.96, C.ink);
      lfront(F, 0.24, 0.76, 0.24, 0.62, 0.961, A.active ? C.fire : C['old-2'], { noline: true });
      if (A.active) steam(F, 0.7, 0.4, 1.5);
    },
    table(F, t, A) {
      const I = F.I, W = F.W;
      if (I.t === 0) {
        lbox(F, 0.15, 0.15, 0, 0.7, 0.7, 0.55, C['wood-3']);
        for (let k = 1; k < 4; k++) lfront(F, 0.15, 0.85, k * 0.14, k * 0.14 + 0.02, 0.85, C['wood-2'], { noline: true });
        return;
      }
      [[0.1, 0.1], [W - 0.18, 0.1], [0.1, 0.82], [W - 0.18, 0.82]].forEach(([u, v]) => lbox(F, u, v, 0, 0.08, 0.08, 0.68, C['wood-2']));
      lbox(F, 0.04, 0.04, 0.68, W - 0.08, 0.92, 0.08, I.t === 2 ? C.white : C['wood-1']);
      if (I.t === 2) { lflat(F, 0.3, 0.04, 0.761, W - 0.6, 0.92, C.pink); const [x, y] = LP(F, W / 2, 0.5, 0.76); lbox(F, W / 2 - 0.08, 0.42, 0.76, 0.16, 0.16, 0.2, C.blue); blob(x, y - V.zh * 0.32, V.hw * 0.1, C.flower); blob(x + V.hw * 0.12, y - V.zh * 0.26, V.hw * 0.08, C['flower-2']); }
      else { const [x, y] = LP(F, 0.5, 0.5, 0.77); g.beginPath(); g.ellipse(x, y, V.hw * 0.22, V.hh * 0.22, 0, 0, 7); g.fillStyle = C.white; g.fill(); g.strokeStyle = C.line; g.stroke(); }
    },
    sofa(F, t, A) {
      const big = F.I.t === 2, col = big ? C.pink : C.mint, col2 = big ? C['pink-2'] : C['mint-2'];
      lbox(F, 0, 0, 0, 2, 0.28, 0.85, col);
      lbox(F, 0, 0.28, 0, 0.24, 0.72, 0.55, col);
      lbox(F, 0.24, 0.28, 0, 1.52, 0.72, 0.35, col);
      lbox(F, 0.28, 0.3, 0.35, 0.72, 0.62, 0.12, col2);
      lbox(F, 1.0, 0.3, 0.35, 0.72, 0.62, 0.12, col2);
      lbox(F, 1.76, 0.28, 0, 0.24, 0.72, 0.55, col);
      if (big) { const [x, y] = LP(F, 0.5, 0.3, 0.75); blob(x, y, V.hw * 0.16, C.yellow); }
    },
    tv(F, t, A) {
      const I = F.I, W = F.W;
      if (I.t === 0) {
        lbox(F, 0.1, 0.2, 0, 0.8, 0.65, 0.42, C['wood-3']);
        lbox(F, 0.2, 0.25, 0.42, 0.6, 0.55, 0.48, C.old);
        lfront(F, 0.27, 0.68, 0.5, 0.84, 0.8, A.active ? C['screen-on'] : C.screen);
        if (A.active) for (let k = 0; k < 3; k++) lfront(F, 0.27, 0.68, 0.55 + ((NOW * 3 + k * 0.3) % 1) * 0.25, 0.57 + ((NOW * 3 + k * 0.3) % 1) * 0.25, 0.801, C['white-2'], { noline: true, noshade: true });
        seg(LP(F, 0.5, 0.5, 0.9), LP(F, 0.25, 0.4, 1.25), C.metal, 1.2); seg(LP(F, 0.5, 0.5, 0.9), LP(F, 0.8, 0.45, 1.2), C.metal, 1.2);
        return;
      }
      lbox(F, 0, 0.35, 0, W, 0.6, 0.42, I.t === 2 ? C.white : C['wood-1']);
      lfront(F, 0.15, W / 2 - 0.05, 0.08, 0.34, 0.95, C['wood-2']);
      lbox(F, W / 2 - 0.05, 0.5, 0.42, 0.1, 0.1, 0.08, C.ink);
      lbox(F, 0.1, 0.5, 0.5, W - 0.2, 0.06, I.t === 2 ? 0.55 : 0.48, C.ink);
      lfront(F, 0.14, W - 0.14, 0.54, I.t === 2 ? 1.01 : 0.94, 0.56, A.active ? C['screen-on'] : C.screen, { noline: true });
      if (A.active) { const [x, y] = LP(F, W / 2, 0.57, 0.75); blob(x, y, V.hw * 0.1, C.yellow, false); }
    },
    books(F) {
      lbox(F, 0.05, 0.3, 0, 0.9, 0.62, 1.8, C['wood-2']);
      const cols = [C.red, C.blue, C.yellow, C.mint, C.lilac, C.pink];
      for (let row = 0; row < 3; row++) {
        const z = 0.12 + row * 0.58;
        lfront(F, 0.1, 0.9, z, z + 0.5, 0.92, C['wood-3'], { noline: true });
        let u = 0.13;
        for (let k = 0; u < 0.84; k++) { const w = 0.08 + ((k + row) % 3) * 0.025, h = 0.32 + ((k * 7 + row) % 4) * 0.04; lfront(F, u, Math.min(0.87, u + w), z, z + h, 0.925, cols[(k + row * 2) % cols.length], { noshade: true }); u += w + 0.015; }
      }
    },
    aquarium(F, t, A) {
      lbox(F, 0, 0.2, 0, 2, 0.75, 0.55, C['wood-2']);
      g.globalAlpha = 0.85; lbox(F, 0.06, 0.26, 0.55, 1.88, 0.62, 0.62, C.water); g.globalAlpha = 1;
      lflat(F, 0.06, 0.26, 0.56, 1.88, 0.62, C.yellow);
      for (let k = 0; k < 3; k++) { const ph = NOW * 0.3 + k * 0.33, u = 0.3 + ((Math.sin(ph * 2) + 1) / 2) * 1.4, [x, y] = LP(F, u, 0.88, 0.75 + k * 0.12); g.beginPath(); g.ellipse(x, y, V.hw * 0.1, V.hw * 0.06, 0, 0, 7); g.fillStyle = k === 1 ? C.yellow : C.fish; g.fill(); }
      const [px, py] = LP(F, 1.6, 0.6, 0.6); blob(px, py - V.zh * 0.2, V.hw * 0.1, C.leaf, false); blob(px + 3, py - V.zh * 0.35, V.hw * 0.08, C['leaf-2'], false);
      lbox(F, 0.04, 0.24, 1.17, 1.92, 0.66, 0.05, C['wood-1']);
    },
    desk(F, t, A) {
      const W = F.W, big = F.I.t === 2;
      [[0.06, 0.12], [W - 0.14, 0.12], [0.06, 0.86], [W - 0.14, 0.86]].forEach(([u, v]) => lbox(F, u, v, 0, 0.08, 0.08, 0.7, C['wood-2']));
      lbox(F, W - 0.5, 0.12, 0.35, 0.44, 0.82, 0.35, C['wood-1']);
      lbox(F, 0.02, 0.06, 0.7, W - 0.04, 0.92, 0.07, big ? C.white : C['wood-1']);
      if (big) { lbox(F, 0.55, 0.15, 0.77, 0.9, 0.06, 0.5, C.ink); lfront(F, 0.6, 1.4, 0.82, 1.22, 0.21, A.active ? C['screen-on'] : C.screen, { noline: true }); }
      else { lflat(F, 0.15, 0.4, 0.771, 0.45, 0.35, C.paper, true); }
      lbox(F, 0.12, 0.15, 0.77, 0.14, 0.14, 0.2, C.blue);
      if (A.active) { const [x, y] = LP(F, 0.4, 0.55, 0.85); blob(x, y, V.hw * 0.06, (Math.floor(NOW * 3) % 2) ? C.pink : C.yellow, false); }
    },
    bench(F, t, A) {
      const W = F.W;
      [[0.06, 0.12], [W - 0.14, 0.12], [0.06, 0.82], [W - 0.14, 0.82]].forEach(([u, v]) => lbox(F, u, v, 0, 0.08, 0.08, 0.6, C['wood-3']));
      lbox(F, 0.02, 0.08, 0.6, W - 0.04, 0.86, 0.06, C['wood-1']);
      lbox(F, 0.06, 0.12, 0.25, W - 0.12, 0.78, 0.04, C['wood-1']);
      const n = W > 1 ? 4 : 2;
      for (let k = 0; k < n; k++) {
        const u = 0.25 + k * ((W - 0.5) / Math.max(1, n - 1)), v = 0.35 + (k % 2) * 0.3;
        lbox(F, u - 0.1, v - 0.1, 0.66, 0.2, 0.2, 0.16, C.pot);
        const [x, y] = LP(F, u, v, 0.85);
        blob(x, y - V.zh * 0.1, V.hw * 0.14, k % 2 ? C.leaf : C['leaf-2']);
        if (k % 2 === 0) blob(x + V.hw * 0.06, y - V.zh * 0.25, V.hw * 0.07, C.flower);
      }
    },
    mat(F, t, A) {
      lbox(F, 0.06, 0.06, 0, 0.88, 0.88, 0.04, C.lilac);
      for (let k = 1; k < 4; k++) lflat(F, 0.06, 0.06 + k * 0.22, 0.041, 0.88, 0.04, C['lilac-2']);
      lbox(F, 0.65, 0.12, 0.04, 0.25, 0.08, 0.08, C.metal);
      const [a, b] = [LP(F, 0.65, 0.16, 0.08), LP(F, 0.9, 0.16, 0.08)]; blob(a[0], a[1], V.hw * 0.06, C.pink); blob(b[0], b[1], V.hw * 0.06, C.pink);
    },
    bike(F, t, A) {
      lbox(F, 0.25, 0.1, 0, 0.5, 0.82, 0.08, C.metal);
      const spin = A.active ? NOW * 8 : 0;
      const [wx, wy] = LP(F, 0.5, 0.78, 0.4);
      g.beginPath(); g.ellipse(wx, wy, V.hw * 0.32, V.hw * 0.36, F.r ? -0.6 : 0.6, 0, 7); g.fillStyle = C.mint; g.fill(); g.strokeStyle = C.line; g.lineWidth = 1.2; g.stroke();
      seg([wx, wy], [wx + Math.cos(spin) * V.hw * 0.25, wy + Math.sin(spin) * V.hw * 0.28], C['mint-2'], 1.5);
      lbox(F, 0.45, 0.25, 0.08, 0.1, 0.1, 0.7, C.metal);
      lbox(F, 0.35, 0.18, 0.78, 0.3, 0.22, 0.08, C.ink);
      lbox(F, 0.45, 0.82, 0.08, 0.1, 0.08, 0.9, C.metal);
      lbox(F, 0.25, 0.8, 0.95, 0.5, 0.08, 0.06, C.pink);
    },
    plant(F, t, A) {
      const big = F.I.t === 2;
      lbox(F, big ? 0.25 : 0.3, big ? 0.25 : 0.3, 0, big ? 0.5 : 0.4, big ? 0.5 : 0.4, big ? 0.4 : 0.3, C.pot);
      const [x, y] = LP(F, 0.5, 0.5, big ? 0.4 : 0.3);
      const sw = Math.sin(NOW * 1.2 + F.it.u) * V.hw * 0.02;
      if (big) {
        [[0, -0.95, 0.22], [-0.22, -0.7, 0.2], [0.22, -0.72, 0.21], [-0.1, -0.45, 0.2], [0.14, -0.4, 0.18]].forEach(([dx, dy, rr], k) => blob(x + dx * V.hw * 1.6 + sw, y + dy * V.zh, rr * V.hw * 1.2, k % 2 ? C['leaf-2'] : C.leaf));
      } else [[0, -0.42, 0.17], [-0.17, -0.28, 0.15], [0.17, -0.3, 0.15]].forEach(([dx, dy, rr], k) => blob(x + dx * V.hw * 1.6 + sw, y + dy * V.zh, rr * V.hw * 1.2, k % 2 ? C['leaf-2'] : C.leaf));
    },
    flowers(F) {
      lbox(F, 0.3, 0.3, 0, 0.4, 0.4, 0.28, C.blue);
      const [x, y] = LP(F, 0.5, 0.5, 0.28);
      [[-0.15, -0.3, C.flower], [0.12, -0.36, C['flower-2']], [0, -0.48, C.pink], [-0.05, -0.2, C.leaf], [0.18, -0.22, C.leaf]].forEach(([dx, dy, col]) => blob(x + dx * V.hw * 1.5, y + dy * V.zh, V.hw * 0.12, col));
    },
    lamp(F, t, A, s) {
      const big = F.I.t === 2;
      lellipse(F, 0.5, 0.5, 0, 0.18, C.metal, true);
      lbox(F, 0.46, 0.46, 0, 0.08, 0.08, 1.3, C.metal);
      const on = HH.life.daylight(s) < 0.6;
      const [x, y] = LP(F, 0.5, 0.5, 1.3);
      const w1 = V.hw * (big ? 0.42 : 0.34), w2 = V.hw * (big ? 0.24 : 0.2), h = V.zh * 0.42;
      poly([[x - w1, y], [x + w1, y], [x + w2, y - h], [x - w2, y - h]], on ? C.bulb : big ? C.pink : C.yellow, C.line);
      if (big) for (let k = 0; k < 5; k++) blob(x - w1 + (k * 2 * w1) / 4, y + 2, V.hw * 0.03, C.gold, false);
    },
    rug(F, t, A) {
      const big = F.I.t === 2;
      if (big) {
        const [x, y] = LP(F, 1, 1, 0.006);
        [[0.95, C.pink], [0.72, C.yellow], [0.5, C.mint], [0.28, C.lilac]].forEach(([rr, col]) => { g.beginPath(); g.ellipse(x, y, rr * V.hw * 1.41, rr * V.hh * 1.41, 0, 0, 7); g.fillStyle = col; g.fill(); });
        g.beginPath(); g.ellipse(x, y, 0.95 * V.hw * 1.41, 0.95 * V.hh * 1.41, 0, 0, 7); g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
      } else {
        lflat(F, 0.1, 0.1, 0.006, 1.8, 1.8, C.blue, true);
        lflat(F, 0.25, 0.25, 0.007, 1.5, 1.5, C['blue-2']);
        const [x, y] = LP(F, 1, 1, 0.008);
        for (let p = 0; p < 5; p++) { const an = (p / 5) * Math.PI * 2; blob(x + Math.cos(an) * V.hw * 0.2, y + Math.sin(an) * V.hh * 0.2, V.hw * 0.13, C.white, false); }
        blob(x, y, V.hw * 0.1, C.yellow, false);
      }
    },
  };
  function steam(F, u, v, z) {
    for (let k = 0; k < 3; k++) { const ph = (NOW * 0.6 + k / 3) % 1; const [x, y] = LP(F, u, v, z + ph * 0.8); g.globalAlpha = 0.6 * (1 - ph); blob(x + Math.sin(ph * 6 + k) * V.hw * 0.1, y, V.hw * (0.08 + ph * 0.1), C['white-2'], false); }
    g.globalAlpha = 1;
  }
  function drawItem(it, s, A, ghost) {
    const F = frame(it), I = F.I;
    if (ghost != null) g.globalAlpha = 0.72;
    DRAW[I.k](F, I.t, A || {}, s);
    g.globalAlpha = 1;
  }

  /* ---------- Hari, amici, fumetti ---------- */
  function sprite(img, x, y, w, flip, alpha = 1, rot = 0) {
    if (!img) return;
    g.save(); g.globalAlpha = alpha; g.translate(x, y); if (rot) g.rotate(rot); g.scale(flip ? -1 : 1, 1);
    g.drawImage(img, -w / 2, -w * 0.97, w, w);
    g.restore();
  }
  function shadowAt(x, y, w) { g.beginPath(); g.ellipse(x, y, w * 0.3, w * 0.1, 0, 0, 7); g.fillStyle = C.shade; g.fill(); }

  /* ---------- luci: notte, tramonto, lampade, finestre ---------- */
  function roomClip() {
    const { c, r } = V;
    g.beginPath();
    [W3(-TH, -TH, WH), W3(c, -TH, WH), W3(c, -TH, -SLAB), W3(c, r, -SLAB), W3(-TH, r, -SLAB), W3(-TH, r, WH)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  }
  function lights(s, mix, A) {
    const { c, r } = V, night = 1 - mix.dl;
    g.save();
    roomClip(); g.clip();
    // raggi di sole sul pavimento dalle finestre del muro destro
    if (mix.dl > 0.02) {
      const h = (s.t % 1440) / 60, slant = (h - 13) * 0.18;
      HOMES[s.home.tier].win.forEach(([side, i, w]) => {
        const reach = 2.6;
        const pts = side === 'R'
          ? [W3(i + 0.15, 0, 0.85), W3(i + w - 0.15, 0, 0.85), W3(i + w - 0.15 - slant, reach, 0), W3(i + 0.15 - slant, reach, 0)]
          : [W3(0, i + 0.15, 0.85), W3(0, i + w - 0.15, 0.85), W3(reach, i + w - 0.15 + slant, 0), W3(reach, i + 0.15 + slant, 0)];
        g.globalAlpha = Math.min(1, mix.dl) * 0.5; poly(pts, C['sun-beam']);
        if (mix.dusk > 0.05) { g.globalAlpha = mix.dusk * 0.5; poly(pts, C['dusk-beam']); }
      });
      g.globalAlpha = 1;
    }
    // notte: velo blu; tramonto: velo arancio
    if (night > 0.01) { g.globalAlpha = night * 0.6; g.fillStyle = C.night; g.fillRect(0, 0, V.W, V.H); }
    if (mix.dusk > 0.01) { g.globalAlpha = mix.dusk * 0.18; g.fillStyle = C.dusk; g.fillRect(0, 0, V.W, V.H); }
    g.globalAlpha = 1;
    // luci calde (additive): lampade, lampadina del soffitto (sfarfalla se rotta), TV accesa
    g.globalCompositeOperation = 'lighter';
    const glow = (x, y, R, col, a) => {
      if (a <= 0.01) return;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    };
    if (night > 0.05) {
      for (const it of s.home.items) {
        if (!ITEMS[it.id].light) continue;
        const [x, y] = W3(it.x + 0.5, it.y + 0.5, 1.2);
        glow(x, y, V.hw * 3.2 * ITEMS[it.id].light, C['lamp-glow'], night * 0.9);
      }
      const broken = s.home.dmg.includes('bulb');
      const flick = broken ? ((Math.sin(NOW * 23) + Math.sin(NOW * 7.3)) > 0.6 ? 0.7 : 0.08) : 1;
      const [bx, by] = W3(c / 2, r / 2, WH - 0.35);
      glow(bx, by + V.hw, V.hw * 4.2, C['lamp-glow'], night * 0.7 * flick);
    }
    if (A.tv) { const [x, y] = W3(A.tv.x + 0.5, A.tv.y + 0.5, 0.8); glow(x, y, V.hw * 2.2, C['tv-glow'], 0.35 + 0.1 * Math.sin(NOW * 9)); }
    if (night > 0.3) HOMES[s.home.tier].win.forEach(([side, i, w]) => { const [x, y] = side === 'R' ? W3(i + w / 2, 0.8, 0.2) : W3(0.8, i + w / 2, 0.2); glow(x, y, V.hw * 1.8, C['moon-beam'], night * 0.5); });
    g.restore();
    g.globalCompositeOperation = 'source-over';
  }
  // lampadina appesa (sopra la luce, così si vede accesa)
  function bulb(s, mix) {
    const { c, r } = V, broken = s.home.dmg.includes('bulb');
    const [tx, ty] = W3(c / 2, r / 2, WH + 0.2), [bx, by] = W3(c / 2, r / 2, WH - 0.35);
    g.globalAlpha = 0.45; seg([tx, ty], [bx, by], C.ink, 0.8); g.globalAlpha = 1;
    const on = mix.dl < 0.6 && (!broken || (Math.sin(NOW * 23) + Math.sin(NOW * 7.3)) > 0.6);
    blob(bx, by + V.hw * 0.14, V.hw * 0.16, on ? C.bulb : C['white-2']);
    g.fillStyle = C.metal; g.fillRect(bx - V.hw * 0.08, by - V.hw * 0.06, V.hw * 0.16, V.hw * 0.08);
    if (broken) seg([bx - V.hw * 0.06, by + V.hw * 0.08], [bx + V.hw * 0.04, by + V.hw * 0.2], C.crack, 1);
  }

  /* ---------- fondale (cache) ---------- */
  let bgCache = null;
  function background(s) {
    const key = `${s.home.ver}|${s.home.tier}|${s.home.floor}|${s.home.wall}|${s.home.dmg.join()}|${C.key}|${V.W}x${V.H}|${V.dpr}`;
    if (bgCache && bgCache.key === key) return bgCache.cv;
    const cv = G.document.createElement('canvas');
    cv.width = Math.round(V.W * V.dpr); cv.height = Math.round(V.H * V.dpr);
    const g0 = g;
    g = cv.getContext('2d'); g.scale(V.dpr, V.dpr);
    slab();
    for (let j = 0; j < V.r; j++) for (let i = 0; i < V.c; i++) floorTile(i, j, s.home.floor);
    walls(s);
    doorL(s);
    damages(s);
    g = g0;
    bgCache = { key, cv };
    return cv;
  }

  /* ---------- scena completa ---------- */
  function scene(g2, s, V2, C2, A) {
    g = g2; V = V2; C = C2; NOW = A.now || 0;
    const mix = skyMix(s);
    g.clearRect(0, 0, V.W, V.H);
    g.drawImage(background(s), 0, 0, V.W, V.H);
    windows(s, mix);
    for (const it of s.home.walls) wallItem(it, s);
    if (A.wallGhost) wallItem(A.wallGhost, s, true);
    if (A.build) grid(A);
    leak(s);
    // tappeti sotto tutto
    for (const it of s.home.items) if (ITEMS[it.id].flat && !(A.ghost && A.ghost.u === it.u)) drawItem(it, s, {});
    // oggetti, Hari e amico ordinati per profondità
    const list = [];
    for (const it of s.home.items) {
      if (ITEMS[it.id].flat || (A.ghost && A.ghost.u === it.u)) continue;
      const f = HH.life.foot(it);
      list.push({ k: it.x + f.w / 2 + it.y + f.d / 2, it });
    }
    if (A.ghost) {
      const I = ITEMS[A.ghost.id], f = A.ghost.r ? { w: I.d, d: I.w } : { w: I.w, d: I.d };
      footprint(A.ghost.x, A.ghost.y, f.w, f.d, A.ghost.ok);
      if (I.flat) drawItem(A.ghost, s, {}, true);
      else list.push({ k: A.ghost.x + f.w / 2 + A.ghost.y + f.d / 2 + 0.01, it: A.ghost, ghost: true });
    }
    if (A.hari && !A.hari.onBed) list.push({ k: A.hari.x + A.hari.y + 1.02, hari: A.hari });
    if (A.friend) list.push({ k: A.friend.x + A.friend.y + 1.01, friend: A.friend });
    list.sort((a, b) => a.k - b.k);
    for (const o of list) {
      if (o.it) {
        const act = A.use && A.use.u === o.it.u;
        const sleeper = A.hari && A.hari.onBed === o.it.u ? (p, sc) => drawSleeper(A.hari, p, sc) : null;
        drawItem(o.it, s, { active: act, sleeper }, o.ghost ? true : null);
        if (A.sel === o.it.u) outline(o.it);
      } else if (o.hari) drawWalker(o.hari);
      else drawWalker(o.friend);
    }
    lights(s, mix, A);
    bulb(s, mix);
    // indicatori dei guasti (chiave inglese che saltella) e bersagli dei fumetti
    if (A.badges) for (const id of s.home.dmg) { const [x, y] = dmgPoint(s, id); badge(x, y - V.hw * 0.3 - Math.abs(Math.sin(NOW * 3 + id.length)) * V.hw * 0.15, A.badgeImg); }
  }
  function drawWalker(h) {
    const [x, y] = W3(h.x + 0.5, h.y + 0.5, 0);
    const w = V.hw * (h.size || 2.25);
    shadowAt(x, y, w);
    sprite(h.img, x, y - (h.hop || 0) * V.hw, w, h.flip, h.alpha == null ? 1 : h.alpha, h.rot || 0);
    h.sx = x; h.sy = y - w * 0.95;
  }
  function drawSleeper(h, [x, y], sc) {
    const w = V.hw * 2.0 * sc;
    sprite(h.img, x, y + w * 0.25, w, false, 1, 0);
    h.sx = x; h.sy = y - w * 0.6;
  }
  function footprint(x, y, w, d, ok) {
    poly([W3(x, y, 0.01), W3(x + w, y, 0.01), W3(x + w, y + d, 0.01), W3(x, y + d, 0.01)], ok ? C.ok : C.bad, ok ? null : C.bad, 2);
  }
  function outline(it) {
    const f = HH.life.foot(it), h = heightOf(it.id);
    g.save(); g.setLineDash([4, 3]);
    poly(hull(it.x, it.y, f.w, f.d, h), null, C.sel, 2.2);
    g.restore();
  }
  function grid() {
    g.globalAlpha = 1;
    g.strokeStyle = C.grid; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= V.c; i++) { const a = W3(i, 0, 0.004), b = W3(i, V.r, 0.004); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    for (let j = 0; j <= V.r; j++) { const a = W3(0, j, 0.004), b = W3(V.c, j, 0.004); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.stroke();
  }
  function badge(x, y, img) {
    if (img) g.drawImage(img, x - V.hw * 0.42, y - V.hw * 0.42, V.hw * 0.84, V.hw * 0.84);
  }
  function dmgPoint(s, id) {
    const at = DAMAGES[id].at, { c, r } = V;
    if (id === 'crack') return W3(0.02, at[1] + 0.4, 1.55);
    if (id === 'peel') return W3(at[1] + 0.45, 0.02, 1.75);
    if (id === 'mold') return W3(0.02, at[1] + 0.55, 0.55);
    if (id === 'web') return W3(0.35, 0.35, WH - 0.1);
    if (id === 'leak') return W3(at[1] + 0.5, at[2] + 0.5, 0.25);
    if (id === 'floor') return W3(at[1] + 0.5, at[2] + 0.5, 0.15);
    if (id === 'bulb') return W3(c / 2, r / 2, WH - 0.65);
    const w = HOMES[s.home.tier].win[0];
    return W3(w[1] + w[2] / 2, 0.02, 1.4);
  }
  const hull = (x, y, w, d, h) => [W3(x, y, h), W3(x + w, y, h), W3(x + w, y, 0), W3(x + w, y + d, 0), W3(x, y + d, 0), W3(x, y + d, h)];
  function inPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* ---------- cosa c'è sotto il dito ---------- */
  function tileAt(V2, px, py) {
    const a = (px - V2.ox) / V2.hw, b = (py - V2.oy) / V2.hh;
    return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2), fx: (a + b) / 2, fy: (b - a) / 2 };
  }
  function wallAt(V2, px, py, w = 1) {
    // muro sinistro (x = 0): px = ox - y·hw · muro destro (y = 0): px = ox + x·hw
    const side = px < V2.ox ? 'L' : 'R';
    const a = side === 'L' ? (V2.ox - px) / V2.hw : (px - V2.ox) / V2.hw;
    const zBase = V2.oy + a * V2.hh;
    const z = (zBase - py) / V2.zh;
    return { side, i: Math.max(0, Math.round(a - w / 2)), z, a };
  }
  function hit(s, V2, px, py, A = {}) {
    V = V2;
    if (A.hari && A.hari.sx != null) {
      const w = V.hw * 2.25;
      if (Math.abs(px - A.hari.sx) < w * 0.4 && py > A.hari.sy - w * 0.05 && py < A.hari.sy + w * 0.95) return { type: 'hari' };
    }
    if (A.badges) for (const id of s.home.dmg) { const [x, y] = dmgPoint(s, id); if (Math.hypot(px - x, py - (y - V.hw * 0.35)) < Math.max(18, V.hw * 0.7)) return { type: 'dmg', id }; }
    const items = s.home.items.filter((it) => !ITEMS[it.id].flat).map((it) => { const f = HH.life.foot(it); return { it, k: it.x + f.w / 2 + it.y + f.d / 2, f }; }).sort((a, b) => b.k - a.k);
    for (const { it, f } of items) if (inPoly(px, py, hull(it.x, it.y, f.w, f.d, heightOf(it.id)))) return { type: 'item', u: it.u };
    for (const it of s.home.walls) {
      const I = ITEMS[it.id], pts = [WP(it.side, it.i + 0.05, 0.85), WP(it.side, it.i + I.w - 0.05, 0.85), WP(it.side, it.i + I.w - 0.05, 1.95), WP(it.side, it.i + 0.05, 1.95)];
      if (inPoly(px, py, pts)) return { type: 'wall', u: it.u };
    }
    const t = tileAt(V, px, py);
    if (t.x >= 0 && t.y >= 0 && t.x < V.c && t.y < V.r) {
      const rug = s.home.items.find((it) => ITEMS[it.id].flat && t.x >= it.x && t.x < it.x + 2 && t.y >= it.y && t.y < it.y + 2);
      return { type: 'tile', x: t.x, y: t.y, rug: rug ? rug.u : null };
    }
    // vicino a un guasto anche senza il badge
    for (const id of s.home.dmg) { const [x, y] = dmgPoint(s, id); if (Math.hypot(px - x, py - y) < V.hw * 0.8) return { type: 'dmg', id }; }
    return null;
  }

  /* ---------- miniature del catalogo ---------- */
  const thumbs = {};
  function thumb(id, C2, w, h, dpr = 1) {
    const key = `${id}|${C2.key}|${w}|${dpr}`;
    if (thumbs[key]) return thumbs[key];
    const I = ITEMS[id], cv = G.document.createElement('canvas');
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g0 = g, V0 = V, C0 = C;
    g = cv.getContext('2d'); g.scale(dpr, dpr); C = C2;
    if (I.wall) {
      const hw = Math.min(w / (I.w + 1.6), h / 3.2);
      V = { hw, hh: hw / 2, zh: hw * 1.12, ox: w / 2 - ((I.w + 0.6) * hw) / 2, oy: h * 0.5 + 1.4 * hw * 1.12, c: 4, r: 1 };
      wrect('R', 0, I.w + 0.6, 0.7, 2.1, C['wl-paint-1'], true, 0);
      wallItem({ id, side: 'R', i: 0.3 }, { t: 600 });
    } else {
      const fw = I.w, fd = I.d, hgt = heightOf(id);
      const hw = Math.min((w - 6) / (fw + fd + 0.3), (h - 6) / ((fw + fd) * 0.5 + hgt * 1.12 + 0.3));
      V = { hw, hh: hw / 2, zh: hw * 1.12, c: fw, r: fd };
      V.ox = w / 2 - ((fw - fd) * hw) / 2;
      V.oy = (h - ((fw + fd) * V.hh + hgt * V.zh)) / 2 + hgt * V.zh;
      poly([W3(0, 0, 0), W3(fw, 0, 0), W3(fw, fd, 0), W3(0, fd, 0)], C['fl-wood-1']);
      NOW = 0;
      drawItem({ u: -1, id, x: 0, y: 0, r: 0 }, { t: 600, home: { dmg: [] } }, {});
    }
    g = g0; V = V0; C = C0;
    thumbs[key] = cv;
    return cv;
  }

  HH.lifeDraw = { TOKENS, tokens, view, P, scene, hit, tileAt, wallAt, thumb, heightOf, dmgPoint: (s, V2, id) => { V = V2; return dmgPoint(s, id); } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
