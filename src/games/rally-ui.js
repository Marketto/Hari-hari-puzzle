/* Hari Rally — interfaccia 3D (three.js r160, copia locale in src/vendor/three.min.js, scaricata solo aprendo il gioco).
 * Visuale in terza persona (predefinita, stile kart): camera a molla dietro e sopra il kart-fragola di Hari, con Hari
 * al volante (si inclina in curva, festeggia); visuale pilota a scelta (cofano a fragola, cruscotto SVG col volante e le
 * zampine). Kart a forma di frutto: fragola (Hari), pesca (Coniglietta), mandarino (Volpe), fetta d'anguria (Panda), con
 * sospensioni, foglia-spoiler che sventola, faretti la notte, ombra e LOD da lontano.
 * Ambientazioni a rotazione (bosco, città, mare, neve) di giorno, al tramonto e di notte: strade sterrate o asfaltate
 * con marciapiedi e strisce, ponti, gallerie, guardrail a imbuto, curve paraboliche, dossi; fascia fuori strada con
 * alberi, rocce, ceppi, cespugli, pini, cumuli e pupazzi (gli stessi cerchi della logica); transenne, staccionate e
 * muretti dove la logica ha i muri veri; palazzi, negozi, lampioni, spiaggia, faro, porticciolo, chalet, animaletti.
 * Cel shading: MeshToonMaterial con rampa a 3 toni e contorni "a guscio rovesciato". Colori solo dai token --ry-*
 * (getComputedStyle → THREE.Color); tema scuro = notte.
 * Collisioni coerenti con la grafica: i kart sono costruiti con P.CAR_L × P.CAR_W e messi nella posa della logica
 * (P.pose: la stessa con cui la logica risolve le collisioni nel mondo, nessuna interpolazione); ostacoli col loro
 * raggio; muri dove la logica ferma il rettangolo (P.edgeAt, P.sideAt). In visuale pilota la camera sta EYE_BACK dietro
 * il centro del kart così il bordo del cofano coincide col muso del rettangolo.
 * Prestazioni da telefono: pixel ratio ≤ 1,5 (cala da solo se gli fps scendono), nebbia, scenario a blocchi di 120 m
 * costruiti mentre ci si avvicina e nascosti da lontano, oggetti numerosi con InstancedMesh, il resto fuso in una
 * geometria per blocco (2 draw call), terreno a griglia che segue la camera.
 *
 * Comandi: pedale destro = acceleratore, pedale sinistro = freno (da fermi retromarcia), pulsante del power-up sopra
 *   l'acceleratore (tocco multiplo). Sterzo coi sensori (schermo intero, telefono girato: inclinalo come un volante),
 *   oppure frecce ◀ ▶ o trascinamento. Tastiera: ↑/W acceleratore, ↓/S freno, ←→/A-D sterzo, spazio/E/Invio power-up,
 *   C/V visuale, P/Esc pausa. In alto a destra: visuale, sensori ↔ tocco, pausa; nel menu di pausa anche
 *   l'acceleratore automatico (acceso di base solo al livello 1).
 * Pausa automatica a pagina nascosta, col tutorial e col telefono in verticale a schermo intero.
 *
 * Moduli (caricati prima, in quest'ordine nel catalogo): rally-art.js (HH.rallyArt, statico) e, montati qui sotto
 * con il contesto condiviso RX (nomi stabili + getter/setter dello stato di create()): rally-3d, rally-scenery,
 * rally-decor, rally-karts, rally-view, rally-hud, rally-duo. Qui restano create(), stato, comandi, eventi e ciclo.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  // testi, disegni SVG, card e tutorial: rally-art.js
  const { L, o, WHO, CHARS, FRUITW, CCOLW, CCOL, faceW, PU_LIST, puSvg, ACORN, arrow, ic, BIG, FLAG, PAUSE, PLAY,
    TILT, HAND, PEDAL, GAS, CAM, AUTO, DUO, PHONES, SPLIT, ZONE, PHONE, DASH, kartBackW, art, RULES_EN, TUT } = HH.rallyArt;

  /* ---------- utilità ---------- */
  let rmAt = -1e9, rmVal = false;
  const reduce = () => { const n = Date.now(); if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); } return rmVal; };
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  // tastiera: ↑/W acceleratore, ↓/S freno (e retromarcia), ←→/A-D sterzo; spazio, E o Invio power-up; C/V visuale
  const KEYS = { ArrowLeft: 'l', ArrowRight: 'r', a: 'l', d: 'r', A: 'l', D: 'r', ArrowDown: 'b', s: 'b', S: 'b', ArrowUp: 'g', w: 'g', W: 'g' };
  const USEKEYS = { ' ': 1, Enter: 1, e: 1, E: 1 };
  const fmtT = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), sec = t - m * 60; return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`; };
  const PITCH = Math.atan(0.45 / 12);   // la camera guarda appena in giù
  const COLS = ['ink', 'sky-1', 'sky-2', 'sun', 'cloud', 'hill', 'grass', 'grass-2', 'verge', 'dirt', 'dirt-2', 'dirt-3', 'wood', 'wood-2', 'water', 'water-2',
    'trunk', 'leaf-1', 'leaf-2', 'leaf-3', 'pine', 'pine-2', 'snow-cap', 'rock', 'rock-2', 'cap', 'cap-dot', 'stem', 'flower-1', 'flower-2', 'flower-3', 'bush', 'shaft',
    'chevron', 'chevron-2', 'check-1', 'check-2', 'pole', 'flag', 'car', 'car-2', 'trim', 'tire', 'glass', 'head', 'tail',
    'straw', 'straw-2', 'seed', 'kleaf', 'kleaf-2', 'peach', 'peach-2', 'mand', 'mand-2', 'melon', 'melon-w', 'melon-rind', 'melon-rind-2', 'mseed', 'chassis', 'shadow',
    'quill', 'quill-2', 'face', 'ear', 'paw', 'nose', 'hi', 'wheel',
    'bunny', 'bunny-in', 'fox', 'fox-2', 'panda', 'panda-2', 'apple', 'apple-2', 'apple-3', 'kitty', 'kitty-2', 'kitty-3', 'kitty-in', 'dust', 'leafp', 'spark', 'nsky-1', 'nsky-2', 'nsun', 'nhill',
    'gift-1', 'gift-2', 'gift-3', 'gift-4', 'ribbon', 'acorn', 'acorn-cap', 'banana', 'banana-2', 'honey', 'honey-2', 'bubble', 'petal', 'petal-2', 'carrot', 'carrot-leaf', 'spring',
    'road', 'road-2', 'paint', 'paint-2', 'curb', 'curb-2', 'walk', 'walk-2', 'plaza', 'bld-1', 'bld-2', 'bld-3', 'bld-4', 'bld-5', 'bld-6', 'roof', 'roof-2',
    'win', 'win-on', 'win-off', 'awn-1', 'awn-2', 'awn-3', 'sign', 'barrier-1', 'barrier-2', 'lamp', 'bulb', 'glow', 'tl-red', 'tl-amber', 'tl-green',
    'sand', 'sand-2', 'sea', 'sea-2', 'foam', 'cliff', 'cliff-2', 'palm', 'palm-leaf', 'umb-1', 'umb-2', 'umb-3', 'boat', 'boat-2', 'sail', 'light-1', 'light-2', 'gull',
    'snowbank', 'chalet', 'chalet-roof', 'scarf', 'fur-1', 'fur-2', 'fur-3', 'fur-4', 'stand', 'stand-2', 'flag-1', 'flag-2', 'flag-3', 'flag-4', 'eye'];
  const NUMS = ['amb', 'sunI', 'night', 'shafts', 'namb', 'nsunI', 'sunH'];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function create(el, ctx, saved) {
    const P = HH.rally, T = G.THREE;
    // la camera sta un po' dietro il centro dell'auto: il bordo del cofano (2,9 m davanti all'occhio) è il muso dell'auto
    const EYE_BACK = 2.9 - P.CAR_L / 2;
    let s = null, g = null, cfg = null, raf = 0, last = 0, paused = false, over = 0, timers = [], lastChanged = 0, alive = true;
    let wrap, stage, cv, needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pauseEl, endEl, turnEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl, optsEl, mpEl, glErr = false;
    let W = 300, H = 400, pr = 1, slowF = 0, fastF = 0;
    // tasti: KS[0] = giocatore 1, KS[1] = giocatore 2 (schermo diviso: frecce e WASD separati)
    const KS = [{}, {}];
    let keys = KS[0], ptrs = new Map(), steerV = 0, brakeOn = false, gasOn = false, hdgS = null, camRoll = 0, useQ = false, fovK = 0, shake = 0, lastDrawn = null;
    const clearKeys = () => { for (const k of KS) for (const x in k) delete k[x]; };
    /* a due giocatori: ME = kart di chi guarda (0 = Hari; 1 = l'ospite in rete o il giocatore 2 sullo schermo diviso).
     * mpMode: '' (singolo), 'split' (schermo diviso), 'host' o 'guest' (rete locale, net = controllo di HH.rallyNet).
     * Sullo schermo diviso ogni vista (views[i]) ha la sua camera, il suo terreno, i suoi indicatori e i suoi comandi:
     * inView(i, fn) scambia le variabili della vista corrente (camera a molla, sterzo, pedali, elementi HTML) e chiama fn.
     * La partita a due non si salva: solo = la gara in singolo messa da parte, che si riprende uscendo (o riaprendo). */
    let ME = 0, VI = 0, views = [], mpMode = '', net = null, solo = null, quiet = false, fno = 0, mpBusy = false;
    const sget = (k, d) => { try { const v = HH.store && HH.store.get && HH.store.get(k); return v === undefined || v === null ? d : v; } catch (e) { return d; } };
    const sset = (k, v) => { try { if (HH.store && HH.store.set) HH.store.set(k, v); } catch (e) { /* niente salvataggio */ } };
    let pref = sget('rally:ctl', 'tilt');
    // visuale: 'chase' (terza persona, predefinita) o 'pilot'; acceleratore automatico: scelta salvata, altrimenti
    // acceso solo al livello 1 (si impara prima a sterzare), spento dal 2 (si guida coi pedali)
    let camPref = sget('rally:cam', 'chase') === 'pilot' ? 'pilot' : 'chase';
    let autoPref = sget('rally:auto', null);
    const autoGas = () => (autoPref === null ? !!(cfg && cfg.autoGas) : !!autoPref);
    // camera da dietro: posizione e velocità della molla, punto guardato
    let CH = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, lx: 0, ly: 0, lz: 0, ok: false };
    const sensor = { at: 0, raw: 0, zero: 0, val: 0, asked: false };
    let lastHud = { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' };
    let rollUntil = 0, seenPu = {}, qaHold = false, qaAuto = false;
    // (sullo schermo diviso il callback gira nella vista in cui è stato chiesto)
    const later = (fn, ms) => { const vi = VI; const id = setTimeout(() => (views.length > 1 && views[vi] ? inView(vi, fn) : fn()), ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const sfx = (k, ...a) => { if (!quiet && ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };
    const audio = () => HH.audio || {};
    const asfx = (k, ...a) => { const A = audio(); if (!quiet && A.sfx && typeof A.sfx[k] === 'function') A.sfx[k](...a); };
    // personaggi e umani (a due: s.who, s.hu)
    const whoOf = (id) => (s && s.who ? s.who[id] : WHO[id]);
    const face = (id, j) => faceW(whoOf(id), j);
    const colOf = (id) => CCOLW[whoOf(id)];
    const isHum = (id) => (s && s.hu ? s.hu.indexOf(id) >= 0 : id === 0);
    const split = () => views.length > 1;
    const posMe = () => (s ? P.posOf(s, ME) : 4);

    /* ---------- 3D: stato della scena ---------- */
    let R3 = null;      // { renderer, scene, camera, ... }
    let C = {}, N = {}, themeKey = '', themeAt = 0;

    function readTheme() {
      const cs = G.getComputedStyle(wrap);
      const raw = COLS.map((k) => cs.getPropertyValue('--ry-' + k).trim()).concat(NUMS.map((k) => cs.getPropertyValue('--ry-' + k).trim()));
      const key = raw.join('|');
      if (key === themeKey) return false;
      themeKey = key;
      C = {}; N = {};
      COLS.forEach((k, i) => { const c = new T.Color(); try { c.setStyle(raw[i] || '#ff00ff'); } catch (e) { c.set(0xff00ff); } C[k] = c; });
      NUMS.forEach((k, i) => { N[k] = parseFloat(raw[COLS.length + i]) || 0; });
      return true;
    }

    /* ---------- viste (schermo diviso) ---------- */
    function saveV(v) {
      Object.assign(v, { ME, CH, hdgS, camRoll, fovK, shake, baseFov, steerV, gasOn, brakeOn, useQ, rollUntil, seenPu, lastHud, keys });
      v.el = { needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl };
      if (R3) { v.cam = R3.camera; v.ground = R3.ground; }
    }
    function loadV(v) {
      ({ ME, CH, hdgS, camRoll, fovK, shake, baseFov, steerV, gasOn, brakeOn, useQ, rollUntil, seenPu, lastHud, keys } = v);
      ({ needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl } = v.el);
      if (R3) { if (v.cam) R3.camera = v.cam; if (v.ground) R3.ground = v.ground; }
    }
    function inView(i, fn) {
      if (views.length < 2 || i === VI || !views[i]) return fn();
      saveV(views[VI]); loadV(views[i]); VI = i;
      return fn();
    }
    const eachView = (fn) => { if (views.length < 2) return fn(0); for (let i = 0; i < views.length; i++) inView(i, () => fn(i)); inView(0, () => 0); return 0; };
    // vista che guarda il kart id (-1 se nessuna)
    const viewOf = (id) => (views.length < 2 ? (id === ME ? 0 : -1) : views.findIndex((v, i) => (i === VI ? ME : v.ME) === id));
    // schermo diviso: due viste (giocatore 1 e 2), ognuna con camera, terreno e indicatori; one = torna a una vista
    function setViews(n) {
      if (n === views.length || (n < 2 && views.length < 2)) return;
      inView(0, () => 0);
      wrap.querySelectorAll('.ry-v[data-v="1"]').forEach((x) => x.remove());
      if (n < 2) {
        if (views[1] && views[1].ground && R3 && R3.scene) R3.scene.remove(views[1].ground.m);
        views = []; VI = 0; ME = 0; keys = KS[0];
        wrap.classList.remove('ry-split');
        const v0 = wrap.querySelector('.ry-v'); v0.style.cssText = '';
        return;
      }
      const v0 = {}; saveV(v0);
      stage.querySelector('.ry-v').insertAdjacentHTML('afterend', hudHTML(1));
      const v1 = { ME: 1, CH: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, lx: 0, ly: 0, lz: 0, ok: false }, hdgS: null, camRoll: 0, fovK: 0, shake: 0, baseFov: 64, steerV: 0, gasOn: false, brakeOn: false, useQ: false, rollUntil: 0, seenPu: {}, lastHud: { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' }, keys: KS[1] };
      const cur = { needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl };
      hudEls(stage.querySelector('.ry-v[data-v="1"]'));
      v1.el = { needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl };
      ({ needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl } = cur);
      if (R3) v1.cam = new T.PerspectiveCamera(66, 1, 0.1, 900);
      views = [v0, v1]; VI = 0;
      wrap.classList.add('ry-split');
    }
    // capace di due viste 3D? (telefoni piccoli o lenti: no)
    function splitOK() {
      const nav = G.navigator || {}, cores = nav.hardwareConcurrency || 4, mem = nav.deviceMemory || 4;
      const a = Math.max(G.innerWidth || 0, G.innerHeight || 0), b = Math.min(G.innerWidth || 0, G.innerHeight || 0);
      return (cores >= 4 && mem >= 3 && a >= 640 && b >= 320) || !!(el._rally && el._rally.forceSplit);
    }

    // geometrie di base (riusate)
    let GEO = null;
    let BR = [], SEA_Y = -3, isSea = false;
    let TGc = null;
    let ctxC = null;
    let baseFov = 64;
    function changed(force) {
      const now = performance.now();
      if (!force && now - lastChanged < 900) return;
      lastChanged = now;
      ctx.changed();
    }

    /* ---------- comandi ---------- */
    const landscape = () => (G.innerWidth || 1) > (G.innerHeight || 1);
    const inFull = () => { const f = fsEl(); return !!(f && wrap && f.contains(wrap)); };
    const sensorLive = () => performance.now() - sensor.at < 1200;
    // sullo schermo diviso niente sensori (due giocatori, un telefono): sempre al tocco
    const mode = () => (pref === 'tilt' && inFull() && sensorLive() && !split() ? 'tilt' : 'touch');
    let lastMode = '';
    function renderMode() {
      if (!modeBtn) return;
      const m = mode();
      eachView(() => {
        modeBtn.innerHTML = pref === 'tilt' ? TILT : HAND;
        modeBtn.classList.toggle('on', m === 'tilt');
        modeBtn.setAttribute('aria-label', pref === 'tilt' ? L('ry_tilt') : L('ry_touch'));
        modeBtn.title = modeBtn.getAttribute('aria-label');
        camBtn.innerHTML = CAM[camPref];
        camBtn.setAttribute('aria-label', L(camPref === 'chase' ? 'ry_cam_chase' : 'ry_cam_pilot'));
        camBtn.title = camBtn.getAttribute('aria-label');
      });
      wrap.classList.toggle('tilt', m === 'tilt');
      wrap.classList.toggle('touch', m === 'touch');
      wrap.classList.toggle('chase', chase());
      wrap.classList.toggle('pilot', !chase());
      // a due: niente cambio di visuale né "gioca insieme"; prima del via il pulsante "gioca insieme"
      wrap.classList.toggle('ry-mp', !!mpMode);
      wrap.classList.toggle('ry-guest', mpMode === 'guest');
      wrap.classList.toggle('pre', !!s && !mpMode && s.t <= 0 && !P.isOver(s));
      wrap.classList.toggle('auto', autoGas());
      // menu di pausa: visuale, acceleratore automatico, sensori ↔ tocco
      if (optsEl) {
        const [oc, oa, ot] = optsEl.querySelectorAll('.ry-opt');
        oc.innerHTML = `${CAM[camPref]}<span>${L(camPref === 'chase' ? 'ry_cam_chase' : 'ry_cam_pilot')}</span>`;
        oa.setAttribute('aria-pressed', String(autoGas()));
        ot.innerHTML = `${pref === 'tilt' ? TILT : HAND}<span>${L(pref === 'tilt' ? 'ry_tilt' : 'ry_touch')}</span>`;
      }
      if (m !== lastMode) { if (m === 'tilt') sensor.zero = sensor.raw; lastMode = m; }
    }
    // inclinazione "a volante": componente della verticale lungo il lato lungo dello schermo
    function onOrient(e) {
      if (e.beta == null || e.gamma == null) return;
      const b = (e.beta * Math.PI) / 180, gm = (e.gamma * Math.PI) / 180;
      const ux = -Math.cos(b) * Math.sin(gm), uy = Math.sin(b);
      const ang = (((G.screen && G.screen.orientation && G.screen.orientation.angle) ?? G.orientation ?? 0) * Math.PI) / 180;
      const raw = -(ux * Math.cos(ang) - uy * Math.sin(ang));
      sensor.raw = sensor.raw * 0.55 + raw * 0.45;
      if (performance.now() - sensor.at > 3000) sensor.zero = sensor.raw;   // sensori appena arrivati: zero qui
      sensor.at = performance.now();
    }
    function tiltSteer() {
      let v = (sensor.raw - sensor.zero) / Math.sin((24 * Math.PI) / 180);
      if (Math.abs(v) < 0.06) v = 0; else v = Math.sign(v) * (Math.abs(v) - 0.06) / 0.94;
      return Math.max(-1, Math.min(1, v));
    }
    function askPermission() {
      const D = G.DeviceOrientationEvent;
      if (sensor.asked || !D || typeof D.requestPermission !== 'function') return;
      sensor.asked = true;
      try { D.requestPermission().then(() => {}).catch(() => {}); } catch (e) { /* niente sensori */ }
    }
    // ruolo di un tocco: pedali, frecce, power-up; altrove (col tocco) si sterza trascinando
    function roleAt(x, y, t) {
      const hit = (node) => { if (!node || node.offsetParent === null) return false; const r = node.getBoundingClientRect(), sr = stage.getBoundingClientRect(), m = 10; return x >= r.left - sr.left - m && x <= r.right - sr.left + m && y >= r.top - sr.top - m && y <= r.bottom - sr.top + m; };
      if (t && t.closest && t.closest('.ry-item')) return 'item';
      if (hit(gasEl)) return 'gas';
      if (hit(pedalEl)) return 'brake';
      if (mode() === 'touch' && hit(arrL)) return 'left';
      if (mode() === 'touch' && hit(arrR)) return 'right';
      return mode() === 'touch' ? 'drag' : 'none';
    }
    function input(dt) {
      // QA (Playwright): l'autopilota guida il kart di questa vista passando dallo stesso input dei comandi
      if (qaAuto && s && g) { const a = autopilot(s.cars[ME], {}); steerV = a.steer; gasOn = !!a.gas; brakeOn = !!a.brake; const use = useQ ? 1 : 0; useQ = false; return Object.assign(a, { use }); }
      const m = mode(), now = performance.now();
      let tgt = 0, brake = !!keys.b, gas = !!keys.g, arrow = 0, held = 0, latest = -1, drag = null;
      if (keys.l || keys.r) tgt = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      else if (m === 'tilt') tgt = tiltSteer();
      for (const q of ptrs.values()) {
        if ((q.v || 0) !== VI) continue;
        if (q.role === 'gas') gas = true;
        else if (q.role === 'brake') brake = true;
        else if (q.role === 'left' || q.role === 'right') { if (q.t0 > latest) { latest = q.t0; arrow = q.role === 'left' ? -1 : 1; held = (now - q.t0) / 1000; } }
        else if (q.role === 'drag' && (!drag || q.t0 > drag.t0)) drag = q;
      }
      if (!(keys.l || keys.r) && m === 'touch') {
        // frecce: partono al 42% e arrivano al massimo in ~0,25 s; trascinando: lo sterzo segue il dito
        if (arrow) tgt = arrow * Math.min(1, 0.42 + held * 2.4);
        else if (drag) tgt = Math.max(-1, Math.min(1, (drag.x - drag.x0) / Math.max(60, (split() && views[VI].rect ? views[VI].rect.w : W) * 0.2)));
      }
      steerV += (tgt - steerV) * Math.min(1, dt * (m === 'tilt' || drag ? 16 : 11));
      brakeOn = brake;
      // acceleratore automatico (opzione): sempre giù tranne quando si frena
      gasOn = autoGas() ? !brake : gas;
      const use = useQ ? 1 : 0;
      useQ = false;
      return { steer: steerV, gas: gasOn ? 1 : 0, brake: brake ? 1 : 0, use };
    }
    function useItem() {
      if (!s || P.isOver(s) || paused || s.ready > 0 || !s.cars[ME].it) return;
      useQ = true;
      itemBtn.classList.remove('press'); void itemBtn.offsetWidth; itemBtn.classList.add('press');
      later(() => itemBtn.classList.remove('press'), 150);
    }
    function setCam(c) {
      if (split() || mpMode === 'guest') return;
      camPref = c; sset('rally:cam', c); CH.ok = false; hdgS = null;
      renderMode(); measure(); sfx('tap');
      say(L(c === 'chase' ? 'ry_cam_chase' : 'ry_cam_pilot'), 'small', 1200);
    }
    function setAuto(on) { autoPref = !!on; sset('rally:auto', !!on); renderMode(); sfx('tap'); }
    function setCtl() {
      pref = pref === 'tilt' ? 'touch' : 'tilt';
      sset('rally:ctl', pref);
      if (pref === 'tilt') askPermission();
      sensor.zero = sensor.raw;
      renderMode(); sfx('tap');
      say(pref === 'tilt' ? L('ry_tilt') : L('ry_touch'), 'small', 1400);
    }
    const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    // vista sotto il punto (schermo diviso) o del pulsante toccato
    const viewAt = (x, y, t) => {
      if (!split()) return 0;
      const vr = t && t.closest && t.closest('.ry-v');
      if (vr) return +vr.dataset.v || 0;
      const i = views.findIndex((v) => v.rect && x >= v.rect.x && x < v.rect.x + v.rect.w && y >= v.rect.y && y < v.rect.y + v.rect.h);
      return i < 0 ? 0 : i;
    };
    el.onpointerdown = (e) => {
      if (!stage || !e.target.closest('.ry-stage')) return;
      if (e.target.closest('.ry-btn') || e.target.closest('.ry-end button') || e.target.closest('.ry-opts') || e.target.closest('.ry-mpv')) return;
      e.preventDefault();
      if (HH.audio && HH.audio.unlock) HH.audio.unlock();
      if (pref === 'tilt') askPermission();
      if (!turnEl.hidden) return;
      if (paused) { resume(); return; }
      if (P.isOver(s)) return;
      const [x, y] = local(e), vi = viewAt(x, y, e.target), role = inView(vi, () => roleAt(x, y, e.target));
      // pulsante del power-up: si usa subito (anche insieme ai pedali: tocco multiplo)
      if (role === 'item') { inView(vi, useItem); return; }
      if (role === 'none') return;
      ptrs.set(e.pointerId, { x, y, x0: x, t0: performance.now(), role, v: vi });
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ }
    };
    el.onpointermove = (e) => {
      const q = ptrs.get(e.pointerId);
      if (!q) return;
      const [x, y] = local(e);
      q.x = x; q.y = y;
      // scivolando da una freccia all'altra (o da un pedale all'altro) il comando segue il dito
      if (q.role !== 'drag') { const r = inView(q.v || 0, () => roleAt(x, y, null)); if (r !== q.role && r !== 'drag' && r !== 'none' && r !== 'item') { q.role = r; q.t0 = performance.now(); } }
    };
    el.onpointerup = el.onpointercancel = (e) => { ptrs.delete(e.pointerId); };
    el.oncontextmenu = (e) => { if (e.target.closest('.ry-stage')) e.preventDefault(); };
    el.onclick = (e) => {
      if (e.target.closest('.ry-pbtn')) { e.preventDefault(); sfx('tap'); toggle(); return; }
      if (e.target.closest('.ry-cam')) { e.preventDefault(); setCam(camPref === 'chase' ? 'pilot' : 'chase'); return; }
      if (e.target.closest('.ry-mode')) { e.preventDefault(); setCtl(); return; }
      if (e.target.closest('.ry-mpbtn')) { e.preventDefault(); sfx('tap'); mpMenu(); return; }
      const mpb = e.target.closest('[data-mp]');
      if (mpb) { e.preventDefault(); if (!mpb.disabled) mpClick(mpb.dataset.mp); return; }
      const opt = e.target.closest('.ry-opt');
      if (opt) {
        e.preventDefault();
        if (opt.dataset.opt === 'cam') setCam(camPref === 'chase' ? 'pilot' : 'chase');
        else if (opt.dataset.opt === 'auto') setAuto(!autoGas());
        else if (opt.dataset.opt === 'mp') mpMenu();
        else setCtl();
        return;
      }
      // tastiera (Invio/spazio sul pulsante): il clic senza puntatore usa il power-up
      if (e.target.closest('.ry-item') && e.detail === 0) { e.preventDefault(); inView(viewAt(0, 0, e.target), useItem); return; }
      if (e.target.closest('.ry-retry')) { e.preventDefault(); restartRace(); }
    };
    // schermo diviso: frecce e Invio per il giocatore 1, W A S D e spazio (o E) per il giocatore 2
    const KEY2 = { a: 1, d: 1, A: 1, D: 1, s: 1, S: 1, w: 1, W: 1, ' ': 1, e: 1, E: 1 };
    const kview = (k) => (split() && KEY2[k] ? 1 : 0);
    function onKey(e) {
      if (!alive || !el.isConnected) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const onBtn = e.target && e.target.closest && e.target.closest('button');
      if (e.key in USEKEYS) {
        // Invio o spazio su un pulsante (anche del gioco) premono il pulsante
        if (onBtn && (e.key === 'Enter' || e.key === ' ')) return;
        e.preventDefault();
        if (paused) { if (mpEl.hidden) resume(); return; }
        if (!e.repeat) inView(kview(e.key), useItem);
        return;
      }
      if (e.key in KEYS) {
        e.preventDefault();
        if (paused) { if (mpEl.hidden) resume(); return; }
        if (P.isOver(s)) return;
        KS[kview(e.key)][KEYS[e.key]] = true;
        return;
      }
      if (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V') { e.preventDefault(); setCam(camPref === 'chase' ? 'pilot' : 'chase'); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (e.key === 'Escape') pause(); else toggle(); }
    }
    function onKeyUp(e) { if (e.key in KEYS) KS[kview(e.key)][KEYS[e.key]] = false; }
    function onVis() { if (document.hidden) pause(); }
    function onBlur() { clearKeys(); ptrs.clear(); }
    function onFull() {
      if (!alive) return;
      const f = inFull();
      try {
        const so = G.screen && G.screen.orientation;
        if (f && so && so.lock) so.lock('landscape').catch(() => {});
        else if (!fsEl() && so && so.unlock) so.unlock();
      } catch (e) { /* non supportato */ }
      later(() => { measure(); checkTurn(); renderMode(); }, 120);
    }
    const coarse = () => !!(G.matchMedia && G.matchMedia('(pointer: coarse)').matches);
    function checkTurn() {
      if (!turnEl) return;
      const need = inFull() && !landscape() && coarse();
      if (need && turnEl.hidden) { turnEl.hidden = false; if (paused) pauseEl.hidden = true; else if (!P.isOver(s)) pause(); }
      else if (!need && !turnEl.hidden) { turnEl.hidden = true; if (paused) pauseEl.hidden = false; }
    }
    function onResize() { checkTurn(); renderMode(); }
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function onTheme() { if (!alive) return; themeAt = 0; }
    function detach() {
      alive = false;
      stop();
      if (net) { try { net.send({ ry: 'quit' }); net.close(); } catch (e) { /* già chiuso */ } net = null; }
      G.removeEventListener('keydown', onKey);
      G.removeEventListener('keyup', onKeyUp);
      G.removeEventListener('blur', onBlur);
      G.removeEventListener('deviceorientation', onOrient);
      G.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.removeEventListener(ev, onFull));
      // lo schermo intero resta attivo anche fuori dal gioco: si sblocca l'orizzontale imposto dal rally
      try { const so = G.screen && G.screen.orientation; if (so && so.unlock) so.unlock(); } catch (e) { /* non supportato */ }
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._ryRO) { el._ryRO.disconnect(); el._ryRO = null; }
      clearInterval(watch);
      clearTimers();
      engine(false);
      if (R3) {
        disposeWorld();
        try { R3.grad.dispose(); R3.renderer.dispose(); R3.renderer.forceContextLoss(); } catch (e) { /* già perso */ }
        R3 = null;
      }
    }
    if (el._ryDetach) el._ryDetach();
    el._ryDetach = detach;
    G.addEventListener('keydown', onKey);
    G.addEventListener('keyup', onKeyUp);
    G.addEventListener('blur', onBlur);
    G.addEventListener('deviceorientation', onOrient);
    G.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, onFull));
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);
    // l'app svuota #board quando si esce dal gioco: libera WebGL anche se la partita era in pausa
    const watch = setInterval(() => { if (!el.isConnected || (wrap && !wrap.isConnected)) detach(); else { checkTurn(); renderMode(); } }, 1000);

    /* ---------- suono del motore ---------- */
    function engine(on, p) {
      const A = audio();
      if (!A.engine) return;
      if (!on) { A.engine(false); return; }
      const v = Math.min(1.3, Math.abs(p.v) / cfg.vmax);
      // tre marce: il motore sale e "cambia" (col gas giù un po' di più)
      const gear = v < 0.33 ? 0 : v < 0.66 ? 1 : 2, rpm = Math.min(1, (v - gear * 0.33) / 0.38 * 0.8 + 0.2 + gear * 0.06 + (gasOn ? 0.05 : 0));
      A.engine(true, rpm, Math.min(1, (p.off ? 0.6 : 0) + Math.min(1, p.slide / 6) * 0.6 + (p.honey ? 0.3 : 0)), brakeOn && p.v > 3);
    }

    /* ---------- eventi della logica ---------- */
    // punto del kart nel mondo three (per le particelle degli urti)
    const kart3 = (id) => { if (id === ME && !chase()) return null; const c = s.cars[id], Pz = P.pose(g, c); return Math.abs(c.s - s.cars[ME].s) < 70 ? V3(Pz.x, roadH(c.s, c.d, Pz.x, Pz.y) + 0.8, Pz.y) : null; };
    const near3 = (id) => { const c = s.cars[id], cw = P.world(g, c.s, c.d); return Math.abs(c.s - s.cars[ME].s) < 70 ? V3(cw.x, roadH(c.s, c.d, cw.x, cw.y) + 1, cw.y) : null; };
    // riguarda chi guarda? (a due: by = l'umano a cui succede; altrimenti il kart who; senza nessuno dei due: tutti)
    const mine = (e) => (e.by !== undefined ? e.by === ME : e.who === undefined || e.who === ME);
    function onEvent(e) {
      switch (e.type) {
        case 'count': lights(4 - e.n); sfx('blip'); break;
        case 'go': {
          lights(0); sfx('milestone');
          later(() => say(L('pa_go'), 'go', 700), 50);
          sensor.zero = sensor.raw;
          const duo = !!(s.hu && s.hu.length > 1);
          if (s.t < 0.5 && (s.level <= 3 || duo)) later(() => { if (!paused && !P.isOver(s)) say(L(duo ? 'ry_mp_rule' : 'ry_top3'), 'small', 1800); }, 1300);
          break;
        }
        case 'call': { if (!mine(e)) break; const n = g.notes[e.i]; asfx('pace', n.kind === 'curve' ? n.dir : 0, n.kind === 'curve' ? n.g : 0); break; }
        case 'off': if (!mine(e)) break; if (!chase()) burst('leaf'); shake = Math.max(shake, 0.25); break;
        case 'boing': if (e.who === ME) { burst(cfg.theme === 'city' ? 'gift' : cfg.theme === 'snow' ? 'bubble' : 'leaf', kart3(ME)); sfx('boing'); bumpAnim(); shake = Math.max(shake, 0.7); } break;
        case 'rock': if (e.who === ME) { burst(e.k === 'bush' || e.k === 'bank' ? 'leaf' : 'spark', kart3(ME)); sfx('boing'); bumpAnim(); shake = 1; if (ctx.react) ctx.react('oops'); } break;
        case 'bump': if (e.by !== undefined && e.by !== ME) break; burst('spark', kart3(e.who)); sfx('set'); bumpAnim(); shake = Math.max(shake, 0.6); break;
        case 'drift': break;
        case 'mini': if (e.who === ME) { asfx('zoom'); burst('carrot', kart3(ME), e.lvl > 1 ? 14 : 8); if (e.lvl > 1 || !seenPu.mini) say(L('ry_mini'), 'pu', 900); seenPu.mini = 1; } break;
        case 'spin': if (e.who === ME) { asfx('whee'); shake = Math.max(shake, 0.5); if (ctx.react) ctx.react('oops'); } break;
        case 'rescue': if (e.who === ME) { asfx('puff'); burst('petal', kart3(ME), 18); if (ctx.react) ctx.react('oops'); } break;
        case 'back': if (e.who === ME) { CH.ok = false; burst('petal', kart3(ME), 12); say(L('ry_rescue'), 'small', 1300); } break;
        case 'jump': if (mine(e)) sfx('pick'); break;
        case 'pass': if (!mine(e)) break; if (e.up) { sfx('place'); changed(true); } else sfx('tap'); break;
        case 'check': {
          if (!mine(e)) break;
          msgEl.innerHTML = `<div class="ry-cp">${FLAG}<span>${e.pos}°</span><span>${fmtT(s.t)}</span></div>`;
          msgEl.classList.add('show'); sfx('milestone');
          const m = msgEl;
          later(() => { if (m.querySelector('.ry-cp')) m.innerHTML = ''; }, 1700);
          break;
        }
        case 'box':
          if (e.who === ME && e.it) {
            asfx('gift'); burst('gift');
            rollUntil = performance.now() + (reduce() ? 0 : 650); lastHud.it = -1;
            const id = ME;
            later(() => { if (!P.isOver(s) && s.cars[id].it) { const k = P.ITEMS[s.cars[id].it]; if (!seenPu[k] || s.level <= 2) say(L('ry_pu_' + k), 'pu', 1300); seenPu[k] = 1; } }, reduce() ? 0 : 680);
          }
          break;
        case 'use': {
          const meSelf = e.who === ME, at3 = meSelf ? null : near3(e.who);
          if (!meSelf && !at3) break;
          const snd = { carrot: 'zoom', bubble: 'bubble', banana: 'plop', honey: 'plop', cloud: 'puff', magnet: 'tink', spring: 'sproing' }[e.it];
          if (snd && (meSelf || at3)) asfx(snd);
          if (meSelf) { if (e.it === 'carrot') burst('carrot'); if (e.it === 'bubble') burst('bubble'); if (e.it === 'magnet') burst('acorn'); }
          else if (at3) burst(e.it === 'carrot' ? 'carrot' : e.it === 'cloud' ? 'petal' : 'spark', at3, 6);
          break;
        }
        case 'slip': if (e.who === ME) { asfx('whee'); if (ctx.react) ctx.react('oops'); } else { const at3 = near3(e.who); if (at3) { burst('spark', at3, 8); asfx('whee'); } } break;
        case 'honey': if (e.who === ME) { asfx('squish'); burst('honey'); } break;
        case 'cloud': if (e.who === ME) { asfx('puff'); burst('petal', null, 16); } else { const at3 = near3(e.who); if (at3) { burst('petal', at3, 12); asfx('puff'); } } break;
        case 'pop': { const at3 = e.who === ME ? null : near3(e.who); if (e.who === ME || at3) { asfx('pop'); burst('bubble', at3, 10); } break; }
        case 'acorn': if (e.who === ME) asfx('tink'); break;
        case 'spring': break;
        case 'finish': finish(); break;
        default: break;
      }
    }
    // a chi va l'evento: sullo schermo diviso alla vista del kart (by/who), quelli di tutti (semaforo) a tutte e due
    // (il suono una volta sola), quelli degli avversari alla vista più vicina
    function dispatch(e) {
      if (!split() || e.type === 'finish' || e.type === 'win' || e.type === 'lose') { onEvent(e); return; }
      const tgt = e.by !== undefined ? e.by : e.who;
      if (tgt === undefined) { views.forEach((v, i) => { quiet = i > 0; inView(i, () => onEvent(e)); }); quiet = false; return; }
      let vi = viewOf(tgt);
      if (vi < 0) {
        const c = s.cars[tgt], vc = (i) => s.cars[i === VI ? ME : views[i].ME];
        vi = c && Math.abs(c.s - vc(1).s) < Math.abs(c.s - vc(0).s) ? 1 : 0;
      }
      inView(vi, () => onEvent(e));
    }
    function bumpAnim() { if (reduce()) return; stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump'); }
    function finish() {
      if (s.hu) { finishMP(); return; }
      over = performance.now();
      engine(false);
      ptrs.clear(); clearKeys();
      fxoEl.className = 'ry-fxo';
      const rows = s.res.map((r, i) => `<li class="${r.id ? '' : 'me'}"><em>${i + 1}</em><i>${face(r.id, i === 0)}</i><span>${fmtT(r.t)}</span></li>`).join('');
      endEl.innerHTML = `<span class="ry-big">${s.pos}<small>/4</small></span><ol>${rows}</ol>${s.won ? '' : `<button class="candy ry-retry" type="button"><span>${L('retry')}</span></button>`}`;
      later(() => { endEl.hidden = false; }, 500);
      changed(true);
      if (s.won) { sfx('cupDone'); if (ctx.react) ctx.react('happy'); later(() => ctx.win(), (el._rally && el._rally.winDelay) || 2600); }
      else { sfx('lose'); if (ctx.react) ctx.react('oops'); }
    }
    /* ---------- ciclo ---------- */
    function loop(nowMs) {
      if (!alive) return;
      if (!el.isConnected) { detach(); return; }
      const dt = last ? Math.min(0.1, (nowMs - last) / 1000) : 0;
      last = nowMs;
      if (nowMs - themeAt > 1000) {
        themeAt = nowMs;
        if (readThemeChanged()) { buildWorld(); measure(); }
      }
      // qualità automatica: se i fotogrammi sono lenti cala la risoluzione (e risale se c'è margine)
      if (dt > 0) {
        if (dt > 1 / 38) { slowF++; fastF = 0; } else if (dt < 1 / 55) { fastF++; slowF = Math.max(0, slowF - 1); }
        if (slowF > 50 && pr > 0.6) { pr = Math.max(0.6, pr - 0.25); R3.renderer.setPixelRatio(pr); measure(); slowF = 0; }
        else if (fastF > 400 && pr < Math.min(prMax(), G.devicePixelRatio || 1)) { pr = Math.min(prMax(), pr + 0.25); R3.renderer.setPixelRatio(pr); measure(); fastF = 0; }
      }
      if (!paused && dt > 0 && !P.isOver(s) && !qaHold) {
        let ev;
        // in rete: la sessione fa i passi (host) o interpola e predice (ospite); sullo schermo diviso due input
        if (net) { net.setInput(input(dt)); net.frame(nowMs); ev = net.take(); }
        else if (split()) { const a = inView(0, () => input(dt)), b = inView(1, () => input(dt)); ev = P.step(s, dt, [a, b]); }
        else ev = P.step(s, dt, input(dt));
        ev.forEach(dispatch);
        if (!P.isOver(s)) inView(0, () => engine(s.ready <= 0, s.cars[ME]));
        changed(false);
      }
      draw(dt);
      hud();
      const live = !paused && (!P.isOver(s) || nowMs - over < 4000);
      raf = live ? requestAnimationFrame(loop) : 0;
    }
    function readThemeChanged() { const was = themeKey; readTheme(); return themeKey !== was; }
    function start() { if (!raf && alive) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    // remote = la pausa (o la ripresa) arriva dall'altro telefono: non la si rimanda indietro
    function pause(remote) {
      if (paused || !s || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = !turnEl.hidden;
      eachView(() => { pauseBtn.innerHTML = PLAY; steerV = 0; useQ = false; gasOn = false; brakeOn = false; });
      ptrs.clear(); clearKeys();
      engine(false);
      stop();
      if (net) { net.pause(true); net.stop(); if (remote !== true) net.send({ ry: 'pause' }); }
      if (R3) draw(0);
      ctx.changed();
    }
    function resume(remote) {
      if (!paused || P.isOver(s) || !turnEl.hidden || !mpEl.hidden) return;
      paused = false;
      pauseEl.hidden = true;
      eachView(() => { pauseBtn.innerHTML = PAUSE; });
      // breve conto alla rovescia per rimettere le mani sul volante (in rete lo decide l'host)
      if (s.t > 0 && mpMode !== 'guest') { s.ready = 1.6; s.cd = 2; }
      if (net) { net.pause(false); net.start(); if (remote !== true) net.send({ ry: 'resume' }); }
      sensor.zero = sensor.raw;
      sfx('set');
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    // RX: contesto condiviso coi moduli rally-3d.js, rally-scenery.js, rally-decor.js, rally-karts.js, rally-view.js, rally-hud.js, rally-duo.js
    const RX = { el, ctx, FRUITW, L, PLAY, AUTO, DUO, PHONE, o, DASH, CCOL, FLAG, PAUSE, ACORN, ZONE, PEDAL, GAS,
      puSvg, PU_LIST, BIG, arrow, ic, PHONES, SPLIT, CHARS, kartBackW, reduce, fmtT, PITCH, smooth, T, P, EYE_BACK,
      ptrs, clearKeys, later, sfx, whoOf, face, colOf, isHum, split, posMe, readTheme, inView, eachView, setViews,
      splitOK, changed, renderMode, engine, kart3, finish, pause, resume, begin,
      // stato che cambia: getter (e setter dove un modulo lo assegna)
      get g() { return g; }, get cfg() { return cfg; }, set cfg(v) { cfg = v; }, get s() { return s; }, get raf() { return raf; },
      get over() { return over; }, set over(v) { over = v; }, get paused() { return paused; }, get alive() { return alive; },
      get glErr() { return glErr; }, set glErr(v) { glErr = v; }, get cv() { return cv; }, set cv(v) { cv = v; },
      get stage() { return stage; }, set stage(v) { stage = v; }, get wrap() { return wrap; }, set wrap(v) { wrap = v; },
      get pauseEl() { return pauseEl; }, set pauseEl(v) { pauseEl = v; }, get endEl() { return endEl; }, set endEl(v) { endEl = v; },
      get turnEl() { return turnEl; }, set turnEl(v) { turnEl = v; }, get optsEl() { return optsEl; }, set optsEl(v) { optsEl = v; },
      get mpEl() { return mpEl; }, set mpEl(v) { mpEl = v; }, get needle() { return needle; }, set needle(v) { needle = v; },
      get wheelG() { return wheelG; }, set wheelG(v) { wheelG = v; }, get posEl() { return posEl; }, set posEl(v) { posEl = v; },
      get rankEl() { return rankEl; }, set rankEl(v) { rankEl = v; }, get timeEl() { return timeEl; }, set timeEl(v) { timeEl = v; },
      get notesEl() { return notesEl; }, set notesEl(v) { notesEl = v; }, get progEl() { return progEl; }, set progEl(v) { progEl = v; },
      get msgEl() { return msgEl; }, set msgEl(v) { msgEl = v; }, get pedalEl() { return pedalEl; }, set pedalEl(v) { pedalEl = v; },
      get gasEl() { return gasEl; }, set gasEl(v) { gasEl = v; }, get arrL() { return arrL; }, set arrL(v) { arrL = v; },
      get arrR() { return arrR; }, set arrR(v) { arrR = v; }, get modeBtn() { return modeBtn; }, set modeBtn(v) { modeBtn = v; },
      get camBtn() { return camBtn; }, set camBtn(v) { camBtn = v; }, get pauseBtn() { return pauseBtn; }, set pauseBtn(v) { pauseBtn = v; },
      get itemBtn() { return itemBtn; }, set itemBtn(v) { itemBtn = v; }, get acornEl() { return acornEl; }, set acornEl(v) { acornEl = v; },
      get fxoEl() { return fxoEl; }, set fxoEl(v) { fxoEl = v; }, get spdEl() { return spdEl; }, set spdEl(v) { spdEl = v; },
      get pr() { return pr; }, set pr(v) { pr = v; }, get W() { return W; }, set W(v) { W = v; }, get H() { return H; }, set H(v) { H = v; },
      get hdgS() { return hdgS; }, set hdgS(v) { hdgS = v; }, get fovK() { return fovK; }, set fovK(v) { fovK = v; },
      get brakeOn() { return brakeOn; }, get gasOn() { return gasOn; }, get shake() { return shake; }, set shake(v) { shake = v; },
      get camRoll() { return camRoll; }, set camRoll(v) { camRoll = v; }, get lastDrawn() { return lastDrawn; }, set lastDrawn(v) { lastDrawn = v; },
      get steerV() { return steerV; }, get VI() { return VI; }, get views() { return views; },
      get mpMode() { return mpMode; }, set mpMode(v) { mpMode = v; }, get ME() { return ME; }, set ME(v) { ME = v; },
      get fno() { return fno; }, set fno(v) { fno = v; }, get net() { return net; }, set net(v) { net = v; },
      get solo() { return solo; }, set solo(v) { solo = v; }, get mpBusy() { return mpBusy; }, set mpBusy(v) { mpBusy = v; },
      get camPref() { return camPref; }, get CH() { return CH; }, get lastHud() { return lastHud; }, get rollUntil() { return rollUntil; },
      get R3() { return R3; }, set R3(v) { R3 = v; }, get N() { return N; }, get C() { return C; },
      get GEO() { return GEO; }, set GEO(v) { GEO = v; }, get BR() { return BR; }, set BR(v) { BR = v; },
      get isSea() { return isSea; }, set isSea(v) { isSea = v; }, get SEA_Y() { return SEA_Y; }, set SEA_Y(v) { SEA_Y = v; },
      get TGc() { return TGc; }, set TGc(v) { TGc = v; }, get ctxC() { return ctxC; }, set ctxC(v) { ctxC = v; },
      get baseFov() { return baseFov; }, set baseFov(v) { baseFov = v; } };
    // 3D di base: renderer, materiali, geometrie fuse, quote, terreno, cielo, aloni: rally-3d.js
    const { initGL, prMax, keep, toon, basic, M4, base, merge, meshOf, clearPt, sdist, groundH, roadH, V3, buildWorld,
      disposeWorld, updateGround } = Object.assign(RX, HH.rally3d(RX));
    // blocchi di scenario: strada, ponti, gallerie, bordi, ostacoli, archi: rally-scenery.js
    const { YAW, pick, buildChunk, snowman, stands } = Object.assign(RX, HH.rallyScenery(RX));
    // decorazioni delle ambientazioni (bosco, città, mare, neve): rally-decor.js
    const { decorForest, decorCity, decorSea, decorSnow } = Object.assign(RX, HH.rallyDecor(RX));
    // kart-frutto, cofano, particelle, power-up in pista, gabbiani: rally-karts.js
    const { DRV, buildKarts, buildHood, buildFx, emit, burst, updateFx, buildItems, updateItems, buildGulls } = Object.assign(RX, HH.rallyKarts(RX));
    // disegno: misure, camera, posa dei kart, una o due viste: rally-view.js
    const { chase, measure, placeKart, draw } = Object.assign(RX, HH.rallyView(RX));
    // DOM del gioco e indicatori HTML: rally-hud.js
    const { build, hudHTML, hudEls, hud, tag, paintProg, say, lights } = Object.assign(RX, HH.rallyHud(RX));
    // a due giocatori: schermo diviso e rete locale: rally-duo.js
    const { finishMP, mpMenu, mpClick, startSplit, mpNext, endMP } = Object.assign(RX, HH.rallyDuo(RX));

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop();
      clearTimers();
      s = state;
      g = P.geo(s);
      cfg = P.config(s.level);
      paused = false; over = 0; ptrs.clear(); clearKeys();
      if (!wrap || !wrap.isConnected) build();
      eachView(() => { steerV = 0; useQ = false; rollUntil = 0; shake = 0; CH.ok = false; hdgS = null; lastHud = { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' }; });
      wrap.dataset.stage = cfg.stage;
      wrap.dataset.time = cfg.time;
      renderMode();
      endEl.hidden = true; endEl.innerHTML = '';
      pauseEl.hidden = true; eachView(() => { pauseBtn.innerHTML = PAUSE; });
      themeKey = '';
      if (!initGL()) {
        stage.insertAdjacentHTML('beforeend', `<div class="ry-veil"><b>${L('ry_nogl')}</b></div>`);
        return;
      }
      if (split() && !views[1].cam) views[1].cam = new T.PerspectiveCamera(66, 1, 0.1, 900);
      // schermo diviso: pixel ratio al massimo 1 (risale fino a 1,5 tornando a una vista se i fotogrammi sono veloci)
      const pm = Math.min(prMax(), G.devicePixelRatio || 1);
      if (pr > pm) { pr = pm; R3.renderer.setPixelRatio(pr); }
      buildWorld();
      measure();
      paintProg();
      themeAt = performance.now();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; eachView(() => { pauseBtn.innerHTML = PLAY; }); draw(0); hud(); return; }
      eachView((i) => { msgEl.innerHTML = `<b class="small">${L(split() && i === 0 && !coarse() ? 'ry_mp_keys' : 'pa_ready')}</b>`; msgEl.classList.remove('show'); void msgEl.offsetWidth; msgEl.classList.add('show'); });
      start();
      checkTurn();
    }
    function fresh() {
      if (mpMode) { mpNext(ctx.level); return; }
      begin(P.newLevel(ctx.level, Math.random)); ctx.changed({ reset: true });
    }
    function restartRace() {
      if (mpMode) { mpNext(s.level); return; }
      begin(P.newLevel(s.level, Math.random)); ctx.changed({ reset: true });
    }

    // per i controlli di qualità (Playwright): stato vivo e "avanti veloce" con un autopilota semplice (eventi compresi);
    // a due guida entrambi gli umani (o2.p2 = opzioni per il secondo)
    function autopilot(p, o2) {
      const kt = P.kAt(g, p.s), want = (o2.d != null ? o2.d : 0) - p.d;
      const kReq = kt + (Math.max(-0.4, Math.min(0.4, want * 0.12)) - p.psi) * 1.6 / Math.max(8, p.v);
      const vt = g.prof[Math.min(g.N, Math.round(p.s + p.v * 1.2))] * (o2.k || 0.95);
      return { steer: o2.steer != null ? o2.steer : Math.max(-1, Math.min(1, -kReq / P.KMAX)), gas: o2.gas != null ? o2.gas : p.v > vt ? 0 : 1, brake: o2.brake != null ? o2.brake : p.v > vt + 1 ? 1 : 0 };
    }
    function ff(sec, o2 = {}) {
      const ev = [];
      for (let t = 0; t < sec && !P.isOver(s); t += P.TICK) {
        if (s.hu) {
          const ins = s.hu.map((id, j) => Object.assign(autopilot(s.cars[id], j ? o2.p2 || {} : o2), { use: id === ME && useQ ? 1 : 0 }));
          if (net && net.role === 'guest') break;
          ev.push(...(net ? net.stepLocal(P.TICK, ins) : P.step(s, P.TICK, ins)));
        } else ev.push(...P.step(s, P.TICK, Object.assign(autopilot(s.cars[0], o2), { use: useQ ? 1 : 0 })));
        useQ = false;
      }
      ev.forEach(dispatch);
      if (!raf) draw(0);
      hud();
      return ev.map((e) => e.type);
    }
    // QA: dà un power-up a qualcuno (0 = Hari) e lo usa subito se use
    function give(item, who = 0, use = false) {
      const c = s.cars[who];
      c.it = P.ITEMS.indexOf(item);
      if (use) { if (who === ME) useQ = true; else c.use = 1e-3; }
      lastHud.it = -1; hud();
      return c.it;
    }
    // hold(true): il tempo reale si ferma (per le foto dei controlli di qualità), ff() continua a funzionare
    // posa effettivamente disegnata dei kart (dalle matrici delle mesh): x, y del piano della logica e direzione
    function drawn() {
      if (!R3 || !R3.karts) return [];
      return R3.karts.map((m) => { m.updateMatrixWorld(true); const e = m.matrixWorld.elements; return { x: e[12], y: -e[14], h: Math.atan2(-e[10], e[8]), vis: m.visible }; });
    }
    el._rally = { state: () => s, geo: () => g, three: () => R3, mode, sensor, ff, give, use: useItem, pr: () => pr, draw: () => { draw(0); hud(); }, hold: (on) => { qaHold = !!on; },
      drawn, place: () => { if (!R3 || !R3.karts) return []; for (let id = 0; id < 4; id++) placeKart(id, performance.now() / 1000, 0, reduce(), true); return drawn(); }, cam: () => camPref, setCam, setAuto, auto: autoGas, ctl: () => ({ steer: steerV, gas: gasOn, brake: brakeOn, ptrs: [...ptrs.values()].map((q) => q.role) }), input: (dt) => input(dt || 0.016),
      // a due: modo, kart di chi guarda, viste (rettangoli), controllo di rete; split(p2) avvia lo schermo diviso
      mp: () => ({ mode: mpMode, me: ME, views: views.map((v) => v.rect), net: net ? net.role : '', solo: !!solo }), split: (p2 = 'kitty') => startSplit(p2), solo: () => endMP(), menu: mpMenu, netCtl: () => net,
      views: () => views.length, forceSplit: false, auto2: (on) => { qaAuto = !!on; },
      // QA: disegno con i contatori di three.js sommati su tutte le viste (draw call, triangoli) e tempo del disegno
      info: () => { if (!R3) return null; const inf = R3.renderer.info; inf.autoReset = false; inf.reset(); const gl = R3.renderer.getContext(); gl.finish(); const t0 = performance.now(); draw(0); gl.finish(); const ms = performance.now() - t0; const r = { calls: inf.render.calls, tris: inf.render.triangles, ms, pr, views: Math.max(1, views.length) }; inf.autoReset = true; return r; } };
    // la partita a due non si salva: si riprende la gara in singolo che era stata messa da parte
    const sv = saved && saved.hu ? saved.solo : saved;
    const migrated = sv && typeof sv.seed === 'number' && sv.L > 0 && Array.isArray(sv.cars) && sv.cars.length === 4 && !sv.hu ? P.migrate(sv) : null;
    if (migrated && !P.isOver(migrated)) begin(migrated, true);
    else fresh();
    // aperto quando lo schermo intero è già attivo (resta acceso tra un gioco e l'altro): orizzontale e misure subito
    if (fsEl()) onFull();

    return {
      fresh,
      restart: restartRace,
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },
      resume() { resume(); },
      online: () => !!net,          // in rete: il velo dello schermo intero dell'app non mette in pausa
      // a due: lo stato della gara (per fragoline e progressi) con dentro la gara in singolo da riprendere
      snapshot: () => (mpMode && s ? Object.assign({}, s, { solo: solo || null, mp: mpMode }) : s),
    };
  }

  HH.games.push({
    id: 'rally', name: 'Hari Rally', rules: 'r14',
    rulesEn: RULES_EN,
    art, create,
    tutorial: TUT,
    rate: (s) => HH.rally.rate(s),
    parTime: (s) => HH.rally.par(s),
    progress: (s) => HH.rally.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
