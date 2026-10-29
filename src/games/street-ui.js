/* Hari Snack Street — interfaccia.
 * Strada a scorrimento laterale su un solo <canvas> 2D (fondale a strati con parallasse, personaggi SVG "cotti" in
 * bitmap con i colori dei token --st-*, ordinati per profondità). Comandi: tastiera (P1 frecce + Z porgi, X lancia,
 * C salta, V speciale; P2 WASD + F, G, H, R), touch (levetta a sinistra, pulsanti a destra; in due sullo stesso
 * schermo una metà a testa). Modalità: da solo · con Kiki guidata dalla CPU · in due qui · in due in rete (HH.mp, se il
 * modulo è caricato: l'host simula, l'ospite riceve le viste compatte, le interpola e predice il proprio personaggio).
 * Se la rete cade, Kiki diventa CPU e si continua.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    st_board: 'Street: move with the stick or the arrows, feed the hungry animals',
    st_go: 'GO', st_wave: 'Hungry friends!', st_boss: 'Here comes a big eater!', st_tired: 'Nap time!',
    st_full: 'Full!', st_yum: 'Yum!', st_basket: 'A whole basket!', st_sp_ready: 'Special ready!', st_cake: 'Giant cake!', st_rain: 'Fruit rain!',
    st_steal: 'Snatched!', st_hungry: 'Still hungry!', st_gulp: 'Gulp!',
    st_mode_title: 'Who is playing?', st_mode_solo: 'Hari alone', st_mode_cpu: 'With Kiki (CPU)', st_mode_local: '2 players here',
    st_mode_lan: 'Play together (Wi-Fi)', st_players: 'Players', st_keys: 'P1: arrows + Z X C V · P2: WASD + F G H R',
    st_feed: 'Feed', st_toss: 'Toss', st_jumpb: 'Jump', st_special: 'Special',
    st_lan_wait: 'Waiting for your friend…', st_lan_left: 'Your friend left: Kiki carries on with the CPU', st_lan_guest: 'You are Kiki!',
    st_n_bunny: 'Hungry bunnies!', st_n_raccoon: 'Raccoons snatch tossed snacks: feed them up close!', st_n_boar: 'Little boars charge in a line: step aside!',
    st_n_magpie: 'Magpies catch snacks in the air: toss to them!', st_n_fox: 'Foxes come in pairs, from both sides!', st_n_bear: 'Bear cubs are slow but very hungry!',
    st_n_crate: 'Feed a fruit crate to open it!', st_n_cart: 'Push the cart: it feeds everyone it meets!', st_n_grab: 'Three bites in a row: walk into it and give a whole basket!',
    st_n_steal: 'The raccoon took it! Feed it up close.', st_n_boss: 'Big eaters roll melons: jump over them!',
    pa_ready: 'Ready?', pa_go: 'Go!', pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_pause: 'Pause',
  };
  const L = (k) => label(k, EN[k] || k);

  const A = HH.streetArt;
  const TOKENS = ['ink', 'text', 'text-line', 'hi', 'sky-1', 'sky-2', 'sun', 'star', 'night', 'far', 'far-2', 'mid', 'mid-2', 'awning', 'awning-2',
    'window', 'lamp', 'wall', 'ground-1', 'ground-2', 'curb', 'front', 'tree', 'tree-2', 'water', 'water-2', 'shadow', 'heart', 'gold', 'spark',
    'puff', 'zzz', 'tummy', 'tummy-bg', 'danger', 'wave', 'mark', 'p1', 'p2', 'melon', 'melon-2', 'straw', 'leaf', 'cookie', 'sakura', 'kiki', 'quill'];
  const reduce = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const coarse = () => !!(G.matchMedia && G.matchMedia('(pointer: coarse)').matches);
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const sget = (k, d) => (HH.store ? HH.store.get(k, d) : d);
  const sset = (k, v) => { if (HH.store) HH.store.set(k, v); };
  // tastiera: [giocatore, comando] — comandi: mx/my = direzioni, 0 porgi, 1 lancia, 2 salta, 3 speciale
  const KEYS = {
    ArrowLeft: [0, 'l'], ArrowRight: [0, 'r'], ArrowUp: [0, 'u'], ArrowDown: [0, 'd'], KeyZ: [0, 0], KeyX: [0, 1], KeyC: [0, 2], KeyV: [0, 3],
    KeyA: [1, 'l'], KeyD: [1, 'r'], KeyW: [1, 'u'], KeyS: [1, 'd'], KeyF: [1, 0], KeyG: [1, 1], KeyH: [1, 2], KeyR: [1, 3],
  };
  const IC = {
    feed: `<svg viewBox="0 0 100 100">${A.SNACK.berry}</svg>`,
    toss: `<svg viewBox="0 0 100 100"><path d="M14 74q30-50 70-40" fill="none" stroke="currentColor" stroke-width="6" stroke-dasharray="2 12" stroke-linecap="round"/><g transform="translate(52 6) scale(.46)">${A.SNACK.cookie}</g></svg>`,
    jump: '<svg viewBox="0 0 24 24"><path d="M12 4l6 7h-4v8h-4v-8H6z" fill="currentColor"/></svg>',
    sp: `<svg viewBox="0 0 100 100">${A.SNACK.cake}</svg>`,
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13c0 .8.9 1.3 1.6.8l10-6.5c.6-.4.6-1.2 0-1.6l-10-6.5C8.9 4.2 8 4.7 8 5.5z" fill="currentColor"/></svg>',
    people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.4" fill="currentColor"/><circle cx="16.5" cy="9" r="2.8" fill="currentColor"/><path d="M2 20c0-4 3-6.5 6-6.5s6 2.5 6 6.5zM13 20c.4-3 1.6-5 3.5-5 2.6 0 5 2 5 5z" fill="currentColor"/></svg>',
  };
  const modeArt = (m) => {
    const h = A.at(A.hari({}), 0, 8, 56), k = A.at(A.kiki({ fr: 1 }), 30, 10, 54);
    const inner = m === 'solo' ? A.at(A.hari({ arm: 1 }), 12, 6, 70) : m === 'cpu' ? `${h}${k}<circle cx="78" cy="22" r="13" fill="var(--st-gold)" ${A.o(1.4)}/><path d="M72 22h12M78 16v12" ${A.o(2)}/>`
      : m === 'local' ? `${h}${k}` : `${h}${k}<path d="M40 14a14 14 0 0 1 20 0M44 19a8 8 0 0 1 12 0" fill="none" stroke="var(--st-p2)" stroke-width="3.4" stroke-linecap="round"/><circle cx="50" cy="23" r="2.6" fill="var(--st-p2)"/>`;
    return `<svg viewBox="0 0 100 80" aria-hidden="true">${inner}</svg>`;
  };

  function create(el, ctx, saved) {
    const P = HH.street;
    let s = null, v = null, raf = 0, last = 0, paused = false, over = 0, party = 0, timers = [];
    let wrap, stage, cv, g, msgEl, pauseEl, modesEl, newEl, statusEl, padEl, pauseBtn;
    let W = 320, H = 200, dpr = 1, k = 32, gy0 = 180, gyF = 110, worldH = 200, overlay = false, tall = false, visW = 10, rcam = 0;
    let C = {}, IMG = {}, sky = null, themeKey = '', themeAt = 0, touchSeen = coarse();
    let mode = sget('street:mode', 'solo');
    let net = null;                       // { link, sess, role }
    let pred = null;                      // ospite: posizione predetta del proprio personaggio
    let parts = [], floats = [], newQ = [], newBusy = 0, lastChanged = 0, hurtT = [0, 0], spT = [0, 0], shake = 0;
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    // controller locali: direzioni da tasti e levetta, contatori di pressioni
    const pads = [0, 1].map(() => ({ keys: {}, sx: 0, sy: 0, n: [0, 0, 0, 0] }));
    const sfx = (n, ...a) => { const f = ctx.sfx && ctx.sfx[n]; if (f) f(...a); else if (HH.audio && HH.audio.sfx[n]) HH.audio.sfx[n](...a); };

    /* ---------- costruzione ---------- */
    function build() {
      el.innerHTML = `<div class="st-wrap st-${(v && v.theme) || 'market'}" dir="ltr">
        <div class="st-stage" tabindex="0" role="application" aria-label="${L('st_board')}">
          <canvas class="st-cv"></canvas>
          <div class="st-top"><span></span><div class="st-tools">
            <button class="st-btn st-who" type="button" aria-label="${L('st_players')}" title="${L('st_players')}">${IC.people}</button>
            <button class="st-btn st-pbtn" type="button" aria-label="${L('pa_pause')}">${IC.pause}</button></div></div>
          <div class="st-msg" aria-live="polite"></div>
          <div class="st-new" aria-live="polite" hidden><span class="st-new-tag"></span><span class="st-new-ic"></span><b></b></div>
          <div class="st-status" hidden></div>
          <div class="st-over st-pause" hidden><div><span class="st-play">${IC.play}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div></div>
          <div class="st-over st-modes-o" hidden><div class="st-modes"></div></div>
        </div>
        <div class="st-pad"></div>
      </div>`;
      wrap = el.querySelector('.st-wrap');
      stage = el.querySelector('.st-stage');
      cv = el.querySelector('.st-cv');
      g = cv.getContext('2d');
      msgEl = el.querySelector('.st-msg');
      newEl = el.querySelector('.st-new');
      statusEl = el.querySelector('.st-status');
      pauseEl = el.querySelector('.st-pause');
      modesEl = el.querySelector('.st-modes-o');
      padEl = el.querySelector('.st-pad');
      pauseBtn = el.querySelector('.st-pbtn');
      renderPad();
      theme(true);
      measure();
      if (G.ResizeObserver) {
        if (el._stRO) el._stRO.disconnect();
        el._stRO = new G.ResizeObserver(() => { measure(); draw(performance.now()); });
        el._stRO.observe(stage);
      }
    }
    function renderPad() {
      const two = mode === 'local';
      const half = (pi) => `<div class="st-half p${pi + 1}" data-p="${pi}">
          <div class="st-stick" data-p="${pi}"><i class="st-knob"></i></div>
          <div class="st-btns">
            <button type="button" class="st-b sp" data-p="${pi}" data-b="3" aria-label="${L('st_special')}">${IC.sp}</button>
            <button type="button" class="st-b jump" data-p="${pi}" data-b="2" aria-label="${L('st_jumpb')}">${IC.jump}</button>
            <button type="button" class="st-b toss" data-p="${pi}" data-b="1" aria-label="${L('st_toss')}">${IC.toss}</button>
            <button type="button" class="st-b feed" data-p="${pi}" data-b="0" aria-label="${L('st_feed')}">${IC.feed}</button>
          </div></div>`;
      padEl.innerHTML = two ? half(0) + half(1) : half(0);
      wrap.classList.toggle('two', two);
      padEl.hidden = !touchSeen;
    }

    // token del tema → colori del canvas e bitmap dei personaggi
    function theme(force) {
      const cs = G.getComputedStyle(wrap);
      const key = TOKENS.map((t) => cs.getPropertyValue('--st-' + t).trim()).join('|') + (v ? v.theme : '');
      if (!force && key === themeKey) return;
      themeKey = key;
      C = {};
      TOKENS.forEach((t) => { C[t] = cs.getPropertyValue('--st-' + t).trim(); });
      C.night = +C.night || 0;
      const res = (svg) => svg.replace(/var\((--[\w-]+)\)/g, (m0, n) => cs.getPropertyValue(n).trim() || 'transparent');
      const want = {};
      for (const ch of ['hari', 'kiki']) {
        const f = A[ch];
        Object.assign(want, {
          [`${ch}_0`]: f({}), [`${ch}_1`]: f({ fr: 1 }), [`${ch}_feed`]: f({ arm: 1, mood: 'joy' }), [`${ch}_toss`]: f({ arm: 2 }),
          [`${ch}_jump`]: f({ arm: 3, fr: 1 }), [`${ch}_hurt`]: f({ mood: 'oops' }), [`${ch}_nap`]: f({ mood: 'sleep' }), [`${ch}_sp`]: f({ arm: 3, mood: 'joy' }),
        });
      }
      for (const kk of P.KINDS) {
        want[`a_${kk}_0`] = A.animal(kk, {}); want[`a_${kk}_1`] = A.animal(kk, { fr: 1 }); want[`a_${kk}_open`] = A.animal(kk, { mood: 'open' });
        want[`a_${kk}_joy`] = A.animal(kk, { mood: 'joy' }); want[`a_${kk}_dizzy`] = A.animal(kk, { mood: 'dizzy' });
      }
      want.a_raccoon_sly = A.animal('raccoon', { mood: 'sly', fr: 1 });
      const bk = (v && v.bossK) || 'bear', bkind = bk;
      want.boss_0 = A.boss(bkind, {}); want.boss_1 = A.boss(bkind, { fr: 1 }); want.boss_open = A.boss(bkind, { mood: 'open' });
      want.boss_joy = A.boss(bkind, { mood: 'joy' }); want.boss_sleep = A.boss(bkind, { mood: 'sleep' });
      for (const o of Object.keys(A.OBJ)) want[`o_${o}`] = A.OBJ[o];
      for (const sn of Object.keys(A.SNACK)) want[`s_${sn}`] = A.SNACK[sn];
      const size = (n) => (n.startsWith('boss') ? 320 : n.startsWith('s_') ? 96 : 180);
      Object.keys(want).forEach((n) => bake(n, res(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size(n)}" height="${size(n)}">${want[n]}</svg>`), size(n)));
      sky = null;
    }
    function bake(name, svg, size) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(im, 0, 0, size, size); IMG[name] = c; };
      im.onerror = () => { if (G.console) G.console.warn('street: sprite non valido', name); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    function measure() {
      if (!stage) return;
      const full = !!(fsEl() && fsEl().contains(wrap));
      const land = (G.innerWidth || 1) > (G.innerHeight || 1);
      overlay = full || (land && touchSeen && (G.innerHeight || 999) < 560);
      wrap.classList.toggle('st-ov', overlay);
      W = stage.clientWidth || 320; H = stage.clientHeight || 200;
      dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      // il mondo: 10 m di strada in larghezza (6,5 m attorno ai giocatori in verticale a schermo intero, così si vede bene)
      const padH = overlay && touchSeen ? Math.min(220, H * 0.34) : 0;
      tall = overlay && H > W * 1.15;
      visW = tall ? 6.5 : P.VIEW;
      k = W / visW;
      const bottom = tall ? H - padH * 0.55 : H;
      worldH = bottom;
      const band = Math.min(bottom * (tall ? 0.46 : 0.4), P.DEPTH * k * (tall ? 0.8 : 0.62));
      gy0 = bottom - k * 0.22; gyF = gy0 - band;
      sky = null;
    }

    /* ---------- proiezione ---------- */
    // telecamera del disegno: quella della logica, o una finestra più stretta che segue i giocatori (verticale)
    const camX = () => rcam;
    function aimCam() {
      if (!v) return;
      if (visW >= P.VIEW) { rcam = v.cam; return; }
      const act = v.players.filter((p) => p.st !== 'nap'), ps = act.length ? act : v.players;
      const mid = ps.reduce((m, p) => m + p.x, 0) / ps.length;
      const want = Math.max(v.cam, Math.min(v.cam + P.VIEW - visW, mid - visW / 2));
      rcam = Math.abs(want - rcam) > 3 ? want : rcam + (want - rcam) * 0.12;
      rcam = Math.max(v.cam, Math.min(v.cam + P.VIEW - visW, rcam));
    }
    const SY = (y, z = 0) => gy0 - (y / P.DEPTH) * (gy0 - gyF) - z * k * 0.95;
    const SC = (y) => 1 - 0.14 * (y / P.DEPTH);
    const SX = (x) => (x - camX()) * k;

    /* ---------- fondale ---------- */
    function paintSky() {
      sky = document.createElement('canvas');
      sky.width = cv.width; sky.height = cv.height;
      const b = sky.getContext('2d');
      b.scale(dpr, dpr);
      const gr = b.createLinearGradient(0, 0, 0, gyF);
      gr.addColorStop(0, C['sky-1']); gr.addColorStop(1, C['sky-2']);
      b.fillStyle = gr; b.fillRect(0, 0, W, gyF + 2);
      const r = HH.rng(31);
      if (C.night) { b.fillStyle = C.star; for (let i = 0; i < 40; i++) { b.globalAlpha = 0.4 + r() * 0.6; b.beginPath(); b.arc(r() * W, r() * gyF * 0.7, 0.6 + r(), 0, 7); b.fill(); } b.globalAlpha = 1; }
      b.fillStyle = C.sun; b.beginPath(); b.arc(W * 0.82, gyF * 0.2, Math.max(10, W * 0.035), 0, 7); b.fill();
      if (C.night) { b.fillStyle = C['sky-1']; b.beginPath(); b.arc(W * 0.82 - W * 0.014, gyF * 0.2 - W * 0.008, Math.max(9, W * 0.03), 0, 7); b.fill(); }
    }
    const hash = (i) => { let x = (i * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return (x >>> 0) / 4294967296; };
    function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    // strati ripetuti con parallasse: fn(x sullo schermo, larghezza, indice)
    function layer(par, period, fn) {
      const off = camX() * k * par, w = period * k;
      const i0 = Math.floor(off / w) - 1, i1 = Math.ceil((off + W) / w) + 1;
      for (let i = i0; i <= i1; i++) fn(i * w - off, w, i);
    }
    function backdrop(t) {
      if (!sky) paintSky();
      g.drawImage(sky, 0, 0, W, H);
      const th = (v && v.theme) || 'market', base = gyF;
      g.lineWidth = Math.max(1, k * 0.03); g.strokeStyle = C.ink;
      if (th === 'port') {
        g.fillStyle = C.far; g.fillRect(0, base - k * 1.4, W, k * 1.4);
        g.fillStyle = C['water-2']; for (let i = 0; i < 6; i++) { const x = ((i * 97 - camX() * k * 0.2 + t * 8) % (W + 60) + W + 60) % (W + 60) - 30; g.fillRect(x, base - k * (0.4 + (i % 3) * 0.3), k * 0.6, 2); }
        layer(0.25, 9, (x, w, i) => { if (hash(i) < 0.5) return; const bx = x + w * hash(i + 7) * 0.6, by = base - k * 1.2; g.fillStyle = C['far-2']; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + k * 2.2, by); g.lineTo(bx + k * 1.8, by + k * 0.5); g.lineTo(bx + k * 0.3, by + k * 0.5); g.closePath(); g.fill(); g.fillRect(bx + k, by - k * 1.2, k * 0.08, k * 1.2); g.beginPath(); g.moveTo(bx + k * 1.08, by - k * 1.1); g.lineTo(bx + k * 1.8, by - k * 0.3); g.lineTo(bx + k * 1.08, by - k * 0.3); g.closePath(); g.fillStyle = C['awning-2']; g.fill(); });
      } else if (th === 'city') {
        layer(0.3, 3, (x, w, i) => { const h = k * (2 + hash(i) * 2.4); g.fillStyle = i % 2 ? C.far : C['far-2']; g.fillRect(x, base - h, w * 0.9, h); g.fillStyle = C.window; for (let r = 0; r < Math.floor(h / (k * 0.6)) - 1; r++) for (let c = 0; c < 3; c++) if (hash(i * 31 + r * 7 + c) < (C.night ? 0.55 : 0.8)) g.fillRect(x + w * (0.12 + c * 0.27), base - h + k * (0.3 + r * 0.6), w * 0.14, k * 0.28); });
      } else if (th === 'fair') {
        // ruota panoramica lontana
        const cx = W * 0.7 - camX() * k * 0.08, cy = base - k * 2.4, R = k * 1.9;
        g.strokeStyle = C['far-2']; g.lineWidth = Math.max(2, k * 0.08);
        g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + (reduce() ? 0 : t * 0.2); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); g.fillStyle = i % 2 ? C.awning : C.gold; g.beginPath(); g.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, k * 0.22, 0, 7); g.fill(); }
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - R * 0.5, base); g.moveTo(cx, cy); g.lineTo(cx + R * 0.5, base); g.stroke();
        layer(0.35, 4, (x, w, i) => { g.fillStyle = C.far; g.beginPath(); g.ellipse(x + w / 2, base, w * 0.6, k * (0.8 + hash(i) * 0.6), 0, Math.PI, 0); g.fill(); });
      } else if (th === 'train') {
        layer(0.15, 5, (x, w, i) => { g.fillStyle = C['far-2']; g.beginPath(); g.ellipse(x + w / 2, base, w * 0.7, k * (1 + hash(i) * 1.2), 0, Math.PI, 0); g.fill(); });
        layer(reduce() ? 0.4 : 0.4, 3, (x, w, i) => { g.fillStyle = C.tree; g.beginPath(); g.arc(x + w * 0.5, base - k * 0.6, k * (0.5 + hash(i + 3) * 0.4), 0, 7); g.fill(); });
      } else {
        layer(0.25, 2.2, (x, w, i) => { g.fillStyle = i % 2 ? C.tree : C['tree-2']; const r = k * (0.9 + hash(i) * 0.7); g.beginPath(); g.arc(x + w / 2, base - r * 0.6, r, 0, 7); g.fill(); g.fillStyle = C.front; g.fillRect(x + w / 2 - k * 0.08, base - r * 0.3, k * 0.16, r * 0.3); });
      }
      // fronte del marciapiede: bancarelle, negozi, vagoni, stand
      layer(1, 4, (x, w, i) => {
        const h = k * 1.5, y0 = gyF - h + k * 0.15;
        if (th === 'train') {
          g.fillStyle = C.mid; rr(x + k * 0.1, y0 - k * 0.2, w - k * 0.2, h + k * 0.1, k * 0.3); g.fill(); g.stroke();
          g.fillStyle = C.window; for (let c = 0; c < 3; c++) { rr(x + k * (0.45 + c * 1.15), y0 + k * 0.15, k * 0.8, k * 0.55, k * 0.12); g.fill(); g.stroke(); }
          g.fillStyle = C.awning; g.fillRect(x + k * 0.1, y0 + k * 0.9, w - k * 0.2, k * 0.12);
          return;
        }
        if (hash(i + 101) < 0.18 && th !== 'city') return;
        g.fillStyle = i % 2 ? C.mid : C['mid-2'];
        rr(x + k * 0.2, y0, w - k * 0.4, h, k * 0.12); g.fill(); g.stroke();
        // tenda a strisce
        const aw = w - k * 0.2, ay = y0 - k * 0.1;
        for (let sI = 0; sI < 6; sI++) { g.fillStyle = sI % 2 ? C['awning-2'] : C.awning; g.beginPath(); g.moveTo(x + k * 0.1 + (aw / 6) * sI, ay); g.lineTo(x + k * 0.1 + (aw / 6) * (sI + 1), ay); g.lineTo(x + k * 0.1 + (aw / 6) * (sI + 0.5), ay + k * 0.4); g.closePath(); g.fill(); }
        g.fillStyle = C.wall; g.fillRect(x + k * 0.5, y0 + k * 0.5, w - k, k * 0.55);
        if (th === 'market' || th === 'fair') { for (let c = 0; c < 4; c++) { g.fillStyle = c % 2 ? C.straw : C.leaf; g.beginPath(); g.arc(x + k * (0.9 + c * 0.7), y0 + k * 0.5, k * 0.18, 0, 7); g.fill(); } }
        else { g.fillStyle = C.window; g.fillRect(x + k * 0.7, y0 + k * 0.6, w - k * 1.4, k * 0.4); }
        // lanterna o lampione
        g.fillStyle = C.lamp; g.beginPath(); g.arc(x + k * 0.2, y0 + k * 0.2, k * 0.16, 0, 7); g.fill(); g.stroke();
      });
      // marciapiede (la strada dove si gioca)
      g.fillStyle = C.curb; g.fillRect(0, gyF - k * 0.06, W, k * 0.16);
      g.fillStyle = C['ground-1']; g.fillRect(0, gyF + k * 0.1, W, H - gyF);
      g.strokeStyle = C['ground-2']; g.lineWidth = Math.max(1, k * 0.04);
      for (let r = 1; r < 4; r++) { const yy = SY((P.DEPTH * r) / 4); g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
      layer(1, 1.2, (x, w, i) => { for (let r = 0; r < 4; r++) { const ya = SY((P.DEPTH * r) / 4), yb = SY((P.DEPTH * (r + 1)) / 4), xx = x + (r % 2 ? w / 2 : 0); g.beginPath(); g.moveTo(xx, ya); g.lineTo(xx, yb); g.stroke(); } });
      g.fillStyle = C.front; g.fillRect(0, gy0 + k * 0.12, W, H - gy0);
      if (th === 'port') { g.fillStyle = C.water; g.fillRect(0, gy0 + k * 0.3, W, H); }
    }

    /* ---------- personaggi ---------- */
    function sprite(name, x, yFoot, w, flip, alpha = 1, rot = 0, sq = 0) {
      const im = IMG[name];
      if (!im || w < 1) return;
      g.save();
      g.globalAlpha = alpha;
      g.translate(x, yFoot);
      if (rot) g.rotate(rot);
      g.scale(flip ? -1 : 1, 1);
      if (sq) g.scale(1 + sq, 1 - sq);
      g.drawImage(im, -w / 2, -w * 0.96, w, w);
      g.restore();
    }
    function shadow(x, y, rx) { g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, rx, rx * 0.3, 0, 0, 7); g.fill(); }
    const SIZE = { bunny: 1.15, raccoon: 1.2, boar: 1.3, magpie: 1.05, fox: 1.2, bear: 1.6 };
    function drawPlayer(p, t) {
      const x = SX(p.x), y = SY(p.y), sc = SC(p.y), w = k * 1.45 * sc;
      shadow(x, y, w * 0.28 * (1 - Math.min(0.5, p.z * 0.4)));
      const walk = p.st === 'walk' && !reduce() ? Math.floor(t * 8) % 2 : 0;
      let pose = walk ? '1' : '0';
      if (p.st === 'feed') pose = 'feed';
      if (p.st === 'grab') pose = 'feed';
      if (p.z > 0.05) pose = 'jump';
      if (p.st === 'special') pose = 'sp';
      if (p.st === 'hurt') pose = 'hurt';
      if (p.st === 'nap') pose = 'nap';
      const blink = p.inv > 0 && p.st !== 'nap' && !reduce() && Math.floor(t * 12) % 2;
      const bob = p.st === 'walk' && !reduce() ? Math.abs(Math.sin(t * 16)) * w * 0.03 : 0;
      sprite(`${p.ch}_${pose}`, x, SY(p.y, p.z) - bob, w, p.face < 0, blink ? 0.45 : 1, p.st === 'nap' ? -0.2 * p.face : 0);
      if (p.st === 'nap' && !reduce() && Math.random() < 0.04) floats.push({ text: 'z', x, y: y - w * 0.8, vy: -18, t0: t, life: 1.2, col: C.zzz, fs: 14 });
      // indicatore del giocatore (P1/P2) e cesto pronto
      if (v.np > 1) { g.fillStyle = p.i ? C.p2 : C.p1; g.beginPath(); g.moveTo(x - 5, SY(p.y, p.z) - w * 1.02); g.lineTo(x + 5, SY(p.y, p.z) - w * 1.02); g.lineTo(x, SY(p.y, p.z) - w * 0.94); g.closePath(); g.fill(); }
      if (p.bk) sprite('s_basket', x + p.face * w * 0.32, SY(p.y, p.z) - w * 0.5, w * 0.35, false);
    }
    function drawAnimal(a, t) {
      const sz = SIZE[a.k] || 1.2, sc = SC(a.y), w = k * sz * sc, x = SX(a.x), y = SY(a.y);
      const fly = a.k === 'magpie';
      shadow(x, y, w * (fly ? 0.2 : 0.3));
      let pose = !reduce() && (fly || a.st === 'walk' || a.st === 'bye' || a.st === 'charge' || a.st === 'steal') ? String(Math.floor(t * (a.st === 'charge' ? 14 : 7) + a.id) % 2) : '0';
      if (a.st === 'atk' || a.st === 'wind' || a.st === 'aim' || a.st === 'swoop') pose = 'open';
      if (a.st === 'happy' || a.st === 'bye' || (a.yum > 0 && a.st !== 'dizzy')) pose = 'joy';
      if (a.st === 'dizzy' || a.st === 'held') pose = 'dizzy';
      if (a.st === 'steal') pose = 'sly';
      const name = IMG[`a_${a.k}_${pose}`] ? `a_${a.k}_${pose}` : `a_${a.k}_0`;
      const hop = a.st === 'bye' && !reduce() ? Math.abs(Math.sin(t * 10 + a.id)) * w * 0.15 : 0;
      const wob = a.st === 'wind' && !reduce() ? Math.sin(t * 40) * 0.05 : 0;
      const sit = a.st === 'happy' ? 0.08 : 0;
      sprite(name, x, SY(a.y, a.z) - hop, w, a.face < 0, 1, wob, sit);
      // pancia da riempire (barra della fame) sopra la testa
      if (a.st !== 'happy' && a.st !== 'bye' && a.max > 0) {
        const bw = Math.max(18, w * 0.62), bh = Math.max(5, k * 0.13), bx = x - bw / 2, by = SY(a.y, a.z) - w * 1.02 - hop;
        g.fillStyle = C['tummy-bg']; g.strokeStyle = C.ink; g.lineWidth = 1.2;
        rr(bx, by, bw, bh, bh / 2); g.fill(); g.stroke();
        const f = 1 - a.left / a.max;
        if (f > 0) { g.fillStyle = C.tummy; rr(bx + 1.2, by + 1.2, (bw - 2.4) * f, bh - 2.4, (bh - 2.4) / 2); g.fill(); }
      }
      // preavvisi: "!" per morso e picchiata, linea per la carica
      if (a.st === 'atk' || a.st === 'aim' || a.st === 'wind') {
        const al = reduce() ? 1 : 0.6 + 0.4 * Math.sin(t * 20);
        g.globalAlpha = al; txt('!', x + a.face * w * 0.3, SY(a.y, a.z) - w * 1.12, Math.max(14, k * 0.45), C.danger); g.globalAlpha = 1;
        if (a.st === 'wind') { g.fillStyle = C.danger; g.globalAlpha = 0.25; const y1 = SY(a.y); g.fillRect(a.face > 0 ? x : 0, y1 - k * 0.12, a.face > 0 ? W - x : x, k * 0.24); g.globalAlpha = 1; }
        if (a.st === 'aim' && a.tg != null) { /* la gazza sceglie al termine della mira */ }
      }
      if (a.st === 'swoop' && a.tx != null) { const mx = SX(a.tx), my = SY(a.ty); g.strokeStyle = C.mark; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.ellipse(mx, my, k * 0.4, k * 0.12, 0, 0, 7); g.stroke(); g.setLineDash([]); }
    }
    function drawBoss(b, t) {
      const sc = SC(b.y), w = k * b.r * 3.1 * sc, x = SX(b.x), y = SY(b.y);
      shadow(x, y, w * 0.3);
      let pose = !reduce() && (b.st === 'charge' || b.st === 'back' || b.st === 'enter') ? String(Math.floor(t * 8) % 2) : '0';
      if (b.st === 'wind' || b.st === 'suck') pose = 'open';
      if (b.yum > 0) pose = 'joy';
      if (b.st === 'full') pose = 'sleep';
      const wob = b.st === 'wind' && !reduce() ? Math.sin(t * 30) * 0.03 : 0;
      if (b.st === 'dive' && b.tx != null) { g.fillStyle = C.danger; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(SX(b.tx), SY(b.ty), k * b.r * 0.8, k * b.r * 0.25, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
      sprite(IMG[`boss_${pose}`] ? `boss_${pose}` : 'boss_0', x, SY(b.y, b.z || 0), w, b.face < 0, 1, wob);
      if (b.st === 'suck' && !reduce()) for (let i = 0; i < 3; i++) { const a = (t * 3 + i * 2.1) % 1; g.strokeStyle = C.wave; g.lineWidth = 2; g.beginPath(); g.arc(x + b.face * w * 0.3, y - w * 0.45, w * (0.6 - a * 0.5), 0, 7); g.stroke(); }
      if (b.st === 'wind') { const al = reduce() ? 1 : 0.6 + 0.4 * Math.sin(t * 20); g.globalAlpha = al; txt('!', x, y - w * 1.05, Math.max(18, k * 0.6), C.danger); g.globalAlpha = 1; if (b.a === 'charge') { g.fillStyle = C.danger; g.globalAlpha = 0.22; g.fillRect(0, y - k * 0.3, x, k * 0.6); g.globalAlpha = 1; } }
    }
    function drawObj(o, t) {
      const sc = SC(o.y), x = SX(o.x), y = SY(o.y);
      if (o.k === 'crate') { const w = k * 0.95 * sc; shadow(x, y, w * 0.4); sprite(o.hp < 2 ? 'o_crack' : 'o_crate', x, y, w, false); return; }
      const w = k * 1.15 * sc;
      shadow(x, y, w * 0.4);
      sprite('o_cart', x, y, w, false, 1, o.run > 0 && !reduce() ? Math.sin(t * 30) * 0.03 : 0);
    }
    function txt(s0, x, y, fs, col) {
      g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = Math.max(3, fs * 0.22); g.strokeStyle = C['text-line']; g.strokeText(s0, x, y);
      g.fillStyle = col || C.text; g.fillText(s0, x, y);
    }

    function draw(nowMs) {
      if (!g || !v) return;
      const t = nowMs / 1000;
      aimCam();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.save();
      if (shake > 0 && !reduce()) g.translate((Math.random() - 0.5) * shake * 8, (Math.random() - 0.5) * shake * 6);
      backdrop(t);
      // onde d'urto del pestone (sul marciapiede, sotto a tutti)
      for (const wv of v.waves2) { g.strokeStyle = C.wave; g.lineWidth = Math.max(3, k * 0.12); g.beginPath(); g.ellipse(SX(wv.x), SY(wv.y), wv.r * k, (wv.r / 2.2) * (gy0 - gyF) / P.DEPTH, 0, 0, 7); g.stroke(); g.strokeStyle = C.danger; g.lineWidth = Math.max(1.5, k * 0.05); g.stroke(); }
      // tutto ordinato per profondità (prima il fondo)
      const list = [];
      for (const o of v.objs) list.push([o.y, () => drawObj(o, t)]);
      for (const kp of v.picks) list.push([kp.y, () => { const x = SX(kp.x), y = SY(kp.y); shadow(x, y, k * 0.15); sprite(`s_${kp.k}`, x, y - (reduce() ? 0 : Math.abs(Math.sin(t * 4 + kp.id)) * k * 0.15), k * 0.5, false); }]);
      for (const m of v.melons) list.push([m.y, () => { const x = SX(m.x), y = SY(m.y), w = k * 0.8 * SC(m.y); shadow(x, y, w * 0.35); if (m.stop) sprite('s_slice', x, y, w * 0.9, false); else { const im = IMG.s_melon; if (im) { g.save(); g.translate(x, y - w * 0.45); if (!reduce()) g.rotate(-t * 8); g.drawImage(im, -w / 2, -w / 2, w, w); g.restore(); } } }]);
      for (const a of v.animals) list.push([a.y, () => drawAnimal(a, t)]);
      if (v.boss) list.push([v.boss.y, () => drawBoss(v.boss, t)]);
      v.players.forEach((p, i) => { const q = net && net.role === 'guest' && i === 1 && pred ? Object.assign({}, p, { x: pred.x, y: pred.y }) : p; list.push([q.y - 0.001, () => drawPlayer(q, t)]); });
      for (const q of v.shots) list.push([q.y, () => { const x = SX(q.x), y = SY(q.y, q.z || 0.8), w = k * 0.36; const im = IMG[v.players[q.o] && v.players[q.o].ch === 'kiki' ? 's_acorn' : 's_cookie']; if (im) { g.save(); g.translate(x, y); if (!reduce()) g.rotate(t * 12 * Math.sign(q.vx || 1)); g.drawImage(im, -w / 2, -w / 2, w, w); g.restore(); } }]);
      list.sort((a, b) => b[0] - a[0]);
      list.forEach((e) => e[1]());
      // speciali: torta gigante e pioggia di frutti
      for (const f of v.fx) {
        if (f.k === 'cake') { const w = k * 2.4 * (1 - Math.max(0, f.t - 0.9) * 2); sprite('s_cake', SX(f.x), SY(f.y) - (reduce() ? 0 : Math.max(0, f.t - 0.9) * k * 6), w, false); }
        else if (!reduce()) for (let i = 0; i < 26; i++) { const xx = hash(i) * W, yy = ((1.4 - f.t) * H * 1.3 + hash(i + 50) * H) % (H * 1.1) - H * 0.1; sprite(i % 2 ? 's_berry' : 's_apple', xx, yy, k * 0.4, false, 1, t * 3 + i); }
      }
      drawFx(t);
      g.restore();
      hud(t);
    }
    function drawFx(t) {
      parts = parts.filter((q) => t - q.t0 < q.life);
      for (const q of parts) {
        const a = (t - q.t0) / q.life, x = q.x + q.vx * (t - q.t0), y = q.y + q.vy * (t - q.t0) + 60 * (t - q.t0) * (t - q.t0);
        g.globalAlpha = 1 - a;
        if (q.heart) { g.fillStyle = C.heart; g.save(); g.translate(x, y); g.scale(q.r / 10, q.r / 10); g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-8, 0, -8, -8, 0, -4); g.bezierCurveTo(8, -8, 8, 0, 0, 6); g.fill(); g.restore(); }
        else { g.fillStyle = q.col; g.beginPath(); g.arc(x, y, q.r * (1 - a * 0.5), 0, 7); g.fill(); }
      }
      floats = floats.filter((f) => t - f.t0 < f.life);
      for (const f of floats) { const a = (t - f.t0) / f.life; g.globalAlpha = 1 - a * a; txt(f.text, f.x, f.y + f.vy * (t - f.t0), f.fs || 18, f.col); }
      g.globalAlpha = 1;
    }
    // energia, speciale, cuori della squadra, pancia dell'animalone, "GO →"
    function hud(t) {
      const fs = Math.max(11, Math.min(18, W * 0.03));
      v.players.forEach((p, i) => {
        const x0 = 8 + i * (fs * 7.4 + 6), y0 = 8, Cc = P.CH[p.ch];
        g.fillStyle = C['tummy-bg']; g.strokeStyle = C.ink; g.lineWidth = 1.4;
        rr(x0, y0, fs * 7.4, fs * 2.5, fs * 0.8); g.fill(); g.stroke();
        const im = IMG[`${p.ch}_0`]; if (im) g.drawImage(im, x0 + 2, y0 + 1, fs * 2.3, fs * 2.3);
        for (let h = 0; h < Cc.hp; h++) {
          const hx = x0 + fs * 2.6 + h * fs * 0.78, hy = y0 + fs * 0.75, on = h < p.hp;
          g.fillStyle = on ? C.heart : C.shadow;
          g.beginPath(); g.arc(hx, hy, fs * 0.3, 0, 7); g.fill();
        }
        const bw = fs * 4.4, bx = x0 + fs * 2.6, by = y0 + fs * 1.4;
        g.fillStyle = C.shadow; rr(bx, by, bw, fs * 0.55, fs * 0.27); g.fill();
        if (p.sp > 0) { g.fillStyle = p.sp >= 1 ? C.gold : C.p1; rr(bx, by, bw * p.sp, fs * 0.55, fs * 0.27); g.fill(); }
        if (p.cpu) txt('CPU', x0 + fs * 1.2, y0 + fs * 2.2, fs * 0.6, C.gold);
        if (p.sp >= 1 && !reduce() && Math.floor(t * 4) % 2) { g.strokeStyle = C.gold; g.lineWidth = 2.5; rr(bx - 2, by - 2, bw + 4, fs * 0.55 + 4, fs * 0.3); g.stroke(); }
      });
      // cuori della squadra
      const lives = P.LIVES - (v.oops || 0);
      let hx = 8 + v.np * (fs * 7.4 + 6) + fs * 0.7, hy = 8 + fs * 1.25;
      if (hx + fs * 3.4 > W - 100) { hx = 8 + fs * 0.7; hy = 8 + fs * 3.4; }          // schermo stretto: sotto i riquadri
      for (let i = 0; i < P.LIVES; i++) { g.globalAlpha = i < lives ? 1 : 0.25; txt('♥', hx + i * fs * 1.3, hy, fs * 1.3, C.heart); }
      g.globalAlpha = 1;
      if (v.boss && v.boss.st !== 'enter') {
        const bw = Math.min(W * 0.5, 280), bx = (W - bw) / 2 + fs, by = 14 + fs * 2.6, f = v.boss.fed / v.boss.need;
        g.fillStyle = C['tummy-bg']; g.strokeStyle = C.ink; g.lineWidth = 1.5; rr(bx, by, bw, fs * 0.9, fs * 0.45); g.fill(); g.stroke();
        if (f > 0) { g.fillStyle = C.tummy; rr(bx + 2, by + 2, (bw - 4) * f, fs * 0.9 - 4, fs * 0.4); g.fill(); }
        const im = IMG.boss_0; if (im) g.drawImage(im, bx - fs * 1.6, by - fs * 0.7, fs * 2.2, fs * 2.2);
      }
      if (v.phase === 'walk' && v.ready <= 0 && !v.won && (v.cam < v.lock - 0.2 || v.sec > 0)) {
        if (!reduce() ? Math.floor(t * 2.5) % 2 : true) txt(`${L('st_go')} →`, W - fs * 3.5, gyF - k * 0.2 - fs * 2, fs * 1.8, C.gold);
      }
    }

    /* ---------- particelle ---------- */
    const at = (x, y, z = 0.6) => ({ x: SX(x), y: SY(y, z) });
    function sparks(x, y, n, col, z) { const p = at(x, y, z); for (let i = 0; i < n; i++) parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, r: 2 + Math.random() * 3, t0: performance.now() / 1000, life: 0.6, col }); }
    function hearts(x, y, n) { const p = at(x, y, 1); for (let i = 0; i < n; i++) parts.push({ heart: 1, x: p.x + (Math.random() - 0.5) * k * 0.6, y: p.y, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 40, r: 9 + Math.random() * 5, t0: performance.now() / 1000, life: 1.1 }); }
    function float(text, x, y, col, fs, z = 1.3) { const p = at(x, y, z); floats.push({ text, x: p.x, y: p.y, vy: -30, t0: performance.now() / 1000, life: 1.1, col, fs }); }
    function say(text, cls = '', ms = 1200) {
      msgEl.innerHTML = `<b class="${cls}">${text}</b>`;
      msgEl.classList.remove('show'); void msgEl.offsetWidth; msgEl.classList.add('show');
      clearTimeout(say.t); say.t = later(() => msgEl.classList.remove('show'), ms);
    }
    function status(text) { if (!statusEl) return; statusEl.hidden = !text; statusEl.textContent = text || ''; }
    function changed(force) { const n = performance.now(); if (!force && n - lastChanged < 900) return; lastChanged = n; ctx.changed(); }

    /* ---------- eventi della logica (locali o arrivati dall'host) ---------- */
    let sndFeed = 0;
    function onEvent(e) {
      const t = performance.now() / 1000;
      switch (e.type) {
        case 'ready': say(L('pa_go'), '', 700); sfx('milestone'); break;
        case 'feed': if (e.bite > 0) { sparks(e.x, e.y, e.big ? 8 : 3, C.spark, 0.7); if (t - sndFeed > 0.08) { sndFeed = t; sfx('mark'); } if (e.big) float(L('st_yum'), e.x, e.y, C.gold, 18); } break;
        case 'full': hearts(e.x, e.y, 3); sfx('place'); float(L('st_full'), e.x, e.y, C.heart, 16); changed(true); break;
        case 'toss': sfx('tap'); break;
        case 'hit': sparks(e.x, e.y, 2, C.puff, 0.7); break;
        case 'steal': sfx('giggle'); float(L('st_steal'), e.x, e.y, C.danger, 15); break;
        case 'catch': sfx('pick'); break;
        case 'dizzy': sfx('sproing'); break;
        case 'grab': sfx('pick'); break;
        case 'basket': sfx('cupDone'); float(L('st_basket'), e.x, e.y, C.gold, 18); sparks(e.x, e.y, 10, C.gold, 0.8); break;
        case 'nibble': {
          hurtT[e.p] = t; sfx('boing');
          if (!reduce()) { wrap.classList.remove('wobble'); void wrap.offsetWidth; wrap.classList.add('wobble'); }
          shake = 0.4; break;
        }
        case 'tired': {
          float(L('st_tired'), v.players[e.p] ? v.players[e.p].x : 0, v.players[e.p] ? v.players[e.p].y : 1, C.zzz, 20);
          ctx.mistake(e.left);
          changed(true);
          break;
        }
        case 'back': sfx('blip'); break;
        case 'jump': sfx('sproing'); break;
        case 'special': shake = 0.6; sfx('cupDone'); say(L(e.kind === 'cake' ? 'st_cake' : 'st_rain'), 'small', 1100); break;
        case 'spReady': if (!net || net.role === 'host' ? e.p === 0 || mode === 'local' : e.p === 1) { sfx('star', 1); say(L('st_sp_ready'), 'small', 900); } spT[e.p] = t; break;
        case 'crate': sparks(e.x, e.y, 8, C.cookie, 0.4); sfx('pop'); break;
        case 'pick': sfx(e.k === 'star' ? 'gift' : 'heart'); break;
        case 'cart': sfx('zoom'); break;
        case 'cartFeed': sfx('place'); break;
        case 'wave': changed(true); say(L('st_wave'), 'small', 1000); break;
        case 'go': say(`${L('st_go')} →`, '', 1100); sfx('milestone'); changed(true); break;
        case 'boss': say(L('st_boss'), 'small', 1600); sfx('milestone'); themeKey = ''; theme(true); changed(true); break;
        case 'bossAtk': sfx('blip'); break;
        case 'stomp': shake = 0.8; sfx('boing'); break;
        case 'melonStop': sfx('pop'); sparks(e.x, e.y, 6, C.melon, 0.3); break;
        case 'call': sfx('giggle'); break;
        case 'gulp': float(L('st_gulp'), v.boss ? v.boss.x : 0, v.boss ? v.boss.y : 1, C.gold, 20, 2); sfx('cupDone'); break;
        case 'charge': sfx('whee'); break;
        case 'phase': say(L('st_hungry'), 'small', 1100); sfx('milestone'); break;
        case 'new': showNew(e.what); break;
        case 'lose': over = performance.now(); break;
        case 'win': {
          party = performance.now();
          if (v.boss) for (let i = 0; i < 4; i++) later(() => hearts(v.boss.x + (Math.random() - 0.5), v.boss.y, 3), i * 180);
          sfx('cupDone'); ctx.changed();
          later(() => ctx.win(), 1600);
          break;
        }
        default: break;
      }
    }
    function newArt(w) {
      const svg = (inner) => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
      if (P.AN[w]) return svg(A.animal(w, { mood: w === 'raccoon' ? 'sly' : '' }));
      if (w === 'crate') return svg(A.OBJ.crate);
      if (w === 'cart') return svg(A.OBJ.cart);
      if (w === 'grab') return svg(A.SNACK.basket);
      if (w === 'steal') return svg(A.animal('raccoon', { mood: 'sly' }));
      if (w === 'boss') return svg(A.SNACK.melon);
      return '';
    }
    function showNew(w) { newQ.push(w); if (!newBusy) nextNew(); }
    function nextNew() {
      const w = newQ.shift();
      if (!w) { newBusy = 0; return; }
      newBusy = 1;
      newEl.querySelector('.st-new-tag').textContent = label('sr_new', 'New!');
      newEl.querySelector('.st-new-ic').innerHTML = newArt(w);
      newEl.querySelector('b').textContent = L(`st_n_${w}`);
      newEl.hidden = false;
      newEl.classList.remove('show'); void newEl.offsetWidth; newEl.classList.add('show');
      sfx('star', 1);
      later(() => { newEl.classList.remove('show'); later(() => { newEl.hidden = true; nextNew(); }, 260); }, 2700);
    }

    /* ---------- input ---------- */
    function inputOf(i) {
      const pd = pads[i], kx = (pd.keys.r ? 1 : 0) - (pd.keys.l ? 1 : 0), ky = (pd.keys.u ? 1 : 0) - (pd.keys.d ? 1 : 0);
      const mx = kx || pd.sx, my = ky || pd.sy;
      return { mx: Math.round(mx * 100) / 100, my: Math.round(my * 100) / 100, a: pd.n[0], b: pd.n[1], c: pd.n[2], s: pd.n[3] };
    }
    // a chi vanno i comandi locali: in rete l'ospite guida Kiki (P2), da soli o con la CPU entrambi i set guidano P1
    const localIndex = (pi) => (net && net.role === 'guest' ? 1 : mode === 'local' ? pi : 0);
    function tap(pi, b) {
      const li = localIndex(pi);
      pads[li].n[b]++;
      if (HH.audio && HH.audio.unlock) HH.audio.unlock();
    }
    function onKey(e) {
      if (!el.isConnected) { detach(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA') return;
      if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); if (e.code === 'Escape') pause(); else toggle(); return; }
      const m = KEYS[e.code];
      if (!m) return;
      e.preventDefault();
      if (!modesEl.hidden) return;
      if (paused) { resume(); return; }
      const li = localIndex(m[0]);
      if (typeof m[1] === 'string') pads[li].keys[m[1]] = true;
      else if (!e.repeat) tap(m[0], m[1]);
    }
    function onKeyUp(e) { const m = KEYS[e.code]; if (m && typeof m[1] === 'string') pads[localIndex(m[0])].keys[m[1]] = false; }
    // touch: pulsanti e levetta (multi-tocco); in due sullo stesso schermo la levetta di ognuno sta nella sua metà
    const sticks = new Map();
    function stickPointer(e, pi, stickEl) {
      const r = stickEl.getBoundingClientRect();
      sticks.set(e.pointerId, { pi, cx: r.left + r.width / 2, cy: r.top + r.height / 2, R: r.width * 0.42, el: stickEl });
      moveStick(e);
    }
    function moveStick(e) {
      const q = sticks.get(e.pointerId);
      if (!q) return;
      let dx = (e.clientX - q.cx) / q.R, dy = (e.clientY - q.cy) / q.R;
      const d = Math.hypot(dx, dy);
      if (d > 1) { dx /= d; dy /= d; }
      const dead = (x) => (Math.abs(x) < 0.18 ? 0 : x);
      const li = localIndex(q.pi);
      pads[li].sx = dead(dx); pads[li].sy = dead(-dy);
      q.el.querySelector('.st-knob').style.cssText = `--kx:${(dx * q.R * 0.8).toFixed(1)}px;--ky:${(dy * q.R * 0.8).toFixed(1)}px`;
    }
    function endStick(e) {
      const q = sticks.get(e.pointerId);
      if (!q) return;
      sticks.delete(e.pointerId);
      const li = localIndex(q.pi);
      pads[li].sx = 0; pads[li].sy = 0;
      q.el.querySelector('.st-knob').style.cssText = '';
    }
    el.onpointerdown = (e) => {
      if (e.pointerType === 'touch' && !touchSeen) { touchSeen = true; padEl.hidden = false; measure(); }
      if (HH.audio && HH.audio.unlock) HH.audio.unlock();
      if (e.target.closest('.st-pbtn')) { e.preventDefault(); toggle(); return; }
      if (e.target.closest('.st-who')) { e.preventDefault(); showModes(); return; }
      if (e.target.closest('.st-modes-o')) return;
      if (paused && e.target.closest('.st-pause')) { e.preventDefault(); resume(); return; }
      const b = e.target.closest('.st-b');
      if (b) { e.preventDefault(); tap(+b.dataset.p, +b.dataset.b); b.classList.add('press'); later(() => b.classList.remove('press'), 120); return; }
      const st = e.target.closest('.st-stick');
      if (st) { e.preventDefault(); try { st.setPointerCapture(e.pointerId); } catch (x) { /* vecchi browser */ } stickPointer(e, +st.dataset.p, st); return; }
      // levetta "ovunque" nella propria metà (a schermo intero / orizzontale)
      if (overlay && touchSeen && e.target.closest('.st-stage, .st-pad')) {
        const r = wrap.getBoundingClientRect(), right = e.clientX > r.left + r.width / 2;
        if (mode !== 'local' && right) return;
        const pi = mode === 'local' && right ? 1 : 0, stEl = padEl.querySelector(`.st-stick[data-p="${pi}"]`);
        if (stEl) { e.preventDefault(); stickPointer(e, pi, stEl); }
      }
    };
    el.onpointermove = (e) => { if (sticks.has(e.pointerId)) { e.preventDefault(); moveStick(e); } };
    el.onpointerup = el.onpointercancel = endStick;
    el.oncontextmenu = (e) => { if (e.target.closest('.st-wrap')) e.preventDefault(); };
    el.onclick = (e) => {
      const m = e.target.closest('.st-mode');
      if (m && !m.disabled) { e.preventDefault(); pickMode(m.dataset.mode); }
      // tastiera (Invio sui pulsanti a schermo): il clic senza puntatore preme il pulsante
      const b = e.target.closest('.st-b');
      if (b && e.detail === 0) tap(+b.dataset.p, +b.dataset.b);
    };

    /* ---------- modalità ---------- */
    const mpOk = () => !!(HH.mp && HH.mp.pair);
    function showModes() {
      if (net) { status(net.role === 'guest' ? L('st_lan_guest') : ''); }
      const list = ['solo', 'cpu', 'local'].concat(mpOk() ? ['lan'] : []);   // la rete compare solo col modulo HH.mp caricato
      modesEl.querySelector('.st-modes').innerHTML = `<h3>${L('st_mode_title')}</h3>
        <div class="st-mode-list">${list.map((m) => `<button type="button" class="st-mode${m === mode ? ' sel' : ''}" data-mode="${m}"${m === 'lan' && !mpOk() ? ' disabled' : ''}>${modeArt(m)}<span>${L('st_mode_' + m)}</span></button>`).join('')}</div>
        <p class="st-keys">${L('st_keys')}</p>`;
      modesEl.hidden = false;
      if (!paused && s && !P.isOver(s)) { paused = true; stop(); }
      const first = modesEl.querySelector('.st-mode.sel') || modesEl.querySelector('.st-mode');
      if (first) first.focus();
    }
    function pickMode(m) {
      sfx('tap');
      modesEl.hidden = true;
      if (m === 'lan') { startLan(); return; }
      leaveNet();
      mode = m; sset('street:mode', m);
      renderPad(); measure();
      paused = false;
      begin(newState(ctx.level));
      ctx.changed({ reset: true });
    }
    const newState = (level) => P.newLevel(level, Math.random, { players: mode === 'solo' ? 1 : 2, cpu: mode === 'cpu' });

    /* ---------- rete (contratto HH.mp v1) ---------- */
    function leaveNet() {
      if (!net) return;
      const n = net; net = null; pred = null;
      try { n.sess.stop(); } catch (e) { /* già fermo */ }
      try { n.link.close(); } catch (e) { /* già chiuso */ }
      status('');
    }
    async function startLan() {
      leaveNet();
      stop();
      status(L('st_lan_wait'));
      let link = null;
      try { link = await HH.mp.pair({ game: 'street', players: 2, title: 'Hari Snack Street' }); } catch (e) { link = null; }
      status('');
      if (!link) { paused = false; if (s && !P.isOver(s)) start(); else begin(newState(ctx.level)); return; }
      mode = 'lan';
      renderPad(); measure();
      const role = link.role;
      const ev = [];             // eventi da inoltrare all'ospite
      const sess = HH.mp.session(link, {
        tick: 60, sendEvery: 3,
        step(dt, inputs) {
          if (paused || !s || P.isOver(s)) return;
          const e2 = P.step(s, dt, [inputs[0], inputs[1] || null]);
          e2.forEach(onEvent);
          for (const x of e2) if (x.type !== 'toss' && x.type !== 'hit') ev.push(x);
        },
        snapshot: () => P.view(s),
        apply(snap, alpha, prev) { guestApply(snap, alpha, prev); },
        predict(dt, inp) { guestPredict(dt, inp); },
      });
      net = { link, sess, role, ev };
      net.flush = () => { if (ev.length) { sess.event({ k: 'ev', list: ev.splice(0) }); } };
      sess.on('event', (m) => {
        if (!m) return;
        if (m.k === 'ev' && role === 'guest') m.list.forEach(onEvent);
        else if (m.k === 'pause') { if (m.on) pause(true); else resume(true); }
      });
      link.on('close', () => {
        if (!net || net.link !== link) return;
        const was = net.role;
        net = null; pred = null;
        status('');
        say(L('st_lan_left'), 'small', 2600);
        if (was === 'host' && s) { P.setCpu(s, 1, true); mode = 'cpu'; renderPad(); }
        else { mode = 'cpu'; renderPad(); begin(newState(ctx.level)); ctx.changed({ reset: true }); }
      });
      if (role === 'host') {
        s = P.newLevel(ctx.level, Math.random, { players: 2, cpu: false });
        s.players[1].cpu = 0;
        v = s;
        build(); paused = false;
        ctx.changed({ reset: true });
      } else {
        s = null; v = null; pred = null; paused = false;
        build();
        say(L('st_lan_guest'), 'small', 1800);
      }
      sess.start();
      start();
    }
    // ospite: interpolazione tra le ultime due viste dell'host, il proprio personaggio è predetto in locale
    function guestApply(B, alpha, Aw) {
      const a = Aw || B;
      const lerp = (x, y) => x + (y - x) * alpha;
      const byId = (arr) => { const m = new Map(); for (const o of arr || []) m.set(o.id, o); return m; };
      const am = byId(a.animals), sm = byId(a.shots), mm = byId(a.melons);
      const nv = Object.assign({}, B, {
        cam: lerp(a.cam, B.cam),
        players: B.players.map((p, i) => { const q = a.players[i] || p; return Object.assign({}, p, { x: lerp(q.x, p.x), y: lerp(q.y, p.y), z: lerp(q.z, p.z) }); }),
        animals: B.animals.map((o) => { const q = am.get(o.id); return q ? Object.assign({}, o, { x: lerp(q.x, o.x), y: lerp(q.y, o.y), z: lerp(q.z, o.z) }) : o; }),
        shots: B.shots.map((o) => { const q = sm.get(o.id); return q ? Object.assign({}, o, { x: lerp(q.x, o.x) }) : o; }),
        melons: B.melons.map((o) => { const q = mm.get(o.id); return q ? Object.assign({}, o, { x: lerp(q.x, o.x) }) : o; }),
        boss: B.boss && a.boss ? Object.assign({}, B.boss, { x: lerp(a.boss.x, B.boss.x), y: lerp(a.boss.y, B.boss.y), z: lerp(a.boss.z || 0, B.boss.z || 0) }) : B.boss,
      });
      const first = !v;
      const themeChanged = !v || v.theme !== nv.theme || v.bossK !== nv.bossK;
      v = nv;
      if (first) { build(); }
      if (themeChanged) { wrap.className = wrap.className.replace(/st-(market|city|port|fair|train)/, '') + ' st-' + v.theme; themeKey = ''; theme(true); measure(); }
      // correzione dolce della predizione verso la posizione vera
      const me = B.players[1];
      if (me) {
        if (!pred || Math.hypot(pred.x - me.x, pred.y - me.y) > 1.2 || me.st === 'nap' || me.st === 'grab') pred = { x: me.x, y: me.y };
        else { pred.x += (me.x - pred.x) * 0.12; pred.y += (me.y - pred.y) * 0.12; }
      }
    }
    function guestPredict(dt, inp) {
      if (!v || !pred || !inp) return;
      const me = v.players[1];
      if (!me || me.st === 'nap' || me.st === 'hurt' || me.st === 'grab') return;
      const Cc = P.CH[me.ch], busy = me.st === 'feed' || me.st === 'special' ? 0.25 : 1;
      pred.x = Math.max(v.cam + 0.35, Math.min(v.cam + P.VIEW - 0.35, pred.x + (inp.mx || 0) * Cc.vx * busy * dt));
      pred.y = Math.max(0, Math.min(P.DEPTH, pred.y + (inp.my || 0) * Cc.vy * busy * dt));
    }

    /* ---------- ciclo ---------- */
    function loop(now) {
      if (!el.isConnected) { detach(); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (now - themeAt > 1000) { themeAt = now; theme(false); }
      if (shake > 0) shake = Math.max(0, shake - dt * 2.5);
      if (net) {
        net.sess.setInput(inputOf(net.role === 'guest' ? 1 : 0));
        if (!paused) net.sess.frame(now);
        if (net && net.flush) net.flush();
        if (net && net.role === 'host' && s) { v = s; changed(false); }
      } else if (s && !paused && dt > 0 && !P.isOver(s)) {
        const inputs = mode === 'local' ? [inputOf(0), inputOf(1)] : [inputOf(0), null];
        const ev = P.step(s, dt, inputs);
        v = s;
        ev.forEach(onEvent);
        changed(false);
      }
      if (v) {
        const sp = v.players.map((p) => p.sp >= 1);
        padEl.querySelectorAll('.st-b.sp').forEach((b) => { const pi = localIndex(+b.dataset.p); b.classList.toggle('ready', !!sp[pi]); });
      }
      draw(now);
      const live = net || (!paused && s && (!P.isOver(s) || (party && now - party < 1800) || (over && now - over < 1400)));
      raf = live ? requestAnimationFrame(loop) : 0;
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function pause(remote) {
      if (paused || (s && P.isOver(s))) return;
      paused = true;
      pauseEl.hidden = false; pauseBtn.innerHTML = IC.play;
      pads.forEach((pd) => { pd.keys = {}; pd.sx = 0; pd.sy = 0; });
      if (net && !remote) net.sess.event({ k: 'pause', on: 1 });
      if (!net) stop();
      draw(performance.now());
      ctx.changed();
    }
    function resume(remote) {
      if (!paused || (s && P.isOver(s))) return;
      if (!modesEl.hidden) return;
      paused = false;
      pauseEl.hidden = true; pauseBtn.innerHTML = IC.pause;
      if (s && s.ready <= 0) s.ready = 0.8;
      if (net && !remote) net.sess.event({ k: 'pause', on: 0 });
      sfx('set');
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    function onVis() { if (!el.isConnected) { detach(); return; } if (document.hidden && !net) pause(); }
    function onResize() { measure(); draw(performance.now()); }
    function onFull() {
      try { const so = G.screen && G.screen.orientation; if (fsEl() && fsEl().contains(wrap) && so && so.lock) so.lock('landscape').catch(() => {}); } catch (e) { /* non supportato */ }
      later(() => { measure(); draw(performance.now()); }, 120);
    }
    function onBlur() { pads.forEach((pd) => { pd.keys = {}; }); }
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function onTheme() { themeAt = 0; }
    function detach() {
      stop();
      leaveNet();
      G.removeEventListener('keydown', onKey); G.removeEventListener('keyup', onKeyUp); G.removeEventListener('blur', onBlur); G.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((x) => document.removeEventListener(x, onFull));
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._stRO) { el._stRO.disconnect(); el._stRO = null; }
      clearInterval(watch);
      clearTimers();
    }
    if (el._stDetach) el._stDetach();
    el._stDetach = detach;
    G.addEventListener('keydown', onKey); G.addEventListener('keyup', onKeyUp); G.addEventListener('blur', onBlur); G.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((x) => document.addEventListener(x, onFull));
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);
    const watch = setInterval(() => { if (!el.isConnected) detach(); }, 1500);

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop(); clearTimers();
      s = state; v = s;
      parts = []; floats = []; newQ = []; newBusy = 0; over = 0; party = 0;
      mode = s.np === 1 ? 'solo' : s.players[1].cpu ? 'cpu' : mode === 'lan' ? 'cpu' : 'local';
      if (s.np === 2 && mode === 'cpu') s.players[1].cpu = 1;
      build();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; pauseBtn.innerHTML = IC.play; later(() => draw(performance.now()), 150); return; }
      paused = false;
      say(L('pa_ready'), '', 1100); sfx('blip');
      start();
      later(() => { if (!raf) draw(performance.now()); }, 150);
    }
    function fresh() {
      if (net && net.role === 'guest') return;                      // l'ospite segue la partita dell'host
      if (net && net.role === 'host') { s = P.newLevel(ctx.level, Math.random, { players: 2 }); v = s; build(); ctx.changed({ reset: true }); start(); return; }
      begin(newState(ctx.level));
      ctx.changed({ reset: true });
      if (!sget('street:picked', 0)) { sset('street:picked', 1); later(showModes, 400); }
    }

    // per i controlli di qualità (Playwright): stato, avanti veloce con i bot della CPU, modalità
    el._street = {
      state: () => s, view: () => v, mode: () => mode, paused: () => paused, pred: () => pred, net: () => (net ? { role: net.role } : null), pick: pickMode, lan: startLan,
      ff(sec) { if (!s) return []; const out = []; const was = s.players.map((p) => p.cpu); s.players.forEach((p) => { p.cpu = 1; }); for (let t = 0; t < sec && !P.isOver(s); t += P.TICK) out.push(...P.step(s, P.TICK, [null, null])); s.players.forEach((p, i) => { p.cpu = was[i]; }); out.forEach(onEvent); if (net && net.role === 'host') net.ev.push(...out.filter((x) => x.type !== 'toss' && x.type !== 'hit')); v = s; draw(performance.now()); return out.map((e) => e.type); },
      draw: () => draw(performance.now()), modes: showModes, input: inputOf,
    };

    const ok = saved && saved.v === 1 && !saved.view && Array.isArray(saved.players) && saved.level > 0 && Array.isArray(saved.waves);
    if (ok && !P.isOver(saved)) begin(Object.assign({}, saved), true);
    else fresh();

    return {
      fresh,
      restart() { if (net && net.role === 'guest') return; if (net) { fresh(); return; } begin(newState(s ? s.level : ctx.level)); ctx.changed({ reset: true }); },
      undo() { toggle(); },
      pause() { pause(); },
      resume() { resume(); },
      // l'ospite salva solo i numeri della vista (non riprendibile: alla riapertura si riparte in locale)
      snapshot: () => (net && net.role === 'guest' ? Object.assign({}, v || { v: 1, view: 1, oops: 0, mistakes: 0, moves: 0, waveN: 3, bossNeed: 60, prog: 0 }) : s),
    };
  }

  /* ---------- tutorial e card ---------- */
  const at = A.at;
  const TUT = [
    { key: 'tu_street_1', en: 'Walk along the street with the stick or the arrows. Hungry animals arrive: tap Feed (Z) close up to give them a snack. When their tummy is full they sit happily and go home!',
      art: A.street(`<g class="st-tut-walk">${at(A.hari({ arm: 1 }), 22, 40, 34)}</g>${at(A.animal('bunny', { mood: 'open' }), 60, 42, 30, true)}`) },
    { key: 'tu_street_2', en: 'Toss (X) to feed from afar: magpies catch snacks in the air, but raccoons snatch them, so feed raccoons up close. Little boars charge in a line: step aside!',
      art: A.street(`${at(A.kiki({ arm: 2 }), 14, 42, 32)}<g class="st-tut-pop"><svg x="44" y="40" width="10" height="10" viewBox="0 0 100 100">${A.SNACK.acorn}</svg></g>${at(A.animal('magpie', {}), 66, 20, 26, true)}${at(A.animal('boar', {}), 78, 48, 30, true)}`) },
    { key: 'tu_street_3', en: 'Three bites in a row make an animal dizzy: walk into it and Feed again for a whole basket. Fill the bar with snacks and use the Special (V): Hari drops a giant cake, Kiki a fruit rain!',
      art: A.street(`${at(A.hari({ arm: 3, mood: 'joy' }), 14, 40, 34)}<g class="st-tut-pop"><svg x="46" y="30" width="34" height="34" viewBox="0 0 100 100">${A.SNACK.cake}</svg></g>${at(A.animal('bear', { mood: 'dizzy' }), 76, 40, 32, true)}`) },
    { key: 'tu_street_4', en: 'At the end comes a big eater: jump (C) over the rolling melons and the stomp wave, or toss at a melon to stop it. If a hungry animal nibbles your snack you lose energy. Play with Kiki as a CPU friend or with someone else, on one device or on the same Wi-Fi!',
      art: A.street(`<g class="st-tut-jump">${at(A.hari({ arm: 3, fr: 1 }), 16, 34, 32)}</g><svg x="44" y="56" width="16" height="16" viewBox="0 0 100 100">${A.SNACK.melon}</svg>${at(A.boss('bear', { mood: 'open' }), 64, 22, 52, true)}`) },
  ];
  const RULES_EN = 'Side-scrolling street adventure with Hari and Kiki the squirrel: hungry animals block the way and you "fight" by feeding them! Tap close up, toss from afar, jump, grab a dizzy one for a whole basket and charge a special. Every animal has its own trick, and at the end a big eater rolls melons. Play alone, with a CPU friend or with two players.';
  HH.games.push({
    id: 'street', name: 'Hari Snack Street', rules: 'r20', rulesEn: RULES_EN,
    art: A.card, create, lives: 3,
    tutorial: TUT,
    rate: (s) => HH.street.rate(s),
    parTime: (s) => HH.street.parTime(s),
    progress: (s) => HH.street.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
