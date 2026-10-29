// Hari Rally a due giocatori: logica con 2 umani, host e ospite in rete (stub di HH.mp con latenza, jitter e perdite).
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
import { botKit } from './_rally-bot.mjs';
import { loadStub, virtualClock } from './_mp-stub.mjs';

// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;
const HH = load('src/core/rng.js', 'src/games/rally-logic.js', 'src/games/rally-net.js');
loadStub();
const R = HH.rally, NET = HH.rallyNet;
const { makeBot, DT } = botKit(HH);
const two = (level, seed, p2 = 'kitty') => R.newLevel(level, null, { humans: 2, p2, seed });
const SLOWBOT = { react: 0.45, grip: 6.5, wobble: 0.35 };
const NOBRAKE = { grip: 999 };
function race(s, o0 = {}, o1 = {}, maxT = 700) {
  const b0 = makeBot(s, Object.assign({ seed: 1 }, o0)), b1 = makeBot(s, Object.assign({ seed: 2, id: 1 }, o1)), ev = [];
  while (!R.isOver(s) && s.t < maxT) ev.push(...R.step(s, DT, [b0(), b1()]));
  return ev;
}

/* oracolo nel mondo indipendente da R.pose (come in rally.test.mjs): centro e direzione dai punti della pista */
function wpose(g, c) {
  const i = Math.max(1, Math.min(g.N - 2, Math.floor(c.s))), u = c.s - i;
  const tan = (j) => Math.atan2(g.y[j + 1] - g.y[j - 1], g.x[j + 1] - g.x[j - 1]);
  let t0 = tan(i), t1 = tan(i + 1);
  if (t1 - t0 > Math.PI) t1 -= 2 * Math.PI; else if (t0 - t1 > Math.PI) t1 += 2 * Math.PI;
  const th = t0 + (t1 - t0) * u, x = g.x[i] + (g.x[i + 1] - g.x[i]) * u, y = g.y[i] + (g.y[i + 1] - g.y[i]) * u;
  return { x: x - Math.sin(th) * c.d, y: y + Math.cos(th) * c.d, h: th + c.psi };
}
function cornersW(P) {
  const ca = Math.cos(P.h), sa = Math.sin(P.h), hl = R.CAR_L / 2, hw = R.CAR_W / 2;
  return [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([a, b]) => [P.x + a * ca - b * sa, P.y + a * sa + b * ca]);
}
function sepW(pa, pb) {
  let best = Infinity;
  for (const poly of [pa, pb]) for (let i = 0; i < 4; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 4], nx = y1 - y2, ny = x2 - x1, l = Math.hypot(nx, ny);
    const pr = (p) => p.map(([x, y]) => (x * nx + y * ny) / l);
    const a = pr(pa), b = pr(pb);
    const ov = Math.min(Math.max(...a), Math.max(...b)) - Math.max(Math.min(...a), Math.min(...b));
    if (ov <= 0) return 0;
    best = Math.min(best, ov);
  }
  return best;
}

test('a due: Hari + il secondo giocatore (kart a scelta, anche la Micia sul kart-mela) + 2 avversari, umani in fondo alla griglia', () => {
  for (const p2 of ['kitty', 'bunny', 'fox', 'panda']) {
    const s = two(3, 99, p2);
    assert.deepEqual(s.hu, [0, 1]);
    assert.equal(s.cars.length, 4);
    assert.equal(s.who[0], 'hari'); assert.equal(s.who[1], p2);
    assert.equal(new Set(s.who).size, 4, 'personaggi diversi');
    assert.ok(!s.who.slice(2).includes(p2), 'chi sceglie un animaletto lo toglie dagli avversari');
    assert.equal(R.KART[s.who[1]], { kitty: 'apple', bunny: 'peach', fox: 'mand', panda: 'melon' }[p2]);
    const c = R.config(3);
    assert.deepEqual(s.cars.slice(2).map((x) => x.skill), [c.ai[0], c.ai[1]], 'avversari con le due bravure più morbide');
    assert.ok(s.cars[0].s < s.cars[2].s && s.cars[1].s < s.cars[3].s, 'gli umani partono dietro');
    assert.deepEqual(s.ps, [s.rank.indexOf(0) + 1, s.rank.indexOf(1) + 1]);
  }
  // lo stesso seme dà la stessa gara (in rete si manda solo il seme)
  assert.equal(JSON.stringify(two(5, 4242)), JSON.stringify(two(5, 4242)));
  assert.notEqual(JSON.stringify(two(5, 4242)), JSON.stringify(two(5, 4243)));
  // il singolo non cambia: niente campi nuovi nello stato
  const s1 = R.newLevel(5, HH.rng(3));
  assert.ok(!('hu' in s1) && !('who' in s1) && !('ps' in s1) && s1.cars.every((c) => !('hm' in c)));
  assert.equal(R.toAI(s1, 0), false);
});

