/* Hari Escape — interfaccia.
 * In alto: frecce e pallini delle stanze, lucchetti risolti, lampadina degli aiuti. In mezzo: la stanza (SVG 400×300);
 * un tocco su un oggetto lo esamina: i nascondigli si aprono sul posto, contenitori, pannelli e indizi si aprono in un
 * riquadro di zoom (stesse proporzioni della stanza, così il gioco non cambia altezza). In basso: la borsa (inventario):
 * tocca un oggetto per prenderlo in mano, poi tocca dove usarlo; tocca due oggetti uno dopo l'altro per combinarli;
 * i biglietti si guardano toccandoli. Con lo zoom aperto, toccare un oggetto della borsa lo usa subito lì.
 * Niente testi negli enigmi: solo colori, forme, cifre e simboli. Tastiera: frecce nel labirinto, Esc chiude lo zoom.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = { er_hint: 'Hint', er_close: 'Close', er_bag: 'Bag', er_room: 'Room', er_prev: 'Previous room', er_next: 'Next room', er_item: 'Object' };
  const L_ = (k) => label(k, EN[k] || k);
  const A = () => HH.escapeArt;
  const E = () => HH.escape;
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = 'var(--er-ink)';
  const o = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const GV = (g) => `var(--er-g${g})`;
  const f1 = (n) => Math.round(n * 10) / 10;
  const BULB = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a9 9 0 0 0-5 16.5V23h10v-3.5A9 9 0 0 0 16 3z" fill="var(--er-bulb-on)" stroke="var(--er-ink)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12 26h8M13 29h6" stroke="var(--er-ink)" stroke-width="2.2" stroke-linecap="round"/><path d="M12 10a5 5 0 0 1 4-3" fill="none" stroke="var(--er-hi)" stroke-width="2" stroke-linecap="round"/></svg>`;
  const ARROW = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const LOCK = (on) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${on ? 'M6 9V6a4 4 0 0 1 7.6-1.6' : 'M6 9V6a4 4 0 0 1 8 0v3'}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="3.5" y="9" width="13" height="9" rx="2.5" fill="${on ? 'var(--er-ok)' : 'var(--er-lock)'}" stroke="var(--er-ink)" stroke-width="1.6"/></svg>`;
  const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  /* ---------- card e tutorial ---------- */
  const art = () => HH.escapeArt.card();
  const tutorial = [
    { key: 'tu_escape_1', en: 'Hari is locked in! Tap things to look closer: lift the rug, peek in the vase, open drawers and chests.',
      art: () => { const a = A(); return `<svg viewBox="0 0 120 90" class="er-tu" aria-hidden="true"><rect x="4" y="6" width="112" height="44" rx="10" fill="var(--er-wall)"/><rect x="4" y="46" width="112" height="38" rx="10" fill="var(--er-floor)"/>
        <g class="er-tu-rug"><ellipse cx="60" cy="68" rx="36" ry="9" fill="var(--er-rug)" ${o(1.6)}/></g><g class="er-tu-key" transform="translate(48 54) scale(.6)">${a.keyIcon(2)}</g>
        <g transform="translate(16 26)"><rect width="22" height="18" rx="3" fill="var(--er-frame)" ${o(1.4)}/><rect x="3" y="3" width="16" height="12" fill="var(--er-canvas)"/></g>${HH.tutHand ? HH.tutHand(86, 66) : ''}</svg>`; } },
    { key: 'tu_escape_2', en: 'Collect objects in your bag. Tap one, then tap where to use it. Tap two objects to combine them!',
      art: () => { const a = A(); return `<svg viewBox="0 0 120 90" class="er-tu" aria-hidden="true"><rect x="70" y="14" width="40" height="52" rx="6" fill="var(--er-cab)" ${o(1.6)}/>${a.device({ type: 'key', g: 0 }, 90, 40, 1.1)}
        <rect x="6" y="56" width="48" height="28" rx="8" fill="var(--er-bag)" ${o(1.4)}/><g class="er-tu-move">${a.nest(a.item({ kind: 'key', g: 0 }), 12, 54, 30, 30)}</g>${HH.tutHand ? HH.tutHand(28, 72, 'tut-go', '--dx:52px;--dy:-30px') : ''}</svg>`; } },
    { key: 'tu_escape_3', en: 'Solve the puzzles with the clues you find and open the door to escape. Stuck? The light bulb helps, but costs strawberries.',
      art: () => { const a = A(); return `<svg viewBox="0 0 120 90" class="er-tu" aria-hidden="true">${a.nest(a.clue({ kind: 'paint', marks: [{ g: 0, d: 3 }, { g: 3, d: 1 }, { g: 1, d: 7 }] }), 6, 10, 56, 42)}
        <rect x="6" y="10" width="56" height="42" fill="none" ${o(2)}/><path d="M74 80V26A16 16 0 0 1 106 26V80Z" fill="var(--er-outside)" ${o(1.8)}/><g class="er-tu-door"><path d="M74 80V26A16 16 0 0 1 106 26V80Z" fill="var(--er-door)" ${o(1.8)}/></g>
        <g transform="translate(22 58)"><svg width="26" height="26" viewBox="0 0 32 32">${BULB.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></g></svg>`; } },
  ];
  tutorial.forEach((t) => { const f = t.art; Object.defineProperty(t, 'art', { get: f, enumerable: true }); });

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    let s, Lv, zoom = null, sel = null, won = false, bump = null, lastAct = null, clock = 0;
    let wrap, stageSvg, zoomEl, invEl, barEl, hariArt = '';
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const $ = (q) => el.querySelector(q);
    const patch = (n, html) => HH.domPatch.patch(n, html);
    const retrigger = (n, cls) => { if (!n) return; n.classList.remove(cls); void n.getBoundingClientRect(); n.classList.add(cls); };
    const sfx = (k, ...a) => { const f = ctx.sfx && ctx.sfx[k]; if (f) f(...a); };

    function fresh() {
      const prev = s ? E().typesOf(s) : [];
      s = E().newGame(ctx.level, (Math.random() * 2147483647) | 0, prev);
      start();
      ctx.changed({ reset: true });
    }
    function restart() {
      s = E().newGame(s.level, s.seed, s.avoid);
      start();
      ctx.changed({ reset: true });
    }
    function start() {
      clearTimers();
      Lv = E().levelOf(s);
      zoom = null; sel = null; won = !!s.won; lastAct = null;
      build();
      if (won) later(ctx.win, 400);
    }

    /* ---------- struttura ---------- */
    function build() {
      el.innerHTML = `<div class="er-wrap er-t-${Lv.theme}">
        <div class="er-bar"></div>
        <div class="er-stage">
          <svg class="er-room" viewBox="0 0 400 300" dir="ltr" role="img" aria-label="${L_('er_room')}"></svg>
          <div class="er-zoom" hidden></div>
        </div>
        <div class="er-inv" role="list" aria-label="${L_('er_bag')}"></div>
      </div>`;
      wrap = $('.er-wrap'); stageSvg = $('.er-room'); zoomEl = $('.er-zoom'); invEl = $('.er-inv'); barEl = $('.er-bar');
      render();
    }
    function render() {
      renderBar(); renderRoom(); renderInv(); renderZoom();
    }

    /* ---------- aiuti: cosa evidenziare ---------- */
    function hintView() {
      if (!s.hint || won) return null;
      const st = E().next(s);
      if (!st || E().stepKey(st) !== s.hint.key) return null;
      return Object.assign({ lvl: s.hint.lvl }, st);
    }

    function renderBar() {
      const R = Lv.rooms.length, reach = E().reach(s), hv = hintView();
      const navHl = (d) => (hv && hv.room !== s.room && Math.sign(hv.room - s.room) === d ? ' er-hl' : '');
      const solved = Object.keys(s.solved).length;
      patch(barEl, `${R > 1 ? `<button type="button" class="er-nav${navHl(-1)}" data-nav="-1" aria-label="${L_('er_prev')}" ${s.room > 0 ? '' : 'disabled'}>${ARROW(-1)}</button>
        <span class="er-rooms" aria-hidden="true">${Lv.rooms.map((_, i) => `<i class="${i === s.room ? 'cur' : i <= reach ? 'on' : ''}"></i>`).join('')}</span>
        <button type="button" class="er-nav${navHl(1)}" data-nav="1" aria-label="${L_('er_next')}" ${s.room < reach ? '' : 'disabled'}>${ARROW(1)}</button>` : '<span></span>'}
        <span class="er-locks" role="status" aria-label="${solved}/${Lv.n}"><i class="${solved ? 'on' : ''}">${LOCK(solved >= Lv.n)}</i><b>${solved}/${Lv.n}</b><span class="er-track"><span style="width:${Math.round((100 * solved) / Lv.n)}%"></span></span></span>
        <button type="button" class="er-hint${hv ? ' er-on' : ''}" data-hint="1" aria-label="${L_('er_hint')}">${BULB}${s.hv || s.hp ? `<b>${s.hv + s.hp}</b>` : ''}</button>`);
    }

    function renderRoom() {
      const hv = hintView(), hl = [];
      if (hv && hv.room === s.room) {
        if (hv.obj) hl.push(hv.obj);
        if (hv.lvl === 2 && hv.clues) hv.clues.forEach((c) => { if (c.obj) hl.push(c.obj); });
      }
      const view = { L: Lv, s, hl };
      let svg = A().room(view, s.room);
      // Hari, vicino alla porta (salta di gioia quando si apre l'uscita)
      // (disegnato una volta sola: la mascotte ha id dei gradienti nuovi a ogni chiamata e verrebbe ricreata a ogni mossa)
      if (HH.mascot && !hariArt) hariArt = A().nest(HH.mascot.svg({ cls: 'hari er-hari-svg' }), 292, 232, 58, 58);
      if (HH.mascot) svg += `<g class="er-hari${won ? ' er-out' : ''}" pointer-events="none">${hariArt}</g>`;
      hl.forEach((id) => { const ob = Lv.o[id]; if (!ob || ob.room !== s.room) return; const b = A().hitBox(ob); svg += `<rect x="${b[0] - 3}" y="${b[1] - 3}" width="${b[2] + 6}" height="${b[3] + 6}" rx="14" class="er-ring" pointer-events="none"/>`; });
      // manina dell'aiuto preciso su oggetti da cercare/raccogliere/usare
      if (hv && hv.lvl === 2 && hv.room === s.room && hv.obj && HH.tutHand) {
        const ob = Lv.o[hv.obj], b = A().hitBox(ob);
        svg += `<g pointer-events="none" class="er-hand">${HH.tutHand(b[0] + b[2] / 2, b[1] + b[3] / 2)}</g>`;
      }
      patch(stageSvg, svg);
      stageSvg.classList.toggle('er-dim', !E().lit(s, s.room));
    }

    function renderInv() {
      const hv = hintView(), hlIt = new Set();
      if (hv && (hv.k === 'use')) hlIt.add(hv.item);
      if (hv && hv.k === 'combine') { hlIt.add(hv.a); hlIt.add(hv.b); }
      const slots = Math.max(6, s.inv.length);
      let h = '';
      for (let i = 0; i < slots; i++) {
        const id = s.inv[i];
        if (!id) { h += '<span class="er-slot empty" role="listitem"></span>'; continue; }
        const it = Lv.items[id];
        h += `<button type="button" role="listitem" class="er-slot${sel === id ? ' sel' : ''}${hlIt.has(id) ? ' er-hl' : ''}" data-inv="${id}" aria-pressed="${sel === id}" aria-label="${L_('er_item')} ${i + 1}">${A().item(it)}</button>`;
      }
      patch(invEl, h);
    }

    /* ---------- zoom ---------- */
    function openZoom(z) { zoom = z; renderZoom(); sfx('tap'); }
    function closeZoom() { if (!zoom) return; zoom = null; renderZoom(); renderRoom(); }
    function renderZoom() {
      if (!zoom) { zoomEl.hidden = true; zoomEl.innerHTML = ''; wrap.classList.remove('er-zoomed'); return; }
      let inner = '', cls = '';
      if (zoom.item) inner = A().nest(A().clue(Lv.items[zoom.item].clue), 30, 20, 340, 255) + `<rect x="30" y="20" width="340" height="255" rx="6" fill="none" ${o(3)}/>`;
      else {
        const ob = Lv.o[zoom.obj];
        if (ob.role === 'clue') inner = clueZoom(ob);
        else if (ob.role === 'lock') { const pz = Lv.p[ob.pid]; cls = ' er-z-' + pz.type; inner = s.solved[pz.id] ? openView(ob, pz) : puzzleView(pz); }
      }
      zoomEl.hidden = false;
      wrap.classList.add('er-zoomed');
      // il riquadro si crea UNA volta per oggetto (animazione di apertura una sola volta); a ogni mossa si aggiornano
      // solo i pezzi cambiati dell'enigma: niente sfarfallio, niente animazioni che ripartono, il focus resta
      const key = String(zoom.obj || zoom.item);
      let card = zoomEl.firstElementChild;
      if (!card || card.dataset.zoom !== key) {
        zoomEl.innerHTML = `<div class="er-zcard" data-zoom="${key}"><svg class="er-zsvg" viewBox="0 0 400 300" dir="ltr"></svg>
        <button type="button" class="er-close" data-close="1" aria-label="${L_('er_close')}">${CLOSE}</button></div>`;
        card = zoomEl.firstElementChild;
      }
      card.className = 'er-zcard' + cls;
      patch(card.querySelector('.er-zsvg'), inner);
      if (bump) { const n = zoomEl.querySelector(bump); retrigger(n, 'er-shake'); bump = null; }
      if (lastAct) { const n = zoomEl.querySelector(`[data-a="${lastAct}"]`); if (n) retrigger(n, 'er-press'); lastAct = null; }
    }
    function clueZoom(ob) {
      const c = ob.clue;
      return `<rect x="22" y="12" width="356" height="276" rx="14" fill="${c.kind === 'msg' ? 'var(--er-wood)' : 'var(--er-frame)'}" ${o(3)}/>` + A().nest(A().clue(c), 36, 26, 328, 246);
    }
    // contenitore aperto: il contenuto da raccogliere (o la porta spalancata)
    function openView(ob, pz) {
      const id = Object.keys(Lv.items).find((k) => E().itemShown(s, k) && E().itemObj(Lv, k) === ob.id);
      let b = `<circle cx="200" cy="150" r="110" fill="var(--er-glow)" class="er-glowing"/>`;
      if (pz.gives && pz.gives.door) b += `<path d="M150 260V60H250V260Z" fill="var(--er-outside)" ${o(3)}/><path d="M150 260V60L120 76V250Z" fill="var(--er-door)" ${o(3)}/><g data-nav="1" class="er-go"><circle cx="200" cy="160" r="36" fill="var(--er-paper)" ${o(3)}/><path d="M186 160H214M204 148L214 160L204 172" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      else if (id) b += `<g class="er-loot" data-take="${id}">${A().nest(A().item(Lv.items[id]), 130, 80, 140, 140)}<rect x="130" y="80" width="140" height="140" fill="transparent"/></g>`;
      else b += `<path d="${A().star4(200, 150, 40)}" fill="var(--er-spark)" class="er-spark"/>`;
      return b + A().sparkle(110, 70, 10) + A().sparkle(300, 220, 8) + A().sparkle(290, 70, 6);
    }

    /* ---------- vista di ogni enigma ---------- */
    const btn = (a, inner, extra = '') => `<g class="er-btn" data-a="${a}" ${extra}>${inner}</g>`;
    function guideFor(pz) {
      const hv = hintView();
      if (!hv || hv.lvl !== 2 || hv.pid !== pz.id) return null;
      return E().guide(s, pz.id);
    }
    function puzzleView(pz) {
      const st = s.ps[pz.id], gd = guideFor(pz);
      const T = pz.type;
      if (E().DIGITS.has(T)) {
        const n = pz.len, w = 70, x0 = 200 - (n * w) / 2;
        let b = `<rect x="${x0 - 26}" y="22" width="${n * w + 52}" height="262" rx="28" fill="var(--er-metal)" ${o(3)}/><rect x="${x0 - 12}" y="36" width="${n * w + 24}" height="234" rx="18" fill="var(--er-metal-2)" opacity=".5"/>`;
        for (let i = 0; i < n; i++) {
          const cx = x0 + w * i + w / 2;
          b += pz.dials ? A().gem(pz.dials[i], cx, 56, 15, 2) : `<circle cx="${cx}" cy="56" r="9" fill="var(--er-board)" ${o(2)}/>`;
          b += btn(`dial:${i}:1`, `<rect x="${cx - 27}" y="78" width="54" height="44" rx="12" fill="var(--er-key-btn)" ${o(2.4)}/><path d="M${cx - 10} 106L${cx} 94L${cx + 10} 106" fill="none" ${o(4)}/>`);
          b += `<rect x="${cx - 28}" y="130" width="56" height="70" rx="10" fill="var(--er-paper)" ${o(2.6)}/>${A().txt(cx, 167, st.v[i], 46)}`;
          if (gd) b += `<g class="er-ghost">${A().txt(cx + 22, 138, gd.code[i], 18, 'er-num er-gnum')}</g>`;
          b += btn(`dial:${i}:-1`, `<rect x="${cx - 27}" y="208" width="54" height="44" rx="12" fill="var(--er-key-btn)" ${o(2.4)}/><path d="M${cx - 10} 224L${cx} 236L${cx + 10} 224" fill="none" ${o(4)}/>`);
        }
        return b;
      }
      if (T === 'colors' || T === 'simon') {
        const n = pz.len;
        let b = '';
        const ent = st.e;
        for (let i = 0; i < n; i++) {
          const x = 200 - ((n - 1) * 40) / 2 + i * 40, v = ent[i];
          const g = v == null ? null : T === 'colors' ? v : pz.bars[v];
          b += `<circle cx="${x}" cy="34" r="15" fill="${g == null ? 'var(--er-slot)' : GV(g)}" ${o(2)}/>` + (g == null ? '' : A().gem(g, x, 34, 7, 1.2));
          if (gd && g == null) { const gg = T === 'colors' ? gd.seq[i] : pz.bars[gd.seq[i]]; b += `<g class="er-ghost">${A().gem(gg, x, 34, 9, 1.2)}</g>`; }
        }
        if (T === 'colors') {
          const k = pz.buttons.length, cols = k <= 4 ? k : 3, rows = Math.ceil(k / cols);
          pz.buttons.forEach((g, i) => {
            const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, k - r * cols);
            const x = 200 - ((inRow - 1) * 96) / 2 + c * 96, y = rows === 1 ? 170 : 122 + r * 100;
            const next = gd && gd.seq[gd.at] === g;
            b += btn(`press:${g}`, `<circle cx="${x}" cy="${y + 4}" r="40" fill="var(--er-metal-2)"/><circle cx="${x}" cy="${y}" r="40" fill="${GV(g)}" ${o(3)}/>${A().gem(g, x, y, 20, 2)}${next ? `<circle cx="${x}" cy="${y}" r="47" class="er-ring"/>` : ''}`);
          });
        } else {
          const k = pz.bars.length, w = 300 / k;
          pz.bars.forEach((g, i) => {
            const x = 50 + i * w, h = 200 - i * (90 / Math.max(1, k - 1)), y = 170 - h / 2 + 30;
            const next = gd && gd.seq[gd.at] === i;
            b += btn(`press:${i}`, `<rect x="${f1(x + 4)}" y="${f1(y)}" width="${f1(w - 8)}" height="${f1(h)}" rx="10" fill="${GV(g)}" ${o(3)}/><circle cx="${f1(x + w / 2)}" cy="${f1(y + 14)}" r="4" fill="var(--er-metal)" ${o(1.4)}/><circle cx="${f1(x + w / 2)}" cy="${f1(y + h - 14)}" r="4" fill="var(--er-metal)" ${o(1.4)}/>${A().gem(g, x + w / 2, y + h / 2, 13, 1.8)}${next ? `<rect x="${f1(x)}" y="${f1(y - 4)}" width="${f1(w)}" height="${f1(h + 8)}" rx="12" class="er-ring"/>` : ''}`, `data-bar="${i}"`);
          });
          b += `<path d="M44 248H356" stroke="var(--er-wood-2)" stroke-width="10" stroke-linecap="round"/>`;
        }
        return b;
      }
      if (T === 'levers') {
        const n = pz.n, w = 300 / n;
        let b = `<rect x="34" y="40" width="332" height="230" rx="24" fill="var(--er-panel)" ${o(3)}/><rect x="56" y="146" width="288" height="18" rx="9" fill="var(--er-metal-2)" ${o(2)}/>`;
        st.p.forEach((p, i) => {
          const x = 50 + w * (i + .5), y2 = p ? 74 : 236, flag = gd && gd.flip.includes(i);
          b += btn(`toggle:${i}`, `<rect x="${f1(x - w / 2 + 4)}" y="50" width="${f1(w - 8)}" height="210" fill="transparent"/><path d="M${f1(x)} 155L${f1(x)} ${y2}" ${o(10)}/><path d="M${f1(x)} 155L${f1(x)} ${y2}" stroke="var(--er-metal)" stroke-width="5" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${y2}" r="22" fill="var(--er-knob)" ${o(3)}/>${flag ? `<circle cx="${f1(x)}" cy="${y2}" r="30" class="er-ring"/>` : ''}`);
        });
        return b;
      }
      if (T === 'lights') {
        const c = Math.min(80, 240 / pz.h), x0 = 200 - (pz.w * c) / 2, y0 = 150 - (pz.h * c) / 2;
        let b = `<rect x="${x0 - 20}" y="${y0 - 20}" width="${pz.w * c + 40}" height="${pz.h * c + 40}" rx="24" fill="var(--er-panel)" ${o(3)}/>`;
        st.b.forEach((on, i) => {
          const x = x0 + (i % pz.w) * c + c / 2, y = y0 + Math.floor(i / pz.w) * c + c / 2, ring = gd && gd.press.includes(i);
          b += btn(`press:${i}`, `${on ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(c * .48)}" fill="var(--er-glow)"/>` : ''}<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(c * .34)}" fill="${on ? 'var(--er-bulb-on)' : 'var(--er-bulb-off)'}" ${o(3)}/><path d="M${f1(x - c * .12)} ${f1(y + c * .3)}h${f1(c * .24)}v${f1(c * .1)}h${f1(-c * .24)}z" fill="var(--er-metal)" ${o(1.6)}/>${ring ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(c * .44)}" class="er-ring"/>` : ''}`);
        });
        return b;
      }
      if (T === 'slide') {
        const tile = Math.min(240 / pz.h, 260 / pz.w), W = pz.w * tile, H = pz.h * tile, x0 = 30, y0 = 150 - H / 2;
        const ph = 300 * (pz.h / pz.w), pyOff = (300 - ph) / 2, picStr = A().pic(pz.pic);
        let b = `<rect x="${x0 - 8}" y="${y0 - 8}" width="${W + 16}" height="${H + 16}" rx="12" fill="var(--er-wood-2)" ${o(3)}/>`;
        const N = pz.w * pz.h;
        st.t.forEach((v, pos) => {
          if (v === N - 1) return;
          const x = x0 + (pos % pz.w) * tile, y = y0 + Math.floor(pos / pz.w) * tile, vx = (v % pz.w) * (300 / pz.w), vy = pyOff + Math.floor(v / pz.w) * (ph / pz.h);
          const nxt = gd && gd.move === pos;
          b += btn(`move:${pos}`, `<svg x="${f1(x + 2)}" y="${f1(y + 2)}" width="${f1(tile - 4)}" height="${f1(tile - 4)}" viewBox="${f1(vx)} ${f1(vy)} ${f1(300 / pz.w)} ${f1(ph / pz.h)}" preserveAspectRatio="none">${picStr}</svg><rect x="${f1(x + 2)}" y="${f1(y + 2)}" width="${f1(tile - 4)}" height="${f1(tile - 4)}" rx="6" fill="none" ${o(2.4)}/>${nxt ? `<rect x="${f1(x + 4)}" y="${f1(y + 4)}" width="${f1(tile - 8)}" height="${f1(tile - 8)}" rx="6" class="er-ring"/>` : ''}`, `data-tile="${v}"`);
        });
        const pw = 84, phh = pw * (pz.h / pz.w);
        const py = y0 + H - phh - 8;
        b += `<rect x="${x0 + W + 30}" y="${f1(py)}" width="${pw + 8}" height="${f1(phh + 8)}" rx="8" fill="var(--er-paper)" ${o(2.4)}/><svg x="${x0 + W + 34}" y="${f1(py + 4)}" width="${pw}" height="${f1(phh)}" viewBox="0 ${f1(pyOff)} 300 ${f1(ph)}" preserveAspectRatio="none">${picStr}</svg>`;
        return b;
      }
      if (T === 'balance') {
        const sum = pz.weights.reduce((t, w, i) => t + (st.on[i] ? w : 0), 0), ang = sum > pz.target ? 9 : sum < pz.target ? -9 : 0;
        const have = (i) => i !== pz.missing || s.used[pz.needs[0]];
        let b = `<path d="M160 214H240L222 196H178Z" fill="var(--er-metal)" ${o(3)}/><path d="M200 196V64" ${o(8)}/><path d="M200 196V64" stroke="var(--er-metal)" stroke-width="4"/>`;
        let pan = '', count = 0;
        pz.weights.forEach((w, i) => { if (st.on[i]) { pan += btn(`toggle:${i}`, A().weightIcon(w, 300 + (count % 3 - 1) * 30, 132 - Math.floor(count / 3) * 30, 1.2)); count++; } });
        let dots = '';
        for (let k = 0; k < pz.target; k++) dots += `<circle cx="${f1(100 - Math.min(7, pz.target) * 3.5 + 3.5 + (k % 7) * 7)}" cy="${124 + Math.floor(k / 7) * 7}" r="2.6" fill="${INK}" opacity=".55"/>`;
        b += `<g transform="rotate(${ang} 200 64)"><path d="M80 64H320" ${o(8)}/><path d="M80 64H320" stroke="var(--er-gold)" stroke-width="4"/><path d="M100 64L60 140M100 64L140 140M300 64L260 140M300 64L340 140" ${o(1.6)} fill="none"/>
          <path d="M50 140a50 14 0 0 0 100 0Z" fill="var(--er-gold)" ${o(2.4)}/><path d="M250 140a50 14 0 0 0 100 0Z" fill="var(--er-gold)" ${o(2.4)}/>
          <rect x="66" y="84" width="68" height="54" rx="6" fill="var(--er-parcel)" ${o(2.4)}/><path d="M100 84V138" stroke="var(--er-ribbon)" stroke-width="4"/><rect x="78" y="90" width="44" height="28" rx="6" fill="var(--er-paper)" ${o(2)}/>${A().txt(100, 104.5, pz.target, 22)}${dots}${pan}</g>`;
        b += `<circle cx="200" cy="64" r="8" fill="var(--er-gold)" ${o(2)}/>`;
        let tx = 0;
        const tray = pz.weights.map((w, i) => i).filter((i) => !st.on[i]);
        const gap = 330 / Math.max(1, tray.length);
        tray.forEach((i) => {
          const x = 35 + gap * (tx + .5); tx++;
          const ring = gd && gd.on.includes(i) ? `<circle cx="${f1(x)}" cy="262" r="32" class="er-ring"/>` : '';
          b += have(i) ? btn(`toggle:${i}`, `<rect x="${f1(x - 30)}" y="226" width="60" height="64" fill="transparent"/>${A().weightIcon(pz.weights[i], x, 284, 1.5)}${ring}`)
            : `<g opacity=".55"><rect x="${f1(x - 24)}" y="236" width="48" height="46" rx="8" fill="none" stroke="${INK}" stroke-width="2.4" stroke-dasharray="6 5"/>${A().txt(x, 259, '?', 26)}</g>`;
        });
        return b;
      }
      if (T === 'pipes') {
        const t = Math.min(220 / pz.h, 250 / pz.w), W = pz.w * t, H = pz.h * t, x0 = 190 - W / 2, y0 = 165 - H / 2;
        const flow = E().pipeFlow(pz.w, pz.h, pz.src, pz.dst, pz.kinds, st.r), wet = new Set(flow.wet);
        let b = `<rect x="${x0 - 8}" y="${y0 - 8}" width="${W + 16}" height="${H + 16}" rx="14" fill="var(--er-panel)" ${o(3)}/>`;
        // rubinetto a sinistra, vaso col fiore a destra
        b += `<path d="M${x0 - 34} ${y0 + pz.src * t + t / 2}H${x0}" stroke="var(--er-water)" stroke-width="${f1(t * .22)}"/><rect x="${x0 - 44}" y="${y0 + pz.src * t + t / 2 - 18}" width="20" height="36" rx="6" fill="var(--er-metal)" ${o(2.4)}/>`;
        const fy = y0 + pz.dst * t + t / 2;
        b += `<path d="M${x0 + W} ${fy}H${x0 + W + 18}" stroke="${flow.ok ? 'var(--er-water)' : 'var(--er-pipe)'}" stroke-width="${f1(t * .22)}"/><path d="M${x0 + W + 14} ${fy - 6}H${x0 + W + 44}L${x0 + W + 40} ${fy + 22}H${x0 + W + 18}Z" fill="var(--er-pot)" ${o(2.4)}/><path d="M${x0 + W + 29} ${fy - 6}V${fy - 28}" stroke="var(--er-leaf)" stroke-width="4"/>${A().gem(5, x0 + W + 29, fy - 36, flow.ok ? 13 : 7, 2)}`;
        for (let i = 0; i < pz.w * pz.h; i++) {
          const cx = x0 + (i % pz.w) * t + t / 2, cy = y0 + Math.floor(i / pz.w) * t + t / 2, m = E().rotMask(E().PIPE[pz.kinds[i]], st.r[i]);
          let d = '';
          for (let k = 0; k < 4; k++) if (m & (1 << k)) d += `M${f1(cx)} ${f1(cy)}L${f1(cx + [0, 1, 0, -1][k] * t / 2)} ${f1(cy + [-1, 0, 1, 0][k] * t / 2)}`;
          const ring = gd && gd.fix.includes(i) ? `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(t * .42)}" class="er-ring"/>` : '';
          b += btn(`rot:${i}`, `<rect x="${f1(cx - t / 2 + 2)}" y="${f1(cy - t / 2 + 2)}" width="${f1(t - 4)}" height="${f1(t - 4)}" rx="8" fill="var(--er-tile)" ${o(1.6)}/><path d="${d}" stroke="${INK}" stroke-width="${f1(t * .3)}" stroke-linecap="round"/><path d="${d}" stroke="${wet.has(i) ? 'var(--er-water)' : 'var(--er-pipe)'}" stroke-width="${f1(t * .2)}" stroke-linecap="round"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(t * .12)}" fill="${wet.has(i) ? 'var(--er-water)' : 'var(--er-pipe)'}"/>${ring}`, `data-cell="${i}"`);
        }
        return b;
      }
      if (T === 'maze') {
        const n = pz.n, c = 236 / n, x0 = 16, y0 = 32;
        let b = `<rect x="${x0 - 8}" y="${y0 - 8}" width="${n * c + 16}" height="${n * c + 16}" rx="14" fill="var(--er-wood)" ${o(3)}/><rect x="${x0}" y="${y0}" width="${n * c}" height="${n * c}" fill="var(--er-maze)"/>`;
        let walls = '';
        for (let i = 0; i < n * n; i++) {
          const x = x0 + (i % n) * c, y = y0 + Math.floor(i / n) * c;
          if (!(pz.open[i] & 1)) walls += `M${f1(x)} ${f1(y)}H${f1(x + c)}`;
          if (!(pz.open[i] & 8)) walls += `M${f1(x)} ${f1(y)}V${f1(y + c)}`;
          if (Math.floor(i / n) === n - 1) walls += `M${f1(x)} ${f1(y + c)}H${f1(x + c)}`;
          if (i % n === n - 1) walls += `M${f1(x + c)} ${f1(y)}V${f1(y + c)}`;
        }
        b += `<path d="${walls}" stroke="var(--er-wood-2)" stroke-width="6" stroke-linecap="round"/>`;
        const cxy = (i) => [x0 + (i % n) * c + c / 2, y0 + Math.floor(i / n) * c + c / 2];
        const [gx, gy] = cxy(pz.goal), [bx, by] = cxy(st.p);
        b += `<circle cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(c * .32)}" fill="${INK}"/><path d="${A().star4(gx, gy, c * .22)}" fill="var(--er-spark)" class="er-spark"/>`;
        if (gd) {
          let p = st.p, d = `M${f1(bx)} ${f1(by)}`;
          gd.path.forEach((k) => { p += [-n, 1, n, -1][k]; const [x, y] = cxy(p); d += `L${f1(x)} ${f1(y)}`; });
          b += `<path d="${d}" fill="none" stroke="var(--er-ring)" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round" class="er-ghost"/>`;
        }
        b += `<circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(c * .3)}" fill="var(--er-metal)" ${o(2)} class="er-ball"/><circle cx="${f1(bx - c * .1)}" cy="${f1(by - c * .1)}" r="${f1(c * .08)}" fill="var(--er-hi)"/>`;
        const pad = [[0, 324, 98], [3, 274, 150], [1, 374, 150], [2, 324, 202]];
        pad.forEach(([d, x, y]) => {
          const rot = [0, 90, 180, 270][d];
          b += btn(`move:${d}`, `<circle cx="${x}" cy="${y}" r="25" fill="var(--er-key-btn)" ${o(2.6)}/><path d="M${x - 10} ${y + 5}L${x} ${y - 7}L${x + 10} ${y + 5}" fill="none" ${o(4)} transform="rotate(${rot} ${x} ${y})"/>`);
        });
        return b;
      }
      if (T === 'mirror') {
        const n = pz.n, c = 250 / n, x0 = 200 - (n * c) / 2 + 10, y0 = 150 - (n * c) / 2;
        let b = `<rect x="${x0 - 8}" y="${y0 - 8}" width="${n * c + 16}" height="${n * c + 16}" rx="14" fill="var(--er-panel-dark)" ${o(3)}/>`;
        for (let i = 0; i < n * n; i++) b += `<rect x="${f1(x0 + (i % n) * c + 2)}" y="${f1(y0 + Math.floor(i / n) * c + 2)}" width="${f1(c - 4)}" height="${f1(c - 4)}" rx="6" fill="var(--er-tile-dark)"/>`;
        const cxy = (i) => [x0 + (i % n) * c + c / 2, y0 + Math.floor(i / n) * c + c / 2];
        const bm = E().beam(n, pz.src, pz.mirrors, st.o, pz.target);
        const ly = y0 + pz.src * c + c / 2;
        let d = `M${f1(x0 - 10)} ${f1(ly)}`;
        bm.cells.forEach((cell) => { const [x, y] = cxy(cell); d += `L${f1(x)} ${f1(y)}`; });
        if (!bm.hit && bm.exit) { const [ex, ey] = bm.exit; d += `L${f1(x0 + ex * c + c / 2)} ${f1(y0 + ey * c + c / 2)}`; }
        b += `<rect x="${f1(x0 - 46)}" y="${f1(ly - 16)}" width="40" height="32" rx="8" fill="var(--er-laser)" ${o(2.6)}/><circle cx="${f1(x0 - 10)}" cy="${f1(ly)}" r="5" fill="var(--er-beam)"/>`;
        b += `<path d="${d}" fill="none" stroke="var(--er-beam)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/><path d="${d}" fill="none" stroke="var(--er-hi)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
        const [tx, ty] = cxy(pz.target);
        b += `<path d="M${f1(tx)} ${f1(ty - c * .38)}L${f1(tx + c * .3)} ${f1(ty)}L${f1(tx)} ${f1(ty + c * .38)}L${f1(tx - c * .3)} ${f1(ty)}Z" fill="var(--er-crystal)" ${o(2.4)} class="${bm.hit ? 'er-glowing' : ''}"/>`;
        pz.mirrors.forEach((cell, i) => {
          const [x, y] = cxy(cell), r = c * .34, sl = st.o[i] === 0 ? 1 : -1;
          const ring = gd && gd.flip.includes(i) ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(c * .46)}" class="er-ring"/>` : '';
          b += btn(`flip:${i}`, `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(c * .44)}" fill="var(--er-tile)" ${o(2)}/><path d="M${f1(x - r)} ${f1(y + r * sl)}L${f1(x + r)} ${f1(y - r * sl)}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${f1(x - r)} ${f1(y + r * sl)}L${f1(x + r)} ${f1(y - r * sl)}" stroke="var(--er-mirror)" stroke-width="5" stroke-linecap="round"/>${ring}`);
        });
        return b;
      }
      if (T === 'shadow') {
        const k = pz.shadows.length, gap = 300 / k;
        let b = `<rect x="40" y="12" width="300" height="118" rx="12" fill="var(--er-screen)" ${o(3)}/>`;
        pz.shadows.forEach((t, i) => {
          const x = 40 + gap * (i + .5) * (300 / 300);
          b += A().toy(t, x, 70, 2, true, pz.flip[i]);
          b += i < st.k ? `<g class="er-pop">${A().toy(t, x, 166, 1.3, false, pz.flip[i])}</g>` : `<circle cx="${f1(x)}" cy="166" r="24" fill="none" stroke="${INK}" stroke-width="2.4" stroke-dasharray="5 5" opacity=".45"/>`;
        });
        const rest = pz.toys, g2 = 360 / rest.length;
        b += `<rect x="16" y="264" width="368" height="12" rx="5" fill="var(--er-wood-2)" ${o(2)}/>`;
        rest.forEach((t, i) => {
          const x = 20 + g2 * (i + .5), placed = pz.shadows.indexOf(t) >= 0 && pz.shadows.indexOf(t) < st.k;
          if (placed) return;
          const ring = gd && gd.next === t ? `<circle cx="${f1(x)}" cy="236" r="30" class="er-ring"/>` : '';
          b += btn(`pick:${t}`, `<rect x="${f1(x - g2 / 2 + 3)}" y="200" width="${f1(g2 - 6)}" height="64" fill="transparent"/>${A().toy(t, x, 236, 1.35)}${ring}`);
        });
        return b;
      }
      if (T === 'key') {
        return `<rect x="110" y="30" width="180" height="240" rx="26" fill="var(--er-cab)" ${o(3)}/><circle cx="200" cy="130" r="54" fill="${GV(pz.g)}" ${o(3)}/><circle cx="200" cy="130" r="36" fill="var(--er-metal)" ${o(2.6)}/>
          <path d="M200 106a12 12 0 1 0 .1 0ZM193 124H207L211 152H189Z" fill="${INK}"/>${A().gem(pz.g, 200, 220, 18, 2.4)}
          <g opacity=".45" transform="translate(316 104) scale(1.6)"><path d="${'M17 20H35V24H32V28H28V24H24'}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="12" cy="22" r="8.5" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 3"/>${A().gem(pz.g, 12, 22, 5.2, 1)}</g>`;
      }
      if (T === 'fish') {
        const id = pz.gives && pz.gives.item;
        return `<ellipse cx="200" cy="170" rx="170" ry="100" fill="var(--er-metal)" ${o(3)}/><ellipse cx="200" cy="170" rx="140" ry="76" fill="var(--er-water)" ${o(2)}/>
          <g opacity=".6" class="er-bob">${id ? A().nest(A().item(Lv.items[id]), 160, 150, 80, 80) : ''}</g><path d="M90 160Q120 150 150 160M240 200Q270 190 300 200" fill="none" stroke="var(--er-hi)" stroke-width="3" stroke-linecap="round" opacity=".6"/>
          ${[-100, -50, 0, 50, 100].map((x) => `<path d="M${200 + x} ${98 + Math.abs(x) / 6}V${242 - Math.abs(x) / 6}" stroke="var(--er-metal-2)" stroke-width="10" stroke-linecap="round" opacity=".85"/>`).join('')}
          <g opacity=".5" transform="translate(14 6) scale(2)">${A().item({ kind: 'rod' }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
      }
      return '';
    }

    /* ---------- azioni ---------- */
    function after(r, opts = {}) {
      if (!r || r.type === 'invalid') return false;
      if (r.type === 'wrong') { sfx('bad'); ctx.react('oops'); }
      if (r.solved) solvedFx(r);
      ctx.changed();
      render();
      if (opts.shake) { const n = $(opts.shake); retrigger(n, 'er-shake'); }
      if (s.won && !won) celebrate();
      return true;
    }
    function solvedFx(r) {
      later(() => { (ctx.sfx.unlock || ctx.sfx.cupDone)(); }, 120);
      ctx.react('happy');
      if (r.gives && r.gives.door) later(() => sfx('open'), 500);
    }
    function celebrate() {
      won = true;
      zoom = null; sel = null;
      render();
      sfx('chime');
      const h = stageSvg.querySelector('.er-hari');
      if (h) h.classList.add('er-out');
      wrap.classList.add('er-won');
      later(() => sfx('giggle'), 700);
      later(() => ctx.win(), reduce() ? 500 : 1900);
    }
    function useOn(id, target) {
      const r = E().use(s, id, target);
      if (r.type === 'invalid') return false;
      sel = null;
      if (r.type === 'used') { sfx('place'); if (!r.solved) later(() => sfx('blip'), 150); }
      after(r, r.type === 'wrong' ? { shake: target === 'room' ? '.er-room' : `[data-o="${target}"]` } : {});
      if (r.type === 'wrong' && zoom) { bump = '.er-zcard'; renderZoom(); }
      return true;
    }
    function tapObj(oid) {
      const ob = Lv.o[oid];
      if (!ob || won) return;
      if (sel && Lv.items[sel].kind !== 'note' && ob.role === 'lock') { if (useOn(sel, oid)) return; }
      if (sel) { sel = null; renderInv(); }
      if (ob.role === 'hide') {
        if (!s.open[oid]) { const r = E().search(s, oid); if (r.type === 'reveal') { sfx(r.item ? 'pick' : 'tap'); after(r); if (!r.item) retrigger(stageSvg.querySelector(`[data-o="${oid}"]`), 'er-wiggle'); } }
        else retrigger(stageSvg.querySelector(`[data-o="${oid}"]`), 'er-wiggle');
        return;
      }
      if (ob.role === 'decor') { sfx('tap'); retrigger(stageSvg.querySelector(`[data-o="${oid}"]`), 'er-wiggle'); return; }
      if (ob.slot === 'D' && s.solved[ob.pid] && Lv.p[ob.pid].gives.door) { goRoom(s.room + 1); return; }
      openZoom({ obj: oid });
    }
    function goRoom(r) {
      const res = E().go(s, r);
      if (res.type === 'invalid') return;
      zoom = null; sfx('open');
      ctx.changed();
      render();
      retrigger(stageSvg, 'er-enter');
    }
    function tapInv(id) {
      if (won) return;
      const it = Lv.items[id];
      // zoom aperto su un contenitore che lo vuole: si usa subito lì
      if (zoom && zoom.obj && !sel && it.kind !== 'note') {
        const ob = Lv.o[zoom.obj];
        if (ob.role === 'lock' && !s.solved[ob.pid] && Lv.p[ob.pid].needs.length) { useOn(id, zoom.obj); return; }
      }
      if (sel === id) { sel = null; if (zoom && zoom.item === id) closeZoom(); renderInv(); sfx('tap'); return; }
      if (sel && sel !== id) {
        const a = sel;
        sel = null;
        const r = E().combine(s, a, id);
        if (r.type === 'combined') { sfx('cupDone'); ctx.react('happy'); after(r); retrigger(invEl.querySelector(`[data-inv="${r.item}"]`), 'er-pop'); return; }
        if (r.type === 'wrong') {
          // un biglietto + un oggetto non si combinano: semplicemente prendi in mano il secondo
          if (Lv.items[a].kind === 'note' || it.kind === 'note') { s.wrong = Math.max(0, s.wrong - 1); sel = id; if (it.kind === 'note') openZoom({ item: id }); renderInv(); return; }
          after(r);
          [a, id].forEach((x) => retrigger(invEl.querySelector(`[data-inv="${x}"]`), 'er-shake'));
          return;
        }
      }
      sel = id;
      sfx('tap');
      if (it.kind === 'note') { openZoom({ item: id }); renderInv(); return; }
      // torcia accesa in una stanza buia: la si accende subito
      if (it.kind === 'lamp' && !E().lit(s, s.room)) { useOn(id, 'room'); return; }
      renderInv();
    }
    function takeItem(id) {
      const r = E().take(s, id);
      if (r.type === 'invalid') return;
      sfx('place');
      const wasZoom = zoom;
      after(r);
      retrigger(invEl.querySelector(`[data-inv="${id}"]`), 'er-pop');
      if (wasZoom && wasZoom.obj) later(closeZoom, 250);
    }
    function doAct(spec) {
      if (!zoom || !zoom.obj) return;
      const ob = Lv.o[zoom.obj], pz = Lv.p[ob.pid];
      const [op, a, b] = spec.split(':');
      const r = E().act(s, pz.id, op, +a, b == null ? undefined : +b);
      if (r.type === 'bump') { sfx('boing'); bump = '.er-ball'; renderZoom(); return; }
      if (r.type === 'invalid') { if (pz.type === 'slide') { bump = `[data-a="${spec}"]`; renderZoom(); } return; }
      if (pz.type === 'simon') sfx('lightOn', +a);
      else if (pz.type === 'colors') sfx('lightOn', pz.buttons.indexOf(+a));
      else if (pz.type === 'lights') sfx(s.ps[pz.id].b[+a] ? 'lightOn' : 'lightOff', +a);
      else if (pz.type === 'slide') sfx('mark');
      else if (pz.type === 'pipes') sfx('mark');
      else if (pz.type === 'balance' || pz.type === 'shadow') sfx('set') ;
      else sfx('tap');
      lastAct = spec;
      if (r.type === 'wrong') bump = '.er-zcard';
      after(r);
      if (r.solved && pz.type === 'pipes') sfx('pour', 600);
    }
    function doHint() {
      if (won) return;
      const r = E().hint(s);
      if (!r) return;
      sfx('blip');
      if (r.lvl === 2 && r.k === 'solve' && r.room === s.room) { zoom = { obj: r.obj }; }
      else if (zoom && !(r.k === 'solve' && zoom.obj === r.obj)) zoom = null;
      ctx.changed();
      render();
      retrigger($('.er-hint'), 'er-pop');
    }

    /* ---------- input ---------- */
    el.onclick = (e) => {
      const t = e.target.closest('[data-take],[data-a],[data-inv],[data-nav],[data-hint],[data-close],[data-o],[data-room]');
      if (!t || !el.contains(t)) { if (zoom && e.target === zoomEl) closeZoom(); return; }
      if (t.dataset.take) return takeItem(t.dataset.take);
      if (t.dataset.a) return doAct(t.dataset.a);
      if (t.dataset.inv) return tapInv(t.dataset.inv);
      if (t.dataset.nav) return goRoom(s.room + +t.dataset.nav);
      if (t.dataset.hint) return doHint();
      if (t.dataset.close) { sfx('tap'); return closeZoom(); }
      if (t.dataset.room) {
        if (sel) { useOn(sel, 'room'); return; }
        retrigger(stageSvg, 'er-shake'); sfx('mark');
        return;
      }
      if (t.dataset.o) return tapObj(t.dataset.o);
    };
    el.onkeydown = (e) => {
      if (e.key === 'Escape' && zoom) { e.preventDefault(); closeZoom(); return; }
      if (zoom && zoom.obj) {
        const pz = Lv.p[Lv.o[zoom.obj].pid];
        const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
        if (pz && pz.type === 'maze' && d != null && !s.solved[pz.id]) { e.preventDefault(); doAct(`move:${d}`); }
      }
    };

    // tempo di gioco per le fragoline (solo con la partita visibile e senza finestre aperte)
    clock = setInterval(() => {
      if (!el.isConnected) { clearInterval(clock); return; }
      if (won || G.document.hidden) return;
      const d = G.document;
      if (['tutDlg', 'winDlg', 'loseDlg'].some((id) => { const x = d.getElementById(id); return x && !x.hidden; })) return;
      E().tick(s, 1);
    }, 1000);

    if (saved && E().validate(saved)) { s = saved; start(); } else fresh();

    return {
      fresh, restart,
      undo() { /* in una escape room non si torna indietro: non serve (niente sconfitta) */ },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'escape', name: 'Hari Escape', rules: 'r18', art, create, tutorial,
    rulesEn: 'Hari is locked in a cute house, castle, ship or lab: help him escape! Look around, find hidden objects, combine them and solve the puzzles with the clues in the rooms to open every door. The light bulb gives a hint, but costs strawberries.',
    rate: (s) => HH.escape.rate(s),
    parTime: (s) => HH.escape.parTime(s),
    progress: (s) => HH.escape.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
