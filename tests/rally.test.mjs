// Unit test Hari Rally: pista sempre percorribile (curvatura entro i limiti, nessun tratto che si riavvicina), note del
// navigatore coerenti con la curvatura misurata da un oracolo indipendente (cerchio per tre punti) e con ponti e gallerie,
// collisioni nel piano del mondo senza compenetrazioni né teletrasporti (oracolo delle pose indipendente, anche sulla posa
// disegnata), muri veri, fuori strada, ostacoli e nuvoletta, acceleratore/freno/retromarcia, derapata e mini-spinta,
// power-up, avversari più bravi (traiettoria ideale, sorpassi, rubber band), tre bot (attento, lento, senza freno) con la
// curva di difficoltà attesa, ambientazioni a rotazione, determinismo e ripresa da JSON (anche dai salvataggi v1 e v2), tempi.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './_load.mjs';
import { botKit } from './_rally-bot.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/rally-logic.js');
const R = HH.rally;
const { play, makeBot, DT } = botKit(HH);
const fresh = (level, seed) => R.newLevel(level, HH.rng(seed));
const run = (s, sec, inp) => { const ev = []; for (let t = 0; t < sec && !R.isOver(s); t += DT) ev.push(...R.step(s, DT, typeof inp === 'function' ? inp(s) : inp)); return ev; };
const go = (s) => { s.ready = 0; s.cd = 0; return s; };
const SLOWBOT = { react: 0.45, grip: 6.5, wobble: 0.35 };
const NOBRAKE = { grip: 999 };   // non frena mai (acceleratore sempre giù)
// parcheggia gli avversari lontano (per provare una cosa alla volta)
const park = (s, ...ids) => { for (const id of ids) { const c = s.cars[id]; c.s = 5 + id; c.d = -3.5 + id * 2; c.v = 0; c.skill = 1e-4; } };

/* ---------- oracoli sulla geometria (solo i punti x, y) ---------- */
// raggio puntuale dal cerchio per tre punti a ±h metri
function rad3(g, i, h = 3) {
  const ax = g.x[i - h], ay = g.y[i - h], bx = g.x[i], by = g.y[i], cx = g.x[i + h], cy = g.y[i + h];
  const a = Math.hypot(bx - cx, by - cy), b = Math.hypot(ax - cx, ay - cy), c = Math.hypot(ax - bx, ay - by);
  const cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return { R: Math.abs(cr) < 1e-9 ? 1e9 : (a * b * c) / (2 * Math.abs(cr)), dir: Math.sign(cr) };
}
// angoli del rettangolo di un'auto nel piano (s, d) e test di sovrapposizione indipendente (SAT scritto a parte)
function corners(c) {
  const ca = Math.cos(c.psi), sa = Math.sin(c.psi), hl = R.CAR_L / 2, hw = R.CAR_W / 2;
  return [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([a, b]) => [c.s + a * ca - b * sa, c.d + a * sa + b * ca]);
}
function sepDepth(A, B) {
  const pa = corners(A), pb = corners(B);
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
const airborne = (c) => c.spr && c.air > 0.2;
// oracolo nel mondo (indipendente da R.pose): centro dai punti della pista, direzione dalle tangenti ai campioni
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
// quanto un cerchio entra nel rettangolo (≤ 0 = fuori)
function circleDepth(poly, cx, cy, r) {
  let inside = true, dist = Infinity;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 4], ex = x2 - x1, ey = y2 - y1;
    if ((cx - x1) * ey - (cy - y1) * ex < 0) inside = false;   // angoli in senso orario: dentro = a destra di ogni lato
    const t = Math.max(0, Math.min(1, ((cx - x1) * ex + (cy - y1) * ey) / (ex * ex + ey * ey)));
    dist = Math.min(dist, Math.hypot(cx - x1 - ex * t, cy - y1 - ey * t));
  }
  return inside ? r + dist : r - dist;
}

test('pista percorribile: curve mai più strette di 14 m, passi di 1 m, nessun tratto che torna a meno di 30 m', () => {
  for (let level = 1; level <= 16; level++) {
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 101 + k), g = R.geo(s);
      assert.equal(g.N, R.PREROLL + s.L + R.RUNOFF);
      let minR = 1e9;
      for (let i = 3; i <= g.N - 3; i++) {
        assert.ok(Math.abs(Math.hypot(g.x[i] - g.x[i - 1], g.y[i] - g.y[i - 1]) - 1) < 0.01, 'passo di 1 m');
        minR = Math.min(minR, rad3(g, i).R);
      }
      assert.ok(minR >= 14, `livello ${level}: raggio minimo ${minR.toFixed(1)} m`);
      if (level <= 2) assert.ok(minR >= 28, `livello ${level}: niente curve strette (${minR.toFixed(1)} m)`);
      // auto-intersezioni: punti a più di 160 m di pista l'uno dall'altro restano lontani (forza bruta, ogni 4 m)
      for (let i = 0; i <= g.N; i += 4) for (let j = i + 164; j <= g.N; j += 4) {
        const dd = Math.hypot(g.x[i] - g.x[j], g.y[i] - g.y[j]);
        assert.ok(dd >= 30, `livello ${level}: ${i} m e ${j} m distano ${dd.toFixed(1)} m`);
      }
    }
  }
});

test('note del navigatore coerenti con la curvatura, con ponti, gallerie, dossi, ostacoli e curve paraboliche', () => {
  const kinds = new Set();
  for (let level = 1; level <= 14; level += 1) {
    for (let k = 0; k < 3; k++) {
      const s = fresh(level, level * 37 + k), g = R.geo(s);
      const curves = g.notes.filter((n) => n.kind === 'curve');
      assert.ok(curves.length >= 3, `livello ${level}: ${curves.length} curve`);
      for (const n of curves) {
        let minR = 1e9, sum = 0, cnt = 0;
        for (let i = Math.max(3, n.at); i <= Math.min(g.N - 3, n.end); i++) { const q = rad3(g, i); minR = Math.min(minR, q.R); if (q.R < 600) { sum += q.dir; cnt++; } }
        assert.equal(Math.sign(sum), n.dir, `livello ${level}: verso della nota a ${n.at} m`);
        assert.ok(cnt > 0 && Math.abs(sum) === cnt, `livello ${level}: la curva a ${n.at} m cambia verso`);
        const band = R.BANDS[n.g - 1];
        assert.ok(minR >= band[1] * 0.97 - 0.5 && minR < band[2] * 1.03 + 0.5, `livello ${level}: nota ${n.g} con raggio ${minR.toFixed(1)} m`);
        assert.equal(n.call, n.at - R.CALL);
        if (n.hairpin) assert.equal(n.g, 1);
      }
      // copertura: ogni punto con raggio < 130 m è dentro una nota di curva con lo stesso verso
      for (let i = R.PREROLL; i <= R.PREROLL + s.L; i++) {
        const q = rad3(g, i);
        if (q.R >= 130) continue;
        assert.ok(curves.some((n) => n.at <= i + 3 && n.end >= i - 3 && n.dir === q.dir), `livello ${level}: curva a ${i} m (R ${q.R.toFixed(0)}) senza nota`);
      }
      // dossi, ponti e gallerie hanno la loro nota, nello stesso punto; stanno sui tratti dritti e non si sovrappongono
      for (const [kind, list, a, b] of [['crest', g.crests, (x) => x.s - 6, (x) => x.s + 6], ['bridge', g.bridges, (x) => x.s0, (x) => x.s1], ['tunnel', g.tunnels, (x) => x.s0, (x) => x.s1]]) {
        const ns = g.notes.filter((n) => n.kind === kind);
        assert.equal(ns.length, list.length, `livello ${level}: note "${kind}"`);
        list.forEach((x, j) => {
          assert.ok(ns[j].at === a(x) && ns[j].end === b(x));
          for (let i = a(x); i <= b(x); i++) assert.ok(rad3(g, i).R > 250, `${kind} a ${i} m in curva`);
          kinds.add(kind);
        });
      }
      const spans = [...g.bridges, ...g.tunnels].sort((p, q) => p.s0 - q.s0);
      for (let j = 1; j < spans.length; j++) assert.ok(spans[j].s0 > spans[j - 1].s1 + 20, 'ponti e gallerie separati');
      // gli ostacoli stanno all'interno di curve "non tagliare"; le curve paraboliche sono curve 2–3 segnalate
      for (const rk of g.rocks) {
        const n = curves.find((c) => c.at <= rk.s && c.end >= rk.s);
        assert.ok(n && n.nocut && Math.sign(rk.d) === n.dir, 'ostacolo all\'interno di una curva segnalata');
        assert.ok(Math.abs(rk.d) - rk.r >= R.HALF - 0.01, 'ostacolo fuori dalla carreggiata');
      }
      for (const b of g.banks) {
        const n = curves.find((c) => c.at === b.a);
        assert.ok(n && n.bank && n.g >= 2 && n.g <= 3 && n.dir === b.dir, 'curva parabolica segnalata');
        kinds.add('bank');
      }
      for (let j = 1; j < g.notes.length; j++) assert.ok(g.notes[j].at >= g.notes[j - 1].at);
    }
  }
  assert.deepEqual([...kinds].sort(), ['bank', 'bridge', 'crest', 'tunnel']);
});

