// Bot di Hari Fishing per i test: gioca un livello usando solo quello che vede il giocatore (fase, pesci e loro
// indicatori sott'acqua, esca, galleggiante, tensione e finestra verde dell'indicatore, distanza). Non legge forza,
// fiato, scatti, fame o soglie di paura dei pesci e non chiama il generatore.
//   sott'acqua: porta l'esca piano (≤ 0,2 unità/s, con un piccolo dondolio) vicino al pesce più vicino, o alla
//               specie speciale se si vede ed è ancora da prendere; ferra appena il galleggiante va sotto
//   lotta:      regola il mulinello con un controllo proporzionale-integrale-derivativo sulla tensione osservata
// opt.jerky = true: muove l'esca sempre a scatti velocissimi da un lato all'altro (strategia sbagliata)
export function fishBot(HH, opt = {}) {
  const F = HH.fish;
  const power = opt.power ?? 1;
  function lure(s, b) {
    const lu = s.lu;
    if (!lu || !s.sw) return {};
    if (opt.jerky) { const k = Math.floor(s.t * 5) % 2; return { lx: k ? 0.95 : -0.95, ly: k ? 0.2 : 0.8 }; }
    const c = F.config(s.level);
    const need = c.target && !s.caught.some((f) => f.sp === c.target);
    let best = null, bd = 1e9;
    for (const w of s.sw) {
      if (w.st === 'leave' || w.st === 'flee' || Math.abs(w.x) > 1.25) continue;
      const d = Math.hypot(w.x - lu.x, w.y - lu.y) - (need && w.sp === c.target ? 5 : 0);
      if (d < bd) { bd = d; best = w; }
    }
    // punto vicino al pesce scelto (un po' davanti a lui), oppure il centro
    let gx = 0, gy = 0.45;
    if (best) { gx = best.x - Math.sign(best.x - lu.x || 1) * 0.18; gy = best.y; }
    if (best && (best.st === 'circle' || best.st === 'sniff')) { gx = b.x; gy = b.y; }   // ci siamo: si resta lì
    const v = 0.2 * F.DT;
    b.x += Math.max(-v, Math.min(v, gx - b.x)); b.y += Math.max(-v, Math.min(v, gy - b.y));
    return { lx: Math.max(-1, Math.min(1, b.x + Math.sin(s.t * 6) * 0.03)), ly: Math.max(0.08, Math.min(0.95, b.y)) };
  }
  function play(s, maxT = 900) {
    const ev = [];
    let r = 0, prevT = 0;
    const b = { x: 0, y: 0.45 };
    const z = F.zones(s);
    const aimT = z.tMin + (z.tMax - z.tMin) * (opt.aim ?? 0.5);
    while (!F.isOver(s) && s.t < maxT) {
      let inp = { reel: 0 };
      if (s.phase === 'aim') { ev.push(...F.cast(s, power, 0)); r = 0; b.x = 0; b.y = 0.45; continue; }
      if (s.phase === 'caught') { ev.push(...F.release(s, false)); continue; }
      if (s.phase === 'wait') inp = Object.assign(inp, lure(s, b));
      if (s.phase === 'bite') inp.reel = 1;
      if (s.phase === 'fight') {
        // tensione che sale veloce: si anticipa (derivativo), poi integrale verso il centro della finestra
        const dT = (s.T - prevT) / F.DT;
        r += ((aimT - s.T) * 9 - dT * 0.35) * F.DT;
        r = Math.max(-1, Math.min(1, r));
        if (s.T > z.tMax - 0.02) r = Math.min(r, -0.2);
        inp.reel = r;
      }
      prevT = s.T;
      ev.push(...F.tick(s, inp));
    }
    return ev;
  }
  return { play };
}
