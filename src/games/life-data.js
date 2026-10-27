/* Hari Home — dati della simulazione (catalogo, luoghi, attività, traguardi). Solo dati, niente DOM: usati da
 * life-logic.js (Node e browser) e da life-ui.js / life-draw.js per disegnare.
 *
 * Unità: tempo in minuti di gioco (1 giorno = 1440), soldi in ghiande (intere), bisogni 0..1 (stress: 0 = sereno).
 * Bellezza "b" degli oggetti: punti grezzi sommati in HH.life.beauty (con rendimenti decrescenti per oggetti uguali).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  /* ---------- oggetti ----------
   * k = tipo (nome tradotto lf_k_<k>), t = gradino (stelline), p = prezzo (0 = solo iniziale, non in catalogo),
   * b = bellezza, w×d = ingombro in caselle con r = 0 (r = 1 scambia w e d), q = qualità della funzione,
   * cat = scheda del catalogo, wall = si appende al muro (w slot), flat = a pavimento calpestabile (tappeti),
   * light = fa luce di notte, cap = posti in frigo, seats = posti a sedere per gli ospiti */
  const ITEMS = {
    bed0: { k: 'bed', t: 0, p: 0, b: -1.2, w: 1, d: 2, q: 0.72, cat: 'rest' },
    bed1: { k: 'bed', t: 1, p: 120, b: 1, w: 1, d: 2, q: 0.88, cat: 'rest' },
    bed2: { k: 'bed', t: 2, p: 380, b: 3, w: 2, d: 2, q: 1, cat: 'rest' },
    bed3: { k: 'bed', t: 3, p: 950, b: 6, w: 2, d: 2, q: 1.15, cat: 'rest' },
    shower0: { k: 'shower', t: 0, p: 0, b: -0.6, w: 1, d: 1, q: 0.8, cat: 'rest' },
    shower1: { k: 'shower', t: 1, p: 220, b: 1.5, w: 1, d: 1, q: 1, cat: 'rest' },
    tub: { k: 'tub', t: 2, p: 650, b: 3, w: 2, d: 1, q: 1.1, cat: 'rest' },
    fridge0: { k: 'fridge', t: 0, p: 0, b: -0.6, w: 1, d: 1, cap: 4, cat: 'kitchen' },
    fridge1: { k: 'fridge', t: 1, p: 200, b: 1, w: 1, d: 1, cap: 8, cat: 'kitchen' },
    fridge2: { k: 'fridge', t: 2, p: 520, b: 2, w: 1, d: 1, cap: 14, cat: 'kitchen' },
    stove1: { k: 'stove', t: 1, p: 160, b: 0.5, w: 1, d: 1, q: 0.1, cat: 'kitchen' },
    stove2: { k: 'stove', t: 2, p: 480, b: 2, w: 2, d: 1, q: 0.2, cat: 'kitchen' },
    oven1: { k: 'oven', t: 1, p: 240, b: 0.8, w: 1, d: 1, q: 0.12, cat: 'kitchen' },
    oven2: { k: 'oven', t: 2, p: 720, b: 2.5, w: 1, d: 1, q: 0.22, cat: 'kitchen' },
    table0: { k: 'table', t: 0, p: 0, b: -0.5, w: 1, d: 1, seats: 1, cat: 'kitchen' },
    table1: { k: 'table', t: 1, p: 90, b: 1, w: 1, d: 1, seats: 2, cat: 'kitchen' },
    table2: { k: 'table', t: 2, p: 300, b: 3, w: 2, d: 1, seats: 4, cat: 'kitchen' },
    sofa1: { k: 'sofa', t: 1, p: 180, b: 2, w: 2, d: 1, q: 0.85, seats: 2, cat: 'living' },
    sofa2: { k: 'sofa', t: 2, p: 520, b: 4, w: 2, d: 1, q: 1.1, seats: 3, cat: 'living' },
    tv0: { k: 'tv', t: 0, p: 0, b: -0.3, w: 1, d: 1, q: 0.6, cat: 'living' },
    tv1: { k: 'tv', t: 1, p: 240, b: 1, w: 1, d: 1, q: 1, cat: 'living' },
    tv2: { k: 'tv', t: 2, p: 600, b: 2.5, w: 2, d: 1, q: 1.25, cat: 'living' },
    books: { k: 'books', t: 1, p: 160, b: 2, w: 1, d: 1, q: 1, cat: 'living' },
    aquarium: { k: 'aquarium', t: 2, p: 420, b: 4, w: 2, d: 1, q: 1, cat: 'living' },
    desk1: { k: 'desk', t: 1, p: 120, b: 0.5, w: 1, d: 1, q: 1, cat: 'work' },
    desk2: { k: 'desk', t: 2, p: 420, b: 2, w: 2, d: 1, q: 1.15, cat: 'work' },
    bench1: { k: 'bench', t: 1, p: 150, b: 1.5, w: 1, d: 1, q: 1, cat: 'work' },
    bench2: { k: 'bench', t: 2, p: 480, b: 3, w: 2, d: 1, q: 1.15, cat: 'work' },
    mat: { k: 'mat', t: 1, p: 60, b: 0.5, w: 1, d: 1, q: 0.8, cat: 'work' },
    bike: { k: 'bike', t: 2, p: 320, b: 0.5, w: 1, d: 1, q: 1, cat: 'work' },
    plant1: { k: 'plant', t: 1, p: 30, b: 1, w: 1, d: 1, cat: 'deco' },
    plant2: { k: 'plant', t: 2, p: 80, b: 2, w: 1, d: 1, cat: 'deco' },
    flowers: { k: 'flowers', t: 1, p: 45, b: 1.5, w: 1, d: 1, cat: 'deco' },
    lamp1: { k: 'lamp', t: 1, p: 50, b: 1, w: 1, d: 1, light: 1, cat: 'deco' },
    lamp2: { k: 'lamp', t: 2, p: 140, b: 2, w: 1, d: 1, light: 1.3, cat: 'deco' },
    rug1: { k: 'rug', t: 1, p: 70, b: 1.5, w: 2, d: 2, flat: 1, cat: 'deco' },
    rug2: { k: 'rug', t: 2, p: 200, b: 3, w: 2, d: 2, flat: 1, cat: 'deco' },
    poster: { k: 'poster', t: 1, p: 25, b: 1, w: 1, wall: 1, cat: 'deco' },
    art1: { k: 'art', t: 1, p: 90, b: 2, w: 1, wall: 1, cat: 'deco' },
    art2: { k: 'art', t: 2, p: 260, b: 4, w: 2, wall: 1, cat: 'deco' },
    clock: { k: 'clock', t: 1, p: 40, b: 1, w: 1, wall: 1, cat: 'deco' },
    shelf: { k: 'shelf', t: 1, p: 70, b: 1.5, w: 1, wall: 1, cat: 'deco' },
  };
  const CATS = ['fix', 'rest', 'kitchen', 'living', 'work', 'deco', 'style', 'house'];

  /* pavimenti e carte da parati: p = prezzo per una casa 6×6 (scala con la superficie), b = bellezza */
  const FLOORS = { worn: { p: 0, b: 0 }, wood: { p: 120, b: 1.5 }, tatami: { p: 160, b: 2 }, tiles: { p: 190, b: 2 }, parquet: { p: 320, b: 3.2 } };
  const WALLS = { peel: { p: 0, b: 0 }, paint: { p: 80, b: 1 }, stripes: { p: 140, b: 2 }, dots: { p: 200, b: 2.6 }, sakura: { p: 320, b: 3.6 } };

  /* case: c×r caselle (c lungo il muro destro, r lungo il muro sinistro), affitto settimanale, prezzo del trasloco.
   * La porta è sempre nell'ultima casella del muro sinistro; le finestre sono slot del muro destro (R) o sinistro (L). */
  const HOMES = [
    { c: 6, r: 6, rent: 50, p: 0, win: [['R', 2, 2]] },
    { c: 8, r: 6, rent: 90, p: 2500, win: [['R', 2, 2], ['R', 5, 2]] },
    { c: 8, r: 8, rent: 130, p: 7000, win: [['R', 2, 2], ['R', 5, 2], ['L', 2, 2]] },
    { c: 10, r: 8, rent: 0, p: 18000, win: [['R', 2, 2], ['R', 6, 2], ['L', 2, 2]] },
  ];

  /* guasti del monolocale decadente: p = costo della riparazione, m = minuti di lavoro.
   * at: ['L'|'R', slot] sul muro, ['F', x, y] sul pavimento, ['C'] soffitto, ['W'] la prima finestra */
  const DAMAGES = {
    crack: { p: 40, m: 60, at: ['L', 1] },
    peel: { p: 35, m: 50, at: ['R', 4] },
    mold: { p: 30, m: 40, at: ['L', 4] },
    web: { p: 0, m: 20, at: ['R', 0] },
    leak: { p: 60, m: 70, at: ['F', 3, 2] },
    floor: { p: 50, m: 60, at: ['F', 1, 4] },
    bulb: { p: 15, m: 20, at: ['C'] },
    window: { p: 45, m: 50, at: ['W'] },
  };

  /* cibo: n = sazietà, j = gioia (divertimento + umore), p = prezzo per porzione */
  const FOODS = [{ n: 0.42, j: 0, p: 6 }, { n: 0.55, j: 0.06, p: 14 }, { n: 0.68, j: 0.14, p: 28 }];

  /* attività. dur = minuti (sleep: fino a energia piena o al massimo dur), at: 'obj' | 'hari' | 'dmg' | luogo,
   * r = variazioni orarie dei bisogni sommate al consumo di base (moltiplicate per la qualità q dell'oggetto dove ha senso) */
  const TRAVEL = 40;
  const ACTS = {
    sleep: { dur: 660, at: 'obj', kinds: ['bed'], r: { energy: 0.185, food: 0.028, hygiene: 0.022, fun: 0.03, social: 0.012, stress: -0.035 } },
    nap: { dur: 600, at: 'hari', r: { energy: 0.16, food: 0.028, hygiene: 0.012, fun: 0.03, social: 0.012, stress: -0.01 } },
    eat: { dur: 30, at: 'obj', kinds: ['fridge'], r: {} },
    cook: { dur: 50, at: 'obj', kinds: ['stove', 'oven'], r: { fun: 0.08 } },
    shower: { dur: 20, at: 'obj', kinds: ['shower'], r: { hygiene: 2.7, stress: -0.1 } },
    bath: { dur: 45, at: 'obj', kinds: ['tub'], r: { hygiene: 1.25, stress: -0.22, fun: 0.1 } },
    relax: { dur: 60, at: 'obj', kinds: ['sofa'], r: { stress: -0.12, energy: 0.06, fun: 0.06 } },
    watch: { dur: 60, at: 'obj', kinds: ['tv'], r: { fun: 0.36, stress: -0.04 } },
    play: { dur: 60, at: 'obj', kinds: ['tv'], r: { fun: 0.48, stress: -0.02, energy: -0.02 } },
    read: { dur: 60, at: 'obj', kinds: ['books'], r: { fun: 0.26, stress: -0.1 } },
    fish: { dur: 40, at: 'obj', kinds: ['aquarium'], r: { fun: 0.2, stress: -0.16 } },
    workout: { dur: 60, at: 'obj', kinds: ['bike', 'mat'], r: { stress: -0.2, health: 0.03, energy: -0.08, hygiene: -0.14, food: -0.03 } },
    work: { dur: 180, at: 'obj', kinds: ['desk', 'oven', 'bench'], r: { energy: -0.035, fun: -0.03, hygiene: -0.01 } },
    call: { dur: 15, at: 'hari', r: { social: 0.6, fun: 0.1 } },
    invite: { dur: 120, at: 'hari', r: { social: 0.26, fun: 0.12, stress: -0.06 } },
    repair: { dur: 60, at: 'dmg', r: { energy: -0.03, hygiene: -0.04 } },
    shop: { dur: 30 + TRAVEL, at: 'market', r: {} },
    doctor: { dur: 50 + TRAVEL, at: 'doctor', p: 40, r: { stress: -0.02 } },
    jog: { dur: 60 + TRAVEL, at: 'park', r: { stress: -0.2, health: 0.035, energy: -0.07, hygiene: -0.12, social: 0.04, fun: 0.06 } },
    gym: { dur: 60 + TRAVEL, at: 'gym', p: 12, r: { stress: -0.26, health: 0.05, energy: -0.1, hygiene: -0.15 } },
    cafe: { dur: 60 + TRAVEL, at: 'cafe', p: 10, r: { social: 0.32, fun: 0.16, food: 0.12, stress: -0.05 } },
    office: { dur: 180 + TRAVEL, at: 'office', r: { energy: -0.035, fun: -0.02, social: 0.03 } },
    faint: { dur: 360, at: 'doctor', r: { energy: 0.06, stress: -0.02 } },
  };
  const PLACES = ['home', 'market', 'doctor', 'park', 'gym', 'cafe', 'shop', 'office'];

  /* attività: base = guadagno di un turno a livello n (prima di bravura/reputazione/umore), up = prezzo per arrivarci,
   * rent = affitto settimanale del locale, help = aiutanti massimi. Il banchetto (livello 1) lavora da casa. */
  const BIZ = {
    types: { bakery: 'oven', craft: 'desk', plants: 'bench' },
    base: [0, 90, 170, 270, 450],
    up: [0, 0, 2000, 8000, 25000],
    rent: [0, 0, 60, 140, 280],
    help: [0, 0, 1, 2, 3],
    salary: 60,
  };
  const FRIENDS = ['bunny', 'bear', 'chick', 'kitty', 'piggy'];

  /* traguardi: premio in ghiande */
  const GOALS = {
    fix1: 20, fixall: 60, friend1: 20, friends3: 50, biz1: 20, biz2: 100, biz3: 250, biz4: 500,
    cozy: 50, dream: 200, move: 100, house: 300, fit: 40, chef: 40,
  };

  HH.lifeData = {
    ITEMS, CATS, FLOORS, WALLS, HOMES, DAMAGES, FOODS, ACTS, PLACES, BIZ, FRIENDS, GOALS, TRAVEL,
    DAY: 1440, YEAR_DAYS: 8, START_AGE: 20, RETIRE_AGE: 65, GEN_AGE: 75, PHASES: [20, 35, 50, 65],
    START_MONEY: 300, MIN_PER_SEC: 4, SLEEP_FAST: 6, SAVE_V: 1,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
