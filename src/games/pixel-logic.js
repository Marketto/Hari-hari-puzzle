/* Pixel Mochi — logica pura (nessun DOM). Nonogram / picross.
 * Regole: ogni riga e colonna ha degli indizi = lunghezze dei blocchi di celle piene, in ordine,
 *   separati da almeno una cella vuota. Risolvendo appare un disegno kawaii.
 *
 * "Generatore": i disegni sono fatti a mano (PICS). Ogni disegno è verificato risolvibile con la sola
 *   logica riga/colonna (lineSolve arriva alla griglia completa senza tentativi → soluzione unica).
 *   generate(level, rnd) sceglie la taglia dal livello, un disegno del gruppo (evitando l'ultimo)
 *   e a caso lo specchia in orizzontale (gli indizi si invertono: unicità e logica restano intatte).
 *
 * Disegni: una stringa per riga. '.' = vuota, '@' = vuota nel puzzle ma alla vittoria diventa un occhio,
 *   ogni lettera = cella piena col colore della tavolozza (token CSS --pm-c-<lettera>, vedi pixel.css):
 *   r rosso · R rosso scuro · p rosa · P rosa forte · o arancio · y giallo · Y oro · g verde · G verde scuro
 *   t menta · b azzurro · B blu · l lilla · L viola · n marrone · N cacao · w crema · k inchiostro · e grigio · s pesca
 *
 * Esporta HH.pixel = { PICS, COLORS, SIZES, sizeFor, poolFor, generate, build, clues, lineSolve, solveLine,
 *                      judge, lineDone, isSolved, filledCount, validate }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const COLORS = 'rRpPoyYgGtbBlLnNwkes';

  // [id, nome inglese (fallback i18n: chiave pm_n_<id>), righe]
  const PICS = [
    /* ---------- 5×5 ---------- */
    ['heart', 'Heart', [
      '.r.r.',
      'rrrrr',
      'rrrrr',
      '.rrr.',
      '..r..']],
    ['mushroom', 'Mushroom', [
      '.rrr.',
      'rwrwr',
      'rrrrr',
      '.www.',
      '.www.']],
    ['onigiri', 'Onigiri', [
      '..w..',
      '.www.',
      'wwwww',
      'wkkkw',
      'wkkkw']],
    ['mochi', 'Mochi', [
      '.www.',
      'wwwww',
      'w@w@w',
      'wpwpw',
      '.www.']],
    ['strawberry', 'Strawberry', [
      '.ggg.',
      'rrgrr',
      'ryrrr',
      '.rry.',
      '..r..']],
    ['tulip', 'Tulip', [
      'p.p.p',
      'ppppp',
      '.ppp.',
      'g.g.g',
      '.ggg.']],
    ['kitty', 'Kitty', [
      'o...o',
      'ooooo',
      'o@o@o',
      'ooooo',
      '.ooo.']],
    ['star', 'Star', [
      '..y..',
      'yyyyy',
      '.yyy.',
      '.y.y.',
      'y...y']],
    ['ghost', 'Ghost', [
      '.lll.',
      'l@l@l',
      'lllll',
      'lllll',
      'l.l.l']],
    ['apple', 'Apple', [
      '..ng.',
      '.rrr.',
      'rrrrr',
      'rrrrr',
      '.r.r.']],
    ['sprout', 'Sprout', [
      'gg.gg',
      '.ggg.',
      '..g..',
      '.nnn.',
      '.nnn.']],

    /* ---------- 7×7 ---------- */
    ['teacup', 'Cup of tea', [
      '..e.e..',
      '.e.e...',
      'bbbbbbb',
      'bbbbb.b',
      'bbbbbbb',
      '.bbb...',
      'wwwww..']],
    ['bunny', 'Bunny', [
      '.w...w.',
      '.p...p.',
      '.wwwww.',
      'ww@w@ww',
      'wpwwwpw',
      'wwwkwww',
      '.wwwww.']],
    ['frog', 'Frog', [
      '.gg.gg.',
      'g@ggg@g',
      'ggggggg',
      'gpgggpg',
      'gkkkkkg',
      '.ggggg.',
      'gg...gg']],
    ['icecream', 'Ice cream', [
      '..ppp..',
      '.ppppp.',
      'ppppppp',
      'ooooooo',
      '.ooooo.',
      '..ooo..',
      '...o...']],
    ['chick', 'Chick', [
      '..yyy..',
      '.yyyyy.',
      '.y@y@y.',
      '.yyoyy.',
      'yyyyyyy',
      '.yyyyy.',
      '..o.o..']],
    ['panda', 'Panda', [
      'kk...kk',
      'kwwwwwk',
      'wk@w@kw',
      'wkkwkkw',
      'wwwkwww',
      '.wwwww.',
      '..www..']],
    ['sun', 'Sun', [
      '...y...',
      '.yoooy.',
      '.o@o@o.',
      'yoooooy',
      '.opopo.',
      '.yoooy.',
      '...y...']],
    ['bear', 'Bear', [
      'nn...nn',
      'nnnnnnn',
      'n@nnn@n',
      'nnwwwnn',
      'nnwkwnn',
      '.nnnnn.',
      '..nnn..']],
    ['octopus', 'Octopus', [
      '..ppp..',
      '.ppppp.',
      'pp@p@pp',
      'ppppppp',
      '.ppppp.',
      'p.p.p.p',
      'p.p.p.p']],
    ['flower', 'Flower', [
      '.pp.pp.',
      'ppppppp',
      '.ppypp.',
      'ppppppp',
      '.pp.pp.',
      '...g.gg',
      '..ggg..']],

    /* ---------- 8×8 ---------- */
    ['bigberry', 'Big strawberry', [
      '..g..g..',
      '...gg...',
      '.rrggrr.',
      'rryrrryr',
      'rrrrrrrr',
      '.ryrryr.',
      '..rrrr..',
      '...rr...']],
    ['cat', 'Cat', [
      'o......o',
      'oo....oo',
      'oooooooo',
      'o@oooo@o',
      'oooppooo',
      'opoooopo',
      'oooooooo',
      '.oo..oo.']],
    ['riceball', 'Rice ball', [
      '...ww...',
      '..wwww..',
      '.w@ww@w.',
      '.wwwwww.',
      'wwwwwwww',
      'wwkkkkww',
      'wwkkkkww',
      '.wkkkkw.']],
    ['moon', 'Moon', [
      '..yyy...',
      '.yy.....',
      'yy....y.',
      'yy......',
      'yy..y...',
      'yyy...yy',
      '.yyyyyy.',
      '..yyyy..']],
    ['boba', 'Bubble tea', [
      '.....k..',
      '....k...',
      'bbbbkbbb',
      '.pppkpp.',
      '.pppppp.',
      '.p@pp@p.',
      '.pNpNNp.',
      '..pppp..']],
    ['penguin', 'Penguin', [
      '..kkkk..',
      '.kkkkkk.',
      'kk@kk@kk',
      'kkwoowkk',
      'kwwwwwwk',
      'kwwwwwwk',
      '.kwwwwk.',
      '.oo..oo.']],
    ['cupcake', 'Cupcake', [
      '...r....',
      '..pppp..',
      '.pppppp.',
      'pppppppp',
      'nnnnnnnn',
      '.n@nn@n.',
      '.nnnnnn.',
      '..nnnn..']],
    ['sakura', 'Sakura', [
      '...pp...',
      '.pp..pp.',
      '.pppppp.',
      'ppPyyPpp',
      'ppPyyPpp',
      '.pppppp.',
      '.pp..pp.',
      '...pp...']],
    ['mug', 'Cocoa mug', [
      '.e..e...',
      '..e..e..',
      'wwwwww..',
      'nnnnnnww',
      'n@nn@n.w',
      'nnppnnww',
      'nnnnnn..',
      '.nnnn...']],
    ['clover', 'Clover', [
      '.gg..gg.',
      'gggggggg',
      'gggggggg',
      '.gggggg.',
      '.gggggg.',
      'gggggggg',
      'ggg..ggg',
      '...gg...']],

    /* ---------- 10×10 ---------- */
    ['hari', 'Hari', [
      '.n.n.n....',
      'nnnnnnn...',
      'nnnnnnnn..',
      'nnnnnnsss.',
      'nnnnns@sss',
      'nnnnnssssk',
      'nnnnnspss.',
      '.nnnnssss.',
      '..ssssss..',
      '..ss..ss..']],
    ['kitten', 'Kitten', [
      'e........e',
      'ee......ee',
      'eeeeeeeeee',
      'eeeeeeeeee',
      'e@@eeee@@e',
      'eeeeppeeee',
      'eppeeeeppe',
      'eeeepkeeee',
      '.eeeeeeee.',
      '..eeeeee..']],
    ['milk', 'Strawberry milk', [
      '...wwww...',
      '..wwwwww..',
      '.wwwwwwww.',
      '.pppppppp.',
      '.pprpprpp.',
      '.pp@pp@pp.',
      '.pppkkppp.',
      '.pppppppp.',
      '.pppppppp.',
      '.pppppppp.']],
    ['dango', 'Dango', [
      '....nn....',
      '...pppp...',
      '..pppppp..',
      '...pppp...',
      '...wwww...',
      '..wwwwww..',
      '...wwww...',
      '...gggg...',
      '..gggggg..',
      '....nn....']],
    ['whale', 'Whale', [
      '..t.t.....',
      '...t......',
      '..bbbbb...',
      '.bbbbbbb..',
      'bb@bbbbbb.',
      'bbbbbbbbbb',
      'bwwwwbbbbb',
      '.wwwwwbbb.',
      '..wwwbb...',
      '.......bb.']],
    ['teapot', 'Teapot', [
      '....nn....',
      '...tttt...',
      '..tttttt..',
      't.tttttt.t',
      'tttttttttt',
      't.t@tt@t.t',
      '..tttttt..',
      '..tppttppt',
      '...tttttt.',
      '....tttt..']],
    ['rainbow', 'Rainbow', [
      '...rrrr...',
      '..roooor..',
      '.royyyyor.',
      'roygggyor.',
      'roy...gyor',
      'roy....yor',
      'ww......ww',
      'www....www',
      '.ww....ww.',
      '..........']],
    ['lantern', 'Lantern', [
      '....kk....',
      '...kkkk...',
      '..rrrrrr..',
      '.rrrrrrrr.',
      '.rr@rr@rr.',
      '.rrrPPrrr.',
      '.rrrrrrrr.',
      '..rrrrrr..',
      '...kkkk...',
      '....yy....']],
    ['bigocto', 'Big octopus', [
      '...pppp...',
      '..pppppp..',
      '.pppppppp.',
      '.pp@pp@pp.',
      '.pPPppPPp.',
      '.pppppppp.',
      '..pppppp..',
      '.pp.pp.pp.',
      'pp.pp.pp.p',
      'p..p..p...']],
    ['bunnyface', 'Bunny face', [
      '.ww....ww.',
      '.wp....pw.',
      '.wp....pw.',
      '.ww....ww.',
      '.wwwwwwww.',
      'wwwwwwwwww',
      'ww@wwww@ww',
      'wpwwkkwwpw',
      'wwwwwwwwww',
      '.wwwwwwww.']],
    ['ramen', 'Ramen', [
      '...e..e...',
      '..e..e....',
      '...e..e...',
      'yyyyyyyyyy',
      'bbbbbbbbbb',
      'bb@bbbb@bb',
      'bbbbppbbbb',
      '.bbbbbbbb.',
      '..bbbbbb..',
      '...bbbb...']],
    ['sakuratree', 'Sakura tree', [
      '...pppp...',
      '.pppppppp.',
      'pppPppPppp',
      'pppppppppp',
      '.pPpppppP.',
      '..pppppp..',
      '....nn....',
      '....nn....',
      '...nnnn...',
      'gggggggggg']],
  ];

  const SIZES = [5, 7, 8, 10];
  // curva: 3 livelli 5×5, 4 livelli 7×7, 5 livelli 8×8, poi 10×10
  const sizeFor = (level) => (level <= 3 ? 5 : level <= 7 ? 7 : level <= 12 ? 8 : 10);
  const poolFor = (n) => PICS.filter((p) => p[2].length === n);

  /* ---------- indizi ---------- */
  function runs(line) {
    const out = [];
    let k = 0;
    for (const v of line) {
      if (v) k++;
      else if (k) { out.push(k); k = 0; }
    }
    if (k) out.push(k);
    return out;
  }
  function clues(sol, w, h) {
    const rows = [], cols = [];
    for (let r = 0; r < h; r++) rows.push(runs(sol.slice(r * w, r * w + w)));
    for (let c = 0; c < w; c++) {
      const col = [];
      for (let r = 0; r < h; r++) col.push(sol[r * w + c]);
      cols.push(runs(col));
    }
    return { rows, cols };
  }

  /* ---------- risolutore di linea (programmazione dinamica) ----------
   * cells: -1 ignota, 0 vuota, 1 piena. Ritorna l'intersezione di tutte le sistemazioni compatibili
   * (array con -1 dove resta incerto) oppure null se la linea è impossibile. O(L · k). */
  function solveLine(clue, cells) {
    const L = cells.length, k = clue.length, M = L + 1;   // cella fittizia vuota in fondo
    const at = (i) => (i < L ? cells[i] : 0);
    const canE = (i) => at(i) !== 1;
    // pieni[i] = numero di celle "non vuote obbligate" in [0,i) → test rapido "posso riempire [a,b)"
    const blk = new Int32Array(M + 1);
    for (let i = 0; i < M; i++) blk[i + 1] = blk[i] + (at(i) === 0 ? 1 : 0);
    const canF = (a, b) => b <= L && blk[b] - blk[a] === 0;
    // P[j][i]: celle [0,i) spiegate dai primi j blocchi, con i = inizio libero
    const P = [], S = [];
    for (let j = 0; j <= k; j++) { P.push(new Uint8Array(M + 2)); S.push(new Uint8Array(M + 2)); }
    P[0][0] = 1;
    for (let i = 0; i < M; i++) {
      for (let j = 0; j <= k; j++) {
        if (!P[j][i]) continue;
        if (canE(i)) P[j][i + 1] = 1;
        if (j < k) {
          const e = i + clue[j];
          if (e < M && canF(i, e) && canE(e)) P[j + 1][e + 1] = 1;
        }
      }
    }
    if (!P[k][M]) return null;
    // S[j][i]: celle [i,M) spiegate dai blocchi j..k-1
    S[k][M] = 1;
    for (let i = M - 1; i >= 0; i--) {
      for (let j = k; j >= 0; j--) {
        let ok = canE(i) && S[j][i + 1];
        if (!ok && j < k) {
          const e = i + clue[j];
          ok = e < M && canF(i, e) && canE(e) && S[j + 1][e + 1];
        }
        if (ok) S[j][i] = 1;
      }
    }
    const fillD = new Int32Array(M + 1), empty = new Uint8Array(M);
    for (let i = 0; i < M; i++) {
      for (let j = 0; j <= k; j++) {
        if (!P[j][i]) continue;
        if (canE(i) && S[j][i + 1]) empty[i] = 1;
        if (j < k) {
          const e = i + clue[j];
          if (e < M && canF(i, e) && canE(e) && S[j + 1][e + 1]) { fillD[i]++; fillD[e]--; empty[e] = 1; }
        }
      }
    }
    const out = new Array(L);
    let run = 0;
    for (let i = 0; i < L; i++) {
      run += fillD[i];
      const f = run > 0, e = !!empty[i];
      out[i] = f && e ? -1 : f ? 1 : 0;
    }
    return out;
  }

  /* Propagazione riga/colonna fino al punto fisso. Ritorna { grid, solved, contradiction, steps, sweeps }:
   * steps = linee che hanno prodotto almeno una deduzione (misura di difficoltà). */
  function lineSolve(rows, cols, w, h, start) {
    const g = start ? start.slice() : new Array(w * h).fill(-1);
    const dirtyR = new Array(h).fill(true), dirtyC = new Array(w).fill(true);
    let steps = 0, sweeps = 0, changed = true;
    while (changed) {
      changed = false; sweeps++;
      for (let r = 0; r < h; r++) {
        if (!dirtyR[r]) continue;
        dirtyR[r] = false;
        const line = g.slice(r * w, r * w + w);
        const res = solveLine(rows[r], line);
        if (!res) return { grid: g, solved: false, contradiction: true, steps, sweeps };
        let any = false;
        for (let c = 0; c < w; c++) if (line[c] === -1 && res[c] !== -1) { g[r * w + c] = res[c]; dirtyC[c] = true; any = true; }
        if (any) { steps++; changed = true; }
      }
      for (let c = 0; c < w; c++) {
        if (!dirtyC[c]) continue;
        dirtyC[c] = false;
        const line = [];
        for (let r = 0; r < h; r++) line.push(g[r * w + c]);
        const res = solveLine(cols[c], line);
        if (!res) return { grid: g, solved: false, contradiction: true, steps, sweeps };
        let any = false;
        for (let r = 0; r < h; r++) if (line[r] === -1 && res[r] !== -1) { g[r * w + c] = res[r]; dirtyR[r] = true; any = true; }
        if (any) { steps++; changed = true; }
      }
    }
    return { grid: g, solved: g.every((v) => v !== -1), contradiction: false, steps, sweeps };
  }

  /* ---------- puzzle ---------- */
  // da un disegno (eventualmente specchiato) all'oggetto puzzle serializzabile
  function build(id, mirror) {
    const p = PICS.find((x) => x[0] === id);
    if (!p) return null;
    const art = p[2].map((row) => (mirror ? [...row].reverse().join('') : row));
    const h = art.length, w = art[0].length;
    const paint = art.join('');
    const sol = [...paint].map((ch) => (ch === '.' || ch === '@' ? 0 : 1));
    const { rows, cols } = clues(sol, w, h);
    return { id, mirror: !!mirror, w, h, paint, sol, rows, cols };
  }

  const solvable = (pz) => {
    const r = lineSolve(pz.rows, pz.cols, pz.w, pz.h);
    return r.solved && r.grid.every((v, i) => v === pz.sol[i]);
  };

  /* generate(level, rnd, { avoid }) — avoid: id (o lista di id) da non ripetere.
   * Livello 1: sempre il cuore (il più facile). */
  function generate(level, rnd = Math.random, opts = {}) {
    const n = sizeFor(level);
    const avoid = [].concat(opts.avoid || []);
    let pool = poolFor(n).map((p) => p[0]);
    if (level <= 1) pool = ['heart'];
    let cand = pool.filter((id) => !avoid.includes(id));
    if (!cand.length) cand = pool;
    // ordine casuale; il primo disegno risolvibile per logica vince (tutti lo sono: verificato nei test)
    for (let i = cand.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cand[i], cand[j]] = [cand[j], cand[i]];
    }
    const mirror = level > 1 && rnd() < 0.5;
    for (const id of cand) {
      const pz = build(id, mirror);
      if (solvable(pz)) return pz;
    }
    return build('heart', false);
  }

  /* ---------- mosse ----------
   * board: 0 ignota, 1 piena, 2 ✕. Una mossa è giusta se rispetta l'unica soluzione. */
  function judge(pz, i, val) {
    return val === 1 ? pz.sol[i] === 1 : pz.sol[i] === 0;
  }
  // indizio "spento": tutte le celle piene della soluzione nella linea sono piene sulla tavola
  function lineDone(pz, board, kind, k) {
    const { w, h, sol } = pz;
    const len = kind === 'r' ? w : h;
    for (let t = 0; t < len; t++) {
      const i = kind === 'r' ? k * w + t : t * w + k;
      if (sol[i] === 1 && board[i] !== 1) return false;
    }
    return true;
  }
  const filledCount = (pz, board) => board.reduce((a, v, i) => a + (v === 1 && pz.sol[i] === 1 ? 1 : 0), 0);
  const isSolved = (pz, board) => pz.sol.every((v, i) => v !== 1 || board[i] === 1);

  // salvataggio coerente: il disegno esiste e la tavola ha la taglia giusta
  function validate(s) {
    if (!s || typeof s.id !== 'string' || !Array.isArray(s.board)) return false;
    const pz = build(s.id, s.mirror);
    return !!pz && s.board.length === pz.w * pz.h && s.board.every((v) => v === 0 || v === 1 || v === 2);
  }

  HH.pixel = { PICS, COLORS, SIZES, sizeFor, poolFor, generate, build, clues, runs, lineSolve, solveLine, judge, lineDone, isSolved, filledCount, validate };
})(typeof globalThis !== 'undefined' ? globalThis : window);
