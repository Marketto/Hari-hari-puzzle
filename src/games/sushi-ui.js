/* Sushi Bar — interfaccia.
 * Bancone con i clienti (ordine nel fumetto + barra della pazienza), nastro con gli ingredienti che scorre,
 * tagliere di Hari cuoco. Tocca un ingrediente sul nastro per metterlo sul tagliere, tocca il cliente per servire.
 * Il ciclo di gioco gira con requestAnimationFrame e si ferma da solo se la schermata viene chiusa.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  /* ---------- disegni in stile anime: contorno morbido, ombra "cel" piatta, riflessi bianchi ---------- */
  const o = (w = 2) => `stroke="var(--su-ink)" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const hi = (d, w = 2.2, op = 0.9) => `<path d="${d}" fill="none" stroke="var(--su-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const grains = (pts, c = 'var(--su-grain)') => pts.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="1.3" transform="rotate(${r} ${x} ${y})" fill="none" stroke="${c}" stroke-width="1.1"/>`).join('');
  const block = (top, front, side, lines) => `<path d="M8 16l6-5h19l-5 5z" fill="${top}"/><path d="M8 16h20v13H8z" fill="${front}"/><path d="M28 16l5-5v13l-5 5z" fill="${side}"/>${lines}<path d="M8 16l6-5h19v13l-5 5H8zM8 16h20l5-5M28 16v13" fill="none" ${o(1.9)}/>`;

  /* ingredienti (viewBox 40×40) */
  const ING = {
    rice: `<path d="M6 28c0-9 6-16 14-16s14 7 14 16c0 3-6 5-14 5S6 31 6 28z" fill="var(--su-rice)" ${o()}/>
      <path d="M7.5 29c2 2 6 3 12.5 3s10.5-1 12.5-3c-.5-2-1-3-1.6-4-1.5 3-5 4.5-10.9 4.5S10.6 28 9.2 25c-.7 1.2-1.3 2.6-1.7 4z" fill="var(--su-rice-2)"/>
      ${grains([[14, 22, -20], [19, 18, 10], [25, 21, 30], [28, 26, -10], [17, 27, 15], [22, 25, -30], [12, 27, 40]])}${hi('M11 20q3-5 8-6')}`,
    nori: `<path d="M8 9h21l4 4v18H8z" fill="var(--su-nori)" ${o()}/><path d="M28 13h5v18h-5z" fill="var(--su-nori-2)"/><path d="M29 9v4h4" fill="var(--su-nori-3)" ${o(1.6)}/>
      <path d="M11.5 14h9M11.5 19h13M11.5 24h7M22 26h3" stroke="var(--su-nori-3)" stroke-width="1.6" stroke-linecap="round"/>${hi('M11 29l7-7', 2, 0.35)}`,
    salmon: `<path d="M5 25c5-11 23-15 30-7-5 9-24 13-30 7z" fill="var(--su-salmon)" ${o()}/>
      <path d="M7 26.5c9 2.5 20-1 27-8.2-3 6-15 12-27 8.2z" fill="var(--su-salmon-2)"/>
      <path d="M12 25c3-5 7-8 11-9M17.5 27c3-4 7-7 12-8.5M24 27c2-3 5-5 8.5-6.5" fill="none" stroke="var(--su-salmon-fat)" stroke-width="2.2" stroke-linecap="round"/>${hi('M10 20.5q4-4 9.5-5')}`,
    tuna: block('var(--su-tuna-hi)', 'var(--su-tuna)', 'var(--su-tuna-2)', `<path d="M11 20q4 2 8 0M13 25q4 2 9 0" fill="none" stroke="var(--su-tuna-hi)" stroke-width="1.6" stroke-linecap="round"/>${hi('M10.5 18.5h5', 2, 0.8)}`),
    cucumber: `<circle cx="20" cy="20" r="13" fill="var(--su-cuke-2)" ${o()}/><circle cx="20" cy="20" r="10.6" fill="var(--su-cuke)"/><circle cx="20" cy="20" r="8.2" fill="var(--su-cuke-in)"/>
      ${[0, 60, 120, 180, 240, 300].map((a) => { const x = (20 + 4.4 * Math.cos(a * Math.PI / 180)).toFixed(1), y = (20 + 4.4 * Math.sin(a * Math.PI / 180)).toFixed(1); return `<ellipse cx="${x}" cy="${y}" rx="1.1" ry="1.9" transform="rotate(${a + 90} ${x} ${y})" fill="var(--su-cuke-seed)"/>`; }).join('')}
      <path d="M20 28.2a8.2 8.2 0 0 0 8.2-8.2 9.5 9.5 0 0 1-8.2 5.5z" fill="var(--su-cuke)" opacity=".55"/>${hi('M12 15a9 9 0 0 1 6-5')}`,
    egg: block('var(--su-egg-hi)', 'var(--su-egg)', 'var(--su-egg-2)', `<path d="M8 20.3h20M8 24.6h20M28 20.3l5-5M28 24.6l5-5" stroke="var(--su-egg-3)" stroke-width="1.3"/>${hi('M10.5 18h6', 2, 0.85)}`),
    shrimp: `<path d="M10 26c0-10 10-16 20-12-6 0-10 4-10 9 0 3 2 5 5 5-6 4-15 3-15-2z" fill="var(--su-shrimp)" ${o()}/>
      <path d="M11 27.5c1 3 8 4 14 .5-3 .5-5-1-5.5-3-2.5 2-5.5 3-8.5 2.5z" fill="var(--su-shrimp-2)"/>
      <path d="M14.5 19.5l3.5 3M18.5 16.5l2.5 4M23 14.6l1.2 4" stroke="var(--su-shrimp-2)" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M29 14.4l6.5-5.4.8 6.6-5.2 1.2z" fill="var(--su-shrimp-tail)" ${o(1.6)}/><path d="M32.5 12l.6 3" stroke="var(--su-shrimp-2)" stroke-width="1.2" stroke-linecap="round"/>${hi('M13 23q1-5 5-7.5', 1.8)}`,
    avocado: `<path d="M20 5c7.5 0 12.5 9 12.5 17.5a12.5 12.5 0 0 1-25 0C7.5 14 12.5 5 20 5z" fill="var(--su-avo-2)" ${o()}/>
      <path d="M20 8c5.8 0 10 7.6 10 14.4a10 10 0 0 1-20 0C10 15.6 14.2 8 20 8z" fill="var(--su-avo)"/>
      <path d="M20 11c4.4 0 7.6 6 7.6 11.4a7.6 7.6 0 0 1-15.2 0C12.4 17 15.6 11 20 11z" fill="var(--su-avo-in)"/>
      <circle cx="20" cy="24" r="5.2" fill="var(--su-pit)" ${o(1.4)}/><path d="M20 29.2a5.2 5.2 0 0 0 5.2-5.2 6 6 0 0 1-5.2 3.6z" fill="var(--su-pit-2)"/><circle cx="18.2" cy="22" r="1.4" fill="var(--su-hi)" opacity=".85"/>${hi('M13.5 15q2-5 5-6.5', 1.8)}`,
  };
  const ingSVG = (k, cls = '') => `<svg class="su-ing ${cls}" viewBox="0 0 40 40" aria-hidden="true">${ING[k]}</svg>`;

  /* piatti finiti (viewBox 48×40) */
  const RICE_BED = `<path d="M8 28c0-5 7-8 16-8s16 3 16 8-7 7-16 7S8 33 8 28z" fill="var(--su-rice)" ${o()}/>
    <path d="M9.2 30c2.5 2.6 8 4 14.8 4s12.3-1.4 14.8-4c-3 1.6-8 2.4-14.8 2.4S12.2 31.6 9.2 30z" fill="var(--su-rice-2)"/>${grains([[14, 30, 10], [21, 32, -15], [29, 31, 20], [35, 29, -10]])}`;
  const nigiri = (topping) => RICE_BED + topping;
  const roll = (side, top, inner, fill) => `<path d="M9 18v7c0 5.5 6.7 10 15 10s15-4.5 15-10v-7" fill="${side}" ${o()}/>
    <ellipse cx="24" cy="18" rx="15" ry="9.5" fill="${top}" ${o()}/>${inner}${fill}${hi('M12 27q2 3.5 6 5', 1.8, 0.45)}`;
  const riceRing = `<ellipse cx="24" cy="18" rx="11.6" ry="7.2" fill="var(--su-rice)"/>${grains([[16, 17, -30], [20, 13, 0], [29, 13, 20], [32, 19, -20], [27, 23, 10], [18, 22, 30]])}`;
  const DISH = {
    onigiri: `<path d="M24 5c5 0 16 18 16 24 0 3.5-3.5 6-16 6S8 32.5 8 29C8 23 19 5 24 5z" fill="var(--su-rice)" ${o()}/>
      <path d="M38.5 27c1 4-4 6.5-14.5 6.5S8.5 31 9.5 27c2.5 2 7 3 14.5 3s12-1 14.5-3z" fill="var(--su-rice-2)"/>
      <rect x="16" y="23.5" width="16" height="11.5" rx="2" fill="var(--su-nori)" ${o(1.6)}/><path d="M19 27h7M19 30.5h10" stroke="var(--su-nori-3)" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="20.5" cy="17.5" r="1.5" fill="var(--su-eye)"/><circle cx="27.5" cy="17.5" r="1.5" fill="var(--su-eye)"/><path d="M22.5 19.8q1.5 1.4 3 0" fill="none" stroke="var(--su-eye)" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="18" cy="20.6" rx="2" ry="1.1" fill="var(--petal)" opacity=".85"/><ellipse cx="30" cy="20.6" rx="2" ry="1.1" fill="var(--petal)" opacity=".85"/>${hi('M17 15q2.5-5 5-7.5', 2)}`,
    sake: nigiri(`<path d="M7 22c6-9 27-11 33-3-5 6-28 8-33 3z" fill="var(--su-salmon)" ${o()}/><path d="M9 23.5c9 2 22 0 30-4.2-6 5-21 7.2-30 4.2z" fill="var(--su-salmon-2)"/>
      <path d="M15 22c3-3 6-4.2 9-4.6M21 23.4c3-3 6.5-4.4 9.5-4.6M28 23.5c2-2 4.5-3.2 7-3.6" stroke="var(--su-salmon-fat)" stroke-width="2" fill="none" stroke-linecap="round"/>${hi('M12 19.5q4-3 9-3.6', 1.8)}`),
    maguro: nigiri(`<path d="M7 21c6-7 27-8 33-2-5 5-28 7-33 2z" fill="var(--su-tuna)" ${o()}/><path d="M9 22.5c9 1.8 22 .3 30-3.4-6 4.4-21 6.2-30 3.4z" fill="var(--su-tuna-2)"/>
      <path d="M15 20q5-2.5 10-2.2M24 21.5q5-2 9-2.4" stroke="var(--su-tuna-hi)" stroke-width="1.6" fill="none" stroke-linecap="round"/>${hi('M12 18.5q4-2.4 8.5-2.8', 1.8)}`),
    ebi: nigiri(`<path d="M7 22c4-8 22-11 30-6l5-4v7c-6 6-29 9-35 3z" fill="var(--su-shrimp)" ${o()}/><path d="M9 24c8 1.8 21 0 30-5.4-5 5.4-20 8-30 5.4z" fill="var(--su-shrimp-2)"/>
      <path d="M15 18.5v4.5M21 17v5M27 16.6v5" stroke="var(--su-salmon-fat)" stroke-width="1.8" stroke-linecap="round"/><path d="M37 16l5-4v7z" fill="var(--su-shrimp-tail)" ${o(1.6)}/>${hi('M11 20q2-2 4-2.6', 1.6)}`),
    tamago: nigiri(`<path d="M10 12l2-2h26v12l-2 2H10z" fill="var(--su-egg-2)" ${o()}/><rect x="10" y="12" width="26" height="12" rx="1.5" fill="var(--su-egg)" ${o()}/><path d="M10 16h26M10 20h26" stroke="var(--su-egg-3)" stroke-width="1.2"/>
      <rect x="20" y="9.5" width="8" height="25" rx="1.5" fill="var(--su-nori)" ${o(1.6)}/>${hi('M12.5 14h5', 1.6)}`),
    kappa: roll('var(--su-nori-2)', 'var(--su-nori)', riceRing, `<ellipse cx="24" cy="18" rx="4.6" ry="3" fill="var(--su-cuke)" ${o(1.3)}/><ellipse cx="23" cy="17.3" rx="2" ry="1.1" fill="var(--su-cuke-in)"/>`),
    sakemaki: roll('var(--su-nori-2)', 'var(--su-nori)', riceRing, `<ellipse cx="24" cy="18" rx="4.6" ry="3" fill="var(--su-salmon)" ${o(1.3)}/><path d="M21.5 18.5q2.5-2 5-1.5" stroke="var(--su-salmon-fat)" stroke-width="1.2" fill="none" stroke-linecap="round"/>`),
    california: roll('var(--su-rice-2)', 'var(--su-rice)', `<g fill="var(--su-roe)">${[[13, 16], [17, 11.5], [24, 10], [31, 11.5], [35.5, 16], [33, 22], [15, 22], [24, 25], [13, 30], [24, 33.5], [35, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join('')}</g><ellipse cx="24" cy="18" rx="7.6" ry="4.9" fill="var(--su-nori)"/>`,
      `<ellipse cx="24" cy="18" rx="5.4" ry="3.3" fill="var(--su-rice)"/><path d="M19.8 18a4.2 2.6 0 0 1 8.4 0z" fill="var(--su-avo)"/><path d="M19.8 18a4.2 2.6 0 0 0 8.4 0z" fill="var(--su-crab)"/>`),
    temaki: `<path d="M9 11l30 2-13 25z" fill="var(--su-nori)" ${o()}/><path d="M24 12.2l15 .8-13 25z" fill="var(--su-nori-2)"/>
      <ellipse cx="24" cy="11.6" rx="15" ry="5" fill="var(--su-rice)" ${o()}/><path d="M14 9c3-6 9-6 11 0z" fill="var(--su-tuna)" ${o(1.4)}/><path d="M24.5 9c2-6 8-6 10 0z" fill="var(--su-avo)" ${o(1.4)}/>
      <path d="M19 9.5l-2-4" stroke="var(--su-cuke)" stroke-width="2.2" stroke-linecap="round"/><path d="M16 20l3 6" stroke="var(--su-nori-3)" stroke-width="1.4" stroke-linecap="round"/>${hi('M16.5 8q1.5-2.5 4-3', 1.4)}`,
  };
  const dishSVG = (id) => `<svg class="su-dish" viewBox="0 0 48 40" aria-hidden="true">${DISH[id]}</svg>`;

  /* clienti (viewBox 64×80): spalle con kimono, testa, occhioni anime con due riflessi, guanciotte, zampine sul bancone */
  const FACE = { bunny: 'var(--su-a1)', cat: 'var(--su-a2)', panda: 'var(--su-a1)', frog: 'var(--su-a4)', fox: 'var(--su-a5)', bear: 'var(--su-a6)', chick: 'var(--su-a7)', penguin: 'var(--su-a8)' };
  const KIMONO = { bunny: 'var(--su-k1)', cat: 'var(--su-k2)', panda: 'var(--su-k4)', frog: 'var(--su-k3)', fox: 'var(--su-k2)', bear: 'var(--su-k1)', chick: 'var(--su-k3)', penguin: 'var(--su-k4)' };
  const EARS = {
    bunny: `<g class="su-ears"><path d="M17 26C11 14 14 1 20 1s7 14 5 23z" fill="var(--su-a1)" ${o(2.2)}/><path d="M47 26c6-12 3-25-3-25s-7 14-5 23z" fill="var(--su-a1)" ${o(2.2)}/>
      <path d="M19.5 22c-3-8-2-16 1-16s3 9 2.5 15z" fill="var(--petal)"/><path d="M44.5 22c3-8 2-16-1-16s-3 9-2.5 15z" fill="var(--petal)"/></g>`,
    cat: `<path d="M12 28l3-19 13 10zM52 28l-3-19-13 10z" fill="var(--su-a2)" ${o(2.2)}/><path d="M15.5 23l1.6-9 6.2 5zM48.5 23l-1.6-9-6.2 5z" fill="var(--petal)"/>`,
    panda: `<circle cx="15" cy="18" r="7.5" fill="var(--su-ink)"/><circle cx="49" cy="18" r="7.5" fill="var(--su-ink)"/>`,
    frog: `<circle cx="20" cy="18" r="9.5" fill="var(--su-a4)" ${o(2.2)}/><circle cx="44" cy="18" r="9.5" fill="var(--su-a4)" ${o(2.2)}/>`,
    fox: `<path d="M10 30l5-23 14 12zM54 30l-5-23-14 12z" fill="var(--su-a5)" ${o(2.2)}/><path d="M14.5 22l2-10 7 6zM49.5 22l-2-10-7 6z" fill="var(--su-a1)"/>`,
    bear: `<circle cx="15" cy="18" r="7.5" fill="var(--su-a6)" ${o(2.2)}/><circle cx="49" cy="18" r="7.5" fill="var(--su-a6)" ${o(2.2)}/><circle cx="15" cy="18.5" r="3.8" fill="var(--su-a6-in)"/><circle cx="49" cy="18.5" r="3.8" fill="var(--su-a6-in)"/>`,
    chick: `<path d="M32 13c-3-6 2-9 3.5-4 1.5-5 6.5-2.5 2.5 3" fill="var(--su-a7)" ${o(2)}/>`,
    penguin: '',
  };
  const EXTRA = {
    panda: '<ellipse cx="23" cy="38" rx="6.5" ry="7.5" fill="var(--su-ink)" transform="rotate(-25 23 38)"/><ellipse cx="41" cy="38" rx="6.5" ry="7.5" fill="var(--su-ink)" transform="rotate(25 41 38)"/>',
    fox: '<path d="M14 42c6 9 30 9 36 0-3 13-33 13-36 0z" fill="var(--su-a1)"/>',
    penguin: '<path d="M17 33c0-7 6-9 15-5 9-4 15-2 15 5 0 13-6 19-15 19s-15-6-15-19z" fill="var(--su-a1)"/>',
    frog: '<path d="M18 49q14 6 28 0" fill="none" stroke="var(--su-a4-2)" stroke-width="2" stroke-linecap="round"/>',
    bear: '<ellipse cx="32" cy="45.5" rx="7.5" ry="5.5" fill="var(--su-a6-in)"/>',
  };
  const eye = (cx) => `<g class="su-eye"><ellipse cx="${cx}" cy="38" rx="4.3" ry="5.4" fill="var(--su-eye)"/>
    <ellipse cx="${cx}" cy="40.3" rx="3.2" ry="2.5" fill="var(--su-iris)"/>
    <circle cx="${cx + 1.4}" cy="35.8" r="1.8" fill="var(--su-hi)"/><circle cx="${cx - 1.5}" cy="40.6" r=".85" fill="var(--su-hi)"/></g>`;
  function animalSVG(a) {
    const beak = a === 'chick' || a === 'penguin' ? '<path d="M28.5 45.5l3.5 4 3.5-4q-3.5-1.6-7 0z" fill="var(--su-beak)" stroke="var(--su-ink)" stroke-width="1.5" stroke-linejoin="round"/>'
      : '<path d="M30.2 45.2q1.8-1 3.6 0-1.8 2-3.6 0z" fill="var(--su-ink)"/>';
    const k = KIMONO[a];
    return `<svg class="su-animal" viewBox="0 0 64 80" aria-hidden="true"><g class="su-bob">
      <path d="M8 80c0-14 9-22 24-22s24 8 24 22z" fill="${k}" ${o(2.2)}/>
      <path d="M8.6 74c2-8 7-12 13-14-3 4-4 9-4 20H8z" fill="var(--su-ink)" opacity=".1"/>
      <path d="M23 58.5L32 72l9-13.5" fill="none" stroke="var(--su-hi)" stroke-width="4" stroke-linejoin="round"/><path d="M21.5 58.6L32 74l10.5-15.4" fill="none" ${o(1.6)}/>
      <path d="M45 66l3 3M47.5 63l3 3" stroke="var(--su-hi)" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
      ${EARS[a]}
      <circle cx="32" cy="38" r="21" fill="${FACE[a]}" ${o(2.3)}/>
      <path d="M53 38A21 21 0 0 1 25 57.8 25 25 0 0 0 53 38z" fill="var(--su-ink)" opacity=".09"/>
      ${EXTRA[a] || ''}
      ${hi('M17 29a17 17 0 0 1 8-9', 2.2, 0.75)}
      <g class="su-eyes">${eye(23.5)}${eye(40.5)}</g>
      <g class="su-blush"><ellipse cx="16.5" cy="45" rx="4" ry="2.4" fill="var(--petal)" opacity=".85"/><ellipse cx="47.5" cy="45" rx="4" ry="2.4" fill="var(--petal)" opacity=".85"/>
      <path d="M14.5 45.6l1.4-2M17.5 45.6l1.4-2M45.5 45.6l1.4-2M48.5 45.6l1.4-2" stroke="var(--su-blush-line)" stroke-width="1" stroke-linecap="round"/></g>
      ${beak}
      <path class="su-smile" d="M28 48.5q2 2.2 4 0q2 2.2 4 0" fill="none" stroke="var(--su-ink)" stroke-width="1.7" stroke-linecap="round"/>
      <path class="su-frown" d="M28.5 51q3.5-3 7 0" fill="none" stroke="var(--su-ink)" stroke-width="1.8" stroke-linecap="round"/>
      <path class="su-brows" d="M18 30.5l7 2.2M46 30.5l-7 2.2" stroke="var(--su-ink)" stroke-width="2" stroke-linecap="round"/>
      <path class="su-sweat" d="M52 26c2 3 3 5 1 6.5s-3.5-1.5-1-6.5z" fill="var(--su-sweat)" stroke="var(--su-ink)" stroke-width="1.2"/>
      <ellipse cx="19" cy="76" rx="6" ry="4" fill="${FACE[a]}" ${o(1.8)}/><ellipse cx="45" cy="76" rx="6" ry="4" fill="${FACE[a]}" ${o(1.8)}/>
    </g></svg>`;
  }

  /* fascia hachimaki per Hari cuoco (sopra la testa mini, viewBox 100×100) */
  const HACHIMAKI = `<svg class="su-hachi" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M18 40Q50 27 82 40L81 48Q50 36 19 48Z" fill="var(--su-hat)" ${o(2.2)}/><path d="M30 37.5Q50 32 70 37.5" fill="none" stroke="var(--su-band)" stroke-width="2.2" stroke-linecap="round"/>
    <g class="su-tails"><path d="M80 42q10-2 16-10q-2 9-12 14z" fill="var(--su-hat)" ${o(2)}/><path d="M80 46q9 4 13 14q-8-5-14-10z" fill="var(--su-hat)" ${o(2)}/></g>
    <circle cx="81" cy="44" r="4" fill="var(--su-hat)" ${o(2)}/></svg>`;

  /* piattino del nastro: bordo colorato come nei kaiten-zushi */
  const PLATES = ['var(--su-plate-1)', 'var(--su-plate-2)', 'var(--su-plate-3)'];
  const plateSVG = (id) => `<svg class="su-plate" viewBox="0 0 52 20" aria-hidden="true"><ellipse cx="26" cy="11" rx="24" ry="8" fill="var(--su-dishplate)" ${o(1.5)}/>
    <ellipse cx="26" cy="10" rx="17" ry="5" fill="none" stroke="${PLATES[id % 3]}" stroke-width="2.6"/><path d="M5 13q21 8 42 0" fill="none" stroke="var(--su-plate-sh)" stroke-width="2"/></svg>`;

  /* secchio di legno (oke) per buttare il tagliere */
  const BUCKET = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 13h26l-3 22H10z" fill="var(--su-wood)" ${o(2)}/>
    <path d="M13 13.5l1 21M20 13.5v21.5M27 13.5l-1 21" stroke="var(--su-wood-3)" stroke-width="1.4" opacity=".6"/>
    <path d="M7.6 18h24.8M9.3 30h21.4" stroke="var(--su-copper)" stroke-width="3"/><ellipse cx="20" cy="13" rx="13" ry="3.5" fill="var(--su-wood-2)" ${o(2)}/>
    <path d="M30 18l-2 15" stroke="var(--su-ink)" stroke-width="1" opacity=".15"/>${hi('M11 20l1 9', 1.6, 0.6)}</svg>`;

  /* sfondo del locale (viewBox 400×200, ancorato in basso) */
  const lantern = (x, d) => `<g class="su-lantern" style="animation-delay:${d}s"><path d="M${x} 10v14" stroke="var(--su-ink)" stroke-width="1.6"/>
    <circle cx="${x}" cy="46" r="26" fill="var(--su-glow)"/>
    <rect x="${x - 9}" y="22" width="18" height="6" rx="2" fill="var(--su-lantern-cap)" ${o(1.6)}/>
    <ellipse cx="${x}" cy="46" rx="16" ry="19" fill="var(--su-lantern)" ${o(2)}/>
    <path d="M${x - 15} 40h30M${x - 15.6} 46h31.2M${x - 15} 52h30" stroke="var(--su-lantern-2)" stroke-width="1.4" opacity=".75"/>
    <path d="M${x} 27.5v37" stroke="var(--su-lantern-2)" stroke-width="1.2" opacity=".5"/>
    <path d="M${x + 15.5} 46a16 19 0 0 1-12 18.2 20 19 0 0 0 12-18.2z" fill="var(--su-ink)" opacity=".12"/>
    <rect x="${x - 9}" y="63" width="18" height="6" rx="2" fill="var(--su-lantern-cap)" ${o(1.6)}/><path d="M${x} 69v7" stroke="var(--su-lantern-cap)" stroke-width="2.4" stroke-linecap="round"/>
    ${hi(`M${x - 10} 38q1-6 5-9`, 2, 0.7)}</g>`;
  const blossom = (x, y, r = 4) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="${-r}" rx="${r * 0.62}" ry="${r * 0.85}" transform="rotate(${a})" fill="var(--su-sakura)"/>`).join('')}<circle r="${r * 0.38}" fill="var(--su-sakura-in)"/></g>`;
  const BACKDROP = `<svg class="su-backdrop" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="400" height="200" fill="var(--su-wall)"/>
    <rect y="150" width="400" height="50" fill="var(--su-wall-2)"/><path d="${Array.from({ length: 20 }, (_, i) => `M${10 + i * 20} 152V200`).join('')}" stroke="var(--su-beam)" stroke-width="1.5" opacity=".35"/>
    <rect y="146" width="400" height="6" fill="var(--su-beam)"/>
    <g class="su-window"><circle cx="200" cy="80" r="44" fill="var(--su-window)"/>
      <path d="M200 36V124M156 80H244M170 46v68M230 46v68M160 58h80M160 102h80" stroke="var(--su-beam-2)" stroke-width="2" opacity=".55"/>
      <path d="M150 52c30 6 50 22 70 26s30 2 34 -2" fill="none" stroke="var(--su-branch)" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M188 66c4-8 10-12 18-12" fill="none" stroke="var(--su-branch)" stroke-width="2.4" stroke-linecap="round"/>
      ${blossom(172, 58, 5)}${blossom(206, 54, 4.5)}${blossom(222, 79, 5.5)}${blossom(194, 72, 4)}${blossom(247, 75, 4)}
      <circle cx="200" cy="80" r="44" fill="none" stroke="var(--su-beam)" stroke-width="7"/><circle cx="200" cy="80" r="47.5" fill="none" ${o(1.6)}/></g>
    ${[[108, 'var(--su-plate-1)'], [128, 'var(--su-plate-2)'], [272, 'var(--su-plate-3)'], [292, 'var(--su-plate-1)']].map(([x, c]) => `<g><rect x="${x - 8}" y="22" width="16" height="40" rx="2" fill="var(--su-tag)" ${o(1.4)}/><circle cx="${x}" cy="31" r="3.4" fill="${c}"/><path d="M${x - 3} 40h6M${x - 3} 46h6M${x - 3} 52h4" stroke="var(--su-ink)" stroke-width="1.6" stroke-linecap="round" opacity=".45"/></g>`).join('')}
    <rect y="0" width="400" height="12" fill="var(--su-beam)"/><rect y="11" width="400" height="2" fill="var(--su-beam-2)"/>
    <rect x="0" y="0" width="10" height="200" fill="var(--su-beam)"/><rect x="390" y="0" width="10" height="200" fill="var(--su-beam)"/>
    ${lantern(46, 0)}${lantern(354, 1.1)}
    ${blossom(320, 128, 3)}${blossom(84, 120, 2.6)}
  </svg>`;
  const NOREN = `<svg class="su-noren" viewBox="0 0 400 44" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    ${[0, 1, 2, 3].map((i) => { const x = 4 + i * 98.5, c = i % 2 ? 'var(--su-noren-2)' : 'var(--su-noren)';
      return `<g class="su-flap" style="animation-delay:${(i * 0.35).toFixed(2)}s"><path d="M${x} 4h94v34q-47 6-94 0z" fill="${c}" ${o(1.8)}/>
      <path d="M${x + 6} 31q8-5 16 0t16 0t16 0t16 0t16 0" fill="none" stroke="var(--su-hi)" stroke-width="1.8" opacity=".55"/>
      ${blossom(x + 47, 19, 6.5)}<path d="M${x + 3} 8v26" stroke="var(--su-hi)" stroke-width="1.6" opacity=".35" stroke-linecap="round"/></g>`; }).join('')}
    <rect x="0" y="0" width="400" height="7" rx="3.5" fill="var(--su-beam)" ${o(1.6)}/>
  </svg>`;

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <rect x="4" y="2" width="112" height="10" rx="4" fill="var(--su-noren)"/><rect x="40" y="2" width="38" height="10" fill="var(--su-noren-2)"/>
    <rect x="4" y="38" width="112" height="7" rx="3" fill="var(--su-wood)"/>
    <rect x="4" y="54" width="112" height="18" rx="9" fill="var(--su-belt)"/>
    <rect x="4" y="54" width="112" height="4" rx="2" fill="var(--su-hi)" opacity=".3"/>
    ${[['salmon', 6, 0], ['rice', 40, 1], ['tuna', 74, 2]].map(([k, x, p]) => `<g transform="translate(${x} 46)"><svg y="10" width="40" height="15" viewBox="0 0 52 20">${plateSVG(p).replace(/<svg[^>]*>|<\/svg>/g, '')}</svg><svg x="8" y="0" width="24" height="24" viewBox="0 0 40 40">${ING[k]}</svg></g>`).join('')}
    <svg x="6" y="4" width="36" height="45" viewBox="0 0 64 80">${animalSVG('cat').replace(/<svg[^>]*>|<\/svg>$/g, '')}</svg>
    <svg x="78" y="4" width="36" height="45" viewBox="0 0 64 80">${animalSVG('bunny').replace(/<svg[^>]*>|<\/svg>$/g, '')}</svg>
    <svg x="44" y="12" width="32" height="27" viewBox="0 0 48 40">${DISH.sake}</svg>
  </svg>`;

  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function create(el, ctx, saved) {
    const S = HH.sushi;
    const t = HH.i18n.t;
    let s, raf = 0, last = 0;
    let seatEls = [], beltEl, beltItems = new Map(), boardEl, servedEl;

    function fresh() {
      s = S.newLevel(ctx.level, Math.random);
      s.moves = 0; s.mistakes = 0;
      build();
      ctx.changed({ reset: true });
      start();
    }

    /* ---------- DOM ---------- */
    function build() {
      el.innerHTML = `<div class="su-wrap">
        <div class="su-shop">
          ${NOREN}
          <div class="su-counter">${BACKDROP}${s.seats.map((_, i) => `<button class="su-seat" data-seat="${i}"></button>`).join('')}</div>
        </div>
        <div class="su-belt" style="--dur:${(1 / s.cfg.speed / 3).toFixed(2)}s"><div class="su-belt-track"></div></div>
        <div class="su-kitchen">
          <div class="su-chef">${HH.mascot.mini()}${HACHIMAKI}</div>
          <div class="su-board" aria-live="polite"></div>
          <button class="su-trash" aria-label="${t('trash')}">${BUCKET}</button>
        </div>
        <div class="su-served"></div>
      </div>`;
      seatEls = [...el.querySelectorAll('.su-seat')];
      beltEl = el.querySelector('.su-belt-track');
      boardEl = el.querySelector('.su-board');
      servedEl = el.querySelector('.su-served');
      beltItems = new Map();
      s.belt.forEach(addItem);
      s.seats.forEach((c, i) => renderSeat(i));
      renderBoard();
      renderServed();
      positionItems();
    }

    function renderSeat(i, anim = '') {
      const c = s.seats[i], b = seatEls[i];
      if (!c) { b.className = 'su-seat empty'; b.innerHTML = '<span class="su-stool" aria-hidden="true"></span>'; b.removeAttribute('aria-label'); return; }
      b.className = `su-seat ${anim}`;
      b.setAttribute('aria-label', `${c.animal}: ${c.recipe.ing.join(', ')}`);
      b.innerHTML = `<span class="su-order">${dishSVG(c.recipe.id)}<span class="su-recipe">${c.recipe.ing.map((k) => ingSVG(k, 'mini')).join('')}</span></span>
        ${animalSVG(c.animal)}
        <span class="su-patience"><i></i></span>`;
      updatePatience(i);
    }
    function updatePatience(i) {
      const c = s.seats[i];
      if (!c) return;
      const p = Math.max(0, c.patience / c.max);
      const bar = seatEls[i].querySelector('.su-patience i');
      if (bar) { bar.style.width = `${p * 100}%`; bar.dataset.level = p < 0.3 ? 'low' : p < 0.6 ? 'mid' : 'ok'; }
      seatEls[i].classList.toggle('grumpy', p < 0.3);
    }

    function addItem(it) {
      const b = document.createElement('button');
      b.className = 'su-item';
      b.dataset.id = it.id;
      b.setAttribute('aria-label', it.ing);
      b.innerHTML = `${plateSVG(it.id)}${ingSVG(it.ing)}`;
      beltEl.appendChild(b);
      beltItems.set(it.id, b);
    }
    function positionItems() {
      const W = beltEl.clientWidth, sz = 52;
      s.belt.forEach((it) => {
        const b = beltItems.get(it.id);
        if (b) b.style.transform = `translateX(${(it.x * (W + sz) - sz).toFixed(1)}px)`;
      });
    }
    function renderBoard(pop = false) {
      const slots = [];
      for (let k = 0; k < S.PLATE_MAX; k++) {
        const ing = s.plate[k];
        slots.push(`<span class="su-slot${ing ? ' full' : ''}${pop && k === s.plate.length - 1 ? ' pop' : ''}">${ing ? ingSVG(ing) : ''}</span>`);
      }
      boardEl.innerHTML = slots.join('');
      const ready = s.seats.findIndex((c) => c && S.matches(s.plate, c.recipe.ing));
      seatEls.forEach((b, i) => b.classList.toggle('ready', i === ready));
    }
    function renderServed() {
      servedEl.innerHTML = `<i class="su-served-ic">${dishSVG('sake')}</i><span>${t('served')}</span><b>${s.served}</b><span>/ ${s.goal}</span>
        <span class="su-progress"><i style="width:${(s.served / s.goal) * 100}%"></i></span>`;
    }

    /* ---------- ciclo di gioco ---------- */
    function loop(now) {
      if (!el.isConnected) { raf = 0; return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (dt > 0 && !S.isOver(s)) {
        const ev = S.step(s, dt, Math.random);
        ev.forEach(onEvent);
        s.seats.forEach((_, i) => updatePatience(i));
        positionItems();
      }
      if (S.isOver(s)) { raf = 0; return; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }

    function onEvent(e) {
      if (e.type === 'item') { addItem(e.item); return; }
      if (e.type === 'gone') { const b = beltItems.get(e.item.id); if (b) b.remove(); beltItems.delete(e.item.id); return; }
      if (e.type === 'arrive') { renderSeat(e.seat, 'arrive'); ctx.sfx.blip(); renderBoard(); return; }
      if (e.type === 'lost') {
        const b = seatEls[e.seat];
        b.innerHTML = `${animalSVG(e.c.animal)}<span class="su-storm" aria-hidden="true"></span>`;
        b.className = 'su-seat leaving angry';
        s.mistakes = s.lost;
        ctx.mistake(S.LIVES - s.lost);
        ctx.changed();
        setTimeout(() => { if (!s.seats[e.seat]) renderSeat(e.seat); }, 900);
      }
    }

    /* ---------- input ---------- */
    el.onclick = (e) => {
      if (S.isOver(s)) return;
      const it = e.target.closest('.su-item');
      if (it) {
        const id = +it.dataset.id;
        if (s.plate.length >= S.PLATE_MAX) { boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake'); ctx.sfx.bad(); return; }
        if (S.take(s, id)) {
          s.moves++;
          it.remove(); beltItems.delete(id);
          renderBoard(true);
          ctx.sfx.mark();
          ctx.changed();
        }
        return;
      }
      if (e.target.closest('.su-trash')) {
        if (S.trash(s)) { s.moves++; renderBoard(); ctx.sfx.set(); ctx.changed(); }
        return;
      }
      const seat = e.target.closest('.su-seat');
      if (seat && !seat.classList.contains('empty')) {
        const i = +seat.dataset.seat;
        const c = s.seats[i];
        const r = S.serve(s, i);
        s.moves++;
        if (r === 'ok') {
          flyDish(c.recipe.id, seat);
          seat.innerHTML = `${animalSVG(c.animal)}<span class="su-hearts" aria-hidden="true"><i></i><i></i><i></i></span>`;
          seat.className = 'su-seat leaving happy';
          ctx.sfx.cupDone();
          setTimeout(() => { if (!s.seats[i]) renderSeat(i); }, 900);
          renderBoard(); renderServed();
          ctx.changed();
          if (S.isWon(s)) setTimeout(ctx.win, 700);
        } else if (r === 'wrong') {
          seat.classList.remove('nope'); void seat.offsetWidth; seat.classList.add('nope');
          ctx.sfx.bad(); ctx.react('oops');
          ctx.changed();
        }
      }
    };

    function flyDish(id, seat) {
      if (reduce()) return;
      const wrap = el.querySelector('.su-wrap');
      const a = boardEl.getBoundingClientRect(), b = seat.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      const d = document.createElement('div');
      d.className = 'su-fly';
      d.innerHTML = dishSVG(id);
      d.style.left = `${a.left - w.left + a.width / 2 - 28}px`;
      d.style.top = `${a.top - w.top}px`;
      wrap.appendChild(d);
      d.animate([
        { transform: 'translate(0,0) scale(.6)', opacity: 1 },
        { transform: `translate(${(b.left - a.left + b.width / 2 - a.width / 2) / 2}px, ${(b.top - a.top) / 2 - 40}px) scale(1.15)`, offset: 0.5 },
        { transform: `translate(${b.left - a.left + b.width / 2 - a.width / 2}px, ${b.top - a.top + 20}px) scale(.8)`, opacity: 0.2 },
      ], { duration: 550, easing: 'ease-in-out', fill: 'forwards' });
      setTimeout(() => d.remove(), 600);
    }

    /* ---------- avvio ---------- */
    const ok = saved && saved.cfg && Array.isArray(saved.seats) && Array.isArray(saved.belt) && saved.goal > 0;
    if (ok && !S.isOver(saved)) {
      s = Object.assign({ moves: 0, mistakes: saved.lost || 0 }, saved);
      build();
      start();
    } else fresh();

    return {
      fresh,
      restart() { cancelAnimationFrame(raf); raf = 0; s = S.newLevel(s.level, Math.random); s.moves = 0; s.mistakes = 0; build(); ctx.changed({ reset: true }); start(); },
      // annulla: toglie l'ultimo ingrediente dal tagliere
      undo() { if (!s.plate.length || S.isOver(s)) return; s.plate.pop(); renderBoard(); ctx.sfx.set(); ctx.changed(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'sushi', name: 'Sushi Bar', rules: 'r4', art, create, lives: 3,
    rate: (s) => HH.sushi.rate(s),
    parTime: (s) => s.goal * 9,
    progress: (s) => Math.max(0, Math.min(1, s.served / s.goal)),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
