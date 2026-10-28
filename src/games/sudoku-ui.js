/* Hari Sudoku — interfaccia.
 * Sudoku classico 9×9 con i numeri. Hari (il riccio animato di hog-kit.js, lo stesso dei ricci di Hedgedoku) sta sopra
 * la griglia e reagisce a ogni mossa con espressioni e una nuvoletta: incoraggia quando sei fermo (indicando una casella
 * facile), festeggia righe/colonne/riquadri e numeri completati, si dispiace per gli errori, si spaventa all'ultimo cuore.
 *
 * Comandi: tocca una casella, poi un numero del tastierino. Matita = note (si aggiornano da sole con "Auto").
 *   Gomma, Annulla, Aiuto (1° tocco: spiega la tecnica ed evidenzia le caselle · 2° tocco: mette il numero).
 *   Tastiera: frecce, 1–9, Canc/Backspace = gomma, N = matita, H = aiuto.
 * Errori: un numero diverso dalla soluzione diventa rosso e costa un cuore (3 cuori, come Hedgedoku).
 * Stato (snapshot JSON): vedi sudoku-logic.js (note e cronologia degli annulla comprese).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const LIVES = 3;
  const IDLE_MS = 20000;
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const fill = (str, vars = {}) => str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const reducedMotion = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- frasi di Hari: pool per categoria (chiave, inglese di riserva), senza ripetere le ultime 2 ---------- */
  const P = (k, en) => ({ k, en });
  const LINES = {
    start: [P('m_start1', "Let's play together!"), P('m_start2', "You've got this!"), P('m_poke2', "Let's solve a puzzle!"),
      P('sk_start1', "Pick a square, then a number. I'm cheering for you!"), P('sk_start2', 'Every row, column and box needs 1 to 9!'),
      P('sk_start3', "Fresh puzzle! Let's look for an easy number first.")],
    good: [P('m_good1', 'Great move!'), P('m_good2', "You're doing great!"), P('sk_good1', "Yes! That's the one!"),
      P('sk_good2', 'Nice eye!'), P('sk_good3', 'Perfect fit!'), P('sk_good4', 'Hooray, one more!')],
    line: [P('sk_line1', 'A whole line, wow!'), P('sk_line2', 'Look how it sparkles!'), P('m_good1', 'Great move!'),
      P('sk_good4', 'Hooray, one more!'), P('m_cheer', "You're a star!"), P('sk_good2', 'Nice eye!')],
    oops: [P('m_oops1', "Oops! Let's try another way."), P('m_oops2', 'No worries, mistakes help us learn!'),
      P('sk_oops1', "Hmm, that number doesn't fit here."), P('sk_oops2', 'Oopsie! Check the row and the column.'),
      P('sk_oops3', 'Close! Try another number.'), P('sk_oops4', "Don't worry, erase it and try again.")],
    scared: [P('sk_scared1', 'Eek! Only one heart left!'), P('sk_scared2', "Careful now... let's think it through."),
      P('sk_scared3', 'My quills are shaking! Use the notes!'), P('sk_scared4', 'Last heart: only sure numbers!'),
      P('sk_scared5', 'Need a hand? Tap the light bulb!'), P('m_idle2', 'Take a deep breath and look again!')],
    idle: [P('m_idle1', 'Take your time, I believe in you!'), P('m_idle2', 'Take a deep breath and look again!'),
      P('sk_idle1', 'Which number is missing the most? Start there!'), P('sk_scared5', 'Need a hand? Tap the light bulb!'),
      P('sk_start2', 'Every row, column and box needs 1 to 9!'), P('m_start2', "You've got this!")],
    nudge: [P('sk_idle2', 'Psst... I think I saw an easy one!')],
    half: [P('m_half', 'Halfway there, keep going!')],
    almost: [P('m_almost1', 'Almost there!'), P('m_almost2', 'Just a little more!')],
    win: [P('sk_win1', 'We did it! Sudoku solved!'), P('sk_win2', 'Hooray! Every number in its place!'), P('m_cheer', "You're a star!")],
  };
  const UNIT_LINE = { row: P('sk_row', 'Row {n} is complete!'), col: P('sk_col', 'Column {n} is complete!'), box: P('sk_box', 'Box {n} is complete!') };
  const TRY = { row: P('sk_try_row', 'Try row {n}!'), col: P('sk_try_col', 'Try column {n}!'), box: P('sk_try_box', 'Peek at box {n}!') };
  const DIGIT = P('sk_digit', 'All the {d}s are in place!');
  const TECH = [
    P('sk_t0', "That red number doesn't fit: erase it first!"),
    P('sk_t1', 'Hidden single: in the glowing area, {d} fits in only one square!'),
    P('sk_t2', 'Naked single: this square can only be {d}!'),
    P('sk_t3', "Locked numbers: in one box a number sits on a single line, so the rest of that line can't have it. Then {d} goes here!"),
    P('sk_t4', "Pair: two squares share the same two numbers, so the others can't use them. Then {d} goes here!"),
    P('sk_t5', 'Triple: three squares hold three numbers between them. Then {d} goes here!'),
    P('sk_t6', 'X-wing: a number makes a rectangle on two lines and is ruled out elsewhere. Then {d} goes here!'),
    P('sk_t7', 'Fish or wing: a clever chain rules numbers out. Then {d} goes here!'),
  ];
  const recent = {};
  function pickLine(cat) {
    const pool = LINES[cat];
    const last = recent[cat] || [];
    const opts = pool.filter((p) => !last.includes(p.k));
    const p = (opts.length ? opts : pool)[(Math.random() * (opts.length || pool.length)) | 0];
    recent[cat] = [...last, p.k].slice(-2);
    return p;
  }
  const textOf = (p, vars) => fill(label(p.k, p.en), vars);

  /* ---------- icone (SVG 24×24, currentColor) ---------- */
  const ic = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;
  const ICON = {
    undo: ic('<path d="M9 7H5V3"/><path d="M5.6 7A8 8 0 1 1 4 13"/>'),
    erase: ic('<path d="M15.5 4.5l4 4L10 18H6l-2-2 11.5-11.5z"/><path d="M13 7l4 4"/><path d="M11 20h9"/>'),
    pencil: ic('<path d="M4 20l1-5L15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19z"/><path d="M13.5 6.5l4 4"/>'),
    auto: ic('<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 15l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>'),
    bulb: ic('<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>'),
    check: ic('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  };
  // icone delle tecniche (nel fumetto del suggerimento)
  const TECH_ICON = [
    ic('<path d="M15.5 4.5l4 4L10 18H6l-2-2 11.5-11.5z"/><path d="M11 20h9"/>'),
    ic('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="15" cy="9" r="2.4" fill="currentColor"/>'),
    ic('<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M12 9.5v5"/>'),
    ic('<rect x="3.5" y="3.5" width="9" height="9" rx="2"/><path d="M8 8h12.5"/><path d="M17.5 5l3 3-3 3"/>'),
    ic('<rect x="3" y="8" width="7" height="7" rx="2"/><rect x="14" y="8" width="7" height="7" rx="2"/><path d="M10 11.5h4"/>'),
    ic('<circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><circle cx="12" cy="6" r="2.6"/><path d="M8 15l3-6.5M16 15l-3-6.5M8.6 17h6.8"/>'),
    ic('<path d="M5 5l14 14M19 5L5 19"/><circle cx="5" cy="5" r="1.6" fill="currentColor"/><circle cx="19" cy="19" r="1.6" fill="currentColor"/><circle cx="19" cy="5" r="1.6" fill="currentColor"/><circle cx="5" cy="19" r="1.6" fill="currentColor"/>'),
    ic('<path d="M3 12c3-5 9-6 14-2l4-3v10l-4-3c-5 4-11 3-14-2z"/><circle cx="8" cy="11" r="1" fill="currentColor"/>'),
  ];

  /* ---------- card e tutorial ---------- */
  function miniGrid(x0, y0, S, vals, cls = () => '') {
    let g = `<rect x="${x0 - 2}" y="${y0 - 2}" width="${S * 3 + 4}" height="${S * 3 + 4}" rx="6" fill="var(--sk-bold)"/>`;
    vals.forEach((v, k) => {
      const r = (k / 3) | 0, c = k % 3, x = x0 + c * S, y = y0 + r * S;
      g += `<rect class="${cls(k)}" x="${x + 0.6}" y="${y + 0.6}" width="${S - 1.2}" height="${S - 1.2}" rx="3" fill="var(--sk-paper)"/>`;
      if (v) g += `<text class="skt-n ${cls(k)}" x="${x + S / 2}" y="${y + S / 2 + S * 0.24}" font-size="${S * 0.66}">${v}</text>`;
    });
    return g;
  }
  const art = () => {
    // in home le animazioni del riccio (hedgedoku.css) non sono ancora caricate: qui c'è la mascotte statica
    const hari = HH.mascot.mini().replace('<svg class="mini-hari"', '<svg x="80" y="46" width="38" height="38"');
    return `<svg viewBox="0 0 120 90" aria-hidden="true">
      ${miniGrid(18, 8, 24, [5, 3, 0, 0, 7, 0, 9, 0, 1], (k) => (k === 2 ? 'sk-art-hl' : ''))}
      <text class="skt-n sk-art-pop" x="${18 + 2 * 24 + 12}" y="${8 + 12 + 6}" font-size="16">8</text>
      ${hari}</svg>`;
  };
  function tutorialArt(step) {
    if (step === 1) {
      // un riquadro 3×3 che si riempie da 1 a 9 (in ordine sparso, come quando si gioca)
      const order = [4, 0, 8, 2, 6, 1, 7, 3, 5];
      let g = miniGrid(22.5, 7.5, 25, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
      order.forEach((k, j) => {
        const r = (k / 3) | 0, c = k % 3;
        g += `<text class="skt-n skt-pop" style="--i:${j}" x="${22.5 + c * 25 + 12.5}" y="${7.5 + r * 25 + 18.5}" font-size="16.5">${k + 1}</text>`;
      });
      return `<svg class="skt skt-1" viewBox="0 0 120 90" aria-hidden="true">${g}</svg>`;
    }
    if (step === 2) {
      // casella scelta → tasto premuto; nella casella accanto le note a matita
      const notes = [1, 0, 3, 0, 0, 6, 0, 0, 0].map((v, k) => (v ? `<text class="skt-note" x="${70 + (k % 3) * 8 + 4}" y="${12 + ((k / 3) | 0) * 8 + 6.5}">${v}</text>` : '')).join('');
      return `<svg class="skt skt-2" viewBox="0 0 120 90" aria-hidden="true">
        <rect x="14" y="10" width="26" height="26" rx="5" fill="var(--sk-sel)" stroke="var(--sk-bold)" stroke-width="2"/>
        <text class="skt-n skt-in" x="27" y="29.5" font-size="18" fill="var(--sk-user)">4</text>
        <rect x="68" y="10" width="26" height="26" rx="5" fill="var(--sk-paper)" stroke="var(--sk-bold)" stroke-width="2"/>${notes}
        ${[1, 2, 3, 4, 5].map((d, k) => `<g class="${d === 4 ? 'skt-key' : ''}"><rect x="${9 + k * 21}" y="54" width="18" height="24" rx="5" fill="var(--sk-key)" stroke="var(--sk-key-edge)" stroke-width="1.5"/><text class="skt-n" x="${18 + k * 21}" y="71" font-size="13">${d}</text></g>`).join('')}
      </svg>`;
    }
    // 3: numero sbagliato rosso + cuore, poi la lampadina che illumina la casella giusta
    return `<svg class="skt skt-3" viewBox="0 0 120 90" aria-hidden="true">
      <rect x="10" y="20" width="30" height="30" rx="6" fill="var(--sk-bad-soft)" stroke="var(--sk-bold)" stroke-width="2"/>
      <text class="skt-n skt-bad" x="25" y="42" font-size="20">7</text>
      <path class="skt-heart" d="M25 72C15 65 16 57 21 57c2.2 0 3.4 1.4 4 2.8c.6-1.4 1.8-2.8 4-2.8c5 0 6 8-4 15z" fill="var(--berry)"/>
      <rect class="skt-glow" x="72" y="20" width="30" height="30" rx="6" fill="var(--sk-hint)" stroke="var(--sk-bold)" stroke-width="2"/>
      <text class="skt-n skt-in2" x="87" y="42" font-size="20" fill="var(--sk-user)">3</text>
      <g transform="translate(75 55)" color="var(--sk-hint-ring)">${ICON.bulb.replace('<svg', '<svg width="24" height="24"')}</g>
    </svg>`;
  }

  function create(el, ctx, saved) {
    const H = HH.sudoku;
    const t = HH.i18n.t;
    let s;
    let grid, cells = [], keys = [], coach, hari, bubble, bubbleTxt, bubbleIc, hintBtn;
    let sel = -1, focusDigit = 0, notesMode = false;
    let shownHint = null, winTimer = 0, idleTimer = 0, lastMove = Date.now(), nudges = 0, ms = { half: false, almost: false };
    const auto = () => HH.store ? HH.store.get('sk:auto', true) !== false : true;

    function fresh() {
      const level = ctx.level;
      const variant = s && s.level === level ? (s.variant || 0) + 1 : 0;
      s = H.newGame(level, variant);
      begin(true);
      ctx.changed({ reset: true });
    }
    function begin(talk) {
      clearTimeout(winTimer);
      sel = -1; focusDigit = 0; shownHint = null; nudges = 0;
      const p = H.progress(s);
      ms = { half: p >= 0.5, almost: p >= 0.85 };
      build();
      lastMove = Date.now();
      if (talk) setTimeout(() => say('start', 'wave'), 450);
    }

    /* ---------- DOM ---------- */
    function build() {
      const html = [];
      for (let i = 0; i < 81; i++) {
        const r = H.ROW[i], c = H.COL[i];
        const cls = ['sk-cell', (H.BOX[i] % 2 ? 'alt' : ''), c % 3 === 2 && c < 8 ? 'br' : '', r % 3 === 2 && r < 8 ? 'bb' : ''].filter(Boolean).join(' ');
        html.push(`<button class="${cls}" data-i="${i}" style="--d:${(r + c) * 40}ms" tabindex="${i ? -1 : 0}"></button>`);
      }
      const tool = (id, icon, key, en, extra = '') => `<button class="sk-tool" data-act="${id}" ${extra}>${icon}<span>${label(key, en)}</span></button>`;
      el.innerHTML = `<div class="sk-wrap">
        <div class="sk-coach" aria-live="polite">
          <div class="sk-hari">${HH.hogKit.svg()}</div>
          <div class="sk-bubble"><span class="sk-bic" aria-hidden="true"></span><p></p></div>
        </div>
        <div class="sk-grid" dir="ltr" role="grid">${html.join('')}</div>
        <div class="sk-tools">
          ${tool('undo', ICON.undo, 'undo', 'Undo')}
          ${tool('erase', ICON.erase, 'sk_erase', 'Erase')}
          ${tool('notes', ICON.pencil, 'sk_notes', 'Notes', 'aria-pressed="false"')}
          ${tool('auto', ICON.auto, 'sk_auto', 'Auto notes', `aria-pressed="${auto()}"`)}
          ${tool('hint', ICON.bulb, 'sk_hint', 'Hint')}
        </div>
        <div class="sk-pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="sk-key" data-d="${d}"><b>${d}</b><small></small></button>`).join('')}</div>
      </div>`;
      grid = el.querySelector('.sk-grid');
      cells = [...grid.children];
      keys = [...el.querySelectorAll('.sk-key')];
      coach = el.querySelector('.sk-coach');
      hari = coach.querySelector('.hd-hog');
      bubble = coach.querySelector('.sk-bubble');
      bubbleTxt = bubble.querySelector('p');
      bubbleIc = bubble.querySelector('.sk-bic');
      hintBtn = el.querySelector('[data-act="hint"]');
      paint();
      tickIdle();
    }

    function cellLabel(i) {
      const pos = `${H.ROW[i] + 1},${H.COL[i] + 1}`;
      const v = s.board[i];
      if (v) return `${pos} · ${v}`;
      const ns = H.DIGITS[s.notes[i]];
      return ns.length ? `${pos} · ${label('sk_notes', 'Notes')} ${ns.join(' ')}` : pos;
    }

    // ridisegna le 81 caselle (economico) e il tastierino
    function paint() {
      // con un suggerimento aperto si vede solo la sua zona (niente croce della selezione); per i single nascosti
      // si accendono anche i numeri uguali che "bloccano" le altre caselle
      const peers = sel >= 0 && !shownHint ? new Set([sel, ...H.PEERS[sel]]) : new Set();
      const fd = focusDigit || (shownHint && shownHint.tech === 1 ? shownHint.digit : 0) || (sel >= 0 && H.isRight(s, sel) ? s.board[sel] : 0);
      const hintCells = shownHint ? new Set(shownHint.cells) : new Set();
      const hintUnits = shownHint ? new Set(shownHint.units.flatMap((u) => H.UNITS[u])) : new Set();
      cells.forEach((b, i) => {
        const v = s.board[i], n = s.notes[i];
        const key = `${v}|${n}`;
        if (b._k !== key) {
          b._k = key;
          b.innerHTML = v ? `<span class="sk-n">${v}</span>`
            : n ? `<span class="sk-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i data-d="${d}">${n & H.BIT(d) ? d : ''}</i>`).join('')}</span>` : '';
          b.setAttribute('aria-label', cellLabel(i));
        }
        const given = H.isGiven(s, i), wrong = H.isWrong(s, i);
        b.classList.toggle('given', given);
        b.classList.toggle('user', !!v && !given && !wrong);
        b.classList.toggle('wrong', wrong);
        b.classList.toggle('sel', i === sel);
        b.classList.toggle('hl', i !== sel && peers.has(i));
        b.classList.toggle('same', !!fd && v === fd && !wrong);
        b.classList.toggle('nfd', !!fd && !v && !!(n & H.BIT(fd)));
        b.dataset.fd = fd || '';
        b.classList.toggle('hint', hintCells.has(i));
        b.classList.toggle('hzone', !hintCells.has(i) && hintUnits.has(i));
      });
      const left = H.remaining(s);
      keys.forEach((k, j) => {
        const d = j + 1;
        k.querySelector('small').textContent = left[d] ? left[d] : '';
        k.classList.toggle('full', !left[d]);
        k.classList.toggle('on', d === fd);
        k.setAttribute('aria-label', `${d} · ${left[d]}`);
      });
      el.querySelector('[data-act="notes"]').setAttribute('aria-pressed', String(notesMode));
      el.querySelector('[data-act="notes"]').classList.toggle('on', notesMode);
      el.querySelector('[data-act="auto"]').setAttribute('aria-pressed', String(auto()));
      el.querySelector('[data-act="auto"]').classList.toggle('on', auto());
      el.querySelector('.sk-pad').classList.toggle('notes', notesMode);
      hintBtn.classList.toggle('armed', !!shownHint && shownHint.kind === 'place');
    }

    /* ---------- Hari ---------- */
    let moodT = 0;
    function mood(m, ms = 1600) {
      clearTimeout(moodT);
      coach.classList.remove('joy', 'love', 'sad', 'worry', 'scared', 'party', 'think', 'wave');
      void coach.offsetWidth;
      if (!m) return;
      coach.classList.add(m);
      if (m !== 'party' && m !== 'scared') moodT = setTimeout(() => coach.classList.remove(m), ms);
    }
    // Hari guarda (e inclina la testa) verso una casella
    function lookAt(i, hold = 1800) {
      if (!hari || i < 0) return;
      const a = hari.getBoundingClientRect(), b = cells[i].getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      hari.style.setProperty('--lx', ((dx / d) * 3.2).toFixed(2));
      hari.style.setProperty('--ly', ((dy / d) * 2.6).toFixed(2));
      hari.style.setProperty('--tilt', `${Math.max(-12, Math.min(12, (dx / d) * 12)).toFixed(1)}deg`);
      clearTimeout(hari._gz);
      hari._gz = setTimeout(() => { ['--lx', '--ly', '--tilt'].forEach((p) => hari.style.removeProperty(p)); }, hold);
    }
    function speak(text, icon = '') {
      bubbleTxt.textContent = text;
      bubbleIc.innerHTML = icon;
      bubble.classList.toggle('has-ic', !!icon);
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    }
    function say(cat, m, vars) {
      speak(textOf(pickLine(cat), vars));
      if (m) mood(m, m === 'wave' ? 1400 : 1700);
    }

    // fermo da un po': Hari indica una casella facile (riga, colonna o riquadro) oppure incoraggia
    function tickIdle() {
      clearInterval(idleTimer);
      idleTimer = setInterval(() => {
        if (!el.isConnected || !grid || !grid.isConnected) { clearInterval(idleTimer); return; }
        if ((G.document && G.document.hidden) || H.isSolved(s) || s.mistakes >= LIVES) return;
        if (Date.now() - lastMove < IDLE_MS + nudges * 8000) return;
        lastMove = Date.now();
        nudges++;
        const e = H.easyMove(s);
        if (e && nudges % 3 !== 0) {
          if (Math.random() < 0.7) speak(textOf(TRY[e.kind], { n: e.index + 1 }));
          else say('nudge');
          mood('think', 2600);
          lookAt(e.cell, 3200);
          flashUnit(H.UNITS[e.unit], 'nudge', 3200);
          flashUnit([e.cell], 'point', 3200);
        } else say('idle', 'think');
      }, 1000);
    }

    function flashUnit(list, cls, ms, stagger = 0) {
      list.forEach((i, k) => {
        const b = cells[i];
        clearTimeout(b['_' + cls]);
        b.style.setProperty('--k', `${k * stagger}ms`);
        b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
        b['_' + cls] = setTimeout(() => b.classList.remove(cls), ms + k * stagger);
      });
    }

    /* ---------- mosse ---------- */
    function moved() { lastMove = Date.now(); nudges = 0; }

    function select(i) {
      if (i < 0 || i > 80) return;
      if (sel >= 0) cells[sel].tabIndex = -1;
      sel = i;
      cells[i].tabIndex = 0;
      focusDigit = 0;
      if (shownHint && shownHint.cell !== i) shownHint = null;
      paint();
    }

    function milestones() {
      const p = H.progress(s);
      if (p >= 1) return false;
      if (p >= 0.85 && !ms.almost) { ms.almost = ms.half = true; ctx.sfx.milestone(); say('almost', 'joy'); return true; }
      if (p >= 0.5 && !ms.half) { ms.half = true; ctx.sfx.milestone(); say('half', 'joy'); return true; }
      return false;
    }

    function input(d) {
      if (sel < 0 || H.isGiven(s, sel) || H.isRight(s, sel)) {
        // nessuna casella libera scelta: il tasto evidenzia quel numero su tutta la griglia
        focusDigit = focusDigit === d ? 0 : d;
        ctx.sfx.tap();
        paint();
        return;
      }
      if (notesMode) {
        if (s.board[sel]) return;
        H.toggleNote(s, sel, d);
        shownHint = null;
        moved();
        paint();
        ctx.sfx.mark();
        lookAt(sel, 900);
        ctx.changed();
        return;
      }
      const r = H.place(s, sel, d, { autoNotes: auto() });
      if (r.kind === 'same' || r.kind === 'given' || r.kind === 'locked') return;
      shownHint = null;
      moved();
      const i = sel;
      paint();
      if (r.kind === 'wrong') {
        cells[i].classList.remove('shake'); void cells[i].offsetWidth; cells[i].classList.add('shake');
        const left = LIVES - s.mistakes;
        lookAt(i, 1400);
        if (left === 1) say('scared', 'scared');
        else if (left > 1) say('oops', 'sad');
        else { speak(textOf(LINES.oops[1])); mood('sad', 3000); }
        ctx.mistake(left);
        ctx.changed();
        return;
      }
      // giusto
      cells[i].classList.remove('pop'); void cells[i].offsetWidth; cells[i].classList.add('pop');
      ctx.sfx.place();
      lookAt(i, 1200);
      if (r.solved) { ctx.changed(); return finale(); }
      if (r.units.length) {
        r.units.forEach((u, k) => setTimeout(() => flashUnit(H.UNITS[u], 'done', 900, 45), k * 120));
        setTimeout(() => ctx.sfx.cupDone(), 120);
        const u = r.units[r.units.length - 1];
        if (Math.random() < 0.65) speak(textOf(UNIT_LINE[H.unitKind(u)], { n: (u % 9) + 1 }));
        else say('line');
        mood('love', 1700);
      }
      if (r.digit) {
        const k = keys[r.digit - 1];
        k.classList.remove('done'); void k.offsetWidth; k.classList.add('done');
        flashUnit(s.board.map((v, j) => (v === r.digit ? j : -1)).filter((j) => j >= 0), 'done', 900, 30);
        setTimeout(() => ctx.sfx.star(1), 200);
        if (!r.units.length) { speak(textOf(DIGIT, { d: r.digit })); mood('love', 1700); }
      }
      if (!r.units.length && !r.digit && !milestones()) {
        // ogni mossa giusta: Hari salta; la frase cambia spesso, ma non sempre (non è un mitra di complimenti)
        if (Math.random() < 0.55) say('good', 'joy'); else mood('joy', 1100);
      } else if (r.units.length || r.digit) milestones();
      ctx.changed();
    }

    function finale() {
      sel = -1; focusDigit = 0; shownHint = null;
      paint();
      grid.classList.add('solved');
      coach.classList.remove('scared');
      mood('party');
      say('win');
      clearTimeout(winTimer);
      winTimer = setTimeout(ctx.win, 1700);
    }

    function eraseSel() {
      if (sel < 0 || !H.erase(s, sel)) return;
      shownHint = null;
      moved();
      paint();
      ctx.sfx.mark();
      ctx.changed();
    }

    function doHint() {
      if (H.isSolved(s)) return;
      // secondo tocco sullo stesso suggerimento: mette il numero
      if (shownHint && shownHint.kind === 'place' && sel === shownHint.cell && !s.board[sel]) {
        const d = shownHint.digit;
        const was = notesMode;
        notesMode = false;
        input(d);
        notesMode = was;
        paint();
        return;
      }
      const h = H.hint(s);
      if (!h) return;
      s.hints = (s.hints || 0) + 1;
      sel = h.cell; focusDigit = 0;
      cells.forEach((b, i) => { b.tabIndex = i === sel ? 0 : -1; });
      shownHint = h;
      moved();
      paint();
      ctx.sfx.blip();
      lookAt(h.cell, 3000);
      mood('think', 2600);
      speak(textOf(TECH[h.kind === 'wrong' ? 0 : Math.max(1, h.tech)], { d: h.digit }), TECH_ICON[h.kind === 'wrong' ? 0 : Math.max(1, h.tech)]);
      ctx.changed();
    }

    function undo() {
      if (H.isSolved(s)) return;
      const i = H.undo(s);
      if (i === null) return;
      shownHint = null;
      moved();
      if (i >= 0) { if (sel >= 0) cells[sel].tabIndex = -1; sel = i; cells[i].tabIndex = 0; }
      paint();
      ctx.sfx.mark();
      lookAt(i, 900);
      ctx.changed();
    }

    function tool(act) {
      if (act === 'undo') undo();
      else if (act === 'erase') eraseSel();
      else if (act === 'notes') { notesMode = !notesMode; ctx.sfx.tap(); paint(); }
      else if (act === 'auto') { HH.store && HH.store.set('sk:auto', !auto()); ctx.sfx.tap(); paint(); }
      else if (act === 'hint') doHint();
    }

    /* ---------- input ---------- */
    el.addEventListener('click', (e) => {
      if (grid.classList.contains('solved')) return;
      const c = e.target.closest('.sk-cell');
      if (c && grid.contains(c)) {
        const i = +c.dataset.i;
        select(i);
        ctx.sfx.tap();
        if (s.board[i]) lookAt(i, 700);
        return;
      }
      const k = e.target.closest('.sk-key');
      if (k) { input(+k.dataset.d); return; }
      const tl = e.target.closest('.sk-tool');
      if (tl) tool(tl.dataset.act);
      if (e.target.closest('.sk-hari')) { mood('joy', 1100); ctx.sfx.giggle(); }
    });

    el.addEventListener('keydown', (e) => {
      if (grid.classList.contains('solved')) return;
      const inGrid = e.target.closest && e.target.closest('.sk-cell');
      const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv && inGrid) {
        e.preventDefault();
        const i = sel >= 0 ? sel : +inGrid.dataset.i, c = i % 9;
        if ((e.key === 'ArrowLeft' && c === 0) || (e.key === 'ArrowRight' && c === 8)) return;
        const j = i + mv;
        if (j < 0 || j > 80) return;
        select(j); cells[j].focus();
        return;
      }
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); if (sel < 0 && inGrid) select(+inGrid.dataset.i); input(+e.key); return; }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); eraseSel(); return; }
      if (e.key === 'n' || e.key === 'N') { tool('notes'); return; }
      if (e.key === 'h' || e.key === 'H') { tool('hint'); return; }
    });

    /* ---------- avvio ---------- */
    function restart() {
      H.restart(s);
      grid && grid.classList.remove('solved');
      coach && coach.classList.remove('party', 'scared');
      begin(true);
      ctx.changed({ reset: true });
    }

    const r = saved && H.restore(saved);
    if (r) {
      s = r;
      if (s.mistakes >= LIVES) H.restart(s);
      begin(false);
      setTimeout(() => {
        if (!el.isConnected) return;
        if (LIVES - s.mistakes === 1) { say('scared'); coach.classList.add('scared'); } else say('start', 'wave');
      }, 450);
    } else fresh();

    return {
      fresh,
      restart,
      undo,
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'sudoku', name: 'Hari Sudoku', rules: 'r19', art, create, lives: LIVES, coach: true,
    tutorial: [
      { key: 'tu_sudoku_1', en: 'Fill the grid: 1 to 9 once in every row, every column and every 3×3 box.', art: tutorialArt(1) },
      { key: 'tu_sudoku_2', en: 'Tap a square, then a number. The pencil writes notes, and they tidy up by themselves!', art: tutorialArt(2) },
      { key: 'tu_sudoku_3', en: 'A wrong number turns red and costs a heart. Stuck? The bulb shows the trick: tap it again to place the number.', art: tutorialArt(3) },
    ],
    // 3 stelle senza errori; un errore o più di 2 aiuti tolgono una stella
    rate: (s) => Math.max(1, Math.min(3, 3 - (s.mistakes || 0) - ((s.hints || 0) > 2 ? 1 : 0))),
    // tempo di riferimento: più caselle vuote e tecniche più difficili = più tempo
    parTime: (s) => Math.round(HH.sudoku.toFill(s) * (5 + 2 * Math.max(1, s.tech || 1))),
    progress: (s) => HH.sudoku.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
