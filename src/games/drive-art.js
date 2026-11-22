/* Hari Taxi — testi di riserva, disegni cel (Hari al volante, animaletti, veicoli dall'alto, icone), illustrazioni della card e del tutorial.
 * Solo token CSS --dr-*. Si carica prima di drive-ui.js, che legge HH.driveArt.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    dr_board: 'City: touch and drag to drive', dr_start: 'Touch and drag to drive!',
    dr_m_taxi: 'Pick up the passengers!', dr_m_food: 'Deliver the hot food!', dr_m_parcel: 'Deliver the parcels!',
    dr_thanks: 'Thank you!', dr_late: 'Too late!', dr_time: 'Time left',
    // mappe (i nomi delle località reali restano quelli di OpenStreetMap, non si traducono)
    dr_maps: 'Choose the map', dr_map: 'Map', dr_map_hari: 'Hari City', dr_map_real: 'Real streets, kawaii style',
    dr_loading: 'Loading the map…', dr_map_err: 'This map downloads the first time: connect to the internet and try again!',
    er_close: 'Close', play: 'Play', level: 'Level',
    // già tradotte (Hari Parade)
    pa_ready: 'Ready?', pa_go: 'Go!', pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_pause: 'Pause',
  };
  const L = (k) => label(k, EN[k]);

  /* ---------- disegni cel (colori solo da token --dr-*) ---------- */
  const o = (w = 2) => `stroke="var(--dr-ink)" stroke-width="${(w * 0.8).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"`;
  const hi = (d, w = 2.6, op = 0.8) => `<path d="${d}" fill="none" stroke="var(--dr-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const f1 = (n) => +n.toFixed(1);
  const eye = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--dr-eye)"/><circle cx="${f1(cx + rx * 0.32)}" cy="${f1(cy - ry * 0.36)}" r="${f1(rx * 0.48)}" fill="var(--dr-hi)"/><circle cx="${f1(cx - rx * 0.3)}" cy="${f1(cy + ry * 0.4)}" r="${f1(rx * 0.2)}" fill="var(--dr-hi)"/>`;
  const blush = (cx, cy, r) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(r)}" ry="${f1(r * 0.6)}" fill="var(--dr-blush)"/>`;
  // occhi + guance. mood: '' | 'joy' | 'oops'
  function face(cx, cy, sp, mood, k = 1) {
    const L0 = cx - sp, R0 = cx + sp, w = 4.6 * k;
    let e;
    if (mood === 'joy') e = [L0, R0].map((x) => `<path d="M${f1(x - w)} ${f1(cy + 1)}Q${x} ${f1(cy - w * 1.2)} ${f1(x + w)} ${f1(cy + 1)}" fill="none" stroke="var(--dr-eye)" stroke-width="${f1(2.6 * k)}" stroke-linecap="round"/>`).join('');
    else if (mood === 'oops') e = `<path d="M${f1(L0 - w)} ${f1(cy - w * 0.8)}l${f1(w * 1.7)} ${f1(w * 0.8)}l${f1(-w * 1.7)} ${f1(w * 0.8)}M${f1(R0 + w)} ${f1(cy - w * 0.8)}l${f1(-w * 1.7)} ${f1(w * 0.8)}l${f1(w * 1.7)} ${f1(w * 0.8)}" fill="none" stroke="var(--dr-eye)" stroke-width="${f1(2.6 * k)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else e = eye(L0, cy, f1(4.4 * k), f1(5.6 * k)) + eye(R0, cy, f1(4.4 * k), f1(5.6 * k));
    return e + blush(L0 - 6 * k, cy + 7 * k, 4.6 * k) + blush(R0 + 6 * k, cy + 7 * k, 4.6 * k);
  }
  const mouth = (cx, y, m, k = 1) => (m === 'joy' ? `<path d="M${f1(cx - 4 * k)} ${f1(y)}q${f1(4 * k)} ${f1(7 * k)} ${f1(8 * k)} 0z" fill="var(--dr-mouth)" stroke="var(--dr-nose)" stroke-width="${f1(1.3 * k)}" stroke-linejoin="round"/>`
    : m === 'oops' ? `<ellipse cx="${cx}" cy="${f1(y + 2 * k)}" rx="${f1(3 * k)}" ry="${f1(3.6 * k)}" fill="var(--dr-mouth)" stroke="var(--dr-nose)" stroke-width="${f1(1.2 * k)}"/>`
      : `<path d="M${f1(cx - 3.4 * k)} ${f1(y)}q${f1(1.7 * k)} ${f1(2.3 * k)} ${f1(3.4 * k)} 0q${f1(1.7 * k)} ${f1(2.3 * k)} ${f1(3.4 * k)} 0" fill="none" stroke="var(--dr-nose)" stroke-width="${f1(1.5 * k)}" stroke-linecap="round"/>`);
  function quills(cx, cy, r, len, a0, a1, n) {
    const pt = (a, rr) => `${f1(cx + rr * Math.cos(a * Math.PI / 180))} ${f1(cy + rr * Math.sin(a * Math.PI / 180))}`;
    const st = (a1 - a0) / n;
    let d = `M${cx} ${cy}L${pt(a0, r)}`;
    for (let k = 0; k < n; k++) d += `L${pt(a0 + st * (k + 0.5), r + len)}L${pt(a0 + st * (k + 1), r)}`;
    return `${d}Z`;
  }
  const puffy = (cs, fill, w = 2) => cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${o(w)}/>`).join('') + cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${f1(r - w * 0.45)}" fill="${fill}"/>`).join('');

  /* Hari al volante: testa di fronte (adesivo sempre dritto) con il cappellino del mestiere */
  const HAT = {
    taxi: `<path d="M24 30C26 12 74 12 76 30Z" fill="var(--dr-taxi)" ${o(2)}/><path d="M20 31h60c2 0 2 6-1 6H21c-3 0-3-6-1-6z" fill="var(--dr-taxi-2)" ${o(1.8)}/>
      <rect x="44" y="17" width="12" height="8" rx="2" fill="var(--dr-check)"/><rect x="47" y="19" width="6" height="4" rx="1" fill="var(--dr-taxi)"/>`,
    scooter: `<path d="M20 40C18 10 82 10 80 40C70 34 30 34 20 40Z" fill="var(--dr-scoot)" ${o(2.2)}/><path d="M26 38c8-5 40-5 48 0" fill="none" stroke="var(--dr-glass-2)" stroke-width="5" stroke-linecap="round"/>${hi('M30 26q8-10 22-11', 3, 0.7)}`,
    van: `<path d="M26 30C28 13 72 13 74 30Z" fill="var(--dr-van)" ${o(2)}/><path d="M60 29h26c3 0 3 6 0 6H58z" fill="var(--dr-van-2)" ${o(1.8)}/><circle cx="50" cy="15" r="3" fill="var(--dr-van-3)" ${o(1)}/>`,
  };
  const HARI = (hat, m = '') => `<path d="${quills(50, 56, 31, 13, -205, 25, 11)}" fill="var(--dr-quill-2)" ${o(2.2)}/>
    <path d="${quills(50, 56, 27, 8, -198, 18, 10)}" fill="var(--dr-quill)"/>
    <circle cx="24" cy="46" r="8" fill="var(--dr-ear)" ${o(2)}/><circle cx="24" cy="46.5" r="4" fill="var(--dr-ear-in)"/>
    <circle cx="76" cy="46" r="8" fill="var(--dr-ear)" ${o(2)}/><circle cx="76" cy="46.5" r="4" fill="var(--dr-ear-in)"/>
    <ellipse cx="50" cy="64" rx="30" ry="24" fill="var(--dr-face)" ${o(2.4)}/>
    <path d="M36 44C41 51 46 53 50 53C54 53 59 51 64 44C58 38 42 38 36 44Z" fill="var(--dr-quill-3)"/>
    ${face(50, 63, 11, m, 1.2)}<ellipse cx="50" cy="72" rx="3.4" ry="2.5" fill="var(--dr-nose)"/>${mouth(50, 76, m === 'oops' ? 'oops' : 'joy', 1.1)}
    ${HAT[hat] || ''}`;

  /* animaletti (di fronte): testa grande, corpicino con la maglietta. fr = passo, m = umore */
  const SHIRT = ['var(--dr-shirt-1)', 'var(--dr-shirt-2)', 'var(--dr-shirt-3)'];
  const feetP = (fr) => `<ellipse cx="42" cy="${fr ? 95 : 93}" rx="7" ry="4" fill="var(--dr-ink)" opacity=".85"/><ellipse cx="58" cy="${fr ? 93 : 95}" rx="7" ry="4" fill="var(--dr-ink)" opacity=".85"/>`;
  const bodyP = (i, fr) => `${feetP(fr)}<path d="M33 92C33 74 40 68 50 68S67 74 67 92Z" fill="${SHIRT[i % 3]}" ${o(2)}/>
    <ellipse cx="${fr ? 31 : 32}" cy="80" rx="5" ry="7" transform="rotate(${fr ? 20 : 8} 32 80)" fill="${SHIRT[i % 3]}" ${o(1.6)}/><ellipse cx="${fr ? 68 : 69}" cy="80" rx="5" ry="7" transform="rotate(${fr ? -8 : -20} 68 80)" fill="${SHIRT[i % 3]}" ${o(1.6)}/>`;
  const PED = {
    bunny: (m) => `<ellipse cx="38" cy="16" rx="7" ry="17" transform="rotate(-10 38 16)" fill="var(--dr-bunny)" ${o(2)}/><ellipse cx="38" cy="18" rx="3.4" ry="11" transform="rotate(-10 38 18)" fill="var(--dr-bunny-in)"/>
      <ellipse cx="62" cy="16" rx="7" ry="17" transform="rotate(10 62 16)" fill="var(--dr-bunny)" ${o(2)}/><ellipse cx="62" cy="18" rx="3.4" ry="11" transform="rotate(10 62 18)" fill="var(--dr-bunny-in)"/>
      <ellipse cx="50" cy="46" rx="27" ry="24" fill="var(--dr-bunny)" ${o(2.2)}/>${face(50, 45, 10, m)}<path d="M47.6 52h4.8l-2.4 2.4z" fill="var(--dr-bunny-in)"/>${mouth(50, 56, m, 0.8)}`,
    chick: (m) => `<path d="M44 22C42 13 49 9 51 16C53 9 61 11 57 20" fill="var(--dr-chick)" ${o(1.8)}/>
      <ellipse cx="50" cy="46" rx="28" ry="25" fill="var(--dr-chick)" ${o(2.2)}/>${face(50, 42, 10, m)}<path d="M45 51l5-3 5 3-5 5z" fill="var(--dr-beak)" ${o(1.4)}/>`,
    piggy: (m) => `<path d="M26 32L23 12L42 24Z" fill="var(--dr-pig)" ${o(2)}/><path d="M74 32L77 12L58 24Z" fill="var(--dr-pig)" ${o(2)}/>
      <ellipse cx="50" cy="46" rx="29" ry="25" fill="var(--dr-pig)" ${o(2.2)}/>${face(50, 40, 12, m)}
      <ellipse cx="50" cy="53" rx="9" ry="6.4" fill="var(--dr-pig-2)" ${o(1.6)}/><ellipse cx="47" cy="53" rx="1.6" ry="2.4" fill="var(--dr-ink)" opacity=".6"/><ellipse cx="53" cy="53" rx="1.6" ry="2.4" fill="var(--dr-ink)" opacity=".6"/>`,
    bear: (m) => `<circle cx="26" cy="24" r="10" fill="var(--dr-bear)" ${o(2)}/><circle cx="74" cy="24" r="10" fill="var(--dr-bear)" ${o(2)}/>
      <ellipse cx="50" cy="46" rx="29" ry="25" fill="var(--dr-bear)" ${o(2.2)}/>${face(50, 40, 12, m)}
      <ellipse cx="50" cy="54" rx="11" ry="8" fill="var(--dr-muzzle)" ${o(1.6)}/><ellipse cx="50" cy="50.5" rx="3.6" ry="2.6" fill="var(--dr-nose)"/>${mouth(50, 55, m, 0.7)}`,
    sheep: (m) => `${puffy([[50, 22, 11], [32, 28, 11], [68, 28, 11], [25, 46, 11], [75, 46, 11], [33, 63, 10], [67, 63, 10], [50, 46, 22]], 'var(--dr-wool)')}
      <ellipse cx="50" cy="48" rx="15" ry="16" fill="var(--dr-sheep)" ${o(1.8)}/>${face(50, 46, 7, m, 0.8)}${mouth(50, 55, m, 0.7)}`,
    cat: (m) => `<path d="M22 34L22 10L42 22Z" fill="var(--dr-cat)" ${o(2)}/><path d="M26 28L26 16L36 23Z" fill="var(--dr-cat-in)"/>
      <path d="M78 34L78 10L58 22Z" fill="var(--dr-cat)" ${o(2)}/><path d="M74 28L74 16L64 23Z" fill="var(--dr-cat-in)"/>
      <ellipse cx="50" cy="46" rx="29" ry="25" fill="var(--dr-cat)" ${o(2.2)}/>${face(50, 43, 11, m)}<path d="M47.5 50h5l-2.5 2.5z" fill="var(--dr-cat-in)"/>
      <path d="M28 50l-11-2M28 54l-11 2M72 50l11-2M72 54l11 2" stroke="var(--dr-ink)" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>${mouth(50, 55, m, 0.7)}`,
    frog: (m) => `<circle cx="34" cy="26" r="11" fill="var(--dr-frog)" ${o(2)}/><circle cx="66" cy="26" r="11" fill="var(--dr-frog)" ${o(2)}/>
      <ellipse cx="50" cy="48" rx="31" ry="22" fill="var(--dr-frog)" ${o(2.2)}/>
      ${m === 'joy' ? face(50, 26, 16, 'joy', 0.9) : m === 'oops' ? face(50, 26, 16, 'oops', 0.9) : eye(34, 26, 5, 6) + eye(66, 26, 5, 6)}
      ${blush(30, 50, 5)}${blush(70, 50, 5)}<path d="M36 52q14 ${m === 'oops' ? 4 : 12} 28 0" fill="none" stroke="var(--dr-frog-2)" stroke-width="3" stroke-linecap="round"/>`,
    duck: (m) => `<path d="M48 22C44 14 52 10 55 17" fill="none" ${o(2)}/>
      <ellipse cx="50" cy="46" rx="27" ry="25" fill="var(--dr-duck)" ${o(2.2)}/>${face(50, 40, 11, m)}
      <ellipse cx="50" cy="53" rx="12" ry="6" fill="var(--dr-beak)" ${o(1.6)}/><path d="M40 53h20" stroke="var(--dr-ink)" stroke-width="1.2" opacity=".5"/>`,
  };
  const pedSVG = (k, i, fr, m) => `${bodyP(i, fr)}${PED[k](m)}`;

  /* veicoli visti dall'alto, rivolti a est; 100 unità = 1 casella */
  const wheels = (xs, y0, y1, w = 14) => xs.map((x) => `<rect x="${x}" y="${y0 - 4}" width="${w}" height="8" rx="3" fill="var(--dr-tire)"/><rect x="${x}" y="${y1 - 4}" width="${w}" height="8" rx="3" fill="var(--dr-tire)"/>`).join('');
  function carSVG(col, col2, extra = '', sign = '') {
    return `${wheels([28, 78], 9, 61)}
      <rect x="14" y="8" width="92" height="54" rx="17" fill="${col}" ${o(2.4)}/>
      <path d="M14 40h92v5c0 9-8 17-17 17H31c-9 0-17-8-17-17z" fill="${col2}" opacity=".55"/>
      <path d="M70 15c6 1 11 3 12 6v28c-1 3-6 5-12 6z" fill="var(--dr-glass)" ${o(1.6)}/>
      <path d="M30 17c-4 1-6 3-7 5v26c1 2 3 4 7 5z" fill="var(--dr-glass)" ${o(1.6)}/>
      <rect x="34" y="16" width="34" height="38" rx="10" fill="${col}" ${o(1.6)}/>${hi('M38 22q12-4 26-1', 2.4, 0.55)}
      <ellipse cx="103" cy="18" rx="3" ry="5" fill="var(--dr-head)" ${o(1)}/><ellipse cx="103" cy="52" rx="3" ry="5" fill="var(--dr-head)" ${o(1)}/>
      <rect x="13" y="13" width="4" height="9" rx="2" fill="var(--dr-tail)"/><rect x="13" y="48" width="4" height="9" rx="2" fill="var(--dr-tail)"/>
      ${extra}${sign}`;
  }
  const checks = (y) => Array.from({ length: 8 }, (_, i) => `<rect x="${30 + i * 6}" y="${y}" width="6" height="4" fill="${i % 2 ? 'var(--dr-taxi)' : 'var(--dr-check)'}"/>`).join('');
  const VEHS = {
    taxi: { w: 120, h: 70, svg: () => carSVG('var(--dr-taxi)', 'var(--dr-taxi-2)', `${checks(9)}${checks(57)}`,
      `<rect x="20" y="28" width="11" height="14" rx="3" fill="var(--dr-sign)" ${o(1.4)}/><path d="M23 35h5" stroke="var(--dr-check)" stroke-width="2"/>`)
      .replace(/<rect x="34" y="16" width="34" height="38" rx="10"[^>]*\/>/, '<rect x="34" y="16" width="34" height="38" rx="10" fill="var(--dr-tire)" opacity=".8"/>') },
    scooter: { w: 90, h: 60, svg: () => `<rect x="70" y="27" width="14" height="6" rx="3" fill="var(--dr-tire)"/><rect x="8" y="27" width="12" height="6" rx="3" fill="var(--dr-tire)"/>
      <path d="M20 22h44c10 0 14 4 14 8s-4 8-14 8H20z" fill="var(--dr-scoot)" ${o(2.2)}/>
      <path d="M64 14v32" stroke="var(--dr-metal)" stroke-width="4" stroke-linecap="round"/><circle cx="64" cy="13" r="3.4" fill="var(--dr-tire)"/><circle cx="64" cy="47" r="3.4" fill="var(--dr-tire)"/>
      <ellipse cx="78" cy="30" rx="3" ry="4" fill="var(--dr-head)" ${o(1)}/>
      <rect x="10" y="14" width="26" height="32" rx="6" fill="var(--dr-box)" ${o(2.2)}/><path d="M14 30h18M23 18v24" stroke="var(--dr-box-2)" stroke-width="2.4"/>
      <path d="M17 22q6-4 12 0" fill="none" stroke="var(--dr-hi)" stroke-width="2" opacity=".7"/>` },
    van: { w: 140, h: 80, svg: () => `${wheels([26, 92], 8, 72, 16)}
      <rect x="12" y="7" width="116" height="66" rx="14" fill="var(--dr-van)" ${o(2.4)}/>
      <rect x="16" y="11" width="78" height="58" rx="8" fill="var(--dr-van-3)" ${o(1.6)}/>
      <path d="M16 54h78v7c0 4-4 8-8 8H24c-4 0-8-4-8-8z" fill="var(--dr-van-2)" opacity=".35"/>
      <path d="M40 26l15-7 15 7v16l-15 7-15-7z" fill="var(--dr-p1)" ${o(1.6)}/><path d="M40 26l15 7 15-7M55 33v16" fill="none" ${o(1.4)}/>
      <path d="M104 14c8 1 15 4 16 8v36c-1 4-8 7-16 8z" fill="var(--dr-glass)" ${o(1.6)}/>
      <rect x="96" y="20" width="10" height="40" rx="4" fill="var(--dr-tire)" opacity=".75"/>
      <ellipse cx="125" cy="17" rx="3" ry="5" fill="var(--dr-head)" ${o(1)}/><ellipse cx="125" cy="63" rx="3" ry="5" fill="var(--dr-head)" ${o(1)}/>
      <rect x="11" y="12" width="4" height="10" rx="2" fill="var(--dr-tail)"/><rect x="11" y="58" width="4" height="10" rx="2" fill="var(--dr-tail)"/>` },
    bus: { w: 200, h: 80, svg: (c) => `${wheels([30, 150], 8, 72, 18)}
      <rect x="10" y="7" width="180" height="66" rx="14" fill="${c}" ${o(2.4)}/>
      <path d="M10 52h180v7c0 8-6 14-14 14H24c-8 0-14-6-14-14z" fill="var(--dr-bus-2)" opacity=".45"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${26 + i * 21}" y="11" width="16" height="7" rx="3" fill="var(--dr-glass)" ${o(1)}/><rect x="${26 + i * 21}" y="62" width="16" height="7" rx="3" fill="var(--dr-glass)" ${o(1)}/>`).join('')}
      <rect x="40" y="26" width="34" height="28" rx="6" fill="var(--dr-ac)" ${o(1.4)}/><rect x="110" y="28" width="24" height="24" rx="5" fill="var(--dr-ac)" ${o(1.4)}/><circle cx="122" cy="40" r="7" fill="var(--dr-ac-2)"/>
      <path d="M178 13c5 1 9 4 10 8v38c-1 4-5 7-10 8z" fill="var(--dr-glass)" ${o(1.6)}/>
      <ellipse cx="188" cy="18" rx="2.6" ry="5" fill="var(--dr-head)"/><ellipse cx="188" cy="62" rx="2.6" ry="5" fill="var(--dr-head)"/>` },
    bike: { w: 80, h: 50, svg: () => `<rect x="10" y="22" width="18" height="6" rx="3" fill="var(--dr-tire)"/><rect x="52" y="22" width="18" height="6" rx="3" fill="var(--dr-tire)"/>
      <path d="M19 25h42" stroke="var(--dr-bike)" stroke-width="5" stroke-linecap="round"/><path d="M58 14v22" stroke="var(--dr-metal)" stroke-width="4" stroke-linecap="round"/>
      <rect x="28" y="19" width="14" height="12" rx="5" fill="var(--dr-bike)" ${o(1.6)}/>` },
  };
  const CARCOL = ['var(--dr-c1)', 'var(--dr-c2)', 'var(--dr-c3)', 'var(--dr-c4)', 'var(--dr-c5)', 'var(--dr-c6)'];

  /* icone (viewBox 100) */
  const DISH = {
    ramen: `<path d="M14 46h72c0 22-16 36-36 36S14 68 14 46z" fill="var(--dr-ramen-2)" ${o(2.4)}/><path d="M20 46h60" stroke="var(--dr-ramen)" stroke-width="7" stroke-linecap="round"/>
      <path d="M30 40q6-14 12 0M46 40q6-14 12 0" fill="none" stroke="var(--dr-ramen)" stroke-width="4" stroke-linecap="round"/><path d="M62 18l14 26M70 16l12 26" stroke="var(--dr-ink)" stroke-width="3" stroke-linecap="round"/>
      <path d="M26 58q24 10 48 0" fill="none" stroke="var(--dr-hi)" stroke-width="3" opacity=".5"/>`,
    pizza: `<path d="M50 88L16 22Q50 6 84 22Z" fill="var(--dr-pizza)" ${o(2.4)}/><path d="M16 22Q50 6 84 22l-4 8Q50 16 20 30z" fill="var(--dr-p1)" ${o(1.6)}/>
      <circle cx="44" cy="40" r="6" fill="var(--dr-pizza-2)"/><circle cx="58" cy="54" r="5" fill="var(--dr-pizza-2)"/><circle cx="48" cy="66" r="4" fill="var(--dr-pizza-2)"/>`,
    onigiri: `<path d="M50 14C66 14 88 56 86 72C84 86 16 86 14 72C12 56 34 14 50 14Z" fill="var(--dr-rice)" ${o(2.4)}/><rect x="34" y="60" width="32" height="24" rx="3" fill="var(--dr-nori)"/>${face(50, 46, 9, 'joy', 0.8)}`,
    cake: `<path d="M18 52h64v26c0 4-4 6-8 6H26c-4 0-8-2-8-6z" fill="var(--dr-cake)" ${o(2.4)}/><path d="M18 52q8 10 16 0 8 10 16 0 8 10 16 0 8 10 16 0" fill="var(--dr-cake-2)" ${o(1.6)}/>
      <circle cx="50" cy="38" r="9" fill="var(--dr-stop)" ${o(2)}/><path d="M50 30q4-8 10-8" fill="none" stroke="var(--dr-frog-2)" stroke-width="3" stroke-linecap="round"/>`,
  };
  const BOXC = ['var(--dr-p1)', 'var(--dr-p2)', 'var(--dr-p3)', 'var(--dr-p4)'];
  const boxSVG = (c) => `<path d="M14 34l36-16 36 16v36L50 86 14 70z" fill="${c}" ${o(2.4)}/><path d="M14 34l36 16 36-16M50 50v36" fill="none" ${o(2)}/>
    <path d="M30 26l36 16v10" fill="none" stroke="var(--dr-tape)" stroke-width="7"/>`;
  const HOUSE = `<path d="M18 50L50 20L82 50" fill="var(--dr-r1)" ${o(2.4)}/><rect x="26" y="46" width="48" height="38" rx="4" fill="var(--dr-pin-2)" ${o(2.4)}/>
    <rect x="44" y="60" width="13" height="24" rx="3" fill="var(--dr-r6)" ${o(1.6)}/><path d="M18 50L50 20L82 50" fill="none" ${o(2.6)}/>`;
  const BAG = `<path d="M26 34h48l6 50H20z" fill="var(--dr-p1)" ${o(2.4)}/><path d="M38 34v-6a12 12 0 0 1 24 0v6" fill="none" ${o(2.4)}/>
    <circle cx="50" cy="58" r="9" fill="var(--dr-awning)" ${o(1.6)}/><path d="M36 22q4-8 0-14M50 20q4-8 0-14M64 22q4-8 0-14" fill="none" stroke="var(--dr-steam)" stroke-width="3.4" stroke-linecap="round"/>`;
  const CLOCK = `<circle cx="50" cy="54" r="34" fill="var(--dr-pin-2)" ${o(2.6)}/><path d="M50 32v22l14 9" fill="none" stroke="var(--dr-ink)" stroke-width="5" stroke-linecap="round"/>
    <rect x="42" y="10" width="16" height="9" rx="3" fill="var(--dr-stop)" ${o(1.6)}/>`;
  const STEAM = `<path d="M18 58h64c0 16-14 28-32 28S18 74 18 58z" fill="var(--dr-ramen-2)" ${o(2.4)}/>
    <path d="M34 48q-6-10 0-18t0-18M50 48q-6-10 0-18t0-18M66 48q-6-10 0-18t0-18" fill="none" stroke="var(--dr-stop)" stroke-width="5" stroke-linecap="round"/>`;
  const ICON = {
    taxi: `<g transform="translate(50 50) rotate(-90) scale(.8) translate(-60 -35)">${VEHS.taxi.svg()}</g>`,
    food: DISH.ramen, parcel: boxSVG('var(--dr-p1)'), clock: CLOCK, steam: STEAM, house: HOUSE, bag: BAG,
  };
  const svgIc = (inner) => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  const wrapSVG = (inner, w, h, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${pw}" height="${ph}">${inner}</svg>`;
  const svgAt = (inner, x, y, s, vb = '0 0 100 100', cls = '') => `<svg${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" width="${s}" height="${s}" viewBox="${vb}">${inner}</svg>`;

  /* ---------- illustrazione della card e del tutorial (SVG in pagina) ---------- */
  function cityArt(extra) {
    return `<svg viewBox="0 0 120 90" aria-hidden="true">
      <rect x="4" y="4" width="112" height="82" rx="14" fill="var(--dr-grass)"/>
      <rect x="4" y="38" width="112" height="18" fill="var(--dr-road)"/><rect x="48" y="4" width="18" height="82" fill="var(--dr-road)"/>
      <rect x="48" y="38" width="18" height="18" fill="var(--dr-road-2)"/>
      <path d="M8 47h34M72 47h40M57 8v26M57 60v22" stroke="var(--dr-mark)" stroke-width="1.6" stroke-dasharray="4 3"/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${40}" y="${39.5 + i * 3.4}" width="6" height="1.8" fill="var(--dr-zebra)"/><rect x="${68}" y="${39.5 + i * 3.4}" width="6" height="1.8" fill="var(--dr-zebra)"/>`).join('')}
      <rect x="6" y="6" width="40" height="30" rx="6" fill="var(--dr-walk)"/><rect x="10" y="10" width="15" height="22" rx="3" fill="var(--dr-r1)" stroke="var(--dr-roof-edge)"/><rect x="27" y="10" width="15" height="22" rx="3" fill="var(--dr-r5)" stroke="var(--dr-roof-edge)"/>
      <rect x="68" y="6" width="46" height="30" rx="6" fill="var(--dr-walk)"/><rect x="72" y="10" width="38" height="22" rx="3" fill="var(--dr-r4)" stroke="var(--dr-roof-edge)"/><rect x="92" y="14" width="8" height="6" rx="1.5" fill="var(--dr-ac)"/>
      <rect x="6" y="58" width="40" height="26" rx="6" fill="var(--dr-walk)"/><rect x="10" y="62" width="32" height="18" rx="3" fill="var(--dr-grass-2)"/>
      <circle cx="18" cy="70" r="6" fill="var(--dr-tree)" stroke="var(--dr-tree-2)"/><circle cx="32" cy="72" r="5" fill="var(--dr-tree)" stroke="var(--dr-tree-2)"/>
      <rect x="68" y="58" width="46" height="26" rx="6" fill="var(--dr-walk)"/><rect x="72" y="62" width="18" height="18" rx="3" fill="var(--dr-r3)" stroke="var(--dr-roof-edge)"/><rect x="92" y="62" width="18" height="18" rx="3" fill="var(--dr-r2)" stroke="var(--dr-roof-edge)"/>
      ${extra}</svg>`;
  }
  const pin = (x, y, s, inner) => `<g transform="translate(${x} ${y})"><path d="M0 0C-${s * 0.5} -${s * 0.5} -${s * 0.55} -${s * 0.8} -${s * 0.55} -${s}a${s * 0.55} ${s * 0.55} 0 0 1 ${s * 1.1} 0C${s * 0.55} -${s * 0.8} ${s * 0.5} -${s * 0.5} 0 0Z" fill="var(--dr-pin)" stroke="var(--dr-ink)" stroke-width=".8"/>
    <circle cy="-${s}" r="${s * 0.4}" fill="var(--dr-pin-2)"/>${svgAt(inner, -s * 0.36, -s * 1.36, s * 0.72)}</g>`;
  const carAt = (kind, x, y, len, rot, cls = '') => { const V = VEHS[kind]; const w = len, h = (len * V.h) / V.w; return `<g${cls ? ` class="${cls}"` : ''} transform="translate(${x} ${y}) rotate(${rot})"><svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 ${V.w} ${V.h}">${V.svg('var(--dr-bus)')}</svg></g>`; };
  const art = () => cityArt(`${carAt('taxi', 30, 51.5, 22, 0)}${svgAt(HARI('taxi', 'joy'), 26, 42, 11)}
    ${svgAt(pedSVG('bunny', 1, 0, ''), 84, 28, 13)}<g><rect x="92" y="14" width="18" height="12" rx="5" fill="var(--dr-pin-2)" stroke="var(--dr-ink)" stroke-width=".8"/>${svgAt(HOUSE, 96, 14, 11)}</g>
    ${pin(100, 60, 11, DISH.ramen)}${carAt('car', 58, 70, 15, 90)}`);


  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MAPIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.2l5-2 7 2 5-2v13.6l-5 2-7-2-5 2z" fill="var(--dr-sea)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 4.2v13.6M15.5 6.2v13.6" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10.5" r="2.2" fill="var(--dr-pin)"/></svg>';
  const PINIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.2 7-12.2A7 7 0 0 0 5 9.8C5 14.8 12 22 12 22z" fill="var(--dr-pin)"/><circle cx="12" cy="9.8" r="2.6" fill="var(--dr-pin-2)"/></svg>';
  VEHS.car = { w: 120, h: 70, svg: (c) => carSVG(c || 'var(--dr-c1)', 'var(--dr-roof-shade)') };
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13c0 .8.9 1.3 1.6.8l10-6.5c.6-.4.6-1.2 0-1.6l-10-6.5C8.9 4.2 8 4.7 8 5.5z" fill="currentColor"/></svg>';

  /* tutorial della prima partita */
  const TUT = [
    { key: 'tu_drive_1', en: 'Touch and drag anywhere: Hari drives where you point. Drag further to go faster, let go to brake. Arrows or WASD work too.',
      art: cityArt(`<g class="dr-tut-drive">${carAt('taxi', 30, 51.5, 22, 0)}${svgAt(HARI('taxi', 'joy'), 26, 42, 11)}</g>
        <circle cx="78" cy="21" r="11" fill="var(--dr-joy)" stroke="var(--dr-ink)" stroke-width="1" stroke-dasharray="2 2"/><circle cx="85" cy="21" r="5" fill="var(--dr-joy-2)" stroke="var(--dr-ink)" stroke-width=".8"/>
        ${HH.tutHand ? HH.tutHand(85, 23, 'tut-go', '--dx:12px;--dy:0px') : ''}`) },
    { key: 'tu_drive_2', en: 'Follow the arrow and stop on the pink circle to pick up, then deliver before the time bar runs out!',
      art: cityArt(`<g class="dr-tut-ring"><circle cx="86" cy="47" r="8" fill="var(--dr-zone-2)" stroke="var(--dr-zone)" stroke-width="1.4" stroke-dasharray="3 2"/></g>
        <g class="dr-tut-pin">${pin(86, 34, 10, HOUSE)}</g>${carAt('scooter', 62, 47, 14, 0)}${svgAt(HARI('scooter', 'joy'), 58, 39, 10)}
        <path d="M80 47l-5-3v6z" fill="var(--dr-arrow)" stroke="var(--dr-ink)" stroke-width=".8"/>
        <rect x="10" y="74" width="40" height="7" rx="3.5" fill="var(--dr-pin-2)" stroke="var(--dr-ink)" stroke-width=".8"/><rect class="dr-tut-bar" x="11" y="75" width="38" height="5" rx="2.5" fill="var(--dr-go)"/>`) },
    { key: 'tu_drive_3', en: 'Watch out for cars and animals crossing: every bump costs a heart. Walls are soft, no worries!',
      art: cityArt(`${carAt('car', 84, 51, 20, 180)}${carAt('van', 50, 51, 22, 0)}${svgAt(HARI('van', 'oops'), 49, 41, 11)}
        <g class="dr-tut-hop">${svgAt(pedSVG('chick', 2, 0, 'oops'), 64, 30, 13)}</g>
        <g class="dr-tut-bonk"><circle cx="70" cy="50" r="6" fill="var(--dr-bonk)" stroke="var(--dr-ink)" stroke-width=".8"/><path d="M68 49l2-3 1 3 3 1-3 1-1 3-1-3-3-1z" fill="var(--dr-star)"/></g>`) },
  ];

  HH.driveArt = { L, HARI, pedSVG, VEHS, CARCOL, DISH, BOXC, boxSVG, HOUSE, BAG, CLOCK, STEAM, ICON, svgIc, wrapSVG,
    cityArt, art, esc, MAPIC, PINIC, PAUSE, PLAY, TUT
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
