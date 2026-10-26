/* Effetti visivi: cielo animato (bolle di colore, nuvole, luna di notte, stelline, petali, dolcetti fluttuanti),
 * coriandoli. I suoni sono in audio.js. Tutto offline, niente asset esterni.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const TAU = Math.PI * 2;

  /* ---------- forme ---------- */
  function heart(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.3, -s * 0.5, -s * 1.05, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.3, 0, s * 0.35);
    ctx.fill();
  }
  function star5(ctx, s) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  function sparkle(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill();
  }
  function berry(ctx, s, P) {
    ctx.fillStyle = P.berry;
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s * 1.1, s * 0.4, -s * 0.9, -s * 0.7, 0, -s * 0.6);
    ctx.bezierCurveTo(s * 0.9, -s * 0.7, s * 1.1, s * 0.4, 0, s);
    ctx.fill();
    ctx.fillStyle = P.leaf;
    ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.65, s * 0.35, s * 0.15, -0.4, 0, TAU); ctx.ellipse(s * 0.3, -s * 0.65, s * 0.35, s * 0.15, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,.9)';
    [[-0.3, 0], [0.3, 0.05], [0, 0.35], [-0.15, -0.25], [0.2, -0.3]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.07, 0, TAU); ctx.fill(); });
  }
  function mochi(ctx, s, P) {
    ctx.fillStyle = P.mochi;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.78, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = P.face;
    ctx.beginPath(); ctx.arc(-s * 0.32, -s * 0.05, s * 0.09, 0, TAU); ctx.arc(s * 0.32, -s * 0.05, s * 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = P.blush;
    ctx.beginPath(); ctx.ellipse(-s * 0.55, s * 0.18, s * 0.17, s * 0.09, 0, 0, TAU); ctx.ellipse(s * 0.55, s * 0.18, s * 0.17, s * 0.09, 0, 0, TAU); ctx.fill();
  }
  function cloud(ctx, x, y, s) {
    ctx.beginPath();
    [[0, 0, 26], [28, -15, 31], [60, -5, 25], [85, 6, 18], [-24, 8, 18], [40, 10, 26], [8, 12, 20]].forEach(([dx, dy, r]) => {
      ctx.moveTo(x + dx * s + r * s, y + dy * s);
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    });
    ctx.fill();
  }

  /* ---------- Cielo ---------- */
  function background(canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, t0 = performance.now();
    const blobs = [], petals = [], stars = [], clouds = [], floaters = [];
    let P = {};

    function readPalette() {
      P = {
        blobs: [css('--blob-1'), css('--blob-2'), css('--blob-3'), css('--blob-4')],
        petal: css('--petal'), petal2: css('--petal-2'), star: css('--star'), cloud: css('--cloud'),
        night: css('--night') === '1', moon: css('--moon'), moonFace: css('--moon-face'),
        items: [css('--accent'), css('--sun'), css('--mint'), css('--sky')],
        berry: css('--accent'), leaf: css('--mint'), mochi: css('--mochi'), face: css('--ink'), blush: css('--petal'),
      };
    }

    function resize() {
      dpr = Math.min(2, G.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function newFloater(anywhere) {
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : H + 30, s: 7 + Math.random() * 8,
        vy: -(0.12 + Math.random() * 0.22), sway: Math.random() * TAU, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.01,
        kind: (Math.random() * 5) | 0, c: (Math.random() * 4) | 0,
      };
    }
    function newPetal(anywhere) {
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : -20,
        size: 6 + Math.random() * 8, vy: 0.25 + Math.random() * 0.5, vx: -0.2 + Math.random() * 0.5,
        rot: Math.random() * TAU, vr: -0.02 + Math.random() * 0.04, sway: Math.random() * TAU, alt: Math.random() < 0.35,
      };
    }

    function seed() {
      blobs.length = petals.length = stars.length = clouds.length = floaters.length = 0;
      for (let i = 0; i < 5; i++) blobs.push({ x: Math.random(), y: Math.random(), r: 0.28 + Math.random() * 0.22, s: 0.00004 + Math.random() * 0.00006, p: Math.random() * TAU, c: i % 4 });
      const area = Math.max(1, (W * H) / 40000);
      for (let i = 0; i < Math.min(36, 8 + area * 2); i++) petals.push(newPetal(true));
      for (let i = 0; i < Math.min(46, 10 + area * 2.4); i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.8, p: Math.random() * TAU, s: 0.6 + Math.random() * 1.6, k: Math.random() < 0.45 });
      for (let i = 0; i < (W < 700 ? 3 : 5); i++) clouds.push({ x: Math.random() * W, y: 40 + Math.random() * H * 0.5, s: 0.5 + Math.random() * 0.7, v: 0.05 + Math.random() * 0.1, a: 0.55 + Math.random() * 0.45 });
      for (let i = 0; i < Math.min(14, 5 + area * 0.6); i++) floaters.push(newFloater(true));
    }

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.scale(1, 0.6 + 0.4 * Math.abs(Math.sin(p.sway)));
      ctx.fillStyle = p.alt ? P.petal2 : P.petal;
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.9, -s * 0.8, s * 0.8, s * 0.6, 0, s);
      ctx.bezierCurveTo(-s * 0.8, s * 0.6, -s * 0.9, -s * 0.8, -s * 0.15, -s * 0.75);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function drawMoon(t) {
      const r = Math.max(22, Math.min(38, W * 0.06));
      const x = W - r * 2.4, y = r * 2.6 + Math.sin(t * 0.0004) * 4;
      ctx.save();
      ctx.shadowColor = P.moon; ctx.shadowBlur = 40;
      ctx.fillStyle = P.moon;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.12; ctx.fillStyle = P.moonFace;
      ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.4, r * 0.16, 0, TAU); ctx.arc(x - r * 0.45, y + r * 0.35, r * 0.11, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = P.moonFace; ctx.lineWidth = Math.max(1.6, r * 0.07); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x - r * 0.33, y, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.moveTo(x + r * 0.47, y); ctx.arc(x + r * 0.33, y, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 0.45; ctx.fillStyle = P.blush;
      ctx.beginPath(); ctx.ellipse(x - r * 0.55, y + r * 0.28, r * 0.15, r * 0.08, 0, 0, TAU); ctx.ellipse(x + r * 0.55, y + r * 0.28, r * 0.15, r * 0.08, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      const dt = t - t0;
      blobs.forEach((b) => {
        const x = (b.x + 0.08 * Math.sin(dt * b.s * 6 + b.p)) * W;
        const y = (b.y + 0.08 * Math.cos(dt * b.s * 5 + b.p)) * H;
        const r = b.r * Math.max(W, H);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, P.blobs[b.c]); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      // stelline (di notte brillano di più)
      stars.forEach((st) => {
        const a = 0.2 + 0.8 * Math.abs(Math.sin(dt * 0.0012 * st.s + st.p));
        ctx.globalAlpha = P.night ? a : a * 0.75;
        ctx.fillStyle = P.star;
        ctx.save(); ctx.translate(st.x, st.y);
        if (P.night) { ctx.shadowColor = P.star; ctx.shadowBlur = 8; }
        const r = 1.6 + st.s * 1.4;
        if (st.k) sparkle(ctx, r * 2.4); else { ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.fill(); }
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (P.night) drawMoon(t);
      ctx.fillStyle = P.cloud;
      clouds.forEach((c) => {
        c.x += c.v;
        if (c.x - 40 * c.s > W) c.x = -120 * c.s;
        ctx.globalAlpha = c.a; cloud(ctx, c.x, c.y, c.s);
      });
      ctx.globalAlpha = 1;
      floaters.forEach((f, i) => {
        f.y += f.vy; f.sway += 0.012; f.rot += f.vr;
        if (f.y < -30) floaters[i] = newFloater(false);
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.translate(f.x + Math.sin(f.sway) * 14, f.y); ctx.rotate(f.rot);
        ctx.fillStyle = P.items[f.c];
        [heart, star5, sparkle][f.kind] ? [heart, star5, sparkle][f.kind](ctx, f.s) : f.kind === 3 ? berry(ctx, f.s, P) : mochi(ctx, f.s, P);
        ctx.restore();
      });
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
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce()) raf = requestAnimationFrame(loop);
    });
    const mq = G.matchMedia && G.matchMedia('(prefers-color-scheme: dark)');
    mq && mq.addEventListener && mq.addEventListener('change', readPalette);
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
    const bits = Array.from({ length: 160 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.4,
      vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 10,
      r: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: cols[(Math.random() * cols.length) | 0], k: (Math.random() * 3) | 0,
    }));
    let n = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      bits.forEach((b) => {
        b.vy += 0.28; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c;
        if (b.k === 0) heart(ctx, b.r * 0.9);
        else if (b.k === 1) star5(ctx, b.r * 0.9);
        else ctx.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2);
        ctx.restore();
      });
      if (++n < 180) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    })();
  }

  // i suoni vivono in src/core/audio.js
  HH.fx = { background, confetti, sfx: HH.audio.sfx };
})(typeof globalThis !== 'undefined' ? globalThis : window);
