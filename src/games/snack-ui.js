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
    // novità, power-up e grandi merende
    sr_new: 'New!', sr_bup: 'Bup!', sr_bump: 'Bump!', sr_splash: 'Splash!', sr_sent: 'Sent back!', sr_hungry: 'Still hungry!',
    sr_back: 'Toss snacks at it to send it back!',
    sr_n_puddle: 'Puddles: step around them!', sr_n_hay: 'Rolling hay bales!', sr_n_cart: 'Fruit carts!',
    sr_n_pu: 'Grab the bubbles: power-ups!', sr_n_pu2: 'New power-ups!', sr_n_hamster: 'Speedy hamsters!', sr_n_frog: 'Frogs hop across!',
    sr_n_gift: 'Gift gates: fewer snacks, a present!', sr_n_swap: 'Watch out: gates swap!', sr_n_big: 'A wave of big eaters!',
    sr_pu_rapid: 'Rapid toss!', sr_pu_double: 'Double snacks!', sr_pu_magnet: 'Snack magnet!', sr_pu_shield: 'Basket shield!',
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
    // criceto velocissimo con le guance piene
    hamster: (fr, m) => `${feet(fr, 'var(--sr-ham-2)', 40, 60, 7)}
      <circle cx="29" cy="38" r="8.5" fill="var(--sr-ham)" ${o(2)}/><circle cx="29" cy="39" r="4.2" fill="var(--sr-bunny-in)"/>
      <circle cx="71" cy="38" r="8.5" fill="var(--sr-ham)" ${o(2)}/><circle cx="71" cy="39" r="4.2" fill="var(--sr-bunny-in)"/>
      <ellipse cx="50" cy="63" rx="30" ry="28" fill="var(--sr-ham)" ${o(2.2)}/>
      <ellipse cx="50" cy="72" rx="19" ry="16" fill="var(--sr-ham-belly)"/>
      <path d="M79 60a30 28 0 0 1-48 24 33 30 0 0 0 48-24z" fill="var(--sr-ham-2)" opacity=".45"/>
      <ellipse cx="31" cy="68" rx="9" ry="7.5" fill="var(--sr-ham-belly)" ${o(1.4)}/><ellipse cx="69" cy="68" rx="9" ry="7.5" fill="var(--sr-ham-belly)" ${o(1.4)}/>
      ${face(50, 56, 11, m)}
      <ellipse cx="50" cy="61.5" rx="2.4" ry="1.8" fill="var(--sr-nose)"/>
      <path d="M${fr ? 40 : 42} 84l-4 5M${fr ? 60 : 58} 84l4 5" ${o(1.6)}/>
      ${hi('M27 52q3-12 14-16')}`,
    // ranocchia che salta da una parte all'altra del sentiero
    frog: (fr, m) => `${feet(fr, 'var(--sr-frog-2)', 33, 67, 11)}
      <ellipse cx="50" cy="66" rx="34" ry="25" fill="var(--sr-frog)" ${o(2.2)}/>
      <circle cx="33" cy="41" r="13" fill="var(--sr-frog)" ${o(2.2)}/><circle cx="67" cy="41" r="13" fill="var(--sr-frog)" ${o(2.2)}/>
      <ellipse cx="50" cy="56" rx="26" ry="10" fill="var(--sr-frog)"/>
      <ellipse cx="50" cy="75" rx="20" ry="12" fill="var(--sr-frog-belly)"/>
      <path d="M83 62a34 25 0 0 1-56 22 37 28 0 0 0 56-22z" fill="var(--sr-frog-2)" opacity=".5"/>
      ${face(50, 42, 17, m, 1.05, false)}
      ${m === 'joy' ? '<path d="M37 59q13 12 26 0z" fill="var(--sr-mouth)" stroke="var(--sr-nose)" stroke-width="1.6" stroke-linejoin="round"/>' : '<path d="M36 60q14 9 28 0" fill="none" stroke="var(--sr-nose)" stroke-width="2" stroke-linecap="round"/>'}
      ${hi('M24 62q2-9 9-13')}${hi('M25 36q3-6 8-7', 2.2, 0.9)}`,
  };

  /* ostacoli (niente di pericoloso: ci si inciampa e la merenda cade). La pozzanghera è dipinta sul sentiero */
  const OBSTS = {
    // rotolo di fieno visto di fianco: la spirale gira mentre rotola verso Hari
    hay: () => `<circle cx="50" cy="52" r="42" fill="var(--sr-hay)" ${o(2.6)}/>
      <path d="M88 48a42 42 0 0 1-74 26 46 46 0 0 0 74-26z" fill="var(--sr-hay-2)" opacity=".6"/>
      <path d="M50 52m-4 0a4 4 0 1 1 8 0a9 9 0 1 1-17 0a14 14 0 1 1 27 0a20 20 0 1 1-39 0a26 26 0 1 1 51 0a32 32 0 1 1-62 0" fill="none" stroke="var(--sr-hay-2)" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M10 40l-6-4M14 26l-6-6M30 12l-3-7M74 12l3-7M88 26l6-5M92 44l7-2M20 84l-6 5M80 86l5 6" ${o(2)}/>
      ${hi('M24 34q8-14 24-20', 3.4, 0.7)}`,
    cart: (fr) => `<path d="M14 30q36-22 72 0z" fill="var(--sr-awning)" ${o(2)}/>
      <path d="M26 24q6 9 12 6M44 21q6 10 12 0M62 22q6 9 12 4" fill="none" stroke="var(--sr-awning-2)" stroke-width="5" stroke-linecap="round"/>
      <path d="M22 30v16M78 30v16" ${o(2)}/>
      <circle cx="32" cy="46" r="8" fill="var(--sr-apple)" ${o(1.6)}/><circle cx="46" cy="44" r="8" fill="var(--sr-straw)" ${o(1.6)}/><circle cx="58" cy="46" r="7.5" fill="var(--sr-gold)" ${o(1.6)}/><circle cx="70" cy="45" r="8" fill="var(--sr-apple)" ${o(1.6)}/>
      <path d="M14 50h72l-5 30H19z" fill="var(--sr-cart)" ${o(2.2)}/><path d="M18 60h64M20 70h60" stroke="var(--sr-cart-2)" stroke-width="2.4"/>
      <circle cx="28" cy="84" r="9" fill="var(--sr-cart-2)" ${o(2)}/><circle cx="72" cy="84" r="9" fill="var(--sr-cart-2)" ${o(2)}/>
      <path d="M${fr ? '22 84h12M28 78v12' : '24 80l8 8M32 80l-8 8'}M${fr ? '66 84h12M72 78v12' : '68 80l8 8M76 80l-8 8'}" stroke="var(--sr-ink)" stroke-width="1.6" opacity=".6"/>
      ${hi('M20 56q2-4 6-4', 2.6, 0.6)}`,
  };
  /* power-up: bolla con l'icona dentro (viewBox 100, centrata) */
  const PUIC = {
    rapid: `<path d="M24 40h22M18 52h28M24 64h22" stroke="var(--sr-spark)" stroke-width="5" stroke-linecap="round"/>
      ${[40, 52, 64].map((y, i) => `<ellipse cx="${62 + (i % 2) * 6}" cy="${y}" rx="10" ry="6.5" fill="var(--sr-seed)" ${o(1.8)}/>`).join('')}`,
    double: `<path d="M38 60C42 42 48 32 58 22M64 56C64 42 62 32 58 22" fill="none" stroke="var(--sr-green-2)" stroke-width="3.6" stroke-linecap="round"/>
      <circle cx="36" cy="66" r="15" fill="var(--sr-cherry)" ${o(2.2)}/><circle cx="66" cy="62" r="15" fill="var(--sr-cherry)" ${o(2.2)}/>${hi('M28 62q2-6 7-7', 3)}${hi('M58 58q2-6 7-7', 3)}`,
    magnet: `<path d="M28 30v24a22 22 0 0 0 44 0V30H58v24a8 8 0 0 1-16 0V30z" fill="var(--sr-magnet)" ${o(2.2)}/>
      <path d="M28 30h14v10H28zM58 30h14v10H58z" fill="var(--sr-magnet-2)" ${o(1.8)}/>
      <path d="M20 20l-6-6M80 20l6-6M50 16v-8" stroke="var(--sr-spark)" stroke-width="4" stroke-linecap="round"/>`,
    shield: `<path d="M22 44h56l-6 34H28z" fill="var(--sr-basket)" ${o(2.2)}/><path d="M26 54h48M27 64h46" stroke="var(--sr-basket-2)" stroke-width="2.4"/>
      <path d="M26 44q24-30 48 0" fill="none" ${o(3)}/>
      <path d="M50 71c-6-4-9-7-9-11 0-3 2-5 4.5-5 2 0 3.5 1 4.5 2.6 1-1.6 2.5-2.6 4.5-2.6 2.5 0 4.5 2 4.5 5 0 4-3 7-9 11z" fill="var(--sr-heart)" ${o(1.2)}/>`,
  };
  const puBubble = (k) => `<circle cx="50" cy="50" r="44" fill="var(--sr-pu)" stroke="var(--sr-pu-2)" stroke-width="4"/>
    <g transform="translate(14 14) scale(.72)">${PUIC[k]}</g>
    <path d="M22 40q6-16 22-22" fill="none" stroke="var(--sr-hi)" stroke-width="6" stroke-linecap="round" opacity=".9"/><circle cx="72" cy="74" r="4" fill="var(--sr-hi)" opacity=".8"/>`;
  /* grandi merende dell'animalone: si rimandano indietro colpendole (viewBox 100, centrate) */
  const BALL = {
    acorn: `<path d="M50 94C26 88 18 66 20 48h60c2 18-6 40-30 46z" fill="var(--sr-acorn)" ${o(2.6)}/>
      <path d="M78 52c0 18-10 34-28 40 20-2 30-20 28-40z" fill="var(--sr-acorn-2)" opacity=".7"/>
      <path d="M14 50C14 30 30 18 50 18S86 30 86 50Z" fill="var(--sr-cap)" ${o(2.6)}/>
      <path d="M24 44l10-14M38 46l10-20M54 46l10-20M68 44l8-12M24 32l26 14M40 24l30 22M62 24l18 16" stroke="var(--sr-cap-2)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M50 18c0-8 4-12 10-14" fill="none" ${o(3.4)}/>${hi('M30 60q2 14 10 22', 4, 0.6)}`,
    yarn: `<circle cx="50" cy="52" r="40" fill="var(--sr-yarn)" ${o(2.6)}/>
      <path d="M16 40q34 10 66-14M12 58q40 6 76-22M18 74q40-2 66-40M30 88q30-14 50-50M60 14q-26 26-34 74" fill="none" stroke="var(--sr-yarn-2)" stroke-width="3" stroke-linecap="round"/>
      <path d="M86 70q10 10 4 22" fill="none" stroke="var(--sr-yarn)" stroke-width="5" stroke-linecap="round"/>${hi('M24 40q6-16 22-22', 4, 0.6)}`,
    muffin: `<path d="M18 52h64l-8 40H26z" fill="var(--sr-muffin-cup)" ${o(2.4)}/><path d="M30 54l4 36M42 54l2 38M56 54l-2 38M70 54l-4 36" stroke="var(--sr-muffin-cup-2)" stroke-width="2.6"/>
      <path d="M12 54C10 30 30 14 50 14S90 30 88 54C78 60 22 60 12 54Z" fill="var(--sr-muffin)" ${o(2.6)}/>
      ${[[32, 36], [52, 28], [68, 40], [44, 46], [60, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="var(--sr-blue)" ${o(1.4)}/>`).join('')}${hi('M24 40q4-14 18-20', 4, 0.7)}`,
    snowball: `<path d="M12 62C6 36 26 12 50 12S94 36 88 62C84 76 70 86 50 86S16 76 12 62Z" fill="var(--sr-gelato)" ${o(2.6)}/>
      <path d="M12 62c6 6 10 2 14 10s10 4 14 2 10 6 16 2 8 2 12-4 10 0 14-8c-4 14-20 22-38 22S16 76 12 62z" fill="var(--sr-gelato-2)"/>
      ${[[30, 34, 'var(--sr-straw)'], [46, 26, 'var(--sr-blue)'], [62, 32, 'var(--sr-gold)'], [72, 48, 'var(--sr-mint)'], [38, 50, 'var(--sr-heart)'], [56, 52, 'var(--sr-blue)']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="9" height="3.6" rx="1.8" transform="rotate(${(i * 47) % 180} ${x + 4.5} ${y + 1.8})" fill="${c}"/>`).join('')}
      <circle cx="50" cy="10" r="8" fill="var(--sr-cherry)" ${o(1.8)}/>${hi('M24 40q6-18 22-24', 5, 0.8)}`,
    bun: `<path d="M8 70C8 40 28 20 50 20S92 40 92 70C92 82 74 88 50 88S8 82 8 70Z" fill="var(--sr-bun)" ${o(2.6)}/>
      <path d="M90 66c0 14-18 20-40 20 26-2 38-10 40-20z" fill="var(--sr-bun-2)"/>
      <path d="M50 22q-4 12-16 16M50 22q4 12 16 16M50 22q-12 8-26 6M50 22q12 8 26 6M50 22v14" fill="none" stroke="var(--sr-bun-2)" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="50" cy="56" r="5" fill="var(--sr-sakura-in)"/>${hi('M22 52q4-14 16-20', 4, 0.8)}`,
    melon: `<circle cx="50" cy="52" r="42" fill="var(--sr-melon)" ${o(2.6)}/>
      <path d="M50 10C34 28 34 76 50 94M50 10C66 28 66 76 50 94M24 18C10 38 12 70 28 88M76 18C90 38 88 70 72 88" fill="none" stroke="var(--sr-melon-2)" stroke-width="7" stroke-linecap="round"/>
      <path d="M50 10c-2-6 0-10 6-12" fill="none" stroke="var(--sr-stem)" stroke-width="3.4" stroke-linecap="round"/>${hi('M22 40q6-16 22-24', 5, 0.7)}`,
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
    feather: `<path d="M50 92C46 70 30 50 34 30C38 16 50 8 62 10C72 24 70 46 60 66C56 76 52 84 50 92Z" fill="var(--sr-feather)" ${o(2.2)}/>
      <path d="M50 92C52 64 56 36 62 10" fill="none" stroke="var(--sr-feather-2)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M53 66l-12-8M55 52l-14-10M58 38l-12-12M54 60l10-8M57 46l10-10" fill="none" stroke="var(--sr-feather-2)" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`,
    flake: `<g stroke="var(--sr-flake-2)" stroke-width="9" stroke-linecap="round">${[0, 60, 120].map((a) => `<path d="M50 14V86" transform="rotate(${a} 50 50)"/>`).join('')}</g>
      <g stroke="var(--sr-flake)" stroke-width="5" stroke-linecap="round" fill="none">${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M50 50V16M50 28l-9-8M50 28l9-8" transform="rotate(${a} 50 50)"/>`).join('')}</g>
      <circle cx="50" cy="50" r="8" fill="var(--sr-flake)" stroke="var(--sr-flake-2)" stroke-width="2"/>`,
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
    panda: ['var(--sr-panda)', 'var(--sr-panda-2)', 'var(--sr-panda)'],
    hippo: ['var(--sr-hippo)', 'var(--sr-hippo-2)', 'var(--sr-hippo-in)'],
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
      panda: `<path d="M84 30l8-26M88 30l-2-24" stroke="var(--sr-bamboo-2)" stroke-width="2" /><path d="M86 96V12" stroke="var(--sr-bamboo)" stroke-width="7" stroke-linecap="round"/><path d="M82 40h8M82 64h8" stroke="var(--sr-bamboo-2)" stroke-width="2"/><path d="M86 22q10-6 14 2q-8 4-14-2z" fill="var(--sr-bamboo)" ${o(1.2)}/>`,
      hippo: '',
    }[kind];
    const ears = {
      squirrel: `<path d="M22 38L18 8L42 26Z" fill="${c1}" ${o(2)}/><path d="M25 32L23 15L36 26Z" fill="${c3}"/><path d="M18 8l-4-6M18 8l2-7" ${o(2)}/>
        <path d="M78 38L82 8L58 26Z" fill="${c1}" ${o(2)}/><path d="M75 32L77 15L64 26Z" fill="${c3}"/><path d="M82 8l4-6M82 8l-2-7" ${o(2)}/>`,
      polar: `<circle cx="25" cy="25" r="9" fill="${c1}" ${o(2)}/><circle cx="25" cy="26" r="4.6" fill="${c2}"/><circle cx="75" cy="25" r="9" fill="${c1}" ${o(2)}/><circle cx="75" cy="26" r="4.6" fill="${c2}"/>`,
      owl: `<path d="M22 34L16 8L40 24Z" fill="${c1}" ${o(2)}/><path d="M78 34L84 8L60 24Z" fill="${c1}" ${o(2)}/>`,
      kitty: `<path d="M20 38L20 8L44 24Z" fill="${c1}" ${o(2)}/><path d="M24 32L24 16L36 25Z" fill="var(--sr-cat-in)"/><path d="M80 38L80 8L56 24Z" fill="${c1}" ${o(2)}/><path d="M76 32L76 16L64 25Z" fill="var(--sr-cat-in)"/>`,
      panda: `<circle cx="24" cy="25" r="10" fill="${c2}" ${o(2)}/><circle cx="76" cy="25" r="10" fill="${c2}" ${o(2)}/>`,
      hippo: `<ellipse cx="27" cy="25" rx="7" ry="8" fill="${c1}" ${o(2)}/><ellipse cx="27" cy="26" rx="3.4" ry="4" fill="var(--sr-hippo-in)"/><ellipse cx="73" cy="25" rx="7" ry="8" fill="${c1}" ${o(2)}/><ellipse cx="73" cy="26" rx="3.4" ry="4" fill="var(--sr-hippo-in)"/>`,
    }[kind];
    const neck = {
      squirrel: '', owl: '', panda: '',
      hippo: `<path d="M28 66q22 9 44 0" fill="none" stroke="var(--sr-gold)" stroke-width="3" stroke-dasharray="0.1 6" stroke-linecap="round"/>`,
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
      panda: `<ellipse cx="50" cy="57" rx="10" ry="7" fill="${c1}" ${o(1.4)}/><ellipse cx="50" cy="53.5" rx="4" ry="2.8" fill="var(--sr-nose)"/>`,
      hippo: `<ellipse cx="50" cy="58" rx="22" ry="12" fill="var(--sr-hippo-in)" ${o(1.8)}/><ellipse cx="42" cy="54" rx="2.6" ry="3.4" fill="var(--sr-hippo-2)"/><ellipse cx="58" cy="54" rx="2.6" ry="3.4" fill="var(--sr-hippo-2)"/>`,
    }[kind];
    const ringEyes = kind === 'owl' ? `<circle cx="37" cy="44" r="12" fill="var(--sr-owl-eye)" ${o(1.8)}/><circle cx="63" cy="44" r="12" fill="var(--sr-owl-eye)" ${o(1.8)}/>`
      : kind === 'panda' ? `<ellipse cx="36" cy="45" rx="10" ry="12.5" transform="rotate(28 36 45)" fill="${c2}"/><ellipse cx="64" cy="45" rx="10" ry="12.5" transform="rotate(-28 64 45)" fill="${c2}"/>` : '';
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
  const GIFT = `<path d="M18 44h64v44H18z" fill="var(--sr-gift)" ${o(2.4)}/><path d="M12 32h76v14H12z" fill="var(--sr-gift)" ${o(2.4)}/>
    <path d="M44 32h12v56H44z" fill="var(--sr-gift-2)" ${o(1.6)}/>
    <path d="M50 32C40 14 22 18 30 30zM50 32C60 14 78 18 70 30z" fill="var(--sr-gift-2)" ${o(2)}/>${hi('M22 52v14', 3, 0.6)}`;
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
    'tummy', 'tummy-2', 'tummy-bg', 'zzz', 'lamp-glow', 'night', 'water', 'water-2', 'danger', 'danger-2', 'fall', 'fall-2', 'pu-2'];
  const FOC = 9;           // "focale": quanto si stringe il sentiero verso l'orizzonte

  function create(el, ctx, saved) {
    const P = HH.snack;
    let s, raf = 0, last = 0, paused = false, party = 0, over = 0, timers = [], goTimer = 0;
    let wrap, stage, cv, g, msg, pauseEl, bar, pauseBtn, powEl;
    let W = 300, H = 450, dpr = 1, yH = 0, yB = 0, RW = 0;
    let C = {}, IMG = {}, bg = null, themeKey = '', themeAt = 0;
    let drag = null, keyDir = 0, keyStop = false, lastChanged = 0, lastBossPct = 0, tossKick = 0, prevPx = 0, lean = 0;
    let nibbles = new Map(), ghosts = [], parts = [], oopsT = 0, bossYum = 0, bossBlow = 0, scroll = 0, sndNib = 0, sndFull = 0;
    let newEl, newQ = [], newBusy = 0, swapT = new Map(), hitT = new Map(), sndHit = 0, phaseT = 0;
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    /* ---------- costruzione ---------- */
    function build() {
      clearTimers();
      el.innerHTML = `<div class="sr-wrap sr-${s.season || 'spring'}" dir="ltr">
        <div class="sr-bar">
          <span class="sr-pow" role="img" aria-label="${L('sr_power')}"><span class="sr-ic"></span><b></b></span>
          <span class="sr-track" aria-hidden="true"><i class="sr-fill"></i><span class="sr-rider">${HH.mascot.mini()}</span><span class="sr-flag">${`<svg viewBox="0 0 100 100">${boss(s.bossKind, '')}</svg>`}</span></span>
          <button class="sr-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button>
        </div>
        <div class="sr-stage" tabindex="0" role="application" aria-label="${L('sr_board')}">
          <canvas class="sr-cv"></canvas>
          <div class="sr-msg" aria-live="polite"></div>
          <div class="sr-new" aria-live="polite" hidden><span class="sr-new-tag"></span><span class="sr-new-ic"></span><b></b></div>
          <div class="sr-pause" hidden><span class="sr-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div>
        </div>
      </div>`;
      wrap = el.querySelector('.sr-wrap');
      newEl = el.querySelector('.sr-new'); newQ = []; newBusy = 0;
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
      want.drop = DROP[s.drop] || DROP.shell;
      want.ball = BALL[s.ball] || BALL.acorn;
      for (const k of Object.keys(OBSTS)) { want[`o_${k}0`] = OBSTS[k](0); want[`o_${k}1`] = OBSTS[k](1); }
      for (const k of P.PUS) { want[`pu_${k}`] = puBubble(k); want[`pi_${k}`] = PUIC[k]; }
      for (const k of P.TREATS) want[`t_${k}`] = TREAT[k];
      want.tree = TREE; want.bush = BUSH; want.lamp = LAMP; want.gift = GIFT;
      const size = (k) => (k.startsWith('boss') || k === 'tree' || k === 'ball' ? 280 : k.startsWith('t_') || k.startsWith('pi_') ? 64 : k.startsWith('pu_') ? 120 : 180);
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
        let tx = (x0 + x1) / 2;
        const ty = top + h * 0.5;
        // appena scambiata: il numero scivola dall'altra parte
        const swAge = t - (swapT.get(gt.id) || -9);
        if (swAge < 0.28 && !reduce()) { const e = 1 - swAge / 0.28; tx += (W / 2 - tx) * 2 * e * e; }
        g.strokeText(opText(op), tx, ty);
        g.fillStyle = C.text; g.fillText(opText(op), tx, ty);
        // porta regalo: un pacchetto col power-up sopra il pannello
        if (gt.gift && gt.gift.side === side) {
          const gw = h * 0.62, gx = tx, gy = top - 4 * k;
          sprite('gift', gx - gw * 0.36, gy, gw, a, false, reduce() ? 0 : Math.sin(t * 5) * 0.08);
          const im = IMG[`pi_${gt.gift.pu}`];
          if (im) g.drawImage(im, gx + gw * 0.02, gy - gw * 0.86, gw * 0.7, gw * 0.7);
        }
      }
      // porte che si scambiano: frecce che girano tra i due pannelli
      if (gt.sw && gt.z > P.SWAP_STOP) {
        const cx = W / 2, cy = y - h * 1.18, r = Math.max(5, h * 0.24), rot = reduce() ? 0 : t * 4;
        g.lineWidth = Math.max(2, r * 0.32); g.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          const a0 = rot + i * Math.PI, a1 = a0 + Math.PI * 0.7;
          g.strokeStyle = C['text-line']; g.lineWidth = Math.max(3.5, r * 0.55);
          g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
          g.strokeStyle = C.gold; g.lineWidth = Math.max(2, r * 0.32);
          g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
          const ex = cx + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r, d = a1 + Math.PI / 2;
          g.fillStyle = C.gold;
          g.beginPath(); g.moveTo(ex + Math.cos(d) * r * 0.5, ey + Math.sin(d) * r * 0.5); g.lineTo(ex + Math.cos(d + 2.4) * r * 0.45, ey + Math.sin(d + 2.4) * r * 0.45); g.lineTo(ex + Math.cos(d - 2.4) * r * 0.45, ey + Math.sin(d - 2.4) * r * 0.45); g.closePath(); g.fill();
        }
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

    /* ---------- ostacoli, power-up, grandi merende ---------- */
    function drawObst(ob, t) {
      const O = P.OBST[ob.kind], k = K(ob.z), x = SX(ob.x, k), y = Y(ob.z), al = fadeIn(ob.z);
      if (ob.kind === 'puddle') {
        // pozzanghera dipinta sul sentiero, con un'increspatura che si allarga
        const rx = O.r * RW * k * 1.1, ry = rx * 0.3;
        g.globalAlpha = al;
        g.fillStyle = C.water; g.strokeStyle = C.ink; g.lineWidth = Math.max(0.8, 1.6 * k);
        g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.stroke();
        g.fillStyle = C['water-2'];
        g.beginPath(); g.ellipse(x - rx * 0.25, y - ry * 0.25, rx * 0.4, ry * 0.32, 0, 0, 7); g.fill();
        if (!reduce()) {
          const p = (t * 0.9 + ob.id * 0.37) % 1;
          g.strokeStyle = C['water-2']; g.lineWidth = Math.max(0.6, 1.4 * k); g.globalAlpha = al * (1 - p);
          g.beginPath(); g.ellipse(x + rx * 0.2, y + ry * 0.1, rx * 0.25 * (0.4 + p), ry * 0.25 * (0.4 + p), 0, 0, 7); g.stroke();
        }
        g.globalAlpha = 1;
        return;
      }
      const w = 2 * O.r * RW * k * (ob.kind === 'cart' ? 1.4 : 1.35);
      const fr = reduce() ? 0 : Math.floor(t * 6 + ob.id) % 2;
      const bob = reduce() ? 0 : Math.abs(Math.sin(t * 9 + ob.id)) * w * (ob.kind === 'hay' ? 0.05 : 0.015);
      shadow(x, y, w * 0.4);
      if (ob.kind === 'hay') {
        // il rotolo gira su se stesso (perno al centro)
        const im = IMG.o_hay0;
        if (im) { g.save(); g.globalAlpha = al; g.translate(x, y - bob - w * 0.46); if (!reduce()) g.rotate(t * 5 + ob.id); g.drawImage(im, -w / 2, -w * 0.52, w, w); g.restore(); }
        return;
      }
      sprite(`o_${ob.kind}${fr}`, x, y - bob, w, al, false, reduce() ? 0 : Math.sin(t * 7 + ob.id) * 0.03);
    }
    function drawPu(p, t) {
      const k = K(p.z), x = SX(p.x, k), w = 0.56 * RW * k, bob = reduce() ? 0 : Math.sin(t * 4 + p.id) * w * 0.12;
      const y = Y(p.z) - 0.3 * RW * k;
      shadow(x, Y(p.z), w * 0.3);
      sprite(`pu_${p.pu}`, x, y + w * 0.5 + bob, w, fadeIn(p.z), false, reduce() ? 0 : Math.sin(t * 2 + p.id) * 0.1);
    }
    function drawBall(q, t) {
      const k = K(q.z), x = SX(q.x, k), w = Math.max(6, 2 * q.r * RW * k * 1.12);
      let y = Y(q.z);
      if (q.back) {
        // rimandata: vola ad arco verso l'animalone, con una scia di stelline
        const b = s.boss, span = Math.max(1, (b ? b.z : P.BOSS_Z) - 1);
        y -= Math.sin(Math.min(1, q.z / span) * Math.PI) * RW * 0.5 * k + w * 0.1;
        if (!reduce() && Math.random() < 0.5) parts.push({ ty: 'spark', x: x + (Math.random() - 0.5) * w * 0.5, y: y - w * 0.4, vx: 0, vy: 20, r: 4 + w * 0.04, t0: t, life: 0.4, col: C.gold });
      } else shadow(x, y, w * 0.4);
      const pop = t - (hitT.get(q.id) || -9) < 0.1 ? 0.06 : 0;
      const spin = reduce() ? 0 : q.k === 'yarn' || q.k === 'melon' ? t * (q.back ? -6 : 3) : Math.sin(t * 8 + q.id) * 0.08;
      sprite('ball', x, y + w * 0.06, w * (1 + pop), 1, false, spin, -pop);
      if (q.back) return;
      // quante merende servono ancora: numerino su un pancino che si riempie
      // sopra la merenda; su quelle enormi, dentro (resta visibile sotto la barra della pancia)
      const fs = Math.max(10, Math.min(22, w * 0.2)), by = w > RW * 0.7 ? y - w * 0.62 : Math.max(44, y - w * 1.02);
      const bw = Math.max(fs * 2.8, Math.min(w * 0.6, fs * 4.4)), bh = fs * 1.35;
      g.font = `${fs}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = C['tummy-bg']; g.strokeStyle = C.ink; g.lineWidth = Math.max(1.2, fs * 0.1);
      rr(x - bw / 2, by - bh / 2, bw, bh, bh / 2); g.fill(); g.stroke();
      const fill = 1 - q.hp / q.max;
      if (fill > 0) { g.fillStyle = C.gold; rr(x - bw / 2 + 2, by - bh / 2 + 2, (bw - 4) * fill, bh - 4, (bh - 4) / 2); g.fill(); }
      g.lineWidth = Math.max(2, fs * 0.22); g.strokeStyle = C['text-line']; g.lineJoin = 'round';
      g.strokeText(String(q.hp), x, by + fs * 0.04);
      g.fillStyle = C.text; g.fillText(String(q.hp), x, by + fs * 0.04);
      // pericolo: sta per prendere Hari
      if (q.z < 8 && Math.abs(q.x - s.px) < q.r + P.HARI_R) {
        const a = reduce() ? 1 : 0.55 + 0.45 * Math.sin(t * 16);
        g.globalAlpha = a;
        g.font = `${fs * 1.3}px "Mochiy Pop One", sans-serif`;
        g.lineWidth = fs * 0.28; g.strokeStyle = C['text-line'];
        g.strokeText('!', x + bw / 2 + fs * 0.6, by); g.fillStyle = C.danger; g.fillText('!', x + bw / 2 + fs * 0.6, by);
        g.globalAlpha = 1;
      }
    }
    // dove arriveranno ostacoli e grandi merende: una fascia che lampeggia sulla linea di Hari
    function drawDanger(t) {
      const y = Y(0), list = [];
      for (const ob of s.obst) if (ob.z < 10) list.push([ob.x, P.OBST[ob.kind].r, ob.z]);
      for (const q of s.balls) if (!q.back && q.z < 11) list.push([q.x, q.r, q.z]);
      let hot = 0;
      for (const [x, r, z] of list) {
        const near = 1 - Math.min(1, (z - P.LINE_Z) / 10), on = Math.abs(x - s.px) < r + P.HARI_R;
        if (on && z < 6) hot = Math.max(hot, near);
        const x0 = SX(Math.max(-1.05, x - r), 1), x1 = SX(Math.min(1.05, x + r), 1), h = Math.max(5, H * 0.012);
        g.globalAlpha = (0.18 + near * 0.5) * (reduce() ? 1 : 0.75 + 0.25 * Math.sin(t * 12));
        g.fillStyle = C.danger; rr(x0, y - h / 2, x1 - x0, h, h / 2); g.fill();
        g.globalAlpha = 0.35 + near * 0.5; g.strokeStyle = C['danger-2']; g.lineWidth = 1.5; g.setLineDash([5, 4]);
        rr(x0, y - h / 2, x1 - x0, h, h / 2); g.stroke(); g.setLineDash([]);
      }
      g.globalAlpha = 1;
      return hot;
    }
    function vignette(hot, t) {
      if (hot <= 0) return;
      const a = hot * (reduce() ? 0.35 : 0.22 + 0.18 * Math.sin(t * 14));
      const gr = g.createLinearGradient(0, H, 0, H * 0.6);
      gr.addColorStop(0, C.danger); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = Math.max(0, a); g.fillStyle = gr; g.fillRect(0, H * 0.6, W, H * 0.4); g.globalAlpha = 1;
    }
    // power-up attivi: bollini in alto a sinistra con l'anello del tempo che resta
    function drawHud() {
      const on = [];
      for (const k of ['rapid', 'double', 'magnet']) if (s.fx && s.fx[k] > 0) on.push([k, s.fx[k] / P.PU_TIME[k]]);
      if (s.shield) on.push(['shield', 1]);
      const r = 15, y = s.boss ? 48 : 22;
      on.forEach(([k, f], i) => {
        const x = 22 + i * (r * 2 + 6);
        g.fillStyle = C['tummy-bg']; g.strokeStyle = C.ink; g.lineWidth = 1.6;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = C.gold; g.lineWidth = 3.4; g.lineCap = 'round';
        g.beginPath(); g.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.stroke();
        const im = IMG[`pi_${k}`];
        if (im) g.drawImage(im, x - r * 0.72, y - r * 0.72, r * 1.44, r * 1.44);
      });
    }
    // stagione: foglie in autunno, neve d'inverno, petali in primavera, lucciole d'estate
    function drawSeason(t) {
      if (reduce()) return;
      const kind = s.season || 'spring', n = kind === 'winter' ? 22 : 12;
      for (let i = 0; i < n; i++) {
        const h1 = ((i * 2654435761) >>> 0) / 4294967296, h2 = ((i * 40503 + 7) % 1000) / 1000;
        if (kind === 'summer') {
          // lucciole (di giorno appena accennate)
          const x = (h1 * W + Math.sin(t * 0.7 + i) * 24 + W) % W, y = yH + (H - yH) * (0.1 + 0.55 * h2) + Math.sin(t * 1.3 + i * 2) * 10;
          g.globalAlpha = (C.night ? 0.5 : 0.25) * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
          g.fillStyle = C.fall; g.beginPath(); g.arc(x, y, 2.4 + h2 * 1.6, 0, 7); g.fill();
          continue;
        }
        const vy = (kind === 'winter' ? 22 : 30) + h2 * 26, y = ((t * vy + h1 * H * 1.2) % (H * 1.1)) - H * 0.05;
        const x = (h2 * W * 1.3 + Math.sin(t * (0.8 + h1) + i) * 26 + t * (kind === 'winter' ? 6 : 14)) % (W * 1.1) - W * 0.05;
        g.globalAlpha = kind === 'winter' ? 0.85 : 0.75;
        g.fillStyle = i % 3 ? C.fall : C['fall-2'];
        g.beginPath();
        if (kind === 'winter') g.arc(x, y, 1.6 + h1 * 2.2, 0, 7);
        else g.ellipse(x, y, 3.6 + h1 * 2, 2 + h1, t * 2 + i, 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
    }

    function drawBoss(b, t) {
      const k = K(b.z), x = SX(b.x, k), w = 3.2 * P.BOSS_R * RW * k;
      let y = Y(b.z);
      const bob = reduce() || party ? 0 : Math.sin(t * 4) * w * 0.02;
      const breath = party ? Math.sin(t * 2.2) * 0.025 : 0;
      const sq = reduce() ? 0 : Math.sin(t * 8) * 0.015 + (bossBlow > 0 ? -0.06 : 0) + breath;
      shadow(x, y, w * 0.36);
      const yum = t - bossYum < 0.16;
      const name = party ? 'bossZ' : bossBlow > 0 ? 'bossB' : yum ? 'bossY' : 'boss';
      // fase nuova: un attimo di agitazione (saltella)
      if (!reduce() && t - phaseT < 0.8) y -= Math.abs(Math.sin((t - phaseT) * 16)) * w * 0.06;
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
      const hot = drawDanger(t);
      // tutto ciò che sta sul sentiero, dal più lontano al più vicino
      const list = [];
      for (const it of drawScenery()) list.push([it[0], 0, it]);
      for (const gt of s.gates) list.push([gt.z, 1, gt]);
      for (const a of s.animals) if (a.z < P.Z_FAR + 1.5) list.push([a.z, 2, a]);
      if (s.boss) list.push([s.boss.z, 3, s.boss]);
      for (const q of s.drops) list.push([q.z, 4, q]);
      for (const ob of s.obst) if (ob.z < P.Z_FAR + 1.5) list.push([ob.z, ob.kind === 'puddle' ? 0.5 : 1.5, ob]);
      for (const p of s.pus) list.push([p.z, 1.6, p]);
      for (const q of s.balls) list.push([q.z, 2.5, q]);
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
        else if (type === 0.5 || type === 1.5) drawObst(o2, t);
        else if (type === 1.6) drawPu(o2, t);
        else if (type === 2.5) drawBall(o2, t);
        else if (type === 2) drawAnimal(o2, t);
        else if (type === 3) drawBoss(o2, t);
        else if (type === 4) drawDrop(o2, t);
        else if (type === 5) drawTreat(o2, t);
        else { drawGhosts(t); drawHari(t); }
      }
      drawSeason(t);
      vignette(hot, t);
      drawParts(t);
      drawBossBar();
      drawHud();
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
          float(L({ boop: 'sr_boop', bup: 'sr_bup', bump: 'sr_bump', splash: 'sr_splash' }[e.what] || 'sr_snatch'), p.x, p.y - 20, C.heart, e.what === 'bup' ? 24 : 18, 1.1);
          if (e.what === 'splash') puff(s.px, 0.3, 8, 1.1);
          if (e.what === 'bup' || e.what === 'bump') ctx.sfx.boing();
          if (!reduce()) { stage.classList.remove('wobble'); void stage.offsetWidth; stage.classList.add('wobble'); }
          ctx.mistake(e.left);
          changed(true);
          break;
        }
        case 'lose': over = performance.now(); break;
        case 'shield': {
          // il cestino-scudo para il colpo
          const p = at(s.px, 0, 1.1);
          sparks(p.x, p.y, 12, C.gold, 1.3);
          float('♥', p.x, p.y - 20, C.heart, 26, 1);
          ctx.sfx.heart();
          changed(true);
          break;
        }
        case 'swap': swapT.set(e.id, t); ctx.sfx.tap(); break;
        case 'pu': {
          const p = at(e.x, 0.4, 0.8);
          sparks(p.x, p.y, 12, C.gold, 1.2);
          float(L(`sr_pu_${e.pu}`), p.x, p.y - 30, C.gold, 20, 1.3);
          ctx.sfx.cupDone();
          changed(true);
          break;
        }
        case 'puMiss': { const p = at(e.x, 0.4, 0.4); puff(e.x, 0.4, 5, 0.7); sparks(p.x, p.y, 3, C.puff, 0.6); break; }
        case 'ball': ctx.sfx.boing(); bossBlow = 0.4; break;
        case 'hit': {
          hitT.set(e.id, t);
          const p = at(e.x, e.z, 0.5);
          sparks(p.x, p.y, 2, C.gold, Math.max(0.5, p.k));
          if (t - sndHit > 0.1) { sndHit = t; ctx.sfx.mark(); }
          break;
        }
        case 'sent': {
          const p = at(e.x, e.z, 0.9);
          sparks(p.x, p.y, 14, C.gold, 1.4);
          float(L('sr_sent'), p.x, p.y - 16, C.gold, 22, 1.2);
          ctx.sfx.place();
          break;
        }
        case 'backFeed': {
          bossYum = t;
          if (s.boss) { hearts(e.x, s.boss.z, 4, 1.4); const p = at(s.boss.x, s.boss.z, 1.6); float(`+${e.bonus}`, p.x, p.y, C.tummy, 24, 1.2); }
          ctx.sfx.cupDone();
          changed(true);
          break;
        }
        case 'roll': ctx.sfx.set(); break;
        case 'phase': phaseT = t; say(L('sr_hungry'), 'boss', 1300); ctx.sfx.milestone(); break;
        case 'new': showNew(e.what); break;
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
    /* cartello "Nuovo!": cosa compare per la prima volta in questo livello (uno alla volta) */
    function newArt(w) {
      const svg = (inner) => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
      if (w === 'puddle') return svg('<ellipse cx="50" cy="62" rx="42" ry="16" fill="var(--sr-water)" stroke="var(--sr-ink)" stroke-width="2"/><ellipse cx="38" cy="58" rx="14" ry="5" fill="var(--sr-water-2)"/>');
      if (w === 'hay' || w === 'cart') return svg(OBSTS[w](0));
      if (w === 'pu' || w === 'pu2') return svg(puBubble(w === 'pu' ? 'rapid' : 'shield'));
      if (w === 'hamster' || w === 'frog') return svg(ANIMAL[w](0, ''));
      if (w === 'big') return svg(ANIMAL.bear(0, ''));
      if (w === 'gift') return svg(GIFT);
      if (w === 'swap') return svg('<path d="M20 40h50l-12-12M80 62H30l12 12" fill="none" stroke="var(--sr-gold)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>');
      if (w === 'back') return svg(BALL[s.ball] || BALL.acorn);
      if (COL[w]) return svg(boss(w, ''));
      return '';
    }
    function showNew(w) {
      if (!newEl) return;
      newQ.push(w);
      if (!newBusy) nextNew();
    }
    function nextNew() {
      const w = newQ.shift();
      if (!w) { newBusy = 0; return; }
      newBusy = 1;
      const text = w === 'back' ? L('sr_back') : COL[w] ? L('sr_boss') : L(`sr_n_${w}`);
      newEl.querySelector('.sr-new-tag').textContent = L('sr_new');
      newEl.querySelector('.sr-new-ic').innerHTML = newArt(w);
      newEl.querySelector('b').textContent = text;
      newEl.hidden = false;
      newEl.classList.remove('show'); void newEl.offsetWidth; newEl.classList.add('show');
      ctx.sfx.star(1);
      later(() => { newEl.classList.remove('show'); later(() => { newEl.hidden = true; nextNew(); }, 260); }, w === 'back' ? 3200 : 2600);
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

    if (saved && saved.v === 1 && P.migrate) P.migrate(saved);
    const ok = saved && saved.v === 2 && Array.isArray(saved.script) && Array.isArray(saved.animals) && saved.level > 0 && saved.bossMax > 0;
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
    parTime: (s) => Math.round(s.end + 25 + s.bossMax / 18),
    progress: (s) => HH.snack.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