test('il navigatore legge ogni nota prima di arrivarci (nell\'ordine), e upcoming() mostra la prossima', () => {
  for (const [level, seed] of [[6, 9], [2, 4]]) {
    const s = fresh(level, seed), g = R.geo(s);
    const bot = makeBot(s, { seed: 2 });
    const calls = [];
    while (!R.isOver(s)) {
      for (const e of R.step(s, DT, bot())) if (e.type === 'call') {
        const n = g.notes[e.i];
        calls.push(e.i);
        const ahead = n.at - s.cars[0].s;
        if (n.call > R.PREROLL) assert.ok(ahead > R.CALL - 3 && ahead <= R.CALL + 0.1, `nota ${e.i} letta a ${ahead.toFixed(1)} m`);
        assert.ok(R.upcoming(s, 3).some((u) => u.i === e.i));
      }
    }
    const before = g.notes.filter((n) => n.call < s.cars[0].s).length;
    assert.deepEqual(calls, [...Array(before).keys()]);
  }
});

test('ambientazioni a rotazione: bosco, città, mare e neve, di giorno, al tramonto e di notte', () => {
  const seen = new Set(), times = new Set();
  for (let L = 1; L <= 12; L++) {
    const c = R.config(L);
    assert.ok(R.THEMES.includes(c.theme) && R.TIMES.includes(c.time) && R.STAGES.includes(c.stage));
    seen.add(c.theme); times.add(c.time);
    seen.add(`${c.theme}/${c.time === 'day' ? 'day' : 'dark'}`);
    if (L > 1) assert.notEqual(c.theme, R.config(L - 1).theme, `livello ${L}: stessa ambientazione di prima`);
  }
  for (const th of R.THEMES) assert.ok(seen.has(`${th}/day`) && seen.has(`${th}/dark`), `${th} di giorno e di notte/tramonto`);
  assert.equal(times.size, 3);
  assert.deepEqual([1, 2, 3, 5].map((L) => R.config(L).theme), ['forest', 'city', 'sea', 'snow']);
  // in città ci sono gallerie, sulla neve si scivola un po' di più, sull'asfalto un po' di meno
  let tun = 0;
  for (let k = 0; k < 4; k++) tun += R.track(500 + k, 6).tunnels.length;
  assert.ok(tun >= 2, `gallerie in città: ${tun}`);
  assert.ok(R.config(5).grip < R.config(1).grip && R.config(2).grip > R.config(1).grip);
  // bordi: transenne in città più vicine, ringhiere dei ponti e pareti delle gallerie
  const g = R.track(77, 6);
  assert.equal(R.edgeAt(g, g.S0 + 2).lim, R.WALLS.city);
  if (g.tunnels.length) assert.equal(R.edgeAt(g, (g.tunnels[0].s0 + g.tunnels[0].s1) / 2).kind, 'tube');
  if (g.bridges.length) assert.equal(R.edgeAt(g, (g.bridges[0].s0 + g.bridges[0].s1) / 2).kind, 'rail');
});

test('tracciati meno monotoni: chicane, tornanti, dossi, checkpoint, scatole e ghiande ben piazzate', () => {
  let chicanes = 0, hair = 0, crests = 0;
  for (let k = 0; k < 6; k++) for (const L of [6, 9, 12]) {
    const g = R.track(900 + k * 3, L);
    const cs = g.notes.filter((n) => n.kind === 'curve');
    for (let j = 1; j < cs.length; j++) if (cs[j].dir !== cs[j - 1].dir && cs[j].at - cs[j - 1].end < 12 && cs[j].g <= 4 && cs[j - 1].g <= 4) chicanes++;
    hair += cs.filter((n) => n.hairpin).length;
    crests += g.crests.length;
    // checkpoint a un terzo e due terzi
    assert.deepEqual(g.checks, [g.S0 + Math.round(g.L / 3), g.S0 + Math.round((2 * g.L) / 3)]);
    // scatole: in file da 4 sulla carreggiata, mai su ponti o in galleria, abbastanza spesso
    assert.ok(g.boxes.length >= Math.floor(g.L / 600), `scatole: ${g.boxes.length} su ${g.L} m`);
    for (const b of g.boxes) {
      assert.ok(b.row.length === 4 && b.row.every((d) => Math.abs(d) + R.PU.boxR <= R.HALF));
      assert.ok(!g.bridges.some((q) => b.s > q.s0 - 3 && b.s < q.s1 + 3) && !g.tunnels.some((q) => b.s > q.s0 - 3 && b.s < q.s1 + 3));
    }
    for (let j = 1; j < g.boxes.length; j++) assert.ok(g.boxes[j].s - g.boxes[j - 1].s > 150);
    // ghiande sulla strada, in ordine
    assert.ok(g.acorns.length >= 10);
    g.acorns.forEach((a, j) => { assert.ok(Math.abs(a.d) <= R.HALF - 0.8 + 1e-9); if (j) assert.ok(a.s >= g.acorns[j - 1].s); });
  }
  assert.ok(chicanes >= 6, `chicane: ${chicanes}`);
  assert.ok(hair >= 3, `tornanti: ${hair}`);
  assert.ok(crests >= 18, `dossi: ${crests}`);
});

test('traiettoria ideale degli avversari: fuori prima della curva, all\'interno sull\'apice, più veloce del centro', () => {
  let n = 0, inside = 0, outside = 0;
  for (let k = 0; k < 4; k++) for (const L of [3, 7, 10]) {
    const g = R.track(300 + k, L);
    for (const c of g.notes.filter((q) => q.kind === 'curve' && q.g <= 3 && !q.long)) {
      const prev = g.notes.filter((q) => q.kind === 'curve' && q.end < c.at).pop();
      if (prev && c.at - prev.end < 40) continue;   // curve attaccate: la linea passa da un apice all'altro
      n++;
      if (Math.sign(g.line[c.apex]) === c.dir && Math.abs(g.line[c.apex]) > 1.5) inside++;
      if (-Math.sign(g.line[Math.max(0, c.at - 12)]) === c.dir && Math.abs(g.line[c.at - 12]) > 0.8) outside++;
      // sulla traiettoria ideale la curva si fa più forte che seguendo il centro: √(aderenza × R) col raggio vero
      assert.ok(g.prof[c.apex] >= Math.min(g.c.vmax, Math.sqrt(R.GRIP * g.c.grip * c.R)) * 0.95, `apice a ${c.apex}: ${g.prof[c.apex].toFixed(1)} m/s`);
    }
    // dentro la carreggiata (con l'auto intera) e senza scalini
    for (let i = 1; i <= g.N; i++) assert.ok(Math.abs(g.line[i] - g.line[i - 1]) <= 0.45 && Math.abs(g.line[i]) + R.CAR_W / 2 <= R.HALF - 0.3 + 1e-9);
  }
  assert.ok(n > 20 && inside / n > 0.65 && outside / n > 0.6, `apici dentro ${inside}/${n}, ingressi da fuori ${outside}/${n}`);
});

