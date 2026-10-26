/* Fix-It House — kit di disegno condiviso dagli scenari (nessuna logica di gioco).
 * Stile: anime shoujo anni '90 — contorni prugna (--fi-ink), ombre piatte, riflessi bianchi, scintille.
 * Espone HH.fixitKit con gli helper SVG, le icone degli attrezzi (registro estendibile) e le etichette.
 * Ogni scenario (src/games/fixit-scene-*.js) si registra in HH.fixitScenes[id] — vedi fixit-scene-house.js.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const INK = 'var(--fi-ink)';
  const o = (w = 2.4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // bastone/asta con contorno: linea scura sotto, colore sopra
  const stick = (x1, y1, x2, y2, w, c) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="${w + 3}" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const leaf = (x, y, r, c, k = 1) => `<path d="M0 -6C5 -3 5 3 0 6C-5 3 -5 -3 0 -6Z" transform="translate(${x} ${y}) rotate(${r}) scale(${k})" fill="${c}" ${o(1.2 / k)}/>`;
  const star = (x, y, r, c) => `<path d="M${x} ${y - r}Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y}Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r}Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y}Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}Z" fill="${c}"/>`;
  const hl = (d, w = 2.2, op = 0.6) => `<path d="${d}" fill="none" stroke="var(--fi-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  // stellina shoujo a quattro punte
  const sparkle = (x, y, r, c = 'var(--fi-hi)', cls = '') => `<path${cls ? ` class="${cls}"` : ''} d="M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z" fill="${c}"/>`;
  const cloud = (x, y, k, cls) => `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${k})">
    <path d="M0 12a12 12 0 0 1 18 -12a16 16 0 0 1 28 6a10 10 0 0 1 2 18H2a10 10 0 0 1 -2 -12Z" fill="var(--fi-cloud)"/>
    <path d="M4 22c8 2 34 2 44 0a10 10 0 0 1-2 2H4z" fill="var(--fi-cloud-2)"/><path d="M8 18c10 3 30 3 40-1-1 3-3 6-6 6H6c-1-1-1.5-3 2-5z" fill="var(--fi-cloud-2)"/>
    ${hl('M10 6a8 8 0 0 1 8-4', 2, 0.9)}</g></g>`;
  const stormCloud = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 14a13 13 0 0 1 19 -13a17 17 0 0 1 30 6a11 11 0 0 1 2 20H2a11 11 0 0 1 -2 -13Z" fill="var(--fi-storm-2)"/>
    <path d="M4 25c10 3 36 3 46 0-1 2-2 2-3 2H5z" fill="var(--fi-storm)"/></g>`;
  const tuft = (x, y, k = 1) => `<path d="M${x - 5 * k} ${y}q${2 * k} ${-8 * k} ${3 * k} ${-10 * k}q${1 * k} ${6 * k} ${2 * k} ${10 * k}q${1 * k} ${-6 * k} ${4 * k} ${-9 * k}q${-1 * k} ${5 * k} 0 ${9 * k}" fill="var(--fi-grass-2)"/>`;
  const daisy = (x, y, c = 'var(--fi-daisy)') => `<g>${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="${x}" cy="${y - 2.6}" rx="1.4" ry="2.4" transform="rotate(${a} ${x} ${y})" fill="${c}"/>`).join('')}<circle cx="${x}" cy="${y}" r="1.4" fill="var(--fi-flower-2)"/></g>`;
  const picket = (x) => `<path d="M${x} 346V318l5 -6l5 6V346Z" fill="var(--fi-fence)" ${o(1.8)}/><path d="M${x + 7} 318V345" stroke="var(--fi-fence-2)" stroke-width="2"/>`;

  /* Hari col caschetto dietro la sua cassetta rossa: (x, y) = angolo in alto a sinistra, ~60×70 */
  function hari(x, y) {
    const T = (dx, dy) => `${x + dx} ${y + dy}`;
    return `<g class="fi-hari">${HH.mascot.mini().replace('<svg class="mini-hari"', `<svg x="${x}" y="${y}" width="60" height="60"`)}
      <path d="M${T(13, 18)}Q${T(14, 0)} ${T(30, 0)}Q${T(46, 0)} ${T(47, 18)}Z" fill="var(--fi-helmet)" ${o(2)}/><rect x="${x + 8}" y="${y + 16}" width="44" height="6" rx="3" fill="var(--fi-helmet-2)" ${o(1.8)}/>
      <path d="M${T(30, 0)}v18" stroke="var(--fi-helmet-2)" stroke-width="2.4"/>${hl(`M${T(18, 12)}q1-6 6-9`, 1.8, 0.8)}
      <rect x="${x + 2}" y="${y + 52}" width="56" height="20" rx="4" fill="var(--fi-box)" ${o(2)}/><path d="M${T(18, 52)}v-5h24v5" fill="none" ${o(2.2)}/>
      <rect x="${x + 2}" y="${y + 52}" width="56" height="6" fill="var(--fi-box-2)"/><rect x="${x + 25}" y="${y + 56}" width="10" height="5" rx="1.5" fill="var(--fi-metal)" ${o(1.3)}/>${hl(`M${T(7, 63)}h18`, 1.6, 0.6)}</g>`;
  }

  /* ---------- etichette (inglese finché non arrivano le traduzioni) ---------- */
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN_TOOL = {
    hammer: 'Hammer', tile: 'Roof tile', brush: 'Chimney brush', matches: 'Matches', saw: 'Saw', pane: 'Glass pane',
    curtain: 'Curtain', trowel: 'Trowel', roller: 'Paint roller', valve: 'Valve wheel', wrench: 'Wrench', mop: 'Mop',
    fuse: 'Power switch', screwdriver: 'Screwdriver', bulb: 'Light bulb', rake: 'Rake', seeds: 'Flowers',
  };
  const toolName = (t) => label('fit_' + t, EN_TOOL[t] || t);

  /* ---------- icone degli attrezzi (viewBox 40×40); gli scenari ne aggiungono con addTool ---------- */
  const TOOL_SVG = {
    hammer: `${stick(20, 36, 20, 16, 5, 'var(--fi-wood)')}<path d="M8 9H28Q34 9 34 15V17H8Z" fill="var(--fi-metal)" ${o(2)}/><path d="M8 9V17" ${o(2)}/>`,
    tile: `<path d="M7 12H33V22A13 13 0 0 1 7 22Z" fill="var(--fi-roof)" ${o(2)}/><path d="M12 22A8 8 0 0 0 28 22" fill="none" stroke="var(--fi-roof-2)" stroke-width="2.4" stroke-linecap="round"/>`,
    brush: `${stick(20, 37, 20, 20, 4, 'var(--fi-wood)')}<path d="M20 4L22 9L27 6L25 11L31 12L26 15L29 19L23 18L20 22L17 18L11 19L14 15L9 12L15 11L13 6L18 9Z" fill="var(--fi-bristle)" ${o(1.8)}/>`,
    matches: `<rect x="6" y="22" width="24" height="13" rx="3" fill="var(--fi-roof)" ${o(2)}/><rect x="10" y="26" width="16" height="5" rx="2" fill="var(--fi-wall)"/>${stick(20, 26, 29, 11, 3, 'var(--fi-wood)')}<circle cx="29.5" cy="10" r="3.4" fill="var(--fi-valve)" ${o(1.6)}/><path d="M30 1C34 4 35 7 31 9C33 6 30 5 30 1Z" fill="var(--fi-fire)"/>`,
    saw: `<path d="M5 15H27V25L24.5 28L22 25L19.5 28L17 25L14.5 28L12 25L9.5 28L7 25L5 27Z" fill="var(--fi-metal)" ${o(2)}/><rect x="26" y="11" width="10" height="18" rx="4" fill="var(--fi-wood)" ${o(2)}/><rect x="29" y="15" width="4" height="8" rx="2" fill="var(--fi-ink)"/>`,
    pane: `<rect x="8" y="6" width="24" height="28" rx="3" fill="var(--fi-glass)" ${o(2)}/><path d="M13 16L19 10M13 24L25 12" stroke="var(--fi-glass-2)" stroke-width="2.4" stroke-linecap="round"/>`,
    curtain: `<path d="M9 10Q14 22 10 34H19Q18 22 20 10Z" fill="var(--fi-curtain)" ${o(1.8)}/><path d="M31 10Q26 22 30 34H21Q22 22 20 10Z" fill="var(--fi-curtain-2)" ${o(1.8)}/>${stick(5, 9, 35, 9, 2.5, 'var(--fi-wood)')}`,
    trowel: `${stick(25, 16, 34, 7, 4, 'var(--fi-wood)')}<path d="M5 33L16 13L28 25Z" fill="var(--fi-metal)" ${o(2)}/><path d="M12 25L19 21" stroke="var(--fi-glass-2)" stroke-width="2" stroke-linecap="round"/>`,
    roller: `<path d="M31 13H35V22H20V28" fill="none" ${o(2.4)}/><rect x="6" y="7" width="26" height="11" rx="5.5" fill="var(--fi-roof)" ${o(2)}/><rect x="17" y="27" width="6" height="11" rx="2.5" fill="var(--fi-wood)" ${o(2)}/>`,
    valve: `<circle cx="20" cy="20" r="13" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="20" cy="20" r="13" fill="none" stroke="var(--fi-valve)" stroke-width="4.5"/><path d="M20 8V32M8 20H32" ${o(3)}/><circle cx="20" cy="20" r="4" fill="var(--fi-valve)" ${o(2)}/>`,
    wrench: `${stick(9, 32, 24, 17, 6, 'var(--fi-metal-2)')}<path d="M24 8A9 9 0 1 0 32 18L26 18L22 14L22 8Z" fill="var(--fi-metal)" ${o(2)}/>`,
    mop: `${stick(30, 4, 20, 24, 3.5, 'var(--fi-wood)')}<path d="M10 25H28L31 36H7Z" fill="var(--fi-glass-2)" ${o(2)}/><path d="M12 29V35M17 29V36M22 29V36M27 29V35" stroke="var(--fi-water-2)" stroke-width="1.6" stroke-linecap="round"/>`,
    fuse: `<rect x="9" y="5" width="22" height="30" rx="4" fill="var(--fi-metal)" ${o(2)}/><rect x="15" y="9" width="10" height="22" rx="3" fill="var(--fi-metal-2)"/><rect x="16" y="20" width="8" height="9" rx="2" fill="var(--fi-leaf)" ${o(1.6)}/><path d="M21 10L17 15H21L19 19" fill="none" stroke="var(--fi-spark)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    screwdriver: `${stick(19, 21, 33, 7, 2.5, 'var(--fi-metal)')}<path d="M5 33L15 23" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M5 33L15 23" stroke="var(--fi-valve)" stroke-width="7.5" stroke-linecap="round"/>`,
    bulb: `<path d="M20 5A10 10 0 0 1 26 23V26H14V23A10 10 0 0 1 20 5Z" fill="var(--fi-fire-3)" ${o(2)}/><rect x="14" y="26" width="12" height="8" rx="2.5" fill="var(--fi-metal)" ${o(2)}/><path d="M17 18Q20 13 23 18" fill="none" stroke="var(--fi-fire)" stroke-width="1.8" stroke-linecap="round"/>`,
    rake: `${stick(20, 4, 20, 25, 3.5, 'var(--fi-wood)')}<rect x="7" y="24" width="26" height="5" rx="2" fill="var(--fi-metal)" ${o(2)}/><path d="M9 29V36M15 29V36M20 29V36M25 29V36M31 29V36" ${o(2)}/>`,
    seeds: `<path d="M12 25H28L26 36H14Z" fill="var(--fi-brick)" ${o(2)}/><path d="M20 25V15" stroke="var(--fi-leaf-2)" stroke-width="2.4" stroke-linecap="round"/>${leaf(15, 20, -50, 'var(--fi-leaf)', 0.9)}${[0, 72, 144, 216, 288].map((a) => `<circle cx="${20 + 5 * Math.cos(a * Math.PI / 180)}" cy="${11 + 5 * Math.sin(a * Math.PI / 180)}" r="4" fill="var(--fi-flower-1)" ${o(1.4)}/>`).join('')}<circle cx="20" cy="11" r="3" fill="var(--fi-flower-2)"/>`,
  };
  const toolIcon = (t) => `<svg viewBox="0 0 40 40" aria-hidden="true">${TOOL_SVG[t]}</svg>`;
  function addTool(id, svg, en) { TOOL_SVG[id] = svg; EN_TOOL[id] = en; }

  HH.fixitScenes = HH.fixitScenes || {};
  HH.fixitKit = { INK, o, stick, leaf, star, hl, sparkle, cloud, stormCloud, tuft, daisy, picket, hari, label, toolName, toolIcon, addTool, TOOL_SVG };
})(typeof globalThis !== 'undefined' ? globalThis : window);
