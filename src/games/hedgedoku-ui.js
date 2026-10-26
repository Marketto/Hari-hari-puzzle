/* Hedgedoku — interfaccia.
 * Due modalità:  Riccio  tocco = metti/togli riccio
 *                Segna   tocco = metti/togli ✕ · trascina = tante ✕ (o le cancella se parti da una ✕)
 *                        pressione lunga = riccio
 * Aggiornamento incrementale delle celle: si anima solo la casella cambiata.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const sizeFor = (level) => (level <= 2 ? 5 : level <= 5 ? 6 : level <= 9 ? 7 : 8);
  const minTechFor = (level) => (level >= 12 ? 4 : level >= 4 ? 2 : 0);

  const art = () => {
    const regs = [[0, 0, 1], [2, 0, 1], [2, 3, 3]];
    const rects = regs.map((row, r) => row.map((reg, c) =>
      `<rect x="${18 + c * 28}" y="${3 + r * 28}" width="27" height="27" rx="6" fill="var(--r${reg})"/>`).join('')).join('');
    const h = (x, y) => HH.mascot.mini().replace('<svg class="mini-hari"', `<svg x="${x}" y="${y}" width="27" height="27"`);
    const x = (cx, cy) => `<path d="M${cx - 4} ${cy - 4}l8 8M${cx + 4} ${cy - 4}l-8 8" stroke="var(--wall)" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>`;
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="16" y="1" width="88" height="88" rx="9" fill="var(--wall)"/>${rects}${h(18, 3)}${h(74, 31)}${x(59, 17)}${x(31, 73)}</svg>`;
  };

  function create(el, ctx, saved) {
    const H = HH.hedgedoku;
    const t = HH.i18n.t;
    let s;                       // { n, regions, board, hist, moves }
    let mode = HH.store.get('hd:mode', 'place');
    let grid, cells = [], countEl, winTimer = 0;

    function fresh() {
      const n = sizeFor(ctx.level);
      const p = H.generate(n, Math.random, { minTech: minTechFor(ctx.level) });
      s = { n, regions: p.regions, board: new Array(n * n).fill(0), hist: [], moves: 0 };
      build();
      ctx.changed({ reset: true });
    }

    /* ---------- DOM ---------- */
    function build() {
      const { n, regions: reg } = s;
      clearTimeout(winTimer);
      const html = [];
      for (let i = 0; i < n * n; i++) {
        const r = (i / n) | 0, c = i % n;
        const edge = (rr, cc) => (rr < 0 || cc < 0 || rr >= n || cc >= n ? 'var(--b-none)'
          : reg[rr * n + cc] !== reg[i] ? 'var(--b-wall)' : 'var(--b-hair)');
        const st = `--r:var(--r${reg[i] % 8});--bt:${edge(r - 1, c)};--bb:${edge(r + 1, c)};--bl:${edge(r, c - 1)};--br:${edge(r, c + 1)};--d:${(r + c) * 55}ms`;
        html.push(`<button class="hd-cell" style="${st}" data-i="${i}" data-v="0" aria-label="${r + 1},${c + 1}"></button>`);
      }
      el.innerHTML = `<div class="hd-wrap">
        <div class="hd-modes" role="radiogroup">
          <button class="hd-mode" data-mode="mark" role="radio"><span class="hd-x" aria-hidden="true"></span><span>${t('mark')}</span></button>
          <button class="hd-mode" data-mode="place" role="radio">${HH.mascot.mini()}<span>${t('place')}</span></button>
        </div>
        <div class="hd-grid" dir="ltr" style="--n:${n}">${html.join('')}</div>
        <div class="hd-count" aria-live="polite">${HH.mascot.mini()}<b></b><span>/ ${n}</span></div>
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

    // Aggiorna solo ciò che è cambiato; "pop" = cella del riccio appena messo
    function paint(pop = -1) {
      const res = H.check(s.n, s.regions, s.board);
      cells.forEach((b, i) => {
        const v = s.board[i];
        if (+b.dataset.v !== v) {
          b.dataset.v = v;
          b.innerHTML = v === 2 ? HH.mascot.mini() : v === 1 ? '<span class="hd-x" aria-hidden="true"></span>' : '';
        }
        b.classList.toggle('has', v === 2);
        b.classList.toggle('bad', res.conflicts.has(i));
        b.classList.toggle('pop', i === pop);
      });
      countEl.textContent = res.placed;
      grid.classList.toggle('solved', res.solved);
      if (res.solved) { clearTimeout(winTimer); winTimer = setTimeout(ctx.win, 950); }
      return res;
    }

    /* ---------- input ---------- */
    let stroke = null;
    const cellAt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const b = e && e.closest && e.closest('.hd-cell');
      return b && grid.contains(b) ? +b.dataset.i : -1;
    };

    function commit(before, pop) {
      if (before.every((v, i) => v === s.board[i])) return;
      s.hist.push(before);
      if (s.hist.length > 80) s.hist.shift();
      s.moves++;
      const res = paint(pop);
      if (pop >= 0 && res.conflicts.has(pop)) { ctx.sfx.bad(); ctx.react('oops'); }
      else if (pop >= 0) ctx.sfx.tap();
      else ctx.sfx.mark();
      ctx.changed();
    }

    function tap(i) {
      const before = s.board.slice();
      if (mode === 'place') s.board[i] = s.board[i] === 2 ? 0 : 2;
      else s.board[i] = s.board[i] === 0 ? 1 : 0;
      commit(before, s.board[i] === 2 ? i : -1);
    }

    el.addEventListener('click', (e) => {
      const m = e.target.closest('.hd-mode');
      if (m) { setMode(m.dataset.mode); ctx.sfx.mark(); return; }
      // da tastiera (Invio/Spazio) arriva solo il click, con detail 0
      const b = e.target.closest('.hd-cell');
      if (b && e.detail === 0) tap(+b.dataset.i);
    });

    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.hd-cell');
      if (!b || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const i = +b.dataset.i;
      stroke = { start: i, moved: false, long: false, before: s.board.slice(), seen: new Set([i]), paint: s.board[i] === 1 ? 0 : 1 };
      if (mode === 'mark') {
        stroke.timer = setTimeout(() => {
          if (!stroke || stroke.moved) return;
          stroke.long = true;
          s.board[i] = s.board[i] === 2 ? 0 : 2;
          commit(stroke.before, s.board[i] === 2 ? i : -1);
          if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) { /* niente vibrazione */ }
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
        const a = stroke.start;
        if (s.board[a] !== 2) s.board[a] = stroke.paint;
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
      if (st.moved) { s.board.forEach((v, i) => { if (v !== st.before[i]) cells[i].dataset.v = -1; }); commit(st.before, -1); }
      else tap(st.start);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    /* ---------- avvio ---------- */
    const ok = saved && saved.n && H.validate(saved.n, saved.regions) && Array.isArray(saved.board) && saved.board.length === saved.n * saved.n;
    if (ok) { s = Object.assign({ hist: [], moves: 0 }, saved); build(); } else fresh();

    return {
      fresh,
      restart() { s.board.fill(0); s.hist = []; s.moves = 0; grid.classList.remove('solved'); paint(); ctx.changed({ reset: true }); },
      undo() {
        if (!s.hist.length) return;
        s.board = s.hist.pop(); s.moves = Math.max(0, s.moves - 1);
        paint(); ctx.sfx.mark(); ctx.changed();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'hedgedoku', name: 'Hedgedoku', rules: 'r1', art, create,
    rate: (s) => (s.moves <= s.n * 2 ? 3 : s.moves <= s.n * 4 ? 2 : 1),
    parTime: (s) => s.n * s.n * 2,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
