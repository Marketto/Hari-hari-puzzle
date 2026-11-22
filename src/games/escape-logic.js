/* Hari Escape — logica pura (niente DOM), testabile da Node.
 *
 * Hari è chiuso in una casetta / un castello / una nave / un laboratorio kawaii e deve uscire. Ogni livello ha 1–3 stanze
 * (porte da aprire una dopo l'altra) e 3–10 enigmi generati dal seme. Gli enigmi sono "serrature" su un contenitore
 * (cassaforte, baule, scrivania, armadietto, scatola, xilofono, bilancia, pannello, tombino, porta): risolti si aprono e
 * danno il pezzo che serve dopo (un oggetto, un biglietto con un indizio, la porta per la stanza successiva, l'uscita).
 *
 * Generazione (all'indietro dalla porta): in ogni stanza la porta è la radice di un albero di enigmi; ogni enigma ha degli
 * "ingressi" (un indizio da leggere o un oggetto da usare); un ingresso è soddisfatto da un altro enigma (che contiene il
 * biglietto o l'oggetto) oppure da una fonte libera: un indizio appeso al muro, un oggetto nascosto sotto il tappeto, nel
 * vaso, dietro un quadro, sotto il cuscino della poltrona. Dai livelli alti alcune fonti stanno in una stanza precedente
 * (si torna indietro) e una stanza può essere buia (serve la torcia: torcia + pila da combinare). Il grafo è aciclico per
 * costruzione (ogni fonte è in una stanza ≤ di chi la usa e viene creata "prima" nell'ordine di soluzione); un simulatore
 * del grafo controlla che tutto sia raggiungibile, altrimenti si rigenera.
 *
 * Tipi di enigma (sbloccati coi livelli, UNLOCK):
 *   paint   lucchetto a cifre: rotelle colorate, quadro con le cifre nei cerchi dello stesso colore
 *   count   lucchetto a cifre: conta le formine di ogni colore sul poster
 *   books   lucchetto a cifre: libri colorati con una cifra sul dorso
 *   clock   lucchetto a cifre: orologi colorati, l'ora indicata dalla lancetta corta
 *   cipher  lucchetto a cifre: messaggio di simboli + tabella simbolo → cifra
 *   colors  lucchetto a colori: tasti nell'ordine dei palloncini del quadro
 *   simon   xilofono: suona le note dello spartito
 *   levers  leve: su/giù come nel disegno
 *   lights  lampadine (lights-out piccolo): ogni tasto cambia sé e i vicini, accendile tutte
 *   slide   puzzle a scorrimento: ricomponi il disegno
 *   balance bilancia: metti i pesi giusti per pareggiare (dai livelli alti un peso è da trovare)
 *   pipes   tubi da ruotare per portare l'acqua al fiore
 *   maze    labirinto con la pallina fino al buco
 *   mirror  specchi da girare perché la luce colpisca il cristallo
 *   shadow  ombre: tocca i giocattoli nell'ordine delle ombre sul muro
 *   key     serratura: chiave dello stesso colore (spesso nascosta)
 *   fish    tombino: canna = filo + calamita (da combinare) per ripescare ciò che c'è sul fondo
 *   dark    stanza buia: torcia accesa = torcia + pila (da combinare)
 *
 * API su HH.escape: TYPES, UNLOCK, GEMS, GLYPHS, TOYS, config(level), diffOf(level), generate(level, rnd, avoid),
 *   newGame(level, seed, avoid), levelOf(s), typesOf(s), reach(s), lit(s, room), visible(s, objId), go(s, r), search(s, obj),
 *   take(s, item), use(s, item, target), combine(s, a, b), act(s, pid, op, ...args), next(s), hint(s), guide(s, pid),
 *   tick(s, sec), isWon(s), progress(s), rate(s), parTime(s), validate(o), solvers: { slide, lights, maze }
 *
 * I sotto-puzzle e la creazione degli enigmi sono in escape-puzzles.js (caricato prima, montato in fondo con il
 * contesto EK). Per Node: caricare escape-puzzles.js, poi questo file.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  /* ---------- costanti ---------- */
  // 6 "gemme": colore + forma (riconoscibili anche senza distinguere i colori)
  const GEMS = ['heart', 'star', 'leaf', 'drop', 'moon', 'flower'];
  const GLYPHS = ['sun', 'moon', 'drop', 'leaf', 'bolt', 'spiral', 'fish', 'cloud'];
  const TOYS = ['duck', 'teddy', 'rocket', 'boat', 'cup', 'apple', 'fish', 'mushroom'];
  const PICS = ['sun', 'cake', 'boat', 'flower'];
  const THEMES = ['house', 'castle', 'ship', 'lab'];
  const TYPES = ['paint', 'key', 'colors', 'slide', 'count', 'levers', 'books', 'balance', 'maze', 'simon', 'lights', 'clock', 'fish', 'pipes', 'mirror', 'shadow', 'cipher', 'dark'];
  const UNLOCK = {
    paint: 1, key: 1, colors: 1, slide: 2, count: 2, levers: 3, books: 3, balance: 3, maze: 4, simon: 4,
    lights: 5, clock: 5, fish: 5, pipes: 6, mirror: 6, shadow: 8, cipher: 7, dark: 7,
  };
  // famiglie: in una stanza al massimo un enigma per famiglia (niente due lucchetti a rotelle colorate insieme)
  const FAMILY = { paint: 'dig', count: 'dig', books: 'dig', clock: 'dig', colors: 'seq', simon: 'seq' };
  const DIGITS = new Set(['paint', 'count', 'books', 'clock', 'cipher']);
  const DOOR_OK = new Set(['paint', 'count', 'books', 'clock', 'cipher', 'colors', 'key', 'levers', 'lights']);
  // dove sta il contenitore: F = sul pavimento (mobili), W = appeso al muro (pannelli)
  const SLOTK = {
    paint: 'F', count: 'F', books: 'F', clock: 'F', cipher: 'F', colors: 'F', key: 'F', slide: 'F', simon: 'F', balance: 'F', maze: 'F', fish: 'F',
    levers: 'W', lights: 'W', pipes: 'W', mirror: 'W', shadow: 'W',
  };
  const FURN = { paint: ['safe', 'chest'], count: ['chest', 'safe'], books: ['desk', 'safe'], clock: ['chest', 'desk'], cipher: ['safe', 'desk'], colors: ['chest', 'cabinet'], key: ['cabinet', 'desk', 'chest'] };
  // indizio di ogni tipo (oggetto sul muro o biglietto)
  const CLUE_OF = { paint: 'paint', count: 'count', books: 'books', clock: 'clock', colors: 'balloons', simon: 'sheet', levers: 'levers', cipher: 'msg' };
  // secondi di riferimento per enigma (parTime)
  const PAR = { paint: 25, count: 35, books: 25, clock: 35, cipher: 45, colors: 25, simon: 30, levers: 20, lights: 35, slide: 45, balance: 30, pipes: 45, maze: 30, mirror: 40, shadow: 25, key: 15, fish: 25, dark: 20 };
  const SLOTS = { W: ['W0', 'W1', 'W2', 'W3'], F: ['F0', 'F1', 'F2'], S: ['S0', 'S1'] };

  /* ---------- casuale ---------- */
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
  const ri = (rnd, n) => Math.floor(rnd() * n);
  const pick = (rnd, a) => a[ri(rnd, a.length)];
  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = ri(rnd, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function wpick(rnd, items, w) {
    let tot = 0;
    w.forEach((x) => { tot += x; });
    let r = rnd() * tot;
    for (let i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  }

  /* ---------- curva di difficoltà ---------- */
  function config(level) {
    const L = Math.max(1, level | 0);
    const T = [null, [1, 3], [1, 3], [2, 4], [2, 5], [2, 6], [3, 6], [3, 7], [3, 8], [3, 8], [3, 9]];
    const [rooms, n] = L < T.length ? T[L] : [3, 10];
    return {
      level: L, rooms, n,
      code: L < 6 ? 3 : 4,                                     // cifre dei lucchetti
      seq: 3 + (L >= 4) + (L >= 9),                            // lunghezza delle sequenze (colori, note)
      buttons: 4 + (L >= 5) + (L >= 10),                       // tasti colorati / barre dello xilofono
      repeats: L >= 6,                                         // la stessa gemma può tornare nella sequenza
      ordered: L <= 1,                                         // livello 1: indizi già nell'ordine delle rotelle
      countMax: L < 5 ? 4 : 6,
      levers: 3 + (L >= 6) + (L >= 11),
      lights: L < 6 ? { w: 3, h: 2, k: 2 } : L < 10 ? { w: 3, h: 3, k: 3 } : { w: 3, h: 3, k: 4 },
      slide: L < 4 ? { w: 3, h: 2, d: 8 } : { w: 3, h: 3, d: Math.min(36, 10 + 3 * (L - 4)) },
      maze: Math.min(7, 4 + Math.floor((L - 3) / 3)),
      pipes: L < 9 ? { w: 3, h: 3 } : L < 13 ? { w: 4, h: 3 } : { w: 4, h: 4 },
      mirror: L < 9 ? { n: 4, turns: 2, decoys: 1 } : L < 13 ? { n: 5, turns: 3, decoys: 2 } : { n: 5, turns: 4, decoys: 2 },
      balance: { k: 3 + (L >= 6) + (L >= 11), pick: 2 + (L >= 9), missing: L >= 8 },
      shadow: { k: 2 + (L >= 10), toys: 4 + (L >= 9) + (L >= 13), flip: L >= 12 },
      glyphs: L < 10 ? 6 : 8,
      dark: L >= 7 && rooms >= 2,
      cross: L >= 8 ? 0.35 : 0,                                // probabilità che una fonte stia in una stanza precedente
    };
  }
  // punteggio di difficoltà (monotono): enigmi, stanze, dimensioni dei sotto-puzzle
  function diffOf(level) {
    const c = config(level);
    return c.n * 10 + c.rooms * 6 + c.code * 2 + c.seq * 2 + c.buttons + c.levers + c.lights.w * c.lights.h + c.lights.k + c.slide.w * c.slide.h + c.slide.d / 3 +
      c.maze * 2 + c.pipes.w * c.pipes.h + c.mirror.n + c.mirror.turns * 2 + c.balance.k + c.balance.pick * 2 + (c.balance.missing ? 3 : 0) +
      c.shadow.k * 2 + c.shadow.toys + (c.shadow.flip ? 3 : 0) + c.glyphs + (c.dark ? 6 : 0) + c.cross * 10 + (c.repeats ? 2 : 0) + c.countMax - (c.ordered ? 2 : 0);
  }

  /* ---------- generazione del livello ---------- */
  function split(m, R) {
    const base = Math.floor(m / R), out = new Array(R).fill(base);
    for (let i = 0; i < m - base * R; i++) out[R - 1 - i]++;
    return out;
  }
  function generate(level, rnd = Math.random, avoid = []) {
    const c = config(level);
    for (let attempt = 0; attempt < 40; attempt++) {
      const L = build(c, rnd, avoid);
      if (L) return L;
    }
    // ripiego (non dovrebbe servire): livello 1 con la stessa casualità
    for (let attempt = 0; attempt < 200; attempt++) { const L = build(config(1), rnd, []); if (L) return Object.assign(L, { level: c.level }); }
    throw new Error('escape: generazione fallita');
  }

  function build(c, rnd, avoid) {
    const pool = TYPES.filter((t) => UNLOCK[t] <= c.level && t !== 'dark');
    const avoidSet = new Set(avoid || []);
    const used = {};
    const L = {
      level: c.level, theme: THEMES[(c.level - 1) % THEMES.length], rooms: [], o: {}, p: {}, items: {}, recipes: [], order: [], doors: [], exit: null, n: 0,
    };
    let nid = 0, oid = 0, iid = 0;
    const keyGems = shuffle(range(GEMS.length), rnd);
    const darkRoom = c.dark && rnd() < 0.75 ? 1 + ri(rnd, c.rooms - 1) : -1;
    const quotas = split(c.n - (darkRoom >= 0 ? 1 : 0), c.rooms);
    for (let r = 0; r < c.rooms; r++) L.rooms.push({ dark: r === darkRoom, free: { W: SLOTS.W.slice(), F: SLOTS.F.slice(), S: SLOTS.S.slice(), R: ['R'] } });

    const newItem = (kind, extra) => { const id = 'i' + iid++; L.items[id] = Object.assign({ id, kind }, extra); return id; };
    // peso di scelta di un tipo
    function weightOf(t, room, roomFams) {
      if (FAMILY[t] && roomFams.has(FAMILY[t])) return 0;
      let w = 1;
      if (used[t]) w *= 0.02;
      if (avoidSet.has(t)) w *= 0.25;
      if (UNLOCK[t] === c.level) w *= 10;                      // il tipo appena sbloccato si vede subito
      else if (UNLOCK[t] === c.level - 1) w *= 2;
      return w;
    }
    function chooseType(cands, room, roomFams) {
      const w = cands.map((t) => weightOf(t, room, roomFams));
      if (!w.some((x) => x > 0)) return null;
      return wpick(rnd, cands, w);
    }
    function addPuzzle(type, room, isRoot) {
      const id = 'p' + nid++;
      const env = { missing: type === 'balance' && c.balance.missing && rnd() < 0.7 };
      if (type === 'key') env.keyGem = keyGems.pop();
      const pz = Object.assign({ id, type, room, needs: [], clues: [], gives: null, root: !!isRoot }, makePuzzle(type, c, rnd, env));
      if (type === 'key') pz.needs.push(newItem('key', { g: pz.g }));
      if (type === 'balance' && pz.missing >= 0) pz.needs.push(newItem('weight', { w: pz.weights[pz.missing] }));
      if (type === 'fish') {
        const a = newItem('string'), b = newItem('magnet'), rod = newItem('rod', { from: [a, b] });
        L.recipes.push({ a, b, out: rod });
        pz.needs.push(rod); pz.parts = [a, b];
      }
      used[type] = (used[type] || 0) + 1;
      L.p[id] = pz;
      return pz;
    }
    // elenco degli ingressi "aperti" (da soddisfare) di un enigma
    function openInputs(pz) {
      const out = [];
      inputsOf(pz.type, pz).forEach((inp) => {
        if (inp.k === 'item') {
          const ids = inp.item === 'string' || inp.item === 'magnet' ? pz.parts.filter((x) => L.items[x].kind === inp.item) : pz.needs.filter((x) => L.items[x].kind === inp.item);
          ids.forEach((x) => out.push({ pz, k: 'item', item: x }));
        } else out.push({ pz, k: inp.k });
      });
      return out;
    }
    const sources = [];                                        // { pz, k, item?, src: 'free'|pid }
    for (let r = 0; r < c.rooms; r++) {
      const q = quotas[r], fams = new Set();
      const last = r === c.rooms - 1;
      // radice: la porta (o l'uscita); con altri enigmi nella stanza deve avere un ingresso
      const rootC = pool.filter((t) => DOOR_OK.has(t) && (q === 1 || inputsOf(t, { missing: -1 }).length));
      const rt = chooseType(rootC, r, fams);
      if (!rt) return null;
      const root = addPuzzle(rt, r, true);
      if (FAMILY[rt]) fams.add(FAMILY[rt]);
      root.gives = last ? { exit: 1 } : { door: r + 1 };
      if (last) L.exit = root.id; else L.doors.push(root.id);
      let open = openInputs(root);
      const closed = [];
      for (let k = 1; k < q; k++) {
        const remaining = q - 1 - k;
        const prod = open.filter(producible);
        if (!prod.length) return null;
        // preferenza per gli oggetti (la chiave nel baule è un classico)
        const inp = wpick(rnd, prod, prod.map((x) => (x.k === 'item' ? 2 : 1)));
        open.splice(open.indexOf(inp), 1);
        const openAfter = open.filter(producible).length;
        const cands = pool.filter((t) => {
          if (t === 'balance' && remaining > 0 && openAfter === 0 && !c.balance.missing) return false;
          const nIn = (t === 'balance' ? 0 : inputsOf(t, { missing: -1 }).filter(producible).length);
          return remaining === 0 || openAfter + nIn >= 1;
        });
        const t = chooseType(cands, r, fams);
        if (!t) return null;
        const pz = addPuzzle(t, r, false);
        if (FAMILY[t]) fams.add(FAMILY[t]);
        // il nuovo enigma contiene ciò che serve all'ingresso
        if (inp.k === 'item') { pz.gives = { item: inp.item }; L.items[inp.item].at = { pid: pz.id }; }
        else { const note = newItem('note', { clue: inp.pz.clue, for: inp.pz.id }); pz.gives = { item: note }; L.items[note].at = { pid: pz.id }; inp.pz.clues.push({ item: note }); }
        closed.push(inp);
        open = open.concat(openInputs(pz));
        if (remaining > 0 && !open.some(producible)) return null;
      }
      open.forEach((inp) => sources.push(inp));
    }
    // stanza buia: enigma "dark" (torcia + pila trovate in stanze precedenti)
    if (darkRoom >= 0) {
      const pz = addPuzzle('dark', darkRoom, false);
      const a = newItem('torch'), b = newItem('battery'), lamp = newItem('lamp', { from: [a, b] });
      L.recipes.push({ a, b, out: lamp });
      pz.needs.push(lamp);
      pz.gives = { light: darkRoom };
      sources.push({ pz, k: 'item', item: a, before: darkRoom }, { pz, k: 'item', item: b, before: darkRoom });
    }

    /* ---- posizioni: contenitori, indizi, nascondigli ---- */
    const newObj = (room, slot, kind, role, extra) => { const id = 'o' + oid++; L.o[id] = Object.assign({ id, room, slot, kind, role }, extra); return id; };
    const takeSlot = (room, k) => { const f = L.rooms[room].free[k]; if (!f.length) return null; return f.splice(ri(rnd, f.length), 1)[0]; };
    for (const pz of Object.values(L.p)) {
      if (pz.type === 'dark') { pz.obj = null; continue; }
      if (pz.root) { pz.obj = newObj(pz.room, 'D', pz.gives.exit ? 'exit' : 'door', 'lock', { pid: pz.id }); continue; }
      const slot = takeSlot(pz.room, SLOTK[pz.type]);
      if (!slot) return null;
      const furn = FURN[pz.type] ? pick(rnd, FURN[pz.type]) : pz.type;
      pz.obj = newObj(pz.room, slot, furn, 'lock', { pid: pz.id });
    }
    const roomFor = (r, before) => {
      if (before != null) return ri(rnd, before);
      return r > 0 && rnd() < c.cross ? ri(rnd, r) : r;
    };
    // indizi liberi: sul muro della stanza (o di una precedente); se non c'è posto, biglietto nascosto
    const hideQueue = [];
    for (const inp of sources) {
      const pz = inp.pz;
      if (inp.k === 'item') { hideQueue.push({ item: inp.item, room: roomFor(pz.room, inp.before) }); continue; }
      const data = inp.k === 'table' ? pz.table : pz.clue;
      const room = roomFor(pz.room);
      let slot = takeSlot(room, 'W');
      let rr = room;
      if (!slot && room !== pz.room) { rr = pz.room; slot = takeSlot(rr, 'W'); }
      if (slot) { const o = newObj(rr, slot, data.kind, 'clue', { clue: data, for: pz.id }); pz.clues.push({ obj: o }); continue; }
      if (inp.k === 'table') return null;
      const note = newItem('note', { clue: data, for: pz.id });
      pz.clues.push({ item: note });
      hideQueue.push({ item: note, room: pz.room });
    }
    // nascondigli: tappeto, vasi/piante, quadro che si sposta, cuscino della poltrona
    for (const h of hideQueue) {
      const fr = L.rooms[h.room].free;
      const opts = [];
      if (fr.R.length) opts.push('R');
      if (fr.S.length) opts.push('S');
      if (fr.W.length) opts.push('W');
      if (fr.F.length) opts.push('F');
      if (!opts.length) return null;
      const k = wpick(rnd, opts, opts.map((x) => (x === 'R' || x === 'S' ? 3 : 1)));
      const slot = takeSlot(h.room, k);
      const kind = k === 'R' ? 'rug' : k === 'S' ? pick(rnd, ['vase', 'plant']) : k === 'W' ? 'frame' : 'armchair';
      const o = newObj(h.room, slot, kind, 'hide', { item: h.item });
      L.items[h.item].at = { obj: o };
    }
    // arredo: tappeto e vasi vuoti (nascondigli finti), finestra, poltrona, lampada
    L.rooms.forEach((rm, r) => {
      if (rm.free.R.length) newObj(r, rm.free.R.pop(), 'rug', 'hide', { item: null });
      while (rm.free.S.length) { const s = rm.free.S.pop(); if (rnd() < 0.7) newObj(r, s, pick(rnd, ['vase', 'plant']), 'hide', { item: null }); }
      // arredo senza doppioni nella stanza (le poltrone già usate come nascondiglio contano)
      const has = (k) => Object.values(L.o).some((x) => x.room === r && x.kind === k);
      const wallDec = shuffle(['picture', 'shelf', 'garland'], rnd).filter((k) => !has(k));
      let win = has('window');
      while (rm.free.W.length) { const s = rm.free.W.splice(ri(rnd, rm.free.W.length), 1)[0]; newObj(r, s, !win ? 'window' : wallDec.shift() || 'garland', 'decor', {}); win = true; }
      const floorDec = shuffle(['armchair', 'lamp', 'bigplant'], rnd).filter((k) => !has(k));
      while (rm.free.F.length) { const s = rm.free.F.pop(), k = floorDec.shift() || 'bigplant'; newObj(r, s, k, k === 'armchair' ? 'hide' : 'decor', { item: null }); }
      delete rm.free;
    });
    // le porte "precedenti" (frecce) sono implicite: la stanza r si raggiunge dopo la porta r−1

    /* ---- ordine di soluzione (simulazione del grafo) ---- */
    const order = simulate(L);
    if (!order) return null;
    L.order = order;
    L.n = Object.keys(L.p).length;
    if (L.n !== c.n) return null;
    // i tipi devono essere tutti diversi quando il repertorio lo permette
    const types = Object.values(L.p).map((p) => p.type);
    if (new Set(types).size < Math.min(types.length, pool.length + (darkRoom >= 0 ? 1 : 0))) return null;
    return L;
  }

  // simulazione del grafo con le informazioni del generatore: restituisce l'ordine degli enigmi o null
  function simulate(L) {
    const solved = new Set(), have = new Set(), order = [];
    const P = Object.values(L.p);
    let reach = 0;
    const lit = (r) => !L.rooms[r].dark || P.some((p) => p.type === 'dark' && p.room === r && solved.has(p.id));
    const ok = (o) => o.room <= reach && lit(o.room);
    for (let guard = 0; guard < 200; guard++) {
      let prog = false;
      // oggetti raggiungibili
      for (const it of Object.values(L.items)) {
        if (have.has(it.id)) continue;
        if (it.from) { if (it.from.every((x) => have.has(x))) { have.add(it.id); prog = true; } continue; }
        if (!it.at) return null;
        if (it.at.obj != null) { if (ok(L.o[it.at.obj])) { have.add(it.id); prog = true; } }
        else if (solved.has(it.at.pid)) { have.add(it.id); prog = true; }
      }
      for (const p of P) {
        if (solved.has(p.id) || p.room > reach) continue;
        if (p.type !== 'dark' && !lit(p.room)) continue;
        if (!p.needs.every((x) => have.has(x))) continue;
        if (!p.clues.every((cl) => (cl.obj != null ? ok(L.o[cl.obj]) : have.has(cl.item)))) continue;
        solved.add(p.id); order.push(p.id); prog = true;
        if (p.gives && p.gives.door) reach = Math.max(reach, p.gives.door);
      }
      if (solved.size === P.length) return order;
      if (!prog) return null;
    }
    return null;
  }

  /* ---------- stato ---------- */
  const cache = new Map();
  function levelOf(s) {
    const k = `${s.level}:${s.seed}:${(s.avoid || []).join('.')}`;
    let L = cache.get(k);
    if (!L) {
      L = generate(s.level, rng(s.seed), s.avoid || []);
      if (cache.size > 12) cache.clear();
      cache.set(k, L);
    }
    return L;
  }
  function newGame(level, seed, avoid = []) {
    const s = { v: 1, level: Math.max(1, level | 0), seed: seed >>> 0, avoid: (avoid || []).filter((t) => TYPES.includes(t)), room: 0, inv: [], solved: {}, open: {}, taken: {}, used: {}, ps: {},
      hv: 0, hp: 0, hint: null, moves: 0, wrong: 0, secs: 0, won: false };
    const L = levelOf(s);
    Object.values(L.p).forEach((p) => { if (p.init) s.ps[p.id] = clone(p.init); });
    return s;
  }
  const typesOf = (s) => [...new Set(Object.values(levelOf(s).p).map((p) => p.type))];
  function reach(s) {
    const L = levelOf(s);
    let r = 0;
    L.doors.forEach((pid) => { if (s.solved[pid]) r = Math.max(r, L.p[pid].gives.door); });
    return r;
  }
  function lit(s, room) {
    const L = levelOf(s);
    if (!L.rooms[room].dark) return true;
    return Object.values(L.p).some((p) => p.type === 'dark' && p.room === room && s.solved[p.id]);
  }
  // un oggetto si può toccare: è nella stanza corrente e la stanza è illuminata
  function visible(s, oid) {
    const o = levelOf(s).o[oid];
    return !!o && o.room === s.room && lit(s, o.room);
  }
  // un oggetto (dell'inventario) è a vista nella stanza, pronto da raccogliere?
  function itemShown(s, id) {
    const L = levelOf(s), it = L.items[id];
    if (!it || !it.at || s.taken[id]) return false;
    if (it.at.obj != null) return !!s.open[it.at.obj];
    return !!s.solved[it.at.pid];
  }
  const itemObj = (L, id) => { const at = L.items[id].at; return at.obj != null ? at.obj : L.p[at.pid].obj; };
  const ok = (s, extra) => { s.moves++; return Object.assign({ type: 'ok' }, extra); };
  const INVALID = { type: 'invalid' };

  function go(s, r) {
    if (s.won || r === s.room || r < 0 || r > reach(s)) return INVALID;
    s.room = r;
    return ok(s);
  }
  // sollevare il tappeto, guardare nel vaso, spostare il quadro, alzare il cuscino
  function search(s, oid) {
    const L = levelOf(s), o = L.o[oid];
    if (s.won || !o || o.role !== 'hide' || !visible(s, oid) || s.open[oid]) return INVALID;
    s.open[oid] = 1;
    return ok(s, { type: 'reveal', item: o.item });
  }
  function take(s, id) {
    const L = levelOf(s);
    if (s.won || !itemShown(s, id) || !visible(s, itemObj(L, id))) return INVALID;
    s.taken[id] = 1;
    s.inv.push(id);
    return ok(s, { type: 'take', item: id });
  }
  function solve(s, pz) {
    s.solved[pz.id] = 1;
    if (pz.gives && pz.gives.exit) s.won = true;
    if (s.hint && s.hint.pid === pz.id) s.hint = null;
    return { solved: true, gives: pz.gives, won: s.won };
  }
  // usare un oggetto su un contenitore (o sulla stanza buia: target 'room')
  function use(s, id, target) {
    const L = levelOf(s);
    if (s.won || !s.inv.includes(id)) return INVALID;
    let pz = null;
    if (target === 'room') pz = Object.values(L.p).find((p) => p.type === 'dark' && p.room === s.room && !s.solved[p.id]);
    else {
      const o = L.o[target];
      if (!o || !visible(s, target) || !o.pid) return INVALID;
      pz = L.p[o.pid];
    }
    if (!pz || s.solved[pz.id] || !pz.needs.includes(id)) { s.wrong++; return ok(s, { type: 'wrong' }); }
    s.inv = s.inv.filter((x) => x !== id);
    s.used[id] = 1;
    if (pz.type === 'balance') return ok(s, { type: 'used', pid: pz.id });
    return ok(s, Object.assign({ type: 'used', pid: pz.id }, solve(s, pz)));
  }
  function combine(s, a, b) {
    const L = levelOf(s);
    if (s.won || a === b || !s.inv.includes(a) || !s.inv.includes(b)) return INVALID;
    const r = L.recipes.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!r) { s.wrong++; return ok(s, { type: 'wrong' }); }
    s.inv = s.inv.filter((x) => x !== a && x !== b);
    s.used[a] = s.used[b] = 1;
    s.inv.push(r.out);
    s.taken[r.out] = 1;
    return ok(s, { type: 'combined', item: r.out });
  }
  // un enigma si può manovrare se il suo contenitore è a vista
  function available(s, pz) {
    if (!pz || s.won || s.solved[pz.id]) return false;
    if (pz.type === 'dark') return pz.room === s.room;
    return visible(s, pz.obj);
  }
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  function act(s, pid, op, a, b) {
    const L = levelOf(s), pz = L.p[pid];
    if (!available(s, pz)) return INVALID;
    const st = s.ps[pid];
    switch (pz.type) {
      case 'paint': case 'count': case 'books': case 'clock': case 'cipher': {
        if (op !== 'dial' || !(a >= 0 && a < pz.len)) return INVALID;
        st.v[a] = (st.v[a] + (b < 0 ? 9 : 1)) % 10;
        return eq(st.v, pz.secret.code) ? ok(s, solve(s, pz)) : ok(s);
      }
      case 'colors': case 'simon': {
        const opts = pz.type === 'colors' ? pz.buttons : range(pz.bars.length);
        if (op !== 'press' || !opts.includes(a)) return INVALID;
        st.e.push(a);
        if (st.e.length < pz.len) return ok(s, { entered: st.e.length });
        if (eq(st.e, pz.secret.seq)) return ok(s, solve(s, pz));
        st.e = []; s.wrong++;
        return ok(s, { type: 'wrong' });
      }
      case 'levers': {
        if (op !== 'toggle' || !(a >= 0 && a < pz.n)) return INVALID;
        st.p[a] ^= 1;
        return eq(st.p, pz.secret.pos) ? ok(s, solve(s, pz)) : ok(s);
      }
      case 'lights': {
        if (op !== 'press' || !(a >= 0 && a < pz.w * pz.h)) return INVALID;
        st.b = lightsPress(pz.w, pz.h, st.b, a);
        return st.b.every(Boolean) ? ok(s, solve(s, pz)) : ok(s);
      }
      case 'slide': {
        if (op !== 'move') return INVALID;
        const N = pz.w * pz.h, bl = st.t.indexOf(N - 1);
        const ax = a % pz.w, ay = (a / pz.w) | 0, bx = bl % pz.w, by = (bl / pz.w) | 0;
        if (!(a >= 0 && a < N) || Math.abs(ax - bx) + Math.abs(ay - by) !== 1) return INVALID;
        st.t[bl] = st.t[a]; st.t[a] = N - 1;
        return st.t.every((v, i) => v === i) ? ok(s, Object.assign({ from: a, to: bl }, solve(s, pz))) : ok(s, { from: a, to: bl });
      }
      case 'balance': {
        if (op !== 'toggle' || !(a >= 0 && a < pz.weights.length)) return INVALID;
        if (a === pz.missing && !s.used[pz.needs[0]]) return INVALID;
        st.on[a] ^= 1;
        const sum = pz.weights.reduce((t, w, i) => t + (st.on[i] ? w : 0), 0);
        return sum === pz.target ? ok(s, solve(s, pz)) : ok(s, { sum });
      }
      case 'pipes': {
        if (op !== 'rot' || !(a >= 0 && a < pz.w * pz.h)) return INVALID;
        st.r[a] = (st.r[a] + 1) & 3;
        return pipeFlow(pz.w, pz.h, pz.src, pz.dst, pz.kinds, st.r).ok ? ok(s, solve(s, pz)) : ok(s);
      }
      case 'maze': {
        if (op !== 'move' || !(a >= 0 && a < 4)) return INVALID;
        if (!(pz.open[st.p] & (1 << a))) return { type: 'bump' };
        const x = st.p % pz.n, y = (st.p / pz.n) | 0;
        st.p = (y + DY[a]) * pz.n + x + DX[a];
        return st.p === pz.goal ? ok(s, solve(s, pz)) : ok(s);
      }
      case 'mirror': {
        if (op !== 'flip' || !(a >= 0 && a < pz.mirrors.length)) return INVALID;
        st.o[a] ^= 1;
        return beam(pz.n, pz.src, pz.mirrors, st.o, pz.target).hit ? ok(s, solve(s, pz)) : ok(s);
      }
      case 'shadow': {
        if (op !== 'pick' || !pz.toys.includes(a)) return INVALID;
        if (pz.shadows.indexOf(a) < st.k) return INVALID;        // già al suo posto
        if (pz.shadows[st.k] !== a) { s.wrong++; return ok(s, { type: 'wrong' }); }
        st.k++;
        return st.k === pz.shadows.length ? ok(s, solve(s, pz)) : ok(s, { placed: st.k });
      }
      default: return INVALID;
    }
  }

  /* ---------- prossimo passo (per gli aiuti) ---------- */
  function obtain(s, id) {
    const L = levelOf(s), it = L.items[id];
    if (s.inv.includes(id) || s.used[id]) return null;
    if (it.from) {
      for (const x of it.from) { const r = obtain(s, x); if (r) return r; }
      return { k: 'combine', a: it.from[0], b: it.from[1], room: s.room };
    }
    if (it.at.obj != null) {
      const o = L.o[it.at.obj];
      if (!s.open[o.id]) return { k: 'search', obj: o.id, room: o.room };
      return { k: 'take', item: id, obj: o.id, room: o.room };
    }
    const pz = L.p[it.at.pid];
    if (!s.solved[pz.id]) return stepFor(s, pz.id);
    return { k: 'take', item: id, obj: pz.obj, room: pz.room };
  }
  function stepFor(s, pid) {
    const L = levelOf(s), pz = L.p[pid];
    if (pz.type !== 'dark' && !lit(s, pz.room)) {
      const d = Object.values(L.p).find((p) => p.type === 'dark' && p.room === pz.room);
      return stepFor(s, d.id);
    }
    for (const id of pz.needs) { if (s.used[id]) continue; const r = obtain(s, id); if (r) return r; }
    for (const cl of pz.clues) if (cl.item != null) { const r = obtain(s, cl.item); if (r) return r; }
    const pending = pz.needs.find((id) => !s.used[id]);
    if (pending) return { k: 'use', item: pending, obj: pz.obj, room: pz.room, pid };
    return { k: 'solve', pid, obj: pz.obj, room: pz.room, clues: pz.clues.map((cl) => (cl.obj != null ? { obj: cl.obj } : { item: cl.item })) };
  }
  function next(s) {
    if (s.won) return null;
    const L = levelOf(s);
    for (const pid of L.order) if (!s.solved[pid]) return stepFor(s, pid);
    return null;
  }
  const stepKey = (st) => (st ? [st.k, st.pid || '', st.obj || '', st.item || '', st.a || ''].join(':') : '');
  // lampadina: 1° tocco = aiuto vago (dove guardare), 2° tocco sullo stesso passo = aiuto preciso (come si fa)
  function hint(s) {
    const st = next(s);
    if (!st) return null;
    const key = stepKey(st);
    if (s.hint && s.hint.key === key) {
      if (s.hint.lvl === 1) { s.hint.lvl = 2; s.hp++; s.hv = Math.max(0, s.hv - 1); }
    } else { s.hint = { key, lvl: 1, pid: st.pid || null }; s.hv++; }
    s.moves++;
    return Object.assign({ lvl: s.hint.lvl }, st);
  }
  // aiuto preciso dentro l'enigma: cosa fare (dipende dal tipo)
  function guide(s, pid) {
    const L = levelOf(s), pz = L.p[pid], st = s.ps[pid];
    if (!pz || s.solved[pid]) return null;
    switch (pz.type) {
      case 'paint': case 'count': case 'books': case 'clock': case 'cipher': return { code: pz.secret.code };
      case 'colors': case 'simon': return { seq: pz.secret.seq, at: st.e.length };
      case 'levers': return { flip: range(pz.n).filter((i) => st.p[i] !== pz.secret.pos[i]) };
      case 'lights': return { press: solveLights(pz.w, pz.h, st.b) };
      case 'slide': { const p = solveSlide(pz.w, pz.h, st.t); return { move: p && p.length ? p[0] : null }; }
      case 'balance': return { on: pz.secret.on };
      case 'pipes': {
        const fix = pz.secret.path.filter((i) => rotMask(PIPE[pz.kinds[i]], st.r[i]) !== rotMask(PIPE[pz.kinds[i]], pz.secret.rots[i]));
        return { fix };
      }
      case 'maze': return { path: mazePath(pz.n, pz.open, st.p, pz.goal) };
      case 'mirror': return { flip: range(pz.secret.path).filter((i) => st.o[i] !== pz.secret.o[i]) };
      case 'shadow': return { next: pz.shadows[st.k] };
      default: return null;
    }
  }

  /* ---------- punteggio ---------- */
  const isWon = (s) => !!s.won;
  function progress(s) {
    const L = levelOf(s);
    return Object.keys(s.solved).filter((k) => L.p[k]).length / Math.max(1, L.n);
  }
  function parTime(s) {
    const L = levelOf(s);
    return Math.round(Object.values(L.p).reduce((t, p) => t + PAR[p.type], 0) + L.rooms.length * 15 + 20);
  }
  // fragoline: 3 − (aiuti: 2 vaghi o 1 preciso = una fragolina) − 1 se il tempo supera il doppio del riferimento; minimo 1
  function rate(s) {
    const lost = Math.floor((s.hv + 2 * s.hp) / 2) + (s.secs > 2 * parTime(s) ? 1 : 0);
    return Math.max(1, 3 - lost);
  }
  function tick(s, sec = 1) { if (!s.won) s.secs += sec; }

  /* ---------- ripresa ---------- */
  function validate(o) {
    if (!o || o.v !== 1 || !Number.isFinite(o.level) || !Number.isFinite(o.seed) || !Array.isArray(o.inv) || !Array.isArray(o.avoid)) return false;
    if (!['solved', 'open', 'taken', 'used', 'ps'].every((k) => o[k] && typeof o[k] === 'object')) return false;
    try {
      const L = levelOf(o);
      if (!(o.room >= 0 && o.room < L.rooms.length)) return false;
      if (!o.inv.every((x) => L.items[x])) return false;
      return Object.values(L.p).every((p) => !p.init || (o.ps[p.id] && Object.keys(p.init).every((k) => k in o.ps[p.id])));
    } catch (e) { return false; }
  }

  // contesto per i moduli (escape-puzzles.js): nomi stabili e stato che cambia
  const EK = { GEMS, GLYPHS, TOYS, PICS, CLUE_OF, ri, pick, shuffle, range };
  // sotto-puzzle e creazione degli enigmi: escape-puzzles.js
  const { DY, DX, rotMask, PIPE, pipeFlow, REFL, beam, mazePath, lightsPress, solveLights, solveSlide, makePuzzle,
    inputsOf, producible } = Object.assign(EK, HH.escapePuzzles(EK));

  HH.escape = {
    TYPES, UNLOCK, GEMS, GLYPHS, TOYS, PICS, THEMES, FAMILY, DIGITS, PIPE, REFL,
    config, diffOf, generate, newGame, levelOf, typesOf, reach, lit, visible, itemShown, itemObj,
    go, search, take, use, combine, act, available, next, hint, guide, stepKey, isWon, progress, parTime, rate, tick, validate,
    rotMask, pipeFlow, beam, lightsPress, mazePath, simulate,
    solvers: { slide: solveSlide, lights: solveLights, maze: mazePath },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
