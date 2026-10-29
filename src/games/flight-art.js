/* Hari Airlines — disegni SVG (solo token CSS --fl-*): passeggeri animaletti, capitano gufo, Hari in divisa,
 * oggetti del carrello, ingredienti, rifiuti e sacchi, bagagli, finestrini con le tratte, icone delle fasi, aereo.
 * Tutte funzioni pure che restituiscono stringhe SVG (cache per i disegni ripetuti). Esporta su HH.flightArt.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const o = (w = 1.6) => `stroke="var(--fl-ink)" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const cache = new Map();
  const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
  const svg = (vb, inner, cls = '') => `<svg viewBox="${vb}" class="${cls}" aria-hidden="true">${inner}</svg>`;

  /* ---------- passeggeri (viewBox 40×40) ---------- */
  // e = orecchie, x = dettagli del muso
  const SP = {
    cat: { e: 'tri', x: 'whisk' }, bunny: { e: 'long', x: 'tooth' }, bear: { e: 'round', x: 'muzzle' }, fox: { e: 'tri', x: 'fox' },
    panda: { e: 'dark', x: 'patch' }, frog: { e: 'frog', x: '' }, mouse: { e: 'big', x: 'whisk' }, pig: { e: 'tri', x: 'snout' },
    chick: { e: 'tuft', x: 'beak' }, koala: { e: 'fluffy', x: 'nose' }, dog: { e: 'floppy', x: 'muzzle' }, raccoon: { e: 'tri', x: 'mask' },
  };
  const fur = (sp) => `var(--fl-${sp})`, fur2 = (sp) => `var(--fl-${sp}-2)`;
  function ears(sp, e) {
    const f = fur(sp), f2 = fur2(sp);
    if (e === 'tri') return `<path d="M8.5 17L9.5 4.5L18 11Z" fill="${f}" ${o()}/><path d="M31.5 17L30.5 4.5L22 11Z" fill="${f}" ${o()}/><path d="M10.5 13.5L11 8L15 11Z" fill="var(--fl-ear-in)"/><path d="M29.5 13.5L29 8L25 11Z" fill="var(--fl-ear-in)"/>`;
    if (e === 'long') return `<ellipse cx="14" cy="8" rx="3.8" ry="8.5" transform="rotate(-10 14 8)" fill="${f}" ${o()}/><ellipse cx="26" cy="8" rx="3.8" ry="8.5" transform="rotate(10 26 8)" fill="${f}" ${o()}/><ellipse cx="14" cy="8.5" rx="1.6" ry="5.5" transform="rotate(-10 14 8)" fill="var(--fl-ear-in)"/><ellipse cx="26" cy="8.5" rx="1.6" ry="5.5" transform="rotate(10 26 8)" fill="var(--fl-ear-in)"/>`;
    if (e === 'round' || e === 'dark') { const c = e === 'dark' ? 'var(--fl-dark)' : f; return `<circle cx="9.5" cy="11.5" r="5" fill="${c}" ${o()}/><circle cx="30.5" cy="11.5" r="5" fill="${c}" ${o()}/>${e === 'round' ? `<circle cx="9.8" cy="11.8" r="2.3" fill="${f2}"/><circle cx="30.2" cy="11.8" r="2.3" fill="${f2}"/>` : ''}`; }
    if (e === 'big') return `<circle cx="8" cy="12" r="7" fill="${f}" ${o()}/><circle cx="32" cy="12" r="7" fill="${f}" ${o()}/><circle cx="8.4" cy="12.4" r="4" fill="var(--fl-ear-in)"/><circle cx="31.6" cy="12.4" r="4" fill="var(--fl-ear-in)"/>`;
    if (e === 'fluffy') return `<circle cx="7.5" cy="15" r="7" fill="${f}" ${o()}/><circle cx="32.5" cy="15" r="7" fill="${f}" ${o()}/><circle cx="8" cy="15.5" r="4" fill="${f2}"/><circle cx="32" cy="15.5" r="4" fill="${f2}"/>`;
    if (e === 'floppy') return `<ellipse cx="7.5" cy="20" rx="4.2" ry="8.5" transform="rotate(18 7.5 20)" fill="${f2}" ${o()}/><ellipse cx="32.5" cy="20" rx="4.2" ry="8.5" transform="rotate(-18 32.5 20)" fill="${f2}" ${o()}/>`;
    if (e === 'tuft') return `<path d="M17 10Q18 4 20 8Q22 3 23 10" fill="${f}" ${o()}/>`;
    if (e === 'frog') return `<circle cx="13" cy="12" r="6" fill="${f}" ${o()}/><circle cx="27" cy="12" r="6" fill="${f}" ${o()}/>`;
    return '';
  }
  function eyes(sp, mood) {
    const y = sp === 'frog' ? 12 : 21.5, xs = sp === 'frog' ? [13, 27] : [15, 25];
    if (mood === 'joy') return xs.map((x) => `<path d="M${x - 2.4} ${y + 0.8}q2.4-3 4.8 0" fill="none" stroke="var(--fl-eye)" stroke-width="1.6" stroke-linecap="round"/>`).join('');
    const brows = mood === 'wait' ? `<path d="M${xs[0] - 2.6} ${y - 4.6}l4 1.4M${xs[1] + 2.6} ${y - 4.6}l-4 1.4" fill="none" stroke="var(--fl-eye)" stroke-width="1.2" stroke-linecap="round"/>`
      : mood === 'sad' ? `<path d="M${xs[0] - 2.4} ${y - 3.2}l4-1.6M${xs[1] + 2.4} ${y - 3.2}l-4-1.6" fill="none" stroke="var(--fl-eye)" stroke-width="1.2" stroke-linecap="round"/>` : '';
    return brows + xs.map((x) => `<ellipse cx="${x}" cy="${y}" rx="2.3" ry="2.7" fill="var(--fl-eye)"/><circle cx="${x + 0.8}" cy="${y - 1}" r="0.95" fill="var(--fl-hi)"/>`).join('');
  }
  function mouth(mood, sp) {
    const y = sp === 'pig' ? 30.5 : 28;
    if (mood === 'joy') return `<path d="M16.6 ${y - 0.8}q3.4 4.4 6.8 0z" fill="var(--fl-mouth)" ${o(1.1)}/>`;
    if (mood === 'sad') return `<path d="M17.5 ${y + 1.2}q2.5-2.4 5 0" fill="none" stroke="var(--fl-eye)" stroke-width="1.3" stroke-linecap="round"/><path d="M11 25q-1.2 2 0 3q1.2-1 0-3z" fill="var(--fl-tear)"/>`;
    if (mood === 'wait') return `<ellipse cx="20" cy="${y + 0.4}" rx="1.4" ry="1.7" fill="var(--fl-mouth)" ${o(0.9)}/>`;
    return `<path d="M17.6 ${y - 0.4}q1.2 1.4 2.4 0q1.2 1.4 2.4 0" fill="none" stroke="var(--fl-eye)" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  function extra(sp, x) {
    if (x === 'patch') return '<ellipse cx="14.6" cy="22" rx="3.8" ry="4.6" transform="rotate(25 14.6 22)" fill="var(--fl-dark)"/><ellipse cx="25.4" cy="22" rx="3.8" ry="4.6" transform="rotate(-25 25.4 22)" fill="var(--fl-dark)"/>';
    if (x === 'mask') return '<path d="M8 21Q14 16 20 20Q26 16 32 21Q26 26 20 23Q14 26 8 21Z" fill="var(--fl-dark)"/>';
    if (x === 'fox') return `<path d="M8 24Q14 23 20 31Q26 23 32 24Q30 35 20 35Q10 35 8 24Z" fill="var(--fl-cream)"/>`;
    if (x === 'muzzle') return '<ellipse cx="20" cy="28" rx="5.6" ry="4.2" fill="var(--fl-cream)"/>';
    if (x === 'snout') return `<ellipse cx="20" cy="26.5" rx="4.4" ry="3.2" fill="${fur2(sp)}" ${o(1.1)}/><circle cx="18.5" cy="26.5" r=".9" fill="var(--fl-eye)"/><circle cx="21.5" cy="26.5" r=".9" fill="var(--fl-eye)"/>`;
    if (x === 'beak') return '<path d="M17.6 25.4L22.4 25.4L20 28.6Z" fill="var(--fl-beak)" stroke="var(--fl-ink)" stroke-width="1"/>';
    if (x === 'nose') return '<ellipse cx="20" cy="25.4" rx="2.8" ry="3.4" fill="var(--fl-dark)"/>';
    if (x === 'whisk') return '<path d="M6 25.5l5 .6M6.4 28.5l4.8-.9M34 25.5l-5 .6M33.6 28.5l-4.8-.9" stroke="var(--fl-ink)" stroke-width=".9" stroke-linecap="round" opacity=".7"/><path d="M19 25.2h2l-1 1.2z" fill="var(--fl-nose)"/>';
    if (x === 'tooth') return '<path d="M19 25.2h2l-1 1.2z" fill="var(--fl-nose)"/>';
    return '';
  }
  function head(sp, mood = 'ok') {
    return memo(`h${sp}${mood}`, () => {
      const d = SP[sp] || SP.cat;
      const noseDot = ['bear', 'dog', 'raccoon', 'fox', 'panda'].includes(sp) ? '<ellipse cx="20" cy="25.6" rx="1.8" ry="1.3" fill="var(--fl-nose)"/>' : '';
      return svg('0 0 40 40', `${ears(sp, d.e)}<circle cx="20" cy="23" r="13" fill="${fur(sp)}" ${o()}/>${extra(sp, d.x)}${eyes(sp, mood)}
        <ellipse cx="11" cy="27" rx="2.6" ry="1.6" fill="var(--fl-blush)"/><ellipse cx="29" cy="27" rx="2.6" ry="1.6" fill="var(--fl-blush)"/>${noseDot}${mouth(mood, sp)}`, `fl-head fl-${sp}`);
    });
  }

  /* ---------- capitano gufo (viewBox 48×48) ---------- */
  const captain = (mood = 'ok') => memo(`cap${mood}`, () => svg('0 0 48 48', `
    <path d="M9 18L7 7L17 13Z M39 18L41 7L31 13Z" fill="var(--fl-owl-2)" ${o()}/>
    <ellipse cx="24" cy="28" rx="16" ry="15" fill="var(--fl-owl)" ${o()}/>
    <path d="M14 36Q24 46 34 36Q30 42 24 42Q18 42 14 36Z" fill="var(--fl-owl-2)"/>
    <circle cx="17.5" cy="26" r="6.4" fill="var(--fl-cream)" ${o(1.2)}/><circle cx="30.5" cy="26" r="6.4" fill="var(--fl-cream)" ${o(1.2)}/>
    ${mood === 'joy' ? '<path d="M14.5 27q3-3.6 6 0M27.5 27q3-3.6 6 0" fill="none" stroke="var(--fl-eye)" stroke-width="1.8" stroke-linecap="round"/>'
      : '<circle cx="18" cy="26.4" r="3.2" fill="var(--fl-eye)"/><circle cx="30" cy="26.4" r="3.2" fill="var(--fl-eye)"/><circle cx="19.1" cy="25.2" r="1.1" fill="var(--fl-hi)"/><circle cx="31.1" cy="25.2" r="1.1" fill="var(--fl-hi)"/>'}
    <path d="M21.6 30.5L26.4 30.5L24 34.6Z" fill="var(--fl-beak)" ${o(1)}/>
    <ellipse cx="11.8" cy="33" rx="2.6" ry="1.5" fill="var(--fl-blush)"/><ellipse cx="36.2" cy="33" rx="2.6" ry="1.5" fill="var(--fl-blush)"/>
    <path d="M9 15Q24 3 39 15L37 18Q24 12 11 18Z" fill="var(--fl-crew)" ${o()}/><path d="M10.5 17.6Q24 22 37.5 17.6L39 20Q24 25 9 20Z" fill="var(--fl-crew-2)" ${o(1.2)}/>
    <path d="M20 11.5h8l-1.4 2.6h-5.2z" fill="var(--fl-gold)" ${o(0.9)}/>`, 'fl-captain'));

  /* ---------- Hari in divisa: cappellino e foulard sopra il riccio piccolo (viewBox 100×100) ---------- */
  const CREW = svg('0 0 100 100', `
    <g transform="rotate(-12 50 28)"><path d="M33 30Q34 16 50 15Q66 16 67 30Q50 35 33 30Z" fill="var(--fl-crew)" ${o(2.4)}/>
    <path d="M33 30Q50 35 67 30L67 33Q50 39 33 33Z" fill="var(--fl-crew-2)" ${o(2)}/><path d="M44 21h12l-2 3h-8z" fill="var(--fl-gold)"/></g>
    <path d="M30 86Q50 96 70 86L72 92Q50 102 28 92Z" fill="var(--fl-scarf)" ${o(2.2)}/>
    <path d="M60 90l10 9l3-9l-8-3z" fill="var(--fl-scarf-2)" ${o(2)}/><circle cx="61" cy="90" r="3.4" fill="var(--fl-scarf)" ${o(2)}/>`, 'fl-crew');
  const hari = () => `<span class="fl-hari">${HH.mascot ? HH.mascot.mini() : ''}${CREW}</span>`;

  /* ---------- carrello (viewBox 32×32) ---------- */
  const ITEM = {
    water: `<path d="M9 7h14l-2 20H11z" fill="var(--fl-glass)" ${o()}/><path d="M10.2 13h11.6l-1.3 13H11.5z" fill="var(--fl-water)"/><path d="M12 9l1 14" stroke="var(--fl-hi)" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
    juice: `<path d="M20 4l-3 9" stroke="var(--fl-straw)" stroke-width="2.4" stroke-linecap="round"/><path d="M9 9h14l-2 18H11z" fill="var(--fl-glass)" ${o()}/><path d="M9.8 13h12.4l-1.5 13.4H11.3z" fill="var(--fl-juice)"/><circle cx="22" cy="10" r="3.4" fill="var(--fl-juice-2)" ${o(1.1)}/>`,
    tea: `<path d="M12 4q-2 3 0 5M17 3q-2 3 0 6" fill="none" stroke="var(--fl-steam)" stroke-width="1.5" stroke-linecap="round"/><path d="M7 13h16v5a8 8 0 0 1-16 0z" fill="var(--fl-cup)" ${o()}/><path d="M23 15h2.4a3 3 0 0 1 0 6H22" fill="none" ${o()}/><ellipse cx="15" cy="27.5" rx="11" ry="2.4" fill="var(--fl-cup)" ${o(1.2)}/><path d="M8.6 14.6h12.8" stroke="var(--fl-tea)" stroke-width="2"/>`,
    cookie: `<circle cx="16" cy="16" r="11" fill="var(--fl-cookie)" ${o()}/><circle cx="12" cy="12" r="1.8" fill="var(--fl-choc)"/><circle cx="19" cy="14" r="1.6" fill="var(--fl-choc)"/><circle cx="14" cy="20" r="1.7" fill="var(--fl-choc)"/><circle cx="20.5" cy="20.5" r="1.3" fill="var(--fl-choc)"/>`,
    meal: `<rect x="3" y="21" width="26" height="6" rx="3" fill="var(--fl-tray)" ${o()}/><path d="M5 21a11 10 0 0 1 22 0z" fill="var(--fl-dome)" ${o()}/><circle cx="16" cy="9.6" r="1.9" fill="var(--fl-dome)" ${o(1.1)}/><path d="M9 17q2-4 6-5" fill="none" stroke="var(--fl-hi)" stroke-width="1.6" stroke-linecap="round"/>`,
    blanket: `<path d="M4 9h24v15H4z" fill="var(--fl-blanket)" ${o()}/><path d="M4 14h24M4 19h24M11 9v15M21 9v15" stroke="var(--fl-blanket-2)" stroke-width="1.6"/><path d="M4 24q12 4 24 0" fill="none" ${o()}/>`,
    pillow: `<path d="M5 9q11-4 22 0q3 7 0 14q-11 4-22 0q-3-7 0-14z" fill="var(--fl-pillow)" ${o()}/><path d="M10 13q6-1.6 12 0" fill="none" stroke="var(--fl-hi)" stroke-width="1.6" stroke-linecap="round"/>`,
  };
  const item = (k) => memo(`i${k}`, () => svg('0 0 32 32', ITEM[k] || '', `fl-item fl-i-${k}`));

  /* ---------- ingredienti del pasto del capitano (viewBox 32×32) ---------- */
  const INGS = {
    bread: `<path d="M6 13q0-7 10-7t10 7v13H6z" fill="var(--fl-bread)" ${o()}/><path d="M9 14q0-5 7-5t7 5v9H9z" fill="var(--fl-bread-2)"/>`,
    egg: `<path d="M6 17q-2-9 8-10q4-4 9 1q6 3 3 10q-2 7-10 6q-8 1-10-7z" fill="var(--fl-white)" ${o()}/><circle cx="16" cy="16" r="5" fill="var(--fl-yolk)" ${o(1.2)}/><circle cx="14.5" cy="14.5" r="1.3" fill="var(--fl-hi)"/>`,
    salad: `<path d="M16 27C6 25 3 14 9 7q4 4 7 2q3 2 7-2c6 7 3 18-7 20z" fill="var(--fl-leaf)" ${o()}/><path d="M16 27V11M16 17l-4-3M16 21l4-3" stroke="var(--fl-leaf-2)" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    tomato: `<circle cx="16" cy="17" r="10" fill="var(--fl-tomato)" ${o()}/><circle cx="16" cy="17" r="6" fill="var(--fl-tomato-2)"/><circle cx="13.5" cy="15.5" r="1.2" fill="var(--fl-seed)"/><circle cx="18.5" cy="15.5" r="1.2" fill="var(--fl-seed)"/><circle cx="16" cy="20" r="1.2" fill="var(--fl-seed)"/>`,
    cheese: `<path d="M4 22L20 8L28 14V24H4z" fill="var(--fl-cheese)" ${o()}/><path d="M4 22H28" stroke="var(--fl-ink)" stroke-width="1.2"/><circle cx="12" cy="18" r="1.8" fill="var(--fl-cheese-2)"/><circle cx="21" cy="19" r="2.2" fill="var(--fl-cheese-2)"/><circle cx="20" cy="13" r="1.3" fill="var(--fl-cheese-2)"/>`,
    rice: `<path d="M16 5L28 25Q16 29 4 25Z" fill="var(--fl-white)" ${o()}/><path d="M10 19h12v8.5q-6 1.2-12 0z" fill="var(--fl-nori)"/>`,
    fish: `<path d="M5 16q7-9 16-3l6-5v16l-6-5q-9 6-16-3z" fill="var(--fl-fish)" ${o()}/><circle cx="10" cy="15" r="1.4" fill="var(--fl-eye)"/><path d="M14 13q2 3 0 6" fill="none" stroke="var(--fl-fish-2)" stroke-width="1.4"/>`,
    carrot: `<path d="M8 25L21 9q4 1 4 4z" fill="var(--fl-carrot)" ${o()}/><path d="M21 9q1-5 5-5M23 10q4-2 6 1M22 9q-1-4 1-6" fill="none" stroke="var(--fl-leaf-2)" stroke-width="2" stroke-linecap="round"/><path d="M13 19l3 1M16 15l3 1" stroke="var(--fl-carrot-2)" stroke-width="1.2" stroke-linecap="round"/>`,
    berry: `<path d="M16 28C7 22 6 12 10 10q6-2 12 0c4 2 3 12-6 18z" fill="var(--fl-berry)" ${o()}/><path d="M10 10q3-4 6-1q3-3 6 1q-3 2-6 0q-3 2-6 0z" fill="var(--fl-leaf)" ${o(1)}/><circle cx="13" cy="15" r=".9" fill="var(--fl-seed-2)"/><circle cx="19" cy="15" r=".9" fill="var(--fl-seed-2)"/><circle cx="16" cy="20" r=".9" fill="var(--fl-seed-2)"/>`,
  };
  const ing = (k) => memo(`g${k}`, () => svg('0 0 32 32', INGS[k] || '', `fl-ing fl-g-${k}`));

  /* ---------- rifiuti e sacchi (viewBox 32×32) ---------- */
  const TR = {
    cup: `<path d="M9 9h14l-2 17H11z" fill="var(--fl-plastic-c)" ${o()}/><path d="M9 13l5 3l4-3l5 3" fill="none" ${o(1.1)}/><path d="M8 9h16" ${o(2)}/>`,
    bottle: `<path d="M13 4h6v4q4 2 4 7v12a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V15q0-5 4-7z" fill="var(--fl-plastic-c)" ${o()}/><path d="M9.5 17h13v5h-13z" fill="var(--fl-plastic)"/>`,
    napkin: `<path d="M6 14l6-7l6 4l7-3l1 10l-5 7l-8-2l-6 1z" fill="var(--fl-white)" ${o()}/><path d="M12 7l1 9l-6 0M18 11l-2 7l5 6" fill="none" ${o(1)}/>`,
    paper: `<path d="M5 8h20l2 3v14H7l-2-2z" fill="var(--fl-paper-c)" ${o()}/><path d="M9 12h7M9 16h14M9 20h14M18 12h5" stroke="var(--fl-ink)" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>`,
    peel: `<path d="M16 9q-2 8-10 12q5 2 9-3q-1 6 3 9q1-6-2-10q5 3 10 1q-7-2-8-9z" fill="var(--fl-banana)" ${o()}/><path d="M15 6l1 4" ${o(2)}/>`,
    core: `<path d="M11 6q5 3 10 0q-2 5 0 8q-3 4 0 9q-5-3-10 0q2-5 0-9q2-3 0-8z" fill="var(--fl-apple-in)" ${o()}/><path d="M11 6q5-1 10 0M11 23q5 2 10 0" fill="none" stroke="var(--fl-apple)" stroke-width="3" stroke-linecap="round"/><path d="M16 4q0-2 2-3" ${o(1.4)}/>`,
  };
  const trash = (k) => memo(`t${k}`, () => svg('0 0 32 32', TR[k] || '', `fl-trash fl-t-${k}`));
  const SYM = { paper: TR.paper, plastic: TR.bottle, food: TR.core, all: TR.cup };
  const sack = (k) => memo(`s${k}`, () => svg('0 0 40 40', `<path d="M8 13q12-6 24 0l3 21q-15 5-30 0z" fill="var(--fl-sack-${k})" ${o()}/><path d="M12 12q-1-5 4-6M28 12q1-5-4-6" fill="none" ${o()}/>
    <g transform="translate(11 16) scale(.56)">${SYM[k] || ''}</g>`, `fl-sack fl-s-${k}`));

  /* ---------- bagagli: larghezza = spazi occupati (viewBox size*24 × 22) ---------- */
  function bag(size, look = 0) {
    return memo(`b${size}${look}`, () => {
      const c = `var(--fl-bag-${look % 3})`, c2 = `var(--fl-bag-${look % 3}-2)`, W = size * 24;
      if (size === 1) return svg(`0 0 ${W} 22`, `<path d="M8 4h8a5 5 0 0 1 5 5v10H3V9a5 5 0 0 1 5-5z" fill="${c}" ${o(1.4)}/><path d="M4 11h16v4H4z" fill="${c2}"/><path d="M9 4q3-3 6 0" fill="none" ${o(1.4)}/><circle cx="12" cy="13" r="1.2" fill="var(--fl-gold)"/>`, 'fl-bag');
      if (size === 2) return svg(`0 0 ${W} 22`, `<rect x="3" y="7" width="42" height="13" rx="6.5" fill="${c}" ${o(1.4)}/><path d="M16 7q8-7 16 0" fill="none" ${o(1.6)}/><path d="M3 13h42" stroke="${c2}" stroke-width="2.4"/><circle cx="24" cy="13" r="1.6" fill="var(--fl-gold)"/>`, 'fl-bag');
      return svg(`0 0 ${W} 22`, `<rect x="3" y="4" width="66" height="16" rx="4" fill="${c}" ${o(1.4)}/><path d="M18 4v16M54 4v16" stroke="${c2}" stroke-width="3"/><path d="M30 4V1h12v3" fill="none" ${o(1.4)}/><circle cx="10" cy="12" r="2" fill="var(--fl-gold)"/><path d="M60 9h6" stroke="var(--fl-hi)" stroke-width="1.6" stroke-linecap="round"/>`, 'fl-bag');
    });
  }

  /* ---------- finestrino con la tratta (viewBox 20×26) ---------- */
  const STARS = '<g class="fl-stars"><circle cx="5" cy="5" r=".8"/><circle cx="14" cy="8" r=".6"/><circle cx="9" cy="11" r=".5"/><circle cx="15" cy="3.5" r=".5"/></g>';
  const VIEW = {
    sea: '<path d="M0 18q3-2 5 0t5 0t5 0t5 0V26H0z" fill="var(--fl-sea)"/><path d="M2 21q2-1 4 0M11 22q2-1 4 0" fill="none" stroke="var(--fl-hi)" stroke-width=".8" opacity=".7"/>',
    mountain: '<path d="M0 26L6 14L10 19L14 12L20 22V26z" fill="var(--fl-mount)"/><path d="M4.3 17.4L6 14L7.6 16.6zM12.6 14.6L14 12L15.6 15z" fill="var(--fl-snow)"/>',
    city: '<path d="M0 26V18h3v-3h3v6h2v-8h4v5h2v-2h3v4h3v6z" fill="var(--fl-city)"/><path d="M9 15h1v1H9zM9 18h1v1H9zM4 19h1v1H4z" fill="var(--fl-lamp)"/>',
    night: '<circle cx="14" cy="8" r="3.4" fill="var(--fl-moon)"/><circle cx="15.4" cy="7.2" r="2.8" fill="var(--fl-sky-n)"/><path d="M0 22q5-3 10 0t10 0V26H0z" fill="var(--fl-cloud-n)"/>',
  };
  const win = (route) => memo(`w${route}`, () => svg('0 0 20 26', `<rect width="20" height="26" class="fl-sky ${route}"/>${STARS}
    <ellipse cx="6" cy="9" rx="4" ry="1.6" fill="var(--fl-cloud)" class="fl-wcloud"/>${VIEW[route] || ''}`, `fl-view ${route}`));

  /* ---------- icone delle fasi (viewBox 24×24) ---------- */
  const PI = {
    board: `<rect x="6" y="3" width="12" height="18" rx="5" fill="var(--fl-door)" ${o()}/><rect x="9" y="6" width="6" height="5" rx="2.5" fill="var(--fl-sky-d)" ${o(1)}/><circle cx="15" cy="14" r="1" fill="var(--fl-ink)"/>`,
    bags: `<rect x="4" y="8" width="16" height="12" rx="3" fill="var(--fl-bag-0)" ${o()}/><path d="M9 8V5h6v3" fill="none" ${o()}/><path d="M9 8v12M15 8v12" stroke="var(--fl-bag-0-2)" stroke-width="1.6"/>`,
    belts: `<rect x="2" y="9" width="20" height="6" rx="2" fill="var(--fl-belt)" ${o()}/><rect x="8.5" y="7" width="7" height="10" rx="2" fill="var(--fl-buckle)" ${o()}/><path d="M10.5 12h3" ${o(1.4)}/>`,
    galley: `<path d="M5 9h14v7a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" fill="var(--fl-pot)" ${o()}/><path d="M3 9h18" ${o(2)}/><path d="M9 6q-1-2 0-3M13 6q-1-2 0-3" fill="none" stroke="var(--fl-steam)" stroke-width="1.4" stroke-linecap="round"/>`,
    serve: `<rect x="5" y="6" width="14" height="12" rx="2" fill="var(--fl-cart)" ${o()}/><path d="M5 10h14M5 14h14" stroke="var(--fl-cart-2)" stroke-width="1.4"/><circle cx="8" cy="20" r="1.8" fill="var(--fl-ink)"/><circle cx="16" cy="20" r="1.8" fill="var(--fl-ink)"/>`,
    trash: `<path d="M6 8q6-3 12 0l2 13q-8 3-16 0z" fill="var(--fl-sack-all)" ${o()}/><path d="M9 7q0-3 3-3q3 0 3 3" fill="none" ${o()}/>`,
    land: `<path d="M3 13l7-1l5-7h2l-2 7l5 0l2-2h1.6l-1 4l1 4H21l-2-2l-5 0l2 7h-2l-5-7l-7-1z" fill="var(--fl-plane)" ${o(1.2)} transform="rotate(-90 12 13) translate(0 -1)"/>`,
  };
  const phaseIcon = (k) => memo(`p${k}`, () => svg('0 0 24 24', PI[k] || '', `fl-pi fl-pi-${k}`));

  /* ---------- cintura (viewBox 40×14) ---------- */
  const beltOn = svg('0 0 40 14', `<path d="M1 7h38" stroke="var(--fl-belt)" stroke-width="5" stroke-linecap="round"/><rect x="14" y="2" width="12" height="10" rx="2.6" fill="var(--fl-buckle)" ${o(1.2)}/><path d="M17.5 7h5" ${o(1.4)}/>`, 'fl-belt on');
  const beltOff = svg('0 0 40 14', `<path d="M1 5q6 2 9 8" fill="none" stroke="var(--fl-belt)" stroke-width="4.6" stroke-linecap="round"/><path d="M39 5q-6 2-9 8" fill="none" stroke="var(--fl-belt)" stroke-width="4.6" stroke-linecap="round"/><rect x="25" y="8" width="8" height="6" rx="1.6" fill="var(--fl-buckle)" ${o(1)}/>`, 'fl-belt off');
  const beltSign = svg('0 0 36 22', `<rect x="1" y="1" width="34" height="20" rx="6" fill="var(--fl-sign)" ${o(1.4)}/><circle cx="12" cy="7" r="2.6" fill="var(--fl-sign-ic)"/><path d="M8 19v-6q0-3 4-3t4 3v6" fill="var(--fl-sign-ic)"/><path d="M6 15h12" stroke="var(--fl-sign)" stroke-width="2"/><path d="M21 9h10M21 13h8" stroke="var(--fl-sign-ic)" stroke-width="2" stroke-linecap="round"/>`, 'fl-signsvg');

  /* ---------- aereo (illustrazione della card e dell'atterraggio, viewBox 120×90) ----------
   * Di lato, muso a sinistra: ali e piano di coda "a freccia" all'indietro (le punte stanno più verso la coda della
   * radice, il bordo d'attacco sale verso la coda), deriva inclinata verso la coda. */
  function plane(extra = '') {
    return `<path d="M14 58q8-12 22-13h52q16 0 22 10q-6 9-22 9H36q-14 0-22-6z" fill="var(--fl-plane)" ${o(2)}/>
      <path d="M86 45l14-22h7l-6 22z" fill="var(--fl-tail)" ${o(1.8)}/><path d="M90 58l12 9h6l-3-10z" fill="var(--fl-wing)" ${o(1.4)}/>
      <path d="M48 57l18 21h9l-4-21z" fill="var(--fl-wing)" ${o(1.8)}/>
      <path d="M52 45l11-12h6l1 12z" fill="var(--fl-wing)" ${o(1.6)}/>
      <path d="M18 54q4-5 10-6v6z" fill="var(--fl-sky-d)" ${o(1.4)}/>
      ${[40, 52, 64, 76].map((x) => `<circle cx="${x}" cy="52" r="3.6" fill="var(--fl-sky-d)" ${o(1.2)}/>`).join('')}
      <path d="M36 60h52" stroke="var(--fl-stripe)" stroke-width="3" stroke-linecap="round"/>
      <path d="M96 27a4 4 0 0 1 6 1l-3 6z" fill="var(--fl-scarf)"/>${extra}`;
  }
  const art = () => `<svg viewBox="0 0 120 90" class="fl-art" aria-hidden="true">
    <ellipse class="fl-a-cloud" cx="24" cy="24" rx="16" ry="6" fill="var(--fl-cloud)"/><ellipse class="fl-a-cloud b" cx="96" cy="74" rx="18" ry="6" fill="var(--fl-cloud)"/>
    <g class="fl-a-plane">${plane(`<g transform="translate(36.5 48.5) scale(.07)">${HH.mascot ? HH.mascot.mini().replace('<svg class="mini-hari" viewBox="0 0 100 100" aria-hidden="true">', '').replace('</svg>', '') : ''}</g>`)}</g>
    <circle cx="104" cy="16" r="2" fill="var(--fl-star)"/><circle cx="12" cy="76" r="1.6" fill="var(--fl-star)"/></svg>`;

  HH.flightArt = { head, captain, hari, CREW, item, ing, trash, sack, bag, win, phaseIcon, beltOn, beltOff, beltSign, plane, art, SPECIES: Object.keys(SP) };
})(typeof globalThis !== 'undefined' ? globalThis : window);
