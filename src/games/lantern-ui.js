/* Lantern Glow — interfaccia. Ogni tocco inverte la lanterna e le 4 vicine.
 * Le lanterne spente dormono (zZ), quelle accese sorridono e oscillano. Gradienti in index.html (#lnOn, #lnOff, #lnHalo).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const sizeFor = (level) => (level <= 3 ? 4 : 5);
  const tapsFor = (level) => Math.min(3 + level, 14);

  const LANTERN = `
    <circle class="ln-halo" cx="32" cy="42" r="36"/>
    <path d="M32 0v7" stroke="var(--lantern-cap-2)" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="19" y="6" width="26" height="8" rx="3.5" fill="var(--lantern-cap)" stroke="var(--lantern-cap-2)" stroke-width="1.5"/>
    <ellipse class="ln-body" cx="32" cy="40" rx="27" ry="27"/>
    <path d="M32 13.5v53M21 15.5c-7.5 12-7.5 37 0 49M43 15.5c7.5 12 7.5 37 0 49M10 27q22 5 44 0M10 53q22 5 44 0" fill="none" stroke="var(--ln-rib)" stroke-width="1.6"/>
    <ellipse cx="20" cy="27" rx="5.5" ry="9" fill="#fff" opacity=".35" transform="rotate(-24 20 27)"/>
    <g class="ln-face-off" fill="none" stroke="var(--ln-ink)" stroke-width="2.2" stroke-linecap="round">
      <path d="M18 40q4.5 3.5 9 0M37 40q4.5 3.5 9 0"/><path d="M29.5 48q2.5 1.6 5 0"/>
    </g>
    <g class="ln-face-on">
      <ellipse cx="23" cy="39" rx="3.4" ry="4.2" fill="var(--ln-ink)"/><ellipse cx="41" cy="39" rx="3.4" ry="4.2" fill="var(--ln-ink)"/>
      <circle cx="24.3" cy="37.4" r="1.4" fill="#fff"/><circle cx="42.3" cy="37.4" r="1.4" fill="#fff"/>
      <ellipse cx="16.5" cy="46.5" rx="4.2" ry="2.5" fill="var(--ln-blush)"/><ellipse cx="47.5" cy="46.5" rx="4.2" ry="2.5" fill="var(--ln-blush)"/>
      <path d="M27.5 45.5q4.5 5.5 9 0" fill="var(--ln-mouth)" stroke="var(--ln-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <rect x="21" y="64" width="22" height="7" rx="3" fill="var(--lantern-cap)" stroke="var(--lantern-cap-2)" stroke-width="1.5"/>
    <circle cx="32" cy="74.5" r="2.8" fill="var(--accent)"/>
    <path d="M29.5 77l-1.8 9M32 77.5v10M34.5 77l1.8 9" stroke="var(--accent)" stroke-width="1.9" stroke-linecap="round"/>
    <text class="ln-z" x="50" y="17">z</text><text class="ln-z z2" x="56" y="8">z</text>`;
  const lantern = () => `<svg viewBox="0 0 64 90" aria-hidden="true">${LANTERN}</svg>`;

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <svg x="3" y="26" width="34" height="48" viewBox="0 0 64 90" class="ln-art">${LANTERN}</svg>
    <svg x="35" y="2" width="50" height="72" viewBox="0 0 64 90" class="ln-art on">${LANTERN}</svg>
    <svg x="83" y="22" width="34" height="48" viewBox="0 0 64 90" class="ln-art on">${LANTERN}</svg>
  </svg>`;

  function create(el, ctx, saved) {
    const L = HH.lantern;
    let s, cells = [];

    function fresh() {
      const n = sizeFor(ctx.level);
      const g = L.generate(n, tapsFor(ctx.level), Math.random, true);
      s = { n, start: g.grid, grid: g.grid.slice(), hist: [], moves: 0, par: g.taps.length };
      build();
      ctx.changed({ reset: true });
    }

    function build() {
      el.innerHTML = `<div class="ln-grid" dir="ltr" style="--n:${s.n}">${s.grid.map((on, i) =>
        `<button class="ln-cell" style="--sw:${(i * 0.37) % 1.6}s" data-i="${i}" aria-label="${((i / s.n) | 0) + 1},${(i % s.n) + 1}">${lantern()}</button>`).join('')}</div>`;
      cells = [...el.querySelectorAll('.ln-cell')];
      paint();
    }
    function paint(flash = []) {
      cells.forEach((b, i) => {
        b.classList.toggle('on', s.grid[i]);
        b.setAttribute('aria-pressed', s.grid[i]);
        if (flash.includes(i)) { b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); }
      });
    }

    el.onclick = (e) => {
      const b = e.target.closest('.ln-cell');
      if (!b) return;
      const i = +b.dataset.i, n = s.n;
      s.hist.push(s.grid);
      if (s.hist.length > 80) s.hist.shift();
      s.grid = L.toggle(n, s.grid, i);
      s.moves++;
      const r = (i / n) | 0, c = i % n;
      const flash = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dr, dc]) => [r + dr, c + dc])
        .filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < n && cc < n).map(([rr, cc]) => rr * n + cc);
      if (s.grid[i]) ctx.sfx.lightOn(s.grid.filter(Boolean).length); else ctx.sfx.lightOff();
      paint(flash);
      ctx.changed();
      if (L.isSolved(s.grid)) setTimeout(ctx.win, 500);
    };

    const ok = saved && saved.n && Array.isArray(saved.grid) && saved.grid.length === saved.n * saved.n;
    if (ok) { s = Object.assign({ hist: [], moves: 0, par: 6 }, saved); build(); } else fresh();

    return {
      fresh,
      restart() { s.grid = s.start.slice(); s.hist = []; s.moves = 0; paint(); ctx.changed({ reset: true }); },
      undo() { if (!s.hist.length) return; s.grid = s.hist.pop(); s.moves = Math.max(0, s.moves - 1); paint(); ctx.sfx.tap(); ctx.changed(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'lantern', name: 'Lantern Glow', rules: 'r3', art, create, plate: 'night',
    rate: (s) => (s.moves <= s.par ? 3 : s.moves <= s.par * 2 ? 2 : 1),
    parTime: (s) => s.n * s.n * 3,
    // lanterne accese in più rispetto all'inizio
    progress: (s) => {
      const lit0 = s.start.filter(Boolean).length, lit = s.grid.filter(Boolean).length;
      return Math.max(0, Math.min(1, (lit - lit0) / Math.max(1, s.grid.length - lit0)));
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
