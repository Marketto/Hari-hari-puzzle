// Unit test Hari Rally: pista sempre percorribile (curvatura entro i limiti, nessun tratto che si riavvicina), note del
// navigatore coerenti con la curvatura misurata da un oracolo indipendente (cerchio per tre punti), un bot pilota con
// reazioni umane chiude tra i primi 3 i livelli 1–10 su più semi, avversari che finiscono sempre la gara, determinismo
// e ripresa da JSON, difficoltà monotona, fisica (fuori strada rallenta, il freno rallenta, nessun danno), tempi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
import { botKit } from './_rally-bot.mjs';
// i server di GitHub sono più lenti e variabili: i limiti di tempo valgono il triplo in CI
const SLOW = process.env.CI ? 3 : 1;

const HH = load('src/core/rng.js', 'src/games/rally-logic.js');
const R = HH.rally;
const { radius, play, DT } = botKit(HH);
const fresh = (level, seed) => R.newLevel(level, HH.rng(seed));
const run = (s, sec, inp) => { const ev = []; for (let t = 0; t < sec && !R.isOver(s); t += DT) ev.push(...R.step(s, DT, typeof inp === 'function' ? inp(s) : inp)); return ev; };
const go = (s) => { s.ready = 0; s.cd = 0; return s; };

/* ---------- oracoli sulla geometria (solo i punti x, y) ---------- */
// raggio puntuale dal cerchio per tre punti a ±h metri
function rad3(g, i, h = 3) {
  const ax = g.x[i - h], ay = g.y[i - h], bx = g.x[i], by = g.y[i], cx = g.x[i + h], cy = g.y[i + h];
  const a = Math.hypot(bx - cx, by - cy), b = Math.hypot(ax - cx, ay - cy), c = Math.hypot(ax - bx, ay - by);
  const cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return { R: Math.abs(cr) < 1e-9 ? 1e9 : (a * b * c) / (2 * Math.abs(cr)), dir: Math.sign(cr) };
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
      if (level <= 2) assert.ok(minR >= 38, `livello ${level}: niente curve strette (${minR.toFixed(1)} m)`);
      // auto-intersezioni: punti a più di 160 m di pista l'uno dall'altro restano lontani (forza bruta, ogni 4 m)
      for (let i = 0; i <= g.N; i += 4) for (let j = i + 164; j <= g.N; j += 4) {
        const dd = Math.hypot(g.x[i] - g.x[j], g.y[i] - g.y[j]);
        assert.ok(dd >= 30, `livello ${level}: ${i} m e ${j} m distano ${dd.toFixed(1)} m`);
      }
    }
  }
});

test('note del navigatore coerenti con la curvatura: verso, gravità dal raggio minimo, ogni curva vera ha la sua nota', () => {
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
      // copertura: ogni punto con raggio < 140 m è dentro una nota di curva con lo stesso verso
      for (let i = R.PREROLL; i <= R.PREROLL + s.L; i++) {
        const q = rad3(g, i);
        if (q.R >= 130) continue;
        assert.ok(curves.some((n) => n.at <= i + 3 && n.end >= i - 3 && n.dir === q.dir), `livello ${level}: curva a ${i} m (R ${q.R.toFixed(0)}) senza nota`);
      }
      // dossi e ponti hanno la loro nota; le rocce stanno all'interno di curve "non tagliare"
      assert.equal(g.notes.filter((n) => n.kind === 'crest').length, g.crests.length);
      assert.equal(g.notes.filter((n) => n.kind === 'bridge').length, g.bridges.length);
      for (const rk of g.rocks) {
        const n = curves.find((c) => c.at <= rk.s && c.end >= rk.s);
        assert.ok(n && n.nocut && Math.sign(rk.d) === n.dir, 'roccia all\'interno di una curva segnalata');
      }
      // le note in ordine e chiamate in anticipo durante la gara
      for (let j = 1; j < g.notes.length; j++) assert.ok(g.notes[j].at >= g.notes[j - 1].at);
    }
  }
});

test('il navigatore legge ogni nota prima di arrivarci (nell\'ordine), e upcoming() mostra la prossima', () => {
  const s = fresh(6, 9), g = R.geo(s);
  const bot = botKit(HH).makeBot(s, { seed: 2 });
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
});

