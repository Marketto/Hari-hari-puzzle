/* Fix-It House — interfaccia.
 * Scena SVG 400×400 (facciata a sinistra, interno "in sezione" a destra, giardino davanti, scala sul lato).
 * Tocca un guasto (pulsante sopra la scena) e poi un attrezzo (o prima l'attrezzo e poi il guasto):
 *   attrezzo giusto + prerequisiti fatti  → riparato (pop + scintille), sfx.place
 *   attrezzo giusto ma ordine sbagliato   → cuore perso: anello rosso sui guasti che bloccano + freccia tratteggiata
 *                                            per ~1,5 s; la dipendenza resta segnata (freccina + catenella)
 *   attrezzo sbagliato                    → scossa + sfx.bad, nessun cuore ("slip" per le fragoline)
 * Annulla toglie solo l'ultima riparazione (i cuori non tornano).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const LIVES = 3;
  const INK = 'var(--fi-ink)';
  const o = (w = 2.4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // bastone/asta con contorno: linea scura sotto, colore sopra
  const stick = (x1, y1, x2, y2, w, c) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="${w + 3}" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const leaf = (x, y, r, c, k = 1) => `<path d="M0 -6C5 -3 5 3 0 6C-5 3 -5 -3 0 -6Z" transform="translate(${x} ${y}) rotate(${r}) scale(${k})" fill="${c}" ${o(1.2 / k)}/>`;
  const star = (x, y, r, c) => `<path d="M${x} ${y - r}Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y}Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r}Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y}Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}Z" fill="${c}"/>`;

  /* ---------- etichette (inglese finché non arrivano le traduzioni) ---------- */
  const EN_TOOL = {
    hammer: 'Hammer', tile: 'Roof tile', brush: 'Chimney brush', matches: 'Matches', saw: 'Saw', pane: 'Glass pane',
    curtain: 'Curtain', trowel: 'Trowel', roller: 'Paint roller', valve: 'Valve wheel', wrench: 'Wrench', mop: 'Mop',
    fuse: 'Power switch', screwdriver: 'Screwdriver', bulb: 'Light bulb', rake: 'Rake', seeds: 'Flowers',
  };
  const EN_PROB = {
    ladder: 'Broken ladder', roof: 'Missing roof tiles', chimney: 'Sooty chimney', fire: 'Cold fireplace', branch: 'Fallen branch',
    glass: 'Broken window', curtains: 'Fallen curtains', crack: 'Cracked wall', paint: 'Peeling paint', valve: 'Open water valve',
    pipe: 'Leaking pipe', puddle: 'Puddle', fuse: 'Fuse box', wires: 'Dangling wires', lamp: 'Broken lamp', leaves: 'Pile of leaves',
    flowers: 'Empty flower bed',
  };
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const toolName = (t) => label('fit_' + t, EN_TOOL[t]);
  const probName = (p) => label('fip_' + p, EN_PROB[p]);

  /* ---------- icone degli attrezzi (viewBox 40×40) ---------- */
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

  /* ---------- zone toccabili (coordinate della scena 400×400) ---------- */
  const SPOT = {
    roof: [90, 96, 62, 48], chimney: [254, 42, 50, 68], ladder: [342, 148, 56, 192],
    branch: [6, 168, 74, 66], glass: [82, 164, 78, 66], curtains: [82, 232, 78, 40],
    crack: [58, 274, 48, 62], paint: [106, 274, 46, 62],
    fuse: [196, 192, 46, 54], wires: [240, 158, 44, 58], lamp: [284, 158, 54, 66],
    pipe: [232, 238, 48, 46], valve: [190, 276, 44, 46], puddle: [234, 298, 50, 42], fire: [284, 262, 56, 76],
    leaves: [38, 340, 62, 58], flowers: [100, 340, 54, 58],
  };
  const center = (id) => { const [x, y, w, h] = SPOT[id]; return [x + w / 2, y + h / 2]; };
  // ordine di disegno dei livelli
  const LAYERS = ['chimney', '@roof', 'roof', 'glass', 'curtains', 'branch', 'crack', 'paint', 'fuse', 'wires', 'lamp',
    '@pipe', 'valve', 'pipe', 'puddle', 'fire', 'leaves', 'flowers', 'ladder'];

  /* ---------- disegni: st = 'broken' | 'fixed' | 'idle' (non nel livello) ---------- */
  const xl = (y) => 348 + (338 - y) * (14 / 186), xr = (y) => 380 + (338 - y) * (12 / 186);
  const DRAW = {
    ladder(st) {
      const wood = 'var(--fi-wood)';
      const rung = (y) => stick(xl(y), y, xr(y), y, 4, wood);
      if (st !== 'broken') return stick(348, 338, 362, 152, 6, wood) + stick(380, 338, 392, 152, 6, wood) + [318, 292, 266, 240, 214, 188, 162].map(rung).join('');
      return stick(348, 338, xl(256), 256, 6, wood) + stick(xl(244) - 7, 244, 362, 152, 6, wood) + stick(380, 338, 392, 152, 6, wood) +
        [318, 292, 188, 162].map(rung).join('') +
        `<path d="M${xl(256) - 4} 256l4 -5l3 4l3 -5" fill="none" ${o(2)}/>` +
        stick(xr(240), 240, xr(240) - 18, 262, 4, wood) + stick(326, 352, 352, 346, 4, wood) +
        `<path d="M${xr(214) + 6} 206q6 4 2 10" fill="none" stroke="var(--fi-ink)" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
    },
    '@roof': () => {
      let sc = '';
      for (let y = 72, r = 0; y < 166; y += 13, r++) {
        let d = '';
        for (let x = 20 + (r % 2) * 7; x < 380; x += 14) d += `M${x} ${y}a7 7 0 0 0 14 0`;
        sc += `<path d="${d}" fill="none" stroke="var(--fi-roof-2)" stroke-width="2" stroke-linecap="round"/>`;
      }
      return `<path d="M34 162L200 50L366 162Z" fill="var(--fi-roof)" ${o(2.6)}/><g clip-path="url(#fiRoofClip)">${sc}<path d="M200 50L366 162H292Z" fill="var(--fi-ink)" opacity=".08"/></g>` +
        hl('M52 154L194 58', 2.6, 0.45) +
        `<rect x="30" y="154" width="340" height="11" rx="5.5" fill="var(--fi-roof-2)" ${o(2.4)}/>`;
    },
    roof(st) {
      if (st !== 'broken') {
        return st === 'fixed' ? `<path d="M104 120a7 7 0 0 0 14 0M118 120a7 7 0 0 0 14 0M111 133a7 7 0 0 0 14 0M125 133a7 7 0 0 0 14 0" fill="none" stroke="var(--fi-roof-new)" stroke-width="2.4" stroke-linecap="round"/>` : '';
      }
      const tile = (x, y, r) => `<path d="M${x - 8} ${y - 4}H${x + 8}V${y}A8 8 0 0 1 ${x - 8} ${y}Z" transform="rotate(${r} ${x} ${y})" fill="var(--fi-roof)" ${o(1.8)}/>`;
      return `<path d="M102 124Q106 108 124 108Q142 110 146 124Q140 138 122 138Q104 136 102 124Z" fill="var(--fi-hole)" ${o(2.2)}/>` +
        `<path d="M110 120H138M114 130H134" stroke="var(--fi-wood-2)" stroke-width="2" stroke-linecap="round"/>` +
        tile(100, 104, -32) + tile(150, 140, 38) + `<path d="M150 104q8 -4 14 0" fill="none" stroke="var(--fi-ink)" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`;
    },
    chimney(st) {
      const bricks = `<path d="M266 84H292M266 98H292M266 112H292M279 72V84M272 84V98M285 84V98M279 98V112" stroke="var(--fi-brick-2)" stroke-width="1.8" stroke-linecap="round"/>`;
      const base = `<path d="M266 70H292V130H266Z" fill="var(--fi-brick)" ${o(2.4)}/>${bricks}<path d="M284 72h7v57h-7z" fill="var(--fi-ink)" opacity=".12"/><rect x="261" y="62" width="36" height="11" rx="4" fill="var(--fi-brick-2)" ${o(2.4)}/>${hl('M264 66h14', 1.8, 0.5)}`;
      if (st !== 'broken') return base + (st === 'fixed' ? star(299, 82, 5, 'var(--fi-glass-2)') : '');
      return base + `<ellipse cx="274" cy="92" rx="6" ry="4" fill="var(--fi-soot)" opacity=".75"/><ellipse cx="286" cy="106" rx="5" ry="3.5" fill="var(--fi-soot)" opacity=".7"/>` +
        `<g class="fi-puff"><circle cx="270" cy="54" r="8" fill="var(--fi-soot)" ${o(2)}/><circle cx="284" cy="48" r="10" fill="var(--fi-soot)" ${o(2)}/><circle cx="297" cy="55" r="7" fill="var(--fi-soot)" ${o(2)}/></g>`;
    },
    glass(st) {
      const mull = `<rect x="119" y="174" width="4" height="48" fill="var(--fi-wood)"/><rect x="90" y="196" width="62" height="4" fill="var(--fi-wood)"/>`;
      if (st !== 'broken') {
        return `<rect x="90" y="174" width="62" height="48" rx="3" fill="var(--fi-glass)"/>` +
          `<path d="M96 192L106 180M98 216L112 200M126 192L136 180" stroke="var(--fi-glass-2)" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>` + mull;
      }
      return `<rect x="90" y="174" width="62" height="48" rx="3" fill="var(--fi-glass)"/>` +
        `<path d="M133 182L146 186L141 200Z" fill="var(--fi-hole)"/>${mull}` +
        `<path d="M133 182L112 190M133 182L128 210M141 200L150 214M141 200L126 198M146 186L151 180" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" fill="none"/>` +
        `<path d="M98 226l5 -6l3 6ZM138 227l6 -5l2 6Z" fill="var(--fi-glass)" ${o(1.4)}/>`;
    },
    curtains(st) {
      if (st !== 'broken') {
        return `<path d="M91 178Q102 200 93 220H105Q104 196 112 178Z" fill="var(--fi-curtain)" ${o(1.8)}/>` +
          `<path d="M151 178Q140 200 149 220H137Q138 196 130 178Z" fill="var(--fi-curtain-2)" ${o(1.8)}/>` +
          `<rect x="88" y="172" width="66" height="9" rx="4.5" fill="var(--fi-curtain)" ${o(1.8)}/><circle cx="100" cy="206" r="2.4" fill="var(--fi-flower-2)"/><circle cx="142" cy="206" r="2.4" fill="var(--fi-flower-2)"/>`;
      }
      return `<path d="M90 268Q86 252 102 246Q110 236 124 244Q140 238 146 252Q154 258 150 268Z" fill="var(--fi-curtain)" ${o(2)}/>` +
        `<path d="M104 256q4 6 2 12M122 250q4 8 0 18M136 254q4 6 2 14" fill="none" stroke="var(--fi-curtain-2)" stroke-width="2" stroke-linecap="round"/>` +
        stick(88, 238, 152, 262, 2.6, 'var(--fi-wood)');
    },
    branch(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') return `<circle cx="31" cy="188" r="6" fill="var(--fi-wood-2)" ${o(2)}/><circle cx="31" cy="188" r="2.5" fill="none" stroke="var(--fi-wood)" stroke-width="1.5"/>`;
      return `<g class="fi-wobble"><path d="M24 180Q84 184 152 220L147 229Q80 198 22 195Z" fill="var(--fi-wood)" ${o(2.4)}/>` +
        `<path d="M68 190l-8 -15M104 202l5 -17M126 214l10 -8" fill="none" ${o(2.4)}/>` +
        `${leaf(60, 173, -30, 'var(--fi-leaf)', 1.5)}${leaf(110, 184, 20, 'var(--fi-leaf-2)', 1.6)}${leaf(138, 205, 60, 'var(--fi-leaf)', 1.4)}${leaf(84, 206, 100, 'var(--fi-leaf-2)', 1.3)}${leaf(46, 198, 70, 'var(--fi-leaf)', 1.2)}</g>`;
    },
    crack(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') return `<path d="M68 282Q82 276 96 282Q100 306 95 330Q81 334 69 328Q64 306 68 282Z" fill="var(--fi-plaster)"/><path d="M72 296q10 -4 20 0M72 314q10 -4 20 0" fill="none" stroke="var(--fi-wall-2)" stroke-width="1.6" stroke-linecap="round"/>`;
      return `<path d="M86 280l-7 11l8 7l-9 12l7 9l-7 13M81 298l-9 4M84 318l8 5" fill="none" ${o(2.4)}/>` +
        `<path d="M68 338l5 -6l5 6ZM90 340l4 -5l5 4Z" fill="var(--fi-wall-2)" ${o(1.4)}/>`;
    },
    paint(st) {
      const blob = 'M112 284Q126 276 142 282Q150 296 144 310Q150 322 138 332Q124 338 114 330Q106 310 112 284Z';
      if (st === 'idle') return '';
      if (st === 'fixed') return `<path d="${blob}" fill="var(--fi-fresh)"/><path d="M128 300c-3 -4 -9 -1 -6 4l6 6l6 -6c3 -5 -3 -8 -6 -4Z" fill="var(--fi-roof)"/><path d="M116 292q4 -5 10 -6" fill="none" stroke="var(--fi-glass-2)" stroke-width="2.4" stroke-linecap="round"/>`;
      return `<path d="${blob}" fill="var(--fi-peel)" ${o(1.8)}/>` +
        `<path d="M114 296H144M112 312H146M115 326H140M126 284V296M134 296V312M122 312V326M132 312V326" stroke="var(--fi-brick-2)" stroke-width="1.6" stroke-linecap="round"/>` +
        `<path d="M142 282q8 -2 8 6q-4 -4 -8 -2ZM110 318q-6 2 -4 8q2 -4 6 -4Z" fill="var(--fi-wall)" ${o(1.3)}/>`;
    },
    fuse(st, S) {
      const lit = S.lit;                               // lampada riparata: corrente di nuovo accesa
      const up = st !== 'fixed' || lit;
      const lever = up ? `<rect x="215" y="206" width="8" height="12" rx="2" fill="${st === 'broken' ? 'var(--fi-valve)' : 'var(--fi-leaf)'}" ${o(1.6)}/>`
        : `<rect x="215" y="220" width="8" height="12" rx="2" fill="var(--fi-metal)" ${o(1.6)}/>`;
      const zap = st === 'broken' ? `<g class="fi-zap"><path d="M240 200l-6 7h5l-5 8" fill="none" stroke="var(--fi-spark)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M200 230l-5 4h4l-4 6" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
      return `<rect x="202" y="198" width="34" height="42" rx="5" fill="var(--fi-metal)" ${o(2.2)}/><rect x="209" y="204" width="20" height="30" rx="3" fill="var(--fi-metal-2)"/>${lever}${zap}`;
    },
    wires(st, S) {
      if (st !== 'broken') {
        return `<path d="M236 164H305" stroke="var(--fi-wire)" stroke-width="3" stroke-linecap="round"/>` +
          `<path d="M219 198V170Q219 164 225 164H236" fill="none" stroke="var(--fi-wire)" stroke-width="3" stroke-linecap="round"/>` +
          [246, 266, 286].map((x) => `<rect x="${x - 3}" y="161" width="6" height="6" rx="1.5" fill="var(--fi-metal)" ${o(1.2)}/>`).join('');
      }
      const sp = S.fuseOff ? '' : `<g class="fi-zap">${star(250, 214, 6, 'var(--fi-spark)')}${star(270, 206, 5, 'var(--fi-spark)')}</g>`;
      return `<path d="M219 198V170Q219 164 225 164H246" fill="none" stroke="var(--fi-wire)" stroke-width="3" stroke-linecap="round"/>` +
        `<g class="fi-dangle"><path d="M248 162C252 176 242 186 250 198S256 208 250 212" fill="none" stroke="var(--fi-wire)" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M262 162C268 172 274 182 268 194S266 202 270 204" fill="none" stroke="var(--fi-valve)" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M250 212l-3 4M250 212l1 5M250 212l4 3M270 204l-2 4M270 204l3 3" stroke="var(--fi-fire)" stroke-width="1.6" stroke-linecap="round"/></g>${sp}`;
    },
    lamp(st) {
      const cord = `<path d="M305 160V190" ${o(2.2)}/>`;
      if (st === 'broken') {
        return `${cord}<g transform="rotate(20 305 190)"><path d="M289 210L296 190H314L321 210Z" fill="var(--fi-roof)" ${o(2.2)}/>` +
          `<circle cx="305" cy="215" r="6" fill="var(--fi-hole)" ${o(1.8)}/><path d="M302 212l3 3l-2 3" fill="none" stroke="var(--fi-glass)" stroke-width="1.4"/></g>` +
          `<path d="M300 336l4 -5l3 5ZM312 337l3 -4l3 4Z" fill="var(--fi-glass)" ${o(1.2)}/>`;
      }
      const on = st === 'fixed';
      return `${cord}${on ? '<circle cx="305" cy="214" r="13" fill="var(--fi-glow)" class="fi-glowdot"/>' : ''}` +
        `<circle cx="305" cy="214" r="6" fill="${on ? 'var(--fi-fire-3)' : 'var(--fi-glass-2)'}" ${o(1.8)}/>` +
        `<path d="M289 210L296 190H314L321 210Z" fill="var(--fi-roof)" ${o(2.2)}/><path d="M298 196H312" stroke="var(--fi-roof-new)" stroke-width="2" stroke-linecap="round"/>`;
    },
    '@pipe': () => `<path d="M212 342V266Q212 262 216 262H280" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M212 342V266Q212 262 216 262H280" fill="none" stroke="var(--fi-metal)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="276" y="255" width="8" height="14" rx="3" fill="var(--fi-metal-2)" ${o(1.8)}/>`,
    valve(st) {
      const wheel = `<circle cx="212" cy="298" r="12" fill="none" stroke="${INK}" stroke-width="7.5"/><circle cx="212" cy="298" r="12" fill="none" stroke="var(--fi-valve)" stroke-width="4"/>` +
        `<path d="M212 287V309M201 298H223" ${o(2.6)}/><circle cx="212" cy="298" r="3.5" fill="var(--fi-valve)" ${o(1.6)}/>`;
      if (st !== 'broken') return `<g transform="rotate(45 212 298)">${wheel}</g>`;
      return `<path d="M212 340V266Q212 262 216 262H274" fill="none" stroke="var(--fi-water-2)" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round" class="fi-flow"/>` +
        `<g class="fi-spin">${wheel}</g>`;
    },
    pipe(st, S) {
      if (st !== 'broken') return `<rect x="246" y="254" width="13" height="16" rx="3.5" fill="var(--fi-metal-2)" ${o(2)}/><circle cx="252.5" cy="262" r="1.8" fill="var(--fi-ink)"/>`;
      const crack = `<path d="M246 259l4 3l-3 2l5 3" fill="none" ${o(1.8)}/>`;
      if (S.waterOff) return crack + `<path d="M251 270q3 4 0 6q-3 -2 0 -6Z" fill="var(--fi-water)" ${o(1.2)}/>`;
      const drop = (x, d) => `<path d="M${x} 270q4 6 0 9q-4 -3 0 -9Z" fill="var(--fi-water)" ${o(1.2)} class="fi-drip" style="animation-delay:${d}s"/>`;
      return crack + `<path d="M252 258q-10 -12 -20 -6M252 258q8 -14 20 -8M252 258q-2 -14 4 -18" fill="none" stroke="var(--fi-water-2)" stroke-width="2.2" stroke-linecap="round" class="fi-spray"/>` +
        drop(250, 0) + drop(256, 0.45) + drop(253, 0.9);
    },
    puddle(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') return star(258, 330, 5, 'var(--fi-glass-2)') + star(270, 334, 3, 'var(--fi-glass-2)');
      return `<path d="M236 334Q238 326 256 326Q262 322 272 326Q286 328 282 334Q276 340 256 339Q236 340 236 334Z" fill="var(--fi-water)" ${o(1.8)}/>` +
        `<ellipse cx="258" cy="332" rx="9" ry="2.4" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.6" class="fi-ripple"/>`;
    },
    fire(st, S) {
      const logs = S.wood ? `<rect x="301" y="326" width="26" height="8" rx="4" transform="rotate(-10 314 330)" fill="var(--fi-wood)" ${o(1.8)}/><rect x="301" y="326" width="26" height="8" rx="4" transform="rotate(12 314 330)" fill="var(--fi-wood-2)" ${o(1.8)}/>` : '';
      const flames = st === 'fixed' ? `<circle cx="314" cy="318" r="18" fill="var(--fi-glow)"/><g class="fi-flame"><path d="M314 332C300 328 300 312 310 298C310 308 318 308 317 316C322 312 322 306 320 302C330 312 332 328 314 332Z" fill="var(--fi-fire-2)" ${o(1.6)}/>` +
        `<path d="M314 330C306 327 307 318 312 312C313 318 318 318 318 322C320 326 318 330 314 330Z" fill="var(--fi-fire)"/><circle cx="314" cy="326" r="2.6" fill="var(--fi-fire-3)"/></g>` : '';
      const cold = st === 'broken' ? `<path d="M302 338Q314 328 326 338Z" fill="var(--fi-stone-2)"/><path d="M299 302q6 2 8 -4M299 310q4 0 6 -4" fill="none" stroke="var(--fi-stone-2)" stroke-width="1.2"/>` : '';
      return `<path d="M288 340V282Q288 272 298 272H330Q340 272 340 282V340Z" fill="var(--fi-stone)" ${o(2.4)}/>` +
        `<path d="M292 290h8M330 286h6M294 316h4M332 312h5M292 332h5" stroke="var(--fi-stone-2)" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M298 340V304A16 16 0 0 1 330 304V340Z" fill="var(--fi-hole)" ${o(2)}/>${cold}${logs}${flames}` +
        `<rect x="284" y="264" width="60" height="9" rx="4" fill="var(--fi-wood)" ${o(2.2)}/>`;
    },
    leaves(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') return `<path d="M52 372q3 -8 6 0M58 372q3 -10 6 0M78 384q3 -8 6 0M84 384q3 -10 6 0" fill="none" stroke="var(--fi-grass-2)" stroke-width="2.2" stroke-linecap="round"/>`;
      const C = ['var(--fi-autumn)', 'var(--fi-autumn-2)', 'var(--fi-autumn-3)'];
      const L = [[52, 384, 20], [62, 378, -40], [74, 382, 80], [86, 386, 10], [94, 380, -60], [58, 370, 60], [70, 368, -10], [82, 372, 40],
        [66, 360, 100], [78, 362, -70], [90, 370, 20], [72, 352, 30], [48, 376, -80]];
      return `<path d="M42 392Q48 356 72 350Q96 356 100 392Z" fill="var(--fi-autumn-2)" ${o(2)}/>` +
        L.map(([x, y, r], i) => leaf(x, y, r, C[i % 3], 1.25)).join('') +
        `<g class="fi-flutter">${leaf(106, 356, 30, 'var(--fi-autumn)', 1.2)}</g>`;
    },
    flowers(st) {
      const bed = `<ellipse cx="127" cy="384" rx="24" ry="8" fill="var(--fi-soil)" ${o(2)}/>`;
      if (st === 'broken') {
        return bed + `<path d="M128 380Q130 366 122 362" fill="none" stroke="var(--fi-leaf-2)" stroke-width="2.4" stroke-linecap="round"/>` +
          `<circle cx="121" cy="363" r="3.5" fill="var(--fi-stone-2)" ${o(1.4)}/><path d="M116 384h4M132 386h5" stroke="var(--fi-wood-2)" stroke-width="2" stroke-linecap="round"/>`;
      }
      const fl = (x, y, c, d) => `<g class="fi-sway" style="animation-delay:${d}s"><path d="M${x} 382V${y}" stroke="var(--fi-leaf-2)" stroke-width="2.4" stroke-linecap="round"/>${leaf(x - 4, y + 12, -60, 'var(--fi-leaf)', 1)}` +
        [0, 72, 144, 216, 288].map((a) => `<circle cx="${(x + 5 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(y + 5 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="4.2" fill="${c}" ${o(1.3)}/>`).join('') +
        `<circle cx="${x}" cy="${y}" r="3" fill="var(--fi-flower-2)" ${o(1)}/></g>`;
      return bed + fl(114, 362, 'var(--fi-flower-1)', 0) + fl(128, 354, 'var(--fi-flower-3)', 0.4) + fl(141, 364, 'var(--fi-flower-1)', 0.8);
    },
  };

  /* ---------- sfondo fisso (stile anime: ombre "cel" piatte, riflessi, paesaggio a strati) ---------- */
  const hl = (d, w = 2.2, op = 0.6) => `<path d="${d}" fill="none" stroke="var(--fi-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const cloud = (x, y, k, cls) => `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${k})">
    <path d="M0 12a12 12 0 0 1 18 -12a16 16 0 0 1 28 6a10 10 0 0 1 2 18H2a10 10 0 0 1 -2 -12Z" fill="var(--fi-cloud)"/>
    <path d="M4 22c8 2 34 2 44 0a10 10 0 0 1-2 2H4z" fill="var(--fi-cloud-2)"/><path d="M8 18c10 3 30 3 40-1-1 3-3 6-6 6H6c-1-1-1.5-3 2-5z" fill="var(--fi-cloud-2)"/>
    ${hl('M10 6a8 8 0 0 1 8-4', 2, 0.9)}</g></g>`;
  const stormCloud = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 14a13 13 0 0 1 19 -13a17 17 0 0 1 30 6a11 11 0 0 1 2 20H2a11 11 0 0 1 -2 -13Z" fill="var(--fi-storm-2)"/>
    <path d="M4 25c10 3 36 3 46 0-1 2-2 2-3 2H5z" fill="var(--fi-storm)"/></g>`;
  const tuft = (x, y, k = 1) => `<path d="M${x - 5 * k} ${y}q${2 * k} ${-8 * k} ${3 * k} ${-10 * k}q${1 * k} ${6 * k} ${2 * k} ${10 * k}q${1 * k} ${-6 * k} ${4 * k} ${-9 * k}q${-1 * k} ${5 * k} 0 ${9 * k}" fill="var(--fi-grass-2)"/>`;
  const daisy = (x, y, c = 'var(--fi-daisy)') => `<g>${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="${x}" cy="${y - 2.6}" rx="1.4" ry="2.4" transform="rotate(${a} ${x} ${y})" fill="${c}"/>`).join('')}<circle cx="${x}" cy="${y}" r="1.4" fill="var(--fi-flower-2)"/></g>`;
  const picket = (x) => `<path d="M${x} 346V318l5 -6l5 6V346Z" fill="var(--fi-fence)" ${o(1.8)}/><path d="M${x + 7} 318V345" stroke="var(--fi-fence-2)" stroke-width="2"/>`;
  function sceneBase() {
    const dots = `<pattern id="fiDots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="2" fill="var(--fi-paper-dot)"/></pattern>`;
    const siding = Array.from({ length: 12 }, (_, i) => `M60 ${178 + i * 13.5}H193`).join('');
    const rain = Array.from({ length: 22 }, (_, i) => { const x = (i * 37) % 420 - 10, y = (i * 53) % 300; return `M${x} ${y}l-7 16`; }).join('');
    return `<defs><linearGradient id="fiSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-sky)"/><stop offset="1" stop-color="var(--fi-sky-2)"/></linearGradient>
      <linearGradient id="fiStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-storm)"/><stop offset="1" stop-color="var(--fi-storm-2)" stop-opacity=".4"/></linearGradient>
      <clipPath id="fiRoofClip"><path d="M34 162L200 50L366 162Z"/></clipPath>${dots}</defs>
      <rect width="400" height="400" fill="url(#fiSky)"/>
      <g class="fi-back"></g>
      <g class="fi-sun"><g class="fi-rays">${Array.from({ length: 10 }, (_, i) => `<path d="M352 ${40 - 27}v-7" transform="rotate(${i * 36} 352 40)" stroke="var(--fi-sun)" stroke-width="3.4" stroke-linecap="round"/>`).join('')}</g>
        <circle cx="352" cy="40" r="20" fill="var(--fi-sun)" ${o(2.4)}/><path d="M371 44a20 20 0 0 1-30 12 22 22 0 0 0 30-12z" fill="var(--fi-sun-2)"/>
        <path d="M345 38q2 -3 4 0M355 38q2 -3 4 0M348 46q4 3 8 0" fill="none" ${o(1.8)}/><ellipse cx="343" cy="45" rx="3" ry="2" fill="var(--fi-flower-1)" opacity=".6"/><ellipse cx="361" cy="45" rx="3" ry="2" fill="var(--fi-flower-1)" opacity=".6"/>${hl('M338 32a15 15 0 0 1 7-7', 2.2, 0.8)}</g>
      ${cloud(56, 38, 1, 'fi-cloud')}${cloud(176, 18, 0.8, 'fi-cloud c2')}
      <g class="fi-storm"><rect width="400" height="300" fill="url(#fiStorm)"/>${stormCloud(-10, 8, 1.6)}${stormCloud(120, -6, 1.3)}${stormCloud(250, 14, 1.7)}
        <path class="fi-bolt" d="M232 40l-10 22h9l-7 18" fill="none" stroke="var(--fi-spark)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
      <path d="M-10 312Q30 236 80 270Q120 222 170 262Q220 214 270 258Q320 226 360 262Q390 240 410 262V330H-10Z" fill="var(--fi-mtn-2)"/>
      <path d="M58 256q22-22 40 -8M150 246q20-22 38-4M252 244q18-20 34-6" fill="none" stroke="var(--fi-hi)" stroke-width="3" stroke-linecap="round" opacity=".45"/>
      <path d="M0 330Q100 292 200 318T400 306V400H0Z" fill="var(--fi-hill)"/>
      ${[[352, 300, 9], [374, 298, 7], [228, 308, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--fi-leaf-2)"/><path d="M${x} ${y + r}v6" stroke="var(--fi-wood-2)" stroke-width="2.4"/>`).join('')}
      ${[0, 14, 28, 42].map(picket).join('')}${[344, 358, 372, 386].map(picket).join('')}
      <path d="M0 326H58M342 326H400M0 338H58M342 338H400" stroke="var(--fi-fence-2)" stroke-width="3"/>
      <path d="M8 346C14 300 12 230 18 168L36 168C32 232 36 300 42 346Z" fill="var(--fi-wood)" ${o(2.4)}/>
      <path d="M30 172C27 232 30 300 36 345H42C36 300 32 232 36 168Z" fill="var(--fi-wood-2)"/><path d="M20 210q4 6 0 12M24 260q4 6 0 12M18 300q3 5 0 10" fill="none" stroke="var(--fi-wood-2)" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="2" cy="120" r="26" fill="var(--fi-leaf-2)" ${o(2.4)}/><circle cx="26" cy="144" r="34" fill="var(--fi-leaf)" ${o(2.4)}/><circle cx="56" cy="120" r="22" fill="var(--fi-leaf)" ${o(2.4)}/>
      <path d="M58 150a34 34 0 0 1-50 24 30 30 0 0 0 26-16 26 26 0 0 0 24-8z" fill="var(--fi-leaf-2)" opacity=".8"/><path d="M76 124a22 22 0 0 1-14 17 18 18 0 0 0 9-15z" fill="var(--fi-leaf-2)" opacity=".8"/>
      ${hl('M8 128a26 26 0 0 1 14-14', 2.6, 0.55)}${hl('M44 108a18 18 0 0 1 10-6', 2.4, 0.55)}
      <circle cx="18" cy="134" r="5" fill="var(--fi-flower-1)" ${o(1.4)}/><circle cx="44" cy="152" r="4" fill="var(--fi-flower-1)" ${o(1.4)}/><circle cx="60" cy="128" r="3.6" fill="var(--fi-flower-1)" ${o(1.3)}/>
      <path d="M0 336Q60 328 120 336T240 336T400 334V400H0Z" fill="var(--fi-grass)"/>
      <path d="M0 372Q90 360 190 374T400 368V400H0Z" fill="var(--fi-grass-3)"/>
      <path d="M0 336Q60 328 120 336T240 336T400 334" fill="none" stroke="var(--fi-grass-2)" stroke-width="2.4"/>
      <ellipse cx="200" cy="343" rx="150" ry="7" fill="var(--fi-shade)"/>
      <rect x="58" y="150" width="284" height="190" fill="var(--fi-wall)" ${o(2.6)}/>
      <path d="${siding}" stroke="var(--fi-wall-2)" stroke-width="1.6" opacity=".8"/>
      <rect x="60" y="326" width="134" height="13" fill="var(--fi-stone)"/><path d="M60 326H194M82 326v13M110 326v13M140 326v13M170 326v13" stroke="var(--fi-stone-2)" stroke-width="1.6"/>
      <rect x="200" y="160" width="140" height="178" fill="var(--fi-paper)"/><rect x="200" y="160" width="140" height="178" fill="url(#fiDots)"/>
      <rect x="200" y="300" width="140" height="22" fill="var(--fi-wainscot)"/><path d="M200 300H340" stroke="var(--fi-wood-2)" stroke-width="2"/>
      <rect x="200" y="322" width="140" height="17" fill="var(--fi-floor)"/><path d="M200 322H340M236 322V339M276 322V339M316 322V339" stroke="var(--fi-floor-2)" stroke-width="1.8"/>
      <rect x="200" y="160" width="140" height="8" fill="var(--fi-shade)"/>
      <circle cx="214" cy="178" r="10" fill="var(--fi-wall)" ${o(2)}/><path d="M214 172v6l4 3" fill="none" ${o(1.8)}/><circle cx="214" cy="178" r="1.4" fill="var(--fi-ink)"/>
      <rect x="290" y="244" width="46" height="5" rx="2" fill="var(--fi-wood)" ${o(1.8)}/>
      <path d="M298 244v-9h9v9" fill="var(--fi-glass)" ${o(1.6)}/><path d="M302.5 235q-3-6 1-9q2 5-1 9" fill="var(--fi-leaf)" ${o(1.2)}/>
      <rect x="314" y="231" width="5" height="13" rx="1" fill="var(--fi-curtain)" ${o(1.4)}/><rect x="319" y="233" width="5" height="11" rx="1" fill="var(--fi-flower-2)" ${o(1.4)}/><rect x="324" y="231" width="5" height="13" rx="1" transform="rotate(12 326 244)" fill="var(--fi-water)" ${o(1.4)}/>
      <rect x="194" y="150" width="8" height="190" fill="var(--fi-wall-2)" ${o(2)}/>
      <rect x="58" y="150" width="284" height="190" fill="none" ${o(2.6)}/>
      <path d="M60 166H340V175H60Z" fill="var(--fi-shade)"/>
      <rect x="84" y="168" width="74" height="60" rx="6" fill="var(--fi-wood)" ${o(2.4)}/>
      <rect x="80" y="226" width="82" height="9" rx="4" fill="var(--fi-wood-2)" ${o(2.2)}/>${hl('M84 228H150', 1.6, 0.5)}
      <path d="M154 340V298A19 19 0 0 1 192 298V340Z" fill="var(--fi-wood)" ${o(2.4)}/>
      <path d="M159 340V300A14 14 0 0 1 187 300V340" fill="none" stroke="var(--fi-wood-2)" stroke-width="2"/>
      <rect x="160" y="314" width="11" height="20" rx="2" fill="none" stroke="var(--fi-wood-2)" stroke-width="1.8"/><rect x="175" y="314" width="11" height="20" rx="2" fill="none" stroke="var(--fi-wood-2)" stroke-width="1.8"/>
      <circle cx="173" cy="296" r="6" fill="var(--fi-glass)" ${o(1.8)}/>${hl('M170 294l3-3', 1.4, 0.9)}
      <path d="M173 306c-2 -3 -6 -1 -4 2l4 4l4 -4c2 -3 -2 -5 -4 -2Z" fill="var(--fi-roof)"/><circle cx="185" cy="322" r="2.6" fill="var(--fi-sun)" ${o(1.4)}/>
      <rect x="152" y="339" width="42" height="6" rx="3" fill="var(--fi-curtain)" ${o(1.6)}/>
      <ellipse cx="172" cy="354" rx="11" ry="4" fill="var(--fi-stone)" ${o(1.6)}/><ellipse cx="166" cy="370" rx="12" ry="4.5" fill="var(--fi-stone)" ${o(1.6)}/><ellipse cx="174" cy="387" rx="13" ry="5" fill="var(--fi-stone)" ${o(1.6)}/>
      <g><path d="M210 396V366" stroke="var(--fi-ink)" stroke-width="6" stroke-linecap="round"/><path d="M210 396V366" stroke="var(--fi-wood)" stroke-width="3" stroke-linecap="round"/>
        <path d="M198 368V356a8 8 0 0 1 8-8h8a8 8 0 0 1 8 8v12Z" fill="var(--fi-mail)" ${o(2)}/><path d="M206 348a8 8 0 0 1 8 8v12" fill="none" ${o(1.6)}/>
        <path d="M222 360h6v-10h-4" fill="none" stroke="var(--fi-valve)" stroke-width="2.6" stroke-linecap="round"/>${hl('M201 357a5 5 0 0 1 4-5', 1.6, 0.8)}</g>
      ${tuft(240, 360)}${tuft(268, 382, 1.2)}${tuft(18, 368)}${tuft(150, 396, 0.9)}${tuft(232, 392, 1.1)}${tuft(280, 352, 0.8)}
      ${daisy(250, 372)}${daisy(26, 384, 'var(--fi-flower-1)')}${daisy(282, 394)}${daisy(190, 360, 'var(--fi-flower-3)')}${daisy(10, 352)}
      <g class="fi-layers"></g>
      <g class="fi-hari">${HH.mascot.mini().replace('<svg class="mini-hari"', '<svg x="290" y="328" width="60" height="60"')}
        <path d="M303 346Q304 328 320 328Q336 328 337 346Z" fill="var(--fi-helmet)" ${o(2)}/><rect x="298" y="344" width="44" height="6" rx="3" fill="var(--fi-helmet-2)" ${o(1.8)}/>
        <path d="M320 328v18" stroke="var(--fi-helmet-2)" stroke-width="2.4"/>${hl('M308 340q1-6 6-9', 1.8, 0.8)}
        <rect x="292" y="380" width="56" height="20" rx="4" fill="var(--fi-box)" ${o(2)}/><path d="M308 380v-5h24v5" fill="none" ${o(2.2)}/>
        <rect x="292" y="380" width="56" height="6" fill="var(--fi-box-2)"/><rect x="315" y="384" width="10" height="5" rx="1.5" fill="var(--fi-metal)" ${o(1.3)}/>${hl('M297 391h18', 1.6, 0.6)}</g>
      <g class="fi-front"></g>
      <g class="fi-weather"><path d="${rain}" stroke="var(--fi-rain)" stroke-width="1.8" stroke-linecap="round"/></g>`;
  }

  /* ---------- card ---------- */
  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <rect x="2" y="2" width="116" height="86" rx="14" fill="var(--fi-sky)"/>
    <g transform="translate(2 4) scale(.62)" opacity=".9">${stormCloud(0, 0, 1)}</g><path d="M10 26l-2 5M17 27l-2 5M24 26l-2 5" stroke="var(--fi-water-2)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M2 64Q30 52 60 62T118 58V76Q118 88 104 88H16Q2 88 2 76Z" fill="var(--fi-mtn-2)"/>
    <path d="M2 72Q60 64 118 72V76Q118 88 104 88H16Q2 88 2 76Z" fill="var(--fi-grass)"/>
    <circle cx="14" cy="50" r="10" fill="var(--fi-leaf)" ${o(1.8)}/><path d="M14 60v14" stroke="var(--fi-wood)" stroke-width="3"/>
    <rect x="30" y="40" width="56" height="34" fill="var(--fi-wall)" ${o(2)}/><path d="M32 47H84M32 54H84M32 61H84M32 68H84" stroke="var(--fi-wall-2)" stroke-width="1.2"/>
    <rect x="70" y="18" width="9" height="16" fill="var(--fi-brick)" ${o(2)}/>
    <path d="M24 42L58 18L92 42Z" fill="var(--fi-roof)" ${o(2)}/><path d="M58 18L92 42H78Z" fill="var(--fi-ink)" opacity=".08"/>${hl('M30 40L56 22', 1.8, 0.5)}
    <rect x="38" y="48" width="16" height="13" rx="2" fill="var(--fi-glass)" ${o(1.8)}/><path d="M50 49l-5 5l3 2l-4 4" fill="none" ${o(1.3)}/>
    <path d="M62 74V60a6 6 0 0 1 12 0V74Z" fill="var(--fi-wood)" ${o(1.8)}/>
    <path d="M40 66l-3 4l3 3" fill="none" ${o(1.4)}/>
    <g transform="translate(88 44) rotate(28) scale(.75)">${TOOL_SVG.hammer}</g>
    <path d="M88 79Q89 67 98 67Q107 67 108 79Z" fill="var(--fi-helmet)" ${o(1.6)}/><rect x="85" y="77" width="26" height="4" rx="2" fill="var(--fi-helmet-2)" ${o(1.4)}/>
    ${star(100, 30, 6, 'var(--fi-sun)')}${star(108, 16, 3.5, 'var(--fi-glass-2)')}
  </svg>`;

  function create(el, ctx, saved) {
    const F = HH.fixit;
    let s;                              // stato (vedi HH.fixit.newState)
    let sel = null, armed = null;       // guasto selezionato / attrezzo scelto per primo
    let alertT = 0, winTimer = 0, alert = null, layerEls = {}, spotEls = {}, toolEls = {}, popId = null;
    let scene, layers, front, back, over, toolsBar;

    const inLevel = (id) => s.problems.some((p) => p.id === id);
    const isFixed = (id) => s.fixed.includes(id);
    const stOf = (id) => (!inLevel(id) ? 'idle' : isFixed(id) ? 'fixed' : 'broken');
    const dead = () => s.mistakes >= LIVES;

    function fresh() {
      s = F.newState(F.generate(ctx.level, Math.random));
      sel = armed = null;
      build();
      ctx.changed({ reset: true });
    }

    /* ---------- DOM ---------- */
    function build() {
      clearTimeout(alertT); clearTimeout(winTimer);
      alert = null;
      const spots = s.problems.map((p) => {
        const [x, y, w, h] = SPOT[p.id];
        return `<button class="fi-spot" data-id="${p.id}" aria-label="${probName(p.id)}" aria-pressed="false" style="left:${x / 4}%;top:${y / 4}%;width:${w / 4}%;height:${h / 4}%"></button>`;
      }).join('');
      const tools = s.tools.map((t) => `<button class="fi-tool" data-tool="${t}" aria-label="${toolName(t)}" aria-pressed="false">${toolIcon(t)}</button>`).join('');
      el.innerHTML = `<div class="fi-wrap">
        <div class="fi-scene" dir="ltr">
          <svg class="fi-art" viewBox="0 0 400 400" aria-hidden="true">${sceneBase()}</svg>
          <svg class="fi-over" viewBox="0 0 400 400" aria-hidden="true"></svg>
          ${spots}
        </div>
        <div class="fi-tools" role="toolbar" dir="ltr">${tools}</div>
      </div>`;
      scene = el.querySelector('.fi-scene');
      layers = el.querySelector('.fi-layers');
      front = el.querySelector('.fi-front');
      back = el.querySelector('.fi-back');
      over = el.querySelector('.fi-over');
      toolsBar = el.querySelector('.fi-tools');
      layers.innerHTML = LAYERS.map((id) => `<g class="fi-g" data-l="${id}"></g>`).join('');
      layerEls = {}; spotEls = {}; toolEls = {};
      layers.querySelectorAll('.fi-g').forEach((g) => { layerEls[g.dataset.l] = g; });
      el.querySelectorAll('.fi-spot').forEach((b) => { spotEls[b.dataset.id] = b; });
      el.querySelectorAll('.fi-tool').forEach((b) => { toolEls[b.dataset.tool] = b; });
      paint();
    }

    function paint() {
      const S = {
        lit: stOf('lamp') === 'fixed',
        fuseOff: stOf('fuse') === 'fixed',
        waterOff: stOf('valve') !== 'broken',
        wood: stOf('branch') !== 'broken',
      };
      LAYERS.forEach((id) => {
        const g = layerEls[id];
        const html = id[0] === '@' ? DRAW[id]() : DRAW[id](stOf(id), S);
        if (g.dataset.html !== html) { g.innerHTML = html; g.dataset.html = html; }
        g.classList.toggle('fi-pop', id === popId);
      });
      const solved = F.isSolved(s);
      const left = s.problems.length - s.fixed.length;
      // vento: foglie che volano finché la casa non è a posto; fumo dal camino acceso; luce della lampada
      let fr = '';
      if (S.lit) fr += '<path d="M296 220L262 322H350L314 220Z" fill="var(--fi-glow)" class="fi-beam"/>';
      if (stOf('fire') === 'fixed') fr += `<g class="fi-smoke"><circle cx="279" cy="50" r="7" fill="var(--fi-smoke)"/><circle cx="288" cy="34" r="9" fill="var(--fi-smoke)" style="animation-delay:.8s"/><circle cx="280" cy="16" r="7" fill="var(--fi-smoke)" style="animation-delay:1.6s"/></g>`;
      if (!solved) {
        const n = Math.min(3, left);
        const W = [[-30, 96, 'var(--fi-autumn)', 0], [-30, 250, 'var(--fi-leaf)', 2.2], [-30, 140, 'var(--fi-autumn-2)', 4.1]];
        fr += W.slice(0, n).map(([x, y, c, d]) => `<g class="fi-blow" style="animation-delay:${d}s"><path d="M${x} ${y}c14 -6 22 0 30 -4" fill="none" stroke="var(--fi-cloud)" stroke-width="2" stroke-linecap="round" opacity=".7"/>${leaf(x + 34, y - 4, 40, c, 1.2)}</g>`).join('');
      }
      front.innerHTML = fr;
      back.innerHTML = solved ? `<g class="fi-rainbow">${['var(--fi-flower-1)', 'var(--fi-flower-2)', 'var(--fi-leaf)', 'var(--fi-water)', 'var(--fi-curtain)']
        .map((c, i) => `<path d="M${30 + i * 9} 200A${170 - i * 9} ${150 - i * 9} 0 0 1 ${370 - i * 9} 200" fill="none" stroke="${c}" stroke-width="9"/>`).join('')}</g>` : '';
      scene.classList.toggle('solved', solved);
      scene.style.setProperty('--storm', (left / Math.max(1, s.problems.length)).toFixed(3));
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
        const [x, y, w] = SPOT[b];
        const cx = Math.min(392, x + w - 4), cy = Math.max(8, y + 4);
        h += `<g class="fi-chain"><circle cx="${cx}" cy="${cy}" r="9"/><rect x="${cx - 6.5}" y="${cy - 3}" width="8" height="6" rx="3" transform="rotate(-35 ${cx} ${cy})"/><rect x="${cx - 1.5}" y="${cy - 3}" width="8" height="6" rx="3" transform="rotate(-35 ${cx} ${cy})"/></g>`;
      });
      if (alert) {
        alert.blockers.forEach((b) => {
          const [x, y, w, hh] = SPOT[b];
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
      g.innerHTML = [0, 60, 120, 180, 240, 300].map((a, i) => `<g style="--dx:${(Math.cos(a * Math.PI / 180) * 30).toFixed(1)}px;--dy:${(Math.sin(a * Math.PI / 180) * 30).toFixed(1)}px">${star(x, y, i % 2 ? 4 : 6, i % 2 ? 'var(--fi-sun)' : 'var(--fi-glass-2)')}</g>`).join('');
      over.appendChild(g);
      setTimeout(() => g.remove(), 900);
    }
    function hari(cls) {
      const h = scene && scene.querySelector('.fi-hari');
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
      s = F.newState({ level: s.level, problems: s.problems, tools: s.tools });
      sel = armed = null; popId = null;
      build();
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
      build();
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
