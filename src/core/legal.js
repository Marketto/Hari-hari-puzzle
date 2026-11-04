/* Avviso legale (una volta sola) + pagina "Privacy e condizioni" con tre schede: condizioni d'uso, privacy, licenze.
 *
 * Parte pura (testabile da Node, usa solo HH.store):
 *   HH.legal.VERSION              versione delle condizioni: aumentandola l'avviso ricompare a tutti
 *   HH.legal.accepted() → { v, at } | null   (null se mai accettate o accettate in una versione precedente)
 *   HH.legal.needs() · HH.legal.accept(now)
 *   HH.legal.inline(text) → HTML      escape + {app} + **grassetto**
 * Testi lunghi: src/i18n/legal/<lang>.js (HH.LEGAL[lang], generati da tools/legal-import.mjs) e
 * src/i18n/legal/licenses.js (HH.LEGAL_COMPONENTS, HH.LEGAL_TEXTS). Si scaricano solo quando servono (HH.loadFile);
 * en.js e licenses.js sono nella SHELL del service worker, le altre lingue vanno in cache alla prima apertura.
 * Offline e lingua non in cache → inglese con l'avviso lg_offline.
 *
 * Parte browser:
 *   HH.legal.gate({ done, openLang }) → true se l'avviso è stato mostrato (blocca tutto finché non si accetta)
 *   HH.legal.openPage(tab)            pagina con le tre schede (dal piè di pagina della home e da Progressi)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const APP = 'Hari Hari Puzzle';
  const KEY = 'legal';
  const TABS = ['terms', 'privacy', 'licenses'];
  const t = (k) => HH.i18n.t(k);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = (s) => esc(String(s).split('{app}').join(APP)).replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>');

  const L = {
    VERSION: 1,
    TABS,
    inline,
    accepted() {
      const a = HH.store.get(KEY, null);
      return a && typeof a.v === 'number' && a.v >= L.VERSION ? a : null;
    },
    needs() { return !L.accepted(); },
    accept(now = Date.now()) { const a = { v: L.VERSION, at: now }; HH.store.set(KEY, a); return a; },
    file: (lang) => `src/i18n/legal/${lang}.js`,
    // documenti della lingua (o inglese se non disponibile) → Promise<{ docs, lang, fallback }>
    load(lang) {
      const have = (l) => HH.LEGAL && HH.LEGAL[l];
      const get = (l) => (have(l) ? Promise.resolve() : HH.loadFile(L.file(l))).then(() => { if (!have(l)) throw new Error('legal ' + l); });
      return get(lang).then(() => ({ docs: HH.LEGAL[lang], lang, fallback: false }))
        .catch(() => get('en').then(() => ({ docs: HH.LEGAL.en, lang: 'en', fallback: lang !== 'en' })));
    },
    loadLicenses() { return HH.LEGAL_COMPONENTS ? Promise.resolve() : HH.loadFile('src/i18n/legal/licenses.js'); },
  };
  HH.legal = L;
  if (!G.document) return;

  /* ---------- interfaccia ---------- */
  const $ = (s, r = G.document) => r.querySelector(s);
  const sfx = () => (HH.fx && HH.fx.sfx) || { tap() {}, blip() {} };
  const ICON = {
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 22 20.4H2z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9.6v5" stroke="var(--card-solid)" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.4" fill="var(--card-solid)"/></svg>',
    chev: '<svg class="lg-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg class="lg-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 11h6M9 15h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  };
  const fmtDate = (at) => { try { return new Intl.DateTimeFormat(HH.i18n.code, { dateStyle: 'long' }).format(new Date(at)); } catch (e) { return new Date(at).toISOString().slice(0, 10); } };
  // testi delle licenze: le righe spezzate a 80 colonne si riuniscono in paragrafi (il contenuto resta identico),
  // così si leggono bene anche su un telefono stretto; le righe di trattini e i titoli restano a sé
  const reflow = (txt) => txt.split(/\n{2,}/).map((par) => (/^(-{3,}|#)/m.test(par) ? par : par.replace(/\s*\n\s*/g, ' '))).join('\n\n');
  const gameName = (id) => { const g = (HH.catalog || []).find((x) => x.id === id); return g ? g.name : id; };

  // focus solo dentro la finestra (Tab e Maiusc+Tab girano in tondo)
  function trapTab(e, box) {
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('button, input, a[href], summary, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && G.document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && G.document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* Visore dei documenti con le tre schede (riusato nell'avviso e nella pagina) */
  function viewer(host, tab, extra) {
    let cur = tab, seq = 0;
    host.innerHTML = `<div class="lg-tabs" role="tablist">${TABS.map((k) =>
      `<button class="lg-tab" role="tab" id="lgTab-${k}" data-tab="${k}" aria-controls="lgPanel" aria-selected="false">${esc(t('lg_' + k))}</button>`).join('')}</div>
      <div class="lg-panel" id="lgPanel" role="tabpanel" tabindex="0"></div>`;
    const panel = $('.lg-panel', host);
    const show = (k) => {
      cur = k;
      host.querySelectorAll('.lg-tab').forEach((b) => { const on = b.dataset.tab === k; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      panel.setAttribute('aria-labelledby', 'lgTab-' + k);
      const my = ++seq;
      panel.classList.add('loading');
      Promise.all([L.load(HH.i18n.code), k === 'licenses' ? L.loadLicenses().catch(() => {}) : null]).then(([r]) => {
        if (my !== seq) return;
        panel.classList.remove('loading');
        panel.innerHTML = docHTML(r, k) + (extra ? extra() : '');
        panel.scrollTop = 0;
      }).catch(() => { if (my === seq) { panel.classList.remove('loading'); panel.innerHTML = `<p class="lg-note">${esc(t('lg_offline'))}</p>`; } });
    };
    host.querySelector('.lg-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b && b.dataset.tab !== cur) { sfx().tap(); show(b.dataset.tab); } });
    host.querySelector('.lg-tabs').addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      const rtl = G.document.documentElement.dir === 'rtl';
      const k = TABS[(TABS.indexOf(cur) + (rtl ? -d : d) + TABS.length) % TABS.length];
      show(k); $(`#lgTab-${k}`, host).focus();
    });
    show(tab);
    return { show, get tab() { return cur; }, refresh() { viewer(host, cur, extra); } };
  }

  function docHTML(r, k) {
    const d = r.docs[k];
    let h = r.fallback ? `<p class="lg-note">${esc(t('lg_offline'))}</p>` : '';
    h += `<h3 class="lg-doc-title"${r.fallback ? ' lang="en" dir="ltr"' : ''}>${inline(d.title)}</h3>`;
    h += `<div class="lg-doc"${r.fallback ? ' lang="en" dir="ltr"' : ''}>${d.sections.map((s) => `<section><h4>${inline(s.h)}</h4>${s.p.map((p) => `<p>${inline(p)}</p>`).join('')}</section>`).join('')}</div>`;
    if (k === 'licenses') h += compHTML();
    return h;
  }

  function compHTML() {
    const list = HH.LEGAL_COMPONENTS, texts = HH.LEGAL_TEXTS || {};
    if (!list) return `<p class="lg-note">${esc(t('lg_offline'))}</p>`;
    return `<p class="lg-note">${esc(t('lg_official'))}</p><ul class="lg-comps">${list.map((c) => `
      <li class="lg-comp" lang="en" dir="ltr">
        <div class="lg-comp-head"><b>${esc(c.name)}</b><span class="lg-lic">${esc(c.license)}</span></div>
        <div class="lg-comp-by">${esc(c.author)}${(c.used || []).map((id) => `<span class="lg-used">${esc(gameName(id))}</span>`).join('')}</div>
        <a class="lg-url" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.url.replace(/^https?:\/\//, ''))}</a>
        ${c.notice ? `<p class="lg-notice">${esc(c.notice)}</p>` : ''}
        ${c.text && texts[c.text] ? `<details class="lg-text"><summary>${ICON.doc}<span>${esc(c.license)}</span>${ICON.chev}</summary><pre>${esc(reflow(texts[c.text]))}</pre></details>` : ''}
      </li>`).join('')}</ul>`;
  }

  /* ---------- avviso al primo avvio ---------- */
  let gateEl = null;
  L.isOpen = () => !!gateEl;
  L.gate = function (opts = {}) {
    if (!L.needs()) return false;
    if (gateEl) return true;
    const d = G.document;
    const st = { terms: false, privacy: false, view: null };
    const app = $('.app');
    const el = d.createElement('div');
    el.className = 'overlay legal-dlg'; el.id = 'legalDlg';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lgTitle');
    gateEl = el;
    function draw() {
      el.innerHTML = `<div class="sheet lg-sheet">
        <div class="lg-main"${st.view ? ' hidden' : ''}>
          ${opts.openLang ? `<button class="pill lg-lang" type="button" id="lgLang" aria-label="${esc(t('lang'))}">${ICON.globe}<span>${esc(HH.i18n.code.toUpperCase())}</span></button>` : ''}
          <div class="lg-left">
            <div class="lg-hari">${HH.mascot ? HH.mascot.svg({ cls: 'hari happy' }) : ''}</div>
            <h2 id="lgTitle">${esc(t('lg_title'))}</h2>
            <p class="lg-intro" id="lgIntro">${inline(t('lg_intro'))}</p>
          </div>
          <div class="lg-right">
            <div class="lg-safety" role="note">${ICON.warn}<p>${inline(t('lg_safety'))}</p></div>
            ${['terms', 'privacy'].map((k) => `<div class="lg-chk">
              <label><input type="checkbox" id="lgChk-${k}" data-chk="${k}"${st[k] ? ' checked' : ''}><span>${esc(t('lg_chk_' + k))}</span></label>
              <button class="lg-link" type="button" data-doc="${k}">${esc(t('lg_' + k))}${ICON.chev}</button></div>`).join('')}
            <div class="lg-act">
              <button class="lg-link small" type="button" data-doc="licenses">${esc(t('lg_licenses'))}</button>
              <button class="candy big" id="lgAccept" type="button"${st.terms && st.privacy ? '' : ' disabled'}><span>${esc(t('lg_accept'))}</span></button>
            </div>
          </div>
        </div>
        <div class="lg-sub"${st.view ? '' : ' hidden'}>
          <div class="lg-sub-head"><button class="tool lg-back" id="lgBack" type="button">${ICON.back}<span>${esc(t('lg_back'))}</span></button></div>
          <div class="lg-sub-body"></div>
        </div>
      </div>`;
      if (st.view) viewer($('.lg-sub-body', el), st.view);
    }
    const focusMain = () => { const f = $('#lgAccept:not([disabled])', el) || $('#lgChk-terms', el); if (f) f.focus({ preventScroll: true }); };
    el.addEventListener('change', (e) => {
      const c = e.target.closest('[data-chk]');
      if (!c) return;
      st[c.dataset.chk] = c.checked;
      $('#lgAccept', el).disabled = !(st.terms && st.privacy);
    });
    el.addEventListener('click', (e) => {
      const doc = e.target.closest('[data-doc]');
      if (doc) {
        sfx().tap();
        st.view = doc.dataset.doc; st.from = doc.dataset.doc;
        $('.lg-main', el).hidden = true; $('.lg-sub', el).hidden = false;
        viewer($('.lg-sub-body', el), st.view);
        $('#lgBack', el).focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('#lgBack')) {
        sfx().tap();
        st.view = null;
        $('.lg-sub', el).hidden = true; $('.lg-main', el).hidden = false;
        const link = $(`.lg-main [data-doc="${st.from}"]`, el);
        (link || $('#lgChk-terms', el)).focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('#lgLang')) { sfx().tap(); opts.openLang(); return; }
      if (e.target.closest('#lgAccept') && st.terms && st.privacy) {
        L.accept();
        sfx().blip();
        close();
        if (opts.done) opts.done();
      }
    });
    // niente uscita senza accettare: Esc ignorato, clic fuori ignorato, tasto indietro rimesso a posto
    const onKey = (e) => {
      const lang = $('#langDlg');
      if (lang && !lang.hidden) return;            // la scelta della lingua (sopra l'avviso) si chiude come sempre
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (st.view) $('#lgBack', el).click(); return; }
      trapTab(e, el);
    };
    const onPop = () => { if (gateEl) { try { G.history.pushState({ legal: 1 }, ''); } catch (err) { /* niente history */ } } };
    // lingua cambiata dalla finestra delle lingue (sopra l'avviso): testi nuovi, caselle e vista restano come erano
    const onLang = () => {
      if (!gateEl) return;
      const f = el.contains(d.activeElement) && d.activeElement.id;
      draw();
      const x = (f && d.getElementById(f)) || $('#lgLang', el) || $('#lgBack', el);
      if (x) x.focus({ preventScroll: true });
    };
    function close() {
      d.removeEventListener('keydown', onKey, true);
      G.removeEventListener('popstate', onPop);
      if (app) app.inert = false;
      el.remove();
      gateEl = null;
      if (G.history.state && G.history.state.legal) { try { G.history.replaceState(null, ''); } catch (err) { /* niente history */ } }
    }
    d.addEventListener('keydown', onKey, true);
    G.addEventListener('popstate', onPop);
    HH.i18n.onChange(onLang);
    try { G.history.pushState({ legal: 1 }, ''); } catch (err) { /* niente history */ }
    draw();
    d.body.appendChild(el);
    if (app) app.inert = true;
    focusMain();
    L.load(HH.i18n.code).catch(() => {});   // testi della lingua in cache subito (per leggerli anche offline)
    return true;
  };

  /* ---------- pagina "Privacy e condizioni" ---------- */
  L.openPage = function (tab = 'terms') {
    const d = G.document;
    if ($('#legalPage')) return;
    const el = d.createElement('div');
    el.className = 'overlay legal-page'; el.id = 'legalPage';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lgPageTitle');
    const back = d.activeElement;
    const acc = HH.store.get(KEY, null);
    el.innerHTML = `<div class="sheet lg-page">
      <div class="sheet-head"><h2 id="lgPageTitle">${esc(t('lg_link'))}</h2><button class="icon-btn close" id="lgClose" aria-label="${esc(t('lg_back'))}">✕</button></div>
      ${acc && acc.at ? `<p class="lg-accepted">${esc(t('lg_accepted').replace('{date}', fmtDate(acc.at)))}</p>` : ''}
      <div class="lg-page-body"></div></div>`;
    const close = () => { d.removeEventListener('keydown', onKey, true); el.remove(); if (back && back.focus) back.focus({ preventScroll: true }); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } else trapTab(e, el); };
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('#lgClose')) { sfx().tap(); close(); } });
    d.addEventListener('keydown', onKey, true);
    d.body.appendChild(el);
    viewer($('.lg-page-body', el), TABS.includes(tab) ? tab : 'terms');
    $('#lgClose', el).focus({ preventScroll: true });
  };

  // cambio di lingua: i testi della lingua nuova si scaricano subito, così restano leggibili anche offline
  if (HH.i18n && HH.i18n.onChange) HH.i18n.onChange((code) => { if (!L.needs() && G.navigator.onLine !== false) L.load(code).catch(() => {}); });
})(typeof globalThis !== 'undefined' ? globalThis : window);
