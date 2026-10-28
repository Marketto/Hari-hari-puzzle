/* Hari Rally — interfaccia 3D (three.js r160, copia locale in src/vendor/three.min.js, scaricata solo aprendo il gioco).
 * Visuale pilota: cofano 3D della macchinina di Hari, cruscotto SVG col volante e le zampine (gira con lo sterzo),
 * strada sterrata nel bosco con colline, dossi, ponticelli sul ruscello, alberi, funghi, rocce, fiori, laghetti,
 * cartelli a freccia nei tornanti, raggi di sole tra gli alberi. Cel shading: MeshToonMaterial con rampa a 3 toni e
 * contorni "a guscio rovesciato" (copie ingrandite con le facce interne, color inchiostro). Colori solo dai token
 * --ry-* (getComputedStyle → THREE.Color); tema scuro = notte coi fari; varianti di tappa su data-stage.
 * Prestazioni da telefono: pixel ratio ≤ 1,5 (cala da solo se gli fps scendono), nebbia, scenario a blocchi di 120 m
 * costruiti mentre ci si avvicina e nascosti da lontano, alberi e funghi con InstancedMesh, terreno a griglia che segue
 * la camera.
 *
 * Controlli (accelerazione automatica):
 *   sensori (schermo intero, telefono girato): inclina il telefono come un volante, tieni premuto ovunque = freno
 *   tocco: tieni premuta la metà sinistra/destra per sterzare (più a lungo = più forte), pedale in basso al centro = freno
 *   tastiera: frecce/A-D sterzo, giù/S/spazio freno, P/Esc pausa. Pulsante in alto a destra: sensori ↔ tocco.
 * Pausa automatica a pagina nascosta, col tutorial e col telefono in verticale a schermo intero.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    ry_board: 'Forest rally: steer and brake', ry_turn: 'Turn your phone sideways', ry_tilt: 'Tilt to steer', ry_touch: 'Touch to steer',
    ry_brake: 'Brake', ry_top3: 'Finish in the top 3!', ry_nogl: 'This game needs 3D graphics (WebGL).',
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
  };
  const ic = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const BIG = {
    crest: `<path d="M4 40C16 40 18 16 30 16S44 40 56 40Z" fill="var(--ry-dirt)" stroke="var(--ry-note-line)" stroke-width="3" stroke-linejoin="round"/><path d="M20 12l10-7 10 7" fill="none" stroke="var(--ry-arrow)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    bridge: `<path d="M6 26h48M6 26v14M54 26v14M14 26c4-10 28-10 32 0" fill="none" stroke="var(--ry-note-line)" stroke-width="3.4" stroke-linecap="round"/><path d="M8 31h44" stroke="var(--ry-wood)" stroke-width="5"/><path d="M4 43q6-4 13 0t13 0 13 0 13 0" fill="none" stroke="var(--ry-water)" stroke-width="3.4" stroke-linecap="round"/>`,
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
  const art = () => forest(`${carBack(62, 56, 0.55, 'var(--ry-bunny-car)', 'bunny')}${hood(miniWheel())}${noteArt(84, 7, 1, -1, 3)}`);

  /* ---------- utilità ---------- */
  let rmAt = -1e9, rmVal = false;
  const reduce = () => { const n = Date.now(); if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); } return rmVal; };
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const KEYS = { ArrowLeft: 'l', ArrowRight: 'r', a: 'l', d: 'r', A: 'l', D: 'r', ArrowDown: 'b', s: 'b', S: 'b', ' ': 'b' };
  const fmtT = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), sec = t - m * 60; return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`; };
  const PITCH = Math.atan(0.45 / 12);   // la camera guarda appena in giù
  const COLS = ['ink', 'sky-1', 'sky-2', 'sun', 'cloud', 'hill', 'grass', 'grass-2', 'verge', 'dirt', 'dirt-2', 'dirt-3', 'wood', 'wood-2', 'water', 'water-2',
    'trunk', 'leaf-1', 'leaf-2', 'leaf-3', 'pine', 'pine-2', 'snow-cap', 'rock', 'rock-2', 'cap', 'cap-dot', 'stem', 'flower-1', 'flower-2', 'flower-3', 'bush', 'shaft',
    'chevron', 'chevron-2', 'check-1', 'check-2', 'pole', 'flag', 'car', 'car-2', 'trim', 'tire', 'glass', 'head', 'tail', 'bunny-car', 'fox-car', 'panda-car',
    'bunny', 'bunny-in', 'fox', 'fox-2', 'panda', 'panda-2', 'dust', 'leafp', 'spark', 'nsky-1', 'nsky-2', 'nsun', 'nhill'];
  const NUMS = ['amb', 'sunI', 'night', 'shafts', 'namb', 'nsunI'];

  function create(el, ctx, saved) {
    const P = HH.rally, T = G.THREE;
    let s = null, g = null, raf = 0, last = 0, paused = false, over = 0, timers = [], lastChanged = 0, alive = true;
    let wrap, stage, cv, needle, wheelG, posEl, rankEl, timeEl, notesEl, progEl, msgEl, pauseEl, endEl, turnEl, pedalEl, zoneL, zoneR, modeBtn, pauseBtn, glErr = false;
    let W = 300, H = 400, pr = 1, slowF = 0, fastF = 0;
    let keys = {}, ptrs = new Map(), steerV = 0, brakeOn = false, hdgS = null, camRoll = 0;
    let pref = 'tilt';
    try { pref = (HH.store && HH.store.get && HH.store.get('rally:ctl')) || 'tilt'; } catch (e) { pref = 'tilt'; }
    const sensor = { at: 0, raw: 0, zero: 0, val: 0, asked: false };
    let lastHud = { pos: 0, rank: '', notes: '', t: -1 };
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const sfx = (k, ...a) => { if (ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };
    const audio = () => HH.audio || {};

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
          <div class="ry-touch" aria-hidden="true"><div class="ry-zone l">${ZONE(-1)}</div><div class="ry-zone r">${ZONE(1)}</div></div>
          <div class="ry-dash">${DASH}</div>
          <div class="ry-prog" aria-hidden="true">${[3, 2, 1, 0].map((i) => `<i class="${i ? '' : 'me'}" data-id="${i}" style="--ry-c:${CCOL[i]}"></i>`).join('')}<b>${FLAG}</b></div>
          <div class="ry-top">
            <div class="ry-left"><div class="ry-pos" role="status"><b>4</b><small>/4</small></div><div class="ry-rank" aria-hidden="true"></div></div>
            <div class="ry-notes" aria-live="polite"></div>
            <div class="ry-right"><div class="ry-btns">
              <button class="ry-btn ry-mode" type="button"></button>
              <button class="ry-btn ry-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button></div>
              <div class="ry-time">0:00.0</div></div>
          </div>
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
          const l = Math.hypot(mx, my, mz) || 1;
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
      GEO = {
        box: keep(new T.BoxGeometry(1, 1, 1)), sph: keep(new T.IcosahedronGeometry(1, 1)), sph2: keep(new T.SphereGeometry(1, 10, 8)), lo: keep(new T.SphereGeometry(1, 7, 5)),
        cyl: keep(new T.CylinderGeometry(1, 1, 1, 10)), cone: keep(new T.ConeGeometry(1, 1, 8)), rock: keep(new T.DodecahedronGeometry(1, 0)),
      };
      return GEO;
    }
    function meshOf(m, olMat, mat) {
      const grp = new T.Group();
      if (m.line) { const ol = new T.Mesh(m.line, olMat); grp.add(ol); }
      grp.add(new T.Mesh(m.body, mat));
      return grp;
    }

    /* ---------- altezze ---------- */
    let BR = [];
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
    const groundH = (x, y) => P.height(g, x, y) - creek(x, y) - 0.14;
    function roadH(sv, x, y) {
      let h = P.height(g, x, y);
      for (const b of g.bridges) if (sv > b.s0 - 5 && sv < b.s1 + 5) h += 0.3 * Math.min(1, Math.min(sv - (b.s0 - 5), b.s1 + 5 - sv) / 4);
      return h;
    }
    // da piano della logica (x, y) a three (x, h, −y)
    const V3 = (x, h, y) => new T.Vector3(x, h, -y);

    /* ---------- scena ---------- */
    function buildWorld() {
      disposeWorld();
      readTheme();
      geos();
      const night = N.night || 0, dark = night >= 1;
      const scene = new T.Scene();
      R3.scene = scene;
      const skyTop = dark ? C['nsky-1'] : C['sky-1'], skyLow = dark ? C['nsky-2'] : C['sky-2'];
      const cfg = P.config(s.level);
      const fogFar = (dark ? 150 : 235) - cfg.fog * 70;
      scene.fog = new T.Fog(skyLow.clone(), dark ? 12 : 30, fogFar);
      scene.background = skyLow.clone();
      R3.camera.far = 900; R3.camera.updateProjectionMatrix();
      R3.fogFar = fogFar;
      R3.inkMat = basic({ color: C.ink, side: T.BackSide });
      R3.vc = toon({ vertexColors: true });
      // luci
      const hemi = new T.HemisphereLight(skyTop, C.grass, dark ? N.namb : N.amb);
      const sun = new T.DirectionalLight(dark ? C.nsun : C.sun, dark ? N.nsunI : N.sunI);
      scene.add(hemi, sun, sun.target);
      R3.sun = sun; R3.sunDir = new T.Vector3(0.5, 0.9, -0.35).normalize();
      // cielo: cupola sfumata, sole o luna, nuvole, colline lontane, stelle di notte (tutto segue la camera)
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
      const hr = HH.rng((s.seed ^ 0x51ed) >>> 0);
      // colline lontane: anello frastagliato
      {
        const n = 72, pos = [], hillC = dark ? C.nhill : C.hill;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, r = 470;
          const h0 = 26 + 40 * Math.abs(Math.sin(i * 0.7 + hr() * 0.4)) + hr() * 10, h1 = 26 + 40 * Math.abs(Math.sin((i + 1) * 0.7 + hr() * 0.4)) + hr() * 10;
          const P0 = [Math.cos(a0) * r, -30, Math.sin(a0) * r], P1 = [Math.cos(a1) * r, -30, Math.sin(a1) * r];
          const Q0 = [P0[0], h0, P0[2]], Q1 = [P1[0], h1, P1[2]];
          pos.push(...P0, ...Q0, ...P1, ...P1, ...Q0, ...Q1);
        }
        const hg = keep(new T.BufferGeometry()); hg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        sky.add(new T.Mesh(hg, basic({ color: hillC, fog: false, side: T.DoubleSide, depthWrite: false })));
      }
      if (!dark) {
        const cm = toon({ color: C.cloud, fog: false });
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
      scene.add(sky);
      R3.sky = sky;
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
      // ponti: dati per il ruscello
      BR = g.bridges.map((b) => { const m = (b.s0 + b.s1) / 2, w = P.world(g, m); return { x: w.x, y: w.y, tx: Math.cos(w.th), ty: Math.sin(w.th), m, th: w.th }; });
      buildGround();
      R3.chunks = [];
      for (let a = 0; a < g.N - 2; a += 120) R3.chunks.push({ a, b: Math.min(g.N, a + 120), grp: null });
      R3.built = 0;
      buildCars();
      buildHood();
      buildFx();
      // primi blocchi subito (la partenza si vede intera)
      for (let i = 0; i < Math.min(3, R3.chunks.length); i++) buildChunk(R3.chunks[i]);
      hdgS = null;
    }
    function disposeWorld() {
      if (!R3 || !R3.scene) return;
      R3.disp.forEach((x) => { try { x.dispose(); } catch (e) { /* già liberato */ } });
      R3.disp = [];
      GEO = null;
      if (R3.head) { R3.camera.remove(R3.head, R3.head.target); R3.head = null; }
      if (R3.hood) R3.camera.remove(R3.hood);
      R3.scene = null;
    }

    /* terreno: griglia che segue la camera, alte dalla funzione del terreno */
    function buildGround() {
      const n = 64, cell = 6, geo = keep(new T.PlaneGeometry(n * cell, n * cell, n, n));
      geo.rotateX(-Math.PI / 2);
      const col = new Float32Array(geo.attributes.position.count * 3);
      geo.setAttribute('color', new T.BufferAttribute(col, 3));
      const m = new T.Mesh(geo, R3.vc);
      m.frustumCulled = false;
      R3.scene.add(m);
      R3.ground = { m, n, cell, cx: 1e9, cy: 1e9 };
    }
    function updateGround(x, y) {
      const G0 = R3.ground, cx = Math.round(x / G0.cell / 4) * 4, cy = Math.round(y / G0.cell / 4) * 4;
      if (cx === G0.cx && cy === G0.cy) return;
      G0.cx = cx; G0.cy = cy;
      const pa = G0.m.geometry.attributes.position, ca = G0.m.geometry.attributes.color, half = (G0.n * G0.cell) / 2;
      const c1 = C.grass, c2 = C['grass-2'];
      for (let i = 0; i < pa.count; i++) {
        const ix = i % (G0.n + 1), iy = Math.floor(i / (G0.n + 1));
        const wx = cx * G0.cell - half + ix * G0.cell, wy = cy * G0.cell + half - iy * G0.cell;
        pa.setXYZ(i, wx, groundH(wx, wy), -wy);
        const hsh = Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453, f = hsh - Math.floor(hsh);
        const c = f < 0.5 ? c1 : c2;
        ca.setXYZ(i, c.r, c.g, c.b);
      }
      pa.needsUpdate = true; ca.needsUpdate = true;
      G0.m.geometry.computeVertexNormals();
      G0.m.geometry.computeBoundingSphere();
    }

    /* blocco di scenario: strada, bordi, alberi, funghi, rocce, fiori, cespugli, ponti, cartelli, raggi di luce */
    function buildChunk(ch) {
      if (ch.grp) return;
      const t0 = performance.now();
      const grp = new T.Group();
      const { a, b } = ch, HALF = P.HALF;
      const r = HH.rng(((s.seed * 31) ^ (a * 2654435761)) >>> 0);
      // strada a strisce (solchi delle ruote, gobba d'erba al centro) e bordi chiari
      const strips = [[-HALF - 1.6, -HALF, 'verge'], [-HALF, -2.1, 'dirt'], [-2.1, -1.2, 'dirt-2'], [-1.2, 1.2, 'dirt-3'], [1.2, 2.1, 'dirt-2'], [2.1, HALF, 'dirt'], [HALF, HALF + 1.6, 'verge']];
      const pos = [], col = [];
      const push = (p, c) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); };
      const pt = (sv, d, up) => { const w = P.world(g, sv, d); return V3(w.x, roadH(sv, w.x, w.y) + up, w.y); };
      for (let sv = a; sv < b; sv += 2) {
        const s2 = Math.min(b, sv + 2);
        const br = g.bridges.find((q) => sv >= q.s0 - 1 && sv < q.s1 + 1);
        for (const [d0, d1, ck] of strips) {
          let c = C[ck], up = ck === 'verge' ? 0.03 : 0.07;
          if (br) { if (ck === 'verge') continue; c = Math.floor(sv / 2) % 2 ? C.wood : C['wood-2']; up = 0.09; }
          const A = pt(sv, d0, up), B = pt(sv, d1, up), Cc = pt(s2, d0, up), D = pt(s2, d1, up);
          push(A, c); push(Cc, c); push(B, c); push(Cc, c); push(D, c); push(B, c);   // faccia verso l'alto
        }
      }
      const rg = keep(new T.BufferGeometry());
      rg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      rg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      rg.computeVertexNormals();
      const road = new T.Mesh(rg, R3.vc);
      grp.add(road);
      // oggetti con colori nei vertici (ponti, cartelli, traguardo, laghetti, funghi)
      const parts = [], add = (geo, c, m, ol = 0) => parts.push({ geo, c, m, ol });
      const at = (sv, d, up = 0, rot = 0) => { const w = P.world(g, sv, d); const h = up === 'g' ? groundH(w.x, w.y) + 0.14 : roadH(sv, w.x, w.y) + up; return { x: w.x, h, z: -w.y, ry: Math.atan2(Math.cos(w.th), -Math.sin(w.th)) + rot, th: w.th }; };
      // ponti: travi e ringhiere; acqua del ruscello sotto
      for (const q of g.bridges) {
        if (q.s1 < a || q.s0 >= b) continue;
        for (const side of [-1, 1]) {
          for (let sv = q.s0; sv <= q.s1; sv += 3) { const p = at(sv, side * (HALF + 0.35), 0.5); add(GEO.box, C['wood-2'], M4(p.x, p.h, p.z, 0, p.ry, 0, 0.22, 1.0, 0.22), 0.05); }
          for (let sv = q.s0; sv < q.s1; sv += 3) {
            const p0 = at(sv + 1.5, side * (HALF + 0.35), 0.95);
            add(GEO.box, C.wood, M4(p0.x, p0.h, p0.z, 0, p0.ry, 0, 0.16, 0.16, 3.1), 0.05);
          }
        }
        const m = (q.s0 + q.s1) / 2, w = P.world(g, m), base = P.height(g, w.x, w.y);
        const water = new T.Mesh(GEO.box, toon({ color: C.water }));
        water.position.set(w.x, base - 1.35, -w.y); water.rotation.y = Math.atan2(Math.cos(w.th), -Math.sin(w.th)); water.scale.set(150, 0.1, 6.5);
        grp.add(water);
      }
      // traguardo e partenza: archi a scacchi con bandierine
      for (const [sv, kind] of [[P.PREROLL, 0], [P.PREROLL + s.L, 1]]) {
        if (sv < a || sv >= b) continue;
        for (const side of [-1, 1]) { const p = at(sv, side * (HALF + 0.9), 2.4); add(GEO.cyl, C.pole, M4(p.x, p.h, p.z, 0, 0, 0, 0.18, 4.8, 0.18), 0.05); }
        const p = at(sv, 0, 4.7);
        add(GEO.box, C.ink, M4(p.x, p.h, p.z, 0, p.ry, 0, 2 * HALF + 2.3, 1.0, 0.22));
        const n = 14;
        for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
          const q = at(sv, -HALF - 0.9 + ((i + 0.5) * (2 * HALF + 1.8)) / n, 4.45 + j * 0.45);
          add(GEO.box, (i + j) % 2 ? C['check-2'] : C['check-1'], M4(q.x, q.h, q.z, 0, q.ry, 0, (2 * HALF + 1.8) / n, 0.44, 0.3));
        }
        if (kind === 1) for (const side of [-1, 1]) { const f = at(sv, side * (HALF + 0.9), 5.6); add(GEO.cone, C.flag, M4(f.x, f.h, f.z, 0, f.ry, side * 1.57, 0.4, 1.0, 0.2), 0.04); }
      }
      // cartelli a freccia all'esterno delle curve strette
      for (const nt of g.notes) {
        if (nt.kind !== 'curve' || nt.g > 2 || nt.apex < a || nt.apex >= b) continue;
        for (const off of [-12, 0, 12]) {
          const sv = nt.apex + off, p = at(sv, -nt.dir * (P.WALL + 0.6), 'g');
          add(GEO.box, C.ink, M4(p.x, p.h + 0.55, p.z, 0, p.ry, 0, 0.12, 1.1, 0.12));
          add(GEO.box, C.chevron, M4(p.x, p.h + 1.25, p.z, 0, p.ry, 0, 1.7, 0.8, 0.12), 0.05);
          for (const dy of [-0.18, 0.18]) add(GEO.box, C['chevron-2'], M4(p.x, p.h + 1.25 + dy, p.z, 0, p.ry, nt.dir * (dy > 0 ? -0.75 : 0.75), 0.13, 0.5, 0.16));
        }
      }
      // alberi, cespugli, funghi, fiori, rocce: posizioni con il seme del blocco
      const trees = { round: [], pine: [] }, bush = [], mush = [], flow = [], rocks = [];
      const stage = P.config(s.level).stage;
      const clearOf = (x, y, d) => P.nearest(g, x, y).dist >= d;
      for (let sv = a; sv < b; sv += 2.4) {
        for (const side of [-1, 1]) {
          const br = g.bridges.some((q) => sv > q.s0 - 6 && sv < q.s1 + 6);
          // cespugli che segnano il bordo morbido
          if (!br && r() < 0.42) { const w = P.world(g, sv + r() * 2, side * (P.WALL + 0.9 + r() * 0.9)); if (clearOf(w.x, w.y, P.WALL + 0.6)) bush.push([w.x, w.y, 0.7 + r() * 0.5]); }
          // alberi a più file
          const dl = P.WALL + 2.4 + Math.pow(r(), 1.5) * 32;
          if (r() < 0.8 - (dl - 10) / 70) {
            const w = P.world(g, sv + (r() - 0.5) * 2.4, side * dl);
            if (clearOf(w.x, w.y, P.WALL + 2.2)) (r() < (stage === 'snow' ? 0.75 : stage === 'autumn' ? 0.35 : 0.42) ? trees.pine : trees.round).push([w.x, w.y, 0.75 + r() * 0.6, r()]);
          }
          if (r() < 0.07) { const w = P.world(g, sv, side * (P.WALL + 1.2 + r() * 2)); if (clearOf(w.x, w.y, P.WALL + 0.9)) mush.push([w.x, w.y, 0.8 + r() * 0.7]); }
          if (!br && r() < 0.16) { const w = P.world(g, sv, side * (P.HALF + 1.8 + r() * 2.4)); if (clearOf(w.x, w.y, P.HALF + 1.5)) flow.push([w.x, w.y, Math.floor(r() * 3)]); }
          if (r() < 0.03) { const w = P.world(g, sv, side * (P.WALL + 3 + r() * 10)); if (clearOf(w.x, w.y, P.WALL + 2)) rocks.push([w.x, w.y, 0.6 + r() * 0.9]); }
        }
      }
      for (const rk of g.rocks) if (rk.s >= a && rk.s < b) { const w = P.world(g, rk.s, rk.d); rocks.push([w.x, w.y, rk.r * 1.05, 1]); }
      // laghetto
      if (r() < 0.26) {
        const sv = a + 30 + r() * 60, side = r() < 0.5 ? -1 : 1, w = P.world(g, sv, side * (24 + r() * 10));
        if (clearOf(w.x, w.y, 18)) {
          const h = groundH(w.x, w.y) + 0.2, rr = 6 + r() * 4;
          add(GEO.cyl, C['water-2'], M4(w.x, h - 0.05, -w.y, 0, r() * 3, 0, rr + 0.8, 0.12, rr * 0.7 + 0.8));
          add(GEO.cyl, C.water, M4(w.x, h + 0.02, -w.y, 0, 0, 0, rr, 0.1, rr * 0.7));
          for (let i = 0; i < 3; i++) add(GEO.cyl, C['leaf-1'], M4(w.x + (r() - 0.5) * rr, h + 0.1, -w.y + (r() - 0.5) * rr * 0.6, 0, 0, 0, 0.9, 0.05, 0.9));
        }
      }
      // funghi (gambo + cappello a pois): parti fuse
      for (const [x, y, k] of mush) {
        const h = groundH(x, y) + 0.14;
        add(GEO.cyl, C.stem, M4(x, h + 0.35 * k, -y, 0, 0, 0, 0.22 * k, 0.7 * k, 0.22 * k), 0.04);
        add(GEO.sph, C.cap, M4(x, h + 0.75 * k, -y, 0, 0, 0, 0.62 * k, 0.4 * k, 0.62 * k), 0.05);
        for (let i = 0; i < 3; i++) { const a2 = i * 2.1 + x; add(GEO.sph, C['cap-dot'], M4(x + Math.cos(a2) * 0.36 * k, h + 0.98 * k, -y + Math.sin(a2) * 0.36 * k, 0, 0, 0, 0.1 * k, 0.06 * k, 0.1 * k)); }
      }
      if (parts.length) { const mm = merge(parts); grp.add(meshOf(mm, R3.inkMat, R3.vc)); }
      // istanze
      const inst = (geo, mat, list, place, olGeo, tint) => {
        if (!list.length) return;
        const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4();
        list.forEach((it, i) => { place(m4, it); im.setMatrixAt(i, m4); if (tint) im.setColorAt(i, tint(it)); });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        grp.add(im);
        if (olGeo) { const ol = new T.InstancedMesh(olGeo, R3.inkMat, list.length); ol.instanceMatrix = im.instanceMatrix; ol.boundingSphere = im.boundingSphere; grp.add(ol); }
      };
      const TG = treeGeos(stage);
      const placeTree = (m4, [x, y, k, q]) => m4.compose(new T.Vector3(x, groundH(x, y) + 0.1, -y), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), q * 6.28), new T.Vector3(k, k * (0.9 + q * 0.3), k));
      const leaf = [C['leaf-1'], C['leaf-2'], C['leaf-3']], pin = [C.pine, C['pine-2']];
      inst(TG.trunk, TG.trunkMat, trees.round.concat(trees.pine), placeTree);
      inst(TG.round.body, TG.tintMat, trees.round, placeTree, TG.round.line, (it) => leaf[it[3] < 0.5 ? 0 : it[3] < 0.82 ? 1 : 2]);
      inst(TG.pine.body, TG.tintMat, trees.pine, placeTree, TG.pine.line, (it) => pin[it[3] < 0.6 ? 0 : 1]);
      if (TG.cap) inst(TG.cap, TG.capMat, trees.pine, placeTree);
      inst(TG.bush.body, TG.tintMat, bush, (m4, [x, y, k]) => m4.compose(new T.Vector3(x, groundH(x, y) + 0.1, -y), new T.Quaternion(), new T.Vector3(k * 1.3, k, k * 1.3)), TG.bush.line, () => C.bush);
      inst(GEO.sph, TG.flowMat, flow, (m4, [x, y]) => m4.compose(new T.Vector3(x, groundH(x, y) + 0.36, -y), new T.Quaternion(), new T.Vector3(0.24, 0.2, 0.24)), null, (it) => [C['flower-1'], C['flower-2'], C['flower-3']][it[2]]);
      inst(GEO.rock, TG.tintMat, rocks, (m4, [x, y, k]) => m4.compose(new T.Vector3(x, groundH(x, y) + 0.3 * k, -y), new T.Quaternion().setFromEuler(new T.Euler(x, y, 0)), new T.Vector3(k * 1.2, k * 0.85, k)), TG.rockLine, (it) => (it[3] ? C.rock : C['rock-2']));
      // raggi di sole tra gli alberi (giorno, primavera e autunno)
      if (N.shafts > 0 && r() < 0.8) {
        // fasci obliqui che sfumano verso l'alto (colore e trasparenza nei vertici)
        const sp = [], sc = [], c = C.shaft;
        for (let i = 0; i < 3; i++) {
          const sv = a + r() * (b - a), side = r() < 0.5 ? -1 : 1, w = P.world(g, sv, side * (P.WALL + 3 + r() * 8)), h = groundH(w.x, w.y);
          const wd = 0.7 + r() * 0.9, ox = 5 + r() * 3;
          const p0 = [w.x - wd, h, -w.y], p1 = [w.x + wd, h, -w.y], p2 = [w.x + wd * 1.8 + ox, h + 15, -w.y - 4], p3 = [w.x - wd * 1.8 + ox, h + 15, -w.y - 4];
          sp.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
          for (const al of [0.32, 0.32, 0, 0.32, 0, 0]) sc.push(c.r, c.g, c.b, al);
        }
        const sg = keep(new T.BufferGeometry());
        sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        sg.setAttribute('color', new T.Float32BufferAttribute(sc, 4));
        grp.add(new T.Mesh(sg, TG.shaftMat));
      }
      // centro e raggio per la visibilità
      let mx = 0, my = 0;
      for (let i = a; i <= b; i += 4) { mx += g.x[i]; my += g.y[i]; }
      const cnt = Math.floor((b - a) / 4) + 1;
      ch.x = mx / cnt; ch.y = my / cnt;
      ch.rad = 0;
      for (let i = a; i <= b; i += 4) ch.rad = Math.max(ch.rad, Math.hypot(g.x[i] - ch.x, g.y[i] - ch.y));
      ch.rad += 44;
      ch.grp = grp;
      R3.scene.add(grp);
      (R3.buildT = R3.buildT || []).push(+(performance.now() - t0).toFixed(1));   // diagnostica (QA): tempi di costruzione
    }
    let TGc = null;
    function treeGeos(stage) {
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
      const bush = merge([
        { geo: GEO.lo, c: W1, m: M4(0, 0.5, 0, 0, 0, 0, 0.95, 0.75, 0.95), ol: 0.08 },
        { geo: GEO.lo, c: W1, m: M4(0.75, 0.35, 0.15, 0, 0, 0, 0.62, 0.55, 0.62), ol: 0.07 },
      ]);
      const trunk = keep(new T.CylinderGeometry(0.2, 0.32, 2.6, 7)); trunk.translate(0, 1.3, 0);
      let cap = null;
      if (stage === 'snow') {
        const cm = merge([
          { geo: GEO.cone, c: C['snow-cap'], m: M4(0, 4.75, 0, 0, 0, 0, 1.0, 1.15, 1.0) },
          { geo: GEO.cone, c: C['snow-cap'], m: M4(0, 5.75, 0, 0, 0, 0, 0.68, 1.0, 0.68) },
        ]);
        cap = cm.body;
      }
      const rockLine = keep(GEO.rock.clone()); rockLine.scale(1.09, 1.12, 1.09);
      TGc = {
        key: R3.scene.uuid, round, pine, bush, trunk, cap, rockLine,
        trunkMat: toon({ color: C.trunk }), tintMat: toon({ vertexColors: true }), capMat: toon({ vertexColors: true }), flowMat: toon({}),
        shaftMat: basic({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }),
      };
      return TGc;
    }

    /* macchinine degli avversari (e cofano di Hari) */
    function carParts(body, who) {
      const ps = [], add = (geo, c, m, ol = 0) => ps.push({ geo, c, m, ol });
      add(GEO.box, body, M4(0, 0.62, 0, 0, 0, 0, 1.8, 0.56, 3.6), 0.05);
      add(GEO.box, C.trim, M4(0, 0.42, 1.82, 0, 0, 0, 1.86, 0.26, 0.3), 0.04);
      add(GEO.box, C.trim, M4(0, 0.42, -1.82, 0, 0, 0, 1.86, 0.26, 0.3), 0.04);
      add(GEO.box, C.glass, M4(0, 1.13, -0.2, 0, 0, 0, 1.48, 0.5, 1.7), 0.04);
      add(GEO.box, body, M4(0, 1.43, -0.2, 0, 0, 0, 1.58, 0.13, 1.82), 0.04);
      add(GEO.box, C['car-2'], M4(0, 0.91, 0, 0, 0, 0, 0.42, 0.03, 3.62));
      for (const x of [-0.9, 0.9]) for (const z of [-1.2, 1.2]) add(GEO.cyl, C.tire, M4(x, 0.38, z, 0, 0, Math.PI / 2, 0.38, 0.32, 0.38), 0.04);
      for (const x of [-0.6, 0.6]) { add(GEO.sph, C.head, M4(x, 0.68, 1.84, 0, 0, 0, 0.17, 0.13, 0.08)); add(GEO.box, C.tail, M4(x, 0.74, -1.86, 0, 0, 0, 0.36, 0.15, 0.06)); }
      // alettone da rally
      add(GEO.box, C['car-2'], M4(0, 1.32, -1.72, 0, 0, 0, 1.64, 0.08, 0.34), 0.04);
      for (const x of [-0.55, 0.55]) add(GEO.box, C.trim, M4(x, 1.1, -1.66, 0, 0, 0, 0.08, 0.4, 0.08));
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
      for (let id = 1; id <= 3; id++) {
        const mm = merge(carParts(bodies[id], WHO[id]));
        const grp = meshOf(mm, R3.inkMat, R3.vc);
        R3.scene.add(grp);
        R3.cars[id] = grp;
      }
    }
    function buildHood() {
      const ps = [], add = (geo, c, m, ol = 0) => ps.push({ geo, c, m, ol });
      // cofano (il bordo davanti a 2,9 m, sopra a quota −0,5; measure() lo alza/abbassa secondo il campo visivo):
      // la parte vicina resta sotto il cruscotto, si vede il bordo con le gobbe dei fari e le due strisce
      add(GEO.box, C.car, M4(0, -0.68, -1.6, 0.04, 0, 0, 2.0, 0.34, 2.2));
      add(GEO.sph, C.car, M4(0, -0.62, -2.55, 0, 0, 0, 1.0, 0.16, 0.36), 0.05);
      for (const x of [-0.16, 0.16]) add(GEO.box, C['car-2'], M4(x, -0.505, -1.7, 0.04, 0, 0, 0.14, 0.02, 2.2));
      for (const x of [-0.72, 0.72]) add(GEO.sph, C.car, M4(x, -0.53, -2.32, 0, 0, 0, 0.28, 0.12, 0.36), 0.04);
      const mm = merge(ps);
      const grp = meshOf(mm, R3.inkMat, toon({ vertexColors: true, fog: false }));
      R3.camera.add(grp);
      R3.hood = grp;
    }

    /* particelle: polvere dietro le auto, foglie e stelline dagli urti */
    function buildFx() {
      const n = 160, pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
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
      // fanalini posteriori che brillano al buio
      if ((N.night || 0) > 0) {
        const tg = keep(new T.BufferGeometry()); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(18), 3));
        const tl = new T.Points(tg, keep(new T.PointsMaterial({ size: 0.42, map: tex, color: C.tail, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
        tl.frustumCulled = false;
        R3.scene.add(tl);
        R3.tails = tl;
      } else R3.tails = null;
    }
    function emit(x, y, z, vx, vy, vz, c, life, a = 0.8) {
      const F = R3.fx, p = F.list[F.next];
      F.next = (F.next + 1) % F.n;
      Object.assign(p, { x, y, z, vx, vy, vz, c, life, t: 0, a });
    }
    function burst(kind) {
      if (reduce() || !R3 || !R3.fx) return;
      const cam = R3.camera, f = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), rgt = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      const n = kind === 'leaf' ? 14 : 10, col = kind === 'leaf' ? [C.leafp, C['leaf-1'], C['leaf-2']] : [C.spark, C['cap-dot']];
      for (let i = 0; i < n; i++) {
        const side = (Math.random() - 0.5) * 2;
        const p = cam.position.clone().addScaledVector(f, 3 + Math.random() * 2).addScaledVector(rgt, side * 1.6);
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

    /* ---------- disegno ---------- */
    function measure() {
      if (!stage) return;
      W = stage.clientWidth || 300; H = stage.clientHeight || 400;
      if (!R3) return;
      R3.renderer.setSize(W, H, false);
      R3.camera.aspect = W / H;
      R3.camera.fov = W / H < 1 ? 74 : W / H > 1.7 ? 58 : 64;
      R3.camera.updateProjectionMatrix();
      // il bordo del cofano (2,9 m davanti) cade al 71% dell'altezza, qualunque sia il campo visivo
      const a = Math.atan(0.42 * Math.tan((R3.camera.fov * Math.PI) / 360)) + PITCH;
      R3.hoodY = -2.9 * Math.tan(a) + 0.5;
      if (!raf) draw(0);
    }
    function draw(dt) {
      if (!R3 || !R3.scene || !s) return;
      const p = s.cars[0], cam = R3.camera, now = performance.now() / 1000;
      const w = P.world(g, p.s, p.d), h0 = roadH(p.s, w.x, w.y);
      let hop = 0;
      if (p.air > 0 && p.airT > 0) { const k = 1 - p.air / p.airT; hop = 4 * p.airT * 1.1 * k * (1 - k); }
      const hdg = w.th + p.psi;
      if (hdgS === null || !(dt > 0)) hdgS = hdg; else hdgS += (hdg - hdgS) * Math.min(1, dt * 14);
      const vm = P.config(s.level).vmax, sp = p.v / vm, rm = reduce();
      const shake = rm ? 0 : (p.off ? 0.05 : 0.012) * sp;
      const eye = V3(w.x, h0 + 1.15 + hop + (rm ? 0 : Math.sin(now * 19) * shake), w.y);
      cam.position.copy(eye);
      const ah = P.world(g, p.s + 12, p.d), hA = roadH(p.s + 12, ah.x, ah.y);
      const look = V3(w.x + Math.cos(hdgS) * 12, h0 + 1.15 + (hA - h0) * 0.85 - 12 * Math.tan(PITCH) + hop * 0.5, w.y + Math.sin(hdgS) * 12);
      cam.lookAt(look);
      const roll = Math.max(-0.06, Math.min(0.06, p.kc * p.v * p.v * 0.0032));
      camRoll += (roll - camRoll) * Math.min(1, (dt || 0.016) * 6);
      if (!rm) cam.rotateZ(camRoll + (p.off ? (Math.random() - 0.5) * 0.012 * sp : 0));
      if (R3.hood) R3.hood.position.y = (R3.hoodY || 0) + (rm ? 0 : Math.sin(now * 23) * 0.006 * sp);
      // cielo segue la camera; la luce principale arriva da dietro-sinistra-alto rispetto a chi guida (niente controluce)
      R3.sky.position.copy(eye);
      const fx = Math.cos(hdgS), fz = -Math.sin(hdgS);
      R3.sun.position.set(eye.x - fx * 60 + fz * 35, eye.y + 80, eye.z - fz * 60 - fx * 35);
      R3.sun.target.position.copy(eye);
      updateGround(w.x + Math.cos(hdgS) * 90, w.y + Math.sin(hdgS) * 90);
      // blocchi di scenario: costruisce il prossimo (uno per fotogramma) e mostra solo quelli vicini
      const ahead = p.s + 320;
      for (const ch of R3.chunks) {
        if (!ch.grp && ch.a < ahead && ch.b > p.s - 80) { buildChunk(ch); break; }
      }
      for (const ch of R3.chunks) if (ch.grp) ch.grp.visible = Math.hypot(ch.x - w.x, ch.y - w.y) < R3.fogFar + ch.rad;
      // avversari
      const tails = R3.tails ? R3.tails.geometry.attributes.position : null;
      for (let id = 1; id <= 3; id++) {
        const c = s.cars[id], m = R3.cars[id], cw = P.world(g, c.s, c.d), ch = roadH(c.s, cw.x, cw.y);
        const ry = Math.atan2(Math.cos(cw.th + c.psi), -Math.sin(cw.th + c.psi));
        m.position.set(cw.x, ch + (rm ? 0 : Math.abs(Math.sin(now * 13 + id * 2)) * 0.05 * (c.v / vm)), -cw.y);
        m.rotation.set(0, ry, 0);
        m.rotateZ(-c.kc * c.v * c.v * 0.004);
        m.visible = Math.abs(c.s - p.s) < R3.fogFar + 20;
        // polvere
        if (dt > 0 && !rm && c.v > 9 && m.visible && c.s - p.s > 9 && Math.random() < dt * 12) {
          const bx = cw.x - Math.cos(cw.th) * 2.1, by = cw.y - Math.sin(cw.th) * 2.1;
          emit(bx + (Math.random() - 0.5) * 1.4, ch + 0.25, -by, (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8, c.off ? C.leafp : C.dust, 0.8, 0.4);
        }
        if (tails) {
          const back = 1.9, nx = -Math.sin(cw.th), ny = Math.cos(cw.th);
          for (const [k, sd] of [[0, -0.6], [1, 0.6]]) tails.setXYZ((id - 1) * 2 + k, cw.x - Math.cos(cw.th) * back + nx * sd, ch + 0.75, -(cw.y - Math.sin(cw.th) * back + ny * sd));
        }
      }
      if (tails) tails.needsUpdate = true;
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
      // volante e lancetta
      const ang = steerV * 70;
      if (wheelG) wheelG.style.transform = `rotate(${ang.toFixed(1)}deg)`;
      if (needle) needle.setAttribute('transform', `rotate(${(-20 + (p.v / P.config(s.level).vmax) * 200).toFixed(0)})`);
      zoneL.classList.toggle('on', steerV < -0.2 && mode() === 'touch');
      zoneR.classList.toggle('on', steerV > 0.2 && mode() === 'touch');
      pedalEl.classList.toggle('on', brakeOn);
    }
    function noteHTML(n, j) {
      if (n.kind !== 'curve') return `<div class="ry-note${j ? ' next' : ''}"><svg viewBox="0 0 60 48" aria-hidden="true">${BIG[n.kind]}</svg><span class="ry-dist"><i></i></span></div>`;
      const mods = [n.caution && 'warn', n.nocut && 'nocut', n.long && 'long', n.into && 'into'].filter(Boolean);
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
      return { steer: steerV, brake: brake ? 1 : 0 };
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
      if (e.target.closest('.ry-retry')) { e.preventDefault(); restartRace(); }
    };
    function onKey(e) {
      if (!alive || !el.isConnected) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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
      const vm = P.config(s.level).vmax, v = p.v / vm;
      // tre marce: il motore sale e "cambia"
      const gear = v < 0.33 ? 0 : v < 0.66 ? 1 : 2, rpm = Math.min(1, (v - gear * 0.33) / 0.38 * 0.8 + 0.2 + gear * 0.06);
      A.engine(true, rpm, Math.min(1, (p.off ? 0.6 : 0) + Math.min(1, p.slide / 6) * 0.6), brakeOn && p.v > 3);
    }

    /* ---------- eventi della logica ---------- */
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
        case 'call': { const n = g.notes[e.i]; const A = audio(); if (A.sfx && A.sfx.pace) A.sfx.pace(n.kind === 'curve' ? n.dir : 0, n.kind === 'curve' ? n.g : 0); break; }
        case 'off': burst('leaf'); break;
        case 'boing': burst('leaf'); sfx('boing'); bumpAnim(); break;
        case 'rock': burst('spark'); sfx('boing'); bumpAnim(); if (ctx.react) ctx.react('oops'); break;
        case 'bump': burst('spark'); sfx('set'); bumpAnim(); break;
        case 'jump': sfx('pick'); break;
        case 'pass': if (e.up) { sfx('place'); changed(true); } else sfx('tap'); break;
        case 'finish': finish(); break;
        default: break;
      }
    }
    function bumpAnim() { if (reduce()) return; stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump'); }
    function finish() {
      over = performance.now();
      engine(false);
      ptrs.clear(); keys = {};
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
      if (!paused && dt > 0 && !P.isOver(s)) {
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
      ptrs.clear(); keys = {}; steerV = 0;
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
      paused = false; over = 0; ptrs.clear(); keys = {}; steerV = 0; lastHud = { pos: 0, rank: '', notes: '', t: -1 };
      if (!wrap || !wrap.isConnected) build();
      wrap.dataset.stage = P.config(s.level).stage;
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
        ev.push(...P.step(s, P.TICK, { steer: o2.steer != null ? o2.steer : Math.max(-1, Math.min(1, -kReq / P.KMAX)), brake: p.v > vt ? 1 : 0 }));
      }
      ev.forEach(onEvent);
      if (!raf) draw(0);
      hud();
      return ev.map((e) => e.type);
    }
    el._rally = { state: () => s, geo: () => g, three: () => R3, mode, sensor, ff, pr: () => pr };
    const ok = saved && saved.v === 1 && Array.isArray(saved.cars) && saved.cars.length === 4 && saved.L > 0 && typeof saved.seed === 'number';
    if (ok && !P.isOver(saved)) begin(JSON.parse(JSON.stringify(saved)), true);
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
  const TUT = [
    { key: 'tu_rally_1', en: 'Hari speeds up by himself: you steer and brake! In full screen turn the phone sideways and tilt it like a wheel, hold anywhere to brake. Or touch left/right and use the pedal. Arrows and space work too.',
      art: forest(`${hood(`<g class="ry-tut-wheel">${miniWheel()}</g>`)}
        <g transform="translate(18 14)"><g class="ry-tut-wheel"><rect x="-10" y="-6" width="20" height="12" rx="3" fill="var(--card-solid)" ${o(1.2)}/><rect x="-7" y="-4" width="14" height="8" rx="1.5" fill="var(--ry-sky-1)"/></g></g>
        <g transform="translate(22 76)"><rect x="-8" y="-7" width="16" height="14" rx="4" fill="var(--ry-stop)" ${o(1.2)}/><path d="M-4 -2h8M-4 2h8" stroke="var(--ry-hi)" stroke-width="1.6" stroke-linecap="round"/></g>`) },
    { key: 'tu_rally_2', en: 'Read the pace notes: the arrow and the number say how tight the next bend is. 6 is almost straight, 1 is a hairpin: brake before the small numbers! The yellow triangle means caution.',
      art: forest(`<g class="ry-tut-note">${noteArt(36, 8, 1.6, 1, 2, `<svg x="2" y="18" width="7" height="7" viewBox="0 0 24 24">${IC.warn}</svg>`)}</g>${hood(miniWheel())}`) },
    { key: 'tu_rally_3', en: 'Race Bunny, Fox and Panda through the forest and finish in the top 3! Off the road you slow down, bushes are soft and bumps are just a little push.',
      art: forest(`<g class="ry-tut-car">${carBack(46, 58, 0.42, 'var(--ry-bunny-car)', 'bunny')}${carBack(74, 54, 0.36, 'var(--ry-fox-car)', 'fox')}${carBack(60, 50, 0.28, 'var(--ry-panda-car)', 'panda')}</g>
        <g transform="translate(10 8)"><rect x="0" y="8" width="8" height="10" fill="var(--ry-silver)" ${o(1)}/><rect x="8" y="2" width="8" height="16" fill="var(--ry-gold)" ${o(1)}/><rect x="16" y="11" width="8" height="7" fill="var(--ry-bronze)" ${o(1)}/></g>${hood(miniWheel())}`) },
  ];
  HH.games.push({
    id: 'rally', name: 'Hari Rally', rules: 'r14',
    rulesEn: 'First-person forest rally: Hari speeds up by himself, you steer and brake. Follow the pace notes (6 = fast bend, 1 = hairpin) and finish in the top 3 against Bunny, Fox and Panda. In full screen turn the phone and tilt it to steer!',
    art, create,
    tutorial: TUT,
    rate: (s) => HH.rally.rate(s),
    parTime: (s) => HH.rally.par(s),
    progress: (s) => HH.rally.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
