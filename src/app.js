/* Hari Hari Puzzle — shell dell'app: stato, apertura e chiusura dei giochi, indicatori, Hari che parla, tutorial,
 * vittoria e sconfitta, audio, avvio e avviso legale.
 * Salvataggio: ogni mossa e ogni 5 s di gioco la partita viene salvata (HH.progress.saveGame);
 * riaprendo l'app si torna dritti alla partita in sospeso.
 * Moduli del nucleo caricati prima: src/core/ui.js (icone e formati), fullscreen.js (schermo intero e velo),
 * updates.js (installazione e aggiornamenti), home.js (home, Progressi, lingue). Lo stato condiviso con loro è HH.app. */
(function (G) {
  const HH = G.HH;
  const A = (HH.app = HH.app || {});
  const { t, $, lab, ICON, metaHTML, STAR, stars, fmt, nf, cardArt } = HH.ui;
  const { autoFull, exitFull, fsClass, veilOn, dropVeil, fsEnsure, placeHud, fsMenu, refitSoon } = HH.fullscreen;
  const { setupInstall, offerInstall, closeInstall, setupUpdates, applyUpdate, pending, isNew } = HH.updates;
  const { renderHome, homeIntro, lastSave, openStats, renderLangSheet, share } = HH.home;
  const sfx = HH.fx.sfx;
  const P = HH.progress;

  /* ---------- stato ---------- */
  const S = { gen: 0, game: null, inst: null, elapsed: 0, won: false, pushed: false, best: 0, ms: {}, lastMove: 0, idleSaid: false };
  A.S = S;

  /* ---------- Hari parla ---------- */
  const SAY = {
    start: ['m_start1', 'm_start2'], good: ['m_good1', 'm_good2'], half: ['m_half'], almost: ['m_almost1', 'm_almost2'],
    oops: ['m_oops1', 'm_oops2'], idle: ['m_idle1', 'm_idle2'], poke: ['m_poke1', 'm_poke2'], cheer: ['m_cheer'],
  };
  const pick = (kind) => t(SAY[kind][(Math.random() * SAY[kind].length) | 0]);
  let sayTimer = 0, lastSay = 0;
  const COACHED = ['start', 'good', 'half', 'almost', 'oops', 'idle'];
  function say(kind, force, text) {
    // i giochi con un Hari "allenatore" sulla griglia (coach: true, es. Hari Sudoku) fanno parlare lui durante la partita
    if (!text && S.game && S.game.coach && S.inst && !$('#game').hidden && COACHED.includes(kind)) return;
    const now = Date.now();
    if (!force && now - lastSay < 9000) return;
    lastSay = now;
    const box = $('#hariSay');
    box.querySelector('p').textContent = text || pick(kind);
    const m = box.querySelector('svg.hari');
    m.classList.remove('happy', 'oops', 'jump');
    void m.getBoundingClientRect();
    m.classList.add(...(kind === 'oops' ? ['oops'] : kind === 'idle' ? [] : ['happy', 'jump']));
    box.hidden = false;
    box.classList.remove('in', 'out');
    void box.offsetWidth;
    box.classList.add('in');
    sfx.blip();
    clearTimeout(sayTimer);
    // tempo di lettura: almeno 4,5 s, di più per le frasi lunghe
    const ms = Math.max(4500, 2000 + box.querySelector('p').textContent.length * 75);
    sayTimer = setTimeout(() => {
      box.classList.add('out');
      sayTimer = setTimeout(() => { box.hidden = true; }, 320);
    }, ms);
  }
  function hideSay() { clearTimeout(sayTimer); $('#hariSay').hidden = true; }

  // progresso verso la soluzione: guida la musica e i messaggi di Hari
  function onProgress(reset) {
    if (!S.inst || !S.game.progress) return;
    const p = S.game.progress(S.inst.snapshot());
    HH.music.setIntensity(p);
    S.lastMove = Date.now(); S.idleSaid = false;
    if (S.game.endless) return;          // niente "a metà!"/"quasi fatto!": non c'è una fine
    if (reset) { S.best = p; S.ms = { half: p >= 0.5, almost: p >= 0.85 }; return; }
    if (p >= 1) return;
    if (p >= 0.85 && !S.ms.almost) { S.ms.almost = S.ms.half = true; say('almost', true); sfx.milestone(); }
    else if (p >= 0.5 && !S.ms.half) { S.ms.half = true; say('half', true); sfx.milestone(); }
    else if (p > S.best + 0.2 && Math.random() < 0.4) say('good');
    S.best = Math.max(S.best, p);
  }
  function livesHTML(left, max, lost = -1) {
    return Array.from({ length: max }, (_, i) => `<span class="lv${i < left ? ' on' : ''}${i === lost ? ' lost' : ''}">${ICON.heart}</span>`).join('');
  }

  // "posto" dei progressi e del salvataggio: di solito l'id del gioco; un gioco può averne più d'uno (g.slot(),
  // es. Hari Taxi: una mappa = livelli e partita propri; la città di Hari resta su 'drive')
  const slot = HH.rules.slotOf;
  function persist() {
    if (!S.game || !S.inst || S.won) return;
    const state = S.inst.snapshot();
    if (!state) return;
    const k = slot(S.game);
    HH.store.set('slot:' + S.game.id, k);   // la ripresa (card e avvio) guarda questo posto, quello che si riaprirà
    P.saveGame(k, { level: P.get(k).level, elapsed: S.elapsed, state, meta: S.game.meta ? S.game.meta(state) : undefined });
  }
  // fine dell'istanza del gioco (uscita, cambio partita/posto, ricarica per aggiornamento): si stacca da S.inst e,
  // se il gioco lo prevede, si chiama destroy() una volta sola (RAF, voce, sensori, rete si fermano subito)
  const destroyed = new WeakSet();
  function endInst() {
    const inst = S.inst;
    S.inst = null;
    if (!inst || typeof inst.destroy !== 'function' || destroyed.has(inst)) return;
    destroyed.add(inst);
    try { inst.destroy(); } catch (e) { setTimeout(() => { throw e; }); }
  }
  function hud() {
    if (!S.inst) return;
    const snap = S.inst.snapshot();
    if (!snap) return;                   // partita non ancora pronta (es. dati di una mappa in download)
    if (S.game.endless) { const h = $('#hMeta'); if (h && S.game.meta) h.innerHTML = metaHTML(S.game.meta(snap), true); return; }
    const m = $('#hMoves'), tm = $('#hTime'), st = $('#hStars');
    if (m) m.textContent = nf(snap.moves);
    if (tm) tm.textContent = fmt(S.elapsed);
    if (st) st.innerHTML = stars(S.game.rate(snap));
    const lv = $('#hLives');
    if (lv && S.game.lives && Date.now() - (S.heartAnim || 0) > 850) lv.innerHTML = livesHTML(S.game.lives - (snap.mistakes || 0), S.game.lives);
  }
  function updateScore() {
    const el = $('#scoreChip b');
    if (el) el.textContent = nf(P.totalScore());
  }

  // timer di gioco: avanza solo se la partita è visibile e non ancora vinta
  setInterval(() => {
    if (!S.inst || S.won || document.hidden || veilOn() || !$('#winDlg').hidden || !$('#loseDlg').hidden || !$('#tutDlg').hidden) return;
    S.elapsed++;
    HH.usage.tick(S.game.id);
    const tm = $('#hTime');
    if (tm) tm.textContent = fmt(S.elapsed);
    if (S.elapsed % 5 === 0) persist();
    if (!S.idleSaid && S.lastMove && Date.now() - S.lastMove > 30000) { S.idleSaid = true; say('idle', true); }
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  G.addEventListener('pagehide', persist);

  /* ---------- Mascotte ---------- */
  function react(mood) {
    document.querySelectorAll('svg.hari').forEach((m) => {
      if (m.closest('#winBox') || m.closest('#hariSay')) return;
      m.classList.remove('jump', 'oops', 'happy');
      void m.getBoundingClientRect();
      m.classList.add(...(mood === 'oops' ? ['oops'] : ['happy', 'jump']));
      clearTimeout(m._t);
      m._t = setTimeout(() => m.classList.remove('jump', 'oops', 'happy'), mood === 'oops' ? 900 : 1900);
    });
    if (mood === 'oops' && Math.random() < 0.6) say('oops');
  }
  function hearts(host) {
    for (let i = 0; i < 7; i++) {
      const h = document.createElement('span');
      h.className = 'heart';
      h.style.setProperty('--x', `${Math.round(Math.random() * 120 - 60)}px`);
      h.style.setProperty('--r', `${Math.round(Math.random() * 60 - 30)}deg`);
      h.style.animationDelay = `${i * 70}ms`;
      h.innerHTML = ICON.heart;
      host.appendChild(h);
      setTimeout(() => h.remove(), 1600);
    }
  }
  G.addEventListener('pointermove', (e) => {
    document.querySelectorAll('.hari .hari-shine').forEach((s) => {
      const r = s.ownerSVGElement.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / G.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / G.innerHeight;
      s.style.transform = `translate(${(dx * 9).toFixed(1)}px, ${(dy * 7).toFixed(1)}px)`;
    });
  }, { passive: true });

  /* ---------- Gioco ---------- */
  function openGame(id, push = true) {
    if (!HH.gameMeta(id)) return;
    if (legalGate(() => openGame(id, push))) return;     // avviso legale non ancora accettato: prima quello
    if (HH.wizard) HH.wizard.close();                     // la guida riguarda solo la home (resta segnata come vista)
    autoFull();                       // i giochi si giocano solo a schermo intero: si entra dentro il tocco che li apre
    if (isNew(id)) HH.store.set('newGames', HH.store.get('newGames', []).filter((x) => x !== id));
    // dalla home: transizione kawaii (src/core/transition.js). Il gioco si scarica e si disegna a schermo coperto.
    // Niente transizione alla ripresa della partita all'avvio (S.noTrans) e quando si riapre lo stesso gioco
    // (cambio lingua, cambio mappa: S.game è già impostato).
    const anim = !S.game && !S.noTrans && HH.transition;
    S.noTrans = false;
    if (anim) {
      if (S.loading || HH.transition.busy()) return;    // doppio tocco o transizione già in corso: si ignora
      S.loading = id;
      let failed = false;
      HH.transition.run(async () => {
        try { if (!HH.gameLoaded(id)) await HH.loadGame(id); } catch (e) { failed = true; return; }
        S.loading = null;
        if (!S.game) showGame(HH.gameLoaded(id), push);
      }, { focus: () => $('#gBack') }).catch((e) => { setTimeout(() => { throw e; }); }).then(() => {
        S.loading = null;
        if (failed) say('oops', true, lab('dlNeed', 'This game downloads the first time you play: connect to the internet and try again!'));
      });
      return;
    }
    const g = HH.gameLoaded(id);
    if (!g) {
      // primo avvio del gioco: lo scarica (o lo prende dalla cache offline) e poi lo apre
      if (S.loading) return;
      S.loading = id;
      const card = document.querySelector(`[data-game="${id}"]`);
      if (card) card.classList.add('loading');
      HH.loadGame(id).then(() => {
        S.loading = null;
        if (card) card.classList.remove('loading');
        if (!$('#home').hidden || !S.game) { S.noTrans = true; openGame(id, push); }
      }).catch(() => {
        S.loading = null;
        if (card) card.classList.remove('loading');
        say('oops', true, lab('dlNeed', 'This game downloads the first time you play: connect to the internet and try again!'));
        if (!$('#home').hidden) return;
        renderHome();
      });
      return;
    }
    showGame(g, push);
  }

  function showGame(g, push) {
    const id = g.id;
    persist();
    endInst();                        // la partita di prima (cambio lingua, cambio posto) si chiude davvero
    S.game = g; S.won = false;
    const gen = ++S.gen;              // generazione: i timer di un gioco chiuso non toccano quello aperto dopo
    const live = () => gen === S.gen;
    const saved = P.loadGame(slot(g));
    S.elapsed = saved ? saved.elapsed || 0 : 0;
    HH.store.set('screen', id);
    const p = P.get(slot(g));
    $('#home').hidden = true;
    const scr = $('#game');
    scr.hidden = false;
    scr.innerHTML = `
      <header class="g-head">
        <button class="icon-btn" id="gBack" aria-label="${lab('goHome', 'All games')}">${ICON.back}</button>
        <div class="g-title"><h2>${g.name}</h2>${g.endless ? '' : `<span class="ribbon-tag inline" id="gLevel">${t('level')} ${p.level}</span>`}</div>
        ${g.tutorial ? `<button class="icon-btn help" id="gHelp" aria-label="${lab('help', 'How to play')}">?</button>` : ''}
      </header>
      <div class="hud"${g.endless ? ' id="hMeta"' : ''}>${g.endless ? '' : `
        <span class="chip" aria-label="${t('time')}">${ICON.clock}<b id="hTime">${fmt(S.elapsed)}</b></span>
        <span class="chip" aria-label="${t('moves')}">${ICON.paw}<b id="hMoves">0</b></span>
        <span class="chip stars" id="hStars" aria-hidden="true"></span>
        ${g.lives ? `<span class="chip lives" id="hLives" aria-label="${t('lives')}"></span>` : ''}
        <span class="chip best" aria-label="${t('best')}">${ICON.trophy}<b>${nf(p.best)}</b></span>`}
      </div>
      <div class="plate ${g.plate || ''}" id="gPlate">
        <div class="fs-bar">
          <button class="fs-logo" id="gFsMenu" aria-haspopup="menu" aria-expanded="false" aria-label="${lab('fsMenu', 'Menu')}">${HH.mascot.mini()}<b>${g.name}</b>${g.endless ? '' : `<span class="fs-lv">${p.level}</span>`}${ICON.chev}</button>
          <button class="icon-btn fs-exit" id="gFsExit" aria-label="${lab('goHome', 'All games')}" title="${lab('goHome', 'All games')}">${ICON.home}</button>
        </div>
        <div class="fs-menu" id="gFsMenuBox" role="menu" hidden></div>
        <div class="fs-hud" id="gFsHud"></div>
        <div class="board" id="board"></div>
      </div>
      <div class="g-tools">
        ${g.endless ? '' : `<button class="tool" id="gUndo">${ICON.undo}<span>${t('undo')}</span></button>`}
        <button class="tool" id="gRestart">${ICON.restart}<span>${t('restart')}</span></button>
        ${g.endless ? '' : `<button class="candy" id="gNew">${ICON.sparkle}<span>${t('newg')}</span></button>`}
      </div>
      <aside class="rules"><div class="rules-hari">${HH.mascot.svg({ cls: 'hari' })}</div><p>${lab(g.rules, g.rulesEn || g.rules)}</p></aside>`;
    const ctx = {
      get level() { return P.get(slot(g)).level; },
      // cambia "posto" (es. un'altra mappa di Hari Taxi): salva la partita di adesso, poi riapre il gioco sul nuovo
      // (endInst: openGame non deve risalvare la partita vecchia nel posto nuovo)
      reslot(fn) { persist(); endInst(); if (fn) fn(); openGame(g.id, false); },
      sfx, react,
      win: () => { if (live()) win(); },
      changed(o) {
        const reset = !!(o && o.reset);
        if (reset) { S.elapsed = 0; S.won = false; $('#winDlg').hidden = true; $('#loseDlg').hidden = true; HH.music.duck(false); refitSoon(); }
        if (!S.inst) return;
        hud(); persist(); onProgress(reset);
      },
      mistake(left) {
        S.heartAnim = Date.now();
        const lv = $('#hLives');
        if (lv) lv.innerHTML = livesHTML(left, g.lives, left);
        sfx.bad();
        setTimeout(() => sfx.heart(), 250);
        react('oops');
        if (left <= 0) setTimeout(() => { if (live()) lose('lives'); }, 1000);
        else setTimeout(() => { const l = $('#hLives'); if (l) l.innerHTML = livesHTML(left, g.lives); }, 900);
      },
      // mosse finite senza aver risolto (Boba Sort)
      outOfMoves(kind = 'moves') {
        react('oops');
        setTimeout(() => { if (live()) lose(kind); }, 450);
      },
    };
    $('#gBack').onclick = () => (S.pushed ? history.back() : goHome());
    $('#gFsExit').onclick = () => { sfx.tap(); $('#gBack').click(); };
    $('#gFsMenu').onclick = (e) => { e.stopPropagation(); sfx.tap(); fsMenu(); };
    $('#gFsMenuBox').onclick = (e) => {
      const it = e.target.closest('[data-fs]');
      if (!it) return;
      const act = it.dataset.fs;
      const map = { home: '#gBack', undo: '#gUndo', restart: '#gRestart', new: '#gNew', help: '#gHelp', audio: '#audioBtn' };
      const target = $(map[act]);
      if (act === 'audio') { target.click(); fsMenu(true); return; }   // resta aperto per vedere lo stato
      fsMenu(false);
      if (target) target.click();
    };
    $('#gPlate').addEventListener('pointerdown', (e) => { if (!e.target.closest('#gFsMenuBox, #gFsMenu')) fsMenu(false); });
    if (push) {
      try { history.pushState({ game: id }, ''); S.pushed = true; } catch (e) { S.pushed = false; }
      G.scrollTo(0, 0);
    }
    keepAwake(true);
    // sempre a schermo intero (vero o pseudo): indicatori nel riquadro e misura adattata
    fsClass(true);
    placeHud(); refitSoon();
    // prima volta in questo gioco: tutorial PRIMA di creare la partita (così i giochi a tempo non partono dietro la finestra)
    if (g.tutorial && !HH.store.get('tut:' + g.id)) tutorial(g, () => { if (S.game === g) begin(); });
    else begin();
    // aperto senza un tocco (ripresa all'avvio, link diretto, dopo un aggiornamento): velo, il primo tocco entra
    fsEnsure();

    function begin() {
    HH.usage.open(g.id);
    // partita salvata già risolta (si era usciti durante il ritardo prima di ctx.win): la vittoria si assegna qui
    const solvedAtResume = !!saved && HH.rules.solvedOnResume(g, saved.state);
    try {
      S.inst = g.create($('#board'), ctx, saved && saved.state);
    } catch (err) {
      // salvataggio illeggibile (es. dopo un aggiornamento): ne teniamo una copia e si riparte dal livello raggiunto
      if (!saved) throw err;
      const k = slot(g);              // la partita viene dallo slot (es. drive@ostia), non dall'id del gioco
      HH.store.set('save-bak:' + k, saved);
      P.clearGame(k);
      S.elapsed = 0;
      S.inst = g.create($('#board'), ctx, null);
    }
    hud(); persist();
    refitSoon();
    onProgress(true);
    HH.music.play(g.id, g.progress ? g.progress(S.inst.snapshot()) : 0);
    HH.music.duck(false);
    sfx.open();
    if (push) setTimeout(() => say('start', true), 650);
    if ($('#gUndo')) $('#gUndo').onclick = () => S.inst && S.inst.undo();
    $('#gRestart').onclick = () => S.inst && S.inst.restart();
    if ($('#gNew')) $('#gNew').onclick = () => { if (S.inst) { S.inst.fresh(); sfx.blip(); } };
    const help = $('#gHelp');
    if (help) help.onclick = () => {
      if (S.inst && S.inst.pause) S.inst.pause();
      tutorial(g, () => { if (S.inst && S.inst.resume) S.inst.resume(); });
    };
    if (solvedAtResume) win(saved.state);   // una volta sola: win() pulisce il salvataggio e S.won blocca i doppioni
    }
  }

  /* ---------- tutorial (prima partita di ogni gioco, poi dal pulsante "?") ----------
   * Ogni gioco può dichiarare tutorial: [{ key, en, art }] (art = SVG 120×90 animato con CSS). */
  function tutorial(g, done) {
    const steps = g.tutorial;
    let i = 0;
    const dlg = $('#tutDlg'), box = $('#tutBox');
    const close = () => {
      dlg.hidden = true;
      HH.store.set('tut:' + g.id, 1);
      document.removeEventListener('keydown', onKey);
      sfx.blip();
      done && done();
    };
    const draw = () => {
      const st = steps[i], last = i === steps.length - 1;
      box.innerHTML = `<div class="sheet-head"><h2 id="tutTitle">${lab('help', 'How to play')} · ${g.name}</h2>
          <button class="icon-btn close" id="tutSkip" aria-label="${lab('tutSkip', 'Skip')}">✕</button></div>
        <div class="tut-stage" style="--tint:var(--tint-${g.id}, var(--hair))">${st.art || cardArt(g.id)}<div class="tut-hari">${HH.mascot.mini()}</div></div>
        <p class="tut-text">${lab(st.key, st.en)}</p>
        <div class="tut-foot"><span class="tut-dots" aria-hidden="true">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
          <button class="candy" id="tutNext">${last ? ICON.sparkle : ''}<span>${last ? t('play') : t('next')}</span></button></div>`;
      $('#tutNext').onclick = () => { if (last) close(); else { i++; sfx.tap(); draw(); } };
      $('#tutSkip').onclick = close;
      $('#tutNext').focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    dlg.hidden = false;
    draw();
  }

  /* ---------- schermo sempre acceso durante la partita (Screen Wake Lock) ---------- */
  let wake = null, wantWake = false;
  async function keepAwake(on) {
    wantWake = on;
    try {
      if (on && !wake && 'wakeLock' in G.navigator && document.visibilityState === 'visible') {
        wake = await G.navigator.wakeLock.request('screen');
        wake.addEventListener('release', () => { wake = null; });
      } else if (!on && wake) { const w = wake; wake = null; await w.release(); }
    } catch (e) { wake = null; /* non supportato o negato: nessun problema */ }
  }
  // il blocco si perde quando l'app va in background: lo riprendiamo al ritorno se si sta ancora giocando
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wantWake) keepAwake(true); });

  // uscita verso la home: con la transizione (salvo 'instant'); a schermo coperto si smonta il gioco e si
  // ridisegna la home, poi (scoperta finita) eventuale aggiornamento in attesa o proposta di installazione
  function goHome(how) {
    if (how !== 'instant' && HH.transition && S.game) {
      if (S.leaving) return;
      S.leaving = true;
      const from = S.game.id;
      HH.transition.run(() => { if (S.game) leaveGame(); }, { focus: () => document.querySelector(`#home [data-game="${from}"]`) })
        .catch((e) => { setTimeout(() => { throw e; }); })
        .then(() => { S.leaving = false; afterHome(); });
      return;
    }
    leaveGame();
    afterHome();
  }
  function afterHome() {
    if (S.game) return;
    if (pending()) applyUpdate();
    else setTimeout(offerInstall, 1200);
  }
  function leaveGame() {
    persist();
    S.gen++;
    endInst();
    hideSay();
    $('#loseDlg').hidden = true;
    S.game = null;
    dropVeil();
    fsClass(false);
    exitFull();                       // la home è in vista normale (S.game è già null: non conta come "indietro")
    keepAwake(false);
    $('#tutDlg').hidden = true;
    HH.store.set('screen', null);
    $('#game').hidden = true; $('#game').innerHTML = '';
    $('#home').hidden = false;
    renderHome();
    $('#updBar').hidden = true;
  }
  G.addEventListener('popstate', () => { S.pushed = false; if (S.game) goHome(); });

  // state: lo stato risolto salvato (vittoria assegnata alla riapertura), altrimenti quello della partita in corso
  function win(state) {
    const g = S.game;
    if (!g || S.won) return;
    S.won = true;
    const snap = state || S.inst.snapshot();
    const k = slot(g);
    const p = P.get(k);
    const level = p.level;
    const st = g.rate(snap);
    const timeBonus = Math.max(0, Math.round((g.parTime(snap) - S.elapsed) * 2));
    const score = 100 + level * 25 + st * 60 + timeBonus;
    const rec = score > p.best;
    Object.assign(p, {
      level: level + 1, wins: p.wins + 1, total: p.total + score, stars: p.stars + st, last: st,
      best: Math.max(p.best, score), bestTime: p.bestTime ? Math.min(p.bestTime, S.elapsed) : S.elapsed,
    });
    P.set(k, p);
    P.clearGame(k);
    updateScore();
    react('win');
    hideSay();
    HH.music.duck(true);
    sfx.win();
    HH.fx.confetti($('#fxCanvas'));
    $('#winDlg').hidden = false;
    $('#winBox').innerHTML = `
      <div class="win-rays" aria-hidden="true"></div>
      <div class="win-hari">${HH.mascot.svg({ cls: 'hari happy jump' })}</div>
      <h2 class="ribbon" id="winTitle"><span>${t('win')}</span></h2>
      <p class="cheer">${pick('cheer')}</p>
      <div class="win-stars">${[0, 1, 2].map((i) => `<span class="ws${i < st ? ' on' : ''}" style="--d:${0.35 + i * 0.3}s">${STAR(i < st)}</span>`).join('')}</div>
      ${rec ? `<p class="newrec">${ICON.trophy}${t('newrec')}</p>` : ''}
      <dl class="win-stats">
        <div><dt>${ICON.clock}${t('time')}</dt><dd>${fmt(S.elapsed)}</dd></div>
        <div><dt>${ICON.paw}${t('moves')}</dt><dd>${nf(snap.moves)}</dd></div>
        <div class="hi"><dt>${ICON.acorn}${t('score')}</dt><dd id="winScore">0</dd></div>
      </dl>
      <div class="win-actions">
        <button class="tool round" id="winHome" aria-label="${lab('goHome', 'All games')}">${ICON.home}</button>
        <button class="candy big" id="winNext">${ICON.sparkle}<span>${t('next')}</span></button>
      </div>`;
    for (let i = 0; i < st; i++) setTimeout(() => sfx.star(i), 350 + i * 300);
    if (rec) setTimeout(sfx.record, 450 + st * 300);
    const t0 = performance.now(), dur = 1100;
    (function count(now) {
      const k = Math.min(1, (now - t0) / dur);
      const el = $('#winScore');
      if (!el) return;
      el.textContent = nf(Math.round(score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(count);
    })(t0);
    $('#winNext').focus();
    $('#winNext').onclick = () => {
      $('#winDlg').hidden = true;
      $('#gLevel').textContent = `${t('level')} ${P.get(slot(g)).level}`;
      HH.music.duck(false);
      S.inst.fresh();
      setTimeout(() => say('start', true), 500);
    };
    $('#winHome').onclick = () => {
      $('#winDlg').hidden = true;
      HH.music.duck(false);
      if (S.pushed) history.back(); else goHome();
    };
  }

  /* ---------- Cuori finiti ---------- */
  function lose(kind = 'lives') {
    if (!S.game || S.won) return;
    hideSay();
    HH.music.duck(true);
    sfx.lose();
    $('#loseDlg').hidden = false;
    $('#loseBox').innerHTML = `
      <div class="lose-hari">${HH.mascot.svg({ cls: 'hari oops sad' })}</div>
      <h2 id="loseTitle">${t({ moves: 'nomoves', stuck: 'stuck' }[kind] || 'nolives')}</h2>
      ${kind === 'moves' ? `<div class="lose-moves">${ICON.paw}<b>0</b></div>` : kind === 'lives' ? `<div class="lose-hearts">${livesHTML(0, S.game.lives)}</div>` : ''}
      <p>${pick('oops')}</p>
      <div class="win-actions">
        <button class="tool round" id="loseHome" aria-label="${lab('goHome', 'All games')}">${ICON.home}</button>
        <button class="candy big" id="loseRetry">${ICON.restart}<span>${t('retry')}</span></button>
      </div>`;
    $('#loseRetry').focus();
    $('#loseRetry').onclick = () => { $('#loseDlg').hidden = true; S.inst.restart(); sfx.blip(); setTimeout(() => say('start', true), 400); };
    $('#loseHome').onclick = () => { $('#loseDlg').hidden = true; S.inst.restart(); if (S.pushed) history.back(); else goHome(); };
  }

  const audioState = () => (sfx.isMuted() ? 'off' : HH.music.isOn() ? 'all' : 'sfx');
  const audioLabel = () => { const st = audioState(); return st === 'all' ? lab('audioAll', 'Music and sounds on') : st === 'sfx' ? lab('audioSfx', 'Sounds only') : lab('audioOff', 'Audio off'); };
  function audioUI() {
    const st = audioState(), root = document.documentElement;
    root.classList.toggle('muted', st === 'off');
    root.classList.toggle('nomusic', st !== 'all');
    const b = $('#audioBtn');
    if (b) { b.setAttribute('aria-label', audioLabel()); b.title = audioLabel(); b.dataset.state = st; }
  }

  function applyTexts() {
    $('#langBtn').setAttribute('aria-label', t('lang'));
    $('#scoreChip').setAttribute('aria-label', t('stats'));
    document.querySelectorAll('#langDlg .close, #statsClose').forEach((b) => b.setAttribute('aria-label', lab('er_close', 'Close')));
    audioUI();
    $('#installBtn span').textContent = t('install');
    $('#langCode').textContent = HH.i18n.code.toUpperCase();
    updateScore();
    if (S.game) { persist(); openGame(S.game.id, false); } else renderHome();
  }

  /* ---------- Avvio ---------- */
  function boot() {
    HH.i18n.set(HH.i18n.detect());
    HH.fx.background($('#bgCanvas'));
    sfx.setMuted(HH.store.get('muted', false));
    HH.music.setOn(HH.store.get('music', true));
    audioUI();
    // l'audio parte al primo tocco (regola dei browser)
    const unlock = () => HH.audio.unlock();
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
    $('#hariSay').insertAdjacentHTML('afterbegin', `<div class="say-hari">${HH.mascot.svg({ cls: 'hari' })}</div>`);

    $('#brand').insertAdjacentHTML('afterbegin', HH.mascot.mini());
    $('#langBtn').innerHTML = ICON.globe + '<span id="langCode"></span>';
    $('#audioBtn').innerHTML = ICON.audio;
    $('#installBtn').innerHTML = ICON.install + '<span></span>';
    $('#scoreChip').innerHTML = ICON.acorn + '<b>0</b>';

    $('#home').addEventListener('click', (e) => {
      const hm = e.target.closest('#heroMascot');
      if (hm) {
        react('happy'); sfx.giggle(); hearts(hm.parentElement);
        const b = $('.bubble');
        if (b) {
          b.textContent = pick('poke');
          b.classList.remove('talk'); void b.offsetWidth; b.classList.add('talk');
          clearTimeout(b._t); b._t = setTimeout(() => { b.textContent = t('tagline'); }, 2600);
        }
        return;
      }
      if (e.target.closest('#legalLink')) { sfx.tap(); HH.legal.openPage('terms'); return; }
      const vb = e.target.closest('[data-view]');
      if (vb) { sfx.tap(); HH.store.set('homeView', vb.dataset.view); renderHome(); return; }
      const c = e.target.closest('[data-game]');
      if (c) { sfx.tap(); HH.store.set('cfLast', c.dataset.game); openGame(c.dataset.game); }
    });
    $('#langBtn').onclick = () => { renderLangSheet(); $('#langDlg').hidden = false; const cur = $('.lang.cur'); if (cur) cur.focus(); };
    $('#scoreChip').onclick = openStats;
    const closeOverlay = (dlg) => { dlg.hidden = true; };
    ['#langDlg', '#statsDlg'].forEach((sel) => {
      $(sel).addEventListener('click', (e) => {
        if (e.target === $(sel) || e.target.closest('.close')) closeOverlay($(sel));
      });
    });
    $('#langList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lang]');
      if (!b) return;
      HH.i18n.set(b.dataset.lang);
      $('#langDlg').hidden = true;
      applyTexts();
    });
    // un solo pulsante audio: musica e suoni → solo suoni → muto → musica e suoni
    $('#audioBtn').onclick = () => {
      HH.audio.unlock();
      const st = audioState();
      const next = st === 'all' ? 'sfx' : st === 'sfx' ? 'off' : 'all';
      HH.music.setOn(next === 'all');
      sfx.setMuted(next === 'off');
      HH.store.set('music', HH.music.isOn());
      HH.store.set('muted', sfx.isMuted());
      audioUI();
      sfx.tap();
      const b = $('#audioBtn');
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      say(next === 'off' ? 'idle' : 'good', true, audioLabel());
    };
    $('#home').addEventListener('click', (e) => { if (e.target.closest('#shareBtn')) { e.stopPropagation(); share(); } }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      $('#langDlg').hidden = true; $('#statsDlg').hidden = true; if (!$('#installDlg').hidden) closeInstall(3);
      const an = $('#anDlg'); if (an) an.remove();   // Esc = «non ora»: nessuna scelta salvata, la domanda torna a un prossimo avvio
    });

    setupInstall();
    setupUpdates();

    applyTexts();
    // riapertura dell'app: si torna alla partita in sospeso (se l'avviso legale è da accettare, dopo l'accettazione)
    const last = HH.store.get('screen');
    const lastG = last && HH.catalog.find((g) => g.id === last);
    const resume = () => { if (lastG && lastSave(lastG)) { S.noTrans = true; openGame(last); } };
    if (!legalGate(resume)) resume();
  }

  /* ---------- avviso legale (src/core/legal.js): una volta sola, prima di tutto il resto ----------
   * Blocca l'app finché non si accettano condizioni e informativa; poi riprende quello che si voleva fare
   * (partita in sospeso o gioco toccato) e solo dopo chiede il consenso alle statistiche. */
  function legalGate(then) {
    if (!HH.legal.needs()) return false;
    HH.legal.gate({
      openLang: () => { renderLangSheet(); $('#langDlg').hidden = false; const cur = $('.lang.cur'); if (cur) cur.focus(); },
      done: () => { if (then) then(); if (!S.game) homeIntro(1500); },
    });
    return true;
  }

  // per i moduli del nucleo (fullscreen.js, updates.js, home.js): letti al momento dell'uso, non al caricamento
  Object.assign(A, { persist, endInst, say, react, goHome, openGame, audioState, audioLabel });

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})(typeof globalThis !== 'undefined' ? globalThis : window);
