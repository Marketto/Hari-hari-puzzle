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
      <path d="${CUP}" fill="none" stroke="var(--glass-edge)" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="30" cy="22" rx="25.5" ry="4" fill="none" stroke="var(--glass-edge)" stroke-width="2.5"/>
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

  function create(el, ctx, saved) {
    const B = HH.boba;
    let s, sel = -1, busy = false;

    function fresh() {
      const start = B.generate(colorsFor(ctx.level)) || B.generate(3);
      const sol = B.solve(start);
      s = { start, cups: start.map((c) => c.slice()), hist: [], moves: 0, par: sol ? sol.length : start.length * 3 };
      sel = -1; busy = false;
      render();
      ctx.changed({ reset: true });
    }

    function render(o = {}) {
      el.innerHTML = `<div class="bb-wrap" dir="ltr">${s.cups.map((c, i) => {
        const co = { done: isDone(c), justDone: i === o.justDone, lidDelay: o.lidDelay };
        if (i === o.fillTo) Object.assign(co, { fillFrom: c.length - o.amount, fillDelay: o.fillDelay, fillDur: o.fillDur });
        const label = `${i + 1}: ${c.map((f) => FLAVORS[f]).join(', ') || '—'}`;
        return `<button class="bb-cup${i === sel ? ' sel' : ''}${co.done ? ' done' : ''}${i === o.away ? ' away' : ''}" data-i="${i}" aria-label="${label}">${cupSVG(c, i, co)}</button>`;
      }).join('')}</div>`;
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
        if (B.isSolved(s.cups)) setTimeout(ctx.win, 300);
        return;
      }

      // tempi (ms)
      const T = { lift: 220, move: 320, tilt: 260, pour: 340 + m * 150, back: 230, ret: 300 };
      const tPour = T.lift + T.move + T.tilt;
      const total = tPour + T.pour + T.back + T.ret;
      busy = true;

      // misura la sorgente PRIMA di ridisegnare (posizione senza sollevamento: offsetLeft/Top ignorano i transform)
      render({ fillTo: to, amount: m, fillDelay: tPour + 140, fillDur: T.pour - 140, away: from, justDone, lidDelay: tPour + T.pour });
      const wrap = el.querySelector('.bb-wrap');
      const srcBtn = wrap.children[from], dstBtn = wrap.children[to];
      const k = srcBtn.offsetWidth / 60;                           // px per unità SVG
      const sx = srcBtn.offsetLeft, sy = srcBtn.offsetTop;
      const dX = dstBtn.offsetLeft, dY = dstBtn.offsetTop;
      const dir = dX >= sx ? 1 : -1;                              // destinazione a destra?
      const toPx = (y) => (y - VB_Y) * k;
      const pivot = { x: (dir > 0 ? 55 : 5) * k, y: toPx(22) };   // angolo della bocca da cui esce il liquido
      const tx = dX + 30 * k - dir * 3 * k;                       // punto di versamento: sopra la bocca
      const ty = dY + toPx(22) - 40 * k;
      const left = tx - pivot.x, top = ty - pivot.y;
      const dx = sx - left, dy = sy - top;

      const fly = document.createElement('div');
      fly.className = 'bb-fly';
      fly.style.cssText = `left:${left}px;top:${top}px;width:${srcBtn.offsetWidth}px;transform-origin:${pivot.x}px ${pivot.y}px`;
      fly.innerHTML = cupSVG(prev[from], 'fly', { drain: m, drainDelay: tPour + 80, drainDur: T.pour - 80, done: false });
      wrap.appendChild(fly);

      const ang = dir * 108;
      const at = (ms) => Math.min(1, ms / total);
      fly.animate([
        { transform: `translate(${dx}px, ${dy - 16}px) rotate(0deg)`, offset: 0 },
        { transform: `translate(${dx}px, ${dy - 54}px) rotate(${-dir * 4}deg)`, offset: at(T.lift), easing: 'ease-in-out' },
        { transform: `translate(0px, 0px) rotate(${dir * 18}deg)`, offset: at(T.lift + T.move), easing: 'ease-in' },
        { transform: `translate(0px, 0px) rotate(${ang}deg)`, offset: at(tPour) },
        { transform: `translate(0px, 0px) rotate(${ang + dir * 10}deg)`, offset: at(tPour + T.pour), easing: 'ease-in-out' },
        { transform: `translate(0px, ${-6}px) rotate(0deg)`, offset: at(tPour + T.pour + T.back), easing: 'ease-in-out' },
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg)`, offset: 1 },
      ], { duration: total, fill: 'forwards' });

      // getto di liquido dal bordo alla superficie nel bicchiere di destinazione
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
      const drops = [-1, 1, -0.5, 0.6].map((d, i) => {
        const e = document.createElement('i');
        e.className = 'bb-drop';
        e.style.cssText = `left:${tx - 3}px;top:${surface - 6}px;background:var(--f${flavor})`;
        wrap.appendChild(e);
        e.animate([
          { transform: 'translate(0,0) scale(0)', opacity: 1 },
          { transform: `translate(${d * 12 * k}px, ${-14 * k}px) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${d * 18 * k}px, ${2 * k}px) scale(.5)`, opacity: 0 },
        ], { duration: 520, delay: tPour + 200 + i * 110, fill: 'both', easing: 'ease-out' });
        return e;
      });
      dstBtn.animate([{ transform: 'none' }, { transform: 'scale(1.04, .97)' }, { transform: 'none' }],
        { duration: 260, delay: tPour + T.pour, easing: 'ease-out' });

      setTimeout(() => ctx.sfx.pour(T.pour), tPour);
      setTimeout(() => {
        fly.remove(); stream.remove(); drops.forEach((d) => d.remove());
        srcBtn.classList.remove('away');
        busy = false;
        if (B.isSolved(s.cups)) ctx.win();
      }, total);
    }

    el.onclick = (e) => {
      if (busy) return;
      const b = e.target.closest('.bb-cup');
      if (!b) return;
      const i = +b.dataset.i;
      if (sel === -1) {
        if (s.cups[i].length) { sel = i; ctx.sfx.pick(); updateSel(); }
        return;
      }
      if (sel === i) { sel = -1; updateSel(); return; }
      if (B.canPour(s.cups, sel, i)) { pour(sel, i); return; }
      ctx.sfx.bad();
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      if (s.cups[i].length) { sel = i; updateSel(); }
    };

    const ok = saved && Array.isArray(saved.cups) && Array.isArray(saved.start) && saved.cups.length === saved.start.length;
    if (ok) { s = Object.assign({ hist: [], moves: 0, par: 20 }, saved); render(); } else fresh();

    return {
      fresh,
      restart() { if (busy) return; s.cups = s.start.map((c) => c.slice()); s.hist = []; s.moves = 0; sel = -1; render(); ctx.changed({ reset: true }); },
      undo() { if (busy || !s.hist.length) return; s.cups = s.hist.pop(); s.moves = Math.max(0, s.moves - 1); sel = -1; render(); ctx.sfx.pick(); ctx.changed(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'boba', name: 'Boba Sort', rules: 'r2', art, create,
    rate: (s) => (s.moves <= s.par ? 3 : s.moves <= Math.ceil(s.par * 1.35) ? 2 : 1),
    parTime: (s) => (s.start.length - 2) * 22,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
