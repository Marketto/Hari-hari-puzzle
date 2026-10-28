/* Riccio animato condiviso (SVG 100×100, colori dai token --hog-* e animazioni .hd-hog in hedgedoku.css).
 * Usato da Hedgedoku (i ricci nelle celle) e da Hari Sudoku (Hari che fa il tifo accanto alla griglia).
 *   HH.hogKit.svg()                 riccio "vivo" con tempi di respiro e ciglia casuali
 *   HH.hogKit.at(x, y, w, cls)      versione statica annidabile in un altro SVG (illustrazioni, tutorial)
 *   HH.hogKit.template()            SVG di base (in cache)
 * Gruppi animabili: g.hh-b (respiro/salti) › g.hh-h (testa, --tilt) › g.hh-look (sguardo, --lx/--ly);
 * espressioni: hh-happy, hh-squint, hh-brows, hh-m0..3 (bocche), hh-tears, hh-sweat, hh-heart, hh-blush.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  if (HH.hogKit) return;
  const f = (v) => String(Math.round(v * 10) / 10);
  function quill(cx, cy, deg, r0, len, w) {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const P = (r, o) => `${f(cx + ux * r + px * o)} ${f(cy + uy * r + py * o)}`;
    const tip = r0 + len;
    return `M${P(r0, -w / 2)}Q${P(r0 + len * 0.55, -w * 0.45)} ${P(tip - 2.5, -2)}Q${P(tip + 1.5, 0)} ${P(tip - 2.5, 2)}Q${P(r0 + len * 0.55, w * 0.45)} ${P(r0, w / 2)}Z`;
  }
  function mane(cx, cy, from, to, count, r0, len, w, jit) {
    let d = '';
    for (let i = 0; i < count; i++) d += quill(cx, cy, from + ((to - from) * i) / (count - 1), r0, len * (1 + jit * Math.sin(i * 2.3 + 1)), w);
    return d;
  }

  let hogTpl = null;
  function hogTemplate() {
    if (hogTpl) return hogTpl;
    const back = mane(50, 54, -214, 34, 13, 23, 22, 15, 0.06);
    const mid = mane(50, 54, -205, 25, 12, 22, 16, 13, 0.08);
    const eye = (cx) => `<g class="hh-eye">
        <ellipse cx="${cx}" cy="63" rx="7" ry="8.5" fill="var(--hog-eye)"/>
        <ellipse cx="${cx}" cy="66.5" rx="4.6" ry="3.4" fill="var(--hog-iris)" opacity=".85"/>
        <g class="hh-shine"><circle cx="${cx + 2.3}" cy="59.8" r="2.9" fill="var(--hog-shine)"/><circle cx="${cx - 2.4}" cy="66.6" r="1.3" fill="var(--hog-shine)"/></g>
      </g>`;
    const ear = (cx, side) => `<g class="hh-ear ${side}"><circle cx="${cx}" cy="42" r="7.5" fill="var(--hog-ear)" stroke="var(--hog-line)" stroke-width="2"/><circle cx="${cx}" cy="42.5" r="3.8" fill="var(--hog-ear-in)"/></g>`;
    hogTpl = `<svg class="mini-hari hd-hog" viewBox="0 0 100 100" aria-hidden="true" style="%ST%">
  <g class="hh-b"><g class="hh-h">
    <circle cx="50" cy="54" r="25" fill="var(--hog-q)"/>
    <path d="${back}" fill="var(--hog-q2)" stroke="var(--hog-line)" stroke-width="2" stroke-linejoin="round"/>
    <path d="${mid}" fill="var(--hog-q3)"/>
    ${ear(25, 'l')}${ear(75, 'r')}
    <ellipse cx="50" cy="62" rx="32" ry="26" fill="var(--hog-face)" stroke="var(--hog-line)" stroke-width="2.5"/>
    <path d="M38 40C42 46 46 48 50 49C54 48 58 46 62 40C58 35 42 35 38 40Z" fill="var(--hog-q3)"/>
    <g class="hh-look">
      <g class="hh-eyes">${eye(39)}${eye(61)}</g>
      <g class="hh-happy" fill="none" stroke="var(--hog-eye)" stroke-width="3.4" stroke-linecap="round"><path d="M32.5 65q6.5 -9 13 0"/><path d="M54.5 65q6.5 -9 13 0"/></g>
      <g class="hh-squint" fill="none" stroke="var(--hog-eye)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M34 58.5l8 4.5l-8 4.5"/><path d="M66 58.5l-8 4.5l8 4.5"/></g>
    </g>
    <g class="hh-brows" fill="none" stroke="var(--hog-line)" stroke-width="2.4" stroke-linecap="round"><path d="M32 52.5l9 -3.5"/><path d="M68 52.5l-9 -3.5"/></g>
    <g class="hh-blush"><ellipse cx="26.5" cy="72" rx="6.5" ry="3.8" fill="var(--hog-blush)"/><ellipse cx="73.5" cy="72" rx="6.5" ry="3.8" fill="var(--hog-blush)"/></g>
    <g class="hh-snout">
      <ellipse cx="50" cy="71" rx="3.3" ry="2.4" fill="var(--hog-nose)"/>
      <path class="hh-m hh-m0" d="M45.5 75.5q2.25 3 4.5 0q2.25 3 4.5 0" fill="none" stroke="var(--hog-nose)" stroke-width="1.8" stroke-linecap="round"/>
      <path class="hh-m hh-m1" d="M44 75q6 8.5 12 0z" fill="var(--hog-mouth)" stroke="var(--hog-nose)" stroke-width="1.6" stroke-linejoin="round"/>
      <ellipse class="hh-m hh-m2" cx="50" cy="78.5" rx="4.2" ry="3.8" fill="var(--hog-mouth)" stroke="var(--hog-nose)" stroke-width="1.6"/>
      <path class="hh-m hh-m3" d="M44.5 78q2.75 -2.6 5.5 0q2.75 2.6 5.5 0" fill="none" stroke="var(--hog-nose)" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <g class="hh-tears" fill="var(--hog-tear)" stroke="var(--hog-tear-line)" stroke-width="1">
      <path class="hh-tear" d="M33 70c-2.6 4.2 -2.6 6.6 0 7.6c2.6 -1 2.6 -3.4 0 -7.6z"/>
      <path class="hh-tear r" d="M67 70c-2.6 4.2 -2.6 6.6 0 7.6c2.6 -1 2.6 -3.4 0 -7.6z"/>
    </g>
    <g transform="translate(83 47)"><g class="hh-sweat"><path d="M0 -7c3.4 5 4.6 8 0 10.4c-4.6 -2.4 -3.4 -5.4 0 -10.4z" fill="var(--hog-tear)" stroke="var(--hog-tear-line)" stroke-width="1.2"/></g></g>
  </g></g>
  <g transform="translate(78 22)"><g class="hh-heart"><path d="M0 7C-9 1 -8 -6 -3.6 -6.4C-1.6 -6.6 -.4 -5.4 0 -4C.4 -5.4 1.6 -6.6 3.6 -6.4C8 -6 9 1 0 7z" fill="var(--hog-heart)" stroke="var(--hog-heart-line)" stroke-width="1.2"/></g></g>
</svg>`;
    return hogTpl;
  }
  // Ogni riccio ha tempi suoi: respiro e ciglia non vanno all'unisono
  function hogSvg() {
    const R = Math.random;
    const st = `--bk:${(-R() * 6).toFixed(2)}s;--bkd:${(3.8 + R() * 2.8).toFixed(2)}s;--br:${(-R() * 3.4).toFixed(2)}s;--brd:${(2.9 + R() * 0.9).toFixed(2)}s`;
    return hogTemplate().replace('%ST%', st);
  }
  // versione statica per le illustrazioni (niente stile casuale)
  const hogAt = (x, y, w, cls = '') => hogTemplate().replace('<svg class="mini-hari hd-hog"', `<svg class="hd-hog ${cls}" x="${x}" y="${y}" width="${w}" height="${w}"`).replace(' style="%ST%"', '');

  HH.hogKit = { svg: hogSvg, at: hogAt, template: hogTemplate };
})(typeof globalThis !== 'undefined' ? globalThis : window);
