/* Hari Rally — interfaccia 3D (three.js r160, copia locale in src/vendor/three.min.js, scaricata solo aprendo il gioco).
 * Visuale in terza persona (predefinita, stile kart): camera a molla dietro e sopra il kart-fragola di Hari, con Hari
 * al volante (si inclina in curva, festeggia); visuale pilota a scelta (cofano a fragola, cruscotto SVG col volante e le
 * zampine). Kart a forma di frutto: fragola (Hari), pesca (Coniglietta), mandarino (Volpe), fetta d'anguria (Panda), con
 * sospensioni, foglia-spoiler che sventola, faretti la notte, ombra e LOD da lontano.
 * Ambientazioni a rotazione (bosco, città, mare, neve) di giorno, al tramonto e di notte: strade sterrate o asfaltate
 * con marciapiedi e strisce, ponti, gallerie, guardrail a imbuto, curve paraboliche, dossi; fascia fuori strada con
 * alberi, rocce, ceppi, cespugli, pini, cumuli e pupazzi (gli stessi cerchi della logica); transenne, staccionate e
 * muretti dove la logica ha i muri veri; palazzi, negozi, lampioni, spiaggia, faro, porticciolo, chalet, animaletti.
 * Cel shading: MeshToonMaterial con rampa a 3 toni e contorni "a guscio rovesciato". Colori solo dai token --ry-*
 * (getComputedStyle → THREE.Color); tema scuro = notte.
 * Collisioni coerenti con la grafica: i kart sono costruiti con P.CAR_L × P.CAR_W e messi nella posa della logica
 * (P.pose: la stessa con cui la logica risolve le collisioni nel mondo, nessuna interpolazione); ostacoli col loro
 * raggio; muri dove la logica ferma il rettangolo (P.edgeAt, P.sideAt). In visuale pilota la camera sta EYE_BACK dietro
 * il centro del kart così il bordo del cofano coincide col muso del rettangolo.
 * Prestazioni da telefono: pixel ratio ≤ 1,5 (cala da solo se gli fps scendono), nebbia, scenario a blocchi di 120 m
 * costruiti mentre ci si avvicina e nascosti da lontano, oggetti numerosi con InstancedMesh, il resto fuso in una
 * geometria per blocco (2 draw call), terreno a griglia che segue la camera.
 *
 * Comandi: pedale destro = acceleratore, pedale sinistro = freno (da fermi retromarcia), pulsante del power-up sopra
 *   l'acceleratore (tocco multiplo). Sterzo coi sensori (schermo intero, telefono girato: inclinalo come un volante),
 *   oppure frecce ◀ ▶ o trascinamento. Tastiera: ↑/W acceleratore, ↓/S freno, ←→/A-D sterzo, spazio/E/Invio power-up,
 *   C/V visuale, P/Esc pausa. In alto a destra: visuale, sensori ↔ tocco, pausa; nel menu di pausa anche
 *   l'acceleratore automatico (acceso di base solo al livello 1).
 * Pausa automatica a pagina nascosta, col tutorial e col telefono in verticale a schermo intero.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    ry_board: 'Rally: accelerate, brake, steer and use power-ups', ry_turn: 'Turn your phone sideways', ry_tilt: 'Tilt to steer', ry_touch: 'Touch to steer',
    ry_gas: 'Accelerate', ry_auto: 'Automatic speed', ry_cam_chase: 'Chase view', ry_cam_pilot: 'Driver view', ry_rescue: 'Back on the road!', ry_mini: 'Mini boost!',
    ry_brake: 'Brake', ry_top3: 'Finish in the top 3!', ry_nogl: 'This game needs 3D graphics (WebGL).',
    ry_item: 'Use power-up', ry_acorns: 'Acorns',
    ry_pu_carrot: 'Carrot turbo!', ry_pu_bubble: 'Bubble shield!', ry_pu_banana: 'Banana peel!', ry_pu_honey: 'Honey puddle!',
    ry_pu_cloud: 'Flower cloud!', ry_pu_magnet: 'Acorn magnet!', ry_pu_spring: 'Spring jump!',
    // a due giocatori (rete locale e schermo diviso)
    ry_mp: 'Play together', ry_mp_net: 'Two phones', ry_mp_split: 'Split screen', ry_mp_pick: 'Choose your kart',
    ry_mp_wait: 'Waiting for your friend…', ry_mp_host: 'Waiting for the host…', ry_mp_lost: 'Connection lost: you are racing alone',
    ry_mp_left: 'Your friend left: the computer drives their kart', ry_mp_win: 'Team victory!', ry_mp_lose: 'So close! Race again?',
    ry_mp_again: 'Rematch', ry_mp_solo: 'Play alone', ry_mp_rule: 'Win together: one of you must finish first!',
    ry_mp_nosplit: 'Split screen needs a bigger, faster device', ry_mp_nonet: 'Two-phone play is not available yet',
    ry_mp_p2: 'Player 2', ry_mp_keys: 'Player 1: arrows and Enter · Player 2: W A S D and Space',
    ry_who_bunny: 'Bunny', ry_who_fox: 'Fox', ry_who_panda: 'Panda', ry_who_kitty: 'Kitty',
    // già tradotte (Hari Parade, Hari Home, comuni)
    lf_cancel: 'Cancel',
    pa_ready: 'Ready?', pa_go: 'Go!', pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_pause: 'Pause', retry: 'Try again', pa_left: 'Left', pa_right: 'Right',
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
    // Micia (la quinta pilota, sul kart-mela: la sceglie il secondo giocatore)
    kitty: (j) => `<path d="M21 52L25 14L49 34Z" fill="var(--ry-kitty)" ${o(2)}/><path d="M28 42L29 24L42 34Z" fill="var(--ry-kitty-in)"/>
      <path d="M79 52L75 14L51 34Z" fill="var(--ry-kitty)" ${o(2)}/><path d="M72 42L71 24L58 34Z" fill="var(--ry-kitty-in)"/>
      <ellipse cx="50" cy="60" rx="30" ry="26" fill="var(--ry-kitty)" ${o(2.4)}/><path d="M43 37l2 7M50 35v8M57 37l-2 7" stroke="var(--ry-kitty-3)" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="50" cy="71" rx="12" ry="8" fill="var(--ry-kitty-2)"/>${eyes(50, 57, 11, j)}<path d="M46.8 66h6.4l-3.2 3.2z" fill="var(--ry-kitty-in)"/>
      <path d="M31 69H18M31 73l-12 3.4M69 69h13M69 73l12 3.4" stroke="var(--ry-ink)" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`,
  };
  const WHO = ['hari', 'bunny', 'fox', 'panda'];
  // personaggi (anche la Micia, a due giocatori), il loro kart-frutto e il loro colore negli indicatori
  const CHARS = ['hari', 'bunny', 'fox', 'panda', 'kitty'];
  const FRUITW = { hari: 'straw', bunny: 'peach', fox: 'mand', panda: 'melon', kitty: 'apple' };
  const CCOLW = { hari: 'var(--ry-me)', bunny: 'var(--ry-p1)', fox: 'var(--ry-p2)', panda: 'var(--ry-p3)', kitty: 'var(--ry-p4)' };
  const CCOL = WHO.map((w) => CCOLW[w]);
  const faceW = (w, j) => `<svg viewBox="0 0 100 100" aria-hidden="true">${FACE[w](j)}</svg>`;

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
  const GAS = '<svg viewBox="0 0 40 52" aria-hidden="true"><rect x="7" y="3" width="26" height="46" rx="9" fill="currentColor" opacity=".25"/><rect x="7" y="3" width="26" height="46" rx="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M13 14h14M13 22h14M13 30h14M13 38h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const CAM = {
    chase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5Q12 15 20.5 20.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".6"/><rect x="5.5" y="11" width="13" height="6" rx="3" fill="currentColor"/><circle cx="12" cy="7.5" r="3.2" fill="currentColor"/><rect x="5" y="15.5" width="3.4" height="3" rx="1.2" fill="currentColor"/><rect x="15.6" y="15.5" width="3.4" height="3" rx="1.2" fill="currentColor"/></svg>',
    pilot: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M4 11.2h16M12 12v8" stroke="currentColor" stroke-width="2.6"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>',
  };
  const AUTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7.5" y="2.5" width="9" height="15" rx="3.4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10.4 7h3.2M10.4 10h3.2M10.4 13h3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 20.5q7-3.4 14 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M16.6 17.6l2.6 2.9-3.6 1.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DUO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="9" width="9" height="5" rx="2.5" fill="currentColor"/><circle cx="6" cy="6" r="2.6" fill="currentColor"/><rect x="13.5" y="9" width="9" height="5" rx="2.5" fill="currentColor" opacity=".7"/><circle cx="18" cy="6" r="2.6" fill="currentColor" opacity=".7"/><path d="M3 18.5h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 3"/></svg>';
  const PHONES = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="8" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="5" width="8" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 9.5q1.5-1.5 3 0M9.6 7.4q2.4-2.4 4.8 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const SPLIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v16" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="13" r="2" fill="currentColor"/><circle cx="17" cy="13" r="2" fill="currentColor" opacity=".7"/></svg>';
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
  // kart-frutto visto da dietro (card e tutorial): fragola, pesca, mandarino, fetta d'anguria, col pilota che spunta
  const dots = (pts, c, r = 1) => pts.map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="${f1(r * 0.8)}" ry="${f1(r * 1.15)}" fill="var(--ry-${c})"/>`).join('');
  const leafFan = (cx, cy, n, len, a0, a1) => Array.from({ length: n }, (_, i) => { const a = a0 + ((a1 - a0) * i) / Math.max(1, n - 1); return `<ellipse cx="${cx}" cy="${f1(cy - len / 2)}" rx="${f1(len * 0.28)}" ry="${f1(len / 2)}" transform="rotate(${f1(a)} ${cx} ${cy})" fill="var(--ry-kleaf)" ${o(1.1)}/>`; }).join('');
  const BACK = {
    straw: () => `<path d="M-13 -3C-13 -11 13 -11 13 -3C13 4 5 9 0 9C-5 9 -13 4 -13 -3Z" fill="var(--ry-straw)" ${o(1.4)}/>${dots([[-7, -3], [0, -6], [7, -3], [-4, 2], [4, 2], [0, 6], [-9, 1], [9, 1]], 'seed', 0.9)}`,
    peach: () => `<ellipse cx="0" cy="-1" rx="13" ry="10" fill="var(--ry-peach)" ${o(1.4)}/><ellipse cx="-5" cy="1" rx="6" ry="5" fill="var(--ry-peach-2)" opacity=".55"/><path d="M1 -11Q-2 -1 1 9" fill="none" stroke="var(--ry-peach-2)" stroke-width="1.6" stroke-linecap="round"/>`,
    mand: () => `<ellipse cx="0" cy="-0.5" rx="13.5" ry="9.5" fill="var(--ry-mand)" ${o(1.4)}/>${[[-8, -3], [-3, 3], [3, -4], [8, 2], [0, 6], [-9, 4], [6, -1]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r=".7" fill="var(--ry-mand-2)"/>`).join('')}`,
    melon: () => `<path d="M-14 7A14 14 0 0 1 14 7Z" fill="var(--ry-melon-rind)" ${o(1.4)}/><path d="M-12 7A12 12 0 0 1 12 7Z" fill="var(--ry-melon-w)"/><path d="M-10.6 7A10.6 10.6 0 0 1 10.6 7Z" fill="var(--ry-melon)"/>${dots([[-6, 3], [-2, -1], [3, 0], [6, 4], [0, 4], [-3, -4.5], [3, -5]], 'mseed', 0.8)}`,
    apple: () => `<path d="M0 -8C-4 -11 -13.5 -10 -13.5 -1C-13.5 6 -6 9.5 0 8.4C6 9.5 13.5 6 13.5 -1C13.5 -10 4 -11 0 -8Z" fill="var(--ry-apple)" ${o(1.4)}/><ellipse cx="-6.5" cy="-3" rx="3" ry="4.2" fill="var(--ry-apple-2)" opacity=".75"/><ellipse cx="7" cy="2" rx="3.4" ry="2.2" fill="var(--ry-apple-3)" opacity=".55"/>`,
  };
  // spoiler a foglia (davanti al pilota, visto da dietro)
  const SPOIL = {
    straw: () => leafFan(0, -7, 5, 9, -70, 70),
    peach: () => `<path d="M2 -9v-4" stroke="var(--ry-trunk)" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="7" cy="-13" rx="2.6" ry="6" transform="rotate(60 2 -11)" fill="var(--ry-kleaf)" ${o(1.1)}/>`,
    mand: () => `<path d="M0 -9v-3" stroke="var(--ry-kleaf-2)" stroke-width="1.8" stroke-linecap="round"/>${leafFan(0, -11, 2, 8, -60, 60)}`,
    melon: () => `<path d="M0 -7q-3-3 0-5t0-5" fill="none" stroke="var(--ry-melon-rind-2)" stroke-width="1.4" stroke-linecap="round"/>${leafFan(0, -10, 1, 7, 40, 40)}`,
    apple: () => `<path d="M0 -8.5v-4.5" stroke="var(--ry-trunk)" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="4.4" cy="-13" rx="2.4" ry="5" transform="rotate(58 3.4 -12)" fill="var(--ry-kleaf)" ${o(1.1)}/>`,
  };
  const kartBack = (x, y, k, id, tilt = 0) => kartBackW(x, y, k, WHO[id], tilt);
  const kartBackW = (x, y, k, w, tilt = 0) => `<g transform="translate(${x} ${y}) scale(${k}) rotate(${tilt})">
    <ellipse cx="0" cy="10" rx="16" ry="3" fill="var(--ry-shadow)" opacity=".25"/>
    <rect x="-16" y="1" width="6.5" height="9" rx="2.6" fill="var(--ry-tire)" ${o(1.2)}/><rect x="9.5" y="1" width="6.5" height="9" rx="2.6" fill="var(--ry-tire)" ${o(1.2)}/>
    <rect x="-12" y="3" width="24" height="4" rx="2" fill="var(--ry-chassis)" ${o(1.1)}/>
    ${BACK[FRUITW[w]]()}<svg x="-8.5" y="-25" width="17" height="17" viewBox="0 0 100 100">${FACE[w](false)}</svg>${SPOIL[FRUITW[w]]()}
    <rect x="-11" y="-1" width="3.4" height="2" rx="1" fill="var(--ry-tail)"/><rect x="7.6" y="-1" width="3.4" height="2" rx="1" fill="var(--ry-tail)"/></g>`;
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
  // pedali e frecce piccoli per il tutorial
  const pedalArt = (x, y, k, gas) => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-6" y="${gas ? -11 : -7}" width="12" height="${gas ? 22 : 14}" rx="4" fill="var(${gas ? '--ry-go' : '--ry-stop'})" ${o(1.2)}/>${(gas ? [-6, -2, 2, 6] : [-3, 1, 5]).map((q) => `<path d="M-3 ${q - (gas ? 0 : 1)}h6" stroke="var(--ry-hi)" stroke-width="1.4" stroke-linecap="round"/>`).join('')}</g>`;
  const arrowArt = (x, y, k, d) => `<g transform="translate(${x} ${y}) scale(${k})"><circle r="7" fill="var(--ry-note)" ${o(1.1)}/><path d="${d > 0 ? 'M-2 -4l4 4-4 4' : 'M2 -4l-4 4 4 4'}" fill="none" stroke="var(--ry-arrow)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const noteArt = (x, y, k, dir, g, extra = '') => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="0" y="0" width="30" height="26" rx="6" fill="var(--ry-note)" stroke="var(--ry-note-line)" stroke-width="1.4"/>
    <svg x="2" y="3" width="20" height="18" viewBox="0 0 60 48">${arrow(dir, g)}</svg><text x="26" y="12" text-anchor="end" font-size="11" font-weight="900" fill="var(--ry-arrow)" stroke="var(--ry-note)" stroke-width="2" paint-order="stroke">${g}</text>${extra}</g>`;
  const giftArt = (x, y, k) => `<svg x="${x}" y="${y}" width="${48 * k}" height="${48 * k}" viewBox="0 0 48 48">${PU_ART.gift}</svg>`;
  const art = () => forest(`${giftArt(40, 49, 0.24)}${kartBack(70, 55, 0.5, 1)}${kartBack(58, 76, 0.95, 0)}${noteArt(84, 7, 1, -1, 3)}`);

  /* ---------- utilità ---------- */
  let rmAt = -1e9, rmVal = false;
  const reduce = () => { const n = Date.now(); if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); } return rmVal; };
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  // tastiera: ↑/W acceleratore, ↓/S freno (e retromarcia), ←→/A-D sterzo; spazio, E o Invio power-up; C/V visuale
  const KEYS = { ArrowLeft: 'l', ArrowRight: 'r', a: 'l', d: 'r', A: 'l', D: 'r', ArrowDown: 'b', s: 'b', S: 'b', ArrowUp: 'g', w: 'g', W: 'g' };
  const USEKEYS = { ' ': 1, Enter: 1, e: 1, E: 1 };
  const fmtT = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), sec = t - m * 60; return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`; };
  const PITCH = Math.atan(0.45 / 12);   // la camera guarda appena in giù
  const COLS = ['ink', 'sky-1', 'sky-2', 'sun', 'cloud', 'hill', 'grass', 'grass-2', 'verge', 'dirt', 'dirt-2', 'dirt-3', 'wood', 'wood-2', 'water', 'water-2',
    'trunk', 'leaf-1', 'leaf-2', 'leaf-3', 'pine', 'pine-2', 'snow-cap', 'rock', 'rock-2', 'cap', 'cap-dot', 'stem', 'flower-1', 'flower-2', 'flower-3', 'bush', 'shaft',
    'chevron', 'chevron-2', 'check-1', 'check-2', 'pole', 'flag', 'car', 'car-2', 'trim', 'tire', 'glass', 'head', 'tail',
    'straw', 'straw-2', 'seed', 'kleaf', 'kleaf-2', 'peach', 'peach-2', 'mand', 'mand-2', 'melon', 'melon-w', 'melon-rind', 'melon-rind-2', 'mseed', 'chassis', 'shadow',
    'quill', 'quill-2', 'face', 'ear', 'paw', 'nose', 'hi', 'wheel',
    'bunny', 'bunny-in', 'fox', 'fox-2', 'panda', 'panda-2', 'apple', 'apple-2', 'apple-3', 'kitty', 'kitty-2', 'kitty-3', 'kitty-in', 'dust', 'leafp', 'spark', 'nsky-1', 'nsky-2', 'nsun', 'nhill',
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
    let wrap, stage, cv, needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pauseEl, endEl, turnEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl, optsEl, mpEl, glErr = false;
    let W = 300, H = 400, pr = 1, slowF = 0, fastF = 0;
    // tasti: KS[0] = giocatore 1, KS[1] = giocatore 2 (schermo diviso: frecce e WASD separati)
    const KS = [{}, {}];
    let keys = KS[0], ptrs = new Map(), steerV = 0, brakeOn = false, gasOn = false, hdgS = null, camRoll = 0, useQ = false, fovK = 0, shake = 0, lastDrawn = null;
    const clearKeys = () => { for (const k of KS) for (const x in k) delete k[x]; };
    /* a due giocatori: ME = kart di chi guarda (0 = Hari; 1 = l'ospite in rete o il giocatore 2 sullo schermo diviso).
     * mpMode: '' (singolo), 'split' (schermo diviso), 'host' o 'guest' (rete locale, net = controllo di HH.rallyNet).
     * Sullo schermo diviso ogni vista (views[i]) ha la sua camera, il suo terreno, i suoi indicatori e i suoi comandi:
     * inView(i, fn) scambia le variabili della vista corrente (camera a molla, sterzo, pedali, elementi HTML) e chiama fn.
     * La partita a due non si salva: solo = la gara in singolo messa da parte, che si riprende uscendo (o riaprendo). */
    let ME = 0, VI = 0, views = [], mpMode = '', net = null, solo = null, quiet = false, fno = 0, mpBusy = false;
    const sget = (k, d) => { try { const v = HH.store && HH.store.get && HH.store.get(k); return v === undefined || v === null ? d : v; } catch (e) { return d; } };
    const sset = (k, v) => { try { if (HH.store && HH.store.set) HH.store.set(k, v); } catch (e) { /* niente salvataggio */ } };
    let pref = sget('rally:ctl', 'tilt');
    // visuale: 'chase' (terza persona, predefinita) o 'pilot'; acceleratore automatico: scelta salvata, altrimenti
    // acceso solo al livello 1 (si impara prima a sterzare), spento dal 2 (si guida coi pedali)
    let camPref = sget('rally:cam', 'chase') === 'pilot' ? 'pilot' : 'chase';
    let autoPref = sget('rally:auto', null);
    const autoGas = () => (autoPref === null ? !!(cfg && cfg.autoGas) : !!autoPref);
    // camera da dietro: posizione e velocità della molla, punto guardato
    let CH = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, lx: 0, ly: 0, lz: 0, ok: false };
    const sensor = { at: 0, raw: 0, zero: 0, val: 0, asked: false };
    let lastHud = { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' };
    let rollUntil = 0, seenPu = {}, qaHold = false, qaAuto = false;
    // (sullo schermo diviso il callback gira nella vista in cui è stato chiesto)
    const later = (fn, ms) => { const vi = VI; const id = setTimeout(() => (views.length > 1 && views[vi] ? inView(vi, fn) : fn()), ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const sfx = (k, ...a) => { if (!quiet && ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };
    const audio = () => HH.audio || {};
    const asfx = (k, ...a) => { const A = audio(); if (!quiet && A.sfx && typeof A.sfx[k] === 'function') A.sfx[k](...a); };
    // personaggi e umani (a due: s.who, s.hu)
    const whoOf = (id) => (s && s.who ? s.who[id] : WHO[id]);
    const face = (id, j) => faceW(whoOf(id), j);
    const colOf = (id) => CCOLW[whoOf(id)];
    const isHum = (id) => (s && s.hu ? s.hu.indexOf(id) >= 0 : id === 0);
    const split = () => views.length > 1;
    const posMe = () => (s ? P.posOf(s, ME) : 4);

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
          ${hudHTML(0)}
          <div class="ry-veil ry-pause" hidden><span class="ry-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small>
            <div class="ry-opts">
              <button class="ry-opt" type="button" data-opt="cam"></button>
              <button class="ry-opt" type="button" data-opt="auto">${AUTO}<span>${L('ry_auto')}</span><i class="ry-sw" aria-hidden="true"></i></button>
              <button class="ry-opt" type="button" data-opt="ctl"></button>
              <button class="ry-opt ry-mpopt" type="button" data-opt="mp">${DUO}<span>${L('ry_mp')}</span></button>
            </div></div>
          <div class="ry-veil ry-turn" hidden>${PHONE}<b>${L('ry_turn')}</b></div>
          <div class="ry-veil ry-end" hidden></div>
          <div class="ry-veil ry-mpv" hidden></div>
        </div></div>`;
      wrap = el.querySelector('.ry-wrap');
      stage = el.querySelector('.ry-stage');
      cv = el.querySelector('.ry-cv');
      pauseEl = el.querySelector('.ry-pause');
      endEl = el.querySelector('.ry-end');
      turnEl = el.querySelector('.ry-turn');
      optsEl = el.querySelector('.ry-opts');
      mpEl = el.querySelector('.ry-mpv');
      hudEls(el.querySelector('.ry-v'));
      renderMode();
      if (G.ResizeObserver) {
        if (el._ryRO) el._ryRO.disconnect();
        el._ryRO = new G.ResizeObserver(() => measure());
        el._ryRO.observe(stage);
      }
    }
    // indicatori e comandi di una vista (sullo schermo diviso ce ne sono due, ognuno nella sua metà)
    function hudHTML(vi) {
      const GAUGE = `<svg viewBox="-24 -24 48 48" aria-hidden="true"><circle r="21" fill="var(--ry-gauge)" ${o(2.4)}/><path d="M-14 6A15 15 0 1 1 14 6" fill="none" stroke="var(--ry-dash-2)" stroke-width="3" stroke-dasharray="2 4"/><g class="ry-needle2"><path d="M0 0L-12 -6" stroke="var(--ry-needle)" stroke-width="3.4" stroke-linecap="round"/></g><circle r="3.6" fill="var(--ry-ink)"/></svg>`;
      return `<div class="ry-v" data-v="${vi}">
          <div class="ry-fxo" aria-hidden="true"></div>
          <div class="ry-dash">${DASH}</div>
          <div class="ry-prog" aria-hidden="true">${[3, 2, 1, 0].map((i) => `<i class="${i ? '' : 'me'}" data-id="${i}" style="--ry-c:${CCOL[i]}"></i>`).join('')}<b>${FLAG}</b></div>
          <div class="ry-top">
            <div class="ry-left"><div class="ry-pos" role="status"><b>4</b><small>/4</small></div><div class="ry-rank" aria-hidden="true"></div></div>
            <div class="ry-notes" aria-live="polite"></div>
            <div class="ry-right"><div class="ry-btns">
              <button class="ry-btn ry-mpbtn" type="button" aria-label="${L('ry_mp')}" title="${L('ry_mp')}">${DUO}</button>
              <button class="ry-btn ry-cam" type="button"></button>
              <button class="ry-btn ry-mode" type="button"></button>
              <button class="ry-btn ry-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button></div>
              <div class="ry-time">0:00.0</div>
              <div class="ry-acorn" role="img" aria-label="${L('ry_acorns')}: 0">${ACORN}<b>0</b></div></div>
          </div>
          <div class="ry-spd" aria-hidden="true">${GAUGE}</div>
          <div class="ry-ctl">
            <div class="ry-arr l" role="img" aria-label="${L('pa_left')}">${ZONE(-1)}</div>
            <div class="ry-arr r" role="img" aria-label="${L('pa_right')}">${ZONE(1)}</div>
            <div class="ry-ped brake" role="img" aria-label="${L('ry_brake')}">${PEDAL}</div>
            <div class="ry-ped gas" role="img" aria-label="${L('ry_gas')}">${GAS}<span class="ry-auto">${AUTO}</span></div>
          </div>
          <button class="ry-item empty" type="button" aria-label="${L('ry_item')}">${puSvg('gift')}</button>
          <div class="ry-msg" aria-live="polite"></div>
        </div>`;
    }
    function hudEls(v) {
      const q = (sel) => v.querySelector(sel);
      needle = q('.ry-needle'); wheelG = q('.ry-wheelg'); posEl = q('.ry-pos'); rankEl = q('.ry-rank'); timeEl = q('.ry-time');
      notesEl = q('.ry-notes'); progEl = q('.ry-prog'); msgEl = q('.ry-msg'); pedalEl = q('.ry-ped.brake'); gasEl = q('.ry-ped.gas');
      arrL = q('.ry-arr.l'); arrR = q('.ry-arr.r'); modeBtn = q('.ry-mode'); camBtn = q('.ry-cam'); pauseBtn = q('.ry-pbtn');
      itemBtn = q('.ry-item'); acornEl = q('.ry-acorn'); fxoEl = q('.ry-fxo'); spdEl = q('.ry-needle2');
    }
    /* ---------- viste (schermo diviso) ---------- */
    function saveV(v) {
      Object.assign(v, { ME, CH, hdgS, camRoll, fovK, shake, baseFov, steerV, gasOn, brakeOn, useQ, rollUntil, seenPu, lastHud, keys });
      v.el = { needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl };
      if (R3) { v.cam = R3.camera; v.ground = R3.ground; }
    }
    function loadV(v) {
      ({ ME, CH, hdgS, camRoll, fovK, shake, baseFov, steerV, gasOn, brakeOn, useQ, rollUntil, seenPu, lastHud, keys } = v);
      ({ needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl } = v.el);
      if (R3) { if (v.cam) R3.camera = v.cam; if (v.ground) R3.ground = v.ground; }
    }
    function inView(i, fn) {
      if (views.length < 2 || i === VI || !views[i]) return fn();
      saveV(views[VI]); loadV(views[i]); VI = i;
      return fn();
    }
    const eachView = (fn) => { if (views.length < 2) return fn(0); for (let i = 0; i < views.length; i++) inView(i, () => fn(i)); inView(0, () => 0); return 0; };
    // vista che guarda il kart id (-1 se nessuna)
    const viewOf = (id) => (views.length < 2 ? (id === ME ? 0 : -1) : views.findIndex((v, i) => (i === VI ? ME : v.ME) === id));
    // schermo diviso: due viste (giocatore 1 e 2), ognuna con camera, terreno e indicatori; one = torna a una vista
    function setViews(n) {
      if (n === views.length || (n < 2 && views.length < 2)) return;
      inView(0, () => 0);
      wrap.querySelectorAll('.ry-v[data-v="1"]').forEach((x) => x.remove());
      if (n < 2) {
        if (views[1] && views[1].ground && R3 && R3.scene) R3.scene.remove(views[1].ground.m);
        views = []; VI = 0; ME = 0; keys = KS[0];
        wrap.classList.remove('ry-split');
        const v0 = wrap.querySelector('.ry-v'); v0.style.cssText = '';
        return;
      }
      const v0 = {}; saveV(v0);
      stage.querySelector('.ry-v').insertAdjacentHTML('afterend', hudHTML(1));
      const v1 = { ME: 1, CH: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, lx: 0, ly: 0, lz: 0, ok: false }, hdgS: null, camRoll: 0, fovK: 0, shake: 0, baseFov: 64, steerV: 0, gasOn: false, brakeOn: false, useQ: false, rollUntil: 0, seenPu: {}, lastHud: { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' }, keys: KS[1] };
      const cur = { needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl };
      hudEls(stage.querySelector('.ry-v[data-v="1"]'));
      v1.el = { needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl };
      ({ needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pedalEl, gasEl, arrL, arrR, modeBtn, camBtn, pauseBtn, itemBtn, acornEl, fxoEl, spdEl } = cur);
      if (R3) v1.cam = new T.PerspectiveCamera(66, 1, 0.1, 900);
      views = [v0, v1]; VI = 0;
      wrap.classList.add('ry-split');
    }
    // capace di due viste 3D? (telefoni piccoli o lenti: no)
    function splitOK() {
      const nav = G.navigator || {}, cores = nav.hardwareConcurrency || 4, mem = nav.deviceMemory || 4;
      const a = Math.max(G.innerWidth || 0, G.innerHeight || 0), b = Math.min(G.innerWidth || 0, G.innerHeight || 0);
      return (cores >= 4 && mem >= 3 && a >= 640 && b >= 320) || !!(el._rally && el._rally.forceSplit);
    }

    /* ---------- 3D: renderer e materiali ---------- */
    function initGL() {
      if (R3) return true;
      if (!T) { glErr = true; return false; }
      let renderer;
      try {
        renderer = new T.WebGLRenderer({ canvas: cv, antialias: (G.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
      } catch (e) { glErr = true; return false; }
      pr = Math.min(prMax(), G.devicePixelRatio || 1);
      renderer.setPixelRatio(pr);
      const grad = new T.DataTexture(new Uint8Array([128, 128, 128, 255, 196, 196, 196, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
      const camera = new T.PerspectiveCamera(66, 1, 0.1, 900);
      R3 = { renderer, camera, grad, scene: null, disp: [], chunks: [], built: 0 };
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); }, false);
      return true;
    }
    // pixel ratio massimo: 1,5 (una vista), 1 sullo schermo diviso (due viste da disegnare)
    const prMax = () => (split() ? 1 : 1.5);
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
      // mezzo cilindro (fetta d'anguria): asse lungo x, arco in su, base piatta a y = 0
      const half = new T.CylinderGeometry(1, 1, 1, 14, 1, false, 0, Math.PI); half.rotateZ(Math.PI / 2);
      const disc = new T.CircleGeometry(1, 18); disc.rotateX(-Math.PI / 2);   // ombra dei kart
      GEO = {
        box: keep(new T.BoxGeometry(1, 1, 1)), sph: keep(new T.IcosahedronGeometry(1, 1)), sph2: keep(new T.SphereGeometry(1, 10, 8)), lo: keep(new T.SphereGeometry(1, 7, 5)),
        cyl: keep(new T.CylinderGeometry(1, 1, 1, 10)), cyl6: keep(new T.CylinderGeometry(1, 1, 1, 6)), cone: keep(new T.ConeGeometry(1, 1, 8)), rock: keep(new T.DodecahedronGeometry(1, 0)),
        prism: keep(prism), plane: keep(new T.PlaneGeometry(1, 1)), ball: keep(new T.SphereGeometry(1, 16, 12)), sph0: keep(new T.IcosahedronGeometry(1, 0)),
        half: keep(half), disc: keep(disc),
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
      if (VI) { inView(0, buildWorld); return; }
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
      // schermo diviso: la camera della seconda vista (porta i fari quando si disegna quella vista)
      for (const v of views) if (v.cam && v.cam !== R3.camera) { v.cam.far = 900; v.cam.updateProjectionMatrix(); scene.add(v.cam); }
      // ponti: dati per il ruscello (e i canali in città, le insenature al mare)
      SD.clear();
      BR = g.bridges.map((b) => { const m = (b.s0 + b.s1) / 2, w = P.world(g, m); return { x: w.x, y: w.y, tx: Math.cos(w.th), ty: Math.sin(w.th), m, th: w.th }; });
      buildGlow();
      buildGround();
      if (split()) { const g0 = R3.ground; buildGround(); views[1].ground = R3.ground; R3.ground = g0; }
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
      buildKarts();
      buildHood();
      buildFx();
      buildItems();
      buildGulls();
      // primi blocchi subito (la partenza si vede intera)
      for (let i = 0; i < Math.min(3, R3.chunks.length); i++) buildChunk(R3.chunks[i]);
      hdgS = null;
      for (const v of views) v.hdgS = null;
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
      props(ctxC);
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
      // guardrail a imbuto (logica: P.sideAt, tipo 'fun'): dal limite dell'ambientazione alla ringhiera o alla parete
      for (const [list, m] of [[g.bridges, 1], [g.tunnels, 0.5]]) for (const q of list) {
        for (const [f0, f1] of [[q.s0 - m - P.FUN, q.s0 - m], [q.s1 + m, q.s1 + m + P.FUN]]) {
          if (f1 < a || f0 >= b) continue;
          for (let sv = Math.max(a, f0); sv < Math.min(b, f1); sv += 2) {
            for (const side of [-1, 1]) {
              const l0 = P.sideAt(g, sv + 0.01, side).lim, l1 = P.sideAt(g, Math.min(f1, sv + 2) - 0.01, side).lim;
              const p0 = P.world(g, sv, side * (l0 + 0.12)), p1 = P.world(g, Math.min(f1, sv + 2), side * (l1 + 0.12));
              const len = Math.hypot(p1.x - p0.x, p1.y - p0.y), mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, hh = groundH(mx, my);
              const yaw = YAW(Math.atan2(p1.y - p0.y, p1.x - p0.x));
              const rc = th === 'city' ? C['barrier-1'] : th === 'sea' ? C.paint : C.wood;
              add(GEO.box, rc, M4(mx, hh + 0.75, -my, 0, yaw, 0, 0.18, 0.22, len + 0.04), 0.04);
              add(GEO.box, th === 'city' ? C['barrier-2'] : rc, M4(mx, hh + 0.4, -my, 0, yaw, 0, 0.14, 0.16, len + 0.04), 0.03);
              add(GEO.box, woodC ? C['wood-2'] : C.lamp, M4(p0.x, hh + 0.45, -p0.y, 0, yaw, 0, 0.16, 0.9, 0.16), 0.03);
            }
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
          if (P.sideAt(g, sv, side).kind === 'fun' || P.sideAt(g, sv + 2, side).kind === 'fun') continue;
          if (th === 'sea' && side > 0) {
            // lato terra: muretto di pietra continuo (muro vero, come la logica)
            const p = at(sv + 1, side * (WL + 0.3), 'g');
            add(GEO.box, Math.floor(sv / 2) % 2 ? C.cliff : C['cliff-2'], M4(p.x, p.h + 0.35, p.z, 0, p.ry, 0, 0.6, 0.8, 2.04), 0.04);
            continue;
          }
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

    /* ostacoli della fascia fuori strada (logica: g.props, cerchi di raggio pr.r nel mondo): tronchi, rocce, ceppi,
       cespugli, pini, cumuli e pupazzi di neve disegnati con la stessa misura; le chiome stanno in alto
       (sopra i 2,3 m), così il kart che sbatte sul tronco non le attraversa */
    function props(K) {
      const { a, b, add, L2, r } = K;
      for (const pr of g.props) {
        if (pr.s < a || pr.s >= b) continue;
        const x = pr.x, z = -pr.y, h = groundH(pr.x, pr.y), R = pr.r, yaw = pr.x * 1.7;
        if (pr.k === 'tree') {
          add(GEO.cyl6, C.trunk, M4(x, h + 1.5, z, 0, 0, 0, R, 3.0, R), 0.05);
          const c = [C['leaf-1'], C['leaf-2'], C['leaf-3']][Math.floor(r() * 3)];
          add(GEO.lo, c, M4(x, h + 4.0, z, 0, yaw, 0, 1.35, 1.2, 1.35), 0.1);
          add(GEO.lo, c, M4(x + 0.7, h + 3.5, z + 0.4, 0, 0, 0, 0.8, 0.7, 0.8));
        } else if (pr.k === 'pine') {
          add(GEO.cyl6, C.trunk, M4(x, h + 1.3, z, 0, 0, 0, R, 2.6, R), 0.05);
          add(GEO.cone, C.pine, M4(x, h + 3.4, z, 0, yaw, 0, 1.6, 2.2, 1.6), 0.08);
          add(GEO.cone, C['snow-cap'], M4(x, h + 4.5, z, 0, yaw, 0, 1.0, 1.4, 1.0), 0.07);
        } else if (pr.k === 'stump') {
          add(GEO.cyl6, C.trunk, M4(x, h + 0.3, z, 0, 0, 0, R, 0.6, R), 0.04);
          add(GEO.cyl6, C.wood, M4(x, h + 0.61, z, 0, 0, 0, R * 0.85, 0.03, R * 0.85));
          if (r() < 0.4) add(GEO.sph, C.cap, M4(x + R * 0.4, h + 0.75, z, 0, 0, 0, 0.18, 0.1, 0.18), 0.02);
        } else if (pr.k === 'bush') {
          add(GEO.lo, C.bush, M4(x, h + 0.55 * R, z, 0, yaw, 0, R, 0.78 * R, R), 0.07);
          add(GEO.lo, C.bush, M4(x + 0.3 * R, h + 0.95 * R, z - 0.2 * R, 0, 0, 0, 0.55 * R, 0.45 * R, 0.55 * R), 0.05);
          for (let i = 0; i < 3; i++) { const an = yaw + i * 2.1; add(GEO.sph0, C['flower-' + (1 + i)], M4(x + Math.cos(an) * R * 0.7, h + 0.8 * R, z + Math.sin(an) * R * 0.7, 0, 0, 0, 0.12, 0.1, 0.12)); }
        } else if (pr.k === 'bank') {
          add(GEO.lo, C.snowbank, M4(x, h + 0.25 * R, z, 0, yaw, 0, R, 0.55 * R, R), 0.06);
        } else if (pr.k === 'snowman') {
          snowman(add, x, h + 0.05, z, R, yaw);
        } else L2.rock.push([x, pr.y, R, C[r() < 0.5 ? 'rock' : 'rock-2'], 1]);
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

    /* ---------- kart a forma di frutto (ingombro = rettangolo di collisione P.CAR_L × P.CAR_W) ---------- */
    // assi locali: z avanti, x di lato, y in su. Ruote, paraurti, scocca e contorni stanno tutti in |x| ≤ P.CAR_W / 2 e
    // |z| ≤ P.CAR_L / 2 (i contorni compresi). Tre pezzi animati: scocca (rimbalza sulle sospensioni), foglia-spoiler
    // (sventola), pilota (si inclina in curva, festeggia). Lontano: una forma sola senza contorno (LOD).
    const MQ = (x, y, z, dx, dy, dz, sx, sy, sz) => { const d = new T.Vector3(dx, dy, dz).normalize(); return new T.Matrix4().compose(new T.Vector3(x + d.x * sy, y + d.y * sy, z + d.z * sy), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d), new T.Vector3(sx, sy, sz)); };
    const DRV = [0, 0.86, -0.22];      // perno del pilota (sedile)
    const LEAF = [0, 1.0, -0.98];      // perno della foglia-spoiler (dietro, in alto)
    function kartParts(id, who) {
      const body = [], leaf = [], drv = [], lod = [];
      const add = (L) => (geo, c, m, ol = 0) => L.push({ geo, c, m, ol });
      const B = add(body), F = add(leaf), D = add(drv), Lo = add(lod);
      const hw = P.CAR_W / 2, hl = P.CAR_L / 2;
      // telaio comune: pianale, paraurti, ruote tonde coi mozzi, faretti, fanalini, volantino
      B(GEO.box, C.chassis, M4(0, 0.3, 0, 0, 0, 0, hw * 1.5, 0.16, hl * 1.7), 0.03);
      for (const z of [hl - 0.12, -(hl - 0.12)]) B(GEO.box, C.trim, M4(0, 0.36, z, 0, 0, 0, hw * 1.45, 0.2, 0.14), 0.03);
      for (const x of [-(hw - 0.18), hw - 0.18]) for (const z of [-(hl - 0.6), hl - 0.6]) {
        B(GEO.cyl, C.tire, M4(x, 0.32, z, 0, 0, Math.PI / 2, 0.32, 0.26, 0.32), 0.03);
        B(GEO.sph0, C['car-2'], M4(x + Math.sign(x) * 0.11, 0.32, z, 0, 0, 0, 0.04, 0.12, 0.12));
      }
      for (const x of [-0.42, 0.42]) { B(GEO.sph, C.head, M4(x, 0.52, hl - 0.2, 0, 0, 0, 0.13, 0.11, 0.07), 0.02); B(GEO.box, C.tail, M4(x, 0.5, -(hl - 0.2), 0, 0, 0, 0.2, 0.09, 0.04)); }
      B(GEO.cyl, C.wheel, M4(0, 1.02, 0.3, -0.9, 0, 0, 0.2, 0.04, 0.2), 0.02);
      Lo(GEO.box, C.tire, M4(0, 0.3, 0, 0, 0, 0, P.CAR_W - 0.1, 0.5, P.CAR_L - 0.9));
      // seme / poro sulla buccia di un ellissoide (centro c, semiassi a), a quota (u, w) = frazioni di x e z
      const onShell = (cx, cy, cz, ax, ay, az, u, w, col, k) => { const q = 1 - u * u - w * w; if (q < 0.05) return; const y = cy + ay * Math.sqrt(q); B(GEO.sph0, col, M4(cx + ax * u * 1.01, y + 0.01, cz + az * w, 0, 0, 0, k[0], k[1], k[2])); };
      const f = FRUITW[who];
      if (f === 'straw') {
        // fragola: ellissoide largo dietro e punta davanti, semini gialli, corona di foglie come spoiler
        B(GEO.sph2, C.straw, M4(0, 0.72, -0.05, 0, 0, 0, 0.74, 0.44, 1.16), 0.05);
        B(GEO.cone, C.straw, M4(0, 0.66, 1.18, Math.PI / 2, 0, 0, 0.5, 0.42, 0.42), 0.04);
        for (const u of [-0.62, -0.25, 0.25, 0.62]) for (const w of [-0.55, 0.15, 0.62]) onShell(0, 0.72, -0.05, 0.74, 0.44, 1.16, u, w, C.seed, [0.05, 0.03, 0.075]);
        for (const u of [-0.86, 0.86]) for (const w of [-0.3, 0.3]) onShell(0, 0.72, -0.05, 0.74, 0.44, 1.16, u, w, C.seed, [0.03, 0.06, 0.07]);
        // semini anche dietro (si vedono dalla camera)
        for (const [x, y] of [[-0.45, 0.62], [0, 0.55], [0.45, 0.62], [-0.25, 0.85], [0.25, 0.85], [-0.6, 0.8], [0.6, 0.8]]) B(GEO.sph0, C.seed, M4(x, y, -0.05 - 1.16 * Math.sqrt(Math.max(0.05, 1 - (x / 0.74) ** 2 - ((y - 0.72) / 0.44) ** 2)) - 0.01, 0, 0, 0, 0.06, 0.075, 0.03));
        for (let i = 0; i < 5; i++) { const a = -1.15 + i * 0.575; F(GEO.sph, C.kleaf, MQ(0, 0, 0, Math.sin(a), 0.42, -Math.cos(a) * 0.9, 0.12, 0.25, 0.04), 0.03); }
        F(GEO.cyl, C['kleaf-2'], M4(0, 0.14, 0, 0, 0, 0, 0.045, 0.28, 0.045), 0.02);
        Lo(GEO.sph0, C.straw, M4(0, 0.74, 0.05, 0, 0, 0, 0.78, 0.46, 1.4));
      } else if (f === 'peach') {
        // pesca: tonda con la piega e la guancia rosata, una foglia grande e il picciolo
        B(GEO.sph2, C.peach, M4(0, 0.74, 0, 0, 0, 0, 0.76, 0.48, 1.25), 0.05);
        B(GEO.sph2, C['peach-2'], M4(0.24, 0.8, 0.22, 0, 0, 0, 0.54, 0.42, 0.9));
        B(GEO.sph2, C['peach-2'], M4(0, 0.74, 0, 0, 0, 0, 0.035, 0.505, 1.27));
        F(GEO.sph, C.kleaf, MQ(0.05, 0.1, 0, 0.45, 0.75, -0.5, 0.15, 0.32, 0.045), 0.03);
        F(GEO.cyl, C.trunk, M4(0, 0.08, 0, 0, 0, 0, 0.04, 0.2, 0.04), 0.02);
        Lo(GEO.sph0, C.peach, M4(0, 0.74, 0, 0, 0, 0, 0.8, 0.5, 1.3));
      } else if (f === 'mand') {
        // mandarino: schiacciato, coi pori della buccia; due foglioline e il picciolo
        B(GEO.sph2, C.mand, M4(0, 0.7, 0.04, 0, 0, 0, 0.78, 0.42, 1.25), 0.05);
        for (const u of [-0.7, -0.35, 0, 0.35, 0.7]) for (const w of [-0.55, 0.05, 0.6]) onShell(0, 0.7, 0.04, 0.78, 0.42, 1.25, u, w + (u * 7 % 2) * 0.05, C['mand-2'], [0.035, 0.02, 0.035]);
        B(GEO.sph0, C['kleaf-2'], M4(0, 0.7, 1.28, 0, 0, 0, 0.07, 0.07, 0.04));
        for (const sx of [-1, 1]) F(GEO.sph, C.kleaf, MQ(0, 0.12, 0, sx * 0.55, 0.65, -0.5, 0.11, 0.26, 0.04), 0.03);
        F(GEO.cyl, C['kleaf-2'], M4(0, 0.08, 0, 0, 0, 0, 0.045, 0.2, 0.045), 0.02);
        Lo(GEO.sph0, C.mand, M4(0, 0.7, 0.04, 0, 0, 0, 0.82, 0.44, 1.3));
      } else if (f === 'apple') {
        // mela: tonda e un po' schiacciata, il lato lucido e la guancia rossa, picciolo e una foglia come spoiler
        B(GEO.sph2, C.apple, M4(0, 0.74, 0, 0, 0, 0, 0.8, 0.5, 1.22), 0.05);
        B(GEO.sph2, C['apple-2'], M4(-0.34, 0.86, 0.3, 0, 0, 0, 0.36, 0.3, 0.6));
        B(GEO.sph2, C['apple-3'], M4(0.38, 0.72, -0.25, 0, 0, 0, 0.36, 0.3, 0.62));
        B(GEO.sph0, C['kleaf-2'], M4(0, 0.74, 1.23, 0, 0, 0, 0.07, 0.07, 0.04));
        F(GEO.cyl, C.trunk, M4(0, 0.12, 0, 0, 0, 0.25, 0.045, 0.26, 0.045), 0.02);
        F(GEO.sph, C.kleaf, MQ(0.05, 0.2, 0, 0.6, 0.6, -0.5, 0.13, 0.28, 0.045), 0.03);
        Lo(GEO.sph0, C.apple, M4(0, 0.74, 0, 0, 0, 0, 0.84, 0.52, 1.27));
      } else {
        // fetta d'anguria: buccia verde a strisce, polpa rossa coi semini neri sui due lati, ricciolo come spoiler
        B(GEO.half, C['melon-rind'], M4(0, 0.36, 0, 0, 0, 0, 1.5, 0.9, 1.36), 0.05);
        for (const x of [-0.42, 0, 0.42]) B(GEO.half, C['melon-rind-2'], M4(x, 0.36, 0, 0, 0, 0, 0.09, 0.915, 1.375));
        for (const sx of [-1, 1]) {
          B(GEO.half, C['melon-w'], M4(sx * 0.756, 0.36, 0, 0, 0, 0, 0.012, 0.86, 1.3));
          B(GEO.half, C.melon, M4(sx * 0.764, 0.36, 0, 0, 0, 0, 0.012, 0.78, 1.21));
          for (const [r, a] of [[0.45, 0.5], [0.45, 1.3], [0.45, 2.2], [0.62, 0.9], [0.62, 1.7], [0.62, 2.6], [0.3, 1.6]]) B(GEO.sph0, C.mseed, M4(sx * 0.775, 0.36 + Math.sin(a) * r * 0.86, Math.cos(a) * r * 1.2, 0, 0, 0, 0.01, 0.06, 0.035));
        }
        for (let i = 0; i < 3; i++) F(GEO.cyl, C['melon-rind-2'], M4(Math.sin(i * 2.1) * 0.06, 0.07 + i * 0.12, Math.cos(i * 2.1) * 0.06, 0, 0, (i % 2 ? 0.5 : -0.5), 0.03, 0.14, 0.03), 0.015);
        F(GEO.sph, C.kleaf, MQ(0, 0.3, 0, -0.35, 0.8, -0.4, 0.12, 0.22, 0.04), 0.03);
        Lo(GEO.half, C['melon-rind'], M4(0, 0.36, 0, 0, 0, 0, 1.5, 0.9, 1.36));
      }
      // pilota (coordinate rispetto al perno DRV): testa all'altezza giusta per spuntare dalla scocca
      const hy = 0.6, ink = C.eye, eyes = (y, z, sp) => { for (const sx of [-1, 1]) { D(GEO.sph0, ink, M4(sx * sp, y, z, 0, 0, 0, 0.05, 0.065, 0.03)); D(GEO.sph0, C.hi, M4(sx * sp + 0.015, y + 0.025, z + 0.02, 0, 0, 0, 0.018, 0.018, 0.01)); } };
      for (const sx of [-1, 1]) D(GEO.sph, C.paw, M4(sx * 0.2, 0.2, 0.48, 0, 0, 0, 0.09, 0.08, 0.09), 0.02);
      if (who === 'hari') {
        D(GEO.sph0, C.quill, M4(0, 0.2, -0.05, 0, 0, 0, 0.27, 0.25, 0.24), 0.03);
        D(GEO.sph, C.face, M4(0, hy, 0.02, 0, 0, 0, 0.32, 0.29, 0.29), 0.04);
        // nuca a riccio: mezza testa marrone dietro (da dietro si vede questa, con gli aculei)
        D(GEO.sph, C.quill, M4(0, hy + 0.03, -0.07, 0, 0, 0, 0.34, 0.32, 0.29), 0.04);
        // aculei: coni che sporgono dietro e in alto (da dietro si vede la testa a riccio)
        for (const [ax, ay, az] of [[0, 1, -0.2], [-0.45, 0.9, -0.3], [0.45, 0.9, -0.3], [-0.85, 0.45, -0.35], [0.85, 0.45, -0.35], [-0.95, -0.05, -0.4], [0.95, -0.05, -0.4],
          [0, 0.6, -0.8], [-0.45, 0.45, -0.8], [0.45, 0.45, -0.8], [-0.6, 0, -0.85], [0.6, 0, -0.85], [0, 0, -1], [-0.3, -0.4, -0.9], [0.3, -0.4, -0.9]]) {
          const l = Math.hypot(ax, ay, az), ux = ax / l, uy = ay / l, uz = az / l;
          D(GEO.cone, (Math.abs(ax) + ay) % 0.9 < 0.3 ? C.quill : C['quill-2'], MQ(ux * 0.24, hy + 0.03 + uy * 0.22, -0.07 + uz * 0.2, ux, uy, uz, 0.12, 0.14, 0.12), 0.025);
        }
        for (const sx of [-1, 1]) D(GEO.sph, C.ear, M4(sx * 0.26, hy + 0.2, -0.02, 0, 0, 0, 0.08, 0.08, 0.05), 0.02);
        eyes(hy + 0.03, 0.27, 0.11);
        D(GEO.sph0, C.nose, M4(0, hy - 0.05, 0.3, 0, 0, 0, 0.045, 0.035, 0.03));
        for (const sx of [-1, 1]) D(GEO.sph0, C['bunny-in'], M4(sx * 0.19, hy - 0.07, 0.25, 0, 0, 0, 0.06, 0.03, 0.02));
      } else if (who === 'bunny') {
        D(GEO.sph0, C.bunny, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(GEO.sph, C.bunny, M4(0, hy, 0, 0, 0, 0, 0.31, 0.29, 0.29), 0.04);
        for (const sx of [-1, 1]) { D(GEO.sph, C.bunny, M4(sx * 0.12, hy + 0.45, -0.06, 0, 0, sx * -0.15, 0.08, 0.3, 0.06), 0.03); D(GEO.sph, C['bunny-in'], M4(sx * 0.125, hy + 0.45, -0.01, 0, 0, sx * -0.15, 0.04, 0.22, 0.02)); }
        eyes(hy + 0.02, 0.26, 0.11);
        D(GEO.sph0, C['bunny-in'], M4(0, hy - 0.06, 0.29, 0, 0, 0, 0.04, 0.03, 0.02));
      } else if (who === 'fox') {
        D(GEO.sph0, C.fox, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(GEO.sph, C.fox, M4(0, hy, 0, 0, 0, 0, 0.32, 0.29, 0.3), 0.04);
        D(GEO.sph, C['fox-2'], M4(0, hy - 0.08, 0.17, 0, 0, 0, 0.2, 0.13, 0.15));
        for (const sx of [-1, 1]) { D(GEO.cone, C.fox, M4(sx * 0.19, hy + 0.3, -0.02, 0, 0, sx * -0.35, 0.1, 0.22, 0.06), 0.025); D(GEO.cone, C.ink, M4(sx * 0.24, hy + 0.38, -0.02, 0, 0, sx * -0.35, 0.04, 0.08, 0.03)); }
        eyes(hy + 0.04, 0.27, 0.12);
        D(GEO.sph0, C.nose, M4(0, hy - 0.04, 0.33, 0, 0, 0, 0.045, 0.035, 0.03));
      } else if (who === 'kitty') {
        D(GEO.sph0, C.kitty, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(GEO.sph, C.kitty, M4(0, hy, 0, 0, 0, 0, 0.32, 0.29, 0.3), 0.04);
        D(GEO.sph, C['kitty-2'], M4(0, hy - 0.09, 0.19, 0, 0, 0, 0.16, 0.11, 0.12));
        for (const sx of [-1, 1]) { D(GEO.cone, C.kitty, M4(sx * 0.18, hy + 0.3, -0.02, 0, 0, sx * -0.3, 0.11, 0.2, 0.07), 0.025); D(GEO.cone, C['kitty-in'], M4(sx * 0.18, hy + 0.29, 0.03, 0, 0, sx * -0.3, 0.06, 0.12, 0.03)); }
        for (const x of [-0.07, 0, 0.07]) D(GEO.box, C['kitty-3'], M4(x, hy + 0.27, 0.12, 0.5, 0, 0, 0.025, 0.09, 0.02));
        eyes(hy + 0.04, 0.27, 0.11);
        D(GEO.sph0, C['kitty-in'], M4(0, hy - 0.05, 0.31, 0, 0, 0, 0.045, 0.035, 0.03));
        // coda che spunta dietro il sedile
        D(GEO.sph, C.kitty, MQ(0, 0.15, -0.3, 0.2, 0.9, -0.35, 0.07, 0.32, 0.07), 0.02);
      } else {
        D(GEO.sph0, C.panda, M4(0, 0.2, -0.05, 0, 0, 0, 0.26, 0.24, 0.23), 0.03);
        D(GEO.sph, C.panda, M4(0, hy, 0, 0, 0, 0, 0.32, 0.3, 0.3), 0.04);
        for (const sx of [-1, 1]) { D(GEO.sph, C['panda-2'], M4(sx * 0.24, hy + 0.24, -0.02, 0, 0, 0, 0.1, 0.1, 0.07), 0.02); D(GEO.sph0, C['panda-2'], M4(sx * 0.12, hy + 0.02, 0.25, 0, 0, sx * 0.4, 0.08, 0.1, 0.03)); D(GEO.sph0, C.hi, M4(sx * 0.12, hy + 0.04, 0.275, 0, 0, 0, 0.03, 0.03, 0.01)); }
        D(GEO.sph0, C.nose, M4(0, hy - 0.06, 0.3, 0, 0, 0, 0.045, 0.035, 0.03));
      }
      Lo(GEO.sph0, C[who === 'hari' ? 'quill-2' : who], M4(0, DRV[1] + hy, DRV[2], 0, 0, 0, 0.32, 0.3, 0.3));
      return { body, leaf, drv, lod };
    }
    function buildKarts() {
      R3.karts = [];
      // molla (salto) e bolla (scudo) per ogni kart
      const coil = [];
      for (let i = 0; i < 6; i++) coil.push({ geo: GEO.cyl, c: C.spring, m: M4(0, -0.1 - i * 0.18, 0, 0, 0, (i % 2 ? 0.25 : -0.25), 0.5, 0.11, 0.5), ol: 0.03 });
      coil.push({ geo: GEO.box, c: C.straw, m: M4(0, -1.2, 0, 0, 0, 0, 1.2, 0.14, 1.2), ol: 0.03 });
      const coilM = merge(coil);
      R3.bubbleMat = basic({ color: C.bubble, transparent: true, opacity: 0.32, depthWrite: false });
      // ombre: un disco schiacciato sotto ogni kart (4 istanze, 1 draw call)
      const shM = basic({ color: C.shadow, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      R3.shadow = new T.InstancedMesh(GEO.disc, shM, 4); R3.shadow.frustumCulled = false;
      R3.scene.add(R3.shadow);
      for (let id = 0; id < 4; id++) {
        const K = kartParts(id, whoOf(id)), grp = new T.Group(), sus = new T.Group();
        const leafG = new T.Group(), drvG = new T.Group();
        leafG.position.set(...LEAF); drvG.position.set(...DRV);
        // la foglia senza contorno (un draw call in meno per kart); i piloti degli avversari fusi con la scocca
        // (rimbalzano con lei), quello di Hari a parte (si inclina in curva e festeggia)
        leafG.add(new T.Mesh(merge(K.leaf.map((q) => Object.assign({}, q, { ol: 0 }))).body, R3.vc));
        const toSeat = new T.Matrix4().makeTranslation(...DRV);
        if (!isHum(id)) K.body.push(...K.drv.map((q) => Object.assign({}, q, { m: toSeat.clone().multiply(q.m) })));
        else drvG.add(meshOf(merge(K.drv), R3.inkMat, R3.vc));
        sus.add(meshOf(merge(K.body), R3.inkMat, R3.vc), leafG, drvG);
        const lod = new T.Mesh(merge(K.lod).body, R3.vc); lod.visible = false;
        const sp = meshOf(coilM, R3.inkMat, R3.vc); sp.visible = false;
        const bb = new T.Mesh(GEO.ball, R3.bubbleMat); bb.scale.set(1.3, 1.3, 2.1); bb.position.y = 1.0; bb.visible = false;
        grp.add(sus, lod, sp, bb);
        grp.userData = { sus, leafG, drvG, lod, spring: sp, bubble: bb, ph: id * 1.7 };
        R3.scene.add(grp);
        R3.karts[id] = grp;
      }
    }
    function buildHood() {
      const ps = [], add = (geo, c, m, ol = 0) => ps.push({ geo, c, m, ol });
      // visuale pilota: il muso della fragola (il bordo davanti a 2,9 m dall'occhio = muso del kart, sopra a quota −0,5;
      // measure() lo alza/abbassa secondo il campo visivo), coi semini e i faretti
      const HC = [0, -0.68, -1.6], HA = [P.CAR_W / 2 + 0.08, 0.3, 1.3];
      add(GEO.sph2, C.straw, M4(HC[0], HC[1], HC[2], 0, 0, 0, HA[0], HA[1], HA[2]), 0.05);
      for (const [x, z] of [[-0.45, -2.15], [0.45, -2.15], [0, -2.35], [-0.25, -2.55], [0.25, -2.55], [-0.7, -2.3], [0.7, -2.3], [0, -2.72], [-0.5, -2.7], [0.5, -2.7]]) {
        const q = 1 - (x / HA[0]) ** 2 - ((z - HC[2]) / HA[2]) ** 2;
        if (q > 0.02) add(GEO.sph0, C.seed, M4(x, HC[1] + HA[1] * Math.sqrt(q) + 0.01, z, 0, 0, 0, 0.06, 0.03, 0.09));
      }
      for (const x of [-0.55, 0.55]) add(GEO.sph, C.head, M4(x, -0.62, -2.72, 0, 0, 0, 0.14, 0.1, 0.08), 0.03);
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
        const mk = (c, sz) => { const tg = keep(new T.BufferGeometry()); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(24), 3)); const tl = new T.Points(tg, keep(new T.PointsMaterial({ size: sz, map: tex, color: c, transparent: true, depthWrite: false, blending: T.AdditiveBlending }))); tl.frustumCulled = false; R3.scene.add(tl); return tl; };
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
      if (!at3 && s && chase()) at3 = kart3(0);
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
      // la nuvoletta che riporta in pista (sotto il kart che sale e scende)
      for (const c of s.cars) {
        if (!(c.res > 0) || nc >= 8) continue;
        const Pz = P.pose(g, c), k = 1 - c.res / P.RESCUE, lift = (k < 0.5 ? k : 1 - k) * 2 * 2.4, sc = 0.75 * Math.min(1, Math.min(k, 1 - k) * 8);
        m4.compose(V.set(Pz.x, roadH(c.s, c.d, Pz.x, Pz.y) + lift - 0.1, -Pz.y), Q.setFromAxisAngle(UP, now * 1.5), V.clone().set(sc * 1.4, sc * 0.7, sc * 1.6));
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
    // a due (schermo diviso o ospite in rete) solo la visuale da dietro: il cofano della visuale pilota è la fragola di Hari
    const chase = () => camPref === 'chase' || split() || mpMode === 'guest';
    function measure() {
      if (!stage) return;
      W = stage.clientWidth || 300; H = stage.clientHeight || 400;
      if (!R3) return;
      R3.renderer.setSize(W, H, false);
      if (split()) {
        // orizzontale: una vista accanto all'altra; verticale: una sopra l'altra (giocatore 1 a sinistra / in alto)
        const side = W >= H, w0 = side ? Math.floor(W / 2) : W, h0 = side ? H : Math.floor(H / 2);
        views.forEach((v, i) => {
          v.rect = side ? { x: i ? w0 : 0, y: 0, w: i ? W - w0 : w0, h: H } : { x: 0, y: i ? h0 : 0, w: W, h: i ? H - h0 : h0 };
          const root = stage.querySelector(`.ry-v[data-v="${i}"]`);
          if (root) Object.assign(root.style, { left: v.rect.x + 'px', top: v.rect.y + 'px', width: v.rect.w + 'px', height: v.rect.h + 'px' });
        });
        wrap.classList.toggle('ry-side', side);
        eachView((i) => measureCam(views[i].rect.w, views[i].rect.h));
      } else {
        R3.renderer.setScissorTest(false);
        measureCam(W, H);
      }
      if (!raf) draw(0);
    }
    function measureCam(w, h) {
      R3.camera.aspect = w / h;
      // da dietro un campo visivo un po' più stretto (il kart resta grande), da pilota più largo
      baseFov = chase() ? (w / h < 1 ? 68 : w / h > 1.7 ? 52 : 58) : (w / h < 1 ? 74 : w / h > 1.7 ? 58 : 64);
      R3.camera.fov = baseFov + fovK * 9;
      R3.camera.updateProjectionMatrix();
      // il bordo del cofano (2,9 m davanti) cade al 65% dell'altezza (sopra il cruscotto), qualunque sia il campo visivo
      const a = Math.atan(0.3 * Math.tan((baseFov * Math.PI) / 360)) + PITCH;
      R3.hoodY = -2.9 * Math.tan(a) + 0.5;
    }
    // altezza del saltino (dossi) o del salto a molla (più alto, per vedere la molla)
    const hopOf = (c) => { if (!(c.air > 0 && c.airT > 0)) return 0; const k = 1 - c.air / c.airT; return 4 * c.airT * (c.spr ? 1.6 : 1.1) * k * (1 - k); };
    const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
    // kart: posa = rettangolo di collisione (P.pose, la stessa della logica), quota della strada, sospensioni, pilota
    const M0 = new T.Matrix4(), Q0 = new T.Quaternion(), V0 = new T.Vector3(), S0 = new T.Vector3(), UPV = new T.Vector3(0, 1, 0);
    function placeKart(id, now, dt, rm, show) {
      const c = s.cars[id], m = R3.karts[id], U = m.userData, Pz = P.pose(g, c);
      const h0 = roadH(c.s, c.d, Pz.x, Pz.y), hp = hopOf(c), vm = cfg.vmax, sp = Math.min(1.3, Math.abs(c.v) / vm);
      // nuvoletta: il kart sale in cielo, sparisce un attimo e ricompare posato sulla strada
      let lift = 0;
      if (c.res > 0) { const k = 1 - c.res / P.RESCUE; lift = (k < 0.5 ? k : 1 - k) * 2 * 2.4; }
      m.position.set(Pz.x, h0 + hp + lift, -Pz.y);
      m.rotation.set(0, YAW(Pz.h), 0);
      m.visible = show && !(c.res > 0 && Math.abs(c.res - P.RESCUE / 2) < 0.12);
      const far = id !== ME && Math.abs(c.s - s.cars[ME].s) > (split() ? 24 : 32);
      U.sus.visible = !far; U.lod.visible = far;
      // sospensioni: rimbalzo (più forte fuori strada), inclinazione in curva, beccheggio in frenata e in accelerazione
      const bounce = rm ? 0 : Math.sin(now * 11 + U.ph) * 0.03 * sp + (c.off ? Math.abs(Math.sin(now * 19 + U.ph)) * 0.07 * sp : 0);
      const lean = cl(-c.kc * c.v * c.v * 0.004, -0.07, 0.07) - P.bankAt(g, c.s);
      const pitch = id !== ME ? 0 : (brakeOn && c.v > 2 ? 0.035 : gasOn && c.v < cfg.vmax * 0.6 ? -0.02 : 0);
      const wob = c.slip > 0 && !rm ? Math.sin((1 - c.slip / P.PU.slipT) * Math.PI * 4) * 0.05 : 0;
      U.sus.position.y = bounce;
      U.sus.rotation.set(rm ? 0 : pitch, wob, rm ? 0 : lean);
      // la foglia sventola con la velocità; il pilota si inclina verso l'interno, gira la testa sulla buccia, festeggia
      if (!far && !rm) {
        U.leafG.rotation.set(-0.15 + Math.sin(now * (6 + 8 * sp) + U.ph) * (0.08 + 0.18 * sp), 0, Math.sin(now * 4 + U.ph) * 0.06);
        const party = c.fin >= 0 && s.res && s.res.findIndex((r) => r.id === id) < 3;
        const spin = c.slip > 0 ? (1 - c.slip / P.PU.slipT) * Math.PI * 2 : 0;
        U.drvG.position.y = DRV[1] + (party ? Math.abs(Math.sin(now * 7 + U.ph)) * 0.35 : 0);
        U.drvG.rotation.set(party ? Math.sin(now * 7) * 0.15 : 0, spin + (party ? Math.sin(now * 3.5) * 0.5 : 0), cl(lean * 3, -0.25, 0.25) + (party ? Math.sin(now * 7 + 1) * 0.2 : 0));
      }
      U.spring.visible = !!(c.spr && c.air > 0);
      if (U.spring.visible) U.spring.scale.y = Math.max(0.15, hp * 0.85);
      U.bubble.visible = c.sh > 0;
      // ombra sulla strada (resta giù nei salti)
      const sk = c.res > 0 ? 0.001 : 1 / (1 + (hp + lift) * 0.35);
      M0.compose(V0.set(Pz.x, h0 + 0.05, -Pz.y), Q0.setFromAxisAngle(UPV, YAW(Pz.h)), S0.set(P.CAR_W * 0.56 * sk, 1, P.CAR_L * 0.52 * sk));
      R3.shadow.setMatrixAt(id, show ? M0 : M0.makeScale(0, 0, 0));
      return { Pz, h0, hp, lift };
    }
    // una vista sola, oppure le due dello schermo diviso (ognuna nel suo rettangolo dello stesso canvas)
    function draw(dt) {
      if (!R3 || !R3.scene || !s) return;
      fno++;
      if (!split()) { drawView(dt, 0); return; }
      R3.renderer.setScissorTest(true);
      eachView((i) => drawView(dt, i));
    }
    function drawView(dt, pass) {
      const p = s.cars[ME], cam = R3.camera, now = performance.now() / 1000, rm = reduce(), ch = chase(), two = split();
      const vm = cfg.vmax, sp = Math.min(1.3, Math.abs(p.v) / vm);
      // kart (anche quello di chi guarda, da dietro); posa disegnata = posa della logica
      const KP = [];
      for (let id = 0; id < 4; id++) KP[id] = placeKart(id, now, dt, rm, id !== ME ? Math.abs(s.cars[id].s - p.s) < R3.fogFar + 20 : ch);
      R3.shadow.instanceMatrix.needsUpdate = true;
      const H0 = KP[ME], w = P.world(g, p.s, p.d), h0 = H0.h0, hop = H0.hp;
      // direzione morbida (per la camera e la luce)
      const slipK = p.slip > 0 ? 1 - p.slip / P.PU.slipT : 0, wob = p.slip > 0 && !rm ? Math.sin(slipK * Math.PI * 2) * 0.55 * (1 - slipK * 0.5) : 0;
      const hdg = H0.Pz.h + (ch ? 0 : wob);
      if (hdgS === null || !(dt > 0) || p.res > 0) hdgS = hdg; else hdgS += wrapA(hdg - hdgS) * Math.min(1, dt * (ch ? 5 : 14));
      if (shake > 0) shake = Math.max(0, shake - (dt || 0.016) * 2.5);
      const jig = rm ? 0 : shake * 0.5 + (p.off ? 0.06 * sp : 0);
      let ex, ey, eh;
      if (ch) {
        // terza persona: dietro e sopra il kart, inseguimento con una molla smorzata (critica), si allontana un po' in velocità
        const back = 5.8 + 1.4 * sp, up = 2.55 + 0.35 * sp;
        const tx = H0.Pz.x - Math.cos(hdgS) * back, ty = H0.Pz.y - Math.sin(hdgS) * back, tz = h0 + hop * 0.6 + H0.lift * 0.3 + up;
        if (!CH.ok || !(dt > 0) || Math.hypot(CH.x - tx, CH.y - ty) > 25) { Object.assign(CH, { x: tx, y: ty, z: tz, vx: 0, vy: 0, vz: 0, ok: true }); }
        else {
          const ww = 7.5, d2 = Math.min(dt, 0.05);
          for (const [k, vk, t] of [['x', 'vx', tx], ['y', 'vy', ty], ['z', 'vz', tz]]) { CH[vk] += (ww * ww * (t - CH[k]) - 2 * ww * CH[vk]) * d2; CH[k] += CH[vk] * d2; }
        }
        // mai sotto il terreno (dossi, colline)
        const gh = Math.max(roadH(Math.max(0, p.s - back), 0, CH.x, CH.y), h0) + 1.1;
        if (CH.z < gh) { CH.z = gh; CH.vz = Math.max(0, CH.vz); }
        ex = CH.x; ey = CH.y; eh = CH.z;
        const sh = jig ? (Math.random() - 0.5) * jig : 0;
        cam.position.set(ex + sh * 0.6, eh + (rm ? 0 : sh * 0.5 + (p.off ? Math.sin(now * 23) * 0.05 * sp : 0)), -ey);
        const lk = 6 + 3 * sp;
        cam.lookAt(V3(H0.Pz.x + Math.cos(hdgS) * lk, h0 + hop * 0.5 + H0.lift * 0.6 + 0.9, H0.Pz.y + Math.sin(hdgS) * lk));
        // leggera inclinazione nelle curve (verso l'interno)
        const roll = cl(-p.kc * p.v * p.v * 0.0022, -0.045, 0.045) + P.bankAt(g, p.s) * 0.5;
        camRoll += (roll - camRoll) * Math.min(1, (dt || 0.016) * 4);
        if (!rm) cam.rotateZ(camRoll + (jig ? (Math.random() - 0.5) * jig * 0.05 : 0));
      } else {
        // visuale pilota: occhio un po' dietro il centro, il bordo del cofano è il muso del rettangolo di collisione
        const ah = H0.Pz.h + p.bet * 0.6;
        ex = H0.Pz.x - Math.cos(ah) * EYE_BACK; ey = H0.Pz.y - Math.sin(ah) * EYE_BACK;
        const shk = rm ? 0 : (p.off ? 0.05 : 0.012) * sp + shake * 0.15;
        eh = h0 + 1.15 + hop + H0.lift + (rm ? 0 : Math.sin(now * 19) * shk);
        cam.position.set(ex, eh, -ey);
        const aw = P.world(g, p.s + 12, p.d), hA = roadH(p.s + 12, p.d, aw.x, aw.y);
        cam.lookAt(V3(ex + Math.cos(hdgS) * 12, h0 + 1.15 + (hA - h0) * 0.85 - 12 * Math.tan(PITCH) + hop * 0.5 + H0.lift, ey + Math.sin(hdgS) * 12));
        const roll = Math.max(-0.06, Math.min(0.06, p.kc * p.v * p.v * 0.0032)) + P.bankAt(g, p.s) + (rm ? 0 : wob * 0.12);
        camRoll += (roll - camRoll) * Math.min(1, (dt || 0.016) * 6);
        if (!rm) cam.rotateZ(camRoll + (p.off ? (Math.random() - 0.5) * 0.012 * sp : 0));
      }
      if (R3.hood) { R3.hood.visible = !ch; R3.hood.position.y = (R3.hoodY || 0) + (rm ? 0 : Math.sin(now * 23) * 0.006 * sp); }
      // turbo e mini-spinta: il campo visivo si allarga
      const fk = (p.boost > 0 || p.mini > 0) && !rm ? (p.boost > 0 ? 1 : 0.6) : 0;
      fovK += (fk - fovK) * Math.min(1, (dt || 0.016) * 5);
      if (Math.abs(cam.fov - (baseFov + fovK * 9)) > 0.05) { cam.fov = baseFov + fovK * 9; cam.updateProjectionMatrix(); }
      const eye = cam.position;
      // cielo segue la camera; la luce principale arriva da dietro-sinistra-alto rispetto a chi guida (niente controluce)
      R3.sky.position.copy(eye);
      if (R3.sea) { R3.sea.position.x = eye.x; R3.sea.position.z = eye.z; }
      const fx = Math.cos(hdgS), fz = -Math.sin(hdgS);
      R3.sun.position.set(eye.x - fx * 60 + fz * 35, eye.y + 80, eye.z - fz * 60 - fx * 35);
      R3.sun.target.position.copy(eye);
      updateGround(ex + Math.cos(hdgS) * 90, ey + Math.sin(hdgS) * 90);
      // blocchi di scenario: costruisce il prossimo (uno per fotogramma) e mostra solo quelli vicini
      // (al massimo un blocco per fotogramma, anche con due viste)
      const ahead = p.s + 320;
      if (R3.bf !== fno) for (const chk of R3.chunks) {
        if (!chk.grp && chk.a < ahead && chk.b > p.s - 80) { buildChunk(chk); R3.bf = fno; break; }
      }
      // da dietro la camera è più alta e vede più lontano: nebbia un po' più vicina e dettagli che calano prima
      // (sullo schermo diviso ancora un po': due viste da disegnare)
      const fogF = R3.fogFar * (ch ? 0.88 : 1) * (two ? 0.85 : 1);
      if (R3.scene.fog && Math.abs(R3.scene.fog.far - fogF) > 0.5) R3.scene.fog.far = fogF;
      for (const chk of R3.chunks) {
        if (!chk.grp) continue;
        const dd = Math.hypot(chk.x - w.x, chk.y - w.y);
        chk.grp.visible = dd < fogF + chk.rad;
        // LOD semplice: i blocchi lontani mostrano alberi e cespugli senza dettagli
        const isFar = dd - chk.rad * 0.6 > (ch ? 72 : 85) * (two ? 0.7 : 1);
        if (chk.isFar !== isFar) { chk.isFar = isFar; for (const m of chk.near) m.visible = !isFar; for (const m of chk.far) m.visible = isFar; }
      }
      // animazioni dello scenario (animaletti, pubblico, barche, faro) solo nei blocchi vicini
      if (!rm) for (const an of R3.anim) if (!an.ch || (an.ch.grp && an.ch.grp.visible && Math.hypot(an.ch.x - w.x, an.ch.y - w.y) < 200)) an.fn(now);
      // gabbiani
      if (R3.gulls) R3.gulls.forEach((gl, i) => {
        const an = now * (0.25 + i * 0.04) + i * 1.3, rr = 22 + i * 7, cx = ex + Math.cos(hdgS) * 40, cy = ey + Math.sin(hdgS) * 40;
        gl.position.set(cx + Math.cos(an) * rr, eye.y + 12 + i * 2.5 + Math.sin(now * 2 + i) * 0.6, -(cy + Math.sin(an) * rr));
        gl.rotation.set(0, -an + Math.PI, Math.sin(now * 6 + i) * 0.25);
      });
      // fanalini e faretti che brillano al buio; polvere, scintille, petali dietro i kart
      const tails = R3.tails ? R3.tails.geometry.attributes.position : null, heads = R3.heads ? R3.heads.geometry.attributes.position : null;
      const hl = P.CAR_L / 2;
      for (let id = 0; id < 4; id++) {
        const c = s.cars[id], Pz = KP[id].Pz, ht = KP[id].h0 + KP[id].hp + KP[id].lift, m = R3.karts[id];
        const nx = -Math.sin(Pz.h), ny = Math.cos(Pz.h), cx = Math.cos(Pz.h), cy = Math.sin(Pz.h);
        const vis = m.visible ? 1 : 0;
        if (tails) for (const [k, sd] of [[0, -0.42], [1, 0.42]]) tails.setXYZ(id * 2 + k, Pz.x - cx * (hl - 0.15) + nx * sd, ht + 0.5 - (1 - vis) * 999, -(Pz.y - cy * (hl - 0.15) + ny * sd));
        if (heads) for (const [k, sd] of [[0, -0.42], [1, 0.42]]) heads.setXYZ(id * 2 + k, Pz.x + cx * (hl - 0.1) + nx * sd, ht + 0.52 - (1 - vis) * 999, -(Pz.y + cy * (hl - 0.1) + ny * sd));
        if (!(dt > 0) || rm || !vis || (id !== ME && !U_near(c, p))) continue;
        // schermo diviso: le particelle dei kart vicini al giocatore 1 sono già partite nella prima vista
        if (pass && U_near(c, s.cars[views[0].ME])) continue;
        const bx = Pz.x - cx * (hl + 0.1), by = Pz.y - cy * (hl + 0.1);
        const dust = (c.off ? 22 : 0) + (Math.abs(c.bet) > 0.1 ? 18 : 0) + (c.v > 9 ? 4 : 0);
        if (dust && Math.random() < dt * dust) emit(bx + (Math.random() - 0.5) * 1.4, ht + 0.25, -by, (Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2, c.off ? (cfg.theme === 'snow' ? C.snowbank : cfg.theme === 'sea' ? C.sand : cfg.theme === 'city' ? C.dust : C.dirt) : C.dust, 0.8, c.off ? 0.7 : 0.4);
        // derapata: scintille dalle ruote dietro (gialle, poi arancioni quando la mini-spinta è carica)
        if (c.dr > 0 && Math.random() < dt * 40) { const sd = (Math.random() < 0.5 ? -1 : 1) * 0.72; emit(bx + nx * sd, ht + 0.2, -(by + ny * sd), (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, c.dr >= P.DRIFT.t1 ? C.carrot : C.spark, 0.35, 1); }
        if ((c.boost > 0 || c.mini > 0) && Math.random() < dt * 30) emit(bx, ht + 0.5, -by, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, Math.random() < 0.5 ? C.carrot : C.spark, 0.5, 1);
        if (c.slow > 0 && Math.random() < dt * 20) emit(Pz.x + (Math.random() - 0.5) * 2, ht + 2 + Math.random(), -Pz.y + (Math.random() - 0.5) * 2, 0, -0.5, 0, C.petal, 0.7, 1);
        if (c.res > 0 && Math.random() < dt * 40) emit(Pz.x + (Math.random() - 0.5) * 2.4, ht + 0.2 + Math.random(), -Pz.y + (Math.random() - 0.5) * 2.4, (Math.random() - 0.5), 0.4, (Math.random() - 0.5), Math.random() < 0.5 ? C['petal-2'] : C.petal, 0.9, 1);
      }
      if (tails) tails.needsUpdate = true;
      if (heads) heads.needsUpdate = true;
      // visuale pilota: scintille del turbo e petali davanti al parabrezza
      if (dt > 0 && !rm && !ch && !pass) {
        if (p.boost > 0 && Math.random() < dt * 25) burst('carrot', null, 1);
        if (p.slow > 0 && Math.random() < dt * 14) burst('petal', null, 1);
      }
      updateItems(now, p);
      if (!pass) updateFx(dt || 0);
      if (two) {
        // il suo rettangolo del canvas, il suo terreno, i fari sulla sua camera
        const r = views[VI].rect || { x: 0, y: 0, w: W, h: H };
        R3.renderer.setViewport(r.x, H - r.y - r.h, r.w, r.h);
        R3.renderer.setScissor(r.x, H - r.y - r.h, r.w, r.h);
        for (const v of views) if (v.ground && v.ground !== R3.ground) v.ground.m.visible = false;
        R3.ground.m.visible = true;
        if (R3.head && R3.head.parent !== cam) cam.add(R3.head, R3.head.target);
      }
      R3.renderer.render(R3.scene, cam);
      if (!pass) lastDrawn = KP;
    }
    const U_near = (c, p) => Math.abs(c.s - p.s) < 60;

    /* ---------- indicatori HTML ---------- */
    function hud() { if (s) eachView(() => hudView()); }
    // classe del kart negli indicatori: me = chi guarda, mate = l'altro giocatore umano
    const tag = (id) => (id === ME ? 'me' : isHum(id) ? 'mate' : '');
    function paintProg() {
      if (!s) return;
      eachView(() => { progEl.querySelectorAll('i').forEach((it) => { const id = +it.dataset.id; it.className = tag(id); it.style.setProperty('--ry-c', colOf(id)); }); });
    }
    function hudView() {
      const p = s.cars[ME], pos = posMe();
      if (pos !== lastHud.pos) {
        const up = lastHud.pos && pos < lastHud.pos;
        lastHud.pos = pos;
        posEl.querySelector('b').textContent = String(pos);
        posEl.setAttribute('aria-label', `${pos}/4`);
        if (up) { posEl.classList.remove('up'); void posEl.offsetWidth; posEl.classList.add('up'); }
      }
      const rk = s.rank.join('');
      if (rk !== lastHud.rank) {
        lastHud.rank = rk;
        rankEl.innerHTML = s.rank.map((id) => `<i class="${tag(id)}" style="--ry-c:${colOf(id)}">${face(id, false)}</i>`).join('');
      }
      const tt = Math.floor(Math.max(0, s.t) * 10);
      if (tt !== lastHud.t) { lastHud.t = tt; timeEl.textContent = fmtT(tt / 10); }
      // barra della tappa
      progEl.querySelectorAll('i').forEach((it) => { const c = s.cars[+it.dataset.id]; it.style.left = `${Math.max(0, Math.min(100, ((c.s - P.PREROLL) / s.L) * 100)).toFixed(1)}%`; });
      // note
      const up = P.upcoming(s, 2, ME);
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
      // volante e lancette (cruscotto in visuale pilota, contachilometri tondo da dietro)
      const ang = steerV * 70, nd = `rotate(${(-20 + Math.min(1.35, Math.abs(p.v) / cfg.vmax) * 200).toFixed(0)})`;
      if (wheelG) wheelG.style.transform = `rotate(${ang.toFixed(1)}deg)`;
      if (needle) needle.setAttribute('transform', nd);
      if (spdEl) spdEl.setAttribute('transform', nd);
      arrL.classList.toggle('on', steerV < -0.2);
      arrR.classList.toggle('on', steerV > 0.2);
      pedalEl.classList.toggle('on', brakeOn);
      gasEl.classList.toggle('on', gasOn);
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
    // sullo schermo diviso niente sensori (due giocatori, un telefono): sempre al tocco
    const mode = () => (pref === 'tilt' && inFull() && sensorLive() && !split() ? 'tilt' : 'touch');
    let lastMode = '';
    function renderMode() {
      if (!modeBtn) return;
      const m = mode();
      eachView(() => {
        modeBtn.innerHTML = pref === 'tilt' ? TILT : HAND;
        modeBtn.classList.toggle('on', m === 'tilt');
        modeBtn.setAttribute('aria-label', pref === 'tilt' ? L('ry_tilt') : L('ry_touch'));
        modeBtn.title = modeBtn.getAttribute('aria-label');
        camBtn.innerHTML = CAM[camPref];
        camBtn.setAttribute('aria-label', L(camPref === 'chase' ? 'ry_cam_chase' : 'ry_cam_pilot'));
        camBtn.title = camBtn.getAttribute('aria-label');
      });
      wrap.classList.toggle('tilt', m === 'tilt');
      wrap.classList.toggle('touch', m === 'touch');
      wrap.classList.toggle('chase', chase());
      wrap.classList.toggle('pilot', !chase());
      // a due: niente cambio di visuale né "gioca insieme"; prima del via il pulsante "gioca insieme"
      wrap.classList.toggle('ry-mp', !!mpMode);
      wrap.classList.toggle('ry-guest', mpMode === 'guest');
      wrap.classList.toggle('pre', !!s && !mpMode && s.t <= 0 && !P.isOver(s));
      wrap.classList.toggle('auto', autoGas());
      // menu di pausa: visuale, acceleratore automatico, sensori ↔ tocco
      if (optsEl) {
        const [oc, oa, ot] = optsEl.querySelectorAll('.ry-opt');
        oc.innerHTML = `${CAM[camPref]}<span>${L(camPref === 'chase' ? 'ry_cam_chase' : 'ry_cam_pilot')}</span>`;
        oa.setAttribute('aria-pressed', String(autoGas()));
        ot.innerHTML = `${pref === 'tilt' ? TILT : HAND}<span>${L(pref === 'tilt' ? 'ry_tilt' : 'ry_touch')}</span>`;
      }
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
    // ruolo di un tocco: pedali, frecce, power-up; altrove (col tocco) si sterza trascinando
    function roleAt(x, y, t) {
      const hit = (node) => { if (!node || node.offsetParent === null) return false; const r = node.getBoundingClientRect(), sr = stage.getBoundingClientRect(), m = 10; return x >= r.left - sr.left - m && x <= r.right - sr.left + m && y >= r.top - sr.top - m && y <= r.bottom - sr.top + m; };
      if (t && t.closest && t.closest('.ry-item')) return 'item';
      if (hit(gasEl)) return 'gas';
      if (hit(pedalEl)) return 'brake';
      if (mode() === 'touch' && hit(arrL)) return 'left';
      if (mode() === 'touch' && hit(arrR)) return 'right';
      return mode() === 'touch' ? 'drag' : 'none';
    }
    function input(dt) {
      // QA (Playwright): l'autopilota guida il kart di questa vista passando dallo stesso input dei comandi
      if (qaAuto && s && g) { const a = autopilot(s.cars[ME], {}); steerV = a.steer; gasOn = !!a.gas; brakeOn = !!a.brake; const use = useQ ? 1 : 0; useQ = false; return Object.assign(a, { use }); }
      const m = mode(), now = performance.now();
      let tgt = 0, brake = !!keys.b, gas = !!keys.g, arrow = 0, held = 0, latest = -1, drag = null;
      if (keys.l || keys.r) tgt = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      else if (m === 'tilt') tgt = tiltSteer();
      for (const q of ptrs.values()) {
        if ((q.v || 0) !== VI) continue;
        if (q.role === 'gas') gas = true;
        else if (q.role === 'brake') brake = true;
        else if (q.role === 'left' || q.role === 'right') { if (q.t0 > latest) { latest = q.t0; arrow = q.role === 'left' ? -1 : 1; held = (now - q.t0) / 1000; } }
        else if (q.role === 'drag' && (!drag || q.t0 > drag.t0)) drag = q;
      }
      if (!(keys.l || keys.r) && m === 'touch') {
        // frecce: partono al 42% e arrivano al massimo in ~0,25 s; trascinando: lo sterzo segue il dito
        if (arrow) tgt = arrow * Math.min(1, 0.42 + held * 2.4);
        else if (drag) tgt = Math.max(-1, Math.min(1, (drag.x - drag.x0) / Math.max(60, (split() && views[VI].rect ? views[VI].rect.w : W) * 0.2)));
      }
      steerV += (tgt - steerV) * Math.min(1, dt * (m === 'tilt' || drag ? 16 : 11));
      brakeOn = brake;
      // acceleratore automatico (opzione): sempre giù tranne quando si frena
      gasOn = autoGas() ? !brake : gas;
      const use = useQ ? 1 : 0;
      useQ = false;
      return { steer: steerV, gas: gasOn ? 1 : 0, brake: brake ? 1 : 0, use };
    }
    function useItem() {
      if (!s || P.isOver(s) || paused || s.ready > 0 || !s.cars[ME].it) return;
      useQ = true;
      itemBtn.classList.remove('press'); void itemBtn.offsetWidth; itemBtn.classList.add('press');
      later(() => itemBtn.classList.remove('press'), 150);
    }
    function setCam(c) {
      if (split() || mpMode === 'guest') return;
      camPref = c; sset('rally:cam', c); CH.ok = false; hdgS = null;
      renderMode(); measure(); sfx('tap');
      say(L(c === 'chase' ? 'ry_cam_chase' : 'ry_cam_pilot'), 'small', 1200);
    }
    function setAuto(on) { autoPref = !!on; sset('rally:auto', !!on); renderMode(); sfx('tap'); }
    function setCtl() {
      pref = pref === 'tilt' ? 'touch' : 'tilt';
      sset('rally:ctl', pref);
      if (pref === 'tilt') askPermission();
      sensor.zero = sensor.raw;
      renderMode(); sfx('tap');
      say(pref === 'tilt' ? L('ry_tilt') : L('ry_touch'), 'small', 1400);
    }
    const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    // vista sotto il punto (schermo diviso) o del pulsante toccato
    const viewAt = (x, y, t) => {
      if (!split()) return 0;
      const vr = t && t.closest && t.closest('.ry-v');
      if (vr) return +vr.dataset.v || 0;
      const i = views.findIndex((v) => v.rect && x >= v.rect.x && x < v.rect.x + v.rect.w && y >= v.rect.y && y < v.rect.y + v.rect.h);
      return i < 0 ? 0 : i;
    };
    el.onpointerdown = (e) => {
      if (!stage || !e.target.closest('.ry-stage')) return;
      if (e.target.closest('.ry-btn') || e.target.closest('.ry-end button') || e.target.closest('.ry-opts') || e.target.closest('.ry-mpv')) return;
      e.preventDefault();
      if (HH.audio && HH.audio.unlock) HH.audio.unlock();
      if (pref === 'tilt') askPermission();
      if (!turnEl.hidden) return;
      if (paused) { resume(); return; }
      if (P.isOver(s)) return;
      const [x, y] = local(e), vi = viewAt(x, y, e.target), role = inView(vi, () => roleAt(x, y, e.target));
      // pulsante del power-up: si usa subito (anche insieme ai pedali: tocco multiplo)
      if (role === 'item') { inView(vi, useItem); return; }
      if (role === 'none') return;
      ptrs.set(e.pointerId, { x, y, x0: x, t0: performance.now(), role, v: vi });
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ }
    };
    el.onpointermove = (e) => {
      const q = ptrs.get(e.pointerId);
      if (!q) return;
      const [x, y] = local(e);
      q.x = x; q.y = y;
      // scivolando da una freccia all'altra (o da un pedale all'altro) il comando segue il dito
      if (q.role !== 'drag') { const r = inView(q.v || 0, () => roleAt(x, y, null)); if (r !== q.role && r !== 'drag' && r !== 'none' && r !== 'item') { q.role = r; q.t0 = performance.now(); } }
    };
    el.onpointerup = el.onpointercancel = (e) => { ptrs.delete(e.pointerId); };
    el.oncontextmenu = (e) => { if (e.target.closest('.ry-stage')) e.preventDefault(); };
    el.onclick = (e) => {
      if (e.target.closest('.ry-pbtn')) { e.preventDefault(); sfx('tap'); toggle(); return; }
      if (e.target.closest('.ry-cam')) { e.preventDefault(); setCam(camPref === 'chase' ? 'pilot' : 'chase'); return; }
      if (e.target.closest('.ry-mode')) { e.preventDefault(); setCtl(); return; }
      if (e.target.closest('.ry-mpbtn')) { e.preventDefault(); sfx('tap'); mpMenu(); return; }
      const mpb = e.target.closest('[data-mp]');
      if (mpb) { e.preventDefault(); if (!mpb.disabled) mpClick(mpb.dataset.mp); return; }
      const opt = e.target.closest('.ry-opt');
      if (opt) {
        e.preventDefault();
        if (opt.dataset.opt === 'cam') setCam(camPref === 'chase' ? 'pilot' : 'chase');
        else if (opt.dataset.opt === 'auto') setAuto(!autoGas());
        else if (opt.dataset.opt === 'mp') mpMenu();
        else setCtl();
        return;
      }
      // tastiera (Invio/spazio sul pulsante): il clic senza puntatore usa il power-up
      if (e.target.closest('.ry-item') && e.detail === 0) { e.preventDefault(); inView(viewAt(0, 0, e.target), useItem); return; }
      if (e.target.closest('.ry-retry')) { e.preventDefault(); restartRace(); }
    };
    // schermo diviso: frecce e Invio per il giocatore 1, W A S D e spazio (o E) per il giocatore 2
    const KEY2 = { a: 1, d: 1, A: 1, D: 1, s: 1, S: 1, w: 1, W: 1, ' ': 1, e: 1, E: 1 };
    const kview = (k) => (split() && KEY2[k] ? 1 : 0);
    function onKey(e) {
      if (!alive || !el.isConnected) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const onBtn = e.target && e.target.closest && e.target.closest('button');
      if (e.key in USEKEYS) {
        // Invio o spazio su un pulsante (anche del gioco) premono il pulsante
        if (onBtn && (e.key === 'Enter' || e.key === ' ')) return;
        e.preventDefault();
        if (paused) { if (mpEl.hidden) resume(); return; }
        if (!e.repeat) inView(kview(e.key), useItem);
        return;
      }
      if (e.key in KEYS) {
        e.preventDefault();
        if (paused) { if (mpEl.hidden) resume(); return; }
        if (P.isOver(s)) return;
        KS[kview(e.key)][KEYS[e.key]] = true;
        return;
      }
      if (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V') { e.preventDefault(); setCam(camPref === 'chase' ? 'pilot' : 'chase'); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (e.key === 'Escape') pause(); else toggle(); }
    }
    function onKeyUp(e) { if (e.key in KEYS) KS[kview(e.key)][KEYS[e.key]] = false; }
    function onVis() { if (document.hidden) pause(); }
    function onBlur() { clearKeys(); ptrs.clear(); }
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
      if (net) { try { net.send({ ry: 'quit' }); net.close(); } catch (e) { /* già chiuso */ } net = null; }
      G.removeEventListener('keydown', onKey);
      G.removeEventListener('keyup', onKeyUp);
      G.removeEventListener('blur', onBlur);
      G.removeEventListener('deviceorientation', onOrient);
      G.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.removeEventListener(ev, onFull));
      // lo schermo intero resta attivo anche fuori dal gioco: si sblocca l'orizzontale imposto dal rally
      try { const so = G.screen && G.screen.orientation; if (so && so.unlock) so.unlock(); } catch (e) { /* non supportato */ }
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
      const v = Math.min(1.3, Math.abs(p.v) / cfg.vmax);
      // tre marce: il motore sale e "cambia" (col gas giù un po' di più)
      const gear = v < 0.33 ? 0 : v < 0.66 ? 1 : 2, rpm = Math.min(1, (v - gear * 0.33) / 0.38 * 0.8 + 0.2 + gear * 0.06 + (gasOn ? 0.05 : 0));
      A.engine(true, rpm, Math.min(1, (p.off ? 0.6 : 0) + Math.min(1, p.slide / 6) * 0.6 + (p.honey ? 0.3 : 0)), brakeOn && p.v > 3);
    }

    /* ---------- eventi della logica ---------- */
    // punto del kart nel mondo three (per le particelle degli urti)
    const kart3 = (id) => { if (id === ME && !chase()) return null; const c = s.cars[id], Pz = P.pose(g, c); return Math.abs(c.s - s.cars[ME].s) < 70 ? V3(Pz.x, roadH(c.s, c.d, Pz.x, Pz.y) + 0.8, Pz.y) : null; };
    const near3 = (id) => { const c = s.cars[id], cw = P.world(g, c.s, c.d); return Math.abs(c.s - s.cars[ME].s) < 70 ? V3(cw.x, roadH(c.s, c.d, cw.x, cw.y) + 1, cw.y) : null; };
    // riguarda chi guarda? (a due: by = l'umano a cui succede; altrimenti il kart who; senza nessuno dei due: tutti)
    const mine = (e) => (e.by !== undefined ? e.by === ME : e.who === undefined || e.who === ME);
    function onEvent(e) {
      switch (e.type) {
        case 'count': lights(4 - e.n); sfx('blip'); break;
        case 'go': {
          lights(0); sfx('milestone');
          later(() => say(L('pa_go'), 'go', 700), 50);
          sensor.zero = sensor.raw;
          const duo = !!(s.hu && s.hu.length > 1);
          if (s.t < 0.5 && (s.level <= 3 || duo)) later(() => { if (!paused && !P.isOver(s)) say(L(duo ? 'ry_mp_rule' : 'ry_top3'), 'small', 1800); }, 1300);
          break;
        }
        case 'call': { if (!mine(e)) break; const n = g.notes[e.i]; asfx('pace', n.kind === 'curve' ? n.dir : 0, n.kind === 'curve' ? n.g : 0); break; }
        case 'off': if (!mine(e)) break; if (!chase()) burst('leaf'); shake = Math.max(shake, 0.25); break;
        case 'boing': if (e.who === ME) { burst(cfg.theme === 'city' ? 'gift' : cfg.theme === 'snow' ? 'bubble' : 'leaf', kart3(ME)); sfx('boing'); bumpAnim(); shake = Math.max(shake, 0.7); } break;
        case 'rock': if (e.who === ME) { burst(e.k === 'bush' || e.k === 'bank' ? 'leaf' : 'spark', kart3(ME)); sfx('boing'); bumpAnim(); shake = 1; if (ctx.react) ctx.react('oops'); } break;
        case 'bump': if (e.by !== undefined && e.by !== ME) break; burst('spark', kart3(e.who)); sfx('set'); bumpAnim(); shake = Math.max(shake, 0.6); break;
        case 'drift': break;
        case 'mini': if (e.who === ME) { asfx('zoom'); burst('carrot', kart3(ME), e.lvl > 1 ? 14 : 8); if (e.lvl > 1 || !seenPu.mini) say(L('ry_mini'), 'pu', 900); seenPu.mini = 1; } break;
        case 'spin': if (e.who === ME) { asfx('whee'); shake = Math.max(shake, 0.5); if (ctx.react) ctx.react('oops'); } break;
        case 'rescue': if (e.who === ME) { asfx('puff'); burst('petal', kart3(ME), 18); if (ctx.react) ctx.react('oops'); } break;
        case 'back': if (e.who === ME) { CH.ok = false; burst('petal', kart3(ME), 12); say(L('ry_rescue'), 'small', 1300); } break;
        case 'jump': if (mine(e)) sfx('pick'); break;
        case 'pass': if (!mine(e)) break; if (e.up) { sfx('place'); changed(true); } else sfx('tap'); break;
        case 'check': {
          if (!mine(e)) break;
          msgEl.innerHTML = `<div class="ry-cp">${FLAG}<span>${e.pos}°</span><span>${fmtT(s.t)}</span></div>`;
          msgEl.classList.add('show'); sfx('milestone');
          const m = msgEl;
          later(() => { if (m.querySelector('.ry-cp')) m.innerHTML = ''; }, 1700);
          break;
        }
        case 'box':
          if (e.who === ME && e.it) {
            asfx('gift'); burst('gift');
            rollUntil = performance.now() + (reduce() ? 0 : 650); lastHud.it = -1;
            const id = ME;
            later(() => { if (!P.isOver(s) && s.cars[id].it) { const k = P.ITEMS[s.cars[id].it]; if (!seenPu[k] || s.level <= 2) say(L('ry_pu_' + k), 'pu', 1300); seenPu[k] = 1; } }, reduce() ? 0 : 680);
          }
          break;
        case 'use': {
          const meSelf = e.who === ME, at3 = meSelf ? null : near3(e.who);
          if (!meSelf && !at3) break;
          const snd = { carrot: 'zoom', bubble: 'bubble', banana: 'plop', honey: 'plop', cloud: 'puff', magnet: 'tink', spring: 'sproing' }[e.it];
          if (snd && (meSelf || at3)) asfx(snd);
          if (meSelf) { if (e.it === 'carrot') burst('carrot'); if (e.it === 'bubble') burst('bubble'); if (e.it === 'magnet') burst('acorn'); }
          else if (at3) burst(e.it === 'carrot' ? 'carrot' : e.it === 'cloud' ? 'petal' : 'spark', at3, 6);
          break;
        }
        case 'slip': if (e.who === ME) { asfx('whee'); if (ctx.react) ctx.react('oops'); } else { const at3 = near3(e.who); if (at3) { burst('spark', at3, 8); asfx('whee'); } } break;
        case 'honey': if (e.who === ME) { asfx('squish'); burst('honey'); } break;
        case 'cloud': if (e.who === ME) { asfx('puff'); burst('petal', null, 16); } else { const at3 = near3(e.who); if (at3) { burst('petal', at3, 12); asfx('puff'); } } break;
        case 'pop': { const at3 = e.who === ME ? null : near3(e.who); if (e.who === ME || at3) { asfx('pop'); burst('bubble', at3, 10); } break; }
        case 'acorn': if (e.who === ME) asfx('tink'); break;
        case 'spring': break;
        case 'finish': finish(); break;
        default: break;
      }
    }
    // a chi va l'evento: sullo schermo diviso alla vista del kart (by/who), quelli di tutti (semaforo) a tutte e due
    // (il suono una volta sola), quelli degli avversari alla vista più vicina
    function dispatch(e) {
      if (!split() || e.type === 'finish' || e.type === 'win' || e.type === 'lose') { onEvent(e); return; }
      const tgt = e.by !== undefined ? e.by : e.who;
      if (tgt === undefined) { views.forEach((v, i) => { quiet = i > 0; inView(i, () => onEvent(e)); }); quiet = false; return; }
      let vi = viewOf(tgt);
      if (vi < 0) {
        const c = s.cars[tgt], vc = (i) => s.cars[i === VI ? ME : views[i].ME];
        vi = c && Math.abs(c.s - vc(1).s) < Math.abs(c.s - vc(0).s) ? 1 : 0;
      }
      inView(vi, () => onEvent(e));
    }
    function bumpAnim() { if (reduce()) return; stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump'); }
    function finish() {
      if (s.hu) { finishMP(); return; }
      over = performance.now();
      engine(false);
      ptrs.clear(); clearKeys();
      fxoEl.className = 'ry-fxo';
      const rows = s.res.map((r, i) => `<li class="${r.id ? '' : 'me'}"><em>${i + 1}</em><i>${face(r.id, i === 0)}</i><span>${fmtT(r.t)}</span></li>`).join('');
      endEl.innerHTML = `<span class="ry-big">${s.pos}<small>/4</small></span><ol>${rows}</ol>${s.won ? '' : `<button class="candy ry-retry" type="button"><span>${L('retry')}</span></button>`}`;
      later(() => { endEl.hidden = false; }, 500);
      changed(true);
      if (s.won) { sfx('cupDone'); if (ctx.react) ctx.react('happy'); later(() => ctx.win(), (el._rally && el._rally.winDelay) || 2600); }
      else { sfx('lose'); if (ctx.react) ctx.react('oops'); }
    }
    // fine gara a due: classifica con i due giocatori, fragoline di ciascuno, vittoria di squadra se uno dei due è primo
    const BERRY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c5 0 8 2.6 8 6.4 0 4.4-4.6 8.6-8 8.6s-8-4.2-8-8.6C4 9.6 7 7 12 7Z" fill="var(--ry-straw)" ${o(1.4)}/><path d="M8 7.6c1-2.6 2.4-3.6 4-3.6s3 1 4 3.6c-1.4.8-2.6 1-4 1s-2.6-.2-4-1Z" fill="var(--ry-kleaf)" ${o(1.1)}/><circle cx="9" cy="12" r=".9" fill="var(--ry-seed)"/><circle cx="15" cy="12" r=".9" fill="var(--ry-seed)"/><circle cx="12" cy="15.6" r=".9" fill="var(--ry-seed)"/></svg>`;
    function finishMP() {
      over = performance.now();
      engine(false);
      ptrs.clear(); clearKeys();
      eachView(() => { fxoEl.className = 'ry-fxo'; });
      const hs = s.hu || [0], duo = hs.length > 1;
      const berries = (id) => { const n = Math.max(0, 4 - (s.res.findIndex((r) => r.id === id) + 1)); return `<b class="ry-berries" aria-label="${n}">${BERRY.repeat(n)}</b>`; };
      const rows = s.res.map((r, i) => `<li class="${tag(r.id)}"><em>${i + 1}</em><i>${face(r.id, i === 0)}</i>${isHum(r.id) ? berries(r.id) : ''}<span>${fmtT(r.t)}</span></li>`).join('');
      const best = split() ? Math.min(...hs.map((id) => P.posOf(s, id))) : P.posOf(s, ME);
      const btns = s.won ? '' : mpMode === 'guest' && net
        ? `<small>${L('ry_mp_host')}</small><button class="candy ry-opt" type="button" data-mp="solo"><span>${L('ry_mp_solo')}</span></button>`
        : `<div class="ry-mpbtns"><button class="candy ry-retry" type="button"><span>${duo || net ? L('ry_mp_again') : L('retry')}</span></button><button class="ry-opt" type="button" data-mp="solo"><span>${L('ry_mp_solo')}</span></button></div>`;
      endEl.innerHTML = `<b class="ry-team ${s.won ? 'win' : ''}">${L(s.won ? 'ry_mp_win' : 'ry_mp_lose')}</b><span class="ry-big">${best}<small>/4</small></span><ol>${rows}</ol>${btns}`;
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
        else if (fastF > 400 && pr < Math.min(prMax(), G.devicePixelRatio || 1)) { pr = Math.min(prMax(), pr + 0.25); R3.renderer.setPixelRatio(pr); measure(); fastF = 0; }
      }
      if (!paused && dt > 0 && !P.isOver(s) && !qaHold) {
        let ev;
        // in rete: la sessione fa i passi (host) o interpola e predice (ospite); sullo schermo diviso due input
        if (net) { net.setInput(input(dt)); net.frame(nowMs); ev = net.take(); }
        else if (split()) { const a = inView(0, () => input(dt)), b = inView(1, () => input(dt)); ev = P.step(s, dt, [a, b]); }
        else ev = P.step(s, dt, input(dt));
        ev.forEach(dispatch);
        if (!P.isOver(s)) inView(0, () => engine(s.ready <= 0, s.cars[ME]));
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
    // remote = la pausa (o la ripresa) arriva dall'altro telefono: non la si rimanda indietro
    function pause(remote) {
      if (paused || !s || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = !turnEl.hidden;
      eachView(() => { pauseBtn.innerHTML = PLAY; steerV = 0; useQ = false; gasOn = false; brakeOn = false; });
      ptrs.clear(); clearKeys();
      engine(false);
      stop();
      if (net) { net.pause(true); net.stop(); if (remote !== true) net.send({ ry: 'pause' }); }
      if (R3) draw(0);
      ctx.changed();
    }
    function resume(remote) {
      if (!paused || P.isOver(s) || !turnEl.hidden || !mpEl.hidden) return;
      paused = false;
      pauseEl.hidden = true;
      eachView(() => { pauseBtn.innerHTML = PAUSE; });
      // breve conto alla rovescia per rimettere le mani sul volante (in rete lo decide l'host)
      if (s.t > 0 && mpMode !== 'guest') { s.ready = 1.6; s.cd = 2; }
      if (net) { net.pause(false); net.start(); if (remote !== true) net.send({ ry: 'resume' }); }
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
      paused = false; over = 0; ptrs.clear(); clearKeys();
      if (!wrap || !wrap.isConnected) build();
      eachView(() => { steerV = 0; useQ = false; rollUntil = 0; shake = 0; CH.ok = false; hdgS = null; lastHud = { pos: 0, rank: '', notes: '', t: -1, it: -1, ac: -1, fx: '' }; });
      wrap.dataset.stage = cfg.stage;
      wrap.dataset.time = cfg.time;
      renderMode();
      endEl.hidden = true; endEl.innerHTML = '';
      pauseEl.hidden = true; eachView(() => { pauseBtn.innerHTML = PAUSE; });
      themeKey = '';
      if (!initGL()) {
        stage.insertAdjacentHTML('beforeend', `<div class="ry-veil"><b>${L('ry_nogl')}</b></div>`);
        return;
      }
      if (split() && !views[1].cam) views[1].cam = new T.PerspectiveCamera(66, 1, 0.1, 900);
      // schermo diviso: pixel ratio al massimo 1 (risale fino a 1,5 tornando a una vista se i fotogrammi sono veloci)
      const pm = Math.min(prMax(), G.devicePixelRatio || 1);
      if (pr > pm) { pr = pm; R3.renderer.setPixelRatio(pr); }
      buildWorld();
      measure();
      paintProg();
      themeAt = performance.now();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; eachView(() => { pauseBtn.innerHTML = PLAY; }); draw(0); hud(); return; }
      eachView((i) => { msgEl.innerHTML = `<b class="small">${L(split() && i === 0 && !coarse() ? 'ry_mp_keys' : 'pa_ready')}</b>`; msgEl.classList.remove('show'); void msgEl.offsetWidth; msgEl.classList.add('show'); });
      start();
      checkTurn();
    }
    function fresh() {
      if (mpMode) { mpNext(ctx.level); return; }
      begin(P.newLevel(ctx.level, Math.random)); ctx.changed({ reset: true });
    }
    function restartRace() {
      if (mpMode) { mpNext(s.level); return; }
      begin(P.newLevel(s.level, Math.random)); ctx.changed({ reset: true });
    }

    /* ---------- a due giocatori: schermo diviso e rete locale (HH.mp) ---------- */
    const rseed = () => Math.floor(Math.random() * 2147483647) >>> 0;
    let lastP2 = 'kitty';
    // il veil "gioca insieme": scelta tra rete e schermo diviso (quel che il dispositivo non può fare è spento)
    function mpMenu() {
      if (!s) return;
      if (!paused && !P.isOver(s)) pause();
      if (mpMode) { mpEl.innerHTML = `<b>${L('ry_mp')}</b><div class="ry-mpbtns"><button class="ry-opt" type="button" data-mp="solo">${DUO}<span>${L('ry_mp_solo')}</span></button><button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button></div>`; mpEl.hidden = false; return; }
      const canNet = !!(HH.mp && HH.mp.pair && HH.rallyNet), canSplit = splitOK();
      mpEl.innerHTML = `<b>${L('ry_mp')}</b>
        <div class="ry-mpbtns">
          <button class="ry-opt" type="button" data-mp="net"${canNet ? '' : ' disabled'}>${PHONES}<span>${L('ry_mp_net')}</span></button>
          <button class="ry-opt" type="button" data-mp="split"${canSplit ? '' : ' disabled'}>${SPLIT}<span>${L('ry_mp_split')}</span></button>
        </div>
        ${canNet ? '' : `<small>${L('ry_mp_nonet')}</small>`}${canSplit ? '' : `<small>${L('ry_mp_nosplit')}</small>`}
        <small class="ry-rule">${L('ry_mp_rule')}</small>
        <button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button>`;
      mpEl.hidden = false;
      const first = mpEl.querySelector('button:not([disabled])');
      if (first) first.focus();
    }
    let pickCb = null;
    // scelta del kart del giocatore 2 (la Micia sul kart-mela, o uno dei tre animaletti che allora non corre contro)
    function mpPick(cb, title) {
      pickCb = cb;
      mpEl.innerHTML = `<b>${title || L('ry_mp_pick')}</b><div class="ry-picks">${CHARS.slice(1).reverse().map((w) => `<button class="ry-pick" type="button" data-mp="pick:${w}" aria-label="${L('ry_who_' + w)}"><svg viewBox="-20 -28 40 42" aria-hidden="true">${kartBackW(0, 0, 1, w)}</svg><span>${L('ry_who_' + w)}</span></button>`).join('')}</div>
        <button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button>`;
      mpEl.hidden = false;
      const first = mpEl.querySelector('.ry-pick');
      if (first) first.focus();
    }
    function mpWait(text) {
      mpEl.innerHTML = `<b class="ry-waitb">${text}</b><span class="ry-dots" aria-hidden="true"><i></i><i></i><i></i></span><button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button>`;
      mpEl.hidden = false;
    }
    function mpClick(k) {
      sfx('tap');
      if (k === 'cancel') {
        // annullato mentre si aspetta l'amico: si chiude il collegamento e si torna alla gara da soli
        if (net && (!s || !s.hu)) { endMP(); return; }
        mpEl.hidden = true; return;
      }
      if (k === 'split') { mpPick((w) => startSplit(w), `${L('ry_mp_p2')}: ${L('ry_mp_pick')}`); return; }
      if (k === 'net') { startNet(); return; }
      if (k === 'solo') { endMP(); return; }
      if (k.startsWith('pick:')) { const w = k.slice(5), cb = pickCb; pickCb = null; if (cb && CHARS.indexOf(w) > 0) cb(w); }
    }
    function startSplit(p2) {
      if (!mpMode) solo = s;
      if (net) { net.close(); net = null; }
      mpMode = 'split'; ME = 0; lastP2 = p2;
      mpEl.hidden = true;
      setViews(2);
      begin(P.newLevel(ctx.level, null, { humans: 2, p2, seed: rseed() }));
      ctx.changed({ reset: true });
    }
    function startNet() {
      if (mpBusy || !HH.mp || !HH.rallyNet) return;
      mpBusy = true;
      mpEl.hidden = true;
      Promise.resolve(HH.mp.pair({ game: 'rally', players: 2, title: 'Hari Rally' })).then((link) => {
        mpBusy = false;
        if (!alive) { if (link) link.close(); return; }
        if (!link) { mpMenu(); return; }
        if (!mpMode) solo = s;
        if (link.role === 'host') {
          net = HH.rallyNet.host(link, { onMsg: hostMsg, onDrop: netDrop });
          mpMode = 'host'; ME = 0;
          net.start();
          mpWait(L('ry_mp_wait'));
        } else {
          net = HH.rallyNet.guest(link, { onMsg: guestMsg, onDrop: netDrop });
          mpMode = 'guest'; ME = 1;
          net.start();
          mpPick((w) => { lastP2 = w; net.send({ ry: 'hello', p2: w }); mpWait(L('ry_mp_host')); });
        }
        renderMode();
      }).catch(() => { mpBusy = false; mpMenu(); });
    }
    // host: arriva la scelta dell'ospite → si genera la gara e si manda solo il seme
    function hostRace(level) {
      const seed = rseed(), st = P.newLevel(level, null, { humans: 2, p2: lastP2, seed });
      st.me = 0;
      net.send({ ry: 'start', level, seed, p2: lastP2 });
      net.race(st);
      mpEl.hidden = true;
      begin(st);
      ctx.changed({ reset: true });
    }
    function hostMsg(m) {
      if (m.ry === 'hello') { lastP2 = CHARS.indexOf(m.p2) > 0 ? m.p2 : 'kitty'; hostRace(ctx.level); }
      else if (m.ry === 'pause') pause(true);
      else if (m.ry === 'resume') resume(true);
      else if (m.ry === 'quit') netDrop('quit');
    }
    function guestMsg(m) {
      if (m.ry === 'start') {
        const st = P.newLevel(m.level, null, { humans: 2, p2: m.p2, seed: m.seed });
        ME = 1; net.race(st);
        mpEl.hidden = true;
        begin(st);
        ctx.changed({ reset: true });
      } else if (m.ry === 'pause') pause(true);
      else if (m.ry === 'resume') resume(true);
      else if (m.ry === 'fin') { if (s && s.hu && !endEl.innerHTML) finish(); }
      else if (m.ry === 'quit') netDrop('quit');
    }
    // il collegamento è caduto (o l'altro è uscito): l'host continua (il kart dell'ospite ora è dell'IA), l'ospite
    // torna alla sua gara da solo
    function netDrop(why) {
      const was = mpMode;
      if (el._rally) el._rally.lastDrop = String(why || '');   // QA: motivo dell'ultima chiusura
      net = null;
      if (!alive) return;
      if (was === 'host' && s && s.hu && !P.isOver(s)) { say(L('ry_mp_left'), 'small', 2600); paintProg(); lastHud.rank = ''; return; }
      if (was === 'guest' && s && s.hu && P.isOver(s)) return;
      endMP();
      if (was) later(() => say(L(was === 'host' ? 'ry_mp_left' : 'ry_mp_lost'), 'small', 2600), 300);
    }
    // prossima gara a due (rivincita, o il livello dopo una vittoria)
    function mpNext(level) {
      if (mpMode === 'split') { begin(P.newLevel(level, null, { humans: 2, p2: lastP2, seed: rseed() })); ctx.changed({ reset: true }); return; }
      if (mpMode === 'host' && net) { hostRace(level); return; }
      if (mpMode === 'guest' && net) {
        // l'host ha già fatto partire la gara successiva (il suo "start" chiude anche il riquadro della vittoria)
        if (s && s.hu && !P.isOver(s)) return;
        endEl.hidden = true; mpWait(L('ry_mp_host')); return;
      }
      endMP(true);
    }
    // si torna a giocare da soli: la gara in singolo messa da parte (in pausa) o una nuova
    function endMP(fresh1) {
      if (net) { try { net.send({ ry: 'quit' }); } catch (e) { /* già chiuso */ } const n = net; net = null; later(() => n.close(), 200); }
      const back = solo;
      solo = null; mpMode = ''; ME = 0; pickCb = null;
      mpEl.hidden = true;
      setViews(1);
      if (back && !P.isOver(back) && !fresh1) begin(back, true);
      else begin(P.newLevel(ctx.level, Math.random));
      ctx.changed({ reset: true });
    }

    // per i controlli di qualità (Playwright): stato vivo e "avanti veloce" con un autopilota semplice (eventi compresi);
    // a due guida entrambi gli umani (o2.p2 = opzioni per il secondo)
    function autopilot(p, o2) {
      const kt = P.kAt(g, p.s), want = (o2.d != null ? o2.d : 0) - p.d;
      const kReq = kt + (Math.max(-0.4, Math.min(0.4, want * 0.12)) - p.psi) * 1.6 / Math.max(8, p.v);
      const vt = g.prof[Math.min(g.N, Math.round(p.s + p.v * 1.2))] * (o2.k || 0.95);
      return { steer: o2.steer != null ? o2.steer : Math.max(-1, Math.min(1, -kReq / P.KMAX)), gas: o2.gas != null ? o2.gas : p.v > vt ? 0 : 1, brake: o2.brake != null ? o2.brake : p.v > vt + 1 ? 1 : 0 };
    }
    function ff(sec, o2 = {}) {
      const ev = [];
      for (let t = 0; t < sec && !P.isOver(s); t += P.TICK) {
        if (s.hu) {
          const ins = s.hu.map((id, j) => Object.assign(autopilot(s.cars[id], j ? o2.p2 || {} : o2), { use: id === ME && useQ ? 1 : 0 }));
          if (net && net.role === 'guest') break;
          ev.push(...(net ? net.stepLocal(P.TICK, ins) : P.step(s, P.TICK, ins)));
        } else ev.push(...P.step(s, P.TICK, Object.assign(autopilot(s.cars[0], o2), { use: useQ ? 1 : 0 })));
        useQ = false;
      }
      ev.forEach(dispatch);
      if (!raf) draw(0);
      hud();
      return ev.map((e) => e.type);
    }
    // QA: dà un power-up a qualcuno (0 = Hari) e lo usa subito se use
    function give(item, who = 0, use = false) {
      const c = s.cars[who];
      c.it = P.ITEMS.indexOf(item);
      if (use) { if (who === ME) useQ = true; else c.use = 1e-3; }
      lastHud.it = -1; hud();
      return c.it;
    }
    // hold(true): il tempo reale si ferma (per le foto dei controlli di qualità), ff() continua a funzionare
    // posa effettivamente disegnata dei kart (dalle matrici delle mesh): x, y del piano della logica e direzione
    function drawn() {
      if (!R3 || !R3.karts) return [];
      return R3.karts.map((m) => { m.updateMatrixWorld(true); const e = m.matrixWorld.elements; return { x: e[12], y: -e[14], h: Math.atan2(-e[10], e[8]), vis: m.visible }; });
    }
    el._rally = { state: () => s, geo: () => g, three: () => R3, mode, sensor, ff, give, use: useItem, pr: () => pr, draw: () => { draw(0); hud(); }, hold: (on) => { qaHold = !!on; },
      drawn, place: () => { if (!R3 || !R3.karts) return []; for (let id = 0; id < 4; id++) placeKart(id, performance.now() / 1000, 0, reduce(), true); return drawn(); }, cam: () => camPref, setCam, setAuto, auto: autoGas, ctl: () => ({ steer: steerV, gas: gasOn, brake: brakeOn, ptrs: [...ptrs.values()].map((q) => q.role) }), input: (dt) => input(dt || 0.016),
      // a due: modo, kart di chi guarda, viste (rettangoli), controllo di rete; split(p2) avvia lo schermo diviso
      mp: () => ({ mode: mpMode, me: ME, views: views.map((v) => v.rect), net: net ? net.role : '', solo: !!solo }), split: (p2 = 'kitty') => startSplit(p2), solo: () => endMP(), menu: mpMenu, netCtl: () => net,
      views: () => views.length, forceSplit: false, auto2: (on) => { qaAuto = !!on; },
      // QA: disegno con i contatori di three.js sommati su tutte le viste (draw call, triangoli) e tempo del disegno
      info: () => { if (!R3) return null; const inf = R3.renderer.info; inf.autoReset = false; inf.reset(); const gl = R3.renderer.getContext(); gl.finish(); const t0 = performance.now(); draw(0); gl.finish(); const ms = performance.now() - t0; const r = { calls: inf.render.calls, tris: inf.render.triangles, ms, pr, views: Math.max(1, views.length) }; inf.autoReset = true; return r; } };
    // la partita a due non si salva: si riprende la gara in singolo che era stata messa da parte
    const sv = saved && saved.hu ? saved.solo : saved;
    const migrated = sv && typeof sv.seed === 'number' && sv.L > 0 && Array.isArray(sv.cars) && sv.cars.length === 4 && !sv.hu ? P.migrate(sv) : null;
    if (migrated && !P.isOver(migrated)) begin(migrated, true);
    else fresh();
    // aperto quando lo schermo intero è già attivo (resta acceso tra un gioco e l'altro): orizzontale e misure subito
    if (fsEl()) onFull();

    return {
      fresh,
      restart: restartRace,
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },
      resume() { resume(); },
      // a due: lo stato della gara (per fragoline e progressi) con dentro la gara in singolo da riprendere
      snapshot: () => (mpMode && s ? Object.assign({}, s, { solo: solo || null, mp: mpMode }) : s),
    };
  }

  /* tutorial della prima partita */
  const puRow = (x, y, k, list) => list.map((n, i) => `<g class="ry-tut-gift" style="animation-delay:${(i * 0.15).toFixed(2)}s"><svg x="${x + i * 17 * k}" y="${y}" width="${16 * k}" height="${16 * k}" viewBox="0 0 48 48">${PU_ART[n]}</svg></g>`).join('');
  const RULES_EN = 'Kart rally through forests, cities, seaside and snow, by day and by night, with Hari in his strawberry kart: accelerate, brake and steer (automatic speed is an option). Follow the pace notes (6 = fast bend, 1 = hairpin), brake before tight bends or you slide onto the grass, hold a drift for a mini boost, grab surprise gifts for silly power-ups and finish in the top 3 against Bunny, Fox and Panda.';
  const tilted = (x, y) => `<g transform="translate(${x} ${y})"><g class="ry-tut-wheel"><rect x="-10" y="-6" width="20" height="12" rx="3" fill="var(--card-solid)" ${o(1.2)}/><rect x="-7" y="-4" width="14" height="8" rx="1.5" fill="var(--ry-sky-1)"/></g></g>`;
  const sparks = (x, y) => [[-4, 0], [-1, -3], [-6, -4], [2, 1]].map(([a, b], i) => `<circle cx="${x + a}" cy="${y + b}" r="${1.4 - i * 0.2}" fill="var(--ry-${i % 2 ? 'carrot' : 'spark'})"/>`).join('');
  const TUT = [
    { key: 'tu_rally_1', en: 'Drive Hari\'s strawberry kart! Right pedal to speed up, left pedal to brake (keep it pressed to go backwards). Steer with the arrows or by dragging, or in full screen tilt the phone like a wheel. Keyboard: arrows to drive, space for power-ups.',
      art: forest(`${tilted(18, 14)}<g class="ry-tut-car">${kartBack(60, 70, 0.95, 0)}</g>${pedalArt(16, 74, 1, false)}${pedalArt(104, 72, 1, true)}${arrowArt(34, 78, 0.8, -1)}${arrowArt(86, 78, 0.8, 1)}`) },
    { key: 'tu_rally_2', en: 'Read the pace notes: 6 is almost straight, 1 is a hairpin. Brake before the small numbers or you slide wide onto the grass! Too fast in a bend the kart drifts: hold the drift and you get a mini boost when it straightens.',
      art: forest(`<g class="ry-tut-note">${noteArt(36, 6, 1.5, 1, 2, `<svg x="2" y="18" width="7" height="7" viewBox="0 0 24 24">${IC.warn}</svg>`)}</g>${sparks(46, 82)}${kartBack(60, 74, 0.9, 0, -14)}`) },
    { key: 'tu_rally_4', en: 'Drive through the surprise gifts to get a power-up, then tap the big button (or space) to use it: carrot turbo, bubble shield, banana peel or honey puddle to leave behind, flower cloud for whoever is ahead, acorn magnet and spring jump. Acorns make you a bit faster!',
      art: forest(`<g class="ry-tut-gift">${giftArt(44, 44, 0.34)}</g>${puRow(10, 12, 1, ['carrot', 'bubble', 'banana', 'honey'])}${puRow(28, 30, 1, ['cloud', 'magnet', 'spring'])}${kartBack(60, 78, 0.8, 0)}`) },
    { key: 'tu_rally_3', en: 'Race Bunny, Fox and Panda on their fruit karts through forests, cities, seaside roads and snowy mountains, and finish in the top 3! Off the road you slow right down, trees, rocks and barriers stop you, and if you go too far a little cloud brings you back.',
      art: forest(`<g class="ry-tut-car">${kartBack(42, 60, 0.5, 1)}${kartBack(80, 56, 0.44, 2)}${kartBack(62, 50, 0.36, 3)}${kartBack(60, 78, 0.8, 0)}</g>
        <g transform="translate(10 8)"><rect x="0" y="8" width="8" height="10" fill="var(--ry-silver)" ${o(1)}/><rect x="8" y="2" width="8" height="16" fill="var(--ry-gold)" ${o(1)}/><rect x="16" y="11" width="8" height="7" fill="var(--ry-bronze)" ${o(1)}/></g>
        <g transform="translate(98 18)"><path d="M-9 4c-4 0-5-5-2-6 0-5 6-6 8-3 2-4 8-3 8 1 4 0 5 5 2 7Z" fill="var(--ry-petal-2)" ${o(1)}/><circle cx="-3" cy="0" r="1.6" fill="var(--ry-petal)"/><circle cx="3" cy="1" r="1.6" fill="var(--ry-petal)"/></g>`) },
  ];
  HH.games.push({
    id: 'rally', name: 'Hari Rally', rules: 'r14',
    rulesEn: RULES_EN,
    art, create,
    tutorial: TUT,
    rate: (s) => HH.rally.rate(s),
    parTime: (s) => HH.rally.par(s),
    progress: (s) => HH.rally.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