test('il bot pilota (reazione ~0,22 s) chiude tra i primi 3 i livelli 1–10 su 4 semi; al livello 1 vince sempre', () => {
  const stats = [];
  for (let level = 1; level <= 10; level++) {
    for (let k = 0; k < 4; k++) {
      const s = fresh(level, level * 1000 + k);
      play(s, { seed: level * 7 + k });
      stats.push(`L${level}.${k} ${s.pos}° ${s.fin.toFixed(0)} s`);
      assert.ok(R.isOver(s), `livello ${level}: gara non finita`);
      assert.ok(s.pos <= 3 && R.isWon(s), `livello ${level} seme ${k}: ${s.pos}° (${s.res.map((r) => `${R.WHO[r.id]} ${r.t.toFixed(1)}`).join(', ')})`);
      if (level === 1) assert.equal(s.pos, 1, `livello 1: ${s.pos}°`);
      assert.equal(R.progress(s), 1);
      assert.equal(R.rate(s), 4 - s.pos);
    }
  }
  if (process.env.RALLY_STATS) console.log(stats.join('\n'));
});

test('livello 1: corto (tra 1 e 2 minuti) e facile anche per un pilota lento e impreciso', () => {
  for (let k = 0; k < 5; k++) {
    const s = fresh(1, 70 + k);
    play(s, { react: 0.45, grip: 6.5, wobble: 0.35, seed: k });
    assert.ok(R.isWon(s), `seme ${k}: ${s.pos}°`);
    assert.ok(s.fin > 55 && s.fin < 120, `durata ${s.fin.toFixed(1)} s`);
  }
  for (let level = 2; level <= 4; level++) {
    const s = fresh(level, 500 + level);
    play(s, { react: 0.4, grip: 7, wobble: 0.25, seed: level });
    assert.ok(R.isWon(s), `livello ${level}: ${s.pos}°`);
  }
});

test('gli avversari finiscono sempre la gara (anche con Hari fermo al via) e la classifica finale è completa', () => {
  for (const level of [1, 5, 10, 15]) {
    for (let k = 0; k < 3; k++) {
      const s = go(fresh(level, level * 17 + k));
      // Hari frena sempre: resta fermo alla partenza
      run(s, 400, { steer: 0, brake: 1 });
      const ai = s.cars.filter((c) => c.id);
      assert.ok(ai.every((c) => c.fin > 0), `livello ${level}: qualcuno non è arrivato`);
      assert.ok(!R.isOver(s));
      for (const c of ai) assert.ok(Math.abs(c.d) <= R.WALL + 1e-9);
      const times = ai.map((c) => c.fin);
      assert.ok(Math.max(...times) < 3.2 * s.L / R.config(level).vmax, 'tempi ragionevoli');
    }
  }
  // gara finita da Hari: la classifica finale contiene tutti con un tempo
  const s = fresh(3, 5);
  play(s, { seed: 3 });
  assert.equal(s.res.length, 4);
  assert.ok(s.res.every((r, i) => r.t > 0 && (i === 0 || r.t >= s.res[i - 1].t)));
  assert.equal(s.res.findIndex((r) => r.id === 0) + 1, s.pos);
});

test('determinismo e ripresa da JSON: stessa partita con lo stesso seme, salvataggio a metà gara identico', () => {
  const inp = (s) => ({ steer: Math.sin(s.t * 0.9) * 0.5, brake: Math.sin(s.t * 0.37) > 0.92 ? 1 : 0 });
  const a = fresh(7, 42), b = fresh(7, 42);
  run(a, 25, inp); run(b, 25, inp);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const c = JSON.parse(JSON.stringify(a));
  run(a, 20, inp); run(c, 20, inp);
  assert.equal(JSON.stringify(a), JSON.stringify(c));
  assert.ok(a.cars[0].s > R.PREROLL + 100);
});