test('logica a due deterministica (anche ripresa da JSON a metà gara) e input in coda come in singolo', () => {
  const play = (s, until) => { const b0 = makeBot(s, { seed: 5 }), b1 = makeBot(s, { seed: 6, id: 1 }); while (!R.isOver(s) && s.t < until) R.step(s, DT, [b0(), b1()]); return s; };
  const a = play(two(6, 777), 1e9), b = play(two(6, 777), 1e9);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  // a metà gara: lo stato JSON riparte identico
  const m = play(two(4, 31), 40), copy = JSON.parse(JSON.stringify(m));
  const go = (s) => { const out = []; for (let i = 0; i < 600; i++) out.push(...R.step(s, DT, [{ steer: 0.1, gas: 1 }, { steer: -0.1, gas: 1, use: i === 30 ? 1 : 0 }])); return out; };
  assert.equal(JSON.stringify(go(m)), JSON.stringify(go(copy)));
  assert.equal(JSON.stringify(m), JSON.stringify(copy));
  // input null per il secondo = fermo (niente acceleratore automatico), il primo con gas: va avanti solo lui
  const s = two(2, 8); s.ready = 0; s.cd = 0;
  const s0 = s.cars[0].s, s1 = s.cars[1].s;
  for (let i = 0; i < 240; i++) R.step(s, DT, [{ steer: 0, gas: 1, brake: 0 }, null]);
  assert.ok(s.cars[0].s - s0 > 10 && Math.abs(s.cars[1].s - s1) < 0.05, `fatti ${(s.cars[0].s - s0).toFixed(2)} e ${(s.cars[1].s - s1).toFixed(2)} m`);
  // il tasto del power-up dell'ospite resta in coda finché un passo fisso lo usa
  s.cars[1].it = R.ITEMS.indexOf('bubble');
  R.step(s, DT * 0.3, [{ gas: 1 }, { gas: 1, use: 1 }]);
  R.step(s, DT * 0.8, [{ gas: 1 }, { gas: 1, use: 0 }]);
  assert.equal(s.cars[1].it, 0); assert.ok(s.cars[1].sh > 0);
});

test('il bot guida anche come secondo giocatore: finisce la gara, classifica completa, regola "si vince se uno dei due è primo"', () => {
  let wins = 0, p2first = 0, races = 0;
  for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]) for (const [o0, o1] of [[{}, {}], [SLOWBOT, {}], [{}, SLOWBOT]]) {
    const s = two(level, level * 31 + races);
    const ev = race(s, o0, o1);
    races++;
    assert.ok(R.isOver(s), `L${level}: gara non finita`);
    assert.equal(s.res.length, 4);
    assert.deepEqual(s.res.map((r) => r.id).sort(), [0, 1, 2, 3]);
    for (let j = 1; j < 4; j++) assert.ok(s.res[j].t >= s.res[j - 1].t);
    assert.deepEqual(s.ps, [0, 1].map((id) => s.res.findIndex((r) => r.id === id) + 1));
    assert.equal(s.won, s.ps.includes(1), 'vittoria se uno dei due umani arriva primo');
    assert.ok(s.cars[1].fin > 0 && s.cars[1].late !== 1, `L${level}: il bot P2 arriva da sé`);
    const fin = ev.find((e) => e.type === 'finish');
    assert.deepEqual(fin.ps, s.ps);
    assert.ok(ev.some((e) => e.type === 'call' && e.by === 1) && ev.some((e) => e.type === 'check' && e.by === 1), 'note e checkpoint anche per P2');
    if (s.won) wins++;
    if (s.ps[1] === 1) p2first++;
    // fragoline per ciascuno (s.me = il giocatore di quel telefono), sullo schermo diviso il migliore
    const f0 = R.rate(Object.assign({}, s, { me: 0 })), f1 = R.rate(Object.assign({}, s, { me: 1 }));
    assert.equal(f0, Math.max(0, 4 - s.ps[0])); assert.equal(f1, Math.max(0, 4 - s.ps[1]));
    assert.equal(R.rate(s), Math.max(f0, f1));
  }
  assert.ok(wins >= races * 0.5, `vittorie di squadra ${wins}/${races}`);
  assert.ok(p2first >= 3, `il bot come P2 è arrivato primo ${p2first} volte`);
});

