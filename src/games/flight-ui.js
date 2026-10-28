/* Hari Airlines — interfaccia.
 * Cabina vista di sbieco dal muso: in alto la coda con la cucina, in basso la cabina di pilotaggio del capitano gufo;
 * file di sedili 2+2 con il corridoio in mezzo, cappelliere sopra ogni coppia di sedili, finestrini con la tratta.
 * Ogni volo è una sequenza di fasi (barra in alto); ogni fase si apre con un cartello (e "Nuovo!" quando arriva
 * per la prima volta) e le fasi a tempo partono solo al tocco su "Via!". Il ciclo gira con requestAnimationFrame
 * solo durante le fasi a tempo e si ferma con pause() o se la schermata viene chiusa.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    fl_board: 'Boarding', fl_bags: 'Luggage', fl_belts: 'Seatbelts', fl_galley: 'Galley', fl_serve: 'Service', fl_trash: 'Tidy up', fl_land: 'Landing',
    fl_h_board: 'Count the passengers coming aboard!',
    fl_h_bags: 'Put every bag in an overhead bin. Keep the exits clear!',
    fl_h_belts: 'Tap until every seatbelt is fastened, before takeoff!',
    fl_h_galley: 'Make the captain’s meal, then heat the trays: not cold, not burnt!',
    fl_h_serve: 'Pick from the cart and give everyone what they asked for.',
    fl_h_trash: 'Collect the rubbish in the right bag before landing.',
    fl_q_count: 'How many passengers boarded?', fl_q_missing: 'How many are still missing?', fl_list: 'Captain’s list',
    fl_go: 'Go!', fl_new: 'New!', fl_replay: 'Watch again', fl_happy: 'Happy passengers', fl_land_btn: 'Land!',
    fl_cold: 'Still cold!', fl_burnt: 'Burnt!', fl_full: 'No room!', fl_late: 'Late passengers on the way!',
    fl_takeoff: 'Takeoff', fl_ready: 'Ready?',
    fl_i_water: 'Water', fl_i_juice: 'Juice', fl_i_tea: 'Tea', fl_i_cookie: 'Cookie', fl_i_meal: 'Hot meal', fl_i_blanket: 'Blanket', fl_i_pillow: 'Pillow',
    fl_s_paper: 'Paper', fl_s_plastic: 'Plastic', fl_s_food: 'Food waste',
  };
  const L = (k) => label(k, EN[k] || k);
  const A = () => HH.flightArt;
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SACK_KEY = { paper: 'fl_s_paper', plastic: 'fl_s_plastic', food: 'fl_s_food', all: 'fl_trash' };

  /* ---------- illustrazione della card ---------- */
  const art = () => HH.flightArt.art();

  /* ---------- tutorial ---------- */
  const inner = (s) => s.replace(/^<svg[^>]*>|<\/svg>$/g, '');
  const at = (svgStr, x, y, w, h, vb) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}">${inner(svgStr)}</svg>`;
  const tutorial = [
    { key: 'tu_flight_1', en: 'Boarding! Watch the door and count who comes in: someone may hide or pop back out.',
      art: () => `<svg viewBox="0 0 120 90" class="fl-tu" aria-hidden="true"><rect x="40" y="10" width="40" height="66" rx="16" fill="var(--fl-door)" stroke="var(--fl-ink)" stroke-width="2"/>
        <rect x="46" y="16" width="28" height="56" rx="12" fill="var(--fl-jet)"/>
        <g class="fl-tu-walk">${at(A().head('bunny', 'joy'), 30, 34, 26, 26, '0 0 40 40')}</g><g class="fl-tu-walk b">${at(A().head('bear'), 30, 40, 22, 22, '0 0 40 40')}</g>
        <rect x="6" y="8" width="26" height="22" rx="8" fill="var(--fl-card)" stroke="var(--fl-ink)" stroke-width="1.6"/><text x="19" y="24" text-anchor="middle" class="fl-tu-num">2</text>${HH.tutHand(30, 26)}</svg>` },
    { key: 'tu_flight_2', en: 'Tap a passenger to ask them to fasten the seatbelt. Some need you to insist!',
      art: () => `<svg viewBox="0 0 120 90" class="fl-tu" aria-hidden="true"><rect x="34" y="12" width="52" height="64" rx="14" fill="var(--fl-seat)" stroke="var(--fl-ink)" stroke-width="2"/>
        ${at(A().head('cat', 'wait'), 40, 14, 40, 40, '0 0 40 40')}<g class="fl-tu-belt">${at(A().beltOn, 36, 54, 48, 17, '0 0 40 14')}</g>
        <g class="fl-tu-sign">${at(A().beltSign, 6, 6, 26, 16, '0 0 36 22')}</g>${HH.tutHand(64, 64)}</svg>` },
    { key: 'tu_flight_3', en: 'Drag bags into the overhead bins: big suitcases take more room!',
      art: () => `<svg viewBox="0 0 120 90" class="fl-tu" aria-hidden="true"><rect x="10" y="10" width="100" height="26" rx="8" fill="var(--fl-bin)" stroke="var(--fl-ink)" stroke-width="2"/>
        ${at(A().bag(2, 1), 14, 13, 48, 22, '0 0 48 22')}<g class="fl-tu-bag">${at(A().bag(2, 0), 62, 56, 46, 21, '0 0 48 22')}</g>${HH.tutHand(84, 70, 'tut-go', '--dx:-2px;--dy:-44px')}</svg>` },
    { key: 'tu_flight_4', en: 'Cook, serve what each passenger asks for and collect the rubbish. Happy passengers, more strawberries!',
      art: () => `<svg viewBox="0 0 120 90" class="fl-tu" aria-hidden="true">${at(A().head('fox', 'joy'), 64, 34, 44, 44, '0 0 40 40')}
        <path d="M56 6h52a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H76l-6 6v-6H56a8 8 0 0 1-8-8V14a8 8 0 0 1 8-8z" fill="var(--fl-bubble)" stroke="var(--fl-ink)" stroke-width="1.6"/>
        ${at(A().item('juice'), 58, 8, 24, 24, '0 0 32 32')}${at(A().item('cookie'), 82, 8, 24, 24, '0 0 32 32')}
        <rect x="6" y="46" width="44" height="34" rx="8" fill="var(--fl-cart)" stroke="var(--fl-ink)" stroke-width="2"/>${at(A().item('juice'), 14, 50, 26, 26, '0 0 32 32')}${HH.tutHand(27, 66)}</svg>` },
  ];
  tutorial.forEach((t) => { const f = t.art; Object.defineProperty(t, 'art', { get: f, enumerable: true }); });

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const F = HH.flight;
    let s, raf = 0, last = 0, paused = false, introOpen = false, advancing = false, sel = null, drag = null;
    let wrap, stage, panel, bar, intro, toastEl, timerEl;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const $ = (q) => el.querySelector(q);
    const $$ = (q) => [...el.querySelectorAll(q)];
    const retrigger = (n, cls) => { if (!n) return; n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); };

    function fresh() { s = F.newGame(ctx.level, (Math.random() * 2147483647) | 0); build(true); ctx.changed({ reset: true }); }
    function restart() { s = F.newGame(s.level, s.seed); build(true); ctx.changed({ reset: true }); }

    /* ---------- struttura ---------- */
    function build(showIntro) {
      stop(); clearTimers();
      sel = null; advancing = false;
      const ph = F.phase(s);
      el.innerHTML = `<div class="fl-wrap" data-route="${s.route}">
        <ol class="fl-bar" aria-label="${L('fl_' + ph)}"></ol>
        <div class="fl-stage"></div>
        <div class="fl-panel"></div>
        <div class="fl-toast" aria-live="polite"></div>
        <div class="fl-intro" hidden></div>
      </div>`;
      wrap = $('.fl-wrap'); stage = $('.fl-stage'); panel = $('.fl-panel'); bar = $('.fl-bar'); intro = $('.fl-intro'); toastEl = $('.fl-toast');
      renderBar();
      renderPhase();
      if (F.isWon(s)) { landing(); return; }
      if (s.ph.done) { later(next, 400); return; }
      if (showIntro || !s.ph.go) openIntro(!showIntro); else start();
    }
    function renderBar() {
      const cur = F.phase(s);
      bar.innerHTML = s.phases.concat('land').map((p, i) => `<li class="${i < s.pi ? 'done' : p === cur ? 'cur' : ''}" title="${L('fl_' + p)}">${A().phaseIcon(p)}${i < s.pi ? '<i class="fl-tick"></i>' : ''}</li>`).join('<li class="fl-dash" aria-hidden="true"></li>');
      bar.setAttribute('aria-label', `${L('fl_' + cur)} · ${Math.min(s.pi + 1, s.phases.length)}/${s.phases.length}`);
    }

    /* ---------- cartello della fase ---------- */
    function openIntro(resumeOnly) {
      introOpen = true;
      const ph = F.phase(s);
      const isNew = s.isNew === ph && !resumeOnly;
      intro.innerHTML = `<div class="fl-card">
        ${isNew ? `<span class="fl-new">${L('fl_new')}</span>` : ''}
        <span class="fl-card-ic">${A().phaseIcon(ph)}</span>
        <h3>${resumeOnly ? L('fl_ready') : L('fl_' + ph)}</h3>
        <p>${L('fl_h_' + ph)}</p>
        <button type="button" class="candy fl-go">${L('fl_go')}</button></div>`;
      intro.hidden = false;
      wrap.classList.add('fl-paused');
      intro.querySelector('.fl-go').onclick = () => {
        intro.hidden = true; introOpen = false;
        wrap.classList.remove('fl-paused');
        ctx.sfx.blip();
        if (ph === 'belts') ctx.sfx.chime ? ctx.sfx.chime() : ctx.sfx.lightOn(3);
        F.start(s);
        ctx.changed();
        start();
      };
      later(() => { const b = intro.querySelector('.fl-go'); if (b) b.focus({ preventScroll: true }); }, 50);
    }

    /* ---------- ciclo ---------- */
    function loop(now) {
      if (!el.isConnected) { raf = 0; return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (dt > 0 && s.ph && s.ph.go && !s.ph.done) {
        const ev = F.step(s, dt);
        ev.forEach(onEvent);
        tick();
        if (ev.length) ctx.changed();
      }
      if (!s.ph || s.ph.done || !F.TIMED[s.ph.id] || paused || introOpen) { raf = 0; return; }
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (paused || introOpen || !s.ph || s.ph.done || !F.TIMED[s.ph.id] || !s.ph.go) return;
      if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function toast(text, kind = '') {
      toastEl.textContent = text;
      toastEl.className = `fl-toast show ${kind}`;
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(() => { toastEl.className = 'fl-toast'; }, 1400);
    }

    /* ---------- fine fase ---------- */
    function phaseDone() {
      if (advancing) return;
      advancing = true;
      stop();
      ctx.sfx.milestone();
      ctx.react('happy');
      stage.insertAdjacentHTML('beforeend', `<span class="fl-stamp" aria-hidden="true">${A().phaseIcon(F.phase(s))}</span>`);
      ctx.changed();
      later(next, 1300);
    }
    function next() {
      F.advance(s);
      advancing = false;
      sel = null;
      ctx.changed();
      renderBar();
      if (F.isWon(s)) { renderPhase(); landing(); return; }
      renderPhase();
      openIntro(false);
    }

    /* ---------- fasi ---------- */
    // a schermo intero il riquadro si riadatta quando la fase cambia altezza (portellone, cabina, cucina)
    const refit = () => { if (document.fullscreenElement || document.webkitFullscreenElement) later(() => G.dispatchEvent(new Event('resize')), 60); };
    function renderPhase() {
      refit();
      const ph = F.phase(s);
      wrap.dataset.phase = ph;
      stage.innerHTML = ''; panel.innerHTML = '';
      if (ph === 'board') return renderBoard();
      if (ph === 'galley') return renderGalley();
      if (ph === 'land') { stage.innerHTML = cabinHTML(); paintCabin(); return; }
      stage.innerHTML = cabinHTML();
      paintCabin();
      if (ph === 'bags') renderBagsPanel();
      if (ph === 'belts') panel.innerHTML = `<div class="fl-sign">${A().beltSign}</div>${timerHTML('fl_takeoff')}`;
      if (ph === 'serve') renderCart();
      if (ph === 'trash') renderSacks();
      timerEl = $('.fl-timer i');
      tick();
    }
    const timerHTML = (k) => `<div class="fl-timer" role="timer" aria-label="${L(k)}"><span class="fl-timer-ic">${A().phaseIcon(k === 'fl_takeoff' ? 'land' : 'land')}</span><span class="fl-track"><i></i></span></div>`;

    // cabina: coda (cucina) in alto, file di sedili, muso col capitano in basso
    function cabinHTML() {
      const rows = [];
      const exitRow = s.plan.bags ? s.plan.bags.exitRow : -1;
      for (let r = 0; r < s.rows; r++) {
        const seat = (c) => `<button type="button" class="fl-seat" data-seat="${r * 4 + c}" style="grid-column:${c < 2 ? c + 2 : c + 3}"></button>`;
        rows.push(`<div class="fl-row${r === exitRow ? ' exit' : ''}" data-row="${r}">
          <span class="fl-win l">${A().win(s.route)}${r === exitRow ? '<b class="fl-exit"></b>' : ''}</span>
          ${seat(0)}${seat(1)}<div class="fl-aisle" data-row="${r}"></div>${seat(2)}${seat(3)}
          <span class="fl-win r">${A().win(s.route)}${r === exitRow ? '<b class="fl-exit"></b>' : ''}</span>
          <div class="fl-bin l" data-bin="${r * 2}"></div><div class="fl-bin r" data-bin="${r * 2 + 1}"></div>
        </div>`);
      }
      return `<div class="fl-cabin" style="--rows:${s.rows}">
        <div class="fl-tail"><span class="fl-curtain"></span><span class="fl-galleyic">${A().phaseIcon('galley')}</span><span class="fl-curtain r"></span></div>
        <div class="fl-rows">${rows.join('')}<div class="fl-crewbox" style="--r:0">${A().hari()}<span class="fl-cartmini">${A().phaseIcon('serve')}</span></div></div>
        <div class="fl-nose"><span class="fl-cockpit">${A().captain(F.isWon(s) ? 'joy' : 'ok')}</span><span class="fl-cpwin l"></span><span class="fl-cpwin r"></span></div>
      </div>`;
    }
    const paxAt = (seat) => s.pax.find((p) => p.seat === seat);
    function moodOf(p) {
      const ph = s.ph, id = F.phase(s);
      if (id === 'belts' && ph.belt[p.id] === 0) return 'wait';
      if (id === 'serve') { const a = ph.act.find((x) => x.pid === p.id); if (a) return a.pat <= 0 ? 'sad' : a.pat / a.max < 0.35 ? 'wait' : 'ok'; }
      if (s.mood[p.id] < 3) return 'sad';
      return p._joy ? 'joy' : 'ok';
    }
    function paintCabin() { $$('.fl-seat').forEach((b) => paintSeat(+b.dataset.seat)); paintBags(); }
    function paintSeat(seat) {
      const b = $(`.fl-seat[data-seat="${seat}"]`);
      if (!b) return;
      const p = paxAt(seat), id = F.phase(s), ph = s.ph;
      let h = '<span class="fl-chair" aria-hidden="true"></span>';
      b.className = 'fl-seat';
      if (!p) { b.innerHTML = h + '<span class="fl-bagslot"></span>'; b.classList.add('empty'); b.setAttribute('aria-label', `${seat + 1}`); b.tabIndex = -1; return; }
      b.tabIndex = 0;
      const mood = moodOf(p);
      h += `<span class="fl-pax">${A().head(p.sp, mood)}</span><span class="fl-body t${p.tone}" aria-hidden="true"></span>`;
      if (id === 'belts' || id === 'bags' || id === 'land' || id === 'galley') {
        const on = id !== 'belts' || ph.belt[p.id] === 1;
        h += `<span class="fl-beltw">${on ? A().beltOn : A().beltOff}</span>`;
        if (!on) {
          b.classList.add('unb');
          const need = ph.need[p.id];
          if (need > 1) h += `<span class="fl-need" aria-hidden="true">${'<i></i>'.repeat(Math.min(4, need))}</span>`;
        }
      }
      if (id === 'serve') {
        const a = ph.act.find((x) => x.pid === p.id);
        if (a) {
          b.classList.add('asks');
          h += `<span class="fl-bub${a.pat <= 0 ? ' sad' : ''}">${a.items.map((k) => A().item(k)).join('')}<span class="fl-pat"><i style="width:${Math.round((a.pat / a.max) * 100)}%"></i></span></span>`;
        }
      }
      if (id === 'trash') {
        const T = s.plan.trash, i = T.items.findIndex((it) => it.seat === seat);
        if (i >= 0 && !ph.got[i]) { b.classList.add('litter'); h += `<span class="fl-lap" data-t="${i}">${A().trash(T.items[i].kind)}</span>`; }
      }
      h += '<span class="fl-bagslot"></span>';
      b.innerHTML = h;
      b.setAttribute('aria-label', `${seat + 1}`);
    }

    /* ---------- imbarco ---------- */
    function renderBoard() {
      const P = s.plan.board, ph = s.ph;
      stage.innerHTML = `<div class="fl-door">
        <div class="fl-dwins">${A().win(s.route)}${A().win(s.route)}</div>
        <span class="fl-dseat"></span><span class="fl-dseat b"></span>
        <div class="fl-jet"><span class="fl-jetlight"></span></div>
        <div class="fl-frame"><span class="fl-doorpanel"></span></div>
        <div class="fl-walkers"></div>
        <span class="fl-greeter">${A().hari()}</span>
        ${P.ask === 'missing' ? `<div class="fl-list"><small>${L('fl_list')}</small><b>${P.booked}</b>${A().captain()}</div>` : ''}
      </div>`;
      panel.innerHTML = `<div class="fl-clicker">
          <button type="button" class="tool fl-minus" aria-label="−1">−</button>
          <output class="fl-count">${ph.clicks}</output>
          <button type="button" class="candy fl-plus" aria-label="+1">+1</button>
        </div>
        <div class="fl-ask" ${ph.asking ? '' : 'hidden'}>
          <p>${P.ask === 'missing' ? L('fl_q_missing') : L('fl_q_count')}</p>
          <div class="fl-opts">${P.opts.map((n) => `<button type="button" class="fl-opt" data-n="${n}" ${ph.wrong.includes(n) ? 'disabled' : ''}>${n}</button>`).join('')}</div>
          <button type="button" class="tool fl-replay">${L('fl_replay')}</button>
        </div>`;
    }
    function walk(st) {
      const box = $('.fl-walkers');
      if (!box) return;
      const dur = s.plan.board.gap * 2.1;
      st.ids.forEach((pid, j) => {
        const p = s.pax[pid];
        const w = document.createElement('span');
        const hid = st.hide && j > 0;
        w.className = `fl-walker ${st.k}${hid ? ' hid' : ''}`;
        w.style.setProperty('--d', `${dur}s`);
        w.style.setProperty('--j', hid ? 0 : j);
        w.style.setProperty('--y', `${hid ? 2 : j * 6}px`);
        w.innerHTML = `<span class="fl-wbody t${p.tone}"></span>${A().head(p.sp, st.k === 'out' ? 'wait' : 'joy')}${st.k === 'out' ? `<span class="fl-think">${A().phaseIcon('bags')}</span>` : ''}`;
        box.appendChild(w);
        w.addEventListener('animationend', () => w.remove());
        later(() => w.remove(), dur * 1000 + 600);
      });
      ctx.sfx.tap();
    }
    function boardAsk() {
      const a = $('.fl-ask');
      if (a) { a.hidden = false; ctx.sfx.blip(); const f = a.querySelector('.fl-opt:not([disabled])'); if (f) f.focus({ preventScroll: true }); }
    }

    /* ---------- bagagli ---------- */
    function paintBags() {
      const P = s.plan.bags, id = F.phase(s);
      $$('.fl-bin').forEach((n) => { n.innerHTML = ''; n.className = n.className.replace(/ open| sel-ok| sel-no/g, ''); });
      $$('.fl-aisle, .fl-bagslot').forEach((n) => { n.innerHTML = ''; });
      if (!P) return;
      const open = id === 'bags';
      const ph = open ? s.ph : null;
      P.bins.forEach((bin, b) => {
        const n = $(`.fl-bin[data-bin="${b}"]`);
        if (!n) return;
        if (open) n.classList.add('open');
        const parts = bin.fill.map((sz, k) => `<span class="fl-binbag fixed" style="--s:${sz}">${A().bag(sz, (b + k) % 3)}</span>`);
        if (open) P.bags.forEach((bg, i) => { if (ph.at[i] === b) parts.push(`<span class="fl-binbag mine${sel === i ? ' sel' : ''}" data-bag="${i}" style="--s:${bg.size}">${A().bag(bg.size, bg.look)}</span>`); });
        n.innerHTML = open ? parts.join('') : '';
        n.setAttribute('aria-label', open ? `${F.free(s, b)}` : '');
      });
      if (!open) return;
      P.bags.forEach((bg, i) => {
        if (ph.at[i] >= 0) return;
        const l = bg.loc;
        let host = null;
        if (l.k === 'aisle') host = $(`.fl-aisle[data-row="${l.row}"]`);
        else host = $(`.fl-seat[data-seat="${l.seat}"] .fl-bagslot`);
        if (!host) return;
        host.insertAdjacentHTML('beforeend', `<span class="fl-loose ${l.k}${l.exit ? ' exit' : ''}${sel === i ? ' sel' : ''}" data-bag="${i}" style="--s:${bg.size}" role="button" tabindex="0" aria-label="${bg.size}">${A().bag(bg.size, bg.look)}</span>`);
      });
      if (sel != null) $$('.fl-bin').forEach((n) => n.classList.add(F.free(s, +n.dataset.bin) >= P.bags[sel].size ? 'sel-ok' : 'sel-no'));
    }
    function renderBagsPanel() {
      const P = s.plan.bags;
      const left = s.ph.at.filter((x) => x >= 0).length;
      panel.innerHTML = `<div class="fl-bagsleft">${A().phaseIcon('bags')}<b>${left}</b><span>/ ${P.bags.length}</span></div><p class="fl-tip">${L('fl_h_bags')}</p>`;
    }
    function dropBag(i, bin) {
      const r = F.move(s, i, bin);
      if (r === 'ok') {
        sel = null;
        ctx.sfx.place();
        paintBags(); renderBagsPanel();
        const n = $(`.fl-bin[data-bin="${bin}"]`); retrigger(n, 'pop');
        ctx.changed();
        if (s.ph.done) phaseDone();
      } else if (r === 'full') {
        ctx.sfx.bad();
        retrigger($(`.fl-bin[data-bin="${bin}"]`), 'shake');
        toast(L('fl_full'), 'bad');
      }
    }

    /* ---------- cinture ---------- */
    function onNag(p, b) {
      const r = F.nag(s, p.id);
      if (r === 'invalid') { retrigger(b, 'hop'); return; }
      if (r === 'nag') { ctx.sfx.mark(); retrigger(b, 'nope'); paintSeat(p.seat); retrigger($(`.fl-seat[data-seat="${p.seat}"]`), 'nope'); }
      if (r === 'buckled') {
        ctx.sfx.place();
        p._joy = true; later(() => { p._joy = false; if (F.phase(s) === 'belts') paintSeat(p.seat); }, 900);
        paintSeat(p.seat);
        retrigger($(`.fl-seat[data-seat="${p.seat}"]`), 'click');
        if (s.ph.done) phaseDone();
      }
      moveHari(Math.floor(p.seat / 4));
      ctx.changed();
    }

    /* ---------- cucina ---------- */
    function renderGalley() {
      const P = s.plan.galley;
      stage.innerHTML = `<div class="fl-galley">
        <div class="fl-note"><span class="fl-note-cap">${A().captain()}</span><ol class="fl-recipe"></ol></div>
        <div class="fl-traybox"><div class="fl-tray"></div></div>
        <div class="fl-pal">${P.palette.map((k) => `<button type="button" class="fl-ingb" data-ing="${k}">${A().ing(k)}</button>`).join('')}</div>
        <div class="fl-ovens">${P.ready.map((_, i) => `<button type="button" class="fl-oven" data-slot="${i}"><span class="fl-ovwin"></span><span class="fl-gauge"><span class="fl-zone"></span><i class="fl-needle"></i></span></button>`).join('')}
          <div class="fl-meals"></div></div>
        <span class="fl-chef">${A().hari()}</span>
      </div>`;
      // zona verde di ogni fornetto
      P.ready.forEach((r, i) => {
        const tot = r + P.win + 0.5;
        const z = $(`.fl-oven[data-slot="${i}"] .fl-zone`);
        z.style.left = `${(r / tot) * 100}%`; z.style.width = `${(P.win / tot) * 100}%`;
      });
      paintGalley();
    }
    function paintGalley() {
      const P = s.plan.galley, ph = s.ph;
      const rec = $('.fl-recipe');
      if (!rec) return;
      rec.innerHTML = P.recipe.map((k, i) => `<li class="${i < ph.tray.length ? 'ok' : i === ph.tray.length && !ph.cap ? 'next' : ''}">${A().ing(k)}</li>`).join('');
      $('.fl-tray').innerHTML = ph.tray.map((k, i) => `<span style="--i:${i}">${A().ing(k)}</span>`).join('') + (ph.cap ? `<span class="fl-served">${A().captain('joy')}</span>` : '');
      $$('.fl-ingb').forEach((b) => { b.disabled = ph.cap; });
      paintOvens();
    }
    function paintOvens() {
      const P = s.plan.galley, ph = s.ph;
      P.ready.forEach((r, i) => {
        const b = $(`.fl-oven[data-slot="${i}"]`);
        if (!b) return;
        const h = ph.heat[i], tot = r + P.win + 0.5;
        b.classList.toggle('on', h >= 0);
        b.classList.toggle('hot', h >= r);
        b.classList.toggle('late', h > r + P.win * 0.7);
        b.classList.toggle('idle', h < 0 && F.mealsLeft(s) <= 0);
        b.querySelector('.fl-ovwin').innerHTML = h >= 0 ? A().item('meal') : '';
        b.querySelector('.fl-needle').style.left = `${Math.max(0, Math.min(100, ((h < 0 ? 0 : h) / tot) * 100))}%`;
      });
      const m = $('.fl-meals');
      if (m) m.innerHTML = `${A().item('meal')}<b>${ph.ready}</b><span>/ ${P.meals}</span>`;
    }

    /* ---------- servizio ---------- */
    function renderCart() {
      const P = s.plan.serve;
      panel.innerHTML = `<div class="fl-cart">${P.pool.map((k) => `<button type="button" class="fl-cartb${sel === k ? ' sel' : ''}" data-item="${k}" aria-label="${L('fl_i_' + k)}" aria-pressed="${sel === k}">${A().item(k)}${k === 'meal' ? `<b class="fl-badge">${s.ph.meals}</b>` : ''}</button>`).join('')}</div>
        <div class="fl-served-n">${A().phaseIcon('serve')}<b>${s.ph.done_n}</b><span>/ ${P.reqs.length}</span></div>`;
    }
    function onGive(p, b) {
      if (!sel) { const c = $('.fl-cart'); retrigger(c, 'shake'); ctx.sfx.tap(); return; }
      const r = F.give(s, p.id, sel);
      if (r === 'invalid') return;
      moveHari(Math.floor(p.seat / 4));
      if (r === 'wrong') { ctx.sfx.bad(); ctx.react('oops'); retrigger(b, 'nope'); }
      else {
        ctx.sfx.cupDone();
        if (r === 'served') { p._joy = true; later(() => { p._joy = false; if (F.phase(s) === 'serve') paintSeat(p.seat); }, 1400); hearts(b); }
        if (sel === 'meal' && s.ph.meals <= 0) sel = null;
        paintSeat(p.seat);
        retrigger($(`.fl-seat[data-seat="${p.seat}"]`), 'pop');
        renderCart();
        if (s.ph.done) phaseDone();
      }
      ctx.changed();
    }
    function hearts(b) {
      if (reduce()) return;
      const h = document.createElement('span');
      h.className = 'fl-hearts';
      h.innerHTML = '<i></i><i></i><i></i>';
      b.appendChild(h);
      later(() => h.remove(), 1100);
    }

    /* ---------- rifiuti ---------- */
    function renderSacks() {
      const T = s.plan.trash;
      if (!sel || !T.sacks.includes(sel)) sel = T.sacks[0];
      panel.innerHTML = `<div class="fl-sacks">${T.sacks.map((k) => `<button type="button" class="fl-sackb${sel === k ? ' sel' : ''}" data-sack="${k}" aria-pressed="${sel === k}">${A().sack(k)}<span>${L(SACK_KEY[k])}</span></button>`).join('')}</div>${timerHTML('fl_land')}`;
      timerEl = $('.fl-timer i');
    }
    function onCollect(seat, b) {
      const T = s.plan.trash, i = T.items.findIndex((it) => it.seat === seat);
      if (i < 0 || s.ph.got[i]) return;
      const r = F.collect(s, i, sel);
      moveHari(Math.floor(seat / 4));
      if (r === 'wrong') { ctx.sfx.bad(); ctx.react('oops'); retrigger(b.querySelector('.fl-lap'), 'nope'); const sb = $(`.fl-sackb[data-sack="${sel}"]`); retrigger(sb, 'shake'); }
      else if (r === 'ok') {
        ctx.sfx.pick();
        const sb = $(`.fl-sackb[data-sack="${sel}"]`); retrigger(sb, 'pop');
        paintSeat(seat);
        if (s.ph.done) phaseDone();
      }
      ctx.changed();
    }

    function moveHari(row) { const c = $('.fl-crewbox'); if (c) c.style.setProperty('--r', row); }

    /* ---------- aggiornamento a ogni fotogramma ---------- */
    function tick() {
      const ph = s.ph, id = F.phase(s);
      if (id === 'belts' || id === 'trash') {
        const lim = id === 'belts' ? s.plan.belts.limit : s.plan.trash.limit;
        if (timerEl) { const k = Math.max(0, 1 - ph.t / lim); timerEl.style.width = `${k * 100}%`; timerEl.parentElement.dataset.level = k < 0.25 ? 'low' : k < 0.5 ? 'mid' : 'ok'; }
      }
      if (id === 'galley') paintOvens();
      if (id === 'serve') ph.act.forEach((a) => {
        const n = $(`.fl-seat[data-seat="${s.pax[a.pid].seat}"] .fl-pat i`);
        if (n) n.style.width = `${Math.round((a.pat / a.max) * 100)}%`;
      });
    }
    function onEvent(e) {
      const id = F.phase(s);
      if (e.type === 'enter') walk(e.step);
      else if (e.type === 'ask') boardAsk();
      else if (e.type === 'unbuckle') { paintSeat(s.pax[e.pid].seat); retrigger($(`.fl-seat[data-seat="${s.pax[e.pid].seat}"]`), 'pop'); ctx.sfx.boing(); }
      else if (e.type === 'bump') {
        retrigger($('.fl-cabin'), 'bump'); ctx.sfx.boing();
        e.pids.forEach((pid) => paintSeat(s.pax[pid].seat));
      } else if (e.type === 'ding') { ctx.sfx.lightOn(e.slot + 2); retrigger($(`.fl-oven[data-slot="${e.slot}"]`), 'pop'); }
      else if (e.type === 'burnt') { ctx.sfx.lightOff(); ctx.react('oops'); toast(L('fl_burnt'), 'bad'); retrigger($(`.fl-oven[data-slot="${e.slot}"]`), 'smoke'); }
      else if (e.type === 'spawn') { paintSeat(s.pax[e.pid].seat); ctx.sfx.blip(); }
      else if (e.type === 'impatient') { paintSeat(s.pax[e.pid].seat); }
      else if (e.type === 'timeout') { (e.pids || []).forEach((pid) => paintSeat(s.pax[pid].seat)); if (id === 'trash') paintCabin(); }
      else if (e.type === 'done') phaseDone();
    }

    /* ---------- atterraggio ---------- */
    function landing() {
      stop();
      const sm = F.summary(s);
      intro.innerHTML = `<div class="fl-card fl-landcard">
        <svg viewBox="0 0 120 90" class="fl-landart" aria-hidden="true"><rect x="0" y="66" width="120" height="24" fill="var(--fl-runway)"/>
          <path d="M8 78h16M36 78h16M64 78h16M92 78h16" stroke="var(--fl-runway-line)" stroke-width="3" stroke-linecap="round"/>
          <g class="fl-landing">${A().plane()}</g></svg>
        <h3>${L('fl_land')}</h3>
        <p class="fl-sum"><span>${L('fl_happy')}</span><b>${sm.happy}/${sm.pax}</b></p>
        <div class="fl-faces">${s.pax.map((p) => `<span>${A().head(p.sp, s.mood[p.id] >= 3 ? 'joy' : 'sad')}</span>`).join('')}</div>
        <button type="button" class="candy fl-go">${L('fl_land_btn')}</button></div>`;
      intro.hidden = false;
      introOpen = true;
      ctx.changed();
      intro.querySelector('.fl-go').onclick = () => { intro.querySelector('.fl-go').disabled = true; ctx.sfx.blip(); ctx.win(); };
    }

    /* ---------- input ---------- */
    el.onclick = (e) => {
      if (introOpen || advancing || !s.ph || s.ph.done) return;
      const id = F.phase(s);
      const t = e.target;
      if (id === 'board') {
        if (t.closest('.fl-plus')) { F.click(s, 1); $('.fl-count').textContent = s.ph.clicks; retrigger($('.fl-count'), 'pop'); ctx.sfx.mark(); ctx.changed(); return; }
        if (t.closest('.fl-minus')) { F.click(s, -1); $('.fl-count').textContent = s.ph.clicks; ctx.sfx.tap(); ctx.changed(); return; }
        const o = t.closest('.fl-opt');
        if (o) {
          const r = F.answer(s, +o.dataset.n);
          if (r === 'ok') {
            o.classList.add('right'); ctx.sfx.cupDone();
            const P = s.plan.board;
            if (P.late.length) { toast(L('fl_late')); P.late.forEach((pid, j) => later(() => walk({ k: 'in', ids: [pid] }), 300 + j * 450)); }
            ctx.changed();
            phaseDone();
          } else if (r === 'wrong') { o.disabled = true; retrigger(o, 'shake'); ctx.sfx.bad(); ctx.react('oops'); ctx.changed(); }
          return;
        }
        if (t.closest('.fl-replay')) {
          if (F.replay(s)) { $('.fl-ask').hidden = true; $('.fl-count').textContent = '0'; ctx.sfx.blip(); ctx.changed(); start(); }
        }
        return;
      }
      if (id === 'bags') {
        if (drag && drag.moved) return;
        const bg = t.closest('[data-bag]');
        const bin = t.closest('.fl-bin');
        if (bg && (!bin || sel == null || +bg.dataset.bag === sel)) {
          const i = +bg.dataset.bag;
          sel = sel === i ? null : i;
          ctx.sfx.pick();
          paintBags();
          return;
        }
        if (bin && sel != null) { dropBag(sel, +bin.dataset.bin); return; }
        if (bin) { retrigger(bin, 'hop'); return; }
        return;
      }
      if (id === 'galley') {
        const ib = t.closest('.fl-ingb');
        if (ib) {
          const r = F.addIng(s, ib.dataset.ing);
          if (r === 'wrong') { ctx.sfx.bad(); retrigger(ib, 'shake'); retrigger($('.fl-recipe li.next'), 'pop'); }
          else if (r !== 'invalid') { ctx.sfx.mark(); if (r === 'captain') { ctx.sfx.cupDone(); ctx.react('happy'); } }
          paintGalley(); ctx.changed();
          if (s.ph.done) phaseDone();
          return;
        }
        const ov = t.closest('.fl-oven');
        if (ov) {
          const r = F.oven(s, +ov.dataset.slot);
          if (r === 'load') ctx.sfx.set();
          else if (r === 'cold') { ctx.sfx.bad(); toast(L('fl_cold')); retrigger(ov, 'shake'); }
          else if (r === 'hot') { ctx.sfx.cupDone(); retrigger(ov, 'pop'); }
          paintOvens(); ctx.changed();
          if (s.ph.done) phaseDone();
        }
        return;
      }
      if (id === 'serve') {
        const cb = t.closest('.fl-cartb');
        if (cb) { const k = cb.dataset.item; sel = sel === k ? null : k; ctx.sfx.pick(); renderCart(); return; }
      }
      if (id === 'trash') {
        const sb = t.closest('.fl-sackb');
        if (sb) { sel = sb.dataset.sack; ctx.sfx.pick(); renderSacks(); tick(); return; }
      }
      const seat = t.closest('.fl-seat');
      if (!seat) return;
      const p = paxAt(+seat.dataset.seat);
      if (!p) return;
      if (id === 'belts') onNag(p, seat);
      else if (id === 'serve') onGive(p, seat);
      else if (id === 'trash') onCollect(p.seat, seat);
    };

    // trascinamento dei bagagli (il tocco semplice seleziona e poi si tocca la cappelliera)
    el.onpointerdown = (e) => {
      if (F.phase(s) !== 'bags' || introOpen || advancing) return;
      const bg = e.target.closest('[data-bag]');
      if (!bg) return;
      drag = { i: +bg.dataset.bag, x: e.clientX, y: e.clientY, moved: false, ghost: null, src: bg };
    };
    el.onpointermove = (e) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
      if (!drag.moved) {
        drag.moved = true;
        const g = document.createElement('span');
        g.className = 'fl-ghost';
        g.style.setProperty('--s', s.plan.bags.bags[drag.i].size);
        g.innerHTML = drag.src.innerHTML;
        wrap.appendChild(g);
        drag.ghost = g;
        sel = drag.i; paintBags();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
        ctx.sfx.pick();
      }
      const w = wrap.getBoundingClientRect();
      drag.ghost.style.transform = `translate(${e.clientX - w.left}px, ${e.clientY - w.top}px)`;
      $$('.fl-bin.hover').forEach((n) => n.classList.remove('hover'));
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const bin = over && over.closest && over.closest('.fl-bin');
      if (bin) bin.classList.add('hover');
      e.preventDefault();
    };
    el.onpointerup = el.onpointercancel = (e) => {
      if (!drag) return;
      const d = drag;
      if (d.ghost) d.ghost.remove();
      $$('.fl-bin.hover').forEach((n) => n.classList.remove('hover'));
      if (d.moved) {
        const over = document.elementFromPoint(e.clientX, e.clientY);
        const bin = over && over.closest && over.closest('.fl-bin');
        if (bin && e.type === 'pointerup') dropBag(d.i, +bin.dataset.bin);
        else { sel = null; paintBags(); }
        setTimeout(() => { drag = null; }, 0);   // il click che segue il trascinamento non seleziona di nuovo
      } else drag = null;
    };
    el.onkeydown = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.fl-loose')) { e.preventDefault(); e.target.click(); }
    };

    /* ---------- avvio ---------- */
    if (saved && F.validate(saved)) {
      s = saved;
      if (s.ph && !s.ph.done && F.TIMED[s.ph.id] && s.ph.go) {
        // si riprende con il cartello "Pronti?": le fasi a tempo ripartono solo al tocco
        s.ph.go = false;
        if (s.ph.id === 'board' && !s.ph.asking) { s.ph.t = 0; s.ph.clicks = 0; }
      }
      build(false);
    } else fresh();

    return {
      fresh,
      restart,
      undo() {
        if (F.phase(s) !== 'bags' || advancing) return;
        if (F.undo(s)) { sel = null; paintBags(); renderBagsPanel(); ctx.sfx.set(); ctx.changed(); }
      },
      pause() { paused = true; stop(); if (wrap) wrap.classList.add('fl-paused'); },
      resume() { paused = false; if (wrap && !introOpen) wrap.classList.remove('fl-paused'); start(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'flight', name: 'Hari Airlines', rules: 'r17', art, create, tutorial,
    rulesEn: 'Hari is the flight attendant! Count the passengers at boarding, stow the bags in the overhead bins, make sure every seatbelt is fastened, cook for the captain and heat the meals, serve what everyone asks for and collect the rubbish before landing.',
    rate: (s) => HH.flight.rate(s),
    parTime: (s) => HH.flight.parTime(s),
    progress: (s) => HH.flight.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
