// Bot pilota di Hari Rally per i test: legge solo la geometria pubblica della pista (punti x, y ogni metro) e lo stato
// della sua auto (s, d, psi, v); rifà da sé direzione e raggi di curvatura (cerchio per tre punti), guarda avanti,
// frena prima delle curve con una stima "umana" dell'aderenza e decide ogni ~react secondi (tempi di reazione).
export function botKit(HH) {
  const R = HH.rally;
  const DT = 1 / 60;
  function pose(g, s, d) {
    const i = Math.max(1, Math.min(g.N - 1, Math.floor(s))), u = s - i;
    const hx = g.x[i + 1] - g.x[i - 1], hy = g.y[i + 1] - g.y[i - 1], h = Math.atan2(hy, hx);
    const x = g.x[i] + (g.x[i + 1] - g.x[i]) * u, y = g.y[i] + (g.y[i + 1] - g.y[i]) * u;
    return { x: x - Math.sin(h) * d, y: y + Math.cos(h) * d, h };
  }
  // raggio del cerchio per tre punti della pista (a ±6 m)
  function radius(g, s) {
    const i = Math.max(6, Math.min(g.N - 6, Math.round(s)));
    const ax = g.x[i - 6], ay = g.y[i - 6], bx = g.x[i], by = g.y[i], cx = g.x[i + 6], cy = g.y[i + 6];
    const a = Math.hypot(bx - cx, by - cy), b = Math.hypot(ax - cx, ay - cy), c = Math.hypot(ax - bx, ay - by);
    const area2 = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
    return area2 < 1e-6 ? 1e6 : (a * b * c) / (2 * area2);
  }
  function makeBot(s, { react = 0.22, grip = 7.6, seed = 1, wobble = 0.08 } = {}) {
    const g = R.geo(s), rnd = HH.rng(seed);
    let next = 0, inp = { steer: 0, brake: 0 };
    return function drive() {
      const c = s.cars[0];
      if (s.t < next && s.ready <= 0) return inp;
      next = s.t + react * (0.8 + 0.4 * rnd());
      const v = c.v, car = pose(g, c.s, c.d), hd = car.h + c.psi;
      // inseguimento puro di un punto sulla mezzeria
      const Ld = 7 + 0.55 * v, tp = pose(g, c.s + Ld, 0);
      const ang = Math.atan2(tp.y - car.y, tp.x - car.x) - hd;
      const al = Math.atan2(Math.sin(ang), Math.cos(ang));
      const curv = (2 * Math.sin(al)) / Ld;
      let steer = Math.max(-1, Math.min(1, -curv / R.KMAX + (rnd() - 0.5) * wobble));
      // freno: c'è una curva davanti che va presa più piano?
      let brake = 0;
      const look = (v * v) / (2 * 9) + 30;
      for (let x = 4; x < look; x += 3) {
        const va = Math.sqrt(grip * radius(g, c.s + x));
        if (va < v && (v * v - va * va) / (2 * Math.max(1, x - 6 - v * react)) > 6) { brake = 1; break; }
      }
      inp = { steer, brake };
      return inp;
    };
  }
  function play(s, opts = {}, maxT = 600) {
    const bot = makeBot(s, opts), ev = [];
    while (!R.isOver(s) && s.t < maxT) ev.push(...R.step(s, DT, bot()));
    return ev;
  }
  return { pose, radius, makeBot, play, DT };
}
