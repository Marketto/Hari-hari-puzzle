/* Fix-It House — scenario "giardino" (all'aperto: serra di vetro, vialetto col cancelletto, albero con l'altalena).
 * Contratto dello scenario: vedi il commento in cima a fixit-scene-house.js.
 * Il temporale (fi-storm / fi-weather / fi-gloom) si dirada man mano che si ripara; a fine livello spunta l'arcobaleno.
 * Attrezzi nuovi registrati qui: pot (vaso di terracotta), rope (corda arrotolata), can (annaffiatoio).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const K = HH.fixitKit;
  const { INK, o, stick, leaf, star, hl, sparkle, cloud, stormCloud, tuft, daisy, hari } = K;

  /* ---------- attrezzi nuovi ---------- */
  K.addTool('pot', `<path d="M11 15H29L26.5 35H13.5Z" fill="var(--fi-garden-terra)" ${o(2)}/><path d="M24 16L22 34.5H26.3L28.5 16Z" fill="var(--fi-ink)" opacity=".12"/>` +
    `<rect x="8" y="9" width="24" height="7.5" rx="2.6" fill="var(--fi-garden-terra-2)" ${o(2)}/>` +
    `<path d="M20 31c-3 -2 -5 -4 -5 -6a2.5 2.5 0 0 1 5 -1a2.5 2.5 0 0 1 5 1c0 2 -2 4 -5 6z" fill="var(--fi-flower-1)" ${o(1.1)}/>${hl('M14 19L15.6 31', 1.8, 0.7)}${hl('M11 12H17', 1.6, 0.7)}`, 'Flower pot');
  const coil = 'M19 21a2 2 0 0 1 4 0a4 4 0 0 1 -8 0a6 6 0 0 1 12 0a8 8 0 0 1 -16 0a10 10 0 0 1 20 0Q33 30 29 36';
  K.addTool('rope', `<path d="${coil}" fill="none" stroke="${INK}" stroke-width="6.4" stroke-linecap="round"/>` +
    `<path d="${coil}" fill="none" stroke="var(--fi-garden-rope)" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="${coil}" fill="none" stroke="var(--fi-garden-rope-2)" stroke-width="1.3" stroke-dasharray="2 3" stroke-linecap="round"/>` +
    `<path d="M29 36l-3 2.6M29 36l0 3.4M29 36l3 2.4" stroke="var(--fi-garden-rope-2)" stroke-width="1.6" stroke-linecap="round"/>`, 'Rope');
  K.addTool('can', `<path d="M14 17Q16 7 22 8Q28 9 26 17" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M14 17Q16 7 22 8Q28 9 26 17" fill="none" stroke="var(--fi-garden-can-2)" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M24 29L34 16" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M24 29L34 16" stroke="var(--fi-garden-can)" stroke-width="3" stroke-linecap="round"/>` +
    `<rect x="31.5" y="11" width="7" height="5" rx="2" transform="rotate(38 35 13.5)" fill="var(--fi-garden-can-2)" ${o(1.6)}/>` +
    `<path d="M7 17H27V32Q27 35 24 35H10Q7 35 7 32Z" fill="var(--fi-garden-can)" ${o(2)}/><path d="M7.8 22H26.2V25H7.8Z" fill="var(--fi-garden-can-2)"/>` +
    `<path d="M17 31c-2.4 -1.6 -4 -3 -4 -4.6a2 2 0 0 1 4 -.8a2 2 0 0 1 4 .8c0 1.6 -1.6 3 -4 4.6z" fill="var(--fi-flower-1)"/>${hl('M10 19V31', 1.8, 0.7)}` +
    `<path d="M38 19q2 3 0 4.4q-2 -1.4 0 -4.4zM35 23q2 3 0 4.4q-2 -1.4 0 -4.4z" fill="var(--fi-water)" ${o(1)}/>`, 'Watering can');

  /* ---------- zone toccabili (400×400) ---------- */
  const SPOT = {
    glass: [14, 146, 48, 54], pots: [72, 202, 58, 52], lantern: [132, 142, 44, 54], gate: [180, 200, 62, 50],
    swing: [250, 168, 64, 86], birdhouse: [330, 166, 52, 52],
    seedlings: [14, 266, 80, 50], tap: [98, 256, 44, 48], trunk: [130, 290, 116, 46], leaves: [288, 262, 74, 50],
    hose: [154, 344, 56, 46], water: [252, 330, 76, 52],
  };
  // ordine di disegno: prima ciò che sta dietro (fondo, alto), poi il primo piano
  const LAYERS = ['glass', 'pots', 'lantern', 'gate', 'swing', 'birdhouse', 'leaves', 'seedlings', 'water',
    '@hose', 'tap', 'hose', 'trunk'];

  /* ---------- piccoli disegni ---------- */
  const T = 'var(--fi-garden-terra)', T2 = 'var(--fi-garden-terra-2)';
  // vaso di terracotta: (x, y) = centro del fondo
  const pot = (x, y, k = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${k})">` +
    `<path d="M-7 -13H7L5.4 0H-5.4Z" fill="${T}" ${o(1.6 / k)}/><path d="M3 -12.5L1.8 -.6H5.3L6.6 -12.5Z" fill="var(--fi-ink)" opacity=".12"/>` +
    `<rect x="-8.6" y="-17" width="17.2" height="5" rx="1.8" fill="${T2}" ${o(1.6 / k)}/>${hl('M-4.5 -10L-3.7 -2.5', 1.4 / k, 0.7)}</g>`;
  // (la classe d'animazione va su un <g> esterno: il transform CSS sovrascriverebbe l'attributo transform)
  const sprout = (x, y, k = 1, cls = '') => `<g${cls ? ` class="${cls}"` : ''}><g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0V-9" stroke="var(--fi-leaf-2)" stroke-width="2" stroke-linecap="round"/>` +
    `${leaf(-3.6, -9.5, -60, 'var(--fi-leaf)', 0.8)}${leaf(3.6, -10.5, 60, 'var(--fi-leaf)', 0.8)}</g></g>`;
  const petals = (x, y, c, r = 3.6, d = 4.4) => [0, 72, 144, 216, 288].map((a) =>
    `<circle cx="${(x + d * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(y + d * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="${r}" fill="${c}" ${o(1.1)}/>`).join('') +
    `<circle cx="${x}" cy="${y}" r="${r * 0.8}" fill="var(--fi-flower-2)" ${o(1)}/>`;
  // fiore dell'aiuola: dritto oppure appassito (testa che pende)
  const flower = (x, base, h, c, droop, d = 0) => droop
    ? `<path d="M${x} ${base}Q${x + 1} ${base - h * 0.8} ${x + 9} ${base - h * 0.7}" fill="none" stroke="var(--fi-garden-dry-leaf)" stroke-width="2.2" stroke-linecap="round"/>` +
      `${leaf(x - 4, base - 6, 230, 'var(--fi-garden-dry-leaf)', 0.9)}<g transform="rotate(35 ${x + 10} ${base - h * 0.62})">${petals(x + 10, base - h * 0.62, c, 3, 3.6)}</g>`
    : `<g class="fi-sway" style="animation-delay:${d}s"><path d="M${x} ${base}V${base - h}" stroke="var(--fi-leaf-2)" stroke-width="2.2" stroke-linecap="round"/>` +
      `${leaf(x - 4, base - h * 0.4, -55, 'var(--fi-leaf)', 1)}${leaf(x + 4, base - h * 0.55, 55, 'var(--fi-leaf-2)', 0.9)}${petals(x, base - h, c)}</g>`;
  const heart = (x, y, k, c) => `<path d="M${x} ${y + 3 * k}c${-3 * k} ${-2.2 * k} ${-5 * k} ${-4 * k} ${-5 * k} ${-6 * k}a${2.5 * k} ${2.5 * k} 0 0 1 ${5 * k} ${-1 * k}a${2.5 * k} ${2.5 * k} 0 0 1 ${5 * k} ${1 * k}c0 ${2 * k} ${-2 * k} ${3.8 * k} ${-5 * k} ${6 * k}z" fill="${c}"/>`;
  const drop = (x, y, k = 1, extra = '') => `<path d="M${x} ${y}q${3 * k} ${4.5 * k} 0 ${7 * k}q${-3 * k} ${-2.5 * k} 0 ${-7 * k}Z" fill="var(--fi-water)" ${o(1.1)} ${extra}/>`;
  const bird = (x, y, k = 1, sad = false) => `<g transform="translate(${x} ${y}) scale(${k})">` +
    `<path d="M-9 2Q-9 -9 1 -9Q9 -9 9 0Q9 7 0 7Q-6 7 -9 2Z" fill="var(--fi-garden-bird)" ${o(1.6 / k)}/><path d="M-12 -1L-8 1L-11 4Z" fill="var(--fi-garden-bird-2)" ${o(1.2 / k)}/>` +
    `<path d="M-4 0Q0 6 5 1" fill="var(--fi-garden-bird-2)" ${o(1.2 / k)}/><path d="M9 -3L13 -1.5L9 0Z" fill="var(--fi-flower-2)" ${o(1 / k)}/>` +
    (sad ? `<path d="M3 -4.5q1.6 1.4 3 0" fill="none" ${o(1.3 / k)}/><path d="M7 -1q1 2.4 0 3.4q-1 -1 0 -3.4z" fill="var(--fi-water)"/>`
      : `<circle cx="4.5" cy="-3.5" r="1.6" fill="var(--fi-ink)"/><circle cx="5" cy="-4" r=".55" fill="var(--fi-hi)"/>`) +
    `<ellipse cx="6" cy="0" rx="1.6" ry="1" fill="var(--fi-flower-1)" opacity=".7"/><path d="M-2 7v3M2 7v3" ${o(1.2 / k)}/></g>`;

  /* ---------- guasti ---------- */
  const HOSE = 'M131 281C138 306 118 334 146 352C166 366 196 378 222 368C240 362 250 352 262 347';
  const DRAW = {
    // vetro della serra (riquadro in alto a sinistra 16..44 × 150..200)
    glass(st) {
      if (st !== 'broken') {
        return `<path d="M21 172L32 158M22 192L40 170" stroke="var(--fi-glass-2)" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>` +
          (st === 'fixed' ? sparkle(38, 160, 5) + sparkle(24, 186, 3) : '');
      }
      return `<path d="M22 164L28 160L31 165L36 157L40 166L37 172L42 178L35 181L36 189L29 184L24 191L23 181L18 177L23 172Z" fill="var(--fi-hole)" ${o(1.6)}/>` +
        `<path d="M36 157L41 151M42 178L44 182M36 189L41 198M24 191L19 198M18 177L17 170M22 164L18 156M31 165L33 152" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" fill="none"/>` +
        `<path d="M27 168l3 -2l1 4ZM33 178l3 1l-2 3Z" fill="var(--fi-glass)" opacity=".7"/>` +
        `<path d="M20 262l5 -5l3 5ZM34 264l6 -4l1 5ZM46 261l3 -4l3 4Z" fill="var(--fi-glass)" ${o(1.3)}/>` +
        `<g class="fi-flutter">${leaf(48, 172, 30, 'var(--fi-leaf)', 1.1)}</g>`;
    },
    // vasi sulla mensola della serra
    pots(st) {
      const front = `<rect x="74" y="228" width="55" height="24" fill="var(--fi-glass)" opacity=".16"/>${stick(102, 201, 102, 251, 3, 'var(--fi-garden-frame)')}`;
      if (st !== 'broken') {
        return pot(87, 232) + `<g class="fi-sway">${petals(87, 205, 'var(--fi-flower-1)', 3.2, 4)}<path d="M87 215V209" stroke="var(--fi-leaf-2)" stroke-width="2"/></g>` +
          pot(108, 232, 0.9) + `${leaf(104, 211, -30, 'var(--fi-leaf)', 1.3)}${leaf(112, 211, 30, 'var(--fi-leaf-2)', 1.3)}${leaf(108, 208, 0, 'var(--fi-leaf)', 1.2)}` +
          pot(123, 232, 0.8) + `<path d="M123 218V208" stroke="var(--fi-leaf-2)" stroke-width="2"/><path d="M119 207Q123 198 127 207Q123 211 119 207Z" fill="var(--fi-flower-3)" ${o(1.2)}/>` +
          front + (st === 'fixed' ? sparkle(96, 202, 4) + sparkle(127, 196, 3, 'var(--fi-sun)') : '');
      }
      return `<g class="fi-wobble">${pot(120, 230, 0.9, -24)}</g>` + pot(88, 231, 1, 92) +
        `<path d="M74 234Q78 228 84 232Q82 238 74 234Z" fill="var(--fi-soil)" ${o(1.2)}/>${leaf(73, 236, 120, 'var(--fi-leaf-2)', 1)}` +
        `<g transform="rotate(100 102 248)">${pot(102, 248, 0.9)}</g>` +
        `<path d="M84 252Q96 244 112 250Q120 246 126 252Z" fill="var(--fi-soil)" ${o(1.4)}/>${petals(114, 246, 'var(--fi-flower-1)', 2.6, 3.2)}` +
        `<path d="M78 250l4 -4l3 4Z" fill="${T2}" ${o(1.2)}/>${front}`;
    },
    // lanterna sul paletto accanto al cancello
    lantern(st) {
      const lit = st === 'fixed';
      const glass = st === 'broken' ? 'var(--fi-hole)' : lit ? 'var(--fi-fire-3)' : 'var(--fi-glass-2)';
      const crack = st === 'broken' ? `<path d="M151 166l4 6l-3 4l4 6M155 172l5 -2" fill="none" stroke="var(--fi-glass)" stroke-width="1.4" stroke-linecap="round"/>` +
        `<g class="fi-zap"><circle cx="155" cy="178" r="3" fill="var(--fi-fire)" opacity=".6"/></g><path d="M166 160q8 -2 10 6" fill="none" stroke="var(--fi-ink)" stroke-width="1" opacity=".4"/><path d="M170 160l2 5l3 -3l1 5" fill="none" stroke="var(--fi-ink)" stroke-width=".8" opacity=".35"/>` : '';
      const flame = lit ? `<path d="M155 184c-5 -2 -5 -8 0 -13c0 4 4 4 3 8c2 -1 2 -3 1 -4c3 3 2 8 -4 9z" fill="var(--fi-fire)"/><circle cx="155" cy="181" r="2" fill="var(--fi-hi)"/>` : '';
      return `<rect x="145" y="162" width="20" height="26" rx="3" fill="${glass}" ${o(2)}/>${flame}${crack}` +
        `<path d="M150 162V188M160 162V188" stroke="var(--fi-metal-2)" stroke-width="1.6"/>${st !== 'broken' ? hl('M147.5 166v8', 1.6, 0.9) : ''}` +
        `<path d="M139 163L155 150L171 163Z" fill="var(--fi-roof)" ${o(2)}/><path d="M155 150L171 163H162Z" fill="var(--fi-ink)" opacity=".1"/><circle cx="155" cy="148" r="3" fill="var(--fi-roof-2)" ${o(1.5)}/>` +
        `<rect x="143" y="187" width="24" height="5" rx="2" fill="var(--fi-roof-2)" ${o(1.6)}/>` + (lit ? sparkle(170, 156, 4, 'var(--fi-sun)') : '');
    },
    // cancelletto tra i due pilastrini (186..234 × 212..246)
    gate(st) {
      const door = (h) => `<rect x="188" y="${212}" width="44" height="34" rx="3" fill="none" stroke="${INK}" stroke-width="6"/>` +
        `<rect x="188" y="212" width="44" height="34" rx="3" fill="none" stroke="var(--fi-fence)" stroke-width="3"/>` +
        [196, 204, 216, 224].map((x) => `<path d="M${x} 214V244" stroke="${INK}" stroke-width="4.6"/><path d="M${x} 214V244" stroke="var(--fi-fence)" stroke-width="2"/>`).join('') +
        `<path d="M210 222c-3 -2.4 -6 -4.4 -6 -7a3 3 0 0 1 6 -1a3 3 0 0 1 6 1c0 2.6 -3 4.6 -6 7z" fill="var(--fi-flower-1)" ${o(1.4)}/>` +
        `<path d="M190 229H230" stroke="var(--fi-fence-2)" stroke-width="2"/>${h}`;
      if (st !== 'broken') {
        return door(`<rect x="227" y="226" width="6" height="5" rx="1.5" fill="var(--fi-flower-2)" ${o(1.2)}/>`) +
          `<path d="M186 216h5M186 240h5" ${o(3)}/>` + (st === 'fixed' ? sparkle(240, 206, 4) + sparkle(186, 250, 3, 'var(--fi-sun)') : '');
      }
      return `<path d="M186 216h5" ${o(3)}/><path d="M186 240l4 3" ${o(2)}/><g class="fi-wobble" style="transform-origin:0 0"><g transform="rotate(24 188 214)">${door('')}</g></g>` +
        `<g transform="rotate(-8 214 256)"><rect x="196" y="252" width="34" height="5" rx="2" fill="var(--fi-fence)" ${o(1.6)}/></g>` +
        `<path d="M236 258l3 -1M240 255l1 3" ${o(1.3)}/>`;
    },
    // altalena appesa al ramo (corde a x 264 e 300)
    swing(st) {
      const seat = `<rect x="256" y="240" width="52" height="8" rx="3" fill="var(--fi-wood)" ${o(2)}/><path d="M258 240H306" stroke="var(--fi-hi)" stroke-width="1.4" opacity=".6"/>` +
        `<path d="M262 240Q264 232 282 232Q300 232 302 240Z" fill="var(--fi-curtain)" ${o(1.8)}/><circle cx="272" cy="236.5" r="1.3" fill="var(--fi-hi)"/><circle cx="282" cy="235" r="1.3" fill="var(--fi-hi)"/><circle cx="292" cy="236.5" r="1.3" fill="var(--fi-hi)"/>`;
      const rope = (x, y1, y2) => `<path d="M${x} ${y1}V${y2}" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><path d="M${x} ${y1}V${y2}" stroke="var(--fi-garden-rope)" stroke-width="2.2" stroke-linecap="round"/>` +
        `<path d="M${x} ${y1}V${y2}" stroke="var(--fi-garden-rope-2)" stroke-width="1" stroke-dasharray="2 3"/>`;
      const knot = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="3" fill="var(--fi-garden-rope)" ${o(1.4)}/>`;
      if (st !== 'broken') {
        return `<g class="${st === 'fixed' ? 'fi-garden-swing' : ''}">${rope(264, 154, 241)}${rope(300, 152, 241)}${knot(264, 156)}${knot(300, 154)}` +
          `${leaf(262, 186, -50, 'var(--fi-leaf)', 1)}${leaf(302, 200, 50, 'var(--fi-leaf)', 1)}<circle cx="264" cy="214" r="3" fill="var(--fi-flower-1)" ${o(1)}/><circle cx="300" cy="176" r="3" fill="var(--fi-flower-3)" ${o(1)}/>${seat}</g>` +
          (st === 'fixed' ? sparkle(318, 226, 5) + sparkle(250, 200, 3, 'var(--fi-sun)') : '');
      }
      return `${rope(300, 152, 180)}${knot(300, 154)}<path d="M300 180l-3 5M300 180l0 6M300 180l3 5" stroke="var(--fi-garden-rope-2)" stroke-width="1.6" stroke-linecap="round"/>` +
        `<g class="fi-dangle">${rope(264, 154, 214)}${knot(264, 156)}<g transform="rotate(72 264 214)" class="fi-garden-seat"><g transform="translate(8 -26)">${seat}</g></g></g>` +
        `<path d="M300 186q4 4 2 9" fill="none" stroke="var(--fi-ink)" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>`;
    },
    // casetta degli uccellini sul tronco (caduta: per terra tra le foglie)
    birdhouse(st, S) {
      const house = (b) => `<rect x="-13" y="-12" width="26" height="24" rx="2" fill="var(--fi-garden-bh)" ${o(2)}/><path d="M5 -11h7v22h-7z" fill="var(--fi-ink)" opacity=".1"/>` +
        `<circle cx="0" cy="-1" r="5" fill="var(--fi-hole)" ${o(1.6)}/>${b}<path d="M-3 7h6" ${o(2.2)}/>` +
        `<path d="M-18 -10L0 -25L18 -10Z" fill="var(--fi-roof)" ${o(2)}/><path d="M0 -25L18 -10H9Z" fill="var(--fi-ink)" opacity=".1"/>` +
        `${heart(0, -15, 0.7, 'var(--fi-hi)')}${hl('M-10 -9V6', 1.6, 0.6)}`;
      if (st !== 'broken') {
        const peek = `<circle cx="0" cy="0" r="3.6" fill="var(--fi-garden-bird)"/><circle cx="1.2" cy="-1.4" r="1" fill="var(--fi-ink)"/><path d="M3 0l2.4 .8l-2.4 .8z" fill="var(--fi-flower-2)"/>`;
        return `<g transform="translate(356 196)">${house(st === 'fixed' ? peek : '')}</g>` + (st === 'fixed' ? bird(318, 150, 0.8) + sparkle(380, 176, 4) : '');
      }
      return `<circle cx="356" cy="184" r="2" fill="var(--fi-metal-2)" ${o(1.2)}/><g class="fi-dangle"><path d="M356 184l-4 12M356 184l4 12" fill="none" stroke="var(--fi-garden-rope-2)" stroke-width="1.6" stroke-linecap="round"/></g>` +
        bird(352, 150, 0.8, true) + `<g transform="translate(${S.leavesOff ? 322 : 358} ${S.leavesOff ? 300 : 304}) rotate(${S.leavesOff ? 96 : 112}) scale(.82)">${house('')}</g>`;
    },
    // mucchio di foglie ai piedi dell'albero
    leaves(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') return `<path d="M300 306q3 -8 6 0M306 306q3 -10 6 0M336 304q3 -8 6 0M342 304q3 -10 6 0" fill="none" stroke="var(--fi-grass-2)" stroke-width="2.2" stroke-linecap="round"/>${daisy(322, 300, 'var(--fi-flower-1)')}${sparkle(352, 286, 4)}`;
      const C = ['var(--fi-autumn)', 'var(--fi-autumn-2)', 'var(--fi-autumn-3)'];
      const L = [[296, 304, 20], [306, 298, -40], [318, 302, 80], [330, 306, 10], [342, 300, -60], [354, 304, 30], [302, 290, 60], [314, 288, -10],
        [326, 292, 40], [338, 288, 100], [350, 292, -70], [320, 280, 20], [332, 278, -30], [310, 280, 70], [344, 280, 10]];
      return `<path d="M290 310Q296 276 326 272Q356 276 362 310Z" fill="var(--fi-autumn-2)" ${o(2)}/><path d="M326 272Q356 276 362 310H340Q344 288 326 272Z" fill="var(--fi-ink)" opacity=".1"/>` +
        L.map(([x, y, r], i) => leaf(x, y, r, C[i % 3], 1.3)).join('') +
        `<g class="fi-flutter">${leaf(370, 270, 30, 'var(--fi-autumn)', 1.2)}</g><g class="fi-flutter" style="animation-delay:.9s">${leaf(284, 280, -20, 'var(--fi-autumn-3)', 1.1)}</g>`;
    },
    // cassetta rialzata davanti alla serra
    seedlings(st, S) {
      const wet = S.watered ? `<rect x="20" y="288" width="68" height="8" rx="3" fill="var(--fi-garden-wet)" opacity=".35"/>` : '';
      if (st !== 'broken') {
        return wet + [28, 41, 54, 67, 80].map((x, i) => sprout(x, 292, i % 2 ? 1.05 : 1.2, 'fi-sway')).join('') +
          (S.watered ? drop(34, 270, 0.7) + drop(73, 268, 0.7) + sparkle(60, 270, 3) : '') + (st === 'fixed' ? sparkle(88, 276, 4) : '');
      }
      const lying = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})">${sprout(x, y, 1)}<path d="M${x - 2} ${y}q2 4 0 6M${x + 2} ${y}q-1 3 1 5" fill="none" stroke="var(--fi-soil)" stroke-width="1.2"/></g>`;
      return [30, 50, 70].map((x) => `<ellipse cx="${x}" cy="291" rx="5" ry="2.2" fill="var(--fi-hole)" opacity=".7"/>`).join('') +
        `<path d="M58 282H86L84 290H60Z" fill="var(--fi-box)" ${o(1.6)}/><path d="M65 282V290M72 282V290M79 282V290" stroke="var(--fi-box-2)" stroke-width="1.2"/>` +
        lying(44, 286, -78) + lying(62, 281, -96) + lying(76, 281, 84) + `<path d="M40 276q4 -4 8 0" fill="none" ${o(1.2)} opacity=".5"/>`;
    },
    // aiuola da annaffiare (in basso a destra del vialetto)
    water(st, S) {
      const dry = st === 'broken';
      const soil = `<ellipse cx="290" cy="364" rx="34" ry="12" fill="${dry ? 'var(--fi-garden-dry)' : S.watered ? 'var(--fi-garden-wet)' : 'var(--fi-soil)'}" ${o(2)}/>` +
        [258, 268, 280, 292, 304, 316, 324].map((x, i) => `<ellipse cx="${x}" cy="${370 + (i % 2) * 3 - (x > 316 ? 6 : 0)}" rx="5" ry="3" fill="var(--fi-stone)" ${o(1.3)}/>`).join('');
      const F = [[270, 362, 22, 'var(--fi-flower-1)'], [284, 360, 28, 'var(--fi-flower-3)'], [298, 362, 24, 'var(--fi-flower-1)'], [311, 360, 20, 'var(--fi-flower-2)']];
      const cracks = dry ? `<path d="M276 362l5 3l4 -2M298 360l3 4l5 -1M290 368l3 -3" fill="none" stroke="var(--fi-ink)" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>` : '';
      const fl = F.map(([x, b, h, c], i) => flower(x, b, h, c, dry, i * 0.3)).join('');
      const fx = dry ? `<path d="M318 330q-3 -5 0 -9M324 334q-3 -5 0 -9" fill="none" stroke="var(--fi-fire)" stroke-width="1.6" stroke-linecap="round" class="fi-spray"/>`
        : S.watered ? drop(277, 338, 0.7) + drop(304, 336, 0.7) + sparkle(318, 340, 4) + sparkle(262, 344, 3, 'var(--fi-sun)') : '';
      return soil + cracks + fl + fx;
    },
    // tubo da giardino (sempre presente): dal rubinetto all'aiuola, con l'ugello in fondo
    '@hose': (S) => `<path d="${HOSE}" fill="none" stroke="${INK}" stroke-width="8.5" stroke-linecap="round"/>` +
      `<path d="${HOSE}" fill="none" stroke="var(--fi-garden-hose)" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="${HOSE}" fill="none" stroke="var(--fi-hi)" stroke-width="1.2" stroke-linecap="round" opacity=".5" transform="translate(-1 -1.4)"/>` +
      (S.waterOff ? '' : `<path d="${HOSE}" fill="none" stroke="var(--fi-water-2)" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round" class="fi-flow"/>`) +
      `<rect x="258" y="341" width="12" height="9" rx="3" transform="rotate(-18 264 346)" fill="var(--fi-valve)" ${o(1.6)}/>`,
    // rubinetto sulla colonnina
    tap(st, S) {
      const post = `<rect x="108" y="262" width="18" height="44" rx="3" fill="var(--fi-brick)" ${o(2)}/><path d="M108 276H126M108 290H126M117 262V276M113 276V290M121 276V290M117 290V305" stroke="var(--fi-brick-2)" stroke-width="1.4"/>` +
        `<path d="M121 263h4v42h-4z" fill="var(--fi-ink)" opacity=".1"/><rect x="105" y="258" width="24" height="6" rx="2" fill="var(--fi-stone)" ${o(1.6)}/>` +
        `<path d="M124 276H132V284" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M124 276H132V284" fill="none" stroke="var(--fi-metal)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      const handle = `<path d="M124 268h10M129 263v10" ${o(5)}/><path d="M124 268h10M129 263v10" stroke="var(--fi-valve)" stroke-width="2.6" stroke-linecap="round"/><circle cx="129" cy="268" r="2.2" fill="var(--fi-valve)" ${o(1.2)}/>`;
      if (st !== 'broken') return post + `<path d="M129 270V275" ${o(2.4)}/><g transform="rotate(45 129 268)">${handle}</g>`;
      const dr = (x, d) => `<path d="M${x} 288q3 4.6 0 7q-3 -2.4 0 -7Z" fill="var(--fi-water)" ${o(1.1)} class="fi-drip" style="animation-delay:${d}s"/>`;
      return post + `<path d="M129 270V275" ${o(2.4)}/><g class="fi-spin">${handle}</g>` + dr(135, 0) + dr(128, 0.6) +
        `<path d="M120 336Q130 330 144 334Q150 340 138 342Q124 342 120 336Z" fill="var(--fi-water)" ${o(1.4)}/><ellipse cx="134" cy="337" rx="6" ry="1.8" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.4" class="fi-ripple"/>`;
    },
    // buco nel tubo (182, 369): spruzza solo se il rubinetto è aperto
    hose(st, S) {
      if (st === 'idle') return '';
      if (st === 'fixed') {
        return `<g transform="rotate(25 182 369)"><rect x="174" y="364" width="16" height="10" rx="3" fill="var(--fi-curtain)" ${o(1.6)}/><path d="M179 364V374M185 364V374" stroke="var(--fi-curtain-2)" stroke-width="1.2"/></g>` +
          heart(182, 366, 0.55, 'var(--fi-hi)') + sparkle(196, 354, 4);
      }
      const hole = `<ellipse cx="182" cy="369" rx="3.4" ry="2.2" fill="var(--fi-hole)" ${o(1.2)}/>`;
      if (S.waterOff) return hole + drop(184, 376, 0.8);
      return hole + `<g class="fi-spray"><path d="M182 367q-10 -16 -24 -14M182 367q2 -20 12 -24M182 367q10 -12 24 -10" fill="none" stroke="var(--fi-water-2)" stroke-width="2.2" stroke-linecap="round"/>` +
        `${drop(156, 352, 0.7)}${drop(194, 340, 0.7)}${drop(206, 356, 0.7)}</g>` +
        `<path d="M164 382Q174 376 190 380Q200 386 186 388Q168 389 164 382Z" fill="var(--fi-water)" ${o(1.3)} opacity=".85"/><ellipse cx="178" cy="383" rx="6" ry="1.6" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.3" class="fi-ripple"/>`;
    },
    // tronco caduto di traverso sul vialetto (segato: catasta di ceppi a lato)
    trunk(st) {
      if (st === 'idle') return '';
      const ring = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--fi-garden-cut)" ${o(1.8)}/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="none" stroke="var(--fi-wood)" stroke-width="1.3"/><circle cx="${x}" cy="${y}" r="${r * 0.2}" fill="var(--fi-wood)"/>`;
      if (st === 'fixed') {
        const lg = (x, y) => `<rect x="${x - 14}" y="${y - 6}" width="20" height="12" rx="5" fill="var(--fi-wood)" ${o(1.8)}/>${ring(x + 6, y, 6)}`;
        return `<ellipse cx="248" cy="338" rx="22" ry="4" fill="var(--fi-shade)"/>${lg(240, 332)}${lg(260, 332)}${lg(250, 321)}${sparkle(268, 312, 4)}` +
          `<path d="M214 330q3 -2 6 0M200 334q2 -2 5 0" fill="none" stroke="var(--fi-garden-cut)" stroke-width="2" stroke-linecap="round"/>`;
      }
      return `<ellipse cx="190" cy="330" rx="66" ry="7" fill="var(--fi-shade)"/><g class="fi-wobble">` +
        `<path d="M134 316Q132 330 144 333L236 322Q246 318 244 306L238 302L140 312Z" fill="var(--fi-wood)" ${o(2.4)}/>` +
        `<path d="M144 333L236 322Q246 318 244 306L240 316L146 326Z" fill="var(--fi-wood-2)"/>` +
        `<path d="M156 318q10 -2 18 0M186 315q12 -2 20 0M206 321q10 -1 16 -2M160 326q8 0 14 -2" fill="none" stroke="var(--fi-wood-2)" stroke-width="1.6" stroke-linecap="round"/>` +
        `${ring(239, 312, 9)}<path d="M150 312l-10 -14M176 310l4 -14M200 307l-6 -12" fill="none" ${o(2.4)}/>` +
        `<path d="M150 312l-10 -14M176 310l4 -14M200 307l-6 -12" fill="none" stroke="var(--fi-wood)" stroke-width="1.4" stroke-linecap="round"/>` +
        `${leaf(138, 296, -30, 'var(--fi-leaf)', 1.4)}${leaf(182, 294, 20, 'var(--fi-leaf-2)', 1.4)}${leaf(192, 292, -40, 'var(--fi-leaf)', 1.3)}${leaf(132, 304, 70, 'var(--fi-leaf-2)', 1.2)}` +
        `${hl('M142 314L230 305', 1.8, 0.45)}</g>`;
    },
  };

  /* ---------- fondale ---------- */
  const pk = (x) => `<path d="M${x} 250V219l4.5 -5l4.5 5V250Z" fill="var(--fi-fence)" ${o(1.6)}/><path d="M${x + 6.5} 219V249" stroke="var(--fi-fence-2)" stroke-width="1.8"/>`;
  function base() {
    const rain = Array.from({ length: 26 }, (_, i) => { const x = (i * 37) % 420 - 10, y = (i * 53) % 330; return `M${x} ${y}l-7 16`; }).join('');
    const fence = Array.from({ length: 32 }, (_, i) => -4 + i * 13).filter((x) => x < 174 || x > 238).map(pk).join('');
    const stones = [[210, 258, 8, 2.6], [206, 271, 10, 3.2], [214, 287, 12, 3.8], [204, 344, 18, 5.4], [216, 372, 22, 6.4], [200, 396, 25, 7]]
      .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="var(--fi-garden-path-2)" ${o(1.4)}/><ellipse cx="${x - rx * 0.25}" cy="${y - ry * 0.3}" rx="${rx * 0.45}" ry="${ry * 0.3}" fill="var(--fi-hi)" opacity=".35"/>`).join('');
    // cornice della serra: montanti con contorno
    const fr = (x1, y1, x2, y2, w = 3) => stick(x1, y1, x2, y2, w, 'var(--fi-garden-frame)');
    const GH = 'M16 252V150L73 104L130 150V252Z';
    return `<defs><linearGradient id="fiGdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-sky)"/><stop offset="1" stop-color="var(--fi-sky-2)"/></linearGradient>
      <linearGradient id="fiGdStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-storm)"/><stop offset="1" stop-color="var(--fi-storm-2)" stop-opacity=".4"/></linearGradient>
      <linearGradient id="fiGdIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-garden-in)"/><stop offset="1" stop-color="var(--fi-garden-in-2)"/></linearGradient>
      <pattern id="fiGdTone" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.5" fill="var(--fi-tone)"/></pattern></defs>
      <rect width="400" height="400" fill="url(#fiGdSky)"/><rect width="400" height="230" fill="url(#fiGdTone)"/>
      <g class="fi-back"></g>
      <g class="fi-sun"><g class="fi-rays">${Array.from({ length: 10 }, (_, i) => `<path d="M214 ${44 - 27}v-7" transform="rotate(${i * 36} 214 44)" stroke="var(--fi-sun)" stroke-width="3.4" stroke-linecap="round"/>`).join('')}</g>
        <circle cx="214" cy="44" r="20" fill="var(--fi-sun)" ${o(2.4)}/><path d="M233 48a20 20 0 0 1-30 12 22 22 0 0 0 30-12z" fill="var(--fi-sun-2)"/>
        <path d="M207 42q2 -3 4 0M217 42q2 -3 4 0M210 50q4 3 8 0" fill="none" ${o(1.8)}/><ellipse cx="205" cy="49" rx="3" ry="2" fill="var(--fi-flower-1)" opacity=".6"/><ellipse cx="223" cy="49" rx="3" ry="2" fill="var(--fi-flower-1)" opacity=".6"/>${hl('M200 36a15 15 0 0 1 7-7', 2.2, 0.8)}</g>
      ${cloud(84, 46, 0.9, 'fi-cloud')}${cloud(146, 14, 0.7, 'fi-cloud c2')}
      <g class="fi-storm"><rect width="400" height="250" fill="url(#fiGdStorm)"/>${stormCloud(-10, 8, 1.6)}${stormCloud(120, -6, 1.3)}${stormCloud(250, 14, 1.7)}
        <path class="fi-bolt" d="M178 46l-10 22h9l-7 18" fill="none" stroke="var(--fi-spark)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
      <path d="M-10 214Q30 168 84 190Q130 156 186 186Q236 160 284 184Q334 158 410 186V250H-10Z" fill="var(--fi-mtn-2)"/>
      <path d="M60 182q20 -16 36 -4M162 172q18 -14 32 -2M262 174q18 -14 34 -2" fill="none" stroke="var(--fi-hi)" stroke-width="3" stroke-linecap="round" opacity=".45"/>
      <path d="M0 226Q100 200 200 216T400 208V260H0Z" fill="var(--fi-hill)"/>
      ${[[160, 206, 7, 'var(--fi-garden-blossom)'], [174, 210, 5, 'var(--fi-leaf-2)'], [244, 204, 8, 'var(--fi-garden-blossom)'], [258, 208, 5, 'var(--fi-leaf-2)']].map(([x, y, r, c]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><path d="M${x} ${y + r}v5" stroke="var(--fi-wood-2)" stroke-width="2"/>`).join('')}
      <path d="M0 238Q100 230 200 238T400 234V400H0Z" fill="var(--fi-grass)"/>
      <path d="M0 300Q120 290 220 300T400 296V400H0Z" fill="var(--fi-grass-3)" opacity=".55"/>
      <path d="M0 372Q90 360 190 374T400 368V400H0Z" fill="var(--fi-grass-3)"/>
      <path d="M0 224H174M240 224H400M0 242H174M240 242H400" stroke="var(--fi-fence-2)" stroke-width="3"/>${fence}
      <path d="M0 252H400" stroke="var(--fi-shade)" stroke-width="4"/>
      ${[[248, 252, 'var(--fi-flower-1)'], [258, 254, 'var(--fi-flower-3)'], [268, 252, 'var(--fi-flower-2)'], [322, 254, 'var(--fi-flower-1)'], [384, 252, 'var(--fi-flower-3)']].map(([x, y, c]) =>
        `<path d="M${x} ${y}V${y - 9}" stroke="var(--fi-leaf-2)" stroke-width="2"/><path d="M${x - 3.5} ${y - 9}Q${x - 4} ${y - 16} ${x} ${y - 14}Q${x + 4} ${y - 16} ${x + 3.5} ${y - 9}Q${x} ${y - 6} ${x - 3.5} ${y - 9}Z" fill="${c}" ${o(1.2)}/>`).join('')}
      <path d="M188 248L232 248L298 400H114Z" fill="var(--fi-garden-path)"/><path d="M188 248L114 400M232 248L298 400" stroke="var(--fi-garden-path-2)" stroke-width="3"/>
      <path d="M232 248L298 400H272Z" fill="var(--fi-ink)" opacity=".05"/>${stones}
      ${[[118, 400], [128, 372], [138, 348], [148, 324], [158, 300], [168, 278], [178, 260]].map(([x, y], i) => `<circle cx="${x + 2}" cy="${y - 4}" r="${2.6 + i * -0.2}" fill="${i % 2 ? 'var(--fi-flower-1)' : 'var(--fi-daisy)'}" ${o(1)}/>`).join('')}
      <rect x="179" y="204" width="9" height="48" rx="2" fill="var(--fi-fence)" ${o(2)}/><rect x="232" y="204" width="9" height="48" rx="2" fill="var(--fi-fence)" ${o(2)}/>
      <circle cx="183.5" cy="202" r="5" fill="var(--fi-flower-1)" ${o(1.8)}/><circle cx="236.5" cy="202" r="5" fill="var(--fi-flower-1)" ${o(1.8)}/>${hl('M181 199a3 3 0 0 1 3 -2', 1.4, 0.9)}${hl('M234 199a3 3 0 0 1 3 -2', 1.4, 0.9)}
      <path d="M150 252V190h10V252Z" fill="var(--fi-metal-2)" ${o(2)}/><path d="M156 192h4v58h-4z" fill="var(--fi-ink)" opacity=".12"/><rect x="146" y="248" width="18" height="6" rx="2" fill="var(--fi-stone)" ${o(1.6)}/>
      ${leaf(150, 230, -60, 'var(--fi-leaf)', 1.1)}${leaf(161, 214, 60, 'var(--fi-leaf-2)', 1.1)}${leaf(149, 204, -50, 'var(--fi-leaf)', 1)}
      <path d="M330 306C342 292 344 230 343 140L369 136C368 220 370 290 386 306Z" fill="var(--fi-wood)" ${o(2.4)}/>
      <path d="M360 138C360 220 362 290 376 305H386C370 290 368 220 369 136Z" fill="var(--fi-wood-2)"/>
      <path d="M350 230q4 6 0 12M352 270q4 6 0 12M348 160q3 5 0 10" fill="none" stroke="var(--fi-wood-2)" stroke-width="1.6" stroke-linecap="round"/>
      ${[[300, 76, 38, 'var(--fi-leaf)'], [352, 52, 44, 'var(--fi-leaf)'], [396, 88, 36, 'var(--fi-leaf-2)'], [336, 112, 38, 'var(--fi-leaf)'], [272, 116, 28, 'var(--fi-leaf)'], [390, 136, 28, 'var(--fi-leaf)']].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${o(2.4)}/>`).join('')}
      <path d="M248 128a28 28 0 0 0 46 4a40 40 0 0 0 68 6a30 30 0 0 0 50 -10V160H248Z" fill="var(--fi-leaf-2)" opacity=".75" clip-path="url(#fiGdCan)"/>
      <clipPath id="fiGdCan"><circle cx="272" cy="116" r="28"/><circle cx="336" cy="112" r="38"/><circle cx="390" cy="136" r="28"/></clipPath>
      ${hl('M272 60a30 30 0 0 1 18 -18', 2.6, 0.55)}${hl('M330 26a30 30 0 0 1 16 -10', 2.6, 0.55)}${hl('M256 108a20 20 0 0 1 10 -12', 2.2, 0.55)}
      ${[[290, 60], [318, 92], [344, 40], [372, 70], [300, 120], [384, 116], [356, 128], [264, 100], [330, 66]].map(([x, y], i) => `<g>${petals(x, y, i % 3 ? 'var(--fi-garden-blossom)' : 'var(--fi-hi)', 2.4, 2.8)}</g>`).join('')}
      <path d="M346 158C320 150 280 144 238 147L238 156C280 154 318 160 344 172Z" fill="var(--fi-wood)" ${o(2.2)}/><path d="M238 154C280 152 318 158 344 170L344 172C318 162 280 156 238 156Z" fill="var(--fi-wood-2)"/>
      ${leaf(236, 144, -40, 'var(--fi-leaf)', 1.3)}${leaf(244, 158, 50, 'var(--fi-leaf-2)', 1.2)}${petals(240, 150, 'var(--fi-garden-blossom)', 2.2, 2.6)}
      <ellipse cx="73" cy="262" rx="64" ry="6" fill="var(--fi-shade)"/>
      <path d="${GH}" fill="url(#fiGdIn)"/>
      <path d="M22 252V214Q32 196 40 214V252Z" fill="var(--fi-leaf-2)" ${o(1.6)}/><path d="M30 236Q20 220 26 208Q36 220 30 236Z" fill="var(--fi-leaf)" ${o(1.4)}/><path d="M34 228Q46 210 54 214Q48 230 34 228Z" fill="var(--fi-leaf)" ${o(1.4)}/>
      <path d="M73 150V164" stroke="var(--fi-garden-rope-2)" stroke-width="1.4"/><path d="M64 164H82L78 172H68Z" fill="${T}" ${o(1.4)}/>
      <path d="M66 170q-4 10 -2 18M72 172q0 8 2 14M80 170q4 8 2 16" fill="none" stroke="var(--fi-leaf-2)" stroke-width="2" stroke-linecap="round"/>${leaf(64, 182, 10, 'var(--fi-leaf)', 0.9)}${leaf(74, 182, -10, 'var(--fi-leaf)', 0.9)}${leaf(82, 184, 20, 'var(--fi-leaf)', 0.9)}
      <rect x="18" y="231" width="110" height="5" rx="1.5" fill="var(--fi-wood)" ${o(1.6)}/><path d="M22 236V252M124 236V252" ${o(2)}/>
      ${pot(52, 231, 0.8)}<path d="M50 218q-1 -6 2 -9q3 3 2 9z" fill="var(--fi-leaf)" ${o(1.2)}/>${pot(64, 231, 0.7)}${petals(64, 213, 'var(--fi-flower-2)', 2.4, 2.8)}
      <path d="${GH}" fill="var(--fi-glass)" opacity=".28"/>
      <path d="M20 190L40 160M50 246L70 214M84 196L98 176M106 244L124 218M60 140L72 124" stroke="var(--fi-hi)" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
      ${fr(44, 128, 44, 251)}${fr(73, 104, 73, 251)}${fr(102, 128, 102, 251)}${fr(17, 200, 129, 200)}${fr(17, 151, 129, 151, 3.4)}${fr(17, 150, 17, 252, 3.4)}${fr(129, 150, 129, 252, 3.4)}
      ${fr(8, 157, 73, 99, 4.2)}${fr(73, 99, 138, 157, 4.2)}
      <path d="M73 98c-3 -2.4 -6 -4.4 -6 -7a3 3 0 0 1 6 -1a3 3 0 0 1 6 1c0 2.6 -3 4.6 -6 7z" fill="var(--fi-flower-1)" ${o(1.6)}/>
      <rect x="12" y="250" width="122" height="12" rx="2" fill="var(--fi-brick)" ${o(2)}/><path d="M12 256H134M30 250v6M52 250v6M74 250v6M96 250v6M118 250v6M40 256v6M62 256v6M84 256v6M106 256v6" stroke="var(--fi-brick-2)" stroke-width="1.3"/>
      <rect x="16" y="284" width="76" height="8" rx="3" fill="var(--fi-soil)" ${o(1.8)}/><rect x="14" y="292" width="80" height="18" rx="3" fill="var(--fi-wood)" ${o(2)}/>
      <path d="M14 301H94" stroke="var(--fi-wood-2)" stroke-width="1.6"/><path d="M82 293h10v16h-10z" fill="var(--fi-ink)" opacity=".1"/>${hl('M18 296H60', 1.4, 0.5)}
      ${heart(54, 301, 0.8, 'var(--fi-flower-1)')}
      <ellipse cx="62" cy="362" rx="42" ry="15" fill="var(--fi-garden-pond)" ${o(2.2)}/><path d="M28 360Q62 350 96 360" fill="none" stroke="var(--fi-hi)" stroke-width="2" stroke-linecap="round" opacity=".6"/>
      <ellipse cx="62" cy="363" rx="10" ry="2.4" fill="none" stroke="var(--fi-hi)" stroke-width="1.4" class="fi-ripple"/>
      <path d="M42 366a9 4 0 1 1 8 3l-5 -3z" fill="var(--fi-garden-pad)" ${o(1.4)}/><path d="M78 356a8 3.4 0 1 1 7 3l-4 -3z" fill="var(--fi-garden-pad)" ${o(1.4)}/>
      <path d="M48 362q-3 -6 2 -7q2 -4 5 0q5 1 2 7z" fill="var(--fi-garden-blossom)" ${o(1.2)}/>
      ${[[24, 352, 5], [100, 352, 4.5], [30, 374, 5.5], [92, 372, 5], [66, 378, 4.5]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.6}" fill="var(--fi-stone)" ${o(1.3)}/>`).join('')}
      <g transform="translate(82 352)"><ellipse cx="0" cy="0" rx="6.5" ry="4.6" fill="var(--fi-leaf)" ${o(1.4)}/><circle cx="-3" cy="-4" r="2.4" fill="var(--fi-leaf)" ${o(1.2)}/><circle cx="3" cy="-4" r="2.4" fill="var(--fi-leaf)" ${o(1.2)}/><circle cx="-3" cy="-4.2" r="1" fill="var(--fi-ink)"/><circle cx="3" cy="-4.2" r="1" fill="var(--fi-ink)"/><path d="M-2 0q2 1.6 4 0" fill="none" ${o(1)}/><ellipse cx="-4.4" cy="-.6" rx="1.4" ry=".8" fill="var(--fi-flower-1)" opacity=".7"/><ellipse cx="4.4" cy="-.6" rx="1.4" ry=".8" fill="var(--fi-flower-1)" opacity=".7"/></g>
      <g transform="translate(106 334)"><path d="M-6 0Q-6 -8 0 -8Q6 -8 6 0Z" fill="var(--fi-flower-1)" ${o(1.4)}/><rect x="-2" y="0" width="4" height="5" rx="1" fill="var(--fi-daisy)" ${o(1.2)}/><circle cx="-2" cy="-4" r="1.2" fill="var(--fi-hi)"/><circle cx="2.4" cy="-2.4" r=".9" fill="var(--fi-hi)"/></g>
      <ellipse cx="290" cy="380" rx="40" ry="5" fill="var(--fi-shade)"/>
      ${tuft(240, 268)}${tuft(272, 292, 1.1)}${tuft(18, 330)}${tuft(110, 390, 1)}${tuft(316, 396, 0.9)}${tuft(236, 396, 1.1)}${tuft(124, 318, 0.9)}${tuft(98, 254, 0.8)}
      ${daisy(250, 284)}${daisy(14, 344, 'var(--fi-flower-1)')}${daisy(320, 326, 'var(--fi-flower-3)')}${daisy(118, 346)}${daisy(254, 396, 'var(--fi-flower-1)')}${daisy(274, 262)}
      <rect class="fi-gloom" width="400" height="400" fill="var(--fi-storm)"/>
      <g class="fi-layers"></g>
      ${hari(334, 324)}
      <g class="fi-front"></g>
      <g class="fi-weather"><path d="${rain}" stroke="var(--fi-rain)" stroke-width="1.8" stroke-linecap="round"/></g>`;
  }

  const butterfly = (x, y, c, d) => `<g class="fi-flutter" style="animation-delay:${d}s"><g transform="translate(${x} ${y})">` +
    `<path d="M0 0Q-9 -11 -11 -3Q-11 3 0 1Z" fill="${c}" ${o(1.3)}/><path d="M0 0Q9 -11 11 -3Q11 3 0 1Z" fill="${c}" ${o(1.3)}/>` +
    `<path d="M0 1Q-6 8 -3 9Q0 8 0 2ZM0 1Q6 8 3 9Q0 8 0 2Z" fill="${c}" ${o(1.1)}/><path d="M0 -3V6" ${o(1.8)}/><path d="M0 -3l-2 -4M0 -3l2 -4" ${o(1)}/>` +
    `<circle cx="-6" cy="-3" r="1.4" fill="var(--fi-hi)"/><circle cx="6" cy="-3" r="1.4" fill="var(--fi-hi)"/></g></g>`;

  HH.fixitScenes.garden = {
    id: 'garden', name: ['fis_garden', 'Greenhouse garden'],
    probs: {
      trunk: ['fip_garden_trunk', 'Fallen tree trunk'], gate: ['fip_garden_gate', 'Broken gate'], swing: ['fip_garden_swing', 'Snapped swing rope'],
      glass: ['fip_garden_glass', 'Broken greenhouse glass'], pots: ['fip_garden_pots', 'Knocked-over pots'], seedlings: ['fip_garden_seedlings', 'Seedlings to replant'],
      tap: ['fip_garden_tap', 'Garden tap left open'], hose: ['fip_garden_hose', 'Leaky hose'], water: ['fip_garden_water', 'Thirsty flower bed'],
      leaves: ['fip_garden_leaves', 'Leaves everywhere'], birdhouse: ['fip_garden_birdhouse', 'Fallen birdhouse'], lantern: ['fip_garden_lantern', 'Garden lantern out'],
    },
    spots: SPOT, layers: LAYERS, draw: DRAW, base,
    flags: (stOf) => ({
      waterOff: stOf('tap') !== 'broken',          // rubinetto chiuso: niente acqua nel tubo
      watered: stOf('water') === 'fixed',          // aiuola e piantine bagnate
      leavesOff: stOf('leaves') !== 'broken',      // la casetta caduta si vede per intero
      lit: stOf('lantern') === 'fixed',
    }),
    front(S, stOf, solved, left) {
      let fr = '';
      if (S.lit) fr += `<circle cx="155" cy="176" r="26" fill="var(--fi-glow)" class="fi-glowdot"/><ellipse cx="155" cy="254" rx="24" ry="5" fill="var(--fi-glow)" class="fi-glowdot"/>`;
      if (solved) {
        fr += butterfly(108, 120, 'var(--fi-garden-blossom)', 0) + butterfly(246, 222, 'var(--fi-flower-3)', 0.7) + butterfly(64, 318, 'var(--fi-flower-2)', 1.3) +
          [[190, 120, 6], [130, 70, 4], [262, 286, 5], [40, 210, 4]].map(([x, y, r], i) => `<g class="fi-twk" style="animation-delay:${i * 0.5}s">${sparkle(x, y, r, i % 2 ? 'var(--fi-sun)' : 'var(--fi-hi)')}</g>`).join('');
      } else {
        const W = [[-30, 116, 'var(--fi-autumn)', 0], [-30, 236, 'var(--fi-leaf)', 2.2], [-30, 168, 'var(--fi-autumn-2)', 4.1]];
        fr += W.slice(0, Math.min(3, left)).map(([x, y, c, d]) => `<g class="fi-blow" style="animation-delay:${d}s"><path d="M${x} ${y}c14 -6 22 0 30 -4" fill="none" stroke="var(--fi-cloud)" stroke-width="2" stroke-linecap="round" opacity=".7"/>${leaf(x + 34, y - 4, 40, c, 1.2)}</g>`).join('');
      }
      return fr;
    },
    // arcobaleno dietro le colline a scena completata, con cuoricini
    back: (solved) => (solved ? `<g class="fi-rainbow">${['var(--fi-flower-1)', 'var(--fi-flower-2)', 'var(--fi-leaf)', 'var(--fi-water)', 'var(--fi-flower-3)']
      .map((c, i) => `<path d="M${20 + i * 9} 210A${180 - i * 9} ${160 - i * 9} 0 0 1 ${380 - i * 9} 210" fill="none" stroke="${c}" stroke-width="9"/>`).join('')}
      ${heart(40, 168, 1.2, 'var(--fi-flower-1)')}${heart(364, 160, 1, 'var(--fi-curtain)')}${sparkle(120, 66, 5)}${sparkle(290, 60, 4)}</g>` : ''),
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
