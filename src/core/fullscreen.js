/* Hari Hari Puzzle — schermo intero dei giochi (HH.fullscreen): entrata e uscita, uscita del browser (indietro o
 * cambio d'app), velo «torna a schermo intero», barra e menu del logo nel riquadro, adattamento del gioco alla misura
 * (fill · side · stack). Legge lo stato dell'app da HH.app (S, goHome, audioState/audioLabel) solo al momento dell'uso.
 * Vedi docs/architecture.md, «Schermo intero». */
(function (G) {
  const HH = G.HH;
  const A = (HH.app = HH.app || {});
  const { t, $, lab, ICON } = HH.ui;
  const sfx = HH.fx.sfx;

  /* ---------- schermo intero: l'unica modalità dei giochi ----------
   * Si gioca SEMPRE a schermo intero; la home invece è in vista normale (uscendo da un gioco si esce anche dallo schermo
   * intero). A schermo intero va tutto il documento (<html>), non il solo riquadro: le finestre di vittoria, sconfitta,
   * tutorial e i dialoghi, che stanno nel <body>, restano visibili sopra al gioco. La disposizione "a tutto schermo"
   * (classe html.fs-on, regole .fs-on .plate) è legata al gioco aperto, non allo stato del browser: dove l'API non c'è
   * (iPhone) o il browser la rifiuta (iframe, permessi) la stessa disposizione fa da pseudo-schermo intero.
   * Uscita dallo schermo intero fatta dal browser mentre si gioca (vedi docs/architecture.md, "Schermo intero"):
   *  - pagina visibile = tasto indietro / gesto indietro / Esc → si torna subito alla home (una volta sola);
   *  - pagina nascosta subito prima o subito dopo (cambio app, blocco schermo, notifica a tutto schermo) → il gioco resta,
   *    in pausa sotto un velo con Hari: il primo tocco rientra a schermo intero e riprende la partita. */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFull = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isFull = () => !!fsEl();
  const inFs = () => document.documentElement.classList.contains('fs-on');   // gioco aperto (vero o pseudo-schermo intero)
  const now = () => Date.now();
  const FS_WAIT = 350;                   // finestra dopo l'uscita: se la pagina si nasconde entro questo tempo è un cambio d'app
  const FS_BACK_GRACE = 1000;            // uscita notificata entro 1 s dal ritorno in primo piano: era il cambio d'app
  let fsDenied = false;                  // rifiutato anche con un tocco (iframe, permessi): pseudo-schermo intero per la sessione
  let fsAsk = null;                      // richiesta in corso (Promise<boolean>)
  let fsOnAt = 0, hidAt = 0, visAt = 0, lostT = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) hidAt = now(); else visAt = now(); });
  // entra a schermo intero: va chiamata dentro un gesto (tocco su una card, sul velo, su "Accetto"). sure = il chiamante
  // sa di essere dentro un tocco: se il browser rifiuta lo stesso, si gioca in pseudo-schermo intero.
  function enterFull(sure) {
    if (!canFull() || fsDenied) return Promise.resolve(false);
    if (isFull()) return Promise.resolve(true);
    if (fsAsk) return fsAsk;
    const ua = G.navigator.userActivation;
    if (ua && !ua.isActive) return Promise.resolve(false);   // senza un tocco il browser rifiuterebbe: niente errori in console
    const d = document.documentElement;
    let r;
    try { r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: 'hide' }); } catch (e) { r = Promise.reject(e); }
    // il vecchio webkitRequestFullscreen non restituisce una Promise: si guarda lo stato poco dopo
    if (!r || typeof r.then !== 'function') r = new Promise((ok, ko) => setTimeout(() => (isFull() ? ok() : ko()), 400));
    const p = r.then(() => true, () => { if (sure || ua) fsDenied = true; return false; });
    fsAsk = p;
    p.then(() => { if (fsAsk === p) fsAsk = null; });
    return p;
  }
  // uscita voluta dall'app (ritorno alla home): non deve contare come "indietro"
  function exitFull() {
    clearTimeout(lostT);
    if (!isFull()) return;
    try { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (r && r.catch) r.catch(() => {}); } catch (e) { /* non supportato */ }
  }
  // apertura di un gioco: si entra a schermo intero subito, dentro il tocco sulla card (prima dello scaricamento
  // asincrono e della transizione, che farebbero scadere il gesto)
  function autoFull() { if (!isFull()) enterFull(false); }
  function fsClass(on) { document.documentElement.classList.toggle('fs-on', !!on); }

  /* velo "torna a schermo intero": Hari e un grande pulsante. Compare quando il browser ha tolto lo schermo intero con
   * l'app in background, alla ripresa della partita all'avvio e col link diretto (nessun gesto, il browser non lo
   * permette). La partita resta com'era (nessuna ricarica): il gioco va in pausa solo se non è in rete (i giochi in
   * rete gestiscono da soli la pagina nascosta, e la connessione non deve cadere). */
  let veilPaused = false;
  const veilOn = () => { const v = $('#fsVeil'); return !!(v && !v.hidden); };
  const netLive = () => !!(A.S.inst && typeof A.S.inst.online === 'function' && A.S.inst.online());
  // tutorial, vittoria o sconfitta aperti: il gioco è già fermo e lo resta (il velo non lo tocca)
  const dlgOpen = () => !$('#tutDlg').hidden || !$('#winDlg').hidden || !$('#loseDlg').hidden;
  function showVeil() {
    if (!A.S.game || isFull() || !canFull() || fsDenied) return;
    let v = $('#fsVeil');
    if (!v) {
      v = document.createElement('div');
      v.id = 'fsVeil'; v.className = 'overlay fs-veil';
      v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
      document.body.appendChild(v);
      v.addEventListener('click', onVeilTap);
      v.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVeilTap(); } });
    }
    v.innerHTML = `<div class="fs-veil-hari">${HH.mascot.svg({ cls: 'hari' })}</div>
      <button class="fs-veil-go" type="button" aria-label="${lab('full', 'Full screen')}">${ICON.full}</button>
      <p class="fs-veil-tap" aria-hidden="true">${lab('pa_tap', 'Tap to continue')}</p>`;
    v.hidden = false;
    fsMenu(false);
    if (A.S.inst && A.S.inst.pause && !netLive() && !veilPaused && !dlgOpen()) { veilPaused = true; try { A.S.inst.pause(); } catch (e) { /* gioco già chiuso */ } }
    HH.music.duck(true);
    const b = v.querySelector('.fs-veil-go');
    if (b && !document.hidden) b.focus({ preventScroll: true });
  }
  function hideVeil() {
    const v = $('#fsVeil');
    if (!v || v.hidden) return;
    v.hidden = true; v.innerHTML = '';
    if (!dlgOpen()) HH.music.duck(false);
    if (veilPaused) { veilPaused = false; if (A.S.inst && A.S.inst.resume) { try { A.S.inst.resume(); } catch (e) { /* gioco già chiuso */ } } }
    refitSoon();
  }
  // primo tocco sul velo: rientra (dentro il tocco) e riprende subito; se il browser rifiuta, si gioca lo stesso
  function onVeilTap() {
    sfx.tap();
    HH.audio.unlock();
    enterFull(true);
    hideVeil();
  }
  // senza schermo intero mentre si gioca e senza un tocco per entrarci: velo (appena finisce la richiesta in corso)
  function fsEnsure() {
    if (!A.S.game || isFull() || !canFull() || fsDenied) return;
    if (fsAsk) { fsAsk.then(() => fsEnsure()); return; }
    showVeil();
  }
  // lo schermo intero è finito da solo mentre si giocava: cambio d'app o indietro?
  function fsLost() {
    const t0 = now();
    const bg = () => document.hidden || hidAt >= t0 || (hidAt > fsOnAt && visAt >= hidAt && t0 - visAt < FS_BACK_GRACE);
    clearTimeout(lostT);
    if (bg()) { showVeil(); return; }
    lostT = setTimeout(() => {
      if (!A.S.game || A.S.leaving || isFull()) return;
      if (bg()) { showVeil(); return; }
      fsBack();
    }, FS_WAIT);
  }
  // indietro: alla home con la transizione. La voce della history del gioco si toglie qui (A.S.pushed = false prima,
  // così il popstate che segue non rifà nulla: goHome è già in corso, A.S.leaving)
  function fsBack() {
    if (!A.S.game || A.S.leaving) return;
    const pushed = A.S.pushed;
    A.S.pushed = false;
    A.goHome();
    if (pushed) { try { history.back(); } catch (e) { /* niente history */ } }
  }
  // a schermo intero la barra degli indicatori sta nel riquadro (compatta)
  function placeHud() {
    const hud = document.querySelector('#game .hud'), slot = $('#gFsHud'), plate = $('#gPlate');
    if (!hud || !slot || !plate) return;
    if (inFs()) { if (hud.parentElement !== slot) slot.appendChild(hud); }
    else if (hud.parentElement === slot) plate.before(hud);
    fsMenu(false);
  }
  // menu del logo: le azioni della barra e degli strumenti del gioco
  function fsMenu(open) {
    const box = $('#gFsMenuBox'), btn = $('#gFsMenu');
    if (!box || !btn) return;
    if (open === undefined) open = box.hidden;
    if (open) {
      const items = [
        ['home', ICON.home, lab('goHome', 'All games'), '#gBack'],
        ['undo', ICON.undo, t('undo'), '#gUndo'],
        ['restart', ICON.restart, t('restart'), '#gRestart'],
        ['new', ICON.sparkle, t('newg'), '#gNew'],
        ['help', '<b class="q">?</b>', lab('help', 'How to play'), '#gHelp'],
        ['audio', ICON.audio, A.audioLabel(), '#audioBtn'],
      ].filter(([, , , sel]) => !sel || $(sel));
      box.innerHTML = items.map(([id, ic, label]) => `<button role="menuitem" data-fs="${id}">${ic}<span>${label}</span></button>`).join('');
      box.querySelectorAll('[data-fs="audio"]').forEach((b) => { b.dataset.state = A.audioState(); });
    }
    box.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }
  /* schermo intero: il gioco si adatta allo spazio (larghezza E altezza). Si cerca la --game-w più grande per cui il
   * contenuto entra nel riquadro: niente scorrimento in orizzontale (telefono girato) e giochi grandi sui tablet.
   * Tre modi (vedi docs/architecture.md, "Schermo intero"):
   *  - fill: il gioco dichiara fill: true, il suo contenitore riempie tutto e la scena si adatta alla misura reale;
   *  - side: riquadro largo (orizzontale) e gioco "a pila" (barra, griglia, piede): il pezzo più grande va al centro e
   *          gli altri ai lati (quelli prima a sinistra, quelli dopo a destra), così la griglia usa tutta l'altezza;
   *  - stack: la pila normale, centrata, alla larghezza più grande che entra. */
  const SIDE = ['fs-side-c', 'fs-spread', 'fs-main', 'fs-a', 'fs-b'];
  let sideOn = '';                       // '' · 'side' · 'spread'
  function sideParts(bd) {
    const flow = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed'; };
    let host = bd, kids = [...bd.children].filter(flow);
    if (kids.length === 1) {
      host = kids[0];
      const cs = getComputedStyle(host);
      // solo le pile verticali: chi ha già un suo layout (griglia, riga) se lo tiene
      if (!(cs.display === 'flex' && cs.flexDirection === 'column') && !host.classList.contains('fs-side-c') && !host.classList.contains('fs-spread')) return null;
      kids = [...host.children].filter(flow);
    }
    if (kids.length < 2) return null;
    let main = kids[0], best = -1;
    for (const k of kids) { const r = k.getBoundingClientRect(), a = r.width * r.height; if (a > best) { best = a; main = k; } }
    return { host, kids, main };
  }
  function clearSide(bd) {
    sideOn = '';
    if (sideMO) sideMO.disconnect();
    bd.querySelectorAll('.fs-side-c, .fs-spread, .fs-main, .fs-a, .fs-b').forEach((e) => { e.classList.remove(...SIDE); e.style.removeProperty('grid-row'); e.style.removeProperty('--fs-rows'); });
    bd.classList.remove('fs-side-c', 'fs-spread'); bd.style.removeProperty('--fs-rows');
  }
  // side: colonne ai lati · spread: pila alta quanto il riquadro, i pezzi prima in alto (attaccati alla barra), quelli
  // dopo in basso, il principale centrato nello spazio in mezzo
  function tagSide(parts, mode = 'side') {
    const { host, kids, main } = parts, m = kids.indexOf(main);
    host.classList.remove('fs-side-c', 'fs-spread');
    host.classList.add(mode === 'side' ? 'fs-side-c' : 'fs-spread');
    host.style.setProperty('--fs-rows', Math.max(m, kids.length - 1 - m, 1));
    kids.forEach((k, i) => {
      k.classList.remove(...SIDE);
      k.style.removeProperty('grid-row');
      if (k === main) { k.classList.add('fs-main'); return; }
      k.classList.add(i < m ? 'fs-a' : 'fs-b');
      if (mode === 'side') k.style.gridRow = String(2 + (i < m ? i : i - m - 1));
    });
    sideOn = mode;
    if (sideMO) { sideMO.disconnect(); sideMO.observe($('#board'), { childList: true }); if (host.id !== 'board') sideMO.observe(host, { childList: true }); }
  }
  // area "disegnata" di un pezzo: la somma dei suoi figli (pulsanti, icone), o il pezzo stesso se non ne ha
  function inkArea(k) {
    const kids = [...k.children];
    if (!kids.length) { const r = k.getBoundingClientRect(); return r.width * r.height; }
    return kids.reduce((a, c) => { const r = c.getBoundingClientRect(); return a + r.width * r.height; }, 0);
  }
  function fitFs() {
    const pl = $('#gPlate'), bd = $('#board');
    if (!pl || !bd) return;
    clearSide(bd);
    if (!inFs()) { pl.classList.remove('fs-fit', 'fs-scroll', 'fs-fill'); pl.style.removeProperty('--game-w'); pl.style.removeProperty('--fs-h'); return; }
    if (bd.querySelector(':scope > .dr-wrap')) return;               // Hari Taxi riempie già lo schermo da solo
    pl.classList.add('fs-fit');
    pl.classList.remove('fs-scroll');
    const box = bd.getBoundingClientRect();
    pl.style.setProperty('--fs-h', `${Math.floor(box.height)}px`);
    // contratto "fill": il contenitore del gioco riempie TUTTO il riquadro e la scena si adatta (ResizeObserver o resize)
    if (A.S.game && A.S.game.fill) {
      pl.classList.add('fs-fill');
      pl.style.setProperty('--game-w', `${Math.floor(box.width)}px`);
      return done();
    }
    pl.classList.remove('fs-fill');
    const setW = (w) => pl.style.setProperty('--game-w', `${Math.floor(w)}px`);
    const inBox = (r) => r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && r.left >= box.left - 1 && r.right <= box.right + 1;
    const fits = (w) => {
      setW(w);
      let top = Infinity, bottom = -Infinity, right = -Infinity, left = Infinity;
      // figli e nipoti: un contenitore può essere più piccolo di quello che contiene
      for (const c of bd.children) {
        for (const e of [c, ...c.children]) {
          if (e !== c) { const cs = getComputedStyle(e); if (cs.position === 'absolute' || cs.position === 'fixed') continue; }
          const r = e.getBoundingClientRect(); if (!r.height) continue;
          top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); left = Math.min(left, r.left); right = Math.max(right, r.right);
        }
      }
      return bottom - top <= box.height + 1 && right - left <= box.width + 1;
    };
    // a lato: tutto dentro il riquadro, i pezzi laterali non invadono la colonna centrale
    const fitsSide = (w, parts) => {
      setW(w);
      const mr = parts.main.getBoundingClientRect();
      if (!inBox(mr)) return false;
      return parts.kids.every((k) => {
        if (k === parts.main) return true;
        const r = k.getBoundingClientRect();
        if (!r.height) return true;
        if (!inBox(r)) return false;
        // un pezzo laterale non si rimpicciolisce (un nastro, una scena che scala con la larghezza): se in colonna il suo
        // contenuto occupa molta meno area che in pila è stato schiacciato, meglio la pila (testo e pulsanti si ridispongono)
        if (inkArea(k) < (parts.a0.get(k) || 0) * 0.4) return false;
        const left = k.classList.contains('fs-a');
        // anche i figli (un pulsante che sborda dal suo contenitore conta)
        return [r, ...[...k.children].map((c) => c.getBoundingClientRect()).filter((q) => q.width && q.height)]
          .every((q) => inBox(q) && (left ? q.right <= mr.left + 1 : q.left >= mr.right - 1));
      });
    };
    const search = (ok, lo, hi) => { for (let i = 0; i < 11; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; } return lo; };
    // tetto: tutta la larghezza (l'altezza la limita fits); minimo basso (180) perché col telefono girato i giochi a
    // griglia entrino interi invece di scorrere
    const MIN = 180, hi0 = Math.max(MIN, box.width);
    let wStack = 0;
    if (fits(hi0)) wStack = hi0;
    else if (fits(MIN)) wStack = search(fits, MIN, hi0);
    // riquadro largo: si prova anche la disposizione a lato e si tiene quella col pezzo principale più grande
    const parts = box.width > box.height * 1.25 ? sideParts(bd) : null;
    if (parts) {
      const area = () => { const r = parts.main.getBoundingClientRect(); return r.width * r.height; };
      let aStack = 0;
      fits(wStack || MIN);
      if (wStack) aStack = area();
      parts.a0 = new Map(parts.kids.map((k) => [k, inkArea(k)]));
      tagSide(parts);
      const hiS = box.width;
      let wSide = 0;
      if (fitsSide(hiS, parts)) wSide = hiS;
      else if (fitsSide(MIN, parts)) wSide = search((w) => fitsSide(w, parts), MIN, hiS);
      if (wSide) { fitsSide(wSide, parts); if (area() > aStack * 1.08) return done(); }
      clearSide(bd);
    }
    if (wStack) {
      fits(wStack);
      const sp = sideParts(bd);
      if (sp) tagSide(sp, 'spread');
      return done();
    }
    // anche al minimo non entra (telefono girato con un gioco "alto"): larghezza comoda e si scorre in verticale
    pl.classList.add('fs-scroll');
    setW(Math.min(box.width, 340));
    return done();
    function done() {
    selfResize = true;
    G.dispatchEvent(new Event('resize'));                              // i giochi su canvas ridisegnano alla nuova misura
    }
  }
  // i giochi che ridisegnano il proprio contenitore a ogni mossa perderebbero la disposizione a lato: la si rimette
  // subito (il callback del MutationObserver gira prima del disegno, quindi niente salti)
  // (si osservano solo i figli diretti della tavola e del contenitore, non tutto il sotto-albero: costa niente)
  const sideMO = G.MutationObserver ? new G.MutationObserver(() => {
    if (!sideOn) return;
    const bd = $('#board');
    if (!bd) return;
    const host = bd.matches('.fs-side-c, .fs-spread') ? bd : bd.querySelector(':scope > .fs-side-c, :scope > .fs-spread');
    if (host && [...host.children].every((k) => k.classList.contains('fs-main') || k.classList.contains('fs-a') || k.classList.contains('fs-b') || getComputedStyle(k).position === 'absolute' || getComputedStyle(k).display === 'none')) return;
    const parts = sideParts(bd);
    if (parts) tagSide(parts, sideOn); else refitSoon();
  }) : null;
  let fitT = 0, selfResize = false;
  G.addEventListener('resize', () => { if (selfResize) { selfResize = false; return; } if (!inFs()) return; clearTimeout(fitT); fitT = setTimeout(fitFs, 120); });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => {
    if (isFull()) { fsOnAt = now(); clearTimeout(lostT); hideVeil(); }
    else if (A.S.game && !A.S.leaving) fsLost();       // tolto dal browser mentre si gioca (indietro, Esc, cambio app)
    setTimeout(fitFs, 60);
  }));
  // ogni nuovo livello (vittoria → avanti, ricomincia, nuovo) può cambiare misura: si riadatta il riquadro
  let refitT = 0;
  const refitSoon = () => { if (!inFs()) return; clearTimeout(refitT); refitT = setTimeout(fitFs, 80); };
  // uscita dal gioco: il velo si toglie senza riprendere la partita (che si sta chiudendo)
  function dropVeil() { veilPaused = false; hideVeil(); }

  HH.fullscreen = {
    isFull, canFull, inFs, enterFull, exitFull, autoFull, fsClass, veilOn, showVeil, hideVeil, dropVeil, fsEnsure,
    placeHud, fsMenu, fitFs, refitSoon,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
