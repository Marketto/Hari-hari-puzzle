// Unit test Hari Taxi: un "bot autista" con tempi di reazione umani vince i livelli 1–12 su più semi senza perdere
// tutti i cuori; città sempre connessa (ogni fermata raggiungibile), tempi limite fattibili con margine (oracolo che prova
// tutti gli ordini di consegna), determinismo e ripresa da JSON, incidenti (cuore perso contro auto e pedone, nessuno
// contro i muri), curva di difficoltà monotona, tempi di generazione e di simulazione.
// Il bot e gli oracoli leggono solo lo stato pubblico (mappa, linee delle strade, veicoli, fermate) e rifanno da sé
// grafo degli incroci, percorsi e distanze: non chiamano le funzioni di percorso del gioco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
import { botKit } from './_drive-bot.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/drive-logic.js');
const D = HH.drive;
const DT = 1 / 60;
const { roadDist, tile, graph, makeBot, play, fresh } = botKit(HH);

/* ---------- test ---------- */
test('il bot (reazione ~0,22 s) vince i livelli 1–12 su 4 semi: tutti fino al 6, al massimo 2 sconfitte in tutto', () => {
  const stats = [];
  let lost = 0;
  for (let level = 1; level <= 12; level++) {
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 1000 + k);
      const ev = play(s, { seed: level * 7 + k });
      stats.push(`L${level}.${k} ${s.type} ${s.t.toFixed(0)}s ♥${3 - s.oops} (urti ${s.crashes}, tardi ${s.late})`);
      const msg = `livello ${level} seme ${k}: non vinto (${s.done}/${s.N}, cuori persi ${s.oops}: urti ${s.crashes}, scaduti ${s.late}, t=${s.t.toFixed(0)})`;
      if (!D.isWon(s)) { assert.ok(level > 6, msg); lost++; continue; }
      assert.equal(D.progress(s), 1);
      assert.equal(ev.filter((e) => e.type === 'drop').length, s.N);
      assert.ok(ev.filter((e) => e.type === 'pickup').length >= Math.ceil(s.N / s.batch));
    }
  }
  if (process.env.DRIVE_STATS) console.log(stats.join('\n'));
  assert.ok(lost <= 2, `${lost} sconfitte su 48`);
});

test('livello 1: facile e breve (tra 40 s e 2 minuti e mezzo per il bot), poco traffico, tempi larghi', () => {
  for (let k = 0; k < 5; k++) {
    const s = fresh(1, 70 + k);
    assert.ok(s.npcs.length <= 4 && s.peds.length <= 6);
    play(s, { seed: k });
    assert.ok(D.isWon(s) && s.oops <= 1, `seme ${k}: ${s.oops} cuori persi`);
    assert.ok(s.t > 40 && s.t < 150, `durata ${s.t.toFixed(1)} s`);
  }
});

test('anche un bot più lento (0,4 s) e distratto (non guarda i semafori) vince i primi livelli', () => {
  for (let level = 1; level <= 4; level++) {
    const s = fresh(level, 500 + level);
    play(s, { react: 0.4, careful: false, seed: level });
    assert.ok(D.isWon(s), `livello ${level}: ${s.done}/${s.N}, cuori persi ${s.oops}`);
  }
});

test('città sempre connessa: ogni fermata (ritiri, consegne, ristoranti, deposito) è raggiungibile dalla partenza', () => {
  for (let level = 1; level <= 16; level++) {
    for (let k = 0; k < 4; k++) {
      const s = D.newLevel(level, HH.rng(level * 31 + k));
      const f = roadDist(s, tile(s, s.car.x, s.car.y));
      assert.ok(f.has(tile(s, s.car.x, s.car.y)), `livello ${level}: partenza fuori strada`);
      const g = D.geo(s);
      for (const p of g.spots) assert.ok(f.has(tile(s, p.zx, p.zy)), `livello ${level}: fermata ${p.id} irraggiungibile`);
      // tutte le caselle di strada sono collegate
      const roads = [...s.map].filter((ch) => ch === '.').length;
      assert.equal(f.size, roads, `livello ${level}: strade scollegate`);
      // il bordo è chiuso: nessuna strada sul perimetro della mappa
      for (let x = 0; x < s.W; x++) assert.ok(s.map[x] !== '.' && s.map[(s.H - 1) * s.W + x] !== '.');
      if (s.type === 'food') assert.ok(s.rest.length >= 2);
      if (s.type === 'parcel') assert.ok(s.depot >= 0);
    }
  }
});