test('il bot pilota attento (reazione ~0,22 s) vince i primi livelli, poi non sempre: 1°–3° a metà, più dura in alto', () => {
  const stats = [], pos = {};
  for (let level = 1; level <= 12; level++) {
    pos[level] = [];
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 1000 + k);
      const ev = play(s, { seed: level * 7 + k });
      stats.push(`L${level}.${k} ${s.pos}° ${s.fin.toFixed(0)} s, fuori ${s.offT.toFixed(0)} s, power-up ${ev.filter((e) => e.type === 'use' && e.who === 0).length}`);
      assert.ok(R.isOver(s), `livello ${level}: gara non finita`);
      pos[level].push(s.pos);
      assert.equal(R.progress(s), s.won ? 1 : R.progress(s));
      assert.equal(R.rate(s), Math.max(0, 4 - s.pos));
      // anche gli avversari usano i power-up
      if (level >= 3) assert.ok(ev.some((e) => e.type === 'use' && e.who > 0), `livello ${level}: avversari senza power-up`);
    }
  }
  if (process.env.RALLY_STATS) console.log(stats.join('\n'));
  const mean = (a, b) => { let n = 0, t = 0; for (let L = a; L <= b; L++) for (const p of pos[L]) { t += p; n++; } return t / n; };
  const all = (a, b, f) => { for (let L = a; L <= b; L++) if (!pos[L].every(f)) return false; return true; };
  // livelli 1–2: vince sempre; 1–5: sempre sul podio
  assert.ok(all(1, 2, (p) => p === 1), `livelli 1–2: ${[1, 2].map((L) => pos[L].join('')).join(' ')}`);
  assert.ok(all(1, 5, (p) => p <= 3), `livelli 1–5: ${[1, 2, 3, 4, 5].map((L) => pos[L].join('')).join(' ')}`);
  // a metà (6–8) quasi sempre sul podio ma non sempre primo; in alto (9–12) più indietro, a volte giù dal podio
  const mid = mean(6, 8), high = mean(9, 12);
  assert.ok(mid > 1.1 && mid < 2.6, `livelli 6–8: posizione media ${mid.toFixed(2)}`);
  assert.ok(high > mid && high < 3.7, `livelli 9–12: posizione media ${high.toFixed(2)} (6–8: ${mid.toFixed(2)})`);
  assert.ok([6, 7, 8].reduce((n, L) => n + pos[L].filter((p) => p > 3).length, 0) <= 2, 'livelli 6–8: al massimo 2 gare perse');
});

test('livello 1: corto e facile anche per un pilota lento e impreciso, che però perde più spesso nei livelli alti', () => {
  for (let k = 0; k < 5; k++) {
    const s = fresh(1, 70 + k);
    play(s, Object.assign({ seed: k }, SLOWBOT));
    assert.ok(R.isWon(s), `seme ${k}: ${s.pos}°`);
    assert.ok(s.fin > 55 && s.fin < 120, `durata ${s.fin.toFixed(1)} s`);
  }
  for (let level = 2; level <= 3; level++) {
    const s = fresh(level, 500 + level);
    play(s, Object.assign({ seed: level }, SLOWBOT));
    assert.ok(R.isWon(s), `livello ${level}: ${s.pos}°`);
  }
  // livelli 7–10: il bot lento arriva in media più indietro del bot attento e perde almeno metà delle gare
  let lost = 0, slowPos = 0, goodPos = 0, n = 0;
  for (let level = 7; level <= 10; level++) for (let k = 0; k < 2; k++) {
    const a = fresh(level, level * 1000 + k), b = fresh(level, level * 1000 + k);
    play(a, { seed: level * 7 + k }); play(b, Object.assign({ seed: level * 7 + k }, SLOWBOT));
    goodPos += a.pos; slowPos += b.pos; n++;
    if (!R.isWon(b)) lost++;
  }
  assert.ok(slowPos > goodPos + n * 0.8, `posizione media: lento ${(slowPos / n).toFixed(2)}, attento ${(goodPos / n).toFixed(2)}`);
  assert.ok(lost >= n / 2, `il bot lento perde ${lost}/${n}`);
});

test('chi non frena mai va fuori strada (erba, sabbia, neve, marciapiede), viene riportato in pista dalla nuvoletta e perde', () => {
  let lost = 0, n = 0, worse = 0, rescues = 0, spins = 0, offRaces = 0, first = 0, sumA = 0, sumB = 0, nHi = 0;
  const rows = [];
  for (let level = 5; level <= 12; level++) for (let k = 0; k < 2; k++) {
    const a = fresh(level, level * 1000 + k), b = fresh(level, level * 1000 + k);
    play(a, { seed: level * 7 + k });
    const ev = play(b, Object.assign({ seed: level * 7 + k }, NOBRAKE));
    n++; sumA += a.pos; sumB += b.pos;
    if (b.pos === 1) first++;
    if (level >= 8) { nHi++; if (!R.isWon(b)) lost++; }
    if (level >= 10 && b.pos === 1) first += 10;
    if (b.pos > a.pos || (b.pos === a.pos && b.fin > a.fin)) worse++;
    if (b.offT > 1.5) offRaces++;
    rescues += ev.filter((e) => e.type === 'rescue').length;
    spins += ev.filter((e) => e.type === 'spin' && e.who === 0).length;
    rows.push(`L${level}.${k} senza freno ${b.pos}° ${b.fin.toFixed(0)} s (fuori ${b.offT.toFixed(0)} s) · attento ${a.pos}° ${a.fin.toFixed(0)} s`);
  }
  if (process.env.RALLY_STATS) console.log(rows.join('\n'));
  // sempre fuori strada; in media dietro al bot attento; raramente primo (mai dal livello 10); dall'8 perde spesso
  assert.ok(offRaces >= n - 1, `fuori strada in ${offRaces}/${n} gare`);
  assert.ok(sumB >= sumA + n * 0.5, `posizione media: senza freno ${(sumB / n).toFixed(2)}, attento ${(sumA / n).toFixed(2)}`);
  assert.ok(first <= 3, `chi non frena arriva primo ${first} volte (+10 per ogni volta dal livello 10)`);
  assert.ok(lost >= nHi / 2, `dal livello 8 chi non frena perde ${lost}/${nHi}`);
  assert.ok(worse >= n * 0.7, `chi non frena fa peggio del bot attento in ${worse}/${n} gare`);
  assert.ok(rescues >= 6, `nuvolette ${rescues} (sbandate ${spins})`);
});

test('gli avversari finiscono sempre la gara (anche con Hari fermo al via), dentro i bordi, e la classifica è completa', () => {
  for (const level of [1, 5, 10, 15]) {
    for (let k = 0; k < 3; k++) {
      const s = go(fresh(level, level * 17 + k)), g = R.geo(s);
      // Hari frena sempre: resta fermo alla partenza
      for (let t = 0; t < 400 && !s.cars.slice(1).every((c) => c.fin > 0); t += DT) {
        R.step(s, DT, { steer: 0, brake: 1 });
        for (const c of s.cars) if (c.fin < 0) assert.ok(Math.abs(c.d) + R.extent(c.psi) <= R.edgeAt(g, c.s).lim + 1e-6, `auto ${c.id} oltre il bordo`);
      }
      const ai = s.cars.filter((c) => c.id);
      assert.ok(ai.every((c) => c.fin > 0), `livello ${level}: qualcuno non è arrivato`);
      assert.ok(!R.isOver(s));
      const times = ai.map((c) => c.fin);
      assert.ok(Math.max(...times) < 3.2 * s.L / R.config(level).vmax, 'tempi ragionevoli');
    }
  }
  const s = fresh(3, 5);
  play(s, { seed: 3 });
  assert.equal(s.res.length, 4);
  assert.ok(s.res.every((r, i) => r.t > 0 && (i === 0 || r.t >= s.res[i - 1].t)));
  assert.equal(s.res.findIndex((r) => r.id === 0) + 1, s.pos);
});

