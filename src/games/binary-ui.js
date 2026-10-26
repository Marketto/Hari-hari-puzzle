/* Mochi Binary — interfaccia (Takuzu con mochi alla fragola e al matcha).
 * Vassoio di legno con piattini; ogni piattino può ospitare un mochi rosa (fragola) o verde (matcha).
 *
 * Comandi:  tocco = vuoto → rosa → verde → vuoto
 *           trascinamento = "pennello": dipinge sulle celle attraversate il valore che il tocco darebbe alla prima cella
 *           tastiera: frecce per muoversi, Invio/Spazio = cicla, 1/P = rosa, 2/G = verde, 0/Canc/Backspace = vuoto
 * Indizi fissi: piattino scuro + stecchino con bandierina, non modificabili.
 *
 * Verifica:
 *   - violazioni di regola (tris, troppi di un colore, righe/colonne complete uguali): celle evidenziate e mochi preoccupati,
 *     SENZA perdere cuori
 *   - cuore perso (max uno per azione) quando un'azione COMPLETA una riga o colonna diversa dalla soluzione;
 *     da quel momento i mochi di quella linea restano preoccupati finché la linea è completa e sbagliata
 *   - linea completata giusta: mochi felici + scintille
 *   - vittoria: i mochi fanno la ola
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const LIVES = 3;
  const SETTLE_MS = 900;
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    mb_pink: 'Strawberry mochi', mb_green: 'Matcha mochi', mb_empty: 'Empty plate', mb_fixed: 'fixed',
    mb_row: 'Row', mb_col: 'Column', mb_hint: 'Tap: pink → green → empty · drag to paint',
    mb_lives: 'A wrong full line costs a heart', mb_board: 'Mochi tray',
  };
  const L = (k) => label(k, EN[k]);

  /* ---------- disegni (viewBox 100×100, colori solo da token --mb-*) ---------- */
  const OL = 'stroke="var(--mb-ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const BODY = {
    1: 'M15 69C15 41 32 24 50 24C68 24 85 41 85 69C85 82 70 87 50 87C30 87 15 82 15 69Z',
    2: 'M11 72C11 50 28 34 50 34C72 34 89 50 89 72C89 84 73 88 50 88C27 88 11 84 11 72Z',
  };
  const TOP = {
    // fragolina con foglie e semini
    1: `<g class="mb-top"><path d="M50 30C41 30 37 21 40 15C43 10 50 12 50 12C50 12 57 10 60 15C63 21 59 30 50 30Z" fill="var(--mb-berry)" ${OL} stroke-width="2.4"/>
        <path d="M43 13L47 9L50 12L53 9L57 13" fill="var(--mb-leaf)" ${OL} stroke-width="2"/>
        <circle cx="46" cy="19" r="1.3" fill="var(--mb-seed)"/><circle cx="53" cy="18" r="1.3" fill="var(--mb-seed)"/><circle cx="50" cy="24" r="1.3" fill="var(--mb-seed)"/></g>`,
    // fogliolina di tè e spolverata di matcha
    2: `<g class="mb-top"><path d="M50 34C47 25 52 17 62 15C63 25 58 32 50 34Z" fill="var(--mb-leaf)" ${OL} stroke-width="2.4"/>
        <path d="M51 32Q55 24 60 18" fill="none" stroke="var(--mb-leaf-2)" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="30" cy="48" r="1.6" fill="var(--mb-dust)"/><circle cx="37" cy="42" r="1.3" fill="var(--mb-dust)"/><circle cx="68" cy="45" r="1.5" fill="var(--mb-dust)"/><circle cx="74" cy="52" r="1.2" fill="var(--mb-dust)"/></g>`,
  };
  const PIN = `<g class="mb-pin"><path d="M80 6L68 40" stroke="var(--mb-pin-stick)" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M80 6L94 11L82 18Z" fill="var(--mb-pin)" stroke="var(--mb-ink)" stroke-width="1.8" stroke-linejoin="round"/></g>`;
  function face(v) {
    const y = v === 1 ? 60 : 64;
    const eye = (x) => `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="5.6" fill="var(--mb-eye)"/><circle cx="${x + 1.6}" cy="${y - 2}" r="1.9" fill="var(--mb-hi)"/><circle cx="${x - 1.4}" cy="${y + 2.2}" r=".9" fill="var(--mb-hi)"/>`;
    const joy = (x) => `<path d="M${x - 5} ${y + 1.5}Q${x} ${y - 5.5} ${x + 5} ${y + 1.5}" fill="none" stroke="var(--mb-eye)" stroke-width="3" stroke-linecap="round"/>`;
    const sad = (x, d) => `<ellipse cx="${x}" cy="${y + 1}" rx="3.6" ry="4.4" fill="var(--mb-eye)"/><circle cx="${x + 1}" cy="${y - .5}" r="1.3" fill="var(--mb-hi)"/>
      <path d="M${x - 5} ${y - 7 - d}L${x + 5} ${y - 7 + d}" stroke="var(--mb-eye)" stroke-width="2.2" stroke-linecap="round"/>`;
    return `<g class="mb-face">
      <ellipse cx="29" cy="${y + 9}" rx="6.5" ry="3.6" fill="var(--mb-blush)"/><ellipse cx="71" cy="${y + 9}" rx="6.5" ry="3.6" fill="var(--mb-blush)"/>
      <g class="mb-f-calm">${eye(38)}${eye(62)}<path d="M45 ${y + 8}Q47.5 ${y + 11} 50 ${y + 8}Q52.5 ${y + 11} 55 ${y + 8}" fill="none" stroke="var(--mb-ink)" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="mb-f-happy">${joy(38)}${joy(62)}<path d="M43 ${y + 6}Q50 ${y + 7} 57 ${y + 6}Q56 ${y + 15} 50 ${y + 15}Q44 ${y + 15} 43 ${y + 6}Z" fill="var(--mb-mouth)" ${OL} stroke-width="2"/><path d="M46 ${y + 12}Q50 ${y + 9.5} 54 ${y + 12}Q50 ${y + 15} 46 ${y + 12}Z" fill="var(--mb-tongue)"/></g>
      <g class="mb-f-worry">${sad(38, -2)}${sad(62, 2)}<path d="M43 ${y + 11}Q46.5 ${y + 7} 50 ${y + 11}Q53.5 ${y + 15} 57 ${y + 11}" fill="none" stroke="var(--mb-ink)" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M80 ${y - 18}Q85 ${y - 9} 80 ${y - 6}Q75 ${y - 9} 80 ${y - 18}Z" fill="var(--mb-sweat)" stroke="var(--mb-ink)" stroke-width="1.4"/></g>
    </g>`;
  }
  const CACHE = {};
  function mochi(v, given) {
    const key = v + (given ? 'g' : '');
    if (CACHE[key]) return CACHE[key];
    const c = v === 1 ? 'pink' : 'green';
    return (CACHE[key] = `<svg class="mb-mochi mb-${c}" viewBox="0 0 100 100" aria-hidden="true">
      <ellipse class="mb-shadow" cx="50" cy="89" rx="34" ry="6" fill="var(--mb-shadow)"/>
      <g class="mb-body">
        ${given ? PIN : ''}
        <path d="${BODY[v]}" fill="var(--mb-${c})" ${OL}/>
        <path d="${v === 1 ? 'M20 74C30 82 70 82 80 74C79 81 68 84 50 84C32 84 21 81 20 74Z' : 'M16 77C28 84 72 84 84 77C82 83 70 85 50 85C30 85 18 83 16 77Z'}" fill="var(--mb-${c}-2)"/>
        <ellipse cx="${v === 1 ? 33 : 30}" cy="${v === 1 ? 40 : 48}" rx="9" ry="5" transform="rotate(-28 ${v === 1 ? 33 : 30} ${v === 1 ? 40 : 48})" fill="var(--mb-${c}-hi)"/>
        ${TOP[v]}
        ${face(v)}
      </g>
    </svg>`);
  }

  // illustrazione della card (120×90)
  const art = () => {
    const cells = [[1, 2, 1], [2, 1, 2], [2, 2, 1]];
    const sz = 27;
    let out = `<rect x="16" y="1" width="88" height="88" rx="12" fill="var(--mb-tray)"/><rect x="18" y="3" width="84" height="84" rx="10" fill="none" stroke="var(--mb-tray-line)" stroke-width="2"/>`;
    cells.forEach((row, r) => row.forEach((v, c) => {
      const x = 19 + c * (sz + 1.5), y = 4 + r * (sz + 1.5);
      out += `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="7" fill="${r === 0 && c === 0 ? 'var(--mb-given)' : 'var(--mb-cup)'}"/>`;
      if (r === 2 && c === 2) return;
      out += mochi(v, r === 0 && c === 0).replace('<svg class="mb-mochi', `<svg x="${x + 1}" y="${y + 1}" width="${sz - 2}" height="${sz - 2}" class="mb-mochi`);
    }));
    return `<svg viewBox="0 0 120 90" class="mb-art" aria-hidden="true">${out}</svg>`;
  };

  /* ---------- tutorial: mini illustrazioni animate (120×90) ---------- */
  const m = (v, x, y, s = 28, cls = '', given = false) => mochi(v, given).replace('<svg class="mb-mochi', `<svg x="${x}" y="${y}" width="${s}" height="${s}" class="mb-mochi ${cls}`);
  const cup = (x, y, s = 30, given = false) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="var(${given ? '--mb-given' : '--mb-cup'})" stroke="var(--mb-tray-line)" stroke-width="1.5"/>`;
  const TUT = [
    `<svg viewBox="0 0 120 90" class="mb-tu mb-tu1" aria-hidden="true"><rect x="2" y="14" width="116" height="62" rx="14" fill="var(--mb-tray)"/>
      ${cup(45, 30)}<g class="mb-tu-a">${m(1, 46, 31)}</g><g class="mb-tu-b">${m(2, 46, 31)}</g>
      <path d="M22 45h14M84 45h14" stroke="var(--mb-text)" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 6"/>
      <g class="mb-tu-finger"><circle cx="72" cy="62" r="9" fill="var(--mb-hi)" stroke="var(--mb-ink)" stroke-width="2.4"/><circle cx="72" cy="62" r="14" fill="none" stroke="var(--mb-focus)" stroke-width="2.4" class="mb-tu-ring"/></g></svg>`,
    `<svg viewBox="0 0 120 90" class="mb-tu mb-tu2" aria-hidden="true"><rect x="2" y="24" width="116" height="42" rx="12" fill="var(--mb-tray)"/>
      ${cup(6, 30)}${cup(34, 30)}${cup(62, 30)}${cup(90, 30)}
      ${m(1, 7, 31)}${m(1, 35, 31)}<g class="mb-tu-a">${m(1, 63, 31, 28, 'mb-wobble')}<path d="M64 32l26 26M90 32l-26 26" stroke="var(--mb-bad)" stroke-width="4" stroke-linecap="round"/></g>
      <g class="mb-tu-b">${m(2, 63, 31)}</g>${m(2, 91, 31)}
      <path d="M8 78h50M62 78h50" stroke="var(--mb-pink-2)" stroke-width="5" stroke-linecap="round"/><path d="M62 78h50" stroke="var(--mb-green-2)" stroke-width="5" stroke-linecap="round"/></svg>`,
    `<svg viewBox="0 0 120 90" class="mb-tu mb-tu3" aria-hidden="true"><rect x="2" y="6" width="80" height="78" rx="12" fill="var(--mb-tray)"/>
      ${cup(8, 12, 22, true)}${cup(31, 12, 22)}${cup(54, 12, 22)}${cup(8, 56, 22)}${cup(31, 56, 22)}${cup(54, 56, 22)}
      <g class="mb-tu-pin">${m(1, 8, 12, 22, '', true)}</g>${m(2, 31, 12, 22)}${m(1, 54, 12, 22)}
      ${m(2, 8, 56, 22)}${m(1, 31, 56, 22)}${m(2, 54, 56, 22)}
      <text x="42" y="51" text-anchor="middle" font-size="18" font-weight="800" fill="var(--mb-bad)">≠</text>
      <g class="mb-tu-lock"><circle cx="102" cy="34" r="13" fill="var(--mb-given)" stroke="var(--mb-ink)" stroke-width="2"/><path d="M102 25L102 41M102 25L110 28L102 31" stroke="var(--mb-ink)" stroke-width="2.4" fill="var(--mb-pin)" stroke-linejoin="round" stroke-linecap="round"/></g></svg>`,
  ];
  const tutorial = [
    { key: 'tu_binary_1', en: 'Tap a plate: strawberry mochi, then matcha, then empty again.', art: TUT[0] },
    { key: 'tu_binary_2', en: 'Never three alike in a line, and each row and column has as many pink as green.', art: TUT[1] },
    { key: 'tu_binary_3', en: 'No two rows or columns may match; mochi with a flag are fixed.', art: TUT[2] },
  ];

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const B = HH.binary;
    let s;                         // { v, n, level, tier, seed, solution, givens, board, hist, moves, mistakes }
    let grid, cells = [], fillEl, focusI = 0, winTimer = 0, settleTimer = 0, won = false;
    let given = new Set();
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); clearTimeout(winTimer); clearTimeout(settleTimer); };

    function fresh() {
      const level = ctx.level;
      const seed = (Math.random() * 2147483647) | 0;
      const p = B.generate(level, HH.rng(seed));
      s = { v: 1, n: p.n, level, tier: p.tier, seed, solution: p.solution, givens: p.givens, board: p.clues.slice(), settled: p.clues.slice(), hist: [], moves: 0, mistakes: 0 };
      build();
      ctx.changed({ reset: true });
    }

    function cellLabel(i) {
      const r = (i / s.n) | 0, c = i % s.n, v = s.board[i];
      return `${L('mb_row')} ${r + 1}, ${L('mb_col')} ${c + 1}: ${L(v === 1 ? 'mb_pink' : v === 2 ? 'mb_green' : 'mb_empty')}${given.has(i) ? ` (${L('mb_fixed')})` : ''}`;
    }

    /* ---------- DOM ---------- */
    function build() {
      clearTimers();
      won = false;
      const n = s.n;
      given = new Set(s.givens);
      const html = [];
      for (let i = 0; i < n * n; i++) {
        const r = (i / n) | 0, c = i % n;
        html.push(`<button type="button" class="mb-cell${given.has(i) ? ' given' : ''}" data-i="${i}" data-v="-1" tabindex="${i === focusI ? 0 : -1}" style="--r:${r};--c:${c}"></button>`);
      }
      el.innerHTML = `<div class="mb-wrap" style="--n:${n}">
        <div class="mb-bar" aria-hidden="true">
          <span class="mb-buddy">${mochi(1)}</span>
          <span class="mb-track"><span class="mb-fill"></span></span>
          <span class="mb-buddy b2">${mochi(2)}</span>
        </div>
        <div class="mb-tray">
          <div class="mb-grid n${n}" dir="ltr" role="grid" aria-label="${L('mb_board')}">${html.join('')}</div>
        </div>
        <p class="mb-hint">${L('mb_hint')}<br><small>${L('mb_lives')}</small></p>
      </div>`;
      grid = el.querySelector('.mb-grid');
      cells = [...grid.children];
      fillEl = el.querySelector('.mb-fill');
      focusI = Math.min(focusI, n * n - 1);
      paint();
    }

    // stato visivo: valore, violazioni, umore dei mochi
    function paint(pop = []) {
      const n = s.n, b = s.board;
      const chk = B.check(n, b);
      const happy = new Set(), worry = new Set(chk.bad);
      // l'esito delle linee complete si mostra solo dopo il giudizio (linea uguale alla griglia "assestata")
      for (let k = 0; k < 2 * n; k++) {
        if (!B.lineComplete(n, b, k)) continue;
        const lc = B.lineCells(n, k);
        if (lc.some((i) => s.settled[i] !== b[i])) continue;
        if (B.lineRight(n, b, s.solution, k)) lc.forEach((i) => happy.add(i));
        else lc.forEach((i) => worry.add(i));
      }
      cells.forEach((el2, i) => {
        const v = b[i];
        if (+el2.dataset.v !== v) {
          el2.dataset.v = v;
          el2.innerHTML = v ? mochi(v, given.has(i)) : '';
          el2.setAttribute('aria-label', cellLabel(i));
        }
        el2.classList.toggle('bad', chk.bad.has(i));
        el2.classList.toggle('m-worry', !!v && worry.has(i));
        el2.classList.toggle('m-happy', !!v && !worry.has(i) && happy.has(i));
        if (pop.includes(i)) { el2.classList.remove('pop'); void el2.offsetWidth; el2.classList.add('pop'); }
      });
      const free = n * n - s.givens.length;
      const filled = b.filter((v) => v).length - s.givens.length;
      fillEl.style.width = `${Math.round((100 * filled) / Math.max(1, free))}%`;
      if (!won && B.isSolved(s.solution, b)) celebrate();
      return chk;
    }

    function celebrate() {
      won = true;
      clearTimeout(settleTimer);
      s.settled = s.board.slice();
      grid.classList.add('solved');
      ctx.sfx.cupDone();
      winTimer = setTimeout(ctx.win, 1500 + s.n * 40);
    }

    function sparkLine(k) {
      B.lineCells(s.n, k).forEach((i, j) => {
        const c = cells[i];
        c.classList.remove('glow'); void c.offsetWidth; c.classList.add('glow');
        c.style.setProperty('--j', j);
        const sp = document.createElement('span');
        sp.className = 'mb-spark';
        sp.style.setProperty('--j', j);
        c.appendChild(sp);
        later(() => { sp.remove(); c.classList.remove('glow'); }, 900 + j * 45);
      });
    }
    function oopsLine(k) {
      B.lineCells(s.n, k).forEach((i) => {
        const c = cells[i];
        c.classList.remove('oops'); void c.offsetWidth; c.classList.add('oops');
        later(() => c.classList.remove('oops'), 900);
      });
    }

    /* ---------- mosse ---------- */
    const next = (v) => (v + 1) % 3;

    /* Giudizio "assestato": le linee completate si giudicano SETTLE_MS dopo l'ultima mossa, confrontando con
     * l'ultima griglia giudicata (s.settled). Così ciclare rosa → verde sull'ultima cella di una riga non costa cuori. */
    function scheduleSettle() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, SETTLE_MS);
    }
    function settle() {
      clearTimeout(settleTimer);
      if (won || s.mistakes >= LIVES) return;
      const changed = [];
      s.board.forEach((v, i) => { if (v !== s.settled[i]) changed.push(i); });
      if (!changed.length) return;
      const j = B.judge(s.n, s.solution, s.settled, s.board, changed);
      s.settled = s.board.slice();
      paint();
      j.right.forEach(sparkLine);
      j.wrong.forEach(oopsLine);
      if (j.wrong.length) {
        s.mistakes++;
        ctx.changed();
        ctx.mistake(LIVES - s.mistakes);
        return;
      }
      if (j.right.length) ctx.sfx.cupDone();
      ctx.changed();
    }

    // un'azione = una o più celle cambiate rispetto a `before`
    function commit(before, touched) {
      const changed = touched.filter((i) => before[i] !== s.board[i]);
      if (!changed.length) return;
      s.hist.push({ board: before });
      if (s.hist.length > 80) s.hist.shift();
      s.moves++;
      const badBefore = B.check(s.n, before).bad;
      const chk = paint(changed.filter((i) => s.board[i]));
      if (won) { ctx.changed(); return; }
      const newBad = changed.some((i) => chk.bad.has(i) && !badBefore.has(i));
      if (newBad) { ctx.sfx.lightOff(); ctx.react('oops'); }
      else if (changed.some((i) => s.board[i])) ctx.sfx.place();
      else ctx.sfx.mark();
      scheduleSettle();
      ctx.changed();
    }

    function setCell(i, v) {
      if (won || given.has(i) || s.mistakes >= LIVES) return;
      const before = s.board.slice();
      s.board[i] = v;
      commit(before, [i]);
    }
    function locked(i) {
      const c = cells[i];
      c.classList.remove('locked'); void c.offsetWidth; c.classList.add('locked');
      later(() => c.classList.remove('locked'), 500);
      ctx.sfx.tap();
    }
    function tap(i) {
      if (given.has(i)) { locked(i); return; }
      setCell(i, next(s.board[i]));
    }

    /* ---------- input: tocco e trascinamento ---------- */
    let stroke = null;
    const cellAt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const b = e && e.closest && e.closest('.mb-cell');
      return b && grid.contains(b) ? +b.dataset.i : -1;
    };
    function focusCell(i, move = true) {
      cells[focusI] && cells[focusI].setAttribute('tabindex', -1);
      focusI = i;
      cells[i].setAttribute('tabindex', 0);
      if (move) cells[i].focus();
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('.mb-cell');
      if (b && e.detail === 0) tap(+b.dataset.i);       // tastiera / lettori di schermo
    });
    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.mb-cell');
      if (!b || won || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const i = +b.dataset.i;
      focusCell(i, false);
      if (given.has(i)) { locked(i); return; }
      stroke = { start: i, moved: false, before: s.board.slice(), seen: new Set([i]), v: next(s.board[i]) };
      try { grid.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!stroke) return;
      const j = cellAt(e.clientX, e.clientY);
      if (j < 0 || stroke.seen.has(j)) return;
      if (!stroke.moved) { stroke.moved = true; s.board[stroke.start] = stroke.v; }
      stroke.seen.add(j);
      if (!given.has(j)) s.board[j] = stroke.v;
      paint([stroke.start, j].filter((x) => s.board[x]));
    });
    function end() {
      if (!stroke) return;
      const st = stroke;
      stroke = null;
      if (st.moved) commit(st.before, [...st.seen].filter((i) => !given.has(i)));
      else tap(st.start);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('keydown', (e) => {
      const b = e.target.closest && e.target.closest('.mb-cell');
      if (!b) return;
      const i = +b.dataset.i, n = s.n, r = (i / n) | 0, c = i % n;
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (mv) {
        e.preventDefault();
        const rr = Math.max(0, Math.min(n - 1, r + mv[0])), cc = Math.max(0, Math.min(n - 1, c + mv[1]));
        focusCell(rr * n + cc);
        return;
      }
      const k = e.key.toLowerCase();
      const v = k === '1' || k === 'p' ? 1 : k === '2' || k === 'g' ? 2 : k === '0' || k === 'backspace' || k === 'delete' ? 0 : -1;
      if (v < 0) return;
      e.preventDefault();
      if (given.has(i)) locked(i); else if (s.board[i] !== v) setCell(i, v);
    });

    /* ---------- avvio ---------- */
    function restart() {
      clearTimers();
      s.board = s.board.map((v, i) => (given.has(i) ? s.solution[i] : 0));
      s.settled = s.board.slice();
      s.hist = []; s.moves = 0; s.mistakes = 0;
      build();
      ctx.changed({ reset: true });
    }

    if (saved && B.validate(saved)) {
      s = Object.assign({ hist: [], moves: 0, mistakes: 0 }, saved);
      s.hist = (Array.isArray(s.hist) ? s.hist : []).filter((h) => h && Array.isArray(h.board) && h.board.length === s.n * s.n);
      if (s.mistakes >= LIVES) { s.mistakes = 0; s.board = s.board.map((v, i) => (s.givens.includes(i) ? v : 0)); s.hist = []; }
      if (!Array.isArray(s.settled) || s.settled.length !== s.board.length) s.settled = s.board.slice();
      build();
      if (s.settled.some((v, i) => v !== s.board[i])) scheduleSettle();   // mossa lasciata a metà prima di chiudere
    } else fresh();

    return {
      fresh,
      restart,
      undo() {
        if (won || !s.hist.length || s.mistakes >= LIVES) return;
        clearTimeout(settleTimer);
        s.board = s.hist.pop().board;
        s.settled = s.board.slice();            // annullare non costa cuori
        s.moves = Math.max(0, s.moves - 1);
        paint(); ctx.sfx.mark(); ctx.changed();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'binary', name: 'Mochi Binary', rules: 'r8', art, create, lives: LIVES, tutorial,
    rate: (s) => Math.max(1, 3 - (s.mistakes || 0)),
    parTime: (s) => Math.round(s.n * s.n * 1.6),
    progress: (s) => {
      let ok = 0;
      s.board.forEach((v, i) => { if (v && v === s.solution[i]) ok++; });
      const free = s.n * s.n - s.givens.length;
      return Math.max(0, Math.min(1, (ok - s.givens.length) / Math.max(1, free)));
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
