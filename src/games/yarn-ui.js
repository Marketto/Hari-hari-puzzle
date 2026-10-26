/* Yarn Link — interfaccia.
 * Una coperta a maglia con le coppie di gomitoli-gattino; si trascina dal gomitolo (o da un filo già steso)
 * per srotolare il filo di lana casella per casella. Il filo si riavvolge tornando indietro, taglia i fili
 * che attraversa e si ferma sul gomitolo gemello: allora i due micini fanno festa ("Miao!").
 * Si vince quando ogni coppia è collegata E ogni casella è coperta.
 *
 * Comandi:  trascina dal gomitolo / dal filo = disegna o accorcia · tocco su un filo = cancellalo
 *           tastiera: frecce = sposta il cursore (o il filo preso) · Invio/Spazio = prendi/lascia · Canc = cancella · Esc = annulla il tratto
 * Fragoline: HH.yarn.rate(ripensamenti, colori) — vedi docs/games/yarn.md.
 * Disegno in SVG (unità: 100 per casella), colori solo da token --yl-*.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    yl_yarns: 'Yarns', yl_filled: 'Filled', yl_fill: 'Fill every square!', yl_meow: 'Meow!',
    yl_board: 'Yarn board: arrow keys move, Enter picks up or drops a thread, Delete erases it',
  };
  const L = (k) => label(k, EN[k]);

  /* ---------- disegni ---------- */
  const C = (k) => `var(--yl-c${k % 12})`;
  // simbolo per ogni colore (aiuta chi distingue poco i colori), centrato in (0,0), raggio ~6
  const SYM = [
    '<circle r="4.6"/>',
    '<path d="M0-7l2 4.4 4.8.6-3.5 3.3.9 4.8L0 3.7l-4.2 2.4.9-4.8-3.5-3.3 4.8-.6z"/>',
    '<path d="M0-7L6 0 0 7-6 0z"/>',
    '<path d="M0-6.5L6.5 5h-13z"/>',
    '<rect x="-5" y="-5" width="10" height="10" rx="2"/>',
    '<path d="M-2-6.5h4v4.5h4.5v4H2v4.5h-4V2h-4.5v-4H-2z"/>',
    '<path d="M2.5-6.5A6.5 6.5 0 1 0 6 3.5 5 5 0 0 1 2.5-6.5z"/>',
    '<path d="M0-7C3 -2.5 5.5 0 5.5 2.5a5.5 5.5 0 0 1-11 0C-5.5 0-3-2.5 0-7z"/>',
    '<g><circle cx="0" cy="-3.6" r="3"/><circle cx="3.4" cy="1.6" r="3"/><circle cx="-3.4" cy="1.6" r="3"/></g>',
    '<path d="M0-6.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 1 1 0-13zm0 3.6a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 1 0 0-5.8z" fill-rule="evenodd"/>',
    '<path d="M1.5-7.5L-5 1h4.2L-2 7.5 5-1H.8z"/>',
    '<path d="M-6.5-2.2h13v4.4h-13z"/>',
  ];

  // gomitolo-gattino in (0,0), raggio 30: orecchie, giri di lana, musetto (normale e felice), simbolo
  function ball(k, extra = '') {
    return `<g class="yl-ball${extra}" style="--c:${C(k)};--d:${(k * 0.83) % 4}s">
      <ellipse class="yl-bshadow" cx="0" cy="33" rx="25" ry="6"/>
      <g class="yl-bscale"><g class="yl-bjump">
        <path class="yl-tail" d="M22 22q16 4 13 17q-3 9-12 4"/>
        <path class="yl-ear" d="M-27-10L-22-39-4-27z"/><path class="yl-ear" d="M27-10L22-39 4-27z"/>
        <path class="yl-ear-in" d="M-21-17l2.5-14 8 6z"/><path class="yl-ear-in" d="M21-17l-2.5-14-8 6z"/>
        <circle class="yl-body" r="30"/>
        <path class="yl-wind" d="M-28 9C-12 21 12 21 28 8M-22 21C-6 30 10 30 22 21M17-25C27-12 28 4 20 22"/>
        <ellipse class="yl-gloss" cx="-13" cy="-15" rx="9" ry="5" transform="rotate(-30 -13 -15)"/>
        <g class="yl-face">
          <g class="yl-eyes"><ellipse cx="-11" cy="-1" rx="4.4" ry="5.2"/><ellipse cx="11" cy="-1" rx="4.4" ry="5.2"/>
            <circle class="yl-shine" cx="-12.4" cy="-3" r="1.7"/><circle class="yl-shine" cx="9.6" cy="-3" r="1.7"/></g>
          <path class="yl-happy" d="M-15.5 0q4.5-6.5 9 0M6.5 0q4.5-6.5 9 0"/>
          <ellipse class="yl-blush" cx="-19" cy="8" rx="5" ry="3"/><ellipse class="yl-blush" cx="19" cy="8" rx="5" ry="3"/>
          <path class="yl-mouth" d="M-6 7.5q3 4 6 0q3 4 6 0"/>
          <path class="yl-mouth-o" d="M-5 6.5q5 9 10 0z"/>
          <path class="yl-whisk" d="M-31 3l-9-2M-31 8l-9 1M31 3l9-2M31 8l9 1"/>
        </g>
        <g class="yl-sym" transform="translate(14 20) scale(.95)">${SYM[k % 12]}</g>
      </g></g></g>`;
  }

  // filo di lana lungo le caselle (centri in unità 100): ombra, peluria, corpo, ritorto, lucido
  const pts = (n, cells) => cells.map((i) => `${(i % n) * 100 + 50},${Math.floor(i / n) * 100 + 50}`).join(' ');
  function strand(points, k, cls = '', tw = 'yl-tw') {
    const pl = /yl-new|yl-tu-draw/.test(cls) ? ' pathLength="1"' : '';
    return `<g class="yl-strand ${cls}" style="--c:${C(k)}">
      <polyline class="yl-s-sh" points="${points}"${pl}/>
      <polyline class="yl-s-fz" points="${points}"/>
      <polyline class="yl-s-body" points="${points}"${pl}/>
      <polyline class="yl-s-tw" points="${points}" style="stroke:url(#${tw})"${pl}/>
      <polyline class="yl-s-hi" points="${points}"${pl}/></g>`;
  }
  const twistDef = (id) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="13" height="13" patternTransform="rotate(42)">
      <rect width="5" height="13" class="yl-twist"/></pattern>`;

  // mini-scena 3×3 per card e tutorial (cell 100, scala esterna)
  function mini(paths, endsK, opts = {}) {
    const n = 3;
    const cells = [];
    for (let i = 0; i < 9; i++) cells.push(`<rect class="yl-cell${(i + ((i / 3) | 0)) % 2 ? ' b' : ''}" x="${(i % 3) * 100 + 4}" y="${((i / 3) | 0) * 100 + 4}" width="92" height="92" rx="20"/>`);
    const yarn = paths.map(([k, p, cls]) => strand(pts(n, p), k, cls || '', opts.tw || 'yl-tw-a')).join('');
    const balls = endsK.map(([k, i, cls]) => `<g transform="translate(${(i % 3) * 100 + 50} ${((i / 3) | 0) * 100 + 50})">${ball(k, cls || '')}</g>`).join('');
    return `<defs>${twistDef(opts.tw || 'yl-tw-a')}</defs><rect class="yl-knit" x="-12" y="-12" width="324" height="324" rx="34"/>${cells.join('')}${yarn}${balls}`;
  }
  const art = () => `<svg class="yl-art" viewBox="0 0 120 90" aria-hidden="true"><g transform="translate(22.5 7.5) scale(.25)">${mini(
    [[0, [0, 3, 6, 7, 8]], [1, [1, 2, 5, 4]]],
    [[0, 0, ' on'], [0, 8, ' on'], [1, 1, ' on'], [1, 4, ' on']])}</g></svg>`;

  const hand = (...a) => (HH.tutHand ? HH.tutHand(...a) : '');
  const TUT = [
    { key: 'tu_yarn_1', en: 'Drag from a yarn ball to its twin of the same colour.',
      art: `<svg class="yl-art" viewBox="0 0 120 90"><g transform="translate(22.5 7.5) scale(.25)">${mini(
        [[0, [3, 4, 5], 'yl-tu-draw']], [[0, 3, ' yl-tu-pull'], [0, 5, ' yl-tu-join']], { tw: 'yl-tw-t1' })}</g>${hand(33, 46, 'tut-go', '--dx:54px;--dy:0px')}</svg>` },
    { key: 'tu_yarn_2', en: 'Threads never cross, and together they must fill every square!',
      art: `<svg class="yl-art" viewBox="0 0 120 90"><g transform="translate(22.5 7.5) scale(.25)">${mini(
        [[2, [0, 1, 2, 5]], [3, [3, 4]], [4, [6, 7, 8]]],
        [[2, 0, ' on'], [2, 5, ' on'], [3, 3, ' on'], [3, 4, ' on'], [4, 6, ' on'], [4, 8, ' on']], { tw: 'yl-tw-t2' })}</g>
        <g class="tut-pulse"><path d="M104 8l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z" fill="var(--sun)"/></g></svg>` },
    { key: 'tu_yarn_3', en: 'Tap a thread to erase it, or drag from it to change its path.',
      art: `<svg class="yl-art" viewBox="0 0 120 90"><g transform="translate(22.5 7.5) scale(.25)">${mini(
        [[5, [0, 1, 4, 7, 8], 'yl-tu-erase']], [[5, 0], [5, 8]], { tw: 'yl-tw-t3' })}</g>${hand(57, 47, 'tut-tap')}</svg>` },
  ];

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const Y = HH.yarn;
    let s;                 // { v, n, ends, paths, hist, moves, rethinks }
    let svg, yarnG, tintG, ballEls = [], fxG, cursorEl, statEl, barEl, hintEl, liveEl;
    let stroke = null, winTimer = 0, won = false, cursor = 0, kb = null, lastTick = 0;
    let prevConnected = new Set();

    const fresh = () => {
      const p = Y.generate(ctx.level, Math.random);
      s = { v: 1, n: p.n, ends: p.ends, paths: p.ends.map(() => []), hist: [], moves: 0, rethinks: 0 };
      build();
      ctx.changed({ reset: true });
    };

    /* ---------- DOM ---------- */
    function build() {
      clearTimeout(winTimer); won = false; stroke = null; kb = null;
      const { n } = s, W = n * 100;
      const cells = [], gaps = [];
      for (let i = 0; i < n * n; i++) {
        const x = (i % n) * 100, y = Math.floor(i / n) * 100;
        cells.push(`<rect class="yl-cell${((i % n) + Math.floor(i / n)) % 2 ? ' b' : ''}" x="${x + 4}" y="${y + 4}" width="92" height="92" rx="20"/>
          <path class="yl-stitch" d="M${x + 38} ${y + 44}l12 12 12-12"/>`);
        gaps.push(`<rect class="yl-tint" data-i="${i}" x="${x + 4}" y="${y + 4}" width="92" height="92" rx="20"/>`);
      }
      const balls = [];
      s.ends.forEach(([a, b], k) => [a, b].forEach((i) => {
        balls.push(`<g class="yl-ballpos" data-k="${k}" data-i="${i}" transform="translate(${(i % n) * 100 + 50} ${Math.floor(i / n) * 100 + 50})">${ball(k)}</g>`);
      }));
      el.innerHTML = `<div class="yl-wrap">
        <svg class="yl-board" dir="ltr" viewBox="-16 -16 ${W + 32} ${W + 32}" tabindex="0" role="application" aria-label="${L('yl_board')}">
          <defs>${twistDef('yl-tw')}</defs>
          <rect class="yl-frame" x="-16" y="-16" width="${W + 32}" height="${W + 32}" rx="44"/>
          <rect class="yl-knit" x="-6" y="-6" width="${W + 12}" height="${W + 12}" rx="36"/>
          <rect class="yl-seam" x="-9" y="-9" width="${W + 18}" height="${W + 18}" rx="39"/>
          <g class="yl-cells">${cells.join('')}</g>
          <g class="yl-tints">${gaps.join('')}</g>
          <g class="yl-yarns"></g>
          <rect class="yl-cursor" width="92" height="92" rx="22" hidden/>
          <g class="yl-balls">${balls.join('')}</g>
          <g class="yl-fx"></g>
        </svg>
        <div class="yl-foot">
          <div class="yl-pill yl-count"><svg viewBox="-42 -46 84 86" aria-hidden="true">${ball(0, ' on')}</svg><b></b></div>
          <div class="yl-pill yl-fillbar"><span class="yl-lab">${L('yl_filled')}</span><span class="yl-bar"><i></i></span><b></b></div>
        </div>
        <p class="yl-hint" aria-live="polite"></p>
        <p class="yl-live" aria-live="polite"></p>
      </div>`;
      svg = el.querySelector('.yl-board');
      yarnG = svg.querySelector('.yl-yarns');
      tintG = [...svg.querySelectorAll('.yl-tint')];
      ballEls = [...svg.querySelectorAll('.yl-ballpos')];
      fxG = svg.querySelector('.yl-fx');
      cursorEl = svg.querySelector('.yl-cursor');
      statEl = el.querySelector('.yl-count b');
      barEl = el.querySelector('.yl-fillbar');
      hintEl = el.querySelector('.yl-hint');
      liveEl = el.querySelector('.yl-live');
      prevConnected = new Set(s.paths.map((p, k) => (Y.isComplete(p, s.ends[k]) ? k : -1)).filter((k) => k >= 0));
      bind();
      paint();
    }

    // grow = filo che si sta allungando (l'ultimo tratto "si srotola")
    function paint(grow = -1) {
      const { n, ends, paths } = s;
      const show = stroke ? stroke.view : paths;
      const html = [];
      show.forEach((p, k) => {
        if (stroke && stroke.keep && k === stroke.k && stroke.keepVisible) html.push(strand(pts(n, stroke.keep), k, 'ghost'));
        if (p.length < 2) return;
        const animate = k === grow && p.length >= 2;
        const body = animate ? p.slice(0, -1) : p;
        if (body.length >= 2) html.push(strand(pts(n, body), k, stroke && stroke.k === k ? 'live' : ''));
        if (animate) html.push(strand(pts(n, p.slice(-2)), k, 'yl-new'));
      });
      yarnG.innerHTML = html.join('');
      const own = new Int8Array(n * n).fill(-1);
      show.forEach((p, k) => p.forEach((c) => { own[c] = k; }));
      ends.forEach(([a, b], k) => { own[a] = own[b] = k; });
      tintG.forEach((r, i) => {
        const k = own[i];
        r.classList.toggle('on', k >= 0);
        if (k >= 0) r.style.setProperty('--c', C(k)); else r.style.removeProperty('--c');
      });
      const st = Y.status(n, ends, show);
      const conn = new Set();
      show.forEach((p, k) => { if (Y.isComplete(p, ends[k])) conn.add(k); });
      ballEls.forEach((g) => {
        const k = +g.dataset.k, i = +g.dataset.i, b = g.firstElementChild;
        b.classList.toggle('on', conn.has(k));
        b.classList.toggle('pull', !!(stroke && stroke.k === k && stroke.drawn[0] === i && !conn.has(k)));
        const len = (show[k] || []).length;
        b.style.setProperty('--sz', (1 - Math.min(0.2, len * 0.012)).toFixed(3));
      });
      // festa per le coppie appena collegate
      conn.forEach((k) => { if (!prevConnected.has(k)) party(k); });
      prevConnected = conn;
      statEl.textContent = `${st.connected}/${st.colors}`;
      const pct = Math.floor((st.filled / st.total) * 100);
      barEl.querySelector('i').style.width = pct + '%';
      barEl.querySelector('b').textContent = pct + '%';
      const needFill = st.connected === st.colors && st.filled < st.total && !stroke;
      hintEl.textContent = needFill ? L('yl_fill') : '';
      svg.classList.toggle('needfill', needFill);
      el.querySelector('.yl-wrap').classList.toggle('gaps', needFill);
      if (cursorEl && kb !== null) {
        cursorEl.removeAttribute('hidden');
        cursorEl.setAttribute('x', (cursor % n) * 100 + 4);
        cursorEl.setAttribute('y', Math.floor(cursor / n) * 100 + 4);
        cursorEl.classList.toggle('hold', !!stroke);
      }
      return st;
    }

    function party(k) {
      const { n } = s;
      ctx.sfx.place();
      ctx.react && ctx.react('happy');
      ballEls.forEach((g) => {
        if (+g.dataset.k !== k) return;
        const b = g.firstElementChild;
        b.classList.remove('yay'); void b.getBBox(); b.classList.add('yay');
      });
      const i = s.ends[k][1], j = s.ends[k][0];
      const out = [];
      [i, j].forEach((c, q) => {
        const x = (c % n) * 100 + 50, y = Math.floor(c / n) * 100 + 50;
        for (let t = 0; t < 6; t++) {
          const a = (t / 6) * Math.PI * 2 + q;
          out.push(`<g transform="translate(${x} ${y})"><path class="yl-spark" style="--dx:${(Math.cos(a) * 58).toFixed(1)}px;--dy:${(Math.sin(a) * 58).toFixed(1)}px;--c:${t % 2 ? 'var(--yl-spark)' : C(k)}" d="M0-9l2.6 6.4 6.4 2.6-6.4 2.6L0 9l-2.6-6.4L-9 0l6.4-2.6z"/></g>`);
        }
        if (q === 0) out.push(`<g transform="translate(${Math.min(n * 100 - 60, Math.max(60, x))} ${Math.max(30, y - 46)})"><text class="yl-meow" text-anchor="middle">${L('yl_meow')}</text></g>`);
      });
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tmp.innerHTML = out.join('');
      fxG.appendChild(tmp);
      setTimeout(() => tmp.remove(), 1100);
    }

    /* ---------- mosse ---------- */
    const copy = (paths) => paths.map((p) => p.slice());
    const same = (a, b) => a.every((p, k) => p.length === b[k].length && p.every((v, i) => v === b[k][i]));
    function pushHist(before) {
      s.hist.push(before);
      if (s.hist.length > 80) s.hist.shift();
    }
    function commit(before, after, sound = true) {
      if (same(before, after)) return false;
      pushHist(before);
      s.paths = after;
      s.moves++;
      if (Y.lostCells(before, after) > 0) s.rethinks++;
      if (sound) ctx.sfx.mark();
      return true;
    }
    function afterMove() {
      const st = paint();
      ctx.changed();
      announce(st);
      if (st.solved && !won) {
        won = true;
        svg.classList.add('win');
        clearTimeout(winTimer);
        winTimer = setTimeout(ctx.win, 1100);
      }
    }
    function announce(st) {
      liveEl.textContent = `${L('yl_yarns')} ${st.connected}/${st.colors} · ${L('yl_filled')} ${Math.floor((st.filled / st.total) * 100)}%`;
    }
    function erase(k) {
      if (!s.paths[k].length) return;
      const before = copy(s.paths), after = copy(s.paths);
      after[k] = [];
      commit(before, after, false);
      ctx.sfx.lightOff ? ctx.sfx.lightOff() : ctx.sfx.mark();
      afterMove();
    }

    // passo del filo verso la casella j (anche se il dito salta più caselle: si va una alla volta)
    function stepTo(j) {
      const n = s.n;
      let moved = false;
      for (let guard = 0; guard < 2 * n; guard++) {
        const last = stroke.drawn[stroke.drawn.length - 1];
        if (last === j) break;
        const dr = Math.floor(j / n) - Math.floor(last / n), dc = (j % n) - (last % n);
        const next = Math.abs(dc) >= Math.abs(dr) ? last + Math.sign(dc) : last + Math.sign(dr) * n;
        const d = Y.strokeStep(n, s.ends, stroke.k, stroke.drawn, stroke.keep, next);
        if (!d) break;
        const grew = d.length > stroke.drawn.length;
        stroke.drawn = d;
        moved = true;
        if (grew) {
          const now = Date.now();
          if (now - lastTick > 70) { ctx.sfx.mark(); lastTick = now; }
        }
      }
      if (!moved) return;
      stroke.moved = true;
      stroke.view = Y.strokePaths(stroke.before, stroke.k, stroke.drawn, stroke.keep);
      const joined = stroke.keep && stroke.keep.indexOf(stroke.drawn[stroke.drawn.length - 1]) >= 0;
      stroke.keepVisible = !!stroke.keep && !joined;
      const p = stroke.view[stroke.k];
      const prevLen = stroke.len || 0;
      stroke.len = p.length;
      paint(p.length > prevLen && !joined ? stroke.k : -1);
    }

    function startStroke(i) {
      const b = Y.beginStroke(s.n, s.ends, s.paths, i);
      if (!b) return false;
      stroke = { k: b.k, drawn: b.drawn, keep: b.keep, keepVisible: !!b.keep, before: copy(s.paths), view: copy(s.paths), start: i, moved: false, len: s.paths[b.k].length };
      // finché non ci si muove, la vista resta quella di prima (un tocco cancella)
      return true;
    }
    function endStroke(cancel = false) {
      const st = stroke;
      stroke = null;
      if (!st) return;
      if (cancel) { paint(); return; }
      if (!st.moved) {
        // tocco: cancella il filo toccato
        const own = Y.owner(s.paths, st.start);
        const e = Y.endpointOwner(s.ends, st.start);
        const k = own ? own.k : e;
        if (k >= 0 && s.paths[k].length) { erase(k); return; }
        paint();
        return;
      }
      if (commit(st.before, st.view)) afterMove(); else paint();
    }

    /* ---------- input ---------- */
    function cellAt(e) {
      const m = svg.getScreenCTM();
      if (!m) return -1;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(m.inverse());
      const c = Math.floor(p.x / 100), r = Math.floor(p.y / 100);
      return c < 0 || r < 0 || c >= s.n || r >= s.n ? -1 : r * s.n + c;
    }
    function bind() {
      svg.addEventListener('pointerdown', (e) => {
        if (won || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const i = cellAt(e);
        if (i < 0) return;
        e.preventDefault();
        kb = null; cursorEl.setAttribute('hidden', '');
        if (stroke) endStroke(true);
        if (!startStroke(i)) { ctx.sfx.tap && ctx.sfx.tap(); return; }
        stroke.pid = e.pointerId;
        try { svg.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
        paint();
      });
      svg.addEventListener('pointermove', (e) => {
        if (!stroke || stroke.pid !== e.pointerId) return;
        const j = cellAt(e);
        if (j >= 0) stepTo(j);
      });
      const up = (e) => { if (stroke && stroke.pid === e.pointerId) endStroke(e.type === 'pointercancel' && !stroke.moved); };
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
      svg.addEventListener('keydown', onKey);
      svg.addEventListener('focus', () => { if (kb === null) { kb = 1; paint(); } });
      svg.addEventListener('blur', () => { if (stroke && stroke.pid === 'kb') endStroke(); kb = null; cursorEl.setAttribute('hidden', ''); });
    }
    function onKey(e) {
      if (won) return;
      const n = s.n, r = Math.floor(cursor / n), c = cursor % n;
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      kb = 1;
      if (mv) {
        e.preventDefault();
        const rr = r + mv[0], cc = c + mv[1];
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) return;
        const j = rr * n + cc;
        if (stroke) {
          const before = stroke.drawn.length;
          stepTo(j);
          if (stroke.drawn[stroke.drawn.length - 1] === j || stroke.drawn.length !== before) cursor = stroke.drawn[stroke.drawn.length - 1];
        } else cursor = j;
        paint();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (stroke) { stroke.moved = true; endStroke(); paint(); }
        else if (startStroke(cursor)) { stroke.pid = 'kb'; stroke.moved = false; paint(); }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (stroke) endStroke(true);
        const own = Y.owner(s.paths, cursor), k = own ? own.k : Y.endpointOwner(s.ends, cursor);
        if (k >= 0) erase(k);
      } else if (e.key === 'Escape' && stroke) { e.preventDefault(); endStroke(true); }
    }

    /* ---------- avvio ---------- */
    function restart() {
      clearTimeout(winTimer);
      s.paths = s.ends.map(() => []);
      s.hist = []; s.moves = 0; s.rethinks = 0;
      build();
      ctx.changed({ reset: true });
    }

    function load(sv) {
      if (!sv || !Y.validLevel(sv) || !Array.isArray(sv.paths) || sv.paths.length !== sv.ends.length) return false;
      const okSet = (paths) => {
        if (!Array.isArray(paths) || paths.length !== sv.ends.length) return false;
        const seen = new Set();
        return paths.every((p, k) => Y.validPath(sv.n, sv.ends, k, p) && p.every((c) => !seen.has(c) && seen.add(c)));
      };
      if (!okSet(sv.paths)) return false;
      s = { v: 1, n: sv.n, ends: sv.ends, paths: sv.paths, hist: Array.isArray(sv.hist) ? sv.hist.filter(okSet).slice(-80) : [],
        moves: +sv.moves || 0, rethinks: +sv.rethinks || 0 };
      return true;
    }
    if (load(saved)) build(); else fresh();
    if (Y.isSolved(s.n, s.ends, s.paths)) restart();   // mai ripartire da un livello già risolto

    return {
      fresh,
      restart,
      undo() {
        if (won || !s.hist.length) return;
        if (stroke) endStroke(true);
        s.paths = s.hist.pop();
        s.moves = Math.max(0, s.moves - 1);
        s.rethinks++;
        ctx.sfx.mark();
        afterMove();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'yarn', name: 'Yarn Link', rules: 'r9', art, create,
    tutorial: TUT,
    // fragoline: 3 con ≤ 1 ripensamento (≤ 2 con 8+ colori), 2 fino a un ripensamento per colore, 1 oltre
    rate: (s) => HH.yarn.rate(s.rethinks, s.ends.length),
    parTime: (s) => Math.round(s.n * s.n * 1.6),
    progress: (s) => HH.yarn.progress(s.n, s.ends, s.paths),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
