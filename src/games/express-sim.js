/* Hari Express — simulazione a passo fisso (logica pura, deterministica): mezzi che seguono i percorsi A*, prenotazione
 * dei binari coi semafori a blocco, carico e scarico, pagamento, produzione delle industrie e dei villaggi,
 * valutazione delle stazioni, crescita delle città, calendario e conti.
 *
 * Tempo: 1 ora = TPH passi (24), 1 giorno = 24 ore (TPD = 576 passi). L'orologio è s.h (ore intere dall'inizio,
 *   0 = 1 gennaio dell'anno 1 a mezzanotte) + s.tk (passi nell'ora). Ogni ora: produzione, valutazioni, merce che se ne
 *   va (hourly); ogni giorno: esercizio dei mezzi, manutenzione, crescita delle città, conti (daily). Velocità dei
 *   mezzi in caselle all'ora; tempi di pagamento e valutazioni in ore. Il chiamante (express-logic.js) fa avanzare con
 *   tick(s, ev).
 *
 * Treni e blocchi (versione semplice ma robusta, "path signals" ridotti all'osso):
 *   - ogni treno PRENOTA le caselle prima di entrarci; due treni non possono mai avere la stessa casella prenotata,
 *     quindi non possono scontrarsi;
 *   - quando serve la casella successiva il treno prenota, tutto o niente, il tratto del suo percorso da lì fino al
 *     prossimo semaforo (escluso) o fino alla fermata; se una casella è di un altro treno aspetta (rosso);
 *   - le caselle si liberano quando l'ultimo vagone le lascia;
 *   - i semafori dividono la linea in tratti: più semafori = più treni sulla stessa linea, uno dietro l'altro;
 *   - un treno fermo al rosso da più di STUCK giorni prova a girarsi e a cercare un'altra strada (rete di salvataggio).
 * I bus e i camion non si scontrano (si sorpassano: è un mondo gentile).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const N = () => HH.expressNet;
  const TPH = 24, HPD = 24, TPD = TPH * HPD, STUCK = 20;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const opp = (d) => (d + 2) & 3;

  // merci: prezzo (ghiande per unità e casella), ore di viaggio senza calo (d1) e ore per arrivare al minimo (d2)
  const CARGO = {
    pax: { price: 0.32, d1: 10, d2: 40 }, mail: { price: 0.45, d1: 12, d2: 40 },
    milk: { price: 0.38, d1: 8, d2: 30 }, cheese: { price: 0.55, d1: 15, d2: 50 },
    grain: { price: 0.3, d1: 20, d2: 80 }, bread: { price: 0.5, d1: 8, d2: 30 },
    wood: { price: 0.3, d1: 30, d2: 100 }, toys: { price: 0.62, d1: 20, d2: 80 },
  };
  const CARGOS = Object.keys(CARGO);
  const GOODS = ['cheese', 'bread', 'toys'];
  // mezzi: rete, velocità (caselle all'ora), costo, esercizio al giorno, capacità; fromH = disponibile dall'ora (Fragola:
  // 1° marzo dell'anno 1, ~28 minuti veri a ×1, come l'anno 5 di prima)
  const VT = {
    bus: { net: 'road', spd: 1.8, cost: 900, run: 10, cargo: ['pax'], cap: 30 },
    mail: { net: 'road', spd: 1.9, cost: 900, run: 10, cargo: ['mail'], cap: 20 },
    truck: { net: 'road', spd: 1.6, cost: 1100, run: 12, cargo: ['milk', 'cheese', 'grain', 'bread', 'wood', 'toys'], cap: 20 },
    castagna: { net: 'rail', spd: 3.0, cost: 3500, run: 46 },
    fragola: { net: 'rail', spd: 5.0, cost: 7000, run: 72, fromH: 59 * 24 },
  };
  const WAGON = { cost: 400, run: 4, max: 6, cap: { pax: 40, mail: 30, milk: 30, cheese: 25, grain: 35, bread: 25, wood: 30, toys: 25 } };
  const CATCH = { rail: 3, road: 2 };

  /* ---------- calendario (anni di 365 giorni) ---------- */
  const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // ora (intera) dall'inizio → { y, m (0–11), d (1–31), hh (0–23) }
  function date(h) {
    const day = Math.floor(h / HPD);
    let y = Math.floor(day / 365), r = day - y * 365, m = 0;
    while (r >= MD[m]) { r -= MD[m]; m++; }
    return { y: y + 1, m, d: r + 1, hh: h - day * HPD };
  }

  /* ---------- casualità nello stato (mulberry32 con stato intero) ---------- */
  function rand(s) {
    s.rs = (s.rs + 0x6d2b79f5) >>> 0;
    let t = s.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* ---------- mezzi: capacità, lunghezza ---------- */
  function caps(v) {
    const o = {};
    if (VT[v.type].net === 'road') o[v.cargo] = VT[v.type].cap;
    else for (const c of v.cars) o[c] = (o[c] || 0) + WAGON.cap[c];
    return o;
  }
  const vlen = (v) => (VT[v.type].net === 'rail' ? 0.5 * (1 + v.cars.length) : 0.5);
  const isTrain = (v) => VT[v.type].net === 'rail';
  const loaded = (v) => { let n = 0; for (const c in v.ld) n += v.ld[c][0]; return n; };

  /* ---------- geometria dentro la casella: dal lato a al lato b, q = 0..1 ----------
   * dritto: segmento tra i punti medi dei lati; curva: quarto di cerchio attorno all'angolo comune; inversione (a = b):
   * fino al centro e indietro. → { x, y, h } in caselle (centro della casella = +0.5), h = direzione di marcia (rad). */
  const MID = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
  function tilePos(w, t, a, b, q, out) {
    const tx = t % w, ty = (t / w) | 0;
    out = out || {};
    if (a < 0) a = opp(b);
    if (a === b) {
      const k = q < 0.5 ? q * 2 : (1 - q) * 2, m = MID[a];
      out.x = tx + m[0] + (0.5 - m[0]) * k; out.y = ty + m[1] + (0.5 - m[1]) * k;
      const d = q < 0.5 ? opp(a) : a; out.h = Math.atan2(DY[d], DX[d]);
      return out;
    }
    if (b === opp(a)) {
      const p0 = MID[a], p1 = MID[b];
      out.x = tx + p0[0] + (p1[0] - p0[0]) * q; out.y = ty + p0[1] + (p1[1] - p0[1]) * q;
      out.h = Math.atan2(DY[b], DX[b]);
      return out;
    }
    // curva: centro nell'angolo comune ai lati a e b
    const cx = (a === 1 || b === 1) ? 1 : 0, cy = (a === 2 || b === 2) ? 1 : 0;
    const p0 = MID[a], p1 = MID[b];
    const a0 = Math.atan2(p0[1] - cy, p0[0] - cx), a1 = Math.atan2(p1[1] - cy, p1[0] - cx);
    let da = a1 - a0;
    if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    const an = a0 + da * q;
    out.x = tx + cx + Math.cos(an) * 0.5; out.y = ty + cy + Math.sin(an) * 0.5;
    out.h = an + (da > 0 ? Math.PI / 2 : -Math.PI / 2);
    return out;
  }
  // posizione a distanza `back` (caselle) dietro la testa: { t, a, b, q }
  function along(v, back) {
    if (!v.trail || !v.trail.length) return { t: v.t, a: v.a, b: v.b, q: Math.max(0, v.p - back) };
    if (back <= v.p) return { t: v.t, a: v.a, b: v.b, q: v.p - back };
    const k = Math.ceil(back - v.p);
    if (k >= v.trail.length) { const e = v.trail[v.trail.length - 1]; return { t: e[0], a: e[1], b: e[2], q: 0 }; }
    const e = v.trail[k];
    return { t: e[0], a: e[1], b: e[2], q: v.p - back + k };
  }

  /* ---------- prenotazioni dei binari ---------- */
  function release(W, v, t) {
    if (W.resv[t] !== v.id) return;
    for (const e of v.trail) if (e[0] === t) return;
    if (v.ahead.includes(t)) return;
    W.resv[t] = 0;
  }
  function releaseAhead(W, v) {
    const a = v.ahead; v.ahead = [];
    for (const t of a) release(W, v, t);
  }
  function trimTrail(W, v) {
    const L = vlen(v), keep = Math.max(1, Math.ceil(L - v.p) + 1);
    while (v.trail.length > keep) { const e = v.trail.pop(); release(W, v, e[0]); }
  }
  // il tratto da prenotare: dalla prossima casella fino al prossimo semaforo (escluso) o alla fine del percorso
  function runOf(W, v) {
    const run = [];
    for (let k = 0; k < v.pt.length; k++) {
      const t = v.pt[k];
      if (k > 0 && W.sig[t]) break;
      run.push(t);
    }
    return run;
  }
  // chi tiene occupato il tratto davanti (id di un altro treno) o 0
  function blocker(W, v) {
    for (const t of runOf(W, v)) if (W.resv[t] && W.resv[t] !== v.id) return W.resv[t];
    return 0;
  }
  function tryReserve(W, v) {
    const run = runOf(W, v);
    if (!run.length) return false;
    for (const t of run) if (W.resv[t] && W.resv[t] !== v.id) return false;
    for (const t of run) { W.resv[t] = v.id; if (!v.ahead.includes(t)) v.ahead.push(t); }
    return true;
  }

  /* ---------- percorsi ---------- */
  function stationTiles(s, id) { const st = s.stations[id]; return st ? st.tiles : []; }
  // partenze possibili dalla posizione attuale: in avanti (tutte le uscite dalla casella) e, per i treni, girandosi
  function plan(s, W, v, free) {
    const o = v.orders[v.oi];
    if (!o || !s.stations[o.st]) return null;
    const kind = VT[v.type].net, w = W.w, starts = [];
    const push = (t, d, g, k) => {
      const nx = (t % w) + DX[d], ny = ((t / w) | 0) + DY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= W.h) return;
      starts.push({ t: ny * w + nx, a: opp(d), g, k });
    };
    if (free) {
      const ex = N().exitsOf(W, kind, v.t, v.a);
      for (let d = 0; d < 4; d++) if (ex & (1 << d)) push(v.t, d, 0, d);
      if (kind === 'road' && v.a >= 0 && (W.road[v.t] & (1 << v.a))) push(v.t, v.a, 1.5, v.a);
      if (kind === 'rail') {
        const tail = along(v, vlen(v));
        if (tail.a >= 0) push(tail.t, tail.a, 2 + vlen(v), 10);
      }
    } else push(v.t, v.b, 0, v.b);
    const r = N().route(W, kind, starts, o.st, stationTiles(s, o.st), isTrain(v) ? { resv: W.resv, id: v.id } : null);
    return r;
  }
  function setPath(s, W, v, r) {
    if (isTrain(v)) releaseAhead(W, v);
    if (r.k === 10) reverse(W, v);
    else if (r.k !== v.b) v.b = r.k;
    v.pt = r.tiles.slice(); v.pe = r.exits.slice(); v.pv = W.ver;
  }
  function reverse(W, v) {
    const L = vlen(v);
    let k, q;
    if (L <= v.p) { k = 0; q = v.p - L; } else { k = Math.ceil(L - v.p); q = v.p - L + k; }
    if (k >= v.trail.length) { k = v.trail.length - 1; q = 0; }
    const nt = [];
    for (let i = k; i >= 0; i--) { const e = v.trail[i]; nt.push([e[0], e[2], e[1] < 0 ? opp(e[2]) : e[1]]); }
    const h = nt[0];
    for (let i = k + 1; i < v.trail.length; i++) { /* oltre la coda: non è più occupato */ }
    const drop = v.trail.slice(k + 1);
    v.trail = nt; v.t = h[0]; v.a = h[1]; v.b = h[2]; v.p = 1 - q;
    for (const e of drop) release(W, v, e[0]);
    trimTrail(W, v);
  }

  /* ---------- stazioni: area di raccolta, merci accettate ---------- */
  function coverage(s, W) {
    W.cov = [];
    for (const st of s.stations) {
      if (!st) { W.cov.push(null); continue; }
      const r = CATCH[st.kind], towns = {}, inds = [], acc = {};
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const t of st.tiles) { const x = t % W.w, y = (t / W.w) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      x0 -= r; y0 -= r; x1 += r; y1 += r;
      const inBox = (i) => { const x = i % W.w, y = (i / W.w) | 0; return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
      for (const tw of s.towns) { const n = tw.houses.filter(inBox).length; if (n) towns[tw.id] = n; }
      for (const d of s.inds) {
        let hit = false;
        for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) if (inBox((d.y + dy) * W.w + d.x + dx)) hit = true;
        if (hit) { inds.push(d.id); for (const c of HH.expressMap.IND[d.type].take || []) acc[c] = 1; }
      }
      let houses = 0;
      for (const k in towns) houses += towns[k];
      if (houses >= 1) { acc.pax = 1; acc.mail = 1; }
      if (houses >= 2) for (const c of GOODS) acc[c] = 1;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      W.cov.push({ towns, inds, acc, cx, cy, houses });
    }
    W.covDirty = false;
  }
  const cov = (s, W, id) => { if (W.covDirty || !W.cov || W.cov.length !== s.stations.length) coverage(s, W); return W.cov[id]; };

  /* ---------- carico, scarico, pagamento ---------- */
  function pay(c, n, dist, days) {
    const C = CARGO[c];
    const tf = days <= C.d1 ? 1 : Math.max(0.3, 1 - (days - C.d1) / C.d2);
    return Math.round(n * dist * C.price * tf);
  }
  function arrive(s, W, v, ev) {
    const o = v.orders[v.oi], st = s.stations[o.st];
    v.mode = 'load'; v.wt = 0; v.bk = 0; v.pt = []; v.pe = [];
    if (!st) return;
    const cv = cov(s, W, st.id), my = caps(v);
    // scarico: le merci che la stazione accetta (non quelle caricate qui); "solo carica" (nu) non scarica
    if (!o.nu) for (const c of Object.keys(v.ld)) {
      const [n, from, d0] = v.ld[c];
      if (!n || from === st.id || !cv.acc[c] || !s.stations[from]) continue;
      const fc = cov(s, W, from), dist = Math.max(1, Math.round(Math.abs(fc.cx - cv.cx) + Math.abs(fc.cy - cv.cy)));
      const money = pay(c, n, dist, s.h - d0);
      s.money += money; s.fin.inc += money; v.profit += money;
      s.del[c] = (s.del[c] || 0) + n;
      deliver(s, W, cv, c, n);
      delete v.ld[c];
      ev.push({ k: 'pay', v: v.id, st: st.id, c, n, money });
    }
    // "solo scarica" (nl): qui non si carica, quindi la stazione non comincia a raccogliere quella merce
    if (!o.nl) for (const c in my) { st.last[c] = s.h; if (!st.pick[c]) { st.pick[c] = 1; st.rate[c] = 0.55; } st.spd[c] = Math.max(st.spd[c] || 0, VT[v.type].spd); }
    ev.push({ k: 'arrive', v: v.id, st: st.id });
  }
  function deliver(s, W, cv, c, n) {
    const IND = HH.expressMap.IND;
    // all'industria che la accetta (la prima nell'area), altrimenti al villaggio con più case nell'area
    for (const id of cv.inds) {
      const d = s.inds[id];
      if ((IND[d.type].take || []).includes(c)) { d.stock += n; d.got += n; s.gd[c + '@i' + id] = (s.gd[c + '@i' + id] || 0) + n; return; }
    }
    let best = -1, bn = 0;
    for (const k in cv.towns) if (cv.towns[k] > bn) { bn = cv.towns[k]; best = +k; }
    if (best < 0) return;
    const tw = s.towns[best];
    if (GOODS.includes(c)) tw.gm += n; else tw.pm += n;
    s.gd[c + '@t' + best] = (s.gd[c + '@t' + best] || 0) + n;
  }
  function loadStep(s, W, v, ev) {
    const o = v.orders[v.oi], st = s.stations[o.st];
    v.wt++;
    let moved = 0;
    if (st && !o.nl) {
      const my = caps(v), cars = isTrain(v) ? v.cars : [v.cargo];
      for (const c in my) {
        const have = v.ld[c] ? v.ld[c][0] : 0, free = my[c] - have, w = st.wait[c] || 0;
        if (free <= 0 || w <= 0) continue;
        const take = Math.min(free, w, 2 * cars.filter((x) => x === c).length);
        const d0 = v.ld[c] ? v.ld[c][2] : s.h;
        v.ld[c] = [have + take, st.id, Math.round((d0 * have + s.h * take) / (have + take))];
        st.wait[c] = w - take; moved += take;
        st.last[c] = s.h;
      }
      if (moved) ev.push({ k: 'load', v: v.id, st: st.id });
    }
    if (v.wt < 12 || moved) return;
    if (o.full && st && !o.nl) {
      const my = caps(v);
      for (const c in my) if (!v.ld[c] || v.ld[c][0] < my[c]) return;
    }
    depart(s, W, v, ev);
  }
  function depart(s, W, v, ev) {
    v.oi = (v.oi + 1) % v.orders.length;
    v.mode = 'go'; v.wt = 0; v.bk = 0;
    const r = plan(s, W, v, true);
    if (r) setPath(s, W, v, r); else { v.mode = 'lost'; v.pt = []; v.pe = []; }
    ev.push({ k: 'depart', v: v.id });
  }

  /* ---------- movimento ---------- */
  function move(s, W, v, ev) {
    if (v.mode === 'load') { loadStep(s, W, v, ev); return; }
    if (v.mode === 'lost') {
      if (s.tk === 0) { const r = plan(s, W, v, true); if (r) { setPath(s, W, v, r); v.mode = 'go'; } }
      return;
    }
    // la rete è cambiata: nuovo percorso dalla casella successiva
    if (v.pv !== W.ver) {
      const r = plan(s, W, v, false) || (v.p < 0.05 ? plan(s, W, v, true) : null);
      if (r) setPath(s, W, v, r); else { if (isTrain(v)) releaseAhead(W, v); v.pt = []; v.pe = []; v.pv = W.ver; }
    }
    const train = isTrain(v);
    let rem = VT[v.type].spd / TPH;
    for (let guard = 0; guard < 4 && rem > 1e-9; guard++) {
      if (!v.pt.length) {
        const o = v.orders[v.oi];
        const there = o && s.stations[o.st] && W.st[v.t] === o.st + 1;
        const stopP = train ? 0.85 : 0.5;
        if (there) {
          if (v.p + rem >= stopP) { v.p = Math.max(v.p, stopP); arrive(s, W, v, ev); }
          else v.p += rem;
          return;
        }
        // senza percorso: si ferma in fondo alla casella e riprova ogni ora
        v.p = Math.min(0.999, v.p + rem);
        if (s.tk === 0) { const r = plan(s, W, v, v.p > 0.99); if (r) setPath(s, W, v, r); else v.mode = v.p > 0.99 ? 'lost' : v.mode; }
        return;
      }
      if (v.p + rem < 1) { v.p += rem; if (train) { v.wt = 0; v.bk = 0; } return; }
      const next = v.pt[0];
      if (train && W.resv[next] !== v.id && !tryReserve(W, v)) {
        v.p = Math.min(v.p + rem, 0.999); v.wt++;
        // fermo al rosso per colpa di un altro treno che esiste davvero: è questo che Hari segnala (non il carico, non l'inversione)
        const by = blocker(W, v);
        v.bk = by && by !== v.id && s.veh.some((x) => x.id === by && isTrain(x)) ? (v.bk || 0) + 1 : 0;
        if (v.wt > STUCK * TPH) unstick(s, W, v, ev);
        return;
      }
      rem -= 1 - v.p;
      const a = opp(v.b);
      v.t = next; v.a = a; v.b = v.pe[0]; v.p = 0;
      v.pt.shift(); v.pe.shift();
      if (train) {
        v.wt = 0; v.bk = 0;
        v.trail.unshift([v.t, v.a, v.b]);
        const ix = v.ahead.indexOf(v.t); if (ix >= 0) v.ahead.splice(ix, 1);
        trimTrail(W, v);
      }
    }
  }
  // rete di salvataggio: fermo al rosso da troppo tempo → si gira se dietro c'è una strada per la meta
  function unstick(s, W, v, ev) {
    v.wt = 0;
    const tail = along(v, vlen(v));
    if (tail.a < 0) return;
    const nx = (tail.t % W.w) + DX[tail.a], ny = ((tail.t / W.w) | 0) + DY[tail.a];
    if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h) return;
    const o = v.orders[v.oi];
    const r = N().route(W, 'rail', [{ t: ny * W.w + nx, a: opp(tail.a), g: 0, k: 10 }], o.st, stationTiles(s, o.st), { resv: W.resv, id: v.id });
    if (!r) { ev.push({ k: 'stuck', v: v.id }); return; }
    setPath(s, W, v, r);
    ev.push({ k: 'turn', v: v.id });
  }

  /* ---------- produzione, valutazioni, città ---------- */
  function emit(s, st, c, units) {
    st.fr[c] = (st.fr[c] || 0) + units * (st.rate[c] || 0);
    const n = Math.floor(st.fr[c]);
    if (n > 0) { st.fr[c] -= n; st.wait[c] = (st.wait[c] || 0) + n; }
  }
  // ogni ora (prima del nuovo modello del tempo era ogni giorno: stessi numeri, stesso ritmo in secondi veri)
  function hourly(s, W, ev) {
    const IND = HH.expressMap.IND;
    // stazioni che servono ogni industria e villaggio (solo dopo il primo passaggio di un mezzo per quella merce)
    for (const d of s.inds) {
      const T = IND[d.type];
      let units = 0;
      if (T.prod) { d.acc += T.prod / HPD; units = Math.floor(d.acc); d.acc -= units; }
      else { units = d.stock; d.stock = 0; }
      d.made += units;
      if (!units) continue;
      let best = null;
      for (const st of s.stations) {
        if (!st || !st.pick[T.make]) continue;
        if (!cov(s, W, st.id).inds.includes(d.id)) continue;
        if (!best || st.rate[T.make] > best.rate[T.make]) best = st;
      }
      if (best) emit(s, best, T.make, units);
    }
    for (const tw of s.towns) {
      const total = tw.houses.length || 1;
      for (const st of s.stations) {
        if (!st) continue;
        const n = cov(s, W, st.id).towns[tw.id];
        if (!n) continue;
        if (st.pick.pax) emit(s, st, 'pax', (tw.pop / 40) * (n / total));
        if (st.pick.mail) emit(s, st, 'mail', (tw.pop / 120) * (n / total));
      }
    }
    // valutazione: passaggi frequenti, poca merce che aspetta, mezzi veloci
    for (const st of s.stations) {
      if (!st) continue;
      for (const c in st.pick) {
        const hrs = s.h - (st.last[c] || 0), w = st.wait[c] || 0;
        const tg = 0.17 + (hrs <= 7 ? 0.4 : hrs <= 14 ? 0.3 : hrs <= 30 ? 0.18 : hrs <= 60 ? 0.08 : 0)
          + (w <= 40 ? 0.25 : w <= 120 ? 0.15 : w <= 300 ? 0.05 : -0.1) + Math.min(0.15, (st.spd[c] || 0) * 0.04);
        const r = st.rate[c];
        st.rate[c] = Math.round((r + Math.max(-0.02, Math.min(0.02, tg - r))) * 1000) / 1000;
        // la merce lasciata ad aspettare se ne va
        if (w > 0) { const lost = Math.floor(w * (1 - st.rate[c]) * 0.03); if (lost) st.wait[c] = w - lost; }
      }
    }
  }
  // ogni giorno (24 ore; prima ogni mese di 30 "giorni" vecchi = 30 ore di adesso: i numeri sono × 0,8)
  const MNT = { rail: 0.8, road: 0.4, st: 2.4 };
  function daily(s, W, ev) {
    // esercizio dei mezzi e manutenzione di binari, strade e stazioni
    let run = 0, mnt = 0;
    for (const v of s.veh) run += VT[v.type].run + (v.cars ? v.cars.length * WAGON.run : 0);
    let rail = 0, road = 0, sts = 0;
    for (const k in s.net) { const e = s.net[k]; if (e[0]) rail++; if (e[1] && !W.troad[+k]) road++; }
    for (const st of s.stations) if (st) sts += st.tiles.length;
    mnt = Math.round(rail * MNT.rail + road * MNT.road + sts * MNT.st);
    s.money -= run + mnt; s.fin.run += run; s.fin.mnt += mnt;
    // città: crescono se servite bene (passeggeri presi nelle ultime 30 ore, merci consegnate nel giorno)
    for (const tw of s.towns) {
      let served = false;
      for (const st of s.stations) {
        if (!st || !st.pick.pax) continue;
        if (cov(s, W, st.id).towns[tw.id] && s.h - (st.last.pax || 0) <= 30 && st.rate.pax >= 0.35) served = true;
      }
      const score = (served ? 1 : 0) + Math.min(3, tw.gm / 8) + Math.min(1, tw.pm / 32);
      const grow = Math.floor(score * (1.6 + tw.pop * 0.024));
      tw.lg = grow; tw.gm = 0; tw.pm = 0;
      if (grow > 0) {
        tw.pop += grow;
        const before = tw.houses.length;
        growTown(s, W, tw, 3 + Math.floor(tw.pop / 30));
        if (tw.houses.length > before) { W.covDirty = true; ev.push({ k: 'grow', town: tw.id }); }
      }
    }
    for (const d of s.inds) { d.lm = d.made; d.made = 0; d.got = 0; }
    // ghiande finite: Hari vende il mezzo che rende meno
    if (s.money < 0 && s.veh.length) {
      let worst = s.veh[0];
      for (const v of s.veh) if (v.profit < worst.profit) worst = v;
      ev.push({ k: 'sold', v: worst.id, money: sell(s, W, worst.id) });
    }
  }
  function growTown(s, W, tw, target) {
    const M = HH.expressMap;
    const fake = { w: W.w, h: W.h, water: W.water, roads: { length: 0 }, towns: [] };
    // houseSpots guarda strade e case: qui le strade sono quelle vere (W.road) e le caselle occupate W.use/rail/stazioni
    const used = new Uint8Array(W.n);
    for (let i = 0; i < W.n; i++) used[i] = W.use[i] || W.rail[i] || W.st[i] || (W.tun && W.tun[i]) ? 1 : 0;
    const roads = {};
    for (let i = 0; i < W.n; i++) if (W.road[i] && !(W.tun && W.tun[i])) roads[i] = W.road[i];
    fake.roads = roads;
    while (tw.houses.length < target) {
      const sp = M.houseSpots(fake, tw, used);
      if (!sp.length) return;
      const i = sp[Math.min(sp.length - 1, Math.floor(rand(s) * Math.min(sp.length, 4)))];
      tw.houses.push(i); used[i] = 1; W.use[i] = 1; W.own[i] = tw.id; W.tree[i] = 0;
    }
  }
  function sell(s, W, id) {
    const ix = s.veh.findIndex((v) => v.id === id);
    if (ix < 0) return 0;
    const v = s.veh[ix];
    if (isTrain(v)) { releaseAhead(W, v); for (const e of v.trail) if (W.resv[e[0]] === v.id) W.resv[e[0]] = 0; }
    const back = Math.round(v.value * 0.5);
    s.money += back;
    s.veh.splice(ix, 1);
    return back;
  }

  // un treno davvero bloccato: in viaggio, fermo da più di `days` giorni davanti a un tratto prenotato da un altro treno
  function blocked(v, hours = 8) { return isTrain(v) && v.mode === 'go' && (v.bk || 0) > TPH * hours; }

  /* ---------- un passo ---------- */
  function tick(s, W, ev) {
    for (const v of s.veh) move(s, W, v, ev);
    s.tk++;
    if (s.tk >= TPH) {
      s.tk = 0;
      const before = date(s.h);
      s.h++;
      hourly(s, W, ev);
      ev.push({ k: 'hour' });
      if (s.h % HPD) return;
      daily(s, W, ev);
      const now = date(s.h);
      if (now.y !== before.y) {
        s.finY = s.fin; s.fin = { inc: 0, run: 0, mnt: 0, bld: 0, veh: 0 };
        for (const v of s.veh) { v.last = v.profit; v.profit = 0; }
      }
      ev.push({ k: 'day' });
    }
  }

  HH.expressSim = { TPH, HPD, TPD, MNT, CARGO, CARGOS, GOODS, VT, WAGON, CATCH, MD, date, rand, caps, vlen, isTrain, loaded, tilePos, along,
    tryReserve, releaseAhead, blocked, plan, setPath, depart, arrive, coverage, cov, pay, tick, sell, trimTrail, growTown, hourly, daily };
})(typeof globalThis !== 'undefined' ? globalThis : window);