test('collisioni nel mondo: in tante gare (3 bot, livelli 2–12) nessuna coppia di kart si sovrappone, né nella logica né nella posa disegnata', () => {
  let ticks = 0, contacts = 0, near = 0, rescues = 0;
  for (const bo of [{}, NOBRAKE, SLOWBOT]) for (const level of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]) for (let k = 0; k < 2; k++) {
    const s = fresh(level, level * 1000 + k), g = R.geo(s), bot = makeBot(s, Object.assign({ seed: level * 7 + k }, bo));
    while (!R.isOver(s)) {
      const prev = s.cars.map((c) => ({ s: c.s, d: c.d, v: c.v }));
      const ev = R.step(s, DT, bot());
      if (ev.some((e) => e.type === 'bump')) contacts++;
      const jumped = new Set(ev.filter((e) => e.type === 'rescue' || e.type === 'back').map((e) => e.who));
      rescues += ev.filter((e) => e.type === 'rescue').length;
      const W = s.cars.map((c) => wpose(g, c)), D = s.cars.map((c) => R.pose(g, c));
      for (let a = 0; a < 4; a++) {
        const A = s.cars[a];
        if (A.fin >= 0 || A.res > 0) continue;
        // la posa che usa la grafica (R.pose) è il rettangolo vero (oracolo calcolato qui dai punti della pista)
        assert.ok(Math.hypot(D[a].x - W[a].x, D[a].y - W[a].y) < 0.02 && Math.abs(Math.sin(D[a].h - W[a].h)) < 0.004, `L${level}: posa disegnata diversa di ${Math.hypot(D[a].x - W[a].x, D[a].y - W[a].y).toFixed(4)} m, ${Math.sin(D[a].h - W[a].h).toFixed(4)} rad a s = ${A.s.toFixed(1)}, d = ${A.d.toFixed(2)}`);
        // dentro i muri veri con tutto il rettangolo; oltre il limite senza muro solo finché arriva la nuvoletta
        for (const sg of [1, -1]) {
          const sd = R.sideAt(g, A.s, sg), over = sg * A.d + R.extent(A.psi) - sd.lim;
          assert.ok(over <= (sd.hard ? 1e-6 : 0.4), `L${level}: auto ${A.id} oltre il bordo di ${over.toFixed(2)} m (${sd.hard ? 'muro' : 'limite'})`);
        }
        // mai dentro un albero, una roccia, un cumulo o un vaso
        const poly = cornersW(W[a]);
        for (const ob of g.props.concat(g.rocks)) if (Math.abs(ob.s - A.s) < 8) assert.ok(circleDepth(poly, ob.x, ob.y, ob.r) < 0.01, `L${level}: auto ${A.id} dentro ${ob.k}`);
        // niente salti (tranne la nuvoletta): lo spostamento in un passo è quello della velocità (più pochi centimetri)
        if (!jumped.has(A.id)) {
          // (lungo i guardrail a imbuto prima dei ponti il muro spinge di lato quanto la sua pendenza × la strada fatta)
          assert.ok(Math.abs(A.d - prev[a].d) <= 0.35, `L${level}: scarto laterale ${(A.d - prev[a].d).toFixed(2)} m`);
          const ds = A.s - prev[a].s, vm = Math.max(Math.abs(A.v), Math.abs(prev[a].v));
          assert.ok(Math.abs(ds) <= vm * DT * 1.6 + 0.1, `L${level}: scarto in avanti ${ds.toFixed(2)} m a ${vm.toFixed(1)} m/s`);
        }
        for (let b = a + 1; b < 4; b++) {
          const B = s.cars[b];
          if (B.fin >= 0 || B.res > 0 || A.gh || B.gh || airborne(A) || airborne(B)) continue;
          if (Math.abs(A.s - B.s) < 8) near++;
          // oracolo (± qualche millimetro di discretizzazione della pista) e posa disegnata
          const dep = sepW(poly, cornersW(W[b])), drawn = sepW(cornersW(D[a]), cornersW(D[b]));
          assert.ok(dep < 0.015 && drawn < 0.005, `L${level}: kart ${A.id} e ${B.id} compenetrati di ${dep.toFixed(3)} m (disegnati ${drawn.toFixed(3)} m)`);
        }
      }
      ticks++;
    }
  }
  assert.ok(contacts >= 20 && near > 5000 && rescues >= 5, `contatti con Hari ${contacts}, vicini ${near}, nuvolette ${rescues}`);
  assert.ok(ticks > 100000);
});

test('in curva il vecchio modo (rettangoli in s, d) sbagliava: il nuovo separa davvero nel mondo', () => {
  // due kart all'interno di un tornante, uno davanti all'altro di CAR_L + 5 cm "lungo s": in (s, d) non si toccano,
  // nel mondo sì (all'interno un metro di s vale 1 − k·d metri)
  let s, nt;
  for (let seed = 1; seed < 80 && !nt; seed++) { s = go(fresh(8, seed)); nt = R.geo(s).notes.find((q) => q.kind === 'curve' && q.g === 1); }
  const G = R.geo(s);
  park(s, 2, 3);
  const A = s.cars[0], B = s.cars[1], din = nt.dir * 3.6;
  A.s = nt.apex; A.d = din; A.v = 0; B.s = nt.apex + R.CAR_L + 0.05; B.d = din; B.v = 0; B.skill = 1e-4;
  assert.equal(R.overlap(A, B), null, 'in (s, d) sembrano staccati');
  const before = sepW(cornersW(wpose(G, A)), cornersW(wpose(G, B)));
  assert.ok(before > 0.2, `nel mondo si compenetrano di ${before.toFixed(2)} m`);
  R.tick(s, { steer: 0, gas: 0, brake: 1 });
  assert.ok(sepW(cornersW(wpose(G, A)), cornersW(wpose(G, B))) < 0.01, 'dopo un passo sono separati nel mondo');
});

test('collisioni auto–auto: spinte proporzionali all\'urto, con attrito, e lo scudo-bolla non si sposta', () => {
  // tamponamento: chi è dietro rallenta, chi è davanti accelera; più forte l'urto, più grande lo scambio
  const hit = (closing) => {
    const s = go(fresh(2, 4));
    park(s, 2, 3);
    const A = s.cars[0], B = s.cars[1];
    A.s = 100; A.d = 0; A.v = 12 + closing; B.s = 100 + R.CAR_L + 0.05; B.d = 0.3; B.v = 12; B.skill = 0.5;
    let ev = [];
    for (let i = 0; i < 12; i++) ev = ev.concat(R.tick(s, { steer: 0, brake: 0 }));
    assert.ok(ev.some((e) => e.type === 'bump'));
    assert.ok(sepW(cornersW(wpose(R.geo(s), A)), cornersW(wpose(R.geo(s), B))) < 0.015);
    return { a: A.v, b: B.v };
  };
  const soft = hit(3), hard = hit(8);
  assert.ok(hard.a < 12 + 8 - 2.5 && hard.b > 13.5, `urto forte: ${hard.a.toFixed(1)} / ${hard.b.toFixed(1)}`);
  assert.ok(12 + 8 - hard.a > 12 + 3 - soft.a, 'lo scambio cresce con la velocità dell\'urto');
  // di lato: spinta laterale che si smorza (niente salti), nessuna compenetrazione
  const s = go(fresh(2, 4));
  park(s, 2, 3);
  const A = s.cars[0], B = s.cars[1];
  A.s = 200; A.d = -1.2; A.v = 18; A.psi = 0.12; B.s = 200.5; B.d = 1.0; B.v = 18; B.skill = 1;
  let maxPd = 0;
  for (let i = 0; i < 60; i++) { R.tick(s, { steer: -0.4, brake: 0 }); maxPd = Math.max(maxPd, Math.abs(B.pd)); assert.ok(sepW(cornersW(wpose(R.geo(s), A)), cornersW(wpose(R.geo(s), B))) < 0.015); }
  assert.ok(maxPd > 0.3 && maxPd <= 4, `spinta laterale ${maxPd.toFixed(2)} m/s`);
  // scudo-bolla: chi lo ha non viene spostato; lo scudo scoppia dopo la prima spinta
  const t = go(fresh(2, 4));
  park(t, 2, 3);
  const P = t.cars[0], Q = t.cars[1];
  P.s = 300; P.d = 0; P.v = 19; Q.s = 300 + R.CAR_L - 0.2; Q.d = 0.2; Q.v = 15; Q.sh = 5; Q.skill = 1;
  // stessa scena senza contatto (P lontano): Q fa lo stesso movimento, cioè la spinta non lo ha spostato
  const t2 = JSON.parse(JSON.stringify(t)), Q2 = t2.cars[1];
  t2.cars[0].s = 250;
  const ev = R.tick(t, { steer: 0, brake: 0 });
  R.tick(t2, { steer: 0, brake: 0 });
  assert.ok(ev.some((e) => e.type === 'pop' && e.who === 1));
  // (a meno di quei pochi centimetri con cui il suo pilota reagisce a chi gli è accanto)
  assert.ok(Math.abs(Q.d - Q2.d) < 0.03 && Math.abs(Q.s - Q2.s) < 0.03 && Math.abs(Q.v - Q2.v) < 0.05, `lo scudo non si sposta: ${(Q.d - Q2.d).toFixed(3)} / ${(Q.s - Q2.s).toFixed(3)}`);
  assert.ok(P.v < 19 - 4, `chi sbatte sulla bolla rimbalza: ${P.v.toFixed(1)} m/s`);
  assert.ok(sepW(cornersW(wpose(R.geo(t), P)), cornersW(wpose(R.geo(t), Q))) < 0.015);
});