test('a due: chi resta fermo viene classificato 40 s dopo l\'arrivo dell\'altro, a tempo stimato', () => {
  const s = two(1, 5);
  const b0 = makeBot(s, { seed: 3 });
  let first = -1;
  while (!R.isOver(s) && s.t < 400) { R.step(s, DT, [b0(), { steer: 0, gas: 0, brake: 0 }]); if (first < 0 && s.cars[0].fin >= 0) first = s.t; }
  assert.ok(R.isOver(s));
  assert.ok(s.fin - first > R.LATE - 0.1 && s.fin - first < R.LATE + 0.2, `fine ${s.fin} dopo ${first}`);
  assert.equal(s.cars[1].late, 1);
  assert.equal(s.ps[1], 4);
  assert.ok(s.cars[1].fin > s.fin);
});

test('nessuna compenetrazione con due umani (anche tra loro), muri rispettati', () => {
  let ticks = 0, hh = 0, near = 0;
  for (const [o0, o1] of [[{}, {}], [NOBRAKE, {}], [SLOWBOT, NOBRAKE], [{ wobble: 0.6 }, { wobble: 0.6, react: 0.3 }]]) for (const level of [2, 4, 6, 9, 11]) {
    const s = two(level, level * 13 + ticks % 7), g = R.geo(s);
    const b0 = makeBot(s, Object.assign({ seed: level }, o0)), b1 = makeBot(s, Object.assign({ seed: level + 50, id: 1 }, o1));
    while (!R.isOver(s) && s.t < 500) {
      const ev = R.step(s, DT, [b0(), b1()]);
      if (ev.some((e) => e.type === 'bump' && ((e.a === 0 && e.b === 1) || (e.a === 1 && e.b === 0)))) hh++;
      const W = s.cars.map((c) => wpose(g, c));
      for (let a = 0; a < 4; a++) {
        const A = s.cars[a];
        if (A.fin >= 0 || A.res > 0) continue;
        for (const sg of [1, -1]) {
          const sd = R.sideAt(g, A.s, sg), over = sg * A.d + R.extent(A.psi) - sd.lim;
          assert.ok(over <= (sd.hard ? 1e-6 : 0.4), `L${level}: auto ${A.id} oltre il bordo di ${over.toFixed(2)} m`);
        }
        for (let b = a + 1; b < 4; b++) {
          const B = s.cars[b];
          if (B.fin >= 0 || B.res > 0 || A.gh || B.gh || (A.spr && A.air > 0.2) || (B.spr && B.air > 0.2)) continue;
          if (Math.abs(A.s - B.s) < 8) near++;
          const dep = sepW(cornersW(W[a]), cornersW(W[b]));
          assert.ok(dep < 0.015, `L${level}: kart ${a} e ${b} compenetrati di ${dep.toFixed(3)} m`);
        }
      }
      ticks++;
    }
  }
  assert.ok(hh >= 5 && near > 3000, `spinte tra i due umani ${hh}, vicini ${near}`);
});

