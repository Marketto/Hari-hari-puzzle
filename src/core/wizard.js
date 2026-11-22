/* Guida della home (regola R13): al primo avvio Hari mostra le parti dell'app con un riquadro di focus (un buco luminoso
 * nella velatura) e una nuvoletta con una frase corta; dopo un aggiornamento solo le novità; una volta sola; il
 * pulsante «?» nella barra in alto la rilancia completa. Riguarda solo la home: i tutorial dei giochi restano loro.
 *
 * Logica pura (testata in tests/wizard.test.mjs, gira anche in Node senza DOM):
 *   HH.wizard.vcmp(a, b)                         confronto di versioni "x.y.z" → -1 · 0 · 1
 *   HH.wizard.newsBetween(news, from, to)        novità delle versioni in (from, to], max 3 per versione
 *   HH.wizard.gameNews(catalog, from, to)        giochi arrivati in (from, to] (campo since del catalogo)
 *   HH.wizard.plan({ stored, legacy, cur, news, catalog }) → { mode: 'tour'|'news'|null, items }
 *   HH.wizard.tourSteps(has)                     passi del giro completo presenti a schermo (has(sel) → bool)
 * Interfaccia (solo nel browser):
 *   HH.wizard.auto({ busy, done })  dalla home: parte se serve (true = partirà, done() alla chiusura)
 *   HH.wizard.start('tour')         giro completo (pulsante «?») · HH.wizard.close() · HH.wizard.isOpen()
 * Salvataggio: HH.store 'wizard' = { v: versione dell'app vista }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  /* ---------- registro delle novità: 1–3 per versione, chiave i18n e (facoltativo) elemento da mettere a fuoco ----------
   * La versione è quella in cui la novità arriva: va allineata a HH.VERSION al rilascio. */
  const NEWS = {
    '0.31.0': [{ key: 'wz_new_help', sel: '#wzHelp' }],
  };
  const MAX_PER_VERSION = 3, MAX_NEWS = 6;

  /* ---------- passi del giro completo: il primo elemento presente di ogni gruppo `sel`; `also` = buchi in più ---------- */
  const TOUR = [
    { id: 'games', alt: [{ sel: '#home .resume', key: 'wz_resume' }, { sel: '#gameCards .card', key: 'wz_cards' }] },
    { id: 'view', sel: '#home .view-bar', key: 'wz_view' },
    { id: 'settings', sel: '#langBtn', also: ['#audioBtn'], key: 'wz_settings' },
    { id: 'score', sel: '#scoreChip', key: 'wz_score' },
    { id: 'share', sel: '#shareBtn', also: ['#installBtn'], key: 'wz_share', keyAlso: 'wz_share_install' },
    { id: 'help', sel: '#wzHelp', key: 'wz_help' },
  ];

  const parts = (v) => String(v || '0').split('.').map((x) => parseInt(x, 10) || 0);
  function vcmp(a, b) {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d < 0 ? -1 : 1;
    }
    return 0;
  }
  const inRange = (v, from, to) => vcmp(v, from) > 0 && vcmp(v, to) <= 0;
  function newsBetween(news, from, to) {
    return Object.keys(news || {}).filter((v) => inRange(v, from, to)).sort(vcmp)
      .flatMap((v) => (news[v] || []).slice(0, MAX_PER_VERSION).map((n) => Object.assign({ v }, n)));
  }
  function gameNews(catalog, from, to) {
    return (catalog || []).filter((g) => g.since && inRange(g.since, from, to))
      .map((g) => ({ v: g.since, key: 'wz_new_game', game: g.id, name: g.name, sel: `#gameCards .card[data-game="${g.id}"]` }));
  }
  // stored = HH.store 'wizard' · legacy = 'seenVersion' letta prima dell'avvio (giocatore di una versione senza guida)
  function plan({ stored, legacy, cur, news = NEWS, catalog = [] } = {}) {
    const seen = stored && stored.v ? stored.v : legacy || null;
    if (!seen) return { mode: 'tour', items: TOUR };
    if (vcmp(seen, cur) >= 0) return { mode: null, items: [] };
    // le più recenti in fondo; se sono tante si tengono le ultime
    const items = [...gameNews(catalog, seen, cur), ...newsBetween(news, seen, cur)].sort((a, b) => vcmp(a.v, b.v)).slice(-MAX_NEWS);
    return { mode: items.length ? 'news' : null, items };
  }
  // passi da mostrare: { sels: [...], key } solo per gli elementi presenti; un passo senza elementi si salta
  function tourSteps(has, steps = TOUR) {
    const out = [];
    for (const s of steps) {
      if (s.alt) { const a = s.alt.find((x) => has(x.sel)); if (a) out.push({ id: s.id, sels: [a.sel], key: a.key }); continue; }
      if (!has(s.sel)) continue;
      const extra = (s.also || []).filter(has);
      out.push({ id: s.id, sels: [s.sel, ...extra], key: extra.length && s.keyAlso ? s.keyAlso : s.key });
    }
    return out;
  }
  function newsSteps(has, items) {
    return items.map((n) => ({ id: 'news', sels: n.sel && has(n.sel) ? [n.sel] : [], key: n.key, name: n.name }));
  }

  const W = (HH.wizard = { NEWS, TOUR, vcmp, newsBetween, gameNews, plan, tourSteps, newsSteps });
  if (typeof document === 'undefined') return;

  /* ======================= interfaccia ======================= */
  const legacy = HH.store.get('seenVersion', null);       // letta adesso: app.js la aggiorna all'avvio
  const $ = (s, r = document) => r.querySelector(s);
  const t = (k) => HH.i18n.t(k);
  const reduced = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tap = () => { try { HH.fx.sfx.tap(); } catch (e) { /* audio non pronto */ } };
  const visible = (el) => {
    if (!el || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0;
  };
  const has = (sel) => visible($(sel));
  const homeOn = () => { const h = $('#home'); return !!(h && !h.hidden && $('#game') && $('#game').hidden); };
  // un'altra finestra aperta (lingue, progressi, installazione, statistiche, avviso legale, transizione, velo)
  const otherOpen = () => [...document.querySelectorAll('.overlay')].some((o) => !o.hidden && o.id !== 'wzRoot') || !!$('.trans');

  let root = null, steps = [], idx = 0, mode = null, opts = {}, prevFocus = null, raf = 0, anim = null, cur = null;
  let autoT = 0, autoDone = false;

  /* ---------- pulsante «?» nella barra in alto (discreto, solo in home) ---------- */
  function helpBtn() {
    if ($('#wzHelp')) return;
    const bar = $('.topbar .actions');
    if (!bar) return;
    const b = document.createElement('button');
    b.id = 'wzHelp'; b.type = 'button'; b.className = 'icon-btn wz-help';
    b.innerHTML = '<b aria-hidden="true">?</b>';
    b.onclick = () => { tap(); start('tour', { from: b }); };
    bar.appendChild(b);
    label();
  }
  function label() { const b = $('#wzHelp'); if (b) { b.setAttribute('aria-label', t('wz_open')); b.title = t('wz_open'); } }

  /* ---------- geometria ---------- */
  const PAD = 6;
  function rectsOf(st) {
    const vw = G.innerWidth, vh = G.innerHeight;
    return st.sels.map((s) => $(s)).filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      const x = Math.max(4, r.left - PAD), y = Math.max(4, r.top - PAD);
      const x2 = Math.min(vw - 4, r.right + PAD), y2 = Math.min(vh - 4, r.bottom + PAD);
      const h = Math.max(0, y2 - y);
      return { x, y, w: Math.max(0, x2 - x), h, r: Math.min(22, h / 2) };
    }).filter((q) => q.w > 0 && q.h > 0);
  }
  const rr = ({ x, y, w, h, r }) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  function paint(rs) {
    const vw = G.innerWidth, vh = G.innerHeight, svg = root.querySelector('.wz-veil');
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.querySelector('.wz-shade').setAttribute('d', `M0 0H${vw}V${vh}H0Z` + rs.map(rr).join(''));
    svg.querySelector('.wz-rings').innerHTML = rs.map((q) => `<path class="wz-ring" d="${rr(q)}"/>`).join('');
    cur = rs;
  }
  // dal riquadro di prima al nuovo (con "riduci movimento": salto diretto)
  function moveTo(rs) {
    cancelAnimationFrame(anim);
    const from = cur;
    if (reduced() || !from || !from.length || !rs.length) { paint(rs); return; }
    const t0 = performance.now(), dur = 320;
    const pick = (i) => from[Math.min(i, from.length - 1)];
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      paint(rs.map((q, i) => { const p = pick(i); return { x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e, w: p.w + (q.w - p.w) * e, h: p.h + (q.h - p.h) * e, r: p.r + (q.r - p.r) * e }; }));
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  // nuvoletta: sotto, sopra, a lato del riquadro; se non c'è posto, in basso al centro
  function placeBubble(rs) {
    const b = root.querySelector('.wz-bubble'), vw = G.innerWidth, vh = G.innerHeight, M = 10, GAP = 14;
    b.style.left = '0px'; b.style.top = '0px';
    const bw = b.offsetWidth, bh = b.offsetHeight;
    const clampX = (x) => Math.max(M, Math.min(vw - bw - M, x));
    const clampY = (y) => Math.max(M, Math.min(vh - bh - M, y));
    let x, y, side = 'none', tail = 0;
    if (rs.length) {
      const u = rs.reduce((a, q) => ({ x: Math.min(a.x, q.x), y: Math.min(a.y, q.y), x2: Math.max(a.x2, q.x + q.w), y2: Math.max(a.y2, q.y + q.h) }), { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity });
      const cx = (u.x + u.x2) / 2, cy = (u.y + u.y2) / 2;
      if (vh - u.y2 - GAP >= bh + M) { side = 'below'; y = u.y2 + GAP; x = clampX(cx - bw / 2); }
      else if (u.y - GAP >= bh + M) { side = 'above'; y = u.y - GAP - bh; x = clampX(cx - bw / 2); }
      else if (vw - u.x2 - GAP >= bw + M) { side = 'right'; x = u.x2 + GAP; y = clampY(cy - bh / 2); }
      else if (u.x - GAP >= bw + M) { side = 'left'; x = u.x - GAP - bw; y = clampY(cy - bh / 2); }
      if (side === 'below' || side === 'above') tail = Math.max(22, Math.min(bw - 22, cx - x));
      else if (side !== 'none') tail = Math.max(22, Math.min(bh - 22, cy - y));
    }
    if (side === 'none') { x = clampX((vw - bw) / 2); y = vh - bh - Math.max(M, 16); }
    b.style.left = `${Math.round(x)}px`; b.style.top = `${Math.round(y)}px`;
    b.dataset.side = side;
    b.style.setProperty('--tail', `${Math.round(tail)}px`);
  }
  function layout() {
    raf = 0;
    if (!root || !steps[idx]) return;
    const rs = rectsOf(steps[idx]);
    if (anim && cur && cur.length) { cancelAnimationFrame(anim); anim = null; }
    paint(rs);
    placeBubble(rs);
  }
  const relayout = () => { if (root && !raf) raf = requestAnimationFrame(layout); };

  /* ---------- passi ---------- */
  function text(st) { return t(st.key).replace('{name}', st.name || ''); }
  function show(i) {
    if (!root) return;
    // un elemento sparito nel frattempo (es. pulsante Installa nascosto): si salta nella stessa direzione
    const dir = i >= idx ? 1 : -1;
    while (i >= 0 && i < steps.length && steps[i].sels.length && !steps[i].sels.some(has)) i += dir;
    if (i < 0) i = 0;
    if (i >= steps.length) { close(); return; }
    idx = i;
    const st = steps[i], last = i === steps.length - 1, el = st.sels.map((s) => $(s)).find(visible);
    if (el) {
      // fuori schermo (giù nella pagina o nel carosello): lo si porta in vista, senza scorrimento animato
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > G.innerHeight || r.left < 0 || r.right > G.innerWidth) el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
    }
    const b = root.querySelector('.wz-bubble');
    b.querySelector('.wz-text').textContent = text(st);
    b.querySelector('.wz-count').textContent = steps.length > 1 ? t('wz_step').replace('{n}', i + 1).replace('{total}', steps.length) : '';
    b.querySelector('.wz-dots').innerHTML = steps.length > 1 ? steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('') : '';
    const prev = b.querySelector('[data-wz="prev"]'), next = b.querySelector('[data-wz="next"]'), skip = b.querySelector('[data-wz="skip"]');
    prev.hidden = i === 0;
    skip.hidden = last;
    next.querySelector('span').textContent = last ? t(mode === 'news' ? 'wz_ok' : 'wz_done') : t('next');
    b.classList.remove('wz-pop'); void b.offsetWidth; b.classList.add('wz-pop');
    const rs = rectsOf(st);
    moveTo(rs);
    placeBubble(rs);
    next.focus({ preventScroll: true });
  }
  function onKey(e) {
    if (!root) return;
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); tap(); close(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const fwd = (e.key === 'ArrowRight') !== rtl;
      if (fwd) { if (idx < steps.length - 1) { tap(); show(idx + 1); } } else if (idx > 0) { tap(); show(idx - 1); }
      return;
    }
    if (e.key === 'Tab') {
      // il focus resta nella nuvoletta
      const f = [...root.querySelectorAll('.wz-bubble button')].filter((x) => !x.hidden);
      if (!f.length) return;
      const a = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  function build() {
    root = document.createElement('div');
    root.id = 'wzRoot'; root.className = 'wz';
    root.innerHTML = `<svg class="wz-veil" aria-hidden="true" preserveAspectRatio="none"><path class="wz-shade" fill-rule="evenodd"/><g class="wz-rings"></g></svg>
      <div class="wz-bubble" role="dialog" aria-modal="true" aria-labelledby="wzTitle" aria-describedby="wzText">
        <div class="wz-hari">${HH.mascot.mini()}</div>
        <div class="wz-body">
          <h2 class="wz-title" id="wzTitle"><span>${t(mode === 'news' ? 'wz_news' : 'wz_title')}</span> <small class="wz-count"></small></h2>
          <p class="wz-text" id="wzText" aria-live="polite"></p>
          <div class="wz-foot"><span class="wz-dots" aria-hidden="true"></span>
            <button type="button" class="wz-link" data-wz="skip">${t('tutSkip')}</button>
            <button type="button" class="tool wz-btn wz-prev" data-wz="prev" aria-label="${t('lg_back')}" title="${t('lg_back')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button type="button" class="candy wz-btn" data-wz="next"><span></span></button>
          </div>
        </div>
      </div>`;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-wz]');
      if (b) {
        tap();
        const a = b.dataset.wz;
        if (a === 'skip') close();
        else if (a === 'prev') show(idx - 1);
        else if (idx >= steps.length - 1) close();
        else show(idx + 1);
        return;
      }
      // tocco dentro un riquadro: avanti (fuori: niente, la velatura protegge la pagina)
      if (!e.target.closest('.wz-bubble') && cur && cur.some((q) => e.clientX >= q.x && e.clientX <= q.x + q.w && e.clientY >= q.y && e.clientY <= q.y + q.h)) {
        tap();
        if (idx >= steps.length - 1) close(); else show(idx + 1);
      }
    });
    document.body.appendChild(root);
  }

  function start(m, o = {}) {
    if (root || !homeOn() || (HH.legal && HH.legal.needs())) return false;
    mode = m;
    const p = m === 'tour' ? null : plan({ stored: HH.store.get('wizard', null), legacy, cur: HH.VERSION, catalog: HH.catalog });
    steps = m === 'tour' ? tourSteps(has) : newsSteps(has, o.items || (p && p.items) || []);
    // vista e segnato subito: una volta sola anche se si chiude l'app a metà
    HH.store.set('wizard', { v: HH.VERSION });
    if (!steps.length) return false;
    opts = o; idx = 0; cur = null;
    prevFocus = o.from || document.activeElement;
    build();
    document.addEventListener('keydown', onKey, true);
    G.addEventListener('resize', relayout);
    G.addEventListener('scroll', relayout, { passive: true, capture: true });
    show(0);
    return true;
  }
  function close() {
    if (!root) return;
    cancelAnimationFrame(anim); cancelAnimationFrame(raf); raf = 0; anim = null;
    document.removeEventListener('keydown', onKey, true);
    G.removeEventListener('resize', relayout);
    G.removeEventListener('scroll', relayout, { capture: true });
    root.remove(); root = null; cur = null;
    const done = opts.done;
    opts = {};
    if (prevFocus && prevFocus.isConnected && homeOn()) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* elemento non focalizzabile */ } }
    prevFocus = null;
    if (done) done();
  }
  // dalla home: parte se è il primo avvio o ci sono novità; aspetta che non ci sia altro aperto (mai bloccare)
  function auto(o = {}) {
    if (autoDone || root) return !!root;
    if (HH.legal && HH.legal.needs()) return false;
    const p = plan({ stored: HH.store.get('wizard', null), legacy, cur: HH.VERSION, catalog: HH.catalog });
    if (!p.mode) { if (vcmp((HH.store.get('wizard', null) || {}).v, HH.VERSION) < 0) HH.store.set('wizard', { v: HH.VERSION }); autoDone = true; return false; }
    clearTimeout(autoT);
    let tries = 0;
    const go = () => {
      if (autoDone || root) return;
      // un gioco aperto: si riproverà alla prossima home
      if (!homeOn() || (o.busy && o.busy())) return;
      if (otherOpen()) { if (++tries < 40) autoT = setTimeout(go, 700); return; }
      autoDone = true;
      if (!start(p.mode, { items: p.items, done: o.done }) && o.done) o.done();
    };
    autoT = setTimeout(go, reduced() ? 300 : 700);
    return true;
  }

  Object.assign(W, { auto, start, close, isOpen: () => !!root });
  const init = () => { helpBtn(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  // cambio lingua: etichetta del «?» e testi della guida aperta
  if (HH.i18n && HH.i18n.onChange) HH.i18n.onChange(() => {
    label();
    if (!root) return;
    root.querySelector('.wz-title span').textContent = t(mode === 'news' ? 'wz_news' : 'wz_title');
    root.querySelector('[data-wz="skip"]').textContent = t('tutSkip');
    root.querySelector('[data-wz="prev"]').setAttribute('aria-label', t('lg_back'));
    show(idx);
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
