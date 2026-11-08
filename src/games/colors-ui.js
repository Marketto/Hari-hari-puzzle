/* Hari Colors — interfaccia.
 * In alto Hari con il suo fumetto: mentre parla (voce di sistema, colors-voice.js) il fumetto mostra le onde del suono;
 * senza voce per la lingua, con la sintesi assente o con l'audio dell'app spento il fumetto mostra il NOME del colore
 * scritto in un colore neutro (non suggerisce la risposta) e suona un campanellino. Pulsante "ripeti" per riascoltare.
 * Sotto: barra del tempo, round, serie e punti; poi il campo con le sagome o le parole da toccare.
 * Opzione "simboli" (salvata): ogni colore ha anche un segno nel tondino dell'oggetto e nel fumetto, per chi distingue
 * male alcuni colori (daltonismo: circa 1 maschio su 12).
 * Si parte con un tocco su "Tocca per iniziare" (serve anche a iOS per sbloccare la voce); la pausa (tutorial, app in
 * background) ferma il tempo e alla ripresa il round si rigenera (niente vantaggio da sbirciare).
 * La musica si abbassa mentre Hari parla.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const EN = {
    co_repeat: 'Listen again', co_symbols: 'Symbols', co_streak: 'Streak', co_points: 'Points', co_round: 'Round', co_start: 'Tap to start',
    co_words: 'Colour words! Each one is written in its own colour.', co_stroop: 'Tricky! Tap the INK colour you hear, not the word.',
    co_mixed: 'Shapes and words all mixed up: always look at the ink!', co_slow: 'Too slow! It was this one.',
    pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_ready: 'Ready?', mm_new: 'New!',
  };
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const L = (k) => label(k, EN[k] || k);
  const C = () => HH.colors;
  const code = () => (HH.i18n && HH.i18n.code) || 'en';
  const nameOf = (id) => label('col_' + id, id);
  const upper = (x) => { try { return x.toLocaleUpperCase(code()); } catch (e) { return x.toUpperCase(); } };
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------- disegni (viewBox 0 0 100 100; .b corpo nel colore, .f/.l dettagli, .s linee col bordo) ---------- */
  const starPts = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r : R; return `${(cx + Math.cos(a) * d).toFixed(1)} ${(cy + Math.sin(a) * d).toFixed(1)}`; }).join(' L');
  const flower = () => [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return `<circle class="b" cx="${(50 + Math.cos(a) * 25).toFixed(1)}" cy="${(52 + Math.sin(a) * 25).toFixed(1)}" r="19"/>`; }).join('') + '<circle class="b" cx="50" cy="52" r="20"/>';
  const SHAPE = {
    heart: { d: '<path class="b" d="M50 88C18 66 6 47 12 30C18 14 40 12 50 30C60 12 82 14 88 30C94 47 82 66 50 88Z"/>', fx: 50, fy: 46 },
    star: { d: `<path class="b" d="M${starPts(50, 54, 46, 22)}Z"/>`, fx: 50, fy: 56, s: 0.8 },
    balloon: { d: '<path class="s" d="M50 80C45 88 55 92 50 99"/><path class="b" d="M45 81L50 75L55 81Z"/><path class="b" d="M50 6C69 6 82 21 82 40C82 61 65 75 50 77C35 75 18 61 18 40C18 21 31 6 50 6Z"/>', fx: 50, fy: 42 },
    apple: { d: '<path class="s" d="M50 30C49 22 52 15 57 10"/><path class="b" d="M56 20C61 9 74 8 79 13C72 22 62 25 56 20Z"/><path class="b" d="M50 30C39 21 16 22 14 45C12 68 31 91 50 84C69 91 88 68 86 45C84 22 61 21 50 30Z"/>', fx: 50, fy: 56 },
    flower: { d: flower(), fx: 50, fy: 52, s: 0.8 },
    cloud: { d: '<path class="b" d="M27 76C12 76 5 63 9 52C12 42 22 37 31 39C33 24 46 16 59 20C70 23 76 32 76 41C89 41 97 52 93 64C91 72 83 76 76 76Z"/>', fx: 52, fy: 56 },
    drop: { d: '<path class="b" d="M50 6C63 28 82 45 82 64C82 83 67 94 50 94C33 94 18 83 18 64C18 45 37 28 50 6Z"/>', fx: 50, fy: 66 },
    mochi: { d: '<path class="b" d="M50 20C77 20 92 41 92 60C92 79 75 86 50 86C25 86 8 79 8 60C8 41 23 20 50 20Z"/>', fx: 50, fy: 58 },
    fish: { d: '<path class="b" d="M10 50C23 26 58 22 74 43L92 28L89 50L92 72L74 57C58 78 23 74 10 50Z"/>', fx: 34, fy: 48, s: 0.8 },
    cat: { d: '<path class="b" d="M17 40L19 10L41 25C47 23 53 23 59 25L81 10L83 40C90 50 90 66 81 76C70 89 30 89 19 76C10 66 10 50 17 40Z"/>', fx: 50, fy: 56 },
  };
  const face = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse class="f" cx="-10" cy="0" rx="4.6" ry="5.6"/><ellipse class="f" cx="10" cy="0" rx="4.6" ry="5.6"/><path class="l" d="M-5 8Q0 13 5 8"/></g>`;
  const shapeSvg = (k, cls = 'co-shape') => { const sh = SHAPE[k]; return `<svg class="${cls}" viewBox="-4 -4 108 108" aria-hidden="true">${sh.d}${face(sh.fx, sh.fy, sh.s || 1)}</svg>`; };
  const SYM = {
    dot: '<circle class="y" cx="12" cy="12" r="6.5"/>', plus: '<path class="z" d="M12 4.5v15M4.5 12h15"/>', tri: '<path class="y" d="M12 3.5L21 19.5H3Z"/>',
    square: '<rect class="y" x="5" y="5" width="14" height="14" rx="2"/>', diamond: '<path class="y" d="M12 2.5L21.5 12L12 21.5L2.5 12Z"/>',
    cross: '<path class="z" d="M6 6l12 12M18 6L6 18"/>', ring: '<circle class="z" cx="12" cy="12" r="6.5"/>', bars: '<path class="z" d="M5 7h14M5 12h14M5 17h14"/>',
    moon: '<path class="y" d="M15.5 3.5a9 9 0 1 0 5.5 12.5a7 7 0 0 1-5.5-12.5Z"/>', dots: '<circle class="y" cx="6" cy="12" r="2.8"/><circle class="y" cx="12" cy="12" r="2.8"/><circle class="y" cx="18" cy="12" r="2.8"/>',
    wave: '<path class="z" d="M3 12c3-6 6-6 9 0s6 6 9 0"/>',
  };
  const symSvg = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">${SYM[C().BY[id].sym]}</svg>`;
  const ICON = {
    waves: '<svg class="co-waves" viewBox="0 0 46 34" aria-hidden="true"><path d="M4 12h6l7-6v22l-7-6H4z" fill="currentColor" style="opacity:1"/><path d="M23 11a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M29 7a14 14 0 0 1 0 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M35 3a20 20 0 0 1 0 28" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h3.5L11 5v14l-4.5-4H3z" fill="currentColor"/><path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    sym: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5L11.5 11h-9z" fill="currentColor"/><rect x="13" y="3.5" width="8" height="8" rx="1.5" fill="currentColor"/><circle cx="7" cy="17" r="4" fill="currentColor"/><path d="M14 14l6 6M20 14l-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5L12.6 7L18.5 7.6L14 11.6L15.3 17.6L10 14.5L4.7 17.6L6 11.6L1.5 7.6L7.4 7Z" fill="currentColor"/></svg>',
    flag: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2v16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6 3h10l-3 4 3 4H6z" fill="currentColor"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" fill="currentColor"/></svg>',
  };

  /* ---------- illustrazione della card e tutorial (120×90) ---------- */
  const at = (k, x, y, w, ink, extra = '') => `<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="-4 -4 108 108" style="--ink:var(--co-${ink});--on:var(--co-${ink}-on)" class="co-shape ${extra}">${SHAPE[k].d}${face(SHAPE[k].fx, SHAPE[k].fy, SHAPE[k].s || 1)}</svg>`;
  const bubble = (x, y, w, h, inner) => `<g transform="translate(${x} ${y})"><path class="bub" d="M10 0H${w - 10}Q${w} 0 ${w} 10V${h - 10}Q${w} ${h} ${w - 10} ${h}H22L12 ${h + 9}L14 ${h}H10Q0 ${h} 0 ${h - 10}V10Q0 0 10 0Z"/>${inner}</g>`;
  const waves = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 6h4l5-4v16l-5-4H0z" fill="var(--co-bubble-ink)"/><path class="w" d="M13 6a5 5 0 0 1 0 6M17 3a9 9 0 0 1 0 12"/></g>`;
  const art = () => `<svg viewBox="0 0 120 90" class="co-art" aria-hidden="true">
    ${bubble(6, 6, 40, 24, waves(9, 3))}
    ${at('balloon', 52, 4, 34, 'red', 'hop')}${at('star', 84, 10, 32, 'yellow')}
    ${at('heart', 10, 44, 34, 'blue')}${at('apple', 44, 46, 34, 'green', 'hop')}${at('cloud', 78, 48, 36, 'purple')}</svg>`;

  const tuWord = (id, ink, x, y, w) => { const tx = upper(nameOf(id)); const fs = Math.min(17, (w * 1.45) / Math.max(3, tx.length)); return `<text class="tx" x="${x}" y="${y}" text-anchor="middle" font-size="${fs.toFixed(1)}" fill="var(--co-${ink})">${esc(tx)}</text>`; };
  const hand = (x, y) => (HH.tutHand ? HH.tutHand(x, y) : '');
  const tuSvg = (inner) => `<svg viewBox="0 0 120 90" class="co-art co-tu" aria-hidden="true">${inner}</svg>`;
  const TUT = [
    { key: 'tu_colors_1', en: 'Listen to Hari: he says the name of a colour. Tap the thing of that colour, as fast as you can!',
      art: () => tuSvg(`${bubble(30, 4, 50, 24, waves(14, 3))}${at('heart', 10, 42, 32, 'red')}${at('star', 44, 42, 32, 'yellow')}${at('drop', 78, 42, 32, 'blue')}${hand(28, 64)}`) },
    { key: 'tu_colors_2', en: 'No voice on this phone, or sound off? Then the name appears in Hari’s bubble. The speaker button says it again.',
      art: () => tuSvg(`${bubble(22, 4, 76, 26, `<text class="nx" x="38" y="17" text-anchor="middle">${esc(nameOf('blue'))}</text>`)}${at('mochi', 14, 44, 30, 'green')}${at('star', 46, 42, 32, 'blue', 'hop')}${at('flower', 80, 44, 30, 'pink')}`) },
    { key: 'tu_colors_3', en: 'Quick answers and long streaks score more points. A wrong tap costs a heart; if time runs out, Hari shows where it was.',
      art: () => tuSvg(`<rect x="10" y="12" width="100" height="10" rx="5" fill="var(--co-bar)"/><rect x="10" y="12" width="62" height="10" rx="5" fill="var(--co-bar-fill)"/>
        <rect x="14" y="34" width="44" height="20" rx="10" fill="var(--co-glow)"/><text class="nx" x="36" y="48" text-anchor="middle" style="fill:var(--co-badge-ink)">×5</text>
        ${at('heart', 66, 30, 22, 'red')}${at('heart', 88, 30, 22, 'red')}${at('balloon', 44, 56, 30, 'orange', 'hop')}`) },
    { key: 'tu_colors_4', en: 'Later, colour words appear. At first every word is written in its own colour: tap the word in the colour you hear.',
      art: () => tuSvg(`${bubble(34, 2, 50, 22, waves(14, 2))}${tuWord('red', 'red', 30, 48, 48)}${tuWord('blue', 'blue', 90, 48, 44)}${tuWord('green', 'green', 90, 78, 48)}${hand(26, 52)}`) },
    { key: 'tu_colors_5', en: 'Then it gets tricky: word and ink don’t match! Look at the INK, not the word. If Hari says “red”, tap the word painted red, whatever it says.',
      art: () => tuSvg(`${bubble(26, 2, 68, 22, `<text class="nx" x="34" y="15" text-anchor="middle">${esc(nameOf('red'))}</text>`)}
        ${tuWord('blue', 'red', 32, 56, 50)}${tuWord('red', 'blue', 88, 56, 50)}
        <path class="ok" d="M20 68l7 7 13-14"/><path class="no" d="M80 64l14 12M94 64L80 76"/>${hand(36, 58)}`) },
    { key: 'tu_colors_6', en: 'Do some colours look alike to you? Turn on symbols: every colour gets its own little sign, in the bubble too.',
      art: () => tuSvg(`${[['heart', 'red', 'dot', 8], ['drop', 'green', 'square', 44], ['cloud', 'brown', 'dots', 80]].map(([k, ink, sy, x]) =>
        `${at(k, x, 34, 32, ink)}<circle cx="${x + 28}" cy="38" r="8" fill="var(--co-badge)" stroke="var(--co-edge)" stroke-width="1.5"/><svg x="${x + 22}" y="32" width="12" height="12" viewBox="0 0 24 24"><g style="--x:0">${SYM[sy].replace(/class="y"/g, 'fill="var(--co-badge-ink)"').replace(/class="z"/g, 'fill="none" stroke="var(--co-badge-ink)" stroke-width="3.2" stroke-linecap="round"')}</g></svg>`).join('')}
        <circle cx="60" cy="16" r="11" fill="var(--accent)"/><svg x="52" y="8" width="16" height="16" viewBox="0 0 24 24" style="color:var(--accent-ink)">${ICON.sym.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`) },
  ];
  TUT.forEach((t) => { const f = t.art; Object.defineProperty(t, 'art', { get: f, enumerable: true }); });

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const V = HH.colorsVoice;
    if (V) V.init();
    let s, r = null, phase = 'cover', t0 = 0, raf = 0, wrap, field, sayEl, wordEl, symEl, hariEl, timeEl, chips = {}, items = [];
    let viaVoice = false, symOn = !!(HH.store && HH.store.get('colors:sym', false)), timers = new Set(), ro = null, dead = false;
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const muted = () => !!(ctx.sfx && ctx.sfx.isMuted && ctx.sfx.isMuted());
    const duck = (on) => { if (HH.music && HH.music.duck && !(on === false && phase === 'over')) HH.music.duck(on); };
    const sfx = (k, ...a) => { if (ctx.sfx && ctx.sfx[k]) ctx.sfx[k](...a); };

    function build() {
      clearTimers();
      stopVoice();
      const c = C().config(s.level);
      el.innerHTML = `<div class="co-wrap">
        <div class="co-head">
          <div class="co-hari">${HH.mascot ? HH.mascot.mini() : ''}</div>
          <div class="co-say" role="status" aria-live="polite"><span class="co-wv" hidden>${ICON.waves}</span><b class="co-word"></b><span class="co-sym" hidden></span></div>
          <button type="button" class="co-btn co-again" aria-label="${esc(L('co_repeat'))}" title="${esc(L('co_repeat'))}">${ICON.again}</button>
          <button type="button" class="co-btn co-symb" aria-pressed="${symOn}" aria-label="${esc(L('co_symbols'))}" title="${esc(L('co_symbols'))}">${ICON.sym}</button>
        </div>
        <div class="co-stats">
          <span class="co-track" aria-hidden="true"><i class="co-time"></i></span>
          <span class="co-chip co-rd" aria-label="${esc(L('co_round'))}">${ICON.flag}<b></b></span>
          <span class="co-chip co-st" aria-label="${esc(L('co_streak'))}">${ICON.star}<b></b></span>
          <span class="co-chip co-pt" aria-label="${esc(L('co_points'))}">${ICON.spark}<b></b></span>
        </div>
        <div class="co-field" dir="ltr"></div>
        <div class="co-cover"></div>
      </div>`;
      wrap = el.querySelector('.co-wrap');
      field = wrap.querySelector('.co-field');
      sayEl = wrap.querySelector('.co-say'); wordEl = wrap.querySelector('.co-word'); symEl = wrap.querySelector('.co-sym');
      hariEl = wrap.querySelector('.co-hari'); timeEl = wrap.querySelector('.co-time');
      chips = { rd: wrap.querySelector('.co-rd b'), st: wrap.querySelector('.co-st b'), pt: wrap.querySelector('.co-pt b'), stEl: wrap.querySelector('.co-st') };
      wrap.querySelector('.co-again').onclick = (e) => { e.stopPropagation(); again(); };
      wrap.querySelector('.co-symb').onclick = (e) => { e.stopPropagation(); toggleSym(); };
      if (ro) ro.disconnect();
      if (G.ResizeObserver) { ro = new G.ResizeObserver(() => layout()); ro.observe(wrap); }
      stats();
      r = null;
      field.innerHTML = '';
      wordEl.textContent = '';
      cover(C().isOver(s) ? 'over' : s.i > 0 || s.moves ? 'paused' : 'ready', c);
      layout();
    }
    function stats() {
      chips.rd.textContent = `${Math.min(s.i + 1, s.rounds)}/${s.rounds}`;
      chips.st.textContent = `×${s.streak}`;
      chips.pt.textContent = String(s.pts);
    }
    const tipOf = (c) => ({ words: 'co_words', stroop: 'co_stroop', mixed: 'co_mixed' })[c.isNew] || (c.mode === 'stroop' || c.mode === 'mixed' ? 'co_stroop' : c.mode === 'same' ? 'co_words' : '');
    function cover(kind, c = C().config(s.level)) {
      phase = kind === 'over' ? 'over' : 'cover';
      const cv = wrap.querySelector('.co-cover');
      if (kind === 'over') { cv.hidden = true; return; }
      const tip = tipOf(c);
      cv.innerHTML = `${c.isNew && kind === 'ready' ? `<span class="co-new">${esc(L('mm_new'))}</span>` : ''}
        <b>${esc(L(kind === 'ready' ? 'pa_ready' : 'pa_paused'))}</b>
        ${tip ? `<p>${esc(L(tip))}</p>` : ''}
        <button type="button" class="candy co-go">${ICON.spark}<span>${esc(L(kind === 'ready' ? 'co_start' : 'pa_tap'))}</span></button>`;
      cv.hidden = false;
      timeEl.style.transform = 'scaleX(1)';
      timeEl.classList.remove('low');
      cv.querySelector('.co-go').onclick = (e) => { e.stopPropagation(); go(); };
    }
    function go() {
      if (phase !== 'cover' || C().isOver(s)) return;
      // dentro il tocco: sblocca voce (iOS) e audio
      if (V && !muted()) V.unlock();
      if (HH.audio && HH.audio.unlock) HH.audio.unlock();
      wrap.querySelector('.co-cover').hidden = true;
      sfx('tap');
      startRound();
    }

    /* ---------- round ---------- */
    function startRound() {
      clearTimers();
      stopVoice();
      r = C().round(s);
      phase = 'intro';
      stats();
      sayEl.classList.remove('talk');
      wordEl.textContent = '';
      wrap.querySelector('.co-wv').hidden = true;
      symEl.hidden = true;
      timeEl.style.transform = 'scaleX(1)';
      timeEl.classList.remove('low');
      field.classList.remove('done');
      field.innerHTML = r.items.map((it, j) => itemHTML(it, j)).join('');
      items = [...field.children];
      layout();
      later(deliver, 320);
    }
    function itemHTML(it, j) {
      const st = `--ink:var(--co-${it.ink});--on:var(--co-${it.ink}-on);--k:${j}`;
      const badge = symOn ? `<span class="co-badge">${symSvg(it.ink)}</span>` : '';
      const inner = it.kind === 'word' ? `<span class="co-w">${esc(upper(nameOf(it.word)))}</span>` : shapeSvg(it.shape);
      return `<button type="button" class="co-it ${it.kind}" data-i="${j}" style="${st}" aria-label="${esc(nameOf(it.ink))}">${inner}${badge}</button>`;
    }
    // dice il colore: voce di sistema se c'è (e l'audio è acceso), altrimenti fumetto con il nome
    function deliver() {
      if (phase !== 'intro' && phase !== 'play') return;
      const name = nameOf(r.target);
      showSym();
      viaVoice = !!(V && !muted() && V.can(code()));
      if (viaVoice) {
        wordEl.textContent = '';
        wrap.querySelector('.co-wv').hidden = false;
        sayEl.classList.add('talk');
        V.speak(name, code(), {
          start() { hariEl.classList.remove('talk'); void hariEl.offsetWidth; hariEl.classList.add('talk'); duck(true); begin(); },
          end() { sayEl.classList.remove('talk'); duck(false); },
          fail() { sayEl.classList.remove('talk'); duck(false); viaVoice = false; showWord(name); begin(); },
        });
      } else { showWord(name); begin(); }
    }
    function showWord(name) {
      wrap.querySelector('.co-wv').hidden = true;
      wordEl.textContent = name;
      sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop');
      hariEl.classList.remove('talk'); void hariEl.offsetWidth; hariEl.classList.add('talk');
      sfx('chime');
    }
    function showSym() {
      symEl.hidden = !symOn || !r;
      if (symOn && r) symEl.innerHTML = symSvg(r.target);
    }
    function begin() { if (phase !== 'intro') return; phase = 'play'; t0 = performance.now(); loop(); }
    function again() {
      if (!r || (phase !== 'play' && phase !== 'intro')) return;
      sfx('tap');
      if (viaVoice && V && !muted() && V.can(code())) {
        sayEl.classList.add('talk');
        V.speak(nameOf(r.target), code(), {
          start() { duck(true); begin(); }, end() { sayEl.classList.remove('talk'); duck(false); },
          fail() { sayEl.classList.remove('talk'); duck(false); viaVoice = false; showWord(nameOf(r.target)); begin(); },
        });
      } else { stopVoice(); viaVoice = false; showWord(nameOf(r.target)); begin(); }
    }
    function stopVoice() { if (V) V.cancel(); if (sayEl) sayEl.classList.remove('talk'); }
    function toggleSym() {
      symOn = !symOn;
      if (HH.store) HH.store.set('colors:sym', symOn);
      sfx('tap');
      wrap.querySelector('.co-symb').setAttribute('aria-pressed', String(symOn));
      items.forEach((b) => {
        const old = b.querySelector('.co-badge');
        if (old) old.remove();
        if (symOn && r) b.insertAdjacentHTML('beforeend', `<span class="co-badge">${symSvg(r.items[+b.dataset.i].ink)}</span>`);
      });
      if (phase === 'play' || phase === 'intro') showSym();
    }

    function loop() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function f() {
        raf = 0;
        if (dead) return;
        if (!el.isConnected || !wrap || !wrap.isConnected) { detach(); return; }
        if (phase !== 'play') return;
        const e = performance.now() - t0, k = Math.max(0, 1 - e / r.limit);
        timeEl.style.transform = `scaleX(${k.toFixed(3)})`;
        timeEl.classList.toggle('low', k < 0.3);
        if (e >= r.limit) { onTimeout(); return; }
        raf = requestAnimationFrame(f);
      });
    }

    function tap(i) {
      if (phase !== 'play' || !r) return;
      const res = C().answer(s, r, i, performance.now() - t0);
      if (res.type === 'invalid') return;
      const b = items[i];
      if (res.type === 'right') {
        phase = 'after';
        cancelAnimationFrame(raf);
        stopVoice();
        b.classList.add('hit');
        field.classList.add('done');
        b.insertAdjacentHTML('beforeend', `<span class="co-plus">+${res.pts}</span>`);
        sfx('place');
        later(() => sfx('cupDone'), 160);
        stats();
        if (res.streak && res.streak % 5 === 0) { chips.stEl.classList.remove('hot'); void chips.stEl.offsetWidth; chips.stEl.classList.add('hot'); sfx('milestone'); ctx.react('happy'); }
        ctx.changed();
        if (res.won) { phase = 'over'; later(() => ctx.win(), 750); }
        else later(startRound, 650);
        return;
      }
      // sbagliato: un cuore; il round continua (l'oggetto sbagliato si spegne)
      b.classList.add('miss');
      b.disabled = true;
      stats();
      ctx.changed();
      if (ctx.mistake) ctx.mistake(res.left); else { sfx('bad'); ctx.react('oops'); }
      if (res.lost) {
        phase = 'over';
        cancelAnimationFrame(raf);
        stopVoice();
        if (items[res.correct]) items[res.correct].classList.add('show');
        field.classList.add('done');
      }
    }
    function onTimeout() {
      const res = C().timeout(s, r);
      if (res.type === 'invalid') return;
      phase = 'after';
      stopVoice();
      timeEl.style.transform = 'scaleX(0)';
      if (items[res.correct]) items[res.correct].classList.add('show');
      field.classList.add('done');
      wrap.querySelector('.co-wv').hidden = true;
      wordEl.textContent = L('co_slow');
      sfx('lightOff');
      stats();
      ctx.changed();
      if (res.won) { phase = 'over'; later(() => ctx.win(), 1100); }
      else later(startRound, 1300);
    }

    /* ---------- misura: griglia che riempie il campo (parole: celle più larghe) ---------- */
    function layout() {
      if (!wrap || !wrap.isConnected) return;
      const wr = wrap.getBoundingClientRect();
      wrap.classList.toggle('wide', wr.width > wr.height * 1.15 && wr.width > 520);
      if (!r) return;
      const fr = field.getBoundingClientRect();
      const n = r.items.length, gap = 8, pad = 20, words = r.items.some((x) => x.kind === 'word');
      const W = Math.max(60, fr.width - pad), H = Math.max(60, fr.height - pad);
      let best = null;
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
        const score = words ? Math.min(cw / 2.3, ch) : Math.min(cw, ch);
        if (!best || score > best.score + 0.5) best = { cols, cw, ch, score };
      }
      field.style.setProperty('--cols', best.cols);
      const cell = Math.min(150, words ? Math.min(best.ch, best.cw) : Math.min(best.cw, best.ch));
      field.style.setProperty('--cell', `${Math.floor(cell)}px`);
      if (words) {
        // stessa misura di carattere per tutte le parole (una parola più piccola non deve "suggerire")
        const ws = [...field.querySelectorAll('.co-w')];
        const maxW = best.cw * 0.92, maxH = Math.min(best.ch * 0.6, 64);
        let fz = maxH;
        ws.forEach((w) => { w.style.setProperty('--fz', '20px'); const x = w.scrollWidth || w.getBoundingClientRect().width; if (x > 0) fz = Math.min(fz, (20 * maxW) / x); });
        fz = Math.max(12, Math.floor(fz));
        field.style.setProperty('--fzc', fz);
        ws.forEach((w) => w.style.setProperty('--fz', `${fz}px`));
      }
    }

    /* ---------- pausa e ciclo di vita ---------- */
    function pause() {
      if (phase !== 'play' && phase !== 'intro' && phase !== 'after') return;
      clearTimers();
      cancelAnimationFrame(raf);
      stopVoice();
      duck(false);
      if (C().isOver(s)) return;
      s.redo++; s.errs = 0; s.tapped = [];
      r = null;
      field.innerHTML = '';
      wordEl.textContent = '';
      wrap.querySelector('.co-wv').hidden = true;
      symEl.hidden = true;
      stats();
      cover('paused');
      ctx.changed();
    }
    function onVis() { if (!el.isConnected) { detach(); return; } if (document.hidden) pause(); }
    document.addEventListener('visibilitychange', onVis);
    function detach() {
      if (dead) return;
      dead = true;
      clearTimers(); cancelAnimationFrame(raf); stopVoice();
      document.removeEventListener('visibilitychange', onVis);
      if (ro) ro.disconnect();
      clearInterval(watch);
    }
    // uscita dal gioco (home): niente voce che continua a parlare
    const watch = setInterval(() => { if (!el.isConnected) detach(); }, 600);

    el.onclick = (e) => {
      const b = e.target.closest('.co-it');
      if (b && field && field.contains(b)) tap(+b.dataset.i);
    };
    el.onkeydown = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && phase === 'cover' && !e.target.closest('button')) { e.preventDefault(); go(); }
    };

    function fresh() {
      s = C().newGame(ctx.level, (Math.random() * 2147483647) | 0);
      build();
      ctx.changed({ reset: true });
    }
    function restart() {
      s = C().newGame(s.level, s.seed);
      build();
      ctx.changed({ reset: true });
    }

    if (saved && C().validate(saved) && !C().isOver(saved)) {
      s = saved;
      s.redo++; s.errs = 0; s.tapped = [];    // il round lasciato a metà si rigenera
      build();
    } else fresh();

    return {
      fresh, restart,
      undo() { /* gioco di rapidità: annullare non ha senso */ },
      snapshot: () => s,
      pause() { pause(); },
      resume() { /* si riprende con un tocco sulla copertina (serve anche a sbloccare la voce) */ },
    };
  }

  HH.games.push({
    id: 'colors', name: 'Hari Colors', rules: 'r_colors', art, create, tutorial: TUT, lives: 3, fill: true,
    rulesEn: 'Hari says a colour out loud: tap the shape of that colour as fast as you can! Quick answers and streaks score more. Later, colour words appear written in a different ink: tap the INK colour you hear, not the word.',
    rate: (s) => HH.colors.rate(s),
    parTime: (s) => HH.colors.parTime(s),
    progress: (s) => HH.colors.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
