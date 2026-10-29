// Multigiocatore: payload SDP compresso (fixture reali di Chromium), codici di riserva, QR locale, frutti di conferma,
// link in memoria e sessione host-autoritativa con latenza, jitter e perdite.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, load } from './_load.mjs';
import { rng } from './_channel.mjs';

const SLOW = process.env.CI ? 3 : 1;
const HH = load('src/net/sonic.js', 'src/net/qr.js', 'src/net/mp.js');
const M = HH.mp, Q = HH.qr;
const FIX = path.join(root, 'tests/fixtures/sdp');
const fixtures = fs.readdirSync(FIX).filter((f) => f.endsWith('.sdp')).map((f) => [f, fs.readFileSync(path.join(FIX, f), 'utf8')]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- SDP compresso ---------- */
test('payload: andata e ritorno con gli SDP veri di Chromium (impronta, credenziali, candidati)', () => {
  assert.ok(fixtures.length >= 5);
  for (const [name, sdp] of fixtures) {
    const type = name.includes('answer') ? 'answer' : 'offer';
    const p = M.parseSdp(sdp), b = M.pack(sdp, type, 'street'), x = M.unpack(b);
    assert.equal(x.type, type, name);
    assert.equal(x.game, M.gameTag('street'));
    assert.deepEqual(x.fp, p.fp, name);
    assert.equal(x.ufrag, p.ufrag, name); assert.equal(x.pwd, p.pwd, name);
    assert.equal(x.setup, type === 'offer' ? 'actpass' : 'active');
    // l'SDP ricostruito ridà lo stesso payload
    assert.deepEqual(Array.from(M.pack(x.sdp, type, 'street')), Array.from(b), name);
    const hostUdp = p.cands.filter((c) => !/^fe80/i.test(c.addr));
    assert.ok(x.cands.length >= 1 && x.cands.length <= hostUdp.length, name);
    for (const c of x.cands) assert.ok(hostUdp.some((h) => h.addr === c.addr && h.port === c.port), `${name}: ${c.addr}`);
  }
});

test('payload: con le credenziali ricavate dall\'impronta un\'offerta con un IPv4 sta in 40 byte', () => {
  const sdp = fixtures.find(([n]) => n === 'chromium-offer-host.sdp')[1];
  const m = M.mungeCreds(sdp), c = M.credsFrom(M.parseSdp(sdp).fp);
  assert.ok(c.ufrag.length >= 4 && c.pwd.length >= 22 && /^[A-Za-z0-9+/]+$/.test(c.ufrag + c.pwd), 'minimi ICE e caratteri ammessi');
  const b = M.pack(m, 'offer', 'street');
  assert.equal(b.length, 1 + 1 + 32 + 6);
  const x = M.unpack(b);
  assert.equal(x.ufrag, c.ufrag); assert.equal(x.pwd, c.pwd);
  assert.match(x.sdp, /a=candidate:1 1 udp \d+ 192\.0\.2\.2 \d+ typ host/);
  // mDNS (senza permesso del microfono): il nome .local viaggia in 16 byte
  const md = M.pack(M.mungeCreds(fixtures.find(([n]) => n === 'chromium-offer-mdns.sdp')[1]), 'offer', 'street');
  assert.equal(md.length, 34 + 19);
  assert.match(M.unpack(md).sdp, /[0-9a-f-]{36}\.local \d+ typ host/);
});

test('payload: Android tipico, si tengono solo gli IPv4 host UDP (niente TCP, srflx, link-local, doppioni)', () => {
  const sdp = fixtures.find(([n]) => n.startsWith('synthetic'))[1];
  const x = M.unpack(M.pack(sdp, 'offer', 'rally'));
  assert.deepEqual(x.cands.map((c) => c.addr + ':' + c.port), ['192.168.1.37:50123', '10.42.0.1:42876']);
  assert.equal(x.game, M.gameTag('rally'));
});

test('codice testuale e QR: andata e ritorno, errori riconosciuti', () => {
  const b = M.pack(M.mungeCreds(fixtures[0][1]), 'answer', 'street');
  const code = M.toCode(b);
  assert.match(code, /^HH[A-Za-z0-9_-]+$/);
  assert.deepEqual(Array.from(M.fromCode('  ' + code.slice(0, 20) + '\n' + code.slice(20) + ' ')), Array.from(b));
  const bad = code.slice(0, 10) + (code[10] === 'A' ? 'B' : 'A') + code.slice(11);
  assert.throws(() => M.fromCode(bad));
  const q = M.toQr(b);
  assert.match(q, /^HH:[0-9A-Z $%*+\-./:]+$/);
  assert.deepEqual(Array.from(M.fromQr(q)), Array.from(b));
  assert.throws(() => M.fromQr('https://example.com'));
});

/* ---------- QR ---------- */
// disegna un QR in RGBA con scala, rotazione, prospettiva, rumore e luce non uniforme
function raster(code, o = {}) {
  const sc = o.scale || 5, mg = 4, n = (code.size + 2 * mg) * sc, W = Math.round(n * 1.5), data = new Uint8ClampedArray(W * W * 4);
  const r = rng(o.seed || 3), cs = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0), c = W / 2, pg = o.persp || 0;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const w = 1 + pg * (x - c) / W, dx = (x - c) * w, dy = (y - c) * w;
    const u = cs * dx + sn * dy + n / 2, v = -sn * dx + cs * dy + n / 2;
    const mx = Math.floor(u / sc) - mg, my = Math.floor(v / sc) - mg;
    let val = 230 - 50 * (x / W);
    if (mx >= 0 && my >= 0 && mx < code.size && my < code.size && code.modules[my * code.size + mx]) val = 40 + 20 * (y / W);
    val += (r() - 0.5) * 2 * (o.noise || 0);
    const i = (y * W + x) * 4;
    data[i] = val; data[i + 1] = val * 0.95; data[i + 2] = val * 1.02; data[i + 3] = 255;
  }
  return { data, width: W, height: W };
}

