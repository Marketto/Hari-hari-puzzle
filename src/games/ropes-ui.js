/* Hari Knots — interfaccia (regole del modello 3, "Mikado con le corde").
 * Lastre pastello (SVG) con i fori; sopra, su canvas, le corde simulate a particelle (Verlet con vincoli di lunghezza,
 * gravità leggera, smorzamento). Ogni corda ha un nodino-mochi con la faccina a un capo e un fiocchetto col simbolo
 * all'altro; il corpo ha un motivo proprio (righe, puntini, trattini…) per chi distingue poco i colori.
 *
 * Chi sta sopra si vede subito: le corde sono disegnate in ordine topologico (da sotto a sopra) e a ogni incrocio la
 * corda di sotto viene "affossata" (più scura, con l'ombra della corda di sopra) e quella di sopra ridisegnata con ombra.
 * Corde libere (niente sopra): alone luminoso e ogni tanto un piccolo ondeggiamento invitante.
 * Corde bloccate: lucchettino a metà corda, nodini opachi; se provi a prenderle tremano, suonano e si illuminano le corde
 * che le bloccano.
 * Mossa: il capo preso sale in aria (corda sopra tutto, ombra lunga) e si posa nel foro: la corda resta sopra a tutte
 * quelle che incrocia. Una corda che non incrocia più nessuna si sfila dai fori e vola via; le lastre libere cadono.
 *
 * Mosse contate (come Boba Sort): mosse concesse = minimo + HH.rules.extraMoves(minimo); finite senza aver liberato
 * tutto → ctx.outOfMoves('moves'). Vicolo cieco dimostrato dal risolutore → suggerimento "Tutto aggrovigliato! Tocca Annulla."
 * Annulla rimette le corde ma la mossa resta spesa.
 *
 * Comandi: trascina un nodino (o il fiocchetto) di una corda libera in un foro libero · oppure tocca il nodino e poi il foro ·
 *   tastiera: frecce = scegli nodino/foro · Invio/Spazio = prendi/aggancia · Esc = lascia.
 * Prestazioni: rAF solo finché qualcosa si muove e mai se il tabellone non è più nel DOM (l'ondeggiamento delle corde
 * libere è un colpetto ogni ~4 s, poi tutto si ferma). prefers-reduced-motion: niente ondeggiamenti né voli.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    rk_ropes: 'Ropes', rk_plates: 'Plates', rk_stuck: 'All tangled up! Tap Undo.', rk_free: 'All free!',
    rk_picked: 'Knot picked up: choose a free hole',
    rk_board: 'Rope board: arrow keys choose a knot or a hole, Enter picks up or hooks, Escape lets go',
    rk_locked: 'This rope is locked: other ropes lie on top of it',
    rk_hint2: 'Move a shiny rope: it has nothing on top',
  };
  const L = (k) => label(k, EN[k]);
  const T = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const reduce = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const NC = 10;                      // colori delle corde (token --rk-c0..9)
  const M = 0.72;                     // margine attorno ai fori, in passi di griglia
  // simboli dei fiocchetti (centrati in 0,0, raggio ~6)
  const SYM = [
    'M0 5.6C-6-1-3.6-6.4 0-3.2 3.6-6.4 6-1 0 5.6z',
    'M0-6.4l1.9 4 4.4.5-3.3 3 .9 4.4L0 3.3l-3.9 2.2.9-4.4-3.3-3 4.4-.5z',
    'M0-6.2L6 0 0 6.2-6 0z',
    'M0-6L5.8 4.6H-5.8z',
    'M-4.6-4.6h9.2v9.2h-9.2z',
    'M-1.9-6h3.8v4.1H6v3.8H1.9V6h-3.8V1.9H-6v-3.8h4.1z',
    'M2.2-6A6 6 0 1 0 5.6 3.3 4.6 4.6 0 0 1 2.2-6z',
    'M0-6.4C2.8-2.4 5 0 5 2.4a5 5 0 0 1-10 0C-5 0-2.8-2.4 0-6.4z',
    'M0-5.8a2.6 2.6 0 1 1 0 .01M3.4-.6a2.6 2.6 0 1 1 0 .01M-3.4-.6a2.6 2.6 0 1 1 0 .01M0 1v5',
    'M-6-1.6h12v3.2H-6z',
  ];
  // motivo del corpo (trattini lungo la corda, in multipli della larghezza)
  const PAT = [[0.55, 0.75], [0.01, 0.9], [1.6, 0.8], [0.01, 0.5, 0.01, 1.3], [0.9, 0.5, 0.01, 0.5], [2.6, 0.6]];

  /* ---------- illustrazioni (solo token CSS) ---------- */
  const knotSVG = (x, y, k, r = 6) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="var(--rk-c${k})" stroke="var(--rk-line)" stroke-width="1.6"/>
    <circle cx="${-r * 0.36}" cy="${-r * 0.05}" r="${r * 0.15}" fill="var(--rk-face)"/><circle cx="${r * 0.36}" cy="${-r * 0.05}" r="${r * 0.15}" fill="var(--rk-face)"/>
    <ellipse cx="${-r * 0.6}" cy="${r * 0.32}" rx="${r * 0.2}" ry="${r * 0.12}" fill="var(--rk-blush)"/><ellipse cx="${r * 0.6}" cy="${r * 0.32}" rx="${r * 0.2}" ry="${r * 0.12}" fill="var(--rk-blush)"/></g>`;
  const ropeSVG = (d, k, cls = '') => `<g class="${cls}"><path d="${d}" fill="none" stroke="var(--rk-line)" stroke-width="7.4" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="var(--rk-c${k})" stroke-width="5" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="var(--rk-pat)" stroke-width="2.6" stroke-dasharray="2.6 3.6" stroke-linecap="round"/></g>`;
  const glowSVG = (d, cls = 'rk-tu-glowrope') => `<path class="${cls}" d="${d}" fill="none" stroke="var(--rk-glow)" stroke-width="12" stroke-linecap="round" opacity=".45"/>`;
  const lockSVG = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-3-1v-2.4a3 3 0 0 1 6 0V-1" fill="none" stroke="var(--rk-line)" stroke-width="1.8"/>
    <rect x="-4.6" y="-1.6" width="9.2" height="7" rx="2" fill="var(--rk-lock)" stroke="var(--rk-line)" stroke-width="1.2"/><circle cy="1.8" r="1.1" fill="var(--rk-line)"/></g>`;
  const holeSVG = (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--rk-hole)" stroke="var(--rk-hole-rim)" stroke-width="1.4"/>`;
  const plateSVG = (x, y, w, h, p, cls = '') => `<g class="${cls}"><rect x="${x}" y="${y + 2.5}" width="${w}" height="${h}" rx="9" fill="var(--rk-plate-shadow)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="var(--rk-p${p})" stroke="var(--rk-p${p}-2)" stroke-width="2"/>
    <path d="M${x + 8} ${y + 4.5}h${w - 16}" stroke="var(--rk-plate-hi)" stroke-width="2" stroke-linecap="round"/></g>`;
  const art = () => `<svg class="rk-art" viewBox="0 0 120 90" aria-hidden="true">
    ${plateSVG(8, 12, 62, 66, 0)}${plateSVG(52, 6, 60, 60, 1)}
    ${[[20, 24], [20, 66], [58, 66], [64, 18], [100, 18], [100, 54], [40, 46], [84, 40]].map(([x, y]) => holeSVG(x, y)).join('')}
    ${ropeSVG('M20 66Q44 38 64 18', 0)}${ropeSVG('M58 66Q80 40 100 18', 1)}${glowSVG('M20 24Q60 40 100 54', '')}${ropeSVG('M20 24Q60 40 100 54', 3)}
    ${knotSVG(20, 24, 3)}${knotSVG(100, 54, 3)}${knotSVG(20, 66, 0)}${knotSVG(64, 18, 0)}${knotSVG(58, 66, 1)}${knotSVG(100, 18, 1)}
    ${lockSVG(44, 46)}
    <g class="rk-art-spark"><path d="M108 70l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" fill="var(--rk-spark)"/></g></svg>`;

  const hand = (...a) => (HH.tutHand ? HH.tutHand(...a) : '');
  const TUT = [
    { key: 'tu_ropes_6', en: 'Only a rope with nothing on top of it can be moved: the shiny one!',
      art: `<svg class="rk-art" viewBox="0 0 120 90">${plateSVG(10, 10, 100, 70, 1)}
        ${[[24, 24], [96, 66], [24, 66], [96, 24], [60, 72]].map(([x, y]) => holeSVG(x, y)).join('')}
        ${ropeSVG('M24 24L96 66', 4)}${knotSVG(24, 24, 4)}${knotSVG(96, 66, 4)}
        <g class="rk-tu-shake">${lockSVG(40, 39)}</g>
        ${glowSVG('M24 66L96 24')}${ropeSVG('M24 66L96 24', 0)}${knotSVG(24, 66, 0)}${knotSVG(96, 24, 0)}
        ${hand(97, 26, 'tut-tap')}</svg>` },
    { key: 'tu_ropes_7', en: 'Drag its knot into a free hole: it lands on top of the ropes it crosses.',
      art: `<svg class="rk-art" viewBox="0 0 120 90">${plateSVG(10, 10, 100, 70, 0)}
        ${[[24, 66], [86, 30], [96, 66], [60, 16], [60, 76]].map(([x, y]) => holeSVG(x, y)).join('')}
        ${ropeSVG('M60 16L60 76', 1)}${knotSVG(60, 16, 1)}${knotSVG(60, 76, 1)}
        <g class="rk-tu-swing">${ropeSVG('M24 66L96 66', 2)}<g class="rk-tu-knot">${knotSVG(96, 66, 2)}</g></g>${knotSVG(24, 66, 2)}
        <circle class="rk-tu-glow" cx="86" cy="30" r="7" fill="none" stroke="var(--rk-glow)" stroke-width="2.4"/>
        ${hand(97, 68, 'tut-go', '--dx:-11px;--dy:-38px')}</svg>` },
    { key: 'tu_ropes_8', en: 'A rope that crosses no other rope flies away. Free all the plates!',
      art: `<svg class="rk-art" viewBox="0 0 120 90"><g class="rk-tu-plate">${plateSVG(10, 10, 100, 70, 2)}</g>
        ${[[24, 24], [96, 66], [24, 66], [96, 24]].map(([x, y]) => holeSVG(x, y)).join('')}
        <g class="rk-tu-fly2">${ropeSVG('M24 24L96 66', 4)}${knotSVG(24, 24, 4)}${knotSVG(96, 66, 4)}</g>
        <g class="rk-tu-fly1">${ropeSVG('M24 66L96 24', 5)}${knotSVG(24, 66, 5)}${knotSVG(96, 24, 5)}</g>
        <g class="tut-pulse"><path d="M60 8l2 4.2 4.6.6-3.4 3.2.9 4.6-4.1-2.3-4.1 2.3.9-4.6-3.4-3.2 4.6-.6z" fill="var(--rk-spark)"/></g></svg>` },
  ];

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const R = HH.ropes;
    let s;                         // { v, L, st, hist, moves, max, over }
    let stage, svg, cv, g2, hintEl, ropesEl, platesEl, liveEl, meterEl;
    let sp = 50, W = 300, H = 300, dpr = 1;
    let view = [];                 // corde disegnate: { r, k, pts, old, n, len, pins:[{x,y,tx,ty}], mode:'live'|'fly', alpha }
    let rel = new Map();           // "i,j" → chi sta sopra (relazione mostrata)
    let freeSet = new Set();       // corde libere nello stato
    let fx = [];                   // scintille { x, y, vx, vy, life, c }
    let grab = null, sel = null, hover = -1, kb = null, kcur = 0;
    let raf = 0, still = 0, timers = [], won = false, colors = null, sym = null, ro = null, mo = null, idle = 0;

    const pk = (i, j) => (i < j ? `${i},${j}` : `${j},${i}`);
    const later = (fn, ms) => { const t = setTimeout(() => { timers = timers.filter((x) => x !== t); if (el.isConnected) fn(); }, ms); timers.push(t); };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; clearTimeout(idle); };
    const maxFor = (min) => min + (HH.rules && HH.rules.extraMoves ? HH.rules.extraMoves(min) : Math.max(2, Math.min(6, Math.ceil(min * 0.15))));

    function fresh() {
      const lv = R.generate(ctx.level, Math.random);
      s = { v: 3, L: lv, st: R.initial(lv), hist: [], moves: 0, max: maxFor(lv.min) };
      build();
      ctx.changed({ reset: true });
    }

    /* ---------- geometria in pixel ---------- */
    const hx = (h) => (M + s.L.holes[h][0]) * sp;
    const hy = (h) => (M + s.L.holes[h][1]) * sp;
    const vbW = () => (s.L.cols - 1 + 2 * M) * 100, vbH = () => (s.L.rows - 1 + 2 * M) * 100;

    /* ---------- DOM ---------- */
    function platesHTML() {
      const { L: lv, st } = s;
      return lv.plates.map((p, i) => {
        const x = (M + p[0] - 0.5) * 100, y = (M + p[1] - 0.5) * 100, w = (p[2] - p[0] + 1) * 100, h = (p[3] - p[1] + 1) * 100;
        const holes = lv.holes.map(([hx0, hy0], hi) => (R.inRect(p, hx0, hy0)
          ? `<g class="rk-hole" data-h="${hi}" transform="translate(${(M + hx0) * 100} ${(M + hy0) * 100})"><circle class="rk-glow" r="24"/><circle class="rk-rim" r="15"/><circle class="rk-pit" r="10.5"/><path class="rk-pit-hi" d="M-7 4a8 8 0 0 0 14 0"/></g>` : '')).join('');
        const grain = [0.3, 0.62, 0.86].map((f, q) => `<path class="rk-grain" d="M${x + 22} ${y + h * f}q${w * 0.25} ${q % 2 ? -9 : 9} ${w * 0.5} 0t${w * 0.5 - 44} 0"/>`).join('');
        const dir = (i % 2 ? 1 : -1);
        return `<g class="rk-pl${st.plates[i] ? '' : ' gone'}" data-p="${i}" style="--c:var(--rk-p${i % 3});--c2:var(--rk-p${i % 3}-2);--rot:${dir * (14 + i * 5)}deg;--dx:${dir * 18}%">
          <rect class="rk-pl-sh" x="${x}" y="${y + 9}" width="${w}" height="${h}" rx="30"/>
          <rect class="rk-pl-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="30"/>
          ${grain}<path class="rk-pl-hi" d="M${x + 26} ${y + 13}h${w - 52}"/>
          <g class="rk-tab" transform="translate(${x + w / 2} ${y})"><rect class="rk-tab-b" x="-34" y="-25" width="68" height="40" rx="18"/>
            <g class="rk-eyes"><circle cx="-12" cy="-6" r="4.6"/><circle cx="12" cy="-6" r="4.6"/><circle class="rk-shine" cx="-13.4" cy="-7.6" r="1.6"/><circle class="rk-shine" cx="10.6" cy="-7.6" r="1.6"/></g>
            <path class="rk-happy" d="M-17-5q5-6 10 0M7-5q5-6 10 0"/>
            <ellipse class="rk-blush" cx="-22" cy="2" rx="5" ry="3"/><ellipse class="rk-blush" cx="22" cy="2" rx="5" ry="3"/>
            <path class="rk-mouth" d="M-4 1q4 4 8 0"/></g>
          ${holes}</g>`;
      }).join('');
    }
    function meterHTML() {
      const left = Math.max(0, s.max - s.moves);
      return `<span class="mv-meter-label">${T('movesLeft', 'Moves left')}</span>
        <b>${left}</b><span class="mv-meter-max">/ ${s.max}</span>
        <span class="mv-meter-bar"><i style="width:${(left / s.max) * 100}%"></i></span>`;
    }

    function build() {
      clearTimers();
      won = false; grab = null; sel = null; hover = -1; fx = [];
      el.innerHTML = `<div class="rk-wrap">
        <div class="mv-meter rk-meter" aria-live="polite"></div>
        <div class="rk-stage" dir="ltr" style="aspect-ratio:${vbW()} / ${vbH()}">
          <svg class="rk-plates" viewBox="0 0 ${vbW()} ${vbH()}" aria-hidden="true">
            <defs><pattern id="rk-dots" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="3" class="rk-dot"/></pattern></defs>
            <rect class="rk-tray" x="6" y="6" width="${vbW() - 12}" height="${vbH() - 12}" rx="44"/>
            <rect x="6" y="6" width="${vbW() - 12}" height="${vbH() - 12}" rx="44" fill="url(#rk-dots)"/>
            <g class="rk-yay"><text x="${vbW() / 2}" y="${vbH() / 2}" text-anchor="middle">${L('rk_free')}</text></g>
            ${platesHTML()}</svg>
          <canvas class="rk-cv" tabindex="0" role="application" aria-label="${L('rk_board')}"></canvas>
        </div>
        <div class="rk-foot">
          <div class="rk-pill"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M5 17C14 3 26 21 35 7" fill="none" stroke="var(--rk-line)" stroke-width="7" stroke-linecap="round"/><path d="M5 17C14 3 26 21 35 7" fill="none" stroke="var(--rk-c0)" stroke-width="4.4" stroke-linecap="round"/><circle cx="5" cy="17" r="4.4" fill="var(--rk-c0)" stroke="var(--rk-line)" stroke-width="1.4"/><circle cx="35" cy="7" r="4.4" fill="var(--rk-c0)" stroke="var(--rk-line)" stroke-width="1.4"/></svg><span class="rk-lab">${L('rk_ropes')}</span><b class="rk-nr"></b></div>
          <div class="rk-pill"><svg viewBox="0 0 30 24" aria-hidden="true"><rect x="3" y="5" width="24" height="16" rx="5" fill="var(--rk-p1)" stroke="var(--rk-p1-2)" stroke-width="2"/><circle cx="9" cy="13" r="2.2" fill="var(--rk-hole)"/><circle cx="21" cy="13" r="2.2" fill="var(--rk-hole)"/></svg><span class="rk-lab">${L('rk_plates')}</span><b class="rk-np"></b></div>
        </div>
        <p class="rk-hint" aria-live="polite"></p>
        <p class="rk-live" aria-live="polite"></p>
      </div>`;
      stage = el.querySelector('.rk-stage');
      svg = el.querySelector('.rk-plates');
      cv = el.querySelector('.rk-cv');
      g2 = cv.getContext('2d');
      hintEl = el.querySelector('.rk-hint');
      ropesEl = el.querySelector('.rk-nr');
      platesEl = el.querySelector('.rk-np');
      liveEl = el.querySelector('.rk-live');
      meterEl = el.querySelector('.rk-meter');
      bind();
      measure();
      syncView(true);
      status();
      if (!s.moves) hintEl.textContent = L('rk_hint2');
      if (ro) ro.disconnect();
      if (G.ResizeObserver) {
        ro = new ResizeObserver(() => { if (!stage.isConnected) { ro.disconnect(); return; } const w0 = W; measure(); if (Math.abs(W - w0) > 0.5) { syncView(true); wake(); } });
        ro.observe(stage);
      }
      if (mo) mo.disconnect();
      if (G.MutationObserver) {
        mo = new MutationObserver(() => { if (!stage.isConnected) { mo.disconnect(); return; } colors = null; wake(); });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }
      wake();
    }

    function measure() {
      const r = stage.getBoundingClientRect();
      W = r.width || 300;
      sp = W / (s.L.cols - 1 + 2 * M);
      H = sp * (s.L.rows - 1 + 2 * M);
      dpr = Math.min(2.5, G.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }

    function readColors() {
      const cs = getComputedStyle(stage);
      const v = (n) => cs.getPropertyValue(n).trim() || '#888';
      colors = {
        c: [...Array(NC)].map((_, i) => v('--rk-c' + i)), line: v('--rk-line'), shadow: v('--rk-shadow'), hi: v('--rk-hi'),
        pat: v('--rk-pat'), face: v('--rk-face'), blush: v('--rk-blush'), sym: v('--rk-sym'), glow: v('--rk-glow'),
        spark: v('--rk-spark'), cursor: v('--rk-cursor'), warn: v('--rk-warn'), sink: v('--rk-sink'), lock: v('--rk-lock'),
        halo: v('--rk-halo'), dim: v('--rk-dim'),
      };
      if (!sym && typeof Path2D !== 'undefined') sym = SYM.map((d) => new Path2D(d));
    }

    /* ---------- corde fisiche ---------- */
    const SLACK = 0.006;
    function makeRope(r) {
      const [a, b] = s.st.ends[r];
      const ax = hx(a), ay = hy(a), bx = hx(b), by = hy(b);
      const len = Math.hypot(bx - ax, by - ay) * (1 + SLACK);
      const n = Math.max(8, Math.min(22, Math.round(len / (sp * 0.24))));
      const pts = new Float32Array(2 * (n + 1));
      for (let i = 0; i <= n; i++) { const t = i / n; pts[2 * i] = ax + (bx - ax) * t; pts[2 * i + 1] = ay + (by - ay) * t + Math.sin(Math.PI * t) * len * 0.03; }
      return { r, k: r % NC, n, pts, old: pts.slice(), len, pins: [{ x: ax, y: ay, tx: ax, ty: ay }, { x: bx, y: by, tx: bx, ty: by }], mode: 'live', alpha: 1, t: 0 };
    }
    // allinea le corde disegnate allo stato logico (reset = ricrea tutto a riposo)
    function syncView(reset) {
      if (reset) view = [];
      const keep = new Map(view.map((v) => [v.r, v]));
      const next = [];
      s.st.ends.forEach((e, r) => {
        if (!e) return;
        let v = keep.get(r);
        if (!v || v.mode !== 'live') v = makeRope(r);
        v.pins[0].tx = hx(e[0]); v.pins[0].ty = hy(e[0]);
        v.pins[1].tx = hx(e[1]); v.pins[1].ty = hy(e[1]);
        next.push(v);
      });
      view.filter((v) => v.mode === 'fly').forEach((v) => next.push(v));
      view = next;
      rel = new Map(s.st.over.map(([i, j]) => [pk(i, j), i]));
      freeSet = new Set(R.freeRopes(s.L, s.st));
      if (reset) { for (let i = 0; i < 160; i++) step(true); }
    }

    function step(quiet) {
      const g = sp * 0.003;
      let moving = 0;
      for (const v of view) {
        const { pts, old, n } = v;
        const fly = v.mode === 'fly';
        for (const p of v.pins) {
          const k = p.snap ? 1 : 0.38;
          p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
          moving = Math.max(moving, Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y));
        }
        const A = v.pins[0], B = v.pins[1];
        if (!fly) {
          const target = Math.hypot(B.x - A.x, B.y - A.y) * (1 + SLACK);
          v.len += (target - v.len) * (target < v.len ? 0.6 : 0.1);
        }
        const damp = fly ? 0.985 : 0.955, gy = fly ? -g * 1.6 : g;
        for (let i = 0; i <= n; i++) {
          const x = pts[2 * i], y = pts[2 * i + 1];
          const vx = (x - old[2 * i]) * damp, vy = (y - old[2 * i + 1]) * damp;
          old[2 * i] = x; old[2 * i + 1] = y;
          pts[2 * i] = x + vx + (fly ? v.wind || 0 : 0); pts[2 * i + 1] = y + vy + gy;
          if (!quiet) moving = Math.max(moving, Math.abs(vx) + Math.abs(vy));
        }
        const d = v.len / n;
        for (let it = 0; it < 12; it++) {
          if (!fly) { pts[0] = A.x; pts[1] = A.y; pts[2 * n] = B.x; pts[2 * n + 1] = B.y; }
          for (let i = 0; i < n; i++) {
            const x1 = pts[2 * i], y1 = pts[2 * i + 1], x2 = pts[2 * i + 2], y2 = pts[2 * i + 3];
            const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy) || 1e-6;
            const diff = (dist - d) / dist * 0.5;
            const pin1 = !fly && i === 0, pin2 = !fly && i + 1 === n;
            const w1 = pin1 ? 0 : pin2 ? 2 : 1, w2 = pin2 ? 0 : pin1 ? 2 : 1;
            pts[2 * i] += dx * diff * w1; pts[2 * i + 1] += dy * diff * w1;
            pts[2 * i + 2] -= dx * diff * w2; pts[2 * i + 3] -= dy * diff * w2;
          }
        }
        if (!fly) { pts[0] = A.x; pts[1] = A.y; pts[2 * n] = B.x; pts[2 * n + 1] = B.y; }
        else { v.t++; v.alpha = Math.max(0, Math.min(1, 1.6 - v.t / 70)); }
        if (v.air) v.air--;
        if (v.flash) v.flash--;
      }
      view = view.filter((v) => v.mode !== 'fly' || v.alpha > 0);
      for (const f of fx) { f.x += f.vx; f.y += f.vy; f.vy += 0.08; f.vx *= 0.97; f.life -= 1 / 36; }
      fx = fx.filter((f) => f.life > 0);
      return moving;
    }
    // colpetto laterale al centro della corda (ondeggiamento delle libere, tremito delle bloccate)
    function nudge(v, amt) {
      const { pts, old, n } = v;
      const ax = v.pins[1].y - v.pins[0].y, ay = v.pins[0].x - v.pins[1].x, l = Math.hypot(ax, ay) || 1;
      for (let i = 1; i < n; i++) {
        const f = Math.sin((i / n) * Math.PI) * amt;
        old[2 * i] = pts[2 * i] - (ax / l) * f; old[2 * i + 1] = pts[2 * i + 1] - (ay / l) * f;
      }
    }

    /* ---------- disegno ---------- */
    function trace(v) {
      const { pts, n } = v;
      g2.beginPath();
      g2.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n; i++) {
        const mx = (pts[2 * i] + pts[2 * i + 2]) / 2, my = (pts[2 * i + 1] + pts[2 * i + 3]) / 2;
        g2.quadraticCurveTo(pts[2 * i], pts[2 * i + 1], mx, my);
      }
      g2.lineTo(pts[2 * n], pts[2 * n + 1]);
    }
    const RW = () => sp * 0.15;
    function drawBody(v, withShadow = true, lifted = false) {
      const w = RW(), col = colors.c[v.k];
      g2.lineCap = 'round'; g2.lineJoin = 'round';
      trace(v);
      if (withShadow) {
        // corda sollevata dalla mano: ombra più lontana e più morbida
        const o = lifted ? w * 1.6 : w * 0.45;
        g2.save(); g2.translate(o * 0.4, o); g2.strokeStyle = colors.shadow; g2.lineWidth = w * (lifted ? 2.1 : 1.5); g2.stroke(); g2.restore();
      }
      g2.strokeStyle = colors.line; g2.lineWidth = w * 1.32; g2.stroke();
      g2.strokeStyle = col; g2.lineWidth = w; g2.stroke();
      const pat = PAT[v.r % PAT.length];
      g2.setLineDash(pat.map((x) => x * w)); g2.lineDashOffset = -v.dash || 0;
      g2.strokeStyle = colors.pat; g2.lineWidth = w * 0.52; g2.stroke();
      g2.setLineDash([]);
      g2.save(); g2.translate(-w * 0.12, -w * 0.2); g2.strokeStyle = colors.hi; g2.lineWidth = w * 0.18; g2.stroke(); g2.restore();
      if (v.locked && v.mode === 'live') { g2.strokeStyle = colors.dim; g2.lineWidth = w * 1.05; g2.stroke(); }
    }
    // alone delle corde libere (sotto il corpo) e delle corde che bloccano quella che hai provato a prendere
    function drawHalo(v, strong) {
      trace(v);
      g2.lineCap = 'round'; g2.lineJoin = 'round';
      g2.strokeStyle = strong ? colors.warn : colors.halo; g2.lineWidth = RW() * (strong ? 2.6 : 2.3); g2.stroke();
    }
    function drawLock(v) {
      const { pts, n } = v, i = n >> 1;
      const x = pts[2 * i], y = pts[2 * i + 1] - RW() * 0.2, k = sp * 0.026 * (v.flash ? 1.25 : 1);
      g2.save(); g2.translate(x, y); g2.scale(k, k);
      g2.lineWidth = 1.8; g2.strokeStyle = colors.line;
      g2.beginPath(); g2.moveTo(-3, -1); g2.lineTo(-3, -3.4); g2.arc(0, -3.4, 3, Math.PI, 0); g2.lineTo(3, -1); g2.stroke();
      g2.fillStyle = v.flash ? colors.warn : colors.lock; g2.lineWidth = 1.2;
      g2.beginPath(); g2.roundRect ? g2.roundRect(-4.6, -1.6, 9.2, 7, 2) : g2.rect(-4.6, -1.6, 9.2, 7); g2.fill(); g2.stroke();
      g2.fillStyle = colors.line; g2.beginPath(); g2.arc(0, 1.8, 1.1, 0, 7); g2.fill();
      g2.restore();
    }
    function drawKnots(v) {
      const w = RW(), kr = w * 1.2, col = colors.c[v.k];
      const { pts, n } = v;
      const locked = v.locked && v.mode === 'live';
      // capo 0: nodino-mochi con faccina
      const x0 = pts[0], y0 = pts[1];
      g2.fillStyle = colors.shadow; g2.beginPath(); g2.ellipse(x0, y0 + kr * 0.55, kr * 1.05, kr * 0.5, 0, 0, 7); g2.fill();
      g2.fillStyle = col; g2.strokeStyle = colors.line; g2.lineWidth = w * 0.24;
      g2.beginPath(); g2.arc(x0, y0, kr, 0, 7); g2.fill(); g2.stroke();
      g2.fillStyle = colors.hi; g2.beginPath(); g2.ellipse(x0 - kr * 0.35, y0 - kr * 0.48, kr * 0.32, kr * 0.18, -0.5, 0, 7); g2.fill();
      g2.fillStyle = colors.face;
      if (v.mode === 'fly') {
        g2.strokeStyle = colors.face; g2.lineWidth = kr * 0.16;
        [-1, 1].forEach((s0) => { g2.beginPath(); g2.arc(x0 + s0 * kr * 0.36, y0 + kr * 0.02, kr * 0.16, Math.PI * 1.1, Math.PI * 1.9); g2.stroke(); });
      } else if (locked) {
        // occhi chiusi, assonnati: è bloccata
        g2.strokeStyle = colors.face; g2.lineWidth = kr * 0.13;
        [-1, 1].forEach((s0) => { g2.beginPath(); g2.moveTo(x0 + s0 * kr * 0.36 - kr * 0.14, y0); g2.lineTo(x0 + s0 * kr * 0.36 + kr * 0.14, y0); g2.stroke(); });
      } else {
        const blink = (v.blink || 0) > 0 ? 0.25 : 1;
        [-1, 1].forEach((s0) => { g2.beginPath(); g2.ellipse(x0 + s0 * kr * 0.36, y0 - kr * 0.02, kr * 0.13, kr * 0.16 * blink, 0, 0, 7); g2.fill(); });
      }
      g2.fillStyle = colors.blush;
      [-1, 1].forEach((s0) => { g2.beginPath(); g2.ellipse(x0 + s0 * kr * 0.62, y0 + kr * 0.3, kr * 0.2, kr * 0.12, 0, 0, 7); g2.fill(); });
      g2.strokeStyle = colors.face; g2.lineWidth = kr * 0.11;
      g2.beginPath();
      if (v.flash) g2.arc(x0, y0 + kr * 0.42, kr * 0.14, Math.PI * 1.15, Math.PI * 1.85);
      else g2.arc(x0, y0 + kr * 0.2, kr * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      g2.stroke();
      // capo 1: fiocchetto con il simbolo
      const x1 = pts[2 * n], y1 = pts[2 * n + 1];
      const ang = Math.atan2(pts[2 * n - 1] - y1, pts[2 * n - 2] - x1);
      g2.save(); g2.translate(x1, y1);
      g2.fillStyle = colors.shadow; g2.beginPath(); g2.ellipse(0, kr * 0.6, kr * 1.3, kr * 0.5, 0, 0, 7); g2.fill();
      g2.rotate(ang + Math.PI / 2);
      g2.fillStyle = col; g2.strokeStyle = colors.line; g2.lineWidth = w * 0.22; g2.lineJoin = 'round';
      [-1, 1].forEach((s0) => {
        g2.beginPath(); g2.moveTo(0, 0);
        g2.bezierCurveTo(s0 * kr * 1.9, -kr * 1.5, s0 * kr * 2.2, kr * 1.1, 0, 0);
        g2.fill(); g2.stroke();
      });
      g2.rotate(-(ang + Math.PI / 2));
      g2.beginPath(); g2.arc(0, 0, kr * 0.95, 0, 7); g2.fill(); g2.stroke();
      if (sym) {
        g2.save(); g2.scale(kr * 0.105, kr * 0.105);
        g2.fillStyle = colors.sym; g2.strokeStyle = colors.line; g2.lineWidth = 1.1;
        g2.fill(sym[v.r % sym.length]); g2.stroke(sym[v.r % sym.length]);
        g2.restore();
      }
      g2.restore();
      if (locked) {
        // nodini opachi
        g2.fillStyle = colors.dim;
        g2.beginPath(); g2.arc(x0, y0, kr * 1.05, 0, 7); g2.fill();
        g2.beginPath(); g2.arc(x1, y1, kr * 1.0, 0, 7); g2.fill();
      }
    }
    // punti d'incrocio reali tra le due curve (sui segmenti delle particelle)
    function curveHits(a, b) {
      const out = [];
      const P = a.pts, Q = b.pts;
      for (let i = 0; i < a.n; i++) {
        const x1 = P[2 * i], y1 = P[2 * i + 1], x2 = P[2 * i + 2], y2 = P[2 * i + 3];
        const minx = Math.min(x1, x2), maxx = Math.max(x1, x2), miny = Math.min(y1, y2), maxy = Math.max(y1, y2);
        for (let j = 0; j < b.n; j++) {
          const x3 = Q[2 * j], y3 = Q[2 * j + 1], x4 = Q[2 * j + 2], y4 = Q[2 * j + 3];
          if (Math.max(x3, x4) < minx || Math.min(x3, x4) > maxx || Math.max(y3, y4) < miny || Math.min(y3, y4) > maxy) continue;
          const den = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
          if (!den) continue;
          const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / den, u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / den;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
        }
      }
      if (!out.length) {
        // tocco senza incrocio delle curve (es. corda che passa sopra un nodino): il punto più vicino
        let best = null, bd = 1e9;
        for (let i = 0; i <= a.n; i++) for (let j = 0; j <= b.n; j++) {
          const d = Math.hypot(P[2 * i] - Q[2 * j], P[2 * i + 1] - Q[2 * j + 1]);
          if (d < bd) { bd = d; best = { x: (P[2 * i] + Q[2 * j]) / 2, y: (P[2 * i + 1] + Q[2 * j + 1]) / 2 }; }
        }
        if (best && bd < RW() * 2.4) out.push(best);
      }
      return out;
    }

    // corda "in aria": presa in mano o appena posata
    const airborne = () => (grab ? grab.r : sel ? sel.r : -1);

    function draw() {
      if (!colors) readColors();
      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      g2.clearRect(0, 0, W, H);
      const up = airborne();
      const live = view.filter((v) => v.mode === 'live');
      const byR = new Map(live.map((v) => [v.r, v]));
      live.forEach((v) => { v.locked = !freeSet.has(v.r) && v.r !== up; });
      const onTop = live.filter((v) => v.r === up || v.air);
      // ordine topologico (chi sta sotto prima); il modello 3 non ha cicli, ma per sicurezza nei cicli si sceglie
      // la corda con meno corde sopra
      const left = new Set(live.filter((v) => !onTop.includes(v)).map((v) => v.r)), order = [];
      while (left.size) {
        let best = -1, bc = 1e9;
        for (const r of left) {
          let c = 0;
          for (const j of left) if (j !== r && rel.get(pk(r, j)) === j) c++;
          if (c < bc) { bc = c; best = r; }
          if (!c) break;
        }
        order.push(best); left.delete(best);
      }
      // aloni: corde libere (invito) e corde che bloccano quella appena toccata
      const blockers = new Set();
      live.forEach((v) => { if (v.flash) R.coverers(s.st, v.r).forEach((j) => blockers.add(j)); });
      for (const r of order) {
        const v = byR.get(r);
        if (blockers.has(r)) drawHalo(v, true);
        else if (freeSet.has(r) && !won) drawHalo(v, false);
        drawBody(v); drawKnots(v);
      }
      // a ogni incrocio: la corda di sotto si "affossa" (più scura) e quella di sopra viene ridisegnata con la sua ombra
      rel.forEach((top, key) => {
        const [i, j] = key.split(',').map(Number);
        const lo = top === i ? j : i;
        const a = byR.get(top), b = byR.get(lo);
        if (!a || !b || onTop.includes(a) || onTop.includes(b)) return;
        for (const p of curveHits(a, b)) {
          g2.save(); g2.beginPath(); g2.arc(p.x, p.y, RW() * 2.3, 0, 7); g2.clip();
          trace(b); g2.strokeStyle = colors.sink; g2.lineWidth = RW() * 1.34; g2.stroke();
          if (blockers.has(top)) drawHalo(a, true);
          drawBody(a, true, true); drawKnots(a);
          g2.restore();
        }
      });
      for (const v of live) if (v.locked) drawLock(v);
      // la corda in mano (o appena posata) passa sopra tutto
      for (const v of onTop) { drawBody(v, true, true); drawKnots(v); }
      for (const v of view) if (v.mode === 'fly') { g2.globalAlpha = v.alpha; drawBody(v, false); drawKnots(v); g2.globalAlpha = 1; }
      if ((grab || sel) && hover >= 0) {
        g2.strokeStyle = colors.glow; g2.lineWidth = RW() * 0.5;
        g2.beginPath(); g2.arc(hx(hover), hy(hover), sp * 0.3, 0, 7); g2.stroke();
      }
      for (const f of fx) {
        g2.globalAlpha = Math.max(0, f.life);
        g2.fillStyle = f.c; g2.save(); g2.translate(f.x, f.y); g2.rotate(f.life * 4); star(f.r * (0.6 + f.life * 0.5)); g2.restore();
      }
      g2.globalAlpha = 1;
      if (kb !== null) {
        const t = kbTargets()[kcur];
        if (t) { g2.strokeStyle = colors.cursor; g2.lineWidth = 3; g2.setLineDash([6, 5]); g2.beginPath(); g2.arc(t.x, t.y, sp * 0.36, 0, 7); g2.stroke(); g2.setLineDash([]); }
      }
    }
    function star(r) {
      g2.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, q = i % 2 ? r * 0.4 : r; g2.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      g2.closePath(); g2.fill();
    }

    /* ---------- ciclo di animazione: solo quando serve ---------- */
    function wake() {
      still = 0;
      if (!raf && cv && cv.isConnected) raf = requestAnimationFrame(tick);
    }
    // ogni ~4 s una corda libera ondeggia un poco (invito); poi il ciclo si ferma di nuovo
    function scheduleWiggle() {
      clearTimeout(idle);
      if (reduce() || won) return;
      idle = setTimeout(() => {
        if (!cv || !cv.isConnected || won) return;
        if (!grab && !sel) {
          const free = view.filter((v) => v.mode === 'live' && freeSet.has(v.r));
          if (free.length) nudge(free[Math.floor(Math.random() * free.length)], sp * 0.05);
          wake();
        }
        scheduleWiggle();
      }, 3600 + Math.random() * 1200);
    }
    function tick() {
      raf = 0;
      if (!cv.isConnected) { clearTimeout(idle); return; }
      if (reduce()) {
        view = view.filter((v) => v.mode !== 'fly');
        fx = [];
        for (const v of view) { v.air = 0; v.flash = 0; for (const p of v.pins) { p.x = p.tx; p.y = p.ty; } }
        for (let i = 0; i < 120; i++) step(true);
        draw();
        return;
      }
      let m = 0;
      for (let k = 0; k < 2; k++) m = Math.max(m, step(false));
      for (const v of view) {
        if (v.mode === 'live' && Math.random() < 0.004) v.blink = 8;
        if (v.blink) v.blink--;
      }
      draw();
      const busy = grab || (sel && hover >= 0) || fx.length || view.some((v) => v.mode === 'fly' || v.blink || v.air || v.flash);
      still = m < 0.03 && !busy ? still + 1 : 0;
      if (still < 20) raf = requestAnimationFrame(tick);
      else { for (const v of view) for (const p of v.pins) { p.x = p.tx; p.y = p.ty; } draw(); }
    }

    /* ---------- stato e messaggi ---------- */
    function status() {
      const st = s.st, K = s.L.ropes.length, P = s.L.plates.length;
      const left = R.ropesLeft(st), freed = st.plates.filter((x) => !x).length;
      ropesEl.textContent = `${left}`;
      platesEl.textContent = `${freed}/${P}`;
      meterEl.innerHTML = meterHTML();
      meterEl.classList.toggle('warn', s.max - s.moves <= 2);
      liveEl.textContent = `${L('rk_ropes')} ${left}/${K} · ${L('rk_plates')} ${freed}/${P} · ${T('movesLeft', 'Moves left')} ${Math.max(0, s.max - s.moves)}`;
    }

    function burst(x, y, k, n = 8) {
      if (reduce()) return;
      if (!colors) readColors();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, v0 = sp * (0.04 + Math.random() * 0.05);
        fx.push({ x, y, vx: Math.cos(a) * v0, vy: Math.sin(a) * v0 - sp * 0.02, life: 1, r: sp * (0.07 + Math.random() * 0.05), c: i % 2 ? colors.spark : colors.c[k] });
      }
    }

    /* ---------- mosse ---------- */
    function doMove(r, end, h) {
      if (s.over) return false;
      const res = R.move(s.L, s.st, r, end, h);
      if (!res) return false;
      s.hist.push(s.st);
      if (s.hist.length > 80) s.hist.shift();
      s.st = res.state;
      s.moves++;
      hintEl.textContent = ''; hintEl.classList.remove('warn');
      ctx.sfx.set ? ctx.sfx.set() : ctx.sfx.mark();
      const v = view.find((x) => x.r === r);
      if (v) { v.pins[end].tx = hx(h); v.pins[end].ty = hy(h); v.pins[end].snap = false; v.dash = (v.dash || 0) + RW() * 3; v.air = 22; }
      // relazione mostrata: subito dopo la posa (con le corde che stanno per volare via)
      rel = new Map(res.pre.over.map(([i, j]) => [pk(i, j), i]));
      freeSet = new Set(R.freeRopes(s.L, s.st));
      const TT = reduce() ? 60 : 300;
      let tEnd = 0;
      res.gone.forEach(([q], idx) => {
        const t = 260 + idx * (reduce() ? 0 : 160);
        tEnd = Math.max(tEnd, t);
        later(() => fly(q), t);
      });
      const tPl = res.gone.length ? tEnd + TT + 120 : 200;
      res.fell.forEach(([p, round]) => {
        const t = tPl + round * (reduce() ? 60 : 380);
        tEnd = Math.max(tEnd, t + 500);
        later(() => dropPlate(p), t);
      });
      later(() => { rel = new Map(s.st.over.map(([i, j]) => [pk(i, j), i])); wake(); }, tEnd + 400);
      status();
      if (R.isSolved(s.st)) {
        won = true;
        clearTimeout(idle);
        ctx.changed();
        later(() => { stage.classList.add('win'); burst(W / 2, H / 2, 0, 14); ctx.react && ctx.react('happy'); wake(); }, tEnd + 200);
        later(() => ctx.win(), tEnd + 1100);
      } else if (s.moves >= s.max) {
        // mosse finite (come Boba Sort)
        s.over = 'moves';
        ctx.changed();
        later(() => ctx.outOfMoves('moves'), tEnd + 300);
      } else {
        ctx.changed();
        later(() => {
          const sol = R.solve(s.L, s.st, { nodeLimit: 1500 });
          if (sol.unsolvable || (!sol.aborted && s.moves + sol.min > s.max)) {
            hintEl.textContent = L('rk_stuck'); hintEl.classList.add('warn');
            ctx.react && ctx.react('oops');
          }
        }, tEnd + 300);
      }
      wake();
      return true;
    }
    function fly(r) {
      const v = view.find((x) => x.r === r && x.mode === 'live');
      if (!v) return;
      v.mode = 'fly'; v.t = 0; v.wind = (Math.random() - 0.5) * sp * 0.006;
      // i capi si sfilano dai fori con un piccolo strattone verso l'alto
      const { pts, old, n } = v;
      for (let i = 0; i <= n; i++) {
        const f = Math.sin((i / n) * Math.PI);
        old[2 * i + 1] = pts[2 * i + 1] + sp * (0.05 + 0.06 * (1 - f));
        old[2 * i] = pts[2 * i] + (i < n / 2 ? -1 : 1) * sp * 0.015;
      }
      burst(pts[0], pts[1], v.k, 6); burst(pts[2 * n], pts[2 * n + 1], v.k, 6);
      ctx.sfx.place ? ctx.sfx.place() : ctx.sfx.mark();
      rel.forEach((_, key) => { if (key.split(',').map(Number).includes(r)) rel.delete(key); });
      wake();
    }
    function dropPlate(p) {
      const g = svg.querySelector(`.rk-pl[data-p="${p}"]`);
      if (!g) return;
      g.classList.add('free');
      later(() => { g.classList.add('fall'); ctx.sfx.cupDone ? ctx.sfx.cupDone() : ctx.sfx.place(); }, reduce() ? 0 : 260);
      later(() => g.classList.add('gone'), reduce() ? 10 : 1300);
    }
    // tentativo su una corda bloccata: tremito, suono, si illuminano le corde che la coprono
    function refuse(r) {
      const v = view.find((x) => x.r === r && x.mode === 'live');
      if (v) { v.flash = 90; nudge(v, sp * 0.06); }
      ctx.sfx.bad ? ctx.sfx.bad() : ctx.sfx.tap();
      hintEl.textContent = L('rk_locked'); hintEl.classList.remove('warn'); void hintEl.offsetWidth; hintEl.classList.add('warn');
      liveEl.textContent = L('rk_locked');
      wake();
    }

    /* ---------- input ---------- */
    function localXY(e) {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function endAt(x, y) {
      let best = null, bd = sp * 0.55;
      s.st.ends.forEach((e, r) => {
        if (!e) return;
        e.forEach((h, end) => { const d = Math.hypot(hx(h) - x, hy(h) - y); if (d < bd) { bd = d; best = { r, end, h }; } });
      });
      return best;
    }
    function freeAt(x, y, rad = 0.5) {
      let best = -1, bd = sp * rad;
      for (const h of R.freeHoles(s.L, s.st)) { const d = Math.hypot(hx(h) - x, hy(h) - y); if (d < bd) { bd = d; best = h; } }
      return best;
    }
    function glowHoles(on) {
      const free = on ? new Set(R.freeHoles(s.L, s.st)) : new Set();
      svg.querySelectorAll('.rk-hole').forEach((g) => g.classList.toggle('on', free.has(+g.dataset.h)));
      stage.classList.toggle('picking', !!on);
    }
    function pick(t) {
      sel = t;
      glowHoles(true);
      const v = view.find((x) => x.r === t.r);
      if (v) v.pins[t.end].ty = hy(t.h) - sp * 0.12;
      ctx.sfx.pick ? ctx.sfx.pick() : ctx.sfx.tap();
      liveEl.textContent = L('rk_picked');
      wake();
    }
    function unpick() {
      if (!sel && !grab) return;
      const t = sel || grab;
      const v = view.find((x) => x.r === t.r);
      const e = s.st.ends[t.r];
      if (v && e) { v.pins[t.end].tx = hx(e[t.end]); v.pins[t.end].ty = hy(e[t.end]); v.pins[t.end].snap = false; }
      sel = null; grab = null; hover = -1;
      glowHoles(false);
      wake();
    }
    function unpickSilently(t) {
      const v = view.find((x) => x.r === t.r);
      if (v) v.pins[t.end].snap = false;
      glowHoles(false); hover = -1;
    }
    function bind() {
      cv.addEventListener('pointerdown', (e) => {
        if (won || s.over || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        kb = null;
        const [x, y] = localXY(e);
        if (sel) {
          const h = freeAt(x, y);
          if (h >= 0) { const t = sel; sel = null; unpickSilently(t); doMove(t.r, t.end, h); return; }
        }
        const t = endAt(x, y);
        if (!t) { unpick(); return; }
        if (!freeSet.has(t.r)) { unpick(); refuse(t.r); return; }
        if (sel && (sel.r !== t.r || sel.end !== t.end)) unpick();
        const v = view.find((q) => q.r === t.r);
        grab = Object.assign({}, t, { px: x, py: y, sx: x, sy: y, moved: false, pid: e.pointerId, wasSel: !!sel });
        sel = null;
        if (v) v.pins[t.end].snap = true;
        glowHoles(true);
        try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
        ctx.sfx.pick ? ctx.sfx.pick() : ctx.sfx.tap();
        follow(x, y);
      });
      cv.addEventListener('pointermove', (e) => {
        if (!grab || grab.pid !== e.pointerId) return;
        const [x, y] = localXY(e);
        if (Math.hypot(x - grab.sx, y - grab.sy) > 7) grab.moved = true;
        follow(x, y);
      });
      const up = (e) => {
        if (!grab || grab.pid !== e.pointerId) return;
        const t = grab;
        const [x, y] = localXY(e);
        const h = e.type === 'pointercancel' ? -1 : freeAt(x, y, 0.55);
        if (t.moved && h >= 0) {
          grab = null; hover = -1; glowHoles(false);
          const v = view.find((q) => q.r === t.r);
          if (v) v.pins[t.end].snap = false;
          doMove(t.r, t.end, h);
          return;
        }
        grab = null;
        if (!t.moved && !t.wasSel && e.type !== 'pointercancel') {
          // tocco: il nodino resta sollevato, poi si tocca un foro
          const v = view.find((q) => q.r === t.r);
          if (v) v.pins[t.end].snap = false;
          pick({ r: t.r, end: t.end, h: t.h });
          return;
        }
        sel = t; unpick();
        ctx.sfx.mark && ctx.sfx.mark();
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('keydown', onKey);
      cv.addEventListener('focus', () => { if (kb === null) { kb = 1; kcur = 0; wake(); } });
      cv.addEventListener('blur', () => { kb = null; wake(); });
    }
    function follow(x, y) {
      const v = view.find((q) => q.r === grab.r);
      const h = freeAt(x, y, 0.55);
      hover = h;
      // calamita: vicino a un foro libero il nodino ci scivola dentro
      let px = x, py = y;
      if (h >= 0) { px = x + (hx(h) - x) * 0.45; py = y + (hy(h) - y) * 0.45; }
      px = Math.max(sp * 0.2, Math.min(W - sp * 0.2, px)); py = Math.max(sp * 0.2, Math.min(H - sp * 0.2, py));
      grab.px = px; grab.py = py;
      if (v) { v.pins[grab.end].tx = px; v.pins[grab.end].ty = py; }
      wake();
    }

    // tastiera: bersagli = nodini (nulla in mano; anche quelli bloccati, che rispondono "bloccata") oppure fori liberi
    function kbTargets() {
      if (sel) return R.freeHoles(s.L, s.st).map((h) => ({ h, x: hx(h), y: hy(h) }));
      const out = [];
      s.st.ends.forEach((e, r) => { if (e) e.forEach((h, end) => out.push({ r, end, h, x: hx(h), y: hy(h) })); });
      return out;
    }
    function onKey(e) {
      if (won || s.over) return;
      kb = 1;
      const TG = kbTargets();
      if (!TG.length) return;
      kcur = Math.min(kcur, TG.length - 1);
      const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (dir) {
        e.preventDefault();
        const c = TG[kcur];
        let best = -1, bs = 1e9;
        TG.forEach((t, i) => {
          if (i === kcur) return;
          const dx = t.x - c.x, dy = t.y - c.y, along = dx * dir[0] + dy * dir[1];
          if (along <= 1) return;
          const sc = along + 2.2 * Math.abs(dx * dir[1] - dy * dir[0]);
          if (sc < bs) { bs = sc; best = i; }
        });
        if (best >= 0) kcur = best;
        if (sel) hover = TG[kcur].h;
        wake();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const t = TG[kcur];
        if (sel) { const q = sel; sel = null; unpickSilently(q); kcur = 0; doMove(q.r, q.end, t.h); }
        else if (!freeSet.has(t.r)) refuse(t.r);
        else { pick({ r: t.r, end: t.end, h: t.h }); kcur = 0; hover = kbTargets()[0] ? kbTargets()[0].h : -1; }
        wake();
      } else if (e.key === 'Escape') {
        e.preventDefault(); unpick(); kcur = 0;
      }
    }

    /* ---------- avvio ---------- */
    function restart() {
      s.st = R.initial(s.L); s.hist = []; s.moves = 0; delete s.over;
      build();
      ctx.changed({ reset: true });
    }
    function load(sv) {
      if (!sv || sv.v !== 3 || !R.validLevel(sv.L) || !R.validState(sv.L, sv.st)) return false;
      if (!R.stableStart(sv.L)) return false;
      s = { v: 3, L: sv.L, st: sv.st, hist: Array.isArray(sv.hist) ? sv.hist.filter((h) => R.validState(sv.L, h)).slice(-80) : [],
        moves: +sv.moves || 0, max: Number.isInteger(sv.max) && sv.max >= sv.L.min ? sv.max : maxFor(sv.L.min) };
      // partita salvata a mosse finite: si riparte da capo
      if (sv.over || (s.moves >= s.max && !R.isSolved(s.st))) { s.st = R.initial(s.L); s.hist = []; s.moves = 0; }
      return true;
    }
    if (load(saved)) build(); else fresh();
    if (R.isSolved(s.st)) restart();   // mai ripartire da un livello già risolto
    scheduleWiggle();

    return {
      fresh() { fresh(); scheduleWiggle(); },
      restart() { restart(); scheduleWiggle(); },
      // annulla: le corde tornano com'erano ma la mossa resta spesa (il limite non si aggira)
      undo() {
        if (won || s.over || !s.hist.length || s.moves >= s.max) return;
        s.st = s.hist.pop();
        build();
        ctx.sfx.mark();
        ctx.changed();
        scheduleWiggle();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'ropes', name: 'Hari Knots', rules: 'r10c', art, create,
    tutorial: TUT,
    // fragoline: 3 col minimo esatto (A*), 2 se usi al massimo il 70% delle mosse in più concesse, 1 oltre
    rate: (s) => (HH.rules && HH.rules.rateMoves ? HH.rules.rateMoves(s.moves, s.L.min, s.max) : HH.ropes.rate(s.moves, s.L.min)),
    parTime: (s) => 15 + s.L.ropes.length * 8 + s.L.min * 6,
    progress: (s) => HH.ropes.progress(s.L, s.st),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
