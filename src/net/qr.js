/* HH.qr — QR code tutto locale: generatore (versioni 1–10, modi alfanumerico e byte) e lettore da fotogrammi.
 * Usa HH.rs (Reed-Solomon GF(256), in sonic.js: va caricato prima, come da contratto: sonic, qr, mp, mp-ui).
 *
 *   HH.qr.encode(text, { ecl: 'M' }) → { size, version, ecl, modules: Uint8Array(size²) }   1 = scuro
 *   HH.qr.svg(code, { margin: 4, cls }) → stringa SVG (colori dai token CSS --mp-qr-ink / --mp-qr-paper)
 *   HH.qr.decode({ data, width, height }) → { text, version } | null     RGBA come ImageData, qualsiasi rotazione
 *   HH.qr.scan({ video, onResult, onError }) → Promise<{ stop }>          fotocamera posteriore: BarcodeDetector se c'è,
 *                                                                          altrimenti il decoder locale (~6 fotogrammi/s)
 *   HH.qr.base45.encode(bytes) / decode(str)                              byte ↔ testo alfanumerico QR (RFC 9285)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const RS = () => { if (!HH.rs) throw new Error('qr: serve HH.rs (sonic.js)'); return HH.rs; };

  /* ---------- tabelle (versioni 1..10) ---------- */
  const ECL = { L: 0, M: 1, Q: 2, H: 3 }, ECL_BITS = [1, 0, 3, 2];
  const ECC = [[7, 10, 15, 20, 26, 18, 20, 24, 30, 18], [10, 16, 26, 18, 24, 16, 18, 22, 22, 26], [13, 22, 18, 26, 18, 24, 18, 22, 20, 24], [17, 28, 22, 16, 22, 28, 26, 26, 24, 28]];
  const BLK = [[1, 1, 1, 1, 1, 2, 2, 2, 2, 4], [1, 1, 1, 2, 2, 4, 4, 4, 5, 5], [1, 1, 2, 2, 4, 4, 6, 6, 8, 8], [1, 1, 2, 4, 4, 4, 5, 6, 8, 8]];
  const MAXV = 10;
  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  function rawModules(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  const dataCodewords = (v, e) => Math.floor(rawModules(v) / 8) - ECC[e][v - 1] * BLK[e][v - 1];
  function alignPos(v) {
    if (v === 1) return [];
    const n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
    for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p);
    return r;
  }
  function formatBits(e, mask) {
    const d = (ECL_BITS[e] << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    return ((d << 10) | r) ^ 0x5412;
  }
  function versionBits(v) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    return (v << 12) | r;
  }
  const MASKS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  /* ---------- schema di base (pattern fissi) di una versione ---------- */
  function skeleton(v) {
    const size = v * 4 + 17, m = new Uint8Array(size * size), fn = new Uint8Array(size * size);
    const set = (x, y, d) => { m[y * size + x] = d ? 1 : 0; fn[y * size + x] = 1; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const ap = alignPos(v), n = ap.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    // aree del formato (riservate) e modulo scuro
    for (let i = 0; i < 9; i++) { if (!fn[8 * size + i]) set(i, 8, 0); if (!fn[i * size + 8]) set(8, i, 0); }
    for (let i = 0; i < 8; i++) { set(size - 1 - i, 8, 0); set(8, size - 1 - i, 0); }
    set(8, size - 8, 1);
    if (v >= 7) {
      const b = versionBits(v);
      for (let i = 0; i < 18; i++) { const d = (b >>> i) & 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, d); set(c, a, d); }
    }
    return { size, m, fn };
  }
  function drawFormat(m, size, e, mask) {
    const b = formatBits(e, mask), bit = (i) => (b >>> i) & 1, put = (x, y, d) => { m[y * size + x] = d; };
    for (let i = 0; i <= 5; i++) put(8, i, bit(i));
    put(8, 7, bit(6)); put(8, 8, bit(7)); put(7, 8, bit(8));
    for (let i = 9; i < 15; i++) put(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) put(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) put(8, size - 15 + i, bit(i));
    put(8, size - 8, 1);
  }
  // ordine a zig-zag dei moduli dati (identico in scrittura e lettura)
  function dataOrder(size, fn) {
    const out = [];
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fn[y * size + x]) out.push(y * size + x);
      }
    }
    return out;
  }
  function blockLayout(v, e) {
    const nb = BLK[e][v - 1], ecl = ECC[e][v - 1], raw = Math.floor(rawModules(v) / 8);
    const short = nb - (raw % nb), shortLen = Math.floor(raw / nb);
    return { nb, ecl, raw, short, shortLen };
  }

  /* ---------- codifica ---------- */
  function utf8(s) { return G.TextEncoder ? Array.from(new G.TextEncoder().encode(s)) : Array.from(unescape(encodeURIComponent(s)), (c) => c.charCodeAt(0)); }
  function encode(text, o = {}) {
    const e = ECL[o.ecl || 'M'];
    const alnum = [...text].every((c) => ALNUM.includes(c));
    const bytes = alnum ? null : utf8(text);
    let v = 0, bits;
    for (let ver = o.minVersion || 1; ver <= MAXV; ver++) {
      const cc = alnum ? (ver < 10 ? 9 : 11) : ver < 10 ? 8 : 16;
      const n = alnum ? 4 + cc + 11 * Math.floor(text.length / 2) + 6 * (text.length % 2) : 4 + cc + 8 * bytes.length;
      if (n <= dataCodewords(ver, e) * 8) { v = ver; bits = cc; break; }
    }
    if (!v) throw new Error('qr: testo troppo lungo');
    const bb = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1); };
    if (alnum) {
      put(2, 4); put(text.length, bits);
      for (let i = 0; i + 1 < text.length; i += 2) put(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
      if (text.length % 2) put(ALNUM.indexOf(text[text.length - 1]), 6);
    } else { put(4, 4); put(bytes.length, bits); for (const b of bytes) put(b, 8); }
    const cap = dataCodewords(v, e) * 8;
    put(0, Math.min(4, cap - bb.length));
    put(0, (8 - (bb.length % 8)) % 8);
    for (let p = 0xec; bb.length < cap; p ^= 0xec ^ 0x11) put(p, 8);
    const data = [];
    for (let i = 0; i < bb.length; i += 8) { let x = 0; for (let j = 0; j < 8; j++) x = (x << 1) | bb[i + j]; data.push(x); }
    // blocchi + correzione + interlacciamento
    const L = blockLayout(v, e), blocks = [];
    for (let i = 0, k = 0; i < L.nb; i++) {
      const dat = data.slice(k, k + L.shortLen - L.ecl + (i < L.short ? 0 : 1));
      k += dat.length;
      const ec = RS().encode(dat, L.ecl);
      if (i < L.short) dat.push(0);
      blocks.push(dat.concat(ec));
    }
    const cw = [];
    for (let i = 0; i < blocks[0].length; i++) for (let j = 0; j < blocks.length; j++) if (i !== L.shortLen - L.ecl || j >= L.short) cw.push(blocks[j][i]);
    const sk = skeleton(v), size = sk.size, order = dataOrder(size, sk.fn);
    const base = sk.m.slice();
    for (let i = 0; i < order.length; i++) base[order[i]] = i < cw.length * 8 ? (cw[i >> 3] >>> (7 - (i & 7))) & 1 : 0;
    let best = null, bestP = Infinity;
    const masks = o.mask != null ? [o.mask] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (const mk of masks) {
      const m = base.slice();
      for (const idx of order) { const x = idx % size, y = (idx / size) | 0; if (MASKS[mk](x, y)) m[idx] ^= 1; }
      drawFormat(m, size, e, mk);
      const p = penalty(m, size);
      if (p < bestP) { bestP = p; best = { m, mk }; }
    }
    return { size, version: v, ecl: o.ecl || 'M', mask: best.mk, modules: best.m };
  }
  function penalty(m, size) {
    let p = 0, dark = 0;
    const at = (x, y) => m[y * size + x];
    for (let pass = 0; pass < 2; pass++) for (let a = 0; a < size; a++) {
      let run = 1, hist = [];
      for (let b = 0; b < size; b++) {
        const c = pass ? at(a, b) : at(b, a);
        if (b > 0) { const pc = pass ? at(a, b - 1) : at(b - 1, a); if (c === pc) run++; else { if (run >= 5) p += run - 2; run = 1; } }
        hist.push(c);
      }
      if (run >= 5) p += run - 2;
      const s = hist.join('');
      for (const pat of ['10111010000', '00001011101']) { let i = s.indexOf(pat); while (i >= 0) { p += 40; i = s.indexOf(pat, i + 1); } }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = at(x, y); if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) p += 3; }
    for (let i = 0; i < m.length; i++) dark += m[i];
    p += 10 * (Math.ceil(Math.abs(dark * 20 - m.length * 10) / m.length) - 1);
    return p;
  }
  function svg(code, o = {}) {
    const mg = o.margin != null ? o.margin : 4, n = code.size + 2 * mg;
    let d = '';
    for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) if (code.modules[y * code.size + x]) d += `M${x + mg} ${y + mg}h1v1h-1z`;
    return `<svg class="${o.cls || 'mp-qr'}" viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img"${o.label ? ` aria-label="${o.label}"` : ''}>` +
      `<rect class="mp-qr-paper" width="${n}" height="${n}"/><path class="mp-qr-ink" d="${d}"/></svg>`;
  }

  /* ---------- base45 (RFC 9285): byte → caratteri alfanumerici QR ---------- */
  const base45 = {
    encode(b) {
      let s = '';
      for (let i = 0; i < b.length; i += 2) {
        if (i + 1 < b.length) { let x = b[i] * 256 + b[i + 1]; const c = x % 45; x = (x - c) / 45; s += ALNUM[c] + ALNUM[x % 45] + ALNUM[Math.floor(x / 45)]; }
        else { const x = b[i]; s += ALNUM[x % 45] + ALNUM[Math.floor(x / 45)]; }
      }
      return s;
    },
    decode(s) {
      const out = [];
      for (let i = 0; i < s.length; i += 3) {
        const c = ALNUM.indexOf(s[i]), d = ALNUM.indexOf(s[i + 1]), e = i + 2 < s.length ? ALNUM.indexOf(s[i + 2]) : -2;
        if (c < 0 || d < 0 || e === -1) throw new Error('base45');
        if (e === -2) { const x = c + d * 45; if (x > 255) throw new Error('base45'); out.push(x); }
        else { const x = c + d * 45 + e * 2025; if (x > 65535) throw new Error('base45'); out.push(x >> 8, x & 255); }
      }
      return Uint8Array.from(out);
    },
  };

  /* ---------- lettura ---------- */
  // binarizzazione adattiva (Bradley): scuro se più scuro del 15 % della media locale
  function binarize(img, blur) {
    let { width: w, height: h, data } = img, step = 1;
    while (Math.max(w, h) / step > 720) step++;
    const W = Math.floor(w / step), H = Math.floor(h / step), lum = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = ((y * step) * w + x * step) * 4;
      lum[y * W + x] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    // sfocatura 3×3 (secondo tentativo): toglie il rumore del sensore
    if (blur) {
      const sm = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let a = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; a += lum[yy * W + xx]; c++; } }
        sm[y * W + x] = a / c;
      }
      lum.set(sm);
    }
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += lum[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
    const r = Math.max(8, Math.round(Math.min(W, H) / 16)), bin = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
        const s = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
        bin[y * W + x] = lum[y * W + x] * (x1 - x0) * (y1 - y0) < s * 0.85 ? 1 : 0;
      }
    }
    return { bin, W, H };
  }
  const ratioOk = (c, tol = 0.5) => {
    const tot = c[0] + c[1] + c[2] + c[3] + c[4];
    if (tot < 7) return false;
    const u = tot / 7, t = u * tol;
    return Math.abs(c[0] - u) < t && Math.abs(c[1] - u) < t && Math.abs(c[2] - 3 * u) < 3 * t && Math.abs(c[3] - u) < t && Math.abs(c[4] - u) < t;
  };
  // conteggi 1:1:3:1:1 attraversando (cx,cy) lungo (dx,dy); → [centro relativo, totale] o null
  function cross(B, cx, cy, dx, dy, maxRun) {
    const { bin, W, H } = B, px = (k) => { const x = Math.round(cx + dx * k), y = Math.round(cy + dy * k); return x < 0 || y < 0 || x >= W || y >= H ? -1 : bin[y * W + x]; };
    if (px(0) !== 1) return null;
    const c = [0, 0, 0, 0, 0];
    let k = 0;
    while (px(k) === 1) { c[2]++; k--; } while (px(k) === 0 && c[1] <= maxRun) { c[1]++; k--; } while (px(k) === 1 && c[0] <= maxRun) { c[0]++; k--; }
    const lo = k;
    k = 1;
    while (px(k) === 1) { c[2]++; k++; } while (px(k) === 0 && c[3] <= maxRun) { c[3]++; k++; } while (px(k) === 1 && c[4] <= maxRun) { c[4]++; k++; }
    if (!ratioOk(c)) return null;
    // centro del modulo centrale
    const start = lo + 1 + c[0] + c[1];
    return [start + c[2] / 2 - 0.5, c[0] + c[1] + c[2] + c[3] + c[4]];
  }
  function finders(B) {
    const { bin, W, H } = B, found = [];
    for (let y = 0; y < H; y++) {
      // run-length della riga: [colore, inizio, lunghezza]
      const runs = [];
      let c = bin[y * W], st = 0;
      for (let x = 1; x <= W; x++) { const v = x < W ? bin[y * W + x] : -1; if (v !== c) { runs.push([c, st, x - st]); c = v; st = x; } }
      for (let i = 0; i + 4 < runs.length; i++) {
        if (runs[i][0] !== 1) continue;
        const cnt = [runs[i][2], runs[i + 1][2], runs[i + 2][2], runs[i + 3][2], runs[i + 4][2]];
        if (!ratioOk(cnt)) continue;
        const tot = cnt[0] + cnt[1] + cnt[2] + cnt[3] + cnt[4], cx = runs[i + 2][1] + cnt[2] / 2 - 0.5;
        const vv = cross(B, cx, y, 0, 1, tot);
        if (!vv) continue;
        const cy = y + vv[0], hh = cross(B, cx, cy, 1, 0, tot * 1.5);
        if (!hh) continue;
        const fx = cx + hh[0];
        // ogni retta per il centro di quadrati concentrici taglia gli anelli nello stesso rapporto: vale a ogni rotazione
        const v2 = cross(B, fx, cy, 0, 1, tot * 1.5);
        if (!v2 || !cross(B, fx, cy, 1, 1, tot * 2) || !cross(B, fx, cy, 1, -1, tot * 2)) continue;
        add(found, fx, cy + v2[0], (hh[1] + v2[1]) / 14);
      }
    }
    return found.filter((f) => f.n >= 2).sort((a, b) => b.n - a.n);
  }
  function add(list, x, y, ms) {
    for (const f of list) if (Math.hypot(f.x - x, f.y - y) < Math.max(ms, f.ms) && Math.abs(f.ms - ms) < Math.max(ms, f.ms) * 0.6) {
      f.x = (f.x * f.n + x) / (f.n + 1); f.y = (f.y * f.n + y) / (f.n + 1); f.ms = (f.ms * f.n + ms) / (f.n + 1); f.n++; return;
    }
    list.push({ x, y, ms, n: 1 });
  }
  function triples(fs) {
    const out = [], c = fs.slice(0, 14);
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) for (let k = j + 1; k < c.length; k++) {
      const p = [c[i], c[j], c[k]], ms = (p[0].ms + p[1].ms + p[2].ms) / 3;
      if (Math.max(p[0].ms, p[1].ms, p[2].ms) > 1.6 * Math.min(p[0].ms, p[1].ms, p[2].ms)) continue;
      const d = [[1, 2], [0, 2], [0, 1]].map(([a, b]) => Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y));
      const hyp = d.indexOf(Math.max(...d)), tl = p[hyp], o = p.filter((_, q) => q !== hyp);
      const l1 = Math.hypot(o[0].x - tl.x, o[0].y - tl.y), l2 = Math.hypot(o[1].x - tl.x, o[1].y - tl.y);
      if (Math.min(l1, l2) < ms * 10) continue;
      const cos = ((o[0].x - tl.x) * (o[1].x - tl.x) + (o[0].y - tl.y) * (o[1].y - tl.y)) / (l1 * l2);
      const err = Math.abs(cos) + Math.abs(l1 - l2) / Math.max(l1, l2);
      if (err > 0.5) continue;
      const crs = (o[0].x - tl.x) * (o[1].y - tl.y) - (o[0].y - tl.y) * (o[1].x - tl.x);
      const [tr, bl] = crs > 0 ? [o[0], o[1]] : [o[1], o[0]];
      out.push({ tl, tr, bl, ms, err });
    }
    return out.sort((a, b) => a.err - b.err);
  }
  // omografia dai 4 punti modulo → immagine
  function homography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    for (let c = 0; c < 8; c++) {
      let piv = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
      if (Math.abs(A[c][c]) < 1e-12) return null;
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
    const h = b.map((x, i) => x / A[i][i]);
    return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
  }
  const FORMATS = [];
  for (let e = 0; e < 4; e++) for (let mk = 0; mk < 8; mk++) FORMATS.push({ e, mk, b: formatBits(e, mk) });
  const popcount = (x) => { let n = 0; while (x) { n += x & 1; x >>>= 1; } return n; };
  function readGrid(m, size) {
    const at = (x, y) => m[y * size + x];
    let f1 = 0, f2 = 0;
    const p1 = [];
    for (let i = 0; i <= 5; i++) p1.push([8, i]);
    p1.push([8, 7], [8, 8], [7, 8]);
    for (let i = 9; i < 15; i++) p1.push([14 - i, 8]);
    p1.forEach(([x, y], i) => { f1 |= at(x, y) << i; });
    for (let i = 0; i < 8; i++) f2 |= at(size - 1 - i, 8) << i;
    for (let i = 8; i < 15; i++) f2 |= at(8, size - 15 + i) << i;
    let best = null, bd = 99;
    for (const F of FORMATS) { const d = Math.min(popcount(F.b ^ f1), popcount(F.b ^ f2)); if (d < bd) { bd = d; best = F; } }
    if (bd > 3) return null;
    const v = (size - 17) / 4, sk = skeleton(v), order = dataOrder(size, sk.fn), L = blockLayout(v, best.e);
    const cw = new Array(L.raw).fill(0);
    for (let i = 0; i < L.raw * 8; i++) {
      const idx = order[i], x = idx % size, y = (idx / size) | 0;
      const bit = m[idx] ^ (MASKS[best.mk](x, y) ? 1 : 0);
      cw[i >> 3] |= bit << (7 - (i & 7));
    }
    const blocks = [];
    for (let j = 0; j < L.nb; j++) blocks.push(new Array(L.shortLen + 1).fill(0));
    let k = 0;
    for (let i = 0; i <= L.shortLen; i++) for (let j = 0; j < L.nb; j++) if (i !== L.shortLen - L.ecl || j >= L.short) blocks[j][i] = cw[k++];
    const data = [];
    for (let j = 0; j < L.nb; j++) {
      let b = blocks[j];
      if (j < L.short) b = b.slice(0, L.shortLen - L.ecl).concat(b.slice(L.shortLen - L.ecl + 1));
      const d = RS().decode(b, L.ecl);
      if (!d) return null;
      data.push(...d);
    }
    return parse(data, v);
  }
  function parse(data, v) {
    let pos = 0;
    const rd = (n) => { let x = 0; for (let i = 0; i < n; i++) { x = (x << 1) | ((data[pos >> 3] >>> (7 - (pos & 7))) & 1); pos++; } return x; };
    const left = () => data.length * 8 - pos;
    let text = '';
    const bytes = [];
    const flush = () => { if (bytes.length) { try { text += new G.TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes)); } catch (e) { text += String.fromCharCode(...bytes); } bytes.length = 0; } };
    while (left() >= 4) {
      const mode = rd(4);
      if (mode === 0) break;
      if (mode === 1) { flush(); let n = rd(v < 10 ? 10 : 12); while (n >= 3) { text += String(rd(10)).padStart(3, '0'); n -= 3; } if (n === 2) text += String(rd(7)).padStart(2, '0'); else if (n === 1) text += String(rd(4)); }
      else if (mode === 2) { flush(); let n = rd(v < 10 ? 9 : 11); while (n >= 2) { const x = rd(11); text += ALNUM[Math.floor(x / 45)] + ALNUM[x % 45]; n -= 2; } if (n) text += ALNUM[rd(6)]; }
      else if (mode === 4) { const n = rd(v < 10 ? 8 : 16); if (left() < n * 8) return null; for (let i = 0; i < n; i++) bytes.push(rd(8)); }
      else if (mode === 7) rd(8);
      else break;
    }
    flush();
    return { text, version: v };
  }
  function sampleAndRead(B, H, size) {
    const m = new Uint8Array(size * size), { bin, W } = B;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const [u, v] = H(x + 0.5, y + 0.5), ix = Math.round(u), iy = Math.round(v);
      if (ix < 0 || iy < 0 || ix >= W || iy >= B.H) return null;
      m[y * size + x] = bin[iy * W + ix];
    }
    const r = readGrid(m, size);
    if (r) return r;
    // immagine speculare (fotocamera frontale): trasposta
    const t = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) t[x * size + y] = m[y * size + x];
    return readGrid(t, size);
  }
  function tryTriple(B, t) {
    const { tl, tr, bl } = t, dTop = Math.hypot(tr.x - tl.x, tr.y - tl.y), dLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    // modulo misurato lungo i lati del codice (le run orizzontali sono più lunghe di √2 a 45°)
    const along = (f, to) => { const d = Math.hypot(to.x - f.x, to.y - f.y), r = cross(B, f.x, f.y, (to.x - f.x) / d, (to.y - f.y) / d, f.ms * 6); return r ? r[1] / 7 : f.ms; };
    const mTop = (along(tl, tr) + along(tr, tl)) / 2, mLeft = (along(tl, bl) + along(bl, tl)) / 2;
    let dim0 = Math.round((dTop / mTop + dLeft / mLeft) / 2) + 7;
    switch (dim0 & 3) { case 0: dim0++; break; case 2: dim0--; break; case 3: dim0 -= 2; break; default: }
    for (const dim of [dim0, dim0 + 4, dim0 - 4]) {
      const v = (dim - 17) / 4;
      if (v < 1 || v > MAXV) continue;
      const n = dim - 7, ex = [(tr.x - tl.x) / n, (tr.y - tl.y) / n], ey = [(bl.x - tl.x) / n, (bl.y - tl.y) / n];
      const aff = (u, w) => [tl.x + (u - 3.5) * ex[0] + (w - 3.5) * ey[0], tl.y + (u - 3.5) * ex[1] + (w - 3.5) * ey[1]];
      let br = aff(dim - 3.5, dim - 3.5), brMod = [dim - 3.5, dim - 3.5];
      if (v >= 2) {
        // cerco il pattern di allineamento in basso a destra intorno alla stima affine
        const [gx, gy] = aff(dim - 6.5, dim - 6.5), at = (x, y) => { const ix = Math.round(x), iy = Math.round(y); return ix < 0 || iy < 0 || ix >= B.W || iy >= B.H ? -1 : B.bin[iy * B.W + ix]; };
        let bs = -1, bp = null;
        const R = 5 * t.ms, st = Math.max(1, t.ms / 3);
        for (let oy = -R; oy <= R; oy += st) for (let ox = -R; ox <= R; ox += st) {
          let s = 0;
          for (let dv = -2; dv <= 2; dv++) for (let du = -2; du <= 2; du++) {
            const want = Math.max(Math.abs(du), Math.abs(dv)) === 1 ? 0 : 1;
            if (at(gx + ox + du * ex[0] + dv * ey[0], gy + oy + du * ex[1] + dv * ey[1]) === want) s++;
          }
          s -= Math.hypot(ox, oy) / (R * 4);
          if (s > bs) { bs = s; bp = [gx + ox, gy + oy]; }
        }
        if (bs >= 21) { br = bp; brMod = [dim - 6.5, dim - 6.5]; }
      }
      const H = homography([[3.5, 3.5], [dim - 3.5, 3.5], [3.5, dim - 3.5], brMod], [[tl.x, tl.y], [tr.x, tr.y], [bl.x, bl.y], br]);
      if (!H) continue;
      const r = sampleAndRead(B, H, dim);
      if (r) return r;
    }
    return null;
  }
  function decode(img) {
    for (const blur of [false, true]) {
      const B = binarize(img, blur), fs = finders(B);
      for (const t of triples(fs).slice(0, 6)) { const r = tryTriple(B, t); if (r) return r; }
    }
    return null;
  }

  /* ---------- fotocamera ---------- */
  async function scan(o) {
    const md = G.navigator && G.navigator.mediaDevices;
    if (!md || !md.getUserMedia) { const e = new Error('nocam'); e.code = 'nocam'; throw e; }
    let stream;
    try { stream = await md.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
    catch (err) { const e = new Error('denied'); e.code = err && err.name === 'NotFoundError' ? 'nocam' : 'denied'; throw e; }
    const video = o.video;
    video.setAttribute('playsinline', ''); video.muted = true; video.srcObject = stream;
    try { await video.play(); } catch (e) { /* parte appena c'è un fotogramma */ }
    let det = null;
    if (!o.local && G.BarcodeDetector) {
      try { const f = await G.BarcodeDetector.getSupportedFormats(); if (f.includes('qr_code')) det = new G.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; }
    }
    const cv = G.document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    let alive = true, timer = 0;
    const tick = async () => {
      if (!alive) return;
      try {
        if (video.readyState >= 2 && video.videoWidth) {
          let text = null;
          if (det) { const r = await det.detect(video); if (r && r[0]) text = r[0].rawValue; }
          else {
            const k = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight));
            cv.width = Math.round(video.videoWidth * k); cv.height = Math.round(video.videoHeight * k);
            cx.drawImage(video, 0, 0, cv.width, cv.height);
            const r = decode(cx.getImageData(0, 0, cv.width, cv.height));
            if (r) text = r.text;
          }
          if (text && alive && o.onResult(text) === true) { ctl.stop(); return; }
        }
      } catch (e) { if (o.onError) o.onError(e); }
      if (alive) timer = setTimeout(tick, det ? 120 : 160);
    };
    const ctl = {
      native: !!det,
      stop() { alive = false; clearTimeout(timer); stream.getTracks().forEach((t) => t.stop()); try { video.srcObject = null; } catch (e) { /* già staccato */ } },
    };
    tick();
    return ctl;
  }

  HH.qr = { encode, svg, decode, scan, base45, ALNUM, _skeleton: skeleton };
})(typeof globalThis !== 'undefined' ? globalThis : window);
