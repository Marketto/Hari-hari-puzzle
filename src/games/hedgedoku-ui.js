/* Hedgedoku — interfaccia. Tocco: vuoto → segno ✕ → riccio → vuoto. */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const sizeFor = (level) => (level <= 2 ? 5 : level <= 5 ? 6 : level <= 9 ? 7 : 8);

  // Illustrazione della card: mini griglia a regioni con due ricci
  const art = () => {
    const regs = [[0, 0, 1], [2, 0, 1], [2, 3, 3]];
    const rects = regs.map((row, r) => row.map((reg, c) =>
      `<rect x="${18 + c * 28}" y="${3 + r * 28}" width="27" height="27" rx="5" fill="var(--r${reg})"/>`).join('')).join('');
    const h = (x, y) => HH.mascot.mini().replace('<svg class="mini-hari"', `<svg x="${x}" y="${y}" width="25" height="25"`);
    return `<svg viewBox="0 0 120 90" aria-hidden="true">${rects}${h(19, 4)}${h(75, 32)}</svg>`;
  };

  function create(el, ctx) {
    const H = HH.hedgedoku;
    let n, puzzle, board, history;

    function fresh() {
      n = sizeFor(ctx.level);
      puzzle = H.generate(n);
      board = new Array(n * n).fill(0);
      history = [];
      ctx.moves(0);
      render();
    }

    function render() {
      const reg = puzzle.regions;
      const res = H.check(n, reg, board);
      const cells = [];
      for (let i = 0; i < n * n; i++) {
        const r = (i / n) | 0, c = i % n;
        // bordo spesso tra regioni diverse, sottile dentro la regione, nessuno sul perimetro
        const edge = (rr, cc) => rr < 0 || cc < 0 || rr >= n || cc >= n ? 'var(--b-none)'
          : reg[rr * n + cc] !== reg[i] ? 'var(--b-wall)' : 'var(--b-hair)';
        const st = [
          `--r:var(--r${reg[i] % 8})`,
          `--bt:${edge(r - 1, c)}`, `--bb:${edge(r + 1, c)}`,
          `--bl:${edge(r, c - 1)}`, `--br:${edge(r, c + 1)}`,
        ].join(';');
        const v = board[i];
        const inner = v === 2 ? HH.mascot.mini() : v === 1 ? '<span class="hd-x" aria-hidden="true"></span>' : '';
        const label = `${r + 1},${c + 1}`;
        cells.push(`<button class="hd-cell${v === 2 ? ' has' : ''}${res.conflicts.has(i) ? ' bad' : ''}" style="${st}" data-i="${i}" aria-label="${label}">${inner}</button>`);
      }
      el.innerHTML = `<div class="hd-wrap"><div class="hd-grid" dir="ltr" style="--n:${n}">${cells.join('')}</div>
        <div class="hd-count" aria-live="polite">${HH.mascot.mini()}<b>${res.placed}</b><span>/ ${n}</span></div></div>`;
      if (res.solved) setTimeout(ctx.win, 250);
    }

    el.onclick = (e) => {
      const b = e.target.closest('.hd-cell');
      if (!b) return;
      const i = +b.dataset.i;
      history.push(board.slice());
      board[i] = (board[i] + 1) % 3;
      ctx.moves(history.length);
      const res = H.check(n, puzzle.regions, board);
      if (board[i] === 2 && res.conflicts.has(i)) { ctx.sfx.bad(); ctx.react('oops'); }
      else ctx.sfx.tap();
      render();
    };

    fresh();
    return {
      fresh,
      restart() { board.fill(0); history = []; ctx.moves(0); render(); },
      undo() { if (history.length) { board = history.pop(); ctx.moves(history.length); render(); } },
    };
  }

  HH.games.push({ id: 'hedgedoku', name: 'Hedgedoku', rules: 'r1', art, create });
})(typeof globalThis !== 'undefined' ? globalThis : window);
