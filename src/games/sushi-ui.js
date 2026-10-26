/* Sushi Bar — interfaccia.
 * Bancone con i clienti (ordine nel fumetto + barra della pazienza), nastro con gli ingredienti che scorre,
 * tagliere di Hari cuoco. Tocca un ingrediente sul nastro per metterlo sul tagliere, tocca il cliente per servire.
 * Il ciclo di gioco gira con requestAnimationFrame e si ferma da solo se la schermata viene chiusa.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  /* ---------- disegni (viewBox 40×40) ---------- */
  const ING = {
    rice: '<ellipse cx="20" cy="24" rx="14" ry="10" fill="var(--su-rice)" stroke="var(--su-ink)" stroke-width="2"/><path d="M12 22q2-2 4 0M19 19q2-2 4 0M24 25q2-2 4 0M15 27q2-2 4 0" stroke="var(--su-grain)" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    nori: '<rect x="8" y="9" width="24" height="22" rx="3" fill="var(--su-nori)" stroke="var(--su-ink)" stroke-width="2"/><path d="M12 14l6 0M12 19l10 0" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>',
    salmon: '<path d="M6 25c4-10 22-14 28-6-4 8-22 12-28 6z" fill="var(--su-salmon)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/><path d="M13 25c3-4 7-6 11-6M17 27c3-3 7-5 11-5" stroke="#fff" stroke-opacity=".75" stroke-width="2" fill="none" stroke-linecap="round"/>',
    tuna: '<path d="M7 14h26l-2 14H9z" fill="var(--su-tuna)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/><path d="M13 18l4 6M21 18l4 6" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>',
    cucumber: '<circle cx="20" cy="20" r="13" fill="var(--su-cuke)" stroke="var(--su-ink)" stroke-width="2"/><circle cx="20" cy="20" r="9" fill="var(--su-cuke-in)"/><g fill="var(--su-cuke)"><ellipse cx="20" cy="15" rx="1.4" ry="2"/><ellipse cx="25" cy="20" rx="2" ry="1.4"/><ellipse cx="20" cy="25" rx="1.4" ry="2"/><ellipse cx="15" cy="20" rx="2" ry="1.4"/></g>',
    egg: '<rect x="8" y="12" width="24" height="16" rx="3" fill="var(--su-egg)" stroke="var(--su-ink)" stroke-width="2"/><path d="M9 17h22M9 22h22" stroke="var(--su-egg-2)" stroke-width="1.6"/>',
    shrimp: '<path d="M10 26c0-10 10-16 20-12-6 0-10 4-10 9 0 3 2 5 5 5-6 4-15 3-15-2z" fill="var(--su-shrimp)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/><path d="M30 14l5-4M30 14l5 1" stroke="var(--su-ink)" stroke-width="2" stroke-linecap="round"/><path d="M15 20l3 3M19 17l2 4" stroke="#fff" stroke-opacity=".7" stroke-width="1.8" stroke-linecap="round"/>',
    avocado: '<path d="M20 6c7 0 12 9 12 17a12 12 0 0 1-24 0c0-8 5-17 12-17z" fill="var(--su-avo)" stroke="var(--su-ink)" stroke-width="2"/><path d="M20 10c5 0 9 7 9 13a9 9 0 0 1-18 0c0-6 4-13 9-13z" fill="var(--su-avo-in)"/><circle cx="20" cy="24" r="5" fill="var(--su-pit)"/>',
  };
  const ingSVG = (k, cls = '') => `<svg class="su-ing ${cls}" viewBox="0 0 40 40" aria-hidden="true">${ING[k]}</svg>`;

  /* piatti finiti (viewBox 48×40) */
  const nigiri = (topping) => `<ellipse cx="24" cy="27" rx="17" ry="8" fill="var(--su-rice)" stroke="var(--su-ink)" stroke-width="2"/>${topping}`;
  const maki = (center) => `<circle cx="24" cy="21" r="15" fill="var(--su-nori)" stroke="var(--su-ink)" stroke-width="2"/><circle cx="24" cy="21" r="11" fill="var(--su-rice)"/>${center}`;
  const DISH = {
    onigiri: '<path d="M24 6c5 0 16 18 16 24 0 3-3 5-16 5S8 33 8 30c0-6 11-24 16-24z" fill="var(--su-rice)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/><rect x="16" y="24" width="16" height="11" rx="2" fill="var(--su-nori)"/>',
    sake: nigiri('<path d="M8 22c6-9 26-11 32-3-5 6-27 8-32 3z" fill="var(--su-salmon)" stroke="var(--su-ink)" stroke-width="2"/><path d="M16 21c3-3 6-4 9-4M22 22c3-3 6-4 9-4" stroke="#fff" stroke-opacity=".75" stroke-width="2" fill="none" stroke-linecap="round"/>'),
    maguro: nigiri('<path d="M8 21c6-7 26-8 32-2-5 5-27 7-32 2z" fill="var(--su-tuna)" stroke="var(--su-ink)" stroke-width="2"/>'),
    ebi: nigiri('<path d="M8 22c4-8 22-11 30-6l4-4v6c-6 6-28 9-34 4z" fill="var(--su-shrimp)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/><path d="M16 19v4M22 17v5M28 17v4" stroke="#fff" stroke-opacity=".7" stroke-width="1.8" stroke-linecap="round"/>'),
    tamago: nigiri('<rect x="10" y="12" width="28" height="12" rx="2" fill="var(--su-egg)" stroke="var(--su-ink)" stroke-width="2"/><rect x="20" y="10" width="8" height="24" rx="1.5" fill="var(--su-nori)"/>'),
    kappa: maki('<circle cx="24" cy="21" r="5" fill="var(--su-cuke)"/>'),
    sakemaki: maki('<circle cx="24" cy="21" r="5" fill="var(--su-salmon)"/>'),
    california: '<circle cx="24" cy="21" r="15" fill="var(--su-rice)" stroke="var(--su-ink)" stroke-width="2"/><g fill="var(--su-salmon)"><circle cx="15" cy="15" r="1.4"/><circle cx="31" cy="13" r="1.4"/><circle cx="33" cy="25" r="1.4"/><circle cx="14" cy="28" r="1.4"/><circle cx="24" cy="34" r="1.4"/></g><circle cx="24" cy="21" r="8" fill="var(--su-nori)"/><path d="M19 21a5 5 0 0 1 10 0z" fill="var(--su-avo)"/><path d="M19 21a5 5 0 0 0 10 0z" fill="var(--su-cuke)"/>',
    temaki: '<path d="M10 10l28 2-12 26z" fill="var(--su-nori)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/><ellipse cx="24" cy="11" rx="14" ry="5" fill="var(--su-rice)" stroke="var(--su-ink)" stroke-width="2"/><path d="M15 8c3-5 8-5 10 0z" fill="var(--su-tuna)"/><path d="M25 8c2-5 7-5 9 0z" fill="var(--su-avo)"/>',
  };
  const dishSVG = (id) => `<svg class="su-dish" viewBox="0 0 48 40" aria-hidden="true">${DISH[id]}</svg>`;

  /* clienti (viewBox 60×60): orecchie/dettagli + faccina comune */
  const EARS = {
    bunny: '<ellipse cx="21" cy="12" rx="5" ry="13" fill="var(--su-a1)" stroke="var(--su-ink)" stroke-width="2"/><ellipse cx="39" cy="12" rx="5" ry="13" fill="var(--su-a1)" stroke="var(--su-ink)" stroke-width="2"/><ellipse cx="21" cy="13" rx="2.2" ry="9" fill="var(--petal)"/><ellipse cx="39" cy="13" rx="2.2" ry="9" fill="var(--petal)"/>',
    cat: '<path d="M12 22l4-16 12 10zM48 22l-4-16-12 10z" fill="var(--su-a2)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/>',
    panda: '<circle cx="15" cy="15" r="7" fill="var(--su-ink)"/><circle cx="45" cy="15" r="7" fill="var(--su-ink)"/>',
    frog: '<circle cx="19" cy="15" r="9" fill="var(--su-a4)" stroke="var(--su-ink)" stroke-width="2"/><circle cx="41" cy="15" r="9" fill="var(--su-a4)" stroke="var(--su-ink)" stroke-width="2"/>',
    fox: '<path d="M10 24l5-19 13 11zM50 24l-5-19-13 11z" fill="var(--su-a5)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/><path d="M14 18l2-8 6 5zM46 18l-2-8-6 5z" fill="var(--su-a1)"/>',
    bear: '<circle cx="15" cy="15" r="7" fill="var(--su-a6)" stroke="var(--su-ink)" stroke-width="2"/><circle cx="45" cy="15" r="7" fill="var(--su-a6)" stroke="var(--su-ink)" stroke-width="2"/>',
    chick: '<path d="M30 8c-2-5 2-7 3-3 1-4 5-2 2 3" fill="var(--su-a7)" stroke="var(--su-ink)" stroke-width="2" stroke-linejoin="round"/>',
    penguin: '',
  };
  const FACE = { bunny: 'var(--su-a1)', cat: 'var(--su-a2)', panda: 'var(--su-a1)', frog: 'var(--su-a4)', fox: 'var(--su-a5)', bear: 'var(--su-a6)', chick: 'var(--su-a7)', penguin: 'var(--su-a8)' };
  function animalSVG(a) {
    const extra = a === 'panda' ? '<ellipse cx="22" cy="33" rx="6" ry="7" fill="var(--su-ink)" transform="rotate(-20 22 33)"/><ellipse cx="38" cy="33" rx="6" ry="7" fill="var(--su-ink)" transform="rotate(20 38 33)"/>'
      : a === 'fox' ? '<path d="M14 36c6 8 26 8 32 0-4 12-28 12-32 0z" fill="var(--su-a1)"/>'
      : a === 'penguin' ? '<path d="M18 26c0-6 5-8 12-4 7-4 12-2 12 4 0 12-5 18-12 18s-12-6-12-18z" fill="var(--su-a1)"/>'
      : '';
    const beak = a === 'chick' || a === 'penguin' ? '<path d="M26 40l4 4 4-4z" fill="var(--su-beak)" stroke="var(--su-ink)" stroke-width="1.6" stroke-linejoin="round"/>'
      : '<ellipse cx="30" cy="40" rx="2.2" ry="1.6" fill="var(--su-ink)"/>';
    return `<svg class="su-animal" viewBox="0 0 60 60" aria-hidden="true">
      ${EARS[a]}
      <circle cx="30" cy="34" r="20" fill="${FACE[a]}" stroke="var(--su-ink)" stroke-width="2.2"/>
      ${extra}
      <g class="su-eyes"><ellipse cx="22" cy="33" rx="3" ry="3.6" fill="var(--su-eye)"/><ellipse cx="38" cy="33" rx="3" ry="3.6" fill="var(--su-eye)"/>
      <circle cx="23" cy="31.8" r="1.2" fill="#fff"/><circle cx="39" cy="31.8" r="1.2" fill="#fff"/></g>
      <ellipse cx="16" cy="40" rx="3.6" ry="2.2" fill="var(--petal)" opacity=".8"/><ellipse cx="44" cy="40" rx="3.6" ry="2.2" fill="var(--petal)" opacity=".8"/>
      ${beak}
      <path class="su-smile" d="M26 44q4 4 8 0" fill="none" stroke="var(--su-ink)" stroke-width="2" stroke-linecap="round"/>
      <path class="su-frown" d="M26 47q4-4 8 0" fill="none" stroke="var(--su-ink)" stroke-width="2" stroke-linecap="round"/>
      <path class="su-brows" d="M18 26l7 2M42 26l-7 2" stroke="var(--su-ink)" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  const CHEF_HAT = '<svg class="su-hat" viewBox="0 0 60 40" aria-hidden="true"><path d="M14 30c-8 0-11-12-3-15 0-9 12-12 19-6 7-6 19-3 19 6 8 3 5 15-3 15z" fill="var(--su-hat)" stroke="var(--su-ink)" stroke-width="2.2" stroke-linejoin="round"/><rect x="14" y="28" width="32" height="9" rx="3" fill="var(--su-hat)" stroke="var(--su-ink)" stroke-width="2.2"/></svg>';

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <rect x="4" y="52" width="112" height="18" rx="9" fill="var(--su-belt)"/>
    <rect x="4" y="52" width="112" height="4" rx="2" fill="#fff" opacity=".25"/>
    ${[['salmon', 10], ['rice', 40], ['nori', 70]].map(([k, x]) => `<g transform="translate(${x} 44)"><ellipse cx="14" cy="18" rx="14" ry="5" fill="var(--su-dishplate)" stroke="var(--su-ink)" stroke-width="1.5"/><svg x="3" y="0" width="22" height="22" viewBox="0 0 40 40">${ING[k]}</svg></g>`).join('')}
    <svg x="8" y="2" width="38" height="38" viewBox="0 0 60 60">${animalSVG('cat').replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
    <svg x="74" y="2" width="38" height="38" viewBox="0 0 60 60">${animalSVG('bunny').replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
    <svg x="46" y="4" width="28" height="24" viewBox="0 0 48 40">${DISH.sake}</svg>
  </svg>`;

  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function create(el, ctx, saved) {
    const S = HH.sushi;
    const t = HH.i18n.t;
    let s, raf = 0, last = 0;
    let seatEls = [], beltEl, beltItems = new Map(), boardEl, servedEl;

    function fresh() {
      s = S.newLevel(ctx.level, Math.random);
      s.moves = 0; s.mistakes = 0;
      build();
      ctx.changed({ reset: true });
      start();
    }

    /* ---------- DOM ---------- */
    function build() {
      el.innerHTML = `<div class="su-wrap">
        <div class="su-counter">${s.seats.map((_, i) => `<button class="su-seat" data-seat="${i}"></button>`).join('')}</div>
        <div class="su-belt" style="--dur:${(1 / s.cfg.speed / 3).toFixed(2)}s"><div class="su-belt-track"></div></div>
        <div class="su-kitchen">
          <div class="su-chef">${HH.mascot.mini()}${CHEF_HAT}</div>
          <div class="su-board" aria-live="polite"></div>
          <button class="su-trash" aria-label="${t('trash')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13M10.5 10.5v6M13.5 10.5v6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
        <div class="su-served"></div>
      </div>`;
      seatEls = [...el.querySelectorAll('.su-seat')];
      beltEl = el.querySelector('.su-belt-track');
      boardEl = el.querySelector('.su-board');
      servedEl = el.querySelector('.su-served');
      beltItems = new Map();
      s.belt.forEach(addItem);
      s.seats.forEach((c, i) => renderSeat(i));
      renderBoard();
      renderServed();
      positionItems();
    }

    function renderSeat(i, anim = '') {
      const c = s.seats[i], b = seatEls[i];
      if (!c) { b.className = 'su-seat empty'; b.innerHTML = '<span class="su-stool" aria-hidden="true"></span>'; b.removeAttribute('aria-label'); return; }
      b.className = `su-seat ${anim}`;
      b.setAttribute('aria-label', `${c.animal}: ${c.recipe.ing.join(', ')}`);
      b.innerHTML = `<span class="su-order">${dishSVG(c.recipe.id)}<span class="su-recipe">${c.recipe.ing.map((k) => ingSVG(k, 'mini')).join('')}</span></span>
        ${animalSVG(c.animal)}
        <span class="su-patience"><i></i></span>`;
      updatePatience(i);
    }
    function updatePatience(i) {
      const c = s.seats[i];
      if (!c) return;
      const p = Math.max(0, c.patience / c.max);
      const bar = seatEls[i].querySelector('.su-patience i');
      if (bar) { bar.style.width = `${p * 100}%`; bar.dataset.level = p < 0.3 ? 'low' : p < 0.6 ? 'mid' : 'ok'; }
      seatEls[i].classList.toggle('grumpy', p < 0.3);
    }

    function addItem(it) {
      const b = document.createElement('button');
      b.className = 'su-item';
      b.dataset.id = it.id;
      b.setAttribute('aria-label', it.ing);
      b.innerHTML = `<span class="su-dishplate"></span>${ingSVG(it.ing)}`;
      beltEl.appendChild(b);
      beltItems.set(it.id, b);
    }
    function positionItems() {
      const W = beltEl.clientWidth, sz = 52;
      s.belt.forEach((it) => {
        const b = beltItems.get(it.id);
        if (b) b.style.transform = `translateX(${(it.x * (W + sz) - sz).toFixed(1)}px)`;
      });
    }
    function renderBoard(pop = false) {
      const slots = [];
      for (let k = 0; k < S.PLATE_MAX; k++) {
        const ing = s.plate[k];
        slots.push(`<span class="su-slot${ing ? ' full' : ''}${pop && k === s.plate.length - 1 ? ' pop' : ''}">${ing ? ingSVG(ing) : ''}</span>`);
      }
      boardEl.innerHTML = slots.join('');
      const ready = s.seats.findIndex((c) => c && S.matches(s.plate, c.recipe.ing));
      seatEls.forEach((b, i) => b.classList.toggle('ready', i === ready));
    }
    function renderServed() {
      servedEl.innerHTML = `<span>${t('served')}</span><b>${s.served}</b><span>/ ${s.goal}</span>
        <span class="su-progress"><i style="width:${(s.served / s.goal) * 100}%"></i></span>`;
    }

    /* ---------- ciclo di gioco ---------- */
    function loop(now) {
      if (!el.isConnected) { raf = 0; return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (dt > 0 && !S.isOver(s)) {
        const ev = S.step(s, dt, Math.random);
        ev.forEach(onEvent);
        s.seats.forEach((_, i) => updatePatience(i));
        positionItems();
      }
      if (S.isOver(s)) { raf = 0; return; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }

    function onEvent(e) {
      if (e.type === 'item') { addItem(e.item); return; }
      if (e.type === 'gone') { const b = beltItems.get(e.item.id); if (b) b.remove(); beltItems.delete(e.item.id); return; }
      if (e.type === 'arrive') { renderSeat(e.seat, 'arrive'); ctx.sfx.blip(); renderBoard(); return; }
      if (e.type === 'lost') {
        const b = seatEls[e.seat];
        b.innerHTML = `${animalSVG(e.c.animal)}<span class="su-storm" aria-hidden="true"></span>`;
        b.className = 'su-seat leaving angry';
        s.mistakes = s.lost;
        ctx.mistake(S.LIVES - s.lost);
        ctx.changed();
        setTimeout(() => { if (!s.seats[e.seat]) renderSeat(e.seat); }, 900);
      }
    }

    /* ---------- input ---------- */
    el.onclick = (e) => {
      if (S.isOver(s)) return;
      const it = e.target.closest('.su-item');
      if (it) {
        const id = +it.dataset.id;
        if (s.plate.length >= S.PLATE_MAX) { boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake'); ctx.sfx.bad(); return; }
        if (S.take(s, id)) {
          s.moves++;
          it.remove(); beltItems.delete(id);
          renderBoard(true);
          ctx.sfx.mark();
          ctx.changed();
        }
        return;
      }
      if (e.target.closest('.su-trash')) {
        if (S.trash(s)) { s.moves++; renderBoard(); ctx.sfx.set(); ctx.changed(); }
        return;
      }
      const seat = e.target.closest('.su-seat');
      if (seat && !seat.classList.contains('empty')) {
        const i = +seat.dataset.seat;
        const c = s.seats[i];
        const r = S.serve(s, i);
        s.moves++;
        if (r === 'ok') {
          flyDish(c.recipe.id, seat);
          seat.innerHTML = `${animalSVG(c.animal)}<span class="su-hearts" aria-hidden="true"><i></i><i></i><i></i></span>`;
          seat.className = 'su-seat leaving happy';
          ctx.sfx.cupDone();
          setTimeout(() => { if (!s.seats[i]) renderSeat(i); }, 900);
          renderBoard(); renderServed();
          ctx.changed();
          if (S.isWon(s)) setTimeout(ctx.win, 700);
        } else if (r === 'wrong') {
          seat.classList.remove('nope'); void seat.offsetWidth; seat.classList.add('nope');
          ctx.sfx.bad(); ctx.react('oops');
          ctx.changed();
        }
      }
    };

    function flyDish(id, seat) {
      if (reduce()) return;
      const wrap = el.querySelector('.su-wrap');
      const a = boardEl.getBoundingClientRect(), b = seat.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      const d = document.createElement('div');
      d.className = 'su-fly';
      d.innerHTML = dishSVG(id);
      d.style.left = `${a.left - w.left + a.width / 2 - 28}px`;
      d.style.top = `${a.top - w.top}px`;
      wrap.appendChild(d);
      d.animate([
        { transform: 'translate(0,0) scale(.6)', opacity: 1 },
        { transform: `translate(${(b.left - a.left + b.width / 2 - a.width / 2) / 2}px, ${(b.top - a.top) / 2 - 40}px) scale(1.15)`, offset: 0.5 },
        { transform: `translate(${b.left - a.left + b.width / 2 - a.width / 2}px, ${b.top - a.top + 20}px) scale(.8)`, opacity: 0.2 },
      ], { duration: 550, easing: 'ease-in-out', fill: 'forwards' });
      setTimeout(() => d.remove(), 600);
    }

    /* ---------- avvio ---------- */
    const ok = saved && saved.cfg && Array.isArray(saved.seats) && Array.isArray(saved.belt) && saved.goal > 0;
    if (ok && !S.isOver(saved)) {
      s = Object.assign({ moves: 0, mistakes: saved.lost || 0 }, saved);
      build();
      start();
    } else fresh();

    return {
      fresh,
      restart() { cancelAnimationFrame(raf); raf = 0; s = S.newLevel(s.level, Math.random); s.moves = 0; s.mistakes = 0; build(); ctx.changed({ reset: true }); start(); },
      // annulla: toglie l'ultimo ingrediente dal tagliere
      undo() { if (!s.plate.length || S.isOver(s)) return; s.plate.pop(); renderBoard(); ctx.sfx.set(); ctx.changed(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'sushi', name: 'Sushi Bar', rules: 'r4', art, create, lives: 3,
    rate: (s) => HH.sushi.rate(s),
    parTime: (s) => s.goal * 9,
    progress: (s) => Math.max(0, Math.min(1, s.served / s.goal)),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
