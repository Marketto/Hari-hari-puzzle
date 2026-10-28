/* Hari Rally — interfaccia 3D (three.js r160, copia locale in src/vendor/three.min.js, scaricata solo aprendo il gioco).
 * Visuale pilota: cofano 3D della macchinina di Hari, cruscotto SVG col volante e le zampine (gira con lo sterzo).
 * Ambientazioni a rotazione (bosco, città, mare, neve) di giorno, al tramonto e di notte: strade sterrate o asfaltate
 * con marciapiedi e strisce, ponti, gallerie, curve paraboliche, dossi; ai bordi cespugli, staccionate, transenne
 * morbide, palazzi con negozi e finestre accese, lampioni, semafori decorativi, pubblico che tifa, spiaggia con
 * ombrelloni, palme, faro, porticciolo con le barche, gabbiani, scogliere, chalet, pupazzi di neve, case sugli alberi,
 * animaletti che saltellano. Cel shading: MeshToonMaterial con rampa a 3 toni e contorni "a guscio rovesciato".
 * Colori solo dai token --ry-* (getComputedStyle → THREE.Color); tema scuro = notte.
 * Collisioni coerenti con la grafica: macchinine costruite con P.CAR_L × P.CAR_W, bordi (cespugli, transenne,
 * ringhiere, pareti delle gallerie) con la faccia interna esattamente dove la logica ferma le auto (P.edgeAt), ostacoli
 * col raggio di collisione rk.r, la camera sta EYE_BACK dietro il centro dell'auto così il bordo del cofano coincide
 * col muso del rettangolo di collisione.
 * Prestazioni da telefono: pixel ratio ≤ 1,5 (cala da solo se gli fps scendono), nebbia, scenario a blocchi di 120 m
 * costruiti mentre ci si avvicina e nascosti da lontano, oggetti numerosi con InstancedMesh, il resto fuso in una
 * geometria per blocco (2 draw call), terreno a griglia che segue la camera.
 *
 * Controlli (accelerazione automatica):
 *   sensori (schermo intero, telefono girato): inclina il telefono come un volante, tieni premuto ovunque = freno
 *   tocco: tieni premuta la metà sinistra/destra per sterzare (più a lungo = più forte), pedale in basso al centro = freno
 *   tastiera: frecce/A-D sterzo, giù/S/spazio freno, su/W/Invio power-up, P/Esc pausa. Pulsante grande del power-up
 *   a destra (anche coi sensori). Pulsante in alto a destra: sensori ↔ tocco.
 * Pausa automatica a pagina nascosta, col tutorial e col telefono in verticale a schermo intero.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    ry_board: 'Rally: steer, brake and use power-ups', ry_turn: 'Turn your phone sideways', ry_tilt: 'Tilt to steer', ry_touch: 'Touch to steer',
    ry_brake: 'Brake', ry_top3: 'Finish in the top 3!', ry_nogl: 'This game needs 3D graphics (WebGL).',
    ry_item: 'Use power-up', ry_acorns: 'Acorns',
    ry_pu_carrot: 'Carrot turbo!', ry_pu_bubble: 'Bubble shield!', ry_pu_banana: 'Banana peel!', ry_pu_honey: 'Honey puddle!',
    ry_pu_cloud: 'Flower cloud!', ry_pu_magnet: 'Acorn magnet!', ry_pu_spring: 'Spring jump!',
    // già tradotte (Hari Parade, comuni)
    pa_ready: 'Ready?', pa_go: 'Go!', pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_pause: 'Pause', retry: 'Try again',
  };
  const L = (k) => label(k, EN[k]);

  /* ---------- disegni SVG (colori solo da token --ry-*) ---------- */
  const f1 = (n) => +n.toFixed(1);
  const o = (w = 2) => `stroke="var(--ry-ink)" stroke-width="${f1(w * 0.8)}" stroke-linejoin="round" stroke-linecap="round"`;
  const eye = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--ry-eye)"/><circle cx="${f1(cx + rx * 0.32)}" cy="${f1(cy - ry * 0.36)}" r="${f1(rx * 0.48)}" fill="var(--ry-hi)"/>`;
  const blush = (cx, cy, r) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(r)}" ry="${f1(r * 0.6)}" fill="var(--ry-blush)"/>`;
  const eyes = (cx, cy, sp, joy) => (joy
    ? [cx - sp, cx + sp].map((x) => `<path d="M${x - 5} ${cy + 1}Q${x} ${cy - 6} ${x + 5} ${cy + 1}" fill="none" stroke="var(--ry-eye)" stroke-width="3" stroke-linecap="round"/>`).join('')
    : eye(cx - sp, cy, 4.6, 5.8) + eye(cx + sp, cy, 4.6, 5.8)) + blush(cx - sp - 6, cy + 8, 4.6) + blush(cx + sp + 6, cy + 8, 4.6);
  function quills(cx, cy, r, len, a0, a1, n) {
    const pt = (a, rr) => `${f1(cx + rr * Math.cos(a * Math.PI / 180))} ${f1(cy + rr * Math.sin(a * Math.PI / 180))}`;
    const st = (a1 - a0) / n;
    let d = `M${cx} ${cy}L${pt(a0, r)}`;
    for (let k = 0; k < n; k++) d += `L${pt(a0 + st * (k + 0.5), r + len)}L${pt(a0 + st * (k + 1), r)}`;
    return `${d}Z`;
  }
  // teste dei piloti (viewBox 100)
  const FACE = {
    hari: (j) => `<path d="${quills(50, 56, 31, 12, -205, 25, 11)}" fill="var(--ry-quill-2)" ${o(2.2)}/>
      <circle cx="24" cy="44" r="8" fill="var(--ry-ear)" ${o(2)}/><circle cx="76" cy="44" r="8" fill="var(--ry-ear)" ${o(2)}/>
      <ellipse cx="50" cy="62" rx="30" ry="25" fill="var(--ry-face)" ${o(2.4)}/>${eyes(50, 60, 11, j)}<ellipse cx="50" cy="71" rx="3.4" ry="2.5" fill="var(--ry-nose)"/>`,
    bunny: (j) => `<ellipse cx="37" cy="18" rx="7" ry="18" transform="rotate(-10 37 18)" fill="var(--ry-bunny)" ${o(2)}/><ellipse cx="37" cy="20" rx="3.4" ry="11" transform="rotate(-10 37 20)" fill="var(--ry-bunny-in)"/>
      <ellipse cx="63" cy="18" rx="7" ry="18" transform="rotate(10 63 18)" fill="var(--ry-bunny)" ${o(2)}/><ellipse cx="63" cy="20" rx="3.4" ry="11" transform="rotate(10 63 20)" fill="var(--ry-bunny-in)"/>
      <ellipse cx="50" cy="60" rx="29" ry="26" fill="var(--ry-bunny)" ${o(2.4)}/>${eyes(50, 58, 11, j)}<path d="M47.6 66h4.8l-2.4 2.4z" fill="var(--ry-bunny-in)"/>`,
    fox: (j) => `<path d="M22 46L22 12L46 32Z" fill="var(--ry-fox)" ${o(2)}/><path d="M78 46L78 12L54 32Z" fill="var(--ry-fox)" ${o(2)}/>
      <path d="M26 38L26 20L38 31Z" fill="var(--ry-ink)" opacity=".7"/><path d="M74 38L74 20L62 31Z" fill="var(--ry-ink)" opacity=".7"/>
      <ellipse cx="50" cy="60" rx="30" ry="26" fill="var(--ry-fox)" ${o(2.4)}/><path d="M22 64C30 82 44 86 50 86S70 82 78 64C66 70 58 66 50 74C42 66 34 70 22 64Z" fill="var(--ry-fox-2)"/>
      ${eyes(50, 56, 12, j)}<ellipse cx="50" cy="72" rx="3.6" ry="2.6" fill="var(--ry-nose)"/>`,
    panda: (j) => `<circle cx="26" cy="36" r="10" fill="var(--ry-panda-2)" ${o(2)}/><circle cx="74" cy="36" r="10" fill="var(--ry-panda-2)" ${o(2)}/>
      <ellipse cx="50" cy="60" rx="30" ry="26" fill="var(--ry-panda)" ${o(2.4)}/>
      <ellipse cx="38" cy="58" rx="8" ry="10" transform="rotate(25 38 58)" fill="var(--ry-panda-2)"/><ellipse cx="62" cy="58" rx="8" ry="10" transform="rotate(-25 62 58)" fill="var(--ry-panda-2)"/>
      ${j ? eyes(50, 58, 12, true) : `<circle cx="39" cy="58" r="3.4" fill="var(--ry-hi)"/><circle cx="61" cy="58" r="3.4" fill="var(--ry-hi)"/>${blush(30, 70, 4.6)}${blush(70, 70, 4.6)}`}
      <ellipse cx="50" cy="70" rx="3.6" ry="2.6" fill="var(--ry-nose)"/>`,
  };
  const WHO = ['hari', 'bunny', 'fox', 'panda'];
  const CCOL = ['var(--ry-me)', 'var(--ry-p1)', 'var(--ry-p2)', 'var(--ry-p3)'];
  const face = (id, j) => `<svg viewBox="0 0 100 100" aria-hidden="true">${FACE[WHO[id]](j)}</svg>`;

  // power-up (viewBox 48): disegni buffi e innocui
  const PU_ART = {
    carrot: `<path d="M9 40C7 38 10 31 18 21l6-6 9 9-6 6C17 38 11 42 9 40Z" fill="var(--ry-carrot)" ${o(2)}/><path d="M15 31l4 3M20 25l4 3" stroke="var(--ry-ink)" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>
      <path d="M27 16c-2-5 0-10 4-11 0 4 0 7-1 10ZM32 20c4-3 9-3 12 0-4 2-7 3-10 2ZM30 17c2-5 7-7 11-7-1 5-4 7-8 8Z" fill="var(--ry-carrot-leaf)" ${o(1.6)}/>`,
    bubble: `<circle cx="24" cy="25" r="17" fill="var(--ry-bubble)" opacity=".9" ${o(2)}/><path d="M13 21a12 12 0 0 1 8-8" fill="none" stroke="var(--ry-hi)" stroke-width="3.2" stroke-linecap="round"/><circle cx="31" cy="32" r="2.6" fill="var(--ry-hi)"/>`,
    banana: `<path d="M9 13c1 15 12 25 29 23 3 0 3-3 0-4-14 1-20-8-23-19-1-3-6-4-6 0Z" fill="var(--ry-banana)" ${o(2)}/><path d="M9 13c3 5 2 10-3 14M14 14c3 5 7 7 11 7" fill="none" stroke="var(--ry-banana-2)" stroke-width="2.2" stroke-linecap="round"/><path d="M7 12l-1-5 5 2" fill="var(--ry-banana-2)" ${o(1.4)}/>`,
    honey: `<path d="M13 19h22l2 17c0 4-3 7-7 7H18c-4 0-7-3-7-7Z" fill="var(--ry-honey)" ${o(2)}/><rect x="14" y="11" width="20" height="8" rx="2.4" fill="var(--ry-acorn-cap)" ${o(1.8)}/>
      <path d="M15 24c2 4 4 4 5 0 1 5 4 5 5 0 1 4 3 4 5 0" fill="none" stroke="var(--ry-honey-2)" stroke-width="2.4" stroke-linecap="round"/><circle cx="20" cy="33" r="1.8" fill="var(--ry-eye)"/><circle cx="28" cy="33" r="1.8" fill="var(--ry-eye)"/><path d="M22 37q2 2 4 0" fill="none" stroke="var(--ry-eye)" stroke-width="1.6" stroke-linecap="round"/>`,
    cloud: `<path d="M12 35c-6 0-8-7-3-10-1-7 7-10 11-6 2-7 12-7 14 0 6-2 11 3 8 8 4 3 1 8-3 8Z" fill="var(--ry-petal-2)" ${o(2)}/>
      ${[[16, 28], [25, 23], [33, 29]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(Math.cos(a * Math.PI / 180) * 3)}" cy="${f1(Math.sin(a * Math.PI / 180) * 3)}" r="2.4" fill="var(--ry-petal)"/>`).join('')}<circle r="1.8" fill="var(--ry-gift-3)"/></g>`).join('')}`,
    magnet: `<path d="M11 9h9v15a4 4 0 0 0 8 0V9h9v15a13 13 0 0 1-26 0Z" fill="var(--ry-magnet)" ${o(2)}/><path d="M11 9h9v7h-9zM28 9h9v7h-9z" fill="var(--ry-magnet-2)" ${o(1.6)}/>
      <path d="M41 30l4 2M41 36l4-1M7 30l-4 2M7 36l-4-1" stroke="var(--ry-gold)" stroke-width="2.4" stroke-linecap="round"/>`,
    spring: `<path d="M15 35l18-4-18-4 18-4-18-4 18-4" fill="none" stroke="var(--ry-ink)" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 35l18-4-18-4 18-4-18-4 18-4" fill="none" stroke="var(--ry-spring)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="9" y="36" width="30" height="6" rx="2.4" fill="var(--ry-car)" ${o(1.8)}/><rect x="11" y="9" width="26" height="6" rx="2.4" fill="var(--ry-car)" ${o(1.8)}/>`,
    gift: `<rect x="9" y="20" width="30" height="21" rx="4" fill="var(--ry-gift-1)" ${o(2)}/><rect x="7" y="14" width="34" height="8" rx="3" fill="var(--ry-gift-2)" ${o(2)}/><path d="M24 14v27" stroke="var(--ry-ribbon)" stroke-width="5"/>
      <path d="M24 14c-4-7-12-6-10-1 1 2 6 2 10 1 4 1 9 1 10-1 2-5-6-6-10 1Z" fill="var(--ry-ribbon)" ${o(1.6)}/>`,
  };
  const PU_LIST = ['carrot', 'bubble', 'banana', 'honey', 'cloud', 'magnet', 'spring'];
  const puSvg = (k) => `<svg viewBox="0 0 48 48" aria-hidden="true">${PU_ART[k] || PU_ART.gift}</svg>`;
  const ACORN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11c0 6 3 10 6 11 3-1 6-5 6-11Z" fill="var(--ry-acorn)" ${o(1.4)}/><path d="M4 11c0-4 4-6.5 8-6.5s8 2.5 8 6.5Z" fill="var(--ry-acorn-cap)" ${o(1.4)}/><path d="M12 4.5V2" stroke="var(--ry-ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M9 14q.6 3 2.4 4.6" fill="none" stroke="var(--ry-hi)" stroke-width="1.4" stroke-linecap="round" opacity=".7"/></svg>`;

  // freccia della nota: curva che si chiude di più con le gravità basse (6 = quasi dritta, 1 = tornante)
  const TURN = [0, 172, 118, 88, 62, 42, 24];
  function arrow(dir, g) {
    const A = (TURN[g] * Math.PI) / 180, n = 14, len = g === 1 ? 30 : 28, st = len / n;
    let x = 30, y = 44, h = -Math.PI / 2;
    const pts = [[x, y]];
    y -= 9; pts.push([x, y]);
    for (let i = 0; i < n; i++) { h += (dir > 0 ? -1 : 1) * (A / n); x += Math.cos(h) * st; y += Math.sin(h) * st; pts.push([x, y]); }
    // centra il disegno
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const dx = 30 - (Math.min(...xs) + Math.max(...xs)) / 2, dy = 25 - (Math.min(...ys) + Math.max(...ys)) / 2;
    const P2 = pts.map(([a, b]) => [f1(a + dx), f1(b + dy)]);
    const d = 'M' + P2.map((p) => p.join(' ')).join('L');
    const [ex, ey] = P2[P2.length - 1], c = Math.cos(h), s2 = Math.sin(h);
    const head = `M${f1(ex + c * 8)} ${f1(ey + s2 * 8)}L${f1(ex - s2 * 7)} ${f1(ey + c * 7)}L${f1(ex + s2 * 7)} ${f1(ey - c * 7)}Z`;
    return `<path d="${d}" fill="none" stroke="var(--ry-note-line)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${head}" fill="var(--ry-note-line)" stroke="var(--ry-note-line)" stroke-width="4" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="var(--ry-arrow)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${head}" fill="var(--ry-arrow)"/>`;
  }
  const IC = {
    warn: `<path d="M12 3L22 20H2Z" fill="var(--ry-warn)" stroke="var(--ry-note-line)" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v5" stroke="var(--ry-note-line)" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1.4" fill="var(--ry-note-line)"/>`,
    crest: `<path d="M1 20C6 20 7 9 12 9S18 20 23 20Z" fill="var(--ry-dirt)" stroke="var(--ry-note-line)" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 6l4-3 4 3" fill="none" stroke="var(--ry-arrow)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    bridge: `<path d="M2 12h20M2 12v8M22 12v8M6 12c2-5 10-5 12 0" fill="none" stroke="var(--ry-note-line)" stroke-width="2" stroke-linecap="round"/><path d="M4 15h16" stroke="var(--ry-wood)" stroke-width="3"/><path d="M2 21q5-2 10 0t10 0" fill="none" stroke="var(--ry-water)" stroke-width="2"/>`,
    nocut: `<path d="M5 19c-1-6 3-10 7-10s8 3 7 10Z" fill="var(--ry-rock)" stroke="var(--ry-note-line)" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 4l16 16" stroke="var(--ry-warn-2)" stroke-width="2.6" stroke-linecap="round"/>`,
    into: `<path d="M4 18l6-6-6-6M12 18l6-6-6-6" fill="none" stroke="var(--ry-arrow)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    long: `<path d="M3 15q9-10 18 0" fill="none" stroke="var(--ry-note-line)" stroke-width="2.4" stroke-linecap="round"/><path d="M3 20q9-10 18 0" fill="none" stroke="var(--ry-arrow)" stroke-width="2.4" stroke-linecap="round"/>`,
    bank: `<path d="M2 20L22 12V20Z" fill="var(--ry-road)" stroke="var(--ry-note-line)" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 8q6-5 12 0" fill="none" stroke="var(--ry-arrow)" stroke-width="2.4" stroke-linecap="round"/><path d="M16 5l2.4 3-3.4 1" fill="none" stroke="var(--ry-arrow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
  const ic = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const BIG = {
    crest: `<path d="M4 40C16 40 18 16 30 16S44 40 56 40Z" fill="var(--ry-dirt)" stroke="var(--ry-note-line)" stroke-width="3" stroke-linejoin="round"/><path d="M20 12l10-7 10 7" fill="none" stroke="var(--ry-arrow)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    bridge: `<path d="M6 26h48M6 26v14M54 26v14M14 26c4-10 28-10 32 0" fill="none" stroke="var(--ry-note-line)" stroke-width="3.4" stroke-linecap="round"/><path d="M8 31h44" stroke="var(--ry-wood)" stroke-width="5"/><path d="M4 43q6-4 13 0t13 0 13 0 13 0" fill="none" stroke="var(--ry-water)" stroke-width="3.4" stroke-linecap="round"/>`,
    tunnel: `<path d="M4 42V24C4 10 16 4 30 4S56 10 56 24V42" fill="var(--ry-rock)" stroke="var(--ry-note-line)" stroke-width="3" stroke-linejoin="round"/><path d="M14 42V27c0-9 7-14 16-14s16 5 16 14v15Z" fill="var(--ry-note-line)"/><path d="M22 42l3-14h10l3 14Z" fill="var(--ry-road)"/><circle cx="30" cy="19" r="2.6" fill="var(--ry-bulb)"/>`,
  };
  const FLAG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 22V3" stroke="var(--ry-ui-line)" stroke-width="2.2" stroke-linecap="round"/><path d="M6 3h13l-3 4 3 4H6z" fill="var(--ry-check-1)" stroke="var(--ry-ui-line)" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 3v8M12.5 3v8" stroke="var(--ry-check-2)" stroke-width="2"/></svg>`;
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13c0 .8.9 1.3 1.6.8l10-6.5c.6-.4.6-1.2 0-1.6l-10-6.5C8.9 4.2 8 4.7 8 5.5z" fill="currentColor"/></svg>';
  const TILT = '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-18 12 12)"><rect x="3" y="7" width="18" height="10" rx="2.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/></g><path d="M3 4.5q3-2.5 6-1.5M21 19.5q-3 2.5-6 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const HAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V5a1.6 1.6 0 0 1 3.2 0v5.5M12.2 10V8.6a1.6 1.6 0 0 1 3.2 0V11M15.4 10.4a1.6 1.6 0 0 1 3.2 0V15c0 3.6-2.6 6-6 6h-1c-2.4 0-3.8-1-5-2.8L4.4 15a1.6 1.6 0 0 1 2.6-1.8L9 15.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PEDAL = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="5" width="22" height="28" rx="7" fill="currentColor" opacity=".25"/><rect x="9" y="5" width="22" height="28" rx="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 13h12M14 19h12M14 25h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const ZONE = (d) => `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="var(--ry-ui)" stroke="var(--ry-ui-line)" stroke-width="2.5"/><path d="${d > 0 ? 'M16 11l9 9-9 9' : 'M24 11l-9 9 9 9'}" fill="none" stroke="var(--ry-arrow)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const PHONE = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="30" y="12" width="40" height="76" rx="9" fill="var(--card-solid)" stroke="var(--ry-ink)" stroke-width="4"/><rect x="36" y="22" width="28" height="52" rx="3" fill="var(--ry-sky-1)"/><path d="M38 70l12-30 12 30Z" fill="var(--ry-dirt)"/><circle cx="50" cy="81" r="3" fill="var(--ry-ink)"/></svg>`;

  // paw di Hari sul volante (centro 0,0)
  const paw = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="15" ry="12" fill="var(--ry-paw)" ${o(2.4)}/>
    <ellipse cx="0" cy="3" rx="6" ry="4.6" fill="var(--ry-bean)"/><circle cx="-7" cy="-5" r="2.6" fill="var(--ry-bean)"/><circle cx="0" cy="-7.4" r="2.6" fill="var(--ry-bean)"/><circle cx="7" cy="-5" r="2.6" fill="var(--ry-bean)"/></g>`;
  // cruscotto 320 × 130: volante (gruppo che ruota) e contagiri con la lancetta
  const DASH = `<svg viewBox="0 0 320 130" aria-hidden="true">
    <path d="M0 130V96C40 80 90 74 160 74S280 80 320 96V130Z" fill="var(--ry-dash)" ${o(3)}/>
    <path d="M14 96C60 82 104 78 160 78S262 82 306 96" fill="none" stroke="var(--ry-dash-hi)" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <g transform="translate(46 108)"><circle r="20" fill="var(--ry-gauge)" ${o(2.4)}/><path d="M-14 6A15 15 0 1 1 14 6" fill="none" stroke="var(--ry-dash-2)" stroke-width="3" stroke-dasharray="2 4"/>
      <g class="ry-needle"><path d="M0 0L-12 -6" stroke="var(--ry-needle)" stroke-width="3.4" stroke-linecap="round"/></g><circle r="3.4" fill="var(--ry-ink)"/></g>
    <g transform="translate(274 106)"><circle r="17" fill="var(--ry-gauge)" ${o(2.4)}/><svg x="-14" y="-14" width="28" height="28" viewBox="0 0 100 100">${FACE.hari(true)}</svg></g>
    <g class="ry-wheelg">
      <circle cx="160" cy="112" r="50" fill="none" stroke="var(--ry-ink)" stroke-width="15"/>
      <circle cx="160" cy="112" r="50" fill="none" stroke="var(--ry-wheel)" stroke-width="10"/>
      <path d="M118 96A46 46 0 0 1 202 96" fill="none" stroke="var(--ry-dash-hi)" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <path d="M160 112L116 104M160 112L204 104M160 112V160" stroke="var(--ry-ink)" stroke-width="12" stroke-linecap="round"/>
      <path d="M160 112L116 104M160 112L204 104M160 112V160" stroke="var(--ry-wheel)" stroke-width="7" stroke-linecap="round"/>
      <circle cx="160" cy="112" r="15" fill="var(--ry-wheel-2)" ${o(2.6)}/>
      <path d="M160 119c-6-4-9-7-9-10a4.4 4.4 0 0 1 9-2 4.4 4.4 0 0 1 9 2c0 3-3 6-9 10z" fill="var(--ry-car-2)"/>
      ${paw(121, 79, -40)}${paw(199, 79, 40)}
    </g></svg>`;

  /* ---------- illustrazioni della card e del tutorial (120 × 90) ---------- */
  const pine = (x, y, k) => `<path d="M${x} ${y - 16 * k}L${x + 7 * k} ${y}H${x - 7 * k}Z" fill="var(--ry-pine)" ${o(1.2)}/><rect x="${x - 1.2 * k}" y="${y}" width="${2.4 * k}" height="${3 * k}" fill="var(--ry-trunk)"/>`;
  const roundT = (x, y, k, c = 'var(--ry-leaf-1)') => `<rect x="${x - 1.3 * k}" y="${y - 3 * k}" width="${2.6 * k}" height="${6 * k}" fill="var(--ry-trunk)"/><circle cx="${x}" cy="${y - 8 * k}" r="${7 * k}" fill="${c}" ${o(1.2)}/>`;
  const carBack = (x, y, k, body, who) => `<g transform="translate(${x} ${y}) scale(${k})">
    <rect x="-13" y="-6" width="26" height="12" rx="4" fill="${body}" ${o(1.6)}/><rect x="-9" y="-13" width="18" height="8" rx="3" fill="var(--ry-glass)" ${o(1.4)}/>
    <rect x="-11" y="4" width="5" height="5" rx="1.5" fill="var(--ry-tire)"/><rect x="6" y="4" width="5" height="5" rx="1.5" fill="var(--ry-tire)"/>
    <rect x="-11" y="-3" width="4" height="2.4" rx="1" fill="var(--ry-tail)"/><rect x="7" y="-3" width="4" height="2.4" rx="1" fill="var(--ry-tail)"/>
    <svg x="-8" y="-27" width="16" height="16" viewBox="0 0 100 100">${FACE[who](false)}</svg></g>`;
  function forest(extra, under = '') {
    return `<svg viewBox="0 0 120 90" aria-hidden="true">
      <rect x="4" y="4" width="112" height="82" rx="14" fill="var(--ry-sky-1)"/>
      <path d="M4 30h112v16H4z" fill="var(--ry-sky-2)"/>
      <circle cx="92" cy="18" r="7" fill="var(--ry-sun)"/>
      <path d="M4 40Q24 26 44 38T84 34T116 38V50H4Z" fill="var(--ry-hill)"/>
      <path d="M4 46H116V72Q116 86 102 86H18Q4 86 4 72Z" fill="var(--ry-grass)"/>
      <path d="M57 46C55 54 46 62 30 72L14 86H106L90 72C76 62 64 54 63 46Z" fill="var(--ry-dirt)" ${o(1)}/>
      <path d="M58.5 48C56 58 44 70 34 86M61.5 48C64 58 74 70 86 86" fill="none" stroke="var(--ry-dirt-2)" stroke-width="2.4" stroke-linecap="round"/>
      ${under}
      ${pine(16, 52, 1.1)}${roundT(30, 50, 0.9, 'var(--ry-leaf-3)')}${pine(42, 46, 0.6)}${pine(80, 46, 0.6)}${roundT(92, 52, 1, 'var(--ry-leaf-1)')}${pine(106, 54, 1.2)}
      <circle cx="22" cy="66" r="2" fill="var(--ry-flower-1)"/><circle cx="98" cy="68" r="2" fill="var(--ry-flower-2)"/>
      <g transform="translate(14 64)"><rect x="-1.4" y="-1" width="2.8" height="4" fill="var(--ry-stem)"/><path d="M-4 -1a4 3.4 0 0 1 8 0z" fill="var(--ry-cap)" ${o(0.8)}/></g>
      ${extra}</svg>`;
  }
  const hood = (wheel = '') => `<path d="M10 86C20 74 100 74 110 86Z" fill="var(--ry-car)" ${o(1.6)}/><path d="M56 76h8l2 10h-12z" fill="var(--ry-car-2)" opacity=".8"/>${wheel}`;
  const miniWheel = (cls = '') => `<g class="${cls}"><circle cx="60" cy="98" r="17" fill="none" stroke="var(--ry-wheel)" stroke-width="4.6" ${''}/><circle cx="60" cy="98" r="17" fill="none" stroke="var(--ry-ink)" stroke-width="1" opacity=".8"/>
    <circle cx="45" cy="88" r="4.6" fill="var(--ry-paw)" ${o(1)}/><circle cx="75" cy="88" r="4.6" fill="var(--ry-paw)" ${o(1)}/></g>`;
  const noteArt = (x, y, k, dir, g, extra = '') => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="0" y="0" width="30" height="26" rx="6" fill="var(--ry-note)" stroke="var(--ry-note-line)" stroke-width="1.4"/>
    <svg x="2" y="3" width="20" height="18" viewBox="0 0 60 48">${arrow(dir, g)}</svg><text x="26" y="12" text-anchor="end" font-size="11" font-weight="900" fill="var(--ry-arrow)" stroke="var(--ry-note)" stroke-width="2" paint-order="stroke">${g}</text>${extra}</g>`;
  const giftArt = (x, y, k) => `<svg x="${x}" y="${y}" width="${48 * k}" height="${48 * k}" viewBox="0 0 48 48">${PU_ART.gift}</svg>`;
  const art = () => forest(`${giftArt(45, 50, 0.24)}${carBack(62, 56, 0.55, 'var(--ry-bunny-car)', 'bunny')}${hood(miniWheel())}${noteArt(84, 7, 1, -1, 3)}`);

  /* ---------- utilità ---------- */
  let rmAt = -1e9, rmVal = false;
  const reduce = () => { const n = Date.now(); if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); } return rmVal; };
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const KEYS = { ArrowLeft: 'l', ArrowRight: 'r', a: 'l', d: 'r', A: 'l', D: 'r', ArrowDown: 'b', s: 'b', S: 'b', ' ': 'b' };
  const USEKEYS = { ArrowUp: 1, w: 1, W: 1, Enter: 1, e: 1, E: 1 };
  const fmtT = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), sec = t - m * 60; return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`; };
  const PITCH = Math.atan(0.45 / 12);   // la camera guarda appena in giù
  const COLS = ['ink', 'sky-1', 'sky-2', 'sun', 'cloud', 'hill', 'grass', 'grass-2', 'verge', 'dirt', 'dirt-2', 'dirt-3', 'wood', 'wood-2', 'water', 'water-2',
    'trunk', 'leaf-1', 'leaf-2', 'leaf-3', 'pine', 'pine-2', 'snow-cap', 'rock', 'rock-2', 'cap', 'cap-dot', 'stem', 'flower-1', 'flower-2', 'flower-3', 'bush', 'shaft',
    'chevron', 'chevron-2', 'check-1', 'check-2', 'pole', 'flag', 'car', 'car-2', 'trim', 'tire', 'glass', 'head', 'tail', 'bunny-car', 'fox-car', 'panda-car',
    'bunny', 'bunny-in', 'fox', 'fox-2', 'panda', 'panda-2', 'dust', 'leafp', 'spark', 'nsky-1', 'nsky-2', 'nsun', 'nhill',
    'gift-1', 'gift-2', 'gift-3', 'gift-4', 'ribbon', 'acorn', 'acorn-cap', 'banana', 'banana-2', 'honey', 'honey-2', 'bubble', 'petal', 'petal-2', 'carrot', 'carrot-leaf', 'spring',
    'road', 'road-2', 'paint', 'paint-2', 'curb', 'curb-2', 'walk', 'walk-2', 'plaza', 'bld-1', 'bld-2', 'bld-3', 'bld-4', 'bld-5', 'bld-6', 'roof', 'roof-2',
    'win', 'win-on', 'win-off', 'awn-1', 'awn-2', 'awn-3', 'sign', 'barrier-1', 'barrier-2', 'lamp', 'bulb', 'glow', 'tl-red', 'tl-amber', 'tl-green',
    'sand', 'sand-2', 'sea', 'sea-2', 'foam', 'cliff', 'cliff-2', 'palm', 'palm-leaf', 'umb-1', 'umb-2', 'umb-3', 'boat', 'boat-2', 'sail', 'light-1', 'light-2', 'gull',
    'snowbank', 'chalet', 'chalet-roof', 'scarf', 'fur-1', 'fur-2', 'fur-3', 'fur-4', 'stand', 'stand-2', 'flag-1', 'flag-2', 'flag-3', 'flag-4', 'eye'];
  const NUMS = ['amb', 'sunI', 'night', 'shafts', 'namb', 'nsunI', 'sunH'];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function create(el, ctx, saved) {
    const P = HH.rally, T = G.THREE;
    // la camera sta un po' dietro il centro dell'auto: il bordo del cofano (2,9 m davanti all'occhio) è il muso dell'auto
    const EYE_BACK = 2.9 - P.CAR_L / 2;
    let s = null, g = null, cfg = null, raf = 0, last = 0, paused = false, over = 0, timers = [], lastChanged = 0, alive = true;
    let wrap, stage, cv, needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pauseEl, endEl, turnEl, pedalEl, zoneL, zoneR, modeBtn, pauseBtn, itemBtn, acornEl, fxoEl, glErr = false;
    let W = 300, H = 400, pr = 1, slowF = 0, fastF = 0;
    let keys = {}, ptrs = new Map(), steerV = 0, brakeOn = false, hdgS = null, camRoll = 0, useQ = false, fovK = 0;
    let pref = 'tilt';
    try { pref = (HH.store && HH.store.get && HH.store.get('rally:ctl')) || 'tilt'; } catch (e) { pref = 'tilt'; }
    const sensor = { at: 0, raw: 0, zero: 0, val: 0, asked: false };
    let lastHud = { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' };
    let rollUntil = 0, seenPu = {}, qaHold = false;
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const sfx = (k, ...a) => { if (ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };
    const audio = () => HH.audio || {};
    const asfx = (k, ...a) => { const A = audio(); if (A.sfx && typeof A.sfx[k] === 'function') A.sfx[k](...a); };

    /* ---------- 3D: stato della scena ---------- */
    let R3 = null;      // { renderer, scene, camera, ... }
    let C = {}, N = {}, themeKey = '', themeAt = 0;

    function readTheme() {
      const cs = G.getComputedStyle(wrap);
      const raw = COLS.map((k) => cs.getPropertyValue('--ry-' + k).trim()).concat(NUMS.map((k) => cs.getPropertyValue('--ry-' + k).trim()));
      const key = raw.join('|');
      if (key === themeKey) return false;
      themeKey = key;
      C = {}; N = {};
      COLS.forEach((k, i) => { const c = new T.Color(); try { c.setStyle(raw[i] || '#ff00ff'); } catch (e) { c.set(0xff00ff); } C[k] = c; });
      NUMS.forEach((k, i) => { N[k] = parseFloat(raw[COLS.length + i]) || 0; });
      return true;
    }

    /* ---------- costruzione del DOM ---------- */
    function build() {
      el.innerHTML = `<div class="ry-wrap" dir="ltr">
        <div class="ry-stage" tabindex="0" role="application" aria-label="${L('ry_board')}">
          <canvas class="ry-cv"></canvas>
          <div class="ry-fxo" aria-hidden="true"></div>
          <div class="ry-touch" aria-hidden="true"><div class="ry-zone l">${ZONE(-1)}</div><div class="ry-zone r">${ZONE(1)}</div></div>
          <div class="ry-dash">${DASH}</div>
          <div class="ry-prog" aria-hidden="true">${[3, 2, 1, 0].map((i) => `<i class="${i ? '' : 'me'}" data-id="${i}" style="--ry-c:${CCOL[i]}"></i>`).join('')}<b>${FLAG}</b></div>
          <div class="ry-top">
            <div class="ry-left"><div class="ry-pos" role="status"><b>4</b><small>/4</small></div><div class="ry-rank" aria-hidden="true"></div></div>
            <div class="ry-notes" aria-live="polite"></div>
            <div class="ry-right"><div class="ry-btns">
              <button class="ry-btn ry-mode" type="button"></button>
              <button class="ry-btn ry-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button></div>
              <div class="ry-time">0:00.0</div>
              <div class="ry-acorn" role="img" aria-label="${L('ry_acorns')}: 0">${ACORN}<b>0</b></div></div>
          </div>
          <button class="ry-item empty" type="button" aria-label="${L('ry_item')}">${puSvg('gift')}</button>
          <div class="ry-pedal" aria-label="${L('ry_brake')}" role="img">${PEDAL}</div>
          <div class="ry-msg" aria-live="polite"></div>
          <div class="ry-veil ry-pause" hidden><span class="ry-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div>
          <div class="ry-veil ry-turn" hidden>${PHONE}<b>${L('ry_turn')}</b></div>
          <div class="ry-veil ry-end" hidden></div>
        </div></div>`;
      wrap = el.querySelector('.ry-wrap');
      stage = el.querySelector('.ry-stage');
      cv = el.querySelector('.ry-cv');
      needle = el.querySelector('.ry-needle');
      wheelG = el.querySelector('.ry-wheelg');
      posEl = el.querySelector('.ry-pos');
      rankEl = el.querySelector('.ry-rank');
      timeEl = el.querySelector('.ry-time');
      notesEl = el.querySelector('.ry-notes');
      progEl = el.querySelector('.ry-prog');
      msgEl = el.querySelector('.ry-msg');
      pauseEl = el.querySelector('.ry-pause');
      endEl = el.querySelector('.ry-end');
      turnEl = el.querySelector('.ry-turn');
      pedalEl = el.querySelector('.ry-pedal');
      zoneL = el.querySelector('.ry-zone.l');
      zoneR = el.querySelector('.ry-zone.r');
      modeBtn = el.querySelector('.ry-mode');
      pauseBtn = el.querySelector('.ry-pbtn');
      itemBtn = el.querySelector('.ry-item');
      acornEl = el.querySelector('.ry-acorn');
      fxoEl = el.querySelector('.ry-fxo');
      renderMode();
      if (G.ResizeObserver) {
        if (el._ryRO) el._ryRO.disconnect();
        el._ryRO = new G.ResizeObserver(() => measure());
        el._ryRO.observe(stage);
      }
    }

    /* ---------- 3D: renderer e materiali ---------- */
    function initGL() {
      if (R3) return true;
      if (!T) { glErr = true; return false; }
      let renderer;
      try {
        renderer = new T.WebGLRenderer({ canvas: cv, antialias: (G.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
      } catch (e) { glErr = true; return false; }
      pr = Math.min(1.5, G.devicePixelRatio || 1);
      renderer.setPixelRatio(pr);
      const grad = new T.DataTexture(new Uint8Array([128, 128, 128, 255, 196, 196, 196, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
      const camera = new T.PerspectiveCamera(66, 1, 0.1, 900);
      R3 = { renderer, camera, grad, scene: null, disp: [], chunks: [], built: 0 };
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); }, false);
      return true;
    }
    const keep = (x) => { R3.disp.push(x); return x; };
    const toon = (o2) => keep(new T.MeshToonMaterial(Object.assign({ gradientMap: R3.grad }, o2)));
    const basic = (o2) => keep(new T.MeshBasicMaterial(o2));

    // fonde parti semplici in una geometria con i colori nei vertici (+ guscio per il contorno, ingrandito per asse)
    function M4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
    }
    // geometria base non indicizzata + centro e mezze misure del suo riquadro (in cache sulla geometria)
    function base(geo) {
      if (geo._ry) return geo._ry;
      const gg = geo.index ? keep(geo.toNonIndexed()) : geo;
      gg.computeBoundingBox();
      const bb = gg.boundingBox;
      geo._ry = { pa: gg.attributes.position.array, na: gg.attributes.normal.array, n: gg.attributes.position.count, c: bb.getCenter(new T.Vector3()), hs: bb.getSize(new T.Vector3()).multiplyScalar(0.5) };
      return geo._ry;
    }
    function merge(parts) {
      let n = 0, nl = 0;
      const bs = parts.map((p) => { const b = base(p.geo); n += b.n; if (p.ol) nl += b.n; return b; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), lpos = new Float32Array(nl * 3);
      let k = 0, kl = 0;
      const nm = new T.Matrix3();
      parts.forEach((p, i) => {
        const { pa, na, n: cnt, c, hs } = bs[i], e = p.m.elements;
        nm.getNormalMatrix(p.m);
        const q = nm.elements;
        const sx = p.ol && hs.x > 1e-4 ? (hs.x + p.ol) / hs.x : 1, sy = p.ol && hs.y > 1e-4 ? (hs.y + p.ol) / hs.y : 1, sz = p.ol && hs.z > 1e-4 ? (hs.z + p.ol) / hs.z : 1;
        const cr = p.c.r, cg = p.c.g, cb = p.c.b;
        for (let j = 0; j < cnt; j++) {
          const x = pa[j * 3], y = pa[j * 3 + 1], z = pa[j * 3 + 2];
          if (p.ol) {
            const ox = c.x + (x - c.x) * sx, oy = c.y + (y - c.y) * sy, oz = c.z + (z - c.z) * sz;
            lpos[kl * 3] = e[0] * ox + e[4] * oy + e[8] * oz + e[12];
            lpos[kl * 3 + 1] = e[1] * ox + e[5] * oy + e[9] * oz + e[13];
            lpos[kl * 3 + 2] = e[2] * ox + e[6] * oy + e[10] * oz + e[14];
            kl++;
          }
          pos[k * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
          pos[k * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          pos[k * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          const nx = na[j * 3], ny = na[j * 3 + 1], nz = na[j * 3 + 2];
          let mx = q[0] * nx + q[3] * ny + q[6] * nz, my = q[1] * nx + q[4] * ny + q[7] * nz, mz = q[2] * nx + q[5] * ny + q[8] * nz;
          const l = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
          nor[k * 3] = mx / l; nor[k * 3 + 1] = my / l; nor[k * 3 + 2] = mz / l;
          col[k * 3] = cr; col[k * 3 + 1] = cg; col[k * 3 + 2] = cb;
          k++;
        }
      });
      const body = keep(new T.BufferGeometry());
      body.setAttribute('position', new T.BufferAttribute(pos, 3));
      body.setAttribute('normal', new T.BufferAttribute(nor, 3));
      body.setAttribute('color', new T.BufferAttribute(col, 3));
      let line = null;
      if (nl) { line = keep(new T.BufferGeometry()); line.setAttribute('position', new T.BufferAttribute(lpos, 3)); }
      return { body, line };
    }
    // geometrie di base (riusate)
    let GEO = null;
    function geos() {
      if (GEO) return GEO;
      const prism = new T.CylinderGeometry(1, 1, 1, 3); prism.rotateZ(Math.PI / 2); prism.rotateX(-Math.PI / 2);   // tetto a capanna: colmo lungo x, punta in su (base a −0,5)
      GEO = {
        box: keep(new T.BoxGeometry(1, 1, 1)), sph: keep(new T.IcosahedronGeometry(1, 1)), sph2: keep(new T.SphereGeometry(1, 10, 8)), lo: keep(new T.SphereGeometry(1, 7, 5)),
        cyl: keep(new T.CylinderGeometry(1, 1, 1, 10)), cyl6: keep(new T.CylinderGeometry(1, 1, 1, 6)), cone: keep(new T.ConeGeometry(1, 1, 8)), rock: keep(new T.DodecahedronGeometry(1, 0)),
        prism: keep(prism), plane: keep(new T.PlaneGeometry(1, 1)), ball: keep(new T.SphereGeometry(1, 16, 12)), sph0: keep(new T.IcosahedronGeometry(1, 0)),
      };
      return GEO;
    }
    function meshOf(m, olMat, mat) {
      const grp = new T.Group();
      if (m.line) { const ol = new T.Mesh(m.line, olMat); grp.add(ol); }
      grp.add(new T.Mesh(m.body, mat));
      return grp;
    }

    /* ---------- altezze e terreno ---------- */
    let BR = [], SEA_Y = -3, isSea = false;
    function creek(x, y) {
      let dip = 0;
      for (const b of BR) {
        const ax = x - b.x, ay = y - b.y, al = ax * b.tx + ay * b.ty;
        if (al > 16 || al < -16) continue;
        const la = Math.abs(-ax * b.ty + ay * b.tx);
        if (la > 90) continue;
        dip = Math.max(dip, 2.4 * Math.exp(-(al * al) / 22) * (la < 70 ? 1 : (90 - la) / 20));
      }
      return dip;
    }
    // nessun punto della pista entro d metri (ricerca solo nelle celle vicine, uscita al primo punto trovato)
    function clearPt(X, Y, d) {
      const cs = g.cell, cx = Math.floor(X / cs), cy = Math.floor(Y / cs), n = Math.ceil(d / cs), d2 = d * d;
      for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) {
        const bk = g.grid.get((cx + a) * 73856093 ^ (cy + b) * 19349663);
        if (!bk) continue;
        for (const q of bk) { const dx = X - g.x[q], dy = Y - g.y[q]; if (dx * dx + dy * dy < d2) return false; }
      }
      return true;
    }
    // distanza con segno dalla pista (> 0 a sinistra di chi guida): al mare l'acqua è sempre a destra
    function sdist(x, y) {
      let nr = P.nearest(g, x, y);
      if (nr.i < 0) {
        // lontano dalla pista (oltre ~40 m): punto più vicino tra quelli ogni 8 m
        let best = 1e18, bi = 0;
        for (let i = 0; i <= g.N; i += 8) { const dd = (x - g.x[i]) ** 2 + (y - g.y[i]) ** 2; if (dd < best) { best = dd; bi = i; } }
        nr = { i: bi, dist: Math.sqrt(best) };
      }
      const th = g.th[nr.i], cx = x - g.x[nr.i], cy = y - g.y[nr.i];
      return (-Math.sin(th) * cx + Math.cos(th) * cy) >= 0 ? nr.dist : -nr.dist;
    }
    // memoria su una griglia fissa del mondo (passo 12 m) per il terreno che segue la camera
    const SD = new Map();
    function sdGrid(x, y) {
      const k = Math.round(x / 12) * 100003 + Math.round(y / 12);
      let v = SD.get(k);
      if (v === undefined) { v = sdist(x, y); SD.set(k, v); }
      return v;
    }
    function shapeH(h, sd) {
      if (!isSea) return h;
      if (sd < 0) return h + (SEA_Y - 2.4 - h) * smooth(13, 30, -sd);
      return h + 7 * smooth(16, 36, sd);
    }
    // vicino alla strada (entro 13 m) la spiaggia e la scogliera non cambiano la quota: niente ricerca della distanza
    const groundH = (x, y, sd) => shapeH(P.height(g, x, y), isSea ? (sd === undefined ? (clearPt(x, y, 13) ? sdist(x, y) : 0) : sd) : 0) - creek(x, y) - 0.14;
    // strada: colline + ponti un po' rialzati + curve paraboliche (l'esterno più alto)
    function roadH(sv, d, x, y) {
      let h = P.height(g, x, y);
      for (const b of g.bridges) if (sv > b.s0 - 5 && sv < b.s1 + 5) h += 0.3 * Math.min(1, Math.min(sv - (b.s0 - 5), b.s1 + 5 - sv) / 4);
      return h - P.bankAt(g, sv) * d;
    }
    // da piano della logica (x, y) a three (x, h, −y)
    const V3 = (x, h, y) => new T.Vector3(x, h, -y);

    /* ---------- scena ---------- */
    function buildWorld() {
      disposeWorld();
      readTheme();
      geos();
      cfg = P.config(s.level);
      const night = N.night || 0, dark = night >= 1;
      isSea = cfg.theme === 'sea';
      SEA_Y = -(g.hill.A) - 1.1;
      const scene = new T.Scene();
      R3.scene = scene;
      R3.night = night; R3.lit = night >= 0.5;
      const skyTop = dark ? C['nsky-1'] : C['sky-1'], skyLow = dark ? C['nsky-2'] : C['sky-2'];
      const fogFar = (dark ? 150 : night > 0 ? 205 : 235) - cfg.fog * 70;
      scene.fog = new T.Fog(skyLow.clone(), dark ? 12 : 30, fogFar);
      scene.background = skyLow.clone();
      R3.camera.far = 900; R3.camera.updateProjectionMatrix();
      R3.fogFar = fogFar;
      R3.inkMat = basic({ color: C.ink, side: T.BackSide });
      R3.vc = toon({ vertexColors: true });
      R3.anim = [];
      // luci
      const hemi = new T.HemisphereLight(skyTop, C.grass, dark ? N.namb : N.amb);
      const sun = new T.DirectionalLight(dark ? C.nsun : C.sun, dark ? N.nsunI : N.sunI);
      scene.add(hemi, sun, sun.target);
      R3.sun = sun; R3.sunDir = new T.Vector3(0.5, dark ? 0.7 : N.sunH || 0.9, -0.35).normalize();
      buildSky(skyTop, skyLow, dark);
      // fari (notte e tramonto)
      R3.head = null;
      if (night > 0) {
        const sl = new T.SpotLight(C.head, 3.4 * night, 95, 0.62, 0.6, 0);
        sl.position.set(0, -0.3, -0.5);
        sl.target.position.set(0, -2.5, -30);
        R3.camera.add(sl, sl.target);
        R3.head = sl;
      }
      scene.add(R3.camera);
      // ponti: dati per il ruscello (e i canali in città, le insenature al mare)
      SD.clear();
      BR = g.bridges.map((b) => { const m = (b.s0 + b.s1) / 2, w = P.world(g, m); return { x: w.x, y: w.y, tx: Math.cos(w.th), ty: Math.sin(w.th), m, th: w.th }; });
      buildGlow();
      buildGround();
      if (isSea) {
        // il mare: un piano che segue la camera, sotto il livello della strada
        const sea = new T.Mesh(GEO.plane, toon({ color: C.sea }));
        sea.rotation.x = -Math.PI / 2; sea.scale.set(1100, 1100, 1); sea.position.y = SEA_Y;
        scene.add(sea); R3.sea = sea;
      } else R3.sea = null;
      R3.chunks = [];
      for (let a = 0; a < g.N - 2; a += 120) R3.chunks.push({ a, b: Math.min(g.N, a + 120), grp: null });
      R3.built = 0;
      TGc = null;
      buildCars();
      buildHood();
      buildFx();
      buildItems();
      buildGulls();
      // primi blocchi subito (la partenza si vede intera)
      for (let i = 0; i < Math.min(3, R3.chunks.length); i++) buildChunk(R3.chunks[i]);
      hdgS = null;
    }
    // cielo: cupola sfumata, sole o luna, nuvole, profilo lontano (colline, città, isole o montagne), stelle di notte
    function buildSky(skyTop, skyLow, dark) {
      const sky = new T.Group();
      const dome = new T.SphereGeometry(520, 24, 12);
      const dc = new Float32Array(dome.attributes.position.count * 3);
      for (let i = 0; i < dome.attributes.position.count; i++) {
        const yy = dome.attributes.position.getY(i) / 520, k2 = Math.max(0, Math.min(1, (yy + 0.05) / 0.6));
        const c = skyLow.clone().lerp(skyTop, k2);
        dc[i * 3] = c.r; dc[i * 3 + 1] = c.g; dc[i * 3 + 2] = c.b;
      }
      dome.setAttribute('color', new T.BufferAttribute(dc, 3)); keep(dome);
      sky.add(new T.Mesh(dome, basic({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })));
      const sunM = new T.Mesh(GEO.sph2, basic({ color: dark ? C.nsun : C.sun, fog: false }));
      sunM.position.copy(R3.sunDir).multiplyScalar(470); sunM.scale.setScalar(dark ? 12 : 16);
      sky.add(sunM);
      const hr = HH.rng((s.seed ^ 0x51ed) >>> 0), th = cfg.theme;
      // profilo lontano: anello frastagliato (colline, palazzi, isole basse, montagne con la neve in cima)
      {
        const n = 96, pos = [], cap = [], hillC = dark ? C.nhill : C.hill;
        let bh = 30;
        const H = [];
        for (let i = 0; i <= n; i++) {
          if (th === 'city') { if (i % 2 === 0) bh = 18 + hr() * 46; H.push(bh); }
          else if (th === 'sea') H.push(Math.max(0, 4 + 22 * Math.sin(i * 0.31 + hr() * 0.3) * Math.sin(i * 0.07)) + hr() * 2);
          else if (th === 'snow') H.push(34 + 80 * Math.abs(((i * 0.37) % 2) - 1) + hr() * 8);
          else H.push(26 + 40 * Math.abs(Math.sin(i * 0.7 + hr() * 0.4)) + hr() * 10);
        }
        H[n] = H[0];
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, r = 470;
          const h0 = H[i], h1 = th === 'city' ? H[i] : H[i + 1];
          const P0b = [Math.cos(a0) * r, -30, Math.sin(a0) * r], P1b = [Math.cos(a1) * r, -30, Math.sin(a1) * r];
          pos.push(...P0b, P0b[0], h0, P0b[2], ...P1b, ...P1b, P0b[0], h0, P0b[2], P1b[0], h1, P1b[2]);
          if (th === 'snow' && (h0 > 80 || h1 > 80)) {
            const r2 = 468, c0 = [Math.cos(a0) * r2, Math.sin(a0) * r2], c1 = [Math.cos(a1) * r2, Math.sin(a1) * r2];
            const b0 = Math.max(60, h0 - 22), b1 = Math.max(60, h1 - 22);
            cap.push(c0[0], Math.min(b0, h0), c0[1], c0[0], h0, c0[1], c1[0], Math.min(b1, h1), c1[1], c1[0], Math.min(b1, h1), c1[1], c0[0], h0, c0[1], c1[0], h1, c1[1]);
          }
        }
        const hg = keep(new T.BufferGeometry()); hg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        sky.add(new T.Mesh(hg, basic({ color: hillC, fog: false, side: T.DoubleSide, depthWrite: false })));
        if (cap.length) {
          const cg = keep(new T.BufferGeometry()); cg.setAttribute('position', new T.Float32BufferAttribute(cap, 3));
          sky.add(new T.Mesh(cg, basic({ color: dark ? C.nhill.clone().lerp(C.snowbank, 0.5) : C.snowbank, fog: false, side: T.DoubleSide, depthWrite: false })));
        }
      }
      if (!dark) {
        const cm = basic({ color: C.cloud, fog: false });
        for (let i = 0; i < 7; i++) {
          const a = hr() * Math.PI * 2, r = 380 + hr() * 50, cy = 95 + hr() * 70, grp = new T.Group();
          for (let j = 0; j < 4; j++) { const b = new T.Mesh(GEO.sph, cm); b.position.set((j - 1.5) * 16 + hr() * 6, hr() * 6, hr() * 8); b.scale.set(16 + hr() * 8, 9 + hr() * 4, 12); grp.add(b); }
          grp.position.set(Math.cos(a) * r, cy, Math.sin(a) * r); grp.lookAt(0, cy, 0);
          sky.add(grp);
        }
      } else {
        const sp = [];
        for (let i = 0; i < 380; i++) { const a = hr() * Math.PI * 2, e = 0.12 + hr() * 1.3, r = 480; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
        const sg = keep(new T.BufferGeometry()); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        sky.add(new T.Points(sg, keep(new T.PointsMaterial({ color: C.nsun, size: 2.2, sizeAttenuation: false, fog: false }))));
      }
      sky.renderOrder = -10;
      sky.traverse((m) => { m.renderOrder = -10; });
      R3.scene.add(sky);
      R3.sky = sky;
    }
    function disposeWorld() {
      if (!R3 || !R3.scene) return;
      R3.disp.forEach((x) => { try { x.dispose(); } catch (e) { /* già liberato */ } });
      R3.disp = [];
      GEO = null; TGc = null;
      if (R3.head) { R3.camera.remove(R3.head, R3.head.target); R3.head = null; }
      if (R3.hood) R3.camera.remove(R3.hood);
      R3.scene = null;
    }

    /* terreno: griglia che segue la camera, alte dalla funzione del terreno (al mare con spiaggia e scogliere) */
    function buildGround() {
      const n = 64, cell = 6, geo = keep(new T.PlaneGeometry(n * cell, n * cell, n, n));
      geo.rotateX(-Math.PI / 2);
      const col = new Float32Array(geo.attributes.position.count * 3);
      geo.setAttribute('color', new T.BufferAttribute(col, 3));
      const m = new T.Mesh(geo, R3.vc);
      m.frustumCulled = false;
      R3.scene.add(m);
      R3.ground = { m, n, cell, cx: 1e9, cy: 1e9, sd: new Float32Array((n / 2 + 1) * (n / 2 + 1)) };
    }
    function updateGround(x, y) {
      const G0 = R3.ground, cx = Math.round(x / G0.cell / 4) * 4, cy = Math.round(y / G0.cell / 4) * 4;
      if (cx === G0.cx && cy === G0.cy) return;
      G0.cx = cx; G0.cy = cy;
      const pa = G0.m.geometry.attributes.position, ca = G0.m.geometry.attributes.color, half = (G0.n * G0.cell) / 2, n1 = G0.n + 1;
      const c1 = C.grass, c2 = C['grass-2'];
      // al mare: distanza con segno su una griglia a passo doppio, interpolata (4 volte meno ricerche)
      if (isSea) {
        const m2 = G0.n / 2 + 1;
        for (let j = 0; j < m2; j++) for (let i = 0; i < m2; i++) {
          const wx = cx * G0.cell - half + i * 2 * G0.cell, wy = cy * G0.cell + half - j * 2 * G0.cell;
          G0.sd[j * m2 + i] = sdGrid(wx, wy);
        }
      }
      const tmp = new T.Color();
      for (let i = 0; i < pa.count; i++) {
        const ix = i % n1, iy = Math.floor(i / n1);
        const wx = cx * G0.cell - half + ix * G0.cell, wy = cy * G0.cell + half - iy * G0.cell;
        let sd = 0;
        if (isSea) {
          const m2 = G0.n / 2 + 1, fx = ix / 2, fy = iy / 2, i0 = Math.min(m2 - 2, Math.floor(fx)), j0 = Math.min(m2 - 2, Math.floor(fy)), u = fx - i0, v = fy - j0;
          const q = G0.sd;
          sd = (q[j0 * m2 + i0] * (1 - u) + q[j0 * m2 + i0 + 1] * u) * (1 - v) + (q[(j0 + 1) * m2 + i0] * (1 - u) + q[(j0 + 1) * m2 + i0 + 1] * u) * v;
        }
        const h = groundH(wx, wy, sd);
        pa.setXYZ(i, wx, h, -wy);
        const hsh = Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453, f = hsh - Math.floor(hsh);
        let c = f < 0.5 ? c1 : c2;
        if (isSea) {
          if ((sd < 0 && -sd > g.wall - 1) || Math.abs(sd) < P.HALF + 2) c = h < SEA_Y + 0.4 ? C['sand-2'] : f < 0.5 ? C.sand : C['sand-2'];
          else if (sd > 18) c = tmp.copy(f < 0.5 ? C.cliff : C['cliff-2']).lerp(c, Math.max(0, 1 - smooth(18, 30, sd)));
        }
        ca.setXYZ(i, c.r, c.g, c.b);
      }
      pa.needsUpdate = true; ca.needsUpdate = true;
      G0.m.geometry.computeVertexNormals();
      G0.m.geometry.computeBoundingSphere();
    }

    /* ---------- luci notturne: aloni (sprite) e pozze di luce sulla strada ---------- */
    function buildGlow() {
      const cvs = document.createElement('canvas'); cvs.width = cvs.height = 64;
      const c2 = cvs.getContext('2d'), gr = c2.createRadialGradient(32, 32, 1, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const tex = keep(new T.CanvasTexture(cvs));
      R3.glowTex = tex;
      R3.haloMat = keep(new T.PointsMaterial({ size: 2.4, map: tex, color: C.glow, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
      R3.poolMat = basic({ map: tex, color: C.glow, transparent: true, opacity: 0.3, depthWrite: false, blending: T.AdditiveBlending });
      R3.bulbMat = basic({ color: R3.lit ? C.bulb : C['sky-2'] });
      R3.winMat = basic({ color: 0xffffff, side: T.DoubleSide });
    }

    /* ---------- forme riusate (istanze) ---------- */
    let TGc = null;
    function kinds() {
      if (TGc && TGc.key === R3.scene.uuid) return TGc;
      const W1 = new T.Color(1, 1, 1);
      const round = merge([
        { geo: GEO.sph, c: W1, m: M4(0, 3.5, 0, 0, 0, 0, 2.3, 2.05, 2.3), ol: 0.12 },
        { geo: GEO.sph, c: W1, m: M4(1.25, 2.85, 0.5, 0, 0, 0, 1.5, 1.35, 1.5), ol: 0.11 },
      ]);
      const pine = merge([
        { geo: GEO.cone, c: W1, m: M4(0, 2.4, 0, 0, 0, 0, 2.1, 3.0, 2.1), ol: 0.1 },
        { geo: GEO.cone, c: W1, m: M4(0, 3.9, 0, 0, 0, 0, 1.65, 2.6, 1.65), ol: 0.1 },
        { geo: GEO.cone, c: W1, m: M4(0, 5.2, 0, 0, 0, 0, 1.1, 2.1, 1.1), ol: 0.09 },
      ]);
      // cespuglio: due bolle una dietro l'altra lungo la strada (asse z), larghezza verso la strada = 0,95
      const bush = merge([
        { geo: GEO.lo, c: W1, m: M4(0, 0.5, 0, 0, 0, 0, 0.95, 0.75, 0.95), ol: 0.08 },
        { geo: GEO.lo, c: W1, m: M4(0, 0.35, 0.75, 0, 0, 0, 0.62, 0.55, 0.62), ol: 0.07 },
      ]);
      const trunk = keep(new T.CylinderGeometry(0.2, 0.32, 2.6, 7)); trunk.translate(0, 1.3, 0);
      const capM = merge([
        { geo: GEO.cone, c: C['snow-cap'], m: M4(0, 4.75, 0, 0, 0, 0, 1.0, 1.15, 1.0) },
        { geo: GEO.cone, c: C['snow-cap'], m: M4(0, 5.75, 0, 0, 0, 0, 0.68, 1.0, 0.68) },
      ]);
      const rockLine = keep(GEO.rock.clone()); rockLine.scale(1.09, 1.12, 1.09);
      // animaletto che tifa (bianco: il colore del pelo arriva dall'istanza; occhi e guance restano scuri/rosa)
      const ink = C.eye, bl = C['bunny-in'];
      const critter = merge([
        { geo: GEO.lo, c: W1, m: M4(0, 0.45, 0, 0, 0, 0, 0.36, 0.42, 0.33), ol: 0.04 },
        { geo: GEO.lo, c: W1, m: M4(0, 0.98, 0.02, 0, 0, 0, 0.33, 0.3, 0.3), ol: 0.04 },
        { geo: GEO.sph0, c: W1, m: M4(-0.15, 1.32, 0, 0, 0, 0.25, 0.08, 0.2, 0.06), ol: 0.03 },
        { geo: GEO.sph0, c: W1, m: M4(0.15, 1.32, 0, 0, 0, -0.25, 0.08, 0.2, 0.06), ol: 0.03 },
        { geo: GEO.sph0, c: W1, m: M4(-0.38, 0.86, 0, 0, 0, 0.55, 0.08, 0.24, 0.08) },
        { geo: GEO.sph0, c: W1, m: M4(0.38, 0.86, 0, 0, 0, -0.55, 0.08, 0.24, 0.08) },
        { geo: GEO.sph0, c: ink, m: M4(-0.11, 1.0, 0.28, 0, 0, 0, 0.05, 0.06, 0.03) },
        { geo: GEO.sph0, c: ink, m: M4(0.11, 1.0, 0.28, 0, 0, 0, 0.05, 0.06, 0.03) },
        { geo: GEO.sph0, c: bl, m: M4(-0.19, 0.92, 0.26, 0, 0, 0, 0.06, 0.035, 0.02) },
        { geo: GEO.sph0, c: bl, m: M4(0.19, 0.92, 0.26, 0, 0, 0, 0.06, 0.035, 0.02) },
        { geo: GEO.sph0, c: W1, m: M4(0, 0.32, -0.33, 0, 0, 0, 0.13, 0.13, 0.13) },
      ]);
      const bulbGeo = GEO.sph2;
      // versioni lontane (LOD): una forma sola, senza contorno
      const far = {
        round: merge([{ geo: GEO.lo, c: W1, m: M4(0.3, 3.3, 0.1, 0, 0, 0, 2.5, 2.2, 2.4) }]).body,
        pine: merge([{ geo: GEO.cone, c: W1, m: M4(0, 3.3, 0, 0, 0, 0, 2.1, 5.2, 2.1) }]).body,
        bush: merge([{ geo: GEO.lo, c: W1, m: M4(0, 0.45, 0.3, 0, 0, 0, 0.95, 0.75, 1.3) }]).body,
      };
      TGc = {
        key: R3.scene.uuid, round, pine, bush, trunk, cap: capM.body, rockLine, critter, bulbGeo, far,
        trunkMat: toon({ color: C.trunk }), tintMat: toon({ vertexColors: true }), flowMat: toon({}),
        shaftMat: basic({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }),
      };
      return TGc;
    }
    const YAW = (th) => Math.atan2(Math.cos(th), -Math.sin(th));   // asse z locale = avanti lungo la strada, x locale = a sinistra
    const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

    // strisce della carreggiata per ambientazione: [d0, d1, colore, quota, colore alterno, periodo in tratti da 2 m]
    function roadStrips(th) {
      const H = P.HALF, WL = g.wall;
      if (th === 'city') return [[-WL, -H - 0.25, 'walk', 0.19, 'walk-2', 1], [-H - 0.25, -H, 'curb', 0.15, 'curb-2', 1], [-H, -H + 0.3, 'road', 0.07],
        [-H + 0.3, -H + 0.45, 'paint', 0.075], [-H + 0.45, -0.08, 'road', 0.07], [-0.08, 0.08, 'paint-2', 0.075, 'road', 1], [0.08, H - 0.45, 'road', 0.07],
        [H - 0.45, H - 0.3, 'paint', 0.075], [H - 0.3, H, 'road', 0.07], [H, H + 0.25, 'curb', 0.15, 'curb-2', 1], [H + 0.25, WL, 'walk', 0.19, 'walk-2', 1]];
      if (th === 'sea') return [[-H - 1.4, -H, 'verge', 0.03], [-H, -H + 0.3, 'road', 0.07], [-H + 0.3, -H + 0.45, 'paint', 0.075], [-H + 0.45, -0.07, 'road', 0.07],
        [-0.07, 0.07, 'paint', 0.075, 'road', 1], [0.07, H - 0.45, 'road', 0.07], [H - 0.45, H - 0.3, 'paint', 0.075], [H - 0.3, H, 'road', 0.07], [H, H + 1.4, 'verge', 0.03]];
      return [[-H - 1.6, -H, 'verge', 0.03], [-H, -2.1, 'dirt', 0.07], [-2.1, -1.2, 'dirt-2', 0.07], [-1.2, 1.2, 'dirt-3', 0.07], [1.2, 2.1, 'dirt-2', 0.07], [2.1, H, 'dirt', 0.07], [H, H + 1.6, 'verge', 0.03]];
    }

    /* blocco di scenario: strada, bordi, oggetti dell'ambientazione, archi, pubblico, luci */
    function buildChunk(ch) {
      if (ch.grp) return;
      const t0 = performance.now();
      const grp = new T.Group();
      const { a, b } = ch, HALF = P.HALF, th = cfg.theme, WL = g.wall, lit = R3.lit, KD = kinds();
      const r = HH.rng(((s.seed * 31) ^ (a * 2654435761)) >>> 0);
      const inBridge = (sv, m = 0) => g.bridges.some((q) => sv > q.s0 - m && sv < q.s1 + m);
      const inTunnel = (sv, m = 0) => g.tunnels.some((q) => sv > q.s0 - m && sv < q.s1 + m);
      // strada a strisce, con i bordi chiusi fino al terreno (nessuna fessura su curve paraboliche e colline)
      const strips = roadStrips(th);
      const pos = [], col = [];
      const push = (p, c) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); };
      // sezione trasversale: centro, normale e quota ai due bordi (in mezzo si interpola: la strada è piana di traverso)
      const XS = new Map();
      const sec = (sv) => {
        let q = XS.get(sv);
        if (q) return q;
        const w = P.world(g, sv, 0), nx = -Math.sin(w.th), ny = Math.cos(w.th), E = 9;
        const hl = roadH(sv, -E, w.x - nx * E, w.y - ny * E), hr = roadH(sv, E, w.x + nx * E, w.y + ny * E);
        q = { x: w.x, y: w.y, nx, ny, hl, hr };
        XS.set(sv, q);
        return q;
      };
      const pt = (sv, d, up) => { const q = sec(sv); return V3(q.x + q.nx * d, q.hl + (q.hr - q.hl) * (d + 9) / 18 + up, q.y + q.ny * d); };
      const quad = (A, B, Cc, D, c) => { push(A, c); push(Cc, c); push(B, c); push(Cc, c); push(D, c); push(B, c); };
      const wood = th === 'forest' || th === 'snow';
      for (let sv = a; sv < b; sv += 2) {
        const s2 = Math.min(b, sv + 2), seg = Math.floor(sv / 2);
        const ed = P.edgeAt(g, sv + 1), br = ed.kind === 'rail', tu = ed.kind === 'tube';
        const lim = br ? P.RAIL + 0.25 : tu ? P.TUBE : 99;
        let dMin = 0, dMax = 0, upMin = 0, upMax = 0;
        for (const [d00, d10, ck, up0, alt, per] of strips) {
          let d0 = Math.max(-lim, d00), d1 = Math.min(lim, d10);
          if (d1 <= d0 + 0.01) continue;
          let ckk = alt && Math.floor(seg / (per || 1)) % 2 ? alt : ck, up = up0;
          if (br && wood) { if (ck === 'verge') continue; ckk = seg % 2 ? 'wood' : 'wood-2'; up = 0.09; }
          else if (br && (ck === 'verge' || ck === 'walk')) { ckk = 'curb'; up = 0.12; d0 = Math.max(d0, -lim); d1 = Math.min(d1, lim); }
          else if (tu && ck === 'road') ckk = 'road-2';
          const c = C[ckk];
          quad(pt(sv, d0, up), pt(sv, d1, up), pt(s2, d0, up), pt(s2, d1, up), c);
          if (d0 < dMin) { dMin = d0; upMin = up; }
          if (d1 > dMax) { dMax = d1; upMax = up; }
        }
        // bordo verticale fino al terreno (non sui ponti)
        if (!br) for (const [d, up] of [[dMin, upMin], [dMax, upMax]]) {
          const A = pt(sv, d, up), B2 = pt(s2, d, up);
          const A2 = new T.Vector3(A.x, Math.min(A.y - 0.05, groundH(A.x, -A.z, d) - 0.35), A.z), B3 = new T.Vector3(B2.x, Math.min(B2.y - 0.05, groundH(B2.x, -B2.z, d) - 0.35), B2.z);
          const c = C[th === 'city' ? 'curb' : th === 'snow' ? 'snowbank' : 'verge'];
          if (d < 0) quad(A, A2, B2, B3, c); else quad(A, B2, A2, B3, c);
        }
      }
      const rg = keep(new T.BufferGeometry());
      rg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      rg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      rg.computeVertexNormals();
      grp.add(new T.Mesh(rg, R3.vc));
      const tRoad = performance.now();
      // oggetti fusi (colori nei vertici) e liste di istanze
      const parts = [], add = (geo, c, m, ol = 0) => parts.push({ geo, c, m, ol });
      const at = (sv, d, up = 0, rot = 0) => { const w = P.world(g, sv, d); const h = up === 'g' ? groundH(w.x, w.y) + 0.14 : roadH(sv, d, w.x, w.y) + up; return { x: w.x, h, z: -w.y, ry: YAW(w.th) + rot, th: w.th, wx: w.x, wy: w.y }; };
      const clearOf = (x, y, d) => clearPt(x, y, d);
      const L2 = { round: [], pine: [], bush: [], rock: [], flow: [], crit: [], win: [], bulb: [] };
      const halos = [], pools = [];
      // alone alla lampadina; pozza di luce (raggio pool) sul terreno a quota ph, nel punto px/pz (di solito sotto)
      const glowAt = (x, h, z, pool = 3.2, ph = 0, px = x, pz = z) => { if (!lit) return; halos.push(x, h, z); if (pool) pools.push(px, pz, pool, ph); };
      ctxC = { ch, grp, a, b, r, add, at, clearOf, L2, glowAt, inBridge, inTunnel, WL, HALF, lit, KD };

      bridgesAndTunnels(ctxC);
      edgeDecor(ctxC);
      if (th === 'forest') decorForest(ctxC);
      else if (th === 'city') decorCity(ctxC);
      else if (th === 'sea') decorSea(ctxC);
      else decorSnow(ctxC);
      obstacles(ctxC);
      arches(ctxC);
      chevrons(ctxC);
      const tDecor = performance.now();

      if (parts.length) { const mm = merge(parts); grp.add(meshOf(mm, R3.inkMat, R3.vc)); }
      const tMerge = performance.now();
      (R3.stat = R3.stat || []).push({ road: +(tRoad - t0).toFixed(1), decor: +(tDecor - tRoad).toFixed(1), merge: +(tMerge - tDecor).toFixed(1), parts: parts.length, verts: parts.reduce((n, q) => n + base(q.geo).n * (q.ol ? 2 : 1), 0), inst: Object.fromEntries(Object.entries(L2).map(([k, v]) => [k, v.length])), t: +(performance.now() - t0).toFixed(1) });
      // istanze
      // farGeo: versione lontana (LOD) che condivide matrici e colori; vicino si vede quella dettagliata col contorno
      ch.near = []; ch.far = [];
      const inst = (geo, mat, list, place, olGeo, tint, farGeo) => {
        if (!list.length) return null;
        const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4();
        list.forEach((it, i) => { place(m4, it); im.setMatrixAt(i, m4); if (tint) im.setColorAt(i, tint(it)); });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        grp.add(im);
        let ol = null;
        if (olGeo) { ol = new T.InstancedMesh(olGeo, R3.inkMat, list.length); ol.instanceMatrix = im.instanceMatrix; ol.boundingSphere = im.boundingSphere; grp.add(ol); }
        if (farGeo) {
          const fm = new T.InstancedMesh(farGeo, mat, list.length);
          fm.instanceMatrix = im.instanceMatrix; fm.instanceColor = im.instanceColor; fm.boundingSphere = im.boundingSphere; fm.visible = false;
          grp.add(fm);
          ch.near.push(im); if (ol) ch.near.push(ol); ch.far.push(fm);
        }
        return im;
      };
      const Q = new T.Quaternion(), UP = new T.Vector3(0, 1, 0), V = new T.Vector3(), S3 = new T.Vector3();
      // [x, y, scala, variante, (yaw)]: alberi con rotazione e altezza un po' diverse
      const placeTree = (m4, [x, y, k, q]) => m4.compose(V.set(x, groundH(x, y) + 0.1, -y), Q.setFromAxisAngle(UP, q * 6.28), S3.set(k, k * (0.9 + q * 0.3), k));
      const leaf = [C['leaf-1'], C['leaf-2'], C['leaf-3']], pin = [C.pine, C['pine-2']];
      const allTrees = L2.round.concat(L2.pine);
      inst(KD.trunk, KD.trunkMat, allTrees, placeTree);
      inst(KD.round.body, KD.tintMat, L2.round, placeTree, KD.round.line, (it) => it[4] || leaf[it[3] < 0.5 ? 0 : it[3] < 0.82 ? 1 : 2], KD.far.round);
      inst(KD.pine.body, KD.tintMat, L2.pine, placeTree, KD.pine.line, (it) => pin[it[3] < 0.6 ? 0 : 1], KD.far.pine);
      if (th === 'snow') inst(KD.cap, KD.tintMat, L2.pine, placeTree);
      // cespugli e cumuli di neve: [x, y, k, yaw, colore, alto]
      inst(KD.bush.body, KD.tintMat, L2.bush, (m4, [x, y, k, yaw, c, hk]) => m4.compose(V.set(x, groundH(x, y) + 0.08, -y), Q.setFromAxisAngle(UP, yaw), S3.set(k, k * (hk || 1), k * 1.3)), KD.bush.line, (it) => it[4], KD.far.bush);
      inst(GEO.sph, KD.flowMat, L2.flow, (m4, [x, y]) => m4.compose(V.set(x, groundH(x, y) + 0.36, -y), Q.identity(), S3.set(0.24, 0.2, 0.24)), null, (it) => [C['flower-1'], C['flower-2'], C['flower-3']][it[2]]);
      // rocce: [x, y, raggio, colore, ostacolo]: gli ostacoli girano solo in orizzontale (ingombro = raggio di collisione)
      inst(GEO.rock, KD.flowMat, L2.rock, (m4, [x, y, k, c, obst, h0]) => m4.compose(V.set(x, (h0 !== undefined ? h0 : groundH(x, y)) + 0.3 * k, -y), obst ? Q.setFromAxisAngle(UP, x) : Q.setFromEuler(new T.Euler(x, y, 0)), S3.set(k, k * 0.8, k)), KD.rockLine, (it) => it[3]);
      inst(KD.bulbGeo, R3.bulbMat, L2.bulb, (m4, [x, h, z, k]) => m4.compose(V.set(x, h, z), Q.identity(), S3.set(k, k, k)));
      inst(GEO.plane, R3.winMat, L2.win, (m4, [x, h, z, yaw, w, hh]) => m4.compose(V.set(x, h, z), Q.setFromAxisAngle(UP, yaw), S3.set(w, hh, 1)), null, (it) => it[6]);
      // animaletti e pubblico: saltellano (matrici aggiornate solo quando il blocco è vicino)
      if (L2.crit.length) {
        const list = L2.crit;
        const im = inst(KD.critter.body, KD.tintMat, list, (m4, [x, h, z, yaw, k]) => m4.compose(V.set(x, h, z), Q.setFromAxisAngle(UP, yaw), S3.set(k, k, k)), KD.critter.line, (it) => it[5]);
        const m4 = new T.Matrix4();
        R3.anim.push({ ch, fn(t) {
          for (let i = 0; i < list.length; i++) {
            const [x, h, z, yaw, k, , ph, amp] = list[i];
            const hop = Math.abs(Math.sin(t * (amp > 0.2 ? 7 : 4) + ph)) * amp;
            m4.compose(V.set(x, h + hop, z), Q.setFromAxisAngle(UP, yaw + Math.sin(t * 3 + ph) * 0.25), S3.set(k, k * (1 + hop * 0.15), k));
            im.setMatrixAt(i, m4);
          }
          im.instanceMatrix.needsUpdate = true;
        } });
      }
      // raggi di sole tra gli alberi (bosco di giorno)
      if (N.shafts > 0 && th === 'forest' && r() < 0.8) {
        const sp = [], sc = [], c = C.shaft;
        for (let i = 0; i < 3; i++) {
          const sv = a + r() * (b - a), side = r() < 0.5 ? -1 : 1, w = P.world(g, sv, side * (WL + 3 + r() * 8)), h = groundH(w.x, w.y);
          const wd = 0.7 + r() * 0.9, ox = 5 + r() * 3;
          const p0 = [w.x - wd, h, -w.y], p1 = [w.x + wd, h, -w.y], p2 = [w.x + wd * 1.8 + ox, h + 15, -w.y - 4], p3 = [w.x - wd * 1.8 + ox, h + 15, -w.y - 4];
          sp.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
          for (const al of [0.32, 0.32, 0, 0.32, 0, 0]) sc.push(c.r, c.g, c.b, al);
        }
        const sg = keep(new T.BufferGeometry());
        sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        sg.setAttribute('color', new T.Float32BufferAttribute(sc, 4));
        grp.add(new T.Mesh(sg, KD.shaftMat));
      }
      // luci della notte: aloni e pozze di luce
      if (halos.length) {
        const hg = keep(new T.BufferGeometry()); hg.setAttribute('position', new T.Float32BufferAttribute(halos, 3));
        const hp = new T.Points(hg, R3.haloMat); grp.add(hp);
      }
      if (pools.length) {
        const pp = [], uv = [];
        for (let i = 0; i < pools.length; i += 4) {
          const x = pools[i], z = pools[i + 1], rr = pools[i + 2], h = pools[i + 3] + 0.12;
          pp.push(x - rr, h, z - rr, x - rr, h, z + rr, x + rr, h, z - rr, x + rr, h, z - rr, x - rr, h, z + rr, x + rr, h, z + rr);
          uv.push(0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1);
        }
        const pg = keep(new T.BufferGeometry());
        pg.setAttribute('position', new T.Float32BufferAttribute(pp, 3));
        pg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
        grp.add(new T.Mesh(pg, R3.poolMat));
      }
      // centro e raggio per la visibilità
      let mx = 0, my = 0;
      for (let i = a; i <= b; i += 4) { mx += g.x[i]; my += g.y[i]; }
      const cnt = Math.floor((b - a) / 4) + 1;
      ch.x = mx / cnt; ch.y = my / cnt;
      ch.rad = 0;
      for (let i = a; i <= b; i += 4) ch.rad = Math.max(ch.rad, Math.hypot(g.x[i] - ch.x, g.y[i] - ch.y));
      ch.rad += 48;
      ch.grp = grp;
      R3.scene.add(grp);
      (R3.buildT = R3.buildT || []).push(+(performance.now() - t0).toFixed(1));   // diagnostica (QA): tempi di costruzione
    }
    let ctxC = null;

    /* ponti (ringhiere con la faccia interna a P.RAIL) e gallerie (pareti a P.TUBE) */
    function bridgesAndTunnels(K) {
      const { a, b, add, at, r, grp, glowAt, HALF } = K, th = cfg.theme;
      const woodC = th === 'forest' || th === 'snow';
      for (const q of g.bridges) {
        if (q.s1 < a || q.s0 >= b) continue;
        const postC = woodC ? C['wood-2'] : th === 'city' ? C.walk : C.paint, railC = woodC ? C.wood : th === 'city' ? C['walk-2'] : C.paint;
        for (const side of [-1, 1]) {
          const dd = side * (P.RAIL + 0.11);
          for (let sv = q.s0; sv <= q.s1; sv += 3) { const p = at(sv, dd, 0.5); add(GEO.box, postC, M4(p.x, p.h, p.z, 0, p.ry, 0, 0.22, 1.0, 0.22), 0.05); }
          for (let sv = q.s0; sv < q.s1; sv += 3) {
            const p0 = at(sv + 1.5, dd, 0.95);
            add(GEO.box, railC, M4(p0.x, p0.h, p0.z, 0, p0.ry, 0, 0.16, 0.16, 3.1), 0.05);
            if (!woodC) { const p1 = at(sv + 1.5, dd, 0.55); add(GEO.box, railC, M4(p1.x, p1.h, p1.z, 0, p1.ry, 0, 0.12, 0.12, 3.1), 0.04); }
            // trave sotto il bordo dell'impalcato
            const p2 = at(sv + 1.5, side * (P.RAIL + 0.1), -0.25);
            add(GEO.box, woodC ? C['wood-2'] : C.curb, M4(p2.x, p2.h, p2.z, 0, p2.ry, 0, 0.5, 0.5, 3.05), 0.04);
          }
          if (th !== 'forest' && th !== 'snow') { const pl = at((q.s0 + q.s1) / 2, side * (P.RAIL + 0.3), 1.6), pq = at((q.s0 + q.s1) / 2, side * 2.5, 0); add(GEO.cyl, C.lamp, M4(pl.x, pl.h, pl.z, 0, 0, 0, 0.08, 2.4, 0.08)); K.L2.bulb.push([pl.x, pl.h + 1.3, pl.z, 0.22]); glowAt(pl.x, pl.h + 1.3, pl.z, 3.2, pq.h, pq.x, pq.z); }
        }
        const m = (q.s0 + q.s1) / 2, w = P.world(g, m), base0 = P.height(g, w.x, w.y);
        const water = new T.Mesh(GEO.box, toon({ color: th === 'sea' ? C.sea : C.water }));
        water.position.set(w.x, isSea ? SEA_Y + 0.2 : base0 - 1.35, -w.y); water.rotation.y = YAW(w.th) + Math.PI / 2; water.scale.set(150, 0.1, 6.5);
        grp.add(water);
        if (th === 'city') for (const side of [-1, 1]) {
          // argini del canale
          const pc = P.world(g, m, 0);
          for (const off of [-3.6, 3.6]) {
            const cx = pc.x + Math.cos(w.th) * off, cy = pc.y + Math.sin(w.th) * off;
            add(GEO.box, C['walk-2'], M4(cx - Math.sin(w.th) * side * 30, base0 - 1.0, -(cy + Math.cos(w.th) * side * 30), 0, YAW(w.th) + Math.PI / 2, 0, 46, 1.6, 0.6));
          }
        }
      }
      for (const q of g.tunnels) {
        if (q.s1 < a || q.s0 >= b) continue;
        const wallC = th === 'city' ? C.curb : th === 'sea' ? C.cliff : C.rock, wall2 = th === 'city' ? C['bld-2'] : th === 'sea' ? C['cliff-2'] : C['rock-2'];
        const s0 = Math.max(q.s0, a), s1 = Math.min(q.s1, b);
        for (let sv = s0; sv < s1; sv += 2) {
          const ln = Math.min(2, s1 - sv);
          for (const side of [-1, 1]) {
            const p = at(sv + ln / 2, side * (P.TUBE + 0.3), 2.3);
            add(GEO.box, Math.floor(sv / 4) % 2 ? wallC : wall2, M4(p.x, p.h, p.z, 0, p.ry, 0, 0.6, 4.6, ln + 0.02), 0.03);
            const st = at(sv + ln / 2, side * (P.TUBE + 0.005), 0.9);
            add(GEO.box, C['curb-2'], M4(st.x, st.h, st.z, 0, st.ry, 0, 0.03, 0.22, ln + 0.02));
          }
          const c0 = at(sv + ln / 2, 0, 4.85);
          add(GEO.box, th === 'city' ? C.roof : C['rock-2'], M4(c0.x, c0.h, c0.z, 0, c0.ry, 0, 2 * (P.TUBE + 0.6), 0.5, ln + 0.02), 0.03);
          if (Math.floor(sv) % 6 < 2) { K.L2.bulb.push([c0.x, c0.h - 0.33, c0.z, 0.2]); glowAt(c0.x, c0.h - 0.4, c0.z, 0, 0); }
        }
        // portali con le strisce e collinetta sopra
        for (const [sv, inn] of [[q.s0, 1], [q.s1, -1]]) {
          if (sv < a || sv >= b) continue;
          for (let i = -4; i <= 4; i++) {
            const p = at(sv - inn * 0.3, i * ((P.TUBE + 0.6) / 4.5), 5.7);
            add(GEO.box, i % 2 ? C['tl-amber'] : C.ink, M4(p.x, p.h, p.z, 0, p.ry, 0, (P.TUBE + 0.6) / 4.5, 1.2, 0.5), 0.03);
          }
          // la collinetta sta tutta sopra il soffitto (il soffitto finisce a 5,1 m)
          const pm = at(sv + inn * 6, 0, 0);
          add(GEO.sph, th === 'city' ? C.plaza : th === 'snow' ? C.snowbank : C.grass, M4(pm.x, pm.h + 5.15 + 2.0, pm.z, 0, pm.ry, 0, P.TUBE + 3, 2.0, 7), 0.08);
        }
        // tetto erboso (o di roccia) per tutta la lunghezza
        for (let sv = s0; sv < s1; sv += 8) {
          const p = at(sv + 4, 0, 0);
          add(GEO.sph, th === 'city' ? C.plaza : th === 'snow' ? C.snowbank : C.cliff, M4(p.x, p.h + 5.15 + 1.5, p.z, 0, p.ry, 0, P.TUBE + 2.4, 1.5, 6), 0.06);
        }
      }
      void r; void HALF;
    }

    /* bordo morbido dell'ambientazione: la faccia interna di cespugli, transenne, staccionate, cumuli di neve e massi
       è esattamente a g.wall (dove la logica ferma il rettangolo dell'auto) */
    function edgeDecor(K) {
      const { a, b, r, add, at, L2, WL, inBridge, inTunnel, clearOf } = K, th = cfg.theme;
      const fence = { '-1': r() < 0.3 ? [a + r() * 60, 0] : null, '1': r() < 0.3 ? [a + r() * 60, 0] : null };
      for (const side of [-1, 1]) if (fence[side]) fence[side][1] = fence[side][0] + 30 + r() * 40;
      for (let sv = a; sv < b; sv += 2) {
        if (inBridge(sv, 2) || inTunnel(sv, 1)) continue;
        for (const side of [-1, 1]) {
          const ed = P.edgeAt(g, sv);
          if (ed.kind !== 'wall') continue;
          if (th === 'city') {
            // transenne morbide a cuscino lunghe 4 m, a colori alterni
            if (Math.floor(sv / 2) % 2) continue;
            const p = at(sv + 2, side * (WL + 0.27), 0.62);
            add(GEO.box, Math.floor(sv / 4) % 2 ? C['barrier-1'] : C['barrier-2'], M4(p.x, p.h, p.z, 0, p.ry, 0, 0.54, 0.86, 3.94), 0.04);
            continue;
          }
          if (th === 'sea' && side < 0) {
            // lato spiaggia: paletti di legno con la corda
            if (Math.floor(sv) % 4 === 0) { const p = at(sv, side * (WL + 0.1), 'g'); add(GEO.cyl, C.wood, M4(p.x, p.h + 0.5, p.z, 0, 0, 0, 0.1, 1.0, 0.1), 0.04); }
            const p = at(sv + 1, side * (WL + 0.06), 'g');
            add(GEO.box, C.sand, M4(p.x, p.h + 0.85, p.z, 0, p.ry, 0, 0.06, 0.06, 2.02));
            continue;
          }
          const f = fence[side];
          if (th === 'forest' && f && sv >= f[0] && sv < f[1]) {
            // staccionata di legno
            const p = at(sv + 1, side * (WL + 0.11), 'g');
            if (Math.floor(sv) % 4 === 0) add(GEO.box, C['wood-2'], M4(p.x, p.h + 0.55, p.z, 0, p.ry, 0, 0.22, 1.1, 0.22), 0.04);
            for (const hh of [0.45, 0.85]) add(GEO.box, C.wood, M4(p.x, p.h + hh, p.z, 0, p.ry, 0, 0.12, 0.14, 2.04), 0.03);
            continue;
          }
          if (r() > (th === "forest" ? 0.5 : 0.7)) continue;
          const k = 0.75 + r() * 0.45;
          if (th === 'sea' || (th === 'snow' && r() < 0.15)) {
            // massi della scogliera (lato terra): il raggio orizzontale è k
            const w = P.world(g, sv + 1, side * (WL + k));
            if (clearOf(w.x, w.y, WL + k - 0.01)) L2.rock.push([w.x, w.y, k, r() < 0.5 ? C.cliff : C['cliff-2']]);
            continue;
          }
          // cespuglio (o cumulo di neve): bolla principale larga 0,95 k verso la strada
          const w = P.world(g, sv + r(), side * (WL + 0.95 * k));
          if (clearOf(w.x, w.y, WL + 0.95 * k - 0.01)) L2.bush.push([w.x, w.y, k, YAW(w.th), th === 'snow' ? C.snowbank : C.bush, th === 'snow' ? 0.8 : 1]);
        }
      }
    }

    /* ostacoli all'interno delle curve (logica: cerchi di raggio rk.r): stessa misura nella grafica */
    function obstacles(K) {
      const { a, b, add, at, L2 } = K;
      for (const rk of g.rocks) {
        if (rk.s < a || rk.s >= b) continue;
        const w = P.world(g, rk.s, rk.d), p = at(rk.s, rk.d, 'g');
        if (rk.k === 'planter') {
          add(GEO.cyl, C['bld-6'], M4(p.x, p.h + 0.35, p.z, 0, 0, 0, rk.r, 0.7, rk.r), 0.05);
          add(GEO.cyl, C.trunk, M4(p.x, p.h + 0.71, p.z, 0, 0, 0, rk.r * 0.9, 0.04, rk.r * 0.9));
          for (let i = 0; i < 7; i++) { const an = i * 0.9; add(GEO.sph, [C['flower-1'], C['flower-2'], C['flower-3']][i % 3], M4(p.x + Math.cos(an) * rk.r * 0.55 * (i ? 1 : 0), p.h + 0.85, p.z + Math.sin(an) * rk.r * 0.55 * (i ? 1 : 0), 0, 0, 0, 0.2, 0.17, 0.2), 0.02); }
        } else if (rk.k === 'snowman') {
          snowman(add, p.x, p.h, p.z, rk.r, p.ry + Math.PI);
        } else L2.rock.push([w.x, w.y, rk.r, C.rock, 1]);
      }
    }
    function snowman(add, x, h, z, k, yaw) {
      add(GEO.sph, C.snowbank, M4(x, h + k * 0.8, z, 0, 0, 0, k, k * 0.85, k), 0.05);
      add(GEO.sph, C.snowbank, M4(x, h + k * 1.85, z, 0, 0, 0, k * 0.68, k * 0.62, k * 0.68), 0.05);
      add(GEO.sph, C.snowbank, M4(x, h + k * 2.6, z, 0, 0, 0, k * 0.46, k * 0.44, k * 0.46), 0.04);
      const fx = Math.sin(yaw), fz = Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw);
      for (const e of [-1, 1]) add(GEO.sph, C.eye, M4(x + fx * k * 0.4 + sx * e * k * 0.16, h + k * 2.68, z + fz * k * 0.4 + sz * e * k * 0.16, 0, 0, 0, 0.06, 0.07, 0.05));
      add(GEO.cone, C.carrot, M4(x + fx * k * 0.55, h + k * 2.56, z + fz * k * 0.55, Math.PI / 2, yaw, 0, 0.07, 0.36, 0.07), 0.02);
      add(GEO.cyl, C.scarf, M4(x, h + k * 2.2, z, 0, 0, 0, k * 0.5, 0.14, k * 0.5), 0.03);
      add(GEO.cyl, C['check-2'], M4(x, h + k * 3.05, z, 0, 0, 0, k * 0.3, k * 0.36, k * 0.3), 0.03);
      add(GEO.cyl, C['check-2'], M4(x, h + k * 2.88, z, 0, 0, 0, k * 0.46, 0.05, k * 0.46), 0.02);
    }

    /* archi di partenza, arrivo e checkpoint (piedi oltre il bordo), con un po' di pubblico */
    function arches(K) {
      const { a, b, add, at } = K;
      const list = [[P.PREROLL, 0], [P.PREROLL + s.L, 1]].concat(g.checks.map((c) => [c, 2]));
      for (const [sv, kind] of list) {
        if (sv < a || sv >= b) continue;
        const lim = P.edgeAt(g, sv).lim, span = lim + 0.35;
        if (kind < 2) {
          for (const side of [-1, 1]) { const p = at(sv, side * span, 2.4); add(GEO.cyl, C.pole, M4(p.x, p.h, p.z, 0, 0, 0, 0.18, 4.8, 0.18), 0.05); }
          const p = at(sv, 0, 4.7);
          add(GEO.box, C.ink, M4(p.x, p.h, p.z, 0, p.ry, 0, 2 * span + 0.4, 1.0, 0.22));
          const n = 16;
          for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
            const q = at(sv, -span + ((i + 0.5) * (2 * span)) / n, 4.45 + j * 0.45);
            add(GEO.box, (i + j) % 2 ? C['check-2'] : C['check-1'], M4(q.x, q.h, q.z, 0, q.ry, 0, (2 * span) / n, 0.44, 0.3));
          }
          if (kind === 1) for (const side of [-1, 1]) { const f = at(sv, side * span, 5.6); add(GEO.cone, C.flag, M4(f.x, f.h, f.z, 0, f.ry, side * 1.57, 0.4, 1.0, 0.2), 0.04); }
          // semafori decorativi alla partenza
          if (kind === 0) for (const side of [-1, 1]) {
            const tl = at(sv + 3, side * (span + 0.6), 'g');
            add(GEO.cyl, C.lamp, M4(tl.x, tl.h + 1.4, tl.z, 0, 0, 0, 0.08, 2.8, 0.08));
            add(GEO.box, C.lamp, M4(tl.x, tl.h + 3.2, tl.z, 0, tl.ry, 0, 0.5, 1.4, 0.4), 0.04);
            ['tl-red', 'tl-amber', 'tl-green'].forEach((c, i) => add(GEO.sph, C[c], M4(tl.x - Math.sin(tl.ry) * 0.21, tl.h + 3.62 - i * 0.42, tl.z - Math.cos(tl.ry) * 0.21, 0, 0, 0, 0.14, 0.14, 0.06)));
          }
        } else {
          // arco di palloncini
          const n = 17;
          for (let i = 0; i < n; i++) {
            const an = (i / (n - 1)) * Math.PI, q = at(sv, Math.cos(an) * span, 0.4 + Math.sin(an) * 5.4);
            add(GEO.sph, C['flag-' + ((i % 4) + 1)], M4(q.x, q.h, q.z, 0, 0, 0, 0.5, 0.56, 0.5), 0.04);
          }
        }
        // pubblico ai lati
        for (const side of [-1, 1]) stands(K, sv - 8 + (kind === 1 ? 4 : 0), side, 16);
      }
    }
    // tribunetta a gradoni dietro il bordo, con animaletti che tifano e bandierine
    function stands(K, s0, side, len) {
      const { add, at, L2, r, WL } = K;
      const lim = Math.max(WL, P.edgeAt(g, s0).lim);
      for (let sv = s0; sv < s0 + len; sv += 2) {
        const ed = P.edgeAt(g, sv);
        if (ed.kind !== 'wall') continue;
        for (let st = 0; st < 3; st++) {
          const d = side * (lim + 1.6 + st * 1.1), p = at(sv + 1, d, 'g');
          add(GEO.box, st % 2 ? C.stand : C['stand-2'], M4(p.x, p.h + 0.25 + st * 0.45, p.z, 0, p.ry, 0, 1.1, 0.5 + st * 0.9, 2.02), st ? 0 : 0.03);
          if (r() < 0.6) L2.crit.push([p.x, p.h + 0.5 + st * 0.9 + 0.02, p.z, p.ry - side * Math.PI / 2, 0.85 + r() * 0.25, C['fur-' + (1 + Math.floor(r() * 4))], r() * 6, 0.18]);
        }
      }
      // bandierine sopra la tribuna
      for (let sv = s0; sv < s0 + len; sv += 1.6) {
        const p = at(sv, side * (lim + 0.8), 'g');
        add(GEO.cone, C['flag-' + (1 + (Math.floor(sv / 1.6) % 4))], M4(p.x, p.h + 3.2, p.z, Math.PI, p.ry, 0, 0.32, 0.5, 0.06));
      }
      for (const e of [s0, s0 + len]) { const p = at(e, side * (lim + 0.8), 'g'); add(GEO.cyl, C.pole, M4(p.x, p.h + 1.7, p.z, 0, 0, 0, 0.07, 3.4, 0.07)); }
    }
    // cartelli a freccia all'esterno delle curve strette
    function chevrons(K) {
      const { a, b, add, at, WL } = K;
      for (const nt of g.notes) {
        if (nt.kind !== 'curve' || nt.g > 2 || nt.apex < a || nt.apex >= b) continue;
        for (const off of [-12, 0, 12]) {
          const sv = nt.apex + off;
          if (P.edgeAt(g, sv).kind !== 'wall') continue;
          const p = at(sv, -nt.dir * (WL + 0.7), 'g');
          add(GEO.box, C.ink, M4(p.x, p.h + 0.55, p.z, 0, p.ry, 0, 0.12, 1.1, 0.12));
          add(GEO.box, C.chevron, M4(p.x, p.h + 1.25, p.z, 0, p.ry, 0, 1.7, 0.8, 0.12), 0.05);
          for (const dy of [-0.18, 0.18]) add(GEO.box, C['chevron-2'], M4(p.x, p.h + 1.25 + dy, p.z, 0, p.ry, nt.dir * (dy > 0 ? -0.75 : 0.75), 0.13, 0.5, 0.16));
        }
      }
    }

    /* ---------- bosco: alberi, funghi (anche giganti), fiori, laghetti, staccionate, casette sugli alberi,
       animaletti che salutano, lanterne di carta la sera ---------- */
    function treesAlong(K, pinePct) {
      const { a, b, r, L2, WL, clearOf, inBridge, HALF, add, at } = K;
      for (let sv = a; sv < b; sv += 2.4) {
        for (const side of [-1, 1]) {
          const br = inBridge(sv, 6);
          // alberi a più file: la chioma (fino a 2,9 × scala) non arriva mai sopra la zona guidabile
          const dl = WL + 3 + Math.pow(r(), 1.5) * 32;
          if (r() < 0.8 - (dl - 10) / 70) {
            const k = 0.75 + r() * 0.6, q = r(), isPine = r() < pinePct;
            const w = P.world(g, sv + (r() - 0.5) * 2.4, side * dl);
            if (clearOf(w.x, w.y, WL + (isPine ? 2.2 : 2.9) * k)) (isPine ? L2.pine : L2.round).push([w.x, w.y, k, q]);
          }
          if (r() < 0.06) {
            const k = 0.8 + r() * 0.7, w = P.world(g, sv, side * (WL + 0.7 * k + 0.4 + r() * 2));
            if (clearOf(w.x, w.y, WL + 0.65 * k)) { const h = groundH(w.x, w.y) + 0.14; mushroom(add, w.x, h, -w.y, k); }
          }
          if (!br && r() < 0.16) { const w = P.world(g, sv, side * (HALF + 1.8 + r() * 2.4)); if (clearOf(w.x, w.y, HALF + 1.5)) L2.flow.push([w.x, w.y, Math.floor(r() * 3)]); }
          if (r() < 0.03) { const k = 0.6 + r() * 0.9, w = P.world(g, sv, side * (WL + 3 + r() * 10)); if (clearOf(w.x, w.y, WL + 2)) L2.rock.push([w.x, w.y, k, r() < 0.5 ? C.rock : C['rock-2']]); }
        }
      }
      void at;
    }
    function mushroom(add, x, h, z, k) {
      add(GEO.cyl, C.stem, M4(x, h + 0.35 * k, z, 0, 0, 0, 0.22 * k, 0.7 * k, 0.22 * k), 0.04);
      add(GEO.sph, C.cap, M4(x, h + 0.75 * k, z, 0, 0, 0, 0.62 * k, 0.4 * k, 0.62 * k), 0.05);
      for (let i = 0; i < 3; i++) { const a2 = i * 2.1 + x; add(GEO.sph, C['cap-dot'], M4(x + Math.cos(a2) * 0.36 * k, h + 0.98 * k, z + Math.sin(a2) * 0.36 * k, 0, 0, 0, 0.1 * k, 0.06 * k, 0.1 * k)); }
    }
    function pond(K, iceOk) {
      const { a, r, add, clearOf } = K;
      if (r() >= 0.26) return;
      const sv = a + 30 + r() * 60, side = r() < 0.5 ? -1 : 1, w = P.world(g, sv, side * (24 + r() * 10));
      if (!clearOf(w.x, w.y, 18)) return;
      const h = groundH(w.x, w.y) + 0.2, rr = 6 + r() * 4;
      add(GEO.cyl, C['water-2'], M4(w.x, h - 0.05, -w.y, 0, r() * 3, 0, rr + 0.8, 0.12, rr * 0.7 + 0.8));
      add(GEO.cyl, C.water, M4(w.x, h + 0.02, -w.y, 0, 0, 0, rr, 0.1, rr * 0.7));
      if (!iceOk) for (let i = 0; i < 3; i++) add(GEO.cyl, C['leaf-1'], M4(w.x + (r() - 0.5) * rr, h + 0.1, -w.y + (r() - 0.5) * rr * 0.6, 0, 0, 0, 0.9, 0.05, 0.9));
    }
    // animaletto su un ceppo che saltella e saluta, rivolto alla strada
    function critterAt(K, sv, side, onStump) {
      const { at, add, L2, WL, r } = K;
      if (P.edgeAt(g, sv).kind !== 'wall') return;
      const p = at(sv, side * (WL + 0.75), 'g');
      let h = p.h;
      if (onStump) { add(GEO.cyl, C.trunk, M4(p.x, h + 0.25, p.z, 0, 0, 0, 0.45, 0.5, 0.45), 0.04); h += 0.5; }
      L2.crit.push([p.x, h, p.z, p.ry - side * Math.PI / 2, 0.9 + r() * 0.3, C['fur-' + (1 + Math.floor(r() * 4))], r() * 6, 0.32]);
    }
    // lanterna di carta su un palo (accesa al tramonto e di notte)
    function lantern(K, sv, side) {
      const { at, add, L2, WL, glowAt, r } = K;
      if (P.edgeAt(g, sv).kind !== 'wall') return;
      const p = at(sv, side * (WL + 0.55), 'g'), q = at(sv, side * (WL + 0.25), 'g');
      add(GEO.cyl, C['wood-2'], M4(p.x, p.h + 1.2, p.z, 0, 0, 0, 0.07, 2.4, 0.07), 0.03);
      add(GEO.sph, C['flag-' + (1 + Math.floor(r() * 4))], M4(q.x, p.h + 2.05, q.z, 0, 0, 0, 0.26, 0.34, 0.26), 0.03);
      L2.bulb.push([q.x, p.h + 2.05, q.z, 0.12]);
      const pool = at(sv, side * (P.HALF - 0.2), 0);
      glowAt(q.x, p.h + 2.05, q.z, 2.8, pool.h, pool.x, pool.z);
    }
    function decorForest(K) {
      const { a, b, r, add, at, L2, WL, clearOf, lit } = K;
      treesAlong(K, cfg.stage === 'autumn' ? 0.35 : 0.42);
      pond(K, false);
      // funghi giganti lontano dalla strada
      for (let i = 0; i < 2; i++) {
        if (r() > 0.45) continue;
        const k = 1.5 + r() * 1.1, side = r() < 0.5 ? -1 : 1, w = P.world(g, a + r() * (b - a), side * (WL + 2.2 * k + 2 + r() * 14));
        if (!clearOf(w.x, w.y, WL + 2.2 * k + 1)) continue;
        const h = groundH(w.x, w.y) + 0.1, x = w.x, z = -w.y;
        add(GEO.cyl, C.stem, M4(x, h + 1.3 * k, z, 0, 0, 0, 0.42 * k, 2.6 * k, 0.42 * k), 0.06);
        add(GEO.sph, C.cap, M4(x, h + 2.8 * k, z, 0, 0, 0, 2.0 * k, 1.1 * k, 2.0 * k), 0.1);
        for (let j = 0; j < 6; j++) { const an = j * 1.05 + x; add(GEO.sph, C['cap-dot'], M4(x + Math.cos(an) * 1.25 * k, h + 3.45 * k, z + Math.sin(an) * 1.25 * k, 0, 0, 0, 0.32 * k, 0.16 * k, 0.32 * k)); }
        // finestrella e porticina nel gambo (casetta-fungo)
        add(GEO.box, C['wood-2'], M4(x + 0.42 * k, h + 0.5 * k, z, 0, 0, 0, 0.1, 1.0 * k, 0.55 * k));
        L2.win.push([x + 0.44 * k, h + 1.7 * k, z, Math.PI / 2, 0.4 * k, 0.4 * k, lit ? C['win-on'] : C.win]);
      }
      // casetta sull'albero
      if (r() < 0.2) {
        const side = r() < 0.5 ? -1 : 1, sv = a + 20 + r() * 80, d = side * (WL + 7 + r() * 10), w = P.world(g, sv, d);
        if (clearOf(w.x, w.y, WL + 6)) {
          const h = groundH(w.x, w.y) + 0.1, x = w.x, z = -w.y, ry = YAW(w.th) - side * Math.PI / 2;
          add(GEO.cyl, C.trunk, M4(x, h + 3.2, z, 0, 0, 0, 0.5, 6.4, 0.5), 0.05);
          for (const [ox, oy, oz, k] of [[0, 8.2, 0, 2.6], [1.6, 7.2, 0.8, 1.7], [-1.5, 7.4, -0.6, 1.8]]) add(GEO.sph, C['leaf-1'], M4(x + ox, h + oy, z + oz, 0, 0, 0, k, k * 0.85, k), 0.12);
          add(GEO.cyl, C['wood-2'], M4(x, h + 3.6, z, 0, 0, 0, 2.0, 0.22, 2.0), 0.05);
          add(GEO.box, C.wood, M4(x, h + 4.6, z, 0, ry, 0, 1.9, 1.8, 1.7), 0.05);
          add(GEO.prism, C.cap, M4(x, h + 5.5 + 0.45, z, 0, ry, 0, 2.3, 0.9, 1.25), 0.05);
          const fx = Math.sin(ry), fz = Math.cos(ry);
          L2.win.push([x + fx * 0.87, h + 4.7, z + fz * 0.87, ry, 0.6, 0.6, lit ? C['win-on'] : C.win]);
          for (const e of [-0.3, 0.3]) add(GEO.box, C['wood-2'], M4(x + fx * 1.6 + Math.cos(ry) * e, h + 1.8, z + fz * 1.6 - Math.sin(ry) * e, 0.25, ry, 0, 0.08, 3.8, 0.08));
          for (let j = 0; j < 6; j++) add(GEO.box, C.wood, M4(x + fx * (1.5 - j * 0.04), h + 0.5 + j * 0.6, z + fz * (1.5 - j * 0.04), 0.25, ry, 0, 0.66, 0.06, 0.08));
        }
      }
      // animaletti che salutano dal bordo
      const nc = r() < 0.55 ? 1 + Math.floor(r() * 2) : 0;
      for (let i = 0; i < nc; i++) critterAt(K, a + 10 + r() * 100, r() < 0.5 ? -1 : 1, true);
      // lanterne di carta (tramonto e notte)
      if (lit) for (let sv = a + 10; sv < b; sv += 30) lantern(K, sv, Math.floor(sv / 30) % 2 ? 1 : -1);
      void at;
    }

    /* ---------- città: palazzi colorati con finestre (accese la sera), negozi con tende e insegne, vie laterali con
       strisce pedonali e semafori decorativi, lampioni, alberi, pubblico ---------- */
    function decorCity(K) {
      const { a, b, r, add, at, L2, WL, clearOf, inBridge, inTunnel, lit, glowAt } = K;
      const BC = ['bld-1', 'bld-2', 'bld-3', 'bld-4', 'bld-5', 'bld-6'];
      const winC = () => (lit ? (r() < 0.72 ? C['win-on'] : C['win-off']) : C.win);
      for (const side of [-1, 1]) {
        let sv = a + r() * 4;
        while (sv < b - 4) {
          const w = 7 + r() * 6, mid = sv + w / 2;
          if (inBridge(mid, w / 2 + 5) || inTunnel(mid, w / 2 + 6) || P.edgeAt(g, mid).kind !== 'wall') { sv += 4; continue; }
          const d0 = WL + 2.2;
          if (r() < 0.12) { sideStreet(K, mid, side); sv += 9; continue; }
          const dep = 6 + r() * 5, hgt = 6 + r() * 9;
          const cs = [[sv, d0], [sv + w, d0], [sv, d0 + dep], [sv + w, d0 + dep], [mid, d0 + dep / 2]].map(([q, d]) => P.world(g, q, side * d));
          if (!cs.every((c) => clearOf(c.x, c.y, WL + 1.6))) { sv += 4; continue; }
          const c0 = at(mid, side * (d0 + dep / 2), 'g'), base0 = Math.min(...cs.map((c) => groundH(c.x, c.y))) - 0.4;
          const yawF = c0.ry - side * Math.PI / 2;   // verso la strada
          const ax = Math.cos(c0.ry), az = -Math.sin(c0.ry), fx = Math.sin(c0.ry), fz = Math.cos(c0.ry);   // x locale (sinistra) e z locale (avanti)
          const top = c0.h + hgt;
          const colB = C[pick(r, BC)];
          add(GEO.box, colB, M4(c0.x, (base0 + top) / 2, c0.z, 0, c0.ry, 0, dep, top - base0, w), 0.06);
          roof(add, r, c0.x, top, c0.z, c0.ry, dep, w);
          // facciata verso la strada: x locale = −side
          const fxo = -side * (dep / 2 + 0.03);
          const fpt = (u, y) => [c0.x + ax * fxo + fx * u, y, c0.z + az * fxo + fz * u];
          const ncol = Math.max(1, Math.floor((w - 1.2) / 2.3));
          const floors = Math.floor(hgt / 3);
          for (let f = 1; f < floors; f++) for (let cI = 0; cI < ncol; cI++) {
            const u = (cI - (ncol - 1) / 2) * 2.3, [x, y, z] = fpt(u, c0.h + 1.6 + f * 3);
            L2.win.push([x, y, z, yawF, 1.1, 1.4, winC()]);
          }
          // negozio al pianterreno: vetrina, porta, tenda a righe e insegna
          const shopC = pick(r, ['awn-1', 'awn-3', 'flag-4', 'flag-3']);
          { const [x, y, z] = fpt(-w * 0.18, c0.h + 1.3); L2.win.push([x, y, z, yawF, w * 0.4, 1.5, lit ? C['win-on'] : C.win]); }
          { const [x, y, z] = fpt(w * 0.25, c0.h + 1.0); add(GEO.box, C['win-off'], M4(x, y, z, 0, c0.ry, 0, 0.08, 2.0, 1.1)); }
          const nA = Math.min(7, Math.max(3, Math.floor(w * 0.5)) | 1);
          for (let j = 0; j < nA; j++) {
            const u = -w * 0.425 + (j + 0.5) * (w * 0.85 / nA), [x, , z] = fpt(u, 0);
            const ox = -side * 0.6;
            add(GEO.box, j % 2 ? C[shopC] : C['awn-2'], M4(x + ax * ox, c0.h + 2.75, z + az * ox, 0, c0.ry, side * 0.35, 1.25, 0.08, w * 0.85 / nA + 0.01));
          }
          { const [x, , z] = fpt(0, 0); add(GEO.box, C.sign, M4(x, c0.h + 3.7, z, 0, c0.ry, 0, 0.16, 0.8, w * 0.5), 0.04);
            const ix = x + ax * (-side * 0.1), iz = z + az * (-side * 0.1);
            add(GEO.sph, C[pick(r, ['gift-1', 'gift-2', 'gift-3', 'carrot', 'acorn'])], M4(ix, c0.h + 3.7, iz, 0, 0, 0, 0.12, 0.32, 0.32)); }
          // seconda fila più alta, dietro
          const d1 = d0 + dep + 2 + r() * 3, dep2 = 7 + r() * 5, h2 = hgt + 6 + r() * 14;
          const c2 = at(mid, side * (d1 + dep2 / 2), 'g'), cc2 = P.world(g, mid, side * (d1 + dep2 / 2));
          if (clearOf(cc2.x, cc2.y, WL + 6)) {
            const top2 = c2.h + h2;
            add(GEO.box, C[pick(r, BC)], M4(c2.x, (base0 + top2) / 2, c2.z, 0, c2.ry, 0, dep2, top2 - base0, w * 0.92), 0.06);
            roof(add, r, c2.x, top2, c2.z, c2.ry, dep2, w * 0.92);
            const fxo2 = -side * (dep2 / 2 + 0.03), ax2 = Math.cos(c2.ry), az2 = -Math.sin(c2.ry), fx2 = Math.sin(c2.ry), fz2 = Math.cos(c2.ry);
            for (let f = Math.ceil((hgt + 1) / 3); f < Math.floor(h2 / 3); f++) for (let cI = 0; cI < ncol; cI++) {
              const u = (cI - (ncol - 1) / 2) * 2.3;
              L2.win.push([c2.x + ax2 * fxo2 + fx2 * u, c2.h + 1.6 + f * 3, c2.z + az2 * fxo2 + fz2 * u, c2.ry - side * Math.PI / 2, 1.1, 1.4, winC()]);
            }
          }
          sv += w + 0.6 + r() * 1.5;
        }
      }
      // lampioni sul marciapiede dietro le transenne, col braccio sopra il marciapiede (a 5 m d'altezza)
      for (let sv = a + 6; sv < b; sv += 26) {
        const side = Math.floor(sv / 26) % 2 ? 1 : -1;
        if (P.edgeAt(g, sv).kind !== 'wall') continue;
        streetLamp(K, sv, side, C.lamp);
      }
      // pubblico che tifa
      if (r() < 0.3) stands(K, a + 20 + r() * 70, r() < 0.5 ? -1 : 1, 14);
      void lit; void glowAt;
    }
    function roof(add, r, x, top, z, ry, dep, w) {
      const t = r();
      if (t < 0.45) {
        add(GEO.box, C.roof, M4(x, top + 0.15, z, 0, ry, 0, dep + 0.3, 0.3, w + 0.3), 0.04);
        if (r() < 0.5) { const ox = (r() - 0.5) * dep * 0.4; add(GEO.cyl, C['roof-2'], M4(x + Math.cos(ry) * ox, top + 1.1, z - Math.sin(ry) * ox, 0, 0, 0, 0.8, 1.6, 0.8), 0.04); add(GEO.cone, C.roof, M4(x + Math.cos(ry) * ox, top + 2.2, z - Math.sin(ry) * ox, 0, 0, 0, 0.95, 0.6, 0.95), 0.03); }
      } else if (t < 0.85) {
        const rh = 1.4 + r() * 1.6;
        add(GEO.prism, r() < 0.5 ? C.roof : C['roof-2'], M4(x, top + rh / 3, z, 0, ry, 0, dep + 0.4, rh / 1.5, (w + 0.4) / 1.73), 0.05);
      } else add(GEO.sph, C['roof-2'], M4(x, top, z, 0, ry, 0, dep * 0.4, dep * 0.35, w * 0.32), 0.05);
    }
    function streetLamp(K, sv, side, colPole) {
      const { at, add, L2, WL, glowAt } = K;
      const p = at(sv, side * (WL + 0.75), 'g'), arm = at(sv, side * (WL - 0.2), 'g');
      add(GEO.cyl, colPole, M4(p.x, p.h + 2.6, p.z, 0, 0, 0, 0.09, 5.2, 0.09), 0.03);
      add(GEO.box, colPole, M4((p.x + arm.x) / 2, p.h + 5.15, (p.z + arm.z) / 2, 0, p.ry, 0, 0.95, 0.08, 0.08), 0.02);
      add(GEO.box, colPole, M4(arm.x, p.h + 5.05, arm.z, 0, p.ry, 0, 0.46, 0.18, 0.3), 0.03);
      L2.bulb.push([arm.x, p.h + 4.92, arm.z, 0.16]);
      const pool = at(sv, side * (P.HALF - 0.4), 0);
      glowAt(arm.x, p.h + 4.9, arm.z, 4.2, pool.h, pool.x, pool.z);
    }
    function sideStreet(K, mid, side) {
      const { at, add, WL, L2 } = K;
      const p = at(mid, side * (WL + 9), 'g');
      add(GEO.box, C.road, M4(p.x, p.h + 0.05, p.z, 0, p.ry, 0, 16, 0.1, 6), 0);
      // strisce pedonali sulla strada principale e semaforo decorativo all'angolo
      for (let i = -3; i <= 3; i++) { const q = at(mid + i * 0.85, 0, 0.078); add(GEO.box, C.paint, M4(q.x, q.h, q.z, 0, q.ry, 0, 2 * P.HALF - 1.2, 0.01, 0.45)); }
      const tl = at(mid - 4, side * (WL + 0.9), 'g');
      add(GEO.cyl, C.lamp, M4(tl.x, tl.h + 1.6, tl.z, 0, 0, 0, 0.08, 3.2, 0.08), 0.02);
      add(GEO.box, C.lamp, M4(tl.x, tl.h + 3.5, tl.z, 0, tl.ry, 0, 0.42, 1.25, 0.36), 0.04);
      const f = -0.2;
      ['tl-red', 'tl-amber', 'tl-green'].forEach((c, i) => add(GEO.sph, C[c], M4(tl.x + Math.sin(tl.ry) * f, tl.h + 3.88 - i * 0.38, tl.z + Math.cos(tl.ry) * f, 0, 0, 0, 0.13, 0.13, 0.06)));
      // un alberello nella piazzetta
      const tw = P.world(g, mid + 5, side * (WL + 4));
      L2.round.push([tw.x, tw.y, 0.6, 0.3]);
    }

    /* ---------- mare: spiaggia con ombrelloni, asciugamani, cabine e castelli di sabbia, palme, scogliere e casette
       bianche dal lato della terra, faro, porticciolo con le barche, lampioni sul lungomare ---------- */
    function decorSea(K) {
      const { a, b, r, add, at, L2, WL, clearOf, inBridge, lit } = K;
      const sea = -1, land = 1;
      for (let sv = a; sv < b; sv += 3) {
        if (inBridge(sv, 8)) continue;
        // ombrelloni e asciugamani sulla spiaggia
        if (r() < 0.32) {
          const d = WL + 3 + r() * 14, w = P.world(g, sv, sea * d);
          if (clearOf(w.x, w.y, WL + 2.2) && sdist(w.x, w.y) < -WL) {
            const h = groundH(w.x, w.y) + 0.1, x = w.x, z = -w.y, uc = C[pick(r, ['umb-1', 'umb-2', 'umb-3'])];
            add(GEO.cyl, C.paint, M4(x, h + 1.15, z, 0, 0, 0, 0.05, 2.3, 0.05));
            add(GEO.cone, uc, M4(x, h + 2.35, z, 0, 0, 0, 1.45, 0.55, 1.45), 0.05);
            add(GEO.sph, C.paint, M4(x, h + 2.66, z, 0, 0, 0, 0.1, 0.1, 0.1));
            add(GEO.box, C[pick(r, ['flag-1', 'flag-2', 'flag-3', 'flag-4'])], M4(x + 1.2, h + 0.03, z + 0.4, 0, r() * 3, 0, 0.9, 0.04, 1.8));
          }
        }
        if (r() < 0.05) {
          // castello di sabbia o pallone
          const w = P.world(g, sv, sea * (WL + 2 + r() * 8));
          if (clearOf(w.x, w.y, WL + 1.5)) {
            const h = groundH(w.x, w.y), x = w.x, z = -w.y;
            if (r() < 0.5) { add(GEO.cyl, C.sand, M4(x, h + 0.25, z, 0, 0, 0, 0.6, 0.5, 0.6), 0.03); for (let i = 0; i < 4; i++) add(GEO.cone, C['sand-2'], M4(x + Math.cos(i * 1.57) * 0.45, h + 0.75, z + Math.sin(i * 1.57) * 0.45, 0, 0, 0, 0.18, 0.5, 0.18), 0.02); }
            else add(GEO.sph, C[pick(r, ['umb-1', 'umb-2', 'umb-3'])], M4(x, h + 0.35, z, 0, 0, 0, 0.35, 0.35, 0.35), 0.03);
          }
        }
        // palme (dalle due parti, le foglie in alto)
        if (r() < 0.12) {
          const side = r() < 0.6 ? sea : land, w = P.world(g, sv, side * (WL + 2.6 + r() * 9));
          if (clearOf(w.x, w.y, WL + 2.4)) palm(add, r, w.x, groundH(w.x, w.y), -w.y);
        }
        // scogliera dal lato della terra
        if (r() < 0.16) {
          const k = 2 + r() * 4, w = P.world(g, sv, land * (WL + k + 4 + r() * 18));
          if (clearOf(w.x, w.y, WL + k + 2)) L2.rock.push([w.x, w.y, k, r() < 0.5 ? C.cliff : C['cliff-2']]);
        }
        // casette bianche sul pendio
        if (r() < 0.05) {
          const d = WL + 10 + r() * 14, w = P.world(g, sv, land * d);
          if (clearOf(w.x, w.y, WL + 8)) {
            const h = groundH(w.x, w.y), x = w.x, z = -w.y, ry = YAW(w.th), hh = 3 + r() * 2;
            add(GEO.box, C.paint, M4(x, h + hh / 2 - 0.5, z, 0, ry, 0, 4, hh + 1, 4.5), 0.05);
            if (r() < 0.5) add(GEO.sph, C['boat-2'], M4(x, h + hh - 0.5, z, 0, 0, 0, 1.6, 1.4, 1.6), 0.05);
            else add(GEO.box, C['boat-2'], M4(x, h + hh - 0.4, z, 0, ry, 0, 4.3, 0.25, 4.8), 0.04);
            L2.win.push([x + Math.cos(ry) * -2.04, h + hh - 1.6, z + Math.sin(ry) * 2.04, ry - Math.PI / 2, 0.9, 1.1, lit ? C['win-on'] : C['boat-2']]);
          }
        }
      }
      // lampioni sul lungomare (lato terra)
      for (let sv = a + 12; sv < b; sv += 30) if (P.edgeAt(g, sv).kind === 'wall') streetLamp(K, sv, land, C.paint);
      // cabine da spiaggia a righe
      if (r() < 0.4) {
        const sv0 = a + 15 + r() * 70;
        for (let i = 0; i < 4; i++) {
          const w = P.world(g, sv0 + i * 3.2, sea * (WL + 16));
          if (!clearOf(w.x, w.y, WL + 13)) continue;
          const h = groundH(w.x, w.y), x = w.x, z = -w.y, ry = YAW(w.th), cc = C[pick(r, ['umb-1', 'umb-2', 'umb-3', 'flag-4'])];
          add(GEO.box, cc, M4(x, h + 1.1, z, 0, ry, 0, 2.2, 2.4, 2.4), 0.05);
          add(GEO.box, C.paint, M4(x + Math.cos(ry) * 1.11, h + 1.1, z - Math.sin(ry) * 1.11, 0, ry, 0, 0.02, 2.4, 0.6));
          add(GEO.prism, C.paint, M4(x, h + 2.3 + 0.35, z, 0, ry + Math.PI / 2, 0, 2.7, 0.7, 1.55), 0.04);
        }
      }
      // faro e porticciolo: uno per tappa
      const sL = Math.round(g.S0 + g.L * 0.45), sH = Math.round(g.S0 + g.L * 0.72);
      if (sL >= a && sL < b) lighthouse(K, sL);
      if (sH >= a && sH < b) harbour(K, sH);
      // gabbiani che tifano sui paletti? no: animaletti in spiaggia
      if (r() < 0.35) critterAt(K, a + 10 + r() * 100, land, true);
    }
    function palm(add, r, x, h, z) {
      let px = x, pz = z, py = h;
      const lean = r() * 6.28, dx = Math.cos(lean) * 0.22, dz = Math.sin(lean) * 0.22;
      for (let i = 0; i < 5; i++) {
        add(GEO.cyl, i % 2 ? C.palm : C.trunk, M4(px, py + 0.55, pz, 0, 0, 0, 0.22 - i * 0.015, 1.15, 0.22 - i * 0.015), 0.03);
        px += dx * (i + 1) * 0.3; pz += dz * (i + 1) * 0.3; py += 1.1;
      }
      for (let i = 0; i < 7; i++) {
        const an = (i / 7) * 6.28 + lean;
        add(GEO.sph, C['palm-leaf'], M4(px + Math.cos(an) * 1.1, py + 0.05, pz + Math.sin(an) * 1.1, 0, -an, 0.35, 1.25, 0.09, 0.32), 0.04);
      }
      for (let i = 0; i < 2; i++) add(GEO.sph, C['acorn-cap'], M4(px + (i - 0.5) * 0.3, py - 0.2, pz + 0.15, 0, 0, 0, 0.17, 0.17, 0.17), 0.02);
    }
    function lighthouse(K, sv) {
      const { add, WL, grp, glowAt, lit, clearOf } = K;
      for (const dd of [26, 34, 20, 42]) {
        const w = P.world(g, sv, -(WL + dd));
        if (!clearOf(w.x, w.y, WL + dd - 6)) continue;
        const h = Math.max(groundH(w.x, w.y), SEA_Y), x = w.x, z = -w.y;
        add(GEO.rock, C.cliff, M4(x, h + 0.4, z, 0, 0.4, 0, 4.2, 2.4, 4.2), 0.08);
        for (let i = 0; i < 6; i++) add(GEO.cyl, i % 2 ? C['light-2'] : C['light-1'], M4(x, h + 2.4 + i * 2.2, z, 0, 0, 0, 1.75 - i * 0.08, 2.2, 1.75 - i * 0.08), i ? 0 : 0.05);
        const top = h + 2.4 + 6 * 2.2 - 1.1;
        add(GEO.cyl, C['light-1'], M4(x, top + 0.15, z, 0, 0, 0, 2.0, 0.3, 2.0), 0.05);
        add(GEO.cyl, C.glass, M4(x, top + 1.0, z, 0, 0, 0, 1.0, 1.4, 1.0), 0.04);
        add(GEO.cone, C['light-2'], M4(x, top + 2.3, z, 0, 0, 0, 1.4, 1.2, 1.4), 0.05);
        add(GEO.sph, C['light-1'], M4(x, top + 3.0, z, 0, 0, 0, 0.25, 0.25, 0.25), 0.03);
        K.L2.bulb.push([x, top + 1.0, z, 0.55]);
        if (lit) {
          glowAt(x, top + 1.0, z, 0);
          // fascio di luce che gira
          const beam = new T.Mesh(keep(new T.ConeGeometry(4, 70, 12, 1, true)), basic({ color: C.glow, transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
          beam.geometry.translate(0, -35, 0); beam.rotation.z = Math.PI / 2;
          const bg = new T.Group(); bg.position.set(x, top + 1.0, z); bg.add(beam); grp.add(bg);
          R3.anim.push({ ch: null, fn(t) { bg.rotation.y = t * 0.8; } });
        }
        return;
      }
    }
    function harbour(K, sv) {
      const { add, WL, grp, r, clearOf } = K;
      const w0 = P.world(g, sv, -(WL + 3));
      if (!clearOf(P.world(g, sv, -(WL + 20)).x, P.world(g, sv, -(WL + 20)).y, WL + 14)) return;
      const yaw = YAW(w0.th) + Math.PI / 2;    // il molo va verso il mare (perpendicolare alla strada)
      const ox = Math.sin(yaw), oz = Math.cos(yaw);   // direzione del molo in three
      const x0 = w0.x, z0 = -w0.y, h = Math.max(SEA_Y + 0.6, groundH(w0.x, w0.y) + 0.2);
      for (let i = 0; i < 8; i++) {
        const x = x0 + ox * (i * 3 + 1.5), z = z0 + oz * (i * 3 + 1.5);
        add(GEO.box, i % 2 ? C.wood : C['wood-2'], M4(x, h, z, 0, yaw, 0, 3, 0.25, 3.02), 0.03);
        for (const e of [-1.4, 1.4]) add(GEO.cyl, C['wood-2'], M4(x + Math.cos(yaw) * e, h - 1, z - Math.sin(yaw) * e, 0, 0, 0, 0.15, 2.2, 0.15));
      }
      // barche che dondolano
      const bp = [];
      for (let i = 0; i < 4; i++) {
        const along = 6 + i * 5.5, e = (i % 2 ? 1 : -1) * 3.6;
        const x = x0 + ox * along + Math.cos(yaw) * e, z = z0 + oz * along - Math.sin(yaw) * e, hy = SEA_Y + 0.35;
        const hc = C[pick(r, ['boat', 'umb-1', 'boat-2', 'umb-3'])];
        bp.push({ geo: GEO.box, c: hc, m: M4(x, hy, z, 0, yaw, 0, 1.6, 0.7, 4), ol: 0.05 });
        bp.push({ geo: GEO.cone, c: hc, m: M4(x + ox * 2.4, hy, z + oz * 2.4, Math.PI / 2, yaw, 0, 0.8, 1.0, 0.36), ol: 0.04 });
        bp.push({ geo: GEO.box, c: C.boat, m: M4(x - ox * 0.6, hy + 0.65, z - oz * 0.6, 0, yaw, 0, 1.1, 0.6, 1.4), ol: 0.04 });
        bp.push({ geo: GEO.cyl, c: C['wood-2'], m: M4(x + ox * 0.6, hy + 2.3, z + oz * 0.6, 0, 0, 0, 0.06, 3.6, 0.06) });
        bp.push({ geo: GEO.cone, c: C.sail, m: M4(x + ox * 1.2, hy + 2.3, z + oz * 1.2, 0, yaw + Math.PI / 2, 0, 1.0, 3.0, 0.08), ol: 0.03 });
      }
      const bg = meshOf(merge(bp), R3.inkMat, R3.vc);
      grp.add(bg);
      R3.anim.push({ ch: ctxC && ctxC.ch, fn(t) { bg.position.y = Math.sin(t * 1.3) * 0.12; bg.rotation.z = Math.sin(t * 0.9) * 0.004; } });
    }

    /* ---------- neve: pini col cappuccio bianco, cumuli ai bordi, chalet con le finestre accese, pupazzi di neve,
       lanterne, laghetto ghiacciato ---------- */
    function decorSnow(K) {
      const { a, b, r, add, L2, WL, clearOf, lit } = K;
      treesAlong(K, 0.75);
      pond(K, true);
      for (let i = 0; i < 2; i++) {
        if (r() > 0.35) continue;
        const side = r() < 0.5 ? -1 : 1, w = P.world(g, a + r() * (b - a), side * (WL + 9 + r() * 12));
        if (!clearOf(w.x, w.y, WL + 7)) continue;
        const h = groundH(w.x, w.y), x = w.x, z = -w.y, ry = YAW(w.th), wd = 5 + r() * 2;
        add(GEO.box, C.chalet, M4(x, h + 1.6, z, 0, ry, 0, 4.6, 3.6, wd), 0.06);
        add(GEO.prism, C['chalet-roof'], M4(x, h + 3.4 + 0.75, z, 0, ry, 0, 5.4, 1.5, (wd + 0.8) / 1.73), 0.06);
        add(GEO.prism, C.snowbank, M4(x, h + 3.55 + 0.75, z, 0, ry, 0, 5.2, 1.4, (wd + 0.6) / 1.73));
        add(GEO.box, C['rock-2'], M4(x + Math.cos(ry) * 1, h + 5, z - Math.sin(ry) * 1, 0, ry, 0, 0.6, 1.6, 0.6), 0.04);
        const fs = -side * 2.32;
        for (const u of [-1.4, 1.4]) L2.win.push([x + Math.cos(ry) * fs + Math.sin(ry) * u, h + 2, z - Math.sin(ry) * fs + Math.cos(ry) * u, ry - side * Math.PI / 2, 0.9, 0.9, lit ? C['win-on'] : C.win]);
      }
      for (let i = 0; i < 2; i++) {
        if (r() > 0.4) continue;
        const k = 0.7 + r() * 0.3, side = r() < 0.5 ? -1 : 1, sv = a + r() * (b - a), w = P.world(g, sv, side * (WL + k + 0.4 + r() * 4));
        if (P.edgeAt(g, sv).kind === 'wall' && clearOf(w.x, w.y, WL + k)) snowman(add, w.x, groundH(w.x, w.y) + 0.1, -w.y, k, YAW(w.th) - side * Math.PI / 2);
      }
      if (lit) for (let sv = a + 15; sv < b; sv += 30) lantern(K, sv, Math.floor(sv / 30) % 2 ? 1 : -1);
      if (r() < 0.3) critterAt(K, a + 10 + r() * 100, r() < 0.5 ? -1 : 1, true);
    }

    /* ---------- macchinine degli avversari (misure = rettangolo di collisione P.CAR_L × P.CAR_W) e cofano di Hari ---------- */
    function carParts(body, who) {
      const ps = [], add = (geo, c, m, ol = 0) => ps.push({ geo, c, m, ol });
      const Lc = P.CAR_L, Wc = P.CAR_W, hl = Lc / 2;
      add(GEO.box, body, M4(0, 0.62, 0, 0, 0, 0, Wc - 0.16, 0.56, Lc - 0.4), 0.05);
      add(GEO.box, C.trim, M4(0, 0.42, hl - 0.15, 0, 0, 0, Wc - 0.1, 0.26, 0.3), 0.04);
      add(GEO.box, C.trim, M4(0, 0.42, -(hl - 0.15), 0, 0, 0, Wc - 0.1, 0.26, 0.3), 0.04);
      add(GEO.box, C.glass, M4(0, 1.13, -0.2, 0, 0, 0, Wc - 0.48, 0.5, 1.7), 0.04);
      add(GEO.box, body, M4(0, 1.43, -0.2, 0, 0, 0, Wc - 0.38, 0.13, 1.82), 0.04);
      add(GEO.box, C['car-2'], M4(0, 0.91, 0, 0, 0, 0, 0.42, 0.03, Lc - 0.38));
      // ruote dentro la sagoma: il bordo esterno è a metà larghezza dell'auto
      for (const x of [-(Wc / 2 - 0.16), Wc / 2 - 0.16]) for (const z of [-1.2, 1.2]) add(GEO.cyl, C.tire, M4(x, 0.38, z, 0, 0, Math.PI / 2, 0.38, 0.32, 0.38), 0.03);
      for (const x of [-0.6, 0.6]) { add(GEO.sph, C.head, M4(x, 0.68, hl - 0.16, 0, 0, 0, 0.17, 0.13, 0.08)); add(GEO.box, C.tail, M4(x, 0.74, -(hl - 0.14), 0, 0, 0, 0.36, 0.15, 0.06)); }
      // alettone da rally
      add(GEO.box, C['car-2'], M4(0, 1.32, -(hl - 0.28), 0, 0, 0, Wc - 0.32, 0.08, 0.34), 0.04);
      for (const x of [-0.55, 0.55]) add(GEO.box, C.trim, M4(x, 1.1, -(hl - 0.34), 0, 0, 0, 0.08, 0.4, 0.08));
      // pilota che spunta dal tettuccio
      const hy = 1.92;
      if (who === 'bunny') {
        add(GEO.sph, C.bunny, M4(0, hy, -0.3, 0, 0, 0, 0.48, 0.44, 0.46), 0.05);
        for (const sx of [-1, 1]) { add(GEO.sph, C.bunny, M4(sx * 0.2, hy + 0.66, -0.36, 0, 0, sx * -0.18, 0.13, 0.5, 0.1), 0.04); add(GEO.sph, C['bunny-in'], M4(sx * 0.2, hy + 0.66, -0.29, 0, 0, sx * -0.18, 0.07, 0.38, 0.05)); }
        add(GEO.sph, C.bunny, M4(0, hy - 0.3, -0.9, 0, 0, 0, 0.16, 0.16, 0.16), 0.03);
      } else if (who === 'fox') {
        add(GEO.sph, C.fox, M4(0, hy, -0.3, 0, 0, 0, 0.5, 0.44, 0.46), 0.05);
        for (const sx of [-1, 1]) { add(GEO.cone, C.fox, M4(sx * 0.27, hy + 0.48, -0.3, 0, 0, sx * -0.32, 0.17, 0.4, 0.12), 0.04); add(GEO.cone, C.ink, M4(sx * 0.33, hy + 0.62, -0.3, 0, 0, sx * -0.32, 0.07, 0.14, 0.05)); }
      } else if (who === 'panda') {
        add(GEO.sph, C.panda, M4(0, hy, -0.3, 0, 0, 0, 0.5, 0.45, 0.47), 0.05);
        for (const sx of [-1, 1]) add(GEO.sph, C['panda-2'], M4(sx * 0.34, hy + 0.36, -0.32, 0, 0, 0, 0.17, 0.17, 0.12), 0.04);
        add(GEO.sph, C['panda-2'], M4(0, hy - 0.42, -0.5, 0, 0, 0, 0.46, 0.18, 0.3));
      }
      return ps;
    }
    function buildCars() {
      R3.cars = [];
      const bodies = [null, C['bunny-car'], C['fox-car'], C['panda-car']];
      // molla (salto) e bolla (scudo) per ogni auto
      const coil = [];
      for (let i = 0; i < 6; i++) coil.push({ geo: GEO.cyl, c: C.spring, m: M4(0, -0.1 - i * 0.18, 0, 0, 0, (i % 2 ? 0.25 : -0.25), 0.5, 0.11, 0.5), ol: 0.03 });
      coil.push({ geo: GEO.box, c: C.car, m: M4(0, -1.2, 0, 0, 0, 0, 1.3, 0.14, 1.3), ol: 0.03 });
      const coilM = merge(coil);
      R3.bubbleMat = basic({ color: C.bubble, transparent: true, opacity: 0.32, depthWrite: false });
      for (let id = 1; id <= 3; id++) {
        const mm = merge(carParts(bodies[id], WHO[id]));
        const grp = meshOf(mm, R3.inkMat, R3.vc);
        const sp = meshOf(coilM, R3.inkMat, R3.vc); sp.visible = false; grp.add(sp);
        const bb = new T.Mesh(GEO.ball, R3.bubbleMat); bb.scale.set(1.45, 1.35, 2.5); bb.position.y = 1.0; bb.visible = false; grp.add(bb);
        grp.userData = { spring: sp, bubble: bb };
        R3.scene.add(grp);
        R3.cars[id] = grp;
      }
    }
    function buildHood() {
      const ps = [], add = (geo, c, m, ol = 0) => ps.push({ geo, c, m, ol });
      // cofano (il bordo davanti a 2,9 m dall'occhio = muso dell'auto, sopra a quota −0,5; measure() lo alza/abbassa
      // secondo il campo visivo): la parte vicina resta sotto il cruscotto, si vede il bordo con le gobbe dei fari
      add(GEO.box, C.car, M4(0, -0.68, -1.6, 0.04, 0, 0, P.CAR_W + 0.04, 0.34, 2.2));
      add(GEO.sph, C.car, M4(0, -0.62, -2.55, 0, 0, 0, 1.0, 0.16, 0.36), 0.05);
      for (const x of [-0.16, 0.16]) add(GEO.box, C['car-2'], M4(x, -0.505, -1.7, 0.04, 0, 0, 0.14, 0.02, 2.2));
      for (const x of [-0.72, 0.72]) add(GEO.sph, C.car, M4(x, -0.53, -2.32, 0, 0, 0, 0.28, 0.12, 0.36), 0.04);
      const mm = merge(ps);
      const grp = meshOf(mm, R3.inkMat, toon({ vertexColors: true, fog: false }));
      R3.camera.add(grp);
      R3.hood = grp;
    }

    /* particelle: polvere dietro le auto, foglie e stelline dagli urti, petali, bolle, scintille del turbo */
    function buildFx() {
      const n = 220, pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
      const geo = keep(new T.BufferGeometry());
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('color', new T.BufferAttribute(col, 4));
      const cvs = document.createElement('canvas'); cvs.width = cvs.height = 32;
      const c2 = cvs.getContext('2d'), gr = c2.createRadialGradient(16, 16, 2, 16, 16, 15);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.beginPath(); c2.arc(16, 16, 15, 0, 7); c2.fill();
      const tex = keep(new T.CanvasTexture(cvs));
      const mat = keep(new T.PointsMaterial({ size: 0.75, map: tex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
      const pts = new T.Points(geo, mat);
      pts.frustumCulled = false;
      R3.scene.add(pts);
      R3.fx = { pts, n, list: Array.from({ length: n }, () => ({ life: 0 })), next: 0 };
      // fanalini posteriori e fari degli avversari che brillano al buio
      if ((N.night || 0) > 0) {
        const mk = (c, sz) => { const tg = keep(new T.BufferGeometry()); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(18), 3)); const tl = new T.Points(tg, keep(new T.PointsMaterial({ size: sz, map: tex, color: c, transparent: true, depthWrite: false, blending: T.AdditiveBlending }))); tl.frustumCulled = false; R3.scene.add(tl); return tl; };
        R3.tails = mk(C.tail, 0.42); R3.heads = mk(C.head, 0.7);
      } else { R3.tails = null; R3.heads = null; }
    }
    function emit(x, y, z, vx, vy, vz, c, life, a = 0.8) {
      const F = R3.fx, p = F.list[F.next];
      F.next = (F.next + 1) % F.n;
      Object.assign(p, { x, y, z, vx, vy, vz, c, life, t: 0, a });
    }
    const BURST = { leaf: ['leafp', 'leaf-1', 'leaf-2'], spark: ['spark', 'cap-dot'], petal: ['petal', 'petal-2', 'flower-2'], honey: ['honey', 'honey-2'],
      bubble: ['bubble', 'ribbon'], carrot: ['carrot', 'spark', 'carrot-leaf'], gift: ['gift-1', 'gift-2', 'gift-3', 'gift-4'], acorn: ['acorn', 'spark'] };
    function burst(kind, at3, n0) {
      if (reduce() || !R3 || !R3.fx) return;
      const cam = R3.camera, f = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), rgt = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      const n = n0 || (kind === 'leaf' ? 14 : 10), col = (BURST[kind] || BURST.spark).map((k) => C[k]);
      for (let i = 0; i < n; i++) {
        const side = (Math.random() - 0.5) * 2;
        const p = at3 ? at3.clone().add(new T.Vector3((Math.random() - 0.5) * 1.5, Math.random(), (Math.random() - 0.5) * 1.5)) : cam.position.clone().addScaledVector(f, 3 + Math.random() * 2).addScaledVector(rgt, side * 1.6);
        emit(p.x, p.y - 0.2, p.z, rgt.x * side * 3 + (Math.random() - 0.5), 2 + Math.random() * 2.5, rgt.z * side * 3 + (Math.random() - 0.5), col[i % col.length], 0.9, 1);
      }
    }
    function updateFx(dt) {
      const F = R3.fx, pa = F.pts.geometry.attributes.position, ca = F.pts.geometry.attributes.color;
      for (let i = 0; i < F.n; i++) {
        const p = F.list[i];
        if (p.life > 0 && p.t < p.life) {
          p.t += dt; p.vy -= 3.2 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          const k = 1 - p.t / p.life;
          pa.setXYZ(i, p.x, p.y, p.z); ca.setXYZW(i, p.c.r, p.c.g, p.c.b, p.a * k);
        } else { p.life = 0; pa.setXYZ(i, 0, -999, 0); ca.setXYZW(i, 0, 0, 0, 0); }
      }
      pa.needsUpdate = true; ca.needsUpdate = true;
    }

    /* ---------- oggetti dei power-up: scatole-sorpresa, ghiande, bucce, pozze di miele, nuvolette di fiori ---------- */
    function buildItems() {
      const W1 = new T.Color(1, 1, 1);
      // scatola-regalo: cubo di lato 1 (semidiagonale ≈ P.PU.boxR), nastro e fiocco
      const gb = P.PU.boxR * Math.SQRT2;
      const gift = merge([{ geo: GEO.box, c: W1, m: M4(0, 0, 0, 0, 0, 0, gb, gb, gb), ol: 0.05 }]);
      const ribbon = merge([
        { geo: GEO.box, c: C.ribbon, m: M4(0, 0, 0, 0, 0, 0, gb + 0.02, gb + 0.02, 0.22) },
        { geo: GEO.box, c: C.ribbon, m: M4(0, 0, 0, 0, 0, 0, 0.22, gb + 0.02, gb + 0.02) },
        { geo: GEO.sph, c: C.ribbon, m: M4(-0.18, gb / 2 + 0.12, 0, 0, 0, 0.6, 0.2, 0.12, 0.12), ol: 0.03 },
        { geo: GEO.sph, c: C.ribbon, m: M4(0.18, gb / 2 + 0.12, 0, 0, 0, -0.6, 0.2, 0.12, 0.12), ol: 0.03 },
      ]);
      const nb = g.boxes.length * 4;
      const boxes = new T.InstancedMesh(gift.body, R3.vc, Math.max(1, nb)), bol = new T.InstancedMesh(gift.line, R3.inkMat, Math.max(1, nb));
      const rib = new T.InstancedMesh(ribbon.body, R3.vc, Math.max(1, nb));
      bol.instanceMatrix = boxes.instanceMatrix; rib.instanceMatrix = boxes.instanceMatrix;
      const GC = [C['gift-1'], C['gift-2'], C['gift-3'], C['gift-4']];
      for (let i = 0; i < nb; i++) boxes.setColorAt(i, GC[i % 4]);
      boxes.frustumCulled = bol.frustumCulled = rib.frustumCulled = false;
      R3.scene.add(boxes, rib, bol);
      // ghianda (raggio di raccolta P.PU.acornR)
      const ar = P.PU.acornR;
      const acorn = merge([
        { geo: GEO.sph, c: C.acorn, m: M4(0, -0.05, 0, 0, 0, 0, ar * 0.7, ar * 0.85, ar * 0.7), ol: 0.03 },
        { geo: GEO.sph, c: C['acorn-cap'], m: M4(0, ar * 0.38, 0, 0, 0, 0, ar * 0.78, ar * 0.42, ar * 0.78), ol: 0.03 },
        { geo: GEO.cyl, c: C['acorn-cap'], m: M4(0, ar * 0.85, 0, 0, 0, 0.3, 0.04, 0.16, 0.04) },
      ]);
      const na = g.acorns.length;
      const acorns = new T.InstancedMesh(acorn.body, R3.vc, Math.max(1, na)), aol = new T.InstancedMesh(acorn.line, R3.inkMat, Math.max(1, na));
      aol.instanceMatrix = acorns.instanceMatrix;
      const m4 = new T.Matrix4();
      g.acorns.forEach((ac, i) => { const w = P.world(g, ac.s, ac.d); m4.makeTranslation(w.x, roadH(ac.s, ac.d, w.x, w.y) + 0.65, -w.y); acorns.setMatrixAt(i, m4); });
      acorns.instanceMatrix.needsUpdate = true;
      acorns.computeBoundingSphere(); aol.boundingSphere = acorns.boundingSphere;
      R3.scene.add(acorns, aol);
      // buccia di banana (raggio P.PU.bananaR) e pozza di miele (raggio P.PU.honeyR), nuvoletta di fiori
      const br = P.PU.bananaR;
      const peel = [];
      // buccia aperta a stella: le punte arrivano al raggio di collisione
      for (let i = 0; i < 4; i++) { const an = i * 1.57 + 0.4; peel.push({ geo: GEO.sph, c: C.banana, m: M4(Math.cos(an) * br * 0.5, 0.1, Math.sin(an) * br * 0.5, 0, -an, 0.25, br * 0.55, 0.13, br * 0.3), ol: 0.03 }); }
      peel.push({ geo: GEO.sph, c: C.banana, m: M4(0, 0.25, 0, 0, 0, 0, br * 0.42, br * 0.5, br * 0.42), ol: 0.04 });
      peel.push({ geo: GEO.cyl, c: C['banana-2'], m: M4(0, 0.58, 0, 0, 0, 0.2, 0.07, 0.22, 0.07), ol: 0.02 });
      const peelM = merge(peel);
      const hr = P.PU.honeyR;
      const honeyM = merge([
        { geo: GEO.cyl, c: C.honey, m: M4(0, 0.04, 0, 0, 0, 0, hr, 0.06, hr), ol: 0.03 },
        { geo: GEO.cyl, c: C['honey-2'], m: M4(-hr * 0.3, 0.075, -hr * 0.2, 0, 0, 0, hr * 0.35, 0.02, hr * 0.22) },
        { geo: GEO.sph, c: C.honey, m: M4(hr * 0.4, 0.12, hr * 0.3, 0, 0, 0, 0.24, 0.12, 0.24), ol: 0.02 },
        { geo: GEO.sph, c: C.honey, m: M4(-hr * 0.5, 0.1, hr * 0.45, 0, 0, 0, 0.18, 0.09, 0.18), ol: 0.02 },
      ]);
      const cloudP = [];
      for (let i = 0; i < 7; i++) { const an = i * 0.9; cloudP.push({ geo: GEO.sph, c: i % 2 ? C.petal : C['petal-2'], m: M4(Math.cos(an) * 1.0, Math.sin(i * 2.1) * 0.35, Math.sin(an) * 0.7, 0, 0, 0, 0.85, 0.7, 0.75), ol: 0.05 }); }
      for (let i = 0; i < 6; i++) { const an = i * 1.05 + 0.3; cloudP.push({ geo: GEO.sph, c: C['flower-1'], m: M4(Math.cos(an) * 1.0, 0.68, Math.sin(an) * 0.75, 0, 0, 0, 0.26, 0.16, 0.26), ol: 0.02 }); cloudP.push({ geo: GEO.sph, c: C['gift-3'], m: M4(Math.cos(an) * 1.0, 0.8, Math.sin(an) * 0.75, 0, 0, 0, 0.1, 0.08, 0.1) }); }
      const cloudM = merge(cloudP);
      const mk = (mm, n) => { const im = new T.InstancedMesh(mm.body, R3.vc, n), ol = new T.InstancedMesh(mm.line, R3.inkMat, n); ol.instanceMatrix = im.instanceMatrix; im.frustumCulled = ol.frustumCulled = false; im.count = ol.count = 0; R3.scene.add(im, ol); return { im, ol }; };
      R3.items = { boxes, bol, acorns, aol, ag: '', peel: mk(peelM, P.PU.maxHaz), honey: mk(honeyM, P.PU.maxHaz), cloud: mk(cloudM, 8) };
    }
    function updateItems(now, p) {
      const I = R3.items, m4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S1 = new T.Vector3(1, 1, 1), Z = new T.Vector3(0, 0, 0), UP = new T.Vector3(0, 1, 0);
      // scatole: girano e galleggiano; quelle prese spariscono finché non ricompaiono
      let k = 0;
      g.boxes.forEach((row, ri) => {
        const near = Math.abs(row.s - p.s) < R3.fogFar + 20;
        row.row.forEach((d, j) => {
          const id = ri * 4 + j, taken = s.bx.some((b2) => b2[0] === id && b2[1] > s.t);
          if (!near || taken) m4.compose(V.set(0, -999, 0), Q.identity(), Z);
          else { const w = P.world(g, row.s, d); m4.compose(V.set(w.x, roadH(row.s, d, w.x, w.y) + 0.95 + Math.sin(now * 2.4 + id) * 0.12, -w.y), Q.setFromAxisAngle(UP, now * 1.6 + id), S1); }
          I.boxes.setMatrixAt(k++, m4);
        });
      });
      I.boxes.instanceMatrix.needsUpdate = true;
      // ghiande: si aggiornano solo quando qualcuno ne prende una
      if (I.ag !== s.ag) {
        I.ag = s.ag;
        g.acorns.forEach((ac, i) => { if (P.acornTaken(s, i)) { m4.compose(V.set(0, -999, 0), Q.identity(), Z); I.acorns.setMatrixAt(i, m4); } });
        I.acorns.instanceMatrix.needsUpdate = true;
      }
      // bucce e miele
      let nb = 0, nh = 0;
      for (const h of s.hz) {
        const w = P.world(g, h.s, h.d), y = roadH(h.s, h.d, w.x, w.y) + 0.08;
        m4.compose(V.set(w.x, y, -w.y), Q.setFromAxisAngle(UP, h.n * 1.7), S1);
        if (h.k === 'b') I.peel.im.setMatrixAt(nb++, m4); else I.honey.im.setMatrixAt(nh++, m4);
      }
      I.peel.im.count = I.peel.ol.count = nb; I.honey.im.count = I.honey.ol.count = nh;
      I.peel.im.instanceMatrix.needsUpdate = true; I.honey.im.instanceMatrix.needsUpdate = true;
      // nuvolette di fiori in volo
      let nc = 0;
      for (const cl of s.cl) {
        if (nc >= 8) break;
        const w = P.world(g, cl.s, cl.d), sc = cl.to < 0 ? Math.max(0.2, cl.life === undefined ? 1 : cl.life / 1.5) : 1;
        m4.compose(V.set(w.x, roadH(cl.s, cl.d, w.x, w.y) + 2.2 + Math.sin(now * 5 + nc) * 0.2, -w.y), Q.setFromAxisAngle(UP, now * 2), V.clone().set(sc, sc, sc));
        I.cloud.im.setMatrixAt(nc++, m4);
      }
      I.cloud.im.count = I.cloud.ol.count = nc;
      I.cloud.im.instanceMatrix.needsUpdate = true;
    }
    // gabbiani che girano in cielo (mare, di giorno e al tramonto)
    function buildGulls() {
      R3.gulls = null;
      if (cfg.theme !== 'sea' || (N.night || 0) >= 1) return;
      const W1 = C.gull;
      const gm = merge([
        { geo: GEO.sph, c: W1, m: M4(0, 0, 0, 0, 0, 0, 0.18, 0.16, 0.5), ol: 0.03 },
        { geo: GEO.box, c: W1, m: M4(-0.55, 0.12, 0, 0, 0, 0.35, 1.0, 0.05, 0.3), ol: 0.03 },
        { geo: GEO.box, c: W1, m: M4(0.55, 0.12, 0, 0, 0, -0.35, 1.0, 0.05, 0.3), ol: 0.03 },
        { geo: GEO.cone, c: C['tl-amber'], m: M4(0, 0, 0.55, Math.PI / 2, 0, 0, 0.06, 0.18, 0.06) },
      ]);
      const list = [];
      for (let i = 0; i < 5; i++) { const m = meshOf(gm, R3.inkMat, R3.vc); R3.scene.add(m); list.push(m); }
      R3.gulls = list;
    }

    /* ---------- disegno ---------- */
    let baseFov = 64;
    function measure() {
      if (!stage) return;
      W = stage.clientWidth || 300; H = stage.clientHeight || 400;
      if (!R3) return;
      R3.renderer.setSize(W, H, false);
      R3.camera.aspect = W / H;
      baseFov = W / H < 1 ? 74 : W / H > 1.7 ? 58 : 64;
      R3.camera.fov = baseFov + fovK * 8;
      R3.camera.updateProjectionMatrix();
      // il bordo del cofano (2,9 m davanti) cade al 71% dell'altezza, qualunque sia il campo visivo
      const a = Math.atan(0.42 * Math.tan((baseFov * Math.PI) / 360)) + PITCH;
      R3.hoodY = -2.9 * Math.tan(a) + 0.5;
      if (!raf) draw(0);
    }
    // altezza del saltino (dossi) o del salto a molla (più alto, per vedere la molla)
    const hopOf = (c) => { if (!(c.air > 0 && c.airT > 0)) return 0; const k = 1 - c.air / c.airT; return 4 * c.airT * (c.spr ? 1.6 : 1.1) * k * (1 - k); };
    function draw(dt) {
      if (!R3 || !R3.scene || !s) return;
      const p = s.cars[0], cam = R3.camera, now = performance.now() / 1000;
      const w = P.world(g, p.s, p.d), h0 = roadH(p.s, p.d, w.x, w.y);
      const hop = hopOf(p), rm = reduce();
      // buccia di banana: il muso fa un giro buffo a destra e sinistra
      const slipK = p.slip > 0 ? 1 - p.slip / P.PU.slipT : 0, wob = p.slip > 0 && !rm ? Math.sin(slipK * Math.PI * 2) * 0.55 * (1 - slipK * 0.5) : 0;
      const hdg = w.th + p.psi + wob;
      if (hdgS === null || !(dt > 0)) hdgS = hdg; else hdgS += (hdg - hdgS) * Math.min(1, dt * 14);
      const vm = cfg.vmax, sp = p.v / vm;
      const shake = rm ? 0 : (p.off ? 0.05 : 0.012) * Math.min(1.3, sp);
      // occhio un po' dietro il centro: il bordo del cofano è il muso del rettangolo di collisione
      const ex = w.x - Math.cos(w.th + p.psi) * EYE_BACK, ey = w.y - Math.sin(w.th + p.psi) * EYE_BACK;
      const eye = V3(ex, h0 + 1.15 + hop + (rm ? 0 : Math.sin(now * 19) * shake), ey);
      cam.position.copy(eye);
      const ah = P.world(g, p.s + 12, p.d), hA = roadH(p.s + 12, p.d, ah.x, ah.y);
      const look = V3(ex + Math.cos(hdgS) * 12, h0 + 1.15 + (hA - h0) * 0.85 - 12 * Math.tan(PITCH) + hop * 0.5, ey + Math.sin(hdgS) * 12);
      cam.lookAt(look);
      const roll = Math.max(-0.06, Math.min(0.06, p.kc * p.v * p.v * 0.0032)) + P.bankAt(g, p.s) + (rm ? 0 : wob * 0.12);
      camRoll += (roll - camRoll) * Math.min(1, (dt || 0.016) * 6);
      if (!rm) cam.rotateZ(camRoll + (p.off ? (Math.random() - 0.5) * 0.012 * sp : 0));
      // turbo: il campo visivo si allarga un pochino
      const fk = p.boost > 0 && !rm ? 1 : 0;
      fovK += (fk - fovK) * Math.min(1, (dt || 0.016) * 5);
      if (Math.abs(cam.fov - (baseFov + fovK * 8)) > 0.05) { cam.fov = baseFov + fovK * 8; cam.updateProjectionMatrix(); }
      if (R3.hood) R3.hood.position.y = (R3.hoodY || 0) + (rm ? 0 : Math.sin(now * 23) * 0.006 * sp);
      // cielo segue la camera; la luce principale arriva da dietro-sinistra-alto rispetto a chi guida (niente controluce)
      R3.sky.position.copy(eye);
      if (R3.sea) { R3.sea.position.x = eye.x; R3.sea.position.z = eye.z; }
      const fx = Math.cos(hdgS), fz = -Math.sin(hdgS);
      R3.sun.position.set(eye.x - fx * 60 + fz * 35, eye.y + 80, eye.z - fz * 60 - fx * 35);
      R3.sun.target.position.copy(eye);
      updateGround(ex + Math.cos(hdgS) * 90, ey + Math.sin(hdgS) * 90);
      // blocchi di scenario: costruisce il prossimo (uno per fotogramma) e mostra solo quelli vicini
      const ahead = p.s + 320;
      for (const ch of R3.chunks) {
        if (!ch.grp && ch.a < ahead && ch.b > p.s - 80) { buildChunk(ch); break; }
      }
      for (const ch of R3.chunks) {
        if (!ch.grp) continue;
        const dd = Math.hypot(ch.x - w.x, ch.y - w.y);
        ch.grp.visible = dd < R3.fogFar + ch.rad;
        // LOD semplice: i blocchi lontani mostrano alberi e cespugli senza dettagli
        const isFar = dd - ch.rad * 0.6 > 85;
        if (ch.isFar !== isFar) { ch.isFar = isFar; for (const m of ch.near) m.visible = !isFar; for (const m of ch.far) m.visible = isFar; }
      }
      // animazioni dello scenario (animaletti, pubblico, barche, faro) solo nei blocchi vicini
      if (!rm) for (const an of R3.anim) if (!an.ch || (an.ch.grp && an.ch.grp.visible && Math.hypot(an.ch.x - w.x, an.ch.y - w.y) < 200)) an.fn(now);
      // gabbiani
      if (R3.gulls) R3.gulls.forEach((gl, i) => {
        const an = now * (0.25 + i * 0.04) + i * 1.3, rr = 22 + i * 7, cx = ex + Math.cos(hdgS) * 40, cy = ey + Math.sin(hdgS) * 40;
        gl.position.set(cx + Math.cos(an) * rr, eye.y + 12 + i * 2.5 + Math.sin(now * 2 + i) * 0.6, -(cy + Math.sin(an) * rr));
        gl.rotation.set(0, -an + Math.PI, Math.sin(now * 6 + i) * 0.25);
      });
      // avversari
      const tails = R3.tails ? R3.tails.geometry.attributes.position : null, heads = R3.heads ? R3.heads.geometry.attributes.position : null;
      for (let id = 1; id <= 3; id++) {
        const c = s.cars[id], m = R3.cars[id], cw = P.world(g, c.s, c.d), ch = roadH(c.s, c.d, cw.x, cw.y), hp = hopOf(c);
        const spin = c.slip > 0 ? (1 - c.slip / P.PU.slipT) * Math.PI * 4 : 0;
        m.position.set(cw.x, ch + hp + (rm ? 0 : Math.abs(Math.sin(now * 13 + id * 2)) * 0.05 * (c.v / vm)), -cw.y);
        m.rotation.set(0, YAW(cw.th + c.psi) + spin, 0);
        m.rotateZ(-c.kc * c.v * c.v * 0.004 - P.bankAt(g, c.s));
        m.visible = Math.abs(c.s - p.s) < R3.fogFar + 20;
        m.userData.spring.visible = !!(c.spr && c.air > 0);
        if (m.userData.spring.visible) m.userData.spring.scale.y = Math.max(0.15, hp * 0.85);
        m.userData.bubble.visible = c.sh > 0;
        if (dt > 0 && !rm && m.visible) {
          // polvere (o scintille del turbo, petali della nuvoletta)
          const bx = cw.x - Math.cos(cw.th) * 2.1, by = cw.y - Math.sin(cw.th) * 2.1;
          if (c.v > 9 && c.s - p.s > 9 && Math.random() < dt * 12) emit(bx + (Math.random() - 0.5) * 1.4, ch + 0.25, -by, (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8, c.off ? C.leafp : C.dust, 0.8, 0.4);
          if (c.boost > 0 && Math.random() < dt * 30) emit(bx, ch + 0.6, -by, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, Math.random() < 0.5 ? C.carrot : C.spark, 0.5, 1);
          if (c.slow > 0 && Math.random() < dt * 20) emit(cw.x + (Math.random() - 0.5) * 2, ch + 2 + Math.random(), -cw.y + (Math.random() - 0.5) * 2, 0, -0.5, 0, C.petal, 0.7, 1);
        }
        const nx = -Math.sin(cw.th), ny = Math.cos(cw.th);
        if (tails) for (const [k, sd] of [[0, -0.6], [1, 0.6]]) tails.setXYZ((id - 1) * 2 + k, cw.x - Math.cos(cw.th) * 2.0 + nx * sd, ch + 0.75 + hp, -(cw.y - Math.sin(cw.th) * 2.0 + ny * sd));
        if (heads) for (const [k, sd] of [[0, -0.6], [1, 0.6]]) heads.setXYZ((id - 1) * 2 + k, cw.x + Math.cos(cw.th) * 2.0 + nx * sd, ch + 0.68 + hp, -(cw.y + Math.sin(cw.th) * 2.0 + ny * sd));
      }
      if (tails) tails.needsUpdate = true;
      if (heads) heads.needsUpdate = true;
      // Hari: scintille del turbo e petali davanti al parabrezza
      if (dt > 0 && !rm) {
        if (p.boost > 0 && Math.random() < dt * 25) burst('carrot', null, 1);
        if (p.slow > 0 && Math.random() < dt * 14) burst('petal', null, 1);
      }
      updateItems(now, p);
      updateFx(dt || 0);
      R3.renderer.render(R3.scene, cam);
    }

    /* ---------- indicatori HTML ---------- */
    function hud() {
      const p = s.cars[0];
      if (s.pos !== lastHud.pos) {
        const up = lastHud.pos && s.pos < lastHud.pos;
        lastHud.pos = s.pos;
        posEl.querySelector('b').textContent = String(s.pos);
        posEl.setAttribute('aria-label', `${s.pos}/4`);
        if (up) { posEl.classList.remove('up'); void posEl.offsetWidth; posEl.classList.add('up'); }
      }
      const rk = s.rank.join('');
      if (rk !== lastHud.rank) {
        lastHud.rank = rk;
        rankEl.innerHTML = s.rank.map((id) => `<i class="${id ? '' : 'me'}" style="--ry-c:${CCOL[id]}">${face(id, false)}</i>`).join('');
      }
      const tt = Math.floor(Math.max(0, s.t) * 10);
      if (tt !== lastHud.t) { lastHud.t = tt; timeEl.textContent = fmtT(tt / 10); }
      // barra della tappa
      progEl.querySelectorAll('i').forEach((it) => { const c = s.cars[+it.dataset.id]; it.style.left = `${Math.max(0, Math.min(100, ((c.s - P.PREROLL) / s.L) * 100)).toFixed(1)}%`; });
      // note
      const up = P.upcoming(s, 2);
      const key = up.map((n) => n.i).join(',');
      if (key !== lastHud.notes) {
        lastHud.notes = key;
        notesEl.innerHTML = up.map((n, j) => noteHTML(n, j)).join('');
      }
      notesEl.querySelectorAll('.ry-dist i').forEach((bar, j) => { const n = up[j]; if (n) bar.style.width = `${Math.max(0, Math.min(100, (n.dist / P.CALL) * 100)).toFixed(0)}%`; });
      // power-up tenuto (con la "ruota" che gira appena presa la scatola) e ghiande
      const rolling = performance.now() < rollUntil;
      const itKey = rolling ? -2 : p.it;
      if (itKey !== lastHud.it) {
        lastHud.it = itKey;
        const name = P.ITEMS[p.it];
        itemBtn.classList.toggle('roll', rolling);
        itemBtn.classList.toggle('empty', !rolling && !p.it);
        itemBtn.classList.toggle('full', !rolling && !!p.it);
        if (!rolling) {
          itemBtn.innerHTML = puSvg(name || 'gift');
          itemBtn.setAttribute('aria-label', name ? `${L('ry_item')}: ${L('ry_pu_' + name).replace(/[!！¡]/g, '')}` : L('ry_item'));
        }
      }
      if (rolling) { const k = Math.floor(performance.now() / 90) % PU_LIST.length; if (itemBtn.dataset.k !== String(k)) { itemBtn.dataset.k = String(k); itemBtn.innerHTML = puSvg(PU_LIST[k]); } }
      if (p.ac !== lastHud.ac) {
        const more = lastHud.ac >= 0 && p.ac > lastHud.ac;
        lastHud.ac = p.ac;
        acornEl.querySelector('b').textContent = String(p.ac);
        acornEl.setAttribute('aria-label', `${L('ry_acorns')}: ${p.ac}`);
        acornEl.classList.toggle('max', p.ac >= P.PU.acornMax);
        if (more && !reduce()) { acornEl.classList.remove('pop'); void acornEl.offsetWidth; acornEl.classList.add('pop'); }
      }
      // effetti a schermo: miele, petali, bolla, turbo
      const fxk = p.honey ? 'honey' : p.slow > 0 ? 'petals' : p.sh > 0 ? 'bubble' : p.boost > 0 ? 'zoom' : '';
      if (fxk !== lastHud.fx) { lastHud.fx = fxk; fxoEl.className = `ry-fxo${fxk ? ' ' + fxk : ''}`; }
      // volante e lancetta
      const ang = steerV * 70;
      if (wheelG) wheelG.style.transform = `rotate(${ang.toFixed(1)}deg)`;
      if (needle) needle.setAttribute('transform', `rotate(${(-20 + Math.min(1.35, p.v / cfg.vmax) * 200).toFixed(0)})`);
      zoneL.classList.toggle('on', steerV < -0.2 && mode() === 'touch');
      zoneR.classList.toggle('on', steerV > 0.2 && mode() === 'touch');
      pedalEl.classList.toggle('on', brakeOn);
    }
    function noteHTML(n, j) {
      if (n.kind !== 'curve') return `<div class="ry-note${j ? ' next' : ''}"><svg viewBox="0 0 60 48" aria-hidden="true">${BIG[n.kind]}</svg><span class="ry-dist"><i></i></span></div>`;
      const mods = [n.caution && 'warn', n.nocut && 'nocut', n.bank && 'bank', n.long && 'long', n.into && 'into'].filter(Boolean).slice(0, 3);
      return `<div class="ry-note ${n.dir > 0 ? 'l' : 'r'}${n.caution ? ' warn' : ''}${j ? ' next' : ''}" role="img" aria-label="${n.dir > 0 ? '←' : '→'} ${n.g}">
        <svg viewBox="0 0 60 48" aria-hidden="true">${arrow(n.dir, n.g)}</svg><b class="ry-g">${n.hairpin ? 'U' : n.g}</b>
        <span class="ry-mods">${mods.map(ic).join('')}</span><span class="ry-dist"><i></i></span></div>`;
    }
    function say(html, cls = '', ms = 900) {
      msgEl.innerHTML = `<b class="${cls}">${html}</b>`;
      msgEl.classList.remove('show'); void msgEl.offsetWidth; msgEl.classList.add('show');
      later(() => { if (msgEl.firstChild && msgEl.firstChild.innerHTML === html) msgEl.classList.remove('show'); }, ms);
    }
    function lights(n) {
      // semaforo di partenza: n rossi accesi (1–3), 0 = verde
      msgEl.classList.remove('show');
      msgEl.innerHTML = `<div class="ry-lights" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${n === 0 ? 'g' : i < n ? 'r' : ''}"></i>`).join('')}</div>`;
    }
    function changed(force) {
      const now = performance.now();
      if (!force && now - lastChanged < 900) return;
      lastChanged = now;
      ctx.changed();
    }

    /* ---------- comandi ---------- */
    const landscape = () => (G.innerWidth || 1) > (G.innerHeight || 1);
    const inFull = () => { const f = fsEl(); return !!(f && wrap && f.contains(wrap)); };
    const sensorLive = () => performance.now() - sensor.at < 1200;
    const mode = () => (pref === 'tilt' && inFull() && sensorLive() ? 'tilt' : 'touch');
    let lastMode = '';
    function renderMode() {
      if (!modeBtn) return;
      const m = mode();
      modeBtn.innerHTML = pref === 'tilt' ? TILT : HAND;
      modeBtn.classList.toggle('on', m === 'tilt');
      modeBtn.setAttribute('aria-label', pref === 'tilt' ? L('ry_tilt') : L('ry_touch'));
      modeBtn.title = modeBtn.getAttribute('aria-label');
      wrap.classList.toggle('tilt', m === 'tilt');
      wrap.classList.toggle('touch', m === 'touch');
      if (m !== lastMode) { if (m === 'tilt') sensor.zero = sensor.raw; lastMode = m; }
    }
    // inclinazione "a volante": componente della verticale lungo il lato lungo dello schermo
    function onOrient(e) {
      if (e.beta == null || e.gamma == null) return;
      const b = (e.beta * Math.PI) / 180, gm = (e.gamma * Math.PI) / 180;
      const ux = -Math.cos(b) * Math.sin(gm), uy = Math.sin(b);
      const ang = (((G.screen && G.screen.orientation && G.screen.orientation.angle) ?? G.orientation ?? 0) * Math.PI) / 180;
      const raw = -(ux * Math.cos(ang) - uy * Math.sin(ang));
      sensor.raw = sensor.raw * 0.55 + raw * 0.45;
      if (performance.now() - sensor.at > 3000) sensor.zero = sensor.raw;   // sensori appena arrivati: zero qui
      sensor.at = performance.now();
    }
    function tiltSteer() {
      let v = (sensor.raw - sensor.zero) / Math.sin((24 * Math.PI) / 180);
      if (Math.abs(v) < 0.06) v = 0; else v = Math.sign(v) * (Math.abs(v) - 0.06) / 0.94;
      return Math.max(-1, Math.min(1, v));
    }
    function askPermission() {
      const D = G.DeviceOrientationEvent;
      if (sensor.asked || !D || typeof D.requestPermission !== 'function') return;
      sensor.asked = true;
      try { D.requestPermission().then(() => {}).catch(() => {}); } catch (e) { /* niente sensori */ }
    }
    const inPedal = (x, y) => { const r = pedalEl.getBoundingClientRect(), sr = stage.getBoundingClientRect(); return x >= r.left - sr.left - 14 && x <= r.right - sr.left + 14 && y >= r.top - sr.top - 14; };
    function input(dt) {
      const m = mode();
      let tgt = 0, brake = !!keys.b, now = performance.now();
      if (keys.l || keys.r) tgt = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      else if (m === 'tilt') tgt = tiltSteer();
      let side = 0, held = 0, latest = -1;
      for (const q of ptrs.values()) {
        if (m === 'tilt' || q.pedal) { brake = true; continue; }
        if (q.t0 > latest) { latest = q.t0; side = q.x < W / 2 ? -1 : 1; held = (now - q.t0) / 1000; }
      }
      if (m === 'touch' && side && !(keys.l || keys.r)) tgt = side * Math.min(1, 0.42 + held * 2.4);
      steerV += (tgt - steerV) * Math.min(1, dt * (m === 'tilt' ? 16 : 11));
      brakeOn = brake;
      const use = useQ ? 1 : 0;
      useQ = false;
      return { steer: steerV, brake: brake ? 1 : 0, use };
    }
    function useItem() {
      if (!s || P.isOver(s) || paused || s.ready > 0 || !s.cars[0].it) return;
      useQ = true;
      itemBtn.classList.remove('press'); void itemBtn.offsetWidth; itemBtn.classList.add('press');
      later(() => itemBtn.classList.remove('press'), 150);
    }
    const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.onpointerdown = (e) => {
      if (!stage || !e.target.closest('.ry-stage')) return;
      if (e.target.closest('.ry-btn') || e.target.closest('.ry-end button')) return;
      e.preventDefault();
      if (HH.audio && HH.audio.unlock) HH.audio.unlock();
      if (pref === 'tilt') askPermission();
      if (!turnEl.hidden) return;
      if (paused) { resume(); return; }
      if (P.isOver(s)) return;
      // pulsante del power-up: non sterza e non frena
      if (e.target.closest('.ry-item')) { useItem(); return; }
      const [x, y] = local(e);
      ptrs.set(e.pointerId, { x, y, t0: performance.now(), pedal: inPedal(x, y) });
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ }
    };
    el.onpointermove = (e) => {
      const q = ptrs.get(e.pointerId);
      if (!q) return;
      const [x, y] = local(e);
      const ns = x < W / 2 ? -1 : 1, os = q.x < W / 2 ? -1 : 1;
      if (ns !== os) q.t0 = performance.now();
      q.x = x; q.y = y; q.pedal = inPedal(x, y);
    };
    el.onpointerup = el.onpointercancel = (e) => { ptrs.delete(e.pointerId); };
    el.oncontextmenu = (e) => { if (e.target.closest('.ry-stage')) e.preventDefault(); };
    el.onclick = (e) => {
      if (e.target.closest('.ry-pbtn')) { e.preventDefault(); sfx('tap'); toggle(); return; }
      if (e.target.closest('.ry-mode')) {
        e.preventDefault();
        pref = pref === 'tilt' ? 'touch' : 'tilt';
        try { if (HH.store && HH.store.set) HH.store.set('rally:ctl', pref); } catch (err) { /* niente salvataggio */ }
        if (pref === 'tilt') askPermission();
        sensor.zero = sensor.raw;
        renderMode(); sfx('tap');
        say(pref === 'tilt' ? L('ry_tilt') : L('ry_touch'), 'small', 1400);
        return;
      }
      // tastiera (Invio/spazio sul pulsante): il clic senza puntatore usa il power-up
      if (e.target.closest('.ry-item') && e.detail === 0) { e.preventDefault(); useItem(); return; }
      if (e.target.closest('.ry-retry')) { e.preventDefault(); restartRace(); }
    };
    function onKey(e) {
      if (!alive || !el.isConnected) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key in USEKEYS) {
        if (e.key === 'Enter' && e.target && e.target.closest && e.target.closest('button') && !e.target.closest('.ry-wrap')) return;
        e.preventDefault();
        if (paused) { resume(); return; }
        if (!e.repeat) useItem();
        return;
      }
      if (e.key in KEYS) {
        if (e.key === ' ' && e.target && e.target.closest && e.target.closest('button') && !e.target.closest('.ry-wrap')) return;
        e.preventDefault();
        if (paused) { resume(); return; }
        if (P.isOver(s)) return;
        keys[KEYS[e.key]] = true;
        return;
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (e.key === 'Escape') pause(); else toggle(); }
    }
    function onKeyUp(e) { if (e.key in KEYS) keys[KEYS[e.key]] = false; }
    function onVis() { if (document.hidden) pause(); }
    function onBlur() { keys = {}; ptrs.clear(); }
    function onFull() {
      if (!alive) return;
      const f = inFull();
      try {
        const so = G.screen && G.screen.orientation;
        if (f && so && so.lock) so.lock('landscape').catch(() => {});
        else if (!fsEl() && so && so.unlock) so.unlock();
      } catch (e) { /* non supportato */ }
      later(() => { measure(); checkTurn(); renderMode(); }, 120);
    }
    const coarse = () => !!(G.matchMedia && G.matchMedia('(pointer: coarse)').matches);
    function checkTurn() {
      if (!turnEl) return;
      const need = inFull() && !landscape() && coarse();
      if (need && turnEl.hidden) { turnEl.hidden = false; if (paused) pauseEl.hidden = true; else if (!P.isOver(s)) pause(); }
      else if (!need && !turnEl.hidden) { turnEl.hidden = true; if (paused) pauseEl.hidden = false; }
    }
    function onResize() { checkTurn(); renderMode(); }
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function onTheme() { if (!alive) return; themeAt = 0; }
    function detach() {
      alive = false;
      stop();
      G.removeEventListener('keydown', onKey);
      G.removeEventListener('keyup', onKeyUp);
      G.removeEventListener('blur', onBlur);
      G.removeEventListener('deviceorientation', onOrient);
      G.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.removeEventListener(ev, onFull));
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._ryRO) { el._ryRO.disconnect(); el._ryRO = null; }
      clearInterval(watch);
      clearTimers();
      engine(false);
      if (R3) {
        disposeWorld();
        try { R3.grad.dispose(); R3.renderer.dispose(); R3.renderer.forceContextLoss(); } catch (e) { /* già perso */ }
        R3 = null;
      }
    }
    if (el._ryDetach) el._ryDetach();
    el._ryDetach = detach;
    G.addEventListener('keydown', onKey);
    G.addEventListener('keyup', onKeyUp);
    G.addEventListener('blur', onBlur);
    G.addEventListener('deviceorientation', onOrient);
    G.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, onFull));
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);
    // l'app svuota #board quando si esce dal gioco: libera WebGL anche se la partita era in pausa
    const watch = setInterval(() => { if (!el.isConnected || (wrap && !wrap.isConnected)) detach(); else { checkTurn(); renderMode(); } }, 1000);

    /* ---------- suono del motore ---------- */
    function engine(on, p) {
      const A = audio();
      if (!A.engine) return;
      if (!on) { A.engine(false); return; }
      const v = Math.min(1.3, p.v / cfg.vmax);
      // tre marce: il motore sale e "cambia"
      const gear = v < 0.33 ? 0 : v < 0.66 ? 1 : 2, rpm = Math.min(1, (v - gear * 0.33) / 0.38 * 0.8 + 0.2 + gear * 0.06);
      A.engine(true, rpm, Math.min(1, (p.off ? 0.6 : 0) + Math.min(1, p.slide / 6) * 0.6 + (p.honey ? 0.3 : 0)), brakeOn && p.v > 3);
    }

    /* ---------- eventi della logica ---------- */
    const near3 = (id) => { const c = s.cars[id], cw = P.world(g, c.s, c.d); return Math.abs(c.s - s.cars[0].s) < 70 ? V3(cw.x, roadH(c.s, c.d, cw.x, cw.y) + 1, cw.y) : null; };
    function onEvent(e) {
      switch (e.type) {
        case 'count': lights(4 - e.n); sfx('blip'); break;
        case 'go': {
          lights(0); sfx('milestone');
          later(() => say(L('pa_go'), 'go', 700), 50);
          sensor.zero = sensor.raw;
          if (s.t < 0.5 && s.level <= 3) later(() => { if (!paused && !P.isOver(s)) say(L('ry_top3'), 'small', 1800); }, 1300);
          break;
        }
        case 'call': { const n = g.notes[e.i]; asfx('pace', n.kind === 'curve' ? n.dir : 0, n.kind === 'curve' ? n.g : 0); break; }
        case 'off': burst('leaf'); break;
        case 'boing': if (e.who === 0) { burst(cfg.theme === 'city' ? 'gift' : cfg.theme === 'snow' ? 'bubble' : 'leaf'); sfx('boing'); bumpAnim(); } break;
        case 'rock': if (e.who === 0) { burst('spark'); sfx('boing'); bumpAnim(); if (ctx.react) ctx.react('oops'); } break;
        case 'bump': burst('spark'); sfx('set'); bumpAnim(); break;
        case 'jump': sfx('pick'); break;
        case 'pass': if (e.up) { sfx('place'); changed(true); } else sfx('tap'); break;
        case 'check': {
          msgEl.innerHTML = `<div class="ry-cp">${FLAG}<span>${e.pos}°</span><span>${fmtT(s.t)}</span></div>`;
          msgEl.classList.add('show'); sfx('milestone');
          later(() => { if (msgEl.querySelector('.ry-cp')) msgEl.innerHTML = ''; }, 1700);
          break;
        }
        case 'box':
          if (e.who === 0 && e.it) {
            asfx('gift'); burst('gift');
            rollUntil = performance.now() + (reduce() ? 0 : 650); lastHud.it = -1;
            later(() => { if (!P.isOver(s) && s.cars[0].it) { const k = P.ITEMS[s.cars[0].it]; if (!seenPu[k] || s.level <= 2) say(L('ry_pu_' + k), 'pu', 1300); seenPu[k] = 1; } }, reduce() ? 0 : 680);
          }
          break;
        case 'use': {
          const meSelf = e.who === 0, at3 = meSelf ? null : near3(e.who);
          if (!meSelf && !at3) break;
          const snd = { carrot: 'zoom', bubble: 'bubble', banana: 'plop', honey: 'plop', cloud: 'puff', magnet: 'tink', spring: 'sproing' }[e.it];
          if (snd && (meSelf || at3)) asfx(snd);
          if (meSelf) { if (e.it === 'carrot') burst('carrot'); if (e.it === 'bubble') burst('bubble'); if (e.it === 'magnet') burst('acorn'); }
          else if (at3) burst(e.it === 'carrot' ? 'carrot' : e.it === 'cloud' ? 'petal' : 'spark', at3, 6);
          break;
        }
        case 'slip': if (e.who === 0) { asfx('whee'); if (ctx.react) ctx.react('oops'); } else { const at3 = near3(e.who); if (at3) { burst('spark', at3, 8); asfx('whee'); } } break;
        case 'honey': if (e.who === 0) { asfx('squish'); burst('honey'); } break;
        case 'cloud': if (e.who === 0) { asfx('puff'); burst('petal', null, 16); } else { const at3 = near3(e.who); if (at3) { burst('petal', at3, 12); asfx('puff'); } } break;
        case 'pop': { const at3 = e.who === 0 ? null : near3(e.who); if (e.who === 0 || at3) { asfx('pop'); burst('bubble', at3, 10); } break; }
        case 'acorn': if (e.who === 0) asfx('tink'); break;
        case 'spring': break;
        case 'finish': finish(); break;
        default: break;
      }
    }
    function bumpAnim() { if (reduce()) return; stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump'); }
    function finish() {
      over = performance.now();
      engine(false);
      ptrs.clear(); keys = {};
      fxoEl.className = 'ry-fxo';
      const rows = s.res.map((r, i) => `<li class="${r.id ? '' : 'me'}"><em>${i + 1}</em><i>${face(r.id, i === 0)}</i><span>${fmtT(r.t)}</span></li>`).join('');
      endEl.innerHTML = `<span class="ry-big">${s.pos}<small>/4</small></span><ol>${rows}</ol>${s.won ? '' : `<button class="candy ry-retry" type="button"><span>${L('retry')}</span></button>`}`;
      later(() => { endEl.hidden = false; }, 500);
      changed(true);
      if (s.won) { sfx('cupDone'); if (ctx.react) ctx.react('happy'); later(() => ctx.win(), (el._rally && el._rally.winDelay) || 2600); }
      else { sfx('lose'); if (ctx.react) ctx.react('oops'); }
    }

    /* ---------- ciclo ---------- */
    function loop(nowMs) {
      if (!alive) return;
      if (!el.isConnected) { detach(); return; }
      const dt = last ? Math.min(0.1, (nowMs - last) / 1000) : 0;
      last = nowMs;
      if (nowMs - themeAt > 1000) {
        themeAt = nowMs;
        if (readThemeChanged()) { buildWorld(); measure(); }
      }
      // qualità automatica: se i fotogrammi sono lenti cala la risoluzione (e risale se c'è margine)
      if (dt > 0) {
        if (dt > 1 / 38) { slowF++; fastF = 0; } else if (dt < 1 / 55) { fastF++; slowF = Math.max(0, slowF - 1); }
        if (slowF > 50 && pr > 0.6) { pr = Math.max(0.6, pr - 0.25); R3.renderer.setPixelRatio(pr); measure(); slowF = 0; }
        else if (fastF > 400 && pr < Math.min(1.5, G.devicePixelRatio || 1)) { pr = Math.min(1.5, pr + 0.25); R3.renderer.setPixelRatio(pr); measure(); fastF = 0; }
      }
      if (!paused && dt > 0 && !P.isOver(s) && !qaHold) {
        const ev = P.step(s, dt, input(dt));
        ev.forEach(onEvent);
        if (!P.isOver(s)) engine(s.ready <= 0, s.cars[0]);
        changed(false);
      }
      draw(dt);
      hud();
      const live = !paused && (!P.isOver(s) || nowMs - over < 4000);
      raf = live ? requestAnimationFrame(loop) : 0;
    }
    function readThemeChanged() { const was = themeKey; readTheme(); return themeKey !== was; }
    function start() { if (!raf && alive) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function pause() {
      if (paused || !s || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = !turnEl.hidden;
      pauseBtn.innerHTML = PLAY;
      ptrs.clear(); keys = {}; steerV = 0; useQ = false;
      engine(false);
      stop();
      if (R3) draw(0);
      ctx.changed();
    }
    function resume() {
      if (!paused || P.isOver(s) || !turnEl.hidden) return;
      paused = false;
      pauseEl.hidden = true;
      pauseBtn.innerHTML = PAUSE;
      // breve conto alla rovescia per rimettere le mani sul volante
      if (s.t > 0) { s.ready = 1.6; s.cd = 2; }
      sensor.zero = sensor.raw;
      sfx('set');
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop();
      clearTimers();
      s = state;
      g = P.geo(s);
      cfg = P.config(s.level);
      paused = false; over = 0; ptrs.clear(); keys = {}; steerV = 0; useQ = false; rollUntil = 0;
      lastHud = { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' };
      if (!wrap || !wrap.isConnected) build();
      wrap.dataset.stage = cfg.stage;
      wrap.dataset.time = cfg.time;
      endEl.hidden = true; endEl.innerHTML = '';
      pauseEl.hidden = true; pauseBtn.innerHTML = PAUSE;
      themeKey = '';
      if (!initGL()) {
        stage.insertAdjacentHTML('beforeend', `<div class="ry-veil"><b>${L('ry_nogl')}</b></div>`);
        return;
      }
      buildWorld();
      measure();
      themeAt = performance.now();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; pauseBtn.innerHTML = PLAY; draw(0); hud(); return; }
      msgEl.innerHTML = `<b class="small">${L('pa_ready')}</b>`; msgEl.classList.remove('show'); void msgEl.offsetWidth; msgEl.classList.add('show');
      start();
      checkTurn();
    }
    function fresh() { begin(P.newLevel(ctx.level, Math.random)); ctx.changed({ reset: true }); }
    function restartRace() { begin(P.newLevel(s.level, Math.random)); ctx.changed({ reset: true }); }

    // per i controlli di qualità (Playwright): stato vivo e "avanti veloce" con un autopilota semplice (eventi compresi)
    function ff(sec, o2 = {}) {
      const p = s.cars[0], ev = [];
      for (let t = 0; t < sec && !P.isOver(s); t += P.TICK) {
        const kt = P.kAt(g, p.s), want = (o2.d != null ? o2.d : 0) - p.d;
        const kReq = kt + (Math.max(-0.4, Math.min(0.4, want * 0.12)) - p.psi) * 1.6 / Math.max(8, p.v);
        const vt = g.prof[Math.min(g.N, Math.round(p.s + p.v * 1.2))] * (o2.k || 0.95);
        ev.push(...P.step(s, P.TICK, { steer: o2.steer != null ? o2.steer : Math.max(-1, Math.min(1, -kReq / P.KMAX)), brake: p.v > vt ? 1 : 0, use: useQ ? 1 : 0 }));
        useQ = false;
      }
      ev.forEach(onEvent);
      if (!raf) draw(0);
      hud();
      return ev.map((e) => e.type);
    }
    // QA: dà un power-up a qualcuno (0 = Hari) e lo usa subito se use
    function give(item, who = 0, use = false) {
      const c = s.cars[who];
      c.it = P.ITEMS.indexOf(item);
      if (use) { if (who === 0) useQ = true; else c.use = 1e-3; }
      lastHud.it = -1; hud();
      return c.it;
    }
    // hold(true): il tempo reale si ferma (per le foto dei controlli di qualità), ff() continua a funzionare
    el._rally = { state: () => s, geo: () => g, three: () => R3, mode, sensor, ff, give, use: useItem, pr: () => pr, draw: () => { draw(0); hud(); }, hold: (on) => { qaHold = !!on; } };
    const migrated = saved && typeof saved.seed === 'number' && saved.L > 0 && Array.isArray(saved.cars) && saved.cars.length === 4 ? P.migrate(saved) : null;
    if (migrated && !P.isOver(migrated)) begin(migrated, true);
    else fresh();

    return {
      fresh,
      restart: restartRace,
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },
      resume() { resume(); },
      snapshot: () => s,
    };
  }

  /* tutorial della prima partita */
  const puRow = (x, y, k, list) => list.map((n, i) => `<g class="ry-tut-gift" style="animation-delay:${(i * 0.15).toFixed(2)}s"><svg x="${x + i * 17 * k}" y="${y}" width="${16 * k}" height="${16 * k}" viewBox="0 0 48 48">${PU_ART[n]}</svg></g>`).join('');
  const TUT = [
    { key: 'tu_rally_1', en: 'Hari speeds up by himself: you steer and brake! In full screen turn the phone sideways and tilt it like a wheel, hold anywhere to brake. Or touch left/right and use the pedal. Arrows and space work too.',
      art: forest(`${hood(`<g class="ry-tut-wheel">${miniWheel()}</g>`)}
        <g transform="translate(18 14)"><g class="ry-tut-wheel"><rect x="-10" y="-6" width="20" height="12" rx="3" fill="var(--card-solid)" ${o(1.2)}/><rect x="-7" y="-4" width="14" height="8" rx="1.5" fill="var(--ry-sky-1)"/></g></g>
        <g transform="translate(22 76)"><rect x="-8" y="-7" width="16" height="14" rx="4" fill="var(--ry-stop)" ${o(1.2)}/><path d="M-4 -2h8M-4 2h8" stroke="var(--ry-hi)" stroke-width="1.6" stroke-linecap="round"/></g>`) },
    { key: 'tu_rally_2', en: 'Read the pace notes: the arrow and the number say how tight the next bend is. 6 is almost straight, 1 is a hairpin: brake before the small numbers! The yellow triangle means caution.',
      art: forest(`<g class="ry-tut-note">${noteArt(36, 8, 1.6, 1, 2, `<svg x="2" y="18" width="7" height="7" viewBox="0 0 24 24">${IC.warn}</svg>`)}</g>${hood(miniWheel())}`) },
    { key: 'tu_rally_4', en: 'Drive through the surprise gifts to get a power-up, then tap the big button (or ↑) to use it: carrot turbo, bubble shield, banana peel or honey puddle to leave behind, flower cloud for whoever is ahead, acorn magnet and spring jump. Acorns make you a bit faster!',
      art: forest(`<g class="ry-tut-gift">${giftArt(44, 44, 0.34)}</g>${puRow(10, 12, 1, ['carrot', 'bubble', 'banana', 'honey'])}${puRow(28, 30, 1, ['cloud', 'magnet', 'spring'])}${hood(miniWheel())}`) },
    { key: 'tu_rally_3', en: 'Race Bunny, Fox and Panda through forests, cities, seaside roads and snowy mountains, by day and by night, and finish in the top 3! Off the road you slow down, edges are soft and bumps are just a little push.',
      art: forest(`<g class="ry-tut-car">${carBack(46, 58, 0.42, 'var(--ry-bunny-car)', 'bunny')}${carBack(74, 54, 0.36, 'var(--ry-fox-car)', 'fox')}${carBack(60, 50, 0.28, 'var(--ry-panda-car)', 'panda')}</g>
        <g transform="translate(10 8)"><rect x="0" y="8" width="8" height="10" fill="var(--ry-silver)" ${o(1)}/><rect x="8" y="2" width="8" height="16" fill="var(--ry-gold)" ${o(1)}/><rect x="16" y="11" width="8" height="7" fill="var(--ry-bronze)" ${o(1)}/></g>${hood(miniWheel())}`) },
  ];
  HH.games.push({
    id: 'rally', name: 'Hari Rally', rules: 'r14',
    rulesEn: 'First-person rally through forests, cities, seaside and snow, by day and by night: Hari speeds up by himself, you steer and brake. Follow the pace notes (6 = fast bend, 1 = hairpin), drive through surprise gifts for silly power-ups and finish in the top 3 against Bunny, Fox and Panda. In full screen turn the phone and tilt it to steer!',
    art, create,
    tutorial: TUT,
    rate: (s) => HH.rally.rate(s),
    parTime: (s) => HH.rally.par(s),
    progress: (s) => HH.rally.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