// una gara in rete con lo stub: host e ospite con due bot, orologio virtuale
function netRace({ latency = 60, jitter = 25, loss = 0.1, level = 4, seed = 4321, p2 = 'kitty', drop = -1, bots = [{}, {}] } = {}) {
  const clock = virtualClock();
  const [hl, gl] = HH.mp.loopback({ latency, jitter, loss, clock, seed: seed & 255 });
  const hostMsg = [], guestMsg = [], guestEv = [], drops = [];
  const H = NET.host(hl, { onMsg: (m) => hostMsg.push(m), onDrop: () => drops.push('host') });
  const Gc = NET.guest(gl, { onMsg: (m) => guestMsg.push(m), onEvent: (e) => guestEv.push(e), onDrop: () => drops.push('guest') });
  H.start(); Gc.start();
  // lobby: l'ospite sceglie il kart, l'host manda il seme
  Gc.send({ ry: 'hello', p2 });
  clock.advance(300);
  const hello = hostMsg.find((m) => m.ry === 'hello');
  assert.ok(hello, 'hello arrivato');
  H.send({ ry: 'start', level, seed, p2: hello.p2 });
  clock.advance(300);
  const st = guestMsg.find((m) => m.ry === 'start');
  assert.ok(st, 'start arrivato');
  const s = R.newLevel(level, null, { humans: 2, p2, seed }), sg = R.newLevel(st.level, null, { humans: 2, p2: st.p2, seed: st.seed });
  assert.equal(JSON.stringify(s), JSON.stringify(sg), 'stessa gara dal seme');
  H.race(s); Gc.race(sg);
  const b0 = makeBot(s, Object.assign({ seed: 1 }, bots[0])), b1 = makeBot(sg, Object.assign({ seed: 2, id: 1 }, bots[1]));
  const hist = [], err = [], other = [], sizes = [];
  const send = hl.send;
  hl.send = (m, o) => { if (m && m._mp === 'sn') sizes.push(JSON.stringify(m.d).length); return send(m, o); };
  let t = 1000;
  while (!R.isOver(s) && t < 500000) {
    t += 1000 / 60;
    H.setInput(b0()); Gc.setInput(b1());
    clock.advance(1000 / 60);
    H.frame(t); Gc.frame(t);
    if (drop > 0 && s.t > drop && !hl._dropped) { hl._dropped = 1; hl.drop(); }
    hist.push({ t, cars: s.cars.map((c) => ({ s: c.s, d: c.d })) });
    if (s.t > 4 && sg.t > 4 && !Gc.dropped()) {
      err.push(Math.hypot(sg.cars[1].s - s.cars[1].s, sg.cars[1].d - s.cars[1].d));
      // gli altri kart: lo stato mostrato dall'ospite è quello dell'host di poco prima (ritardo di interpolazione)
      let best = Infinity, lag = 0;
      for (let j = hist.length - 1; j >= Math.max(0, hist.length - 30); j--) {
        const h = hist[j].cars, e = Math.max(...[0, 2, 3].map((i) => Math.hypot(h[i].s - sg.cars[i].s, h[i].d - sg.cars[i].d)));
        if (e < best) { best = e; lag = t - hist[j].t; }
      }
      other.push({ e: best, lag });
    }
  }
  for (let i = 0; i < 60; i++) { t += 1000 / 60; clock.advance(1000 / 60); H.frame(t); Gc.frame(t); }
  return { s, sg, H, Gc, err, other, sizes, guestMsg, guestEv, drops, hl, gl };
}

test('in rete (stub con latenza 60 ms, jitter 25 ms, 10% di perdite): l\'ospite converge e riceve classifica ed eventi', () => {
  for (const cfg of [{}, { latency: 25, jitter: 5, loss: 0, level: 2, seed: 77 }, { latency: 110, jitter: 40, loss: 0.2, level: 7, seed: 91, p2: 'panda' }]) {
    const { s, sg, err, other, guestMsg, guestEv, sizes } = netRace(cfg);
    const tag = JSON.stringify(cfg);
    assert.ok(R.isOver(s), tag);
    // il proprio kart (predetto + correzione morbida) resta vicino a quello dell'host
    const mean = err.reduce((a, b) => a + b, 0) / err.length, mx = Math.max(...err);
    assert.ok(mean < 1.2 && mx < 7.5, `${tag}: errore del kart dell'ospite medio ${mean.toFixed(2)} m, massimo ${mx.toFixed(2)} m`);
    // gli altri: lo stato dell'host di 60–400 ms prima, entro pochi decimetri
    other.sort((a, b) => a.e - b.e);
    const med = other[other.length >> 1], p95 = other[Math.floor(other.length * 0.95)];
    assert.ok(med.e < 0.35 && p95.e < 1.2, `${tag}: avversari a ${med.e.toFixed(2)} m (95° ${p95.e.toFixed(2)} m)`);
    const lags = other.map((o) => o.lag).sort((a, b) => a - b), lag = lags[lags.length >> 1];
    assert.ok(lag >= 60 && lag <= 420, `${tag}: ritardo mediano ${lag.toFixed(0)} ms`);
    // eventi affidabili: classifica finale identica, power-up e note dell'ospite
    const fin = guestMsg.find((m) => m.ry === 'fin');
    assert.ok(fin, `${tag}: fine gara`);
    assert.deepEqual(sg.res, s.res); assert.deepEqual(sg.ps, s.ps); assert.equal(sg.won, s.won);
    assert.ok(R.isOver(sg));
    assert.ok(guestEv.some((e) => e.type === 'call' && e.by === 1), `${tag}: note dell'ospite`);
    assert.ok(guestEv.some((e) => e.type === 'count') && guestEv.some((e) => e.type === 'go'), `${tag}: semaforo`);
    assert.ok(sizes.length > 200);
  }
});

