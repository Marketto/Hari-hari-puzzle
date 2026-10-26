/* Hedgedoku — interfaccia (v3).
 * Regole verificate a ogni mossa: un riccio per riga, colonna e zona; mai due ricci nelle 8 caselle intorno.
 * Ogni riccio viene controllato subito contro l'unica soluzione:
 *   giusto    → resta (salto + suono)
 *   sbagliato → riccio triste, si illuminano i ricci con cui è in conflitto, perdi un cuore;
 *               poi sparisce e lascia una ✕. Al 3° errore si ricomincia il livello.
 * Dal livello 6 (griglie 7×7 e 8×8) c'è un riccio d'aiuto fisso.
 * Modalità:  Riccio  tocco = metti/togli riccio
 *            Segna   tocco = metti/togli ✕ · trascina = tante ✕ · pressione lunga = riccio
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const LIVES = 3;
  const sizeFor = (level) => (level <= 2 ? 5 : level <= 5 ? 6 : level <= 9 ? 7 : 8);
  const minTechFor = (level) => (level >= 12 ? 4 : level >= 4 ? 2 : 0);
  const givensFor = (level) => (level >= 6 ? 1 : 0);

  const art = () => {
    const regs = [[0, 0, 1], [2, 0, 1], [2, 3, 3]];
    const rects = regs.map((row, r) => row.map((reg, c) =>
      `<rect x="${18 + c * 28}" y="${3 + r * 28}" width="27" height="27" rx="6" fill="var(--r${reg})"/>`).join('')).join('');
    const h = (x, y) => HH.mascot.mini().replace('<svg class="mini-hari"', `<svg x="${x}" y="${y}" width="27" height="27"`);
    const x = (cx, cy) => `<path d="M${cx - 4} ${cy - 4}l8 8M${cx + 4} ${cy - 4}l-8 8" stroke="var(--wall)" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>`;
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="16" y="1" width="88" height="88" rx="9" fill="var(--wall)"/>${rects}${h(18, 3)}${h(74, 31)}${x(59, 17)}${x(31, 73)}</svg>`;
  };

  // riccio triste per gli errori
  const sadMini = () => HH.mascot.mini()
    .replace('class="mini-hari"', 'class="mini-hari sad"')
    .replace(/<path d="M45\.5 75\.5[^"]*"/, '<path d="M45 78q5 -4 10 0"');

  function create(el, ctx, saved) {
    const H = HH.hedgedoku;
    const t = HH.i18n.t;
    let s;                       // { n, regions, solution, given, board, hist, moves, mistakes }
    let mode = HH.store.get('hd:mode', 'place');
    let grid, cells = [], countEl, winTimer = 0, busy = false;

    function fresh() {
      const n = sizeFor(ctx.level);
      const p = H.generate(n, Math.random, { minTech: minTechFor(ctx.level) });
      const rows = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, givensFor(ctx.level));
      const given = rows.map((r) => r * n + p.solution[r]);
      s = { n, regions: p.regions, solution: p.solution, given, board: new Array(n * n).fill(0), hist: [], moves: 0, mistakes: 0 };
      given.forEach((i) => { s.board[i] = 2; });
      build();
      ctx.changed({ reset: true });
    }

    /* ---------- DOM ---------- */
    function build() {
      const { n, regions: reg } = s;
      clearTimeout(winTimer);
      busy = false;
      const html = [];
      for (let i = 0; i < n * n; i++) {
        const r = (i / n) | 0, c = i % n;
        const edge = (rr, cc) => (rr < 0 || cc < 0 || rr >= n || cc >= n ? 'var(--b-none)'
          : reg[rr * n + cc] !== reg[i] ? 'var(--b-wall)' : 'var(--b-hair)');
        const st = `--r:var(--r${reg[i] % 8});--bt:${edge(r - 1, c)};--bb:${edge(r + 1, c)};--bl:${edge(r, c - 1)};--br:${edge(r, c + 1)};--d:${(r + c) * 55}ms`;
        html.push(`<button class="hd-cell${s.given.includes(i) ? ' given' : ''}" style="${st}" data-i="${i}" data-v="0" aria-label="${r + 1},${c + 1}"></button>`);
      }
      el.innerHTML = `<div class="hd-wrap">
        <div class="hd-modes" role="radiogroup">
          <button class="hd-mode" data-mode="mark" role="radio"><span class="hd-x" aria-hidden="true"></span><span>${t('mark')}</span></button>
          <button class="hd-mode" data-mode="place" role="radio">${HH.mascot.mini()}<span>${t('place')}</span></button>
        </div>
        <div class="hd-grid" dir="ltr" style="--n:${n}">${html.join('')}</div>
        <div class="hd-foot">
          <div class="hd-count" aria-live="polite">${HH.mascot.mini()}<b></b><span>/ ${n}</span></div>
          <p class="hd-lives-hint">${t('livesHint')}</p>
        </div>
      </div>`;
      grid = el.querySelector('.hd-grid');
      cells = [...grid.children];
      countEl = el.querySelector('.hd-count b');
      setMode(mode);
      paint();
    }

    function setMode(m) {
      mode = m;
      HH.store.set('hd:mode', m);
      el.querySelectorAll('.hd-mode').forEach((b) => {
        const on = b.dataset.mode === m;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on);
      });
    }

    // aggiorna solo le celle cambiate; "pop" = riccio appena messo
    function paint(pop = -1) {
      let placed = 0;
      cells.forEach((b, i) => {
        const v = s.board[i];
        if (v === 2) placed++;
        if (+b.dataset.v !== v) {
          b.dataset.v = v;
          b.innerHTML = v === 2 ? HH.mascot.mini() : v === 1 ? '<span class="hd-x" aria-hidden="true"></span>' : '';
        }
        b.classList.toggle('has', v === 2);
        b.classList.toggle('pop', i === pop);
      });
      countEl.textContent = placed;
      const solved = H.check(s.n, s.regions, s.board).solved;
      grid.classList.toggle('solved', solved);
      if (solved) { clearTimeout(winTimer); winTimer = setTimeout(ctx.win, 950); }
    }

    /* ---------- mosse ---------- */
    function pushHist() {
      s.hist.push({ board: s.board.slice() });
      if (s.hist.length > 80) s.hist.shift();
    }

    function tryPlace(i) {
      if (busy || s.board[i] === 2) return;
      const j = H.judge(s.n, s.regions, s.solution, s.board, i);
      s.moves++;
      if (j.correct) {
        pushHist();
        s.board[i] = 2;
        paint(i);
        ctx.sfx.place();
        ctx.changed();
        return;
      }
      // errore: riccio triste, evidenzia chi lo blocca, cuore perso
      busy = true;
      s.mistakes++;
      const b = cells[i];
      b.dataset.v = -1;
      b.innerHTML = sadMini();
      b.classList.add('wrong');
      j.blockers.forEach((k) => cells[k].classList.add('blame'));
      ctx.mistake(LIVES - s.mistakes);
      ctx.changed();
      setTimeout(() => {
        b.classList.remove('wrong');
        j.blockers.forEach((k) => cells[k].classList.remove('blame'));
        busy = false;
        if (s.mistakes >= LIVES) return;          // l'app mostra "cuori finiti" e fa ricominciare
        pushHist();
        s.board[i] = 1;                            // al posto dell'errore resta una ✕
        paint();
        ctx.changed();
      }, 1100);
    }

    function removeHog(i) {
      if (s.given.includes(i)) { cells[i].classList.remove('locked'); void cells[i].offsetWidth; cells[i].classList.add('locked'); ctx.sfx.bad(); return; }
      pushHist();
      s.board[i] = 0;
      s.moves++;
      paint();
      ctx.sfx.mark();
      ctx.changed();
    }

    function toggleMark(i) {
      if (s.board[i] === 2) return;
      pushHist();
      s.board[i] = s.board[i] === 1 ? 0 : 1;
      s.moves++;
      paint();
      ctx.sfx.mark();
      ctx.changed();
    }

    function tap(i) {
      if (busy) return;
      if (mode === 'place') { if (s.board[i] === 2) removeHog(i); else tryPlace(i); }
      else toggleMark(i);
    }

    /* ---------- input ---------- */
    let stroke = null;
    const cellAt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const b = e && e.closest && e.closest('.hd-cell');
      return b && grid.contains(b) ? +b.dataset.i : -1;
    };

    el.addEventListener('click', (e) => {
      const m = e.target.closest('.hd-mode');
      if (m) { setMode(m.dataset.mode); ctx.sfx.mark(); return; }
      const b = e.target.closest('.hd-cell');
      if (b && e.detail === 0) tap(+b.dataset.i);       // tastiera
    });

    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.hd-cell');
      if (!b || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const i = +b.dataset.i;
      stroke = { start: i, moved: false, long: false, before: s.board.slice(), seen: new Set([i]), paint: s.board[i] === 1 ? 0 : 1 };
      if (mode === 'mark') {
        stroke.timer = setTimeout(() => {
          if (!stroke || stroke.moved) return;
          stroke.long = true;
          if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) { /* niente vibrazione */ }
          if (s.board[i] === 2) removeHog(i); else tryPlace(i);
        }, 420);
      }
      try { grid.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });

    el.addEventListener('pointermove', (e) => {
      if (!stroke || mode !== 'mark' || stroke.long) return;
      const j = cellAt(e.clientX, e.clientY);
      if (j < 0 || stroke.seen.has(j)) return;
      if (!stroke.moved) {
        stroke.moved = true;
        clearTimeout(stroke.timer);
        if (s.board[stroke.start] !== 2) s.board[stroke.start] = stroke.paint;
      }
      stroke.seen.add(j);
      if (s.board[j] !== 2) s.board[j] = stroke.paint;
      paint();
    });

    function end() {
      if (!stroke) return;
      const st = stroke;
      stroke = null;
      clearTimeout(st.timer);
      if (st.long) return;
      if (st.moved) {
        if (st.before.some((v, i) => v !== s.board[i])) {
          s.hist.push({ board: st.before });
          if (s.hist.length > 80) s.hist.shift();
          s.moves++;
          ctx.sfx.mark();
          ctx.changed();
        }
      } else tap(st.start);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    /* ---------- avvio ---------- */
    function restart() {
      clearTimeout(winTimer);
      s.board = new Array(s.n * s.n).fill(0);
      s.given.forEach((i) => { s.board[i] = 2; });
      s.hist = []; s.moves = 0; s.mistakes = 0;
      build();
      ctx.changed({ reset: true });
    }

    const ok = saved && saved.n && H.validate(saved.n, saved.regions) && Array.isArray(saved.board) && saved.board.length === saved.n * saved.n;
    if (ok) {
      s = Object.assign({ hist: [], moves: 0, mistakes: 0, given: [] }, saved);
      if (!Array.isArray(s.solution)) s.solution = H.findSolutions(s.n, s.regions, 1)[0];
      // vecchi salvataggi: tieni solo i ricci giusti; cronologia nel nuovo formato
      s.board = s.board.map((v, i) => (v === 2 && s.solution[(i / s.n) | 0] !== i % s.n ? 1 : v));
      s.hist = s.hist.map((h) => (Array.isArray(h) ? { board: h } : h));
      if (s.mistakes >= LIVES) { s.mistakes = 0; s.board = s.board.map((v, i) => (s.given.includes(i) ? 2 : 0)); s.hist = []; }
      build();
    } else fresh();

    return {
      fresh,
      restart,
      undo() {
        if (busy || !s.hist.length) return;
        s.board = s.hist.pop().board;
        s.moves = Math.max(0, s.moves - 1);
        paint(); ctx.sfx.mark(); ctx.changed();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'hedgedoku', name: 'Hedgedoku', rules: 'r1', art, create, lives: LIVES,
    rate: (s) => Math.max(1, 3 - (s.mistakes || 0)),
    parTime: (s) => s.n * s.n * 2,
    progress: (s) => {
      const placed = s.board.filter((v) => v === 2).length - s.given.length;
      return Math.max(0, Math.min(1, placed / Math.max(1, s.n - s.given.length)));
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
