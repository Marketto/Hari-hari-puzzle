/* Hari Taxi — logica pura (nessun DOM), macchina a stati deterministica e serializzabile.
 *
 * Gioco di guida in tempo reale visto dall'alto: Hari guida per una città a griglia (isolati, incroci, semafori,
 * marciapiedi, parchi) e fa N consegne per livello. Tre tipi di missione, a rotazione:
 *   taxi   — col taxi: un passeggero alla volta aspetta alla fermata, lo porti a destinazione
 *   food   — con lo scooter: ritiri al ristorante e consegni a casa prima che il cibo si raffreddi (1 o 2 ordini)
 *   parcel — col furgone: carichi 2–4 pacchi al deposito e li consegni a indirizzi diversi, in qualsiasi ordine
 * Ogni consegna caricata ha un tempo limite (parte al ritiro). Se scade la consegna è persa e costa un cuore;
 * se ne genera subito un'altra, quindi il livello si vince sempre completando N consegne.
 * Incidenti (senza violenza): urtare un'auto o un pedone che attraversa, abbastanza veloce, costa un cuore;
 * il pedone fa un salto spaventato e si scansa, l'auto fa "bonk"; poi breve invulnerabilità. Muri ed edifici:
 * rimbalzo morbido, nessun cuore. Traffico (auto, autobus, bici) con IA che segue le corsie, si ferma ai semafori,
 * a chi ha davanti e ai pedoni; i pedoni camminano sui marciapiedi e attraversano sulle strisce col verde.
 *
 * Coordinate: 1 unità = 1 casella = una corsia. x a destra, y in basso; angoli in radianti (0 = est, orario).
 * Strade larghe 2 (una corsia per senso, si guida a destra); isolati di 3–5 caselle; bordo di 1 casella di alberi.
 * La mappa è una stringa (riga per riga): '.' strada, '#' edifici, 'p' parco, '~' bordo. Tutta la geometria
 * (isolati, incroci, fermate) si ricava da mappa + vx/hy con geo(s) ed è in cache fuori dallo stato.
 * Il tempo avanza a passi fissi di 1/60 s; generatore casuale nello stato (rs, mulberry32): lo stato è JSON puro.
 *
 * API (modificano lo stato passato):
 *   config(level)              parametri del livello (curva di difficoltà)
 *   newLevel(level, rnd)       stato iniziale (città, traffico, pedoni, prima corsa)
 *   step(s, dt, input) → ev    tempo reale: "Pronti?", attesa del primo input, poi passi fissi da 1/60 s
 *                              input = { ax, ay } levetta (direzione voluta, modulo 0..1 = gas) · { steer, gas } tasti · null
 *   tick(s) → ev · start(s) · geo(s) · field(s, tile) (distanze su strada) · route(s, x, y, tile, n)
 *   targets(s) → [{ x, y, zx, zy, kind }] dove andare ora · light(s, node) · isWon · isLost · isOver · rate · progress · par
 * Eventi: go · trip · pickup{n,x,y} · drop{item,x,y,left} · expire{item,left} · crash{what,id,kind,x,y,left}
 *         bonk{x,y} · shoo{id,x,y} · bump{x,y,v} · honk{id} · lose · win
 * Esporta HH.drive.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const TICK = 1 / 60;
  const LIVES = 3;
  const READY = 1.6;
  const ROAD = '.', BLD = '#', PARK = 'p', EDGE = '~';
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // E S W N
  const INSET = 0.35;        // marciapiede: i pedoni camminano a questa distanza dal bordo dell'isolato
  const ZONE_R = 1.2;        // raggio della fermata (sulla strada davanti al marciapiede)
  const STOP_V = 1.2;        // sotto questa velocità si carica/scarica
  const INV = 2.2;           // secondi di invulnerabilità dopo un incidente
  const PED_V = 0.8;         // sotto questa velocità un pedone toccato si scansa e basta
  const PED_R = 0.18;
  const GREEN = 6.5, ALLRED = 1.4, CYCLE = 2 * (GREEN + ALLRED);
  const STOP_OFF = 0.8;      // linea di arresto: prima delle strisce
  const NPC_DEC = 7;         // frenata del traffico
  const STOP_T = 2.5;        // secondi per fermata nel calcolo dei tempi limite
  const SLOW_V = 1.5;        // mappe reali: velocità massima nelle vie pedonali

  // veicoli di Hari: guida diversa (vmax caselle/s, acc, frenata, sterzo rad/s, mezza larghezza, lunghezza,
  // velocità minima perché un urto conti come incidente, rimbalzo contro i muri)
  const VEH = {
    taxi: { vmax: 4.6, acc: 4.6, brake: 10, steer: 3.4, hw: 0.27, len: 0.92, crash: 1.2, bounce: 0.35 },
    scooter: { vmax: 5.4, acc: 6.4, brake: 12, steer: 4.4, hw: 0.17, len: 0.62, crash: 0.9, bounce: 0.5 },
    van: { vmax: 3.8, acc: 3.2, brake: 8.5, steer: 2.8, hw: 0.33, len: 1.16, crash: 1.6, bounce: 0.2 },
  };
  const NPCS = {
    car: { vmax: 2.7, hw: 0.25, len: 0.88 },
    bus: { vmax: 2.2, hw: 0.33, len: 1.8 },
    bike: { vmax: 1.7, hw: 0.13, len: 0.55 },
  };
  const TYPES = ['taxi', 'food', 'parcel'];
  const VEH_OF = { taxi: 'taxi', food: 'scooter', parcel: 'van' };
  const PEDS = ['bunny', 'chick', 'piggy', 'bear', 'sheep', 'cat', 'frog', 'duck'];
  const DISHES = ['ramen', 'pizza', 'onigiri', 'cake'];

  /* ---------- curva di difficoltà (monotona) ---------- */
  function config(level, mapId) {
    const L = Math.max(1, level | 0);
    const tier = L <= 2 ? 0 : L <= 5 ? 1 : L <= 9 ? 2 : L <= 13 ? 3 : 4;
    const type = TYPES[(L - 1) % 3];
    const c = {
      level: L, tier, type, veh: VEH_OF[type],
      nbx: [3, 4, 5, 5, 6][tier], nby: [3, 4, 4, 5, 6][tier],        // isolati per lato
      bmin: [4, 3, 3, 3, 3][tier], bmax: [4, 4, 5, 5, 5][tier],      // lato di un isolato (caselle)
      closures: [1, 2, 3, 4, 5][tier],                                // tratti di strada chiusi (diventano parchi)
      jobs: Math.min(8, 4 + Math.floor((L - 1) / 3)),                 // consegne per vincere: 4 · 4 · 4 · 5 … 8
      batch: type === 'taxi' ? 1 : type === 'food' ? (L >= 8 ? 2 : 1) : L < 6 ? 2 : L < 10 ? 3 : 4,
      cars: Math.min(28, Math.round(3 + 1.7 * (L - 1))),              // veicoli del traffico
      peds: Math.min(40, Math.round(5 + 2.2 * (L - 1))),              // pedoni
      buses: L >= 2, bikes: true,
      slack: +Math.max(1.65, 2.6 - 0.085 * (L - 1)).toFixed(2),          // margine sul tempo "di riferimento"
      base: +Math.max(6, 12 - 0.5 * (L - 1)).toFixed(1),              // secondi regalati a ogni consegna
      dmin: Math.min(20, 9 + L), dmax: Math.min(44, 20 + 2 * L),      // distanza su strada ritiro → consegna
    };
    if (mapId && mapId !== 'hari') {
      // mappe reali: corse più lunghe (la città è grande), traffico e pedoni in una "bolla" attorno a Hari
      // (stessa densità a vista della città di Hari, che è tutta sullo schermo o quasi)
      c.map = mapId;
      c.dmin = Math.min(40, 14 + 2 * L); c.dmax = Math.min(100, 30 + 5 * L);
      c.cars = Math.min(34, Math.round(8 + 2 * (L - 1))); c.peds = Math.min(46, Math.round(12 + 2.4 * (L - 1)));
    }
    return c;
  }

  /* ---------- rng nello stato (mulberry32, come HH.rng) ---------- */
  function rand(s) {
    s.rs = (s.rs + 0x6d2b79f5) >>> 0;
    let t = s.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const nz = (v) => v || 0;                         // niente -0: lo stato resta identico dopo JSON
  const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return nz(a - Math.PI); };
  const r1 = (v) => Math.round(v * 10) / 10;

  /* ---------- città ---------- */
  function buildCity(cfg, rnd) {
    const sizes = (n) => Array.from({ length: n }, () => cfg.bmin + Math.floor(rnd() * (cfg.bmax - cfg.bmin + 1)));
    const kx = sizes(cfg.nbx), ky = sizes(cfg.nby);
    const lines = (k) => { const out = []; let p = 1; for (let i = 0; i <= k.length; i++) { out.push(p); p += 2; if (i < k.length) p += k[i]; } return { out, end: p + 1 }; };
    const X = lines(kx), Y = lines(ky);
    const vx = X.out, hy = Y.out, W = X.end, H = Y.end, nx = kx.length, ny = ky.length;
    const m = new Array(W * H).fill(EDGE);
    for (const x of vx) for (let y = hy[0]; y <= hy[ny] + 1; y++) { m[y * W + x] = ROAD; m[y * W + x + 1] = ROAD; }
    for (const y of hy) for (let x = vx[0]; x <= vx[nx] + 1; x++) { m[y * W + x] = ROAD; m[(y + 1) * W + x] = ROAD; }
    const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = ch; };
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) fill(vx[i] + 2, hy[j] + 2, vx[i + 1], hy[j + 1], BLD);
    // tratti chiusi: uniscono due isolati in un parco, senza mai scollegare la rete né lasciare vicoli ciechi
    const closed = new Set(), merged = new Set();
    const deg = (i, j) => [['h', i, j], ['h', i - 1, j], ['v', i, j], ['v', i, j - 1]]
      .filter(([t, a, b]) => (t === 'h' ? a >= 0 && a < nx : b >= 0 && b < ny) && !closed.has(`${t}${a},${b}`)).length;
    const connected = () => {
      const seen = new Set(['0,0']), q = [[0, 0]];
      while (q.length) {
        const [i, j] = q.pop();
        const nb = [];
        if (i < nx && !closed.has(`h${i},${j}`)) nb.push([i + 1, j]);
        if (i > 0 && !closed.has(`h${i - 1},${j}`)) nb.push([i - 1, j]);
        if (j < ny && !closed.has(`v${i},${j}`)) nb.push([i, j + 1]);
        if (j > 0 && !closed.has(`v${i},${j - 1}`)) nb.push([i, j - 1]);
        for (const [a, b] of nb) if (!seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); q.push([a, b]); }
      }
      return seen.size === (nx + 1) * (ny + 1);
    };
    const cand = [];
    for (let i = 0; i < nx; i++) for (let j = 1; j < ny; j++) cand.push(['h', i, j]);     // tra isolato (i,j-1) e (i,j)
    for (let i = 1; i < nx; i++) for (let j = 0; j < ny; j++) cand.push(['v', i, j]);     // tra isolato (i-1,j) e (i,j)
    for (let k = cand.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [cand[k], cand[r]] = [cand[r], cand[k]]; }
    for (const [t, i, j] of cand) {
      if (closed.size >= cfg.closures) break;
      const a = t === 'h' ? `${i},${j - 1}` : `${i - 1},${j}`, b = `${i},${j}`;
      if (merged.has(a) || merged.has(b)) continue;
      const key = `${t}${i},${j}`;
      closed.add(key);
      const ends = t === 'h' ? [[i, j], [i + 1, j]] : [[i, j], [i, j + 1]];
      if (ends.some(([p, q]) => deg(p, q) < 2) || !connected()) { closed.delete(key); continue; }
      merged.add(a); merged.add(b);
      if (t === 'h') fill(vx[i] + 2, hy[j - 1] + 2, vx[i + 1], hy[j + 1], PARK);
      else fill(vx[i - 1] + 2, hy[j] + 2, vx[i + 1], hy[j + 1], PARK);
    }
    // qualche parco in più tra gli isolati rimasti
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (merged.has(`${i},${j}`)) continue;
      if (rnd() < 0.12) fill(vx[i] + 2, hy[j] + 2, vx[i + 1], hy[j + 1], PARK);
    }
    return { W, H, vx, hy, map: m.join('') };
  }

  /* ---------- geometria ricavata dalla mappa (in cache, fuori dallo stato) ---------- */
  const GEO = new Map(), BY = new WeakMap();
  function geo(s) {
    let g = BY.get(s);
    if (isOsm(s)) {
      if (g && g.key === 'osm:' + s.mapId) return g;
      g = geoOsm(s);
      BY.set(s, g);
      return g;
    }
    if (g && g.key === s.map) return g;
    const key = s.map;
    g = GEO.get(key);
    if (g) { BY.set(s, g); return g; }
    if (GEO.size > 6) GEO.clear();
    const { W, H, vx, hy, map } = s;
    const solid = new Uint8Array(W * H), bid = new Int16Array(W * H).fill(-1);
    for (let i = 0; i < W * H; i++) solid[i] = map[i] === ROAD ? 0 : 1;
    // isolati: ogni componente di edifici/parco è un rettangolo
    const blocks = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, ch = map[i];
      if ((ch !== BLD && ch !== PARK) || bid[i] >= 0) continue;
      let x1 = x, y1 = y;
      while (x1 < W && map[y * W + x1] === ch) x1++;
      while (y1 < H && map[y1 * W + x] === ch) y1++;
      const id = blocks.length;
      blocks.push({ id, x0: x, y0: y, x1, y1, k: ch === PARK ? 'park' : 'bld' });
      for (let yy = y; yy < y1; yy++) for (let xx = x; xx < x1; xx++) bid[yy * W + xx] = id;
    }
    // incroci
    const nx = vx.length - 1, ny = hy.length - 1, nodes = [];
    const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? map[y * W + x] : EDGE);
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const x = vx[i], y = hy[j];
      const nb = [
        i < nx && at(x + 2, y) === ROAD ? j * (nx + 1) + i + 1 : -1,
        j < ny && at(x, y + 2) === ROAD ? (j + 1) * (nx + 1) + i : -1,
        i > 0 && at(x - 1, y) === ROAD ? j * (nx + 1) + i - 1 : -1,
        j > 0 && at(x, y - 1) === ROAD ? (j - 1) * (nx + 1) + i : -1,
      ];
      const deg = nb.filter((v) => v >= 0).length;
      nodes.push({ i, j, x: x + 1, y: y + 1, nb, deg, lit: deg >= 3 });
    }
    const colOf = new Map(vx.map((v, i) => [v, i])), rowOf = new Map(hy.map((v, j) => [v, j]));
    const nodeAt = (bx, by) => { const i = colOf.get(bx), j = rowOf.get(by); return i == null || j == null ? -1 : j * (nx + 1) + i; };
    // fermate: una per casella lungo i lati degli isolati (non negli angoli, dove ci sono le strisce)
    const spots = [];
    for (const b of blocks) {
      const add = (x, y, zx, zy, h) => { if (at(Math.floor(zx), Math.floor(zy)) === ROAD) spots.push({ id: spots.length, b: b.id, x, y, zx, zy, h, k: b.k }); };
      for (let x = b.x0 + 1; x < b.x1 - 1; x++) { add(x + 0.5, b.y0 + INSET, x + 0.5, b.y0 - 0.55, 0); add(x + 0.5, b.y1 - INSET, x + 0.5, b.y1 + 0.55, 2); }
      for (let y = b.y0 + 1; y < b.y1 - 1; y++) { add(b.x0 + INSET, y + 0.5, b.x0 - 0.55, y + 0.5, 3); add(b.x1 - INSET, y + 0.5, b.x1 + 0.55, y + 0.5, 1); }
    }
    g = { W, H, nx, ny, solid, nopass: solid, bid, blocks, nodes, spots, nodeAt, at, df: new Map(), dfMax: 24, cell: 2, bw: Math.ceil(W / 2), bh: Math.ceil(H / 2) };
    g.buckets = Array.from({ length: g.bw * g.bh }, () => []);
    g.used = [];
    g.key = key;
    GEO.set(key, g);
    BY.set(s, g);
    return g;
  }

  // distanze su strada (BFS a 4 vicini sulle caselle) da una casella
  function bfs(g, from) {
    const { W, H } = g, solid = g.nopass, n = W * H;
    const d = new Int16Array(n).fill(-1);
    if (from < 0 || from >= n || solid[from]) return d;
    const q = new Int32Array(n);
    let h = 0, t = 0;
    d[from] = 0; q[t++] = from;
    while (h < t) {
      const i = q[h++], di = d[i] + 1, x = i % W;
      if (x + 1 < W && !solid[i + 1] && d[i + 1] < 0) { d[i + 1] = di; q[t++] = i + 1; }
      if (x > 0 && !solid[i - 1] && d[i - 1] < 0) { d[i - 1] = di; q[t++] = i - 1; }
      if (i + W < n && !solid[i + W] && d[i + W] < 0) { d[i + W] = di; q[t++] = i + W; }
      if (i - W >= 0 && !solid[i - W] && d[i - W] < 0) { d[i - W] = di; q[t++] = i - W; }
    }
    return d;
  }
  function field(s, tile) {
    const g = geo(s);
    let f = g.df.get(tile);
    if (!f) { if (g.df.size > g.dfMax) g.df.delete(g.df.keys().next().value); f = bfs(g, tile); g.df.set(tile, f); }
    return f;
  }
  const tileOf = (s, x, y) => Math.floor(y) * s.W + Math.floor(x);
  // casella di strada più vicina (per chi è un attimo fuori, es. spinto contro un marciapiede)
  function roadTile(s, x, y) {
    const g = geo(s);
    let best = -1, bd = 1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const tx = Math.floor(x) + dx, ty = Math.floor(y) + dy;
      if (tx < 0 || ty < 0 || tx >= s.W || ty >= s.H || g.solid[ty * s.W + tx]) continue;
      const d = (tx + 0.5 - x) ** 2 + (ty + 0.5 - y) ** 2;
      if (d < bd) { bd = d; best = ty * s.W + tx; }
    }
    return best;
  }
  // percorso su strada verso una casella (centri delle caselle, al massimo n passi): per la freccia e la minimappa
  function route(s, x, y, tile, n = 400) {
    const f = field(s, tile), W = s.W;
    let i = roadTile(s, x, y);
    const out = [];
    if (i < 0 || f[i] < 0) return out;
    while (f[i] > 0 && out.length < n) {
      const cx = i % W, d = f[i];
      let nxt = -1;
      for (const j of [i + 1, i - 1, i + W, i - W]) {
        if (j < 0 || j >= f.length || (j === i + 1 && cx === W - 1) || (j === i - 1 && cx === 0)) continue;
        if (f[j] === d - 1) { nxt = j; break; }
      }
      if (nxt < 0) break;
      i = nxt;
      out.push({ x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5 });
    }
    return out;
  }

  /* ---------- mappe reali (dati OpenStreetMap preparati da tools/osm-taxi.mjs) ----------
   * HH.driveMaps[id] = dati compatti (zone a corse, grafo stradale, edifici, luoghi, nomi), file caricato in lazy load.
   * Il gioco resta a caselle per Hari (muri, distanze su strada, freccia, minimappa): le caselle percorribili si
   * ricavano dal grafo (larghezza per categoria). Traffico e pedoni seguono il grafo vettoriale: corsie a destra
   * della mezzeria, svolte come curve di Bézier negli incroci, marciapiedi ai lati, strisce agli incroci col semaforo.
   * Lo stato salva solo l'id della mappa (mapId), mai la mappa: niente salvataggi enormi. */
  const AR = { LAND: 0, PARK: 1, SAND: 2, WATER: 3, PLAZA: 4, PIER: 5, PARKING: 6, FIELD: 7, RAIL: 8 };
  const HWC = [1.25, 1.1, 1.0, 0.9, 0.75, 0.75];   // mezza larghezza (casella) per categoria: grande … servizio, pedonale
  const ASPH = 0.3;                                   // asfalto oltre la mezza larghezza
  const SIDE = 0.4;                                   // i pedoni camminano a questa distanza dal bordo della strada
  const isOsm = (s) => !!s.mapId && s.mapId !== 'hari';
  const MD = new Map();
  function bytes(b64) {
    if (typeof G.atob === 'function') { const t = G.atob(b64), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; }
    return new Uint8Array(G.Buffer.from(b64, 'base64'));
  }
  function reader(b64) {
    const a = bytes(b64);
    let i = 0;
    const u = () => { let v = 0, m = 1, b; do { b = a[i++]; v += (b & 127) * m; m *= 128; } while (b & 128); return v; };
    return { u, z: () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; }, end: () => i >= a.length };
  }
  // decodifica (una volta per mappa): zone, incroci, tratti, luoghi
  function mapData(id) {
    if (MD.has(id)) return MD.get(id);
    const R = HH.driveMaps && HH.driveMaps[id];
    if (!R) return null;
    const W = R.W, H = R.H, area = new Uint8Array(W * H);
    { const r = reader(R.area); let i = 0; while (i < W * H && !r.end()) { const v = r.u(), c = v % 16, n = Math.floor(v / 16); area.fill(c, i, i + n); i += n; } }
    const nodes = [];
    { const r = reader(R.nodes); let x = 0, y = 0; while (!r.end()) { x += r.z(); y += r.z(); nodes.push({ x: x / 4, y: y / 4, lit: !!r.u(), inc: [], deg: 0 }); } }
    const edges = [];
    {
      const r = reader(R.edges);
      while (!r.end()) {
        const a = r.u(), b = r.u(), cc = r.u(), name = r.u(), n = r.u();
        const pts = [[nodes[a].x, nodes[a].y]];
        let x = Math.round(nodes[a].x * 4), y = Math.round(nodes[a].y * 4);
        for (let k = 0; k < n; k++) { x += r.z(); y += r.z(); pts.push([x / 4, y / 4]); }
        pts.push([nodes[b].x, nodes[b].y]);
        const c = Math.floor(cc / 3), o = cc % 3;
        const cum = [0];
        for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
        const e = { id: edges.length, a, b, c, one: o === 1 ? 1 : o === 2 ? -1 : 0, name: name ? R.names[name - 1] : '', pts, cum, len: cum[cum.length - 1], hw: HWC[c], slow: c === 5 };
        edges.push(e);
        nodes[a].inc.push(e.id); nodes[b].inc.push(e.id);
      }
    }
    for (const N of nodes) N.deg = N.inc.length;
    const pois = [];
    { const r = reader(R.pois); let x = 0, y = 0; while (!r.end()) { const k = R.poiKinds[r.u()]; x += r.z(); y += r.z(); const nm = r.u(); pois.push({ id: pois.length, k, x: x / 4, y: y / 4, name: nm ? R.names[nm - 1] : '', spot: -1 }); } }
    const md = { id, name: R.name, W, H, m: R.m, date: R.date, area, nodes, edges, pois, anchors: R.anchors || [], raw: R };
    MD.set(id, md);
    return md;
  }
  // edifici (solo per la grafica): poligoni a 1/2 casella
  function buildings(md) {
    if (md.blds) return md.blds;
    const r = reader(md.raw.blds), out = [];
    let x = 0, y = 0;
    while (!r.end()) {
      const h = r.u(), n = Math.floor(h / 64) + 3, lv = Math.floor((h % 64) / 4), kind = h % 4;
      const p = [];
      let fx = 0, fy = 0;
      for (let k = 0; k < n; k++) { x += r.z(); y += r.z(); p.push([x / 2, y / 2]); if (!k) { fx = x; fy = y; } }
      x = fx; y = fy;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [px, py] of p) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
      out.push({ id: out.length, p, lv, kind, x0, y0, x1, y1 });
    }
    md.blds = out;
    return out;
  }

  // moli, pontili e binari come linee/poligoni vettoriali (solo per la grafica): { k: 'pier'|'rail'|'pierArea'|'castle', pts }
  function vectors(md) {
    if (md.vec) return md.vec;
    const out = [];
    if (md.raw.vec) {
      const r = reader(md.raw.vec);
      let x = 0, y = 0;
      while (!r.end()) {
        const k = r.u(), n = r.u(), p = [];
        for (let i = 0; i < n; i++) { x += r.z(); y += r.z(); p.push([x / 4, y / 4]); }
        out.push({ k: ['pier', 'rail', 'pierArea', 'castle'][k] || 'pier', pts: p });
      }
    }
    md.vec = out;
    return out;
  }
  // polilinea spostata di off a destra (normale con giunto a mitra limitato)
  function offsetLine(pts, off) {
    if (!off) return pts.map((p) => [p[0], p[1]]);
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      let nx = 0, ny = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
        if (a < 0 || b >= n) continue;
        const dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1], L = Math.hypot(dx, dy) || 1;
        nx += -dy / L; ny += dx / L;
      }
      const L = Math.hypot(nx, ny) || 1;
      nx /= L; ny /= L;
      // mitra: 1/cos della mezza svolta, al massimo 1,8
      let k = 1;
      if (i > 0 && i < n - 1) { const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], Ls = Math.hypot(dx, dy) || 1; k = Math.min(1.8, 1 / Math.max(0.55, Math.abs(-dy / Ls * nx + dx / Ls * ny))); }
      out.push([pts[i][0] + nx * off * k, pts[i][1] + ny * off * k]);
    }
    return out;
  }
  // tratto di polilinea tra le distanze t0 e t1 (dall'inizio)
  function cut(pts, t0, t1) {
    const out = [];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
      const s0 = Math.max(t0, acc), s1 = Math.min(t1, acc + L);
      if (s1 >= s0 && L > 0) {
        const p0 = [ax + ((bx - ax) * (s0 - acc)) / L, ay + ((by - ay) * (s0 - acc)) / L], p1 = [ax + ((bx - ax) * (s1 - acc)) / L, ay + ((by - ay) * (s1 - acc)) / L];
        if (!out.length) out.push(p0);
        out.push(p1);
      }
      acc += L;
    }
    if (out.length < 2) { const p = out[0] || pts[0]; return [p, [p[0] + 1e-3, p[1]]]; }
    return out;
  }
  function polyOf(pts) {
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  // punto e direzione a distanza t lungo una polilinea
  function along(P, t) {
    const { pts, cum } = P;
    t = clamp(t, 0, P.len);
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= t) lo = m; else hi = m; }
    const L = cum[hi] - cum[lo] || 1e-9, f = (t - cum[lo]) / L, [ax, ay] = pts[lo], [bx, by] = pts[hi];
    return [ax + (bx - ax) * f, ay + (by - ay) * f, Math.atan2(by - ay, bx - ax)];
  }

  const OG = new Map();
  function geoOsm(s) {
    const id = s.mapId;
    let g = OG.get(id);
    if (g) return g;
    const md = mapData(id);
    if (!md) throw new Error('drive: mappa non caricata ' + id);
    const { W, H, nodes, edges, area } = md;
    // caselle percorribili: tratti con la loro larghezza, incroci un po' più larghi
    const road = new Uint8Array(W * H);
    const stamp = (pts, r, v) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
        for (let ty = Math.max(0, Math.floor(Math.min(ay, by) - r)); ty <= Math.min(H - 1, Math.floor(Math.max(ay, by) + r)); ty++) {
          for (let tx = Math.max(0, Math.floor(Math.min(ax, bx) - r)); tx <= Math.min(W - 1, Math.floor(Math.max(ax, bx) + r)); tx++) {
            const cx = tx + 0.5, cy = ty + 0.5, t = clamp(((cx - ax) * dx + (cy - ay) * dy) / L2, 0, 1);
            if ((cx - ax - t * dx) ** 2 + (cy - ay - t * dy) ** 2 <= r * r) { const k = ty * W + tx; if (v === 1 || !road[k]) road[k] = v; }
          }
        }
      }
    };
    for (const e of edges) if (e.slow) stamp(e.pts, e.hw + ASPH, 2);
    for (const e of edges) if (!e.slow) stamp(e.pts, e.hw + ASPH, 1);
    // raggio dell'incrocio (le corsie si fermano qui, le svolte stanno dentro)
    for (const N of nodes) {
      let hw = 0;
      for (const i of N.inc) if (!edges[i].slow) hw = Math.max(hw, edges[i].hw);
      N.hw = hw || 0.75;
      N.r = N.deg >= 3 ? N.hw + ASPH + 0.35 : N.deg === 1 ? 0.7 : 0.15;
      if (N.deg >= 3 && hw) stamp([[N.x, N.y], [N.x + 1e-3, N.y]], N.hw + ASPH + 0.25, 1);
    }
    // componente principale delle caselle carrabili (per le distanze su strada): il resto non conta per le fermate
    const pass = new Uint8Array(W * H);
    {
      const seen = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H);
      let best = -1, bestN = 0, comp = 0;
      for (let i0 = 0; i0 < W * H; i0++) {
        if (road[i0] !== 1 || seen[i0] >= 0) continue;
        let h = 0, t = 0;
        q[t++] = i0; seen[i0] = comp;
        while (h < t) {
          const i = q[h++], x = i % W;
          for (const j of [x + 1 < W ? i + 1 : -1, x > 0 ? i - 1 : -1, i + W < W * H ? i + W : -1, i - W]) if (j >= 0 && road[j] === 1 && seen[j] < 0) { seen[j] = comp; q[t++] = j; }
        }
        if (t > bestN) { bestN = t; best = comp; }
        comp++;
      }
      for (let i = 0; i < W * H; i++) if (seen[i] === best) pass[i] = 1;
    }
    const solid = new Uint8Array(W * H), nopass = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { solid[i] = road[i] ? 0 : 1; nopass[i] = pass[i] ? 0 : 1; }
    // collisioni su una griglia 3 volte più fine, larga quanto l'asfalto disegnato (niente bordi invisibili)
    const CS = 3, CW = W * CS, CH2 = H * CS, csolid = new Uint8Array(CW * CH2).fill(1);
    const fine = (pts, r) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
        for (let ty = Math.max(0, Math.floor((Math.min(ay, by) - r) * CS)); ty <= Math.min(CH2 - 1, Math.floor((Math.max(ay, by) + r) * CS)); ty++) {
          for (let tx = Math.max(0, Math.floor((Math.min(ax, bx) - r) * CS)); tx <= Math.min(CW - 1, Math.floor((Math.max(ax, bx) + r) * CS)); tx++) {
            const cx = (tx + 0.5) / CS, cy = (ty + 0.5) / CS, t = clamp(((cx - ax) * dx + (cy - ay) * dy) / L2, 0, 1);
            if ((cx - ax - t * dx) ** 2 + (cy - ay - t * dy) ** 2 <= r * r) csolid[ty * CW + tx] = 0;
          }
        }
      }
    };
    for (const e of edges) fine(e.pts, e.hw + ASPH);
    for (const N of nodes) if (N.deg >= 3) fine([[N.x, N.y], [N.x + 1e-3, N.y]], N.hw + ASPH * 0.6);
    // corsie (tratto orientato de = 2·e + verso): a destra della mezzeria (al centro nei sensi unici), accorciate agli incroci
    const lanes = [], lend = [], lstart = [], grp = [];
    for (const e of edges) for (let dir = 0; dir < 2; dir++) {
      const pts = dir ? e.pts.slice().reverse() : e.pts, n0 = dir ? e.b : e.a, n1 = dir ? e.a : e.b;
      const P = polyOf(offsetLine(pts, e.one ? 0 : 0.5));
      let r0 = nodes[n0].r, r1 = nodes[n1].r;
      const spare = P.len - r0 - r1;
      if (spare < 0.6) { const k = Math.max(0, P.len - 0.6) / Math.max(1e-6, r0 + r1); r0 *= k; r1 *= k; }
      const L = polyOf(cut(P.pts, r0, P.len - r1));
      L.ok = !e.slow && (e.one === 0 || (e.one === 1) === (dir === 0));
      lanes.push(L); lstart.push(n0); lend.push(n1);
    }
    // gruppi del semaforo: per ogni incrocio, direzione di riferimento = la strada più importante
    const outAng = (n, e) => { const p = e.a === n ? e.pts : e.pts.slice().reverse(); return Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]); };
    nodes.forEach((N, n) => {
      let ref = null, best = 1e9;
      for (const i of N.inc) { const e = edges[i]; const sc = e.c * 1000 - e.len; if (sc < best) { best = sc; ref = outAng(n, e); } }
      N.ref = ref || 0;
    });
    for (let de = 0; de < lanes.length; de++) {
      const e = edges[de >> 1], n = lend[de];
      grp[de] = Math.abs(Math.cos(outAng(n, e) - nodes[n].ref)) >= Math.SQRT1_2 ? 0 : 1;
    }
    // uscite dagli incroci per il traffico
    const out = nodes.map((N, n) => N.inc.flatMap((i) => { const e = edges[i]; const ds = []; if (e.a === n) ds.push(2 * i); if (e.b === n) ds.push(2 * i + 1); return ds; }).filter((de) => lanes[de].ok));
    // indice spaziale dei tratti (celle da 8 caselle)
    const EC = 8, ew = Math.ceil(W / EC), eh = Math.ceil(H / EC), egrid = Array.from({ length: ew * eh }, () => []);
    for (const e of edges) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [x, y] of e.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      e.box = [x0 - 2, y0 - 2, x1 + 2, y1 + 2];
      for (let cy = clamp(Math.floor((y0 - 2) / EC), 0, eh - 1); cy <= clamp(Math.floor((y1 + 2) / EC), 0, eh - 1); cy++) for (let cx = clamp(Math.floor((x0 - 2) / EC), 0, ew - 1); cx <= clamp(Math.floor((x1 + 2) / EC), 0, ew - 1); cx++) egrid[cy * ew + cx].push(e.id);
    }
    // fermate: lungo i tratti carrabili, sui due lati, ogni ~3,5 caselle (non vicino agli incroci)
    const spots = [];
    const areaAt = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < W && ty < H ? area[ty * W + tx] : AR.WATER; };
    const passAt = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < W && ty < H && pass[ty * W + tx] === 1; };
    const C = edges.map((e) => polyOf(e.pts));
    for (const e of edges) {
      if (e.slow) continue;
      const t0 = nodes[e.a].r + 1.1, t1 = e.len - nodes[e.b].r - 1.1;
      for (let t = t0; t <= t1; t += 3.5) {
        const [cx, cy, a] = along(C[e.id], t), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
        for (const sd of [1, -1]) {
          const lo = e.one ? 0.42 : 0.5, zx = cx + nx * sd * lo, zy = cy + ny * sd * lo;
          const off = e.hw + ASPH + SIDE, x = cx + nx * sd * off, y = cy + ny * sd * off;
          if (!passAt(zx, zy)) continue;
          const ar = areaAt(cx + nx * sd * (off + 0.9), cy + ny * sd * (off + 0.9));
          if (ar === AR.WATER || areaAt(x, y) === AR.WATER) continue;
          const k = ar === AR.PARK || ar === AR.FIELD ? 'park' : ar === AR.SAND ? 'beach' : 'bld';
          const ang = sd > 0 ? a : wrap(a + Math.PI);
          const h = Math.round(((ang + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 2)) % 4;
          spots.push({ id: spots.length, b: e.id, x: r1(x * 10) / 10, y: r1(y * 10) / 10, zx: r1(zx * 10) / 10, zy: r1(zy * 10) / 10, h, a: +ang.toFixed(3), k, e: e.id, sd, poi: -1 });
        }
      }
    }
    // luoghi notevoli → fermata più vicina (la più vicina al marciapiede, entro 7 caselle)
    const SC = 8, sw = Math.ceil(W / SC), sh = Math.ceil(H / SC), sgrid = Array.from({ length: sw * sh }, () => []);
    for (const p of spots) sgrid[clamp(Math.floor(p.y / SC), 0, sh - 1) * sw + clamp(Math.floor(p.x / SC), 0, sw - 1)].push(p.id);
    const nearSpot = (x, y, R) => {
      let best = -1, bd = R * R;
      for (let cy = Math.floor((y - R) / SC); cy <= Math.floor((y + R) / SC); cy++) for (let cx = Math.floor((x - R) / SC); cx <= Math.floor((x + R) / SC); cx++) {
        if (cx < 0 || cy < 0 || cx >= sw || cy >= sh) continue;
        for (const id of sgrid[cy * sw + cx]) { const p = spots[id]; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = id; } }
      }
      return best;
    };
    const RANK = { pier: 9, castle: 9, harbour: 8, station: 8, beach: 7, taxi: 7, depot: 6, gelato: 5, food: 5, bakery: 5, cafe: 4, sight: 4, square: 4, park: 3, church: 3, hotel: 2, school: 2, shop: 1 };
    for (const P of md.pois.slice().sort((a, b) => (RANK[b.k] || 0) - (RANK[a.k] || 0))) {
      const id = nearSpot(P.x, P.y, 7);
      if (id < 0) continue;
      P.spot = id;
      if (spots[id].poi < 0) spots[id].poi = P.id;
    }
    g = {
      osm: true, md, key: 'osm:' + id, W, H, solid, nopass, cs: CS, csolid, road, pass, area, nodes, edges, center: C, lanes, lstart, lend, grp, out, egrid, EC, ew, eh,
      blocks: [], spots, nearSpot, walks: new Map(), turns: new Map(), nodeAt: () => -1, at: () => EDGE, df: new Map(), dfMax: 10,
      cell: 2, bw: Math.ceil(W / 2), bh: Math.ceil(H / 2),
    };
    g.buckets = Array.from({ length: g.bw * g.bh }, () => []);
    g.used = [];
    OG.set(id, g);
    return g;
  }
  // marciapiede di un lato del tratto (sd = +1 a destra andando da a verso b), con il tratto percorribile [ua, ub]
  function walkOf(g, e, sd) {
    const k = 2 * e + (sd > 0 ? 0 : 1);
    let w = g.walks.get(k);
    if (w) return w;
    const E = g.edges[e], A = g.nodes[E.a], B = g.nodes[E.b];
    w = polyOf(offsetLine(E.pts, sd * (E.hw + ASPH + SIDE)));
    w.ua = Math.min(w.len / 2, A.deg >= 3 ? A.r - 0.1 : 0.25);
    w.ub = Math.max(w.len / 2, w.len - (B.deg >= 3 ? B.r - 0.1 : 0.25));
    g.walks.set(k, w);
    return w;
  }
  // svolta da de1 (arriva all'incrocio) a de2 (riparte): Bézier quadratica tra la fine e l'inizio delle due corsie
  function turnOf(g, d1, d2) {
    const key = d1 * 65536 + d2;
    let T = g.turns.get(key);
    if (T) return T;
    const A = g.lanes[d1], B = g.lanes[d2], pa = A.pts, pb = B.pts;
    const p0 = pa[pa.length - 1], q0 = pa[pa.length - 2], p2 = pb[0], q2 = pb[1];
    let tx = p0[0] - q0[0], ty = p0[1] - q0[1], L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    let ux = q2[0] - p2[0], uy = q2[1] - p2[1]; L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    const mx = (p0[0] + p2[0]) / 2, my = (p0[1] + p2[1]) / 2;
    let c = [mx, my];
    if (d2 === (d1 ^ 1)) c = [mx + tx * 1.1, my + ty * 1.1];
    else {
      const cr = tx * uy - ty * ux, Dx = p2[0] - p0[0], Dy = p2[1] - p0[1];
      if (Math.abs(cr) > 0.2) {
        const u = (Dx * uy - Dy * ux) / cr, v = -(Dx * ty - Dy * tx) / cr;
        if (u > 0.05 && u < 4 && v > 0.05 && v < 4) c = [p0[0] + tx * u, p0[1] + ty * u];
      }
    }
    T = { p0, c, p2, len: Math.max(0.3, quadLen(p0, c, p2)) };
    g.turns.set(key, T);
    return T;
  }
  function chooseTurnO(s, g, n, d) {
    const outs = g.out[n], back = d ^ 1;
    let opts = outs.filter((x) => x !== back);
    if (!opts.length) opts = outs.length ? outs : [back];
    if (opts.length === 1) return opts[0];
    const A = g.lanes[d].pts, a0 = Math.atan2(A[A.length - 1][1] - A[A.length - 2][1], A[A.length - 1][0] - A[A.length - 2][0]);
    const dev = opts.map((x) => { const B = g.lanes[x].pts; return Math.abs(wrap(Math.atan2(B[1][1] - B[0][1], B[1][0] - B[0][0]) - a0)); });
    const m = Math.min(...dev), w = dev.map((v) => (v === m ? 2 : 1)), tot = w.reduce((a, b) => a + b, 0);
    let r = rand(s) * tot;
    for (let k = 0; k < opts.length; k++) { r -= w[k]; if (r < 0) return opts[k]; }
    return opts[opts.length - 1];
  }
  // traffico e pedoni solo attorno a Hari ("bolla"): chi resta troppo lontano rinasce fuori dalla vista, più avanti
  const NPC_R = [16, 30, 34], PED_R2 = [13, 22, 25];
  function spawnNpcO(s, g, kind, rmin, rmax) {
    const K = NPCS[kind], c = s.car;
    for (let tries = 0; tries < 50; tries++) {
      const an = rand(s) * Math.PI * 2, rr = rmin + rand(s) * (rmax - rmin);
      const px = c.x + Math.cos(an) * rr, py = c.y + Math.sin(an) * rr;
      if (px < 0 || py < 0 || px >= g.W || py >= g.H) continue;
      const cell = g.egrid[Math.floor(py / g.EC) * g.ew + Math.floor(px / g.EC)];
      if (!cell.length) continue;
      const e = cell[Math.floor(rand(s) * cell.length)], de = 2 * e + (rand(s) < 0.5 ? 0 : 1);
      const L = g.lanes[de];
      if (!L.ok || L.len < K.len + STOP_OFF + 0.4) continue;
      const v = { id: ++s.seq, k: kind, c: Math.floor(rand(s) * 6), n0: g.lstart[de], d: de, n1: g.lend[de], sg: 0, d2: de, s: 0, len: L.len, x: 0, y: 0, a: 0, v: 0, vm: +(K.vmax * (0.88 + rand(s) * 0.24)).toFixed(2), wait: 0, ghost: 0, bonk: 0, honk: 0, bk: 0, why: '' };
      v.s = r1(K.len / 2 + rand(s) * (L.len - K.len - STOP_OFF));
      const [x, y, a] = along(L, v.s);
      const dc = Math.hypot(x - c.x, y - c.y);
      if (dc < Math.max(5, rmin * 0.75) || dc > rmax + 8) continue;
      if (s.npcs.some((o) => Math.hypot(o.x - x, o.y - y) < (NPCS[o.k].len + K.len) / 2 + 0.6)) continue;
      v.x = nz(x); v.y = nz(y); v.a = nz(a); v.v = v.vm * 0.5;
      return v;
    }
    return null;
  }
  function spawnPedO(s, g, rmin, rmax) {
    const c = s.car;
    for (let tries = 0; tries < 40; tries++) {
      const an = rand(s) * Math.PI * 2, rr = rmin + rand(s) * (rmax - rmin);
      const px = c.x + Math.cos(an) * rr, py = c.y + Math.sin(an) * rr;
      if (px < 0 || py < 0 || px >= g.W || py >= g.H) continue;
      const cell = g.egrid[Math.floor(py / g.EC) * g.ew + Math.floor(px / g.EC)];
      if (!cell.length) continue;
      const e = cell[Math.floor(rand(s) * cell.length)], sd = rand(s) < 0.5 ? 1 : -1, w = walkOf(g, e, sd);
      if (w.ub - w.ua < 0.6) continue;
      const u = w.ua + rand(s) * (w.ub - w.ua), [x, y] = along(w, u);
      const tx = Math.floor(x), ty = Math.floor(y);
      if (tx < 0 || ty < 0 || tx >= g.W || ty >= g.H || g.area[ty * g.W + tx] === AR.WATER) continue;
      if (Math.hypot(x - c.x, y - c.y) < Math.min(4, rmin)) continue;
      return { id: ++s.seq, k: Math.floor(rand(s) * PEDS.length), b: e, e, sd, u: r1(u), dir: rand(s) < 0.5 ? -1 : 1, sp: +(0.7 + rand(s) * 0.3).toFixed(2), st: 0, x: nz(x), y: nz(y), cr: null, cw: null, tt: 0, scared: 0 };
    }
    return null;
  }
  function bubble(s, g) {
    const c = s.car;
    for (let i = 0; i < s.npcs.length; i++) {
      const v = s.npcs[i];
      if (Math.hypot(v.x - c.x, v.y - c.y) < NPC_R[2]) continue;
      const nv = spawnNpcO(s, g, v.k, NPC_R[0], NPC_R[1]);
      if (nv) s.npcs[i] = nv;
    }
    for (let i = 0; i < s.peds.length; i++) {
      const p = s.peds[i];
      if (p.st !== 0 || Math.hypot(p.x - c.x, p.y - c.y) < PED_R2[2]) continue;
      const np = spawnPedO(s, g, PED_R2[0], PED_R2[1]);
      if (np) s.peds[i] = np;
    }
  }
  // pedone sulle mappe reali: cammina sul marciapiede di un tratto; all'incrocio gira l'angolo verso il marciapiede
  // vicino oppure (col semaforo) attraversa il tratto sulle strisce col suo verde
  function pedTickO(s, g, p) {
    const dt = TICK;
    if (p.cw) {
      const L = Math.hypot(p.cw.x1 - p.cw.x0, p.cw.y1 - p.cw.y0) || 1;
      p.cw.q = Math.min(1, p.cw.q + (p.sp * dt) / L);
      p.x = nz(p.cw.x0 + (p.cw.x1 - p.cw.x0) * p.cw.q); p.y = nz(p.cw.y0 + (p.cw.y1 - p.cw.y0) * p.cw.q);
      if (p.cw.q >= 1) p.cw = null;
      return;
    }
    const w = walkOf(g, p.e, p.sd);
    p.u += p.dir * p.sp * dt;
    if (p.u > w.ub || p.u < w.ua) {
      p.u = clamp(p.u, w.ua, w.ub);
      const E = g.edges[p.e], n = p.dir > 0 ? E.b : E.a, N = g.nodes[n];
      const [x0, y0] = along(w, p.u);
      if (N.lit && N.deg >= 3 && N.deg <= 4 && E.len >= 2 * N.r + 1 && rand(s) < 0.5) {   // dove ci sono le strisce
        const w2 = walkOf(g, p.e, -p.sd), u2 = p.dir > 0 ? w2.ub : w2.ua, [x1, y1] = along(w2, u2);
        const din = 2 * p.e + (E.b === n ? 0 : 1);
        p.x = nz(x0); p.y = nz(y0); p.st = 1; p.tt = 0;
        p.cr = { n, ph: 1 - g.grp[din], x0, y0, x1, y1, b0: { e: p.e, sd: p.sd, u: r1(p.u), dir: -p.dir }, b1: { e: p.e, sd: -p.sd, u: r1(u2), dir: -p.dir }, q: 0 };
        return;
      }
      let best = null, bd = 3.6 * 3.6;
      for (const f of N.inc) {
        if (f === p.e && N.deg > 1) continue;
        const F = g.edges[f];
        for (const sd of [1, -1]) {
          if (f === p.e && sd === p.sd) continue;
          const w3 = walkOf(g, f, sd), u3 = F.a === n ? w3.ua : w3.ub, [x, y] = along(w3, u3);
          const tx = Math.floor(x), ty = Math.floor(y);
          if (tx < 0 || ty < 0 || tx >= g.W || ty >= g.H || g.area[ty * g.W + tx] === AR.WATER) continue;
          const d = (x - x0) ** 2 + (y - y0) ** 2;
          if (d < bd) { bd = d; best = { e: f, sd, u: u3, dir: F.a === n ? 1 : -1, x, y }; }
        }
      }
      if (best && N.deg > 1) {
        p.cw = { x0, y0, x1: best.x, y1: best.y, q: 0 };
        p.e = best.e; p.b = best.e; p.sd = best.sd; p.u = r1(best.u); p.dir = best.dir;
        return;
      }
      p.dir = -p.dir;
    }
    const [x, y] = along(w, p.u);
    p.x = nz(x); p.y = nz(y);
  }

  /* ---------- semafori ---------- */
  // fase dell'incrocio: 0 verde est-ovest · 1 verde nord-sud · 2 tutto rosso; left = secondi di verde rimasti
  function light(s, n) {
    let t = (s.t + n * 2.3) % CYCLE;
    if (t < GREEN) return { ph: 0, left: GREEN - t };
    t -= GREEN;
    if (t < ALLRED) return { ph: 2, left: 0 };
    t -= ALLRED;
    if (t < GREEN) return { ph: 1, left: GREEN - t };
    return { ph: 2, left: 0 };
  }

  /* ---------- corsie: geometria dei segmenti del traffico ---------- */
  const rt = (d) => { const [hx, hy] = DIRS[d]; return [-hy, hx]; };      // normale a destra
  function exitPt(g, n, d) { const N = g.nodes[n], [hx, hy] = DIRS[d], [rx, ry] = rt(d); return [N.x + hx + 0.5 * rx, N.y + hy + 0.5 * ry]; }
  function entryPt(g, n, d) { const N = g.nodes[n], [hx, hy] = DIRS[d], [rx, ry] = rt(d); return [N.x - hx + 0.5 * rx, N.y - hy + 0.5 * ry]; }
  function quadLen(p0, c, p2) {
    let L = 0, px = p0[0], py = p0[1];
    for (let k = 1; k <= 10; k++) {
      const t = k / 10, u = 1 - t;
      const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1];
      L += Math.hypot(x - px, y - py); px = x; py = y;
    }
    return L;
  }
  const TURN_LEN = {};
  function segLen(g, v) {
    if (g.osm) return v.sg === 0 ? g.lanes[v.d].len : turnOf(g, v.d, v.d2).len;
    if (v.sg === 0) { const a = exitPt(g, v.n0, v.d), b = entryPt(g, v.n1, v.d); return Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); }
    if (v.d2 === v.d) return 2;
    const k = (v.d2 - v.d + 4) % 4;
    if (TURN_LEN[k] == null) {
      const fake = { nodes: [{ x: 0, y: 0 }] }, p0 = entryPt(fake, 0, 0), p2 = exitPt(fake, 0, k), [r0x, r0y] = rt(0), [r1x, r1y] = rt(k);
      TURN_LEN[k] = quadLen(p0, [0.5 * r0x + 0.5 * r1x, 0.5 * r0y + 0.5 * r1y], p2);
    }
    return TURN_LEN[k];
  }
  // posizione e direzione sul segmento
  function segPos(g, v) {
    if (g.osm) {
      if (v.sg === 0) return along(g.lanes[v.d], v.s);
      const T = turnOf(g, v.d, v.d2), t = clamp(v.s / v.len, 0, 1), u = 1 - t, { p0, c, p2 } = T;
      const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1];
      const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0]), dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1]);
      return [x, y, Math.atan2(dy, dx)];
    }
    if (v.sg === 0) {
      const [x, y] = exitPt(g, v.n0, v.d), [hx, hy] = DIRS[v.d];
      return [x + hx * v.s, y + hy * v.s, Math.atan2(hy, hx)];
    }
    const p0 = entryPt(g, v.n1, v.d), p2 = exitPt(g, v.n1, v.d2);
    if (v.d2 === v.d) { const [hx, hy] = DIRS[v.d]; return [p0[0] + hx * v.s, p0[1] + hy * v.s, Math.atan2(hy, hx)]; }
    const N = g.nodes[v.n1], [r0x, r0y] = rt(v.d), [r1x, r1y] = rt(v.d2);
    const c = [N.x + 0.5 * r0x + 0.5 * r1x, N.y + 0.5 * r0y + 0.5 * r1y];
    const t = clamp(v.s / v.len, 0, 1), u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1];
    const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0]), dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1]);
    return [x, y, Math.atan2(dy, dx)];
  }
  function chooseTurn(s, g, n, d) {
    const nb = g.nodes[n].nb, back = (d + 2) % 4;
    const opts = [];
    for (let k = 0; k < 4; k++) if (nb[k] >= 0 && k !== back) opts.push(k);
    if (!opts.length) return back;
    // dritto più probabile
    const w = opts.map((k) => (k === d ? 2 : 1)), tot = w.reduce((a, b) => a + b, 0);
    let r = rand(s) * tot;
    for (let k = 0; k < opts.length; k++) { r -= w[k]; if (r < 0) return opts[k]; }
    return opts[opts.length - 1];
  }

  /* ---------- isolati: perimetro dei marciapiedi ---------- */
  function rectOf(b) { return { X0: b.x0 + INSET, Y0: b.y0 + INSET, X1: b.x1 - INSET, Y1: b.y1 - INSET }; }
  function perimPos(b, u) {
    const r = rectOf(b), w = r.X1 - r.X0, h = r.Y1 - r.Y0, P = 2 * (w + h);
    u = ((u % P) + P) % P;
    if (u < w) return [r.X0 + u, r.Y0, 0];
    if (u < w + h) return [r.X1, r.Y0 + u - w, 1];
    if (u < 2 * w + h) return [r.X1 - (u - w - h), r.Y1, 2];
    return [r.X0, r.Y1 - (u - 2 * w - h), 3];
  }
  function perimU(b, x, y) {
    const r = rectOf(b), w = r.X1 - r.X0, h = r.Y1 - r.Y0;
    const dTop = Math.abs(y - r.Y0), dR = Math.abs(x - r.X1), dB = Math.abs(y - r.Y1), dL = Math.abs(x - r.X0), m = Math.min(dTop, dR, dB, dL);
    if (m === dTop) return clamp(x - r.X0, 0, w);
    if (m === dR) return w + clamp(y - r.Y0, 0, h);
    if (m === dB) return w + h + clamp(r.X1 - x, 0, w);
    return 2 * w + h + clamp(r.Y1 - y, 0, h);
  }
  const perimLen = (b) => { const r = rectOf(b); return 2 * (r.X1 - r.X0 + r.Y1 - r.Y0); };
  // attraversamenti possibili dall'angolo k (0 NO, 1 NE, 2 SE, 3 SO) dell'isolato b
  function crossings(g, b, k) {
    const r = rectOf(b), out = [];
    const X = k === 0 || k === 3 ? r.X0 : r.X1, Y = k < 2 ? r.Y0 : r.Y1;
    const bx = k === 0 || k === 3 ? b.x0 - 2 : b.x1, by = k < 2 ? b.y0 - 2 : b.y1;   // incrocio accanto all'angolo
    const n = g.nodeAt(bx, by);
    if (n < 0 || !g.nodes[n].lit) return out;
    const blockAt = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx >= 0 && ty >= 0 && tx < g.W && ty < g.H ? g.bid[ty * g.W + tx] : -1; };
    const isRoad = (x, y) => g.at(Math.floor(x), Math.floor(y)) === ROAD;
    // verso nord / sud: attraversa la strada orizzontale (col verde nord-sud), verso est / ovest quella verticale
    const vert = k < 2 ? [X, b.y0 - 2 - INSET, b.y0 - 1, b.y0 - 2.5] : [X, b.y1 + 2 + INSET, b.y1 + 0.5, b.y1 + 2.5];
    const horz = k === 0 || k === 3 ? [b.x0 - 2 - INSET, Y, b.x0 - 1, b.x0 - 2.5] : [b.x1 + 2 + INSET, Y, b.x1 + 0.5, b.x1 + 2.5];
    if (isRoad(X, vert[2]) && blockAt(X, vert[3]) >= 0) out.push({ n, ph: 1, x1: X, y1: vert[1], b1: blockAt(X, vert[3]) });
    if (isRoad(horz[2], Y) && blockAt(horz[3], Y) >= 0) out.push({ n, ph: 0, x1: horz[0], y1: Y, b1: blockAt(horz[3], Y) });
    return out;
  }

  /* ---------- nuovo livello ---------- */
  function newLevel(level, rnd = Math.random, mapId) {
    if (mapId && mapId !== 'hari') return newLevelOsm(level, rnd, mapId);
    const cfg = config(level);
    const city = buildCity(cfg, rnd);
    const s = {
      v: 1, level: cfg.level, type: cfg.type, veh: cfg.veh, N: cfg.jobs, batch: cfg.batch,
      W: city.W, H: city.H, vx: city.vx, hy: city.hy, map: city.map,
      t: 0, ticks: 0, acc: 0, ready: READY, wait: false, waitMode: false, inp: null,
      car: { x: 0, y: 0, a: 0, v: 0, rev: false }, inv: 0, bumpT: 0, bonkT: 0,
      npcs: [], peds: [], trip: null, rest: [], depot: -1, last: -1,
      done: 0, oops: 0, mistakes: 0, crashes: 0, late: 0, moves: 0, won: false, seq: 0,
      rs: Math.floor(rnd() * 4294967296) >>> 0,
    };
    const g = geo(s);
    // ristoranti (cibo) e deposito (pacchi) su isolati con edifici, lontani tra loro
    const bld = g.spots.filter((p) => p.k === 'bld');
    const pool = bld.length ? bld : g.spots;
    const cx = s.W / 2, cy = s.H / 2;
    if (cfg.type === 'food') {
      const want = cfg.tier >= 2 ? 3 : 2;
      let first = pool[Math.floor(rand(s) * pool.length)];
      s.rest.push(first.id);
      while (s.rest.length < want) {
        let best = null, bd = -1;
        for (const p of pool) {
          if (s.rest.some((r) => g.spots[r].b === p.b)) continue;
          const d = Math.min(...s.rest.map((r) => Math.hypot(g.spots[r].x - p.x, g.spots[r].y - p.y))) + rand(s) * 3;
          if (d > bd) { bd = d; best = p; }
        }
        if (!best) break;
        s.rest.push(best.id);
      }
      first = null;
    }
    if (cfg.type === 'parcel') {
      let best = null, bd = 1e9;
      for (const p of pool) { const d = Math.hypot(p.x - cx, p.y - cy) + rand(s) * 4; if (d < bd) { bd = d; best = p; } }
      s.depot = best.id;
    }
    // partenza: davanti al deposito / a un ristorante, oppure in una via vicino al centro
    const startSpot = cfg.type === 'parcel' ? g.spots[s.depot] : cfg.type === 'food' ? g.spots[s.rest[0]]
      : (() => { const near = g.spots.filter((p) => Math.hypot(p.zx - cx, p.zy - cy) < Math.max(4, s.W * 0.25)); const l = near.length ? near : g.spots; return l[Math.floor(rand(s) * l.length)]; })();
    const [hx, hy] = DIRS[startSpot.h];
    s.car.x = nz(startSpot.zx - hx * 0.6); s.car.y = nz(startSpot.zy - hy * 0.6); s.car.a = Math.atan2(hy, hx);
    if (cfg.type === 'taxi') s.last = startSpot.id;
    // traffico
    for (let k = 0; k < cfg.cars; k++) {
      const r = rand(s);
      const kind = cfg.buses && r < 0.14 ? 'bus' : cfg.bikes && r > 0.84 ? 'bike' : 'car';
      spawnNpc(s, g, kind);
    }
    for (let k = 0; k < cfg.peds; k++) spawnPed(s, g);
    newTrip(s, []);
    return s;
  }

  // mappe reali: ogni livello parte da un luogo notevole diverso (pontile, stazione, castello, porto…), le corse
  // restano nei dintorni; ristoranti e deposito sono i più vicini a quel punto
  function newLevelOsm(level, rnd, mapId) {
    const cfg = config(level, mapId);
    const md = mapData(mapId);
    if (!md) throw new Error('drive: mappa non caricata ' + mapId);
    const s = {
      v: 1, mapId, level: cfg.level, type: cfg.type, veh: cfg.veh, N: cfg.jobs, batch: cfg.batch,
      W: md.W, H: md.H, t: 0, ticks: 0, acc: 0, ready: READY, wait: false, waitMode: false, inp: null,
      car: { x: 0, y: 0, a: 0, v: 0, rev: false }, inv: 0, bumpT: 0, bonkT: 0,
      npcs: [], peds: [], trip: null, rest: [], depot: -1, last: -1, home: -1,
      done: 0, oops: 0, mistakes: 0, crashes: 0, late: 0, moves: 0, won: false, seq: 0,
      rs: Math.floor(rnd() * 4294967296) >>> 0,
    };
    const g = geo(s);
    // punto di partenza del livello
    const an = md.anchors.length ? md.pois[md.anchors[(cfg.level - 1) % md.anchors.length]] : null;
    const ax = an ? an.x : md.W / 2, ay = an ? an.y : md.H / 2;
    const home = an && an.spot >= 0 ? g.spots[an.spot] : g.spots[g.nearSpot(ax, ay, 60)] || g.spots[0];
    s.home = home.id;
    const f0 = field(s, tileOf(s, home.zx, home.zy));
    const ok = (p) => f0[tileOf(s, p.zx, p.zy)] >= 0;
    const byDist = (list) => list.map((p) => ({ p, d: f0[tileOf(s, p.zx, p.zy)] })).filter((q) => q.d >= 0).sort((a, b) => a.d - b.d).map((q) => q.p);
    const FOOD = ['food', 'gelato', 'bakery', 'cafe'];
    if (cfg.type === 'food') {
      const want = cfg.tier >= 2 ? 3 : 2;
      const cand = byDist(md.pois.filter((P) => FOOD.includes(P.k) && P.spot >= 0).map((P) => g.spots[P.spot])).filter((p) => f0[tileOf(s, p.zx, p.zy)] <= 70);
      const start = Math.floor(rand(s) * Math.min(3, cand.length));
      for (const p of cand.slice(start).concat(cand.slice(0, start))) {
        if (s.rest.length >= want) break;
        if (s.rest.some((r) => g.spots[r].b === p.b || Math.hypot(g.spots[r].x - p.x, g.spots[r].y - p.y) < 8)) continue;
        s.rest.push(p.id);
      }
      // pochi ristoranti in zona: si usano negozi qualsiasi vicino alla partenza
      for (const p of byDist(g.spots.filter((q) => q.k === 'bld' && Math.hypot(q.x - home.x, q.y - home.y) < 40))) {
        if (s.rest.length >= want) break;
        if (!s.rest.some((r) => g.spots[r].b === p.b || Math.hypot(g.spots[r].x - p.x, g.spots[r].y - p.y) < 10)) s.rest.push(p.id);
      }
    }
    if (cfg.type === 'parcel') {
      const dep = byDist(md.pois.filter((P) => P.k === 'depot' && P.spot >= 0).map((P) => g.spots[P.spot]));
      const near = dep.find((p) => f0[tileOf(s, p.zx, p.zy)] <= 90);
      s.depot = (near || byDist(g.spots.filter((q) => q.k === 'bld' && ok(q) && Math.hypot(q.x - home.x, q.y - home.y) < 20))[0] || home).id;
    }
    const startSpot = cfg.type === 'parcel' ? g.spots[s.depot] : cfg.type === 'food' && s.rest.length ? g.spots[s.rest[0]] : home;
    s.car.a = startSpot.a;
    s.car.x = nz(startSpot.zx - Math.cos(startSpot.a) * 0.6); s.car.y = nz(startSpot.zy - Math.sin(startSpot.a) * 0.6);
    if (cfg.type === 'taxi') s.last = startSpot.id;
    for (let k = 0; k < cfg.cars; k++) {
      const r = rand(s);
      const kind = cfg.buses && r < 0.14 ? 'bus' : cfg.bikes && r > 0.84 ? 'bike' : 'car';
      const v = spawnNpcO(s, g, kind, 5, NPC_R[1]);
      if (v) s.npcs.push(v);
    }
    for (let k = 0; k < cfg.peds; k++) { const p = spawnPedO(s, g, 3, PED_R2[1]); if (p) s.peds.push(p); }
    newTrip(s, []);
    return s;
  }

  function spawnNpc(s, g, kind) {
    const K = NPCS[kind];
    for (let tries = 0; tries < 60; tries++) {
      const n0 = Math.floor(rand(s) * g.nodes.length), N = g.nodes[n0];
      const ds = [0, 1, 2, 3].filter((d) => N.nb[d] >= 0);
      if (!ds.length) continue;
      const d = ds[Math.floor(rand(s) * ds.length)];
      const v = { id: ++s.seq, k: kind, c: Math.floor(rand(s) * 6), n0, d, n1: N.nb[d], sg: 0, d2: d, s: 0, len: 0, x: 0, y: 0, a: 0, v: 0, vm: +(K.vmax * (0.88 + rand(s) * 0.24)).toFixed(2), wait: 0, ghost: 0, bonk: 0, honk: 0, bk: 0, why: '' };
      v.len = segLen(g, v);
      if (v.len < K.len + STOP_OFF + 0.4) continue;
      v.s = r1(K.len / 2 + rand(s) * (v.len - K.len - STOP_OFF));          // mai oltre la linea d'arresto
      const [x, y, a] = segPos(g, v);
      if (Math.hypot(x - s.car.x, y - s.car.y) < 5) continue;
      if (s.npcs.some((o) => Math.hypot(o.x - x, o.y - y) < (NPCS[o.k].len + K.len) / 2 + 0.6)) continue;
      v.x = x; v.y = y; v.a = nz(a); v.v = v.vm * 0.5;
      s.npcs.push(v);
      return v;
    }
    return null;
  }
  function spawnPed(s, g) {
    if (!g.blocks.length) return null;
    const b = g.blocks[Math.floor(rand(s) * g.blocks.length)];
    const u = rand(s) * perimLen(b);
    const [x, y] = perimPos(b, u);
    const p = { id: ++s.seq, k: Math.floor(rand(s) * PEDS.length), b: b.id, u: r1(u), dir: rand(s) < 0.5 ? -1 : 1, sp: +(0.7 + rand(s) * 0.3).toFixed(2), st: 0, x, y, cr: null, tt: 0, scared: 0 };
    s.peds.push(p);
    return p;
  }

  /* ---------- corse e consegne ---------- */
  function newTrip(s, ev) {
    const g = geo(s), cfg = config(s.level, s.mapId), V = VEH[s.veh];
    const left = s.N - s.done, k = Math.max(1, Math.min(s.batch, left));
    let p;
    if (s.type === 'food') {
      const opts = s.rest.filter((r) => r !== s.last);
      p = g.spots[(opts.length ? opts : s.rest)[Math.floor(rand(s) * (opts.length ? opts.length : s.rest.length))]];
    } else if (s.type === 'parcel') p = g.spots[s.depot];
    else {
      // passeggero: né troppo vicino né troppo lontano da dove si trova Hari
      const f = field(s, roadTile(s, s.car.x, s.car.y) >= 0 ? roadTile(s, s.car.x, s.car.y) : tileOf(s, s.car.x, s.car.y));
      p = g.osm ? pickSpot(s, g, f, 6, Math.max(16, cfg.dmax * 0.35), (q) => q.id !== s.last) : pickSpot(s, g, f, 6, Math.max(10, cfg.dmax * 0.6), (q) => q.id !== s.last);
    }
    // destinazioni
    const fp = field(s, tileOf(s, p.zx, p.zy));
    const drops = [];
    for (let i = 0; i < k; i++) {
      const lo = k > 1 ? Math.round(cfg.dmin * (g.osm ? 0.5 : 0.6)) : cfg.dmin;
      // mappe reali: con più consegne a bordo restano nel quartiere (il giro intero non deve durare minuti)
      const hi = g.osm && k > 1 ? Math.round(cfg.dmax * 0.6) : cfg.dmax;
      const q = pickSpot(s, g, fp, lo, hi, (c) => c.b !== p.b && !s.rest.includes(c.id) && c.id !== s.depot && drops.every((d) => Math.hypot(g.spots[d].x - c.x, g.spots[d].y - c.y) > 4));
      drops.push(q.id);
    }
    // tempo limite: giro "più vicino per primo" dal ritiro, a velocità di riferimento, più il margine del livello;
    // con più consegne a bordo il limite è lo stesso per tutte (il tempo dell'intero giro): l'ordine lo sceglie chi guida
    const refV = Math.min(V.vmax * 0.55, 2.3);        // nel traffico conta più la velocità delle auto che quella del veicolo
    const order = [], rem = drops.slice();
    let cur = tileOf(s, p.zx, p.zy), cum = 0;
    while (rem.length) {
      const f = field(s, cur);
      let bi = 0, bd = 1e9;
      rem.forEach((d, i) => { const q = g.spots[d], dd = f[tileOf(s, q.zx, q.zy)]; if (dd >= 0 && dd < bd) { bd = dd; bi = i; } });
      const d = rem.splice(bi, 1)[0];
      cum += bd < 1e9 ? bd : 30;
      order.push({ d, lim: r1(cfg.base + (cum / refV) * cfg.slack + STOP_T * order.length) });
      cur = tileOf(s, g.spots[d].zx, g.spots[d].zy);
    }
    const total = order.length ? order[order.length - 1].lim : 20;
    order.forEach((o) => { o.lim = total; });
    const who = s.type === 'taxi' ? Math.floor(rand(s) * PEDS.length) : s.type === 'food' ? Math.floor(rand(s) * DISHES.length) : 0;
    s.trip = {
      id: ++s.seq, p: p.id, st: 'go',
      items: order.map((o, i) => ({ id: ++s.seq, d: o.d, lim: o.lim, t: o.lim, st: 0, who: s.type === 'parcel' ? (i + Math.floor(rand(s) * 4)) % 4 : who })),
    };
    s.last = p.id;
    ev.push({ type: 'trip', id: s.trip.id });
  }
  function pickSpot(s, g, f, lo, hi, ok) {
    const list = [];
    let best = null, bd = 1e9;
    const mid = (lo + hi) / 2;
    for (const q of g.spots) {
      if (!ok(q)) continue;
      const d = f[tileOf(s, q.zx, q.zy)];
      if (d < 0) continue;
      if (d >= lo && d <= hi) list.push(q);
      const e = Math.abs(d - mid);
      if (e < bd) { bd = e; best = q; }
    }
    // mappe reali: metà delle volte un luogo con un nome (negozio, ristorante, stazione, spiaggia…)
    if (g.osm && list.length && rand(s) < 0.5) { const named = list.filter((q) => q.poi >= 0); if (named.length) return named[Math.floor(rand(s) * named.length)]; }
    if (list.length) return list[Math.floor(rand(s) * list.length)];
    return best || g.spots[Math.floor(rand(s) * g.spots.length)];
  }
  // dove andare ora: la fermata del ritiro, oppure le consegne caricate
  function targets(s) {
    const g = geo(s), tr = s.trip;
    if (!tr) return [];
    if (tr.st === 'go') { const p = g.spots[tr.p]; return [{ x: p.x, y: p.y, zx: p.zx, zy: p.zy, kind: 'pick', spot: p.id }]; }
    return tr.items.filter((it) => it.st === 1).map((it) => { const q = g.spots[it.d]; return { x: q.x, y: q.y, zx: q.zx, zy: q.zy, kind: 'drop', spot: q.id, item: it.id, t: it.t, lim: it.lim }; });
  }

  function start(s) { if (s.wait) { s.wait = false; return true; } return false; }

  /* ---------- controlli → guida ---------- */
  function cleanInput(inp) {
    if (!inp || typeof inp !== 'object') return null;
    if (typeof inp.ax === 'number' || typeof inp.ay === 'number') {
      const ax = isFinite(inp.ax) ? +inp.ax : 0, ay = isFinite(inp.ay) ? +inp.ay : 0, m = Math.hypot(ax, ay);
      return m > 1 ? { ax: ax / m, ay: ay / m } : { ax, ay };
    }
    return { steer: clamp(Math.round(+inp.steer || 0), -1, 1), gas: clamp(Math.round(+inp.gas || 0), -1, 1) };
  }
  const active = (i) => !!i && (i.ax != null ? Math.hypot(i.ax, i.ay) > 0.12 : i.steer !== 0 || i.gas !== 0);

  function drive(s, ev) {
    const c = s.car, P = VEH[s.veh], inp = s.inp, dt = TICK;
    let target = 0, turn = 0, rate = P.brake * 0.6;
    const grip = clamp(Math.abs(c.v) / 1.6, 0.3, 1);
    if (inp && inp.ax != null) {
      const m = Math.min(1, Math.hypot(inp.ax, inp.ay));
      if (m > 0.12) {
        const th = Math.atan2(inp.ay, inp.ax), d = wrap(th - c.a);
        if (c.rev) { if (Math.abs(d) < 1.3 || c.v > 0.3) c.rev = false; } else if (Math.abs(d) > 2.3 && c.v < 1) c.rev = true;
        let dh;
        if (c.rev) { dh = wrap(th + Math.PI - c.a); target = -0.45 * P.vmax * m; } else {
          dh = d;
          const ad = Math.abs(d);
          target = P.vmax * m * (ad > 1.4 ? 0.4 : 1 - 0.6 * ad / 1.4);
        }
        turn = clamp(dh / 0.35, -1, 1) * P.steer * grip;
        rate = 0;
      } else c.rev = false;
    } else if (inp && inp.steer != null) {
      turn = inp.steer * P.steer * grip * (c.v < -0.05 ? -1 : 1);
      if (inp.gas > 0) { target = P.vmax; rate = 0; } else if (inp.gas < 0) { target = c.v > 0.2 ? 0 : -0.45 * P.vmax; rate = c.v > 0.2 ? P.brake : 0; }
    }
    // mappe reali: nelle vie pedonali si va a passo d'uomo
    if (s.mapId && s.mapId !== 'hari') { const g = geo(s), tx = Math.floor(c.x), ty = Math.floor(c.y); if (tx >= 0 && ty >= 0 && tx < s.W && ty < s.H && g.road[ty * s.W + tx] === 2) target = clamp(target, -SLOW_V, SLOW_V); }
    if (!rate) rate = (target > c.v) === (c.v >= 0) ? P.acc : P.brake;
    if (c.v < target) c.v = Math.min(target, c.v + rate * dt); else c.v = Math.max(target, c.v - rate * dt);
    c.a = wrap(c.a + turn * dt);
    c.x += Math.cos(c.a) * c.v * dt;
    c.y += Math.sin(c.a) * c.v * dt;
    walls(s, ev);
    c.x = nz(c.x); c.y = nz(c.y); c.v = nz(c.v);
  }
  // cerchi di collisione lungo il veicolo
  function circles(x, y, a, hw, len, out) {
    const n = len > 1.4 ? 3 : len - 2 * hw > 0.05 ? 2 : 1, hx = Math.cos(a), hy = Math.sin(a), off = len / 2 - hw;
    out.length = 0;
    if (n === 1) out.push(x, y, hw);
    else if (n === 2) out.push(x + hx * off, y + hy * off, hw, x - hx * off, y - hy * off, hw);
    else out.push(x + hx * off, y + hy * off, hw, x, y, hw, x - hx * off, y - hy * off, hw);
    return out;
  }
  const CC = [], CO = [];
  // muri ed edifici: rimbalzo morbido, il veicolo scivola lungo il bordo; nessun cuore
  function walls(s, ev) {
    const g = geo(s), c = s.car, P = VEH[s.veh];
    // griglia delle collisioni: le caselle (città di Hari) o la griglia fine delle mappe reali (K celle per casella)
    const K = g.cs || 1, SOL = g.csolid || g.solid, GW = s.W * K, GH = s.H * K, u = 1 / K;
    let px = 0, py = 0;
    for (let pass = 0; pass < 2; pass++) {
      circles(c.x, c.y, c.a, P.hw, P.len, CC);
      let mx = 0, my = 0;
      for (let k = 0; k < CC.length; k += 3) {
        const x = CC[k], y = CC[k + 1], r = CC[k + 2];
        for (let ty = Math.floor((y - r) * K); ty <= Math.floor((y + r) * K); ty++) for (let tx = Math.floor((x - r) * K); tx <= Math.floor((x + r) * K); tx++) {
          const solid = tx < 0 || ty < 0 || tx >= GW || ty >= GH || SOL[ty * GW + tx];
          if (!solid) continue;
          const qx = clamp(x, tx * u, (tx + 1) * u), qy = clamp(y, ty * u, (ty + 1) * u);
          let dx = x - qx, dy = y - qy;
          const d = Math.hypot(dx, dy);
          if (d >= r) continue;
          if (d < 1e-6) { dx = x - (tx + 0.5) * u; dy = y - (ty + 0.5) * u; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; mx += dx * r; my += dy * r; continue; }
          const push = r - d;
          if (Math.abs(push * dx / d) > Math.abs(mx)) mx = push * dx / d;
          if (Math.abs(push * dy / d) > Math.abs(my)) my = push * dy / d;
        }
      }
      if (!mx && !my) break;
      c.x += mx; c.y += my; px += mx; py += my;
    }
    if (!px && !py) return;
    const L = Math.hypot(px, py), nx = px / L, ny = py / L;
    const hx = Math.cos(c.a), hy = Math.sin(c.a), into = -(hx * nx + hy * ny) * Math.sign(c.v || 1);
    if (into > 0.05) {
      const imp = Math.abs(c.v) * into;
      if (into > 0.75 && imp > 1.5) c.v = -c.v * P.bounce;    // di muso e veloce: piccolo rimbalzo all'indietro
      else {
        c.v *= 1 - 0.45 * into;
        // si raddrizza lungo il bordo: scivolare è più facile che incastrarsi
        const tx = hx - (hx * nx + hy * ny) * nx, ty = hy - (hx * nx + hy * ny) * ny;
        if (Math.hypot(tx, ty) > 0.08) {
          const ta = Math.atan2(ty, tx);
          c.a = wrap(c.a + clamp(wrap(ta - c.a), -0.05, 0.05));
        }
      }
      if (imp > 1.4 && s.bumpT <= 0) { s.bumpT = 0.4; ev.push({ type: 'bump', x: c.x - nx * P.hw, y: c.y - ny * P.hw, v: +imp.toFixed(2) }); }
    }
  }

  /* ---------- traffico ---------- */
  function bucketize(s, g) {
    for (const i of g.used) g.buckets[i].length = 0;
    g.used.length = 0;
    const put = (o) => {
      const i = clamp(Math.floor(o.y / g.cell), 0, g.bh - 1) * g.bw + clamp(Math.floor(o.x / g.cell), 0, g.bw - 1), b = g.buckets[i];
      if (!b.length) g.used.push(i);
      b.push(o);
    };
    for (const v of s.npcs) put(v);
    for (const p of s.peds) if (p.st >= 2 || (g.osm && p.st === 0)) put(p);
  }
  function npcTick(s, g, v, ev) {
    const dt = TICK, K = NPCS[v.k];
    if (v.bonk > 0) { v.bonk = Math.max(0, v.bonk - dt); v.v = 0; return; }
    if (v.bk > 0) {
      // Hari è fermo contromano davanti: l'auto fa gentilmente un po' di retromarcia (se dietro è libero)
      v.bk = Math.max(0, v.bk - dt);
      const hx = Math.cos(v.a), hy = Math.sin(v.a);
      const bx = clamp(Math.floor(v.x / g.cell), 0, g.bw - 1), by = clamp(Math.floor(v.y / g.cell), 0, g.bh - 1);
      let free = v.s > 0.25;
      for (let yy = Math.max(0, by - 1); yy <= Math.min(g.bh - 1, by + 1) && free; yy++) for (let xx = Math.max(0, bx - 1); xx <= Math.min(g.bw - 1, bx + 1) && free; xx++) {
        for (const o of g.buckets[yy * g.bw + xx]) {
          if (o === v || typeof o.k !== 'string') continue;
          const dx = o.x - v.x, dy = o.y - v.y, f = dx * hx + dy * hy;
          if (f < 0 && f > -(K.len + NPCS[o.k].len) / 2 - 0.4 && Math.abs(-dx * hy + dy * hx) < 0.5) { free = false; break; }
        }
      }
      if (free) v.s = nz(Math.max(0.25, v.s - 0.9 * dt));
      v.v = 0;
      const [x, y, a] = segPos(g, v);
      v.x = nz(x); v.y = nz(y); v.a = nz(a);
      return;
    }
    if (v.ghost > 0) v.ghost = Math.max(0, v.ghost - dt);
    if (v.honk > 0) v.honk = Math.max(0, v.honk - dt);
    let vmax = v.sg === 1 && v.d2 !== v.d ? v.vm * 0.62 : v.vm;
    let blocker = null;
    // semaforo rosso: si ferma alla linea prima delle strisce
    if (v.sg === 0 && g.nodes[v.n1].lit) {
      const rem = v.len - v.s, stopAt = rem - STOP_OFF;
      if (stopAt > -0.05) {
        const L = light(s, v.n1), green = L.ph === (g.osm ? g.grp[v.d] : v.d % 2);
        if (!green && stopAt >= (v.v * v.v) / (2 * NPC_DEC * 1.6) - 0.05) { vmax = Math.min(vmax, Math.sqrt(2 * NPC_DEC * Math.max(0, stopAt - 0.02))); blocker = 'light'; }
      }
    }
    // chi c'è davanti: veicoli nello stesso senso, Hari (sempre), pedoni sulle strisce
    const hx = Math.cos(v.a), hy = Math.sin(v.a), look = 0.6 + K.len + (v.v * v.v) / (2 * NPC_DEC) + 1.2;
    const bx0 = Math.floor((v.x - look) / g.cell), bx1 = Math.floor((v.x + look) / g.cell), by0 = Math.floor((v.y - look) / g.cell), by1 = Math.floor((v.y + look) / g.cell);
    let lim = vmax, bo = null;
    const test = (o, oLen, oHw, isCar, isNpc) => {
      const dx = o.x - v.x, dy = o.y - v.y, fwd = dx * hx + dy * hy;
      if (fwd <= 0 || fwd > look + oLen / 2) return;
      const lat = Math.abs(-dx * hy + dy * hx);
      if (lat > K.hw + oHw + (isCar ? 0.16 : 0.22)) return;
      if (isNpc && Math.cos(o.a - v.a) < 0.3) return;            // incroci e corsie opposte: si passa
      const gap = fwd - K.len / 2 - oLen / 2 - (isNpc ? 0.3 : 0.4);
      const vl = Math.sqrt(2 * NPC_DEC * Math.max(0, gap));
      if (vl < lim) { lim = vl; blocker = isNpc ? 'npc' : o === s.car ? 'hari' : 'ped'; bo = o; }
    };
    for (let by = Math.max(0, by0); by <= Math.min(g.bh - 1, by1); by++) for (let bx = Math.max(0, bx0); bx <= Math.min(g.bw - 1, bx1); bx++) {
      for (const o of g.buckets[by * g.bw + bx]) {
        if (o === v) continue;
        if (o.k != null && typeof o.k === 'string') { if (!v.ghost) test(o, NPCS[o.k].len, NPCS[o.k].hw, true, true); } else if (o.st >= 2) test(o, 0.3, PED_R, false, false);
      }
    }
    const P = VEH[s.veh];
    // mappe reali: chi è bloccato da Hari da un po' lo scansa piano piano sulla destra
    if (g.osm && v.sq > 0) { v.sq = Math.max(0, v.sq - dt); lim = Math.min(lim, 0.9); } else test(s.car, P.len, P.hw, true, false);
    if (lim < vmax) vmax = lim;
    v.why = blocker || '';
    v.v = v.v < vmax ? Math.min(vmax, v.v + 3.2 * dt) : vmax;
    if (v.v < 0.05) {
      v.wait += dt;
      // ingorgo tra auto che si aspettano a vicenda (mai se in fondo alla fila c'è Hari): una passa
      if (blocker === 'npc' && v.wait > 4 && bo.why === 'npc' && bo.wait > 4) { v.ghost = 1.4; v.wait = 0; }
      if (blocker === 'hari' && v.wait > 1.6 && !v.honk) { v.honk = 4; ev.push({ type: 'honk', id: v.id }); }
      if (blocker === 'hari' && v.wait > 2.5 && v.sg === 0 && Math.cos(s.car.a - v.a) < -0.3) { v.bk = 1.3; v.wait = 0; }
      if (g.osm && blocker === 'hari') { v.hw = (v.hw || 0) + dt; if (v.hw > 4.5) { v.sq = 3.5; v.hw = 0; } }
    } else { v.wait = 0; if (v.v > 0.5) v.hw = 0; }
    v.s += v.v * dt;
    // fine segmento: corsia → incrocio (svolta) → corsia
    let guard = 0;
    while (v.s >= v.len && guard++ < 3) {
      v.s -= v.len;
      if (g.osm) {
        if (v.sg === 0) { v.sg = 1; v.d2 = chooseTurnO(s, g, v.n1, v.d); } else { v.n0 = v.n1; v.d = v.d2; v.n1 = g.lend[v.d]; v.sg = 0; }
      } else if (v.sg === 0) { v.sg = 1; v.d2 = chooseTurn(s, g, v.n1, v.d); } else { v.n0 = v.n1; v.d = v.d2; v.n1 = g.nodes[v.n0].nb[v.d]; v.sg = 0; if (v.n1 < 0) { v.d = (v.d + 2) % 4; v.n1 = g.nodes[v.n0].nb[v.d]; } }
      v.len = segLen(g, v);
    }
    const [x, y, a] = segPos(g, v);
    v.x = nz(x); v.y = nz(y); v.a = nz(a); v.s = nz(v.s); v.v = nz(v.v);
    if (g.osm && (v.sq || v.sh)) {
      // spostamento laterale (verso destra) mentre scansa Hari, poi torna in corsia
      const shMax = v.sg === 0 ? clamp(g.edges[v.d >> 1].hw + ASPH - 0.75 - (g.edges[v.d >> 1].one ? -0.5 : 0), 0, 0.45) : 0.25;   // resta sull'asfalto
      const sh0 = v.sh || 0;
      v.sh = nz(v.sq > 0 && sh0 < shMax ? Math.min(shMax, sh0 + 0.8 * dt) : Math.max(0, sh0 - 0.5 * dt));
      v.x = nz(v.x - Math.sin(a) * v.sh); v.y = nz(v.y + Math.cos(a) * v.sh);
    }
  }

  /* ---------- pedoni ---------- */
  function pedTick(s, g, p) {
    const dt = TICK;
    if (p.scared > 0) p.scared = Math.max(0, p.scared - dt);
    if (g.osm && p.st === 0) pedTickO(s, g, p);
    else if (p.st === 0) {
      const b = g.blocks[p.b], r = rectOf(b), w = r.X1 - r.X0, h = r.Y1 - r.Y0;
      const segOf = (u) => { const P = 2 * (w + h); u = ((u % P) + P) % P; return u < w ? 0 : u < w + h ? 1 : u < 2 * w + h ? 2 : 3; };
      const s0 = segOf(p.u);
      const P = 2 * (w + h);
      p.u = ((p.u + p.dir * p.sp * dt) % P + P) % P;
      const s1 = segOf(p.u);
      if (s1 !== s0 && rand(s) < 0.45) {
        const k = p.dir > 0 ? s1 : s0;                      // angolo appena superato
        const opts = crossings(g, b, k);
        if (opts.length) {
          const o = opts[Math.floor(rand(s) * opts.length)];
          const cu = [0, w, w + h, 2 * w + h][k];
          p.u = cu;
          const [x, y] = perimPos(b, cu);
          p.x = x; p.y = y;
          p.st = 1; p.tt = 0;
          p.cr = { n: o.n, ph: o.ph, x0: x, y0: y, x1: o.x1, y1: o.y1, b0: b.id, b1: o.b1, q: 0 };
          return;
        }
      }
      const [x, y] = perimPos(b, p.u);
      p.x = nz(x); p.y = nz(y);
    } else if (p.st === 1) {
      // aspetta il verde (e che Hari non stia arrivando a tutta velocità)
      p.tt += dt;
      const L = light(s, p.cr.n), need = Math.hypot(p.cr.x1 - p.cr.x0, p.cr.y1 - p.cr.y0) / p.sp + 0.6;
      const c = s.car, mx = (p.cr.x0 + p.cr.x1) / 2, my = (p.cr.y0 + p.cr.y1) / 2;
      const busy = Math.hypot(c.x - mx, c.y - my) < 3 && Math.abs(c.v) > 1;
      if (L.ph === p.cr.ph && L.left >= need && !busy) { p.st = 2; p.tt = 0; }
      else if (p.tt > 14) { p.st = 0; p.cr = null; p.dir = -p.dir; }
    } else {
      // attraversa (st 2) o si scansa saltando verso il marciapiede più vicino (st 3)
      const cr = p.cr, L = Math.hypot(cr.x1 - cr.x0, cr.y1 - cr.y0) || 1;
      const sp = p.st === 3 ? 2.6 : p.sp * 1.1;
      cr.q = Math.min(1, cr.q + (sp * dt) / L);
      p.x = nz(cr.x0 + (cr.x1 - cr.x0) * cr.q); p.y = nz(cr.y0 + (cr.y1 - cr.y0) * cr.q);
      if (cr.q >= 1 && g.osm) {
        const b1 = cr.b1;
        p.e = b1.e; p.b = b1.e; p.sd = b1.sd; p.u = b1.u; p.dir = b1.dir; p.st = 0; p.cr = null;
      } else if (cr.q >= 1) {
        const b = g.blocks[cr.b1];
        p.b = cr.b1; p.u = r1(perimU(b, p.x, p.y)); p.st = 0; p.cr = null;
        p.dir = rand(s) < 0.5 ? -1 : 1;
      }
    }
  }
  function shoo(p, c) {
    // salto spaventato verso il marciapiede più vicino (avanti o indietro sulle strisce)
    const cr = p.cr;
    if (cr && cr.q < 0.5) {
      p.cr = { n: cr.n, ph: cr.ph, x0: p.x, y0: p.y, x1: cr.x0, y1: cr.y0, b0: cr.b1, b1: cr.b0, q: 0 };
    } else if (cr) p.cr = { n: cr.n, ph: cr.ph, x0: p.x, y0: p.y, x1: cr.x1, y1: cr.y1, b0: cr.b0, b1: cr.b1, q: 0 };
    p.st = 3; p.scared = 1.2;
    void c;
  }

  /* ---------- urti con traffico e pedoni ---------- */
  function contacts(s, g, ev) {
    const c = s.car, P = VEH[s.veh];
    circles(c.x, c.y, c.a, P.hw, P.len, CC);
    const bx0 = Math.floor((c.x - 2) / g.cell), bx1 = Math.floor((c.x + 2) / g.cell), by0 = Math.floor((c.y - 2) / g.cell), by1 = Math.floor((c.y + 2) / g.cell);
    for (let by = Math.max(0, by0); by <= Math.min(g.bh - 1, by1); by++) for (let bx = Math.max(0, bx0); bx <= Math.min(g.bw - 1, bx1); bx++) {
      for (const o of g.buckets[by * g.bw + bx]) {
        if (typeof o.k === 'string') {
          const K = NPCS[o.k];
          circles(o.x, o.y, o.a, K.hw, K.len, CO);
          let best = 0, nx = 0, ny = 0;
          for (let i = 0; i < CC.length; i += 3) for (let j = 0; j < CO.length; j += 3) {
            const dx = CC[i] - CO[j], dy = CC[i + 1] - CO[j + 1], d = Math.hypot(dx, dy), pen = CC[i + 2] + CO[j + 2] - d;
            if (pen > best) { best = pen; nx = d > 1e-6 ? dx / d : -Math.cos(c.a); ny = d > 1e-6 ? dy / d : -Math.sin(c.a); }
          }
          if (best <= 0) continue;
          c.x += nx * best; c.y += ny * best;
          const hx = Math.cos(c.a) * Math.sign(c.v || 1), hy = Math.sin(c.a) * Math.sign(c.v || 1);
          // incidente solo se è Hari ad andare addosso: velocità verso l'altro veicolo (gli sfioramenti sono "bonk")
          const speed = Math.abs(c.v) * Math.max(0, -(hx * nx + hy * ny));
          if (hx * nx + hy * ny < 0) c.v = -c.v * 0.3;
          if (s.inv <= 0 && speed >= P.crash) {
            o.bonk = 0.9;
            hurt(s, ev, { type: 'crash', what: 'car', id: o.id, kind: o.k, x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 });
          } else if (s.bonkT <= 0) { s.bonkT = 0.6; o.bonk = Math.max(o.bonk, 0.4); ev.push({ type: 'bonk', id: o.id, x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 }); }
          walls(s, ev);
        } else if (o.st === 0 && o.scared <= 0) {
          // mappe reali: un pedone sul marciapiede sfiorato fa solo un saltello (il marciapiede non è una strada)
          let hit = false;
          for (let i = 0; i < CC.length; i += 3) if (Math.hypot(CC[i] - o.x, CC[i + 1] - o.y) < CC[i + 2] + PED_R) hit = true;
          if (!hit) continue;
          o.scared = 1.2; c.v *= 0.5;
          ev.push({ type: 'shoo', id: o.id, x: o.x, y: o.y });
        } else if (o.st >= 2 && o.scared <= 0) {
          let hit = false;
          for (let i = 0; i < CC.length; i += 3) if (Math.hypot(CC[i] - o.x, CC[i + 1] - o.y) < CC[i + 2] + PED_R) hit = true;
          if (!hit) continue;
          const speed = Math.abs(c.v);
          shoo(o, c);
          c.v *= 0.4;
          if (s.inv <= 0 && speed >= PED_V) hurt(s, ev, { type: 'crash', what: 'ped', id: o.id, kind: PEDS[o.k], x: o.x, y: o.y });
          else ev.push({ type: 'shoo', id: o.id, x: o.x, y: o.y });
        }
      }
    }
  }
  function hurt(s, ev, e) {
    s.oops++; s.mistakes = s.oops;
    if (e.type === 'crash') s.crashes++;
    s.inv = INV;
    e.left = LIVES - s.oops;
    ev.push(e);
    if (isLost(s)) ev.push({ type: 'lose' });
  }

  /* ---------- un passo fisso ---------- */
  function tick(s) {
    const ev = [];
    if (isOver(s)) return ev;
    const g = geo(s), dt = TICK;
    s.ticks++;
    s.t = s.ticks / 60;
    if (s.inv > 0) s.inv = Math.max(0, s.inv - dt);
    if (s.bumpT > 0) s.bumpT = Math.max(0, s.bumpT - dt);
    if (s.bonkT > 0) s.bonkT = Math.max(0, s.bonkT - dt);
    drive(s, ev);
    if (g.osm && s.ticks % 20 === 0) bubble(s, g);
    bucketize(s, g);
    for (const v of s.npcs) npcTick(s, g, v, ev);
    for (const p of s.peds) pedTick(s, g, p);
    bucketize(s, g);
    contacts(s, g, ev);
    if (isLost(s)) return ev;
    // ritiri e consegne
    const c = s.car, tr = s.trip, slow = Math.abs(c.v) < STOP_V;
    if (tr) {
      if (tr.st === 'go') {
        const p = g.spots[tr.p];
        if (slow && Math.hypot(c.x - p.zx, c.y - p.zy) < ZONE_R) {
          tr.st = 'ride';
          tr.items.forEach((it) => { it.st = 1; });
          ev.push({ type: 'pickup', n: tr.items.length, x: p.x, y: p.y, spot: p.id });
        }
      } else {
        let late = null;
        for (const it of tr.items) {
          if (it.st !== 1) continue;
          it.t = nz(Math.max(0, it.t - dt));
          const q = g.spots[it.d];
          if (slow && Math.hypot(c.x - q.zx, c.y - q.zy) < ZONE_R) {
            it.st = 2; s.done++; s.moves = s.done;
            ev.push({ type: 'drop', item: it.id, who: it.who, x: q.x, y: q.y, spot: q.id, left: it.t, done: s.done });
            if (s.done >= s.N) { s.won = true; s.trip = null; ev.push({ type: 'win' }); return ev; }
          } else if (it.t <= 0 && !late) late = it;
        }
        if (late) {
          // tempo scaduto: le consegne ancora a bordo sono perse tutte insieme, ma costano un solo cuore
          const lost = tr.items.filter((it) => it.st === 1);
          lost.forEach((it) => { it.st = 3; });
          s.late++;
          hurt(s, ev, { type: 'expire', item: late.id, who: late.who, n: lost.length, x: c.x, y: c.y });
          if (isLost(s)) return ev;
        }
        if (tr.items.every((it) => it.st >= 2)) newTrip(s, ev);
      }
    }
    return ev;
  }

  /* ---------- tempo reale ---------- */
  function step(s, dt, input) {
    const ev = [];
    if (isOver(s) || !(dt > 0)) return ev;
    if (input !== undefined) s.inp = cleanInput(input);
    if (s.wait && active(s.inp)) s.wait = false;
    if (s.ready > 0) {
      s.ready -= dt;
      if (s.ready > 0) return ev;
      dt = -s.ready; s.ready = 0; ev.push({ type: 'go' });
    }
    if (s.wait) return ev;            // aspetta il primo tocco/freccia (modalità attivata dall'interfaccia)
    s.acc += Math.min(dt, 0.1);
    while (s.acc >= TICK - 1e-9) {
      s.acc -= TICK;
      ev.push(...tick(s));
      if (isOver(s)) break;
    }
    return ev;
  }

  const isWon = (s) => !!s.won;
  const isLost = (s) => s.oops >= LIVES;
  const isOver = (s) => isWon(s) || isLost(s);
  // stelle: 3 senza cuori persi, 2 con uno, 1 oltre
  const rate = (s) => (!s.oops ? 3 : s.oops === 1 ? 2 : 1);
  function progress(s) {
    if (s.won) return 1;
    const tr = s.trip, ride = tr && tr.st === 'ride' ? tr.items.filter((it) => it.st === 1).length : 0;
    return clamp((s.done + 0.4 * ride) / Math.max(1, s.N), 0, 1);
  }
  // tempo di riferimento del livello (secondi): consegne × (distanza media / velocità media + soste)
  function par(s) {
    const c = config(s.level, s.mapId), V = VEH[s.veh];
    return Math.round(s.N * (8 + (c.dmin + c.dmax) / (V.vmax * 0.5) / 2) / Math.max(1, Math.sqrt(s.batch)));
  }

  HH.drive = {
    TICK, LIVES, READY, ZONE_R, STOP_V, INV, PED_V, PED_R, GREEN, ALLRED, CYCLE, INSET,
    VEH, NPCS, TYPES, VEH_OF, PEDS, DISHES, DIRS,
    config, newLevel, buildCity, step, tick, start, geo, field, route, targets, light, perimPos, crossings,
    AR, HWC, ASPH, SIDE, isOsm, mapData, buildings, vectors, walkOf, along, turnOf, polyOf, offsetLine,
    isWon, isLost, isOver, rate, progress, par, wrap,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
