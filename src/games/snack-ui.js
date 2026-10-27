/* Hari Snack Rush — interfaccia.
 * Sentiero in pseudo-prospettiva su un solo <canvas> (60 fps anche con decine di oggetti): cielo, montagne e colline
 * dipinte una volta su un canvas fuori schermo; sentiero a fasce che scorre, prato, sakura e lanterne ai bordi;
 * animali affamati, porte, animalone goloso, merende in volo e bolle/foglie ordinati per profondità e scalati con la distanza.
 * Nessuna violenza: gli animali mangiano, si saziano e tornano a casa saltellando; l'animalone sazio si addormenta.
 * I personaggi sono SVG in stile cel (contorni sottili, un'ombra netta, riflessi) "cotti" in bitmap all'avvio:
 * i colori arrivano dai token CSS --sr-* letti con getComputedStyle (tema chiaro/scuro), mai scritti qui.
 *
 * Controlli: trascina a destra/sinistra sul sentiero (movimento relativo, il dito non copre Hari), frecce/A-D.
 * Spazio/P o il tasto pausa = pausa; "Annulla" = pausa/riprendi. Si parte al primo trascinamento/freccia.
 * La partita va in pausa da sola se la pagina viene nascosta; ripresa da salvataggio = in pausa, tocca per ripartire.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    sr_start: 'Drag left or right to start!', sr_boss: 'Here comes a big eater!', sr_power: 'Snacks per toss', sr_max: 'Max!',
    sr_board: 'Path: drag left or right to move Hari', sr_snatch: 'Snack snatched!', sr_boop: 'Boop!',
    // già tradotte (Hari Parade)
    pa_ready: 'Ready?', pa_go: 'Go!', pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_pause: 'Pause',
  };
  const L = (k) => label(k, EN[k]);

  /* ---------- disegni cel (viewBox 100×100, piedi in basso al centro; colori solo da token --sr-*) ---------- */
  const o = (w = 2) => `stroke="var(--sr-ink)" stroke-width="${(w * 0.8).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"`;
  const hi = (d, w = 2.6, op = 0.8) => `<path d="${d}" fill="none" stroke="var(--sr-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const f1 = (n) => +n.toFixed(1);
  function quills(cx, cy, r, len, a0, a1, n) {
    const pt = (a, rr) => `${f1(cx + rr * Math.cos(a * Math.PI / 180))} ${f1(cy + rr * Math.sin(a * Math.PI / 180))}`;
    const st = (a1 - a0) / n;
    let d = `M${cx} ${cy}L${pt(a0, r)}`;
    for (let k = 0; k < n; k++) d += `L${pt(a0 + st * (k + 0.5), r + len * (0.85 + 0.15 * ((k * 7) % 3) / 2))}L${pt(a0 + st * (k + 1), r)}`;
    return `${d}Z`;
  }
  // nuvola di cerchi con un solo contorno (lana, chiome, cespugli): prima i cerchi col bordo, poi senza
  const puffy = (cs, fill, w = 2) => cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${o(w)}/>`).join('') + cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${f1(r - w * 0.45)}" fill="${fill}"/>`).join('');
  const eye = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--sr-eye)"/>
    <ellipse cx="${cx}" cy="${f1(cy + ry * 0.42)}" rx="${f1(rx * 0.7)}" ry="${f1(ry * 0.4)}" fill="var(--sr-iris)"/>
    <circle cx="${f1(cx + rx * 0.32)}" cy="${f1(cy - ry * 0.36)}" r="${f1(rx * 0.46)}" fill="var(--sr-hi)"/>
    <circle cx="${f1(cx - rx * 0.36)}" cy="${f1(cy + ry * 0.42)}" r="${f1(rx * 0.2)}" fill="var(--sr-hi)"/>`;
  const blush = (cx, cy, rx, ry) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="var(--sr-blush)"/>`;
  // occhi + guance + bocca. mood: '' | 'joy' | 'oops' | 'sleep'
  function face(cx, cy, sp, mood, k = 1, mouth = true) {
    const L0 = cx - sp, R0 = cx + sp, w = 5 * k;
    let e;
    if (mood === 'joy') e = [L0, R0].map((x) => `<path d="M${f1(x - w)} ${f1(cy + 1)}Q${x} ${f1(cy - w * 1.2)} ${f1(x + w)} ${f1(cy + 1)}" fill="none" stroke="var(--sr-eye)" stroke-width="${f1(2.6 * k)}" stroke-linecap="round"/>`).join('');
    else if (mood === 'oops') e = `<path d="M${f1(L0 - w)} ${f1(cy - w * 0.8)}l${f1(w * 1.7)} ${f1(w * 0.8)}l${f1(-w * 1.7)} ${f1(w * 0.8)}M${f1(R0 + w)} ${f1(cy - w * 0.8)}l${f1(-w * 1.7)} ${f1(w * 0.8)}l${f1(w * 1.7)} ${f1(w * 0.8)}" fill="none" stroke="var(--sr-eye)" stroke-width="${f1(2.6 * k)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else if (mood === 'sleep') e = [L0, R0].map((x) => `<path d="M${f1(x - w)} ${f1(cy - 1)}Q${x} ${f1(cy + w * 1.1)} ${f1(x + w)} ${f1(cy - 1)}" fill="none" stroke="var(--sr-eye)" stroke-width="${f1(2.6 * k)}" stroke-linecap="round"/>`).join('');
    else e = eye(L0, cy, f1(4.6 * k), f1(5.8 * k)) + eye(R0, cy, f1(4.6 * k), f1(5.8 * k));
    const b = blush(L0 - 6 * k, cy + 7 * k, 5 * k, 3 * k) + blush(R0 + 6 * k, cy + 7 * k, 5 * k, 3 * k);
    let m = '';
    if (mouth) {
      const y = cy + 8 * k;
      m = mood === 'joy' ? `<path d="M${f1(cx - 4 * k)} ${f1(y)}q${f1(4 * k)} ${f1(7 * k)} ${f1(8 * k)} 0z" fill="var(--sr-mouth)" stroke="var(--sr-nose)" stroke-width="${f1(1.4 * k)}" stroke-linejoin="round"/>`
        : mood === 'oops' ? `<ellipse cx="${cx}" cy="${f1(y + 1.5 * k)}" rx="${f1(2.4 * k)}" ry="${f1(2.8 * k)}" fill="var(--sr-mouth)" stroke="var(--sr-nose)" stroke-width="${f1(1.2 * k)}"/>`
          : `<path d="M${f1(cx - 3.6 * k)} ${f1(y)}q${f1(1.8 * k)} ${f1(2.4 * k)} ${f1(3.6 * k)} 0q${f1(1.8 * k)} ${f1(2.4 * k)} ${f1(3.6 * k)} 0" fill="none" stroke="var(--sr-nose)" stroke-width="${f1(1.6 * k)}" stroke-linecap="round"/>`;
    }
    return e + b + m;
  }
  const feet = (fr, fill, x1, x2, w = 8) => `<ellipse cx="${x1}" cy="${fr ? 91 : 88}" rx="${w}" ry="5" fill="${fill}" ${o(1.8)}/><ellipse cx="${x2}" cy="${fr ? 88 : 91}" rx="${w}" ry="5" fill="${fill}" ${o(1.8)}/>`;
  const sakura = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="${-r}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.9)}" transform="rotate(${a})" fill="var(--sr-sakura)" stroke="var(--sr-ink)" stroke-width=".9"/>`).join('')}<circle r="${f1(r * 0.42)}" fill="var(--sr-sakura-in)"/></g>`;

  /* animali che arrivano (di fronte). fr = passo 0/1 */
  const ANIMAL = {
    chick: (fr, m) => `${feet(fr, 'var(--sr-feet)', 40, 60, 7)}
      <path d="M44 35C42 26 49 22 51 29C53 22 61 24 57 33" fill="var(--sr-chick)" ${o(1.8)}/>
      <ellipse cx="50" cy="62" rx="31" ry="30" fill="var(--sr-chick)" ${o(2.2)}/>
      <path d="M80 58a31 30 0 0 1-50 26 34 32 0 0 0 50-26z" fill="var(--sr-chick-2)"/>
      <path d="M21 56c-10 3-11 15-3 19 6-2 8-9 6-17z" fill="var(--sr-chick-2)" ${o(1.7)} transform="rotate(${fr ? -8 : 6} 22 60)"/>
      <path d="M79 56c10 3 11 15 3 19-6-2-8-9-6-17z" fill="var(--sr-chick-2)" ${o(1.7)} transform="rotate(${fr ? -6 : 8} 78 60)"/>
      ${face(50, 57, 11, m, 1, false)}
      ${m === 'joy' ? `<path d="M44 65l6-3 6 3-6 6z" fill="var(--sr-beak)" ${o(1.5)}/><path d="M44 65h12" ${o(1.2)}/>` : `<path d="M45 64l5-3 5 3-5 5z" fill="var(--sr-beak)" ${o(1.5)}/>`}
      ${hi('M28 50q4-12 16-16')}`,
    bunny: (fr, m) => `<g transform="rotate(${fr ? -4 : 4} 50 46)">
        <ellipse cx="38" cy="25" rx="8" ry="21" transform="rotate(-12 38 25)" fill="var(--sr-bunny)" ${o(2)}/><ellipse cx="38" cy="28" rx="4" ry="14" transform="rotate(-12 38 28)" fill="var(--sr-bunny-in)"/>
        <ellipse cx="62" cy="25" rx="8" ry="21" transform="rotate(12 62 25)" fill="var(--sr-bunny)" ${o(2)}/><ellipse cx="62" cy="28" rx="4" ry="14" transform="rotate(12 62 28)" fill="var(--sr-bunny-in)"/></g>
      ${feet(fr, 'var(--sr-bunny)', 38, 62, 9)}
      <ellipse cx="50" cy="64" rx="29" ry="27" fill="var(--sr-bunny)" ${o(2.2)}/>
      <path d="M78 60a29 27 0 0 1-46 24 32 29 0 0 0 46-24z" fill="var(--sr-bunny-2)"/>
      ${face(50, 61, 11, m)}
      <path d="M47.5 66h5l-2.5 2.6z" fill="var(--sr-bunny-in)" ${o(1)}/>
      <ellipse cx="41" cy="80" rx="5" ry="4" fill="var(--sr-bunny)" ${o(1.6)}/><ellipse cx="59" cy="80" rx="5" ry="4" fill="var(--sr-bunny)" ${o(1.6)}/>
      ${hi('M28 56q3-12 14-16')}`,
    piggy: (fr, m) => `<path d="M25 42L22 18L43 32Z" fill="var(--sr-pig)" ${o(2)}/><path d="M27 37L26 24L37 32Z" fill="var(--sr-pig-2)"/>
      <path d="M75 42L78 18L57 32Z" fill="var(--sr-pig)" ${o(2)}/><path d="M73 37L74 24L63 32Z" fill="var(--sr-pig-2)"/>
      ${feet(fr, 'var(--sr-pig-2)', 36, 64, 8)}
      <ellipse cx="50" cy="62" rx="33" ry="30" fill="var(--sr-pig)" ${o(2.2)}/>
      <path d="M82 58a33 30 0 0 1-54 27 36 33 0 0 0 54-27z" fill="var(--sr-pig-2)" opacity=".75"/>
      ${face(50, 53, 13, m, 1, false)}
      <ellipse cx="50" cy="68" rx="10.5" ry="7.5" fill="var(--sr-snout)" ${o(1.8)}/><ellipse cx="46.5" cy="68" rx="1.8" ry="2.7" fill="var(--sr-pig-2)"/><ellipse cx="53.5" cy="68" rx="1.8" ry="2.7" fill="var(--sr-pig-2)"/>
      ${m === 'joy' ? '<path d="M45 78q5 6 10 0z" fill="var(--sr-mouth)" stroke="var(--sr-nose)" stroke-width="1.3"/>' : '<path d="M46 78q4 3 8 0" fill="none" stroke="var(--sr-nose)" stroke-width="1.5" stroke-linecap="round"/>'}
      ${hi('M26 52q3-13 16-18')}`,
    bear: (fr, m) => `<circle cx="24" cy="33" r="11" fill="var(--sr-bear)" ${o(2)}/><circle cx="24" cy="34" r="6" fill="var(--sr-muzzle)"/>
      <circle cx="76" cy="33" r="11" fill="var(--sr-bear)" ${o(2)}/><circle cx="76" cy="34" r="6" fill="var(--sr-muzzle)"/>
      ${feet(fr, 'var(--sr-bear-2)', 35, 65, 10)}
      <ellipse cx="50" cy="62" rx="35" ry="31" fill="var(--sr-bear)" ${o(2.2)}/>
      <path d="M84 58a35 31 0 0 1-58 28 38 34 0 0 0 58-28z" fill="var(--sr-bear-2)" opacity=".7"/>
      <ellipse cx="50" cy="71" rx="13" ry="9.5" fill="var(--sr-muzzle)" ${o(1.8)}/><ellipse cx="50" cy="67" rx="4.2" ry="3" fill="var(--sr-nose)"/>
      ${m === 'joy' ? '<path d="M46 72q4 6 8 0z" fill="var(--sr-mouth)" stroke="var(--sr-nose)" stroke-width="1.2"/>' : '<path d="M46.5 72q1.75 2.4 3.5 0q1.75 2.4 3.5 0" fill="none" stroke="var(--sr-nose)" stroke-width="1.5" stroke-linecap="round"/>'}
      ${face(50, 55, 14, m, 1.05, false)}
      ${hi('M24 54q3-14 17-19')}`,
    sheep: (fr, m) => `<rect x="34" y="${fr ? 80 : 84}" width="8" height="11" rx="3" fill="var(--sr-sheep-2)" ${o(1.6)}/><rect x="58" y="${fr ? 84 : 80}" width="8" height="11" rx="3" fill="var(--sr-sheep-2)" ${o(1.6)}/>
      ${puffy([[50, 36, 12], [33, 41, 12], [67, 41, 12], [24, 58, 12], [76, 58, 12], [29, 75, 12], [71, 75, 12], [50, 81, 13], [50, 58, 25]], 'var(--sr-wool)')}
      <path d="M78 64c2 8-3 16-12 19 7-5 10-11 9-19z" fill="var(--sr-wool-2)"/>
      <ellipse cx="29" cy="55" rx="8" ry="4.5" transform="rotate(-25 29 55)" fill="var(--sr-sheep-2)" ${o(1.6)}/><ellipse cx="71" cy="55" rx="8" ry="4.5" transform="rotate(25 71 55)" fill="var(--sr-sheep-2)" ${o(1.6)}/>
      <ellipse cx="50" cy="61" rx="16" ry="17" fill="var(--sr-sheep)" ${o(1.9)}/>
      ${puffy([[43, 45, 6], [51, 42, 7], [58, 46, 6]], 'var(--sr-wool)', 1.6)}
      ${face(50, 60, 7.5, m, 0.85)}
      ${hi('M30 40q6-8 14-9', 2.4, 0.9)}`,
  };

  /* ciò che soffia l'animalone: tutto innocuo e buffo (viewBox 100, centrato) */
  const DROP = {
    shell: `<path d="M16 52C16 30 32 18 50 18S84 30 84 52Z" fill="var(--sr-shell)" ${o(2.4)}/>
      <path d="M22 52h56c-2 10-14 16-28 16S24 62 22 52z" fill="var(--sr-shell-in)" ${o(2)}/>
      <path d="M30 46c2-10 8-18 14-20M50 44V22M70 46c-2-10-8-18-14-20" fill="none" stroke="var(--sr-shell-2)" stroke-width="2.4" stroke-linecap="round"/>${hi('M26 40q4-12 14-16', 3, 0.6)}`,
    bubble: `<circle cx="50" cy="50" r="34" fill="var(--sr-bubble)" stroke="var(--sr-bubble-2)" stroke-width="3"/>
      <path d="M28 40q6-14 20-18" fill="none" stroke="var(--sr-hi)" stroke-width="5" stroke-linecap="round"/><circle cx="66" cy="66" r="4" fill="var(--sr-hi)" opacity=".8"/>
      <path d="M70 30q6 6 8 14" fill="none" stroke="var(--sr-bubble-3)" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
    leaf: `<path d="M16 76C14 44 40 18 84 16C86 56 58 84 16 76Z" fill="var(--sr-leaf)" ${o(2.4)}/>
      <path d="M84 16C60 64 42 74 16 76" fill="none" stroke="var(--sr-leaf-2)" stroke-width="3" stroke-linecap="round"/>
      <path d="M40 60l-6-14M54 50l-4-16M66 38l-2-12" fill="none" stroke="var(--sr-leaf-2)" stroke-width="2" stroke-linecap="round"/>${hi('M26 56q4-18 22-30', 2.6, 0.6)}`,
    petal: `<path d="M50 88C24 70 18 40 34 16L50 28L66 16C82 40 76 70 50 88Z" fill="var(--sr-sakura)" ${o(2.4)}/>
      <path d="M50 84C66 70 72 48 64 26" fill="none" stroke="var(--sr-sakura-in)" stroke-width="3" stroke-linecap="round" opacity=".6"/>${hi('M36 30q-6 18 0 34', 3, 0.7)}`,
  };
  /* merende di Hari (viewBox 100, centrate) */
  const TREAT = {
    seed: `<path d="M50 12C74 26 78 64 50 90C22 64 26 26 50 12Z" fill="var(--sr-seed)" ${o(2.6)}/>
      <path d="M50 20V82M38 34q-5 24 5 46M62 34q5 24-5 46" fill="none" stroke="var(--sr-seed-2)" stroke-width="5" stroke-linecap="round"/>
      <path d="M74 50c0 18-10 32-24 40 18-4 26-22 24-40z" fill="var(--sr-seed-3)"/>${hi('M36 30q-6 14-4 26', 3.4, 0.8)}`,
    blueberry: `<circle cx="50" cy="54" r="34" fill="var(--sr-blue)" ${o(2.6)}/><path d="M82 52a34 34 0 0 1-52 28 37 37 0 0 0 52-28z" fill="var(--sr-blue-2)"/>
      <path d="M50 26l-6-8 2 9-9-1 8 5 5 3 5-3 8-5-9 1 2-9z" fill="var(--sr-blue-2)" ${o(1.8)}/>${hi('M28 50q4-14 16-18', 4, 0.8)}`,
    strawberry: `<path d="M50 92C26 82 14 60 18 44C21 32 35 28 50 33C65 28 79 32 82 44C86 60 74 82 50 92Z" fill="var(--sr-straw)" ${o(2.6)}/>
      ${[[32, 48], [44, 46], [58, 46], [70, 50], [36, 64], [64, 64], [50, 78]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="var(--sr-straw-seed)"/>`).join('')}
      <path d="M50 34L38 22L45 32L30 30L44 38L50 41L56 38L70 30L55 32L62 22Z" fill="var(--sr-green)" ${o(2)}/>${hi('M26 48q2-8 10-10', 4, 0.8)}`,
    cherry: `<path d="M34 62C40 40 48 26 60 12M66 58C66 40 64 26 60 12" fill="none" stroke="var(--sr-green-2)" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="32" cy="68" r="19" fill="var(--sr-cherry)" ${o(2.6)}/><circle cx="68" cy="64" r="19" fill="var(--sr-cherry)" ${o(2.6)}/>${hi('M22 62q2-7 8-8', 3.4)}${hi('M58 58q2-7 8-8', 3.4)}`,
    apple: `<path d="M50 34C38 22 14 28 14 54C14 78 32 92 50 88C68 92 86 78 86 54C86 28 62 22 50 34Z" fill="var(--sr-apple)" ${o(2.6)}/>
      <path d="M80 50C82 72 66 88 50 88 64 82 76 70 74 48z" fill="var(--sr-apple-2)"/>
      <path d="M50 34C50 26 52 18 56 12" fill="none" stroke="var(--sr-stem)" stroke-width="3.2" stroke-linecap="round"/><path d="M56 20C60 10 72 8 78 14C72 20 62 22 56 20Z" fill="var(--sr-green)" ${o(1.8)}/>${hi('M24 48q2-12 14-15', 4, 0.8)}`,
  };
  const COL = {
    squirrel: ['var(--sr-sq)', 'var(--sr-sq-2)', 'var(--sr-sq-belly)'],
    polar: ['var(--sr-po)', 'var(--sr-po-2)', 'var(--sr-po)'],
    owl: ['var(--sr-owl)', 'var(--sr-owl-2)', 'var(--sr-owl-belly)'],
    kitty: ['var(--sr-cat)', 'var(--sr-cat-2)', 'var(--sr-bunny)'],
  };
  /* animalone goloso: testone, pancione, bavaglino e coroncina.
   * mood: '' affamato (bocca aperta) · 'blow' soffia (guance gonfie) · 'yum' mastica felice · 'sleep' sazio, dorme */
  function boss(kind, m = '') {
    const [c1, c2, c3] = COL[kind];
    const behind = {
      squirrel: `<path d="M66 92C98 90 104 54 90 30C82 14 60 12 58 30C57 41 69 43 73 34C79 50 76 68 63 80Z" fill="${c1}" ${o(2.2)}/>
        <path d="M76 84C94 76 96 50 86 32" fill="none" stroke="${c3}" stroke-width="5" stroke-linecap="round"/><path d="M90 30c-6-8-18-12-26-6" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
      polar: '',
      owl: `<path d="M24 66c-14 4-18 18-12 26 8-2 14-10 16-22z" fill="${c2}" ${o(2)}/><path d="M76 66c14 4 18 18 12 26-8-2-14-10-16-22z" fill="${c2}" ${o(2)}/>`,
      kitty: `<path d="M70 88c18 2 26-10 22-24-2-8 6-12 8-8" fill="none" stroke="var(--sr-ink)" stroke-width="9" stroke-linecap="round"/><path d="M70 88c18 2 26-10 22-24-2-8 6-12 8-8" fill="none" stroke="${c1}" stroke-width="6.5" stroke-linecap="round"/>`,
    }[kind];
    const ears = {
      squirrel: `<path d="M22 38L18 8L42 26Z" fill="${c1}" ${o(2)}/><path d="M25 32L23 15L36 26Z" fill="${c3}"/><path d="M18 8l-4-6M18 8l2-7" ${o(2)}/>
        <path d="M78 38L82 8L58 26Z" fill="${c1}" ${o(2)}/><path d="M75 32L77 15L64 26Z" fill="${c3}"/><path d="M82 8l4-6M82 8l-2-7" ${o(2)}/>`,
      polar: `<circle cx="25" cy="25" r="9" fill="${c1}" ${o(2)}/><circle cx="25" cy="26" r="4.6" fill="${c2}"/><circle cx="75" cy="25" r="9" fill="${c1}" ${o(2)}/><circle cx="75" cy="26" r="4.6" fill="${c2}"/>`,
      owl: `<path d="M22 34L16 8L40 24Z" fill="${c1}" ${o(2)}/><path d="M78 34L84 8L60 24Z" fill="${c1}" ${o(2)}/>`,
      kitty: `<path d="M20 38L20 8L44 24Z" fill="${c1}" ${o(2)}/><path d="M24 32L24 16L36 25Z" fill="var(--sr-cat-in)"/><path d="M80 38L80 8L56 24Z" fill="${c1}" ${o(2)}/><path d="M76 32L76 16L64 25Z" fill="var(--sr-cat-in)"/>`,
    }[kind];
    const neck = {
      squirrel: '', owl: '',
      polar: `<path d="M24 64q26 10 52 0l2 6q-28 11-56 0z" fill="var(--sr-scarf)" ${o(1.8)}/>`,
      kitty: `<circle cx="50" cy="69" r="4.6" fill="var(--sr-bell)" ${o(1.6)}/>`,
    }[kind];
    // bavaglino col cuore: è pronto a mangiare
    const bib = `<path d="M33 66q17 7 34 0l-3 17q-14 7-28 0z" fill="var(--sr-bib)" ${o(1.8)}/>
      <path d="M36 82q14 7 28 0" fill="none" stroke="var(--sr-bib-2)" stroke-width="2.4" stroke-dasharray="1 3.4" stroke-linecap="round"/>
      <path d="M50 79c-5-3-7-5-7-8 0-2 1.6-3.4 3.4-3.4 1.6 0 2.8.9 3.6 2.1.8-1.2 2-2.1 3.6-2.1 1.8 0 3.4 1.4 3.4 3.4 0 3-2 5-7 8z" fill="var(--sr-heart)"/>`;
    const muzzle = {
      squirrel: `<ellipse cx="50" cy="57" rx="11" ry="7.5" fill="${c3}" ${o(1.6)}/><ellipse cx="50" cy="53.5" rx="3.4" ry="2.4" fill="var(--sr-nose)"/>`,
      polar: `<ellipse cx="50" cy="57" rx="12" ry="9" fill="${c1}" ${o(1.6)}/><ellipse cx="50" cy="53" rx="4.2" ry="3" fill="var(--sr-nose)"/>`,
      owl: `<path d="M45 52h10l-5 9z" fill="var(--sr-crown-2)" ${o(1.6)}/>`,
      kitty: `<path d="M47 53h6l-3 3z" fill="var(--sr-cat-in)" ${o(1)}/>
        <path d="M30 54l-12-2M30 58l-12 2M70 54l12-2M70 58l12 2" stroke="var(--sr-ink)" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`,
    }[kind];
    const ringEyes = kind === 'owl' ? `<circle cx="37" cy="44" r="12" fill="var(--sr-owl-eye)" ${o(1.8)}/><circle cx="63" cy="44" r="12" fill="var(--sr-owl-eye)" ${o(1.8)}/>` : '';
    const mouth = {
      '': `<path d="M43 61q7 10 14 0z" fill="var(--sr-mouth)" ${o(1.6)}/><path d="M46 65q4-3 8 0" fill="var(--sr-tongue)"/><path d="M56 63q2 4 0 6q-2-2 0-6z" fill="var(--sr-drool)" stroke="var(--sr-ink)" stroke-width=".8"/>`,
      blow: `<circle cx="50" cy="63" r="3.6" fill="var(--sr-mouth)" ${o(1.6)}/><circle cx="35" cy="56" r="7" fill="var(--sr-blush)"/><circle cx="65" cy="56" r="7" fill="var(--sr-blush)"/>`,
      yum: `<path d="M43 61q7 6 14 0" fill="none" stroke="var(--sr-nose)" stroke-width="2.2" stroke-linecap="round"/><path d="M58 58q4 1 5 4" fill="none" stroke="var(--sr-nose)" stroke-width="1.6" stroke-linecap="round"/>`,
      sleep: `<path d="M45 61q5 4 10 0" fill="none" stroke="var(--sr-nose)" stroke-width="2" stroke-linecap="round"/>`,
    }[m] || '';
    const belly = kind === 'owl'
      ? `<ellipse cx="50" cy="78" rx="17" ry="13" fill="${c3}"/>${[[44, 74], [56, 74], [50, 82], [40, 82], [60, 82]].map(([x, y]) => `<path d="M${x - 4} ${y}q4 4 8 0" fill="none" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/>`).join('')}`
      : `<ellipse cx="50" cy="78" rx="16" ry="12" fill="${c3}"/>`;
    return `${behind}
      <ellipse cx="38" cy="93" rx="10" ry="5.5" fill="${c2}" ${o(2)}/><ellipse cx="62" cy="93" rx="10" ry="5.5" fill="${c2}" ${o(2)}/>
      <ellipse cx="50" cy="76" rx="29" ry="19" fill="${c1}" ${o(2.2)}/>
      <path d="M78 74a29 19 0 0 1-48 14 31 21 0 0 0 48-14z" fill="${c2}" opacity=".6"/>
      ${belly}${ears}
      <ellipse cx="50" cy="46" rx="33" ry="27" fill="${c1}" ${o(2.4)}/>
      <path d="M82 44a33 27 0 0 1-56 20 36 30 0 0 0 56-20z" fill="${c2}" opacity=".55"/>
      ${neck}${bib}${ringEyes}${face(50, 45, 13, m === 'yum' ? 'joy' : m === 'sleep' ? 'sleep' : '', 1.15, false)}${muzzle}${mouth}
      <ellipse cx="30" cy="${m === 'yum' ? 70 : 78}" rx="6.5" ry="5.5" fill="${c1}" ${o(1.8)}/><ellipse cx="70" cy="${m === 'yum' ? 70 : 78}" rx="6.5" ry="5.5" fill="${c1}" ${o(1.8)}/>
      <path d="M36 22L38 6L44 15L50 2L56 15L62 6L64 22Z" fill="var(--sr-crown)" ${o(1.8)}/><path d="M37 19h26" stroke="var(--sr-crown-2)" stroke-width="2.4"/><circle cx="50" cy="13" r="2.6" fill="var(--sr-gem)" ${o(1)}/>
      ${hi('M24 40q4-14 18-19', 3, 0.7)}`;
  }

  /* Hari: di spalle mentre corre (col cestino delle merende), di fronte quando festeggia o perde la merenda */
  const HARI_BACK = (fr) => `${feet(fr, 'var(--sr-ear)', 38, 62, 9)}
    <circle cx="23" cy="50" r="7.5" fill="var(--sr-ear)" ${o(2)}/><circle cx="77" cy="50" r="7.5" fill="var(--sr-ear)" ${o(2)}/>
    <path d="${quills(50, 58, 30, 15, -212, 32, 12)}" fill="var(--sr-quill-2)" ${o(2.2)}/>
    <path d="${quills(50, 58, 26, 10, -205, 25, 11)}" fill="var(--sr-quill)"/>
    <ellipse cx="50" cy="63" rx="27" ry="25" fill="var(--sr-quill)"/>
    <path d="M36 50l4-6M50 46v-7M64 50l-4-6M30 64l4-5M70 64l-4-5M42 62l3-5M58 62l-3-5M50 74v-6M38 76l3-4M62 76l-3-4" stroke="var(--sr-quill-3)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M77 60a27 25 0 0 1-44 22 30 28 0 0 0 44-22z" fill="var(--sr-quill-2)" opacity=".55"/>
    <ellipse cx="50" cy="86" rx="5" ry="3.5" fill="var(--sr-quill-3)" ${o(1.4)}/>
    <path d="M70 70h20l-3 16H73z" fill="var(--sr-basket)" ${o(1.8)}/><path d="M72 76h16M73 81h14" stroke="var(--sr-basket-2)" stroke-width="1.6"/>
    <path d="M72 70q8-12 16 0" fill="none" ${o(2.2)}/><circle cx="76" cy="68" r="3.6" fill="var(--sr-straw)" ${o(1.2)}/><circle cx="83" cy="67" r="3.4" fill="var(--sr-blue)" ${o(1.2)}/>
    ${sakura(68, 30, 6.5)}${hi('M30 44q6-12 18-15', 3, 0.5)}`;
  const HARI_FRONT = (m) => `${feet(1, 'var(--sr-ear)', 38, 62, 9)}
    <path d="${quills(50, 56, 31, 16, -205, 25, 11)}" fill="var(--sr-quill-2)" ${o(2.2)}/>
    <path d="${quills(50, 56, 27, 10, -198, 18, 10)}" fill="var(--sr-quill)"/>
    <circle cx="25" cy="44" r="8" fill="var(--sr-ear)" ${o(2)}/><circle cx="25" cy="44.5" r="4" fill="var(--sr-ear-in)"/>
    <circle cx="75" cy="44" r="8" fill="var(--sr-ear)" ${o(2)}/><circle cx="75" cy="44.5" r="4" fill="var(--sr-ear-in)"/>
    <ellipse cx="50" cy="64" rx="31" ry="25" fill="var(--sr-face)" ${o(2.4)}/>
    <path d="M80 62a31 25 0 0 1-48 21 34 28 0 0 0 48-21z" fill="var(--sr-shade)"/>
    <path d="M36 43C41 50 46 52 50 52C54 52 59 50 64 43C58 37 42 37 36 43Z" fill="var(--sr-quill-3)"/>
    ${face(50, 63, 11, m, 1.25, false)}
    <ellipse cx="50" cy="72" rx="3.4" ry="2.5" fill="var(--sr-nose)"/>
    ${m === 'joy' ? '<path d="M44.5 76q5.5 9 11 0z" fill="var(--sr-mouth)" stroke="var(--sr-nose)" stroke-width="1.5" stroke-linejoin="round"/>' : '<ellipse cx="50" cy="78" rx="2.6" ry="3" fill="var(--sr-mouth)" stroke="var(--sr-nose)" stroke-width="1.3"/>'}
    ${sakura(70, 25, 6.5)}${hi('M30 36q6-9 16-12', 2.6, 0.5)}`;

  /* decorazioni ai bordi */
  const TREE = `<path d="M46 96C47 80 46 66 42 56L50 60L56 52C54 66 54 80 56 96Z" fill="var(--sr-trunk)" ${o(2)}/><path d="M53 96C52 80 53 68 55 56" fill="none" stroke="var(--sr-trunk-2)" stroke-width="3" opacity=".6"/>
    ${puffy([[30, 44, 17], [50, 30, 20], [70, 44, 17], [40, 56, 15], [62, 58, 15], [50, 46, 18]], 'var(--sr-tree)', 2)}
    <path d="M84 46c-2 10-12 16-24 16 8-4 14-9 16-18z" fill="var(--sr-tree-2)" opacity=".8"/>
    ${[[34, 38], [52, 24], [66, 40], [44, 50], [58, 52], [28, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="var(--sr-tree-3)"/>`).join('')}${hi('M28 36q4-10 14-12', 3, 0.7)}`;
  const BUSH = `${puffy([[30, 78, 16], [50, 70, 20], [70, 78, 16], [50, 84, 14]], 'var(--sr-bush)', 2)}
    <path d="M84 80c-4 8-14 12-26 12h22c4-3 5-8 4-12z" fill="var(--sr-bush-2)"/>
    ${[[34, 72, 'var(--sr-flower)'], [52, 62, 'var(--sr-flower-2)'], [66, 74, 'var(--sr-flower)'], [44, 82, 'var(--sr-flower-2)']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(2.6 * Math.cos(a * Math.PI / 180))}" cy="${f1(2.6 * Math.sin(a * Math.PI / 180))}" r="2.2" fill="${c}"/>`).join('')}<circle r="1.5" fill="var(--sr-gold)"/></g>`).join('')}`;
  const LAMP = `<rect x="46" y="44" width="8" height="52" rx="2" fill="var(--sr-post-wood)" ${o(1.8)}/>
    <path d="M30 30h40l-6-10H36z" fill="var(--sr-post-wood)" ${o(1.8)}/>
    <ellipse cx="50" cy="41" rx="15" ry="12" fill="var(--sr-lamp)" ${o(2)}/>
    <path d="M38 41h24M40 35q10 3 20 0M40 47q10-3 20 0" fill="none" stroke="var(--sr-lamp-2)" stroke-width="1.6" opacity=".8"/>
    <path d="M44 53h12v4H44z" fill="var(--sr-post-wood)" ${o(1.4)}/>${hi('M40 36q2-5 6-6', 2.4, 0.8)}`;
  const treatIc = (k) => `<svg viewBox="0 0 100 100" aria-hidden="true">${TREAT[k]}</svg>`;

  const wrapSVG = (inner, size = 200) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${inner}</svg>`;
  const svgAt = (inner, x, y, s, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 100 100">${inner}</svg>`;

  /* ---------- illustrazione della card e del tutorial (SVG in pagina: i token funzionano direttamente) ---------- */
  function roadArt(extra) {
    return `<svg viewBox="0 0 120 90" aria-hidden="true">
      <rect x="4" y="4" width="112" height="82" rx="14" fill="var(--sr-grass-1)"/>
      <path d="M4 18Q4 4 18 4H102Q116 4 116 18V30H4Z" fill="var(--sr-sky-2)"/>
      <path d="M4 30L22 18L34 26L50 14L66 26L80 16L98 26L116 20V30Z" fill="var(--sr-mount-1)"/>
      <path d="M54 30L18 86H102L66 30Z" fill="var(--sr-road-1)"/>
      <path d="M54 30L18 86H24L56 30ZM66 30L102 86H96L64 30Z" fill="var(--sr-road-edge)"/>
      <path d="M60 34v6M60 48v9M60 66v12" stroke="var(--sr-road-line)" stroke-width="2" stroke-linecap="round"/>
      ${extra}</svg>`;
  }
  const gateSVG = (x, y, w, h, op, good) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${good ? 'var(--sr-good)' : 'var(--sr-bad)'}" stroke="${good ? 'var(--sr-good-2)' : 'var(--sr-bad-2)'}" stroke-width="2"/>
    <text x="${x + w / 2}" y="${y + h * 0.62}" text-anchor="middle" font-family="Mochiy Pop One, sans-serif" font-size="${f1(h * 0.55)}" fill="var(--sr-text)" stroke="var(--sr-text-line)" stroke-width="2.2" paint-order="stroke">${op}</text></g>`;
  const art = () => roadArt(`${gateSVG(36, 36, 22, 13, '×2', true)}${gateSVG(62, 36, 22, 13, '+1', true)}
    ${svgAt(ANIMAL.chick(0, ''), 44, 22, 14)}${svgAt(ANIMAL.bunny(1, ''), 60, 20, 15)}
    ${svgAt(TREAT.strawberry, 50, 50, 8)}${svgAt(TREAT.seed, 62, 54, 6)}${svgAt(TREAT.blueberry, 56, 44, 6)}
    ${svgAt(HARI_BACK(0), 44, 60, 30)}`);

  /* ---------- bitmap dei personaggi ---------- */
  const reduce = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const OPS = { x: '×', '+': '+', '-': '−', '/': '÷' };
  const opText = (op) => OPS[op[0]] + op.slice(1);
  const isGood = (op) => op[0] === 'x' || op[0] === '+';
  const KEYS = { ArrowLeft: -1, ArrowRight: 1, a: -1, d: 1, A: -1, D: 1 };
  const TOKENS = ['ink', 'text', 'text-line', 'sky-1', 'sky-2', 'sky-3', 'sun', 'sun-glow', 'cloud', 'star', 'mount-1', 'mount-2', 'snowcap',
    'hill-1', 'hill-2', 'grass-1', 'grass-2', 'grass-dot', 'road-1', 'road-2', 'road-edge', 'road-line', 'curb', 'fog', 'shadow',
    'good', 'good-2', 'good-3', 'bad', 'bad-2', 'bad-3', 'post', 'post-2', 'trail', 'puff', 'heart', 'spark', 'gold', 'mark',
    'tummy', 'tummy-2', 'tummy-bg', 'zzz', 'lamp-glow', 'night'];
  const FOC = 9;           // "focale": quanto si stringe il sentiero verso l'orizzonte

  function create(el, ctx, saved) {
    const P = HH.snack;
    let s, raf = 0, last = 0, paused = false, party = 0, over = 0, timers = [], goTimer = 0;
    let wrap, stage, cv, g, msg, pauseEl, bar, pauseBtn, powEl;
    let W = 300, H = 450, dpr = 1, yH = 0, yB = 0, RW = 0;
    let C = {}, IMG = {}, bg = null, themeKey = '', themeAt = 0;
    let drag = null, keyDir = 0, keyStop = false, lastChanged = 0, lastBossPct = 0, tossKick = 0, prevPx = 0, lean = 0;
    let nibbles = new Map(), ghosts = [], parts = [], oopsT = 0, bossYum = 0, bossBlow = 0, scroll = 0, sndNib = 0, sndFull = 0;
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    /* ---------- costruzione ---------- */
    function build() {
      clearTimers();
      el.innerHTML = `<div class="sr-wrap" dir="ltr">
        <div class="sr-bar">
          <span class="sr-pow" role="img" aria-label="${L('sr_power')}"><span class="sr-ic"></span><b></b></span>
          <span class="sr-track" aria-hidden="true"><i class="sr-fill"></i><span class="sr-rider">${HH.mascot.mini()}</span><span class="sr-flag">${`<svg viewBox="0 0 100 100">${boss(s.bossKind, '')}</svg>`}</span></span>
          <button class="sr-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button>
        </div>
        <div class="sr-stage" tabindex="0" role="application" aria-label="${L('sr_board')}">
          <canvas class="sr-cv"></canvas>
          <div class="sr-msg" aria-live="polite"></div>
          <div class="sr-pause" hidden><span class="sr-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div>
        </div>
      </div>`;
      wrap = el.querySelector('.sr-wrap');
      stage = el.querySelector('.sr-stage');
      cv = el.querySelector('.sr-cv');
      g = cv.getContext('2d');
      msg = el.querySelector('.sr-msg');
      pauseEl = el.querySelector('.sr-pause');
      bar = el.querySelector('.sr-bar');
      pauseBtn = el.querySelector('.sr-pbtn');
      powEl = el.querySelector('.sr-pow');
      ghosts = []; parts = []; nibbles = new Map(); party = 0; over = 0; oopsT = 0; prevPx = s.px; lastTreat = ''; lastPow = -1;
      theme(true);
      measure();
      if (G.ResizeObserver) {
        if (el._srRO) el._srRO.disconnect();
        el._srRO = new G.ResizeObserver(() => { if (Math.round(stage.clientWidth) !== Math.round(W) || Math.round(stage.clientHeight) !== Math.round(H)) { measure(); draw(performance.now()); } });
        el._srRO.observe(stage);
      }
      renderBar(true);
      draw(performance.now());
    }

    // token del tema → colori per il canvas e SVG "cotti" in bitmap
    function theme(force) {
      const cs = G.getComputedStyle(wrap);
      const key = TOKENS.map((t) => cs.getPropertyValue('--sr-' + t).trim()).join('|');
      if (!force && key === themeKey) return;
      themeKey = key;
      C = {};
      TOKENS.forEach((t) => { C[t] = cs.getPropertyValue('--sr-' + t).trim(); });
      C.night = +C.night || 0;
      const res = (svg) => svg.replace(/var\((--[\w-]+)\)/g, (m0, n) => cs.getPropertyValue(n).trim() || 'transparent');
      const want = {};
      for (const k of P.KINDS) { want[`${k}0`] = ANIMAL[k](0, ''); want[`${k}1`] = ANIMAL[k](1, ''); want[`${k}J`] = ANIMAL[k](0, 'joy'); want[`${k}K`] = ANIMAL[k](1, 'joy'); }
      want.hari0 = HARI_BACK(0); want.hari1 = HARI_BACK(1); want.hariJ = HARI_FRONT('joy'); want.hariO = HARI_FRONT('oops');
      want.boss = boss(s.bossKind, ''); want.bossB = boss(s.bossKind, 'blow'); want.bossY = boss(s.bossKind, 'yum'); want.bossZ = boss(s.bossKind, 'sleep');
      want.drop = DROP[s.drop];
      for (const k of P.TREATS) want[`t_${k}`] = TREAT[k];
      want.tree = TREE; want.bush = BUSH; want.lamp = LAMP;
      const size = (k) => (k.startsWith('boss') || k === 'tree' ? 280 : k.startsWith('t_') ? 64 : 180);
      Object.keys(want).forEach((k) => bake(k, res(wrapSVG(want[k], size(k))), size(k)));
      bg = null;
    }
    function bake(name, svg, size) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        c.getContext('2d').drawImage(im, 0, 0, size, size);
        IMG[name] = c;
      };
      im.onerror = () => { if (G.console) G.console.warn('snack: sprite non valido', name); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function measure() {
      W = stage.clientWidth || 300; H = stage.clientHeight || 450;
      dpr = Math.min(2, G.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      yH = H * 0.3; yB = H * 0.885; RW = W * 0.47;
      bg = null;
    }

    /* ---------- proiezione ---------- */
    const K = (z) => FOC / (FOC + Math.max(-FOC * 0.7, z));
    const Y = (z) => yH + (yB - yH) * K(z);
    const SX = (x, k) => W / 2 + x * RW * k;

    /* ---------- fondale dipinto (una volta per misura/tema) ---------- */
    function paintBg() {
      bg = document.createElement('canvas');
      bg.width = cv.width; bg.height = cv.height;
      const b = bg.getContext('2d');
      b.scale(dpr, dpr);
      const sky = b.createLinearGradient(0, 0, 0, yH);
      sky.addColorStop(0, C['sky-1']); sky.addColorStop(0.7, C['sky-2']); sky.addColorStop(1, C['sky-3']);
      b.fillStyle = sky; b.fillRect(0, 0, W, yH + 2);
      const r = HH.rng(77);
      if (C.night) {
        b.fillStyle = C.star;
        for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * yH * 0.85, z = r(); b.globalAlpha = 0.4 + z * 0.6; b.beginPath(); b.arc(x, y, 0.5 + z * 1.1, 0, 7); b.fill(); }
        b.globalAlpha = 1;
      }
      // sole o luna
      const sx = W * 0.78, sy = yH * 0.32, sr = W * 0.065;
      b.fillStyle = C['sun-glow']; b.beginPath(); b.arc(sx, sy, sr * 1.9, 0, 7); b.fill();
      b.fillStyle = C.sun; b.beginPath(); b.arc(sx, sy, sr, 0, 7); b.fill();
      if (C.night) { b.fillStyle = C['sky-1']; b.beginPath(); b.arc(sx - sr * 0.45, sy - sr * 0.25, sr * 0.85, 0, 7); b.fill(); }
      // montagne lontane con la neve, poi colline
      const ridge = (pts, fill, cap) => {
        b.fillStyle = fill; b.strokeStyle = C.ink; b.lineWidth = 1; b.globalAlpha = 1;
        b.beginPath(); b.moveTo(0, yH + 1);
        pts.forEach(([x, y]) => b.lineTo(x * W, yH - y * yH));
        b.lineTo(W, yH + 1); b.closePath(); b.fill();
        if (cap) {
          b.fillStyle = C.snowcap;
          pts.forEach(([x, y], i) => {
            if (y < 0.3) return;
            const px = x * W, py = yH - y * yH, pl = pts[i - 1] || [x - 0.1, 0], pr = pts[i + 1] || [x + 0.1, 0];
            const t = 0.22;
            b.beginPath(); b.moveTo(px, py);
            b.lineTo(px + (pl[0] * W - px) * t, py + (yH - pl[1] * yH - py) * t);
            b.lineTo(px - W * 0.012, py + (yH - pl[1] * yH - py) * t * 0.7);
            b.lineTo(px + W * 0.01, py + (yH - pr[1] * yH - py) * t * 0.8);
            b.lineTo(px + (pr[0] * W - px) * t, py + (yH - pr[1] * yH - py) * t);
            b.closePath(); b.fill();
          });
        }
      };
      ridge([[0, 0.28], [0.12, 0.46], [0.24, 0.3], [0.38, 0.55], [0.52, 0.32], [0.66, 0.5], [0.8, 0.3], [0.92, 0.42], [1, 0.3]], C['mount-1'], true);
      ridge([[0, 0.16], [0.18, 0.26], [0.34, 0.14], [0.5, 0.24], [0.7, 0.12], [0.86, 0.22], [1, 0.14]], C['mount-2'], false);
      // colline morbide
      b.fillStyle = C['hill-1'];
      b.beginPath(); b.moveTo(0, yH + 1); b.quadraticCurveTo(W * 0.18, yH - yH * 0.16, W * 0.4, yH); b.quadraticCurveTo(W * 0.62, yH - yH * 0.12, W * 0.82, yH - yH * 0.02); b.quadraticCurveTo(W * 0.92, yH - yH * 0.1, W, yH - yH * 0.04); b.lineTo(W, yH + 1); b.closePath(); b.fill();
      b.fillStyle = C['hill-2'];
      b.beginPath(); b.moveTo(0, yH + 1); b.quadraticCurveTo(W * 0.1, yH - yH * 0.07, W * 0.26, yH); b.lineTo(W * 0.74, yH); b.quadraticCurveTo(W * 0.9, yH - yH * 0.08, W, yH - yH * 0.02); b.lineTo(W, yH + 1); b.closePath(); b.fill();
      // prato
      b.fillStyle = C['grass-1']; b.fillRect(0, yH, W, H - yH);
    }

    /* ---------- disegno a ogni fotogramma ---------- */
    function road() {
      // fasce del prato e del sentiero che scorrono verso Hari
      const band = 2, off = scroll % (band * 2), zMax = 70;
      for (let z = -off - band * 2; z < zMax; z += band) {
        const za = Math.max(-3, z), zb = z + band;
        if (zb <= za) continue;
        const ka = K(za), kb = K(zb), ya = Y(za), yb = Y(zb);
        const even = Math.round((z + off) / band) % 2 === 0;
        if (even) { g.fillStyle = C['grass-2']; g.fillRect(0, yb, W, ya - yb + 0.5); }
        g.fillStyle = even ? C['road-1'] : C['road-2'];
        quad(-1, 1, ka, kb, ya, yb);
        // cordoli a strisce pastello e linea di mezzeria (divide le porte sinistra/destra)
        g.fillStyle = even ? C.curb : C['road-edge'];
        quad(-1.09, -1, ka, kb, ya, yb); quad(1, 1.09, ka, kb, ya, yb);
        if (even) { g.fillStyle = C['road-line']; quad(-0.022, 0.022, ka, kb, ya, yb - (yb - ya) * 0.15); }
      }
      // ultimo tratto fino all'orizzonte
      const kz = K(zMax), yz = Y(zMax);
      g.fillStyle = C['road-2'];
      g.beginPath(); g.moveTo(SX(-1.09, kz), yz); g.lineTo(SX(1.09, kz), yz); g.lineTo(W / 2, yH); g.closePath(); g.fill();
      // foschia all'orizzonte
      const fog = g.createLinearGradient(0, yH - H * 0.02, 0, Y(16));
      fog.addColorStop(0, C.fog); fog.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fog; g.fillRect(0, yH - H * 0.02, W, Y(16) - yH + H * 0.02);
    }
    function quad(x0, x1, ka, kb, ya, yb) {
      g.beginPath();
      g.moveTo(SX(x0, ka), ya); g.lineTo(SX(x1, ka), ya); g.lineTo(SX(x1, kb), yb); g.lineTo(SX(x0, kb), yb);
      g.closePath(); g.fill();
    }

    function sprite(name, x, yFoot, w, alpha = 1, flip = false, rot = 0, sq = 0) {
      const im = IMG[name];
      if (!im || w < 1) return;
      g.save();
      g.globalAlpha = alpha;
      g.translate(x, yFoot);
      if (rot) g.rotate(rot);
      g.scale(flip ? -1 : 1, 1);
      if (sq) g.scale(1 + sq, 1 - sq);
      g.drawImage(im, -w / 2, -w * 0.97, w, w);
      g.restore();
    }
    function shadow(x, y, rx) {
      g.fillStyle = C.shadow;
      g.beginPath(); g.ellipse(x, y, rx, rx * 0.32, 0, 0, 7); g.fill();
    }
    const fadeIn = (z) => Math.max(0, Math.min(1, (P.Z_FAR + 1.5 - z) / 3));

    function drawGate(gt, t) {
      const k = K(gt.z), y = Y(gt.z), h = 0.72 * RW * k, lw = Math.max(1, 2.6 * k);
      const a = fadeIn(gt.z);
      g.save();
      g.globalAlpha = a;
      for (const side of ['l', 'r']) {
        const op = gt[side];
        if (!op) continue;
        const good = isGood(op), x0 = SX(side === 'l' ? -0.97 : 0.05, k), x1 = SX(side === 'l' ? -0.05 : 0.97, k), w = x1 - x0, top = y - h;
        g.fillStyle = good ? C.good : C.bad;
        rr(x0, top, w, h, 5 * k); g.fill();
        // riflesso che scorre sul vetro
        g.save(); rr(x0, top, w, h, 5 * k); g.clip();
        const sw = ((t * 0.9 + (side === 'l' ? 0 : 0.5)) % 1.6) - 0.3;
        g.fillStyle = good ? C['good-3'] : C['bad-3']; g.globalAlpha = a * 0.45;
        g.beginPath(); g.moveTo(x0 + w * sw, top); g.lineTo(x0 + w * (sw + 0.18), top); g.lineTo(x0 + w * (sw + 0.02), y); g.lineTo(x0 + w * (sw - 0.16), y); g.closePath(); g.fill();
        g.restore();
        g.globalAlpha = a;
        g.lineWidth = lw; g.strokeStyle = good ? C['good-2'] : C['bad-2'];
        rr(x0, top, w, h, 5 * k); g.stroke();
        // pali
        g.fillStyle = C.post; g.strokeStyle = C.ink; g.lineWidth = Math.max(0.8, 1.4 * k);
        for (const px of [x0, x1]) { rr(px - 3.2 * k, top - 4 * k, 6.4 * k, h + 4 * k, 3 * k); g.fill(); g.stroke(); }
        // cartello col numero
        const fs = Math.max(7, 0.5 * RW * k);
        g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineJoin = 'round'; g.lineWidth = Math.max(2, fs * 0.22); g.strokeStyle = C['text-line'];
        const tx = (x0 + x1) / 2, ty = top + h * 0.5;
        g.strokeText(opText(op), tx, ty);
        g.fillStyle = C.text; g.fillText(opText(op), tx, ty);
      }
      g.restore();
    }
    function rr(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    function drawAnimal(a, t) {
      const A = P.ANIMALS[a.kind], k = K(a.z), x = SX(a.x, k), y = Y(a.z), w = 3.3 * A.r * RW * k;
      if (w < 2) return;
      const st = reduce() ? 0 : t * (7 + A.v * 3) + a.id;
      const fr = Math.floor(st) % 2, hop = reduce() ? 0 : Math.abs(Math.sin(st * Math.PI)) * w * (a.kind === 'bunny' ? 0.16 : 0.06);
      const al = fadeIn(a.z);
      shadow(x, y, w * 0.34);
      // appena ha mangiato un boccone: faccina felice e un saltello
      const yum = nibbles.get(a.id), chew = yum && t - yum < 0.22;
      sprite(chew ? `${a.kind}${fr ? 'K' : 'J'}` : `${a.kind}${fr}`, x, y - hop - (chew ? w * 0.05 : 0), w, al, a.vx > 0, reduce() ? 0 : Math.sin(st * Math.PI) * 0.05, chew ? -0.06 : 0);
      // fame: numerino dei bocconi che mancano e pancino che si riempie
      if (a.max > 1 && w > 10) {
        const fs = Math.max(8, w * 0.28), by = y - hop - w * 0.98;
        g.globalAlpha = al;
        g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const bw = Math.max(fs * 2.6, w * 0.62), bh = fs * 1.3;
        g.fillStyle = C['tummy-bg']; g.strokeStyle = C.ink; g.lineWidth = Math.max(1, fs * 0.1);
        rr(x - bw / 2, by - bh / 2, bw, bh, bh / 2); g.fill(); g.stroke();
        const fill = 1 - a.left / a.max;
        if (fill > 0) { g.fillStyle = C.tummy; rr(x - bw / 2 + 1.5, by - bh / 2 + 1.5, (bw - 3) * fill, bh - 3, (bh - 3) / 2); g.fill(); }
        g.lineWidth = Math.max(2, fs * 0.22); g.strokeStyle = C['text-line']; g.lineJoin = 'round';
        g.strokeText(String(a.left), x, by + fs * 0.04);
        g.fillStyle = C.text; g.fillText(String(a.left), x, by + fs * 0.04);
        g.globalAlpha = 1;
      }
    }

    // merenda in volo: gira su se stessa, con una scia leggera
    function drawTreat(p, t) {
      const k = K(p.z), x = SX(p.x, k), y = Y(p.z) - 0.36 * RW * k, w = Math.max(5, 0.24 * RW * k);
      const k2 = K(p.z - 0.9), x2 = SX(p.x - p.vx * 0.04, k2), y2 = Y(p.z - 0.9) - 0.36 * RW * k2;
      g.strokeStyle = C.trail; g.lineCap = 'round'; g.lineWidth = w * 0.28; g.globalAlpha = 0.3;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      g.globalAlpha = 1;
      const im = IMG[`t_${p.k}`];
      if (!im) return;
      g.save(); g.translate(x, y); if (!reduce()) g.rotate(t * 9 + p.x * 7); g.drawImage(im, -w / 2, -w / 2, w, w); g.restore();
    }

    function drawDrop(q, t) {
      const k = K(q.z), x = SX(q.x, k), y = Y(q.z);
      const span = Math.max(0.01, q.z0 - P.LINE_Z), p = Math.min(1, Math.max(0, 1 - (q.z - P.LINE_Z) / span));
      const arc = Math.sin(p * Math.PI) * 1.6 * RW * k * 0.9 + 0.4 * RW * k * (1 - p);
      const w = 0.52 * RW * k;
      shadow(x, y, w * 0.35);
      const wob = reduce() ? 0 : s.drop === 'bubble' ? Math.sin(t * 6 + q.id) * 0.3 : t * 5 + q.id;
      sprite('drop', x + (s.drop === 'leaf' || s.drop === 'petal' ? Math.sin(t * 5 + q.id) * w * 0.3 : 0), y - arc + w * 0.5, w, 1, false, wob);
    }
    function drawMarks(t) {
      // dove cadrà: cerchietto tratteggiato che pulsa sul sentiero
      for (const q of s.drops) {
        const k = K(0), x = SX(q.land, k), y = Y(0);
        const near = 1 - Math.min(1, (q.z - P.LINE_Z) / 10);
        const r = P.DROP_R * RW * (1 + 0.08 * Math.sin(t * 14));
        g.globalAlpha = 0.3 + near * 0.6;
        g.strokeStyle = C.mark; g.lineWidth = 2.5; g.setLineDash([5, 4]);
        g.beginPath(); g.ellipse(x, y, r, r * 0.3, 0, 0, 7); g.stroke();
        g.setLineDash([]);
        g.fillStyle = C.mark; g.globalAlpha = near * 0.25;
        g.beginPath(); g.ellipse(x, y, r, r * 0.3, 0, 0, 7); g.fill();
        g.globalAlpha = 1;
      }
    }

    function drawBoss(b, t) {
      const k = K(b.z), x = SX(b.x, k), y = Y(b.z), w = 3.2 * P.BOSS_R * RW * k;
      const bob = reduce() || party ? 0 : Math.sin(t * 4) * w * 0.02;
      const breath = party ? Math.sin(t * 2.2) * 0.025 : 0;
      const sq = reduce() ? 0 : Math.sin(t * 8) * 0.015 + (bossBlow > 0 ? -0.06 : 0) + breath;
      shadow(x, y, w * 0.36);
      const yum = t - bossYum < 0.16;
      const name = party ? 'bossZ' : bossBlow > 0 ? 'bossB' : yum ? 'bossY' : 'boss';
      sprite(name, x, y + bob, w, fadeIn(b.z - 3), !party && b.vx < 0, 0, sq);
    }
    // pancia dell'animalone: si riempie a ogni boccone
    function drawBossBar() {
      const b = s.boss;
      if (!b) return;
      const bw = W * 0.62, bh = 13, bx = (W - bw) / 2 + 12, by = 12;
      const p = Math.min(1, b.fed / b.max);
      g.fillStyle = C['tummy-bg']; g.strokeStyle = C.ink; g.lineWidth = 1.6;
      rr(bx, by, bw, bh, 6.5); g.fill(); g.stroke();
      if (p > 0) {
        g.fillStyle = C.tummy; rr(bx + 2, by + 2, (bw - 4) * p, bh - 4, 4.5); g.fill();
        g.fillStyle = C['tummy-2']; rr(bx + 4, by + 3, Math.max(0, (bw - 8) * p), 2.6, 1.3); g.fill();
      }
      g.fillStyle = C.heart; heartPath(bx + bw + 2, by + bh / 2, 7); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 1.2; g.stroke();
      const im = IMG[party ? 'bossZ' : 'boss'];
      if (im) g.drawImage(im, bx - 30, by - 12, 34, 34);
    }

    function drawHari(t) {
      const x = SX(s.px, 1), y = yB, w = W * 0.24;
      shadow(x, y, w * 0.32);
      const running = !paused && s.ready <= 0 && !s.wait && !P.isOver(s) && !reduce();
      const fr = running ? Math.floor(t * 8) % 2 : 0;
      const hop = running ? Math.abs(Math.sin(t * 8 * Math.PI / 2)) * w * 0.05 : 0;
      const kick = Math.max(0, tossKick - t) / 0.08;
      if (party) {
        const j = reduce() ? 0 : Math.abs(Math.sin((t - party / 1000) * 7)) * w * 0.25;
        sprite('hariJ', x, y - j, w);
      } else if (s.calm > P.CALM - 0.7 && oopsT) {
        sprite('hariO', x, y, w, 1, false, reduce() ? 0 : Math.sin(t * 22) * 0.06);
      } else {
        const blinkA = s.calm > 0 && !reduce() ? (Math.floor(t * 10) % 2 ? 0.55 : 1) : 1;
        sprite(`hari${fr}`, x, y - hop, w, blinkA, false, lean, kick * 0.05);
      }
    }

    // animali sazi che tornano a casa: si girano e saltellano verso l'orizzonte, felici
    function drawGhosts(t) {
      ghosts = ghosts.filter((gh) => t - gh.t0 < 1.4);
      for (const gh of ghosts) {
        const p = (t - gh.t0) / 1.4, z = gh.z + p * 7, k = K(z);
        const A = P.ANIMALS[gh.kind] || { r: 0.15 };
        const w = 3.3 * A.r * RW * k;
        const hop = Math.abs(Math.sin(p * Math.PI * 3)) * w * 0.35;
        const x = SX(gh.x + gh.dir * p * 0.5, k), y = Y(z) - hop;
        shadow(x, Y(z), w * 0.3 * (1 - p * 0.5));
        sprite(`${gh.kind}${Math.floor(p * 6) % 2 ? 'K' : 'J'}`, x, y, w, p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3, gh.dir < 0, gh.dir * Math.sin(p * Math.PI * 3) * 0.12);
      }
    }

    function drawScenery() {
      const SP = 2.6, z0 = -3, z1 = 44, out = [];
      for (let i = Math.ceil((scroll + z0) / SP); i <= Math.floor((scroll + z1) / SP); i++) {
        const z = i * SP - scroll, h = ((i * 2654435761) >>> 0) / 4294967296;
        const side = i % 2 ? 1 : -1;
        const kind = h < 0.45 ? 'tree' : h < 0.75 ? 'bush' : 'lamp';
        const x = side * (kind === 'tree' ? 1.75 + h * 0.5 : kind === 'lamp' ? 1.32 : 1.4 + h * 0.4);
        out.push([z, kind, x]);
        // fiorellini nel prato
        out.push([z + SP * 0.5, 'dot', -side * (1.25 + h * 1.2)]);
      }
      return out;
    }

    function draw(now) {
      if (!g) return;
      const t = now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!bg) paintBg();
      g.drawImage(bg, 0, 0, W, H);
      // nuvole che passano
      g.fillStyle = C.cloud;
      for (let i = 0; i < 3; i++) {
        const cw = W * (0.16 + i * 0.04), cx = ((t * (6 + i * 3) + i * W * 0.45) % (W + cw * 2)) - cw, cy = yH * (0.18 + i * 0.2);
        g.beginPath(); g.ellipse(cx, cy, cw * 0.5, cw * 0.16, 0, 0, 7); g.ellipse(cx - cw * 0.16, cy - cw * 0.1, cw * 0.2, cw * 0.15, 0, 0, 7); g.ellipse(cx + cw * 0.12, cy - cw * 0.13, cw * 0.22, cw * 0.18, 0, 0, 7); g.fill();
      }
      road();
      drawMarks(t);
      // tutto ciò che sta sul sentiero, dal più lontano al più vicino
      const list = [];
      for (const it of drawScenery()) list.push([it[0], 0, it]);
      for (const gt of s.gates) list.push([gt.z, 1, gt]);
      for (const a of s.animals) if (a.z < P.Z_FAR + 1.5) list.push([a.z, 2, a]);
      if (s.boss) list.push([s.boss.z, 3, s.boss]);
      for (const q of s.drops) list.push([q.z, 4, q]);
      for (const p of s.treats) list.push([p.z, 5, p]);
      list.push([0, 6, null]);
      list.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
      for (const [z, type, o2] of list) {
        if (type === 0) {
          const [, kind, x] = o2, k = K(z), y = Y(z);
          if (kind === 'dot') {
            const r = Math.max(0.8, 3.2 * k);
            g.fillStyle = C['grass-dot']; g.beginPath(); g.arc(SX(x, k), y, r, 0, 7); g.fill();
            continue;
          }
          const w = (kind === 'tree' ? 1.5 : kind === 'lamp' ? 0.75 : 0.8) * RW * k;
          const sx = SX(x, k);
          if (sx < -w || sx > W + w) continue;
          shadow(sx, y, w * 0.3);
          sprite(kind, sx, y, w, fadeIn(z));
          if (kind === 'lamp' && C.night) {
            const gx = sx, gy = y - w * 0.56, gr = w * 0.6;
            const rg = g.createRadialGradient(gx, gy, 0, gx, gy, gr);
            rg.addColorStop(0, C['lamp-glow']); rg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = rg; g.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
          }
        } else if (type === 1) drawGate(o2, t);
        else if (type === 2) drawAnimal(o2, t);
        else if (type === 3) drawBoss(o2, t);
        else if (type === 4) drawDrop(o2, t);
        else if (type === 5) drawTreat(o2, t);
        else { drawGhosts(t); drawHari(t); }
      }
      drawParts(t);
      drawBossBar();
    }

    /* ---------- particelle (coordinate dello schermo) ---------- */
    function at(x, z, up = 0.3) { const k = K(z); return { x: SX(x, k), y: Y(z) - up * RW * k, k }; }
    function puff(x, z, n = 6, scale = 1) {
      if (reduce()) return;
      const p = at(x, z), t = performance.now() / 1000;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        parts.push({ ty: 'puff', x: p.x, y: p.y, vx: Math.cos(a) * 40 * p.k * scale, vy: Math.sin(a) * 24 * p.k * scale - 10, r: (6 + (i % 3) * 3) * Math.max(0.35, p.k) * scale, t0: t, life: 0.5 });
      }
    }
    function hearts(x, z, n = 2, scale = 1) {
      if (reduce()) return;
      const p = at(x, z, 0.5), t = performance.now() / 1000;
      for (let i = 0; i < n; i++) parts.push({ ty: 'heart', x: p.x + (i - (n - 1) / 2) * 10 * p.k, y: p.y, vx: (i - (n - 1) / 2) * 24, vy: -70 - i * 12, r: 7 * Math.max(0.5, p.k) * scale, t0: t + i * 0.05, life: 0.9 });
    }
    function sparks(x, y, n, col, scale = 1) {
      if (reduce()) return;
      const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, v = (60 + Math.random() * 70) * scale;
        parts.push({ ty: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, r: 5 * scale, t0: t, life: 0.6, col });
      }
    }
    function float(text, x, y, col, size = 20, life = 1) {
      parts.push({ ty: 'text', text, x, y, vx: 0, vy: -38, r: size, t0: performance.now() / 1000, life, col });
    }
    function heartPath(x, y, r) {
      g.beginPath();
      g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
      g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
      g.closePath();
    }
    function star(x, y, r) {
      g.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr2 = i % 2 ? r * 0.38 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
      g.closePath();
    }
    function drawParts(t) {
      parts = parts.filter((p) => t - p.t0 < p.life);
      for (const p of parts) {
        const e = t - p.t0;
        if (e < 0) continue;
        const k = e / p.life, x = p.x + p.vx * e, y = p.y + p.vy * e + (p.ty === 'spark' ? 90 * e * e : 0);
        g.globalAlpha = 1 - k * k;
        if (p.ty === 'puff') { g.fillStyle = C.puff; g.beginPath(); g.arc(x, y, p.r * (0.6 + k * 0.8), 0, 7); g.fill(); }
        else if (p.ty === 'heart') { g.fillStyle = C.heart; g.strokeStyle = C.ink; g.lineWidth = 1; heartPath(x + Math.sin(e * 9) * 4, y, p.r); g.fill(); g.stroke(); }
        else if (p.ty === 'spark') { g.fillStyle = p.col || C.spark; star(x, y, p.r * (1 - k * 0.5)); g.fill(); }
        else if (p.ty === 'text') {
          const sc = e < 0.15 ? 0.5 + (e / 0.15) * 0.7 : e < 0.3 ? 1.2 - ((e - 0.15) / 0.15) * 0.2 : 1;
          const fs = p.r * sc;
          g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
          g.lineWidth = fs * 0.24; g.strokeStyle = C['text-line']; g.strokeText(p.text, x, y);
          g.fillStyle = p.col || C.text; g.fillText(p.text, x, y);
        }
      }
      g.globalAlpha = 1;
    }

    /* ---------- barra ---------- */
    let lastPow = -1, lastP = -1, lastTreat = '';
    function renderBar(force) {
      const tr = P.treatOf(s.power);
      if (tr !== lastTreat) { powEl.querySelector('.sr-ic').innerHTML = treatIc(tr); lastTreat = tr; }
      if (force || s.power !== lastPow) {
        powEl.querySelector('b').textContent = `×${s.power}`;
        powEl.classList.toggle('max', s.power >= (s.pmax || P.POWER_MAX));
        lastPow = s.power;
      }
      const p = Math.round(P.progress(s) * 200) / 200;
      if (force || p !== lastP) {
        bar.querySelector('.sr-fill').style.width = `${p * 100}%`;
        bar.querySelector('.sr-rider').style.left = `${p * 100}%`;
        bar.classList.toggle('boss', !!s.boss);
        lastP = p;
      }
    }
    function bump(cls) { powEl.classList.remove('up', 'down'); void powEl.offsetWidth; powEl.classList.add(cls); }
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

    /* ---------- eventi della logica ---------- */
    function onEvent(e, t) {
      switch (e.type) {
        case 'toss': tossKick = t + 0.08; break;
        case 'nibble': {
          nibbles.set(e.id, t);
          const p = at(e.x, e.z, 0.35);
          sparks(p.x, p.y, 2, C.spark, Math.max(0.4, p.k));
          if (t - sndNib > 0.12) { sndNib = t; ctx.sfx.mark(); }
          break;
        }
        case 'full': {
          // sazio: si gira e torna a casa saltellando, con cuoricini
          const dir = e.x === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(e.x);
          ghosts.push({ kind: e.kind, x: e.x, z: Math.max(0.3, e.z), t0: t, dir });
          hearts(e.x, Math.max(0.3, e.z), e.by === 'snack' ? 2 : 1);
          if (e.by === 'snack') { const p = at(e.x, e.z, 0.5); sparks(p.x, p.y, 4, C.gold, Math.max(0.5, p.k)); }
          nibbles.delete(e.id);
          if (e.by === 'snack' && t - sndFull > 0.09) { sndFull = t; ctx.sfx.place(); }
          changed(false);
          break;
        }
        case 'gate': {
          const good = e.power >= e.prev, p = at(s.px, 0.5, 0.9);
          sparks(p.x, p.y, 10, good ? C.gold : C['bad-2'], 1.2);
          float(`${opText(e.op)}`, p.x, p.y - 10, good ? C.gold : C['bad-3'], 30, 1.1);
          if (e.power >= (s.pmax || P.POWER_MAX) && e.prev < e.power) later(() => float(L('sr_max'), p.x, p.y - 44, C.gold, 20, 1), 160);
          bump(e.power < e.prev ? 'down' : 'up');
          if (e.power > e.prev) ctx.sfx.cupDone(); else if (e.power < e.prev) ctx.sfx.lightOff(); else ctx.sfx.tap();
          renderBar(true);
          changed(true);
          break;
        }
        case 'snatch': {
          // merenda rubata (o bolla sul naso): Hari fa "oh no!", niente di più
          oopsT = t;
          const p = at(s.px, 0, 1.1);
          puff(s.px, 0.3, 6, 0.9);
          float(L(e.what === 'boop' ? 'sr_boop' : 'sr_snatch'), p.x, p.y - 20, C.heart, 18, 1.1);
          if (!reduce()) { stage.classList.remove('wobble'); void stage.offsetWidth; stage.classList.add('wobble'); }
          ctx.mistake(e.left);
          changed(true);
          break;
        }
        case 'lose': over = performance.now(); break;
        case 'wave': changed(true); break;
        case 'boss': {
          say(L('sr_boss'), 'boss', 1700);
          ctx.sfx.milestone();
          renderBar(true);
          changed(true);
          break;
        }
        case 'bossNibble': {
          bossYum = t;
          if (Math.random() < 0.3 && s.boss) sparks(SX(e.x, K(s.boss.z)), Y(s.boss.z) - RW * K(s.boss.z) * 0.7, 2, C.heart, 0.6);
          if (t - sndNib > 0.14) { sndNib = t; ctx.sfx.mark(); }
          const pct = e.fed / e.max;
          if (pct - lastBossPct >= 0.1) { lastBossPct = pct; changed(true); }
          break;
        }
        case 'blow': bossBlow = 0.35; ctx.sfx.pour(260); break;
        case 'land': { if (s.drop === 'bubble') puff(e.x, 0.2, 5, 0.6); ctx.sfx.set(); break; }
        case 'call': { if (s.boss) puff(s.boss.x, s.boss.z - 1, 8, 1.4); ctx.sfx.giggle(); break; }
        case 'go': {
          say(L('pa_go'), 'go', 650); ctx.sfx.milestone();
          if (s.wait) later(() => { if (s.wait && !paused) say(L('sr_start'), 'hint', 2600); }, 700);
          break;
        }
        case 'win': {
          // pancia piena: l'animalone si addormenta felice, Zzz e cuoricini
          party = performance.now();
          const b = s.boss || { x: 0, z: P.BOSS_Z };
          for (let i = 0; i < 4; i++) later(() => hearts(b.x + (Math.random() - 0.5) * 0.6, b.z, 3, 1.6), i * 180);
          for (let i = 0; i < 3; i++) later(() => zzz(b), 300 + i * 420);
          ctx.sfx.cupDone();
          renderBar(true);
          ctx.changed();
          later(() => ctx.win(), 1500);
          break;
        }
        default: break;
      }
    }
    function zzz(b) {
      const k = K(b.z), x = SX(b.x, k) + RW * k * 0.5, y = Y(b.z) - RW * k * 1.2;
      parts.push({ ty: 'text', text: 'z', x, y, vx: 18, vy: -30, r: 14 + Math.random() * 8, t0: performance.now() / 1000, life: 1.4, col: C.zzz });
    }

    /* ---------- ciclo ---------- */
    function loop(now) {
      if (!el.isConnected) { stop(); detach(); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const t = now / 1000;
      if (now - themeAt > 1000) { themeAt = now; theme(false); }   // tema cambiato dal sistema: controllo leggero, 1 volta al secondo
      if (!paused && dt > 0 && !P.isOver(s)) {
        let input = null;
        if (keyDir) input = { dir: keyDir };
        else if (keyStop) { input = { dir: 0 }; keyStop = false; }
        else if (drag) input = { x: drag.tx };
        const ev = P.step(s, dt, input);
        if (s.ready <= 0 && !s.wait) scroll += s.speed * dt;
        ev.forEach((e) => onEvent(e, t));
        if (ev.length) renderBar(false);
      }
      if (bossBlow > 0) bossBlow -= dt;
      const v = dt > 0 ? (s.px - prevPx) / dt : 0;
      prevPx = s.px;
      lean += (Math.max(-0.22, Math.min(0.22, v * 0.07)) - lean) * Math.min(1, dt * 12);
      draw(now);
      const live = !paused && (!P.isOver(s) || (party && now - party < 1800) || (over && now - over < 1200));
      raf = live ? requestAnimationFrame(loop) : 0;
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function pause() {
      if (paused || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = false;
      pauseBtn.innerHTML = PLAY;
      drag = null; keyDir = 0;
      stop();
      draw(performance.now());
      ctx.changed();
    }
    function resume() {
      if (!paused || P.isOver(s)) return;
      paused = false;
      pauseEl.hidden = true;
      pauseBtn.innerHTML = PAUSE;
      // un attimo per rimettere il dito sul sentiero
      if (s.ready <= 0) s.ready = P.READY * 0.7;
      s.wait = true;
      ready();
      ctx.sfx.set();
      start();
    }
    const toggle = () => (paused ? resume() : pause());
    function kick() {
      if (s.wait && P.start(s) && msg.querySelector('.hint')) msg.classList.remove('show');
    }

    /* ---------- controlli ---------- */
    el.onpointerdown = (e) => {
      if (e.target.closest('.sr-pbtn')) { e.preventDefault(); toggle(); return; }
      if (!e.target.closest('.sr-stage')) return;
      e.preventDefault();
      if (paused) { resume(); return; }
      if (P.isOver(s)) return;
      // trascinamento relativo: il dito può stare ovunque sul sentiero, Hari segue lo spostamento
      drag = { id: e.pointerId, x0: e.clientX, p0: s.tx != null ? s.tx : s.px, tx: s.tx != null ? s.tx : s.px };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ }
      kick();
    };
    el.onpointermove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = (e.clientX - drag.x0) / Math.max(1, W);
      drag.tx = Math.max(-P.X_MAX, Math.min(P.X_MAX, drag.p0 + dx * 2.4));
      // oltre il bordo: si riparte da lì, così tornare indietro risponde subito
      if (drag.tx === P.X_MAX || drag.tx === -P.X_MAX) { drag.p0 = drag.tx; drag.x0 = e.clientX; }
    };
    el.onpointerup = el.onpointercancel = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
    el.oncontextmenu = (e) => { if (e.target.closest('.sr-stage')) e.preventDefault(); };

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
        keyDir = KEYS[e.key]; drag = null;
        kick();
        return;
      }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (e.key === ' ' && e.target && e.target.closest && e.target.closest('button') && !e.target.closest('.sr-wrap')) return;
        e.preventDefault(); if (e.key === 'Escape') pause(); else toggle();
      }
    }
    function onKeyUp(e) { if (e.key in KEYS && KEYS[e.key] === keyDir) { keyDir = 0; keyStop = true; } }
    function onVis() { if (!el.isConnected) { detach(); return; } if (document.hidden) pause(); }
    function onTheme() { if (!el.isConnected) { detach(); return; } theme(false); draw(performance.now()); }
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function detach() {
      G.removeEventListener('keydown', onKey);
      G.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVis);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._srRO) { el._srRO.disconnect(); el._srRO = null; }
      clearTimers();
    }
    if (el._srDetach) el._srDetach();
    el._srDetach = detach;
    G.addEventListener('keydown', onKey);
    G.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVis);
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop();
      s = state;
      s.waitMode = true; s.wait = true;       // parte al primo trascinamento/freccia, mai da sola
      paused = false; drag = null; keyDir = 0; scroll = s.t * s.speed; lastBossPct = s.boss ? s.bossFed / s.bossMax : 0;
      build();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; pauseBtn.innerHTML = PLAY; later(() => draw(performance.now()), 120); return; }
      ready();
      start();
      // le bitmap si cuociono in modo asincrono: un paio di ridisegni anche da fermi
      later(() => { if (!raf) draw(performance.now()); }, 150);
    }
    function fresh() { begin(P.newLevel(ctx.level, Math.random)); ctx.changed({ reset: true }); }

    const ok = saved && saved.v === 1 && Array.isArray(saved.script) && Array.isArray(saved.animals) && saved.level > 0 && saved.bossMax > 0;
    if (ok && !P.isOver(saved)) begin(Object.assign({}, saved), true);
    else fresh();

    return {
      fresh,
      restart() { begin(P.newLevel(s.level, Math.random)); ctx.changed({ reset: true }); },
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },          // usato dall'app quando si apre il tutorial
      resume() { resume(); },
      snapshot: () => s,
    };
  }
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13c0 .8.9 1.3 1.6.8l10-6.5c.6-.4.6-1.2 0-1.6l-10-6.5C8.9 4.2 8 4.7 8 5.5z" fill="currentColor"/></svg>';

  /* tutorial della prima partita */
  const fly = (k, x, y, cls) => `<g class="sr-tut-fly ${cls}">${svgAt(TREAT[k], x, y, 7)}</g>`;
  const TUT = [
    { key: 'tu_snack_1', en: 'Drag left and right (or use the arrows): Hari tosses snacks all by himself.',
      art: roadArt(`<g class="sr-tut-run">${svgAt(HARI_BACK(0), 45, 56, 30)}${fly('seed', 56, 52, '')}${fly('seed', 58, 52, 'd2')}</g>
        ${HH.tutHand(84, 70, 'tut-go', '--dx:-34px;--dy:0px')}`) },
    { key: 'tu_snack_2', en: 'Walk through the best gate: × and + mean more snacks, − and ÷ mean fewer!',
      art: roadArt(`<g class="sr-tut-gate">${gateSVG(30, 40, 26, 16, '×2', true)}</g>${gateSVG(64, 40, 26, 16, '−1', false)}
        ${svgAt(HARI_BACK(1), 30, 58, 28)}${fly('strawberry', 40, 52, '')}${fly('blueberry', 46, 52, 'd2')}`) },
    { key: 'tu_snack_3', en: 'Feed the hungry animals before they reach your snacks. Dodge the big eater’s bubbles and fill its tummy!',
      art: roadArt(`${svgAt(boss('polar', ''), 44, 6, 30)}
        <g class="sr-tut-bye">${svgAt(ANIMAL.chick(0, 'joy'), 30, 36, 16)}</g>${svgAt(ANIMAL.piggy(1, ''), 64, 38, 17)}
        ${fly('cherry', 56, 58, '')}${fly('cherry', 62, 58, 'd3')}
        ${svgAt(HARI_BACK(0), 46, 62, 26)}`) },
  ];
  HH.games.push({
    id: 'snack', name: 'Hari Snack Rush', rules: 'r11',
    rulesEn: 'Drag left and right: Hari tosses seeds and fruit to the hungry animals, who hop home happy once full. Pick the best gates for more snacks, dodge the big eater’s bubbles and fill its tummy!',
    art, create, lives: 3,
    tutorial: TUT,
    rate: (s) => HH.snack.rate(s),
    // durata del copione più il tempo medio per riempire l'animalone (circa 15–40 s)
    parTime: (s) => Math.round(s.end + 15 + s.bossMax / 18),
    progress: (s) => HH.snack.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
