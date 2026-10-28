/* Hari Memory — logica pura (niente DOM), testabile da Node.
 *
 * Memory classico: carte coperte a griglia, se ne girano due per volta (una "mossa" = due carte),
 * le coppie uguali restano scoperte. Soggetti del bosco: animali, semi, frutta secca, bacche, alberi, foglie, funghi.
 *
 * Varianti (dai livelli alti):
 *   similar  soggetti simili tra loro (tante foglie, tante noci…): più facile confonderli
 *   themed   "coppie a tema": l'animale va con il suo cibo o la sua casa (scoiattolo ↔ ghianda, ape ↔ fiore…)
 *   swap     dopo un errore una delle due carte sbagliate scivola al posto di una vicina coperta (si vede: chi
 *            guarda bene non perde l'informazione)
 *
 * Nessun limite di mosse (niente sconfitta, adatto ai bambini): stelle in base alle mosse rispetto alla
 * stima di un giocatore con memoria perfetta (vedi rate()).
 *
 * API su HH.memory:
 *   SUBJECTS, FAMILIES, THEMED, tierFor(level), generate(level, rnd), newGame(level, seed),
 *   flip(s, i) → { type: 'first' | 'match' | 'miss' | 'invalid', … }, settle(s) → { swap: [a, b] | null },
 *   pending(s), isSolved(s), progress(s), thresholds(s), rate(s), parTime(s), validate(o)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  /* ---------- soggetti ---------- */
  const FAMILIES = {
    animal: ['hari', 'squirrel', 'fox', 'owl', 'rabbit', 'deer', 'badger', 'raccoon', 'frog', 'snail', 'ladybug', 'bear', 'bee', 'mouse', 'bird', 'beaver', 'caterpillar', 'boar'],
    seed: ['sunseed', 'pumpseed'],
    nut: ['acorn', 'hazelnut', 'walnut', 'chestnut', 'pinecone'],
    berry: ['blueberry', 'blackberry', 'strawberry', 'currant'],
    tree: ['oak', 'fir', 'birch', 'bush'],
    leaf: ['maple', 'oakleaf', 'ginkgo', 'fern'],
    mush: ['amanita', 'porcini'],
    // solo nelle coppie a tema
    food: ['apple', 'carrot', 'flower', 'honey', 'grapes', 'lilypad', 'nest', 'moon', 'clover', 'log'],
  };
  const SUBJECTS = Object.values(FAMILIES).flat();
  const FAM_OF = {};
  Object.entries(FAMILIES).forEach(([f, l]) => l.forEach((id) => { FAM_OF[id] = f; }));
  // famiglie di soggetti simili tra loro (variante "similar")
  const SIM = ['nut', 'berry', 'leaf', 'tree'];
  // coppie a tema: animale ↔ il suo cibo (o la sua casa)
  const THEMED = [
    ['squirrel', 'acorn'], ['hari', 'apple'], ['rabbit', 'carrot'], ['bee', 'flower'], ['bear', 'honey'], ['fox', 'grapes'],
    ['frog', 'lilypad'], ['snail', 'strawberry'], ['mouse', 'sunseed'], ['bird', 'nest'], ['owl', 'moon'], ['deer', 'clover'],
    ['beaver', 'log'], ['raccoon', 'blueberry'], ['badger', 'porcini'], ['caterpillar', 'maple'], ['boar', 'chestnut'], ['ladybug', 'oakleaf'],
  ];

  /* ---------- curva di difficoltà ---------- */
  function tierFor(level) {
    const L = Math.max(1, level | 0);
    const T = [
      null,
      { cols: 3, rows: 4, mode: 'mixed' },
      { cols: 4, rows: 4, mode: 'mixed' },
      { cols: 4, rows: 5, mode: 'mixed' },
      { cols: 4, rows: 6, mode: 'similar', sim: 1 },
      { cols: 5, rows: 6, mode: 'similar', sim: 2 },
      { cols: 5, rows: 6, mode: 'themed', isNew: 'themed' },
      { cols: 5, rows: 6, mode: 'similar', sim: 2, swap: true, isNew: 'swap' },
    ];
    let t;
    if (L < T.length) t = Object.assign({ tier: L }, T[L]);
    else {
      // dal livello 8: 6×6 (18 coppie) a rotazione simili / a tema / che si spostano
      const k = (L - T.length) % 3;
      t = { tier: T.length, cols: 6, rows: 6, mode: k === 1 ? 'themed' : 'similar', sim: k === 0 ? 3 : k === 2 ? 2 : 0, swap: k === 2 };
    }
    t.swap = !!t.swap; t.sim = t.sim || 0; t.isNew = t.isNew || null;
    t.pairs = (t.cols * t.rows) / 2;
    // punteggio di difficoltà: coppie + varianti (non decresce fino al gradino 8, poi i tre giri restano ≥ gradino 7)
    t.diff = t.pairs + t.sim * 2 + (t.mode === 'themed' ? 6 : 0) + (t.swap ? 5 : 0);
    return t;
  }

  /* ---------- generazione ---------- */
  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // scelta dei soggetti (coppie identiche): nei livelli "mixed" al massimo uno per famiglia di oggetti,
  // così i soggetti si distinguono bene; nei "similar" k famiglie intere di soggetti simili
  function pickSubjects(t, rnd) {
    const n = t.pairs, out = [];
    if (t.mode === 'similar') {
      shuffle(SIM.slice(), rnd).slice(0, t.sim).forEach((f) => out.push(...FAMILIES[f]));
    }
    const items = shuffle(['seed', 'nut', 'berry', 'tree', 'leaf', 'mush'].filter((f) => !out.some((s) => FAM_OF[s] === f)), rnd)
      .map((f) => FAMILIES[f][Math.floor(rnd() * FAMILIES[f].length)]);
    const animals = shuffle(FAMILIES.animal.slice(), rnd);
    // metà animali, metà oggetti (quanto possibile); poi si completa con gli animali rimasti
    const wantItems = t.mode === 'similar' ? items.length : Math.min(items.length, Math.floor(n / 2));
    out.push(...items.slice(0, Math.max(0, Math.min(wantItems, n - out.length))));
    while (out.length < n) out.push(animals.shift());
    return shuffle(out.slice(0, n), rnd);
  }
  function generate(level, rnd = Math.random) {
    const t = tierFor(level);
    const deck = [], key = [];
    if (t.mode === 'themed') {
      shuffle(THEMED.slice(), rnd).slice(0, t.pairs).forEach(([a, b], k) => { deck.push(a, b); key.push(k, k); });
    } else {
      pickSubjects(t, rnd).forEach((sub, k) => { deck.push(sub, sub); key.push(k, k); });
    }
    const order = shuffle(deck.map((_, i) => i), rnd);
    return Object.assign({}, t, { deck: order.map((i) => deck[i]), key: order.map((i) => key[i]) });
  }

  // generatore locale con seme (mulberry32), per gli spostamenti della variante "swap"
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function newGame(level, seed) {
    const p = generate(level, rng(seed));
    const N = p.deck.length;
    return {
      v: 1, level, seed: seed >>> 0, tier: p.tier, cols: p.cols, rows: p.rows, pairs: p.pairs, mode: p.mode, sim: p.sim, swap: p.swap, isNew: p.isNew,
      deck: p.deck, key: p.key, found: new Array(N).fill(0), seen: new Array(N).fill(0), up: [], moves: 0, misses: 0, slips: 0,
    };
  }

  /* ---------- regole ---------- */
  const pending = (s) => s.up.length === 2;                 // due carte diverse ancora girate (da rimettere giù)
  function flip(s, i) {
    if (!(i >= 0 && i < s.deck.length) || s.found[i] || s.up.includes(i) || pending(s)) return { type: 'invalid' };
    s.up.push(i);
    if (s.up.length === 1) { s.seen[i] = 1; return { type: 'first', i }; }
    const [a, b] = s.up;
    s.moves++;
    if (s.key[a] === s.key[b]) {
      s.found[a] = s.found[b] = 1;
      s.seen[b] = 1;
      s.up = [];
      return { type: 'match', a, b, solved: isSolved(s) };
    }
    // errore "da distrazione": la compagna di una delle due carte era già stata vista
    const partnerSeen = (x) => s.deck.some((_, j) => j !== x && s.key[j] === s.key[x] && s.seen[j]);
    const slip = partnerSeen(a) || partnerSeen(b);
    s.seen[b] = 1;
    s.misses++;
    if (slip) s.slips++;
    return { type: 'miss', a, b, slip };
  }
  // rimette coperte le due carte sbagliate; nella variante swap una delle due scivola al posto di una vicina coperta
  function settle(s) {
    if (!pending(s)) return { swap: null };
    const [a, b] = s.up;
    s.up = [];
    if (!s.swap) return { swap: null };
    const r = rng((s.seed ^ Math.imul(s.moves + 1, 0x9e3779b1)) >>> 0);
    const from = r() < 0.5 ? a : b;
    const c = from % s.cols, row = (from / s.cols) | 0;
    const nb = [[0, -1], [0, 1], [-1, 0], [1, 0]]
      .map(([dc, dr]) => [c + dc, row + dr])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < s.cols && y < s.rows)
      .map(([x, y]) => y * s.cols + x)
      .filter((j) => !s.found[j]);
    if (!nb.length) return { swap: null };
    const to = nb[Math.floor(r() * nb.length)];
    for (const k of ['deck', 'key', 'seen']) { const t = s[k][from]; s[k][from] = s[k][to]; s[k][to] = t; }
    return { swap: [from, to] };
  }
  const isSolved = (s) => s.found.every(Boolean);
  const progress = (s) => s.found.reduce((n, x) => n + x, 0) / Math.max(1, s.found.length);

  /* ---------- stelle ----------
   * Un giocatore con memoria perfetta impiega in media ~1,6 mosse a coppia (stima con il bot dei test, vedi docs).
   * 3 stelle: entro 2 × coppie (+ margine per le varianti); 2 stelle: entro 3 × coppie; 1 stella oltre (mai sconfitta). */
  function thresholds(s) {
    const n = s.pairs, extra = (s.mode === 'themed' ? 2 : 0) + (s.swap ? 3 : 0) + (s.sim ? s.sim : 0);
    return { three: 2 * n + extra, two: 3 * n + 2 * extra };
  }
  function rate(s) {
    const t = thresholds(s);
    return s.moves <= t.three ? 3 : s.moves <= t.two ? 2 : 1;
  }
  const parTime = (s) => Math.round(s.pairs * 5 + (s.mode === 'themed' ? 15 : 0) + (s.swap ? 15 : 0));

  /* ---------- ripresa da salvataggio ---------- */
  function validate(o) {
    if (!o || o.v !== 1 || !Array.isArray(o.deck)) return false;
    const N = o.deck.length;
    if (!N || N % 2 || o.cols * o.rows !== N || o.pairs !== N / 2) return false;
    if (![o.key, o.found, o.seen].every((a) => Array.isArray(a) && a.length === N)) return false;
    if (!o.deck.every((x) => FAM_OF[x])) return false;
    const cnt = {};
    o.key.forEach((k) => { cnt[k] = (cnt[k] || 0) + 1; });
    if (Object.keys(cnt).length !== N / 2 || Object.values(cnt).some((c) => c !== 2)) return false;
    if (!Array.isArray(o.up) || o.up.length > 2 || o.up.some((i) => !(i >= 0 && i < N) || o.found[i])) return false;
    return Number.isFinite(o.moves) && Number.isFinite(o.seed);
  }

  HH.memory = { SUBJECTS, FAMILIES, FAM_OF, THEMED, SIM, tierFor, generate, newGame, flip, settle, pending, isSolved, progress, thresholds, rate, parTime, validate };
})(typeof globalThis !== 'undefined' ? globalThis : window);
