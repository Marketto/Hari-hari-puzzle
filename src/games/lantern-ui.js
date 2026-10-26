/* Lantern Glow — interfaccia. Ogni tocco inverte la lanterna e le 4 vicine. */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const sizeFor = (level) => (level <= 3 ? 4 : 5);
  const tapsFor = (level) => Math.min(3 + level, 14);

  const lantern = `<svg viewBox="0 0 60 72" aria-hidden="true">
    <rect x="22" y="2" width="16" height="7" rx="2" class="ln-cap"/>
    <ellipse cx="30" cy="36" rx="25" ry="25" class="ln-body"/>
    <path d="M30 11v50M17 14c-6 12-6 32 0 44M43 14c6 12 6 32 0 44" class="ln-rib"/>
    <rect x="22" y="59" width="16" height="6" rx="2" class="ln-cap"/>
    <path d="M30 65v6" class="ln-tassel"/>
    <g class="ln-face"><circle cx="22" cy="36" r="2.6"/><circle cx="38" cy="36" r="2.6"/><path d="M26 42q4 4 8 0" fill="none" stroke-width="2" stroke-linecap="round"/></g>
  </svg>`;

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <circle cx="60" cy="46" r="36" fill="var(--lantern-glow)" opacity=".45"/>
    <g transform="translate(40 10)" class="ln-art on">${lantern.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
    <g transform="translate(6 30) scale(.55)" class="ln-art">${lantern.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
    <g transform="translate(88 30) scale(.55)" class="ln-art on">${lantern.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  </svg>`;

  function create(el, ctx) {
    const L = HH.lantern;
    let n, grid, start, history;

    function fresh() {
      n = sizeFor(ctx.level);
      start = L.generate(n, tapsFor(ctx.level));
      grid = start.slice(); history = [];
      ctx.moves(0);
      render();
    }

    function render() {
      el.innerHTML = `<div class="ln-grid" dir="ltr" style="--n:${n}">${grid.map((on, i) =>
        `<button class="ln-cell${on ? ' on' : ''}" data-i="${i}" aria-pressed="${on}" aria-label="${((i / n) | 0) + 1},${(i % n) + 1}">${lantern}</button>`).join('')}</div>`;
    }

    el.onclick = (e) => {
      const b = e.target.closest('.ln-cell');
      if (!b) return;
      history.push(grid);
      grid = L.toggle(n, grid, +b.dataset.i);
      ctx.sfx.tap(); ctx.moves(history.length);
      render();
      if (L.isSolved(grid)) setTimeout(ctx.win, 300);
    };

    fresh();
    return {
      fresh,
      restart() { grid = start.slice(); history = []; ctx.moves(0); render(); },
      undo() { if (history.length) { grid = history.pop(); ctx.moves(history.length); render(); } },
    };
  }

  HH.games.push({ id: 'lantern', name: 'Lantern Glow', rules: 'r3', art, create });
})(typeof globalThis !== 'undefined' ? globalThis : window);