test('tempi limite fattibili con margine: esiste un ordine di consegna rispettato andando al 60% della velocità massima', () => {
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  for (let level = 1; level <= 16; level++) {
    for (let k = 0; k < 4; k++) {
      const s = D.newLevel(level, HH.rng(level * 57 + k));
      const V = D.VEH[s.veh], g = D.geo(s), v = V.vmax * 0.6;
      // anche le corse successive: si consegna "a teletrasporto" per generarne altre
      for (let trip = 0; trip < 4 && !D.isOver(s); trip++) {
        const tr = s.trip, p = g.spots[tr.p];
        const ok = perms(tr.items).some((order) => {
          let at = tile(s, p.zx, p.zy), time = 0;
          return order.every((it) => {
            const q = g.spots[it.d], d = roadDist(s, at).get(tile(s, q.zx, q.zy));
            time += d / v + 1.5; at = tile(s, q.zx, q.zy);
            return time <= it.lim;
          });
        });
        assert.ok(ok, `livello ${level} seme ${k} corsa ${trip}: tempi troppo stretti (${tr.items.map((i) => i.lim).join(', ')} s)`);
        assert.ok(tr.items.every((it) => it.lim >= 10), 'almeno 10 s per consegna');
        // consegna istantanea per passare alla corsa dopo
        s.car.x = p.zx; s.car.y = p.zy; s.car.v = 0; D.tick(s);
        for (const it of tr.items) { const q = g.spots[it.d]; s.car.x = q.zx; s.car.y = q.zy; s.car.v = 0; D.tick(s); }
      }
    }
  }
});

test('determinismo e ripresa da JSON: stessa partita con gli stessi comandi', () => {
  for (const level of [1, 5, 9]) {
    const a = fresh(level, 4242 + level), b = fresh(level, 4242 + level);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
    const botA = makeBot(a, { seed: 3 });
    let saved = null;
    const inputs = [];
    for (let f = 0; f < 60 * 50 && !D.isOver(a); f++) {
      const inp = botA.input(a.t);
      inputs.push(inp);
      D.step(a, DT, inp);
      if (f === 60 * 20) saved = JSON.stringify(a);
    }
    // ripresa: dallo stato salvato, stessi comandi → stesso stato finale
    const c = JSON.parse(saved);
    for (let f = 60 * 20 + 1; f < inputs.length; f++) D.step(c, DT, inputs[f]);
    assert.equal(JSON.stringify(c), JSON.stringify(a), `livello ${level}: la ripresa da JSON diverge`);
    // da zero, stessi comandi → stesso stato
    for (const inp of inputs) D.step(b, DT, inp);
    assert.equal(JSON.stringify(b), JSON.stringify(a));
  }
});

// mette Hari su un rettilineo lungo, diretto a est, senza traffico né pedoni
function lab(level = 4) {
  const s = fresh(level, 99);
  s.npcs = []; s.peds = [];
  const nodes = graph(s);
  let best = null;
  for (let n = 0; n < nodes.length; n++) {
    const m = nodes[n].nb[0];
    if (m < 0) continue;
    const len = nodes[m].x - nodes[n].x;
    if (!best || len > best.len) best = { n, m, len };
  }
  const A = nodes[best.n];
  Object.assign(s.car, { x: A.x + 1.6, y: A.y + 0.5, a: 0, v: 0, rev: false });
  s.trip = { id: 1, p: 0, st: 'ride', items: [{ id: 2, d: 0, lim: 999, t: 999, st: 1, who: 0 }] };
  return { s, A, B: nodes[best.m], len: best.len };
}
const gas = (s, secs, inp = { ax: 1, ay: 0 }) => { const ev = []; for (let f = 0; f < secs * 60; f++) ev.push(...D.step(s, DT, inp)); return ev; };

