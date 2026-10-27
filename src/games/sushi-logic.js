/* Sushi Bar — logica pura (nessun DOM), macchina a stati deterministica.
 *
 * Gli ingredienti scorrono su un nastro trasportatore (kaiten): entrano da sinistra e, se nessuno li prende,
 * tornano in cucina a destra, così la scelta si rinnova sempre. I clienti (amici animali) si siedono al bancone
 * con un ordine e una barra di pazienza. Il giocatore prende gli ingredienti dal nastro e li mette sul tagliere,
 * poi tocca il cliente per servirgli il piatto. L'ordine degli ingredienti non conta.
 * Se un cliente perde la pazienza se ne va: costa un cuore (3 cuori). Si vince servendo tutti i clienti del livello.
 *
 * API (tutte pure tranne che modificano lo stato passato):
 *   newLevel(level, rnd)            stato iniziale
 *   step(s, dt, rnd)                avanza il tempo di dt secondi → eventi [{type:'arrive'|'lost'|'item', ...}]
 *   take(s, itemId)                 prende un ingrediente dal nastro → true/false
 *   trash(s)                        svuota il tagliere
 *   serve(s, seat)                  'ok' | 'wrong' | 'empty'
 *   matches(plate, recipe)          confronto come multinsieme
 *   config(level) · RECIPES · INGREDIENTS
 * Esporta HH.sushi.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const INGREDIENTS = ['rice', 'nori', 'salmon', 'tuna', 'shrimp', 'octopus', 'crab', 'seabass', 'cucumber', 'egg', 'avocado', 'sesame'];
  // ricette in ordine di sblocco: prima i nigiri (un pesce diverso ciascuno), poi maki e uramaki
  const RECIPES = [
    { id: 'onigiri', ing: ['rice', 'nori'] },
    { id: 'sake', ing: ['rice', 'salmon'] },
    { id: 'maguro', ing: ['rice', 'tuna'] },
    { id: 'ebi', ing: ['rice', 'shrimp'] },
    { id: 'tako', ing: ['rice', 'octopus'] },
    { id: 'kani', ing: ['rice', 'crab'] },
    { id: 'suzuki', ing: ['rice', 'seabass'] },
    { id: 'avomaki', ing: ['nori', 'rice', 'avocado'] },
    { id: 'tamago', ing: ['rice', 'egg', 'nori'] },
    { id: 'kappa', ing: ['nori', 'rice', 'cucumber'] },
    { id: 'goma', ing: ['nori', 'rice', 'salmon', 'sesame'] },
    { id: 'california', ing: ['nori', 'rice', 'crab', 'avocado'] },
    { id: 'temaki', ing: ['nori', 'rice', 'tuna', 'avocado'] },
    { id: 'dragon', ing: ['nori', 'rice', 'shrimp', 'sesame'] },
  ];
  const ANIMALS = ['bunny', 'cat', 'panda', 'frog', 'fox', 'bear', 'chick', 'penguin'];
  const PLATE_MAX = 4;
  const BELT_SLOTS = 4;          // posti sul nastro: un piattino ogni 1/4 di giro (~70 px su un telefono: spazio comodo per il dito)
  const LIVES = 3;

  function config(level) {
    const L = Math.max(1, level | 0);
    return {
      goal: Math.min(14, 4 + L),                            // clienti da servire
      seats: L <= 2 ? 2 : 3,                                // posti al bancone
      recipes: Math.min(RECIPES.length, L <= 4 ? 3 + L : 7 + Math.floor((L - 4) / 2)),   // liv. 1: 4 nigiri, poi un pesce nuovo a ogni livello fino al 4°, poi una ricetta ogni 2 livelli
      patience: Math.max(26, 54 - L * 2.2),                 // secondi (più tempo: i piattini sono più distanziati)
      speed: Math.min(0.3, 0.14 + L * 0.0075),             // giri di nastro al secondo: 4 posti per giro, un piattino ogni ~1,7 s
      gap: Math.max(2.5, 6 - L * 0.3),                      // secondi tra un cliente e l'altro
    };
  }

  function newLevel(level, rnd = Math.random) {
    const c = config(level);
    const s = {
      level, cfg: c, t: 0, seq: 1,
      seats: new Array(c.seats).fill(null),
      belt: [], plate: [],
      goal: c.goal, spawned: 0, served: 0, lost: 0, wrong: 0, trashes: 0, coins: 0,
      nextCustomer: 0.8, nextItem: 0,
    };
    // nastro già mezzo pieno all'inizio
    for (let k = 4; k >= 0; k--) spawnItem(s, rnd, k / BELT_SLOTS);
    return s;
  }

  const unlocked = (s) => RECIPES.slice(0, s.cfg.recipes);

  function count(arr) {
    const m = {};
    arr.forEach((x) => { m[x] = (m[x] || 0) + 1; });
    return m;
  }
  function matches(plate, recipe) {
    if (plate.length !== recipe.length) return false;
    const a = count(plate), b = count(recipe);
    return Object.keys(b).every((k) => a[k] === b[k]);
  }

  // ingredienti che servono ai clienti seduti, meno quelli già sul tagliere e sul nastro
  function needed(s) {
    const need = {};
    s.seats.forEach((c) => { if (c) c.recipe.ing.forEach((x) => { need[x] = (need[x] || 0) + 1; }); });
    s.plate.forEach((x) => { if (need[x]) need[x]--; });
    s.belt.forEach((it) => { if (need[it.ing]) need[it.ing]--; });
    return Object.keys(need).filter((k) => need[k] > 0);
  }

  function spawnItem(s, rnd, x = 0) {
    // il nuovo piattino entra solo se c'è spazio all'ingresso del nastro
    if (s.belt.some((it) => Math.abs(it.x - x) < 0.9 / BELT_SLOTS)) return null;
    const need = needed(s);
    const pool = [...new Set(unlocked(s).flatMap((r) => r.ing))];
    // 90% un ingrediente che serve davvero (se ce n'è), altrimenti uno qualsiasi delle ricette sbloccate
    const ing = need.length && rnd() < 0.9 ? need[Math.floor(rnd() * need.length)] : pool[Math.floor(rnd() * pool.length)];
    const it = { id: s.seq++, ing, x };
    s.belt.push(it);
    return it;
  }

  function seatCustomer(s, rnd) {
    const free = s.seats.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (!free.length || s.spawned >= s.goal) return null;
    const seat = free[Math.floor(rnd() * free.length)];
    const rs = unlocked(s);
    // preferisci un piatto diverso da quelli già ordinati
    const taken = new Set(s.seats.filter(Boolean).map((c) => c.recipe.id));
    const fresh = rs.filter((r) => !taken.has(r.id));
    const recipe = (fresh.length ? fresh : rs)[Math.floor(rnd() * (fresh.length || rs.length))];
    const used = new Set(s.seats.filter(Boolean).map((c) => c.animal));
    const animals = ANIMALS.filter((a) => !used.has(a));
    const c = {
      id: s.seq++, animal: animals[Math.floor(rnd() * animals.length)], recipe,
      patience: s.cfg.patience, max: s.cfg.patience,
    };
    s.seats[seat] = c;
    s.spawned++;
    return { seat, c };
  }

  function step(s, dt, rnd = Math.random) {
    const ev = [];
    if (isOver(s)) return ev;
    s.t += dt;
    s.belt.forEach((it) => { it.x += s.cfg.speed * dt; });
    for (let k = s.belt.length - 1; k >= 0; k--) {
      if (s.belt[k].x >= 1) { ev.push({ type: 'gone', item: s.belt[k] }); s.belt.splice(k, 1); }
    }
    if (s.t >= s.nextItem) {
      const it = spawnItem(s, rnd);
      if (it) ev.push({ type: 'item', item: it });
      s.nextItem = s.t + 0.9 / (s.cfg.speed * BELT_SLOTS);   // un piattino ogni slot
    }
    s.seats.forEach((c, i) => {
      if (!c) return;
      c.patience -= dt;
      if (c.patience <= 0) {
        s.seats[i] = null;
        s.lost++;
        ev.push({ type: 'lost', seat: i, c });
        s.nextCustomer = Math.max(s.nextCustomer, s.t + 1.5);
        // il cliente perso va comunque rimpiazzato: l'obiettivo resta "servire goal clienti"
        s.spawned--;
      }
    });
    if (s.t >= s.nextCustomer) {
      const r = seatCustomer(s, rnd);
      if (r) ev.push({ type: 'arrive', seat: r.seat, c: r.c });
      s.nextCustomer = s.t + s.cfg.gap * (0.75 + rnd() * 0.5);
    }
    return ev;
  }

  function take(s, itemId) {
    if (s.plate.length >= PLATE_MAX) return false;
    const k = s.belt.findIndex((it) => it.id === itemId);
    if (k < 0) return false;
    s.plate.push(s.belt[k].ing);
    s.belt.splice(k, 1);
    return true;
  }

  function trash(s) {
    if (!s.plate.length) return false;
    s.plate = [];
    s.trashes++;
    return true;
  }

  function serve(s, seat) {
    const c = s.seats[seat];
    if (!c) return 'empty';
    if (!matches(s.plate, c.recipe.ing)) {
      s.wrong++;
      c.patience = Math.max(1, c.patience - c.max * 0.15);   // un po' di pazienza in meno
      return 'wrong';
    }
    s.plate = [];
    s.seats[seat] = null;
    s.served++;
    s.coins += 10 + Math.round((c.patience / c.max) * 10);   // mancia se è stato veloce
    s.nextCustomer = Math.min(s.nextCustomer, s.t + 1.2);
    return 'ok';
  }

  const isWon = (s) => s.served >= s.goal;
  const isLost = (s) => s.lost >= LIVES;
  const isOver = (s) => isWon(s) || isLost(s);

  // fragoline: 3 senza clienti persi, piatti sbagliati o buttati; 2 con al massimo un cliente perso e 2 sbavature; 1 oltre
  function rate(s) {
    const slips = (s.wrong || 0) + (s.trashes || 0);
    if (!s.lost && !slips) return 3;
    return s.lost <= 1 && slips <= 2 ? 2 : 1;
  }

  HH.sushi = {
    INGREDIENTS, RECIPES, ANIMALS, PLATE_MAX, BELT_SLOTS, LIVES,
    config, newLevel, step, take, trash, serve, matches, needed, isWon, isLost, isOver, rate, unlocked,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
