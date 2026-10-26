/* Fix-It House — interfaccia comune a tutti gli scenari.
 * Ogni livello è un "episodio" in un ambiente diverso (HH.fixit.sceneFor): casetta, cucina, cameretta, bagno, giardino.
 * Disegni e zone toccabili arrivano dal modulo dello scenario (src/games/fixit-scene-*.js, contratto in fixit-scene-house.js);
 * gli helper di disegno e le icone degli attrezzi da HH.fixitKit (fixit-kit.js).
 * Tocca un guasto e poi un attrezzo (o prima l'attrezzo e poi il guasto):
 *   attrezzo giusto + prerequisiti fatti  → riparato (pop + scintille e cuoricini), sfx.place
 *   attrezzo giusto ma ordine sbagliato   → cuore perso: anello rosso sui guasti che bloccano + freccia tratteggiata
 *                                            per ~1,5 s; la dipendenza resta segnata (freccina + catenella)
 *   attrezzo sbagliato                    → scossa + sfx.bad, nessun cuore ("slip" per le fragoline)
 * Annulla toglie solo l'ultima riparazione (i cuori non tornano).
 * Stile shoujo anni '90: bolle e stelline che fluttuano, cornice di pizzo, cartellone "Episodio N" a inizio livello.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];
  const K = HH.fixitKit;
  const LIVES = 3;
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // bolle e stelline shoujo che fluttuano sopra ogni scenario (decoro fisso, non intercetta i tocchi)
  const DECO = `<svg class="fi-deco" viewBox="0 0 400 400" aria-hidden="true">
    ${[[40, 360, 9, 0], [120, 390, 6, 2.5], [300, 370, 11, 1.2], [370, 395, 7, 4], [210, 400, 5, 5.5]].map(([x, y, r, d]) =>
      `<g class="fi-bub" style="animation-delay:-${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="var(--fi-hi)" fill-opacity=".25" stroke="var(--fi-hi)" stroke-width="1.6" stroke-opacity=".8"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="var(--fi-hi)"/></g>`).join('')}
    ${[[28, 30, 7, 0], [372, 96, 6, 0.8], [160, 18, 5, 1.6], [388, 250, 5, 2.2], [14, 210, 6, 1.1]].map(([x, y, r, d]) =>
      `<g class="fi-twk" style="animation-delay:${d}s">${K.sparkle(x, y, r)}</g>`).join('')}
  </svg>`;

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <rect x="2" y="2" width="116" height="86" rx="14" fill="var(--fi-sky)"/>
    <g transform="translate(2 4) scale(.62)" opacity=".9">${K.stormCloud(0, 0, 1)}</g><path d="M10 26l-2 5M17 27l-2 5M24 26l-2 5" stroke="var(--fi-water-2)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M2 64Q30 52 60 62T118 58V76Q118 88 104 88H16Q2 88 2 76Z" fill="var(--fi-mtn-2)"/>
    <path d="M2 72Q60 64 118 72V76Q118 88 104 88H16Q2 88 2 76Z" fill="var(--fi-grass)"/>
    <circle cx="14" cy="50" r="10" fill="var(--fi-leaf)" ${K.o(1.8)}/><path d="M14 60v14" stroke="var(--fi-wood)" stroke-width="3"/>
    <rect x="30" y="40" width="56" height="34" fill="var(--fi-wall)" ${K.o(2)}/><path d="M32 47H84M32 54H84M32 61H84M32 68H84" stroke="var(--fi-wall-2)" stroke-width="1.2"/>
    <rect x="70" y="18" width="9" height="16" fill="var(--fi-brick)" ${K.o(2)}/>
    <path d="M24 42L58 18L92 42Z" fill="var(--fi-roof)" ${K.o(2)}/><path d="M58 18L92 42H78Z" fill="var(--fi-ink)" opacity=".08"/>${K.hl('M30 40L56 22', 1.8, 0.5)}
    <rect x="38" y="48" width="16" height="13" rx="2" fill="var(--fi-glass)" ${K.o(1.8)}/><path d="M50 49l-5 5l3 2l-4 4" fill="none" ${K.o(1.3)}/>
    <path d="M62 74V60a6 6 0 0 1 12 0V74Z" fill="var(--fi-wood)" ${K.o(1.8)}/>
    <path d="M40 66l-3 4l3 3" fill="none" ${K.o(1.4)}/>
    <g transform="translate(88 44) rotate(28) scale(.75)">${K.TOOL_SVG.hammer}</g>
    <path d="M88 79Q89 67 98 67Q107 67 108 79Z" fill="var(--fi-helmet)" ${K.o(1.6)}/><rect x="85" y="77" width="26" height="4" rx="2" fill="var(--fi-helmet-2)" ${K.o(1.4)}/>
    ${K.star(100, 30, 6, 'var(--fi-sun)')}${K.star(108, 16, 3.5, 'var(--fi-glass-2)')}
  </svg>`;

  function create(el, ctx, saved) {
    const F = HH.fixit;
    let s;                              // stato (vedi HH.fixit.newState)
    let sel = null, armed = null;       // guasto selezionato / attrezzo scelto per primo
    let alertT = 0, winTimer = 0, epTimer = 0, alert = null, layerEls = {}, spotEls = {}, toolEls = {}, popId = null;
    let stage, layers, front, back, over, toolsBar, SCN = null;

    const inLevel = (id) => s.problems.some((p) => p.id === id);
    const isFixed = (id) => s.fixed.includes(id);
    const stOf = (id) => (!inLevel(id) ? 'idle' : isFixed(id) ? 'fixed' : 'broken');
    const dead = () => s.mistakes >= LIVES;

    const center = (id) => { const [x, y, w, h] = SCN.spots[id]; return [x + w / 2, y + h / 2]; };
    const probName = (id) => { const p = SCN.probs[id] || [id, id]; return K.label(p[0], p[1]); };
    const sceneName = () => K.label(SCN.name[0], SCN.name[1]);

    function fresh() {
      s = F.newState(F.generate(ctx.level, Math.random));
      sel = armed = null;
      build(true);
      ctx.changed({ reset: true });
    }

    /* ---------- DOM ---------- */
    function build(showEpisode) {
      clearTimeout(alertT); clearTimeout(winTimer); clearTimeout(epTimer);
      alert = null;
      SCN = HH.fixitScenes[s.scene] || HH.fixitScenes.house;
      const spots = s.problems.map((p) => {
        const [x, y, w, h] = SCN.spots[p.id];
        return `<button class="fi-spot" data-id="${p.id}" aria-label="${probName(p.id)}" aria-pressed="false" style="left:${x / 4}%;top:${y / 4}%;width:${w / 4}%;height:${h / 4}%"></button>`;
      }).join('');
      const tools = s.tools.map((t) => `<button class="fi-tool" data-tool="${t}" aria-label="${K.toolName(t)}" aria-pressed="false">${K.toolIcon(t)}</button>`).join('');
      el.innerHTML = `<div class="fi-wrap">
        <div class="fi-scene fi-sc-${SCN.id}" dir="ltr">
          <svg class="fi-art" viewBox="0 0 400 400" aria-hidden="true">${SCN.base()}</svg>
          ${DECO}
          <svg class="fi-over" viewBox="0 0 400 400" aria-hidden="true"></svg>
          ${spots}
          <span class="fi-tag" aria-hidden="true">${epTag()}</span>
          <div class="fi-ep" aria-hidden="true" hidden></div>
        </div>
        <div class="fi-tools" role="toolbar" dir="ltr">${tools}</div>
      </div>`;
      stage = el.querySelector('.fi-scene');
      layers = el.querySelector('.fi-layers');
      front = el.querySelector('.fi-front');
      back = el.querySelector('.fi-back');
      over = el.querySelector('.fi-over');
      toolsBar = el.querySelector('.fi-tools');
      layers.innerHTML = SCN.layers.map((id) => `<g class="fi-g" data-l="${id}"></g>`).join('');
      layerEls = {}; spotEls = {}; toolEls = {};
      layers.querySelectorAll('.fi-g').forEach((g) => { layerEls[g.dataset.l] = g; });
      el.querySelectorAll('.fi-spot').forEach((b) => { spotEls[b.dataset.id] = b; });
      el.querySelectorAll('.fi-tool').forEach((b) => { toolEls[b.dataset.tool] = b; });
      paint();
      if (showEpisode) episode();
    }

    /* cartellone d'inizio livello, come il titolo di un episodio anime */
    function epTag() { return K.label('epTag', 'Ep. {n}').replace('{n}', s.level); }
    function episode() {
      const box = stage.querySelector('.fi-ep');
      box.innerHTML = `<div class="fi-ep-card"><span class="fi-ep-sp a">✦</span><span class="fi-ep-sp b">✧</span><span class="fi-ep-sp c">♡</span>
        <small>${K.label('episode', 'Episode {n}').replace('{n}', s.level)}</small><b>${sceneName()}</b></div>`;
      box.hidden = false;
      box.classList.remove('out'); void box.offsetWidth; box.classList.add('in');
      epTimer = setTimeout(() => { box.classList.add('out'); epTimer = setTimeout(() => { box.hidden = true; }, 450); }, reduce() ? 1400 : 2100);
    }

    function paint() {
      const S = SCN.flags(stOf);
      SCN.layers.forEach((id) => {
        const g = layerEls[id];
        const html = id[0] === '@' ? SCN.draw[id](S) : SCN.draw[id](stOf(id), S);
        if (g.dataset.html !== html) { g.innerHTML = html; g.dataset.html = html; }
        g.classList.toggle('fi-pop', id === popId);
      });
      const solved = F.isSolved(s);
      const left = s.problems.length - s.fixed.length;
      front.innerHTML = SCN.front(S, stOf, solved, left);
      back.innerHTML = SCN.back(solved);
      stage.classList.toggle('solved', solved);
      stage.style.setProperty('--storm', (left / Math.max(1, s.problems.length)).toFixed(3));
      Object.entries(spotEls).forEach(([id, b]) => {
        const done = isFixed(id);
        b.classList.toggle('done', done);
        b.classList.toggle('sel', id === sel);
        b.setAttribute('aria-pressed', id === sel);
        b.setAttribute('aria-disabled', done);
        b.tabIndex = done ? -1 : 0;
      });
      Object.entries(toolEls).forEach(([t, b]) => { b.classList.toggle('on', t === armed); b.setAttribute('aria-pressed', t === armed); });
      toolsBar.classList.toggle('ready', !!sel);
      paintOver();
      if (solved) { clearTimeout(winTimer); winTimer = setTimeout(ctx.win, 1000); }
    }

    // frecce delle dipendenze scoperte + allarme temporaneo
    function arrow(a, b, cls) {
      const [x1, y1] = center(a), [x2, y2] = center(b);
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L, k = Math.min(22, L / 3);
      const sx = x1 + ux * k, sy = y1 + uy * k, ex = x2 - ux * k, ey = y2 - uy * k;
      const cx = (sx + ex) / 2 - uy * L * 0.18, cy = (sy + ey) / 2 + ux * L * 0.18;
      // punta: direzione dalla curva verso la fine
      const tx = ex - cx, ty = ey - cy, tl = Math.hypot(tx, ty) || 1, hx = tx / tl, hy = ty / tl, hs = cls === 'fi-arrow' ? 9 : 6;
      const head = `M${ex} ${ey}L${(ex - hx * hs - hy * hs * 0.7).toFixed(1)} ${(ey - hy * hs + hx * hs * 0.7).toFixed(1)}L${(ex - hx * hs + hy * hs * 0.7).toFixed(1)} ${(ey - hy * hs - hx * hs * 0.7).toFixed(1)}Z`;
      return `<g class="${cls}"><path d="M${sx.toFixed(1)} ${sy.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none"/><path class="hd" d="${head}"/></g>`;
    }
    function paintOver() {
      let h = '';
      const chained = new Set();
      s.found.forEach(([a, b]) => {
        if (isFixed(b) || isFixed(a)) return;
        if (!alert || alert.id !== b) h += arrow(a, b, 'fi-link');
        chained.add(b);
      });
      chained.forEach((b) => {
        const [x, y, w] = SCN.spots[b];
        const cx = Math.min(392, x + w - 4), cy = Math.max(8, y + 4);
        h += `<g class="fi-chain"><circle cx="${cx}" cy="${cy}" r="9"/><rect x="${cx - 6.5}" y="${cy - 3}" width="8" height="6" rx="3" transform="rotate(-35 ${cx} ${cy})"/><rect x="${cx - 1.5}" y="${cy - 3}" width="8" height="6" rx="3" transform="rotate(-35 ${cx} ${cy})"/></g>`;
      });
      if (alert) {
        alert.blockers.forEach((b) => {
          const [x, y, w, hh] = SCN.spots[b];
          const x1 = Math.max(3, x - 3), y1 = Math.max(3, y - 3), x2 = Math.min(397, x + w + 3), y2 = Math.min(397, y + hh + 3);
          h += `<rect class="fi-ring" x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="16"/>`;
          h += arrow(b, alert.id, 'fi-arrow');
        });
      }
      over.innerHTML = h;
    }

    function burst(id) {
      const [x, y] = center(id);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'fi-burst');
      g.innerHTML = [0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => `<g style="--dx:${(Math.cos(a * Math.PI / 180) * 34).toFixed(1)}px;--dy:${(Math.sin(a * Math.PI / 180) * 34).toFixed(1)}px">${i % 3 === 2
        ? `<path d="M${x} ${y + 3}c-5 -4 -6 -7 -6 -9a3 3 0 0 1 6 -1a3 3 0 0 1 6 1c0 2 -1 5 -6 9z" fill="var(--fi-flower-1)"/>` : K.sparkle(x, y, i % 2 ? 5 : 8, i % 2 ? 'var(--fi-sun)' : 'var(--fi-hi)')}</g>`).join('');
      over.appendChild(g);
      setTimeout(() => g.remove(), 900);
    }
    function hari(cls) {
      const h = stage && stage.querySelector('.fi-hari');
      if (!h) return;
      h.classList.remove('yay', 'oops'); void h.getBoundingClientRect(); h.classList.add(cls);
    }
    function shake(...els) {
      els.filter(Boolean).forEach((e) => { e.classList.remove('fi-shake'); void e.offsetWidth; e.classList.add('fi-shake'); });
    }

    /* ---------- mosse ---------- */
    function use(id, tool) {
      if (dead()) return;
      const r = F.apply(s, id, tool);
      sel = armed = null;
      if (r.result === 'fixed') {
        popId = id;
        paint();
        burst(id);
        hari('yay');
        ctx.sfx.place();
        ctx.changed();
        setTimeout(() => { if (popId === id) { popId = null; const g = layerEls[id]; if (g) g.classList.remove('fi-pop'); } }, 700);
      } else if (r.result === 'tool') {
        paint();
        shake(spotEls[id], toolEls[tool], layerEls[id]);
        ctx.sfx.bad();
        ctx.changed();
      } else if (r.result === 'order') {
        clearTimeout(alertT);
        alert = { id, blockers: r.blockers };
        paint();
        shake(spotEls[id]);
        hari('oops');
        ctx.mistake(LIVES - s.mistakes);
        ctx.changed();
        alertT = setTimeout(() => { alert = null; paintOver(); }, 1600);
      }
    }

    function tapSpot(id) {
      if (dead() || isFixed(id)) return;
      if (armed) { use(id, armed); return; }
      sel = sel === id ? null : id;
      ctx.sfx.mark();
      paint();
    }
    function tapTool(t) {
      if (dead()) return;
      if (sel) { use(sel, t); return; }
      armed = armed === t ? null : t;
      ctx.sfx.mark();
      paint();
    }

    el.onclick = (e) => {
      const sp = e.target.closest('.fi-spot');
      if (sp) { tapSpot(sp.dataset.id); return; }
      const tl = e.target.closest('.fi-tool');
      if (tl) tapTool(tl.dataset.tool);
    };

    function restart() {
      s = F.newState({ level: s.level, scene: s.scene, problems: s.problems, tools: s.tools });
      sel = armed = null; popId = null;
      build(true);
      ctx.changed({ reset: true });
    }

    /* ---------- ripristino ---------- */
    const okNum = (v) => Number.isInteger(v) && v >= 0;
    if (saved && saved.v === 1 && F.validate(saved) && okNum(saved.mistakes) && okNum(saved.slips) && okNum(saved.moves)) {
      const ids = new Set(saved.problems.map((p) => p.id));
      s = Object.assign(F.newState(saved), {
        fixed: saved.fixed.slice(), mistakes: saved.mistakes, slips: saved.slips, moves: saved.moves,
        found: (Array.isArray(saved.found) ? saved.found : []).filter((e) => Array.isArray(e) && ids.has(e[0]) && ids.has(e[1]) &&
          saved.problems.find((p) => p.id === e[1]).deps.includes(e[0])),
      });
      if (dead()) { s.mistakes = 0; s.slips = 0; s.moves = 0; s.fixed = []; s.found = []; }
      build(false);
    } else fresh();

    return {
      fresh,
      restart,
      undo() {
        if (dead() || !s.fixed.length) return;
        F.undo(s);
        sel = armed = null; popId = null;
        clearTimeout(winTimer);
        paint();
        ctx.sfx.mark();
        ctx.changed();
      },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'fixit', name: 'Fix-It House', rules: 'r5', art, create, lives: LIVES,
    rate: (s) => HH.fixit.rate(s),
    parTime: (s) => (s.problems ? s.problems.length : 5) * 15,
    progress: (s) => HH.fixit.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