test('istantanee compatte: sotto 1 KB per invio anche con tanti oggetti in pista', () => {
  let all = [];
  for (const cfg of [{ level: 3, seed: 5 }, { level: 9, seed: 6, latency: 30, loss: 0 }, { level: 12, seed: 7 }]) {
    const { sizes } = netRace(cfg);
    all = all.concat(sizes);
  }
  // caso peggiore: 10 bucce/pozze, 8 nuvolette e tante scatole prese, numeri lunghi
  const s = two(11, 3); s.t = 123.456789;
  for (let i = 0; i < R.PU.maxHaz; i++) s.hz.push({ k: i % 2 ? 'h' : 'b', s: 1234.56789 + i, d: -3.21987, t: 140.12345, by: i % 4, n: 1000 + i });
  for (let i = 0; i < 8; i++) s.cl.push({ s: 2222.2222 + i, d: 1.11111, to: i % 4, by: (i + 1) % 4, t: 130.333, life: 1.234567 });
  for (let i = 0; i < 12; i++) s.bx.push([i, 124.98765]);
  for (const c of s.cars) Object.assign(c, { s: 3456.789, d: -4.4444, psi: 0.123456, bet: -0.33333, v: 28.88888, pd: 1.23456, air: 0.4444, airT: 0.9555, spr: 1, slip: 0.777, boost: 1.333, mini: 0.5555, slow: 2.111, honey: 1, res: 0.888, sh: 8.888, mag: 6.666, it: 5, ac: 12, fin: 189.123456, off: true, dr: 1.4444, kc: -0.0123456, gh: 1, stuck: 1.4, late: 1 });
  s.ag = 'f'.repeat(60);
  const worst = NET.size(NET.encode(s, 99999, true));
  all.sort((a, b) => a - b);
  assert.ok(all[all.length - 1] < 1024 && all[all.length >> 1] < 600, `istantanee: mediana ${all[all.length >> 1]} B, massimo ${all[all.length - 1]} B`);
  assert.ok(worst < 1500, `caso peggiore costruito ${worst} B`);
  // la decodifica ricostruisce lo stato (arrotondato al centimetro)
  const sg = two(11, 3), snap = NET.encode(s, 1, true);
  NET.decode(sg, null, JSON.parse(JSON.stringify(snap)), 1, -1);
  assert.equal(sg.hz.length, R.PU.maxHaz); assert.equal(sg.cl.length, 8); assert.equal(sg.ag, s.ag);
  for (let i = 0; i < 4; i++) { assert.ok(Math.abs(sg.cars[i].s - s.cars[i].s) < 0.006); assert.equal(sg.cars[i].it, 5); assert.equal(sg.cars[i].off, true); }
});

test('link caduto a metà gara: il kart dell\'ospite diventa IA e l\'host finisce da solo; l\'ospite lo sa', () => {
  const { s, drops } = netRace({ drop: 30, level: 3, seed: 1234 });
  assert.ok(drops.includes('host') && drops.includes('guest'), `avvisi ${drops}`);
  assert.deepEqual(s.hu, [0]);
  assert.ok(!s.cars[1].hm);
  assert.ok(R.isOver(s));
  assert.ok(s.cars[1].fin > 0 && s.cars[1].fin < s.fin + 200, 'il kart passato all\'IA arriva');
  assert.equal(s.ps.length, 1);
  assert.equal(s.won, s.ps[0] <= 3, 'rimasto da solo: tra i primi 3 come in singolo');
});

test('tempi: un minuto a due umani < 150 ms (a regime), codifica e decodifica di un\'istantanea < 0,2 ms', () => {
  // tempo di CPU del processo (meno sensibile agli altri processi sulla stessa macchina del tempo da orologio), il
  // migliore di due giri dopo il riscaldamento del JIT (come dopo qualche secondo di gioco sul telefono)
  const minute = (level) => {
    const s = two(level, level);
    R.geo(s);
    const b0 = makeBot(s, { seed: 1 }), b1 = makeBot(s, { seed: 2, id: 1 });
    const c0 = process.cpuUsage();
    while (s.t < 60 && !R.isOver(s)) R.step(s, DT, [b0(), b1()]);
    const cu = process.cpuUsage(c0);
    return { ms: (cu.user + cu.system) / 1000, s };
  };
  for (const level of [3, 8, 12]) minute(level);
  for (const level of [3, 8, 12]) {
    const a = minute(level), b = minute(level), ms = Math.min(a.ms, b.ms), s = a.s;
    assert.ok(ms < 150 * SLOW, `livello ${level}: 1 minuto a due in ${ms.toFixed(0)} ms`);
    const sg = two(level, level);
    const c1 = process.cpuUsage();
    for (let i = 0; i < 500; i++) { const q = NET.encode(s, i, i % 15 === 0); NET.decode(sg, null, q, 1, 1); }
    const cu1 = process.cpuUsage(c1), per = (cu1.user + cu1.system) / 1000 / 500;
    assert.ok(per < 0.2 * SLOW, `istantanea ${per.toFixed(3)} ms`);
  }
});
