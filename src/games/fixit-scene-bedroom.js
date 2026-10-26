/* Fix-It House — scenario "cameretta" di Hari: vista frontale della stanza (parete con carta a cuori e stelline,
 * pavimento in parquet in prospettiva). Letto a sinistra, comodino con sveglia sotto la finestra, mensola a destra.
 * Fuori dalla finestra il temporale che si dirada; la penombra (fi-gloom) si schiarisce col progresso.
 * Contratto: vedi fixit-scene-house.js. Colori: token --fi-* e --fi-bedroom-* (fixit-scene-bedroom.css).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const K = HH.fixitKit;
  const { INK, o, stick, leaf, star, hl, sparkle, cloud, stormCloud, hari, addTool } = K;
  const V = (n) => `var(--fi-bedroom-${n})`;
  const f = (n) => +n.toFixed(1);
  const heart = (x, y, s, c, ex = '') => `<path d="M${f(x)} ${f(y + s * 0.9)}C${f(x - s * 1.6)} ${f(y - s * 0.1)} ${f(x - s * 0.8)} ${f(y - s * 1.2)} ${f(x)} ${f(y - s * 0.4)}C${f(x + s * 0.8)} ${f(y - s * 1.2)} ${f(x + s * 1.6)} ${f(y - s * 0.1)} ${f(x)} ${f(y + s * 0.9)}Z" fill="${c}" ${ex}/>`;
  const shade = (d, op = 0.1) => `<path d="${d}" fill="${INK}" opacity="${op}"/>`;

  /* ---------- attrezzi nuovi di questo scenario ---------- */
  addTool('books', `<rect x="6" y="27" width="28" height="8" rx="2" fill="var(--fi-roof)" ${o(2)}/><path d="M28 29V33" stroke="var(--fi-hi)" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="9" y="19" width="23" height="8" rx="2" fill="var(--fi-leaf)" ${o(2)}/><path d="M26 21V25" stroke="var(--fi-hi)" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="7" y="10" width="24" height="9" rx="2" transform="rotate(-7 19 15)" fill="var(--fi-curtain)" ${o(2)}/>` + heart(14, 15, 2.6, 'var(--fi-hi)') +
    sparkle(33, 8, 4, 'var(--fi-sun)'), 'Books');
  addTool('pillow', `<path d="M6 10Q6 5 11 6Q20 9 29 6Q34 5 34 10Q31 20 34 30Q34 35 29 34Q20 31 11 34Q6 35 6 30Q9 20 6 10Z" fill="${V('pillow')}" ${o(2)}/>` +
    `<path d="M10 11Q20 13 30 11M10 29Q20 27 30 29" fill="none" stroke="${V('pillow-2')}" stroke-width="1.6" stroke-dasharray="2 2.4" stroke-linecap="round"/>` +
    heart(20, 21, 4.4, V('pillow-2'), o(1.4)) + hl('M10 15q2 -3 6 -3', 1.8, 0.8), 'Pillow');
  addTool('blanket', `<rect x="5" y="20" width="30" height="13" rx="5" fill="${V('blanket-2')}" ${o(2)}/>` +
    `<rect x="5" y="9" width="30" height="14" rx="5" fill="${V('blanket')}" ${o(2)}/><rect x="5" y="9" width="30" height="14" rx="5" fill="url(#fiBrDotsT)"/>` +
    `<path d="M9 27H31" stroke="${V('blanket-dot')}" stroke-width="1.6" stroke-dasharray="1.5 3" stroke-linecap="round"/>` +
    `<defs><pattern id="fiBrDotsT" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="${V('blanket-dot')}"/><circle cx="6" cy="6" r="1.5" fill="${V('blanket-dot')}"/></pattern></defs>` +
    `<path d="M16 9V33M24 9V33" stroke="var(--fi-curtain)" stroke-width="3"/><path d="M16 9V33M24 9V33" stroke="${INK}" stroke-width="1" opacity=".3"/>` + hl('M9 13h8', 1.8, 0.8), 'Blanket');
  addTool('battery', `<rect x="5" y="12" width="27" height="16" rx="4" fill="var(--fi-metal)" ${o(2)}/><rect x="32" y="16" width="4" height="8" rx="1.5" fill="var(--fi-metal-2)" ${o(1.6)}/>` +
    `<rect x="8" y="15" width="7" height="10" rx="1.5" fill="var(--fi-leaf)"/><rect x="16" y="15" width="6" height="10" rx="1.5" fill="var(--fi-leaf)"/><rect x="23" y="15" width="6" height="10" rx="1.5" fill="var(--fi-leaf-2)"/>` +
    `<path d="M20 6l-4 6h4l-3 5" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M9 33h5M11.5 30.5v5" ${o(1.8)}/>` + hl('M8 14h10', 1.6, 0.7), 'Battery');

  /* ---------- zone toccabili (scena 400×400) ---------- */
  const SPOT = {
    window: [180, 70, 56, 62], curtain: [104, 62, 46, 76], crack: [34, 124, 52, 48], paint: [300, 166, 62, 52],
    shelf: [298, 104, 66, 46], clock: [170, 194, 52, 46], blanket: [30, 226, 62, 46], pillows: [76, 298, 46, 40],
    bed: [124, 280, 46, 46], books: [266, 288, 54, 44], lamp: [328, 288, 56, 44], carpet: [176, 340, 80, 40], plant: [264, 340, 56, 42],
  };
  const LAYERS = ['crack', 'paint', 'window', 'curtain', 'carpet', 'shelf', 'books', 'plant', 'lamp', 'clock', 'bed', 'blanket', 'pillows'];
  const BED_T = 'rotate(8 20 318)';       // letto storto quando manca la gamba destra
  const SHELF_T = 'rotate(16 284 126)';   // mensola appesa a un solo staffa
  const tilt = (on, t, svg) => (on ? `<g transform="${t}">${svg}</g>` : svg);

  /* ---------- pezzi riutilizzati ---------- */
  function lampArt(lit) {
    return (lit ? `<circle cx="373" cy="110" r="5" fill="var(--fi-fire-3)" ${o(1.4)}/>` : `<circle cx="373" cy="110" r="4.5" fill="var(--fi-glass-2)" ${o(1.4)}/>`) +
      `<ellipse cx="373" cy="121" rx="10" ry="3.5" fill="${V('stand-2')}" ${o(2)}/><rect x="370.5" y="104" width="5" height="16" rx="2" fill="${V('stand')}" ${o(1.8)}/>` +
      `<path d="M357 106Q356 86 373 84Q390 86 389 106Q385 110 381 106Q377 110 373 106Q369 110 365 106Q361 110 357 106Z" fill="var(--fi-curtain)" ${o(2.2)}/>` +
      `<circle cx="366" cy="96" r="2" fill="var(--fi-hi)" opacity=".8"/><circle cx="378" cy="92" r="2" fill="var(--fi-hi)" opacity=".8"/><circle cx="383" cy="100" r="1.8" fill="var(--fi-hi)" opacity=".8"/>` +
      shade('M381 89Q389 94 389 106Q385 110 381 106Z', 0.12) + hl('M362 98q1 -8 8 -11', 1.8, 0.7) + star(373, 81, 3.6, 'var(--fi-sun)');
  }
  const SHELF_BOOKS = [[285, 92, 9, 'var(--fi-curtain)'], [295, 86, 8, 'var(--fi-roof)'], [304, 96, 10, 'var(--fi-leaf)'], [315, 90, 7, 'var(--fi-water)']];
  function booksArt() {
    return SHELF_BOOKS.map(([x, y, w, c], i) => `<rect x="${x}" y="${y}" width="${w}" height="${122 - y}" rx="1.6" fill="${c}" ${o(1.8)}/>` +
      `<path d="M${x + 1.5} ${y + 5}H${x + w - 1.5}M${x + 1.5} ${118}H${x + w - 1.5}" stroke="var(--fi-hi)" stroke-width="1.4" opacity=".75"/>` +
      (i === 2 ? heart(x + w / 2, y + 14, 2.2, 'var(--fi-hi)') : `<rect x="${x + 2}" y="${y + 10}" width="${w - 4}" height="5" rx="1" fill="${INK}" opacity=".12"/>`)).join('') +
      `<rect x="323" y="98" width="8" height="24" rx="1.6" transform="rotate(16 327 122)" fill="var(--fi-flower-3)" ${o(1.8)}/>` +
      `<path d="M286 76Q290 70 296 74Q300 70 304 76L295 86Z" fill="var(--fi-flower-1)" ${o(1.4)}/>`;
  }
  function plantArt() {
    return `<path d="M339 112Q330 130 335 146Q338 156 332 164" fill="none" stroke="var(--fi-leaf-2)" stroke-width="2" stroke-linecap="round"/>` +
      leaf(334, 132, 30, 'var(--fi-leaf)', 1) + leaf(336, 148, -30, 'var(--fi-leaf-2)', 0.95) + leaf(333, 162, 20, 'var(--fi-leaf)', 0.85) +
      leaf(339, 100, -40, 'var(--fi-leaf)', 1.3) + leaf(350, 98, 35, 'var(--fi-leaf-2)', 1.3) + leaf(344, 93, 0, 'var(--fi-leaf)', 1.35) +
      `<path d="M334 108H354L351 122H337Z" fill="var(--fi-brick)" ${o(2)}/><rect x="332" y="105" width="24" height="5" rx="2" fill="var(--fi-brick-2)" ${o(1.6)}/>` +
      heart(344, 115, 2.6, 'var(--fi-hi)') + shade('M348 110H354L351 122H346Z', 0.12);
  }

  /* ---------- disegni dei guasti ---------- */
  const DRAW = {
    crack(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') {
        return `<path d="M50 132Q58 124 70 130Q80 128 80 140Q86 150 78 160Q76 172 62 168Q50 172 46 160Q38 148 46 142Q42 134 50 132Z" fill="var(--fi-plaster)"/>` +
          `<path d="M50 140q10 -5 22 -2M48 152q12 -4 26 0M54 162q8 -3 16 0" fill="none" stroke="var(--fi-hi)" stroke-width="2" stroke-linecap="round" opacity=".8"/>` +
          heart(70, 158, 2.4, 'var(--fi-flower-1)') + sparkle(82, 130, 4, 'var(--fi-hi)') + sparkle(44, 164, 2.6, 'var(--fi-sun)');
      }
      return `<path d="M62 126l-6 10l7 6l-8 10l6 8l-5 10M57 142l-9 3M60 158l9 4M63 136l7 -3" fill="none" ${o(2.4)}/>` +
        `<path d="M58 134l5 7l-2 1ZM54 152l6 7l-2 1Z" fill="var(--fi-hole)" opacity=".5"/>` +
        `<g class="fi-drip" style="animation-delay:.3s"><path d="M56 168l3 -4l3 4Z" fill="${V('wall-2')}" ${o(1.2)}/></g>` +
        `<g class="fi-drip" style="animation-delay:1s"><circle cx="66" cy="168" r="1.8" fill="${V('wall-2')}" ${o(1)}/></g>`;
    },
    paint(st) {
      const blob = 'M304 172Q322 164 344 170Q362 172 360 192Q362 212 344 216Q320 220 306 214Q298 194 304 172Z';
      if (st === 'idle') return '';
      if (st === 'fixed') {
        return `<path d="${blob}" fill="url(#fiBrWallG)"/><path d="${blob}" fill="url(#fiBrPaper)"/>` + hl('M310 178q10 -6 24 -6', 2.4, 0.7) +
          sparkle(352, 178, 5, 'var(--fi-hi)') + sparkle(310, 208, 3.4, 'var(--fi-sun)');
      }
      return `<path d="${blob}" fill="${V('faded')}" ${o(1.8)}/>` +
        `<path d="M312 186q8 6 18 0q6 -4 14 2M314 204q10 -6 22 2" fill="none" stroke="var(--fi-stone-2)" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>` +
        `<ellipse cx="344" cy="200" rx="7" ry="5" fill="var(--fi-stone-2)" opacity=".45"/><ellipse cx="320" cy="180" rx="5" ry="3.5" fill="var(--fi-stone-2)" opacity=".4"/>` +
        `<g class="fi-flutter"><path d="M344 170q12 -4 14 8q-6 -4 -14 -2Z" fill="${V('wall-2')}" ${o(1.4)}/></g>` +
        `<path d="M304 210q-6 4 -2 10q2 -6 8 -6Z" fill="${V('wall-2')}" ${o(1.3)}/>`;
    },
    window(st) {
      const mull = `<rect x="198" y="40" width="4" height="94" fill="${V('trim')}" ${o(1.4)}/><rect x="156" y="85" width="88" height="4" fill="${V('trim')}" ${o(1.4)}/>` +
        `<circle cx="200" cy="96" r="2.6" fill="var(--fi-flower-1)" ${o(1.2)}/>`;
      if (st !== 'broken') {
        return `<rect x="156" y="40" width="88" height="94" fill="var(--fi-glass)" opacity=".22"/>` +
          `<path d="M162 70L180 50M166 80L190 56M206 74L224 54M208 128L232 104M164 126L176 114" stroke="var(--fi-glass-2)" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>` +
          mull + (st === 'fixed' ? sparkle(236, 50, 5, 'var(--fi-hi)') + sparkle(166, 120, 3.4, 'var(--fi-hi)') : '');
      }
      const hole = 'M214 98L222 93L227 100L236 98L234 110L238 118L226 122L220 116L211 118L213 108Z';
      return `<path d="M156 40H244V134H156Z${hole}" fill="var(--fi-glass)" opacity=".42" fill-rule="evenodd"/>` +
        `<path d="${hole}" fill="var(--fi-hole)" opacity=".35"/><path d="${hole}" fill="none" stroke="var(--fi-glass-2)" stroke-width="3.4" stroke-linejoin="round"/><path d="${hole}" fill="none" ${o(1.6)}/>` +
        `<path d="M222 93L218 88M236 98L244 94M238 118L244 128M226 122L230 133M211 118L202 128M213 108L202 104M220 116L210 132" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` +
        `<path d="M166 80L186 58M164 126L176 114" stroke="var(--fi-glass-2)" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` + mull +
        `<g class="fi-bedroom-gust"><path d="M222 110l-10 14M230 112l-9 13M216 118l-8 11M226 124l-8 12M214 132l-7 10" stroke="var(--fi-water-2)" stroke-width="2.2" stroke-linecap="round"/></g>` +
        `<path d="M168 142l5 -6l3 6ZM226 143l6 -5l2 5ZM240 142l3 -4l3 4Z" fill="var(--fi-glass)" ${o(1.3)}/>`;
    },
    curtain(st, S) {
      const rod = stick(120, 30, 280, 30, 3, 'var(--fi-wood)');
      const fin = heart(117, 31, 4, 'var(--fi-flower-1)', o(1.4)) + heart(283, 31, 4, 'var(--fi-flower-1)', o(1.4));
      if (st !== 'broken') {
        let sc = 'M118 24H282V38';
        for (let x = 282; x > 119; x -= 16.4) sc += `a8.2 7 0 0 1 -16.4 0`;
        const L = 'M124 34H166Q160 74 150 102Q160 128 162 156Q144 160 126 156Q130 128 138 102Q126 70 124 34Z';
        const R = 'M276 34H234Q240 74 250 102Q240 128 238 156Q256 160 274 156Q270 128 262 102Q274 70 276 34Z';
        const side = (d, x, c2) => `<path d="${d}" fill="var(--fi-curtain)" ${o(2)}/>` +
          `<path d="M${x} 40Q${x + 2} 70 ${x + 1} 98M${x} 112Q${x + 1} 136 ${x - 2} 154" fill="none" stroke="${c2}" stroke-width="2" stroke-linecap="round"/>`;
        const bow = (x) => `<path d="M${x} 102l-8 -5v10ZM${x} 102l8 -5v10Z" fill="${V('blanket')}" ${o(1.4)}/><circle cx="${x}" cy="102" r="2.6" fill="${V('blanket-2')}" ${o(1.2)}/>`;
        const cur = side(L, 140, 'var(--fi-curtain-2)') + side(R, 260, 'var(--fi-curtain-2)') +
          shade('M150 102Q160 128 162 156Q154 158 148 158Q154 130 146 104Z', 0.1) + shade('M262 102Q270 128 274 156Q268 158 262 158Q264 130 256 104Z', 0.1) + bow(144) + bow(256);
        const flap = !S.winBroken ? cur : `<g class="fi-bedroom-billow">${cur}</g>`;
        return rod + fin + flap + `<path d="${sc}Z" fill="var(--fi-curtain)" ${o(2)}/>` +
          `<path d="M122 30H278" stroke="var(--fi-curtain-2)" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/>` +
          Array.from({ length: 10 }, (_, i) => `<circle cx="${f(273.8 - i * 16.4)}" cy="45" r="1.6" fill="var(--fi-hi)"/>`).join('') +
          (st === 'fixed' ? sparkle(170, 22, 4, 'var(--fi-sun)') : '');
      }
      return stick(276, 30, 114, 118, 3, 'var(--fi-wood)') + heart(283, 31, 4, 'var(--fi-flower-1)', o(1.4)) +
        `<path d="M118 28h4M120 26v4" ${o(1.6)}/>` +
        `<path d="M276 30Q240 62 214 64Q190 70 164 86Q150 96 140 104L146 112Q170 100 196 82Q230 66 270 40Z" fill="var(--fi-curtain)" ${o(1.8)}/>` +
        `<g class="fi-dangle"><path d="M112 112Q128 102 148 114Q154 140 148 170Q130 178 108 168Q104 140 112 112Z" fill="var(--fi-curtain)" ${o(2)}/>` +
        `<path d="M120 120q4 22 0 46M132 116q4 26 2 54M142 118q4 22 0 46" fill="none" stroke="var(--fi-curtain-2)" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M108 168q8 6 14 0q8 6 14 0q6 6 12 2" fill="none" stroke="var(--fi-hi)" stroke-width="2" stroke-linecap="round"/></g>`;
    },
    carpet(st, S) {
      let s = `<ellipse cx="220" cy="361" rx="94" ry="23" fill="${INK}" opacity=".1"/>` +
        `<ellipse cx="220" cy="358" rx="92" ry="22" fill="${V('carpet')}" ${o(2.2)}/>` +
        shade('M128 358A92 22 0 0 0 312 358A92 15 0 0 1 128 358Z', 0.1) +
        `<ellipse cx="220" cy="357" rx="76" ry="15" fill="none" stroke="${V('carpet-2')}" stroke-width="2.4" stroke-dasharray="1 6" stroke-linecap="round"/>` +
        `<ellipse cx="220" cy="357" rx="58" ry="10" fill="none" stroke="var(--fi-hi)" stroke-width="1.6" opacity=".55"/>` +
        heart(220, 357, 4.4, V('carpet-2')) + heart(178, 352, 2.8, 'var(--fi-hi)') + heart(262, 352, 2.8, 'var(--fi-hi)') +
        `<path d="M128 352l-6 -2M127 358h-7M128 364l-6 2M312 352l6 -2M313 358h7M312 364l6 2" ${o(1.6)}/>` + hl('M150 346q30 -9 60 -10', 2.2, 0.55);
      if (st === 'fixed') s += sparkle(196, 346, 4.4, 'var(--fi-hi)') + sparkle(246, 368, 3.4, 'var(--fi-hi)');
      if (st !== 'broken') return s;
      s += `<path d="M150 354Q168 340 198 346Q228 338 252 350Q262 362 238 370Q208 378 176 372Q148 368 150 354Z" fill="${V('wet')}"/>` +
        `<path d="M232 288Q246 292 242 312Q238 330 226 344L214 342Q228 326 230 310Q232 298 226 290Z" fill="${V('wet')}"/>` +
        `<path d="M230 150Q226 180 232 204Q236 230 230 256Q228 272 234 282H244Q240 262 244 240Q248 210 242 184Q240 166 244 150Z" fill="${V('wet')}"/>` +
        `<path d="M238 160q-3 30 2 60" fill="none" stroke="var(--fi-hi)" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>` +
        `<ellipse cx="212" cy="358" rx="14" ry="3.4" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.6" class="fi-ripple"/>` +
        `<ellipse cx="182" cy="362" rx="8" ry="2.4" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.4" class="fi-ripple" style="animation-delay:.9s"/>`;
      if (S.winBroken) {
        const drop = (x, y, d) => `<path d="M${x} ${y}q4 6 0 9q-4 -3 0 -9Z" fill="var(--fi-water)" ${o(1.2)} class="fi-drip" style="animation-delay:${d}s"/>`;
        s += drop(236, 150, 0) + drop(237, 200, 0.5) + drop(236, 246, 0.9) + drop(232, 290, 0.3);
      }
      return s;
    },
    shelf(st) {
      const board = `<rect x="280" y="122" width="110" height="9" rx="3" fill="${V('stand')}" ${o(2.2)}/>` + shade('M282 127H388V130H282Z', 0.14) + hl('M286 125H330', 1.6, 0.7);
      const brk = (x) => `<path d="M${x} 131H${x + 16}Q${x + 14} 143 ${x + 2} 150Z" fill="var(--fi-flower-1)" ${o(1.8)}/><circle cx="${x + 5}" cy="136" r="1.4" fill="${INK}"/>`;
      if (st !== 'broken') return brk(292) + brk(364) + board + (st === 'fixed' ? sparkle(394, 118, 4.4, 'var(--fi-sun)') + sparkle(296, 154, 3.2, 'var(--fi-hi)') : '');
      return brk(292) + `<circle cx="370" cy="136" r="2" fill="var(--fi-hole)"/><circle cx="372" cy="146" r="2" fill="var(--fi-hole)"/>` +
        `<g transform="${SHELF_T}"><g class="fi-bedroom-creak">${board}</g></g>` +
        `<g transform="rotate(70 308 326)"><path d="M300 322H316Q314 334 302 341Z" fill="var(--fi-flower-1)" ${o(1.8)}/></g>` +
        `<path d="M318 330l6 -2M321 327l1 4" ${o(1.6)}/>` +
        `<path d="M392 142q-4 6 0 12M388 150q-3 4 0 8" fill="none" ${o(1.6)} opacity=".6"/>`;
    },
    books(st, S) {
      if (st !== 'broken') return tilt(S.shelfBroken, SHELF_T, booksArt()) + (st === 'fixed' ? sparkle(300, 80, 4, 'var(--fi-hi)') : '');
      return `<rect x="268" y="318" width="30" height="9" rx="2" transform="rotate(-6 283 322)" fill="var(--fi-roof)" ${o(1.8)}/>` +
        `<path d="M272 320h22" stroke="var(--fi-hi)" stroke-width="1.4" opacity=".7" transform="rotate(-6 283 322)"/>` +
        `<rect x="300" y="300" width="8" height="26" rx="1.6" transform="rotate(-28 304 326)" fill="var(--fi-water)" ${o(1.8)}/>` +
        `<rect x="292" y="320" width="24" height="8" rx="2" transform="rotate(12 304 324)" fill="var(--fi-leaf)" ${o(1.8)}/>` +
        `<path d="M276 308Q284 301 293 307Q302 301 311 308L309 316Q300 311 293 316Q285 311 278 316Z" fill="${V('sheet')}" ${o(1.8)}/>` +
        `<path d="M293 307V316M282 307q5 -2 9 1M296 308q5 -3 10 0" fill="none" stroke="${V('sheet-2')}" stroke-width="1.3" stroke-linecap="round"/>` +
        `<g class="fi-flutter"><path d="M314 296l7 -3l1 7l-6 2Z" fill="${V('sheet')}" ${o(1.2)}/></g>`;
    },
    plant(st, S) {
      if (st !== 'broken') return tilt(S.shelfBroken, SHELF_T, plantArt()) + (st === 'fixed' ? sparkle(360, 92, 4, 'var(--fi-sun)') : '');
      return `<path d="M268 370Q280 356 300 360Q318 364 314 376Q292 386 270 380Z" fill="var(--fi-soil)" ${o(1.6)}/>` +
        `<circle cx="282" cy="372" r="1.6" fill="${INK}" opacity=".4"/><circle cx="300" cy="376" r="1.4" fill="${INK}" opacity=".4"/>` +
        `<path d="M290 366Q300 356 314 356" fill="none" stroke="var(--fi-leaf-2)" stroke-width="2" stroke-linecap="round"/>` +
        leaf(298, 360, 70, 'var(--fi-leaf)', 1.1) + leaf(308, 353, 120, 'var(--fi-leaf-2)', 1.1) + leaf(316, 360, 90, 'var(--fi-leaf)', 1) +
        `<path d="M266 352l8 -6l4 9ZM304 344l9 -2l-2 8ZM280 344l5 -4l3 6Z" fill="var(--fi-brick)" ${o(1.4)}/>` +
        `<g class="fi-flutter">${leaf(272, 348, -20, 'var(--fi-leaf)', 1)}</g>`;
    },
    lamp(st, S) {
      if (st !== 'broken') return tilt(S.shelfBroken, SHELF_T, lampArt(st === 'fixed'));
      return `<path d="M334 322Q350 296 392 300" fill="none" stroke="var(--fi-wire)" stroke-width="2.4" stroke-linecap="round"/>` +
        `<g class="fi-wobble"><g transform="translate(340 322) rotate(78) translate(-373 -120)">${lampArt(false)}</g></g>` +
        `<path d="M350 330l4 -4l2 4ZM362 332l3 -3l2 3Z" fill="var(--fi-glass)" ${o(1.1)}/>`;
    },
    clock(st) {
      const on = st !== 'broken';
      const body = `<path d="M184 232l-4 6M200 232l4 6" ${o(2.4)}/>` +
        `<circle cx="180" cy="203" r="6" fill="${V('clock-2')}" ${o(2)}/><circle cx="204" cy="203" r="6" fill="${V('clock-2')}" ${o(2)}/>` +
        `<path d="M184 200Q192 194 200 200" fill="none" ${o(2)}/><circle cx="192" cy="196" r="2" fill="var(--fi-sun)" ${o(1.2)}/>` +
        `<circle cx="192" cy="218" r="14.5" fill="${V('clock')}" ${o(2.2)}/>` +
        `<circle cx="192" cy="218" r="10.5" fill="${on ? V('sheet') : 'var(--fi-stone)'}" ${o(1.4)}/>` +
        `<path d="M192 209v2M201 218h-2M192 227v-2M183 218h2" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` +
        shade('M203 212A14.5 14.5 0 0 1 192 232.5A14.5 14.5 0 0 0 206.5 218A14.5 14.5 0 0 0 203 212Z', 0.14) + hl('M182 210a12 12 0 0 1 6 -5', 1.6, 0.8);
      if (on) {
        return body + `<path d="M192 218l-5 -4M192 218l5 -6" ${o(1.8)}/>` +
          `<g class="fi-bedroom-tick"><path d="M192 218V209.5" stroke="var(--fi-valve)" stroke-width="1.2" stroke-linecap="round"/></g><circle cx="192" cy="218" r="1.6" fill="${INK}"/>` +
          (st === 'fixed' ? `<g class="fi-bedroom-blink"><path d="M172 200q-3 -4 0 -8M212 200q3 -4 0 -8" fill="none" ${o(1.6)}/></g>` + sparkle(214, 212, 3.6, 'var(--fi-sun)') : '');
      }
      return `<g transform="rotate(-12 192 238)">${body}<path d="M192 218l-1 7M192 218l-4 6" ${o(1.8)}/><circle cx="192" cy="218" r="1.6" fill="${INK}"/></g>` +
        `<g class="fi-spray"><rect x="205" y="190" width="14" height="9" rx="2" fill="var(--fi-metal)" ${o(1.4)}/><rect x="219" y="192.5" width="2.4" height="4" fill="${INK}"/><rect x="207" y="192" width="3" height="5" rx=".8" fill="var(--fi-valve)"/></g>` +
        `<path d="M176 214q-3 -1 -4 2" fill="none" ${o(1.2)} opacity=".6"/>`;
    },
    bed(st) {
      const broken = st === 'broken';
      const frame = `<rect x="26" y="234" width="112" height="28" rx="10" fill="${V('sheet')}" ${o(2.2)}/>` +
        `<path d="M40 238V258M56 236V260M72 236V260M88 236V260M104 236V260M120 238V258" stroke="${V('sheet-2')}" stroke-width="2" opacity=".7"/>` +
        `<rect x="22" y="260" width="120" height="22" rx="6" fill="${V('bed')}" ${o(2.4)}/>` +
        `<rect x="30" y="265" width="48" height="12" rx="4" fill="none" stroke="${V('bed-2')}" stroke-width="1.8"/><rect x="86" y="265" width="48" height="12" rx="4" fill="none" stroke="${V('bed-2')}" stroke-width="1.8"/>` +
        heart(54, 271, 2.4, 'var(--fi-flower-1)') + heart(110, 271, 2.4, 'var(--fi-flower-1)') + shade('M24 276H140V280Q140 282 136 282H28Q24 282 24 278Z', 0.14) +
        // pediera (sinistra) e testiera (destra) con cuore
        `<path d="M10 318V234Q10 220 20 220Q30 220 30 234V318Z" fill="${V('bed')}" ${o(2.4)}/>` + `<circle cx="20" cy="217" r="6" fill="${V('bed-2')}" ${o(2)}/>` +
        shade('M25 226Q30 230 30 236V318H25Z', 0.12) + hl('M14 236V300', 1.8, 0.6) +
        `<path d="M136 294V196Q136 176 149 176Q162 176 162 196V294Z" fill="${V('bed')}" ${o(2.4)}/>` + `<circle cx="149" cy="172" r="6" fill="${V('bed-2')}" ${o(2)}/>` +
        heart(149, 206, 6, 'var(--fi-flower-1)', o(1.6)) + shade('M155 180Q162 186 162 196V294H155Z', 0.12) + hl('M140 200V280', 1.8, 0.6);
      const leg = `<rect x="141" y="292" width="16" height="26" rx="4" fill="${V('bed-2')}" ${o(2.2)}/>`;
      const foot = `<rect x="11" y="292" width="18" height="26" rx="4" fill="${V('bed-2')}" ${o(2.2)}/>`;
      const shadow = `<ellipse cx="84" cy="320" rx="82" ry="6" fill="var(--fi-shade)"/>`;
      if (!broken) return shadow + foot + leg + frame + (st === 'fixed' ? sparkle(166, 300, 5, 'var(--fi-sun)') + sparkle(132, 314, 3.4, 'var(--fi-hi)') : '');
      return shadow + `<g transform="${BED_T}">${foot}${frame}<path d="M141 292l4 5l4 -4l4 5l4 -4" fill="none" ${o(2)}/></g>` +
        `<g transform="rotate(-8 131 320)"><rect x="118" y="314" width="26" height="12" rx="4" fill="${V('bed-2')}" ${o(2.2)}/><path d="M144 314l-3 4l3 4l-3 4" fill="none" ${o(1.6)}/></g>` +
        `<g class="fi-bedroom-blink"><path d="M164 268q6 2 8 8M166 258q8 3 10 11" fill="none" ${o(1.6)}/></g>`;
    },
    blanket(st, S) {
      const tilted = S.bedBroken;
      if (st !== 'broken') {
        const d = 'M24 238Q60 230 106 234L110 236V284Q72 294 24 288Z';
        let sc = '';
        for (let x = 24; x < 108; x += 14) sc += `<circle cx="${x + 7}" cy="${f(288.6 - (x - 24) * 0.05)}" r="3" fill="${V('blanket-dot')}" ${o(1.2)}/>`;
        const art = `<path d="${d}" fill="${V('blanket')}" ${o(2.2)}/><path d="${d}" fill="url(#fiBrDots)"/>` +
          shade('M24 268Q66 274 110 268V284Q72 294 24 288Z', 0.12) + sc +
          `<path d="M94 233Q102 232 112 235V287Q103 288 94 290Z" fill="${V('sheet')}" ${o(1.8)}/><path d="M98 240V284" stroke="${V('sheet-2')}" stroke-width="1.6"/>` +
          hl('M30 240Q60 234 88 236', 2.2, 0.7);
        return tilt(tilted, BED_T, art) + (st === 'fixed' ? sparkle(64, 226, 4.4, 'var(--fi-sun)') : '');
      }
      const heap = 'M18 250Q20 228 40 230Q52 220 66 230Q84 226 88 242Q96 256 84 266L80 296Q66 306 54 298Q42 312 30 300Q16 294 22 278Z';
      return tilt(tilted, BED_T, `<path d="${heap}" fill="${V('blanket')}" ${o(2.2)}/><path d="${heap}" fill="url(#fiBrDots)"/>` +
        `<path d="M34 240q10 6 22 2M48 252q14 8 30 0M30 268q10 8 22 4M60 280q8 6 16 0" fill="none" stroke="${V('blanket-2')}" stroke-width="2.2" stroke-linecap="round"/>` +
        shade('M22 278Q40 286 80 280L80 296Q66 306 54 298Q42 312 30 300Q16 294 22 278Z', 0.12) + hl('M30 236q8 -6 20 -4', 2, 0.7) +
        `<g class="fi-sway"><path d="M84 266Q96 286 92 312Q84 316 78 310Q84 290 80 270Z" fill="${V('blanket-2')}" ${o(1.8)}/></g>`);
    },
    pillows(st, S) {
      if (st !== 'broken') {
        const art = `<path d="M102 236Q98 222 106 214Q122 208 138 214Q144 224 140 236Q122 242 102 236Z" fill="${V('pillow')}" ${o(2.2)}/>` +
          `<path d="M106 230Q120 234 136 230" fill="none" stroke="${V('pillow-2')}" stroke-width="1.6" stroke-dasharray="2 2.6" stroke-linecap="round"/>` +
          shade('M130 212Q140 214 140 236Q134 238 128 238Q136 226 130 212Z', 0.1) + hl('M108 220q6 -6 16 -6', 1.8, 0.8) +
          heart(90, 230, 9, V('pillow-2'), o(2)) + hl('M84 224q2 -3 5 -3', 1.6, 0.8);
        return tilt(S.bedBroken, BED_T, art) + (st === 'fixed' ? sparkle(126, 204, 4, 'var(--fi-hi)') : '');
      }
      return `<ellipse cx="99" cy="334" rx="26" ry="4" fill="var(--fi-shade)"/>` +
        `<g transform="rotate(-14 98 318)"><path d="M78 328Q74 314 82 306Q98 300 114 306Q120 316 116 328Q98 334 78 328Z" fill="${V('pillow')}" ${o(2.2)}/>` +
        `<path d="M82 322Q96 326 112 322" fill="none" stroke="${V('pillow-2')}" stroke-width="1.6" stroke-dasharray="2 2.6" stroke-linecap="round"/>${hl('M84 312q6 -5 14 -5', 1.8, 0.8)}</g>` +
        `<g transform="rotate(24 114 326)">${heart(114, 326, 7.5, V('pillow-2'), o(1.8))}</g>` +
        `<g class="fi-flutter"><path d="M86 298q4 -6 8 0q-4 3 -8 0Z" fill="var(--fi-hi)" ${o(1)}/></g>` +
        `<g class="fi-flutter" style="animation-delay:.7s"><path d="M112 300q3 -5 7 0q-3 3 -7 0Z" fill="var(--fi-hi)" ${o(1)}/></g>`;
    },
  };

  /* ---------- fondale ---------- */
  const qp = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  const BULBS = [];
  [[[-4, 6], [100, 40], [200, 10]], [[200, 10], [300, 40], [404, 6]]].forEach(([p0, p1, p2]) => {
    [0.14, 0.32, 0.5, 0.68, 0.86].forEach((t) => BULBS.push([f(qp(p0[0], p1[0], p2[0], t)), f(qp(p0[1], p1[1], p2[1], t))]));
  });
  const BULB_C = ['var(--fi-flower-1)', 'var(--fi-sun)', 'var(--fi-leaf)', 'var(--fi-flower-3)', 'var(--fi-water)'];

  function base() {
    const planks = Array.from({ length: 13 }, (_, i) => {
      const xb = -100 + i * 50, xt = 200 + (xb - 200) * 0.827;
      return `M${f(xt)} 286L${xb} 400`;
    }).join('');
    const seams = [[40, 300], [150, 312], [250, 296], [330, 318], [90, 344], [300, 390], [20, 372], [150, 392]].map(([x, y]) => `M${x} ${y}h22`).join('');
    const rain = Array.from({ length: 12 }, (_, i) => `M${156 + ((i * 23) % 92)} ${40 + ((i * 37) % 90)}l-5 12`).join('');
    const bulbs = BULBS.map(([x, y], i) => `<rect x="${x - 2}" y="${y}" width="4" height="4" rx="1" fill="var(--fi-metal-2)"/>` +
      `<path d="M${x} ${y + 3}q5 4 0 11q-5 -7 0 -11Z" fill="${BULB_C[i % 5]}" ${o(1.3)}/><circle cx="${x - 1.2}" cy="${y + 8}" r="1" fill="var(--fi-hi)"/>`).join('');
    return `<defs>
      <linearGradient id="fiBrSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-sky)"/><stop offset="1" stop-color="var(--fi-sky-2)"/></linearGradient>
      <linearGradient id="fiBrStormG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-storm)"/><stop offset="1" stop-color="var(--fi-storm-2)"/></linearGradient>
      <linearGradient id="fiBrWallG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="286"><stop offset="0" stop-color="${V('wall')}"/><stop offset="1" stop-color="${V('wall-2')}"/></linearGradient>
      <linearGradient id="fiBrFloorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${V('floor-2')}"/><stop offset=".25" stop-color="${V('floor')}"/></linearGradient>
      <pattern id="fiBrPaper" width="40" height="40" patternUnits="userSpaceOnUse">${heart(10, 12, 3.2, V('motif'))}${star(30, 31, 4, V('star'))}<circle cx="30" cy="10" r="1.4" fill="${V('motif')}"/><circle cx="10" cy="32" r="1.4" fill="${V('star')}"/></pattern>
      <pattern id="fiBrDots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="${V('blanket-dot')}"/><circle cx="9" cy="9" r="2" fill="${V('blanket-dot')}"/></pattern>
      <clipPath id="fiBrWin"><rect x="156" y="40" width="88" height="94"/></clipPath></defs>
      <rect width="400" height="286" fill="url(#fiBrWallG)"/><rect width="400" height="236" fill="url(#fiBrPaper)"/>
      <rect width="400" height="14" fill="${V('wall-2')}"/><path d="M0 14H400" ${o(2)}/><rect y="15" width="400" height="7" fill="var(--fi-shade)"/>
      <rect y="236" width="400" height="44" fill="${V('wains')}"/><path d="M${Array.from({ length: 10 }, (_, i) => `${20 + i * 40} 244V274`).join('M')}" stroke="${V('trim-2')}" stroke-width="2" stroke-linecap="round"/>
      <rect x="-2" y="231" width="404" height="6" rx="2" fill="${V('trim')}" ${o(1.8)}/>
      <rect y="284" width="400" height="116" fill="url(#fiBrFloorG)"/>
      <path d="${planks}${seams}" stroke="${V('floor-2')}" stroke-width="1.8" stroke-linecap="round"/>
      
      <rect x="-2" y="278" width="404" height="10" fill="${V('trim')}" ${o(2)}/><rect x="0" y="286" width="400" height="5" fill="var(--fi-shade)"/>
      <g clip-path="url(#fiBrWin)"><rect x="156" y="40" width="88" height="94" fill="url(#fiBrSky)"/>
        <g class="fi-sun"><circle cx="226" cy="60" r="10" fill="var(--fi-sun)" ${o(1.8)}/><path d="M222 59q1.5 -2 3 0M228 59q1.5 -2 3 0M223.5 64q2.5 2 5 0" fill="none" ${o(1.3)}/></g>
        ${cloud(160, 52, 0.42, 'fi-cloud')}
        <path d="M150 116Q176 98 204 112Q226 100 250 110V134H150Z" fill="var(--fi-mtn-2)"/><path d="M150 124Q190 114 250 122V134H150Z" fill="var(--fi-grass)"/>
        <circle cx="236" cy="112" r="7" fill="var(--fi-leaf-2)"/><path d="M236 119v6" stroke="var(--fi-wood-2)" stroke-width="2"/>
        <g class="fi-storm"><rect x="156" y="40" width="88" height="94" fill="url(#fiBrStormG)"/>${stormCloud(146, 34, 0.8)}${stormCloud(196, 28, 0.9)}
          <path class="fi-bolt" d="M212 64l-6 12h6l-4 10" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g class="fi-weather"><path d="${rain}" stroke="var(--fi-rain)" stroke-width="1.6" stroke-linecap="round"/></g></g>
      <g class="fi-back"></g>
      <path d="M148 32H252V142H148ZM156 40V134H244V40Z" fill="${V('trim')}" fill-rule="evenodd" ${o(2.4)}/>
      <path d="M244 40V134H156L160 130H240V40Z" fill="${INK}" opacity=".1"/>
      <rect x="140" y="138" width="120" height="10" rx="4" fill="${V('trim')}" ${o(2.2)}/>${shade('M142 144H258V146Q258 148 255 148H145Q142 148 142 146Z', 0.14)}${hl('M146 141H200', 1.6, 0.7)}
      <path d="M152 138v-9h12v9" fill="var(--fi-brick)" ${o(1.6)}/><circle cx="158" cy="126" r="4.5" fill="var(--fi-leaf)" ${o(1.4)}/><path d="M156 124l1 -2M160 124l1 -2" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>${star(158, 120, 2.6, 'var(--fi-flower-1)')}
      <path d="M-4 6Q100 40 200 10Q300 40 404 6" fill="none" stroke="var(--fi-leaf-2)" stroke-width="1.8"/>${bulbs}
      <g transform="rotate(-3 63 79)"><rect x="30" y="46" width="66" height="66" rx="4" fill="${V('poster')}" ${o(2.2)}/>
        <circle cx="63" cy="78" r="22" fill="var(--fi-sky)" opacity=".8"/><path d="M70 62a16 16 0 1 0 6 28a13 13 0 1 1 -6 -28Z" fill="var(--fi-sun)" ${o(1.6)}/>
        ${star(48, 60, 4, 'var(--fi-flower-1)')}${star(82, 98, 3.4, 'var(--fi-flower-3)')}${sparkle(84, 62, 3.4, 'var(--fi-hi)')}${heart(46, 98, 3, 'var(--fi-flower-1)')}
        <rect x="24" y="42" width="16" height="7" rx="1" transform="rotate(-35 32 45)" fill="var(--fi-leaf)" opacity=".8"/><rect x="86" y="42" width="16" height="7" rx="1" transform="rotate(35 94 45)" fill="var(--fi-flower-3)" opacity=".8"/></g>
      <circle cx="340" cy="56" r="17" fill="var(--fi-flower-3)" ${o(2.2)}/><circle cx="340" cy="56" r="12" fill="${V('sheet')}" ${o(1.4)}/>
      <path d="M340 48q-6 4 -5 9q2 5 5 6q3 -1 5 -6q1 -5 -5 -9Z" fill="var(--fi-flower-1)" ${o(1.3)}/><path d="M337 49l3 2l3 -2" fill="none" stroke="var(--fi-leaf-2)" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M340 39V22" stroke="${INK}" stroke-width="1.4"/><circle cx="340" cy="22" r="2" fill="var(--fi-metal-2)"/>
      <ellipse cx="195" cy="311" rx="32" ry="4.5" fill="var(--fi-shade)"/>
      <rect x="172" y="298" width="6" height="12" rx="2" fill="${V('stand-2')}" ${o(1.8)}/><rect x="212" y="298" width="6" height="12" rx="2" fill="${V('stand-2')}" ${o(1.8)}/>
      <rect x="168" y="242" width="54" height="58" rx="5" fill="${V('stand')}" ${o(2.2)}/>${shade('M212 244H220V296Q220 300 216 300H212Z', 0.12)}
      <path d="M172 270H218" ${o(1.8)}/>${heart(195, 258, 3, 'var(--fi-flower-1)', o(1.2))}${heart(195, 286, 3, 'var(--fi-flower-1)', o(1.2))}
      <rect x="164" y="236" width="62" height="8" rx="3" fill="${V('stand-2')}" ${o(2.2)}/>${hl('M168 239H200', 1.6, 0.7)}
      <path d="M210 236V226h8v10" fill="var(--fi-glass)" ${o(1.4)}/><path d="M211 230h6" stroke="var(--fi-hi)" stroke-width="1.4"/>
      <g><ellipse cx="186" cy="326" rx="9" ry="5" fill="${V('pillow')}" ${o(1.6)}/><ellipse cx="206" cy="328" rx="9" ry="5" fill="${V('pillow')}" ${o(1.6)}/>
        <path d="M182 322q-4 -8 0 -9q3 2 2 8M190 322q2 -8 5 -7q1 3 -3 8M202 324q-4 -8 0 -9q3 2 2 8M210 324q2 -8 5 -7q1 3 -3 8" fill="${V('pillow')}" ${o(1.3)}/>
        <circle cx="183" cy="326" r=".9" fill="${INK}"/><circle cx="189" cy="326" r=".9" fill="${INK}"/><circle cx="203" cy="328" r=".9" fill="${INK}"/><circle cx="209" cy="328" r=".9" fill="${INK}"/></g>
      <g><ellipse cx="362" cy="392" rx="26" ry="5" fill="var(--fi-shade)"/>
        <ellipse cx="362" cy="374" rx="18" ry="16" fill="${V('teddy')}" ${o(2.2)}/><ellipse cx="362" cy="378" rx="10" ry="9" fill="${V('teddy-2')}"/>
        <ellipse cx="346" cy="388" rx="7" ry="5" fill="${V('teddy')}" ${o(1.8)}/><ellipse cx="378" cy="388" rx="7" ry="5" fill="${V('teddy')}" ${o(1.8)}/>
        <circle cx="350" cy="339" r="5.5" fill="${V('teddy')}" ${o(1.8)}/><circle cx="374" cy="339" r="5.5" fill="${V('teddy')}" ${o(1.8)}/>
        <circle cx="362" cy="350" r="14" fill="${V('teddy')}" ${o(2.2)}/><ellipse cx="362" cy="355" rx="6" ry="4.5" fill="${V('teddy-2')}" ${o(1.3)}/>
        <circle cx="357" cy="347" r="1.6" fill="${INK}"/><circle cx="367" cy="347" r="1.6" fill="${INK}"/><path d="M360.5 353.5h3l-1.5 2Z" fill="${INK}"/>
        <ellipse cx="353" cy="352" rx="2.6" ry="1.6" fill="var(--fi-flower-1)" opacity=".6"/><ellipse cx="371" cy="352" rx="2.6" ry="1.6" fill="var(--fi-flower-1)" opacity=".6"/>
        <path d="M362 364l-7 -4v8ZM362 364l7 -4v8Z" fill="var(--fi-flower-1)" ${o(1.3)}/>${hl('M352 344a10 10 0 0 1 5 -5', 1.6, 0.7)}</g>
      <g class="fi-layers"></g>
      <rect class="fi-gloom" width="400" height="400" fill="var(--fi-storm)"/>
      ${hari(4, 328)}
      <g class="fi-front"></g>`;
  }

  HH.fixitScenes.bedroom = {
    id: 'bedroom', name: ['fis_bedroom', "Hari's bedroom"],
    probs: {
      window: ['fip_bedroom_window', 'Broken window'], curtain: ['fip_bedroom_curtain', 'Fallen curtain'], carpet: ['fip_bedroom_carpet', 'Wet carpet'],
      shelf: ['fip_bedroom_shelf', 'Loose shelf'], books: ['fip_bedroom_books', 'Scattered books'], lamp: ['fip_bedroom_lamp', 'Fallen lamp'],
      plant: ['fip_bedroom_plant', 'Knocked-over plant'], bed: ['fip_bedroom_bed', 'Broken bed leg'], pillows: ['fip_bedroom_pillows', 'Scattered pillows'],
      blanket: ['fip_bedroom_blanket', 'Messy blanket'], crack: ['fip_bedroom_crack', 'Cracked wall'], paint: ['fip_bedroom_paint', 'Faded wall'],
      clock: ['fip_bedroom_clock', 'Stopped alarm clock'],
    },
    spots: SPOT, layers: LAYERS, draw: DRAW, base,
    flags: (stOf) => ({
      winBroken: stOf('window') === 'broken', shelfBroken: stOf('shelf') === 'broken', bedBroken: stOf('bed') === 'broken',
      lit: stOf('lamp') === 'fixed',
    }),
    front(S, stOf, solved) {
      let fr = '';
      if (S.lit) {
        fr += '<path d="M362 110L326 284H404L386 110Z" fill="var(--fi-glow)" class="fi-beam"/><circle cx="373" cy="104" r="20" fill="var(--fi-glow)" class="fi-glowdot"/>';
      }
      if (solved) fr += BULBS.map(([x, y], i) => `<circle cx="${x}" cy="${y + 9}" r="7" fill="var(--fi-glow)" class="fi-glowdot" style="animation-delay:${(i % 4) * 0.4}s"/>`).join('');
      return fr;
    },
    back: (solved) => (solved ? `<g class="fi-rainbow"><g clip-path="url(#fiBrWin)">${['var(--fi-flower-1)', 'var(--fi-flower-2)', 'var(--fi-leaf)', 'var(--fi-water)', 'var(--fi-curtain)']
      .map((c, i) => `<path d="M${160 + i * 5} 134A${44 - i * 5} ${50 - i * 5} 0 0 1 ${248 - i * 5} 134" fill="none" stroke="${c}" stroke-width="5"/>`).join('')}</g>
      <path d="M160 148H240L330 400H70Z" fill="var(--fi-glow)" opacity=".55"/>
      ${sparkle(120, 330, 5, 'var(--fi-hi)', 'fi-twk')}${sparkle(250, 312, 4, 'var(--fi-sun)', 'fi-twk')}${sparkle(200, 186, 4.4, 'var(--fi-hi)', 'fi-twk')}
      ${heart(150, 300, 4, 'var(--fi-flower-1)', 'class="fi-twk"')}${heart(286, 380, 3.4, 'var(--fi-flower-1)', 'class="fi-twk"')}</g>` : ''),
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
