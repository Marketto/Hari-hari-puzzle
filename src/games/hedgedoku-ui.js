/* Hedgedoku — interfaccia (v4).
 * Regole verificate a ogni mossa: un riccio per riga, colonna e zona; mai due ricci nelle 8 caselle intorno.
 * Ogni riccio viene controllato subito contro l'unica soluzione:
 *   giusto    → resta (saltello felice, i vicini sorridono con un cuoricino)
 *   sbagliato → il riccio piange, i ricci con cui è in conflitto si preoccupano (goccia di sudore), perdi un cuore;
 *               poi sparisce e lascia una ✕. Al 3° errore si ricomincia il livello.
 * Dal livello 6 (griglie 7×7 e 8×8) c'è un riccio d'aiuto fisso.
 *
 * Comandi (niente modalità):
 *   tap         vuoto ↔ ✕ · su un riccio lo toglie (cella vuota)
 *   doppio tap  mette il riccio (o lo toglie). Il primo tap viene applicato SUBITO (✕); se entro 300 ms dal
 *               rilascio arriva un secondo tap sulla stessa cella, la ✕ viene ritirata e sostituita dal riccio:
 *               una sola mossa, una sola voce di "annulla", nessun cuore perso per la ✕ intermedia.
 *   trascina    tante ✕ in fila (se parti da una ✕, le cancella); i ricci non vengono toccati
 *   tastiera    Invio = ✕ · Spazio = riccio · frecce = sposta il focus
 *
 * Ricci "vivi": respiro e battito di ciglia in CSS (tempi sfalsati per riccio), ogni tanto uno si guarda intorno
 * (setInterval lento, si ferma quando la griglia esce dal DOM; disattivato con prefers-reduced-motion).
 * Le reazioni sono classi temporanee sulla cella: look (variabili --lx/--ly/--tilt), joy, love, worry, wrong.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const LIVES = 3;
  const sizeFor = (level) => (level <= 2 ? 5 : level <= 5 ? 6 : level <= 9 ? 7 : 8);
  const minTechFor = (level) => (level >= 12 ? 4 : level >= 4 ? 2 : 0);
  const givensFor = (level) => (level >= 6 ? 1 : 0);
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const reducedMotion = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- riccio animato (SVG 100×100, colori dai token --hog-*) ---------- */
  const f = (v) => String(Math.round(v * 10) / 10);
  function quill(cx, cy, deg, r0, len, w) {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const P = (r, o) => `${f(cx + ux * r + px * o)} ${f(cy + uy * r + py * o)}`;
    const tip = r0 + len;
    return `M${P(r0, -w / 2)}Q${P(r0 + len * 0.55, -w * 0.45)} ${P(tip - 2.5, -2)}Q${P(tip + 1.5, 0)} ${P(tip - 2.5, 2)}Q${P(r0 + len * 0.55, w * 0.45)} ${P(r0, w / 2)}Z`;
  }
  function mane(cx, cy, from, to, count, r0, len, w, jit) {
    let d = '';
    for (let i = 0; i < count; i++) d += quill(cx, cy, from + ((to - from) * i) / (count - 1), r0, len * (1 + jit * Math.sin(i * 2.3 + 1)), w);
    return d;
  }

  let hogTpl = null;
  function hogTemplate() {
    if (hogTpl) return hogTpl;
    const back = mane(50, 54, -214, 34, 13, 23, 22, 15, 0.06);
    const mid = mane(50, 54, -205, 25, 12, 22, 16, 13, 0.08);
    const eye = (cx) => `<g class="hh-eye">
        <ellipse cx="${cx}" cy="63" rx="7" ry="8.5" fill="var(--hog-eye)"/>
        <ellipse cx="${cx}" cy="66.5" rx="4.6" ry="3.4" fill="var(--hog-iris)" opacity=".85"/>
        <g class="hh-shine"><circle cx="${cx + 2.3}" cy="59.8" r="2.9" fill="var(--hog-shine)"/><circle cx="${cx - 2.4}" cy="66.6" r="1.3" fill="var(--hog-shine)"/></g>
      </g>`;
    const ear = (cx, side) => `<g class="hh-ear ${side}"><circle cx="${cx}" cy="42" r="7.5" fill="var(--hog-ear)" stroke="var(--hog-line)" stroke-width="2"/><circle cx="${cx}" cy="42.5" r="3.8" fill="var(--hog-ear-in)"/></g>`;
    hogTpl = `<svg class="mini-hari hd-hog" viewBox="0 0 100 100" aria-hidden="true" style="%ST%">
  <g class="hh-b"><g class="hh-h">
    <circle cx="50" cy="54" r="25" fill="var(--hog-q)"/>
    <path d="${back}" fill="var(--hog-q2)" stroke="var(--hog-line)" stroke-width="2" stroke-linejoin="round"/>
    <path d="${mid}" fill="var(--hog-q3)"/>
    ${ear(25, 'l')}${ear(75, 'r')}
    <ellipse cx="50" cy="62" rx="32" ry="26" fill="var(--hog-face)" stroke="var(--hog-line)" stroke-width="2.5"/>
    <path d="M38 40C42 46 46 48 50 49C54 48 58 46 62 40C58 35 42 35 38 40Z" fill="var(--hog-q3)"/>
    <g class="hh-look">
      <g class="hh-eyes">${eye(39)}${eye(61)}</g>
      <g class="hh-happy" fill="none" stroke="var(--hog-eye)" stroke-width="3.4" stroke-linecap="round"><path d="M32.5 65q6.5 -9 13 0"/><path d="M54.5 65q6.5 -9 13 0"/></g>
      <g class="hh-squint" fill="none" stroke="var(--hog-eye)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M34 58.5l8 4.5l-8 4.5"/><path d="M66 58.5l-8 4.5l8 4.5"/></g>
    </g>
    <g class="hh-brows" fill="none" stroke="var(--hog-line)" stroke-width="2.4" stroke-linecap="round"><path d="M32 52.5l9 -3.5"/><path d="M68 52.5l-9 -3.5"/></g>
    <g class="hh-blush"><ellipse cx="26.5" cy="72" rx="6.5" ry="3.8" fill="var(--hog-blush)"/><ellipse cx="73.5" cy="72" rx="6.5" ry="3.8" fill="var(--hog-blush)"/></g>
    <g class="hh-snout">
      <ellipse cx="50" cy="71" rx="3.3" ry="2.4" fill="var(--hog-nose)"/>
      <path class="hh-m hh-m0" d="M45.5 75.5q2.25 3 4.5 0q2.25 3 4.5 0" fill="none" stroke="var(--hog-nose)" stroke-width="1.8" stroke-linecap="round"/>
      <path class="hh-m hh-m1" d="M44 75q6 8.5 12 0z" fill="var(--hog-mouth)" stroke="var(--hog-nose)" stroke-width="1.6" stroke-linejoin="round"/>
      <ellipse class="hh-m hh-m2" cx="50" cy="78.5" rx="4.2" ry="3.8" fill="var(--hog-mouth)" stroke="var(--hog-nose)" stroke-width="1.6"/>
      <path class="hh-m hh-m3" d="M44.5 78q2.75 -2.6 5.5 0q2.75 2.6 5.5 0" fill="none" stroke="var(--hog-nose)" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <g class="hh-tears" fill="var(--hog-tear)" stroke="var(--hog-tear-line)" stroke-width="1">
      <path class="hh-tear" d="M33 70c-2.6 4.2 -2.6 6.6 0 7.6c2.6 -1 2.6 -3.4 0 -7.6z"/>
      <path class="hh-tear r" d="M67 70c-2.6 4.2 -2.6 6.6 0 7.6c2.6 -1 2.6 -3.4 0 -7.6z"/>
    </g>
    <g transform="translate(83 47)"><g class="hh-sweat"><path d="M0 -7c3.4 5 4.6 8 0 10.4c-4.6 -2.4 -3.4 -5.4 0 -10.4z" fill="var(--hog-tear)" stroke="var(--hog-tear-line)" stroke-width="1.2"/></g></g>
  </g></g>
  <g transform="translate(78 22)"><g class="hh-heart"><path d="M0 7C-9 1 -8 -6 -3.6 -6.4C-1.6 -6.6 -.4 -5.4 0 -4C.4 -5.4 1.6 -6.6 3.6 -6.4C8 -6 9 1 0 7z" fill="var(--hog-heart)" stroke="var(--hog-heart-line)" stroke-width="1.2"/></g></g>
</svg>`;
    return hogTpl;
  }
  // Ogni riccio ha tempi suoi: respiro e ciglia non vanno all'unisono
  function hogSvg() {
    const R = Math.random;
    const st = `--bk:${(-R() * 6).toFixed(2)}s;--bkd:${(3.8 + R() * 2.8).toFixed(2)}s;--br:${(-R() * 3.4).toFixed(2)}s;--brd:${(2.9 + R() * 0.9).toFixed(2)}s`;
    return hogTemplate().replace('%ST%', st);
  }
  // versione statica per le illustrazioni (niente stile casuale)
  const hogAt = (x, y, w, cls = '') => hogTemplate().replace('<svg class="mini-hari hd-hog"', `<svg class="hd-hog ${cls}" x="${x}" y="${y}" width="${w}" height="${w}"`).replace(' style="%ST%"', '');

  const art = () => {
    const regs = [[0, 0, 1], [2, 0, 1], [2, 3, 3]];
    const rects = regs.map((row, r) => row.map((reg, c) =>
      `<rect x="${18 + c * 28}" y="${3 + r * 28}" width="27" height="27" rx="6" fill="var(--r${reg})"/>`).join('')).join('');
    const h = (x, y) => HH.mascot.mini().replace('<svg class="mini-hari"', `<svg x="${x}" y="${y}" width="27" height="27"`);
    const x = (cx, cy) => `<path d="M${cx - 4} ${cy - 4}l8 8M${cx + 4} ${cy - 4}l-8 8" stroke="var(--wall)" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>`;
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="16" y="1" width="88" height="88" rx="9" fill="var(--wall)"/>${rects}${h(18, 3)}${h(74, 31)}${x(59, 17)}${x(31, 73)}</svg>`;
  };

  /* ---------- tutorial della prima partita (3 passi, SVG animati in hedgedoku.css) ---------- */
  const xMark = (cx, cy, r = 4, cls = '') => `<path class="${cls}" d="M${cx - r} ${cy - r}l${2 * r} ${2 * r}M${cx + r} ${cy - r}l${-2 * r} ${2 * r}" stroke="var(--wall)" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
  function tutorialArt(step) {
    if (step === 1) {
      // 4×4: un riccio per riga, colonna e colore; una banda scorre sulle righe
      const Z = [[0, 0, 1, 1], [0, 2, 2, 1], [3, 3, 2, 1], [3, 3, 2, 2]], SOL = [1, 3, 0, 2];
      const S = 20, X0 = 20, Y0 = 5;
      let g = `<rect x="${X0 - 2}" y="${Y0 - 2}" width="${4 * S + 4}" height="${4 * S + 4}" rx="7" fill="var(--wall)"/>`;
      Z.forEach((row, r) => row.forEach((z, c) => { g += `<rect x="${X0 + c * S + .5}" y="${Y0 + r * S + .5}" width="${S - 1}" height="${S - 1}" rx="4" fill="var(--r${z})"/>`; }));
      g += `<rect class="hdt-band" x="${X0}" y="${Y0}" width="${4 * S}" height="${S}" rx="4"/>`;
      g += SOL.map((c, r) => `<g class="hdt-pop" style="--i:${r}">${hogAt(X0 + c * S + 1, Y0 + r * S + 1, S - 2)}</g>`).join('');
      return `<svg class="hdt hdt-1" viewBox="0 0 120 90" aria-hidden="true">${g}</svg>`;
    }
    if (step === 2) {
      // 3×3: riccio al centro, le 8 caselle intorno si accendono una dopo l'altra
      const S = 26, X0 = 21, Y0 = 6;
      let g = `<rect x="${X0 - 2}" y="${Y0 - 2}" width="${3 * S + 4}" height="${3 * S + 4}" rx="8" fill="var(--wall)"/>`;
      const ring = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0]];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g += `<rect x="${X0 + c * S + .5}" y="${Y0 + r * S + .5}" width="${S - 1}" height="${S - 1}" rx="5" fill="var(--r${r === 1 && c === 1 ? 0 : 3})"/>`;
      g += ring.map(([r, c], k) => `<g class="hdt-no" style="--i:${k}"><rect x="${X0 + c * S + .5}" y="${Y0 + r * S + .5}" width="${S - 1}" height="${S - 1}" rx="5"/>${xMark(X0 + c * S + S / 2, Y0 + r * S + S / 2, 4.5)}</g>`).join('');
      g += hogAt(X0 + S + 1, Y0 + S + 1, S - 2, 'hdt-worried');
      return `<svg class="hdt hdt-2" viewBox="0 0 120 90" aria-hidden="true">${g}</svg>`;
    }
    // 3: tap = ✕ (a sinistra), doppio tap = riccio (a destra)
    const cell = (x, z) => `<rect x="${x}" y="30" width="34" height="34" rx="8" fill="var(--wall)"/><rect x="${x + 2}" y="32" width="30" height="30" rx="6" fill="var(--r${z})"/>`;
    const finger = (x, cls) => `<g class="hdt-finger ${cls}"><g transform="translate(${x} 47)">
        <path d="M-4 0v-14a4 4 0 0 1 8 0v10l9 1.6a4.5 4.5 0 0 1 3.6 5.2l-2 10.6h-17l-6.6 -9.4a3.4 3.4 0 0 1 5 -4.4z" fill="var(--hd-finger)" stroke="var(--hd-finger-line)" stroke-width="1.8" stroke-linejoin="round"/>
      </g></g>`;
    const ripple = (cx, cls) => `<circle class="hdt-ripple ${cls}" cx="${cx}" cy="36" r="6"/>`;
    return `<svg class="hdt hdt-3" viewBox="0 0 120 90" aria-hidden="true">
      ${cell(9, 1)}${cell(77, 0)}
      <g class="hdt-x1">${xMark(26, 47, 5)}</g>
      <g class="hdt-h2">${hogAt(80, 33, 28)}</g>
      ${ripple(26, 'a')}${ripple(94, 'b')}${ripple(94, 'c')}
      ${finger(26, 'one')}${finger(94, 'two')}
      <text x="26" y="84" class="hdt-n">1×</text><text x="94" y="84" class="hdt-n">2×</text>
    </svg>`;
  }

  function create(el, ctx, saved) {
    const H = HH.hedgedoku;
    const t = HH.i18n.t;
    let s;                       // { n, regions, solution, given, board, hist, moves, mistakes }
    let grid, cells = [], countEl, winTimer = 0, busy = false;

    function fresh() {
      const n = sizeFor(ctx.level);
      const p = H.generate(n, Math.random, { minTech: minTechFor(ctx.level) });
      const rows = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, givensFor(ctx.level));
      const given = rows.map((r) => r * n + p.solution[r]);
      s = { n, regions: p.regions, solution: p.solution, given, board: new Array(n * n).fill(0), hist: [], moves: 0, mistakes: 0 };
      given.forEach((i) => { s.board[i] = 2; });
      build();
      ctx.changed({ reset: true });
    }

    /* ---------- DOM ---------- */
    function build() {
      const { n, regions: reg } = s;
      clearTimeout(winTimer);
      busy = false;
      last = null;
      const html = [];
      for (let i = 0; i < n * n; i++) {
        const r = (i / n) | 0, c = i % n;
        const edge = (rr, cc) => (rr < 0 || cc < 0 || rr >= n || cc >= n ? 'var(--b-none)'
          : reg[rr * n + cc] !== reg[i] ? 'var(--b-wall)' : 'var(--b-hair)');
        const st = `--r:var(--r${reg[i] % 8});--bt:${edge(r - 1, c)};--bb:${edge(r + 1, c)};--bl:${edge(r, c - 1)};--br:${edge(r, c + 1)};--d:${(r + c) * 55}ms;--c:${c}`;
        html.push(`<button class="hd-cell${s.given.includes(i) ? ' given' : ''}" style="${st}" data-i="${i}" data-v="0" tabindex="${i ? -1 : 0}" aria-label="${r + 1},${c + 1}"></button>`);
      }
      el.innerHTML = `<div class="hd-wrap">
        <div class="hd-help" id="hdHelp">
          <span class="hd-tip"><span class="hd-x" aria-hidden="true"></span><span>${label('hd_tap', 'Tap or drag')}</span></span>
          <span class="hd-tip">${hogSvg()}<span>${label('hd_dtap', 'Double tap')}</span></span>
        </div>
        <div class="hd-grid" dir="ltr" style="--n:${n}" aria-describedby="hdHelp">${html.join('')}</div>
        <div class="hd-foot">
          <div class="hd-count" aria-live="polite">${HH.mascot.mini()}<b></b><span>/ ${n}</span></div>
          <p class="hd-lives-hint">${t('livesHint')}</p>
        </div>
      </div>`;
      grid = el.querySelector('.hd-grid');
      cells = [...grid.children];
      countEl = el.querySelector('.hd-count b');
      paint();
    }

    const xLabel = () => label('hd_x', 'crossed out');
    function cellLabel(i, v) {
      const pos = `${((i / s.n) | 0) + 1},${(i % s.n) + 1}`;
      return v === 2 ? `${pos} · ${t('place')}` : v === 1 ? `${pos} · ${xLabel()}` : pos;
    }

    // aggiorna solo le celle cambiate; "pop" = riccio appena messo
    function paint(pop = -1) {
      let placed = 0;
      cells.forEach((b, i) => {
        const v = s.board[i];
        if (v === 2) placed++;
        if (+b.dataset.v !== v) {
          b.dataset.v = v;
          b.innerHTML = v === 2 ? hogSvg() : v === 1 ? '<span class="hd-x" aria-hidden="true"></span>' : '';
          b.setAttribute('aria-label', cellLabel(i, v));
          if (v !== 2) clearGaze(b);
        }
        b.classList.toggle('has', v === 2);
        b.classList.toggle('pop', i === pop);
      });
      countEl.textContent = placed;
      const solved = H.check(s.n, s.regions, s.board).solved;
      if (solved && !grid.classList.contains('solved')) cells.forEach(clearGaze);
      grid.classList.toggle('solved', solved);
      if (solved) { clearTimeout(winTimer); winTimer = setTimeout(ctx.win, 1250); }
    }

    /* ---------- reazioni dei ricci ---------- */
    const hogCells = (except = -1) => cells.filter((b, k) => k !== except && s.board[k] === 2);
    function clearGaze(b) {
      clearTimeout(b._gz); b._gz = 0;
      b.style.removeProperty('--lx'); b.style.removeProperty('--ly'); b.style.removeProperty('--tilt');
    }
    function setGaze(b, x, y, tilt, ms) {
      clearTimeout(b._gz);
      b.style.setProperty('--lx', (x * 3.2).toFixed(2));
      b.style.setProperty('--ly', (y * 2.6).toFixed(2));
      b.style.setProperty('--tilt', `${tilt}deg`);
      b._gz = setTimeout(() => clearGaze(b), ms);
    }
    const gazeAt = (k, target, ms = 1300) => { const g = H.lookAt(s.n, k, target); setGaze(cells[k], g.x, g.y, g.tilt, ms); };
    function flash(b, cls, ms, delay = 0) {
      const key = '_' + cls;
      clearTimeout(b[key]);
      b[key] = setTimeout(() => {
        b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
        b[key] = setTimeout(() => b.classList.remove(cls), ms);
      }, delay);
    }
    function react(kind, i, blockers = []) {
      if (grid.classList.contains('solved')) return;
      if (kind === 'look') {                         // ✕ messa/tolta o riccio tolto: i vicini guardano lì
        H.nearHogs(s.n, s.board, i, 2).forEach((k) => gazeAt(k, i, 1200));
      } else if (kind === 'good') {                  // saltello felice, i vicini salutano con un cuoricino
        flash(cells[i], 'joy', 950);
        const near = new Set(H.nearHogs(s.n, s.board, i, 3));
        hogCells(i).forEach((b) => {
          const k = +b.dataset.i;
          gazeAt(k, i, 1500);
          if (near.has(k)) flash(b, 'love', 1500, 120 + Math.random() * 180);
        });
      } else if (kind === 'bad') {                   // chi blocca si preoccupa, tutti guardano il riccio che piange
        hogCells(i).forEach((b) => gazeAt(+b.dataset.i, i, 1100));
        blockers.forEach((k) => flash(cells[k], 'worry', 1150));
      }
    }

    // ogni tanto un riccio si guarda intorno (timer lento, niente rAF)
    let idle = 0;
    const LOOKS = [[-1, 0, -6], [1, 0, 6], [0, -1, 0], [-0.7, -0.7, -5], [0.7, -0.7, 5], [-1, 0.35, -3], [1, 0.35, 3]];
    function startIdle() {
      if (idle || reducedMotion()) return;
      idle = setInterval(() => {
        if (!el.isConnected || !grid || !grid.isConnected) { clearInterval(idle); idle = 0; return; }
        if ((G.document && G.document.hidden) || busy || grid.classList.contains('solved')) return;
        const free = hogCells().filter((b) => !b._gz);
        if (!free.length) return;
        const b = free[(Math.random() * free.length) | 0];
        const [x, y, tilt] = LOOKS[(Math.random() * LOOKS.length) | 0];
        setGaze(b, x, y, Math.random() < 0.5 ? tilt : 0, 900 + Math.random() * 900);
      }, 1500);
    }

    /* ---------- mosse ---------- */
    function pushHist() {
      s.hist.push({ board: s.board.slice() });
      if (s.hist.length > 80) s.hist.shift();
    }

    function tryPlace(i) {
      if (busy || s.board[i] === 2) return;
      const j = H.judge(s.n, s.regions, s.solution, s.board, i);
      s.moves++;
      if (j.correct) {
        pushHist();
        s.board[i] = 2;
        paint(i);
        react('good', i);
        ctx.sfx.place();
        ctx.changed();
        return;
      }
      // errore: riccio che piange, chi lo blocca si preoccupa, cuore perso
      busy = true;
      last = null;
      s.mistakes++;
      const b = cells[i];
      b.dataset.v = -1;
      b.innerHTML = hogSvg();
      b.classList.add('wrong');
      j.blockers.forEach((k) => cells[k].classList.add('blame'));
      react('bad', i, j.blockers);
      ctx.mistake(LIVES - s.mistakes);
      ctx.changed();
      setTimeout(() => {
        b.classList.remove('wrong');
        j.blockers.forEach((k) => cells[k].classList.remove('blame'));
        busy = false;
        if (s.mistakes >= LIVES) return;          // l'app mostra "cuori finiti" e fa ricominciare
        pushHist();
        s.board[i] = 1;                            // al posto dell'errore resta una ✕
        paint();
        ctx.changed();
      }, 1100);
    }

    function shakeGiven(i) {
      const b = cells[i];
      b.classList.remove('locked'); void b.offsetWidth; b.classList.add('locked');
      ctx.sfx.bad();
    }

    function removeHog(i) {
      if (s.given.includes(i)) { shakeGiven(i); return false; }
      pushHist();
      s.board[i] = 0;
      s.moves++;
      paint();
      react('look', i);
      ctx.sfx.mark();
      ctx.changed();
      return true;
    }

    // tap singolo: vuoto ↔ ✕, riccio → vuoto. Ritorna true se ha registrato una mossa.
    function singleTap(i) {
      if (busy) return false;
      if (s.board[i] === 2) return removeHog(i);
      pushHist();
      s.board[i] = H.tapValue(s.board[i]);
      s.moves++;
      paint();
      react('look', i);
      ctx.sfx.mark();
      ctx.changed();
      return true;
    }

    // riccio: lo mette o lo toglie
    function toggleHog(i) {
      if (busy) return;
      if (s.board[i] === 2) removeHog(i); else tryPlace(i);
    }

    // doppio tap: ritira l'effetto del primo tap (se ha registrato una mossa) e mette/toglie il riccio
    function doubleTap(i, first) {
      if (busy) return;
      if (first && first.v === 2) return;            // c'era un riccio: il primo tap l'ha già tolto, basta così
      if (first && first.pushed && s.hist.length === first.h) {
        s.board = s.hist.pop().board;                 // la ✕ del primo tap non conta come mossa
        s.moves = Math.max(0, s.moves - 1);
      }
      toggleHog(i);
    }

    /* ---------- input ---------- */
    let stroke = null;
    let last = null;              // ultimo tap singolo: { i, t, v (valore prima), pushed, h (lunghezza cronologia) }
    const now = () => (G.performance ? G.performance.now() : Date.now());
    const cellAt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const b = e && e.closest && e.closest('.hd-cell');
      return b && grid.contains(b) ? +b.dataset.i : -1;
    };

    el.addEventListener('click', (e) => {
      const b = e.target.closest('.hd-cell');
      if (b && e.detail === 0) singleTap(+b.dataset.i);     // attivazione da lettore di schermo
    });

    el.addEventListener('keydown', (e) => {
      const b = e.target.closest && e.target.closest('.hd-cell');
      if (!b || !grid.contains(b)) return;
      const i = +b.dataset.i, n = s.n;
      const mv = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv) {
        e.preventDefault();
        const c = i % n;
        if ((e.key === 'ArrowLeft' && c === 0) || (e.key === 'ArrowRight' && c === n - 1)) return;
        const nb = cells[i + mv];
        if (nb) { b.tabIndex = -1; nb.tabIndex = 0; nb.focus(); }
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) singleTap(i); }
      else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); if (!e.repeat) toggleHog(i); }
    });
    el.addEventListener('keyup', (e) => { if (e.key === ' ' && e.target.closest && e.target.closest('.hd-cell')) e.preventDefault(); });

    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.hd-cell');
      if (!b || !grid.contains(b) || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const i = +b.dataset.i;
      const dbl = H.isDoubleTap(last, i, now());
      stroke = { start: i, moved: false, dbl, first: dbl ? last : null, before: s.board.slice(), seen: new Set([i]), paint: s.board[i] === 1 ? 0 : 1 };
      last = null;
      try { grid.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });

    el.addEventListener('pointermove', (e) => {
      if (!stroke || stroke.dbl) return;
      const j = cellAt(e.clientX, e.clientY);
      if (j < 0 || stroke.seen.has(j)) return;
      if (!stroke.moved) {
        stroke.moved = true;
        if (s.board[stroke.start] !== 2) s.board[stroke.start] = stroke.paint;
      }
      stroke.seen.add(j);
      if (s.board[j] !== 2) s.board[j] = stroke.paint;
      paint();
    });

    function end() {
      if (!stroke) return;
      const st = stroke;
      stroke = null;
      if (st.moved) {
        if (st.before.some((v, i) => v !== s.board[i])) {
          s.hist.push({ board: st.before });
          if (s.hist.length > 80) s.hist.shift();
          s.moves++;
          ctx.sfx.mark();
          ctx.changed();
        }
      } else if (st.dbl) doubleTap(st.start, st.first);
      else {
        const v = s.board[st.start];
        const pushed = singleTap(st.start);
        last = { i: st.start, t: now(), v, pushed, h: s.hist.length };
      }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { if (stroke && !stroke.moved) stroke = null; else end(); });

    /* ---------- avvio ---------- */
    function restart() {
      clearTimeout(winTimer);
      s.board = new Array(s.n * s.n).fill(0);
      s.given.forEach((i) => { s.board[i] = 2; });
      s.hist = []; s.moves = 0; s.mistakes = 0;
      build();
      ctx.changed({ reset: true });
    }

    const ok = saved && saved.n && H.validate(saved.n, saved.regions) && Array.isArray(saved.board) && saved.board.length === saved.n * saved.n;
    if (ok) {
      s = Object.assign({ hist: [], moves: 0, mistakes: 0, given: [] }, saved);
      if (!Array.isArray(s.solution)) s.solution = H.findSolutions(s.n, s.regions, 1)[0];
      // vecchi salvataggi: tieni solo i ricci giusti; cronologia nel nuovo formato
      s.board = s.board.map((v, i) => (v === 2 && s.solution[(i / s.n) | 0] !== i % s.n ? 1 : v));
      s.hist = s.hist.map((h) => (Array.isArray(h) ? { board: h } : h));
      if (s.mistakes >= LIVES) { s.mistakes = 0; s.board = s.board.map((v, i) => (s.given.includes(i) ? 2 : 0)); s.hist = []; }
      build();
    } else fresh();
    startIdle();

    return {
      fresh,
      restart,
      undo() {
        if (busy || !s.hist.length) return;
        last = null;
        s.board = s.hist.pop().board;
        s.moves = Math.max(0, s.moves - 1);
        paint(); ctx.sfx.mark(); ctx.changed();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'hedgedoku', name: 'Hedgedoku', rules: 'r1', art, create, lives: LIVES,
    tutorial: [
      { key: 'tu_hedgedoku_1', en: 'One hedgehog in every row, every column and every colour.', art: tutorialArt(1) },
      { key: 'tu_hedgedoku_2', en: 'Hedgehogs never touch, not even diagonally.', art: tutorialArt(2) },
      { key: 'tu_hedgedoku_3', en: 'Tap = ✕ · double tap = hedgehog.', art: tutorialArt(3) },
    ],
    rate: (s) => Math.max(1, 3 - (s.mistakes || 0)),
    parTime: (s) => s.n * s.n * 2,
    progress: (s) => {
      const placed = s.board.filter((v) => v === 2).length - s.given.length;
      return Math.max(0, Math.min(1, placed / Math.max(1, s.n - s.given.length)));
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
