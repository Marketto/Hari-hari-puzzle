/* Boba Sort — interfaccia.
 * Tocca un bicchiere (si solleva), poi quello di destinazione: il bicchiere vola sopra l'altro,
 * si inclina e versa. Il getto ha il colore del gusto, la sorgente si svuota mentre la destinazione si riempie.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  // Simboli bianchi per distinguere i gusti anche senza colori (accessibilità)
  const SYM = [
    '<circle cx="10" cy="10" r="5"/>',
    '<path d="M10 16C3 11 4 5 7.5 5 9 5 10 6.5 10 7c0-.5 1-2 2.5-2C16 5 17 11 10 16z"/>',
    '<path d="M10 3l2.1 4.6 5 .5-3.8 3.3 1.1 4.9-4.4-2.6-4.4 2.6 1.1-4.9-3.8-3.3 5-.5z"/>',
    '<path d="M10 4l6 11H4z"/>',
    '<rect x="5" y="5" width="10" height="10" rx="2"/>',
    '<path d="M10 3l6 7-6 7-6-7z"/>',
    '<path d="M10 3c3 5 5 7 5 9.5a5 5 0 0 1-10 0C5 10 7 8 10 3z"/>',
    '<path d="M4 16C4 8 9 4 16 4c0 7-4 12-12 12z"/>',
    '<path d="M13 3a7 7 0 1 0 4 10 5.5 5.5 0 1 1-4-10z"/>',
  ];
  const FLAVORS = ['strawberry', 'matcha', 'taro', 'mango', 'blueberry', 'mint', 'peach', 'cocoa', 'lemon'];
  const colorsFor = (level) => Math.min(9, 3 + Math.floor((level - 1) / 2));

  /* Geometria del bicchiere (unità SVG): bocca a y=22, fondo interno a y=144, 4 strati da 27 */
  const UNIT = 27, BASE = 144, VB_Y = -26, VB = `0 ${VB_Y} 60 186`;
  const CUP = 'M5 22L10.5 136Q12 146 21 146H39Q48 146 49.5 136L55 22Z';
  const CUP_OPEN = 'M5 22L10.5 136Q12 146 21 146H39Q48 146 49.5 136L55 22'; // contorno senza il lato della bocca
  const PEARLS = [[18, 139], [26, 141], [34, 140], [42, 138], [22, 132], [31, 133], [39, 131]];

  // o: { done, justDone, lidDelay, fillFrom, fillDelay, fillDur, drain, drainDelay, drainDur, attrs }
  function cupSVG(c, key, o = {}) {
    const layers = c.map((f, k) => {
      const y = BASE - (k + 1) * UNIT;
      let cls = 'bb-l', st = '';
      if (o.fillFrom != null && k >= o.fillFrom) {
        const m = c.length - o.fillFrom, j = k - o.fillFrom;
        cls += ' fill'; st = `animation-delay:${Math.round(o.fillDelay + (j * o.fillDur) / m)}ms;animation-duration:${Math.round(o.fillDur / m)}ms`;
      } else if (o.drain && k >= c.length - o.drain) {
        const j = c.length - 1 - k;
        cls += ' drain'; st = `animation-delay:${Math.round(o.drainDelay + (j * o.drainDur) / o.drain)}ms;animation-duration:${Math.round(o.drainDur / o.drain)}ms`;
      }
      const top = k === c.length - 1;
      return `<g class="${cls}" style="${st}">
        <rect x="0" y="${y}" width="60" height="${UNIT + 1}" fill="var(--f${f})"/>
        <rect x="0" y="${y + UNIT - 5}" width="60" height="5" fill="#000" opacity=".07"/>
        ${top ? `<ellipse cx="30" cy="${y + 1}" rx="26" ry="3.6" fill="#fff" opacity=".38"/>` : ''}
        <g transform="translate(23 ${y + UNIT / 2 - 7}) scale(.7)" fill="#fff" opacity=".92">${SYM[f]}</g>
      </g>`;
    }).join('');
    const pearls = PEARLS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.7" fill="var(--boba)"/><circle cx="${x - 1.2}" cy="${y - 1.3}" r="1.1" fill="#fff" opacity=".5"/>`).join('');
    const id = 'bbc-' + key;
    const lid = o.done ? `<g class="bb-top${o.justDone ? ' pop' : ''}" style="${o.justDone ? `animation-delay:${o.lidDelay || 0}ms` : ''}">
        <path d="M38 -22L32.5 34" stroke="var(--accent)" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M38 -22L32.5 34" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-dasharray="3 6" opacity=".55"/>
        <path d="M3 23Q30 -6 57 23Z" fill="var(--glass)" stroke="var(--glass-edge)" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M14 14Q22 6 32 5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".7"/>
      </g>` : '';
    return `<svg class="bb-svg" viewBox="${VB}" ${o.attrs || ''} aria-hidden="true">
      <defs><clipPath id="${id}"><path d="${CUP}"/></clipPath></defs>
      <path d="${CUP}" fill="var(--glass)"/>
      <g clip-path="url(#${id})">${layers}${pearls}
        <rect x="9" y="28" width="5" height="104" rx="2.5" fill="#fff" opacity=".5"/>
        <rect x="16.5" y="30" width="2" height="88" rx="1" fill="#fff" opacity=".3"/>
      </g>
      <path d="${CUP_OPEN}" fill="none" stroke="var(--glass-edge)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M4.5 22A25.5 4 0 0 1 55.5 22" fill="none" stroke="var(--glass-edge)" stroke-width="2" stroke-opacity=".35"/>
      <path d="M4.5 22A25.5 4 0 0 0 55.5 22" fill="none" stroke="var(--glass-edge)" stroke-width="2.6" stroke-linecap="round"/>
      ${lid}
    </svg>`;
  }

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    ${cupSVG([0, 2, 1], 'a0', { attrs: 'x="13" y="2" width="29" height="88"' })}
    ${cupSVG([3, 3, 3, 3], 'a1', { done: true, attrs: 'x="45.5" y="2" width="29" height="88"' })}
    ${cupSVG([1, 1], 'a2', { attrs: 'x="78" y="2" width="29" height="88"' })}
  </svg>`;

  const isDone = (c) => c.length === HH.boba.CAP && c.every((x) => x === c[0]);
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- bicchiere in volo disegnato su canvas, con liquido che segue la gravità ----------
   * Il contorno interno del bicchiere è un poligono convesso. A ogni fotogramma lo ruotiamo nel
   * "sistema della gravità" (angolo del bicchiere meno lo sciabordio) e troviamo, per ogni strato,
   * la quota orizzontale che racchiude esattamente il suo volume (ricerca binaria sull'area). */
  const CUP_PTS = [[5, 22], [10.5, 136], [11.3, 140.2], [13.2, 143.6], [16.4, 145.5], [21, 146], [39, 146], [43.6, 145.5], [46.8, 143.6], [48.7, 140.2], [49.5, 136], [55, 22]];
  function clipY(poly, y0, keepBelow) {
    const out = [];
    const inside = (p) => (keepBelow ? p[1] >= y0 : p[1] <= y0);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) { const u = (y0 - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * u, y0]); }
    }
    return out;
  }
  function area(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return Math.abs(s) / 2;
  }
  function centroid(poly) {
    let x = 0, y = 0;
    poly.forEach((p) => { x += p[0]; y += p[1]; });
    return [x / poly.length, y / poly.length];
  }
  // volume (area) di ogni strato a bicchiere dritto
  const VOL = [0, 1, 2, 3].map((k) => {
    const top = BASE - (k + 1) * UNIT, bot = k === 0 ? 147 : BASE - k * UNIT;
    return area(clipY(clipY(CUP_PTS, top, true), bot, false));
  });
  const SYM_PATHS = [
    'M5 10a5 5 0 1 0 10 0a5 5 0 1 0-10 0z',
    'M10 16C3 11 4 5 7.5 5 9 5 10 6.5 10 7c0-.5 1-2 2.5-2C16 5 17 11 10 16z',
    'M10 3l2.1 4.6 5 .5-3.8 3.3 1.1 4.9-4.4-2.6-4.4 2.6 1.1-4.9-3.8-3.3 5-.5z',
    'M10 4l6 11H4z',
    'M7 5h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    'M10 3l6 7-6 7-6-7z',
    'M10 3c3 5 5 7 5 9.5a5 5 0 0 1-10 0C5 10 7 8 10 3z',
    'M4 16C4 8 9 4 16 4c0 7-4 12-12 12z',
    'M13 3a7 7 0 1 0 4 10 5.5 5.5 0 1 1-4-10z',
  ];
  let symCache = null;
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return { f: [...Array(9)].map((_, i) => v('--f' + i)), glass: v('--glass'), edge: v('--glass-edge'), boba: v('--boba') };
  }
  function drawCup(c, o) {
    const { px, py, k, th, phi, piv, layers, colors } = o;
    if (!symCache && typeof Path2D !== 'undefined') symCache = SYM_PATHS.map((d) => new Path2D(d));
    const L = CUP_PTS.map(([x, y]) => [x - piv.x, y - piv.y]);
    const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
    const Q = L.map((p) => rot(p, th - phi));                 // sistema della gravità
    const ys = Q.map((p) => p[1]);
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    const levelFor = (V) => {
      let lo = ymin, hi = ymax;
      for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (area(clipY(Q, mid, true)) > V) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    };
    const path = (poly) => { c.beginPath(); poly.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
    c.save();
    c.translate(px, py); c.scale(k, k);
    c.save(); c.rotate(th); path(L); c.fillStyle = colors.glass; c.fill(); c.restore();
    // liquido: strati impilati dal basso nel sistema della gravità
    c.save(); c.rotate(phi);
    let cum = 0, below = ymax + 1, surface = null;
    layers.forEach((ly) => {
      if (ly.vol < 0.5) return;
      cum += ly.vol;
      const y = levelFor(cum);
      const poly = clipY(clipY(Q, y, true), below + 0.6, false);
      if (poly.length > 2) {
        path(poly); c.fillStyle = colors.f[ly.f]; c.fill();
        const shade = clipY(clipY(Q, below - 4, true), below + 0.6, false);
        if (shade.length > 2) { path(shade); c.fillStyle = 'rgba(0,0,0,.07)'; c.fill(); }
        if (symCache && area(poly) > 260) {
          const [cx, cy] = centroid(poly);
          c.save(); c.translate(cx, cy); c.rotate(-phi); c.scale(0.7, 0.7); c.translate(-10, -10);
          c.fillStyle = 'rgba(255,255,255,.92)'; c.fill(symCache[ly.f]); c.restore();
        }
      }
      below = y; surface = y;
    });
    if (surface !== null) {                                    // riflesso sulla superficie
      const band = clipY(clipY(Q, surface, true), surface + 2.4, false);
      if (band.length > 2) { path(band); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); }
    }
    c.restore();
    // perle, riflessi del vetro, contorno (nel sistema del bicchiere)
    c.save(); c.rotate(th); c.translate(-piv.x, -piv.y);
    c.save(); path(CUP_PTS); c.clip();
    PEARLS.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3.7, 0, Math.PI * 2); c.fillStyle = colors.boba; c.fill(); c.beginPath(); c.arc(x - 1.2, y - 1.3, 1.1, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill(); });
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(9, 28, 5, 104);
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(16.5, 30, 2, 88);
    c.restore();
    c.beginPath(); CUP_PTS.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));   // aperto in alto
    c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = colors.edge; c.stroke();
    c.globalAlpha = 0.35; c.beginPath(); c.ellipse(30, 22, 25.5, 4, 0, Math.PI, Math.PI * 2); c.lineWidth = 2; c.stroke();
    c.globalAlpha = 1; c.beginPath(); c.ellipse(30, 22, 25.5, 4, 0, 0, Math.PI); c.lineWidth = 2.6; c.stroke();
    c.restore();
    c.restore();
  }

  function create(el, ctx, saved) {
    const B = HH.boba;
    let s, sel = -1, busy = false;

    // livello con minimo esatto (A*) e mosse concesse = minimo + 15% (da +2 a +6)
    function fresh() {
      const L = B.generateLevel(colorsFor(ctx.level)) || B.generateLevel(3);
      s = { start: L.cups, cups: L.cups.map((c) => c.slice()), hist: [], moves: 0, par: L.min, max: L.max };
      sel = -1; busy = false;
      render();
      ctx.changed({ reset: true });
    }

    function meter() {
      const left = Math.max(0, s.max - s.moves);
      return `<div class="bb-meter${left <= 2 ? ' warn' : ''}" aria-live="polite">
        <span class="bb-meter-label">${HH.i18n.t('movesLeft')}</span>
        <b>${left}</b><span class="bb-meter-max">/ ${s.max}</span>
        <span class="bb-meter-bar"><i style="width:${(left / s.max) * 100}%"></i></span>
      </div>`;
    }
    // dopo ogni travaso: vittoria, mosse finite, oppure bloccato (nessuna versata o vicolo cieco)
    function after() {
      const st = B.status(s.cups, s.max - s.moves);
      if (st === 'solved') ctx.win();
      else if (st === 'moves' || st === 'stuck') { s.over = st; ctx.changed(); ctx.outOfMoves(st); }
    }

    function render(o = {}) {
      el.innerHTML = `${meter()}<div class="bb-wrap" dir="ltr">${s.cups.map((c, i) => {
        const co = { done: isDone(c), justDone: i === o.justDone, lidDelay: o.lidDelay };
        if (i === o.fillTo) Object.assign(co, { fillFrom: c.length - o.amount, fillDelay: o.fillDelay, fillDur: o.fillDur });
        const label = `${i + 1}: ${c.map((f) => FLAVORS[f]).join(', ') || '—'}`;
        return `<button class="bb-cup${i === sel ? ' sel' : ''}${co.done ? ' done' : ''}${i === o.away ? ' away' : ''}" data-i="${i}" aria-label="${label}">${cupSVG(c, i, co)}</button>`;
      }).join('')}</div><p class="bb-hint">${HH.i18n.t('movesHint')}</p>`;
    }
    function updateSel() {
      el.querySelectorAll('.bb-cup').forEach((b, i) => b.classList.toggle('sel', i === sel));
    }

    function pour(from, to) {
      const prev = s.cups;
      const r = B.pour(prev, from, to);
      const m = r.amount, flavor = prev[from][prev[from].length - 1];
      s.hist.push(prev);
      if (s.hist.length > 80) s.hist.shift();
      s.cups = r.cups; s.moves++;
      sel = -1;
      const justDone = isDone(s.cups[to]) ? to : -1;
      ctx.changed();

      if (reduce()) {
        render({ justDone });
        ctx.sfx.pour(300);
        if (justDone >= 0) ctx.sfx.cupDone();
        setTimeout(after, 300);
        return;
      }

      // tempi (ms)
      const T = { lift: 240, move: 340, tilt: 380, pour: 360 + m * 160, back: 300, ret: 320 };
      const tPour = T.lift + T.move + T.tilt;
      const total = tPour + T.pour + T.back + T.ret;
      busy = true;

      render({ fillTo: to, amount: m, fillDelay: tPour + 140, fillDur: T.pour - 140, away: from, justDone, lidDelay: tPour + T.pour });
      const wrap = el.querySelector('.bb-wrap');
      const srcBtn = wrap.children[from], dstBtn = wrap.children[to];
      const k = srcBtn.offsetWidth / 60;                           // px per unità SVG
      const sx = srcBtn.offsetLeft, sy = srcBtn.offsetTop;
      const dX = dstBtn.offsetLeft, dY = dstBtn.offsetTop;
      const dir = dX >= sx ? 1 : -1;                              // destinazione a destra?
      const toPx = (y) => (y - VB_Y) * k;
      const piv = { x: dir > 0 ? 55 : 5, y: 22 };                 // angolo della bocca (unità SVG)
      const tx = dX + 30 * k - dir * 3 * k;                       // punto di versamento, sopra la bocca
      const ty = dY + toPx(22) - 40 * k;
      const DX = sx + piv.x * k - tx, DY = sy + toPx(piv.y) - ty; // da dove parte il perno

      /* tela per il bicchiere in volo: il liquido segue la gravità */
      const PAD_X = 80, PAD_Y = 170;
      const cv = document.createElement('canvas');
      cv.className = 'bb-fly';
      const W = wrap.offsetWidth + PAD_X * 2, Hh = wrap.offsetHeight + PAD_Y + 40;
      const dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = Hh * dpr;
      cv.style.cssText = `left:${-PAD_X}px;top:${-PAD_Y}px;width:${W}px;height:${Hh}px`;
      wrap.appendChild(cv);
      const g2 = cv.getContext('2d');
      const colors = readColors();
      const layers = prev[from].map((f, i) => ({ f, vol: VOL[i], full: VOL[i] }));
      const ang = dir * 112;
      const KF = [
        [0, DX, DY - 16, 0],
        [T.lift, DX, DY - 54, -dir * 5],
        [T.lift + T.move, 0, 0, dir * 22],
        [tPour, 0, 0, ang],
        [tPour + T.pour, 0, 0, ang + dir * 10],
        [tPour + T.pour + T.back, 0, -6, 0],
        [total, DX, DY, 0],
      ];
      const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
      function pose(ms) {
        let i = 0;
        while (i < KF.length - 2 && ms > KF[i + 1][0]) i++;
        const a = KF[i], b = KF[i + 1];
        const u = ease(Math.min(1, Math.max(0, (ms - a[0]) / (b[0] - a[0]))));
        return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u];
      }
      // svuotamento: dall'alto, uno strato alla volta, durante il versamento
      function drain(ms) {
        let d = Math.min(1, Math.max(0, (ms - tPour - 80) / (T.pour - 80))) * m;
        for (let j = layers.length - 1; j >= layers.length - m; j--) {
          const take = Math.min(1, d);
          layers[j].vol = layers[j].full * (1 - take);
          d -= take;
        }
      }
      // sciabordio: molla smorzata guidata da rotazione e spostamento
      const slosh = { phi: 0, v: 0, prev: null };
      let t0 = 0, raf = 0;
      function frame(now) {
        if (!t0) t0 = now;
        const ms = now - t0;
        const [ox, oy, deg] = pose(ms);
        const th = (deg * Math.PI) / 180;
        if (slosh.prev) {
          const dt = Math.max(1, now - slosh.prev.now) / 16.7;
          const om = (th - slosh.prev.th) / dt, vx = (ox - slosh.prev.ox) / dt;
          const target = Math.max(-0.45, Math.min(0.45, -om * 2.2 - vx * 0.012));
          slosh.v += (target - slosh.phi) * 0.18 * dt;
          slosh.v *= Math.pow(0.84, dt);
          slosh.phi += slosh.v * dt;
        }
        slosh.prev = { now, th, ox };
        drain(ms);
        g2.setTransform(dpr, 0, 0, dpr, 0, 0);
        g2.clearRect(0, 0, W, Hh);
        drawCup(g2, { px: tx + ox + PAD_X, py: ty + oy + PAD_Y, k, th, phi: slosh.phi, piv, layers, colors });
        if (ms < total) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);

      // getto di liquido dal bordo alla superficie nel bicchiere di destinazione
      const at = (ms) => Math.min(1, ms / total);
      const surface = dY + toPx(BASE - (s.cups[to].length - m) * UNIT);
      const stream = document.createElement('div');
      stream.className = 'bb-stream';
      stream.style.cssText = `left:${tx - 2.6 * k}px;top:${ty}px;width:${5.2 * k}px;height:${Math.max(10, surface - ty)}px;background:var(--f${flavor})`;
      wrap.appendChild(stream);
      stream.animate([
        { clipPath: 'inset(0 0 100% 0)', offset: 0 },
        { clipPath: 'inset(0 0 100% 0)', offset: at(tPour + 30) },
        { clipPath: 'inset(0 0 0% 0)', offset: at(tPour + 170) },
        { clipPath: 'inset(0 0 0% 0)', offset: at(tPour + T.pour - 90) },
        { clipPath: 'inset(100% 0 0 0)', offset: at(tPour + T.pour + 60) },
        { clipPath: 'inset(100% 0 0 0)', offset: 1 },
      ], { duration: total, fill: 'forwards' });

      // schizzi
      const drops = [-1, 1, -0.5, 0.6, 0.2].map((d, i) => {
        const e = document.createElement('i');
        e.className = 'bb-drop';
        e.style.cssText = `left:${tx - 3}px;top:${surface - 6}px;background:var(--f${flavor})`;
        wrap.appendChild(e);
        e.animate([
          { transform: 'translate(0,0) scale(0)', opacity: 1 },
          { transform: `translate(${d * 12 * k}px, ${-14 * k}px) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${d * 18 * k}px, ${2 * k}px) scale(.5)`, opacity: 0 },
        ], { duration: 520, delay: tPour + 200 + i * 100, fill: 'both', easing: 'ease-out' });
        return e;
      });
      dstBtn.animate([{ transform: 'none' }, { transform: 'scale(1.04, .97)' }, { transform: 'none' }],
        { duration: 260, delay: tPour + T.pour, easing: 'ease-out' });

      setTimeout(() => ctx.sfx.pour(T.pour), tPour);
      if (justDone >= 0) setTimeout(() => ctx.sfx.cupDone(), tPour + T.pour + 80);
      setTimeout(() => {
        cancelAnimationFrame(raf);
        cv.remove(); stream.remove(); drops.forEach((d) => d.remove());
        srcBtn.classList.remove('away');
        busy = false;
        after();
      }, total);
    }

    el.onclick = (e) => {
      if (busy || s.over || s.moves >= s.max) return;
      const b = e.target.closest('.bb-cup');
      if (!b) return;
      const i = +b.dataset.i;
      if (sel === -1) {
        if (s.cups[i].length) { sel = i; ctx.sfx.pick(); updateSel(); }
        return;
      }
      if (sel === i) { sel = -1; updateSel(); ctx.sfx.set(); return; }
      if (B.canPour(s.cups, sel, i)) { pour(sel, i); return; }
      ctx.sfx.bad();
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      if (s.cups[i].length) { sel = i; updateSel(); }
    };

    const ok = saved && Array.isArray(saved.cups) && Array.isArray(saved.start) && saved.cups.length === saved.start.length;
    if (ok) {
      s = Object.assign({ hist: [], moves: 0, par: 20 }, saved);
      if (!s.max) {                                   // salvataggi precedenti al limite di mosse
        const opt = B.solveOptimal(s.start);
        s.par = opt ? opt.moves : s.par;
        s.max = s.par + B.extraMoves(s.par);
      }
      if (s.over || (s.moves >= s.max && !B.isSolved(s.cups))) { s.cups = s.start.map((c) => c.slice()); s.hist = []; s.moves = 0; delete s.over; }
      render();
    } else fresh();

    return {
      fresh,
      restart() { if (busy) return; s.cups = s.start.map((c) => c.slice()); s.hist = []; s.moves = 0; delete s.over; sel = -1; render(); ctx.changed({ reset: true }); },
      // annulla rimette i bicchieri com'erano ma la mossa resta spesa: il limite non si aggira
      undo() { if (busy || s.over || !s.hist.length || s.moves >= s.max) return; s.cups = s.hist.pop(); sel = -1; render(); ctx.sfx.set(); ctx.changed(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'boba', name: 'Boba Sort', rules: 'r2', art, create,
    // fragoline: 3 col minimo esatto, 2 se usi al massimo il 70% delle mosse in più concesse, 1 oltre
    rate: (s) => {
      const extra = (s.max || s.par + 2) - s.par, used = s.moves - s.par;
      return used <= 0 ? 3 : used <= Math.floor(extra * 0.7) ? 2 : 1;
    },
    parTime: (s) => (s.start.length - 2) * 22,
    // somma degli strati "giusti" alla base di ogni bicchiere: 0 all'inizio, 1 a soluzione
    progress: (s) => {
      const colors = s.start.length - 2;
      let sum = 0;
      s.cups.forEach((c) => { if (!c.length) return; let k = 1; while (k < c.length && c[k] === c[0]) k++; sum += k; });
      return Math.max(0, Math.min(1, (sum - colors) / (colors * (HH.boba.CAP - 1))));
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
