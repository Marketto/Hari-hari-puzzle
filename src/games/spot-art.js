/* Hari Spot — disegni SVG delle scene (funzioni pure: stringhe SVG, solo token CSS --sd-*).
 * HH.spotArt.scene(pz, side)  → contenuto SVG (viewBox 0 0 400 280) della scena A (side 0) o B (side 1)
 * HH.spotArt.obj(o, season)   → un oggetto nella sua posizione (stesse coordinate di HH.spot: appoggio in basso al centro)
 * Ogni disegnatore lavora in coordinate locali a scala 1 dentro il riquadro TYPES[t] (y negativo = verso l'alto)
 * e rispetta le parti dichiarate in spot-logic.js (finestre, insegne, teste…), così le hitbox cadono sul disegno.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const INK = 'var(--sd-ink)';
  const o = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const C = (k) => `var(--sd-c-${k || 'white'})`;
  const n1 = (v) => Math.round(v * 10) / 10;
  const hl = (d, w = 2, op = 0.7) => `<path d="${d}" fill="none" stroke="var(--sd-hi)" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const FACES = ['happy', 'sleep', 'wow'];

  // occhi e bocca: happy (puntini + sorriso) · sleep (archetti chiusi) · wow (occhi grandi + bocca a "o")
  function face(x1, x2, y, k, kind) {
    const f = FACES[kind] || 'happy';
    let s = '';
    if (f === 'sleep') s += [x1, x2].map((x) => `<path d="M${x - 2.2 * k} ${y}q${2.2 * k} ${2 * k} ${4.4 * k} 0" fill="none" ${o(1.3 * k)}/>`).join('');
    else s += [x1, x2].map((x) => `<circle cx="${x}" cy="${y}" r="${(f === 'wow' ? 1.9 : 1.4) * k}" fill="${INK}"/><circle cx="${x + 0.5 * k}" cy="${y - 0.6 * k}" r="${0.5 * k}" fill="var(--sd-hi)"/>`).join('');
    const mx = (x1 + x2) / 2, my = y + 3.2 * k;
    if (f === 'wow') s += `<ellipse cx="${mx}" cy="${my + 0.4 * k}" rx="${1.3 * k}" ry="${1.6 * k}" fill="${INK}"/>`;
    else s += `<path d="M${mx - 1.6 * k} ${my}q${0.8 * k} ${1.1 * k} ${1.6 * k} 0q${0.8 * k} ${1.1 * k} ${1.6 * k} 0" fill="none" ${o(1.1 * k)}/>`;
    return s + `<ellipse cx="${x1 - 2 * k}" cy="${my - 0.6 * k}" rx="${1.6 * k}" ry="${1 * k}" fill="var(--sd-blush)"/><ellipse cx="${x2 + 2 * k}" cy="${my - 0.6 * k}" rx="${1.6 * k}" ry="${1 * k}" fill="var(--sd-blush)"/>`;
  }
  // macchia unita: prima i contorni di tutti i cerchi, poi i riempimenti (niente linee interne)
  const blob = (cs, fill, w = 2.2) => cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}" stroke="${INK}" stroke-width="${w * 2}"/>`).join('') +
    cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');
  const snowCap = (cs) => cs.map(([x, y, r]) => `<path d="M${x - r * 0.8} ${y - r * 0.45}a${r * 0.8} ${r * 0.62} 0 0 1 ${r * 1.6} 0q${-r * 0.4} ${r * 0.28} ${-r * 0.8} ${r * 0.06}q${-r * 0.4} ${r * 0.22} ${-r * 0.8} -${r * 0.06}z" fill="var(--sd-snow)"/>`).join('');

  /* ---------- icone delle insegne (centrate in 0,0; ~16 unità) ---------- */
  const ICON = {
    cake: `<rect x="-7" y="-2" width="14" height="7" rx="2" fill="${C('pink')}" ${o(1.3)}/><rect x="-6" y="-7" width="12" height="5.5" rx="2" fill="${C('cream')}" ${o(1.3)}/><circle cx="0" cy="-9.5" r="2.4" fill="${C('red')}" ${o(1.1)}/>`,
    fish: `<path d="M-8 0q6-7 12 0q-6 7-12 0z" fill="${C('sky')}" ${o(1.3)}/><path d="M4 0l5-4v8z" fill="${C('sky')}" ${o(1.3)}/><circle cx="-4" cy="-1" r="1" fill="${INK}"/>`,
    flower: `${[0, 72, 144, 216, 288].map((a) => `<circle cx="${n1(4.2 * Math.cos(a * Math.PI / 180))}" cy="${n1(4.2 * Math.sin(a * Math.PI / 180) - 1)}" r="3.3" fill="${C('pink')}" ${o(1.1)}/>`).join('')}<circle cx="0" cy="-1" r="2.4" fill="${C('yellow')}"/>`,
    book: `<path d="M0 -6q-4-2-8 0v11q4-2 8 0q4-2 8 0v-11q-4-2-8 0z" fill="${C('blue')}" ${o(1.3)}/><path d="M0 -6v11" ${o(1.1)}/>`,
    cup: `<path d="M-6 -3h11v4a5.5 5.5 0 0 1-11 0z" fill="${C('white')}" ${o(1.3)}/><path d="M5 -1.5a2.5 2.5 0 0 1 0 4.5" fill="none" ${o(1.2)}/><path d="M-2 -6q-1.5-2 0-4M2 -6q-1.5-2 0-4" fill="none" stroke="var(--sd-steam)" stroke-width="1.3" stroke-linecap="round"/>`,
    star: `<path d="M0 -8l2.4 5 5.4.6-4 3.7 1.1 5.4L0 4l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="${C('yellow')}" ${o(1.2)}/>`,
  };
  const ICON_KEYS = ['cake', 'fish', 'flower', 'book', 'cup', 'star'];

  /* ---------- disegnatori ---------- */
  const windowBox = (x, y, w, h, lit, cur) => `${lit ? `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="5" fill="var(--sd-glow)"/>` : ''}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${lit ? 'var(--sd-lit)' : 'var(--sd-glass)'}" ${o(1.6)}/>
    <path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="var(--sd-frame)" stroke-width="1.6"/>
    ${cur ? `<path d="M${x + 1.5} ${y + 1.5}h${w * 0.32}q${-w * 0.1} ${h * 0.4} ${-w * 0.32} ${h * 0.7}z" fill="${cur}"/>` : ''}
    ${lit ? '' : hl(`M${x + 3} ${y + h - 4}l${w * 0.25} ${-h * 0.3}`, 1.4, 0.8)}`;

  const D = {
    house(ob, ss) {
      const v = ob.v || { w: [0, 0] };
      return `<rect x="-32" y="-64" width="64" height="64" rx="4" fill="${C(ob.c)}" ${o(2)}/>
        <path d="M-32 -12h64" stroke="var(--sd-shade)" stroke-width="5"/>
        <path d="M-38 -60L0 -95L38 -60Z" fill="${C(ob.c2)}" ${o(2.4)}/>
        <path d="M0 -95L38 -60H24Z" fill="var(--sd-shade)"/>${hl('M-30 -62L-4 -86', 2, 0.55)}
        ${ss === 'winter' ? `<path d="M-38 -60L0 -95L38 -60q-4 4-8 0q-4 4-8 0L0 -84l-22 24q-4 4-8 0q-4 4-8 0z" fill="var(--sd-snow)"/>` : ''}
        ${windowBox(-28, -56, 18, 18, v.w[0], 'var(--sd-curtain)')}${windowBox(10, -56, 18, 18, v.w[1], 'var(--sd-curtain)')}
        <path d="M-8 0V-22a8 8 0 0 1 16 0V0Z" fill="${C(ob.c3)}" ${o(1.8)}/><circle cx="4" cy="-12" r="1.5" fill="var(--sd-knob)"/>
        <rect x="-12" y="-2" width="24" height="3" rx="1.5" fill="var(--sd-step)"/>`;
    },
    flat(ob, ss) {
      const v = ob.v || { w: [] };
      const xs = [-22, 6], ys = [-110, -84, -58];
      let win = '';
      ys.forEach((y, r) => xs.forEach((x, c) => { win += windowBox(x, y, 16, 18, v.w[r * 2 + c], r === 1 && c === 0 ? 'var(--sd-curtain-2)' : ''); }));
      return `<rect x="-30" y="-120" width="60" height="120" rx="3" fill="${C(ob.c)}" ${o(2)}/>
        <rect x="-32" y="-124" width="64" height="7" rx="3" fill="var(--sd-cornice)" ${o(1.8)}/>
        ${ss === 'winter' ? '<rect x="-32" y="-128" width="64" height="5" rx="2.5" fill="var(--sd-snow)"/>' : ''}
        <path d="M-28 -34h56" stroke="var(--sd-shade)" stroke-width="3"/>${win}
        <path d="M-8 0V-20a8 8 0 0 1 16 0V0Z" fill="var(--sd-door)" ${o(1.8)}/><circle cx="4" cy="-10" r="1.4" fill="var(--sd-knob)"/>
        <rect x="-26" y="-30" width="12" height="7" rx="2" fill="var(--sd-pot)" ${o(1.3)}/><circle cx="-23" cy="-32" r="2.6" fill="${C('pink')}"/><circle cx="-17" cy="-32" r="2.6" fill="${C('yellow')}"/>`;
    },
    shop(ob, ss) {
      const v = ob.v || { icon: 0 };
      const stripes = [-42, -21, 0, 21].map((x, i) => `<rect x="${x}" y="-66" width="${i % 2 ? 0 : 21}" height="16" fill="${C(ob.c2)}"/>`).join('') +
        [-31.5, -10.5, 10.5, 31.5].map((x, i) => `<path d="M${x - 10.5} -50a10.5 6 0 0 0 21 0z" fill="${i % 2 ? 'var(--sd-awn)' : C(ob.c2)}" ${o(1.6)}/>`).join('');
      return `<rect x="-38" y="-62" width="76" height="62" rx="3" fill="${C(ob.c)}" ${o(2)}/>
        <rect x="-42" y="-66" width="84" height="16" rx="3" fill="var(--sd-awn)" ${o(2)}/>${stripes}
        <rect x="-42" y="-66" width="84" height="16" rx="3" fill="none" ${o(2)}/>
        ${ss === 'winter' ? '<rect x="-43" y="-70" width="86" height="5" rx="2.5" fill="var(--sd-snow)"/>' : ''}
        <rect x="-22" y="-90" width="44" height="22" rx="7" fill="var(--sd-sign)" ${o(2)}/>
        <g transform="translate(0 -78) scale(${ob.f ? -1 : 1} 1)">${ICON[ICON_KEYS[v.icon] || 'cake']}</g>
        <rect x="-32" y="-42" width="28" height="32" rx="3" fill="var(--sd-glass)" ${o(1.8)}/>
        <rect x="-30" y="-20" width="24" height="5" fill="var(--sd-shelf)"/><circle cx="-24" cy="-24" r="3" fill="${C('pink')}" ${o(1)}/><circle cx="-14" cy="-24" r="3" fill="${C('yellow')}" ${o(1)}/>
        ${hl('M-29 -30l8-9', 1.6, 0.8)}
        <path d="M6 0V-40h22V0Z" fill="var(--sd-door)" ${o(1.8)}/><rect x="10" y="-35" width="14" height="12" rx="2" fill="var(--sd-glass)" ${o(1.3)}/><circle cx="23" cy="-18" r="1.4" fill="var(--sd-knob)"/>`;
    },
    stall(ob) {
      const n = (ob.v && ob.v.n) || 0;
      let fr = '';
      for (let k = 0; k < n; k++) { const x = n1((k - (n - 1) / 2) * 10); fr += `<circle cx="${x}" cy="-27" r="5" fill="${C(ob.c)}" ${o(1.4)}/><path d="M${x} -32l1.5-2.4" stroke="var(--sd-leaf-s)" stroke-width="1.8" stroke-linecap="round"/>${hl(`M${x - 2.4} -28.5a2.6 2.6 0 0 1 2-2`, 1.2, 0.8)}`; }
      return `<path d="M-24 -44V0M24 -44V0" ${o(2.6)}/><path d="M-24 -44V0M24 -44V0" stroke="var(--sd-pole)" stroke-width="1.4"/>
        <rect x="-28" y="-58" width="56" height="12" rx="3" fill="var(--sd-awn)" ${o(1.8)}/>
        <rect x="-28" y="-58" width="14" height="12" fill="${C(ob.c2)}"/><rect x="0" y="-58" width="14" height="12" fill="${C(ob.c2)}"/>
        <rect x="-28" y="-58" width="56" height="12" rx="3" fill="none" ${o(1.8)}/>
        ${[-21, -7, 7, 21].map((x, i) => `<path d="M${x - 7} -46a7 4 0 0 0 14 0z" fill="${i % 2 ? 'var(--sd-awn)' : C(ob.c2)}" ${o(1.4)}/>`).join('')}
        <rect x="-26" y="-22" width="52" height="22" rx="3" fill="var(--sd-wood)" ${o(1.8)}/><path d="M-26 -14h52" stroke="var(--sd-wood-2)" stroke-width="2"/>${fr}`;
    },
    car(ob) {
      return `<path d="M-21 -20L-15 -31H4L12 -20Z" fill="${C(ob.c)}" ${o(2)}/>
        <path d="M-16.5 -21L-12.5 -28H-5V-21ZM-2 -21V-28H3L8 -21Z" fill="var(--sd-glass)" ${o(1.3)}/>
        <rect x="-29" y="-22" width="58" height="16" rx="7" fill="${C(ob.c)}" ${o(2)}/>
        <path d="M-25 -12h50" stroke="var(--sd-shade)" stroke-width="3"/>${hl('M-24 -18h14', 1.6, 0.7)}
        <circle cx="25.5" cy="-16" r="2.6" fill="var(--sd-lit)" ${o(1.2)}/><rect x="-29" y="-18" width="3" height="5" rx="1.5" fill="${C('red')}"/>
        ${[-17, 17].map((x) => `<circle cx="${x}" cy="-6" r="6" fill="var(--sd-tire)" ${o(1.6)}/><circle cx="${x}" cy="-6" r="2.4" fill="var(--sd-hub)"/>`).join('')}`;
    },
    tlight(ob) {
      const on = (ob.v && ob.v.on) || 0;
      const L = ['var(--sd-tl-r)', 'var(--sd-tl-y)', 'var(--sd-tl-g)'];
      return `<rect x="-2" y="-34" width="4" height="34" fill="var(--sd-pole)" ${o(1.4)}/>
        <rect x="-8" y="-66" width="16" height="36" rx="5" fill="var(--sd-pole-2)" ${o(1.8)}/>
        ${[-59, -48, -37].map((y, i) => `${i === on ? `<circle cx="0" cy="${y}" r="7" fill="var(--sd-glow)"/>` : ''}<circle cx="0" cy="${y}" r="4.3" fill="${i === on ? L[i] : 'var(--sd-tl-off)'}" ${o(1.1)}/>`).join('')}`;
    },
    lamp(ob) {
      const lit = ob.v && ob.v.lit;
      return `<rect x="-2" y="-56" width="4" height="56" fill="var(--sd-pole)" ${o(1.4)}/><rect x="-5" y="-4" width="10" height="4" rx="2" fill="var(--sd-pole-2)" ${o(1.2)}/>
        ${lit ? '<circle cx="0" cy="-63" r="15" fill="var(--sd-glow)"/>' : ''}
        <path d="M-8 -56h16l-2-12h-12z" fill="${lit ? 'var(--sd-lit)' : 'var(--sd-glass-off)'}" ${o(1.6)}/>
        <path d="M-10 -68h20l-10-6z" fill="var(--sd-pole-2)" ${o(1.6)}/><rect x="-9" y="-57" width="18" height="3" rx="1.5" fill="var(--sd-pole-2)" ${o(1.2)}/>`;
    },
    ctree(ob, ss) {
      return `<rect x="-3.5" y="-22" width="7" height="22" rx="2" fill="var(--sd-trunk)" ${o(1.6)}/>
        ${blob([[0, -38, 18], [-8, -32, 9], [9, -31, 9]], C(ob.c))}
        ${ss === 'winter' ? snowCap([[0, -50, 12]]) : ''}${hl('M-10 -44a12 12 0 0 1 8-8', 2, 0.6)}
        <rect x="-7" y="-2" width="14" height="3" rx="1.5" fill="var(--sd-soil)"/>`;
    },
    bench(ob) {
      return `<path d="M-18 -11V0M18 -11V0M-15 -16V-11M15 -16V-11" ${o(2.6)}/>
        <rect x="-21" y="-23" width="42" height="7" rx="3" fill="${C(ob.c)}" ${o(1.6)}/>
        <rect x="-23" y="-13" width="46" height="5" rx="2.5" fill="${C(ob.c)}" ${o(1.6)}/>${hl('M-17 -20h16', 1.4, 0.6)}`;
    },
    cat(ob) {
      const v = ob.v || {};
      return `<path d="M-12 -9q-6-4-3-13" fill="none" ${o(4.4)}/><path d="M-12 -9q-6-4-3-13" fill="none" stroke="${C(ob.c)}" stroke-width="2.4" stroke-linecap="round"/>
        <ellipse cx="-2" cy="-8" rx="11" ry="8" fill="${C(ob.c)}" ${o(1.7)}/>
        <path d="M2 -19l1-7 5 4zM14 -19l-1-7-5 4z" fill="${C(ob.c)}" ${o(1.5)}/>
        <circle cx="8" cy="-16" r="8" fill="${C(ob.c)}" ${o(1.7)}/>
        <path d="M3.6 -22.5l.6-2.6 2 1.6zM12.4 -22.5l-.6-2.6-2 1.6z" fill="var(--sd-blush)"/>
        ${face(5, 11, -17, 1, v.face)}<path d="M-8 0v-3M3 0v-3" ${o(2.4)}/>`;
    },
    pot(ob) {
      return `<path d="M0 -9q-1-5 0-9" fill="none" stroke="var(--sd-stem)" stroke-width="1.8"/>
        <path d="M0 -12q4-3 6-1q-3 3-6 1z" fill="var(--sd-leaf-s)"/>
        ${[0, 72, 144, 216, 288].map((a) => `<circle cx="${n1(3.8 * Math.cos((a - 90) * Math.PI / 180))}" cy="${n1(-18 + 3.8 * Math.sin((a - 90) * Math.PI / 180))}" r="3.3" fill="${C(ob.c)}" ${o(1)}/>`).join('')}
        <circle cx="0" cy="-18" r="2.2" fill="var(--sd-flower-mid)"/>
        <path d="M-6.5 -10h13l-2 10h-9z" fill="var(--sd-pot)" ${o(1.5)}/><path d="M-7 -10h14" ${o(1.8)}/>`;
    },
    hydrant(ob) {
      return `<rect x="-5" y="-16" width="10" height="16" rx="2" fill="${C(ob.c)}" ${o(1.5)}/>
        <path d="M-5.5 -16a5.5 5 0 0 1 11 0z" fill="${C(ob.c)}" ${o(1.5)}/><rect x="-1.2" y="-23" width="2.4" height="3" rx="1" fill="${C(ob.c)}" ${o(1.1)}/>
        <rect x="-7.5" y="-11" width="15" height="4" rx="2" fill="${C(ob.c)}" ${o(1.3)}/><rect x="-6.5" y="-2.5" width="13" height="2.5" rx="1" fill="var(--sd-pole-2)"/>${hl('M-2.5 -13v8', 1.3, 0.7)}`;
    },
    balloon(ob) {
      return `<path d="M0 0q-4-8 0-14t0-10" fill="none" stroke="${INK}" stroke-width="1"/>
        <ellipse cx="0" cy="-35" rx="8.5" ry="10.5" fill="${C(ob.c)}" ${o(1.6)}/><path d="M-2 -24.5h4l-2-1.6z" fill="${C(ob.c)}" ${o(1.1)}/>${hl('M-4.5 -38a5 6 0 0 1 3-4', 1.6, 0.85)}`;
    },
    bird(ob) {
      return `<path d="M-8 -7l-3-3" ${o(2.2)}/><ellipse cx="0" cy="-6" rx="8" ry="5.5" fill="${C(ob.c)}" ${o(1.5)}/>
        <circle cx="5.5" cy="-9" r="4.5" fill="${C(ob.c)}" ${o(1.5)}/><path d="M9.5 -10l3.5 1.5-3.5 1.2z" fill="${C('orange')}" ${o(0.9)}/>
        <circle cx="6.6" cy="-10" r="1" fill="${INK}"/><path d="M-4 -7q3 4 6 0" fill="none" ${o(1.3)}/>`;
    },
    cloud() {
      return `<path d="M-30 -2a9 9 0 0 1 4-16a12 12 0 0 1 20-8a14 14 0 0 1 26 2a10 10 0 0 1 10 18z" fill="var(--sd-cloud)" ${o(1.8)}/>
        <path d="M-28 -6q30 4 58-2q-1 4-3 6h-53q-2-1-2-4z" fill="var(--sd-cloud-2)"/>${hl('M-20 -18a9 9 0 0 1 8-5', 2, 0.9)}`;
    },
    sign(ob) {
      const sh = (ob.v && ob.v.shape) || 0;
      const plate = sh === 0 ? `<circle cx="0" cy="-39" r="10" fill="${C(ob.c)}" ${o(1.8)}/><rect x="-6" y="-41" width="12" height="4" rx="1.5" fill="var(--sd-hi)"/>`
        : sh === 1 ? `<path d="M0 -50L11 -29H-11Z" fill="${C(ob.c)}" ${o(1.8)}/><path d="M0 -44v7" stroke="var(--sd-hi)" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-33" r="1.3" fill="var(--sd-hi)"/>`
          : `<rect x="-9" y="-48" width="18" height="18" rx="3" fill="${C(ob.c)}" ${o(1.8)}/><path d="M-4 -35v-7h6l-2-2.5M2 -42l-2 2.5" fill="none" stroke="var(--sd-hi)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      return `<rect x="-1.5" y="-30" width="3" height="30" fill="var(--sd-pole)" ${o(1.2)}/>${plate}`;
    },
    hari(ob) {
      const m = HH.mascot && HH.mascot.mini ? HH.mascot.mini() : '';
      return `<ellipse cx="0" cy="-1" rx="16" ry="3" fill="var(--sd-shadow)"/><g class="sd-hop">${m.replace('<svg class="mini-hari"', '<svg x="-22" y="-44" width="44" height="44"')}</g>`;
    },
    tree(ob, ss) {
      const n = (ob.v && ob.v.n) || 0;
      const AP = [[-20, -58], [16, -70], [-6, -88], [22, -50], [-24, -76]];
      return `<path d="M-6 0V-40h12V0q-2-3-6-3t-6 3z" fill="var(--sd-trunk)" ${o(1.8)}/><path d="M0 -14q3-4 1-8" fill="none" stroke="var(--sd-trunk-2)" stroke-width="1.6" stroke-linecap="round"/>
        ${blob([[0, -80, 25], [-19, -60, 20], [19, -60, 20], [0, -58, 18]], C(ob.c))}
        ${ss === 'winter' ? snowCap([[0, -96, 20], [-22, -72, 12], [22, -72, 12]]) : ''}
        ${hl('M-14 -88a18 18 0 0 1 12-12', 2.4, 0.55)}
        ${AP.slice(0, n).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="var(--sd-apple)" ${o(1.4)}/><path d="M${x} ${y - 6}l2-2.6" stroke="var(--sd-leaf-s)" stroke-width="1.8" stroke-linecap="round"/>${hl(`M${x - 3} ${y - 1}a3 3 0 0 1 2-3`, 1.3, 0.85)}`).join('')}`;
    },
    pine(ob, ss) {
      const tri = (y, w, h) => `<path d="M${-w} ${y}Q0 ${y + 4} ${w} ${y}L2 ${y - h}Q0 ${y - h - 2} -2 ${y - h}Z" fill="${C(ob.c)}" ${o(2)}/>`;
      return `<rect x="-4" y="-16" width="8" height="16" rx="2" fill="var(--sd-trunk)" ${o(1.6)}/>
        ${tri(-14, 23, 34)}${tri(-38, 19, 32)}${tri(-62, 14, 36)}
        ${ss === 'winter' ? `<path d="M-6 -92Q0 -100 6 -92q-3 3-6 1q-3 2-6-1z" fill="var(--sd-snow)"/><path d="M-12 -66Q0 -74 12 -66q-6 3-12 1q-6 2-12-1z" fill="var(--sd-snow)"/>` : ''}
        ${hl('M-8 -24l8-18', 1.6, 0.4)}`;
    },
    bush(ob) {
      const n = (ob.v && ob.v.n) || 0;
      const BE = [[-12, -15], [3, -20], [13, -11], [-2, -9]];
      return `${blob([[-12, -11, 11], [1, -15, 13], [13, -10, 10]], C(ob.c))}${hl('M-16 -16a8 8 0 0 1 6-5', 1.8, 0.55)}
        ${BE.slice(0, n).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="var(--sd-berry)" ${o(1.2)}/><circle cx="${x - 1.4}" cy="${y - 1.4}" r="1.2" fill="var(--sd-hi)"/>`).join('')}`;
    },
    mush(ob) {
      const d = ob.v && ob.v.dots;
      return `<path d="M-5 0q-1-7 1-12h8q2 5 1 12z" fill="var(--sd-stem-m)" ${o(1.5)}/>
        <path d="M-13 -11A13 14 0 0 1 13 -11Q0 -7 -13 -11Z" fill="${C(ob.c)}" ${o(1.7)}/>
        ${d ? '<circle cx="-6" cy="-17" r="2.7" fill="var(--sd-hi)"/><circle cx="3" cy="-21.5" r="2.3" fill="var(--sd-hi)"/><circle cx="7.5" cy="-14.5" r="2" fill="var(--sd-hi)"/>' : hl('M-8 -15a9 9 0 0 1 6-6', 1.6, 0.7)}
        <circle cx="-2" cy="-6" r=".9" fill="${INK}"/><circle cx="2" cy="-6" r=".9" fill="${INK}"/>`;
    },
    flower(ob) {
      return `<path d="M0 0q-1-8 0-15" fill="none" stroke="var(--sd-stem)" stroke-width="2"/><path d="M0 -6q-5-4-7-1q3 3 7 1z" fill="var(--sd-leaf-s)"/>
        ${[0, 72, 144, 216, 288].map((a) => `<circle cx="${n1(4.2 * Math.cos((a - 90) * Math.PI / 180))}" cy="${n1(-19 + 4.2 * Math.sin((a - 90) * Math.PI / 180))}" r="3.6" fill="${C(ob.c)}" ${o(1.1)}/>`).join('')}
        <circle cx="0" cy="-19" r="2.4" fill="var(--sd-flower-mid)"/>`;
    },
    rock(ob) {
      return `<path d="M-17 0q-1-11 7-16q8-5 16-2q11 4 11 18z" fill="${C(ob.c)}" ${o(1.8)}/><path d="M-12 -2q14 2 28-1" fill="none" stroke="var(--sd-shade)" stroke-width="3"/>
        ${hl('M-9 -11q4-4 9-4', 1.6, 0.7)}<path d="M6 -12l3 4" fill="none" ${o(1.2)}/>`;
    },
    pond() {
      return `<ellipse cx="0" cy="-19" rx="62" ry="18" fill="var(--sd-water)" ${o(2.2)}/>
        <ellipse cx="0" cy="-17" rx="50" ry="12" fill="none" stroke="var(--sd-water-2)" stroke-width="2" stroke-dasharray="16 10"/>
        <ellipse cx="-34" cy="-14" rx="8" ry="4" fill="var(--sd-lily)" ${o(1.2)}/><path d="M-34 -14l6-2" ${o(1.2)}/>
        ${hl('M-40 -28q20-6 40-4', 2, 0.6)}`;
    },
    duck(ob) {
      return `<path d="M-11 -6q0-8 9-8h6q8 0 7 8q-1 6-11 6t-11-6z" fill="${C(ob.c)}" ${o(1.6)}/>
        <circle cx="6" cy="-15" r="5.5" fill="${C(ob.c)}" ${o(1.6)}/><path d="M10.5 -15.5l4.5 1.2-4.2 2z" fill="${C('orange')}" ${o(1)}/>
        <circle cx="7.4" cy="-16.2" r="1.1" fill="${INK}"/><path d="M-5 -8q4 3 8 0" fill="none" ${o(1.3)}/>
        <path d="M-12 -1q12 3 24 0" fill="none" stroke="var(--sd-water-2)" stroke-width="2" stroke-linecap="round"/>`;
    },
    bunny(ob) {
      const v = ob.v || {};
      return `<circle cx="-11" cy="-8" r="4" fill="var(--sd-c-white)" ${o(1.4)}/>
        <ellipse cx="-2" cy="-9" rx="10" ry="9" fill="${C(ob.c)}" ${o(1.7)}/>
        <ellipse cx="2" cy="-33" rx="2.8" ry="8" transform="rotate(-10 2 -33)" fill="${C(ob.c)}" ${o(1.5)}/><ellipse cx="9" cy="-33" rx="2.8" ry="8" transform="rotate(12 9 -33)" fill="${C(ob.c)}" ${o(1.5)}/>
        <ellipse cx="2" cy="-33" rx="1.1" ry="5" transform="rotate(-10 2 -33)" fill="var(--sd-blush)"/><ellipse cx="9" cy="-33" rx="1.1" ry="5" transform="rotate(12 9 -33)" fill="var(--sd-blush)"/>
        <circle cx="5" cy="-21" r="8.5" fill="${C(ob.c)}" ${o(1.7)}/>${face(2, 8.5, -22, 1, v.face)}<path d="M-6 0h5M2 0h5" ${o(2.4)}/>`;
    },
    fox(ob) {
      const v = ob.v || {};
      return `<path d="M-14 -10q-8-2-4-14q6 6 4 14z" fill="${C(ob.c)}" ${o(1.6)}/><path d="M-18 -22q2-3 3-2q0 3-1 4z" fill="var(--sd-c-white)"/>
        <ellipse cx="-3" cy="-10" rx="12" ry="8" fill="${C(ob.c)}" ${o(1.7)}/>
        <path d="M7 -22l1-7 4 5zM16 -22l1-7 2 6z" fill="${C(ob.c)}" ${o(1.5)}/>
        <path d="M6 -17a7 7 0 0 1 12-4l3 6q-4 3-9 3q-6 0-6-5z" fill="${C(ob.c)}" ${o(1.7)}/><path d="M12 -12q5 0 9-3l-1 2q-3 3-8 2z" fill="var(--sd-c-white)"/>
        <circle cx="21" cy="-15" r="1.4" fill="${INK}"/>${face(10, 15, -19, 0.9, v.face)}<path d="M-9 0v-4M3 0v-4" ${o(2.4)}/>`;
    },
    butterfly(ob) {
      return `<ellipse cx="-5" cy="-10" rx="5" ry="5.5" fill="${C(ob.c)}" ${o(1.3)}/><ellipse cx="5" cy="-10" rx="5" ry="5.5" fill="${C(ob.c)}" ${o(1.3)}/>
        <ellipse cx="-4" cy="-4" rx="3.4" ry="3.2" fill="${C(ob.c)}" ${o(1.2)}/><ellipse cx="4" cy="-4" rx="3.4" ry="3.2" fill="${C(ob.c)}" ${o(1.2)}/>
        <circle cx="-5" cy="-11" r="1.5" fill="var(--sd-hi)"/><circle cx="5" cy="-11" r="1.5" fill="var(--sd-hi)"/>
        <rect x="-1.1" y="-14" width="2.2" height="12" rx="1.1" fill="${INK}"/><path d="M0 -14l-2.5-3M0 -14l2.5-3" ${o(1)}/>`;
    },
    log(ob) {
      return `<rect x="-24" y="-18" width="44" height="17" rx="8" fill="var(--sd-wood)" ${o(1.8)}/><path d="M-18 -11h14M-12 -6h18" stroke="var(--sd-wood-2)" stroke-width="1.6" stroke-linecap="round"/>
        <ellipse cx="18" cy="-9.5" rx="6" ry="8.5" fill="var(--sd-wood-end)" ${o(1.8)}/><ellipse cx="18" cy="-9.5" rx="3" ry="4.5" fill="none" stroke="var(--sd-wood-2)" stroke-width="1.3"/>
        <path d="M-8 -18q2-5 6-4" fill="none" stroke="var(--sd-leaf-s)" stroke-width="2" stroke-linecap="round"/>`;
    },
  };

  function obj(ob, season) {
    const k = ob.s, sx = ob.f ? -k : k;
    const tr = `translate(${ob.x} ${ob.y})${ob.r ? ` rotate(${ob.r})` : ''} scale(${sx} ${k})`;
    return `<g class="sd-o sd-${ob.t}" transform="${tr}">${(D[ob.t] || (() => ''))(ob, season)}</g>`;
  }

  /* ---------- sfondi ---------- */
  function sky(pz) {
    const { sun, stars } = pz.deco || { sun: { x: 340, y: 34 }, stars: [] };
    const night = pz.time === 'night';
    let s = `<rect width="400" height="280" fill="var(--sd-sky)"/><rect y="${pz.theme === 'city' ? 120 : 92}" width="400" height="70" fill="var(--sd-sky-2)"/>`;
    s += stars.map(([x, y, r]) => `<path d="M${x} ${y - r * 2}Q${x} ${y} ${x + r * 2} ${y}Q${x} ${y} ${x} ${y + r * 2}Q${x} ${y} ${x - r * 2} ${y}Q${x} ${y} ${x} ${y - r * 2}Z" fill="var(--sd-star)"/>`).join('');
    if (night) s += `<g transform="translate(${sun.x} ${sun.y})"><circle r="14" fill="var(--sd-moon)"/><circle cx="7" cy="-5" r="12" fill="var(--sd-sky)"/><circle cx="-6" cy="4" r="1.6" fill="var(--sd-moon-2)"/></g>`;
    else s += `<g transform="translate(${sun.x} ${sun.y})">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -19v-6" transform="rotate(${a})" stroke="var(--sd-sun)" stroke-width="3.4" stroke-linecap="round"/>`).join('')}
      <circle r="14" fill="var(--sd-sun)" ${o(1.6)}/><circle cx="-4.5" cy="-1.5" r="1.3" fill="${INK}"/><circle cx="4.5" cy="-1.5" r="1.3" fill="${INK}"/><path d="M-2 3q2 2 4 0" fill="none" ${o(1.2)}/>
      <ellipse cx="-8" cy="2.5" rx="2.4" ry="1.4" fill="var(--sd-blush)"/><ellipse cx="8" cy="2.5" rx="2.4" ry="1.4" fill="var(--sd-blush)"/></g>`;
    return s;
  }
  function cityBack(pz) {
    // skyline lontano (sempre uguale) + marciapiede + strada
    const far = [[0, 150, 36], [30, 128, 30], [58, 156, 40], [96, 138, 28], [122, 118, 34], [154, 150, 42], [194, 132, 30], [222, 146, 36], [256, 124, 30], [284, 152, 40], [322, 136, 32], [352, 120, 28], [378, 148, 30]];
    return `${far.map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${200 - y}" rx="4" fill="var(--sd-far)"/>`).join('')}
      <rect y="196" width="400" height="28" fill="var(--sd-walk)"/><path d="M0 200H400" stroke="var(--sd-walk-2)" stroke-width="2"/>
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 30 + 12} 201v20" stroke="var(--sd-walk-2)" stroke-width="1.4"/>`).join('')}
      <rect y="222" width="400" height="58" fill="var(--sd-road)"/><rect y="222" width="400" height="4" fill="var(--sd-curb)"/>
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 48 + 6}" y="253" width="26" height="4" rx="2" fill="var(--sd-lane)"/>`).join('')}`;
  }
  function forestBack() {
    return `<path d="M0 132Q50 96 110 120T230 112T340 108T400 118V160H0Z" fill="var(--sd-hill)"/>
      <path d="M0 146Q70 124 150 140T300 132T400 140V170H0Z" fill="var(--sd-hill-2)"/>
      <rect y="150" width="400" height="130" fill="var(--sd-grass)"/>
      <path d="M0 152Q100 144 200 152T400 150" fill="none" stroke="var(--sd-grass-2)" stroke-width="3"/>
      ${[[24, 200], [70, 262], [132, 186], [180, 246], [246, 270], [300, 194], [352, 238], [388, 268], [96, 228], [220, 206]].map(([x, y]) =>
        `<path d="M${x - 5} ${y}q2-6 3-8q1 5 2 8q1-5 4-7q-1 4 0 7" fill="var(--sd-grass-2)"/>`).join('')}`;
  }

  function scene(pz, side) {
    const objs = side ? pz.b : pz.a;
    const bg = sky(pz) + (pz.theme === 'city' ? cityBack(pz) : forestBack(pz));
    return bg + HH.spot.drawOrder(objs).map((ob) => obj(ob, pz.season)).join('');
  }

  HH.spotArt = { scene, obj, sky, face, ICON, D };
})(typeof globalThis !== 'undefined' ? globalThis : window);
