// Bot di Hari Snack Rush per i test: guarda solo lo stato pubblico ogni `react` secondi (tempi di reazione umani)
// e non chiama le funzioni del generatore. Le operazioni delle porte hanno un oracolo scritto qui.
//   smart: sceglie la porta migliore anche se presidiata (schiva gli ostacoli e si infila), prende i power-up,
//          rimanda indietro le grandi merende se ce la fa, altrimenti cerca un varco.
//   lazy:  prende sempre la porta più comoda (la corsia libera da ostacoli, a parità quella dove già si trova),
//          ignora i power-up; per il resto gioca come smart (schiva, sfama, rimanda).
//   random: sceglie il lato delle porte a caso.
export function snackBot(HH) {
  const S = HH.snack;
  const DT = 1 / 60;

  function gateOp(power, op, max) {
    const n = Number(op.slice(1));
    let v;
    if (op[0] === 'x') v = power * n;
    else if (op[0] === '+') v = power + n;
    else if (op[0] === '-') v = power - n;
    else if (op[0] === '/') v = Math.ceil(power / n);
    else throw new Error(`porta sconosciuta ${op}`);
    return Math.max(1, Math.min(max, v));
  }
  const goodOp = (op) => op[0] === 'x' || op[0] === '+';
  const clampX = (x) => Math.max(-0.82, Math.min(0.82, x));

  // il punto libero più comodo, dati dei "pericoli" { x, R } (Hari non deve stare a meno di R da x)
  // con un pericolo imminente (lock) non si attraversa la sua zona per arrivarci
  function safest(bad, from, want, lock = false) {
    if (!bad.length) return want;
    const ok = (x) => bad.every((b) => Math.abs(b.x - x) >= b.R);
    const path = (x) => { if (!lock) return true; for (let k = 0; k <= 10; k++) if (!ok(from + ((x - from) * k) / 10)) return false; return true; };
    if (ok(want) && path(want)) return want;
    let best = null;
    for (let x = -0.8; x <= 0.8001; x += 0.02) {
      if (!ok(x) || !path(x)) continue;
      const c = Math.abs(x - from) * 0.6 + Math.abs(x - want);
      if (!best || c < best.c) best = { x, c };
    }
    return best ? best.x : want;
  }

  function decide(s, rnd, o, mem) {
    const sp = s.speed, mode = o.mode;
    const iv = s.fx && s.fx.rapid > 0 ? S.TOSS_IV / 2 : S.TOSS_IV;
    let want;
    const obst = (s.obst || []).map((q) => ({ x: q.x, R: S.OBST[q.kind].r + S.HARI_R + 0.07, ta: (q.z - S.LINE_Z) / (sp * S.OBST[q.kind].v) }));
    const balls = (s.balls || []).filter((q) => !q.back).sort((a, b) => a.z - b.z);
    const g = s.gates.filter((x) => x.z < 11).sort((a, b) => a.z - b.z)[0];
    if (balls.length) {
      // grande merenda: rimandarla se si riesce, altrimenti un varco
      const q = balls[0], tA = (q.z - S.LINE_Z) / q.v;
      const frac = q.r >= 0.6 ? 0.95 : q.r >= 0.4 ? 0.8 : 0.6;
      const can = (s.power * (tA - 0.25) / iv) * frac >= q.hp * 1.05;
      const soon = balls.filter((b) => (b.z - S.LINE_Z) / b.v < tA + 0.8).map((b) => ({ x: b.x, R: b.r + S.HARI_R + 0.06 }));
      if (can) want = q.x + q.vx * 0.15;
      else {
        want = safest(soon, s.px, q.x);
        if (soon.every((b) => Math.abs(b.x - want) < b.R)) want = q.x;   // nessun varco: si prova comunque
      }
    } else if (g) {
      const val = (op) => (op ? gateOp(s.power, op, s.pmax) : s.power);
      const l = val(g.l), r = val(g.r);
      const tg = (g.z - S.LINE_Z) / sp;
      let side;
      if (mode === 'random') {
        if (!mem.has(g.id)) mem.set(g.id, rnd() < 0.5 ? -1 : 1);
        side = mem.get(g.id);
      } else if (mode === 'lazy') {
        // la corsia senza ostacoli prima della porta; a parità, quella dove si trova già
        const blocked = (sg) => obst.some((b) => b.ta < tg + 0.05 && Math.abs(b.x - sg * 0.42) < b.R + 0.2);
        const bl = blocked(-1), br = blocked(1);
        side = bl && !br ? 1 : br && !bl ? -1 : s.px < 0 ? -1 : 1;
        if (mem.has(g.id)) side = mem.get(g.id); else mem.set(g.id, side);
      } else side = l > r ? -1 : r > l ? 1 : s.px < 0 ? -1 : 1;
      want = side * 0.42;
    } else {
      const pu = mode === 'smart' ? (s.pus || []).filter((p) => p.z < 9).sort((a, b) => a.z - b.z)[0] : null;
      const near = s.animals.filter((a) => a.z < 24).sort((a, b) => a.z - b.z)[0];
      if (pu && (!near || near.z > 3)) want = pu.x;
      else if (near) want = near.x + near.vx * 0.3;
      else if (s.boss) want = s.boss.x;
      else want = s.px;
    }
    // ostacoli che arrivano entro ~1 s: fuori dalla loro corsia
    const soonO = obst.filter((b) => b.ta < 1.05);
    if (soonO.length) want = safest(soonO, s.px, want);
    // soffi dell'animalone: lontano dai cerchietti
    const lands = s.drops.map((q) => ({ x: q.land, R: S.DROP_R + 0.12 }));
    if (lands.length) want = safest([...lands, ...soonO], s.px, want, s.drops.some((q) => q.z < 4.5) && lands.every((b) => Math.abs(b.x - s.px) >= b.R));
    want += (rnd() - 0.5) * o.noise;
    return clampX(want);
  }

  function play(s, { react = 0.3, noise = 0.06, seed = 1, limit = 400, mode = 'smart' } = {}) {
    const rnd = HH.rng(seed);
    const o = { noise, mode }, mem = new Map();
    let t = 0, next = 0, target = 0;
    const events = [];
    for (let f = 0; f < limit * 60 && !S.isOver(s); f++) {
      t += DT;
      if (t >= next) { next = t + react; target = decide(s, rnd, o, mem); }
      for (const e of S.step(s, DT, { x: target })) events.push(e);
    }
    return events;
  }
  return { gateOp, goodOp, decide, play };
}
