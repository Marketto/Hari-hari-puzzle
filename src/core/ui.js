/* Hari Hari Puzzle — pezzi condivisi della shell (HH.ui): icone, fragoline, formati di tempo e numeri, testi con
 * riserva in inglese, illustrazioni delle card. Nessuno stato: lo usano app.js, home.js, fullscreen.js e updates.js. */
(function (G) {
  const HH = G.HH;
  const t = (k) => HH.i18n.t(k);
  const $ = (s, r = document) => r.querySelector(s);

  const ICON = {
    chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    vList: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="5" height="5" rx="1.5" fill="currentColor"/><rect x="3" y="15" width="5" height="5" rx="1.5" fill="currentColor"/><path d="M11 6.5h10M11 17.5h10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    vGrid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2.4" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2.4" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="2.4" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="2.4" fill="currentColor"/></svg>',
    vCarousel: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="4" width="10" height="16" rx="2.4" fill="currentColor"/><path d="M4.5 7v10M19.5 7v10M1.8 9v6M22.2 9v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    // audio unificato: altoparlante + nota (musica e suoni) · solo altoparlante (solo suoni) · altoparlante sbarrato (muto)
    audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h3.5L11 5v14l-4.5-4H3z" fill="currentColor"/><path class="wave" d="M14 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><g class="note"><path d="M18 14.5V5.5l4-1v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="16.6" cy="14.6" rx="1.9" ry="1.6" fill="currentColor"/><ellipse cx="20.6" cy="12.6" rx="1.9" ry="1.6" fill="currentColor"/></g><path class="mute" d="M14.5 9l6 6M20.5 9l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.6" fill="currentColor"/><circle cx="6" cy="12" r="2.6" fill="currentColor"/><circle cx="18" cy="18.5" r="2.6" fill="currentColor"/><path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM19 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" fill="currentColor"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="mute" d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    install: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M5 17v2.5h14V17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 9.5v4l2.6 2M9.5 2.5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    paw: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5.2" ry="4.3" fill="currentColor"/><circle cx="5.8" cy="10.5" r="2.3" fill="currentColor"/><circle cx="9.5" cy="6.3" r="2.3" fill="currentColor"/><circle cx="14.5" cy="6.3" r="2.3" fill="currentColor"/><circle cx="18.2" cy="10.5" r="2.3" fill="currentColor"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8l-1-3H9z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    acorn: '<svg viewBox="0 0 24 24" aria-hidden="true" class="acorn"><path d="M6.5 11h11c0 5.5-2.8 9.3-5.5 10.3C9.3 20.3 6.5 16.5 6.5 11z" fill="var(--acorn)"/><path d="M4.5 11.2C4.5 7 7.8 4.5 12 4.5s7.5 2.5 7.5 6.7z" fill="var(--acorn-cap)"/><path d="M12 4.6V2.4" stroke="var(--acorn-cap)" stroke-width="2.2" stroke-linecap="round"/><path d="M7 8.5h10M8 6.4h8" stroke="#fff" stroke-opacity=".25" stroke-width="1.3"/><path d="M9.3 13.5c.2 2.6 1 4.3 2 5.4" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5l8-7 8 7V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.2 3c1.9 0 3.6 1 4.8 2.6C13.2 4 14.9 3 16.8 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z"/></svg>',
    music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V5.5l11-2.5v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="6.5" cy="17.5" rx="3" ry="2.5" fill="currentColor"/><ellipse cx="17.5" cy="15" rx="3" ry="2.5" fill="currentColor"/><path class="mute" d="M3 3l18 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    // giochi senza fine (endless): età e giorno al posto di livello, tempo e mosse
    cake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.4 12.8h15.2v7.4H4.4zM4.4 16.4c1.5 1 2.6 1 3.8 0s2.5-1 3.8 0 2.6 1 3.8 0 2.3-1 3.8 0M12 12.8V9.4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4.2c1.1 1.3 1.1 2.7 0 3.3-1.1-.6-1.1-2 0-3.3z" fill="currentColor"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
  };
  // meta dei giochi endless ([{ i: icona, v: testo }], da game.meta o dal salvataggio): chip dell'header e righe della home
  const metaHTML = (m, chip) => (m || []).map((x) => (chip ? `<span class="chip">${ICON[x.i] || ''}<b>${x.v}</b></span>` : `<span>${ICON[x.i] || ''}${x.v}</span>`)).join('');
  // valutazione a fragoline: lo spuntino preferito di Hari (accesa = guadagnata)
  const STAR = (on) => `<svg class="st${on ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true">
    <path class="b" d="M12 22c-4.8-2-7.6-6.2-7-10.3.3-2.1 2-3.5 3.8-3.5 1 0 2 .3 3.2.3s2.2-.3 3.2-.3c1.8 0 3.5 1.4 3.8 3.5.6 4.1-2.2 8.3-7 10.3z"/>
    <path class="hl" d="M7.6 11.6c-.3 1.8.2 3.6 1.2 5"/>
    <g class="sd"><ellipse cx="9.4" cy="12.6" rx=".55" ry=".85"/><ellipse cx="14.6" cy="12.6" rx=".55" ry=".85"/><ellipse cx="12" cy="15.4" rx=".55" ry=".85"/><ellipse cx="9.8" cy="17.4" rx=".5" ry=".8"/><ellipse cx="14.2" cy="17.4" rx=".5" ry=".8"/><ellipse cx="12" cy="11" rx=".5" ry=".8"/></g>
    <path class="l" d="M12 9.2C10.4 9.3 8 8.7 7 7.2c1.7-.5 3.4-.1 4.6.8-.2-1.8.5-3.5 1.8-4.6.6 1.6.3 3.3-.6 4.6 1.3-.8 3.1-1.1 4.7-.5-1 1.5-3.4 1.9-5.5 1.7z"/>
  </svg>`;
  const stars = (n) => [0, 1, 2].map((i) => STAR(i < n)).join('');
  // tempo lungo: "2 h 05 min", "12 min", "40 s"
  const fmtLong = (sec) => { sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h} h ${String(m).padStart(2, '0')} min` : m ? `${m} min` : `${sec} s`; };
  const fmt = (sec) => { sec = Math.max(0, Math.floor(sec || 0)); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
  const nf = (n) => { try { return new Intl.NumberFormat(HH.i18n.code).format(n || 0); } catch (e) { return String(n || 0); } };
  const word = (w, cls) => `<span class="lw ${cls}">${[...w].map((ch, i) => `<span style="--k:${i}">${ch}</span>`).join('')}</span>`;

  const lab = (k, en) => { const v = t(k); return v && v !== k ? v : en; };
  // illustrazione della card dal catalogo statico (il codice del gioco si scarica solo quando lo si apre)
  const cardArt = (id) => (HH.cardArt && HH.cardArt[id]) || '';

  HH.ui = { t, $, lab, ICON, metaHTML, STAR, stars, fmtLong, fmt, nf, word, cardArt };
})(typeof globalThis !== 'undefined' ? globalThis : window);
