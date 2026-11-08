// Bot di Hari Fishing per i test: gioca un livello usando solo quello che vede il giocatore (fase, galleggiante che
// trema o va sotto, tensione e finestra verde dell'indicatore, distanza). Non legge forza, fiato o scatti del pesce e
// non chiama il generatore: regola il mulinello con un controllo proporzionale-integrale sulla tensione osservata.
export function fishBot(HH, opt = {}) {
  const F = HH.fish;
  const power = opt.power ?? 1;
  function play(s, maxT = 900) {
    const ev = [];
    let r = 0, prevT = 0;
    const z = F.zones(s);
    const aimT = z.tMin + (z.tMax - z.tMin) * (opt.aim ?? 0.5);
    while (!F.isOver(s) && s.t < maxT) {
      let inp = { reel: 0 };
      if (s.phase === 'aim') { ev.push(...F.cast(s, power, 0)); r = 0; continue; }
      if (s.phase === 'caught') { ev.push(...F.release(s, false)); continue; }
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
