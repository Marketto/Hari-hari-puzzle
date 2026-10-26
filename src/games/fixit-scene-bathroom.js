/* Fix-It House — scenario "bagno kawaii" (interno in prospettiva: vasca coi piedini, specchio con luce, lavandino, ventola,
 * portasciugamani, tappetino, finestrella col temporale, vasetti e paperella). Contratto: vedi fixit-scene-house.js.
 * Coerenza (flags): valvola chiusa → niente spruzzi né rubinetto; corrente staccata → niente scintille, ventola ferma e luce spenta
 * finché luce e ventola non sono a posto; tappo messo → vasca pronta con schiuma e vapore; portasciugamani giù → niente asciugamani appesi.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const { INK, o, stick, leaf, star, hl, sparkle, stormCloud, hari } = HH.fixitKit;

  const SPOT = {
    lamp: [100, 22, 60, 36], mirror: [98, 62, 64, 82], fan: [190, 40, 58, 56],
    rack: [28, 86, 64, 52], fuse: [30, 156, 50, 54],
    pipe: [106, 192, 54, 50], valve: [166, 214, 46, 44], tub: [222, 206, 116, 62],
    towels: [82, 318, 62, 46], flood: [150, 312, 116, 42], tiles: [172, 358, 72, 40], duck: [296, 326, 54, 46],
  };
  const LAYERS = ['lamp', 'mirror', 'fan', 'fuse', 'rack', '@pipe', 'valve', 'pipe', 'tiles', 'flood', '@tub', 'tub', 'duck', 'towels'];

  /* ---------- geometria del pavimento (prospettiva, punto di fuga ≈ 200,-29) ---------- */
  const FB = 282, ROWS = [282, 293, 306, 323, 345, 372, 400];
  const colX = (i, y) => 26 + 43.5 * i + (-66 + 16.5 * i) * (y - FB) / 118;
  const f1 = (v) => +v.toFixed(1);
  const cell = (i, j) => { const a = ROWS[j], b = ROWS[j + 1]; return `M${f1(colX(i, a))} ${a}L${f1(colX(i + 1, a))} ${a}L${f1(colX(i + 1, b))} ${b}L${f1(colX(i, b))} ${b}Z`; };
  const floorFill = (i, j) => ((i + j) % 2 ? 'var(--fi-bathroom-floor-b)' : 'var(--fi-bathroom-floor-a)');
  const sideY = (y, x) => f1(-29 + (y + 29) * (200 - x) / 174);   // muri laterali: linea dal punto di fuga verso il bordo

  const P = (n) => `var(--fi-bathroom-${n})`;
  const heart = (x, y, k, c) => `<path d="M${x} ${y + 3 * k}c${-5 * k} ${-4 * k} ${-6 * k} ${-7 * k} ${-6 * k} ${-9 * k}a${3 * k} ${3 * k} 0 0 1 ${6 * k} ${-1 * k}a${3 * k} ${3 * k} 0 0 1 ${6 * k} ${1 * k}c0 ${2 * k} ${-1 * k} ${5 * k} ${-6 * k} ${9 * k}z" fill="${c}"/>`;

  // paperella di gomma (centro ≈ 0,0; ~30×24 a k = 1); sad = sottosopra/triste
  function duck(x, y, k = 1, rot = 0, sad = false) {
    const eye = sad ? `<path d="M6.5 -7.5q1.6 1.4 3.2 0" fill="none" ${o(1.3 / k)}/>` : `<circle cx="8" cy="-7" r="1.7" fill="${INK}"/><circle cx="8.6" cy="-7.6" r=".6" fill="var(--fi-hi)"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})">` +
      `<path d="M-14 -4Q-13 11 2 11Q14 11 14 1Q10 -2 4 0L-3 1Q-9 1 -14 -4Z" fill="${P('duck')}" ${o(1.8 / k)}/>` +
      `<path d="M-12 4Q-6 11 4 10Q12 9 13 4Q8 8 0 8Q-7 8 -12 4Z" fill="${P('duck-2')}" opacity=".35"/>` +
      `<circle cx="6" cy="-6" r="7" fill="${P('duck')}" ${o(1.8 / k)}/>` +
      `<path d="M12 -6.5Q19 -7 18.5 -3.5Q15.5 -1 12 -3Z" fill="${P('beak')}" ${o(1.4 / k)}/>` +
      `<path d="M-5 3Q1 0 5 4Q0 8 -5 3Z" fill="none" ${o(1.3 / k)}/>${eye}` +
      `<ellipse cx="4.5" cy="-2.8" rx="2" ry="1.2" fill="var(--fi-flower-1)" opacity=".55"/>${hl('M1 -9a5 5 0 0 1 4 -3', 1.4 / k, 0.85)}</g>`;
  }

  /* ---------- disegni dei guasti ---------- */
  const DRAW = {
    lamp(st, S) {
      const bar = `<path d="M130 22V30" ${o(2)}/><rect x="104" y="30" width="52" height="7" rx="3.5" fill="${P('gold')}" ${o(2)}/>${hl('M108 32.5H128', 1.4, 0.7)}`;
      const bulb = (x, fill, extra = '') => `<path d="M${x} 37v3" ${o(1.6)}/><circle cx="${x}" cy="46" r="6.5" fill="${fill}" ${o(1.8)}/>${hl(`M${x - 3.5} 44a4 4 0 0 1 3 -3`, 1.3, 0.85)}${extra}`;
      if (st === 'broken') {
        const zap = S.live ? `<g class="fi-zap"><path d="M139 50l-4 5h4l-4 6" fill="none" stroke="var(--fi-spark)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${star(124, 56, 3.5, 'var(--fi-spark)')}</g>` : '';
        return bar + bulb(112, 'var(--fi-glass-2)') + bulb(148, 'var(--fi-glass-2)') +
          `<g class="fi-dangle"><path d="M130 37q-1 6 2 10" fill="none" ${o(1.6)}/><g transform="rotate(28 132 47)"><circle cx="132" cy="54" r="6.5" fill="var(--fi-hole)" ${o(1.8)}/>` +
          `<path d="M129 51l3 3l-2 3M134 50l-1 4" fill="none" stroke="var(--fi-glass)" stroke-width="1.2" stroke-linecap="round"/></g></g>${zap}`;
      }
      const on = S.lampOn;
      const f = on ? 'var(--fi-fire-3)' : 'var(--fi-glass-2)';
      const halo = on ? [112, 130, 148].map((x) => `<circle cx="${x}" cy="46" r="11" fill="var(--fi-glow)" class="fi-glowdot"/>`).join('') : '';
      return halo + bar + bulb(112, f) + bulb(130, f) + bulb(148, f) + (st === 'fixed' ? sparkle(160, 30, 5, 'var(--fi-spark)') : '');
    },
    mirror(st) {
      const frame = [...Array(14)].map((_, i) => { const a = i / 14 * Math.PI * 2; return `<circle cx="${f1(130 + 33 * Math.cos(a))}" cy="${f1(102 + 41 * Math.sin(a))}" r="5" fill="var(--fi-curtain)" ${o(1.6)}/>`; }).join('');
      const glass = `<ellipse cx="130" cy="102" rx="30" ry="38" fill="var(--fi-curtain-2)" ${o(2.2)}/>${frame}<ellipse cx="130" cy="102" rx="26" ry="34" fill="${P('mirror')}" ${o(2)}/>` +
        `<path d="M130 68A26 34 0 0 1 156 102A26 34 0 0 1 130 136Q150 104 130 68Z" fill="${P('mirror-2')}"/>` +
        `<path d="M144 80h7v12h-7z" fill="${P('mirror-2')}" opacity=".8"/>` +            // riflesso della finestra
        `<path d="M138 70Q146 66 152 70Q148 72 146 76Q142 72 138 70Z" fill="var(--fi-curtain)" ${o(1.4)}/><circle cx="145" cy="71" r="2.4" fill="var(--fi-flower-1)" ${o(1.2)}/>`;
      if (st === 'broken') {
        return glass + `<path d="M120 88L131 82L127 96Z" fill="var(--fi-hole)" opacity=".7"/>` +
          `<path d="M127 96L112 92M127 96L118 112M127 96L134 118M127 96L146 104M127 96L140 84M127 96L131 82M118 112L114 124M134 118L140 128" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
          `<path d="M118 104l6 -4M136 106l6 2" stroke="var(--fi-hi)" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>` +
          `<path d="M104 156l5 -5l3 5ZM150 157l4 -4l3 4Z" fill="${P('mirror')}" ${o(1.2)}/>`;
      }
      return glass + hl('M112 92L124 76M114 110L132 86', 2.6, 0.9) +
        (st === 'fixed' ? sparkle(116, 120, 6) + sparkle(146, 90, 4.5) + sparkle(160, 70, 4, 'var(--fi-spark)') : sparkle(116, 120, 3.5));
    },
    fan(st, S) {
      const blades = [0, 90, 180, 270].map((a) => `<path d="M219 68Q213 56 219 50Q226 56 219 68Z" transform="rotate(${a} 219 68)" fill="${P('tile')}" ${o(1.4)}/>`).join('');
      const unit = (spin) => `<circle cx="219" cy="68" r="22" fill="var(--fi-bathroom-porcelain)" ${o(2.2)}/><circle cx="219" cy="68" r="17" fill="${P('porcelain-2')}" ${o(1.6)}/>` +
        `<g class="${spin ? 'fi-spin' : ''}">${blades}</g><circle cx="219" cy="68" r="4" fill="var(--fi-curtain)" ${o(1.4)}/>` +
        `<path d="M204 62H234M203 68H235M204 74H234" stroke="${P('grout')}" stroke-width="1.2" opacity=".7"/>` +
        [[202, 51], [236, 51], [202, 85], [236, 85]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="var(--fi-metal-2)"/>`).join('') + hl('M203 58a18 18 0 0 1 8 -9', 2, 0.8);
      if (st === 'broken') {
        const zap = S.live ? `<g class="fi-zap"><path d="M206 66l-5 6h5l-5 7" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${star(232, 60, 4, 'var(--fi-spark)')}</g>` : '';
        return `<circle cx="219" cy="64" r="18" fill="var(--fi-hole)" ${o(2)}/><path d="M210 58h18M208 64h22M210 70h18" stroke="var(--fi-soot)" stroke-width="1.4"/>` +
          `<g class="fi-dangle"><path d="M216 52C212 62 222 70 216 80" fill="none" stroke="var(--fi-wire)" stroke-width="2.4" stroke-linecap="round"/>` +
          `<g transform="translate(6 18) rotate(24 219 68) scale(.8) translate(55 17)">${unit(false)}</g></g>${zap}`;
      }
      return unit(S.live) + (st === 'fixed' ? sparkle(244, 46, 5, 'var(--fi-spark)') : '');
    },
    fuse(st, S) {
      const up = st !== 'fixed' || S.powerBack;
      const lever = up ? `<rect x="51" y="174" width="8" height="12" rx="2" fill="${st === 'broken' ? 'var(--fi-valve)' : 'var(--fi-leaf)'}" ${o(1.6)}/>`
        : `<rect x="51" y="188" width="8" height="12" rx="2" fill="var(--fi-metal)" ${o(1.6)}/>`;
      const zap = st === 'broken' ? `<g class="fi-zap"><path d="M78 166l-6 7h5l-5 8" fill="none" stroke="var(--fi-spark)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 196l-5 4h4l-4 6" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
      return `<rect x="38" y="164" width="34" height="42" rx="6" fill="var(--fi-metal)" ${o(2.2)}/><path d="M64 166h6v38h-6z" fill="${INK}" opacity=".1"/>` +
        `<rect x="45" y="170" width="20" height="32" rx="3" fill="var(--fi-metal-2)"/>${lever}` +
        `<path d="M40 166l3 -4h24l3 4" fill="none" ${o(1.6)}/>${heart(66, 196, 0.5, 'var(--fi-flower-1)')}${hl('M41 170v12', 1.6, 0.6)}${zap}` +
        (st === 'fixed' ? sparkle(76, 162, 4.5, 'var(--fi-spark)') : '');
    },
    rack(st) {
      const bracket = (x) => `<rect x="${x - 4}" y="98" width="8" height="12" rx="3" fill="${P('gold')}" ${o(1.8)}/><circle cx="${x}" cy="101" r="1.4" fill="${INK}"/>`;
      if (st === 'broken') {
        return bracket(36) + `<circle cx="84" cy="101" r="2.4" fill="var(--fi-hole)"/><circle cx="84" cy="107" r="1.6" fill="var(--fi-hole)"/>` +
          `<g class="fi-wobble">${stick(38, 106, 80, 132, 3.5, P('gold'))}<circle cx="80" cy="132" r="3.6" fill="${P('gold')}" ${o(1.6)}/></g>` +
          `<path d="M86 296l4 -2l1 3l-4 2Z" fill="var(--fi-metal-2)" ${o(1.2)}/>`;           // vite caduta sul tappetino
      }
      return stick(34, 106, 86, 106, 3.5, P('gold')) + bracket(36) + bracket(84) + hl('M42 105H78', 1.2, 0.7) +
        (st === 'fixed' ? sparkle(92, 92, 5, 'var(--fi-spark)') : '');
    },
    towels(st, S) {
      if (st === 'broken') {
        return `<ellipse cx="114" cy="356" rx="32" ry="6" fill="var(--fi-shade)"/>` +
          `<path d="M86 352Q84 336 100 334Q112 324 126 332Q142 330 142 346Q144 358 126 358H96Q86 358 86 352Z" fill="${P('towel-2')}" ${o(2)}/>` +
          `<path d="M96 340q8 6 4 16M120 334q-4 10 4 22" fill="none" stroke="${P('towel-2b')}" stroke-width="2.2" stroke-linecap="round"/>` +
          `<path d="M92 340Q98 326 114 330Q122 322 132 330Q124 340 112 340Q100 344 92 340Z" fill="${P('towel-1')}" ${o(1.8)}/>` +
          `<path d="M100 334l4 6M116 330l2 8" stroke="var(--fi-hi)" stroke-width="2" stroke-linecap="round" opacity=".8"/>` +
          `<path d="M136 352l8 4l-2 6l-8 -3Z" fill="${P('towel-3')}" ${o(1.6)}/>` +
          `<path d="M100 352q2 4 0 6q-2 -2 0 -6Z" fill="var(--fi-water)" ${o(1)}/>`;
      }
      if (!S.rackUp) return '';
      const t1 = `<path d="M40 104H62V138Q51 142 40 138Z" fill="${P('towel-1')}" ${o(2)}/><path d="M40 128Q51 131 62 128M40 133Q51 136 62 133" fill="none" stroke="var(--fi-hi)" stroke-width="2"/>` +
        `<path d="M40 104H62V110H40Z" fill="${INK}" opacity=".1"/>${heart(51, 120, 0.55, 'var(--fi-hi)')}`;
      const t2 = `<path d="M64 104H82V132Q73 135 64 132Z" fill="${P('towel-2')}" ${o(2)}/>` +
        [[69, 114], [77, 120], [69, 126], [77, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="var(--fi-hi)"/>`).join('') +
        `<path d="M64 104H82V109H64Z" fill="${INK}" opacity=".1"/>`;
      return t1 + t2 + (st === 'fixed' ? sparkle(30, 124, 5) + sparkle(88, 136, 4, 'var(--fi-spark)') : '');
    },
    '@pipe': () => {
      const p = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="var(--fi-metal)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
      return p('M130 190V226Q130 238 142 238H150V262') + p('M150 262H236') + p('M189 262V236') +
        `<rect x="183" y="226" width="12" height="7" rx="2" fill="var(--fi-metal-2)" ${o(1.6)}/>` + hl('M156 260.5H210', 1.4, 0.7);
    },
    valve(st) {
      const wheel = `<circle cx="189" cy="234" r="11" fill="none" stroke="${INK}" stroke-width="7.5"/><circle cx="189" cy="234" r="11" fill="none" stroke="var(--fi-valve)" stroke-width="4"/>` +
        `<path d="M189 224V244M179 234H199" ${o(2.6)}/><circle cx="189" cy="234" r="3.5" fill="var(--fi-valve)" ${o(1.6)}/>`;
      if (st !== 'broken') return `<g transform="rotate(45 189 234)">${wheel}</g>` + (st === 'fixed' ? sparkle(206, 222, 4.5, 'var(--fi-spark)') : '');
      return `<path d="M150 262H232M189 262V246" fill="none" stroke="var(--fi-water-2)" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round" class="fi-flow"/>` +
        `<g class="fi-spin">${wheel}</g>`;
    },
    pipe(st, S) {
      if (st !== 'broken') return `<rect x="123.5" y="204" width="13" height="16" rx="3.5" fill="var(--fi-metal-2)" ${o(2)}/><circle cx="130" cy="212" r="1.8" fill="${INK}"/>` +
        (st === 'fixed' ? sparkle(146, 206, 4.5) : '');
      const crack = `<path d="M126 207l4 3l-3 2l5 3" fill="none" ${o(1.8)}/>`;
      if (S.waterOff) return crack + `<path d="M130 218q3 4 0 6q-3 -2 0 -6Z" fill="var(--fi-water)" ${o(1.2)}/>`;
      const drop = (x, d) => `<path d="M${x} 218q4 6 0 9q-4 -3 0 -9Z" fill="var(--fi-water)" ${o(1.2)} class="fi-drip" style="animation-delay:${d}s"/>`;
      return crack + `<path d="M130 210q-12 -8 -20 0M130 210q10 -10 20 -4M130 210q-4 -12 2 -16" fill="none" stroke="var(--fi-water-2)" stroke-width="2.2" stroke-linecap="round" class="fi-spray"/>` +
        drop(128, 0) + drop(134, 0.45) + drop(131, 0.9);
    },
    tiles(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') return `<path d="${cell(4, 5)}" fill="${floorFill(4, 5)}" ${o(1.6)}/><path d="${cell(3, 5)}" fill="${floorFill(3, 5)}" ${o(1.6)}/>` +
        hl('M200 380l14 0', 2, 0.8) + sparkle(222, 388, 6) + sparkle(184, 380, 4, 'var(--fi-spark)');
      return `<path d="${cell(4, 5)}" fill="var(--fi-hole)" ${o(1.8)}/><path d="M206 384h36M200 392h44" stroke="var(--fi-soot)" stroke-width="1.4"/>` +
        `<g class="fi-wobble"><path d="M168 372L198 366L206 386L174 392Z" fill="${floorFill(3, 5)}" ${o(1.8)}/><path d="M168 372L174 392L172 395L165 375Z" fill="${INK}" opacity=".25"/></g>` +
        `<path d="M240 362L262 356L268 368L246 372Z" fill="${floorFill(4, 5)}" transform="rotate(-14 254 364)" ${o(1.6)}/>` +
        `<path d="M226 376l4 -4l3 4ZM254 384l3 -3l3 3Z" fill="${P('floor-a')}" ${o(1.1)}/>`;
    },
    flood(st, S) {
      if (st === 'idle') return '';
      if (st === 'fixed') return sparkle(186, 330, 6) + sparkle(236, 324, 4.5, 'var(--fi-spark)') + sparkle(262, 342, 3.5) + hl('M178 336q16 -4 30 0', 2, 0.55);
      const stream = !S.waterOff ? `<path d="M240 300q-6 8 -16 12" fill="none" stroke="var(--fi-water-2)" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round" class="fi-flow"/>` : '';
      return `<path d="M144 332Q140 314 172 312Q196 300 236 304Q282 298 302 312Q318 330 290 342Q252 356 206 350Q150 354 144 332Z" fill="var(--fi-water)" opacity=".85" ${o(1.8)}/>` +
        `<path d="M160 330q20 -10 46 -6M246 312q22 -2 36 8" fill="none" stroke="var(--fi-hi)" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>` +
        `<ellipse cx="196" cy="334" rx="10" ry="2.6" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.6" class="fi-ripple"/>` +
        `<ellipse cx="262" cy="330" rx="8" ry="2.2" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.6" class="fi-ripple" style="animation-delay:.9s"/>` + stream;
    },
    '@tub': () => {
      const foot = (x, m) => `<path d="M${x - 6} 290Q${x - 9 * m} 306 ${x - 4 * m} 314H${x + 8 * m}Q${x + 6 * m} 304 ${x + 8} 290Z" fill="${P('gold')}" ${o(2)}/>` +
        `<path d="M${x - 4 * m} 314q2 -3 4 0q2 -3 4 0" fill="none" ${o(1.4)}/>`;
      return `<ellipse cx="294" cy="316" rx="84" ry="6" fill="var(--fi-shade)"/>` + foot(240, 1) + foot(348, -1) +
        `<path d="M212 216Q212 290 254 300H334Q376 290 376 216Z" fill="${P('tub')}" ${o(2.6)}/>` +
        `<path d="M330 216H376Q376 290 334 300H318Q352 280 330 216Z" fill="${P('tub-2')}"/>` +
        hl('M222 228Q224 270 248 288', 2.6, 0.6) +
        `<path d="M236 250Q294 262 352 250" fill="none" stroke="var(--fi-hi)" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round" opacity=".9"/>` +
        heart(294, 278, 1.4, 'var(--fi-curtain)') + `<path d="M287 271a3 3 0 0 1 3 -3" stroke="var(--fi-hi)" stroke-width="1.4" stroke-linecap="round" fill="none"/>` +
        `<ellipse cx="294" cy="216" rx="84" ry="9" fill="${P('porcelain')}" ${o(2.4)}/><ellipse cx="294" cy="216.5" rx="75" ry="5.5" fill="${P('porcelain-2')}"/>` +
        // rubinetto a collo di cigno sul muro
        `<path d="M366 172V198" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M366 172V198" stroke="${P('gold')}" stroke-width="4.5" stroke-linecap="round"/>` +
        `<path d="M366 176Q366 166 356 166Q348 166 348 176V184" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M366 176Q366 166 356 166Q348 166 348 176V184" fill="none" stroke="${P('gold')}" stroke-width="4.5" stroke-linecap="round"/>` +
        `<circle cx="360" cy="190" r="4" fill="var(--fi-flower-1)" ${o(1.4)}/><circle cx="372" cy="190" r="4" fill="var(--fi-water)" ${o(1.4)}/>`;
    },
    tub(st, S) {
      const run = !S.waterOff ? `<path d="M348 186V212" stroke="var(--fi-water)" stroke-width="4" stroke-linecap="round"/><path d="M348 186V212" stroke="var(--fi-water-2)" stroke-width="1.6" stroke-dasharray="3 5" class="fi-flow"/>` : '';
      const chain = (x2, y2) => `<path d="M262 214Q258 ${(214 + y2) / 2} ${x2} ${y2}" fill="none" stroke="${P('gold-2')}" stroke-width="1.8" stroke-dasharray="2 2"/>`;
      if (st === 'broken') {
        const over = (x, d) => `<path d="M${x} 222q4 6 0 9q-4 -3 0 -9Z" fill="var(--fi-water)" ${o(1.1)} class="fi-drip" style="animation-delay:${d}s"/>`;
        return `<ellipse cx="294" cy="215" rx="79" ry="7" fill="var(--fi-water)" ${o(1.6)}/>` +
          `<path d="M226 219Q224 238 228 252Q232 260 237 252Q236 240 240 232Q242 244 247 244Q251 240 249 222ZM314 223Q312 238 316 246Q321 252 325 245Q324 234 330 223Z" fill="var(--fi-water)" ${o(1.4)}/>` +
          `<path d="M230 232v12M318 230v8" stroke="var(--fi-hi)" stroke-width="1.6" stroke-linecap="round" opacity=".8"/><path d="M250 208q4 -4 8 0q4 -4 8 0M322 208q4 -4 8 0q4 -4 8 0" fill="none" stroke="var(--fi-water-2)" stroke-width="1.8" stroke-linecap="round"/>` +
          over(220, 0) + over(240, 0.5) + over(358, 0.25) +
          `<ellipse cx="300" cy="215" rx="14" ry="3" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.6" class="fi-ripple"/>` + run +
          `<g class="fi-dangle"><path d="M266 214Q262 230 266 246" fill="none" stroke="${P('gold-2')}" stroke-width="1.8" stroke-dasharray="2 2"/><circle cx="266" cy="248" r="3" fill="none" ${o(1.4)}/></g>`;
      }
      const foam = [[240, 212, 6], [252, 209, 7], [266, 212, 5], [330, 211, 6], [342, 208, 7], [356, 212, 5]].map(([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${P('foam')}" ${o(1.3)}/>`).join('') + hl('M248 205a5 5 0 0 1 4 -3', 1.2, 0.9);
      return `<ellipse cx="294" cy="217" rx="72" ry="4.5" fill="var(--fi-water)"/>` + run + foam + chain(272, 226) +
        `<ellipse cx="274" cy="229" rx="5" ry="3.5" fill="var(--fi-metal-2)" ${o(1.4)}/>` +
        (st === 'fixed' ? sparkle(226, 200, 5) + sparkle(370, 204, 4.5, 'var(--fi-spark)') : '');
    },
    duck(st) {
      if (st === 'broken') {
        return `<ellipse cx="322" cy="366" rx="22" ry="4" fill="var(--fi-shade)"/><g class="fi-wobble">${duck(322, 350, 1.25, 160, true)}</g>` +
          `<path d="M338 336q4 -6 0 -9q-4 3 0 9Z" fill="var(--fi-water)" ${o(1.1)}/>` +
          `<path d="M306 338q-2 -6 3 -7q4 1 1 5q-2 1 -1 3M308.5 342v.5" fill="none" ${o(1.6)}/>`;
      }
      if (st === 'fixed') return `<g class="fi-bathroom-bob">${duck(300, 208, 0.9)}</g>` + sparkle(284, 190, 4.5, 'var(--fi-spark)') + heart(318, 194, 0.6, 'var(--fi-flower-1)');
      return duck(364, 206, 0.6, -6);
    },
  };

  /* ---------- fondale ---------- */
  function base() {
    const floor = [];
    for (let j = 0; j < ROWS.length - 1; j++) for (let i = -2; i < 10; i++) floor.push(`<path d="${cell(i, j)}" fill="${floorFill(i + 20, j)}"/>`);
    const floorLines = ROWS.slice(1).map((y) => `M-40 ${y}H440`).join('') + [...Array(13)].map((_, k) => { const i = k - 2; return `M${f1(colX(i, FB))} ${FB}L${f1(colX(i, 400))} 400`; }).join('');
    const sideT = [190, 208, 226, 244, 262].map((y) => `M26 ${y}L0 ${sideY(y, 26)}M374 ${y}L400 ${sideY(y, 26)}`).join('');
    const rain = Array.from({ length: 10 }, (_, i) => `M${264 + (i * 23) % 90} ${30 + (i * 31) % 70}l-5 11`).join('');
    const fringe = Array.from({ length: 11 }, (_, i) => `M${78 + i * 9.6} 318v5`).join('');
    return `<defs>
      <pattern id="fiBathPaper" x="26" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.2" fill="${P('wall-dot')}"/><circle cx="18" cy="18" r="2.2" fill="${P('wall-dot')}"/>
        <path d="M18 3.5v5M15.5 6h5" stroke="var(--fi-hi)" stroke-width="1.2" stroke-linecap="round" opacity=".7"/></pattern>
      <pattern id="fiBathTile" x="26" y="172" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="${P('tile-2')}"/>
        <rect width="18" height="18" fill="${P('tile')}"/><rect x="18" y="18" width="18" height="18" fill="${P('tile')}"/>
        <path d="M3 4h5M21 22h5" stroke="var(--fi-hi)" stroke-width="1.4" stroke-linecap="round" opacity=".8"/><path d="M0 0H36M0 18H36M0 0V36M18 0V36" stroke="${P('grout')}" stroke-width="1.6"/></pattern>
      <linearGradient id="fiBathSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-sky)"/><stop offset="1" stop-color="var(--fi-sky-2)"/></linearGradient>
      <linearGradient id="fiBathStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-storm)"/><stop offset="1" stop-color="var(--fi-storm-2)"/></linearGradient>
      <clipPath id="fiBathWin"><rect x="270" y="38" width="74" height="66" rx="4"/></clipPath></defs>
      ${floor.join('')}<path d="${floorLines}" stroke="${P('floor-line')}" stroke-width="1.6"/>
      <rect x="26" y="0" width="348" height="166" fill="${P('wall')}"/><rect x="26" y="0" width="348" height="166" fill="url(#fiBathPaper)"/>
      <rect x="26" y="172" width="348" height="110" fill="url(#fiBathTile)"/>
      <path d="M0 4L26 0V166L0 ${sideY(166, 26)}Z" fill="${P('wall')}"/><path d="M400 4L374 0V166L400 ${sideY(166, 26)}Z" fill="${P('wall')}"/>
      <path d="M0 ${sideY(172, 26)}L26 172V282L0 328.5ZM400 ${sideY(172, 26)}L374 172V282L400 328.5Z" fill="${P('tile-2')}"/>
      <path d="${sideT}M13 ${sideY(172, 13) + 0}V310M387 ${sideY(172, 13)}V310" stroke="${P('grout')}" stroke-width="1.6"/>
      <path d="M0 4L26 0V282L0 328.5ZM400 4L374 0V282L400 328.5Z" fill="${INK}" opacity=".1"/>
      <path d="M26 166H374V172H26ZM0 ${sideY(166, 26)}L26 166V172L0 ${sideY(172, 26)}ZM400 ${sideY(166, 26)}L374 166V172L400 ${sideY(172, 26)}Z" fill="${P('trim')}" ${o(1.6)}/>
      ${[...Array(11)].map((_, i) => heart(44 + i * 31, 170.5, 0.32, 'var(--fi-hi)')).join('')}
      <rect x="26" y="274" width="348" height="8" fill="${P('grout')}"/><path d="M26 274H374" stroke="${INK}" stroke-width="1.4" opacity=".35"/>
      <rect x="26" y="0" width="348" height="8" fill="${P('trim')}"/><path d="M26 8H374" ${o(1.6)}/><rect x="26" y="8" width="348" height="6" fill="var(--fi-shade)"/>
      <path d="M26 0V282M374 0V282" ${o(2)}/><path d="M26 282L-40 400M374 282L440 400" ${o(2)}/>
      <path d="M26 282H374" stroke="${INK}" stroke-width="2" opacity=".5"/>

      <rect x="262" y="30" width="90" height="82" rx="8" fill="${P('frame')}" ${o(2.4)}/>
      <g clip-path="url(#fiBathWin)"><rect x="270" y="38" width="74" height="66" fill="url(#fiBathSky)"/>
        <g class="fi-sun"><circle cx="328" cy="56" r="10" fill="var(--fi-sun)" ${o(1.8)}/><path d="M324 55q1.5 -2 3 0M330 55q1.5 -2 3 0M325.5 59q2.5 2 5 0" fill="none" ${o(1.3)}/></g>
        <path d="M268 104Q290 86 310 96Q330 84 348 98V106H268Z" fill="var(--fi-hill)"/><path d="M268 106Q300 96 348 104V108H268Z" fill="var(--fi-grass)"/>
        <g class="fi-storm"><rect x="270" y="38" width="74" height="66" fill="url(#fiBathStorm)"/>${stormCloud(258, 32, 0.8)}${stormCloud(298, 44, 0.75)}
          <path class="fi-bolt" d="M300 60l-6 12h5l-4 10" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g class="fi-weather"><path d="${rain}" stroke="var(--fi-rain)" stroke-width="1.6" stroke-linecap="round"/></g></g>
      <rect x="270" y="38" width="74" height="66" rx="4" fill="none" ${o(2)}/>
      <path d="M307 38V104M270 71H344" stroke="${P('frame')}" stroke-width="4"/><path d="M307 38V104M270 71H344" stroke="${INK}" stroke-width="1" opacity=".3"/>
      ${hl('M276 50l8 -8M280 64l14 -14', 2, 0.55)}
      <path d="M266 34Q282 46 298 34Q314 46 330 34Q342 44 348 34V30H266Z" fill="var(--fi-curtain)" ${o(1.8)}/>
      ${[278, 298, 318, 338].map((x) => `<circle cx="${x}" cy="35" r="1.6" fill="var(--fi-hi)"/>`).join('')}
      <rect x="254" y="108" width="106" height="9" rx="4" fill="${P('frame')}" ${o(2)}/><rect x="254" y="113" width="106" height="4" rx="2" fill="${INK}" opacity=".1"/>
      <path d="M268 108l2 -12h12l2 12Z" fill="var(--fi-brick)" ${o(1.6)}/>${leaf(272, 90, -30, 'var(--fi-leaf)', 1)}${leaf(281, 89, 30, 'var(--fi-leaf-2)', 1)}${leaf(276, 84, 0, 'var(--fi-leaf)', 1)}
      <rect x="326" y="96" width="10" height="12" rx="3" fill="${P('towel-3')}" ${o(1.5)}/><rect x="327" y="92" width="8" height="5" rx="2" fill="var(--fi-curtain)" ${o(1.3)}/>
      <rect x="340" y="100" width="8" height="8" rx="2" fill="${P('tile')}" ${o(1.4)}/>${heart(344, 106, 0.3, 'var(--fi-flower-1)')}

      <path d="M388 0V34" ${o(1.4)}/><path d="M378 34H398L395 50H381Z" fill="${P('tile')}" ${o(1.8)}/>
      ${leaf(380, 56, 10, 'var(--fi-leaf)', 1)}${leaf(384, 68, -10, 'var(--fi-leaf-2)', 1)}${leaf(381, 80, 15, 'var(--fi-leaf)', 0.9)}${leaf(394, 58, -20, 'var(--fi-leaf-2)', 1)}${leaf(396, 72, 10, 'var(--fi-leaf)', 0.9)}

      <rect x="40" y="48" width="40" height="34" rx="6" fill="var(--fi-curtain)" ${o(2)}/><rect x="45" y="53" width="30" height="24" rx="3" fill="${P('mirror')}" ${o(1.6)}/>
      ${duck(60, 67, 0.5)}<circle cx="50" cy="59" r="2.4" fill="none" stroke="var(--fi-hi)" stroke-width="1.2"/><circle cx="70" cy="58" r="1.8" fill="none" stroke="var(--fi-hi)" stroke-width="1.2"/>
      <path d="M52 48l8 -7l8 7" fill="none" ${o(1.4)}/><circle cx="60" cy="41" r="1.6" fill="${INK}"/>

      <path d="M210 124H380" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M210 124H380" stroke="${P('gold')}" stroke-width="3" stroke-linecap="round"/>
      ${[218, 226, 234, 358, 366, 374].map((x) => `<circle cx="${x}" cy="127" r="3" fill="none" ${o(1.4)}/>`).join('')}
      <path d="M212 128Q206 160 220 178Q212 196 220 212H238Q232 194 238 178Q230 158 238 128Z" fill="var(--fi-curtain)" ${o(2)}/>
      <path d="M380 128Q386 160 372 178Q380 196 372 212H354Q360 194 354 178Q362 158 354 128Z" fill="var(--fi-curtain)" ${o(2)}/>
      <path d="M232 130Q226 158 234 176M232 182Q228 196 234 210M360 130Q366 158 358 176M360 182Q364 196 358 210" fill="none" stroke="var(--fi-curtain-2)" stroke-width="2" stroke-linecap="round"/>
      ${[[220, 142], [228, 160], [218, 196], [230, 204], [366, 142], [372, 162], [362, 196], [370, 204]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="var(--fi-hi)"/>`).join('')}
      <path d="M216 176q12 4 24 0l-2 6q-10 3 -20 0Z" fill="${P('trim')}" ${o(1.6)}/><path d="M228 179l-6 8M228 179l6 8" ${o(1.6)}/>
      <path d="M352 176q12 4 24 0l2 6q-10 3 -20 0Z" fill="${P('trim')}" ${o(1.6)}/><path d="M364 179l-6 8M364 179l6 8" ${o(1.6)}/>

      <rect x="170" y="138" width="46" height="6" rx="3" fill="${P('frame')}" ${o(1.8)}/>
      <rect x="174" y="124" width="12" height="14" rx="3" fill="${P('tile')}" ${o(1.6)}/><rect x="173" y="120" width="14" height="5" rx="2" fill="var(--fi-curtain)" ${o(1.4)}/>${hl('M177 128v6', 1.3, 0.8)}
      <path d="M190 138V124Q190 120 194 120Q198 120 198 124V138Z" fill="${P('towel-3')}" ${o(1.6)}/><path d="M194 120V114h4" fill="none" ${o(1.6)}/>${heart(194, 131, 0.3, 'var(--fi-hi)')}
      <rect x="202" y="128" width="11" height="10" rx="3" fill="${P('mirror')}" ${o(1.5)}/><circle cx="205.5" cy="128" r="2.6" fill="${P('foam')}" ${o(1)}/><circle cx="209.5" cy="127" r="2.6" fill="${P('foam')}" ${o(1)}/>

      <path d="M88 154H172V163H88Z" fill="${P('porcelain')}" ${o(2.2)}/><path d="M92 163H168Q166 190 130 194Q94 190 92 163Z" fill="${P('porcelain')}" ${o(2.4)}/>
      <path d="M150 163H168Q166 190 130 194Q156 182 150 163Z" fill="${P('porcelain-2')}"/>${hl('M98 168Q104 184 120 189', 2, 0.7)}
      <path d="M130 154V144Q130 140 126 140H122" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M130 154V144Q130 140 126 140H122" fill="none" stroke="${P('gold')}" stroke-width="3.6" stroke-linecap="round"/>
      <circle cx="138" cy="150" r="3" fill="var(--fi-water)" ${o(1.3)}/>
      <rect x="98" y="142" width="10" height="12" rx="3" fill="var(--fi-curtain)" ${o(1.5)}/><path d="M103 142v-4h4" fill="none" ${o(1.5)}/>
      <rect x="152" y="142" width="12" height="12" rx="3" fill="${P('tile')}" ${o(1.5)}/><path d="M155 142l-2 -10M160 142l3 -9" ${o(1.6)}/>
      <rect x="150" y="130" width="5" height="4" rx="1.5" fill="var(--fi-flower-1)" ${o(1)}/><rect x="161" y="131" width="5" height="4" rx="1.5" fill="var(--fi-water)" ${o(1)}/>

      <path d="M36 296L32 252H80L76 296Z" fill="${P('wicker')}" ${o(2)}/><path d="M34 264H78M35 276H77M36 288H76M44 252V296M56 252V296M68 252V296" stroke="${P('wicker-2')}" stroke-width="1.4"/>
      <path d="M40 254Q46 240 56 248Q64 238 72 252Z" fill="${P('towel-2')}" ${o(1.6)}/><path d="M60 250q4 -12 12 -10l-2 8" fill="${P('towel-1')}" ${o(1.4)}/>
      <rect x="28" y="248" width="56" height="7" rx="3.5" fill="${P('wicker-2')}" ${o(1.8)}/>

      <rect x="70" y="292" width="112" height="26" rx="13" fill="${P('rug')}" ${o(2.2)}/><rect x="78" y="297" width="96" height="16" rx="8" fill="none" stroke="${P('rug-2')}" stroke-width="2" stroke-dasharray="4 4"/>
      ${heart(126, 308, 0.8, 'var(--fi-hi)')}<path d="${fringe}" stroke="${P('rug-2')}" stroke-width="2" stroke-linecap="round"/>
      <g class="fi-back"></g>
      <g class="fi-layers"></g>
      ${hari(10, 326)}
      <rect class="fi-gloom" width="400" height="400" fill="${P('gloom')}"/>
      <g class="fi-front"></g>`;
  }

  HH.fixitScenes.bathroom = {
    id: 'bathroom', name: ['fis_bathroom', 'Bubbly bathroom'],
    probs: {
      valve: ['fip_bathroom_valve', 'Open water valve'], pipe: ['fip_bathroom_pipe', 'Leaking pipe'],
      tub: ['fip_bathroom_tub', 'Overflowing tub'], flood: ['fip_bathroom_flood', 'Flooded floor'],
      tiles: ['fip_bathroom_tiles', 'Loose tiles'], mirror: ['fip_bathroom_mirror', 'Cracked mirror'],
      fuse: ['fip_bathroom_fuse', 'Fuse box'], lamp: ['fip_bathroom_lamp', 'Broken mirror light'],
      fan: ['fip_bathroom_fan', 'Fallen fan'], rack: ['fip_bathroom_rack', 'Fallen towel rack'],
      towels: ['fip_bathroom_towels', 'Towels on the floor'], duck: ['fip_bathroom_duck', 'Lost rubber duck'],
    },
    spots: SPOT, layers: LAYERS, draw: DRAW, base,
    flags(stOf) {
      const fuse = stOf('fuse');
      const powerBack = fuse === 'fixed' && stOf('lamp') !== 'broken' && stOf('fan') !== 'broken';
      const live = fuse !== 'fixed' || powerBack;
      return { waterOff: stOf('valve') !== 'broken', powerBack, live, lampOn: live && stOf('lamp') !== 'broken', rackUp: stOf('rack') !== 'broken', bath: stOf('tub') !== 'broken' };
    },
    front(S, stOf, solved) {
      let fr = '';
      if (S.lampOn) fr += `<ellipse cx="130" cy="96" rx="58" ry="54" fill="var(--fi-glow)" opacity=".45" class="fi-beam"/>`;
      if (S.bath) {
        fr += `<g class="fi-bathroom-steam"><path d="M258 196q-6 -10 0 -18t0 -18M294 192q-6 -10 0 -18t0 -18M330 196q-6 -10 0 -18t0 -18" fill="none" stroke="var(--fi-smoke)" stroke-width="3" stroke-linecap="round"/></g>`;
        fr += [[248, 0, 5], [290, 1.4, 4], [334, 2.6, 6], [270, 3.6, 3.5]].map(([x, d, r]) =>
          `<g class="fi-bathroom-soap" style="animation-delay:${d}s"><circle cx="${x}" cy="200" r="${r}" fill="var(--fi-hi)" fill-opacity=".25" stroke="var(--fi-hi)" stroke-width="1.3"/><circle cx="${x - r * 0.35}" cy="${200 - r * 0.35}" r="${r * 0.25}" fill="var(--fi-hi)"/></g>`).join('');
      }
      if (solved) fr += `<g class="fi-bathroom-rays">${heart(250, 160, 1, 'var(--fi-flower-1)')}${heart(170, 230, 0.8, 'var(--fi-curtain)')}${sparkle(214, 196, 6)}${sparkle(150, 270, 5, 'var(--fi-spark)')}</g>`;
      return fr;
    },
    back: (solved) => (solved ? `<g class="fi-bathroom-rays"><path d="M270 104L344 104L300 400L110 400Z" fill="${P('ray')}"/><path d="M286 104L320 104L250 400L170 400Z" fill="${P('ray')}"/>` +
      `${sparkle(240, 200, 6)}${sparkle(200, 270, 5, 'var(--fi-spark)')}${sparkle(270, 150, 4)}${heart(222, 240, 0.7, 'var(--fi-flower-1)')}</g>` : ''),
  };

  /* ---------- attrezzi nuovi (viewBox 40×40) ---------- */
  const { addTool } = HH.fixitKit;
  addTool('stopper', `<path d="M33 7Q36 14 30 16" fill="none" stroke="var(--fi-bathroom-gold-2)" stroke-width="2.2" stroke-dasharray="2.4 2" stroke-linecap="round"/>` +
    `<circle cx="32" cy="6" r="3" fill="none" ${o(1.8)}/><path d="M20 18Q26 12 30 16" fill="none" stroke="var(--fi-bathroom-gold-2)" stroke-width="2.2" stroke-dasharray="2.4 2" stroke-linecap="round"/>` +
    `<path d="M8 22H32L28 34Q20 37 12 34Z" fill="var(--fi-bathroom-tub-2)" ${o(2)}/><ellipse cx="20" cy="22" rx="12" ry="4" fill="var(--fi-bathroom-tub)" ${o(2)}/>` +
    `<path d="M20 22V17" ${o(2)}/><circle cx="20" cy="15.5" r="2.4" fill="var(--fi-bathroom-gold)" ${o(1.6)}/>${hl('M12 27l1.5 5', 1.8, 0.7)}`, 'Bath plug');
  addTool('towel', `<rect x="5" y="22" width="30" height="12" rx="4" fill="var(--fi-bathroom-towel-2)" ${o(2)}/>` +
    `<circle cx="12" cy="28" r="1.5" fill="var(--fi-hi)"/><circle cx="20" cy="28" r="1.5" fill="var(--fi-hi)"/><circle cx="28" cy="28" r="1.5" fill="var(--fi-hi)"/>` +
    `<rect x="7" y="10" width="27" height="13" rx="4" fill="var(--fi-bathroom-towel-1)" ${o(2)}/><path d="M7 15H34M7 19H34" stroke="var(--fi-hi)" stroke-width="1.8"/>` +
    `<path d="M11 10Q6 16 11 23" fill="none" ${o(1.6)}/>${heart(27, 9, 0.55, 'var(--fi-flower-1)')}`, 'Towel');
  addTool('duck', duck(19, 24, 1.15), 'Rubber duck');
})(typeof globalThis !== 'undefined' ? globalThis : window);