test('incidente con un\'auto: −1 cuore, l\'auto fa "bonk", poi invulnerabilità (nessun secondo cuore subito dopo)', () => {
  const { s, A } = lab();
  s.npcs.push({ id: 900, k: 'car', c: 0, n0: 0, d: 0, n1: 1, sg: 0, d2: 0, s: 0, len: 99, x: A.x + 5, y: A.y + 0.5, a: 0, v: 0, vm: 0, wait: 0, ghost: 0, bonk: 0, honk: 0 });
  // auto ferma davanti (non segue la corsia: velocità massima 0)
  s.npcs[0].bonk = 99;
  const ev = gas(s, 2.5);
  const crash = ev.filter((e) => e.type === 'crash');
  assert.equal(crash.length, 1, 'un solo incidente');
  assert.equal(crash[0].what, 'car');
  assert.equal(s.oops, 1);
  assert.ok(s.inv > 0 || ev.some((e) => e.type === 'bonk'));
  // piano piano contro un'auto: solo "bonk", nessun cuore
  const t = lab();
  t.s.npcs.push({ id: 901, k: 'bus', c: 0, n0: 0, d: 0, n1: 1, sg: 0, d2: 0, s: 0, len: 99, x: t.A.x + 3.4, y: t.A.y + 0.5, a: 0, v: 0, vm: 0, wait: 0, ghost: 0, bonk: 99, honk: 0 });
  gas(t.s, 3, { ax: 0.12 + 0.02, ay: 0 });
  assert.equal(t.s.oops, 0, 'a passo d\'uomo non è un incidente');
});

test('incidente con un pedone sulle strisce: −1 cuore, il pedone salta via spaventato (mai investito)', () => {
  const { s, A } = lab();
  const g = D.geo(s);
  s.peds.push({ id: 950, k: 0, b: 0, u: 0, dir: 1, sp: 0.01, st: 2, x: A.x + 4.5, y: A.y + 0.5, cr: { n: 0, ph: 1, x0: A.x + 4.5, y0: A.y - 1.4, x1: A.x + 4.5, y1: A.y + 2.4, b0: 0, b1: g.blocks.length - 1, q: 0.6 }, tt: 0, scared: 0 });
  const p = s.peds[0];
  let hop = false;
  const ev = [];
  for (let f = 0; f < 120; f++) { ev.push(...D.step(s, DT, { ax: 1, ay: 0 })); if (p.st === 3) hop = true; }
  const crash = ev.filter((e) => e.type === 'crash');
  assert.equal(crash.length, 1);
  assert.equal(crash[0].what, 'ped');
  assert.equal(s.oops, 1);
  assert.ok(hop, 'il pedone fa un salto per scansarsi');
  assert.ok(s.peds.includes(p), 'il pedone resta in gioco');
});

test('muri ed edifici: rimbalzo morbido senza perdere cuori, e il veicolo non entra mai negli isolati', () => {
  for (const level of [1, 2, 3]) {
    const { s } = lab(level);
    // dritto verso nord, contro l'isolato
    s.car.a = -Math.PI / 2;
    const ev = gas(s, 3, { steer: 0, gas: 1 });
    assert.equal(s.oops, 0);
    assert.ok(ev.some((e) => e.type === 'bump'), 'urto contro il muro segnalato');
    // poi a zig-zag per 20 s: mai dentro un isolato
    const r = HH.rng(level);
    for (let f = 0; f < 60 * 20; f++) {
      const inp = f % 40 === 0 ? { ax: r() * 2 - 1, ay: r() * 2 - 1 } : undefined;
      D.step(s, DT, inp);
      const P = D.VEH[s.veh];
      const tx = Math.floor(s.car.x), ty = Math.floor(s.car.y);
      assert.equal(s.map[ty * s.W + tx], '.', `livello ${level}: dentro un isolato a ${s.car.x.toFixed(2)},${s.car.y.toFixed(2)}`);
      void P;
    }
    assert.equal(s.oops, 0);
  }
});