test('fisica: acceleratore, freno e retromarcia, fuori strada che rallenta, muri veri, nuvoletta, ostacoli', () => {
  // acceleratore manuale: senza gas si rallenta piano, col freno si frena, da fermi il freno è la retromarcia
  const s = go(fresh(4, 3));
  park(s, 1, 2, 3);
  run(s, 4, { steer: 0, gas: 1, brake: 0 });
  const v0 = s.cars[0].v;
  assert.ok(v0 > 14, `accelerando: ${v0.toFixed(1)} m/s`);
  run(s, 1, { steer: 0, gas: 0, brake: 0 });
  const v1 = s.cars[0].v;
  assert.ok(v1 < v0 - 0.8 && v1 > v0 - 4, `senza gas: ${v0.toFixed(1)} → ${v1.toFixed(1)} m/s`);
  run(s, 0.5, { steer: 0, gas: 0, brake: 1 });
  assert.ok(s.cars[0].v < v1 - 5, 'il freno rallenta');
  const sb = s.cars[0].s;
  run(s, 4, { steer: 0, gas: 0, brake: 1 });
  assert.ok(s.cars[0].v < -2 && s.cars[0].v >= -R.REV - 1e-9 && s.cars[0].s < sb, `retromarcia ${s.cars[0].v.toFixed(1)} m/s`);
  run(s, 1, { steer: 0, gas: 1, brake: 0 });
  assert.ok(s.cars[0].v > 0, 'col gas si torna avanti');
  // acceleratore automatico (gas assente) e gas a zero (resta fermo)
  const au = go(fresh(4, 3)); park(au, 1, 2, 3); run(au, 3, { steer: 0, brake: 0 });
  assert.ok(au.cars[0].v > 12, 'acceleratore automatico');
  const z = go(fresh(4, 3)); park(z, 1, 2, 3); run(z, 2, { steer: 0, gas: 0, brake: 0 });
  assert.equal(z.cars[0].v, 0);
  // fuori strada: sull'erba si rallenta molto (fino al limite della superficie)
  const t = go(fresh(4, 3)), p = t.cars[0];
  park(t, 1, 2, 3);
  run(t, 4, { steer: 0, gas: 1, brake: 0 });
  p.d = R.HALF + 1.4; p.psi = 0;
  // resta sull'erba (a 1,4 m dal bordo) con un po' di sterzo
  const ev = run(t, 2.5, (q) => ({ steer: -(R.kAt(R.geo(q), p.s) + (R.HALF + 1.4 - p.d) * 0.03 - (p.psi - p.bet) * 0.3) / R.KMAX, gas: 1, brake: 0 }));
  assert.ok(ev.some((e) => e.type === 'off' && e.surf === 'grass') && R.isOff(p));
  assert.ok(p.v <= R.config(4).vmax * R.SURF.forest.cap + 0.3, `sull'erba ${p.v.toFixed(1)} m/s`);
  // muro vero (ringhiera di un ponte): urto di striscio = poco rallentamento, urto deciso = tanto; mai oltre
  let bs = 1;
  while (!R.geo(fresh(1, bs)).bridges.length) bs++;
  const wallHit = (psi) => {
    const u = go(fresh(1, bs)), q = u.cars[0], g = R.geo(u), b = g.bridges[0];
    park(u, 1, 2, 3);
    q.s = b.s0 + 1; q.v = 18; q.psi = psi; q.d = R.RAIL - R.extent(psi) - 0.05;
    const e2 = [];
    for (let i = 0; i < 20; i++) { e2.push(...R.tick(u, { steer: 0, gas: 1, brake: 0 })); assert.ok(Math.abs(q.d) + R.extent(q.psi) <= R.sideAt(g, q.s, Math.sign(q.d)).lim + 1e-6); }
    return { v: q.v, boing: e2.some((e) => e.type === 'boing') };
  };
  const graze = wallHit(0.06), steep = wallHit(0.5);
  assert.ok(steep.boing && steep.v < graze.v - 3 && graze.v > 14, `striscio ${graze.v.toFixed(1)}, deciso ${steep.v.toFixed(1)}`);
  // prima del ponte il guardrail a imbuto porta dentro senza scatti
  {
    const u = go(fresh(1, bs)), g = R.geo(u), b = g.bridges[0];
    let prev = R.sideAt(g, b.s0 - R.FUN - 2, 1).lim;
    for (let sv = b.s0 - R.FUN - 2; sv <= b.s0; sv += 0.25) { const l = R.sideAt(g, sv, 1).lim; assert.ok(l <= prev + 1e-9 && prev - l < 0.2); prev = l; }
    assert.equal(R.sideAt(g, b.s0, 1).lim, R.RAIL);
  }
  // bosco (niente muri): sterzando tutto da una parte si esce, arriva la nuvoletta e si torna sulla strada più indietro
  const u = go(fresh(4, 8)), q = u.cars[0];
  park(u, 1, 2, 3);
  run(u, 3, { steer: 0, gas: 1, brake: 0 });
  const ev2 = [];
  let resc = null;
  for (let i = 0; i < 60 * 8 && !ev2.some((e) => e.type === 'back'); i++) {
    const e = R.tick(u, { steer: 1, gas: 1, brake: 0 });
    ev2.push(...e);
    if (!resc && e.some((x) => x.type === 'rescue')) resc = { s: q.s, t: u.t };
  }
  assert.ok(resc, 'nuvoletta');
  assert.ok(ev2.some((e) => e.type === 'back') && Math.abs(q.d) <= R.HALF && q.v === 0 && q.psi === 0 && q.s < resc.s, 'di nuovo sulla strada');
  assert.ok(u.t - resc.t >= R.RESCUE - 0.02 && u.nres >= 1, 'tempo perso');
  // ostacoli della fascia fuori strada (alberi, rocce): fermano, si gira un po', mai dentro
  for (let seed = 1; seed < 40; seed++) {
    const w = go(fresh(4, seed)), g = R.geo(w);
    const ob = g.props.find((o) => !R.SOFT[o.k] && o.s > g.S0 + 200);
    if (!ob) continue;
    park(w, 1, 2, 3);
    const c = w.cars[0];
    c.s = ob.s - 7; c.d = ob.d; c.v = 15; c.psi = 0;
    const e3 = [];
    for (let i = 0; i < 60; i++) { e3.push(...R.tick(w, { steer: 0, gas: 1, brake: 0 })); assert.ok(circleDepth(cornersW(wpose(g, c)), ob.x, ob.y, ob.r) < 0.01, 'dentro un ostacolo'); }
    assert.ok(e3.some((e) => e.type === 'rock' && e.k === ob.k), 'urto');
    assert.ok(Math.abs(c.v) < 9, `dopo l'urto ${c.v.toFixed(1)} m/s`);
    break;
  }
  // ostacolo "non tagliare" all'interno della curva: chi taglia sbatte e viene spostato fuori, senza restarci dentro
  for (let seed = 1; seed < 40; seed++) {
    const w = go(fresh(6, seed)), g = R.geo(w);
    if (!g.rocks.length) continue;
    park(w, 1, 2, 3);
    const rk = g.rocks[0], c = w.cars[0];
    c.s = rk.s - 6; c.d = rk.d; c.v = 15; c.psi = 0;
    const e3 = [];
    for (let i = 0; i < 60; i++) { e3.push(...R.tick(w, { steer: 0, gas: 1, brake: 0 })); assert.ok(circleDepth(cornersW(wpose(g, c)), rk.x, rk.y, rk.r) < 0.01); }
    assert.ok(e3.some((e) => e.type === 'rock'));
    assert.ok(c.v < 15);
    break;
  }
  // mai al contrario
  const m = go(fresh(4, 8)); park(m, 1, 2, 3);
  run(m, 3, null);
  run(m, 3, { steer: -1, gas: 1, brake: 0 });
  assert.ok(Math.abs(m.cars[0].psi) <= 1.1 + 1e-9);
});

