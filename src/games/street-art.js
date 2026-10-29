/* Hari Snack Street — disegni (SVG in stile cel, viewBox 100×100, piedi in basso al centro, tutti rivolti a DESTRA:
 * la UI li specchia). Colori SOLO dai token --st-* (street.css): la UI risolve var(--st-…) con getComputedStyle prima
 * di "cuocere" le bitmap per il canvas, così tema chiaro e scuro funzionano senza colori nel JavaScript.
 * Esporta HH.streetArt = { hari, kiki, animal, boss, obj, pick, shot, card, tut… }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const f1 = (n) => +n.toFixed(1);
  const o = (w = 2) => `stroke="var(--st-ink)" stroke-width="${f1(w * 0.8)}" stroke-linejoin="round" stroke-linecap="round"`;
  const hi = (d, w = 2.4, op = 0.75) => `<path d="${d}" fill="none" stroke="var(--st-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const eye = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--st-eye)"/>
    <circle cx="${f1(cx + rx * 0.3)}" cy="${f1(cy - ry * 0.35)}" r="${f1(rx * 0.45)}" fill="var(--st-hi)"/><circle cx="${f1(cx - rx * 0.3)}" cy="${f1(cy + ry * 0.4)}" r="${f1(rx * 0.2)}" fill="var(--st-hi)"/>`;
  const blush = (cx, cy, r = 4.5) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f1(r * 0.6)}" fill="var(--st-blush)"/>`;
  // occhi in vista di 3/4 (il secondo un po' più piccolo). mood: '' | 'joy' | 'oops' | 'sleep' | 'dizzy' | 'open' | 'sly'
  function eyes(x1, x2, y, s, mood) {
    const w = 4.2 * s;
    if (mood === 'joy') return [x1, x2].map((x, i) => `<path d="M${f1(x - w)} ${f1(y + 1)}q${f1(w)} ${f1(-w * 1.3)} ${f1(2 * w)} 0" fill="none" stroke="var(--st-eye)" stroke-width="${f1(2.4 * s * (i ? 0.85 : 1))}" stroke-linecap="round"/>`).join('');
    if (mood === 'sleep') return [x1, x2].map((x) => `<path d="M${f1(x - w)} ${f1(y - 1)}q${f1(w)} ${f1(w * 1.1)} ${f1(2 * w)} 0" fill="none" stroke="var(--st-eye)" stroke-width="${f1(2.2 * s)}" stroke-linecap="round"/>`).join('');
    if (mood === 'oops') return [x1, x2].map((x, i) => `<path d="M${f1(x - w * 0.8)} ${f1(y - w * 0.7)}l${f1(w * 1.6 * (i ? -1 : 1))} ${f1(w * 0.7)}l${f1(-w * 1.6 * (i ? -1 : 1))} ${f1(w * 0.7)}" fill="none" stroke="var(--st-eye)" stroke-width="${f1(2.2 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    if (mood === 'dizzy') return [x1, x2].map((x) => `<path d="M${x} ${y}m-${f1(w * 0.9)} 0a${f1(w * 0.9)} ${f1(w * 0.9)} 0 1 1 ${f1(w * 0.9)} ${f1(w * 0.9)}a${f1(w * 0.5)} ${f1(w * 0.5)} 0 1 1 ${f1(-w * 0.4)} ${f1(-w * 0.8)}" fill="none" stroke="var(--st-eye)" stroke-width="${f1(1.8 * s)}" stroke-linecap="round"/>`).join('');
    if (mood === 'sly') return [x1, x2].map((x, i) => `<path d="M${f1(x - w)} ${f1(y)}q${f1(w)} ${f1(w * 0.9)} ${f1(2 * w)} 0" fill="var(--st-eye)" stroke="var(--st-eye)" stroke-width="${f1(1.6 * s * (i ? 0.85 : 1))}" stroke-linejoin="round"/>`).join('');
    return eye(x1, y, f1(3.9 * s), f1(5 * s)) + eye(x2, y, f1(3.3 * s), f1(4.4 * s));
  }
  function mouth(x, y, s, mood) {
    if (mood === 'open') return `<path d="M${f1(x - 4 * s)} ${y}q${f1(4 * s)} ${f1(9 * s)} ${f1(8 * s)} 0z" fill="var(--st-mouth)" ${o(1.4)}/><path d="M${f1(x - 2 * s)} ${f1(y + 4 * s)}q${f1(2 * s)} ${f1(-2 * s)} ${f1(4 * s)} 0" fill="var(--st-tongue)"/><path d="M${f1(x + 4 * s)} ${f1(y + 2 * s)}q${f1(1.5 * s)} ${f1(4 * s)} 0 ${f1(6 * s)}q${f1(-1.5 * s)} ${f1(-3 * s)} 0 ${f1(-6 * s)}z" fill="var(--st-drool)" stroke="var(--st-ink)" stroke-width=".6"/>`;
    if (mood === 'joy' || mood === 'sly') return `<path d="M${f1(x - 3.4 * s)} ${y}q${f1(3.4 * s)} ${f1(6 * s)} ${f1(6.8 * s)} 0z" fill="var(--st-mouth)" stroke="var(--st-nose)" stroke-width="${f1(1.2 * s)}" stroke-linejoin="round"/>`;
    if (mood === 'oops' || mood === 'dizzy') return `<ellipse cx="${x}" cy="${f1(y + 1.5 * s)}" rx="${f1(2.2 * s)}" ry="${f1(2.6 * s)}" fill="var(--st-mouth)" stroke="var(--st-nose)" stroke-width="${f1(1.1 * s)}"/>`;
    if (mood === 'sleep') return `<path d="M${f1(x - 2.5 * s)} ${y}q${f1(2.5 * s)} ${f1(2.4 * s)} ${f1(5 * s)} 0" fill="none" stroke="var(--st-nose)" stroke-width="${f1(1.4 * s)}" stroke-linecap="round"/>`;
    return `<path d="M${f1(x - 3.2 * s)} ${y}q${f1(1.6 * s)} ${f1(2.2 * s)} ${f1(3.2 * s)} 0q${f1(1.6 * s)} ${f1(2.2 * s)} ${f1(3.2 * s)} 0" fill="none" stroke="var(--st-nose)" stroke-width="${f1(1.4 * s)}" stroke-linecap="round"/>`;
  }
  const feet = (fr, fill, x1, x2, y = 93, w = 7.5) => `<ellipse cx="${fr ? x1 - 3 : x1 + 2}" cy="${fr ? y - 2 : y}" rx="${w}" ry="4.6" fill="${fill}" ${o(1.7)}/><ellipse cx="${fr ? x2 + 3 : x2 - 2}" cy="${fr ? y : y - 2}" rx="${w}" ry="4.6" fill="${fill}" ${o(1.7)}/>`;
  const heart = (x, y, s = 1, fill = 'var(--st-heart)') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-6 2-8-1-8-4c0-3 2-5 4.5-5C-1.5-9 0-8 0-6.5 0-8 1.5-9 3.5-9 6-9 8-7 8-4c0 3-2 6-8 10z" fill="${fill}" ${o(1)}/>`;
  const sakura = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="${-r}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.9)}" transform="rotate(${a})" fill="var(--st-sakura)" stroke="var(--st-ink)" stroke-width=".8"/>`).join('')}<circle r="${f1(r * 0.42)}" fill="var(--st-sakura-in)"/></g>`;
  function quills(cx, cy, r, len, a0, a1, n) {
    const pt = (a, rr) => `${f1(cx + rr * Math.cos((a * Math.PI) / 180))} ${f1(cy + rr * Math.sin((a * Math.PI) / 180))}`;
    const st = (a1 - a0) / n;
    let d = `M${cx} ${cy}L${pt(a0, r)}`;
    for (let k = 0; k < n; k++) d += `L${pt(a0 + st * (k + 0.5), r + len * (0.85 + (0.15 * ((k * 7) % 3)) / 2))}L${pt(a0 + st * (k + 1), r)}`;
    return `${d}Z`;
  }

  /* ---------- merende ---------- */
  const SNACK = {
    berry: `<path d="M50 90C28 80 18 60 22 46c3-10 15-14 28-9 13-5 25-1 28 9 4 14-6 34-28 44z" fill="var(--st-straw)" ${o(2.4)}/>${[[36, 52], [50, 50], [64, 52], [42, 66], [58, 66], [50, 78]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="var(--st-seed)"/>`).join('')}
      <path d="M50 38L38 26l7 10-14-2 13 8 6 3 6-3 13-8-14 2 7-10z" fill="var(--st-leaf)" ${o(1.8)}/>${hi('M30 52q2-8 10-10', 3.4)}`,
    cookie: `<circle cx="50" cy="52" r="36" fill="var(--st-cookie)" ${o(2.4)}/><path d="M84 50a36 36 0 0 1-60 26 38 38 0 0 0 60-26z" fill="var(--st-cookie-2)"/>
      ${[[38, 40], [60, 36], [50, 56], [34, 62], [66, 60]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="3.6" fill="var(--st-choco)"/>`).join('')}${hi('M26 44q4-14 18-18', 3.4)}`,
    acorn: `<path d="M50 92C28 86 22 66 24 50h52c2 16-4 36-26 42z" fill="var(--st-acorn)" ${o(2.4)}/><path d="M18 52C18 32 32 22 50 22s32 10 32 30z" fill="var(--st-cap)" ${o(2.4)}/>
      <path d="M28 44l10-14M42 46l10-20M58 46l10-18M26 34l26 12M44 26l26 18" stroke="var(--st-cap-2)" stroke-width="2.2" stroke-linecap="round"/><path d="M50 22c0-7 3-11 9-13" fill="none" ${o(3)}/>${hi('M32 62q2 12 8 20', 3.4, 0.6)}`,
    apple: `<path d="M50 32C38 20 14 26 14 52c0 24 18 38 36 34 18 4 36-10 36-34 0-26-24-32-36-20z" fill="var(--st-apple)" ${o(2.4)}/><path d="M50 32c0-8 2-16 6-22" fill="none" stroke="var(--st-stem)" stroke-width="3" stroke-linecap="round"/><path d="M56 18c4-10 16-12 22-6-6 6-16 8-22 6z" fill="var(--st-leaf)" ${o(1.6)}/>${hi('M24 46q2-12 14-15', 3.6)}`,
    star: `<path d="M50 8l11 25 27 3-20 18 6 27-24-14-24 14 6-27-20-18 27-3z" fill="var(--st-gold)" ${o(2.4)}/><path d="M50 22l6 14 15 2" fill="none" stroke="var(--st-hi)" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
    basket: `<path d="M16 46h68l-8 40H24z" fill="var(--st-basket)" ${o(2.2)}/><path d="M20 58h60M22 70h56M36 46l-2 40M50 46v40M64 46l2 40" stroke="var(--st-basket-2)" stroke-width="2.2"/>
      <path d="M22 46q28-40 56 0" fill="none" ${o(3.4)}/><circle cx="36" cy="42" r="8" fill="var(--st-apple)" ${o(1.4)}/><circle cx="52" cy="38" r="8" fill="var(--st-straw)" ${o(1.4)}/><circle cx="66" cy="42" r="7" fill="var(--st-gold)" ${o(1.4)}/>`,
    melon: `<circle cx="50" cy="52" r="42" fill="var(--st-melon)" ${o(2.6)}/><path d="M50 10C34 28 34 76 50 94M50 10C66 28 66 76 50 94M24 18C10 38 12 70 28 88M76 18C90 38 88 70 72 88" fill="none" stroke="var(--st-melon-2)" stroke-width="7" stroke-linecap="round"/>${hi('M22 40q6-16 22-24', 5, 0.7)}`,
    slice: `<path d="M8 40h84C92 70 72 88 50 88S8 70 8 40z" fill="var(--st-melon)" ${o(2.4)}/><path d="M16 40h68C82 62 68 78 50 78S18 62 16 40z" fill="var(--st-melon-in)"/>${[[34, 52], [50, 58], [66, 52], [42, 66], [58, 66]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="var(--st-ink)"/>`).join('')}`,
    cake: `<path d="M10 60h80v26H10z" fill="var(--st-cake)" ${o(2.4)}/><path d="M16 38h68v24H16z" fill="var(--st-cake-2)" ${o(2.2)}/><path d="M10 60c6 8 12 0 18 6s12-2 18 4 12-4 18 2 12-2 16 2" fill="none" stroke="var(--st-cream)" stroke-width="5" stroke-linecap="round"/>
      <path d="M16 38c6 6 12-2 18 4s12-2 18 2 12-2 18 2 10-2 14 0" fill="none" stroke="var(--st-cream)" stroke-width="5" stroke-linecap="round"/>${[24, 40, 56, 72].map((x) => `<circle cx="${x}" cy="32" r="6" fill="var(--st-straw)" ${o(1.4)}/>`).join('')}<path d="M48 26v-14" ${o(2.6)}/><path d="M48 12c-4-4-2-8 0-10 2 2 4 6 0 10z" fill="var(--st-gold)" ${o(1)}/>`,
  };

  /* ---------- Hari (riccio) ---------- */
  function hari(p = {}) {
    const fr = p.fr | 0, m = p.mood || '', arm = p.arm || 0;
    const armSvg = arm === 1 ? `<path d="M62 70q14-2 22-8" fill="none" stroke="var(--st-ink)" stroke-width="9" stroke-linecap="round"/><path d="M62 70q14-2 22-8" fill="none" stroke="var(--st-ear)" stroke-width="6" stroke-linecap="round"/><svg x="78" y="50" width="20" height="20" viewBox="0 0 100 100">${SNACK.berry}</svg>`
      : arm === 2 ? `<path d="M60 66q10-14 4-26" fill="none" stroke="var(--st-ink)" stroke-width="9" stroke-linecap="round"/><path d="M60 66q10-14 4-26" fill="none" stroke="var(--st-ear)" stroke-width="6" stroke-linecap="round"/>`
        : arm === 3 ? `<path d="M40 68q-8-16 0-30M62 68q8-16 0-30" fill="none" stroke="var(--st-ink)" stroke-width="9" stroke-linecap="round"/><path d="M40 68q-8-16 0-30M62 68q8-16 0-30" fill="none" stroke="var(--st-ear)" stroke-width="6" stroke-linecap="round"/>`
          : `<ellipse cx="62" cy="74" rx="5.5" ry="7" fill="var(--st-ear)" ${o(1.6)} transform="rotate(${fr ? 18 : -14} 62 70)"/>`;
    return `${feet(fr, 'var(--st-ear)', 42, 58)}
      <path d="${quills(46, 62, 24, 12, 110, 300, 11)}" fill="var(--st-quill-2)" ${o(2)}/>
      <path d="${quills(46, 62, 20, 8, 118, 292, 10)}" fill="var(--st-quill)"/>
      <ellipse cx="50" cy="72" rx="20" ry="18" fill="var(--st-quill)" ${o(2)}/>
      <ellipse cx="56" cy="76" rx="12" ry="12" fill="var(--st-face)"/>
      <path d="${quills(52, 46, 20, 11, 150, 320, 9)}" fill="var(--st-quill-2)" ${o(2)}/>
      <path d="${quills(52, 46, 17, 7, 156, 312, 8)}" fill="var(--st-quill)"/>
      <circle cx="44" cy="30" r="6" fill="var(--st-ear)" ${o(1.8)}/><circle cx="44" cy="30.5" r="3" fill="var(--st-ear-in)"/>
      <path d="M50 36C64 30 82 38 84 52C86 64 74 70 62 68C50 66 44 56 48 46Z" fill="var(--st-face)" ${o(2.2)}/>
      ${eyes(60, 72, 48, 1, m)}${blush(57, 58)}${blush(77, 57, 3.5)}
      <ellipse cx="84" cy="52" rx="3.6" ry="3" fill="var(--st-nose)"/>
      ${mouth(74, 61, 0.9, m)}
      ${armSvg}${sakura(52, 28, 5.5)}${hi('M30 56q4-10 14-14', 2.6, 0.5)}`;
  }
  /* ---------- Kiki (scoiattolina) ---------- */
  function kiki(p = {}) {
    const fr = p.fr | 0, m = p.mood || '', arm = p.arm || 0;
    const armSvg = arm === 1 ? `<path d="M60 70q14-2 22-8" fill="none" stroke="var(--st-ink)" stroke-width="9" stroke-linecap="round"/><path d="M60 70q14-2 22-8" fill="none" stroke="var(--st-kiki)" stroke-width="6" stroke-linecap="round"/><svg x="78" y="50" width="20" height="20" viewBox="0 0 100 100">${SNACK.acorn}</svg>`
      : arm === 2 ? `<path d="M58 66q10-14 4-26" fill="none" stroke="var(--st-ink)" stroke-width="9" stroke-linecap="round"/><path d="M58 66q10-14 4-26" fill="none" stroke="var(--st-kiki)" stroke-width="6" stroke-linecap="round"/>`
        : arm === 3 ? `<path d="M40 68q-8-16 0-30M60 68q8-16 0-30" fill="none" stroke="var(--st-ink)" stroke-width="9" stroke-linecap="round"/><path d="M40 68q-8-16 0-30M60 68q8-16 0-30" fill="none" stroke="var(--st-kiki)" stroke-width="6" stroke-linecap="round"/>`
          : `<ellipse cx="60" cy="74" rx="5" ry="6.5" fill="var(--st-kiki)" ${o(1.6)} transform="rotate(${fr ? 18 : -14} 60 70)"/>`;
    const sw = fr ? 4 : 0;
    return `<path d="M40 86C14 92 4 70 10 50C14 34 6 22 18 14C30 6 42 16 38 28C34 38 22 36 24 48C26 60 40 62 44 74Z" fill="var(--st-kiki-tail)" ${o(2.2)} transform="rotate(${sw} 40 86)"/>
      <path d="M20 20c6-4 14 0 14 8M16 44c-2 10 6 18 16 20" fill="none" stroke="var(--st-kiki-belly)" stroke-width="4" stroke-linecap="round" opacity=".7" transform="rotate(${sw} 40 86)"/>
      ${feet(fr, 'var(--st-kiki-2)', 44, 60)}
      <ellipse cx="52" cy="72" rx="17" ry="17" fill="var(--st-kiki)" ${o(2)}/>
      <ellipse cx="57" cy="76" rx="10" ry="12" fill="var(--st-kiki-belly)"/>
      <path d="M44 34L42 16L54 28Z" fill="var(--st-kiki)" ${o(1.8)}/><path d="M42 16l-3-5M42 16l2-6" ${o(1.6)}/>
      <path d="M60 30L64 12L70 28Z" fill="var(--st-kiki)" ${o(1.8)}/><path d="M64 12l-2-6M64 12l3-5" ${o(1.6)}/>
      <circle cx="58" cy="48" r="19" fill="var(--st-kiki)" ${o(2.2)}/>
      <path d="M62 50c6-2 16 0 18 6c2 8-6 12-14 10c-6-2-8-10-4-16z" fill="var(--st-kiki-belly)"/>
      ${eyes(60, 71, 46, 0.95, m)}${blush(54, 57, 4)}${blush(77, 56, 3.2)}
      <ellipse cx="79" cy="53" rx="3" ry="2.4" fill="var(--st-nose)"/>
      ${mouth(73, 59, 0.85, m)}
      <path d="M40 60q14 10 28 0l2 5q-16 11-32 0z" fill="var(--st-scarf)" ${o(1.4)}/>
      <path d="M48 30c4-8 14-8 18-2-6 4-12 4-18 2z" fill="var(--st-leaf)" ${o(1.4)}/>
      ${armSvg}${hi('M42 40q4-8 12-10', 2.4, 0.5)}`;
  }

  /* ---------- animali affamati (rivolti a destra) ---------- */
  // mood: '' camminata · 'open' bocca aperta (sta per mordicchiare) · 'joy' sazio · 'dizzy' imbambolato · 'sly' (procione)
  const ANIMAL = {
    bunny: (fr, m) => `<ellipse cx="40" cy="18" rx="6" ry="17" transform="rotate(-14 40 18)" fill="var(--st-bunny)" ${o(1.8)}/><ellipse cx="40" cy="20" rx="3" ry="11" transform="rotate(-14 40 20)" fill="var(--st-bunny-in)"/>
      <ellipse cx="54" cy="18" rx="6" ry="17" transform="rotate(10 54 18)" fill="var(--st-bunny)" ${o(1.8)}/><ellipse cx="54" cy="20" rx="3" ry="11" transform="rotate(10 54 20)" fill="var(--st-bunny-in)"/>
      ${feet(fr, 'var(--st-bunny)', 40, 58, 93, 8)}<circle cx="28" cy="74" r="6" fill="var(--st-bunny)" ${o(1.6)}/>
      <ellipse cx="48" cy="74" rx="20" ry="17" fill="var(--st-bunny)" ${o(2)}/>
      <circle cx="54" cy="48" r="18" fill="var(--st-bunny)" ${o(2.2)}/>
      ${eyes(55, 66, 46, 0.9, m)}${blush(50, 55, 4)}${blush(71, 54, 3)}
      <path d="M71 51h4l-2 2.4z" fill="var(--st-bunny-in)" ${o(0.8)}/>${mouth(70, 56, 0.8, m)}${hi('M38 42q3-8 10-10')}`,
    raccoon: (fr, m) => `<path d="M30 82C10 84 4 66 14 56" fill="none" stroke="var(--st-ink)" stroke-width="15" stroke-linecap="round"/><path d="M30 82C10 84 4 66 14 56" fill="none" stroke="var(--st-rac)" stroke-width="12" stroke-linecap="round"/>
      <path d="M22 84l-2-10M12 76l8-6M10 62l9 2" stroke="var(--st-rac-2)" stroke-width="4" stroke-linecap="round"/>
      ${feet(fr, 'var(--st-rac-2)', 40, 58)}
      <ellipse cx="48" cy="74" rx="19" ry="17" fill="var(--st-rac)" ${o(2)}/><ellipse cx="53" cy="78" rx="10" ry="10" fill="var(--st-rac-belly)"/>
      <path d="M38 36L36 20L48 30ZM62 30L70 18L70 34Z" fill="var(--st-rac)" ${o(1.8)}/>
      <ellipse cx="56" cy="48" rx="21" ry="17" fill="var(--st-rac)" ${o(2.2)}/>
      <path d="M44 44c6-6 30-6 34 2c-2 8-10 6-16 4c-6 2-14 4-18-6z" fill="var(--st-rac-mask)"/>
      <path d="M62 54c8-2 16 0 18 4s-4 6-10 6c-6 0-10-4-8-10z" fill="var(--st-rac-belly)"/>
      ${eyes(56, 68, 46, 0.85, m)}<ellipse cx="80" cy="56" rx="3" ry="2.4" fill="var(--st-nose)"/>${mouth(72, 60, 0.8, m)}
      ${m === 'sly' ? `<svg x="62" y="62" width="22" height="22" viewBox="0 0 100 100">${SNACK.cookie}</svg>` : ''}${hi('M38 44q3-6 8-8')}`,
    boar: (fr, m) => `<path d="M14 66q-8-2-8 6" fill="none" ${o(2)}/>
      <rect x="26" y="${fr ? 82 : 84}" width="9" height="11" rx="3" fill="var(--st-boar-2)" ${o(1.6)}/><rect x="56" y="${fr ? 84 : 82}" width="9" height="11" rx="3" fill="var(--st-boar-2)" ${o(1.6)}/>
      <ellipse cx="44" cy="70" rx="32" ry="20" fill="var(--st-boar)" ${o(2.2)}/>
      <path d="M22 60q8-6 16 0M30 54q8-6 16 0M40 52q8-6 16 0" fill="none" stroke="var(--st-boar-stripe)" stroke-width="4" stroke-linecap="round"/>
      <path d="M60 50L58 36L70 46Z" fill="var(--st-boar)" ${o(1.8)}/>
      <ellipse cx="70" cy="62" rx="17" ry="15" fill="var(--st-boar)" ${o(2.2)}/>
      <ellipse cx="86" cy="66" rx="7" ry="6" fill="var(--st-snout)" ${o(1.6)}/><circle cx="84.5" cy="65" r="1.2" fill="var(--st-boar-2)"/><circle cx="88" cy="65" r="1.2" fill="var(--st-boar-2)"/>
      <path d="M80 72q2 6 6 6" fill="none" stroke="var(--st-tusk)" stroke-width="3" stroke-linecap="round"/>
      ${eyes(68, 78, 58, 0.75, m)}${blush(66, 68, 3.4)}${m === 'open' ? mouth(78, 74, 0.7, 'open') : ''}${hi('M24 64q4-8 14-10')}`,
    magpie: (fr, m) => `<path d="M20 60L2 52L6 64L0 72L22 68Z" fill="var(--st-mag)" ${o(1.6)}/>
      <path d="M34 92v-14M50 92v-14" ${o(2)}/>
      <ellipse cx="42" cy="64" rx="22" ry="16" fill="var(--st-mag)" ${o(2)}/><ellipse cx="48" cy="70" rx="13" ry="9" fill="var(--st-mag-belly)"/>
      <path d="${fr ? 'M30 58C24 36 40 26 54 40C50 50 42 58 30 58Z' : 'M30 60C18 74 34 84 52 70C48 62 40 58 30 60Z'}" fill="var(--st-mag-wing)" ${o(1.8)}/>
      <circle cx="62" cy="46" r="14" fill="var(--st-mag)" ${o(2)}/>
      <path d="M74 44l12 3-12 5z" fill="var(--st-beak)" ${o(1.4)}/>
      ${eyes(62, 70, 44, 0.75, m === 'open' ? '' : m)}${blush(62, 52, 3)}${hi('M52 40q3-6 8-6')}`,
    fox: (fr, m) => `<path d="M30 80C8 84 2 60 14 48C20 60 28 68 34 70Z" fill="var(--st-fox)" ${o(2)}/><path d="M14 48c-4 6-4 12-2 16l8-6z" fill="var(--st-fox-tip)"/>
      ${feet(fr, 'var(--st-fox-2)', 40, 58)}
      <ellipse cx="48" cy="74" rx="18" ry="16" fill="var(--st-fox)" ${o(2)}/><ellipse cx="54" cy="78" rx="9" ry="10" fill="var(--st-fox-tip)"/>
      <path d="M42 36L40 14L54 28ZM60 28L72 12L70 34Z" fill="var(--st-fox)" ${o(1.8)}/><path d="M43 32L42 20L50 28Z" fill="var(--st-fox-in)"/>
      <path d="M38 46C40 30 66 26 76 42C82 50 90 52 88 58C80 64 60 66 48 62C40 58 36 54 38 46Z" fill="var(--st-fox)" ${o(2.2)}/>
      <path d="M60 56C70 54 84 54 88 58C80 64 66 64 60 56Z" fill="var(--st-fox-tip)"/>
      ${eyes(56, 68, 46, 0.85, m)}<ellipse cx="88" cy="57" rx="2.8" ry="2.2" fill="var(--st-nose)"/>${m === 'open' ? mouth(76, 60, 0.7, 'open') : ''}${hi('M42 44q3-8 10-10')}`,
    bear: (fr, m) => `<circle cx="34" cy="26" r="9" fill="var(--st-bear)" ${o(2)}/><circle cx="34" cy="27" r="4.5" fill="var(--st-muzzle)"/><circle cx="66" cy="24" r="9" fill="var(--st-bear)" ${o(2)}/><circle cx="66" cy="25" r="4.5" fill="var(--st-muzzle)"/>
      ${feet(fr, 'var(--st-bear-2)', 36, 62, 93, 10)}
      <ellipse cx="48" cy="72" rx="28" ry="22" fill="var(--st-bear)" ${o(2.2)}/><ellipse cx="52" cy="76" rx="15" ry="13" fill="var(--st-muzzle)" opacity=".7"/>
      <circle cx="52" cy="44" r="22" fill="var(--st-bear)" ${o(2.4)}/>
      <ellipse cx="66" cy="52" rx="11" ry="8.5" fill="var(--st-muzzle)" ${o(1.6)}/><ellipse cx="72" cy="48" rx="3.6" ry="2.8" fill="var(--st-nose)"/>
      ${eyes(52, 66, 40, 0.95, m)}${blush(46, 52, 4.4)}${mouth(66, 55, 0.85, m)}${hi('M34 40q4-10 14-13')}`,
    gull: (fr, m) => `<path d="M24 62L4 56L10 66L4 72L26 70Z" fill="var(--st-gull-2)" ${o(1.6)}/>
      <path d="M38 92v-14M54 92v-14" stroke="var(--st-beak)" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="46" cy="66" rx="24" ry="17" fill="var(--st-gull)" ${o(2)}/>
      <path d="${fr ? 'M32 60C24 38 44 30 58 44C52 54 44 60 32 60Z' : 'M32 62C20 76 38 86 56 72C52 64 44 60 32 62Z'}" fill="var(--st-gull-2)" ${o(1.8)}/>
      <circle cx="64" cy="44" r="16" fill="var(--st-gull)" ${o(2)}/>
      <path d="M78 44l16 4-16 6z" fill="var(--st-beak)" ${o(1.4)}/><circle cx="90" cy="49" r="1.6" fill="var(--st-beak-2)"/>
      ${eyes(64, 73, 42, 0.8, m === 'open' ? '' : m)}${blush(62, 51, 3.4)}${hi('M52 38q3-6 9-7')}`,
    panda: (fr, m) => `<circle cx="34" cy="26" r="9" fill="var(--st-panda-2)" ${o(2)}/><circle cx="66" cy="24" r="9" fill="var(--st-panda-2)" ${o(2)}/>
      ${feet(fr, 'var(--st-panda-2)', 36, 62, 93, 10)}
      <ellipse cx="48" cy="72" rx="28" ry="22" fill="var(--st-panda)" ${o(2.2)}/><path d="M24 64q24 10 48 0" fill="none" stroke="var(--st-panda-2)" stroke-width="9" stroke-linecap="round"/>
      <circle cx="52" cy="44" r="22" fill="var(--st-panda)" ${o(2.4)}/>
      <ellipse cx="51" cy="41" rx="6" ry="7.5" transform="rotate(20 51 41)" fill="var(--st-panda-2)"/><ellipse cx="66" cy="40" rx="5" ry="6.5" transform="rotate(-20 66 40)" fill="var(--st-panda-2)"/>
      <ellipse cx="68" cy="53" rx="9" ry="6.5" fill="var(--st-panda)" ${o(1.4)}/><ellipse cx="73" cy="50" rx="3.2" ry="2.4" fill="var(--st-nose)"/>
      ${eyes(52, 66, 41, 0.85, m)}${blush(44, 52, 4.4)}${mouth(68, 56, 0.8, m)}${hi('M34 40q4-10 14-13')}`,
  };
  function animal(k, p = {}) {
    const m = p.mood || '', fr = p.fr | 0;
    let svg = (ANIMAL[k] || ANIMAL.bunny)(fr, m);
    if (m === 'joy') svg += heart(78, 18, 0.9);
    if (m === 'dizzy') svg += [[40, 10], [58, 6], [74, 14]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.5)" d="M0-10l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="var(--st-gold)" ${o(1)}/>`).join('');
    return svg;
  }
  // animalone: lo stesso animale con bavaglino col cuore e coroncina
  function boss(k, p = {}) {
    const inner = animal(k, p);
    const bib = `<path d="M54 60q12 6 24 0l-2 13q-10 5-20 0z" fill="var(--st-bib)" ${o(1.6)}/>${heart(66, 66, 0.45)}`;
    const crown = `<path d="M44 20L46 6L52 14L58 2L64 14L70 6L72 20Z" fill="var(--st-crown)" ${o(1.6)}/><circle cx="58" cy="12" r="2.4" fill="var(--st-gem)" ${o(0.8)}/>`;
    return inner + (k === 'magpie' || k === 'gull' ? '' : bib) + crown;
  }

  /* ---------- oggetti della strada ---------- */
  const OBJ = {
    crate: `<path d="M12 40h76v52H12z" fill="var(--st-crate)" ${o(2.4)}/><path d="M12 54h76M12 76h76M24 40v52M76 40v52" stroke="var(--st-crate-2)" stroke-width="3"/>
      ${[[26, 34, 'apple'], [44, 30, 'berry'], [62, 34, 'apple'], [76, 32, 'berry']].map(([x, y, k]) => `<svg x="${x - 10}" y="${y - 12}" width="22" height="22" viewBox="0 0 100 100">${SNACK[k]}</svg>`).join('')}
      <path d="M12 92h76" ${o(2.4)}/>${hi('M18 48v10', 3, 0.5)}`,
    crack: `<path d="M12 40h76v52H12z" fill="var(--st-crate)" ${o(2.4)}/><path d="M12 54h76M12 76h76M24 40v52M76 40v52" stroke="var(--st-crate-2)" stroke-width="3"/><path d="M40 40l8 14-6 10 10 12-4 16" fill="none" ${o(2.4)}/>`,
    cart: `<path d="M8 30h12l10 44h52l8-30H26" fill="none" ${o(3.4)}/><path d="M26 44h64l-8 30H32z" fill="var(--st-cart)" ${o(2)}/><path d="M34 44l2 30M48 44v30M62 44l-2 30M76 44l-4 30M30 58h56" stroke="var(--st-cart-2)" stroke-width="2"/>
      <svg x="30" y="22" width="24" height="24" viewBox="0 0 100 100">${SNACK.cookie}</svg><svg x="50" y="20" width="24" height="24" viewBox="0 0 100 100">${SNACK.apple}</svg><svg x="66" y="24" width="20" height="20" viewBox="0 0 100 100">${SNACK.berry}</svg>
      <circle cx="38" cy="86" r="7" fill="var(--st-cart-2)" ${o(2)}/><circle cx="76" cy="86" r="7" fill="var(--st-cart-2)" ${o(2)}/>`,
  };

  /* ---------- illustrazione della card (120×90) ---------- */
  const at = (svg, x, y, s, flip) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 100 100"${flip ? '' : ''}>${flip ? `<g transform="translate(100 0) scale(-1 1)">${svg}</g>` : svg}</svg>`;
  function street(extra) {
    return `<svg viewBox="0 0 120 90" aria-hidden="true">
      <rect x="4" y="4" width="112" height="82" rx="14" fill="var(--st-sky-2)"/>
      <path d="M4 18Q4 4 18 4H102Q116 4 116 18V40H4Z" fill="var(--st-sky-1)"/>
      <path d="M4 46V30h14v-8h12v10h10V20h16v12h10v-8h14v14h12v-6h14v24Z" fill="var(--st-far)"/>
      <path d="M10 52V36l12-6 12 6v16zM40 52V34l14-6 14 6v18zM74 52V36l12-6 12 6v16z" fill="var(--st-mid)" ${o(1)}/>
      <path d="M8 36l14-8 14 8M38 34l16-8 16 8M72 36l14-8 14 8" fill="none" stroke="var(--st-awning)" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M4 52h112v20Q116 86 102 86H18Q4 86 4 72Z" fill="var(--st-ground-1)"/>
      <path d="M4 58h112M4 70h112" stroke="var(--st-ground-2)" stroke-width="2" stroke-dasharray="6 5"/>
      ${extra}</svg>`;
  }
  const card = () => street(`${at(hari({ arm: 1 }), 18, 40, 34)}${at(kiki({ fr: 1 }), 2, 46, 30)}
    ${at(animal('raccoon', { mood: 'open' }), 70, 38, 32, true)}${at(animal('bunny', { mood: 'joy' }), 92, 44, 24, true)}
    <svg x="50" y="44" width="10" height="10" viewBox="0 0 100 100">${SNACK.cookie}</svg>`);

  HH.streetArt = { hari, kiki, animal, boss, OBJ, SNACK, heart, sakura, street, card, at, o, hi };
})(typeof globalThis !== 'undefined' ? globalThis : window);
