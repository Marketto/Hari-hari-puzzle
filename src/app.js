/* Hari Hari Puzzle — shell dell'app: home, schermata di gioco, vittoria, lingue, PWA. */
(function (G) {
  const HH = G.HH;
  const { t } = HH.i18n;
  const $ = (s, r = document) => r.querySelector(s);
  const sfx = HH.fx.sfx;

  const ICON = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM19 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" fill="currentColor"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="mute" d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    install: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M5 17v2.5h14V17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // Giochi proposti (in arrivo): solo card
  const SOON = [
    { id: 'pixel', name: 'Pixel Mochi', art: `<svg viewBox="0 0 120 90" aria-hidden="true">${[
      '0110110', '1111111', '1111111', '0111110', '0011100', '0001000'].map((row, r) => [...row].map((v, c) =>
      `<rect x="${25 + c * 10}" y="${12 + r * 10}" width="9" height="9" rx="2" fill="${v === '1' ? 'var(--accent)' : 'var(--hair)'}"/>`).join('')).join('')}</svg>` },
    { id: 'yarn', name: 'Yarn Link', art: `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M22 20h40v25h36" fill="none" stroke="var(--f1)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 70h20V45" fill="none" stroke="var(--f4)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="20" r="8" fill="var(--f1)"/><circle cx="98" cy="45" r="8" fill="var(--f1)"/><circle cx="22" cy="70" r="8" fill="var(--f4)"/><circle cx="42" cy="45" r="8" fill="var(--f4)"/><circle cx="98" cy="72" r="8" fill="var(--f3)"/><circle cx="68" cy="72" r="8" fill="var(--f3)"/></svg>` },
    { id: 'sushi', name: 'Sushi Binary', art: `<svg viewBox="0 0 120 90" aria-hidden="true">${[[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0]].map((row, r) => row.map((v, c) =>
      v ? `<g transform="translate(${30 + c * 20} ${18 + r * 20})"><circle r="8.5" fill="var(--ink)"/><circle r="5.5" fill="var(--card)"/><circle r="3" fill="var(--f6)"/></g>`
        : `<g transform="translate(${30 + c * 20} ${18 + r * 20})"><rect x="-9" y="-6" width="18" height="12" rx="6" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/><rect x="-9" y="-6" width="18" height="6" rx="3" fill="var(--f6)"/></g>`).join('')).join('')}</svg>` },
  ];

  const state = { game: null, inst: null, moves: 0 };
  const levelOf = (id) => HH.store.get('level:' + id, 1);

  /* ---------- Mascotte ---------- */
  function mountMascot(host) {
    host.innerHTML = HH.mascot.svg({ cls: 'hari' });
    return host.querySelector('svg');
  }
  function react(mood) {
    document.querySelectorAll('.hari').forEach((m) => {
      m.classList.remove('jump', 'oops');
      void m.getBoundingClientRect();
      m.classList.add(mood === 'win' ? 'jump' : 'oops');
    });
  }
  G.addEventListener('pointermove', (e) => {
    document.querySelectorAll('.hari .hari-shine').forEach((s) => {
      const r = s.ownerSVGElement.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / G.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / G.innerHeight;
      s.style.transform = `translate(${(dx * 10).toFixed(1)}px, ${(dy * 8).toFixed(1)}px)`;
    });
  }, { passive: true });

  /* ---------- Home ---------- */
  function renderHome() {
    const cards = HH.games.map((g) => `
      <button class="card" data-game="${g.id}" style="--tint:var(--tint-${g.id})">
        <span class="card-art">${g.art()}</span>
        <span class="card-body">
          <span class="card-title">${g.name}</span>
          <span class="card-rule">${t(g.rules)}</span>
          <span class="card-foot"><span class="chip">${t('level')} ${levelOf(g.id)}</span><span class="play">${t('play')}</span></span>
        </span>
      </button>`).join('');
    const soon = SOON.map((g) => `
      <div class="card soon" aria-disabled="true">
        <span class="card-art">${g.art}</span>
        <span class="card-body"><span class="card-title">${g.name}</span><span class="chip ghost">${t('soon')}</span></span>
      </div>`).join('');
    $('#home').innerHTML = `
      <section class="hero">
        <div class="hero-mascot" id="heroMascot"></div>
        <div class="hero-copy">
          <p class="bubble">${t('tagline')}</p>
          <h1 class="logo" aria-label="Hari Hari Puzzle"><span>Hari</span><span>Hari</span><em>Puzzle</em></h1>
          <p class="sub"><span>はりはり</span><span>${ICON.globe} ${HH.LANGS.length}</span><span>offline</span></p>
        </div>
      </section>
      <section class="grid-cards" aria-label="Games">${cards}</section>
      <h2 class="soon-title">${t('soon')}</h2>
      <section class="grid-cards small">${soon}</section>`;
    mountMascot($('#heroMascot'));
  }

  /* ---------- Gioco ---------- */
  function openGame(id, push = true) {
    const g = HH.games.find((x) => x.id === id);
    if (!g) return;
    state.game = g;
    $('#home').hidden = true;
    const scr = $('#game');
    scr.hidden = false;
    scr.innerHTML = `
      <header class="g-head">
        <button class="icon-btn" id="gBack" aria-label="Back">${ICON.back}</button>
        <div class="g-title"><h2>${g.name}</h2><span class="chip" id="gLevel"></span></div>
        <span class="chip moves"><span>${t('moves')}</span><b id="gMoves">0</b></span>
      </header>
      <div class="board" id="board"></div>
      <div class="g-tools">
        <button class="tool" id="gUndo">${ICON.undo}<span>${t('undo')}</span></button>
        <button class="tool" id="gRestart">${ICON.restart}<span>${t('restart')}</span></button>
        <button class="tool main" id="gNew">${ICON.sparkle}<span>${t('newg')}</span></button>
      </div>
      <aside class="rules"><div class="rules-hari" id="rulesHari"></div><p>${t(g.rules)}</p></aside>`;
    mountMascot($('#rulesHari'));
    const ctx = {
      get level() { return levelOf(g.id); },
      moves(n) { state.moves = n; const m = $('#gMoves'); if (m) m.textContent = n; },
      win, sfx, react,
    };
    state.inst = g.create($('#board'), ctx);
    $('#gLevel').textContent = `${t('level')} ${levelOf(g.id)}`;
    $('#gBack').onclick = () => (push ? history.back() : goHome());
    $('#gUndo').onclick = () => state.inst.undo();
    $('#gRestart').onclick = () => state.inst.restart();
    $('#gNew').onclick = () => state.inst.fresh();
    if (push) try { history.pushState({ game: id }, ''); } catch (e) { /* sandbox */ }
    G.scrollTo(0, 0);
  }

  function goHome() {
    state.game = null; state.inst = null;
    $('#game').hidden = true; $('#game').innerHTML = '';
    $('#home').hidden = false;
    renderHome();
  }
  G.addEventListener('popstate', () => { if (state.game) goHome(); });

  function win() {
    const g = state.game;
    if (!g || !$('#winDlg').hidden) return;
    HH.store.set('level:' + g.id, levelOf(g.id) + 1);
    sfx.win(); react('win');
    HH.fx.confetti($('#fxCanvas'));
    $('#winDlg').hidden = false;
    $('#winBox').innerHTML = `
      <div class="win-hari">${HH.mascot.svg({ cls: 'hari jump' })}</div>
      <h2>${t('win')}</h2>
      <p class="win-stats"><span>${t('moves')} <b>${state.moves}</b></span><span>${t('level')} <b>${levelOf(g.id)}</b></span></p>
      <button class="tool main" id="winNext">${ICON.sparkle}<span>${t('next')}</span></button>`;
    $('#winNext').focus();
    $('#winNext').onclick = () => {
      $('#winDlg').hidden = true;
      $('#gLevel').textContent = `${t('level')} ${levelOf(g.id)}`;
      state.inst.fresh();
    };
  }

  /* ---------- Lingue ---------- */
  function renderLangSheet() {
    $('#langList').innerHTML = HH.LANGS.map((l) =>
      `<button class="lang${l.code === HH.i18n.code ? ' cur' : ''}" data-lang="${l.code}" lang="${l.code}" dir="${l.dir}"><b>${l.name}</b><small>${l.code}</small></button>`).join('');
    $('#langTitle').textContent = t('lang');
  }

  function applyTexts() {
    $('#langBtn').setAttribute('aria-label', t('lang'));
    $('#installBtn span').textContent = t('install');
    if (state.game) openGame(state.game.id, false); else renderHome();
  }

  /* ---------- Avvio ---------- */
  function boot() {
    HH.i18n.set(HH.i18n.detect());
    HH.fx.background($('#bgCanvas'));
    sfx.setMuted(HH.store.get('muted', false));
    document.documentElement.classList.toggle('muted', sfx.isMuted());

    $('#brand').insertAdjacentHTML('afterbegin', HH.mascot.mini());
    $('#langBtn').innerHTML = ICON.globe + `<span id="langCode">${HH.i18n.code.toUpperCase()}</span>`;
    $('#soundBtn').innerHTML = ICON.sound;
    $('#installBtn').innerHTML = ICON.install + '<span></span>';

    $('#home').addEventListener('click', (e) => {
      const c = e.target.closest('[data-game]');
      if (c) { sfx.tap(); openGame(c.dataset.game); }
    });
    $('#langBtn').onclick = () => { renderLangSheet(); $('#langDlg').hidden = false; $('.lang.cur') && $('.lang.cur').focus(); };
    $('#langClose').onclick = () => { $('#langDlg').hidden = true; };
    $('#langDlg').addEventListener('click', (e) => {
      if (e.target.id === 'langDlg') { $('#langDlg').hidden = true; return; }
      const b = e.target.closest('[data-lang]');
      if (!b) return;
      HH.i18n.set(b.dataset.lang);
      $('#langCode').textContent = HH.i18n.code.toUpperCase();
      $('#langDlg').hidden = true;
      applyTexts();
    });
    $('#soundBtn').onclick = () => {
      sfx.setMuted(!sfx.isMuted());
      HH.store.set('muted', sfx.isMuted());
      document.documentElement.classList.toggle('muted', sfx.isMuted());
      sfx.tap();
    };
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { $('#langDlg').hidden = true; }
    });

    // PWA: installazione su Android
    let deferred = null;
    G.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
    $('#installBtn').onclick = async () => {
      if (!deferred) return;
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) { /* annullato */ }
      deferred = null; $('#installBtn').hidden = true;
    };
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !HH.INLINE) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    applyTexts();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})(typeof globalThis !== 'undefined' ? globalThis : window);
