/* Hari Spot — logica pura (niente DOM). Trova le differenze fra due illustrazioni generate da seme.
 *
 * Una scena è una lista di oggetti { id, t, x, y, s, f, r, c, c2, c3, v } in un riquadro 400×280:
 *   t tipo (TYPES) · (x, y) punto di appoggio in basso al centro · s scala · f specchiato (0/1) · r inclinazione in gradi
 *   c/c2/c3 colori (chiavi della tavolozza --sd-c-*) · v dettagli (finestre accese, icona dell'insegna, frutti, faccia…)
 * La scena B è una copia di A con esattamente N differenze, ognuna con una zona circolare { x, y, r } (hitbox):
 *   remove (oggetto che manca in B) · add (oggetto che c'è solo in B) · color · size · flip · move · tilt · detail
 * Ogni differenza è visibile (area cambiata sopra soglia, colori lontani nello spazio Lab, oggetto poco coperto)
 * e le zone non si toccano. Tutto deterministico dato rnd.
 *
 * HH.spot.generate(level, rnd) → puzzle · newGame(level, seed) · puzzleOf(s) · tap(s, pz, x, y) · hint(s, pz)
 * rate · parTime · progress · restore(json) · paramsFor(level) · bbox · partBox · drawOrder · hitTest
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const W = 400, H = 280;
  const RMIN = 30;        // raggio minimo della hitbox (≈ 46 px di diametro con la scena larga 312 px)
  const GAP = 4;          // spazio minimo fra due zone

  /* Tavolozza: chiave → colore CIELAB approssimato di --sd-c-<chiave> (tema chiaro, vedi spot.css).
   * Serve a scegliere colori "abbastanza diversi"; il test rilegge i veri colori dal CSS e ricontrolla la distanza. */
  const LAB = {
    red: [62, 63, 22], pink: [76, 41, -7], orange: [73, 31, 62], yellow: [86, 2, 74], lime: [85, -33, 54], green: [73, -47, 25],
    forest: [53, -38, 14], teal: [72, -34, -11], sky: [84, -9, -25], blue: [60, 18, -62], purple: [61, 45, -60], lilac: [86, 15, -21],
    cream: [95, 0, 18], peach: [85, 15, 24], mint: [92, -20, 6], white: [100, 0, 0], gray: [64, 7, -14], stone: [85, 5, -6],
    brown: [56, 17, 29], choc: [34, 15, 19],
  };
  const dE = (a, b) => { const p = LAB[a], q = LAB[b]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  const FACES = ['happy', 'sleep', 'wow'];
  const ICONS = ['cake', 'fish', 'flower', 'book', 'cup', 'star'];
  const FLOWERS = ['red', 'pink', 'yellow', 'purple', 'blue', 'white', 'orange'];

  /* Tipi di oggetti. w×h = riquadro a scala 1 (appoggio in basso al centro), L = strato di disegno.
   * col/col2/col3 = colori ammessi per c/c2/c3 · parts = riquadri locali [x0, y0, x1, y1] (y verso l'alto è negativo)
   * fx = nomi delle parti colorate da c/c2/c3 · ops = differenze possibili · det = tipo di dettaglio */
  const T = {
    // città
    house: { w: 72, h: 96, L: 2, col: ['cream', 'pink', 'sky', 'lilac', 'yellow', 'mint', 'peach'], col2: ['red', 'blue', 'purple', 'orange', 'choc', 'teal', 'pink'],
      col3: ['red', 'blue', 'green', 'choc', 'yellow', 'purple'], fx: ['body', 'roof', 'door'], det: 'win', nw: 2, ops: ['color', 'detail'],
      parts: { body: [-32, -64, 32, 0], roof: [-38, -96, 38, -62], door: [-8, -30, 8, 0], w0: [-28, -56, -10, -38], w1: [10, -56, 28, -38] } },
    flat: { w: 60, h: 124, L: 2, col: ['lilac', 'sky', 'cream', 'pink', 'peach', 'mint', 'stone'], fx: ['body'], det: 'win', nw: 6, ops: ['color', 'detail'],
      parts: { body: [-30, -124, 30, 0], w0: [-22, -110, -6, -92], w1: [6, -110, 22, -92], w2: [-22, -84, -6, -66], w3: [6, -84, 22, -66], w4: [-22, -58, -6, -40], w5: [6, -58, 22, -40] } },
    shop: { w: 84, h: 90, L: 2, col: ['cream', 'white', 'yellow', 'mint', 'peach'], col2: ['red', 'blue', 'green', 'pink', 'purple', 'orange', 'teal'],
      fx: ['body', 'awn'], det: 'icon', ops: ['color', 'detail', 'flip'],
      parts: { body: [-38, -62, 38, 0], awn: [-42, -66, 42, -50], sign: [-22, -90, 22, -66] } },
    stall: { w: 56, h: 58, L: 4, col: ['red', 'orange', 'yellow', 'green', 'purple'], col2: ['red', 'blue', 'green', 'pink', 'purple', 'teal'],
      fx: ['fruit', 'awn'], det: 'n', np: 'fruit', nmin: 1, nmax: 5, item: 10, ops: ['color', 'detail', 'remove'],
      parts: { awn: [-28, -58, 28, -44], fruit: [-27, -34, 27, -22] } },
    car: { w: 58, h: 32, L: 5, col: ['red', 'blue', 'yellow', 'green', 'purple', 'pink', 'orange', 'teal'], ops: ['color', 'flip', 'remove', 'size', 'move'] },
    tlight: { w: 14, h: 66, L: 4, det: 'on', ops: ['detail', 'remove'], parts: { box: [-8, -66, 8, -30] } },
    lamp: { w: 18, h: 74, L: 4, det: 'lit', ops: ['detail', 'remove', 'tilt', 'size'], parts: { head: [-10, -74, 10, -54] } },
    ctree: { w: 38, h: 60, L: 4, col: ['green', 'lime', 'pink', 'orange', 'yellow'], ops: ['color', 'remove', 'size'] },
    bench: { w: 46, h: 22, L: 4, col: ['choc', 'red', 'blue', 'green', 'teal'], ops: ['color', 'remove', 'size', 'move'] },
    cat: { w: 28, h: 24, L: 4, col: ['orange', 'gray', 'white', 'choc', 'cream'], det: 'face', ops: ['color', 'flip', 'remove', 'detail'], parts: { head: [0, -24, 16, -8] } },
    pot: { w: 16, h: 24, L: 4, col: FLOWERS, ops: ['color', 'remove', 'size', 'tilt', 'move', 'add'] },
    hydrant: { w: 14, h: 22, L: 4, col: ['red', 'yellow', 'blue'], ops: ['color', 'remove', 'size', 'move', 'add'] },
    balloon: { w: 18, h: 46, L: 1, col: ['red', 'pink', 'yellow', 'blue', 'purple', 'green'], ops: ['color', 'remove', 'size', 'move', 'add'] },
    bird: { w: 20, h: 14, L: 1, col: ['blue', 'yellow', 'red', 'pink', 'teal'], ops: ['color', 'flip', 'remove', 'move', 'add'] },
    cloud: { w: 68, h: 30, L: 1, ops: ['remove', 'size', 'move', 'add'] },
    sign: { w: 20, h: 50, L: 4, col: ['red', 'blue', 'yellow', 'green'], det: 'shape', ops: ['color', 'detail', 'remove', 'tilt'], parts: { plate: [-11, -50, 11, -28] } },
    hari: { w: 44, h: 40, L: 4, ops: [] },
    // foresta
    tree: { w: 80, h: 108, L: 2, col: ['green', 'lime', 'orange', 'yellow', 'pink'], det: 'n', nmin: 0, nmax: 5, item: 12, ops: ['color', 'detail', 'remove', 'size'],
      parts: { crown: [-40, -106, 40, -38] } },
    pine: { w: 46, h: 100, L: 2, col: ['forest', 'green', 'teal'], ops: ['color', 'remove', 'size'] },
    bush: { w: 48, h: 28, L: 4, col: ['green', 'lime', 'forest', 'teal'], det: 'n', nmin: 0, nmax: 4, item: 10, ops: ['color', 'detail', 'remove', 'size'],
      parts: { all: [-24, -28, 24, 0] } },
    mush: { w: 24, h: 26, L: 4, col: ['red', 'orange', 'purple', 'choc', 'pink', 'blue'], det: 'dots', ops: ['color', 'detail', 'remove', 'size', 'tilt', 'move', 'add'],
      parts: { cap: [-13, -26, 13, -10] } },
    flower: { w: 14, h: 26, L: 4, col: FLOWERS, ops: ['color', 'remove', 'size', 'tilt', 'move', 'add'] },
    rock: { w: 34, h: 20, L: 4, col: ['gray', 'stone', 'brown'], ops: ['color', 'remove', 'size', 'move', 'add'] },
    pond: { w: 124, h: 38, L: 3, ops: [] },
    duck: { w: 24, h: 20, L: 4, col: ['yellow', 'white'], ops: ['color', 'flip', 'remove'] },
    bunny: { w: 26, h: 32, L: 4, col: ['white', 'brown', 'gray', 'cream'], det: 'face', ops: ['color', 'flip', 'remove', 'detail', 'move'], parts: { head: [-4, -32, 14, -14] } },
    fox: { w: 36, h: 28, L: 4, col: ['orange', 'red', 'choc'], det: 'face', ops: ['color', 'flip', 'remove', 'detail', 'move'], parts: { head: [6, -28, 20, -12] } },
    butterfly: { w: 18, h: 16, L: 1, col: ['pink', 'yellow', 'blue', 'purple', 'orange'], ops: ['color', 'remove', 'size', 'move', 'add'] },
    log: { w: 48, h: 20, L: 4, ops: ['remove', 'size', 'move', 'add'] },
  };

  /* ---------- curva di difficoltà ---------- */
  const NDIFF = [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9];
  function paramsFor(level) {
    const L = Math.max(1, level | 0);
    const kinds = ['remove', 'add', 'color'];
    if (L >= 3) kinds.push('size');
    if (L >= 4) kinds.push('flip');
    if (L >= 5) kinds.push('detail');
    if (L >= 6) kinds.push('move');
    if (L >= 9) kinds.push('tilt');
    return {
      level: L,
      theme: L % 2 ? 'city' : 'forest',                      // si alternano: livello 1 in città
      n: L <= NDIFF.length ? NDIFF[L - 1] : 10,
      d: Math.min(1, (L - 1) / 14),                           // densità della scena 0..1
      minArea: Math.max(300, Math.round(1400 * Math.pow(0.85, L - 1))),  // area cambiata minima (unità²)
      minDE: L <= 3 ? 45 : L <= 7 ? 34 : 26,                  // distanza minima fra i colori (ΔE Lab)
      sizeK: L <= 4 ? 1.5 : L <= 9 ? 1.38 : 1.28,             // quanto cresce/rimpicciolisce
      moveD: L <= 8 ? 48 : 38,                                // spostamento
      subtle: L >= 8,                                         // preferisce i colori più vicini fra quelli ammessi
      kinds,
    };
  }

  /* ---------- geometria ---------- */
  const r1 = (v) => Math.round(v * 10) / 10;
  function partBox(o, part) {
    const t = T[o.t];
    const p = part && t.parts && t.parts[part] ? t.parts[part] : [-t.w / 2, -t.h, t.w / 2, 0];
    let [x0, y0, x1, y1] = p;
    if (o.f) [x0, x1] = [-x1, -x0];
    return [o.x + x0 * o.s, o.y + y0 * o.s, o.x + x1 * o.s, o.y + y1 * o.s];
  }
  const bbox = (o) => partBox(o, null);
  const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inside = (b) => inter(b, [0, 0, W, H]) / Math.max(1, area(b));
  // quanta parte del riquadro b è coperta dagli oggetti disegnati dopo o
  // ordine di disegno: strato, poi dal fondo verso chi guarda (y), poi id
  const after = (q, o) => T[q.t].L - T[o.t].L || q.y - o.y || q.id - o.id;
  const drawOrder = (objs) => objs.slice().sort(after);
  function covered(objs, o, b) {
    let c = 0;
    for (const q of objs) if (q !== o && after(q, o) > 0) c += inter(b, bbox(q));
    return c / Math.max(1, area(b));
  }
  function zoneOf(boxes, rmax = 64) {
    const x0 = Math.min(...boxes.map((b) => b[0])), y0 = Math.min(...boxes.map((b) => b[1]));
    const x1 = Math.max(...boxes.map((b) => b[2])), y1 = Math.max(...boxes.map((b) => b[3]));
    const r = Math.max(RMIN, Math.min(rmax, Math.hypot(x1 - x0, y1 - y0) * 0.42 + 4));
    return { x: r1(Math.min(W - 6, Math.max(6, (x0 + x1) / 2))), y: r1(Math.min(H - 6, Math.max(6, (y0 + y1) / 2))), r: r1(r) };
  }
  const zonesApart = (z, zs) => zs.every((q) => Math.hypot(z.x - q.x, z.y - q.y) >= z.r + q.r + GAP);
  function hitTest(pz, x, y) {
    for (let i = 0; i < pz.diffs.length; i++) { const z = pz.diffs[i].zone; if (Math.hypot(x - z.x, y - z.y) <= z.r) return i; }
    return -1;
  }

  /* ---------- costruzione delle scene ---------- */
  const rr = (rnd, a, b) => a + rnd() * (b - a);
  const ri = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
  function wpick(rnd, table) {           // { chiave: peso }
    const ks = Object.keys(table), tot = ks.reduce((a, k) => a + table[k], 0);
    let x = rnd() * tot;
    for (const k of ks) { x -= table[k]; if (x < 0) return k; }
    return ks[ks.length - 1];
  }
  function shuffle(rnd, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function mk(sc, t, x, y, s, extra) {
    const o = Object.assign({ id: sc.next++, t, x: r1(x), y: r1(y), s: Math.round(s * 100) / 100, f: 0, r: 0 }, extra || {});
    return o;
  }
  // prova a mettere un oggetto in una regione libera (riquadro che non tocca quelli in `avoid`)
  function place(sc, rnd, t, xr, yr, sr, extra, avoid, tol = 0) {
    for (let k = 0; k < 40; k++) {
      const o = mk({ next: sc.next }, t, rr(rnd, xr[0], xr[1]), rr(rnd, yr[0], yr[1]), rr(rnd, sr[0], sr[1]), typeof extra === 'function' ? extra() : extra);
      const b = bbox(o);
      if (inside(b) < 0.98) continue;
      if ((avoid || sc.objs).some((q) => inter(b, bbox(q)) > tol * Math.min(area(b), area(bbox(q))))) continue;
      sc.next++;
      sc.objs.push(o);
      return o;
    }
    return null;
  }
  const FRONT = (sc) => sc.objs.filter((o) => T[o.t].L >= 3);

  function city(P, rnd) {
    const sc = { theme: 'city', objs: [], next: 1 };
    const night = P.time === 'night', dusk = P.time === 'dusk';
    const lit = () => (night ? 0.75 : dusk ? 0.45 : 0.15);
    // case, palazzi e negozi lungo il marciapiede (in fila, da sinistra)
    const big = P.d < 0.4;
    const seq = shuffle(rnd, ['house', 'shop', 'flat', 'house']);
    let x = rr(rnd, -14, 4);
    for (let i = 0; x < W - 24; i++) {
      const t = i < seq.length ? seq[i] : wpick(rnd, { house: 3, flat: 2, shop: 2 });
      const s = big ? rr(rnd, 1.06, 1.2) : rr(rnd, 0.9, 1.06);
      const w = T[t].w * s;
      const o = mk(sc, t, x + w / 2, 200, s, { c: pick(rnd, T[t].col) });
      if (t === 'house') { o.c2 = pick(rnd, T.house.col2); o.c3 = pick(rnd, T.house.col3); o.v = { w: [0, 1].map(() => (rnd() < lit() ? 1 : 0)) }; }
      if (t === 'flat') o.v = { w: [0, 1, 2, 3, 4, 5].map(() => (rnd() < lit() ? 1 : 0)) };
      if (t === 'shop') { o.c2 = pick(rnd, T.shop.col2); o.v = { icon: ri(rnd, 0, ICONS.length - 1) }; o.f = rnd() < 0.5 ? 1 : 0; }
      sc.objs.push(o);
      x += w + rr(rnd, 3, big ? 16 : 10);
    }
    const houses = sc.objs.slice();
    // Hari sul marciapiede
    place(sc, rnd, 'hari', [40, 360], [214, 222], [1, 1.1], null, FRONT(sc));
    // arredo urbano
    const np = 3 + Math.round(P.d * 4);
    let stalls = 0;
    for (let k = 0; k < np; k++) {
      const t = wpick(rnd, stalls ? { lamp: 3, ctree: 3, tlight: 1, bench: 2, pot: 2, hydrant: 1, sign: 1 } : { lamp: 3, ctree: 3, tlight: 1, bench: 2, pot: 2, hydrant: 1, stall: 2, sign: 1 });
      const ex = () => ({
        c: T[t].col ? pick(rnd, t === 'ctree' ? P.leaves : T[t].col) : undefined,
        c2: t === 'stall' ? pick(rnd, T.stall.col2) : undefined,
        v: t === 'stall' ? { n: ri(rnd, 2, 4) } : t === 'tlight' ? { on: ri(rnd, 0, 2) } : t === 'lamp' ? { lit: night || dusk ? 1 : rnd() < 0.3 ? 1 : 0 } : t === 'sign' ? { shape: ri(rnd, 0, 2) } : undefined,
      });
      const s = t === 'pot' || t === 'hydrant' ? [1.1, 1.3] : [0.95, 1.12];
      const o = place(sc, rnd, t, [16, W - 16], [206, 222], s, ex, FRONT(sc));
      if (o && t === 'stall') stalls++;
    }
    // gatti sui tetti piatti (palazzi) o accanto all'insegna dei negozi
    const roofs = houses.filter((o) => o.t === 'flat' || o.t === 'shop');
    const ncat = Math.min(roofs.length, 1 + (P.d > 0.3 ? 1 : 0));
    shuffle(rnd, roofs).slice(0, ncat).forEach((b) => {
      const top = b.t === 'flat' ? b.y - 124 * b.s : b.y - 62 * b.s;
      const dx = b.t === 'flat' ? rr(rnd, -12, 12) * b.s : (rnd() < 0.5 ? -1 : 1) * 31 * b.s;
      sc.objs.push(mk(sc, 'cat', b.x + dx, top, 1.05, { c: pick(rnd, T.cat.col), f: rnd() < 0.5 ? 1 : 0, v: { face: ri(rnd, 0, 1) } }));
    });
    // auto sulla strada (due corsie)
    const nc = 1 + (P.d > 0.35 ? 1 : 0) + (P.d > 0.75 ? 1 : 0);
    for (let k = 0; k < nc; k++) place(sc, rnd, 'car', [40, 360], [k % 2 ? 250 : 272, k % 2 ? 252 : 274], [1.05, 1.2], () => ({ c: pick(rnd, T.car.col), f: rnd() < 0.5 ? 1 : 0 }), sc.objs.filter((o) => o.t === 'car'));
    // cielo
    const nCloud = 2 + Math.round(P.d * 1.5), nBird = 1 + Math.round(P.d * 2);
    for (let k = 0; k < nCloud; k++) place(sc, rnd, 'cloud', [40, 360], [34, 78], [0.85, 1.15], null);
    for (let k = 0; k < nBird; k++) place(sc, rnd, 'bird', [20, 380], [24, 110], [1.1, 1.3], () => ({ c: pick(rnd, T.bird.col), f: rnd() < 0.5 ? 1 : 0 }));
    if (rnd() < 0.3 + P.d * 0.5) place(sc, rnd, 'balloon', [30, 370], [70, 130], [1.1, 1.25], () => ({ c: pick(rnd, T.balloon.col) }));
    return sc;
  }

  function forest(P, rnd) {
    const sc = { theme: 'forest', objs: [], next: 1 };
    // fila di alberi sul fondo
    const big = P.d < 0.4;
    let x = rr(rnd, -10, 10);
    while (x < W + 10) {
      const t = rnd() < 0.62 ? 'tree' : 'pine';
      const s = big ? rr(rnd, 0.95, 1.1) : rr(rnd, 0.78, 0.98);
      const o = mk(sc, t, x, rr(rnd, 150, 168), s, { c: t === 'tree' ? pick(rnd, P.leaves) : pick(rnd, ['forest', 'forest', 'green']) });
      if (t === 'tree') o.v = { n: rnd() < 0.5 ? ri(rnd, 2, 4) : 0 };
      sc.objs.push(o);
      x += T[t].w * s * rr(rnd, 0.95, 1.25);
    }
    // laghetto con (forse) un'anatra
    const pond = mk(sc, 'pond', rr(rnd, 110, 290), rr(rnd, 214, 226), rr(rnd, 0.95, 1.1));
    sc.objs.push(pond);
    if (rnd() < 0.75) sc.objs.push(mk(sc, 'duck', pond.x + (rnd() < 0.5 ? -1 : 1) * rr(rnd, 16, 30), pond.y - 9 * pond.s, 1.15, { c: pick(rnd, T.duck.col), f: rnd() < 0.5 ? 1 : 0 }));
    const ground = () => FRONT(sc);
    place(sc, rnd, 'hari', [36, 364], [236, 276], [1.05, 1.15], null, ground());
    // primo piano: funghi, fiori, sassi, cespugli, animaletti
    const np = 6 + Math.round(P.d * 7);
    const once = {};
    for (let k = 0; k < np; k++) {
      const tab = { mush: 3, flower: 4, rock: 2, bush: 2 };
      if (!once.bunny) tab.bunny = 1.4;
      if (!once.fox) tab.fox = 1;
      if (!once.log) tab.log = 1;
      const t = wpick(rnd, tab);
      const ex = () => ({
        c: T[t].col ? pick(rnd, T[t].col) : undefined,
        f: t === 'bunny' || t === 'fox' ? (rnd() < 0.5 ? 1 : 0) : 0,
        v: t === 'bush' ? { n: ri(rnd, 0, 3) } : t === 'mush' ? { dots: ri(rnd, 0, 1) } : t === 'bunny' || t === 'fox' ? { face: ri(rnd, 0, 1) } : undefined,
      });
      const s = t === 'flower' || t === 'mush' ? [1.1, 1.35] : t === 'bunny' || t === 'fox' ? [1.05, 1.2] : [0.95, 1.12];
      const o = place(sc, rnd, t, [14, W - 14], [186, 276], s, ex, ground());
      if (o) once[t] = 1;
    }
    // cielo e farfalle
    const nCloud = 1 + Math.round(P.d * 1.5), nBird = 1 + Math.round(P.d);
    for (let k = 0; k < nCloud; k++) place(sc, rnd, 'cloud', [40, 360], [30, 60], [0.85, 1.1], null);
    for (let k = 0; k < nBird; k++) place(sc, rnd, 'bird', [20, 380], [20, 70], [1.1, 1.3], () => ({ c: pick(rnd, T.bird.col), f: rnd() < 0.5 ? 1 : 0 }));
    for (let k = 0; k < 1 + Math.round(P.d); k++) place(sc, rnd, 'butterfly', [20, 380], [130, 200], [1.1, 1.3], () => ({ c: pick(rnd, T.butterfly.col) }));
    return sc;
  }

  const LEAVES = { spring: ['pink', 'green', 'lime'], summer: ['green', 'green', 'lime'], autumn: ['orange', 'yellow', 'orange'], winter: ['green', 'lime'] };

  /* ---------- differenze ---------- */
  const clone = (objs) => objs.map((o) => JSON.parse(JSON.stringify(o)));
  const ADDABLE = { city: { cloud: [[40, 360], [30, 80], [0.9, 1.1]], bird: [[20, 380], [24, 110], [1.15, 1.3]], balloon: [[30, 370], [70, 130], [1.1, 1.25]], pot: [[16, 384], [206, 222], [1.15, 1.3]], hydrant: [[16, 384], [206, 222], [1.15, 1.3]] },
    forest: { cloud: [[40, 360], [30, 60], [0.9, 1.1]], bird: [[20, 380], [20, 70], [1.15, 1.3]], butterfly: [[20, 380], [130, 200], [1.15, 1.3]], mush: [[14, 386], [186, 276], [1.15, 1.35]], flower: [[14, 386], [186, 276], [1.15, 1.35]], rock: [[14, 386], [190, 276], [1, 1.12]], log: [[20, 380], [196, 276], [0.95, 1.1]] } };

  // sceglie un colore diverso abbastanza (più vicino possibile ai livelli alti, il più lontano possibile ai primi)
  function otherColor(rnd, P, list, cur) {
    const ok = list.filter((k) => k !== cur && dE(k, cur) >= P.minDE).sort((a, b) => dE(a, cur) - dE(b, cur));
    if (!ok.length) return null;
    const pool = P.subtle ? ok.slice(0, 2) : ok.slice(Math.floor(ok.length / 2));
    return pick(rnd, pool);
  }

  // prova a creare una differenza di tipo `kind` sull'oggetto o (in A); muta B e ritorna { kind, id, zone, area } o null
  function tryDiff(kind, o, A, B, P, rnd, zones, theme) {
    const t = T[o.t];
    const ob = B.find((q) => q.id === o.id);
    const box = bbox(o);
    const vis = (b) => inside(b) >= 0.85 && covered(A, o, b) <= 0.22 && covered(B, ob, b) <= 0.22;
    const fin = (boxes, ar, extra, rmax) => {
      if (ar < P.minArea) return null;
      const zone = zoneOf(boxes, rmax);
      if (!zonesApart(zone, zones)) return null;
      return Object.assign({ kind, id: o.id, zone, area: Math.round(ar) }, extra);
    };
    if (kind === 'remove') {
      if (!vis(box)) return null;
      const d = fin([box], area(box));
      if (d) B.splice(B.indexOf(ob), 1);
      return d;
    }
    if (kind === 'color') {
      const fields = ['c', 'c2', 'c3'].filter((f, i) => o[f] && t[i ? 'col' + (i + 1) : 'col']);
      if (!fields.length) return null;
      const f = pick(rnd, fields), i = ['c', 'c2', 'c3'].indexOf(f);
      const part = t.fx ? t.fx[i] : null;
      const pb = partBox(o, part);
      if (!vis(pb)) return null;
      const nc = otherColor(rnd, P, t[i ? 'col' + (i + 1) : 'col'], o[f]);
      if (!nc) return null;
      const d = fin([pb], area(pb), { field: f });
      if (d) ob[f] = nc;
      return d;
    }
    if (kind === 'size') {
      if (!vis(box)) return null;
      const k = rnd() < 0.5 ? P.sizeK : 1 / P.sizeK;
      const n = Object.assign({}, ob, { s: Math.round(o.s * k * 100) / 100 });
      const nb = bbox(n);
      if (inside(nb) < 0.95) return null;
      const d = fin([box, nb], Math.min(area(box), area(nb)) * (P.sizeK - 1) * 2);
      if (d) ob.s = n.s;
      return d;
    }
    if (kind === 'flip') {
      if (!vis(box)) return null;
      const d = fin([box], area(box) * 0.6);
      if (d) ob.f = o.f ? 0 : 1;
      return d;
    }
    if (kind === 'tilt') {
      if (!vis(box)) return null;
      const d = fin([box], area(box) * 0.5);
      if (d) ob.r = (rnd() < 0.5 ? -1 : 1) * ri(rnd, 24, 32);
      return d;
    }
    if (kind === 'move') {
      if (!vis(box)) return null;
      const dx = (rnd() < 0.5 ? -1 : 1) * P.moveD * rr(rnd, 1, 1.15);
      const n = Object.assign({}, ob, { x: r1(o.x + dx) });
      const nb = bbox(n);
      if (inside(nb) < 0.98) return null;
      const others = B.filter((q) => q.id !== o.id && (q.t !== 'pond' || o.t === 'duck'));
      if (o.t === 'duck') { const p = B.find((q) => q.t === 'pond'); if (!p || inter(nb, bbox(p)) < area(nb) * 0.5) return null; }
      if (others.some((q) => q.t !== 'pond' && inter(nb, bbox(q)) > 0)) return null;
      const d = fin([box, nb], area(box), null, 84);
      if (d) ob.x = n.x;
      return d;
    }
    if (kind === 'detail') {
      const det = t.det;
      if (det === 'win') {
        const idx = shuffle(rnd, Array.from({ length: t.nw }, (_, i) => i));
        for (const i of idx) {
          const pb = partBox(o, 'w' + i);
          if (!vis(pb)) continue;
          const d = fin([pb], area(pb) * 1.6, { part: 'w' + i });
          if (d) { ob.v.w[i] = ob.v.w[i] ? 0 : 1; return d; }
        }
        return null;
      }
      const part = { icon: 'sign', n: t.np || Object.keys(t.parts || {})[0], on: 'box', lit: 'head', face: 'head', dots: 'cap', shape: 'plate' }[det];
      const pb = partBox(o, part);
      if (!vis(pb)) return null;
      let ar = area(pb), apply;
      if (det === 'icon') { const nv = (o.v.icon + ri(rnd, 1, ICONS.length - 1)) % ICONS.length; ar *= 1.3; apply = () => { ob.v.icon = nv; }; }
      else if (det === 'n') {
        const step = P.subtle ? ri(rnd, 2, 3) : 3;
        const up = o.v.n + step <= t.nmax, down = o.v.n - step >= t.nmin;
        if (!up && !down) return null;
        const nv = up && (!down || rnd() < 0.5) ? o.v.n + step : o.v.n - step;
        ar = step * t.item * t.item * 1.3 * o.s * o.s;
        apply = () => { ob.v.n = nv; };
      } else if (det === 'on') { const nv = (o.v.on + ri(rnd, 1, 2)) % 3; ar *= 1.4; apply = () => { ob.v.on = nv; }; }
      else if (det === 'lit') { ar *= 1.4; apply = () => { ob.v.lit = o.v.lit ? 0 : 1; }; }
      else if (det === 'face') { const nv = (o.v.face + ri(rnd, 1, 2)) % 3; ar *= 0.9; apply = () => { ob.v.face = nv; }; }
      else if (det === 'dots') { ar *= 0.8; apply = () => { ob.v.dots = o.v.dots ? 0 : 1; }; }
      else if (det === 'shape') { const nv = (o.v.shape + ri(rnd, 1, 2)) % 3; ar *= 1.2; apply = () => { ob.v.shape = nv; }; }
      else return null;
      const d = fin([pb], ar, { part });
      if (d) apply();
      return d;
    }
    return null;
  }

  // oggetto nuovo che c'è solo in B, in uno spazio libero
  function tryAdd(sc, A, B, P, rnd, zones, nextId, okType) {
    const tab = ADDABLE[sc.theme];
    const types = Object.keys(tab).filter(okType);
    if (!types.length) return null;
    const t = pick(rnd, types), [xr, yr, sr] = tab[t];
    for (let k = 0; k < 20; k++) {
      const o = { id: nextId, t, x: r1(rr(rnd, xr[0], xr[1])), y: r1(rr(rnd, yr[0], yr[1])), s: Math.round(rr(rnd, sr[0], sr[1]) * 100) / 100, f: rnd() < 0.5 ? 1 : 0, r: 0 };
      if (T[t].col) o.c = pick(rnd, t === 'pot' || t === 'flower' ? FLOWERS : T[t].col);
      if (t === 'mush') o.v = { dots: ri(rnd, 0, 1) };
      const b = bbox(o);
      if (inside(b) < 0.98 || area(b) < P.minArea) continue;
      if (B.some((q) => inter(b, bbox(q)) > 0) || A.some((q) => inter(b, bbox(q)) > 0)) continue;
      const zone = zoneOf([b]);
      if (!zonesApart(zone, zones)) continue;
      B.push(o);
      return { kind: 'add', id: o.id, zone, area: Math.round(area(b)) };
    }
    return null;
  }

  function makeDiffs(sc, P, rnd) {
    const A = sc.objs, B = clone(A);
    const diffs = [], zones = [], used = new Set();
    const cap = Math.ceil(P.n / 2);          // non più di metà differenze dello stesso tipo
    const count = {}, perType = {};
    const typeCap = P.n <= 6 ? 1 : 2;       // varietà: lo stesso tipo di oggetto al massimo 1 volta (2 dalle 7 differenze)
    let nextId = sc.next;
    for (let tries = 0; diffs.length < P.n && tries < P.n * 30; tries++) {
      const kinds = P.kinds.filter((k) => (count[k] || 0) < cap);
      const kind = pick(rnd, kinds);
      let d = null;
      if (kind === 'add') d = tryAdd(sc, A, B, P, rnd, zones, nextId, (t) => (perType[t] || 0) < typeCap);
      else {
        const cand = A.filter((o) => !used.has(o.id) && T[o.t].ops.includes(kind) && (perType[o.t] || 0) < typeCap);
        if (!cand.length) continue;
        d = tryDiff(kind, pick(rnd, cand), A, B, P, rnd, zones, sc.theme);
      }
      if (!d) continue;
      const ty = (B.find((q) => q.id === d.id) || A.find((q) => q.id === d.id)).t;
      perType[ty] = (perType[ty] || 0) + 1;
      if (d.kind === 'add') nextId++;
      used.add(d.id);
      zones.push(d.zone);
      count[kind] = (count[kind] || 0) + 1;
      diffs.push(d);
    }
    return diffs.length === P.n ? { A, B, diffs } : null;
  }

  function generate(level, rnd) {
    const P = paramsFor(level);
    for (let tries = 0; tries < 40; tries++) {
      P.season = P.level === 1 ? 'spring' : pick(rnd, ['spring', 'summer', 'autumn', 'winter']);
      P.time = P.level <= 2 ? 'day' : wpick(rnd, { day: 2, dusk: 1, night: 1 });
      P.leaves = LEAVES[P.season];
      const sc = (P.theme === 'city' ? city : forest)(P, rnd);
      const res = makeDiffs(sc, P, rnd);
      if (!res) continue;
      // cielo: sole o luna e stelline (identici nelle due scene)
      const deco = { sun: { x: r1(rr(rnd, 40, 360)), y: r1(rr(rnd, 26, 40)) }, stars: [] };
      if (P.time === 'night') for (let k = 0; k < 14; k++) deco.stars.push([r1(rr(rnd, 6, 394)), r1(rr(rnd, 6, P.theme === 'city' ? 120 : 110)), Math.round(rr(rnd, 1, 2.4) * 10) / 10]);
      return { level: P.level, theme: P.theme, season: P.season, time: P.time, n: P.n, a: res.A, b: res.B, diffs: res.diffs, deco };
    }
    throw new Error('spot: generazione fallita');
  }

  /* ---------- partita ---------- */
  const hintsFor = (n) => (n <= 4 ? 1 : n <= 7 ? 2 : 3);
  const FREE_MISS_LEVEL = 3;              // fino al livello 3 i tocchi sbagliati non costano nulla
  function newGame(level, seed) {
    const pz = generate(level, HH.rng(seed));
    return { v: 1, level: pz.level, seed: seed >>> 0, n: pz.n, found: [], hints: 0, hinted: [], misses: 0, moves: 0 };
  }
  const puzzleOf = (s) => generate(s.level, HH.rng(s.seed));
  // tocco in (x, y) nelle coordinate della scena (vale uguale su A e su B)
  function tap(s, pz, x, y) {
    s.moves++;
    const i = hitTest(pz, x, y);
    if (i < 0) { s.misses++; return { hit: -1 }; }
    if (s.found.includes(i)) return { hit: i, again: true };
    s.found.push(i);
    return { hit: i, solved: s.found.length >= pz.diffs.length };
  }
  // lente: indica una differenza non ancora trovata (prima quelle mai indicate)
  function hint(s, pz) {
    if (s.hints >= hintsFor(s.n)) return -1;
    const left = pz.diffs.map((_, i) => i).filter((i) => !s.found.includes(i));
    if (!left.length) return -1;
    const i = left.find((k) => !s.hinted.includes(k)) ?? left[0];
    s.hints++;
    if (!s.hinted.includes(i)) s.hinted.push(i);
    return i;
  }
  const penalty = (s) => s.hints + (s.level > FREE_MISS_LEVEL ? Math.floor(s.misses / 3) : 0);
  const rate = (s) => Math.max(1, 3 - penalty(s));
  // tempo di riferimento: 20 s + 12 s a differenza; dal livello 4 ogni tocco sbagliato toglie 4 s al bonus
  const parTime = (s) => Math.max(10, 20 + (s.n || 3) * 12 - (s.level > FREE_MISS_LEVEL ? s.misses * 4 : 0));
  const progress = (s) => (s && s.n ? Math.min(1, s.found.length / s.n) : 0);
  function restore(j) {
    if (!j || j.v !== 1 || !(j.level >= 1) || typeof j.seed !== 'number') return null;
    const s = { v: 1, level: j.level | 0, seed: j.seed >>> 0, n: 0, found: [], hints: j.hints | 0, hinted: [], misses: j.misses | 0, moves: j.moves | 0 };
    const pz = puzzleOf(s);
    s.n = pz.n;
    const ok = (i) => Number.isInteger(i) && i >= 0 && i < pz.n;
    s.found = [...new Set((j.found || []).filter(ok))];
    s.hinted = [...new Set((j.hinted || []).filter(ok))];
    return s;
  }

  HH.spot = {
    W, H, RMIN, GAP, TYPES: T, LAB, FACES, ICONS, paramsFor, generate, partBox, bbox, area, inter, drawOrder, covered, hitTest,
    hintsFor, newGame, puzzleOf, tap, hint, rate, parTime, progress, restore, FREE_MISS_LEVEL,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
