/* Effetti: sfondo animato (petali, scintille, bolle morbide), coriandoli, suoni WebAudio.
 * Tutto offline, niente asset esterni.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* ---------- Sfondo ---------- */
  function background(canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, t0 = performance.now();
    const blobs = [], petals = [], stars = [];
    let palette = {};

    function readPalette() {
      palette = {
        blobs: [css('--blob-1'), css('--blob-2'), css('--blob-3'), css('--blob-4')],
        petal: css('--petal'), petal2: css('--petal-2'), star: css('--star'),
      };
    }

    function resize() {
      dpr = Math.min(2, G.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      blobs.length = petals.length = stars.length = 0;
      for (let i = 0; i < 5; i++) blobs.push({ x: Math.random(), y: Math.random(), r: 0.28 + Math.random() * 0.22, s: 0.00004 + Math.random() * 0.00006, p: Math.random() * 6.28, c: i % 4 });
      const area = Math.max(1, (W * H) / 40000);
      for (let i = 0; i < Math.min(46, 10 + area * 2.4); i++) petals.push(newPetal(true));
      for (let i = 0; i < Math.min(40, 8 + area * 2); i++) stars.push({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6, k: Math.random() < 0.5 });
    }

    function newPetal(anywhere) {
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : -20,
        size: 6 + Math.random() * 8, vy: 0.25 + Math.random() * 0.55, vx: -0.2 + Math.random() * 0.5,
        rot: Math.random() * 6.28, vr: -0.02 + Math.random() * 0.04, sway: Math.random() * 6.28, alt: Math.random() < 0.35,
      };
    }

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.6 + 0.4 * Math.abs(Math.sin(p.sway)));
      ctx.fillStyle = p.alt ? palette.petal2 : palette.petal;
      ctx.beginPath();
      const s = p.size;
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.9, -s * 0.8, s * 0.8, s * 0.6, 0, s);
      ctx.bezierCurveTo(-s * 0.8, s * 0.6, -s * 0.9, -s * 0.8, -s * 0.15, -s * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawStar(st, t) {
      const a = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.0012 * st.s + st.p));
      ctx.globalAlpha = a;
      ctx.fillStyle = palette.star;
      const r = 1.6 + st.s * 1.4;
      ctx.save();
      ctx.translate(st.x, st.y);
      if (st.k) {
        ctx.beginPath();
        ctx.moveTo(0, -r * 2.4); ctx.quadraticCurveTo(0, 0, r * 2.4, 0);
        ctx.quadraticCurveTo(0, 0, 0, r * 2.4); ctx.quadraticCurveTo(0, 0, -r * 2.4, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r * 2.4); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 6.28); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      const dt = t - t0;
      blobs.forEach((b) => {
        const x = (b.x + 0.08 * Math.sin(dt * b.s * 6 + b.p)) * W;
        const y = (b.y + 0.08 * Math.cos(dt * b.s * 5 + b.p)) * H;
        const r = b.r * Math.max(W, H);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, palette.blobs[b.c]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });
      stars.forEach((s) => drawStar(s, dt));
      petals.forEach((p, i) => {
        p.y += p.vy; p.x += p.vx + Math.sin(p.sway) * 0.4; p.rot += p.vr; p.sway += 0.02;
        if (p.y > H + 20 || p.x < -30 || p.x > W + 30) petals[i] = newPetal(false);
        drawPetal(p);
      });
    }

    function loop(t) { frame(t); raf = requestAnimationFrame(loop); }

    function start() {
      cancelAnimationFrame(raf);
      readPalette(); resize(); seed();
      if (reduce()) frame(performance.now()); else raf = requestAnimationFrame(loop);
    }

    G.addEventListener('resize', () => { resize(); seed(); if (reduce()) frame(performance.now()); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce()) raf = requestAnimationFrame(loop);
    });
    const mq = G.matchMedia && G.matchMedia('(prefers-color-scheme: dark)');
    mq && mq.addEventListener && mq.addEventListener('change', () => { readPalette(); });
    new MutationObserver(readPalette).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    start();
    return { refresh: readPalette };
  }

  /* ---------- Coriandoli ---------- */
  function confetti(canvas) {
    if (reduce()) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, G.devicePixelRatio || 1);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = [css('--accent'), css('--mint'), css('--sun'), css('--petal'), css('--sky')];
    const bits = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.42,
      vx: (Math.random() - 0.5) * 13, vy: -6 - Math.random() * 9,
      r: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: cols[(Math.random() * cols.length) | 0], heart: Math.random() < 0.3,
    }));
    let n = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      bits.forEach((b) => {
        b.vy += 0.28; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c;
        if (b.heart) {
          const s = b.r / 5;
          ctx.scale(s, s); ctx.beginPath();
          ctx.moveTo(0, 3); ctx.bezierCurveTo(-7, -2, -3, -8, 0, -4); ctx.bezierCurveTo(3, -8, 7, -2, 0, 3); ctx.fill();
        } else ctx.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2);
        ctx.restore();
      });
      if (++n < 170) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    })();
  }

  /* ---------- Suoni ---------- */
  let ac = null, muted = false;
  function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
    if (muted) return;
    try {
      ac = ac || new (G.AudioContext || G.webkitAudioContext)();
      const t = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* audio non disponibile */ }
  }
  const sfx = {
    tap: () => tone(880, 0.08, 'triangle', 0.08),
    pick: () => tone(660, 0.1, 'sine', 0.09, 1.4),
    pour: () => tone(520, 0.28, 'sine', 0.08, 0.6),
    bad: () => tone(220, 0.18, 'square', 0.04, 0.8),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, 1, i * 0.11)),
    setMuted: (m) => { muted = m; },
    isMuted: () => muted,
  };

  HH.fx = { background, confetti, sfx };
})(typeof globalThis !== 'undefined' ? globalThis : window);
