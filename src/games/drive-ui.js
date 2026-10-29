/* Hari Taxi — interfaccia.
 * Città vista dall'alto su un solo <canvas>: la parte fissa (strade, strisce, marciapiedi, tetti, parchi, alberi,
 * lampioni) è dipinta a blocchi di 8×8 caselle in canvas fuori schermo (in cache, solo quelli vicini alla camera);
 * a ogni fotogramma si aggiungono semafori, pedoni, traffico, Hari, segnalini delle fermate, effetti e la minimappa.
 * La camera segue il veicolo (con un po' di anticipo nella direzione di marcia) e non ruota: sopra è sempre nord.
 * Veicoli, animaletti e icone sono SVG in stile cel "cotti" in bitmap; i colori arrivano dai token CSS --dr-*
 * letti con getComputedStyle (tema chiaro/scuro: di notte lampioni e fari), mai scritti qui.
 * Nessuna violenza: chi viene urtato fa "bonk" o un salto spaventato con "!" e stelline, mai danni.
 *
 * Controlli: tocca e trascina ovunque sulla città = levetta (Hari va dove punti, più lontano = più veloce; lascia
 * per frenare). Tastiera: frecce/WASD (su = gas, giù = freno/retromarcia, destra/sinistra = sterzo).
 * Spazio/P/Esc o il tasto pausa = pausa; "Annulla" = pausa/riprendi. Tocca la minimappa per nasconderla.
 * Si parte al primo tocco/freccia; pausa automatica se la pagina viene nascosta; ripresa da salvataggio in pausa.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

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

  /* ---------- bitmap ---------- */
  // preferenza "meno movimento": letta al massimo una volta al secondo (si chiede molte volte a fotogramma)
  let rmAt = -1e9, rmVal = false;
  const reduce = () => {
    const n = Date.now();
    if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    return rmVal;
  };
  const KEYS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
  const TOKENS = ['ink', 'hi', 'grass', 'grass-2', 'path', 'pond', 'pond-2', 'road', 'road-2', 'mark', 'zebra', 'walk', 'walk-2', 'curb',
    'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'roof-shade', 'roof-edge', 'roof-hi', 'ac', 'ac-2', 'solar', 'solar-2', 'shadow',
    'tree', 'tree-2', 'tree-hi', 'trunk', 'flower', 'flower-2', 'bench', 'lamp', 'glow', 'beam', 'awning', 'awning-2', 'go', 'amber', 'stop', 'pole',
    'zone', 'zone-2', 'pin', 'pin-2', 'arrow', 'puff', 'star', 'heart', 'text', 'text-line', 'bonk', 'joy', 'joy-2', 'cold', 'steam',
    'mm', 'mm-line', 'mm-road', 'mm-bld', 'mm-park', 'dusk', 'night', 'taxi', 'scoot', 'van',
    // mappe reali
    'sea', 'sea-2', 'foam', 'sand', 'sand-2', 'field', 'field-2', 'parking', 'rail', 'rail-2', 'wood', 'wood-2', 'boat', 'boat-2', 'sail',
    'umb-1', 'umb-2', 'umb-3', 'castle', 'castle-2', 'mm-water', 'mm-sand', 'street', 'street-ink',
    'pizza', 'pizza-2', 'p1', 'cake-2', 'ramen', 'tape', 'check', 'bus', 'glass', 'head'];
  const OSM_ATTR = '© OpenStreetMap contributors';   // attribuzione obbligatoria (ODbL): mai tradotta
  /* mappe: "hari" = città procedurale (predefinita, progressi su 'drive'); le altre = HH.driveMapList (drive-maps.js) */
  const mapList = () => [{ id: 'hari' }].concat(HH.driveMapList || []);
  const mapMeta = (id) => mapList().find((m) => m.id === id) || null;
  const mapName = (id) => (id === 'hari' ? L('dr_map_hari') : (mapMeta(id) || {}).name || id);
  const storeGet = (k, d) => { try { return HH.store && HH.store.get ? HH.store.get(k, d) : d; } catch (e) { return d; } };
  const storeSet = (k, v) => { try { if (HH.store && HH.store.set) HH.store.set(k, v); } catch (e) { /* niente salvataggio */ } };
  const curMap = () => { const id = storeGet('drive:map', 'hari'); return mapMeta(id) ? id : 'hari'; };
  const slotOf = (id) => (id === 'hari' ? 'drive' : 'drive@' + id);
  // file dati della mappa (lazy load, una volta sola; nel file unico è già dentro)
  function loadMap(id) {
    if (id === 'hari' || (HH.driveMaps && HH.driveMaps[id])) return Promise.resolve();
    const m = mapMeta(id);
    if (!m || !HH.loadFile) return Promise.reject(new Error('map ' + id));
    return HH.loadFile(m.file).then(() => { if (!HH.driveMaps || !HH.driveMaps[id]) throw new Error('map ' + id); });
  }
  const CH = 8;              // caselle per blocco di città in cache

  function create(el, ctx, saved) {
    const P = HH.drive;
    let s, g0, raf = 0, last = 0, paused = false, party = 0, over = 0, timers = [], goTimer = 0;
    let wrap, stage, cv, g, msg, pauseEl, bar, pauseBtn, misEl, timeEl, loadEl;
    let W = 300, H = 400, dpr = 1, TS = 40, rs = 1, camX = 0, camY = 0;
    let C = {}, IMG = {}, themeKey = '', themeAt = 0, bakedAt = '', chunks = new Map(), mini = null, showMap = true;
    let joy = null, keys = {}, lastChanged = 0, parts = [], ghosts = [], routeAt = 0, routePt = null, shake = 0;
    let peekPt = null, lastBar = '', mmRect = null, sndHonk = 0, streetAt = 0, streetKey = '', budget = 0, mapsEl = null, mbtn, streetEl;
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    try { showMap = !(HH.store && HH.store.get && HH.store.get('drive:nomap')); } catch (e) { showMap = true; }

    /* ---------- costruzione ---------- */
    function build() {
      clearTimers();
      el.innerHTML = `<div class="dr-wrap" dir="ltr">
        <div class="dr-bar">
          <span class="dr-mis" role="img" aria-label="${L('dr_m_' + s.type)}"><span class="dr-ic">${svgIc(ICON[s.type])}</span><b></b></span>
          <span class="dr-time idle" role="img" aria-label="${L('dr_time')}"><span class="dr-ic"></span><span class="dr-track"><i class="dr-fill"></i></span><span class="dr-load"></span></span>
          <button class="dr-mbtn" type="button" aria-label="${L('dr_map')}: ${esc(mapName(s.mapId || 'hari'))}">${MAPIC}</button>
          <button class="dr-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button>
        </div>
        <div class="dr-stage" tabindex="0" role="application" aria-label="${L('dr_board')}">
          <canvas class="dr-cv"></canvas>
          <div class="dr-msg" aria-live="polite"></div>
          <div class="dr-pause" hidden><span class="dr-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div>
          ${P.isOsm(s) ? `<div class="dr-street" hidden>${PINIC}<span></span></div><div class="dr-osm">${OSM_ATTR}</div>` : ''}
        </div>
      </div>`;
      wrap = el.querySelector('.dr-wrap');
      stage = el.querySelector('.dr-stage');
      cv = el.querySelector('.dr-cv');
      g = cv.getContext('2d');
      msg = el.querySelector('.dr-msg');
      pauseEl = el.querySelector('.dr-pause');
      bar = el.querySelector('.dr-bar');
      pauseBtn = el.querySelector('.dr-pbtn');
      misEl = el.querySelector('.dr-mis');
      timeEl = el.querySelector('.dr-time');
      loadEl = el.querySelector('.dr-load');
      mbtn = el.querySelector('.dr-mbtn');
      streetEl = el.querySelector('.dr-street');
      streetKey = ''; mapsEl = null;
      parts = []; ghosts = []; party = 0; over = 0; lastBar = ''; routePt = null;
      g0 = P.geo(s);
      theme(true);
      measure();
      camX = s.car.x; camY = s.car.y; clampCam();
      if (G.ResizeObserver) {
        if (el._drRO) el._drRO.disconnect();
        el._drRO = new G.ResizeObserver(() => { if (Math.round(stage.clientWidth) !== Math.round(W) || Math.round(stage.clientHeight) !== Math.round(H)) { measure(); draw(performance.now()); } });
        el._drRO.observe(stage);
      }
      renderBar(true);
      draw(performance.now());
    }

    // token del tema → colori del canvas; SVG "cotti" in bitmap alla risoluzione giusta
    function theme(force) {
      const cs = G.getComputedStyle(wrap);
      const key = TOKENS.map((t) => cs.getPropertyValue('--dr-' + t).trim()).join('|');
      if (!force && key === themeKey) return;
      themeKey = key;
      C = {};
      TOKENS.forEach((t) => { C[t] = cs.getPropertyValue('--dr-' + t).trim(); });
      C.night = +C.night || 0;
      chunks.clear(); mini = null; bakedAt = '';
      if (stage) bakeAll();
    }
    // token senza partita (selettore delle mappe prima di cominciare)
    function theme0() { wrap = el.querySelector('.dr-wrap'); theme(true); }
    function bakeAll() {
      const ppt = Math.round(TS * Math.min(2, dpr));
      const want = `${ppt}|${themeKey}`;
      if (want === bakedAt) return;
      bakedAt = want;
      const cs = G.getComputedStyle(wrap);
      const res = (svg) => svg.replace(/var\((--[\w-]+)\)/g, (m0, n) => cs.getPropertyValue(n).trim() || 'transparent');
      const veh = (name, kind, col) => { const V = VEHS[kind]; bake(name, res(wrapSVG(V.svg(col), V.w, V.h, Math.ceil((V.w / 100) * ppt), Math.ceil((V.h / 100) * ppt)))); };
      veh('me', s.veh);
      CARCOL.forEach((c, i) => veh(`car${i}`, 'car', c));
      veh('bus0', 'bus', 'var(--dr-bus)'); veh('bus1', 'bus', 'var(--dr-bus-3)');
      veh('bike', 'bike');
      const sq = (name, inner, k = 0.7) => bake(name, res(wrapSVG(inner, 100, 100, Math.ceil(ppt * k), Math.ceil(ppt * k))));
      sq('hari', HARI(s.veh, ''), 0.8); sq('hariO', HARI(s.veh, 'oops'), 0.8); sq('hariJ', HARI(s.veh, 'joy'), 0.8);
      P.PEDS.forEach((k, i) => { sq(`p${i}a`, pedSVG(k, i, 0, '')); sq(`p${i}b`, pedSVG(k, i, 1, '')); sq(`p${i}o`, pedSVG(k, i, 1, 'oops')); sq(`p${i}j`, pedSVG(k, i, 0, 'joy')); });
      P.DISHES.forEach((k) => sq(`d_${k}`, DISH[k], 0.6));
      BOXC.forEach((c, i) => sq(`box${i}`, boxSVG(c), 0.5));
      sq('house', HOUSE, 0.6); sq('bag', BAG, 0.6); sq('clock', CLOCK, 0.5);
    }
    function bake(name, svg) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = im.width || 64; c.height = im.height || 64;
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        IMG[name] = c;
      };
      im.onerror = () => { if (G.console) G.console.warn('drive: sprite non valido', name); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function measure() {
      W = stage.clientWidth || 300; H = stage.clientHeight || 400;
      dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      // mappe reali: un filo più di città sullo schermo (le vie vere sono più lunghe e curve)
      const nt = P.isOsm(s) ? Math.max(30, Math.min(50, Math.round(Math.min(W, H * 0.95) / 11))) : Math.max(34, Math.min(58, Math.round(Math.min(W, H * 0.95) / 8.2)));
      if (nt !== TS) { TS = nt; chunks.clear(); }
      rs = Math.min(dpr, 1.5);
      bakeAll();
      clampCam();
    }
    function clampCam() {
      const hw = W / 2 / TS, hh = H / 2 / TS;
      camX = s.W > hw * 2 ? Math.max(hw, Math.min(s.W - hw, camX)) : s.W / 2;
      camY = s.H > hh * 2 ? Math.max(hh, Math.min(s.H - hh, camY)) : s.H / 2;
    }

    /* ---------- città fissa: blocchi di 8×8 caselle ---------- */
    const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    function chunk(cx, cy) {
      const k = cx + ',' + cy;
      let c = chunks.get(k);
      if (c) return c;
      // mappe reali: al massimo pochi blocchi nuovi per fotogramma (niente scatti quando si entra in una zona nuova)
      if (g0.osm && budget <= 0) return null;
      budget--;
      if (chunks.size > (g0.osm ? 28 : 16)) chunks.delete(chunks.keys().next().value);
      c = document.createElement('canvas');
      c.width = c.height = Math.ceil(CH * TS * rs);
      const b = c.getContext('2d');
      b.setTransform(TS * rs, 0, 0, TS * rs, -cx * CH * TS * rs, -cy * CH * TS * rs);
      if (g0.osm) paintOsm(b, cx * CH, cy * CH, CH, CH); else paintArea(b, cx * CH, cy * CH, CH, CH);
      chunks.set(k, c);
      return c;
    }
    function rrect(b, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      b.beginPath();
      b.moveTo(x + r, y); b.arcTo(x + w, y, x + w, y + h, r); b.arcTo(x + w, y + h, x, y + h, r); b.arcTo(x, y + h, x, y, r); b.arcTo(x, y, x + w, y, r);
      b.closePath();
    }
    function tree(b, x, y, r, seed) {
      b.fillStyle = C.shadow; b.beginPath(); b.ellipse(x + r * 0.25, y + r * 0.35, r * 1.02, r * 0.9, 0, 0, 7); b.fill();
      b.fillStyle = C['tree-2']; b.beginPath(); b.arc(x, y, r, 0, 7); b.fill();
      b.fillStyle = C.tree;
      for (let i = 0; i < 4; i++) { const a = seed * 6 + i * 1.7; b.beginPath(); b.arc(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35 - r * 0.06, r * 0.62, 0, 7); b.fill(); }
      b.fillStyle = C['tree-hi']; b.beginPath(); b.arc(x - r * 0.3, y - r * 0.34, r * 0.26, 0, 7); b.fill();
    }
    function paintArea(b, x0, y0, w, h) {
      const s0 = s, gg = g0, Wm = s0.W, Hm = s0.H;
      b.fillStyle = C.grass; b.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
      const X0 = Math.max(0, x0 - 2), Y0 = Math.max(0, y0 - 2), X1 = Math.min(Wm, x0 + w + 2), Y1 = Math.min(Hm, y0 + h + 2);
      // strade
      b.fillStyle = C.road;
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (s0.map[y * Wm + x] === '.') b.fillRect(x - 0.01, y - 0.01, 1.02, 1.02);
      // incroci, strisce, linee d'arresto, mezzeria
      for (const N of gg.nodes) {
        if (N.x < x0 - 12 || N.x > x0 + w + 12 || N.y < y0 - 12 || N.y > y0 + h + 12) continue;
        b.fillStyle = C['road-2']; b.fillRect(N.x - 1, N.y - 1, 2, 2);
        for (const d of [0, 1]) {
          const m = N.nb[d];
          if (m < 0) continue;
          const M = gg.nodes[m];
          if (d === 0) {
            const a = N.x + 1, z = M.x - 1, y = N.y;
            b.fillStyle = C.mark;
            for (let x = a + 1.1; x < z - 1.1; x += 0.8) b.fillRect(x, y - 0.04, Math.min(0.42, z - 1.1 - x), 0.08);
            for (const [lit, xs, sgn] of [[N.lit, a, 1], [M.lit, z, -1]]) {
              if (!lit) continue;
              b.fillStyle = C.zebra;
              for (let k = 0; k < 7; k++) b.fillRect(xs + sgn * 0.1 + (sgn < 0 ? -0.6 : 0), y - 0.92 + k * 0.27, 0.6, 0.15);
              b.fillStyle = C.mark;
              if (sgn > 0) b.fillRect(xs + 0.78, y - 0.95, 0.07, 0.9); else b.fillRect(xs - 0.85, y + 0.05, 0.07, 0.9);
            }
          } else {
            const a = N.y + 1, z = M.y - 1, x = N.x;
            b.fillStyle = C.mark;
            for (let y = a + 1.1; y < z - 1.1; y += 0.8) b.fillRect(x - 0.04, y, 0.08, Math.min(0.42, z - 1.1 - y));
            for (const [lit, ys, sgn] of [[N.lit, a, 1], [M.lit, z, -1]]) {
              if (!lit) continue;
              b.fillStyle = C.zebra;
              for (let k = 0; k < 7; k++) b.fillRect(x - 0.92 + k * 0.27, ys + sgn * 0.1 + (sgn < 0 ? -0.6 : 0), 0.15, 0.6);
              b.fillStyle = C.mark;
              if (sgn > 0) b.fillRect(x + 0.05, ys + 0.78, 0.9, 0.07); else b.fillRect(x - 0.95, ys - 0.85, 0.9, 0.07);
            }
          }
        }
      }
      // bordo della città: siepe e alberi
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
        if (s0.map[y * Wm + x] !== '~') continue;
        b.fillStyle = C['grass-2']; b.fillRect(x, y, 1, 1);
        if (hash(x, y) < 0.7) tree(b, x + 0.5 + (hash(y, x) - 0.5) * 0.3, y + 0.5 + (hash(x + 7, y) - 0.5) * 0.3, 0.4 + hash(x, y, 3) * 0.12, hash(x, y, 9));
      }
      // isolati
      for (const bl of gg.blocks) {
        if (bl.x1 < x0 - 1 || bl.x0 > x0 + w + 1 || bl.y1 < y0 - 1 || bl.y0 > y0 + h + 1) continue;
        block(b, bl);
      }
      // ristoranti e deposito
      for (const id of s0.rest) shopSign(b, gg.spots[id], 'food');
      if (s0.depot >= 0) shopSign(b, gg.spots[s0.depot], 'depot');
    }
    function block(b, bl) {
      const { x0, y0, x1, y1 } = bl, w = x1 - x0, h = y1 - y0, S = 0.45;
      // marciapiede con cordolo
      b.fillStyle = C.curb; rrect(b, x0, y0, w, h, 0.32); b.fill();
      b.fillStyle = C.walk; rrect(b, x0 + 0.06, y0 + 0.06, w - 0.12, h - 0.12, 0.28); b.fill();
      b.strokeStyle = C['walk-2']; b.lineWidth = 0.03;
      for (let x = x0 + 1; x < x1; x++) { b.beginPath(); b.moveTo(x, y0 + 0.06); b.lineTo(x, y0 + S); b.moveTo(x, y1 - S); b.lineTo(x, y1 - 0.06); b.stroke(); }
      for (let y = y0 + 1; y < y1; y++) { b.beginPath(); b.moveTo(x0 + 0.06, y); b.lineTo(x0 + S, y); b.moveTo(x1 - S, y); b.lineTo(x1 - 0.06, y); b.stroke(); }
      const ix = x0 + S, iy = y0 + S, iw = w - 2 * S, ih = h - 2 * S;
      const r = HH.rng(((x0 * 73856093) ^ (y0 * 19349663) ^ (x1 * 83492791) ^ s.level) >>> 0);
      if (bl.k === 'park') park(b, ix, iy, iw, ih, r);
      else roofs(b, ix, iy, iw, ih, r);
      // lampioni sul marciapiede
      const lamp = (x, y) => {
        b.fillStyle = C.pole; b.beginPath(); b.arc(x, y, 0.06, 0, 7); b.fill();
        b.fillStyle = C.lamp; b.beginPath(); b.arc(x, y, 0.1, 0, 7); b.fill();
        if (C.night) {
          const gr = b.createRadialGradient(x, y, 0, x, y, 1.5);
          gr.addColorStop(0, C.glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
          b.fillStyle = gr; b.globalCompositeOperation = 'lighter'; b.fillRect(x - 1.5, y - 1.5, 3, 3); b.globalCompositeOperation = 'source-over';
        }
      };
      for (let x = x0 + 1.5; x < x1 - 1; x += 3) { lamp(x, y0 + 0.2); lamp(x, y1 - 0.2); }
      for (let y = y0 + 1.5; y < y1 - 1; y += 3) { lamp(x0 + 0.2, y); lamp(x1 - 0.2, y); }
    }
    function roofs(b, ix, iy, iw, ih, r) {
      // lotti lungo il lato lungo, due file se l'isolato è spesso
      const horiz = iw >= ih, long = horiz ? iw : ih, short = horiz ? ih : iw;
      const rows = short >= 2.8 ? 2 : 1;
      const lots = [];
      let p = 0;
      while (p < long - 0.2) { let len = 1.3 + r() * 1.1; if (long - p - len < 1.1) len = long - p; lots.push([p, len]); p += len; }
      const pal = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
      for (let q = 0; q < rows; q++) for (const [a, len] of lots) {
        const sw = short / rows, x = horiz ? ix + a : ix + q * sw, y = horiz ? iy + q * sw : iy + a, w = horiz ? len : sw, h = horiz ? sw : len;
        const rx = x + 0.05, ry = y + 0.05, rw = w - 0.1, rh = h - 0.1, col = C[pal[Math.floor(r() * pal.length)]], style = r();
        // ombra: gli edifici "alti" proiettano verso sud-est
        const tall = 0.1 + r() * 0.16;
        b.fillStyle = C.shadow; rrect(b, rx + tall, ry + tall * 1.2, rw, rh, 0.12); b.fill();
        b.fillStyle = col; rrect(b, rx, ry, rw, rh, 0.12); b.fill();
        b.strokeStyle = C['roof-edge']; b.lineWidth = 0.05; rrect(b, rx, ry, rw, rh, 0.12); b.stroke();
        if (style < 0.35) {
          // a due falde: metà in ombra e colmo
          b.fillStyle = C['roof-shade'];
          if (rw >= rh) b.fillRect(rx + 0.03, ry + rh / 2, rw - 0.06, rh / 2 - 0.03); else b.fillRect(rx + rw / 2, ry + 0.03, rw / 2 - 0.03, rh - 0.06);
          b.strokeStyle = C['roof-hi']; b.lineWidth = 0.06; b.beginPath();
          if (rw >= rh) { b.moveTo(rx + 0.1, ry + rh / 2); b.lineTo(rx + rw - 0.1, ry + rh / 2); } else { b.moveTo(rx + rw / 2, ry + 0.1); b.lineTo(rx + rw / 2, ry + rh - 0.1); }
          b.stroke();
        } else if (style < 0.6) {
          // tetto piano con condizionatore e sfiato
          b.strokeStyle = C['roof-hi']; b.lineWidth = 0.05; rrect(b, rx + 0.1, ry + 0.1, rw - 0.2, rh - 0.2, 0.08); b.stroke();
          const ax = rx + 0.2 + r() * Math.max(0, rw - 0.75), ay = ry + 0.2 + r() * Math.max(0, rh - 0.65);
          b.fillStyle = C.ac; rrect(b, ax, ay, 0.38, 0.3, 0.05); b.fill();
          b.fillStyle = C['ac-2']; b.beginPath(); b.arc(ax + 0.19, ay + 0.15, 0.09, 0, 7); b.fill();
        } else if (style < 0.78) {
          // pannelli solari
          const n = Math.max(1, Math.floor((rw - 0.2) / 0.36));
          for (let i = 0; i < n; i++) { b.fillStyle = C.solar; b.fillRect(rx + 0.12 + i * 0.36, ry + 0.14, 0.3, Math.max(0.2, rh - 0.28)); b.fillStyle = C['solar-2']; b.fillRect(rx + 0.12 + i * 0.36, ry + 0.14, 0.3, 0.05); }
        } else if (style < 0.9) {
          // serbatoio tondo
          const cx = rx + rw / 2, cy = ry + rh / 2, rr = Math.min(rw, rh) * 0.28;
          b.fillStyle = C.shadow; b.beginPath(); b.arc(cx + 0.06, cy + 0.08, rr, 0, 7); b.fill();
          b.fillStyle = C.ac; b.beginPath(); b.arc(cx, cy, rr, 0, 7); b.fill();
          b.strokeStyle = C['ac-2']; b.lineWidth = 0.05; b.beginPath(); b.arc(cx, cy, rr * 0.6, 0, 7); b.stroke();
        } else {
          // giardino pensile
          b.fillStyle = C['grass-2']; rrect(b, rx + 0.1, ry + 0.1, rw - 0.2, rh - 0.2, 0.1); b.fill();
          for (let i = 0; i < 3; i++) { b.fillStyle = i % 2 ? C.flower : C['flower-2']; b.beginPath(); b.arc(rx + 0.25 + r() * (rw - 0.5), ry + 0.25 + r() * (rh - 0.5), 0.07, 0, 7); b.fill(); }
        }
      }
    }
    function park(b, ix, iy, iw, ih, r) {
      b.fillStyle = C['grass-2']; rrect(b, ix, iy, iw, ih, 0.2); b.fill();
      // vialetti a croce
      b.strokeStyle = C.path; b.lineWidth = 0.32; b.lineCap = 'round';
      b.beginPath(); b.moveTo(ix + 0.2, iy + ih / 2); b.quadraticCurveTo(ix + iw / 2, iy + ih / 2 + (r() - 0.5) * ih * 0.5, ix + iw - 0.2, iy + ih / 2); b.stroke();
      if (iw > 2.4 && ih > 2.4) { b.beginPath(); b.moveTo(ix + iw / 2, iy + 0.2); b.quadraticCurveTo(ix + iw / 2 + (r() - 0.5) * iw * 0.4, iy + ih / 2, ix + iw / 2, iy + ih - 0.2); b.stroke(); }
      // laghetto nei parchi grandi
      if (iw * ih > 14) {
        const px = ix + iw * (0.25 + r() * 0.5), py = iy + ih * (0.25 + r() * 0.5), rx = Math.min(iw, ih) * 0.24;
        b.fillStyle = C['pond-2']; b.beginPath(); b.ellipse(px, py, rx * 1.3 + 0.06, rx + 0.06, 0, 0, 7); b.fill();
        b.fillStyle = C.pond; b.beginPath(); b.ellipse(px, py, rx * 1.3, rx, 0, 0, 7); b.fill();
        b.strokeStyle = C.hi; b.globalAlpha = 0.5; b.lineWidth = 0.05; b.beginPath(); b.ellipse(px - rx * 0.3, py - rx * 0.3, rx * 0.5, rx * 0.25, -0.3, 3.6, 5.2); b.stroke(); b.globalAlpha = 1;
      }
      // fiori e panchine
      for (let i = 0; i < Math.round(iw * ih * 0.6); i++) { b.fillStyle = r() < 0.5 ? C.flower : C['flower-2']; b.beginPath(); b.arc(ix + 0.15 + r() * (iw - 0.3), iy + 0.15 + r() * (ih - 0.3), 0.05, 0, 7); b.fill(); }
      b.fillStyle = C.bench; b.fillRect(ix + iw * 0.3, iy + ih / 2 - 0.36, 0.42, 0.12);
      // alberi su una griglia con un po' di caso
      for (let y = iy + 0.5; y < iy + ih - 0.3; y += 1.05) for (let x = ix + 0.5; x < ix + iw - 0.3; x += 1.05) {
        if (r() < 0.45) continue;
        if (Math.abs(y - (iy + ih / 2)) < 0.4 || (iw > 2.4 && ih > 2.4 && Math.abs(x - (ix + iw / 2)) < 0.4)) continue;
        tree(b, x + (r() - 0.5) * 0.3, y + (r() - 0.5) * 0.3, 0.32 + r() * 0.12, r());
      }
    }
    // insegna sul tetto vicino alla fermata: tendina a righe (ristorante) o portone (deposito)
    function shopSign(b, sp, kind) {
      if (!sp) return;
      const [hx, hy] = P.DIRS[sp.h], nx = -hy, ny = hx;     // nx,ny: verso l'interno dell'isolato
      const cx = sp.x + nx * 0.45, cy = sp.y + ny * 0.45, horiz = sp.h % 2 === 0, w = 1.3, d = 0.34;
      b.save(); b.translate(cx, cy); if (!horiz) b.rotate(Math.PI / 2); if ((horiz && ny < 0) || (!horiz && nx > 0)) b.rotate(Math.PI);
      if (kind === 'food') {
        for (let i = 0; i < 6; i++) { b.fillStyle = i % 2 ? C['awning-2'] : C.awning; b.fillRect(-w / 2 + (i * w) / 6, 0, w / 6 + 0.01, d); }
        b.strokeStyle = C.ink; b.lineWidth = 0.04; b.strokeRect(-w / 2, 0, w, d);
        b.fillStyle = C.awning; for (let i = 0; i < 6; i++) { b.beginPath(); b.arc(-w / 2 + (i + 0.5) * (w / 6), d, w / 12, 0, Math.PI); b.fill(); }
      } else {
        b.fillStyle = C.ac; b.fillRect(-w / 2, 0, w, d + 0.1);
        b.strokeStyle = C['ac-2']; b.lineWidth = 0.05;
        for (let i = 1; i < 4; i++) { b.beginPath(); b.moveTo(-w / 2, (i * (d + 0.1)) / 4); b.lineTo(w / 2, (i * (d + 0.1)) / 4); b.stroke(); }
        b.strokeStyle = C.ink; b.lineWidth = 0.04; b.strokeRect(-w / 2, 0, w, d + 0.1);
      }
      b.restore();
    }

    /* ---------- mappe reali (OpenStreetMap) dipinte in stile kawaii ----------
     * Stessa resa della città di Hari: zone a "bolle" morbide dal raster (parchi con alberi tondi, campi a righe,
     * spiaggia con ombrelloni, mare/lago con increspature, pontili di legno), edifici come tetti pastello con ombra,
     * marciapiedi con cordolo e asfalto dal grafo stradale (curve vere), strisce e semafori agli incroci, lampioni,
     * icone dei luoghi. Tutto a blocchi in cache come la città di Hari; a ogni fotogramma solo onde, barchette,
     * cartelli dei luoghi notevoli e il traffico. */
    let OS = null;
    const LANDMARK = new Set(['pier', 'castle', 'harbour', 'station', 'square', 'sight', 'beach', 'park', 'taxi']);
    const BADGE = new Set(['food', 'cafe', 'gelato', 'bakery', 'shop', 'depot', 'taxi', 'station', 'beach', 'pier', 'castle', 'harbour', 'sight']);
    function osmPrep() {
      if (OS && OS.id === s.mapId) return OS;
      const md = P.mapData(s.mapId), blds = P.buildings(md), BC = 8, Wm = md.W, Hm = md.H;
      const bw = Math.ceil(Wm / BC), bh = Math.ceil(Hm / BC);
      const grid = () => Array.from({ length: bw * bh }, () => []);
      const put = (gr, x0, y0, x1, y1, id) => {
        for (let cy = Math.max(0, Math.floor(y0 / BC)); cy <= Math.min(bh - 1, Math.floor(y1 / BC)); cy++) for (let cx = Math.max(0, Math.floor(x0 / BC)); cx <= Math.min(bw - 1, Math.floor(x1 / BC)); cx++) gr[cy * bw + cx].push(id);
      };
      const bgrid = grid(), pgrid = grid();
      for (const b of blds) {
        let a = 0, cx = 0, cy = 0;
        for (let i = 0, j = b.p.length - 1; i < b.p.length; j = i++) { const f = b.p[j][0] * b.p[i][1] - b.p[i][0] * b.p[j][1]; a += f; cx += (b.p[j][0] + b.p[i][0]) * f; cy += (b.p[j][1] + b.p[i][1]) * f; }
        b.area = Math.abs(a / 2); b.cx = a ? cx / (3 * a) : b.p[0][0]; b.cy = a ? cy / (3 * a) : b.p[0][1];
        put(bgrid, b.x0 - 0.5, b.y0 - 0.5, b.x1 + 0.8, b.y1 + 0.8, b.id);
      }
      for (const p of md.pois) if (BADGE.has(p.k)) put(pgrid, p.x - 1, p.y - 1, p.x + 1, p.y + 1, p.id);
      // barchette: al largo vicino alla riva e attorno ai porti (ormeggiate)
      const boats = [], A = P.AR, area = md.area;
      const water = (x, y) => x >= 0 && y >= 0 && x < Wm && y < Hm && area[y * Wm + x] === A.WATER;
      const openWater = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!water(x + dx, y + dy)) return false; return true; };
      for (let y = 2; y < Hm - 2; y += 3) for (let x = 2; x < Wm - 2; x += 3) {
        if (!water(x, y) || hash(x, y, 11) > 0.035 || !openWater(x, y, 2)) continue;
        let shore = false;
        for (let r = 3; r <= 30 && !shore; r += 3) if (!water(x + r, y) || !water(x - r, y) || !water(x, y + r) || !water(x, y - r)) shore = true;
        if (shore) boats.push({ x: x + 0.5, y: y + 0.5, a: hash(y, x, 3) * 6.28, k: hash(x, y, 4) < 0.5 ? 0 : 1, ph: hash(x, y, 9) * 6 });
      }
      for (const p of md.pois) if (p.k === 'harbour') {
        let n = 0;
        for (let r = 1; r <= 7 && n < 5; r++) for (let k = 0; k < 8 && n < 5; k++) {
          const x = Math.round(p.x + Math.cos(k * 0.785 + r) * r), y = Math.round(p.y + Math.sin(k * 0.785 + r) * r);
          if (water(x, y) && openWater(x, y, 0) && !boats.some((q) => Math.hypot(q.x - x, q.y - y) < 1.4)) { boats.push({ x: x + 0.5, y: y + 0.5, a: k * 0.785, k: 1 - (n % 2), ph: n, moor: true }); n++; }
        }
      }
      OS = { id: s.mapId, md, blds, BC, bw, bh, bgrid, pgrid, boats, labels: md.pois.filter((p) => LANDMARK.has(p.k) && p.name) };
      return OS;
    }
    function cellIds(gr, O, x0, y0, x1, y1, seen) {
      const out = [];
      for (let cy = Math.max(0, Math.floor(y0 / O.BC)); cy <= Math.min(O.bh - 1, Math.floor(y1 / O.BC)); cy++) for (let cx = Math.max(0, Math.floor(x0 / O.BC)); cx <= Math.min(O.bw - 1, Math.floor(x1 / O.BC)); cx++) {
        for (const id of gr[cy * O.bw + cx]) if (!seen.has(id)) { seen.add(id); out.push(id); }
      }
      return out;
    }
    function edgesIn(x0, y0, x1, y1) {
      const G = g0, seen = new Set(), out = [];
      for (let cy = Math.max(0, Math.floor(y0 / G.EC)); cy <= Math.min(G.eh - 1, Math.floor(y1 / G.EC)); cy++) for (let cx = Math.max(0, Math.floor(x0 / G.EC)); cx <= Math.min(G.ew - 1, Math.floor(x1 / G.EC)); cx++) {
        for (const id of G.egrid[cy * G.ew + cx]) if (!seen.has(id)) { seen.add(id); out.push(G.edges[id]); }
      }
      return out;
    }
    // poligono con gli angoli arrotondati (raggio al massimo r, mai oltre metà lato): tetti e pontili morbidi
    function roundPoly(b, pts, r) {
      const n = pts.length;
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const m0 = mid(pts[n - 1], pts[0]);
      b.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n], pr = pts[(i - 1 + n) % n];
        const rr = Math.min(r, Math.hypot(p[0] - pr[0], p[1] - pr[1]) / 2, Math.hypot(q[0] - p[0], q[1] - p[1]) / 2);
        b.arcTo(p[0], p[1], q[0], q[1], rr);
      }
      b.closePath();
    }
    const polyPath = (b, pts) => { b.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]); };
    // tratto di mezzeria tra t0 e t1 (per la linea tratteggiata)
    function subLine(e, t0, t1) { const out = []; const C0 = g0.center[e.id]; for (let t = t0; t < t1; t += 0.5) out.push(P.along(C0, t)); out.push(P.along(C0, t1)); return out; }
    function paintOsm(b, x0, y0, w, h) {
      const O = osmPrep(), G = g0, md = O.md, A = P.AR, Wm = md.W, Hm = md.H, area = md.area;
      const X0 = Math.max(0, x0 - 2), Y0 = Math.max(0, y0 - 2), X1 = Math.min(Wm, x0 + w + 2), Y1 = Math.min(Hm, y0 + h + 2);
      const at = (x, y) => (x < 0 || y < 0 || x >= Wm || y >= Hm ? -1 : area[y * Wm + x]);
      b.fillStyle = C.grass; b.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
      // zone dal raster, ma con il bordo morbido: campo levigato (finestra 4×4 con pesi 1-3-3-1) e "marching squares"
      // interpolati a metà, così coste, rive e spiagge sono curve e non scalini. Pontili e binari sono vettoriali.
      const WT = [1, 3, 3, 1];
      // (sotto i pontili c'è acqua: il pontile vettoriale ci va sopra)
      const mem = (c, x, y) => { const v = area[Math.min(Hm - 1, Math.max(0, y)) * Wm + Math.min(Wm - 1, Math.max(0, x))]; return v === c || (c === A.WATER && v === A.PIER) ? 1 : 0; };
      const fieldOf = (c) => {
        const fw = X1 - X0 + 1, fh = Y1 - Y0 + 1, f = new Float32Array(fw * fh);
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
          let v = 0;
          for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) v += WT[dx] * WT[dy] * mem(c, X0 + i + dx - 2, Y0 + j + dy - 2);
          f[j * fw + i] = v / 64;
        }
        return { f, fw };
      };
      const ORDER = [[A.FIELD, C.field], [A.PARK, C['grass-2']], [A.PARKING, C.parking], [A.PLAZA, C.walk], [A.SAND, C.sand], [A.WATER, C.sea]];
      const inside = {};
      for (const [c, col] of ORDER) {
        let any = false;
        for (let y = Y0 - 2; y < Y1 + 2 && !any; y++) for (let x = X0 - 2; x < X1 + 2; x++) if (mem(c, x, y)) { any = true; break; }
        if (!any) continue;
        const { f, fw } = fieldOf(c), V = (i, j) => f[(j - Y0) * fw + (i - X0)];
        // soglia: l'acqua (sopra a tutto) al bordo vero; le altre zone un filo più larghe, così sotto l'acqua o tra
        // spiaggia e mare non resta una striscia d'erba
        const TH = c === A.WATER ? 0.5 : 0.32;
        inside[c] = (x, y) => V(x, y) >= 0.5 && V(x + 1, y) >= 0.5 && V(x, y + 1) >= 0.5 && V(x + 1, y + 1) >= 0.5;
        const foam = [];
        b.fillStyle = col; b.beginPath();
        for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
          const cs = [[x, y, V(x, y)], [x + 1, y, V(x + 1, y)], [x + 1, y + 1, V(x + 1, y + 1)], [x, y + 1, V(x, y + 1)]];
          const ins = cs.map((q) => q[2] >= TH);
          if (!ins.some(Boolean)) continue;
          if (ins.every(Boolean)) { b.rect(x - 0.01, y - 0.01, 1.02, 1.02); continue; }
          const poly = [];
          for (let k = 0; k < 4; k++) {
            const A0 = cs[k], B0 = cs[(k + 1) % 4];
            if (ins[k]) poly.push([A0[0], A0[1], 0]);
            if (ins[k] !== ins[(k + 1) % 4]) { const t = (TH - A0[2]) / (B0[2] - A0[2]); poly.push([A0[0] + (B0[0] - A0[0]) * t, A0[1] + (B0[1] - A0[1]) * t, 1]); }
          }
          b.moveTo(poly[0][0], poly[0][1]);
          for (let k = 1; k < poly.length; k++) b.lineTo(poly[k][0], poly[k][1]);
          b.closePath();
          if (c === A.WATER) for (let k = 0; k < poly.length; k++) { const P0 = poly[k], P1 = poly[(k + 1) % poly.length]; if (P0[2] && P1[2]) foam.push(P0, P1); }
        }
        b.fill();
        // schiuma lungo la riva
        if (foam.length) {
          b.strokeStyle = C.foam; b.lineWidth = 0.14; b.lineCap = 'round'; b.beginPath();
          for (let k = 0; k < foam.length; k += 2) { b.moveTo(foam[k][0], foam[k][1]); b.lineTo(foam[k + 1][0], foam[k + 1][1]); }
          b.stroke();
        }
      }
      const deep = (c, x, y) => !!inside[c] && inside[c](x, y);
      // binari e pontili vettoriali (estremi tondi)
      const vec = P.vectors(md).filter((v) => v.pts.some(([px, py]) => px > x0 - 12 && px < x0 + w + 12 && py > y0 - 12 && py < y0 + h + 12));
      b.lineCap = 'round'; b.lineJoin = 'round';
      for (const v of vec) if (v.k === 'rail') {
        b.strokeStyle = C.rail; b.lineWidth = 0.9; b.beginPath(); polyPath(b, v.pts); b.stroke();
        b.strokeStyle = C['rail-2']; b.lineWidth = 0.5; b.setLineDash([0.1, 0.22]); b.beginPath(); polyPath(b, v.pts); b.stroke(); b.setLineDash([]);
        for (const off of [-0.2, 0.2]) { b.strokeStyle = C.pole; b.lineWidth = 0.05; b.beginPath(); polyPath(b, P.offsetLine(v.pts, off)); b.stroke(); }
      }
      for (const v of vec) if (v.k === 'pierArea') {
        b.fillStyle = C.shadow; b.beginPath(); b.save(); b.translate(0.08, 0.12); roundPoly(b, v.pts, 0.25); b.restore(); b.fill();
        b.fillStyle = C.wood; b.beginPath(); roundPoly(b, v.pts, 0.25); b.fill();
        b.save(); b.clip(); b.strokeStyle = C['wood-2']; b.lineWidth = 0.035; b.beginPath();
        let mx0 = 1e9, my0 = 1e9, mx1 = -1e9, my1 = -1e9; for (const [px, py] of v.pts) { mx0 = Math.min(mx0, px); my0 = Math.min(my0, py); mx1 = Math.max(mx1, px); my1 = Math.max(my1, py); }
        const horiz = mx1 - mx0 < my1 - my0;
        if (horiz) for (let q = my0; q < my1; q += 0.28) { b.moveTo(mx0, q); b.lineTo(mx1, q); } else for (let q = mx0; q < mx1; q += 0.28) { b.moveTo(q, my0); b.lineTo(q, my1); }
        b.stroke(); b.restore();
        b.strokeStyle = C['wood-2']; b.lineWidth = 0.06; b.beginPath(); roundPoly(b, v.pts, 0.25); b.stroke();
      }
      for (const v of vec) if (v.k === 'pier') {
        b.strokeStyle = C['wood-2']; b.lineWidth = 1.0; b.beginPath(); polyPath(b, v.pts); b.stroke();
        b.strokeStyle = C.wood; b.lineWidth = 0.86; b.beginPath(); polyPath(b, v.pts); b.stroke();
        b.strokeStyle = C['wood-2']; b.lineWidth = 0.6; b.setLineDash([0.04, 0.24]); b.lineCap = 'butt'; b.beginPath(); polyPath(b, v.pts); b.stroke(); b.setLineDash([]); b.lineCap = 'round';
      }
      // dettagli delle zone (solo ben dentro la zona disegnata)
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
        const c = area[y * Wm + x], hv = hash(x, y, 21);
        if (!deep(c, x, y)) continue;
        if (c === A.WATER) {
          if (hv < 0.08) { b.strokeStyle = C['sea-2']; b.lineWidth = 0.06; b.lineCap = 'round'; b.beginPath(); const cx = x + 0.2 + hash(y, x) * 0.6, cy = y + 0.3 + hash(x, y, 2) * 0.5; b.arc(cx, cy, 0.18, 3.6, 5.8); b.stroke(); }
        } else if (c === A.SAND) {
          if (hv < 0.35) { b.fillStyle = C['sand-2']; b.beginPath(); b.arc(x + hash(y, x, 3), y + hash(x, y, 4), 0.04, 0, 7); b.fill(); }
          if (hv > 0.9 && deep(A.SAND, x, y - 1) && deep(A.SAND, x, y + 1) && !G.road[y * Wm + x]) umbrella(b, x + 0.5, y + 0.5, hash(x, y, 7));
        } else if (c === A.FIELD) {
          b.strokeStyle = C['field-2']; b.lineWidth = 0.08; b.lineCap = 'round';
          b.beginPath(); for (let k = 0; k < 3; k++) { b.moveTo(x + 0.1, y + 0.2 + k * 0.3); b.lineTo(x + 0.9, y + 0.2 + k * 0.3); } b.stroke();
        } else if (c === A.PARKING) {
          b.strokeStyle = C.mark; b.globalAlpha = 0.6; b.lineWidth = 0.05; b.beginPath(); b.moveTo(x + 0.5, y + 0.15); b.lineTo(x + 0.5, y + 0.85); b.stroke(); b.globalAlpha = 1;
        }
      }
      // castelli: cortile e mura merlate (sotto gli edifici del castello, se mappati)
      for (const v of vec) if (v.k === 'castle') {
        b.fillStyle = C.shadow; b.beginPath(); b.save(); b.translate(0.15, 0.2); roundPoly(b, v.pts, 0.3); b.restore(); b.fill();
        b.fillStyle = C.castle; b.beginPath(); roundPoly(b, v.pts, 0.3); b.fill();
        b.strokeStyle = C['castle-2']; b.lineWidth = 0.5; b.setLineDash([0.32, 0.22]); b.lineCap = 'butt'; b.beginPath(); roundPoly(b, v.pts, 0.3); b.stroke(); b.setLineDash([]);
        b.strokeStyle = C.ink; b.lineWidth = 0.05; b.lineCap = 'round'; b.beginPath(); roundPoly(b, v.pts, 0.3); b.stroke();
        b.save(); b.beginPath(); roundPoly(b, v.pts.map(([px, py]) => [px, py]), 0.3); b.clip();
        b.fillStyle = C['grass-2']; b.beginPath(); let cx = 0, cy = 0; for (const [px, py] of v.pts) { cx += px; cy += py; } cx /= v.pts.length; cy /= v.pts.length; b.arc(cx, cy, 0.9, 0, 7); b.fill(); b.restore();
      }
      // edifici: tetti pastello con ombra
      const seen = new Set(), pal = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
      const bl = cellIds(O.bgrid, O, x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, seen).map((i) => O.blds[i]);
      b.lineJoin = 'round'; b.lineCap = 'round';
      for (const B of bl) {
        const tall = 0.07 + Math.min(6, B.lv) * 0.035;
        b.fillStyle = C.shadow; b.beginPath(); b.save(); b.translate(tall, tall * 1.2); roundPoly(b, B.p, 0.22); b.restore(); b.fill();
      }
      for (const B of bl) {
        const hv = hash(B.id, 7, 3);
        const col = B.kind === 1 ? C.r7 : B.kind === 2 ? C.ac : C[pal[Math.floor(hv * pal.length)]];
        b.fillStyle = col; b.beginPath(); roundPoly(b, B.p, 0.22); b.fill();
        // bordo interno chiaro (tetto "imbottito"): il contorno ripassato largo, solo dentro il poligono
        b.save(); b.clip(); b.strokeStyle = C['roof-hi']; b.lineWidth = Math.min(0.32, 0.12 + B.area * 0.01); b.stroke(); b.restore();
        b.strokeStyle = C['roof-edge']; b.lineWidth = 0.05; b.stroke();
        if (B.area > 2.5) {
          if (B.kind === 2) { b.strokeStyle = C['ac-2']; b.lineWidth = 0.05; b.beginPath(); for (let i = -2; i <= 2; i++) { b.moveTo(B.cx - 0.6, B.cy + i * 0.25); b.lineTo(B.cx + 0.6, B.cy + i * 0.25); } b.stroke(); }
          else if (hv * 7 % 1 < 0.35 && B.area > 4) { b.fillStyle = C.ac; rrect(b, B.cx - 0.2, B.cy - 0.15, 0.4, 0.3, 0.06); b.fill(); b.fillStyle = C['ac-2']; b.beginPath(); b.arc(B.cx, B.cy, 0.09, 0, 7); b.fill(); }
          else if (hv * 7 % 1 < 0.55 && B.area > 4) { for (let i = 0; i < 3; i++) { b.fillStyle = C.solar; b.fillRect(B.cx - 0.5 + i * 0.36, B.cy - 0.18, 0.3, 0.36); b.fillStyle = C['solar-2']; b.fillRect(B.cx - 0.5 + i * 0.36, B.cy - 0.18, 0.3, 0.05); } }
          else if (hv * 7 % 1 < 0.65) { b.fillStyle = C['grass-2']; b.beginPath(); b.arc(B.cx, B.cy, Math.min(0.5, Math.sqrt(B.area) * 0.18), 0, 7); b.fill(); b.fillStyle = C.flower; b.beginPath(); b.arc(B.cx + 0.1, B.cy - 0.06, 0.07, 0, 7); b.fill(); }
        }
        if (B.kind === 1) { b.strokeStyle = C.hi; b.lineWidth = 0.09; b.beginPath(); b.moveTo(B.cx, B.cy - 0.3); b.lineTo(B.cx, B.cy + 0.3); b.moveTo(B.cx - 0.2, B.cy - 0.1); b.lineTo(B.cx + 0.2, B.cy - 0.1); b.stroke(); }
      }
      // alberi tondi nei parchi (non attaccati alle strade)
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
        if (area[y * Wm + x] !== A.PARK || hash(x, y, 31) > 0.42) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const i = (y + dy) * Wm + x + dx; if (G.road[i]) { near = true; break; } }
        if (near) continue;
        tree(b, x + 0.5 + (hash(y, x, 5) - 0.5) * 0.4, y + 0.5 + (hash(x, y, 6) - 0.5) * 0.4, 0.34 + hash(x, y, 3) * 0.16, hash(x, y, 9));
      }
      // strade: cordolo e marciapiede, poi asfalto (vie pedonali lastricate), incroci, mezzeria, strisce
      const es = edgesIn(x0 - 3, y0 - 3, x0 + w + 3, y0 + h + 3);
      b.lineCap = 'round'; b.lineJoin = 'round';
      const strokeAll = (list, width, col) => { b.strokeStyle = col; for (const e of list) { b.lineWidth = width(e); b.beginPath(); polyPath(b, e.pts); b.stroke(); } };
      const fast = es.filter((e) => !e.slow), slow = es.filter((e) => e.slow);
      strokeAll(fast, (e) => 2 * (e.hw + P.ASPH + 0.62), C.curb);
      strokeAll(fast, (e) => 2 * (e.hw + P.ASPH + 0.55), C.walk);
      strokeAll(slow, (e) => 2 * (e.hw + P.ASPH), C['walk-2']);
      strokeAll(slow, (e) => 2 * (e.hw + P.ASPH) - 0.14, C.walk);
      strokeAll(fast, (e) => 2 * (e.hw + P.ASPH), C.road);
      const nodes = new Set();
      for (const e of es) { nodes.add(e.a); nodes.add(e.b); }
      for (const n of nodes) {
        const N = G.nodes[n];
        if (N.deg < 3) continue;
        b.fillStyle = C['road-2']; b.beginPath(); b.arc(N.x, N.y, N.hw + P.ASPH * 0.6, 0, 7); b.fill();
      }
      b.strokeStyle = C.mark; b.lineWidth = 0.07; b.setLineDash([0.42, 0.38]);
      for (const e of fast) {
        if (e.one || e.hw < 0.85) continue;
        const t0 = G.nodes[e.a].r + 0.3, t1 = e.len - G.nodes[e.b].r - 0.3;
        if (t1 - t0 < 0.8) continue;
        b.beginPath(); polyPath(b, subLine(e, t0, t1)); b.stroke();
      }
      b.setLineDash([]);
      for (const n of nodes) {
        const N = G.nodes[n];
        if (!N.lit || N.deg > 4) continue;
        for (const i of N.inc) {
          const e = G.edges[i];
          if (e.slow || e.len < 2 * N.r + 1) continue;
          const t = e.a === n ? N.r - 0.4 : e.len - N.r + 0.4;
          if (t < 0.3 || t > e.len - 0.3) continue;
          const [x, y, a] = P.along(G.center[e.id], t), half = e.hw + P.ASPH - 0.12;
          b.save(); b.translate(x, y); b.rotate(a);
          b.fillStyle = C.zebra;
          for (let v = -half; v <= half - 0.12; v += 0.27) b.fillRect(-0.3, v, 0.6, 0.15);
          // linea d'arresto per chi arriva (sul suo lato destro)
          const into = e.a === n ? -1 : 1;
          b.fillStyle = C.mark; b.fillRect(into > 0 ? -0.42 : 0.35, into > 0 ? 0 : -half, 0.07, half);
          b.restore();
        }
      }
      // lampioni lungo i marciapiedi
      for (const e of fast) for (let t = 2; t < e.len - 1; t += 4) {
        const [x, y, a] = P.along(G.center[e.id], t), sd = Math.floor(t / 4) % 2 ? 1 : -1, off = e.hw + P.ASPH + 0.3;
        const lx = x - Math.sin(a) * off * sd, ly = y + Math.cos(a) * off * sd;
        if (lx < x0 - 2 || lx > x0 + w + 2 || ly < y0 - 2 || ly > y0 + h + 2) continue;
        b.fillStyle = C.pole; b.beginPath(); b.arc(lx, ly, 0.06, 0, 7); b.fill();
        b.fillStyle = C.lamp; b.beginPath(); b.arc(lx, ly, 0.1, 0, 7); b.fill();
        if (C.night) { const gr = b.createRadialGradient(lx, ly, 0, lx, ly, 1.5); gr.addColorStop(0, C.glow); gr.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = gr; b.globalCompositeOperation = 'lighter'; b.fillRect(lx - 1.5, ly - 1.5, 3, 3); b.globalCompositeOperation = 'source-over'; }
      }
      // ristoranti e deposito del livello: tendina a righe / portone sul lato verso le case
      for (const id of s.rest) shopSignO(b, G.spots[id], 'food');
      if (s.depot >= 0) shopSignO(b, G.spots[s.depot], 'depot');
      // icone dei luoghi
      const ps = cellIds(O.pgrid, O, x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, new Set()).map((i) => md.pois[i]);
      for (const p of ps) poiIcon(b, p.k, p.x, p.y, ['pier', 'castle', 'harbour', 'station'].includes(p.k) ? 0.42 : 0.3);
    }
    function umbrella(b, x, y, hv) {
      const cols = [C['umb-1'], C['umb-2'], C['umb-3']], r = 0.34;
      b.fillStyle = C.shadow; b.beginPath(); b.ellipse(x + 0.12, y + 0.14, r, r * 0.8, 0, 0, 7); b.fill();
      for (let k = 0; k < 8; k++) { b.fillStyle = k % 2 ? C.hi : cols[Math.floor(hv * 3)]; b.beginPath(); b.moveTo(x, y); b.arc(x, y, r, (k * Math.PI) / 4, ((k + 1) * Math.PI) / 4); b.closePath(); b.fill(); }
      b.strokeStyle = C['roof-edge']; b.lineWidth = 0.03; b.beginPath(); b.arc(x, y, r, 0, 7); b.stroke();
      b.fillStyle = C.ink; b.beginPath(); b.arc(x, y, 0.04, 0, 7); b.fill();
      if (hv > 0.5) { b.fillStyle = cols[(Math.floor(hv * 3) + 1) % 3]; rrect(b, x + 0.28, y - 0.05, 0.22, 0.42, 0.05); b.fill(); }
    }
    // icone dei luoghi: piccolo bollino tondo con il disegno (solo forme, colori dai token)
    function poiIcon(b, k, x, y, r) {
      if (!BADGE.has(k)) return;
      b.save(); b.translate(x, y);
      b.fillStyle = C.shadow; b.beginPath(); b.arc(r * 0.18, r * 0.24, r, 0, 7); b.fill();
      b.fillStyle = C['pin-2']; b.strokeStyle = C.ink; b.lineWidth = 0.04; b.beginPath(); b.arc(0, 0, r, 0, 7); b.fill(); b.stroke();
      const s0 = r / 0.3; b.scale(s0, s0); b.lineWidth = 0.035;
      const ink = () => { b.strokeStyle = C.ink; b.stroke(); };
      if (k === 'food') { b.fillStyle = C.pizza; b.beginPath(); b.moveTo(0, 0.2); b.lineTo(-0.16, -0.14); b.quadraticCurveTo(0, -0.24, 0.16, -0.14); b.closePath(); b.fill(); ink(); b.fillStyle = C['pizza-2']; b.beginPath(); b.arc(-0.03, -0.06, 0.035, 0, 7); b.arc(0.04, 0.04, 0.03, 0, 7); b.fill(); }
      else if (k === 'gelato') { b.fillStyle = C.p1; b.beginPath(); b.moveTo(-0.1, -0.02); b.lineTo(0.1, -0.02); b.lineTo(0, 0.22); b.closePath(); b.fill(); ink(); b.fillStyle = C['cake-2']; b.beginPath(); b.arc(0, -0.08, 0.11, 0, 7); b.fill(); ink(); }
      else if (k === 'cafe') { b.fillStyle = C.ac; rrect(b, -0.13, -0.08, 0.2, 0.22, 0.05); b.fill(); ink(); b.beginPath(); b.arc(0.1, 0.02, 0.06, -1.4, 1.4); ink(); b.strokeStyle = C.steam; b.beginPath(); b.moveTo(-0.05, -0.12); b.quadraticCurveTo(-0.01, -0.18, -0.05, -0.24); b.stroke(); }
      else if (k === 'bakery') { b.fillStyle = C.ramen; b.beginPath(); b.ellipse(0, 0.02, 0.18, 0.1, 0, 0, 7); b.fill(); ink(); b.strokeStyle = C.p1; b.beginPath(); b.moveTo(-0.06, -0.06); b.lineTo(-0.03, 0.1); b.moveTo(0.06, -0.06); b.lineTo(0.03, 0.1); b.stroke(); }
      else if (k === 'shop') { b.fillStyle = C.awning; rrect(b, -0.14, -0.06, 0.28, 0.24, 0.04); b.fill(); ink(); b.beginPath(); b.arc(0, -0.06, 0.08, Math.PI, 0); ink(); }
      else if (k === 'depot') { b.fillStyle = C.p1; b.beginPath(); b.moveTo(-0.16, -0.06); b.lineTo(0, -0.14); b.lineTo(0.16, -0.06); b.lineTo(0.16, 0.12); b.lineTo(0, 0.2); b.lineTo(-0.16, 0.12); b.closePath(); b.fill(); ink(); b.strokeStyle = C.tape; b.lineWidth = 0.05; b.beginPath(); b.moveTo(-0.08, -0.1); b.lineTo(0.08, -0.02); b.stroke(); }
      else if (k === 'taxi') { b.fillStyle = C.taxi; rrect(b, -0.16, -0.1, 0.32, 0.2, 0.05); b.fill(); ink(); b.fillStyle = C.check; for (let i = 0; i < 4; i++) b.fillRect(-0.12 + i * 0.06 + (i % 2) * 0.0, -0.02, 0.03, 0.04); }
      else if (k === 'station') { b.fillStyle = C.bus; rrect(b, -0.14, -0.17, 0.28, 0.3, 0.07); b.fill(); ink(); b.fillStyle = C.glass; b.fillRect(-0.09, -0.12, 0.18, 0.09); b.fillStyle = C.head; b.beginPath(); b.arc(-0.07, 0.07, 0.03, 0, 7); b.arc(0.07, 0.07, 0.03, 0, 7); b.fill(); b.strokeStyle = C.ink; b.beginPath(); b.moveTo(-0.1, 0.2); b.lineTo(-0.06, 0.13); b.moveTo(0.1, 0.2); b.lineTo(0.06, 0.13); b.stroke(); }
      else if (k === 'beach') { b.fillStyle = C['umb-1']; b.beginPath(); b.arc(0, -0.02, 0.18, Math.PI, 0); b.closePath(); b.fill(); ink(); b.strokeStyle = C.ink; b.beginPath(); b.moveTo(0, -0.02); b.lineTo(0, 0.2); b.stroke(); b.fillStyle = C.sand; b.fillRect(-0.18, 0.15, 0.36, 0.06); }
      else if (k === 'pier') { b.fillStyle = C.wood; b.fillRect(-0.06, -0.2, 0.12, 0.4); b.strokeStyle = C['wood-2']; b.beginPath(); for (let i = -1; i <= 1; i++) { b.moveTo(-0.06, i * 0.1); b.lineTo(0.06, i * 0.1); } b.stroke(); b.fillStyle = C.sea; b.fillRect(-0.2, -0.04, 0.12, 0.08); b.fillRect(0.08, -0.04, 0.12, 0.08); }
      else if (k === 'castle') { b.fillStyle = C.castle; b.beginPath(); b.moveTo(-0.16, 0.18); b.lineTo(-0.16, -0.1); b.lineTo(-0.1, -0.1); b.lineTo(-0.1, -0.05); b.lineTo(-0.03, -0.05); b.lineTo(-0.03, -0.1); b.lineTo(0.03, -0.1); b.lineTo(0.03, -0.05); b.lineTo(0.1, -0.05); b.lineTo(0.1, -0.1); b.lineTo(0.16, -0.1); b.lineTo(0.16, 0.18); b.closePath(); b.fill(); ink(); b.fillStyle = C['castle-2']; rrect(b, -0.04, 0.06, 0.08, 0.12, 0.04); b.fill(); b.fillStyle = C.stop; b.beginPath(); b.moveTo(0, -0.1); b.lineTo(0, -0.24); b.lineTo(0.1, -0.2); b.lineTo(0, -0.17); b.fill(); }
      else if (k === 'harbour') { b.fillStyle = C.sail; b.beginPath(); b.moveTo(0, -0.2); b.lineTo(0, 0.04); b.lineTo(0.14, 0.04); b.closePath(); b.fill(); ink(); b.fillStyle = C['boat-2']; b.beginPath(); b.moveTo(-0.16, 0.07); b.lineTo(0.16, 0.07); b.lineTo(0.1, 0.16); b.lineTo(-0.1, 0.16); b.closePath(); b.fill(); ink(); }
      else if (k === 'sight') { b.fillStyle = C.star; b.beginPath(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, q = i % 2 ? 0.08 : 0.18; b.lineTo(Math.cos(a) * q, Math.sin(a) * q); } b.closePath(); b.fill(); ink(); }
      b.restore();
    }
    function shopSignO(b, sp, kind) {
      if (!sp) return;
      let nx = sp.x - sp.zx, ny = sp.y - sp.zy;
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      const cx = sp.x + nx * 0.5, cy = sp.y + ny * 0.5, w = 1.3, d = 0.34;
      b.save(); b.translate(cx, cy); b.rotate(Math.atan2(ny, nx) - Math.PI / 2 + Math.PI);
      if (kind === 'food') {
        for (let i = 0; i < 6; i++) { b.fillStyle = i % 2 ? C['awning-2'] : C.awning; b.fillRect(-w / 2 + (i * w) / 6, 0, w / 6 + 0.01, d); }
        b.strokeStyle = C.ink; b.lineWidth = 0.04; b.strokeRect(-w / 2, 0, w, d);
        b.fillStyle = C.awning; for (let i = 0; i < 6; i++) { b.beginPath(); b.arc(-w / 2 + (i + 0.5) * (w / 6), d, w / 12, 0, Math.PI); b.fill(); }
      } else {
        b.fillStyle = C.ac; b.fillRect(-w / 2, 0, w, d + 0.1);
        b.strokeStyle = C['ac-2']; b.lineWidth = 0.05;
        for (let i = 1; i < 4; i++) { b.beginPath(); b.moveTo(-w / 2, (i * (d + 0.1)) / 4); b.lineTo(w / 2, (i * (d + 0.1)) / 4); b.stroke(); }
        b.strokeStyle = C.ink; b.lineWidth = 0.04; b.strokeRect(-w / 2, 0, w, d + 0.1);
      }
      b.restore();
    }
    // a ogni fotogramma: onde, barchette che dondolano, cartelli dei luoghi notevoli
    function drawSea(t, inView, vx0, vy0, vx1, vy1) {
      const O = osmPrep(), md = O.md, A = P.AR, Wm = md.W, rm = reduce();
      g.strokeStyle = C.foam; g.lineWidth = 0.06; g.lineCap = 'round';
      g.beginPath();
      for (let y = Math.max(0, Math.floor(vy0)); y < Math.min(md.H, Math.ceil(vy1)); y++) for (let x = Math.max(0, Math.floor(vx0)); x < Math.min(Wm, Math.ceil(vx1)); x++) {
        if (md.area[y * Wm + x] !== A.WATER) continue;
        const hv = hash(x, y, 41);
        if (hv > 0.07) continue;
        const ph = rm ? 0 : t * 1.3 + hv * 90, dx = Math.sin(ph) * 0.15, cx = x + 0.3 + hash(y, x, 2) * 0.4 + dx, cy = y + 0.5;
        g.moveTo(cx - 0.22, cy); g.quadraticCurveTo(cx - 0.11, cy - 0.12, cx, cy); g.quadraticCurveTo(cx + 0.11, cy - 0.12, cx + 0.22, cy);
      }
      g.stroke();
      for (const q of O.boats) {
        if (!inView(q.x, q.y, 2)) continue;
        const bob = rm ? 0 : Math.sin(t * 1.6 + q.ph) * 0.06, a = q.a + (rm || q.moor ? 0 : Math.sin(t * 0.3 + q.ph) * 0.15);
        g.save(); g.translate(q.x, q.y + bob); g.rotate(a);
        g.fillStyle = C.shadow; g.beginPath(); g.ellipse(0.06, 0.08, 0.5, 0.2, 0, 0, 7); g.fill();
        g.fillStyle = q.k ? C['boat-2'] : C.boat; g.strokeStyle = C.ink; g.lineWidth = 0.035;
        g.beginPath(); g.moveTo(-0.45, -0.16); g.lineTo(0.3, -0.16); g.quadraticCurveTo(0.55, 0, 0.3, 0.16); g.lineTo(-0.45, 0.16); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = C.sail; g.beginPath(); g.moveTo(-0.15, -0.02); g.lineTo(0.2, 0); g.lineTo(-0.15, 0.1); g.closePath(); g.fill(); g.stroke();
        if (!q.moor && !rm) { g.strokeStyle = C.foam; g.beginPath(); g.moveTo(-0.55, -0.1); g.lineTo(-0.85, -0.18); g.moveTo(-0.55, 0.1); g.lineTo(-0.85, 0.18); g.stroke(); }
        g.restore();
      }
    }
    function drawLabels(inView) {
      const O = osmPrep(), c = s.car, list = O.labels.filter((p) => inView(p.x, p.y, 1)).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y)).slice(0, 6);
      if (!list.length) return;
      screen();
      const fs = Math.max(10, Math.min(13, TS * 0.3));
      g.font = `800 ${fs}px "M PLUS Rounded 1c", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const p of list) {
        const [px0, sy0] = toS(p.x, p.y), sy = sy0 - TS * 0.62, tw = Math.min(g.measureText(p.name).width, W * 0.5), pw = tw + 14, ph = fs + 8;
        const sx = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, px0));
        g.fillStyle = C.street; g.strokeStyle = C['street-ink']; g.lineWidth = 1.2; g.globalAlpha = 0.95;
        rr(sx - pw / 2, sy - ph / 2, pw, ph, ph / 2); g.fill(); g.stroke();
        const tx = Math.max(sx - pw / 2 + 8, Math.min(sx + pw / 2 - 8, px0));
        g.beginPath(); g.moveTo(tx - 4, sy + ph / 2 - 0.5); g.lineTo(tx, sy + ph / 2 + 5); g.lineTo(tx + 4, sy + ph / 2 - 0.5); g.fill();
        g.globalAlpha = 1; g.fillStyle = C['street-ink']; g.fillText(p.name, sx, sy + 0.5, W * 0.5);
      }
      world();
    }
    function drawLightsO(inView) {
      const G = g0;
      for (let n = 0; n < G.nodes.length; n++) {
        const N = G.nodes[n];
        if (!N.lit || !inView(N.x, N.y, 2)) continue;
        const Lg = P.light(s, n);
        for (const i of N.inc) {
          const e = G.edges[i];
          if (e.slow) continue;
          const din = 2 * i + (e.b === n ? 0 : 1), t = e.a === n ? Math.min(e.len, N.r + 0.15) : Math.max(0, e.len - N.r - 0.15);
          const [x, y, a] = P.along(G.center[i], t), dirIn = e.a === n ? a + Math.PI : a, off = e.hw + P.ASPH + 0.25;
          // sull'angolo a destra di chi arriva
          const px = x - Math.sin(dirIn) * off, py = y + Math.cos(dirIn) * off;
          const col = Lg.ph === G.grp[din] ? (Lg.left < 1.3 ? C.amber : C.go) : C.stop;
          g.fillStyle = C.pole; rr(px - 0.15, py - 0.1, 0.3, 0.2, 0.08); g.fill();
          g.fillStyle = col; g.beginPath(); g.arc(px, py, 0.075, 0, 7); g.fill();
          if (C.night) { g.globalAlpha = 0.35; g.beginPath(); g.arc(px, py, 0.2, 0, 7); g.fill(); g.globalAlpha = 1; }
        }
      }
    }
    // minimappa delle mappe reali: immagine a 1 pixel per casella, se ne mostra una finestra attorno a Hari
    function paintMiniOsm() {
      const md = P.mapData(s.mapId), A = P.AR, Wm = md.W, Hm = md.H;
      mini = document.createElement('canvas'); mini.width = Wm; mini.height = Hm;
      const b = mini.getContext('2d');
      const col = { [A.LAND]: C['mm-bld'], [A.PARK]: C['mm-park'], [A.FIELD]: C['mm-park'], [A.SAND]: C['mm-sand'], [A.WATER]: C['mm-water'], [A.PLAZA]: C.walk, [A.PIER]: C.wood, [A.PARKING]: C['mm-bld'], [A.RAIL]: C['mm-bld'] };
      for (let y = 0; y < Hm; y++) {
        let x = 0;
        while (x < Wm) {
          const i = y * Wm + x, c = g0.road[i] ? 'r' : md.area[i];
          let j = x + 1;
          while (j < Wm && (g0.road[y * Wm + j] ? 'r' : md.area[y * Wm + j]) === c) j++;
          b.fillStyle = c === 'r' ? C['mm-road'] : col[c] || C['mm-bld'];
          b.fillRect(x, y, j - x, 1);
          x = j;
        }
      }
    }

    /* ---------- minimappa (una volta per livello e tema) ---------- */
    function paintMini() {
      const k = 3;
      mini = document.createElement('canvas');
      mini.width = s.W * k; mini.height = s.H * k;
      const b = mini.getContext('2d');
      for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) {
        const ch = s.map[y * s.W + x];
        b.fillStyle = ch === '.' ? C['mm-road'] : ch === 'p' ? C['mm-park'] : ch === '#' ? C['mm-bld'] : C['mm-park'];
        b.fillRect(x * k, y * k, k, k);
      }
    }

    /* ---------- disegno a ogni fotogramma ---------- */
    const toS = (x, y) => [(x - camX) * TS + W / 2, (y - camY) * TS + H / 2];
    function spr(name, x, y, a, wT, hT, alpha = 1) {
      const im = IMG[name];
      if (!im) return;
      g.save();
      g.globalAlpha = alpha;
      g.translate(x, y);
      if (a) g.rotate(a);
      g.drawImage(im, -wT / 2, -hT / 2, wT, hT);
      g.restore();
    }
    function world() {
      const k = TS * dpr, sx = shake > 0 && !reduce() ? Math.sin(performance.now() / 22) * shake * 6 : 0;
      g.setTransform(k, 0, 0, k, (W / 2 - camX * TS + sx) * dpr, (H / 2 - camY * TS) * dpr);
    }
    function screen() { g.setTransform(dpr, 0, 0, dpr, 0, 0); }

    function draw(now) {
      if (!g || !s) return;
      const t = now / 1000;
      screen();
      g.fillStyle = C.grass; g.fillRect(0, 0, W, H);
      world();
      const vx0 = camX - W / 2 / TS - 1, vy0 = camY - H / 2 / TS - 1, vx1 = camX + W / 2 / TS + 1, vy1 = camY + H / 2 / TS + 1;
      g.imageSmoothingEnabled = true;
      budget = 3;
      for (let cy = Math.floor(vy0 / CH); cy <= Math.floor(vy1 / CH); cy++) for (let cx = Math.floor(vx0 / CH); cx <= Math.floor(vx1 / CH); cx++) {
        if (cx < 0 || cy < 0 || cx * CH > s.W || cy * CH > s.H) continue;
        const ck = chunk(cx, cy);
        if (ck) g.drawImage(ck, cx * CH, cy * CH, CH + 0.02, CH + 0.02);
      }
      const inView = (x, y, m = 1.5) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
      if (g0.osm) { drawSea(t, inView, vx0, vy0, vx1, vy1); drawLightsO(inView); } else drawLights(inView);
      drawZones(t, inView);
      // pedoni e passeggeri in attesa, poi i veicoli (i pedoni che saltano sopra a tutto)
      const peds = s.peds.filter((p) => inView(p.x, p.y)).sort((a, b) => a.y - b.y);
      for (const p of peds) if (p.st !== 3) drawPed(p, t);
      drawWaiting(t);
      if (C.night) beams(inView);
      for (const v of s.npcs) if (inView(v.x, v.y, 2)) drawNpc(v, t);
      drawMe(t);
      for (const p of peds) if (p.st === 3) drawPed(p, t);
      drawGhosts(t);
      drawParts(t);
      if (g0.osm) drawLabels(inView);
      screen();
      if (+C.night) { g.fillStyle = C.dusk; g.fillRect(0, 0, W, H); }
      drawArrow(t);
      drawOffscreen(t);
      drawMini(t);
      drawJoy();
    }

    function drawLights(inView) {
      for (let n = 0; n < g0.nodes.length; n++) {
        const N = g0.nodes[n];
        if (!N.lit || !inView(N.x, N.y, 2)) continue;
        const Lg = P.light(s, n);
        const col = (axis) => (Lg.ph === axis ? (Lg.left < 1.3 ? C.amber : C.go) : C.stop);
        // un semaforo per ogni corsia in arrivo, sull'angolo del marciapiede a destra di chi arriva
        const spots = [[-1.22, 1.22, 0], [1.22, -1.22, 0], [-1.22, -1.22, 1], [1.22, 1.22, 1]];
        for (const [dx, dy, axis] of spots) {
          const x = N.x + dx, y = N.y + dy;
          g.fillStyle = C.pole; rr(x - 0.15, y - 0.1, 0.3, 0.2, 0.08); g.fill();
          g.fillStyle = col(axis); g.beginPath(); g.arc(x, y, 0.075, 0, 7); g.fill();
          if (C.night) { g.globalAlpha = 0.35; g.beginPath(); g.arc(x, y, 0.2, 0, 7); g.fill(); g.globalAlpha = 1; }
        }
      }
    }
    function rr(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }
    // fermate: anello pulsante sulla strada + segnalino sul marciapiede
    function drawZones(t, inView) {
      for (const tg of P.targets(s)) {
        if (!inView(tg.zx, tg.zy, 2)) continue;
        const pulse = reduce() ? 0.5 : (t * 1.2) % 1;
        g.fillStyle = C['zone-2']; g.beginPath(); g.arc(tg.zx, tg.zy, P.ZONE_R * 0.8, 0, 7); g.fill();
        g.strokeStyle = C.zone; g.lineWidth = 0.07; g.setLineDash([0.22, 0.14]); g.lineDashOffset = -t * 0.6;
        g.beginPath(); g.arc(tg.zx, tg.zy, P.ZONE_R * 0.8, 0, 7); g.stroke(); g.setLineDash([]);
        g.globalAlpha = 1 - pulse; g.lineWidth = 0.05; g.beginPath(); g.arc(tg.zx, tg.zy, P.ZONE_R * (0.5 + pulse * 0.5), 0, 7); g.stroke(); g.globalAlpha = 1;
        if (tg.kind === 'drop') pinAt(tg.x, tg.y, t, iconFor(tg));
      }
    }
    function iconFor(tg) {
      const it = s.trip && s.trip.items.find((i) => i.id === tg.item);
      if (s.type === 'parcel') return `box${it ? it.who : 0}`;
      if (s.type === 'food') return 'house';
      return it ? `p${it.who}j` : 'house';
    }
    function pinAt(x, y, t, icon) {
      const bob = reduce() ? 0 : Math.sin(t * 4) * 0.06, r = 0.36, py = y - 0.55 + bob;
      g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y + 0.05, 0.2, 0.08, 0, 0, 7); g.fill();
      g.fillStyle = C.pin; g.strokeStyle = C.ink; g.lineWidth = 0.04;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - r * 0.4, py + r * 0.6, x - r, py + r * 0.3, x - r, py); g.arc(x, py, r, Math.PI, 0); g.bezierCurveTo(x + r, py + r * 0.3, x + r * 0.4, py + r * 0.6, x, y); g.fill(); g.stroke();
      g.fillStyle = C['pin-2']; g.beginPath(); g.arc(x, py, r * 0.74, 0, 7); g.fill();
      spr(icon, x, py, 0, r * 1.3, r * 1.3);
    }
    function drawPed(p, t) {
      const run = !paused && s.ready <= 0 && !s.wait && !reduce();
      const fr = run && p.st !== 1 ? Math.floor(t * 6 + p.id) % 2 : 0;
      let y = p.y, name = `p${p.k}${fr ? 'b' : 'a'}`;
      const sz = 0.62;
      if (p.st === 0 && p.scared > 0) {
        // mappe reali: sfiorato sul marciapiede, fa un saltello
        const e = Math.max(0, Math.min(1, 1 - p.scared / 1.2));
        y -= Math.sin(e * Math.PI) * 0.4;
        name = `p${p.k}o`;
      } else if (p.st === 3) {
        // salto spaventato con "!" e stelline (mai investito)
        const e = Math.max(0, Math.min(1, 1 - p.scared / 1.2));
        y -= Math.sin(e * Math.PI) * 0.55 + 0.1;
        name = `p${p.k}o`;
      } else if (run) y -= Math.abs(Math.sin(t * 6 + p.id)) * 0.04;
      g.fillStyle = C.shadow; g.beginPath(); g.ellipse(p.x, p.y + 0.12, 0.17, 0.07, 0, 0, 7); g.fill();
      spr(name, p.x, y - sz * 0.3, 0, sz, sz);
      if (p.st === 3) bang(p.x + 0.22, y - sz * 0.75);
    }
    function bang(x, y) {
      const [sx, sy] = toS(x, y);
      screen();
      const fs = Math.max(14, TS * 0.42);
      g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = fs * 0.26; g.strokeStyle = C['text-line']; g.strokeText('!', sx, sy);
      g.fillStyle = C.star; g.fillText('!', sx, sy);
      world();
    }
    // chi aspetta alla fermata: passeggero col fumetto (taxi), sacchetto fumante (cibo), pacchi (deposito)
    function drawWaiting(t) {
      const tr = s.trip;
      if (!tr || tr.st !== 'go') return;
      const p = g0.spots[tr.p], bob = reduce() ? 0 : Math.abs(Math.sin(t * 3)) * 0.06;
      if (s.type === 'taxi') {
        const it = tr.items[0];
        g.fillStyle = C.shadow; g.beginPath(); g.ellipse(p.x, p.y + 0.14, 0.24, 0.09, 0, 0, 7); g.fill();
        spr(`p${it.who}${Math.floor(t * 2) % 2 ? 'j' : 'a'}`, p.x, p.y - 0.28 - bob, 0, 0.82, 0.82);
        bubble(p.x + 0.45, p.y - 1.05, 'house');
      } else if (s.type === 'food') {
        spr('bag', p.x, p.y - 0.15 - bob, 0, 0.62, 0.62);
        bubble(p.x + 0.42, p.y - 0.95, `d_${P.DISHES[tr.items[0].who]}`);
      } else {
        tr.items.forEach((it, i) => spr(`box${it.who}`, p.x - 0.25 + (i % 2) * 0.42, p.y - 0.1 - Math.floor(i / 2) * 0.32 - (i === tr.items.length - 1 ? bob : 0), 0, 0.46, 0.46));
      }
    }
    function bubble(x, y, icon) {
      g.fillStyle = C['pin-2']; g.strokeStyle = C.ink; g.lineWidth = 0.035;
      rr(x - 0.34, y - 0.3, 0.68, 0.56, 0.2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x - 0.2, y + 0.24); g.lineTo(x - 0.34, y + 0.44); g.lineTo(x - 0.04, y + 0.25); g.fill();
      spr(icon, x, y - 0.02, 0, 0.48, 0.48);
    }
    function beams(inView) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const one = (x, y, a, len, wd) => {
        const gr = g.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        gr.addColorStop(0, C.beam); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(x - Math.sin(a) * wd * 0.4, y + Math.cos(a) * wd * 0.4);
        g.lineTo(x + Math.cos(a) * len - Math.sin(a) * wd, y + Math.sin(a) * len + Math.cos(a) * wd);
        g.lineTo(x + Math.cos(a) * len + Math.sin(a) * wd, y + Math.sin(a) * len - Math.cos(a) * wd);
        g.lineTo(x + Math.sin(a) * wd * 0.4, y - Math.cos(a) * wd * 0.4);
        g.closePath(); g.fill();
      };
      for (const v of s.npcs) if (inView(v.x, v.y, 3)) { const K = P.NPCS[v.k]; one(v.x + Math.cos(v.a) * K.len * 0.45, v.y + Math.sin(v.a) * K.len * 0.45, v.a, 1.8, 0.55); }
      const V = P.VEH[s.veh], c = s.car;
      one(c.x + Math.cos(c.a) * V.len * 0.45, c.y + Math.sin(c.a) * V.len * 0.45, c.a, 2.4, 0.7);
      g.restore();
    }
    function vehShadow(x, y, a, len, wd) {
      g.save(); g.translate(x + 0.08, y + 0.12); g.rotate(a); g.fillStyle = C.shadow; rr(-len / 2, -wd / 2, len, wd, wd * 0.3); g.fill(); g.restore();
    }
    function drawNpc(v, t) {
      const K = P.NPCS[v.k], spec = VEHS[v.k], wT = spec.w / 100, hT = spec.h / 100;
      const wob = v.bonk > 0 && !reduce() ? Math.sin(t * 40) * 0.08 : 0;
      vehShadow(v.x, v.y, v.a, K.len, K.hw * 2);
      const name = v.k === 'car' ? `car${v.c % CARCOL.length}` : v.k === 'bus' ? `bus${v.c % 2}` : 'bike';
      spr(name, v.x, v.y, v.a + wob, wT, hT);
      if (v.k === 'bike') spr(`p${v.c % P.PEDS.length}a`, v.x, v.y - 0.12, 0, 0.5, 0.5);
      if (v.honk > 3.2) { // "bip bip": due archetti sopra l'auto
        g.strokeStyle = C.text; g.lineWidth = 0.05; g.lineCap = 'round';
        for (let i = 1; i <= 2; i++) { g.globalAlpha = (v.honk - 3.2) / 0.8; g.beginPath(); g.arc(v.x, v.y - 0.25, 0.18 * i + 0.1, -2.4, -0.7); g.stroke(); }
        g.globalAlpha = 1;
      }
    }
    function drawMe(t) {
      // lo scooter è piccolo: lo si disegna un po' più grande (solo grafica), così si vede sotto Hari
      const c = s.car, V = P.VEH[s.veh], spec = VEHS[s.veh], big = s.veh === 'scooter' ? 1.3 : 1, wT = (spec.w / 100) * big, hT = (spec.h / 100) * big;
      const blink = s.inv > 0 && !reduce() ? (Math.floor(t * 10) % 2 ? 0.45 : 1) : 1;
      vehShadow(c.x, c.y, c.a, V.len, V.hw * 2);
      spr('me', c.x, c.y, c.a, wT, hT, blink);
      // carico a bordo: passeggero dietro (taxi), pacchi sul tetto (furgone)
      const tr = s.trip, ride = tr && tr.st === 'ride' ? tr.items.filter((i) => i.st === 1) : [];
      const hx = Math.cos(c.a), hy = Math.sin(c.a);
      if (s.type === 'taxi' && ride.length) spr(`p${ride[0].who}j`, c.x - hx * 0.3, c.y - hy * 0.3 - 0.08, 0, 0.44, 0.44, blink);
      if (s.type === 'parcel') ride.forEach((it, i) => spr(`box${it.who}`, c.x - hx * (0.38 - i * 0.16) + (i % 2 ? 1 : -1) * hy * 0.12, c.y - hy * (0.38 - i * 0.16) - (i % 2 ? 1 : -1) * hx * 0.12, 0, 0.26, 0.26, blink));
      // Hari al volante (testa sempre dritta)
      const seat = s.veh === 'van' ? 0.36 : s.veh === 'scooter' ? 0.12 : 0.1, hs = s.veh === 'scooter' ? 0.54 : 0.7;
      const hop = party ? Math.abs(Math.sin((t - party / 1000) * 8)) * 0.18 : 0;
      const face = party ? 'hariJ' : s.inv > P.INV - 0.9 ? 'hariO' : 'hari';
      spr(face, c.x + hx * seat, c.y + hy * seat - 0.14 - hop, 0, hs, hs, blink);
    }
    // personaggi che salgono/scendono (animazione breve dal marciapiede al veicolo e viceversa)
    function drawGhosts(t) {
      ghosts = ghosts.filter((q) => t - q.t0 < q.dur);
      for (const q of ghosts) {
        const e = (t - q.t0) / q.dur, x = q.x0 + (q.x1 - q.x0) * e, y = q.y0 + (q.y1 - q.y0) * e - Math.sin(e * Math.PI) * q.arc;
        spr(q.name, x, y, 0, q.size, q.size, e > 0.8 ? (1 - e) / 0.2 : 1);
      }
    }
    function drawArrow(t) {
      const tg = mainTarget();
      if (!tg || P.isOver(s)) return;
      const c = s.car, d = Math.hypot(tg.zx - c.x, tg.zy - c.y);
      if (d < 2.2) return;
      if (t - routeAt > 0.25 || !routePt) {
        routeAt = t;
        const rt = P.route(s, c.x, c.y, Math.floor(tg.zy) * s.W + Math.floor(tg.zx), 5);
        routePt = rt.length ? rt[Math.min(3, rt.length - 1)] : { x: tg.zx, y: tg.zy };
      }
      const a = Math.atan2(routePt.y - c.y, routePt.x - c.x), [sx, sy] = toS(c.x, c.y), R = TS * 0.95 + (reduce() ? 0 : Math.sin(t * 6) * TS * 0.05);
      g.save();
      g.translate(sx + Math.cos(a) * R, sy + Math.sin(a) * R); g.rotate(a);
      const z = TS * 0.26;
      g.fillStyle = C.arrow; g.strokeStyle = C.ink; g.lineWidth = 2; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(z, 0); g.lineTo(-z * 0.7, -z * 0.8); g.lineTo(-z * 0.35, 0); g.lineTo(-z * 0.7, z * 0.8); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    function mainTarget() {
      const tg = P.targets(s);
      if (!tg.length) return null;
      if (tg.length === 1) return tg[0];
      const f = P.field(s, Math.floor(s.car.y) * s.W + Math.floor(s.car.x));
      const d = (q) => { const v = f[Math.floor(q.zy) * s.W + Math.floor(q.zx)]; return v < 0 ? 999 : v; };
      return tg.slice().sort((a, b) => d(a) - d(b))[0];
    }
    // meta fuori dallo schermo: segnalino sul bordo che punta verso di lei
    function drawOffscreen(t) {
      for (const tg of P.targets(s)) {
        const [sx, sy] = toS(tg.x, tg.y), m = 26;
        if (sx > m && sx < W - m && sy > m && sy < H - m) continue;
        const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
        const k = Math.min((W / 2 - m) / Math.max(1, Math.abs(dx)), (H / 2 - m) / Math.max(1, Math.abs(dy)));
        const x = cx + dx * k, y = cy + dy * k, a = Math.atan2(dy, dx), r = 15 + (reduce() ? 0 : Math.sin(t * 5) * 1.5);
        g.fillStyle = C.pin; g.strokeStyle = C.ink; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); g.lineTo(x + Math.cos(a + 0.5) * r, y + Math.sin(a + 0.5) * r); g.lineTo(x + Math.cos(a - 0.5) * r, y + Math.sin(a - 0.5) * r); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
        g.fillStyle = C['pin-2']; g.beginPath(); g.arc(x, y, r * 0.78, 0, 7); g.fill();
        const icon = tg.kind === 'pick' ? (s.type === 'taxi' ? `p${s.trip.items[0].who}a` : s.type === 'food' ? 'bag' : 'box0') : iconFor(tg);
        const im = IMG[icon];
        if (im) g.drawImage(im, x - r * 0.72, y - r * 0.72, r * 1.44, r * 1.44);
      }
    }
    function drawMini(t) {
      if (g0.osm) { drawMiniO(t); return; }
      const mw = Math.min(W * 0.3, 112), mh = (mw * s.H) / s.W, x0 = W - mw - 8, y0 = 8;
      mmRect = { x: x0, y: y0, w: mw, h: showMap ? mh : 22 };
      if (!showMap) {
        g.fillStyle = C.mm; g.strokeStyle = C['mm-line']; g.lineWidth = 1.5;
        rr(W - 34, 8, 26, 22, 7); g.fill(); g.stroke();
        g.strokeStyle = C['mm-line']; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(W - 29, 13); g.lineTo(W - 23, 15); g.lineTo(W - 18, 13); g.lineTo(W - 13, 15); g.lineTo(W - 13, 25); g.lineTo(W - 18, 23); g.lineTo(W - 23, 25); g.lineTo(W - 29, 23); g.closePath(); g.stroke();
        mmRect = { x: W - 34, y: 8, w: 26, h: 22 };
        return;
      }
      if (!mini) paintMini();
      g.save();
      g.fillStyle = C.mm; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); g.fill();
      rr(x0, y0, mw, mh, 6); g.clip();
      g.globalAlpha = 0.95; g.drawImage(mini, x0, y0, mw, mh); g.globalAlpha = 1;
      const k = mw / s.W, at = (x, y) => [x0 + x * k, y0 + y * k];
      // ristoranti e deposito
      for (const id of s.rest) { const [x, y] = at(g0.spots[id].x, g0.spots[id].y); g.fillStyle = C.awning; g.fillRect(x - 2.5, y - 2.5, 5, 5); }
      if (s.depot >= 0) { const [x, y] = at(g0.spots[s.depot].x, g0.spots[s.depot].y); g.fillStyle = C.van; g.fillRect(x - 3, y - 3, 6, 6); }
      // vista della camera
      g.strokeStyle = C['mm-line']; g.globalAlpha = 0.35; g.lineWidth = 1;
      const [vx, vy] = at(camX - W / 2 / TS, camY - H / 2 / TS); g.strokeRect(vx, vy, (W / TS) * k, (H / TS) * k); g.globalAlpha = 1;
      for (const tg of P.targets(s)) {
        const [x, y] = at(tg.x, tg.y), r = 3 + (reduce() ? 0 : (Math.sin(t * 6) + 1) * 1.2);
        g.fillStyle = C.pin; g.strokeStyle = C['mm-line']; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
      }
      const [cx, cy] = at(s.car.x, s.car.y);
      g.fillStyle = C[s.veh === 'scooter' ? 'scoot' : s.veh] || C.star; g.strokeStyle = C['mm-line']; g.lineWidth = 1.2;
      g.beginPath(); g.arc(cx, cy, 3.6, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(s.car.a) * 6, cy + Math.sin(s.car.a) * 6); g.stroke();
      g.restore();
      g.strokeStyle = C['mm-line']; g.globalAlpha = 0.6; g.lineWidth = 1.5; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); g.stroke(); g.globalAlpha = 1;
    }
    function drawMiniO(t) {
      const mw = Math.min(W * 0.3, 118), mh = mw, x0 = W - mw - 8, y0 = 8, VW = 72;
      if (!showMap) { drawMini0(); return; }
      mmRect = { x: x0, y: y0, w: mw, h: mh };
      if (!mini) paintMiniOsm();
      // finestra di VW caselle attorno alla camera, dentro la mappa
      const sx = Math.max(0, Math.min(s.W - VW, camX - VW / 2)), sy = Math.max(0, Math.min(s.H - VW, camY - VW / 2)), k = mw / VW;
      g.save();
      g.fillStyle = C.mm; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); g.fill();
      rr(x0, y0, mw, mh, 6); g.clip();
      g.imageSmoothingEnabled = false;
      g.globalAlpha = 0.95; g.drawImage(mini, sx, sy, VW, VW, x0, y0, mw, mh); g.globalAlpha = 1;
      g.imageSmoothingEnabled = true;
      const at = (x, y) => [x0 + (x - sx) * k, y0 + (y - sy) * k];
      const clampIn = ([x, y], m) => [Math.max(x0 + m, Math.min(x0 + mw - m, x)), Math.max(y0 + m, Math.min(y0 + mh - m, y))];
      for (const id of s.rest) { const [x, y] = clampIn(at(g0.spots[id].x, g0.spots[id].y), 3); g.fillStyle = C.awning; g.fillRect(x - 2.5, y - 2.5, 5, 5); }
      if (s.depot >= 0) { const [x, y] = clampIn(at(g0.spots[s.depot].x, g0.spots[s.depot].y), 3); g.fillStyle = C.van; g.fillRect(x - 3, y - 3, 6, 6); }
      g.strokeStyle = C['mm-line']; g.globalAlpha = 0.35; g.lineWidth = 1;
      const [vx, vy] = at(camX - W / 2 / TS, camY - H / 2 / TS); g.strokeRect(vx, vy, (W / TS) * k, (H / TS) * k); g.globalAlpha = 1;
      for (const tg of P.targets(s)) {
        const [x, y] = clampIn(at(tg.x, tg.y), 4), r = 3 + (reduce() ? 0 : (Math.sin(t * 6) + 1) * 1.2);
        g.fillStyle = C.pin; g.strokeStyle = C['mm-line']; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
      }
      const [cx, cy] = at(s.car.x, s.car.y);
      g.fillStyle = C[s.veh === 'scooter' ? 'scoot' : s.veh] || C.star; g.strokeStyle = C['mm-line']; g.lineWidth = 1.2;
      g.beginPath(); g.arc(cx, cy, 3.6, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(s.car.a) * 6, cy + Math.sin(s.car.a) * 6); g.stroke();
      // attribuzione nell'angolo della minimappa
      g.font = '700 8px "M PLUS Rounded 1c", sans-serif'; g.textAlign = 'right'; g.textBaseline = 'bottom';
      g.fillStyle = C.mm; g.globalAlpha = 0.85; g.fillRect(x0 + mw - g.measureText('© OpenStreetMap').width - 6, y0 + mh - 11, mw, 11); g.globalAlpha = 1;
      g.fillStyle = C['mm-line']; g.fillText('© OpenStreetMap', x0 + mw - 3, y0 + mh - 1.5);
      g.restore();
      g.strokeStyle = C['mm-line']; g.globalAlpha = 0.6; g.lineWidth = 1.5; rr(x0 - 3, y0 - 3, mw + 6, mh + 6, 9); g.stroke(); g.globalAlpha = 1;
    }
    // minimappa nascosta: pulsantino a forma di cartina
    function drawMini0() {
      g.fillStyle = C.mm; g.strokeStyle = C['mm-line']; g.lineWidth = 1.5;
      rr(W - 34, 8, 26, 22, 7); g.fill(); g.stroke();
      g.strokeStyle = C['mm-line']; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(W - 29, 13); g.lineTo(W - 23, 15); g.lineTo(W - 18, 13); g.lineTo(W - 13, 15); g.lineTo(W - 13, 25); g.lineTo(W - 18, 23); g.lineTo(W - 23, 25); g.lineTo(W - 29, 23); g.closePath(); g.stroke();
      mmRect = { x: W - 34, y: 8, w: 26, h: 22 };
    }
    // cartello della via (o del luogo notevole) vicino a Hari: dati OSM, non tradotti
    function updateStreet(now) {
      if (!streetEl || now - streetAt < 400) return;
      streetAt = now;
      const c = s.car, O = osmPrep();
      let name = '';
      let bl = 4.5;
      for (const p of O.labels) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bl) { bl = d; name = p.name; } }
      if (!name) {
        let bd = 2.6;
        for (const e of edgesIn(c.x - 3, c.y - 3, c.x + 3, c.y + 3)) {
          if (!e.name) continue;
          for (let i = 1; i < e.pts.length; i++) {
            const [ax, ay] = e.pts[i - 1], [bx, by] = e.pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
            const u = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.y - ay) * dy) / L2)), d = Math.hypot(c.x - ax - u * dx, c.y - ay - u * dy);
            if (d < bd) { bd = d; name = e.name; }
          }
        }
      }
      if (name === streetKey) return;
      streetKey = name;
      if (name) streetEl.querySelector('span').textContent = name;
      streetEl.hidden = !name;
    }

    /* ---------- selettore delle mappe ---------- */
    function previewCanvas(m) {
      const cv2 = document.createElement('canvas'), pv = m.preview, k = 3;
      cv2.width = pv.w * k; cv2.height = pv.h * k;
      const b = cv2.getContext('2d'), A = P.AR;
      const col = { [A.LAND]: C['mm-bld'], [A.PARK]: C['grass-2'], [A.FIELD]: C.field, [A.SAND]: C.sand, [A.WATER]: C.sea, [A.PLAZA]: C.walk, [A.PIER]: C.wood, [A.PARKING]: C.parking, [A.RAIL]: C.rail, 9: C.road };
      const bytes = G.atob ? G.atob(pv.rle) : '';
      let i = 0, n = 0;
      const u = () => { let v = 0, mm = 1, ch; do { ch = bytes.charCodeAt(i++); v += (ch & 127) * mm; mm *= 128; } while (ch & 128); return v; };
      while (i < bytes.length && n < pv.w * pv.h) { const v = u(), c = v % 16, len = Math.floor(v / 16); b.fillStyle = col[c] || C.grass; for (let q = 0; q < len; q++, n++) b.fillRect((n % pv.w) * k, Math.floor(n / pv.w) * k, k, k); }
      return cv2;
    }
    function showMaps(first, err) {
      if (mapsEl) mapsEl.remove();
      const stageEl = el.querySelector('.dr-stage') || el;
      const cur = s ? s.mapId || 'hari' : curMap();
      mapsEl = document.createElement('div');
      mapsEl.className = 'dr-maps';
      mapsEl.setAttribute('role', 'dialog');
      mapsEl.setAttribute('aria-label', L('dr_maps'));
      mapsEl.innerHTML = `<div class="dr-maps-box">
        <div class="dr-maps-head"><b>${L('dr_maps')}</b>${first ? '' : `<button class="dr-maps-x" type="button" aria-label="${L('er_close')}">✕</button>`}</div>
        ${err ? `<p class="dr-maps-err">${L('dr_map_err')}</p>` : ''}
        <div class="dr-maps-list">${mapList().map((m) => {
          const lv = HH.progress && HH.progress.get ? HH.progress.get(slotOf(m.id)).level : 1;
          return `<button class="dr-map-card${m.id === cur ? ' on' : ''}" type="button" data-map="${m.id}">
            <span class="dr-map-art">${m.id === 'hari' ? cityArt('') : ''}</span>
            <b>${esc(mapName(m.id))}</b><small>${L('level')} ${lv}</small>${m.id === 'hari' ? '' : `<i>${(m.W * m.m / 1000).toFixed(1)}×${(m.H * m.m / 1000).toFixed(1)} km</i>`}</button>`;
        }).join('')}</div>
        <p class="dr-maps-osm">${L('dr_map_real')} · ${OSM_ATTR}</p></div>`;
      mapList().forEach((m) => { if (m.id !== 'hari' && m.preview) mapsEl.querySelector(`[data-map="${m.id}"] .dr-map-art`).appendChild(previewCanvas(m)); });
      stageEl.appendChild(mapsEl);
      const x = mapsEl.querySelector('.dr-maps-x');
      if (x) x.onclick = (e) => { e.stopPropagation(); sfx('tap'); mapsEl.remove(); mapsEl = null; };
      mapsEl.onpointerdown = (e) => e.stopPropagation();
      mapsEl.querySelectorAll('[data-map]').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); sfx('tap'); pickMap(bt.dataset.map, first); }; });
      const on = mapsEl.querySelector('.dr-map-card.on') || mapsEl.querySelector('.dr-map-card');
      if (on) on.focus({ preventScroll: true });
    }
    function pickMap(id, first) {
      storeSet('drive:mapSeen', 1);
      const was = s ? s.mapId || 'hari' : null;
      if (mapsEl) { mapsEl.remove(); mapsEl = null; }
      if (was === id) { if (paused) resume(); return; }
      // un'altra mappa = altri livelli e altra partita: l'app salva questa e riapre il gioco sulla nuova
      if (ctx.reslot && slotOf(id) !== slotOf(curMap())) { ctx.reslot(() => storeSet('drive:map', id)); return; }
      storeSet('drive:map', id);
      startMap(id, null);
    }
    function loadingView(on) {
      let lv = el.querySelector('.dr-loadmap');
      if (!on) { if (lv) lv.remove(); return; }
      if (!lv) {
        lv = document.createElement('div'); lv.className = 'dr-loadmap';
        lv.innerHTML = `${svgIc(HARI('taxi', 'joy'))}<span>${L('dr_loading')}</span>`;
        (el.querySelector('.dr-stage') || el).appendChild(lv);
      }
    }
    // avvia la mappa id (scaricandone i dati se serve) con lo stato salvato oppure un livello nuovo
    function startMap(id, st, held = false) {
      if (id !== 'hari' && !(HH.driveMaps && HH.driveMaps[id])) {
        if (!el.querySelector('.dr-wrap')) el.innerHTML = '<div class="dr-wrap" dir="ltr"><div class="dr-stage"></div></div>';
        loadingView(true);
        loadMap(id).then(() => { loadingView(false); startMap(id, st); }).catch(() => {
          loadingView(false);
          storeSet('drive:map', 'hari');
          showMaps(true, true);
        });
        return;
      }
      if (st && (st.mapId || 'hari') === id && okSaved(st)) begin(Object.assign({}, st), true);
      else { begin(P.newLevel(ctx.level, Math.random, id), held); ctx.changed({ reset: true }); }
    }
    function drawJoy() {
      if (!joy) return;
      const R = joyR(), dx = joy.x - joy.x0, dy = joy.y - joy.y0, d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
      g.fillStyle = C.joy; g.strokeStyle = C['joy-2']; g.lineWidth = 2.5;
      g.beginPath(); g.arc(joy.x0, joy.y0, R, 0, 7); g.fill(); g.stroke();
      g.fillStyle = C['joy-2']; g.beginPath(); g.arc(joy.x0 + dx * k, joy.y0 + dy * k, R * 0.42, 0, 7); g.fill();
    }
    const joyR = () => Math.max(38, Math.min(60, W * 0.13));

    /* ---------- particelle (coordinate del mondo) ---------- */
    function puff(x, y, n = 6, sc = 1) {
      if (reduce()) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; parts.push({ ty: 'puff', x, y, vx: Math.cos(a) * 0.9 * sc, vy: Math.sin(a) * 0.9 * sc - 0.2, r: (0.14 + (i % 3) * 0.06) * sc, t0: t, life: 0.55 }); }
    }
    function stars(x, y, n = 6, col) {
      if (reduce()) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, v = 1.2 + Math.random() * 1.3; parts.push({ ty: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, r: 0.12, t0: t, life: 0.7, col }); }
    }
    function hearts(x, y, n = 3) {
      if (reduce()) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) parts.push({ ty: 'heart', x: x + (i - (n - 1) / 2) * 0.22, y, vx: (i - (n - 1) / 2) * 0.4, vy: -1.4 - i * 0.2, r: 0.14, t0: t + i * 0.06, life: 1 });
    }
    function float(text, x, y, col, size = 20, life = 1.1) { parts.push({ ty: 'text', text, x, y, vx: 0, vy: -0.8, r: size, t0: performance.now() / 1000, life, col }); }
    function cloud(x, y) { parts.push({ ty: 'bonk', x, y, vx: 0, vy: -0.3, r: 0.42, t0: performance.now() / 1000, life: 0.7 }); }
    function heartPath(x, y, r) {
      g.beginPath();
      g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
      g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
      g.closePath();
    }
    function starPath(x, y, r) {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
      g.closePath();
    }
    function drawParts(t) {
      parts = parts.filter((p) => t - p.t0 < p.life);
      for (const p of parts) {
        const e = t - p.t0;
        if (e < 0) continue;
        const k = e / p.life, x = p.x + p.vx * e, y = p.y + p.vy * e + (p.ty === 'star' ? 2 * e * e : 0);
        g.globalAlpha = 1 - k * k;
        if (p.ty === 'puff') { g.fillStyle = C.puff; g.beginPath(); g.arc(x, y, p.r * (0.6 + k * 0.8), 0, 7); g.fill(); }
        else if (p.ty === 'star') { g.fillStyle = p.col || C.star; starPath(x, y, p.r * (1 - k * 0.4)); g.fill(); }
        else if (p.ty === 'heart') { g.fillStyle = C.heart; g.strokeStyle = C.ink; g.lineWidth = 0.025; heartPath(x + Math.sin(e * 9) * 0.06, y, p.r); g.fill(); g.stroke(); }
        else if (p.ty === 'bonk') {
          // nuvoletta "bonk" con stelline
          const r = p.r * (e < 0.12 ? 0.5 + e * 4 : 1);
          g.fillStyle = C.bonk; g.strokeStyle = C.ink; g.lineWidth = 0.04;
          g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.moveTo(x + Math.cos(a) * r * 0.75 + r * 0.32, y + Math.sin(a) * r * 0.65); g.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.65, r * 0.32, 0, 7); } g.fill();
          g.beginPath(); g.ellipse(x, y, r * 0.8, r * 0.66, 0, 0, 7); g.fill(); g.stroke();
          g.fillStyle = C.star; starPath(x - r * 0.25, y - r * 0.05, r * 0.24); g.fill(); starPath(x + r * 0.28, y + r * 0.08, r * 0.18); g.fill();
        } else if (p.ty === 'text') {
          const [sx, sy] = toS(x, y);
          screen();
          const sc = e < 0.15 ? 0.5 + (e / 0.15) * 0.7 : e < 0.3 ? 1.2 - ((e - 0.15) / 0.15) * 0.2 : 1, fs = p.r * sc;
          g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
          g.lineWidth = fs * 0.24; g.strokeStyle = C['text-line']; g.strokeText(p.text, sx, sy);
          g.fillStyle = p.col || C.text; g.fillText(p.text, sx, sy);
          world();
        }
      }
      g.globalAlpha = 1;
    }

    /* ---------- barra ---------- */
    function renderBar(force) {
      const tr = s.trip, ride = tr && tr.st === 'ride' ? tr.items : [];
      const live = ride.filter((i) => i.st === 1);
      const tmin = live.length ? Math.min(...live.map((i) => i.t)) : 0, lim = live.length ? live[0].lim : 1;
      const p = live.length ? Math.max(0, Math.min(1, tmin / lim)) : 0;
      const key = `${s.done}/${s.N}|${live.length}|${ride.map((i) => i.st).join('')}|${Math.round(p * 120)}`;
      if (!force && key === lastBar) return;
      const prevDone = lastBar.split('/')[0];
      lastBar = key;
      misEl.querySelector('b').textContent = `${s.done}/${s.N}`;
      if (prevDone !== '' && +prevDone !== s.done) { misEl.classList.remove('up'); void misEl.offsetWidth; misEl.classList.add('up'); }
      timeEl.classList.toggle('idle', !live.length);
      timeEl.classList.toggle('low', live.length > 0 && p < 0.25);
      timeEl.querySelector('.dr-fill').style.width = `${p * 100}%`;
      const ic = !live.length ? (s.type === 'taxi' ? pedSVG(P.PEDS[tr ? tr.items[0].who : 0], tr ? tr.items[0].who : 0, 0, '') : s.type === 'food' ? BAG : boxSVG('var(--dr-p1)')) : s.type === 'food' ? STEAM : CLOCK;
      const icKey = live.length ? 'live' : `idle${tr ? tr.id : 0}`;
      const icEl = timeEl.querySelector('.dr-ic');
      if (icEl.dataset.k !== icKey) { icEl.dataset.k = icKey; icEl.innerHTML = svgIc(ic); }
      // pacchi/ordini a bordo
      const items = tr ? tr.items : [];
      const lk = items.length > 1 ? items.map((i) => `${i.who}${i.st}`).join(',') : '';
      if (loadEl.dataset.k !== lk) {
        loadEl.dataset.k = lk;
        loadEl.innerHTML = items.length > 1 ? items.map((i) => `<i class="${i.st >= 2 ? 'done' : ''}">${svgIc(s.type === 'parcel' ? boxSVG(BOXC[i.who % 4]) : DISH[P.DISHES[i.who]])}</i>`).join('') : '';
      }
    }
    function say(text, cls = '', ms = 900) {
      msg.innerHTML = `<b class="${cls}">${text}</b>`;
      msg.classList.remove('show'); void msg.offsetWidth; msg.classList.add('show');
      clearTimeout(goTimer);
      goTimer = later(() => { msg.classList.remove('show'); }, ms);
    }
    function ready() {
      msg.innerHTML = `<b class="ready">${L('pa_ready')}</b>`;
      msg.classList.remove('show'); void msg.offsetWidth; msg.classList.add('show');
      clearTimeout(goTimer);
      ctx.sfx.blip();
    }
    function changed(force) {
      const now = performance.now();
      if (!force && now - lastChanged < 900) return;
      lastChanged = now;
      ctx.changed();
    }
    const sfx = (k, ...a) => { if (ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };

    /* ---------- eventi della logica ---------- */
    function onEvent(e, t) {
      const c = s.car;
      switch (e.type) {
        case 'go': {
          say(L('pa_go'), 'go', 650); sfx('milestone');
          if (s.t < 0.5) later(() => { if (!paused && !P.isOver(s)) say(L('dr_m_' + s.type), 'mission', 2200); }, 700);
          if (s.wait) later(() => { if (s.wait && !paused) say(L('dr_start'), 'hint', 2600); }, 3000);
          break;
        }
        case 'pickup': {
          const tr = s.trip, p = g0.spots[tr.p];
          if (s.type === 'taxi') ghosts.push({ name: `p${tr.items[0].who}j`, x0: p.x, y0: p.y - 0.28, x1: c.x, y1: c.y - 0.2, arc: 0.6, t0: t, dur: 0.45, size: 0.8 });
          else tr.items.forEach((it, i) => ghosts.push({ name: s.type === 'food' ? 'bag' : `box${it.who}`, x0: p.x, y0: p.y - 0.15, x1: c.x, y1: c.y, arc: 0.7, t0: t + i * 0.08, dur: 0.45, size: 0.5 }));
          hearts(p.x, p.y - 0.6, 2); sfx('place');
          renderBar(true); changed(true);
          break;
        }
        case 'drop': {
          const name = s.type === 'taxi' ? `p${e.who}j` : s.type === 'food' ? `d_${P.DISHES[e.who]}` : `box${e.who}`;
          ghosts.push({ name, x0: c.x, y0: c.y - 0.2, x1: e.x, y1: e.y - 0.3, arc: 0.7, t0: t, dur: 0.5, size: s.type === 'taxi' ? 0.8 : 0.5 });
          later(() => { hearts(e.x, e.y - 0.7, 3); stars(e.x, e.y - 0.5, 6, C.star); }, 450);
          float(L('dr_thanks'), e.x, e.y - 1.1, C.star, 20, 1.3);
          sfx('cupDone'); if (ctx.react) ctx.react('happy');
          renderBar(true); changed(true);
          break;
        }
        case 'expire': {
          // consegna scaduta: il passeggero scende imbronciato / il cibo si è raffreddato
          if (s.type === 'taxi') ghosts.push({ name: `p${e.who}o`, x0: c.x, y0: c.y - 0.2, x1: c.x + 0.6, y1: c.y - 0.9, arc: 0.4, t0: t, dur: 0.8, size: 0.7 });
          else { puff(c.x, c.y - 0.3, 7, 0.9); stars(c.x, c.y - 0.4, 5, C.cold); }
          float(L('dr_late'), c.x, c.y - 1, C.cold, 22, 1.3);
          ctx.mistake(e.left);
          renderBar(true); changed(true);
          break;
        }
        case 'crash': {
          if (e.what === 'car') { cloud(e.x, e.y - 0.15); stars(e.x, e.y, 7); sfx('boing'); }
          else { stars(e.x, e.y - 0.4, 7); puff(e.x, e.y, 5, 0.6); }
          shake = 0.35;
          if (!reduce()) { stage.classList.remove('wobble'); void stage.offsetWidth; stage.classList.add('wobble'); }
          ctx.mistake(e.left);
          changed(true);
          break;
        }
        case 'bonk': cloud(e.x, e.y - 0.1); sfx('boing'); break;
        case 'shoo': stars(e.x, e.y - 0.4, 4); sfx('tap'); break;
        case 'bump': puff(e.x, e.y, 4, 0.5); sfx('set'); break;
        case 'honk': if (t - sndHonk > 2.5) { sndHonk = t; sfx('honk'); } break;
        case 'trip': renderBar(true); break;
        case 'lose': over = performance.now(); break;
        case 'win': {
          party = performance.now();
          for (let i = 0; i < 4; i++) later(() => { hearts(s.car.x + (Math.random() - 0.5), s.car.y - 0.6, 3); stars(s.car.x, s.car.y - 0.4, 6, C.star); }, i * 200);
          sfx('cupDone');
          renderBar(true);
          ctx.changed();
          later(() => ctx.win(), 1400);
          break;
        }
        default: break;
      }
    }

    /* ---------- ciclo ---------- */
    function input() {
      const k = keys;
      if (k.u || k.d || k.l || k.r) return { steer: (k.r ? 1 : 0) - (k.l ? 1 : 0), gas: (k.u ? 1 : 0) - (k.d ? 1 : 0) };
      if (joy) {
        const R = joyR(), dx = (joy.x - joy.x0) / R, dy = (joy.y - joy.y0) / R, m = Math.hypot(dx, dy);
        if (m < 0.2) return { ax: 0, ay: 0 };
        return { ax: dx / Math.max(1, m), ay: dy / Math.max(1, m) };
      }
      return null;
    }
    function loop(now) {
      if (!el.isConnected) { stop(); detach(); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const t = now / 1000;
      if (now - themeAt > 1000) { themeAt = now; theme(false); }   // tema cambiato dal sistema: controllo leggero, 1 volta al secondo
      if (!paused && dt > 0 && !P.isOver(s)) {
        const ev = P.step(s, dt, input());
        ev.forEach((e) => onEvent(e, t));
        renderBar(false);
        changed(false);
      }
      if (shake > 0) shake = Math.max(0, shake - dt);
      // camera: segue il veicolo con un po' di anticipo
      const c = s.car, lead = Math.min(2.2, Math.abs(c.v) * 0.45) * Math.sign(c.v || 1);
      const tx = peekPt ? peekPt.x : c.x + Math.cos(c.a) * lead, ty = peekPt ? peekPt.y : c.y + Math.sin(c.a) * lead, k = dt > 0 ? 1 - Math.exp(-dt * 5) : 1;
      camX += (tx - camX) * k; camY += (ty - camY) * k;
      clampCam();
      draw(now);
      if (streetEl) updateStreet(now);
      const live = !paused && (!P.isOver(s) || (party && now - party < 1600) || (over && now - over < 1200));
      raf = live ? requestAnimationFrame(loop) : 0;
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function pause() {
      if (paused || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = false;
      pauseBtn.innerHTML = PLAY;
      joy = null; keys = {};
      stop();
      draw(performance.now());
      ctx.changed();
    }
    function resume() {
      if (!paused || P.isOver(s)) return;
      paused = false;
      pauseEl.hidden = true;
      pauseBtn.innerHTML = PAUSE;
      // un attimo per rimettere il dito sulla città
      if (s.ready <= 0) s.ready = P.READY * 0.7;
      s.wait = true; s.inp = null;
      ready();
      sfx('set');
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    /* ---------- controlli ---------- */
    const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.onpointerdown = (e) => {
      if (e.target.closest('.dr-pbtn')) { e.preventDefault(); toggle(); return; }
      if (e.target.closest('.dr-mbtn')) { e.preventDefault(); if (!paused && !P.isOver(s)) pause(); sfx('tap'); showMaps(false); return; }
      if (e.target.closest('.dr-maps')) return;
      if (!e.target.closest('.dr-stage')) return;
      e.preventDefault();
      if (paused) { resume(); return; }
      if (P.isOver(s)) return;
      const [x, y] = local(e);
      if (mmRect && x >= mmRect.x - 4 && x <= mmRect.x + mmRect.w + 4 && y >= mmRect.y - 4 && y <= mmRect.y + mmRect.h + 4) {
        showMap = !showMap;
        try { if (HH.store && HH.store.set) HH.store.set('drive:nomap', !showMap); } catch (err) { /* niente salvataggio */ }
        sfx('tap'); draw(performance.now());
        return;
      }
      joy = { id: e.pointerId, x0: x, y0: y, x, y };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ }
      if (!raf) draw(performance.now());
    };
    el.onpointermove = (e) => {
      if (!joy || e.pointerId !== joy.id) return;
      const [x, y] = local(e);
      joy.x = x; joy.y = y;
      // la levetta "insegue" il dito se va troppo lontano: tornare indietro risponde subito
      const R = joyR(), dx = x - joy.x0, dy = y - joy.y0, d = Math.hypot(dx, dy);
      if (d > R * 1.6) { joy.x0 = x - (dx / d) * R * 1.6; joy.y0 = y - (dy / d) * R * 1.6; }
    };
    el.onpointerup = el.onpointercancel = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
    el.oncontextmenu = (e) => { if (e.target.closest('.dr-stage')) e.preventDefault(); };

    function onKey(e) {
      if (!el.isConnected) { detach(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key in KEYS) {
        e.preventDefault();
        if (P.isOver(s)) return;
        if (paused) { resume(); return; }
        keys[KEYS[e.key]] = true;
        return;
      }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (e.key === ' ' && e.target && e.target.closest && e.target.closest('button') && !e.target.closest('.dr-wrap')) return;
        e.preventDefault(); if (e.key === 'Escape') pause(); else toggle();
      }
    }
    function onKeyUp(e) { if (e.key in KEYS) keys[KEYS[e.key]] = false; }
    function onVis() { if (!el.isConnected) { detach(); return; } if (document.hidden) pause(); }
    function onTheme() { if (!el.isConnected) { detach(); return; } theme(false); draw(performance.now()); }
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function detach() {
      G.removeEventListener('keydown', onKey);
      G.removeEventListener('keyup', onKeyUp);
      G.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._drRO) { el._drRO.disconnect(); el._drRO = null; }
      clearTimers();
    }
    function onBlur() { keys = {}; joy = null; }
    if (el._drDetach) el._drDetach();
    el._drDetach = detach;
    G.addEventListener('keydown', onKey);
    G.addEventListener('keyup', onKeyUp);
    G.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop();
      s = state;
      s.waitMode = true; s.wait = true; s.inp = null;       // parte al primo tocco/freccia, mai da sola
      paused = false; joy = null; keys = {};
      build();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; pauseBtn.innerHTML = PLAY; later(() => draw(performance.now()), 150); later(() => draw(performance.now()), 600); return; }
      ready();
      start();
      // le bitmap si cuociono in modo asincrono: un paio di ridisegni anche da fermi
      later(() => { if (!raf) draw(performance.now()); }, 150);
    }
    function fresh() { const id = s ? s.mapId || 'hari' : curMap(); begin(P.newLevel(ctx.level, Math.random, id)); ctx.changed({ reset: true }); }
    // salvataggio valido: città di Hari con la mappa nello stato, oppure mappa reale (solo l'id) con le stesse misure
    function okSaved(st) {
      if (!st || st.v !== 1 || !Array.isArray(st.npcs) || !st.car || !(st.N > 0) || P.isOver(st)) return false;
      if (st.mapId && st.mapId !== 'hari') { const md = P.mapData(st.mapId); return !!md && md.W === st.W && md.H === st.H; }
      return typeof st.map === 'string' && st.map.length === st.W * st.H;
    }

    // per i controlli di qualità (Playwright): stato vivo della partita, geometria, scelta della mappa
    // peek(x, y): la camera guarda un punto (per le foto dei luoghi notevoli lontani dalla strada), peek() torna su Hari
    el._drive = { state: () => s, geo: () => g0, maps: () => showMaps(false), pick: (id) => pickMap(id, false), peek: (x, y) => { peekPt = x == null ? null : { x, y }; } };
    {
      // la mappa del salvataggio (i vecchi salvataggi, senza mapId, sono della città di Hari)
      const id = saved && saved.mapId ? saved.mapId : curMap();
      const first = !storeGet('drive:mapSeen', 0);
      // prima volta con le mappe: la partita (città di Hari) parte in pausa e sopra c'è il selettore, già sulla città di Hari
      startMap(id, saved, first);
      if (first) { storeSet('drive:mapSeen', 1); if (s) showMaps(true); }
    }

    return {
      fresh,
      restart() { begin(P.newLevel(s.level, Math.random, s.mapId)); ctx.changed({ reset: true }); },
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },          // usato dall'app quando si apre il tutorial
      resume() { resume(); },
      snapshot: () => s,
    };
  }
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
  HH.games.push({
    id: 'drive', name: 'Hari Taxi', rules: 'r13',
    rulesEn: 'Drive Hari around the city seen from above: pick up passengers with the taxi, deliver hot food by scooter and parcels by van before time runs out. Every bump into a car or an animal crossing the street costs a heart!',
    art, create, lives: 3,
    tutorial: TUT,
    // progressi e salvataggio per mappa: la città di Hari resta su 'drive' (vecchi salvataggi compresi)
    slot: () => slotOf(curMap()),
    // (s assente solo per un attimo: mappa reale ancora in download)
    rate: (s) => (s ? HH.drive.rate(s) : 0),
    parTime: (s) => (s ? HH.drive.par(s) : 0),
    progress: (s) => (s ? HH.drive.progress(s) : 0),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
