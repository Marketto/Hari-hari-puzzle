/* Hari, il riccio mascotte (v2, dettagliata). SVG generato da codice, stesso disegno usato per le icone.
 *
 * HH.mascot.svg({ cls }) -> SVG 240×240. Classi animabili (vedi styles.css):
 *   .hari-body    respiro / salto          .hari-quills  ondeggio degli aculei
 *   .hari-eye     battito di ciglia        .hari-shine   riflessi che seguono il dito
 *   .hari-happy   occhi ^^ (con .happy)    .hari-sweat   goccia (con .oops)
 *   .hari-sad     bocca all'ingiù, lacrima, sopracciglia (con .sad)
 *   .hari-ear     orecchie che si muovono  .hari-flower  fiore di sakura
 *   .hari-twinkle stelline intorno
 * HH.mascot.mini() -> riccio piccolo per le celle (stringa in cache).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const OUT = '#6b402c';      // contorno cacao
  const EYE = '#24110a';
  const f = (n) => String(Math.round(n * 10) / 10);

  // Aculeo morbido con punta arrotondata, base su un cerchio di raggio r0
  function quill(cx, cy, deg, r0, len, w) {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const P = (r, o) => `${f(cx + ux * r + px * o)} ${f(cy + uy * r + py * o)}`;
    const tip = r0 + len;
    return `M${P(r0, -w / 2)}Q${P(r0 + len * 0.55, -w * 0.45)} ${P(tip - 2.5, -2)}Q${P(tip + 1.5, 0)} ${P(tip - 2.5, 2)}Q${P(r0 + len * 0.55, w * 0.45)} ${P(r0, w / 2)}Z`;
  }
  function mane(cx, cy, from, to, count, r0, len, w, jit) {
    let d = '';
    for (let i = 0; i < count; i++) {
      const deg = from + ((to - from) * i) / (count - 1);
      d += quill(cx, cy, deg, r0, len * (1 + jit * Math.sin(i * 2.3 + 1)), w);
    }
    return d;
  }
  // Riflessi chiari lungo gli aculei
  function streaks(cx, cy, from, to, count, r0, len) {
    let d = '';
    for (let i = 0; i < count; i++) {
      const a = ((from + ((to - from) * i) / (count - 1)) * Math.PI) / 180;
      const ux = Math.cos(a), uy = Math.sin(a), px = -uy * 2.5, py = ux * 2.5;
      d += `M${f(cx + ux * (r0 + 7) - px)} ${f(cy + uy * (r0 + 7) - py)}L${f(cx + ux * (r0 + len * 0.7) - px)} ${f(cy + uy * (r0 + len * 0.7) - py)}`;
    }
    return d;
  }
  const star4 = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
  function sakura(r) {
    const petal = `M0 0C${f(-r * 0.6)} ${f(-r * 0.3)} ${f(-r * 0.55)} ${f(-r * 0.95)} ${f(-r * 0.2)} ${f(-r)}L0 ${f(-r * 0.8)}L${f(r * 0.2)} ${f(-r)}C${f(r * 0.55)} ${f(-r * 0.95)} ${f(r * 0.6)} ${f(-r * 0.3)} 0 0Z`;
    return [0, 72, 144, 216, 288].map((d) => `<path d="${petal}" transform="rotate(${d})" fill="#ffc2d4" stroke="#ff86a8" stroke-width="1.2" stroke-linejoin="round"/>`).join('') +
      [0, 72, 144, 216, 288].map((d) => `<path d="M0 0L0 ${f(-r * 0.45)}" transform="rotate(${d})" stroke="#ff86a8" stroke-width="1" stroke-linecap="round"/>`).join('') +
      `<circle r="${f(r * 0.24)}" fill="#ffe27a" stroke="#f0b43c" stroke-width="1"/>`;
  }

  function eye(cx, cy, s, id) {
    return `<g class="hari-eye">
      <ellipse cx="${cx}" cy="${cy}" rx="18.5" ry="22.5" fill="${EYE}"/>
      <ellipse cx="${cx}" cy="${cy + 1}" rx="16" ry="20" fill="url(#${id}i)"/>
      <ellipse cx="${cx}" cy="${cy - 1}" rx="8.5" ry="11" fill="#170804"/>
      <ellipse cx="${cx}" cy="${cy + 12.5}" rx="10" ry="4.5" fill="#ffc48a" opacity=".5"/>
      <path d="M${cx - 18.5} ${cy - 2}C${cx - 17} ${cy - 27} ${cx + 17} ${cy - 27} ${cx + 18.5} ${cy - 2}" fill="none" stroke="${EYE}" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M${cx + s * 15} ${cy - 15}l${s * 7} ${-5}M${cx + s * 18} ${cy - 8}l${s * 8} ${-2}" stroke="${EYE}" stroke-width="3" stroke-linecap="round"/>
      <g class="hari-shine">
        <ellipse cx="${cx + 6}" cy="${cy - 9}" rx="7" ry="8.5" fill="#fff"/>
        <circle cx="${cx - 7}" cy="${cy + 9}" r="3.6" fill="#fff"/>
        <circle cx="${cx + 8.5}" cy="${cy + 7}" r="1.8" fill="#fff" opacity=".9"/>
        <path d="${star4(cx - 8, cy - 11, 3.4)}" fill="#fff" opacity=".85"/>
      </g>
    </g>`;
  }

  function svg(opts = {}) {
    const cls = opts.cls || 'hari';
    const id = 'h' + Math.random().toString(36).slice(2, 8);
    const CX = 120, CY = 114;
    const back = mane(CX, CY, -214, 34, 20, 58, 46, 31, 0.07);
    const mid = mane(CX, CY, -207, 27, 19, 55, 35, 27, 0.1);
    const hi = streaks(CX, CY, -207, 27, 19, 55, 35);
    const blushLines = (x, y) => [-7, 0, 7].map((o) => `M${x + o - 2} ${y + 3}l4 -6`).join('');
    const toes = (x, y) => `<ellipse cx="${x}" cy="${y + 2}" rx="6" ry="4.2" fill="#ffa9bd"/>` +
      [-7.5, 0, 7.5].map((o) => `<circle cx="${x + o}" cy="${y - 5 + Math.abs(o) / 5}" r="2.5" fill="#ffa9bd"/>`).join('');
    return `<svg class="${cls}" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hari">
  <defs>
    <linearGradient id="${id}qb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f5a3b"/><stop offset="1" stop-color="#5c3624"/></linearGradient>
    <radialGradient id="${id}qm" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#d09670"/><stop offset=".7" stop-color="#a36a48"/><stop offset="1" stop-color="#8a5636"/></radialGradient>
    <radialGradient id="${id}f" cx="50%" cy="32%" r="72%"><stop offset="0" stop-color="#fffbf5"/><stop offset=".6" stop-color="#ffead6"/><stop offset="1" stop-color="#f8d1b2"/></radialGradient>
    <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f0d07"/><stop offset=".5" stop-color="#4c2615"/><stop offset="1" stop-color="#c9773f"/></linearGradient>
    <radialGradient id="${id}bl"><stop offset="0" stop-color="#ff8fab" stop-opacity=".85"/><stop offset="1" stop-color="#ff8fab" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}b" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#fff7ee"/><stop offset="1" stop-color="#f6cfae"/></radialGradient>
    <radialGradient id="${id}s" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#ff8da2"/><stop offset="1" stop-color="#e2365a"/></radialGradient>
  </defs>
  <!--tw--><g class="hari-twinkles">
    <path class="hari-twinkle" d="${star4(24, 72, 9)}" fill="#ffd36e"/>
    <path class="hari-twinkle" d="${star4(218, 44, 7)}" fill="#ffb3c9" style="animation-delay:-.8s"/>
    <path class="hari-twinkle" d="${star4(216, 160, 8)}" fill="#ffd36e" style="animation-delay:-1.6s"/>
    <path class="hari-twinkle" d="${star4(28, 176, 5.5)}" fill="#9fdcff" style="animation-delay:-1.1s"/>
  </g><!--/tw-->
  <ellipse class="hari-shadow" cx="120" cy="233" rx="64" ry="6" fill="#4a2f27" opacity=".16"/>
  <g class="hari-body">
    <g class="hari-quills">
      <circle cx="${CX}" cy="${CY}" r="64" fill="#8a5838"/>
      <path d="${back}" fill="url(#${id}qb)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="${mid}" fill="url(#${id}qm)" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round" stroke-opacity=".7"/>
      <path d="${hi}" stroke="#ecc19c" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>
    </g>
    <g class="hari-feet">
      <ellipse cx="90" cy="222" rx="18" ry="11" fill="#ffd9bd" stroke="${OUT}" stroke-width="2.6"/>
      <ellipse cx="150" cy="222" rx="18" ry="11" fill="#ffd9bd" stroke="${OUT}" stroke-width="2.6"/>
      ${toes(90, 223)}${toes(150, 223)}
    </g>
    <ellipse cx="120" cy="194" rx="47" ry="34" fill="url(#${id}b)" stroke="${OUT}" stroke-width="3"/>
    <g class="hari-ear"><circle cx="63" cy="84" r="17" fill="#ffe4cc" stroke="${OUT}" stroke-width="3"/><circle cx="63" cy="85" r="9" fill="#ffb0c3"/></g>
    <g class="hari-ear r"><circle cx="177" cy="84" r="17" fill="#ffe4cc" stroke="${OUT}" stroke-width="3"/><circle cx="177" cy="85" r="9" fill="#ffb0c3"/></g>
    <ellipse cx="120" cy="137" rx="76" ry="60" fill="url(#${id}f)" stroke="${OUT}" stroke-width="3"/>
    <path d="M86 82C92 92 98 96 104 93C108 100 114 105 120 106C126 105 132 100 136 93C142 96 148 92 154 82C142 70 98 70 86 82Z" fill="url(#${id}qm)"/>
    <path d="M86 82C92 92 98 96 104 93C108 100 114 105 120 106C126 105 132 100 136 93C142 96 148 92 154 82" fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M110 84l4 12M128 84l-3 11" stroke="#ecc19c" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="62" cy="164" rx="18" ry="11" fill="url(#${id}bl)"/>
    <ellipse cx="178" cy="164" rx="18" ry="11" fill="url(#${id}bl)"/>
    <path d="${blushLines(62, 164)}${blushLines(178, 164)}" stroke="#ff7095" stroke-width="2" stroke-linecap="round" opacity=".75"/>
    ${eye(91, 135, -1, id)}
    ${eye(149, 135, 1, id)}
    <g class="hari-happy" fill="none" stroke="${EYE}" stroke-width="5.5" stroke-linecap="round">
      <path d="M76 140Q91 120 106 140"/><path d="M134 140Q149 120 164 140"/>
    </g>
    <ellipse cx="120" cy="158" rx="7.5" ry="5.5" fill="#3a1e14"/>
    <ellipse cx="117.5" cy="156.4" rx="2.6" ry="1.6" fill="#fff" opacity=".85"/>
    <g class="hari-mouth">
      <path d="M110 167Q120 181 130 167Q120 171 110 167Z" fill="#b84358" stroke="#3a1e14" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="120" cy="172.5" rx="4" ry="2.2" fill="#ff9fb2"/>
    </g>
    <g class="hari-sad">
      <path d="M110 174Q120 164 130 174" fill="none" stroke="#3a1e14" stroke-width="3" stroke-linecap="round"/>
      <path d="M77 156C74 163 74 168 78 170C82 168 82 163 77 156Z" fill="#a8dcff" stroke="#5aa6d6" stroke-width="1.6"/>
      <path d="M71 107l17 -7M169 107l-17 -7" stroke="#6b402c" stroke-width="3.2" stroke-linecap="round"/>
    </g>
    <g class="hari-berry">
      <path d="M120 222C104 215 102 197 109 191C114 187 126 187 131 191C138 197 136 215 120 222Z" fill="url(#${id}s)" stroke="#a5223f" stroke-width="2" stroke-linejoin="round"/>
      <path d="M113 196q-2 6 0 12" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
      ${[[115, 200], [125, 199], [120, 207], [112, 210], [128, 208], [120, 215]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry="1.9" fill="#ffe7a0"/>`).join('')}
      <path d="M120 194L111 187L117 188L115 181L120 186L125 181L123 188L129 187Z" fill="#74cc8e" stroke="#3f8f5c" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M120 185q1 -5 3 -7" stroke="#3f8f5c" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    </g>
    <g class="hari-paws">
      <ellipse cx="104" cy="200" rx="9" ry="8" fill="#ffe4cc" stroke="${OUT}" stroke-width="2.4" transform="rotate(-15 104 200)"/>
      <ellipse cx="136" cy="200" rx="9" ry="8" fill="#ffe4cc" stroke="${OUT}" stroke-width="2.4" transform="rotate(15 136 200)"/>
      <path d="M101 194v3.5M106 194.5v3.5M134 194.5v3.5M139 194v3.5" stroke="${OUT}" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <g transform="translate(174 58)"><g class="hari-flower">
      <path d="M-14 6q-9 -2 -12 6q8 3 12 -6Z" fill="#8fd6a2" stroke="#4f9e69" stroke-width="1.2"/>
      ${sakura(13)}
    </g></g>
    <g transform="translate(196 108)"><g class="hari-sweat">
      <path d="M0 -12C5 -3 8 3 0 8C-8 3 -5 -3 0 -12Z" fill="#a8dcff" stroke="#5aa6d6" stroke-width="2"/>
      <ellipse cx="-2" cy="1" rx="1.6" ry="3" fill="#fff" opacity=".8"/>
    </g></g>
  </g>
</svg>`;
  }

  // Riccio piccolo e semplificato per le celle di Hedgedoku
  let miniCache = null;
  function mini() {
    if (miniCache) return miniCache;
    const back = mane(50, 54, -214, 34, 13, 23, 22, 15, 0.06);
    const mid = mane(50, 54, -205, 25, 12, 22, 16, 13, 0.08);
    const eyeM = (cx) => `<ellipse cx="${cx}" cy="63" rx="7" ry="8.5" fill="${EYE}"/>
      <ellipse cx="${cx}" cy="66.5" rx="4.6" ry="3.4" fill="#8a4a28" opacity=".85"/>
      <circle cx="${cx + 2.3}" cy="59.8" r="2.9" fill="#fff"/><circle cx="${cx - 2.4}" cy="66.6" r="1.3" fill="#fff"/>`;
    miniCache = `<svg class="mini-hari" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="54" r="25" fill="#8a5838"/>
  <path d="${back}" fill="#714330" stroke="#55301f" stroke-width="2" stroke-linejoin="round"/>
  <path d="${mid}" fill="#ad7350"/>
  <circle cx="25" cy="42" r="7.5" fill="#ffe4cc" stroke="#55301f" stroke-width="2"/><circle cx="25" cy="42.5" r="3.8" fill="#ffadc0"/>
  <circle cx="75" cy="42" r="7.5" fill="#ffe4cc" stroke="#55301f" stroke-width="2"/><circle cx="75" cy="42.5" r="3.8" fill="#ffadc0"/>
  <ellipse cx="50" cy="62" rx="32" ry="26" fill="#fff1e2" stroke="#55301f" stroke-width="2.5"/>
  <path d="M38 40C42 46 46 48 50 49C54 48 58 46 62 40C58 35 42 35 38 40Z" fill="#ad7350"/>
  ${eyeM(39)}${eyeM(61)}
  <ellipse cx="26.5" cy="72" rx="6.5" ry="3.8" fill="#ff9fb8" opacity=".75"/><ellipse cx="73.5" cy="72" rx="6.5" ry="3.8" fill="#ff9fb8" opacity=".75"/>
  <ellipse cx="50" cy="71" rx="3.3" ry="2.4" fill="#3a1e14"/>
  <path d="M45.5 75.5q2.25 3 4.5 0q2.25 3 4.5 0" fill="none" stroke="#3a1e14" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
    return miniCache;
  }

  HH.mascot = { svg, mini };
})(typeof globalThis !== 'undefined' ? globalThis : window);
