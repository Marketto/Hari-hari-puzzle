/* Hari Hari Puzzle — home (HH.home): card dei giochi e «Riprendi», viste (lista · icone · carosello Cover Flow),
 * guida e domanda sulle statistiche anonime, Progressi, lingue, Condividi. Legge lo stato dell'app da HH.app (S, say,
 * react) solo al momento dell'uso. */
(function (G) {
  const HH = G.HH;
  const A = (HH.app = HH.app || {});
  const { t, $, lab, ICON, metaHTML, STAR, stars, fmtLong, fmt, nf, word, cardArt } = HH.ui;
  const { isNew } = HH.updates;
  const sfx = HH.fx.sfx;
  const P = HH.progress;

  // Giochi proposti (in arrivo): solo card
  // giochi «in arrivo» mostrati in fondo alla home ({ id, name, art }); spariscono da soli quando quello vero è nel catalogo
  const SOON = [];

  // partita in sospeso di un gioco nel posto che si riaprirà (es. Hari Taxi: la mappa corrente drive@ostia …)
  const lastSave = (g) => P.loadGame(HH.store.get('slot:' + g.id) || g.id);

  /* ---------- Home ---------- */
  function renderHome() {
    HH.music.play('menu', 0.45);
    HH.music.duck(false);
    const saves = HH.catalog.map((g) => ({ g, s: lastSave(g) })).filter((x) => x.s).sort((a, b) => b.s.ts - a.s.ts);
    const r = saves[0];
    const resume = r ? `
      <button class="resume" data-game="${r.g.id}">
        <span class="resume-art" style="--tint:var(--tint-${r.g.id})">${cardArt(r.g.id)}</span>
        <span class="resume-text">
          <small><i class="dot"></i>${t('paused')}</small>
          <b>${r.g.name}</b>
          <span class="resume-meta">${r.g.endless ? metaHTML(r.s.meta) : `<span>${t('level')} ${r.s.level}</span><span>${ICON.clock}${fmt(r.s.elapsed)}</span><span>${ICON.paw}${nf(r.s.state.moves)}</span>`}</span>
        </span>
        <span class="candy">${ICON.play}<span>${t('resume')}</span></span>
      </button>` : '';
    const cards = HH.catalog.map((g, idx) => {
      const p = P.get(g.id), s = lastSave(g);
      return `<button class="card" data-game="${g.id}" style="--tint:var(--tint-${g.id});--i:${idx}">
        <span class="card-art">
          ${g.endless ? '' : `<span class="ribbon-tag">${t('level')} ${p.level}</span>`}
          ${s ? `<span class="pause-tag">${ICON.pause}${fmt(s.elapsed)}</span>` : ''}
          ${isNew(g.id) ? `<span class="new-tag">${ICON.sparkle}${lab('newTag', 'New!')}</span>` : ''}
          ${cardArt(g.id)}
        </span>
        <span class="card-body">
          <span class="card-title">${g.name}</span>
          <span class="card-rule">${lab(g.rules, g.rulesEn || g.rules)}</span>
          ${g.endless ? `<span class="card-stats resume-meta">${s ? metaHTML(s.meta) : ''}</span>` : `<span class="card-stats"><span class="stars" aria-hidden="true">${stars(p.last)}</span><span class="best" title="${t('best')}">${ICON.trophy}<b>${nf(p.best)}</b></span></span>`}
          <span class="card-foot">${g.endless ? '<span></span>' : `<span class="wins">${t('wins')} <b>${nf(p.wins)}</b></span>`}<span class="candy">${ICON.play}<span>${t(s ? 'resume' : 'play')}</span></span></span>
        </span>
      </button>`;
    }).join('');
    // i giochi "in arrivo" spariscono da soli quando quello vero è registrato
    const soon = SOON.filter((x) => !HH.catalog.some((g) => g.name === x.name)).map((g) => `
      <div class="card soon" aria-disabled="true">
        <span class="card-art">${g.art}</span>
        <span class="card-body"><span class="card-title">${g.name}</span><span class="chip ghost">${t('soon')}</span></span>
      </div>`).join('');
    $('#home').innerHTML = `
      <section class="hero">
        <div class="hero-stage">
          <span class="cloud-seat" aria-hidden="true"></span>
          <button class="hero-mascot" id="heroMascot" aria-label="Hari">${HH.mascot.svg({ cls: 'hari' })}</button>
        </div>
        <div class="hero-copy">
          <p class="bubble">${t('tagline')}</p>
          <h1 class="logo" aria-label="Hari Hari Puzzle"><span class="logo-main">${word('Hari', 'a')}${word('Hari', 'b')}<span class="br"></span><span class="logo-ribbon">Puzzle</span></span><span class="logo-side"><button class="share-btn" id="shareBtn" type="button" aria-label="${lab('share', 'Share')}" title="${lab('share', 'Share')}">${ICON.share}<span>${lab('share', 'Share')}</span></button><span class="logo-ver" aria-hidden="true">✿ v${HH.VERSION}</span></span></h1>
          <p class="sub"><span>はりはり</span><span>${ICON.globe} ${HH.LANGS.length}</span><span>offline</span></p>
        </div>
      </section>
      ${resume}
      <div class="view-bar" role="radiogroup" aria-label="${lab('viewLabel', 'View')}">${VIEWS.map((v) => `<button class="view-btn${v.id === homeView() ? ' on' : ''}" role="radio" aria-checked="${v.id === homeView()}" data-view="${v.id}" aria-label="${lab(v.key, v.en)}" title="${lab(v.key, v.en)}">${ICON[v.icon]}</button>`).join('')}</div>
      <section class="grid-cards view-${homeView()}" id="gameCards" aria-label="${lab('goHome', 'All games')}">${cards}</section>
      ${homeView() === 'carousel' ? `<div class="cf-dots" aria-hidden="true">${HH.catalog.map((g, i) => `<i data-i="${i}"></i>`).join('')}</div>` : ''}
      ${soon ? `<h2 class="soon-title">${ICON.sparkle}<span>${t('soon')}</span>${ICON.sparkle}</h2>
      <section class="grid-cards small">${soon}</section>` : ''}
      <footer class="home-foot"><button class="lg-foot-link" id="legalLink" type="button">${t('lg_link')}</button></footer>`;
    markRemote();
    if (homeView() === 'carousel') coverFlow();
    homeIntro();
  }

  // guida della home (src/core/wizard.js) al primo avvio o con novità, poi l'eventuale domanda sulle statistiche
  function homeIntro(delay) {
    const busy = () => !!(A.S.game || A.S.loading || (HH.transition && HH.transition.busy()));
    if (!(HH.wizard && HH.wizard.auto({ busy, done: () => askConsent(1500) }))) askConsent(delay);
  }

  /* ---------- consenso alle statistiche anonime (solo se configurate; si chiede una volta, in home) ---------- */
  let consentAsked = false;
  // (solo dopo l'avviso legale: finché non è accettato non si chiede nulla)
  function askConsent(delay = 4000) {
    if (consentAsked || !HH.usage.canAsk() || HH.usage.consent() !== null || HH.legal.needs()) return;
    consentAsked = true;
    setTimeout(() => {
      // (anche durante l'apertura di un gioco: A.S.game arriva solo a schermo coperto dalla transizione)
      if (A.S.game || A.S.loading || (HH.transition && HH.transition.busy()) || HH.usage.consent() !== null || HH.legal.isOpen() || (HH.wizard && HH.wizard.isOpen())) { consentAsked = false; return; }
      const d = document.createElement('div');
      d.className = 'overlay'; d.id = 'anDlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'anTitle');
      d.innerHTML = `<div class="sheet an-sheet"><div class="an-hari">${HH.mascot.svg({ cls: 'hari happy' })}</div>
        <h2 id="anTitle" tabindex="-1">${lab('an_title', 'Help Hari get better!')}</h2><p>${lab('an_text', 'Can we send anonymous statistics? Only which games are played and for how many minutes: no names, no personal data. You can change your mind in Progress.')}</p>
        <div class="win-actions"><button class="tool" data-an="0">${lab('an_no', 'No thanks')}</button><button class="candy" data-an="1">${ICON.sparkle}<span>${lab('an_yes', 'Yes, gladly')}</span></button></div></div>`;
      document.body.appendChild(d);
      d.onclick = (e) => { const b = e.target.closest('[data-an]'); if (!b) return; HH.usage.setConsent(b.dataset.an === '1'); sfx.tap(); d.remove(); };
      d.querySelector('#anTitle').focus({ preventScroll: true });   // focus sul titolo, non su un pulsante: il consenso dev'essere una scelta attiva
    }, delay);
  }

  /* ---------- modalità di visualizzazione dei giochi: lista · icone 2 per riga · carosello (Cover Flow) ---------- */
  const VIEWS = [
    { id: 'list', icon: 'vList', key: 'viewList', en: 'List' },
    { id: 'grid', icon: 'vGrid', key: 'viewGrid', en: 'Icons' },
    { id: 'carousel', icon: 'vCarousel', key: 'viewCarousel', en: 'Carousel' },
  ];
  const homeView = () => { const v = HH.store.get('homeView', 'grid'); return VIEWS.some((x) => x.id === v) ? v : 'grid'; };
  // carosello: la card al centro è grande e dritta, le altre ruotano in prospettiva come il Cover Flow del Mac
  function coverFlow() {
    const row = $('#gameCards');
    if (!row) return;
    const cards = [...row.querySelectorAll('.card')];
    const dots = [...document.querySelectorAll('.cf-dots i')];
    let raf = 0;
    const paint = () => {
      raf = 0;
      const mid = row.scrollLeft + row.clientWidth / 2;
      let best = 0, bd = Infinity;
      cards.forEach((c, i) => {
        const cx = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.max(-1.6, Math.min(1.6, (cx - mid) / c.offsetWidth));
        const a = Math.abs(d);
        if (a < bd) { bd = a; best = i; }
        c.style.transform = `perspective(900px) translateZ(${(-a * 140).toFixed(0)}px) rotateY(${(-d * 42).toFixed(1)}deg) scale(${(1 - Math.min(a, 1) * 0.12).toFixed(3)})`;
        c.style.zIndex = String(100 - Math.round(a * 10));
        c.style.opacity = (1 - Math.min(a, 1.6) * 0.28).toFixed(2);
        c.classList.toggle('cf-on', a < 0.5);
      });
      dots.forEach((dot, i) => dot.classList.toggle('on', i === best));
    };
    row.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    G.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(paint); });
    // tocco su una card laterale: prima la porta al centro, poi si gioca
    row.addEventListener('click', (e) => {
      const c = e.target.closest('.card');
      if (c && !c.classList.contains('cf-on')) { e.stopPropagation(); e.preventDefault(); c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
    }, true);
    // riparte dall'ultimo gioco aperto
    const last = cards.findIndex((c) => c.dataset.game === HH.store.get('cfLast'));
    if (last > 0) row.scrollLeft = cards[last].offsetLeft + cards[last].offsetWidth / 2 - row.clientWidth / 2;
    paint();
  }

  // card dei giochi non ancora scaricati: nuvoletta (servono internet la prima volta)
  function markRemote() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    HH.catalog.forEach((c) => HH.gameOffline(c.id).then((ok) => {
      const el = document.querySelector(`.card[data-game="${c.id}"]`);
      if (el) el.classList.toggle('remote', !ok);
    }));
  }

  /* ---------- Progressi ---------- */
  function openStats() {
    const playT = (id) => `<span class="stat-play" title="${lab('st_play', 'Playing time')}">${ICON.clock}${fmtLong(HH.usage.get(id).sec)}</span>`;
    const rows = HH.catalog.map((g) => {
      const p = P.get(g.id);
      if (g.endless) {
        const sv = P.loadGame(g.id);
        return `<div class="stat-row" style="--tint:var(--tint-${g.id})"><span class="stat-art">${cardArt(g.id)}</span>
          <div class="stat-main"><div class="stat-name"><b>${g.name}</b>${playT(g.id)}</div><span class="resume-meta">${sv ? metaHTML(sv.meta) : '—'}</span></div></div>`;
      }
      return `<div class="stat-row" style="--tint:var(--tint-${g.id})">
        <span class="stat-art">${cardArt(g.id)}</span>
        <div class="stat-main">
          <div class="stat-name"><b>${g.name}</b>${playT(g.id)}<span class="stars">${stars(p.last)}</span></div>
          <dl class="stat-grid">
            <div><dt>${t('level')}</dt><dd>${p.level}</dd></div>
            <div><dt>${t('wins')}</dt><dd>${nf(p.wins)}</dd></div>
            <div><dt>${t('best')}</dt><dd>${nf(p.best)}</dd></div>
            <div><dt>${t('time')}</dt><dd>${p.bestTime ? fmt(p.bestTime) : '—'}</dd></div>
            <div><dt>${STAR(true)}</dt><dd>${nf(p.stars)}</dd></div>
          </dl>
        </div>
      </div>`;
    }).join('');
    $('#statsTitle').textContent = t('stats');
    $('#statsBody').innerHTML = `
      <div class="stat-total">${ICON.acorn}<div><small>${t('score')}</small><b>${nf(P.totalScore())}</b></div><div class="stat-hari">${HH.mascot.svg({ cls: 'hari happy' })}</div></div>
      <div class="stat-time">${ICON.clock}<span>${lab('st_play', 'Playing time')}</span><b>${fmtLong(HH.usage.total(HH.catalog.map((g) => g.id)))}</b></div>
      ${rows}
      <label class="stat-consent"><input type="checkbox" id="cvdToggle"${HH.fx.cvd.on() ? ' checked' : ''}><span>${lab('cvd_toggle', 'Colour-blind friendly colours')}</span></label>
      ${HH.usage.canAsk() ? `<label class="stat-consent"><input type="checkbox" id="anToggle"${HH.usage.enabled() ? ' checked' : ''}><span>${lab('an_toggle', 'Send anonymous statistics')}</span></label>` : ''}
      <div class="stat-legal"><button class="lg-foot-link" id="statsLegal" type="button">${t('lg_link')}</button></div>`;
    const tg = $('#anToggle');
    if (tg) tg.onchange = () => HH.usage.setConsent(tg.checked);
    $('#cvdToggle').onchange = (e) => HH.fx.cvd.set(e.target.checked);
    $('#statsLegal').onclick = () => { sfx.tap(); HH.legal.openPage('privacy'); };
    $('#statsDlg').hidden = false;
    $('#statsClose').focus();
  }

  /* ---------- Lingue ---------- */
  function renderLangSheet() {
    $('#langList').innerHTML = HH.LANGS.map((l) =>
      `<button class="lang${l.code === HH.i18n.code ? ' cur' : ''}" data-lang="${l.code}" lang="${l.code}" dir="${l.dir}"><b>${l.name}</b><small>${l.code}</small></button>`).join('');
    $('#langTitle').textContent = t('lang');
  }

  // condividi l'app: menu di condivisione del telefono, altrimenti copia il link
  const SITE = 'https://marketto.github.io/Hari-hari-puzzle/';
  function share() {
    sfx.tap();
    const data = { title: 'Hari Hari Puzzle', text: lab('shareText', 'Cozy logic puzzles with Hari the hedgehog: free, and they work offline too!'), url: SITE };
    if (navigator.share) { navigator.share(data).catch(() => {}); return; }
    const done = () => { A.say('good', true, lab('shareCopied', 'Link copied! Send it to a friend 💌')); A.react('happy'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(`${data.text} ${SITE}`).then(done, () => A.say('good', true, SITE));
    else A.say('good', true, SITE);
  }

  HH.home = { renderHome, homeIntro, lastSave, openStats, renderLangSheet, share };
})(typeof globalThis !== 'undefined' ? globalThis : window);