test('aderenza limitata: troppo veloci in curva si va larghi e si derapa; la derapata tenuta dà la mini-spinta', () => {
  let drifts = 0, minis = 0, wide = 0, n = 0;
  for (let seed = 1; seed < 60 && n < 6; seed++) {
    const s = go(fresh(6, seed)), g = R.geo(s);
    const nt = g.notes.find((q) => q.kind === 'curve' && q.g === 3 && q.R < 58 && q.ang > 60 && q.at > 200 && !q.bank);
    if (!nt) continue;
    n++;
    park(s, 1, 2, 3);
    const c = s.cars[0], vIn = Math.min(R.config(6).vmax, 1.2 * Math.sqrt(R.GRIP * g.c.grip * nt.R));
    // dentro la curva sterzando tutto: il kart non riesce a seguirla (va largo) e derapa
    c.s = nt.at - 30; c.d = 0; c.v = vIn;
    const ev = [];
    let dMax = 0;
    for (let i = 0; i < 60 * 6 && c.s < nt.end + 30; i++) {
      // vuole stare in mezzo: curvatura della strada + correzione su scostamento e direzione
      const steer = Math.max(-1, Math.min(1, -(R.kAt(g, c.s + 3) - c.d * 0.03 - (c.psi - c.bet) * 0.25) / R.KMAX));
      ev.push(...R.tick(s, { steer, gas: 1, brake: 0 }));
      if (c.s < nt.end) dMax = Math.max(dMax, -nt.dir * c.d);
    }
    if (ev.some((e) => e.type === 'drift')) drifts++;
    if (ev.some((e) => e.type === 'mini')) minis++;
    if (dMax > 1.5) wide++;
    if (process.env.RALLY_STATS) console.log(`seme ${seed} R ${nt.R} v ${vIn.toFixed(1)} largo ${dMax.toFixed(2)} m ${ev.filter((e) => ['drift', 'mini', 'off', 'spin'].includes(e.type)).map((e) => e.type).join(',')}`);
    // la stessa curva frenando prima: niente fuori strada
    const s2 = go(fresh(6, seed)); park(s2, 1, 2, 3);
    const c2 = s2.cars[0];
    c2.s = nt.at - 30; c2.d = 0; c2.v = vIn;
    const ev2 = [];
    for (let i = 0; i < 60 * 8 && c2.s < nt.end + 10; i++) {
      const steer = Math.max(-1, Math.min(1, -(R.kAt(g, c2.s + 4) - c2.d * 0.02 - c2.psi * 0.08) / R.KMAX));
      ev2.push(...R.tick(s2, { steer, gas: c2.v > 0.92 * Math.sqrt(R.GRIP * g.c.grip * nt.R) ? 0 : 1, brake: c2.v > Math.sqrt(R.GRIP * g.c.grip * nt.R) ? 1 : 0 }));
    }
    assert.ok(!ev2.some((e) => e.type === 'off' || e.type === 'rescue'), `seme ${seed}: frenando si resta in strada`);
  }
  assert.ok(n >= 4 && drifts >= n - 1 && wide >= n - 1, `derapate ${drifts}/${n}, larghi ${wide}/${n}`);
  // chi entra appena un po' più veloce e tiene lo sterzo dentro (senza esagerare) derapa e all'uscita ha la mini-spinta
  for (let seed = 1; seed < 40; seed++) {
    const s = go(fresh(6, seed)), g = R.geo(s);
    const nt = g.notes.find((q) => q.kind === 'curve' && q.g >= 3 && q.g <= 4 && q.ang > 70 && q.at > 200 && !q.bank);
    if (!nt) continue;
    park(s, 1, 2, 3);
    const c = s.cars[0];
    c.s = nt.at - 30; c.d = 0; c.v = Math.min(R.config(6).vmax, 1.2 * Math.sqrt(R.GRIP * g.c.grip * nt.R));
    const ev = [];
    for (let i = 0; i < 60 * 6 && c.s < nt.end + 30; i++) ev.push(...R.tick(s, { steer: Math.max(-1, Math.min(1, -R.kAt(g, c.s + 4) * 1.35 / R.KMAX)), gas: 1, brake: 0 }));
    if (ev.some((e) => e.type === 'mini')) minis++;
    if (seed > 12) break;
  }
  assert.ok(minis >= 2, `mini-spinte ${minis}`);
  // la mini-spinta: un po' più di velocità massima per un attimo
  const s = go(fresh(3, 2)), c = s.cars[0];
  park(s, 1, 2, 3);
  c.s = 200; c.v = 20; c.mini = R.DRIFT.T2;
  const v = c.v;
  R.tick(s, { steer: 0, gas: 1, brake: 0 });
  assert.ok(c.mini > 0 && c.v > v);
  // tanta deriva: sbandata (giro buffo, si rallenta)
  c.bet = R.DRIFT.spin + 0.05; c.v = 20;
  const e = R.tick(s, { steer: 0, gas: 1, brake: 0 });
  assert.ok(e.some((x) => x.type === 'spin') && c.slip > 0 && c.v < 14);
});

test('hitbox coerenti con la grafica: kart, ostacoli, muri e imbuti usano le misure e la posa della logica', () => {
  const ui = fs.readFileSync(path.join(root, 'src/games/rally-ui.js'), 'utf8');
  // kart costruiti con P.CAR_L × P.CAR_W e messi nella posa della logica (P.pose); ostacoli col loro raggio; bordi e imbuti
  for (const k of ['P.CAR_L', 'P.CAR_W', 'P.pose(g, c)', 'rk.r', 'pr.r', 'P.edgeAt', 'P.sideAt', 'P.RAIL', 'P.TUBE', 'P.FUN', 'P.PU.boxR', 'P.PU.honeyR', 'P.PU.bananaR']) assert.ok(ui.includes(k), `la grafica non usa ${k}`);
  // visuale pilota: la camera è dietro il centro del kart in modo che il bordo del cofano coincida col muso del rettangolo
  assert.ok(/EYE_BACK\s*=\s*2\.9\s*-\s*P\.CAR_L\s*\/\s*2/.test(ui));
  // gli ostacoli della fascia fuori strada stanno tra PROP_IN e il limite, mai sulla carreggiata
  for (const L of [1, 4, 5, 7, 8]) {
    const g = R.track(4000 + L, L);
    for (const pr of g.props) {
      assert.ok(Math.abs(pr.d) - pr.r >= R.PROP_IN - 1e-6 && Math.abs(pr.d) + pr.r <= R.sideAt(g, pr.s, Math.sign(pr.d)).lim, `L${L}: ostacolo ${pr.k} a d = ${pr.d}`);
      const w = R.world(g, pr.s, pr.d);
      assert.ok(Math.hypot(w.x - pr.x, w.y - pr.y) < 1e-9);
    }
    if (!R.config(L).hard) assert.ok(g.props.length > g.L / 40, `L${L}: ${g.props.length} ostacoli`);
  }
});

