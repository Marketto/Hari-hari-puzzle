/* Hari Express — camera e comandi.
 * Camera: ORTOGRAFICA all'angolo isometrico classico (35,26° sull'orizzonte, 45° + k·90° attorno), rotazione a scatti
 * di 90° animata, zoom; un tocco sul cubo passa alla vista libera (prospettiva, orbita e inclinazione continue) e un
 * altro torna all'isometrica.
 * Comandi: un dito trascina per costruire con lo strumento scelto (Info: sposta la mappa, nella vista libera la gira);
 * due dita zoom e spostamento (nella vista libera anche rotazione); mouse: tasto destro o centrale sposta/gira,
 * rotella zoom verso il puntatore; tasti 1–6 strumenti, R ruota, F vista, spazio pausa, +/− zoom, frecce sposta, Esc.
 * Montato da express-ui.js: HH.expressInput(X) → { cam, attach, detach, pickTile }.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.expressInput = function (X) {
    const T = X.T;
    const ISO = Math.atan(1 / Math.SQRT2);
    const cam = { tx: 0, tz: 0, zoom: 7, yaw: Math.PI / 4, yawT: Math.PI / 4, pitch: ISO, free: false, moved: true, w: 1, h: 1 };
    const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
    const V = new T.Vector3(), V2 = new T.Vector3(), RC = new T.Raycaster(), NDC = new T.Vector2();
    function bounds() { return { w: X.W ? X.W.w : 32, h: X.W ? X.W.h : 32 }; }
    function center() { const b = bounds(); cam.tx = b.w / 2; cam.tz = b.h / 2; cam.moved = true; }
    function apply() {
      const R = X.R3; if (!R) return;
      const asp = cam.w / Math.max(1, cam.h);
      const y = X.hAt ? X.hAt(cam.tx, cam.tz) : 0;
      if (!cam.free) {
        const c = R.ortho, z = cam.zoom;
        c.left = -z * asp; c.right = z * asp; c.top = z; c.bottom = -z; c.updateProjectionMatrix();
        V.set(Math.sin(cam.yaw) * Math.cos(ISO), Math.sin(ISO), Math.cos(cam.yaw) * Math.cos(ISO)).multiplyScalar(80);
        c.position.set(cam.tx + V.x, y + V.y, cam.tz + V.z); c.lookAt(cam.tx, y, cam.tz);
        R.cam = c;
      } else {
        const c = R.persp, d = cam.zoom * 2.4;
        c.aspect = asp; c.updateProjectionMatrix();
        V.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(d);
        c.position.set(cam.tx + V.x, y + V.y, cam.tz + V.z); c.lookAt(cam.tx, y, cam.tz);
        R.cam = c;
      }
      cam.moved = true;
    }
    function step(dt) {
      if (Math.abs(cam.yawT - cam.yaw) > 1e-4) {
        const k = X.reduce() ? 1 : 1 - Math.pow(0.0005, dt);
        cam.yaw += (cam.yawT - cam.yaw) * k;
        if (Math.abs(cam.yawT - cam.yaw) < 1e-3) cam.yaw = cam.yawT;
        apply();
      }
    }
    cam.rotate = (dir) => { const base = cam.free ? cam.yawT : Math.round((cam.yawT - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4; cam.yawT = base + dir * Math.PI / 2; };
    cam.zoomBy = (k) => { cam.zoom = clamp(cam.zoom * k, 2.5, Math.max(10, bounds().w * 0.42)); apply(); };
    cam.toggleFree = () => {
      cam.free = !cam.free;
      if (!cam.free) { cam.yawT = Math.round((cam.yaw - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4; cam.pitch = ISO; }
      else cam.pitch = 0.55;
      if (X.ui.view) X.ui.view.setAttribute('aria-pressed', String(cam.free));
      apply();
    };
    cam.size = (w, h) => { cam.w = w; cam.h = h; apply(); };
    cam.pan = (dx, dy) => {
      // dx, dy in pixel: lo spostamento sul terreno dipende dallo zoom e dall'orientamento
      const k = (2 * cam.zoom) / Math.max(1, cam.h) * (cam.free ? 1.1 : 1);
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
      const sy = cam.free ? 1 / Math.max(0.35, Math.sin(cam.pitch)) : 1 / Math.sin(ISO);
      cam.tx -= (rx * dx - fx * dy * sy) * k; cam.tz -= (rz * dx - fz * dy * sy) * k;
      const b = bounds(); cam.tx = clamp(cam.tx, 0, b.w); cam.tz = clamp(cam.tz, 0, b.h);
      apply();
    };
    cam.center = center; cam.apply = apply; cam.step = step;
    cam.focus = (x, z) => { cam.tx = x; cam.tz = z; apply(); };

    /* ---------- dallo schermo alla casella ---------- */
    function ground(px, py) {
      const R = X.R3; if (!R) return null;
      const r = X.cv.getBoundingClientRect();
      NDC.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
      RC.setFromCamera(NDC, R.cam);
      const o = RC.ray.origin, d = RC.ray.direction;
      if (Math.abs(d.y) < 1e-4) return null;
      let h = 0.1, x = 0, z = 0;
      for (let k = 0; k < 4; k++) {
        const t = (h - o.y) / d.y;
        x = o.x + d.x * t; z = o.z + d.z * t;
        h = X.hR ? X.hR(clamp(x, 0, bounds().w), clamp(z, 0, bounds().h)) : 0;
      }
      return { x, z };
    }
    function pickTile(px, py) {
      const g = ground(px, py), b = bounds();
      if (!g || g.x < 0 || g.z < 0 || g.x >= b.w || g.z >= b.h) return null;
      return { t: Math.floor(g.z) * b.w + Math.floor(g.x), x: g.x, z: g.z };
    }
    // dal mondo allo schermo (etichette)
    const OUT = { x: 0, y: 0, z: 0 };
    function project(x, y, z) {
      const R = X.R3;
      V2.set(x, (X.hR ? X.hR(x, z) : 0) + y, z).project(R.cam);
      OUT.x = (V2.x + 1) / 2 * cam.w; OUT.y = (1 - V2.y) / 2 * cam.h; OUT.z = V2.z;
      return OUT;
    }

    /* ---------- puntatori ---------- */
    const pts = new Map();
    let g = null;      // gesto in corso: { kind: 'op'|'pan'|'orbit'|'pinch', ... }
    const buildTool = () => X.tool === 'rail' || X.tool === 'road' || X.tool === 'stop' || X.tool === 'demolish';
    function down(e) {
      if (!X.alive || X.blocked()) return;
      X.cv.focus({ preventScroll: true });
      X.cv.setPointerCapture && X.cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
      if (pts.size === 2) {
        if (g && g.kind === 'op' && !g.pending) X.opCancel();
        const [a, b] = [...pts.values()];
        g = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ang: Math.atan2(b.y - a.y, b.x - a.x) };
        return;
      }
      if (pts.size > 2) return;
      const mouseAlt = e.pointerType === 'mouse' && e.button !== 0;
      if (!mouseAlt && buildTool() && !X.picking) {
        const p = pickTile(e.clientX, e.clientY);
        // il gesto parte solo quando il dito si muove (o si alza): se arriva un secondo dito è uno spostamento
        g = { kind: 'op', start: p, moved: false, pending: true };
        return;
      }
      g = { kind: cam.free && !mouseAlt ? 'orbit' : 'pan', tap: !mouseAlt };
    }
    function move(e) {
      const p = pts.get(e.pointerId);
      if (!p) { if (e.pointerType === 'mouse') X.hover(pickTile(e.clientX, e.clientY)); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (!g) return;
      if (g.kind === 'pinch' && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        cam.zoom = clamp(g.z0 * (g.d0 / Math.max(20, d)), 2.5, Math.max(10, bounds().w * 0.42));
        cam.pan(mx - g.mx, my - g.my);
        if (cam.free) { const an = Math.atan2(b.y - a.y, b.x - a.x); cam.yaw -= an - g.ang; cam.yawT = cam.yaw; g.ang = an; }
        g.mx = mx; g.my = my;
        apply();
        return;
      }
      const far = Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 8;
      if (g.kind === 'op') {
        if (!far && g.pending) return;
        if (g.pending) { g.pending = false; if (g.start) X.opStart(g.start.t); }
        if (far) g.moved = true;
        const q = pickTile(e.clientX, e.clientY); if (q) X.opMove(q.t); return;
      }
      if (!far && g.tap) return;
      g.tap = false;
      if (g.kind === 'pan') cam.pan(dx, dy);
      else if (g.kind === 'orbit') { cam.yaw -= dx * 0.008; cam.yawT = cam.yaw; cam.pitch = clamp(cam.pitch + dy * 0.006, 0.22, 1.35); apply(); }
    }
    function up(e) {
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (!p || !g) return;
      if (g.kind === 'pinch') { if (pts.size === 0) g = null; return; }
      if (g.kind === 'op') {
        if (g.pending) { if (g.start) X.opStart(g.start.t); }
        const q = pickTile(e.clientX, e.clientY); X.opEnd(q ? q.t : null, g.moved); g = null; return;
      }
      if (g.tap && performance.now() - p.t0 < 600) { const q = pickTile(e.clientX, e.clientY); if (q) X.tap(q); }
      g = null;
    }
    function cancel(e) { pts.delete(e.pointerId); if (g && g.kind === 'op') X.opCancel(); g = null; }
    function wheel(e) {
      if (!X.alive) return;
      e.preventDefault();
      const k = Math.exp(clamp(e.deltaY, -120, 120) * 0.0018);
      // zoom verso il puntatore
      const before = ground(e.clientX, e.clientY);
      cam.zoom = clamp(cam.zoom * k, 2.5, Math.max(10, bounds().w * 0.42)); apply();
      const after = ground(e.clientX, e.clientY);
      if (before && after) { cam.tx += before.x - after.x; cam.tz += before.z - after.z; apply(); }
    }
    function key(e) {
      if (!X.alive || e.target.closest && e.target.closest('input, textarea')) return;
      if (X.blocked() && e.key !== 'Escape') return;
      const k = e.key;
      const tools = { 1: 'rail', 2: 'road', 3: 'stop', 4: 'demolish', 5: 'info' };
      if (tools[k]) { X.setTool(tools[k]); e.preventDefault(); return; }
      if (k === '6') { X.hud.accounts(); return; }
      if (k === 'r' || k === 'R') { cam.rotate(e.shiftKey ? -1 : 1); return; }
      if (k === 'q' || k === 'Q') { cam.rotate(-1); return; }
      if (k === 'f' || k === 'F') { cam.toggleFree(); return; }
      if (k === ' ') { if (e.target === X.cv || e.target === document.body || X.el.contains(e.target) && e.target.tagName !== 'BUTTON') { e.preventDefault(); X.togglePause(); } return; }
      if (k === '+' || k === '=') { cam.zoomBy(0.8); return; }
      if (k === '-' || k === '_') { cam.zoomBy(1.25); return; }
      const pan = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[k];
      if (pan && (e.target === X.cv || e.target === document.body)) { e.preventDefault(); cam.pan(pan[0], pan[1]); return; }
      if (k === 'Escape') X.escape();
    }
    function ctxmenu(e) { e.preventDefault(); }
    function attach() {
      const c = X.cv;
      c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', cancel); c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') X.hover(null); });
      c.addEventListener('wheel', wheel, { passive: false }); c.addEventListener('contextmenu', ctxmenu);
      G.addEventListener('keydown', key);
    }
    function detach() { G.removeEventListener('keydown', key); }
    return { cam, attach, detach, pickTile, project, ground };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
