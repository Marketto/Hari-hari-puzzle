/* HH.sonic — modem acustico di Hari: i dati diventano una melodia pentatonica e tornano dati. Nessuna rete, nessun file.
 *
 *   Parte pura (Node e browser):
 *     HH.sonic.encode(bytes, { sampleRate }) → Float32Array      PCM mono, ampiezza ≤ 0,6
 *     HH.sonic.duration(nBytes) → secondi
 *     HH.sonic.receiver({ sampleRate, onFrame(bytes, info), onProgress(p, info), onFail(why) }) → { push(Float32Array), reset() }
 *     HH.sonic.decode(pcm, sampleRate) → Uint8Array | null       comodo per i test (push di tutto il PCM)
 *     HH.rs.encode(msg, nsym) · HH.rs.decode(cw, nsym, erasures) Reed-Solomon GF(256) (lo usa anche qr.js)
 *     HH.sonic.crc16(bytes)
 *   Parte browser:
 *     HH.sonic.open({ onFrame, onProgress, onLevel }) → Promise<modem>   microfono (getUserMedia senza filtri) + AudioContext
 *       modem = { send(bytes, onProgress) → Promise, stopSending(), close(), ctx, level, sampleRate }
 *
 * Trama (simboli MFSK, 1 nota = 4 bit, 50 ms ciascuna):
 *   PREAMBOLO 10 note fisse (il "jingle" di Hari) · LUNGHEZZA 6 note (L in due nibble, ripetuti 3 volte con permutazioni)
 *   · CORPO 2·(L + nsym) note: [dati · CRC-16] + nsym byte di parità Reed-Solomon, sbiancati con una sequenza fissa
 *   · NOTA FINALE (tonica, solo estetica).
 * Note: 16 gradi della pentatonica maggiore di Do, da Do5 (523 Hz) a Do8 (4186 Hz): ogni combinazione suona "giusta".
 * Ricezione: per ogni nota una DFT scorrevole (somme complesse per hop da 1 ms + somme prefisse), finestre a Q costante
 * (circa 20 cicli: le note acute hanno finestre corte e quindi tollerano la deriva di clock), soglia di rumore per nota,
 * preambolo cercato in continuo, poi ricerca a griglia di inizio (±3 ms) e velocità (±0,8 %) sul corpo,
 * Reed-Solomon con errori e cancellazioni (le note più incerte), CRC-16.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  /* ---------- GF(256), polinomio 0x11d (come i QR) ---------- */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const gmul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  const gdiv = (a, b) => { if (!b) throw new Error('rs: /0'); return a ? EXP[(LOG[a] + 255 - LOG[b]) % 255] : 0; };
  const gpow = (e) => EXP[((e % 255) + 255) % 255];
  const ginv = (a) => EXP[255 - LOG[a]];
  // polinomi come array, grado più alto per primo
  function pmul(p, q) { const r = new Array(p.length + q.length - 1).fill(0); for (let j = 0; j < q.length; j++) for (let i = 0; i < p.length; i++) r[i + j] ^= gmul(p[i], q[j]); return r; }
  function padd(p, q) {
    const n = Math.max(p.length, q.length), r = new Array(n).fill(0);
    for (let i = 0; i < p.length; i++) r[i + n - p.length] = p[i];
    for (let i = 0; i < q.length; i++) r[i + n - q.length] ^= q[i];
    return r;
  }
  const pscale = (p, x) => p.map((c) => gmul(c, x));
  function peval(p, x) { let y = p[0]; for (let i = 1; i < p.length; i++) y = gmul(y, x) ^ p[i]; return y; }
  const GEN = {};
  function generator(n) {
    if (GEN[n]) return GEN[n];
    let g = [1];
    for (let i = 0; i < n; i++) g = pmul(g, [1, gpow(i)]);
    return (GEN[n] = g);
  }
  // parità (nsym byte) del messaggio: resto di msg·x^nsym diviso per il generatore
  function rsEncode(msg, nsym) {
    const gen = generator(nsym), out = new Array(msg.length + nsym).fill(0);
    for (let i = 0; i < msg.length; i++) out[i] = msg[i];
    for (let i = 0; i < msg.length; i++) {
      const c = out[i];
      if (c) for (let j = 1; j < gen.length; j++) out[i + j] ^= gmul(gen[j], c);
    }
    return out.slice(msg.length);
  }
  function syndromes(msg, nsym) { const s = [0]; for (let i = 0; i < nsym; i++) s.push(peval(msg, gpow(i))); return s; }
  function errataLocator(pos) { let l = [1]; for (const i of pos) l = pmul(l, padd([1], [gpow(i), 0])); return l; }
  function errorEvaluator(synd, loc, nsym) {
    const prod = pmul(synd, loc), div = [1].concat(new Array(nsym + 1).fill(0)), out = prod.slice();
    for (let i = 0; i < prod.length - (div.length - 1); i++) { const c = out[i]; if (c) for (let j = 1; j < div.length; j++) if (div[j]) out[i + j] ^= gmul(div[j], c); }
    return out.slice(out.length - (div.length - 1));
  }
  function correctErrata(msg, synd, pos) {
    const coef = pos.map((p) => msg.length - 1 - p);
    const loc = errataLocator(coef);
    const ev = errorEvaluator(synd.slice().reverse(), loc, loc.length - 1).reverse();
    const X = coef.map((c) => gpow(c));
    const E = new Array(msg.length).fill(0);
    for (let i = 0; i < X.length; i++) {
      const xi = ginv(X[i]);
      let lp = 1;
      for (let j = 0; j < X.length; j++) if (j !== i) lp = gmul(lp, 1 ^ gmul(xi, X[j]));
      if (!lp) return null;
      const y = gmul(X[i], peval(ev.slice().reverse(), xi));
      E[pos[i]] = gdiv(y, lp);
    }
    return padd(msg, E);
  }
  function errorLocator(synd, nsym, eraseCount) {
    let loc = [1], old = [1];
    const shift = synd.length > nsym ? synd.length - nsym : 0;
    for (let i = 0; i < nsym - eraseCount; i++) {
      const K = i + shift;
      let delta = synd[K];
      for (let j = 1; j < loc.length; j++) delta ^= gmul(loc[loc.length - 1 - j], synd[K - j]);
      old = old.concat([0]);
      if (delta) {
        if (old.length > loc.length) { const nl = pscale(old, delta); old = pscale(loc, ginv(delta)); loc = nl; }
        loc = padd(loc, pscale(old, delta));
      }
    }
    while (loc.length && !loc[0]) loc.shift();
    const errs = loc.length - 1;
    if ((errs - eraseCount) * 2 + eraseCount > nsym) return null;
    return loc;
  }
  function forney(synd, pos, n) {
    const f = synd.slice(1);
    for (const p of pos) {
      const x = gpow(n - 1 - p);
      for (let j = 0; j < f.length - 1; j++) f[j] = gmul(f[j], x) ^ f[j + 1];
    }
    return f;
  }
  // cw = dati + parità; erasures = posizioni sospette. → dati corretti (array) o null
  function rsDecode(cw, nsym, erasures) {
    const msg = Array.from(cw), er = erasures ? erasures.slice() : [];
    if (er.length > nsym || msg.length > 255) return null;
    for (const e of er) msg[e] = 0;
    let synd = syndromes(msg, nsym);
    if (synd.every((x) => !x)) return msg.slice(0, msg.length - nsym);
    const fs = forney(synd, er, msg.length);
    const loc = errorLocator(fs, nsym, er.length);
    if (!loc) return null;
    const rl = loc.slice().reverse(), errs = loc.length - 1, pos = [];
    for (let i = 0; i < msg.length; i++) if (!peval(rl, gpow(i))) pos.push(msg.length - 1 - i);
    if (pos.length !== errs) return null;
    const fixed = correctErrata(msg, synd, er.concat(pos));
    if (!fixed) return null;
    synd = syndromes(fixed, nsym);
    if (synd.some((x) => x)) return null;
    return fixed.slice(0, fixed.length - nsym);
  }
  HH.rs = { encode: rsEncode, decode: rsDecode, mul: gmul, exp: EXP, log: LOG };

  /* ---------- CRC-16/CCITT-FALSE ---------- */
  function crc16(b) {
    let c = 0xffff;
    for (let i = 0; i < b.length; i++) { c ^= b[i] << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
    return c;
  }

  /* ---------- parametri della melodia ---------- */
  const PENTA = [0, 2, 4, 7, 9];
  const TONES = [];
  for (let i = 0; i < 16; i++) TONES.push(440 * Math.pow(2, (72 + 12 * Math.floor(i / 5) + PENTA[i % 5] - 69) / 12)); // Do5 = MIDI 72
  const SYM_MS = 50, GUARD_MS = 5, Q = 20.5;
  // il jingle: sale a salti, scende e risale (autocorrelazione bassa: ogni spostamento cambia quasi tutte le note)
  const PRE = [0, 4, 8, 12, 15, 11, 6, 2, 9, 13];
  const HDR = [0, 0x5, 0xa]; // permutazioni delle tre copie dei nibble di lunghezza
  const FINAL = 10; // Do7, tonica
  const nsymFor = (L) => 2 * Math.ceil(L / 10) + 4;
  const MAX_L = 200;
  // sbiancamento: xorshift a seme fisso (stessa sequenza in trasmissione e ricezione)
  const WHITE = (function () { const w = new Uint8Array(256); let s = 0x9e3779b9 >>> 0; for (let i = 0; i < 256; i++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; w[i] = s & 255; } return w; })();

  function frameSymbols(bytes) {
    const L = bytes.length + 2;
    if (L > MAX_L) throw new Error('sonic: troppi dati');
    const c = crc16(bytes), body = Array.from(bytes).concat([c >> 8, c & 255]);
    const cw = body.concat(rsEncode(body, nsymFor(L)));
    const sy = PRE.slice();
    for (const p of HDR) sy.push((L >> 4) ^ p, (L & 15) ^ p);
    for (let i = 0; i < cw.length; i++) { const b = cw[i] ^ WHITE[i]; sy.push(b >> 4, b & 15); }
    return sy;
  }
  const duration = (n) => ((PRE.length + 6 + 2 * (n + 2 + nsymFor(n + 2))) * SYM_MS + 60 + 260) / 1000;

  // PCM: note pure (niente armoniche: cadrebbero su altre note) con attacco morbido e decadimento da carillon
  function encode(bytes, o = {}) {
    const sr = o.sampleRate || 48000, amp = o.amp || 0.6;
    const sy = frameSymbols(bytes), ns = Math.round(sr * SYM_MS / 1000), lead = Math.round(sr * 0.06), tail = Math.round(sr * 0.26);
    const out = new Float32Array(lead + sy.length * ns + tail);
    const att = Math.round(sr * 0.003), rel = Math.round(sr * 0.004);
    const tone = (start, len, f, decay, a0) => {
      const w = 2 * Math.PI * f / sr;
      for (let n = 0; n < len; n++) {
        let e = Math.exp(-decay * n / len);
        if (n < att) e *= 0.5 - 0.5 * Math.cos(Math.PI * n / att);
        if (n > len - rel) e *= 0.5 - 0.5 * Math.cos(Math.PI * (len - n) / rel);
        out[start + n] += a0 * e * Math.sin(w * n);
      }
    };
    for (let i = 0; i < sy.length; i++) tone(lead + i * ns, ns, TONES[sy[i]], 0.6, amp);
    tone(lead + sy.length * ns, tail, TONES[FINAL], 3, amp * 0.8);
    return out;
  }

  /* ---------- ricevitore ---------- */
  function receiver(o = {}) {
    const sr = o.sampleRate || 48000, hop = Math.max(1, Math.round(sr / 1000)), hopMs = hop * 1000 / sr;
    const T = TONES.length, CAP = 1 << 15; // ~32 s di storia
    const tsym = SYM_MS / hopMs, guard = GUARD_MS / hopMs, core = tsym - 2 * guard;
    const win = TONES.map((f) => Math.max(1, Math.min(Math.floor(core), Math.round(Q / f * 1000 / hopMs))));
    const PR = [], PI = [];
    for (let k = 0; k < T; k++) { PR.push(new Float64Array(CAP)); PI.push(new Float64Array(CAP)); }
    const cw = TONES.map((f) => Math.cos(2 * Math.PI * f / sr)), sw = TONES.map((f) => Math.sin(2 * Math.PI * f / sr));
    const pc = new Float64Array(T).fill(1), ps = new Float64Array(T), ar = new Float64Array(T), ai = new Float64Array(T);
    const cr = new Float64Array(T), ci = new Float64Array(T); // somme prefisse correnti
    let h = 0, inHop = 0, sq = 0, level = 0;
    // energia di simbolo per nota, cache per hop di inizio (intero)
    const SE = new Float32Array(CAP * T), SEok = new Int32Array(CAP).fill(-1);
    const score = new Float32Array(CAP);
    let cand = null, hdr = null, pending = null, resumeAt = 0;

    function energy(k, a, b) {
      // somme tra gli hop [a, b): a e b interi, dentro la storia
      const ia = a & (CAP - 1), ib = b & (CAP - 1);
      const re = PR[k][ib] - PR[k][ia], im = PI[k][ib] - PI[k][ia], n = (b - a) * hop;
      return (re * re + im * im) / (n * n);
    }
    // energia della nota k nel simbolo che inizia all'hop (reale) t, con velocità r
    function symE(k, t, r) {
      const c0 = t + guard * r, len = core * r, w = win[k], m = Math.max(1, Math.floor(len / w));
      const step = m > 1 ? (len - w) / (m - 1) : 0;
      let e = 0;
      for (let j = 0; j < m; j++) { const a = Math.round(c0 + j * step); e += energy(k, a, a + w); }
      return e / m;
    }
    function cachedSE(t) {
      const i = t & (CAP - 1);
      if (SEok[i] !== t) { for (let k = 0; k < T; k++) SE[i * T + k] = symE(k, t, 1); SEok[i] = t; }
      return i * T;
    }
    const need = (nSym, r = 1) => Math.ceil(nSym * tsym * r + 2);
    function preScore(t) {
      let s = 0;
      for (let j = 0; j < PRE.length; j++) {
        const b = cachedSE(t + Math.round(j * tsym));
        let tot = 1e-12; for (let k = 0; k < T; k++) tot += SE[b + k];
        s += SE[b + PRE[j]] / tot;
      }
      return s / PRE.length;
    }
    // matrice di energie e decisioni per un inizio t0 (hop) e velocità r
    // la soglia di rumore si calcola su tutta la trama dall'inizio (preambolo compreso): bastano 16+ simboli
    function demod(t0, r, from, n, beta = 0) {
      const N = from + n, E = new Float64Array(N * T);
      let mean = 0;
      for (let s = 0; s < N; s++) for (let k = 0; k < T; k++) { const v = symE(k, t0 + s * tsym * r, r); E[s * T + k] = v; mean += v; }
      mean /= N * T;
      // eco della nota precedente (riverbero): se ne toglie una parte
      if (beta) for (let s = N - 1; s > 0; s--) for (let k = 0; k < T; k++) E[s * T + k] = Math.max(E[s * T + k] * 0.02, E[s * T + k] - beta * E[(s - 1) * T + k]);
      // soglia di rumore per nota: quartile basso sulle colonne (ogni nota suona solo ~1/16 del tempo),
      // mai sotto un millesimo dell'energia media (segnale pulito: niente rapporti infiniti)
      const fl = new Float64Array(T), col = new Float64Array(N);
      for (let k = 0; k < T; k++) {
        for (let s = 0; s < N; s++) col[s] = E[s * T + k];
        col.sort();
        fl[k] = Math.max(col[Math.floor(N * 0.3)], mean * 1e-3) + 1e-15;
      }
      const sym = new Uint8Array(n), conf = new Float64Array(n), sc = new Float64Array(n * T);
      let tot = 0;
      for (let s = 0; s < n; s++) {
        const row = (from + s) * T;
        let b1 = -1, v1 = -1, v2 = -1, sum = 0;
        for (let k = 0; k < T; k++) {
          const v = E[row + k] / fl[k]; sc[s * T + k] = v; sum += v;
          if (v > v1) { v2 = v1; v1 = v; b1 = k; } else if (v > v2) v2 = v;
        }
        sym[s] = b1; conf[s] = v1 / (v2 + 1e-9); tot += v1 / (sum + 1e-9);
      }
      return { sym, conf, sc, score: tot / n };
    }
    function headerLen(t0) {
      const d = demod(t0, 1, PRE.length, 6);
      // nota soft: per ogni nibble sommo gli score normalizzati delle tre copie
      const nib = (off) => {
        let bv = 0, bs = -1, s2 = -1;
        for (let v = 0; v < 16; v++) {
          let s = 0;
          for (let c = 0; c < 3; c++) { const row = (c * 2 + off) * T; let sum = 0; for (let k = 0; k < T; k++) sum += d.sc[row + k]; s += d.sc[row + (v ^ HDR[c])] / (sum + 1e-9); }
          if (s > bs) { s2 = bs; bs = s; bv = v; } else if (s > s2) s2 = s;
        }
        return [bv, bs / 3, s2 / 3];
      };
      const hi = nib(0), lo = nib(1);
      return { L: (hi[0] << 4) | lo[0], conf: Math.min(hi[1], lo[1]) };
    }
    function tryBytes(d, L, nsym) {
      const n = L + nsym, raw = new Array(n), cf = new Array(n);
      for (let i = 0; i < n; i++) { raw[i] = ((d.sym[2 * i] << 4) | d.sym[2 * i + 1]) ^ WHITE[i]; cf[i] = Math.min(d.conf[2 * i], d.conf[2 * i + 1]); }
      const ok = (data) => {
        if (!data) return null;
        const c = crc16(data.slice(0, L - 2));
        return c === ((data[L - 2] << 8) | data[L - 1]) ? Uint8Array.from(data.slice(0, L - 2)) : null;
      };
      let r = ok(rsDecode(raw, nsym));
      if (r) return { bytes: r, erased: 0 };
      const order = cf.map((c, i) => [c, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
      for (let e = 2; e <= nsym; e += 2) {
        r = ok(rsDecode(raw, nsym, order.slice(0, e)));
        if (r) return { bytes: r, erased: e };
      }
      return null;
    }
    function decodeBody(t0, L) {
      const nsym = nsymFor(L), n = 2 * (L + nsym), from = PRE.length + 6;
      const tries = [];
      for (let ri = -8; ri <= 8; ri++) for (let dt = -3; dt <= 3; dt++) {
        const r = 1 + ri * 0.001;
        // stima veloce: solo un simbolo su tre
        let s = 0, cnt = 0;
        for (let q = 0; q < n; q += 3) {
          const t = t0 + dt + (from + q) * tsym * r;
          let v1 = 0, sum = 1e-12;
          for (let k = 0; k < T; k++) { const v = symE(k, t, r) / (1e-9 + 1); sum += v; if (v > v1) v1 = v; }
          s += v1 / sum; cnt++;
        }
        tries.push({ r, dt, s: s / cnt });
      }
      tries.sort((a, b) => b.s - a.s);
      for (const beta of [0, 0.5, 0.8]) for (const tr of tries.slice(0, beta ? 2 : 4)) {
        const d = demod(t0 + tr.dt, tr.r, from, n, beta);
        const got = tryBytes(d, L, nsym);
        if (got) return Object.assign(got, { rate: tr.r, shift: tr.dt * hopMs, quality: d.score, echo: beta });
      }
      return null;
    }
    function step() {
      // nuovo hop completo h-1: cerco il preambolo che finirebbe qui
      const t = h - need(PRE.length);
      if (t < 1 || h - 1 < 0) return;
      if (pending) {
        const end = pending.t0 + need(pending.nSym, 1.009) + 4;
        if (o.onProgress) o.onProgress(Math.min(1, (h - pending.t0) / (end - pending.t0)), { L: pending.L });
        if (h >= end) {
          const P = pending; pending = null;
          let got = decodeBody(P.t0, P.L);
          if (!got && P.alt != null) got = decodeBody(P.t0, P.alt);
          resumeAt = P.t0 + need(P.nSym);
          if (got) { if (o.onFrame) o.onFrame(got.bytes, { rate: got.rate, erased: got.erased, quality: got.quality, at: P.t0 * hopMs }); }
          else if (o.onFail) o.onFail('crc');
        }
        return;
      }
      if (hdr) {
        // la lunghezza arriva 6 note dopo il preambolo
        if (h < hdr.t + need(PRE.length + 6) + 2) return;
        const c = hdr; hdr = null;
        const hd = headerLen(c.t);
        if (hd.L >= 3 && hd.L <= MAX_L && hd.conf > 0.25) {
          const nSym = PRE.length + 6 + 2 * (hd.L + nsymFor(hd.L));
          pending = { t0: c.t, L: hd.L, nSym, alt: null };
          if (o.onDetect) o.onDetect({ L: hd.L, score: c.s });
        } else {
          resumeAt = c.t + 2;
          if (o.onFail) o.onFail('header', { L: hd.L, conf: hd.conf, t: c.t, s: c.s });
        }
        return;
      }
      if (t < resumeAt) return;
      const sc = preScore(t);
      score[t & (CAP - 1)] = sc;
      if (cand) {
        // il punteggio ha un altopiano largo quanto le guardie: si prende il centro
        if (sc > cand.s + 0.004) { cand.t = cand.t2 = t; cand.s = sc; } else if (sc > cand.s - 0.01) { cand.t2 = t; if (sc > cand.s) cand.s = sc; }
        if (t - cand.t2 > tsym * 0.6) { cand.t = Math.round((cand.t + cand.t2) / 2); hdr = cand; cand = null; }
      } else if (sc > 0.42) cand = { t, t2: t, s: sc };
    }
    function push(x) {
      for (let n = 0; n < x.length; n++) {
        const v = x[n];
        sq += v * v;
        for (let k = 0; k < T; k++) {
          ar[k] += v * pc[k]; ai[k] -= v * ps[k];
          const c = pc[k] * cw[k] - ps[k] * sw[k]; ps[k] = pc[k] * sw[k] + ps[k] * cw[k]; pc[k] = c;
        }
        if (++inHop === hop) {
          inHop = 0;
          h++;
          const i = h & (CAP - 1);
          for (let k = 0; k < T; k++) {
            cr[k] += ar[k]; ci[k] += ai[k]; PR[k][i] = cr[k]; PI[k][i] = ci[k]; ar[k] = 0; ai[k] = 0;
            const m = Math.hypot(pc[k], ps[k]); pc[k] /= m; ps[k] /= m;
          }
          if ((h & 63) === 0) { level = Math.sqrt(sq / (64 * hop)); sq = 0; if (o.onLevel) o.onLevel(level); }
          step();
        }
      }
    }
    return {
      push,
      reset() { cand = null; hdr = null; pending = null; resumeAt = h + 1; },
      get level() { return level; }, get busy() { return !!pending; }, get hops() { return h; },
    };
  }
  function decode(pcm, sampleRate) {
    let got = null;
    const rx = receiver({ sampleRate, onFrame: (b) => { if (!got) got = b; } });
    rx.push(pcm);
    rx.push(new Float32Array(Math.round(sampleRate * 0.3)));
    return got;
  }

  /* ---------- browser: microfono e altoparlante ---------- */
  const TAP = `class T extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1024);this.n=0}
process(i){const c=i[0]&&i[0][0];if(c)for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===1024){this.port.postMessage(this.b);this.b=new Float32Array(1024);this.n=0}}return true}}
registerProcessor('hh-sonic-tap',T);`;
  async function open(o = {}) {
    const md = G.navigator && G.navigator.mediaDevices;
    if (!md || !md.getUserMedia) { const e = new Error('nomic'); e.code = 'nomic'; throw e; }
    const AC = G.AudioContext || G.webkitAudioContext;
    if (!AC) { const e = new Error('noaudio'); e.code = 'noaudio'; throw e; }
    const ctx = o.ctx || new AC();
    let stream;
    try {
      stream = await md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    } catch (err) {
      if (!o.ctx) ctx.close();
      const e = new Error('denied'); e.code = err && err.name === 'NotFoundError' ? 'nomic' : 'denied'; throw e;
    }
    if (ctx.state !== 'running') { try { await ctx.resume(); } catch (e) { /* resta sospeso: lo segnala modem.running */ } }
    const rx = receiver({ sampleRate: ctx.sampleRate, onFrame: o.onFrame, onProgress: o.onProgress, onFail: o.onFail, onDetect: o.onDetect, onLevel: o.onLevel });
    const src = ctx.createMediaStreamSource(stream), sink = ctx.createGain();
    sink.gain.value = 0; sink.connect(ctx.destination);
    let node;
    try {
      const url = URL.createObjectURL(new Blob([TAP], { type: 'text/javascript' }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      node = new G.AudioWorkletNode(ctx, 'hh-sonic-tap');
      node.port.onmessage = (e) => rx.push(e.data);
    } catch (e) {
      node = ctx.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (ev) => rx.push(ev.inputBuffer.getChannelData(0));
    }
    src.connect(node); node.connect(sink);
    let playing = null;
    const modem = {
      ctx, stream, rx, sampleRate: ctx.sampleRate,
      get running() { return ctx.state === 'running'; },
      get level() { return rx.level; },
      send(bytes, onProg) {
        modem.stopSending();
        const pcm = encode(bytes, { sampleRate: ctx.sampleRate });
        const buf = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
        buf.getChannelData(0).set(pcm);
        const s = ctx.createBufferSource(), g = ctx.createGain();
        s.buffer = buf; g.gain.value = o.volume || 0.9;
        s.connect(g); g.connect(ctx.destination);
        const t0 = ctx.currentTime, dur = buf.duration;
        return new Promise((res) => {
          let iv = 0;
          const done = (ok) => { if (!playing || playing.s !== s) return; clearInterval(iv); playing = null; res(ok); };
          s.onended = () => done(true);
          playing = { s, done };
          if (onProg) iv = setInterval(() => onProg(Math.min(1, (ctx.currentTime - t0) / dur)), 100);
          s.start();
        });
      },
      stopSending() { if (playing) { const p = playing; try { p.s.stop(); } catch (e) { /* già fermo */ } p.done(false); } },
      close() {
        modem.stopSending();
        try { src.disconnect(); node.disconnect(); } catch (e) { /* già staccato */ }
        stream.getTracks().forEach((t) => t.stop());
        if (!o.ctx) ctx.close();
      },
    };
    return modem;
  }

  HH.sonic = { TONES, PRE, SYM_MS, encode, decode, receiver, duration, crc16, nsymFor, open, frameSymbols };
})(typeof globalThis !== 'undefined' ? globalThis : window);
