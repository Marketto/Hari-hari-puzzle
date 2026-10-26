/* Pixel Mochi — interfaccia. Nonogram (picross) con disegni kawaii fatti a mano.
 * Ogni mossa è verificata subito contro l'unica soluzione (3 cuori, come Hedgedoku):
 *   riempi una cella che va vuota → cuore perso, la cella diventa ✕
 *   segna ✕ una cella che va piena → cuore perso, la cella si riempie
 * Gli indizi di una riga/colonna completata si spengono e le celle rimaste ricevono la ✕ in automatico.
 * Alla vittoria il disegno si colora cella per cella (tavolozza --pm-c-*), le fessure si chiudono, spuntano gli occhi
 * e il disegno prende vita (rimbalzo, battito di ciglia, scintille) con il suo nome.
 *
 * Comandi: due strumenti (Riempi / Segna ✕). Tocco = usa lo strumento; trascina = tutta la fila (asse bloccato
 *   dopo la prima cella); pressione lunga = l'altro strumento su quella cella. Tastiera: frecce + Invio/Spazio,
 *   X = segna. Tocca una ✕ con "Segna" per toglierla.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const LIVES = 3;
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    pm_fill: 'Fill', pm_hint: 'Drag along a line · hold for the other tool', pm_picture: 'Mystery picture',
  };
  const L = (k) => label(k, EN[k] || (k === 'mark' ? 'Mark' : k));
  const picName = (id) => { const p = HH.pixel.PICS.find((x) => x[0] === id); return label('pm_n_' + id, p ? p[1] : id); };

  /* ---------- illustrazioni (solo token CSS) ---------- */
  // card: mini nonogram 5×5 con fragola mezza rivelata
  const art = () => {
    const pic = ['.ggg.', 'rrgrr', 'ryrrr', '.rry.', '..r..'];
    let cells = '';
    pic.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = 44 + c * 14, y = 18 + r * 14;
      const lit = r + c >= 4;
      cells += ch === '.'
        ? `<rect x="${x}" y="${y}" width="12.5" height="12.5" rx="3" fill="var(--pm-tile)"/>${r + c < 3 ? '' : `<path d="M${x + 4} ${y + 4}l4.5 4.5M${x + 8.5} ${y + 4}l-4.5 4.5" stroke="var(--pm-x)" stroke-width="1.6" stroke-linecap="round"/>`}`
        : `<rect x="${x}" y="${y}" width="12.5" height="12.5" rx="3" fill="${lit ? `var(--pm-c-${ch})` : 'var(--pm-fill)'}"/><rect x="${x + 2}" y="${y + 1.6}" width="5" height="2.4" rx="1.2" fill="var(--pm-gloss)"/>`;
    }));
    const num = (x, y, t) => `<text x="${x}" y="${y}" class="pm-svgnum">${t}</text>`;
    return `<svg viewBox="0 0 120 90" aria-hidden="true">
      <rect x="6" y="3" width="108" height="86" rx="14" fill="var(--pm-paper)"/>
      <rect x="40" y="14" width="74" height="74" rx="8" fill="var(--pm-paper-2)"/>
      ${num(30, 29, 3)}${num(22, 43, '2 2')}${num(30, 57, '1 3')}${num(30, 71, 2)}${num(30, 85, 1)}
      ${num(49, 11, 2)}${num(63, 11, 4)}${num(77, 11, 4)}${num(91, 11, 4)}${num(105, 11, 1)}
      ${cells}
      <g class="pm-art-spark"><path d="M107 20l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" fill="var(--pm-spark)"/></g>
    </svg>`;
  };

  const TUT = [
    { key: 'tu_pixel_1', en: 'Each number is a block of filled squares, in order, with gaps between blocks.',
      art: `<svg viewBox="0 0 120 90"><rect x="4" y="8" width="112" height="74" rx="14" fill="var(--pm-paper)"/>
        <text x="20" y="50" class="pm-svgnum big">3 1</text>
        ${[0, 1, 2, 3, 4].map((c) => `<rect x="${42 + c * 14}" y="36" width="12" height="12" rx="3.5" fill="var(--pm-tile)"/>`).join('')}
        ${[0, 1, 2, 4].map((c, k) => `<rect class="pm-tut-fill" style="--d:${k * 0.35}s" x="${42 + c * 14}" y="36" width="12" height="12" rx="3.5" fill="var(--pm-fill)"/>`).join('')}
        <path class="pm-tut-x" d="M${42 + 3 * 14 + 3.5} 39.5l5 5M${42 + 3 * 14 + 8.5} 39.5l-5 5" stroke="var(--pm-x)" stroke-width="2" stroke-linecap="round"/></svg>` },
    { key: 'tu_pixel_2', en: 'Tap or drag to fill; switch to ✕ to mark empty squares. Hold for the other tool.',
      art: `<svg viewBox="0 0 120 90"><rect x="4" y="8" width="112" height="74" rx="14" fill="var(--pm-paper)"/>
        ${[0, 1, 2, 3, 4].map((c) => `<rect x="${26 + c * 14}" y="30" width="12" height="12" rx="3.5" fill="var(--pm-tile)"/>`).join('')}
        ${[0, 1, 2, 3].map((c, k) => `<rect class="pm-tut-drag" style="--d:${0.25 + k * 0.28}s" x="${26 + c * 14}" y="30" width="12" height="12" rx="3.5" fill="var(--pm-fill)"/>`).join('')}
        <rect x="36" y="58" width="22" height="16" rx="8" fill="var(--pm-fill)"/><rect x="62" y="58" width="22" height="16" rx="8" fill="var(--pm-tile)" stroke="var(--pm-x)" stroke-width="1.5"/>
        <path d="M69 62l8 8M77 62l-8 8" stroke="var(--pm-x)" stroke-width="2" stroke-linecap="round"/>
        ${HH.tutHand ? HH.tutHand(32, 40, 'tut-go', '--dx:44px;--dy:0px') : ''}</svg>` },
    { key: 'tu_pixel_3', en: 'A wrong square costs a heart. Solve it to bring a cute picture to life!',
      art: `<svg viewBox="0 0 120 90"><rect x="4" y="8" width="112" height="74" rx="14" fill="var(--pm-paper)"/>
        <g class="pm-tut-alive">${['.r.r.', 'rrrrr', 'r@r@r', '.rrr.', '..r..'].map((row, r) => [...row].map((ch, c) => (ch === '.' ? ''
          : ch === '@' ? `<circle cx="${33 + c * 11}" cy="${20 + r * 11}" r="3.2" fill="var(--pm-eye)"/><circle cx="${34 + c * 11}" cy="${19 + r * 11}" r="1.1" fill="var(--pm-hi)"/>`
          : `<rect x="${27.5 + c * 11}" y="${14.5 + r * 11}" width="11" height="11" fill="var(--pm-c-${ch})"/>`)).join('')).join('')}</g>
        <g class="pm-tut-heart"><path d="M96 30c-3-5-11-3-9 3 1 3 9 8 9 8s8-5 9-8c2-6-6-8-9-3z" fill="var(--bad)"/></g>
        <g class="pm-art-spark"><path d="M24 22l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill="var(--pm-spark)"/></g></svg>` },
  ];

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const P = HH.pixel;
    let s;          // { id, mirror, total, board, hist, moves, mistakes }
    let pz;         // puzzle costruito da id + mirror
    let mode = HH.store.get('pm:mode', 'fill');
    let grid, cells = [], rowClues = [], colClues = [], thumb = [], countEl, banner;
    let timers = [], busy = false, revealed = false, focusI = 0;

    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    function fresh() {
      const recent = HH.store.get('pm:recent', []);
      pz = P.generate(ctx.level, Math.random, { avoid: recent });
      HH.store.set('pm:recent', [pz.id].concat(recent.filter((x) => x !== pz.id)).slice(0, 6));
      s = P.newGame(pz);
      build();
      ctx.changed({ reset: true });
    }

    /* ---------- DOM ---------- */
    function build() {
      clearTimers();
      busy = false; revealed = false; stroke = null;
      const { w, h, rows, cols, paint: pix } = pz;
      const lc = Math.max(...rows.map((c) => Math.max(1, c.length)));
      const tc = Math.max(...cols.map((c) => Math.max(1, c.length)));
      // gli occhi stanno sul colore più frequente intorno
      const eyeBg = (r, c) => {
        const cnt = {};
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= h || cc >= w) continue;
          const x = pix[rr * w + cc];
          if (x !== '.' && x !== '@') cnt[x] = (cnt[x] || 0) + (dr && dc ? 1 : 2);
        }
        return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 'w';
      };
      const nums = (c) => (c.length ? c : [0]).map((v) => `<i${v > 9 ? ' class="dd"' : ''}>${v}</i>`).join('');
      const html = [`<div class="pm-corner" aria-hidden="true"><div class="pm-thumb" style="--w:${w};--h:${h}">${'<b></b>'.repeat(w * h)}</div></div>`];
      for (let c = 0; c < w; c++) html.push(`<div class="pm-clue pm-col${c % 5 === 4 && c < w - 1 ? ' g5' : ''}" data-k="${c}">${nums(cols[c])}</div>`);
      for (let r = 0; r < h; r++) {
        html.push(`<div class="pm-clue pm-row${r % 5 === 4 && r < h - 1 ? ' g5' : ''}" data-k="${r}">${nums(rows[r])}</div>`);
        for (let c = 0; c < w; c++) {
          const i = r * w + c, ch = pix[i];
          const blk = ((Math.floor(r / 5) + Math.floor(c / 5)) % 2) ? ' alt' : '';
          const col = ch === '@' ? `--c:var(--pm-c-${eyeBg(r, c)});` : ch !== '.' ? `--c:var(--pm-c-${ch});` : '';
          html.push(`<button type="button" class="pm-cell${blk}${ch === '@' ? ' eye' : ''}" style="${col}--d:${(r + c) * 34}ms" data-i="${i}" data-v="0" tabindex="${i === 0 ? 0 : -1}" aria-label="${r + 1}, ${c + 1}">${ch === '@' ? '<span class="pm-eye"></span>' : ''}</button>`);
        }
      }
      el.innerHTML = `<div class="pm-wrap" style="--w:${w};--h:${h};--lc:${lc};--tc:${tc}" data-n="${Math.max(w, h)}">
        <div class="pm-bar">
          <div class="pm-modes" role="radiogroup">
            <button type="button" class="pm-mode" data-mode="fill" role="radio"><span class="pm-ico fill" aria-hidden="true"></span><span>${L('pm_fill')}</span></button>
            <button type="button" class="pm-mode" data-mode="cross" role="radio"><span class="pm-ico cross" aria-hidden="true"></span><span>${L('mark')}</span></button>
          </div>
          <div class="pm-count" aria-live="polite"><span class="pm-mochi" aria-hidden="true"><i></i></span><b></b><small>/ ${s.total}</small></div>
        </div>
        <div class="pm-paper">
          <div class="pm-grid" dir="ltr" role="grid" aria-label="${L('pm_picture')}">${html.join('')}</div>
          <div class="pm-sparks" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => `<i style="--k:${k}"></i>`).join('')}</div>
          <div class="pm-banner" aria-live="polite"></div>
        </div>
        <p class="pm-hint">${L('pm_hint')}</p>
      </div>`;
      grid = el.querySelector('.pm-grid');
      cells = [...grid.querySelectorAll('.pm-cell')];
      rowClues = [...grid.querySelectorAll('.pm-row')];
      colClues = [...grid.querySelectorAll('.pm-col')];
      thumb = [...el.querySelectorAll('.pm-thumb b')];
      countEl = el.querySelector('.pm-count b');
      banner = el.querySelector('.pm-banner');
      setMode(mode);
      paint();
      if (P.isSolved(pz, s.board)) reveal();
    }

    function setMode(m) {
      mode = m === 'cross' ? 'cross' : 'fill';
      HH.store.set('pm:mode', mode);
      el.querySelectorAll('.pm-mode').forEach((b) => {
        const on = b.dataset.mode === mode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on);
      });
      if (grid) grid.dataset.mode = mode;
    }

    // aggiorna celle, miniatura, indizi spenti e contatore
    function paint(pops) {
      const { w, h } = pz;
      let filled = 0;
      cells.forEach((b, i) => {
        const v = s.board[i];
        if (v === 1) filled++;
        if (+b.dataset.v !== v) {
          b.dataset.v = v;
          b.classList.remove('pop', 'auto');
          if (pops && pops.has(i)) { void b.offsetWidth; b.classList.add(pops.get(i)); }
        }
        thumb[i].className = v === 1 ? 'on' : '';
      });
      for (let r = 0; r < h; r++) rowClues[r].classList.toggle('done', P.lineDone(pz, s.board, 'r', r));
      for (let c = 0; c < w; c++) colClues[c].classList.toggle('done', P.lineDone(pz, s.board, 'c', c));
      countEl.textContent = filled;
    }

    /* ---------- mosse (regole in HH.pixel: applyCell / commit) ---------- */
    // azione su una cella dentro un tocco o un tratto; ritorna false se è stato un errore (il tratto si ferma)
    function apply(i, act, pops) {
      const r = P.applyCell(s, pz, i, act);
      if (r.changed) pops.set(i, 'pop');
      if (r.ok) return true;
      const b = cells[i];
      b.classList.remove('bad', 'bad-fill', 'bad-cross'); void b.offsetWidth; b.classList.add('bad', act === 'fill' ? 'bad-fill' : 'bad-cross');
      later(() => b.classList.remove('bad', 'bad-fill', 'bad-cross'), 900);
      ctx.mistake(LIVES - s.mistakes);
      if (s.mistakes >= LIVES) busy = true;              // l'app mostra "cuori finiti" e fa ricominciare
      return false;
    }

    // fine di un tocco/tratto: ✕ automatiche, indizi spenti, suoni, salvataggio, vittoria
    function commit(before, pops, act, ok) {
      const res = P.commit(s, pz, before);
      if (!res) { paint(); return; }
      res.autos.forEach((i) => pops.set(i, 'auto'));
      paint(pops);
      res.newly.forEach((k) => { const e = (k[0] === 'r' ? rowClues : colClues)[+k.slice(1)]; e.classList.remove('ding'); void e.offsetWidth; e.classList.add('ding'); });
      if (ok) {
        if (res.newly.length && ctx.sfx.cupDone) ctx.sfx.cupDone();
        else if (act === 'fill') ctx.sfx.place(); else ctx.sfx.mark();
      }
      ctx.changed();
      if (res.solved) reveal();
    }

    /* ---------- vittoria: il disegno si colora e prende vita ---------- */
    function reveal() {
      if (revealed) return;
      revealed = true; busy = true;
      const wrap = el.querySelector('.pm-wrap');
      // il disegno va al centro del foglio, ingrandito (lascia spazio al nome sotto)
      const paper = el.querySelector('.pm-paper').getBoundingClientRect();
      const g = grid.getBoundingClientRect(), a = cells[0].getBoundingClientRect(), z = cells[cells.length - 1].getBoundingClientRect();
      if (g.width && paper.width) {
        const pw = z.right - a.left, ph = z.bottom - a.top;
        const k = Math.min((paper.width - 28) / pw, (paper.height - 70) / ph, 1.7);
        const gcx = g.left + g.width / 2, gcy = g.top + g.height / 2;
        const tx = paper.left + paper.width / 2, ty = paper.top + (paper.height - 44) / 2;
        grid.style.setProperty('--sk', k.toFixed(3));
        grid.style.setProperty('--sx', `${(tx - gcx - k * ((a.left + z.right) / 2 - gcx)).toFixed(1)}px`);
        grid.style.setProperty('--sy', `${(ty - gcy - k * ((a.top + z.bottom) / 2 - gcy)).toFixed(1)}px`);
      }
      wrap.classList.add('solved');
      const span = (pz.w + pz.h) * 34;
      later(() => {
        wrap.classList.add('alive');
        banner.innerHTML = `<span>${picName(pz.id)}</span>`;
        if (ctx.sfx.giggle) ctx.sfx.giggle();
        if (ctx.react) ctx.react('happy');
      }, span + 650);
      later(() => ctx.win(), span + 2300);
    }

    /* ---------- input ---------- */
    let stroke = null;
    const cellAt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const b = e && e.closest && e.closest('.pm-cell');
      return b && grid.contains(b) ? +b.dataset.i : -1;
    };
    const actFor = (i, m) => {
      const v = s.board[i];
      if (m === 'fill') return v === 0 ? 'fill' : null;
      return v === 0 ? 'cross' : v === 2 ? 'clear' : null;
    };
    function hot(i) {
      const r = i < 0 ? -1 : (i / pz.w) | 0, c = i < 0 ? -1 : i % pz.w;
      rowClues.forEach((e, k) => e.classList.toggle('hot', k === r));
      colClues.forEach((e, k) => e.classList.toggle('hot', k === c));
    }
    function nudge(i) { const b = cells[i]; b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); }

    // tocco singolo (anche da tastiera)
    function tap(i, m = mode) {
      if (busy) return;
      const act = actFor(i, m);
      if (!act) { nudge(i); return; }
      const before = s.board.slice(), pops = new Map();
      const ok = apply(i, act, pops);
      commit(before, pops, act, ok);
    }

    el.addEventListener('click', (e) => {
      const m = e.target.closest('.pm-mode');
      if (m) { setMode(m.dataset.mode); ctx.sfx.tap(); return; }
      const b = e.target.closest('.pm-cell');
      if (b && e.detail === 0) tap(+b.dataset.i);      // tastiera (Invio / Spazio)
    });

    el.addEventListener('keydown', (e) => {
      const b = e.target.closest && e.target.closest('.pm-cell');
      if (!b) return;
      const i = +b.dataset.i, r = (i / pz.w) | 0, c = i % pz.w;
      const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
      if (mv) {
        e.preventDefault();
        const nr = Math.max(0, Math.min(pz.h - 1, r + mv[0])), nc = Math.max(0, Math.min(pz.w - 1, c + mv[1]));
        focusCell(nr * pz.w + nc);
      } else if (e.key === 'x' || e.key === 'X') { e.preventDefault(); tap(i, 'cross'); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); tap(i, 'fill'); }
    });
    el.addEventListener('focusin', (e) => { const b = e.target.closest && e.target.closest('.pm-cell'); if (b) hot(+b.dataset.i); });
    function focusCell(i) {
      if (cells[focusI]) cells[focusI].tabIndex = -1;
      focusI = i; cells[i].tabIndex = 0; cells[i].focus();
    }

    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.pm-cell');
      if (!b || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const i = +b.dataset.i;
      hot(i);
      stroke = { start: i, r: (i / pz.w) | 0, c: i % pz.w, axis: null, act: actFor(i, mode), moved: false, long: false,
        before: s.board.slice(), pops: new Map(), seen: new Set([i]), ok: true, ticks: 0 };
      stroke.timer = setTimeout(() => {
        if (!stroke || stroke.moved) return;
        stroke.long = true;
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) { /* niente vibrazione */ }
        tap(i, mode === 'fill' ? 'cross' : 'fill');
      }, 430);
      try { grid.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });

    el.addEventListener('pointermove', (e) => {
      if (!stroke) { if (e.pointerType === 'mouse') { const j = cellAt(e.clientX, e.clientY); if (j >= 0) hot(j); } return; }
      if (stroke.long || !stroke.ok || busy) return;
      const j = cellAt(e.clientX, e.clientY);
      if (j < 0 || j === stroke.start && !stroke.moved) return;
      const r = (j / pz.w) | 0, c = j % pz.w;
      if (!stroke.axis) {
        if (r === stroke.r && c === stroke.c) return;
        stroke.axis = Math.abs(c - stroke.c) >= Math.abs(r - stroke.r) ? 'h' : 'v';
      }
      if (!stroke.moved) {
        stroke.moved = true;
        clearTimeout(stroke.timer);
        if (!stroke.act) { stroke.ok = false; return; }
        stroke.ok = apply(stroke.start, stroke.act, stroke.pops);
        if (!stroke.ok) { live(); return; }
      }
      // proiezione sull'asse: tutte le celle fra l'inizio e il dito
      const tr = stroke.axis === 'h' ? stroke.r : r, tc = stroke.axis === 'h' ? c : stroke.c;
      hot(tr * pz.w + tc);
      const steps = Math.abs(stroke.axis === 'h' ? tc - stroke.c : tr - stroke.r);
      const dr = Math.sign(tr - stroke.r), dc = Math.sign(tc - stroke.c);
      for (let k = 1; k <= steps; k++) {
        const q = (stroke.r + dr * k) * pz.w + stroke.c + dc * k;
        if (stroke.seen.has(q)) continue;
        stroke.seen.add(q);
        if (s.board[q] !== (stroke.act === 'clear' ? 2 : 0)) continue;
        stroke.ok = apply(q, stroke.act, stroke.pops);
        if (!stroke.ok) break;
        if (ctx.sfx.tap && stroke.ticks++ < 12) ctx.sfx.tap();
      }
      live();
    });
    // durante il trascinamento la tavola si aggiorna subito (senza ✕ automatiche: arrivano a fine tratto)
    function live() { paint(stroke.pops); }

    function end() {
      if (!stroke) return;
      const st = stroke;
      stroke = null;
      clearTimeout(st.timer);
      if (st.long) return;
      if (st.moved) commit(st.before, st.pops, st.act, st.ok);
      else tap(st.start);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', (e) => { if (!stroke && e.pointerType === 'mouse') hot(-1); });

    /* ---------- avvio ---------- */
    function restart() {
      clearTimers();
      s.board = new Array(pz.w * pz.h).fill(0);
      s.hist = []; s.moves = 0; s.mistakes = 0;
      build();
      ctx.changed({ reset: true });
    }

    const back = saved && P.restore(saved);
    if (back) { s = back; pz = P.puzzleOf(s); build(); } else fresh();

    return {
      fresh,
      restart,
      undo() {
        if (busy || !P.undo(s)) return;
        paint(); ctx.sfx.mark(); ctx.changed();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'pixel', name: 'Pixel Mochi', rules: 'r7', art, create, lives: LIVES,
    tutorial: TUT,
    // fragoline: 3 senza errori, 2 con uno, 1 con due
    rate: (s) => HH.pixel.rate(s),
    // circa 1,6 s per cella: 5×5 = 40 s, 10×10 = 160 s
    parTime: (s) => Math.round((s.board ? s.board.length : 25) * 1.6),
    progress: (s) => HH.pixel.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