test('consegna scaduta: costa un cuore (uno solo anche con più pacchi a bordo) e arriva subito un\'altra corsa', () => {
  for (const level of [1, 3]) {
    const s = fresh(level, 5);
    s.trip.st = 'ride'; s.trip.items.forEach((it) => { it.st = 1; it.t = 0.05; });
    if (level === 3) assert.ok(s.trip.items.length >= 2, 'furgone con più pacchi');
    const id = s.trip.id;
    const ev = gas(s, 0.2, null);
    assert.equal(ev.filter((e) => e.type === 'expire').length, 1);
    assert.equal(s.oops, 1);
    // nuova corsa (il furgone è già fermo al deposito: la ricarica subito)
    assert.ok(s.trip && s.trip.id !== id && s.trip.items.every((it) => it.st <= 1), 'nuova corsa');
    assert.equal(s.done, 0);
  }
});

test('il traffico si ferma col rosso e davanti a Hari; i pedoni attraversano solo col verde, sulle strisce', () => {
  const s = fresh(8, 77);
  const g = D.geo(s);
  // un'auto entra nell'incrocio (fine della corsia) solo col suo verde o al massimo durante il "tutto rosso"
  // (chi non poteva più frenare): mai mentre è verde per l'altra direzione
  let enterGreen = 0, enterWrong = 0, crossOk = 0, crossBad = 0;
  const was = new Map(s.npcs.map((v) => [v.id, v.sg]));
  for (let f = 0; f < 60 * 90; f++) {
    D.step(s, DT, null);
    for (const v of s.npcs) {
      if (was.get(v.id) === 0 && v.sg === 1 && g.nodes[v.n1].lit && !v.ghost) {
        const L = D.light(s, v.n1);
        if (L.ph === v.d % 2) enterGreen++; else if (L.ph === 1 - (v.d % 2)) enterWrong++;
      }
      was.set(v.id, v.sg);
    }
    for (const p of s.peds) if (p.st === 2 && p.cr.q < 0.02) { if (D.light(s, p.cr.n).ph === p.cr.ph) crossOk++; else crossBad++; }
  }
  assert.ok(enterGreen > 10 && enterWrong === 0, `auto: ${enterGreen} col verde, ${enterWrong} col verde degli altri`);
  assert.ok(crossOk > 0 && crossBad === 0, `pedoni: ${crossOk} col verde, ${crossBad} col rosso`);
  // Hari fermo in mezzo alla corsia: chi arriva da dietro si ferma (e suona), nessun incidente
  const t = lab();
  t.s.npcs.push({ id: 902, k: 'car', c: 0, n0: 0, d: 0, n1: 1, sg: 0, d2: 0, s: 0, len: 99, x: t.A.x - 3, y: t.A.y + 0.5, a: 0, v: 2.5, vm: 2.6, wait: 0, ghost: 0, bonk: 0, honk: 0 });
  // corsia finta: la logica di corsia la riposiziona, quindi controlla solo che non ci siano urti
  gas(t.s, 3, null);
  assert.equal(t.s.oops, 0);
});

test('curva di difficoltà monotona (≥ 4 gradini): città, traffico, pedoni, consegne crescono; tempi e margini calano', () => {
  let prev = null;
  const tiers = new Set();
  for (let L = 1; L <= 20; L++) {
    const c = D.config(L);
    tiers.add(c.tier);
    const area = (c.nbx * (c.bmin + c.bmax)) * (c.nby * (c.bmin + c.bmax));
    if (prev) {
      assert.ok(area >= prev.area, `città più piccola al livello ${L}`);
      assert.ok(c.cars >= prev.cars && c.peds >= prev.peds, `meno traffico al livello ${L}`);
      assert.ok(c.jobs >= prev.jobs, `meno consegne al livello ${L}`);
      assert.ok(c.slack <= prev.slack && c.base <= prev.base, `più tempo al livello ${L}`);
      assert.ok(c.dmax >= prev.dmax && c.closures >= prev.closures);
    }
    prev = { ...c, area };
  }
  assert.ok(tiers.size >= 4);
  assert.deepEqual([1, 2, 3].map((L) => D.config(L).type), ['taxi', 'food', 'parcel']);
  assert.deepEqual([1, 2, 3].map((L) => D.config(L).veh), ['taxi', 'scooter', 'van']);
});