test('QR: il decoder locale legge i QR del generatore (rumore, rotazione, prospettiva leggera)', () => {
  const payload = M.toQr(M.pack(M.mungeCreds(fixtures.find(([n]) => n === 'chromium-offer-host.sdp')[1]), 'offer', 'street'));
  const texts = [payload, 'HELLO HARI', 'Ciao Hari! 🍓 ünïcode', 'x'.repeat(120)];
  const cases = [{}, { rot: 0.18, noise: 40 }, { rot: -0.4, noise: 60, scale: 4 }, { rot: Math.PI / 2 + 0.1, noise: 30 }, { rot: Math.PI, scale: 3 }, { persp: 0.12, rot: 0.05, noise: 25 }];
  let ok = 0, n = 0, ms = 0;
  for (const t of texts) {
    const code = Q.encode(t);
    assert.ok(code.version <= 10);
    for (const c of cases) {
      n++;
      const img = raster(code, c), t0 = performance.now(), r = Q.decode(img);
      ms += performance.now() - t0;
      if (r && r.text === t) ok++;
      else assert.fail(`${t.slice(0, 10)} ${JSON.stringify(c)} → ${r && r.text}`);
    }
  }
  assert.equal(ok, n);
  assert.ok(ms / n < 150 * SLOW, `decodifica lenta: ${(ms / n).toFixed(0)} ms`);
  // l'offerta tipica entra in un QR versione ≤ 4 (33×33 moduli)
  assert.ok(Q.encode(payload).version <= 4, 'QR piccolo');
});

