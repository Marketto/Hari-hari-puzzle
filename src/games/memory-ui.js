/* Hari Memory — interfaccia.
 * Carte coperte su un tavolino; tocco = gira la carta (flip 3D in CSS). Due carte uguali restano scoperte
 * (saltello + cuori e stelline), due diverse scuotono e tornano giù da sole dopo un attimo (o subito al tocco successivo).
 * Variante "swap": dopo un errore una delle due carte scivola al posto di una vicina (animazione visibile).
 * Annulla non fa nulla: in un Memory permetterebbe di sbirciare le carte gratis.
 * Accessibilità: ogni carta è un <button> "Carta N" con aria-pressed; tastiera: frecce + Invio/Spazio.
 * Il fronte di una carta coperta è vuoto nel DOM: si disegna solo quando la carta si gira (niente sbirciatine).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const MISS_MS = 1100;          // le due carte sbagliate restano girate così a lungo
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    mm_card: 'Card', mm_pairs: 'Pairs found', mm_new: 'New!',
    mm_themed: 'Match each animal with its snack!', mm_swap: 'After a mistake a card slides away: watch it!',
  };
  const L = (k) => label(k, EN[k]);
  const A = () => HH.memoryArt;

  /* ---------- illustrazione della card (120×90) ---------- */
  const mini = (x, y, w, rot, inner, cls = '') => `<g transform="translate(${x} ${y}) rotate(${rot})"><g class="mm-a-card ${cls}">
    <rect x="${-w / 2}" y="${-w / 2}" width="${w}" height="${w}" rx="${w * .16}" fill="${inner ? 'var(--mm-face)' : 'var(--mm-back)'}" stroke="${inner ? 'var(--mm-face-line)' : 'var(--mm-back-line)'}" stroke-width="2"/>
    ${(inner || A().back()).replace('<svg class="', `<svg x="${-w / 2 + (inner ? w * .1 : 0)}" y="${-w / 2 + (inner ? w * .1 : 0)}" width="${inner ? w * .8 : w}" height="${inner ? w * .8 : w}" class="`)}</g></g>`;
  const art = () => `<svg viewBox="0 0 120 90" class="mm-art" aria-hidden="true">
    ${mini(30, 50, 40, -12, A().face('squirrel'))}${mini(90, 50, 40, 12, A().face('acorn'))}${mini(60, 44, 42, 0, '', 'mm-a-flip')}</svg>`;

  /* ---------- tutorial ---------- */
  const tCard = (x, y, w, id) => mini(x + w / 2, y + w / 2, w, 0, id ? A().face(id) : '');
  const heart = (x, y, s) => `<path d="M${x} ${y + s * .9}C${x - s * 1.4} ${y} ${x - s * .6} ${y - s} ${x} ${y - s * .2}C${x + s * .6} ${y - s} ${x + s * 1.4} ${y} ${x} ${y + s * .9}Z" fill="var(--mm-heart)" stroke="var(--mm-ink)" stroke-width="1.4"/>`;
  const tutorial = [
    { key: 'tu_memory_1', en: 'Tap a card to turn it over, then tap a second one.',
      art: () => `<svg viewBox="0 0 120 90" class="mm-tu" aria-hidden="true">${tCard(14, 24, 40)}<g class="mm-tu-a">${tCard(66, 24, 40)}</g><g class="mm-tu-b">${tCard(66, 24, 40, 'fox')}</g>${HH.tutHand ? HH.tutHand(88, 52) : ''}</svg>` },
    { key: 'tu_memory_2', en: 'Same picture? The pair stays face up. If not, they turn back: remember where they were!',
      art: () => `<svg viewBox="0 0 120 90" class="mm-tu" aria-hidden="true"><g class="mm-tu-hop">${tCard(14, 30, 40, 'fox')}</g><g class="mm-tu-hop">${tCard(66, 30, 40, 'fox')}</g>${heart(60, 18, 7)}${heart(46, 12, 4)}${heart(74, 12, 4)}</svg>` },
    { key: 'tu_memory_3', en: 'Later on: match each animal with its snack, and watch out for cards that slide!',
      art: () => `<svg viewBox="0 0 120 90" class="mm-tu" aria-hidden="true">${tCard(8, 26, 38, 'squirrel')}<path d="M52 45h16M62 39l6 6-6 6" fill="none" stroke="var(--mm-text)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${tCard(74, 26, 38, 'acorn')}</svg>` },
  ];
  // l'arte del tutorial serve come stringa: la si genera al primo uso (memory-art.js è già caricato)
  tutorial.forEach((t) => { const f = t.art; Object.defineProperty(t, 'art', { get: f, enumerable: true }); });

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const M = HH.memory;
    let s, grid, cards = [], fillEl, countEl, won = false, missT = 0, winT = 0, focusI = 0;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); clearTimeout(missT); clearTimeout(winT); };

    function fresh() {
      s = M.newGame(ctx.level, (Math.random() * 2147483647) | 0);
      build();
      ctx.changed({ reset: true });
    }

    function build() {
      clearTimers();
      won = M.isSolved(s);
      const N = s.deck.length;
      const html = [];
      for (let i = 0; i < N; i++) html.push(`<button type="button" class="mm-card" data-i="${i}" style="--i:${(i % s.cols) + ((i / s.cols) | 0)}" tabindex="${i === focusI ? 0 : -1}" aria-label="${L('mm_card')} ${i + 1}" aria-pressed="false">
        <span class="mm-in"><span class="mm-side mm-back">${A().back()}</span><span class="mm-side mm-front"></span></span></button>`);
      const tip = s.mode === 'themed' ? L('mm_themed') : s.swap ? L('mm_swap') : '';
      el.innerHTML = `<div class="mm-wrap" style="--cols:${s.cols};--rows:${s.rows}">
        <div class="mm-bar">
          ${s.isNew ? `<span class="mm-new">${L('mm_new')}</span>` : ''}
          <span class="mm-track" aria-hidden="true"><span class="mm-fill"></span></span>
          <span class="mm-count" role="status" aria-label="${L('mm_pairs')}"></span>
        </div>
        <div class="mm-table"><div class="mm-grid c${s.cols}" dir="ltr">${html.join('')}</div></div>
        ${tip ? `<p class="mm-tip">${tip}</p>` : ''}
      </div>`;
      grid = el.querySelector('.mm-grid');
      cards = [...grid.children];
      fillEl = el.querySelector('.mm-fill');
      countEl = el.querySelector('.mm-count');
      cards.forEach((_, i) => paintCard(i));
      bar();
      if (won) grid.classList.add('solved');
    }
    function paintCard(i) {
      const c = cards[i], up = s.up.includes(i), found = !!s.found[i];
      if (up || found) c.querySelector('.mm-front').innerHTML = A().face(s.deck[i]);
      c.classList.toggle('up', up);
      c.classList.toggle('found', found);
      c.setAttribute('aria-pressed', up || found ? 'true' : 'false');
    }
    function bar() {
      const got = s.found.reduce((n, x) => n + x, 0) / 2;
      fillEl.style.width = `${Math.round((100 * got) / s.pairs)}%`;
      countEl.textContent = `${got}/${s.pairs}`;
    }
    function retrigger(c, cls) { c.classList.remove(cls); void c.offsetWidth; c.classList.add(cls); }

    const BURST = ['heart', 'star', 'heart', 'star', 'heart', 'star'];
    const ICON = {
      heart: '<svg viewBox="0 0 20 20"><path d="M10 17C2 11 2 6 5.5 4.5C8 3.5 10 6 10 6C10 6 12 3.5 14.5 4.5C18 6 18 11 10 17Z" fill="var(--mm-heart)" stroke="var(--mm-ink)" stroke-width="1.2"/></svg>',
      star: '<svg viewBox="0 0 20 20"><path d="M10 1.5L12.6 7L18.5 7.6L14 11.6L15.3 17.6L10 14.5L4.7 17.6L6 11.6L1.5 7.6L7.4 7Z" fill="var(--mm-star)" stroke="var(--mm-ink)" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    };
    function burst(c) {
      const b = document.createElement('span');
      b.className = 'mm-burst';
      b.innerHTML = BURST.map((k, j) => {
        const a = (j / BURST.length) * Math.PI * 2 - Math.PI / 2 + (Math.random() - .5) * .5, d = 26 + Math.random() * 16;
        return `<i style="--k:${j};--x:${(Math.cos(a) * d).toFixed(0)}px;--y:${(Math.sin(a) * d).toFixed(0)}px;--r:${Math.round(Math.random() * 80 - 40)}deg">${ICON[k]}</i>`;
      }).join('');
      c.appendChild(b);
      later(() => b.remove(), 1300);
    }

    /* ---------- mosse ---------- */
    function settleNow() {
      clearTimeout(missT);
      if (!M.pending(s)) return;
      const [a, b] = s.up;
      const r = M.settle(s);
      paintCard(a); paintCard(b);
      if (r.swap) slide(r.swap[0], r.swap[1]);
      ctx.changed();
    }
    // le due carte si scambiano di posto: ognuna parte dal posto dell'altra
    function slide(x, y) {
      const rx = cards[x].getBoundingClientRect(), ry = cards[y].getBoundingClientRect();
      const go = (c, from, to) => { c.style.setProperty('--dx', `${from.left - to.left}px`); c.style.setProperty('--dy', `${from.top - to.top}px`); retrigger(c, 'slide'); };
      later(() => {
        go(cards[x], ry, rx); go(cards[y], rx, ry);
        ctx.sfx.pour(260);
        later(() => { cards[x].classList.remove('slide'); cards[y].classList.remove('slide'); }, 600);
      }, 380);
    }
    function tap(i) {
      if (won) return;
      if (M.pending(s)) {
        if (s.up.includes(i)) { settleNow(); return; }   // toccare una delle due carte sbagliate le rimette giù
        settleNow();
      }
      const r = M.flip(s, i);
      if (r.type === 'invalid') { if (s.found[i]) retrigger(cards[i], 'pop'); return; }
      paintCard(i);
      if (r.type === 'first') { ctx.sfx.tap(); ctx.changed(); return; }
      if (r.type === 'match') {
        paintCard(r.a);
        ctx.sfx.place();
        bar();
        later(() => {
          [r.a, r.b].forEach((j) => { retrigger(cards[j], 'pop'); burst(cards[j]); });
          ctx.sfx.cupDone();
        }, 260);
        ctx.react('happy');
        if (r.solved) celebrate();
        ctx.changed();
        return;
      }
      // errore: scuotimento, poi le carte tornano giù da sole
      ctx.sfx.mark();
      later(() => { [r.a, r.b].forEach((j) => retrigger(cards[j], 'shake')); ctx.sfx.lightOff(); }, 380);
      if (r.slip) ctx.react('oops');      // solo se la compagna era già stata vista: niente rimproveri per la sfortuna
      missT = setTimeout(settleNow, MISS_MS);
      ctx.changed();
    }
    function celebrate() {
      won = true;
      later(() => grid.classList.add('solved'), 500);
      winT = setTimeout(ctx.win, 1500);
    }

    /* ---------- input ---------- */
    function focusCard(i) {
      cards[focusI] && cards[focusI].setAttribute('tabindex', -1);
      focusI = i;
      cards[i].setAttribute('tabindex', 0);
      cards[i].focus();
    }
    el.onclick = (e) => {
      const c = e.target.closest('.mm-card');
      if (!c || !grid.contains(c)) return;
      const i = +c.dataset.i;
      cards[focusI] && cards[focusI].setAttribute('tabindex', -1);
      focusI = i; c.setAttribute('tabindex', 0);
      tap(i);
    };
    el.onkeydown = (e) => {
      const c = e.target.closest && e.target.closest('.mm-card');
      if (!c) return;
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (!mv) return;
      e.preventDefault();
      const i = +c.dataset.i, r = Math.max(0, Math.min(s.rows - 1, ((i / s.cols) | 0) + mv[0])), cc = Math.max(0, Math.min(s.cols - 1, (i % s.cols) + mv[1]));
      focusCard(r * s.cols + cc);
    };

    function restart() {
      // stesse carte, stesso posto: tutte di nuovo coperte
      const t = M.newGame(s.level, s.seed);
      s = t;
      build();
      ctx.changed({ reset: true });
    }

    if (saved && M.validate(saved)) {
      s = saved;
      if (M.pending(s)) M.settle(s);   // due carte sbagliate lasciate girate prima di chiudere
      build();
    } else fresh();

    return {
      fresh,
      restart,
      undo() { /* in un Memory annullare farebbe sbirciare le carte: non fa nulla */ },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'memory', name: 'Hari Memory', rules: 'r15', art, create, tutorial,
    rulesEn: 'Turn over two cards at a time and find the pairs: forest animals, nuts, berries, trees and leaves. Remember where each picture hides: fewer moves, more strawberries!',
    rate: (s) => HH.memory.rate(s),
    parTime: (s) => HH.memory.parTime(s),
    progress: (s) => HH.memory.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