test('generazione < 10 ms e simulazione leggera (1 minuto di gioco < 300 ms, cioè < 0,1 ms a fotogramma) anche nei livelli grandi', () => {
  for (const level of [1, 6, 12, 18]) {
    let ms = 0;
    for (let k = 0; k < 8; k++) { const t = performance.now(); D.newLevel(level, HH.rng(level * 13 + k)); ms += performance.now() - t; }
    assert.ok(ms / 8 < 10 * SLOW, `livello ${level}: generazione ${(ms / 8).toFixed(1)} ms`);
    const s = fresh(level, 3);
    const t = performance.now();
    gas(s, 60, null);
    const sim = performance.now() - t;
    assert.ok(sim < 300 * SLOW, `livello ${level}: 1 minuto simulato in ${sim.toFixed(0)} ms`);
  }
});

test('stato JSON puro, stelle e progresso', () => {
  const s = fresh(2, 8);
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(s))), JSON.stringify(s));
  assert.equal(D.progress(s), 0);
  s.oops = 0; assert.equal(D.rate(s), 3);
  s.oops = 1; assert.equal(D.rate(s), 2);
  s.oops = 2; assert.equal(D.rate(s), 1);
  assert.ok(D.par(s) > 30 && D.par(s) < 400);
});

/* ---------- mappe reali (OpenStreetMap): Ostia e Desenzano del Garda ---------- */
// Oracoli indipendenti dal gioco: le caselle percorribili si rifanno dal grafo pubblico della mappa (roadDist del bot,
// mezzerie larghe quanto la categoria), i percorsi li rifà il bot.
const MAPS = ['ostia', 'desenzano'];
for (const id of MAPS) load(`src/games/drive-map-${id}.js`);
const FILE_KB = 400;

test('mappe reali: file dati presenti, sotto il limite di dimensione e caricati in fretta', async () => {
  const fs = await import('node:fs');
  const { root } = await import('./_load.mjs');
  for (const id of MAPS) {
    const kb = fs.statSync(`${root}/src/games/drive-map-${id}.js`).size / 1024;
    assert.ok(kb < FILE_KB, `${id}: ${kb.toFixed(0)} KB`);
    const meta = HH.driveMapList && HH.driveMapList.find((m) => m.id === id);
    void meta;
    const md = D.mapData(id);
    assert.ok(md && md.W > 300 && md.H > 300 && md.edges.length > 500 && md.pois.length > 100, `${id}: dati decodificati`);
    assert.ok(D.buildings(md).length > 1000, `${id}: edifici`);
  }
  // registro delle mappe (anteprime per il selettore)
  load('src/games/drive-maps.js');
  assert.deepEqual(HH.driveMapList.map((m) => m.id), MAPS);
  for (const m of HH.driveMapList) assert.ok(m.preview && m.preview.w > 20 && m.file === `src/games/drive-map-${m.id}.js`);
});

test('mappe reali: geometria pronta in < 400 ms, nuovo livello in < 40 ms, simulazione leggera', () => {
  for (const id of MAPS) {
    let t = performance.now();
    D.newLevel(1, HH.rng(1), id);
    const first = performance.now() - t;
    assert.ok(first < 400 * SLOW, `${id}: prima generazione (decodifica + geometria) ${first.toFixed(0)} ms`);
    let ms = 0;
    for (let k = 0; k < 8; k++) { t = performance.now(); D.newLevel(1 + k, HH.rng(k), id); ms += performance.now() - t; }
    assert.ok(ms / 8 < 40 * SLOW, `${id}: nuovo livello ${(ms / 8).toFixed(1)} ms`);
    const s = fresh(10, 3, id);
    t = performance.now();
    gas(s, 60, null);
    const sim = performance.now() - t;
    assert.ok(sim < 400 * SLOW, `${id}: 1 minuto simulato in ${sim.toFixed(0)} ms`);
  }
});

