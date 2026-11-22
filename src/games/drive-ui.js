/* Hari Taxi — interfaccia.
 * Città vista dall'alto su un solo <canvas>: la parte fissa (strade, strisce, marciapiedi, tetti, parchi, alberi,
 * lampioni) è dipinta a blocchi di 8×8 caselle in canvas fuori schermo (in cache, solo quelli vicini alla camera);
 * a ogni fotogramma si aggiungono semafori, pedoni, traffico, Hari, segnalini delle fermate, effetti e la minimappa.
 * La camera segue il veicolo (con un po' di anticipo nella direzione di marcia) e non ruota: sopra è sempre nord.
 * Veicoli, animaletti e icone sono SVG in stile cel "cotti" in bitmap; i colori arrivano dai token CSS --dr-*
 * letti con getComputedStyle (tema chiaro/scuro: di notte lampioni e fari), mai scritti qui.
 * Nessuna violenza: chi viene urtato fa "bonk" o un salto spaventato con "!" e stelline, mai danni.
 *
 * Controlli: tocca e trascina ovunque sulla città = levetta (Hari va dove punti, più lontano = più veloce; lascia
 * per frenare). Tastiera: frecce/WASD (su = gas, giù = freno/retromarcia, destra/sinistra = sterzo).
 * Spazio/P/Esc o il tasto pausa = pausa; "Annulla" = pausa/riprendi. Tocca la minimappa per nasconderla.
 * Si parte al primo tocco/freccia; pausa automatica se la pagina viene nascosta; ripresa da salvataggio in pausa.
 *
 * Moduli (caricati prima, in quest'ordine nel catalogo): drive-art.js (HH.driveArt, statico) e, montati qui sotto
 * con il contesto condiviso DX (nomi stabili + getter/setter dello stato di create()): drive-city, drive-osm-paint,
 * drive-draw. Qui restano create(), stato, costruzione, selettore delle mappe, barra, eventi, ciclo e comandi.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  // testi, disegni cel (Hari, animaletti, veicoli, icone), card e tutorial: drive-art.js
  const { L, HARI, pedSVG, VEHS, CARCOL, DISH, BOXC, boxSVG, HOUSE, BAG, CLOCK, STEAM, ICON, svgIc, wrapSVG, cityArt,
    art, esc, MAPIC, PINIC, PAUSE, PLAY, TUT } = HH.driveArt;

  /* ---------- bitmap ---------- */
  // preferenza "meno movimento": letta al massimo una volta al secondo (si chiede molte volte a fotogramma)
  let rmAt = -1e9, rmVal = false;
  const reduce = () => {
    const n = Date.now();
    if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    return rmVal;
  };
  const KEYS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
  const TOKENS = ['ink', 'hi', 'grass', 'grass-2', 'path', 'pond', 'pond-2', 'road', 'road-2', 'mark', 'zebra', 'walk', 'walk-2', 'curb',
    'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'roof-shade', 'roof-edge', 'roof-hi', 'ac', 'ac-2', 'solar', 'solar-2', 'shadow',
    'tree', 'tree-2', 'tree-hi', 'trunk', 'flower', 'flower-2', 'bench', 'lamp', 'glow', 'beam', 'awning', 'awning-2', 'go', 'amber', 'stop', 'pole',
    'zone', 'zone-2', 'pin', 'pin-2', 'arrow', 'puff', 'star', 'heart', 'text', 'text-line', 'bonk', 'joy', 'joy-2', 'cold', 'steam',
    'mm', 'mm-line', 'mm-road', 'mm-bld', 'mm-park', 'dusk', 'night', 'taxi', 'scoot', 'van',
    // mappe reali
    'sea', 'sea-2', 'foam', 'sand', 'sand-2', 'field', 'field-2', 'parking', 'rail', 'rail-2', 'wood', 'wood-2', 'boat', 'boat-2', 'sail',
    'umb-1', 'umb-2', 'umb-3', 'castle', 'castle-2', 'mm-water', 'mm-sand', 'street', 'street-ink',
    'stone', 'stone-2', 'tile-1', 'tile-2', 'tile-3', 'bridge', 'bridge-2', 'papyrus', 'papyrus-2', 'duck-b', 'beak-b',
    'pizza', 'pizza-2', 'p1', 'cake-2', 'ramen', 'tape', 'check', 'bus', 'glass', 'head'];
  const OSM_ATTR = '© OpenStreetMap contributors';   // attribuzione obbligatoria (ODbL): mai tradotta
  /* mappe: "hari" = città procedurale (predefinita, progressi su 'drive'); le altre = HH.driveMapList (drive-maps.js) */
  const mapList = () => [{ id: 'hari' }].concat(HH.driveMapList || []);
  const mapMeta = (id) => mapList().find((m) => m.id === id) || null;
  const mapName = (id) => (id === 'hari' ? L('dr_map_hari') : (mapMeta(id) || {}).name || id);
  const storeGet = (k, d) => { try { return HH.store && HH.store.get ? HH.store.get(k, d) : d; } catch (e) { return d; } };
  const storeSet = (k, v) => { try { if (HH.store && HH.store.set) HH.store.set(k, v); } catch (e) { /* niente salvataggio */ } };
  const curMap = () => { const id = storeGet('drive:map', 'hari'); return mapMeta(id) ? id : 'hari'; };
  const slotOf = (id) => (id === 'hari' ? 'drive' : 'drive@' + id);
  // file dati della mappa (lazy load, una volta sola; nel file unico è già dentro)
  function loadMap(id) {
    if (id === 'hari' || (HH.driveMaps && HH.driveMaps[id])) return Promise.resolve();
    const m = mapMeta(id);
    if (!m || !HH.loadFile) return Promise.reject(new Error('map ' + id));
    return HH.loadFile(m.file).then(() => { if (!HH.driveMaps || !HH.driveMaps[id]) throw new Error('map ' + id); });
  }
  const CH = 8;              // caselle per blocco di città in cache

  function create(el, ctx, saved) {
    const P = HH.drive;
    let s, g0, raf = 0, last = 0, paused = false, party = 0, over = 0, timers = [], goTimer = 0;
    let wrap, stage, cv, g, msg, pauseEl, bar, pauseBtn, misEl, timeEl, loadEl;
    let W = 300, H = 400, dpr = 1, TS = 40, rs = 1, camX = 0, camY = 0;
    let C = {}, IMG = {}, themeKey = '', themeAt = 0, bakedAt = '', chunks = new Map(), mini = null, showMap = true;
    let joy = null, keys = {}, lastChanged = 0, parts = [], ghosts = [], routeAt = 0, routePt = null, shake = 0;
    let peekPt = null, lastBar = '', mmRect = null, sndHonk = 0, streetAt = 0, streetKey = '', budget = 0, mapsEl = null, mbtn, streetEl;
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    try { showMap = !(HH.store && HH.store.get && HH.store.get('drive:nomap')); } catch (e) { showMap = true; }

    /* ---------- costruzione ---------- */
    function build() {
      clearTimers();
      el.innerHTML = `<div class="dr-wrap" dir="ltr">
        <div class="dr-bar">
          <span class="dr-mis" role="img" aria-label="${L('dr_m_' + s.type)}"><span class="dr-ic">${svgIc(ICON[s.type])}</span><b></b></span>
          <span class="dr-time idle" role="img" aria-label="${L('dr_time')}"><span class="dr-ic"></span><span class="dr-track"><i class="dr-fill"></i></span><span class="dr-load"></span></span>
          <button class="dr-mbtn" type="button" aria-label="${L('dr_map')}: ${esc(mapName(s.mapId || 'hari'))}">${MAPIC}</button>
          <button class="dr-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button>
        </div>
        <div class="dr-stage" tabindex="0" role="application" aria-label="${L('dr_board')}">
          <canvas class="dr-cv"></canvas>
          <div class="dr-msg" aria-live="polite"></div>
          <div class="dr-pause" hidden><span class="dr-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div>
          ${P.isOsm(s) ? `<div class="dr-street" hidden>${PINIC}<span></span></div><div class="dr-osm">${OSM_ATTR}</div>` : ''}
        </div>
      </div>`;
      wrap = el.querySelector('.dr-wrap');
      stage = el.querySelector('.dr-stage');
      cv = el.querySelector('.dr-cv');
      g = cv.getContext('2d');
      msg = el.querySelector('.dr-msg');
      pauseEl = el.querySelector('.dr-pause');
      bar = el.querySelector('.dr-bar');
      pauseBtn = el.querySelector('.dr-pbtn');
      misEl = el.querySelector('.dr-mis');
      timeEl = el.querySelector('.dr-time');
      loadEl = el.querySelector('.dr-load');
      mbtn = el.querySelector('.dr-mbtn');
      streetEl = el.querySelector('.dr-street');
      streetKey = ''; mapsEl = null;
      parts = []; ghosts = []; party = 0; over = 0; lastBar = ''; routePt = null;
      g0 = P.geo(s);
      theme(true);
      measure();
      camX = s.car.x; camY = s.car.y; clampCam();
      if (G.ResizeObserver) {
        if (el._drRO) el._drRO.disconnect();
        el._drRO = new G.ResizeObserver(() => { if (Math.round(stage.clientWidth) !== Math.round(W) || Math.round(stage.clientHeight) !== Math.round(H)) { measure(); draw(performance.now()); } });
        el._drRO.observe(stage);
      }
      renderBar(true);
      draw(performance.now());
    }

    // token del tema → colori del canvas; SVG "cotti" in bitmap alla risoluzione giusta
    function theme(force) {
      const cs = G.getComputedStyle(wrap);
      const key = TOKENS.map((t) => cs.getPropertyValue('--dr-' + t).trim()).join('|');
      if (!force && key === themeKey) return;
      themeKey = key;
      C = {};
      TOKENS.forEach((t) => { C[t] = cs.getPropertyValue('--dr-' + t).trim(); });
      C.night = +C.night || 0;
      chunks.clear(); mini = null; bakedAt = '';
      if (stage) bakeAll();
    }
    // token senza partita (selettore delle mappe prima di cominciare)
    function theme0() { wrap = el.querySelector('.dr-wrap'); theme(true); }
    function bakeAll() {
      const ppt = Math.round(TS * Math.min(2, dpr));
      const want = `${ppt}|${themeKey}`;
      if (want === bakedAt) return;
      bakedAt = want;
      const cs = G.getComputedStyle(wrap);
      const res = (svg) => svg.replace(/var\((--[\w-]+)\)/g, (m0, n) => cs.getPropertyValue(n).trim() || 'transparent');
      const veh = (name, kind, col) => { const V = VEHS[kind]; bake(name, res(wrapSVG(V.svg(col), V.w, V.h, Math.ceil((V.w / 100) * ppt), Math.ceil((V.h / 100) * ppt)))); };
      veh('me', s.veh);
      CARCOL.forEach((c, i) => veh(`car${i}`, 'car', c));
      veh('bus0', 'bus', 'var(--dr-bus)'); veh('bus1', 'bus', 'var(--dr-bus-3)');
      veh('bike', 'bike');
      const sq = (name, inner, k = 0.7) => bake(name, res(wrapSVG(inner, 100, 100, Math.ceil(ppt * k), Math.ceil(ppt * k))));
      sq('hari', HARI(s.veh, ''), 0.8); sq('hariO', HARI(s.veh, 'oops'), 0.8); sq('hariJ', HARI(s.veh, 'joy'), 0.8);
      P.PEDS.forEach((k, i) => { sq(`p${i}a`, pedSVG(k, i, 0, '')); sq(`p${i}b`, pedSVG(k, i, 1, '')); sq(`p${i}o`, pedSVG(k, i, 1, 'oops')); sq(`p${i}j`, pedSVG(k, i, 0, 'joy')); });
      P.DISHES.forEach((k) => sq(`d_${k}`, DISH[k], 0.6));
      BOXC.forEach((c, i) => sq(`box${i}`, boxSVG(c), 0.5));
      sq('house', HOUSE, 0.6); sq('bag', BAG, 0.6); sq('clock', CLOCK, 0.5);
    }
    function bake(name, svg) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = im.width || 64; c.height = im.height || 64;
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        IMG[name] = c;
      };
      im.onerror = () => { if (G.console) G.console.warn('drive: sprite non valido', name); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function measure() {
      W = stage.clientWidth || 300; H = stage.clientHeight || 400;
      dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      // mappe reali: un filo più di città sullo schermo (le vie vere sono più lunghe e curve)
      const nt = P.isOsm(s) ? Math.max(30, Math.min(50, Math.round(Math.min(W, H * 0.95) / 11))) : Math.max(34, Math.min(58, Math.round(Math.min(W, H * 0.95) / 8.2)));
      if (nt !== TS) { TS = nt; chunks.clear(); }
      rs = Math.min(dpr, 1.5);
      bakeAll();
      clampCam();
    }
    function clampCam() {
      const hw = W / 2 / TS, hh = H / 2 / TS;
      camX = s.W > hw * 2 ? Math.max(hw, Math.min(s.W - hw, camX)) : s.W / 2;
      camY = s.H > hh * 2 ? Math.max(hh, Math.min(s.H - hh, camY)) : s.H / 2;
    }

    let OS = null;
    /* ---------- selettore delle mappe ---------- */
    function previewCanvas(m) {
      const cv2 = document.createElement('canvas'), pv = m.preview, k = 3;
      cv2.width = pv.w * k; cv2.height = pv.h * k;
      const b = cv2.getContext('2d'), A = P.AR;
      const col = { [A.LAND]: C['mm-bld'], [A.PARK]: C['grass-2'], [A.FIELD]: C.field, [A.SAND]: C.sand, [A.WATER]: C.sea, [A.PLAZA]: C.walk, [A.PIER]: C.wood, [A.PARKING]: C.parking, [A.RAIL]: C.rail, 9: C.road };
      const bytes = G.atob ? G.atob(pv.rle) : '';
      let i = 0, n = 0;
      const u = () => { let v = 0, mm = 1, ch; do { ch = bytes.charCodeAt(i++); v += (ch & 127) * mm; mm *= 128; } while (ch & 128); return v; };
      while (i < bytes.length && n < pv.w * pv.h) { const v = u(), c = v % 16, len = Math.floor(v / 16); b.fillStyle = col[c] || C.grass; for (let q = 0; q < len; q++, n++) b.fillRect((n % pv.w) * k, Math.floor(n / pv.w) * k, k, k); }
      return cv2;
    }
    function showMaps(first, err) {
      if (mapsEl) mapsEl.remove();
      const stageEl = el.querySelector('.dr-stage') || el;
      const cur = s ? s.mapId || 'hari' : curMap();
      mapsEl = document.createElement('div');
      mapsEl.className = 'dr-maps';
      mapsEl.setAttribute('role', 'dialog');
      mapsEl.setAttribute('aria-label', L('dr_maps'));
      mapsEl.innerHTML = `<div class="dr-maps-box">
        <div class="dr-maps-head"><b>${L('dr_maps')}</b>${first ? '' : `<button class="dr-maps-x" type="button" aria-label="${L('er_close')}">✕</button>`}</div>
        ${err ? `<p class="dr-maps-err">${L('dr_map_err')}</p>` : ''}
        <div class="dr-maps-list">${mapList().map((m) => {
          const lv = HH.progress && HH.progress.get ? HH.progress.get(slotOf(m.id)).level : 1;
          return `<button class="dr-map-card${m.id === cur ? ' on' : ''}" type="button" data-map="${m.id}">
            <span class="dr-map-art">${m.id === 'hari' ? cityArt('') : ''}</span>
            <b>${esc(mapName(m.id))}</b><small>${L('level')} ${lv}</small>${m.id === 'hari' ? '' : `<i>${(m.W * m.m / 1000).toFixed(1)}×${(m.H * m.m / 1000).toFixed(1)} km</i>`}</button>`;
        }).join('')}</div>
        <p class="dr-maps-osm">${L('dr_map_real')} · ${OSM_ATTR}</p></div>`;
      mapList().forEach((m) => { if (m.id !== 'hari' && m.preview) mapsEl.querySelector(`[data-map="${m.id}"] .dr-map-art`).appendChild(previewCanvas(m)); });
      stageEl.appendChild(mapsEl);
      const x = mapsEl.querySelector('.dr-maps-x');
      if (x) x.onclick = (e) => { e.stopPropagation(); sfx('tap'); mapsEl.remove(); mapsEl = null; };
      mapsEl.onpointerdown = (e) => e.stopPropagation();
      mapsEl.querySelectorAll('[data-map]').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); sfx('tap'); pickMap(bt.dataset.map, first); }; });
      const on = mapsEl.querySelector('.dr-map-card.on') || mapsEl.querySelector('.dr-map-card');
      if (on) on.focus({ preventScroll: true });
    }
    function pickMap(id, first) {
      storeSet('drive:mapSeen', 1);
      const was = s ? s.mapId || 'hari' : null;
      if (mapsEl) { mapsEl.remove(); mapsEl = null; }
      if (was === id) { if (paused) resume(); return; }
      // un'altra mappa = altri livelli e altra partita: l'app salva questa e riapre il gioco sulla nuova
      if (ctx.reslot && slotOf(id) !== slotOf(curMap())) { ctx.reslot(() => storeSet('drive:map', id)); return; }
      storeSet('drive:map', id);
      startMap(id, null);
    }
    function loadingView(on) {
      let lv = el.querySelector('.dr-loadmap');
      if (!on) { if (lv) lv.remove(); return; }
      if (!lv) {
        lv = document.createElement('div'); lv.className = 'dr-loadmap';
        lv.innerHTML = `${svgIc(HARI('taxi', 'joy'))}<span>${L('dr_loading')}</span>`;
        (el.querySelector('.dr-stage') || el).appendChild(lv);
      }
    }
    // avvia la mappa id (scaricandone i dati se serve) con lo stato salvato oppure un livello nuovo
    function startMap(id, st, held = false) {
      if (id !== 'hari' && !(HH.driveMaps && HH.driveMaps[id])) {
        if (!el.querySelector('.dr-wrap')) el.innerHTML = '<div class="dr-wrap" dir="ltr"><div class="dr-stage"></div></div>';
        loadingView(true);
        loadMap(id).then(() => { loadingView(false); startMap(id, st); }).catch(() => {
          loadingView(false);
          storeSet('drive:map', 'hari');
          showMaps(true, true);
        });
        return;
      }
      if (st && (st.mapId || 'hari') === id && okSaved(st)) begin(Object.assign({}, st), true);
      else { begin(P.newLevel(ctx.level, Math.random, id), held); ctx.changed({ reset: true }); }
    }
    function drawJoy() {
      if (!joy) return;
      const R = joyR(), dx = joy.x - joy.x0, dy = joy.y - joy.y0, d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
      g.fillStyle = C.joy; g.strokeStyle = C['joy-2']; g.lineWidth = 2.5;
      g.beginPath(); g.arc(joy.x0, joy.y0, R, 0, 7); g.fill(); g.stroke();
      g.fillStyle = C['joy-2']; g.beginPath(); g.arc(joy.x0 + dx * k, joy.y0 + dy * k, R * 0.42, 0, 7); g.fill();
    }
    const joyR = () => Math.max(38, Math.min(60, W * 0.13));

    /* ---------- barra ---------- */
    function renderBar(force) {
      const tr = s.trip, ride = tr && tr.st === 'ride' ? tr.items : [];
      const live = ride.filter((i) => i.st === 1);
      const tmin = live.length ? Math.min(...live.map((i) => i.t)) : 0, lim = live.length ? live[0].lim : 1;
      const p = live.length ? Math.max(0, Math.min(1, tmin / lim)) : 0;
      const key = `${s.done}/${s.N}|${live.length}|${ride.map((i) => i.st).join('')}|${Math.round(p * 120)}`;
      if (!force && key === lastBar) return;
      const prevDone = lastBar.split('/')[0];
      lastBar = key;
      misEl.querySelector('b').textContent = `${s.done}/${s.N}`;
      if (prevDone !== '' && +prevDone !== s.done) { misEl.classList.remove('up'); void misEl.offsetWidth; misEl.classList.add('up'); }
      timeEl.classList.toggle('idle', !live.length);
      timeEl.classList.toggle('low', live.length > 0 && p < 0.25);
      timeEl.querySelector('.dr-fill').style.width = `${p * 100}%`;
      const ic = !live.length ? (s.type === 'taxi' ? pedSVG(P.PEDS[tr ? tr.items[0].who : 0], tr ? tr.items[0].who : 0, 0, '') : s.type === 'food' ? BAG : boxSVG('var(--dr-p1)')) : s.type === 'food' ? STEAM : CLOCK;
      const icKey = live.length ? 'live' : `idle${tr ? tr.id : 0}`;
      const icEl = timeEl.querySelector('.dr-ic');
      if (icEl.dataset.k !== icKey) { icEl.dataset.k = icKey; icEl.innerHTML = svgIc(ic); }
      // pacchi/ordini a bordo
      const items = tr ? tr.items : [];
      const lk = items.length > 1 ? items.map((i) => `${i.who}${i.st}`).join(',') : '';
      if (loadEl.dataset.k !== lk) {
        loadEl.dataset.k = lk;
        loadEl.innerHTML = items.length > 1 ? items.map((i) => `<i class="${i.st >= 2 ? 'done' : ''}">${svgIc(s.type === 'parcel' ? boxSVG(BOXC[i.who % 4]) : DISH[P.DISHES[i.who]])}</i>`).join('') : '';
      }
    }
    function say(text, cls = '', ms = 900) {
      msg.innerHTML = `<b class="${cls}">${text}</b>`;
      msg.classList.remove('show'); void msg.offsetWidth; msg.classList.add('show');
      clearTimeout(goTimer);
      goTimer = later(() => { msg.classList.remove('show'); }, ms);
    }
    function ready() {
      msg.innerHTML = `<b class="ready">${L('pa_ready')}</b>`;
      msg.classList.remove('show'); void msg.offsetWidth; msg.classList.add('show');
      clearTimeout(goTimer);
      ctx.sfx.blip();
    }
    function changed(force) {
      const now = performance.now();
      if (!force && now - lastChanged < 900) return;
      lastChanged = now;
      ctx.changed();
    }
    const sfx = (k, ...a) => { if (ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };

    /* ---------- eventi della logica ---------- */
    function onEvent(e, t) {
      const c = s.car;
      switch (e.type) {
        case 'go': {
          say(L('pa_go'), 'go', 650); sfx('milestone');
          if (s.t < 0.5) later(() => { if (!paused && !P.isOver(s)) say(L('dr_m_' + s.type), 'mission', 2200); }, 700);
          if (s.wait) later(() => { if (s.wait && !paused) say(L('dr_start'), 'hint', 2600); }, 3000);
          break;
        }
        case 'pickup': {
          const tr = s.trip, p = g0.spots[tr.p];
          if (s.type === 'taxi') ghosts.push({ name: `p${tr.items[0].who}j`, x0: p.x, y0: p.y - 0.28, x1: c.x, y1: c.y - 0.2, arc: 0.6, t0: t, dur: 0.45, size: 0.8 });
          else tr.items.forEach((it, i) => ghosts.push({ name: s.type === 'food' ? 'bag' : `box${it.who}`, x0: p.x, y0: p.y - 0.15, x1: c.x, y1: c.y, arc: 0.7, t0: t + i * 0.08, dur: 0.45, size: 0.5 }));
          hearts(p.x, p.y - 0.6, 2); sfx('place');
          renderBar(true); changed(true);
          break;
        }
        case 'drop': {
          const name = s.type === 'taxi' ? `p${e.who}j` : s.type === 'food' ? `d_${P.DISHES[e.who]}` : `box${e.who}`;
          ghosts.push({ name, x0: c.x, y0: c.y - 0.2, x1: e.x, y1: e.y - 0.3, arc: 0.7, t0: t, dur: 0.5, size: s.type === 'taxi' ? 0.8 : 0.5 });
          later(() => { hearts(e.x, e.y - 0.7, 3); stars(e.x, e.y - 0.5, 6, C.star); }, 450);
          float(L('dr_thanks'), e.x, e.y - 1.1, C.star, 20, 1.3);
          sfx('cupDone'); if (ctx.react) ctx.react('happy');
          renderBar(true); changed(true);
          break;
        }
        case 'expire': {
          // consegna scaduta: il passeggero scende imbronciato / il cibo si è raffreddato
          if (s.type === 'taxi') ghosts.push({ name: `p${e.who}o`, x0: c.x, y0: c.y - 0.2, x1: c.x + 0.6, y1: c.y - 0.9, arc: 0.4, t0: t, dur: 0.8, size: 0.7 });
          else { puff(c.x, c.y - 0.3, 7, 0.9); stars(c.x, c.y - 0.4, 5, C.cold); }
          float(L('dr_late'), c.x, c.y - 1, C.cold, 22, 1.3);
          ctx.mistake(e.left);
          renderBar(true); changed(true);
          break;
        }
        case 'crash': {
          if (e.what === 'car') { cloud(e.x, e.y - 0.15); stars(e.x, e.y, 7); sfx('boing'); }
          else { stars(e.x, e.y - 0.4, 7); puff(e.x, e.y, 5, 0.6); }
          shake = 0.35;
          if (!reduce()) { stage.classList.remove('wobble'); void stage.offsetWidth; stage.classList.add('wobble'); }
          ctx.mistake(e.left);
          changed(true);
          break;
        }
        case 'bonk': cloud(e.x, e.y - 0.1); sfx('boing'); break;
        case 'shoo': stars(e.x, e.y - 0.4, 4); sfx('tap'); break;
        case 'bump': puff(e.x, e.y, 4, 0.5); sfx('set'); break;
        case 'honk': if (t - sndHonk > 2.5) { sndHonk = t; sfx('honk'); } break;
        case 'trip': renderBar(true); break;
        case 'lose': over = performance.now(); break;
        case 'win': {
          party = performance.now();
          for (let i = 0; i < 4; i++) later(() => { hearts(s.car.x + (Math.random() - 0.5), s.car.y - 0.6, 3); stars(s.car.x, s.car.y - 0.4, 6, C.star); }, i * 200);
          sfx('cupDone');
          renderBar(true);
          ctx.changed();
          later(() => ctx.win(), 1400);
          break;
        }
        default: break;
      }
    }

    // DX: contesto condiviso coi moduli drive-city.js, drive-osm-paint.js, drive-draw.js
    const DX = { VEHS, CARCOL, reduce, CH, P, chunks, IMG, drawJoy,
      // stato che cambia: getter (e setter dove un modulo lo assegna)
      get g0() { return g0; }, get s() { return s; }, get paused() { return paused; }, get party() { return party; }, get g() { return g; },
      get TS() { return TS; }, get rs() { return rs; }, get W() { return W; }, get camX() { return camX; }, get camY() { return camY; },
      get H() { return H; }, get dpr() { return dpr; }, get C() { return C; }, get mini() { return mini; }, set mini(v) { mini = v; },
      get showMap() { return showMap; }, get shake() { return shake; }, get ghosts() { return ghosts; }, set ghosts(v) { ghosts = v; },
      get routeAt() { return routeAt; }, set routeAt(v) { routeAt = v; }, get routePt() { return routePt; }, set routePt(v) { routePt = v; },
      get parts() { return parts; }, set parts(v) { parts = v; }, get budget() { return budget; }, set budget(v) { budget = v; },
      get mmRect() { return mmRect; }, set mmRect(v) { mmRect = v; }, get streetEl() { return streetEl; },
      get streetAt() { return streetAt; }, set streetAt(v) { streetAt = v; },
      get streetKey() { return streetKey; }, set streetKey(v) { streetKey = v; }, get OS() { return OS; }, set OS(v) { OS = v; } };
    // città procedurale: blocchi in cache, isolati, tetti, parchi, insegne: drive-city.js
    const { hash, chunk, rrect, tree } = Object.assign(DX, HH.driveCity(DX));
    // mappe reali (OpenStreetMap) dipinte in stile kawaii: drive-osm-paint.js
    const { osmPrep, edgesIn, paintOsm, drawSea, drawLabels, drawLightsO, paintMiniOsm } = Object.assign(DX, HH.driveOsmPaint(DX));
    // disegno a ogni fotogramma, minimappa e particelle: drive-draw.js
    const { toS, world, screen, draw, rr, updateStreet, puff, stars, hearts, float, cloud } = Object.assign(DX, HH.driveDraw(DX));

    /* ---------- ciclo ---------- */
    function input() {
      const k = keys;
      if (k.u || k.d || k.l || k.r) return { steer: (k.r ? 1 : 0) - (k.l ? 1 : 0), gas: (k.u ? 1 : 0) - (k.d ? 1 : 0) };
      if (joy) {
        const R = joyR(), dx = (joy.x - joy.x0) / R, dy = (joy.y - joy.y0) / R, m = Math.hypot(dx, dy);
        if (m < 0.2) return { ax: 0, ay: 0 };
        return { ax: dx / Math.max(1, m), ay: dy / Math.max(1, m) };
      }
      return null;
    }
    function loop(now) {
      if (!el.isConnected) { stop(); detach(); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const t = now / 1000;
      if (now - themeAt > 1000) { themeAt = now; theme(false); }   // tema cambiato dal sistema: controllo leggero, 1 volta al secondo
      if (!paused && dt > 0 && !P.isOver(s)) {
        const ev = P.step(s, dt, input());
        ev.forEach((e) => onEvent(e, t));
        renderBar(false);
        changed(false);
      }
      if (shake > 0) shake = Math.max(0, shake - dt);
      // camera: segue il veicolo con un po' di anticipo
      const c = s.car, lead = Math.min(2.2, Math.abs(c.v) * 0.45) * Math.sign(c.v || 1);
      const tx = peekPt ? peekPt.x : c.x + Math.cos(c.a) * lead, ty = peekPt ? peekPt.y : c.y + Math.sin(c.a) * lead, k = dt > 0 ? 1 - Math.exp(-dt * 5) : 1;
      camX += (tx - camX) * k; camY += (ty - camY) * k;
      clampCam();
      draw(now);
      if (streetEl) updateStreet(now);
      const live = !paused && (!P.isOver(s) || (party && now - party < 1600) || (over && now - over < 1200));
      raf = live ? requestAnimationFrame(loop) : 0;
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function pause() {
      if (paused || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = false;
      pauseBtn.innerHTML = PLAY;
      joy = null; keys = {};
      stop();
      draw(performance.now());
      ctx.changed();
    }
    function resume() {
      if (!paused || P.isOver(s)) return;
      paused = false;
      pauseEl.hidden = true;
      pauseBtn.innerHTML = PAUSE;
      // un attimo per rimettere il dito sulla città
      if (s.ready <= 0) s.ready = P.READY * 0.7;
      s.wait = true; s.inp = null;
      ready();
      sfx('set');
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    /* ---------- controlli ---------- */
    const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.onpointerdown = (e) => {
      if (e.target.closest('.dr-pbtn')) { e.preventDefault(); toggle(); return; }
      if (e.target.closest('.dr-mbtn')) { e.preventDefault(); if (!paused && !P.isOver(s)) pause(); sfx('tap'); showMaps(false); return; }
      if (e.target.closest('.dr-maps')) return;
      if (!e.target.closest('.dr-stage')) return;
      e.preventDefault();
      if (paused) { resume(); return; }
      if (P.isOver(s)) return;
      const [x, y] = local(e);
      if (mmRect && x >= mmRect.x - 4 && x <= mmRect.x + mmRect.w + 4 && y >= mmRect.y - 4 && y <= mmRect.y + mmRect.h + 4) {
        showMap = !showMap;
        try { if (HH.store && HH.store.set) HH.store.set('drive:nomap', !showMap); } catch (err) { /* niente salvataggio */ }
        sfx('tap'); draw(performance.now());
        return;
      }
      joy = { id: e.pointerId, x0: x, y0: y, x, y };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ }
      if (!raf) draw(performance.now());
    };
    el.onpointermove = (e) => {
      if (!joy || e.pointerId !== joy.id) return;
      const [x, y] = local(e);
      joy.x = x; joy.y = y;
      // la levetta "insegue" il dito se va troppo lontano: tornare indietro risponde subito
      const R = joyR(), dx = x - joy.x0, dy = y - joy.y0, d = Math.hypot(dx, dy);
      if (d > R * 1.6) { joy.x0 = x - (dx / d) * R * 1.6; joy.y0 = y - (dy / d) * R * 1.6; }
    };
    el.onpointerup = el.onpointercancel = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
    el.oncontextmenu = (e) => { if (e.target.closest('.dr-stage')) e.preventDefault(); };

    function onKey(e) {
      if (!el.isConnected) { detach(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key in KEYS) {
        e.preventDefault();
        if (P.isOver(s)) return;
        if (paused) { resume(); return; }
        keys[KEYS[e.key]] = true;
        return;
      }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (e.key === ' ' && e.target && e.target.closest && e.target.closest('button') && !e.target.closest('.dr-wrap')) return;
        e.preventDefault(); if (e.key === 'Escape') pause(); else toggle();
      }
    }
    function onKeyUp(e) { if (e.key in KEYS) keys[KEYS[e.key]] = false; }
    function onVis() { if (!el.isConnected) { detach(); return; } if (document.hidden) pause(); }
    function onTheme() { if (!el.isConnected) { detach(); return; } theme(false); draw(performance.now()); }
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function detach() {
      G.removeEventListener('keydown', onKey);
      G.removeEventListener('keyup', onKeyUp);
      G.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._drRO) { el._drRO.disconnect(); el._drRO = null; }
      clearTimers();
    }
    function onBlur() { keys = {}; joy = null; }
    if (el._drDetach) el._drDetach();
    el._drDetach = detach;
    G.addEventListener('keydown', onKey);
    G.addEventListener('keyup', onKeyUp);
    G.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop();
      s = state;
      s.waitMode = true; s.wait = true; s.inp = null;       // parte al primo tocco/freccia, mai da sola
      paused = false; joy = null; keys = {};
      build();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; pauseBtn.innerHTML = PLAY; later(() => draw(performance.now()), 150); later(() => draw(performance.now()), 600); return; }
      ready();
      start();
      // le bitmap si cuociono in modo asincrono: un paio di ridisegni anche da fermi
      later(() => { if (!raf) draw(performance.now()); }, 150);
    }
    function fresh() { const id = s ? s.mapId || 'hari' : curMap(); begin(P.newLevel(ctx.level, Math.random, id)); ctx.changed({ reset: true }); }
    // salvataggio valido: città di Hari con la mappa nello stato, oppure mappa reale (solo l'id) con le stesse misure
    function okSaved(st) {
      if (!st || st.v !== 1 || !Array.isArray(st.npcs) || !st.car || !(st.N > 0) || P.isOver(st)) return false;
      if (st.mapId && st.mapId !== 'hari') { const md = P.mapData(st.mapId); return !!md && md.W === st.W && md.H === st.H; }
      return typeof st.map === 'string' && st.map.length === st.W * st.H;
    }

    // per i controlli di qualità (Playwright): stato vivo della partita, geometria, scelta della mappa
    // peek(x, y): la camera guarda un punto (per le foto dei luoghi notevoli lontani dalla strada), peek() torna su Hari
    el._drive = { state: () => s, geo: () => g0, maps: () => showMaps(false), pick: (id) => pickMap(id, false), peek: (x, y) => { peekPt = x == null ? null : { x, y }; } };
    {
      // la mappa del salvataggio (i vecchi salvataggi, senza mapId, sono della città di Hari)
      const id = saved && saved.mapId ? saved.mapId : curMap();
      const first = !storeGet('drive:mapSeen', 0);
      // prima volta con le mappe: la partita (città di Hari) parte in pausa e sopra c'è il selettore, già sulla città di Hari
      startMap(id, saved, first);
      if (first) { storeSet('drive:mapSeen', 1); if (s) showMaps(true); }
    }

    return {
      fresh,
      restart() { begin(P.newLevel(s.level, Math.random, s.mapId)); ctx.changed({ reset: true }); },
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },          // usato dall'app quando si apre il tutorial
      resume() { resume(); },
      snapshot: () => s,
    };
  }
  HH.games.push({
    id: 'drive', name: 'Hari Taxi', rules: 'r13',
    rulesEn: 'Drive Hari around the city seen from above: pick up passengers with the taxi, deliver hot food by scooter and parcels by van before time runs out. Every bump into a car or an animal crossing the street costs a heart!',
    art, create, lives: 3,
    tutorial: TUT,
    // progressi e salvataggio per mappa: la città di Hari resta su 'drive' (vecchi salvataggi compresi)
    slot: () => slotOf(curMap()),
    // (s assente solo per un attimo: mappa reale ancora in download)
    rate: (s) => (s ? HH.drive.rate(s) : 0),
    parTime: (s) => (s ? HH.drive.par(s) : 0),
    progress: (s) => (s ? HH.drive.progress(s) : 0),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
