// Bot di Hari Snack Street per i test: guarda solo lo stato pubblico ogni `react` secondi (tempi di reazione umani) e
// decide un input (levetta + pressioni) per ogni giocatore umano. Non usa cpuInput() né le funzioni del generatore:
// le regole che gli servono (portata di "porgi", copertura delle angurie, onda del pestone) sono riscritte qui.
//   mode 'smart': schiva (salta angurie e onde, esce dalla fila delle cariche e dalla picchiata), sceglie il bersaglio
//                 più comodo, porge da vicino, lancia alla gazza, usa presa+cesto e speciale, raccoglie le mele.
//   mode 'nojump': come smart ma non salta mai (serve a provare che certi attacchi del boss non si evitano camminando).
export function streetBot(HH) {
  const S = HH.street;
  const DT = 1 / 60;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const REACH = { hari: 1.0, kiki: 0.95 };
  const R = { bunny: 0.3, raccoon: 0.32, boar: 0.38, magpie: 0.28, fox: 0.3, bear: 0.5 };

  function brain(s, i, m, mode) {
    const p = s.players[i];
    const out = { mx: 0, my: 0 };
    const tap = [false, false, false, false];
    if (p.st === 'nap') return { out, tap };
    const jump = () => { if (mode !== 'nojump' && p.z === 0) tap[2] = true; };
    // 1. pericoli che si saltano: angurie nella propria fila, onde del pestone in arrivo
    for (const q of s.melons) if (!q.stop && Math.abs(q.y - p.y) < q.w + 0.05 && q.x > p.x - 0.2 && q.x - p.x < 1.15 + m.react * 3.6) {
      if (q.x - p.x < 0.95) jump();
    }
    for (const w of s.waves2) { const d = Math.hypot(p.x - w.x, (p.y - w.y) * 2.2); if (d - w.r > 0.05 && d - w.r < 0.5) jump(); }
    // 2. pericoli da cui ci si sposta: carica del cinghialotto o del boss nella propria fila, picchiata
    let flee = null;
    const lanes = [];                    // file di profondità da evitare (cariche in arrivo)
    for (const a of s.animals) {
      if (a.st === 'wind' || a.st === 'charge') { lanes.push(a.y); if (Math.abs(a.y - p.y) < 0.75 && (a.st === 'charge' || Math.abs(a.x - p.x) > 1.2)) flee = { y: a.y }; }
      if ((a.st === 'aim' || a.st === 'swoop') && Math.abs((a.tx != null && a.st === 'swoop' ? a.tx : p.x) - p.x) < 0.9 && Math.abs((a.ty != null && a.st === 'swoop' ? a.ty : a.y) - p.y) < 0.8 && a.k === 'magpie') {
        // picchiata: se è bassa la si sfama, altrimenti ci si sposta
        if (a.st === 'aim') flee = { y: p.y, x: a.x, side: 1 };
        else if (a.z < 1.0 && Math.abs(a.y - p.y) < 0.33 && Math.abs(a.x - p.x) < 1.3) {
          // in picchiata bassa davanti: la si sfama (risale), girandosi se serve
          if ((a.x - p.x) * p.face < 0) out.mx = a.x > p.x ? 0.4 : -0.4;
          else if (p.cd <= 0) tap[0] = true;
          return { out, tap };
        } else flee = { y: a.ty, x: a.tx };
      }
    }
    const b = s.boss;
    if (b && ((b.st === 'wind' && b.a === 'charge') || b.st === 'charge')) { lanes.push(b.y); if (Math.abs(b.y - p.y) < b.r * 0.45 + 0.6) flee = { y: b.y }; }
    if (b && b.st === 'dive' && Math.abs(b.tx - p.x) < 1.6 && Math.abs(b.ty - p.y) < 1.2) flee = { y: b.ty, x: b.tx };
    if (flee) {
      if (flee.side) {
        out.mx = p.x < flee.x ? -1 : 1; out.my = 0;
        // contro il bordo della telecamera: ci si sposta in profondità
        if ((out.mx < 0 && p.x < s.cam + 1) || (out.mx > 0 && p.x > s.cam + S.VIEW - 1)) { out.mx = 0; out.my = p.y < 1.5 ? 1 : -1; }
        return { out, tap };
      }
      const up = flee.y < 1.5 ? 1 : -1;
      out.my = up;
      if (flee.x != null) out.mx = p.x < flee.x ? -1 : 1;
      return { out, tap };
    }
    // 2b. morsi in preparazione (si vede la boccuccia aperta): se è davanti a portata lo si sfama (si ferma), se no ci si sposta
    const biters = s.animals.filter((a) => a.st === 'atk' && Math.abs(a.x - p.x) < R[a.k] + 0.9 && Math.abs(a.y - p.y) < 0.5);
    if (biters.length) {
      const front = biters.find((a) => (a.x - p.x) * p.face > 0 && Math.abs(a.x - p.x) < R[a.k] + REACH[p.ch] - 0.05 && Math.abs(a.y - p.y) < 0.3);
      if (front && biters.length === 1 && p.cd <= 0.05) { tap[0] = true; return { out, tap }; }
      const ay = biters.reduce((m, a) => m + a.y, 0) / biters.length;
      out.my = ay > p.y ? -1 : ay < p.y ? 1 : (p.y < 1.5 ? 1 : -1);
      if (p.y < 0.2) out.my = 1; else if (p.y > 2.8) out.my = -1;
      return { out, tap };
    }
    // 3. speciale quando c'è folla o il boss
    const hungry = s.animals.filter((a) => a.st !== 'bye' && a.st !== 'happy' && a.st !== 'held');
    if (p.sp >= 1 && (b || hungry.length >= 2)) tap[3] = true;
    // 4. presa in corso: cesto intero
    if (p.st === 'grab') { tap[0] = true; return { out, tap }; }
    // 5. energia bassa: mela più vicina
    const apple = s.picks.filter((k) => (k.k === 'apple' && p.hp <= 3) || k.k === 'star' || k.k === 'basket').sort((x, y) => Math.abs(x.x - p.x) - Math.abs(y.x - p.x))[0];
    if (apple && Math.abs(apple.x - p.x) < 4 && !(b && b.st === 'suck')) {
      out.mx = clamp((apple.x - p.x) * 3, -1, 1); out.my = clamp((apple.y - p.y) * 3, -1, 1);
      return { out, tap };
    }
    // 6. bersaglio: imbambolato da prendere, poi il più vicino (un po' di preferenza per chi punta proprio me)
    let tgt = null, bd = 1e9;
    for (const a of hungry) {
      if (a.st === 'steal') continue;
      const fly = R[a.k] && a.k === 'magpie' && a.z > 0.7;
      const d = Math.abs(a.x - p.x) + Math.abs(a.y - p.y) * 2 - (a.tg === i ? 0.6 : 0) - (a.st === 'dizzy' ? 1.5 : 0) + (i && s.players.length > 1 ? (a.id % 2 ? 0 : 1.2) : (a.id % 2 ? 1.2 : 0)) * (s.players.length > 1 ? 1 : 0);
      if (d < bd) { bd = d; tgt = { a, x: a.x, y: a.y, r: R[a.k], fly, dizzy: a.st === 'dizzy', steal: a.k === 'raccoon' }; }
    }
    if (!tgt && b && b.st !== 'enter' && b.st !== 'full') tgt = { x: b.x, y: b.y, r: b.r, boss: 1 };
    if (!tgt) {
      if (s.phase === 'walk') out.mx = 1;
      out.my = clamp(((i ? 2 : 1) - p.y) * 2, -1, 1);
      return { out, tap };
    }
    const side = p.x <= tgt.x ? -1 : 1;
    // attenzione ai bordi della telecamera: se il posto è fuori, si passa dall'altro lato
    let sd = side;
    const want = (k) => tgt.x + k * (tgt.r + (tgt.fly ? 2.6 : tgt.boss ? 0.95 : 0.55));
    if (want(sd) < s.cam + 0.4 || want(sd) > s.cam + S.VIEW - 0.4) sd = -sd;
    const gx = tgt.dizzy ? tgt.x + sd * (tgt.r + 0.3) : want(sd);
    let gy = tgt.y;
    if (lanes.some((y) => Math.abs(y - gy) < 0.75)) gy = gy < 1.5 ? gy + 0.9 : gy - 0.9;
    // dall'altra parte dell'animalone: si gira intorno passando lontano in profondità
    if (b && b.st !== 'full' && (p.x - b.x) * (gx - b.x) < 0 && Math.abs(p.x - b.x) < b.r + 1.2) gy = b.y < 1.5 ? Math.min(2.95, b.y + b.r + 0.6) : Math.max(0.05, b.y - b.r - 0.6);
    const dx = gx - p.x, dy = gy - p.y;
    out.mx = Math.abs(dx) < 0.3 ? 0 : clamp(dx * 3, -1, 1);
    out.my = Math.abs(dy) < 0.08 ? 0 : clamp(dy * 4, -1, 1);
    // si passa davanti alla bocca dell'animalone solo dopo essersi spostati abbastanza in profondità
    if (b && b.st !== 'full' && (p.x - b.x) * (gx - b.x) < 0 && Math.abs(p.x - b.x) < b.r + 1.2 && Math.abs(p.y - b.y) < b.r * 0.5 + 0.25) out.mx = (p.x - b.x) * out.mx > 0 ? out.mx : 0;
    const facing = (tgt.x - p.x) * p.face > 0;
    if (!facing && Math.abs(dx) < 0.3) out.mx = tgt.x > p.x ? 0.4 : -0.4;
    if (tgt.dizzy) { out.mx = tgt.x > p.x ? 1 : -1; return { out, tap }; }
    if (b && b.st === 'suck' && tgt.boss) { out.mx = b.x > p.x ? -1 : 1; }
    const inRow = Math.abs(tgt.y - p.y) < (tgt.boss ? 0.45 : 0.3);
    if (p.cd <= 0 && inRow && facing) {
      const d = Math.abs(tgt.x - p.x);
      if (tgt.fly) {
        // niente procioni sulla traiettoria (ruberebbero la merenda)
        const blocked = hungry.some((a) => a.k === 'raccoon' && Math.abs(a.y - p.y) < 0.45 && (a.x - p.x) * p.face > 0 && Math.abs(a.x - p.x) < d);
        if (!blocked) tap[1] = true;
      } else if (d < tgt.r + REACH[p.ch] - 0.05) tap[0] = true;
      else if (!tgt.steal && d < 5 && !hungry.some((a) => a.k === 'raccoon' && Math.abs(a.y - p.y) < 0.45 && (a.x - p.x) * p.face > 0 && Math.abs(a.x - p.x) < d)) tap[1] = true;
    }
    return { out, tap };
  }

  // gioca fino alla fine. humans: indici dei giocatori guidati dal bot (gli altri restano cpu se lo erano)
  function play(s, o = {}) {
    const react = o.react != null ? o.react : 0.2, mode = o.mode || 'smart', maxT = o.maxT || 600;
    const rnd = HH.rng(o.seed || 1);
    const humans = s.players.map((p, i) => i).filter((i) => !s.players[i].cpu);
    const cnt = s.players.map(() => [0, 0, 0, 0]);
    const cur = s.players.map(() => ({ mx: 0, my: 0 }));
    const nextAt = s.players.map((p, i) => i * 0.05);
    const all = [];
    while (!S.isOver(s) && s.t < maxT) {
      const inputs = [];
      for (const i of humans) {
        if (s.t >= nextAt[i]) {
          const { out, tap } = brain(s, i, { react }, mode);
          cur[i] = out;
          tap.forEach((on, k) => { if (on) cnt[i][k]++; });
          nextAt[i] = s.t + react * (0.7 + rnd() * 0.6);
        }
        inputs[i] = { mx: cur[i].mx, my: cur[i].my, a: cnt[i][0], b: cnt[i][1], c: cnt[i][2], s: cnt[i][3] };
      }
      // il salto è urgente: si ricontrolla a ogni passo (riflesso), il resto ogni `react`
      for (const i of humans) {
        const { tap } = brain(s, i, { react }, mode);
        if (tap[2] && s.players[i].z === 0 && s.players[i].q[2] === 0) { cnt[i][2]++; inputs[i].c = cnt[i][2]; }
      }
      const ev = S.step(s, DT, inputs);
      if (o.collect !== false) for (const e of ev) all.push(e);
    }
    return all;
  }
  return { play, brain };
}