test('mappe reali: rete stradale connessa, partenza e ogni fermata e luogo raggiungibili su strada', () => {
  for (const id of MAPS) {
    const s = fresh(1, 7, id), g = D.geo(s);
    const f = roadDist(s, tile(s, s.car.x, s.car.y));
    assert.ok(f.has(tile(s, s.car.x, s.car.y)), `${id}: partenza fuori strada`);
    // tutte le caselle carrabili del gioco (componente principale) stanno nella rete rifatta dal grafo
    let pass = 0, miss = 0;
    for (let i = 0; i < g.pass.length; i++) if (g.pass[i]) { pass++; if (!f.has(i)) miss++; }
    assert.ok(miss / pass < 0.01, `${id}: ${miss}/${pass} caselle di strada scollegate`);
    let bad = 0;
    for (const p of g.spots) if (!f.has(tile(s, p.zx, p.zy))) bad++;
    assert.equal(bad, 0, `${id}: ${bad} fermate irraggiungibili su ${g.spots.length}`);
    const named = D.mapData(id).pois.filter((p) => p.spot >= 0);
    assert.ok(named.length > 50, `${id}: luoghi con fermata`);
    for (const p of named) assert.ok(f.has(tile(s, g.spots[p.spot].zx, g.spots[p.spot].zy)), `${id}: ${p.name || p.k} irraggiungibile`);
    // luoghi notevoli richiesti
    const md = D.mapData(id), has = (k, re) => md.pois.some((p) => p.k === k && re.test(p.name));
    if (id === 'ostia') { assert.ok(has('pier', /pontile/i), 'Pontile di Ostia'); assert.ok(has('station', /lido centro/i), 'stazione Lido Centro'); assert.ok(md.pois.some((p) => p.k === 'beach')); }
    else { assert.ok(has('castle', /castello/i), 'Castello'); assert.ok(has('harbour', /porto vecchio/i), 'Porto Vecchio'); assert.ok(has('station', /desenzano/i), 'stazione'); }
    assert.ok(md.pois.some((p) => p.k === 'taxi') && md.pois.some((p) => p.k === 'depot') && md.pois.some((p) => p.k === 'gelato'), `${id}: taxi, deposito, gelaterie`);
  }
});

test('mappe reali: corse vicine a Hari e tempi limite fattibili al 60% della velocità massima', () => {
  for (const id of MAPS) for (let level = 1; level <= 9; level++) {
    const s = D.newLevel(level, HH.rng(level * 11), id), g = D.geo(s), V = D.VEH[s.veh], v = V.vmax * 0.6;
    for (let trip = 0; trip < 3 && !D.isOver(s); trip++) {
      const tr = s.trip, p = g.spots[tr.p];
      const fc = roadDist(s, tile(s, s.car.x, s.car.y)).get(tile(s, p.zx, p.zy));
      if (s.type === 'taxi') assert.ok(fc <= Math.max(16, D.config(level, id).dmax * 0.35) + 2, `${id} L${level}: passeggero lontano (${fc})`);
      let at = tile(s, p.zx, p.zy), time = 0;
      const order = tr.items.slice().sort((a, b) => roadDist(s, at).get(tile(s, g.spots[a.d].zx, g.spots[a.d].zy)) - roadDist(s, at).get(tile(s, g.spots[b.d].zx, g.spots[b.d].zy)));
      for (const it of order) { const q = g.spots[it.d], d = roadDist(s, at).get(tile(s, q.zx, q.zy)); time += d / v + 1.5; at = tile(s, q.zx, q.zy); }
      assert.ok(time <= tr.items[0].lim, `${id} L${level} corsa ${trip}: ${time.toFixed(0)} s > ${tr.items[0].lim} s`);
      s.car.x = p.zx; s.car.y = p.zy; s.car.v = 0; D.tick(s);
      for (const it of tr.items) { const q = g.spots[it.d]; s.car.x = q.zx; s.car.y = q.zy; s.car.v = 0; D.tick(s); }
    }
  }
});

test('mappe reali: il bot vince i livelli 1–6 di ogni mappa (2 semi), poco traffico fuori dalla bolla', () => {
  const out = [];
  for (const id of MAPS) for (let level = 1; level <= 6; level++) for (let k = 0; k < 2; k++) {
    const s = fresh(level, level * 1000 + k * 17, id);
    play(s, { seed: level * 3 + k, limit: 900 });
    out.push(`${id} L${level}.${k} ${s.t.toFixed(0)}s ♥${3 - s.oops}`);
    assert.ok(D.isWon(s), `${id} livello ${level} seme ${k}: ${s.done}/${s.N}, cuori persi ${s.oops} (urti ${s.crashes}, tardi ${s.late})`);
    assert.ok(s.t < 600, `${id} livello ${level}: troppo lungo (${s.t.toFixed(0)} s)`);
    // traffico e pedoni restano attorno a Hari
    assert.ok(s.npcs.every((v) => Math.hypot(v.x - s.car.x, v.y - s.car.y) < 40));
  }
  if (process.env.DRIVE_STATS) console.log(out.join('\n'));
});

