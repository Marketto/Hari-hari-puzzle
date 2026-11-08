/* Hari Colors — logica pura (niente DOM), testabile da Node.
 *
 * Hari dice ad alta voce il nome di un colore; sullo schermo ci sono sagome (o parole) di colori diversi e si tocca,
 * il più in fretta possibile, quella con l'INCHIOSTRO del colore detto. Ogni round ha esattamente una risposta giusta.
 *
 * Modalità dei round (curva in config(level)):
 *   shape   sagome kawaii (cuore, stella, palloncino, mela…) colorate: si guarda solo il colore
 *   same    parole di colori scritte con il LORO colore ("ROSSO" in rosso): si impara a leggere l'inchiostro
 *   stroop  parole scritte con un inchiostro DIVERSO dal significato ("ROSSO" in blu): conta l'inchiostro, non la parola.
 *           C'è sempre un'esca: una parola che dice il colore cercato ma è scritta in un altro inchiostro
 *   mixed   sagome, parole coerenti e parole incoerenti insieme (con l'esca)
 *
 * Colori: gli 11 colori di base che quasi tutte le lingue hanno come parola semplice (Berlin & Kay): rosso, arancione,
 * giallo, verde, blu, viola, rosa, marrone, nero, bianco, grigio. I valori RGB sono token CSS (src/games/colors.css):
 * qui ci sono solo gli id, le chiavi i18n, il simbolo per l'opzione "simboli" e le coppie che si confondono con il
 * daltonismo (CLOSE, verificate dal test sulla palette vera): con pochi colori (k ≤ 5) non escono mai insieme.
 *
 * Punteggio: per ogni risposta giusta 40..100 punti secondo la rapidità (oltre i primi GRACE ms, il tempo di sentire
 * il nome), +5 per ogni risposta giusta di fila (fino a +50), dimezzati per ogni tocco sbagliato nello stesso round.
 * Tocco sbagliato = un cuore (3 cuori per livello). Tempo scaduto = 0 punti e serie azzerata, ma nessun cuore perso:
 * Hari mostra dov'era e si passa al round dopo (niente frustrazione).
 *
 * API su HH.colors:
 *   COLORS, CLOSE, SHAPES, LIVES, GRACE, config(level), newGame(level, seed), round(s) → { target, mode, items },
 *   answer(s, r, idx, ms) → { type: 'right' | 'wrong' | 'invalid', pts, … }, timeout(s, r), points(ms, limit, streak, errs),
 *   isWon, isLost, isOver, progress, rate, parTime, validate, pickVoice(voices, code), langTags(code)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  /* ---------- colori (ordine = ordine di introduzione) ---------- */
  const COLORS = [
    { id: 'red', key: 'col_red', sym: 'dot' },
    { id: 'blue', key: 'col_blue', sym: 'plus' },
    { id: 'yellow', key: 'col_yellow', sym: 'tri' },
    { id: 'green', key: 'col_green', sym: 'square' },
    { id: 'orange', key: 'col_orange', sym: 'diamond' },
    { id: 'purple', key: 'col_purple', sym: 'cross' },
    { id: 'pink', key: 'col_pink', sym: 'ring' },
    { id: 'black', key: 'col_black', sym: 'bars' },
    { id: 'white', key: 'col_white', sym: 'moon' },
    { id: 'brown', key: 'col_brown', sym: 'dots' },
    { id: 'grey', key: 'col_grey', sym: 'wave' },
  ];
  const IDS = COLORS.map((c) => c.id);
  const BY = Object.fromEntries(COLORS.map((c) => [c.id, c]));
  // coppie vicine per chi ha un daltonismo (protan, deutan o tritan): distanza OKLab simulata < 12 (vedi il test)
  const CLOSE = [
    ['red', 'brown'], ['red', 'green'], ['red', 'orange'], ['orange', 'green'], ['orange', 'pink'], ['blue', 'purple'],
    ['green', 'blue'], ['green', 'grey'], ['pink', 'grey'], ['purple', 'brown'],
  ];
  const closeSet = new Set(CLOSE.flatMap(([a, b]) => [a + '|' + b, b + '|' + a]));
  const isClose = (a, b) => closeSet.has(a + '|' + b);
  const SHAPES = ['heart', 'star', 'balloon', 'apple', 'flower', 'cloud', 'drop', 'mochi', 'fish', 'cat'];
  const LIVES = 3;
  const GRACE = 600;            // ms per ascoltare il nome: entro questo tempo la risposta vale il massimo

  /* ---------- curva di difficoltà ----------
   * k = colori diversi nel round · n = oggetti sullo schermo (n > k: qualche colore distrattore si ripete)
   * limit = ms per rispondere · rounds = round del livello · isNew = cartello "Nuovo!" con il suggerimento */
  const TABLE = [
    null,
    { k: 3, n: 3, limit: 7000, mode: 'shape', rounds: 8 },
    { k: 4, n: 4, limit: 6500, mode: 'shape', rounds: 8 },
    { k: 5, n: 5, limit: 6000, mode: 'shape', rounds: 10 },
    { k: 6, n: 7, limit: 5500, mode: 'shape', rounds: 10 },
    { k: 4, n: 4, limit: 6500, mode: 'same', rounds: 8, isNew: 'words' },
    { k: 6, n: 6, limit: 5500, mode: 'same', rounds: 10 },
    { k: 4, n: 4, limit: 7000, mode: 'stroop', rounds: 8, isNew: 'stroop' },
    { k: 7, n: 8, limit: 5000, mode: 'shape', rounds: 10 },
    { k: 5, n: 5, limit: 6500, mode: 'stroop', rounds: 10 },
    { k: 6, n: 7, limit: 6000, mode: 'mixed', rounds: 10, isNew: 'mixed' },
    { k: 8, n: 9, limit: 5000, mode: 'shape', rounds: 12 },
    { k: 7, n: 7, limit: 5500, mode: 'stroop', rounds: 12 },
    { k: 8, n: 9, limit: 5000, mode: 'mixed', rounds: 12 },
    { k: 9, n: 10, limit: 4500, mode: 'stroop', rounds: 12 },
  ];
  function config(level) {
    const L = Math.max(1, level | 0);
    if (L < TABLE.length) return Object.assign({ level: L }, TABLE[L]);
    const x = L - 14;
    const k = Math.min(IDS.length, 9 + Math.floor(x / 2));
    return {
      level: L, k, n: Math.min(12, k + 1), limit: Math.max(3000, 4500 - x * 150),
      mode: ['shape', 'stroop', 'mixed'][L % 3], rounds: 12,
    };
  }
  // colori fra cui scegliere: i primi P dell'ordine di introduzione (all'inizio i più facili da nominare)
  const poolFor = (k) => IDS.slice(0, Math.min(IDS.length, k <= 8 ? k + 3 : IDS.length));

  /* ---------- stato ---------- */
  function newGame(level, seed) {
    const c = config(level);
    return {
      v: 1, level: c.level, seed: seed >>> 0, rounds: c.rounds, i: 0, redo: 0, last: null,
      pts: 0, streak: 0, best: 0, mistakes: 0, timeouts: 0, hits: 0, fast: 0, moves: 0, errs: 0, tapped: [],
      won: false, lost: false,
    };
  }

  // seme del round: dipende da partita, numero del round e ripetizione (dopo una pausa il round si rigenera)
  const mix = (a, b) => { let h = Math.imul(a ^ (b + 0x9e3779b9), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
  function rngOf(s) { return HH.rng(mix(mix(s.seed, s.i + 1), s.redo + 7)); }
  const pick = (a, rnd) => a[(rnd() * a.length) | 0];
  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // k colori diversi dal pool; con pochi colori niente coppie che si confondono col daltonismo
  function chooseColors(k, rnd) {
    const pool = poolFor(k);
    const strict = k <= 5;
    for (let tries = 0; tries < 60; tries++) {
      const out = [];
      for (const id of shuffle(pool.slice(), rnd)) {
        if (out.length === k) break;
        if (strict && out.some((o) => isClose(o, id))) continue;
        out.push(id);
      }
      if (out.length === k) return out;
    }
    // ripiego deterministico (non serve in pratica: con k ≤ 5 un insieme valido c'è sempre)
    return ['red', 'yellow', 'blue', 'white', 'black', 'purple'].slice(0, k);
  }

  /* round corrente → { target, mode, limit, items: [{ ink, kind: 'shape' | 'word', shape?, word? }] }
   * Garanzie: un solo oggetto con l'inchiostro del bersaglio; in 'stroop' tutte le parole hanno inchiostro ≠ significato;
   * in 'stroop' e 'mixed' c'è un'esca (parola = bersaglio, inchiostro diverso); in 'same' parola = inchiostro. */
  function round(s) {
    const c = config(s.level), rnd = rngOf(s);
    const cols = chooseColors(c.k, rnd);
    let target = pick(cols, rnd);
    if (target === s.last && cols.length > 1) target = pick(cols.filter((x) => x !== target), rnd);
    const others = cols.filter((x) => x !== target);
    const n = c.mode === 'same' ? c.k : c.n;
    const inks = [target, ...others];
    while (inks.length < n) inks.push(pick(others, rnd));
    let items = inks.map((ink) => ({ ink }));
    const shapes = shuffle(SHAPES.slice(), rnd);
    const asShape = (it, j) => { it.kind = 'shape'; it.shape = shapes[j % shapes.length]; };
    const asSame = (it) => { it.kind = 'word'; it.word = it.ink; };
    const asStroop = (it, avoid) => { it.kind = 'word'; it.word = pick(cols.filter((w) => w !== it.ink && w !== avoid), rnd); };
    if (c.mode === 'shape') items.forEach(asShape);
    else if (c.mode === 'same') items.forEach(asSame);
    else if (c.mode === 'stroop') {
      // esca: un distrattore porta la parola del bersaglio; il bersaglio porta la parola di un altro colore
      items.forEach((it, j) => { if (j === 0) asStroop(it, target); else if (j === 1) { it.kind = 'word'; it.word = target; } else asStroop(it); });
    } else {
      // misto: bersaglio come parola (coerente o no), esca obbligatoria, gli altri a caso fra sagome e parole
      items.forEach((it, j) => {
        if (j === 0) { if (rnd() < 0.5) asSame(it); else asStroop(it, target); }
        else if (j === 1) { it.kind = 'word'; it.word = target; }
        else { const r = rnd(); if (r < 0.35) asShape(it, j); else if (r < 0.6) asSame(it); else asStroop(it); }
      });
    }
    // niente due oggetti identici (stesso inchiostro e stessa parola): il doppione cambia parola o diventa una sagoma
    const sig = (it) => it.ink + ':' + (it.kind === 'word' ? 'w' + it.word : 's' + it.shape);
    const seen = new Set();
    const freeShape = (it) => shapes.filter((k) => !seen.has(it.ink + ':s' + k));
    items.forEach((it, j) => {
      if (seen.has(sig(it)) && j > 1) {
        const free = cols.filter((w) => w !== it.ink && !seen.has(it.ink + ':w' + w));
        if (it.kind === 'word' && free.length && c.mode !== 'same') it.word = pick(free, rnd);
        else { delete it.word; it.kind = 'shape'; it.shape = pick(freeShape(it), rnd); }
      }
      seen.add(sig(it));
    });
    items = shuffle(items, rnd);
    return { target, mode: c.mode, limit: c.limit, colors: cols, items };
  }

  /* ---------- mosse ---------- */
  function points(ms, limit, streak, errs) {
    const span = Math.max(1, limit - GRACE);
    const speed = Math.max(0, Math.min(1, 1 - Math.max(0, ms - GRACE) / span));
    const base = (40 + Math.round(60 * speed)) >> Math.min(2, errs);
    return { pts: base + Math.min(10, streak) * 5, speed };
  }
  const isWon = (s) => !!s.won;
  const isLost = (s) => !!s.lost;
  const isOver = (s) => isWon(s) || isLost(s);
  function next(s, target) {
    s.i++; s.redo = 0; s.last = target; s.errs = 0; s.tapped = [];
    if (s.i >= s.rounds) s.won = true;
  }
  // tocco dell'oggetto idx dopo ms dall'inizio del round
  function answer(s, r, idx, ms) {
    const it = r.items[idx];
    if (isOver(s) || !it || s.tapped.includes(idx)) return { type: 'invalid' };
    s.moves++;
    if (it.ink === r.target) {
      s.streak++;
      s.best = Math.max(s.best, s.streak);
      const p = points(ms, r.limit, s.streak, s.errs);
      s.pts += p.pts; s.hits++; s.fast += p.speed;
      next(s, r.target);
      return { type: 'right', pts: p.pts, speed: p.speed, streak: s.streak, won: s.won };
    }
    s.tapped.push(idx);
    s.mistakes++; s.errs++; s.streak = 0;
    if (s.mistakes >= LIVES) s.lost = true;
    return { type: 'wrong', left: LIVES - s.mistakes, lost: s.lost, correct: r.items.findIndex((x) => x.ink === r.target) };
  }
  function timeout(s, r) {
    if (isOver(s)) return { type: 'invalid' };
    s.timeouts++; s.streak = 0;
    next(s, r.target);
    return { type: 'timeout', won: s.won, correct: r.items.findIndex((x) => x.ink === r.target) };
  }

  const progress = (s) => (s.won ? 1 : Math.min(1, s.i / s.rounds));
  const avgSpeed = (s) => (s.hits ? s.fast / s.hits : 0);
  // fragoline: 3 senza errori né tempi scaduti e con risposte svelte; 2 con al massimo un errore e due tempi scaduti
  function rate(s) {
    if (!s.mistakes && !s.timeouts && avgSpeed(s) >= 0.5) return 3;
    if (s.mistakes <= 1 && s.timeouts <= 2) return 2;
    return 1;
  }
  // secondi di riferimento: metà del tempo di ogni round + ~1,2 s di passaggio fra un round e l'altro
  function parTime(s) { const c = config(s.level); return Math.round(c.rounds * (c.limit / 2000 + 1.2)); }

  function validate(o) {
    if (!o || typeof o !== 'object' || o.v !== 1) return false;
    const num = (x) => typeof x === 'number' && isFinite(x) && x >= 0;
    if (!['level', 'seed', 'rounds', 'i', 'redo', 'pts', 'streak', 'best', 'mistakes', 'timeouts', 'hits', 'fast', 'moves', 'errs'].every((k) => num(o[k]))) return false;
    if (o.level < 1 || o.rounds !== config(o.level).rounds || o.i > o.rounds || !Array.isArray(o.tapped)) return false;
    if (o.last !== null && !BY[o.last]) return false;
    return true;
  }

  /* ---------- voce: scelta della voce di sistema migliore per la lingua dell'app ----------
   * Solo voci locali (localService !== false): le voci "online" del browser farebbero chiamate esterne.
   * langTags: lingue accettate per un codice dell'app (prima la principale). Bosniaco: anche croato e serbo (parole uguali);
   * norvegese: bokmål e nynorsk. Niente ripieghi su lingue diverse (un italiano letto da una voce inglese non serve). */
  const ALT = { no: ['no', 'nb', 'nn'], bs: ['bs', 'hr', 'sr'] };
  // regione preferita quando ce ne sono più d'una (zh-HK di solito è cantonese)
  const REGION = { zh: ['cn', 'sg', 'tw'], pt: ['pt', 'br'], en: ['gb', 'us'], es: ['es'], fr: ['fr'], de: ['de'], sr: ['rs'], ar: ['sa', 'eg'] };
  // voci "buffe" di Apple (cantano, sussurrano, robot): mai per dire un colore a un bambino
  const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;
  const langTags = (code) => ALT[code] || [code];
  const norm = (l) => String(l || '').replace(/_/g, '-').toLowerCase();
  function pickVoice(voices, code) {
    const tags = langTags(code);
    let best = null, bestScore = -Infinity;
    for (const v of voices || []) {
      if (!v || v.localService === false) continue;
      const [p, reg = ''] = norm(v.lang).split('-');
      const ti = tags.indexOf(p);
      if (ti < 0 || NOVELTY.test(v.name || '')) continue;
      let sc = 100 - ti * 30;
      const pref = REGION[p] || [];
      if (reg && pref.includes(reg)) sc += 20 - pref.indexOf(reg) * 5;
      if (p === 'zh' && reg === 'hk') sc -= 25;
      if (v.default) sc += 6;
      if (/enhanced|premium|neural|natural|siri/i.test(v.name || '')) sc += 8;
      if (/compact/i.test(v.name || '')) sc -= 4;
      if (sc > bestScore) { bestScore = sc; best = v; }
    }
    return best;
  }

  HH.colors = {
    COLORS, IDS, BY, CLOSE, SHAPES, LIVES, GRACE, TABLE, isClose, config, poolFor, chooseColors, newGame, round, points, answer, timeout,
    isWon, isLost, isOver, progress, avgSpeed, rate, parTime, validate, pickVoice, langTags,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
