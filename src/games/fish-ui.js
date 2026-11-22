/* Hari Fishing — interfaccia 3D (three.js r160, la stessa copia locale di Hari Rally: src/vendor/three.min.js,
 * scaricata solo aprendo un gioco che la usa).
 * Hari col cappellino di paglia è seduto in fondo al pontile, visto da dietro: lago tra le colline (livelli 1, 2 e pari)
 * o mare col faro (dispari dal 3); col tema scuro è sera, con la luna, le stelle e la lanterna accesa sul pontile.
 * Cel shading: MeshToonMaterial con rampa a 4 toni e contorni "a guscio rovesciato" (ShaderMaterial che gonfia la
 * geometria lungo le normali, facce posteriori, colore --fsh-ink). Acqua stilizzata in ShaderMaterial: bande di colore
 * a gradini, strisce di luce che scorrono, onde nei vertici e cerchi di schiuma attorno al galleggiante.
 * Colori solo dai token --fsh-* di fish.css (getComputedStyle → THREE.Color), temi chiaro e scuro.
 * Prestazioni da telefono: pixel ratio ≤ 1,5 (cala da solo se i fotogrammi sono lenti), 2 luci (3 di sera), niente ombre,
 * geometrie piccole e riusate, schizzi da un insieme fisso di 28 goccioline.
 *
 * Comandi
 *   Telefono coi sensori (orientamento VERTICALE: il lato lungo del telefono fa da canna, l'inclinazione del lato alto
 *   è un asse solo e non dipende da come si tiene il telefono di lato; a schermo intero si blocca in verticale e, se il
 *   telefono è girato, un velo chiede di raddrizzarlo):
 *     lancio  = telefono indietro (punta in su) e poi avanti di scatto; più è veloce lo scatto, più lontano va l'amo
 *     recupero = punta in su (più si inclina, più tira), punta in giù = allenta. La posizione neutra si tara da sola
 *                ogni volta che il galleggiante si posa (mezzo secondo fermi).
 *     iOS: "Attiva movimento" chiede i permessi (DeviceOrientationEvent/DeviceMotionEvent.requestPermission) dentro il tocco.
 *     Senza sensori, permesso negato o scegliendo i pulsanti: comandi a schermo.
 *   Mouse / tocco: trascina in giù (indietro) e lascia per lanciare (di lato per mirare); "Tira" e "Allenta" da tenere
 *     premuti (Tira tenuto a lungo tira di più). Prima del lancio "Tira" diventa "Lancia": si tiene premuto per caricare.
 *   Tastiera: ↑/W/spazio = tira (prima del lancio: tieni premuto e lascia per lanciare), ↓/S = allenta, ←/→ = mira,
 *     A = album, P/Esc = pausa.
 * Pesce preso: Hari lo guarda, si può fotografare (va nell'album con la foto) e torna in acqua con un cuoricino.
 * L'album (HH.store 'fish:album') resta tra i livelli: specie viste, quante, il più pesante, la foto.
 *
 * Moduli (caricati prima, in quest'ordine nel catalogo): fish-art.js (HH.fishArtKit, statico) e, montati qui sotto
 * con il contesto condiviso FX (nomi stabili + getter/setter dello stato di create()): fish-3d, fish-models,
 * fish-uw, fish-view, fish-hud. Qui restano create(), stato, comandi, eventi, pesce preso, album e ciclo.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  // testi, forme dei pesci, disegni SVG, Hari nel riquadro, tutorial: fish-art.js
  const { L, spName, FB, FCOL, RIDGES, PEC, fProf, symm, TAILS, f1, fishArt, fishSvg, stars, art, hariFace, PHONE,
    TILT, HAND, PAUSE, PLAY, BOOK, CAM, HEART, UP, DOWN, CASTI, FISHI, SNAPI, LOOSEI, LEFTI, RIGHTI, TAG_Q, TAG_X,
    TICK, TUT, RULES_EN } = HH.fishArtKit;

  /* ---------- utilità ---------- */
  let rmAt = -1e9, rmVal = false;
  const reduce = () => { const n = Date.now(); if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); } return rmVal; };
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const coarse = () => !!(G.matchMedia && G.matchMedia('(pointer: coarse)').matches);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const fmtW = (g) => { try { return g < 1000 ? `${new Intl.NumberFormat(HH.i18n && HH.i18n.code).format(g)} g` : `${new Intl.NumberFormat(HH.i18n && HH.i18n.code, { maximumFractionDigits: 1 }).format(g / 1000)} kg`; } catch (e) { return g < 1000 ? `${g} g` : `${(g / 1000).toFixed(1)} kg`; } };
  const COLS = ['ink', 'eye', 'hi', 'nose', 'blush', 'quill', 'quill-2', 'face', 'ear', 'paw', 'hat', 'hat-2', 'band', 'rod', 'rod-2', 'reel', 'line', 'bob-1', 'bob-2', 'heart', 'spark',
    'wood', 'wood-2', 'post', 'rope', 'bucket', 'lamp', 'sky-1', 'sky-2', 'sun', 'cloud', 'hill', 'hill-2', 'tree', 'tree-2', 'trunk', 'reed', 'lily', 'flower', 'rock', 'sand', 'tower', 'tower-2',
    'water', 'water-2', 'water-3', 'foam', 'shadow',
    'uw-1', 'uw-2', 'uw-top', 'ray', 'bed', 'bed-2', 'weed', 'weed-2', 'coral', 'coral-2', 'bubble', 'bait', 'tiny-1', 'tiny-2',
    'crab', 'jelly', 'starfish', 'octo', 'turtle', 'turtle-2', 'seahorse', 'shell', 'pearl', 'frog', 'frog-2', 'snail', 'snail-2', 'shrimp', 'tadpole', 'sweat',
    ...['minnow', 'goldfish', 'catfish', 'koi', 'clown', 'puffer', 'tuna', 'golden'].flatMap((sp) => [sp + '-1', sp + '-2', sp + '-3'])];
  const NUMS = ['amb', 'sunI', 'night'];
  const KEYS_PULL = { ArrowUp: 1, w: 1, W: 1, ' ': 1 }, KEYS_SLACK = { ArrowDown: 1, s: 1, S: 1 };

  function create(el, ctx, saved) {
    const P = HH.fish, T = G.THREE;
    let s = null, cfg = null, raf = 0, last = 0, paused = false, alive = true, timers = [], lastChanged = 0, glErr = false;
    let wrap, stage, cv, gaugeEl, markEl, okEl, hotEl, brkEl, slkEl, distEl, goalEl, msgEl, hintEl, pullBtn, slackBtn, tiltEl, phoneEl, motionBtn, modeBtn, pauseBtn, albumBtn,
      pauseEl, turnEl, caughtEl, albumEl, powerEl, heartsEl, flashEl, tagsEl, diveEl, faceEl, leftBtn, rightBtn;
    let view = 'top';
    let W = 300, H = 400, pr = 1, slowF = 0, fastF = 0;
    const sget = (k, d) => { try { const v = HH.store && HH.store.get && HH.store.get(k); return v === undefined || v === null ? d : v; } catch (e) { return d; } };
    const sset = (k, v) => { try { if (HH.store && HH.store.set) HH.store.set(k, v); } catch (e) { /* niente salvataggio */ } };
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const sfx = (k, ...a) => { if (ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };
    const asfx = (k, ...a) => { const A = HH.audio || {}; if (A.sfx && typeof A.sfx[k] === 'function') A.sfx[k](...a); };
    const react = (m) => { if (ctx.react) ctx.react(m); };
    const buzz = (ms) => { try { if (G.navigator && G.navigator.vibrate && sget('vibrate', true) !== false) G.navigator.vibrate(ms); } catch (e) { /* non supportato */ } };

    /* ---------- comandi ---------- */
    // pref: 'tilt' (sensori) o 'buttons'; sui telefoni si parte dai sensori se ci sono
    let pref = sget('fish:ctl', coarse() ? 'tilt' : 'buttons');
    const sensor = { at: 0, pitch: 0, zero: 0, roll: 0, rzero: 0, rsum: 0, calib: 0, sum: 0, n: 0, acc: 0, asked: false, granted: false, det: P.newFlick() };
    const hold = { pull: false, slack: false, keyPull: false, keySlack: false, rb: 0, charge: -1, aim: 0, left: false, right: false, keyL: false, keyR: false };
    // bersaglio dell'esca sott'acqua (coordinate della logica); touch: trascinamento relativo
    const lt = { x: 0, y: 0.45, on: false, id: null, px: 0, py: 0, x0: 0, y0: 0, hover: false };
    const drag = { id: null, x0: 0, y0: 0, p: 0, aim: 0 };
    let album = sget('fish:album', {});
    let photoTaken = false;
    const sensorLive = () => performance.now() - sensor.at < 1500;
    const mode = () => (pref === 'tilt' && sensorLive() ? 'tilt' : 'buttons');
    const needPerm = () => { const D = G.DeviceOrientationEvent; return !!(D && typeof D.requestPermission === 'function') && !sensor.granted; };
    function onOrient(e) {
      if (e.beta == null || e.gamma == null) return;
      // angolo dello schermo: window.orientation (iOS, Android) o screen.orientation; se contraddice la forma della
      // finestra (succede in alcuni emulatori) vale la finestra
      let ang = typeof G.orientation === 'number' ? G.orientation : (G.screen && G.screen.orientation && G.screen.orientation.angle) || 0;
      if ((Math.abs(ang) % 180 === 90) !== landscape()) ang = landscape() ? 90 : 0;
      const p = P.pitchFrom(e.beta, e.gamma, ang), rl = P.rollFrom(e.beta, e.gamma, ang);
      const now = performance.now();
      const fresh = now - sensor.at > 3000;
      sensor.pitch = fresh ? p : sensor.pitch * 0.5 + p * 0.5;
      sensor.roll = fresh ? rl : sensor.roll * 0.5 + rl * 0.5;
      sensor.at = now;
      if (fresh) { sensor.zero = sensor.pitch; sensor.rzero = sensor.roll; }
      if (sensor.calib > now) { sensor.sum += sensor.pitch; sensor.rsum += sensor.roll; sensor.n++; sensor.zero = sensor.sum / sensor.n; sensor.rzero = sensor.rsum / sensor.n; }
      // lancio col gesto della canna (solo prima del lancio)
      if (s && s.phase === 'aim' && mode() === 'tilt' && !paused && !caughtOpen()) {
        const pw = P.flick(sensor.det, now / 1000, sensor.pitch, sensor.acc);
        if (pw > 0) doCast(pw, 0);
      }
    }
    function onMotion(e) {
      const a = e.acceleration;
      if (a && a.x != null) sensor.acc = sensor.acc * 0.6 + Math.hypot(a.x, a.y || 0, a.z || 0) * 0.4;
    }
    function calibrate(ms = 500) { sensor.calib = performance.now() + ms; sensor.sum = 0; sensor.rsum = 0; sensor.n = 0; }
    function askMotion() {
      const D = G.DeviceOrientationEvent, M = G.DeviceMotionEvent;
      sensor.asked = true;
      const ok = () => { sensor.granted = true; pref = 'tilt'; sset('fish:ctl', pref); renderMode(); later(() => { if (!sensorLive()) noMotion(); }, 1800); };
      if (D && typeof D.requestPermission === 'function') {
        // iOS: il permesso va chiesto dentro il tocco (prima l'orientamento, poi il movimento)
        let p;
        try { p = D.requestPermission(); } catch (e) { noMotion(); return; }
        Promise.resolve(p).then((r) => {
          if (r !== 'granted') { noMotion(); return; }
          if (M && typeof M.requestPermission === 'function') { try { M.requestPermission().catch(() => {}); } catch (e) { /* facoltativo */ } }
          ok();
        }).catch(noMotion);
      } else ok();
    }
    function noMotion() { pref = 'buttons'; sset('fish:ctl', pref); renderMode(); say(L('fi_nomotion'), 'small'); }
    // forza del mulinello: sensori o pulsanti/tasti (Tira tenuto sale piano fino a 1, Allenta subito)
    function reelInput(dt) {
      if (!s) return 0;
      if (mode() === 'tilt') {
        if (sensor.calib > performance.now()) return 0;
        // sott'acqua l'inclinazione in avanti/indietro porta l'esca su e giù (vedi lureInput), non tira
        const v = s.phase === 'wait' ? 0 : P.tiltToReel(sensor.pitch - sensor.zero);
        // anche coi sensori i pulsanti/tasti, se premuti, comandano
        if (!(hold.pull || hold.keyPull || hold.slack || hold.keySlack)) return v;
      }
      const up = hold.pull || hold.keyPull, down = hold.slack || hold.keySlack;
      if (down && !up) hold.rb = Math.max(-1, Math.min(hold.rb, 0) - dt / 0.12);
      else if (up) hold.rb = Math.min(1, Math.max(hold.rb, 0.3) + dt / 0.7);
      else hold.rb = hold.rb > 0 ? Math.max(0, hold.rb - dt / 0.15) : Math.min(0, hold.rb + dt / 0.15);
      return hold.rb;
    }
    // dove portare l'esca sott'acqua: inclinazione di lato (velocità), avanti/indietro (profondità), mouse (posizione),
    // dito (trascinamento), ◀ ▶ e tasti ←/→ (piano), Allenta = scende, Tira = sale (e riavvicina l'amo)
    function lureInput(dt, reel) {
      if (!s || s.phase !== 'wait' || !s.lu) { lt.on = false; return null; }
      if (!lt.on) { lt.on = true; lt.x = s.lu.tx; lt.y = s.lu.ty; }
      if (mode() === 'tilt' && sensor.calib <= performance.now()) {
        lt.x += P.tiltToLure(sensor.roll - sensor.rzero) * dt;
        const dp = sensor.pitch - sensor.zero, a = Math.abs(dp);
        if (a > 3) lt.y -= Math.sign(dp) * Math.min(1, (a - 3) / 12) * 0.35 * dt;
      }
      const lr = (hold.right || hold.keyR ? 1 : 0) - (hold.left || hold.keyL ? 1 : 0);
      if (lr) lt.x += lr * 0.32 * dt;
      if (hold.slack || hold.keySlack) lt.y += 0.3 * dt;
      if (reel > 0.05) lt.y -= 0.25 * reel * dt;
      lt.x = clamp(lt.x, -1, 1); lt.y = clamp(lt.y, P.Y_TOP, P.Y_BOT);
      return lt;
    }

    const castLabel = (on) => {
      const ico = pullBtn.querySelector('.fi-ico'), lab = pullBtn.querySelector('.fi-lab');
      if (pullBtn._cast === on) return;
      pullBtn._cast = on;
      ico.innerHTML = on ? CASTI : UP; lab.textContent = on ? L('fi_cast') : L('fi_pull');
    };
    function onHoldStart(key) {
      if (paused || !s || caughtOpen() || albumOpen()) return;
      if (key === 'pull' && s.phase === 'aim') { hold.charge = performance.now(); powerEl.style.left = `${W / 2}px`; powerEl.style.top = `${H * 0.62}px`; }
    }
    function onHoldEnd(key) {
      if (key === 'pull' && hold.charge >= 0) { const p = chargeP(); hold.charge = -1; powerEl.hidden = true; if (s && s.phase === 'aim' && p > 0.04) doCast(p, hold.aim); }
    }
    const chargeP = () => (hold.charge < 0 ? 0 : clamp((performance.now() - hold.charge) / 1300, 0, 1));
    // trascinamento sulla scena: in giù (indietro) carica, di lato mira, si lascia per lanciare
    function onDown(e) {
      if (e.target.closest('button, .fi-veil')) return;
      stage.focus({ preventScroll: true });
      // sott'acqua: col dito si trascina l'esca (spostamento relativo), col mouse la si porta dove si punta
      if (!paused && s && s.phase === 'wait' && view === 'uw' && lt.id === null) {
        lt.id = e.pointerId; lt.px = e.clientX; lt.py = e.clientY; lureInput(0, 0); lt.x0 = lt.x; lt.y0 = lt.y;
        try { stage.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
        if (e.pointerType === 'mouse') pointTo(e);
        return;
      }
      if (paused || !s || s.phase !== 'aim' || drag.id !== null) return;
      drag.id = e.pointerId; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.p = 0; drag.aim = 0;
      try { stage.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      const r = stage.getBoundingClientRect();
      powerEl.style.left = `${e.clientX - r.left}px`; powerEl.style.top = `${e.clientY - r.top}px`;
    }
    function pointTo(e) {
      if (!R3 || !s || !s.lu) return;
      const r = stage.getBoundingClientRect(), o3 = fromScreen(e.clientX - r.left, e.clientY - r.top, { x: 0, y: 0 });
      if (o3) { lureInput(0, 0); lt.x = o3.x; lt.y = o3.y; }
    }
    function onMove(e) {
      if (s && s.phase === 'wait' && view === 'uw' && !paused) {
        if (e.pointerType === 'mouse' && (lt.id === null || e.pointerId === lt.id)) { pointTo(e); return; }
        if (e.pointerId === lt.id) { lureInput(0, 0); lt.x = clamp(lt.x0 + (e.clientX - lt.px) / (W * 0.42), -1, 1); lt.y = clamp(lt.y0 + (e.clientY - lt.py) / (H * 0.5), P.Y_TOP, P.Y_BOT); return; }
      }
      if (e.pointerId !== drag.id) return;
      drag.p = clamp((e.clientY - drag.y0) / (H * 0.32), 0, 1);
      drag.aim = clamp(-(e.clientX - drag.x0) / (W * 0.35), -1, 1);
      powerEl.hidden = drag.p < 0.03;
      setPower(drag.p);
    }
    function onUp(e) {
      if (e.pointerId === lt.id) { lt.id = null; return; }
      if (e.pointerId !== drag.id) return;
      drag.id = null; powerEl.hidden = true;
      if (s && s.phase === 'aim' && drag.p > 0.06 && !paused) doCast(drag.p, drag.aim);
      drag.p = 0;
    }
    function setPower(p) { const c = powerEl.querySelector('.fi-pw'); c.setAttribute('stroke-dasharray', `${f1(p * 276.5)} 400`); }
    function onKey(e) {
      if (!alive || !wrap || !wrap.isConnected) return;
      if (e.target && e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
      if (albumOpen()) { if (e.key === 'Escape' || e.key === 'a' || e.key === 'A') { e.preventDefault(); closeAlbum(); } return; }
      if (e.key in KEYS_PULL || e.key in KEYS_SLACK) {
        e.preventDefault();
        if (paused) { resume(); return; }
        if (caughtOpen()) { if (e.key === ' ' && !e.repeat) caughtEl.querySelector('.fi-act.main').click(); return; }
        if (e.key in KEYS_PULL) { if (!hold.keyPull) { hold.keyPull = true; pullBtn.classList.add('on'); onHoldStart('pull'); } }
        else { hold.keySlack = true; slackBtn.classList.add('on'); }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (s && s.phase === 'wait') { if (e.key === 'ArrowLeft') hold.keyL = true; else hold.keyR = true; return; }
        hold.aim = clamp(hold.aim + (e.key === 'ArrowLeft' ? -0.25 : 0.25), -1, 1); return;
      }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); openAlbum(); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (e.key === 'Escape') pause(); else toggle(); }
    }
    function onKeyUp(e) {
      if (e.key in KEYS_PULL && hold.keyPull) { hold.keyPull = false; pullBtn.classList.remove('on'); onHoldEnd('pull'); }
      if (e.key in KEYS_SLACK) { hold.keySlack = false; slackBtn.classList.remove('on'); }
      if (e.key === 'ArrowLeft') hold.keyL = false;
      if (e.key === 'ArrowRight') hold.keyR = false;
    }

    let msgT = 0;
    let R3 = null, C = {}, N = {}, themeKey = '', themeAt = 0;
    let dipT = 0, biteT = 0, castAnim = 0, castP = 0, heldT = 0, swayT = 0, camSnap = false;
    let viewT = 0, viewTo = 'top';
    function goView(v, now) {
      if (viewTo === v && (view === v || !now)) return;
      viewTo = v;
      clearTimeout(viewT);
      const rm = reduce();
      if (diveEl) { diveEl.classList.remove('go'); void diveEl.offsetWidth; diveEl.classList.add('go'); }
      const swap = () => {
        view = v; wrap.dataset.view = v;
        if (v === 'uw' && R3 && R3.uw) { R3.uw.diveK = now ? 1 : 0; R3.uw.cam.x = uwX(s.lu ? s.lu.x : 0) * 0.3; R3.uw.cam.y = -2.5; bubbles(uwX(s.lu ? s.lu.x : 0), -0.6, 0.2, 18, 0.5, 1.2); }
        if (v !== 'uw') { clearTags(); camSnap = true; }
      };
      if (now || rm) swap(); else viewT = setTimeout(() => { if (alive) swap(); }, 420);
    }
    /* ---- Hari nel riquadro: espressione voluta dalla logica (P.mood) o da un evento per un tempo fisso, con isteresi ---- */
    const face = { m: P.newMood('wait'), tr: '', trT: 0, shown: '' };
    function faceEvent(m, sec) { face.tr = m; face.trT = sec; }
    function faceStep(dt) {
      if (!faceEl || !s) return;
      if (face.trT > 0) face.trT -= dt;
      const want = face.trT > 0 ? face.tr : P.mood(s);
      const cur = P.moodStep(face.m, want, dt);
      if (cur !== face.shown) {
        face.shown = cur;
        faceEl.dataset.m = cur;
        faceEl.innerHTML = hariFace(cur);
        const sv = faceEl.firstChild; if (sv && !reduce()) sv.classList.add('pop');
      }
    }
    function hearts(n) {
      if (!heartsEl) return;
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div');
        d.innerHTML = HEART;
        const svg = d.firstChild;
        svg.style.left = `${45 + (Math.random() - 0.5) * 30}%`; svg.style.top = `${46 + Math.random() * 10}%`; svg.style.animationDelay = `${i * 0.12}s`;
        heartsEl.appendChild(svg);
        later(() => svg.remove(), 2000 + i * 120);
      }
    }
    function measure() {
      if (!stage) return;
      W = stage.clientWidth || 300; H = stage.clientHeight || 400;
      if (!R3) return;
      R3.renderer.setSize(W, H, false);
      R3.camera.aspect = W / H;
      // in orizzontale campo più stretto (il lago si vede in largo), in verticale più alto
      R3.camera.fov = W > H ? 46 : 58;
      if (wrap) wrap.classList.toggle('wide', W > H * 1.1);
      R3.camera.updateProjectionMatrix();
      if (R3.uw && R3.uw.bub) R3.uw.bub.m.uniforms.uScale.value = (H * pr) / (2 * Math.tan((R3.camera.fov * Math.PI) / 360));
      checkTurn();
    }

    let lastReel = 0, hudKey = '';
    /* ---------- eventi della logica ---------- */
    let reelClick = 0, wasReel = false, rareSaid = false, scareSaid = 0, scareAt = -1e9;
    function dispatch(e) {
      switch (e.type) {
        case 'cast': asfx('whoosh', e.p); break;
        case 'land': {
          const p = landPos(s.d, s.x); splash(p, 6, 0.6); asfx('splash', 0.4);
          if (mode() === 'tilt') calibrate(500);
          lt.on = false; rareSaid = false;
          later(() => { if (s && s.phase === 'wait') { goView('uw'); later(() => asfx('bubble'), 380); } }, 380);
          break;
        }
        case 'scare': {
          const w = s.sw && s.sw[e.i];
          if (w && R3 && R3.uw) bubbles(uwX(w.x), uwY(w.y), 0, 9, 0.25, 1);
          if (R3 && R3.uw) R3.uw.schools.forEach((sc) => { sc.scat = 1; });
          asfx('fishScare'); buzz(12);
          faceEvent('sad', 1.1);
          const now = performance.now(); scareAt = now;
          if (now - scareSaid > 4500) { scareSaid = now; say(L('fi_scared'), 'small'); }
          break;
        }
        case 'curious': if (P.SP[e.sp].rar >= 3 && !rareSaid) { rareSaid = true; say(L('fi_rare'), 'small'); } break;
        case 'love': asfx('blip'); break;
        case 'far': say(L('fi_far'), 'small'); break;
        case 'nibble': dipT = 0.45; ring(landPos(s.d, s.x), 0.7); sfx('plop'); buzz(15); if (R3 && R3.uw && s.lu) bubbles(uwX(s.lu.x), uwY(s.lu.y), 0, 3, 0.08, 0.7); break;
        case 'bite': biteT = 0.6; splash(landPos(s.d, s.x), 8, 0.8); asfx('fishBite'); say(L('fi_bite')); buzz([60, 40, 90]); faceEvent(P.SP[e.sp].rar >= 3 ? 'wow' : 'surprised', 0.9);
          if (R3 && R3.uw && s.lu) bubbles(uwX(s.lu.x), uwY(s.lu.y), 0, 10, 0.2, 1); break;
        case 'early': say(L('fi_early'), 'small'); react('oops'); faceEvent('sad', 1.4); break;
        case 'missed': say(L('fi_missed'), 'small'); faceEvent('sad', 1.6); break;
        case 'hook': sfx('pick'); asfx('splash', 0.6); buzz(30); goView('top'); changed(true); break;
        case 'run': {
          const p = landPos(s.d, s.x);
          splash(p, 7, 0.7);
          if (s.d > 3 && !R3.jump && (e.qa || Math.random() < 0.45) && !reduce()) {
            const fr = p.clone(), to = p.clone().add(new T.Vector3((Math.random() - 0.5) * 2, 0, -1.2));
            R3.jump = { sp: s.fish.sp, t: 0, dur: 0.75, from: fr, to, h: 0.9, yaw: Math.atan2(to.z - fr.z, to.x - fr.x) * -1 };
          }
          break;
        }
        case 'snap': asfx('twang'); say(L('fi_snap'), 'small'); react('oops'); buzz(120); faceEvent('sad', 2.2); changed(true); break;
        case 'slack': sfx('lightOff'); say(L('fi_slack'), 'small'); react('oops'); faceEvent('sad', 2.2); changed(true); break;
        case 'reel': goView('top'); changed(true); break;
        case 'catch': faceEvent(P.SP[e.sp].rar >= 3 ? 'wow' : 'win', P.SP[e.sp].rar >= 3 ? 1.2 : 0.1); sfx('cupDone'); splash(tmp.bob || landPos(1, 0), 10, 0.9); asfx('splash', 0.8); react('happy'); buzz([30, 30, 30]); showCaught(); changed(true); break;
        default: break;
      }
    }
    function doCast(p, aim) {
      if (!s || s.phase !== 'aim' || paused) return;
      const ev = P.cast(s, p, aim);
      castP = p; castAnim = 0.4;
      ev.forEach(dispatch);
      sensor.det = P.newFlick();
      renderMode();
      changed(true);
    }
    function changed(force) {
      const now = performance.now();
      if (!force && now - lastChanged < 1500) return;
      lastChanged = now;
      ctx.changed();
    }

    /* ---------- pesce preso: guardalo, fotografalo, rimettilo in acqua ---------- */
    function showCaught() {
      const f = s.fish;
      if (!f) return;
      const res = P.albumAdd(album, f, false);
      album = res.album; sset('fish:album', album);
      photoTaken = false;
      const sp = P.SP[f.sp];
      caughtEl.innerHTML = `<div class="fi-card" role="dialog" aria-label="${spName(f.sp)}">
          <span class="fi-new"${res.isNew ? '' : ' hidden'}>${L('fi_new')}</span>
          ${fishSvg(f.sp)}<h3>${spName(f.sp)}</h3>
          <div class="fi-meta"><span>${fmtW(f.g)}</span>${stars(sp.rar)}</div>
          <div class="fi-acts"><button class="fi-act fi-photo" type="button">${CAM}<span>${L('fi_photo')}</span></button>
          <button class="fi-act main fi-rel" type="button">${HEART}<span>${L('fi_release')}</span></button></div></div>`;
      caughtEl.hidden = false; wrap.classList.add('hold');
      paintGoal();
      const ph = caughtEl.querySelector('.fi-photo'), rel = caughtEl.querySelector('.fi-rel');
      ph.onclick = () => {
        if (photoTaken) return;
        photoTaken = true;
        flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
        asfx('shutter');
        album = P.albumAdd(album, { sp: f.sp, g: 0 }, true).album; album[f.sp].n--; sset('fish:album', album);
        ph.disabled = true;
        say(L('fi_photoOk'), 'small');
      };
      rel.onclick = () => releaseFish();
      later(() => { if (caughtOpen()) rel.focus({ preventScroll: true }); }, 300);
    }
    function releaseFish() {
      if (!s || s.phase !== 'caught') return;
      const sp = s.fish.sp;
      const from = R3 && R3.fishes[sp] ? R3.fishes[sp].position.clone() : null;
      const ev = P.release(s, photoTaken);
      caughtEl.hidden = true; caughtEl.innerHTML = ''; wrap.classList.remove('hold');
      if (R3 && from) R3.rel = { sp, t: 0, from, to: landPos(2.2, 0.3) };
      else hearts(4);
      sfx('heart');
      say(L('fi_bye'), 'small');
      const tg = cfg.target && sp === cfg.target;
      paintGoal(tg ? 't' : 'n');
      stage.focus({ preventScroll: true });
      if (ev.some((x) => x.type === 'win')) {
        hint('');
        react('happy');
        later(() => ctx.win(), 1700);
      }
      changed(true);
    }

    /* ---------- album ---------- */
    function openAlbum() {
      if (!albumEl) return;
      if (!paused && s && s.phase === 'fight') pause();
      const cells = P.SPECIES.map((x) => {
        const e = album[x.id];
        return `<div class="fi-cell${e ? '' : ' unseen'}">${e && e.photo ? `<span class="fi-cam">${CAM}</span>` : ''}${fishSvg(x.id)}
          <b>${e ? spName(x.id) : '???'}</b>${stars(x.rar)}<span>${e ? `× ${e.n} · ${L('best')} ${fmtW(e.best)}` : L('fi_unseen')}</span></div>`;
      }).join('');
      albumEl.innerHTML = `<h3>${L('fi_album')}</h3><div class="fi-grid">${cells}</div><button class="fi-act main fi-close" type="button">${L('er_close')}</button>`;
      const cl = albumEl.querySelector('.fi-close');
      cl.onclick = () => { sfx('tap'); closeAlbum(); };
      albumEl.hidden = false;
      cl.focus({ preventScroll: true });
    }
    function closeAlbum() { if (albumEl) { albumEl.hidden = true; albumEl.innerHTML = ''; stage.focus({ preventScroll: true }); } }

    /* ---------- orientamento e schermo intero ---------- */
    const landscape = () => (G.innerWidth || 1) > (G.innerHeight || 1);
    const inFull = () => { const f = fsEl(); return !!(f && wrap && f.contains(wrap)); };
    function checkTurn() {
      if (!turnEl) return;
      // coi sensori serve il telefono in verticale (il lato lungo fa da canna): a schermo intero lo si chiede
      const need = inFull() && coarse() && landscape() && pref === 'tilt' && sensorLive();
      if (need && turnEl.hidden) { turnEl.hidden = false; if (!paused) pause(); pauseEl.hidden = true; }
      else if (!need && !turnEl.hidden) { turnEl.hidden = true; if (paused) pauseEl.hidden = false; }
    }
    function onFull() {
      if (!alive) return;
      try {
        const so = G.screen && G.screen.orientation;
        if (inFull() && coarse() && so && so.lock) so.lock('portrait').catch(() => {});
        else if (!fsEl() && so && so.unlock) so.unlock();
      } catch (e) { /* non supportato */ }
      later(() => { measure(); renderMode(); }, 120);
    }

    // FX: contesto condiviso coi moduli fish-3d.js, fish-models.js, fish-uw.js, fish-view.js, fish-hud.js
    const FX = { el, FB, fProf, symm, TAILS, FCOL, RIDGES, PEC, TAG_Q, HEART, TAG_X, f1, L, BOOK, PAUSE, SNAPI,
      LOOSEI, DOWN, TILT, LEFTI, RIGHTI, PHONE, CASTI, PLAY, HAND, FISHI, TICK, spName, fishArt, reduce, coarse,
      clamp, lerp, COLS, NUMS, T, P, sset, sfx, sensor, hold, drag, sensorLive, mode, needPerm, askMotion, castLabel,
      onHoldStart, onHoldEnd, chargeP, onDown, onMove, onUp, setPower, face, hearts, measure, openAlbum, checkTurn,
      pause, resume,
      // stato che cambia: getter (e setter dove un modulo lo assegna)
      get glErr() { return glErr; }, set glErr(v) { glErr = v; }, get cfg() { return cfg; }, get s() { return s; },
      get wrap() { return wrap; }, set wrap(v) { wrap = v; }, get cv() { return cv; }, set cv(v) { cv = v; },
      get tagsEl() { return tagsEl; }, set tagsEl(v) { tagsEl = v; }, get stage() { return stage; }, set stage(v) { stage = v; },
      get gaugeEl() { return gaugeEl; }, set gaugeEl(v) { gaugeEl = v; }, get markEl() { return markEl; }, set markEl(v) { markEl = v; },
      get okEl() { return okEl; }, set okEl(v) { okEl = v; }, get hotEl() { return hotEl; }, set hotEl(v) { hotEl = v; },
      get brkEl() { return brkEl; }, set brkEl(v) { brkEl = v; }, get slkEl() { return slkEl; }, set slkEl(v) { slkEl = v; },
      get distEl() { return distEl; }, set distEl(v) { distEl = v; }, get goalEl() { return goalEl; }, set goalEl(v) { goalEl = v; },
      get msgEl() { return msgEl; }, set msgEl(v) { msgEl = v; }, get hintEl() { return hintEl; }, set hintEl(v) { hintEl = v; },
      get pullBtn() { return pullBtn; }, set pullBtn(v) { pullBtn = v; }, get slackBtn() { return slackBtn; }, set slackBtn(v) { slackBtn = v; },
      get tiltEl() { return tiltEl; }, set tiltEl(v) { tiltEl = v; }, get phoneEl() { return phoneEl; }, set phoneEl(v) { phoneEl = v; },
      get motionBtn() { return motionBtn; }, set motionBtn(v) { motionBtn = v; }, get modeBtn() { return modeBtn; }, set modeBtn(v) { modeBtn = v; },
      get pauseBtn() { return pauseBtn; }, set pauseBtn(v) { pauseBtn = v; }, get albumBtn() { return albumBtn; }, set albumBtn(v) { albumBtn = v; },
      get pauseEl() { return pauseEl; }, set pauseEl(v) { pauseEl = v; }, get turnEl() { return turnEl; }, set turnEl(v) { turnEl = v; },
      get caughtEl() { return caughtEl; }, set caughtEl(v) { caughtEl = v; }, get albumEl() { return albumEl; }, set albumEl(v) { albumEl = v; },
      get powerEl() { return powerEl; }, set powerEl(v) { powerEl = v; }, get heartsEl() { return heartsEl; }, set heartsEl(v) { heartsEl = v; },
      get flashEl() { return flashEl; }, set flashEl(v) { flashEl = v; }, get diveEl() { return diveEl; }, set diveEl(v) { diveEl = v; },
      get faceEl() { return faceEl; }, set faceEl(v) { faceEl = v; }, get leftBtn() { return leftBtn; }, set leftBtn(v) { leftBtn = v; },
      get rightBtn() { return rightBtn; }, set rightBtn(v) { rightBtn = v; }, get pr() { return pr; }, set pr(v) { pr = v; }, get W() { return W; },
      get H() { return H; }, get pref() { return pref; }, set pref(v) { pref = v; }, get msgT() { return msgT; }, set msgT(v) { msgT = v; },
      get themeKey() { return themeKey; }, set themeKey(v) { themeKey = v; }, get C() { return C; }, set C(v) { C = v; },
      get N() { return N; }, set N(v) { N = v; }, get R3() { return R3; }, set R3(v) { R3 = v; },
      get dipT() { return dipT; }, set dipT(v) { dipT = v; }, get biteT() { return biteT; }, set biteT(v) { biteT = v; },
      get castAnim() { return castAnim; }, set castAnim(v) { castAnim = v; }, get heldT() { return heldT; }, set heldT(v) { heldT = v; },
      get swayT() { return swayT; }, set swayT(v) { swayT = v; }, get camSnap() { return camSnap; }, set camSnap(v) { camSnap = v; },
      get lastReel() { return lastReel; }, get hudKey() { return hudKey; }, set hudKey(v) { hudKey = v; }, get scareAt() { return scareAt; },
      get toggle() { return toggle; }, get qa() { return qa; } };
    // 3D di base e scena: renderer, materiali, geometria fusa, acqua, lago, mare, pontile, Hari, canna: fish-3d.js
    const { readTheme, prMax, initGL, keep, toon, basic, outline, bake, mesh, GEO, HARI, disposeScene, buildScene,
      wave, fish3 } = Object.assign(FX, HH.fish3d(FX));
    // pesci 3D: forme per specie, pinne, nuoto, spruzzi: fish-models.js
    const { buildFish, swimUp, splash, ring } = Object.assign(FX, HH.fishModels(FX));
    // sott'acqua: fondale, animaletti, laboratorio, disegno e indicatori: fish-uw.js
    const { uwX, uwY, buildUW, drawLab, fromScreen, drawUW, clearTags } = Object.assign(FX, HH.fishUW(FX));
    // disegno della superficie: galleggiante, camera, lenza: fish-view.js
    const { v3, tmp, landPos, draw, bubbles } = Object.assign(FX, HH.fishView(FX));
    // DOM del gioco, messaggi e indicatori: fish-hud.js
    const { build, caughtOpen, albumOpen, renderMode, say, hint, paintGoal, hud } = Object.assign(FX, HH.fishHud(FX));

    /* ---------- ciclo ---------- */
    function loop(nowMs) {
      if (!alive) return;
      if (!el.isConnected) { detach(); return; }
      const dt = last ? Math.min(0.1, (nowMs - last) / 1000) : 0;
      last = nowMs;
      if (nowMs - themeAt > 1000) { themeAt = nowMs; if (readTheme()) { buildScene(); measure(); } }
      if (dt > 0) {
        if (dt > 1 / 36) { slowF++; fastF = 0; } else if (dt < 1 / 55) { fastF++; slowF = Math.max(0, slowF - 1); }
        if (slowF > 45 && pr > 0.7) { pr = Math.max(0.7, pr - 0.25); R3.renderer.setPixelRatio(pr); measure(); slowF = 0; }
        else if (fastF > 400 && pr < Math.min(prMax(), G.devicePixelRatio || 1)) { pr = Math.min(prMax(), pr + 0.25); R3.renderer.setPixelRatio(pr); measure(); fastF = 0; }
      }
      if (!paused && dt > 0 && !P.isOver(s) && !caughtOpen() && !albumOpen() && !qa.hold) {
        lastReel = qa.reel != null ? qa.reel : reelInput(dt);
        const lu = qa.lure || lureInput(dt, lastReel);
        const ev = P.step(s, dt, lu ? { reel: lastReel, lx: lu.x, ly: lu.y } : { reel: lastReel });
        ev.forEach(dispatch);
        if (s.phase !== 'wait' && s.phase !== 'bite' && view === 'uw' && !viewPending()) goView('top', true);
        if (s.phase === 'fight') {
          // mulinello: clic più fitti quando si tira forte
          if (lastReel > 0.08) { reelClick -= dt; if (reelClick <= 0) { asfx('reel', lastReel); reelClick = 0.16 - lastReel * 0.1; } }
          changed(false);
        }
        wasReel = lastReel > 0.08;
      }
      if (R3 && !qa.noDraw) {
        const f0 = performance.now();
        if (qa.lab && R3.scene) drawLab(dt, nowMs / 1000);
        else if (view === 'uw' && R3.uw && s.lu) drawUW(dt, nowMs / 1000); else draw(dt, nowMs);
        if (qa.sync) R3.renderer.getContext().finish();
        const fm = performance.now() - f0;
        perf.n++; perf.sum += fm; if (fm > perf.max) perf.max = fm;
      }
      if (!paused) faceStep(dt);
      hud();
      raf = paused ? 0 : requestAnimationFrame(loop);
    }
    const perf = { n: 0, sum: 0, max: 0 };
    const viewPending = () => viewTo !== view;
    function start() { if (!raf && alive) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function pause() {
      if (paused || !s || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = !turnEl.hidden;
      pauseBtn.innerHTML = PLAY;
      hold.pull = hold.slack = hold.keyPull = hold.keySlack = hold.left = hold.right = hold.keyL = hold.keyR = false; hold.rb = 0; hold.charge = -1; drag.id = null; lt.id = null; powerEl.hidden = true;
      pullBtn.classList.remove('on'); slackBtn.classList.remove('on'); leftBtn.classList.remove('on'); rightBtn.classList.remove('on');
      stop();
      if (R3) { if (view === 'uw' && R3.uw && s.lu) drawUW(0, performance.now() / 1000); else draw(0, performance.now()); }
      ctx.changed();
    }
    function resume() {
      if (!paused || !turnEl.hidden) return;
      paused = false;
      pauseEl.hidden = true;
      pauseBtn.innerHTML = PAUSE;
      if (mode() === 'tilt' && s && (s.phase === 'fight' || s.phase === 'wait')) calibrate(400);
      lt.on = false;
      sfx('tap');
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    function begin(state, startPaused) {
      stop(); clearTimers();
      s = state; cfg = P.config(s.level);
      if (!wrap || !wrap.isConnected) build();
      wrap.dataset.stage = cfg.stage;
      paused = false; pauseEl.hidden = true; pauseBtn.innerHTML = PAUSE;
      caughtEl.hidden = true; caughtEl.innerHTML = ''; wrap.classList.remove('hold'); closeAlbum();
      hold.rb = 0; hold.charge = -1; hold.aim = 0; drag.id = null;
      themeKey = '';
      paintGoal(); renderMode(); hudKey = '';
      if (!initGL()) { stage.insertAdjacentHTML('beforeend', `<div class="fi-veil"><b>${L('ry_nogl')}</b></div>`); return; }
      readTheme(); buildScene(); measure();
      themeAt = performance.now();
      clearTimeout(viewT); view = viewTo = 'top'; wrap.dataset.view = 'top'; lt.on = false; lt.id = null; face.m = P.newMood('wait'); face.shown = ''; face.trT = 0;
      if (s.phase === 'wait' && s.lu) goView('uw', true);
      if (s.phase === 'caught') showCaught();
      if (!s.t && !s.caught.length) {
        later(() => say(L('fi_goal').replace('{n}', cfg.goal)), 500);
        if (cfg.target) later(() => say(L('fi_target').replace('{sp}', spName(cfg.target)), 'small'), 2600);
      }
      start();
      if (startPaused) pause();
    }
    function fresh() { begin(P.newLevel(ctx.level, Math.random)); ctx.changed({ reset: true }); }

    /* ---------- pulizia ---------- */
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function onTheme() { themeAt = 0; }
    function onVis() { if (document.hidden) pause(); }
    function onBlur() { hold.pull = hold.slack = hold.keyPull = hold.keySlack = hold.left = hold.right = hold.keyL = hold.keyR = false; if (pullBtn) { pullBtn.classList.remove('on'); slackBtn.classList.remove('on'); leftBtn.classList.remove('on'); rightBtn.classList.remove('on'); } }
    function onResize() { measure(); renderMode(); }
    function detach() {
      alive = false;
      stop(); clearTimers(); clearTimeout(msgT); clearTimeout(viewT);
      G.removeEventListener('keydown', onKey); G.removeEventListener('keyup', onKeyUp); G.removeEventListener('blur', onBlur);
      G.removeEventListener('deviceorientation', onOrient); G.removeEventListener('devicemotion', onMotion); G.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.removeEventListener(ev, onFull));
      try { const so = G.screen && G.screen.orientation; if (so && so.unlock) so.unlock(); } catch (e) { /* non supportato */ }
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._fiRO) { el._fiRO.disconnect(); el._fiRO = null; }
      clearInterval(watch);
      if (R3) { disposeScene(); try { R3.grad.dispose(); R3.renderer.dispose(); R3.renderer.forceContextLoss(); } catch (e) { /* già perso */ } R3 = null; }
    }
    if (el._fiDetach) el._fiDetach();
    el._fiDetach = detach;
    G.addEventListener('keydown', onKey); G.addEventListener('keyup', onKeyUp); G.addEventListener('blur', onBlur);
    G.addEventListener('deviceorientation', onOrient); G.addEventListener('devicemotion', onMotion); G.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, onFull));
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);
    const watch = setInterval(() => { if (!el.isConnected || (wrap && !wrap.isConnected)) detach(); else { renderMode(); } }, 1000);

    // QA (Playwright): stato, lancio, mulinello forzato
    const qa = { hold: false, reel: null, noDraw: false, lure: null, sync: false, lab: null };
    el._fish = {
      state: () => s, cast: (p, a) => doCast(p, a || 0), reel: (r) => { qa.reel = r; }, freeze: (on) => { qa.hold = !!on; }, noDraw: (on) => { qa.noDraw = !!on; },
      showFish: (sp) => { if (!s) return; s.phase = 'caught'; s.fish = { sp, g: P.SP[sp].g[1] }; showCaught(); },
      mode, sensor: () => Object.assign({}, sensor, { det: Object.assign({}, sensor.det) }), release: releaseFish, album: () => album, openAlbum, closeAlbum,
      info: () => { if (!R3) return null; const i = R3.renderer.info.render; return { calls: i.calls, tris: i.triangles, pr, view, frame: perf.n ? +(perf.sum / perf.n).toFixed(2) : 0, frameMax: +perf.max.toFixed(1), frames: perf.n }; },
      start: (lv, seed) => begin(P.newLevel(lv, seed ? HH.rng(seed) : Math.random)),
      sync: (on) => { qa.sync = !!on; },
      // tavola delle specie: { yaw, elev, t (fisso), k } oppure null
      lab: (o) => { qa.lab = o || null; },
      // salto del pesce in lotta (come all'evento 'run') · direzione della testa dei pesci sott'acqua (x del mondo)
      jump: (dur, side) => {
        if (!s || !s.fish || !R3) return;
        dispatch({ type: 'run', qa: true });
        const J = R3.jump; if (!J) return;
        if (dur) J.dur = dur;
        if (side) { J.to.copy(J.from).add(new T.Vector3(side, 0, -0.4)); J.h = 1.2; J.yaw = -Math.atan2(J.to.z - J.from.z, J.to.x - J.from.x); }
      },
      heads: () => {
        if (!R3 || !R3.uw) return [];
        const o = [], v = new T.Vector3(), p = new T.Vector3();
        for (const w of s.sw || []) { const e = R3.uw.byId[w.id]; if (!e) continue; e.g.updateMatrixWorld(true); e.g.getWorldPosition(p); e.g.localToWorld(v.set(1, 0, 0)).sub(p); o.push({ sp: w.sp, st: w.st, h: w.h, head: +v.x.toFixed(3) }); }
        return o;
      },
      perfReset: () => { perf.n = 0; perf.sum = 0; perf.max = 0; },
      lure: (x, y) => { qa.lure = x == null ? null : { x, y: y == null ? 0.45 : y }; }, face: () => face.shown, faceEvent, view: () => view,
    };

    const restored = saved && P.migrate(JSON.parse(JSON.stringify(saved)));
    if (restored) begin(restored, restored.phase === 'fight');
    else begin(P.newLevel(ctx.level, Math.random));
    if (fsEl()) onFull();

    return {
      fresh,
      restart: fresh,
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },
      resume() { resume(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'fish', name: 'Hari Fishing', rules: 'r_fish', rulesEn: RULES_EN,
    art, create, tutorial: TUT, _face: hariFace, _fishSvg: fishSvg,
    fill: true,                 // a schermo intero la scena riempie tutto il riquadro
    rate: (s) => HH.fish.rate(s),
    parTime: (s) => HH.fish.par(s),
    progress: (s) => HH.fish.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
