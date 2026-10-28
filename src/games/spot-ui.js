/* Hari Spot — interfaccia. Due illustrazioni quasi uguali (una sopra l'altra; affiancate a schermo intero in orizzontale):
 * tocca una differenza su una delle due → cerchietto su entrambe con stelline.
 * Tocco a vuoto → piccola ✕ (nessun cuore: dal livello 4 ogni tocco sbagliato toglie 4 s al bonus tempo e ogni 3 errori
 * una fragolina). Tre tocchi a vuoto di fila in 2,5 s → Hari "gira la testa" per 1,2 s (contro i tocchi a caso).
 * Lente: evidenzia per 3 s la zona di una differenza non trovata (1–3 per livello, costa una fragolina).
 * Zoom: pizzico su una scena (le due si muovono insieme), trascina per spostarti, pulsante per tornare a 1×; rotella su desktop.
 * Stato salvato: { level, seed, found, hints, hinted, misses, moves } → la scena si rigenera identica dal seme.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = { sd_hint: 'Magnifier', sd_pic: 'Picture {n}', sd_found: '{n} of {t} found', sd_unzoom: 'Zoom out' };
  const L = (k) => label(k, EN[k] || k);
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const LENS = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="13" r="8.5" fill="var(--sd-glass)" stroke="var(--ink)" stroke-width="2.6"/>
    <path d="M9 10a5 5 0 0 1 4-3" fill="none" stroke="var(--sd-hi)" stroke-width="2" stroke-linecap="round"/>
    <path d="M19.5 19.5l7 7" stroke="var(--ink)" stroke-width="4.4" stroke-linecap="round"/><path d="M20 20l6 6" stroke="var(--sd-hint-line)" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  const UNZOOM = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M7 10h6M15 15l5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const star4 = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

  /* ---------- mini scene per card e tutorial (solo token) ---------- */
  const A = () => HH.spotArt;
  // casetta + albero + nuvola in un riquadro 400×280, poi rimpicciolito; `alt` = versione con le differenze
  function miniScene(alt, extra = '', noHari = false) {
    const ob = (o) => A().obj(Object.assign({ f: 0, r: 0, s: 1 }, o), 'spring');
    return `<rect width="400" height="280" fill="var(--sd-sky)"/><rect y="196" width="400" height="28" fill="var(--sd-walk)"/><rect y="222" width="400" height="58" fill="var(--sd-road)"/>
      ${ob({ t: 'cloud', x: 90, y: 70, s: 1.3 })}${alt ? '' : ob({ t: 'cloud', x: 300, y: 56, s: 1.1 })}
      ${ob({ t: 'house', x: 110, y: 200, s: 1.55, c: 'cream', c2: alt ? 'blue' : 'red', c3: 'choc', v: { w: [1, 0] } })}
      ${ob({ t: 'ctree', x: 230, y: 214, s: 1.6, c: 'green' })}
      ${noHari ? ob({ t: 'pot', x: 300, y: 218, s: 2.2, c: 'pink' }) : ob({ t: 'hari', x: 300, y: 222, s: 1.5 })}
      ${ob({ t: 'car', x: 200, y: 272, s: 1.5, c: alt ? 'yellow' : 'pink', f: 0 })}${extra}`;
  }
  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <rect x="2" y="4" width="116" height="82" rx="14" fill="var(--sd-paper)"/>
    <g transform="translate(6 18)"><svg width="52" height="36.4" viewBox="0 0 400 280">${miniScene(false, '', true)}</svg></g>
    <g transform="translate(62 18)"><svg width="52" height="36.4" viewBox="0 0 400 280">${miniScene(true, '', true)}</svg></g>
    <rect x="6" y="18" width="52" height="36.4" rx="5" fill="none" stroke="var(--line-2)" stroke-width="1.5"/><rect x="62" y="18" width="52" height="36.4" rx="5" fill="none" stroke="var(--line-2)" stroke-width="1.5"/>
    <circle class="sd-art-ring" cx="76.3" cy="28.5" r="9"/>
    <g class="sd-art-lens"><circle cx="92" cy="66" r="9" fill="var(--sd-glass)" fill-opacity=".8" stroke="var(--sd-ink)" stroke-width="2.4"/><path d="M98.5 72.5l8 8" stroke="var(--sd-ink)" stroke-width="4" stroke-linecap="round"/>
    <path d="M87.5 63a5 5 0 0 1 4-3" fill="none" stroke="var(--sd-hi)" stroke-width="1.8" stroke-linecap="round"/></g>
    <path d="${star4(18, 66, 5)}" fill="var(--sd-spark)"/><path d="${star4(30, 75, 3)}" fill="var(--sd-spark)"/><path d="${star4(108, 12, 3.5)}" fill="var(--sd-spark)"/>
  </svg>`;

  const pair = (alt2, over1 = '', over2 = '') => `<g transform="translate(4 21)"><svg width="54" height="37.8" viewBox="0 0 400 280">${miniScene(false)}${over1}</svg></g>
    <g transform="translate(62 21)"><svg width="54" height="37.8" viewBox="0 0 400 280">${miniScene(alt2)}${over2}</svg></g>
    <rect x="4" y="21" width="54" height="37.8" rx="5" fill="none" stroke="var(--line-2)" stroke-width="1.4"/><rect x="62" y="21" width="54" height="37.8" rx="5" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>`;
  const TUT = [
    { key: 'tu_spot_1', en: 'Two pictures, almost the same. Find all the little differences!',
      art: `<svg viewBox="0 0 120 90"><rect x="2" y="6" width="116" height="78" rx="14" fill="var(--sd-paper)"/>${pair(true)}
        <path d="M54 72h12M54 77h12M63 68l-6 13" stroke="var(--sd-ring)" stroke-width="2.4" stroke-linecap="round"/></svg>` },
    { key: 'tu_spot_2', en: 'Tap a difference on either picture: it gets circled on both.',
      art: `<svg viewBox="0 0 120 90"><rect x="2" y="6" width="116" height="78" rx="14" fill="var(--sd-paper)"/>
        ${pair(true, '<circle class="sd-tut-ring" cx="110" cy="78" r="46" stroke-width="16"/>', '<circle class="sd-tut-ring" cx="110" cy="78" r="46" stroke-width="16"/>')}
        ${HH.tutHand ? HH.tutHand(76, 33) : ''}</svg>` },
    { key: 'tu_spot_3', en: 'Stuck? The magnifier shows where to look. Random taps cost a little time.',
      art: `<svg viewBox="0 0 120 90"><rect x="2" y="6" width="116" height="78" rx="14" fill="var(--sd-paper)"/>
        ${pair(true, '', '<circle class="sd-tut-hint" cx="200" cy="262" r="70"/><g class="sd-tut-x"><path d="M60 230l40 40M100 230l-40 40" stroke="var(--sd-miss)" stroke-width="16" stroke-linecap="round"/></g>')}
        <g transform="translate(70 62)">${LENS.replace('<svg viewBox="0 0 32 32"', '<svg width="20" height="20" viewBox="0 0 32 32"')}</g></svg>` },
  ];

  /* ---------- gioco ---------- */
  function create(el, ctx, saved) {
    const S = HH.spot;
    let s, pz, wrap, pics = [], svgs = [], overs = [], dots, countEl, lensBtn, lensN, unzoomBtn;
    let busy = false, timers = [], missTimes = [], view = { x: 0, y: 0, k: 1 };
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    function fresh() {
      s = S.newGame(ctx.level, (Math.random() * 4294967296) >>> 0);
      pz = S.puzzleOf(s);
      build();
      ctx.changed({ reset: true });
    }

    function build() {
      clearTimers();
      busy = false; missTimes = []; view = { x: 0, y: 0, k: 1 };
      const cls = `sd-${pz.theme} sd-${pz.time} sd-${pz.season}`;
      const pic = (side) => `<div class="sd-pic" data-side="${side}" role="img" aria-label="${L('sd_pic').replace('{n}', side + 1)}">
          <svg class="${cls}" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid meet" dir="ltr">${HH.spotArt.scene(pz, side)}<g class="sd-over"></g></svg></div>`;
      el.innerHTML = `<div class="sd-wrap">
        <div class="sd-bar">
          <div class="sd-dots" aria-live="polite">${'<i></i>'.repeat(pz.n)}<b class="sd-count"></b></div>
          <button type="button" class="sd-lens" aria-label="${L('sd_hint')}">${LENS}<span></span></button>
        </div>
        <div class="sd-pair" dir="ltr">${pic(0)}${pic(1)}</div>
        <button type="button" class="sd-unzoom" hidden aria-label="${L('sd_unzoom')}">${UNZOOM}</button>
      </div>`;
      wrap = el.querySelector('.sd-wrap');
      pics = [...el.querySelectorAll('.sd-pic')];
      svgs = pics.map((p) => p.querySelector('svg'));
      overs = svgs.map((v) => v.querySelector('.sd-over'));
      dots = [...el.querySelectorAll('.sd-dots i')];
      countEl = el.querySelector('.sd-count');
      lensBtn = el.querySelector('.sd-lens');
      lensN = lensBtn.querySelector('span');
      unzoomBtn = el.querySelector('.sd-unzoom');
      s.found.forEach((i) => ring(i, false));
      paint();
      if (s.found.length >= pz.n) solved();
    }

    function paint() {
      dots.forEach((d, i) => d.classList.toggle('on', i < s.found.length));
      countEl.textContent = `${s.found.length}/${pz.n}`;
      el.querySelector('.sd-dots').setAttribute('aria-label', L('sd_found').replace('{n}', s.found.length).replace('{t}', pz.n));
      const left = S.hintsFor(s.n) - s.hints;
      lensN.textContent = Math.max(0, left);
      lensBtn.disabled = left <= 0 || busy;
    }

    /* ---------- segni ---------- */
    function add(side, html, ms) {
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = html;
      overs[side].appendChild(g);
      if (ms) later(() => g.remove(), ms);
      return g;
    }
    function ring(i, sparkle) {
      const z = pz.diffs[i].zone, r = Math.round(z.r * 0.92);
      for (const side of [0, 1]) {
        add(side, `<g class="sd-ring"><circle class="a" cx="${z.x}" cy="${z.y}" r="${r}"/><circle class="b" cx="${z.x}" cy="${z.y}" r="${r}"/></g>`);
        if (sparkle && !reduce()) {
          const st = [0, 1, 2, 3, 4].map((k) => {
            const a = k * 1.256 + 0.4, d = r + 6;
            return `<path class="sd-star" style="animation-delay:${k * 60}ms" d="${star4(Math.round(z.x + Math.cos(a) * d), Math.round(z.y + Math.sin(a) * d), 6 + (k % 2) * 3)}"/>`;
          }).join('');
          add(side, st, 1400);
        }
      }
    }
    function cross(side, x, y) {
      const d = `M${x - 9} ${y - 9}l18 18M${x + 9} ${y - 9}l-18 18`;
      add(side, `<g class="sd-x"><path class="bg" d="${d}"/><path d="${d}"/></g>`, 950);
    }
    function hintMark(i) {
      const z = pz.diffs[i].zone, a = i * 2.4 + 0.7;
      const R = Math.round(Math.min(z.r * 2.1, z.r + 46));        // zona più larga della hitbox, ma non mezza scena
      const cx = Math.round(Math.min(400 - R * 0.5, Math.max(R * 0.5, z.x + Math.cos(a) * z.r * 0.6)));
      const cy = Math.round(Math.min(280 - R * 0.5, Math.max(R * 0.5, z.y + Math.sin(a) * z.r * 0.6)));
      for (const side of [0, 1]) add(side, `<circle class="sd-hintc" cx="${cx}" cy="${cy}" r="${R}"/>`, 3300);
    }

    /* ---------- mosse ---------- */
    function tapAt(side, x, y) {
      if (busy) return;
      const r = S.tap(s, pz, x, y);
      if (r.hit < 0) {
        cross(side, x, y);
        ctx.sfx.bad();
        const now = Date.now();
        missTimes = missTimes.filter((t) => now - t < 2500).concat(now);
        if (missTimes.length >= 3) {                     // tocchi a caso: piccola pausa
          missTimes = [];
          busy = true; wrap.classList.add('dizzy');
          if (ctx.react) ctx.react('oops');
          later(() => { busy = false; wrap.classList.remove('dizzy'); paint(); }, 1200);
        }
        ctx.changed();
        return;
      }
      if (r.again) { ctx.sfx.tap(); ctx.changed(); return; }
      ring(r.hit, true);
      ctx.sfx.place();
      if (ctx.sfx.star) later(() => ctx.sfx.star(s.found.length % 3), 120);
      paint();
      ctx.changed();
      if (r.solved) solved();
    }
    function solved() {
      busy = true;
      paint();
      wrap.classList.add('solved');
      setView({ x: 0, y: 0, k: 1 });
      later(() => { if (ctx.sfx.giggle) ctx.sfx.giggle(); if (ctx.react) ctx.react('happy'); }, 350);
      later(() => ctx.win(), 1500);
    }
    function useHint() {
      if (busy) return;
      const i = S.hint(s, pz);
      if (i < 0) { ctx.sfx.tap(); return; }
      setView({ x: 0, y: 0, k: 1 });
      hintMark(i);
      if (ctx.sfx.blip) ctx.sfx.blip();
      paint();
      ctx.changed();
    }

    /* ---------- zoom e tocchi ---------- */
    function setView(v) {
      const k = Math.min(3, Math.max(1, v.k)), vw = 400 / k, vh = 280 / k;
      view = { k, x: Math.min(400 - vw, Math.max(0, v.x)), y: Math.min(280 - vh, Math.max(0, v.y)) };
      const vb = k === 1 ? '0 0 400 280' : `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
      svgs.forEach((sv) => sv.setAttribute('viewBox', vb));
      pics.forEach((p) => p.classList.toggle('zoomed', k > 1));
      if (unzoomBtn) unzoomBtn.hidden = k <= 1;
    }
    // punto dello schermo → coordinate della scena (frazione del riquadro, tiene conto dello zoom)
    function toScene(pic, cx, cy) {
      const b = pic.getBoundingClientRect();
      const fx = (cx - b.left) / b.width, fy = (cy - b.top) / b.height;
      return { fx, fy, x: view.x + fx * 400 / view.k, y: view.y + fy * 280 / view.k };
    }
    const pts = new Map();
    let gest = null;     // { pinch, moved, k0, d0, p0 } durante un gesto
    function onDown(e) {
      const pic = e.target.closest && e.target.closest('.sd-pic');
      if (!pic || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, pic });
      if (pts.size === 1) gest = { pinch: false, moved: false, v0: Object.assign({}, view) };
      else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const mid = toScene(a.pic, (a.x + b.x) / 2, (a.y + b.y) / 2);
        gest = { pinch: true, moved: true, k0: view.k, d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), p: mid, pic: a.pic };
        e.preventDefault();
      }
      if (view.k > 1 || pts.size > 1) try { pic.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    }
    function onMove(e) {
      const p = pts.get(e.pointerId);
      if (!p || !gest) return;
      p.x = e.clientX; p.y = e.clientY;
      if (gest.pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const k = gest.k0 * Math.hypot(a.x - b.x, a.y - b.y) / gest.d0;
        const bx = gest.pic.getBoundingClientRect();
        const fx = ((a.x + b.x) / 2 - bx.left) / bx.width, fy = ((a.y + b.y) / 2 - bx.top) / bx.height;
        const kk = Math.min(3, Math.max(1, k));
        setView({ k: kk, x: gest.p.x - fx * 400 / kk, y: gest.p.y - fy * 280 / kk });
        e.preventDefault();
        return;
      }
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > 9) gest.moved = true;
      if (gest.moved && view.k > 1) {
        const bx = p.pic.getBoundingClientRect();
        setView({ k: view.k, x: gest.v0.x - (p.x - p.x0) / bx.width * 400 / view.k, y: gest.v0.y - (p.y - p.y0) / bx.height * 280 / view.k });
        e.preventDefault();
      }
    }
    function onUp(e) {
      const p = pts.get(e.pointerId);
      if (!p) return;
      pts.delete(e.pointerId);
      if (e.type === 'pointerup' && gest && !gest.pinch && !gest.moved && pts.size === 0) {
        const q = toScene(p.pic, e.clientX, e.clientY);
        if (q.fx >= 0 && q.fx <= 1 && q.fy >= 0 && q.fy <= 1) tapAt(+p.pic.dataset.side, Math.round(q.x), Math.round(q.y));
      }
      if (pts.size === 0) gest = null;
    }
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', (e) => {
      const pic = e.target.closest && e.target.closest('.sd-pic');
      if (!pic || busy) return;
      e.preventDefault();
      const q = toScene(pic, e.clientX, e.clientY);
      const k = Math.min(3, Math.max(1, view.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
      setView({ k, x: q.x - q.fx * 400 / k, y: q.y - q.fy * 280 / k });
    }, { passive: false });
    el.addEventListener('click', (e) => {
      if (e.target.closest('.sd-lens')) useHint();
      else if (e.target.closest('.sd-unzoom')) { setView({ x: 0, y: 0, k: 1 }); ctx.sfx.tap(); }
    });

    function restart() {
      clearTimers();
      s.found = []; s.hints = 0; s.hinted = []; s.misses = 0; s.moves = 0;
      build();
      ctx.changed({ reset: true });
    }

    const back = saved && S.restore(saved);
    if (back) { s = back; pz = S.puzzleOf(s); build(); } else fresh();

    return {
      fresh,
      restart,
      // annulla: niente da annullare (le differenze trovate restano); riporta lo zoom a 1×
      undo() { setView({ x: 0, y: 0, k: 1 }); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'spot', name: 'Hari Spot', rules: 'r16', art, create,
    rulesEn: 'Two pictures of the city or the forest, almost the same: find every difference! Tap it on either picture to circle it. The magnifier shows where to look, but costs a strawberry; random taps cost a little time.',
    tutorial: TUT,
    // fragoline: 3 − aiuti usati − (dal livello 4) un punto ogni 3 tocchi a vuoto; almeno 1
    rate: (s) => HH.spot.rate(s),
    // 20 s + 12 s a differenza; dal livello 4 ogni tocco a vuoto toglie 4 s
    parTime: (s) => HH.spot.parTime(s),
    progress: (s) => HH.spot.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
