/* Hari Fishing — interfaccia 3D (three.js r160, la stessa copia locale di Hari Rally: src/vendor/three.min.js,
 * scaricata solo aprendo un gioco che la usa).
 * Hari col cappellino di paglia è seduto in fondo al pontile, visto da dietro: lago tra le colline (livelli 1, 2 e pari)
 * o mare col faro (dispari dal 3); col tema scuro è sera, con la luna, le stelle e la lanterna accesa sul pontile.
 * Cel shading: MeshToonMaterial con rampa a 4 toni e contorni "a guscio rovesciato" (ShaderMaterial che gonfia la
 * geometria lungo le normali, facce posteriori, colore --fsh-ink). Acqua stilizzata in ShaderMaterial: bande di colore
 * a gradini, strisce di luce che scorrono, onde nei vertici e cerchi di schiuma attorno al galleggiante.
 * Colori solo dai token --fsh-* di fish.css (getComputedStyle → THREE.Color), temi chiaro e scuro.
 * Prestazioni da telefono: pixel ratio ≤ 1,5 (cala da solo se i fotogrammi sono lenti), 2 luci (3 di sera), niente ombre,
 * geometrie piccole e riusate, schizzi da un insieme fisso di 28 goccioline.
 *
 * Comandi
 *   Telefono coi sensori (orientamento VERTICALE: il lato lungo del telefono fa da canna, l'inclinazione del lato alto
 *   è un asse solo e non dipende da come si tiene il telefono di lato; a schermo intero si blocca in verticale e, se il
 *   telefono è girato, un velo chiede di raddrizzarlo):
 *     lancio  = telefono indietro (punta in su) e poi avanti di scatto; più è veloce lo scatto, più lontano va l'amo
 *     recupero = punta in su (più si inclina, più tira), punta in giù = allenta. La posizione neutra si tara da sola
 *                ogni volta che il galleggiante si posa (mezzo secondo fermi).
 *     iOS: "Attiva movimento" chiede i permessi (DeviceOrientationEvent/DeviceMotionEvent.requestPermission) dentro il tocco.
 *     Senza sensori, permesso negato o scegliendo i pulsanti: comandi a schermo.
 *   Mouse / tocco: trascina in giù (indietro) e lascia per lanciare (di lato per mirare); "Tira" e "Allenta" da tenere
 *     premuti (Tira tenuto a lungo tira di più). Prima del lancio "Tira" diventa "Lancia": si tiene premuto per caricare.
 *   Tastiera: ↑/W/spazio = tira (prima del lancio: tieni premuto e lascia per lanciare), ↓/S = allenta, ←/→ = mira,
 *     A = album, P/Esc = pausa.
 * Pesce preso: Hari lo guarda, si può fotografare (va nell'album con la foto) e torna in acqua con un cuoricino.
 * L'album (HH.store 'fish:album') resta tra i livelli: specie viste, quante, il più pesante, la foto.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];

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

  /* ---------- utilità ---------- */
  let rmAt = -1e9, rmVal = false;
  const reduce = () => { const n = Date.now(); if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); } return rmVal; };
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const coarse = () => !!(G.matchMedia && G.matchMedia('(pointer: coarse)').matches);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const fmtW = (g) => { try { return g < 1000 ? `${new Intl.NumberFormat(HH.i18n && HH.i18n.code).format(g)} g` : `${new Intl.NumberFormat(HH.i18n && HH.i18n.code, { maximumFractionDigits: 1 }).format(g / 1000)} kg`; } catch (e) { return g < 1000 ? `${g} g` : `${(g / 1000).toFixed(1)} kg`; } };
  const COLS = ['ink', 'eye', 'hi', 'nose', 'blush', 'quill', 'quill-2', 'face', 'ear', 'paw', 'hat', 'hat-2', 'band', 'rod', 'rod-2', 'reel', 'line', 'bob-1', 'bob-2', 'heart', 'spark',
    'wood', 'wood-2', 'post', 'rope', 'bucket', 'lamp', 'sky-1', 'sky-2', 'sun', 'cloud', 'hill', 'hill-2', 'tree', 'tree-2', 'trunk', 'reed', 'lily', 'flower', 'rock', 'sand', 'tower', 'tower-2',
    'water', 'water-2', 'water-3', 'foam', 'shadow',
    'uw-1', 'uw-2', 'uw-top', 'ray', 'bed', 'bed-2', 'weed', 'weed-2', 'coral', 'coral-2', 'bubble', 'bait', 'tiny-1', 'tiny-2',
    'crab', 'jelly', 'starfish', 'octo', 'turtle', 'turtle-2', 'seahorse', 'shell', 'pearl', 'frog', 'frog-2', 'snail', 'snail-2', 'shrimp', 'tadpole', 'sweat',
    ...['minnow', 'goldfish', 'catfish', 'koi', 'clown', 'puffer', 'tuna', 'golden'].flatMap((sp) => [sp + '-1', sp + '-2', sp + '-3'])];
  const NUMS = ['amb', 'sunI', 'night'];
  const KEYS_PULL = { ArrowUp: 1, w: 1, W: 1, ' ': 1 }, KEYS_SLACK = { ArrowDown: 1, s: 1, S: 1 };

  function create(el, ctx, saved) {
    const P = HH.fish, T = G.THREE;
    let s = null, cfg = null, raf = 0, last = 0, paused = false, alive = true, timers = [], lastChanged = 0, glErr = false;
    let wrap, stage, cv, gaugeEl, markEl, okEl, hotEl, brkEl, slkEl, distEl, goalEl, msgEl, hintEl, pullBtn, slackBtn, tiltEl, phoneEl, motionBtn, modeBtn, pauseBtn, albumBtn,
      pauseEl, turnEl, caughtEl, albumEl, powerEl, heartsEl, flashEl, tagsEl, diveEl, faceEl, leftBtn, rightBtn;
    let view = 'top';
    let W = 300, H = 400, pr = 1, slowF = 0, fastF = 0;
    const sget = (k, d) => { try { const v = HH.store && HH.store.get && HH.store.get(k); return v === undefined || v === null ? d : v; } catch (e) { return d; } };
    const sset = (k, v) => { try { if (HH.store && HH.store.set) HH.store.set(k, v); } catch (e) { /* niente salvataggio */ } };
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const sfx = (k, ...a) => { if (ctx.sfx && typeof ctx.sfx[k] === 'function') ctx.sfx[k](...a); };
    const asfx = (k, ...a) => { const A = HH.audio || {}; if (A.sfx && typeof A.sfx[k] === 'function') A.sfx[k](...a); };
    const react = (m) => { if (ctx.react) ctx.react(m); };
    const buzz = (ms) => { try { if (G.navigator && G.navigator.vibrate && sget('vibrate', true) !== false) G.navigator.vibrate(ms); } catch (e) { /* non supportato */ } };

    /* ---------- comandi ---------- */
    // pref: 'tilt' (sensori) o 'buttons'; sui telefoni si parte dai sensori se ci sono
    let pref = sget('fish:ctl', coarse() ? 'tilt' : 'buttons');
    const sensor = { at: 0, pitch: 0, zero: 0, roll: 0, rzero: 0, rsum: 0, calib: 0, sum: 0, n: 0, acc: 0, asked: false, granted: false, det: P.newFlick() };
    const hold = { pull: false, slack: false, keyPull: false, keySlack: false, rb: 0, charge: -1, aim: 0, left: false, right: false, keyL: false, keyR: false };
    // bersaglio dell'esca sott'acqua (coordinate della logica); touch: trascinamento relativo
    const lt = { x: 0, y: 0.45, on: false, id: null, px: 0, py: 0, x0: 0, y0: 0, hover: false };
    const drag = { id: null, x0: 0, y0: 0, p: 0, aim: 0 };
    let album = sget('fish:album', {});
    let photoTaken = false;
    const sensorLive = () => performance.now() - sensor.at < 1500;
    const mode = () => (pref === 'tilt' && sensorLive() ? 'tilt' : 'buttons');
    const needPerm = () => { const D = G.DeviceOrientationEvent; return !!(D && typeof D.requestPermission === 'function') && !sensor.granted; };
    function onOrient(e) {
      if (e.beta == null || e.gamma == null) return;
      // angolo dello schermo: window.orientation (iOS, Android) o screen.orientation; se contraddice la forma della
      // finestra (succede in alcuni emulatori) vale la finestra
      let ang = typeof G.orientation === 'number' ? G.orientation : (G.screen && G.screen.orientation && G.screen.orientation.angle) || 0;
      if ((Math.abs(ang) % 180 === 90) !== landscape()) ang = landscape() ? 90 : 0;
      const p = P.pitchFrom(e.beta, e.gamma, ang), rl = P.rollFrom(e.beta, e.gamma, ang);
      const now = performance.now();
      const fresh = now - sensor.at > 3000;
      sensor.pitch = fresh ? p : sensor.pitch * 0.5 + p * 0.5;
      sensor.roll = fresh ? rl : sensor.roll * 0.5 + rl * 0.5;
      sensor.at = now;
      if (fresh) { sensor.zero = sensor.pitch; sensor.rzero = sensor.roll; }
      if (sensor.calib > now) { sensor.sum += sensor.pitch; sensor.rsum += sensor.roll; sensor.n++; sensor.zero = sensor.sum / sensor.n; sensor.rzero = sensor.rsum / sensor.n; }
      // lancio col gesto della canna (solo prima del lancio)
      if (s && s.phase === 'aim' && mode() === 'tilt' && !paused && !caughtOpen()) {
        const pw = P.flick(sensor.det, now / 1000, sensor.pitch, sensor.acc);
        if (pw > 0) doCast(pw, 0);
      }
    }
    function onMotion(e) {
      const a = e.acceleration;
      if (a && a.x != null) sensor.acc = sensor.acc * 0.6 + Math.hypot(a.x, a.y || 0, a.z || 0) * 0.4;
    }
    function calibrate(ms = 500) { sensor.calib = performance.now() + ms; sensor.sum = 0; sensor.rsum = 0; sensor.n = 0; }
    function askMotion() {
      const D = G.DeviceOrientationEvent, M = G.DeviceMotionEvent;
      sensor.asked = true;
      const ok = () => { sensor.granted = true; pref = 'tilt'; sset('fish:ctl', pref); renderMode(); later(() => { if (!sensorLive()) noMotion(); }, 1800); };
      if (D && typeof D.requestPermission === 'function') {
        // iOS: il permesso va chiesto dentro il tocco (prima l'orientamento, poi il movimento)
        let p;
        try { p = D.requestPermission(); } catch (e) { noMotion(); return; }
        Promise.resolve(p).then((r) => {
          if (r !== 'granted') { noMotion(); return; }
          if (M && typeof M.requestPermission === 'function') { try { M.requestPermission().catch(() => {}); } catch (e) { /* facoltativo */ } }
          ok();
        }).catch(noMotion);
      } else ok();
    }
    function noMotion() { pref = 'buttons'; sset('fish:ctl', pref); renderMode(); say(L('fi_nomotion'), 'small'); }
    // forza del mulinello: sensori o pulsanti/tasti (Tira tenuto sale piano fino a 1, Allenta subito)
    function reelInput(dt) {
      if (!s) return 0;
      if (mode() === 'tilt') {
        if (sensor.calib > performance.now()) return 0;
        // sott'acqua l'inclinazione in avanti/indietro porta l'esca su e giù (vedi lureInput), non tira
        const v = s.phase === 'wait' ? 0 : P.tiltToReel(sensor.pitch - sensor.zero);
        // anche coi sensori i pulsanti/tasti, se premuti, comandano
        if (!(hold.pull || hold.keyPull || hold.slack || hold.keySlack)) return v;
      }
      const up = hold.pull || hold.keyPull, down = hold.slack || hold.keySlack;
      if (down && !up) hold.rb = Math.max(-1, Math.min(hold.rb, 0) - dt / 0.12);
      else if (up) hold.rb = Math.min(1, Math.max(hold.rb, 0.3) + dt / 0.7);
      else hold.rb = hold.rb > 0 ? Math.max(0, hold.rb - dt / 0.15) : Math.min(0, hold.rb + dt / 0.15);
      return hold.rb;
    }
    // dove portare l'esca sott'acqua: inclinazione di lato (velocità), avanti/indietro (profondità), mouse (posizione),
    // dito (trascinamento), ◀ ▶ e tasti ←/→ (piano), Allenta = scende, Tira = sale (e riavvicina l'amo)
    function lureInput(dt, reel) {
      if (!s || s.phase !== 'wait' || !s.lu) { lt.on = false; return null; }
      if (!lt.on) { lt.on = true; lt.x = s.lu.tx; lt.y = s.lu.ty; }
      if (mode() === 'tilt' && sensor.calib <= performance.now()) {
        lt.x += P.tiltToLure(sensor.roll - sensor.rzero) * dt;
        const dp = sensor.pitch - sensor.zero, a = Math.abs(dp);
        if (a > 3) lt.y -= Math.sign(dp) * Math.min(1, (a - 3) / 12) * 0.35 * dt;
      }
      const lr = (hold.right || hold.keyR ? 1 : 0) - (hold.left || hold.keyL ? 1 : 0);
      if (lr) lt.x += lr * 0.32 * dt;
      if (hold.slack || hold.keySlack) lt.y += 0.3 * dt;
      if (reel > 0.05) lt.y -= 0.25 * reel * dt;
      lt.x = clamp(lt.x, -1, 1); lt.y = clamp(lt.y, P.Y_TOP, P.Y_BOT);
      return lt;
    }

    /* ---------- DOM ---------- */
    function build() {
      el.innerHTML = `<div class="fi-wrap" dir="ltr">
        <div class="fi-stage" tabindex="0" role="application" aria-label="${L('fi_board')}">
          <canvas class="fi-cv"></canvas>
          <div class="fi-top">
            <div class="fi-goal" role="status"></div>
            <div class="fi-btns">
              <button class="fi-btn fi-albumb" type="button" aria-label="${L('fi_album')}" title="${L('fi_album')}">${BOOK}</button>
              <button class="fi-btn fi-mode" type="button"></button>
              <button class="fi-btn fi-pbtn" type="button" aria-label="${L('pa_pause')}" title="${L('pa_pause')}">${PAUSE}</button>
            </div>
          </div>
          <div class="fi-gauge off" role="meter" aria-label="${L('fi_tension')}" aria-valuemin="0" aria-valuemax="100">
            ${SNAPI}<div class="fi-warn"><i class="brk"></i></div>
            <div class="fi-bar"><div class="fi-hotz"></div><div class="fi-okz"></div><div class="fi-mark"></div></div>
            <div class="fi-warn lo"><i class="slk"></i></div>${LOOSEI}<div class="fi-dist">0 m</div>
          </div>
          <div class="fi-tgs" aria-hidden="true"></div>
          <div class="fi-face" aria-hidden="true"></div>
          <div class="fi-msg" aria-live="polite"><b></b></div>
          <div class="fi-hint" aria-live="polite"></div>
          <div class="fi-power" hidden><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="44" fill="none" stroke="var(--fsh-ui)" stroke-width="12"/><circle class="fi-pw" cx="60" cy="60" r="44" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="0 400" transform="rotate(-90 60 60)"/></svg></div>
          <div class="fi-hearts" aria-hidden="true"></div>
          <div class="fi-ctl">
            <button class="fi-hold slack" type="button">${DOWN}<span>${L('fi_slackb')}</span></button>
            <button class="fi-motion" type="button" hidden>${TILT}<span>${L('fi_motion')}</span></button>
            <div class="fi-lr"><button class="fi-hold lr l" type="button" aria-label="${L('pa_left')}" title="${L('pa_left')}">${LEFTI}</button><button class="fi-hold lr r" type="button" aria-label="${L('pa_right')}" title="${L('pa_right')}">${RIGHTI}</button></div>
            <div class="fi-tiltm" aria-hidden="true"><span class="fi-phone">${PHONE}</span><span>${L('fi_tiltHint')}</span></div>
            <button class="fi-hold pull" type="button"><span class="fi-ico">${CASTI}</span><span class="fi-lab">${L('fi_cast')}</span></button>
          </div>
          <div class="fi-veil fi-caught" hidden></div>
          <div class="fi-veil fi-album" hidden></div>
          <div class="fi-veil fi-pause" hidden><span class="fi-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small></div>
          <div class="fi-veil fi-turn" hidden>${PHONE}<b>${L('fi_turn')}</b></div>
          <div class="fi-dive" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="fi-flash"></div>
        </div></div>`;
      const q = (x) => el.querySelector(x);
      wrap = q('.fi-wrap'); stage = q('.fi-stage'); cv = q('.fi-cv'); gaugeEl = q('.fi-gauge'); markEl = q('.fi-mark'); okEl = q('.fi-okz'); hotEl = q('.fi-hotz');
      brkEl = q('.fi-warn i.brk'); slkEl = q('.fi-warn i.slk'); distEl = q('.fi-dist'); goalEl = q('.fi-goal'); msgEl = q('.fi-msg b'); hintEl = q('.fi-hint');
      pullBtn = q('.fi-hold.pull'); slackBtn = q('.fi-hold.slack'); tiltEl = q('.fi-tiltm'); phoneEl = q('.fi-phone'); motionBtn = q('.fi-motion'); modeBtn = q('.fi-mode');
      pauseBtn = q('.fi-pbtn'); albumBtn = q('.fi-albumb'); pauseEl = q('.fi-pause'); turnEl = q('.fi-turn'); caughtEl = q('.fi-caught'); albumEl = q('.fi-album');
      powerEl = q('.fi-power'); heartsEl = q('.fi-hearts'); flashEl = q('.fi-flash'); tagsEl = q('.fi-tgs'); diveEl = q('.fi-dive'); faceEl = q('.fi-face');
      leftBtn = q('.fi-hold.lr.l'); rightBtn = q('.fi-hold.lr.r');
      face.shown = '';
      // pulsanti da tenere premuti (puntatore catturato: si può scivolare col dito senza perderli)
      const holdOn = (btn, key) => {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } hold[key] = true; btn.classList.add('on'); onHoldStart(key); });
        const off = () => { if (!hold[key]) return; hold[key] = false; btn.classList.remove('on'); onHoldEnd(key); };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, off));
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
        // tastiera sul pulsante (Invio/spazio) = tenere premuto
        btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); hold[key] = true; btn.classList.add('on'); onHoldStart(key); } });
        btn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); off(); } });
      };
      holdOn(pullBtn, 'pull'); holdOn(slackBtn, 'slack'); holdOn(leftBtn, 'left'); holdOn(rightBtn, 'right');
      motionBtn.onclick = () => { sfx('tap'); askMotion(); };
      modeBtn.onclick = () => { sfx('tap'); if (pref === 'tilt') { pref = 'buttons'; } else { pref = 'tilt'; if (!sensorLive() || needPerm()) { askMotion(); return; } sensor.zero = sensor.pitch; } sset('fish:ctl', pref); renderMode(); };
      pauseBtn.onclick = () => { sfx('tap'); toggle(); };
      albumBtn.onclick = () => { sfx('tap'); openAlbum(); };
      pauseEl.onclick = () => resume();
      stage.addEventListener('pointerdown', onDown);
      stage.addEventListener('pointermove', onMove);
      ['pointerup', 'pointercancel'].forEach((ev) => stage.addEventListener(ev, onUp));
      if (G.ResizeObserver) { if (el._fiRO) el._fiRO.disconnect(); el._fiRO = new G.ResizeObserver(() => measure()); el._fiRO.observe(stage); }
    }
    const caughtOpen = () => caughtEl && !caughtEl.hidden;
    const albumOpen = () => albumEl && !albumEl.hidden;
    function renderMode() {
      if (!wrap) return;
      const m = mode();
      wrap.classList.toggle('tilt', m === 'tilt');
      modeBtn.innerHTML = m === 'tilt' ? TILT : HAND;
      const lab = m === 'tilt' ? L('fi_tilt') : L('fi_buttons');
      modeBtn.setAttribute('aria-label', lab); modeBtn.title = lab;
      // il pulsante dei sensori appare solo sui telefoni: serve il permesso (iOS) o i sensori non sono ancora attivi
      const touch = coarse();
      modeBtn.hidden = !touch && !sensorLive();
      motionBtn.hidden = !(touch && m !== 'tilt' && pref === 'tilt' && (needPerm() || !sensorLive()) && !sensor.asked) || (s && s.phase !== 'aim');
      checkTurn();
    }
    const castLabel = (on) => {
      const ico = pullBtn.querySelector('.fi-ico'), lab = pullBtn.querySelector('.fi-lab');
      if (pullBtn._cast === on) return;
      pullBtn._cast = on;
      ico.innerHTML = on ? CASTI : UP; lab.textContent = on ? L('fi_cast') : L('fi_pull');
    };
    function onHoldStart(key) {
      if (paused || !s || caughtOpen() || albumOpen()) return;
      if (key === 'pull' && s.phase === 'aim') { hold.charge = performance.now(); powerEl.style.left = `${W / 2}px`; powerEl.style.top = `${H * 0.62}px`; }
    }
    function onHoldEnd(key) {
      if (key === 'pull' && hold.charge >= 0) { const p = chargeP(); hold.charge = -1; powerEl.hidden = true; if (s && s.phase === 'aim' && p > 0.04) doCast(p, hold.aim); }
    }
    const chargeP = () => (hold.charge < 0 ? 0 : clamp((performance.now() - hold.charge) / 1300, 0, 1));
    // trascinamento sulla scena: in giù (indietro) carica, di lato mira, si lascia per lanciare
    function onDown(e) {
      if (e.target.closest('button, .fi-veil')) return;
      stage.focus({ preventScroll: true });
      // sott'acqua: col dito si trascina l'esca (spostamento relativo), col mouse la si porta dove si punta
      if (!paused && s && s.phase === 'wait' && view === 'uw' && lt.id === null) {
        lt.id = e.pointerId; lt.px = e.clientX; lt.py = e.clientY; lureInput(0, 0); lt.x0 = lt.x; lt.y0 = lt.y;
        try { stage.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
        if (e.pointerType === 'mouse') pointTo(e);
        return;
      }
      if (paused || !s || s.phase !== 'aim' || drag.id !== null) return;
      drag.id = e.pointerId; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.p = 0; drag.aim = 0;
      try { stage.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      const r = stage.getBoundingClientRect();
      powerEl.style.left = `${e.clientX - r.left}px`; powerEl.style.top = `${e.clientY - r.top}px`;
    }
    function pointTo(e) {
      if (!R3 || !s || !s.lu) return;
      const r = stage.getBoundingClientRect(), o3 = fromScreen(e.clientX - r.left, e.clientY - r.top, { x: 0, y: 0 });
      if (o3) { lureInput(0, 0); lt.x = o3.x; lt.y = o3.y; }
    }
    function onMove(e) {
      if (s && s.phase === 'wait' && view === 'uw' && !paused) {
        if (e.pointerType === 'mouse' && (lt.id === null || e.pointerId === lt.id)) { pointTo(e); return; }
        if (e.pointerId === lt.id) { lureInput(0, 0); lt.x = clamp(lt.x0 + (e.clientX - lt.px) / (W * 0.42), -1, 1); lt.y = clamp(lt.y0 + (e.clientY - lt.py) / (H * 0.5), P.Y_TOP, P.Y_BOT); return; }
      }
      if (e.pointerId !== drag.id) return;
      drag.p = clamp((e.clientY - drag.y0) / (H * 0.32), 0, 1);
      drag.aim = clamp(-(e.clientX - drag.x0) / (W * 0.35), -1, 1);
      powerEl.hidden = drag.p < 0.03;
      setPower(drag.p);
    }
    function onUp(e) {
      if (e.pointerId === lt.id) { lt.id = null; return; }
      if (e.pointerId !== drag.id) return;
      drag.id = null; powerEl.hidden = true;
      if (s && s.phase === 'aim' && drag.p > 0.06 && !paused) doCast(drag.p, drag.aim);
      drag.p = 0;
    }
    function setPower(p) { const c = powerEl.querySelector('.fi-pw'); c.setAttribute('stroke-dasharray', `${f1(p * 276.5)} 400`); }
    function onKey(e) {
      if (!alive || !wrap || !wrap.isConnected) return;
      if (e.target && e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
      if (albumOpen()) { if (e.key === 'Escape' || e.key === 'a' || e.key === 'A') { e.preventDefault(); closeAlbum(); } return; }
      if (e.key in KEYS_PULL || e.key in KEYS_SLACK) {
        e.preventDefault();
        if (paused) { resume(); return; }
        if (caughtOpen()) { if (e.key === ' ' && !e.repeat) caughtEl.querySelector('.fi-act.main').click(); return; }
        if (e.key in KEYS_PULL) { if (!hold.keyPull) { hold.keyPull = true; pullBtn.classList.add('on'); onHoldStart('pull'); } }
        else { hold.keySlack = true; slackBtn.classList.add('on'); }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (s && s.phase === 'wait') { if (e.key === 'ArrowLeft') hold.keyL = true; else hold.keyR = true; return; }
        hold.aim = clamp(hold.aim + (e.key === 'ArrowLeft' ? -0.25 : 0.25), -1, 1); return;
      }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); openAlbum(); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (e.key === 'Escape') pause(); else toggle(); }
    }
    function onKeyUp(e) {
      if (e.key in KEYS_PULL && hold.keyPull) { hold.keyPull = false; pullBtn.classList.remove('on'); onHoldEnd('pull'); }
      if (e.key in KEYS_SLACK) { hold.keySlack = false; slackBtn.classList.remove('on'); }
      if (e.key === 'ArrowLeft') hold.keyL = false;
      if (e.key === 'ArrowRight') hold.keyR = false;
    }

    /* ---------- messaggi ---------- */
    let msgT = 0;
    function say(text, cls = '') {
      if (!msgEl) return;
      msgEl.className = ''; void msgEl.offsetWidth;
      msgEl.textContent = text; msgEl.className = `go ${cls}`;
      clearTimeout(msgT); msgT = setTimeout(() => { if (msgEl) msgEl.className = ''; }, 2000);
    }
    let hintKey = '';
    function hint(text) { if (hintEl && hintKey !== text) { hintKey = text; hintEl.textContent = text; } }
    function paintGoal(pop) {
      if (!goalEl || !s) return;
      const n = Math.min(s.caught.length, cfg.goal), done = n >= cfg.goal;
      const tg = cfg.target, got = tg && s.caught.some((f) => f.sp === tg);
      goalEl.innerHTML = `<span class="fi-chip${done ? ' done' : ''}${pop === 'n' ? ' pop' : ''}" aria-label="${L('fi_goal').replace('{n}', cfg.goal)}">${FISHI}<b>${n}/${cfg.goal}</b>${done ? TICK : ''}</span>`
        + (tg ? `<span class="fi-chip${got ? ' done' : ''}${pop === 't' ? ' pop' : ''}" aria-label="${L('fi_target').replace('{sp}', spName(tg))}" title="${L('fi_target').replace('{sp}', spName(tg))}"><svg viewBox="0 0 120 80" aria-hidden="true">${fishArt(tg, 62, 42, 1.25)}</svg>${got ? TICK : '<b>?</b>'}</span>` : '');
    }

    /* ---------- 3D: renderer, materiali ---------- */
    let R3 = null, C = {}, N = {}, themeKey = '', themeAt = 0;
    function readTheme() {
      const cs = G.getComputedStyle(wrap);
      const raw = COLS.map((k) => cs.getPropertyValue('--fsh-' + k).trim()).concat(NUMS.map((k) => cs.getPropertyValue('--fsh-' + k).trim()));
      const key = raw.join('|');
      if (key === themeKey) return false;
      themeKey = key; C = {}; N = {};
      COLS.forEach((k, i) => { const c = new T.Color(); try { c.setStyle(raw[i] || '#ff00ff'); } catch (e) { c.set(0xff00ff); } C[k] = c; });
      NUMS.forEach((k, i) => { N[k] = parseFloat(raw[COLS.length + i]) || 0; });
      return true;
    }
    const prMax = () => 1.5;
    function initGL() {
      if (R3) return true;
      if (!T) { glErr = true; return false; }
      let renderer;
      try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: (G.devicePixelRatio || 1) < 2, powerPreference: 'default' }); } catch (e) { glErr = true; return false; }
      pr = Math.min(prMax(), G.devicePixelRatio || 1);
      renderer.setPixelRatio(pr);
      // rampa del cel shading: 4 gradini
      const grad = new T.DataTexture(new Uint8Array([96, 96, 96, 255, 156, 156, 156, 255, 212, 212, 212, 255, 255, 255, 255, 255]), 4, 1, T.RGBAFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
      const camera = new T.PerspectiveCamera(56, 1, 0.1, 900);
      R3 = { renderer, camera, grad, scene: null, disp: [], mats: {}, ols: {} };
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); }, false);
      return true;
    }
    const keep = (x) => { R3.disp.push(x); return x; };
    function toon(c) {
      const k = 't' + c.getHexString();
      if (R3.mats[k]) return R3.mats[k];
      const m = (R3.mats[k] = keep(new T.MeshToonMaterial({ color: c, gradientMap: R3.grad })));
      m.userData.bake = true;
      return m;
    }
    function basic(c, extra) { return keep(new T.MeshBasicMaterial(Object.assign({ color: c }, extra || {}))); }
    // contorno a guscio rovesciato: la geometria gonfiata lungo le normali di th metri, solo facce posteriori
    function outline(th) {
      const k = th.toFixed(3);
      if (R3.ols[k]) return R3.ols[k];
      const m = keep(new T.ShaderMaterial({
        uniforms: { uC: { value: C.ink.clone() }, uTh: { value: th } },
        // spessore in metri veri anche su geometrie unitarie scalate: si gonfia nello spazio della camera
        // (anche per le InstancedMesh: i banchi di pesciolini)
        vertexShader: 'uniform float uTh; void main(){ vec4 lp = vec4(position, 1.0); vec3 n = normal;\n#ifdef USE_INSTANCING\nlp = instanceMatrix * lp; n = mat3(instanceMatrix) * n;\n#endif\nvec4 mv = modelViewMatrix * lp; mv.xyz += normalize(normalMatrix * n) * uTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      }));
      m.userData.ol = th;
      R3.ols[k] = m;
      return m;
    }
    /* ---- geometria statica fusa: meno draw call ----
     * bake(radice, tutto): le mesh "toon" sotto la radice (e i loro contorni) diventano UNA mesh con i colori nei vertici
     * + UNA mesh di contorno con lo spessore nei vertici (attributo aTh). I gruppi figli restano separati (si animano) e
     * vengono fusi a loro volta, salvo quelli marcati userData.fixed (fermi rispetto al genitore) o tutto = true (scena
     * statica). Le mesh marcate userData.dyn (scalate o ruotate da sole) restano come sono. Niente BufferGeometryUtils
     * nella copia locale di three: la fusione è scritta qui (posizioni e normali trasformate, indici spostati). */
    function vcToon() {
      return R3.mats.vc || (R3.mats.vc = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: R3.grad })));
    }
    function olBaked() {
      return R3.mats.olb || (R3.mats.olb = keep(new T.ShaderMaterial({
        uniforms: { uC: { value: C.ink.clone() } },
        vertexShader: 'attribute float aTh; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz += normalize(normalMatrix * normal) * aTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      })));
    }
    const BK = {};
    function mergeTo(list, inv, ol) {
      if (!BK.m) { BK.m = new T.Matrix4(); BK.n = new T.Matrix3(); BK.v = new T.Vector3(); }
      let nv = 0, ni = 0;
      for (const m of list) { const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), X = new Float32Array(ol ? nv : nv * 3);
      const I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      // pesci: aSw = (tipo di parte, cerniera) per il nuoto nel vertex shader; aMix = pancia (colore 2 della mesh)
      const swOf = (m) => m.userData.sw || (ol && m.parent && m.parent.userData.sw) || null;
      const A = list.some(swOf) ? new Float32Array(nv * 4) : null;
      let vo = 0, io = 0;
      for (const m of list) {
        const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, cnt = pa.count;
        BK.m.multiplyMatrices(inv, m.matrixWorld); BK.n.getNormalMatrix(BK.m);
        const col = ol ? null : m.material.color, th = ol ? m.material.userData.ol : 0;
        const c2 = !ol && m.userData.c2 && g.attributes.aMix ? m.userData.c2 : null, mx = c2 && g.attributes.aMix;
        const sw = A && swOf(m);
        for (let i = 0; i < cnt; i++) {
          BK.v.fromBufferAttribute(pa, i).applyMatrix4(BK.m); P[(vo + i) * 3] = BK.v.x; P[(vo + i) * 3 + 1] = BK.v.y; P[(vo + i) * 3 + 2] = BK.v.z;
          BK.v.fromBufferAttribute(na, i).applyMatrix3(BK.n).normalize(); Nn[(vo + i) * 3] = BK.v.x; Nn[(vo + i) * 3 + 1] = BK.v.y; Nn[(vo + i) * 3 + 2] = BK.v.z;
          if (ol) X[vo + i] = th;
          else if (c2) { const k = mx.getX(i); X[(vo + i) * 3] = col.r + (c2.r - col.r) * k; X[(vo + i) * 3 + 1] = col.g + (c2.g - col.g) * k; X[(vo + i) * 3 + 2] = col.b + (c2.b - col.b) * k; }
          else { X[(vo + i) * 3] = col.r; X[(vo + i) * 3 + 1] = col.g; X[(vo + i) * 3 + 2] = col.b; }
          if (sw) { A[(vo + i) * 4] = sw[0]; A[(vo + i) * 4 + 1] = sw[1]; A[(vo + i) * 4 + 2] = sw[2]; A[(vo + i) * 4 + 3] = sw[3]; }
        }
        if (g.index) for (let i = 0; i < g.index.count; i++) I[io + i] = g.index.getX(i) + vo;
        else for (let i = 0; i < cnt; i++) I[io + i] = i + vo;
        io += g.index ? g.index.count : cnt; vo += cnt;
      }
      const geo = keep(new T.BufferGeometry());
      geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(Nn, 3));
      geo.setAttribute(ol ? 'aTh' : 'color', new T.BufferAttribute(X, ol ? 1 : 3)); geo.setIndex(new T.BufferAttribute(I, 1));
      if (A) geo.setAttribute('aSw', new T.BufferAttribute(A, 4));
      geo.computeBoundingSphere();
      return new T.Mesh(geo, ol ? olBaked() : vcToon());
    }
    function bake(root, all) {
      root.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(root.matrixWorld).invert();
      const solid = [], lines = [], subs = [];
      const visit = (o) => {
        for (const c of o.children.slice()) {
          if (c.isMesh) {
            const mu = c.material && c.material.userData;
            if (mu && mu.bake && !c.userData.dyn && !c.isInstancedMesh) {
              solid.push(c);
              for (const h of c.children) if (h.isMesh && h.material.userData && h.material.userData.ol != null) lines.push(h);
              visit(c);
            } else if (c.children.length) subs.push(c);
          } else if (!c.isLight && c.children.length) { if (all || c.userData.fixed) visit(c); else subs.push(c); }
        }
      };
      visit(root);
      if (solid.length > 1 || lines.length > 1) {
        root.add(mergeTo(solid, inv, false));
        if (lines.length) root.add(mergeTo(lines, inv, true));
        for (const m of solid) if (m.parent) m.parent.remove(m);
      }
      for (const x of subs) bake(x, false);
      return root;
    }
    // mesh toon (+ contorno) in un genitore: o = { p: [x,y,z], r: [x,y,z], s: [x,y,z] | n, ol: spessore }
    function mesh(geo, color, parent, o2 = {}) {
      const m = new T.Mesh(geo, color && color.isMaterial ? color : toon(color));
      if (o2.p) m.position.set(...o2.p);
      if (o2.r) m.rotation.set(...o2.r);
      if (o2.s != null) { if (typeof o2.s === 'number') m.scale.setScalar(o2.s); else m.scale.set(...o2.s); }
      if (o2.ol) { const h = new T.Mesh(geo, outline(o2.ol)); m.add(h); }
      if (parent) parent.add(m);
      return m;
    }
    const GEO = {};
    function geos() {
      if (GEO.ok) return;
      const g = (k, x) => { GEO[k] = keep(x); };
      g('sph', new T.SphereGeometry(1, 20, 14));
      g('sphLo', new T.SphereGeometry(1, 12, 8));
      g('hemi', new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
      g('cone', new T.ConeGeometry(1, 1, 8));
      g('cone6', new T.ConeGeometry(1, 1, 6));
      g('cyl', new T.CylinderGeometry(1, 1, 1, 14));
      g('cyl8', new T.CylinderGeometry(1, 1, 1, 8));
      g('box', new T.BoxGeometry(1, 1, 1));
      g('disc', new T.CircleGeometry(1, 24).rotateX(-Math.PI / 2));
      g('ring', new T.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2));
      g('drop', new T.SphereGeometry(1, 6, 4));
      GEO.ok = true;
    }

    /* ---------- 3D: la scena ---------- */
    const HARI = { x: -0.35, y: 0.47, z: 0.2 };
    function disposeScene() {
      if (!R3 || !R3.scene) return;
      R3.disp.forEach((x) => { try { x.dispose(); } catch (e) { /* già fatto */ } });
      R3.disp = []; R3.mats = {}; R3.ols = {};
      for (const k in GEO) delete GEO[k];
      R3.scene = null;
    }
    function buildScene() {
      disposeScene();
      geos();
      const night = N.night >= 0.5;
      const scene = new T.Scene();
      R3.scene = scene; R3.night = night;
      scene.fog = new T.Fog(C['sky-2'].clone(), 45, 300);
      scene.background = C['sky-2'].clone();
      scene.add(new T.HemisphereLight(C['sky-1'], C.hill, N.amb || 1.4));
      const sun = new T.DirectionalLight(C.sun, N.sunI || 1.5);
      sun.position.set(-6, 10, 8); scene.add(sun);
      R3.lamp = null;
      // cielo: cupola a sfumatura (colori nei vertici)
      {
        const dome = keep(new T.SphereGeometry(420, 24, 12));
        const pos = dome.attributes.position, col = [];
        for (let i = 0; i < pos.count; i++) { const k = clamp(pos.getY(i) / 260, 0, 1); const c = C['sky-2'].clone().lerp(C['sky-1'], Math.pow(k, 0.7)); col.push(c.r, c.g, c.b); }
        dome.setAttribute('color', new T.Float32BufferAttribute(col, 3));
        scene.add(new T.Mesh(dome, basic(0xffffff, { vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })));
      }
      // sole o luna (di sera con le stelle)
      const orb = mesh(GEO.disc, basic(C.sun, { fog: false }), scene, { p: [70, 85, -330], s: night ? 13 : 18 });
      orb.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      if (night) {
        mesh(GEO.disc, basic(C['sky-2'], { fog: false }), orb, { p: [0.28, 0.01, -0.22], s: 0.8 });
        const n = 160, pts = [], r = HH.rng(11);
        for (let i = 0; i < n; i++) { const a = r() * Math.PI - Math.PI / 2 - Math.PI / 2, e = 0.12 + r() * 1.2; pts.push(Math.cos(a) * Math.cos(e) * 380, Math.sin(e) * 380, Math.sin(a) * Math.cos(e) * 380); }
        const sg = keep(new T.BufferGeometry()); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
        scene.add(new T.Points(sg, keep(new T.PointsMaterial({ color: C.sun, size: 2.2, sizeAttenuation: false, fog: false }))));
        // lanterna sul pontile
        const lamp = new T.PointLight(C.lamp, 2.4, 12, 1.4);
        lamp.position.set(-1.0, 1.9, 0.35); scene.add(lamp); R3.lamp = lamp;
      }
      // nuvole
      R3.clouds = [];
      const rc = HH.rng(5);
      for (let i = 0; i < 6; i++) {
        const gC = new T.Group();
        const n = 3 + Math.floor(rc() * 2);
        for (let j = 0; j < n; j++) mesh(GEO.sphLo, C.cloud, gC, { p: [j * 7 - n * 3.5, (j % 2) * 2, 0], s: [6 + rc() * 3, 4 + rc() * 2, 4], ol: 0.12 });
        gC.position.set(-160 + i * 60 + rc() * 20, 45 + rc() * 30, -230 - rc() * 60);
        scene.add(gC); R3.clouds.push(gC);
      }
      buildWater(scene);
      if (cfg.stage === 'sea') buildSea(scene); else buildLake(scene);
      buildDock(scene);
      buildHari(scene);
      buildTackle(scene);
      R3.fishes = {};
      R3.held = null; R3.jump = null; R3.rel = null;
      R3.drops = []; for (let i = 0; i < 28; i++) { const d = mesh(GEO.drop, C.foam, scene, { s: 0.06 }); d.visible = false; R3.drops.push({ m: d, v: new T.Vector3(), life: 0 }); }
      R3.rings = []; for (let i = 0; i < 6; i++) { const m = mesh(GEO.ring, basic(C.foam, { transparent: true, opacity: 0, depthWrite: false }), scene); m.visible = false; R3.rings.push({ m, life: 0, max: 1 }); }
      if (tagsEl) { tagsEl.innerHTML = ''; }
      buildUW();
    }
    // acqua stilizzata: bande di colore a gradini, strisce di luce, onde e cerchi attorno al galleggiante, nebbia
    function buildWater(scene) {
      const geo = keep(new T.PlaneGeometry(520, 420, 60, 48).rotateX(-Math.PI / 2));
      geo.translate(0, 0, -170);
      const U = {
        uT: { value: 0 }, uA: { value: C.water.clone() }, uB: { value: C['water-2'].clone() }, uD: { value: C['water-3'].clone() }, uF: { value: C.foam.clone() },
        uFog: { value: C['sky-2'].clone() }, uBob: { value: new T.Vector3(0, 0, -8) }, uRip: { value: 0 }, uFish: { value: new T.Vector3(0, 0, -8) }, uWake: { value: 0 },
      };
      const mat = keep(new T.ShaderMaterial({
        uniforms: U,
        vertexShader: `uniform float uT; varying vec3 vW; varying float vD;
          void main(){ vec3 p = position; float w = sin(p.x * .32 + uT * 1.3) * .05 + sin(p.z * .45 - uT * 1.1) * .06; p.y += w * smoothstep(1.5, 6., length(p.xz - vec2(-.35, .2)));
            vec4 wp = modelMatrix * vec4(p, 1.); vW = wp.xyz; vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uT, uRip, uWake; uniform vec3 uA, uB, uD, uF, uFog, uBob, uFish; varying vec3 vW; varying float vD;
          void main(){
            float far = smoothstep(8., 120., vD);
            vec3 c = mix(uA, uD, step(.5, far) * .6 + step(.85, far) * .4);
            float n = sin(vW.x * .38 + uT * .6 + sin(vW.z * .21) * 2.) + sin(vW.z * .52 - uT * .5) * .8 + sin((vW.x - vW.z) * 1.4 + uT * 1.5) * .25;
            float band = step(1.25 + far * .35, n);
            c = mix(c, uB, band * (1. - far * .7));
            float sp = step(1.62, n + sin(vW.x * 2.3 + uT * 2.2) * .35) * (1. - far);
            c = mix(c, uF, sp * .55);
            float d = length(vW.xz - uBob.xz);
            float ring = step(.75, sin(d * 7. - uT * 6.) ) * smoothstep(2.4, .4, d) * uRip;
            c = mix(c, uF, ring * .8);
            float df = length(vW.xz - uFish.xz);
            c = mix(c, uF, step(.8, sin(df * 9. - uT * 9.)) * smoothstep(1.6, .3, df) * uWake * .7);
            float pier = smoothstep(1.9, 1.2, abs(vW.x) ) * smoothstep(-.2, .6, vW.z) * smoothstep(7., 5.5, vW.z);
            c = mix(c, uD, pier * .35);
            float fog = smoothstep(45., 300., vD);
            gl_FragColor = vec4(mix(c, uFog, fog), 1.);
            #include <colorspace_fragment>
          }`,
      }));
      const w = new T.Mesh(geo, mat);
      scene.add(w);
      R3.water = U;
    }
    const wave = (x, z, t) => Math.sin(x * 0.32 + t * 1.3) * 0.05 + Math.sin(z * 0.45 - t * 1.1) * 0.06;
    function tree(scene, x, z, k, pink) {
      const gT = new T.Group();
      mesh(GEO.cyl8, C.trunk, gT, { p: [0, 1.2 * k, 0], s: [0.35 * k, 2.4 * k, 0.35 * k], ol: 0.05 });
      if (pink) { mesh(GEO.sphLo, C['tree-2'], gT, { p: [0, 3.4 * k, 0], s: 1.9 * k, ol: 0.1 }); mesh(GEO.sphLo, C['tree-2'], gT, { p: [1.1 * k, 2.8 * k, 0.3 * k], s: 1.2 * k, ol: 0.08 }); }
      else { mesh(GEO.cone6, C.tree, gT, { p: [0, 3.3 * k, 0], s: [1.7 * k, 3.2 * k, 1.7 * k], ol: 0.1 }); mesh(GEO.cone6, C.tree, gT, { p: [0, 4.6 * k, 0], s: [1.2 * k, 2.4 * k, 1.2 * k], ol: 0.08 }); }
      gT.position.set(x, 0, z); scene.add(gT);
    }
    function buildLake(scene) {
      const r = HH.rng(cfg.level * 31 + 7);
      // colline sulla riva lontana
      for (let i = 0; i < 9; i++) {
        const x = -170 + i * 42 + r() * 16, rr = 26 + r() * 22;
        mesh(GEO.hemi, i % 2 ? C['hill-2'] : C.hill, scene, { p: [x, -2, -150 - r() * 30], s: [rr * 1.4, rr * 0.7, rr], ol: 0.5 });
      }
      // rive laterali con alberi, rocce
      [-1, 1].forEach((sd) => {
        mesh(GEO.box, C.hill, scene, { p: [sd * 46, -0.6, -60], s: [50, 1.6, 150] });
        mesh(GEO.box, C.sand, scene, { p: [sd * 21.5, -0.5, -60], s: [2, 1.2, 150] });
        for (let i = 0; i < 9; i++) tree(scene, sd * (25 + r() * 18), -8 - i * 14 - r() * 6, 0.8 + r() * 0.6, r() < 0.35);
        for (let i = 0; i < 4; i++) mesh(GEO.sphLo, C.rock, scene, { p: [sd * (20 + r() * 3), 0, -12 - i * 24 - r() * 8], s: [1.2 + r(), 0.7 + r() * 0.5, 1 + r()], ol: 0.06 });
      });
      // canne palustri e ninfee vicino al pontile
      [[-4.6, -3], [4.4, -5], [-6.5, -9], [6, -1.5]].forEach(([x, z], i) => {
        for (let j = 0; j < 5; j++) mesh(GEO.cyl8, C.reed, scene, { p: [x + (j - 2) * 0.16, 0.35 + (j % 2) * 0.1, z + (j % 3) * 0.12], s: [0.035, 0.75 + (j % 3) * 0.2, 0.035], r: [0, 0, (j - 2) * 0.08], ol: 0.015 });
        const lp = mesh(GEO.cyl, C.lily, scene, { p: [x + 1.2, 0.03, z - 0.8], s: [0.55, 0.04, 0.55], ol: 0.02 });
        if (i % 2 === 0) mesh(GEO.sphLo, C.flower, lp, { p: [0.2, 3, 0], s: [0.35, 4, 0.35] });
      });
    }
    function buildSea(scene) {
      const r = HH.rng(cfg.level * 17 + 3);
      // isoletta col faro e qualche palma, scogli
      const isl = new T.Group();
      mesh(GEO.hemi, C['hill-2'], isl, { s: [26, 6, 16], ol: 0.4 });
      mesh(GEO.hemi, C.hill, isl, { p: [6, 4, 0], s: [12, 6, 9], ol: 0.3 });
      const tw = new T.Group(); tw.position.set(-10, 4, 0); isl.add(tw);
      for (let i = 0; i < 4; i++) mesh(GEO.cyl, i % 2 ? C['tower-2'] : C.tower, tw, { p: [0, 1.25 + i * 2.5, 0], s: [1.8 - i * 0.18, 2.5, 1.8 - i * 0.18], ol: 0.12 });
      mesh(GEO.cyl, C.lamp, tw, { p: [0, 10.8, 0], s: [1.1, 1.4, 1.1], ol: 0.1 });
      mesh(GEO.cone, C['tower-2'], tw, { p: [0, 12.2, 0], s: [1.5, 1.5, 1.5], ol: 0.1 });
      for (let i = 0; i < 3; i++) {
        const pg = new T.Group(); pg.position.set(4 + i * 5, 6, (i - 1) * 3); isl.add(pg);
        mesh(GEO.cyl8, C.trunk, pg, { p: [0, 2.5, 0], s: [0.4, 5, 0.4], r: [0, 0, 0.12], ol: 0.06 });
        for (let j = 0; j < 5; j++) mesh(GEO.sphLo, C.tree, pg, { p: [Math.cos(j * 1.25) * 1.6 + 0.4, 5 + 0.1, Math.sin(j * 1.25) * 1.6], s: [1.9, 0.35, 0.8], r: [0, -j * 1.25, -0.3], ol: 0.05 });
      }
      isl.position.set(-55, -1, -160); scene.add(isl);
      // boa che dondola
      const buoy = new T.Group();
      mesh(GEO.cyl, C['tower-2'], buoy, { p: [0, 0.4, 0], s: [0.5, 0.8, 0.5], ol: 0.04 });
      mesh(GEO.cyl, C.tower, buoy, { p: [0, 1, 0], s: [0.35, 0.4, 0.35], ol: 0.03 });
      mesh(GEO.cone, C['tower-2'], buoy, { p: [0, 1.45, 0], s: [0.3, 0.5, 0.3], ol: 0.03 });
      buoy.position.set(9, 0, -24); scene.add(buoy); R3.buoy = buoy;
      for (let i = 0; i < 6; i++) mesh(GEO.sphLo, C.rock, scene, { p: [(r() < 0.5 ? -1 : 1) * (5 + r() * 9), -0.1, -2 - r() * 18], s: [0.8 + r(), 0.5 + r() * 0.6, 0.8 + r()], ol: 0.05 });
      // spiaggia a sinistra
      mesh(GEO.box, C.sand, scene, { p: [-40, -0.5, -40], s: [40, 1.1, 120] });
    }
    function buildDock(scene) {
      const gD = new T.Group();
      for (let i = 0; i < 14; i++) mesh(GEO.box, i % 2 ? C['wood-2'] : C.wood, gD, { p: [0, 0.4, 7 - i * 0.5], s: [2.2, 0.1, 0.46], ol: 0.02 });
      [[-1.05, 0.0], [1.05, 0.0], [-1.05, 3.2], [1.05, 3.2], [-1.05, 6.4], [1.05, 6.4]].forEach(([x, z]) => mesh(GEO.cyl8, C.post, gD, { p: [x, -0.2, z], s: [0.13, 1.4, 0.13], ol: 0.025 }));
      mesh(GEO.box, C.post, gD, { p: [-1.05, 0.3, 3.4], s: [0.12, 0.12, 7.2] }); mesh(GEO.box, C.post, gD, { p: [1.05, 0.3, 3.4], s: [0.12, 0.12, 7.2] });
      // secchiello e lanterna
      const bk = new T.Group(); bk.position.set(0.5, 0.45, 0.55); gD.add(bk);
      mesh(GEO.cyl, C.bucket, bk, { p: [0, 0.18, 0], s: [0.2, 0.36, 0.2], ol: 0.02 });
      mesh(GEO.cyl, C.water, bk, { p: [0, 0.34, 0], s: [0.17, 0.02, 0.17] });
      const lp = new T.Group(); lp.position.set(-1.0, 0.45, 0.35); gD.add(lp);
      mesh(GEO.cyl8, C.post, lp, { p: [0, 0.7, 0], s: [0.06, 1.4, 0.06], ol: 0.02 });
      mesh(GEO.box, C.lamp, lp, { p: [0, 1.45, 0], s: [0.22, 0.28, 0.22], ol: 0.025 });
      mesh(GEO.cone, C.band, lp, { p: [0, 1.66, 0], s: [0.2, 0.16, 0.2], ol: 0.02 });
      if (R3.night) lp.children[1].material = basic(C.lamp);
      scene.add(gD);
    }
    function buildHari(scene) {
      const h = new T.Group(); h.position.set(HARI.x, HARI.y, HARI.z); scene.add(h);
      const body = new T.Group(); h.add(body);
      mesh(GEO.sph, C.quill, body, { p: [0, 0.42, 0], s: [0.44, 0.42, 0.42], ol: 0.025 });
      // aculei sulla schiena (verso la camera, +z) e sulla testa, inclinati all'indietro come i veri ricci
      const back = new T.Vector3(0, -0.25, 0.6);
      for (let i = 0; i < 24; i++) {
        const y = -0.15 + (i / 23) * 1.05, r0 = Math.sqrt(Math.max(0, 1 - y * y)), th = ((i * 2.4) % 2.9) - 1.45;
        const nrm = new T.Vector3(Math.sin(th) * r0, y, Math.cos(th) * r0);
        const dir = nrm.clone().add(back).normalize();
        const q = mesh(GEO.cone6, i % 3 ? C.quill : C['quill-2'], body, { s: [0.09, 0.34, 0.09], ol: 0.014 });
        q.position.set(nrm.x * 0.42, 0.42 + nrm.y * 0.38, nrm.z * 0.4);
        q.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      }
      mesh(GEO.sph, C.face, body, { p: [0, 0.4, -0.27], s: [0.3, 0.27, 0.22] });
      mesh(GEO.sph, C.ear, body, { p: [-0.26, 0.74, -0.08], s: 0.09, ol: 0.012 }); mesh(GEO.sph, C.ear, body, { p: [0.26, 0.74, -0.08], s: 0.09, ol: 0.012 });
      // cappellino di paglia
      const hat = new T.Group(); hat.position.set(0, 0.82, -0.02); hat.rotation.x = -0.12; body.add(hat);
      mesh(GEO.cyl, C.hat, hat, { s: [0.5, 0.035, 0.5], ol: 0.015 });
      mesh(GEO.cyl, C.hat, hat, { p: [0, 0.12, 0], s: [0.24, 0.22, 0.24], ol: 0.015 });
      mesh(GEO.cyl, C.band, hat, { p: [0, 0.06, 0], s: [0.25, 0.07, 0.25] });
      // zampette (tengono la canna) e piedini a penzoloni
      mesh(GEO.sph, C.paw, body, { p: [0.22, 0.32, -0.36], s: 0.09, ol: 0.012 });
      mesh(GEO.sph, C.paw, body, { p: [0.05, 0.27, -0.4], s: 0.085, ol: 0.012 });
      mesh(GEO.sph, C.paw, h, { p: [-0.16, -0.04, -0.4], s: [0.1, 0.08, 0.13], ol: 0.012 });
      mesh(GEO.sph, C.paw, h, { p: [0.16, -0.04, -0.4], s: [0.1, 0.08, 0.13], ol: 0.012 });
      R3.hari = h; R3.hariBody = body;
    }
    function buildTackle(scene) {
      // canna a 4 pezzi (si piega con la tensione) e mulinello
      const base = new T.Group(); base.position.set(HARI.x + 0.16, HARI.y + 0.3, HARI.z - 0.38); scene.add(base);
      mesh(GEO.cyl, C.reel, base, { p: [0.07, 0.22, 0.02], r: [0, 0, Math.PI / 2], s: [0.07, 0.06, 0.07], ol: 0.01 });
      const segs = [];
      let parent = base;
      const lens = [0.55, 0.55, 0.5, 0.45];
      lens.forEach((len, i) => {
        const jn = new T.Group(); if (i) jn.position.y = lens[i - 1]; parent.add(jn);
        const r0 = 0.032 - i * 0.006;
        mesh(GEO.cyl8, i % 2 ? C['rod-2'] : C.rod, jn, { p: [0, len / 2, 0], s: [r0, len, r0], ol: 0.008 });
        segs.push(jn); parent = jn;
      });
      const tip = new T.Object3D(); tip.position.y = lens[3]; parent.add(tip);
      R3.rod = { base, segs, tip, elev: 55, bend: 0, yaw: 0 };
      // lenza
      const lg = keep(new T.BufferGeometry()); lg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(26 * 3), 3));
      const line = new T.Line(lg, keep(new T.LineBasicMaterial({ color: R3.night ? C.foam : C.line })));
      line.frustumCulled = false; scene.add(line); R3.line = line;
      // galleggiante
      const bob = new T.Group(); scene.add(bob);
      mesh(GEO.hemi, C['bob-1'], bob, { s: 0.12, ol: 0.012 });
      mesh(GEO.hemi, C['bob-2'], bob, { s: 0.12, r: [Math.PI, 0, 0], ol: 0.012 });
      mesh(GEO.cyl8, C['bob-1'], bob, { p: [0, 0.17, 0], s: [0.018, 0.14, 0.018] });
      R3.bob = bob;
      // ombra del pesce sott'acqua
      const sh = mesh(GEO.disc, basic(C.shadow, { transparent: true, opacity: 0, depthWrite: false }), scene, { s: [0.6, 1, 0.25] });
      sh.renderOrder = 2; R3.shadow = sh;
    }
    // pesce 3D kawaii (corpo, pancia, coda, pinne, occhioni, guance e i dettagli della specie)
    function fish3(sp) {
      if (R3.fishes[sp]) return R3.fishes[sp];
      const gF = buildFish(sp, R3.scene);
      R3.fishes[sp] = gF;
      return gF;
    }
    /* ---------- pesci 3D: forme per specie e nuoto ----------
     * Corpo generato (non una sfera): profilo d'altezza e di larghezza lungo x, muso pieno (superellisse) e coda che si
     * assottiglia a S fino al peduncolo caudale stretto; sezione ovale, schiena e pancia possono differire. Pinne sottili
     * (spessore a lente: 0 sul bordo, così il contorno a guscio segue la sagoma) attaccate dove servono: caudale dal
     * peduncolo verso l'esterno, dorsale, anale, pettorali dietro l'opercolo, ventrali. Bande, macchie e righe sono
     * "decalcomanie" che seguono la superficie del corpo. Tutto il pesce (corpo, pinne, occhi) è poi fuso da bake() in
     * UNA mesh + UN contorno (2 draw call per pesce, erano 4).
     * Nuoto nel vertex shader (onBeforeCompile su MeshToonMaterial; il contorno usa la stessa funzione): ogni vertice ha
     * aSw = (tipo, cerniera xyz). Onda del corpo lungo x con ritardo di fase dalla testa alla coda e ampiezza che cresce
     * verso la coda (nuoto carangiforme; il tonno ha il corpo quasi fermo e la coda rigida che ruota sul peduncolo),
     * piega a C (curve e fuga), pettorali che remano alternate, dorsale/anale che ondeggiano, code velate in ritardo.
     * Ogni pesce ha i suoi materiali (stesso programma) con gli uniform del suo nuoto: frequenza, fase e ampiezza
     * variano per individuo. Colori solo da --fsh-*. */
    // nuoto per specie: f = colpi di coda al secondo, a = ampiezza in punta (× lunghezza), k = onde nel corpo,
    // ex = esponente dell'inviluppo (alto = corpo fermo e solo la coda), head = quanto oscilla la testa,
    // pec / pf = ampiezza (rad) / frequenza delle pettorali, fin = ondeggio di dorsale e anale, veil = coda velata
    const SWP = {
      minnow: { f: 2.6, a: 0.13, k: 0.95, ex: 2, head: 0.04, pec: 0.5, pf: 3, fin: 0.25, veil: 0 },
      goldfish: { f: 1.5, a: 0.095, k: 0.8, ex: 2.2, head: 0.03, pec: 0.65, pf: 2.4, fin: 0.35, veil: 0.75 },
      catfish: { f: 1.1, a: 0.14, k: 1.25, ex: 1.6, head: 0.05, pec: 0.4, pf: 1.6, fin: 0.3, veil: 0 },
      koi: { f: 1.1, a: 0.11, k: 0.9, ex: 2, head: 0.03, pec: 0.5, pf: 1.8, fin: 0.25, veil: 0.5 },
      clown: { f: 2.4, a: 0.085, k: 0.8, ex: 2.2, head: 0.03, pec: 0.8, pf: 4, fin: 0.3, veil: 0 },
      puffer: { f: 1, a: 0.012, k: 0.5, ex: 3, head: 0.02, pec: 1, pf: 6, fin: 0.5, veil: 0 },
      tuna: { f: 3.4, a: 0.07, k: 0.55, ex: 5, head: 0.01, pec: 0.12, pf: 1, fin: 0.05, veil: 0 },
      golden: { f: 1.4, a: 0.095, k: 0.8, ex: 2.2, head: 0.03, pec: 0.6, pf: 2.2, fin: 0.35, veil: 0.8 },
    };
    const FISH_GLSL = `uniform vec4 uS1; uniform vec4 uS2; uniform vec4 uK; attribute vec4 aSw;
float fwZ(float x){ float s = clamp((uK.x - x) / uK.y, 0.0, 1.0); float e = uK.w + (1.0 - uK.w) * pow(s, uS2.w);
  return uS1.y * e * sin(uS1.x - s * uK.z * 6.2832) + uS1.z * s * s; }
vec3 fishDef(vec3 p){
  float k = aSw.x; vec3 h = aSw.yzw;
  if (k > 0.5 && k < 1.5) { float sd = h.z >= 0.0 ? 1.0 : -1.0; float ph = uS2.x + (sd > 0.0 ? 0.0 : 3.1416);
    float a = uS2.y * sin(ph) * sd, b = uS2.y * 0.7 * cos(ph) * sd; vec3 q = p - h;
    q.xz = vec2(q.x * cos(a) - q.z * sin(a), q.x * sin(a) + q.z * cos(a));
    q.yz = vec2(q.y * cos(b) - q.z * sin(b), q.y * sin(b) + q.z * cos(b)); p = h + q; }
  else if (k > 1.5 && k < 2.5) { p.z += uS2.z * abs(p.y - h.y) * sin(uS1.x * 0.7 + p.x * 14.0); }
  else if (k > 3.5) { float sl = (fwZ(h.x + 0.004) - fwZ(h.x - 0.004)) / 0.008; float a = atan(sl) * 1.3; vec3 q = p - h;
    q.xz = vec2(q.x * cos(a) - q.z * sin(a), q.x * sin(a) + q.z * cos(a)); return h + q + vec3(0.0, 0.0, fwZ(h.x)); }
  p.z += fwZ(p.x);
  if (k > 2.5 && k < 3.5) { float d = max(0.0, h.x - p.x); p.z += uS1.w * d * d * sin(uS1.x - 1.8 - d * 9.0); }
  return p; }
`;
    function fishCompile(sh) {
      Object.assign(sh.uniforms, this.userData.u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FISH_GLSL).replace('#include <begin_vertex>', 'vec3 transformed = fishDef(position);');
    }
    function fishMats(u) {
      const m = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: R3.grad }));
      m.userData.u = u; m.onBeforeCompile = fishCompile;
      const o = keep(new T.ShaderMaterial({
        uniforms: Object.assign({ uC: { value: C.ink.clone() } }, u),
        vertexShader: FISH_GLSL + 'attribute float aTh; void main(){ vec3 p = fishDef(position); vec4 mv = modelViewMatrix * vec4(p, 1.0); mv.xyz += normalize(normalMatrix * normal) * aTh; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}',
        side: T.BackSide,
      }));
      return [m, o];
    }
    // griglia (u, v) → punto: indici con le facce verso l'esterno (controllo sul primo triangolo non degenere)
    function gridGeo(nu, nv, fn, wrapV, extra) {
      const pos = [], idx = [], mix = [];
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const r = fn(i / nu, j / nv); pos.push(r[0], r[1], r[2]); if (extra) mix.push(extra(i / nu, j / nv)); }
      const id = (i, j) => i * (nv + 1) + j;
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) idx.push(id(i, j), id(i + 1, j), id(i, j + 1), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1));
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      if (extra) g.setAttribute('aMix', new T.Float32BufferAttribute(mix, 1));
      g.setIndex(idx); orient(g); g.computeVertexNormals();
      return keep(g);
    }
    // le facce devono guardare fuori dall'asse del pesce (asse x): se no si girano
    function orient(g) {
      const p = g.attributes.position, ix = g.index.array, a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
      let acc = 0;
      for (let t = 0; t < ix.length; t += 3) {
        a.fromBufferAttribute(p, ix[t]); b.fromBufferAttribute(p, ix[t + 1]); c.fromBufferAttribute(p, ix[t + 2]);
        const cx = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
        b.sub(a); c.sub(a); b.cross(c);
        acc += b.y * cx + b.z * cz;
      }
      if (acc < 0) for (let t = 0; t < ix.length; t += 3) { const k = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = k; }
    }
    // corpo chiuso: anelli più fitti a muso e coda, punta sul muso, tappo sul peduncolo; aMix = pancia
    function bodyGeo(F, P, belly) {
      const NX = 22, NT = 18, pos = [], mix = [], idx = [];
      const xs = []; for (let i = 0; i < NX; i++) xs.push(-Math.cos(Math.PI * i / NX));
      const q = [];
      for (const x of xs) for (let j = 0; j < NT; j++) {
        const th = (j / NT) * Math.PI * 2;
        P.at(x, th, 0, q); pos.push(q[0], q[1], q[2]);
        const s = Math.sin(th);
        mix.push(belly ? Math.min(1, Math.max(0, (-s - 0.2) / 0.3)) * Math.min(1, Math.max(0, (x + 0.88) / 0.25)) : 0);
      }
      const tip = pos.length / 3; pos.push(F.d[0], 0, 0); mix.push(0);
      const cap = pos.length / 3; pos.push(-F.d[0] - 0.004, 0, 0); mix.push(0);
      for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NT; j++) {
        const a = i * NT + j, b = (i + 1) * NT + j, c = i * NT + (j + 1) % NT, d = (i + 1) * NT + (j + 1) % NT;
        idx.push(a, b, c, b, d, c);
      }
      for (let j = 0; j < NT; j++) { idx.push((NX - 1) * NT + j, tip, (NX - 1) * NT + (j + 1) % NT); idx.push(cap, j, (j + 1) % NT); }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aMix', new T.Float32BufferAttribute(mix, 1));
      g.setIndex(idx); orient(g); g.computeVertexNormals();
      return keep(g);
    }
    // pinna sottile da un contorno 2D (piano xy, spessore lungo z a lente: 0 sul bordo, t al centro)
    function finGeo(pts, t) {
      let area = 0;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area < 0) pts = pts.slice().reverse();
      const n = pts.length;
      let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= n; cy /= n;
      const pos = [], idx = [];
      for (const p of pts) pos.push(p[0], p[1], 0);
      const inner = pts.map((p) => [cx + (p[0] - cx) * 0.62, cy + (p[1] - cy) * 0.62]);
      for (const sd of [1, -1]) for (const p of inner) pos.push(p[0], p[1], sd * t / 2);
      const F0 = n, B0 = 2 * n;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        idx.push(i, j, F0 + j, i, F0 + j, F0 + i);
        idx.push(i, B0 + j, j, i, B0 + i, B0 + j);
      }
      const tri = T.ShapeUtils.triangulateShape(inner.map((p) => new T.Vector2(p[0], p[1])), []);
      for (const f of tri) { idx.push(F0 + f[0], F0 + f[1], F0 + f[2]); idx.push(B0 + f[0], B0 + f[2], B0 + f[1]); }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      return keep(g);
    }
    function buildFish(sp, scene) {
      const F = FB[sp] || FB.minnow, W = SWP[sp] || SWP.minnow, P = fProf(F);
      const [lx, ly, lz] = F.d, c1 = C[sp + '-1'], c2 = C[sp + '-2'], c3 = C[sp + '-3'];
      const gF = new T.Group(), body = new T.Group(); gF.add(body);
      gF.rotation.order = 'YZX';
      const key = 'f_' + sp;
      const G2 = GEO[key] || (GEO[key] = {});
      const geo = (k, mk) => G2[k] || (G2[k] = mk());
      const OL = 0.009, OLF = 0.006;
      // corpo (pancia più chiara nei vertici, tranne il pagliaccio)
      const bm = mesh(geo('body', () => bodyGeo(F, P, sp !== 'clown')), c1, body, { ol: 0.012 });
      bm.userData.c2 = c2;
      const finMesh = (k, pts, t, col, p, r, sw, ol = OLF) => {
        const m = mesh(geo(k, () => finGeo(pts, t)), col, body, { p, r, ol });
        m.userData.sw = sw || [0, p[0], p[1], p[2]];
        return m;
      };
      // decalcomania sul corpo: fn(u, v) → [x, th]
      const decal = (k, nu, nv, fn, off, col) => mesh(geo(k, () => gridGeo(nu, nv, (u, v) => { const [x, th] = fn(u, v); return P.at(x, th, off); })), col, body);
      // ---- coda: dal peduncolo verso l'esterno ----
      const L = F.tl * ly, Hh = F.th * ly, a = F.ped * ly * 0.85, x0 = -lx + 0.012;
      const tailPts = (shape) => symm(TAILS[shape].map(([x, y], i) => [x * L, i === 0 ? a : y * Hh]));
      const tailCol = C[sp + '-' + FCOL[sp][0]];
      if (F.tail === 'veil2') {
        // coda doppia velata: due ventagli aperti a V, un po' cadenti
        // (ruotati attorno a un asse alto: uniti sopra, aperti sotto, come le code doppie vere)
        const yp = Hh * 0.45;
        [-1, 1].forEach((sd) => { const al = sd * 0.4; finMesh('tail' + sd, tailPts('veil'), 0.012, tailCol, [x0, yp * (1 - Math.cos(al)), -yp * Math.sin(al)], [al, 0, 0], [3, x0, 0, 0]); });
      } else if (F.tail === 'lunate') {
        finMesh('tail', tailPts('lunate'), 0.016, c1, [x0, 0, 0], null, [4, x0, 0, 0], OL);
        // carena sul peduncolo
        mesh(GEO.sphLo, c1, body, { p: [-lx * 0.86, 0, 0], s: [lx * 0.12, ly * 0.1, lz * 0.42] }).userData.sw = [0, 0, 0, 0];
      } else {
        const shape = F.tail === 'small' ? 'round' : F.tail;
        if (sp === 'clown') finMesh('tailB', tailPts('round').map(([x, y]) => [x * 1.08, y * 1.08]), 0.007, c3, [x0 - 0.004, 0, 0], null, [3, x0, 0, 0]);
        finMesh('tail', tailPts(shape), sp === 'clown' ? 0.014 : 0.012, tailCol, [x0, 0, 0], null, [F.tail === 'veil' ? 3 : 0, x0, 0, 0]);
      }
      // ---- dorsale e anale: contorno (u lungo la base dal retro 0 al davanti 1, v altezza sopra la superficie) ----
      const ridge = (k, u0, u1, h, pts, col, down, t = 0.011, border) => {
        const X = (u) => (u0 + (u1 - u0) * u), yS = (u) => (down ? P.bot(Math.max(-1, Math.min(1, X(u)))) : P.top(Math.max(-1, Math.min(1, X(u)))));
        const sg = down ? -1 : 1, sink = 0.22;
        const poly = [[X(1) * lx, yS(1) - sg * sink * h]].concat(pts.map(([u, v]) => [X(u) * lx, yS(u) + sg * v * h]), [[X(0) * lx, yS(0) - sg * sink * h]]);
        const hy = yS(0.5);
        if (border) finMesh(k + 'B', poly.map(([x, y]) => [X(0.5) * lx + (x - X(0.5) * lx) * 1.07, hy + (y - hy) * 1.1]), t * 0.5, border, [0, 0, 0], null, [2, X(0.5) * lx, hy, 0]);
        finMesh(k, poly, t, col, [0, 0, 0], null, [2, X(0.5) * lx, hy, 0]);
      };
      const finC = C[sp + '-' + FCOL[sp][1]], col = (k) => (k === 'f' ? finC : C[sp + '-' + k]);
      for (const [k, u0, u1, h, pts, cc, down, t, bd] of RIDGES[sp]) ridge(k, u0, u1, ly * h, pts, col(cc), down, t, bd && col(bd));
      if (sp === 'tuna') {
        // pinnule gialle su schiena e ventre verso la coda
        const fl = [[0.012, -0.006], [-0.02, 0.026], [-0.026, -0.006]].map(([x, y]) => [x * ly * 6, y * ly * 6]);
        for (let i = 0; i < 6; i++) {
          const x = -0.42 - i * 0.085;
          finMesh('fl', fl, 0.008, c3, [x * lx, P.top(x) - 0.004, 0], null, null, 0.004);
          finMesh('fl2', fl.map(([x2, y]) => [x2, -y]), 0.008, c3, [x * lx, P.bot(x) + 0.004, 0], null, null, 0.004);
        }
      }
      // ---- pettorali (dietro l'opercolo, remano) e ventrali ----
      const pecL = ly * F.pl, pecW = ly * F.pw, pecPts = PEC[sp === 'tuna' ? 'sickle' : 'paddle'];
      const pecX = F.ex - 0.3, pecY = -0.3;
      const pecC = C[sp + '-' + FCOL[sp][2]];
      [-1, 1].forEach((sd) => {
        const th = Math.asin(Math.max(-1, Math.min(1, pecY))), q = P.at(pecX, sd > 0 ? th : Math.PI - th, -0.04);
        if (sp === 'clown') finMesh('pecB', pecPts.map(([x, y]) => [x * pecL * 1.1, y * pecW * 1.12]), 0.006, c3, [q[0], q[1], q[2]], [sd * 0.7, sd * 0.5, 0.3], [1, q[0], q[1], q[2]]);
        finMesh('pec', pecPts.map(([x, y]) => [x * pecL, y * pecW]), 0.011, pecC, [q[0], q[1], q[2]], [sd * 0.7, sd * 0.5, 0.3], [1, q[0], q[1], q[2]]);
        if (sp !== 'puffer' && sp !== 'tuna') {
          const vx = sp === 'catfish' ? -0.05 : 0.02, qv = P.at(vx, sd > 0 ? -1.2 : Math.PI + 1.2, -0.05);
          finMesh('ven', [[0.015, 0.012], [-0.45 * pecL, -0.7 * pecW], [-0.85 * pecL, -0.85 * pecW], [-0.7 * pecL, -0.3 * pecW], [-0.03, -0.012]], 0.009, finC, [qv[0], qv[1], qv[2]], [-sd * 0.45, 0, 0], [2, qv[0], qv[1], qv[2]]);
        }
      });
      // ---- occhioni, guance ----
      [-1, 1].forEach((sd) => {
        const ex = F.ex, ey = F.ey * ly, ek = F.ek * 1.18;
        const hy = P.top(ex), zs = P.w(ex) * lz * Math.sqrt(Math.max(0.05, 1 - (ey / hy) * (ey / hy)));
        const X = ex * lx, Z = sd * zs * 0.84;
        mesh(GEO.sphLo, C.hi, body, { p: [X, ey, Z], s: [ly * 0.28 * ek, ly * 0.3 * ek, ly * 0.17 * ek] });
        mesh(GEO.sphLo, C.eye, body, { p: [X + 0.008, ey, Z + sd * ly * 0.1 * ek], s: [ly * 0.19 * ek, ly * 0.23 * ek, ly * 0.1 * ek] });
        mesh(GEO.sphLo, C.hi, body, { p: [X + 0.026, ey + ly * 0.08 * ek, Z + sd * ly * 0.19 * ek], s: ly * 0.06 * ek });
        const qb = P.at(ex - 0.12, sd > 0 ? -0.35 : Math.PI + 0.35, 0.004);
        mesh(GEO.sphLo, C.blush, body, { p: qb, s: [ly * 0.15, ly * 0.08, 0.012] }).rotation.y = sd * 0.5;
      });
      // ---- dettagli della specie ----
      const rod = (root, dir, len, col) => {
        const v = new T.Vector3(...dir).normalize(), m = mesh(GEO.cyl8, col, body, { s: [0.006, len, 0.006] });
        m.position.set(root[0] + v.x * len / 2, root[1] + v.y * len / 2, root[2] + v.z * len / 2);
        m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v);
      };
      if (sp === 'clown') {
        // tre bande bianche bordate di scuro, curve in avanti sui fianchi
        [[0.3, 0.075, 0.07], [-0.12, 0.1, 0.1], [-0.8, 0.055, 0.02]].forEach(([xc, hw, bend], i) => {
          const fn = (w) => (u, v) => { const th = v * Math.PI * 2, c = Math.cos(th); return [xc + (u * 2 - 1) * w + bend * c * c, th]; };
          decal('bandB' + i, 4, 36, fn(hw + 0.035), 0.012, c3);
          decal('band' + i, 4, 36, fn(hw), 0.024, c2);
        });
      }
      if (sp === 'koi') {
        // macchie rosse sulla schiena (contorno un po' irregolare)
        [[0.48, 1.57, 0.12, 0.55], [0.05, 1.9, 0.2, 0.75], [-0.42, 1.25, 0.15, 0.6], [0.22, 0.75, 0.1, 0.45], [-0.2, 2.5, 0.09, 0.35]].forEach(([cx, ct, ax, at], i) => {
          decal('spot' + i, 4, 20, (u, v) => { const an = v * Math.PI * 2, wob = 1 + 0.18 * Math.sin(an * 3 + i); return [cx + u * ax * wob * Math.cos(an), ct + u * at * wob * Math.sin(an)]; }, 0.012, c3);
        });
        [-1, 1].forEach((sd) => rod([lx * 0.93, -ly * 0.22, sd * lz * 0.22], [0.5, -0.8, sd * 0.35], ly * 0.5, C.ink));
      }
      if (sp === 'minnow') [1, -1].forEach((sd) => decal('stripe' + sd, 14, 3, (u, v) => { const x = -0.78 + u * 1.2, w = 0.09 * Math.sin(Math.PI * u) + 0.02; return [x, (sd > 0 ? 0.12 : Math.PI - 0.12) + (v * 2 - 1) * w]; }, 0.01, c3));
      if (sp === 'catfish') [-1, 1].forEach((sd) => {
        rod([lx * 0.9, -ly * 0.12, sd * lz * 0.3], [0.6, -0.3, sd * 0.75], ly * 1.4, C.ink);
        rod([lx * 0.84, -ly * 0.5, sd * lz * 0.14], [0.3, -1, sd * 0.3], ly * 0.7, C.ink);
      });
      if (sp === 'puffer') for (let i = 0; i < 18; i++) {
        const x = 0.82 - (i + 0.5) / 18 * 1.55, th = i * 2.39996, q = P.at(x, th, -0.03), dir = new T.Vector3(q[0] - x * lx * 0.6, q[1], q[2]).normalize();
        const m = mesh(GEO.cone6, c3, body, { s: [0.028, 0.09, 0.028] }); m.position.set(q[0], q[1], q[2]); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      }
      if (sp === 'golden') {
        const cr = new T.Group(); cr.userData.fixed = true; cr.position.set(lx * 0.3, P.top(0.3) + 0.01, 0); body.add(cr);
        for (let i = 0; i < 3; i++) mesh(GEO.cone6, c3, cr, { p: [(i - 1) * 0.05, 0.05, 0], s: [0.025, 0.09, 0.025], ol: 0.006 });
        mesh(GEO.cyl8, c3, cr, { s: [0.08, 0.03, 0.05] });
      }
      gF.visible = false; scene.add(gF);
      const len = 2 * lx + L;
      const u = { uS1: { value: new T.Vector4(0, 0, 0, 0) }, uS2: { value: new T.Vector4(0, 0, 0, W.ex) }, uK: { value: new T.Vector4(lx, len, W.k, W.head) } };
      const r = Math.random();
      gF.userData = { body, len: lx, sw: { u, p: W, len, ph: r * 6.28, pph: r * 3.1, bph: r * 5, e: 0.4, cb: 0, fm: 0.88 + 0.24 * Math.random(), am: 0.85 + 0.3 * Math.random() } };
      bake(gF, false);
      const [mt, mo] = fishMats(u);
      body.children.forEach((m) => { if (m.isMesh && m.geometry.attributes.aSw) { m.material = m.material.isShaderMaterial ? mo : mt; m.frustumCulled = false; } });
      return gF;
    }
    // nuoto di un pesce: v = spinta 0..1 (velocità), hover = fermo davanti all'esca (lo tengono le pettorali),
    // flee = fuga, turn = velocità di virata (rad/s: il corpo si piega verso l'interno, a C nelle virate brusche),
    // thrash = si dimena (lotta, in mano). Nessun oggetto creato: aggiorna gli uniform del pesce.
    function swimUp(g, dt, v, hover, flee, turn, thrash) {
      const S = g.userData.sw; if (!S) return;
      const W = S.p, U = S.u, TAU = Math.PI * 2;
      S.bph = (S.bph + dt * (0.5 + 0.6 * v) * S.fm * TAU) % (TAU * 50);
      const burst = Math.sin(S.bph) > -0.35 ? 1 : 0.2;          // colpi di coda a impulsi, poi planata
      const tgt = v * burst + flee * 1.2 + thrash;
      S.e += (tgt - S.e) * Math.min(1, dt * (tgt > S.e ? 8 : 3));
      const e = Math.min(1.6, S.e);
      const f = W.f * S.fm * (0.4 + 0.7 * Math.min(1, e) + 0.9 * flee + 1.3 * thrash);
      S.ph = (S.ph + dt * f * TAU) % (TAU * 50);
      const amp = W.a * S.len * S.am * (0.15 + 0.85 * Math.min(1, e) + 0.35 * flee + 0.6 * thrash) * (1 - 0.75 * hover);
      const still = Math.max(hover, 1 - Math.min(1, e * 1.4));
      S.pph = (S.pph + dt * W.pf * S.fm * (0.7 + 0.8 * still) * TAU) % (TAU * 50);
      const cb = Math.max(-0.32, Math.min(0.32, -turn * 0.07)) * S.len;
      S.cb += (cb - S.cb) * Math.min(1, dt * 12);
      U.uS1.value.set(S.ph, amp, S.cb, W.veil * (0.45 + 0.55 * Math.min(1, e)));
      U.uS2.value.set(S.pph, W.pec * (0.2 + 0.8 * still) * (1 - 0.6 * flee), W.fin * (0.4 + 0.6 * Math.min(1, e)), W.ex);
    }
    function splash(p, n = 10, k = 1) {
      if (!R3) return;
      for (let i = 0, j = 0; i < R3.drops.length && j < n; i++) {
        const d = R3.drops[i];
        if (d.life > 0) continue;
        j++;
        const a = Math.random() * Math.PI * 2, sp = (0.8 + Math.random() * 1.6) * k;
        d.m.position.set(p.x, 0.05, p.z); d.v.set(Math.cos(a) * sp, (2 + Math.random() * 2.5) * k, Math.sin(a) * sp);
        d.life = 0.6 + Math.random() * 0.4; d.m.visible = true; d.m.scale.setScalar(0.04 + Math.random() * 0.05 * k);
      }
      ring(p, 1.2 * k);
    }
    function ring(p, max = 1) {
      if (!R3) return;
      const r = R3.rings.find((x) => x.life <= 0) || R3.rings[0];
      r.m.position.set(p.x, 0.04, p.z); r.life = 1; r.max = max; r.m.visible = true;
    }
    /* ---------- 3D: sott'acqua ----------
     * Una seconda scena, disegnata al posto di quella in superficie mentre l'esca è in acqua (fase 'wait' e 'bite').
     * Strati con parallasse (piante vicine davanti alla camera, fondale, rocce e coralli, sagome lontane nella nebbia),
     * raggi di luce che filtrano, superficie vista da sotto (con le ninfee al lago), bollicine, banchi di pesciolini
     * (InstancedMesh, 2 draw call per banco), abitanti kawaii che non abboccano. Le piante sono UNA InstancedMesh con
     * ShaderMaterial che le fa ondeggiare nel vertex shader; i raggi un'altra; le bollicine Points: niente oggetti
     * creati per fotogramma. Coordinate della logica: x −1..1 → ±UWX m, y 0..1 → UWY0 .. UWY0 − UWY m. */
    const UWX = 1.45, UWY0 = -0.35, UWY = 4.4, BED = -5.05;
    const uwX = (x) => x * UWX, uwY = (y) => UWY0 - y * UWY;
    function fogShader(vert, frag, uni, extra) {
      return keep(new T.ShaderMaterial(Object.assign({
        uniforms: Object.assign({ uT: { value: 0 }, uFog: { value: C['uw-2'].clone() }, uN: { value: 5 }, uF: { value: 26 } }, uni),
        vertexShader: vert, fragmentShader: frag,
      }, extra || {})));
    }
    function buildUW() {
      const night = R3.night, sea = cfg.stage === 'sea';
      const scene = new T.Scene();
      const U = (R3.uw = { scene, mats: [], byId: {}, spare: {}, frame: 0, crit: [], schools: [], tags: [], bub: null });
      scene.background = C['uw-2'].clone();
      scene.fog = new T.Fog(C['uw-2'].clone(), 5, 26);
      scene.add(new T.HemisphereLight(C['uw-top'], C['uw-2'], (N.amb || 1.4) * 1.05));
      const sun = new T.DirectionalLight(C.ray, (N.sunI || 1.5) * 0.9); sun.position.set(-3, 10, 6); scene.add(sun);
      const r = HH.rng(cfg.level * 13 + (sea ? 5 : 9));
      // fondo: sfumatura dall'acqua chiara (in alto) a quella profonda
      {
        const g = keep(new T.PlaneGeometry(140, 34, 1, 8)), pos = g.attributes.position, col = [];
        for (let i = 0; i < pos.count; i++) { const k = clamp((pos.getY(i) + 17) / 34, 0, 1); const c = C['uw-2'].clone().lerp(C['uw-1'], Math.pow(k, 1.4)); col.push(c.r, c.g, c.b); }
        g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
        const bg = new T.Mesh(g, basic(0xffffff, { vertexColors: true, fog: false, depthWrite: false }));
        bg.position.set(0, -6, -34); scene.add(bg);
      }
      // superficie vista da sotto: bande di luce che scorrono
      {
        const g = keep(new T.PlaneGeometry(90, 60, 1, 1).rotateX(Math.PI / 2));
        const m = fogShader(
          'varying vec3 vW; varying float vD; void main(){ vec4 wp = modelMatrix * vec4(position,1.); vW = wp.xyz; vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }',
          `uniform float uT, uN, uF; uniform vec3 uA, uB, uFog; varying vec3 vW; varying float vD;
           void main(){ float n = sin(vW.x * 1.1 + uT * .7 + sin(vW.z * .6 + uT * .3) * 2.) + sin(vW.z * 1.4 - uT * .5) * .7;
             vec3 c = mix(uA, uB, step(1.05, n) * .75);
             gl_FragColor = vec4(mix(c, uFog, smoothstep(3., 34., vD) * .8), 1.);
             #include <colorspace_fragment>
           }`,
          { uA: { value: C['uw-1'].clone().lerp(C['uw-top'], 0.55) }, uB: { value: C['uw-top'].clone() }, uFog: { value: C['uw-1'].clone() } },
          { side: T.DoubleSide, fog: false });
        U.mats.push(m);
        const sf = new T.Mesh(g, m); sf.position.set(0, 0.02, -16); scene.add(sf);
      }
      // raggi di luce (una InstancedMesh, fusione additiva)
      {
        const g = keep(new T.PlaneGeometry(1, 1).translate(0, -0.5, 0));
        const m = fogShader(
          'uniform float uT; varying vec2 vU; varying float vK; void main(){ vU = uv; vec4 w0 = instanceMatrix * vec4(0.,0.,0.,1.); vK = .55 + .45 * sin(uT * .55 + w0.x * 1.9); gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.); }',
          'uniform vec3 uC; uniform float uA; varying vec2 vU; varying float vK; void main(){ float a = pow(vU.y, 1.7) * smoothstep(0., .35, vU.x) * smoothstep(1., .65, vU.x) * vK * uA; gl_FragColor = vec4(uC * a, a);\n#include <colorspace_fragment>\n}',
          { uC: { value: C.ray.clone() }, uA: { value: night ? 0.16 : 0.26 } },
          { transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
        U.mats.push(m);
        const n = 7, im = new T.InstancedMesh(g, m, n), d = new T.Object3D();
        for (let i = 0; i < n; i++) { d.position.set(-7 + i * 2.3 + r() * 0.8, 0.1, -3 - r() * 9); d.rotation.set(0, 0, -0.32 + r() * 0.12); d.scale.set(0.9 + r() * 1.3, 9 + r() * 3, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
        im.frustumCulled = false; scene.add(im);
      }
      // fondale con dune, rocce, coralli (mare) o tronchi e sassi (lago): tutto fermo, fuso in una mesh (+ contorno)
      const stat = new T.Group(); scene.add(stat);
      {
        const g = keep(new T.PlaneGeometry(80, 40, 32, 16).rotateX(-Math.PI / 2)), pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, Math.sin(x * 0.35 + z * 0.2) * 0.25 + Math.sin(x * 0.9 - z * 0.5) * 0.08 + Math.max(0, -z - 6) * 0.06); }
        g.computeVertexNormals();
        const bed = new T.Mesh(g, toon(C.bed)); bed.position.set(0, BED, -12); stat.add(bed);
        for (let i = 0; i < 7; i++) mesh(GEO.hemi, C['bed-2'], stat, { p: [-9 + i * 3 + r() * 2, BED - 0.1, -2 - r() * 10], s: [1.2 + r() * 1.5, 0.35 + r() * 0.3, 0.8 + r()] });
        for (let i = 0; i < 9; i++) {
          const z = i < 4 ? -0.8 - r() * 2 : -5 - r() * 9;
          mesh(GEO.sphLo, C.rock, stat, { p: [(r() - 0.5) * 14, BED + 0.1, z], s: [0.5 + r() * 0.9, 0.4 + r() * 0.6, 0.5 + r() * 0.7], ol: 0.03 });
        }
        if (sea) {
          for (let i = 0; i < 7; i++) {
            const cg = new T.Group(), cc = i % 2 ? C.coral : C['coral-2'];
            const k = 0.6 + r() * 0.6;
            for (let j = 0; j < 4; j++) {
              const a = j * 1.6 + r(), br = new T.Group(); br.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.55); cg.add(br);
              mesh(GEO.cyl8, cc, br, { p: [0, 0.35 * k, 0], s: [0.07 * k, 0.7 * k, 0.07 * k], ol: 0.015 });
              mesh(GEO.sphLo, cc, br, { p: [0, 0.72 * k, 0], s: 0.11 * k, ol: 0.015 });
            }
            cg.position.set((r() - 0.5) * 12, BED + 0.1, i < 3 ? -0.6 - r() * 2 : -3 - r() * 8); stat.add(cg);
          }
          for (let i = 0; i < 3; i++) mesh(GEO.hemi, C.coral, stat, { p: [(r() - 0.5) * 10, BED, -1.5 - r() * 6], s: [0.45, 0.35, 0.4], ol: 0.025 });
        } else {
          for (let i = 0; i < 2; i++) mesh(GEO.cyl8, C.trunk, stat, { p: [(i ? 3.6 : -4.2), BED + 0.2, -3 - i * 3], r: [0, 0.4 - i, Math.PI / 2], s: [0.22, 3.4, 0.22], ol: 0.03 });
          for (let i = 0; i < 12; i++) mesh(GEO.sphLo, i % 2 ? C['bed-2'] : C.rock, stat, { p: [(r() - 0.5) * 12, BED + 0.05, -0.5 - r() * 7], s: [0.14 + r() * 0.12, 0.08, 0.12 + r() * 0.1] });
          // ninfee viste da sotto: foglie a disco sulla superficie e gambi lunghi fino al fondo
          for (let i = 0; i < 6; i++) {
            const x = (r() - 0.5) * 12, z = -1.5 - r() * 9;
            const pad = new T.Mesh(keep(new T.CircleGeometry(1, 20, 0.35, Math.PI * 2 - 0.7).rotateX(Math.PI / 2)), toon(C.lily));
            pad.position.set(x, -0.04, z); pad.scale.setScalar(0.7 + r() * 0.5); pad.rotation.y = r() * 6; stat.add(pad);
            mesh(GEO.cyl8, C.reed, stat, { p: [x + 0.1, (BED - 0.04) / 2, z], s: [0.03, -BED, 0.03], r: [0, 0, 0.05 - r() * 0.1] });
          }
        }
      }
      bake(stat, true);
      // piante che ondeggiano: alghe al mare, erbe e canne al lago (una InstancedMesh, 3 strati di profondità)
      {
        const g = keep(new T.PlaneGeometry(0.26, 1, 1, 8));
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.5; pos.setX(i, pos.getX(i) * (1 - 0.7 * y) * (sea ? 1.4 : 1)); pos.setY(i, y); }
        const m = fogShader(
          `uniform float uT; varying float vH; varying float vD; varying vec3 vC;
           void main(){ vH = uv.y; vec4 w0 = instanceMatrix * vec4(0.,0.,0.,1.); float ph = w0.x * 1.7 + w0.z * .9;
             vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); float k = pow(uv.y, 1.5);
             wp.x += sin(uT * 1.2 + ph + uv.y * 2.2) * .3 * k; wp.z += cos(uT * .9 + ph) * .12 * k;
             #ifdef USE_INSTANCING_COLOR
             vC = instanceColor;
             #else
             vC = vec3(1.);
             #endif
             vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
          `uniform vec3 uFog, uInk; uniform float uN, uF; varying float vH; varying float vD; varying vec3 vC;
           void main(){ vec3 c = vC * (.74 + .26 * step(.5, vH)); gl_FragColor = vec4(mix(c, uFog, smoothstep(uN, uF, vD)), 1.);
             #include <colorspace_fragment>
           }`,
          { uInk: { value: C.ink.clone() } }, { side: T.DoubleSide });
        U.mats.push(m);
        const n = 84, im = new T.InstancedMesh(g, m, n), d = new T.Object3D();
        for (let i = 0; i < n; i++) {
          const layer = i < 14 ? 0 : i < 50 ? 1 : 2;     // 0 davanti alla camera, 1 vicino, 2 lontano
          const z = layer === 0 ? 1.6 + r() * 1.6 : layer === 1 ? -0.6 - r() * 4 : -7 - r() * 12;
          const x = layer === 0 ? (r() < 0.5 ? -1 : 1) * (1.2 + r() * 2.2) : (r() - 0.5) * (layer === 1 ? 13 : 26);
          const h = (sea ? 2.2 : 1.5) + r() * (sea ? 2.6 : 1.8) + (layer === 0 ? 1 : 0);
          d.position.set(x, BED - 0.05, z); d.rotation.set(0, r() * 3, 0); d.scale.set(layer === 0 ? 1.6 : 1, h, 1); d.updateMatrix();
          im.setMatrixAt(i, d.matrix); im.setColorAt(i, r() < 0.5 ? C.weed : C['weed-2']);
        }
        im.frustumCulled = false; scene.add(im);
      }
      // bollicine: Points con un insieme fisso
      {
        const n = 70, g = keep(new T.BufferGeometry());
        const p = new Float32Array(n * 3), sz = new Float32Array(n);
        g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('aS', new T.BufferAttribute(sz, 1));
        const m = keep(new T.ShaderMaterial({
          uniforms: { uScale: { value: 400 }, uC: { value: C.bubble.clone() }, uR: { value: C.foam.clone() } },
          vertexShader: 'attribute float aS; uniform float uScale; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vA = aS; gl_PointSize = aS * uScale / max(.5, -mv.z); gl_Position = projectionMatrix * mv; }',
          fragmentShader: 'uniform vec3 uC, uR; varying float vA; void main(){ if (vA <= 0.) discard; vec2 d = gl_PointCoord - .5; float r = length(d); if (r > .5) discard; float rim = step(.34, r); float hi = step(length(d - vec2(-.16, -.16)), .1); vec3 c = mix(uC, uR, max(rim, hi)); gl_FragColor = vec4(c, .35 + .6 * max(rim, hi));\n#include <colorspace_fragment>\n}',
          transparent: true, depthWrite: false,
        }));
        const pts = new T.Points(g, m); pts.frustumCulled = false; scene.add(pts);
        U.bub = { g, p, sz, n, vy: new Float32Array(n), life: new Float32Array(n), wob: new Float32Array(n), m, next: 0 };
      }
      // banchi di pesciolini (al lago anche i girini): InstancedMesh + contorno che condivide le matrici
      {
        // profilo dal basso in alto (coda → muso: facce verso l'esterno)
        const prof = [[0, -0.48], [0.26, -0.52], [0.07, -0.36], [0.24, -0.22], [0.34, 0.08], [0.22, 0.32], [0, 0.5]].map(([x, y]) => new T.Vector2(x, y));
        const g = keep(new T.LatheGeometry(prof, 7).rotateZ(-Math.PI / 2));
        const mk = (n, c1, c2, k, zc, tad) => {
          const im = new T.InstancedMesh(g, toon(new T.Color(1, 1, 1)), n);
          for (let i = 0; i < n; i++) im.setColorAt(i, i % 3 ? c1 : c2);
          const ol = new T.InstancedMesh(g, outline(0.012), n); ol.instanceMatrix = im.instanceMatrix;
          im.frustumCulled = ol.frustumCulled = false; scene.add(im); scene.add(ol);
          const sc = { im, n, k, z: zc, x: (r() - 0.5) * 6, y: -1.4 - r() * 2.5, ph: r() * 6, sp: 0.35 + r() * 0.2, scat: 0, off: [], tad };
          for (let i = 0; i < n; i++) sc.off.push([(r() - 0.5) * 1.4, (r() - 0.5) * 0.7, (r() - 0.5) * 0.8, r() * 6, 0.8 + r() * 0.5, 0, 0]);   // + frequenza, imbardata, sua velocità
          U.schools.push(sc);
        };
        if (sea) { mk(12, C['tiny-1'], C['tiny-2'], 0.2, -2.2); mk(9, C['tiny-2'], C.coral, 0.17, -5); }
        else { mk(10, C['tiny-1'], C['minnow-3'], 0.18, -2.4); mk(9, C.tadpole, C.tadpole, 0.15, -1.2, true); }
      }
      // esca, amo, lenza e galleggiante visto da sotto
      {
        const lure = new T.Group(); scene.add(lure);
        mesh(keep(new T.TorusGeometry(0.075, 0.014, 6, 14, Math.PI * 1.5)), C.reel, lure, { p: [0, -0.04, 0], r: [0, 0, Math.PI * 0.75], ol: 0.008 });
        const bait = mesh(GEO.sph, C.bait, lure, { p: [0.02, -0.12, 0], s: [0.07, 0.09, 0.07], ol: 0.012 });
        mesh(GEO.sphLo, C.hi, bait, { p: [0.35, 0.3, 0.6], s: 0.25 });
        mesh(GEO.sphLo, C.rock, lure, { p: [0, 0.16, 0], s: 0.04, ol: 0.008 });
        bait.userData.dyn = true; bake(lure, false);
        U.lure = lure; U.bait = bait;
        const fl = new T.Group(); scene.add(fl);
        mesh(GEO.hemi, C['bob-1'], fl, { s: 0.12, ol: 0.012 }); mesh(GEO.hemi, C['bob-2'], fl, { s: 0.12, r: [Math.PI, 0, 0], ol: 0.012 });
        bake(fl, false); U.float = fl;
        const lg = keep(new T.BufferGeometry()); lg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(6), 3));
        const ln = new T.Line(lg, keep(new T.LineBasicMaterial({ color: C.line }))); ln.frustumCulled = false; scene.add(ln); U.line = ln;
      }
      // abitanti che non abboccano (contorno vivo)
      if (sea) { critCrab(U, -1.9, -0.9); critJelly(U, 2.2, -1.6, -3.5); critStar(U, 1.4, -1.2); critOcto(U, -3.4, -3.6); critTurtle(U, -6.5); critSeahorse(U, -2.6, -2.2, -1.6); critClam(U, 2.6, -2.6); }
      else { critFrog(U); critSnail(U, -1.5, -0.9); critSnail(U, 2.8, -3.2); critShrimp(U, 0.9, -1.1); critShrimp(U, -3, -2.6); critTurtle(U, -7); critClam(U, -2.6, -3.4); }
      U.cam = { x: 0, y: -2.5, z: 6.4, lx: 0, ly: -2.7 };
    }
    // un pesce per il pool sott'acqua (riusato per specie)
    // un pesce 3D per ogni pesce della logica (per id); quelli che spariscono tornano tra i pezzi di ricambio della specie
    function uwFish(id, sp) {
      const U = R3.uw;
      const cur = U.byId[id];
      if (cur) return cur;
      const sp2 = U.spare[sp] && U.spare[sp].pop();
      const e = sp2 || { sp, g: buildFish(sp, U.scene), yaw: 0, z: 0, seen: 0 };
      e.yaw = 0; e.fresh = true;
      U.byId[id] = e;
      return e;
    }
    // QA (Playwright): tavola delle 8 specie (4 × 2) su fondo neutro, di lato o in 3/4, ferme o che nuotano
    function drawLab(dt, t) {
      const Q = qa.lab;
      if (!R3.lab || R3.lab.of !== R3.scene) {
        const scene = new T.Scene(); scene.background = C['uw-2'].clone();
        scene.add(new T.HemisphereLight(C['uw-top'], C['uw-2'], (N.amb || 1.4) * 1.05));
        const sun = new T.DirectionalLight(C.sun, 1.3); sun.position.set(-3, 8, 6); scene.add(sun);
        const list = ['minnow', 'goldfish', 'catfish', 'koi', 'clown', 'puffer', 'tuna', 'golden'].map((sp, i) => {
          const g = buildFish(sp, scene); g.visible = true;
          g.position.set(((i % 4) - 1.5) * 1.8, i < 4 ? 0.95 : -0.95, 0);
          return { sp, g, i };
        });
        R3.lab = { of: R3.scene, scene, list, cam: new T.PerspectiveCamera(22, 1, 0.1, 100) };
      }
      const L2 = R3.lab, tt = Q.t != null ? Q.t : t;
      L2.cam.aspect = W / H; L2.cam.updateProjectionMatrix();
      const el = Q.elev || 0, d = 17;
      L2.cam.position.set(0, Math.sin(el) * d, Math.cos(el) * d); L2.cam.lookAt(0, 0, 0);
      for (const f of L2.list) {
        const row = f.i < 4 ? 0.95 : -0.95;
        f.g.visible = !Q.only || Q.only.includes(f.sp);
        const sk = (Q.k || 1.6) / 1.6;
        f.g.position.set(((f.i % 4) - 1.5) * 1.8 * sk, (el > 1 ? 0 : row) * sk, (el > 1 ? -row : 0) * sk);
        f.g.rotation.set(0, Q.yaw || 0, 0);
        f.g.scale.setScalar(Q.k || 1.6);
        labPose(f, tt, dt);
      }
      R3.renderer.render(L2.scene, L2.cam);
    }
    function labPose(f, t, dt) {
      const S = f.g.userData.sw, Q = qa.lab;
      if (Q.t != null) { S.ph = t * S.p.f * 6.2832 + f.i; S.pph = t * S.p.pf * 6.2832; S.e = Q.v != null ? Q.v : 0.8; S.bph = 1.5; S.cb = (Q.turn || 0) * -0.07 * S.len; }
      swimUp(f.g, Q.t != null ? 0 : dt, Q.v != null ? Q.v : 0.8, Q.hover || 0, 0, Q.turn || 0, 0);
    }
    // ---- abitanti (ognuno: un gruppo e una funzione up(t, dt) creata una volta) ----
    const eyes2 = (parent, x, y, z, k = 1, gap = 0.08) => [-1, 1].forEach((sd) => { mesh(GEO.sphLo, C.hi, parent, { p: [x + sd * gap * k, y, z], s: 0.05 * k }); mesh(GEO.sphLo, C.eye, parent, { p: [x + sd * gap * k, y, z + 0.03 * k], s: 0.032 * k }); });
    function addCrit(U, c) { bake(c.g, false); U.crit.push(c); }
    function critCrab(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.12, z); U.scene.add(g);
      mesh(GEO.sph, C.crab, g, { p: [0, 0.06, 0], s: [0.3, 0.17, 0.22], ol: 0.014 });
      [-1, 1].forEach((sd) => { mesh(GEO.cyl8, C.crab, g, { p: [sd * 0.08, 0.24, 0.1], s: [0.015, 0.14, 0.015] }); });
      eyes2(g, 0, 0.33, 0.12, 1, 0.08);
      mesh(GEO.sphLo, C.blush, g, { p: [-0.16, 0.06, 0.19], s: [0.05, 0.03, 0.01] }); mesh(GEO.sphLo, C.blush, g, { p: [0.16, 0.06, 0.19], s: [0.05, 0.03, 0.01] });
      const claws = [-1, 1].map((sd) => { const c = new T.Group(); c.userData.fixed = true; c.position.set(sd * 0.36, 0.08, 0.1); g.add(c); mesh(GEO.sph, C.crab, c, { s: [0.1, 0.08, 0.07], ol: 0.01 }); const top = new T.Group(); top.position.set(sd * 0.06, 0.04, 0); c.add(top); mesh(GEO.sph, C.crab, top, { p: [sd * 0.05, 0.02, 0], s: [0.07, 0.035, 0.05], ol: 0.008 }); return top; });
      // zampe: un gruppo per lato (si muovono insieme, in controfase)
      const legs = [-1, 1].map((sd) => { const lg = new T.Group(); lg.position.set(sd * 0.24, -0.04, 0); g.add(lg); for (let j = 0; j < 3; j++) mesh(GEO.cyl8, C.crab, lg, { p: [sd * (j * 0.04 - 0.04), 0, -0.06 + j * 0.06], s: [0.014, 0.16, 0.014], r: [Math.sin(j * 2) * 0.25, 0, sd * 0.9] }); return lg; });
      addCrit(U, { g, up(t) { g.position.x = x + Math.sin(t * 0.35) * 1.3; const w = Math.cos(t * 0.35) * 6; legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.3 * Math.min(1, Math.abs(w)); }); claws.forEach((c, i) => { c.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(t * 3 + i) * 0.25); }); } });
    }
    function critJelly(U, x, y, z) {
      const g = new T.Group(); g.position.set(x, y, z); U.scene.add(g);
      const mat = keep(new T.MeshToonMaterial({ color: C.jelly, gradientMap: R3.grad, transparent: true, opacity: 0.82 }));
      const bell = mesh(GEO.hemi, mat, g, { s: [0.34, 0.3, 0.34], ol: 0.012 });
      mesh(GEO.disc, mat, g, { r: [Math.PI, 0, 0], s: 0.34 });
      eyes2(g, 0, 0.1, 0.3, 0.9, 0.09);
      mesh(GEO.sphLo, C.blush, g, { p: [-0.17, 0.04, 0.29], s: [0.04, 0.022, 0.01] }); mesh(GEO.sphLo, C.blush, g, { p: [0.17, 0.04, 0.29], s: [0.04, 0.022, 0.01] });
      const ten = [];
      for (let i = 0; i < 5; i++) { const a = i * 1.26, tg = new T.Group(); tg.position.set(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18); g.add(tg); mesh(GEO.cyl8, mat, tg, { p: [0, -0.3, 0], s: [0.018, 0.6, 0.018] }); ten.push(tg); }
      addCrit(U, { g, up(t) { const p = Math.sin(t * 2.2); g.position.y = y + Math.sin(t * 0.5) * 0.45; bell.scale.set(0.34 * (1 + p * 0.07), 0.3 * (1 - p * 0.08), 0.34 * (1 + p * 0.07)); ten.forEach((tg, i) => { tg.rotation.z = Math.sin(t * 1.6 + i) * 0.3; tg.rotation.x = Math.cos(t * 1.3 + i) * 0.2; }); } });
    }
    function critStar(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.14, z); g.rotation.x = -1.1; U.scene.add(g);
      for (let i = 0; i < 5; i++) { const a = new T.Group(); a.userData.fixed = true; a.rotation.z = i * 1.2566; g.add(a); mesh(GEO.cone6, C.starfish, a, { p: [0, 0.14, 0], s: [0.07, 0.24, 0.035], ol: 0.01 }); }
      mesh(GEO.sphLo, C.starfish, g, { s: [0.09, 0.09, 0.04] });
      eyes2(g, 0, 0.02, 0.035, 0.6, 0.05);
      addCrit(U, { g, up(t) { g.rotation.z = Math.sin(t * 0.4) * 0.2; g.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04); } });
    }
    function critOcto(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.35, z); U.scene.add(g);
      const head = mesh(GEO.sph, C.octo, g, { p: [0, 0.28, 0], s: [0.34, 0.38, 0.32], ol: 0.016 }); head.userData.dyn = true;
      eyes2(g, 0, 0.24, 0.29, 1.3, 0.1);
      mesh(GEO.sphLo, C.blush, g, { p: [-0.2, 0.14, 0.27], s: [0.055, 0.03, 0.01] }); mesh(GEO.sphLo, C.blush, g, { p: [0.2, 0.14, 0.27], s: [0.055, 0.03, 0.01] });
      const tents = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * 0.9 + i * 0.36, root = new T.Group(); root.position.set(Math.cos(a) * 0.22, -0.02, Math.sin(-a) * 0.12 + 0.05); g.add(root);
        let par = root; const segs = [];
        for (let j = 0; j < 3; j++) { const sg = new T.Group(); if (j) { sg.userData.fixed = true; sg.position.x = 0.14 * (Math.cos(a) > 0 ? 1 : -1); sg.rotation.z = 0.3 * (Math.cos(a) > 0 ? 1 : -1); } par.add(sg); mesh(GEO.sphLo, C.octo, sg, { s: [0.09 - j * 0.02, 0.06 - j * 0.012, 0.06 - j * 0.012], ol: 0.008 }); segs.push(sg); par = sg; }
        tents.push(segs);
      }
      addCrit(U, { g, up(t) { head.scale.y = 0.38 * (1 + Math.sin(t * 1.8) * 0.05); tents.forEach((segs, i) => { segs[0].rotation.z = Math.sin(t * 2 + i * 0.9) * 0.45; }); } });
    }
    function critTurtle(U, z) {
      const g = new T.Group(); U.scene.add(g);
      const body = new T.Group(); body.userData.fixed = true; g.add(body);
      mesh(GEO.hemi, C.turtle, body, { s: [0.62, 0.36, 0.5], ol: 0.02 });
      mesh(GEO.disc, C['turtle-2'], body, { r: [Math.PI, 0, 0], s: [0.6, 1, 0.48] });
      for (let i = 0; i < 5; i++) { const a = i * 1.26; mesh(GEO.sphLo, C['turtle-2'], body, { p: [Math.cos(a) * 0.28, 0.28, Math.sin(a) * 0.22], s: [0.13, 0.05, 0.11] }); }
      mesh(GEO.sphLo, C['turtle-2'], body, { p: [0, 0.34, 0], s: [0.14, 0.06, 0.12] });
      const head = mesh(GEO.sph, C['turtle-2'], body, { p: [0.68, 0.06, 0], s: [0.2, 0.17, 0.17], ol: 0.012 });
      [-1, 1].forEach((sd) => { mesh(GEO.sphLo, C.eye, head, { p: [0.5, 0.25, sd * 0.6], s: [0.22, 0.28, 0.16] }); mesh(GEO.sphLo, C.hi, head, { p: [0.62, 0.42, sd * 0.68], s: 0.08 }); });
      const fl = [[0.36, 0.38], [0.36, -0.38], [-0.4, 0.34], [-0.4, -0.34]].map(([x, zz]) => { const f = new T.Group(); f.position.set(x, -0.02, zz); body.add(f); mesh(GEO.sph, C['turtle-2'], f, { p: [0, 0, Math.sign(zz) * 0.12], s: [0.14, 0.04, 0.2], ol: 0.008 }); return f; });
      body.rotation.y = -0.35;
      addCrit(U, { g, x: -9, up(t, dt) { this.x += dt * 0.42; if (this.x > 10) this.x = -10; g.position.set(this.x, -2.2 + Math.sin(t * 0.4) * 0.5, z); fl.forEach((f, i) => { f.rotation.x = Math.sin(t * 2.2 + (i % 2) * Math.PI) * 0.5 * (i < 2 ? 1 : 0.6); }); } });
    }
    function critSeahorse(U, x, y, z) {
      const g = new T.Group(); g.position.set(x, y, z); U.scene.add(g);
      [[0, 0.3, 0.13], [0.03, 0.12, 0.12], [0.02, -0.06, 0.1], [-0.02, -0.2, 0.075]].forEach(([px, py, rr]) => mesh(GEO.sph, C.seahorse, g, { p: [px, py, 0], s: rr, ol: 0.01 }));
      const hd = mesh(GEO.sph, C.seahorse, g, { p: [0.02, 0.46, 0], s: [0.12, 0.11, 0.1], ol: 0.01 });
      mesh(GEO.cyl8, C.seahorse, g, { p: [0.17, 0.43, 0], r: [0, 0, Math.PI / 2 - 0.2], s: [0.035, 0.16, 0.035], ol: 0.006 });
      mesh(GEO.sphLo, C.eye, hd, { p: [0.35, 0.15, 0.7], s: [0.28, 0.32, 0.18] }); mesh(GEO.sphLo, C.hi, hd, { p: [0.45, 0.3, 0.85], s: 0.11 });
      mesh(keep(new T.TorusGeometry(0.09, 0.03, 6, 12, Math.PI * 1.4)), C.seahorse, g, { p: [0.04, -0.33, 0], r: [0, 0, 0.6], ol: 0.008 });
      mesh(GEO.sphLo, C.coral, g, { p: [-0.12, 0.16, 0], s: [0.05, 0.1, 0.02] });
      addCrit(U, { g, up(t) { g.position.y = y + Math.sin(t * 1.1) * 0.18; g.rotation.z = Math.sin(t * 0.8) * 0.12; } });
    }
    function critClam(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.1, z); U.scene.add(g);
      mesh(GEO.hemi, C.shell, g, { r: [Math.PI, 0, 0], s: [0.32, 0.13, 0.26], ol: 0.014 });
      mesh(GEO.sph, C.pearl, g, { p: [0, 0.05, 0.02], s: 0.075, ol: 0.008 });
      const lid = new T.Group(); lid.position.set(0, 0, -0.24); g.add(lid);
      mesh(GEO.hemi, C.shell, lid, { p: [0, 0, 0.24], s: [0.32, 0.14, 0.26], ol: 0.014 });
      eyes2(lid, 0, 0.1, 0.48, 0.7, 0.07);
      addCrit(U, { g, up(t) { lid.rotation.x = -Math.max(0, Math.sin(t * 0.45)) * 0.75; } });
    }
    function critFrog(U) {
      const g = new T.Group(); U.scene.add(g);
      const body = new T.Group(); body.userData.fixed = true; body.rotation.y = Math.PI; g.add(body);
      mesh(GEO.sph, C.frog, body, { s: [0.3, 0.2, 0.24], ol: 0.014 });
      mesh(GEO.sph, C['frog-2'], body, { p: [0.04, -0.06, 0.05], s: [0.22, 0.12, 0.2] });
      [-1, 1].forEach((sd) => { mesh(GEO.sph, C.frog, body, { p: [0.16, 0.16, sd * 0.11], s: 0.09, ol: 0.01 }); mesh(GEO.sphLo, C.hi, body, { p: [0.2, 0.19, sd * 0.14], s: 0.06 }); mesh(GEO.sphLo, C.eye, body, { p: [0.23, 0.2, sd * 0.155], s: 0.035 }); });
      mesh(GEO.sphLo, C.blush, body, { p: [0.2, 0.02, 0.17], s: [0.05, 0.025, 0.02] });
      const legs = [-1, 1].map((sd) => { const l = new T.Group(); l.position.set(-0.24, -0.04, sd * 0.14); body.add(l); mesh(GEO.sph, C.frog, l, { p: [-0.12, 0, 0], s: [0.16, 0.05, 0.06], ol: 0.008 }); mesh(GEO.sph, C['frog-2'], l, { p: [-0.28, 0, sd * 0.04], s: [0.08, 0.025, 0.07] }); return l; });
      addCrit(U, { g, x: 8, up(t, dt) { const k = Math.max(0, Math.sin(t * 2.6)); this.x -= dt * (0.15 + k * 0.6); if (this.x < -9) this.x = 9; g.position.set(this.x, -0.75 + Math.sin(t * 0.7) * 0.2, -2.4); legs.forEach((l, i) => { l.rotation.y = (i ? 1 : -1) * (0.2 + k * 0.9); }); } });
    }
    function critSnail(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.08, z); U.scene.add(g);
      mesh(GEO.sph, C['snail-2'], g, { p: [0.05, 0, 0], s: [0.24, 0.07, 0.09], ol: 0.01 });
      mesh(keep(new T.TorusGeometry(0.09, 0.06, 8, 14)), C.snail, g, { p: [-0.04, 0.13, 0], ol: 0.01 });
      mesh(GEO.sphLo, C['snail-2'], g, { p: [-0.04, 0.13, 0.02], s: [0.05, 0.05, 0.06] });
      const st = [-1, 1].map((sd) => { const e = new T.Group(); e.position.set(0.24, 0.04, sd * 0.04); g.add(e); mesh(GEO.cyl8, C['snail-2'], e, { p: [0, 0.07, 0], s: [0.012, 0.14, 0.012] }); mesh(GEO.sphLo, C.eye, e, { p: [0, 0.15, 0], s: 0.025 }); return e; });
      addCrit(U, { g, up(t) { g.position.x = x + Math.sin(t * 0.08) * 0.5; st.forEach((e, i) => { e.rotation.z = -0.3 + Math.sin(t * 1.4 + i) * 0.2; }); } });
    }
    function critShrimp(U, x, z) {
      const g = new T.Group(); g.position.set(x, BED + 0.1, z); U.scene.add(g);
      const segs = [];
      for (let i = 0; i < 4; i++) segs.push(mesh(GEO.sph, C.shrimp, g, { p: [0.14 - i * 0.08, 0.02 - i * i * 0.012, 0], s: [0.06 - i * 0.006, 0.055 - i * 0.008, 0.045], ol: 0.007 }));
      mesh(GEO.cone6, C.shrimp, g, { p: [-0.2, -0.07, 0], r: [0, 0, 2.2], s: [0.05, 0.07, 0.02], ol: 0.006 });
      mesh(GEO.sphLo, C.eye, g, { p: [0.17, 0.05, 0.04], s: 0.02 });
      [-1, 1].forEach((sd) => mesh(GEO.cyl8, C.shrimp, g, { p: [0.26, 0.06, sd * 0.02], r: [0, sd * 0.3, -1.1], s: [0.004, 0.22, 0.004] }));
      const ph = x * 3;
      addCrit(U, { g, up(t) { const h = Math.max(0, Math.sin(t * 1.3 + ph)); g.position.y = BED + 0.1 + h * h * 0.45; g.position.x = x + Math.sin(t * 0.25 + ph) * 0.8; g.rotation.y = Math.cos(t * 0.25 + ph) > 0 ? 0 : Math.PI; } });
    }


    /* ---------- disegno ---------- */
    const v3 = () => new T.Vector3();
    const tmp = { a: null, b: null, look: null, tip: null, bob: null };
    let cam = { x: 0.1, y: 2.7, z: 5.6, lx: -0.3, ly: 0.2, lz: -10 };
    let dipT = 0, biteT = 0, castAnim = 0, castP = 0, heldT = 0, swayT = 0, camSnap = false;
    function bobberPos(t, out) {
      const ph = s.phase;
      if (ph === 'fly' && s.cast) {
        const u = clamp(s.pt / s.cast.fly, 0, 1), L0 = landPos(s.cast.d0, s.cast.x, tmp.l0 || (tmp.l0 = v3()));
        out.copy(tmp.tip).lerp(L0, u);
        out.y = lerp(tmp.tip.y, 0, u) + Math.sin(u * Math.PI) * (1.5 + s.cast.d0 * 0.18);
        return out;
      }
      if ((ph === 'wait' || ph === 'bite' || ph === 'fight') && s.d > 0) {
        const p = landPos(s.d, s.x, tmp.l1 || (tmp.l1 = v3()));
        out.set(p.x, wave(p.x, p.z, t), p.z);
        if (ph === 'wait' && dipT > 0) out.y -= Math.sin((1 - dipT / 0.45) * Math.PI) * 0.1;
        if (ph === 'bite') out.y += -0.13 + Math.sin(t * 30) * 0.03;
        if (ph === 'fight') out.y += -0.06 - s.T * 0.06;
        return out;
      }
      // appeso alla punta della canna
      out.copy(tmp.tip); out.y -= 0.75; out.x += Math.sin(t * 1.6) * 0.03;
      return out;
    }
    const landPos = (d, x, out) => (out || new T.Vector3()).set(HARI.x + x * Math.min(d * 0.3, 7), 0, HARI.z - 0.6 - d);
    function draw(dt, now) {
      if (!R3 || !R3.scene || !s) return;
      const t = now / 1000, rm = reduce();
      R3.water.uT.value = rm ? 0 : t;
      R3.clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.1); if (c.position.x > 200) c.position.x = -200; });
      if (R3.buoy) { R3.buoy.position.y = wave(9, -24, t) * 2; R3.buoy.rotation.z = Math.sin(t * 1.4) * 0.08; }
      if (R3.lamp) R3.lamp.intensity = 2.2 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13) * 0.08;
      dipT = Math.max(0, dipT - dt); biteT = Math.max(0, biteT - dt); castAnim = Math.max(0, castAnim - dt);
      // canna: angolo e curvatura
      const R = R3.rod, ph = s.phase, reel = lastReel;
      let elev = 58, bend = 0.06;
      const charging = drag.id !== null ? drag.p : hold.charge >= 0 ? chargeP() : 0;
      if (ph === 'aim') { elev = 58 + charging * 50; bend = -charging * 0.25; }
      if (ph === 'fly') { const u = clamp(s.pt / 0.25, 0, 1); elev = lerp(100, 28, u) + (u >= 1 ? 6 : 0); bend = 0.15; }
      if (ph === 'wait') elev = 40 + Math.max(0, reel) * 20;
      if (ph === 'bite') { elev = 40; bend = 0.25 + Math.sin(t * 28) * 0.08; }
      if (ph === 'fight') { elev = 38 + reel * 26; bend = 0.15 + s.T * 0.75 + Math.sin(t * 20) * 0.03 * s.T; }
      if (ph === 'caught') { elev = 78; bend = 0.35; }
      if (ph === 'over') { elev = 70; bend = 0.05; }
      const kk = Math.min(1, dt * (ph === 'fly' ? 22 : 8));
      R.elev = lerp(R.elev, elev, kk); R.bend = lerp(R.bend, bend, kk);
      const target = ph === 'wait' || ph === 'bite' || ph === 'fight' ? landPos(Math.max(1, s.d), s.x, tmp.tg || (tmp.tg = v3())) : null;
      const yaw = target ? Math.atan2(-(target.x - R.base.position.x), -(target.z - R.base.position.z)) * 0.8 : (ph === 'aim' ? -(drag.id !== null ? drag.aim : hold.aim) * 0.25 : 0);
      R.yaw = lerp(R.yaw, yaw, kk);
      R.base.rotation.set(-(90 - R.elev) * Math.PI / 180, R.yaw, 0, 'YXZ');
      R.segs.forEach((sg, i) => { if (i) sg.rotation.x = -R.bend * (0.15 + i * 0.25); });
      R.base.updateMatrixWorld(true);
      tmp.tip = tmp.tip || v3(); R.tip.getWorldPosition(tmp.tip);
      // galleggiante e lenza
      tmp.bob = tmp.bob || v3();
      const held = ph === 'caught' && s.fish ? fish3(s.fish.sp) : null;
      bobberPos(t, tmp.bob);
      if (held) {
        // il pesce appeso alla lenza, di fianco verso la camera (si vede l'occhione), un po' più grande
        heldT += dt;
        held.scale.setScalar(1.5);
        held.position.set(tmp.tip.x + 0.35, tmp.tip.y - 0.8, tmp.tip.z + 0.3);
        // appeso per la bocca (muso in su), si dimena a tratti
        const wr = rm ? 0 : Math.max(0, Math.sin(heldT * 2.2));
        held.rotation.set(0, 0.35 + Math.sin(heldT * 1.3) * 0.22, 0.55 + Math.sin(heldT * 9) * 0.06 * wr);
        swimUp(held, rm ? 0 : dt, 0.3, 0.3, 0, Math.sin(heldT * 9) * 7 * wr, 0.6 * wr);
        held.updateMatrixWorld(true);
        tmp.bob.copy(held.localToWorld((tmp.mouth || (tmp.mouth = v3())).set(held.userData.len * 1.02, 0, 0)));   // la lenza arriva alla bocca
      } else heldT = 0;
      R3.bob.visible = !held && ph !== 'over';
      R3.bob.position.copy(tmp.bob);
      R3.bob.rotation.z = ph === 'fight' ? Math.sin(t * 9) * 0.25 : Math.sin(t * 2) * 0.08;
      const pos = R3.line.geometry.attributes.position, n = pos.count;
      const a = tmp.tip, b = tmp.bob, dist = a.distanceTo(b);
      const slackK = ph === 'fight' ? clamp(1 - s.T * 1.4, 0.02, 1) : ph === 'aim' || ph === 'caught' || ph === 'over' ? 0 : ph === 'fly' ? 0.05 : 0.35;
      const sag = dist * 0.16 * slackK;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        pos.setXYZ(i, lerp(a.x, b.x, u), lerp(a.y, b.y, u) - Math.sin(u * Math.PI) * sag, lerp(a.z, b.z, u));
      }
      pos.needsUpdate = true;
      R3.line.visible = ph !== 'over';
      // acqua: cerchi attorno al galleggiante e scia del pesce
      R3.water.uBob.value.copy(tmp.bob);
      const ripT = ph === 'bite' ? 1 : ph === 'fight' ? 0.6 : ph === 'wait' ? 0.25 + (dipT > 0 ? 0.6 : 0) : 0;
      R3.water.uRip.value = lerp(R3.water.uRip.value, tmp.bob.y < 0.2 ? ripT : 0, Math.min(1, dt * 6));
      // ombra del pesce
      const fishOn = (ph === 'fight' || ph === 'bite') && s.d > 0;
      const shm = R3.shadow;
      if (fishOn) {
        const f = s.fish || {}, run = f.run || 0;
        shm.position.set(tmp.bob.x + Math.sin(t * 3) * 0.2, 0.025, tmp.bob.z - 0.55 - run * 0.3);
        shm.rotation.y = R.yaw + Math.sin(t * 4) * 0.3;
        shm.material.opacity = lerp(shm.material.opacity, 0.34, Math.min(1, dt * 4));
        R3.water.uFish.value.copy(shm.position); R3.water.uWake.value = run;
      } else { shm.material.opacity = lerp(shm.material.opacity, 0, Math.min(1, dt * 5)); R3.water.uWake.value = 0; }
      shm.visible = shm.material.opacity > 0.01;
      // Hari: respira, si piega quando tira, salta di gioia
      swayT += dt;
      const hb = R3.hariBody;
      const breathe = rm ? 0 : Math.sin(t * 2.2) * 0.012;
      hb.scale.set(1 - breathe, 1 + breathe, 1);
      hb.rotation.x = ph === 'fight' ? -0.05 + reel * 0.12 : 0;
      hb.rotation.z = ph === 'fight' ? Math.sin(t * 6) * 0.03 * s.T : 0;
      hb.position.y = ph === 'caught' || ph === 'over' ? Math.abs(Math.sin(t * 6)) * 0.08 * (rm ? 0 : 1) : 0;
      // pesce in mano (guardato da vicino), salto durante la lotta, ritorno in acqua
      Object.values(R3.fishes).forEach((fm) => { fm.visible = false; });
      if (held) {
        held.visible = true;
      }
      if (R3.jump && !held) {
        const J = R3.jump; J.t += dt;
        const u = J.t / J.dur;
        if (u >= 1) { splash(J.to, 8, 0.8); R3.jump = null; }
        else {
          const fm = fish3(J.sp); fm.visible = true; fm.scale.setScalar(1);
          fm.position.lerpVectors(J.from, J.to, u); fm.position.y = Math.sin(u * Math.PI) * J.h - 0.1;
          fm.rotation.set(Math.sin(J.t * 7) * 0.3, J.yaw, (0.5 - u) * 2.2);
          swimUp(fm, dt, 1, 0, 0, Math.sin(J.t * 15) * 10, 1);   // fuori dall'acqua si dimena
        }
      }
      if (R3.rel) {
        const Q = R3.rel; Q.t += dt;
        const u = Q.t / 0.9;
        if (u >= 1) { splash(Q.to, 12, 1); hearts(4); R3.rel = null; }
        else {
          const fm = fish3(Q.sp); fm.visible = true; fm.scale.setScalar(1.2);
          fm.position.lerpVectors(Q.from, Q.to, u); fm.position.y = lerp(Q.from.y, 0, u) + Math.sin(u * Math.PI) * 1.2;
          fm.rotation.set(0, -Math.atan2(Q.to.z - Q.from.z, Q.to.x - Q.from.x), 0.5 - u * 1.9);
          swimUp(fm, dt, 1, 0, 0.5, 0, 0);
        }
      }
      // goccioline e cerchi
      R3.drops.forEach((d) => {
        if (d.life <= 0) return;
        d.life -= dt; d.v.y -= 9.8 * dt; d.m.position.addScaledVector(d.v, dt);
        if (d.life <= 0 || d.m.position.y < -0.05) { d.life = 0; d.m.visible = false; }
      });
      R3.rings.forEach((r) => {
        if (r.life <= 0) return;
        r.life -= dt * 1.1;
        const k = 1 - r.life;
        r.m.scale.setScalar(0.2 + k * r.max * 1.4); r.m.material.opacity = Math.max(0, r.life) * 0.8;
        if (r.life <= 0) r.m.visible = false;
      });
      // camera: dietro Hari; segue un po' il galleggiante e si avvicina al pesce preso
      const land = W > H * 1.1;
      let cx = land ? 0.7 : 0.1, cy = land ? 2.1 : 2.7, cz = land ? 3.9 : 5.6, lx = -0.3, ly = land ? 0.6 : 0.2, lz = -11;
      if (target || ph === 'fly') { const tb = ph === 'fly' ? landPos(s.cast.d0, s.cast.x, tmp.l0) : target; lx = lerp(-0.3, tb.x, 0.45); lz = Math.min(-8, tb.z * 0.7); ly = land ? 0.5 : 0.15; }
      if (held) { cx = 1.25; cy = 2.15; cz = land ? 1.9 : 2.3; lx = held.position.x + (land ? 0.55 : 0); ly = held.position.y - (land ? 0.05 : 0.35); lz = held.position.z; }
      const ck = camSnap ? 1 : Math.min(1, dt * (held ? 3 : 1.6));
      camSnap = false;
      cam.x = lerp(cam.x, cx, ck); cam.y = lerp(cam.y, cy, ck); cam.z = lerp(cam.z, cz, ck);
      cam.lx = lerp(cam.lx, lx, ck); cam.ly = lerp(cam.ly, ly, ck); cam.lz = lerp(cam.lz, lz, ck);
      const shake = !rm && ph === 'bite' ? Math.sin(t * 40) * 0.012 : 0;
      R3.camera.position.set(cam.x + shake, cam.y, cam.z);
      R3.camera.lookAt(cam.lx, cam.ly, cam.lz);
      R3.renderer.render(R3.scene, R3.camera);
    }
    // bollicine: n a partire da (x, y, z), sparse di r metri
    function bubbles(x, y, z, n, rr = 0.15, big = 1) {
      const B = R3 && R3.uw && R3.uw.bub;
      if (!B) return;
      for (let j = 0; j < n; j++) {
        const i = B.next; B.next = (B.next + 1) % B.n;
        B.p[i * 3] = x + (Math.random() - 0.5) * rr * 2; B.p[i * 3 + 1] = y + (Math.random() - 0.5) * rr; B.p[i * 3 + 2] = z + (Math.random() - 0.5) * rr;
        B.sz[i] = (0.05 + Math.random() * 0.07) * big; B.vy[i] = 0.6 + Math.random() * 0.8; B.life[i] = 2 + Math.random() * 3; B.wob[i] = Math.random() * 6;
      }
    }
    const uwTmp = { v: null, w: null };
    // dove sta un punto 3D sullo schermo (px, nel riquadro): scrive in out { x, y, ok }
    function toScreen(x, y, z, out) {
      const v = uwTmp.v || (uwTmp.v = v3());
      v.set(x, y, z).project(R3.camera);
      out.x = (v.x * 0.5 + 0.5) * W; out.y = (-v.y * 0.5 + 0.5) * H; out.ok = v.z < 1 && v.z > -1;
      return out;
    }
    // dal punto dello schermo al piano dell'esca (z = 0) → coordinate della logica { x, y }
    function fromScreen(px, py, out) {
      const v = uwTmp.v || (uwTmp.v = v3()), w = uwTmp.w || (uwTmp.w = v3());
      const cam = R3.camera;
      v.set((px / W) * 2 - 1, -(py / H) * 2 + 1, 0.5).unproject(cam);
      w.copy(v).sub(cam.position);
      if (Math.abs(w.z) < 1e-6) return null;
      const k = -cam.position.z / w.z;
      out.x = clamp((cam.position.x + w.x * k) / UWX, -1, 1);
      out.y = clamp((UWY0 - (cam.position.y + w.y * k)) / UWY, P.Y_TOP, P.Y_BOT);
      return out;
    }
    const tagPt = { x: 0, y: 0, ok: false };
    function drawUW(dt, t) {
      const U = R3.uw, rm = reduce();
      const ph = s.phase, lu = s.lu || { x: 0, y: 0.45 };
      const tt = rm ? 0 : t;
      for (let i = 0; i < U.mats.length; i++) U.mats[i].uniforms.uT.value = tt;
      U.diveK = Math.min(1, (U.diveK || 0) + dt / (rm ? 0.01 : 1.5));
      const ease = 1 - Math.pow(1 - U.diveK, 3);
      const LX = uwX(lu.x), LY = uwY(lu.y);
      // camera: segue un po' l'esca (parallasse), scende dalla superficie al tuffo
      const land = W > H * 1.1;
      const cyT = -2.55 + (LY + 2.55) * 0.18, czT = land ? 5.2 : 6.4;
      const c = U.cam, ck = Math.min(1, dt * 2.2);
      c.x = lerp(c.x, LX * 0.3, ck); c.y = lerp(c.y, cyT, ck);
      const shake = !rm && ph === 'bite' ? Math.sin(t * 38) * 0.03 : 0;
      R3.camera.position.set(c.x + shake, lerp(-0.15, c.y, ease), czT + (1 - ease) * 1.2);
      R3.camera.lookAt(c.x * 1.2, lerp(-0.6, c.y - 0.15, ease), 0);
      R3.camera.updateMatrixWorld();
      // esca, galleggiante (sulla superficie, sopra l'esca) e lenza
      const bite = ph === 'bite';
      U.lure.position.set(LX, LY + (bite ? Math.sin(t * 30) * 0.03 : 0), 0);
      U.lure.rotation.z = Math.sin(t * 2.4) * 0.15 + clamp((lu.tx - lu.x) * 3, -0.6, 0.6);
      U.bait.rotation.z = Math.sin(t * 7) * 0.25;
      const fx = LX * 0.8 + 0.25, fy = bite ? -0.32 + Math.sin(t * 26) * 0.05 : -0.09 + Math.sin(t * 1.7) * 0.02;
      U.float.position.set(fx, fy, 0.1);
      const lp = U.line.geometry.attributes.position;
      lp.setXYZ(0, fx, fy - 0.1, 0.1); lp.setXYZ(1, LX, LY + 0.2, 0); lp.needsUpdate = true;
      // pesci della logica
      const sw = s.sw || [];
      const fr = ++U.frame;
      for (let i = sw.length; i < U.tags.length; i++) tagSet(i, '');
      for (let i = 0; i < sw.length; i++) {
        const w = sw[i];
        const e = uwFish(w.id, w.sp), g = e.g;
        e.seen = fr;
        g.visible = true;
        const near = w.st === 'curious' || w.st === 'circle' || w.st === 'sniff' || w.st === 'bite';
        const zT = near ? 0.05 : ((i % 3) - 1) * 0.6 - 0.3;
        if (e.fresh) { e.z = zT; e.yaw = w.h > 0 ? -0.25 : 0.25 - Math.PI; e.yawV = 0; e.px = w.x; e.py = w.y; e.vx = 0; e.vy = 0; e.roll = 0; e.pitch = 0; e.fresh = false; }
        e.z = lerp(e.z, zT, Math.min(1, dt * 1.5));
        // velocità dalla logica (m/s, smussata)
        if (dt > 0) { const k = Math.min(1, dt * 6); e.vx = lerp(e.vx, (w.x - e.px) * UWX / dt, k); e.vy = lerp(e.vy, -(w.y - e.py) * UWY / dt, k); }
        e.px = w.x; e.py = w.y;
        const flee = w.st === 'flee' ? 1 : 0, hover = w.st === 'sniff' || w.st === 'bite' ? 1 : 0;
        // virata con inerzia (molla critica; nella fuga è uno scatto e il corpo si piega a C); il muso passa verso la camera
        const yawT = w.h > 0 ? -0.25 : 0.25 - Math.PI, kS = flee ? 260 : 26, cS = 2 * Math.sqrt(kS);
        for (let n = Math.min(8, Math.ceil(dt / 0.01)), j = 0; j < n; j++) { const h2 = dt / n; e.yawV += (kS * (yawT - e.yaw) - cS * e.yawV) * h2; e.yaw += e.yawV * h2; }
        const spd = Math.hypot(e.vx, e.vy), v = Math.min(1.2, spd / 0.4);
        // in curva si inclina, salendo o scendendo alza o abbassa il muso
        e.roll = lerp(e.roll, clamp(-e.yawV * 0.1, -0.5, 0.5), Math.min(1, dt * 6));
        e.pitch = lerp(e.pitch, clamp(Math.atan2(e.vy, Math.abs(e.vx) + 0.12) * 0.6, -0.5, 0.5), Math.min(1, dt * 4));
        swimUp(g, rm ? 0 : dt, v, Math.max(hover, spd < 0.06 ? 0.7 : 0), flee, e.yawV, w.st === 'bite' ? 0.5 : 0);
        // colpi di coda a impulsi: un piccolo slancio in avanti, poi plana
        const surge = rm ? 0 : -Math.cos(g.userData.sw.bph) * 0.025 * Math.min(1, v);
        g.position.set(uwX(w.x) + Math.cos(e.yaw) * surge, uwY(w.y) + Math.sin(t * 1.3 + i) * 0.012 * (1 - Math.min(1, v)), e.z - Math.sin(e.yaw) * surge);
        g.scale.setScalar(1.15);
        g.rotation.set(e.roll, e.yaw, e.pitch + (w.st === 'sniff' ? Math.sin(t * 14) * 0.05 : 0));
        // indicatore sopra la testa: '?' curioso, cuore (più grande con l'interesse), '!' spaventato
        const kind = w.st === 'flee' ? 'x' : w.st === 'bite' ? 'xb' : w.st === 'curious' ? 'q' : (w.st === 'circle' || w.st === 'sniff') ? 'h' : '';
        if (kind) { toScreen(g.position.x, g.position.y + 0.42, g.position.z, tagPt); tagSet(i, tagPt.ok ? kind : '', tagPt.x, tagPt.y, w.int); }
        else tagSet(i, '');
        if (!rm && Math.random() < dt * 0.25) bubbles(g.position.x + (w.h > 0 ? 0.4 : -0.4), g.position.y + 0.05, g.position.z, 1, 0.02, 0.6);
      }
      for (const k in U.byId) { const e = U.byId[k]; if (e.seen !== fr) { e.g.visible = false; (U.spare[e.sp] = U.spare[e.sp] || []).push(e); delete U.byId[k]; } }
      // banchi di pesciolini: seguono un capofila, si sparpagliano quando l'esca va troppo veloce
      const dm = R3.dummy || (R3.dummy = new T.Object3D());
      for (let si = 0; si < U.schools.length; si++) {
        const sc = U.schools[si];
        sc.scat = Math.max(0, sc.scat - dt * 0.6);
        const a = tt * 0.16 * sc.sp + sc.ph;
        const hx = Math.sin(a) * 5.2, hy = sc.y + Math.sin(a * 2.3) * 0.5;
        const dir = Math.cos(a) >= 0 ? 1 : -1;
        const sp = 1 + sc.scat * 2.2;
        for (let i = 0; i < sc.n; i++) {
          const of = sc.off[i];
          dm.position.set(hx + of[0] * sp + Math.sin(tt * 2 + of[3]) * 0.08, hy + of[1] * sp + Math.cos(tt * 2.6 + of[3]) * 0.06, sc.z + of[2] * sp);
          // ognuno vira col suo ritardo (molla) e scodinzola col suo ritmo: il banco non si muove all'unisono
          const kY = (14 + of[4] * 10) * (1 + sc.scat * 3), yT = dir > 0 ? -0.15 : 0.15 - Math.PI, h2 = Math.min(dt, 0.05);
          of[6] += (kY * (yT - of[5]) - 2 * Math.sqrt(kY) * of[6]) * h2; of[5] += of[6] * h2;
          const wig = Math.sin(tt * (sc.tad ? 9 : 11) * of[4] * (1 + sc.scat * 1.5) + of[3]) * (sc.tad ? 0.45 : 0.22);
          dm.rotation.set(0, of[5] + wig, Math.sin(tt * 1.7 * of[4] + of[3]) * 0.1);
          dm.scale.set(sc.k * (sc.tad ? 0.8 : 1), sc.k * (sc.tad ? 1 : 0.6), sc.k * 0.45);
          dm.updateMatrix(); sc.im.setMatrixAt(i, dm.matrix);
        }
        sc.im.instanceMatrix.needsUpdate = true;
      }
      // abitanti
      for (let i = 0; i < U.crit.length; i++) U.crit[i].up(tt, rm ? 0 : dt);
      // bollicine: salgono ondeggiando; qualcuna nasce dal fondo
      const B = U.bub;
      if (!rm && Math.random() < dt * 2.2) bubbles((Math.random() - 0.5) * 8, BED + 0.2, -1 - Math.random() * 5, 1, 0.05, 0.8);
      for (let i = 0; i < B.n; i++) {
        if (B.life[i] <= 0) { if (B.sz[i] !== 0) B.sz[i] = 0; continue; }
        B.life[i] -= dt;
        B.p[i * 3 + 1] += B.vy[i] * dt; B.p[i * 3] += Math.sin(t * 3 + B.wob[i]) * dt * 0.12;
        if (B.p[i * 3 + 1] > -0.05 || B.life[i] <= 0) { B.life[i] = 0; B.sz[i] = 0; }
      }
      B.g.attributes.position.needsUpdate = true; B.g.attributes.aS.needsUpdate = true;
      R3.renderer.render(U.scene, R3.camera);
    }
    // indicatori DOM sopra i pesci
    function tagSet(i, kind, x, y, k) {
      if (!tagsEl) return;
      let e = R3.uw.tags[i];
      if (!e) { e = R3.uw.tags[i] = { el: document.createElement('div'), kind: '' }; e.el.className = 'fi-tg'; tagsEl.appendChild(e.el); }
      if (e.kind !== kind) {
        e.kind = kind;
        e.el.className = 'fi-tg' + (kind ? ' on ' + kind[0] : '') + (kind === 'xb' ? ' big' : '');
        e.el.innerHTML = kind === 'q' ? TAG_Q : kind === 'h' ? HEART : kind ? TAG_X : '';
      }
      if (!kind) return;
      e.el.style.transform = `translate(${f1(x)}px, ${f1(y)}px)`;
      if (kind === 'h') { const kk = f1(0.45 + 0.6 * clamp(k, 0, 1)); if (e.k !== kk) { e.k = kk; e.el.style.setProperty('--k', kk); e.el.classList.toggle('full', k >= 0.99); } }
    }
    function clearTags() { if (R3 && R3.uw) R3.uw.tags.forEach((e) => { if (e.kind) { e.kind = ''; e.el.className = 'fi-tg'; e.el.innerHTML = ''; } }); }
    // tuffo: velo di bollicine e cambio di scena a metà
    let viewT = 0, viewTo = 'top';
    function goView(v, now) {
      if (viewTo === v && (view === v || !now)) return;
      viewTo = v;
      clearTimeout(viewT);
      const rm = reduce();
      if (diveEl) { diveEl.classList.remove('go'); void diveEl.offsetWidth; diveEl.classList.add('go'); }
      const swap = () => {
        view = v; wrap.dataset.view = v;
        if (v === 'uw' && R3 && R3.uw) { R3.uw.diveK = now ? 1 : 0; R3.uw.cam.x = uwX(s.lu ? s.lu.x : 0) * 0.3; R3.uw.cam.y = -2.5; bubbles(uwX(s.lu ? s.lu.x : 0), -0.6, 0.2, 18, 0.5, 1.2); }
        if (v !== 'uw') { clearTags(); camSnap = true; }
      };
      if (now || rm) swap(); else viewT = setTimeout(() => { if (alive) swap(); }, 420);
    }
    /* ---- Hari nel riquadro: espressione voluta dalla logica (P.mood) o da un evento per un tempo fisso, con isteresi ---- */
    const face = { m: P.newMood('wait'), tr: '', trT: 0, shown: '' };
    function faceEvent(m, sec) { face.tr = m; face.trT = sec; }
    function faceStep(dt) {
      if (!faceEl || !s) return;
      if (face.trT > 0) face.trT -= dt;
      const want = face.trT > 0 ? face.tr : P.mood(s);
      const cur = P.moodStep(face.m, want, dt);
      if (cur !== face.shown) {
        face.shown = cur;
        faceEl.dataset.m = cur;
        faceEl.innerHTML = hariFace(cur);
        const sv = faceEl.firstChild; if (sv && !reduce()) sv.classList.add('pop');
      }
    }
    function hearts(n) {
      if (!heartsEl) return;
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div');
        d.innerHTML = HEART;
        const svg = d.firstChild;
        svg.style.left = `${45 + (Math.random() - 0.5) * 30}%`; svg.style.top = `${46 + Math.random() * 10}%`; svg.style.animationDelay = `${i * 0.12}s`;
        heartsEl.appendChild(svg);
        later(() => svg.remove(), 2000 + i * 120);
      }
    }
    function measure() {
      if (!stage) return;
      W = stage.clientWidth || 300; H = stage.clientHeight || 400;
      if (!R3) return;
      R3.renderer.setSize(W, H, false);
      R3.camera.aspect = W / H;
      // in orizzontale campo più stretto (il lago si vede in largo), in verticale più alto
      R3.camera.fov = W > H ? 46 : 58;
      if (wrap) wrap.classList.toggle('wide', W > H * 1.1);
      R3.camera.updateProjectionMatrix();
      if (R3.uw && R3.uw.bub) R3.uw.bub.m.uniforms.uScale.value = (H * pr) / (2 * Math.tan((R3.camera.fov * Math.PI) / 360));
      checkTurn();
    }

    /* ---------- indicatori ---------- */
    let lastReel = 0, hudKey = '';
    function hud() {
      if (!s || !gaugeEl) return;
      const ph = s.phase, fight = ph === 'fight';
      if (wrap.dataset.phase !== ph) wrap.dataset.phase = ph;
      gaugeEl.classList.toggle('off', !fight);
      const z = P.zones(s);
      const key = `${z.tMin}|${z.tMax}`;
      if (key !== hudKey) {
        hudKey = key;
        const top = (v) => `${f1((1 - v / 1.2) * 100)}%`;
        okEl.style.top = top(z.tMax); okEl.style.bottom = `${f1((z.tMin / 1.2) * 100)}%`;
        hotEl.style.height = top(z.tMax);
      }
      const Tv = fight ? s.T : 0;
      markEl.style.top = `${f1((1 - clamp(Tv, 0, 1.2) / 1.2) * 100)}%`;
      gaugeEl.setAttribute('aria-valuenow', String(Math.round(Tv * 100)));
      brkEl.style.width = `${f1(s.brk * 100)}%`; slkEl.style.width = `${f1(s.slk * 100)}%`;
      gaugeEl.classList.toggle('danger', fight && s.T > z.tMax);
      gaugeEl.classList.toggle('loose', fight && s.T < z.tMin);
      distEl.textContent = `${Math.max(0, Math.round(s.d))} m`;
      castLabel(ph === 'aim');
      pullBtn.classList.toggle('call', ph === 'bite');
      if (phoneEl) phoneEl.style.transform = `rotate(${f1(-clamp(sensor.pitch - sensor.zero, -40, 40))}deg)`;
      // suggerimento della fase
      const tilt = mode() === 'tilt';
      let h = '';
      if (ph === 'aim') { h = tilt ? L('fi_cast_tilt') : L('fi_cast_drag'); if (hold.charge >= 0 || drag.id !== null) h = ''; }
      else if (ph === 'wait') h = tilt && sensor.calib > performance.now() ? L('fi_calib') : s.pt < 7 || performance.now() - scareAt < 3000 ? L('fi_lure') : '';
      else if (ph === 'fight') h = s.pt < 4 ? L('fi_fight') : '';
      hint(h);
      if (hold.charge >= 0) { powerEl.hidden = false; setPower(chargeP()); }
      if (motionBtn) motionBtn.hidden = motionBtn.hidden || ph !== 'aim';
    }

    /* ---------- eventi della logica ---------- */
    let reelClick = 0, wasReel = false, rareSaid = false, scareSaid = 0, scareAt = -1e9;
    function dispatch(e) {
      switch (e.type) {
        case 'cast': asfx('whoosh', e.p); break;
        case 'land': {
          const p = landPos(s.d, s.x); splash(p, 6, 0.6); asfx('splash', 0.4);
          if (mode() === 'tilt') calibrate(500);
          lt.on = false; rareSaid = false;
          later(() => { if (s && s.phase === 'wait') { goView('uw'); later(() => asfx('bubble'), 380); } }, 380);
          break;
        }
        case 'scare': {
          const w = s.sw && s.sw[e.i];
          if (w && R3 && R3.uw) bubbles(uwX(w.x), uwY(w.y), 0, 9, 0.25, 1);
          if (R3 && R3.uw) R3.uw.schools.forEach((sc) => { sc.scat = 1; });
          asfx('fishScare'); buzz(12);
          faceEvent('sad', 1.1);
          const now = performance.now(); scareAt = now;
          if (now - scareSaid > 4500) { scareSaid = now; say(L('fi_scared'), 'small'); }
          break;
        }
        case 'curious': if (P.SP[e.sp].rar >= 3 && !rareSaid) { rareSaid = true; say(L('fi_rare'), 'small'); } break;
        case 'love': asfx('blip'); break;
        case 'far': say(L('fi_far'), 'small'); break;
        case 'nibble': dipT = 0.45; ring(landPos(s.d, s.x), 0.7); sfx('plop'); buzz(15); if (R3 && R3.uw && s.lu) bubbles(uwX(s.lu.x), uwY(s.lu.y), 0, 3, 0.08, 0.7); break;
        case 'bite': biteT = 0.6; splash(landPos(s.d, s.x), 8, 0.8); asfx('fishBite'); say(L('fi_bite')); buzz([60, 40, 90]); faceEvent(P.SP[e.sp].rar >= 3 ? 'wow' : 'surprised', 0.9);
          if (R3 && R3.uw && s.lu) bubbles(uwX(s.lu.x), uwY(s.lu.y), 0, 10, 0.2, 1); break;
        case 'early': say(L('fi_early'), 'small'); react('oops'); faceEvent('sad', 1.4); break;
        case 'missed': say(L('fi_missed'), 'small'); faceEvent('sad', 1.6); break;
        case 'hook': sfx('pick'); asfx('splash', 0.6); buzz(30); goView('top'); changed(true); break;
        case 'run': {
          const p = landPos(s.d, s.x);
          splash(p, 7, 0.7);
          if (s.d > 3 && !R3.jump && (e.qa || Math.random() < 0.45) && !reduce()) {
            const fr = p.clone(), to = p.clone().add(new T.Vector3((Math.random() - 0.5) * 2, 0, -1.2));
            R3.jump = { sp: s.fish.sp, t: 0, dur: 0.75, from: fr, to, h: 0.9, yaw: Math.atan2(to.z - fr.z, to.x - fr.x) * -1 };
          }
          break;
        }
        case 'snap': asfx('twang'); say(L('fi_snap'), 'small'); react('oops'); buzz(120); faceEvent('sad', 2.2); changed(true); break;
        case 'slack': sfx('lightOff'); say(L('fi_slack'), 'small'); react('oops'); faceEvent('sad', 2.2); changed(true); break;
        case 'reel': goView('top'); changed(true); break;
        case 'catch': faceEvent(P.SP[e.sp].rar >= 3 ? 'wow' : 'win', P.SP[e.sp].rar >= 3 ? 1.2 : 0.1); sfx('cupDone'); splash(tmp.bob || landPos(1, 0), 10, 0.9); asfx('splash', 0.8); react('happy'); buzz([30, 30, 30]); showCaught(); changed(true); break;
        default: break;
      }
    }
    function doCast(p, aim) {
      if (!s || s.phase !== 'aim' || paused) return;
      const ev = P.cast(s, p, aim);
      castP = p; castAnim = 0.4;
      ev.forEach(dispatch);
      sensor.det = P.newFlick();
      renderMode();
      changed(true);
    }
    function changed(force) {
      const now = performance.now();
      if (!force && now - lastChanged < 1500) return;
      lastChanged = now;
      ctx.changed();
    }

    /* ---------- pesce preso: guardalo, fotografalo, rimettilo in acqua ---------- */
    function showCaught() {
      const f = s.fish;
      if (!f) return;
      const res = P.albumAdd(album, f, false);
      album = res.album; sset('fish:album', album);
      photoTaken = false;
      const sp = P.SP[f.sp];
      caughtEl.innerHTML = `<div class="fi-card" role="dialog" aria-label="${spName(f.sp)}">
          <span class="fi-new"${res.isNew ? '' : ' hidden'}>${L('fi_new')}</span>
          ${fishSvg(f.sp)}<h3>${spName(f.sp)}</h3>
          <div class="fi-meta"><span>${fmtW(f.g)}</span>${stars(sp.rar)}</div>
          <div class="fi-acts"><button class="fi-act fi-photo" type="button">${CAM}<span>${L('fi_photo')}</span></button>
          <button class="fi-act main fi-rel" type="button">${HEART}<span>${L('fi_release')}</span></button></div></div>`;
      caughtEl.hidden = false; wrap.classList.add('hold');
      paintGoal();
      const ph = caughtEl.querySelector('.fi-photo'), rel = caughtEl.querySelector('.fi-rel');
      ph.onclick = () => {
        if (photoTaken) return;
        photoTaken = true;
        flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
        asfx('shutter');
        album = P.albumAdd(album, { sp: f.sp, g: 0 }, true).album; album[f.sp].n--; sset('fish:album', album);
        ph.disabled = true;
        say(L('fi_photoOk'), 'small');
      };
      rel.onclick = () => releaseFish();
      later(() => { if (caughtOpen()) rel.focus({ preventScroll: true }); }, 300);
    }
    function releaseFish() {
      if (!s || s.phase !== 'caught') return;
      const sp = s.fish.sp;
      const from = R3 && R3.fishes[sp] ? R3.fishes[sp].position.clone() : null;
      const ev = P.release(s, photoTaken);
      caughtEl.hidden = true; caughtEl.innerHTML = ''; wrap.classList.remove('hold');
      if (R3 && from) R3.rel = { sp, t: 0, from, to: landPos(2.2, 0.3) };
      else hearts(4);
      sfx('heart');
      say(L('fi_bye'), 'small');
      const tg = cfg.target && sp === cfg.target;
      paintGoal(tg ? 't' : 'n');
      stage.focus({ preventScroll: true });
      if (ev.some((x) => x.type === 'win')) {
        hint('');
        react('happy');
        later(() => ctx.win(), 1700);
      }
      changed(true);
    }

    /* ---------- album ---------- */
    function openAlbum() {
      if (!albumEl) return;
      if (!paused && s && s.phase === 'fight') pause();
      const cells = P.SPECIES.map((x) => {
        const e = album[x.id];
        return `<div class="fi-cell${e ? '' : ' unseen'}">${e && e.photo ? `<span class="fi-cam">${CAM}</span>` : ''}${fishSvg(x.id)}
          <b>${e ? spName(x.id) : '???'}</b>${stars(x.rar)}<span>${e ? `× ${e.n} · ${L('best')} ${fmtW(e.best)}` : L('fi_unseen')}</span></div>`;
      }).join('');
      albumEl.innerHTML = `<h3>${L('fi_album')}</h3><div class="fi-grid">${cells}</div><button class="fi-act main fi-close" type="button">${L('er_close')}</button>`;
      const cl = albumEl.querySelector('.fi-close');
      cl.onclick = () => { sfx('tap'); closeAlbum(); };
      albumEl.hidden = false;
      cl.focus({ preventScroll: true });
    }
    function closeAlbum() { if (albumEl) { albumEl.hidden = true; albumEl.innerHTML = ''; stage.focus({ preventScroll: true }); } }

    /* ---------- orientamento e schermo intero ---------- */
    const landscape = () => (G.innerWidth || 1) > (G.innerHeight || 1);
    const inFull = () => { const f = fsEl(); return !!(f && wrap && f.contains(wrap)); };
    function checkTurn() {
      if (!turnEl) return;
      // coi sensori serve il telefono in verticale (il lato lungo fa da canna): a schermo intero lo si chiede
      const need = inFull() && coarse() && landscape() && pref === 'tilt' && sensorLive();
      if (need && turnEl.hidden) { turnEl.hidden = false; if (!paused) pause(); pauseEl.hidden = true; }
      else if (!need && !turnEl.hidden) { turnEl.hidden = true; if (paused) pauseEl.hidden = false; }
    }
    function onFull() {
      if (!alive) return;
      try {
        const so = G.screen && G.screen.orientation;
        if (inFull() && coarse() && so && so.lock) so.lock('portrait').catch(() => {});
        else if (!fsEl() && so && so.unlock) so.unlock();
      } catch (e) { /* non supportato */ }
      later(() => { measure(); renderMode(); }, 120);
    }

    /* ---------- ciclo ---------- */
    function loop(nowMs) {
      if (!alive) return;
      if (!el.isConnected) { detach(); return; }
      const dt = last ? Math.min(0.1, (nowMs - last) / 1000) : 0;
      last = nowMs;
      if (nowMs - themeAt > 1000) { themeAt = nowMs; if (readTheme()) { buildScene(); measure(); } }
      if (dt > 0) {
        if (dt > 1 / 36) { slowF++; fastF = 0; } else if (dt < 1 / 55) { fastF++; slowF = Math.max(0, slowF - 1); }
        if (slowF > 45 && pr > 0.7) { pr = Math.max(0.7, pr - 0.25); R3.renderer.setPixelRatio(pr); measure(); slowF = 0; }
        else if (fastF > 400 && pr < Math.min(prMax(), G.devicePixelRatio || 1)) { pr = Math.min(prMax(), pr + 0.25); R3.renderer.setPixelRatio(pr); measure(); fastF = 0; }
      }
      if (!paused && dt > 0 && !P.isOver(s) && !caughtOpen() && !albumOpen() && !qa.hold) {
        lastReel = qa.reel != null ? qa.reel : reelInput(dt);
        const lu = qa.lure || lureInput(dt, lastReel);
        const ev = P.step(s, dt, lu ? { reel: lastReel, lx: lu.x, ly: lu.y } : { reel: lastReel });
        ev.forEach(dispatch);
        if (s.phase !== 'wait' && s.phase !== 'bite' && view === 'uw' && !viewPending()) goView('top', true);
        if (s.phase === 'fight') {
          // mulinello: clic più fitti quando si tira forte
          if (lastReel > 0.08) { reelClick -= dt; if (reelClick <= 0) { asfx('reel', lastReel); reelClick = 0.16 - lastReel * 0.1; } }
          changed(false);
        }
        wasReel = lastReel > 0.08;
      }
      if (R3 && !qa.noDraw) {
        const f0 = performance.now();
        if (qa.lab && R3.scene) drawLab(dt, nowMs / 1000);
        else if (view === 'uw' && R3.uw && s.lu) drawUW(dt, nowMs / 1000); else draw(dt, nowMs);
        if (qa.sync) R3.renderer.getContext().finish();
        const fm = performance.now() - f0;
        perf.n++; perf.sum += fm; if (fm > perf.max) perf.max = fm;
      }
      if (!paused) faceStep(dt);
      hud();
      raf = paused ? 0 : requestAnimationFrame(loop);
    }
    const perf = { n: 0, sum: 0, max: 0 };
    const viewPending = () => viewTo !== view;
    function start() { if (!raf && alive) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function pause() {
      if (paused || !s || P.isOver(s)) return;
      paused = true;
      pauseEl.hidden = !turnEl.hidden;
      pauseBtn.innerHTML = PLAY;
      hold.pull = hold.slack = hold.keyPull = hold.keySlack = hold.left = hold.right = hold.keyL = hold.keyR = false; hold.rb = 0; hold.charge = -1; drag.id = null; lt.id = null; powerEl.hidden = true;
      pullBtn.classList.remove('on'); slackBtn.classList.remove('on'); leftBtn.classList.remove('on'); rightBtn.classList.remove('on');
      stop();
      if (R3) { if (view === 'uw' && R3.uw && s.lu) drawUW(0, performance.now() / 1000); else draw(0, performance.now()); }
      ctx.changed();
    }
    function resume() {
      if (!paused || !turnEl.hidden) return;
      paused = false;
      pauseEl.hidden = true;
      pauseBtn.innerHTML = PAUSE;
      if (mode() === 'tilt' && s && (s.phase === 'fight' || s.phase === 'wait')) calibrate(400);
      lt.on = false;
      sfx('tap');
      start();
    }
    const toggle = () => (paused ? resume() : pause());

    function begin(state, startPaused) {
      stop(); clearTimers();
      s = state; cfg = P.config(s.level);
      if (!wrap || !wrap.isConnected) build();
      wrap.dataset.stage = cfg.stage;
      paused = false; pauseEl.hidden = true; pauseBtn.innerHTML = PAUSE;
      caughtEl.hidden = true; caughtEl.innerHTML = ''; wrap.classList.remove('hold'); closeAlbum();
      hold.rb = 0; hold.charge = -1; hold.aim = 0; drag.id = null;
      themeKey = '';
      paintGoal(); renderMode(); hudKey = '';
      if (!initGL()) { stage.insertAdjacentHTML('beforeend', `<div class="fi-veil"><b>${L('ry_nogl')}</b></div>`); return; }
      readTheme(); buildScene(); measure();
      themeAt = performance.now();
      clearTimeout(viewT); view = viewTo = 'top'; wrap.dataset.view = 'top'; lt.on = false; lt.id = null; face.m = P.newMood('wait'); face.shown = ''; face.trT = 0;
      if (s.phase === 'wait' && s.lu) goView('uw', true);
      if (s.phase === 'caught') showCaught();
      if (!s.t && !s.caught.length) {
        later(() => say(L('fi_goal').replace('{n}', cfg.goal)), 500);
        if (cfg.target) later(() => say(L('fi_target').replace('{sp}', spName(cfg.target)), 'small'), 2600);
      }
      start();
      if (startPaused) pause();
    }
    function fresh() { begin(P.newLevel(ctx.level, Math.random)); ctx.changed({ reset: true }); }

    /* ---------- pulizia ---------- */
    const mq = G.matchMedia ? G.matchMedia('(prefers-color-scheme: dark)') : null;
    function onTheme() { themeAt = 0; }
    function onVis() { if (document.hidden) pause(); }
    function onBlur() { hold.pull = hold.slack = hold.keyPull = hold.keySlack = hold.left = hold.right = hold.keyL = hold.keyR = false; if (pullBtn) { pullBtn.classList.remove('on'); slackBtn.classList.remove('on'); leftBtn.classList.remove('on'); rightBtn.classList.remove('on'); } }
    function onResize() { measure(); renderMode(); }
    function detach() {
      alive = false;
      stop(); clearTimers(); clearTimeout(msgT); clearTimeout(viewT);
      G.removeEventListener('keydown', onKey); G.removeEventListener('keyup', onKeyUp); G.removeEventListener('blur', onBlur);
      G.removeEventListener('deviceorientation', onOrient); G.removeEventListener('devicemotion', onMotion); G.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.removeEventListener(ev, onFull));
      try { const so = G.screen && G.screen.orientation; if (so && so.unlock) so.unlock(); } catch (e) { /* non supportato */ }
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      if (el._fiRO) { el._fiRO.disconnect(); el._fiRO = null; }
      clearInterval(watch);
      if (R3) { disposeScene(); try { R3.grad.dispose(); R3.renderer.dispose(); R3.renderer.forceContextLoss(); } catch (e) { /* già perso */ } R3 = null; }
    }
    if (el._fiDetach) el._fiDetach();
    el._fiDetach = detach;
    G.addEventListener('keydown', onKey); G.addEventListener('keyup', onKeyUp); G.addEventListener('blur', onBlur);
    G.addEventListener('deviceorientation', onOrient); G.addEventListener('devicemotion', onMotion); G.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, onFull));
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);
    const watch = setInterval(() => { if (!el.isConnected || (wrap && !wrap.isConnected)) detach(); else { renderMode(); } }, 1000);

    // QA (Playwright): stato, lancio, mulinello forzato
    const qa = { hold: false, reel: null, noDraw: false, lure: null, sync: false, lab: null };
    el._fish = {
      state: () => s, cast: (p, a) => doCast(p, a || 0), reel: (r) => { qa.reel = r; }, freeze: (on) => { qa.hold = !!on; }, noDraw: (on) => { qa.noDraw = !!on; },
      showFish: (sp) => { if (!s) return; s.phase = 'caught'; s.fish = { sp, g: P.SP[sp].g[1] }; showCaught(); },
      mode, sensor: () => Object.assign({}, sensor, { det: Object.assign({}, sensor.det) }), release: releaseFish, album: () => album, openAlbum, closeAlbum,
      info: () => { if (!R3) return null; const i = R3.renderer.info.render; return { calls: i.calls, tris: i.triangles, pr, view, frame: perf.n ? +(perf.sum / perf.n).toFixed(2) : 0, frameMax: +perf.max.toFixed(1), frames: perf.n }; },
      start: (lv, seed) => begin(P.newLevel(lv, seed ? HH.rng(seed) : Math.random)),
      sync: (on) => { qa.sync = !!on; },
      // tavola delle specie: { yaw, elev, t (fisso), k } oppure null
      lab: (o) => { qa.lab = o || null; },
      // salto del pesce in lotta (come all'evento 'run') · direzione della testa dei pesci sott'acqua (x del mondo)
      jump: (dur, side) => {
        if (!s || !s.fish || !R3) return;
        dispatch({ type: 'run', qa: true });
        const J = R3.jump; if (!J) return;
        if (dur) J.dur = dur;
        if (side) { J.to.copy(J.from).add(new T.Vector3(side, 0, -0.4)); J.h = 1.2; J.yaw = -Math.atan2(J.to.z - J.from.z, J.to.x - J.from.x); }
      },
      heads: () => {
        if (!R3 || !R3.uw) return [];
        const o = [], v = new T.Vector3(), p = new T.Vector3();
        for (const w of s.sw || []) { const e = R3.uw.byId[w.id]; if (!e) continue; e.g.updateMatrixWorld(true); e.g.getWorldPosition(p); e.g.localToWorld(v.set(1, 0, 0)).sub(p); o.push({ sp: w.sp, st: w.st, h: w.h, head: +v.x.toFixed(3) }); }
        return o;
      },
      perfReset: () => { perf.n = 0; perf.sum = 0; perf.max = 0; },
      lure: (x, y) => { qa.lure = x == null ? null : { x, y: y == null ? 0.45 : y }; }, face: () => face.shown, faceEvent, view: () => view,
    };

    const restored = saved && P.migrate(JSON.parse(JSON.stringify(saved)));
    if (restored) begin(restored, restored.phase === 'fight');
    else begin(P.newLevel(ctx.level, Math.random));
    if (fsEl()) onFull();

    return {
      fresh,
      restart: fresh,
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende
      undo() { toggle(); },
      pause() { pause(); },
      resume() { resume(); },
      snapshot: () => s,
    };
  }

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
  HH.games.push({
    id: 'fish', name: 'Hari Fishing', rules: 'r_fish', rulesEn: RULES_EN,
    art, create, tutorial: TUT, _face: hariFace, _fishSvg: fishSvg,
    fill: true,                 // a schermo intero la scena riempie tutto il riquadro
    rate: (s) => HH.fish.rate(s),
    parTime: (s) => HH.fish.par(s),
    progress: (s) => HH.fish.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
