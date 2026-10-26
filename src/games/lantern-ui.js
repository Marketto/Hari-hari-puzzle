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

    // livello con minimo esatto (Gauss su GF(2)) e mosse concesse = minimo + 15% (da +2 a +6)
    function fresh() {
      const n = sizeFor(ctx.level);
      const lv = L.generateLevel(n, tapsFor(ctx.level));
      s = { n, start: lv.grid, grid: lv.grid.slice(), hist: [], moves: 0, par: lv.min, max: lv.max };
      build();
      ctx.changed({ reset: true });
    }

    function meterHTML() {
      const left = Math.max(0, s.max - s.moves);
      return `<span class="mv-meter-label">${HH.i18n.t('movesLeft')}</span>
        <b>${left}</b><span class="mv-meter-max">/ ${s.max}</span>
        <span class="mv-meter-bar"><i style="width:${(left / s.max) * 100}%"></i></span>`;
    }
    function updateMeter() {
      const m = el.querySelector('.mv-meter');
      if (!m) return;
      m.innerHTML = meterHTML();
      m.classList.toggle('warn', s.max - s.moves <= 2);
    }

    function build() {
      el.innerHTML = `<div class="mv-meter night" aria-live="polite"></div>
        <div class="ln-grid" dir="ltr" style="--n:${s.n}">${s.grid.map((on, i) =>
        `<button class="ln-cell" style="--sw:${(i * 0.37) % 1.6}s" data-i="${i}" aria-label="${((i / s.n) | 0) + 1},${(i % s.n) + 1}">${lantern()}</button>`).join('')}</div>`;
      cells = [...el.querySelectorAll('.ln-cell')];
      paint();
      updateMeter();
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
      if (!b || s.over || L.isSolved(s.grid)) return;
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
      updateMeter();
      ctx.changed();
      if (L.isSolved(s.grid)) setTimeout(ctx.win, 500);
      else if (s.moves >= s.max) { s.over = 'moves'; ctx.changed(); ctx.outOfMoves('moves'); }
    };

    const ok = saved && saved.n && Array.isArray(saved.grid) && saved.grid.length === saved.n * saved.n;
    if (ok) {
      s = Object.assign({ hist: [], moves: 0, par: 6 }, saved);
      if (!s.max) {                                   // salvataggi precedenti al limite di mosse
        const m = L.minPresses(s.n, s.start);
        s.par = m ? m.min : s.par;
        s.max = s.par + HH.rules.extraMoves(s.par);
      }
      if (s.over || (s.moves >= s.max && !L.isSolved(s.grid))) { s.grid = s.start.slice(); s.hist = []; s.moves = 0; delete s.over; }
      build();
    } else fresh();

    return {
      fresh,
      restart() { s.grid = s.start.slice(); s.hist = []; s.moves = 0; delete s.over; paint(); updateMeter(); ctx.changed({ reset: true }); },
      // annulla rimette le lanterne com'erano ma il tocco resta speso (come in Boba Sort)
      undo() { if (s.over || !s.hist.length) return; s.grid = s.hist.pop(); paint(); updateMeter(); ctx.sfx.tap(); ctx.changed(); },
      snapshot: () => s,
    };
  }

  /* tutorial della prima partita */
  const tGrid = (on) => Array.from({ length: 9 }, (_, i) => { const x = 30 + (i % 3) * 30, y = 15 + Math.floor(i / 3) * 30;
    return `<circle cx="${x}" cy="${y}" r="11" fill="url(#${on.includes(i) ? 'lnOn' : 'lnOff'})" stroke="var(--ink)" stroke-width="1.6"/>`; }).join('');
  const TUT = [
    { key: 'tu_lantern_1', en: 'Tap a lantern: it flips together with its four neighbours.',
      art: `<svg viewBox="0 0 120 90"><g class="tut-swap-a">${tGrid([0, 2, 6, 8])}</g><g class="tut-swap-b">${tGrid([0, 1, 2, 3, 4, 5, 6, 7, 8])}</g>${HH.tutHand(60, 47)}</svg>` },
    { key: 'tu_lantern_2', en: 'Light them all before you run out of moves!',
      art: `<svg viewBox="0 0 120 90"><g class="tut-pulse">${tGrid([0, 1, 2, 3, 4, 5, 6, 7, 8])}</g></svg>` },
  ];
  HH.games.push({
    id: 'lantern', name: 'Lantern Glow', rules: 'r3', art, create, plate: 'night',
    tutorial: TUT,
    // fragoline: 3 col minimo esatto, 2 entro il 70% delle mosse in più, 1 oltre
    rate: (s) => HH.rules.rateMoves(s.moves, s.par, s.max),
    parTime: (s) => s.n * s.n * 3,
    // lanterne accese in più rispetto all'inizio
    progress: (s) => {
      const lit0 = s.start.filter(Boolean).length, lit = s.grid.filter(Boolean).length;
      return Math.max(0, Math.min(1, (lit - lit0) / Math.max(1, s.grid.length - lit0)));
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
