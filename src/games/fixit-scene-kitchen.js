/* Fix-It House — scenario "cucina" (vista frontale con prospettiva centrale). Contratto in fixit-scene-house.js.
 * Fondale: soffitto e pareti laterali in fuga, carta da parati menta a pois e cuoricini, festoni, piastrelle,
 * forno lilla col bollitore, piano di lavoro col lavello, frigo azzurro con la faccina, pavimento a scacchi pastello.
 * Il temporale sta fuori dalla finestra (nuvole + pioggia nel vetro) e una penombra fi-gloom copre la stanza.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const { INK, o, stick, star, hl, sparkle, cloud, stormCloud, hari, addTool } = HH.fixitKit;
  const K = (n) => `var(--fi-kitchen-${n})`;

  const SPOT = {
    breaker: [314, 30, 52, 56], socket: [252, 148, 46, 44], lamp: [176, 24, 48, 54],
    valve: [176, 224, 48, 48], faucet: [174, 144, 52, 48], flood: [136, 300, 110, 48],
    fridge: [310, 124, 64, 90], shards: [262, 330, 78, 46], shelf: [226, 98, 78, 40], jars: [226, 52, 78, 44],
    window: [62, 78, 80, 60], curtain: [52, 36, 100, 38], cake: [36, 214, 78, 64], dishes: [120, 144, 48, 48],
  };
  const LAYERS = ['window', 'curtain', 'breaker', 'lamp', 'shelf', 'jars', 'socket', 'fridge', 'cake',
    'dishes', 'valve', 'faucet', 'flood', 'shards'];

  const heart = (x, y, k, c, extra = '') => `<path d="M${x} ${y + 3 * k}c${-5 * k} ${-4 * k} ${-6 * k} ${-7 * k} ${-6 * k} ${-9 * k}a${3 * k} ${3 * k} 0 0 1 ${6 * k} ${-1 * k}a${3 * k} ${3 * k} 0 0 1 ${6 * k} ${1 * k}c0 ${2 * k} ${-1 * k} ${5 * k} ${-6 * k} ${9 * k}z" fill="${c}" ${extra}/>`;
  const puffs = (pts, c) => `<g class="fi-smoke">${pts.map(([x, y, r, d]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" style="animation-delay:${d}s"/>`).join('')}</g>`;

  /* ---------- disegni ---------- */
  const DRAW = {
    window(st, S) {
      const muntin = `<rect x="100" y="56" width="4" height="80" fill="${K('frame')}"/><rect x="62" y="94" width="80" height="4" fill="${K('frame')}"/>`;
      if (st !== 'broken') {
        return `<rect x="62" y="56" width="80" height="80" fill="var(--fi-glass)" opacity=".28"/>` +
          `<path d="M68 76L80 62M70 90L92 66M108 76L120 62M110 120L126 104" stroke="var(--fi-glass-2)" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>` +
          muntin + (st === 'fixed' ? sparkle(132, 66, 6) + sparkle(74, 126, 4) : '');
      }
      const hole = 'M112 66L124 60L134 70L130 78L138 86L122 88L116 80Z';
      const drops = [[118, 0], [126, 0.5], [122, 1]].map(([x, d]) => `<path d="M${x} 90q3 5 0 8q-3 -3 0 -8Z" fill="var(--fi-water)" ${o(1.1)} class="fi-drip" style="animation-delay:${d}s"/>`).join('');
      return `<path d="M62 56H142V136H62Z${hole}" fill-rule="evenodd" fill="var(--fi-glass)" opacity=".34"/>` +
        `<path d="${hole}" fill="none" ${o(1.8)}/>` +
        `<path d="M116 80L106 92M116 80L104 68M122 88L120 104M130 78L140 70M124 60L128 56M138 86L142 98M106 92L100 96" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` +
        hl('M70 90L86 72', 2.2, 0.6) + muntin + drops +
        `<path d="M110 146l6 -6l4 6ZM124 147l3 -4l4 4Z" fill="var(--fi-glass)" ${o(1.3)}/>`;
    },
    curtain(st, S) {
      const rod = stick(48, 44, 156, 44, 3, K('frame')) + `<circle cx="48" cy="44" r="4" fill="var(--fi-curtain-2)" ${o(1.6)}/><circle cx="156" cy="44" r="4" fill="var(--fi-curtain-2)" ${o(1.6)}/>`;
      let sc = '';
      for (let x = 150; x > 54; x -= 12) sc += `A6 6 0 0 1 ${x - 12} 62`;
      const val = `<path d="M54 46H150V62${sc}V46Z" fill="var(--fi-curtain)" ${o(2)}/>` +
        `<path d="M54 46H150V51H54Z" fill="var(--fi-ink)" opacity=".08"/>` +
        [62, 78, 94, 110, 126, 142].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 54 : 57}" r="2" fill="var(--fi-hi)" opacity=".8"/>`).join('') +
        hl('M58 49H96', 1.6, 0.55);
      const panelL = `<path d="M56 50Q66 76 60 100Q70 112 64 140H54V50Z" fill="var(--fi-curtain-2)" ${o(1.8)}/>`;
      const panelR = `<path d="M148 50Q138 76 144 100Q134 112 140 140H150V50Z" fill="var(--fi-curtain-2)" ${o(1.8)}/>`;
      const ties = `<path d="M54 100q6 3 10 0" fill="none" stroke="var(--fi-flower-2)" stroke-width="3" stroke-linecap="round"/><path d="M140 100q6 3 10 0" fill="none" stroke="var(--fi-flower-2)" stroke-width="3" stroke-linecap="round"/>`;
      if (st !== 'broken') return panelL + panelR + ties + val + rod + (st === 'fixed' ? heart(102, 70, 0.9, 'var(--fi-flower-1)') : '');
      const cls = S.winOk ? 'fi-kitchen-swing' : 'fi-kitchen-swing fi-kitchen-wind';
      return panelL + ties + rod +
        `<g class="${cls}"><path d="M54 46L96 50L92 58L98 64L90 70Q84 80 78 78A6 6 0 0 1 66 74A6 6 0 0 1 56 68Z" fill="var(--fi-curtain)" ${o(2)}/>` +
        `<circle cx="66" cy="58" r="2" fill="var(--fi-hi)" opacity=".8"/><circle cx="80" cy="62" r="2" fill="var(--fi-hi)" opacity=".8"/></g>` +
        `<path d="M128 140Q126 130 136 128Q144 122 152 130Q158 136 154 142Z" fill="var(--fi-curtain)" ${o(1.8)}/>` +
        `<path d="M134 136q4 -4 8 0M144 134q3 3 6 1" fill="none" stroke="var(--fi-curtain-2)" stroke-width="1.6" stroke-linecap="round"/>` +
        `<path d="M98 48l3 -4M102 52l4 -2" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`;
    },
    breaker(st, S) {
      const up = st !== 'fixed' || S.power;
      const lever = up ? `<rect x="335" y="50" width="8" height="12" rx="2" fill="${st === 'broken' ? 'var(--fi-valve)' : 'var(--fi-leaf)'}" ${o(1.6)}/>`
        : `<rect x="335" y="64" width="8" height="12" rx="2" fill="var(--fi-metal)" ${o(1.6)}/>`;
      const zap = st === 'broken' ? `<g class="fi-zap"><path d="M362 46l-6 7h5l-5 8" fill="none" stroke="var(--fi-spark)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M318 72l-5 4h4l-4 6" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
      return `<rect x="322" y="38" width="34" height="46" rx="5" fill="var(--fi-metal)" ${o(2.2)}/><rect x="348" y="40" width="6" height="42" rx="2" fill="var(--fi-ink)" opacity=".1"/>` +
        `<rect x="329" y="46" width="20" height="32" rx="3" fill="var(--fi-metal-2)"/>${lever}` +
        `<path d="M326 42h6" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round"/>${hl('M325 46v10', 1.6, 0.7)}${zap}` +
        (st === 'fixed' ? sparkle(362, 40, 5) : '');
    },
    lamp(st, S) {
      const cord = `<path d="M200 22V42" ${o(2.2)}/><rect x="195" y="22" width="10" height="4" rx="2" fill="${K('frame')}" ${o(1.4)}/>`;
      let sc = '';
      for (let x = 222; x > 178; x -= 11) sc += `A5.5 5.5 0 0 1 ${x - 11} 64`;
      const shade = `<path d="M178 64Q178 42 200 42Q222 42 222 64${sc}Z" fill="${K('lamp')}" ${o(2.2)}/>` +
        `<path d="M206 44Q220 48 221 63L212 64Q212 52 206 44Z" fill="var(--fi-ink)" opacity=".1"/>${hl('M184 58Q186 48 194 45', 2, 0.7)}` +
        heart(200, 58, 0.7, 'var(--fi-flower-1)');
      if (st === 'broken') {
        return `${cord}<g class="fi-dangle"><g transform="rotate(18 200 42)">${shade}<circle cx="200" cy="70" r="6" fill="var(--fi-hole)" ${o(1.8)}/>` +
          `<path d="M197 67l3 3l-2 3" fill="none" stroke="var(--fi-glass)" stroke-width="1.4"/></g></g>` +
          `<path d="M218 78l4 -2M216 84l5 1" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>`;
      }
      const on = S.lit;
      return `${cord}${on ? '<circle cx="200" cy="70" r="14" fill="var(--fi-glow)" class="fi-glowdot"/>' : ''}` +
        `<circle cx="200" cy="70" r="6" fill="${on ? 'var(--fi-fire-3)' : 'var(--fi-glass-2)'}" ${o(1.8)}/>${shade}` +
        (st === 'fixed' ? sparkle(228, 46, 5) : '');
    },
    shelf(st) {
      const bracket = (x, y = 108) => `<path d="M${x - 5} ${y}H${x + 5}V${y + 4}Q${x + 5} ${y + 14} ${x - 5} ${y + 16}Z" fill="${K('frame')}" ${o(1.6)}/>`;
      const board = `<rect x="226" y="100" width="78" height="8" rx="3" fill="var(--fi-wood)" ${o(2)}/><path d="M228 106H302" stroke="var(--fi-wood-2)" stroke-width="2"/>${hl('M230 102H262', 1.5, 0.6)}`;
      const lace = `<path d="M228 108${[0, 1, 2, 3, 4, 5].map((i) => `a6 4 0 0 0 12 0`).join('')}" fill="var(--fi-lace)" ${o(1.2)}/>`;
      if (st !== 'broken') return bracket(240) + bracket(290) + lace + board + (st === 'fixed' ? sparkle(310, 98, 5) : '');
      return bracket(240) + `<circle cx="290" cy="110" r="1.8" fill="var(--fi-ink)"/><circle cx="290" cy="118" r="1.8" fill="var(--fi-ink)"/>` +
        `<g class="fi-wobble"><g transform="rotate(30 230 104)">${board}</g></g>` +
        `<g transform="rotate(-80 256 300)">${bracket(256, 292)}</g>`;
    },
    jars(st, S) {
      if (!S.shelfUp && st !== 'broken') return '';
      const jar = (x, w, h, lid, fill, dots) => `<rect x="${x}" y="${100 - h}" width="${w}" height="${h}" rx="5" fill="var(--fi-glass)" opacity=".55"/>` +
        `<rect x="${x + 2}" y="${100 - h * 0.62}" width="${w - 4}" height="${h * 0.62 - 2}" rx="3" fill="${fill}"/>` +
        dots + `<rect x="${x}" y="${100 - h}" width="${w}" height="${h}" rx="5" fill="none" ${o(1.8)}/>` +
        `<rect x="${x - 2}" y="${96 - h}" width="${w + 4}" height="6" rx="2.5" fill="${lid}" ${o(1.6)}/>` +
        hl(`M${x + 3} ${104 - h}v${h * 0.5}`, 1.6, 0.8);
      if (st === 'broken') {
        return `<g opacity=".7" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 4" stroke-linecap="round">` +
          `<rect x="234" y="78" width="16" height="22" rx="5"/><rect x="256" y="74" width="20" height="26" rx="5"/><rect x="282" y="80" width="15" height="20" rx="5"/></g>` +
          `<text x="266" y="94" font-size="14" text-anchor="middle" fill="${INK}" font-weight="800" opacity=".6">?</text>`;
      }
      const choc = [[240, 92], [246, 88], [242, 96]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="var(--fi-wood-2)"/>`).join('');
      const cand = [[262, 90, 'var(--fi-flower-1)'], [270, 94, 'var(--fi-water)'], [266, 86, 'var(--fi-flower-2)'], [271, 84, 'var(--fi-leaf)']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}"/>`).join('');
      return jar(234, 16, 22, 'var(--fi-flower-1)', K('cake'), choc) + jar(256, 20, 26, 'var(--fi-roof)', K('cream'), cand) +
        jar(282, 15, 20, 'var(--fi-leaf)', 'var(--fi-curtain)', heart(289.5, 92, 0.5, 'var(--fi-hi)')) +
        (st === 'fixed' ? sparkle(300, 70, 5) + sparkle(232, 66, 3.5) : '');
    },
    socket(st, S) {
      const plate = (x, y) => `<rect x="${x - 10}" y="${y - 12}" width="20" height="24" rx="5" fill="var(--fi-lace)" ${o(1.8)}/>` +
        `<circle cx="${x - 3.5}" cy="${y - 2}" r="1.8" fill="var(--fi-ink)"/><circle cx="${x + 3.5}" cy="${y - 2}" r="1.8" fill="var(--fi-ink)"/>` +
        `<path d="M${x - 3} ${y + 5}q3 2 6 0" fill="none" ${o(1.3)}/><ellipse cx="${x - 6}" cy="${y + 4}" rx="2" ry="1.3" fill="var(--fi-flower-1)" opacity=".6"/><ellipse cx="${x + 6}" cy="${y + 4}" rx="2" ry="1.3" fill="var(--fi-flower-1)" opacity=".6"/>`;
      if (st !== 'broken') return plate(276, 170) + (st === 'fixed' ? sparkle(292, 158, 4.5) : '');
      const sp = S.live ? `<g class="fi-zap">${star(266, 160, 5, 'var(--fi-spark)')}${star(288, 166, 4, 'var(--fi-spark)')}</g>` : '';
      return `<rect x="268" y="160" width="16" height="12" rx="3" fill="var(--fi-hole)" ${o(1.6)}/>` +
        `<g class="fi-dangle"><path d="M272 166C268 174 274 178 270 184M280 166C284 174 278 178 282 184" fill="none" stroke="var(--fi-wire)" stroke-width="2.4" stroke-linecap="round"/>` +
        `<g transform="rotate(-24 276 194)">${plate(276, 194)}</g></g>${sp}`;
    },
    fridge(st, S) {
      const body = `<rect x="304" y="96" width="74" height="194" rx="12" fill="${K('fridge')}" ${o(2.4)}/>` +
        `<path d="M366 98Q376 100 376 110V280Q376 288 368 288H362V98Z" fill="${K('fridge-2')}"/>` +
        `<rect x="310" y="288" width="8" height="5" rx="2" fill="var(--fi-metal-2)" ${o(1.4)}/><rect x="364" y="288" width="8" height="5" rx="2" fill="var(--fi-metal-2)" ${o(1.4)}/>`;
      const freezer = `<rect x="308" y="100" width="66" height="46" rx="9" fill="${K('fridge')}" ${o(2)}/><path d="M362 102Q372 104 372 112V142H362Z" fill="${K('fridge-2')}"/>` +
        stick(316, 112, 316, 134, 3, 'var(--fi-metal)') + hl('M322 106H344', 2, 0.7) +
        heart(346, 124, 0.8, 'var(--fi-flower-1)', o(1)) + star(362, 116, 4, 'var(--fi-flower-2)') +
        `<circle cx="366" cy="136" r="2.6" fill="${S.power ? 'var(--fi-leaf)' : 'var(--fi-metal-2)'}" ${o(1)}/>`;
      const note = `<rect x="336" y="222" width="22" height="26" rx="2" transform="rotate(6 347 235)" fill="var(--fi-lace)" ${o(1.4)}/>` +
        `<circle cx="347" cy="221" r="3" fill="var(--fi-flower-3)" ${o(1)}/>` +
        `<path d="M346 230q-5 2 -4 7q2 5 6 4q4 -1 4 -6q-1 -5 -6 -5Z" fill="var(--fi-flower-1)"/><path d="M344 229l3 2l3 -2" fill="none" stroke="var(--fi-leaf-2)" stroke-width="1.6" stroke-linecap="round"/>`;
      const face = (happy) => happy
        ? `<path d="M330 186q3 -4 6 0M348 186q3 -4 6 0" fill="none" ${o(2)}/><path d="M337 196q5 5 10 0" fill="none" ${o(1.8)}/>` +
          `<ellipse cx="327" cy="194" rx="4" ry="2.4" fill="var(--fi-flower-1)" opacity=".55"/><ellipse cx="357" cy="194" rx="4" ry="2.4" fill="var(--fi-flower-1)" opacity=".55"/>`
        : `<path d="M330 184l5 3l-5 3M354 184l-5 3l5 3" fill="none" ${o(1.8)}/><path d="M337 200q5 -5 10 0" fill="none" ${o(1.8)}/>` +
          `<path d="M326 176q-3 5 0 7q3 -2 0 -7Z" fill="var(--fi-water)" ${o(1)}/>`;
      if (st !== 'broken') {
        const cord = S.sockOk ? `<path d="M305 210Q294 212 292 196Q290 180 282 176" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M305 210Q294 212 292 196Q290 180 282 176" fill="none" stroke="var(--fi-wire)" stroke-width="2.6" stroke-linecap="round"/>` +
          `<rect x="276" y="171" width="10" height="9" rx="2.5" fill="${K('fridge')}" ${o(1.5)}/>` : '';
        return body + freezer + `<rect x="308" y="150" width="66" height="136" rx="9" fill="${K('fridge')}" ${o(2)}/><path d="M362 152Q372 154 372 162V282H362Z" fill="${K('fridge-2')}"/>` +
          stick(316, 164, 316, 202, 3, 'var(--fi-metal)') + hl('M322 156H346', 2, 0.7) + face(true) + note + cord +
          (st === 'fixed' ? sparkle(384, 150, 5) + sparkle(300, 128, 4) : '');
      }
      return body + freezer +
        `<rect x="308" y="150" width="66" height="136" rx="9" fill="${K('inside')}" ${o(2)}/>` +
        `<path d="M360 176H372M360 216H372M360 252H372" stroke="var(--fi-metal-2)" stroke-width="2"/>` +
        `<path d="M306 150L360 144V292L306 286Z" fill="${K('fridge')}" ${o(2.2)}/><path d="M352 146L360 145V291L352 290Z" fill="${K('fridge-2')}"/>` +
        stick(314, 164, 314, 202, 3, 'var(--fi-metal)') + face(false) + note +
        `<g class="fi-puff"><circle cx="370" cy="200" r="6" fill="${K('cold')}" opacity=".85"/><circle cx="378" cy="190" r="5" fill="${K('cold')}" opacity=".75"/><circle cx="372" cy="232" r="5" fill="${K('cold')}" opacity=".7"/></g>` +
        `<path d="M305 262Q292 270 296 290Q298 300 290 304" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M305 262Q292 270 296 290Q298 300 290 304" fill="none" stroke="var(--fi-wire)" stroke-width="2.6" stroke-linecap="round"/>` +
        `<g transform="rotate(-30 286 306)"><rect x="279" y="301" width="12" height="10" rx="3" fill="${K('fridge')}" ${o(1.5)}/><path d="M281 301v-4M287 301v-4" ${o(1.6)}/></g>`;
    },
    cake(st, S) {
      const rack = `<path d="M48 258H100" stroke="var(--fi-metal-2)" stroke-width="2"/>`;
      if (st === 'broken') {
        return `<rect x="46" y="230" width="56" height="40" rx="6" fill="${K('heat')}"/>` + rack +
          `<path d="M58 258Q58 242 74 242Q90 242 90 258Z" fill="${K('burnt')}" ${o(1.8)}/><path d="M64 246q4 -2 6 1M78 245q3 2 6 0" fill="none" stroke="var(--fi-fire)" stroke-width="1.6" stroke-linecap="round"/>` +
          `<rect x="46" y="230" width="56" height="40" rx="6" fill="none" ${o(2)}/>` +
          puffs([[60, 206, 6, 0], [76, 198, 8, 0.7], [92, 206, 6, 1.4], [70, 186, 7, 1.9]], K('smoke')) +
          `<circle cx="106" cy="206" r="3" fill="var(--fi-valve)" ${o(1.2)} class="fi-zap"/>`;
      }
      const win = `<rect x="46" y="230" width="56" height="40" rx="6" fill="${K('inside')}" ${o(2)}/>${rack}${hl('M52 236l10 -0', 1.6, 0.5)}<path d="M52 248L64 236M54 264L76 242" stroke="var(--fi-glass)" stroke-width="2" stroke-linecap="round" opacity=".45"/>` +
        `<circle cx="106" cy="206" r="3" fill="var(--fi-metal-2)" ${o(1.2)}/>`;
      if (st === 'idle') return win;
      return win + `<ellipse cx="56" cy="188" rx="20" ry="3.5" fill="var(--fi-lace)" ${o(1.6)}/>` +
        `<path d="M40 186V172Q40 166 46 166H66Q72 166 72 172V186Z" fill="${K('cake')}" ${o(2)}/>` +
        `<path d="M40 176H72" stroke="var(--fi-curtain)" stroke-width="3"/>` +
        `<path d="M40 172Q40 166 46 166H66Q72 166 72 172V174Q68 178 66 174Q62 180 58 174Q54 178 50 174Q46 179 44 174Q41 177 40 174Z" fill="${K('cream')}" ${o(1.6)}/>` +
        `<path d="M56 166q-5 -1 -5 -6q1 -5 5 -4q4 -1 5 4q0 5 -5 6Z" fill="var(--fi-flower-1)" ${o(1.4)}/><path d="M53 156l3 2l3 -2" fill="none" stroke="var(--fi-leaf-2)" stroke-width="1.6" stroke-linecap="round"/>` +
        hl('M43 180V172', 1.6, 0.7) + sparkle(78, 162, 5) + sparkle(36, 160, 3.5);
    },
    dishes(st) {
      if (st === 'broken') {
        const plate = (y, r, c) => `<g transform="rotate(${r} 144 ${y})"><ellipse cx="144" cy="${y}" rx="19" ry="4.2" fill="${c}" ${o(1.6)}/><ellipse cx="144" cy="${y - 0.6}" rx="11" ry="2" fill="none" stroke="var(--fi-metal)" stroke-width="1.2"/></g>`;
        return plate(186, 0, K('plate')) + plate(181, -4, 'var(--fi-water)') + plate(176, 5, K('plate')) + plate(171, -7, 'var(--fi-curtain)') + plate(166, 3, K('plate')) +
          `<path d="M150 158h12v10a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4Z" fill="var(--fi-flower-2)" ${o(1.6)}/><path d="M162 160q5 0 4 5q-1 3 -4 3" fill="none" ${o(1.6)}/>` +
          [[136, 166], [150, 171], [140, 180], [156, 177], [154, 162]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="1.6" fill="${K('grime')}"/>`).join('') +
          `<g class="fi-sway"><path d="M132 158q-3 -4 0 -7q3 -3 0 -7M142 154q-3 -4 0 -7q3 -3 0 -7" fill="none" stroke="var(--fi-leaf-2)" stroke-width="1.8" stroke-linecap="round"/></g>`;
      }
      const rack = `<path d="M124 190V180M166 190V180M124 184H166" fill="none" stroke="var(--fi-metal-2)" stroke-width="2" stroke-linecap="round"/>`;
      const up = (x, c) => `<ellipse cx="${x}" cy="174" rx="3.6" ry="14" fill="${c}" ${o(1.6)}/><ellipse cx="${x}" cy="174" rx="1.4" ry="8" fill="none" stroke="var(--fi-metal)" stroke-width="1"/>`;
      return up(132, K('plate')) + up(140, 'var(--fi-water)') + up(148, K('plate')) + up(156, 'var(--fi-curtain)') + rack +
        `<path d="M158 178h10v8a3 3 0 0 1 -3 3h-4a3 3 0 0 1 -3 -3Z" fill="var(--fi-flower-2)" ${o(1.4)}/>` +
        (st === 'fixed' ? sparkle(126, 156, 5) + sparkle(162, 164, 4) : '');
    },
    valve(st) {
      const wheel = `<circle cx="200" cy="248" r="11" fill="none" stroke="${INK}" stroke-width="7.5"/><circle cx="200" cy="248" r="11" fill="none" stroke="var(--fi-valve)" stroke-width="4"/>` +
        `<path d="M200 238V258M190 248H210" ${o(2.6)}/><circle cx="200" cy="248" r="3.5" fill="var(--fi-valve)" ${o(1.6)}/>`;
      if (st !== 'broken') return `<g transform="rotate(45 200 248)">${wheel}</g>` + (st === 'fixed' ? sparkle(216, 232, 4.5) : '');
      return `<path d="M200 206V262Q200 268 206 268H236" fill="none" stroke="var(--fi-water-2)" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round" class="fi-flow"/>` +
        `<g class="fi-spin">${wheel}</g>`;
    },
    faucet(st, S) {
      const neck = 'M198 190V166Q198 154 210 154Q222 154 222 166V172';
      const tap = `<rect x="189" y="186" width="18" height="6" rx="3" fill="var(--fi-metal-2)" ${o(1.6)}/>` +
        `<path d="${neck}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="${neck}" fill="none" stroke="var(--fi-metal)" stroke-width="5" stroke-linecap="round"/>` +
        `<rect x="217" y="170" width="10" height="6" rx="2" fill="var(--fi-metal-2)" ${o(1.5)}/>${hl('M201 178V166Q201 159 207 157', 1.4, 0.8)}` +
        heart(184, 186, 0.8, 'var(--fi-flower-1)', o(1.2)) + heart(212, 186, 0.8, 'var(--fi-water)', o(1.2));
      if (st !== 'broken') return tap + (st === 'fixed' ? sparkle(232, 156, 5) : '');
      const crack = `<path d="M206 150l3 3l-3 2l4 2" fill="none" ${o(1.6)}/>`;
      if (S.waterOff) return tap + crack + `<path d="M222 178q3 4 0 6q-3 -2 0 -6Z" fill="var(--fi-water)" ${o(1.1)}/>`;
      const drop = (x, y, d) => `<path d="M${x} ${y}q4 6 0 9q-4 -3 0 -9Z" fill="var(--fi-water)" ${o(1.1)} class="fi-drip" style="animation-delay:${d}s"/>`;
      return tap + crack +
        `<path d="M210 152q-12 -12 -24 -4M210 152q10 -14 24 -6M210 152q0 -14 6 -18M210 152q-6 -10 -16 -12" fill="none" stroke="var(--fi-water-2)" stroke-width="2.2" stroke-linecap="round" class="fi-spray"/>` +
        `<path d="M222 177V194" stroke="var(--fi-water)" stroke-width="4" stroke-linecap="round"/><path d="M222 177V194" stroke="var(--fi-water-2)" stroke-width="1.6" stroke-dasharray="3 5" class="fi-flow"/>` +
        drop(184, 150, 0) + drop(236, 152, 0.4) + drop(238, 204, 0.2) + drop(230, 206, 0.8);
    },
    flood(st, S) {
      if (st === 'idle') return '';
      if (st === 'fixed') return sparkle(176, 322, 6) + sparkle(214, 330, 4) + star(240, 318, 3, 'var(--fi-hi)');
      const stream = !S.waterOff && !S.faucetOk ? `<path d="M234 206V302" stroke="var(--fi-water)" stroke-width="3" stroke-linecap="round" opacity=".8"/><path d="M234 206V302" stroke="var(--fi-water-2)" stroke-width="1.4" stroke-dasharray="3 7" class="fi-flow"/>` : '';
      return stream + `<path d="M128 330Q132 312 170 312Q192 302 226 310Q262 312 258 330Q252 348 200 346Q138 350 128 330Z" fill="var(--fi-water)" opacity=".85" ${o(1.8)}/>` +
        `<path d="M142 324q14 -8 30 -6M204 314q16 -2 28 4" fill="none" stroke="var(--fi-hi)" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>` +
        `<ellipse cx="170" cy="334" rx="12" ry="3" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.6" class="fi-ripple"/>` +
        `<ellipse cx="236" cy="326" rx="9" ry="2.4" fill="none" stroke="var(--fi-glass-2)" stroke-width="1.6" class="fi-ripple" style="animation-delay:1s"/>` +
        `<g class="fi-kitchen-bob"><path d="M196 330Q194 320 202 320Q204 312 211 313Q218 314 216 322Q222 322 222 328Q218 334 206 334Q198 334 196 330Z" fill="var(--fi-flower-2)" ${o(1.6)}/>` +
        `<path d="M216 316l5 1l-4 3Z" fill="var(--fi-fire)" ${o(1)}/><circle cx="212" cy="317" r="1.2" fill="var(--fi-ink)"/><path d="M202 326q4 2 8 0" fill="none" stroke="var(--fi-helmet-2)" stroke-width="1.4" stroke-linecap="round"/></g>`;
    },
    shards(st) {
      if (st === 'idle') return '';
      if (st === 'fixed') return sparkle(290, 350, 6) + sparkle(314, 358, 4) + star(302, 342, 3, 'var(--fi-hi)');
      return `<ellipse cx="300" cy="358" rx="34" ry="7" fill="var(--fi-shade)"/>` +
        `<path d="M272 356l8 -12l8 6l-4 10Z" fill="var(--fi-glass)" ${o(1.6)}/><path d="M290 362l6 -10l10 4l-6 9Z" fill="var(--fi-glass)" ${o(1.6)}/>` +
        `<path d="M310 352l10 -4l4 10l-10 2Z" fill="var(--fi-glass)" ${o(1.6)}/><path d="M318 366l8 -6l6 8Z" fill="var(--fi-glass)" ${o(1.4)}/>` +
        `<rect x="296" y="340" width="16" height="6" rx="2.5" transform="rotate(-20 304 343)" fill="var(--fi-roof)" ${o(1.5)}/>` +
        `<rect x="276" y="364" width="12" height="5" rx="2" transform="rotate(25 282 366)" fill="var(--fi-flower-1)" ${o(1.4)}/>` +
        [[284, 350, 'var(--fi-flower-1)'], [306, 366, 'var(--fi-water)'], [326, 350, 'var(--fi-flower-2)'], [298, 372, 'var(--fi-leaf)'], [334, 362, 'var(--fi-curtain)']]
          .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}" ${o(1)}/>`).join('') +
        hl('M276 352l4 -6', 1.4, 0.9) + hl('M312 352l6 -2', 1.4, 0.9);
    },
  };

  /* ---------- fondale ---------- */
  const VX = 200, VY = 120;
  const PX = (xb, y) => (VX + (xb - VX) * (y - VY) / (290 - VY)).toFixed(1);
  function floor() {
    const rows = [290, 303, 320, 342, 370, 406];
    let h = '';
    for (let r = 0; r < rows.length - 1; r++) {
      for (let i = -8; i < 19; i++) {
        const a = 20 + 36 * i, b = a + 36, y0 = rows[r], y1 = rows[r + 1];
        const xs = [PX(a, y0), PX(b, y0), PX(b, y1), PX(a, y1)].map(Number);
        if (Math.max(...xs) < 0 || Math.min(...xs) > 400) continue;
        h += `<path d="M${xs[0]} ${y0}L${xs[1]} ${y0}L${xs[2]} ${y1}L${xs[3]} ${y1}Z" fill="${(i + r) % 2 ? K('floor-a') : K('floor-b')}"/>`;
      }
    }
    return h;
  }
  function bunting(x0, x1, y) {
    const n = Math.round((x1 - x0) / 14), C = ['var(--fi-curtain)', 'var(--fi-flower-2)', 'var(--fi-leaf)', 'var(--fi-roof)', 'var(--fi-water)'];
    let flags = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + i * ((x1 - x0) / n) + 2, t = (i + 0.5) / n, yy = y + Math.sin(t * Math.PI) * 6;
      flags += `<path d="M${x.toFixed(1)} ${yy.toFixed(1)}h10l-5 9Z" fill="${C[i % C.length]}" ${o(1.2)}/>`;
    }
    return `<path d="M${x0} ${y}Q${(x0 + x1) / 2} ${y + 12} ${x1} ${y}" fill="none" ${o(1.4)}/>${flags}`;
  }
  function base() {
    const rain = Array.from({ length: 12 }, (_, i) => { const x = 58 + ((i * 23) % 90), y = 50 + ((i * 37) % 86); return `M${x} ${y}l-4 10`; }).join('');
    const wallHole = 'M20 22H380V290H20Z M62 56V136H142V56Z';
    return `<defs><linearGradient id="fiKSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-sky)"/><stop offset="1" stop-color="var(--fi-sky-2)"/></linearGradient>
      <linearGradient id="fiKStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fi-storm)"/><stop offset="1" stop-color="var(--fi-storm-2)" stop-opacity=".5"/></linearGradient>
      <pattern id="fiKDots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.2" fill="${K('dot')}"/>
        <path d="M16 19c-3 -2.4 -3.6 -4.2 -3.6 -5.4a1.8 1.8 0 0 1 3.6 -.6a1.8 1.8 0 0 1 3.6 .6c0 1.2 -.6 3 -3.6 5.4z" fill="${K('dot')}" opacity=".8"/></pattern>
      <pattern id="fiKTile" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${K('tile')}"/><path d="M0 .5H14M.5 0V14" stroke="${K('tile-2')}" stroke-width="1.4"/><circle cx="7" cy="7" r="1.3" fill="${K('tile-2')}"/></pattern>
      <clipPath id="fiKWin"><rect x="62" y="56" width="80" height="80"/></clipPath></defs>
      <g clip-path="url(#fiKWin)">
        <rect x="60" y="54" width="84" height="84" fill="url(#fiKSky)"/>
        <g class="fi-sun"><circle cx="126" cy="74" r="9" fill="var(--fi-sun)" ${o(1.8)}/><path d="M122 73q1.5 -2 3 0M128 73q1.5 -2 3 0" fill="none" ${o(1.3)}/></g>
        ${cloud(66, 64, 0.5, 'fi-cloud')}
        <path d="M60 118Q80 100 100 112Q118 98 144 110V138H60Z" fill="var(--fi-mtn-2)"/>
        <path d="M60 126Q100 116 144 124V138H60Z" fill="var(--fi-grass)"/>
        <circle cx="78" cy="114" r="7" fill="var(--fi-leaf-2)" ${o(1.4)}/><path d="M78 121v6" stroke="var(--fi-wood-2)" stroke-width="2"/>
        <path d="M112 124V116l7 -6l7 6V124Z" fill="var(--fi-wall)" ${o(1.3)}/><path d="M110 117l9 -8l9 8" fill="none" stroke="var(--fi-roof)" stroke-width="2.4" stroke-linecap="round"/>
        <g class="fi-storm"><rect x="60" y="54" width="84" height="84" fill="url(#fiKStorm)"/>${stormCloud(54, 52, 0.75)}${stormCloud(96, 60, 0.65)}
          <path class="fi-bolt" d="M110 80l-6 12h6l-4 10" fill="none" stroke="var(--fi-spark)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g class="fi-weather"><path d="${rain}" stroke="var(--fi-rain)" stroke-width="1.6" stroke-linecap="round"/></g>
      </g>
      ${floor()}
      <path d="M20 290H380L400 309V318L0 318V309Z" fill="var(--fi-ink)" opacity=".06"/>
      <ellipse cx="190" cy="320" rx="46" ry="9" fill="${K('mat')}" ${o(1.8)}/><ellipse cx="190" cy="320" rx="36" ry="5.5" fill="none" stroke="var(--fi-hi)" stroke-width="1.6" stroke-dasharray="2 4" opacity=".8"/>
      ${heart(190, 321, 0.7, 'var(--fi-flower-1)')}
      <path d="M0 0H400L380 22H20Z" fill="${K('ceil')}"/><path d="M20 22H380" ${o(2)}/>
      <path d="M0 0L20 22V290L0 309Z" fill="${K('side')}"/><path d="M400 0L380 22V290L400 309Z" fill="${K('side')}"/>
      <path d="M20 22V290M380 22V290M0 309L20 290M400 309L380 290" fill="none" ${o(2)}/>
      <path d="${wallHole}" fill-rule="evenodd" fill="${K('wall')}"/><path d="${wallHole}" fill-rule="evenodd" fill="url(#fiKDots)"/>
      <path d="M20 22H380V30H20Z" fill="var(--fi-shade)"/>
      <path d="M20 30${Array.from({ length: 30 }, () => 'a6 4 0 0 0 12 0').join('')}" fill="var(--fi-lace)" ${o(1.2)}/>
      ${bunting(232, 310, 34)}
      <path d="M339 22V38M339 84V96" stroke="${INK}" stroke-width="6"/><path d="M339 22V38M339 84V96" stroke="var(--fi-metal)" stroke-width="3"/>
      <path d="M56 50H148V142H56Z M62 56V136H142V56Z" fill-rule="evenodd" fill="${K('frame')}" ${o(2.2)}/>
      <path d="M142 56V136H62" fill="none" stroke="var(--fi-ink)" stroke-width="3" opacity=".12"/>
      <rect x="48" y="138" width="108" height="9" rx="4" fill="${K('frame')}" ${o(2)}/>${hl('M52 140H120', 1.6, 0.6)}
      <path d="M66 138v-8h12v8" fill="var(--fi-brick)" ${o(1.5)}/><path d="M72 130q-6 -8 -2 -12q4 4 2 12M72 130q4 -10 9 -10q-1 6 -9 10" fill="var(--fi-leaf)" ${o(1.1)}/>
      <g class="fi-back"></g>
      <rect x="20" y="154" width="284" height="38" fill="url(#fiKTile)"/><path d="M20 154H304" stroke="${K('tile-2')}" stroke-width="2"/>
      <circle cx="163" cy="104" r="10" fill="var(--fi-lace)" ${o(2)}/><path d="M156 96l-3 -5M170 96l3 -5" ${o(2)}/>
      <path d="M163 98v6l4 2" fill="none" ${o(1.6)}/><circle cx="163" cy="104" r="1.3" fill="var(--fi-ink)"/>
      <ellipse cx="157" cy="108" rx="2" ry="1.2" fill="var(--fi-flower-1)" opacity=".6"/><ellipse cx="169" cy="108" rx="2" ry="1.2" fill="var(--fi-flower-1)" opacity=".6"/>
      <rect x="30" y="196" width="88" height="94" rx="6" fill="${K('oven')}" ${o(2.4)}/>
      <path d="M106 198Q116 198 116 208V284Q116 288 110 288H106Z" fill="${K('oven-2')}"/>
      <rect x="26" y="186" width="96" height="12" rx="4" fill="var(--fi-metal)" ${o(2.2)}/>${hl('M30 189H80', 1.6, 0.7)}
      <ellipse cx="56" cy="186" rx="14" ry="2.6" fill="var(--fi-metal-2)" ${o(1.4)}/><ellipse cx="96" cy="186" rx="12" ry="2.4" fill="var(--fi-metal-2)" ${o(1.4)}/>
      ${[46, 66, 86].map((x) => `<circle cx="${x}" cy="206" r="4.5" fill="var(--fi-lace)" ${o(1.6)}/><path d="M${x} 203v3" ${o(1.4)}/>`).join('')}
      <rect x="36" y="216" width="76" height="66" rx="7" fill="${K('oven')}" ${o(2)}/>${stick(48, 222, 100, 222, 3, 'var(--fi-metal)')}
      <rect x="34" y="288" width="10" height="4" rx="2" fill="var(--fi-metal-2)"/><rect x="104" y="288" width="10" height="4" rx="2" fill="var(--fi-metal-2)"/>
      <g><path d="M84 184Q82 168 96 166Q110 168 108 184Z" fill="var(--fi-curtain)" ${o(2)}/><path d="M107 176l8 -6l2 3l-8 6" fill="var(--fi-curtain)" ${o(1.6)}/>
        <path d="M88 168q8 -5 16 0" fill="none" ${o(1.6)}/><circle cx="96" cy="163" r="2.6" fill="var(--fi-flower-2)" ${o(1.2)}/>
        <path d="M100 176h2M90 174" stroke="var(--fi-hi)"/>${heart(96, 178, 0.6, 'var(--fi-hi)')}${hl('M87 180q0 -8 5 -11', 1.4, 0.7)}</g>
      <rect x="118" y="202" width="184" height="88" fill="${K('cab')}" ${o(2.4)}/>
      <rect x="118" y="284" width="184" height="6" fill="var(--fi-ink)" opacity=".12"/>
      <rect x="122" y="208" width="32" height="32" rx="4" fill="${K('cab')}" ${o(1.8)}/><rect x="122" y="244" width="32" height="38" rx="4" fill="${K('cab')}" ${o(1.8)}/>
      ${heart(138, 226, 0.6, 'var(--fi-flower-1)', o(1))}${heart(138, 265, 0.6, 'var(--fi-flower-1)', o(1))}
      <rect x="158" y="206" width="82" height="78" fill="${K('inside')}" ${o(1.8)}/>
      <path d="M180 206V222Q180 232 170 232H158" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M180 206V222Q180 232 170 232H158" fill="none" stroke="var(--fi-metal-2)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M200 206V262Q200 268 206 268H238" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M200 206V262Q200 268 206 268H238" fill="none" stroke="var(--fi-metal)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M158 206L146 210V288L158 284Z" fill="${K('cab-2')}" ${o(1.8)}/><path d="M240 206L252 210V288L240 284Z" fill="${K('cab-2')}" ${o(1.8)}/>
      <rect x="254" y="208" width="44" height="74" rx="4" fill="${K('cab')}" ${o(1.8)}/>${heart(288, 248, 0.6, 'var(--fi-flower-1)', o(1))}
      <path d="M262 216h28" stroke="var(--fi-hi)" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>
      <rect x="116" y="190" width="188" height="13" rx="4" fill="${K('top')}" ${o(2.2)}/><path d="M118 199H302" stroke="${K('top-2')}" stroke-width="3"/>${hl('M122 193H160M244 193H296', 1.6, 0.8)}
      <rect x="162" y="190" width="76" height="6" rx="3" fill="var(--fi-metal-2)" ${o(1.6)}/>
      <path d="M241 190v-9h12v9" fill="var(--fi-water)" ${o(1.5)}/><path d="M247 181q-6 -8 -1 -12q3 4 1 12M247 181q5 -9 10 -8q-2 6 -10 8" fill="var(--fi-leaf)" ${o(1.1)}/><circle cx="251" cy="172" r="2.4" fill="var(--fi-flower-1)" ${o(1)}/>
      <path d="M26 291H122M304 291H378" stroke="var(--fi-shade)" stroke-width="4"/>
      <g class="fi-layers"></g>
      <rect class="fi-gloom" width="400" height="400" fill="${K('gloom')}"/>
      ${hari(22, 322)}
      <g class="fi-front"></g>`;
  }

  /* ---------- attrezzi nuovi ---------- */
  addTool('plug', `<path d="M20 30Q20 36 12 36Q6 36 6 30" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M20 30Q20 36 12 36Q6 36 6 30" fill="none" stroke="var(--fi-wire)" stroke-width="2.4" stroke-linecap="round"/>` +
    `<rect x="14" y="4" width="4" height="11" rx="1.5" fill="var(--fi-metal)" ${o(1.6)}/><rect x="22" y="4" width="4" height="11" rx="1.5" fill="var(--fi-metal)" ${o(1.6)}/>` +
    `<rect x="10" y="13" width="20" height="18" rx="6" fill="${K('fridge')}" ${o(2)}/><path d="M26 15Q29 16 29 20V27Q29 30 26 30Z" fill="${K('fridge-2')}"/>` +
    `<path d="M17 21h.01M23 21h.01" ${o(2.6)}/><path d="M18 25q2 1.6 4 0" fill="none" ${o(1.3)}/>`, 'Plug');
  addTool('broom', `${stick(33, 4, 21, 22, 3.5, 'var(--fi-wood)')}<path d="M16 19L25 25L18 37L4 30Z" fill="var(--fi-autumn-3)" ${o(2)}/>` +
    `<path d="M9 30l-2 4M13 32l-2 4M17 34l-1 3" ${o(1.5)}/><path d="M15 20L26 26" stroke="var(--fi-flower-1)" stroke-width="4" stroke-linecap="round"/><path d="M15 20L26 26" ${o(1.4)}/>`, 'Broom');
  addTool('jar', `<rect x="10" y="12" width="20" height="24" rx="6" fill="var(--fi-glass)" ${o(2)}/>` +
    `<rect x="12" y="21" width="16" height="13" rx="4" fill="var(--fi-curtain)"/><circle cx="16" cy="27" r="2" fill="var(--fi-flower-2)"/><circle cx="23" cy="25" r="2" fill="var(--fi-leaf)"/><circle cx="21" cy="31" r="2" fill="var(--fi-water)"/>` +
    `<rect x="10" y="12" width="20" height="24" rx="6" fill="none" ${o(2)}/><rect x="8" y="5" width="24" height="8" rx="3" fill="var(--fi-roof)" ${o(2)}/>${hl('M13 16v8', 1.8, 0.85)}`, 'Jar');
  addTool('mitt', `<path d="M12 31V16Q12 6 21 6Q29 6 29 15V20Q32 16 35 19Q37 22 33 27L29 31Z" fill="${K('cab')}" ${o(2)}/>` +
    `<circle cx="17" cy="15" r="1.6" fill="var(--fi-hi)"/><circle cx="23" cy="20" r="1.6" fill="var(--fi-hi)"/><circle cx="17" cy="25" r="1.6" fill="var(--fi-hi)"/><circle cx="24" cy="11" r="1.6" fill="var(--fi-hi)"/>` +
    `<rect x="10" y="30" width="21" height="7" rx="3" fill="var(--fi-flower-1)" ${o(1.8)}/>`, 'Oven mitt');
  addTool('sponge', `<g transform="rotate(-12 20 24)"><rect x="6" y="18" width="28" height="14" rx="4" fill="var(--fi-flower-2)" ${o(2)}/><rect x="6" y="14" width="28" height="7" rx="3" fill="var(--fi-leaf)" ${o(2)}/>` +
    `<circle cx="13" cy="26" r="1.4" fill="var(--fi-autumn)"/><circle cx="21" cy="28" r="1.4" fill="var(--fi-autumn)"/><circle cx="27" cy="25" r="1.4" fill="var(--fi-autumn)"/></g>` +
    `<circle cx="30" cy="8" r="4" fill="var(--fi-glass)" fill-opacity=".6" ${o(1.4)}/><circle cx="22" cy="6" r="2.4" fill="var(--fi-glass)" fill-opacity=".6" ${o(1.2)}/>`, 'Sponge');

  HH.fixitScenes.kitchen = {
    id: 'kitchen', name: ['fis_kitchen', 'Sweet kitchen'],
    probs: {
      breaker: ['fip_kitchen_breaker', 'Fuse box'], socket: ['fip_kitchen_socket', 'Loose socket'], lamp: ['fip_kitchen_lamp', 'Dark ceiling lamp'],
      valve: ['fip_kitchen_valve', 'Open water valve'], faucet: ['fip_kitchen_faucet', 'Spraying faucet'], flood: ['fip_kitchen_flood', 'Flooded floor'],
      fridge: ['fip_kitchen_fridge', 'Fridge is off'], shards: ['fip_kitchen_shards', 'Broken pieces'], shelf: ['fip_kitchen_shelf', 'Fallen shelf'],
      jars: ['fip_kitchen_jars', 'Missing jars'], window: ['fip_kitchen_window', 'Broken window'], curtain: ['fip_kitchen_curtain', 'Torn curtain'],
      cake: ['fip_kitchen_cake', 'Smoking cake'], dishes: ['fip_kitchen_dishes', 'Dirty dishes'],
    },
    spots: SPOT, layers: LAYERS, draw: DRAW, base,
    flags(stOf) {
      const brk = stOf('breaker'), sock = stOf('socket'), lamp = stOf('lamp');
      // dopo i lavori elettrici si riattacca la corrente
      const power = brk !== 'fixed' || (sock !== 'broken' && lamp !== 'broken');
      return {
        power, live: brk !== 'fixed', lit: power && lamp !== 'broken', sockOk: sock !== 'broken',
        waterOff: stOf('valve') !== 'broken', faucetOk: stOf('faucet') !== 'broken',
        shelfUp: stOf('shelf') !== 'broken', winOk: stOf('window') !== 'broken',
      };
    },
    front(S, stOf, solved) {
      let fr = '';
      if (S.lit) fr += '<path d="M190 72L120 318H262L210 72Z" fill="var(--fi-glow)" opacity=".32" class="fi-beam"/>';
      fr += puffs([[116, 162, 3.5, 0], [120, 150, 4.5, 0.8], [116, 138, 3.5, 1.6]], 'var(--fi-smoke)');
      if (stOf('dishes') === 'fixed') {
        fr += [[128, 150, 4, 0], [150, 142, 3, 1.2], [164, 152, 2.6, 2.1]].map(([x, y, r, d]) =>
          `<g class="fi-kitchen-bub" style="animation-delay:${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="var(--fi-glass)" fill-opacity=".45" stroke="var(--fi-hi)" stroke-width="1.2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="var(--fi-hi)"/></g>`).join('');
      }
      if (solved) fr += `<g class="fi-kitchen-hearts">${heart(250, 150, 1, 'var(--fi-flower-1)')}${heart(150, 120, 0.8, 'var(--fi-curtain)')}${heart(330, 230, 0.9, 'var(--fi-flower-1)')}</g>`;
      return fr;
    },
    back: (solved) => (solved ? `<g class="fi-rainbow"><path d="M142 60L62 136L170 290H380Z" fill="${K('sun')}" opacity=".55"/><path d="M142 92L104 136L210 290H300Z" fill="${K('sun')}" opacity=".6"/>` +
      `${sparkle(196, 150, 6)}${sparkle(240, 200, 4)}${sparkle(170, 240, 5)}${heart(222, 132, 0.8, 'var(--fi-flower-1)')}</g>` : ''),
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
