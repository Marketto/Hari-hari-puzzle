/* Transizione fra home e giochi: una nuvola kawaii (foglie, petali, bolle, stelline, aculei di Hari, frutta,
 * nuvolette) copre lo schermo, sotto si cambia schermata, poi gli elementi volano via e la mostrano.
 *
 * HH.transition.run(swap)  -> Promise. `swap` (anche async: es. il caricamento lazy del gioco) viene eseguita
 *                              a schermo coperto; si scopre solo quando ha finito. Se dura più di ~250 ms compare
 *                              un piccolo Hari che rimbalza. Le chiamate fatte mentre si copre si accodano alla
 *                              stessa copertura; quelle fatte mentre si scopre partono subito dopo (mai due insieme).
 * HH.transition.busy()     -> true durante una transizione
 * HH.transition.idle()     -> Promise risolta a transizione finita (subito se non ce n'è una)
 * Segnali: <html data-trans="cover|hold|reveal"> durante la transizione; evento `hh:trans` sul document
 *          (detail.phase = 'start' | 'swap' | 'end').
 *
 * Parte pura (testata da Node, tests/transition.test.mjs): VARIANTS, pickVariant, particles, timing, shapeSVG.
 * Solo transform e opacity (Web Animations API), posizioni in vw/vh: reggono anche la rotazione del telefono.
 * Con prefers-reduced-motion: semplice dissolvenza breve. Colori solo da variabili di design (src/styles.css).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  const VARIANTS = ['leaves', 'petals', 'bubbles', 'stars', 'spines', 'fruit', 'clouds'];

  // forme (viewBox 0 0 100 100): ogni variante ha le sue, con le tinte (variabili CSS) fra cui scegliere
  const SHAPES = {
    leaf: (c) => `<path d="M50 4C80 22 92 58 52 96C14 62 18 24 50 4Z" fill="var(${c})"/><path d="M50 10C52 40 52 70 52 94M51 40L66 30M51 58L34 46M52 74L68 64" fill="none" stroke="var(--tr-vein)" stroke-width="4" stroke-linecap="round"/>`,
    maple: (c) => `<path d="M50 4L58 26L76 16L72 38L94 40L78 56L86 72L60 66L54 96H46L40 66L14 72L22 56L6 40L28 38L24 16L42 26Z" fill="var(${c})" stroke-linejoin="round"/><path d="M50 20V92" stroke="var(--tr-vein)" stroke-width="4" stroke-linecap="round"/>`,
    petal: (c) => `<path d="M50 94C14 70 10 30 30 8C38 14 44 18 50 26C56 18 62 14 70 8C90 30 86 70 50 94Z" fill="var(${c})"/><path d="M50 40V80" stroke="var(--tr-shine)" stroke-width="5" stroke-linecap="round"/>`,
    bubble: () => `<circle cx="50" cy="50" r="44" fill="var(--tr-bubble)" stroke="var(--tr-bubble-rim)" stroke-width="5"/><ellipse cx="34" cy="32" rx="12" ry="7" transform="rotate(-35 34 32)" fill="var(--tr-shine)"/><circle cx="66" cy="70" r="5" fill="var(--tr-shine)"/>`,
    star: (c) => `<path d="M50 6L62 36L94 38L69 58L78 92L50 73L22 92L31 58L6 38L38 36Z" fill="var(${c})" stroke-linejoin="round"/><circle cx="42" cy="44" r="5" fill="var(--tr-shine)"/>`,
    heart: (c) => `<path d="M50 90C20 68 6 50 8 32C10 14 32 6 50 26C68 6 90 14 92 32C94 50 80 68 50 90Z" fill="var(${c})"/><ellipse cx="30" cy="30" rx="9" ry="6" transform="rotate(-30 30 30)" fill="var(--tr-shine)"/>`,
    spine: () => `<path d="M50 4C60 34 70 62 72 84C66 96 34 96 28 84C30 62 40 34 50 4Z" fill="var(--tr-spine)"/><path d="M50 18C54 40 58 62 58 82" stroke="var(--tr-spine-2)" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    acorn: () => `<path d="M24 46C24 72 36 90 50 96C64 90 76 72 76 46Z" fill="var(--acorn)"/><path d="M14 46C14 26 30 16 50 16C70 16 86 26 86 46C70 52 30 52 14 46Z" fill="var(--acorn-cap)"/><path d="M50 16C50 10 54 6 60 4" fill="none" stroke="var(--acorn-cap)" stroke-width="6" stroke-linecap="round"/><ellipse cx="38" cy="64" rx="5" ry="10" fill="var(--tr-shine)"/>`,
    berry: () => `<path d="M50 96C18 76 10 44 22 28C34 18 66 18 78 28C90 44 82 76 50 96Z" fill="var(--berry)"/><path d="M50 26L34 10L46 18L50 4L54 18L66 10Z" fill="var(--mint)" stroke="var(--mint)" stroke-width="5" stroke-linejoin="round"/><g fill="var(--berry-seed)"><circle cx="36" cy="42" r="3.5"/><circle cx="62" cy="42" r="3.5"/><circle cx="50" cy="56" r="3.5"/><circle cx="38" cy="66" r="3.5"/><circle cx="62" cy="66" r="3.5"/><circle cx="50" cy="80" r="3.5"/></g>`,
    citrus: (c) => `<circle cx="50" cy="50" r="44" fill="var(${c})"/><circle cx="50" cy="50" r="34" fill="var(--tr-pulp)"/><path d="M50 18V82M18 50H82M27 27L73 73M73 27L27 73" stroke="var(${c})" stroke-width="4" stroke-linecap="round"/>`,
    cherry: () => `<path d="M34 64C40 40 50 22 66 8M66 64C64 42 64 24 66 8" fill="none" stroke="var(--mint-2)" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="72" r="20" fill="var(--berry)"/><circle cx="68" cy="72" r="20" fill="var(--berry-2)"/><circle cx="25" cy="65" r="5" fill="var(--tr-shine)"/><circle cx="61" cy="65" r="5" fill="var(--tr-shine)"/>`,
    cloud: (c) => `<path d="M24 78C10 78 4 66 10 56C6 42 20 32 32 38C36 22 58 16 68 32C82 26 96 40 90 54C98 62 92 78 80 78Z" fill="var(${c})" stroke="var(--tr-cloud-rim)" stroke-width="3" stroke-linejoin="round"/><ellipse cx="38" cy="58" rx="4" ry="5" fill="var(--tr-cloud-face)"/><ellipse cx="62" cy="58" rx="4" ry="5" fill="var(--tr-cloud-face)"/><ellipse cx="30" cy="66" rx="6" ry="3.5" fill="var(--tr-blush)"/><ellipse cx="70" cy="66" rx="6" ry="3.5" fill="var(--tr-blush)"/>`,
  };
  // per variante: forme (con peso) e tinte, scala delle dimensioni e quante file/colonne di particelle
  const LOOK = {
    leaves: { shapes: ['leaf', 'maple', 'maple'], tints: ['--tr-leaf-1', '--tr-leaf-2', '--tr-leaf-3', '--tr-leaf-4'], size: 1.25 },
    petals: { shapes: ['petal'], tints: ['--petal', '--tr-petal-1', '--tr-petal-2'], size: 1.15 },
    bubbles: { shapes: ['bubble'], tints: [''], size: 1.25 },
    stars: { shapes: ['star', 'star', 'heart'], tints: ['--sun', '--accent', '--tr-star-2', '--mint'], size: 1.15 },
    spines: { shapes: ['spine', 'spine', 'acorn'], tints: [''], size: 1.15 },
    fruit: { shapes: ['berry', 'citrus', 'cherry', 'citrus'], tints: ['--sun', '--tr-lime', '--tr-orange'], size: 1.15 },
    clouds: { shapes: ['cloud'], tints: ['--tr-cloud', '--tr-cloud-2'], size: 1.7, sparse: true },
  };
  function shapeSVG(shape, tint) {
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${SHAPES[shape](tint)}</svg>`;
  }

  // sempre una variante diversa dalla precedente
  function pickVariant(prev, rnd = Math.random) {
    const pool = VARIANTS.filter((v) => v !== prev);
    return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
  }

  // durate in ms: copertura, scoperta e ritardo massimo delle particelle (compreso nelle durate)
  function timing(reduced) {
    return reduced ? { cover: 160, reveal: 200, total: 360, wait: 250 } : { cover: 480, reveal: 560, total: 1040, wait: 250 };
  }

  /* particelle deterministiche dato il seme. aspect = larghezza / altezza dello schermo.
   * Ognuna: { shape, tint, size (vmin), from / rest / to: { x (vw), y (vh), r (gradi), s (scala), o (opacità) },
   *           inDelay, inDur, outDelay, outDur } — le posizioni di riposo stanno su una griglia mossa che copre tutto. */
  function particles(variant, seed, opts = {}) {
    const look = LOOK[variant] || LOOK.leaves;
    const rnd = (HH.rng || fallbackRng)(seed >>> 0);
    const aspect = opts.aspect > 0 ? opts.aspect : 0.5;
    const T = timing(false);
    const rtl = !!opts.rtl;
    // griglia: ~48 elementi (nuvolette più grandi: ~24), più colonne se lo schermo è largo
    const target = look.sparse ? 24 : 48;
    let cols = Math.max(3, Math.round(Math.sqrt(target * aspect)));
    let rows = Math.max(3, Math.ceil(target / cols));
    const cellW = 100 / cols, cellH = 100 / rows;
    // vmin di una cella: in vw/vh la cella è cellW × cellH; 1 vmin = min(vw, vh)
    const vminW = aspect >= 1 ? aspect : 1, vminH = aspect >= 1 ? 1 : 1 / aspect;   // quante vmin sono 100vw / 100vh (/100)
    const cell = Math.max(cellW * vminW, cellH * vminH);                             // lato della cella in vmin
    const out = [];
    const R = (a, b) => a + rnd() * (b - a);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const shape = pick(look.shapes), tint = pick(look.tints);
        const x = (i + 0.5 + R(-0.25, 0.25)) * cellW, y = (j + 0.5 + R(-0.25, 0.25)) * cellH;
        const size = cell * look.size * R(1.3, 1.7);
        const r = R(-40, 40);
        const rest = { x, y, r, s: 1, o: 1 };
        let from, to;
        const side = x < 50 ? -1 : 1;
        switch (variant) {
          case 'petals':     // in diagonale dall'alto a sinistra, via verso il basso a destra
            from = { x: x - R(40, 70), y: y - R(90, 130), r: r - R(120, 240), s: 0.8, o: 0 };
            to = { x: x + R(40, 70), y: y + R(90, 130), r: r + R(120, 240), s: 0.8, o: 0 };
            break;
          case 'bubbles':    // salgono dal basso e scoppiano
            from = { x: x + R(-12, 12), y: y + R(90, 130), r, s: 0.5, o: 0 };
            to = { x, y: y - R(4, 10), r, s: R(1.4, 1.7), o: 0 };
            break;
          case 'stars':      // sbocciano sul posto girando e si spengono
            from = { x, y, r: r - 180, s: 0, o: 0 };
            to = { x: x + R(-6, 6), y: y - R(6, 14), r: r + 180, s: 0, o: 0 };
            break;
          case 'spines':     // aculei e ghiande arrivano dai lati e cadono giù
            from = { x: side < 0 ? R(-40, -20) : R(120, 140), y: y - R(10, 30), r: r + side * R(180, 360), s: 0.7, o: 0 };
            to = { x: x + R(-15, 15), y: y + R(100, 130), r: r + side * R(90, 200), s: 0.9, o: 0 };
            break;
          case 'fruit':      // pioggia di frutta dall'alto, poi continua a cadere
            from = { x: x + R(-8, 8), y: y - R(100, 130), r: r - R(60, 120), s: 0.9, o: 0 };
            to = { x: x + R(-8, 8), y: y + R(100, 130), r: r + R(60, 120), s: 0.9, o: 0 };
            break;
          case 'clouds':     // nuvolette che scivolano dai lati e proseguono
            from = { x: x + side * R(70, 100), y, r: 0, s: 0.9, o: 0 };
            to = { x: x - side * R(70, 100), y: y + R(-6, 6), r: 0, s: 0.9, o: 0 };
            rest.r = R(-6, 6);
            break;
          default:           // foglie: turbinano scendendo dall'alto, poi continuano a cadere
            from = { x: x + R(-35, 35), y: y - R(100, 140), r: r - R(200, 400), s: 0.8, o: 0 };
            to = { x: x + R(-35, 35), y: y + R(100, 140), r: r + R(200, 400), s: 0.8, o: 0 };
        }
        // RTL: i movimenti orizzontali si specchiano attorno alla posizione di riposo
        if (rtl) { from.x = 2 * x - from.x; to.x = 2 * x - to.x; from.r = 2 * r - from.r; to.r = 2 * r - to.r; }
        const inDelay = Math.round(R(0, T.cover * 0.3));
        const outDelay = Math.round(R(0, T.reveal * 0.3));
        out.push({ shape, tint, size: +size.toFixed(2), from, rest, to,
          inDelay, inDur: T.cover - inDelay, outDelay, outDur: T.reveal - outDelay });
      }
    }
    return out;
  }
  function fallbackRng(seed) { let a = seed >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); }

  /* ---------- parte DOM ---------- */
  const tf = (p) => `translate(${p.x.toFixed(2)}vw, ${p.y.toFixed(2)}vh) translate(-50%, -50%) rotate(${p.r.toFixed(1)}deg) scale(${p.s})`;
  let cur = null, last = null;
  const idleWaiters = [];
  const reducedMotion = () => !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const signal = (phase) => { try { document.dispatchEvent(new CustomEvent('hh:trans', { detail: { phase } })); } catch (e) { /* vecchi browser */ } };

  function run(swap, opts = {}) {
    if (typeof document === 'undefined' || !document.body) return Promise.resolve().then(swap);
    if (cur) {
      // copertura in corso: si cambia schermata nella stessa copertura. Scoperta in corso: subito dopo, in sequenza
      if (cur.phase !== 'reveal') return new Promise((res, rej) => cur.queue.push({ swap, res, rej, opts }));
      return cur.done.then(() => run(swap, opts));
    }
    const reduced = reducedMotion();
    const T = timing(reduced);
    const variant = opts.variant || pickVariant(last);
    last = variant;
    const root = document.documentElement;
    const ov = document.createElement('div');
    ov.className = 'trans' + (reduced ? ' calm' : '');
    ov.dataset.v = variant;
    ov.setAttribute('aria-hidden', 'true');
    const wash = document.createElement('div');
    wash.className = 'trans-wash';
    ov.appendChild(wash);
    let parts = [];
    if (!reduced) {
      const aspect = (G.innerWidth || 1) / (G.innerHeight || 1);
      parts = particles(variant, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, { aspect, rtl: root.dir === 'rtl' });
      ov.insertAdjacentHTML('beforeend', parts.map((p) => `<i class="tp" style="width:${p.size}vmin;height:${p.size}vmin">${shapeSVG(p.shape, p.tint)}</i>`).join(''));
    }
    const hari = document.createElement('div');
    hari.className = 'trans-hari';
    hari.innerHTML = HH.mascot ? HH.mascot.mini() : '';
    ov.appendChild(hari);
    // il focus resta dov'è (l'overlay non è focalizzabile); i tocchi si fermano sull'overlay
    const els = [...ov.querySelectorAll('.tp')];
    const can = typeof wash.animate === 'function';
    const state = { phase: 'cover', queue: [], done: null };
    cur = state;
    let finish;
    state.done = new Promise((r) => { finish = r; });
    root.dataset.trans = 'cover';
    document.body.appendChild(ov);
    signal('start');
    try { if (HH.audio && HH.audio.sfx && HH.audio.sfx.rustle) HH.audio.sfx.rustle(reduced ? 0.4 : 1); } catch (e) { /* audio non pronto */ }

    const anims = [];
    if (can) {
      anims.push(wash.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? T.cover : T.cover * 0.7, delay: reduced ? 0 : T.cover * 0.3, easing: 'ease-in', fill: 'both' }));
      els.forEach((el, k) => {
        const p = parts[k];
        anims.push(el.animate([{ transform: tf(p.from), opacity: p.from.o }, { transform: tf(p.rest), opacity: 1, offset: 0.7 }, { transform: tf(p.rest), opacity: 1 }],
          { duration: p.inDur, delay: p.inDelay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }));
      });
    } else wash.style.opacity = '1';

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const cleanup = () => {
      ov.remove();
      if (root.dataset.trans) delete root.dataset.trans;
      cur = null;
      signal('end');
      finish();
      while (idleWaiters.length && !cur) idleWaiters.shift()();
    };
    return (async () => {
      let res = null, err = null;
      try {
        await wait(T.cover);
        state.phase = 'hold';
        root.dataset.trans = 'hold';
        // se il cambio di schermata (es. scaricare il gioco) va per le lunghe, Hari rimbalza in mezzo
        const slow = setTimeout(() => ov.classList.add('wait'), T.wait);
        // al massimo 15 s coperti (rete bloccata): poi si scopre comunque
        const cap = (p) => Promise.race([p, wait(15000)]);
        try { res = await cap(Promise.resolve().then(swap)); } catch (e) { err = e; }
        signal('swap');
        // chiamate arrivate durante la copertura: stessa copertura, in ordine
        while (state.queue.length) {
          const q = state.queue.shift();
          try { q.res(await cap(Promise.resolve().then(q.swap))); } catch (e) { q.rej(e); }
        }
        clearTimeout(slow);
        ov.classList.remove('wait');
        // un fotogramma perché la schermata nuova sia disegnata sotto la copertura
        await new Promise((r) => (G.requestAnimationFrame ? G.requestAnimationFrame(() => r()) : setTimeout(r, 16)));
        state.phase = 'reveal';
        root.dataset.trans = 'reveal';
        if (opts.focus) {
          const a = document.activeElement;
          if (!a || a === document.body || !a.isConnected) {
            const f = typeof opts.focus === 'function' ? opts.focus() : opts.focus;
            if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (e) { /* niente */ }
          }
        }
        if (can) {
          wash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? T.reveal : T.reveal * 0.55, easing: 'ease-out', fill: 'both' });
          els.forEach((el, k) => {
            const p = parts[k];
            el.animate([{ transform: tf(p.rest), opacity: 1 }, { transform: tf(p.to), opacity: p.to.o }],
              { duration: p.outDur, delay: p.outDelay, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'both' });
          });
          anims.forEach((x) => x.cancel());
          await wait(T.reveal);
        }
      } finally { cleanup(); }
      if (err) throw err;
      return res;
    })();
  }

  function idle() { return cur ? new Promise((r) => idleWaiters.push(r)) : Promise.resolve(); }

  HH.transition = { run, busy: () => !!cur, idle, VARIANTS, pickVariant, particles, timing, shapeSVG, SHAPES, LOOK };
})(typeof globalThis !== 'undefined' ? globalThis : window);
