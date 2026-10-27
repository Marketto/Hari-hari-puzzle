/* Hari Hari Puzzle — shell dell'app.
 * Schermate: home (riprendi partita, card giochi), gioco (HUD con tempo/mosse/stelle), vittoria, progressi, lingue.
 * Salvataggio: ogni mossa e ogni 5 s di gioco la partita viene salvata (HH.progress.saveGame);
 * riaprendo l'app si torna dritti alla partita in sospeso.
 */
(function (G) {
  const HH = G.HH;
  const t = (k) => HH.i18n.t(k);
  const $ = (s, r = document) => r.querySelector(s);
  const sfx = HH.fx.sfx;
  const P = HH.progress;

  const ICON = {
    // audio unificato: altoparlante + nota (musica e suoni) · solo altoparlante (solo suoni) · altoparlante sbarrato (muto)
    audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h3.5L11 5v14l-4.5-4H3z" fill="currentColor"/><path class="wave" d="M14 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><g class="note"><path d="M18 14.5V5.5l4-1v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="16.6" cy="14.6" rx="1.9" ry="1.6" fill="currentColor"/><ellipse cx="20.6" cy="12.6" rx="1.9" ry="1.6" fill="currentColor"/></g><path class="mute" d="M14.5 9l6 6M20.5 9l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.6" fill="currentColor"/><circle cx="6" cy="12" r="2.6" fill="currentColor"/><circle cx="18" cy="18.5" r="2.6" fill="currentColor"/><path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    unfull: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
  const fmt = (sec) => { sec = Math.max(0, Math.floor(sec || 0)); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
  const nf = (n) => { try { return new Intl.NumberFormat(HH.i18n.code).format(n || 0); } catch (e) { return String(n || 0); } };
  const word = (w, cls) => `<span class="lw ${cls}">${[...w].map((ch, i) => `<span style="--k:${i}">${ch}</span>`).join('')}</span>`;

  // Giochi proposti (in arrivo): solo card
  const SOON = [
    { id: 'pixel', name: 'Pixel Mochi', art: `<svg viewBox="0 0 120 90" aria-hidden="true">${[
      '0110110', '1111111', '1111111', '0111110', '0011100', '0001000'].map((row, r) => [...row].map((v, c) =>
      `<rect x="${25 + c * 10}" y="${14 + r * 10}" width="9" height="9" rx="2.5" fill="${v === '1' ? 'var(--accent)' : 'var(--hair)'}"/>`).join('')).join('')}</svg>` },
    { id: 'yarn', name: 'Yarn Link', art: `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M22 20h40v25h36" fill="none" stroke="var(--f1)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 70h20V45" fill="none" stroke="var(--f4)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="20" r="8" fill="var(--f1)"/><circle cx="98" cy="45" r="8" fill="var(--f1)"/><circle cx="22" cy="70" r="8" fill="var(--f4)"/><circle cx="42" cy="45" r="8" fill="var(--f4)"/><circle cx="98" cy="72" r="8" fill="var(--f3)"/><circle cx="68" cy="72" r="8" fill="var(--f3)"/></svg>` },
    { id: 'mochi', name: 'Mochi Binary', art: `<svg viewBox="0 0 120 90" aria-hidden="true">${[[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0]].map((row, r) => row.map((v, c) =>
      v ? `<g transform="translate(${30 + c * 20} ${20 + r * 20})"><circle r="8.5" fill="var(--ink)"/><circle r="5.5" fill="var(--card-solid)"/><circle r="3" fill="var(--f6)"/></g>`
        : `<g transform="translate(${30 + c * 20} ${20 + r * 20})"><rect x="-9" y="-6" width="18" height="12" rx="6" fill="var(--card-solid)" stroke="var(--ink)" stroke-width="1.6"/><rect x="-9" y="-6" width="18" height="6" rx="3" fill="var(--f6)"/></g>`).join('')).join('')}</svg>` },
  ];

  /* ---------- stato ---------- */
  const S = { game: null, inst: null, elapsed: 0, won: false, pushed: false, best: 0, ms: {}, lastMove: 0, idleSaid: false };

  /* ---------- Hari parla ---------- */
  const SAY = {
    start: ['m_start1', 'm_start2'], good: ['m_good1', 'm_good2'], half: ['m_half'], almost: ['m_almost1', 'm_almost2'],
    oops: ['m_oops1', 'm_oops2'], idle: ['m_idle1', 'm_idle2'], poke: ['m_poke1', 'm_poke2'], cheer: ['m_cheer'],
  };
  const pick = (kind) => t(SAY[kind][(Math.random() * SAY[kind].length) | 0]);
  let sayTimer = 0, lastSay = 0;
  function say(kind, force, text) {
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

  function persist() {
    if (!S.game || !S.inst || S.won) return;
    const state = S.inst.snapshot();
    P.saveGame(S.game.id, { level: P.get(S.game.id).level, elapsed: S.elapsed, state, meta: S.game.meta ? S.game.meta(state) : undefined });
  }
  function hud() {
    if (!S.inst) return;
    const snap = S.inst.snapshot();
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
    if (!S.inst || S.won || document.hidden || !$('#winDlg').hidden || !$('#loseDlg').hidden || !$('#tutDlg').hidden) return;
    S.elapsed++;
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

  /* ---------- Home ---------- */
  function renderHome() {
    HH.music.play('menu', 0.45);
    HH.music.duck(false);
    const saves = HH.catalog.map((g) => ({ g, s: P.loadGame(g.id) })).filter((x) => x.s).sort((a, b) => b.s.ts - a.s.ts);
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
      const p = P.get(g.id), s = P.loadGame(g.id);
      return `<button class="card" data-game="${g.id}" style="--tint:var(--tint-${g.id});--i:${idx}">
        <span class="card-art">
          ${g.endless ? '' : `<span class="ribbon-tag">${t('level')} ${p.level}</span>`}
          ${s ? `<span class="pause-tag">${ICON.pause}${fmt(s.elapsed)}</span>` : ''}
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
          <h1 class="logo" aria-label="Hari Hari Puzzle">${word('Hari', 'a')}${word('Hari', 'b')}<span class="br"></span><span class="logo-ribbon">Puzzle</span><span class="logo-side"><button class="share-btn" id="shareBtn" type="button">${ICON.share}<span>${lab('share', 'Share')}</span></button><span class="logo-ver" aria-hidden="true">✿ v${HH.VERSION}</span></span></h1>
          <p class="sub"><span>はりはり</span><span>${ICON.globe} ${HH.LANGS.length}</span><span>offline</span></p>
        </div>
      </section>
      ${resume}
      <section class="grid-cards" aria-label="Games">${cards}</section>
      ${soon ? `<h2 class="soon-title">${ICON.sparkle}<span>${t('soon')}</span>${ICON.sparkle}</h2>
      <section class="grid-cards small">${soon}</section>` : ''}`;
    markRemote();
  }

  // illustrazione della card dal catalogo statico (il codice del gioco si scarica solo quando lo si apre)
  const cardArt = (id) => (HH.cardArt && HH.cardArt[id]) || '';
  // card dei giochi non ancora scaricati: nuvoletta (servono internet la prima volta)
  function markRemote() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    HH.catalog.forEach((c) => HH.gameOffline(c.id).then((ok) => {
      const el = document.querySelector(`.card[data-game="${c.id}"]`);
      if (el) el.classList.toggle('remote', !ok);
    }));
  }

  /* ---------- schermo intero (dove il browser lo permette; su iPhone il pulsante non compare) ---------- */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFull = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isFull = () => !!fsEl();
  function toggleFull() {
    const d = document.documentElement;
    try {
      if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); }
    } catch (e) { /* non supportato */ }
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => {
    const b = $('#gFull');
    if (!b) return;
    b.innerHTML = isFull() ? ICON.unfull : ICON.full;
    b.setAttribute('aria-label', isFull() ? lab('fullExit', 'Exit full screen') : lab('full', 'Full screen'));
  }));

  /* ---------- Gioco ---------- */
  function openGame(id, push = true) {
    if (!HH.gameMeta(id)) return;
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
        if (!$('#home').hidden || !S.game) openGame(id, push);
      }).catch(() => {
        S.loading = null;
        if (card) card.classList.remove('loading');
        say('oops', true, lab('dlNeed', 'This game downloads the first time you play: connect to the internet and try again!'));
        if (!$('#home').hidden) return;
        renderHome();
      });
      return;
    }
    persist();
    S.game = g; S.inst = null; S.won = false;
    const saved = P.loadGame(id);
    S.elapsed = saved ? saved.elapsed || 0 : 0;
    HH.store.set('screen', id);
    const p = P.get(id);
    $('#home').hidden = true;
    const scr = $('#game');
    scr.hidden = false;
    scr.innerHTML = `
      <header class="g-head">
        <button class="icon-btn" id="gBack" aria-label="Home">${ICON.back}</button>
        <div class="g-title"><h2>${g.name}</h2>${g.endless ? '' : `<span class="ribbon-tag inline" id="gLevel">${t('level')} ${p.level}</span>`}</div>
        ${canFull() ? `<button class="icon-btn full" id="gFull" aria-label="${lab(isFull() ? 'fullExit' : 'full', isFull() ? 'Exit full screen' : 'Full screen')}">${isFull() ? ICON.unfull : ICON.full}</button>` : ''}
        ${g.tutorial ? `<button class="icon-btn help" id="gHelp" aria-label="${lab('help', 'How to play')}">?</button>` : ''}
      </header>
      <div class="hud"${g.endless ? ' id="hMeta"' : ''}>${g.endless ? '' : `
        <span class="chip" aria-label="${t('time')}">${ICON.clock}<b id="hTime">${fmt(S.elapsed)}</b></span>
        <span class="chip" aria-label="${t('moves')}">${ICON.paw}<b id="hMoves">0</b></span>
        <span class="chip stars" id="hStars" aria-hidden="true"></span>
        ${g.lives ? `<span class="chip lives" id="hLives" aria-label="${t('lives')}"></span>` : ''}
        <span class="chip best" aria-label="${t('best')}">${ICON.trophy}<b>${nf(p.best)}</b></span>`}
      </div>
      <div class="plate ${g.plate || ''}"><div class="board" id="board"></div></div>
      <div class="g-tools">
        ${g.endless ? '' : `<button class="tool" id="gUndo">${ICON.undo}<span>${t('undo')}</span></button>`}
        <button class="tool" id="gRestart">${ICON.restart}<span>${t('restart')}</span></button>
        ${g.endless ? '' : `<button class="candy" id="gNew">${ICON.sparkle}<span>${t('newg')}</span></button>`}
      </div>
      <aside class="rules"><div class="rules-hari">${HH.mascot.svg({ cls: 'hari' })}</div><p>${lab(g.rules, g.rulesEn || g.rules)}</p></aside>`;
    const ctx = {
      get level() { return P.get(g.id).level; },
      sfx, react, win,
      changed(o) {
        const reset = !!(o && o.reset);
        if (reset) { S.elapsed = 0; S.won = false; $('#winDlg').hidden = true; $('#loseDlg').hidden = true; HH.music.duck(false); }
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
        if (left <= 0) setTimeout(() => lose('lives'), 1000);
        else setTimeout(() => { const l = $('#hLives'); if (l) l.innerHTML = livesHTML(left, g.lives); }, 900);
      },
      // mosse finite senza aver risolto (Boba Sort)
      outOfMoves(kind = 'moves') {
        react('oops');
        setTimeout(() => lose(kind), 450);
      },
    };
    $('#gBack').onclick = () => (S.pushed ? history.back() : goHome());
    const fb = $('#gFull');
    if (fb) fb.onclick = () => { sfx.tap(); toggleFull(); };
    if (push) {
      try { history.pushState({ game: id }, ''); S.pushed = true; } catch (e) { S.pushed = false; }
      G.scrollTo(0, 0);
    }
    keepAwake(true);
    // prima volta in questo gioco: tutorial PRIMA di creare la partita (così i giochi a tempo non partono dietro la finestra)
    if (g.tutorial && !HH.store.get('tut:' + g.id)) tutorial(g, () => { if (S.game === g) begin(); });
    else begin();

    function begin() {
    try {
      S.inst = g.create($('#board'), ctx, saved && saved.state);
    } catch (err) {
      // salvataggio illeggibile (es. dopo un aggiornamento): ne teniamo una copia e si riparte dal livello raggiunto
      if (!saved) throw err;
      HH.store.set('save-bak:' + id, saved);
      P.clearGame(id);
      S.elapsed = 0;
      S.inst = g.create($('#board'), ctx, null);
    }
    hud(); persist();
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
    }
  }

  /* ---------- tutorial (prima partita di ogni gioco, poi dal pulsante "?") ----------
   * Ogni gioco può dichiarare tutorial: [{ key, en, art }] (art = SVG 120×90 animato con CSS). */
  const lab = (k, en) => { const v = t(k); return v && v !== k ? v : en; };
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

  function goHome() {
    persist();
    hideSay();
    $('#loseDlg').hidden = true;
    S.game = null; S.inst = null;
    keepAwake(false);
    $('#tutDlg').hidden = true;
    HH.store.set('screen', null);
    $('#game').hidden = true; $('#game').innerHTML = '';
    $('#home').hidden = false;
    renderHome();
    $('#updBar').hidden = true;
    if (waitingSW) applyUpdate();
    else setTimeout(offerInstall, 1200);
  }
  G.addEventListener('popstate', () => { S.pushed = false; if (S.game) goHome(); });

  function win() {
    const g = S.game;
    if (!g || S.won) return;
    S.won = true;
    const snap = S.inst.snapshot();
    const p = P.get(g.id);
    const level = p.level;
    const st = g.rate(snap);
    const timeBonus = Math.max(0, Math.round((g.parTime(snap) - S.elapsed) * 2));
    const score = 100 + level * 25 + st * 60 + timeBonus;
    const rec = score > p.best;
    Object.assign(p, {
      level: level + 1, wins: p.wins + 1, total: p.total + score, stars: p.stars + st, last: st,
      best: Math.max(p.best, score), bestTime: p.bestTime ? Math.min(p.bestTime, S.elapsed) : S.elapsed,
    });
    P.set(g.id, p);
    P.clearGame(g.id);
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
      <h2 class="ribbon"><span>${t('win')}</span></h2>
      <p class="cheer">${pick('cheer')}</p>
      <div class="win-stars">${[0, 1, 2].map((i) => `<span class="ws${i < st ? ' on' : ''}" style="--d:${0.35 + i * 0.3}s">${STAR(i < st)}</span>`).join('')}</div>
      ${rec ? `<p class="newrec">${ICON.trophy}${t('newrec')}</p>` : ''}
      <dl class="win-stats">
        <div><dt>${ICON.clock}${t('time')}</dt><dd>${fmt(S.elapsed)}</dd></div>
        <div><dt>${ICON.paw}${t('moves')}</dt><dd>${nf(snap.moves)}</dd></div>
        <div class="hi"><dt>${ICON.acorn}${t('score')}</dt><dd id="winScore">0</dd></div>
      </dl>
      <div class="win-actions">
        <button class="tool round" id="winHome" aria-label="Home">${ICON.home}</button>
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
      $('#gLevel').textContent = `${t('level')} ${P.get(g.id).level}`;
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
      <h2>${t({ moves: 'nomoves', stuck: 'stuck' }[kind] || 'nolives')}</h2>
      ${kind !== 'lives' ? `<div class="lose-moves">${ICON.paw}<b>0</b></div>` : `<div class="lose-hearts">${livesHTML(0, S.game.lives)}</div>`}
      <p>${pick('oops')}</p>
      <div class="win-actions">
        <button class="tool round" id="loseHome" aria-label="Home">${ICON.home}</button>
        <button class="candy big" id="loseRetry">${ICON.restart}<span>${t('retry')}</span></button>
      </div>`;
    $('#loseRetry').focus();
    $('#loseRetry').onclick = () => { $('#loseDlg').hidden = true; S.inst.restart(); sfx.blip(); setTimeout(() => say('start', true), 400); };
    $('#loseHome').onclick = () => { $('#loseDlg').hidden = true; S.inst.restart(); if (S.pushed) history.back(); else goHome(); };
  }

  /* ---------- Progressi ---------- */
  function openStats() {
    const rows = HH.catalog.map((g) => {
      const p = P.get(g.id);
      if (g.endless) {
        const sv = P.loadGame(g.id);
        return `<div class="stat-row" style="--tint:var(--tint-${g.id})"><span class="stat-art">${cardArt(g.id)}</span>
          <div class="stat-main"><div class="stat-name"><b>${g.name}</b></div><span class="resume-meta">${sv ? metaHTML(sv.meta) : '—'}</span></div></div>`;
      }
      return `<div class="stat-row" style="--tint:var(--tint-${g.id})">
        <span class="stat-art">${cardArt(g.id)}</span>
        <div class="stat-main">
          <div class="stat-name"><b>${g.name}</b><span class="stars">${stars(p.last)}</span></div>
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
      ${rows}`;
    $('#statsDlg').hidden = false;
    $('#statsClose').focus();
  }

  /* ---------- Lingue ---------- */
  function renderLangSheet() {
    $('#langList').innerHTML = HH.LANGS.map((l) =>
      `<button class="lang${l.code === HH.i18n.code ? ' cur' : ''}" data-lang="${l.code}" lang="${l.code}" dir="${l.dir}"><b>${l.name}</b><small>${l.code}</small></button>`).join('');
    $('#langTitle').textContent = t('lang');
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

  // condividi l'app: menu di condivisione del telefono, altrimenti copia il link
  const SITE = 'https://marketto.github.io/Hari-hari-puzzle/';
  function share() {
    sfx.tap();
    const data = { title: 'Hari Hari Puzzle', text: lab('shareText', 'Cozy logic puzzles with Hari the hedgehog: free, and they work offline too!'), url: SITE };
    if (navigator.share) { navigator.share(data).catch(() => {}); return; }
    const done = () => { say('good', true, lab('shareCopied', 'Link copied! Send it to a friend 💌')); react('happy'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(`${data.text} ${SITE}`).then(done, () => say('good', true, SITE));
    else say('good', true, SITE);
  }

  function applyTexts() {
    $('#langBtn').setAttribute('aria-label', t('lang'));
    $('#scoreChip').setAttribute('aria-label', t('stats'));
    audioUI();
    $('#installBtn span').textContent = t('install');
    $('#langCode').textContent = HH.i18n.code.toUpperCase();
    updateScore();
    if (S.game) { persist(); openGame(S.game.id, false); } else renderHome();
  }

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
    if (standalone() || HH.INLINE || S.game || !$('#installDlg').hidden) return;
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
    persist();
    HH.store.set('justUpdated', 1);
    waitingSW.postMessage({ type: 'skip' });
  }
  function updateReady(w) {
    waitingSW = w;
    if (!S.game) { applyUpdate(); return; }
    const bar = $('#updBar');
    bar.innerHTML = `<span>${t('updReady')}</span><button class="candy" id="updGo">${ICON.sparkle}<span>${t('updNow')}</span></button>`;
    bar.hidden = false;
    $('#updGo').onclick = applyUpdate;
  }
  function setupUpdates() {
    if (HH.store.get('justUpdated')) {
      HH.store.del('justUpdated');
      setTimeout(() => say('cheer', true, t('updDone')), 900);
    }
    if (!('serviceWorker' in G.navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost') || HH.INLINE) return;
    const sw = G.navigator.serviceWorker;
    let hadController = !!sw.controller;
    let reloading = false;
    sw.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }   // prima installazione: niente ricarica
      if (reloading) return;
      reloading = true;
      persist();
      location.reload();
    });
    // il service worker nuovo chiede se questa pagina sa aggiornarsi da sola: rispondiamo di sì (al mittente)
    sw.addEventListener('message', (e) => { if (e.data && e.data.type === 'ask-update' && e.source) e.source.postMessage({ type: 'can-update' }); });
    sw.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      const watch = (w) => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && sw.controller) updateReady(w); });
      if (reg.waiting && sw.controller) updateReady(reg.waiting);
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      const check = () => { if (G.navigator.onLine !== false) reg.update().catch(() => {}); };
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
      const c = e.target.closest('[data-game]');
      if (c) { sfx.tap(); openGame(c.dataset.game); }
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
      if (e.key === 'Escape') { $('#langDlg').hidden = true; $('#statsDlg').hidden = true; }
    });

    setupInstall();
    setupUpdates();

    applyTexts();
    // riapertura dell'app: si torna alla partita in sospeso
    const last = HH.store.get('screen');
    if (last && P.loadGame(last)) openGame(last);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})(typeof globalThis !== 'undefined' ? globalThis : window);