test('fisica: il freno rallenta, fuori strada si rallenta molto, il bosco rimbalza morbido, mai al contrario', () => {
  // freno
  const s = go(fresh(4, 3));
  run(s, 4, { steer: 0, brake: 0 });
  const v0 = s.cars[0].v;
  assert.ok(v0 > 14, `accelerazione automatica: ${v0.toFixed(1)} m/s`);
  run(s, 0.5, { steer: 0, brake: 1 });
  assert.ok(s.cars[0].v < v0 - 5, 'il freno rallenta');
  // fuori strada: sull'erba la velocità scende sotto il limite
  const t = go(fresh(4, 3)), p = t.cars[0];
  run(t, 4, null);
  p.d = R.HALF + 2; p.psi = 0;
  const ev = run(t, 2.5, (q) => ({ steer: 0, brake: 0 }));
  assert.ok(ev.some((e) => e.type === 'off'));
  if (Math.abs(p.d) > R.HALF + R.SHOULDER) assert.ok(p.v <= R.config(4).vmax * R.OFFCAP + 0.3, `fuori strada ${p.v.toFixed(1)} m/s`);
  // sterzo tutto da una parte: si arriva al bosco, "boing", si resta entro il bordo e si continua ad andare avanti
  const u = go(fresh(4, 8)), q = u.cars[0];
  run(u, 3, null);
  const s0 = q.s;
  const ev2 = run(u, 6, { steer: 1, brake: 0 });
  assert.ok(ev2.some((e) => e.type === 'boing'), 'rimbalzo sul bordo');
  assert.ok(Math.abs(q.d) <= R.WALL + 1e-9 && Math.abs(q.psi) <= 1 + 1e-9);
  assert.ok(q.s > s0 + 20, 'si va sempre avanti');
  // spintarelle: un'auto ferma davanti non si attraversa
  const w = go(fresh(2, 4));
  w.cars[1].s = w.cars[0].s + 6; w.cars[1].d = w.cars[0].d; w.cars[1].skill = 0.0001; w.cars[1].v = 0;
  const ev3 = run(w, 2, { steer: 0, brake: 0 });
  assert.ok(ev3.some((e) => e.type === 'bump'));
  assert.ok(w.cars[0].s < w.cars[1].s + R.CAR_L || Math.abs(w.cars[0].d - w.cars[1].d) >= R.CAR_W - 1e-6, 'nessuna compenetrazione');
});

test('conto alla rovescia 3-2-1-via, sorpassi contati, fragoline per posizione', () => {
  const s = fresh(1, 11);
  const ev = run(s, R.READY + 0.2, null);
  assert.deepEqual(ev.filter((e) => e.type === 'count').map((e) => e.n), [3, 2, 1]);
  assert.equal(ev.filter((e) => e.type === 'go').length, 1);
  assert.equal(s.pos, 4, 'Hari parte ultimo');
  const s2 = fresh(1, 12);
  const ev2 = play(s2, { seed: 4 });
  assert.ok(s2.moves >= ev2.filter((e) => e.type === 'pass' && e.up).length, 'mosse = posizioni guadagnate');
  assert.ok(s2.moves >= 3);
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
      assert.ok(c.minGrade <= prev.minGrade && c.tight >= prev.tight && c.curvy >= prev.curvy);
      assert.ok(c.ai.every((v, i) => v >= prev.ai[i]), `avversari al livello ${L}`);
      assert.ok(c.aiErr <= prev.aiErr && c.assist <= prev.assist);
      assert.ok(c.straight[1] <= prev.straight[1]);
    }
    prev = c;
  }
  assert.ok(tiers.size >= 4);
  assert.deepEqual([1, 3, 5, 7].map((L) => R.config(L).stage), ['spring', 'autumn', 'snow', 'dusk']);
});

test('tempi: generazione < 10 ms, un minuto di gara simulato < 150 ms', () => {
  for (const level of [1, 5, 10, 16]) {
    let ms = 0;
    for (let k = 0; k < 8; k++) { const t = performance.now(); R.track(level * 13 + k + 9000, level); ms += performance.now() - t; }
    assert.ok(ms / 8 < 10 * SLOW, `livello ${level}: generazione ${(ms / 8).toFixed(1)} ms`);
    const s = go(fresh(level, 3));
    const t = performance.now();
    run(s, 60, { steer: 0.1, brake: 0 });
    const sim = performance.now() - t;
    assert.ok(sim < 150 * SLOW, `livello ${level}: 1 minuto in ${sim.toFixed(0)} ms`);
  }
});

test('stato JSON puro e piccolo (la pista non si salva: si rigenera dal seme)', () => {
  const s = fresh(9, 8);
  run(s, 10, null);
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(s))), JSON.stringify(s));
  assert.ok(JSON.stringify(s).length < 3000);
  assert.equal(R.geo(JSON.parse(JSON.stringify(s))), R.geo(s));
  assert.ok(R.progress(s) >= 0 && R.progress(s) < 1);
});
