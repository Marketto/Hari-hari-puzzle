/* Hari Parade — interfaccia.
 * Prato a scacchi incorniciato da una siepe, con un arco fiorito (il "cancello") da cui parte la sfilata.
 * Hari guida, i riccetti lo seguono saltellando a turno; i frutti pulsano e brillano, i fiori ondeggiano,
 * passano nuvole e petali (di notte: lucciole). Rendering DOM + transform (composito su GPU) con interpolazione
 * tra le celle: la logica avanza a passi interi, la grafica scivola in modo continuo.
 *
 * Controlli: swipe sul prato, frecce/WASD, croce direzionale sotto il prato. Spazio/P o il tasto pausa = pausa.
 * "Annulla" in un gioco in tempo reale non ha senso: qui mette in pausa (o riprende).
 * La partita va in pausa da sola se la pagina viene nascosta; ripresa da salvataggio = in pausa, tocca per ripartire.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    pa_ready: 'Ready?', pa_go: 'Go!', pa_start: 'Swipe or press an arrow to start!', pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_fruits: 'Fruits',
    pa_combo: 'Combo', pa_slow: 'Slow-mo!', pa_star: 'Star bonus!', pa_ouch: 'Ouch!', pa_pause: 'Pause',
    pa_up: 'Up', pa_down: 'Down', pa_left: 'Left', pa_right: 'Right',
  };
  const L = (k) => label(k, EN[k]);

  /* ---------- disegni (viewBox 100×100, colori solo da token --pa-*) ---------- */
  const INK = 'var(--pa-ink)';
  const o = (w = 2.4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const hi = (d, w = 3, op = 0.85) => `<path d="${d}" fill="none" stroke="var(--pa-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const f1 = (n) => +n.toFixed(1);
  // raggiera di aculei lungo un arco (gradi, 0 = destra, senso orario)
  function spikes(cx, cy, r, len, a0, a1, n) {
    const pt = (a, rr) => `${f1(cx + rr * Math.cos(a * Math.PI / 180))} ${f1(cy + rr * Math.sin(a * Math.PI / 180))}`;
    const step = (a1 - a0) / n;
    let d = `M${cx} ${cy}L${pt(a0, r)}`;
    for (let k = 0; k < n; k++) d += `L${pt(a0 + step * (k + 0.5), r + len * (0.85 + 0.15 * ((k * 7) % 3) / 2))}L${pt(a0 + step * (k + 1), r)}`;
    return `${d}Z`;
  }
  const sakura = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="${-r}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.9)}" transform="rotate(${a})" fill="var(--pa-sakura)" stroke="var(--pa-ink)" stroke-width=".9"/>`).join('')}<circle r="${f1(r * 0.42)}" fill="var(--pa-sakura-in)"/></g>`;
  // occhioni anime: due riflessi + scintilla
  const animeEye = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--pa-eye)"/>
    <ellipse cx="${cx}" cy="${f1(cy + ry * 0.42)}" rx="${f1(rx * 0.7)}" ry="${f1(ry * 0.4)}" fill="var(--pa-iris)"/>
    <circle cx="${f1(cx + rx * 0.32)}" cy="${f1(cy - ry * 0.36)}" r="${f1(rx * 0.44)}" fill="var(--pa-hi)"/>
    <circle cx="${f1(cx - rx * 0.36)}" cy="${f1(cy + ry * 0.42)}" r="${f1(rx * 0.2)}" fill="var(--pa-hi)"/>`;
  const joyEye = (cx, cy, w) => `<path d="M${cx - w} ${cy + 1}Q${cx} ${cy - w * 1.1} ${cx + w} ${cy + 1}" fill="none" stroke="var(--pa-eye)" stroke-width="3" stroke-linecap="round"/>`;
  const swirl = (cx, cy, r) => `<path d="M${cx} ${cy}m${-r * 0.2} 0a${r * 0.2} ${r * 0.2} 0 1 1 ${r * 0.4} 0a${r * 0.45} ${r * 0.45} 0 1 1 ${-r * 0.9} 0a${r * 0.7} ${r * 0.7} 0 1 1 ${r * 1.4} 0" fill="none" stroke="var(--pa-eye)" stroke-width="2.4" stroke-linecap="round"/>`;

  // Hari capofila (testa grande, occhi che guardano nella direzione di marcia)
  const HEAD = `<svg class="pa-svg" viewBox="0 0 100 100" aria-hidden="true">
    <path d="${spikes(50, 56, 31, 17, -205, 25, 11)}" fill="var(--pa-quill-2)" ${o(2.4)}/>
    <path d="${spikes(50, 56, 27, 11, -198, 18, 10)}" fill="var(--pa-quill)"/>
    <path d="M30 30l6-4M66 26l6 4M48 22v-6" ${o(0)} stroke="var(--pa-quill-3)" stroke-width="2.4"/>
    <circle cx="25" cy="44" r="8" fill="var(--pa-ear)" ${o(2.2)}/><circle cx="25" cy="44.5" r="4" fill="var(--pa-ear-in)"/>
    <circle cx="75" cy="44" r="8" fill="var(--pa-ear)" ${o(2.2)}/><circle cx="75" cy="44.5" r="4" fill="var(--pa-ear-in)"/>
    <g class="pa-look">
      <ellipse cx="50" cy="64" rx="31" ry="25" fill="var(--pa-face)" ${o(2.6)}/>
      <path d="M80 62a31 25 0 0 1-48 21 34 28 0 0 0 48-21z" fill="var(--pa-ink)" opacity=".07"/>
      <path d="M36 43C41 50 46 52 50 52C54 52 59 50 64 43C58 37 42 37 36 43Z" fill="var(--pa-quill-3)"/>
      <g class="pa-eyes">${animeEye(39, 64, 6.8, 8.6)}${animeEye(61, 64, 6.8, 8.6)}</g>
      <g class="pa-joy">${joyEye(39, 64, 6)}${joyEye(61, 64, 6)}</g>
      <g class="pa-dizzy">${swirl(39, 64, 9)}${swirl(61, 64, 9)}</g>
      <ellipse cx="27" cy="74" rx="6.5" ry="3.8" fill="var(--pa-blush)"/><ellipse cx="73" cy="74" rx="6.5" ry="3.8" fill="var(--pa-blush)"/>
      <path d="M24 75l2-3M28 75l2-3M70 75l2-3M74 75l2-3" stroke="var(--pa-blush-line)" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="50" cy="73" rx="3.4" ry="2.5" fill="var(--pa-nose)"/>
      <path class="pa-mouth" d="M45.5 77.5q2.25 3 4.5 0q2.25 3 4.5 0" fill="none" stroke="var(--pa-nose)" stroke-width="1.9" stroke-linecap="round"/>
      <path class="pa-yum" d="M44.5 77q5.5 9 11 0z" fill="var(--pa-mouth)" stroke="var(--pa-nose)" stroke-width="1.6" stroke-linejoin="round"/>
    </g>
    ${hi('M30 36q6-9 16-12', 2.6, 0.5)}
    <g class="pa-flower">${sakura(70, 25, 6.5)}</g>
  </svg>`;

  // riccetto della fila (corpo intero, fiocchetto colorato)
  const BABY = `<svg class="pa-svg" viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="36" cy="90" rx="8" ry="5" fill="var(--pa-quill-3)" ${o(2)}/><ellipse cx="64" cy="90" rx="8" ry="5" fill="var(--pa-quill-3)" ${o(2)}/>
    <path d="${spikes(50, 64, 26, 13, -212, 32, 10)}" fill="var(--pa-quill-2)" ${o(2.3)}/>
    <path d="${spikes(50, 64, 22, 8, -205, 25, 9)}" fill="var(--pa-quill)"/>
    <circle cx="30" cy="50" r="6.5" fill="var(--pa-ear)" ${o(2)}/><circle cx="30" cy="50.5" r="3.2" fill="var(--pa-ear-in)"/>
    <circle cx="70" cy="50" r="6.5" fill="var(--pa-ear)" ${o(2)}/><circle cx="70" cy="50.5" r="3.2" fill="var(--pa-ear-in)"/>
    <g class="pa-look">
      <ellipse cx="50" cy="70" rx="25" ry="20" fill="var(--pa-face)" ${o(2.4)}/>
      <path d="M74 70a25 20 0 0 1-38 17 28 22 0 0 0 38-17z" fill="var(--pa-ink)" opacity=".07"/>
      <g class="pa-eyes">${animeEye(41, 69, 5.4, 6.8)}${animeEye(59, 69, 5.4, 6.8)}</g>
      <g class="pa-dizzy">${swirl(41, 69, 7)}${swirl(59, 69, 7)}</g>
      <ellipse cx="31" cy="78" rx="5" ry="3" fill="var(--pa-blush)"/><ellipse cx="69" cy="78" rx="5" ry="3" fill="var(--pa-blush)"/>
      <ellipse cx="50" cy="77" rx="2.6" ry="1.9" fill="var(--pa-nose)"/>
      <path d="M46.5 80.5q1.75 2.4 3.5 0q1.75 2.4 3.5 0" fill="none" stroke="var(--pa-nose)" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g class="pa-bow"><path d="M64 38l-12-8v14zM64 38l12-8v14z" fill="var(--bow)" ${o(1.8)}/><circle cx="64" cy="38" r="3.6" fill="var(--bow)" ${o(1.8)}/>
      <path d="M55 33l3 2M73 33l-3 2" stroke="var(--pa-hi)" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></g>
    ${hi('M30 58q4-9 12-12', 2.2, 0.45)}
  </svg>`;
  const BOWS = ['var(--pa-bow-1)', 'var(--pa-bow-2)', 'var(--pa-bow-3)', 'var(--pa-bow-4)', 'var(--pa-bow-5)'];

  // faccina kawaii per frutti e oggetti
  const fface = (cx, cy, k = 1) => `<g class="pa-fface">
    <ellipse cx="${cx - 8 * k}" cy="${cy}" rx="${f1(2.6 * k)}" ry="${f1(3.3 * k)}" fill="var(--pa-eye)"/><ellipse cx="${cx + 8 * k}" cy="${cy}" rx="${f1(2.6 * k)}" ry="${f1(3.3 * k)}" fill="var(--pa-eye)"/>
    <circle cx="${f1(cx - 7.2 * k)}" cy="${f1(cy - 1.3 * k)}" r="${f1(1.1 * k)}" fill="var(--pa-hi)"/><circle cx="${f1(cx + 8.8 * k)}" cy="${f1(cy - 1.3 * k)}" r="${f1(1.1 * k)}" fill="var(--pa-hi)"/>
    <ellipse cx="${cx - 13 * k}" cy="${f1(cy + 5 * k)}" rx="${f1(3.6 * k)}" ry="${f1(2.2 * k)}" fill="var(--pa-blush)"/><ellipse cx="${cx + 13 * k}" cy="${f1(cy + 5 * k)}" rx="${f1(3.6 * k)}" ry="${f1(2.2 * k)}" fill="var(--pa-blush)"/>
    <path d="M${f1(cx - 2.6 * k)} ${f1(cy + 4 * k)}q${f1(2.6 * k)} ${f1(2.8 * k)} ${f1(5.2 * k)} 0" fill="none" stroke="var(--pa-eye)" stroke-width="1.7" stroke-linecap="round"/></g>`;
  const leaf = (x, y, r, k = 1) => `<path d="M0 0C4 -8 14 -9 20 -4C14 2 5 4 0 0Z" transform="translate(${x} ${y}) rotate(${r}) scale(${k})" fill="var(--pa-leaf)" ${o(1.8 / k)}/>`;

  const FRUIT = {
    strawberry: `<path d="M50 90C28 80 17 60 21 45C24 34 37 30 50 35C63 30 76 34 79 45C83 60 72 80 50 90Z" fill="var(--pa-straw)" ${o()}/>
      <path d="M75 50C77 64 68 80 50 89 64 78 71 64 70 50z" fill="var(--pa-straw-2)"/>
      ${[[30, 50], [42, 47], [58, 47], [70, 52], [34, 64], [66, 64], [42, 77], [58, 77], [50, 84]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.3" fill="var(--pa-seed)"/>`).join('')}
      <path d="M50 36L40 26L46 34L32 32L44 39L50 42L56 39L68 32L54 34L60 26Z" fill="var(--pa-leaf)" ${o(2)}/><path d="M50 34V18" ${o(3.4)} stroke="var(--pa-leaf-2)"/>
      ${fface(50, 60)}${hi('M28 48q2-8 10-10')}`,
    apple: `<path d="M50 38C38 27 17 32 17 55C17 76 34 90 50 86C66 90 83 76 83 55C83 32 62 27 50 38Z" fill="var(--pa-apple)" ${o()}/>
      <path d="M78 52C80 72 66 86 50 86 63 82 74 70 72 50z" fill="var(--pa-apple-2)"/>
      <path d="M50 38C50 30 52 22 56 16" fill="none" ${o(3.4)} stroke="var(--pa-stem)"/>${leaf(54, 24, -24, 1.1)}
      ${fface(50, 60)}${hi('M26 50q2-10 12-13')}`,
    blueberry: `<circle cx="30" cy="48" r="15" fill="var(--pa-blue-2)" ${o(2.2)}/><circle cx="70" cy="46" r="14" fill="var(--pa-blue-2)" ${o(2.2)}/>
      <circle cx="50" cy="62" r="27" fill="var(--pa-blue)" ${o()}/>
      <path d="M74 60a27 27 0 0 1-40 23 30 30 0 0 0 40-23z" fill="var(--pa-blue-2)" opacity=".6"/>
      <path d="M50 40l-5-6 2 7-7-1 6 4 4 2 4-2 6-4-7 1 2-7z" fill="var(--pa-blue-2)" ${o(1.6)}/>
      ${fface(50, 64)}${hi('M30 56q3-9 12-12', 3, 0.6)}<circle cx="36" cy="44" r="2.4" fill="var(--pa-blue-hi)"/><circle cx="64" cy="41" r="2.2" fill="var(--pa-blue-hi)"/>`,
    peach: `<path d="M50 32C28 30 17 48 19 63C21 79 35 89 50 89C65 89 79 79 81 63C83 48 72 30 50 32Z" fill="var(--pa-peach)" ${o()}/>
      <path d="M50 32C40 44 42 60 48 74" fill="none" stroke="var(--pa-peach-2)" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="66" cy="70" rx="12" ry="10" fill="var(--pa-peach-2)" opacity=".55"/>
      ${leaf(50, 32, -40, 1.2)}${leaf(50, 32, -150, 0.9)}
      ${fface(52, 62)}${hi('M28 52q3-10 12-14', 3.4, 0.7)}`,
    cherry: `<path d="M36 64C40 44 48 30 58 18M64 60C64 42 62 30 58 18" fill="none" ${o(3.2)} stroke="var(--pa-leaf-2)"/>${leaf(58, 19, -10, 1.1)}
      <circle cx="34" cy="70" r="17" fill="var(--pa-cherry)" ${o()}/><circle cx="66" cy="66" r="17" fill="var(--pa-cherry)" ${o()}/>
      <path d="M48 76a17 17 0 0 1-26 6 19 19 0 0 0 26-6zM80 72a17 17 0 0 1-26 6 19 19 0 0 0 26-6z" fill="var(--pa-cherry-2)"/>
      ${fface(34, 71, 0.62)}${fface(66, 67, 0.62)}${hi('M24 64q2-6 7-7', 2.6)}${hi('M56 60q2-6 7-7', 2.6)}`,
    orange: `<circle cx="50" cy="60" r="30" fill="var(--pa-orange)" ${o()}/>
      <path d="M78 58a30 30 0 0 1-46 26 33 33 0 0 0 46-26z" fill="var(--pa-orange-2)"/>
      ${[[34, 46], [62, 44], [72, 62], [30, 66], [44, 80], [62, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="var(--pa-orange-2)"/>`).join('')}
      <path d="M50 30v-6" ${o(3.4)} stroke="var(--pa-stem)"/>${leaf(51, 26, -20, 1.1)}
      ${fface(50, 62)}${hi('M28 52q3-10 12-14')}`,
  };
  const ITEM = {
    star: `<path d="M50 12C53 12 55 30 59 34S84 36 85 39 69 54 68 59 77 84 74 86 55 75 50 75 28 88 26 86 34 64 32 59 14 42 15 39 37 38 41 34 47 12 50 12Z" fill="var(--pa-star)" ${o()}/>
      <path d="M68 59C69 66 76 84 74 86 63 79 58 76 52 75 62 72 67 66 68 59z" fill="var(--pa-star-2)"/>
      ${fface(50, 52, 0.85)}${hi('M44 24q-3 8-6 12', 2.6)}`,
    clock: `<path d="M28 82l-6 8M72 82l6 8" ${o(4)} stroke="var(--pa-clock-2)"/>
      <circle cx="28" cy="26" r="11" fill="var(--pa-bell)" ${o(2.2)}/><circle cx="72" cy="26" r="11" fill="var(--pa-bell)" ${o(2.2)}/>
      <circle cx="50" cy="58" r="31" fill="var(--pa-clock)" ${o()}/><circle cx="50" cy="58" r="23" fill="var(--pa-clock-face)" ${o(2)}/>
      <path d="M50 58V42M50 58l10 6" ${o(3.2)}/><circle cx="50" cy="58" r="3" fill="var(--pa-ink)"/>
      <path d="M50 37v3M50 76v3M29 58h3M68 58h3" ${o(2)}/>${hi('M28 46q4-10 12-14', 3, 0.7)}`,
  };
  const OBST = {
    pot: `<g class="pa-tulips"><path d="M40 60C40 48 36 40 34 32M60 60C60 46 64 38 66 30M50 60V36" fill="none" ${o(3)} stroke="var(--pa-leaf-2)"/>
        ${leaf(42, 52, -120, 0.9)}${leaf(58, 50, -60, 0.9)}
        <path d="M27 24C27 34 41 36 41 26L38 20L34 25L30 20Z" fill="var(--pa-tulip)" ${o(2)}/>
        <path d="M59 22C59 32 73 34 73 24L70 18L66 23L62 18Z" fill="var(--pa-tulip-2)" ${o(2)}/>
        <path d="M43 30C43 40 57 42 57 32L54 26L50 31L46 26Z" fill="var(--pa-tulip-3)" ${o(2)}/></g>
      <path d="M26 64H74L67 92H33Z" fill="var(--pa-pot)" ${o()}/><path d="M66 66L60 92H67L73 66z" fill="var(--pa-pot-2)"/>
      <rect x="22" y="56" width="56" height="12" rx="4" fill="var(--pa-pot-rim)" ${o()}/>
      <path d="M38 78q2 3 4 0M54 78q2 3 4 0" fill="none" ${o(1.8)}/><ellipse cx="34" cy="82" rx="3.5" ry="2" fill="var(--pa-blush)"/><ellipse cx="62" cy="82" rx="3.5" ry="2" fill="var(--pa-blush)"/>
      ${hi('M30 70l-2 10', 2.6, 0.6)}`,
    rock: `<path d="M14 88C8 72 18 54 36 52C44 40 64 40 72 54C88 58 94 78 86 88Z" fill="var(--pa-rock)" ${o()}/>
      <path d="M72 56C86 62 90 78 85 87H52C70 82 76 70 72 56Z" fill="var(--pa-rock-2)"/>
      <path d="M30 56C34 50 42 48 48 50C44 44 54 40 60 46C52 46 46 52 40 54Z" fill="var(--pa-moss)" ${o(1.6)}/>
      <path d="M58 46C58 38 62 34 66 32M58 42C54 38 50 38 48 38" fill="none" ${o(2.2)} stroke="var(--pa-leaf-2)"/>${leaf(66, 32, -50, 0.7)}
      <path d="M36 72q3-3 6 0M56 72q3-3 6 0" fill="none" ${o(1.8)}/><path d="M46 79q3 2 6 0" fill="none" ${o(1.6)}/>
      ${hi('M24 70q2-10 10-14', 3, 0.6)}`,
    mushroom: `<path d="M38 62C38 74 36 84 40 90H60C64 84 62 74 62 62Z" fill="var(--pa-mush-stem)" ${o()}/>
      <path d="M56 64C58 74 60 84 58 90H60C64 84 62 74 62 64z" fill="var(--pa-mush-stem-2)"/>
      <path d="M12 62C12 36 30 22 50 22S88 36 88 62C72 70 28 70 12 62Z" fill="var(--pa-mush-cap)" ${o()}/>
      <path d="M86 58C84 40 72 28 58 24 74 34 80 48 78 64z" fill="var(--pa-mush-cap-2)"/>
      <ellipse cx="34" cy="44" rx="7" ry="5.5" fill="var(--pa-mush-dot)"/><ellipse cx="58" cy="36" rx="6" ry="4.5" fill="var(--pa-mush-dot)"/><ellipse cx="70" cy="54" rx="5" ry="4" fill="var(--pa-mush-dot)"/><ellipse cx="46" cy="58" rx="4" ry="3" fill="var(--pa-mush-dot)"/>
      <path d="M43 76q2.5 2.5 5 0M53 76q2.5 2.5 5 0" fill="none" ${o(1.7)}/><ellipse cx="41" cy="81" rx="3" ry="1.8" fill="var(--pa-blush)"/><ellipse cx="60" cy="81" rx="3" ry="1.8" fill="var(--pa-blush)"/>
      ${hi('M24 50q6-16 20-20', 3, 0.6)}`,
  };
  const svgOf = (inner, cls = 'pa-svg') => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;

  // arco fiorito del cancello (viewBox 40×64)
  const GATE = `<svg class="pa-gate-svg" viewBox="0 0 40 64" aria-hidden="true">
    <path d="M8 62V24A12 12 0 0 1 32 24V62" fill="none" stroke="var(--pa-ink)" stroke-width="7.5" stroke-linecap="round"/>
    <path d="M8 62V24A12 12 0 0 1 32 24V62" fill="none" stroke="var(--pa-gate)" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M8 40h0M32 40h0" stroke="var(--pa-gate-2)" stroke-width="5" stroke-linecap="round"/>
    ${[[8, 30], [11, 17], [20, 12], [29, 17], [32, 30], [8, 46], [32, 48]].map(([x, y], i) => `<g class="pa-gfl" style="animation-delay:${-i * 0.4}s">${sakura(x, y, i % 2 ? 3.6 : 4.4)}</g>`).join('')}
    <path d="M14 12l-6-8 9 3zM26 12l6-8-9 3z" fill="var(--pa-leaf)" stroke="var(--pa-ink)" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;

  // prato di sfondo: scacchi, ciuffi d'erba e sassolini del sentiero in un SVG statico (un solo strato, dipinto una volta);
  // i fiorellini che ondeggiano sono elementi a parte, così la loro animazione non ridipinge il prato
  const daisy = (c) => `<svg class="pa-fl" viewBox="-3 -3 6 6" aria-hidden="true">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(1.5 * Math.cos(a * Math.PI / 180))}" cy="${f1(1.5 * Math.sin(a * Math.PI / 180))}" r="1.15" fill="var(--pa-flower-${c})"/>`).join('')}<circle r=".8" fill="var(--pa-flower-c)"/></svg>`;
  function lawn(s) {
    const W = s.cols * 10, H = s.rows * 10, r = HH.rng(s.level * 7919 + s.cols);
    let chk = '', tufts = '', flowers = '';
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) {
      if ((x + y) % 2) chk += `M${x * 10} ${y * 10}h10v10h-10z`;
      const v = r();
      if (v < 0.22) { const tx = x * 10 + 2 + r() * 6, ty = y * 10 + 4 + r() * 5; tufts += `M${f1(tx)} ${f1(ty)}l-1.2 -2.6M${f1(tx + 1)} ${f1(ty)}l0 -3.4M${f1(tx + 2)} ${f1(ty)}l1.2 -2.6`; }
      else if (v < 0.33) {
        const fx = f1(((x + 0.2 + r() * 0.5) / s.cols) * 100), fy = f1(((y + 0.15 + r() * 0.5) / s.rows) * 100), c = 1 + Math.floor(r() * 4);
        flowers += `<i style="left:${fx}%;top:${fy}%;animation-delay:${f1(-r() * 3)}s">${daisy(c)}</i>`;
      }
    }
    const sy = HH.parade.startRow(s.rows);
    const path = Array.from({ length: 4 }, (_, i) => `<ellipse cx="${i * 10 + 5}" cy="${sy * 10 + 5}" rx="3.4" ry="2.4" fill="var(--pa-stone)" opacity="${f1(0.9 - i * 0.18)}"/>`).join('');
    return `<svg class="pa-lawn" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <rect width="${W}" height="${H}" fill="var(--pa-grass-1)"/><path d="${chk}" fill="var(--pa-grass-2)"/>
      <path d="${tufts}" stroke="var(--pa-grass-3)" stroke-width=".8" stroke-linecap="round" fill="none"/>
      ${path}</svg><div class="pa-flowers" aria-hidden="true">${flowers}</div>`;
  }

  const art = () => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <rect x="4" y="8" width="112" height="78" rx="16" fill="var(--pa-hedge-2)"/>
    <rect x="10" y="14" width="100" height="66" rx="10" fill="var(--pa-grass-1)"/>
    <path d="M10 36h100M10 58h100" stroke="var(--pa-grass-2)" stroke-width="11"/>
    ${[[18, 22, 1], [92, 70, 2], [70, 24, 3], [30, 72, 4]].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(3 * Math.cos(a * Math.PI / 180))}" cy="${f1(3 * Math.sin(a * Math.PI / 180))}" r="2.3" fill="var(--pa-flower-${c})"/>`).join('')}<circle r="1.6" fill="var(--pa-flower-c)"/></g>`).join('')}
    <svg x="84" y="30" width="28" height="28" viewBox="0 0 100 100">${FRUIT.strawberry}</svg>
    <svg x="6" y="40" width="24" height="24" viewBox="0 0 100 100" style="--bow:var(--pa-bow-2)">${BABY.replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
    <svg x="26" y="36" width="26" height="26" viewBox="0 0 100 100" style="--bow:var(--pa-bow-1)">${BABY.replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
    <svg x="48" y="26" width="38" height="38" viewBox="0 0 100 100">${HEAD.replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
  </svg>`;

  const ARROW = (r) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${r}deg)"><path d="M12 5l7 9h-4.5v5h-5v-5H5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13c0 .8.9 1.3 1.6.8l10-6.5c.6-.4.6-1.2 0-1.6l-10-6.5C8.9 4.2 8 4.7 8 5.5z" fill="currentColor"/></svg>';
  const CLOCK_MINI = svgOf(ITEM.clock, 'pa-ic');

  const reduce = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };

  function create(el, ctx, saved) {
    const P = HH.parade;
    let s, raf = 0, last = 0, paused = false, cell = 30;
    let wrap, field, grid, layer, fx, msg, pauseEl, bar, pauseBtn;
    let headEl, babies = [], fruitEl = null, fruitId = -1, itemEl = null, itemId = -1;
    let prevTail = null, noLerp = true, freezeUntil = 0, party = 0, lastSteps = 0, goTimer = 0, timers = [];
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    /* ---------- costruzione ---------- */
    function build() {
      clearTimers();
      el.innerHTML = `<div class="pa-wrap" dir="ltr">
        <div class="pa-bar">
          <span class="pa-sky" aria-hidden="true"><i class="pa-sun"></i><i class="pa-moon"></i><i class="pa-cloud c1"></i><i class="pa-cloud c2"></i><i class="pa-cloud c3"></i></span>
          <span class="pa-count" aria-label="${L('pa_fruits')}">${svgOf(FRUIT.strawberry, 'pa-ic')}<b></b><small></small></span>
          <span class="pa-track" aria-hidden="true"><i class="pa-fill"></i><span class="pa-rider">${HH.mascot.mini()}</span><span class="pa-flag">${svgOf(ITEM.star, 'pa-ic')}</span></span>
          <span class="pa-slow" hidden>${CLOCK_MINI}<i><b></b></i></span>
          <button class="pa-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button>
        </div>
        <div class="pa-field">
          <div class="pa-grid" style="--cols:${s.cols};--rows:${s.rows}">
            ${lawn(s)}
            <div class="pa-gate" style="--sy:${P.startRow(s.rows)}">${GATE}</div>
            <div class="pa-layer"></div>
            <div class="pa-air" aria-hidden="true">${'<i class="pa-petal"></i>'.repeat(6)}${'<b class="pa-ff"></b>'.repeat(8)}</div>
            <div class="pa-fx" aria-hidden="true"></div>
            <div class="pa-msg" aria-live="polite"></div>
            <div class="pa-pause" hidden><span class="pa-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div>
          </div>
        </div>
        <div class="pa-pad">
          <button type="button" class="pa-key l" data-dir="3" aria-label="${L('pa_left')}">${ARROW(-90)}</button>
          <button type="button" class="pa-key u" data-dir="0" aria-label="${L('pa_up')}">${ARROW(0)}</button>
          <button type="button" class="pa-key d" data-dir="2" aria-label="${L('pa_down')}">${ARROW(180)}</button>
          <button type="button" class="pa-key r" data-dir="1" aria-label="${L('pa_right')}">${ARROW(90)}</button>
        </div>
      </div>`;
      wrap = el.querySelector('.pa-wrap');
      field = el.querySelector('.pa-field');
      grid = el.querySelector('.pa-grid');
      layer = el.querySelector('.pa-layer');
      fx = el.querySelector('.pa-fx');
      msg = el.querySelector('.pa-msg');
      pauseEl = el.querySelector('.pa-pause');
      bar = el.querySelector('.pa-bar');
      pauseBtn = el.querySelector('.pa-pbtn');
      measure();
      if (G.ResizeObserver) {
        if (el._paRO) el._paRO.disconnect();
        let w0 = grid.clientWidth;
        el._paRO = new G.ResizeObserver(() => { if (grid.clientWidth !== w0) { w0 = grid.clientWidth; onResize(); } });
        el._paRO.observe(grid);
      }
      layer.innerHTML = s.obstacles.map((ob) => `<div class="pa-sp pa-ob ${ob.kind}" style="transform:translate3d(${ob.x * cell}px,${ob.y * cell}px,0);z-index:${10 + ob.y * 3}"><i class="pa-sh"></i><div class="pa-bd">${svgOf(OBST[ob.kind])}</div></div>`).join('');
      headEl = sprite('pa-head', HEAD);
      babies = [];
      fruitEl = itemEl = null; fruitId = itemId = -1;
      noLerp = true; prevTail = null; lastSteps = s.steps; freezeUntil = 0; party = 0;
      syncItems();
      renderBar();
      render(performance.now());
    }
    function sprite(cls, svg, style = '') {
      const d = document.createElement('div');
      d.className = `pa-sp ${cls}`;
      if (style) d.setAttribute('style', style);
      d.innerHTML = `<i class="pa-sh"></i><div class="pa-bd">${svg}</div>`;
      layer.appendChild(d);
      d._lx = d._ly = d._z = null;
      return d;
    }
    function measure() {
      if (!grid) return;
      cell = grid.clientWidth / s.cols || 30;
      grid.style.setProperty('--c', `${cell}px`);
      layer.querySelectorAll('.pa-ob').forEach((n, i) => { const ob = s.obstacles[i]; n.style.transform = `translate3d(${ob.x * cell}px,${ob.y * cell}px,0)`; });
      if (fruitEl && s.fruit) place(fruitEl, s.fruit);
      if (itemEl && s.item) place(itemEl, s.item);
    }
    const place = (n, c) => { n.style.transform = `translate3d(${c.x * cell}px,${c.y * cell}px,0)`; n.style.zIndex = 10 + c.y * 3; };

    function syncItems() {
      const f = s.fruit;
      if (!f && fruitEl) { fruitEl.remove(); fruitEl = null; fruitId = -1; }
      if (f && f.id !== fruitId) {
        if (fruitEl) fruitEl.remove();
        fruitEl = sprite(`pa-fruit ${f.kind}`, `<i class="pa-halo"></i>${svgOf(FRUIT[f.kind])}<i class="pa-tw t1"></i><i class="pa-tw t2"></i>`);
        fruitId = f.id; place(fruitEl, f);
      }
      const it = s.item;
      if (!it && itemEl) { itemEl.remove(); itemEl = null; itemId = -1; }
      if (it && it.id !== itemId) {
        if (itemEl) itemEl.remove();
        itemEl = sprite(`pa-item ${it.kind}`, `<i class="pa-halo"></i>${svgOf(ITEM[it.kind])}<i class="pa-tw t1"></i><i class="pa-tw t2"></i>`);
        itemId = it.id; place(itemEl, it);
      }
      if (itemEl && it) itemEl.classList.toggle('ending', it.ttl <= 9);
    }
    function syncBabies() {
      const n = s.body.length - 1;
      while (babies.length < n) {
        const i = babies.length;
        const b = sprite('pa-baby', BABY, `--bow:${BOWS[i % BOWS.length]}`);
        if (!noLerp || s.steps > 0) b.classList.add('pop');
        babies.push(b);
      }
      while (babies.length > n) babies.pop().remove();
    }

    function renderBar() {
      bar.querySelector('.pa-count b').textContent = s.eaten;
      bar.querySelector('.pa-count small').textContent = `/ ${s.goal}`;
      const p = P.progress(s);
      bar.querySelector('.pa-fill').style.width = `${p * 100}%`;
      bar.querySelector('.pa-rider').style.left = `${p * 100}%`;
      renderSlow();
    }
    function renderSlow() {
      const sl = bar.querySelector('.pa-slow');
      sl.hidden = !(s.slow > 0);
      if (s.slow > 0) sl.querySelector('b').style.width = `${(s.slow / P.SLOW_STEPS) * 100}%`;
    }

    /* ---------- disegno a ogni fotogramma ---------- */
    function setLook(n, lx, ly) {
      if (n._lx === lx && n._ly === ly) return;
      n._lx = lx; n._ly = ly;
      n.style.setProperty('--lx', lx); n.style.setProperty('--ly', ly);
    }
    // occhiolino: un personaggio alla volta (niente animazioni continue dentro gli SVG, restano strati fermi)
    let nextBlink = 0;
    function blink(now) {
      if (now < nextBlink || reduce()) return;
      nextBlink = now + 380 + Math.random() * 700;
      const all = [headEl, ...babies], n = all[Math.floor(Math.random() * all.length)];
      if (!n || n.classList.contains('blink')) return;
      n.classList.add('blink');
      later(() => n.classList.remove('blink'), 140);
    }
    function render(now) {
      if (now < freezeUntil) return;
      blink(now);          // scontro: la scena resta ferma un attimo
      syncBabies();
      const f = noLerp ? 1 : P.frac(s), body = s.body, len = body.length, still = reduce();
      const moving = !paused && s.ready <= 0 && !s.wait && !P.isOver(s);
      const tSec = now / 1000;
      for (let i = 0; i < len; i++) {
        const c = body[i], pv = noLerp ? c : i < len - 1 ? body[i + 1] : prevTail || c;
        const x = pv.x + (c.x - pv.x) * f, y = pv.y + (c.y - pv.y) * f;
        const n = i ? babies[i - 1] : headEl;
        if (!n) continue;
        // saltelli a turno, a tempo coi passi; da fermi un respiro lento
        let hop = 0, sq = 0;
        if (!still) {
          if (party) { hop = Math.abs(Math.sin((tSec * 2.6 - i * 0.18) * Math.PI)) * 0.55; }
          else if (moving) { const ph = (s.steps + f) / 2 + i / 2; hop = Math.abs(Math.sin(ph * Math.PI)) * (i ? 0.24 : 0.12); sq = 1 - Math.min(1, hop * 6); }
          else hop = (Math.sin(tSec * 3 - i * 0.7) + 1) * 0.03;
        }
        n.style.transform = `translate3d(${(x * cell).toFixed(1)}px,${(y * cell).toFixed(1)}px,0)`;
        n.firstChild.nextSibling.style.transform = `translate3d(0,${(-hop * cell).toFixed(1)}px,0) scale(${(1 + sq * 0.07).toFixed(3)},${(1 - sq * 0.07).toFixed(3)})`;
        const z = 10 + Math.round(y * 3) + (i ? 0 : 1);
        if (n._z !== z) { n._z = z; n.style.zIndex = z; }
        // dove guarda: la testa segue la direzione, i riccetti guardano chi hanno davanti
        let lx, ly;
        if (!i) { lx = P.DX[s.dir]; ly = P.DY[s.dir]; }
        else { const a = body[i - 1]; lx = Math.sign(a.x - c.x); ly = Math.sign(a.y - c.y); }
        setLook(n, lx, ly);
      }
    }

    /* ---------- effetti ---------- */
    function at(c) { return { x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell }; }
    function burst(c, kind, count) {
      if (reduce()) return;
      const p = at(c);
      for (let k = 0; k < count; k++) {
        const b = document.createElement('i');
        b.className = `pa-pt ${kind}`;
        const a = (k / count) * Math.PI * 2 + Math.random() * 0.6, r = cell * (0.8 + Math.random() * 0.7);
        b.style.cssText = `left:${p.x}px;top:${p.y}px;--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r - cell * 0.3).toFixed(0)}px;--r:${Math.round(Math.random() * 180)}deg;animation-delay:${k * 18}ms`;
        fx.appendChild(b);
        later(() => b.remove(), 1000);
      }
    }
    function floatText(c, text, cls = '') {
      const p = at(c), b = document.createElement('b');
      b.className = `pa-pop ${cls}`;
      b.textContent = text;
      b.style.left = `${p.x}px`; b.style.top = `${p.y - cell * 0.4}px`;
      fx.appendChild(b);
      later(() => b.remove(), 1100);
    }
    function flash(cls, ms) { headEl.classList.remove(cls); void headEl.offsetWidth; headEl.classList.add(cls); later(() => headEl && headEl.classList.remove(cls), ms); }
    function say(text, cls = '', ms = 900) {
      msg.innerHTML = `<b class="${cls}">${text}</b>`;
      msg.classList.remove('show'); void msg.offsetWidth; msg.classList.add('show');
      clearTimeout(goTimer);
      goTimer = later(() => { msg.classList.remove('show'); }, ms);
    }

    function onEvent(e) {
      if (e.type === 'eat') {
        burst(e, 'spark', 8); burst(e, 'heart', 3);
        floatText(e, '+1');
        flash('yum', 360);
        ctx.sfx.place();
        if (e.combo >= 2) {
          later(() => floatText({ x: e.x, y: e.y - 0.7 }, `${L('pa_combo')} ×${e.combo}`, 'combo'), 140);
          if (e.combo >= 3) ctx.sfx.cupDone();
        }
        bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump');
        renderBar(); ctx.changed();
      } else if (e.type === 'item') {
        if (e.kind === 'star') { burst(e, 'star', 10); floatText(e, `+${P.STAR_BONUS}`, 'gold'); say(L('pa_star'), 'gold', 900); ctx.sfx.star(1); }
        else { burst(e, 'spark', 8); say(L('pa_slow'), 'mint', 900); ctx.sfx.lightOn(3); field.classList.add('slowmo'); }
        flash('yum', 360);
        renderBar(); ctx.changed();
      } else if (e.type === 'crash') {
        const now = performance.now();
        freezeUntil = now + 850;
        headEl.classList.add('dizzy');
        babies.forEach((b) => b.classList.add('wobble'));
        burst(e, 'star', 7);
        floatText(e, L('pa_ouch'), 'ouch');
        if (!reduce()) { field.classList.remove('shake'); void field.offsetWidth; field.classList.add('shake'); }
        field.classList.remove('slowmo');
        ctx.mistake(e.left);
        ctx.changed();
        later(() => {
          if (!headEl) return;
          headEl.classList.remove('dizzy');
          babies.forEach((b) => b.remove()); babies = [];
          noLerp = true;
          if (!P.isLost(s)) { syncItems(); render(performance.now()); headEl.classList.add('pop'); later(() => headEl.classList.remove('pop'), 500); ready(); }
        }, 850);
      } else if (e.type === 'go') {
        say(L('pa_go'), 'go', 650); ctx.sfx.milestone();
        if (s.wait) later(() => { if (s.wait && !paused) say(L('pa_start'), 'hint', 2400); }, 700);
      } else if (e.type === 'win') {
        party = performance.now();
        headEl.classList.add('yum');
        renderBar();
        for (let k = 0; k < 4; k++) later(() => burst(s.body[Math.floor(Math.random() * s.body.length)], k % 2 ? 'heart' : 'star', 8), k * 220);
        ctx.sfx.cupDone();
        ctx.changed();
        later(() => ctx.win(), 1100);
      }
    }
    function ready() {
      msg.innerHTML = `<b class="ready">${L('pa_ready')}</b>`;
      msg.classList.remove('show'); void msg.offsetWidth; msg.classList.add('show');
      clearTimeout(goTimer);
      ctx.sfx.blip();
    }

    /* ---------- ciclo ---------- */
    function loop(now) {
      if (!el.isConnected) { stop(); detach(); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (!paused && dt > 0 && !P.isOver(s) && now >= freezeUntil) {
        const tail = s.body[s.body.length - 1], len = s.body.length, st = s.steps;
        const ev = P.advance(s, dt);
        const crashed = ev.some((x) => x.type === 'crash');
        if (!crashed && s.steps === st + 1) { noLerp = false; prevTail = s.body.length > len ? null : tail; }
        else if (s.steps !== st) noLerp = true;
        if (s.steps !== lastSteps) { lastSteps = s.steps; syncItems(); if (s.slow > 0 || !bar.querySelector('.pa-slow').hidden) renderSlow(); if (!s.slow) field.classList.remove('slowmo'); }
        ev.forEach(onEvent);
      }
      render(now);
      const live = !paused && (!P.isOver(s) || (party && now - party < 1600) || now < freezeUntil);
      raf = live ? requestAnimationFrame(loop) : 0;
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function pause() {
      if (paused || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = false;
      pauseBtn.innerHTML = PLAY;
      field.classList.add('paused');
      stop();
      ctx.changed();
    }
    function resume() {
      if (!paused || P.isOver(s)) return;
      paused = false;
      pauseEl.hidden = true;
      pauseBtn.innerHTML = PAUSE;
      field.classList.remove('paused');
      // un attimo per rimettere il dito sul prato
      if (s.ready <= 0) s.ready = P.READY * 0.7;
      s.wait = true;
      ready();
      ctx.sfx.set();
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    function input(d) {
      if (P.isOver(s)) return;
      if (paused) { resume(); }
      const waiting = s.wait;
      P.turn(s, d);
      if (waiting && !s.wait && msg.querySelector('.hint')) msg.classList.remove('show');
    }

    /* ---------- controlli ---------- */
    let sw = null;
    el.onpointerdown = (e) => {
      const key = e.target.closest('.pa-key');
      if (key) {
        e.preventDefault();
        key.classList.remove('hit'); void key.offsetWidth; key.classList.add('hit');
        input(+key.dataset.dir);
        ctx.sfx.tap();
        return;
      }
      if (e.target.closest('.pa-pbtn')) { e.preventDefault(); toggle(); return; }
      if (e.target.closest('.pa-field')) {
        sw = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
        try { field.setPointerCapture(e.pointerId); } catch (err) { /* vecchi browser */ }
      }
    };
    el.onpointermove = (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y, th = Math.max(16, cell * 0.45);
      if (Math.abs(dx) < th && Math.abs(dy) < th) return;
      input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
      sw.x = e.clientX; sw.y = e.clientY; sw.moved = true;     // swipe a catena senza alzare il dito
    };
    el.onpointerup = el.onpointercancel = (e) => {
      if (sw && e.pointerId === sw.id && !sw.moved && paused) resume();
      sw = null;
    };
    el.oncontextmenu = (e) => { if (e.target.closest('.pa-field, .pa-pad')) e.preventDefault(); };

    function onKey(e) {
      if (!el.isConnected) { detach(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.overlay:not([hidden])')) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key in KEYS) { e.preventDefault(); input(KEYS[e.key]); return; }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (e.key === ' ' && e.target && e.target.closest && e.target.closest('button') && !e.target.closest('.pa-wrap')) return;
        e.preventDefault(); if (e.key === 'Escape') pause(); else toggle();
      }
    }
    function onVis() { if (!el.isConnected) { detach(); return; } if (document.hidden) pause(); }
    function onResize() { if (!el.isConnected) { detach(); return; } measure(); noLerp = true; render(performance.now()); }
    function detach() {
      G.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      G.removeEventListener('resize', onResize);
      if (el._paRO) { el._paRO.disconnect(); el._paRO = null; }
      clearTimers();
    }
    if (el._paDetach) el._paDetach();
    el._paDetach = detach;
    G.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    G.addEventListener('resize', onResize);

    /* ---------- avvio ---------- */
    function begin(state, startPaused) {
      stop();
      s = state;
      s.waitMode = true; s.wait = true;   // parte al primo swipe/freccia, mai da sola
      paused = false;
      build();
      if (startPaused && !P.isOver(s)) { paused = true; pauseEl.hidden = false; pauseBtn.innerHTML = PLAY; field.classList.add('paused'); return; }
      ready();
      start();
    }
    function fresh() { begin(P.newLevel(ctx.level, Math.random)); ctx.changed({ reset: true }); }

    const ok = saved && saved.v === 1 && Array.isArray(saved.body) && saved.body.length && Array.isArray(saved.obstacles) && saved.goal > 0 && saved.cols > 0;
    if (ok && !P.isOver(saved)) begin(Object.assign({}, saved, { queue: [] }), true);
    else fresh();

    return {
      fresh,
      restart() { begin(P.newLevel(s.level, Math.random)); ctx.changed({ reset: true }); },
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'parade', name: 'Hari Parade', rules: 'r6', art, create, lives: 3,
    rate: (s) => HH.parade.rate(s),
    // circa mezza diagonale del prato per frutto, alla velocità del livello, più le pause "Pronti?"
    parTime: (s) => Math.round((s.goal * (s.cols + s.rows) * 0.55) / s.speed + 6),
    progress: (s) => HH.parade.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