test('power-up: turbo carota, scudo-bolla, buccia, miele, nuvoletta di fiori, calamita e molla', () => {
  const setup = () => { const s = go(fresh(3, 21)); park(s, 1, 2, 3); s.cars[0].s = 200; s.cars[0].d = 0; s.cars[0].v = 18; return s; };
  const give = (s, name, id = 0) => { s.cars[id].it = R.ITEMS.indexOf(name); };
  const vmax = R.config(3).vmax;
  // turbo: oltre la velocità massima per un po'
  let s = setup();
  give(s, 'carrot');
  let ev = R.tick(s, { steer: 0, brake: 0, use: 1 });
  assert.ok(ev.some((e) => e.type === 'use' && e.it === 'carrot') && s.cars[0].it === 0);
  let vTop = 0;
  for (let i = 0; i < 100; i++) { R.tick(s, { steer: 0, brake: 0 }); vTop = Math.max(vTop, s.cars[0].v); }
  assert.ok(vTop > vmax * 1.08, `turbo ${vTop.toFixed(1)} m/s`);
  // buccia: lasciata dietro; chi ci passa sopra scivola e rallenta un po'
  s = setup();
  give(s, 'banana');
  R.tick(s, { steer: 0, brake: 0, use: 1 });
  assert.equal(s.hz.length, 1);
  const hz = s.hz[0];
  assert.ok(hz.s < s.cars[0].s - R.CAR_L / 2 && !R.hitCircle(s.cars[0], hz.s, hz.d, R.PU.bananaR), 'la buccia non tocca chi la lascia');
  const B = s.cars[1]; B.s = hz.s - 8; B.d = hz.d; B.v = 16; B.skill = 0.9;
  ev = run(s, 1.2, { steer: 0, brake: 0 });
  const sl = ev.find((e) => e.type === 'slip');
  assert.ok(sl && sl.who === 1 && sl.by === 0 && s.hz.length === 0);
  // con lo scudo-bolla la buccia non fa niente (e lo scudo scoppia)
  s = setup();
  s.hz.push({ k: 'b', s: 210, d: 0, t: 99, by: 2, n: 0 });
  give(s, 'bubble');
  R.tick(s, { steer: 0, brake: 0, use: 1 });
  assert.ok(s.cars[0].sh > 0);
  ev = run(s, 1, { steer: 0, brake: 0 });
  assert.ok(ev.some((e) => e.type === 'pop') && !ev.some((e) => e.type === 'slip'));
  // miele: dentro la pozza si va piano
  s = setup();
  s.hz.push({ k: 'h', s: 215, d: 0, t: 99, by: 2, n: 0 });
  let vMin = 99;
  ev = run(s, 1.4, (q) => { vMin = Math.min(vMin, q.cars[0].v); return { steer: 0, brake: 0 }; });
  assert.ok(ev.some((e) => e.type === 'honey' && e.who === 0));
  assert.ok(vMin < vmax * R.PU.honeyV + 1.5, `nel miele ${vMin.toFixed(1)} m/s`);
  // nuvoletta: vola fino a chi è davanti e lo rallenta un po' (solo un po')
  s = setup();
  const F = s.cars[2]; F.s = 260; F.d = 1; F.v = 19; F.skill = 1;
  give(s, 'cloud');
  R.tick(s, { steer: 0, brake: 0, use: 1 });
  assert.equal(s.cl[0].to, 2);
  ev = run(s, 8, { steer: 0, brake: 0 });
  const cl = ev.find((e) => e.type === 'cloud');
  assert.ok(cl && cl.who === 2 && cl.by === 0);
  // calamita: le ghiande arrivano da qualche metro di lato
  s = setup();
  const g = R.geo(s), a0 = g.acorns.findIndex((a) => a.s > 260);
  const ac = g.acorns[a0];
  s.cars[0].s = ac.s - 30; s.cars[0].d = ac.d > 0 ? ac.d - 4.2 : ac.d + 4.2;
  give(s, 'magnet');
  R.tick(s, { steer: 0, brake: 0, use: 1 });
  ev = run(s, 2.5, (q) => ({ steer: 0, brake: 0 }));
  assert.ok(R.acornTaken(s, a0) && s.cars[0].ac > 0, 'ghianda attirata dalla calamita');
  // molla: un saltino che passa sopra la buccia e sopra le altre auto
  s = setup();
  s.hz.push({ k: 'b', s: 212, d: 0, t: 99, by: 2, n: 0 });
  const O = s.cars[3]; O.s = 210; O.d = 0.4; O.v = 12; O.skill = 0.5;
  give(s, 'spring');
  ev = R.tick(s, { steer: 0, brake: 0, use: 1 });
  assert.ok(ev.some((e) => e.type === 'spring') && s.cars[0].air > 0);
  ev = run(s, 0.7, { steer: 0, brake: 0 });
  assert.ok(!ev.some((e) => e.type === 'slip' && e.who === 0) && !ev.some((e) => e.type === 'bump'));
});

test('scatole-sorpresa e bilanciamento: chi è dietro trova power-up migliori, gli avversari li usano', () => {
  // pesi: dal 1° al 4° crescono turbo, nuvoletta e molla; il primo non trova mai la nuvoletta
  const good = (row) => row[0] + row[4] + row[6], sum = (row) => row.reduce((a, b) => a + b, 0);
  for (let p = 2; p <= 4; p++) assert.ok(good(R.IW[p]) / sum(R.IW[p]) > good(R.IW[p - 1]) / sum(R.IW[p - 1]));
  assert.equal(R.IW[1][4], 0);
  // una scatola si raccoglie passandoci sopra, poi ricompare dopo qualche secondo
  const s = go(fresh(4, 2)), g = R.geo(s), b0 = g.boxes[0];
  park(s, 1, 2, 3);
  s.cars[0].s = b0.s - 10; s.cars[0].d = b0.row[1]; s.cars[0].v = 15;
  const ev = run(s, 1.2, { steer: 0, brake: 0 });
  const got = ev.find((e) => e.type === 'box' && e.who === 0);
  assert.ok(got && R.ITEMS.includes(got.it) && got.it && s.cars[0].it > 0);
  assert.ok(s.bx.length >= 1 && s.bx[0][1] > s.t);
  // in gara gli avversari raccolgono e usano i power-up, e ci sono scherzetti in entrambe le direzioni
  let aiUse = 0, onHari = 0, byHari = 0;
  for (let k = 0; k < 4; k++) {
    const r = fresh(8, 8000 + k);
    for (const e of play(r, { seed: k })) {
      if (e.type === 'use' && e.who) aiUse++;
      if (['slip', 'cloud', 'honey'].includes(e.type)) { if (e.who === 0) onHari++; if (e.by === 0) byHari++; }
    }
  }
  assert.ok(aiUse >= 8 && onHari >= 1 && byHari >= 1, `usi degli avversari ${aiUse}, su Hari ${onHari}, di Hari ${byHari}`);
  // livello 1: gli avversari trovano pochi power-up "dispettosi"
  assert.ok(R.config(1).aiItem < 0.5 && R.config(10).aiItem === 1);
});

