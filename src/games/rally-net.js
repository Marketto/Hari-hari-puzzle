/* Hari Rally — gara a due giocatori in rete locale (puro: niente DOM né THREE, testabile in Node con uno stub di HH.mp).
 *
 * Programma contro il contratto HH.mp v1 (modulo src/net/*): HH.mp.session(link, { tick, sendEvery, step, snapshot,
 * apply, predict }) con l'host autoritativo.
 *  - L'host (giocatore 1, Hari) simula la gara intera con HH.rally.step(s, dt, [input host, input ospite]) e manda
 *    istantanee compatte (encode: posizione, velocità, rotta e stato di ogni kart, oggetti in pista; < 1 KB).
 *  - L'ospite (giocatore 2) ha la stessa pista (stesso seme: si manda solo il seme, mai la geometria), riceve le
 *    istantanee (apply: interpolazione tra le ultime due) e predice il proprio kart (predict: fisica locale) con una
 *    correzione morbida verso lo stato dell'host.
 *  - Messaggi affidabili (session.event, campo ry): hello (scelta del kart), start (seme e livello), pause, resume,
 *    ev (eventi di gioco che riguardano l'ospite), fin (classifica finale), quit.
 *  - Link caduto: l'host passa il kart dell'ospite all'IA (HH.rally.toAI) e continua; l'ospite torna al menu.
 * Il tasto del power-up viaggia come contatore (u), così non si perde con i pacchetti persi.
 * Esporta HH.rallyNet = { encode, decode, host, guest, size, TICK, SEND }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const TICK = 60, SEND = 3;          // simulazione a 60 Hz, un'istantanea ogni 3 passi (20 al secondo)
  const P = () => HH.rally;
  const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000, r4 = (x) => Math.round(x * 1e4) / 1e4;
  // campi di ogni kart nell'istantanea (ordine fisso) e arrotondamento
  const CF = [['s', r2], ['d', r2], ['psi', r3], ['bet', r3], ['v', r2], ['pd', r2], ['air', r2], ['airT', r2], ['spr', Math.round],
    ['slip', r2], ['boost', r2], ['mini', r2], ['slow', r2], ['honey', Math.round], ['res', r2], ['sh', r2], ['mag', r2], ['it', Math.round],
    ['ac', Math.round], ['fin', r3], ['off', (x) => (x ? 1 : 0)], ['dr', r2], ['kc', r4], ['gh', Math.round], ['stuck', r1], ['late', Math.round]];
  const NUM = (x) => (typeof x === 'number' ? (isFinite(x) ? x : 0) : x ? 1 : 0);

  /* ---------- istantanea compatta ---------- */
  function encode(s, k, full) {
    const out = { k, t: r2(s.t), r: r2(Math.max(0, s.ready)), cd: s.cd, rk: s.rank.join(''), ps: s.ps ? s.ps.slice() : [s.pos], hu: s.hu ? s.hu.join('') : '0',
      c: s.cars.map((c) => { const a = CF.map(([f, rd]) => rd(NUM(c[f]))); while (a.length && a[a.length - 1] === 0) a.pop(); return a; }),
      h: s.hz.map((h) => [h.k === 'h' ? 1 : 0, r1(h.s), r1(h.d), r1(h.t), h.by, h.n]),
      l: s.cl.map((q) => [r1(q.s), r1(q.d), q.to, q.by, r1(q.t), q.life === undefined ? -1 : r2(q.life)]),
      b: s.bx.filter((b) => b[1] > s.t).map((b) => [b[0], r1(b[1])]) };
    // le ghiande prese (bit in esadecimale) solo quando cambiano o ogni tanto (le istantanee si possono perdere)
    if (full) out.a = s.ag;
    return out;
  }
  const size = (snap) => JSON.stringify(snap).length;
  // copia l'istantanea b (con l'interpolazione da a, alpha in 0..1) nello stato locale sg; il kart "skip" (quello
  // predetto dall'ospite) non viene toccato
  function decode(sg, a, b, alpha, skip) {
    const k = a && a !== b ? Math.max(0, Math.min(1, alpha)) : 1;
    const lp = (x, y) => x + (y - x) * k;
    sg.t = a && a !== b ? lp(a.t, b.t) : b.t;
    sg.ready = b.r; if (b.cd !== undefined) sg.cd = b.cd;
    sg.rank = b.rk.split('').map(Number);
    if (sg.hu) { const hu = b.hu.split('').map(Number); if (hu.length !== sg.hu.length) sg.hu = hu; }
    sg.ps = b.ps.slice(); sg.pos = sg.rank.indexOf(0) + 1;
    b.c.forEach((arr, i) => {
      const car = sg.cars[i];
      if (!car || i === skip) return;
      const pa = a && a !== b ? a.c[i] : null;
      CF.forEach(([f], j) => {
        const y = arr[j] || 0;
        if (pa && j < 5) {
          const x = pa[j] || 0;
          // teletrasporti (nuvoletta) e salti grandi: niente interpolazione
          car[f] = j === 0 && Math.abs(y - x) > 12 ? y : lp(x, y);
        } else car[f] = y;
      });
      car.off = !!car.off;
      car.slide = Math.abs(car.bet) * Math.abs(car.v);
    });
    sg.hz = b.h.map((q) => ({ k: q[0] ? 'h' : 'b', s: q[1], d: q[2], t: q[3], by: q[4], n: q[5] }));
    sg.cl = b.l.map((q) => { const o = { s: q[0], d: q[1], to: q[2], by: q[3], t: q[4] }; if (q[5] >= 0) o.life = q[5]; return o; });
    sg.bx = b.b.map((q) => [q[0], q[1]]);
    if (typeof b.a === 'string') sg.ag = b.a;
    return sg;
  }
  // stato del kart nell'istantanea (oggetto con i campi di CF)
  function carOfSnap(b, i) {
    const arr = b.c[i] || [], o = {};
    CF.forEach(([f], j) => { o[f] = arr[j] || 0; });
    return o;
  }
  // input sul filo: { x: sterzo, g: gas, b: freno, u: contatore del power-up }
  const wire = (inp, u) => ({ x: r3(NUM(inp && inp.steer)), g: inp && inp.gas !== undefined ? r2(NUM(inp.gas)) : -1, b: inp && inp.brake ? 1 : 0, u });
  const unwire = (w) => (w ? { steer: NUM(w.x), gas: w.g < 0 ? undefined : NUM(w.g), brake: w.b ? 1 : 0 } : null);
  const SELF = { off: 1, on: 1, jump: 1, drift: 1 };   // eventi che l'ospite ricava già dalla predizione
  const END = { finish: 1, win: 1, lose: 1 };

  function mkSession(link, o) {
    const mp = HH.mp;
    if (!mp || typeof mp.session !== 'function') throw new Error('HH.mp mancante');
    return mp.session(link, Object.assign({ tick: TICK, sendEvery: SEND }, o));
  }

  /* ---------- host (giocatore 1) ---------- */
  // o: { onEvent(e), onMsg(m), onDrop(reason) }; race(s) imposta la gara; pause(on) ferma la simulazione
  function host(link, o = {}) {
    let s = null, k = 0, lastAg = '', agAt = 0, uL = 0, uR = 0, paused = false, local = null, pend = [], dropped = false, closed = false;
    const out = [];
    const ctl = { link, role: 'host', me: 0, events: out };
    const session = mkSession(link, {
      step(dt, inputs) {
        if (!s || paused || P().isOver(s)) return;
        const a = inputs && inputs[0], b = inputs && inputs[1];
        const ia = unwire(a) || { steer: 0, gas: 0, brake: 0 }, ib = s.hu.length > 1 ? unwire(b) : null;
        if (a && a.u > uL) { ia.use = 1; uL = a.u; }
        if (ib && b.u > uR) { ib.use = 1; uR = b.u; }
        const ev = P().step(s, dt, s.hu.length > 1 ? [ia, ib] : [ia]);
        for (const e of ev) {
          out.push(e);
          if (o.onEvent) o.onEvent(e);
          // all'ospite: i suoi eventi personali (by = 1), quelli dei kart (who: power-up, scontri, nuvolette) e quelli
          // di tutti (semaforo); non quelli che ricava da sé con la predizione né la fine (arriva col messaggio fin)
          if (END[e.type]) { /* niente */ } else if (e.by !== undefined) { if (e.by === 1 && !SELF[e.type]) pend.push(e); } else if (!(e.who === 1 && SELF[e.type])) pend.push(e);
          if (e.type === 'finish') ctl.send({ ry: 'fin', res: s.res, ps: s.ps, won: s.won, t: s.fin, pos: s.pos });
        }
      },
      snapshot() {
        if (!s) return { k: ++k, idle: 1 };
        if (pend.length) { ctl.send({ ry: 'ev', l: pend.map(slim) }); pend = []; }
        k++;
        const full = s.ag !== lastAg || k - agAt >= 15;
        if (full) { lastAg = s.ag; agAt = k; }
        return encode(s, k, full);
      },
    });
    session.on('event', (m) => { if (m && m.ry && o.onMsg) o.onMsg(m); });
    link.on('close', (why) => {
      if (closed) return;
      closed = true;
      if (s && !P().isOver(s) && s.hu && s.hu.length > 1) { P().toAI(s, 1); dropped = true; }
      if (o.onDrop) o.onDrop(why);
    });
    let uc = 0, lastU = 0;
    Object.assign(ctl, {
      session,
      race(state) { s = state; k = 0; uL = 0; uR = 0; lastU = 0; uc = 0; pend = []; lastAg = ''; paused = false; out.length = 0; },
      state: () => s,
      dropped: () => dropped || closed,
      // input locale: il tasto del power-up diventa un contatore
      setInput(inp) { if (inp && inp.use && !lastU) uc++; lastU = inp && inp.use ? 1 : 0; local = wire(inp, uc); session.setInput(local); },
      frame(now) { session.frame(now); },
      take() { return out.splice(0, out.length); },
      pause(on) { paused = !!on; },
      send(m) { if (!closed) session.event(m); },
      start() { session.start(); },
      stop() { session.stop(); },
      close() { try { session.stop(); } catch (e) { /* già chiusa */ } closed = true; try { link.close(); } catch (e) { /* già chiuso */ } },
    });
    return ctl;
  }
  const slim = (e) => { const x = {}; for (const kk in e) if (kk !== 'vn' || e.type !== 'bump') x[kk] = e[kk]; if (e.type === 'jump') x.v = r1(e.v); return x; };

  /* ---------- ospite (giocatore 2) ---------- */
  // o: { me = 1, onEvent(e), onMsg(m), onDrop(reason), delayK }; race(sg) imposta lo stato locale (stesso seme)
  function guest(link, o = {}) {
    const me = o.me === undefined ? 1 : o.me;
    let sg = null, buf = [], latest = null, now = 0, lastNow = 0, uc = 0, lastU = 0, closed = false, err = { s: 0, d: 0 }, paused = false;
    const out = [];
    const ctl = { link, role: 'guest', me, events: out };
    const session = mkSession(link, {
      apply(snap, alpha) {
        if (!sg || !snap || snap.idle || !snap.c) return;
        if (!buf.some((q) => q.k === snap.k)) { buf.push(snap); buf.sort((x, y) => x.k - y.k); if (buf.length > 12) buf.shift(); }
        if (!latest || snap.k > latest.k) latest = snap;
        let prev = null;
        for (const q of buf) if (q.k < snap.k) prev = q;
        decode(sg, prev, snap, alpha === undefined ? 1 : alpha, me);
        correct();
      },
      predict(dt, myInput) {
        if (!sg || paused || P().isOver(sg)) return;
        const ev = P().predict(sg, me, dt, unwire(myInput) || { steer: 0, gas: 0, brake: 0 });
        for (const e of ev) if (SELF[e.type]) { e.who = me; out.push(e); if (o.onEvent) o.onEvent(e); }
      },
    });
    // correzione morbida del kart predetto verso lo stato dell'host (portato avanti di mezzo giro di rete)
    function correct() {
      if (!latest || !sg) return;
      const car = sg.cars[me], A = carOfSnap(latest, me);
      const dtf = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
      const rtt = (session.stats && session.stats.rtt) || link.rtt || 80;
      const lead = Math.min(0.25, rtt / 2000 + 1 / TICK * 2);
      const tgtS = A.s + A.v * Math.cos(A.psi - A.bet) * lead, es = tgtS - car.s, ed = A.d - car.d;
      err = { s: es, d: ed };
      // campi decisi dall'host (power-up, colpi, nuvoletta, arrivo)
      for (const f of ['it', 'ac', 'sh', 'boost', 'slow', 'mag', 'honey', 'slip', 'res', 'gh', 'fin', 'late', 'spr']) car[f] = A[f];
      if (A.spr && A.air > car.air) { car.air = A.air; car.airT = A.airT; }
      const snap = A.res > 0 || car.res > 0 || Math.abs(es) > 7 || Math.abs(ed) > 2.6 || sg.ready > 0;
      if (snap) { for (const f of ['s', 'd', 'psi', 'bet', 'v', 'pd', 'air', 'airT', 'mini', 'dr', 'off']) car[f] = A[f]; if (A.res <= 0) car.s = sg.ready > 0 ? A.s : tgtS; car.off = !!car.off; return; }
      const kk = 1 - Math.exp(-dtf * 6);
      car.s += es * kk; car.d += ed * kk; car.psi += (A.psi - car.psi) * kk; car.v += (A.v - car.v) * kk; car.bet += (A.bet - car.bet) * kk * 0.5;
    }
    session.on('event', (m) => {
      if (!m || !m.ry) return;
      if (m.ry === 'ev') { for (const e of m.l || []) { out.push(e); if (o.onEvent) o.onEvent(e); } return; }
      if (m.ry === 'fin' && sg) {
        sg.res = m.res; sg.ps = m.ps; sg.won = !!m.won; sg.pos = m.pos; sg.fin = m.t;
        for (const r of m.res) if (sg.cars[r.id]) sg.cars[r.id].fin = r.t;
      }
      if (o.onMsg) o.onMsg(m);
    });
    link.on('close', (why) => { if (closed) return; closed = true; if (o.onDrop) o.onDrop(why); });
    Object.assign(ctl, {
      session,
      race(state) { sg = state; sg.me = me; buf = []; latest = null; uc = 0; lastU = 0; paused = false; out.length = 0; },
      state: () => sg,
      error: () => err,
      dropped: () => closed,
      setInput(inp) { if (inp && inp.use && !lastU) uc++; lastU = inp && inp.use ? 1 : 0; session.setInput(wire(inp, uc)); },
      frame(t) { lastNow = now || t; now = t; session.frame(t); },
      take() { return out.splice(0, out.length); },
      pause(on) { paused = !!on; },
      send(m) { if (!closed) session.event(m); },
      start() { session.start(); },
      stop() { session.stop(); },
      close() { try { session.stop(); } catch (e) { /* già chiusa */ } closed = true; try { link.close(); } catch (e) { /* già chiuso */ } },
    });
    return ctl;
  }

  HH.rallyNet = { encode, decode, carOfSnap, host, guest, size, wire, unwire, TICK, SEND, CF };
})(typeof globalThis !== 'undefined' ? globalThis : window);
