/* Hari Express — ciclo del giorno e della notte della scena 3D (puro, niente DOM: testato da Node).
 * Il cielo segue l'OROLOGIO del gioco: t ∈ [0, 1) è l'ora del giorno (0 = mezzanotte, 0.5 = mezzogiorno), ricavata
 * dalla simulazione (hourOf), quindi la notte sullo schermo è la notte dell'orologio. La simulazione non legge mai il
 * cielo: resta deterministica.
 *   notte    21:00 – 4:30   luce azzurro-viola soffice, finestre, lampioni e fari accesi
 *   alba      4:30 – 6:30   rosa
 *   giorno    6:30 – 18:30  il più lungo, sole che attraversa il cielo
 *   tramonto 18:30 – 21:00  luce dorata, poi si fa sera
 * Un giorno di gioco dura quanto dice la simulazione (24 ore × 24 passi, a 20 passi al secondo: 28,8 s a ×1, 14,4 s a
 * ×2, 7,2 s a ×4). Per non sfarfallare alle velocità alte la notte è meno profonda: depth(speed) 1 → 0,7 → 0,4
 * (la UI ci scivola sopra piano). In pausa (o a partita finita) il cielo si ferma con l'orologio.
 * light(t, alwaysDay, depth) → { phase, day, night, dark, gold, rose, amb, sun, dir:[x,y,z] }: pesi 0..1; `night` è la
 * notte smorzata con depth (colori), `dark` quella vera dell'ora (accende finestre, lampioni e fari). I colori veri
 * vengono dai token --exp-* (express-3d.js li mescola). amb non scende mai sotto MIN_AMB: di notte si gioca lo stesso.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const H = (h) => h / 24;
  const DAWN = H(4.5), DAY = H(6.5), DUSK = H(18.5), NIGHT = H(21);
  const START = H(7), NOON = 0.5, MIN_AMB = 0.62, MIN_SUN = 0.38;
  const PHASES = [['night', 0, DAWN], ['dawn', DAWN, DAY], ['day', DAY, DUSK], ['sunset', DUSK, NIGHT], ['night', NIGHT, 1]];
  const DEPTH = { 1: 1, 2: 0.7, 4: 0.4 };
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const norm = (t) => { t = Number(t); if (!isFinite(t)) return START; t %= 1; return t < 0 ? t + 1 : t; };
  // ora del giorno dall'orologio della simulazione: ore intere passate (h), passi nell'ora (tk), frazione di passo (f)
  const hourOf = (h, tk, tph, f) => norm(((h % 24) + ((tk || 0) + (f || 0)) / (tph || 24)) / 24);
  // profondità della notte alla velocità data (0 = pausa: quella di ×1)
  const depth = (speed) => DEPTH[speed] || (speed > 4 ? 0.4 : 1);
  function phase(t) { t = norm(t); for (const [k, a, b] of PHASES) if (t >= a && t < b) return k; return 'night'; }
  // quanto è giorno (1) o notte (0)
  function dayness(t) {
    if (t >= DAY && t < DUSK) return 1;
    if (t >= DUSK && t < NIGHT) return 1 - smooth((t - DUSK) / (NIGHT - DUSK));
    if (t >= DAWN && t < DAY) return smooth((t - DAWN) / (DAY - DAWN));
    return 0;
  }
  // luce dorata: sale nelle ultime 2 ore e mezza del giorno, piena a inizio tramonto, si spegne entrando nella notte
  const G0 = DUSK - H(2.5);
  function goldness(t) {
    if (t >= G0 && t < DUSK) return 0.45 * smooth((t - G0) / (DUSK - G0));
    if (t >= DUSK && t < NIGHT) { const u = (t - DUSK) / (NIGHT - DUSK); return u < 0.4 ? 0.45 + 0.55 * smooth(u / 0.4) : 1 - smooth((u - 0.4) / 0.6); }
    return 0;
  }
  // rosa dell'alba: una campana sull'alba, che sfuma nelle prime due ore del giorno
  const R1 = DAY + H(2);
  function roseness(t) {
    if (t >= DAWN && t < DAY) return Math.sin(Math.PI * 0.5 * smooth((t - DAWN) / (DAY - DAWN))) * 0.7;
    if (t >= DAY && t < R1) return 0.7 * (1 - smooth((t - DAY) / (R1 - DAY)));
    return 0;
  }
  const MOON = (() => { const e = 0.95, az = 0.6; return [-Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az)]; })();
  function sunDir(t) {
    // arco del sole dall'inizio dell'alba alla fine del tramonto; di notte torna basso da ovest a est (continuo:
    // con la notte poco profonda delle velocità alte un po' di sole resta nella luce)
    let e, az;
    if (t >= DAWN && t < NIGHT) { const k = (t - DAWN) / (NIGHT - DAWN); e = 0.45 + 0.65 * Math.sin(Math.PI * k); az = -0.9 + 1.8 * k; }
    else { const u = norm(t - NIGHT) / (1 - NIGHT + DAWN); e = 0.45; az = 0.9 - 1.8 * u; }
    return [-Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az)];
  }
  function light(t, alwaysDay, dp) {
    t = alwaysDay ? NOON : norm(t);
    const k = dp == null ? 1 : clamp(dp);
    const d0 = dayness(t), d = 1 - k * (1 - d0), sd = sunDir(t);
    const dir = [0, 1, 2].map((i) => MOON[i] + (sd[i] - MOON[i]) * d);
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const soft = 0.4 + 0.6 * k;
    const g0 = goldness(t), gold = g0 * soft, rose = roseness(t) * (1 - g0) * soft;
    return {
      t, phase: phase(t), day: d, night: 1 - d, dark: 1 - d0, gold, rose,
      amb: MIN_AMB + (1 - MIN_AMB) * d,
      sun: (MIN_SUN + (1 - MIN_SUN) * d) * (1 - 0.15 * gold),
      dir: dir.map((x) => x / l),
    };
  }
  HH.expressSky = { START, NOON, DAWN, DAY, DUSK, NIGHT, MIN_AMB, MIN_SUN, PHASES, DEPTH, norm, hourOf, depth, phase, light };
})(typeof globalThis !== 'undefined' ? globalThis : window);