test('QR: tutti i livelli di correzione, modo byte e alfanumerico, nessun falso positivo sul rumore', () => {
  for (const ecl of ['L', 'M', 'Q', 'H']) for (const t of ['HH:12345', 'mixed Case text 42']) {
    const r = Q.decode(raster(Q.encode(t, { ecl }), { noise: 20 }));
    assert.equal(r && r.text, t, ecl + ' ' + t);
  }
  const W = 300, data = new Uint8ClampedArray(W * W * 4), rr = rng(9);
  for (let i = 0; i < data.length; i++) data[i] = (i & 3) === 3 ? 255 : rr() * 255;
  assert.equal(Q.decode({ data, width: W, height: W }), null);
  assert.deepEqual(Array.from(Q.base45.decode(Q.base45.encode([0, 1, 255, 254, 7]))), [0, 1, 255, 254, 7]);
  assert.equal(Q.base45.encode(Array.from('AB', (c) => c.charCodeAt(0))), 'BB8', 'vettore RFC 9285');
});

test('QR: una macchia sul codice viene corretta da Reed-Solomon', () => {
  const t = 'HH:' + 'ABCDEFGH1234'.repeat(4), code = Q.encode(t, { ecl: 'M' });
  const img = raster(code, { scale: 6 });
  // macchia bianca di 3×3 moduli in mezzo ai dati
  const W = img.width, off = Math.round((W - (code.size + 8) * 6) / 2) + (4 + Math.floor(code.size / 2)) * 6;
  for (let y = off; y < off + 18; y++) for (let x = off - 30; x < off - 12; x++) { const i = (y * W + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 230; }
  assert.equal(Q.decode(img).text, t);
});

/* ---------- frutti ---------- */
test('frutti di conferma: uguali sui due telefoni, dipendono da entrambe le impronte', async () => {
  const a = M.parseSdp(fixtures[0][1]).fp, b = M.parseSdp(fixtures[1][1]).fp, c = M.parseSdp(fixtures[2][1]).fp;
  const ab = await M.sas(a, b), ba = await M.sas(b, a), ac = await M.sas(a, c);
  assert.equal(ab.length, 4);
  assert.deepEqual(ab, ba);
  for (const f of ab) assert.ok(M.FRUITS.includes(f));
  assert.notDeepEqual(ab, ac);
  assert.equal(new Set(M.FRUITS).size, 16);
});

/* ---------- link e sessione su loopback ---------- */
test('link in memoria: messaggi affidabili in ordine, rtt, saluto, canali separati, chiusura propagata', async () => {
  const [h, g] = M.loopback({ latency: 30, jitter: 20, loss: 0.3, seed: 5, host: { name: 'Hari', avatar: 'hedgehog' }, guest: { name: 'Momo', avatar: 'bunny' } });
  const got = [], side = [];
  g.on('message', (m) => got.push(m.n));
  g.channel('x').on((m) => side.push(m));
  for (let i = 0; i < 50; i++) h.send({ n: i });
  h.channel('x').send({ s: 1 });
  await wait(1300 * SLOW);
  assert.deepEqual(got, [...Array(50).keys()], 'affidabili: tutti, una volta, in ordine');
  assert.deepEqual(side, [{ s: 1 }]);
  assert.equal(h.peer.name, 'Momo'); assert.equal(g.peer.avatar, 'hedgehog');
  assert.ok(h.rtt > 20 && h.rtt < 200, 'rtt ' + h.rtt);
  const closed = [];
  g.on('close', (w) => closed.push(w));
  h.close();
  await wait(200 * SLOW);
  assert.deepEqual(closed, ['remote']);
  assert.equal(g.open, false); assert.equal(h.open, false);
  assert.equal(g.send({ late: 1 }), false);
});

test('conferma dei frutti: sì + sì risolve true, un no chiude il patto', async () => {
  const [h, g] = M.loopback({ latency: 10, jitter: 0 });
  const [a, b] = await Promise.all([h.confirm(true), g.confirm(true)]);
  assert.equal(a && b, true);
  const [h2, g2] = M.loopback({ latency: 10, jitter: 0 });
  const [c, d] = await Promise.all([h2.confirm(true), g2.confirm(false)]);
  assert.equal(c, false); assert.equal(d, false);
  [h, g, h2, g2].forEach((l) => l.close());
});

// un piccolo gioco: due palline mosse dagli input + un contatore, l'host è l'autorità
function makeGame() {
  const s = { t: 0, p: [{ x: 0, y: 0 }, { x: 10, y: 0 }], hits: 0, log: [] };
  return {
    s,
    step(dt, inputs) {
      s.t++;
      inputs.forEach((inp, i) => {
        if (!inp) return;
        s.p[i].x += (inp.dx || 0) * dt * 60; s.p[i].y += (inp.dy || 0) * dt * 60;
        if (inp.a) s.hits++;
      });
      if (s.t % 15 === 0) s.log.push(s.t);
      if (s.log.length > 4) s.log.shift();
    },
    snapshot: () => ({ t: s.t, p: s.p.map((q) => ({ x: q.x, y: q.y })), hits: s.hits, log: s.log.slice() }),
  };
}
async function runPair(net, ms, script) {
  const [hl, gl] = M.loopback(net);
  const game = makeGame(), applied = [];
  const H = M.session(hl, { tick: 30, sendEvery: 2, step: game.step, snapshot: game.snapshot });
  const Gs = M.session(gl, { tick: 30, sendEvery: 2, apply: (snap, alpha, prev) => applied.push([snap.t, alpha, prev.t]) });
  H.start(); Gs.start();
  const t0 = performance.now();
  await new Promise((res) => {
    const iv = setInterval(() => {
      const t = performance.now();
      if (script) script(t - t0, H, Gs);
      H.frame(t); Gs.frame(t);
      if (t - t0 > ms) { clearInterval(iv); res(); }
    }, 8);
  });
  return { H, Gs, game, applied, hl, gl };
}

test('sessione: con latenza, jitter e 20 % di perdite l\'ospite converge allo stato dell\'host', async () => {
  const pressed = [];
  const { H, Gs, game, applied, hl, gl } = await runPair({ latency: 60, jitter: 30, loss: 0.2, seed: 11 }, 2400 * SLOW, (t, h, g) => {
    // l'ospite si muove e preme "a" ogni tanto; poi resta fermo
    if (t < 1200 * SLOW) {
      const a = Math.floor(t / 150) % 4 === 0;
      g.setInput({ dx: 1, dy: -0.5, a });
      if (a && !pressed.includes(Math.floor(t / 600))) pressed.push(Math.floor(t / 600));
    } else g.setInput({ dx: 0, dy: 0, a: false });
    h.setInput({ dx: -1, dy: 0 });
    if (t > 1600 * SLOW) h.setInput(null);
  });
  // a fermi, l'ultima istantanea dell'ospite è lo stato dell'host
  await wait(400 * SLOW);
  H.frame(performance.now()); Gs.frame(performance.now());
  const last = Gs.latest;
  assert.ok(last, 'istantanee ricevute');
  const hostNow = M.quant(game.snapshot());
  assert.deepEqual({ p: last.p, hits: last.hits }, { p: hostNow.p, hits: hostNow.hits }, 'stessa posizione e stessi colpi');
  assert.ok(game.s.p[1].x > 10 + 20, 'l\'host ha usato gli input dell\'ospite');
  assert.ok(game.s.hits > 0, 'le pressioni brevi non si perdono tutte');
  assert.ok(H.stats.delta > H.stats.full, 'per lo più delta: ' + JSON.stringify(H.stats));
  assert.ok(Gs.stats.lost > 0, 'le perdite si vedono nelle statistiche');
  // interpolazione: alpha in 0..1, istantanee in ordine non decrescente
  assert.ok(applied.length > 50);
  for (const [t, a, p] of applied) { assert.ok(a >= 0 && a <= 1); assert.ok(p <= t); }
  for (let i = 1; i < applied.length; i++) assert.ok(applied[i][2] >= applied[i - 1][2] - 2, 'il tempo di disegno non torna indietro (oltre il jitter)');
  hl.close(); gl.close();
});

test('sessione: eventi affidabili una volta sola e in ordine, nei due sensi; la chiusura arriva alla sessione', async () => {
  const toGuest = [], toHost = [], closes = [];
  let sentH = 0, sentG = 0;
  const { H, Gs, hl } = await runPair({ latency: 50, jitter: 40, loss: 0.25, seed: 3 }, 1500 * SLOW, (t, h, g) => {
    if (!h.__wired) {
      h.__wired = 1;
      g.on('event', (e, info) => { toGuest.push(e.n); assert.ok(info && typeof info.tick === 'number'); });
      h.on('event', (e) => toHost.push(e.n));
      g.on('close', (w) => closes.push(w));
    }
    if (sentH < 40 && Math.random() < 0.4) h.event({ type: 'score', n: sentH++ });
    if (sentG < 15 && Math.random() < 0.2) g.event({ type: 'pause', n: sentG++ });
  });
  await wait(600 * SLOW);
  assert.deepEqual(toGuest, [...Array(sentH).keys()]);
  assert.deepEqual(toHost, [...Array(sentG).keys()]);
  hl.close();
  await wait(250 * SLOW);
  assert.deepEqual(closes, ['remote']);
  assert.equal(Gs.running, false);
  assert.equal(H.running, false);
});

test('sessione: se l\'altro sparisce senza salutare il link si chiude per "lost"', async () => {
  const [h, g] = M.loopback({ latency: 10, jitter: 0, loss: 1 });
  h.timeout = 1500; g.timeout = 1500;
  const why = [];
  h.on('close', (w) => why.push(w));
  // perdite al 100 % solo sul non affidabile: il ping non torna mai, ma il link affidabile tace → lost
  await wait(3200);
  assert.deepEqual(why, ['lost']);
  g.close();
});

test('delta strutturali e interpolazione', () => {
  const a = { x: 1, arr: [1, 2, 3], o: { k: 'a', z: 1 }, gone: 1 }, b = { x: 1.5, arr: [1, 5], o: { k: 'b', z: 1 }, add: [1] };
  assert.deepEqual(M.patch(a, M.diff(a, b)), b);
  assert.equal(M.diff(b, M.quant(b)), undefined);
  assert.deepEqual(M.lerp({ x: 0, p: [0, 10], s: 'a' }, { x: 10, p: [10, 20], s: 'b' }, 0.25), { x: 2.5, p: [2.5, 12.5], s: 'b' });
});

test('sessione stile street: tick 60, sendEvery 3, istantanee da ~6 KB con 15 % di perdite', async () => {
  const [hl, gl] = M.loopback({ latency: 40, jitter: 20, loss: 0.15, seed: 21 });
  // 60 nemici con posizione, vita e stato: ~6 KB di JSON, di cui pochi campi cambiano a ogni tick
  const st = { t: 0, e: Array.from({ length: 60 }, (_, i) => ({ id: i, x: i * 13.25, y: 200 + i, hp: 10, st: 'walk', anim: 'idle_' + i, name: 'nemico-dolce-' + i })) };
  const H = M.session(hl, { tick: 60, sendEvery: 3, step: (dt, inp) => { if (inp[1] && inp[1].x) { st.t++; for (const e of st.e.slice(0, 6)) e.x += dt * 30; } }, snapshot: () => st });
  const Gs = M.session(gl, { tick: 60, sendEvery: 3, apply: () => {} });
  assert.ok(JSON.stringify(st).length > 5000);
  H.start(); Gs.start();
  const t0 = performance.now();
  await new Promise((res) => {
    const iv = setInterval(() => {
      const t = performance.now();
      Gs.setInput({ x: t - t0 < 1200 * SLOW ? 1 : 0 });
      H.frame(t); Gs.frame(t);
      if (t - t0 > 1900 * SLOW) { clearInterval(iv); res(); }
    }, 8);
  });
  assert.ok(st.t > 20, 'l\'host ha simulato');
  assert.deepEqual(Gs.latest, M.quant(st), 'l\'ospite ha lo stesso stato dell\'host');
  const avg = H.stats.bytes / (H.stats.full + H.stats.delta);
  assert.ok(avg < 1500, `i delta tengono piccole le istantanee: media ${avg.toFixed(0)} B, max ${H.stats.maxBytes} B`);
  hl.close(); gl.close();
});
