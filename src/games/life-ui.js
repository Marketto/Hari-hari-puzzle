/* Hari Home — interfaccia (simulazione di vita isometrica, senza livelli né fine).
 * Palco: <canvas> con la casa (life-draw.js). In alto i bisogni (toccali: azione rapida per quel bisogno) e l'orologio con
 * le velocità ×1/×2/×3 (il sonno accelera ×6), in basso Costruisci · Quartiere · Attività · Vita. Tocca Hari (tutti i
 * comandi), un mobile o un guasto (chiave inglese) per il menu radiale; tocca il pavimento per far camminare Hari.
 * I comandi vanno in una coda visibile in basso a sinistra (tocca per annullare); senza comandi Hari fa da sé (libero
 * arbitrio, in life-logic.js). Fuori casa una scena animata del luogo (life-art.js scene) con la barra di avanzamento. In "Costruisci" il tempo si ferma: catalogo, pavimenti, pareti,
 * riparazioni e trasloco. Fuori casa: mappa del quartiere (spesa, dottore, parco, palestra, caffè, mobili, negozio).
 *
 * Contratto con l'app: endless = true (niente livelli/fragoline/cuori), meta(s) per l'header e la card in home,
 * snapshot() = stato puro (versione s.v, migrazioni in HH.life.migrate), ctx.changed() ogni ~2,5 s e dopo le azioni,
 * progress(s) dall'umore (musica), pause()/resume() (tutorial, app nascosta). "Ricomincia" chiede conferma.
 * Le stringhe nuove usano label(k, en): le traduzioni arrivano da HH.i18n quando ci sono.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];
  const L = HH.life, D = HH.lifeData, ART = HH.lifeArt, R = HH.lifeDraw;
  const { ITEMS, HOMES, DAMAGES, ACTS, BIZ, FOODS } = D;
  const ic = ART.icon;

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    lf_mood: 'Mood', lf_health: 'Health', lf_energy: 'Energy', lf_food: 'Tummy', lf_stress: 'Stress', lf_social: 'Friends', lf_fun: 'Fun', lf_hygiene: 'Clean',
    lf_sleep: 'Sleep', lf_eat: 'Snack', lf_cook: 'Cook', lf_shower: 'Shower', lf_relax: 'Relax', lf_watch: 'Watch TV', lf_read: 'Read',
    lf_workout: 'Work out', lf_work: 'Work', lf_call: 'Call', lf_invite: 'Invite', lf_repair: 'Repair', lf_stop: 'Stop', lf_go: 'Go!',
    lf_p_home: 'Home', lf_p_market: 'Market', lf_p_doctor: 'Doctor', lf_p_park: 'Park', lf_p_gym: 'Gym', lf_p_cafe: 'Café', lf_p_shop: 'Furniture', lf_p_office: 'My shop',
    lf_k_bed: 'Bed', lf_k_tub: 'Bathtub', lf_k_fridge: 'Fridge', lf_k_stove: 'Stove', lf_k_oven: 'Oven', lf_k_table: 'Table', lf_k_sofa: 'Sofa', lf_k_tv: 'TV',
    lf_k_books: 'Bookcase', lf_k_aquarium: 'Aquarium', lf_k_desk: 'Desk', lf_k_bench: 'Plant bench', lf_k_sport: 'Exercise', lf_k_plant: 'Plant', lf_k_lamp: 'Lamp',
    lf_k_rug: 'Rug', lf_k_art: 'Picture', lf_k_clock: 'Clock',
    lf_build: 'Build', lf_town: 'Town', lf_biz: 'Business', lf_life: 'Life', lf_rotate: 'Rotate', lf_move: 'Move', lf_sell: 'Sell', lf_place: 'Place',
    lf_floor: 'Floor', lf_wall: 'Walls',
    lf_f0: 'Simple', lf_f1: 'Tasty', lf_f2: 'Gourmet',
    lf_b_bakery: 'Bakery', lf_b_craft: 'Art studio', lf_b_plants: 'Plant shop', lf_lv1: 'Home stall', lf_lv2: 'Shop', lf_lv3: 'Boutique', lf_lv4: 'Chain',
    lf_upgrade: 'Grow', lf_hire: 'Hire', lf_skill: 'Skill', lf_rep: 'Fame',
    lf_goals: 'Goals', lf_retire: 'Retire', lf_newgen: 'New generation', lf_newgenQ: 'A grandchild hedgehog inherits the house, the acorns and the business. Start the new generation?',
    lf_ph0: 'Young', lf_ph1: 'Adult', lf_ph2: 'Mature', lf_ph3: 'Grandpa',
    lf_g_fix1: 'First repair', lf_g_fixall: 'No more damage', lf_g_friend1: 'First friend', lf_g_friends3: 'Three friends', lf_g_biz1: 'First work shift',
    lf_g_biz2: 'A real shop', lf_g_biz4: 'A shop chain', lf_g_cozy: 'Cozy home', lf_g_dream: 'Dream home', lf_g_move: 'Bigger home', lf_g_house: 'A house of my own',
    lf_m_food: 'My tummy is rumbling…', lf_m_energy: 'So sleepy…', lf_m_hygiene: 'I need a wash!', lf_m_fun: 'I’m bored…', lf_m_social: 'I miss my friends…',
    lf_m_health: 'I don’t feel so good…', lf_m_stress: 'So much stress!',
    lf_m_sick: 'Hari isn’t feeling well: a visit to the doctor will help!', lf_m_healed: 'All better!', lf_m_faint: 'Hari felt unwell and the doctor took care of him. Eat and rest well!',
    lf_m_friend: 'New friend!', lf_m_bills: 'Weekly bills', lf_m_gift: 'A food parcel from home!', lf_m_phase: 'Happy birthday! Hari is growing up.', lf_m_retire: 'Hari can retire now and enjoy life!',
    lf_w_money: 'Not enough acorns', lf_w_nofood: 'The fridge is empty: go to the market!', lf_w_blocked: 'Hari can’t get there', lf_w_full: 'No room in the fridge',
    lf_w_nobiz: 'Pick a business first', lf_w_wrongbiz: 'Not for your business', lf_w_office: 'Your shop is in town now', lf_w_small: 'Grow your business first',
    lf_w_nofriend: 'Make friends at the café!', lf_w_cant: 'It doesn’t fit here',
    lf_tip_needs: 'Tap an icon up here and Hari takes care of it: moon = sleep, tummy = eat, drop = wash. Tap Hari for everything else!',
    lf_w_nowash: 'No shower or bath: get one in Build!', lf_w_nostation: 'Buy a work station first', lf_w_queue: 'The to-do list is full',
    lf_queued: 'Added to the list', lf_free: 'Free will',
    lf_restartQ: 'Start a whole new life? This one will be lost.', lf_cancel: 'Cancel', lf_rent: 'Rent / week', lf_board: 'Hari’s home: tap Hari, the furniture or the floor',
    // già tradotte
    pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_pause: 'Pause', restart: 'Restart',
  };
  const T = (k) => label(k, EN[k] || k);
  const nf = (n) => { try { return new Intl.NumberFormat(HH.i18n && HH.i18n.code).format(n || 0); } catch (e) { return String(n || 0); } };
  const acorn = (n) => `<span class="lh-acorn">${ic('acorn')}${nf(n)}</span>`;
  const dur = (m) => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? `${h}h${mm ? String(mm).padStart(2, '0') : ''}` : `${mm}′`; };
  const NEED_IC = { mood: 'mood', health: 'health', energy: 'energy', food: 'food', stress: 'stress', social: 'social', fun: 'fun', hygiene: 'hygiene' };
  const ACT_IC = { town: 'town', sleep: 'sleep', nap: 'sleep', eat: 'eat', cook: 'cook', shower: 'shower', bath: 'bath', relax: 'relax', watch: 'watch', read: 'read', fish: 'fish', workout: 'workout', work: 'work', call: 'call', invite: 'invite', repair: 'repair', stop: 'stop', shop: 'market', doctor: 'doctor', jog: 'park', gym: 'workout', cafe: 'cafe', office: 'office', faint: 'doctor' };
  const ACT_KEY = { town: 'lf_town', bath: 'lf_k_tub', nap: 'lf_sleep', fish: 'lf_relax', shop: 'lf_p_market', doctor: 'lf_p_doctor', jog: 'lf_p_park', gym: 'lf_p_gym', cafe: 'lf_p_cafe', office: 'lf_p_office', faint: 'lf_p_doctor' };
  const actName = (id) => T(ACT_KEY[id] || 'lf_' + id);
  const KIND_KEY = { shower: 'lf_shower', shelf: 'lf_k_books', mat: 'lf_k_sport', bike: 'lf_k_sport', poster: 'lf_k_art', flowers: 'lf_k_plant' };
  const kindName = (k) => T(KIND_KEY[k] || 'lf_k_' + k);
  const TAB_IC = { fix: 'repair', rest: 'sleep', kitchen: 'cook', living: 'relax', work: 'work', deco: 'beauty', style: 'wall', house: 'house' };
  const TAB_KEY = { fix: 'lf_repair', rest: 'lf_k_bed', kitchen: 'lf_k_stove', living: 'lf_k_sofa', work: 'lf_k_desk', deco: 'lf_k_plant', style: 'lf_wall', house: 'lf_g_move' };
  const PLACE_ACT = { doctor: 'doctor', park: 'jog', gym: 'gym', cafe: 'cafe', office: 'office' };
  const ACT_PLACE = { shop: 'market', doctor: 'doctor', faint: 'doctor', jog: 'park', gym: 'gym', cafe: 'cafe', office: 'office' };
  const ACT_SCENE = { shop: 'market', doctor: 'doctor', faint: 'faint', jog: 'park', gym: 'gym', cafe: 'cafe' };
  const reduce = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function create(el, ctx, saved) {
    let s = saved ? L.migrate(saved) : null;
    if (saved && !s) throw new Error('life: salvataggio non leggibile');   // l'app ne tiene una copia e riparte
    if (!s) s = L.create((Math.random() * 4294967296) >>> 0);
    let paused = false, mode = 'home', raf = 0, last = 0, lastDraw = 0, lastSave = 0, lastUI = 0, themeAt = 0, timers = [];
    let queueEl, coachEl = null, mapView = false, shopScene = false, qKey = '';
    let wrap, stage, cv, g, needsEl, clockEl, moneyEl, speedEl, dockEl, toastsEl, sayEl, bubbleEl, layerEl, buildEl, pauseEl;
    let C = null, V = null, dpr = 1, W = 300, H = 330, IMG = {}, imgKey = '';
    // animazioni di Hari e dell'amico in visita
    const hv = { x: s.hx, y: s.hy, path: [], flip: false, tx: s.hx, ty: s.hy, joy: 0, hide: !!s.away, fr: 0 };
    let friendV = null, parts = [], use = null, sel = null, ghost = null, wallGhost = null, preview = null, tab = 'fix', sheet = null, mapAuto = false;
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

    /* ---------- costruzione del DOM ---------- */
    function build() {
      el.innerHTML = `<div class="lh-wrap" dir="ltr">
        <div class="lh-needs" role="group"></div>
        <div class="lh-row"><span class="lh-clock"></span><span class="lh-speed" role="group" aria-label="${T('pa_pause')}"></span><span class="lh-money"></span></div>
        <div class="lh-stage" tabindex="0" role="application" aria-label="${T('lf_board')}">
          <canvas class="lh-cv"></canvas>
          <div class="lh-layer"></div>
          <div class="lh-toasts" aria-live="polite"></div>
          <div class="lh-bubble" hidden></div>
          <div class="lh-queue" role="group" aria-label="${T('lf_life')}"></div>
          <div class="lh-pause" hidden><span class="lh-playb">${ic('play')}</span><b>${T('pa_paused')}</b><small>${T('pa_tap')}</small></div>
        </div>
        <div class="lh-build" hidden></div>
        <div class="lh-dock">
          <button class="lh-dbtn" data-dock="build">${ic('build')}<span>${T('lf_build')}</span></button>
          <button class="lh-dbtn" data-dock="town">${ic('town')}<span>${T('lf_town')}</span></button>
          <button class="lh-dbtn" data-dock="biz">${ic('office')}<span>${T('lf_biz')}</span></button>
          <button class="lh-dbtn" data-dock="life">${ic('life')}<span>${T('lf_life')}</span></button>
        </div>
      </div>`;
      const $ = (q) => el.querySelector(q);
      wrap = $('.lh-wrap'); stage = $('.lh-stage'); cv = $('.lh-cv'); g = cv.getContext('2d');
      needsEl = $('.lh-needs'); clockEl = $('.lh-clock'); moneyEl = $('.lh-money'); speedEl = $('.lh-speed'); dockEl = $('.lh-dock');
      toastsEl = $('.lh-toasts'); queueEl = $('.lh-queue'); bubbleEl = $('.lh-bubble'); layerEl = $('.lh-layer'); buildEl = $('.lh-build'); pauseEl = $('.lh-pause');
      needsEl.innerHTML = L.NEEDS.map((k) => `<button class="lh-need" data-need="${k}" aria-label="${T('lf_' + k)}">${ic(NEED_IC[k])}<i><b></b></i></button>`).join('');
      speedEl.innerHTML = `<button data-speed="0" aria-label="${T('pa_pause')}">${ic('pause')}</button>${[1, 2, 3].map((n) => `<button data-speed="${n}">×${n}</button>`).join('')}`;
      theme(true);
      measure();
      if (G.ResizeObserver) {
        if (el._lhRO) el._lhRO.disconnect();
        el._lhRO = new G.ResizeObserver(() => { if (Math.round(stage.clientWidth) !== Math.round(W) || Math.round(stage.clientHeight) !== Math.round(H)) { measure(); draw(performance.now()); } });
        el._lhRO.observe(stage);
      }
      ui(true);
      if (s.away) openMap(true);
      if (!s.tips.needs) coach();
    }
    // primo avvio: un fumetto sotto gli indicatori spiega che si toccano
    function coach() {
      coachEl = document.createElement('div');
      coachEl.className = 'lh-coach';
      coachEl.innerHTML = `<span>${T('lf_tip_needs')}</span><button class="lh-x" data-coach="x" aria-label="${T('lf_cancel')}">${ic('check')}</button>`;
      stage.appendChild(coachEl);
      needsEl.querySelectorAll('[data-need="energy"], [data-need="food"], [data-need="hygiene"]').forEach((b) => b.classList.add('hint'));
    }
    function dismissCoach() {
      if (!coachEl) return;
      coachEl.remove(); coachEl = null;
      needsEl.querySelectorAll('.hint').forEach((b) => b.classList.remove('hint'));
      s.tips.needs = 1; ctx.changed();
    }
    function theme(force) {
      const nc = R.tokens(wrap);
      if (!force && C && nc.key === C.key) return;
      C = nc;
      bakeAll(true);
    }
    function measure() {
      W = stage.clientWidth || 300; H = stage.clientHeight || 330;
      dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      V = R.view(s, W, H); V.dpr = dpr;
    }

    /* ---------- sprite "cotti" da SVG con i token risolti ---------- */
    function bake(name, svg, size) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(im, 0, 0, size, size); IMG[name] = c; };
      im.onerror = () => { if (G.console) G.console.warn('life: sprite non valido', name); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    function resolve(svg) {
      const cs = G.getComputedStyle(wrap);
      return svg.replace(/var\((--[\w-]+)\)/g, (m0, n) => cs.getPropertyValue(n).trim() || 'transparent');
    }
    function bakeAll(force) {
      const ph = L.phase(s), key = `${ph}|${s.friends.map((f) => f.k).join()}|${C.key}`;
      if (!force && key === imgKey) return;
      imgKey = key;
      const sz = 168;
      ['', 'joy', 'sad', 'sleep'].forEach((p) => { bake(`h_${p}0`, resolve(ART.wrap(ART.hari(ph, p, 0), sz)), sz); });
      bake('h_1', resolve(ART.wrap(ART.hari(ph, '', 1), sz)), sz);
      bake('h_joy1', resolve(ART.wrap(ART.hari(ph, 'joy', 1), sz)), sz);
      for (const f of s.friends) { bake(`f_${f.k}0`, resolve(ART.wrap(ART.friend(f.k, '', 0), sz)), sz); bake(`f_${f.k}1`, resolve(ART.wrap(ART.friend(f.k, 'joy', 1), sz)), sz); }
      bake('badge', resolve(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="60" height="60"><circle cx="15" cy="15" r="12.5" fill="var(--lh-sign)" stroke="var(--lh-ink)" stroke-width="2"/><g transform="translate(5 5) scale(.84)">${ART.IC.repair.replace('<path', '<path fill="none" stroke="var(--lh-sel)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"')}</g></svg>`), 60);
    }

    /* ---------- interfaccia: bisogni, orologio, soldi ---------- */
    function ui(force) {
      const n = s.needs;
      needsEl.querySelectorAll('.lh-need').forEach((b) => {
        const k = b.dataset.need, v = k === 'stress' ? 1 - n[k] : n[k];
        b.querySelector('b').style.width = `${Math.round(v * 100)}%`;
        b.classList.toggle('low', v < 0.2);
        b.classList.toggle('mid', v >= 0.2 && v < 0.45);
        b.setAttribute('aria-label', `${T('lf_' + k)} ${Math.round(n[k] * 100)}%`);
      });
      const ck = L.clock(s), dl = L.daylight(s);
      const sea = ['beauty', 'sun', 'leaf', 'snow'][ck.season];
      clockEl.innerHTML = `${ic(dl > 0.3 ? 'sun' : 'moon')}<span>${String(ck.hour).padStart(2, '0')}:${String(Math.floor(ck.min / 10) * 10).padStart(2, '0')}</span><span class="lh-sea">${ic(sea)}</span>`;
      moneyEl.innerHTML = `${ic('acorn')}<b>${nf(s.money)}</b>`;
      moneyEl.classList.toggle('debt', s.debt > 0);
      speedEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', paused ? b.dataset.speed === '0' : +b.dataset.speed === s.speed));
      dockEl.querySelectorAll('.lh-dbtn').forEach((b) => b.classList.toggle('on', (b.dataset.dock === 'build' && mode === 'build') || (b.dataset.dock === 'town' && mode === 'map') || (sheet && sheet.kind === b.dataset.dock)));
      if (mode === 'map') updateAway();
      queueUI();
    }
    /* ---------- coda delle azioni (in corso + in attesa): tocca per annullare ---------- */
    function queueUI() {
      if (!queueEl) return;
      const a = s.act;
      const key = `${mode}|${a ? `${a.id}:${a.u}:${a.auto ? 1 : 0}` : ''}|${s.queue.map((q) => `${q.id}:${q.u}`).join(',')}`;
      if (key !== qKey) {
        qKey = key;
        queueEl.hidden = mode === 'build' || (!a && !s.queue.length);
        queueEl.classList.toggle('map', mode === 'map');
        const x = `<i>${ic('close')}</i>`;
        // fuori casa l'azione in corso è già nella barra della scena: qui solo quelle in attesa
        if (mode === 'map' && s.away && !s.queue.length) queueEl.hidden = true;
        queueEl.innerHTML = (a && !(mode === 'map' && s.away) ? `<button class="lh-q cur${a.auto ? ' auto' : ''}" data-q="-1" aria-label="${T('lf_stop')}: ${actName(a.id)}"><span>${ic(ACT_IC[a.id] || 'fun')}</span>${a.id === 'faint' ? '' : x}${a.auto ? `<em>${ic('life')}</em>` : ''}</button>` : '')
          + s.queue.map((q, i) => `<button class="lh-q" data-q="${i}" aria-label="${T('lf_stop')}: ${actName(q.id)}">${ic(ACT_IC[q.id] || 'fun')}${x}</button>`).join('');
      }
      const cur = queueEl.querySelector('.cur');
      if (cur && a) cur.style.setProperty('--p', `${Math.round((1 - Math.max(0, a.left) / a.total) * 360)}deg`);
    }

    /* ---------- messaggi ---------- */
    function toast(text, icon = 'sparkle', cls = '') {
      const t = document.createElement('div');
      t.className = `lh-toast ${cls}`;
      t.innerHTML = `${ic(icon)}<span>${text}</span>`;
      toastsEl.appendChild(t);
      while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
      later(() => t.remove(), 3700);
    }
    let sayT = 0;
    function say(text) {
      if (sayEl) sayEl.remove();
      sayEl = document.createElement('div');
      sayEl.className = 'lh-say';
      sayEl.textContent = text;
      stage.appendChild(sayEl);
      placeSay();
      clearTimeout(sayT);
      sayT = later(() => { if (sayEl) { sayEl.remove(); sayEl = null; } }, Math.max(2600, 1400 + text.length * 60));
    }
    function placeSay() {
      if (!sayEl) return;
      const x = hv.sx != null && !hv.hide && mode !== 'map' ? hv.sx : W / 2, y = hv.sy != null && !hv.hide && mode !== 'map' ? hv.sy - 6 : 70;
      const hw = Math.min(W - 16, sayEl.offsetWidth || 140) / 2 + 6;
      sayEl.style.left = `${Math.max(hw, Math.min(W - hw, x))}px`;
      sayEl.style.top = `${Math.max((sayEl.offsetHeight || 40) + 8, y)}px`;
    }
    function floatAt(x, y, html) {
      const f = document.createElement('div');
      f.className = 'lh-float';
      f.innerHTML = html;
      f.style.left = `${x}px`; f.style.top = `${y}px`;
      stage.appendChild(f);
      later(() => f.remove(), 1700);
    }
    const why = (w) => ({ money: 'lf_w_money', nofood: 'lf_w_nofood', blocked: 'lf_w_blocked', full: 'lf_w_full', nofridge: 'lf_w_full', nobiz: 'lf_w_nobiz', wrongbiz: 'lf_w_wrongbiz', office: 'lf_w_office', small: 'lf_w_small', nofriend: 'lf_w_nofriend', retired: 'lf_retire', nowash: 'lf_w_nowash', nostation: 'lf_w_nostation', queue: 'lf_w_queue' }[w] || 'lf_w_cant');
    function refuse(w) {
      ctx.sfx.bad();
      toast(T(why(w)), w === 'money' ? 'acorn' : w === 'nowash' ? 'shower' : w === 'nofood' ? 'fridge' : 'stop');
      if (w === 'nobiz' || w === 'nostation') later(() => openBiz(), 400);
      if (w === 'office' || w === 'nofood') later(() => openMap(false), 500);
      if (w === 'nowash') later(() => enterBuild('rest'), 600);
      if (w === 'nofridge') later(() => enterBuild('kitchen'), 600);
    }

    /* ---------- eventi della simulazione ---------- */
    function onEvents(ev) {
      for (const e of ev) {
        switch (e.type) {
          case 'need': say(T('lf_m_' + e.k)); ctx.react('oops'); ctx.sfx.lightOff(); break;
          case 'earn': { floatAt(hv.sx || W / 2, (hv.sy || H / 2) - 8, `+${nf(e.n)}${ic('acorn')}`); ctx.sfx.cupDone(); hv.joy = 2; break; }
          case 'bills': toast(`${T('lf_m_bills')} −${nf(e.n)}`, 'bills', e.short ? '' : 'gold'); ctx.sfx.tap(); break;
          case 'sick': say(T('lf_m_sick')); ctx.react('oops'); break;
          case 'healed': toast(T('lf_m_healed'), 'health', 'good'); ctx.react('happy'); hv.joy = 2; break;
          case 'faint': toast(T('lf_m_faint'), 'doctor'); ctx.react('oops'); openMap(true); break;
          case 'friend': toast(T('lf_m_friend'), 'social', 'good'); ctx.sfx.milestone(); bakeAll(true); break;
          case 'goal': toast(`${T('lf_g_' + e.id)} +${nf(e.n)}`, 'trophy', 'gold'); ctx.sfx.star(1); ctx.react('happy'); hv.joy = 2.5; heartsAt(); break;
          case 'phase': toast(T('lf_m_phase'), 'cake', 'gold'); bakeAll(true); ctx.sfx.milestone(); heartsAt(); break;
          case 'retire': toast(T('lf_m_retire'), 'life', 'good'); break;
          case 'gift': toast(T('lf_m_gift'), 'gift', 'good'); break;
          case 'fixed': ctx.sfx.place(); sparkle(); break;
          case 'done': if (e.id === 'shower' || e.id === 'bath') ctx.sfx.pour(300); if (e.id === 'cook' || e.id === 'eat') hv.joy = 1.2; break;
          case 'day': ctx.changed(); break;
          case 'auto': if (e.k && !s.away) say(T('lf_m_' + e.k)); break;
          case 'hint': say(T(e.k === 'nofood' ? 'lf_w_nofood' : 'lf_w_nowash')); nudge(e.k === 'nofood' ? 'town' : 'build'); ctx.react('oops'); break;
          case 'qfail': toast(`${actName(e.id)}: ${T(why(e.why))}`, e.why === 'money' ? 'acorn' : 'stop'); break;
          default: break;
        }
      }
      if (ev.length) ui();
    }
    function nudge(k) { const b = dockEl.querySelector(`[data-dock="${k}"]`); if (b) b.classList.add('nudge'); }
    function unnudge(k) { const b = dockEl.querySelector(`[data-dock="${k}"]`); if (b) b.classList.remove('nudge'); }

    /* ---------- particelle (zzz, cuori, note, scintille) sul canvas ---------- */
    function heartsAt() { for (let k = 0; k < 5; k++) parts.push({ t: 'heart', x: (hv.sx || W / 2) + (Math.random() - 0.5) * 30, y: (hv.sy || H / 2) + 10, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 30, t0: performance.now() / 1000 + k * 0.08, life: 1.4 }); }
    function sparkle() { for (let k = 0; k < 8; k++) parts.push({ t: 'spark', x: (hv.sx || W / 2) + (Math.random() - 0.5) * 50, y: (hv.sy || H / 2) + (Math.random() - 0.3) * 30, vx: 0, vy: -20, t0: performance.now() / 1000 + k * 0.05, life: 0.9 }); }
    let partAt = 0;
    function emit(now) {
      if (!s.act || hv.hide || reduce()) return;
      if (now - partAt < 0.7) return;
      partAt = now;
      const id = s.act.id, x = (hv.sx || 0) + 14, y = (hv.sy || 0) + 6;
      if (id === 'sleep' || id === 'nap') parts.push({ t: 'z', x, y, vx: 14, vy: -22, t0: now, life: 1.8 });
      else if (id === 'watch' || id === 'read' || id === 'fish') parts.push({ t: 'note', x, y, vx: 10, vy: -26, t0: now, life: 1.5 });
      else if (id === 'workout') parts.push({ t: 'drop', x: x - 4, y: y + 4, vx: 18, vy: -10, t0: now, life: 0.8 });
      else if (id === 'invite' || id === 'call') parts.push({ t: 'heart', x: x - 14, y, vx: 0, vy: -26, t0: now, life: 1.4 });
      else if (id === 'repair' || id === 'work') parts.push({ t: 'spark', x: x - 20, y: y + 20, vx: 0, vy: -16, t0: now, life: 0.7 });
    }
    function drawParts(now) {
      parts = parts.filter((p) => now - p.t0 < p.life);
      for (const p of parts) {
        const k = (now - p.t0) / p.life;
        if (k < 0) continue;
        const x = p.x + p.vx * (now - p.t0), y = p.y + p.vy * (now - p.t0);
        g.globalAlpha = Math.max(0, 1 - k);
        if (p.t === 'z') { g.font = `${12 + k * 8}px "Mochiy Pop One", sans-serif`; g.fillStyle = C['sky-night']; g.fillText('z', x, y); }
        else if (p.t === 'note') { g.font = '14px sans-serif'; g.fillStyle = C.lilac; g.fillText('♪', x, y); }
        else if (p.t === 'heart') { g.fillStyle = C.flower; g.beginPath(); g.moveTo(x, y + 4); g.bezierCurveTo(x - 7, y - 2, x - 3, y - 7, x, y - 3); g.bezierCurveTo(x + 3, y - 7, x + 7, y - 2, x, y + 4); g.fill(); }
        else if (p.t === 'drop') { g.fillStyle = C['water-2']; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
        else { g.fillStyle = C.gold; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 1.5, y - 1.5); g.lineTo(x + 5, y); g.lineTo(x + 1.5, y + 1.5); g.lineTo(x, y + 5); g.lineTo(x - 1.5, y + 1.5); g.lineTo(x - 5, y); g.lineTo(x - 1.5, y - 1.5); g.fill(); }
      }
      g.globalAlpha = 1;
    }

    /* ---------- Hari che cammina (solo grafica: la logica sposta Hari subito) ---------- */
    function target() {
      if (s.away) { const d = L.door(s); return { x: d.x, y: d.y, away: true }; }
      return { x: s.hx, y: s.hy };
    }
    function animHari(dt, now) {
      const tg = target();
      if (tg.x !== hv.tx || tg.y !== hv.ty || (!!tg.away) !== !!hv.goingAway) {
        const from = { x: Math.round(hv.x), y: Math.round(hv.y) };
        if (hv.hide && !tg.away) { const d = L.door(s); hv.x = d.x; hv.y = d.y; hv.hide = false; from.x = d.x; from.y = d.y; }
        hv.path = L.path(s, { x: Math.max(0, Math.min(V.c - 1, from.x)), y: Math.max(0, Math.min(V.r - 1, from.y)) }, tg).slice(1);
        if (!hv.path.length && (hv.x !== tg.x || hv.y !== tg.y)) hv.path = [{ x: tg.x, y: tg.y }];
        hv.tx = tg.x; hv.ty = tg.y; hv.goingAway = !!tg.away;
      }
      hv.moving = false;
      if (hv.path.length) {
        const nx = hv.path[0], sp = 3.4 * Math.min(2, s.speed || 1) * dt;
        const dx = nx.x - hv.x, dy = nx.y - hv.y, dd = Math.hypot(dx, dy);
        if (dd <= sp) { hv.x = nx.x; hv.y = nx.y; hv.path.shift(); }
        else { hv.x += (dx / dd) * sp; hv.y += (dy / dd) * sp; }
        // verso lo schermo: x cresce a destra, y a sinistra
        if (Math.abs(dx - dy) > 0.01) hv.flip = dx - dy < 0;
        hv.moving = true;
      } else if (hv.goingAway) hv.hide = true;
      hv.joy = Math.max(0, hv.joy - dt);
      hv.fr = hv.moving && !reduce() ? Math.floor(now * 6) % 2 : 0;
    }
    function hariSprite(now) {
      const a = s.act, n = s.needs;
      let pose = '';
      if (a && (a.id === 'sleep' || a.id === 'nap') && !hv.moving) pose = 'sleep';
      else if (hv.joy > 0 || (a && (a.id === 'invite' || a.id === 'watch'))) pose = 'joy';
      else if (s.sick || n.mood < 0.28 || n.energy < 0.12) pose = 'sad';
      const key = pose === '' ? `h_${hv.fr ? '1' : '0'}` : pose === 'joy' ? `h_joy${hv.fr}` : `h_${pose}0`;
      return IMG[key] || IMG[`h_${pose}0`] || IMG.h_0;
    }

    /* ---------- disegno ---------- */
    function draw(nowMs) {
      if (!V || !C) return;
      const now = nowMs / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const a = s.act;
      const bedU = a && a.id === 'sleep' && !hv.moving && !s.away ? a.u : null;
      const hari = hv.hide ? null : { x: hv.x, y: hv.y, img: hariSprite(now), flip: hv.flip, onBed: bedU, hop: a && a.id === 'workout' && !reduce() ? Math.abs(Math.sin(now * 6)) * 0.12 : 0, size: L.phase(s) === 3 ? 2.15 : 2.25 };
      let friend = null;
      if (a && a.id === 'invite' && s.friends[a.f] && !hv.moving) {
        if (!friendV) friendV = spotNear(s.hx, s.hy);
        if (friendV) friend = { x: friendV.x, y: friendV.y, img: IMG[`f_${s.friends[a.f].k}${Math.floor(now * 1.5) % 2}`], flip: friendV.x < s.hx };
      } else friendV = null;
      const tvOn = a && a.id === 'watch' && L.findItem(s, a.u);
      use = a && a.u != null && !hv.moving ? { u: a.u } : null;
      const st = preview || s;
      R.scene(g, st, V, C, {
        now, hari, friend, use, tv: tvOn ? tvOn : null, sel: sel && sel.u, build: mode === 'build',
        ghost, wallGhost, badges: !s.away, badgeImg: IMG.badge,
      });
      if (hari) { hv.sx = hari.sx; hv.sy = hari.sy; } else { hv.sx = null; hv.sy = null; }
      drawParts(now);
      bubble();
      placeSay();
    }
    function spotNear(x, y) {
      const { c, r } = L.dims(s), gr = L.grid(s);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < c && ny < r && !gr[ny * c + nx]) return { x: nx, y: ny };
      }
      return null;
    }
    // fumetto dell'attività sopra la testa con l'anello del tempo che manca
    // senza attività e con un bisogno critico: fumetto "pensiero" con l'icona del bisogno (toccalo = azione rapida)
    let bubKey = '';
    function critical() {
      const n = s.needs;
      let k = null, lo = 0.18;
      for (const x of ['energy', 'food', 'hygiene', 'health', 'social', 'fun']) if (n[x] < lo) { lo = n[x]; k = x; }
      return k || (n.stress > 0.82 ? 'stress' : null);
    }
    function bubble() {
      const a = s.act, want = !a && !s.queue.length ? critical() : null;
      if ((!a && !want) || hv.hide || hv.sx == null || mode === 'map') { if (!bubbleEl.hidden) bubbleEl.hidden = true; return; }
      const key = a ? a.id : 'want:' + want;
      if (bubKey !== key) {
        bubbleEl.innerHTML = `<span class="lh-bub">${ic(a ? ACT_IC[a.id] || 'fun' : NEED_IC[want])}</span>`;
        bubbleEl.className = `lh-bubble${a ? '' : ' want'}`;
        if (want) { bubbleEl.dataset.need = want; bubbleEl.setAttribute('role', 'button'); bubbleEl.setAttribute('aria-label', T('lf_' + want)); } else { delete bubbleEl.dataset.need; bubbleEl.removeAttribute('role'); }
        bubKey = key;
      }
      bubbleEl.hidden = false;
      const tr = `translate(${Math.round(hv.sx - 17)}px, ${Math.round(hv.sy - 40)}px)`;
      bubbleEl.style.transform = tr;
      bubbleEl.style.setProperty('--tr', tr);
      bubbleEl.style.setProperty('--p', a ? `${Math.round((1 - Math.max(0, a.left) / a.total) * 360)}deg` : '360deg');
    }

    /* ---------- ciclo ---------- */
    function loop(nowMs) {
      if (!el.isConnected) { stop(); detach(); return; }
      const dt = last ? Math.min(0.25, (nowMs - last) / 1000) : 0;
      last = nowMs;
      if (nowMs - themeAt > 1000) { themeAt = nowMs; theme(false); }
      const running = !paused && mode !== 'build' && !(sheet && sheet.block);
      if (running && dt > 0) {
        const ph = L.phase(s);
        onEvents(L.tick(s, L.rate(s) * dt));
        if (L.phase(s) !== ph) bakeAll(true);
        if (s.away && mode !== 'map' && !hv.path.length && hv.hide) openMap(true);
        if (!s.away && mode === 'map' && mapAuto) closeMap();
      }
      animHari(dt, nowMs / 1000);
      emit(nowMs / 1000);
      // ~30 fotogrammi al secondo bastano a una vita tranquilla (batteria del telefono)
      if (nowMs - lastDraw >= 30 || down) { lastDraw = nowMs; draw(nowMs); }
      if (nowMs - lastUI > 400) { lastUI = nowMs; ui(); }
      if (running && nowMs - lastSave > 2500) { lastSave = nowMs; ctx.changed(); }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function pause() {
      if (paused) return;
      paused = true;
      pauseEl.hidden = false;
      ui(); ctx.changed();
    }
    function resume() {
      if (!paused) return;
      paused = false;
      pauseEl.hidden = true;
      ctx.sfx.set();
      ui();
    }

    /* ---------- menu radiale ---------- */
    function closeLayer() { layerEl.innerHTML = ''; layerEl.className = 'lh-layer'; sel = mode === 'build' ? sel : null; }
    function radial(px, py, opts, onPick) {
      if (!opts.length) return;
      ctx.sfx.pick();
      const n = opts.length, R0 = n > 6 ? 88 : n > 3 ? 72 : 64;
      const span = n > 4 ? Math.PI * 2 : Math.PI * 0.95, a0 = n > 4 ? -Math.PI / 2 : -Math.PI / 2 - span / 2;
      const cx = Math.max(R0 + 36, Math.min(W - R0 - 36, px)), cy = Math.max(n > 4 ? R0 + 30 : R0 + 34, Math.min(H - (n > 4 ? R0 + 40 : 40), py));
      layerEl.className = 'lh-layer lh-radial';
      layerEl.innerHTML = opts.map((o, k) => {
        const an = n === 1 ? -Math.PI / 2 : n > 4 ? a0 + (k / n) * Math.PI * 2 : a0 + (k / (n - 1)) * span;
        const x = cx + Math.cos(an) * R0, y = cy + Math.sin(an) * R0;
        return `<button class="lh-rbtn${o.ok ? '' : ' no'}${o.id === 'stop' ? ' stop' : ''}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--k:${k}" data-k="${k}">
          <span>${ic(o.icon || ACT_IC[o.id] || 'fun')}${o.cost ? `<em>${ic('acorn')}${nf(o.cost)}</em>` : o.earn ? `<em>+${nf(o.earn)}</em>` : ''}</span><small>${o.name || actName(o.id)}</small></button>`;
      }).join('');
      layerEl.onclick = (e) => {
        const b = e.target.closest('.lh-rbtn');
        const o = b ? opts[+b.dataset.k] : null;
        closeLayer();
        if (o) onPick(o);
      };
    }
    // comando del giocatore: subito se Hari è libero (o fa da sé), altrimenti in coda
    function doStart(id, opt) {
      const r = L.order(s, id, opt);
      if (!r.ok) { refuse(r.why); return false; }
      afterOrder(r, id);
      return r;
    }
    function afterOrder(r, id, k) {
      ctx.sfx.tap();
      friendV = null;
      if (paused) resume();
      if (r.queued) toast(`${actName(id)} · ${T('lf_queued')}`, ACT_IC[id] || 'fun');
      else if (k) toast(`${T('lf_' + k)} → ${actName(id)}`, ACT_IC[id] || NEED_IC[k], 'good');
      ui(); ctx.changed();
    }
    // tocco su un indicatore: la cosa giusta per quel bisogno, con l'oggetto migliore di casa
    function quickNeed(k) {
      dismissCoach();
      const r = L.quick(s, k);
      if (!r.ok) {
        if (r.why === 'nofood') say(T('lf_w_nofood'));
        refuse(r.why);
        return;
      }
      afterOrder(r, r.id, k);
      if (r.now && !s.away) hv.joy = 0.6;
    }
    function lowestFriend() { let k = 0; s.friends.forEach((f, i) => { if (f.f < s.friends[k].f) k = i; }); return k; }
    function pickOption(o, base) {
      if (!o.ok) { refuse(o.why); return; }
      if (o.id === 'stop') { onEvents(L.cancel(s, -1).ev); ctx.sfx.set(); ui(); ctx.changed(); return; }
      if (o.id === 'town') { openMap(false); return; }
      const opt = Object.assign({}, base);
      if (o.u != null) opt.u = o.u;
      if (o.id === 'call' || o.id === 'invite') opt.f = lowestFriend();
      doStart(o.id, opt);
    }

    /* ---------- tocchi sul palco ---------- */
    let down = null;
    function pos(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function onDown(e) {
      if (e.target.closest('.lh-rbtn, .lh-sheet, .lh-place-bar, .lh-map, .lh-toast, .lh-queue, .lh-bubble.want, .lh-coach')) return;
      if (e.target.closest('.lh-pause')) { e.preventDefault(); resume(); return; }
      if (layerEl.classList.contains('lh-radial') && !e.target.closest('.lh-rbtn')) { closeLayer(); return; }
      if (!e.target.closest('.lh-stage')) return;
      const p = pos(e);
      down = { x: p.x, y: p.y, id: e.pointerId, moved: false };
      if (mode === 'build' && (ghost || wallGhost)) { moveGhost(p); try { stage.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ } }
    }
    function onMove(e) {
      if (!down || e.pointerId !== down.id) return;
      const p = pos(e);
      if (Math.hypot(p.x - down.x, p.y - down.y) > 8) down.moved = true;
      if (mode === 'build' && (ghost || wallGhost)) moveGhost(p);
    }
    function onUp(e) {
      if (!down || e.pointerId !== down.id) return;
      const p = pos(e), moved = down.moved;
      down = null;
      if (mode === 'build') { if (!ghost && !wallGhost && !moved) buildTap(p); return; }
      if (moved || mode === 'map') return;
      const h = R.hit(s, V, p.x, p.y, { hari: hv.hide ? null : { sx: hv.sx, sy: hv.sy }, badges: true });
      if (!h) return;
      if (h.type === 'hari') { ctx.sfx.giggle(); hv.joy = 1; radial(p.x, p.y - 30, L.options(s, {}), (o) => pickOption(o, {})); return; }
      if (h.type === 'item') {
        const it = L.findItem(s, h.u), opts = L.options(s, { u: h.u });
        sel = { u: h.u };
        if (!opts.length) { ctx.sfx.tap(); sel = null; return; }
        radial(p.x, p.y, opts, (o) => pickOption(o, { u: it.u }));
        return;
      }
      if (h.type === 'dmg') { radial(p.x, p.y, L.options(s, { dmg: h.id }), (o) => pickOption(o, { dmg: h.id })); return; }
      if (h.type === 'tile') { if (L.walk(s, h.x, h.y)) { ctx.sfx.tap(); ctx.changed(); } }
    }

    /* ---------- costruisci ---------- */
    function enterBuild(t) {
      closeSheet(); closeMap(); closeLayer();
      mode = 'build'; tab = t || tab; sel = null; ghost = null; wallGhost = null; preview = null;
      buildEl.hidden = false; dockEl.hidden = true;
      renderBuild();
      ctx.sfx.open();
      ui();
    }
    function exitBuild() {
      mode = 'home'; sel = null; ghost = null; wallGhost = null; preview = null;
      buildEl.hidden = true; dockEl.hidden = false; buildEl.innerHTML = '';
      closeLayer();
      ui(); ctx.changed();
    }
    function renderBuild() {
      const tabs = D.CATS.map((c) => `<button class="lh-tab${c === tab ? ' on' : ''}" data-tab="${c}" aria-label="${T(TAB_KEY[c])}">${ic(TAB_IC[c])}</button>`).join('');
      let body = '';
      const stars = (n) => `<span class="lh-stars">${Array.from({ length: n }, () => ic('fun')).join('')}</span>`;
      if (tab === 'fix') {
        const list = s.home.dmg;
        body = list.length ? `<div class="lh-grid">${list.map((id) => { const c = s.home.paid[id] ? 0 : DAMAGES[id].p; return `<button class="lh-card${s.money < c ? ' cant' : ''}" data-dmg="${id}" aria-label="${T('lf_repair')}"><canvas data-crop="${id}"></canvas><span class="lh-price">${ic('acorn')}${nf(c)} · ${dur(DAMAGES[id].m)}</span></button>`; }).join('')}</div>`
          : `<p class="lh-hint">${ic('check')} ${T('lf_g_fixall')}</p>`;
      } else if (tab === 'style') {
        const sw = (kind, id, T0) => `<button class="lh-card${s.home[kind] === id ? ' cur' : ''}" data-style="${kind}:${id}" aria-label="${T(kind === 'floor' ? 'lf_floor' : 'lf_wall')}"><canvas data-sw="${kind}:${id}"></canvas><span class="lh-b">${ic('beauty')}${T0[id].b}</span><span class="lh-price">${s.home[kind] === id ? ic('check') : `${ic('acorn')}${nf(L.stylePrice(s, kind, id))}`}</span></button>`;
        body = `<div class="lh-grid">${Object.keys(D.FLOORS).filter((k) => D.FLOORS[k].p || s.home.floor === k).map((k) => sw('floor', k, D.FLOORS)).join('')}${Object.keys(D.WALLS).filter((k) => D.WALLS[k].p || s.home.wall === k).map((k) => sw('wall', k, D.WALLS)).join('')}</div>`;
      } else if (tab === 'house') {
        body = `<div class="lh-list">${HOMES.map((h, i) => `<div class="lh-li${i <= s.home.tier ? ' done' : ''}">${ic(i === 3 ? 'house' : 'home')}<span class="lh-grow">${h.c} × ${h.r}<small>${T('lf_rent')}: ${h.rent ? acorn(h.rent) : '—'}</small></span>${i === s.home.tier + 1 ? `<button class="lh-btn" data-expand="1"${s.money < h.p ? ' disabled' : ''}>${ic('acorn')}${nf(h.p)}</button>` : i <= s.home.tier ? ic('check') : ''}</div>`).join('')}</div>`;
      } else {
        const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === tab && ITEMS[id].p);
        body = `<div class="lh-grid">${ids.map((id) => { const I = ITEMS[id]; return `<button class="lh-card${s.money < I.p ? ' cant' : ''}" data-buy="${id}"><canvas data-thumb="${id}"></canvas>${stars(I.t)}<span class="lh-b">${ic('beauty')}${I.b}</span><span class="lh-name">${kindName(I.k)}</span><span class="lh-price">${ic('acorn')}${nf(I.p)}</span></button>`; }).join('')}</div>`;
      }
      buildEl.innerHTML = `<div class="lh-sh-head"><h3>${ic('build')} ${T(TAB_KEY[tab])}</h3><span class="lh-money">${ic('acorn')}<b>${nf(s.money)}</b></span><button class="lh-x" data-close="build" aria-label="${T('lf_cancel')}">${ic('close')}</button></div>
        <div class="lh-tabs">${tabs}</div><div class="lh-sh-body">${body}</div>`;
      paintCanvases(buildEl);
    }
    function paintCanvases(root) {
      root.querySelectorAll('canvas[data-thumb]').forEach((c) => {
        const w = c.clientWidth || 90, h = c.clientHeight || 56, d = Math.min(2, G.devicePixelRatio || 1);
        c.width = Math.round(w * d); c.height = Math.round(h * d);
        c.getContext('2d').drawImage(R.thumb(c.dataset.thumb, C, w, h, d), 0, 0);
      });
      root.querySelectorAll('canvas[data-sw]').forEach((c) => {
        const [kind, id] = c.dataset.sw.split(':');
        const w = c.clientWidth || 90, h = c.clientHeight || 56, d = Math.min(2, G.devicePixelRatio || 1);
        c.width = Math.round(w * d); c.height = Math.round(h * d);
        // anteprima: un angolino di stanza col pavimento o la carta da parati
        const fake = { t: 600, home: { tier: 0, floor: kind === 'floor' ? id : 'wood', wall: kind === 'wall' ? id : 'paint', ver: -1, items: [], walls: [], dmg: [], paid: {} } };
        const VV = R.view(fake, w * 2.2, h * 2.2); VV.dpr = d;
        const tmp = document.createElement('canvas'); tmp.width = Math.round(w * 2.2 * d); tmp.height = Math.round(h * 2.2 * d);
        const tg = tmp.getContext('2d'); tg.setTransform(d, 0, 0, d, 0, 0);
        R.scene(tg, fake, VV, C, { now: 0 });
        const ctx2 = c.getContext('2d');
        ctx2.drawImage(tmp, tmp.width * 0.2, tmp.height * 0.1, tmp.width * 0.6, tmp.height * 0.6, 0, 0, c.width, c.height);
      });
      root.querySelectorAll('canvas[data-crop]').forEach((c) => {
        const [x, y] = R.dmgPoint(s, V, c.dataset.crop);
        const w = c.clientWidth || 90, h = c.clientHeight || 56, k = 1.5;
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        c.getContext('2d').drawImage(cv, (x - (w / k) / 2) * dpr, (y - (h / k) / 2) * dpr, (w / k) * dpr, (h / k) * dpr, 0, 0, c.width, c.height);
      });
    }
    function freeSpot(id, r) {
      const { c, r: rows } = L.dims(s), cx = c / 2, cy = rows / 2;
      let best = null, bd = 1e9;
      for (let y = 0; y < rows; y++) for (let x = 0; x < c; x++) for (const rr of [r, 1 - r]) {
        if (L.canPlace(s, id, x, y, rr, ghost && ghost.u > 0 ? ghost.u : undefined)) continue;
        const d = Math.abs(x - cx) + Math.abs(y - cy) + (rr !== r ? 0.5 : 0);
        if (d < bd) { bd = d; best = { x, y, r: rr }; }
      }
      return best;
    }
    function startGhost(id, u) {
      const I = ITEMS[id];
      if (I.wall) {
        const it = u ? s.home.walls.find((w) => w.u === u) : null;
        let spot = it ? { side: it.side, i: it.i } : null;
        if (!spot) for (const side of ['L', 'R']) for (let i = 0; i < 10 && !spot; i++) if (!L.canWall(s, id, side, i, u)) spot = { side, i };
        wallGhost = { u: u || -1, id, side: spot ? spot.side : 'L', i: spot ? spot.i : 0 };
        wallGhost.ok = !L.canWall(s, id, wallGhost.side, wallGhost.i, u);
      } else {
        const it = u ? L.findItem(s, u) : null;
        const spot = it ? { x: it.x, y: it.y, r: it.r } : freeSpot(id, 0) || { x: 0, y: 0, r: 0 };
        ghost = { u: u || -1, id, x: spot.x, y: spot.y, r: spot.r };
        ghost.ok = !L.canPlace(s, id, ghost.x, ghost.y, ghost.r, u);
      }
      placeBar();
    }
    function moveGhost(p) {
      if (ghost) {
        const I = ITEMS[ghost.id], f = ghost.r ? { w: I.d, d: I.w } : { w: I.w, d: I.d };
        const t = R.tileAt(V, p.x, p.y + V.hh * 0.6);
        const { c, r } = L.dims(s);
        const x = Math.max(0, Math.min(c - f.w, Math.round(t.fx - f.w / 2))), y = Math.max(0, Math.min(r - f.d, Math.round(t.fy - f.d / 2)));
        if (x !== ghost.x || y !== ghost.y) { ghost.x = x; ghost.y = y; ghost.ok = !L.canPlace(s, ghost.id, x, y, ghost.r, ghost.u > 0 ? ghost.u : undefined); placeBar(); }
      } else if (wallGhost) {
        const w = R.wallAt(V, p.x, p.y, ITEMS[wallGhost.id].w);
        const len = w.side === 'L' ? V.r : V.c;
        const i = Math.max(0, Math.min(len - ITEMS[wallGhost.id].w, w.i));
        if (i !== wallGhost.i || w.side !== wallGhost.side) { wallGhost.side = w.side; wallGhost.i = i; wallGhost.ok = !L.canWall(s, wallGhost.id, w.side, i, wallGhost.u > 0 ? wallGhost.u : undefined); placeBar(); }
      }
    }
    function placeBar() {
      const g0 = ghost || wallGhost;
      if (!g0) { const old = stage.querySelector('.lh-place-bar'); if (old) old.remove(); return; }
      let bar = stage.querySelector('.lh-place-bar');
      if (!bar) { bar = document.createElement('div'); bar.className = 'lh-place-bar'; stage.appendChild(bar); }
      const price = g0.u > 0 ? 0 : ITEMS[g0.id].p;
      bar.innerHTML = `<button class="lh-pbtn round" data-pb="cancel" aria-label="${T('lf_cancel')}">${ic('close')}</button>
        ${ghost ? `<button class="lh-pbtn round" data-pb="rot" aria-label="${T('lf_rotate')}">${ic('rotate')}</button>` : ''}
        <button class="lh-pbtn go" data-pb="ok"${g0.ok && s.money >= price ? '' : ' disabled'}>${ic('check')}<span>${T('lf_place')}</span>${price ? `${ic('acorn')}${nf(price)}` : ''}</button>`;
    }
    function selBar(u, wall) {
      let bar = stage.querySelector('.lh-place-bar');
      if (!bar) { bar = document.createElement('div'); bar.className = 'lh-place-bar'; stage.appendChild(bar); }
      const it = wall ? s.home.walls.find((w) => w.u === u) : L.findItem(s, u);
      const back = L.refund(it.id);
      bar.innerHTML = `<button class="lh-pbtn round" data-pb="desel" aria-label="${T('lf_cancel')}">${ic('close')}</button>
        <button class="lh-pbtn" data-pb="move">${ic('move')}<span>${T('lf_move')}</span></button>
        ${wall ? '' : `<button class="lh-pbtn round" data-pb="rotsel" aria-label="${T('lf_rotate')}">${ic('rotate')}</button>`}
        <button class="lh-pbtn del" data-pb="sell">${ic('sell')}<span>${T('lf_sell')}</span>${back ? `+${nf(back)}` : ''}</button>`;
    }
    function buildTap(p) {
      const h = R.hit(s, V, p.x, p.y, { badges: true });
      if (h && h.type === 'dmg') { repairNow(h.id); return; }
      if (h && (h.type === 'item' || h.type === 'wall' || (h.type === 'tile' && h.rug))) {
        const u = h.type === 'tile' ? h.rug : h.u;
        sel = { u, wall: h.type === 'wall' };
        ctx.sfx.pick();
        selBar(u, sel.wall);
        return;
      }
      sel = null;
      placeBar();
    }
    function repairNow(id) {
      const o = L.options(s, { dmg: id })[0];
      if (!o) return;
      if (!o.ok) { refuse(o.why); return; }
      exitBuild();
      doStart('repair', { dmg: id });
    }
    function onBuildClick(e) {
      const t = e.target;
      const tb = t.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; ghost = wallGhost = preview = null; sel = null; placeBar(); renderBuild(); ctx.sfx.tap(); return; }
      if (t.closest('[data-close="build"]')) { exitBuild(); return; }
      const bd = t.closest('[data-buy]');
      if (bd) { const id = bd.dataset.buy; if (s.money < ITEMS[id].p) { refuse('money'); return; } sel = null; ghost = wallGhost = null; startGhost(id); ctx.sfx.pick(); return; }
      const dm = t.closest('[data-dmg]');
      if (dm) { repairNow(dm.dataset.dmg); return; }
      const sw = t.closest('[data-style]');
      if (sw) {
        const [kind, id] = sw.dataset.style.split(':');
        if (s.home[kind] === id) return;
        preview = Object.assign({}, s, { home: Object.assign({}, s.home, { [kind]: id, ver: -Date.now() }) });
        stylePending = { kind, id };
        let bar = stage.querySelector('.lh-place-bar');
        if (!bar) { bar = document.createElement('div'); bar.className = 'lh-place-bar'; stage.appendChild(bar); }
        const price = L.stylePrice(s, kind, id);
        bar.innerHTML = `<button class="lh-pbtn round" data-pb="nostyle" aria-label="${T('lf_cancel')}">${ic('close')}</button><button class="lh-pbtn go" data-pb="style"${s.money >= price ? '' : ' disabled'}>${ic('check')}${ic('acorn')}${nf(price)}</button>`;
        ctx.sfx.pick();
        return;
      }
      if (t.closest('[data-expand]')) {
        const r = L.expand(s);
        if (!r.ok) { refuse(r.why); return; }
        measure(); onEvents(r.ev || []); ctx.sfx.cupDone(); renderBuild(); ui(); ctx.changed();
      }
    }
    let stylePending = null;
    function onBarClick(e) {
      const b = e.target.closest('[data-pb]');
      if (!b || b.disabled) return;
      const k = b.dataset.pb;
      if (k === 'cancel' || k === 'desel' || k === 'nostyle') { ghost = wallGhost = preview = null; sel = null; stylePending = null; placeBar(); ctx.sfx.set(); return; }
      if (k === 'rot' && ghost) { ghost.r = 1 - ghost.r; const I = ITEMS[ghost.id], f = ghost.r ? { w: I.d, d: I.w } : { w: I.w, d: I.d }; const { c, r } = L.dims(s); ghost.x = Math.min(ghost.x, c - f.w); ghost.y = Math.min(ghost.y, r - f.d); ghost.ok = !L.canPlace(s, ghost.id, ghost.x, ghost.y, ghost.r, ghost.u > 0 ? ghost.u : undefined); placeBar(); ctx.sfx.tap(); return; }
      if (k === 'ok') {
        let r;
        if (ghost) r = ghost.u > 0 ? L.move(s, ghost.u, ghost.x, ghost.y, ghost.r) : L.buy(s, ghost.id, ghost.x, ghost.y, ghost.r);
        else r = wallGhost.u > 0 ? L.moveWall(s, wallGhost.u, wallGhost.side, wallGhost.i) : L.buyWall(s, wallGhost.id, wallGhost.side, wallGhost.i);
        if (!r.ok) { refuse(r.why === 'money' ? 'money' : 'cant'); return; }
        ctx.sfx.place(); sparkleAtGhost();
        onEvents(r.ev || []);
        ghost = wallGhost = null; sel = null; placeBar(); renderBuild(); ui(); ctx.changed();
        return;
      }
      if (k === 'style' && stylePending) {
        const r = L.setStyle(s, stylePending.kind, stylePending.id);
        preview = null; stylePending = null; placeBar();
        if (!r.ok) { refuse(r.why); return; }
        ctx.sfx.place(); onEvents(r.ev || []); renderBuild(); ui(); ctx.changed();
        return;
      }
      if (!sel) return;
      if (k === 'move') { const it = sel.wall ? s.home.walls.find((w) => w.u === sel.u) : L.findItem(s, sel.u); const u = sel.u; sel = null; startGhost(it.id, u); ctx.sfx.pick(); return; }
      if (k === 'rotsel') { const it = L.findItem(s, sel.u); const r = L.move(s, it.u, it.x, it.y, 1 - it.r); if (!r.ok) refuse('cant'); else { ctx.sfx.tap(); ctx.changed(); } return; }
      if (k === 'sell') { const r = L.sell(s, sel.u); sel = null; placeBar(); if (r.ok) { ctx.sfx.cupDone(); if (r.n) floatAt(W / 2, H * 0.4, `+${nf(r.n)}${ic('acorn')}`); renderBuild(); ui(); ctx.changed(); } }
    }
    function sparkleAtGhost() { const g0 = ghost || wallGhost; if (!g0) return; const [x, y] = ghost ? R.P(V, ghost.x + 0.5, ghost.y + 0.5, 0.6) : [W / 2, H / 3]; for (let k = 0; k < 8; k++) parts.push({ t: 'spark', x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 30, vx: 0, vy: -24, t0: performance.now() / 1000 + k * 0.04, life: 0.8 }); }

    /* ---------- pannelli ---------- */
    function closeSheet() { const o = stage.querySelector('.lh-sheet'); if (o) o.remove(); sheet = null; ui(); }
    function openSheet(kind, title, body, opt = {}) {
      closeSheet(); closeLayer();
      const d = document.createElement('div');
      d.className = `lh-sheet${opt.full ? ' full' : ''}`;
      d.innerHTML = `<div class="lh-sh-head"><h3>${title}</h3><button class="lh-x" data-sh="close" aria-label="${T('lf_cancel')}">${ic('close')}</button></div><div class="lh-sh-body">${body}</div>${opt.foot || ''}`;
      stage.appendChild(d);
      sheet = { kind, el: d, block: !!opt.block };
      ctx.sfx.open();
      paintCanvases(d);
      ui();
      return d;
    }
    // quartiere
    function openMap(auto) {
      if (mode === 'build') exitBuild();
      closeSheet(); closeLayer();
      unnudge('town');
      if (mode !== 'map') { mapView = !s.away; shopScene = false; }
      if (auto) mapView = false;
      mode = 'map'; mapAuto = !!auto;
      let m = stage.querySelector('.lh-map');
      if (!m) { m = document.createElement('div'); m.className = 'lh-map'; stage.insertBefore(m, layerEl); }
      renderMap();
      ui();
    }
    // scena animata del luogo dove si trova Hari (o il negozio di mobili)
    function sceneKind() {
      if (shopScene) return 'shop';
      const a = s.act;
      if (!s.away || !a || mapView) return null;
      if (a.id === 'office') return s.biz ? s.biz.type : 'bakery';
      return ACT_SCENE[a.id] || null;
    }
    function sceneKey() { const a = s.act; return `${sceneKind()}|${a ? `${a.f}|${a.nf}` : ''}|${s.friends.length}|${L.phase(s)}`; }
    function renderMap() {
      const m = stage.querySelector('.lh-map');
      if (!m) return;
      const sk = sceneKind();
      if (sk) {
        const a = s.act, fr = a && a.f >= 0 && s.friends[a.f] ? s.friends[a.f].k : null, nf = a && a.nf != null && s.friends[a.nf] ? s.friends[a.nf].k : null;
        const place = sk === 'shop' ? 'shop' : ACT_PLACE[a.id];
        m.innerHTML = `<div class="lh-scene" data-scene="${sk}">${ART.scene(sk, { ph: L.phase(s), night: 1 - L.daylight(s), season: L.clock(s).season, friend: fr, nf, label: T('lf_m_friend') })}
          <div class="lh-scene-top">${ic(ART.PLACE_IC[place])}<span>${T('lf_p_' + place)}</span></div></div><div class="lh-away" hidden></div>`;
        mapKey = mapStateKey();
        updateAway();
        return;
      }
      const names = {};
      D.PLACES.forEach((p) => { names[p] = T('lf_p_' + p); });
      const here = s.away || null;
      m.innerHTML = ART.map({ season: L.clock(s).season, biz: s.biz ? s.biz.level : 0, night: 1 - L.daylight(s), names, here, hari: here ? ART.hari(L.phase(s), s.act && s.act.id === 'faint' ? 'sleep' : 'joy', 0) : null }) + '<div class="lh-away" hidden></div>';
      mapKey = mapStateKey();
      updateAway();
    }
    let mapKey = '';
    const mapStateKey = () => `${s.away}|${L.clock(s).season}|${L.daylight(s) > 0.5}|${s.biz ? s.biz.level : 0}|${mapView}|${sceneKey()}`;
    function updateAway() {
      const m = stage.querySelector('.lh-map');
      if (!m) return;
      if (mapStateKey() !== mapKey) { renderMap(); return; }
      const box = m.querySelector('.lh-away');
      if (shopScene) {
        box.hidden = false;
        if (!box.firstChild) box.innerHTML = `${ic('relax')}<span class="lh-grow">${T('lf_p_shop')}</span><button class="lh-btn" data-catalog="1">${ic('build')}${T('lf_build')}</button><button class="lh-x" data-mapview="1" aria-label="${T('lf_town')}">${ic('town')}</button>`;
      } else if (s.away && s.act) {
        const p = 1 - Math.max(0, s.act.left) / s.act.total;
        box.hidden = false;
        if (!box.firstChild) box.innerHTML = `${ic(ACT_IC[s.act.id] || 'go')}<span class="lh-grow">${actName(s.act.id)}</span><span class="lh-prog"><b></b></span>${s.act.id === 'faint' ? '' : `<button class="lh-x" data-mapview="1" aria-label="${T('lf_town')}">${ic(mapView ? 'play' : 'town')}</button><button class="lh-x" data-stop="1" aria-label="${T('lf_stop')}">${ic('home')}</button>`}`;
        box.querySelector('.lh-prog b').style.width = `${Math.round(p * 100)}%`;
        // nella scena le cose compaiono man mano (frutta nel carrello, cerotto, pane in vetrina…)
        const st = Math.floor(p * 5);
        m.querySelectorAll('.lh-scene [data-k]').forEach((x) => x.classList.toggle('on', +x.dataset.k <= st));
      } else { box.hidden = true; box.innerHTML = ''; }
    }
    function closeMap() { const m = stage.querySelector('.lh-map'); if (m) m.remove(); if (mode === 'map') mode = 'home'; mapAuto = false; mapView = false; shopScene = false; ui(); }
    function onMapClick(e) {
      if (e.target.closest('[data-stop]')) { onEvents(L.cancel(s, -1).ev); ctx.sfx.set(); closeMap(); ctx.changed(); return; }
      if (e.target.closest('[data-mapview]')) { ctx.sfx.tap(); if (shopScene) shopScene = false; else mapView = !mapView; renderMap(); ui(); return; }
      if (e.target.closest('[data-catalog]')) { shopScene = false; enterBuild('rest'); return; }
      const pl = e.target.closest('[data-place]');
      if (!pl) return;
      const id = pl.dataset.place;
      ctx.sfx.tap();
      if (id === 'home') { if (s.away && s.act && s.act.id !== 'faint') L.stop(s); closeMap(); return; }
      if (id === 'shop') { shopScene = true; renderMap(); ui(); return; }
      if (id === 'market') { openMarket(); return; }
      const act = PLACE_ACT[id], o = L.options(s, { place: id })[0];
      const A0 = ACTS[act];
      const eff = Object.keys(A0.r).filter((k) => A0.r[k] && k !== 'health' && k !== 'hygiene' && k !== 'energy' && k !== 'food').map((k) => ic(NEED_IC[k])).join('');
      openSheet('place', `${ic(ART.PLACE_IC[id])} ${T('lf_p_' + id)}`, `<div class="lh-li">${ic(ACT_IC[act])}<span class="lh-grow">${actName(act)}<small>${ic('sun')} ${dur(A0.dur)} ${eff}${o && o.earn ? ` · +${nf(o.earn)}` : ''}</small></span>
        <button class="lh-btn" data-go="${act}"${o && o.ok ? '' : ' data-no="' + (o ? o.why : 'none') + '"'}>${o && o.cost ? `${ic('acorn')}${nf(o.cost)} ` : ''}${T('lf_go')}</button></div>
        ${id === 'doctor' && s.sick ? `<p class="lh-hint">${ic('sick')} ${T('lf_m_sick')}</p>` : ''}`);
    }
    function openMarket() {
      const cap = L.fridgeCap(s), free = cap - L.stock(s);
      const qty = [0, 0, 0];
      const d = openSheet('market', `${ic('market')} ${T('lf_p_market')}`, `<div class="lh-list">${FOODS.map((f, q) => `<div class="lh-li">${ic(['food', 'eat', 'cake'][q])}<span class="lh-grow">${T('lf_f' + q)}<small>${ic('acorn')}${nf(f.p)} · ${ic('food')}+${Math.round(f.n * 100)}${f.j ? ` ${ic('fun')}+${Math.round(f.j * 100)}` : ''}</small></span>
        <span class="lh-step"><button data-q="${q}" data-d="-1" aria-label="−">−</button><b data-n="${q}">0</b><button data-q="${q}" data-d="1" aria-label="+">+</button></span></div>`).join('')}</div>`,
      { foot: `<div class="lh-foot"><span class="lh-tot">${ic('fridge')} <b class="lh-free">${L.stock(s)}/${cap}</b> · ${ic('acorn')}<b class="lh-cost">0</b></span><button class="lh-btn" data-buyfood="1" disabled>${ic('go')}${T('lf_go')}</button></div>` });
      const upd = () => {
        const n = qty[0] + qty[1] + qty[2], cost = qty.reduce((a, k, q) => a + k * FOODS[q].p, 0);
        qty.forEach((k, q) => { d.querySelector(`[data-n="${q}"]`).textContent = k; });
        d.querySelector('.lh-free').textContent = `${L.stock(s) + n}/${cap}`;
        d.querySelector('.lh-cost').textContent = nf(cost);
        d.querySelector('[data-buyfood]').disabled = !n || cost > s.money;
      };
      d.onclick = (e) => {
        const b = e.target.closest('[data-q]');
        if (b) { const q = +b.dataset.q, dd = +b.dataset.d, n = qty[0] + qty[1] + qty[2]; if (dd > 0 && n >= free) { refuse('full'); return; } qty[q] = Math.max(0, qty[q] + dd); ctx.sfx.tap(); upd(); return; }
        if (e.target.closest('[data-buyfood]')) { const r = doStart('shop', { buy: qty.slice() }); if (r) { closeSheet(); unnudge('town'); if (r.now) openMap(true); } return; }
        if (e.target.closest('[data-sh="close"]')) closeSheet();
      };
      if (!cap) toast(T('lf_w_full'), 'fridge');
    }
    // attività (business)
    function openBiz() {
      const b = s.biz;
      if (!b) {
        openSheet('biz', `${ic('office')} ${T('lf_biz')}`, `<div class="lh-bizcards">${Object.keys(BIZ.types).map((ty) => { const st = { bakery: 'oven1', craft: 'desk1', plants: 'bench1' }[ty]; return `<button class="lh-card" data-pick="${ty}"><canvas data-thumb="${st}"></canvas><span class="lh-name">${T('lf_b_' + ty)}</span><span class="lh-price">${kindName(ITEMS[st].k)} ${ic('acorn')}${nf(ITEMS[st].p)}</span></button>`; }).join('')}</div>`);
        return;
      }
      const st = { bakery: 'oven1', craft: 'desk1', plants: 'bench1' }[b.type], hasSt = L.best(s, BIZ.types[b.type]);
      const next = b.level < 4 ? BIZ.up[b.level + 1] : 0, maxH = BIZ.help[b.level];
      const meter = (v) => `<span class="lh-meter"><b style="width:${Math.round(v * 100)}%"></b></span>`;
      openSheet('biz', `${ic('office')} ${T('lf_b_' + b.type)}`, `<div class="lh-list">
        <div class="lh-li">${ic('trophy')}<span class="lh-grow">${T('lf_lv' + b.level)} ${'★'.repeat(b.level)}<small>+${nf(L.earnPreview(s))} ${ic('acorn')} / ${dur(ACTS.work.dur)}${BIZ.rent[b.level] ? ` · ${T('lf_rent')}: ${nf(BIZ.rent[b.level])}` : ''}</small></span>
          <button class="lh-btn" data-work="1"${s.retired ? ' disabled' : ''}>${ic('work')}${T('lf_work')}</button></div>
        <div class="lh-li">${ic('fun')}<span class="lh-grow">${T('lf_skill')}${meter(b.skill)}</span></div>
        <div class="lh-li">${ic('health')}<span class="lh-grow">${T('lf_rep')}${meter(b.rep)}</span></div>
        ${b.level === 1 && !hasSt ? `<div class="lh-li"><canvas data-thumb="${st}" style="width:64px;height:48px"></canvas><span class="lh-grow">${kindName(ITEMS[st].k)}</span><button class="lh-btn" data-station="${st}">${ic('acorn')}${nf(ITEMS[st].p)}</button></div>` : ''}
        ${maxH ? `<div class="lh-li">${ic('helper')}<span class="lh-grow">${T('lf_hire')} ${b.helpers}/${maxH}<small>−${nf(BIZ.salary)} / 7 ${ic('sun')}</small></span><button class="lh-btn ghost" data-hire="1"${b.helpers >= maxH ? ' disabled' : ''}>${ic('helper')}+1</button></div>` : ''}
        ${next ? `<div class="lh-li">${ic('up')}<span class="lh-grow">${T('lf_upgrade')}: ${T('lf_lv' + (b.level + 1))}<small>+${nf(BIZ.base[b.level + 1] - BIZ.base[b.level])} ${ic('acorn')}</small></span><button class="lh-btn" data-up="1"${s.money < next ? ' disabled' : ''}>${ic('acorn')}${nf(next)}</button></div>` : ''}
      </div>`);
    }
    // vita: ritratto, età, traguardi, pensione, nuova generazione
    function openLife() {
      const ph = L.phase(s), ag = Math.floor(L.age(s)), ck = L.clock(s);
      const goals = Object.keys(D.GOALS).map((k) => `<div class="lh-li${s.goals[k] ? ' done' : ''}">${ic(s.goals[k] ? 'check' : 'trophy')}<span class="lh-grow">${T('lf_g_' + k)}</span><span class="lh-price">+${nf(D.GOALS[k])}${ic('acorn')}</span></div>`).join('');
      const friends = s.friends.map((f) => `<svg viewBox="0 0 100 100" width="40" height="40" aria-hidden="true">${ART.friend(f.k, f.f > 0.6 ? 'joy' : '', 0)}</svg>`).join('');
      openSheet('life', `${ic('life')} ${T('lf_life')}`, `<div class="lh-life-top"><svg class="lh-portrait" viewBox="0 0 100 100" aria-hidden="true">${ART.hari(ph, s.needs.mood > 0.6 ? 'joy' : s.needs.mood < 0.3 ? 'sad' : '', 0)}</svg>
          <div><b>${ic('cake')} ${ag}</b><p>${T('lf_ph' + ph)}${s.gen > 1 ? ` · ${ic('life')}×${s.gen}` : ''}</p><p>${ic('sun')} ${ck.day} · ${ic(['beauty', 'sun', 'leaf', 'snow'][ck.season])}</p>
          <p>${ic('beauty')} <span class="lh-meter" style="display:inline-block;width:96px;margin:0 0 0 2px;vertical-align:middle"><b style="width:${Math.round(L.beauty(s) * 100)}%"></b></span></p></div></div>
        ${friends ? `<div class="lh-li">${ic('social')}<span class="lh-grow">${friends}</span></div>` : ''}
        <div class="lh-li">${ic('life')}<span class="lh-grow">${T('lf_free')}</span><button class="lh-btn${s.free ? '' : ' ghost'}" data-free="1" aria-pressed="${s.free ? 'true' : 'false'}">${ic(s.free ? 'check' : 'close')}</button></div>
        <h3 class="lh-h">${ic('trophy')} ${T('lf_goals')}</h3><div class="lh-list">${goals}</div>
        <div class="lh-foot">${ag >= D.RETIRE_AGE && !s.retired ? `<button class="lh-btn" data-retire="1">${ic('life')}${T('lf_retire')}</button>` : ''}${ag >= D.GEN_AGE ? `<button class="lh-btn ghost" data-newgen="1">${ic('cake')}${T('lf_newgen')}</button>` : ''}</div>`, { full: true });
    }
    function confirm(text, yes, onYes) {
      const d = openSheet('confirm', `${ic('rotate')}`, `<div class="lh-confirm"><p>${text}</p><div class="lh-foot" style="justify-content:center"><button class="lh-btn ghost" data-sh="close">${T('lf_cancel')}</button><button class="lh-btn" data-yes="1">${yes}</button></div></div>`, { block: true });
      d.querySelector('[data-yes]').onclick = () => { closeSheet(); onYes(); };
    }
    function onSheetClick(e) {
      const sh = e.target.closest('.lh-sheet');
      if (!sh) return;
      if (e.target.closest('[data-sh="close"]')) { closeSheet(); ctx.sfx.set(); return; }
      const go = e.target.closest('[data-go]');
      if (go) { if (go.dataset.no) { refuse(go.dataset.no); return; } const r = doStart(go.dataset.go); if (r) { closeSheet(); if (r.now) { mapView = false; mapAuto = true; } renderMap(); } return; }
      const pk = e.target.closest('[data-pick]');
      if (pk) { L.chooseBiz(s, pk.dataset.pick); ctx.sfx.milestone(); openBiz(); ctx.changed(); return; }
      if (e.target.closest('[data-work]')) { const b = s.biz; const ok = b.level >= 2 ? doStart('office') : doStart('work'); if (ok) { closeSheet(); if (b.level >= 2 && ok.now) openMap(true); } return; }
      if (e.target.closest('[data-free]')) { s.free = !s.free; s.calm = 0; ctx.sfx.tap(); openLife(); ctx.changed(); return; }
      const stn = e.target.closest('[data-station]');
      if (stn) { const id = stn.dataset.station; if (s.money < ITEMS[id].p) { refuse('money'); return; } closeSheet(); enterBuild('work'); startGhost(id); return; }
      if (e.target.closest('[data-hire]')) { if (L.hire(s).ok) { ctx.sfx.place(); openBiz(); ctx.changed(); } return; }
      if (e.target.closest('[data-up]')) { const r = L.upgradeBiz(s); if (!r.ok) { refuse(r.why); return; } ctx.sfx.cupDone(); onEvents(r.ev || []); heartsAt(); openBiz(); ui(); ctx.changed(); return; }
      if (e.target.closest('[data-retire]')) { if (L.retire(s).ok) { ctx.sfx.milestone(); heartsAt(); openLife(); ctx.changed(); } return; }
      if (e.target.closest('[data-newgen]')) { confirm(T('lf_newgenQ'), T('lf_newgen'), () => { if (L.newGeneration(s).ok) { bakeAll(true); hv.joy = 3; heartsAt(); ctx.sfx.win(); ui(); ctx.changed(); } }); }
    }

    /* ---------- controlli ---------- */
    el.onpointerdown = onDown; el.onpointermove = onMove; el.onpointerup = onUp;
    el.onpointercancel = () => { down = null; };
    el.oncontextmenu = (e) => { if (e.target.closest('.lh-stage')) e.preventDefault(); };
    el.onclick = (e) => {
      const t = e.target;
      if (t.closest('.lh-place-bar')) { onBarClick(e); return; }
      if (t.closest('.lh-build')) { onBuildClick(e); return; }
      if (t.closest('.lh-map') && !t.closest('.lh-sheet')) { onMapClick(e); return; }
      if (t.closest('.lh-sheet')) { onSheetClick(e); return; }
      const sp = t.closest('[data-speed]');
      if (sp) { const n = +sp.dataset.speed; if (!n) { paused ? resume() : pause(); } else { s.speed = n; if (paused) resume(); ctx.sfx.tap(); } ui(); return; }
      if (t.closest('[data-coach]')) { dismissCoach(); ctx.sfx.tap(); return; }
      const qb = t.closest('[data-q]');
      if (qb && t.closest('.lh-queue')) {
        const i = +qb.dataset.q, away = !!s.away;
        const r = L.cancel(s, i);
        if (r.ok) { ctx.sfx.set(); onEvents(r.ev); if (i < 0 && away && !s.away && mode === 'map') closeMap(); ui(); ctx.changed(); }
        return;
      }
      const nd = t.closest('[data-need]');
      if (nd && mode !== 'build') { quickNeed(nd.dataset.need); return; }
      const dk = t.closest('[data-dock]');
      if (dk) {
        const k = dk.dataset.dock;
        ctx.sfx.tap();
        unnudge(k);
        if (k === 'build') { if (mode === 'build') exitBuild(); else enterBuild(); }
        else if (k === 'town') { if (mode === 'map' && !s.away && !shopScene) closeMap(); else if (mode === 'map') { shopScene = false; mapView = s.away ? !mapView : true; renderMap(); ui(); } else openMap(false); }
        else if (sheet && sheet.kind === k) closeSheet();
        else if (k === 'biz') openBiz();
        else if (k === 'life') openLife();
      }
    };
    function onKey(e) {
      if (!el.isConnected) { detach(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        if (e.target && e.target.closest && e.target.closest('button') && !e.target.closest('.lh-stage')) return;
        e.preventDefault(); paused ? resume() : pause();
      } else if (e.key === 'Escape') {
        if (layerEl.innerHTML) closeLayer();
        else if (sheet) closeSheet();
        else if (ghost || wallGhost || preview) { ghost = wallGhost = preview = null; placeBar(); }
        else if (mode === 'build') exitBuild();
        else if (mode === 'map' && !s.away) closeMap();
      }
    }
    function onVis() { if (!el.isConnected) { detach(); return; } if (document.hidden) pause(); }
    function detach() {
      G.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      if (el._lhRO) { el._lhRO.disconnect(); el._lhRO = null; }
      timers.forEach(clearTimeout); timers = [];
      stop();
    }
    if (el._lhDetach) el._lhDetach();
    el._lhDetach = detach;
    el._lhState = () => s;   // per i test end-to-end (Playwright): lo stato vivo della partita
    G.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop();
      s = state;
      Object.assign(hv, { x: s.hx, y: s.hy, tx: s.hx, ty: s.hy, path: [], hide: !!s.away, joy: 0 });
      coachEl = null; qKey = ''; mapView = false; shopScene = false;
      paused = false; mode = 'home'; sheet = null; ghost = wallGhost = preview = null; sel = null; parts = [];
      build();
      if (startPaused) { paused = true; pauseEl.hidden = false; ui(); }
      start();
    }
    begin(s, !!saved);

    return {
      fresh() { confirm(T('lf_restartQ'), T('restart'), () => { begin(L.create((Math.random() * 4294967296) >>> 0)); ctx.changed({ reset: true }); }); },
      restart() { confirm(T('lf_restartQ'), T('restart'), () => { begin(L.create((Math.random() * 4294967296) >>> 0)); ctx.changed({ reset: true }); }); },
      undo() { paused ? resume() : pause(); },
      pause() { pause(); },
      resume() { resume(); },
      snapshot: () => s,
    };
  }

  /* ---------- tutorial ---------- */
  const TUT = [
    { key: 'tu_life_1', en: 'Hari has just moved into a shabby little studio. Tap the icons at the top to tell him what to do: moon = sleep, tummy = eat, drop = wash, star = fun, friends = call. Tap Hari or the furniture for more!',
      art: `<svg viewBox="0 0 120 90" aria-hidden="true">${ART.room({ ox: 60, oy: 30, hw: 12.5, old: true, hariCls: 'lh-tut-hari' })}${HH.tutHand ? HH.tutHand(74, 58) : ''}</svg>` },
    { key: 'tu_life_2', en: 'Hari also looks after himself when a need runs low; a blinking red icon means he really needs it. Your orders wait in the list at the bottom: tap one to cancel it.',
      art: `<svg viewBox="0 0 120 90" aria-hidden="true">${['food', 'energy', 'hygiene', 'fun', 'social', 'stress'].map((k, i) => `<g transform="translate(${8 + (i % 3) * 36} ${10 + Math.floor(i / 3) * 38})"><rect width="32" height="32" rx="9" fill="var(--card-solid)" stroke="var(--line-2)" stroke-width="2"/><g transform="translate(6 3) scale(.84)" style="color:var(--ink)">${ART.icon(NEED_IC[k]).replace('class="lh-ic"', 'width="24" height="24"')}</g><rect x="5" y="25" width="22" height="4" rx="2" fill="var(--lh-bar)"/><rect class="${i === 5 ? 'lh-tut-pop' : ''}" x="5" y="25" width="${[18, 9, 14, 20, 6, 15][i]}" height="4" rx="2" fill="${[18, 9, 14, 20, 6, 15][i] < 8 ? 'var(--lh-low)' : 'var(--lh-good)'}"/></g>`).join('')}${HH.tutHand ? HH.tutHand(62, 30) : ''}</svg>` },
    { key: 'tu_life_3', en: 'Build: fix the damage (tap the wrenches), buy furniture, floors and wallpaper. A beautiful home puts Hari in a good mood.',
      art: `<svg viewBox="0 0 120 90" aria-hidden="true">${ART.room({ ox: 60, oy: 30, hw: 12.5, hari: false })}<g class="lh-tut-pop"><circle cx="34" cy="26" r="8" fill="var(--lh-sign)" stroke="var(--lh-ink)" stroke-width="1.4"/><g transform="translate(28 20) scale(.5)" style="color:var(--lh-sel)">${ART.icon('repair').replace('class="lh-ic"', 'width="24" height="24"')}</g></g>${HH.tutHand ? HH.tutHand(40, 36) : ''}</svg>` },
    { key: 'tu_life_4', en: 'In town: market, doctor, park, café and your business. Work to earn acorns and grow from a home stall to a chain. Life goes on, year after year!',
      art: ART.map({ season: 0, names: {}, here: 'office', hari: ART.hari(3, 'joy', 0) }).replace('class="lh-map-svg"', 'class="lh-map-svg" style="width:100%;height:100%"') },
  ];
  HH.games.push({
    id: 'life', name: 'Hari Home', rules: 'r12', endless: true,
    rulesEn: 'Hari’s life sim: start in a shabby studio with a few acorns. Fix it up and furnish it, start a business, go shopping, see the doctor, play sports and invite friends. Keep Hari happy, healthy and rested as he grows up, all the way to grandpa!',
    art: () => ART.card(), create, tutorial: TUT,
    rate: () => 3, parTime: () => 0,
    progress: (s) => L.progress(s),
    // header di gioco e card in home: età, giorno, ghiande (al posto di livello, tempo, mosse, fragoline)
    meta: (s) => [
      { i: 'cake', v: String(Math.floor(L.age(s))) },
      { i: 'sun', v: String(L.clock(s).day) },
      { i: 'acorn', v: (s.debt > 0 ? '−' : '') + String(s.debt > 0 ? s.debt : s.money) },
    ],
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
