/* Hari Rally — testi di riserva, disegni SVG (piloti, power-up, icone, cruscotto), illustrazioni della card e del tutorial.
 * Solo token CSS --ry-*. Si carica prima di rally-ui.js, che legge HH.rallyArt.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
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

  HH.rallyArt = { L, o, WHO, CHARS, FRUITW, CCOLW, CCOL, faceW, PU_LIST, puSvg, ACORN, arrow, ic, BIG, FLAG, PAUSE,
    PLAY, TILT, HAND, PEDAL, GAS, CAM, AUTO, DUO, PHONES, SPLIT, ZONE, PHONE, DASH, kartBackW, art, RULES_EN, TUT
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