test('mappe reali: traffico solo col verde, pedoni sulle strisce col loro verde, auto sempre su strada', () => {
  for (const id of MAPS) {
    const s = fresh(8, 21, id), g = D.geo(s);
    let enterGreen = 0, enterWrong = 0, crossBad = 0, off = 0;
    const was = new Map(s.npcs.map((v) => [v.id, v.sg]));
    for (let f = 0; f < 60 * 90; f++) {
      D.step(s, DT, null);
      for (const v of s.npcs) {
        if (was.get(v.id) === 0 && v.sg === 1 && g.nodes[v.n1].lit && !v.ghost) {
          const L = D.light(s, v.n1);
          if (L.ph === g.grp[v.d]) enterGreen++; else if (L.ph === 1 - g.grp[v.d]) enterWrong++;
        }
        was.set(v.id, v.sg);
        if (g.csolid[Math.floor(v.y * g.cs) * s.W * g.cs + Math.floor(v.x * g.cs)]) off++;   // sull'asfalto disegnato
      }
      for (const p of s.peds) if (p.st === 2 && p.cr.q < 0.02 && D.light(s, p.cr.n).ph !== p.cr.ph) crossBad++;
    }
    assert.equal(enterWrong, 0, `${id}: ${enterWrong} auto col verde degli altri (${enterGreen} col proprio)`);
    assert.equal(crossBad, 0, `${id}: pedoni col rosso`);
    assert.equal(off, 0, `${id}: auto fuori strada`);
  }
});

test('mappe reali: stato JSON piccolo (niente mappa dentro), determinismo e ripresa', () => {
  for (const id of MAPS) {
    const a = fresh(4, 99, id), b = fresh(4, 99, id);
    assert.equal(a.map, undefined);
    assert.equal(a.mapId, id);
    assert.ok(JSON.stringify(a).length < 30000, 'salvataggio piccolo');
    const bot = makeBot(a, { seed: 2 });
    const inputs = [];
    let saved = null;
    for (let f = 0; f < 60 * 30; f++) { const inp = bot.input(a.t); inputs.push(inp); D.step(a, DT, inp); if (f === 600) saved = JSON.stringify(a); }
    for (const inp of inputs) D.step(b, DT, inp);
    assert.equal(JSON.stringify(b), JSON.stringify(a));
    const c = JSON.parse(saved);
    for (let f = 601; f < inputs.length; f++) D.step(c, DT, inputs[f]);
    assert.equal(JSON.stringify(c), JSON.stringify(a), `${id}: la ripresa da JSON diverge`);
  }
});

test('mappe reali: muri morbidi sulla griglia fine (nessun cuore), mai fuori dall\'asfalto disegnato', () => {
  for (const id of MAPS) {
    const s = fresh(2, 5, id), g = D.geo(s);
    s.npcs = []; s.peds = [];
    const r = HH.rng(3);
    for (let f = 0; f < 60 * 25; f++) {
      D.step(s, DT, f % 40 === 0 ? { ax: r() * 2 - 1, ay: r() * 2 - 1 } : undefined);
      const i = Math.floor(s.car.y * g.cs) * s.W * g.cs + Math.floor(s.car.x * g.cs);
      assert.equal(g.csolid[i], 0, `${id}: fuori strada a ${s.car.x.toFixed(2)},${s.car.y.toFixed(2)}`);
    }
    assert.equal(s.oops, 0);
  }
});

test('mappe reali: curva di difficoltà monotona anche sulle mappe grandi', () => {
  let prev = null;
  for (let L = 1; L <= 20; L++) {
    const c = D.config(L, 'ostia');
    if (prev) assert.ok(c.dmax >= prev.dmax && c.dmin >= prev.dmin && c.cars >= prev.cars && c.peds >= prev.peds && c.slack <= prev.slack);
    prev = c;
  }
});
