/* Hari Escape — disegni SVG (solo token --er-*). HH.escapeArt:
 *   gem(g, x, y, r)  glyph(i, x, y, r)  toy(i, x, y, s, sil, flip)  item(it)  clue(data) (riquadro 120×90)
 *   room(L, s, r, view) scena 400×300 · obj(o, view) · door(o, view) · pic(id) (300×200 o 300×300) · card()
 * Geometria della stanza: muro 0–175, pavimento 175–300; posti W0–W3 sul muro (riquadri 66×66), F0–F2 mobili
 * (base a y = 232), S0/S1 vasi davanti, R tappeto, D porta a destra. `view` = { s (stato), L, hl (oggetti evidenziati) }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const INK = 'var(--er-ink)';
  const o = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const GV = (g) => `var(--er-g${g})`;
  const f1 = (n) => Math.round(n * 10) / 10;
  const star4 = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
  const sparkle = (x, y, r) => `<path class="er-spark" d="${star4(x, y, r)}" fill="var(--er-spark)"/>`;
  const hl = (d, w = 2, op = 0.6) => `<path d="${d}" fill="none" stroke="var(--er-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const nest = (svg, x, y, w, h) => svg.replace(/^<svg\b/, `<svg x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"`);
  const txt = (x, y, s, size, cls = 'er-num') => `<text x="${f1(x)}" y="${f1(y)}" class="${cls}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${s}</text>`;

  /* ---------- gemme (colore + forma) ---------- */
  function gemPath(g, x, y, r) {
    switch (g) {
      case 0: return `M${x} ${y + r * .85}C${x - r * 1.5} ${y - r * .1} ${x - r * .7} ${y - r * 1.1} ${x} ${y - r * .35}C${x + r * .7} ${y - r * 1.1} ${x + r * 1.5} ${y - r * .1} ${x} ${y + r * .85}Z`;
      case 1: { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * .45 : r; d += `${i ? 'L' : 'M'}${f1(x + Math.cos(a) * rr)} ${f1(y + Math.sin(a) * rr)}`; } return d + 'Z'; }
      case 2: return `M${x - r * .8} ${y + r * .8}C${x - r * .9} ${y - r * .2} ${x - r * .1} ${y - r} ${x + r * .9} ${y - r * .9}C${x + r} ${y + r * .1} ${x + r * .1} ${y + r * .9} ${x - r * .8} ${y + r * .8}Z`;
      case 3: return `M${x} ${y - r}C${x + r * .5} ${y - r * .3} ${x + r * .8} ${y + r * .1} ${x + r * .8} ${y + r * .35}A${r * .8} ${r * .8} 0 0 1 ${x - r * .8} ${y + r * .35}C${x - r * .8} ${y + r * .1} ${x - r * .5} ${y - r * .3} ${x} ${y - r}Z`;
      case 4: return `M${x + r * .3} ${y - r}A${r} ${r} 0 1 0 ${x + r * .9} ${y + r * .55}A${r * .8} ${r * .8} 0 0 1 ${x + r * .3} ${y - r}Z`;
      default: { let d = ''; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5, cx = x + Math.cos(a) * r * .5, cy = y + Math.sin(a) * r * .5; d += `M${f1(cx + r * .45)} ${f1(cy)}a${f1(r * .45)} ${f1(r * .45)} 0 1 0 ${f1(-r * .9)} 0a${f1(r * .45)} ${f1(r * .45)} 0 1 0 ${f1(r * .9)} 0`; } return d; }
    }
  }
  const gem = (g, x, y, r, w = 1.6) => `<path d="${gemPath(g, x, y, r)}" fill="${GV(g)}" ${o(w)}/>` + (g === 5 ? `<circle cx="${x}" cy="${y}" r="${f1(r * .32)}" fill="var(--er-gold)" ${o(w * .7)}/>` : '');

  /* ---------- simboli del messaggio cifrato ---------- */
  function glyph(i, x, y, r, col = 'var(--er-glyph)') {
    const s = `fill="none" stroke="${col}" stroke-width="${f1(r * .22)}" stroke-linecap="round" stroke-linejoin="round"`;
    const fl = `fill="${col}"`;
    switch (i) {
      case 0: { let d = ''; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; d += `M${f1(x + Math.cos(a) * r * .62)} ${f1(y + Math.sin(a) * r * .62)}L${f1(x + Math.cos(a) * r)} ${f1(y + Math.sin(a) * r)}`; } return `<circle cx="${x}" cy="${y}" r="${f1(r * .38)}" ${fl}/><path d="${d}" ${s}/>`; }
      case 1: return `<path d="${gemPath(4, x, y, r * .9)}" ${fl}/>`;
      case 2: return `<path d="${gemPath(3, x, y, r * .95)}" ${fl}/>`;
      case 3: return `<path d="M${x} ${y + r}V${y - r * .2}M${x} ${y + r * .2}C${x - r} ${y - r * .1} ${x - r * .6} ${y - r} ${x} ${y - r}C${x + r * .6} ${y - r} ${x + r} ${y - r * .1} ${x} ${y + r * .2}" ${s}/>`;
      case 4: return `<path d="M${x + r * .25} ${y - r}L${x - r * .55} ${y + r * .1}H${x + r * .1}L${x - r * .25} ${y + r}L${x + r * .6} ${y - r * .15}H${x - r * .05}Z" ${fl}/>`;
      case 5: return `<path d="M${x} ${y}m${r * .15} 0a${r * .15} ${r * .15} 0 1 1 ${-r * .3} 0a${r * .4} ${r * .4} 0 0 1 ${r * .7} 0a${r * .6} ${r * .6} 0 0 1 ${-r * 1.1} 0a${r * .85} ${r * .85} 0 0 1 ${r * 1.6} .1" ${s}/>`;
      case 6: return `<path d="M${x - r} ${y}C${x - r * .5} ${y - r * .7} ${x + r * .3} ${y - r * .7} ${x + r * .55} ${y}C${x + r * .3} ${y + r * .7} ${x - r * .5} ${y + r * .7} ${x - r} ${y}ZM${x + r * .5} ${y}L${x + r} ${y - r * .55}V${y + r * .55}Z" ${fl}/>`;
      default: return `<path d="M${x - r * .8} ${y + r * .45}A${r * .4} ${r * .4} 0 0 1 ${x - r * .55} ${y - r * .25}A${r * .55} ${r * .55} 0 0 1 ${x + r * .45} ${y - r * .35}A${r * .45} ${r * .45} 0 0 1 ${x + r * .75} ${y + r * .45}Z" ${fl}/>`;
    }
  }

  /* ---------- giocattoli (e le loro ombre) ---------- */
  // ogni giocattolo: elenco di [d, colore]; l'ombra usa lo stesso contorno pieno
  const TOY = [
    // papera
    [['M-14 4C-16 14 12 16 15 4C16 -2 10 -2 6 0C8 -6 6 -14 -2 -14C-10 -14 -12 -6 -8 -2C-12 -2 -13 0 -14 4Z', 'var(--er-toy-yellow)'], ['M-11 -8L-19 -6L-11 -4Z', 'var(--er-toy-orange)']],
    // orsetto
    [['M-8 -16a5 5 0 1 0 0.1 0ZM8 -16a5 5 0 1 0 0.1 0Z', 'var(--er-toy-brown)'], ['M0 -18C-9 -18 -11 -10 -9 -5C-14 -2 -14 12 -9 16H9C14 12 14 -2 9 -5C11 -10 9 -18 0 -18Z', 'var(--er-toy-brown)']],
    // razzo
    [['M0 -20C8 -12 8 2 6 10H-6C-8 2 -8 -12 0 -20Z', 'var(--er-toy-white)'], ['M-6 2L-13 12L-6 10ZM6 2L13 12L6 10Z', 'var(--er-toy-red)'], ['M-4 10L0 18L4 10Z', 'var(--er-toy-orange)']],
    // barchetta
    [['M-17 4H17L11 14H-11Z', 'var(--er-toy-red)'], ['M-1 2V-18L13 0Z', 'var(--er-toy-white)'], ['M-3 2V-12L-12 0Z', 'var(--er-toy-blue)']],
    // tazza
    [['M-13 -10H9V6C9 12 4 15 -2 15C-8 15 -13 12 -13 6Z', 'var(--er-toy-blue)'], ['M9 -6C17 -6 17 6 9 6V2C12 2 12 -2 9 -2Z', 'var(--er-toy-blue)']],
    // mela
    [['M0 -10C-8 -15 -16 -8 -14 2C-12 12 -6 16 0 13C6 16 12 12 14 2C16 -8 8 -15 0 -10Z', 'var(--er-toy-red)'], ['M0 -10C0 -14 2 -17 4 -19M1 -14C5 -18 10 -17 11 -14C7 -12 3 -12 1 -14Z', 'var(--er-toy-green)']],
    // pesce
    [['M-12 0C-6 -11 8 -11 12 0C8 11 -6 11 -12 0ZM-11 0L-19 -8V8Z', 'var(--er-toy-orange)']],
    // fungo
    [['M-17 -2C-17 -14 17 -14 17 -2Z', 'var(--er-toy-red)'], ['M-6 -2H6V12C6 15 -6 15 -6 12Z', 'var(--er-toy-white)']],
  ];
  const TOY_EYE = [[-6, -8], [-3, -10], [0, -6], null, null, null, [6, -2], [0, 4]];
  function toy(i, x, y, s = 1, sil = false, flip = 0) {
    const parts = TOY[i].map(([d, c]) => `<path d="${d}" fill="${sil ? 'var(--er-sil)' : c}" ${sil ? '' : o(1.6 / s)}/>`).join('');
    const e = TOY_EYE[i];
    let extra = '';
    if (!sil && e) extra = i === 1 ? `<circle cx="-4" cy="-10" r="1.6" fill="${INK}"/><circle cx="4" cy="-10" r="1.6" fill="${INK}"/><ellipse cx="0" cy="-5" rx="2.4" ry="1.7" fill="${INK}"/>` : `<circle cx="${e[0]}" cy="${e[1]}" r="1.6" fill="${INK}"/>`;
    if (!sil && i === 2) extra = `<circle cx="0" cy="-6" r="3.6" fill="var(--er-glass)" ${o(1.2)}/>`;
    if (!sil && i === 7) extra = `<circle cx="-8" cy="-7" r="2.2" fill="var(--er-toy-white)"/><circle cx="5" cy="-9" r="2.6" fill="var(--er-toy-white)"/><circle cx="-2" cy="6" r="1.2" fill="${INK}"/><circle cx="2" cy="6" r="1.2" fill="${INK}"/>`;
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${flip ? -s : s} ${s})">${parts}${extra}</g>`;
  }

  /* ---------- oggetti dell'inventario (riquadro 40×40) ---------- */
  function keyIcon(g) {
    return `<path d="M17 20H35V24H32V28H28V24H24" fill="var(--er-gold)" ${o(1.6)}/><circle cx="12" cy="22" r="8.5" fill="var(--er-gold)" ${o(1.8)}/>${gem(g, 12, 22, 5.2, 1.2)}`;
  }
  function item(it) {
    if (!it) return '';
    const k = it.kind;
    let b = '';
    if (k === 'key') b = keyIcon(it.g);
    else if (k === 'string') b = `<circle cx="18" cy="20" r="11" fill="var(--er-yarn)" ${o(1.8)}/><path d="M10 15C15 18 21 16 26 13M9 22C15 26 23 24 28 19M13 29C18 28 24 27 27 24" fill="none" stroke="var(--er-yarn-2)" stroke-width="1.6" stroke-linecap="round"/><path d="M28 26C32 30 34 33 36 36" fill="none" stroke="var(--er-yarn-2)" stroke-width="2" stroke-linecap="round"/>`;
    else if (k === 'magnet') b = `<path d="M8 8H16V22A4 4 0 0 0 24 22V8H32V22A12 12 0 0 1 8 22Z" fill="var(--er-magnet)" ${o(1.8)}/><path d="M8 8H16V14H8ZM24 8H32V14H24Z" fill="var(--er-metal)" ${o(1.6)}/>`;
    else if (k === 'rod') b = `<path d="M6 36L30 6" stroke="var(--er-wood-2)" stroke-width="3.6" stroke-linecap="round"/><path d="M30 6Q34 14 33 22" fill="none" stroke="var(--er-yarn-2)" stroke-width="1.5"/><path d="M28 22H38V27A5 5 0 0 1 28 27Z" fill="var(--er-magnet)" ${o(1.4)}/><circle cx="12" cy="29" r="3.5" fill="var(--er-yarn)" ${o(1.2)}/>`;
    else if (k === 'torch' || k === 'lamp') b = (k === 'lamp' ? '<path d="M27 12L40 2V30L27 22Z" fill="var(--er-beam)" opacity=".8"/>' : '') + `<rect x="4" y="12" width="18" height="12" rx="3" fill="var(--er-torch)" ${o(1.8)}/><path d="M22 10H28V26H22Z" fill="var(--er-metal)" ${o(1.8)}/><circle cx="25" cy="18" r="3" fill="${k === 'lamp' ? 'var(--er-bulb-on)' : 'var(--er-glass)'}" ${o(1.2)}/><rect x="9" y="15" width="6" height="3" rx="1.5" fill="var(--er-hi)" opacity=".6"/>`;
    else if (k === 'battery') b = `<rect x="7" y="13" width="24" height="14" rx="3" fill="var(--er-battery)" ${o(1.8)}/><rect x="31" y="17" width="3.5" height="6" rx="1" fill="var(--er-metal)" ${o(1.4)}/><path d="M13 20H19M16 17V23" stroke="var(--er-hi)" stroke-width="2" stroke-linecap="round"/>`;
    else if (k === 'weight') b = weightIcon(it.w, 20, 32, 1);
    else if (k === 'note') b = `<rect x="4" y="6" width="32" height="28" rx="3" fill="var(--er-paper)" ${o(1.6)} transform="rotate(-6 20 20)"/><g transform="rotate(-6 20 20)">${nest(clueSvg(it.clue), 6, 9, 28, 22)}</g>`;
    return `<svg viewBox="0 0 40 40" class="er-item" aria-hidden="true">${b}</svg>`;
  }
  // peso: blocchetto col numero e i pallini (base in x,y)
  function weightIcon(w, x, y, s) {
    const W = 14 + w * 2.2, H = 14 + w * 1.4;
    let dots = '';
    for (let i = 0; i < w; i++) dots += `<circle cx="${f1(x - W / 2 + 4 + (i % 4) * ((W - 8) / 3))}" cy="${f1(y - 4 - Math.floor(i / 4) * 4)}" r="1.3" fill="var(--er-ink)" opacity=".55"/>`;
    return `<g transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})"><path d="M${x - W / 2} ${y}L${x - W / 2 + 3} ${y - H}H${x + W / 2 - 3}L${x + W / 2} ${y}Z" fill="var(--er-weight)" ${o(1.6)}/>
      <path d="M${x - 4} ${y - H}a4 4 0 0 1 8 0" fill="none" ${o(1.6)}/>${txt(x, y - H / 2 - 2, w, 11)}${dots}</g>`;
  }

  /* ---------- indizi (riquadro 120×90) ---------- */
  function badge(g, d, x, y, r = 14) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${GV(g)}" ${o(1.8)}/><circle cx="${x}" cy="${y}" r="${r - 4}" fill="var(--er-paper)" opacity=".9"/>${txt(x, y + 1, d, r * 1.25)}${gem(g, x + r * .72, y - r * .72, r * .42, 1.1)}`;
  }
  const SPOTS = [[24, 28], [62, 60], [98, 30], [30, 68], [94, 70]];
  function clueInner(c) {
    switch (c.kind) {
      case 'paint': {
        const n = c.marks.length;
        return `<rect width="120" height="90" fill="var(--er-canvas)"/><path d="M0 70Q30 54 60 66T120 62V90H0Z" fill="var(--er-canvas-2)"/>` +
          c.marks.map((m, i) => { const [x, y] = n <= 3 ? [22 + i * 38, 42 + (i % 2 ? 6 : -6)] : SPOTS[i]; return badge(m.g, m.d, x, y, 15); }).join('');
      }
      case 'books': {
        const n = c.books.length, w = Math.min(24, 104 / n);
        let x = (120 - n * w) / 2, s = `<rect width="120" height="90" fill="var(--er-paper-2)"/><rect x="4" y="78" width="112" height="7" rx="2" fill="var(--er-wood)" ${o(1.6)}/>`;
        c.books.forEach((b) => {
          const h = 50 + b.h * 8;
          s += `<rect x="${f1(x + 1)}" y="${78 - h}" width="${f1(w - 2)}" height="${h}" rx="3" fill="${GV(b.g)}" ${o(1.6)}/><rect x="${f1(x + 3)}" y="${78 - h / 2 - 9}" width="${f1(w - 6)}" height="18" rx="2" fill="var(--er-paper)" ${o(1)}/>` +
            txt(x + w / 2, 78 - h / 2, b.d, 15) + gem(b.g, x + w / 2, 78 - h + 9, 5, 1);
          x += w;
        });
        return s;
      }
      case 'count': {
        let s = `<rect width="120" height="90" fill="var(--er-poster)"/>`;
        c.dots.forEach((d) => { s += gem(d.g, 10 + (d.c % 7) * 16.6, 12 + Math.floor(d.c / 7) * 22, 7, 1.2); });
        return s;
      }
      case 'clock': {
        const n = c.clocks.length, r = n <= 3 ? 17 : 13;
        let s = `<rect width="120" height="90" fill="var(--er-paper-2)"/>`;
        c.clocks.forEach((k, i) => {
          const x = (120 / n) * (i + .5), y = 50, a = (k.h * 30 - 90) * Math.PI / 180;
          let ticks = '';
          for (let h = 1; h <= 12; h++) { const b = (h * 30 - 90) * Math.PI / 180; ticks += `<circle cx="${f1(x + Math.cos(b) * (r - 3.5))}" cy="${f1(y + Math.sin(b) * (r - 3.5))}" r="${h % 3 ? .8 : 1.5}" fill="${INK}"/>`; }
          s += `<circle cx="${f1(x)}" cy="${y}" r="${r + 3}" fill="${GV(k.g)}" ${o(1.6)}/><circle cx="${f1(x)}" cy="${y}" r="${r}" fill="var(--er-paper)" ${o(1.2)}/>${ticks}` +
            `<path d="M${f1(x)} ${y}V${y - r + 5}" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>` +
            `<path d="M${f1(x)} ${y}L${f1(x + Math.cos(a) * (r - 7))} ${f1(y + Math.sin(a) * (r - 7))}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${y}" r="2" fill="${INK}"/>` +
            gem(k.g, x, y - r - 8, 5.5, 1.1);
        });
        return s;
      }
      case 'balloons': {
        const n = c.seq.length, gap = 108 / n;
        let s = `<rect width="120" height="90" fill="var(--er-sky)"/><path d="M0 78Q60 66 120 78V90H0Z" fill="var(--er-canvas-2)"/>`;
        c.seq.forEach((g, i) => {
          const x = 6 + gap * (i + .5), y = 32 + (i % 2) * 8;
          s += `<path d="M${f1(x)} ${y + 13}Q${f1(x - 4)} ${y + 26} ${f1(x)} 74" fill="none" stroke="${INK}" stroke-width="1" opacity=".6"/><ellipse cx="${f1(x)}" cy="${y}" rx="${f1(Math.min(12, gap * .42))}" ry="14" fill="${GV(g)}" ${o(1.6)}/>${gem(g, x, y, 5.5, 1)}`;
        });
        return s + `<path d="M14 84H104M96 79L104 84L96 89" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      case 'sheet': {
        const n = c.notes.length, gap = 100 / n, nb = c.bars.length;
        let s = `<rect width="120" height="90" fill="var(--er-paper)"/>`;
        for (let k = 0; k < 5; k++) s += `<path d="M6 ${24 + k * 10}H114" stroke="${INK}" stroke-width=".8" opacity=".35"/>`;
        s += `<path d="M10 20C4 30 18 36 12 50C8 60 14 66 18 60" fill="none" stroke="${INK}" stroke-width="2" opacity=".5"/>`;
        c.notes.forEach((b, i) => {
          const x = 22 + gap * (i + .5) * .94, y = 68 - (b / Math.max(1, nb - 1)) * 44;
          s += `<path d="M${f1(x + 6)} ${f1(y)}V${f1(y - 18)}" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="7.5" ry="6" fill="${GV(c.bars[b])}" ${o(1.4)}/>${gem(c.bars[b], x, y, 3, .8)}`;
        });
        return s + `<path d="M22 84H104M96 79L104 84L96 89" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;
      }
      case 'levers': {
        const n = c.pos.length, gap = 100 / n;
        let s = `<rect width="120" height="90" fill="var(--er-paper)"/><rect x="8" y="40" width="104" height="12" rx="6" fill="var(--er-metal)" ${o(1.4)}/>`;
        c.pos.forEach((p, i) => {
          const x = 10 + gap * (i + .5), y2 = p ? 14 : 78;
          s += `<path d="M${f1(x)} 46L${f1(x)} ${y2}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${y2}" r="7" fill="var(--er-knob)" ${o(1.6)}/>` +
            `<path d="M${f1(x)} ${p ? 6 : 86}l-4 ${p ? 4 : -4}h8z" fill="${INK}" opacity="0"/>`;
        });
        return s;
      }
      case 'table': {
        const n = c.table.length, rows = Math.ceil(n / 2);
        let s = `<rect width="120" height="90" fill="var(--er-poster)"/>`;
        c.table.forEach((e, i) => {
          const col = i < rows ? 0 : 1, row = col ? i - rows : i, x = 10 + col * 58, y = 12 + row * (78 / rows) + 78 / rows / 2 - 6;
          s += glyph(e.s, x + 8, y, 8) + `<path d="M${x + 19} ${y}h8m-3 -3l3 3l-3 3" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` + txt(x + 38, y + 1, e.d, 15);
        });
        return s;
      }
      case 'msg': {
        const n = c.msg.length, gap = 104 / n;
        let s = `<rect width="120" height="90" rx="4" fill="var(--er-board)"/>`;
        c.msg.forEach((g, i) => { s += glyph(g, 8 + gap * (i + .5), 45, 13, 'var(--er-chalk)'); });
        return s + `<path d="M14 80H104M96 76L104 80L96 84" fill="none" stroke="var(--er-chalk)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;
      }
      default: return '';
    }
  }
  const clueSvg = (c) => `<svg viewBox="0 0 120 90" class="er-clue" dir="ltr" aria-hidden="true">${clueInner(c)}</svg>`;

  /* ---------- disegno per lo scorrimento (300×300) ---------- */
  function pic(id) {
    switch (id) {
      case 'cake': return `<rect width="300" height="300" fill="var(--er-sky)"/><circle cx="60" cy="60" r="30" fill="var(--er-sun)" ${o(3)}/>
        <path d="M60 170H240V260H60Z" fill="var(--er-g1)" ${o(4)}/><path d="M60 170Q75 196 90 170Q105 196 120 170Q135 196 150 170Q165 196 180 170Q195 196 210 170Q225 196 240 170V150H60Z" fill="var(--er-paper)" ${o(4)}/>
        <path d="M70 120H230V150H70Z" fill="var(--er-g0)" ${o(4)}/><path d="M150 120V84" stroke="${INK}" stroke-width="4"/><path d="M150 60C162 72 158 84 150 84C142 84 138 72 150 60Z" fill="var(--er-g5)" ${o(3)}/>
        ${gem(0, 100, 215, 16, 3)}${gem(1, 150, 215, 16, 3)}${gem(3, 200, 215, 16, 3)}<path d="M0 260H300V300H0Z" fill="var(--er-wood)" ${o(3)}/>`;
      case 'boat': return `<rect width="300" height="300" fill="var(--er-sky)"/><path d="M0 200Q40 186 80 200T160 200T240 200T320 200V300H0Z" fill="var(--er-water)" ${o(3)}/>
        <path d="M60 196H240L210 246H90Z" fill="var(--er-g0)" ${o(4)}/><path d="M150 190V50L230 180Z" fill="var(--er-paper)" ${o(4)}/><path d="M140 190V80L74 180Z" fill="var(--er-g3)" ${o(4)}/>
        <circle cx="250" cy="60" r="28" fill="var(--er-sun)" ${o(3)}/><circle cx="110" cy="220" r="8" fill="var(--er-paper)" ${o(3)}/><circle cx="190" cy="220" r="8" fill="var(--er-paper)" ${o(3)}/>`;
      case 'flower': return `<rect width="300" height="300" fill="var(--er-canvas)"/><path d="M150 290V150" stroke="var(--er-leaf)" stroke-width="12"/><path d="M150 230C110 230 90 200 90 180C130 180 150 210 150 230ZM150 250C190 250 210 220 210 200C170 200 150 230 150 250Z" fill="var(--er-leaf)" ${o(4)}/>
        ${[0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return `<circle cx="${f1(150 + Math.cos(a) * 52)}" cy="${f1(110 + Math.sin(a) * 52)}" r="38" fill="var(--er-g${k})" ${o(4)}/>`; }).join('')}
        <circle cx="150" cy="110" r="30" fill="var(--er-sun)" ${o(4)}/><circle cx="140" cy="104" r="4" fill="${INK}"/><circle cx="160" cy="104" r="4" fill="${INK}"/><path d="M142 118Q150 126 158 118" fill="none" ${o(3)}/>`;
      default: return `<rect width="300" height="300" fill="var(--er-sky)"/><circle cx="150" cy="120" r="56" fill="var(--er-sun)" ${o(4)}/>
        ${Array.from({ length: 12 }, (_, k) => { const a = k * Math.PI / 6; return `<path d="M${f1(150 + Math.cos(a) * 70)} ${f1(120 + Math.sin(a) * 70)}L${f1(150 + Math.cos(a) * 92)} ${f1(120 + Math.sin(a) * 92)}" stroke="var(--er-sun)" stroke-width="10" stroke-linecap="round"/>`; }).join('')}
        <circle cx="132" cy="112" r="6" fill="${INK}"/><circle cx="168" cy="112" r="6" fill="${INK}"/><path d="M134 136Q150 150 166 136" fill="none" ${o(4)}/><ellipse cx="120" cy="134" rx="9" ry="5" fill="var(--er-blush)"/><ellipse cx="180" cy="134" rx="9" ry="5" fill="var(--er-blush)"/>
        <path d="M0 240Q75 200 150 236T300 226V300H0Z" fill="var(--er-leaf)" ${o(4)}/><path d="M40 60a20 20 0 0 1 36 -4a16 16 0 0 1 20 20H36a12 12 0 0 1 4 -16Z" fill="var(--er-paper)" ${o(3)}/>`;
    }
  }

  /* ---------- stanza ---------- */
  const WX = [52, 128, 204, 280], WY = 80, FX = [58, 158, 258], FY = 236, SX = [22, 376], SY = 290;
  const slotXY = (slot) => {
    if (slot[0] === 'W') return [WX[+slot[1]], WY];
    if (slot[0] === 'F') return [FX[+slot[1]], FY];
    if (slot[0] === 'S') return [SX[+slot[1]], SY];
    if (slot === 'R') return [196, 272];
    return [356, 178];
  };
  // riquadro toccabile (coordinate della scena)
  function hitBox(o2) {
    const [x, y] = slotXY(o2.slot);
    if (o2.slot[0] === 'W') return [x - 36, y - 36, 72, 72];
    if (o2.slot[0] === 'F') return o2.kind === 'drain' ? [x - 42, y - 30, 84, 40] : [x - 44, y - 92, 88, 96];
    if (o2.slot[0] === 'S') return [x - 22, y - 50, 44, 54];
    if (o2.slot === 'R') return [x - 84, y - 22, 168, 44];
    return [322, 34, 70, 146];
  }

  function background(theme) {
    let wall = `<rect width="400" height="178" fill="var(--er-wall)"/>`;
    if (theme === 'house') { for (let y = 14; y < 170; y += 26) for (let x = (y / 26) % 2 ? 26 : 13; x < 400; x += 26) wall += `<circle cx="${x}" cy="${y}" r="2.6" fill="var(--er-wall-2)"/>`; wall += `<rect y="146" width="400" height="32" fill="var(--er-wall-3)"/><path d="M0 146H400" stroke="var(--er-trim)" stroke-width="4"/>`; }
    if (theme === 'castle') { for (let y = 0; y < 178; y += 22) { const off = (y / 22) % 2 ? 0 : 24; for (let x = -off; x < 400; x += 48) wall += `<rect x="${x + 1}" y="${y + 1}" width="46" height="20" rx="4" fill="var(--er-wall-2)" opacity=".55"/>`; } }
    if (theme === 'ship') { for (let y = 20; y < 178; y += 20) wall += `<path d="M0 ${y}H400" stroke="var(--er-wall-2)" stroke-width="2"/>`; for (let x = 60; x < 400; x += 110) wall += `<path d="M${x} 0V178" stroke="var(--er-wall-2)" stroke-width="3"/>`; }
    if (theme === 'lab') { for (let y = 0; y < 178; y += 30) for (let x = 0; x < 400; x += 30) wall += `<rect x="${x + 1.5}" y="${y + 1.5}" width="27" height="27" rx="4" fill="var(--er-wall-2)" opacity=".7"/>`; wall += `<rect y="150" width="400" height="10" fill="var(--er-trim)"/>`; }
    let floor = `<rect y="178" width="400" height="122" fill="var(--er-floor)"/>`;
    if (theme === 'house' || theme === 'ship') for (let y = 196; y < 300; y += 22) floor += `<path d="M0 ${y}H400" stroke="var(--er-floor-2)" stroke-width="2"/>`;
    if (theme === 'castle' || theme === 'lab') for (let y = 178; y < 300; y += 30) for (let x = ((y - 178) / 30) % 2 ? 0 : 30; x < 400; x += 60) floor += `<rect x="${x}" y="${y}" width="30" height="30" fill="var(--er-floor-2)" opacity=".7"/>`;
    return wall + floor + `<rect y="174" width="400" height="8" fill="var(--er-trim)" ${o(1.4)}/>`;
  }

  // dispositivo di chiusura (sul mobile o sulla porta): cosa serve per aprire
  function device(pz, x, y, s = 1) {
    if (!pz) return '';
    let b = '';
    if (HH.escape.DIGITS.has(pz.type)) {
      const n = pz.len, w = 9;
      b = `<rect x="${-n * w / 2 - 4}" y="-9" width="${n * w + 8}" height="18" rx="5" fill="var(--er-metal)" ${o(1.4)}/>` +
        Array.from({ length: n }, (_, i) => `<rect x="${f1(-n * w / 2 + i * w + .8)}" y="-6" width="${w - 1.6}" height="12" rx="2" fill="var(--er-paper)" ${o(1)}/>` + (pz.dials ? `<circle cx="${f1(-n * w / 2 + i * w + w / 2)}" cy="-12" r="3" fill="${GV(pz.dials[i])}" ${o(1)}/>` : '')).join('');
    } else if (pz.type === 'colors') b = `<rect x="-17" y="-11" width="34" height="22" rx="6" fill="var(--er-metal)" ${o(1.4)}/>` + pz.buttons.slice(0, 6).map((g, i) => `<circle cx="${-10 + (i % 3) * 10}" cy="${i < 3 ? -4 : 5}" r="3.6" fill="${GV(g)}" ${o(.9)}/>`).join('');
    else if (pz.type === 'key') b = `<circle r="10" fill="${GV(pz.g)}" ${o(1.6)}/><circle r="6.5" fill="var(--er-metal)" ${o(1)}/><path d="M0 -3.5a2.2 2.2 0 1 0 .1 0ZM-1.3 -1H1.3L2 4H-2Z" fill="${INK}"/>`;
    else if (pz.type === 'levers') b = `<rect x="-16" y="-10" width="32" height="20" rx="5" fill="var(--er-metal)" ${o(1.4)}/>` + [-8, 0, 8].map((dx, i) => `<path d="M${dx} 2V${i % 2 ? 7 : -7}" ${o(2.4)}/>`).join('');
    else if (pz.type === 'lights') b = `<rect x="-16" y="-10" width="32" height="20" rx="5" fill="var(--er-metal)" ${o(1.4)}/>` + [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${-9 + (i % 3) * 9}" cy="${i < 3 ? -4 : 4}" r="3" fill="var(--er-bulb-off)" ${o(.8)}/>`).join('');
    return `<g transform="translate(${x} ${y}) scale(${s})">${b}</g>`;
  }

  // contenuto pronto da raccogliere in un contenitore aperto
  function contentAt(view, o2, x, y, s = 0.9) {
    const L = view.L, sv = view.s, E = HH.escape;
    const id = Object.keys(L.items).find((k) => E.itemShown(sv, k) && E.itemObj(L, k) === o2.id);
    if (!id) return '';
    return `<g class="er-loot" data-take="${id}">${nest(item(L.items[id]), x - 20 * s, y - 20 * s, 40 * s, 40 * s)}<circle cx="${x}" cy="${y}" r="${24 * s}" fill="transparent"/>${sparkle(x + 16 * s, y - 16 * s, 5)}</g>`;
  }

  function furniture(o2, pz, open, view) {
    const k = o2.kind;
    if (k === 'safe') return `<rect x="-34" y="-70" width="68" height="70" rx="9" fill="var(--er-safe)" ${o()}/><rect x="-28" y="-6" width="10" height="8" rx="2" fill="var(--er-safe-2)" ${o(1.4)}/><rect x="18" y="-6" width="10" height="8" rx="2" fill="var(--er-safe-2)" ${o(1.4)}/>` +
      (open ? `<rect x="-28" y="-64" width="56" height="54" rx="5" fill="var(--er-inside)" ${o(1.6)}/><path d="M-28 -64L-46 -70V-4L-28 -10Z" fill="var(--er-safe-2)" ${o(1.6)}/>${contentAt(view, o2, 0, -36)}`
        : `<rect x="-28" y="-64" width="56" height="54" rx="5" fill="var(--er-safe-2)" ${o(1.6)}/>${hl('M-22 -58H6', 2.4)}${device(pz, 0, -34, 1.1)}<rect x="20" y="-44" width="4" height="18" rx="2" fill="var(--er-metal)" ${o(1)}/>`);
    if (k === 'chest') return `<rect x="-38" y="-46" width="76" height="46" rx="6" fill="var(--er-wood)" ${o()}/><path d="M-38 -22H38" stroke="var(--er-wood-2)" stroke-width="3"/><rect x="-30" y="-46" width="8" height="46" fill="var(--er-gold)" opacity=".8"/><rect x="22" y="-46" width="8" height="46" fill="var(--er-gold)" opacity=".8"/>` +
      (open ? `<path d="M-38 -46L-34 -84H34L38 -46Z" fill="var(--er-wood-2)" ${o()}/><rect x="-34" y="-50" width="68" height="8" fill="var(--er-inside)"/>${contentAt(view, o2, 0, -58)}`
        : `<path d="M-38 -46C-38 -66 38 -66 38 -46Z" fill="var(--er-wood-2)" ${o()}/>${hl('M-28 -54Q0 -64 26 -54', 2.4)}${device(pz, 0, -38, 1)}`);
    if (k === 'desk') return `<rect x="-44" y="-58" width="88" height="8" rx="3" fill="var(--er-wood)" ${o()}/><path d="M-38 -50V0M38 -50V0" ${o(4)}/><path d="M-38 -50V0M38 -50V0" stroke="var(--er-wood-2)" stroke-width="2.4"/>` +
      (open ? `<rect x="-34" y="-46" width="68" height="28" rx="4" fill="var(--er-wood)" ${o(1.8)}/><rect x="-30" y="-44" width="60" height="10" fill="var(--er-inside)"/>${contentAt(view, o2, 0, -50)}`
        : `<rect x="-30" y="-50" width="60" height="24" rx="4" fill="var(--er-wood)" ${o(1.8)}/>${device(pz, 0, -38, .9)}`) + `<path d="M-30 -74h18v16h-18z" fill="var(--er-g3)" ${o(1.4)} opacity=".9"/><path d="M20 -58v-10a6 6 0 0 1 12 0v10" fill="var(--er-pot)" ${o(1.4)}/>`;
    if (k === 'cabinet') return `<rect x="-32" y="-88" width="64" height="88" rx="7" fill="var(--er-cab)" ${o()}/>` +
      (open ? `<rect x="-26" y="-82" width="52" height="74" rx="4" fill="var(--er-inside)" ${o(1.4)}/><path d="M-26 -82L-42 -88V-2L-26 -8Z" fill="var(--er-cab-2)" ${o(1.6)}/><path d="M26 -82L42 -88V-2L26 -8Z" fill="var(--er-cab-2)" ${o(1.6)}/><path d="M-26 -46H26" stroke="var(--er-cab-2)" stroke-width="3"/>${contentAt(view, o2, 0, -62)}`
        : `<path d="M0 -84V-4" ${o(1.6)}/><rect x="-26" y="-82" width="22" height="74" rx="4" fill="var(--er-cab-2)" opacity=".5"/><rect x="4" y="-82" width="22" height="74" rx="4" fill="var(--er-cab-2)" opacity=".5"/>${device(pz, 0, -46, 1)}`);
    if (k === 'slide') {
      let tiles = '';
      for (let i = 0; i < 9; i++) if (i !== 8) tiles += `<rect x="${-20 + (i % 3) * 13.4}" y="${-58 + Math.floor(i / 3) * 9}" width="12" height="8" rx="1.5" fill="var(--er-g${i % 6})" opacity=".85"/>`;
      return `<path d="M-28 -24L-22 0M28 -24L22 0" ${o(3)}/><rect x="-34" y="-28" width="68" height="8" rx="3" fill="var(--er-wood)" ${o(1.8)}/>` +
        (open ? `<rect x="-26" y="-50" width="52" height="22" rx="3" fill="var(--er-wood-2)" ${o(1.8)}/><path d="M-26 -50L-20 -78H32L26 -50Z" fill="var(--er-wood)" ${o(1.8)} opacity=".9"/>${contentAt(view, o2, 0, -50)}`
          : `<rect x="-26" y="-62" width="52" height="34" rx="4" fill="var(--er-wood-2)" ${o(1.8)}/>${tiles}`);
    }
    if (k === 'simon') return `<path d="M-34 0L-30 -30M34 0L30 -30M-26 -18H26" ${o(3)}/>` + [0, 1, 2, 3, 4, 5].slice(0, pz.bars.length).map((i) => { const n = pz.bars.length, x = -30 + i * (60 / n); return `<rect x="${f1(x + 1)}" y="${f1(-58 + i * 2)}" width="${f1(60 / n - 2)}" height="${f1(28 - i * 3)}" rx="2" fill="${GV(pz.bars[i])}" ${o(1.4)}/>`; }).join('') +
      `<path d="M-32 -44H32" stroke="var(--er-wood-2)" stroke-width="2.4"/>` + (open ? `<rect x="-16" y="-30" width="32" height="12" fill="var(--er-inside)" ${o(1.4)}/>${contentAt(view, o2, 0, -76, .8)}` : '') +
      `<path d="M38 -70l8 -6M40 -60l9 -2" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M42 -76a3 3 0 1 0 .1 0" fill="${INK}"/>`;
    if (k === 'balance') {
      const st = view.s.ps[pz.id], sum = pz.weights.reduce((t, w, i) => t + (st.on[i] ? w : 0), 0);
      const ang = open ? 0 : sum > pz.target ? 10 : sum < pz.target ? -10 : 0;
      return `<path d="M-24 0H24L14 -8H-14Z" fill="var(--er-metal)" ${o(1.8)}/><path d="M0 -8V-70" ${o(4)}/><path d="M0 -8V-70" stroke="var(--er-metal)" stroke-width="2"/>` +
        `<g transform="rotate(${ang} 0 -70)"><path d="M-36 -70H36" ${o(4)}/><path d="M-36 -70l-8 22h16zM36 -70l-8 22h16z" fill="none" ${o(1.2)}/><path d="M-46 -48a10 4 0 0 0 20 0ZM26 -48a10 4 0 0 0 20 0Z" fill="var(--er-gold)" ${o(1.4)}/>` +
        `<rect x="-44" y="-62" width="16" height="13" rx="2" fill="var(--er-parcel)" ${o(1.2)}/>${txt(-36, -55.5, pz.target, 10)}</g><circle cx="0" cy="-70" r="4" fill="var(--er-gold)" ${o(1.2)}/>` + (open ? contentAt(view, o2, 0, -28, .7) : '');
    }
    if (k === 'maze') return `<path d="M-28 -20L-24 0M28 -20L24 0" ${o(3)}/><rect x="-36" y="-54" width="72" height="36" rx="5" fill="var(--er-wood)" ${o(1.8)}/><rect x="-30" y="-50" width="60" height="28" rx="3" fill="var(--er-maze)"/>` +
      `<path d="M-24 -44H0V-36M8 -50V-38H22M-30 -30H-12V-24M6 -30V-22M14 -30H24" stroke="var(--er-wood-2)" stroke-width="2.4" stroke-linecap="round"/><circle cx="-24" cy="-26" r="3.2" fill="var(--er-metal)" ${o(1)}/><circle cx="20" cy="-44" r="3.4" fill="${INK}"/>` + (open ? contentAt(view, o2, 0, -70, .8) : '');
    if (k === 'fish') return `<ellipse cx="0" cy="-12" rx="38" ry="16" fill="var(--er-metal)" ${o()}/><ellipse cx="0" cy="-12" rx="30" ry="11" fill="var(--er-water)"/>` +
      (open ? contentAt(view, o2, 0, -34, .8) : `<circle cx="6" cy="-10" r="3" fill="var(--er-gold)" class="er-glint"/>${[-18, -9, 0, 9, 18].map((x) => `<path d="M${x} -22V-2" stroke="var(--er-metal-2)" stroke-width="3" stroke-linecap="round"/>`).join('')}`);
    return '';
  }

  function panel(o2, pz, open, view) {
    const st = view.s.ps[pz.id] || {};
    let inner = '';
    if (pz.type === 'levers') inner = (st.p || []).map((p, i) => { const n = st.p.length, x = -24 + (48 / (n - 1 || 1)) * i; return `<path d="M${f1(x)} 0V${p ? -16 : 16}" ${o(3)}/><circle cx="${f1(x)}" cy="${p ? -16 : 16}" r="4.5" fill="var(--er-knob)" ${o(1.2)}/>`; }).join('') + `<rect x="-28" y="-3" width="56" height="6" rx="3" fill="var(--er-metal-2)" ${o(1)}/>`;
    if (pz.type === 'lights') { const w = pz.w, h = pz.h, c = 13; inner = (st.b || []).map((b, i) => `<circle cx="${f1(-((w - 1) * c) / 2 + (i % w) * c)}" cy="${f1(-((h - 1) * c) / 2 + Math.floor(i / w) * c)}" r="5" fill="${b || open ? 'var(--er-bulb-on)' : 'var(--er-bulb-off)'}" ${o(1)}/>`).join(''); }
    if (pz.type === 'pipes') inner = `<path d="M-30 6H-10V-10H10V12H30" fill="none" stroke="${open ? 'var(--er-water)' : 'var(--er-pipe)'}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M-30 6H-10V-10H10V12H30" fill="none" ${o(1.2)}/>${open ? '' : '<path d="M-6 -16l12 12" stroke="var(--er-paper)" stroke-width="3"/>'}`;
    if (pz.type === 'mirror') inner = `<rect x="-28" y="-4" width="10" height="8" rx="2" fill="var(--er-laser)" ${o(1)}/><path d="M-18 0H4L14 -14" fill="none" stroke="var(--er-beam)" stroke-width="2.4" ${open ? '' : 'opacity=".5"'}/><path d="M0 6L8 -6" ${o(2.4)}/><path d="M14 -24l7 6-7 6-7-6z" fill="var(--er-crystal)" ${o(1.2)}/>`;
    if (pz.type === 'shadow') inner = `<rect x="-26" y="-24" width="52" height="34" rx="3" fill="var(--er-screen)" ${o(1.2)}/>${pz.shadows.map((t, i) => toy(t, -26 + (52 / pz.shadows.length) * (i + .5), -7, .5, true, pz.flip[i])).join('')}<path d="M-6 26L0 14L6 26Z" fill="var(--er-gold)" ${o(1.2)}/>`;
    const frame = `<rect x="-34" y="-34" width="68" height="68" rx="10" fill="var(--er-panel)" ${o()}/><circle cx="-28" cy="-28" r="1.6" fill="${INK}"/><circle cx="28" cy="-28" r="1.6" fill="${INK}"/><circle cx="-28" cy="28" r="1.6" fill="${INK}"/><circle cx="28" cy="28" r="1.6" fill="${INK}"/>`;
    const lamp = `<circle cx="22" cy="-26" r="3.5" fill="${open ? 'var(--er-ok)' : 'var(--er-no)'}" ${o(1)}/>`;
    return frame + inner + lamp + (open ? contentAt(view, o2, 0, 8, .8) : '');
  }

  function clueFrame(o2) {
    const c = o2.clue, inner = nest(clueSvg(c), -30, -23, 60, 45);
    if (c.kind === 'books') return `${nest(clueSvg(c), -34, -34, 68, 51)}<rect x="-34" y="14" width="68" height="6" rx="2" fill="var(--er-wood-2)" ${o(1.4)}/>`;
    if (c.kind === 'msg') return `<rect x="-35" y="-28" width="70" height="54" rx="5" fill="var(--er-wood)" ${o()}/>${inner}<rect x="-14" y="26" width="28" height="4" rx="2" fill="var(--er-wood-2)"/>`;
    if (c.kind === 'count' || c.kind === 'table' || c.kind === 'sheet') return `<g transform="rotate(${c.kind === 'sheet' ? -3 : 2})"><rect x="-33" y="-26" width="66" height="51" fill="var(--er-paper)" ${o(1.6)}/>${inner}<rect x="-8" y="-30" width="16" height="7" fill="var(--er-tape)" opacity=".85"/></g>`;
    return `<rect x="-35" y="-28" width="70" height="55" rx="4" fill="var(--er-frame)" ${o()}/>${inner}<rect x="-30" y="-23" width="60" height="45" fill="none" ${o(1)}/>`;
  }

  function hideObj(o2, open, view) {
    const k = o2.kind, it = contentAt(view, o2, 0, k === 'rug' ? -4 : -14, .8);
    if (k === 'rug') return open ? `${it}<path d="M20 -18C60 -24 90 -14 84 0C90 14 50 22 20 18C40 6 40 -8 20 -18Z" fill="var(--er-rug)" ${o()}/><path d="M20 -18C32 -6 32 8 20 18" fill="var(--er-rug-2)" ${o(1.6)}/>`
      : `<ellipse rx="82" ry="20" fill="var(--er-rug)" ${o()}/><ellipse rx="66" ry="13" fill="none" stroke="var(--er-rug-2)" stroke-width="3" stroke-dasharray="7 6"/><ellipse rx="22" ry="5" fill="var(--er-rug-2)"/>`;
    if (k === 'vase') { const v = `<path d="M-10 -40H10C10 -34 16 -26 16 -14C16 -4 10 0 0 0C-10 0 -16 -4 -16 -14C-16 -26 -10 -34 -10 -40Z" fill="var(--er-vase)" ${o()}/><path d="M-14 -16H14" stroke="var(--er-vase-2)" stroke-width="3"/><path d="M-4 -40C-8 -50 -2 -54 0 -46C2 -54 10 -50 4 -40" fill="var(--er-g0)" ${o(1.2)}/>`;
      return open ? `${it}<g transform="translate(-6 0) rotate(-62 -8 0)">${v}</g>` : v; }
    if (k === 'plant') { const p = `<path d="M-13 -22H13L10 0H-10Z" fill="var(--er-pot)" ${o()}/><path d="M0 -22C-4 -36 -16 -40 -18 -32C-12 -30 -6 -28 0 -22ZM0 -22C4 -38 16 -42 18 -34C12 -32 6 -30 0 -22ZM0 -22V-42" fill="var(--er-leaf)" ${o(1.6)}/>`;
      return open ? `${it}<g transform="translate(26 -18) rotate(18)">${p}</g>` : p; }
    if (k === 'frame') { const fr = `<rect x="-30" y="-26" width="60" height="50" rx="4" fill="var(--er-frame)" ${o()}/><rect x="-24" y="-20" width="48" height="38" fill="var(--er-canvas)"/><path d="M-24 10L-8 -6L4 6L12 -2L24 10V18H-24Z" fill="var(--er-leaf)" ${o(1.2)}/><circle cx="12" cy="-10" r="5" fill="var(--er-sun)" ${o(1)}/>`;
      return open ? `<rect x="-22" y="-18" width="44" height="34" rx="3" fill="var(--er-inside)" ${o(1.4)}/>${contentAt(view, o2, 0, 0, .8)}<g transform="rotate(28 -30 -26) translate(-6 6)">${fr}</g>` : fr; }
    if (k === 'armchair') return `<rect x="-40" y="-48" width="80" height="34" rx="14" fill="var(--er-chair)" ${o()}/><rect x="-44" y="-30" width="18" height="30" rx="8" fill="var(--er-chair-2)" ${o()}/><rect x="26" y="-30" width="18" height="30" rx="8" fill="var(--er-chair-2)" ${o()}/><rect x="-28" y="-22" width="56" height="18" rx="6" fill="var(--er-chair-2)" ${o(1.6)}/>` +
      (open ? `${contentAt(view, o2, 0, -20, .75)}<g transform="translate(18 -58) rotate(-24)"><rect x="-18" y="-8" width="36" height="16" rx="7" fill="var(--er-pillow)" ${o(1.6)}/></g>` : `<rect x="-18" y="-34" width="36" height="16" rx="7" fill="var(--er-pillow)" ${o(1.6)}/><circle cy="-26" r="2" fill="var(--er-chair)"/>`);
    return '';
  }

  function decor(o2, theme) {
    const k = o2.kind;
    if (k === 'window') {
      if (theme === 'ship') return `<circle r="28" fill="var(--er-metal)" ${o()}/><circle r="21" fill="var(--er-sky)" ${o(1.6)}/><path d="M-21 6Q-10 0 0 6T21 6V10A21 21 0 0 1 -21 10Z" fill="var(--er-water)"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${f1(Math.cos(i * Math.PI / 4) * 25)}" cy="${f1(Math.sin(i * Math.PI / 4) * 25)}" r="1.4" fill="${INK}"/>`).join('')}${hl('M-12 -12a16 16 0 0 1 10 -5', 2.4)}`;
      const top = theme === 'castle' ? `M-24 30V-8A24 24 0 0 1 24 -8V30Z` : `M-28 30V-28H28V30Z`;
      return `<path d="${top}" fill="var(--er-sky)" ${o()}/><circle cx="12" cy="-6" r="7" fill="var(--er-sun)"/><path d="M-20 16a8 8 0 0 1 14 -4a7 7 0 0 1 10 6H-20Z" fill="var(--er-paper)"/><path d="M0 -30V30M-28 2H28" stroke="var(--er-frame)" stroke-width="4"/><path d="${top}" fill="none" ${o(2.4)}/>`;
    }
    if (k === 'picture') return `<rect x="-24" y="-20" width="48" height="40" rx="4" fill="var(--er-frame)" ${o()}/><rect x="-18" y="-14" width="36" height="28" fill="var(--er-canvas)"/>${nest(HH.mascot ? HH.mascot.mini() : '<svg/>', -12, -12, 24, 24)}`;
    if (k === 'shelf') return `<rect x="-32" y="8" width="64" height="6" rx="2" fill="var(--er-wood)" ${o(1.6)}/><rect x="-24" y="-12" width="12" height="20" rx="3" fill="var(--er-jar)" ${o(1.4)}/><rect x="-6" y="-6" width="14" height="14" rx="3" fill="var(--er-g1)" ${o(1.4)}/><circle cx="20" cy="0" r="8" fill="var(--er-g2)" ${o(1.4)}/>`;
    if (k === 'garland') return `<path d="M-34 -16Q0 4 34 -16" fill="none" ${o(1.4)}/>` + [-24, -8, 8, 24].map((x, i) => `<path d="M${x - 6} ${-12 + Math.abs(x) / -6 + 4}l6 12 6-12z" fill="${GV(i)}" ${o(1.2)}/>`).join('');
    if (k === 'lamp') return `<path d="M0 0V-70" ${o(3)}/><path d="M-12 0H12" ${o(4)}/><path d="M-16 -66L-10 -88H10L16 -66Z" fill="var(--er-shade)" ${o()}/><ellipse cx="0" cy="-64" rx="18" ry="5" fill="var(--er-bulb-on)" opacity=".5"/>`;
    if (k === 'bigplant') return `<path d="M-16 -28H16L12 0H-12Z" fill="var(--er-pot)" ${o()}/><path d="M0 -28C-20 -40 -30 -64 -18 -76C-10 -60 -6 -46 0 -28ZM0 -28C18 -44 30 -70 16 -82C8 -64 4 -48 0 -28ZM0 -28C-2 -50 0 -70 2 -86" fill="var(--er-leaf)" ${o(1.6)}/>`;
    return '';
  }

  function door(o2, pz, open, theme, view) {
    const exit = o2.kind === 'exit';
    const shape = theme === 'castle' ? 'M326 178V70A30 30 0 0 1 386 70V178Z' : theme === 'ship' ? 'M326 178V58Q326 40 344 40H368Q386 40 386 58V178Z' : 'M326 178V44H386V178Z';
    const frame = `<path d="${shape}" fill="${open ? 'var(--er-outside)' : 'var(--er-door)'}" ${o(2.4)}/>`;
    let body;
    if (open) body = `${exit ? `<circle cx="356" cy="100" r="40" fill="var(--er-glow)" class="er-glowing"/>` : ''}<path d="M326 178V44L312 52V174Z" fill="var(--er-door)" ${o(2)}/>${exit ? sparkle(340, 70, 6) + sparkle(372, 120, 5) : ''}`;
    else body = (theme === 'lab' ? `<path d="M356 44V178" stroke="var(--er-door-2)" stroke-width="3"/><path d="M326 150H386" stroke="var(--er-warn)" stroke-width="6" stroke-dasharray="8 6"/>` :
      `<rect x="334" y="${theme === 'castle' ? 76 : 54}" width="44" height="40" rx="5" fill="var(--er-door-2)" opacity=".55"/><rect x="334" y="124" width="44" height="44" rx="5" fill="var(--er-door-2)" opacity=".55"/>`) +
      (theme === 'ship' ? [56, 168].map((y) => `<circle cx="332" cy="${y}" r="2" fill="${INK}"/><circle cx="380" cy="${y}" r="2" fill="${INK}"/>`).join('') : '') +
      device(pz, 356, 118, 1.1) + `<circle cx="378" cy="${pz && pz.type === 'key' ? 140 : 118}" r="3.4" fill="var(--er-gold)" ${o(1.2)}/>`;
    const sign = exit ? `<rect x="334" y="16" width="44" height="20" rx="6" fill="var(--er-exit)" ${o(1.8)}/><path d="M343 26H360M355 21L360 26L355 31" fill="none" stroke="var(--er-hi)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${star4(370, 26, 5)}" fill="var(--er-hi)"/>`
      : `<rect x="338" y="18" width="36" height="18" rx="6" fill="var(--er-sign)" ${o(1.6)}/>${[0, 1, 2].slice(0, view.L.rooms.length).map((i) => `<circle cx="${356 - (view.L.rooms.length - 1) * 4 + i * 8}" cy="27" r="3" fill="${i <= o2.room + 1 ? INK : 'var(--er-paper)'}" ${o(1)}/>`).join('')}`;
    return frame + body + sign;
  }

  function obj(o2, view) {
    const L = view.L, s = view.s;
    const pz = o2.pid ? L.p[o2.pid] : null;
    const open = pz ? !!s.solved[pz.id] : !!s.open[o2.id];
    if (o2.slot === 'D') return door(o2, pz, open, L.theme, view);
    const [x, y] = slotXY(o2.slot);
    let b = '';
    if (o2.role === 'lock') b = SLOTK_W.has(pz.type) ? panel(o2, pz, open, view) : furniture(o2, pz, open, view);
    else if (o2.role === 'clue') b = clueFrame(o2);
    else if (o2.role === 'hide') b = hideObj(o2, open, view);
    else b = decor(o2, L.theme);
    return `<g transform="translate(${x} ${y})">${b}</g>`;
  }
  const SLOTK_W = new Set(['levers', 'lights', 'pipes', 'mirror', 'shadow']);

  // la stanza intera; `view.hl` = elenco di oggetti da evidenziare (aiuto)
  function room(view, r) {
    const L = view.L, s = view.s, E = HH.escape;
    const objs = Object.values(L.o).filter((x) => x.room === r);
    const order = (x) => (x.slot === 'R' ? 0 : x.slot[0] === 'W' ? 1 : x.slot === 'D' ? 2 : x.slot[0] === 'F' ? 3 : 4);
    objs.sort((a, b) => order(a) - order(b));
    const dark = !E.lit(s, r);
    let out = background(L.theme);
    for (const x of objs) out += `<g class="er-obj er-k-${x.kind}${(view.hl || []).includes(x.id) ? ' er-hl' : ''}" data-o="${x.id}">${obj(x, view)}</g>`;
    if (dark) out += `<rect width="400" height="300" class="er-dark" data-room="1"/><g pointer-events="none" transform="translate(170 118) scale(1.5)" opacity=".85"><g class="er-need"><circle cx="20" cy="20" r="26" fill="var(--er-glow)"/>${item({ kind: 'lamp' }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g><g class="er-dark-stars" pointer-events="none">${[[60, 50], [150, 90], [240, 40], [300, 120], [90, 200], [200, 230]].map(([x, y], i) => `<path d="${star4(x, y, 3 + (i % 2) * 2)}" fill="var(--er-star)"/>`).join('')}</g>`;
    return out;
  }

  /* ---------- card della home (120×90) ---------- */
  function card() {
    const hari = HH.mascot ? nest(HH.mascot.mini(), 18, 44, 36, 36) : '';
    return `<svg viewBox="0 0 120 90" aria-hidden="true">
      <rect x="4" y="6" width="112" height="56" rx="12" fill="var(--er-wall)"/><rect x="4" y="54" width="112" height="30" rx="10" fill="var(--er-floor)"/>
      <path d="M78 64V24A14 14 0 0 1 106 24V64Z" fill="var(--er-outside)" ${o(2)}/><path d="M78 64V24L70 28V62Z" fill="var(--er-door)" ${o(1.8)}/>
      <circle cx="92" cy="40" r="16" fill="var(--er-glow)" class="er-a-glow"/>
      <rect x="80" y="9" width="24" height="10" rx="4" fill="var(--er-exit)" ${o(1.4)}/><path d="M85 14H95M92 11L95 14L92 17" fill="none" stroke="var(--er-hi)" stroke-width="1.8" stroke-linecap="round"/>
      <g transform="translate(46 58)"><rect x="-12" y="-14" width="24" height="14" rx="3" fill="var(--er-wood)" ${o(1.6)}/><path d="M-12 -14C-12 -24 12 -24 12 -14Z" fill="var(--er-wood-2)" ${o(1.6)}/><circle cy="-10" r="3.2" fill="var(--er-g0)" ${o(1)}/></g>
      <g transform="translate(16 18) scale(.6)"><g class="er-a-key">${keyIcon(1)}</g></g>${hari}
      <path class="er-spark" d="${star4(64, 22, 4)}" fill="var(--er-spark)"/><path class="er-spark" d="${star4(110, 50, 3)}" fill="var(--er-spark)"/>
    </svg>`;
  }

  HH.escapeArt = { gem, gemPath, glyph, toy, item, keyIcon, weightIcon, clue: clueSvg, clueInner, badge, pic, room, obj, hitBox, slotXY, device, card, sparkle, star4, nest, txt };
})(typeof globalThis !== 'undefined' ? globalThis : window);
