/* Boba Sort — interfaccia. Tocca un bicchiere, poi quello dove versare. */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  // Simboli bianchi per distinguere i gusti anche senza colori (accessibilità)
  const SYM = [
    '<circle cx="10" cy="10" r="5"/>',
    '<path d="M10 16C3 11 4 5 7.5 5 9 5 10 6.5 10 7c0-.5 1-2 2.5-2C16 5 17 11 10 16z"/>',
    '<path d="M10 3l2.1 4.6 5 .5-3.8 3.3 1.1 4.9-4.4-2.6-4.4 2.6 1.1-4.9-3.8-3.3 5-.5z"/>',
    '<path d="M10 4l6 11H4z"/>',
    '<rect x="5" y="5" width="10" height="10" rx="2"/>',
    '<path d="M10 3l6 7-6 7-6-7z"/>',
    '<path d="M10 3c3 5 5 7 5 9.5a5 5 0 0 1-10 0C5 10 7 8 10 3z"/>',
    '<path d="M4 16C4 8 9 4 16 4c0 7-4 12-12 12z"/>',
    '<path d="M13 3a7 7 0 1 0 4 10 5.5 5.5 0 1 1-4-10z"/>',
  ];
  const FLAVORS = ['strawberry', 'matcha', 'taro', 'mango', 'blueberry', 'mint', 'peach', 'cocoa', 'lemon'];
  const colorsFor = (level) => Math.min(9, 3 + Math.floor((level - 1) / 2));

  const layer = (f) => `<span class="bb-layer" style="--f:var(--f${f})" data-flavor="${FLAVORS[f]}"><svg viewBox="0 0 20 20" aria-hidden="true">${SYM[f]}</svg></span>`;

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    ${[[24, [0, 2, 1]], [52, [3, 3, 0, 2]], [80, [1, 1]]].map(([x, fs]) => `
      <rect x="${x}" y="10" width="22" height="72" rx="8" fill="var(--glass)" stroke="var(--glass-edge)" stroke-width="2.5"/>
      ${fs.map((f, k) => `<rect x="${x + 3}" y="${63 - k * 16}" width="16" height="15" rx="${k ? 2 : 6}" fill="var(--f${f})"/>`).join('')}
      <circle cx="${x + 7}" cy="74" r="2.2" fill="var(--boba)"/><circle cx="${x + 14}" cy="76" r="2.2" fill="var(--boba)"/>`).join('')}
    <rect x="58" y="2" width="4" height="22" rx="2" fill="var(--accent)" transform="rotate(12 60 12)"/>
  </svg>`;

  function create(el, ctx) {
    const B = HH.boba;
    let cups, start, history, sel = -1;

    function fresh() {
      start = B.generate(colorsFor(ctx.level)) || B.generate(3);
      cups = start.map((c) => c.slice());
      history = []; sel = -1;
      ctx.moves(0);
      render();
    }

    function render(pouredTo = -1) {
      el.innerHTML = `<div class="bb-wrap" dir="ltr">${cups.map((c, i) => {
        const done = c.length === B.CAP && c.every((x) => x === c[0]);
        return `<button class="bb-cup${i === sel ? ' sel' : ''}${done ? ' done' : ''}${i === pouredTo ? ' fill' : ''}" data-i="${i}" aria-label="${i + 1}: ${c.map((f) => FLAVORS[f]).join(', ') || '—'}">
          <span class="bb-straw" aria-hidden="true"></span>
          <span class="bb-glass">${c.map(layer).join('')}</span>
          <span class="bb-pearls" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>`;
      }).join('')}</div>`;
    }

    el.onclick = (e) => {
      const b = e.target.closest('.bb-cup');
      if (!b) return;
      const i = +b.dataset.i;
      if (sel === -1) {
        if (cups[i].length) { sel = i; ctx.sfx.pick(); render(); }
        return;
      }
      if (sel === i) { sel = -1; render(); return; }
      const r = B.pour(cups, sel, i);
      if (r) {
        history.push(cups);
        cups = r.cups; sel = -1;
        ctx.sfx.pour(); ctx.moves(history.length);
        render(i);
        if (B.isSolved(cups)) setTimeout(ctx.win, 350);
      } else {
        ctx.sfx.bad();
        b.classList.add('shake');
        sel = cups[i].length ? i : -1;
        setTimeout(render, 260);
      }
    };

    fresh();
    return {
      fresh,
      restart() { cups = start.map((c) => c.slice()); history = []; sel = -1; ctx.moves(0); render(); },
      undo() { if (history.length) { cups = history.pop(); sel = -1; ctx.moves(history.length); render(); } },
    };
  }

  HH.games.push({ id: 'boba', name: 'Boba Sort', rules: 'r2', art, create });
})(typeof globalThis !== 'undefined' ? globalThis : window);
