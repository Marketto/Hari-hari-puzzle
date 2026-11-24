/* Hari Express — ciclo del giorno e della notte della scena 3D (puro, niente DOM: testato da Node).
 * Il tempo del giorno t ∈ [0, 1) è solo grafica: la simulazione (express-sim.js) non lo legge mai, quindi resta
 * deterministica. La scena NON segue il tema dell'app: ha il suo cielo, che gira col tempo di gioco.
 *   giorno  [0,    0.58)  il più lungo, sole che attraversa il cielo
 *   tramonto[0.58, 0.70)  luce dorata, poi si fa sera
 *   notte   [0.70, 0.90)  breve, luce azzurro-viola soffice, finestre e lampioni accesi
 *   alba    [0.90, 1)     rosa, torna il giorno
 * Durata di un giorno: 180 s reali a ×1, scala con la velocità ma mai sotto 60 s (a ×4 non più di un giro al minuto).
 * In pausa (o a partita finita) il cielo si ferma. Una partita nuova parte di mattina (START).
 * light(t) → { phase, day, night, gold, rose, amb, sun, dir:[x,y,z] }: pesi e moltiplicatori 0..1; i colori veri
 * vengono dai token --exp-* (express-3d.js li mescola). amb non scende mai sotto MIN_AMB: di notte si gioca lo stesso.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const DAY_S = 180, MIN_S = 60, START = 0.06, NOON = 0.29, MIN_AMB = 0.62, MIN_SUN = 0.38;
  const PHASES = [['day', 0, 0.58], ['sunset', 0.58, 0.7], ['night', 0.7, 0.9], ['dawn', 0.9, 1]];
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const norm = (t) => { t = Number(t); if (!isFinite(t)) return START; t %= 1; return t < 0 ? t + 1 : t; };
  // secondi reali per un giorno intero alla velocità data (Infinity in pausa)
  const period = (speed) => (speed > 0 ? Math.max(MIN_S, DAY_S / speed) : Infinity);
  const advance = (t, dt, speed) => (speed > 0 && dt > 0 ? norm(t + dt / period(speed)) : norm(t));
  function phase(t) { t = norm(t); for (const [k, a, b] of PHASES) if (t >= a && t < b) return k; return 'day'; }
  // quanto è giorno (1) o notte (0)
  function dayness(t) {
    if (t < 0.58) return 1;
    if (t < 0.7) return 1 - smooth((t - 0.58) / 0.12);
    if (t < 0.9) return 0;
    return smooth((t - 0.9) / 0.1);
  }
  // luce dorata: sale nel tardo pomeriggio, piena a inizio tramonto, si spegne entrando nella notte
  function goldness(t) {
    if (t >= 0.48 && t < 0.58) return 0.45 * smooth((t - 0.48) / 0.1);
    if (t >= 0.58 && t < 0.7) { const u = (t - 0.58) / 0.12; return u < 0.4 ? 0.45 + 0.55 * smooth(u / 0.4) : 1 - smooth((u - 0.4) / 0.6); }
    return 0;
  }
  // rosa dell'alba: una campana sull'alba, che sfuma nella prima mattina
  function roseness(t) {
    if (t >= 0.9) return Math.sin(Math.PI * 0.5 * smooth((t - 0.9) / 0.1)) * 0.7;
    if (t < 0.08) return 0.7 * (1 - smooth(t / 0.08));
    return 0;
  }
  const MOON = (() => { const e = 0.95, az = 0.6; return [-Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az)]; })();
  function sunDir(t) {
    // arco del sole dall'alba (0.9) al tramonto (0.7 del giorno dopo, cioè 0.8 di arco)
    const s = norm(t + 0.1) / 0.8, k = clamp(s);
    const e = 0.45 + 0.65 * Math.sin(Math.PI * k), az = -0.9 + 1.8 * k;
    return [-Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az)];
  }
  function light(t, alwaysDay) {
    t = alwaysDay ? NOON : norm(t);
    const d = dayness(t), sd = sunDir(t);
    const dir = [0, 1, 2].map((i) => MOON[i] + (sd[i] - MOON[i]) * d);
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const gold = goldness(t), rose = roseness(t) * (1 - goldness(t));
    return {
      t, phase: phase(t), day: d, night: 1 - d, gold, rose,
      amb: MIN_AMB + (1 - MIN_AMB) * d,
      sun: (MIN_SUN + (1 - MIN_SUN) * d) * (1 - 0.15 * gold),
      dir: dir.map((x) => x / l),
    };
  }
  HH.expressSky = { DAY_S, MIN_S, START, NOON, MIN_AMB, MIN_SUN, PHASES, norm, period, advance, phase, light };
})(typeof globalThis !== 'undefined' ? globalThis : window);
