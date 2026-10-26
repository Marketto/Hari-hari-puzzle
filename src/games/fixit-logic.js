/* Fix-It House — logica pura (nessun DOM).
 * Una tempesta ha messo in disordine la casetta: ogni guasto si ripara con UN attrezzo giusto
 * e solo dopo aver riparato i suoi prerequisiti (grafo aciclico CATALOG).
 *
 * Generatore: sceglie un sotto-grafo "chiuso verso il basso" (se c'è un guasto ci sono anche
 * tutti i suoi prerequisiti) di sizeFor(level) guasti, con vincoli di forma che crescono col livello
 * (gruppi, niente guasti isolati, guasti con due prerequisiti). Sempre risolvibile: è un DAG.
 *
 * Esporta HH.fixit = { CATALOG, SCENES, SCENE_ORDER, sceneFor, sceneOf, catalogOf, TOOLS, sizeFor, shapeFor, generate, newState, validate,
 *                      canFix, blockersOf, apply, undo, isSolved, solve, closure, stats, rate, progress }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  // Scenari: ogni livello si svolge in un ambiente diverso, con il suo catalogo di guasti.
  // In ogni catalogo: ordine topologico (ogni guasto dopo i suoi prerequisiti) e un attrezzo diverso per guasto.
  const P = (id, tool, deps = []) => ({ id, tool, deps });
  const SCENES = {
    house: [                                   // la casetta vista da fuori (+ interno in sezione)
      P('ladder', 'hammer'),                   // scala rotta → martello
      P('roof', 'tile', ['ladder']),           // tegole volate → tegola
      P('chimney', 'brush', ['ladder']),       // camino pieno di fuliggine → scovolo
      P('branch', 'saw'),                      // ramo caduto sulla finestra → sega
      P('fire', 'matches', ['chimney', 'branch']), // camino pulito + legna dal ramo → fiammiferi
      P('glass', 'pane', ['branch']),          // vetro rotto → lastra
      P('curtains', 'curtain', ['glass']),     // tende cadute → tenda
      P('crack', 'trowel'),                    // crepa nel muro → cazzuola
      P('paint', 'roller', ['crack']),         // vernice scrostata → rullo
      P('valve', 'valve'),                     // acqua aperta → chiudi la valvola
      P('pipe', 'wrench', ['valve']),          // tubo che perde → chiave inglese
      P('puddle', 'mop', ['pipe']),            // pozzanghera → mocio
      P('fuse', 'fuse'),                       // corrente accesa → stacca il quadro
      P('wires', 'screwdriver', ['fuse']),     // fili penzolanti → cacciavite
      P('lamp', 'bulb', ['wires', 'puddle']),  // lampada: fili a posto e pavimento asciutto
      P('leaves', 'rake'),                     // mucchio di foglie → rastrello
      P('flowers', 'seeds', ['leaves']),       // aiuola vuota → fiori
    ],
    kitchen: [
      P('breaker', 'fuse'),                    // corrente da staccare prima di lavorare
      P('socket', 'screwdriver', ['breaker']), // presa staccata dal muro
      P('lamp', 'bulb', ['socket']),           // lampadario spento
      P('valve', 'valve'),                     // acqua aperta sotto il lavello
      P('faucet', 'wrench', ['valve']),        // rubinetto che spruzza
      P('flood', 'mop', ['faucet']),           // pavimento allagato
      P('fridge', 'plug', ['socket', 'flood']),// frigo spento: presa sistemata e pavimento asciutto
      P('shards', 'broom'),                    // cocci per terra
      P('shelf', 'hammer', ['shards']),        // mensola caduta (prima si spazzano i cocci)
      P('jars', 'jar', ['shelf']),             // barattoli da rimettere sulla mensola
      P('window', 'pane'),                     // vetro rotto
      P('curtain', 'curtain', ['window']),     // tendina strappata
      P('cake', 'mitt'),                       // torta che brucia nel forno
      P('dishes', 'sponge', ['faucet', 'cake']), // piatti sporchi: acqua sistemata, forno spento
    ],
    bedroom: [
      P('window', 'pane'),                     // vetro rotto, entra la pioggia
      P('curtain', 'curtain', ['window']),
      P('carpet', 'mop', ['window']),          // tappeto bagnato dalla pioggia
      P('shelf', 'screwdriver'),               // mensola staccata
      P('books', 'books', ['shelf']),          // libri da rimettere a posto
      P('lamp', 'bulb', ['shelf']),            // lampada caduta dalla mensola
      P('plant', 'pot', ['carpet', 'shelf']),  // pianta rovesciata: vaso nuovo sulla mensola, tappeto asciutto
      P('bed', 'hammer'),                      // gamba del letto rotta
      P('pillows', 'pillow', ['bed']),         // cuscini sparsi
      P('blanket', 'blanket', ['pillows']),    // coperta da rimboccare
      P('crack', 'trowel'),                    // crepa nel muro
      P('paint', 'roller', ['crack']),         // muro da ridipingere
      P('clock', 'battery'),                   // sveglia ferma
    ],
    bathroom: [
      P('valve', 'valve'),                     // acqua aperta
      P('pipe', 'wrench', ['valve']),          // tubo che perde
      P('tub', 'stopper', ['valve']),          // vasca che trabocca: manca il tappo
      P('flood', 'mop', ['pipe', 'tub']),      // pavimento allagato
      P('tiles', 'trowel', ['flood']),         // piastrelle staccate (sul pavimento asciutto)
      P('mirror', 'pane'),                     // specchio incrinato
      P('fuse', 'fuse'),                       // corrente da staccare
      P('lamp', 'bulb', ['fuse']),             // luce dello specchio
      P('fan', 'screwdriver', ['fuse']),       // ventola staccata
      P('rack', 'hammer'),                     // portasciugamani caduto
      P('towels', 'towel', ['rack']),          // asciugamani per terra
      P('duck', 'duck', ['tub']),              // paperella dispersa: torna nella vasca
    ],
    garden: [
      P('trunk', 'saw'),                       // tronco caduto sul vialetto
      P('gate', 'hammer', ['trunk']),          // cancelletto rotto
      P('swing', 'rope', ['trunk']),           // altalena con la corda spezzata
      P('glass', 'pane'),                      // vetro della serra rotto
      P('pots', 'pot', ['glass']),             // vasi rovesciati nella serra
      P('seedlings', 'seeds', ['pots']),       // piantine da ripiantare
      P('tap', 'valve'),                       // rubinetto del giardino aperto
      P('hose', 'wrench', ['tap']),            // tubo da giardino bucato
      P('water', 'can', ['hose', 'seedlings']),// annaffiare le piantine
      P('leaves', 'rake'),                     // foglie dappertutto
      P('birdhouse', 'screwdriver', ['leaves']), // casetta degli uccellini caduta tra le foglie
      P('lantern', 'bulb'),                    // lanterna del giardino spenta
    ],
  };
  const SCENE_ORDER = ['house', 'kitchen', 'bedroom', 'bathroom', 'garden'];
  const CATALOG = SCENES.house;                // compatibilità: il catalogo "storico"
  const TOOLS = [...new Set(SCENE_ORDER.flatMap((k) => SCENES[k].map((p) => p.tool)))];
  const sceneOf = (x) => (x && SCENES[x] ? x : 'house');
  const catalogOf = (scene) => SCENES[sceneOf(scene)];
  const byOf = (scene) => Object.fromEntries(catalogOf(scene).map((p) => [p.id, p]));
  // livello → scenario: si gira tra gli ambienti, così ogni episodio ha un posto nuovo
  const sceneFor = (level) => SCENE_ORDER[(lv(level) - 1) % SCENE_ORDER.length];

  // Curva: 3 guasti al livello 1, poi cresce fino a 10 (livello 14+).
  const CURVE = [3, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10];
  const lv = (level) => Math.max(1, Math.floor(+level || 1));
  const sizeFor = (level) => CURVE[Math.min(CURVE.length, lv(level)) - 1];
  // Vincoli di forma del sotto-grafo
  function shapeFor(level) {
    const l = lv(level);
    return {
      size: sizeFor(l),
      maxGroups: l <= 2 ? 1 : 99,       // livelli 1-2: un'unica catena
      minGroups: l >= 4 ? 2 : 1,        // poi più catene in parallelo
      singles: l >= 3 ? 0 : 99,         // dal 3: nessun guasto isolato
      multi: l >= 7,                    // dal 7: almeno un guasto con 2 prerequisiti
      depth: l >= 6 ? 3 : 2,          // catena più lunga (in guasti)
      decoys: Math.min(3, 1 + Math.floor(l / 4)),        // attrezzi in più nella cassetta
    };
  }

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // id + tutti i suoi prerequisiti (transitivi) nello scenario dato
  function closure(id, out = new Set(), scene = 'house') {
    if (out.has(id)) return out;
    out.add(id);
    byOf(scene)[id].deps.forEach((d) => closure(d, out, scene));
    return out;
  }

  // misure di forma di un insieme di problemi [{id, deps}]
  function stats(problems) {
    const ids = problems.map((p) => p.id);
    const set = new Set(ids);
    const adj = new Map(ids.map((i) => [i, new Set()]));
    let edges = 0, multi = 0;
    problems.forEach((p) => {
      const d = p.deps.filter((x) => set.has(x));
      edges += d.length;
      if (d.length >= 2) multi++;
      d.forEach((x) => { adj.get(p.id).add(x); adj.get(x).add(p.id); });
    });
    let groups = 0, singles = 0;
    const seen = new Set();
    for (const i of ids) {
      if (seen.has(i)) continue;
      groups++;
      let n = 0;
      const st = [i]; seen.add(i);
      while (st.length) { const v = st.pop(); n++; adj.get(v).forEach((w) => { if (!seen.has(w)) { seen.add(w); st.push(w); } }); }
      if (n === 1) singles++;
    }
    const memo = new Map();
    const depthOf = (i) => {
      if (memo.has(i)) return memo.get(i);
      const p = problems.find((q) => q.id === i);
      const v = 1 + Math.max(0, ...p.deps.filter((x) => set.has(x)).map(depthOf));
      memo.set(i, v);
      return v;
    };
    const depth = Math.max(0, ...ids.map(depthOf));
    return { size: ids.length, edges, multi, groups, singles, depth };
  }

  function fits(st, sh) {
    return st.size === sh.size && st.groups <= sh.maxGroups && st.groups >= sh.minGroups &&
      st.singles <= sh.singles && (!sh.multi || st.multi > 0) && st.depth >= sh.depth;
  }
  // quanto un tentativo si allontana dai vincoli (per il ripiego)
  function miss(st, sh) {
    return Math.abs(st.size - sh.size) * 10 + Math.max(0, st.groups - sh.maxGroups) + Math.max(0, sh.minGroups - st.groups) +
      Math.max(0, st.singles - sh.singles) + (sh.multi && !st.multi ? 1 : 0) + Math.max(0, sh.depth - st.depth);
  }

  function pickSet(k, rnd, scene) {
    const S = new Set();
    while (S.size < k) {
      const opts = [];
      for (const p of catalogOf(scene)) {
        if (S.has(p.id)) continue;
        const add = [...closure(p.id, new Set(), scene)].filter((i) => !S.has(i));
        if (add.length <= k - S.size) opts.push({ add, w: add.length * (0.2 + rnd()) });
      }
      if (!opts.length) break;
      let best = opts[0];
      for (const o of opts) if (o.w > best.w) best = o;
      best.add.forEach((i) => S.add(i));
    }
    return S;
  }

  /* generate(level, rnd, scene?) → { level, scene, problems:[{id, tool, deps}], tools:[...] }
   * scenario: quello del livello (sceneFor) se non indicato. problems in ordine di catalogo;
   * tools = attrezzi dei guasti + "esche" (prima dallo stesso scenario, poi dagli altri), mescolati. */
  function generate(level, rnd = Math.random, scene = sceneFor(level)) {
    scene = sceneOf(scene);
    const cat = catalogOf(scene);
    const sh = shapeFor(level);
    let best = null, bestMiss = Infinity;
    for (let tries = 0; tries < 400; tries++) {
      const S = pickSet(sh.size, rnd, scene);
      const problems = cat.filter((p) => S.has(p.id)).map((p) => ({ id: p.id, tool: p.tool, deps: p.deps.slice() }));
      const st = stats(problems);
      if (fits(st, sh)) { best = problems; break; }
      const m = miss(st, sh);
      if (m < bestMiss) { bestMiss = m; best = problems; }
    }
    const own = best.map((p) => p.tool);
    const near = shuffle(cat.map((p) => p.tool).filter((t) => !own.includes(t)), rnd);
    const far = shuffle(TOOLS.filter((t) => !own.includes(t) && !near.includes(t)), rnd);
    const others = near.concat(far).slice(0, sh.decoys);
    return { level: lv(level), scene, problems: best, tools: shuffle(own.concat(others), rnd) };
  }

  /* ---------- stato di gioco ---------- */
  // fixed: guasti riparati in ordine (serve anche per "Annulla"); found: dipendenze scoperte [da, a]
  function newState(puzzle) {
    return {
      v: 1, level: puzzle.level, scene: sceneOf(puzzle.scene), problems: puzzle.problems.map((p) => ({ id: p.id, tool: p.tool, deps: p.deps.slice() })),
      tools: puzzle.tools.slice(), fixed: [], found: [], mistakes: 0, slips: 0, moves: 0,
    };
  }

  // controlla un puzzle/stato salvato: guasti del catalogo, attrezzo giusto, prerequisiti inclusi
  function validate(s) {
    if (!s || !Array.isArray(s.problems) || !s.problems.length || !Array.isArray(s.tools)) return false;
    if (s.scene !== undefined && !SCENES[s.scene]) return false;
    const BY = byOf(s.scene);                 // salvataggi vecchi senza scenario = casetta
    const ids = new Set();
    for (const p of s.problems) {
      const c = p && BY[p.id];
      if (!c || ids.has(p.id) || p.tool !== c.tool || !Array.isArray(p.deps)) return false;
      if (p.deps.length !== c.deps.length || p.deps.some((d, i) => d !== c.deps[i])) return false;
      ids.add(p.id);
    }
    for (const p of s.problems) if (p.deps.some((d) => !ids.has(d))) return false;
    if (s.problems.some((p) => !s.tools.includes(p.tool)) || s.tools.some((t) => !TOOLS.includes(t))) return false;
    if (s.fixed !== undefined) {
      if (!Array.isArray(s.fixed)) return false;
      const done = new Set();
      for (const id of s.fixed) {
        if (!ids.has(id) || done.has(id) || BY[id].deps.some((d) => !done.has(d))) return false;
        done.add(id);
      }
    }
    return !!solve(s.problems);
  }

  const find = (s, id) => s.problems.find((p) => p.id === id);
  const blockersOf = (s, id) => { const p = find(s, id); return p ? p.deps.filter((d) => !s.fixed.includes(d)) : []; };
  const canFix = (s, id) => !!find(s, id) && !s.fixed.includes(id) && blockersOf(s, id).length === 0;

  /* apply(state, id, tool) — MODIFICA lo stato e restituisce { result, blockers }:
   *   'tool'    attrezzo sbagliato (si controlla per primo): slips+1, nessun cuore
   *   'order'   attrezzo giusto ma prerequisiti mancanti: mistakes+1, blockers = prerequisiti diretti non riparati
   *   'fixed'   riparato
   *   'already' / 'invalid'  niente da fare (stato invariato) */
  function apply(s, id, tool) {
    const p = find(s, id);
    if (!p) return { result: 'invalid', blockers: [] };
    if (s.fixed.includes(id)) return { result: 'already', blockers: [] };
    s.moves++;
    if (tool !== p.tool) { s.slips++; return { result: 'tool', blockers: [] }; }
    const blockers = blockersOf(s, id);
    if (blockers.length) {
      s.mistakes++;
      blockers.forEach((b) => { if (!s.found.some(([a, c]) => a === b && c === id)) s.found.push([b, id]); });
      return { result: 'order', blockers };
    }
    s.fixed.push(id);
    return { result: 'fixed', blockers: [] };
  }

  // annulla l'ultima riparazione (i cuori persi restano persi)
  function undo(s) { return s.fixed.length ? s.fixed.pop() : null; }
  const isSolved = (s) => s.problems.every((p) => s.fixed.includes(p.id));

  // Kahn: un ordine valido di riparazione, o null se c'è un ciclo / un prerequisito mancante
  function solve(problems) {
    const ids = new Set(problems.map((p) => p.id));
    if (problems.some((p) => p.deps.some((d) => !ids.has(d)))) return null;
    const indeg = new Map(problems.map((p) => [p.id, p.deps.length]));
    const order = [], q = problems.filter((p) => !p.deps.length).map((p) => p.id);
    while (q.length) {
      const v = q.shift();
      order.push(v);
      problems.forEach((p) => { if (p.deps.includes(v)) { indeg.set(p.id, indeg.get(p.id) - 1); if (!indeg.get(p.id)) q.push(p.id); } });
    }
    return order.length === problems.length ? order : null;
  }

  const rate = (s) => ((s.mistakes || 0) === 0 && (s.slips || 0) === 0 ? 3 : (s.mistakes || 0) + (s.slips || 0) <= 2 ? 2 : 1);
  const progress = (s) => (s && s.problems && s.problems.length ? Math.max(0, Math.min(1, (s.fixed || []).length / s.problems.length)) : 0);

  HH.fixit = { CATALOG, SCENES, SCENE_ORDER, sceneFor, sceneOf, catalogOf, TOOLS, sizeFor, shapeFor, generate, newState, validate, canFix, blockersOf, apply, undo, isSolved, solve, closure, stats, rate, progress };
})(typeof globalThis !== 'undefined' ? globalThis : window);