test('sorpassi degli avversari: chi è più veloce passa di lato senza tamponare né attraversare', () => {
  const s = go(fresh(5, 31)), g = R.geo(s);
  park(s, 0, 3);
  // un tratto dritto
  let s0 = g.S0 + 100;
  for (let i = g.S0 + 60; i < g.S1 - 300; i++) { let ok = true; for (let j = i; j < i + 220; j += 5) if (Math.abs(g.k[j]) > 1 / 250) { ok = false; break; } if (ok) { s0 = i; break; } }
  const slow = s.cars[1], fast = s.cars[2];
  slow.s = s0 + 25; slow.d = g.line[s0 + 25]; slow.v = 10; slow.skill = 0.42; slow.lane = 0; slow.err = 0;
  fast.s = s0; fast.d = slow.d; fast.v = 18; fast.skill = 1; fast.lane = 0;
  let passed = false, maxDepth = 0;
  for (let t = 0; t < 12 && !passed; t += R.TICK) {
    R.tick(s, { steer: 0, brake: 1 });
    maxDepth = Math.max(maxDepth, sepDepth(slow, fast));
    if (fast.s > slow.s + R.CAR_L + 1) passed = true;
  }
  assert.ok(passed, 'sorpasso riuscito');
  assert.ok(maxDepth < 0.01, `compenetrazione ${maxDepth.toFixed(3)} m`);
});

test('determinismo e ripresa da JSON: stessa partita con lo stesso seme, salvataggio a metà gara identico', () => {
  const inp = (s) => ({ steer: Math.sin(s.t * 0.9) * 0.5, brake: Math.sin(s.t * 0.37) > 0.92 ? 1 : 0, use: Math.sin(s.t * 1.3) > 0.97 ? 1 : 0 });
  const a = fresh(7, 42), b = fresh(7, 42);
  run(a, 25, inp); run(b, 25, inp);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const c = JSON.parse(JSON.stringify(a));
  run(a, 20, inp); run(c, 20, inp);
  assert.equal(JSON.stringify(a), JSON.stringify(c));
  assert.ok(a.cars[0].s > R.PREROLL + 100);
});

test('salvataggi delle versioni precedenti: migrate() porta v1 e v2 alla v3 (kart nuovi, bordi nuovi) e la gara riprende', () => {
  const s = fresh(3, 12);
  run(s, 12, { steer: 0.05, brake: 0 });
  // un salvataggio v2 (auto 4 × 1,96 m, niente derapata né nuvoletta) e uno v1 (anche senza power-up)
  const V2 = ['id', 's', 'd', 'psi', 'v', 'pd', 'air', 'airT', 'off', 'kc', 'slide', 'fin', 'skill', 'lane', 'err', 'errK', 'errD', 'bump', 'wall',
    'it', 'hold', 'ac', 'boost', 'sh', 'slip', 'slow', 'mag', 'spr', 'ovS', 'ovT', 'use'];
  const V1 = V2.slice(0, 19);
  for (const [ver, keep] of [[2, V2], [1, V1]]) {
    const old = JSON.parse(JSON.stringify(s));
    old.v = ver; delete old.nres;
    if (ver === 1) { delete old.hz; delete old.cl; delete old.bx; delete old.ag; delete old.chk; delete old.nhz; }
    old.cars = old.cars.map((c) => Object.fromEntries(keep.map((k) => [k, c[k]])));
    old.cars[1].d = 9.5;   // fuori dai bordi nuovi
    old.cars[2].s = old.cars[3].s + 0.5; old.cars[2].d = old.cars[3].d;   // due kart uno sull'altro
    const m = R.migrate(old);
    assert.equal(m.v, 3);
    assert.ok(Array.isArray(m.hz) && m.cars.every((c) => c.bet === 0 && c.res === 0 && c.dr === 0 && c.mini === 0), `v${ver}: campi nuovi`);
    const g = R.geo(m);
    assert.ok(m.cars.every((c) => Math.abs(c.d) + R.extent(c.psi) <= Math.min(R.sideAt(g, c.s, 1).lim, R.sideAt(g, c.s, -1).lim) + 1e-6), `v${ver}: dentro i bordi`);
    assert.ok(sepW(cornersW(wpose(g, m.cars[2])), cornersW(wpose(g, m.cars[3]))) < 0.015, `v${ver}: separati`);
    const s0 = m.cars[0].s;
    run(m, 10, { steer: 0, brake: 0 });
    assert.ok(m.cars[0].s > s0 + 50, `v${ver}: la gara riprende`);
    assert.equal(R.migrate(m).v, 3);
  }
  assert.equal(R.migrate({ v: 7, cars: [] }), null);
  assert.equal(R.migrate({ v: 2, cars: [1, 2] }), null);
  assert.equal(R.migrate(null), null);
});

test('conto alla rovescia 3-2-1-via, checkpoint, sorpassi contati, fragoline per posizione', () => {
  const s = fresh(1, 11);
  const ev = run(s, R.READY + 0.2, null);
  assert.deepEqual(ev.filter((e) => e.type === 'count').map((e) => e.n), [3, 2, 1]);
  assert.equal(ev.filter((e) => e.type === 'go').length, 1);
  assert.equal(s.pos, 4, 'Hari parte ultimo');
  const s2 = fresh(1, 12);
  const ev2 = play(s2, { seed: 4 });
  assert.ok(s2.moves >= ev2.filter((e) => e.type === 'pass' && e.up).length, 'mosse = posizioni guadagnate');
  assert.ok(s2.moves >= 3);
  assert.deepEqual(ev2.filter((e) => e.type === 'check').map((e) => e.n), [1, 2]);
  for (const [pos, st] of [[1, 3], [2, 2], [3, 1], [4, 0]]) assert.equal(R.rate({ pos }), st);
  assert.ok(R.par(s2) > 40 && R.par(s2) < 200);
});

test('curva di difficoltà monotona (≥ 4 gradini): tappe più lunghe e tortuose, più veloci, avversari più bravi, meno aiuti', () => {
  let prev = null;
  const tiers = new Set();
  for (let L = 1; L <= 24; L++) {
    const c = R.config(L);
    tiers.add(c.tier);
    if (prev) {
      assert.ok(c.len >= prev.len && c.vmax >= prev.vmax, `livello ${L}`);
      assert.ok(c.minGrade <= prev.minGrade && c.curvy >= prev.curvy);
      assert.ok(c.ai.every((v, i) => v >= prev.ai[i]) && c.aiTop >= prev.aiTop && c.aiItem >= prev.aiItem, `avversari al livello ${L}`);
      assert.ok(c.aiErr <= prev.aiErr && c.assist <= prev.assist);
      assert.ok(c.straight[1] <= prev.straight[1]);
    }
    prev = c;
  }
  assert.ok(tiers.size >= 4);
  // il livello 1 resta abbordabile: avversari più lenti, più errori, niente curve sotto la gravità 3
  const c1 = R.config(1);
  assert.ok(c1.ai[2] <= 0.85 && c1.aiErr >= 1.2 && c1.minGrade === 3 && c1.tight === 0);
});

test('tempi: generazione < 10 ms, un minuto di gara simulato (con power-up) < 150 ms', () => {
  for (const level of [1, 5, 10, 16]) {
    let ms = 0;
    for (let k = 0; k < 8; k++) { const t = performance.now(); R.track(level * 13 + k + 9000, level); ms += performance.now() - t; }
    assert.ok(ms / 8 < 10 * SLOW, `livello ${level}: generazione ${(ms / 8).toFixed(1)} ms`);
    const s = fresh(level, 3);
    const bot = makeBot(s, { seed: 1 });
    const t = performance.now();
    for (let q = 0; q < 60 * 60 + 200 && !R.isOver(s); q++) R.step(s, DT, bot());
    const sim = performance.now() - t;
    assert.ok(sim < 150 * SLOW, `livello ${level}: 1 minuto in ${sim.toFixed(0)} ms`);
  }
});

test('stato JSON puro e piccolo (la pista non si salva: si rigenera dal seme)', () => {
  const s = fresh(9, 8);
  play(s, { seed: 1 }, 40);
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(s))), JSON.stringify(s));
  assert.ok(JSON.stringify(s).length < 4500, `${JSON.stringify(s).length} byte`);
  assert.equal(R.geo(JSON.parse(JSON.stringify(s))), R.geo(s));
  assert.ok(R.progress(s) >= 0 && R.progress(s) < 1);
});
