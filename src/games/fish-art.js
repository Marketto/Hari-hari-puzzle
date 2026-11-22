/* Hari Fishing — testi di riserva, forme dei pesci (condivise da 3D e SVG), disegni SVG (pesci, card, icone), espressioni di Hari nel riquadro, tutorial.
 * Solo token CSS --fsh-*. Si carica prima di fish-ui.js, che legge HH.fishArtKit.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const EN = {
    fi_board: 'Fishing: cast, reel in and let the fish go', fi_cast: 'Cast', fi_pull: 'Reel in', fi_slackb: 'Let out',
    fi_cast_drag: 'Drag down and let go to cast', fi_cast_tilt: 'Swing the phone back, then flick it forward',
    fi_wait: 'Wait for a bite…', fi_bite: 'A bite! Pull!', fi_early: 'Too early! The fish swam off', fi_missed: 'It got away… wait for the next one',
    fi_snap: 'The line snapped!', fi_slack: 'Too loose: the fish slipped off', fi_fight: 'Keep the line in the green!',
    fi_tiltHint: 'Tip the phone up to reel in, down to let out', fi_calib: 'Hold still…', fi_far: 'Cast farther for rare fish!',
    fi_tension: 'Line tension', fi_motion: 'Enable motion', fi_nomotion: 'Motion sensors unavailable: use the buttons',
    fi_tilt: 'Tilt to reel', fi_buttons: 'Buttons', fi_turn: 'Hold your phone upright',
    fi_new: 'New!', fi_photo: 'Photo', fi_release: 'Let it go', fi_photoOk: 'Photo saved in the album!', fi_bye: 'Bye bye, little fish!',
    fi_album: 'Album', fi_unseen: 'Not caught yet', fi_goal: 'Catch {n} fish', fi_target: 'Special catch: {sp}',
    fi_sp_minnow: 'Minnow', fi_sp_goldfish: 'Goldfish', fi_sp_catfish: 'Catfish', fi_sp_koi: 'Koi', fi_sp_clown: 'Clownfish',
    fi_sp_puffer: 'Pufferfish', fi_sp_tuna: 'Tuna', fi_sp_golden: 'Golden fish',
    fi_lure: 'Move the bait slowly to attract the fish', fi_scared: 'Too fast! The fish got scared', fi_rare: 'A rare fish! Gently, be patient…',
    // già tradotte (Hari Rally, Hari Parade, comuni)
    ry_nogl: 'This game needs 3D graphics (WebGL).', pa_left: 'Left', pa_right: 'Right', pa_paused: 'Paused', pa_tap: 'Tap to continue', pa_pause: 'Pause', best: 'Best', er_close: 'Close',
  };
  const L = (k) => label(k, EN[k]);
  const spName = (id) => L('fi_sp_' + id);

  /* ---------- forme dei pesci (condivise da 3D e SVG) ---------- */
  const FB = {
    // d = metà lunghezza / altezza / larghezza del corpo (m); xm = punto più alto (−1 peduncolo … 1 muso); ped / wp =
    // altezza / larghezza del peduncolo; nose = superellisse del muso (2 ellisse, >2 più tondo); top / bot = schiena /
    // pancia; tl / th = lunghezza / metà altezza della coda e pl / pw delle pettorali (× altezza del corpo); ex / ey / ek = occhio
    minnow: { d: [0.3, 0.112, 0.078], xm: 0.12, ped: 0.24, wp: 0.42, nose: 1.8, top: 1, bot: 0.95, tail: 'fork', tl: 1.3, th: 1.2, pl: 0.8, pw: 0.42, ex: 0.56, ey: 0.16, ek: 1 },
    goldfish: { d: [0.235, 0.19, 0.13], xm: 0.1, ped: 0.3, wp: 0.42, nose: 2.1, top: 1.06, bot: 1, tail: 'veil2', tl: 1.5, th: 1.0, pl: 0.8, pw: 0.42, ex: 0.5, ey: 0.16, ek: 1 },
    catfish: { d: [0.42, 0.145, 0.15], xm: 0.05, ped: 0.32, wp: 0.3, wxm: 0.45, nose: 2.6, top: 1, bot: 0.8, tail: 'round', tl: 1.1, th: 0.9, pl: 0.8, pw: 0.42, ex: 0.62, ey: 0.3, ek: 0.8 },
    koi: { d: [0.4, 0.145, 0.12], xm: 0.18, ped: 0.32, wp: 0.42, nose: 1.9, top: 1.05, bot: 0.92, tail: 'veil', tl: 1.6, th: 1.25, pl: 1.05, pw: 0.42, ex: 0.62, ey: 0.16, ek: 1 },
    clown: { d: [0.245, 0.155, 0.1], xm: 0.1, ped: 0.4, wp: 0.45, nose: 2.3, top: 1, bot: 1, tail: 'round', tl: 0.95, th: 0.85, pl: 0.8, pw: 0.42, ex: 0.55, ey: 0.16, ek: 1 },
    puffer: { d: [0.245, 0.23, 0.215], xm: -0.25, ped: 0.4, wp: 0.4, nose: 2.2, top: 1, bot: 1.02, tail: 'small', tl: 0.62, th: 0.55, pl: 0.6, pw: 0.36, ex: 0.48, ey: 0.2, ek: 1 },
    tuna: { d: [0.52, 0.165, 0.14], xm: 0.0, ped: 0.11, wp: 0.32, nose: 1.55, top: 1, bot: 1, tail: 'lunate', tl: 1.05, th: 2.0, pl: 1.5, pw: 0.3, ex: 0.64, ey: 0.12, ek: 0.95 },
    golden: { d: [0.3, 0.19, 0.13], xm: 0.12, ped: 0.3, wp: 0.42, nose: 2.0, top: 1.05, bot: 0.98, tail: 'veil2', tl: 1.65, th: 1.1, pl: 0.8, pw: 0.42, ex: 0.55, ey: 0.16, ek: 1 },
  };
  // colori delle pinne (1, 2, 3 = --fsh-<specie>-1/2/3): coda, dorsale/anale/ventrali, pettorali
  const FCOL = { minnow: '111', goldfish: '222', catfish: '333', koi: '222', clown: '111', puffer: '333', tuna: '111', golden: '222' };
  // dorsale e anale: [chiave, u0, u1 (x della base, −1 … 1), altezza (× altezza del corpo), contorno [u lungo la base, v
  // altezza], colore ('f' = pinne), sotto (anale), spessore, bordo]
  const RIDGES = {
    minnow: [['dor', -0.05, 0.25, 0.9, [[1, 0.1], [0.45, 1], [0.25, 0.9], [0.05, 0.15]], 'f'], ['ana', -0.6, -0.32, 0.6, [[1, 0.1], [0.5, 1], [0.15, 0.8], [0, 0.1]], 'f', 1]],
    goldfish: [['dor', -0.35, 0.35, 0.95, [[1, 0.15], [0.75, 0.9], [0.45, 1.05], [0.15, 0.85], [-0.08, 0.4], [0, 0.05]], 'f'], ['ana', -0.65, -0.38, 0.62, [[1, 0.1], [0.55, 1], [0.1, 0.9], [0, 0.1]], 'f', 1]],
    catfish: [['dor', 0.12, 0.38, 0.75, [[1, 0.1], [0.6, 1], [0.3, 0.8], [0, 0.1]], 'f'], ['ana', -0.86, -0.12, 0.45, [[1, 0.1], [0.9, 0.8], [0.5, 1], [0.1, 0.95], [0, 0.1]], 'f', 1]],
    koi: [['dor', -0.5, 0.35, 0.62, [[1, 0.15], [0.86, 0.9], [0.6, 0.78], [0.3, 0.72], [0.05, 0.6], [-0.06, 0.2]], 'f'], ['ana', -0.62, -0.4, 0.55, [[1, 0.1], [0.5, 1], [0.1, 0.85], [0, 0.1]], 'f', 1]],
    // pagliaccio: dorsale a due lobi (spinoso davanti, morbido dietro), pinne arancioni bordate di scuro
    clown: [['dor', -0.62, 0.35, 0.72, [[1, 0.1], [0.9, 0.62], [0.8, 0.78], [0.68, 0.62], [0.57, 0.52], [0.5, 0.45], [0.38, 0.95], [0.18, 1.02], [0.02, 0.62], [-0.04, 0.15]], '1', 0, 0.013, '3'],
      ['ana', -0.58, -0.18, 0.7, [[1, 0.1], [0.7, 0.9], [0.35, 1], [0.05, 0.7], [0, 0.1]], '1', 1, 0.013, '3']],
    puffer: [['dor', -0.78, -0.45, 0.42, [[1, 0.1], [0.6, 1], [0.15, 0.85], [0, 0.1]], 'f'], ['ana', -0.78, -0.45, 0.4, [[1, 0.1], [0.6, 1], [0.15, 0.85], [0, 0.1]], 'f', 1]],
    // tonno: prima dorsale bassa, seconda dorsale e anale gialle a falce
    tuna: [['dor', 0.05, 0.38, 0.55, [[1, 0.1], [0.78, 1], [0.35, 0.45], [0, 0.1]], '1'], ['dor2', -0.32, -0.1, 1.0, [[1, 0.1], [0.65, 0.6], [0.1, 1], [-0.15, 1.08], [0.15, 0.45], [0, 0.05]], '3'],
      ['ana', -0.36, -0.14, 0.95, [[1, 0.1], [0.65, 0.6], [0.1, 1], [-0.15, 1.08], [0.15, 0.45], [0, 0.05]], '3', 1]],
    golden: [['dor', -0.3, 0.35, 0.95, [[1, 0.15], [0.75, 0.95], [0.45, 1.08], [0.15, 0.85], [-0.08, 0.4], [0, 0.05]], 'f'], ['ana', -0.66, -0.38, 0.62, [[1, 0.1], [0.55, 1], [0.1, 0.9], [0, 0.1]], 'f', 1]],
  };
  // pettorali: contorno (x verso la coda, −1 = punta; y × larghezza)
  const PEC = {
    paddle: [[0.01, 0.3], [-0.35, 0.85], [-0.8, 0.8], [-1, 0.2], [-0.85, -0.45], [-0.4, -0.6], [0.01, -0.3]],
    sickle: [[0.01, 0.35], [-0.5, 0.42], [-1, 0], [-0.5, -0.3], [0.01, -0.35]],
  };
  // profilo (unità: x −1 peduncolo … 1 muso; 1 = altezza/larghezza massima)
  function fProf(F, d) {
    const hx = (x, xm, ped, n) => {
      if (x >= xm) { const u = Math.min(1, (x - xm) / (1 - xm)); return Math.pow(Math.max(0, 1 - Math.pow(u, n)), 1 / n); }
      const t = Math.min(1, (xm - x) / (xm + 1));
      return ped + (1 - ped) * (0.5 + 0.5 * Math.cos(Math.PI * t));
    };
    const [lx, ly, lz] = d || F.d, wxm = F.wxm != null ? F.wxm : F.xm;
    const P = {
      h: (x) => hx(x, F.xm, F.ped, F.nose), w: (x) => hx(x, wxm, F.wp, F.nose),
      // punto della superficie (x in unità, th angolo attorno all'asse: π/2 schiena, −π/2 pancia, 0 fianco +z)
      at: (x, th, off = 0, out) => {
        const s = Math.sin(th), k = 1 + off, r = out || [0, 0, 0];
        r[0] = x * lx; r[1] = k * P.h(x) * ly * s * (s >= 0 ? F.top : F.bot); r[2] = k * P.w(x) * lz * Math.cos(th);
        return r;
      },
      top: (x) => P.h(x) * ly * F.top, bot: (x) => -P.h(x) * ly * F.bot,
    };
    return P;
  }
  // contorno simmetrico (metà superiore dalla radice al punto sull'asse, poi la metà inferiore speculare)
  const symm = (up) => up.concat(up.slice(0, -1).reverse().map(([x, y]) => [x, -y]));
  const TAILS = {
    fork: [[0.02, 1], [-0.3, 0.5], [-0.75, 0.9], [-1, 1], [-0.82, 0.55], [-0.62, 0.18], [-0.55, 0]],
    lunate: [[0.02, 1], [-0.15, 0.35], [-0.45, 0.75], [-1, 1], [-0.62, 0.55], [-0.4, 0.2], [-0.36, 0]],
    round: [[0.02, 1], [-0.25, 0.55], [-0.6, 0.92], [-0.88, 0.8], [-1, 0.42], [-1.03, 0]],
    veil: [[0.02, 1], [-0.25, 0.55], [-0.6, 0.95], [-0.92, 1], [-1.04, 0.68], [-0.9, 0.32], [-0.8, 0]],
  };

  /* ---------- disegni SVG (colori solo da token --fsh-*) ---------- */
  const f1 = (n) => +(+n).toFixed(1);
  const o = (w = 2) => `stroke="var(--fsh-ink)" stroke-width="${f1(w)}" stroke-linejoin="round" stroke-linecap="round"`;
  // pesce kawaii di profilo, verso destra (testa a destra, coda a sinistra), centrato in (cx, cy), lungo circa 70·k.
  // Stesse forme del 3D (FB, TAILS, RIDGES, PEC): corpo dal profilo (muso pieno, peduncolo stretto), coda che si
  // allarga dal peduncolo verso l'esterno, dorsale, anale, ventrale e pettorale. rx / ry = metà lunghezza / altezza.
  const FISH = {
    minnow: { rx: 26, ry: 10.5 }, goldfish: { rx: 20, ry: 16, k: 0.86 }, catfish: { rx: 28, ry: 12.5, k: 0.94 }, koi: { rx: 28, ry: 12, k: 0.96 },
    clown: { rx: 21, ry: 14 }, puffer: { rx: 19, ry: 18, k: 0.94 }, tuna: { rx: 31, ry: 11.5, k: 0.94 }, golden: { rx: 23, ry: 15, k: 0.88 },
  };
  const pth = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
  // contorno morbido: curve quadratiche tra i punti medi (angoli arrotondati, kawaii)
  const soft = (pts) => {
    const n = pts.length, m = (a, b) => `${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2)}`;
    let d = `M${m(pts[n - 1], pts[0])}`;
    for (let i = 0; i < n; i++) d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${m(pts[i], pts[(i + 1) % n])}`;
    return d + 'Z';
  };
  function fishArt(sp, cx = 60, cy = 40, k = 1, flip = false) {
    const F = FB[sp] || FB.minnow, V = FISH[sp] || FISH.minnow, { rx, ry } = V, P = fProf(F, [rx, ry, 1]);
    const c = (n) => `var(--fsh-${sp}-${n})`, fc = FCOL[sp] || '222';
    const col = (x) => c(x === 'f' ? fc[1] : x);
    const L = F.tl * ry, Hh = F.th * ry, a = F.ped * ry * 0.85, x0 = -rx + 1.2;
    const Y = (x) => -P.top(x), B = (x) => -P.bot(x);   // y del dorso e del ventre (SVG: y in giù)
    // corpo
    const N = 24, up = [], dn = [];
    for (let i = 0; i <= N; i++) { const x = -Math.cos(Math.PI * i / N); up.push([x * rx, Y(x)]); dn.push([x * rx, B(x)]); }
    const body = pth(up.concat(dn.reverse()));
    // coda (dal peduncolo verso l'esterno)
    const tp = (shape, s = 1) => symm(TAILS[shape].map(([x, y], i) => [x0 + x * L * s, i === 0 ? a : y * Hh * s]));
    let tail = `<path d="${soft(tp(F.tail === 'veil2' ? 'veil' : F.tail === 'small' ? 'round' : F.tail))}" fill="${c(fc[0])}" ${o(2)}/>`;
    if (F.tail === 'veil2') tail = `<g transform="rotate(14 ${f1(x0)} 0)">${tail}</g><g transform="rotate(-9 ${f1(x0)} 0)">${tail}</g>`;
    if (F.tail === 'lunate' || F.tail === 'fork') tail = `<path d="${pth(tp(F.tail))}" fill="${c(fc[0])}" ${o(2)}/>`;
    // dorsale e anale (dietro al corpo), bordo scuro per il pagliaccio
    const ridges = (RIDGES[sp] || []).map(([, u0, u1, h, pts, cc, down, , bd]) => {
      const X = (u) => u0 + (u1 - u0) * u, yS = (u) => { const x = Math.max(-1, Math.min(1, X(u))); return down ? B(x) : Y(x); };
      const sg = down ? 1 : -1, hh = h * ry, sink = 0.3 * hh;
      const poly = [[X(1) * rx, yS(1) - sg * sink]].concat(pts.map(([u, v]) => [X(u) * rx, yS(u) + sg * v * hh]), [[X(0) * rx, yS(0) - sg * sink]]);
      return `<path d="${soft(poly)}" fill="${col(cc)}" ${o(bd ? 2.2 : 1.6)}/>`;
    }).join('');
    // ventrale (sotto la pancia, verso dietro)
    const vx = (sp === 'catfish' ? -0.05 : 0.02) * rx, vy = B(vx / rx) - 1.5;
    const vent = sp === 'puffer' || sp === 'tuna' ? '' : `<path d="${soft([[vx + 2, vy - 1], [vx - 0.45 * F.pl * ry, vy + 0.7 * F.pw * ry], [vx - 0.85 * F.pl * ry, vy + 0.85 * F.pw * ry], [vx - 0.7 * F.pl * ry, vy + 0.3 * F.pw * ry], [vx - 2, vy - 1]])}" fill="${col('f')}" ${o(1.4)}/>`;
    // pancia più chiara (non nel pagliaccio)
    let belly = '';
    if (sp !== 'clown') {
      const bp = [];
      for (let i = 0; i <= 14; i++) { const x = -0.84 + (i / 14) * 1.74; bp.push([x * rx, B(x)]); }
      for (let i = 14; i >= 0; i--) { const x = -0.84 + (i / 14) * 1.74; bp.push([x * rx, B(x) * 0.22 + 1.5]); }
      belly = `<path d="${soft(bp)}" fill="${c(2)}"/>`;
    }
    // dettagli sul corpo (dentro la sagoma)
    let deco = '', back = '', front = '';
    if (sp === 'minnow') deco = `<path d="M${f1(-0.78 * rx)} 0.5Q0 -2.5 ${f1(0.5 * rx)} 0" fill="none" stroke="${c(3)}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (sp === 'clown') {
      // bande bianche bordate di scuro, curve in avanti a metà fianco
      const band = (xc, hw, bend) => {
        const l = [], r = [];
        for (let i = 0; i <= 8; i++) {
          const s = -1 + i / 4, q = 1 - s * s;
          const xl = xc - hw + bend * q, xr = xc + hw + bend * q;
          l.push([xl * rx, s >= 0 ? s * Y(xl) : -s * B(xl)]); r.push([xr * rx, s >= 0 ? s * Y(xr) : -s * B(xr)]);
        }
        return l.concat(r.reverse());
      };
      deco = [[0.3, 0.075, 0.07], [-0.12, 0.1, 0.1], [-0.8, 0.06, 0.02]].map(([xc, hw, bend]) => `<path d="${pth(band(xc, hw + 0.04, bend))}" fill="${c(3)}"/><path d="${pth(band(xc, hw, bend))}" fill="${c(2)}"/>`).join('');
    }
    if (sp === 'koi') deco = `<path d="M${f1(0.3 * rx)} ${f1(Y(0.3) + 0.5)}q6 -1 9 2q-1 5 -7 4q-4 -1 -2 -6Z" fill="${c(3)}"/><ellipse cx="-4" cy="${f1(Y(-0.15) + 4)}" rx="7.5" ry="3.6" fill="${c(3)}"/><ellipse cx="-16" cy="${f1(Y(-0.57) + 3.4)}" rx="4" ry="2.4" fill="${c(3)}"/><ellipse cx="8" cy="3.4" rx="4" ry="2.6" fill="${c(3)}"/>`;
    if (sp === 'catfish') front = `<path d="M${f1(rx - 2)} 2q7 1 10 7M${f1(rx - 3)} 3q9 -2 12 2M${f1(rx - 5)} 6q3 3 3 8" fill="none" ${o(1.6)}/>`;
    if (sp === 'koi') front = `<path d="M${f1(rx - 2)} 3q6 3 7 9" fill="none" ${o(1.4)}/>`;
    if (sp === 'puffer') back = Array.from({ length: 11 }, (_, i) => {
      const x = 0.78 - i * 0.155, up2 = i % 2 === 0, yy = up2 ? Y(x) : B(x), dir = up2 ? -1 : 1;
      return `<path d="M${f1(x * rx - 1.6)} ${f1(yy - dir * 1.5)}L${f1(x * rx + 0.6)} ${f1(yy + dir * 4.5)}L${f1(x * rx + 1.8)} ${f1(yy - dir * 1.5)}Z" fill="${c(3)}" ${o(1.2)}/>`;
    }).join('');
    if (sp === 'tuna') back = [0, 1, 2, 3, 4].map((i) => { const x = -0.44 - i * 0.1; return `<path d="M${f1(x * rx + 1.5)} ${f1(Y(x) + 1)}l-1.5 -4 -2.4 4Z" fill="${c(3)}" ${o(0.9)}/><path d="M${f1(x * rx + 1.5)} ${f1(B(x) - 1)}l-1.5 4 -2.4 -4Z" fill="${c(3)}" ${o(0.9)}/>`; }).join('');
    if (sp === 'golden') front = `<path d="M${f1(0.3 * rx - 8)} ${f1(Y(0.3) + 1.5)}l2 -9 4 6 3 -8 3 8 4 -6 2 9Z" fill="${c(3)}" ${o(1.6)}/><path d="M${f1(rx + 6)} -16l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6Z" fill="var(--fsh-spark)"/>`;
    // pettorale (dietro l'opercolo, verso dietro e in giù)
    const pl = F.pl * ry * 0.85, pw = F.pw * ry * 0.85, px = (F.ex - 0.32) * rx, py = Math.min(B((F.ex - 0.32)) - 3, ry * 0.25);
    const pec = `<g transform="translate(${f1(px)} ${f1(py)}) rotate(-24)"><path d="${soft((sp === 'tuna' ? PEC.sickle : PEC.paddle).map(([x, y]) => [x * pl, y * pw]))}" fill="${c(fc[2])}" ${o(1.4)}/></g>`;
    // occhio, guancia, bocca
    const ex = F.ex * rx, ey = -F.ey * ry, er = 4.6 * (F.ek || 1) * (ry < 12 ? 0.92 : 1);
    const mx = rx - 2.2, my = Math.min(B(1 - 2.2 / rx) * 0.45, 3.4);
    return `<g transform="translate(${cx} ${cy}) scale(${+((flip ? -k : k) * (V.k || 1)).toFixed(3)} ${+(k * (V.k || 1)).toFixed(3)}) translate(${f1(L / 2 - 2)} 0)">${tail}${ridges}${vent}${back}
      <path d="${body}" fill="${c(1)}"/>${belly}${deco}<path d="${body}" fill="none" ${o(2.2)}/>${pec}${front}
      <circle cx="${f1(ex)}" cy="${f1(ey)}" r="${f1(er)}" fill="var(--fsh-eye)"/><circle cx="${f1(ex + er * 0.3)}" cy="${f1(ey - er * 0.35)}" r="${f1(er * 0.4)}" fill="var(--fsh-hi)"/><circle cx="${f1(ex - er * 0.26)}" cy="${f1(ey + er * 0.3)}" r=".8" fill="var(--fsh-hi)"/>
      <ellipse cx="${f1(ex - 3)}" cy="${f1(ey + er + 2.6)}" rx="3.4" ry="2" fill="var(--fsh-blush)"/><path d="M${f1(mx)} ${f1(my - 1)}q-2 1.6 0 3.2" fill="none" ${o(1.3)}/></g>`;
  }
  const fishSvg = (sp, cls = 'fi-pic') => `<svg class="${cls}" viewBox="0 0 120 80" aria-hidden="true">${fishArt(sp, 62, 42, 1.25)}</svg>`;
  const STAR = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6l-5.6 3.2 1.3-6.2L3 9.3l6.3-.7Z" fill="${on ? 'var(--fsh-spark)' : 'var(--line-2)'}" ${on ? o(1.2) : ''}/></svg>`;
  const stars = (n) => `<span class="fi-stars">${[1, 2, 3, 4].map((i) => STAR(i <= n)).join('')}</span>`;
  // Hari da dietro, seduto, col cappellino (per card e tutorial)
  const hariBack = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">
    ${Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.05 + i * 0.1125), r = 16; const px = -Math.cos(a) * r, py = -Math.sin(a) * r * 0.9 + 2; return `<path d="M${f1(px * 0.7)} ${f1(py * 0.7)}L${f1(px * 1.32)} ${f1(py * 1.32)}L${f1(px * 0.7 + 5 * Math.sin(a))} ${f1(py * 0.7 + 3)}Z" fill="var(--fsh-quill-2)" ${o(1.2)}/>`; }).join('')}
    <ellipse cx="0" cy="2" rx="16" ry="14" fill="var(--fsh-quill)" ${o(1.8)}/>
    <ellipse cx="-11" cy="-9" rx="4" ry="4" fill="var(--fsh-ear)" ${o(1.4)}/><ellipse cx="11" cy="-9" rx="4" ry="4" fill="var(--fsh-ear)" ${o(1.4)}/>
    <ellipse cx="0" cy="-12" rx="17" ry="4" fill="var(--fsh-hat)" ${o(1.6)}/><path d="M-8 -13Q-8 -24 0 -24Q8 -24 8 -13Z" fill="var(--fsh-hat)" ${o(1.6)}/><path d="M-8 -15.5h16" stroke="var(--fsh-band)" stroke-width="3"/>
    <ellipse cx="9" cy="10" rx="4" ry="3.4" fill="var(--fsh-paw)" ${o(1.2)}/></g>`;
  const waterBand = (y) => `<rect x="0" y="${y}" width="120" height="${90 - y}" fill="var(--fsh-water)"/>
    <path d="M6 ${y + 8}h18M40 ${y + 14}h26M82 ${y + 9}h22M18 ${y + 26}h30M70 ${y + 30}h24" stroke="var(--fsh-water-2)" stroke-width="2.6" stroke-linecap="round"/>`;
  const sky = () => `<rect width="120" height="90" fill="var(--fsh-sky-2)"/><rect width="120" height="22" fill="var(--fsh-sky-1)" opacity=".55"/>
    <circle cx="96" cy="15" r="8" fill="var(--fsh-sun)" ${o(1.2)}/>
    <path d="M-4 48Q20 30 44 46Q66 28 92 44Q108 34 124 46V50H-4Z" fill="var(--fsh-hill)" ${o(1.4)}/>`;
  const dock = () => `<path d="M0 66L36 60L40 90H0Z" fill="var(--fsh-wood)" ${o(1.6)}/><path d="M2 72L37 66M3 79L38 73M4 86L39 80" stroke="var(--fsh-wood-2)" stroke-width="1.6"/>
    <rect x="33" y="60" width="5" height="22" fill="var(--fsh-post)" ${o(1.2)}/>`;
  const bobber = (x, y, cls = 'fi-tut-bob') => `<g class="${cls}"><g transform="translate(${x} ${y})"><path d="M-4 0A4 4 0 0 1 4 0Z" fill="var(--fsh-bob-1)" ${o(1.2)}/><path d="M-4 0A4 4 0 0 0 4 0Z" fill="var(--fsh-bob-2)" ${o(1.2)}/><path d="M0 -4v-4" ${o(1.2)}/></g></g>`;
  const ripple = (x, y) => `<ellipse cx="${x}" cy="${y + 1}" rx="10" ry="2.6" fill="none" stroke="var(--fsh-foam)" stroke-width="1.6"/>`;
  const scene = (body) => `<svg viewBox="0 0 120 90" aria-hidden="true">${sky()}${waterBand(48)}${body}</svg>`;
  const art = () => scene(`${ripple(88, 60)}<path d="M36 50Q60 0 74 16" fill="none" stroke="var(--fsh-rod)" stroke-width="2.6" stroke-linecap="round"/><path d="M74 16Q84 34 88 58" fill="none" stroke="var(--fsh-line)" stroke-width="1"/>
    ${bobber(88, 60, '')}${dock()}${hariBack(24, 56, 1)}
    <g transform="rotate(-24 104 46)">${fishArt('goldfish', 104, 46, 0.42)}</g><path d="M96 58q-3 -4 -1 -8M112 58q3 -4 1 -8" fill="none" stroke="var(--fsh-foam)" stroke-width="2" stroke-linecap="round"/>`);

  /* ---------- Hari nel riquadro: espressioni (SVG 100×100, stesso stile della mascotte, colori solo da --fsh-*) ----------
   * wait concentrato · curious curioso (?) · surprised sorpreso (!) · effort sforzo (guance gonfie, denti stretti, sudore)
   * worried preoccupato · happy felice · sad deluso (lacrima) · win vittoria (stelline) · wow stupito (occhi a stella) */
  const star4 = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
  const drop = (x, y, k = 1, cls = 'fx-drop') => `<g class="${cls}"><path d="M${x} ${y - 6 * k}C${x + 3.4 * k} ${y - 1 * k} ${x + 4.4 * k} ${y + 2.6 * k} ${x} ${y + 4.4 * k}C${x - 4.4 * k} ${y + 2.6 * k} ${x - 3.4 * k} ${y - 1 * k} ${x} ${y - 6 * k}Z" fill="var(--fsh-sweat)" ${o(1.3)}/><ellipse cx="${x - 1.2 * k}" cy="${y + 0.6 * k}" rx="${f1(0.9 * k)}" ry="${f1(1.6 * k)}" fill="var(--fsh-hi)" opacity=".8"/></g>`;
  const FACE_Q = (() => {
    let d = '';
    for (let i = 0; i < 17; i++) {
      const a = Math.PI * (0.92 + (i / 16) * 1.16), r0 = 30, r1 = 44 + (i % 2) * 3;
      const p = (r, da) => `${f1(50 + Math.cos(a + da) * r)} ${f1(58 + Math.sin(a + da) * r * 0.92)}`;
      d += `M${p(r0, -0.16)}L${p(r1, 0)}L${p(r0, 0.16)}Z`;
    }
    return d;
  })();
  function hariFace(m) {
    const E = 'var(--fsh-eye)', I = 'var(--fsh-ink)';
    const eye = (cx, cy, rx = 6, ry = 7.5, dx = 0, dy = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${E}"/><circle cx="${f1(cx + 2 + dx)}" cy="${f1(cy - 3 + dy)}" r="${f1(rx * 0.4)}" fill="var(--fsh-hi)"/><circle cx="${f1(cx - 2 + dx)}" cy="${f1(cy + 3 + dy)}" r="1.1" fill="var(--fsh-hi)"/>`;
    const happyEye = (cx, w = 3.2) => `<path d="M${cx - 6.5} ${60}q6.5 -8.5 13 0" fill="none" stroke="${E}" stroke-width="${w}" stroke-linecap="round"/>`;
    const brow = (d) => `<path d="${d}" fill="none" stroke="${I}" stroke-width="2.6" stroke-linecap="round"/>`;
    const puffed = m === 'effort';
    let eyes = '', brows = '', mouth = '', extra = '', cheeks = puffed ? 'rx="9.5" ry="6.4"' : 'rx="6.4" ry="3.8"';
    switch (m) {
      case 'curious':
        eyes = eye(38, 58, 6, 7.5, 1, 0) + eye(62, 57, 7, 8.6, 1, 0);
        brows = brow('M32 47q5 -1.6 10 0') + brow('M56 44q6 -4.6 12 -1');
        mouth = '<ellipse cx="53" cy="76" rx="2.6" ry="3" fill="var(--fsh-nose)"/>';
        extra = `<g class="fx-bob"><text x="86" y="30" text-anchor="middle" font-size="22" font-weight="900" fill="var(--fsh-spark)" stroke="${I}" stroke-width="1.6" paint-order="stroke">?</text></g>`;
        break;
      case 'surprised':
        eyes = `<circle cx="38" cy="57" r="8" fill="${E}"/><circle cx="62" cy="57" r="8" fill="${E}"/><circle cx="40.5" cy="54" r="3.2" fill="var(--fsh-hi)"/><circle cx="64.5" cy="54" r="3.2" fill="var(--fsh-hi)"/>`;
        brows = brow('M30 44q8 -6 15 -1') + brow('M55 43q7 -5 15 1');
        mouth = `<ellipse cx="50" cy="77" rx="5" ry="6" fill="var(--fsh-nose)" ${o(1.4)}/><ellipse cx="50" cy="80" rx="3" ry="2" fill="var(--fsh-blush)"/>`;
        extra = `<g class="fx-bob"><text x="87" y="32" text-anchor="middle" font-size="26" font-weight="900" fill="var(--fsh-hot)" stroke="${I}" stroke-width="1.8" paint-order="stroke">!</text></g>`;
        break;
      case 'effort':
        eyes = `<path d="M32 53l8 4.6-8 4.6M68 53l-8 4.6 8 4.6" fill="none" stroke="${E}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
        brows = brow('M30 46l11 3.5') + brow('M70 46l-11 3.5');
        mouth = `<rect x="40.5" y="71.5" width="19" height="8.5" rx="3.4" fill="var(--fsh-hi)" ${o(1.6)}/><path d="M41 75.8h18M46.8 72v8M53.2 72v8" stroke="${I}" stroke-width="1.2"/>`;
        extra = drop(84, 40, 1.1) + `<g class="fx-drop" style="animation-delay:-.5s">${drop(15, 44, 0.9, '')}</g>`;
        break;
      case 'worried':
        eyes = eye(38, 59, 5.4, 6.6, 0, 1) + eye(62, 59, 5.4, 6.6, 0, 1);
        brows = brow('M31 49l10 -4.5') + brow('M69 49l-10 -4.5');
        mouth = `<path d="M41 77q3 -3.4 6 0t6 0 6 0" fill="none" stroke="${I}" stroke-width="2.2" stroke-linecap="round"/>`;
        extra = drop(84, 42, 1);
        break;
      case 'happy':
        eyes = happyEye(38) + happyEye(62);
        mouth = `<path d="M42 72q8 10 16 0Z" fill="var(--fsh-nose)" ${o(1.4)}/><ellipse cx="50" cy="76.6" rx="3.6" ry="1.9" fill="var(--fsh-blush)"/>`;
        break;
      case 'sad':
        eyes = eye(38, 59, 5.6, 6.8, -1, 2) + eye(62, 59, 5.6, 6.8, -1, 2);
        brows = brow('M31 48l10 -5') + brow('M69 48l-10 -5');
        mouth = `<path d="M43 79q7 -7 14 0" fill="none" stroke="${I}" stroke-width="2.4" stroke-linecap="round"/>`;
        extra = drop(31, 71, 0.9);
        break;
      case 'win':
        eyes = happyEye(38, 3.8) + happyEye(62, 3.8);
        mouth = `<path d="M40 70h20q0 13 -10 13q-10 0 -10 -13Z" fill="var(--fsh-nose)" ${o(1.4)}/><ellipse cx="50" cy="79" rx="4.6" ry="2.6" fill="var(--fsh-blush)"/>`;
        extra = [[12, 26, 6], [88, 24, 7], [90, 70, 5], [10, 76, 4.5]].map(([x, y, r]) => `<path class="fx-tw" d="${star4(x, y, r)}" fill="var(--fsh-spark)" ${o(1.1)}/>`).join('');
        break;
      case 'wow':
        eyes = `<ellipse cx="38" cy="58" rx="7" ry="8.4" fill="${E}"/><ellipse cx="62" cy="58" rx="7" ry="8.4" fill="${E}"/><path d="${star4(38, 57, 5.4)}${star4(62, 57, 5.4)}" fill="var(--fsh-spark)"/><circle cx="35" cy="62" r="1.2" fill="var(--fsh-hi)"/><circle cx="59" cy="62" r="1.2" fill="var(--fsh-hi)"/>`;
        brows = brow('M31 45q7 -4 13 -1') + brow('M56 44q6 -3 13 1');
        mouth = `<ellipse cx="50" cy="77" rx="4" ry="4.6" fill="var(--fsh-nose)" ${o(1.3)}/>`;
        extra = [[12, 30, 5.5], [88, 28, 6.5], [86, 74, 4.5]].map(([x, y, r]) => `<path class="fx-tw" d="${star4(x, y, r)}" fill="var(--fsh-spark)" ${o(1)}/>`).join('');
        break;
      default: // wait: concentrato, guarda giù verso l'esca
        eyes = eye(38, 59, 6, 7.2, 1, 3) + eye(62, 59, 6, 7.2, 1, 3) + `<path d="M31 52.5h14v-2.6h-14ZM55 52.5h14v-2.6h-14Z" fill="var(--fsh-face)"/><path d="M31.5 53.2h13M55.5 53.2h13" stroke="${I}" stroke-width="2" stroke-linecap="round"/>`;
        brows = brow('M32 47h10') + brow('M58 47h10');
        mouth = `<path d="M45 76q5 2.6 10 0" fill="none" stroke="${I}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    const rx = puffed ? 35.5 : 33;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g class="fx-shake">
      <path d="${FACE_Q}" fill="var(--fsh-quill)" ${o(1.6)}/>
      <circle cx="18" cy="44" r="8" fill="var(--fsh-ear)" ${o(1.8)}/><circle cx="18" cy="44.6" r="4" fill="var(--fsh-blush)"/>
      <circle cx="82" cy="44" r="8" fill="var(--fsh-ear)" ${o(1.8)}/><circle cx="82" cy="44.6" r="4" fill="var(--fsh-blush)"/>
      <ellipse cx="50" cy="61" rx="${rx}" ry="28" fill="var(--fsh-face)" ${o(2.2)}/>
      <path d="M36 39Q42 47 50 48Q58 47 64 39Q50 33 36 39Z" fill="var(--fsh-quill)"/>
      <ellipse cx="25" cy="70" ${cheeks} fill="var(--fsh-blush)" opacity=".8"/><ellipse cx="75" cy="70" ${cheeks} fill="var(--fsh-blush)" opacity=".8"/>
      ${eyes}${brows}
      <ellipse cx="50" cy="68" rx="3.8" ry="2.7" fill="var(--fsh-nose)"/>
      ${mouth}
      <ellipse cx="50" cy="29" rx="34" ry="7.6" fill="var(--fsh-hat)" ${o(1.8)}/><path d="M34 29Q34 10 50 10Q66 10 66 29Z" fill="var(--fsh-hat)" ${o(1.8)}/>
      <path d="M34.6 23.5h30.8" stroke="var(--fsh-band)" stroke-width="4.6"/><path d="M34 29Q50 33 66 29" fill="none" ${o(1.4)}/>
      </g>${extra}</svg>`;
  }

  const PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="18" r="1.1" fill="currentColor"/></svg>';
  const TILT = '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-20 12 14)"><rect x="8" y="3" width="8" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></g><path d="M4 8q1-4 5-5M20 16q-1 4-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const HAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.4 6.5-6 6.5-2.6 0-4-1.2-5.4-3L4 14.6a1.5 1.5 0 0 1 2.3-1.9L9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.6" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.6" fill="currentColor"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14.5 9.5c1.5-1.4 3.2-1.4 4 0-.8 1.4-2.5 1.4-4 0Z" fill="currentColor"/></svg>';
  const CAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.6-2.2h5.4L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.5 2.8c0 5.4-7.5 10-7.5 10Z" fill="var(--fsh-heart)" stroke="var(--fsh-ink)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CASTI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20L15 6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M15 6q5 3 4 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/><circle cx="19" cy="17.5" r="2" fill="currentColor"/></svg>';
  const FISHI = '<svg viewBox="0 0 30 22" aria-hidden="true"><path d="M4 11L-1 5Q1 11 -1 17Z" transform="translate(4 0)" fill="var(--fsh-goldfish-2)" stroke="var(--fsh-ink)" stroke-width="1.4" stroke-linejoin="round"/><ellipse cx="17" cy="11" rx="10" ry="7" fill="var(--fsh-goldfish-1)" stroke="var(--fsh-ink)" stroke-width="1.6"/><circle cx="22" cy="9.5" r="1.8" fill="var(--fsh-eye)"/></svg>';
  const SNAPI = '<svg class="fi-ic snap" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v6l-3 3 4 3-1 6" fill="none" stroke="var(--fsh-hot)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const LOOSEI = '<svg class="fi-ic loose" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8q4 8 9 0t9 0" fill="none" stroke="var(--fsh-cold)" stroke-width="2.6" stroke-linecap="round"/><path d="M3 15q4 8 9 0t9 0" fill="none" stroke="var(--fsh-cold)" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const LEFTI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const RIGHTI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TAG_Q = '<svg viewBox="0 0 30 30" aria-hidden="true"><path d="M15 2.5C8 2.5 3 7 3 12.6c0 5.6 5 10 12 10l5 5-.6-6c4.4-1.6 7.6-5 7.6-9C27 7 22 2.5 15 2.5Z" fill="var(--fsh-ui)" stroke="var(--fsh-ink)" stroke-width="2" stroke-linejoin="round"/><text x="15" y="18.5" text-anchor="middle" font-size="15" font-weight="900" fill="var(--fsh-ink)">?</text></svg>';
  const TAG_X = '<svg viewBox="0 0 30 30" aria-hidden="true"><path d="M15 2.5C8 2.5 3 7 3 12.6c0 5.6 5 10 12 10l5 5-.6-6c4.4-1.6 7.6-5 7.6-9C27 7 22 2.5 15 2.5Z" fill="var(--fsh-hot)" stroke="var(--fsh-ink)" stroke-width="2" stroke-linejoin="round"/><text x="15" y="19" text-anchor="middle" font-size="17" font-weight="900" fill="var(--fsh-meter)" stroke="var(--fsh-ink)" stroke-width="1" paint-order="stroke">!</text></svg>';
  const TICK = '<svg class="fi-tick" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--fsh-ok)"/><path d="M7 12.5l3.3 3.3L17 9" fill="none" stroke="var(--fsh-meter)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';


  /* ---------- tutorial ---------- */
  const phoneArt = (x, y, cls) => `<g transform="translate(${x} ${y})"><g class="${cls}"><rect x="-7" y="-26" width="14" height="26" rx="3" fill="var(--card-solid)" ${o(1.4)}/><rect x="-5" y="-23" width="10" height="17" rx="1.5" fill="var(--fsh-sky-1)"/></g></g>`;
  const arrowC = (d) => `<path d="${d}" fill="none" stroke="var(--fsh-band)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 3"/>`;
  const gaugeArt = (x, y) => `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="12" height="60" rx="6" fill="var(--fsh-cold)" ${o(1.6)}/><rect x="1" y="1" width="10" height="16" rx="5" fill="var(--fsh-hot)"/><rect x="1" y="17" width="10" height="26" fill="var(--fsh-ok)"/>
    <g class="fi-tut-mark"><rect x="-3" y="46" width="18" height="5" rx="2.5" fill="var(--fsh-meter)" ${o(1.2)}/></g></g>`;
  // tutorial: l'esca sott'acqua, un pesce curioso col cuore, uno spaventato col '!'
  const uwArt = () => `<svg viewBox="0 0 120 90" aria-hidden="true"><rect width="120" height="90" fill="var(--fsh-uw-2)"/><rect width="120" height="34" fill="var(--fsh-uw-1)" opacity=".7"/>
    <path d="M0 4h120" stroke="var(--fsh-uw-top)" stroke-width="6"/><path d="M28 6L18 90M56 6L50 90M90 6L96 90" stroke="var(--fsh-ray)" stroke-width="7" opacity=".25"/>
    <path d="M0 84Q30 78 60 84T120 82V90H0Z" fill="var(--fsh-bed)" ${o(1.2)}/>
    ${[8, 14, 104, 112].map((x, i) => `<path d="M${x} 86q${i % 2 ? 5 : -5} -14 0 -26q${i % 2 ? -5 : 5} -10 0 -18" fill="none" stroke="var(--fsh-weed)" stroke-width="4" stroke-linecap="round"/>`).join('')}
    <path d="M60 4V44" stroke="var(--fsh-line)" stroke-width="1"/><circle cx="60" cy="48" r="3.4" fill="var(--fsh-bait)" ${o(1.2)}/>
    <g class="fi-tut-lure">${arrowC('M50 60h20')}</g>
    <g class="fi-tut-bob">${fishArt('goldfish', 84, 50, 0.42, true)}</g><g class="fi-tut-heart" style="animation-duration:1.6s"><path d="M84 36s-5-3-5-6.6A2.8 2.8 0 0 1 84 28a2.8 2.8 0 0 1 5 1.4c0 3.6-5 6.6-5 6.6Z" fill="var(--fsh-heart)" ${o(1.2)}/></g>
    <g transform="translate(20 66)"><g class="fi-tut-flee">${fishArt('minnow', 0, 0, 0.36, true)}</g></g>
    <text x="22" y="56" text-anchor="middle" font-size="13" font-weight="900" fill="var(--fsh-hot)" stroke="var(--fsh-ink)" stroke-width="1" paint-order="stroke">!</text></svg>`;
  const TUT = [
    { key: 'tu_fish_1', en: 'Cast the line! On a phone swing it back, then flick it forward like a fishing rod. With the mouse or a finger, drag down and let go (sideways to aim). The harder you cast, the farther the hook flies, and far away live the rarest fish.',
      art: scene(`<path d="M36 50Q46 28 54 22" fill="none" stroke="var(--fsh-rod)" stroke-width="2.6" stroke-linecap="round"/>${dock()}${hariBack(24, 56, 1)}${phoneArt(70, 40, 'fi-tut-swing')}${arrowC('M84 12Q100 18 98 38')}${bobber(96, 60)}${ripple(96, 60)}`) },
    { key: 'tu_fish_5', en: 'Under the water the fish are watching your bait. Move it slowly, with little twitches, and they come closer: “?” means curious, the heart grows when they like it. Too fast and they get scared! On a phone tilt it left and right, with the mouse point where to go, or use the arrows.',
      art: uwArt() },
    { key: 'tu_fish_2', en: 'Wait while the float bobs. A little shake is just a taste: wait. When it dives under, it’s a bite: pull right away! Tip the top of the phone up, or hold “Reel in” (arrow up or Space).',
      art: scene(`<path d="M36 50Q46 28 54 22" fill="none" stroke="var(--fsh-rod)" stroke-width="2.6" stroke-linecap="round"/><path d="M54 22Q66 40 80 58" fill="none" stroke="var(--fsh-line)" stroke-width="1"/>${dock()}${hariBack(24, 56, 1)}${bobber(80, 62, 'fi-tut-dip')}${ripple(80, 62)}<text x="80" y="44" text-anchor="middle" font-size="16" font-weight="900" fill="var(--fsh-hot)" stroke="var(--fsh-ink)" stroke-width="1" paint-order="stroke">!</text>${phoneArt(104, 40, 'fi-tut-tilt')}`) },
    { key: 'tu_fish_3', en: 'Reel in while keeping the line in the green. Too much pull (red) and the line snaps; too loose (blue) and the fish slips off. When the fish dashes away, let out a little: tip the phone down or hold “Let out” (arrow down).',
      art: scene(`${dock()}${hariBack(24, 56, 1)}<path d="M36 50Q52 22 62 30Q70 46 78 62" fill="none" stroke="var(--fsh-line)" stroke-width="1.2"/>${bobber(78, 62)}<g opacity=".55">${fishArt('goldfish', 84, 70, 0.3)}</g>${gaugeArt(100, 18)}`) },
    { key: 'tu_fish_4', en: 'Every fish you catch goes into the album: look at it, take a photo and let it go back home with a little heart. Catch the fish the level asks for, including the special one, and fill the album with every species!',
      art: `<svg viewBox="0 0 120 90" aria-hidden="true">${sky()}${waterBand(56)}<g class="fi-tut-jump">${fishArt('koi', 60, 46, 0.7)}</g><g class="fi-tut-heart"><path d="M84 30s-7-4.3-7-9.4A4 4 0 0 1 84 18a4 4 0 0 1 7 2.6c0 5.1-7 9.4-7 9.4Z" fill="var(--fsh-heart)" ${o(1.4)}/></g>
        <g transform="translate(14 14)"><rect width="26" height="20" rx="4" fill="var(--card-solid)" ${o(1.4)}/><circle cx="13" cy="11" r="5" fill="var(--fsh-water)" ${o(1.4)}/></g></svg>` },
  ];
  const RULES_EN = 'Go fishing with Hari from the jetty, at the lake or by the sea! Cast by swinging your phone like a rod (or drag with the mouse), wait for a bite, then tip the phone up to reel in and down to let out, keeping the line in the green: too tight and it snaps, too loose and the fish slips away. Every fish goes into the album and back into the water with a little heart.';

  HH.fishArtKit = { L, spName, FB, FCOL, RIDGES, PEC, fProf, symm, TAILS, f1, fishArt, fishSvg, stars, art, hariFace,
    PHONE, TILT, HAND, PAUSE, PLAY, BOOK, CAM, HEART, UP, DOWN, CASTI, FISHI, SNAPI, LOOSEI, LEFTI, RIGHTI, TAG_Q,
    TAG_X, TICK, TUT, RULES_EN
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
