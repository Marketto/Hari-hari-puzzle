/* Hari Home — disegni SVG (solo token CSS --lh-*): icone, Hari alle quattro età, amici, mappa del quartiere,
 * illustrazione della card e del tutorial. Funzioni pure che restituiscono stringhe: niente DOM.
 *
 * HH.lifeArt.icon(name)              icona 24×24 a tratto (currentColor)
 * HH.lifeArt.hari(phase, pose, fr)   Hari 100×100 (piedi in basso al centro). phase 0 giovane · 1 adulto ·
 *                                    2 maturo (occhiali, aculei brizzolati) · 3 nonno (cardigan, bastone, aculei grigi)
 *                                    pose: '' | 'joy' | 'sad' | 'sleep'
 * HH.lifeArt.friend(kind, pose, fr)  coniglietta, orsetto, pulcino, gattina, maialino
 * HH.lifeArt.map(opts)               cartolina isometrica del quartiere con i luoghi (data-place)
 * HH.lifeArt.card()                  illustrazione 120×90 della card
 * HH.lifeArt.scene(kind, o)          vignetta animata di un luogo del quartiere (spesa, palestra, parco, caffè, dottore, negozio…)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const f1 = (n) => +n.toFixed(1);

  /* ---------- icone ---------- */
  const F = 'fill="currentColor" stroke="none"';
  const IC = {
    mood: `<circle cx="12" cy="12" r="8.8"/><path d="M8.3 13.8q3.7 3.6 7.4 0"/><circle cx="9" cy="9.8" r="1.3" ${F}/><circle cx="15" cy="9.8" r="1.3" ${F}/>`,
    health: '<path d="M12 20s-7.2-4.4-7.2-10.2a4 4 0 0 1 7.2-2.4 4 4 0 0 1 7.2 2.4C19.2 15.6 12 20 12 20z"/><path d="M12 9.6v5M9.5 12.1h5"/>',
    energy: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/><path d="M15 4h3l-3 3.4h3"/>',
    food: `<path d="M12 4c-3.4 0-8 8.4-8 11.8A3.2 3.2 0 0 0 7.2 19h9.6a3.2 3.2 0 0 0 3.2-3.2C20 12.4 15.4 4 12 4z"/><rect x="8.6" y="13.6" width="6.8" height="5.4" rx="1" ${F}/>`,
    stress: '<path d="M7 15.8a3.9 3.9 0 0 1 .4-7.8A5 5 0 0 1 17 9.4a3.2 3.2 0 0 1 0 6.4z"/><path d="M12.6 12.6l-2 3.4h3.2l-2 3.6"/>',
    social: '<circle cx="8.5" cy="8.8" r="3"/><circle cx="16.2" cy="9.8" r="2.5"/><path d="M3.4 19.2c.5-3.2 2.5-5 5.1-5s4.6 1.8 5.1 5M14 19.2c.3-2.3 1.2-3.8 2.4-3.8s2.6 1.5 3 3.8"/>',
    fun: '<path d="M12 3.4l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.7l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    hygiene: '<path d="M12 3.4c3 4 5.6 7 5.6 10.2a5.6 5.6 0 0 1-11.2 0C6.4 10.4 9 7.4 12 3.4z"/><path d="M9.6 14a2.4 2.4 0 0 0 2.4 2.4"/>',
    sleep: '<path d="M17 15A7 7 0 0 1 8.2 6.2 7 7 0 1 0 17 15z"/><path d="M14 4h3.5L14 8h3.5"/>',
    eat: '<path d="M12 7.6c-2-1.5-7-1.3-7 4.6 0 4 3 8 5 8 .8 0 1.3-.4 2-.4s1.2.4 2 .4c2 0 5-4 5-8 0-5.9-5-6.1-7-4.6z"/><path d="M12 7.6c0-2 1-3.6 2.6-4.1"/>',
    cook: '<circle cx="10" cy="14.2" r="5.4"/><path d="M15.4 14.2H21M8 6.4c0-1 1.1-1.5 1.1-2.6M11.6 6.4c0-1 1.1-1.5 1.1-2.6"/>',
    shower: '<path d="M5 20.5V8a4 4 0 0 1 8 0"/><path d="M10 9h6.4l-1 2.2h-4.4z"/><path d="M11 14.4v1M13.6 14.4v1M16.2 14.4v1M12.2 17.8v1M15 17.8v1"/>',
    bath: '<path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M6 12V6.4a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
    relax: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12.2a2 2 0 0 1 4 0V14h10v-1.8a2 2 0 0 1 4 0V17H3z"/><path d="M5 17v2.2M19 17v2.2"/>',
    watch: '<rect x="3" y="7" width="18" height="12.4" rx="2.6"/><path d="M8.4 3.4L12 7l3.6-3.6"/><path d="M10.4 10.6v5l4-2.5z" fill="currentColor"/>',
    read: '<path d="M12 6.6C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.6 2-1.6 5-2.1 8-1.6V5c-3-.5-6 0-8 1.6zM12 6.6v13"/>',
    fish: `<path d="M3.5 12c3-4.6 9-5.6 13 0-4 5.6-10 4.6-13 0zM16.5 12l4-3.2v6.4z"/><circle cx="8" cy="11" r="1.1" ${F}/>`,
    workout: '<path d="M7 7.6v8.8M4.4 9.8v4.4M17 7.6v8.8M19.6 9.8v4.4M7 12h10"/>',
    work: '<rect x="3.4" y="7.6" width="17.2" height="11.6" rx="2.6"/><path d="M9 7.6V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.6M3.4 12.6h17.2"/>',
    call: '<path d="M6.6 3.6h3l1.5 4-2.1 1.5a10 10 0 0 0 6 6l1.5-2.1 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.6 5.6a2 2 0 0 1 2-2z"/>',
    invite: `<path d="M4 11l8-7 8 7v8.6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M12 17.8c-2.2-1.4-3.4-2.6-3.4-3.8a1.7 1.7 0 0 1 3.4-.6 1.7 1.7 0 0 1 3.4.6c0 1.2-1.2 2.4-3.4 3.8z" ${F}/>`,
    repair: '<path d="M15 4.4a4.6 4.6 0 0 0-4.3 6.1l-6.3 6.3a2 2 0 0 0 2.8 2.8l6.3-6.3a4.6 4.6 0 0 0 6.1-4.3l-2.8 2.8-2.6-.6-.6-2.6z"/>',
    stop: '<circle cx="12" cy="12" r="8.6"/><path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8"/>',
    go: '<path d="M5 12h13M13 6.4l5.6 5.6-5.6 5.6"/>',
    market: '<path d="M4 10h16l-1.8 8.2a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8z"/><path d="M8 10l3-5.6M16 10l-3-5.6M9.6 13.8v2.8M14.4 13.8v2.8"/>',
    doctor: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M12 8v8M8 12h8"/>',
    park: '<path d="M12 21v-5.6"/><path d="M12 3a5 5 0 0 1 4.6 7A4 4 0 0 1 15 17.4H9A4 4 0 0 1 7.4 10 5 5 0 0 1 12 3z"/>',
    cafe: '<path d="M4.4 9h12v4.6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.4 10.4H18a2.3 2.3 0 0 1 0 4.6h-1.7M8 3.4c0 1.3 1.2 1.6 1.2 2.9M11.6 3.4c0 1.3 1.2 1.6 1.2 2.9"/>',
    office: '<path d="M4 9.6L5.6 4h12.8L20 9.6a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0z"/><path d="M5.6 12.6V20h12.8v-7.4M10 20v-4.6h4V20"/>',
    home: '<path d="M4 11.4l8-7 8 7V19a1 1 0 0 1-1 1h-4.6v-5.4H9.6V20H5a1 1 0 0 1-1-1z"/>',
    build: '<path d="M13.6 7l3.4 3.4M4.6 19.4l9-9"/><path d="M10.8 4.6l3-1 6.6 6.6-1 3-2-2-2.4 1.4-3.6-3.6 1.4-2.4z"/>',
    town: '<path d="M3.4 6.6l5.6-2 6 2 5.6-2v13l-5.6 2-6-2-5.6 2z"/><path d="M9 4.6v13M15 6.6v13"/>',
    life: '<path d="M12 20.4v-8.2"/><path d="M12 12.2c0-4 3-6.6 7.2-6.6 0 4-3 6.6-7.2 6.6zM12 14.6c0-3-2.6-5-6.2-5 0 3 2.6 5 6.2 5z"/>',
    rotate: '<path d="M19 12a7 7 0 1 1-2-4.9"/><path d="M19.6 4v4h-4"/>',
    move: '<path d="M12 3.4v17.2M3.4 12h17.2M12 3.4L9.4 6M12 3.4L14.6 6M12 20.6L9.4 18M12 20.6l2.6-2.6M3.4 12L6 9.4M3.4 12L6 14.6M20.6 12L18 9.4M20.6 12L18 14.6"/>',
    sell: '<path d="M3.6 12.6V4.4h8.2l9 9-8.2 8.2z"/><circle cx="8" cy="8.8" r="1.6"/>',
    check: '<path d="M5 12.6l4.6 4.6L19 7.6"/>',
    close: '<path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6"/>',
    cake: `<path d="M4.4 12.8h15.2v7.4H4.4z"/><path d="M4.4 16.4c1.5 1 2.6 1 3.8 0s2.5-1 3.8 0 2.6 1 3.8 0 2.3-1 3.8 0M12 12.8V9.4"/><path d="M12 4.2c1.1 1.3 1.1 2.7 0 3.3-1.1-.6-1.1-2 0-3.3z" ${F}/>`,
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M18.6 14.4A7.4 7.4 0 0 1 9.6 5.4a7.4 7.4 0 1 0 9 9z"/>',
    beauty: '<circle cx="12" cy="12" r="2.3"/><path d="M12 3.4a3 3 0 0 1 0 6 3 3 0 0 1 0-6zM12 14.6a3 3 0 0 1 0 6 3 3 0 0 1 0-6zM3.4 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0zM14.6 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0z"/>',
    leaf: '<path d="M5 19C5 10 11 5 19 5c0 8-5 14-14 14zM5 19l8-8"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.4 4.4L12 6l2.6-1.6M9.4 19.6L12 18l2.6 1.6"/>',
    fridge: '<rect x="6" y="3" width="12" height="18" rx="2.6"/><path d="M6 10h12M9 6v2M9 13v3"/>',
    helper: '<circle cx="10" cy="8" r="3.4"/><path d="M3.4 20c.6-4 3.2-6 6.6-6s5.9 2 6.5 6M18.6 7v6M15.6 10h6"/>',
    up: '<circle cx="12" cy="12" r="8.6"/><path d="M12 16.6V7.4M8 11.2l4-3.8 4 3.8"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8l-1-3H9z"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.6"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6 .5 6-1.5S14 5 12 9z"/>',
    bills: '<path d="M6 3.6h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9 8h6M9 11.6h6M9 15h4"/>',
    sick: '<path d="M10 14.6V5a2 2 0 0 1 4 0v9.6a3.6 3.6 0 1 1-4 0z"/><path d="M12 9v7.4"/>',
    pause: `<rect x="6.4" y="5" width="3.8" height="14" rx="1.4" ${F}/><rect x="13.8" y="5" width="3.8" height="14" rx="1.4" ${F}/>`,
    play: '<path d="M8 5.6v12.8a1 1 0 0 0 1.5.9l9.6-6.4a1 1 0 0 0 0-1.8L9.5 4.7A1 1 0 0 0 8 5.6z" fill="currentColor"/>',
    acorn: '<path d="M6.6 11h10.8c0 5.4-2.8 9.2-5.4 10.2C9.4 20.2 6.6 16.4 6.6 11z" fill="var(--acorn)" stroke="none"/><path d="M4.6 11.2C4.6 7 7.8 4.6 12 4.6s7.4 2.4 7.4 6.6z" fill="var(--acorn-cap)" stroke="none"/><path d="M12 4.6V2.4" stroke="var(--acorn-cap)"/>',
    wall: '<path d="M4 5h16v14H4zM4 9.6h16M4 14.4h16M9.4 5v4.6M15 9.6v4.8M9.4 14.4V19"/>',
    floor: '<path d="M12 4l9 5-9 5-9-5zM3 9v3l9 5 9-5V9"/>',
    house: '<path d="M3.6 11l8.4-7 8.4 7M6 9.4V20h12V9.4M10 20v-5h4v5"/><path d="M16 4.6h2.4v3"/>',
  };
  const icon = (n) => `<svg class="lh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
  // versione "da cuocere" in bitmap per il canvas (colore esplicito, niente currentColor)
  const iconFor = (n, col) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="${col}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" color="${col}">${(IC[n] || '').replace(/currentColor/g, col)}</svg>`;

  /* ---------- personaggi cel (viewBox 100) ---------- */
  const o = (w = 2) => `stroke="var(--lh-ink)" stroke-width="${f1(w * 0.8)}" stroke-linejoin="round" stroke-linecap="round"`;
  const hl = (d, w = 2.6, op = 0.8) => `<path d="${d}" fill="none" stroke="var(--lh-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  function quills(cx, cy, r, len, a0, a1, n) {
    const pt = (a, rr) => `${f1(cx + rr * Math.cos(a * Math.PI / 180))} ${f1(cy + rr * Math.sin(a * Math.PI / 180))}`;
    const st = (a1 - a0) / n;
    let d = `M${cx} ${cy}L${pt(a0, r)}`;
    for (let k = 0; k < n; k++) d += `L${pt(a0 + st * (k + 0.5), r + len * (0.85 + 0.15 * ((k * 7) % 3) / 2))}L${pt(a0 + st * (k + 1), r)}`;
    return `${d}Z`;
  }
  const eye = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--lh-eye)"/>
    <ellipse cx="${cx}" cy="${f1(cy + ry * 0.42)}" rx="${f1(rx * 0.7)}" ry="${f1(ry * 0.4)}" fill="var(--lh-iris)"/>
    <circle cx="${f1(cx + rx * 0.32)}" cy="${f1(cy - ry * 0.36)}" r="${f1(rx * 0.46)}" fill="var(--lh-hi)"/>
    <circle cx="${f1(cx - rx * 0.36)}" cy="${f1(cy + ry * 0.42)}" r="${f1(rx * 0.2)}" fill="var(--lh-hi)"/>`;
  const blush = (cx, cy, rx, ry) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="var(--lh-blush)"/>`;
  function face(cx, cy, sp, mood, k = 1) {
    const L0 = cx - sp, R0 = cx + sp, w = 5 * k;
    let e;
    if (mood === 'joy') e = [L0, R0].map((x) => `<path d="M${f1(x - w)} ${f1(cy + 1)}Q${x} ${f1(cy - w * 1.2)} ${f1(x + w)} ${f1(cy + 1)}" fill="none" stroke="var(--lh-eye)" stroke-width="${f1(2.6 * k)}" stroke-linecap="round"/>`).join('');
    else if (mood === 'sleep') e = [L0, R0].map((x) => `<path d="M${f1(x - w)} ${f1(cy - 1)}Q${x} ${f1(cy + w * 1.1)} ${f1(x + w)} ${f1(cy - 1)}" fill="none" stroke="var(--lh-eye)" stroke-width="${f1(2.6 * k)}" stroke-linecap="round"/>`).join('');
    else if (mood === 'sad') e = [L0, R0].map((x, i) => `${eye(x, cy + 1, f1(4.2 * k), f1(5 * k))}<path d="M${f1(x - w)} ${f1(cy - w * 1.5 + (i ? 2 : 0))}L${f1(x + w)} ${f1(cy - w * 1.5 + (i ? 0 : 2))}" stroke="var(--lh-eye)" stroke-width="${f1(1.8 * k)}" stroke-linecap="round"/>`).join('');
    else e = eye(L0, cy, f1(4.6 * k), f1(5.8 * k)) + eye(R0, cy, f1(4.6 * k), f1(5.8 * k));
    return e + blush(L0 - 6 * k, cy + 7 * k, 5 * k, 3 * k) + blush(R0 + 6 * k, cy + 7 * k, 5 * k, 3 * k);
  }
  const feet = (fr, fill, x1, x2, w = 8) => `<ellipse cx="${x1}" cy="${fr ? 91 : 88.5}" rx="${w}" ry="5" fill="${fill}" ${o(1.8)}/><ellipse cx="${x2}" cy="${fr ? 88.5 : 91}" rx="${w}" ry="5" fill="${fill}" ${o(1.8)}/>`;
  const sakura = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="${-r}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.9)}" transform="rotate(${a})" fill="var(--lh-sakura)" stroke="var(--lh-ink)" stroke-width=".9"/>`).join('')}<circle r="${f1(r * 0.42)}" fill="var(--lh-sakura-in)"/></g>`;

  // Hari: 0 giovane (sakura) · 1 adulto (foulard) · 2 maturo (occhiali, brizzolato) · 3 nonno (cardigan, bastone, grigio)
  function hari(ph = 0, pose = '', fr = 0) {
    const q1 = ph >= 3 ? 'var(--lh-quill-g)' : ph === 2 ? 'var(--lh-quill-m)' : 'var(--lh-quill)';
    const q2 = ph >= 3 ? 'var(--lh-quill-g2)' : ph === 2 ? 'var(--lh-quill-m2)' : 'var(--lh-quill-2)';
    const q3 = ph >= 3 ? 'var(--lh-quill-g3)' : 'var(--lh-quill-3)';
    const cy = ph === 3 ? 58 : 56;
    const cane = ph === 3 ? `<path d="M80 96L76 60q-1-7 5-7 5 0 5 5" fill="none" stroke="var(--lh-ink)" stroke-width="5.4" stroke-linecap="round"/><path d="M80 96L76 60q-1-7 5-7 5 0 5 5" fill="none" stroke="var(--lh-cane)" stroke-width="3.4" stroke-linecap="round"/>` : '';
    const cardigan = ph === 3 ? `<path d="M22 72q28 22 56 0 2 10-4 16-22 12-48 0-6-6-4-16z" fill="var(--lh-cardigan)" ${o(1.8)}/>
      <path d="M50 77v14" stroke="var(--lh-cardigan-2)" stroke-width="2"/><circle cx="50" cy="80" r="1.6" fill="var(--lh-cardigan-2)"/><circle cx="50" cy="86" r="1.6" fill="var(--lh-cardigan-2)"/>` : '';
    const scarf = ph === 1 || ph === 2 ? `<path d="M28 76q22 12 44 0l1 6q-23 12-46 0z" fill="var(--lh-scarf)" ${o(1.6)}/><path d="M62 80l6 12-7 1-4-11z" fill="var(--lh-scarf)" ${o(1.4)}/>` : '';
    const glasses = ph >= 2 ? `<g fill="var(--lh-glass-tint)" stroke="var(--lh-glasses)" stroke-width="2"><circle cx="38.5" cy="${cy + 6}" r="8"/><circle cx="61.5" cy="${cy + 6}" r="8"/></g><path d="M46.5 ${cy + 5}q3.5-2 7 0" fill="none" stroke="var(--lh-glasses)" stroke-width="2"/>` : '';
    const brows = ph === 3 ? `<path d="M31 ${cy - 6}q6-4 12 0M57 ${cy - 6}q6-4 12 0" fill="none" stroke="var(--lh-brow)" stroke-width="3" stroke-linecap="round"/>` : '';
    const mouth = pose === 'joy' ? `<path d="M44.5 ${cy + 20}q5.5 9 11 0z" fill="var(--lh-mouth)" stroke="var(--lh-nose)" stroke-width="1.5" stroke-linejoin="round"/>`
      : pose === 'sad' ? `<path d="M45 ${cy + 23}q5-5 10 0" fill="none" stroke="var(--lh-nose)" stroke-width="1.8" stroke-linecap="round"/>`
        : pose === 'sleep' ? `<ellipse cx="50" cy="${cy + 21}" rx="2.2" ry="1.6" fill="var(--lh-mouth)"/>`
          : `<path d="M46 ${cy + 20}q2 2.6 4 0q2 2.6 4 0" fill="none" stroke="var(--lh-nose)" stroke-width="1.7" stroke-linecap="round"/>`;
    return `${cane}${feet(fr, 'var(--lh-ear)', 38, 62, 9)}
      <path d="${quills(50, cy, 31, 16, -205, 25, 11)}" fill="${q2}" ${o(2.2)}/>
      <path d="${quills(50, cy, 27, 10, -198, 18, 10)}" fill="${q1}"/>
      <circle cx="25" cy="${cy - 12}" r="8" fill="var(--lh-ear)" ${o(2)}/><circle cx="25" cy="${cy - 11.5}" r="4" fill="var(--lh-ear-in)"/>
      <circle cx="75" cy="${cy - 12}" r="8" fill="var(--lh-ear)" ${o(2)}/><circle cx="75" cy="${cy - 11.5}" r="4" fill="var(--lh-ear-in)"/>
      <ellipse cx="50" cy="${cy + 8}" rx="31" ry="25" fill="var(--lh-face)" ${o(2.4)}/>
      <path d="M80 ${cy + 6}a31 25 0 0 1-48 21 34 28 0 0 0 48-21z" fill="var(--lh-face-shade)"/>
      ${cardigan}${scarf}
      <path d="M36 ${cy - 13}C41 ${cy - 6} 46 ${cy - 4} 50 ${cy - 4}C54 ${cy - 4} 59 ${cy - 6} 64 ${cy - 13}C58 ${cy - 19} 42 ${cy - 19} 36 ${cy - 13}Z" fill="${q3}"/>
      ${face(50, cy + 7, 11.5, pose, 1.15)}${glasses}${brows}
      <ellipse cx="50" cy="${cy + 16}" rx="3.4" ry="2.5" fill="var(--lh-nose)"/>${mouth}
      ${ph === 0 ? sakura(70, cy - 31, 6.5) : ''}
      ${pose === 'sad' ? `<path d="M74 ${cy - 4}c3 5 4 8 0 10-4-2-3-5 0-10z" fill="var(--lh-sweat)" ${o(1)}/>` : ''}
      ${hl(`M30 ${cy - 20}q6-9 16-12`, 2.6, 0.5)}`;
  }

  /* amici in visita (di fronte, viewBox 100, piedi in basso) */
  function friend(k, pose = '', fr = 0) {
    const fc = (cx, cy, sp, m = true) => face(cx, cy, sp, pose === 'joy' ? 'joy' : '', 1) + (m ? `<path d="M${cx - 3.6} ${cy + 8}q1.8 2.4 3.6 0q1.8 2.4 3.6 0" fill="none" stroke="var(--lh-nose)" stroke-width="1.6" stroke-linecap="round"/>` : '');
    const body = {
      bunny: () => `<g transform="rotate(${fr ? -4 : 4} 50 46)"><ellipse cx="38" cy="25" rx="8" ry="21" transform="rotate(-12 38 25)" fill="var(--lh-bunny)" ${o(2)}/><ellipse cx="38" cy="28" rx="4" ry="14" transform="rotate(-12 38 28)" fill="var(--lh-bunny-in)"/>
        <ellipse cx="62" cy="25" rx="8" ry="21" transform="rotate(12 62 25)" fill="var(--lh-bunny)" ${o(2)}/><ellipse cx="62" cy="28" rx="4" ry="14" transform="rotate(12 62 28)" fill="var(--lh-bunny-in)"/></g>
        ${feet(fr, 'var(--lh-bunny)', 38, 62, 9)}<ellipse cx="50" cy="64" rx="29" ry="27" fill="var(--lh-bunny)" ${o(2.2)}/>
        <path d="M78 60a29 27 0 0 1-46 24 32 29 0 0 0 46-24z" fill="var(--lh-bunny-2)"/>${fc(50, 61, 11)}<path d="M47.5 66h5l-2.5 2.6z" fill="var(--lh-bunny-in)" ${o(1)}/>
        <path d="M30 40l-6-6M30 40l-8-1" stroke="var(--lh-bow)" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="40" r="3" fill="var(--lh-bow)"/>`,
      bear: () => `<circle cx="24" cy="36" r="11" fill="var(--lh-bear)" ${o(2)}/><circle cx="24" cy="37" r="6" fill="var(--lh-muzzle)"/><circle cx="76" cy="36" r="11" fill="var(--lh-bear)" ${o(2)}/><circle cx="76" cy="37" r="6" fill="var(--lh-muzzle)"/>
        ${feet(fr, 'var(--lh-bear-2)', 35, 65, 10)}<ellipse cx="50" cy="63" rx="35" ry="30" fill="var(--lh-bear)" ${o(2.2)}/>
        <path d="M84 59a35 30 0 0 1-58 27 38 33 0 0 0 58-27z" fill="var(--lh-bear-2)" opacity=".7"/>
        <ellipse cx="50" cy="71" rx="13" ry="9.5" fill="var(--lh-muzzle)" ${o(1.8)}/><ellipse cx="50" cy="67" rx="4.2" ry="3" fill="var(--lh-nose)"/>${fc(50, 55, 14, false)}
        <path d="M46.5 72q1.75 2.4 3.5 0q1.75 2.4 3.5 0" fill="none" stroke="var(--lh-nose)" stroke-width="1.5" stroke-linecap="round"/>`,
      chick: () => `${feet(fr, 'var(--lh-beak)', 40, 60, 7)}<path d="M44 35C42 26 49 22 51 29C53 22 61 24 57 33" fill="var(--lh-chick)" ${o(1.8)}/>
        <ellipse cx="50" cy="62" rx="31" ry="30" fill="var(--lh-chick)" ${o(2.2)}/><path d="M80 58a31 30 0 0 1-50 26 34 32 0 0 0 50-26z" fill="var(--lh-chick-2)"/>
        ${fc(50, 57, 11, false)}<path d="M45 64l5-3 5 3-5 5z" fill="var(--lh-beak)" ${o(1.5)}/>`,
      kitty: () => `<path d="M20 44L20 14L44 30Z" fill="var(--lh-cat)" ${o(2)}/><path d="M24 38L24 22L36 31Z" fill="var(--lh-bunny-in)"/><path d="M80 44L80 14L56 30Z" fill="var(--lh-cat)" ${o(2)}/><path d="M76 38L76 22L64 31Z" fill="var(--lh-bunny-in)"/>
        ${feet(fr, 'var(--lh-cat-2)', 37, 63, 9)}<ellipse cx="50" cy="63" rx="33" ry="29" fill="var(--lh-cat)" ${o(2.2)}/>
        <path d="M82 59a33 29 0 0 1-54 26 36 32 0 0 0 54-26z" fill="var(--lh-cat-2)" opacity=".6"/>${fc(50, 58, 12, false)}
        <path d="M47 66h6l-3 3z" fill="var(--lh-bunny-in)" ${o(1)}/><path d="M30 66l-12-2M30 70l-12 2M70 66l12-2M70 70l12 2" stroke="var(--lh-ink)" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`,
      piggy: () => `<path d="M25 44L22 20L43 34Z" fill="var(--lh-pig)" ${o(2)}/><path d="M75 44L78 20L57 34Z" fill="var(--lh-pig)" ${o(2)}/>
        ${feet(fr, 'var(--lh-pig-2)', 36, 64, 8)}<ellipse cx="50" cy="63" rx="33" ry="29" fill="var(--lh-pig)" ${o(2.2)}/>
        <path d="M82 59a33 29 0 0 1-54 26 36 32 0 0 0 54-26z" fill="var(--lh-pig-2)" opacity=".7"/>${fc(50, 54, 13, false)}
        <ellipse cx="50" cy="69" rx="10.5" ry="7.5" fill="var(--lh-snout)" ${o(1.8)}/><ellipse cx="46.5" cy="69" rx="1.8" ry="2.7" fill="var(--lh-pig-2)"/><ellipse cx="53.5" cy="69" rx="1.8" ry="2.7" fill="var(--lh-pig-2)"/>`,
    }[k];
    return body ? body() + hl('M28 52q3-12 14-16') : '';
  }
  const wrap = (inner, size = 200) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${inner}</svg>`;
  const at = (inner, x, y, s, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} x="${f1(x)}" y="${f1(y)}" width="${f1(s)}" height="${f1(s)}" viewBox="0 0 100 100">${inner}</svg>`;

  /* ---------- iso in SVG (card, tutorial, mappa) ---------- */
  function iso(ox, oy, hw, zk = 1.12) {
    const p = (x, y, z = 0) => `${f1(ox + (x - y) * hw)},${f1(oy + (x + y) * hw / 2 - z * hw * zk)}`;
    const pg = (pts, fill, extra = '') => `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="var(--lh-ink)" stroke-width="${f1(Math.max(0.6, hw * 0.06))}" stroke-linejoin="round" ${extra}/>`;
    const box = (x, y, z, w, d, h, col, col2, col3) => pg([p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)], col2 || col) +
      pg([p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)], col3 || col2 || col) +
      pg([p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)], col);
    return { p, pg, box };
  }
  // stanzetta della card: decadente a sinistra della crepa, ristrutturata a destra (prima/dopo)
  function room(opts = {}) {
    const n = 4, hw = opts.hw || 11, I = iso(opts.ox || 60, opts.oy || 40, hw), { p, pg, box } = I, WHt = 2.2;
    const fixed = opts.fixed !== false, old = !!opts.old;
    let s = '';
    s += pg([p(0, 0), p(n, 0), p(n, n), p(0, n)], old ? 'var(--lh-fl-worn-1)' : 'var(--lh-fl-wood-1)');
    for (let k = 1; k < n * 2; k++) s += `<path d="M${p(0, k / 2)}L${p(n, k / 2)}" stroke="${old ? 'var(--lh-fl-worn-2)' : 'var(--lh-fl-wood-2)'}" stroke-width="1"/>`;
    s += pg([p(0, 0), p(0, n), p(0, n, WHt), p(0, 0, WHt)], old ? 'var(--lh-wl-peel-1)' : 'var(--lh-wl-stripes-1)');
    s += pg([p(0, 0), p(n, 0), p(n, 0, WHt), p(0, 0, WHt)], old ? 'var(--lh-wl-peel-1)' : 'var(--lh-wl-stripes-1)');
    if (!old) for (let k = 0; k < n * 2; k++) s += `<polygon points="${[p(0, k / 2 + 0.08, 0.2), p(0, k / 2 + 0.22, 0.2), p(0, k / 2 + 0.22, WHt), p(0, k / 2 + 0.08, WHt)].join(' ')}" fill="var(--lh-wl-stripes-2)"/>`;
    s += `<polygon points="${[p(0, 0), p(n, 0), p(n, 0, WHt), p(0, 0, WHt)].join(' ')}" fill="var(--lh-shade)"/>`;
    // finestra col cielo
    s += pg([p(1.3, 0, 0.9), p(2.7, 0, 0.9), p(2.7, 0, 1.9), p(1.3, 0, 1.9)], 'var(--lh-sky-day)');
    s += `<path d="M${p(2, 0, 0.9)}L${p(2, 0, 1.9)}M${p(1.3, 0, 1.4)}L${p(2.7, 0, 1.4)}" stroke="var(--lh-frame)" stroke-width="1.6"/>`;
    s += `<polygon points="${[p(1.3, 0.05, 0.9), p(2.7, 0.05, 0.9), p(2.3, 1.6, 0), p(0.9, 1.6, 0)].join(' ')}" fill="var(--lh-sun-beam)" opacity=".6"/>`;
    if (old) {
      s += `<path d="M${p(0, 1.2, 2)}L${p(0, 1.4, 1.6)}L${p(0, 1.25, 1.3)}L${p(0, 1.5, 1)}" fill="none" stroke="var(--lh-crack)" stroke-width="1.6"/>`;
      s += `<ellipse cx="${p(2.6, 2.6).split(',')[0]}" cy="${p(2.6, 2.6).split(',')[1]}" rx="${hw * 0.7}" ry="${hw * 0.35}" fill="var(--lh-water)"/>`;
      s += box(0.1, 0.2, 0, 0.9, 1.7, 0.22, 'var(--lh-old)');
      s += box(3.1, 0.1, 0, 0.8, 0.8, 1.4, 'var(--lh-old)');
    } else {
      s += box(0.05, 0.1, 0, 0.95, 1.8, 0.3, 'var(--lh-pink)');
      s += box(0.05, 0.1, 0, 0.95, 0.15, 0.85, 'var(--lh-pink)');
      s += box(0.12, 0.3, 0.3, 0.8, 0.4, 0.12, 'var(--lh-white)');
      s += box(0.1, 0.8, 0.3, 0.85, 1.0, 0.1, 'var(--lh-blue)');
      s += box(3.1, 0.1, 0, 0.8, 0.8, 1.5, 'var(--lh-mint)');
      // pianta
      s += box(3.25, 3.25, 0, 0.5, 0.5, 0.35, 'var(--lh-pot)');
      const [px, py] = p(3.5, 3.5, 0.35).split(',').map(Number);
      s += `<circle cx="${px}" cy="${py - 5}" r="${hw * 0.42}" fill="var(--lh-leaf)" stroke="var(--lh-ink)" stroke-width=".8"/><circle cx="${px + 4}" cy="${py - 9}" r="${hw * 0.32}" fill="var(--lh-leaf-2)" stroke="var(--lh-ink)" stroke-width=".8"/>`;
      s += pg([p(1.3, 2.0, 0.005), p(3.0, 2.0, 0.005), p(3.0, 3.6, 0.005), p(1.3, 3.6, 0.005)], 'var(--lh-pink-2)');
      // quadro
      s += pg([p(0, 2.6, 1.1), p(0, 3.4, 1.1), p(0, 3.4, 1.8), p(0, 2.6, 1.8)], 'var(--lh-yellow)');
    }
    // spessore del pavimento
    s += pg([p(0, n), p(n, n), p(n, n, -0.3), p(0, n, -0.3)], 'var(--lh-slab-1)');
    s += pg([p(n, 0), p(n, n), p(n, n, -0.3), p(n, 0, -0.3)], 'var(--lh-slab-2)');
    if (fixed !== null && opts.hari !== false) {
      const [hx, hy] = p(2.3, 2.6).split(',').map(Number);
      const sz = hw * 2.6;
      s += `<ellipse cx="${hx}" cy="${hy}" rx="${sz * 0.3}" ry="${sz * 0.1}" fill="var(--lh-shade)"/>`;
      s += at(hari(opts.phase || 0, opts.pose || (old ? 'sad' : 'joy')), hx - sz / 2, hy - sz * 0.97, sz, opts.hariCls || '');
    }
    return s;
  }
  const card = () => `<svg viewBox="0 0 120 90" aria-hidden="true">${room({ ox: 60, oy: 34, hw: 12.5 })}
    <path d="M14 18l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill="var(--lh-gold)"/></svg>`;

  /* ---------- mappa del quartiere ---------- */
  const PLACES = {
    home: { x: 0.6, y: 0.6, roof: 'var(--lh-roof-1)', wall: 'var(--lh-house-1)', h: 1.3 },
    market: { x: 3.1, y: 0.2, roof: 'var(--lh-roof-2)', wall: 'var(--lh-house-2)', h: 1.1, w: 1.5 },
    cafe: { x: 5.3, y: 1.6, roof: 'var(--lh-roof-3)', wall: 'var(--lh-house-3)', h: 1.2 },
    park: { x: 0.8, y: 3.4, park: 1 },
    doctor: { x: 3.4, y: 2.9, roof: 'var(--lh-roof-4)', wall: 'var(--lh-house-4)', h: 1.6 },
    gym: { x: 5.6, y: 4.2, roof: 'var(--lh-roof-5)', wall: 'var(--lh-house-5)', h: 1.1, w: 1.4 },
    shop: { x: 2.0, y: 5.5, roof: 'var(--lh-roof-6)', wall: 'var(--lh-house-6)', h: 1.2, w: 1.4 },
    office: { x: 4.3, y: 6.0, roof: 'var(--lh-roof-7)', wall: 'var(--lh-house-7)', h: 1.3 },
  };
  const PLACE_IC = { home: 'home', market: 'market', cafe: 'cafe', park: 'park', doctor: 'doctor', gym: 'workout', shop: 'relax', office: 'office' };
  function map(opts = {}) {
    const W = 320, H = 290, hw = 21, I = iso(W / 2 - 4, 72, hw), { p, pg, box } = I, n = 7.6;
    const season = opts.season || 0, lv = opts.biz || 0, night = opts.night || 0;
    const tree = ['var(--lh-tree-sp)', 'var(--lh-tree-su)', 'var(--lh-tree-au)', 'var(--lh-tree-wi)'][season];
    let s = `<svg class="lh-map-svg" viewBox="0 0 ${W} ${H}" role="img">`, top = '';
    s += pg([p(-0.3, -0.3), p(n, -0.3), p(n, n), p(-0.3, n)], 'var(--lh-grass)');
    s += pg([p(n, -0.3), p(n, n), p(n, n, -0.4), p(n, -0.3, -0.4)], 'var(--lh-grass-2)');
    s += pg([p(-0.3, n), p(n, n), p(n, n, -0.4), p(-0.3, n, -0.4)], 'var(--lh-grass-3)');
    // strade a croce con la mezzeria tratteggiata
    s += pg([p(2.45, -0.3), p(2.95, -0.3), p(2.95, n), p(2.45, n)], 'var(--lh-road)', 'stroke-width="0"');
    s += pg([p(-0.3, 2.35), p(n, 2.35), p(n, 2.85), p(-0.3, 2.85)], 'var(--lh-road)', 'stroke-width="0"');
    s += pg([p(4.9, -0.3), p(5.3, -0.3), p(5.3, n), p(4.9, n)], 'var(--lh-road)', 'stroke-width="0"');
    s += pg([p(-0.3, 5.1), p(n, 5.1), p(n, 5.5), p(-0.3, 5.5)], 'var(--lh-road)', 'stroke-width="0"');
    s += `<path d="M${p(2.7, -0.3)}L${p(2.7, n)}M${p(-0.3, 2.6)}L${p(n, 2.6)}" stroke="var(--lh-road-line)" stroke-width="1.4" stroke-dasharray="4 5"/>`;
    // alberelli sparsi (colore della stagione)
    const treeAt = (x, y, sc = 1) => { const [tx, ty] = p(x, y).split(',').map(Number); return `<g class="lh-tree"><rect x="${tx - 1.6}" y="${ty - 9 * sc}" width="3.2" height="${9 * sc}" fill="var(--lh-trunk)"/><circle cx="${tx}" cy="${ty - 13 * sc}" r="${8 * sc}" fill="${tree}" stroke="var(--lh-ink)" stroke-width=".8"/><circle cx="${tx + 3 * sc}" cy="${ty - 16 * sc}" r="${4.4 * sc}" fill="var(--lh-hi)" opacity=".25"/></g>`; };
    [[7, 0.2], [0.2, 7.1], [7.2, 6.8], [6.4, 2.9], [0, 2.1], [3.6, 7.2], [1.9, 2.0]].forEach(([x, y]) => { s += treeAt(x, y, 0.8); });
    const order = Object.keys(PLACES).sort((a, b) => (PLACES[a].x + PLACES[a].y) - (PLACES[b].x + PLACES[b].y));
    for (const id of order) {
      const P0 = PLACES[id], w = P0.w || 1.2, d = 1.1;
      const [lx, ly] = p(P0.x + w / 2, P0.y + d + 0.15).split(',').map(Number);
      s += `<g class="lh-place${opts.here === id ? ' here' : ''}" data-place="${id}" role="button" tabindex="0" aria-label="${(opts.names || {})[id] || id}">`;
      s += `<ellipse cx="${lx}" cy="${ly - 8}" rx="${hw * 1.7}" ry="${hw * 1.25}" fill="transparent"/>`;
      if (P0.park) {
        s += pg([p(P0.x - 0.3, P0.y - 0.3, 0.01), p(P0.x + 1.6, P0.y - 0.3, 0.01), p(P0.x + 1.6, P0.y + 1.4, 0.01), p(P0.x - 0.3, P0.y + 1.4, 0.01)], 'var(--lh-park)');
        s += pg([p(P0.x + 0.4, P0.y + 0.4, 0.02), p(P0.x + 0.9, P0.y + 0.4, 0.02), p(P0.x + 0.9, P0.y + 0.9, 0.02), p(P0.x + 0.4, P0.y + 0.9, 0.02)], 'var(--lh-water)');
        s += treeAt(P0.x, P0.y + 0.1) + treeAt(P0.x + 1.3, P0.y) + treeAt(P0.x + 1.2, P0.y + 1.2, 0.9);
      } else {
        s += box(P0.x, P0.y, 0, w, d, P0.h, P0.wall, P0.wall, 'var(--lh-house-shade)');
        s += `<polygon points="${[p(P0.x, P0.y + d, 0), p(P0.x + w, P0.y + d, 0), p(P0.x + w, P0.y + d, P0.h), p(P0.x, P0.y + d, P0.h)].join(' ')}" fill="var(--lh-shade)"/>`;
        // tetto a falde
        s += pg([p(P0.x - 0.1, P0.y + d + 0.1, P0.h), p(P0.x + w + 0.1, P0.y + d + 0.1, P0.h), p(P0.x + w + 0.1, P0.y + d / 2, P0.h + 0.6), p(P0.x - 0.1, P0.y + d / 2, P0.h + 0.6)], P0.roof);
        s += pg([p(P0.x + w + 0.1, P0.y - 0.1, P0.h), p(P0.x + w + 0.1, P0.y + d + 0.1, P0.h), p(P0.x + w + 0.1, P0.y + d / 2, P0.h + 0.6)], P0.roof);
        // porta e finestre (accese di notte)
        s += pg([p(P0.x + w * 0.4, P0.y + d, 0), p(P0.x + w * 0.62, P0.y + d, 0), p(P0.x + w * 0.62, P0.y + d, 0.65), p(P0.x + w * 0.4, P0.y + d, 0.65)], 'var(--lh-door)');
        const wc = night ? 'var(--lh-win-on)' : 'var(--lh-sky-day)';
        s += pg([p(P0.x + w + 0.001, P0.y + 0.25, 0.45), p(P0.x + w + 0.001, P0.y + 0.6, 0.45), p(P0.x + w + 0.001, P0.y + 0.6, 0.8), p(P0.x + w + 0.001, P0.y + 0.25, 0.8)], wc);
        s += pg([p(P0.x + w * 0.08, P0.y + d, 0.4), p(P0.x + w * 0.3, P0.y + d, 0.4), p(P0.x + w * 0.3, P0.y + d, 0.75), p(P0.x + w * 0.08, P0.y + d, 0.75)], wc);
        if (id === 'market') s += pg([p(P0.x, P0.y + d + 0.35, 0.75), p(P0.x + w, P0.y + d + 0.35, 0.75), p(P0.x + w, P0.y + d, 0.95), p(P0.x, P0.y + d, 0.95)], 'var(--lh-awning)');
        if (id === 'office' && lv) for (let k = 0; k < lv; k++) s += `<circle cx="${f1(lx - 12 + k * 8)}" cy="${f1(ly - hw * 3.3)}" r="2.6" fill="var(--lh-gold)" stroke="var(--lh-ink)" stroke-width=".7"/>`;
      }
      // insegna tonda con l'icona + nome
      const [sx, sy] = [lx, ly - hw * (P0.park ? 2.4 : 2.9)];
      s += `<g transform="translate(${f1(sx - 10)} ${f1(sy - 10)})"><circle cx="10" cy="10" r="11" fill="var(--lh-sign)" stroke="var(--lh-ink)" stroke-width="1.2"/><g transform="translate(3 3) scale(.58)" color="var(--lh-ink)" style="color:var(--lh-ink)">${icon(PLACE_IC[id]).replace('class="lh-ic"', 'width="24" height="24"')}</g></g>`;
      s += '</g>';
      // nomi e Hari sopra a tutto (anche al velo della notte), così non finiscono dietro le case
      top += `<text x="${f1(lx)}" y="${f1(ly + 9)}" text-anchor="middle" class="lh-map-label" data-place="${id}">${(opts.names || {})[id] || ''}</text>`;
      if (opts.here === id && opts.hari) top += `<ellipse cx="${f1(lx + 22)}" cy="${f1(ly - 4)}" rx="12" ry="4" fill="var(--lh-shade)"/>` + at(opts.hari, lx + 4, ly - 40, 36, 'lh-map-hari');
    }
    if (night) s += `<rect x="0" y="0" width="${W}" height="${H}" fill="var(--lh-night)" opacity="${f1(night * 0.45)}" pointer-events="none"/>`;
    return s + top + '</svg>';
  }


  /* ---------- scene animate dei luoghi del quartiere (vignette 320×220, animazioni CSS .lh-a-*) ----------
   * scene(kind, o): kind = market | gym | park | cafe | doctor | faint | bakery | craft | plants | shop
   * o = { ph: fase di Hari, night: 0..1, friend: tipo dell'amico al tavolo (o null), nf: amico appena conosciuto,
   *       label: testo del "nuovo amico!" }. Gli elementi [data-k="1..4"] compaiono man mano (la UI li accende col progresso). */
  const SW = 320, SH = 220, Y0 = -34, YH = 306;   // disegno in 320×220, inquadratura più alta (palco quasi quadrato, barra in basso)
  const ring = (x, y, r, fill, w = 1.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="var(--lh-ink)" stroke-width="${w}"/>`;
  const rr = (x, y, w, h, r, fill, sw = 1.8, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="var(--lh-ink)" stroke-width="${sw}" ${extra}/>`;
  const fig = (inner, x, y, size, cls = '') => `<g class="${cls}">${at(inner, x - size / 2, y - size * 0.93, size)}</g>`;
  const sparkleAt = (x, y, r, cls = 'lh-a-tw', d = 0) => `<path class="${cls}" style="animation-delay:${d}s" d="M${x} ${y - r}L${f1(x + r * 0.28)} ${f1(y - r * 0.28)}L${x + r} ${y}L${f1(x + r * 0.28)} ${f1(y + r * 0.28)}L${x} ${y + r}L${f1(x - r * 0.28)} ${f1(y + r * 0.28)}L${x - r} ${y}L${f1(x - r * 0.28)} ${f1(y - r * 0.28)}Z" fill="var(--lh-gold)"/>`;
  const heart = (x, y, r, fill = 'var(--lh-flower)') => `<path d="M${x} ${f1(y + r)}C${f1(x - r * 1.8)} ${f1(y - r * 0.4)} ${f1(x - r * 0.7)} ${f1(y - r * 1.7)} ${x} ${f1(y - r * 0.6)}C${f1(x + r * 0.7)} ${f1(y - r * 1.7)} ${f1(x + r * 1.8)} ${f1(y - r * 0.4)} ${x} ${f1(y + r)}Z" fill="${fill}" stroke="var(--lh-ink)" stroke-width="1"/>`;
  // fumetto con un'icona (o un cuoricino)
  const say = (x, y, inner, cls = '', d = 0, left = false) => `<g class="${cls}" style="animation-delay:${d}s"><path d="M${x - 17} ${y - 30}h34a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-${left ? 24 : 12}l-6 7-1-7h-${left ? 3 : 15}a8 8 0 0 1-8-8v-12a8 8 0 0 1 8-8z" fill="var(--lh-sign)" stroke="var(--lh-ink)" stroke-width="1.6"/>${inner(x, y - 16)}</g>`;
  const icAt = (n, col = 'var(--lh-ink)', sz = 18) => (x, y) => `<g transform="translate(${f1(x - sz / 2)} ${f1(y - sz / 2)}) scale(${f1(sz / 24)})" style="color:${col}" fill="none" stroke="${col}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${(IC[n] || '').replace(/currentColor/g, col)}</g>`;
  const heartIn = (x, y) => heart(x, y, 6);
  function roomBg(wall, floor1, floor2, o, win = [228, 26, 70, 52]) {
    let s = `<rect y="${Y0}" width="${SW}" height="${YH}" fill="${wall}"/>`;
    s += `<rect y="150" width="${SW}" height="${Y0 + YH - 150}" fill="${floor1}"/>`;
    for (let k = 0; k < 9; k++) s += `<path d="M${-100 + k * 64} ${Y0 + YH}L${f1(20 + k * 35)} 150" stroke="${floor2}" stroke-width="2"/>`;
    s += `<path d="M0 166H${SW}M0 188H${SW}M0 214H${SW}M0 244H${SW}" stroke="${floor2}" stroke-width="1.5" opacity=".6"/>`;
    s += `<rect y="144" width="${SW}" height="8" fill="var(--lh-white)" stroke="var(--lh-ink)" stroke-width="1.4"/>`;
    if (win) {
      const [x, y, w, h] = win, sky = o.night > 0.5 ? 'var(--lh-sky-night)' : o.night > 0.15 ? 'var(--lh-sky-dawn)' : 'var(--lh-sky-day)';
      s += rr(x, y, w, h, 6, sky, 2.4, 'class="lh-sc-win"');
      if (o.night > 0.5) s += `<circle cx="${x + w * 0.7}" cy="${y + h * 0.35}" r="6" fill="var(--lh-star)"/><circle cx="${x + w * 0.25}" cy="${y + h * 0.6}" r="1.6" fill="var(--lh-star)"/><circle cx="${x + w * 0.45}" cy="${y + h * 0.25}" r="1.3" fill="var(--lh-star)"/>`;
      else s += `<ellipse class="lh-a-cloud" cx="${x + w * 0.35}" cy="${y + h * 0.4}" rx="12" ry="6" fill="var(--lh-hi)" opacity=".9"/>`;
      s += `<path d="M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}" stroke="var(--lh-frame)" stroke-width="3"/>`;
      s += `<path d="M${x - 4} ${y + 2}q10 ${h * 0.5} 0 ${h}" fill="var(--lh-curtain)" stroke="var(--lh-ink)" stroke-width="1.2"/><path d="M${x + w + 4} ${y + 2}q-10 ${h * 0.5} 0 ${h}" fill="var(--lh-curtain)" stroke="var(--lh-ink)" stroke-width="1.2"/>`;
    }
    return s;
  }
  const veil = (o, k = 0.28) => (o.night > 0.15 ? `<rect y="${Y0}" width="${SW}" height="${YH}" fill="var(--lh-night)" opacity="${f1(o.night * k)}" pointer-events="none"/>` : '') + `<rect y="${Y0}" width="${SW}" height="${YH}" fill="var(--lh-sc-dim)" pointer-events="none"/>`;
  // accessori sopra la testa di Hari (cappello da cuoco, fascia, ...)
  const chefHat = (x, y) => `<path d="M${x - 15} ${y}q-12-2-9-13 4-8 12-5 3-10 12-10t12 10q8-3 12 5 3 11-9 13z" fill="var(--lh-white)" stroke="var(--lh-ink)" stroke-width="1.6"/><rect x="${x - 15}" y="${y - 2}" width="30" height="8" rx="2" fill="var(--lh-white)" stroke="var(--lh-ink)" stroke-width="1.6"/>`;
  const plaster = (x, y) => `<g transform="rotate(-24 ${x} ${y})"><rect x="${x - 9}" y="${y - 3.5}" width="18" height="7" rx="3.5" fill="var(--lh-pink)" stroke="var(--lh-ink)" stroke-width="1.1"/><rect x="${x - 3}" y="${y - 3}" width="6" height="6" rx="1" fill="var(--lh-white)"/><circle cx="${x - 6}" cy="${y}" r=".8" fill="var(--lh-pink-2)"/><circle cx="${x + 6}" cy="${y}" r=".8" fill="var(--lh-pink-2)"/></g>`;
  const fruit = (x, y, r, c) => `${ring(x, y, r, c, 1.2)}<path d="M${x} ${y - r}q1-3 3-4" stroke="var(--lh-leaf-2)" stroke-width="1.6" fill="none"/>`;
  const FRUIT = ['var(--lh-red)', 'var(--lh-fire)', 'var(--lh-leaf)', 'var(--lh-yellow)', 'var(--lh-lilac)', 'var(--lh-pink-2)'];

  function scene(kind, o = {}) {
    const ph = o.ph || 0, H0 = (pose = '', fr = 0) => hari(ph, pose, fr);
    let s = '';
    if (kind === 'market') {
      s += roomBg('var(--lh-house-2)', 'var(--lh-fl-tiles-1)', 'var(--lh-fl-tiles-2)', o, null);
      s += `<rect y="${Y0}" width="${SW}" height="${-Y0}" fill="var(--lh-awning)"/>`;
      for (let k = 0; k < 8; k++) s += `<path d="M${k * 40} ${Y0}h40v${16 - Y0}q-10 8-20 0-10 8-20 0z" fill="${k % 2 ? 'var(--lh-white)' : 'var(--lh-awning)'}" stroke="var(--lh-ink)" stroke-width="1.2"/>`;
      // scaffali con frutta e verdura
      for (const sx of [12, 112]) {
        s += rr(sx, 34, 92, 112, 6, 'var(--lh-wood-1)');
        for (let r = 0; r < 3; r++) {
          s += `<rect x="${sx + 4}" y="${62 + r * 32}" width="84" height="6" rx="2" fill="var(--lh-wood-2)" stroke="var(--lh-ink)" stroke-width="1.2"/>`;
          for (let c = 0; c < 6; c++) s += fruit(sx + 12 + c * 14, 55 + r * 32, 6, FRUIT[(c + r * 2 + sx) % FRUIT.length]);
        }
      }
      // cassa con la coniglietta
      s += fig(friend('bunny', 'joy', 0), 272, 150, 74, 'lh-a-bob2');
      s += rr(222, 118, 96, 60, 8, 'var(--lh-mint)');
      s += rr(232, 100, 34, 22, 4, 'var(--lh-metal)') + `<rect x="237" y="105" width="24" height="8" rx="2" fill="var(--lh-screen-on)"/>`;
      s += sparkleAt(250, 92, 6, 'lh-a-beep');
      // Hari col carrello che va avanti e indietro tra gli scaffali
      let cart = fig(H0('joy', 0), 50, 196, 86, 'lh-a-bob');
      cart += `<g transform="translate(78 150)"><path d="M0 4h52l-6 28H6z" fill="var(--lh-metal)" stroke="var(--lh-ink)" stroke-width="1.8" opacity=".95"/><path d="M8 10h38M10 18h34M12 26h30M18 4v28M28 4v28M38 4v28" stroke="var(--lh-metal-2)" stroke-width="1.2"/>
        <path d="M0 4l-8-10h-6" fill="none" stroke="var(--lh-ink)" stroke-width="2.4" stroke-linecap="round"/>${[1, 2, 3, 4].map((k) => `<g data-k="${k}">${fruit(8 + k * 9, 2 - (k % 2) * 4, 6, FRUIT[k])}</g>`).join('')}
        <g class="lh-a-drop">${fruit(26, -6, 6, 'var(--lh-red)')}</g>${ring(10, 38, 4, 'var(--lh-ink)', 0)}${ring(44, 38, 4, 'var(--lh-ink)', 0)}</g>`;
      s += `<g class="lh-a-cart">${cart}</g>`;
    } else if (kind === 'gym') {
      s += roomBg('var(--lh-house-5)', 'var(--lh-fl-wood-1)', 'var(--lh-fl-wood-2)', o, null);
      s += rr(20, 22, 130, 96, 6, 'var(--lh-sky-day)', 2.4) + `<path d="M40 30l-12 30M70 30l-30 70M110 30l-20 50" stroke="var(--lh-hi)" stroke-width="5" opacity=".55" stroke-linecap="round"/>`;
      s += rr(210, 70, 96, 10, 3, 'var(--lh-wood-2)') + rr(210, 110, 96, 10, 3, 'var(--lh-wood-2)');
      for (let k = 0; k < 4; k++) s += `<rect x="${218 + k * 22}" y="${58}" width="14" height="12" rx="4" fill="${['var(--lh-pink-2)', 'var(--lh-blue-2)', 'var(--lh-mint-2)', 'var(--lh-lilac-2)'][k]}" stroke="var(--lh-ink)" stroke-width="1.2"/><rect x="${218 + k * 22}" y="${98}" width="14" height="12" rx="4" fill="${['var(--lh-yellow)', 'var(--lh-pink)', 'var(--lh-blue)', 'var(--lh-mint)'][k]}" stroke="var(--lh-ink)" stroke-width="1.2"/>`;
      s += `<ellipse cx="150" cy="198" rx="70" ry="12" fill="var(--lh-mat)" stroke="var(--lh-ink)" stroke-width="1.6"/>`;
      // allenatore che fa il tifo
      s += fig(friend('bear', 'joy', 1), 262, 196, 74, 'lh-a-cheer');
      s += say(286, 122, heartIn, 'lh-a-chat1');
      // Hari che solleva i pesi (sudore e stelline)
      s += fig(H0('joy', 0), 150, 196, 92, 'lh-a-squash');
      s += `<g class="lh-a-lift"><rect x="98" y="104" width="104" height="5" rx="2.5" fill="var(--lh-metal-2)" stroke="var(--lh-ink)" stroke-width="1.2"/>${rr(88, 92, 12, 30, 4, 'var(--lh-pink-2)')}${rr(200, 92, 12, 30, 4, 'var(--lh-pink-2)')}</g>`;
      s += [[112, 124, 0], [190, 120, 0.4], [118, 140, 0.8]].map(([x, y, d], i) => `<path class="lh-a-sweat${i % 2 ? '2' : '1'}" style="animation-delay:${d}s" d="M${x} ${y}c3 5 4 8 0 10-4-2-3-5 0-10z" fill="var(--lh-sweat)" stroke="var(--lh-ink)" stroke-width="1"/>`).join('');
      s += sparkleAt(70, 150, 7, 'lh-a-tw', 0) + sparkleAt(230, 40, 6, 'lh-a-tw', 0.6) + sparkleAt(176, 70, 5, 'lh-a-tw', 1.1);
    } else if (kind === 'park') {
      const sky = o.night > 0.5 ? 'var(--lh-sky-night)' : o.night > 0.15 ? 'var(--lh-sky-dawn)' : 'var(--lh-sky-day)';
      s += `<rect y="${Y0}" width="${SW}" height="${YH}" fill="${sky}"/>`;
      s += o.night > 0.5 ? `<circle cx="262" cy="40" r="14" fill="var(--lh-star)"/>` : `<circle cx="262" cy="40" r="16" fill="var(--lh-yellow)" stroke="var(--lh-ink)" stroke-width="1.4"/>`;
      s += `<ellipse class="lh-a-cloud" cx="80" cy="42" rx="26" ry="10" fill="var(--lh-hi)" opacity=".85"/>`;
      s += `<path d="M-10 132q80-46 170-6t180-16V${Y0 + YH}H-10z" fill="var(--lh-grass-2)" stroke="var(--lh-ink)" stroke-width="1.4"/>`;
      // alberi che scorrono (Hari corre sul posto)
      let trees = '';
      for (let k = 0; k < 8; k++) { const x = 20 + k * 80, c = ['var(--lh-tree-sp)', 'var(--lh-tree-su)', 'var(--lh-tree-au)', 'var(--lh-tree-wi)'][o.season || 0]; trees += `<rect x="${x - 3}" y="104" width="6" height="34" fill="var(--lh-trunk)" stroke="var(--lh-ink)" stroke-width="1"/>${ring(x, 96, 20, c, 1.4)}${ring(x + 8, 88, 8, 'var(--lh-hi)', 0).replace('fill="var(--lh-hi)"', 'fill="var(--lh-hi)" opacity=".25"')}`; }
      s += `<g class="lh-a-scroll">${trees}</g>`;
      s += `<rect y="138" width="${SW}" height="${Y0 + YH - 138}" fill="var(--lh-grass)"/><path d="M-10 186q170-26 340 0v22q-170-26-340 0z" fill="var(--lh-road)" stroke="var(--lh-ink)" stroke-width="1.2"/>`;
      let fl = '';
      for (let k = 0; k < 10; k++) fl += sakura(16 + k * 64, 160 + (k % 3) * 8, 4);
      s += `<g class="lh-a-scroll2">${fl}</g>`;
      if (o.nf) s += `<g class="lh-a-pop">${fig(friend(o.nf, 'joy', 0), 236, 204, 70, 'lh-a-run')}</g>`;
      s += `<g class="lh-a-run"><g class="lh-a-fr0">${fig(H0('joy', 0), 140, 206, 92)}</g><g class="lh-a-fr1">${fig(H0('joy', 1), 140, 206, 92)}</g></g>`;
      s += `<path class="lh-a-sweat1" d="M176 132c3 5 4 8 0 10-4-2-3-5 0-10z" fill="var(--lh-sweat)" stroke="var(--lh-ink)" stroke-width="1"/>`;
      s += `<g class="lh-a-fly"><path d="M60 96q-8-10-12 0 4 8 12 0 8 8 12 0-4-10-12 0z" fill="var(--lh-pink)" stroke="var(--lh-ink)" stroke-width="1"/></g>`;
    } else if (kind === 'cafe') {
      s += roomBg('var(--lh-house-3)', 'var(--lh-fl-parquet-1)', 'var(--lh-fl-parquet-2)', o);
      // bancone con la macchina del caffè e il pulcino barista
      s += fig(friend('chick', '', 0), 74, 114, 62, 'lh-a-bob2');
      s += rr(10, 104, 130, 44, 6, 'var(--lh-wood-2)') + rr(18, 76, 30, 30, 5, 'var(--lh-metal)') + `<path class="lh-a-steam" d="M33 72q-5-8 0-14t0-14" fill="none" stroke="var(--lh-hi)" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
      for (const lx of [110, 210]) s += `<path d="M${lx} 0v26" stroke="var(--lh-ink)" stroke-width="1.6"/><path d="M${lx - 14} 38q14-22 28 0z" fill="var(--lh-gold)" stroke="var(--lh-ink)" stroke-width="1.4"/><circle class="lh-a-glow" cx="${lx}" cy="40" r="6" fill="var(--lh-bulb)"/>`;
      // Hari e l'amico al tavolino
      s += fig(H0('joy', 0), 112, 192, 86, 'lh-a-bob');
      if (o.friend) s += `<g class="${o.nf ? 'lh-a-pop' : ''}">${fig(friend(o.friend, 'joy', 0), 214, 192, 82, 'lh-a-bob2')}</g>`;
      else s += rr(196, 146, 36, 40, 8, 'var(--lh-pink)');
      s += `<ellipse cx="162" cy="164" rx="46" ry="12" fill="var(--lh-white)" stroke="var(--lh-ink)" stroke-width="1.8"/><path d="M158 174h8v30h-8z" fill="var(--lh-wood-3)" stroke="var(--lh-ink)" stroke-width="1.4"/><ellipse cx="162" cy="206" rx="20" ry="5" fill="var(--lh-wood-3)" stroke="var(--lh-ink)" stroke-width="1.4"/>`;
      for (const cx of [146, 180]) s += `<path d="M${cx - 7} 152h14l-2 10h-10z" fill="var(--lh-pink-2)" stroke="var(--lh-ink)" stroke-width="1.2"/><path class="lh-a-steam" style="animation-delay:${cx === 180 ? 0.7 : 0}s" d="M${cx} 148q-3-5 0-9t0-9" fill="none" stroke="var(--lh-hi)" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`;
      s += `<path d="M154 160q8 4 16 0" fill="none" stroke="var(--lh-fire)" stroke-width="2"/><circle cx="160" cy="158" r="3" fill="var(--lh-pink)"/>`;
      if (o.friend) {
        s += say(96, 96, heartIn, 'lh-a-chat1', 0, true) + say(232, 96, icAt('mood', 'var(--lh-ink)'), 'lh-a-chat2') + say(96, 96, icAt('fun', 'var(--lh-gold)'), 'lh-a-chat3', 0, true) + say(232, 96, icAt('cake', 'var(--lh-pink-2)'), 'lh-a-chat4');
      } else s += say(96, 96, icAt('cafe'), 'lh-a-chat1', 0, true) + say(96, 96, icAt('fun', 'var(--lh-gold)'), 'lh-a-chat3', 0, true);
      if (o.nf) s += `<g class="lh-a-meet"><rect x="98" y="8" width="124" height="28" rx="14" fill="var(--lh-gold)" stroke="var(--lh-ink)" stroke-width="1.8"/><text x="160" y="27" text-anchor="middle" class="lh-sc-text">${o.label || ''}</text>${sparkleAt(92, 14, 7)}${sparkleAt(228, 30, 6, 'lh-a-tw', 0.5)}${heart(214, 104, 6)}</g>`;
    } else if (kind === 'doctor' || kind === 'faint') {
      s += roomBg('var(--lh-house-4)', 'var(--lh-fl-tiles-1)', 'var(--lh-fl-tiles-2)', o, [236, 22, 64, 48]);
      s += rr(24, 24, 46, 46, 12, 'var(--lh-white)') + `<path d="M47 34v26M34 47h26" stroke="var(--lh-pink-2)" stroke-width="8" stroke-linecap="round"/>`;
      s += rr(88, 30, 40, 52, 4, 'var(--lh-paper)') + `<path d="M96 44h24M96 54h24M96 64h16" stroke="var(--lh-blue-2)" stroke-width="2.4" stroke-linecap="round"/>`;
      if (kind === 'faint') {
        s += rr(40, 140, 170, 22, 6, 'var(--lh-white)') + rr(40, 120, 18, 60, 5, 'var(--lh-mint-2)') + rr(200, 132, 14, 48, 5, 'var(--lh-mint-2)');
        s += fig(H0('sleep', 0), 100, 160, 76);
        s += `<path d="M58 152q60-14 142 0v12H58z" fill="var(--lh-mint)" stroke="var(--lh-ink)" stroke-width="1.8"/><path d="M130 156q20 5 40 0" fill="none" stroke="var(--lh-mint-2)" stroke-width="2"/>`;
        s += `<text class="lh-a-zzz lh-sc-text" x="132" y="96">z</text><text class="lh-a-zzz lh-sc-text" style="animation-delay:.9s" x="142" y="84">z</text>`;
        s += `<g data-k="3">${plaster(113, 137)}</g>`;
        s += fig(friend('kitty', 'joy', 0), 262, 198, 84, 'lh-a-bob2');
        s += `<path d="M236 184q26 10 52 0l2 18h-56z" fill="var(--lh-white)" stroke="var(--lh-ink)" stroke-width="1.6"/>`;
        s += say(286, 96, heartIn, 'lh-a-chat1');
      } else {
        s += rr(60, 140, 120, 18, 6, 'var(--lh-mint)') + `<path d="M70 158v34M170 158v34" stroke="var(--lh-metal-2)" stroke-width="5" stroke-linecap="round"/>`;
        s += fig(H0('', 0), 120, 166, 82, 'lh-a-bob');
        s += `<g data-k="3">${plaster(134, 147)}</g>`;
        // la gattina dottoressa col camice e lo stetoscopio
        s += fig(friend('kitty', 'joy', 0), 236, 198, 86, 'lh-a-bob2');
        s += `<path d="M206 184q30 10 60 0l2 18h-64z" fill="var(--lh-white)" stroke="var(--lh-ink)" stroke-width="1.6"/><path d="M236 190v12" stroke="var(--lh-white-2)" stroke-width="2"/>`;
        s += `<path d="M216 186q-30 0-56-26" fill="none" stroke="var(--lh-metal-2)" stroke-width="2.6" stroke-linecap="round"/><g class="lh-a-steth">${ring(156, 156, 6, 'var(--lh-metal)', 1.6)}</g>`;
        s += `<g class="lh-a-float">${heart(150, 96, 7)}</g><g class="lh-a-float" style="animation-delay:1.1s">${heart(176, 104, 5, 'var(--lh-pink)')}</g>`;
        s += say(262, 100, icAt('health', 'var(--lh-pink-2)'), 'lh-a-chat1') + say(88, 92, icAt('mood'), 'lh-a-chat2', 0, true);
      }
    } else if (kind === 'bakery') {
      s += roomBg('var(--lh-house-7)', 'var(--lh-fl-tiles-1)', 'var(--lh-fl-tiles-2)', o, [240, 24, 60, 46]);
      s += rr(20, 40, 76, 104, 8, 'var(--lh-brick)') + `<path d="M28 60h60M28 80h60M28 100h60M28 120h60M50 40v20M70 60v20M44 80v20M66 100v20" stroke="var(--lh-pot-2)" stroke-width="1.2"/>`;
      s += rr(32, 74, 52, 34, 14, 'var(--lh-ink)') + `<rect class="lh-a-glow" x="36" y="78" width="44" height="26" rx="11" fill="var(--lh-fire)"/>`;
      s += fig(H0('joy', 0), 150, 160, 84, 'lh-a-bob') + `<g class="lh-a-bob">${chefHat(150, 92)}</g>`;
      s += `<g class="lh-a-tray"><rect x="166" y="112" width="44" height="6" rx="2" fill="var(--lh-metal)" stroke="var(--lh-ink)" stroke-width="1.2"/><ellipse cx="178" cy="110" rx="8" ry="5" fill="var(--lh-wood-1)" stroke="var(--lh-ink)" stroke-width="1.2"/><ellipse cx="198" cy="110" rx="8" ry="5" fill="var(--lh-wood-1)" stroke="var(--lh-ink)" stroke-width="1.2"/></g>`;
      // vetrina che si riempie
      s += rr(90, 140, 150, 46, 6, 'var(--lh-glass)', 2) + rr(90, 136, 150, 8, 3, 'var(--lh-wood-2)') + rr(90, 184, 150, 22, 4, 'var(--lh-wood-2)');
      s += [1, 2, 3, 4].map((k) => `<g data-k="${k}">${k % 2 ? `<ellipse cx="${88 + k * 30}" cy="170" rx="12" ry="8" fill="var(--lh-wood-1)" stroke="var(--lh-ink)" stroke-width="1.3"/><path d="M${82 + k * 30} 166l4 5M${88 + k * 30} 164l4 5" stroke="var(--lh-wood-3)" stroke-width="1.4"/>` : `<path d="M${76 + k * 30} 178v-12h24v12z" fill="var(--lh-pink)" stroke="var(--lh-ink)" stroke-width="1.3"/><path d="M${76 + k * 30} 166q12-6 24 0" fill="var(--lh-white)" stroke="var(--lh-ink)" stroke-width="1.2"/><circle cx="${88 + k * 30}" cy="161" r="3" fill="var(--lh-red)"/>`}</g>`).join('');
      s += `<g class="lh-a-walk">${fig(friend('chick', 'joy', 0), 284, 204, 66, 'lh-a-bob2')}${say(290, 128, heartIn, 'lh-a-chat1')}</g>`;
    } else if (kind === 'craft') {
      s += roomBg('var(--lh-house-6)', 'var(--lh-fl-wood-1)', 'var(--lh-fl-wood-2)', o, [240, 24, 60, 46]);
      for (let k = 0; k < 3; k++) s += rr(20 + k * 46, 30, 38, 30, 3, ['var(--lh-yellow)', 'var(--lh-mint)', 'var(--lh-blue)'][k], 2.2) + `<circle cx="${32 + k * 46}" cy="42" r="6" fill="${['var(--lh-pink-2)', 'var(--lh-leaf-2)', 'var(--lh-white)'][k]}"/>`;
      s += `<path d="M70 200l26-120M130 200l-26-120M100 80v124" stroke="var(--lh-wood-3)" stroke-width="5" stroke-linecap="round"/>`;
      s += rr(58, 76, 84, 70, 4, 'var(--lh-paper)', 2.2) + `<rect x="58" y="144" width="84" height="6" rx="2" fill="var(--lh-wood-2)" stroke="var(--lh-ink)" stroke-width="1.2"/>`;
      s += `<g data-k="1"><path d="M66 134q20-30 40-10t30-16v26H66z" fill="var(--lh-leaf)" opacity=".9"/></g><g data-k="2"><circle cx="118" cy="96" r="10" fill="var(--lh-yellow)"/></g><g data-k="3"><path d="M74 100q8-10 16 0" stroke="var(--lh-blue-2)" stroke-width="4" fill="none" stroke-linecap="round"/></g><g data-k="4">${sakura(86, 124, 6)}${sakura(126, 126, 5)}</g>`;
      s += fig(H0('joy', 0), 186, 200, 88, 'lh-a-bob');
      s += `<g class="lh-a-brush"><path d="M158 140l-16-26" stroke="var(--lh-wood-3)" stroke-width="4" stroke-linecap="round"/><path d="M142 114l-4-7" stroke="var(--lh-pink-2)" stroke-width="5" stroke-linecap="round"/></g>`;
      s += `<ellipse cx="216" cy="160" rx="16" ry="10" fill="var(--lh-wood-1)" stroke="var(--lh-ink)" stroke-width="1.4"/>${['var(--lh-pink-2)', 'var(--lh-blue-2)', 'var(--lh-yellow)', 'var(--lh-mint-2)'].map((c, i) => `<circle cx="${206 + i * 6}" cy="${156 + (i % 2) * 6}" r="2.6" fill="${c}"/>`).join('')}`;
      s += `<g class="lh-a-walk">${fig(friend('kitty', 'joy', 0), 284, 204, 66, 'lh-a-bob2')}${sparkleAt(266, 120, 7)}${say(292, 126, heartIn, 'lh-a-chat2')}</g>`;
    } else if (kind === 'plants') {
      s += roomBg('var(--lh-house-5)', 'var(--lh-fl-wood-1)', 'var(--lh-fl-wood-2)', o, [236, 24, 64, 48]);
      s += rr(20, 132, 180, 14, 4, 'var(--lh-wood-2)') + `<path d="M34 146v54M186 146v54" stroke="var(--lh-wood-3)" stroke-width="6" stroke-linecap="round"/>`;
      s += [0, 1, 2, 3].map((k) => { const x = 44 + k * 44; return `<g data-k="${k + 1}" class="lh-sc-grow">${ring(x, 108, 14, k % 2 ? 'var(--lh-leaf)' : 'var(--lh-leaf-2)', 1.3)}${k % 2 ? sakura(x + 4, 100, 5) : `<circle cx="${x - 3}" cy="104" r="4" fill="var(--lh-flower)"/>`}</g><path d="M${x - 12} 116h24l-3 16h-18z" fill="var(--lh-pot)" stroke="var(--lh-ink)" stroke-width="1.4"/>`; }).join('');
      s += fig(H0('joy', 0), 200, 204, 88, 'lh-a-bob');
      s += `<g class="lh-a-water"><path d="M170 132h24v18h-24z" fill="var(--lh-blue)" stroke="var(--lh-ink)" stroke-width="1.4"/><path d="M170 136l-20-12" stroke="var(--lh-ink)" stroke-width="3" stroke-linecap="round"/><path d="M170 136l-20-12" stroke="var(--lh-blue-2)" stroke-width="1.6" stroke-linecap="round"/></g>`;
      s += [0, 0.3, 0.6].map((d) => `<circle class="lh-a-drip" style="animation-delay:${d}s" cx="146" cy="124" r="2.4" fill="var(--lh-water-2)"/>`).join('');
      s += `<g class="lh-a-walk">${fig(friend('piggy', 'joy', 0), 284, 206, 64, 'lh-a-bob2')}${say(290, 130, icAt('beauty', 'var(--lh-flower)'), 'lh-a-chat1')}</g>`;
    } else if (kind === 'shop') {
      s += roomBg('var(--lh-house-6)', 'var(--lh-fl-wood-1)', 'var(--lh-fl-wood-2)', o);
      s += `<path d="M30 140v-80M30 60q-14 6-14 20h28q0-14-14-20z" stroke="var(--lh-ink)" stroke-width="1.6" fill="var(--lh-yellow)"/><circle class="lh-a-glow" cx="30" cy="86" r="8" fill="var(--lh-bulb)" opacity=".7"/>`;
      s += rr(58, 112, 26, 34, 6, 'var(--lh-pot)') + ring(71, 96, 20, 'var(--lh-leaf)') + ring(80, 88, 10, 'var(--lh-leaf-2)', 1.2);
      s += rr(96, 118, 128, 40, 12, 'var(--lh-pink-2)');
      s += fig(H0('joy', 0), 160, 166, 82, 'lh-a-bounce');
      s += rr(96, 152, 128, 32, 12, 'var(--lh-pink)') + rr(90, 136, 18, 48, 8, 'var(--lh-pink)') + rr(212, 136, 18, 48, 8, 'var(--lh-pink)');
      s += `<g class="lh-a-swing"><path d="M220 128l12 10" stroke="var(--lh-ink)" stroke-width="1.2"/><rect x="226" y="134" width="22" height="14" rx="3" fill="var(--lh-sign)" stroke="var(--lh-ink)" stroke-width="1.2"/><g transform="translate(229 135) scale(.5)">${(IC.acorn)}</g></g>`;
      s += fig(friend('bear', 'joy', 0), 280, 204, 70, 'lh-a-bob2') + say(286, 130, icAt('relax', 'var(--lh-pink-2)'), 'lh-a-chat1');
      s += sparkleAt(124, 112, 7) + sparkleAt(200, 104, 6, 'lh-a-tw', 0.7);
    }
    s += veil(o, kind === 'park' ? 0.45 : 0.22);
    return `<svg class="lh-scene-svg" viewBox="0 ${Y0 + 4} ${SW} ${YH - 8}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`;
  }

  HH.lifeArt = { icon, iconFor, IC, hari, friend, wrap, at, room, card, map, iso, PLACE_IC, scene };
})(typeof globalThis !== 'undefined' ? globalThis : window);
