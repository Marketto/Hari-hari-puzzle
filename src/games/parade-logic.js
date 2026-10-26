/* Hari Parade — logica pura (nessun DOM), macchina a stati deterministica e serializzabile.
 *
 * Gioco tipo Snake su una griglia-prato: Hari guida una sfilata, ogni frutto mangiato fa unire in coda un riccetto.
 * Non si deve urtare la propria fila, i bordi del prato o gli ostacoli (vasi, sassi, funghi).
 * Si vince mangiando `goal` frutti. 3 cuori: uno scontro costa un cuore e la sfilata riparte dal "cancello"
 * a sinistra con la lunghezza conservata (i riccetti rientrano in fila uno alla volta) dopo una pausa "Pronti?".
 *
 * Il generatore pseudo-casuale vive nello stato (`rs`, mulberry32): lo stato è JSON puro, si salva e si riprende
 * e la partita resta riproducibile.
 *
 * API (modificano lo stato passato):
 *   config(level)                 parametri del livello (griglia, obiettivo, velocità, ostacoli)
 *   newLevel(level, rnd)          stato iniziale (rnd = HH.rng(seed) o Math.random; usato per prato e seme interno)
 *   turn(s, dir) → bool           accoda un cambio di direzione (max 2; rifiuta stessa direzione e inversione a 180°)
 *   step(s, dir?) → eventi        avanza la testa di una cella (dir opzionale = turn prima di muovere)
 *   advance(s, dt) → eventi       tempo reale: pausa "Pronti?", velocità (con rallenty), chiama step
 *   frac(s)                       0..1 frazione di cella percorsa (per l'interpolazione in UI)
 *   isWon · isLost · isOver · rate · progress · validLayout · reachable
 * Eventi: move · eat{kind,x,y,combo} · item{kind,x,y} · expire · spawn · crash{what,x,y,left} · respawn · win · lose
 * Direzioni: 0 su, 1 destra, 2 giù, 3 sinistra (accetta anche 'up' 'right' 'down' 'left').
 * Esporta HH.parade.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const NAMES = { up: 0, right: 1, down: 2, left: 3, u: 0, r: 1, d: 2, l: 3 };
  const FRUITS = ['strawberry', 'apple', 'blueberry', 'peach', 'cherry', 'orange'];
  const OBSTACLES = ['pot', 'rock', 'mushroom'];
  const LIVES = 3;
  const START_LEN = 3;          // Hari + 2 riccetti
  const READY = 1.6;            // secondi di "Pronti?"
  const QUEUE_MAX = 2;
  const ITEM_TTL = 34;          // passi prima che stellina/orologio spariscano
  const SLOW_STEPS = 22;        // durata del rallenty (in passi, ~6 s)
  const SLOW_MUL = 0.6;
  const STAR_BONUS = 2;         // la stellina vale 2 frutti (senza allungare la fila)

  function config(level) {
    const L = Math.max(1, level | 0);
    const cols = L <= 2 ? 9 : L <= 6 ? 10 : 11;
    return {
      cols, rows: cols + 1,
      goal: Math.min(30, 6 + 2 * L),
      speed: Math.min(7.5, 3.4 + 0.25 * (L - 1)),           // celle al secondo
      obstacles: L < 3 ? 0 : Math.min(14, L - 1),
      specials: L >= 2,
    };
  }

  /* ---------- rng nello stato (mulberry32, come HH.rng) ---------- */
  function rand(s) {
    s.rs = (s.rs + 0x6d2b79f5) >>> 0;
    let t = s.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];

  const key = (x, y) => y * 1000 + x;
  const inside = (s, x, y) => x >= 0 && y >= 0 && x < s.cols && y < s.rows;
  const startRow = (rows) => Math.floor(rows / 2);
  // corsia del cancello: sempre libera, qui la sfilata parte e riparte
  const laneLen = (cols) => Math.min(cols, 8);

  /* ---------- prato: ostacoli che lasciano la griglia connessa e senza vicoli ciechi ---------- */
  // ogni cella libera ha almeno 2 vicine libere (niente trappole a fondo chiuso) e tutte le libere sono connesse
  function validLayout(cols, rows, blocked) {
    let free = 0, first = -1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (blocked.has(key(x, y))) continue;
      free++;
      if (first < 0) first = key(x, y);
      let n = 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !blocked.has(key(nx, ny))) n++;
      }
      if (n < 2) return false;
    }
    if (!free) return false;
    const seen = new Set([first]), q = [first];
    while (q.length) {
      const k = q.pop(), x = k % 1000, y = (k - x) / 1000;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d], nk = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || blocked.has(nk) || seen.has(nk)) continue;
        seen.add(nk); q.push(nk);
      }
    }
    return seen.size === free;
  }

  function placeObstacles(cfg, rnd) {
    const { cols, rows } = cfg, sy = startRow(rows), lane = laneLen(cols);
    const reserved = new Set();
    for (let x = 0; x < lane; x++) reserved.add(key(x, sy));
    for (let x = 0; x < 4; x++) { reserved.add(key(x, sy - 1)); reserved.add(key(x, sy + 1)); }
    const blocked = new Set(), out = [];
    for (let tries = 0; out.length < cfg.obstacles && tries < 400; tries++) {
      // niente sul bordo esterno: il prato resta percorribile tutto intorno
      const x = 1 + Math.floor(rnd() * (cols - 2)), y = 1 + Math.floor(rnd() * (rows - 2)), k = key(x, y);
      if (reserved.has(k) || blocked.has(k)) continue;
      // niente ostacoli attaccati (anche in diagonale): restano isolati e leggibili
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (blocked.has(key(x + dx, y + dy))) { near = true; break; }
      if (near) continue;
      blocked.add(k);
      if (!validLayout(cols, rows, blocked)) { blocked.delete(k); continue; }
      out.push({ x, y, kind: OBSTACLES[Math.floor(rnd() * OBSTACLES.length)] });
    }
    return out;
  }

  function startBody(s) {
    const sy = startRow(s.rows);
    return Array.from({ length: START_LEN }, (_, i) => ({ x: START_LEN - i, y: sy }));
  }

  function newLevel(level, rnd = Math.random) {
    const cfg = config(level);
    const s = {
      v: 1, level: Math.max(1, level | 0), cols: cfg.cols, rows: cfg.rows, speed: cfg.speed, goal: cfg.goal, specials: cfg.specials,
      obstacles: placeObstacles(cfg, rnd),
      body: null, dir: 1, queue: [], grow: 0,
      fruit: null, item: null, slow: 0,
      eaten: 0, fruits: 0, stars: 0, clocks: 0, crashes: 0, combo: 0, bestCombo: 0, lastEat: -99,
      ready: READY, acc: 0, steps: 0, moves: 0, mistakes: 0, seq: 0,
      rs: Math.floor(rnd() * 4294967296) >>> 0,
    };
    s.body = startBody(s);
    spawnFruit(s);
    return s;
  }

  /* ---------- celle libere e raggiungibilità ---------- */
  function blockedSet(s, withTail = false) {
    const b = new Set(s.obstacles.map((o) => key(o.x, o.y)));
    const n = withTail ? s.body.length : s.body.length - 1;
    for (let i = 0; i < n; i++) b.add(key(s.body[i].x, s.body[i].y));
    return b;
  }
  // distanze BFS dalla testa (la coda conta come libera: si sposta)
  function reachable(s) {
    const b = blockedSet(s), h = s.body[0], dist = new Map([[key(h.x, h.y), 0]]), q = [h];
    for (let i = 0; i < q.length; i++) {
      const c = q[i], dc = dist.get(key(c.x, c.y));
      for (let d = 0; d < 4; d++) {
        const nx = c.x + DX[d], ny = c.y + DY[d], nk = key(nx, ny);
        if (!inside(s, nx, ny) || b.has(nk) || dist.has(nk)) continue;
        dist.set(nk, dc + 1); q.push({ x: nx, y: ny });
      }
    }
    return dist;
  }
  function freeCells(s) {
    const b = blockedSet(s, true);
    if (s.fruit) b.add(key(s.fruit.x, s.fruit.y));
    if (s.item) b.add(key(s.item.x, s.item.y));
    // non sulle celle dove riparte la sfilata
    const sy = startRow(s.rows);
    for (let x = 0; x <= START_LEN; x++) b.add(key(x, sy));
    const out = [];
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) if (!b.has(key(x, y))) out.push({ x, y });
    return out;
  }
  // una cella libera raggiungibile, preferibilmente non troppo vicina alla testa e non in una tasca chiusa dalla fila
  function spot(s) {
    const dist = reachable(s), cells = freeCells(s), b = blockedSet(s, true);
    const ok = cells.filter((c) => dist.has(key(c.x, c.y)) && dist.get(key(c.x, c.y)) > 0);
    const roomy = ok.filter((c) => {
      if (dist.get(key(c.x, c.y)) < 3) return false;
      let n = 0;
      for (let d = 0; d < 4; d++) { const nx = c.x + DX[d], ny = c.y + DY[d]; if (inside(s, nx, ny) && !b.has(key(nx, ny))) n++; }
      return n >= 2;
    });
    const pool = roomy.length ? roomy : ok.length ? ok : cells;
    return pool.length ? pool[Math.floor(rand(s) * pool.length)] : null;
  }
  function spawnFruit(s) {
    const c = spot(s);
    s.fruit = c ? { x: c.x, y: c.y, kind: pick(s, FRUITS), id: ++s.seq } : null;
    return s.fruit;
  }
  function spawnItem(s) {
    const c = spot(s);
    s.item = c ? { x: c.x, y: c.y, kind: rand(s) < 0.6 ? 'star' : 'clock', ttl: ITEM_TTL, id: ++s.seq } : null;
    return s.item;
  }

  /* ---------- input ---------- */
  const norm = (d) => (typeof d === 'string' ? NAMES[d.toLowerCase()] : d);
  function turn(s, dir) {
    const d = norm(dir);
    if (!(d >= 0 && d <= 3) || isOver(s)) return false;
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (d === last || d === (last + 2) % 4 || s.queue.length >= QUEUE_MAX) return false;
    s.queue.push(d);
    return true;
  }

  /* ---------- un passo ---------- */
  function step(s, dir) {
    const ev = [];
    if (isOver(s)) return ev;
    if (dir != null) turn(s, dir);
    if (s.queue.length) {
      const d = s.queue.shift();
      if (d !== (s.dir + 2) % 4 && d !== s.dir) { s.dir = d; s.moves++; }
    }
    const h = s.body[0], nx = h.x + DX[s.dir], ny = h.y + DY[s.dir];
    const eating = !!(s.fruit && s.fruit.x === nx && s.fruit.y === ny);
    let what = null;
    if (!inside(s, nx, ny)) what = 'wall';
    else if (s.obstacles.some((o) => o.x === nx && o.y === ny)) what = 'rock';
    else {
      const n = s.grow > 0 || eating ? s.body.length : s.body.length - 1;   // la coda si sposta, se non cresce
      for (let i = 0; i < n; i++) if (s.body[i].x === nx && s.body[i].y === ny) { what = 'self'; break; }
    }
    if (what) return crash(s, what, inside(s, nx, ny) ? nx : h.x, inside(s, nx, ny) ? ny : h.y);

    s.body.unshift({ x: nx, y: ny });
    if (eating) s.grow++;
    if (s.grow > 0) s.grow--; else s.body.pop();
    s.steps++;
    if (s.slow > 0) s.slow--;
    ev.push({ type: 'move' });

    if (eating) {
      const f = s.fruit;
      s.eaten++; s.fruits++;
      s.combo = s.steps - s.lastEat <= s.cols + s.rows ? s.combo + 1 : 1;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.lastEat = s.steps;
      ev.push({ type: 'eat', kind: f.kind, x: nx, y: ny, combo: s.combo });
      if (isWon(s)) { s.fruit = null; ev.push({ type: 'win' }); return ev; }
      spawnFruit(s);
      ev.push({ type: 'spawn', fruit: s.fruit });
      if (s.specials && !s.item && rand(s) < 0.2) { const it = spawnItem(s); if (it) ev.push({ type: 'spawn', item: it }); }
    }
    if (s.item) {
      if (s.item.x === nx && s.item.y === ny) {
        const it = s.item;
        s.item = null;
        if (it.kind === 'star') { s.eaten = Math.min(s.goal, s.eaten + STAR_BONUS); s.stars++; }
        else { s.slow = SLOW_STEPS; s.clocks++; }
        ev.push({ type: 'item', kind: it.kind, x: nx, y: ny });
        if (isWon(s)) { s.fruit = null; ev.push({ type: 'win' }); return ev; }
      } else if (--s.item.ttl <= 0) { ev.push({ type: 'expire', item: s.item }); s.item = null; }
    }
    return ev;
  }

  function crash(s, what, x, y) {
    s.crashes++;
    s.mistakes = s.crashes;
    s.combo = 0; s.slow = 0; s.queue = []; s.acc = 0;
    const ev = [{ type: 'crash', what, x, y, left: LIVES - s.crashes }];
    if (isLost(s)) { ev.push({ type: 'lose' }); return ev; }
    // si riparte dal cancello: stessa lunghezza, i riccetti rientrano in coda uno per passo
    const len = s.body.length + s.grow;
    s.body = startBody(s);
    s.grow = Math.max(0, len - START_LEN);
    s.dir = 1;
    s.ready = READY;
    const onStart = (c) => c && c.y === startRow(s.rows) && c.x <= START_LEN + 1;
    if (onStart(s.fruit)) spawnFruit(s);
    if (onStart(s.item)) s.item = null;
    ev.push({ type: 'respawn' });
    return ev;
  }

  /* ---------- tempo reale ---------- */
  const speedNow = (s) => s.speed * (s.slow > 0 ? SLOW_MUL : 1);
  function advance(s, dt) {
    const ev = [];
    if (isOver(s) || !(dt > 0)) return ev;
    if (s.ready > 0) {
      s.ready -= dt;
      if (s.ready > 0) return ev;
      dt = -s.ready; s.ready = 0; ev.push({ type: 'go' });
    }
    s.acc += Math.min(dt, 0.25);
    for (let guard = 0; guard < 4; guard++) {
      const iv = 1 / speedNow(s);
      if (s.acc < iv) break;
      s.acc -= iv;
      const e = step(s);
      ev.push(...e);
      if (isOver(s) || e.some((x) => x.type === 'crash')) break;
    }
    return ev;
  }
  const frac = (s) => (s.ready > 0 ? 0 : Math.max(0, Math.min(1, s.acc * speedNow(s))));

  const isWon = (s) => s.eaten >= s.goal;
  const isLost = (s) => s.crashes >= LIVES;
  const isOver = (s) => isWon(s) || isLost(s);
  // fragoline: 3 senza scontri, 2 con uno, 1 oltre
  const rate = (s) => (!s.crashes ? 3 : s.crashes === 1 ? 2 : 1);
  const progress = (s) => Math.max(0, Math.min(1, s.eaten / s.goal));

  HH.parade = {
    DX, DY, FRUITS, OBSTACLES, LIVES, START_LEN, READY, ITEM_TTL, SLOW_STEPS, SLOW_MUL, STAR_BONUS, QUEUE_MAX,
    config, newLevel, turn, step, advance, frac, speedNow, isWon, isLost, isOver, rate, progress,
    validLayout, reachable, startRow,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
