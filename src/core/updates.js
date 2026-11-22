/* Hari Hari Puzzle — PWA (HH.updates): proposta d'installazione su Android, aggiornamenti automatici del service
 * worker (updateReady, applyUpdate, controllerchange), autoriparazione dell'aggiornamento bloccato (heal), giochi
 * nuovi dopo un aggiornamento. Legge lo stato dell'app da HH.app (S, persist, endInst, say) solo al momento dell'uso. */
(function (G) {
  const HH = G.HH;
  const A = (HH.app = HH.app || {});
  const { t, $, lab, ICON } = HH.ui;
  const sfx = HH.fx.sfx;
  const P = HH.progress;

  /* ---------- PWA: proposta d'installazione (Android) ---------- */
  const standalone = () => (G.matchMedia && G.matchMedia('(display-mode: standalone)').matches) || G.navigator.standalone === true;
  const isAndroid = () => /Android/i.test(G.navigator.userAgent || '');
  let installEvt = null;
  function installSheet(manual) {
    $('#installBox').innerHTML = `<div class="inst-hari">${HH.mascot.svg({ cls: 'hari happy' })}</div>
      <h2 id="installTitle">${t('installTitle')}</h2>
      <p>${t(manual ? 'installHow' : 'installText')}</p>
      <div class="inst-row">${manual ? '' : `<button class="candy big" id="instGo">${ICON.install}<span>${t('install')}</span></button>`}
        <button class="tool" id="instLater"><span>${t('installLater')}</span></button></div>`;
    $('#installDlg').hidden = false;
    sfx.open();
  }
  function closeInstall(snoozeDays) {
    $('#installDlg').hidden = true;
    if (snoozeDays) HH.store.set('install:snooze', Date.now() + snoozeDays * 864e5);
  }
  // propone l'installazione solo nella home, mai durante una partita, e non più di una volta ogni 3 giorni
  function offerInstall() {
    if (standalone() || HH.INLINE || A.S.game || !$('#installDlg').hidden || HH.legal.needs() || (HH.wizard && HH.wizard.isOpen())) return;
    if (Date.now() < HH.store.get('install:snooze', 0)) return;
    if (installEvt) installSheet(false);
    else if (isAndroid()) installSheet(true);   // browser senza prompt automatico: istruzioni dal menu
  }
  async function doInstall() {
    if (!installEvt) { installSheet(true); return; }
    const ev = installEvt;
    installEvt = null;
    closeInstall(0);
    ev.prompt();
    let outcome = 'dismissed';
    try { outcome = (await ev.userChoice).outcome; } catch (e) { /* annullato */ }
    if (outcome !== 'accepted') HH.store.set('install:snooze', Date.now() + 3 * 864e5);
    $('#installBtn').hidden = !isAndroid() || standalone();
  }
  function setupInstall() {
    $('#installBtn').hidden = !(isAndroid() && !standalone());
    G.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installEvt = e;
      $('#installBtn').hidden = false;
      setTimeout(offerInstall, 2500);
    });
    G.addEventListener('appinstalled', () => { installEvt = null; closeInstall(0); $('#installBtn').hidden = true; HH.store.set('installed', 1); });
    $('#installBtn').onclick = doInstall;
    $('#installDlg').addEventListener('click', (e) => {
      if (e.target.closest('#instGo')) doInstall();
      else if (e.target.closest('#instLater') || e.target === $('#installDlg')) closeInstall(3);
    });
    // Android senza evento (es. Firefox, Samsung Internet o prompt già usato): istruzioni dopo qualche secondo
    setTimeout(() => { if (!installEvt) offerInstall(); }, 7000);
  }

  /* ---------- PWA: aggiornamenti automatici ----------
   * Il service worker nuovo si scarica da solo (controllo all'avvio, al ritorno in primo piano e ogni 30 min) e resta
   * "in attesa". Lo attiviamo in un momento sicuro: subito se si è nella home, altrimenti quando l'app va in background
   * o quando si tocca "Aggiorna". Prima di ricaricare la partita viene salvata; i salvataggi stanno in localStorage,
   * che il service worker non tocca, e all'avvio la partita in sospeso riparte da dove era.
   */
  let waitingSW = null;
  function applyUpdate() {
    if (!waitingSW) return;
    A.persist();
    HH.store.set('justUpdated', 1);
    waitingSW.postMessage({ type: 'skip' });
  }
  function updateReady(w) {
    waitingSW = w;
    if (HH.transition && HH.transition.busy()) { HH.transition.idle().then(() => updateReady(w)); return; }
    if (!A.S.game) { applyUpdate(); return; }
    const bar = $('#updBar');
    bar.innerHTML = `<span>${t('updReady')}</span><button class="candy" id="updGo">${ICON.sparkle}<span>${t('updNow')}</span></button>`;
    bar.hidden = false;
    $('#updGo').onclick = applyUpdate;
  }
  /* ---------- aggiornamento bloccato: autoriparazione ----------
   * Su iPhone (Chrome e Safari usano WebKit) la versione nuova può restare "in attesa" per sempre: le schede non si
   * chiudono mai davvero e il via non arriva. Si confronta la versione pubblicata (sw.js letto dalla rete, senza
   * cache) con quella in uso: se online ce n'è una PIÙ NUOVA si prova l'aggiornamento normale; se dopo 20 s non è
   * partito, si dà il via a quella in attesa o, se non c'è, si cancellano registrazione e cache dell'app e si
   * ricarica. I salvataggi (localStorage) non si toccano. Un solo tentativo forte per versione, così niente cicli. */
  let healing = false;
  let reloadingNow = () => false;
  function heal(reg) {
    if (healing || typeof fetch !== 'function') return;
    healing = true;
    const done = () => { healing = false; };
    fetch('sw.js?v=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((txt) => {
      const m = /const VERSION = 'hh-v([0-9.]+)'/.exec(txt || '');
      if (!m || vnum(m[1]) <= vnum(HH.VERSION)) return done();
      const remote = m[1];
      setTimeout(() => {
        if (reloadingNow()) return done();
        const w = reg.waiting;
        if (w) { if (!A.S.game && !(HH.transition && HH.transition.busy())) { A.persist(); HH.store.set('justUpdated', 1); w.postMessage({ type: 'skip' }); } return done(); }
        if (reg.installing) return done();                       // sta ancora scaricando: si riprova al prossimo controllo
        if (HH.store.get('healTried') === remote || A.S.game || (HH.transition && HH.transition.busy())) return done();
        HH.store.set('healTried', remote);
        A.persist();
        HH.store.set('justUpdated', 1);
        const regs = G.navigator.serviceWorker.getRegistrations ? G.navigator.serviceWorker.getRegistrations() : Promise.resolve([reg]);
        regs.then((list) => Promise.all(list.map((x) => x.unregister())))
          .then(() => (G.caches ? G.caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('hh-v')).map((k) => G.caches.delete(k)))) : null))
          .catch(() => {})
          .then(() => location.reload());
      }, 20000);
    }).catch(done);
  }
  /* ---------- giochi nuovi dopo un aggiornamento (anche se l'app era chiusa) ---------- */
  const vnum = (v) => String(v || '0').split('.').reduce((a, x) => a * 1000 + (+x || 0), 0);
  function newGamesCheck() {
    const cur = HH.VERSION;
    let seen = HH.store.get('seenVersion', null);
    if (seen === null) {
      // prima volta con questa funzione: chi aveva già giocato "veniva" dalla 0.14.1, una installazione nuova no
      const played = HH.catalog.some((g) => { const p = P.get(g.id); return p.wins > 0 || p.level > 1 || P.loadGame(g.id) || HH.store.get('tut:' + g.id); });
      seen = played ? '0.14.1' : cur;
    }
    const fresh = vnum(seen) < vnum(cur) ? HH.catalog.filter((g) => g.since && vnum(g.since) > vnum(seen) && vnum(g.since) <= vnum(cur)) : [];
    const updated = vnum(seen) < vnum(cur);
    HH.store.set('seenVersion', cur);
    if (fresh.length) HH.store.set('newGames', [...new Set([...HH.store.get('newGames', []), ...fresh.map((g) => g.id)])]);
    return { fresh, updated };
  }
  const isNew = (id) => (HH.store.get('newGames', []) || []).includes(id);
  function setupUpdates() {
    const ng = newGamesCheck();
    const upd = HH.store.get('justUpdated') || ng.updated;
    HH.store.del('justUpdated');
    if (upd || ng.fresh.length) {
      const list = ng.fresh.map((g) => g.name).join(', ');
      const txt = `${upd ? t('updDone') : ''} ${ng.fresh.length ? lab('updNew', 'New games: {list}').replace('{list}', list) : ''}`.trim();
      setTimeout(() => A.say('cheer', true, txt), 900);
    }
    if (!('serviceWorker' in G.navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost') || HH.INLINE) return;
    const sw = G.navigator.serviceWorker;
    let hadController = !!sw.controller;
    let reloading = false;
    reloadingNow = () => reloading;
    sw.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }   // prima installazione: niente ricarica
      if (reloading) return;
      reloading = true;
      A.persist();
      A.endInst();
      location.reload();
    });
    // il service worker nuovo chiede se questa pagina sa aggiornarsi da sola: rispondiamo di sì (al mittente)
    sw.addEventListener('message', (e) => { if (e.data && e.data.type === 'ask-update' && e.source) e.source.postMessage({ type: 'can-update', proto: 2 }); });
    sw.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      const watch = (w) => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && sw.controller) updateReady(w); });
      if (reg.waiting && sw.controller) updateReady(reg.waiting);
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      const check = () => { if (G.navigator.onLine !== false) { reg.update().catch(() => {}); heal(reg); } };
      check();
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
        else if (waitingSW) applyUpdate();          // l'utente ha lasciato l'app: aggiorna senza disturbare
      });
    }).catch(() => {});
    // chiede al browser di non cancellare i dati (salvataggi) anche con poco spazio
    if (G.navigator.storage && G.navigator.storage.persist) G.navigator.storage.persist().catch(() => {});
  }
  // un service worker nuovo aspetta il momento sicuro (uscita dal gioco, app in background, «Aggiorna»)
  const pending = () => !!waitingSW;

  HH.updates = { setupInstall, offerInstall, closeInstall, setupUpdates, applyUpdate, pending, isNew };
})(typeof globalThis !== 'undefined' ? globalThis : window);
